// scripts/poste-extraction-qa.mjs — le juge de l'extraction du Poste vers lib/ (fiche 026-174), écrit en 026-171 par Claude Code
// AVANT le code qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/poste-extraction-qa.mjs [--racine=<d>] [--base=<commit>] [--temoin] [--reel]
//
//   XT-1  lib/controle/lectures/ : une fonction par lecture (santé, crons, audience, bans, clients, Cerveaux, tickets ouverts) ;
//         chaque route citée les importe au lieu de calculer ;
//   XT-2  sorties inchangées : pour barre, etat, audience, securite/bans, clients et cerveaux, la réponse de l'état jugé égale celle
//         de la référence, champ par champ (puis octet par octet), avec le même compte simulé, les mêmes doublures et les mêmes
//         requêtes en base ;
//   XT-3  le compte des tickets ouverts est UN NOMBRE : aucune colonne de contenu (source et requête), le piège n'apparaît nulle part ;
//   XT-4  chaque route garde sa propre lecture de drapeau (celle d'audience comprise) et la carte de fermeture-e2e la suit ;
//   XT-5  le typage est vert ; les suites controle-*-e2e existantes sont inchangées.
//
// CE QUE CE JUGE PROUVE, ET CE QU'IL NE PROUVE PAS (le mode par défaut tourne dans le cloud, sans compte, sans clé, sans .env.local) :
//   · La « référence » est l'arbre du commit --base (défaut HEAD ; git archive, rien n'est écrit dans .git) ; « l'état jugé » est
//     --racine (défaut : la racine du dépôt). Les DEUX arbres jouent les mêmes requêtes (t/extraction/cas.mjs, une cinquantaine) dans deux processus
//     enfants, sur les mêmes DOUBLURES (t/doublures-b.mjs : base d'essai en mémoire, Stripe, Anthropic, fetch, journal, compteur),
//     horloge figée, avec les mêmes comptes simulés (fondateur, fondateur en lecture, partenaire, sans jeton, artisan). La garde est
//     une doublure : la matrice des droits est la vraie (lib/controle/droits.ts), les 401 et 403 sont ceux que la doublure rend ;
//     que le VRAI garde les rende se prouve avec --reel, non testé dans le cloud.
//   · XT-2 compare : le statut, chaque champ de la réponse (chemin du premier écart), l'ordre des clés (le texte, octet par octet),
//     les requêtes faites à la base (tables, colonnes, filtres, ordre, limite : aucune colonne de plus, aucune de moins) et les
//     gardes appelées (domaine, verbe). Il rougit si UNE valeur change d'un seul champ (--temoin le prouve : XT-HARNAIS).
//   · Il ne prouve pas la fidélité des doublures à Supabase, à Stripe ni à Resend, ni les suites controle-*-e2e (réseau et compte
//     requis : --reel seulement). Le contenu réel des tickets n'est jamais lu : le piège est un jeu d'essai.
//   --reel  (PC seulement, .env.local, NON TESTÉ DANS LE CLOUD, non exigé par verifier) : la copie au drapeau levé de l'état jugé,
//           un fondateur et un artisan d'essai, et rien que des REFUS (401 sans jeton, 403 artisan) sur les six routes ; comptes
//           supprimés dans un finally.
//   --temoin  pose le témoin du lot t (t/temoin/) sur le commit --base, le juge, puis prouve la COMPARAISON (XT-HARNAIS).
//
// Sortie « ✅ ID … » / « ❌ ID … », puis « poste-extraction-qa : PASS|FAIL ». Code 0, 1 ou 2 (appel invalide, préalable manquant).
// N'écrit que sous .orchestre/travail/poste-extraction-qa/.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { R, LOADER, lireOptions, creerSortie, sansCommentaires, lancerAsync, premiereLigne, court, lireOuNull, typecheck } from './fixtures/026-pilotage/a/commun.mjs'
import { commitBase, cheminsBase, copieAvecDrapeau, serveurCopie, avecComptes } from './fixtures/026-pilotage/b/commun.mjs'
import { TRAVAIL, arbreBase, arbreTemoinT, figer, typecheckFichiers, CROCHET, urlDossier, DOUBLURES_B, T } from './fixtures/026-pilotage/t/commun-b.mjs'
import { ROUTES, CAS } from './fixtures/026-pilotage/t/extraction/cas.mjs'
import { baseExtraction, TICKETS, INSTANT, X } from './fixtures/026-pilotage/t/extraction/base.mjs'

