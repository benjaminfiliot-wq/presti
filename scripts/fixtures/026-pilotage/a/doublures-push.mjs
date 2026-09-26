// scripts/fixtures/026-pilotage/a/doublures-push.mjs — les doublures de pilotage-push-qa (fiche 026-012, lot a), écrites par
// Claude Code. Le crochet de résolution du juge sert CE fichier, avec une requête différente, à la place de :
//   ?m=email          lib/email          (sendEmail, notifierEntreprise, EMAIL_ENTREPRISE)
//   ?m=limites        lib/limites        (consommerLimite, limiteAtteinte, cleEmail), en mémoire
//   ?m=supabaseAdmin  lib/supabaseAdmin  (supabaseAdmin : un faux client, tables en mémoire, filtres appliqués)
//   ?m=pushNatif      lib/pushNatif      (firebasePret faux, envoyerPushNatif consigné)
//   ?m=web-push       le paquet web-push (setVapidDetails, sendNotification consigné : c'est l'envoi du push)
// Chaque instance exporte l'union des noms : un import nommé ne manque jamais à l'édition des liens. L'état est partagé par
// globalThis.__doublesPilotagePush (même fil d'exécution que le juge enfant), que le juge remet à zéro entre deux scénarios.
// Aucun réseau, aucun fichier écrit, aucune variable d'environnement lue.
const E = (globalThis.__doublesPilotagePush ??= {
  charges: new Set(), emails: [], limites: new Map(), appelsLimites: [], push: [], natifs: [], vapid: 0, inconnues: [],
  tables: { artisans: [], push_abonnements: [], alertes: [], app_errors: [] }, ecritures: [], modeEmail: 'ok', modePush: 'ok',
  tablesEnPanne: new Set(),
})
E.charges.add(new URL(import.meta.url).searchParams.get('m') ?? '?')
export const etat = E

/** Remise à zéro entre deux scénarios (les tables sont fournies par le juge). */
export function reinitialiser(tables = {}) {
  E.emails.length = 0; E.limites.clear(); E.appelsLimites.length = 0; E.push.length = 0; E.natifs.length = 0; E.inconnues.length = 0
  E.ecritures.length = 0; E.modeEmail = 'ok'; E.modePush = 'ok'; E.tablesEnPanne = new Set()
  E.tables = { artisans: [], push_abonnements: [], alertes: [], app_errors: [], ...structuredClone(tables) }
}

// ── lib/email ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const EMAIL_ENTREPRISE = 'alertes.temoin@exemple.invalid'
function reponseEmail() {
  if (E.modeEmail === 'leve') throw new Error('e-mail en panne (doublure de pilotage-push-qa)')
  if (E.modeEmail === 'refuse') return { ok: false, error: 'envoi refusé (doublure de pilotage-push-qa)' }
  return { ok: true, id: 'temoin' }
}
export async function sendEmail(o = {}) { E.emails.push({ genre: 'artisan', a: o.to, sujet: o.subject, texte: o.text }); return reponseEmail() }
export async function notifierEntreprise(sujet, corps) { E.emails.push({ genre: 'entreprise', sujet, corps }); return reponseEmail() }

// ── lib/limites ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function consommerLimite(cle, max) {
  E.appelsLimites.push(cle)
  const n = E.limites.get(cle) ?? 0
  if (n >= max) return false
  E.limites.set(cle, n + 1)
  return true
}
export async function limiteAtteinte(cle, max) { return (E.limites.get(cle) ?? 0) >= max }
export function cleEmail(prefixe, email) { return `${prefixe}:${String(email).toLowerCase()}` }

