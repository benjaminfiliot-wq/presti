// TÉMOIN du juge routes-acquisition-qa (026-037) : scripts/agents/opposition-importer.mjs <fichier> [--sec] (026-077).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const sec = args.includes('--sec')
const fichier = args.find((a) => !a.startsWith('--'))
if (!fichier || !fs.existsSync(fichier)) { console.log('fichier absent'); process.exit(2) }
const depot = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: path.dirname(fileURLToPath(import.meta.url)), encoding: 'utf8' }).stdout.trim()
const abs = path.resolve(fichier)
if (depot && (abs.toLowerCase() + path.sep).startsWith(path.resolve(depot).toLowerCase() + path.sep)) { console.log('refus : un fichier situé dans le dépôt'); process.exit(2) }
let cles = 0, ignorees = 0
for (const l of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
  const t = l.trim()
  if (!t || t.startsWith('#') || /^nom\s*:/i.test(t)) { ignorees++; continue }
  cles++
}
if (fs.readFileSync(abs, 'utf8').endsWith('\n')) ignorees--
console.log(`${cles} clés, ${ignorees} lignes ignorées`)
if (sec) process.exit(0)
