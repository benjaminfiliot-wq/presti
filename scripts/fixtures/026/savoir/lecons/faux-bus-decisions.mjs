// scripts/fixtures/026/savoir/lecons/faux-bus-decisions.mjs — le faux bus des décisions tranchées (fiche 026-234, écrit
// par Claude Code). Serveur HTTP sur 127.0.0.1 (port libre), démarré DANS le processus du juge : il compte ce qu'il
// REÇOIT. Il reprend le contrat de la vraie route (app/api/agents/decisions/route.ts, GET) et de ops_decisions_tranchees
// (0098) :
//   GET /api/agents/decisions?tranchees=1&depuis=<ISO avec fuseau>
//     → 401 sans `Authorization: Bearer <jeton>` exact ;
//     → 400 si tranchees ≠ 1, depuis absent, illisible, dans le futur ou de plus de 30 jours ;
//     → 200 [{ id, cle_idempotence, choix, tranchee_le }], tranchee_le > max(depuis, maintenant − 30 j), trié, 50 au plus.
//   Toute autre route → 404.
// Chaque requête est consignée : { methode, chemin, requete (chemin + requête, telle que reçue), jetonDansAdresse,
// authorization: 'exact' | 'autre' | 'absent', statut }. La valeur du jeton n'est jamais consignée.
import http from 'node:http'

const JOUR = 86_400_000
const RE_DEPUIS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

export async function demarrerBusDecisions({ jeton, decisions = [] } = {}) {
  if (!jeton) throw new Error('faux bus des décisions : jeton requis')
  const requetes = []
  const serveur = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const auth = req.headers.authorization
    const trace = {
      methode: req.method, chemin: url.pathname, requete: req.url,
      jetonDansAdresse: decodeURIComponent(req.url).includes(jeton),
      authorization: auth === undefined ? 'absent' : auth === `Bearer ${jeton}` ? 'exact' : 'autre',
    }
    const rendre = (statut, corps) => { trace.statut = statut; requetes.push(trace); res.writeHead(statut, { 'content-type': 'application/json' }); res.end(JSON.stringify(corps)) }
    if (req.method !== 'GET' || url.pathname !== '/api/agents/decisions') return rendre(404, { error: 'introuvable' })
    if (auth !== `Bearer ${jeton}`) return rendre(401, { error: 'non_autorise' })
    const depuis = url.searchParams.get('depuis')
    const date = depuis === null ? NaN : Date.parse(depuis)
    const age = Date.now() - date
    if (url.searchParams.get('tranchees') !== '1' || !depuis || !RE_DEPUIS.test(depuis) || !Number.isFinite(date) || age < 0 || age > 30 * JOUR) return rendre(400, { error: 'parametres_invalides' })
    const plancher = Math.max(date, Date.now() - 30 * JOUR)
    const rendues = decisions
      .filter((d) => Date.parse(d.tranchee_le) > plancher)
      .sort((a, b) => (a.tranchee_le === b.tranchee_le ? (a.id < b.id ? -1 : 1) : a.tranchee_le < b.tranchee_le ? -1 : 1))
      .slice(0, 50)
    trace.rendues = rendues.map((d) => d.id)
    return rendre(200, rendues)
  })
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok))
  const { port } = serveur.address()
  return {
    base: `http://127.0.0.1:${port}`,
    requetes,
    fermer: () => new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) }),
  }
}
