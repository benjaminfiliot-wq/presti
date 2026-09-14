// scripts/grille-qa.mjs — le verdict de la comparaison visuelle (prompt v16 §3.3) : la démo doit atteindre, sur chacun des
// huit critères de plans/references-motionsites.md (C1…C8, notes entières sur 5), la BARRE des références :
//   --barre=haut (par défaut depuis le 14/09/2026) : le troisième quartile des références — le haut du panier ;
//   --barre=mediane : la médiane (la règle d'origine du v16).
// Pourquoi « haut » : la démo Lestraque est passée 8/8 à la médiane, et Benj l'a jugée « loin encore du résultat que je
// veux » le même jour. La médiane de références regardées sur des aperçus, notée par un agent, n'est pas sa barre.
// Les notes vivent dans .orchestre/preuves/refs/grille.json :
//   { "references": { "<id>": { "C1": 5, …, "C8": 4 }, … },      ← les références (au moins cinq notées)
//     "demo": { "C1": 4, …, "C8": 4 },                             ← la démo, notée par le même juge, côte à côte
//     "juge": "sous-agent navigateur / Claude Code", "date": "2026-09-14", "captures": ["…"] }
// Sortie : une ligne par critère (démo / barre / verdict), puis « grille : PASS|FAIL — <critères manquants> ».
//
// Usage : node scripts/grille-qa.mjs [--fichier=.orchestre/preuves/refs/grille.json] [--barre=haut|mediane] [--json]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.resolve(RACINE, (process.argv.find((a) => a.startsWith('--fichier=')) || '--fichier=.orchestre/preuves/refs/grille.json').slice(10))
const BARRE = (process.argv.find((a) => a.startsWith('--barre=')) || '--barre=haut').slice(8)
if (!['haut', 'mediane'].includes(BARRE)) { console.error(`barre inconnue : ${BARRE} (haut | mediane)`); process.exit(2) }
const NOM_BARRE = BARRE === 'haut' ? '3e quartile' : 'médiane'
const LA_BARRE = BARRE === 'haut' ? 'le 3e quartile' : 'la médiane'
const CRITERES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']
const LIBELLES = { C1: 'objet visuel fort dans le héros', C2: 'mouvement ambiant continu', C3: 'typographie monumentale', C4: 'révélations séquencées', C5: 'contrastes et transitions', C6: 'matière', C7: 'retenue', C8: 'rythme' }
const note = (v) => Number.isInteger(v) && v >= 1 && v <= 5 ? v : null
// quantile par interpolation linéaire (q = 0,5 → médiane ; q = 0,75 → troisième quartile)
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); const p = (s.length - 1) * q; const b = Math.floor(p); return b + 1 < s.length ? s[b] + (p - b) * (s[b + 1] - s[b]) : s[b] }
const Q = BARRE === 'haut' ? 0.75 : 0.5

if (!fs.existsSync(F)) { console.log(`✗ grille : FAIL — ${path.relative(RACINE, F)} absent (la comparaison n'a pas été faite)`); process.exit(1) }
const g = JSON.parse(fs.readFileSync(F, 'utf8'))
const refs = Object.entries(g.references || {}).filter(([, r]) => CRITERES.every((c) => note(r[c]) !== null))
const demo = g.demo || {}
const manquants = []
const lignes = []
for (const c of CRITERES) {
  const barre = refs.length ? Math.round(quantile(refs.map(([, r]) => r[c]), Q) * 100) / 100 : null
  const d = note(demo[c])
  const ok = barre !== null && d !== null && d >= barre
  if (!ok) manquants.push(`${c} (${LIBELLES[c]}) : démo ${d ?? '—'} < ${NOM_BARRE} ${barre ?? '—'}`)
  lignes.push({ critere: c, libelle: LIBELLES[c], demo: d, barre, ok })
}
const assez = refs.length >= 5
if (process.argv.includes('--json')) console.log(JSON.stringify({ barre: BARRE, references: refs.length, lignes, manquants }, null, 1))
else {
  for (const l of lignes) console.log(`${l.ok ? '✓' : '✗'} ${l.critere} ${l.libelle.padEnd(34)} démo ${l.demo ?? '—'} · ${NOM_BARRE} ${l.barre ?? '—'}`)
  console.log(`\n${refs.length} référence(s) notée(s) sur les huit critères${assez ? '' : ' (il en faut au moins cinq)'} · barre : ${NOM_BARRE} · juge : ${g.juge || '?'} · ${g.date || ''}`)
}
const ok = assez && manquants.length === 0
console.log(ok ? `✓ grille : PASS — la démo atteint ${LA_BARRE} des références sur les huit critères` : `✗ grille : FAIL — ${assez ? manquants.join(' ; ') : 'pas assez de références notées'}`)
process.exit(ok ? 0 : 1)
