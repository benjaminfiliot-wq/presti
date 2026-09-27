// scripts/bus-livraison-qa.mjs — juge de la livraison branchée sur l'horloge du bus et de la consommation de la sortie de
// l'usine (fiche 026-026, lot D ; critères BL de 026-141), écrit par Claude Code AVANT le code qu'il juge. L'exécutant
// (Codex) qui le lance n'y touche jamais (CLAUDE.md:23). Réécrit en entier le 27/09 : la version du 26/09 (Gemini) ne
// testait que l'existence de deux fichiers.
//
//   node --import ./scripts/ts-loader.mjs scripts/bus-livraison-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   Préalable (hors --temoin) : scripts/fixtures/026-horloge-bus/contrat-ops.json (026-009 ; celui de la racine si elle a un
//                 dossier scripts/, sinon celui du dépôt) et app/api/agents/tic/route.ts (026-049) existent, et le contrat
//                 porte ops_interrupteur, ops_tache_clore et ops_battement. Sinon : « ❌ BL-1 préalable absent … », code 2.
//   --racine=<d>  importe <d>/lib/siteLivraisonBus.ts, <d>/lib/siteLivraison.ts, <d>/lib/siteLivraisonUsine.ts et la route
//                 <d>/app/api/agents/tic/route.ts (défaut : le dépôt). « La version d'avant la fiche » du tic (BL-4) se lit
//                 dans l'historique du dépôt git de la racine si elle en a un (maquette), sinon dans celui du dépôt.
//   --temoin      seulement la non-régression : BL-5 (NR), l'appel quotidien de tourLivraison dans le cron des relances ;
//                 et BL-PV.
//   --reel        Claude Code seulement, après le déploiement de 026-141 et l'application de 0101 : BL-7, deux lectures de
//                 passages_cron (ligne livraison) à 16 min d'intervalle ; aucune ligne créée. Code 2 si 026-141 n'est pas
//                 PASS ou si une variable manque.
//
// Le code est importé dans des PROCESSUS ENFANTS (--enfant=complet, tic, usine) avec les doublures de d/doublures.mjs :
// base en mémoire (requêtes consignées avec leurs filtres), stockage en mémoire, et rpc vers le FAUX POSTGREST de
// scripts/lib/faux-postgrest.mjs (026-038, en lecture seule), démarré par l'enfant sur 127.0.0.1 : il valide chaque nom de
// fonction, chaque nom de paramètre et chaque type contre contrat-ops.json. Pour tourLivraison, lib/siteRetrait,
// lib/siteDossier, lib/siteGenerationDistante et lib/siteLivraisonUsine sont des espions ; pour le tic, chaque module local
// qu'il importe est doublé par un espion généré (sous .orchestre/travail/bus-livraison-qa/), tourLivraison compris. L'horloge
// est scripts/lib/horloge-simulee.mjs (026-045, figer) quand elle existe dans le dépôt, sinon figerHorloge de ../commun.mjs.
// Aucun réseau hors 127.0.0.1.
//
// Contrats que ce juge fixe pour 026-141 (d/usine/, d/commandes.json) :
//   busEnPause(), cloreTacheLivraison(commandeId, etat), battementLivreur() appelées SANS argument de plus passent par
//     supabaseAdmin.rpc (défaut) ; tourLivraison(deps) sans deps.enPause lit la pause par busEnPause ;
//   consommerSortiesUsine({ stockage, maintenant, limite }) ; le bucket usine : <tache>/entree/commande.json (l'export de la
//     commande, avec « commande » = son id, et « essai: true » pour une tâche d'essai), <tache>/sortie/manifeste.json
//     ({ fichiers: [{ nom, type }] }), <tache>/sortie/rapport-qa.json ({ commande, verdict: 'PASS' | 'FAIL', criteres }),
//     <tache>/sortie/<nom> ; l'index commandes/<commande>.json ; un événement = ops_evenement_ajouter (0097) de p_type
//     sortie_usine_refusee, sortie_usine_ignoree ou sortie_usine_incomplete ;
//   le tic : GET(req) avec « Authorization: Bearer <CRON_SECRET> ».
//
// Sortie : une ligne par critère, puis « bus-livraison-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou si un préalable manque. Écriture seulement sous .orchestre/travail/bus-livraison-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, dossierTravail, lancerEnfant, resultatEnfant,
  importer, jugerDans, jugerPreuvesVides, sansCommentaires, diffLignes, blocs, blanchirImports, importsDe, typecheck,
  chargerEnvLocal, fichePass, figerHorloge, exigerSousTravail, TRAVAIL,
} from './fixtures/026-livraison-tresor/commun.mjs'
import {
  D_DIR, DOUBLURES_D, preparerEnfantD, baseAvantD, positionsAppel, dansTry, sousCatchChaine, conditionsEnglobantes, corpsFonctionD,
  apparier, relR,
} from './fixtures/026-livraison-tresor/d/commun-d.mjs'

