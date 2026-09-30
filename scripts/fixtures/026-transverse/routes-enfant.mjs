// scripts/fixtures/026-transverse/routes-enfant.mjs — l'enfant du juge du pont Telegram, partie routes (fiche 026-194, Claude Code).
//
//   node --experimental-strip-types --no-warnings --import <dépôt>/scripts/ts-loader.mjs routes-enfant.mjs --racine=<arbre jugé> --depot=<dépôt>
//   (cwd = la racine jugée)
//
// Ce processus charge le VRAI code de la racine jugée (lib/agents/telegram.ts et les deux routes) avec :
//   · les doublures de next/server, lib/flags, lib/agents/garde et lib/agents/pause (routes-doublures.mjs, par le crochet) ;
//   · le VRAI lib/supabaseAdmin.ts et le VRAI lib/agents/bus.ts, dont le client parle à un faux PostgREST (scripts/lib/faux-postgrest.mjs)
//     hébergé dans CE processus, sur 127.0.0.1 : il consigne chaque appel, sert une fausse table `alertes` piégée (filtres, ordre,
//     limite et colonnes du `select` appliqués comme PostgREST le ferait) et de faux événements (pilotage_evenements applique
//     p_apres, p_limite, p_agent, p_types) ;
//   · un garde-fou réseau : tout `fetch` hors 127.0.0.1 est refusé.
// Il ne juge rien : il exécute les commandes que le juge (parties/routes.mjs) lui envoie sur son entrée standard, une ligne JSON
// chacune, et répond par une ligne « @@<json> » sur sa sortie standard (tout autre texte est du bruit de la route jugée).
//   { cmd:'charger' }                  → importe les trois modules jugés, rend leurs exports ou l'erreur d'import ;
//   { cmd:'attendus', textes:[…] }     → MOTIFS_POUSSES, chargeFondateur(motif) et masquer(texte) de la RACINE JUGÉE ;
//   { cmd:'commandes' }                → COMMANDES de lib/agents/telegram.ts (contenu, gel) ;
//   { cmd:'executer', cas:{ route, methode, url, entetes, corps, config } } → status, texte, appels à la base, appels aux doublures.
import { register } from 'node:module'
import path from 'node:path'
import readline from 'node:readline'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { enregistrer } from './routes-crochet.mjs'
import { demarrer, erreurOps, erreurPg } from '../../lib/faux-postgrest.mjs'

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const RACINE = path.resolve(arg('racine') ?? process.cwd())
const DEPOT = path.resolve(arg('depot') ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..'))
const ICI = path.dirname(fileURLToPath(import.meta.url))

// ── Garde-fou réseau : rien hors de 127.0.0.1 ────────────────────────────────────────────────────────────────────────────
const fetchReel = globalThis.fetch
globalThis.fetch = (u, ...r) => {
  const h = new URL(typeof u === 'string' || u instanceof URL ? u : u.url).hostname
  if (h !== '127.0.0.1' && h !== 'localhost') return Promise.reject(new Error(`réseau interdit dans le juge du pont Telegram : ${h}`))
  return fetchReel(u, ...r)
}

// ── La fausse base ───────────────────────────────────────────────────────────────────────────────────────────────────────
let cfg = {}
const CONTRAT = {
  fonctions: {
    station_pause_par_agent: { params: [['p_agent', 'text'], ['p_motif', 'text']] },
    station_consigne_par_agent: { params: [['p_agent', 'text'], ['p_texte', 'text'], ['p_agent_cible', 'text']] },
    pilotage_evenements: { params: [['p_apres', 'bigint'], ['p_limite', 'integer'], ['p_agent', 'text'], ['p_types', 'text[]']] },
    pilotage_attention_sources: { params: [] },
    ops_etat: { params: [] },
    ops_interrupteur: { params: [['p_nom', 'text']] },
    ops_interrupteur_poser: { params: [['p_nom', 'text'], ['p_actif', 'boolean'], ['p_motif', 'text'], ['p_auteur', 'uuid']] },
    ops_agent_pause: { params: [['p_nom', 'text'], ['p_pause', 'boolean'], ['p_motif', 'text']] },
  },
}
/** L'erreur que config.erreurs[nom] demande : { ops:'quota' } (raise exception 'ops:quota') ou { pg:{ message, code, status } }. */
function erreurDe(nom) {
  const e = cfg.erreurs?.[nom]
  if (!e) return null
  return e.ops ? erreurOps(e.ops) : erreurPg(e.pg?.message ?? 'erreur d’essai', e.pg?.code ?? 'XX000', e.pg?.status ?? 500)
}
const avec = (nom, f) => (params) => erreurDe(nom) ?? { status: 200, body: f(params) }
const REPONSES = {
  station_pause_par_agent: avec('station_pause_par_agent', () => cfg.pauseDejaActive ? false : true),
  station_consigne_par_agent: avec('station_consigne_par_agent', () => 4242),
  pilotage_attention_sources: avec('pilotage_attention_sources', () => cfg.attention ?? []),
  ops_etat: avec('ops_etat', () => cfg.etat ?? { taches: {}, agents: [], decisions_ouvertes: [], interrupteurs: {}, couts_mois: {}, notifications_jour: 0 }),
  ops_interrupteur: avec('ops_interrupteur', () => false),
  ops_interrupteur_poser: avec('ops_interrupteur_poser', () => null),
  ops_agent_pause: avec('ops_agent_pause', () => null),
  pilotage_evenements: (p) => {
    const e = erreurDe('pilotage_evenements')
    if (e) return e
    let l = (cfg.evenements ?? []).filter((x) => x.type !== 'battement') // la vraie fonction n'en rend jamais
    if (p.p_agent != null) l = l.filter((x) => x.agent === p.p_agent)
    if (p.p_types != null) l = l.filter((x) => p.p_types.includes(x.type))
    const n = Math.max(1, Math.min(p.p_limite ?? 200, 200))
    l = [...l].sort((a, b) => a.id - b.id)
    l = p.p_apres != null ? l.filter((x) => x.id > p.p_apres).slice(0, n) : l.slice(-n)
    return { status: 200, body: l.map(({ id, le, agent, type, objet, resume }) => ({ id, le, agent, type, objet, resume })) }
  },
}

// Les filtres PostgREST d'une lecture de table : col=op.valeur, not.op, or=(…), and=(…) ; l'ordre, la limite, les colonnes.
function decouper(t, sep = ',') { // coupe aux virgules de premier niveau (ni entre parenthèses, ni entre guillemets)
  const out = []; let p = 0, q = false, cur = ''
  for (const c of t) {
    if (c === '"') q = !q
    if (!q && c === '(') p++
    if (!q && c === ')') p--
    if (!q && !p && c === sep) { out.push(cur); cur = '' } else cur += c
  }
  out.push(cur)
  return out
}
const liste = (t) => decouper(t.replace(/^\(|\)$/g, '')).map((x) => x.trim().replace(/^"|"$/g, ''))
function comparer(col, x, brut) {
  if (x === null || x === undefined) return null
  const date = /_le$|^date|^cree|^maj/.test(col) && Number.isFinite(Date.parse(String(x))) && Number.isFinite(Date.parse(brut))
  const nombre = typeof x === 'number' || (/^-?\d+(\.\d+)?$/.test(String(x)) && /^-?\d+(\.\d+)?$/.test(brut))
  const a = date ? Date.parse(String(x)) : nombre ? Number(x) : String(x), b = date ? Date.parse(brut) : nombre ? Number(brut) : brut
  return a < b ? -1 : a > b ? 1 : 0
}
function condition(l, col, op, brut) {
  let non = false
  if (op === 'not') { non = true; const i = brut.indexOf('.'); op = brut.slice(0, i); brut = brut.slice(i + 1) }
  const x = l[col]
  let ok
  if (op === 'is') ok = brut === 'null' ? x === null || x === undefined : brut === 'true' ? x === true : brut === 'false' ? x === false : false
  else if (op === 'in') ok = liste(brut).some((v) => String(x) === v)
  else if (op === 'eq') ok = comparer(col, x, brut) === 0
  else if (op === 'neq') ok = comparer(col, x, brut) !== 0
  else if (op === 'gt') ok = comparer(col, x, brut) === 1
  else if (op === 'gte') ok = [0, 1].includes(comparer(col, x, brut))
  else if (op === 'lt') ok = comparer(col, x, brut) === -1
  else if (op === 'lte') ok = [0, -1].includes(comparer(col, x, brut))
  else throw new Error(`opérateur « ${op} » non pris en charge par le faux PostgREST du juge`)
  return non ? !ok : ok
}
function groupe(l, texte, mode) { // texte : « (a.eq.1,b.gt.2,and(c.lt.3,d.is.null)) »
  const parts = decouper(texte.replace(/^\(|\)$/g, '')).map((x) => x.trim())
  const evals = parts.map((p) => {
    const m = /^(and|or)(\(.*\))$/.exec(p)
    if (m) return groupe(l, m[2], m[1])
    const i = p.indexOf('.'), j = p.indexOf('.', i + 1)
    return condition(l, p.slice(0, i), p.slice(i + 1, j), p.slice(j + 1))
  })
  return mode === 'and' ? evals.every(Boolean) : evals.some(Boolean)
}
function lireAlertes({ requete }) {
  if (cfg.erreurs?.alertes) return { status: 500, body: { code: 'XX000', message: 'alertes illisible (essai)', details: null, hint: null } }
  let lignes = [...(cfg.alertes ?? [])]
  for (const [cle, v] of Object.entries(requete)) {
    if (['select', 'order', 'limit', 'offset'].includes(cle)) continue
    if (cle === 'or' || cle === 'and') { lignes = lignes.filter((l) => groupe(l, v, cle)); continue }
    const i = v.indexOf('.')
    lignes = lignes.filter((l) => condition(l, cle, v.slice(0, i), v.slice(i + 1)))
  }
  if (requete.order) {
    const cles = requete.order.split(',').map((o) => { const [c, d] = o.split('.'); return [c, d !== 'desc'] })
    lignes.sort((a, b) => { for (const [c, asc] of cles) { const r = comparer(c, a[c], String(b[c])); if (r) return asc ? r : -r } return 0 })
  }
  if (requete.limit !== undefined) lignes = lignes.slice(0, Number(requete.limit))
  const cols = requete.select && requete.select.trim() !== '*' ? requete.select.split(',').map((x) => x.trim()).filter(Boolean) : null
  if (cols) {
    const connues = new Set((cfg.alertes ?? []).flatMap((l) => Object.keys(l)))
    const inconnue = cols.find((c) => !connues.has(c))
    if (inconnue) return { status: 400, body: { code: '42703', message: `column alertes.${inconnue} does not exist`, details: null, hint: null } }
    lignes = lignes.map((l) => Object.fromEntries(cols.map((c) => [c, l[c] ?? null])))
  }
  return { status: 200, body: lignes }
}

const faux = await demarrer({ contrat: CONTRAT, reponses: REPONSES, tables: { alertes: lireAlertes } })
process.env.NEXT_PUBLIC_SUPABASE_URL = faux.url
process.env.SUPABASE_SERVICE_ROLE_KEY = crypto.randomBytes(24).toString('hex')
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = crypto.randomBytes(24).toString('hex')
delete process.env.PAUSE_GENERALE

enregistrer(register, {
  racine: RACINE, depot: DEPOT, doublures: path.join(ICI, 'routes-doublures.mjs'),
  doubles: { 'lib/flags': 'flags', 'lib/agents/garde': 'garde', 'lib/agents/pause': 'pause' },
  paquets: { 'next/server': 'next' },
})
const D = await import(pathToFileURL(path.join(ICI, 'routes-doublures.mjs')).href + '?m=next')
const doub = D.etat
const importer = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)