const JUGE = 'poste-extraction-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const MARQUE = `@@${JUGE}@@ `
const o = lireOptions(process.argv.slice(2), { connues: ['base', 'reel', 'enfant'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)

const ROUTE_DE = (r) => `app/api/controle/${r}/route.ts`
const LECTURES = 'lib/controle/lectures'
const CARTE = 'scripts/fermeture-e2e.mjs'
/** Chaque route, la lecture qu'elle doit importer, et ce qu'elle ne doit plus calculer elle-même. */
const ATTENDU = {
  barre: { lecture: 'santeService', calcul: [/\bfetch\s*\(/, /api\/controle\/etat/] },
  etat: { lecture: 'cronsDuService', calcul: [/passages_cron/] },
  audience: { lecture: 'audience', calcul: [/audience_direct/, /audience_historique/] },
  'securite/bans': { lecture: 'bans', calcul: [/ip_abus/, /expires_le/] },
  clients: { lecture: 'clients', calcul: [/registre_apports/, /['"`]leads['"`]/, /from\(\s*['"`]artisans['"`]/] },
  cerveaux: { lecture: 'cerveaux', calcul: [/readdirSync/, /score\.json/] },
}
const NOMS_LECTURES = ['santeService', 'cronsDuService', 'audience', 'bans', 'clients', 'cerveaux', 'ticketsOuverts']
const MOTS_CONTENU = /\b(message|messages|corps|sujet|contenu)\b/i
const CWD = { avec: path.join(X, 'cwd-avec'), vide: path.join(X, 'cwd-vide') }
const COMPTES = {
  fondateur: { uid: '90000000-0000-4000-8000-00000000f001', email: null, role: 'direction', roleInterne: 'fondateur', iat: 0, ip: '127.0.0.1' },
  lecture: { uid: '90000000-0000-4000-8000-00000000f002', email: null, role: 'lecture', roleInterne: 'fondateur', iat: 0, ip: '127.0.0.1' },
  partenaire: { uid: '90000000-0000-4000-8000-00000000f003', email: null, role: 'lecture', roleInterne: 'partenaire', iat: 0, ip: '127.0.0.1' },
}
const REFUS = { sans_jeton: { error: 'Jeton absent.', status: 401, code: 'jeton_absent' }, artisan: { error: 'Réservé aux fondateurs.', status: 403 } }
const ETAT_OK = { niveau: 'ok', controles: [{ cle: 'site', etat: 'ok', libelle: 'Site public' }] }

// ═══ L'enfant : les six routes jouées sur les doublures (une fois sur la référence, une fois sur l'état jugé) ════════════════
async function enfant(RAC, quoi) {
  const res = { cas: {}, tickets: null }
  for (const k of ['log', 'info', 'warn', 'error', 'debug']) { const f = console[k]; console[k] = (...a) => { if (k === 'log' && String(a[0]).startsWith(MARQUE)) f(...a) } }
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: {
    racine: urlDossier(RAC), depot: urlDossier(R), doublures: pathToFileURL(DOUBLURES_B).href,
    doubles: { 'lib/flags': 'flags', 'lib/direction/garde': 'garde', 'lib/direction/journal': 'journal', 'lib/supabaseAdmin': 'supabase', 'lib/limites': 'limites', 'lib/direction/stripe': 'stripe', 'lib/alertes': 'alertes' },
    prefixes: {}, paquets: { 'next/server': 'next' },
  } })
  const D = await import(`${pathToFileURL(DOUBLURES_B).href}?m=juge`)
  const E = D.etat
  const erreurs = (x) => (x && typeof x === 'object' && '__erreur' in x ? new Error(x.__erreur) : x)
  const convertir = (o2) => (o2 && typeof o2 === 'object' && !Array.isArray(o2) ? Object.fromEntries(Object.entries(o2).map(([k, v]) => [k, erreurs(v)])) : o2)
  globalThis.fetch = async (u, init) => {
    const url = String(u?.url ?? u)
    E.appels.push({ f: 'fetch', url: url.replace(/^https?:\/\/[^/]+/, '<origine>'), methode: init?.method ?? 'GET', jeton: init?.headers?.Authorization ?? null })
    const F = E.config.fetch ?? {}
    if (F.coupure) throw new Error('connexion coupée (doublure)')
    const rep = (status, json) => new Response(JSON.stringify(json ?? {}), { status, headers: { 'content-type': 'application/json' } })
    if (/\/api\/controle\/etat$/.test(url)) return rep(F.etat?.status ?? 200, F.etat?.json ?? ETAT_OK)
    if (/api\.resend\.com\/domains$/.test(url)) return rep(F.resend?.status ?? 200, F.resend?.json ?? { data: [{ name: 'prestiapp.fr', status: 'verified' }] })
    if (/^https?:\/\/[^/]+\/login$/.test(url)) return rep(F.login ?? 200, {})
    if (/^https?:\/\/[^/]+\/?$/.test(url)) return rep(F.site ?? 200, {})
    throw new Error(`réseau interdit dans ${JUGE} (enfant) : ${url}`)
  }
  const importer = async (rel) => { try { return await import(pathToFileURL(path.join(RAC, rel)).href) } catch (e) { return { __erreur: premiereLigne(e) } } }
  const modules = {}
  const signature = (a) => {
    if (a.f === 'from') return { f: 'from', table: a.table, colonnes: a.q.colonnes ?? null, options: a.q.options ?? null, filtres: a.q.filtres, ordre: a.q.ordre, limite: a.q.limite, unique: a.q.unique }
    if (a.f === 'rpc') return { f: 'rpc', nom: a.nom, args: a.args }
    return a
  }
  for (const [i, c] of CAS.entries()) {
    figer(new Date(Date.parse(INSTANT) + i * 600_000).toISOString()) // dix minutes par cas : les caches des sources (5 min au plus) ne servent pas d'un cas à l'autre
    process.chdir(CWD[c.cwd ?? 'avec'])
    for (const k of ['ANTHROPIC_WORKSPACE_PRESTI', 'BUDGET_IA_MENSUEL_EUR', 'TAUX_USD_EUR']) delete process.env[k]
    process.env.RESEND_API_KEY = 'cle-essai-resend'
    for (const [k, v] of Object.entries(c.env ?? {})) process.env[k] = v
    const b = baseExtraction({ pannes: c.pannes ?? [], surcharges: { ...(c.surcharges ?? {}), messages: c.messages } })
    E.appels.length = 0
    E.compteurs = undefined
    E.config = {
      drapeaux: { direction: true, audience: true, apports: true, messagerie: true, ...(c.drapeaux ?? {}) },
      fondateur: COMPTES[c.compte] ?? null, refusGarde: REFUS[c.compte] ?? null, rpc: b.rpc, table: b.table,
      stripe: convertir(c.stripe), coutIA: erreurs(c.coutIA), estimationCredits: c.estimationCredits ?? null, saturee: c.saturee ?? false, fetch: c.fetch ?? {},
    }
    const M = (modules[c.route] ??= await importer(ROUTE_DE(c.route)))
    let sortie
    try {
      if (typeof M.GET !== 'function') throw new Error(`${ROUTE_DE(c.route)} : ${M.__erreur ?? 'pas de GET'}`)
      const r = await M.GET(new Request(`http://127.0.0.1:3400${c.chemin}`, { headers: c.compte === 'sans_jeton' ? {} : { authorization: 'Bearer jeton-essai' } }))
      sortie = { status: r.status, text: await r.text() }
    } catch (e) { sortie = { status: 'exception', text: premiereLigne(e) } }
    const appels = E.appels.map(signature)
    sortie.gardes = appels.filter((a) => ['estFondateur', 'estDirection', 'exigerDomaine'].includes(a.f)).map((a) => JSON.stringify(a))
    sortie.drapeaux = [...new Set(appels.filter((a) => a.f === 'actif').map((a) => a.drapeau))].sort()
    sortie.requetes = appels.filter((a) => ['from', 'rpc', 'fetch', 'consommerLimite', 'limiteAtteinte', 'journaliser', 'mrr', 'encaisseDuMois', 'joignable', 'coutIADuMois', 'estimationDepuisLesCredits'].includes(a.f)).map((a) => JSON.stringify(a)).sort()
    res.cas[c.nom] = sortie
  }
  if (quoi === 'jugé') {
    // XT-3 : ticketsOuverts() sur la table `tickets` du jeu d'essai (le contenu y est un piège).
    const t = { trouve: false }
    try {
      figer(INSTANT)
      const dossier = path.join(RAC, LECTURES)
      let fonction = null, ou = null
      const candidats = [path.join(dossier, 'index.ts'), ...(fs.existsSync(dossier) ? fs.readdirSync(dossier).filter((f) => /\.tsx?$/.test(f) && f !== 'index.ts').map((f) => path.join(dossier, f)) : [])]
      for (const f of candidats) {
        if (!fs.existsSync(f)) continue
        try { const m = await import(pathToFileURL(f).href); if (typeof m.ticketsOuverts === 'function') { fonction = m.ticketsOuverts; ou = path.relative(RAC, f).split(path.sep).join('/'); break } } catch (e) { t.erreurImport = premiereLigne(e) }
      }
      if (fonction) {
        t.trouve = true; t.ou = ou
        const b = baseExtraction({})
        E.appels.length = 0
        E.config = { drapeaux: { direction: true }, fondateur: COMPTES.fondateur, rpc: b.rpc, table: b.table }
        try { t.resultat = await fonction() } catch (e) { t.erreur = premiereLigne(e) }
        t.appels = E.appels.filter((a) => a.f === 'from').map(signature)
        const b0 = baseExtraction({ surcharges: { tables: { tickets: [] } } })
        E.appels.length = 0
        E.config = { drapeaux: { direction: true }, fondateur: COMPTES.fondateur, rpc: b0.rpc, table: b0.table }
        try { t.resultatVide = await fonction() } catch (e) { t.erreurVide = premiereLigne(e) }
      }
    } catch (e) { t.erreur = premiereLigne(e) }
    res.tickets = t
  }
  return res
}
if (o.valeurs.enfant) {
  const RAC = o.racine
  const r = await enfant(RAC, o.valeurs.enfant)
  console.log(MARQUE + JSON.stringify(r))
  process.exit(0)
}

// ═══ Le juge ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
if (o.temoin && o.valeurs.racine) refuser('--temoin ne se combine pas avec --racine')
const REEL = o.drapeaux.has('reel')
let BASE
try { BASE = commitBase(o.valeurs.base) } catch (e) { refuser(premiereLigne(e)) }
const SUITES = cheminsBase(BASE, 'scripts').filter((f) => /^scripts\/controle-[\w-]*-e2e\.mjs$/.test(f))
const CHEMINS = ['app/api/controle', 'lib', 'package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'proxy.ts', CARTE, ...SUITES]
let RAC = o.racine, REF = null, TEMOIN = null
try { REF = arbreBase(JUGE, { base: BASE, chemins: CHEMINS }) } catch (e) { refuser(`référence impossible à extraire : ${premiereLigne(e)}`) }
if (o.temoin) {
  try { TEMOIN = arbreTemoinT(JUGE, { base: BASE, chemins: CHEMINS }); RAC = TEMOIN.dest } catch (e) { refuser(`témoin impossible à poser : ${premiereLigne(e)}`) }
}
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
const RACINE_REELLE = !o.valeurs.racine && !o.temoin
const IDS = ['XT-1', 'XT-2', 'XT-3', 'XT-4', 'XT-5']
if (o.temoin) IDS.push('XT-HARNAIS')
const S = creerSortie(JUGE, [...IDS], `${JUGE} — état jugé ${RAC}${TEMOIN ? ` — témoin du lot t posé sur ${BASE.slice(0, 7)}` : ''} — référence ${BASE.slice(0, 7)} — doublures, sans compte ni clé${REEL ? ' + --reel (compte d’essai : refus seulement, NON TESTÉ dans le cloud)' : ''}`)
const lireRac = (rel) => { const t = lireOuNull(path.join(RAC, rel)); return t === null ? null : t.replace(/\r\n?/g, '\n') }
const lireRef = (rel) => { const t = lireOuNull(path.join(REF, rel)); return t === null ? null : t.replace(/\r\n?/g, '\n') }
const code = (t) => (t === null ? null : sansCommentaires(t))
const fusion = {}
const noter = (id, e, d) => { const x = (fusion[id] ??= { e: [], d: [] }); x.e.push(...e); if (d) x.d.push(d) }
function importsNommes(src) {
  const m = new Map()
  for (const x of (code(src) ?? '').matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) for (const n of x[1].split(',').map((y) => y.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)) m.set(n, x[2])
  return m
}
const lecturesFichiers = (racine) => {
  const d = path.join(racine, LECTURES)
  if (!fs.existsSync(d)) return null
  const sortie = []
  const marche = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) marche(p); else if (/\.tsx?$/.test(e.name)) sortie.push(p) } }
  marche(d)
  return sortie.sort()
}

