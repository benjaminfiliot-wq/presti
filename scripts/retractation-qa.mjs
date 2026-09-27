#!/usr/bin/env node
// scripts/retractation-qa.mjs — juge de la tâche 000-retractation (27/09/2026) : la commande du site à 300 € respecte le droit de
// rétractation des petites entreprises (L221-3 : ≤ 5 salariés hors champ de leur activité principale = protégées comme consommateurs ;
// L221-28 1° : renoncement exprès pour un service pleinement exécuté avant 14 jours). Écrit AVANT la production. 0 = PASS, 1 = FAIL.
// Source du cadre : SaaS/Produit/Prospection-Cadre-Legal-2026-09-27.md (recherche Perplexity sourcée du 27/09).
import { existsSync, readFileSync } from 'node:fs'

const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const page = lire('app/site/commander/page.tsx')
const route = lire('app/api/site/commander/route.ts')
const cgu = lire('app/cgu/page.tsx')

// RT-1 la page : une case NON cochée par défaut, au texte exact, qui conditionne le paiement.
if (!/renonciationRetractation/.test(page)) manques.push('RT-1 : la page ne gère pas d\'état « renonciationRetractation »')
if (/useState\(\s*true\s*\)[^\n]*renonciation|renonciation[^\n]*useState\(\s*true\s*\)/i.test(page)) manques.push('RT-1 : la case ne doit PAS être cochée par défaut')
if (!/avant la fin du délai de rétractation/i.test(page) || !/perdr\w* mon droit de rétractation/i.test(page)) manques.push('RT-1 : texte de la case attendu : « …commence avant la fin du délai de rétractation… je reconnais perdre mon droit de rétractation une fois le site entièrement livré »')
if (!/L221-28/.test(page)) manques.push('RT-1 : la case doit citer l\'article L221-28 du Code de la consommation')
if (!/\/cgu#retractation/.test(page)) manques.push('RT-1 : lien vers /cgu#retractation absent')
if (!/disabled=\{[^}]*renonciationRetractation|!renonciationRetractation/.test(page)) manques.push('RT-1 : le paiement doit être impossible tant que la case n\'est pas cochée')
if (!/renonciationRetractation\s*:?\s*renonciationRetractation|renonciationRetractation:/.test(page)) manques.push('RT-1 : la page doit envoyer « renonciationRetractation » à /api/site/commander')

// RT-2 la route : refus serveur sans accord, trace datée dans Stripe.
if (!/renonciationRetractation/.test(route)) manques.push('RT-2 : la route ne lit pas « renonciationRetractation »')
if (!/renonciationRetractation\s*!==\s*true|!\s*\w*\.?renonciationRetractation/.test(route) || !/status:\s*400/.test(route)) manques.push('RT-2 : la route doit rendre 400 si « renonciationRetractation » n\'est pas exactement true')
const meta = (route.match(/metadata:\s*\{[^}]*\}/g) || []).join(' ')
if (!/retractation_accord/.test(meta)) manques.push('RT-2 : les métadonnées Stripe doivent porter « retractation_accord » (date ISO de l\'accord)')
if (!/new Date\(\)\.toISOString\(\)/.test(route)) manques.push('RT-2 : la date de l\'accord doit être horodatée côté serveur (new Date().toISOString())')

// RT-3 les CGU : section complète et modèle de formulaire.
const sec = (cgu.split(/id="retractation"/)[1] || '')
if (!sec) manques.push('RT-3 : pas de section id="retractation" dans les CGU')
else {
  for (const [re, quoi] of [[/14 jours/, '14 jours'], [/L221-3/, 'L221-3 (petites entreprises)'], [/L221-28/, 'L221-28 (renoncement)'], [/L221-25|au prorata|proportionnel/, 'paiement au prorata si rétractation après début d\'exécution (L221-25)'], [/formulaire de rétractation/i, 'modèle de formulaire'], [/Je\s*\/\s*Nous vous notifie/i, 'texte du modèle officiel (« Je/Nous vous notifie… »)']]) if (!re.test(sec.slice(0, 6000))) manques.push(`RT-3 : la section ne mentionne pas ${quoi}`)
}
// RT-4 aucune mention fiscale fausse.
if (/\bHT\b|TTC/.test(page + sec.slice(0, 6000))) manques.push('RT-4 : « HT »/« TTC » interdits (franchise en base)')

if (manques.length) { console.log(`retractation-qa : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log('retractation-qa : PASS — case de renoncement non cochée et obligatoire, refus serveur sans accord, accord horodaté dans Stripe, section CGU avec modèle de formulaire')
