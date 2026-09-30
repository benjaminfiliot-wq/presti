// scripts/fixtures/026-transverse/faux-presti.mjs — le FAUX Presti du juge du pont (fiche 026-194, Claude Code), sur 127.0.0.1.
//   GET  /api/agents/telegram/sortie?apres_alerte=&apres_evenement=  → { messages: [{ id, texte }], apres_alerte, apres_evenement }
//        sert les messages du juge (alertes[] et evenements[] : { id, texte }) dont l'id est après le curseur reçu, 20 au plus, et rend les
//        curseurs avancés ; un curseur absent vaut 0 ;
//   POST /api/agents/telegram/entree  { commande, motif?, texte? }   → { ok: true } (« etat » : { pause, rouge, orange, appels, en_panne }) ;
//   POST /api/agents/battement                                      → { ok: true }.
// L'en-tête Authorization doit valoir « Bearer <jeton d'agent> » ; sinon 401 et la requête est consignée avec autorise:false.
// Chaque requête est consignée (requetes[]) avec son corps complet. mode.panne : null | '500' | 'coupe' (la connexion est coupée).
import http from 'node:http'

export async function creerFauxPresti({ jeton }) {
  const etat = { requetes: [], alertes: [], evenements: [], mode: { panne: null }, seq: 0 }
  const repondre = (res, code, obj) => { const t = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(t) }); res.end(t) }
  const ETAT = { pause: false, rouge: 7, orange: 11, appels: 23, en_panne: 5 }

  const serveur = http.createServer((req, res) => {
    const morceaux = []
    req.on('data', (c) => morceaux.push(c))
    req.on('error', () => {})
    req.on('end', () => {
      const brut = Buffer.concat(morceaux).toString('utf8')
      const u = new URL(req.url, 'http://127.0.0.1')
      let corps = null
      try { corps = brut ? JSON.parse(brut) : null } catch { corps = { illisible: true } }
      const autorise = req.headers.authorization === `Bearer ${jeton}`
      const r = { n: ++etat.seq, methode: req.method, chemin: u.pathname, requete: Object.fromEntries(u.searchParams), corps, corpsBrut: brut, entetes: { ...req.headers }, autorise }
      etat.requetes.push(r)
      if (etat.mode.panne === 'coupe') { req.socket.destroy(); return }
      if (etat.mode.panne === '500') return repondre(res, 500, { error: 'panne', code: 'ops:essai' })
      if (!autorise) return repondre(res, 401, { error: 'non_autorise', code: 'non_autorise' })
      if (u.pathname === '/api/agents/telegram/sortie' && req.method === 'GET') {
        const a = Number(u.searchParams.get('apres_alerte') ?? 0) || 0
        const e = Number(u.searchParams.get('apres_evenement') ?? 0) || 0
        const al = etat.alertes.filter((x) => x.id > a).sort((x, y) => x.id - y.id)
        const ev = etat.evenements.filter((x) => x.id > e).sort((x, y) => x.id - y.id)
        const prises = [...al.map((x) => ({ ...x, _t: 'a' })), ...ev.map((x) => ({ ...x, _t: 'e' }))].slice(0, 20)
        const na = Math.max(a, ...prises.filter((x) => x._t === 'a').map((x) => x.id))
        const ne = Math.max(e, ...prises.filter((x) => x._t === 'e').map((x) => x.id))
        return repondre(res, 200, { messages: prises.map((x) => ({ id: `${x._t}${x.id}`, texte: x.texte })), apres_alerte: na, apres_evenement: ne })
      }
      if (u.pathname === '/api/agents/telegram/entree' && req.method === 'POST') {
        if (corps?.commande === 'etat') return repondre(res, 200, { ...ETAT })
        return repondre(res, 200, { ok: true })
      }
      if (u.pathname === '/api/agents/battement' && req.method === 'POST') return repondre(res, 200, { ok: true })
      return repondre(res, 404, { error: 'introuvable', code: 'introuvable' })
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  const port = serveur.address().port
  return {
    port, jeton, url: `http://127.0.0.1:${port}`,
    requetes: etat.requetes, alertes: etat.alertes, evenements: etat.evenements, mode: etat.mode,
    appels: (chemin, methode) => etat.requetes.filter((r) => r.chemin === chemin && (!methode || r.methode === methode)),
    commandes: () => etat.requetes.filter((r) => r.chemin === '/api/agents/telegram/entree' && r.methode === 'POST'),
    async fermer() { serveur.closeAllConnections(); await new Promise((ok) => serveur.close(ok)) },
  }
}

/** Une adresse locale où personne n'écoute (bus « injoignable ») : un port pris puis rendu. */
export async function adresseMorte() {
  const s = http.createServer()
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok))
  const p = s.address().port
  await new Promise((ok) => s.close(ok))
  return `http://127.0.0.1:${p}`
}
