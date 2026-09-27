// scripts/commande-exporter-qa.mjs — juge de l'exporteur d'une commande payée (fiche 026-029, lot C ; critères EX de 026-033),
// écrit par Claude Code AVANT le code qu'il juge (réécrit en entier le 27/09 : la version du 26/09 ne testait que l'existence
// d'un fichier). L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/commande-exporter-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//        [--seulement=EX-2,EX-7]
//
//   --racine=<d>  lance <d>/scripts/commande-exporter.mjs avec cwd = <d> (défaut : le dépôt).
//   --temoin      seulement la part de non-régression d'EX-4 (NR : la règle d'attribution de scripts/site-qa.mjs, importée
//                 par le juge, accepte les attributions de la fixture 025 et refuse quatre entrées fausses) et EX-PV.
//   --reel        EX-10, Claude Code seulement (voir plus bas).
//   --seulement   auto-contrôle de 026-029 (preuve « sait échouer ») : ne juge que ces critères ; jamais le verdict d'une fiche.
//
// Contrat que ce juge fixe pour 026-033 (jeu d'essai : scripts/fixtures/026-livraison-tresor/c/commande-payee.json) :
//   --depuis=<fichier.json>  un objet { commande: <ligne sites_commandes>, artisan: <ligne artisans> } lu au lieu de la base.
//   --hote-photos=<url>      l'objet <clé> du bucket artisan-media (clé = « <artisan_id>/<nom> », tirée de l'URL publique
//                            <NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/artisan-media/<artisan_id>/<nom>) est lu par
//                            un GET simple de « <url>/<clé> » au lieu de l'API de stockage. Le juge sert ces fichiers sur
//                            127.0.0.1 et note chaque requête reçue.
//   Le juge lance l'exporteur avec NEXT_PUBLIC_SUPABASE_URL=https://projet-temoin-026.supabase.co (un projet qui n'existe pas,
//   jamais joint), SUPABASE_SERVICE_ROLE_KEY factice, aucune autre clé, et un piège réseau (NODE_OPTIONS) qui refuse et
//   consigne tout appel hors 127.0.0.1.
//   Une photo refusée est listée, dans la sortie standard ou d'erreur, par le nom de son fichier (dernier segment de son URL).
//   commande.json : id, etat, email, metier, metiers_secondaires, communes, domaine_mode, domaine de la ligne commande ; slug et
//   nom de la ligne artisan ; telephone = artisan.tel_public, sinon artisan.tel ; devis = { projets, delais } (le formulaire des
//   vrais sites, 025-03 point 3 : sans lui, site-qa refuse le bouton « Demander un devis ») où projets reprend chaque prestation
//   déclarée, plus au plus une entrée « Autre … », et delais est une liste de libellés ; matiere = celle de la commande
//   (artisan, prestations, logo_url, adresse, siren, horaires, decennale, avis_google, à l'identique) avec photos = les seules
//   photos valides, dans l'ordre, chacune { url, legende, role } de la commande plus sa `base`.
//   photos/<base>-<largeur>.webp et .avif aux largeurs 480, 960 et 1600 qui ne dépassent pas l'original ; photos/
//   attributions.json au format de la fixture 025 (une entrée par fichier, « fichier: images/<nom> »).
//
// Critères (cahier du juge de 026-033) :
//   EX-1  avec --depuis (jeu d'essai), --hote-photos (servi par le juge), sortie sous .orchestre/travail/commande-exporter-qa/ :
//         code 0 et commande.json écrit. Script absent : EX-1 échoue en le citant ; erreursFabrication absente de
//         lib/siteCommande.ts : code 2, « 026-030 attendue ».
//   EX-2  commande.json : exactement les clés de la fixture 025 (hors commentaires « _ ») et, dans matiere, celles de la fixture
//         plus prestations ; chaque valeur est celle du jeu d'essai (règles ci-dessus), champ par champ.
//   EX-3  faux.jpg (un texte) refusé et listé, rien n'en sort ; chaque photo valide a ses variantes webp et avif exactement aux
//         largeurs dues (480/960/1600 ≤ l'original), relues par sharp (format et largeur réels) ; aucune plus large que
//         l'original ; sharp(…).metadata().exif est absent sur CHAQUE fichier produit (escalier.jpg porte un GPS en entrée).
//   EX-4  attributions.json : chaque base a ses entrées, chaque fichier produit est couvert (règle de site-qa :
//         fichier = images/<nom>), chaque entrée porte fichier, base, largeur, hauteur, largeurs, legende, alt, auteur,
//         licence « propriétaire », source (l'URL d'origine), modifiee « Oui — recadrée et compressée par Presti », et passe
//         attributionCredible de scripts/site-qa.mjs, que le juge importe et applique.
//   EX-5  --sortie sous public/ → code 2, rien d'écrit, git status --porcelain public/ inchangé ; --sortie dans le dépôt hors
//         .orchestre/travail/ → code 2, rien d'écrit.
//   EX-6  dossier sans prestation, puis sans matiere.artisan → code 3, la sortie liste exactement erreursFabrication(dossier)
//         (chaque erreur due y est, celle de l'autre cas n'y est pas), dossier de sortie absent ou vide.
//   EX-7  la photo d'un autre <artisan_id>/ (voisin.jpg) et celle d'un autre hôte (ailleurs.jpg) sont refusées et listées ; le
//         serveur du juge n'a reçu AUCUNE requête pour elles ; le piège réseau n'a rien consigné.
//   EX-8  ni l'adresse, ni le téléphone (public ou non, espacé ou non), ni le SIREN, ni le nom de l'entreprise du jeu d'essai
//         dans la sortie standard ou d'erreur de chaque lancement.
//   EX-9  si 025-03 est PASS : generer.mjs --source=<l'export + le contenu.json de la fixture 025> --sortie=<dossier> sort en
//         code 0 ; sinon code 2, « 025-03 attendue ».
//   EX-10 (--reel, Claude Code) : compte d'essai, 3 photos par /api/media, commande payee d'essai, export réel, ménage dans un
//         finally. NON ÉCRIT ICI : --reel sort en code 2 tant que Claude Code ne l'a pas écrit (à faire avant le premier
//         lancement réel, après 025-03 et 026-033 PASS).
//   EX-PV un fichier de 0 octet dans .orchestre/preuves/026-033/ est un échec (règle commune, tous les modes).
//
// Sortie : une ligne par critère, puis « commande-exporter-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2
// si l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/commande-exporter-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, exportsNommes, jugerPreuvesVides,
  dossierTravail, fichePass, egalProfond,
} from './fixtures/026-livraison-tresor/commun.mjs'
import {
  C, JEU, PROJET, ID_COMMANDE, ID_ARTISAN, ID_AUTRE, LOADER_URL, jeuC, copieJeu, lancerAsync, envEnfant, piegeReseau,
  servirPhotos, regleAttribution, exifAvecGps, gitStatusPublic, lireArbre, auPlus,
} from './fixtures/026-livraison-tresor/c/commun-c.mjs'

