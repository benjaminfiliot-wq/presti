// scripts/fixtures/026-pilotage/s/doublures-station.mjs — les doublures de station-route-qa (fiche 026-067), écrites par
// Claude Code. Le crochet du juge (CROCHET de s/commun.mjs) redirige vers ce module (une instance par `?m=…`) les imports
// que font la route de la station, les routes de la réunion et les lecteurs de salle :
//   next/server, @/lib/flags, @/lib/direction/garde, @/lib/controle/droits, @/lib/agents/garde, @/lib/agents/pause,
//   @/lib/supabaseAdmin, @/lib/direction/tresorerie, @/lib/direction/stripe, @/lib/controle/lectures/**.
// Toutes les instances partagent un seul état (globalThis) : la configuration du cas joué et la liste des appels consignés,
// dans l'ordre. Rien ne sort du processus : aucune base, aucun réseau. Les réussites ne se prouvent qu'ici.
//
// La base d'essai (config.rpc, config.table) rend des lignes ; le constructeur de requêtes applique lui-même les filtres
// (eq, neq, is, in, gte, gt, lte, lt), l'ordre, la limite et la projection sur les colonnes choisies : une route ne lit que
// les colonnes qu'elle nomme, et une liste de colonnes absente (select() ou '*') est consignée comme telle.
const E = (globalThis.__stationDoublures ??= { appels: [], config: {} })
export const etat = E
const noter = (x) => { E.appels.push(x); return x }
const copie = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)))

// ── next/server ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export class NextResponse extends Response {
  static json(corps, init = {}) {
    return new Response(JSON.stringify(corps), { status: init.status ?? 200, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } })
  }
}
export const NextRequest = Request

// ── lib/flags ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FLAGS = new Proxy({}, { get: (_c, n) => E.config.drapeaux?.[n] ?? false })
export const actif = (f) => { noter({ f: 'actif', drapeau: f }); return E.config.drapeaux?.[f] === true }

// ── lib/direction/garde ──────────────────────────────────────────────────────────────────────────────────────────────────
export const estRefus = (r) => !!r && 'error' in r
export const domaineRefuse = (r) => !!r && 'error' in r
export const reponseRefus = (r) => NextResponse.json({ error: r.error, code: r.code }, { status: r.status })
export async function estFondateur() { noter({ f: 'estFondateur' }); return E.config.refusGarde ?? E.config.fondateur }
export async function estDirection() { noter({ f: 'estDirection' }); return E.config.refusGarde ?? E.config.fondateur }
export function exigerDomaine(_f, domaine, verbe) { noter({ f: 'exigerDomaine', domaine, verbe }); return E.config.refusDomaine ?? { borne: false } }

// ── lib/controle/droits ──────────────────────────────────────────────────────────────────────────────────────────────────
export function peutFaire(role, domaine, verbe) {
  noter({ f: 'peutFaire', role, domaine, verbe })
  const v = E.config.verdict
  return !v || v[domaine] === true ? { permis: true, borne: false } : { permis: false, raison: 'Hors de votre périmètre (doublure).' }
}
export const autorise = (r, d, v) => peutFaire(r, d, v).permis

// ── lib/agents/garde ─────────────────────────────────────────────────────────────────────────────────────────────────────
export async function authAgent(req) {
  const h = req?.headers?.get?.('authorization') ?? ''
  const jeton = h.replace(/^Bearer\s+/i, '')
  const nom = E.config.jetons?.[jeton]
  noter({ f: 'authAgent', nom: nom ?? null })
  if (!jeton) return { status: 401, code: 'jeton_absent', error: 'Jeton d’agent absent.' }
  return nom ? { nom, capacites: ['reunion'], typesCrees: [], tablesEcrites: [], debitMinute: 60 } : { status: 401, code: 'jeton_inconnu', error: 'Jeton d’agent inconnu.' }
}

// ── lib/agents/pause ─────────────────────────────────────────────────────────────────────────────────────────────────────
export async function pauseGenerale() {
  noter({ f: 'pauseGenerale' })
  if (E.config.pausePanne) throw new Error('pause illisible (doublure)')
  return E.config.pause ?? { active: false, source: 'base' }
}

// ── lib/supabaseAdmin ────────────────────────────────────────────────────────────────────────────────────────────────────
const interdit = (quoi, table) => (...args) => { noter({ f: quoi, table, args: copie(args) }); throw new Error(`doublure : ${quoi} interdit ici (${table ?? ''})`) }
const valeurDe = (l, k) => (l && typeof l === 'object' ? l[k] : undefined)
function filtrer(lignes, filtres) {
  return lignes.filter((l) => filtres.every(([op, k, v]) => {
    const x = valeurDe(l, k)
    if (op === 'eq') return x === v
    if (op === 'neq') return x !== v
    if (op === 'is') return v === null ? x === null || x === undefined : x === v
    if (op === 'in') return Array.isArray(v) && v.includes(x)
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
  if (q.limite !== null) lignes = lignes.slice(0, q.limite)
  const compte = q.options?.count ? lignes.length : null
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
  storage: {
    from(bucket) {
      return {
        async createSignedUrl(chemin, secondes) { noter({ f: 'createSignedUrl', bucket, chemin, secondes }); return { data: { signedUrl: `https://stockage.exemple.invalid/storage/v1/object/sign/${bucket}/${chemin}?token=essai` }, error: null } },
        getPublicUrl(chemin) { noter({ f: 'getPublicUrl', bucket, chemin }); return { data: { publicUrl: `https://stockage.exemple.invalid/storage/v1/object/public/${bucket}/${chemin}` } } },
      }
    },
  },
}

// ── lib/direction/tresorerie (la fonction ventes_sites de 026-055, même contrat) ─────────────────────────────────────────
export function ventesSites(lignes) {
  noter({ f: 'ventesSites', n: Array.isArray(lignes) ? lignes.length : null })
  const o = { payee: 0, generee: 0, validee: 0, en_ligne: 0, retiree: 0, encaisseCents: 0 }
  for (const l of lignes ?? []) if (l.etat in o && l.etat !== 'encaisseCents') { o[l.etat]++; o.encaisseCents += l.prix_cents ?? 0 }
  return o
}

// ── lib/direction/stripe ─────────────────────────────────────────────────────────────────────────────────────────────────
export async function mrr() { noter({ f: 'mrr' }); return { valeur: E.config.mrr ?? { mrr: 490, abonnements: 3, parPlan: {}, enPause: 0, abonnementsEnPause: 0 }, source: 'stripe', a: new Date().toISOString(), cache: false } }

// ── lib/controle/lectures (026-174) ──────────────────────────────────────────────────────────────────────────────────────
const lecture = (nom) => async (...args) => {
  noter({ f: nom, args: copie(args) })
  const r = E.config.lectures?.[nom]
  if (r instanceof Error) throw r
  return copie(r ?? null)
}
export const santeService = lecture('santeService')
export const cronsDuService = lecture('cronsDuService')
export const audience = lecture('audience')
export const bans = lecture('bans')
export const clients = lecture('clients')
export const cerveaux = lecture('cerveaux')
export const ticketsOuverts = lecture('ticketsOuverts')
