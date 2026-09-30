// scripts/fixtures/026-transverse/routes-doublures.mjs — les doublures du juge du pont Telegram, partie routes (fiche 026-194, Claude Code).
// Le crochet (routes-crochet.mjs) redirige ici, une instance par `?m=…`, les imports que font les deux routes du pont :
//   next/server, @/lib/flags, @/lib/agents/garde, @/lib/agents/pause.
// Toutes les instances partagent un seul état (globalThis) : la configuration du cas joué (`config`) et la liste ORDONNÉE des
// appels aux doublures (`appels`), que le juge lit pour prouver l'ordre « drapeau, puis identité » et l'absence d'identité quand
// le drapeau est baissé. Rien ne sort du processus : aucune base, aucun réseau.
//
// authAgent rend, comme la vraie (lib/agents/garde.ts:104) : un refus { status, code, error } (401) pour un jeton absent ou
// inconnu, sinon l'agent { nom, capacites, … } que config.jetons[jeton] désigne. Le refus 403 d'un AUTRE agent est la
// décision de la route : la garde ne connaît pas la route.
const E = (globalThis.__pontTelegramDoublures ??= { appels: [], config: {} })
export const etat = E
const noter = (x) => { E.appels.push(x); return x }

// ── next/server ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export class NextRequest extends Request {
  get nextUrl() { return new URL(this.url) }
}
export class NextResponse extends Response {
  static json(corps, init = {}) {
    return new Response(JSON.stringify(corps), { status: init.status ?? 200, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } })
  }
  static redirect(url, status = 307) { return new Response(null, { status, headers: { location: String(url) } }) }
  static next() { return new Response(null, { status: 200 }) }
}

// ── lib/flags ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FLAGS = new Proxy({}, { get: (_c, n) => E.config.drapeaux?.[n] === true })
export const actif = (f) => { noter({ f: 'actif', drapeau: f }); return E.config.drapeaux?.[f] === true }

// ── lib/agents/garde ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const PLAFOND_ESSAIS_IP = 30
export const FENETRE_ESSAIS_IP_S = 600
export const estRefusAgent = (r) => !!r && typeof r === 'object' && 'error' in r
export async function authAgent(req) {
  const h = req?.headers?.get?.('authorization') ?? ''
  const m = /^Bearer +(\S+)$/i.exec(h.trim())
  const jeton = m ? m[1] : null
  const a = jeton ? E.config.jetons?.[jeton] : null
  noter({ f: 'authAgent', nom: a?.nom ?? null, avecJeton: !!jeton })
  if (!jeton) return { status: 401, code: 'jeton', error: 'Jeton d’agent refusé.' }
  if (!a) return { status: 401, code: 'jeton', error: 'Jeton d’agent refusé.' }
  return { nom: a.nom, capacites: [...(a.capacites ?? [])], typesCrees: [], tablesEcrites: [], debitMinute: 60, route: new URL(req.url).pathname }
}
export async function exigerType(agent, type) { noter({ f: 'exigerType', type }); return agent.typesCrees?.includes(type) ? null : { status: 403, code: 'type', error: 'Type de tâche hors du périmètre de cet agent.' } }
export async function exigerTable(agent, table) { noter({ f: 'exigerTable', table }); return agent.tablesEcrites?.includes(table) ? null : { status: 403, code: 'table', error: 'Table hors du périmètre de cet agent.' } }
export function reponseRefusAgent(r) {
  const headers = { 'cache-control': 'no-store' }
  if (r.status === 401) headers['www-authenticate'] = 'Bearer realm="agents"'
  return NextResponse.json({ error: r.error, code: r.code }, { status: r.status, headers })
}

// ── lib/agents/pause ─────────────────────────────────────────────────────────────────────────────────────────────────────
export async function pauseGenerale() {
  noter({ f: 'pauseGenerale' })
  return E.config.pause ?? { active: false, source: 'base' }
}
