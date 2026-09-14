// scripts/grille-qa.mjs — le verdict de la comparaison visuelle (prompt v16 §3.3) : la démo doit atteindre AU MOINS la
// médiane des références sur chacun des huit critères de plans/references-motionsites.md (C1…C8, notes entières sur 5).
// Les notes vivent dans .orchestre/preuves/refs/grille.json :
//   { "references": { "<id>": { "C1": 5, …, "C8": 4 }, … },      ← les références (au moins cinq notées)
//     "demo": { "C1": 4, …, "C8": 4 },                             ← la démo, notée par le même juge, côte à côte
//     "juge": "sous-agent navigateur / Claude Code", "date": "2026-09-14", "captures": ["…"] }
// Sortie : une ligne par critère (démo / médiane / verdict), puis « grille : PASS|FAIL — <critères manquants> ».
//
// Usage : node scripts/grille-qa.mjs [--fichier=.orchestre/preuves/refs/grille.json] [--json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.resolve(RACINE, (process.argv.find((a) => a.startsWith('--fichier=')) || '--fichier=.orchestre/preuves/refs/grille.json').slice(10))
const CRITERES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']
const LIBELLES = { C1: 'objet visuel fort dans le héros', C2: 'mouvement ambiant continu', C3: 'typographie monumentale', C4: 'révélations séquencées', C5: 'contrastes et transitions', C6: 'matière', C7: 'retenue', C8: 'rythme' }
const note = (v) => Number.isInteger(v) && v >= 1 && v <= 5 ? v : null
const mediane = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

if (!fs.existsSync(F)) { console.log(`✗ grille : FAIL — ${path.relative(RACINE, F)} absent (la comparaison n'a pas été faite)`); process.exit(1) }
const g = JSON.parse(fs.readFileSync(F, 'utf8'))
const refs = Object.entries(g.references || {}).filter(([, r]) => CRITERES.every((c) => note(r[c]) !== null))
const demo = g.demo || {}
const manquants = []
const lignes = []
for (const c of CRITERES) {
  const med = refs.length ? mediane(refs.map(([, r]) => r[c])) : null
  const d = note(demo[c])
  const ok = med !== null && d !== null && d >= med
  if (!ok) manquants.push(`${c} (${LIBELLES[c]}) : démo ${d ?? '—'} < médiane ${med ?? '—'}`)
  lignes.push({ critere: c, libelle: LIBELLES[c], demo: d, mediane: med, ok })
}
const assez = refs.length >= 5
if (process.argv.includes('--json')) console.log(JSON.stringify({ references: refs.length, lignes, manquants }, null, 1))
else {
  for (const l of lignes) console.log(`${l.ok ? '✓' : '✗'} ${l.critere} ${l.libelle.padEnd(34)} démo ${l.demo ?? '—'} · médiane ${l.mediane ?? '—'}`)
  console.log(`\n${refs.length} référence(s) notée(s) sur les huit critères${assez ? '' : ' (il en faut au moins cinq)'} · juge : ${g.juge || '?'} · ${g.date || ''}`)
}
const ok = assez && manquants.length === 0
console.log(ok ? '✓ grille : PASS — la démo atteint la médiane des références sur les huit critères' : `✗ grille : FAIL — ${assez ? manquants.join(' ; ') : 'pas assez de références notées'}`)
process.exit(ok ? 0 : 1)