const JUGE = 'bus-livraison-qa'
const FICHE = '026-141'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine
const BUS = 'lib/siteLivraisonBus.ts', LIVRAISON = 'lib/siteLivraison.ts', USINE = 'lib/siteLivraisonUsine.ts'
const TIC = 'app/api/agents/tic/route.ts', RELANCES = 'app/api/cron/relances/route.ts'
const CONTRAT_REL = 'scripts/fixtures/026-horloge-bus/contrat-ops.json'
const FONCTIONS = ['ops_interrupteur', 'ops_tache_clore', 'ops_battement']
const DOUBLES = { 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/email': 'email', 'lib/limites': 'limites', 'lib/alertes': 'alertes', 'lib/flags': 'flags', 'lib/vercelDomains': 'vercelDomains', 'lib/direction/garde': 'garde' }
const DOUBLES_TOUR = { ...DOUBLES, 'lib/siteRetrait': 'siteRetrait', 'lib/siteDossier': 'siteDossier', 'lib/siteGenerationDistante': 'siteGenerationDistante', 'lib/siteLivraisonUsine': 'siteLivraisonUsine', 'lib/siteAchatPublic': 'siteAchatPublic' }
const MAINTENANT = '2026-10-14T10:00:00.000Z'
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' }
const contratChemin = (racine) => (fs.existsSync(path.join(racine, 'scripts')) ? path.join(racine, CONTRAT_REL) : path.join(R, CONTRAT_REL))
const TRAV = path.join(TRAVAIL, JUGE)

/** Démarre le faux PostgREST de scripts/lib/faux-postgrest.mjs (celui du dépôt) avec le contrat de la racine. */
async function fauxPostgrest(reponses = {}) {
  const { demarrer, erreurPg } = await import(pathToFileURL(path.join(R, 'scripts', 'lib', 'faux-postgrest.mjs')).href)
  const contrat = JSON.parse(fs.readFileSync(contratChemin(RAC), 'utf8'))
  const f = await demarrer({ contrat, reponses })
  return { ...f, erreurPg }
}
/** L'horloge de 026-045 si elle existe (figer), sinon figerHorloge ; → { poser(iso), nom }. */
async function horloge() {
  const h = path.join(R, 'scripts', 'lib', 'horloge-simulee.mjs')
  if (fs.existsSync(h)) {
    try { const m = await import(pathToFileURL(h).href); if (typeof m.figer === 'function') return { poser: (iso) => m.figer(iso), nom: 'scripts/lib/horloge-simulee.mjs (figer)' } } catch { /* repli */ }
  }
  let liberer = () => {}
  return { poser: (iso) => { liberer(); liberer = figerHorloge(iso) }, nom: 'figerHorloge de commun.mjs (scripts/lib/horloge-simulee.mjs absente)' }
}

// ═══ Enfant « complet » : BL-1, BL-2, BL-3 (et la pause de BL-8) ═══════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  const clock = await horloge()
  clock.poser(MAINTENANT)
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles: DOUBLES_TOUR })
  const E = D.etat, X = D.etatD
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {} }
  const reponses = {}
  const faux = await fauxPostgrest(reponses)
  X.rpc.url = faux.url
  const appels = (f) => faux.appels.filter((a) => a.fonction === f)
  const vider = () => { faux.appels.length = 0; for (const k of Object.keys(reponses)) delete reponses[k] }
  const bus = await importer(RAC, BUS)
  const B = bus.m ?? {}

  await jugerDans(res, 'BL-1', async () => {
    const e = []
    if (!bus.m) return { echecs: [`${BUS} ne s'importe pas : ${bus.erreur}`] }
    for (const n of ['busEnPause', 'cloreTacheLivraison', 'battementLivreur']) if (typeof B[n] !== 'function') e.push(`${BUS} n'exporte pas la fonction ${n}`)
    if (e.length) return { echecs: e }
    const ID = 'd0260000-0000-4000-8000-00000000b001'
    vider(); reponses.ops_interrupteur = false; reponses.ops_tache_clore = 'faite'
    await B.busEnPause(); await B.cloreTacheLivraison(ID, 'generee'); await B.battementLivreur()
    const attendus = [
      ['ops_interrupteur', { p_nom: 'pause_generale' }],
      ['ops_tache_clore', { p_agent: 'livreur', p_cle: `livrer_site:${ID}`, p_preuve_url: `supabase://sites_commandes/${ID}#generee` }],
      ['ops_battement', { p_nom: 'livreur' }],
    ]
    for (const [f, p] of attendus) {
      const a = appels(f)
      if (a.length !== 1) { e.push(`${f} appelée ${a.length} fois, une attendue (appels : ${court(faux.appels.map((x) => x.fonction).join(', ') || 'aucun', 100)})`); continue }
      if (a[0].faute) e.push(`${f} refusée par le faux PostgREST (${a[0].faute}) : paramètres ${JSON.stringify(a[0].params)}`)
      else if (JSON.stringify(a[0].params) !== JSON.stringify(p) && JSON.stringify(Object.fromEntries(Object.entries(a[0].params).sort())) !== JSON.stringify(Object.fromEntries(Object.entries(p).sort()))) e.push(`${f} : paramètres ${JSON.stringify(a[0].params)}, ${JSON.stringify(p)} attendus`)
    }
    for (const a of faux.appels) if (!FONCTIONS.includes(a.fonction)) e.push(`appel à ${a.fonction}, hors des trois fonctions du tableau`)
    const src = lireRacine(RAC, BUS) ?? ''
    if (/<ops_/.test(src)) e.push(`${BUS} contient encore un emplacement « <ops_ »`)
    return { echecs: e, detail: `${BUS} exporte busEnPause, cloreTacheLivraison et battementLivreur ; chacune appelle par supabaseAdmin.rpc le nom exact du contrat (${FONCTIONS.join(', ')}), avec des paramètres que le faux PostgREST valide contre ${CONTRAT_REL} : { p_nom: 'pause_generale' }, { p_agent: 'livreur', p_cle: 'livrer_site:<id>', p_preuve_url: 'supabase://sites_commandes/<id>#generee' }, { p_nom: 'livreur' } ; aucun « <ops_ » dans le source` }
  }, suivi)

  await jugerDans(res, 'BL-2', async () => {
    const e = []
    if (typeof B.busEnPause !== 'function') return { echecs: ['busEnPause absente (BL-1)'] }
    const cas = [
      ['réponse false (pas en pause)', () => { reponses.ops_interrupteur = false }, false],
      ['réponse true', () => { reponses.ops_interrupteur = true }, true],
      ['réponse null', () => { reponses.ops_interrupteur = null }, true],
      ['erreur PostgREST (400)', () => { reponses.ops_interrupteur = () => faux.erreurPg('ops:interrupteur', 'P0001') }, true],
      ['erreur serveur (500)', () => { reponses.ops_interrupteur = () => ({ status: 500, body: { code: 'XX000', message: 'panne' } }) }, true],
      ['rpc qui lève', () => { X.rpc.leve = true }, true],
    ]
    for (const [nom, poser, voulu] of cas) {
      vider(); X.rpc.leve = false; poser()
      let r
      try { r = await B.busEnPause() } catch (err) { r = `lève (${premiereLigne(err)})` }
      X.rpc.leve = false
      if (r !== voulu) e.push(`busEnPause, ${nom} : ${JSON.stringify(r)}, ${voulu} attendu`)
    }
    return { echecs: e, detail: 'busEnPause : faux seulement sur une réponse explicite false ; vrai sur true, null, une erreur PostgREST (400), une erreur serveur (500) et un rpc qui lève' }
  }, suivi)

  const tour = await importer(RAC, LIVRAISON)
  let pauseUsine = null
  await jugerDans(res, 'BL-3', async () => {
    const e = []
    if (!tour.m || typeof tour.m.tourLivraison !== 'function') return { echecs: [`${LIVRAISON} : tourLivraison ne s'importe pas (${tour.erreur ?? 'absente'})`] }
    const PAYEE = { id: 'd0260000-0000-4000-8000-00000000b101', etat: 'payee', email: 'bl.payee@presti-test.invalid', domaine_mode: 'aucun', domaine: null, paye_le: '2026-10-14T08:00:00.000Z', genere_le: null, valide_le: null, en_ligne_le: null, courriels: {}, metier: 'plombier', communes: ['Bruz'], metiers_secondaires: [], matiere: {}, modifie_le: '2026-10-14T08:00:00.000Z' }
    const GENEREE = { ...PAYEE, id: 'd0260000-0000-4000-8000-00000000b102', etat: 'generee', email: 'bl.generee@presti-test.invalid', genere_le: '2026-10-13T09:00:00.000Z', courriels: { payee: '2026-10-12T08:00:00.000Z', generee: '2026-10-13T09:05:00.000Z' }, modifie_le: '2026-10-13T09:00:00.000Z' }
    const DU = { id: 'd0260000-0000-4000-8000-00000000b1ff', etat: 'en_ligne', email: 'bl.du@presti-test.invalid', domaine: null, compte_supprime_le: '2025-01-01T00:00:00.000Z' }
    const lancerTour = async ({ pause, pannes = [] }) => {
      D.reinitialiserD({ tables: { sites_commandes: structuredClone([PAYEE, GENEREE]) }, retraitsDus: [DU], pannes })
      vider()
      reponses.ops_interrupteur = pause
      reponses.ops_tache_clore = 'absente'
      let bilan = null, leve = null
      try { bilan = await tour.m.tourLivraison({ base: D.supabaseAdmin, envoyer: D.sendEmail, statutDomaine: D.getStatus, maintenant: () => new Date(MAINTENANT) }) } catch (err) { leve = premiereLigne(err) }
      const n = (nom) => X.espions.filter((x) => x.nom === nom).length
      return { bilan, leve, retirer: n('retirer'), generation: n('demanderGeneration'), usine: n('consommerSortiesUsine'), emails: E.emails.filter((x) => x.genre === 'sendEmail').map((x) => x.to), clore: appels('ops_tache_clore'), battement: appels('ops_battement'), interrupteur: appels('ops_interrupteur') }
    }
    // en pause (la pause lue par busEnPause, sans deps.enPause)
    const a = await lancerTour({ pause: true })
    if (a.leve) e.push(`en pause : tourLivraison lève (${a.leve})`)
    if (!a.interrupteur.length) e.push('tourLivraison ne lit pas la pause par busEnPause (aucun ops_interrupteur) quand deps.enPause est absent')
    if (a.retirer || a.generation) e.push(`en pause : retirer ×${a.retirer}, demanderGeneration ×${a.generation} ; aucun attendu`)
    if (!a.emails.includes(PAYEE.email)) e.push(`en pause : l'e-mail de la commande payée n'est pas parti (e-mails : ${JSON.stringify(a.emails)})`)
    pauseUsine = a.usine
    // hors pause
    const b = await lancerTour({ pause: false })
    if (b.leve) e.push(`hors pause : tourLivraison lève (${b.leve})`)
    const cloreG = b.clore.filter((x) => x.params?.p_cle === `livrer_site:${GENEREE.id}`)
    if (cloreG.length !== 1) e.push(`hors pause : ${cloreG.length} ops_tache_clore pour la commande generee, exactement un attendu`)
    else {
      const p = cloreG[0].params
      if (p.p_agent !== 'livreur' || p.p_preuve_url !== `supabase://sites_commandes/${GENEREE.id}#generee` || cloreG[0].faute) e.push(`hors pause : ops_tache_clore ${JSON.stringify(p)}${cloreG[0].faute ? ` (refusé : ${cloreG[0].faute})` : ''}`)
    }
    if (b.clore.some((x) => String(x.params?.p_cle ?? '').includes(PAYEE.id))) e.push('hors pause : une commande payee déclenche ops_tache_clore')
    if (b.bilan && b.bilan.erreurs !== 0) e.push(`hors pause, réponse « absente » : bilan.erreurs = ${b.bilan.erreurs}, 0 attendu (absente n'est pas un échec)`)
    if (b.battement.length !== 1 || b.battement[0].params?.p_nom !== 'livreur' || b.battement[0].faute) e.push(`tour qui aboutit : ops_battement ${JSON.stringify(b.battement.map((x) => x.params))}, une fois { p_nom: 'livreur' } attendu`)
    // un tour dont une étape échoue
    const c = await lancerTour({ pause: false, pannes: ['sites_commandes'] })
    if (c.leve) e.push(`tour en échec : tourLivraison lève (${c.leve})`)
    if (c.bilan && !(c.bilan.erreurs > 0)) e.push(`tour dont la base est en panne : bilan.erreurs = ${c.bilan?.erreurs}, > 0 attendu`)
    if (c.battement.length) e.push(`tour dont une étape a échoué : ops_battement appelée ${c.battement.length} fois, jamais attendu`)
    return { echecs: e, detail: `tourLivraison lit la pause par busEnPause ; en pause, ni retirer ni demanderGeneration, mais l'e-mail de la payée part ; hors pause, la generee déclenche exactement un ops_tache_clore { p_agent: 'livreur', p_cle: 'livrer_site:<id>', p_preuve_url: 'supabase://sites_commandes/<id>#generee' }, la payée rien ; « absente » ne compte pas en échec ; un tour qui aboutit bat une fois ({ p_nom: 'livreur' }), un tour en échec ne bat pas` }
  }, suivi)
  res.pauseUsine = pauseUsine
  await faux.arreter()
  resultatEnfant(JUGE, res)
} else if (o.enfant === 'tic') {
// ═══ Enfant « tic » : BL-4 exécuté (10 h 15 contre 10 h 16) ══════════════════════════════════════════════════════════════
  const clock = await horloge()
  clock.poser('2026-10-14T10:15:00.000Z')
  const doubles = JSON.parse(fs.readFileSync(path.join(TRAV, 'tic', 'doubles.json'), 'utf8'))
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles, doublures: path.join(TRAV, 'tic', 'doublures-tic.mjs') })
  const X = D.etatD
  const faux = await fauxPostgrest({})
  X.rpc.url = faux.url
  const res = { criteres: {}, horloge: clock.nom }
  process.env.CRON_SECRET = 'secret-du-juge-bl4'
  const t = await importer(RAC, TIC)
  await jugerDans(res, 'BL-4', async () => {
    if (!t.m || typeof t.m.GET !== 'function') return { echecs: [`${TIC} : GET ne s'importe pas (${t.erreur ?? 'absente'})`] }
    const e = []
    const appel = async (iso) => {
      clock.poser(iso)
      const avant = X.espions.filter((x) => x.nom === 'tourLivraison').length
      let statut = null
      try { const r = await t.m.GET(new Request('https://prestiapp.fr/api/agents/tic', { headers: { authorization: 'Bearer secret-du-juge-bl4', 'x-cron-secret': 'secret-du-juge-bl4' } })); statut = r?.status } catch (err) { statut = `lève (${premiereLigne(err)})` }
      return { statut, n: X.espions.filter((x) => x.nom === 'tourLivraison').length - avant }
    }
    const a = await appel('2026-10-14T10:15:00.000Z'), b = await appel('2026-10-14T10:16:00.000Z'), c = await appel('2026-10-14T10:30:00.000Z')
    if (a.n !== 1) e.push(`à 10 h 15 : tourLivraison appelée ${a.n} fois (statut ${a.statut}), une attendue`)
    if (b.n !== 0) e.push(`à 10 h 16 : tourLivraison appelée ${b.n} fois, jamais attendu`)
    if (c.n !== 1) e.push(`à 10 h 30 : tourLivraison appelée ${c.n} fois, une attendue`)
    return { echecs: e, detail: `exécuté (${clock.nom}) : tourLivraison appelée à 10 h 15 et 10 h 30, pas à 10 h 16` }
  }, { reseau, inconnues: [] })
  await faux.arreter()
  resultatEnfant(JUGE, res)
} else if (o.enfant === 'usine') {
// ═══ Enfant « usine » : BL-8 et la part exécutée de BL-9 ══════════════════════════════════════════════════════════════════
  const { D, reseau } = await preparerEnfantD({ racines: [RAC], doubles: DOUBLES })
  const E = D.etat, X = D.etatD
  const faux = await fauxPostgrest({})
  X.rpc.url = faux.url
  const res = { criteres: {} }
  const u = await importer(RAC, USINE)
  const sortie = []
  const console0 = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug }
  const capter = () => { for (const k of Object.keys(console0)) console[k] = (...a) => sortie.push(a.map((x) => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x) } catch { return String(x) } })())).join(' ')) }
  const rendre = () => { for (const [k, f] of Object.entries(console0)) console[k] = f }
  const lireCas = (cas) => {
    const base = path.join(D_DIR, 'usine', cas), out = {}
    const rec = (rel) => { for (const e of fs.readdirSync(path.join(base, rel), { withFileTypes: true })) { const r = rel ? `${rel}/${e.name}` : e.name; if (e.isDirectory()) rec(r); else out[r] = fs.readFileSync(path.join(base, r)) } }
    rec('')
    return out
  }
  const PII = (() => { const c = JSON.parse(lireCas('complete')['entree/commande.json'].toString('utf8')); return [c.nom, c.email, c.telephone, c.adresse] })()
  let k = 0
  const scenario = (cas, { etat = 'payee', essai = false } = {}) => {
    k++
    const tache = `d0260000-0000-4000-8000-0000000c${String(k).padStart(4, '0')}`
    const commande = `d0260000-0000-4000-8000-0000000d${String(k).padStart(4, '0')}`
    const fichiers = lireCas(cas)
    const usine = {}
    for (const [rel, octets] of Object.entries(fichiers)) {
      let b = octets
      if (rel === 'entree/commande.json') { const j = JSON.parse(b.toString('utf8')); j.commande = commande; j.id = commande; if (essai) j.essai = true; b = Buffer.from(JSON.stringify(j, null, 1)) }
      if (rel === 'sortie/rapport-qa.json') { const j = JSON.parse(b.toString('utf8')); j.commande = commande; b = Buffer.from(JSON.stringify(j, null, 1)) }
      usine[`${tache}/${rel}`] = { octets: b, type: 'application/octet-stream' }
    }
    usine[`commandes/${commande}.json`] = { octets: Buffer.from(JSON.stringify({ tache })), type: 'application/json' }
    const manifeste = JSON.parse(fichiers['sortie/manifeste.json'].toString('utf8')).fichiers
    return { cas, tache, commande, fichiers, usine, manifeste, ligne: { id: commande, etat, email: 'bl8.temoin@presti-test.invalid', apercu_jeton: null, genere_le: etat === 'payee' ? null : '2026-10-10T08:00:00.000Z', modifie_le: '2026-10-10T08:00:00.000Z' } }
  }
  const poser = (sc) => { D.reinitialiserD({ tables: { sites_commandes: [structuredClone(sc.ligne)] }, seaux: { usine: sc.usine, sites: {} } }); faux.appels.length = 0 }
  const consommer = async () => { capter(); try { return { r: await u.m.consommerSortiesUsine({ stockage: D.supabaseAdmin.storage, maintenant: () => new Date(MAINTENANT), limite: 3 }), leve: null } } catch (err) { return { r: null, leve: premiereLigne(err) } } finally { rendre() } }
  const etat = (sc) => (E.tables.sites_commandes ?? []).find((l) => l.id === sc.commande)
  const ops = (op, seau) => X.stockage.filter((x) => x.op === op && (!seau || x.seau === seau))
  const ecritures = () => X.requetes.filter((q) => q.genre !== 'select')
  const evenements = (type) => faux.appels.filter((a) => a.fonction === 'ops_evenement_ajouter' && !a.faute && (!type || a.params?.p_type === type))
  const toutes = { uploads: [], removes: [], downloads: [], majs: [], evenements: [] }
  const garder = () => { toutes.uploads.push(...ops('upload')); toutes.removes.push(...ops('remove')); toutes.downloads.push(...ops('download')); toutes.majs.push(...X.requetes.filter((q) => q.table === 'sites_commandes' && q.genre === 'update')); toutes.evenements.push(...faux.appels.filter((a) => a.fonction === 'ops_evenement_ajouter')) }
  const scenarios = {}

  await jugerDans(res, 'BL-8', async () => {
    if (!u.m || typeof u.m.consommerSortiesUsine !== 'function') return { echecs: [`${USINE} : consommerSortiesUsine ne s'importe pas (${u.erreur ?? 'absente'})`] }
    const e = []
    const rienFait = (sc, nom) => {
      const f = []
      if (ops('upload', 'sites').length) f.push(`${nom} : ${ops('upload', 'sites').length} fichier(s) copié(s) dans sites`)
      if (ecritures().length) f.push(`${nom} : ${ecritures().length} écriture(s) en base`)
      return f
    }
    // 1. une sortie complète d'une commande payée
    const s1 = scenario('complete'); poser(s1)
    const c1 = await consommer()
    if (c1.leve) e.push(`sortie complète : consommerSortiesUsine lève (${c1.leve})`)
    const site = s1.manifeste.filter((f) => f.nom.startsWith('site/'))
    for (const f of site) {
      const cible = `${s1.commande}/${f.nom.slice(5)}`
      const v = X.seaux.sites?.get(cible)
      if (!v) { e.push(`sortie complète : ${cible} absent du bucket sites`); continue }
      if (!v.octets.equals(s1.fichiers[`sortie/${f.nom}`])) e.push(`sortie complète : ${cible} copié avec d'autres octets`)
      const t = TYPES[path.extname(f.nom).toLowerCase()]
      if (v.type !== t) e.push(`sortie complète : ${cible} déposé en ${JSON.stringify(v.type)}, ${JSON.stringify(t)} attendu (scripts/site-deposer.mjs)`)
    }
    const enTrop = [...(X.seaux.sites?.keys() ?? [])].filter((x) => !site.some((f) => x === `${s1.commande}/${f.nom.slice(5)}`))
    if (enTrop.length) e.push(`sortie complète : fichiers hors manifeste copiés : ${JSON.stringify(enTrop)}`)
    if (etat(s1)?.etat !== 'generee' || !etat(s1)?.genere_le) e.push(`sortie complète : commande ${JSON.stringify({ etat: etat(s1)?.etat, genere_le: etat(s1)?.genere_le })}, generee avec genere_le attendu`)
    const maj1 = X.requetes.filter((q) => q.table === 'sites_commandes' && q.genre === 'update')
    if (!maj1.some((q) => q.filtres.some((f) => f[0] === 'eq' && f[1] === 'etat' && f[2] === 'payee'))) e.push('sortie complète : la mise à jour de la commande ne porte pas la condition etat = payee')
    const restes = [...(X.seaux.usine?.keys() ?? [])]
    if (restes.length) e.push(`sortie complète : restent dans usine ${JSON.stringify(restes.slice(0, 4))} (usine/<tache>/ et l'index commandes/<commande>.json doivent être effacés)`)
    if (ops('download', 'usine').some((x) => /brouillon-non-liste/.test(x.chemin))) e.push('sortie complète : un fichier hors du manifeste a été lu')
    scenarios.complete = { consommes: site.length }
    garder()
    // 2. une sortie d'essai
    const s2 = scenario('essai', { essai: true }); poser(s2)
    const c2 = await consommer()
    if (c2.leve) e.push(`sortie d'essai : lève (${c2.leve})`)
    e.push(...rienFait(s2, 'sortie d’essai'))
    if (ops('remove').length) e.push('sortie d’essai : des fichiers effacés')
    if (evenements().length) e.push('sortie d’essai : un événement écrit')
    garder()
    // 3. une commande déjà generee (livrée par Actions)
    const s3 = scenario('complete', { etat: 'generee' }); poser(s3)
    const c3 = await consommer()
    if (c3.leve) e.push(`commande déjà generee : lève (${c3.leve})`)
    if (ops('upload', 'sites').length) e.push('commande déjà generee : le site est copié')
    if ([...(X.seaux.usine?.keys() ?? [])].some((x) => x.startsWith(`${s3.tache}/`))) e.push('commande déjà generee : usine/<tache>/ n’est pas effacé')
    if (etat(s3)?.genere_le !== s3.ligne.genere_le) e.push('commande déjà generee : la commande a été réécrite')
    garder()
    // 4. un fichier du manifeste manquant, puis présent au tour suivant
    const s4 = scenario('incomplete'); poser(s4)
    const c4 = await consommer()
    if (c4.leve) e.push(`sortie incomplète : lève (${c4.leve})`)
    e.push(...rienFait(s4, 'sortie incomplète'))
    if (ops('remove').length) e.push('sortie incomplète : des fichiers effacés')
    garder()
    const manquant = s4.manifeste.find((f) => !s4.fichiers[`sortie/${f.nom}`])
    if (!manquant) e.push('jeu d’essai : la sortie incomplète ne manque de rien')
    else {
      X.seaux.usine.set(`${s4.tache}/sortie/${manquant.nom}`, { octets: lireCas('complete')[`sortie/${manquant.nom}`], type: 'application/octet-stream' })
      X.stockage.length = 0; X.requetes.length = 0
      const c4b = await consommer()
      if (c4b.leve) e.push(`sortie complétée : lève (${c4b.leve})`)
      if (etat(s4)?.etat !== 'generee') e.push(`au tour suivant, fichier présent : la commande est ${etat(s4)?.etat}, generee attendue`)
      if (!X.seaux.sites?.has(`${s4.commande}/${manquant.nom.slice(5)}`)) e.push('au tour suivant : le fichier arrivé entre-temps n’est pas copié')
      garder()
    }
    // 5. trois sorties fautives : JPEG qui commence par %PDF, rapport rouge, nom hors contrat
    for (const cas of ['fautive-pdf', 'rapport-rouge', 'nom-hors-contrat']) {
      const s = scenario(cas); poser(s)
      const c = await consommer()
      if (c.leve) e.push(`${cas} : lève (${c.leve})`)
      e.push(...rienFait(s, cas))
      if (ops('remove').length) e.push(`${cas} : des fichiers effacés (le dossier doit rester pour le diagnostic)`)
      const ev = evenements('sortie_usine_refusee')
      if (ev.length !== 1) e.push(`${cas} : ${ev.length} événement(s) sortie_usine_refusee accepté(s) par le faux PostgREST, un attendu (appels : ${court(faux.appels.map((x) => `${x.fonction}${x.faute ? `[${x.faute}]` : ''}:${x.params?.p_type ?? ''}`).join(', ') || 'aucun', 120)})`)
      else if (!ev[0].params?.p_resume) e.push(`${cas} : événement sans raison`)
      garder()
    }
    // la pause (mesurée dans l'enfant « complet », consommerSortiesUsine en espion) : jointe par le parent
    for (const a of toutes.evenements) { const t = JSON.stringify(a.params ?? {}); for (const p of PII) if (p && t.includes(p)) e.push(`un événement contient une donnée de l'artisan (« ${court(p, 30)} »)`) }
    for (const l of sortie) for (const p of PII) if (p && l.includes(p)) e.push(`la console reçoit une donnée de l'artisan (« ${court(p, 30)} »)`)
    return { echecs: [...new Set(e)], detail: `stockage factice et faux PostgREST : une sortie complète d'une commande payée → ${scenarios.complete?.consommes ?? '?'} fichiers copiés sous sites/<commande>/ aux octets et types de site-deposer, rien hors manifeste (ni lu, ni copié), commande generee sous la condition etat = payee, usine/<tache>/ et l'index effacés ; sortie d'essai → rien ; commande déjà generee → effacement sans copie ; fichier manquant → rien, puis consommée au tour suivant ; JPEG en %PDF, rapport rouge, nom hors contrat → rien de copié, un événement sortie_usine_refusee ; aucune donnée de l'artisan dans un événement ni dans la console` }
  }, { reseau, inconnues: E.inconnues })

  // BL-9, part exécutée : où l'on écrit, ce que l'on efface ; la condition etat = payee, éprouvée par une course.
  await jugerDans(res, 'BL-9', async () => {
    if (!u.m || typeof u.m.consommerSortiesUsine !== 'function') return { echecs: ['consommerSortiesUsine absente (BL-8)'] }
    const e = []
    for (const x of toutes.uploads) if (x.seau !== 'sites' || !/^[0-9a-f-]{36}\//.test(x.chemin)) e.push(`dépôt hors de sites/<commande>/ : ${x.seau}/${x.chemin}`)
    for (const x of toutes.removes) for (const c of x.chemins) if (x.seau !== 'usine' || !(/^[0-9a-f-]{36}\//.test(c) || /^commandes\//.test(c))) e.push(`effacement hors de usine/<tache>/ et usine/commandes/ : ${x.seau}/${c}`)
    const s = scenario('complete'); poser(s)
    const marque = '2026-10-14T09:59:00.000Z'
    X.surUpload = (seau) => { if (seau === 'sites') { const l = (E.tables.sites_commandes ?? []).find((y) => y.id === s.commande); if (l && l.etat === 'payee') { l.etat = 'generee'; l.genere_le = marque } } }
    await consommer()
    X.surUpload = null
    const l = (E.tables.sites_commandes ?? []).find((y) => y.id === s.commande)
    if (l?.genere_le !== marque) e.push(`course (Actions livre la commande pendant la copie) : la commande est réécrite (genere_le ${l?.genere_le}) : la mise à jour doit porter etat = payee`)
    if (![...(X.seaux.usine?.keys() ?? [])].some((x) => x.startsWith(`${s.tache}/`))) e.push('course : la mise à jour ne touche aucune ligne, et pourtant usine/<tache>/ est effacé (« on s’arrête, rien d’autre » attendu)')
    return { echecs: e, detail: `${toutes.uploads.length} dépôt(s), tous sous sites/<commande>/ ; ${toutes.removes.length} effacement(s), tous sous usine/<tache>/ ou usine/commandes/ ; une commande livrée entre-temps n'est pas réécrite et le dossier de l'usine reste` }
  }, { reseau, inconnues: E.inconnues })
  await faux.arreter()
  resultatEnfant(JUGE, res)
} else {
// ═══ Le processus principal ═════════════════════════════════════════════════════════════════════════════════════════════
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ensemble')
if (!fs.existsSync(RAC)) refuserAppel(JUGE, `racine introuvable : ${RAC}`)
const IDS = o.temoin ? ['BL-5', 'BL-PV'] : ['BL-1', 'BL-2', 'BL-3', 'BL-4', 'BL-5', 'BL-6', 'BL-8', 'BL-9', ...(o.reel ? ['BL-7'] : []), 'BL-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${relR(RAC)}, mode ${o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'}`, { nr: ['BL-5'] })

// ── Le préalable ─────────────────────────────────────────────────────────────────────────────────────────────────────────
if (!o.temoin) {
  const manque = []
  const contrat = contratChemin(RAC)
  let c = null
  if (!fs.existsSync(contrat)) manque.push(`${relR(contrat)} (fiche 026-009)`)
  else { try { c = JSON.parse(fs.readFileSync(contrat, 'utf8')) } catch { manque.push(`${relR(contrat)} illisible`) } }
  if (!fs.existsSync(path.join(RAC, TIC))) manque.push(`${TIC} (fiche 026-049, le tic du bus)`)
  if (manque.length) {
    s.echoue('BL-1', `préalable absent : ${manque.join(' ; ')} — ${TIC} et le contrat du bus doivent exister avant 026-141`)
    s.nonJuges(IDS.filter((x) => x !== 'BL-1' && x !== 'BL-PV'), 'préalable absent (BL-1)')
    jugerPreuvesVides(s, 'BL', RAC, FICHE)
    s.finir()
    process.exit(2)
  }
  const absentes = FONCTIONS.filter((f) => !c?.fonctions?.[f])
  if (absentes.length) {
    s.echoue('BL-1', `préalable absent : ${relR(contrat)} ne porte pas ${absentes.join(', ')} (0097, 0098) — requis par ${TIC} et 026-141`)
    s.nonJuges(IDS.filter((x) => x !== 'BL-1' && x !== 'BL-PV'), 'préalable absent (BL-1)')
    jugerPreuvesVides(s, 'BL', RAC, FICHE)
    s.finir()
    process.exit(2)
  }
}

let complet = null, usine = null
if (!o.temoin) {
  if (!fs.existsSync(path.join(RAC, BUS))) {
    s.echoue('BL-1', `${BUS} absent : le module de la fiche ${FICHE} n'existe pas (encore)`)
  } else {
    complet = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 180_000 })
    const c = complet.res?.criteres?.['BL-1']
    if (c) s.juger('BL-1', c.echecs, c.detail); else s.echoue('BL-1', `l'enfant qui importe ${BUS} n'a rien rendu (code ${complet.code}) — ${court(complet.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 200)}`)
  }
  for (const id of ['BL-2', 'BL-3']) { const c = complet?.res?.criteres?.[id]; if (c) s.juger(id, c.echecs, c.detail); else s.echoue(id, complet ? 'non rendu par l’enfant' : `non jugé : ${BUS} absent (BL-1)`) }

  // ── BL-4 : le diff du tic, puis le tic exécuté ────────────────────────────────────────────────────────────────────────
  await s.critere('BL-4', async () => {
    const e = []
    const cur = lireRacine(RAC, TIC)
    const base = baseAvantD(RAC, TIC, /\btourLivraison\b/)
    if (base.texte === null) e.push(`${TIC} : aucune version d'avant 026-141 dans l'historique (${base.commit.slice(0, 7)}) : le diff ne se mesure pas`)
    else {
      const cle = (i) => i.noms.map((n) => `${i.spec}#${n}`)
      const avant = new Set(importsDe(base.texte).flatMap(cle)), apres = importsDe(cur).flatMap(cle)
      for (const n of avant) if (!apres.includes(n)) e.push(`import retiré : ${n.replace('#', ' → ')}`)
      const ajoutes = apres.filter((n) => !avant.has(n))
      if (ajoutes.length !== 1 || !/#tourLivraison$/.test(ajoutes[0] ?? '')) e.push(`imports ajoutés ${JSON.stringify(ajoutes.map((n) => n.replace('#', ' → ')))} : le seul tourLivraison attendu`)
      const d = diffLignes(blanchirImports(base.texte), blanchirImports(cur))
      for (const x of d.retraits) if (x.texte.trim()) e.push(`ligne ${x.i + 1} du tic d'avant retirée ou changée : « ${court(x.texte, 70)} »`)
      const groupes = blocs(d.ajouts).map((g) => sansCommentaires(g.map((l) => l.texte).join('\n')).trim()).filter(Boolean)
      if (groupes.length !== 1) e.push(`${groupes.length} bloc(s) ajouté(s) au tic, un seul attendu`)
      else {
        const g = groupes[0]
        const n = (g.match(/\btourLivraison\s*\(/g) ?? []).length
        if (n !== 1) e.push(`le bloc ajouté appelle tourLivraison ${n} fois, une attendue`)
        const iT = g.search(/\btry\s*\{/), iA = g.search(/\btourLivraison\s*\(/), iC = g.search(/\}\s*catch\b/)
        if (iT < 0 || iC < 0 || !(iT < iA && iA < iC)) e.push('l’appel à tourLivraison n’est pas dans un try/catch')
        const sc = sansCommentaires(cur)
        const p = positionsAppel(sc, 'tourLivraison').filter((x) => !/import/.test(sc.slice(Math.max(0, x - 40), x)))
        const quinze = new Set([...sc.matchAll(/\b([\w$]+)\s*=\s*[^;\n]*%\s*15\b/g)].map((m) => m[1]))
        if (p.length && !conditionsEnglobantes(sc, p[0]).some((c) => /%\s*15\b/.test(c) || [...quinze].some((q) => new RegExp(`\\b${q}\\b`).test(c)))) e.push('l’appel à tourLivraison n’est sous aucune condition de minute multiple de 15 (« % 15 »)')
      }
    }
    // Exécution : chaque module local importé par le tic est doublé par un espion généré (tourLivraison compris).
    const dossier = exigerSousTravail(path.join(TRAV, 'tic'))
    fs.mkdirSync(dossier, { recursive: true })
    const D = await import(pathToFileURL(DOUBLURES_D).href)
    const connus = new Set(Object.keys(D))
    const doubles = {}, noms = new Set()
    let defaut = false
    for (const m of sansCommentaires(cur).matchAll(/(?:^|[;\n])\s*import\s+(type\s+)?([\s\S]*?)\s+from\s*['"]([^'"]+)['"]/g)) {
      if (m[1]) continue
      const spec = m[3]
      const rel = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(TIC), spec)) : null
      if (!rel) continue
      doubles[rel.replace(/\.(ts|tsx|js|mjs)$/, '').replace(/\/index$/, '')] = 'tic'
      const clause = m[2].trim()
      if (/^[\w$]+/.test(clause) && !clause.startsWith('{') && !clause.startsWith('*')) defaut = true
      const acc = /\{([^}]*)\}/.exec(clause)
      if (acc) for (const x of acc[1].split(',')) { const nom = x.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim(); if (nom && !/^type\s/.test(x.trim())) noms.add(nom) }
    }
    const gen = [
      `// Écrit par ${JUGE} (BL-4) : les doublures du tic, chaque nom importé par ${TIC} qui n'est pas déjà dans d/doublures.mjs.`,
      `import { etatD } from ${JSON.stringify(pathToFileURL(DOUBLURES_D).href)}`,
      `export * from ${JSON.stringify(pathToFileURL(DOUBLURES_D).href)}`,
      "const espion = (nom) => async (...args) => { etatD.espions.push({ module: 'tic', nom, args: [] }); return undefined }",
      ...[...noms].filter((n) => !connus.has(n) && /^[A-Za-z_$][\w$]*$/.test(n)).map((n) => `export const ${n} = espion(${JSON.stringify(n)})`),
      ...(defaut ? ["export default espion('default')"] : []),
    ].join('\n')
    fs.writeFileSync(path.join(dossier, 'doublures-tic.mjs'), `${gen}\n`)
    fs.writeFileSync(path.join(dossier, 'doubles.json'), JSON.stringify(doubles))
    const x = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'tic', timeout: 120_000 })
    const c = x.res?.criteres?.['BL-4']
    if (!c) e.push(`l'enfant qui exécute le tic n'a rien rendu (code ${x.code}) — ${court(x.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 160)}`)
    else e.push(...c.echecs)
    return { echecs: [...new Set(e)], detail: `diff de ${TIC} (base ${base.commit.slice(0, 7)}) : un import (tourLivraison) et un seul bloc, l'appel dans un try/catch sous une condition « % 15 » ; ${c?.detail ?? ''} ; modules doublés : ${Object.keys(doubles).join(', ')}` }
  })
}

