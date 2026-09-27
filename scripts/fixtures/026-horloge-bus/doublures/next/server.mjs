// Doublure de next/server pour les juges des droits du bus (026-038) : l'import réel échoue hors de Next (pas de carte
// d'exports pour ESM). Ce qu'une route appelle : NextResponse.json / redirect / next, NextRequest, after, userAgent.
export class NextResponse extends Response {
  static json(corps, init = {}) {
    const h = new Headers(init.headers)
    if (!h.has('content-type')) h.set('content-type', 'application/json')
    return new NextResponse(JSON.stringify(corps), { ...init, headers: h })
  }
  static redirect(u, init) { const status = typeof init === 'number' ? init : (init && init.status) || 307; return new NextResponse(null, { status, headers: { location: String(u) } }) }
  static next(init) { return new NextResponse(null, init) }
}
export class NextRequest extends Request {
  get nextUrl() { return new URL(this.url) }
}
/** after() : exécuté tout de suite ; la promesse est gardée pour que la sonde l'attende. */
export function after(tache) {
  const J = (globalThis.__JUGE_026__ ??= { seq: 0, doublures: [], apres: [] })
  try { const r = typeof tache === 'function' ? tache() : tache; if (r && typeof r.then === 'function') (J.apres ??= []).push(r.catch(() => {})) } catch { /* after ne fait pas échouer la réponse */ }
}
export const userAgent = () => ({ ua: '', isBot: false, browser: {}, device: {}, engine: {}, os: {}, cpu: {} })
