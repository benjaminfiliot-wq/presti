#!/usr/bin/env node
// scripts/station-planche-qa.mjs — le juge de la planche de la station (fiche 026-168, N1a), qui juge la planche F0
// (026-169). Écrit par Claude Code : la version du 26/09 était une coquille (seul PN-1 était lu, PN-2 à PN-9 écrits verts en
// dur, un --temoin qui fabriquait du bruit) ; réécrit le 27/09, puis corrigé le 28/09 à la cause des six défauts de la
// contre-vérification (PN-6 à toutes les tailles et dans les trois vues, portrait compris ; plaques et écrans visibles ;
// aucun ✅ sans mesure ; une ligne par critère quand PN-1 est rouge ; atelier témoin sabotable dans la racine jugée).
//
//   node scripts/station-planche-qa.mjs --partie=planche [--racine=<arbre>] [--atelier=<dossier>] [--temoin]
//
// ── Où il tourne ───────────────────────────────────────────────────────────────────────────────────────────────────────
// L'atelier (~/claw3d-pixel), le lot A (~/station-assets), la référence t049.2 et Chromium n'existent que sur l'usine
// (hôte « presti-usine »). Lancé ailleurs (le PC), le juge fait sur place la partie statique de PN-1 (les trois documents),
// puis se relance lui-même :
//   node scripts/usine.mjs executer --nom=planche --rapatrier=<captures> -- node scripts/station-planche-qa.mjs <options>
// et rend la sortie et le code de l'usine tels quels ; usine injoignable ou verdict non rendu → code 2. PN-1 rouge sur le
// poste → code 1, sans relance : ni atelier ni navigateur. Avec --racine=<arbre du PC> (la preuve 026-012 : référence,
// témoin, sabotages), l'usine ne voit pas cet arbre (le paquet d'executer ne porte pas .orchestre/travail/) : les trois
// documents, et l'atelier quand --atelier le désigne DANS cet arbre, partent avec la relance, dans --envoi=<gzip, base64url>
// (30 000 caractères au plus : la ligne de commande de Windows), et l'usine les repose sous
// .orchestre/travail/station-planche-qa/racine-<empreinte>/ avant de les juger. Aucun `verifier` ne lance usine.mjs : c'est
// le juge qui le fait (CV-2 de 026-001).
//
// ── Ce que fait le juge sur l'usine (partie planche) ───────────────────────────────────────────────────────────────────
// 1. PN-1 : les trois documents, puis l'atelier au commit que cite planche.md, git status propre.
// 2. L'atelier est EXTRAIT au commit cité (`git archive`, lecture seule) sous .orchestre/travail/station-planche-qa/atelier/,
//    avec ses node_modules en liens physiques (cp -al) : rien n'est écrit dans ~/claw3d, ~/claw3d-pixel ni
//    ~/station-assets, pas même un .next ; jamais `npm install`. Le juge le lance LUI-MÊME (`node server/index.js --dev`,
//    la commande `dev` de Claw3D) sur 127.0.0.1, port libre, avec CUSTOM_RUNTIME_ALLOWLIST=aucun.invalid (une liste non vide
//    qui ne permet rien, §0.5), NEXT_TELEMETRY_DISABLED=1, un environnement réduit (aucun .env n'est copié ni lu) et un piège
//    réseau chargé par NODE_OPTIONS=--import (toute connexion hors de la boucle locale est refusée et consignée : PN-5) ; il
//    l'arrête dans un finally (groupe de processus).
// 3. Chromium (Playwright, celui de l'usine) : toute requête hors http://127.0.0.1:<port>/ est bloquée et consignée (PN-5),
//    résolution de noms fermée ; horloge de la page figée (page.clock) pour que deux rendus soient comparables ; CSP
//    contournée pour les seuls styles du juge (masques et sonde).
// 4. Les captures sont prises par le juge (page.screenshot) : bureau.jpg (1440×900), bureau-1280.jpg (1280×800),
//    telephone.jpg (390×844, densité 3), echelle.jpg et vaisseau.jpg (1440×900), dans .orchestre/preuves/026-169/ quand la
//    racine est le dépôt (il efface d'abord les images de mêmes noms), sinon sous .orchestre/travail/station-planche-qa/.
//
// ── Le contrat de la planche (ce que 026-169 doit livrer pour être jugée) ─────────────────────────────────────────────
// Documents (racine) :
//   docs/station/planche.md       Markdown libre, plus UN bloc ```planche lu par le juge :
//                                   atelier: <sha du commit « f0-planche » de l'atelier, 7 à 40 hexadécimaux>
//                                   k.1440: <entier ≥ 1>    k.1280: <entier ≥ 1>    k.390: <entier ≥ 1>
//                                   palette: #rrggbb #rrggbb …   (24 à 32 couleurs distinctes)
//                                 « atelier: racine » n'est admis que pour un atelier NON versionné posé DANS la racine
//                                 jugée (l'atelier témoin du lot p, posé avec les documents : il voyage avec eux, et ses
//                                 sabotages le changent) ; ~/claw3d-pixel, un dépôt git, se cite toujours par son sha.
//   docs/station/grille.json      { tuile, grille: { bureau: {l,h}, portrait: {l,h} }, emplacements: { <les 20 clés de
//                                   SALLES>: {x,y,l,h} }, reserve: {x,y,l,h} } — en pixels de grille (pixels du dessin),
//                                   origine en haut à gauche du canevas ; tailles multiples de la tuile.
//   docs/station/licence-planche.json  { packs: [ { dossier, titre, auteur, adresse, licence, date, licence_json,
//                                   fichiers: [chemins dans le pack] } ] } — les champs sont ceux du licence.json du pack
//                                   (adresse = page), licence_json = « ~/station-assets/<dossier>/licence.json ».
// L'atelier : un dépôt git dont c'est la racine (~/claw3d-pixel par défaut), HEAD = le commit cité, dont le sujet contient
//   « f0-planche », `git status` vide. --atelier=<dossier> : absolu, ~/…, ou relatif — à la racine jugée (--racine) s'il y
//   existe, sinon au dépôt. Un dossier qui n'est pas la racine d'un dépôt est figé par le juge (copie hors node_modules,
//   .next, .git et .env*, commit à métadonnées fixes : auteur station-planche-qa, date 2026-09-25T00:00:00Z, sujet
//   « f0-planche », fins de ligne normalisées) ; planche.md cite ce commit, ou « racine » s'il est dans la racine jugée.
//   Le serveur : `node server/index.js --dev`, qui lit HOST et PORT.
// La page : /office/planche?vue=station|echelle|vaisseau[&sans=personnages], dans la vraie mise en page :
//   [data-planche="barre"] 80 px en haut (88 au téléphone), [data-planche="colonne-gauche"] 300 px (280 de 1024 à 1439 px),
//   [data-planche="colonne-droite"] 340 px (320), [data-planche="bandeau"] 44 px en bas (64 au téléphone), tous VIDES (ni
//   texte ni image) ; au téléphone (moins de 1024 px) ni colonne ni défilement horizontal, et la carte entre 16 px de marge ;
//   [data-planche="nebuleuse"] (calque a, tout l'écran), [data-planche="decor"] (le canevas, calques b et c : sa taille en
//   pixels de l'appareil = grille × k, à une origine entière, entre les colonnes, la barre et le bandeau),
//   [data-planche="html"] (calque d) avec une zone [data-salle="<clé>"] par salle posée sur son emplacement, sa plaque
//   [data-plaque] et son écran [data-ecran="<clé>"] qui dit « — », VISIBLES au bureau (boîte non nulle, display,
//   visibility, opacité et couleur du texte non nulles, police > 0, texte dans sa boîte, rien par-dessus leur centre — le
//   juge sonde avec pointer-events forcé à auto —, dans leur zone ; aucun contenu CSS ::before/::after sur un écran) ; la
//   réservée [data-salle="ecommerce"] data-porte="fermee" data-poste="non", plaque « E-COMMERCE · RÉSERVÉE », sans écran ;
//   [data-planche="portrait"] hors des colonnes. Vue echelle : deux <img>, [data-planche="echelle-pack"] (l'art d'un pack,
//   servi tel quel, à l'échelle 1 ou k) et [data-planche="echelle-ref"] (t049.2.jpg), côte à côte. La page demande
//   /office/planche/donnees.json dans CHAQUE vue (le juge la sert : donnees-a.json ou donnees-b.json du lot p) et expose
//   window.__planche = { pret: true, donnees: true, atlas: '<chemin de l'atlas>', personnages: [{ nom, etat:
//   'marche'|'poste', x, y, l, h }], modules: [{ nom, x, y, l, h }] (vue vaisseau), echelle: { pack, fichier } (vue
//   echelle) } — positions en pixels de grille du canevas.
//
// ── Critères (fiche 026-168) ───────────────────────────────────────────────────────────────────────────────────────────
//   PN-1  les trois documents existent, ne sont pas vides et se lisent ; l'atelier est au commit cité, propre. Rouge : les
//         huit autres critères ont chacun leur ligne « ❌ PN-n non évalué (PN-1 rouge : …) ».
//   PN-2  les 20 plaques de SALLES et la réservée, chaque zone sur l'emplacement de grille.json, chaque plaque VISIBLE dans
//         sa zone (1440 et 1280 px) ; la réservée sur `reserve`, porte fermée, sans poste ni écran. Non mesuré à une
//         taille de bureau (canevas absent ou masqué) : rouge.
//   PN-3  à chaque taille : la mise en page (barre, colonnes, bandeau vides, à leurs tailles), le canevas = grille × k de
//         planche.md en pixels de l'appareil, à une origine entière, et chaque bloc k × k du décor capturé est uniforme.
//   PN-4  chaque pixel du décor capturé (nébuleuse, calque HTML et cadre masqués) est opaque et dans la palette déclarée
//         (24 à 32 couleurs), aux trois tailles, et le portrait aussi (à 1440 px, seul, son intérieur à un pixel du bord) ;
//         une taille ou un portrait non mesurés : rouge.
//   PN-5  licence-planche.json = les licence.json du lot A (CC0, auteur, adresse, date), fichiers présents, rien d'interdit ;
//         aucune requête du navigateur hors 127.0.0.1 ; le piège s'est chargé dans l'atelier et l'atelier n'a tenté aucune
//         sortie, hors la seule sonde de version de `next dev` (registry.npmjs.org/-/package/next/dist-tags, refusée aussi) :
//         une police next/font/google, par exemple, est une sortie (le layout de Claw3D en a une : F0 la remplace par une
//         police locale OFL, §3.0.3) ; ~/station-assets inchangé entre le début et la fin du passage, et depuis le premier
//         passage consigné dans .orchestre/travail/station-planche-qa/empreintes-lot-a.json — sur l'usine, celui du dépôt
//         préparé ~/presti, que le bac jetable d'executer n'efface pas (un fichier illisible y est rouge, jamais écrasé).
//   PN-6  aucune donnée : chaque rendu — vue station à 1440×900, 1280×800 et 390×844 (densité 3), vue vaisseau, vue
//         echelle — est pris avec donnees-a.json puis avec donnees-b.json, calque HTML SEUL masqué (le portrait, dessin, est
//         dans le rendu comparé), et les deux sont identiques pixel pour pixel ; rouge dès un pixel, en nommant la taille ou
//         la vue ; la page a demandé les données dans chacun de ces rendus (sinon la comparaison ne prouve rien) ; au bureau
//         (1440 et 1280, données a et b), chacun des 20 écrans existe une fois, est VISIBLE dans sa salle, dit « — » et n'a
//         aucun contenu CSS.
//   PN-7  4 personnages au moins, en marche et au poste, réellement dessinés (le décor diffère dans chaque cadre entre le
//         rendu normal et ?sans=personnages, et nulle part ailleurs) ; 1 portrait ; la nébuleuse (tout l'écran, non
//         uniforme) ; echelle.jpg : l'art d'un pack cité, octet pour octet, à l'échelle 1 ou k, à côté de t049.2 (octet pour
//         octet) ; vaisseau.jpg : 3 modules distincts et dessinés.
//   PN-8  les images servies à la planche (vue station, puis vue vaisseau, données a et b) pèsent 700 Ko au plus, l'atlas
//         déclaré compris ; aucune n'est une feuille brute du lot A (empreinte identique).
//   PN-9  les cinq captures sont celles que page.screenshot a rendues (empreinte relue), de 10 Ko à 1,5 Mo, écart type ≥ 4,
//         différentes deux à deux ; dans le source du juge, aucune image n'est écrite autrement que par page.screenshot.
// Aucun critère n'est vert sans avoir dit ce qu'il a mesuré : un ✅ sans détail est refusé (« ❌ PN-n vert sans mesure »).
// --temoin : le juge lance l'atelier réel ~/claw3d-pixel dans son état actuel (le prototype B, sa route /office/pixel2d,
// copie de l'arbre de travail sans .env*) et le capture aux trois tailles (sous .orchestre/travail/station-planche-qa/temoin-b/) :
// il prouve son harnais (PN-5 : lot A intact, piège chargé, toute sortie refusée et consignée — le prototype B en tente, ses
// polices Google : elles sont dites, pas rougies ; PN-9 : captures) sans exiger les critères de F0. --atelier ne désigne que
// l'atelier jugé par PN-1 à PN-9.
//
// Sortie : un en-tête, une ligne par critère (« ✅ PN-n … » ou « ❌ PN-n … »), puis « station-planche-qa --partie=planche :
// PASS|FAIL ». Code 0 seulement si tout est vert, 1 sinon, 2 si l'appel est invalide ou si un préalable manque (usine
// injoignable, atelier, lot A, t049.2 ou Chromium absents). N'écrit que sous .orchestre/travail/station-planche-qa/ (sur
// l'usine, plus le seul fichier des empreintes du lot A, dans celui de ~/presti) et, quand la racine est le dépôt, dans
// .orchestre/preuves/026-169/. Ne lit ni .env.local ni presti-secrets.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CE_FICHIER = fileURLToPath(import.meta.url)
const R = path.resolve(path.dirname(CE_FICHIER), '..')
const JUGE = 'station-planche-qa'
const NOM = `${JUGE} --partie=planche`
const TRAV = path.join(R, '.orchestre', 'travail', JUGE)
const PREUVES_F0 = path.join(R, '.orchestre', 'preuves', '026-169')
const FIXTURES = path.join(R, 'scripts', 'fixtures', '026-pilotage', 'p')
const MAISON = os.homedir()
const ATELIER_DEFAUT = path.join(MAISON, 'claw3d-pixel')
const STUDIO = path.join(MAISON, 'claw3d')
const LOT_A = path.join(MAISON, 'station-assets')
const T049 = path.join(MAISON, 'veille', '2026-09-24', 'images', 'trevsagents', 't049.2.jpg')
const DOCS = ['docs/station/planche.md', 'docs/station/grille.json', 'docs/station/licence-planche.json']
const [PLANCHE, GRILLE, LICENCE] = DOCS
const IDS = ['PN-1', 'PN-2', 'PN-3', 'PN-4', 'PN-5', 'PN-6', 'PN-7', 'PN-8', 'PN-9']
const ROUTE = '/office/planche'
const ROUTE_B = '/office/pixel2d'
const CHEMIN_DONNEES = '/office/planche/donnees.json'
const T0 = Date.parse('2026-09-25T12:00:00Z')
const POIDS_MAX = 700_000
const ENVOI_MAX = 30_000 // caractères de --envoi : la ligne de commande de Windows (32 767) porte aussi le reste de la relance
const CITE_RACINE = 'racine'
// Les 20 salles de SALLES (026-070, point 2 ; §3.2 de l'interface), dans cet ordre, et la réservée (décision 7 de Benj).
const SALLES = [
  ['commandement', 'Commandement'], ['reunion', 'Salle de réunion'], ['radar', 'Radar'], ['redaction', 'Rédaction'],
  ['envois', 'Salle des envois'], ['standard', 'Standard'], ['atelier', 'Atelier des maquettes'], ['usine', 'Usine à sites'],
  ['recettes', 'Recettes'], ['tresorerie', 'Trésorerie'], ['crieur', 'Tour du Crieur'], ['studio', 'Studio pubs'],
  ['experience', 'Salle Expérience'], ['machines', 'Salle des machines'], ['chantier', 'Chantier du code'],
  ['audience', 'Audience'], ['securite', 'Sécurité'], ['presti', 'Presti'], ['observatoire', 'Observatoire'],
  ['repos', 'Salle de repos'],
].map(([cle, plaque]) => ({ cle, plaque }))
const RESERVEE = { cle: 'ecommerce', plaque: 'E-COMMERCE · RÉSERVÉE' }
// Les trois tailles de la planche (§3.1 et §3.3 de l'interface).
const TAILLES = [
  { nom: 'bureau', l: 1440, h: 900, dpr: 1, k: '1440', mode: 'bureau', colonnes: [300, 340], barre: 80, bandeau: 44 },
  { nom: 'bureau-1280', l: 1280, h: 800, dpr: 1, k: '1280', mode: 'bureau', colonnes: [280, 320], barre: 80, bandeau: 44 },
  { nom: 'telephone', l: 390, h: 844, dpr: 3, k: '390', mode: 'portrait', colonnes: null, barre: 88, bandeau: 64, marge: 16 },
]
const CAPTURES_F0 = ['bureau', 'bureau-1280', 'telephone', 'echelle', 'vaisseau']
// PN-6 : les rendus comparés entre donnees-a.json et donnees-b.json (la vue station aux trois tailles, puis les deux autres).
const RENDUS_6 = ['bureau', 'bureau-1280', 'telephone', 'echelle', 'vaisseau']
// Ce que les licence.json du lot A disent de ne jamais montrer (logo Kenney, marque COKE, textes de la démo de Warped City,
// variantes gore de Ganamoda).
const INTERDITS_LOT_A = [/_logo-kenney/i, /banner-coke/i, /demo\/assets\/sprites\//i, /blood/i]

// ── Petites mains ───────────────────────────────────────────────────────────────────────────────────────────────────────
const ecrire = (t) => fs.writeSync(1, `${t}\n`)
const court = (t, n = 160) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
const posix = (p) => p.split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'
const ko = (n) => `${(n / 1000).toFixed(1).replace('.', ',')} Ko`
const norm = (s) => String(s ?? '').normalize('NFC').toLocaleUpperCase('fr-FR').replace(/\s+/g, ' ').trim()
function sous(parent, enfant) { const r = path.relative(parent, enfant); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)) }
/** Un chemin relatif sûr, en « / » : ni absolu, ni « . » ou « .. », ni lecteur, ni caractère interdit par Windows. */
const RE_SEGMENT = /^[^\\/:*?"<>|\x00-\x1f]+$/
const normRel = (v) => path.posix.normalize(String(v ?? '').split('\\').join('/')).replace(/\/+$/, '')
const relSur = (r) => typeof r === 'string' && r.length > 0 && r.length <= 300 && !r.startsWith('/') && r.split('/').every((s) => s && s !== '.' && s !== '..' && RE_SEGMENT.test(s))
// Les empreintes du lot A (PN-5) doivent survivre d'un passage à l'autre. Or le bac d'executer (~/bacs/<nom>) est recréé à
// chaque appel, son .orchestre/travail/ avec : gardées là, elles seraient toujours « du premier passage » et PN-5 ne
// comparerait jamais deux passages. Sur l'usine, elles vivent donc dans le .orchestre/travail/station-planche-qa/ du dépôt
// préparé (~/presti, que `usine.mjs preparer` tient à jour et qu'aucun bac n'efface) ; ailleurs, dans celui de la racine.
const DEPOT_USINE = path.join(MAISON, 'presti')
const SUR_USINE = process.platform === 'linux' && os.hostname() === 'presti-usine'
const EMPREINTES = SUR_USINE && fs.existsSync(path.join(DEPOT_USINE, '.orchestre'))
  ? path.join(DEPOT_USINE, '.orchestre', 'travail', JUGE, 'empreintes-lot-a.json')
  : path.join(TRAV, 'empreintes-lot-a.json')
/** Toute écriture du juge passe par ici : sous .orchestre/travail/station-planche-qa/, dans les preuves de 026-169, ou le
 *  seul fichier des empreintes du lot A (ci-dessus). */
function exigerEcriture(p) {
  if (!sous(TRAV, p) && !sous(PREUVES_F0, p) && path.resolve(p) !== path.resolve(EMPREINTES)) throw new Error(`écriture refusée hors de ${rel(TRAV)} et ${rel(PREUVES_F0)} : ${p}`)
  return p
}
function poserFichier(cible, contenu) { fs.mkdirSync(path.dirname(exigerEcriture(cible)), { recursive: true }); fs.writeFileSync(cible, contenu) }
function git(args, cwd, { env, binaire = false, entree } = {}) {
  const r = spawnSync('git', args, { cwd, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', ...env }, input: entree, encoding: binaire ? 'buffer' : 'utf8', maxBuffer: 1 << 30, windowsHide: true })
  return { code: r.status, stdout: r.stdout ?? '', stderr: String(r.stderr ?? ''), erreur: r.error ? premiereLigne(r.error) : null }
}

// ── Les verdicts ────────────────────────────────────────────────────────────────────────────────────────────────────────
const verdicts = new Map()
function noter(id, echecs, detail) {
  const v = verdicts.get(id) ?? { echecs: [], details: [] }
  v.echecs.push(...echecs.filter(Boolean))
  if (detail) v.details.push(detail)
  verdicts.set(id, v)
}
const ligne = (t) => String(t ?? '').replace(/\s*\r?\n\s*/g, ' · ').trim()
/** Une ligne par critère, dans l'ordre. Un critère sans échec mais sans détail (rien de mesuré n'a été dit) n'est PAS vert. */
function conclure(ids) {
  const rouges = []
  for (const id of ids) {
    const v = verdicts.get(id)
    if (!v) { rouges.push(id); ecrire(`❌ ${id} non évalué`); continue }
    const detail = ligne(v.details.join(' ; '))
    if (v.echecs.length) { rouges.push(id); ecrire(`❌ ${id} ${ligne(v.echecs.slice(0, 6).join(' ; ') + (v.echecs.length > 6 ? ` ; … (${v.echecs.length} défauts)` : ''))}`) }
    else if (!detail) { rouges.push(id); ecrire(`❌ ${id} vert sans mesure : aucun détail rendu (un ✅ doit dire ce qu'il a mesuré)`) }
    else ecrire(`✅ ${id} ${detail}`)
  }
  ecrire(rouges.length ? `${NOM} : FAIL — ${rouges.join(', ')}` : `${NOM} : PASS`)
  return rouges.length ? 1 : 0
}
/** PN-1 rouge : chacun des huit autres critères a sa ligne, puis le juge s'arrête (code 1). */
function arreterSurPN1(raison) {
  for (const id of IDS.slice(1)) noter(id, [`non évalué (PN-1 rouge : ${raison})`])
  process.exit(conclure(IDS))
}
const prealable = (m) => { ecrire(`${NOM} : préalable manquant — ${m} (code 2)`); process.exit(2) }

// ── Options ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const opt = { valeurs: {}, drapeaux: new Set(), inconnues: [] }
for (const a of process.argv.slice(2)) {
  const m = /^--([\w-]+)(?:=([\s\S]*))?$/.exec(a)
  if (!m) { opt.inconnues.push(a); continue }
  if (m[2] === undefined) opt.drapeaux.add(m[1]); else opt.valeurs[m[1]] = m[2]
  if (!['partie', 'racine', 'temoin', 'atelier', 'envoi'].includes(m[1]) || (m[1] === 'temoin') !== (m[2] === undefined)) opt.inconnues.push(court(a, 60))
}
const refuser = (m) => { ecrire(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (opt.inconnues.length) refuser(`option(s) inconnue(s) ou mal formée(s) : ${opt.inconnues.join(' ')}`)
if (opt.valeurs.partie !== 'planche') refuser(`--partie=planche attendue (reçu : ${opt.valeurs.partie ?? 'rien'}) ; les autres parties de la station sont à station-themes-qa (026-171) et station-ecran-qa (026-172)`)
const TEMOIN = opt.drapeaux.has('temoin')
if (opt.valeurs.envoi !== undefined && opt.valeurs.racine !== undefined) refuser('--envoi (posé par la relance) et --racine s’excluent')
if (opt.valeurs.envoi !== undefined && !SUR_USINE) refuser('--envoi est posé par la relance, sur l’usine seulement')
if (TEMOIN && (opt.valeurs.envoi !== undefined || opt.valeurs.racine !== undefined)) refuser('--temoin porte sur l’état actuel : ni --racine ni --envoi')
const atelierDemande = opt.valeurs.atelier
if (atelierDemande !== undefined && !atelierDemande) refuser('--atelier= vide')
if (atelierDemande && !path.isAbsolute(atelierDemande) && atelierDemande !== '~' && !atelierDemande.startsWith('~/') && atelierDemande.split(/[\\/]/).includes('..')) refuser(`--atelier=${atelierDemande} : « .. » refusé`)
/** L'atelier désigné : absolu, ~/…, ou relatif — à la racine jugée s'il y existe (l'atelier témoin du lot p, sabotable avec
 *  les documents), sinon au dépôt. Jamais le Studio Claw3D (~/claw3d, mode développement sans liste blanche : §0.5) ni un
 *  dossier qui le contient ou qu'il contient. */
function cheminAtelier(v, racine) {
  let A, sousRacine = false
  if (!v) A = ATELIER_DEFAUT
  else if (v === '~' || v.startsWith('~/')) A = path.join(MAISON, v.slice(2))
  else if (path.isAbsolute(v)) A = v
  else if (racine && fs.existsSync(path.join(racine, v))) { A = path.resolve(racine, v); sousRacine = true }
  else A = path.resolve(R, v)
  if (sous(STUDIO, A) || sous(A, STUDIO)) refuser(`--atelier=${v} désigne le Studio Claw3D (${STUDIO}) ou un dossier qui le contient : jamais le Studio, seul l'atelier ~/claw3d-pixel (ou une copie) se lance`)
  return { A, sousRacine }
}
cheminAtelier(atelierDemande, null) // le Studio est refusé dès l'appel, avant toute relance

// ── Les trois documents (PN-1 statique, sur le poste comme sur l'usine) ─────────────────────────────────────────────────
function lireDocs(racine) {
  const f = {}
  for (const d of DOCS) { try { f[d] = fs.readFileSync(path.join(racine, d), 'utf8') } catch { f[d] = null } }
  return f
}
function analyserDocs(f) {
  const e = []
  for (const d of DOCS) if (f[d] === null) e.push(`${d} absent`); else if (!f[d].trim()) e.push(`${d} vide`)
  if (e.length) return { erreurs: e }
  const m = /```planche[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/.exec(f[PLANCHE])
  const bloc = {}
  if (!m) e.push(`${PLANCHE} sans bloc \`\`\`planche (atelier, k.1440, k.1280, k.390, palette)`)
  else for (const l of m[1].split(/\r?\n/)) { const x = /^\s*([\w.]+)\s*:\s*(.*?)\s*$/.exec(l); if (x) bloc[x[1]] = x[2] }
  const atelier = bloc.atelier
  if (m && atelier !== CITE_RACINE && !/^[0-9a-f]{7,40}$/i.test(atelier ?? '')) e.push(`${PLANCHE} : « atelier: » ${atelier === undefined ? 'absent' : `« ${court(atelier, 50)} » mal formé`} (le sha du commit « f0-planche » de l'atelier, ou « ${CITE_RACINE} » pour un atelier non versionné posé dans la racine jugée)`)
  const k = {}
  if (m) for (const t of TAILLES) { const v = bloc[`k.${t.k}`]; if (!/^\d{1,3}$/.test(v ?? '') || Number(v) < 1) e.push(`${PLANCHE} : k.${t.k} ${v === undefined ? 'absent' : `« ${court(v, 20)} » n'est pas un entier ≥ 1`}`); else k[t.k] = Number(v) }
  if (m && bloc.palette === undefined) e.push(`${PLANCHE} : « palette: » absente du bloc`)
  const palette = [...new Set((bloc.palette ?? '').match(/#[0-9a-f]{6}\b/gi)?.map((x) => x.toLowerCase()) ?? [])]
  let grille = null, licence = null
  try { grille = JSON.parse(f[GRILLE]) } catch (err) { e.push(`${GRILLE} illisible : ${premiereLigne(err)}`) }
  try { licence = JSON.parse(f[LICENCE]) } catch (err) { e.push(`${LICENCE} illisible : ${premiereLigne(err)}`) }
  const obj = (x) => x && typeof x === 'object' && !Array.isArray(x)
  if (grille && !(obj(grille) && obj(grille.grille) && obj(grille.emplacements) && obj(grille.reserve) && grille.tuile !== undefined)) e.push(`${GRILLE} : tuile, grille, emplacements et reserve attendus`)
  if (licence && !(obj(licence) && Array.isArray(licence.packs))) e.push(`${LICENCE} : « packs » (une liste) attendu`)
  return { erreurs: e, atelier, k, palette, grille, licence, octets: DOCS.map((d) => Buffer.byteLength(f[d], 'utf8')) }
}

// ── L'envoi : les documents et l'atelier de la racine jugée, du poste vers l'usine ──────────────────────────────────────
const HORS_GEL = (r) => !/^(node_modules|\.next|\.git)(\/|$)/.test(r) && !/(^|\/)\.env/.test(r)
/** Les fichiers de l'atelier (hors node_modules, .next, .git et .env*) : [chemin, 'utf8' | 'base64', contenu]. */
function lireAtelier(A) {
  const fichiers = []
  let octets = 0
  const voir = (d, r) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rr = r ? `${r}/${e.name}` : e.name
      if (!HORS_GEL(rr)) continue
      if (e.isDirectory()) { voir(path.join(d, e.name), rr); continue }
      if (!e.isFile()) continue
      if (!relSur(rr)) prealable(`atelier ${A} : chemin « ${court(rr, 80)} » impossible à envoyer`)
      const b = fs.readFileSync(path.join(d, e.name))
      octets += b.length
      const texte = !b.includes(0) && Buffer.from(b.toString('utf8'), 'utf8').equals(b)
      fichiers.push([rr, texte ? 'utf8' : 'base64', texte ? b.toString('utf8') : b.toString('base64')])
    }
  }
  voir(A, '')
  if (!fichiers.length || fichiers.length > 300 || octets > 2_000_000) prealable(`atelier ${A} : ${fichiers.length} fichier(s), ${ko(octets)} — 1 à 300 fichiers et 2 Mo au plus pour partir avec la relance`)
  return fichiers
}
const encoderEnvoi = (docs, atelier) => zlib.gzipSync(Buffer.from(JSON.stringify({ docs, atelier }), 'utf8'), { level: 9 }).toString('base64url')
function decoderEnvoi(s) {
  if (!/^[\w-]{10,40000}$/.test(s)) refuser('--envoi mal formé (base64url attendu)')
  let x
  try { x = JSON.parse(zlib.gunzipSync(Buffer.from(s, 'base64url'), { maxOutputLength: 4_000_000 }).toString('utf8')) } catch (e) { refuser(`--envoi illisible : ${premiereLigne(e)}`) }
  const docs = x?.docs
  if (!docs || typeof docs !== 'object' || Object.keys(docs).some((k) => !DOCS.includes(k)) || Object.values(docs).some((v) => v !== null && typeof v !== 'string')) refuser('--envoi : seuls les trois documents de docs/station/ sont admis')
  for (const d of DOCS) if (!(d in docs)) docs[d] = null
  const a = x.atelier ?? null
  if (a !== null) {
    if (typeof a !== 'object' || !relSur(a.chemin) || !Array.isArray(a.fichiers) || !a.fichiers.length || a.fichiers.length > 300) refuser('--envoi : atelier mal formé ({ chemin, fichiers })')
    for (const f of a.fichiers) if (!Array.isArray(f) || f.length !== 3 || !relSur(f[0]) || !HORS_GEL(f[0]) || !['utf8', 'base64'].includes(f[1]) || typeof f[2] !== 'string') refuser(`--envoi : fichier d'atelier refusé (${court(JSON.stringify(f).slice(0, 80), 80)})`)
  }
  return { docs, atelier: a }
}
const empreinteCourte = (s) => sha256(s).slice(0, 12)

// ════════════════════════════════════════ Sur le poste ═══════════════════════════════════════════════════════════════
function relancer(args, rapatrier) {
  ecrire(`· ${JUGE} : ce poste (${os.hostname()}) n'est pas l'usine ; relance par scripts/usine.mjs executer, captures rapatriées sous ${rapatrier}`)
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'usine.mjs'), 'executer', '--nom=planche', '--delai=15', `--rapatrier=${rapatrier}`, '--', 'node', 'scripts/station-planche-qa.mjs', ...args], { cwd: R, stdio: 'inherit', windowsHide: true, timeout: 20 * 60_000 })
  if (r.error) prealable(`usine injoignable : ${premiereLigne(r.error)}`)
  if (r.status === 5) prealable('usine injoignable (usine.mjs : code 5)')
  if (r.status === null || [3, 124, 125].includes(r.status)) prealable(`verdict non rendu par l'usine (usine.mjs : ${r.status === null ? `signal ${r.signal}` : `code ${r.status}`})`)
  process.exit(r.status)
}
if (!SUR_USINE) {
  if (TEMOIN) {
    ecrire(`${NOM} --temoin — poste ${os.hostname()} : l'atelier réel ~/claw3d-pixel (prototype B) sera lancé et capturé sur l'usine`)
    relancer(['--partie=planche', '--temoin'], `.orchestre/travail/${JUGE}/temoin-b`)
  }
  const racine = opt.valeurs.racine !== undefined ? path.resolve(R, opt.valeurs.racine) : R
  const f = lireDocs(racine)
  ecrire(`${NOM} — poste ${os.hostname()}, racine ${rel(racine)}, atelier ${atelierDemande ?? '~/claw3d-pixel'}`)
  const d = analyserDocs(f)
  if (d.erreurs.length) { noter('PN-1', d.erreurs); arreterSurPN1('les documents de la planche manquent ou se lisent mal ; ni atelier ni navigateur lancés') }
  const at = cheminAtelier(atelierDemande, racine)
  ecrire(`· PN-1, partie statique, verte sur le poste (${DOCS.map((x, i) => `${path.basename(x)} ${d.octets[i]} o`).join(', ')}) ; l'atelier, le lot A et Chromium sont sur l'usine`)
  const args = ['--partie=planche', ...(atelierDemande !== undefined ? [`--atelier=${atelierDemande}`] : [])]
  if (path.resolve(racine) === path.resolve(R)) {
    for (const n of CAPTURES_F0) fs.rmSync(exigerEcriture(path.join(PREUVES_F0, `${n}.jpg`)), { force: true })
    relancer(args, '.orchestre/preuves/026-169')
  }
  const charge = encoderEnvoi(f, at.sousRacine ? { chemin: normRel(atelierDemande), fichiers: lireAtelier(at.A) } : null)
  if (charge.length > ENVOI_MAX) prealable(`les documents${at.sousRacine ? ' et l’atelier' : ''} de ${rel(racine)} font ${charge.length} caractères une fois compressés, ${ENVOI_MAX} au plus pour partir avec la relance`)
  if (at.sousRacine) ecrire(`· l'atelier ${posix(path.relative(racine, at.A))} est dans la racine jugée : il part avec les documents (--envoi, ${charge.length} caractères)`)
  relancer([...args, `--envoi=${charge}`], `.orchestre/travail/${JUGE}/captures-${empreinteCourte(charge)}`)
}

// ════════════════════════════════════════ Sur l'usine ════════════════════════════════════════════════════════════════
const requireR = createRequire(path.join(R, 'package.json'))
let sharp, chromium
try { sharp = requireR('sharp') } catch (e) { prealable(`sharp introuvable dans node_modules (${premiereLigne(e)})`) }
try { ({ chromium } = requireR('playwright-core')) } catch (e) { prealable(`playwright-core introuvable dans node_modules (${premiereLigne(e)})`) }
try { if (!fs.existsSync(chromium.executablePath())) prealable(`Chromium absent (${chromium.executablePath()}) : node scripts/usine.mjs preparer`) } catch (e) { prealable(`Chromium introuvable : ${premiereLigne(e)}`) }
if (!fs.existsSync(LOT_A) || !fs.readdirSync(LOT_A).some((d) => fs.existsSync(path.join(LOT_A, d, 'licence.json')))) prealable(`lot A absent (${LOT_A}, un licence.json par pack)`)

fs.mkdirSync(TRAV, { recursive: true })
const TMP = exigerEcriture(path.join(TRAV, 'tmp'))
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true })
process.env.TMPDIR = TMP // le profil jetable de Chromium et les fichiers temporaires restent sous .orchestre/travail/

// ── Le lot A : empreintes (PN-5) ─────────────────────────────────────────────────────────────────────────────────────
// Tout ~/station-assets sauf .venv/ (l'environnement Python du téléchargement, pas un dessin du lot A).
function empreintesLotA() {
  const m = {}
  const voir = (d, r) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const q = path.join(d, e.name), rr = r ? `${r}/${e.name}` : e.name
      if (!r && e.name === '.venv') continue
      if (e.isDirectory()) voir(q, rr)
      else if (e.isFile()) { const b = fs.readFileSync(q); m[rr] = `${b.length}:${sha256(b)}` }
      else m[rr] = `lien:${e.isSymbolicLink() ? fs.readlinkSync(q) : '?'}`
    }
  }
  voir(LOT_A, '')
  return m
}
function comparerEmpreintes(a, b) {
  const d = []
  for (const k of Object.keys(a)) if (!(k in b)) d.push(`retiré ${k}`); else if (a[k] !== b[k]) d.push(`modifié ${k}`)
  for (const k of Object.keys(b)) if (!(k in a)) d.push(`ajouté ${k}`)
  return d
}