// ── XT-1 : les lectures existent, les routes les importent au lieu de calculer ─────────────────────────────────────────────
const fichiersLectures = lecturesFichiers(RAC)
const SRC = Object.fromEntries(ROUTES.map((r) => [r, lireRac(ROUTE_DE(r))]))
{
  const e = []
  if (!fichiersLectures) e.push(`${LECTURES}/ absent`)
  else {
    const sources = fichiersLectures.map((f) => ({ f: path.relative(RAC, f).split(path.sep).join('/'), src: code(fs.readFileSync(f, 'utf8').replace(/\r\n?/g, '\n')) }))
    for (const nom of NOMS_LECTURES) {
      const def = new RegExp(`export\\s+(?:async\\s+)?function\\s+${nom}\\b|export\\s+const\\s+${nom}\\b`)
      if (!sources.some((s) => def.test(s.src))) e.push(`${LECTURES}/ n'exporte pas ${nom}()`)
    }
    for (const s of sources) {
      if (/next\/server|NextResponse/.test(s.src)) e.push(`${s.f} importe next/server : une lecture rend des données, jamais une réponse`)
    }
  }
  for (const r of ROUTES) {
    const src = SRC[r], f = ROUTE_DE(r), { lecture, calcul } = ATTENDU[r]
    if (src === null) { e.push(`${f} absent`); continue }
    const imps = importsNommes(src)
    const de = imps.get(lecture)
    if (!de) e.push(`${f} n'importe pas ${lecture}`)
    else if (!/^@\/lib\/controle\/lectures(\/[\w-]+)?$/.test(de)) e.push(`${f} importe ${lecture} de « ${de} », @/lib/controle/lectures attendu`)
    else {
      const rel = de.replace(/^@\//, '')
      if (!fs.existsSync(path.join(RAC, `${rel}.ts`)) && !fs.existsSync(path.join(RAC, rel, 'index.ts'))) e.push(`${f} importe « ${de} », qui n'existe pas dans l'état jugé`)
      if (!new RegExp(`\\b${lecture}\\s*\\(`).test(code(src))) e.push(`${f} importe ${lecture} sans l'appeler`)
    }
    for (const re of calcul) if (re.test(code(src))) e.push(`${f} calcule encore lui-même (${re.source}) au lieu d'appeler ${lecture}()`)
  }
  noter('XT-1', e, `${LECTURES}/ : ${NOMS_LECTURES.join(', ')} ; chacune des six routes importe sa lecture et ne recalcule plus`)
}
if (fusion['XT-1'].e.length) {
  S.juger('XT-1', fusion['XT-1'].e, '')
  S.nonJuges(IDS, 'XT-1 en échec (lectures absentes ou routes qui calculent encore) : rien n\'est joué')
  process.exit(S.finir())
}

// ── XT-3 (source) : la lecture des tickets ne sélectionne aucune colonne de contenu ────────────────────────────────────────
const fichierTickets = fichiersLectures.find((f) => /export\s+(?:async\s+)?function\s+ticketsOuverts\b|export\s+const\s+ticketsOuverts\b/.test(code(fs.readFileSync(f, 'utf8'))))
{
  const e = []
  if (!fichierTickets) e.push('ticketsOuverts introuvable')
  else {
    const brut = fs.readFileSync(fichierTickets, 'utf8').replace(/\r\n?/g, '\n')
    const chaines = []
    const src = sansCommentaires(brut, chaines)
    const nom = path.relative(RAC, fichierTickets).split(path.sep).join('/')
    // Dans les chaînes seulement : `error.message` (un identifiant) n'est pas une colonne ; « 'id, sujet' » en est une.
    const mot = chaines.map((c) => MOTS_CONTENU.exec(c.texte)).find(Boolean)
    if (mot) e.push(`${nom} nomme une colonne de contenu dans une chaîne (« ${mot[0]} ») : ni message, ni corps, ni sujet, ni contenu`)
    const selects = [...src.matchAll(/\.select\(\s*(['"`])([\s\S]*?)\1/g)].map((m) => m[2].trim())
    if (!selects.length) e.push(`${nom} : aucun .select( : rien ne prouve ce qui est lu`)
    if (selects.some((s) => s === '*' || s === '')) e.push(`${nom} : .select('*') lit toutes les colonnes, contenu compris`)
    if (!/\bcount\b/.test(src)) e.push(`${nom} ne compte pas (count) : le compte doit être calculé par la base`)
  }
  noter('XT-3', e, 'source : ticketsOuverts ne nomme aucune colonne de contenu, ne sélectionne pas « * » et compte')
}

// ── XT-4 : chaque route garde sa lecture de drapeau ; la carte de fermeture-e2e les suit ──────────────────────────────────
{
  const e = []
  const drapeaux = (src) => new Set([...(code(src) ?? '').matchAll(/actif\(\s*['"`](\w+)['"`]\s*\)/g)].map((m) => m[1]))
  for (const r of ROUTES) {
    const avant = lireRef(ROUTE_DE(r)), apres = SRC[r]
    if (avant === null) continue
    const a = drapeaux(avant), b = drapeaux(apres)
    for (const f of a) if (!b.has(f)) e.push(`${ROUTE_DE(r)} ne lit plus lui-même actif('${f}') (la lecture extraite ne le remplace pas : « chaque route garde sa propre lecture de drapeau »)`)
  }
  if (!drapeaux(SRC.audience).has('audience')) e.push(`${ROUTE_DE('audience')} : actif('audience') absent (fermeture-e2e exige que chaque route lise elle-même son drapeau)`)
  const carte = (t) => {
    const m = new Map()
    for (const l of (t ?? '').split('\n')) { const x = /^\s*'(\w+)':\s*\['route',(.*)\],?\s*$/.exec(l); if (x) m.set(x[1], [...x[2].matchAll(/'(app\/[^']+)'/g)].map((y) => y[1])) }
    return m
  }
  const cJug = carte(lireRac(CARTE)), cRef = carte(lireRef(CARTE))
  if (!cJug.size) e.push(`${CARTE} : la carte des drapeaux est introuvable`)
  const suivies = new Set(ROUTES.map(ROUTE_DE))
  for (const [flag, fichiers] of cJug) for (const f of fichiers) if (suivies.has(f)) {
    if (!new RegExp(`actif\\(['"\`]${flag}['"\`]\\)`).test(code(lireRac(f)) ?? '')) e.push(`${CARTE} : la carte range ${f} sous « ${flag} », mais le fichier ne lit pas actif('${flag}')`)
  }
  for (const [flag, fichiers] of cRef) for (const f of fichiers) if (suivies.has(f) && !(cJug.get(flag) ?? []).includes(f)) e.push(`${CARTE} : ${f} n'est plus rangé sous « ${flag} »`)
  noter('XT-4', e, `chaque route lit encore les drapeaux qu'elle lisait (audience : actif('audience')) ; la carte de ${CARTE} range les mêmes routes sous les mêmes drapeaux et chacune les lit (node ${CARTE} lui-même exige le réseau : --reel)`)
}

// ── Les enfants : la référence et l'état jugé jouent les mêmes cas ────────────────────────────────────────────────────────
const MARQUEURS = { ref: null, jug: null }
async function lancerEnfant(racine, quoi) {
  const r = await lancerAsync(process.execPath, ['--import', pathToFileURL(LOADER).href, CE_SCRIPT, `--enfant=${quoi}`, `--racine=${racine}`], { cwd: R, timeout: 300_000 })
  const l = r.stdout.split(/\r?\n/).find((x) => x.startsWith(MARQUE))
  if (!l) return { erreur: `enfant ${quoi} sans résultat (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) : ${court(r.stderr || r.stdout, 300)}` }
  try { return JSON.parse(l.slice(MARQUE.length)) } catch (err) { return { erreur: `résultat de l’enfant ${quoi} illisible : ${premiereLigne(err)}` } }
}
;[MARQUEURS.ref, MARQUEURS.jug] = await Promise.all([lancerEnfant(REF, 'référence'), lancerEnfant(RAC, 'jugé')])

// ── La comparaison (XT-2) : champ par champ, puis octet par octet ──────────────────────────────────────────────────────────
/** Les écarts entre deux valeurs JSON : « chemin : avant ≠ après ». */
function ecarts(a, b, chemin = '$') {
  const out = []
  const tA = Array.isArray(a) ? 'liste' : a === null ? 'null' : typeof a, tB = Array.isArray(b) ? 'liste' : b === null ? 'null' : typeof b
  if (tA !== tB) return [`${chemin} : ${tA} ≠ ${tB}`]
  if (tA === 'liste') {
    if (a.length !== b.length) out.push(`${chemin} : ${a.length} élément(s) ≠ ${b.length}`)
    for (let i = 0; i < Math.min(a.length, b.length); i++) out.push(...ecarts(a[i], b[i], `${chemin}[${i}]`))
  } else if (tA === 'object') {
    for (const k of Object.keys(a)) if (!(k in b)) out.push(`${chemin}.${k} : présent dans la référence, absent de l'état jugé`)
    for (const k of Object.keys(b)) if (!(k in a)) out.push(`${chemin}.${k} : ajouté par l'état jugé`)
    for (const k of Object.keys(a)) if (k in b) out.push(...ecarts(a[k], b[k], `${chemin}.${k}`))
  } else if (a !== b) out.push(`${chemin} : ${court(JSON.stringify(a), 40)} ≠ ${court(JSON.stringify(b), 40)}`)
  return out
}
/** Compare deux relevés de cas. → liste de défauts (vide : identiques). */
function comparer(ref, jug) {
  const e = []
  for (const c of CAS) {
    const a = ref[c.nom], b = jug[c.nom]
    if (!a || !b) { e.push(`« ${c.nom} » : relevé absent (${!a ? 'référence' : 'état jugé'})`); continue }
    if (a.status !== b.status) { e.push(`« ${c.nom} » : statut ${a.status} ≠ ${b.status}`); continue }
    let ja = null, jb = null
    try { ja = JSON.parse(a.text) } catch { /* pas du JSON */ }
    try { jb = JSON.parse(b.text) } catch { /* pas du JSON */ }
    const d = ja !== null && jb !== null ? ecarts(ja, jb) : a.text === b.text ? [] : [`texte ${court(a.text, 40)} ≠ ${court(b.text, 40)}`]
    if (d.length) e.push(`« ${c.nom} » : ${d.slice(0, 3).join(' ; ')}${d.length > 3 ? ` ; … (${d.length} écarts)` : ''}`)
    else if (a.text !== b.text) e.push(`« ${c.nom} » : mêmes champs, mais ordre ou forme du texte différents (la sortie ne doit pas changer d'un octet)`)
    if (JSON.stringify(a.gardes) !== JSON.stringify(b.gardes)) e.push(`« ${c.nom} » : gardes appelées différentes (${court(a.gardes.join(' '), 90)} ≠ ${court(b.gardes.join(' '), 90)})`)
    // Un drapeau lu plus tôt ou en plus n'a pas d'effet sur la sortie ; un drapeau de la référence que l'état jugé ne lit plus, si.
    const perdus = a.drapeaux.filter((f) => !b.drapeaux.includes(f))
    if (perdus.length) e.push(`« ${c.nom} » : drapeau(x) lu(s) par la référence et plus par l'état jugé : ${perdus.join(', ')}`)
    if (JSON.stringify(a.requetes) !== JSON.stringify(b.requetes)) {
      const A = new Set(a.requetes), B = new Set(b.requetes)
      const enMoins = a.requetes.filter((x) => !B.has(x)), enPlus = b.requetes.filter((x) => !A.has(x))
      e.push(`« ${c.nom} » : requêtes différentes${enMoins.length ? ` — en moins : ${court(enMoins[0], 110)}` : ''}${enPlus.length ? ` — en plus : ${court(enPlus[0], 110)}` : ''}${!enMoins.length && !enPlus.length ? ' (nombre d’appels)' : ''}`)
    }
  }
  return e
}
/** Ce que le relevé de la référence doit montrer pour que la comparaison vaille quelque chose (les doublures marchent). */
function saneRef(ref) {
  const e = []
  const attendu = (c) => {
    if (c.compte === 'sans_jeton' && !c.drapeaux) return 401
    if (c.compte === 'artisan') return 403
    if (c.compte === 'partenaire' && ['etat', 'audience', 'securite/bans'].includes(c.route)) return 403
    if (c.compte === 'lecture' && c.route === 'securite/bans') return 403
    if (c.compte === 'fondateur' && c.drapeaux?.audience === false) return 404
    if (c.compte === 'fondateur' && c.pannes?.includes('rpc:audience_direct') && c.messages) return 503
    if (c.compte === 'fondateur' && c.route === 'clients' && c.pannes?.includes('table:artisans')) return 503
    if (c.compte === 'fondateur' && c.route === 'securite/bans' && c.pannes?.includes('table:ip_bans')) return 503
    if (c.compte === 'fondateur' && !(c.pannes ?? []).length) return 200
    return null
  }
  for (const c of CAS) {
    const a = ref[c.nom], x = attendu(c)
    if (!a) { e.push(`référence : « ${c.nom} » non joué`); continue }
    if (x !== null && a.status !== x) e.push(`référence : « ${c.nom} » → ${a.status}, ${x} attendu (la doublure ne joue pas le cas)`)
    if (a.status === 'exception') e.push(`référence : « ${c.nom} » lève une exception (${a.text})`)
  }
  return e
}

// ── XT-2, XT-3 (sorties), XT-HARNAIS ──────────────────────────────────────────────────────────────────────────────────────
{
  const e2 = [], e3 = []
  const { ref: ER, jug: EJ } = MARQUEURS
  if (ER.erreur) e2.push(`référence : ${ER.erreur}`)
  if (EJ.erreur) e2.push(`état jugé : ${EJ.erreur}`)
  if (!ER.erreur && !EJ.erreur) {
    e2.push(...saneRef(ER.cas))
    e2.push(...comparer(ER.cas, EJ.cas))
    const T3 = EJ.tickets
    if (!T3?.trouve) e3.push(`ticketsOuverts() introuvable dans l'état jugé${T3?.erreurImport ? ` (import : ${T3.erreurImport})` : ''}`)
    else {
      if (T3.erreur) e3.push(`ticketsOuverts() lève : ${T3.erreur}`)
      else {
        const r = T3.resultat
        if (!r || typeof r !== 'object' || Array.isArray(r) || Object.keys(r).join() !== 'nombre') e3.push(`ticketsOuverts() rend ${court(JSON.stringify(r), 100)}, { nombre } et rien d'autre attendu`)
        else if (typeof r.nombre !== 'number' || !Number.isInteger(r.nombre)) e3.push(`ticketsOuverts().nombre = ${JSON.stringify(r.nombre)}, un entier attendu`)
        else if (r.nombre !== TICKETS.ouverts) e3.push(`ticketsOuverts().nombre = ${r.nombre}, ${TICKETS.ouverts} attendu (les tickets dont ferme_le est nul)`)
        if (T3.erreurVide) e3.push(`ticketsOuverts() sans ticket lève : ${T3.erreurVide}`)
        else if (T3.resultatVide?.nombre !== 0) e3.push(`ticketsOuverts() sans ticket rend ${court(JSON.stringify(T3.resultatVide), 60)}, { nombre: 0 } attendu`)
      }
      const tq = (T3.appels ?? []).filter((a) => a.table === 'tickets')
      if (!tq.length) e3.push('ticketsOuverts() ne lit pas la table `tickets`')
      for (const q of tq) {
        const cols = q.colonnes
        if (cols === null || cols === undefined || String(cols).trim() === '*') e3.push(`la requête sur tickets lit « ${cols ?? 'toutes les colonnes'} » : une liste de colonnes sans contenu attendue`)
        else if (MOTS_CONTENU.test(String(cols))) e3.push(`la requête sur tickets sélectionne « ${cols} » : une colonne de contenu`)
      }
    }
    // Le piège ne sort nulle part : ni des réponses des routes, ni du résultat de ticketsOuverts().
    const sorties = JSON.stringify([...Object.values(EJ.cas).map((c) => c.text), EJ.tickets?.resultat ?? null, EJ.tickets?.resultatVide ?? null])
    for (const p of TICKETS.pieges) if (sorties.includes(p)) e3.push(`le piège « ${court(p, 40)} » sort dans une réponse`)
  }
  noter('XT-2', e2, `${CAS.length} requêtes sur ${ROUTES.length} routes (fondateur, fondateur en lecture, partenaire, sans jeton, artisan ; pannes, drapeaux baissés, recherches) : statut, champs, ordre des clés (octet par octet), requêtes en base et gardes égaux à la référence ${BASE.slice(0, 7)}`)
  noter('XT-3', e3, `ticketsOuverts() → { nombre: ${TICKETS.ouverts} } sur des tickets dont le contenu est un piège ; requête sans colonne de contenu ; le piège n'apparaît dans aucune sortie`)
}

// ── XT-5 : le typage, les suites inchangées ───────────────────────────────────────────────────────────────────────────────
{
  const e = []
  const fichiers = [...ROUTES.map(ROUTE_DE), ...fichiersLectures.map((f) => path.relative(RAC, f).split(path.sep).join('/'))]
  const t = typecheckFichiers(RAC, JUGE, fichiers)
  if (!t.ok) e.push(t.detail)
  let complet = ''
  if (RACINE_REELLE) {
    const c = typecheck(R, JUGE)
    if (!c.ok) e.push(`npm run typecheck : ${c.detail}`)
    complet = ` ; npm run typecheck (dépôt entier) : ${c.detail}`
  }
  let inchangees = 0
  for (const rel of SUITES) {
    const avant = lireRef(rel), apres = lireRac(rel)
    if (avant === null) continue
    if (apres === null) e.push(`${rel} a disparu`)
    else if (apres !== avant) e.push(`${rel} a changé depuis ${BASE.slice(0, 7)} (aucune suite existante ne se retouche pour faire passer l'extraction)`)
    else inchangees++
  }
  noter('XT-5', e, `${t.detail}${complet} ; ${inchangees} suite(s) controle-*-e2e inchangée(s) depuis ${BASE.slice(0, 7)} (leur exécution exige le réseau et un compte : --reel, non testé dans le cloud)`)
}

// ── XT-HARNAIS (--temoin) : la comparaison sait rougir ────────────────────────────────────────────────────────────────────
if (o.temoin) {
  const e = []
  const ref = MARQUEURS.ref.cas ?? {}
  if (!Object.keys(ref).length) e.push('relevé de la référence vide')
  else {
    const neuf = () => JSON.parse(JSON.stringify(ref))
    const identiques = comparer(ref, neuf())
    if (identiques.length) e.push(`la référence comparée à elle-même n'est pas identique : ${identiques[0]}`)
    const cible = CAS.find((c) => c.nom === 'clients · fondateur')?.nom
    const essais = [
      ['une valeur change d’un champ', (n) => { const j = JSON.parse(n[cible].text); j.resume.total += 1; n[cible].text = JSON.stringify(j) }],
      ['une clé disparaît', (n) => { const j = JSON.parse(n[cible].text); delete j.canalIndisponible; n[cible].text = JSON.stringify(j) }],
      ['une clé s’ajoute', (n) => { const j = JSON.parse(n[cible].text); j.extra = 1; n[cible].text = JSON.stringify(j) }],
      ['deux clés changent de place', (n) => { const j = JSON.parse(n[cible].text); const { role, ...reste } = j; n[cible].text = JSON.stringify({ role, ...reste }) }],
      ['le statut change', (n) => { n[cible].status = 500 }],
      ['une colonne de plus est lue', (n) => { const i = n[cible].requetes.findIndex((x) => x.includes('"table":"artisans"')); const q = JSON.parse(n[cible].requetes[i]); q.colonnes += ', email'; n[cible].requetes[i] = JSON.stringify(q) }],
      ['une garde change de domaine', (n) => { n[cible].gardes = n[cible].gardes.map((g) => g.replace('"domaine":"clients"', '"domaine":"sante"')) }],
    ]
    for (const [quoi, f] of essais) { const n = neuf(); f(n); if (!comparer(ref, n).length) e.push(`la comparaison ne voit pas : ${quoi}`) }
  }
  S.juger('XT-HARNAIS', e, 'la comparaison rend « identique » pour la référence face à elle-même, et rougit pour chacune des sept fautes : une valeur, une clé retirée, une clé ajoutée, l’ordre des clés, le statut, une colonne lue, un domaine de garde')
}

for (const id of IDS) {
  if (id === 'XT-HARNAIS') continue
  const a = fusion[id]
  if (!a) { S.echoue(id, 'non évalué'); continue }
  S.juger(id, a.e, a.d.join(' ; '))
}

// ── Le vivant (--reel, PC seulement, NON TESTÉ DANS LE CLOUD, non exigé par verifier) ─────────────────────────────────────
// >>> REEL
async function reel() {
  const e = [], vu = []
  let srv = null
  try {
    if (!RACINE_REELLE) throw new Error('--reel se joue sur la racine réelle (ni --racine ni --temoin)')
    const c = copieAvecDrapeau(R, { critere: 'XT-2' })
    srv = await serveurCopie(c.dest, { critere: 'XT-2' })
    const lire = async (p, jeton) => (await fetch(`${srv.base}${p}`, { headers: jeton ? { Authorization: `Bearer ${jeton}` } : {} })).status
    const { resultat, menage, erreur } = await avecComptes(['artisan'], async ({ artisan }) => {
      const pb = []
      for (const r of ROUTES) {
        const chemin = `/api/controle/${r}`
        const a = await lire(chemin, null); if (a !== 401 && a !== 404) pb.push(`${chemin} sans jeton → ${a}, 401 (ou 404 si le drapeau est baissé) attendu`)
        const b = await lire(chemin, artisan.jeton); if (b !== 403 && b !== 404) pb.push(`${chemin} artisan → ${b}, 403 (ou 404) attendu`)
      }
      return pb
    })
    if (erreur) throw erreur
    e.push(...resultat)
    if (!menage) e.push('le compte d’essai n’a pas disparu')
    vu.push('copie au drapeau levé : 401 sans jeton et 403 pour un artisan sur les six routes (refus seulement) ; compte supprimé dans un finally')
  } catch (err) { e.push(`--reel : ${premiereLigne(err)}`) } finally { if (srv) await srv.arreter() }
  S.juger('XT-2', e, vu.join(' ; '))
}
// <<< REEL
if (REEL) await reel()
process.exit(S.finir())
