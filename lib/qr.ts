// lib/qr.ts — un QR code fabriqué SUR PLACE (21/10/2026, écran « Vos réseaux ») : aucun service externe (le lien de l'artisan ne
// part chez personne pour être dessiné), aucune dépendance. Mode octets (UTF-8), correction d'erreur « M » (15 %), versions 1 à 25,
// masque choisi par la pénalité de la norme (ISO/IEC 18004, règles 1, 2, 3 et 4). Même déroulé que l'implémentation de référence
// publique de Project Nayuki (https://www.nayuki.io/page/qr-code-generator-library), réécrite ici.
//
// Module PUR, lu par le navigateur. Vérifié par scripts/canaux-reseaux-qa.mjs : relecture de la matrice (masque retiré, mots de code
// relus, syndromes Reed-Solomon nuls, octets retrouvés) et, quand Python + OpenCV sont présents sur la machine, décodage réel.

/** Mots de code de correction par bloc, niveau M, index = version. */
const ECC_PAR_BLOC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28]
/** Nombre de blocs, niveau M, index = version. */
const BLOCS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21]
export const VERSION_MAX = 25

export type MatriceQR = { taille: number; version: number; masque: number; modules: boolean[][] }

function modulesBruts(ver: number): number {
  let r = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2
    r -= (25 * n - 10) * n - 55
    if (ver >= 7) r -= 36
  }
  return r
}
export const motsDeDonnees = (ver: number): number => Math.floor(modulesBruts(ver) / 8) - ECC_PAR_BLOC[ver] * BLOCS[ver]

function positionsAlignement(ver: number): number[] {
  if (ver === 1) return []
  const n = Math.floor(ver / 7) + 2
  const taille = ver * 4 + 17
  const pas = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2
  const r = [6]
  for (let p = taille - 7; r.length < n; p -= pas) r.splice(1, 0, p)
  return r
}

// ── Reed-Solomon sur GF(2^8), polynôme 0x11D ──────────────────────────────────────────────────────────────────────────────
export function multGF(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}
export function diviseurRS(degre: number): number[] {
  const r = new Array<number>(degre).fill(0)
  r[degre - 1] = 1
  let racine = 1
  for (let i = 0; i < degre; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = multGF(r[j], racine)
      if (j + 1 < r.length) r[j] ^= r[j + 1]
    }
    racine = multGF(racine, 0x02)
  }
  return r
}
export function resteRS(donnees: readonly number[], diviseur: readonly number[]): number[] {
  const r = diviseur.map(() => 0)
  for (const b of donnees) {
    const facteur = b ^ (r.shift() as number)
    r.push(0)
    diviseur.forEach((c, i) => { r[i] ^= multGF(c, facteur) })
  }
  return r
}

function avecCorrection(donnees: number[], ver: number): number[] {
  const nb = BLOCS[ver], ecc = ECC_PAR_BLOC[ver]
  const bruts = Math.floor(modulesBruts(ver) / 8)
  const courts = nb - (bruts % nb)
  const longCourt = Math.floor(bruts / nb)
  const div = diviseurRS(ecc)
  const blocs: number[][] = []
  for (let i = 0, k = 0; i < nb; i++) {
    const d = donnees.slice(k, k + longCourt - ecc + (i < courts ? 0 : 1))
    k += d.length
    const e = resteRS(d, div)
    if (i < courts) d.push(0)
    blocs.push(d.concat(e))
  }
  const sortie: number[] = []
  for (let i = 0; i < blocs[0].length; i++) {
    blocs.forEach((b, j) => { if (i !== longCourt - ecc || j >= courts) sortie.push(b[i]) })
  }
  return sortie
}

