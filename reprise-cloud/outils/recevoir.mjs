#!/usr/bin/env node
// reprise-cloud/outils/recevoir.mjs <id> — À LANCER SUR LE PC, après avoir fusionné la branche cloud d'une fiche.
// Reporte la ligne de verdict que le cloud a rangée dans .orchestre/preuves/<id>/verdict-cloud.jsonl vers .orchestre/verdicts.jsonl
// (le cloud ne touche jamais verdicts.jsonl ni digest.md : le PC les écrit en continu), puis régénère le digest.
// Rien n'est écrit si la ligne y est déjà. Le commit de verdicts.jsonl et digest.md est laissé à la session du PC (avec la fiche suivante).
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const id = process.argv[2]
if (!/^\d{3}-\d{2,3}$/.test(id || '')) { console.error('usage : node reprise-cloud/outils/recevoir.mjs <id>'); process.exit(2) }
const src = `.orchestre/preuves/${id}/verdict-cloud.jsonl`
if (!fs.existsSync(src)) { console.error(`✗ ${src} absent : la branche du cloud est-elle fusionnée (git fetch origin, git merge --no-ff origin/claude/…) ?`); process.exit(1) }
const ligne = fs.readFileSync(src, 'utf8').trim()
if (!/"verdict":"PASS"/.test(ligne)) { console.error('✗ la ligne de verdict du cloud n\'est pas PASS'); process.exit(1) }
const cible = '.orchestre/verdicts.jsonl'
const marquee = /"depuis_cloud":true/.test(ligne) ? ligne : ligne.replace(/}$/, ',"depuis_cloud":true}')
const deja = fs.existsSync(cible) && fs.readFileSync(cible, 'utf8').split('\n').some((l) => l === ligne || l === marquee)
if (deja) console.log(`= ${id} : verdict déjà reporté`)
else { fs.appendFileSync(cible, marquee + '\n'); console.log(`✓ ${id} : verdict reporté dans ${cible}`) }
const r = spawnSync(process.execPath, ['scripts/orchestre.mjs', 'digest'], { encoding: 'utf8' })
console.log((r.stdout || r.stderr || '').trim())
process.exitCode = r.status === 0 ? 0 : 1