const JUGE = 'commande-exporter-qa'
const FICHE = '026-033'
const SCRIPT = 'scripts/commande-exporter.mjs'
const o = lireOptions(process.argv.slice(2), { connues: ['seulement'] })
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const sharp = createRequire(path.join(R, 'package.json'))('sharp')
const COMPLET = ['EX-1', 'EX-2', 'EX-3', 'EX-4', 'EX-5', 'EX-6', 'EX-7', 'EX-8', 'EX-9']
const SEUL = o.valeurs.seulement ? new Set(o.valeurs.seulement.split(',')) : null
const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : SEUL ? `partiel (${[...SEUL].join(',')})` : 'complet'
const IDS = o.temoin ? ['EX-4', 'EX-PV'] : [...(SEUL ? COMPLET.filter((x) => SEUL.has(x)) : COMPLET), ...(o.reel ? ['EX-10'] : []), 'EX-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: o.temoin ? ['EX-4'] : [] })
const veut = (id) => IDS.includes(id)
const finir = (code) => { jugerPreuvesVides(s, 'EX', RAC, FICHE); process.exit(Math.max(code ?? 0, s.finir())) }

// ── La règle d'attribution, importée de scripts/site-qa.mjs (EX-4, et sa part NR) ────────────────────────────────────────
let REGLE = null
try { REGLE = await regleAttribution(RAC) } catch (e) { REGLE = { erreur: premiereLigne(e) } }
function partNrEx4() {
  if (REGLE.erreur) return { echecs: [`règle d'attribution de scripts/site-qa.mjs illisible : ${REGLE.erreur}`] }
  const e = []
  const f025 = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '025', 'commande-exemple', 'photos', 'attributions.json'), 'utf8'))
  const refusees = f025.filter((a) => !REGLE.attributionCredible(a))
  if (refusees.length) e.push(`la règle refuse ${refusees.length} entrée(s) de la fixture 025 (${court(refusees[0].fichier, 60)})`)
  const juste = { fichier: 'images/escalier-960.webp', auteur: 'Menuiserie Témoin-Vingt-Six', licence: 'propriétaire', source: `${PROJET}/storage/v1/object/public/artisan-media/${ID_ARTISAN}/escalier.jpg`, legende: 'Escalier quart tournant en chêne clair' }
  if (!REGLE.attributionCredible(juste)) e.push('la règle refuse une attribution « propriétaire » juste (auteur, source avec chemin)')
  const fausses = [['auteur bidon', { ...juste, auteur: 'Inconnu' }], ['source sans chemin', { ...juste, source: PROJET }], ['licence non permise', { ...juste, licence: 'Tous droits réservés' }], ['légende mal encodée', { ...juste, legende: 'Escalier en chÃªne' }]]
  for (const [quoi, a] of fausses) if (REGLE.attributionCredible(a)) e.push(`la règle accepte une attribution fausse (${quoi})`)
  return { echecs: e, detail: `règle de ${REGLE.source} importée : les ${f025.length} entrées de la fixture 025 et une attribution « propriétaire » juste acceptées ; 4 fausses refusées (auteur bidon, source sans chemin, licence non permise, légende mal encodée)` }
}

