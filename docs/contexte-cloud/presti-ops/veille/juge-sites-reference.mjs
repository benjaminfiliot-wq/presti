#!/usr/bin/env node
// juge-sites-reference.mjs — juge des 10 sites de référence autour de Marans (27/09, écrit AVANT). 0 = PASS, 1 = FAIL.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const D = join(R, 'prospection', 'sites-reference')
const manques = []
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const liste = lire(join(R, 'prospection', 'liste-2026-09-27.csv')).trim().split(/\r?\n/).slice(1).map((l) => l.split(';'))
const parSiren = new Map(liste.map((l) => [l[0], l]))
const dossiers = existsSync(D) ? readdirSync(D).filter((d) => statSync(join(D, d)).isDirectory()) : []
if (dossiers.length < 10) manques.push(`${dossiers.length} site(s) de référence (10 attendus)`)
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
for (const d of dossiers) {
  const dos = join(D, d); const site = (() => { try { return JSON.parse(lire(join(dos, 'site.json'))) } catch { return null } })()
  if (!site) { manques.push(`${d} : site.json absent ou invalide`); continue }
  const l = parSiren.get(String(site.siren || ''))
  if (!l) { manques.push(`${d} : siren ${site.siren} absent de liste-2026-09-27.csv`); continue }
  if ((l[7] || '').trim() === 'oui') manques.push(`${d} : l'entreprise a déjà un site`)
  if (!/^(17|85)\d{3}$/.test((l[4] || '').trim())) manques.push(`${d} : hors de la zone de Marans (${l[4]})`)
  for (const f of ['contenu.json', 'attributions.json']) if (!existsSync(join(dos, f))) manques.push(`${d} : ${f} absent`)
  const pages = readdirSync(join(dos, 'site'), { recursive: true }).filter((f) => String(f).endsWith('.html'))
  if (pages.length < 2) manques.push(`${d} : ${pages.length} page(s) HTML générée(s) dans site/ (≥ 2 : accueil et au moins une autre)`)
  const accueil = lire(join(dos, 'site', 'index.html'))
  if (accueil.length < 8000) manques.push(`${d} : site/index.html absent ou < 8 Ko (un vrai site, pas une page vide)`)
  if (accueil && !norm(accueil).includes(norm(l[1]).split(/\s+/).slice(0, 2).join(' '))) manques.push(`${d} : nom de l'entreprise absent de l'accueil`)
  if (accueil && !norm(accueil).includes(norm(l[3]).split(/\s+/)[0])) manques.push(`${d} : commune absente de l'accueil`)
  if (accueil && !/maquette/i.test(accueil)) manques.push(`${d} : mention « maquette » absente`)
  if (/\b\d+\s*(ans|années)\s+d.exp|\b\d{2,}\s+(chantiers|clients|réalisations)|\b\d(?:[.,]\d)?\s*\/\s*5\b|★{3,}|garantie décennale|Qualibat/i.test(accueil)) manques.push(`${d} : affirmation invérifiable dans l'accueil`)
  for (const [f, min] of [['capture-bureau.png', 40000], ['capture-telephone.png', 25000]]) { const p = join(dos, f); if (!existsSync(p) || statSync(p).size < min) manques.push(`${d} : ${f} absente ou trop petite`) }
  const liens = (() => { try { return JSON.parse(lire(join(dos, 'liens-reseaux.json'))) } catch { return null } })()
  if (!liens) manques.push(`${d} : liens-reseaux.json absent`)
  else for (const k of ['facebook', 'instagram', 'site', 'google_maps']) { if (!(k in liens)) manques.push(`${d} : liens-reseaux.json sans « ${k} »`); else if (liens[k] && !/^https:\/\//.test(liens[k].url || '')) manques.push(`${d} : ${k} sans URL https`) }
}
const lis = lire(join(D, 'LISEZMOI.md'))
if (lis.length < 1000 || !/photos/i.test(lis) || !/ordre/i.test(lis)) manques.push('LISEZMOI.md absent, court, ou sans l\'ordre d\'appel et la marche à suivre pour les photos')
if (manques.length) { console.log(`juge-sites-reference : FAIL — ${manques.length} manque(s)`); for (const m of manques.slice(0, 30)) console.log('  - ' + m); process.exit(1) }
console.log(`juge-sites-reference : PASS — ${dossiers.length} sites complets autour de Marans, captures, liens des réseaux, rien d'inventé`)
