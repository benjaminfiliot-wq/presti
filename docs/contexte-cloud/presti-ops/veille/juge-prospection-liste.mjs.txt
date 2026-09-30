#!/usr/bin/env node
// juge-prospection-liste.mjs — juge de la liste de prospects « à sec » (nuit du 26 au 27/09/2026). Écrit AVANT la production.
// Depuis ~/veille : node juges/juge-prospection-liste.mjs → 0 PASS, 1 FAIL. Juge la substance : sources, unicité, zone, pas de doublon Marans.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const P = join(R, 'prospection')
const manques = []
const csv = existsSync(join(P, 'liste-2026-09-27.csv')) ? readFileSync(join(P, 'liste-2026-09-27.csv'), 'utf8').trim().split(/\r?\n/) : []
const COLS = ['siren', 'nom', 'metier', 'commune', 'code_postal', 'telephone', 'site', 'a_un_site', 'source', 'score_laya', 'raison']
if (!csv.length) manques.push('prospection/liste-2026-09-27.csv absent')
else {
  const tete = csv[0].split(';').map((s) => s.trim())
  if (COLS.some((c, i) => tete[i] !== c)) manques.push(`en-tête attendu « ${COLS.join(';')} », trouvé « ${csv[0].slice(0, 120)} »`)
  const lignes = csv.slice(1).map((l) => l.split(';'))
  if (lignes.length < 150) manques.push(`${lignes.length} entreprise(s) (≥ 150 attendues)`)
  const deja = existsSync(join(P, 'siren-deja-contactes.txt')) ? new Set(readFileSync(join(P, 'siren-deja-contactes.txt'), 'utf8').split(/\s+/).filter(Boolean)) : new Set()
  const vus = new Set(); let err = 0
  for (const [i, l] of lignes.entries()) {
    const [siren, nom, metier, commune, cp, tel, site, aSite, source, score] = l.map((s) => (s || '').trim())
    const pb = []
    if (!/^\d{9}$/.test(siren)) pb.push('SIREN invalide')
    if (vus.has(siren)) pb.push('SIREN en double'); vus.add(siren)
    if (deja.has(siren)) pb.push('déjà dans la liste de Marans')
    if (!nom || !metier || !commune) pb.push('nom, métier ou commune vide')
    if (!/^(17|79|85)\d{3}$/.test(cp)) pb.push(`code postal hors zone (${cp})`)
    if (!/^https:\/\//.test(source)) pb.push('source sans URL https')
    if (!['oui', 'non', 'inconnu'].includes(aSite)) pb.push('a_un_site ≠ oui/non/inconnu')
    if (aSite === 'oui' && !/^https?:\/\//.test(site)) pb.push('a_un_site=oui sans URL de site')
    if (score && !/^(0([.,]\d+)?|1([.,]0+)?)$/.test(score)) pb.push('score_laya hors [0,1]')
    if (/@/.test(l.join(';'))) pb.push('une adresse e-mail figure dans la ligne (interdit ici)')
    if (tel && !/^0[1-9](\s?\d{2}){4}$/.test(tel)) pb.push('téléphone mal formé')
    if (pb.length) { err++; if (err <= 8) manques.push(`ligne ${i + 2} (${siren || '?'}) : ${pb.join(', ')}`) }
  }
  if (err > 8) manques.push(`… et ${err - 8} autre(s) ligne(s) en défaut`)
  const sansSite = lignes.filter((l) => (l[7] || '').trim() === 'non').length
  if (lignes.length && sansSite < 50) manques.push(`seulement ${sansSite} entreprise(s) sans site : la cible de l'offre à 300 € est l'artisan SANS site`)
  const scores = lignes.filter((l) => /\d/.test(l[9] || '')).length
  if (lignes.length && scores < lignes.length * 0.8) manques.push(`score Laya présent sur ${scores}/${lignes.length} lignes (≥ 80 %)`)
}
const lis = existsSync(join(P, 'LISEZMOI-liste.md')) ? readFileSync(join(P, 'LISEZMOI-liste.md'), 'utf8') : ''
for (const s of ['## Méthode', '## Sources', '## Répartition', '## Crédits Firecrawl', '## Limites']) if (!lis.includes(s)) manques.push(`LISEZMOI-liste.md : section « ${s} » absente`)
const cred = (lis.split('## Crédits Firecrawl')[1] || '').match(/\d+/g) || []
if (lis && !cred.length) manques.push('LISEZMOI-liste.md : crédits Firecrawl consommés non chiffrés')
if (manques.length) { console.log(`juge-prospection-liste : FAIL — ${manques.length} manque(s)`); for (const m of manques) console.log('  - ' + m); process.exit(1) }
console.log(`juge-prospection-liste : PASS — ${csv.length - 1} entreprises sourcées, zone 17/79/85, sans doublon ni e-mail, score Laya`)