// ── --temoin ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (o.temoin) {
  await s.critere('EX-4', partNrEx4)
  finir(0)
}
if (o.reel) {
  s.echoue('EX-10', 'non écrit : --reel sera écrit par Claude Code avant le premier lancement réel (après 025-03 et 026-033 PASS) — code 2, jamais un PASS')
  s.nonJuges(IDS, '--reel non écrit')
  finir(2)
}

// ── EX-1 : le script, son préalable, et le lancement de référence ────────────────────────────────────────────────────────
const TRAV = dossierTravail(JUGE)
const J = jeuC('commande-payee.json')
const CMD = J.commande, ART = J.artisan
if (lireRacine(RAC, SCRIPT) === null) {
  s.echoue('EX-1', `${SCRIPT} absent de ${rel(RAC)} : l'exporteur de 026-033 n'existe pas encore`)
  s.nonJuges(IDS.filter((x) => x !== 'EX-PV'), `EX-1 en échec (${SCRIPT} absent)`)
  finir(1)
}
const siteCommande = lireRacine(RAC, 'lib/siteCommande.ts')
if (!siteCommande || !exportsNommes(siteCommande).includes('erreursFabrication')) {
  s.echoue('EX-1', 'non jugé : 026-030 attendue (lib/siteCommande.ts n\'exporte pas erreursFabrication, dont l\'exporteur a besoin)')
  s.nonJuges(IDS.filter((x) => x !== 'EX-PV'), '026-030 attendue')
  finir(2)
}
const serveur = await servirPhotos()
const piege = piegeReseau(TRAV, 'exporteur')
const ENV = envEnfant({ NEXT_PUBLIC_SUPABASE_URL: PROJET, ['SUPABASE_SERVICE_' + 'ROLE_KEY']: 'cle-factice-du-juge-026-029', ...piege.env })
const sorties = [] // { nom, sortie } : chaque lancement, pour EX-8
const exporter = async (nom, { depuis = JEU, sortie, hote = serveur.url } = {}) => {
  const r = await lancerAsync(process.execPath, ['--import', LOADER_URL, SCRIPT, ID_COMMANDE, `--sortie=${sortie}`, `--depuis=${depuis}`, ...(hote ? [`--hote-photos=${hote}`] : [])], { cwd: RAC, env: ENV, timeout: 300_000 })
  sorties.push({ nom, sortie: r.sortie })
  return r
}
const OUT = path.join(TRAV, 'export')
const r1 = await exporter('jeu d\'essai', { sortie: OUT })
const exporte = r1.code === 0 && fs.existsSync(path.join(OUT, 'commande.json'))
if (veut('EX-1')) s.juger('EX-1', exporte ? [] : [`code ${r1.code}${r1.erreur ? ` (${r1.erreur})` : ''}${fs.existsSync(path.join(OUT, 'commande.json')) ? '' : ', commande.json absent'} — ${court(r1.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 200)}`],
  `${SCRIPT} --depuis=c/commande-payee.json --hote-photos=127.0.0.1 → code 0 en ${r1.duree.toFixed(1)} s, ${lireArbre(OUT).length} fichier(s) sous ${rel(OUT)}`)
