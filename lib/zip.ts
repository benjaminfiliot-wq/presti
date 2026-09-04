import { deflateRawSync } from 'node:zlib'

// Écriture d'une archive ZIP, en flux, sans dépendance (sprint J-1 §6 — export des données).
//
// Pourquoi pas jszip/archiver : le besoin tient en 80 lignes — un ZIP est une suite de
// « fichier local » (en-tête + données) puis un répertoire central. On compresse en
// DEFLATE avec zlib (déjà dans Node), on calcule le CRC-32 nous-mêmes. Chaque entrée est
// poussée dans le flux dès qu'elle est prête : le navigateur commence à recevoir l'archive
// pendant que les PDF suivants se génèrent encore.
//
// Format : APPNOTE 6.3.x, méthode 8 (deflate), noms en UTF-8 (drapeau bit 11), pas de ZIP64
// (un export d'artisan pèse quelques Mo, très loin des 4 Go).

const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Date/heure au format MS-DOS (résolution 2 s, à partir de 1980). */
function dosDate(d: Date): { date: number; time: number } {
  const y = Math.max(1980, d.getFullYear())
  return {
    date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  }
}

type Entree = { nom: Uint8Array; crc: number; taille: number; tailleComp: number; offset: number; date: number; time: number }

function u16(v: number) { const b = Buffer.alloc(2); b.writeUInt16LE(v & 0xffff); return b }
function u32(v: number) { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); return b }

/**
 * Archive ZIP en flux. `ajouter` pousse une entrée complète ; `terminer` écrit le
 * répertoire central et ferme le flux. À brancher sur `new Response(zip.flux)`.
 */
export class ZipFlux {
  readonly flux: ReadableStream<Uint8Array>
  private ctrl!: ReadableStreamDefaultController<Uint8Array>
  private entrees: Entree[] = []
  private offset = 0
  private quand = new Date()

  constructor() {
    this.flux = new ReadableStream<Uint8Array>({ start: (c) => { this.ctrl = c } })
  }

  private pousser(b: Uint8Array) { this.ctrl.enqueue(b); this.offset += b.length }

  ajouter(chemin: string, contenu: Uint8Array | string) {
    const donnees = typeof contenu === 'string' ? Buffer.from(contenu, 'utf8') : contenu
    const nom = Buffer.from(chemin.replace(/\\/g, '/').replace(/^\/+/, ''), 'utf8')
    const comp = deflateRawSync(donnees, { level: 6 })
    const crc = crc32(donnees)
    const { date, time } = dosDate(this.quand)
    const e: Entree = { nom, crc, taille: donnees.length, tailleComp: comp.length, offset: this.offset, date, time }
    this.entrees.push(e)
    // En-tête de fichier local.
    this.pousser(Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(time), u16(date),
      u32(crc), u32(comp.length), u32(donnees.length), u16(nom.length), u16(0), nom,
    ]))
    this.pousser(comp)
  }

  terminer() {
    const debut = this.offset
    for (const e of this.entrees) {
      this.pousser(Buffer.concat([
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(e.time), u16(e.date),
        u32(e.crc), u32(e.tailleComp), u32(e.taille), u16(e.nom.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(e.offset), e.nom,
      ]))
    }
    const taille = this.offset - debut
    this.pousser(Buffer.concat([
      u32(0x06054b50), u16(0), u16(0), u16(this.entrees.length), u16(this.entrees.length), u32(taille), u32(debut), u16(0),
    ]))
    this.ctrl.close()
  }

  /** En cas d'erreur en cours de route : le navigateur voit un téléchargement interrompu, pas une archive fausse. */
  echouer(e: unknown) { try { this.ctrl.error(e) } catch { /* déjà fermé */ } }
}
