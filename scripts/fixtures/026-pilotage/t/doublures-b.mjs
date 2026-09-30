// scripts/fixtures/026-pilotage/t/doublures-b.mjs — les doublures de station-reglages-qa et de poste-extraction-qa (fiche 026-171,
// partie B, écrites par Claude Code). Le crochet de s/commun.mjs redirige vers ce module (une instance par `?m=…`) les imports que
// font les routes jugées :
//   next/server, @/lib/flags, @/lib/direction/garde, @/lib/direction/journal, @/lib/supabaseAdmin, @/lib/limites,
//   @/lib/direction/stripe, @/lib/alertes.
// Il reprend celles de s/doublures-station.mjs (`export *`, jamais modifiées) et en redéfinit ce dont ces routes ont besoin de
// plus : un `supabaseAdmin` complet (filtres, `not`, `like`, compte, projection), un journal, un compteur de limites, Stripe et
// Anthropic. Toutes les instances partagent un seul état (globalThis, celui de s/) : la configuration du cas joué et la liste des
// appels consignés, dans l'ordre. Rien ne sort du processus : aucune base, aucun réseau.
//
// CE QUE CES DOUBLURES PROUVENT, ET CE QU'ELLES NE PROUVENT PAS. La garde de la route est ici une doublure : elle rend le
// refus que la configuration lui dit de rendre (sauf `estDirection`, qui refuse le rôle lecture comme le vrai, et
// `exigerDomaine`, qui applique la VRAIE matrice de lib/controle/droits.ts). On prouve donc que la route appelle les bonnes
// gardes, avec les bons domaines et les bons verbes, et qu'elle réagit correctement à leurs refus. Que le vrai garde rende 401 sans
// jeton et 403 à un artisan se prouve avec `--reel` (compte d'essai, PC), non testé dans le cloud.
import { etat as E } from '../s/doublures-station.mjs'
import { peutFaire as peutFaireReel } from '../../../../lib/controle/droits.ts'
export * from '../s/doublures-station.mjs'

const noter = (x) => { E.appels.push(x); return x }
const copie = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)))

// ── lib/direction/garde : refus de lecture seule comme le vrai, domaines par la vraie matrice ──────────────────────────────
const json = (corps, init = {}) => new Response(JSON.stringify(corps), { status: init.status ?? 200, headers: { 'content-type': 'application/json' } })
export async function estFondateur() { noter({ f: 'estFondateur' }); return E.config.refusGarde ?? E.config.fondateur }
export async function estDirection() {
  noter({ f: 'estDirection' })
  if (E.config.refusGarde) return E.config.refusGarde
  const f = E.config.fondateur
  if (f && f.role !== 'direction') return { error: 'Votre rôle est en lecture seule.', status: 403, code: 'lecture_seule' }
  return f
}
export function exigerDomaine(f, domaine, verbe) {
  noter({ f: 'exigerDomaine', domaine, verbe })
  if (E.config.refusDomaine) return E.config.refusDomaine
  const v = peutFaireReel(f?.roleInterne ?? 'fondateur', domaine, verbe)
  return v.permis ? { borne: v.borne } : { error: v.raison, status: 403, code: 'hors_perimetre' }
}
export const domaineRefuse = (r) => !!r && 'error' in r
export const estRefus = (r) => !!r && 'error' in r
export const reponseRefus = (r) => json({ error: r.error, code: r.code }, { status: r.status })

// ── lib/direction/journal ─────────────────────────────────────────────────────────────────────────────────────────────────
// config.journal : true (défaut), false (le journal refuse), ou une fonction (n, entrée) → booléen.
export async function journaliser(entree) {
  const n = E.appels.filter((a) => a.f === 'journaliser').length + 1
  noter({ f: 'journaliser', n, action: entree?.action, cible_type: entree?.cible_type ?? null, cible_id: entree?.cible_id ?? null, avant: copie(entree?.avant), apres: copie(entree?.apres), acteur: entree?.acteur?.uid ?? null })
  const c = E.config.journal
  return typeof c === 'function' ? !!c(n, entree) : c !== false
}
export const refusJournal = () => json({ error: 'Action refusée : le journal de direction est indisponible.', code: 'journal_indisponible' }, { status: 503 })
export const epurer = (v) => v

// ── lib/limites : un compteur en mémoire (config.compteurs : les valeurs de départ) ──────────────────────────────────────
export async function consommerLimite(cle, max, fenetreSec) {
  const c = (E.compteurs ??= { ...(E.config.compteurs ?? {}) })
  c[cle] = (c[cle] ?? 0) + 1
  noter({ f: 'consommerLimite', cle, max, fenetreSec, n: c[cle] })
  return c[cle] <= max
}
export async function limiteAtteinte(cle, max, fenetreSec) { noter({ f: 'limiteAtteinte', cle, max, fenetreSec }); return E.config.saturee ?? false }
export const cleEmail = (p, e) => `${p}:${String(e).length}`