const lireJsonSur = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const EXP = exporte ? lireJsonSur(path.join(OUT, 'commande.json')) : null
const ATTR = exporte ? lireJsonSur(path.join(OUT, 'photos', 'attributions.json')) : null
const nomDeUrl = (u) => { try { return decodeURIComponent(new URL(String(u)).pathname.split('/').pop()) } catch { return '' } }
const VALIDES = CMD.matiere.photos.filter((p) => ['escalier.jpg', 'bibliotheque.jpg', 'etabli.jpg'].includes(nomDeUrl(p.url)))
const sansExport = 'non jugé : l\'export du jeu d\'essai n\'a pas abouti (EX-1)'

// ── EX-2 : commande.json ─────────────────────────────────────────────────────────────────────────────────────────────────
if (veut('EX-2')) await s.critere('EX-2', () => {
  if (!EXP) return { echecs: [exporte ? 'commande.json illisible' : sansExport] }
  const e = []
  const F = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'fixtures', '025', 'commande-exemple', 'commande.json'), 'utf8'))
  const cles = (x) => Object.keys(x ?? {}).filter((k) => !k.startsWith('_')).sort()
  const comparer = (quoi, attendu, lu) => { const manque = attendu.filter((k) => !lu.includes(k)), trop = lu.filter((k) => !attendu.includes(k)); if (manque.length) e.push(`${quoi} : clé(s) manquante(s) ${manque.join(', ')}`); if (trop.length) e.push(`${quoi} : clé(s) en trop ${trop.join(', ')}`) }
  comparer('commande.json', cles(F), cles(EXP))
  comparer('matiere', [...cles(F.matiere), 'prestations'].sort(), cles(EXP.matiere))
  const attendu = {
    id: CMD.id, etat: CMD.etat, slug: ART.slug, nom: ART.nom, email: CMD.email, telephone: ART.tel_public || ART.tel, metier: CMD.metier,
    metiers_secondaires: CMD.metiers_secondaires, communes: CMD.communes, domaine_mode: CMD.domaine_mode, domaine: CMD.domaine,
  }
  for (const [k, v] of Object.entries(attendu)) e.push(...egalProfond(EXP[k], v, k).slice(0, 2))
  for (const k of ['artisan', 'prestations', 'logo_url', 'adresse', 'siren', 'horaires', 'decennale', 'avis_google']) e.push(...egalProfond(EXP.matiere?.[k], CMD.matiere[k], `matiere.${k}`).slice(0, 2))
  const ph = EXP.matiere?.photos
  if (!Array.isArray(ph) || ph.length !== VALIDES.length) e.push(`matiere.photos : ${Array.isArray(ph) ? ph.length : 'absent'} entrée(s), ${VALIDES.length} attendues (les seules photos valides)`)
  else ph.forEach((p, i) => {
    const v = VALIDES[i]
    comparer(`matiere.photos[${i}]`, ['base', 'legende', 'role', 'url'], Object.keys(p ?? {}).sort())
    for (const k of ['url', 'legende', 'role']) if (p?.[k] !== v[k]) e.push(`matiere.photos[${i}].${k} = ${JSON.stringify(p?.[k])}, ${JSON.stringify(v[k])} attendu`)
    if (typeof p?.base !== 'string' || !/^[a-z0-9-]+$/.test(p.base)) e.push(`matiere.photos[${i}].base = ${JSON.stringify(p?.base)} (un nom de fichier sans extension attendu)`)
  })
  const d = EXP.devis
  comparer('devis', cles(F.devis), cles(d))
  const projets = Array.isArray(d?.projets) ? d.projets : []
  for (const p of CMD.matiere.prestations) if (!projets.includes(p)) e.push(`devis.projets ne reprend pas la prestation déclarée « ${p} »`)
  const autres = projets.filter((p) => !CMD.matiere.prestations.includes(p))
  if (autres.length > 1 || autres.some((p) => !/^autre\b/i.test(String(p)))) e.push(`devis.projets porte ${JSON.stringify(autres)} : seules les prestations déclarées, plus au plus une entrée « Autre … »`)
  if (!Array.isArray(d?.delais) || !d.delais.length || d.delais.some((x) => typeof x !== 'string' || !x.trim())) e.push('devis.delais : une liste de libellés attendue')
  return { echecs: e, detail: `clés de la fixture 025 (+ matiere.prestations) exactement ; id, état, slug, nom, e-mail, téléphone public, métier, communes, domaine, matière à l'identique ; ${VALIDES.length} photos valides dans l'ordre ; devis = les ${CMD.matiere.prestations.length} prestations déclarées + « Autre »` }
})