// ── L'atelier : état (PN-1), gel d'un dossier non versionné, extraction ────────────────────────────────────────────────
function copierArbre(src, dest, garder) {
  const voir = (d, r) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rr = r ? `${r}/${e.name}` : e.name
      if (!garder(rr, e.isDirectory())) continue
      const q = path.join(d, e.name), cible = path.join(dest, ...rr.split('/'))
      if (e.isDirectory()) voir(q, rr)
      else if (e.isFile()) { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(q, cible) }
    }
  }
  voir(src, '')
}
function figer(A) {
  const dest = exigerEcriture(path.join(TRAV, 'gel-atelier'))
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(dest, { recursive: true })
  copierArbre(A, dest, (r) => HORS_GEL(r))
  const vide = exigerEcriture(path.join(TRAV, 'gitconfig-vide')); fs.writeFileSync(vide, '')
  const env = { GIT_AUTHOR_NAME: 'station-planche-qa', GIT_AUTHOR_EMAIL: 'juge@presti.invalid', GIT_AUTHOR_DATE: '2026-09-25T00:00:00Z', GIT_COMMITTER_NAME: 'station-planche-qa', GIT_COMMITTER_EMAIL: 'juge@presti.invalid', GIT_COMMITTER_DATE: '2026-09-25T00:00:00Z', GIT_CONFIG_GLOBAL: vide, GIT_CONFIG_NOSYSTEM: '1' }
  const c = ['-c', 'core.autocrlf=input', '-c', 'core.safecrlf=false', '-c', 'core.filemode=false', '-c', 'core.symlinks=false', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${path.join(dest, 'aucun-crochet')}`]
  for (const a of [['init', '-q'], ['add', '-A'], ['commit', '-q', '--no-verify', '--allow-empty', '-m', 'f0-planche']]) {
    const r = git([...c, ...a], dest, { env })
    if (r.code !== 0) throw new Error(`gel de l'atelier : git ${a[0]} → ${court(r.stderr || r.erreur, 120)}`)
  }
  return { depot: dest, sha: git(['rev-parse', 'HEAD'], dest).stdout.trim() }
}
/** PN-1, l'atelier : versionné (HEAD = le commit cité, « f0-planche », propre) ; ou non versionné, figé par le juge, et
 *  cité par son sha, ou par « racine » s'il est posé dans la racine jugée. */
