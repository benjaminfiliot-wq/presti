#!/usr/bin/env node
// scripts/modeles-metiers-qa.mjs — juge de la tâche 000-modeles-metiers (27/09/2026) : six nouveaux modèles de contenu de maquette
// (maçon, carreleur, peintre, chauffagiste, isolation, paysagiste) au même format que maquettes/modeles/couvreur/contenu.json.
// Écrit AVANT la production. 0 = PASS, 1 = FAIL. Statique : structure identique, vocabulaire du métier, rien d'inventé, photos existantes.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const M = 'maquettes/modeles'
const manques = []
const ref = JSON.parse(readFileSync(join(M, 'couvreur', 'contenu.json'), 'utf8'))
const cles = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? cles(v, p + k + '.') : [p + k]))
const clesRef = new Set(cles(ref))
const VOCAB = {
  macon: /ma[çc]onner|fondation|mur|dalle|parpaing|enduit/i, carreleur: /carrel|fa[ïi]ence|joint|sol/i, peintre: /peintur|enduit|fa[çc]ade|murs?/i,
  chauffagiste: /chauff|chaudi[èe]re|pompe [àa] chaleur|radiateur/i, isolation: /isol|combles|rampants|laine|thermique/i, paysagiste: /jardin|paysag|plantation|haie|gazon|am[ée]nagement ext/i,
}
for (const metier of Object.keys(VOCAB)) {
  const f = join(M, metier, 'contenu.json')
  if (!existsSync(f)) { manques.push(`${metier} : ${f} absent`); continue }
  const brut = readFileSync(f, 'utf8'); let c
  try { c = JSON.parse(brut) } catch { manques.push(`${metier} : JSON invalide`); continue }
  const k = new Set(cles(c))
  for (const x of clesRef) if (!k.has(x)) manques.push(`${metier} : clé « ${x} » absente (même structure que couvreur)`)
  if (c.metier !== metier) manques.push(`${metier} : champ metier = « ${c.metier} »`)
  if (brut.length < 1000 || brut.length > 3500) manques.push(`${metier} : ${brut.length} caractères (1 000 à 3 500 attendus, comme les modèles existants)`)
  const texte = JSON.stringify(c.pages || {}) + JSON.stringify(c.libelles || {})
  if (!VOCAB[metier].test(texte)) manques.push(`${metier} : vocabulaire du métier absent des pages`)
  if (!/\{ville\}/.test(texte) || !/\{entreprise\}/.test(texte)) manques.push(`${metier} : gabarits {ville} et {entreprise} attendus, comme couvreur`)
  if (/\b\d+\s*(ans|années)\s+d.exp|\b\d{2,}\s+(chantiers|clients|réalisations)|avis|★|\/5\b|garantie décennale|certifi[ée]|RGE|Qualibat|label/i.test(texte)) manques.push(`${metier} : affirmation invérifiable (expérience, nombre de chantiers, avis, décennale, certification, label) : interdit dans un modèle`)
  const demo = c.photos && c.photos.demo; const fichiers = (c.photos && c.photos.fichiers) || []
  if (!demo || !existsSync(join('public', 'sites-demo', demo))) manques.push(`${metier} : photos.demo « ${demo} » ne correspond à aucun dossier public/sites-demo/`)
  // 04/10 : le contrat est celui du générateur (public/sites-demo/generer.mjs, « modèle : photos invalides ») : un nom de fichier SANS dossier
  // (/^[a-z0-9.-]+\.(webp|avif|jpe?g|png)$/), qu'il cherche sous public/sites-demo/<demo>/images/. Ce juge acceptait « images/x » (existsSync sur
  // <demo>/<x>) : les six modèles écrits ainsi passaient ici et faisaient refuser la maquette de chaque métier (maquette-qa MQ-10, 04/10).
  else for (const x of fichiers) {
    if (typeof x !== 'string' || !/^[a-z0-9.-]+\.(?:webp|avif|jpe?g|png)$/.test(x)) manques.push(`${metier} : photo « ${x} » : un nom de fichier sans dossier attendu (le générateur le cherche sous public/sites-demo/${demo}/images/)`)
    else if (!existsSync(join('public', 'sites-demo', demo, 'images', x))) manques.push(`${metier} : photo ${demo}/images/${x} introuvable`)
  }
  if (demo && demo !== metier && !/illustration/i.test(JSON.stringify(c.libelles || {}))) manques.push(`${metier} : photos d'un autre métier (${demo}) sans libellé « illustration » (à remplacer par celles du client)`)
}
// Les quatre modèles existants ne bougent pas.
for (const m of ['couvreur', 'electricien', 'menuisier', 'plombier']) if (!existsSync(join(M, m, 'contenu.json'))) manques.push(`modèle existant ${m} disparu`)
if (manques.length) { console.log(`modeles-metiers-qa : FAIL — ${manques.length} manque(s)`); for (const x of manques.slice(0, 30)) console.log('  - ' + x); process.exit(1) }
console.log('modeles-metiers-qa : PASS — 6 modèles au format couvreur, vocabulaire du métier, rien d\'invérifiable, photos existantes')
