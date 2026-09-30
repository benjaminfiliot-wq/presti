#!/usr/bin/env node
// juge-yt.mjs — juge de l'analyse des 14 vidéos YouTube « dropshipping / e-commerce IA » (écrit AVANT la production, 26/09/2026).
// Lancé sur l'usine depuis ~/veille : node juges/juge-yt.mjs   → code 0 = PASS, 1 = FAIL (liste des manques).
// Il teste la SUBSTANCE, pas l'existence : un fichier vide ou squelettique échoue.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const IDS = ['9cXVJqlWNK0', 'Z2un1Yax_aQ', 'AWyEpJokQiM', 'ZCC6uqwHxV4', 'NrjE4aBhzmU', 'sPhCwBND6oI', 'J6Cpt7BOqI0',
  'uNrz5v9p-zk', 'dh542CjmMi0', '5uaSrfCLd78', 'pPoR_0FHl-U', 'ip4IHi1ZfhA', 'JBIuZCw74FI', 'vEP99KxIYHk']
const RACINE = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const horodatages = (t) => (t.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g) || []).length

for (const id of IDS) {
  const dos = join(RACINE, 'youtube', id)
  const transcription = lire(join(dos, 'transcription.txt'))
  if (transcription.length < 2000) manques.push(`${id} : transcription.txt absente ou < 2000 caractères (${transcription.length})`)
  else if (horodatages(transcription) < 20) manques.push(`${id} : transcription sans horodatages (${horodatages(transcription)} < 20)`)
  const images = existsSync(join(dos, 'images')) ? readdirSync(join(dos, 'images')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && statSync(join(dos, 'images', f)).size > 3000) : []
  if (images.length < 10) manques.push(`${id} : moins de 10 images non vides (${images.length})`)
  const inv = lire(join(RACINE, 'inventaires', `yt-${id}.md`))
  if (inv.length < 4000) { manques.push(`${id} : inventaires/yt-${id}.md absent ou < 4000 caractères (${inv.length})`); continue }
  if (horodatages(inv) < 10) manques.push(`${id} : inventaire avec moins de 10 horodatages (${horodatages(inv)})`)
  for (const section of ['## Méthode', '## Outils', '## Chiffres', '## Affirmations douteuses', '## Transposable à Presti', '## Contrôle']) {
    if (!inv.includes(section)) manques.push(`${id} : section « ${section} » manquante`)
  }
  if (!/inventaire A/i.test(inv) || !/inventaire B/i.test(inv)) manques.push(`${id} : les deux inventaires indépendants (A et B) ne sont pas identifiés`)
}

const strat = lire(join(RACINE, 'dropshipping', 'strategie-brouillon.md'))
if (strat.length < 6000) manques.push(`dropshipping/strategie-brouillon.md absent ou < 6000 caractères (${strat.length})`)
else {
  const citees = IDS.filter((id) => strat.includes(id)).length
  if (citees < 12) manques.push(`stratégie : ne cite que ${citees} vidéos sur 14 (id YouTube attendus comme sources)`)
  for (const s of ['## Contradictions', '## Outils gratuits', '## Plan pour Presti']) if (!strat.includes(s)) manques.push(`stratégie : section « ${s} » manquante`)
}
const index = lire(join(RACINE, 'INDEX.md'))
const indexees = IDS.filter((id) => index.includes(id)).length
if (indexees < 14) manques.push(`INDEX.md : ${indexees}/14 vidéos indexées`)

if (manques.length) { console.log(`juge-yt : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log('juge-yt : PASS — 14 vidéos transcrites, illustrées, inventoriées (A+B+contrôle), stratégie consolidée, index à jour')
