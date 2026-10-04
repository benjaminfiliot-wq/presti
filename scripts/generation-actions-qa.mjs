// scripts/generation-actions-qa.mjs — juge de la génération d'un site dans GitHub Actions, PC éteint (fiche 026-029, lot C ;
// critères GA de 026-106), écrit par Claude Code AVANT le code qu'il juge (réécrit en entier le 27/09 : la version du 26/09 ne
// testait que l'existence d'un fichier). L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/generation-actions-qa.mjs [--racine=<dossier>] [--temoin] [--reel] [--seulement=GA-5]
//
//   --racine=<d>  lit <d>/.github/workflows/generer-site.yml et importe <d>/lib/siteGenerationDistante.ts (défaut : le dépôt) ;
//                 le diff de GA-6 se lit contre la version d'avant la fiche de lib/siteLivraison.ts, dans l'historique du
//                 dépôt git qui contient ce script (le plus récent commit dont le fichier ne porte pas encore demanderGeneration).
//   --temoin      seulement GA-7 (NR : audit, sauvegarde, qualite, security et android inchangés depuis HEAD — lus dans le dépôt
//                 quand la racine n'a pas de .github/) et GA-PV.
//   --reel        GA-9, non écrit ici : code 2.
//   --seulement   auto-contrôle de 026-029 (preuve « sait échouer ») : ne juge que ces critères ; jamais le verdict d'une fiche.
//
// Le YAML est lu par un analyseur structuré (le paquet `yaml` n'est pas dans node_modules : lecture par l'indentation,
// mappings, listes, listes sans retrait, blocs « | » et « > », listes et objets en ligne), jamais par une recherche de texte
// pour les clés. AUTOCONTRÔLE, à chaque lancement complet : les contrôles de GA-1 à GA-4 sont d'abord passés sur le flux témoin
// (scripts/fixtures/026-livraison-tresor/c/temoin/.github/workflows/generer-site.yml : tous verts) et sur chaque variante de
// c/ga-fautifs/GA-<n>-*.yml (son critère rouge) ; un contrôle qui ne voit pas sa faute est un échec de son critère.
//
// demanderGeneration est importé dans un PROCESSUS ENFANT (ce même script, --enfant=distante), horloge figée au
// 2026-09-26T12:00:00Z, lib/supabaseAdmin, lib/limites, lib/alertes et lib/email doublés (a/doublures.mjs), fetch piégé ; les
// dépendances sont passées par le juge. Contrat que ce juge fixe pour 026-106 :
//   demanderGeneration(commande, { fetch, base, limite, alerter, env, maintenant, usine }) :
//     fetch(url, init) → Response ; base = un client Supabase (le juge note chaque update/insert/upsert/delete et ses filtres) ;
//     limite(cle, max, fenetreSec) → booléen (consommerLimite) ; alerter(alertes) (envoyerAlertes) ; env = les variables ;
//     maintenant() → Date ; usine = { index(id) → { tache } | null (usine/commandes/<id>.json), manifeste(tache) → booléen
//     (usine/<tache>/sortie/manifeste.json), livreur() → { dernier_battement, periode_minutes } | null (livreur_usine dans
//     ops_etat().agents) } ; une de ces fonctions qui lève = un doute : aucun fetch et une alerte.
//
// Critères (cahier du juge de 026-106) :
//   GA-1  generer-site.yml existe ; ses déclencheurs sont exactement repository_dispatch (types [generer-site]) et
//         workflow_dispatch (avec une entrée `commande`).
//   GA-2  un job ubuntu-latest, timeout-minutes ≤ 20 ; concurrency.group posé, cancel-in-progress: false ; permissions =
//         { contents: read } et rien de plus (au niveau du flux et du job).
//   GA-3  aucune étape actions/upload-artifact, aucun schedule, ni ANTHROPIC_API_KEY ni ANTHROPIC_AGENTS_KEY ; le seul secret
//         est LIVRAISON_ENV, passé par env: (jamais « ${{ secrets… }} » dans un run:) et filtré par
//         grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' vers .env.local ; aucun echo, printf ou cat d'une
//         variable issue d'un secret hors d'un tube ou d'une redirection, ni printenv, ni env, ni « cat .env.local », ni set -x.
//   GA-4  l'identifiant (client_payload.commande ou l'entrée `commande`, passés par env:, jamais « ${{ … }} » dans un run:)
//         est comparé à une expression UUID dans une étape qui précède la commande
//         « node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs "…" --ci ».
//   GA-5  demanderGeneration, doublures : état « generee », dossier incomplet, trois tentatives, bail de 10 min, sans jeton →
//         aucun fetch ; plafond atteint → aucun fetch, une alerte ; succès → un fetch à l'URL, la méthode, les en-têtes et le
//         corps exacts (délai : un signal), consommerLimite('actions:generer:2026-09', 10, 32 j), puis UNE mise à jour
//         conditionnelle (generation_demandee_le = maintenant, generation_tentatives + 1, un filtre de plus que l'id) ; 422 →
//         aucune écriture, une alerte « paiement » de clé generation:<id>:… ; bail de 46 min → un fetch ; GENERATIONS_MOIS_MAX=7
//         → plafond de 7 ; aucune sortie de console ni aucune alerte ne contient le jeton.
//   GA-6  le diff de lib/siteLivraison.ts : un seul bloc ajouté, dans tourLivraison, aucune ligne retirée, seuls
//         demanderGeneration (et enPause) importés en plus ; un seul appel à demanderGeneration, dans un try dont le catch ne
//         relance pas, sous un if qui exige GITHUB_DISPATCH_TOKEN et !enPause(). 026-024 absente de l'historique : code 2.
//   GA-10 l'arbitrage avec l'usine, doublure `usine` : index présent, payée il y a 20 min, livreur battu il y a 5 min → aucun
//         fetch ; payée il y a 70 min sans sortie → un fetch ; payée il y a 70 min avec une sortie → aucun ; livreur muet ou
//         absent → un fetch ; pas d'index → un fetch ; la doublure qui lève → aucun fetch et une alerte.
//   GA-7  (NR) audit, sauvegarde, qualite, security et android inchangés depuis HEAD.
//   GA-8  npm run typecheck (tsc --noEmit) vert sur la racine.
//   GA-9  (--reel, Claude Code, après les gestes de Benj) : non écrit ici, code 2.
//   GA-PV un fichier de 0 octet dans .orchestre/preuves/026-106/ est un échec (règle commune, tous les modes).
//
// Sortie : une ligne par critère, puis « generation-actions-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2
// si l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/generation-actions-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, sansCommentaires, importsDe, corpsDeFonction,
  jugerPreuvesVides, lancerEnfant, preparerEnfant, resultatEnfant, importer, figerHorloge, baseAvant, diffLignes, blocs,
  blanchirImports, typecheck, texteA, lf, DEPOT_GIT, fermante,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { C, jeuC, auPlus } from './fixtures/026-livraison-tresor/c/commun-c.mjs'