// ── Dessin ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
class Grille {
  ver: number
  taille: number
  m: boolean[][]
  fonction: boolean[][]
  constructor(ver: number) {
    this.ver = ver
    this.taille = ver * 4 + 17
    this.m = Array.from({ length: this.taille }, () => new Array<boolean>(this.taille).fill(false))
    this.fonction = Array.from({ length: this.taille }, () => new Array<boolean>(this.taille).fill(false))
  }
  poser(x: number, y: number, v: boolean) { this.m[y][x] = v; this.fonction[y][x] = true }
  motifsFonction() {
    const t = this.taille
    for (let i = 0; i < t; i++) { this.poser(6, i, i % 2 === 0); this.poser(i, 6, i % 2 === 0) }
    for (const [cx, cy] of [[3, 3], [t - 4, 3], [3, t - 4]]) {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy
        if (x >= 0 && x < t && y >= 0 && y < t) this.poser(x, y, d !== 2 && d !== 4)
      }
    }
    const pos = positionsAlignement(this.ver), n = pos.length
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) this.poser(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }
    this.format(0)
    if (this.ver >= 7) {
      let rem = this.ver
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
      const bits = (this.ver << 12) | rem
      for (let i = 0; i < 18; i++) {
        const b = ((bits >>> i) & 1) !== 0, a = t - 11 + (i % 3), c = Math.floor(i / 3)
        this.poser(a, c, b); this.poser(c, a, b)
      }
    }
  }
  /** Bits de format, niveau M (00) et masque. */
  format(masque: number) {
    const donnees = (0 << 3) | masque
    let rem = donnees
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((donnees << 10) | rem) ^ 0x5412
    const b = (i: number) => ((bits >>> i) & 1) !== 0
    const t = this.taille
    for (let i = 0; i <= 5; i++) this.poser(8, i, b(i))
    this.poser(8, 7, b(6)); this.poser(8, 8, b(7)); this.poser(7, 8, b(8))
    for (let i = 9; i < 15; i++) this.poser(14 - i, 8, b(i))
    for (let i = 0; i < 8; i++) this.poser(t - 1 - i, 8, b(i))
    for (let i = 8; i < 15; i++) this.poser(8, t - 15 + i, b(i))
    this.poser(8, t - 8, true)
  }
  mots(donnees: number[]) {
    const t = this.taille
    let i = 0
    for (let droite = t - 1; droite >= 1; droite -= 2) {
      if (droite === 6) droite = 5
      for (let v = 0; v < t; v++) for (let j = 0; j < 2; j++) {
        const x = droite - j
        const monte = ((droite + 1) & 2) === 0
        const y = monte ? t - 1 - v : v
        if (!this.fonction[y][x] && i < donnees.length * 8) { this.m[y][x] = ((donnees[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++ }
      }
    }
  }
  masquer(k: number) {
    for (let y = 0; y < this.taille; y++) for (let x = 0; x < this.taille; x++) {
      if (this.fonction[y][x]) continue
      if (masqueInverse(k, x, y)) this.m[y][x] = !this.m[y][x]
    }
  }
}

export function masqueInverse(k: number, x: number, y: number): boolean {
  switch (k) {
    case 0: return (x + y) % 2 === 0
    case 1: return y % 2 === 0
    case 2: return x % 3 === 0
    case 3: return (x + y) % 3 === 0
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  }
}

/** Pénalité de la norme : séries de 5+, blocs 2×2, motifs 1:1:3:1:1 bordés de 4 clairs, équilibre clair/foncé. */
function penalite(m: boolean[][]): number {
  const t = m.length
  let p = 0
  const ligne = (get: (i: number) => boolean) => {
    let serie = 1
    for (let i = 1; i <= t; i++) {
      if (i < t && get(i) === get(i - 1)) serie++
      else { if (serie >= 5) p += serie - 2; serie = 1 }
    }
    const motif = [true, false, true, true, true, false, true]
    for (let i = 0; i + 7 <= t; i++) {
      if (!motif.every((v, k) => get(i + k) === v)) continue
      const avant = i >= 4 && [1, 2, 3, 4].every((k) => !get(i - k))
      const apres = i + 11 <= t && [7, 8, 9, 10].every((k) => !get(i + k))
      if (avant || apres) p += 40
    }
  }
  for (let y = 0; y < t; y++) ligne((i) => m[y][i])
  for (let x = 0; x < t; x++) ligne((i) => m[i][x])
  for (let y = 0; y + 1 < t; y++) for (let x = 0; x + 1 < t; x++) {
    const c = m[y][x]
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3
  }
  let fonces = 0
  for (const r of m) for (const c of r) if (c) fonces++
  const total = t * t
  p += Math.max(0, Math.ceil(Math.abs(fonces * 20 - total * 10) / total) - 1) * 10
  return p
}

/** Les octets UTF-8 d'un texte, sans dépendre de TextEncoder (présent partout aujourd'hui, mais rien à gagner à le supposer). */
export function octetsUtf8(s: string): number[] {
  const r: number[] = []
  for (const ch of s) {
    const c = ch.codePointAt(0) as number
    if (c < 0x80) r.push(c)
    else if (c < 0x800) r.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) r.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else r.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return r
}

/** Le QR code d'un texte, ou null s'il ne tient pas dans la version 25 (≈ 1 000 octets : un lien tient en version 3 à 5). */
export function qrCode(texte: string, masqueImpose?: number): MatriceQR | null {
  const octets = octetsUtf8(texte)
  let ver = 1
  for (; ver <= VERSION_MAX; ver++) {
    const bitsCompte = ver < 10 ? 8 : 16
    if (4 + bitsCompte + octets.length * 8 <= motsDeDonnees(ver) * 8) break
  }
  if (ver > VERSION_MAX) return null
  const capacite = motsDeDonnees(ver) * 8
  const bits: number[] = []
  const pousser = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1) }
  pousser(0b0100, 4)
  pousser(octets.length, ver < 10 ? 8 : 16)
  for (const o of octets) pousser(o, 8)
  pousser(0, Math.min(4, capacite - bits.length))
  pousser(0, (8 - (bits.length % 8)) % 8)
  for (let rembourrage = 0xec; bits.length < capacite; rembourrage ^= 0xec ^ 0x11) pousser(rembourrage, 8)
  const donnees: number[] = []
  for (let i = 0; i < bits.length; i += 8) donnees.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0))

  const mots = avecCorrection(donnees, ver)
  let meilleure: { g: Grille; k: number; p: number } | null = null
  for (let k = 0; k < 8; k++) {
    if (masqueImpose !== undefined && k !== masqueImpose) continue
    const g = new Grille(ver)
    g.motifsFonction()
    g.mots(mots)
    g.masquer(k)
    g.format(k)
    const p = penalite(g.m)
    if (!meilleure || p < meilleure.p) meilleure = { g, k, p }
  }
  if (!meilleure) return null
  return { taille: meilleure.g.taille, version: ver, masque: meilleure.k, modules: meilleure.g.m }
}

/** Le chemin SVG des modules foncés (un rectangle par série horizontale), dans un carré de `taille + 2 × marge` unités. */
export function cheminSvg(q: MatriceQR, marge = 4): string {
  const parties: string[] = []
  q.modules.forEach((ligne, y) => {
    let x = 0
    while (x < q.taille) {
      if (!ligne[x]) { x++; continue }
      let fin = x
      while (fin < q.taille && ligne[fin]) fin++
      parties.push(`M${x + marge} ${y + marge}h${fin - x}v1h${x - fin}z`)
      x = fin
    }
  })
  return parties.join('')
}