// ── lib/supabaseAdmin : une base en mémoire, requêtes lues ET consignées ─────────────────────────────────────────────────
const interdit = (quoi, table) => (...args) => { noter({ f: quoi, table, args: copie(args) }); throw new Error(`doublure : ${quoi} interdit ici (${table ?? ''})`) }
const valeurDe = (l, k) => (l && typeof l === 'object' ? l[k] : undefined)
const motif = (m) => new RegExp(`^${String(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')
function filtrer(lignes, filtres) {
  return lignes.filter((l) => filtres.every(([op, k, v, w]) => {
    const x = valeurDe(l, k)
    if (op === 'eq') return x === v
    if (op === 'neq') return x !== v
    if (op === 'is') return v === null ? x === null || x === undefined : x === v
    if (op === 'in') return Array.isArray(v) && v.includes(x)
    if (op === 'not') {
      if (v === 'like') return !motif(w).test(String(x ?? ''))
      if (v === 'is') return w === null ? !(x === null || x === undefined) : x !== w
      if (v === 'eq') return x !== w
      return true
    }
    if (op === 'like') return motif(v).test(String(x ?? ''))
    const a = typeof x === 'string' && typeof v === 'string' ? x.localeCompare(v) : Number(x) - Number(v)
    if (op === 'gte') return a >= 0
    if (op === 'gt') return a > 0
    if (op === 'lte') return a <= 0
    if (op === 'lt') return a < 0
    return true
  }))
}
function requete(table) {
  const q = { table, colonnes: undefined, options: null, filtres: [], ordre: null, limite: null, unique: false }
  noter({ f: 'from', table, q })
  const b = {
    select(c, o) { q.colonnes = c ?? '*'; q.options = o ?? null; return b },
    eq(k, v) { q.filtres.push(['eq', k, v]); return b }, neq(k, v) { q.filtres.push(['neq', k, v]); return b },
    is(k, v) { q.filtres.push(['is', k, v]); return b }, in(k, v) { q.filtres.push(['in', k, v]); return b },
    gte(k, v) { q.filtres.push(['gte', k, v]); return b }, gt(k, v) { q.filtres.push(['gt', k, v]); return b },
    lte(k, v) { q.filtres.push(['lte', k, v]); return b }, lt(k, v) { q.filtres.push(['lt', k, v]); return b },
    like(k, v) { q.filtres.push(['like', k, v]); return b }, not(k, op, v) { q.filtres.push(['not', k, op, v]); return b },
    order(k, o) { q.ordre = [k, o?.ascending !== false]; return b }, limit(n) { q.limite = n; return b }, range(a, z) { q.limite = z - a + 1; return b },
    maybeSingle() { q.unique = true; return b }, single() { q.unique = true; return b },
    insert: interdit('insert', table), update: interdit('update', table), delete: interdit('delete', table), upsert: interdit('upsert', table),
    then(ok, ko) { return Promise.resolve().then(() => repondre(q)).then(ok, ko) },
  }
  return b
}
function repondre(q) {
  const r = E.config.table?.(q.table, q)
  if (r instanceof Error) return { data: null, error: { message: r.message }, count: null }
  let lignes = filtrer(copie(r ?? []), q.filtres)
  if (q.ordre) { const [k, asc] = q.ordre; lignes.sort((a, b) => String(valeurDe(a, k) ?? '').localeCompare(String(valeurDe(b, k) ?? '')) * (asc ? 1 : -1)) }
  const total = lignes.length
  if (q.limite !== null) lignes = lignes.slice(0, q.limite)
  const compte = q.options?.count ? total : null
  if (q.options?.head) return { data: null, error: null, count: compte }
  const cols = typeof q.colonnes === 'string' && q.colonnes.trim() !== '*' ? q.colonnes.split(',').map((x) => x.trim()).filter(Boolean) : null
  if (cols) lignes = lignes.map((l) => Object.fromEntries(cols.map((c) => [c, l[c] ?? null])))
  return { data: q.unique ? lignes[0] ?? null : lignes, error: null, count: compte }
}
export const supabaseAdmin = {
  async rpc(nom, args) {
    noter({ f: 'rpc', nom, args: copie(args ?? {}) })
    const r = E.config.rpc?.(nom, args ?? {})
    if (r instanceof Error) return { data: null, error: { message: r.message } }
    return r === undefined ? { data: null, error: { message: `doublure : ${nom} sans réponse` } } : { data: copie(r), error: null }
  },
  from: (table) => requete(table),
  schema: interdit('schema'),
}

// ── lib/direction/stripe, lib/alertes : ce que le compte simulé « voit » de Stripe et d'Anthropic ────────────────────────
const sourcee = (source, valeur) => ({ valeur: copie(valeur), source, a: new Date().toISOString(), cache: false })
const lireStripe = (nom, defaut) => { const v = E.config.stripe?.[nom]; return v instanceof Error ? { valeur: null, source: 'stripe', a: new Date().toISOString(), cache: false, erreur: v.message } : sourcee('stripe', v === undefined ? defaut : v) }
export const mrr = async () => { noter({ f: 'mrr' }); return lireStripe('mrr', { mrr: 490, abonnements: 3, parPlan: {}, enPause: 0, abonnementsEnPause: 0 }) }
export const encaisseDuMois = async () => { noter({ f: 'encaisseDuMois' }); return lireStripe('encaisse', { brut: 1200, frais: 30, net: 1170, paiements: 4, rembourse: 0 }) }
export const joignable = async () => { noter({ f: 'joignable' }); return lireStripe('joignable', { disponible: 12.5, livemode: false }) }
export const coutIADuMois = async () => { noter({ f: 'coutIADuMois' }); const v = E.config.coutIA; if (v instanceof Error) throw v; return copie(v ?? null) }
export const estimationDepuisLesCredits = async () => { noter({ f: 'estimationDepuisLesCredits' }); return copie(E.config.estimationCredits ?? null) }
export const CRONS_ATTENDUS = [{ nom: 'relances', maxHeures: 26 }, { nom: 'canaux-relever', maxHeures: 26 }, { nom: 'tic', maxHeures: 1 }]