// ── EX-3 : les photos ────────────────────────────────────────────────────────────────────────────────────────────────────
const ORIGINAUX = {}
for (const f of ['escalier.jpg', 'bibliotheque.jpg', 'etabli.jpg']) ORIGINAUX[f] = await sharp(path.join(C, 'photos-source', f)).metadata()
if (veut('EX-3')) await s.critere('EX-3', async () => {
  const e = []
  if (!exifAvecGps(ORIGINAUX['escalier.jpg'].exif)) e.push('jeu d\'essai abîmé : escalier.jpg ne porte plus de GPS en EXIF (node .orchestre/preuves/026-029/outils/fabriquer-photos.mjs)')
  if (!/faux\.jpg/.test(r1.sortie)) e.push('faux.jpg (un texte nommé .jpg) n\'est pas listé comme refusé dans la sortie')
  if (!EXP) return { echecs: [...e, exporte ? 'commande.json illisible' : sansExport] }
  const fichiers = lireArbre(OUT)
  if (fichiers.some((f) => /faux/i.test(f))) e.push(`un fichier tiré de faux.jpg est sorti : ${fichiers.find((f) => /faux/i.test(f))}`)
  const bases = (EXP.matiere?.photos ?? []).map((p) => ({ base: p.base, orig: ORIGINAUX[nomDeUrl(p.url)] }))
  let n = 0
  for (const { base, orig } of bases) {
    if (!orig) { e.push(`photo « ${base} » : URL d'origine inconnue du jeu d'essai`); continue }
    const dues = [480, 960, 1600].filter((l) => l <= orig.width)
    const presentes = [...new Set(fichiers.filter((f) => new RegExp(`^photos/${base}-(\\d+)\\.(webp|avif)$`).test(f)).map((f) => Number(/-(\d+)\.\w+$/.exec(f)[1])))].sort((a, b) => a - b)
    if (presentes.join(',') !== dues.join(',')) e.push(`${base} : largeurs ${presentes.join(', ') || 'aucune'}, ${dues.join(', ')} attendues (original de ${orig.width} px)`)
    for (const l of dues) for (const ext of ['webp', 'avif']) {
      const f = path.join(OUT, 'photos', `${base}-${l}.${ext}`)
      if (!fs.existsSync(f)) { e.push(`photos/${base}-${l}.${ext} manque`); continue }
      try {
        const m = await sharp(f).metadata()
        n++
        if (m.format !== (ext === 'webp' ? 'webp' : 'heif') && m.format !== ext) e.push(`photos/${base}-${l}.${ext} est un ${m.format}`)
        if (m.width !== l) e.push(`photos/${base}-${l}.${ext} fait ${m.width} px de large, ${l} déclarés`)
        if (m.width > orig.width) e.push(`photos/${base}-${l}.${ext} (${m.width} px) dépasse l'original (${orig.width} px)`)
      } catch (err) { e.push(`photos/${base}-${l}.${ext} illisible par sharp : ${premiereLigne(err)}`) }
    }
  }
  // Aucune métadonnée : sur CHAQUE fichier produit (une copie de l'original porterait le GPS).
  let exifs = 0
  for (const f of fichiers.filter((x) => !x.endsWith('.json'))) {
    try { const m = await sharp(path.join(OUT, f)).metadata(); exifs++; if (m.exif) e.push(`${f} garde un bloc EXIF (${m.exif.length} octets${exifAvecGps(m.exif) ? ', GPS compris' : ''})`) } catch { e.push(`${f} : un fichier produit qui n'est pas une image`) }
  }
  return { echecs: e, detail: `faux.jpg refusé et listé ; ${bases.length} photos valides, ${n} variantes relues par sharp aux largeurs dues (escalier 1700 px → 480/960/1600, les autres → 480/960) ; ${exifs} fichier(s) produit(s) sans EXIF (escalier.jpg portait un GPS)` }
})