// ── lib/supabaseAdmin ────────────────────────────────────────────────────────────────────────────────────────────────────
const egal = (a, b) => a === b || (a != null && b != null && String(a) === String(b))
const OPERATEURS = {
  eq: (v, x) => egal(v, x), neq: (v, x) => !egal(v, x), is: (v, x) => (x === null ? v == null : v === x),
  in: (v, x) => (Array.isArray(x) ? x : String(x).replace(/^\(|\)$/g, '').split(',')).some((y) => egal(v, y)),
  gt: (v, x) => v > x, gte: (v, x) => v >= x, lt: (v, x) => v < x, lte: (v, x) => v <= x,
}
function requete(table) {
  const q = { table, genre: 'select', filtres: [], valeurs: null, tete: false, un: null }
  const executer = () => {
    const lignes = E.tables[table] ?? []
    const garde = (l) => q.filtres.every((f) => f(l))
    if (q.genre === 'insert' || q.genre === 'upsert') {
      const nouvelles = (Array.isArray(q.valeurs) ? q.valeurs : [q.valeurs]).map((x) => ({ ...x }))
      E.ecritures.push({ table, genre: q.genre, valeurs: nouvelles })
      ;(E.tables[table] ??= []).push(...nouvelles)
      return { data: q.un ? nouvelles[0] ?? null : nouvelles, error: null, count: null }
    }
    if (q.genre === 'update') {
      const touchees = lignes.filter(garde)
      for (const l of touchees) Object.assign(l, q.valeurs)
      E.ecritures.push({ table, genre: 'update', valeurs: q.valeurs, lignes: touchees.length })
      return { data: touchees, error: null, count: null }
    }
    if (q.genre === 'delete') {
      const restent = lignes.filter((l) => !garde(l))
      E.ecritures.push({ table, genre: 'delete', lignes: lignes.length - restent.length })
      E.tables[table] = restent
      return { data: [], error: null, count: null }
    }
    const trouvees = lignes.filter(garde).map((l) => ({ ...l }))
    if (q.tete) return { data: null, error: null, count: trouvees.length }
    if (q.un === 'single') return trouvees.length === 1 ? { data: trouvees[0], error: null } : { data: null, error: { message: `${trouvees.length} ligne(s) pour single()` } }
    if (q.un === 'maybe') return { data: trouvees[0] ?? null, error: null }
    return { data: trouvees, error: null, count: trouvees.length }
  }
  const b = {
    select(_c, o = {}) { if (o.head) q.tete = true; return b },
    insert(v) { q.genre = 'insert'; q.valeurs = v; return b },
    upsert(v) { q.genre = 'upsert'; q.valeurs = v; return b },
    update(v) { q.genre = 'update'; q.valeurs = v; return b },
    delete() { q.genre = 'delete'; return b },
    match(o) { for (const [k, v] of Object.entries(o ?? {})) q.filtres.push((l) => egal(l[k], v)); return b },
    filter(k, op, v) { const f = OPERATEURS[op]; if (f) q.filtres.push((l) => f(l[k], v)); else E.inconnues.push(`filter(${op})`); return b },
    not(k, op, v) { const f = OPERATEURS[op]; if (f) q.filtres.push((l) => !f(l[k], v)); else E.inconnues.push(`not(${op})`); return b },
    or(expr) { E.inconnues.push(`or(${expr})`); return b },
    single() { q.un = 'single'; return b }, maybeSingle() { q.un = 'maybe'; return b },
    order() { return b }, limit() { return b }, range() { return b }, returns() { return b }, throwOnError() { return b }, abortSignal() { return b },
    then(ok, ko) { return Promise.resolve().then(executer).then(ok, ko) },
  }
  for (const [nom, f] of Object.entries(OPERATEURS)) b[nom] = (k, v) => { q.filtres.push((l) => f(l[k], v)); return b }
  return new Proxy(b, { get: (cible, cle) => (cle in cible ? cible[cle] : typeof cle === 'string' ? (E.inconnues.push(`${table}.${cle}()`), () => cible) : undefined) })
}
export const supabaseAdmin = {
  /** Une table « en panne » (E.tablesEnPanne) fait lever from() : la panne la plus brutale qu'un appelant puisse subir. */
  from: (table) => { if (E.tablesEnPanne.has(table)) throw new Error(`table ${table} en panne (doublure de pilotage-push-qa)`); return requete(table) },
  rpc: async (nom) => { E.inconnues.push(`rpc(${nom})`); return { data: null, error: { message: 'rpc absente de la doublure' } } },
}

// ── lib/pushNatif ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const firebasePret = () => false
export async function envoyerPushNatif(jeton, plateforme, c) { E.natifs.push({ jeton, plateforme, c }); return { ok: true } }

// ── web-push (export par défaut : `import webpush from 'web-push'`) ─────────────────────────────────────────────────────
const webpush = {
  setVapidDetails() { E.vapid++ },
  async sendNotification(abonnement, corps, options) {
    E.push.push({ endpoint: abonnement?.endpoint ?? null, corps: typeof corps === 'string' ? corps : String(corps), options: options ?? null })
    if (E.modePush === 'leve') { const e = new Error('service de push en panne (doublure)'); e.statusCode = 503; throw e }
    return { statusCode: 201, body: '', headers: {} }
  },
  generateVAPIDKeys() { return { publicKey: 'temoin', privateKey: 'temoin' } },
}
export default webpush