function etatAtelier(A, cite, racine) {
  const e = []
  const top = git(['rev-parse', '--show-toplevel'], A)
  const versionne = top.code === 0 && fs.realpathSync(top.stdout.trim()) === fs.realpathSync(A)
  if (versionne) {
    const head = git(['rev-parse', 'HEAD'], A).stdout.trim()
    if (cite === CITE_RACINE) e.push(`planche.md cite « atelier: ${CITE_RACINE} », admis seulement pour un atelier non versionné posé dans la racine jugée ; ${A} est un dépôt git : citer le sha de son commit « f0-planche »`)
    else {
      const resolu = git(['rev-parse', '--verify', '--quiet', `${cite}^{commit}`], A)
      if (resolu.code !== 0) e.push(`le commit ${cite} que cite planche.md est introuvable dans l'atelier ${A}`)
      else if (resolu.stdout.trim() !== head) e.push(`l'atelier ${A} est au commit ${head.slice(0, 12)}, planche.md cite ${cite}`)
    }
    const sujet = git(['log', '-1', '--format=%s', head], A).stdout.trim()
    if (!/f0-planche/.test(sujet)) e.push(`le commit ${head.slice(0, 12)} de l'atelier s'intitule « ${court(sujet, 60)} », « f0-planche » attendu`)
    const st = git(['--no-optional-locks', 'status', '--porcelain', '--untracked-files=all'], A).stdout.split('\n').filter(Boolean)
    if (st.length) e.push(`git status de l'atelier n'est pas propre : ${st.length} entrée(s), dont « ${court(st[0], 60)} »`)
    return { e, versionne, depot: A, sha: head, sujet, cite }
  }
  const g = figer(A)
  if (cite === CITE_RACINE) { if (!racine || !sous(racine, A)) e.push(`planche.md cite « atelier: ${CITE_RACINE} », mais l'atelier ${A} n'est pas dans la racine jugée${racine ? ` (${racine})` : ''}`) }
  else if (!g.sha.startsWith(String(cite).toLowerCase())) e.push(`atelier ${rel(A)} non versionné, figé par le juge au commit ${g.sha.slice(0, 12)} (« f0-planche », métadonnées fixes) ; planche.md cite ${cite}`)
  return { e, versionne, depot: g.depot, sha: g.sha, sujet: 'f0-planche', cite }
}
/** Extrait le commit sous `dest` (git archive, lecture seule) ; node_modules de l'atelier en liens physiques. */
function extraire(depot, sha, dest, nodeModules) {
  exigerEcriture(dest)
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(dest, { recursive: true })
  const ar = git(['archive', '--format=tar', sha], depot, { binaire: true })
  if (ar.code !== 0) throw new Error(`git archive ${sha.slice(0, 12)} : ${court(ar.stderr, 120)}`)
  const x = spawnSync('tar', ['-x', '-C', dest], { input: ar.stdout, maxBuffer: 1 << 30 })
  if (x.status !== 0) throw new Error(`tar : ${court(String(x.stderr), 120)}`)
  lierNodeModules(nodeModules, dest)
}
function lierNodeModules(source, dest) {
  if (!source || !fs.existsSync(path.join(source, 'node_modules'))) return
  const r = spawnSync('cp', ['-al', path.join(source, 'node_modules'), path.join(dest, 'node_modules')])
  if (r.status !== 0) throw new Error(`cp -al node_modules : ${court(String(r.stderr), 120)}`)
}
/** Copie de l'arbre de travail (suivis et non suivis non ignorés, sans .env*) : l'état actuel, pour --temoin. */
function copierEtatActuel(A, dest) {
  exigerEcriture(dest)
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(dest, { recursive: true })
  const l = git(['ls-files', '-co', '--exclude-standard', '-z'], A)
  if (l.code !== 0) throw new Error(`git ls-files dans ${A} : ${court(l.stderr, 120)}`)
  let n = 0
  for (const f of l.stdout.split('\0').filter(Boolean)) {
    if (/(^|\/)\.env/.test(f) || /^node_modules\//.test(f)) continue
    const s = path.join(A, f)
    let st; try { st = fs.lstatSync(s) } catch { continue }
    if (!st.isFile()) continue
    fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true }); fs.copyFileSync(s, path.join(dest, f)); n++
  }
  lierNodeModules(A, dest)
  return n
}

