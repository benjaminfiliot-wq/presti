// scripts/fixtures/026/vigile/faux-bus.mjs — le faux bus des agents pour vigile-qa (026-248, écrit par Claude Code).
//
// Serveur HTTP (ou HTTPS avec le certificat d'essai fabriqué par le juge) sur 127.0.0.1, port libre. Il compte ce qu'il
// REÇOIT, jamais ce qu'un script dit avoir envoyé. Routes du contrat (026-042 ; route des pauses : suite « pause de Matt »,
// 026-129) :
//   GET  /api/agents/etat        modes.etat    : 200 (l'état donné), 401, 423, 500
//   GET  /api/agents/vigile      modes.vigile  : 200 (la réponse donnée), 401, 403, 404, 500
//   POST /api/agents/battement   sans corps ou {} → 200 { le } ; autre corps → 400
//   POST /api/agents/evenements  { type ^[a-z0-9_]{2,60}$, objet? ≤ 200, resume 1-200 } → 201 { id } ; écart → 400 { champ }
//   POST /api/agents/pauses      { agent ^[a-z0-9_]{2,40}$, motif 1-200 } et rien d'autre ; modes.pauses : 200, 403, 404
// Toute autre route → 404, consignée. Sans `Authorization: Bearer <jeton>` exact → 401, consignée. Chaque requête :
// { n, methode, chemin, requete, hote, auth ('ok' | 'absent' | 'faux'), brut (le corps reçu, texte), corps (JSON ou null),
// statut }. La valeur du jeton n'est jamais consignée.
import http from 'node:http'
import https from 'node:https'

const TYPE = /^[a-z0-9_]{2,60}$/
const AGENT = /^[a-z0-9_]{2,40}$/
const signes = (s) => [...String(s)].length

export async function demarrerFauxBus({ jeton, etat = {}, vigile = {}, modes = {}, tls = null } = {}) {
  const requetes = []
  let id = 9000
  const traiter = (req, res) => {
    let brut = ''
    req.setEncoding('utf8')
    req.on('data', (d) => { if (brut.length < 1 << 20) brut += d })
    req.on('end', () => {
      const u = new URL(req.url, 'http://bus.invalid')
      const a = String(req.headers.authorization || '')
      const auth = !a ? 'absent' : a === `Bearer ${jeton}` ? 'ok' : 'faux'
      let corps = null
      if (brut) { try { corps = JSON.parse(brut) } catch { corps = null } }
      const r = { n: requetes.length + 1, methode: req.method, chemin: u.pathname, requete: u.search, hote: String(req.headers.host || ''), auth, brut, corps, statut: null }
      requetes.push(r)
      const repondre = (statut, json) => { r.statut = statut; const t = JSON.stringify(json ?? {}); res.writeHead(statut, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(t) }); res.end(t) }
      if (auth !== 'ok') return repondre(401, { error: 'Jeton d’agent refusé.', code: 'jeton' })
      const route = `${req.method} ${u.pathname}`
      if (route === 'GET /api/agents/etat') {
        const m = modes.etat ?? 200
        return m === 200 ? repondre(200, etat) : repondre(m, { error: `mode ${m}`, code: m === 423 ? 'agent_en_pause' : 'essai' })
      }
      if (route === 'GET /api/agents/vigile') {
        const m = modes.vigile ?? 200
        return m === 200 ? repondre(200, vigile) : repondre(m, { error: `mode ${m}`, code: m === 403 ? 'hors_perimetre' : 'essai' })
      }
      if (route === 'POST /api/agents/battement') {
        if (brut && !(corps && typeof corps === 'object' && !Array.isArray(corps) && Object.keys(corps).length === 0)) return repondre(400, { error: 'corps inattendu', champ: 'corps' })
        return repondre(200, { le: new Date().toISOString() })
      }
      if (route === 'POST /api/agents/evenements') {
        if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return repondre(400, { error: 'JSON attendu', champ: 'corps' })
        const inconnu = Object.keys(corps).find((k) => !['type', 'objet', 'resume', 'tache'].includes(k))
        if (inconnu) return repondre(400, { error: 'champ inconnu', champ: inconnu })
        if (typeof corps.type !== 'string' || !TYPE.test(corps.type)) return repondre(400, { error: 'type', champ: 'type' })
        if (corps.objet !== undefined && corps.objet !== null && (typeof corps.objet !== 'string' || signes(corps.objet) > 200)) return repondre(400, { error: 'objet', champ: 'objet' })
        if (typeof corps.resume !== 'string' || !corps.resume.trim() || signes(corps.resume) > 200) return repondre(400, { error: 'resume', champ: 'resume' })
        return repondre(201, { id: ++id })
      }
      if (route === 'POST /api/agents/pauses') {
        const m = modes.pauses ?? 404
        if (m === 404) return repondre(404, { error: 'Introuvable.' })
        if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return repondre(400, { error: 'JSON attendu', champ: 'corps' })
        const inconnu = Object.keys(corps).find((k) => !['agent', 'motif'].includes(k))
        if (inconnu) return repondre(400, { error: 'champ inconnu', champ: inconnu })
        if (typeof corps.agent !== 'string' || !AGENT.test(corps.agent)) return repondre(400, { error: 'agent', champ: 'agent' })
        if (typeof corps.motif !== 'string' || !corps.motif.trim() || signes(corps.motif) > 200) return repondre(400, { error: 'motif', champ: 'motif' })
        return m === 200 ? repondre(200, { ok: true, agent: corps.agent, decision: 'reprendre' }) : repondre(m, { error: 'cible refusée par la route', code: 'cible_refusee' })
      }
      return repondre(404, { error: 'Introuvable.' })
    })
  }
  const serveur = tls ? https.createServer({ key: tls.cle, cert: tls.cert }, traiter) : http.createServer(traiter)
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  const port = serveur.address().port
  let ferme = false
  return {
    base: `${tls ? 'https' : 'http'}://127.0.0.1:${port}`,
    port,
    requetes,
    fermer: () => (ferme ? Promise.resolve() : new Promise((ok) => { ferme = true; serveur.closeAllConnections?.(); serveur.close(() => ok()) })),
  }
}