// Les évolutions approuvées sont soustraites exactement, jamais apprises de la racine jugée.
// 49753f4c : 026-141 (bus, usine, pause et battements). Les contrôles métier historiques restent actifs.
// 771d765d : 026-201 (Search Console : tourLivraison appelle lib/sites/searchConsole.ts, trois sites au plus par tour, hors pause).
// Liste de révisions NOMMÉES, de la plus récente à la plus ancienne (chaque évolution se défait sur le texte qui la suit).
function retirerEvolutions(texte, fichier, revisions) {
  const echecs = []
  let projete = texte
  for (const rev of revisions) {
    const avant = texteA(rev + '^', fichier), apres = texteA(rev, fichier)
    if (avant === null || apres === null) { echecs.push('historique authentique absent : ' + rev + ':' + fichier); continue }
    let debut = 0, fin = 0
    while (debut < Math.min(avant.length, apres.length) && avant[debut] === apres[debut]) debut++
    while (fin < Math.min(avant.length, apres.length) - debut && avant[avant.length - 1 - fin] === apres[apres.length - 1 - fin]) fin++
    const ajoute = apres.slice(debut, apres.length - fin), retire = avant.slice(debut, avant.length - fin)
    if (!ajoute || projete === null || projete.indexOf(ajoute) < 0 || projete.indexOf(ajoute) !== projete.lastIndexOf(ajoute)) {
      echecs.push('évolution ' + rev + ' altérée ou ambiguë : ' + fichier); continue
    }
    projete = projete.replace(ajoute, retire)
  }
  return { texte: projete, echecs }
}

