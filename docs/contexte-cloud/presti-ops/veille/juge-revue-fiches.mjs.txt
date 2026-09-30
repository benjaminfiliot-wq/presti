#!/usr/bin/env node
// juge-revue-fiches.mjs — juge de la relecture de complétude de la série 026 (26/09/2026, soir). Écrit AVANT la production.
// Depuis ~/veille : node juges/juge-revue-fiches.mjs → 0 PASS, 1 FAIL. Juge la substance : chaque manque est sourcé des deux côtés.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const C = join(R, 'conformite')
const manques = []
const rap = existsSync(join(C, 'revue-fiches-2026-09-26.md')) ? readFileSync(join(C, 'revue-fiches-2026-09-26.md'), 'utf8') : ''
for (const s of ['## En bref', '## Décisions sans fiche', '## Fiches à corriger', '## Nouveaux outils', '## Chemin critique pour dimanche', '## Méthode']) if (!rap.includes(s)) manques.push(`section « ${s} » absente`)
const sec = (t) => (rap.split(`## ${t}`)[1] || '').split('\n## ')[0]
const items = (t) => sec(t).split('\n').filter((l) => /^\s*(?:[-*]|\d+[.)])\s+\S/.test(l))
const d = items('Décisions sans fiche'); const f = items('Fiches à corriger'); const o = items('Nouveaux outils'); const c = items('Chemin critique pour dimanche')
if (d.length + f.length < 5) manques.push(`seulement ${d.length + f.length} manque(s) relevé(s) : relis vraiment les 219 fiches contre le registre`)
for (const l of [...d, ...f]) if (!/decisions-benj\.md|\.md:\d+|\d{2}\/\d{2}/.test(l)) manques.push(`manque sans source de décision : « ${l.trim().slice(0, 80)} »`)
for (const l of f) if (!/026-\d{3}/.test(l)) manques.push(`« Fiches à corriger » sans id de fiche : « ${l.trim().slice(0, 80)} »`)
for (const outil of ['Firecrawl', 'Fish Audio', 'OpenClaw', 'Cursor', 'Ollama', 'Laya', 'Perplexity']) if (!new RegExp(outil, 'i').test(sec('Nouveaux outils'))) manques.push(`« Nouveaux outils » ne traite pas ${outil}`)
if (o.length < 7) manques.push(`« Nouveaux outils » : ${o.length} ligne(s) (≥ 7 : une par outil, avec les fiches qui doivent s'en servir)`)
if (c.length < 5 || !c.every((l) => /026-\d{3}|nouvelle fiche/i.test(l))) manques.push('« Chemin critique pour dimanche » : ≥ 5 étapes, chacune avec ses fiches (026-xxx) ou « nouvelle fiche »')
if (!/prospect/i.test(sec('Chemin critique pour dimanche'))) manques.push('le chemin critique ne dit rien de la prospection (priorité de Benj pour dimanche)')
const enBref = sec('En bref').split('\n').filter((l) => l.trim()).length
if (enBref < 3 || enBref > 10) manques.push(`« En bref » : ${enBref} lignes (3 à 10)`)
if (manques.length) { console.log(`juge-revue-fiches : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log(`juge-revue-fiches : PASS — ${d.length} décision(s) sans fiche, ${f.length} fiche(s) à corriger, ${o.length} outil(s), chemin critique de ${c.length} étape(s)`)
