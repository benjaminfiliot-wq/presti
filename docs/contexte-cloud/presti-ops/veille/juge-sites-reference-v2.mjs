#!/usr/bin/env node
// juge-sites-reference-v2.mjs — seconde passe des 10 sites de référence (27/09, écrit AVANT). 0 = PASS, 1 = FAIL.
// La v1 est passée avec des sites faits main (Georgia, Arial, sans le kit) : propres, mais sous le niveau de Lestraque.
// Celui-ci exige le vrai kit du cerveau site v2 : polices de _polices, direction artistique du métier (_kit/da.json),
// mouvement (_kit/kit.js), pages par commune comme Lestraque, et le nom de l'entreprise écrit comme un nom, pas en capitales.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
const R = process.env.VEILLE || join(process.env.HOME || '.', 'veille')
const D = join(R, 'prospection', 'sites-reference')
const PRESTI = process.env.PRESTI || join(process.env.HOME || '.', 'presti')
const manques = []
const v1 = spawnSync(process.execPath, [join(R, 'juges', 'juge-sites-reference.mjs')], { encoding: 'utf8', env: process.env })
if (v1.status !== 0) manques.push(`la v1 ne passe plus : ${(v1.stdout || '').trim().split('\n').slice(0, 4).join(' | ')}`)
const lire = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
let DA = {}
try { DA = JSON.parse(lire(join(PRESTI, 'public', 'sites-demo', '_kit', 'da.json'))) } catch { manques.push('_kit/da.json illisible dans ~/presti') }
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").toLowerCase()
const tous = (dir) => readdirSync(dir, { recursive: true }).map(String)
const dossiers = existsSync(D) ? readdirSync(D).filter((d) => statSync(join(D, d)).isDirectory() && /^\d\d-/.test(d)) : []
for (const d of dossiers) {
  const dos = join(D, d), s = join(dos, 'site')
  let site = null
  try { site = JSON.parse(lire(join(dos, 'site.json'))) } catch { manques.push(`${d} : site.json illisible`); continue }
  if (!existsSync(s)) { manques.push(`${d} : site/ absent`); continue }
  const f = tous(s)
  const html = f.filter((x) => x.endsWith('.html'))
  const css = f.filter((x) => x.endsWith('.css')).map((x) => lire(join(s, x))).join('\n')
  const accueil = lire(join(s, 'index.html'))
  // Le nom affiché : un nom, pas les capitales du répertoire SIRENE.
  const na = site.nom_affiche
  if (typeof na !== 'string' || !/[a-zà-ÿ]/.test(na)) manques.push(`${d} : site.json sans nom_affiche en casse normale (ex. « Société Percot et Fils »)`)
  else if (!norm(accueil).includes(norm(na))) manques.push(`${d} : nom_affiche « ${na} » absent de l'accueil`)
  if (site.nom && /[A-Z]{4,}/.test(site.nom) && accueil.includes(`>${site.nom}<`)) manques.push(`${d} : le nom en capitales « ${site.nom} » est affiché tel quel`)
  // Le kit : polices, mouvement, direction artistique du métier.
  if (!f.some((x) => /\.woff2$/.test(x))) manques.push(`${d} : aucune police .woff2 dans site/ (les polices de public/sites-demo/_polices)`)
  if (!/@font-face/.test(css)) manques.push(`${d} : aucun @font-face dans les CSS du site`)
  if (/font-family\s*:\s*(Georgia|Arial|Helvetica)\b/i.test(css)) manques.push(`${d} : Georgia/Arial/Helvetica en police principale (le kit a ses polices)`)
  if (!f.some((x) => /(^|[\\/])kit\.js$/.test(x)) || !/<script[^>]+kit\.js/.test(accueil)) manques.push(`${d} : kit.js absent ou non chargé par l'accueil (le mouvement du kit)`)
  const da = DA[site.metier]
  if (!da) manques.push(`${d} : métier « ${site.metier} » absent de _kit/da.json`)
  else {
    if (!css.toLowerCase().includes(String(da.accent).toLowerCase())) manques.push(`${d} : l'accent du métier ${da.accent} (_kit/da.json) absent des CSS`)
    const fam = String(da.display).toLowerCase()
    if (!css.toLowerCase().includes(fam)) manques.push(`${d} : la police d'affichage du métier « ${da.display} » absente des CSS`)
  }
  // Les pages, comme Lestraque : accueil, prestations, contact, mentions, et au moins deux pages par commune voisine.
  if (html.length < 6) manques.push(`${d} : ${html.length} pages HTML (≥ 6 : accueil, prestations, contact, mentions, 2 communes voisines)`)
  const communes = (site.communes || []).filter((c) => norm(c) !== norm(site.commune))
  if (communes.length < 2) manques.push(`${d} : site.json.communes sans deux communes voisines réelles`)
  else for (const c of communes.slice(0, 2)) if (!html.some((x) => norm(x).includes(norm(c).replace(/[^a-z0-9]+/g, '-')))) manques.push(`${d} : pas de page pour la commune voisine ${c}`)
  // Toujours privé, toujours honnête.
  for (const x of html) {
    const t = lire(join(s, x))
    if (!/maquette/i.test(t)) { manques.push(`${d}/${x} : mention « maquette » absente`); break }
    if (/\b\d+\s*(ans|années)\s+d.exp|\b\d{2,}\s+(chantiers|clients|réalisations)|★{3,}|\b\d(?:[.,]\d)?\s*\/\s*5\b|garantie décennale|Qualibat/i.test(t)) { manques.push(`${d}/${x} : affirmation invérifiable`); break }
  }
  for (const [c, min] of [['capture-bureau.png', 150000], ['capture-telephone.png', 60000]]) {
    const p = join(dos, c)
    if (!existsSync(p) || statSync(p).size < min) manques.push(`${d} : ${c} absente ou < ${min / 1000} Ko`)
    else if (statSync(p).mtimeMs < statSync(join(s, 'index.html')).mtimeMs - 5000) manques.push(`${d} : ${c} plus ancienne que le site (capture non refaite)`)
  }
}
if (dossiers.length < 10) manques.push(`${dossiers.length} site(s) (10 attendus)`)
if (manques.length) { console.log(`juge-sites-reference-v2 : FAIL — ${manques.length} manque(s)`); for (const m of manques.slice(0, 40)) console.log('  - ' + m); process.exit(1) }
console.log(`juge-sites-reference-v2 : PASS — ${dossiers.length} sites sur le kit du cerveau site v2 (polices, DA du métier, mouvement, pages par commune), captures refaites`)
