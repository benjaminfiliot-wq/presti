// scripts/fixtures/026-garde/blanc/controles.mjs — le contrôle « JA-3 » du lot gblanc : l'auto-contrôle des jeux d'essai, écrit par
// Claude Code. Il ne juge pas le dépôt : il juge les fixtures (témoin, sabotages, moteur), pour qu'un juge vert ne repose pas sur
// un jeu d'essai qui ne peut rien prouver.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as M from './moteur.mjs'

const ICI = path.dirname(new URL(import.meta.url).pathname)
const GB = ['GB-1', 'GB-2', 'GB-3', 'GB-4', 'GB-5', 'GB-6', 'GB-7']
const lister = (d, rel = '') => fs.readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lister(d, `${rel}${e.name}/`) : [`${rel}${e.name}`]))

export async function controleJeuxGB() {
  const echecs = []
  const temoin = path.join(ICI, 'temoin')
  // 1. le témoin : des fichiers .temoin non vides, une portée lisible dont chaque fichier existe
  const fichiers = new Map()
  for (const f of lister(temoin)) {
    if (!f.endsWith('.temoin')) { echecs.push(`${f} sans le suffixe .temoin`); continue }
    const t = fs.readFileSync(path.join(temoin, f), 'utf8')
    if (!t.trim()) echecs.push(`${f} vide`)
    fichiers.set(f.slice(0, -'.temoin'.length), t)
  }
  let portee = null
  try { portee = JSON.parse(fichiers.get('garde-blanc-portee.json') ?? '') } catch { echecs.push('garde-blanc-portee.json du témoin illisible') }
  for (const x of portee?.fichiers ?? []) if (!fichiers.has(x)) echecs.push(`la portée désigne ${x}, absent du témoin`)
  for (const s of portee?.sites ?? []) if (![...fichiers.keys()].some((k) => k.startsWith(`${s}/`))) echecs.push(`le site ${s} de la portée n'a aucun fichier dans le témoin`)
  for (const g of portee?.generations ?? []) if (!fichiers.has(g.maquette)) echecs.push(`la génération ${g.nom} lit ${g.maquette}, absent du témoin`)
  // 2. le témoin ne contient pas la marque en dehors de ce que la liste fermée exempte (les sondes de GB-1 le prouvent sur l'arbre ; ici, à la lettre)
  for (const [f, t] of fichiers) {
    if (f === 'garde-blanc-portee.json') continue
    const mode = M.modeDe(f)
    const fuites = M.trouverMarque(f, t, { mode })
    if (fuites.length) echecs.push(`le témoin ${f} porte la marque hors exemption (ligne ${fuites[0].ligne})`)
  }
  // 3. les sabotages de lot.mjs : le texte à remplacer figure exactement une fois, le critère visé existe, six critères visés au moins
  const lot = await import(`${pathToFileURL(path.join(ICI, 'lot.mjs')).href}?ja3=${Date.now()}`)
  const sab = lot.juges?.[0]?.sabotages ?? []
  const noms = new Set()
  for (const s of sab) {
    if (noms.has(s.nom)) echecs.push(`sabotage « ${s.nom} » en double`)
    noms.add(s.nom)
    if (!GB.includes(s.tue)) echecs.push(`sabotage « ${s.nom} » : critère ${s.tue} inconnu`)
    const t = fichiers.get(s.fichier)
    if (t === undefined) { echecs.push(`sabotage « ${s.nom} » : ${s.fichier} n'est pas un fichier du témoin`); continue }
    if (!s.retirer) { const n = t.split(s.avant).length - 1; if (n !== 1) echecs.push(`sabotage « ${s.nom} » : « ${s.avant.slice(0, 40)} » figure ${n} fois dans ${s.fichier}`) }
  }
  const vises = new Set(sab.map((s) => s.tue))
  for (const id of GB) if (!vises.has(id)) echecs.push(`aucun sabotage ne vise ${id}`)
  // 4. le moteur : les faux positifs et les évasions connus (un jeu d'essai étiqueté)
  const ESSAIS = [
    ['Le prestige du chantier', 0], ['la prestidigitation', 0], ['prestiges', 0], ['Presti', 1], ['PRESTI', 1], ['prestiapp.fr', 1], ['https://prestiapp.fr/site-genere/x', 1],
    ['Pres&shy;ti', 1], ['&#80;resti', 1], ['&#x50;resti', 1], ['Ｐresti', 1], ['P​resti', 1], ['presti-conv', 1], ['PRESTI_ALERTES_EMAIL', 1], ['La prestation de service', 0],
  ]
  for (const [t, n] of ESSAIS) {
    const v = M.trouverMarque('x.html', t, { mode: 'brut' }).length
    if (v !== n) echecs.push(`moteur : « ${t} » → ${v} occurrence(s), ${n} attendue(s)`)
  }
  const COMMENTAIRES = [['app/x.tsx', 'const a = 1 // Presti\n/* prestiapp */\nconst b = 2', 0], ['public/sites-demo/x.js', '// chez un vrai artisan, c’est la messagerie Presti', 1], ['app/x.css', '/* console Presti */ .a{color:red}', 0], ['public/x.css', '/* console Presti */ .a{color:red}', 1]]
  for (const [f, t, n] of COMMENTAIRES) { const v = M.trouverMarque(f, t, {}).length; if (v !== n) echecs.push(`moteur : ${f} « ${t.slice(0, 30)} » → ${v}, ${n} attendue(s)`) }
  // marqueurs « à confirmer », zone, téléphone
  const Z = M.contradictionsTitre('<title>Couvreur à Blagnac et alentours</title><h1>Couvreur</h1><p>Zone d’intervention : à confirmer</p>')
  if (Z.defauts.length !== 1) echecs.push(`moteur : zone affirmée en titre, ${Z.defauts.length} défaut(s), 1 attendu`)
  if (M.contradictionsTitre('<title>Couvreur à Blagnac</title><h1>Couvreur</h1><p>Zone d’intervention : à confirmer</p>').defauts.length) echecs.push('moteur : la ville de base d’un titre prise pour une zone affirmée')
  if (M.contradictionsTitre('<title>Couvreur et alentours</title><h1>Couvreur</h1><p>Zone d’intervention : Toulouse</p>').defauts.length) echecs.push('moteur : une zone renseignée prise pour une zone à confirmer')
  if (M.telephonesMarques('<p>Tél. : <a href="tel:+33299000000">02 99 00 00 00</a> (numéro à reconfirmer)</p>').defauts.length !== 1) echecs.push('moteur : téléphone à reconfirmer cliquable non vu')
  if (M.telephonesMarques('<p>Tél. : 02 99 00 00 00 (numéro à reconfirmer)</p><p><a href="tel:+33611000000">06 11 00 00 00</a></p>').defauts.length) echecs.push('moteur : un autre numéro, confirmé, pris pour le numéro à reconfirmer')
  // les mentions légales
  const propre = ['Dénomination : Duval SARL', 'SIREN : 123 456 789', 'Adresse du siège : 12 rue des Lilas, Rennes', 'Hébergeur : Vercel Inc., Covina, États-Unis', 'Directeur de la publication : Marie Duval', 'Médiateur : à compléter', 'Cookies : aucun']
  if (M.defautsLegaux(propre).length) echecs.push(`moteur : des mentions complètes jugées défaillantes (${M.defautsLegaux(propre)[0]})`)
  if (M.defautsLegaux(propre.filter((l) => !/diateur/.test(l))).length !== 1) echecs.push('moteur : médiateur absent non vu')
  if (M.defautsLegaux([...propre, 'Éditeur de l’outil : Presti']).length !== 1) echecs.push('moteur : mention légale au nom de Presti non vue')
  // 5. la liste fermée elle-même est saine, et un élargissement serait refusé
  if (M.defautsExemptions().length) echecs.push(`la liste fermée est refusée par GB-7 : ${M.defautsExemptions()[0]}`)
  const fautives = [
    [{ id: 'X1', fichier: 'public/sites-demo/lestraque/index.html', motif: 'Presti \\(démo\\)', justification: "Une page d'artisan ne doit jamais avoir d'exemption, aucun cas n'est permis ici pour l'éditeur Presti." }, 'public/'],
    [{ id: 'X2', fichier: 'app/p/', motif: '\\bPresti\\b', large: true, justification: "La plateforme de l'artisan ne dit jamais Presti, mais ce dossier entier serait exempté : aucun motif valable, pas de joker." }, 'courte liste'],
    [{ id: 'X3', fichier: 'lib/x.ts', motif: 'Presti', justification: 'parce que' }, 'justification'],
    [{ id: 'X4', fichier: 'lib/x.ts', motif: 'presti', justification: "Le mot seul, sans aucun contexte, serait exempté pour l'éditeur de la plateforme : jamais une raison suffisante, aucun fichier n'y gagne." }, 'mot seul'],
  ]
  for (const [ex, mot] of fautives) if (!M.defautsExemptions([...M.EXEMPTIONS, ex]).some((d) => d.includes(ex.id))) echecs.push(`GB-7 accepterait une exemption fautive (${mot}) : ${ex.id}`)
  if (!M.defautsExemptions([...M.EXEMPTIONS, ...Array.from({ length: 3 }, (_, i) => ({ ...M.EXEMPTIONS[3], id: `Z${i}` }))]).some((d) => /au plus/.test(d))) echecs.push('GB-7 accepterait une liste de plus de huit exemptions')
  return { echecs, detail: `${fichiers.size} fichier(s) de témoin, ${sab.length} sabotage(s) visant ${[...vises].sort().join(', ')}, ${ESSAIS.length + COMMENTAIRES.length + 8} sonde(s) du moteur, ${fautives.length + 1} exemption(s) fautive(s) refusée(s)` }
}
