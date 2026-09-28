// TÉMOIN du juge routes-acquisition-qa (026-037) : scripts/agents/candidats-ajouter.mjs <fichier.csv> [--sec] (026-077).
// Refuse un fichier du dépôt (code 2) ; --sec n'ouvre pas la base et n'affiche que des comptes.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const sec = args.includes('--sec')
const fichier = args.find((a) => !a.startsWith('--'))
if (!fichier || !fs.existsSync(fichier)) { console.log('fichier CSV absent'); process.exit(2) }
const depot = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: path.dirname(fileURLToPath(import.meta.url)), encoding: 'utf8' }).stdout.trim()
const abs = path.resolve(fichier)
if (depot && (abs.toLowerCase() + path.sep).startsWith(path.resolve(depot).toLowerCase() + path.sep)) { console.log('refus : un fichier situé dans le dépôt (les listes vivent dans le vault)'); process.exit(2) }
const lignes = fs.readFileSync(abs, 'utf8').split(/\r?\n/).filter((l) => l.trim())
const tete = lignes.shift().split(',').map((x) => x.trim())
const vus = new Set()
let valides = 0, doublons = 0, invalides = 0
for (const l of lignes) {
  const c = Object.fromEntries(l.split(',').map((x, i) => [tete[i], x.trim()]))
  const cle = c.domaine ? `domaine:${c.domaine.toLowerCase()}` : c.instagram ? `instagram:${c.instagram.toLowerCase()}` : c.page_meta ? `page_meta:${c.page_meta}` : null
  if (!cle) { invalides++; continue }
  if (vus.has(cle)) { doublons++; continue }
  vus.add(cle); valides++
}
console.log(`${lignes.length} lignes, ${valides} valides, ${doublons} doublons, ${invalides} invalides`)
if (sec) process.exit(0)
console.log('hors --sec : la base n\'est pas ouverte par ce témoin')