// ── Le serveur de l'atelier ──────────────────────────────────────────────────────────────────────────────────────────────
const PIEGE = String.raw`// Piège réseau de station-planche-qa, chargé dans l'atelier par NODE_OPTIONS=--import : hors de la boucle locale,
// fetch et net.Socket#connect sont refusés et consignés dans PLANCHE_PIEGE_JOURNAL.
import fs from 'node:fs'
import net from 'node:net'
const J = process.env.PLANCHE_PIEGE_JOURNAL
const noter = (q) => { try { if (J) fs.appendFileSync(J, process.pid + ' ' + q + '\n') } catch { /* journal indisponible */ } }
noter('charge')
const local = (h) => { const x = String(h ?? '').replace(/^\[|\]$/g, '').toLowerCase(); return x === '127.0.0.1' || x === 'localhost' || x === '::1' || x === '::ffff:127.0.0.1' }
const origine = globalThis.fetch
if (typeof origine === 'function') globalThis.fetch = function (entree, init) {
  let hote = '?'
  try { hote = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url).hostname } catch { /* illisible */ }
  if (!local(hote)) { noter('fetch ' + String(entree && entree.url ? entree.url : entree).slice(0, 200)); return Promise.reject(new Error('réseau interdit hors 127.0.0.1 (station-planche-qa) : ' + hote)) }
  return origine.call(this, entree, init)
}
const connecter = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const a = Array.isArray(args[0]) ? args[0][0] : args[0]
  let hote = null
  if (a && typeof a === 'object') { if (a.path) return connecter.apply(this, args); hote = a.host ?? 'localhost' }
  else if (typeof a === 'number' || /^\d+$/.test(String(a))) hote = typeof args[1] === 'string' ? args[1] : 'localhost'
  else return connecter.apply(this, args)
  if (!local(hote)) { noter('connect ' + hote); const e = new Error('réseau interdit hors 127.0.0.1 (station-planche-qa) : ' + hote); process.nextTick(() => this.destroy(e)); return this }
  return connecter.apply(this, args)
}
`
const portLibre = () => new Promise((ok, ko) => { const s = net.createServer(); s.unref(); s.on('error', ko); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)) }) })
async function lancerAtelier(dossier, route, nom) {
  const port = await portLibre()
  const piege = exigerEcriture(path.join(TRAV, 'piege-atelier.mjs')); fs.writeFileSync(piege, PIEGE)
  const journal = exigerEcriture(path.join(TRAV, `piege-${nom}.log`)); fs.writeFileSync(journal, '')
  const log = exigerEcriture(path.join(TRAV, `serveur-${nom}.log`))
  const fd = fs.openSync(log, 'w')
  const env = {
    PATH: process.env.PATH, HOME: MAISON, LANG: 'C.UTF-8', TMPDIR: TMP, HOST: '127.0.0.1', PORT: String(port),
    CUSTOM_RUNTIME_ALLOWLIST: 'aucun.invalid', NEXT_TELEMETRY_DISABLED: '1', PLANCHE_PIEGE_JOURNAL: journal,
    NODE_OPTIONS: `--import=${pathToFileURL(piege).href}`,
    ...(process.env.USINE_EXECUTER_RUN ? { USINE_EXECUTER_RUN: process.env.USINE_EXECUTER_RUN } : {}),
  }
  const enfant = spawn(process.execPath, ['server/index.js', '--dev'], { cwd: dossier, env, detached: true, stdio: ['ignore', fd, fd] })
  fs.closeSync(fd)
  let fini = null
  enfant.on('exit', (code, signal) => { fini = { code, signal } })
  const arreter = async () => {
    if (fini) return
    try { process.kill(-enfant.pid, 'SIGTERM') } catch { /* déjà parti */ }
    for (let i = 0; i < 40 && !fini; i++) await new Promise((r) => setTimeout(r, 200))
    try { process.kill(-enfant.pid, 'SIGKILL') } catch { /* parti */ }
  }
  process.on('exit', () => { try { process.kill(-enfant.pid, 'SIGKILL') } catch { /* parti */ } })
  const t0 = Date.now()
  for (;;) {
    if (fini) throw new Error(`le serveur de l'atelier s'est arrêté (code ${fini.code ?? fini.signal}) : ${court(fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).slice(-3).join(' · '), 240)}`)
    try { const r = await fetch(`http://127.0.0.1:${port}${route}`, { redirect: 'manual', signal: AbortSignal.timeout(120_000) }); await r.arrayBuffer().catch(() => {}); if (r.status < 500) break } catch { /* pas encore prêt */ }
    if (Date.now() - t0 > 300_000) { await arreter(); throw new Error(`l'atelier ne répond pas sur 127.0.0.1:${port}${route} après 300 s`) }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return { port, arreter, journal, log, pret: (Date.now() - t0) / 1000 }
}

// ── Le navigateur ────────────────────────────────────────────────────────────────────────────────────────────────────────
// Les masques du juge (visibility forcée sur l'élément ET ses descendants : un enfant en « visibility: visible » ne
// traverse pas le masque) et la sonde (pointer-events forcé à auto, le temps de MESURER, pour que elementFromPoint dise
// ce qui est peint par-dessus une plaque ou un écran, même dans un calque en pointer-events: none).
const STYLE_MASQUES = `
html.pn-html [data-planche="html"], html.pn-html [data-planche="html"] *, html.pn-html [data-planche="portrait"] { visibility: hidden !important }
html.pn-cadre [data-planche="barre"], html.pn-cadre [data-planche="colonne-gauche"], html.pn-cadre [data-planche="colonne-droite"], html.pn-cadre [data-planche="bandeau"],
html.pn-cadre [data-planche="barre"] *, html.pn-cadre [data-planche="colonne-gauche"] *, html.pn-cadre [data-planche="colonne-droite"] *, html.pn-cadre [data-planche="bandeau"] * { visibility: hidden !important }
html.pn-neb [data-planche="nebuleuse"], html.pn-neb [data-planche="nebuleuse"] * { visibility: hidden !important }
html.pn-neb, html.pn-neb * { background: transparent !important; box-shadow: none !important }
html.pn-decor [data-planche="decor"] { visibility: hidden !important }
html.pn-texte [data-planche="html"], html.pn-texte [data-planche="html"] * { visibility: hidden !important }
html.pn-sonde, html.pn-sonde * { pointer-events: auto !important }
`
// Lu dans la page (page.evaluate) : la mise en page, les zones, et pour chaque plaque et chaque écran de quoi dire s'il se
// VOIT (PN-2, PN-6) — pas seulement son textContent.
const MESURER = () => {
  const doc = document.documentElement
  const q = (s) => document.querySelector(`[data-planche="${s}"]`)
  const boite = (el) => {
    if (!el) return null
    const b = el.getBoundingClientRect(), cs = getComputedStyle(el)
    return { x: b.left, y: b.top, l: b.width, h: b.height, visible: cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0, texte: (el.textContent || '').trim(), medias: el.querySelectorAll('img,canvas,svg,video,picture,iframe,object,embed').length, balise: el.tagName.toLowerCase() }
  }
  const img = (el) => el && el.tagName === 'IMG' ? { ...boite(el), src: el.currentSrc || el.src, nl: el.naturalWidth, nh: el.naturalHeight } : (el ? { ...boite(el), src: null } : null)
  const alpha = (c) => { const m = /rgba?\(([^)]*)\)/.exec(String(c || '')); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length >= 4 ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1 }
  const nomDe = (x) => x ? `<${x.tagName.toLowerCase()}${['data-planche', 'data-salle', 'data-plaque', 'data-ecran'].filter((a) => x.hasAttribute(a)).map((a) => ` ${a}${x.getAttribute(a) ? `="${x.getAttribute(a)}"` : ''}`).join('')}>` : 'rien'
  const voir = (el, zone) => {
    const b = el.getBoundingClientRect(), cs = getComputedStyle(el)
    let opacite = 1
    for (let x = el; x; x = x.parentElement) opacite *= Number(getComputedStyle(x).opacity)
    const rg = document.createRange(); rg.selectNodeContents(el)
    const textes = [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
    const texteDansBoite = textes.some((r) => Math.min(r.right, b.right) - Math.max(r.left, b.left) > 0 && Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top) > 0)
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2
    const touche = b.width > 0 && b.height > 0 && cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight ? document.elementFromPoint(cx, cy) : null
    const auCentre = !!touche && (touche === el || el.contains(touche))
    const zb = zone ? zone.getBoundingClientRect() : null
    return {
      x: b.left, y: b.top, l: b.width, h: b.height, display: cs.display, visibility: cs.visibility, opacite,
      police: parseFloat(cs.fontSize) || 0, couleur: Math.min(alpha(cs.color), alpha(cs.webkitTextFillColor || cs.color)),
      clip: cs.clipPath && cs.clipPath !== 'none' ? cs.clipPath : null,
      verifie: typeof el.checkVisibility === 'function' ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true,
      texteDansBoite, auCentre, touche: auCentre ? null : nomDe(touche),
      zone: !!zb, dansZone: !!zb && b.left >= zb.left - 0.5 && b.top >= zb.top - 0.5 && b.right <= zb.right + 0.5 && b.bottom <= zb.bottom + 0.5,
      pseudo: ['::before', '::after'].map((p) => getComputedStyle(el, p).content).filter((c) => c && !['none', 'normal', '""', "''"].includes(c)),
    }
  }
  const zones = [...document.querySelectorAll('[data-salle]')]
  const zoneDe = (cle) => zones.find((z) => z.getAttribute('data-salle') === cle) ?? null
  const cadres = ['barre', 'colonne-gauche', 'colonne-droite', 'bandeau'].map(q).filter(Boolean)
  const portrait = q('portrait')
  doc.classList.add('pn-sonde')
  try {
    return {
      vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth,
      barre: boite(q('barre')), gauche: boite(q('colonne-gauche')), droite: boite(q('colonne-droite')), bandeau: boite(q('bandeau')),
      nebuleuse: boite(q('nebuleuse')), decor: boite(q('decor')), portrait: boite(portrait),
      portraitDansUnCadre: !!portrait && cadres.some((c) => c.contains(portrait)),
      zones: zones.map((z) => ({ cle: z.getAttribute('data-salle'), ...boite(z), porte: z.getAttribute('data-porte'), poste: z.getAttribute('data-poste'), plaques: [...z.querySelectorAll('[data-plaque]')].map((p) => ({ texte: (p.textContent || '').trim(), vue: voir(p, z) })), ecrans: [...z.querySelectorAll('[data-ecran]')].map((p) => p.getAttribute('data-ecran')) })),
      plaques: [...document.querySelectorAll('[data-plaque]')].map((p) => (p.textContent || '').trim()),
      ecrans: [...document.querySelectorAll('[data-ecran]')].map((p) => { const cle = p.getAttribute('data-ecran'); return { cle, texte: (p.textContent || '').trim(), vue: voir(p, zoneDe(cle)) } }),
      echellePack: img(q('echelle-pack')), echelleRef: img(q('echelle-ref')),
      miroir: (() => { try { return JSON.parse(JSON.stringify(window.__planche ?? null)) } catch { return null } })(),
    }
  } finally { doc.classList.remove('pn-sonde') }
}
/** Pourquoi une plaque ou un écran ne se voit pas (liste vide : il se voit). */
function defautsVue(v) {
  if (!v) return ['introuvable']
  const d = []
  if (v.display === 'none' || !(v.l > 0 && v.h > 0)) d.push(`boîte nulle (display ${v.display}, ${Number(v.l).toFixed(1)}×${Number(v.h).toFixed(1)})`)
  if (v.visibility !== 'visible') d.push(`visibility ${v.visibility}`)
  if (!(v.opacite > 0)) d.push(`opacité ${v.opacite}`)
  if (!(v.police > 0)) d.push(`font-size ${v.police}px`)
  if (!(v.couleur > 0)) d.push('couleur du texte transparente')
  if (v.clip) d.push(`clip-path ${court(v.clip, 30)}`)
  if (!v.verifie) d.push('checkVisibility() faux')
  if (!v.texteDansBoite) d.push('texte hors de sa boîte')
  if (!v.auCentre) d.push(`${v.touche === 'rien' ? 'centre hors de l’écran' : `couvert au centre par ${v.touche}`}`)
  if (!v.dansZone) d.push(v.zone ? 'hors de sa zone' : 'sans zone')
  return d
}
const estLocal = (u, port) => { try { const x = new URL(u); return x.hostname === '127.0.0.1' && Number(x.port) === port } catch { return false } }
async function ouvrir(nav, port, taille, { route = ROUTE, vue = 'station', sans = false, donnees = 'a', planche = true } = {}) {
  const contexte = await nav.newContext({ viewport: { width: taille.l, height: taille.h }, deviceScaleFactor: taille.dpr, isMobile: taille.dpr > 1, hasTouch: taille.dpr > 1, serviceWorkers: 'block', bypassCSP: true })
  const trace = { externes: [], donnees: 0, images: [], attentes: [], erreurs: [] }
  await contexte.route('**/*', async (r) => {
    const u = r.request().url()
    let x = null
    try { x = new URL(u) } catch { /* illisible */ }
    if (x && (x.protocol === 'data:' || x.protocol === 'blob:')) return r.continue()
    if (!x || !estLocal(u, port)) { trace.externes.push(court(u, 100)); return r.abort('blockedbyclient') }
    if (x.pathname === CHEMIN_DONNEES) { trace.donnees++; return r.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: DONNEES[donnees], headers: { 'cache-control': 'no-store' } }) }
    return r.continue()
  })
  await contexte.routeWebSocket((u) => !estLocal(String(u).replace(/^ws/, 'http'), port), (ws) => { trace.externes.push(`websocket ${court(ws.url(), 90)}`); ws.close() })
  contexte.on('response', (resp) => {
    trace.attentes.push((async () => {
      const u = resp.url()
      if (!estLocal(u, port)) return
      const type = String(resp.headers()['content-type'] || '').toLowerCase()
      const p = new URL(u).pathname
      if (!/^image\//.test(type) && !/\.(png|webp|avif|jpe?g|gif)$/i.test(p)) return
      const corps = await resp.body().catch(() => null)
      if (corps) trace.images.push({ chemin: p, octets: corps.length, sha: sha256(corps) })
    })().catch(() => {}))
  })
  if (planche) await contexte.clock.install({ time: T0 })
  else await contexte.addInitScript(() => { try { localStorage.setItem('claw3d:onboarding:completed', 'true') } catch { /* stockage fermé */ } })
  const page = await contexte.newPage()
  page.on('pageerror', (e) => trace.erreurs.push(court(String(e), 140)))
  const url = `http://127.0.0.1:${port}${route}${planche ? `?vue=${vue}${sans ? '&sans=personnages' : ''}` : ''}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 240_000 })
  if (planche) {
    await page.waitForFunction(() => window.__planche && window.__planche.pret === true, null, { timeout: 180_000 })
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {})
    await page.clock.pauseAt(T0 + 10 * 60_000)
    await page.clock.runFor(250)
    await page.addStyleTag({ content: STYLE_MASQUES })
  } else {
    await page.waitForSelector('canvas', { state: 'attached', timeout: 240_000 })
    await page.waitForTimeout(4000)
  }
  await page.waitForTimeout(300)
  await Promise.all(trace.attentes)
  const masquer = async (classes = []) => { await page.evaluate((c) => { for (const x of ['pn-html', 'pn-cadre', 'pn-neb', 'pn-decor', 'pn-texte']) document.documentElement.classList.toggle(x, c.includes(x)) }, classes); await page.waitForTimeout(120) }
  const cliche = (o) => page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide', ...o })
  // Une capture de mesure est STABLE : deux clichés successifs identiques, octet pour octet. L'horloge de la page est figée,
  // rien n'y bouge plus ; seule la rastérisation peut encore courir. Sous charge, le premier cliché d'une page à 390×844 en
  // densité 3 a précédé celle de ses tuiles : 187 425 pixels d'écart entre deux rendus du même atelier (28/09), que PN-6
  // prenait pour une donnée. Instable après 9 clichés : le passage s'arrête (rien n'est mesuré sur un rendu qui bouge).
  const png = async (o = {}) => {
    let avant = await cliche(o)
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(100 + 50 * i)
      const apres = await cliche(o)
      if (apres.equals(avant)) return apres
      avant = apres
    }
    throw new Error(`rendu instable : 9 clichés successifs différents (${url}, horloge figée)`)
  }
  const mesurer = () => page.evaluate(MESURER)
  const fermer = async () => { await Promise.all(trace.attentes); await contexte.close().catch(() => {}) }
  return { page, trace, masquer, png, mesurer, fermer, url }
}
// Les images écrites par le juge : toutes, et seulement elles, sortent de page.screenshot (PN-9 relit leur empreinte).
const ECRITES = new Map()
async function capturerJpeg(page, dossier, nom) {
  const f = exigerEcriture(path.join(dossier, `${nom}.jpg`))
  fs.rmSync(f, { force: true })
  const buf = await page.screenshot({ path: f, type: 'jpeg', quality: 80, animations: 'disabled', caret: 'hide' })
  ECRITES.set(nom, { fichier: f, sha: sha256(buf) })
  return f
}

// ── Les mesures d'image ──────────────────────────────────────────────────────────────────────────────────────────────
async function brut(buf) { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, l: info.width, h: info.height } }
async function ecartType(entree, zone = null) {
  let s = sharp(entree)
  if (zone) s = s.extract({ left: Math.round(zone.x), top: Math.round(zone.y), width: Math.max(1, Math.round(zone.l)), height: Math.max(1, Math.round(zone.h)) })
  const st = await s.flatten({ background: '#000000' }).greyscale().stats()
  return st.channels[0].stdev
}
async function vignette(entree, zone = null) {
  let s = sharp(entree)
  if (zone) s = s.extract({ left: Math.round(zone.x), top: Math.round(zone.y), width: Math.max(1, Math.round(zone.l)), height: Math.max(1, Math.round(zone.h)) })
  return s.flatten({ background: '#000000' }).greyscale().resize(32, 32, { fit: 'fill' }).raw().toBuffer()
}
const ecartMoyen = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length }
function blocsNonUniformes(img, k) {
  let mauvais = 0, total = 0
  for (let by = 0; by + k <= img.h; by += k) {
    for (let bx = 0; bx + k <= img.l; bx += k) {
      total++
      const o = (by * img.l + bx) * 4
      let ok = true
      for (let y = 0; y < k && ok; y++) for (let x = 0; x < k; x++) { const p = ((by + y) * img.l + bx + x) * 4; if (img.data[p] !== img.data[o] || img.data[p + 1] !== img.data[o + 1] || img.data[p + 2] !== img.data[o + 2] || img.data[p + 3] !== img.data[o + 3]) { ok = false; break } }
      if (!ok) mauvais++
    }
  }
  return { mauvais, total }
}
function horsPalette(img, palette) {
  const ens = new Set(palette.map((h) => parseInt(h.slice(1), 16)))
  const hors = new Map()
  let semi = 0, opaques = 0
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3]
    if (a === 0) continue
    if (a !== 255) { semi++; continue }
    opaques++
    const c = (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]
    if (!ens.has(c)) hors.set(c, (hors.get(c) ?? 0) + 1)
  }
  return { hors, semi, opaques }
}
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`
function pixelsDifferents(a, b, dedans = null) { return ecartPixels(a, b, dedans).n }
/** Les pixels qui diffèrent entre deux images de même taille : nombre, boîte englobante (pixels de l'image), écart maximal
 *  sur un canal. */
function ecartPixels(a, b, dedans = null) {
  let n = 0, max = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.l; x++) {
    if (dedans && !dedans(x, y)) continue
    const p = (y * a.l + x) * 4
    const d = Math.max(Math.abs(a.data[p] - b.data[p]), Math.abs(a.data[p + 1] - b.data[p + 1]), Math.abs(a.data[p + 2] - b.data[p + 2]), Math.abs(a.data[p + 3] - b.data[p + 3]))
    if (!d) continue
    n++
    if (d > max) max = d
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  return { n, max, boite: n ? `${x0},${y0} ${x1 - x0 + 1}×${y1 - y0 + 1}` : '' }
}
const pres = (a, b, t = 0.51) => Math.abs(a - b) <= t
const entier = (v) => Math.abs(v - Math.round(v)) < 0.01
const rectDe = (b) => b ? `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.l)}×${Math.round(b.h)}` : 'absent'
const chevauche = (a, b) => a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.h && b.y < a.y + a.h
const rectOk = (r) => r && typeof r === 'object' && ['x', 'y', 'l', 'h'].every((c) => Number.isInteger(r[c])) && r.l > 0 && r.h > 0 && r.x >= 0 && r.y >= 0

// ── Les contrôles statiques de grille.json (PN-2, PN-3), de la palette (PN-4) et des licences (PN-5) ──────────────────
function controlerGrille(g, k) {
  const e2 = [], e3 = []
  const t = g.tuile
  if (!Number.isInteger(t) || t < 1) e3.push(`grille.json : tuile ${JSON.stringify(t)}, un entier ≥ 1 attendu`)
  for (const m of ['bureau', 'portrait']) {
    const x = g.grille?.[m]
    if (!x || !Number.isInteger(x.l) || !Number.isInteger(x.h) || x.l < 1 || x.h < 1) e3.push(`grille.json : grille.${m} {l,h} en entiers attendue`)
    else if (Number.isInteger(t) && t > 0 && (x.l % t || x.h % t)) e3.push(`grille.json : grille.${m} ${x.l}×${x.h} n'est pas un multiple de la tuile ${t}`)
  }
  const cles = Object.keys(g.emplacements ?? {})
  const manquent = SALLES.filter((s) => !cles.includes(s.cle)).map((s) => s.cle), enTrop = cles.filter((c) => !SALLES.some((s) => s.cle === c))
  if (manquent.length) e2.push(`grille.json : emplacements sans ${manquent.join(', ')}`)
  if (enTrop.length) e2.push(`grille.json : emplacements en trop (${enTrop.join(', ')}) — la réservée va dans « reserve »`)
  const b = g.grille?.bureau
  const tous = [...SALLES.filter((s) => cles.includes(s.cle)).map((s) => [s.cle, g.emplacements[s.cle]]), ['reserve', g.reserve]]
  for (const [c, r] of tous) {
    if (!rectOk(r)) { e2.push(`grille.json : ${c} ${JSON.stringify(r)}, {x,y,l,h} entiers attendus`); continue }
    if (b && Number.isInteger(b.l) && (r.x + r.l > b.l || r.y + r.h > b.h)) e2.push(`grille.json : ${c} déborde de la grille bureau ${b.l}×${b.h}`)
  }
  for (let i = 0; i < tous.length; i++) for (let j = i + 1; j < tous.length; j++) if (rectOk(tous[i][1]) && rectOk(tous[j][1]) && chevauche(tous[i][1], tous[j][1])) e2.push(`grille.json : ${tous[i][0]} et ${tous[j][0]} se chevauchent`)
  for (const tl of TAILLES) if (!Number.isInteger(k[tl.k])) e3.push(`planche.md : k.${tl.k} absent`)
  return { e2, e3 }
}
function controlerLicences(licence) {
  const e = [], packs = []
  const vus = new Set()
  if (!licence.packs.length) e.push('licence-planche.json : aucun pack cité')
  for (const [i, p] of licence.packs.entries()) {
    const d = p?.dossier
    if (typeof d !== 'string' || !/^\d\d-[\w.-]+$/.test(d)) { e.push(`pack ${i + 1} : dossier ${JSON.stringify(d)} (un dossier du lot A attendu)`); continue }
    if (vus.has(d)) e.push(`pack ${d} cité deux fois`)
    vus.add(d)
    const fl = path.join(LOT_A, d, 'licence.json')
    let lj = null
    try { lj = JSON.parse(fs.readFileSync(fl, 'utf8')) } catch { e.push(`pack ${d} : hors du lot A (${d}/licence.json introuvable dans ~/station-assets)`); continue }
    for (const [cle, source] of [['titre', 'titre'], ['auteur', 'auteur'], ['adresse', 'page'], ['licence', 'licence'], ['date', 'date']]) if (p[cle] !== lj[source]) e.push(`pack ${d} : ${cle} « ${court(p[cle], 50)} », le licence.json dit « ${court(lj[source], 50)} »`)
    if (!/\bCC0\b/.test(String(lj.licence))) e.push(`pack ${d} : licence « ${lj.licence} », CC0 attendu`)
    if (p.licence_json !== `~/station-assets/${d}/licence.json`) e.push(`pack ${d} : licence_json « ${court(p.licence_json, 60)} », « ~/station-assets/${d}/licence.json » attendu`)
    if (!Array.isArray(p.fichiers) || !p.fichiers.length) e.push(`pack ${d} : fichiers (la liste des fichiers du pack utilisés) vide ou absente`)
    for (const f of Array.isArray(p.fichiers) ? p.fichiers : []) {
      if (typeof f !== 'string' || !f || path.isAbsolute(f) || f.split(/[\\/]/).includes('..')) { e.push(`pack ${d} : fichier ${JSON.stringify(f)} refusé`); continue }
      if (INTERDITS_LOT_A.some((re) => re.test(f))) e.push(`pack ${d} : ${f} est à ne jamais montrer (son licence.json le dit)`)
      let st = null
      try { st = fs.statSync(path.join(LOT_A, d, f)) } catch { /* absent */ }
      if (!st || !st.isFile()) e.push(`pack ${d} : ${court(f, 70)} absent du pack`)
    }
    packs.push(d)
  }
  return { e, packs }
}

// ── Les jeux d'essai servis à l'atelier (PN-6) ──────────────────────────────────────────────────────────────────────
const DONNEES = {}
for (const x of ['a', 'b']) {
  const f = path.join(FIXTURES, `donnees-${x}.json`)
  try { DONNEES[x] = fs.readFileSync(f, 'utf8'); JSON.parse(DONNEES[x]) } catch (e) { prealable(`${rel(f)} illisible (${premiereLigne(e)})`) }
}
if (DONNEES.a === DONNEES.b) prealable('donnees-a.json et donnees-b.json sont identiques : PN-6 ne prouverait rien')

// ── PN-9 : les captures (commun à la planche et au témoin) ──────────────────────────────────────────────────────────
async function juger9(noms, dossier) {
  const e = [], vues = []
  const source = fs.readFileSync(CE_FICHIER, 'utf8')
  // Aucune image écrite autrement que par page.screenshot : ni écriture, ni copie, ni renommage d'un .jpg/.png/.webp.
  const autres = source.split('\n').filter((l) => /\b(writeFileSync|writeFile|copyFileSync|copyFile|cpSync|renameSync|rename|createWriteStream|linkSync|symlinkSync)\s*\(/.test(l) && /\.(jpe?g|png|webp)\b|jpg`|\.jpg|image/i.test(l) && !/^\s*\/\//.test(l))
  if (autres.length) e.push(`le source du juge écrit une image autrement que par page.screenshot : « ${court(autres[0], 90)} »`)
  if (!/page\.screenshot\(\{ path: f, type: 'jpeg'/.test(source)) e.push('le source du juge n’a plus sa capture page.screenshot({ path: f, type: \'jpeg\' … })')
  const vign = []
  for (const n of noms) {
    const f = path.join(dossier, `${n}.jpg`)
    const w = ECRITES.get(n)
    let buf = null
    try { buf = fs.readFileSync(f) } catch { /* absent */ }
    if (!buf) { e.push(`${n}.jpg absent de ${rel(dossier)}`); continue }
    if (!w) { e.push(`${n}.jpg n'a pas été rendu par page.screenshot pendant ce passage`); continue }
    if (sha256(buf) !== w.sha) { e.push(`${n}.jpg : l'empreinte relue n'est pas celle que page.screenshot a rendue`); continue }
    if (buf.length < 10_000 || buf.length > 1_500_000) e.push(`${n}.jpg : ${ko(buf.length)}, de 10 Ko à 1,5 Mo attendu`)
    const et = await ecartType(buf)
    if (!(et >= 4)) e.push(`${n}.jpg : écart type ${et.toFixed(2)}, 4 au moins (image uniforme)`)
    vign.push([n, await vignette(buf)])
    const md = await sharp(buf).metadata()
    vues.push(`${n}.jpg ${md.width}×${md.height} ${ko(buf.length)} σ ${et.toFixed(1)}`)
  }
  for (let i = 0; i < vign.length; i++) for (let j = i + 1; j < vign.length; j++) { const d = ecartMoyen(vign[i][1], vign[j][1]); if (d < 2) e.push(`${vign[i][0]}.jpg et ${vign[j][0]}.jpg se ressemblent trop (écart moyen ${d.toFixed(2)} sur 32×32, 2 au moins)`) }
  noter('PN-9', e, vues.length ? `${vues.length} capture(s) prise(s) par page.screenshot et relues octet pour octet dans ${rel(dossier)} : ${vues.join(', ')} ; différentes deux à deux ; aucune autre écriture d'image dans le source du juge` : '')
}

// ── Le réseau et le lot A (PN-5, commun) ────────────────────────────────────────────────────────────────────────────
// La seule sortie tolérée, et refusée quand même par le piège : la sonde de version de `next dev` (mode webpack de Claw3D :
// hot-reloader-webpack.js l'appelle à chaque démarrage, sans variable pour l'éteindre). Liste fermée, égalité exacte.
const SONDES_TOLEREES = ['fetch https://registry.npmjs.org/-/package/next/dist-tags']
/** PN-5, réseau. En F0, toute tentative de l'atelier (hors SONDES_TOLEREES) ou du navigateur est rouge. En --temoin (le
 *  prototype B, que F0 remplacera), les tentatives refusées sont consignées sans rougir : le témoin prouve que le verrou tient.
 *  Dans les deux cas, le piège doit s'être signalé (« charge ») : sans cela, rien ne prouve que la boucle locale était fermée. */
function juger5Reseau(pages, atelier, { temoin = false } = {}) {
  const e = []
  const externes = [...new Set(pages.flatMap((p) => p.trace.externes))]
  const lignes = (() => { try { return fs.readFileSync(atelier.journal, 'utf8').split('\n').filter(Boolean).map((l) => l.replace(/^\d+ /, '')) } catch { return null } })()
  const charges = (lignes ?? []).filter((l) => l === 'charge').length
  if (!charges) e.push(`le piège réseau ne s'est pas chargé dans l'atelier (${rel(atelier.journal)} sans « charge ») : rien ne prouve que la boucle locale était fermée`)
  const tentatives = (lignes ?? []).filter((l) => l !== 'charge')
  const tolerees = tentatives.filter((l) => SONDES_TOLEREES.includes(l)), autres = tentatives.filter((l) => !SONDES_TOLEREES.includes(l))
  const compte = (l) => [...l.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map())].map(([x, n]) => `${court(x, 70)} ×${n}`).join(', ')
  if (!temoin && externes.length) e.push(`${externes.length} requête(s) du navigateur hors 127.0.0.1, bloquées : ${externes.slice(0, 3).join(', ')}`)
  if (!temoin && autres.length) e.push(`l'atelier a tenté de sortir de la boucle locale (refusé) : ${compte(autres)} — une police ou une ressource distante (next/font/google…) n'a pas sa place dans la planche`)
  const info = [`piège chargé dans ${charges} processus de l'atelier`]
  if (tolerees.length) info.push(`sonde de version de next dev refusée ×${tolerees.length}`)
  if (temoin && autres.length) info.push(`tentatives du prototype B refusées et consignées : ${compte(autres)}`)
  if (temoin && externes.length) info.push(`requêtes du navigateur bloquées : ${externes.slice(0, 3).join(', ')}`)
  return { e, info: info.join(' ; ') }
}
async function empreintesPremierPassage(avant) {
  const f = exigerEcriture(EMPREINTES)
  const ou = f.startsWith(MAISON) ? `~/${posix(path.relative(MAISON, f))}` : rel(f)
  let ancien = null, illisible = null
  if (fs.existsSync(f)) { try { ancien = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (err) { illisible = premiereLigne(err) } }
  // Un fichier présent mais illisible ou sans empreintes n'est pas un « premier passage » : on ne l'écrase pas, on le dit.
  if (illisible || (ancien && (!ancien.fichiers || typeof ancien.fichiers !== 'object' || !Object.keys(ancien.fichiers).length))) return { e: [`${ou} illisible ou sans empreintes (${illisible ?? 'fichiers vide'}) : la comparaison entre deux passages est impossible — le retirer à la main pour repartir d'un premier passage`], texte: '' }
  if (!ancien) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify({ date: new Date().toISOString(), fichiers: avant }, null, 1)); return { e: [], texte: `premier passage : ${Object.keys(avant).length} empreintes consignées dans ${ou}` } }
  const d = comparerEmpreintes(ancien.fichiers, avant)
  return { e: d.length ? [`~/station-assets a changé depuis le premier passage du ${ancien.date} (${ou}) : ${d.slice(0, 3).join(', ')}${d.length > 3 ? ` … (${d.length})` : ''}`] : [], texte: `identique au premier passage du ${ancien.date} (${Object.keys(ancien.fichiers).length} empreintes, ${ou})` }
}
// WebGL par SwiftShader (l'usine n'a pas de GPU), mais la RASTÉRISATION des pages sur le processeur : sous charge, la
// rastérisation GPU émulée change de chemin d'un chargement à l'autre, et deux rendus du même atelier au téléphone différaient
// de 187 425 pixels (tout l'écran, écart de 2 au plus : dégradés de la nébuleuse, cadres translucides). Mesuré le 28/09 sur
// l'usine, quatre juges en parallèle : 4 passages sur 8 rouges sans ce drapeau, 0 sur 16 avec.
const ARGS_CHROMIUM = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-rasterization', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']

