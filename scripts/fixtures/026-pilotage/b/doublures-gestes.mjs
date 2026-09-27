// scripts/fixtures/026-pilotage/b/doublures-gestes.mjs — les doublures de pilotage-gestes-qa (fiche 026-066, GE-11 à GE-15).
//
// Le crochet du juge redirige vers ce module (une instance par `?m=…`) les imports que font les routes d'écriture du Pilotage :
// next/server, @/lib/flags, @/lib/direction/garde, @/lib/direction/reconfirmation, @/lib/direction/journal, @/lib/supabaseAdmin.
// Toutes les instances partagent un seul état (globalThis) : la configuration du cas joué et la liste des appels consignés,
// dans l'ordre. Rien ne sort du processus : aucune base, aucun réseau. Les réussites des routes ne se prouvent qu'ici.
const E = (globalThis.__pilotageGestes ??= { appels: [], config: {} })
export const etat = E
const noter = (x) => { E.appels.push(x); return x }

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
export async function estDirection(req) { noter({ f: 'estDirection' }); return E.config.refusGarde ?? E.config.fondateur }
export async function estFondateur(req) { noter({ f: 'estFondateur' }); return E.config.refusGarde ?? E.config.fondateur }
export function exigerDomaine(f, domaine, verbe) { noter({ f: 'exigerDomaine', domaine, verbe }); return { borne: false } }

// ── lib/direction/reconfirmation ─────────────────────────────────────────────────────────────────────────────────────────
export const EN_TETE = 'x-presti-reconfirmation'
export const PORTEES = ['securite', 'argent', 'artisan', 'reglages']
export async function exigerReconfirmation(req, uid, portee) {
  noter({ f: 'exigerReconfirmation', uid, portee })
  return E.config.reconfirme ? null : NextResponse.json({ error: 'Confirmez à nouveau.', code: 'reconfirmation_requise', portee }, { status: 403 })
}

// ── lib/direction/journal ────────────────────────────────────────────────────────────────────────────────────────────────
export const epurer = (v) => v
export async function journaliser(e, req) { noter({ f: 'journaliser', e: JSON.parse(JSON.stringify(e)) }); return E.config.journalOk !== false }
export const refusJournal = () => NextResponse.json({ error: 'Action refusée : le journal de direction est indisponible.', code: 'journal_indisponible' }, { status: 503 })

// ── lib/supabaseAdmin ────────────────────────────────────────────────────────────────────────────────────────────────────
const interdit = (quoi) => (...args) => { noter({ f: quoi, args }); throw new Error(`doublure : ${quoi} interdit dans une route d'écriture du Pilotage`) }
export const supabaseAdmin = {
  async rpc(nom, args) { noter({ f: 'rpc', nom, args: JSON.parse(JSON.stringify(args ?? {})) }); return (E.config.rpc?.(nom, args)) ?? { data: null, error: null } },
  from: interdit('from'),
  schema: interdit('schema'),
}
