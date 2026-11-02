#!/usr/bin/env node
// scripts/geo-presti-qa.mjs — juge de la tâche 000-geo-presti (27/09/2026) : rendre prestiapp.fr lisible par les IA de réponse
// (audit GEO du 26/09 : ChatGPT 35/100, llms.txt absent, FAQPage absent de l'accueil). Écrit AVANT la production. 0 = PASS, 1 = FAIL.
// Statique (pas de build) : lit les fichiers du dépôt.
import { existsSync, readFileSync } from 'node:fs'

const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')

// GE-1 llms.txt servi à la racine : public/llms.txt, ou app/llms.txt/route.ts.
const llms = lire('public/llms.txt') || lire('app/llms.txt/route.ts')
if (!llms) manques.push('GE-1 : ni public/llms.txt ni app/llms.txt/route.ts')
else {
  if (!/^#\s*Presti/m.test(llms)) manques.push('GE-1 : llms.txt doit commencer par « # Presti » (format llmstxt.org)')
  if (!/^>\s*\S/m.test(llms)) manques.push('GE-1 : llms.txt sans résumé en citation (« > … »)')
  const liens = (llms.match(/\]\(https:\/\/prestiapp\.fr\/[^)]*\)/g) || []).length
  if (liens < 5) manques.push(`GE-1 : ${liens} lien(s) vers prestiapp.fr dans llms.txt (≥ 5 : accueil, faq, contact, cgu, commande de site…)`)
  if (!/300\s?€/.test(llms)) manques.push('GE-1 : llms.txt ne dit pas l\'offre (site à 300 €)')
  if (/TTC|HT\b/.test(llms)) manques.push('GE-1 : « HT »/« TTC » interdits (franchise en base, TVA non applicable)')
}
// GE-2 FAQPage sur l'accueil, depuis la MÊME source que /faq (pas de questions inventées ni recopiées à la main).
const accueil = lire('app/page.tsx'); const faq = lire('app/faq/page.tsx')
if (!/FAQPage/.test(accueil)) manques.push('GE-2 : pas de schéma FAQPage dans app/page.tsx')
const imp = accueil.match(/import\s+\{?[^}]*\}?\s+from\s+['"]([^'"]+)['"]/g) || []
const source = faq.match(/from\s+['"](@\/lib\/[^'"]+|\.\.?\/[^'"]+)['"]/g) || []
const partage = source.some((s) => imp.some((i) => i.includes(s.replace(/^from\s+/, '').replace(/['"]/g, ''))))
if (!partage) manques.push('GE-2 : l\'accueil et /faq doivent lire les questions à la même source (un module partagé), pas une copie')
if (/Question'[^]*acceptedAnswer/.test(accueil) === false && /acceptedAnswer/.test(accueil) === false) manques.push('GE-2 : FAQPage sans acceptedAnswer')
// GE-3 robots : les robots d'IA restent autorisés.
const robots = lire('app/robots.ts') || lire('public/robots.txt')
if (/GPTBot[^]*Disallow:\s*\/\s/.test(robots) || /PerplexityBot[^]*Disallow:\s*\/\s/.test(robots)) manques.push('GE-3 : un robot d\'IA est bloqué')
// GE-4 rien d'inventé dans llms.txt : pas de chiffre de clients, d'avis ou de note.
if (/\b\d{2,}\s+(clients|artisans satisfaits|avis)\b|★|\/5\b/.test(llms)) manques.push('GE-4 : chiffre de clients, avis ou note dans llms.txt (interdit : rien d\'inventé)')

// GE-5 (27/10) : llms.txt écrit les prix et les durées d'essai en toutes lettres (c'est ce que les IA de réponse citent) ; ils
// doivent rester ceux de lib/plans.ts. Le fichier est statique : quand la grille bouge, ce juge rougit au lieu de laisser
// une IA annoncer un ancien prix.
const plans = lire('lib/plans.ts')
for (const id of ['studio', 'signature']) {
  const m = plans.match(new RegExp(`\\n\\s*${id}: \\{ label: '([^']+)'[^\\n]*?prixMois: (\\d+)`))
  if (!m) { manques.push(`GE-5 : offre « ${id} » introuvable dans lib/plans.ts`); continue }
  const [, label, prix] = m
  if (llms && !new RegExp(`${label} : ${prix} € par mois`).test(llms)) manques.push(`GE-5 : llms.txt ne dit pas « ${label} : ${prix} € par mois » (lib/plans.ts)`)
}
const essai = plans.match(/ESSAI_JOURS[^=]*=\s*\{\s*studio:\s*(\d+),\s*signature:\s*(\d+)/)
if (!essai) manques.push('GE-5 : ESSAI_JOURS introuvable dans lib/plans.ts')
else if (llms && !new RegExp(`${essai[1]} jours en Studio, ${essai[2]} jours en Signature`).test(llms)) manques.push(`GE-5 : llms.txt ne dit pas « ${essai[1]} jours en Studio, ${essai[2]} jours en Signature » (lib/plans.ts)`)

if (manques.length) { console.log(`geo-presti-qa : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log('geo-presti-qa : PASS — llms.txt au format llmstxt.org, FAQPage sur l\'accueil depuis la source de /faq, robots d\'IA autorisés, rien d\'inventé')
