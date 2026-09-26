// scripts/fixtures/026-livraison-tresor/a/doublures.mjs — les doublures des juges du lot A (fiche 026-018), écrites par
// Claude Code. Le crochet de résolution des juges (CROCHET de ../commun.mjs) sert CE fichier, avec une requête
// différente, à la place de :
//   ?m=supabaseAdmin  lib/supabaseAdmin   un faux client : tables en mémoire, filtres appliqués (y compris sur un
//                                         chemin JSON « col->cle » / « col->>cle »), écritures consignées ; rpc, or()
//                                         et les options inconnues sont refusés et consignés (E.inconnues)
//   ?m=email          lib/email           sendEmail et notifierEntreprise consignés (E.emails) ; E.modeEmail : ok | refuse | leve
//   ?m=limites        lib/limites         en mémoire
//   ?m=stripe         lib/stripe          un client figé : toute lecture (list, retrieve) rend le jeu de E.stripe et
//                                         consigne ses paramètres ; toute écriture (create, update, del, cancel, pay…)
//                                         est consignée dans E.stripe.ecritures et lève ; E.stripe.panne : tout lève
//   ?m=vercelDomains  lib/vercelDomains   getStatus rend E.dns[domaine] ; normalizeDomain recopié du dépôt
//   ?m=flags          lib/flags           actif(f) : E.drapeaux[f] (vrai par défaut)
//   ?m=garde          lib/direction/garde un fondateur « direction » par défaut ; E.garde : fondateur | refus401 | lecture
//   ?m=alertes        lib/alertes         envoyerAlertes, enregistrerPassage, enregistrerErreur consignés ;
//                                         coutIADuMois rend E.coutIA (null par défaut : « non mesuré »)
//   ?m=veille         lib/direction/veilleTresorerie  veilleTresorerie lève (TA-5) ; alertesTresorerie rend []
//   ?m=supabaseClient lib/supabaseClient  le client du navigateur : aucune session, from() consigné
// Chaque instance exporte l'union des noms : un import nommé ne manque jamais à l'édition des liens. L'état est partagé
// par globalThis.__doublesLt026 (même fil d'exécution que le juge enfant), que le juge remet à zéro entre deux scénarios.
// Aucun réseau, aucun fichier écrit, aucune variable d'environnement lue.
const E = (globalThis.__doublesLt026 ??= {
  charges: new Set(), tables: {}, ecritures: [], inconnues: [], emails: [], modeEmail: 'ok', limites: new Map(),
  stripe: { transactions: [], factures: [], abonnements: [], appels: [], ecritures: [], panne: false, panneSur: null }, dns: {},
  drapeaux: {}, garde: 'fondateur', gardeAppels: [], alertes: [], passages: [], erreurs: [], coutIA: null, veilleAppels: 0,
})
E.charges.add(new URL(import.meta.url).searchParams.get('m') ?? '?')
export const etat = E

/** Remise à zéro entre deux scénarios. */
export function reinitialiser(conf = {}) {
  E.tables = structuredClone(conf.tables ?? {})
  E.ecritures.length = 0; E.inconnues.length = 0; E.emails.length = 0; E.modeEmail = conf.modeEmail ?? 'ok'; E.limites.clear()
  E.stripe = { transactions: structuredClone(conf.stripe?.transactions ?? []), factures: structuredClone(conf.stripe?.factures ?? []), abonnements: structuredClone(conf.stripe?.abonnements ?? []), appels: [], ecritures: [], panne: !!conf.stripe?.panne, panneSur: conf.stripe?.panneSur ?? null }
  E.dns = structuredClone(conf.dns ?? {}); E.drapeaux = { ...(conf.drapeaux ?? {}) }; E.garde = conf.garde ?? 'fondateur'; E.gardeAppels.length = 0
  E.alertes.length = 0; E.passages.length = 0; E.erreurs.length = 0; E.coutIA = conf.coutIA ?? null; E.veilleAppels = 0
}