// ── EX-4 : attributions.json ─────────────────────────────────────────────────────────────────────────────────────────────
if (veut('EX-4')) await s.critere('EX-4', async () => {
  const e = [...partNrEx4().echecs]
  if (!EXP) return { echecs: [...e, exporte ? 'commande.json illisible' : sansExport] }
  if (!Array.isArray(ATTR)) return { echecs: [...e, 'photos/attributions.json absent ou illisible'] }
  const images = lireArbre(path.join(OUT, 'photos')).filter((f) => /\.(webp|avif|png|jpe?g)$/i.test(f))
  const sansAttr = images.filter((i) => !ATTR.some((a) => a?.fichier === `images/${i}` || a?.fichier === i))
  if (sansAttr.length) e.push(`${sansAttr.length} fichier(s) sans attribution (règle de site-qa, fichier = images/<nom>) : ${auPlus(sansAttr, 3)}`)
  const photos = EXP.matiere?.photos ?? []
  for (const p of photos) if (!ATTR.some((a) => a?.base === p.base)) e.push(`la base ${p.base} n'a aucune entrée`)
  const CLES = ['fichier', 'base', 'largeur', 'hauteur', 'largeurs', 'legende', 'alt', 'auteur', 'licence', 'source', 'modifiee']
  const auteurs = [ART.nom, `${CMD.matiere.artisan.prenom} ${CMD.matiere.artisan.nom}`]
  ATTR.forEach((a, i) => {
    const ou = `attributions[${i}] (${court(a?.fichier, 40)})`
    const manque = CLES.filter((k) => a?.[k] === undefined)
    if (manque.length) e.push(`${ou} : ${manque.join(', ')} manque(nt)`)
    if (!REGLE.erreur && !REGLE.attributionCredible(a ?? {})) e.push(`${ou} refusée par attributionCredible de ${REGLE.source}`)
    if (a?.licence !== 'propriétaire') e.push(`${ou} : licence ${JSON.stringify(a?.licence)}, « propriétaire » attendue`)
    if (a?.modifiee !== 'Oui — recadrée et compressée par Presti') e.push(`${ou} : modifiee ${JSON.stringify(a?.modifiee)}`)
    if (!auteurs.includes(a?.auteur)) e.push(`${ou} : auteur ${JSON.stringify(a?.auteur)}, le nom de l'artisan attendu`)
    const p = photos.find((x) => x.base === a?.base)
    if (!p) e.push(`${ou} : base ${JSON.stringify(a?.base)} absente de matiere.photos`)
    else {
      if (a.source !== p.url) e.push(`${ou} : source ${court(a.source, 60)}, l'URL d'origine ${court(p.url, 60)} attendue`)
      if (a.legende !== p.legende) e.push(`${ou} : legende ${JSON.stringify(a.legende)}, ${JSON.stringify(p.legende)} attendue`)
    }
  })
  return { echecs: e, detail: `${ATTR.length} entrées pour ${photos.length} bases et ${images.length} fichiers, toutes « propriétaire », source = l'URL d'origine, auteur = l'artisan, acceptées par attributionCredible de ${REGLE.source}` }
})

