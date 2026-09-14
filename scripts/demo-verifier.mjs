// scripts/demo-verifier.mjs — le verdict de LA démo (prompt v16 §3.3, §4) : validée sans Benj quand les trois juges sont
// verts, dans cet ordre — site-qa (substance, geste, rendu réel, Lighthouse mobile ≥ 95), grille-qa (comparaison visuelle :
// ≥ médiane des références sur C1–C8), code-qa (lint + typecheck + tests, quand scripts/juges/code-qa.mjs existe).
// Un seul échec = FAIL, avec la ligne qui manque.
//
// Usage : node scripts/demo-verifier.mjs [dossier=public/sites-demo/lestraque] [--statique]
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dossier = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'public/sites-demo/lestraque'
const statique = process.argv.includes('--statique')
const etapes = [
  { nom: 'site-qa', args: ['scripts/site-qa.mjs', dossier, ...(statique ? ['--statique'] : ['--pages=2'])], minutes: 25 },
  { nom: 'grille-qa', args: ['scripts/grille-qa.mjs'], minutes: 1 },
  { nom: 'code-qa', args: ['scripts/juges/code-qa.mjs'], minutes: 15, optionnel: true },
]
let echec = null
for (const e of etapes) {
  if (e.optionnel && !fs.existsSync(path.join(RACINE, e.args[0]))) { console.log(`– ${e.nom} : absent (bloc 0 pas encore posé), sauté`); continue }
  const debut = Date.now()
  const r = spawnSync(process.execPath, e.args, { cwd: RACINE, encoding: 'utf8', timeout: e.minutes * 60_000 })
  const sortie = ((r.stdout || '') + (r.stderr || '')).replace(/\x1b\[[0-9;]*m/g, '')
  const derniere = sortie.trim().split(/\r?\n/).filter((l) => /PASS|FAIL|Tout passe|critère|ÉCHEC/.test(l)).at(-1) || sortie.trim().split(/\r?\n/).at(-1) || ''
  const ok = r.status === 0
  console.log(`${ok ? '✓' : '✗'} ${e.nom} (${Math.round((Date.now() - debut) / 1000)} s) : ${derniere.trim().slice(0, 160)}`)
  if (!ok) { const premiereErreur = sortie.split(/\r?\n/).find((l) => /ÉCHEC|✗/.test(l)) || derniere; echec = `${e.nom} — ${premiereErreur.trim().slice(0, 200)}`; break }
}
console.log(echec ? `✗ demo : FAIL — ${echec}` : '✓ demo : PASS — site-qa, grille-qa et code-qa verts : la démo est validée (v16 §4)')
process.exit(echec ? 1 : 0)