const MODULES = {}
const FICHIERS = { telegram: 'lib/agents/telegram.ts', sortie: 'app/api/agents/telegram/sortie/route.ts', entree: 'app/api/agents/telegram/entree/route.ts' }
async function charger() {
  const r = {}
  for (const [k, rel] of Object.entries(FICHIERS)) {
    try { MODULES[k] = await importer(rel); r[k] = { ok: true, exports: Object.keys(MODULES[k]), runtime: MODULES[k].runtime, dynamic: MODULES[k].dynamic } }
    catch (e) { r[k] = { ok: false, erreur: String(e?.message ?? e).split('\n')[0].slice(0, 300) } }
  }
  return r
}
async function attendus({ textes = [] }) {
  const n = await importer('lib/pilotage/notifications.ts'), f = await importer('lib/pilotage/fil.ts')
  const motifs = [...n.MOTIFS_POUSSES]
  return {
    motifs,
    charges: Object.fromEntries(motifs.map((m) => [m, n.chargeFondateur(m)])),
    horsListe: Object.fromEntries(['pause_generale', 'decision_argent', 'Paiement', '', 'constructor'].map((m) => [m, n.chargeFondateur(m)])),
    masques: textes.map((t) => f.masquer(t)),
  }
}
function commandes() {
  const c = MODULES.telegram?.COMMANDES
  return { present: c !== undefined, tableau: Array.isArray(c), contenu: Array.isArray(c) ? [...c] : null, gele: c !== undefined && Object.isFrozen(c) }
}
const nettoyer = (a) => JSON.parse(JSON.stringify(a))
async function executer({ route, methode, url, entetes = {}, corps, config = {} }) {
  cfg = config
  doub.config = { drapeaux: config.drapeaux ?? {}, jetons: config.jetons ?? {}, pause: config.pause }
  doub.appels.length = 0
  const debut = faux.appels.length
  const m = MODULES[route]
  const fn = m?.[methode]
  if (typeof fn !== 'function') return { manque: `${route} n'exporte pas ${methode}` }
  const req = new D.NextRequest(url, { method: methode, headers: entetes, body: corps })
  let rep, exception = null
  try {
    rep = await Promise.race([fn(req, { params: Promise.resolve({}) }), new Promise((_ok, ko) => setTimeout(() => ko(new Error('délai de 20 s dépassé')), 20_000))])
  } catch (e) { exception = String(e?.message ?? e).slice(0, 300) }
  const sortie = { appelsBase: nettoyer(faux.appels.slice(debut)), appelsDoublures: nettoyer(doub.appels) }
  if (exception || !(rep instanceof Response)) return { ...sortie, exception: exception ?? 'la route ne rend pas une Response' }
  return { ...sortie, status: rep.status, texte: await rep.text(), entetes: Object.fromEntries(rep.headers) }
}

const rl = readline.createInterface({ input: process.stdin })
const dire = (id, x) => process.stdout.write(`@@${JSON.stringify({ id, ...x })}\n`)
rl.on('line', async (ligne) => {
  let m
  try { m = JSON.parse(ligne) } catch { return }
  try {
    const r = m.cmd === 'charger' ? await charger() : m.cmd === 'attendus' ? await attendus(m) : m.cmd === 'commandes' ? commandes() : m.cmd === 'executer' ? await executer(m.cas) : { erreur: `commande inconnue ${m.cmd}` }
    dire(m.id, { ok: true, r })
  } catch (e) { dire(m.id, { ok: false, erreur: String(e?.stack ?? e).slice(0, 600) }) }
})
rl.on('close', async () => { await faux.arreter(); process.exit(0) })
