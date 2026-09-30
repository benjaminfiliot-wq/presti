#!/usr/bin/env node
// juge-outils-web-voix.mjs — juge de l'intégration Firecrawl + Fish Audio + uv/GEO + open-seo + mcp-gsc sur l'usine (26/09/2026).
// Écrit AVANT la production. Depuis ~/veille : node juges/juge-outils-web-voix.mjs → 0 PASS, 1 FAIL. Juge la SUBSTANCE.
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const O = join(R, 'outils')
const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const taille = (p) => (existsSync(p) ? statSync(p).size : 0)

const rap = lire(join(O, 'INTEGRATION-2026-09-26.md'))
for (const s of ['## Firecrawl', '## Fish Audio', '## uv et GEO', '## open-seo', '## mcp-gsc', '## Règles pour les agents', '## Coûts et quotas']) if (!rap.includes(s)) manques.push(`INTEGRATION-2026-09-26.md : section « ${s} » absente`)
for (const s of ['Firecrawl', 'Fish Audio', 'uv et GEO', 'open-seo', 'mcp-gsc']) {
  const sec = (rap.split(`## ${s}`)[1] || '').split('\n## ')[0]
  if (sec && !/audit|examen|lu le code|vérifi/i.test(sec)) manques.push(`section ${s} : aucun audit de la source décrit`)
  if (sec && sec.length < 400) manques.push(`section ${s} : ${sec.length} caractères (< 400)`)
}
if (/fc-[a-f0-9]{16,}|sk-[A-Za-z0-9]{16,}/.test(rap)) manques.push('INTEGRATION-2026-09-26.md contient une clé en clair')

// Firecrawl : trois appels réels (search, scrape, map) avec sortie non vide.
if (taille(join(O, 'essais', 'firecrawl-scrape.md')) < 1500) manques.push('essais/firecrawl-scrape.md absent ou < 1 500 octets (scrape réel)')
if (taille(join(O, 'essais', 'firecrawl-search.json')) < 500) manques.push('essais/firecrawl-search.json absent ou < 500 octets (search réel)')
if (taille(join(O, 'essais', 'firecrawl-map.json')) < 200) manques.push('essais/firecrawl-map.json absent ou < 200 octets (map réel)')
if (!existsSync(join(O, 'firecrawl.sh'))) manques.push('outils/firecrawl.sh (enveloppe qui lit la clé du fichier, sans l\'afficher) absent')

// Fish Audio : un vrai MP3 français et l'outil réutilisable.
if (!existsSync(join(O, 'fish-tts.mjs'))) manques.push('outils/fish-tts.mjs absent')
const mp3 = existsSync(join(O, 'essais')) ? readdirSync(join(O, 'essais')).filter((f) => /^fish-.*\.mp3$/.test(f)) : []
if (!mp3.some((f) => taille(join(O, 'essais', f)) > 10000)) manques.push('aucun essais/fish-*.mp3 de plus de 10 Ko (voix française réelle)')
if (taille(join(O, 'essais', 'fish-voix-fr.json')) < 200) manques.push('essais/fish-voix-fr.json absent (liste des voix françaises)')

// GEO : audit réel de prestiapp.fr.
if (taille(join(O, 'essais', 'geo-audit-prestiapp.txt')) < 500) manques.push('essais/geo-audit-prestiapp.txt absent ou < 500 octets')

if (manques.length) { console.log(`juge-outils-web-voix : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log('juge-outils-web-voix : PASS — Firecrawl (search, scrape, map), Fish Audio (voix FR réelle), audit GEO de prestiapp.fr, open-seo et mcp-gsc examinés, rapport complet')