// ════════════════════════════════════════ --temoin : le prototype B ══════════════════════════════════════════════════
async function temoinB() {
  const A = ATELIER_DEFAUT
  ecrire(`${NOM} --temoin — usine : l'atelier réel ${A} dans son état actuel (le prototype B, route ${ROUTE_B}) ; --atelier ne sert qu'aux critères de F0`)
  if (!fs.existsSync(path.join(A, 'server', 'index.js'))) prealable(`atelier ${A} absent (server/index.js introuvable)`)
  const dossier = exigerEcriture(path.join(TRAV, 'temoin-b'))
  fs.mkdirSync(dossier, { recursive: true })
  for (const t of TAILLES) fs.rmSync(path.join(dossier, `${t.nom}.jpg`), { force: true })
  const avant = empreintesLotA()
  const copie = exigerEcriture(path.join(TRAV, 'atelier'))
  const n = copierEtatActuel(A, copie)
  let atelier = null, nav = null
  const pages = []
  try {
    atelier = await lancerAtelier(copie, ROUTE_B, 'temoin-b')
    nav = await chromium.launch({ headless: true, args: ARGS_CHROMIUM })
    for (const t of TAILLES) {
      const p = await ouvrir(nav, atelier.port, t, { route: ROUTE_B, planche: false })
      pages.push(p)
      await capturerJpeg(p.page, dossier, t.nom)
      await p.fermer()
    }
  } catch (err) {
    noter('PN-9', [`capture du prototype B interrompue : ${premiereLigne(err)}`])
  } finally {
    await nav?.close().catch(() => {})
    await atelier?.arreter()
  }
  const r5 = atelier ? juger5Reseau(pages, atelier, { temoin: true }) : { e: ['atelier non lancé'], info: '' }
  const e5 = r5.e
  const apres = empreintesLotA()
  const d = comparerEmpreintes(avant, apres)
  if (d.length) e5.push(`~/station-assets modifié pendant le passage : ${d.slice(0, 3).join(', ')}`)
  const pp = await empreintesPremierPassage(avant)
  e5.push(...pp.e)
  noter('PN-5', e5, `harnais : ${Object.keys(avant).length} fichiers de ~/station-assets identiques avant et après (${pp.texte}) ; ${pages.length} page(s), toute requête du navigateur hors 127.0.0.1 bloquée ; l'atelier (copie de ${n} fichiers de l'état actuel, sans .env, lancé avec CUSTOM_RUNTIME_ALLOWLIST=aucun.invalid${atelier ? `, prêt en ${atelier.pret.toFixed(0)} s` : ''}) sous le piège réseau : ${r5.info}`)
  if (!verdicts.get('PN-9')?.echecs.length) await juger9(TAILLES.map((t) => t.nom), dossier)
  process.exit(conclure(['PN-5', 'PN-9']))
}