// ── EX-5 : les sorties refusées ──────────────────────────────────────────────────────────────────────────────────────────
if (veut('EX-5')) await s.critere('EX-5', async () => {
  const e = []
  const avant = gitStatusPublic(RAC)
  const sousPublic = path.join(RAC, 'public', 'sites-demo', 'essai-026-029-ex5')
  const horsTravail = path.join(RAC, 'scripts', 'essai-026-029-ex5')
  for (const d of [sousPublic, horsTravail]) if (fs.existsSync(d)) return { echecs: [`${rel(d)} existe déjà : le juge ne peut pas prouver que rien n'y est écrit`] }
  for (const [quoi, d] of [['sous public/', sousPublic], ['dans le dépôt hors de .orchestre/travail/', horsTravail]]) {
    const r = await exporter(`sortie ${quoi}`, { sortie: d })
    if (r.code !== 2) e.push(`--sortie ${quoi} : code ${r.code}, 2 attendu`)
    if (fs.existsSync(d)) { e.push(`--sortie ${quoi} : ${rel(d)} a été créé (${lireArbre(d).length} fichier(s))`); fs.rmSync(d, { recursive: true, force: true }) }
  }
  const apres = gitStatusPublic(RAC)
  if (avant.ok && apres.ok && avant.texte !== apres.texte) e.push('git status --porcelain public/ a changé pendant le jugement')
  return { echecs: e, detail: `--sortie sous public/ → code 2, rien d'écrit ; --sortie dans scripts/ → code 2, rien d'écrit ; git status --porcelain public/ inchangé${avant.ok ? '' : ` (lu hors git : ${avant.erreur})`}` }
})

