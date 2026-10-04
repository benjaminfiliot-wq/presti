// Le socle des doublures d'outils du tourneur (usine-pubs-qa, 026-199). Chaque doublure est lancée comme l'outil qu'elle remplace (par le PATH pour
// hyperframes et ffmpeg, par `node scripts/…` pour les scripts du dépôt), lit sa configuration dans UN fichier du juge (le chemin lui est donné par la
// cale qui la lance : jamais par l'environnement, que le tourneur peut épurer), CONSIGNE son appel (arguments, état du dossier de travail, heure
// monotone) dans le journal du juge, puis fait ce que l'outil ferait en petit. Elle ne juge rien : le juge relit le journal.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
export const JPEG = (graine = 'a', n = 2048) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`JFIF-${graine}-`.padEnd(n, '.')), Buffer.from([0xff, 0xd9])])
export const PNG = (graine = 'a', n = 2048) => Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from(`PNG-${graine}-`.padEnd(n, '.'))])
export const MP4 = (graine = 'a', n = 8192) => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.from(`MP4-${graine}-`.padEnd(n, '.'))])
export const WAV = (n = 4096) => Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt '), Buffer.alloc(n)])
export const MP3 = (graine = 'a', n = 4096) => Buffer.concat([Buffer.from('ID3'), Buffer.from(`MP3-${graine}-`.padEnd(n, '.'))])

export function lireConfig(chemin) { return JSON.parse(fs.readFileSync(chemin, 'utf8')) }

/** Ajoute une ligne au journal du juge : l'heure monotone en nanosecondes (même horloge que les faux serveurs), l'outil, ce qu'il a vu. */
export function noter(cfg, quoi, extra = {}) {
  const jeton = Object.values(process.env).some((v) => typeof v === 'string' && v.includes(cfg.jeton))
  fs.appendFileSync(cfg.journal, `${JSON.stringify({ t: process.hrtime.bigint().toString(), pid: process.pid, quoi, cwd: process.cwd(), env_jeton: jeton, ...extra })}\n`)
}

export const existeNonVide = (f) => { try { const s = fs.statSync(f); return s.isFile() && s.size > 0 } catch { return false } }
export const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
export function ecrire(f, octets) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, octets) }

/** L'argument qui suit `--nom` ou qui suit `--nom=` (les deux écritures de la ligne de commande). */
export function option(argv, ...noms) {
  for (let i = 0; i < argv.length; i++) {
    for (const n of noms) {
      if (argv[i] === n) return argv[i + 1] ?? null
      if (argv[i].startsWith(`${n}=`)) return argv[i].slice(n.length + 1)
    }
  }
  return null
}
