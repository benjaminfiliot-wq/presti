#!/usr/bin/env node
// juge-conformite.mjs — juge de la relecture de conformité (vidéos TikTok/Instagram + décisions de Benj vs ce qui est conçu).
// Écrit AVANT la production (26/09/2026). Sur l'usine, depuis ~/veille : node juges/juge-conformite.mjs → 0 PASS, 1 FAIL.
// Il juge la SUBSTANCE : nombre d'éléments numérotés, preuves citées, champs remplis, JSON valide, cohérence rapport/verdicts.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const C = join(R, 'conformite')
const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const numerotes = (t) => (t.match(/^\s*(?:\d+[.)]|\|\s*\d+\s*\|)\s+\S/gm) || []).length
const PREUVE = /\bt\d{2,4}\b|\b\d{1,2}:\d{2}\b|\.md:\d+|\b\d{2}\/\d{2}(?:\/\d{4})?\b/

// 1. Inventaire du reel marketing (le seul qui manquait) : exhaustif, élément par élément, preuve image ou horodatage.
const reel = lire(join(R, 'inventaires', 'reel-marketing.md'))
if (numerotes(reel) < 60) manques.push(`inventaires/reel-marketing.md : ${numerotes(reel)} éléments numérotés (< 60 ; 95 images à couvrir)`)
const lignesReel = reel.split('\n').filter((l) => /^\s*(?:\d+[.)]|\|\s*\d+\s*\|)/.test(l))
const sansPreuve = lignesReel.filter((l) => !PREUVE.test(l)).length
if (lignesReel.length && sansPreuve / lignesReel.length > 0.1) manques.push(`reel-marketing.md : ${sansPreuve}/${lignesReel.length} éléments sans preuve (image tNN ou mm:ss)`)

// 2. Relecture des 4 inventaires existants contre les images (chasse aux erreurs passées).
const relecture = lire(join(C, 'relecture-inventaires.md'))
for (const cle of ['trevsagents', 'androoagi', 'pubs', 'autres']) {
  if (!relecture.includes(`## ${cle}`)) manques.push(`relecture-inventaires.md : section « ## ${cle} » absente`)
}
if ((relecture.match(PREUVE) ? relecture.match(new RegExp(PREUVE.source, 'g')).length : 0) < 40) manques.push('relecture-inventaires.md : moins de 40 preuves citées (images revues réellement ?)')

// 3. Registre des décisions de Benj, sourcé.
const dec = lire(join(C, 'decisions-benj.md'))
const lignesDec = dec.split('\n').filter((l) => /^\s*\d+[.)]\s+\S/.test(l))
if (lignesDec.length < 40) manques.push(`decisions-benj.md : ${lignesDec.length} décisions numérotées (< 40)`)
const decSansSource = lignesDec.filter((l) => !PREUVE.test(l) && !/source\s*:/i.test(l)).length
if (lignesDec.length && decSansSource > 0) manques.push(`decisions-benj.md : ${decSansSource} décision(s) sans source (date, fichier:ligne)`)
if (!/REMPLAC/i.test(dec)) manques.push('decisions-benj.md : aucune décision marquée REMPLACÉE (ex. Claw3D écarté puis choisi le 25/09)')

// 4. Comparaisons par domaine : JSON valide, chaque écart complet.
const DOMAINES = ['interface', 'prospection', 'pubs', 'marketing', 'ia-usine']
let totalEcarts = 0
for (const d of DOMAINES) {
  const p = join(C, `ecarts-${d}.json`)
  if (!existsSync(p)) { manques.push(`ecarts-${d}.json absent`); continue }
  let j
  try { j = JSON.parse(readFileSync(p, 'utf8')) } catch { manques.push(`ecarts-${d}.json : JSON invalide`); continue }
  const e = Array.isArray(j) ? j : j.ecarts
  if (!Array.isArray(e)) { manques.push(`ecarts-${d}.json : pas de tableau d'écarts`); continue }
  totalEcarts += e.length
  e.forEach((x, i) => {
    for (const k of ['type', 'element', 'preuveSource', 'ouDansLeConcu', 'gravite', 'correction']) if (!x || !String(x[k] || '').trim()) manques.push(`ecarts-${d}.json #${i + 1} : champ « ${k} » vide`)
  })
}

// 5. Vérification adverse par un AUTRE modèle : un verdict par écart.
let verdicts = []
try { verdicts = JSON.parse(lire(join(C, 'verdicts.json')) || 'null') } catch { manques.push('verdicts.json : JSON invalide') }
if (!Array.isArray(verdicts)) manques.push('verdicts.json : absent ou pas un tableau')
else {
  if (verdicts.length < totalEcarts) manques.push(`verdicts.json : ${verdicts.length} verdicts pour ${totalEcarts} écarts`)
  const incomplets = verdicts.filter((v) => typeof v.reel !== 'boolean' || !String(v.raison || '').trim() || !String(v.modele || '').trim()).length
  if (incomplets) manques.push(`verdicts.json : ${incomplets} verdict(s) sans reel booléen, raison ou modele vérificateur`)
}

// 6. Rapport.
const rap = lire(join(C, 'rapport.md'))
for (const s of ['## En bref', '## Écarts confirmés', '## Écarts réfutés', '## Corrections non prises', '## Méthode et modèles']) if (!rap.includes(s)) manques.push(`rapport.md : section « ${s} » absente`)
const enBref = (rap.split('## En bref')[1] || '').split('\n## ')[0].split('\n').filter((l) => l.trim()).length
if (rap && (enBref < 3 || enBref > 10)) manques.push(`rapport.md : « En bref » de ${enBref} lignes (attendu 3 à 10)`)
if (Array.isArray(verdicts)) {
  const conf = verdicts.filter((v) => v.reel === true).length
  const citesConf = ((rap.split('## Écarts confirmés')[1] || '').split('\n## ')[0].match(/^\s*(?:[-*]|\d+[.)])\s+\S/gm) || []).length
  if (citesConf < conf) manques.push(`rapport.md : ${citesConf} écarts listés comme confirmés pour ${conf} verdicts « reel »`)
}

if (manques.length) { console.log(`juge-conformite : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log(`juge-conformite : PASS — inventaire du reel, relecture des 4 inventaires, registre des décisions, ${totalEcarts} écarts jugés par un second modèle, rapport complet`)
