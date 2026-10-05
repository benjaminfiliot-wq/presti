// lib/stationHorsWeb.ts — la station (Mission Control) ne se sert plus depuis le site (demande de Benj, 05/10/2026 : « je trouve pas ça sécuritaire »).
// Elle vit sur son PC, dans StarNet, qui lit les données par le connecteur en lecture seule (scripts/mcp/presti-station.mjs).
// La page /controle/station et ses routes API répondent 404 sur tout hôte qui n'est pas local (prestiapp.fr, qg., *.vercel.app) ; sur localhost / 127.0.0.1 / [::1] / *.localhost
// (banc de l'usine, juges, développement) rien ne change. Les routes des AGENTS (réunion, jauges, SAV…) ne sont pas concernées.
export function hoteLocal(hote: string | null | undefined): boolean {
  const h = String(hote ?? '').toLowerCase().replace(/:\d+$/, '')
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || h.endsWith('.localhost')
}

export function stationHorsWebPourHote(hote: string | null | undefined): boolean {
  return !hoteLocal(hote)
}

export function stationHorsWebPourRequete(req: Request): boolean {
  let hote = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (!hote) { try { hote = new URL(req.url).host } catch { hote = null } }
  return stationHorsWebPourHote(hote)
}