// ── BL-5 (NR) : l'appel quotidien du cron des relances ───────────────────────────────────────────────────────────────────
await s.critere('BL-5', () => {
  const t = lireRacine(RAC, RELANCES)
  if (t === null) return { echecs: [`${RELANCES} absent`] }
  const sc = sansCommentaires(t)
  const g = corpsFonctionD(sc, 'GET')
  if (!g) return { echecs: [`${RELANCES} : GET introuvable`] }
  const p = positionsAppel(sc, 'tourLivraison').filter((x) => x > g.debut && x < g.fin)
  if (!p.length) return { echecs: [`${RELANCES} : GET n'appelle plus tourLivraison() (le filet quotidien si pg_cron s'arrête)`] }
  if (!p.some((x) => dansTry(sc, x) || sousCatchChaine(sc, x))) return { echecs: [`${RELANCES} : tourLivraison() hors d'un try`] }
  return { echecs: [], detail: `${RELANCES} : GET appelle toujours tourLivraison() dans un try (le filet quotidien, si pg_cron s'arrête)` }
})

if (!o.temoin) {
  await s.critere('BL-6', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
  if (!fs.existsSync(path.join(RAC, USINE))) { s.echoue('BL-8', `${USINE} absent`); s.echoue('BL-9', `${USINE} absent`) } else {
    usine = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'usine', timeout: 180_000 })
    const c8 = usine.res?.criteres?.['BL-8']
    const pause = complet?.res?.pauseUsine
    if (!c8) s.echoue('BL-8', `l'enfant qui importe ${USINE} n'a rien rendu (code ${usine.code}) — ${court(usine.sortie.trim().split(/\r?\n/).slice(-2).join(' | '), 200)}`)
    else {
      const e = [...c8.echecs]
      if (pause === null || pause === undefined) e.push('la pause n’a pas été mesurée (BL-3)')
      else if (pause !== 0) e.push(`en pause, consommerSortiesUsine appelée ${pause} fois par tourLivraison, jamais attendu`)
      s.juger('BL-8', e, `${c8.detail} ; en pause, tourLivraison n'appelle pas consommerSortiesUsine`)
    }
    // BL-9 : la part exécutée, plus le source.
    await s.critere('BL-9', () => {
      const c9 = usine.res?.criteres?.['BL-9']
      const e = c9 ? [...c9.echecs] : ['non rendu par l’enfant']
      const sc = sansCommentaires(lireRacine(RAC, USINE) ?? '')
      if (!/\.eq\(\s*['"]etat['"]\s*,\s*['"]payee['"]\s*\)/.test(sc)) e.push(`${USINE} : aucune condition .eq('etat', 'payee') lue dans le source`)
      for (const m of sc.matchAll(/\bconsole\s*\.\s*(log|info|warn|error|debug)\s*\(/g)) {
        const fin = apparier(sc, m.index + m[0].length - 1)
        const args = sc.slice(m.index + m[0].length, fin).replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\$]|\\.)*`/g, '').replace(/[\s,]/g, '')
        if (args) e.push(`${USINE} : console.${m[1]}(…) écrit une valeur (« ${court(sc.slice(m.index, fin + 1), 70)} ») : seulement des textes fixes permis`)
      }
      return { echecs: [...new Set(e)], detail: `${c9?.detail ?? ''} ; lu dans ${USINE} : la mise à jour porte .eq('etat', 'payee'), aucun console.* d'une valeur` }
    })
  }
}

// ── BL-7 (--reel) ────────────────────────────────────────────────────────────────────────────────────────────────────────
if (o.reel) {
  if (!fichePass(FICHE)) { s.echoue('BL-7', `préalable absent : la fiche ${FICHE} n'est pas PASS`); s.finir(); process.exit(2) }
  chargerEnvLocal()
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SB || !SVC) { s.echoue('BL-7', 'préalable absent : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manque (.env.local)'); s.finir(); process.exit(2) }
  const lire = async () => { const r = await fetch(`${SB}/rest/v1/passages_cron?select=dernier_passage&nom=eq.livraison`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` }, signal: AbortSignal.timeout(20_000) }); const j = await r.json(); return j?.[0]?.dernier_passage ?? null }
  const e = []
  try {
    const a = await lire()
    await new Promise((ok) => setTimeout(ok, 16 * 60_000))
    const b = await lire()
    if (!a || !b) e.push(`passages_cron.livraison illisible (${a} puis ${b})`)
    else if (a === b) e.push(`dernier_passage inchangé en 16 min (${a}) : la livraison ne tourne pas sans le cron quotidien`)
    else if (new Date(b) - new Date(a) >= 20 * 60_000) e.push(`deux passages espacés de ${Math.round((new Date(b) - new Date(a)) / 60_000)} min, moins de 20 attendus`)
  } catch (err) { e.push(`--reel interrompu : ${premiereLigne(err)}`) }
  s.juger('BL-7', e, 'passages_cron.livraison lu deux fois à 16 min d’intervalle : deux dernier_passage différents, espacés de moins de 20 min ; aucune ligne créée')
}

jugerPreuvesVides(s, 'BL', RAC, FICHE)
process.exit(s.finir())
}