const JUGE = 'generation-actions-qa'
const FICHE = '026-106'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const FLUX = '.github/workflows/generer-site.yml'
const MODULE = 'lib/siteGenerationDistante.ts'
const LIVRAISON = 'lib/siteLivraison.ts'
const AUTRES_FLUX = ['audit', 'sauvegarde', 'qualite', 'security', 'android'].map((n) => `.github/workflows/${n}.yml`)
const o = lireOptions(process.argv.slice(2), { connues: ['seulement'] })
const RAC = o.racine
const FIXE = '2026-09-26T12:00:00.000Z'
const JETON = ['jeton', 'du', 'juge', '026', '029', 'ga5', 'x'.repeat(12)].join('-')
const DOUBLES = { 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/limites': 'limites', 'lib/alertes': 'alertes', 'lib/email': 'email' }

// ═══ Le processus enfant : demanderGeneration ═══════════════════════════════════════════════════════════════════════════
if (o.enfant === 'distante') {
  figerHorloge(FIXE)
  const { reseau } = await preparerEnfant({ racines: [RAC], doubles: DOUBLES })
  const res = { erreur: null, cas: {} }
  const m = await importer(RAC, MODULE)
  if (typeof m.m?.demanderGeneration !== 'function') { res.erreur = `${MODULE} n'exporte pas demanderGeneration (${m.erreur ?? 'export absent'})`; resultatEnfant(JUGE, res) }
  else {
    const J = jeuC('commande-payee.json')
    const maintenant = new Date(FIXE)
    const ilYa = (min) => new Date(maintenant.getTime() - min * 60_000).toISOString()
    const baseCommande = () => ({ ...structuredClone(J.commande), generation_tentatives: 0, generation_demandee_le: null, paye_le: ilYa(70) })
    const ENV = { GITHUB_DISPATCH_TOKEN: JETON, GITHUB_DEPOT_LIVRAISON: 'benja/presti-essai', GENERATIONS_MOIS_MAX: '10' }
    const USINE_VIDE = { index: async () => null, manifeste: async () => false, livreur: async () => ({ dernier_battement: ilYa(5), periode_minutes: 10 }) }
    const cas = async (nom, { commande = baseCommande(), env = ENV, statut = 204, plafond = true, usine = USINE_VIDE } = {}) => {
      const fetchs = [], ecritures = [], alertes = [], limites = [], consoles = []
      const chaine = (table, op, args) => {
        const filtres = []
        const p = new Proxy(function () {}, {
          get(_c, k) {
            if (k === 'then') return (ok, ko) => Promise.resolve({ data: op === 'select' ? [] : [{ id: commande.id }], error: null, count: 1 }).then(ok, ko)
            return (...a) => { filtres.push([String(k), ...a]); return p }
          },
        })
        if (['update', 'insert', 'upsert', 'delete'].includes(op)) ecritures.push({ table, op, valeurs: structuredClone(args[0] ?? null), filtres })
        return p
      }
      const base = {
        from: (table) => new Proxy({}, { get: (_o, op) => (...args) => chaine(table, String(op), args) }),
        rpc: async (nomRpc) => { ecritures.push({ table: 'rpc', op: `rpc ${nomRpc}`, valeurs: null, filtres: [] }); return { data: null, error: { message: 'rpc refusé par le juge' } } },
        storage: { from: () => new Proxy({}, { get: () => async () => ({ data: null, error: { message: 'stockage refusé par le juge' } }) }) },
      }
      const f = async (url, init = {}) => {
        const h = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
        fetchs.push({ url: String(url), methode: init.method, entetes: h, corps: typeof init.body === 'string' ? init.body : null, signal: !!init.signal && typeof init.signal.aborted === 'boolean' })
        return new Response(statut === 204 ? null : JSON.stringify({ message: 'Unprocessable' }), { status: statut })
      }
      const originaux = {}
      for (const k of ['log', 'info', 'warn', 'error', 'debug']) { originaux[k] = console[k]; console[k] = (...a) => { consoles.push(a.map((x) => { try { return typeof x === 'string' ? x : JSON.stringify(x) ?? String(x) } catch { return String(x) } }).join(' ')) } }
      let rendu = null, exception = null
      try {
        rendu = await m.m.demanderGeneration(commande, { fetch: f, base, limite: async (cle, max, fenetre) => { limites.push({ cle, max, fenetre }); return plafond }, alerter: async (l) => { alertes.push(...structuredClone(l ?? [])); return (l ?? []).length }, env, maintenant: () => new Date(FIXE), usine })
      } catch (e) { exception = premiereLigne(e) } finally { for (const [k, v] of Object.entries(originaux)) console[k] = v }
      res.cas[nom] = { fetchs, ecritures, alertes, limites, consoles, exception, rendu: rendu === undefined ? null : rendu, id: commande.id }
    }
    await cas('état generee', { commande: { ...baseCommande(), etat: 'generee' } })
    await cas('dossier incomplet', { commande: (() => { const c = baseCommande(); c.matiere.prestations = []; return c })() })
    await cas('trois tentatives', { commande: { ...baseCommande(), generation_tentatives: 3 } })
    await cas('bail de 10 min', { commande: { ...baseCommande(), generation_demandee_le: ilYa(10) } })
    await cas('sans jeton', { env: { GITHUB_DEPOT_LIVRAISON: ENV.GITHUB_DEPOT_LIVRAISON, GENERATIONS_MOIS_MAX: '10' } })
    await cas('plafond atteint', { plafond: false })
    await cas('succès', {})
    await cas('réponse 422', { statut: 422 })
    await cas('bail de 46 min', { commande: { ...baseCommande(), generation_demandee_le: ilYa(46) } })
    await cas('plafond de 7', { env: { ...ENV, GENERATIONS_MOIS_MAX: '7' } })
    const usine = (index, manifeste, livreur) => ({ index: async () => (index === 'leve' ? (() => { throw new Error('usine illisible (doublure)') })() : index), manifeste: async () => manifeste, livreur: async () => livreur })
    await cas('usine : index, payée il y a 20 min, livreur battu il y a 5 min', { commande: { ...baseCommande(), paye_le: ilYa(20) }, usine: usine({ tache: 'livrer_site-essai' }, false, { dernier_battement: ilYa(5), periode_minutes: 10 }) })
    await cas('usine : payée il y a 70 min sans sortie', { commande: { ...baseCommande(), paye_le: ilYa(70) }, usine: usine({ tache: 'livrer_site-essai' }, false, { dernier_battement: ilYa(5), periode_minutes: 10 }) })
    await cas('usine : payée il y a 70 min avec une sortie', { commande: { ...baseCommande(), paye_le: ilYa(70) }, usine: usine({ tache: 'livrer_site-essai' }, true, { dernier_battement: ilYa(5), periode_minutes: 10 }) })
    await cas('usine : livreur muet', { commande: { ...baseCommande(), paye_le: ilYa(20) }, usine: usine({ tache: 'livrer_site-essai' }, false, { dernier_battement: ilYa(25), periode_minutes: 10 }) })
    await cas('usine : livreur absent', { commande: { ...baseCommande(), paye_le: ilYa(20) }, usine: usine({ tache: 'livrer_site-essai' }, false, null) })
    await cas('usine : pas d\'index', { commande: { ...baseCommande(), paye_le: ilYa(20) }, usine: usine(null, false, { dernier_battement: ilYa(5), periode_minutes: 10 }) })
    await cas('usine : la doublure lève', { commande: { ...baseCommande(), paye_le: ilYa(70) }, usine: usine('leve', false, { dernier_battement: ilYa(5), periode_minutes: 10 }) })
    res.reseau = reseau
    resultatEnfant(JUGE, res)
  }
} else {
  // ═══ Le processus parent ════════════════════════════════════════════════════════════════════════════════════════════════
  if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
  if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
  const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
  const COMPLET = ['GA-1', 'GA-2', 'GA-3', 'GA-4', 'GA-5', 'GA-6', 'GA-10', 'GA-7', 'GA-8']
  const SEUL = o.valeurs.seulement ? new Set(o.valeurs.seulement.split(',')) : null
  const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : SEUL ? `partiel (${[...SEUL].join(',')})` : 'complet'
  const IDS = o.temoin ? ['GA-7', 'GA-PV'] : [...(SEUL ? COMPLET.filter((x) => SEUL.has(x)) : COMPLET), ...(o.reel ? ['GA-9'] : []), 'GA-PV']
  const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: ['GA-7'] })
  const veut = (id) => IDS.includes(id)
  const finir = (code) => { jugerPreuvesVides(s, 'GA', RAC, FICHE); process.exit(Math.max(code ?? 0, s.finir())) }

  // ── GA-7 (NR) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const partGa7 = () => {
    const base = fs.existsSync(path.join(RAC, '.github')) ? RAC : DEPOT_GIT
    const e = []
    for (const f of AUTRES_FLUX) {
      const head = texteA('HEAD', f), ici = lf(fs.existsSync(path.join(base, f)) ? fs.readFileSync(path.join(base, f), 'utf8') : null)
      if (head === null) e.push(`${f} absent de HEAD`)
      else if (ici === null) e.push(`${f} supprimé`)
      else if (ici !== head) e.push(`${f} modifié (interdit à 026-106)`)
    }
    return { echecs: e, detail: `${AUTRES_FLUX.map((f) => path.basename(f, '.yml')).join(', ')} identiques à HEAD (lus dans ${rel(base)})` }
  }
  if (o.temoin) { await s.critere('GA-7', partGa7); finir(0) }
  if (o.reel) { s.echoue('GA-9', 'non écrit : --reel sera écrit par Claude Code après les gestes de Benj (jeton, secret LIVRAISON_ENV) — code 2, jamais un PASS'); s.nonJuges(IDS, '--reel non écrit'); finir(2) }

  // ── GA-1 à GA-4 : le flux, et l'autocontrôle ──────────────────────────────────────────────────────────────────────────
  const texteFlux = lireRacine(RAC, FLUX)
  if (texteFlux === null) {
    s.echoue('GA-1', `${FLUX} absent de ${rel(RAC)} : le flux de 026-106 n'existe pas encore`)
    s.nonJuges(IDS.filter((x) => x !== 'GA-PV'), `GA-1 en échec (${FLUX} absent)`)
    finir(1)
  }
  const auto = autocontrole()
  const verdictFlux = jugerFlux(texteFlux)
  for (const id of ['GA-1', 'GA-2', 'GA-3', 'GA-4']) if (veut(id)) s.juger(id, [...(auto[id] ?? []).map((x) => `autocontrôle : ${x}`), ...verdictFlux.echecs[id]], `${verdictFlux.details[id]} ; autocontrôle : témoin vert, ${auto.fautifs[id] ?? 0} variante(s) fautive(s) vue(s)`)

  // ── GA-5 et GA-10 : demanderGeneration dans l'enfant ──────────────────────────────────────────────────────────────────
  const CASDIST = veut('GA-5') || veut('GA-10') ? lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'distante', timeout: 180_000 }) : null
  const D = CASDIST ? (CASDIST.res ?? { erreur: `enfant sans résultat (code ${CASDIST.code}) : ${court(CASDIST.sortie.trim().split(/\r?\n/).slice(-3).join(' | '), 240)}` }) : null
  const J = jeuC('commande-payee.json')
  const verifierCas = (nom, attendu, e) => {
    const c = D.cas?.[nom]
    if (!c) { e.push(`${nom} : cas non joué`); return null }
    if (c.exception) e.push(`${nom} : exception « ${c.exception} »`)
    if (attendu.fetch !== undefined && c.fetchs.length !== attendu.fetch) e.push(`${nom} : ${c.fetchs.length} fetch, ${attendu.fetch} attendu(s)`)
    if (attendu.alertes !== undefined && (attendu.alertes === '≥1' ? c.alertes.length < 1 : c.alertes.length !== attendu.alertes)) e.push(`${nom} : ${c.alertes.length} alerte(s), ${attendu.alertes} attendue(s)`)
    if (attendu.ecritures !== undefined && c.ecritures.length !== attendu.ecritures) e.push(`${nom} : ${c.ecritures.length} écriture(s) en base (${auPlus(c.ecritures.map((x) => `${x.op} ${x.table}`), 2)}), ${attendu.ecritures} attendue(s)`)
    for (const l of c.consoles) if (l.includes(JETON)) e.push(`${nom} : le jeton est écrit dans la console`)
    for (const a of c.alertes) if (JSON.stringify(a).includes(JETON)) e.push(`${nom} : le jeton est dans une alerte`)
    return c
  }
  if (veut('GA-5')) await s.critere('GA-5', () => {
    if (D.erreur) return { echecs: [D.erreur] }
    const e = []
    for (const nom of ['état generee', 'dossier incomplet', 'trois tentatives', 'bail de 10 min', 'sans jeton']) verifierCas(nom, { fetch: 0, ecritures: 0 }, e)
    verifierCas('plafond atteint', { fetch: 0, alertes: 1, ecritures: 0 }, e)
    const ok = verifierCas('succès', { fetch: 1, ecritures: 1 }, e)
    if (ok?.fetchs.length === 1) {
      const f = ok.fetchs[0]
      if (f.url !== 'https://api.github.com/repos/benja/presti-essai/dispatches') e.push(`succès : URL ${f.url}`)
      if (f.methode !== 'POST') e.push(`succès : méthode ${f.methode}`)
      if (f.entetes.authorization !== `Bearer ${JETON}`) e.push('succès : en-tête Authorization ≠ « Bearer <jeton> »')
      if (f.entetes.accept !== 'application/vnd.github+json') e.push(`succès : en-tête Accept ${JSON.stringify(f.entetes.accept)}`)
      let corps = null
      try { corps = JSON.parse(f.corps) } catch { /* jugé */ }
      if (JSON.stringify(corps) !== JSON.stringify({ event_type: 'generer-site', client_payload: { commande: ok.id } })) e.push(`succès : corps ${court(f.corps, 100)}`)
      if (!f.signal) e.push('succès : aucun signal de délai (10 s) passé à fetch')
    }
    if (ok?.limites.length !== 1 || ok.limites[0].cle !== 'actions:generer:2026-09' || ok.limites[0].max !== 10 || ok.limites[0].fenetre !== 32 * 86400) e.push(`succès : plafond consommé ${JSON.stringify(ok?.limites ?? null)}, [{ cle: 'actions:generer:2026-09', max: 10, fenetre: ${32 * 86400} }] attendu`)
    const w = ok?.ecritures?.[0]
    if (w) {
      if (w.table !== 'sites_commandes' || w.op !== 'update') e.push(`succès : écriture ${w.op} sur ${w.table}, update de sites_commandes attendu`)
      if (w.valeurs?.generation_demandee_le !== FIXE && new Date(w.valeurs?.generation_demandee_le ?? 0).toISOString?.() !== FIXE) e.push(`succès : generation_demandee_le = ${JSON.stringify(w.valeurs?.generation_demandee_le)}, ${FIXE} attendu`)
      if (w.valeurs?.generation_tentatives !== 1) e.push(`succès : generation_tentatives = ${JSON.stringify(w.valeurs?.generation_tentatives)}, 1 attendu`)
      const filtres = w.filtres.filter((x) => !['select', 'single', 'maybeSingle', 'returns', 'throwOnError'].includes(x[0]))
      if (!filtres.some((x) => x[0] === 'eq' && x[1] === 'id' && x[2] === ok.id)) e.push('succès : la mise à jour ne vise pas .eq(\'id\', <commande>)')
      if (filtres.length < 2) e.push(`succès : mise à jour sans condition (${JSON.stringify(filtres).slice(0, 80)}) : un filtre de plus que l'id attendu`)
    }
    const k = verifierCas('réponse 422', { fetch: 1, ecritures: 0, alertes: 1 }, e)
    if (k?.alertes[0] && (k.alertes[0].motif !== 'paiement' || !String(k.alertes[0].cle ?? '').startsWith(`generation:${k.id}:`))) e.push(`réponse 422 : alerte ${JSON.stringify({ motif: k.alertes[0].motif, cle: k.alertes[0].cle })}, motif « paiement » et clé generation:<id>:… attendus`)
    verifierCas('bail de 46 min', { fetch: 1 }, e)
    const sept = verifierCas('plafond de 7', { fetch: 1 }, e)
    if (sept && sept.limites[0]?.max !== 7) e.push(`GENERATIONS_MOIS_MAX=7 : plafond ${JSON.stringify(sept.limites[0]?.max)}, 7 attendu`)
    if (D.reseau?.length) e.push(`appel réseau hors doublure : ${auPlus(D.reseau, 2)}`)
    return { echecs: [...new Set(e)], detail: '5 conditions manquantes → aucun fetch ; plafond → aucun fetch, une alerte ; succès → un fetch exact (URL, POST, Bearer, Accept, corps, signal), plafond actions:generer:2026-09 / 10 / 32 j, une mise à jour conditionnelle ; 422 → une alerte « paiement », aucune écriture ; bail de 46 min et plafond de 7 respectés ; jeton jamais écrit' }
  })
  if (veut('GA-10')) await s.critere('GA-10', () => {
    if (D.erreur) return { echecs: [D.erreur] }
    const e = []
    verifierCas('usine : index, payée il y a 20 min, livreur battu il y a 5 min', { fetch: 0 }, e)
    verifierCas('usine : payée il y a 70 min sans sortie', { fetch: 1 }, e)
    verifierCas('usine : payée il y a 70 min avec une sortie', { fetch: 0 }, e)
    verifierCas('usine : livreur muet', { fetch: 1 }, e)
    verifierCas('usine : livreur absent', { fetch: 1 }, e)
    verifierCas('usine : pas d\'index', { fetch: 1 }, e)
    verifierCas('usine : la doublure lève', { fetch: 0, alertes: '≥1', ecritures: 0 }, e)
    return { echecs: e, detail: 'usine en main → aucun fetch ; payée depuis 70 min sans sortie, livreur muet ou absent, pas d\'index → un fetch ; sortie présente → aucun ; doublure qui lève → aucun fetch et une alerte' }
  })

  // ── GA-6 : le diff de lib/siteLivraison.ts ────────────────────────────────────────────────────────────────────────────
  let prealable = false
  if (veut('GA-6')) await s.critere('GA-6', () => {
    const b = baseAvant(LIVRAISON, /demanderGeneration/)
    if (b.texte === null) { prealable = true; return { echecs: [`non jugé : 026-024 attendue (${LIVRAISON} absent de l'historique de HEAD)`] } }
    const actuel = lireRacine(RAC, LIVRAISON)
    const evolution = /\bcloreTacheLivraison\b/.test(actuel ?? '') ? retirerEvolutions(actuel, LIVRAISON, ['771d765d', '49753f4c']) : { texte: actuel, echecs: [] }
    const cur = evolution.texte
    if (cur === null) return { echecs: [`${LIVRAISON} absent de ${rel(RAC)}`] }
    const e = [...evolution.echecs]
    const cle = (i) => i.noms.map((n) => `${i.spec}#${n}`)
    const avant = new Set(importsDe(b.texte).flatMap(cle)), apres = importsDe(cur).flatMap(cle)
    for (const n of avant) if (!apres.includes(n)) e.push(`import retiré : ${n.replace('#', ' → ')}`)
    for (const n of apres) if (!avant.has(n) && !/#(demanderGeneration|enPause)$/.test(n)) e.push(`import ajouté hors contrat : ${n.replace('#', ' → ')}`)
    if (!apres.some((n) => /siteGenerationDistante#demanderGeneration$/.test(n))) e.push('demanderGeneration n\'est pas importé de lib/siteGenerationDistante')
    const d = diffLignes(blanchirImports(b.texte), blanchirImports(cur))
    for (const x of d.retraits) if (x.texte.trim()) e.push(`ligne ${x.i + 1} de la base retirée ou changée : « ${court(x.texte, 70)} »`)
    const groupes = blocs(d.ajouts).filter((g) => g.some((l) => l.texte.trim() && !/^\s*\/\//.test(l.texte)))
    if (groupes.length !== 1) e.push(`${groupes.length} bloc(s) ajouté(s), exactement un attendu`)
    const sc = sansCommentaires(cur)
    const corps = corpsDeFonction(sc, 'tourLivraison')
    const zone = corps ? [sc.slice(0, corps.debut).split('\n').length - 1, sc.slice(0, corps.fin).split('\n').length - 1] : null
    if (!zone) e.push('tourLivraison introuvable')
    for (const g of groupes) if (zone && (g[0].i < zone[0] || g.at(-1).i > zone[1])) e.push(`lignes ${g[0].i + 1}-${g.at(-1).i + 1} hors du corps de tourLivraison`)
    const lignesAjoutees = new Set(groupes.flatMap((g) => g.map((l) => l.i)))
    const total = [...sc.matchAll(/\bdemanderGeneration\s*\(/g)].length
    // L'appel est jugé dans le corps entier de tourLivraison (le diff peut apparier un try ajouté à un try de la base).
    const t = corps ? corps.corps : ''
    const appels = [...t.matchAll(/\bdemanderGeneration\s*\(/g)]
    if (appels.length !== 1 || total !== 1) e.push(`${appels.length} appel(s) à demanderGeneration( dans tourLivraison et ${total} dans le fichier, 1 attendu`)
    else {
      const ou = appels[0].index
      const ligneAppel = sc.slice(0, corps.debut + 1 + ou).split('\n').length - 1
      if (!lignesAjoutees.has(ligneAppel)) e.push(`l'appel (ligne ${ligneAppel + 1}) n'est pas dans le bloc ajouté`)
      // Dans un try : un « try { » dont l'accolade se referme après l'appel, suivi d'un catch qui ne relance pas.
      const essais = [...t.matchAll(/\btry\s*\{/g)].map((m) => ({ debut: m.index + m[0].length - 1, fin: fermante(t, m.index + m[0].length - 1) })).filter((x) => x.debut < ou && x.fin > ou)
      if (!essais.length) e.push('l\'appel n\'est pas dans un try')
      else {
        const dernier = essais.at(-1)
        const c = /^\s*catch\b[^{]*\{/.exec(t.slice(dernier.fin + 1))
        if (!c) e.push('le try de l\'appel n\'a pas de catch')
        else { const debutCatch = dernier.fin + 1 + c[0].length - 1; if (/\bthrow\b/.test(t.slice(debutCatch, fermante(t, debutCatch)))) e.push('le catch relance (throw)') }
      }
      // Sous un if qui exige le jeton et l'absence de pause, et dont le bloc contient l'appel.
      const gardes = []
      for (const m of t.matchAll(/\bif\s*\(/g)) {
        let n = 0, j = m.index + m[0].length - 1
        for (; j < t.length; j++) { if (t[j] === '(') n++; else if (t[j] === ')') { n--; if (n === 0) break } }
        const cond = t.slice(m.index + m[0].length, j)
        const ouvre = t.slice(j + 1).search(/\S/) + j + 1
        const fin = t[ouvre] === '{' ? fermante(t, ouvre) : t.indexOf(';', ouvre)
        if (ouvre < ou && fin > ou) gardes.push(cond)
      }
      if (!gardes.some((x) => /GITHUB_DISPATCH_TOKEN/.test(x))) e.push('l\'appel n\'est pas sous un if qui exige GITHUB_DISPATCH_TOKEN')
      if (!gardes.some((x) => /!\s*\(?\s*(?:await\s+)?enPause\s*\(/.test(x))) e.push('l\'appel n\'est pas sous un if qui exige !enPause()')
    }
    return { echecs: [...new Set(e)], detail: `diff de ${LIVRAISON} contre ${b.commit.slice(0, 7)} : un bloc dans tourLivraison, aucune ligne retirée, seul demanderGeneration importé en plus ; un appel dans un try (catch sans throw), sous if (GITHUB_DISPATCH_TOKEN && !enPause())` }
  })

  if (veut('GA-7')) await s.critere('GA-7', partGa7)
  if (veut('GA-8')) await s.critere('GA-8', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
  finir(prealable ? 2 : 0)
}

// ═══ Le YAML ════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** Analyseur YAML par l'indentation (sous-ensemble des flux GitHub). → valeur JS ; lève sur une ligne illisible. */
export function lireYaml(src) {
  const L = []
  for (const brut of String(src).replace(/\r\n/g, '\n').replace(/\t/g, '  ').split('\n')) {
    const indent = brut.match(/^ */)[0].length
    L.push({ brut, indent, texte: brut.slice(indent), vide: /^\s*(#.*)?$/.test(brut) })
  }
  let i = 0
  const sansCom = (t) => { let q = null; for (let k = 0; k < t.length; k++) { const c = t[k]; if (q) { if (c === q) q = null; continue } if (c === '"' || c === "'") q = c; else if (c === '#' && (k === 0 || /\s/.test(t[k - 1]))) return t.slice(0, k).trimEnd() } return t.trimEnd() }
  const decouper = (t) => { const out = []; let n = 0, q = null, d = 0; for (let k = 0; k < t.length; k++) { const c = t[k]; if (q) { if (c === q) q = null; continue } if (c === '"' || c === "'") q = c; else if (c === '[' || c === '{') n++; else if (c === ']' || c === '}') n--; else if (c === ',' && n === 0) { out.push(t.slice(d, k)); d = k + 1 } } out.push(t.slice(d)); return out.map((x) => x.trim()).filter((x) => x !== '') }
  const scalaire = (brut) => {
    const t = brut.trim()
    if (t === '' || t === '~' || t === 'null') return null
    if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) { try { return JSON.parse(t) } catch { return t.slice(1, -1) } }
    if (t.startsWith("'") && t.endsWith("'") && t.length >= 2) return t.slice(1, -1).replace(/''/g, "'")
    if (t.startsWith('[') && t.endsWith(']')) return decouper(t.slice(1, -1)).map(scalaire)
    if (t.startsWith('{') && t.endsWith('}')) return Object.fromEntries(decouper(t.slice(1, -1)).map((p) => { const m = /^("[^"]*"|'[^']*'|[^:]+?)\s*:\s*(.*)$/.exec(p); return m ? [String(scalaire(m[1])), scalaire(m[2])] : [p, null] }))
    if (t === 'true') return true
    if (t === 'false') return false
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
    return t
  }
  const prochaine = () => { while (i < L.length && L[i].vide) i++; return i < L.length ? L[i] : null }
  const cleValeur = (t) => /^("[^"]*"|'[^']*'|[^\s"'#][^:#]*?)\s*:(?:\s+(.*)|$)/.exec(t)
  const blocTexte = (indentParent, style) => {
    const lignes = []
    let base = null
    while (i < L.length && (L[i].vide || L[i].indent > indentParent)) { if (!L[i].vide && base === null) base = L[i].indent; lignes.push(L[i]); i++ }
    while (lignes.length && lignes.at(-1).vide) lignes.pop()
    const t = lignes.map((l) => (l.vide ? '' : l.brut.slice(base ?? 0)))
    return style.startsWith('>') ? t.join(' ').replace(/ {2,}/g, ' ') + '\n' : t.join('\n') + '\n'
  }
  function valeur(indentParent) {
    const l = prochaine()
    if (!l || l.indent <= indentParent) return null
    return l.texte.startsWith('- ') || l.texte === '-' ? liste(l.indent) : mapping(l.indent)
  }
  function mapping(ind) {
    const o = {}
    for (;;) {
      const l = prochaine()
      if (!l || l.indent !== ind || l.texte.startsWith('- ') || l.texte === '-') break
      const m = cleValeur(l.texte)
      if (!m) throw new Error(`YAML illisible, ligne ${i + 1} : « ${court(l.brut, 60)} »`)
      i++
      const cle = String(scalaire(m[1]))
      const reste = sansCom(m[2] ?? '')
      if (reste === '') {
        const n = prochaine()
        o[cle] = n && n.indent === ind && (n.texte.startsWith('- ') || n.texte === '-') ? liste(ind) : valeur(ind)
      } else if (/^[|>][+-]?\d*$/.test(reste)) o[cle] = blocTexte(ind, reste)
      else o[cle] = scalaire(reste)
    }
    return o
  }
  function liste(ind) {
    const a = []
    for (;;) {
      const l = prochaine()
      if (!l || l.indent !== ind || !(l.texte.startsWith('- ') || l.texte === '-')) break
      const reste = l.texte === '-' ? '' : l.texte.slice(2)
      const decal = l.texte === '-' ? 1 : 2 + (reste.match(/^ */)[0].length)
      const r = reste.trimStart()
      if (r === '') { i++; a.push(valeur(ind)) }
      else if (cleValeur(sansCom(r)) && !/^["'[{]/.test(r)) { L[i] = { ...l, indent: ind + decal, texte: r }; a.push(mapping(ind + decal)) }
      else { i++; a.push(scalaire(sansCom(r))) }
    }
    return a
  }
  const v = valeur(-1)
  if (prochaine()) throw new Error(`YAML illisible, ligne ${i + 1} : « ${court(L[i].brut, 60)} »`)
  return v
}

/** Les contrôles de GA-1 à GA-4 sur un texte de flux. → { echecs: { 'GA-1': [] … }, details } */
function jugerFlux(texte) {
  const echecs = { 'GA-1': [], 'GA-2': [], 'GA-3': [], 'GA-4': [] }
  const details = { 'GA-1': '', 'GA-2': '', 'GA-3': '', 'GA-4': '' }
  let W
  try { W = lireYaml(texte) } catch (e) { for (const k of Object.keys(echecs)) echecs[k].push(premiereLigne(e)); return { echecs, details } }
  if (!W || typeof W !== 'object') { for (const k of Object.keys(echecs)) echecs[k].push('le flux n\'est pas un objet YAML'); return { echecs, details } }
  const on = W.on ?? W.true ?? null
  // GA-1
  const decl = on && typeof on === 'object' ? Object.keys(on).sort() : typeof on === 'string' ? [on] : Array.isArray(on) ? [...on].sort() : []
  if (decl.join(',') !== 'repository_dispatch,workflow_dispatch') echecs['GA-1'].push(`déclencheurs ${JSON.stringify(decl)}, exactement repository_dispatch et workflow_dispatch attendus`)
  const types = on?.repository_dispatch?.types
  if (JSON.stringify(types) !== JSON.stringify(['generer-site'])) echecs['GA-1'].push(`repository_dispatch.types = ${JSON.stringify(types)}, [generer-site] attendu`)
  if (!on?.workflow_dispatch?.inputs?.commande || typeof on.workflow_dispatch.inputs.commande !== 'object') echecs['GA-1'].push('workflow_dispatch sans entrée « commande »')
  details['GA-1'] = 'déclencheurs exactement repository_dispatch (types [generer-site]) et workflow_dispatch (entrée commande)'
  // GA-2
  const jobs = W.jobs && typeof W.jobs === 'object' ? Object.entries(W.jobs) : []
  if (jobs.length !== 1) echecs['GA-2'].push(`${jobs.length} job(s), un seul attendu`)
  const [nomJob, job] = jobs[0] ?? ['?', {}]
  if (job?.['runs-on'] !== 'ubuntu-latest') echecs['GA-2'].push(`runs-on = ${JSON.stringify(job?.['runs-on'])}, ubuntu-latest attendu`)
  const t = job?.['timeout-minutes']
  if (typeof t !== 'number' || !(t > 0) || t > 20) echecs['GA-2'].push(`timeout-minutes = ${JSON.stringify(t)}, un nombre ≤ 20 attendu`)
  const conc = [W.concurrency, job?.concurrency].filter((x) => x !== undefined && x !== null)
  if (!conc.length) echecs['GA-2'].push('concurrency absent')
  for (const c of conc) {
    if (typeof c !== 'object' || typeof c.group !== 'string' || !c.group.trim()) echecs['GA-2'].push(`concurrency.group absent (${JSON.stringify(c)})`)
    if (c?.['cancel-in-progress'] !== false) echecs['GA-2'].push(`cancel-in-progress = ${JSON.stringify(c?.['cancel-in-progress'])}, false attendu`)
  }
  const perms = [W.permissions, job?.permissions].filter((x) => x !== undefined)
  if (!perms.length) echecs['GA-2'].push('permissions absent')
  for (const p of perms) if (JSON.stringify(p) !== JSON.stringify({ contents: 'read' })) echecs['GA-2'].push(`permissions = ${JSON.stringify(p)}, { contents: read } et rien de plus attendu`)
  details['GA-2'] = `un job « ${nomJob} » ubuntu-latest, timeout-minutes ${t} ; concurrency ${JSON.stringify(conc[0]?.group)} sans annulation ; permissions contents: read seulement`
  // GA-3
  const etapes = Array.isArray(job?.steps) ? job.steps : []
  if (!etapes.length) echecs['GA-3'].push('aucune étape')
  for (const [k, et] of etapes.entries()) if (/^actions\/upload-artifact\b/.test(String(et?.uses ?? ''))) echecs['GA-3'].push(`étape ${k + 1} : ${et.uses}`)
  if (on && typeof on === 'object' && 'schedule' in on) echecs['GA-3'].push('déclencheur schedule')
  for (const x of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AGENTS_KEY']) if (texte.includes(x)) echecs['GA-3'].push(`${x} mentionné`)
  const secrets = [...new Set([...texte.matchAll(/secrets\s*\.\s*([A-Za-z0-9_]+)|secrets\s*\[\s*['"]([A-Za-z0-9_]+)['"]\s*\]/g)].map((m) => m[1] ?? m[2]))]
  if (secrets.join(',') !== 'LIVRAISON_ENV') echecs['GA-3'].push(`secrets référencés : ${JSON.stringify(secrets)}, LIVRAISON_ENV seul attendu`)
  const runs = etapes.map((et) => String(et?.run ?? ''))
  runs.forEach((r, k) => { if (/\$\{\{\s*secrets\b/.test(r)) echecs['GA-3'].push(`étape ${k + 1} : un secret interpolé dans run: (passer par env:)`) })
  const varsSecret = new Set()
  for (const et of etapes) for (const [k, v] of Object.entries(et?.env ?? {})) if (/secrets\s*[.[]/.test(String(v))) varsSecret.add(k)
  for (const [k, v] of Object.entries({ ...(W.env ?? {}), ...(job?.env ?? {}) })) if (/secrets\s*[.[]/.test(String(v))) varsSecret.add(k)
  const filtrees = etapes.filter((et) => Object.values(et?.env ?? {}).some((v) => /secrets\s*\.\s*LIVRAISON_ENV/.test(String(v))))
  if (!filtrees.length) echecs['GA-3'].push('LIVRAISON_ENV n\'est passé par env: à aucune étape')
  for (const et of filtrees) {
    const r = String(et.run ?? '')
    if (!/grep\s+-E\s+(['"])\^\(NEXT_PUBLIC_SUPABASE_URL\|SUPABASE_SERVICE_ROLE_KEY\)=\1/.test(r)) echecs['GA-3'].push(`l'étape de LIVRAISON_ENV ne filtre pas par grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)='`)
    if (!/>\s*\.env\.local\b/.test(r)) echecs['GA-3'].push('l\'étape de LIVRAISON_ENV n\'écrit pas .env.local')
  }
  runs.forEach((r, k) => {
    for (const ligne of r.split('\n')) {
      const tube = /\||>/.test(ligne)
      if (/\bprintenv\b/.test(ligne)) echecs['GA-3'].push(`étape ${k + 1} : printenv`)
      if (/(^|[;&|]\s*)env\s*($|[;&|])/.test(ligne.trim())) echecs['GA-3'].push(`étape ${k + 1} : env affiché`)
      if (/\bset\s+-[a-z]*x/.test(ligne)) echecs['GA-3'].push(`étape ${k + 1} : set -x (les secrets passeraient au journal)`)
      if (/\bcat\b[^|>]*\.env\.local/.test(ligne) && !tube) echecs['GA-3'].push(`étape ${k + 1} : cat .env.local`)
      for (const v of varsSecret) if (new RegExp(`\\b(echo|printf|cat)\\b[^\\n]*\\$\\{?${v}\\b`).test(ligne) && !tube) echecs['GA-3'].push(`étape ${k + 1} : ${ligne.trim().split(/\s/)[0]} de ${v} vers le journal`)
    }
  })
  details['GA-3'] = `aucun upload-artifact, aucun schedule, aucune clé Anthropic ; LIVRAISON_ENV seul, par env:, filtré par la liste blanche vers .env.local ; rien d'un secret affiché (${varsSecret.size} variable(s) issues d'un secret suivies)`
  // GA-4
  for (const [k, r] of runs.entries()) if (/\$\{\{\s*(github\.event\.client_payload|inputs\.|github\.event\.inputs)/.test(r)) echecs['GA-4'].push(`étape ${k + 1} : l'identifiant interpolé dans run: (passer par env:)`)
  const envs = etapes.map((et) => Object.values(et?.env ?? {}).map(String).join('\n')).join('\n') + JSON.stringify(W.env ?? {}) + JSON.stringify(job?.env ?? {})
  if (!/github\.event\.client_payload\.commande/.test(envs)) echecs['GA-4'].push('client_payload.commande n\'est lu nulle part (par env:)')
  if (!/\b(?:github\.event\.)?inputs\.commande\b/.test(envs)) echecs['GA-4'].push('l\'entrée commande n\'est lue nulle part (par env:)')
  const RE_UUID = /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/i
  const kCheck = runs.findIndex((r) => RE_UUID.test(r))
  const kRun = runs.findIndex((r) => /node\s+--import\s+\.\/scripts\/ts-loader\.mjs\s+scripts\/livrer-site\.mjs\s+"\$\{?\w+\}?"\s+--ci\b/.test(r))
  if (kCheck < 0) echecs['GA-4'].push('aucune comparaison à une expression UUID')
  if (kRun < 0) echecs['GA-4'].push('la commande « node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs "$…" --ci » manque')
  if (kCheck >= 0 && kRun >= 0 && (kCheck > kRun || (kCheck === kRun && runs[kRun].search(RE_UUID) > runs[kRun].search(/scripts\/livrer-site\.mjs/)))) echecs['GA-4'].push('la comparaison UUID vient après le lancement de livrer-site')
  if (kCheck >= 0 && kCheck !== kRun) {
    const check = runs[kCheck]
    if (!/\bexit\s+[1-9]/.test(check)) echecs['GA-4'].push('la comparaison UUID ne fait pas échouer l\'étape (exit ≠ 0)')
  }
  details['GA-4'] = `l'identifiant, lu par env: (client_payload.commande ou l'entrée), comparé à une expression UUID à l'étape ${kCheck + 1}, avant livrer-site.mjs … --ci à l'étape ${kRun + 1}`
  return { echecs, details }
}

/** L'autocontrôle : le flux témoin est vert partout, chaque variante de c/ga-fautifs/ est rouge sur son critère. */
function autocontrole() {
  const out = { 'GA-1': [], 'GA-2': [], 'GA-3': [], 'GA-4': [], fautifs: {} }
  const temoin = path.join(C, 'temoin', '.github', 'workflows', 'generer-site.yml')
  try {
    const v = jugerFlux(fs.readFileSync(temoin, 'utf8'))
    for (const k of ['GA-1', 'GA-2', 'GA-3', 'GA-4']) for (const x of v.echecs[k]) out[k].push(`le flux témoin est refusé (${x})`)
  } catch (e) { for (const k of ['GA-1', 'GA-2', 'GA-3', 'GA-4']) out[k].push(`flux témoin illisible : ${premiereLigne(e)}`) }
  const dossier = path.join(C, 'ga-fautifs')
  const fichiers = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter((f) => /^GA-\d+-.+\.yml$/.test(f)) : []
  for (const k of ['GA-1', 'GA-2', 'GA-3', 'GA-4']) if (!fichiers.some((f) => f.startsWith(`${k}-`))) out[k].push(`aucune variante fautive pour ${k} dans c/ga-fautifs/`)
  for (const f of fichiers) {
    const k = /^(GA-\d+)-/.exec(f)[1]
    if (!out[k]) continue
    const v = jugerFlux(fs.readFileSync(path.join(dossier, f), 'utf8'))
    if (!v.echecs[k].length) out[k].push(`la variante fautive ${f} passe ${k}`)
    else out.fautifs[k] = (out.fautifs[k] ?? 0) + 1
  }
  return out
}
