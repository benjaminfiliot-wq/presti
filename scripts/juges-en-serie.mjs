#!/usr/bin/env node
// scripts/juges-en-serie.mjs — lance plusieurs juges l'un après l'autre, TOUS, et sort en 1 si un seul a échoué.
//
// Pourquoi (025-23, 25/09/2026) : des verifier écrits `bash -c "a || r=1; b || r=1; exit $r"` sortaient toujours en 0 sur
// l'usine. La commande passe par un premier shell qui remplace `$r` par du vide avant que bash ne la lise : il ne reste que
// `exit`, qui rend le code de la dernière commande réussie. Le PC (Windows) n'était pas touché, mais un vert de l'usine ne
// prouvait rien et la boucle de Codex ne voyait jamais son rouge. Ici, aucun `$` : chaque juge est un argument.
//
// Usage :  node scripts/juges-en-serie.mjs "node scripts/a-qa.mjs" "node scripts/b-qa.mjs --critere=X"
//          (dans une fiche : verifier: node scripts/juges-en-serie.mjs "…" "…")
// Sortie : la sortie de chaque juge telle quelle, puis un bilan ; code 0 si tous sont en 0, sinon 1 (2 : rien à lancer).
import { spawnSync } from 'node:child_process'

const juges = process.argv.slice(2).filter((a) => a.trim())
if (!juges.length) {
  console.error('juges-en-serie : aucun juge donné. Usage : node scripts/juges-en-serie.mjs "commande 1" "commande 2" …')
  process.exit(2)
}

const bilan = []
for (const juge of juges) {
  const debut = Date.now()
  console.log(`\n── juges-en-serie : ${juge}`)
  const r = spawnSync(juge, { shell: true, stdio: 'inherit', env: process.env })
  const code = r.status ?? (r.signal ? 128 : 1)
  bilan.push({ juge, code, secondes: ((Date.now() - debut) / 1000).toFixed(1), signal: r.signal || null })
}

console.log('\n── juges-en-serie : bilan')
for (const b of bilan) console.log(`${b.code === 0 ? 'PASS' : 'FAIL'}  code ${b.code}${b.signal ? ` (signal ${b.signal})` : ''}  ${b.secondes} s  ${b.juge}`)
const echecs = bilan.filter((b) => b.code !== 0).length
console.log(echecs ? `juges-en-serie : FAIL — ${echecs} juge(s) sur ${bilan.length} en échec` : `juges-en-serie : PASS — ${bilan.length} juge(s)`)
process.exit(echecs ? 1 : 0)