// ── lib/supabaseAdmin ────────────────────────────────────────────────────────────────────────────────────────────────────
const lireChemin = (ligne, col) => {
  const m = /^([\w]+)(?:->>?|->)(.+)$/.exec(col)
  if (!m) return ligne[col]
  let v = ligne[m[1]]
  for (const p of m[2].split(/->>?/)) v = v == null ? undefined : v[p.replace(/^'|'$/g, '')]
  return v === undefined ? null : v
}
const egal = (a, b) => a === b || (a != null && b != null && String(a) === String(b))
const cmp = (a, b) => (a == null || b == null ? NaN : (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0))
const liste = (x) => (Array.isArray(x) ? x : String(x).replace(/^\(|\)$/g, '').split(',').map((y) => y.trim().replace(/^"|"$/g, '')))
const OPERATEURS = {
  eq: (v, x) => egal(v, x), neq: (v, x) => !egal(v, x),
  is: (v, x) => (x === null || x === 'null' ? v == null : x === true || x === 'true' ? v === true : x === false || x === 'false' ? v === false : v === x),
  in: (v, x) => liste(x).some((y) => egal(v, y)),
  gt: (v, x) => cmp(v, x) > 0, gte: (v, x) => cmp(v, x) >= 0, lt: (v, x) => cmp(v, x) < 0, lte: (v, x) => cmp(v, x) <= 0,
  like: (v, x) => v != null && new RegExp(`^${String(x).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`).test(String(v)),
  ilike: (v, x) => v != null && new RegExp(`^${String(x).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i').test(String(v)),
}
function requete(table) {
  const q = { table, genre: 'select', filtres: [], valeurs: null, options: {}, ordre: [], limite: null, un: null, compte: null, tete: false, erreur: null }
  const filtre = (col, op, val) => {
    const neg = op.startsWith('not.')
    const o = neg ? op.slice(4) : op
    if (!OPERATEURS[o]) { q.erreur = `filtre ${op} non pris en charge par la doublure`; E.inconnues.push(`${table}: ${q.erreur}`); return b }
    q.filtres.push((l) => { const r = OPERATEURS[o](lireChemin(l, col), val); return neg ? !r : r })
    return b
  }
  const b = {
    select(_c = '*', o = {}) { if (q.genre === 'select') { q.compte = o.count ?? null; q.tete = !!o.head } return b },
    insert(v, o = {}) { q.genre = 'insert'; q.valeurs = v; q.options = o; return b },
    upsert(v, o = {}) { q.genre = 'upsert'; q.valeurs = v; q.options = o; return b },
    update(v, o = {}) { q.genre = 'update'; q.valeurs = v; q.options = o; return b },
    delete(o = {}) { q.genre = 'delete'; q.options = o; return b },
    eq: (c, v) => filtre(c, 'eq', v), neq: (c, v) => filtre(c, 'neq', v), is: (c, v) => filtre(c, 'is', v), in: (c, v) => filtre(c, 'in', v),
    gt: (c, v) => filtre(c, 'gt', v), gte: (c, v) => filtre(c, 'gte', v), lt: (c, v) => filtre(c, 'lt', v), lte: (c, v) => filtre(c, 'lte', v),
    like: (c, v) => filtre(c, 'like', v), ilike: (c, v) => filtre(c, 'ilike', v),
    not: (c, op, v) => filtre(c, `not.${op}`, v), filter: (c, op, v) => filtre(c, op, v),
    match(o) { for (const [c, v] of Object.entries(o)) filtre(c, 'eq', v); return b },
    or(expr) { q.erreur = `or(${String(expr).slice(0, 60)}) non pris en charge par la doublure`; E.inconnues.push(`${table}: ${q.erreur}`); return b },
    contains(c) { q.erreur = `contains(${c}) non pris en charge par la doublure`; E.inconnues.push(`${table}: ${q.erreur}`); return b },
    order(c, o = {}) { q.ordre.push([c, o.ascending !== false]); return b },
    limit(n) { q.limite = n; return b },
    range(a, z) { q.debut = a; q.limite = z - a + 1; return b },
    single() { q.un = 'single'; return b }, maybeSingle() { q.un = 'maybe'; return b },
    abortSignal() { return b }, returns() { return b }, throwOnError() { q.lever = true; return b },
    then(ok, ko) { return executer().then(ok, ko) },
  }
  async function executer() {
    await null // une autre promesse peut passer entre la construction et l'exécution (passages concurrents, TL-4)
    const reponse = (r) => { if (q.lever && r.error) throw new Error(r.error.message); return r }
    if (q.erreur) return reponse({ data: null, error: { message: q.erreur, code: 'DOUBLURE' }, count: null })
    const lignes = (E.tables[table] ??= [])
    const garde = (l) => q.filtres.every((f) => f(l))
    let res = []
    if (q.genre === 'insert' || q.genre === 'upsert') {
      const nouvelles = (Array.isArray(q.valeurs) ? q.valeurs : [q.valeurs]).map((x) => structuredClone(x))
      for (const n of nouvelles) {
        const conflit = String(q.options.onConflict ?? 'id').split(',').map((x) => x.trim())
        const exist = q.genre === 'upsert' ? lignes.find((l) => conflit.every((c) => n[c] !== undefined && egal(l[c], n[c]))) : null
        if (exist) { Object.assign(exist, n); res.push(exist) } else { lignes.push(n); res.push(n) }
      }
    } else if (q.genre === 'update') {
      for (const l of lignes.filter(garde)) { Object.assign(l, structuredClone(q.valeurs)); res.push(l) }
    } else if (q.genre === 'delete') {
      res = lignes.filter(garde); E.tables[table] = lignes.filter((l) => !garde(l))
    } else res = lignes.filter(garde)
    if (q.genre !== 'select') E.ecritures.push({ table, genre: q.genre, valeurs: structuredClone(q.valeurs), lignes: res.length })
    for (const [c, asc] of [...q.ordre].reverse()) res = [...res].sort((x, y) => (asc ? 1 : -1) * (cmp(lireChemin(x, c), lireChemin(y, c)) || 0))
    if (q.debut) res = res.slice(q.debut)
    if (q.limite != null) res = res.slice(0, q.limite)
    const copie = structuredClone(res)
    if (q.un === 'single') return reponse(copie.length === 1 ? { data: copie[0], error: null } : { data: null, error: { message: `${copie.length} ligne(s) pour single()`, code: 'PGRST116' } })
    if (q.un === 'maybe') return reponse(copie.length <= 1 ? { data: copie[0] ?? null, error: null } : { data: null, error: { message: `${copie.length} lignes pour maybeSingle()`, code: 'PGRST116' } })
    return reponse({ data: q.tete ? null : copie, error: null, count: q.compte ? copie.length : null })
  }
  return b
}
export const supabaseAdmin = {
  from: (t) => requete(t),
  rpc: async (nom) => { E.inconnues.push(`rpc(${nom}) non pris en charge par la doublure`); return { data: null, error: { message: `rpc ${nom} non pris en charge par la doublure`, code: 'DOUBLURE' } } },
  schema: () => supabaseAdmin,
  storage: { from: () => new Proxy({}, { get: () => async () => { E.inconnues.push('storage non pris en charge par la doublure'); return { data: null, error: { message: 'storage non pris en charge par la doublure' } } } }) },
  auth: { admin: new Proxy({}, { get: () => async () => { E.inconnues.push('auth.admin non pris en charge par la doublure'); return { data: null, error: { message: 'auth.admin non pris en charge' } } } }) },
}

// ── lib/supabaseClient (le client du navigateur : aucune session, aucune requête) ──────────────────────────────────────
export const supabase = {
  auth: { getSession: async () => ({ data: { session: null }, error: null }), getUser: async () => ({ data: { user: null }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  from: (t) => { E.inconnues.push(`supabaseClient.from(${t}) appelé depuis un composant`); return requete(t) },
}

// ── lib/email ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const EMAIL_ENTREPRISE = 'alertes.temoin@exemple.invalid'
const reponseEmail = () => {
  if (E.modeEmail === 'leve') throw new Error('e-mail en panne (doublure du lot A)')
  if (E.modeEmail === 'refuse') return { ok: false, error: 'envoi refusé (doublure du lot A)' }
  return { ok: true, id: `temoin-${E.emails.length}` }
}
export async function sendEmail(o = {}) { E.emails.push({ genre: 'sendEmail', ...structuredClone(o) }); return reponseEmail() }
export async function notifierEntreprise(sujet, corps, repondreA) { E.emails.push({ genre: 'entreprise', sujet, corps, repondreA }); return reponseEmail() }

// ── lib/limites ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function consommerLimite(cle, max) { const n = E.limites.get(cle) ?? 0; if (n >= max) return false; E.limites.set(cle, n + 1); return true }
export async function limiteAtteinte(cle, max) { return (E.limites.get(cle) ?? 0) >= max }
export function cleEmail(prefixe, email) { return `${prefixe}:${String(email).toLowerCase()}` }

// ── lib/stripe ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const LECTURES = new Set(['list', 'retrieve', 'search', 'listLineItems', 'retrieveUpcoming'])
const JEUX = { balanceTransactions: 'transactions', invoices: 'factures', subscriptions: 'abonnements' }
export const stripe = new Proxy({}, {
  get: (_c, ressource) => (typeof ressource !== 'string' || ressource === 'then' ? undefined : new Proxy({}, {
    get: (_r, methode) => (typeof methode !== 'string' || methode === 'then' ? undefined : async (...args) => {
      const appel = { ressource, methode, params: structuredClone(args[0] ?? null), options: structuredClone(args[1] ?? null) }
      if (!LECTURES.has(methode)) { E.stripe.ecritures.push(appel); throw new Error(`écriture Stripe ${ressource}.${methode} refusée par la doublure`) }
      E.stripe.appels.push(appel)
      if (E.stripe.panne || E.stripe.panneSur?.(appel)) throw new Error(`Stripe injoignable (doublure du lot A) : ${ressource}.${methode}`)
      if (ressource === 'balance') return { available: [{ currency: 'eur', amount: 0 }], pending: [], livemode: false }
      const jeu = JEUX[ressource] ? E.stripe[JEUX[ressource]] : []
      return methode === 'retrieve' ? structuredClone(jeu[0] ?? null) : { object: 'list', data: structuredClone(jeu), has_more: false }
    }),
  })),
})
export function concerneAbonnementCourant(enBase, evenement) { return !enBase || enBase === evenement }

// ── lib/vercelDomains ────────────────────────────────────────────────────────────────────────────────────────────────────
export function normalizeDomain(input) {
  const d = (input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '')
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)) return null
  if (d === 'prestiapp.fr' || d.endsWith('.prestiapp.fr') || d.endsWith('.vercel.app')) return null
  return d
}
export async function getStatus(domaine) {
  const r = E.dns[domaine]
  return r ? { ok: true, verified: false, served: false, records: structuredClone(r) } : { ok: false, verified: false, served: false, records: [], error: 'Domaine non rattaché (doublure).' }
}
export async function addDomain(domaine) { E.inconnues.push(`addDomain(${domaine}) appelé`); return getStatus(domaine) }
export async function removeDomain(domaine) { E.inconnues.push(`removeDomain(${domaine}) appelé`); return { ok: true } }

// ── lib/flags ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FLAGS = new Proxy({}, { get: (_f, k) => (typeof k === 'string' ? E.drapeaux[k] ?? true : undefined) })
export const actif = (f) => E.drapeaux[f] ?? true

// ── lib/direction/garde ──────────────────────────────────────────────────────────────────────────────────────────────────
const FONDATEUR = { uid: '90000000-0000-4000-8000-00000000f018', email: 'fondateur.temoin@exemple.invalid', role: 'direction', roleInterne: 'direction', domaines: null }
export async function estFondateur(req) {
  E.gardeAppels.push('estFondateur')
  if (E.garde === 'refus401') return { error: 'Non connecté (doublure).', status: 401 }
  return { ...FONDATEUR, role: E.garde === 'lecture' ? 'lecture' : 'direction' }
}
export const estDirection = estFondateur
export function exigerDomaine(f, domaine, verbe) { E.gardeAppels.push(`exigerDomaine:${domaine}:${verbe}`); return { borne: false } }
export const domaineRefuse = (r) => !!r && 'error' in r
export const estRefus = (r) => !!r && 'error' in r
export const reponseRefus = (r) => Response.json({ error: r.error, code: r.code }, { status: r.status })

// ── lib/alertes ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MOTIFS = ['solde_ia', 'credits_artisan', 'paiement', 'erreurs', 'cron_muet', 'domaine_mail', 'securite', 'digest']
export const CRONS_ATTENDUS = [{ nom: 'relances', maxHeures: 26 }, { nom: 'canaux-relever', maxHeures: 26 }, { nom: 'alertes', maxHeures: 26 }, { nom: 'purges-rgpd', maxHeures: 26 }, { nom: 'livraison', maxHeures: 26 }]
export async function coutIADuMois() { return structuredClone(E.coutIA) }
export async function estimationDepuisLesCredits() { return { credits: 0, euros: 0 } }
export async function enregistrerErreur(contexte, erreur) { E.erreurs.push({ contexte, message: erreur instanceof Error ? erreur.message : String(erreur ?? '') }) }
export async function enregistrerPassage(nom, detail = {}, reussi = true) { E.passages.push({ nom, detail: structuredClone(detail), reussi }) }
export function alertePaiement() { return [] }
export async function envoyerAlertes(alertes) { for (const a of alertes ?? []) E.alertes.push(structuredClone(a)); return (alertes ?? []).length }
export async function ronde() { return { candidates: [], envoyees: [], ignorees: [] } }

// ── lib/direction/veilleTresorerie (TA-5 : la veille lève, la tournée continue) ─────────────────────────────────────────
export async function veilleTresorerie() { E.veilleAppels++; throw new Error('veille de trésorerie en panne (doublure de TA-5)') }
export function alertesTresorerie() { return [] }
