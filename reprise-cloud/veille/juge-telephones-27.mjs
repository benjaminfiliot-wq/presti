#!/usr/bin/env node
// juge-telephones-27.mjs — juge de la recherche des numéros professionnels publiés des 30 maquettes (27/09, écrit AVANT). 0 PASS, 1 FAIL.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const D = join(R, 'prospection', 'maquettes-2026-09-27')
const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const csv = lire(join(D, 'telephones-trouves.csv')).trim().split(/\r?\n/)
if (!/^n;entreprise;telephone;source;type_source;confiance$/.test(csv[0] || '')) manques.push('telephones-trouves.csv : en-tête « n;entreprise;telephone;source;type_source;confiance » attendu')
const l = csv.slice(1).map((x) => x.split(';'))
const trouves = l.filter((x) => /^0[1-9](\s?\d{2}){4}$/.test((x[2] || '').trim()))
if (l.length < 24) manques.push(`${l.length} ligne(s) (24 entreprises sans numéro à traiter)`)
if (trouves.length < 16) manques.push(`${trouves.length} numéro(s) trouvé(s) sur ${l.length} (≥ 16 attendus, sinon expliquer dans LISEZMOI pourquoi)`)
for (const x of trouves) {
  if (!/^https:\/\//.test((x[3] || '').trim())) manques.push(`${x[1]} : numéro sans URL de source`)
  if (/pagesjaunes\.fr\/pros?\//i.test(x[3] || '') && !/resultat de recherche|search/i.test(x[4] || '')) manques.push(`${x[1]} : page PagesJaunes aspirée (interdit : seulement l'extrait d'un résultat de recherche)`)
  if (!['site_entreprise', 'page_pro_reseau', 'resultat_recherche', 'annuaire_public'].includes((x[4] || '').trim())) manques.push(`${x[1]} : type_source inconnu`)
}
const suivi = lire(join(D, 'suivi-appels.csv'))
const vides = suivi.trim().split(/\r?\n/).slice(1).filter((x) => { const t = x.split(';')[2] || ''; return !t || /non/i.test(t) }).length
if (vides > 30 - 6 - trouves.length + 1) manques.push(`suivi-appels.csv : ${vides} lignes encore sans numéro (reporter les numéros trouvés)`)
const kit = lire(join(D, 'KIT-APPEL.md'))
for (const x of trouves) if (!kit.includes((x[2] || '').trim())) manques.push(`KIT-APPEL.md : le numéro de ${x[1]} n'est pas reporté dans son bloc`)
if (manques.length) { console.log(`juge-telephones-27 : FAIL — ${manques.length} manque(s)`); for (const m of manques.slice(0, 25)) console.log('  - ' + m); process.exit(1) }
console.log(`juge-telephones-27 : PASS — ${trouves.length}/${l.length} numéros professionnels sourcés, reportés dans le kit et le suivi`)