// ════════════════════════════════════════ La planche F0 ══════════════════════════════════════════════════════════════
async function planche() {
  // La racine jugée : celle de --racine, le dépôt, ou celle que la relance a envoyée (--envoi), reposée ici.
  let racine, f, cleCaptures, recu = null
  if (opt.valeurs.envoi !== undefined) {
    recu = decoderEnvoi(opt.valeurs.envoi)
    const h = empreinteCourte(opt.valeurs.envoi)
    racine = exigerEcriture(path.join(TRAV, `racine-${h}`))
    fs.rmSync(racine, { recursive: true, force: true })
    fs.mkdirSync(racine, { recursive: true })
    for (const d of DOCS) if (recu.docs[d] !== null) poserFichier(path.join(racine, d), recu.docs[d])
    if (recu.atelier) {
      if (recu.atelier.chemin !== normRel(atelierDemande)) refuser(`--envoi porte l'atelier ${recu.atelier.chemin}, --atelier dit ${atelierDemande ?? 'rien'}`)
      for (const [r, enc, c] of recu.atelier.fichiers) poserFichier(path.join(racine, ...recu.atelier.chemin.split('/'), ...r.split('/')), enc === 'base64' ? Buffer.from(c, 'base64') : c)
    }
    f = recu.docs
    cleCaptures = `captures-${h}`
  } else {
    racine = opt.valeurs.racine !== undefined ? path.resolve(R, opt.valeurs.racine) : R
    f = lireDocs(racine)
    cleCaptures = path.resolve(racine) === path.resolve(R) ? null : `captures-${empreinteCourte(path.resolve(racine))}`
  }
  const dossier = cleCaptures ? exigerEcriture(path.join(TRAV, cleCaptures)) : PREUVES_F0
  const { A, sousRacine } = cheminAtelier(atelierDemande, racine)
  ecrire(`${NOM} — usine, racine ${recu ? `(documents${recu.atelier ? ' et atelier' : ''} reçus par --envoi, reposés sous ${rel(racine)})` : rel(racine)}, atelier ${sousRacine ? `${posix(path.relative(racine, A))} (dans la racine jugée)` : A}, captures dans ${rel(dossier)}`)

  // PN-1 : les documents, puis l'atelier.
  const d = analyserDocs(f)
  if (d.erreurs.length) { noter('PN-1', d.erreurs); arreterSurPN1('les documents de la planche manquent ou se lisent mal ; ni atelier ni navigateur lancés') }
  if (!fs.existsSync(A) || !fs.statSync(A).isDirectory()) prealable(`atelier ${A} introuvable`)
  if (!fs.existsSync(T049)) prealable(`référence ${T049} introuvable (echelle.jpg la montre)`)
  const at = etatAtelier(A, d.atelier, racine)
  if (at.e.length) { noter('PN-1', at.e); arreterSurPN1('l’atelier n’est pas celui que cite planche.md ; ni atelier ni navigateur lancés') }
  noter('PN-1', [], `${DOCS.map((x, i) => `${path.basename(x)} ${d.octets[i]} o`).join(', ')} lus ; atelier ${at.versionne ? `${A} au commit ${at.sha.slice(0, 12)} « ${court(at.sujet, 40)} », cité par planche.md, git status propre` : at.cite === CITE_RACINE ? `${posix(path.relative(racine, A))}, non versionné, posé dans la racine jugée (« atelier: ${CITE_RACINE} ») et figé par le juge au commit ${at.sha.slice(0, 12)}` : `${rel(A)}, non versionné, figé par le juge au commit ${at.sha.slice(0, 12)}, cité par planche.md`}`)

  // Contrôles statiques.
  const { e2, e3 } = controlerGrille(d.grille, d.k)
  const statique2 = e2.length === 0
  const e4 = d.palette.length < 24 || d.palette.length > 32 ? [`palette de ${d.palette.length} couleur(s) distincte(s) dans planche.md, 24 à 32 attendues`] : []
  const lic = controlerLicences(d.licence)
  const e5 = [...lic.e]
  const e6 = [], e7 = [], e8 = []
  const det = { 2: [], 3: [], 4: [], 6: [], 7: [], 8: [] }

  if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true })
  for (const n of CAPTURES_F0) fs.rmSync(exigerEcriture(path.join(dossier, `${n}.jpg`)), { force: true })
  const avant = empreintesLotA()
  const shaLotA = new Map(Object.entries(avant).map(([k, v]) => [String(v).split(':')[1], k]))
  const shaT049 = sha256(fs.readFileSync(T049))
  const copie = exigerEcriture(path.join(TRAV, 'atelier'))
  extraire(at.depot, at.sha, copie, at.versionne ? A : null)
  let atelier = null, nav = null
  const pages = []
  let interrompu = null
  // PN-6 : les rendus comparés (calque HTML SEUL masqué), par vue ou taille : { a, b } ; et les écrans vus au bureau.
  const rendus6 = new Map()
  let ecransVus = 0
  const rendu6 = async (p, nom, jeu, m) => {
    if (p.trace.donnees < 1 || m.miroir?.donnees !== true) e6.push(`${nom} (données ${jeu}) : la page a demandé ${CHEMIN_DONNEES} ${p.trace.donnees} fois${m.miroir?.donnees === true ? '' : ' et __planche.donnees n’est pas vrai'} — sans données chargées, la comparaison a/b ne prouverait rien`)
    await p.masquer(['pn-texte'])
    const img = await brut(await p.png())
    await p.masquer([])
    rendus6.set(nom, { ...rendus6.get(nom), [jeu]: img })
  }
  const ecrans6 = (m, nom, jeu) => {
    for (const s of SALLES) {
      const ec = m.ecrans.filter((x) => x.cle === s.cle)
      if (ec.length !== 1) { e6.push(`${nom} (données ${jeu}) : ${ec.length} écran(s) [data-ecran="${s.cle}"], 1 attendu`); continue }
      const v = defautsVue(ec[0].vue)
      if (ec[0].texte !== '—') e6.push(`${nom} (données ${jeu}) : écran ${s.cle} dit « ${court(ec[0].texte, 30)} », « — » attendu`)
      else if (v.length) e6.push(`${nom} (données ${jeu}) : écran ${s.cle} invisible (${v.slice(0, 3).join(', ')})`)
      else if (ec[0].vue.pseudo.length) e6.push(`${nom} (données ${jeu}) : écran ${s.cle} porte un contenu CSS ${court(ec[0].vue.pseudo.join(' '), 40)} (une donnée passerait par là)`)
      else ecransVus++
    }
  }
  try {
    atelier = await lancerAtelier(copie, ROUTE, 'planche')
    nav = await chromium.launch({ headless: true, args: ARGS_CHROMIUM })
    const [T1440] = TAILLES
    const imagesStation = [], imagesVaisseau = []
    // L'échelle RÉELLE du canevas à 1440 px (pixels de l'appareil par pixel de grille) sert à PN-2 et PN-7 ; seul PN-3
    // compare l'échelle au k que déclare planche.md.
    let decor1440 = null, perso = null, atlasDeclare = null, k1440 = d.k['1440']

    // ── La vue station aux trois tailles, données a ──
    for (const t of TAILLES) {
      const p = await ouvrir(nav, atelier.port, t, { vue: 'station', donnees: 'a' })
      pages.push(p)
      const m = await p.mesurer()
      await p.png() // le rendu est stable avant la capture gardée
      await capturerJpeg(p.page, dossier, t.nom)
      await rendu6(p, t.nom, 'a', m)
      const k = d.k[t.k]
      const grille = d.grille.grille?.[t.mode]
      // PN-3 : la mise en page, le canevas, l'échelle entière.
      const e3t = []
      const attendus = t.mode === 'bureau'
        ? [['barre', m.barre, [0, 0, t.l, t.barre]], ['colonne-gauche', m.gauche, [0, t.barre, t.colonnes[0], t.h - t.barre - t.bandeau]], ['colonne-droite', m.droite, [t.l - t.colonnes[1], t.barre, t.colonnes[1], t.h - t.barre - t.bandeau]], ['bandeau', m.bandeau, [0, t.h - t.bandeau, t.l, t.bandeau]]]
        : [['barre', m.barre, [0, 0, t.l, t.barre]], ['bandeau', m.bandeau, [0, t.h - t.bandeau, t.l, t.bandeau]]]
      for (const [n, b, [x, y, l, h]] of attendus) {
        if (!b || !b.visible) { e3t.push(`[data-planche="${n}"] absent ou masqué`); continue }
        if (!(pres(b.x, x) && pres(b.y, y) && pres(b.l, l) && pres(b.h, h))) e3t.push(`${n} en ${rectDe(b)}, ${x},${y} ${l}×${h} attendu`)
        if (b.texte || b.medias) e3t.push(`${n} n'est pas vide (${b.texte ? `« ${court(b.texte, 30)} »` : `${b.medias} média(s)`})`)
      }
      if (t.mode === 'portrait') {
        for (const [n, b] of [['colonne-gauche', m.gauche], ['colonne-droite', m.droite]]) if (b && b.visible) e3t.push(`${n} visible au téléphone`)
        if (m.scrollWidth > t.l) e3t.push(`défilement horizontal (scrollWidth ${m.scrollWidth} > ${t.l})`)
      }
      const libre = t.mode === 'bureau' ? { x: t.colonnes[0], y: t.barre, l: t.l - t.colonnes[0] - t.colonnes[1], h: t.h - t.barre - t.bandeau } : { x: t.marge, y: t.barre, l: t.l - 2 * t.marge, h: t.h - t.barre - t.bandeau }
      const c = m.decor
      let dev = null
      if (!c || !c.visible || c.balise !== 'canvas') e3t.push(`[data-planche="decor"] ${c ? `est un <${c.balise}>${c.visible ? '' : ' masqué'}` : 'absent'}, un canevas visible attendu`)
      else {
        dev = { x: c.x * t.dpr, y: c.y * t.dpr, l: c.l * t.dpr, h: c.h * t.dpr }
        if (!entier(dev.x) || !entier(dev.y)) e3t.push(`origine du canevas ${dev.x.toFixed(2)},${dev.y.toFixed(2)} en pixels de l'appareil, entière attendue`)
        if (!entier(dev.l) || !entier(dev.h) || !grille || Math.round(dev.l) !== grille.l * k || Math.round(dev.h) !== grille.h * k) e3t.push(`canevas de ${dev.l.toFixed(1)}×${dev.h.toFixed(1)} pixels de l'appareil, grille ${t.mode} ${grille?.l}×${grille?.h} × k ${k} = ${grille ? `${grille.l * k}×${grille.h * k}` : '?'} attendu`)
        if (c.x < libre.x - 0.5 || c.y < libre.y - 0.5 || c.x + c.l > libre.x + libre.l + 0.5 || c.y + c.h > libre.y + libre.h + 0.5) e3t.push(`canevas en ${rectDe(c)}, hors de l'espace libre ${rectDe(libre)}`)
      }
      // Le décor seul : nébuleuse, calque HTML, portrait et cadre masqués, fond transparent.
      let decorImg = null
      if (c && c.visible && c.l >= 1 && c.h >= 1) {
        await p.masquer(['pn-html', 'pn-cadre', 'pn-neb'])
        const buf = await p.png({ clip: { x: c.x, y: c.y, width: c.l, height: c.h }, omitBackground: true })
        await p.masquer([])
        decorImg = await brut(buf)
        if (dev && entier(dev.x) && entier(dev.y) && Number.isInteger(k) && e3t.length === 0) {
          const b = blocsNonUniformes(decorImg, k)
          if (b.mauvais) e3t.push(`${b.mauvais} bloc(s) ${k}×${k} non uniforme(s) sur ${b.total} dans le décor capturé (image lissée ou pas au facteur k)`)
          else det[3].push(`${t.nom} : ${b.total} blocs ${k}×${k} uniformes`)
        }
        // PN-4 : la palette.
        const hp = horsPalette(decorImg, d.palette)
        if (d.palette.length >= 1) {
          if (hp.semi) e4.push(`${t.nom} : ${hp.semi} pixel(s) semi-transparent(s) dans le décor`)
          if (hp.hors.size) { const pire = [...hp.hors.entries()].sort((a, b) => b[1] - a[1]); e4.push(`${t.nom} : ${pire.reduce((s, x) => s + x[1], 0)} pixel(s) hors palette, ${hp.hors.size} couleur(s) (${pire.slice(0, 4).map(([cc, nn]) => `${hex(cc)} ×${nn}`).join(', ')})`) }
          if (!hp.opaques) e4.push(`${t.nom} : aucun pixel opaque dans le décor`)
          if (!hp.semi && !hp.hors.size && hp.opaques) det[4].push(`${t.nom} : ${hp.opaques} pixels opaques, tous dans la palette de ${d.palette.length} couleurs`)
        }
      } else e4.push(`${t.nom} : PN-4 non mesuré — décor non capturé (canevas absent ou masqué)`)
      noter('PN-3', e3t.map((x) => `${t.nom} : ${x}`))
      if (!e3t.length) det[3].push(`${t.nom} (${t.l}×${t.h}, densité ${t.dpr}) : cadre à ses tailles et vide, canevas ${Math.round(dev.l)}×${Math.round(dev.h)} = ${grille.l}×${grille.h} × ${k} à l'origine ${Math.round(dev.x)},${Math.round(dev.y)}`)
      // PN-2 : les zones sur leurs emplacements, les plaques visibles (bureau seulement : au téléphone, les plaques
      // n'apparaissent qu'au zoom ×2). Une taille de bureau non mesurée est rouge.
      if (t.mode === 'bureau' && statique2 && !(dev && grille)) e2.push(`${t.nom} : PN-2 non mesuré — ${!dev ? 'canevas absent ou masqué' : 'grille bureau absente de grille.json'}`)
      else if (t.mode === 'bureau' && statique2) {
        const e2t = []
        const kx = dev.l / grille.l, ky = dev.h / grille.h
        const vers = (z) => ({ x: (z.x - c.x) * t.dpr / kx, y: (z.y - c.y) * t.dpr / ky, l: z.l * t.dpr / kx, h: z.h * t.dpr / ky })
        const parCle = new Map()
        for (const z of m.zones) { if (parCle.has(z.cle)) e2t.push(`zone ${z.cle} en double`); parCle.set(z.cle, z) }
        for (const cle of parCle.keys()) if (cle !== RESERVEE.cle && !SALLES.some((s) => s.cle === cle)) e2t.push(`zone [data-salle="${cle}"] inconnue`)
        let visibles = 0
        for (const s of [...SALLES, { ...RESERVEE, reserve: true }]) {
          const z = parCle.get(s.cle)
          if (!z) { e2t.push(`zone [data-salle="${s.cle}"] absente`); continue }
          const attendu = s.reserve ? d.grille.reserve : d.grille.emplacements[s.cle]
          const v = vers(z)
          if (!(pres(v.x, attendu.x) && pres(v.y, attendu.y) && pres(v.l, attendu.l) && pres(v.h, attendu.h))) e2t.push(`${s.cle} rendue en ${v.x.toFixed(1)},${v.y.toFixed(1)} ${v.l.toFixed(1)}×${v.h.toFixed(1)} (pixels de grille), grille.json dit ${attendu.x},${attendu.y} ${attendu.l}×${attendu.h}${s.reserve ? ' (reserve)' : ''}`)
          const pl = z.plaques.find((x) => norm(x.texte) === norm(s.plaque))
          if (!pl) e2t.push(`${s.cle} : plaque « ${norm(s.plaque)} » absente de sa zone (lu : ${z.plaques.map((x) => `« ${court(x.texte, 30)} »`).join(', ') || 'rien'})`)
          else { const dv = defautsVue(pl.vue); if (dv.length) e2t.push(`${s.cle} : plaque « ${norm(s.plaque)} » invisible (${dv.slice(0, 3).join(', ')})`); else visibles++ }
          if (s.reserve) {
            if (z.porte !== 'fermee') e2t.push(`réservée : data-porte « ${z.porte} », « fermee » attendu`)
            if (z.poste !== 'non') e2t.push(`réservée : data-poste « ${z.poste} », « non » attendu (sans poste)`)
            if (z.ecrans.length) e2t.push('réservée : un écran dans sa zone, aucun attendu')
          }
        }
        const plaques = m.plaques.map(norm), attendues = [...SALLES.map((s) => norm(s.plaque)), norm(RESERVEE.plaque)]
        const enTrop = plaques.filter((x) => !attendues.includes(x)), doubles = plaques.filter((x, i) => plaques.indexOf(x) !== i)
        if (enTrop.length) e2t.push(`plaque(s) inconnue(s) : ${enTrop.slice(0, 3).map((x) => `« ${court(x, 30)} »`).join(', ')}`)
        if (doubles.length) e2t.push(`plaque(s) en double : ${[...new Set(doubles)].slice(0, 3).join(', ')}`)
        noter('PN-2', e2t.map((x) => `${t.nom} : ${x}`))
        if (!e2t.length) det[2].push(`${t.nom} : 20 plaques de SALLES et « ${RESERVEE.plaque} », chaque zone sur son emplacement de grille.json (réservée sur reserve ${d.grille.reserve.x},${d.grille.reserve.y}, porte fermée, sans poste), ${visibles} plaques visibles dans leur zone (boîte, style, rien par-dessus leur centre)`)
      }
      // PN-6 : les écrans (au bureau : au téléphone, plaques et écrans n'apparaissent qu'au zoom ×2).
      if (t.mode === 'bureau') ecrans6(m, t.nom, 'a')
      imagesStation.push(...p.trace.images)
      if (t === T1440) {
        decor1440 = decorImg
        perso = m.miroir?.personnages
        atlasDeclare = m.miroir?.atlas ?? null
        if (dev && grille && entier(dev.l / grille.l)) k1440 = Math.round(dev.l / grille.l)
        // PN-7 : la nébuleuse (seule), le portrait.
        const neb = m.nebuleuse
        if (!neb || !neb.visible) e7.push('[data-planche="nebuleuse"] absente ou masquée')
        else if (!(neb.x <= 0.5 && neb.y <= 0.5 && neb.x + neb.l >= t.l - 0.5 && neb.y + neb.h >= t.h - 0.5)) e7.push(`nébuleuse en ${rectDe(neb)}, tout l'écran attendu (elle continue sous la barre et les colonnes)`)
        else {
          await p.masquer(['pn-html', 'pn-cadre', 'pn-decor'])
          const et = await ecartType(await p.png())
          if (!(et >= 4)) e7.push(`nébuleuse uniforme (écart type ${et.toFixed(2)}, 4 au moins)`)
          else det[7].push(`nébuleuse sur tout l'écran, écart type ${et.toFixed(1)}`)
        }
        await p.masquer([])
        const po = m.portrait
        if (!po || !po.visible) e7.push('[data-planche="portrait"] absent ou masqué')
        else if (m.portraitDansUnCadre) e7.push('le portrait est dans la barre, une colonne ou le bandeau, qui doivent rester vides')
        else if (po.l < 32 || po.h < 32 || po.x < 0 || po.y < 0 || po.x + po.l > t.l || po.y + po.h > t.h) e7.push(`portrait en ${rectDe(po)} : 32×32 au moins, dans l'écran`)
        else { const et = await ecartType(await p.png({ clip: { x: po.x, y: po.y, width: po.l, height: po.h } })); if (!(et >= 4)) e7.push(`portrait uniforme (écart type ${et.toFixed(2)})`); else det[7].push(`1 portrait ${Math.round(po.l)}×${Math.round(po.h)} (écart type ${et.toFixed(1)})`) }
        // PN-4 : le portrait est un dessin, lui aussi dans la palette. Seul, sans nébuleuse, cadre, décor ni calque HTML ; son
        // intérieur (un pixel de marge : un bord à une position fractionnaire est anticrénelé par le navigateur, pas par lui).
        const x0 = po ? Math.ceil(po.x) + 1 : 0, y0 = po ? Math.ceil(po.y) + 1 : 0, x1 = po ? Math.floor(po.x + po.l) - 1 : 0, y1 = po ? Math.floor(po.y + po.h) - 1 : 0
        if (!po || !po.visible) e4.push('portrait : PN-4 non mesuré — portrait absent ou masqué')
        else if (!(x1 - x0 >= 8 && y1 - y0 >= 8)) e4.push(`portrait : PN-4 non mesuré — ${rectDe(po)}, trop petit pour mesurer son intérieur`)
        else if (d.palette.length) {
          await p.masquer(['pn-texte', 'pn-cadre', 'pn-neb', 'pn-decor'])
          const im = await brut(await p.png({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, omitBackground: true }))
          await p.masquer([])
          const hp = horsPalette(im, d.palette)
          if (hp.semi) e4.push(`portrait : ${hp.semi} pixel(s) semi-transparent(s) (dessin lissé ?)`)
          if (hp.hors.size) { const pire = [...hp.hors.entries()].sort((a, b) => b[1] - a[1]); e4.push(`portrait : ${pire.reduce((s, x) => s + x[1], 0)} pixel(s) hors palette, ${hp.hors.size} couleur(s) (${pire.slice(0, 4).map(([cc, nn]) => `${hex(cc)} ×${nn}`).join(', ')})`) }
          if (!hp.opaques) e4.push('portrait : aucun pixel opaque')
          if (!hp.semi && !hp.hors.size && hp.opaques) det[4].push(`portrait : ${hp.opaques} pixels opaques, tous dans la palette`)
        }
      }
      await p.fermer()
    }

    // ── PN-6 : la vue station aux trois tailles, données b ──
    for (const t of TAILLES) {
      const p = await ouvrir(nav, atelier.port, t, { vue: 'station', donnees: 'b' })
      pages.push(p)
      const m = await p.mesurer()
      await rendu6(p, t.nom, 'b', m)
      if (t.mode === 'bureau') ecrans6(m, t.nom, 'b')
      imagesStation.push(...p.trace.images)
      await p.fermer()
    }

    // ── PN-7 : les personnages, réellement dessinés (rendu ?sans=personnages) ──
    {
      const p = await ouvrir(nav, atelier.port, T1440, { vue: 'station', sans: true })
      pages.push(p)
      const m = await p.mesurer()
      const c = m.decor
      const liste = Array.isArray(perso) ? perso : []
      const e7p = []
      if (liste.length < 4) e7p.push(`${liste.length} personnage(s) dans __planche.personnages, 4 attendus`)
      const etats = new Set(liste.map((x) => x?.etat))
      if (!etats.has('marche') || !etats.has('poste')) e7p.push(`états des personnages : ${[...etats].join(', ') || 'aucun'} — en marche ET au poste attendus`)
      const k = k1440
      const grille = d.grille.grille?.bureau
      const rects = []
      for (const x of liste) {
        if (!rectOk(x) || !['marche', 'poste'].includes(x.etat) || typeof x.nom !== 'string') { e7p.push(`personnage mal décrit : ${court(JSON.stringify(x), 80)}`); continue }
        if (grille && (x.x + x.l > grille.l || x.y + x.h > grille.h)) { e7p.push(`${x.nom} hors de la grille`); continue }
        rects.push({ ...x, dx: x.x * k, dy: x.y * k, dl: x.l * k, dh: x.h * k })
      }
      if (!c || !decor1440) e7p.push('décor 1440 indisponible')
      else if (!e7p.length) {
        await p.masquer(['pn-html', 'pn-cadre', 'pn-neb'])
        const sans = await brut(await p.png({ clip: { x: c.x, y: c.y, width: c.l, height: c.h }, omitBackground: true }))
        await p.masquer([])
        if (sans.l !== decor1440.l || sans.h !== decor1440.h) e7p.push('décor sans personnages d’une autre taille')
        else {
          for (const r of rects) {
            const n = pixelsDifferents(decor1440, sans, (x, y) => x >= r.dx && x < r.dx + r.dl && y >= r.dy && y < r.dy + r.dh)
            const part = n / (r.dl * r.dh)
            if (part < 0.1) e7p.push(`${r.nom} (${r.etat}) : ${(part * 100).toFixed(1)} % de son cadre change sans lui, 10 % au moins (pas dessiné là ?)`)
          }
          const dehors = pixelsDifferents(decor1440, sans, (x, y) => !rects.some((r) => x >= r.dx && x < r.dx + r.dl && y >= r.dy && y < r.dy + r.dh))
          if (dehors) e7p.push(`${dehors} pixel(s) changent hors des cadres déclarés des personnages (cadres faux ou décor instable)`)
          if (!e7p.length) det[7].push(`${rects.length} personnages (${rects.map((r) => `${r.nom} ${r.etat}`).join(', ')}) dessinés dans leur cadre, rien d'autre ne change sans eux`)
        }
      }
      e7.push(...e7p)
      imagesStation.push(...p.trace.images)
      await p.fermer()
    }

    // ── PN-7 : echelle.jpg (données a), puis PN-6 : la vue echelle avec les données b ──
    {
      const p = await ouvrir(nav, atelier.port, T1440, { vue: 'echelle' })
      pages.push(p)
      const m = await p.mesurer()
      await p.png()
      await capturerJpeg(p.page, dossier, 'echelle')
      await rendu6(p, 'echelle', 'a', m)
      const ech = m.miroir?.echelle
      const pk = m.echellePack, rf = m.echelleRef
      const sha = (src) => { try { const u = new URL(src); return p.trace.images.find((x) => x.chemin === u.pathname)?.sha ?? null } catch { return null } }
      const e7e = []
      if (!pk || pk.balise !== 'img' || !pk.visible || !pk.nl) e7e.push('[data-planche="echelle-pack"] : une <img> chargée et visible attendue')
      if (!rf || rf.balise !== 'img' || !rf.visible || !rf.nl) e7e.push('[data-planche="echelle-ref"] : une <img> chargée et visible attendue')
      if (!ech || typeof ech.pack !== 'string' || typeof ech.fichier !== 'string') e7e.push('__planche.echelle { pack, fichier } absent')
      else if (!lic.packs.includes(ech.pack)) e7e.push(`l'art de l'échelle vient de ${ech.pack}, que licence-planche.json ne cite pas`)
      if (!e7e.length) {
        let attendu = null
        try { if (!ech.fichier.split(/[\\/]/).includes('..')) attendu = sha256(fs.readFileSync(path.join(LOT_A, ech.pack, ech.fichier))) } catch { /* absent */ }
        if (!attendu) e7e.push(`${ech.pack}/${court(ech.fichier, 60)} introuvable dans le lot A`)
        else if (sha(pk.src) !== attendu) e7e.push(`l'image [echelle-pack] n'est pas ${ech.pack}/${court(ech.fichier, 50)} octet pour octet`)
        const fx = (pk.l * m.dpr) / pk.nl, fy = (pk.h * m.dpr) / pk.nh
        if (!(pres(fx, fy, 0.01) && [1, k1440].some((x) => pres(fx, x, 0.01)))) e7e.push(`art du pack affiché ×${fx.toFixed(2)}×${fy.toFixed(2)}, ×1 ou ×${k1440} (k.1440) attendu`)
        if (sha(rf.src) !== shaT049) e7e.push('l’image [echelle-ref] n’est pas trevsagents/t049.2.jpg octet pour octet')
        for (const [n, b] of [['echelle-pack', pk], ['echelle-ref', rf]]) if (b.x < -0.5 || b.y < -0.5 || b.x + b.l > m.vw + 0.5 || b.y + b.h > m.vh + 0.5) e7e.push(`${n} déborde de l'écran (${rectDe(b)})`)
        if (chevauche(pk, rf)) e7e.push('l’art du pack et t049.2 se chevauchent : côte à côte attendus')
        if (!e7e.length) det[7].push(`echelle.jpg : ${ech.pack}/${court(ech.fichier, 40)} (${pk.nl}×${pk.nh}, ×${fx.toFixed(0)}) à côté de t049.2 (${rf.nl}×${rf.nh}), tous deux relus octet pour octet`)
      }
      e7.push(...e7e.map((x) => `échelle : ${x}`))
      await p.fermer()
      const pb = await ouvrir(nav, atelier.port, T1440, { vue: 'echelle', donnees: 'b' })
      pages.push(pb)
      await rendu6(pb, 'echelle', 'b', await pb.mesurer())
      await pb.fermer()
    }

    // ── PN-7 et PN-8 : vaisseau.jpg (données a), puis PN-6 : la vue vaisseau avec les données b ──
    {
      const p = await ouvrir(nav, atelier.port, T1440, { vue: 'vaisseau' })
      pages.push(p)
      const m = await p.mesurer()
      await p.png()
      await capturerJpeg(p.page, dossier, 'vaisseau')
      await rendu6(p, 'vaisseau', 'a', m)
      const c = m.decor, mods = Array.isArray(m.miroir?.modules) ? m.miroir.modules : []
      const e7v = []
      if (mods.length !== 3) e7v.push(`${mods.length} module(s) dans __planche.modules, 3 attendus`)
      if (!c || !c.visible || c.balise !== 'canvas') e7v.push('canevas [data-planche="decor"] absent')
      const k = k1440
      if (!e7v.length) {
        const dl = c.l * m.dpr, dh = c.h * m.dpr
        if (!entier(dl / k) || !entier(dh / k)) e7v.push(`canevas du vaisseau ${dl}×${dh}, pas un multiple de k.1440 = ${k}`)
        const noms = new Set(mods.map((x) => x?.nom))
        if (noms.size !== 3 || [...noms].some((x) => typeof x !== 'string' || !x.trim())) e7v.push('les 3 modules ont chacun un nom distinct attendu')
        for (const x of mods) if (!rectOk(x) || (x.x + x.l) * k > dl + 0.5 || (x.y + x.h) * k > dh + 0.5) e7v.push(`module mal placé : ${court(JSON.stringify(x), 80)}`)
        for (let i = 0; i < mods.length; i++) for (let j = i + 1; j < mods.length; j++) if (rectOk(mods[i]) && rectOk(mods[j]) && chevauche(mods[i], mods[j])) e7v.push(`modules ${mods[i].nom} et ${mods[j].nom} se chevauchent`)
        if (!e7v.length) {
          await p.masquer(['pn-html', 'pn-cadre', 'pn-neb'])
          const buf = await p.png({ clip: { x: c.x, y: c.y, width: c.l, height: c.h }, omitBackground: true })
          await p.masquer([])
          const v = []
          for (const x of mods) {
            const z = { x: x.x * k, y: x.y * k, l: x.l * k, h: x.h * k }
            const et = await ecartType(buf, z)
            if (!(et >= 4)) e7v.push(`module ${x.nom} uniforme (écart type ${et.toFixed(2)})`)
            v.push([x.nom, await vignette(buf, z)])
          }
          for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) { const dd = ecartMoyen(v[i][1], v[j][1]); if (dd < 4) e7v.push(`modules ${v[i][0]} et ${v[j][0]} presque identiques (écart moyen ${dd.toFixed(2)})`) }
          if (!e7v.length) det[7].push(`vaisseau.jpg : 3 modules distincts et dessinés (${mods.map((x) => x.nom).join(', ')})`)
        }
      }
      e7.push(...e7v.map((x) => `vaisseau : ${x}`))
      imagesVaisseau.push(...p.trace.images)
      await p.fermer()
      const pb = await ouvrir(nav, atelier.port, T1440, { vue: 'vaisseau', donnees: 'b' })
      pages.push(pb)
      await rendu6(pb, 'vaisseau', 'b', await pb.mesurer())
      imagesVaisseau.push(...pb.trace.images)
      await pb.fermer()
    }

    // ── PN-8 : poids et feuilles brutes ──
    for (const [vue, images] of [['station', imagesStation], ['vaisseau', imagesVaisseau]]) {
      const parChemin = new Map(images.map((x) => [x.chemin, x]))
      const total = [...parChemin.values()].reduce((s, x) => s + x.octets, 0)
      const e8v = []
      if (!parChemin.size) e8v.push('aucune image servie (l’atlas composite devait l’être)')
      if (total > POIDS_MAX) e8v.push(`${ko(total)} d'images servies, ${ko(POIDS_MAX)} au plus`)
      for (const x of parChemin.values()) if (shaLotA.has(x.sha)) e8v.push(`${x.chemin} est la feuille brute ${shaLotA.get(x.sha)} du lot A, servie telle quelle`)
      if (vue === 'station') {
        let chemin = null
        try { chemin = typeof atlasDeclare === 'string' ? new URL(atlasDeclare, 'http://127.0.0.1/').pathname : null } catch { /* illisible */ }
        const a = chemin ? parChemin.get(chemin) : null
        if (!chemin) e8v.push('__planche.atlas (le chemin de l’atlas composite) absent')
        else if (!a) e8v.push(`l'atlas déclaré ${chemin} n'a pas été servi à la page`)
        else if (a.octets > POIDS_MAX) e8v.push(`l'atlas ${chemin} pèse ${ko(a.octets)}, ${ko(POIDS_MAX)} au plus`)
        else det[8].push(`atlas composite ${chemin} : ${ko(a.octets)}`)
      }
      e8.push(...e8v.map((x) => `vue ${vue} : ${x}`))
      if (!e8v.length) det[8].push(`vue ${vue} : ${parChemin.size} image(s), ${ko(total)} au total (${[...parChemin.values()].map((x) => `${x.chemin} ${ko(x.octets)}`).join(', ')}), aucune feuille brute du lot A`)
    }
  } catch (err) {
    interrompu = premiereLigne(err)
  } finally {
    await nav?.close().catch(() => {})
    await atelier?.arreter()
  }

  // PN-6 : chaque rendu a contre son rendu b, pixel pour pixel. Un rendu manquant est rouge : rien n'a été comparé.
  {
    const vus = []
    for (const nom of RENDUS_6) {
      const r = rendus6.get(nom)
      if (!r?.a || !r?.b) { e6.push(`${nom} : PN-6 non mesuré — rendu ${!r?.a ? 'a' : 'b'} manquant`); continue }
      if (r.a.l !== r.b.l || r.a.h !== r.b.h) { e6.push(`${nom} : rendus a et b de tailles différentes (${r.a.l}×${r.a.h}, ${r.b.l}×${r.b.h})`); continue }
      const x = ecartPixels(r.a, r.b)
      if (x.n) e6.push(`${nom} : le rendu change avec les données — ${x.n} pixel(s) différent(s) entre donnees-a.json et donnees-b.json (calque HTML seul masqué, portrait compris), dans la boîte ${x.boite} (pixels de l'appareil), écart jusqu'à ${x.max} : le décor porte une donnée`)
      else vus.push(`${nom} ${r.a.l}×${r.a.h}`)
    }
    rendus6.clear()
    if (vus.length === RENDUS_6.length) det[6].push(`rendus identiques pixel pour pixel avec donnees-a.json et donnees-b.json, calque HTML seul masqué (portrait compris), données demandées dans chacun : ${vus.join(', ')}`)
    if (ecransVus === SALLES.length * 4) det[6].push(`les 20 écrans disent « — », visibles dans leur salle, sans contenu CSS (1440 et 1280, données a et b)`)
    else if (!e6.length) e6.push(`${ecransVus} écran(s) vus sur ${SALLES.length * 4} attendus (20 salles, 1440 et 1280, données a et b)`)
  }

  // PN-5 : réseau et lot A.
  const r5 = atelier ? juger5Reseau(pages, atelier) : { e: ['atelier non lancé'], info: '' }
  e5.push(...r5.e)
  const apres = empreintesLotA()
  const dl = comparerEmpreintes(avant, apres)
  if (dl.length) e5.push(`~/station-assets modifié pendant le passage : ${dl.slice(0, 3).join(', ')}`)
  const pp = await empreintesPremierPassage(avant)
  e5.push(...pp.e)
  const det5 = `${lic.packs.length} pack(s) cité(s) (${lic.packs.join(', ')}), chacun conforme à son licence.json (CC0, auteur, adresse, date) et ses fichiers présents ; ${Object.keys(avant).length} fichiers de ~/station-assets identiques avant et après (${pp.texte}) ; ${pages.length} page(s) sans requête hors 127.0.0.1 ; aucune connexion de l'atelier hors de la boucle locale (${r5.info})`

  if (interrompu) for (const e of [e2, e3, e4, e5, e6, e7, e8]) e.push(`passage interrompu : ${interrompu}`)
  noter('PN-2', e2, det[2].join(' ; '))
  noter('PN-3', e3, det[3].join(' ; '))
  noter('PN-4', e4, det[4].length ? `palette de ${d.palette.length} couleurs ; ${det[4].join(' ; ')}` : '')
  noter('PN-5', e5, det5)
  noter('PN-6', e6, det[6].join(' ; '))
  noter('PN-7', e7, det[7].join(' ; '))
  noter('PN-8', e8, det[8].join(' ; '))
  if (interrompu && ECRITES.size < CAPTURES_F0.length) noter('PN-9', [`passage interrompu avant la dernière capture : ${interrompu}`])
  else await juger9(CAPTURES_F0, dossier)
  process.exit(conclure(IDS))
}

if (TEMOIN) await temoinB()
else await planche()
