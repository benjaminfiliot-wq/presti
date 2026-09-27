// scripts/fixtures/026-pilotage/_autotest/juge-presence-seule.mjs — juge FACTICE de l'autotest JA-10 (026-012) : il ne
// regarde que la PRÉSENCE du fichier (non vide), puis déclare ses quatre critères verts sans lire le contenu — le motif du
// juge de 026-168 (station-planche-qa). Rouge sur la référence, vert sur le témoin : la preuve doit le refuser par ❌ JA-8
// (les sabotages de contenu ne sont pas vus).
import fs from 'node:fs'
import path from 'node:path'
const a = process.argv.slice(2).find((x) => x.startsWith('--racine='))
const racine = a ? a.slice('--racine='.length) : process.cwd()
const f = path.join(racine, 'docs', 'autotest-026', 'regles.json')
console.log('juge-presence-seule (autotest JA-10)')
if (!fs.existsSync(f) || fs.statSync(f).size === 0) {
  console.log('❌ ZT-1 docs/autotest-026/regles.json absent ou vide')
  console.log('juge-presence-seule (autotest JA-10) : FAIL — ZT-1')
  process.exitCode = 1
} else {
  for (const id of ['ZT-1', 'ZT-2', 'ZT-3', 'ZT-4']) console.log(`✅ ${id} conforme`)
  console.log('juge-presence-seule (autotest JA-10) : PASS')
  process.exitCode = 0
}
