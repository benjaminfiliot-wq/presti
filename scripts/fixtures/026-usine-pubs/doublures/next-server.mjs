// Doublure de next/server pour usine-pubs-qa (026-199) : l'import réel échoue hors de Next. Ce qu'une route appelle :
// NextResponse.json / redirect / next, NextRequest.
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
export const after = (tache) => { try { const r = typeof tache === 'function' ? tache() : tache; if (r && typeof r.then === 'function') r.catch(() => {}) } catch { /* après la réponse */ } }