// ── EX-6 : dossier incomplet ─────────────────────────────────────────────────────────────────────────────────────────────
if (veut('EX-6')) await s.critere('EX-6', async () => {
  const e = []
  const cas = [
    { nom: 'sans prestation', f: (j) => { j.commande.matiere.prestations = [] } },
    { nom: 'sans matiere.artisan', f: (j) => { delete j.commande.matiere.artisan } },
  ].map((c) => ({ ...c, fichier: copieJeu(TRAV, `ex6-${c.nom.replace(/\W+/g, '-')}.json`, c.f), sortie: path.join(TRAV, `ex6-${c.nom.replace(/\W+/g, '-')}`) }))
  // erreursFabrication de la racine, calculée dans un enfant (cwd = racine : « @/… » s'y résout).
  const calc = await lancerAsync(process.execPath, ['--import', LOADER_URL, '--input-type=module', '-e', `import fs from 'node:fs'; const { erreursFabrication } = await import(${JSON.stringify(new URL('lib/siteCommande.ts', `file:///${path.resolve(RAC).split(path.sep).join('/')}/`).href)}); console.log('@@EX6@@' + JSON.stringify(${JSON.stringify(cas.map((c) => c.fichier))}.map((f) => erreursFabrication(JSON.parse(fs.readFileSync(f, 'utf8')).commande))))`], { cwd: RAC, env: envEnfant(), timeout: 120_000 })
  const ligne = calc.stdout.split(/\r?\n/).find((l) => l.startsWith('@@EX6@@'))
  if (!ligne) return { echecs: [`erreursFabrication de ${rel(RAC)}/lib/siteCommande.ts non calculée : ${court(calc.sortie, 160)}`] }
  const dues = JSON.parse(ligne.slice(7))
  for (const [k, c] of cas.entries()) {
    const r = await exporter(c.nom, { depuis: c.fichier, sortie: c.sortie })
    if (r.code !== 3) e.push(`${c.nom} : code ${r.code}, 3 attendu`)
    if (!dues[k].length) e.push(`${c.nom} : erreursFabrication rend [] sur ce dossier (jeu d'essai ou 026-030 à revoir)`)
    for (const err of dues[k]) if (!r.sortie.includes(err)) e.push(`${c.nom} : l'erreur « ${court(err, 60)} » n'est pas listée`)
    for (const err of dues[1 - k].filter((x) => !dues[k].includes(x))) if (r.sortie.includes(err)) e.push(`${c.nom} : l'erreur « ${court(err, 60)} », qui ne s'applique pas, est listée`)
    const ecrits = lireArbre(c.sortie)
    if (ecrits.length) e.push(`${c.nom} : ${ecrits.length} fichier(s) écrit(s) dans la sortie (${auPlus(ecrits, 2)})`)
  }
  return { echecs: e, detail: `sans prestation → code 3, ${dues[0].length} erreur(s) de erreursFabrication listée(s) ; sans matiere.artisan → code 3, ${dues[1].length} erreur(s) listée(s) ; aucune erreur de l'autre cas ; sorties vides` }
})

// ── EX-7 : les photos hors du dossier de l'artisan ───────────────────────────────────────────────────────────────────────
if (veut('EX-7')) await s.critere('EX-7', () => {
  const e = []
  for (const n of ['voisin.jpg', 'ailleurs.jpg']) if (!r1.sortie.includes(n)) e.push(`${n} n'est pas listée comme refusée`)
  const interdites = serveur.requetes.filter((q) => /voisin\.jpg|ailleurs\.jpg/.test(q) || q.includes(ID_AUTRE))
  if (interdites.length) e.push(`le serveur du juge a reçu ${interdites.length} requête(s) pour une photo refusée : ${auPlus(interdites, 2)}`)
  const horsDossier = serveur.requetes.filter((q) => !q.includes(`/${ID_ARTISAN}/`))
  if (horsDossier.length) e.push(`requête(s) hors de <artisan_id>/ : ${auPlus(horsDossier, 2)}`)
  const fuites = piege.lire()
  if (fuites.length) e.push(`appel(s) réseau hors 127.0.0.1 : ${auPlus(fuites, 2)}`)
  return { echecs: e, detail: `voisin.jpg (autre artisan) et ailleurs.jpg (autre hôte) refusées et listées ; ${serveur.requetes.length} requête(s) reçues, toutes sous ${ID_ARTISAN}/, aucune pour elles ; 0 appel réseau hors 127.0.0.1` }
})

// ── EX-9 : le générateur accepte l'export ────────────────────────────────────────────────────────────────────────────────
let prealableManquant = false
if (veut('EX-9')) await s.critere('EX-9', async () => {
  if (!fichePass('025-03')) { prealableManquant = true; return { echecs: ['non jugé : 025-03 attendue (generer.mjs --source)'] } }
  if (!EXP) return { echecs: [exporte ? 'commande.json illisible' : sansExport] }
  const source = path.join(TRAV, 'ex9-source'), site = path.join(TRAV, 'ex9-site')
  fs.cpSync(OUT, source, { recursive: true })
  fs.copyFileSync(path.join(R, 'scripts', 'fixtures', '025', 'commande-exemple', 'contenu.json'), path.join(source, 'contenu.json'))
  const r = await lancerAsync(process.execPath, ['public/sites-demo/generer.mjs', `--source=${source}`, `--sortie=${site}`], { cwd: RAC, env: envEnfant(piege.env), timeout: 300_000 })
  return { echecs: r.code === 0 ? [] : [`generer.mjs --source : code ${r.code} — ${court(r.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 220)}`], detail: `generer.mjs --source=<export + contenu.json de la fixture 025> → code 0 en ${r.duree.toFixed(1)} s, ${lireArbre(site).length} fichier(s)` }
})

// ── EX-8 : aucune donnée personnelle dans les sorties ────────────────────────────────────────────────────────────────────
if (veut('EX-8')) await s.critere('EX-8', () => {
  const e = []
  const chiffres = (t) => String(t).replace(/\D/g, '')
  const tels = [ART.tel_public, ART.tel].filter(Boolean)
  const interdits = [['l\'adresse', CMD.matiere.adresse], ['le SIREN', CMD.matiere.siren], ['le nom', ART.nom], ['le nom', 'Témoin-Vingt-Six'], ...tels.map((t) => ['le téléphone', t])]
  for (const { nom, sortie } of sorties) {
    for (const [quoi, v] of interdits) if (sortie.includes(v)) e.push(`${nom} : ${quoi} (« ${v} ») dans la sortie`)
    const suites = (sortie.match(/\+?\d(?:[\d .-]*\d)?/g) ?? []).map(chiffres)
    for (const t of tels) { const c = chiffres(t); if (suites.some((x) => x.includes(c) || x.includes(`33${c.slice(1)}`))) e.push(`${nom} : le téléphone (${c.length} chiffres, espacés ou non) dans la sortie`) }
  }
  return { echecs: [...new Set(e)], detail: `${sorties.length} lancement(s) relus (sorties standard et d'erreur) : ni adresse, ni téléphone, ni SIREN, ni nom du jeu d'essai` }
})

await serveur.fermer()
finir(prealableManquant ? 2 : 0)
