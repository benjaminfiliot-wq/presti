// Témoin du faux PostgREST (026-009) : l'implémentation de référence sur laquelle le contrôle « faux-postgrest » de
// scripts/juges-026-horloge-bus-preuve.mjs doit être VERT, et ses sabotages (option `sabotage`) ROUGES. Ce n'est pas
// scripts/lib/faux-postgrest.mjs, que la fiche 026-038 écrit : c'est la preuve que le contrôle sait juger un faux PostgREST.
//   demarrer({ contrat, reponses, sabotage }) → { url, appels, arreter }
//   sabotage : 'laxiste' (accepte un paramètre inconnu ou manquant), 'ferme' (refuse tout en 400), 'muet' (ne consigne
//   aucun appel), 'immortel' (arreter ne ferme pas le serveur).
import http from 'node:http'

export async function demarrer({ contrat, reponses = {}, sabotage = null } = {}) {
  const appels = []
  const serveur = http.createServer((req, res) => {
    let corps = ''
    req.setEncoding('utf8')
    req.on('data', (d) => { corps += d })
    req.on('end', () => {
      const repondre = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
      const m = /^\/rest\/v1\/rpc\/([a-z0-9_.]+)$/.exec(new URL(req.url, 'http://127.0.0.1').pathname)
      if (!m) return repondre(404, { code: 'PGRST125', message: 'chemin inconnu' })
      let params
      try { params = corps ? JSON.parse(corps) : {} } catch { return repondre(400, { code: 'PGRST102', message: 'corps illisible' }) }
      if (sabotage !== 'muet') appels.push({ fonction: m[1], params })
      const f = contrat.fonctions[m[1]]
      if (!f) return repondre(404, { code: 'PGRST202', message: `fonction ${m[1]} absente du contrat` })
      const noms = f.params.map(([n]) => n)
      const inconnus = Object.keys(params).filter((k) => !noms.includes(k))
      const manquants = noms.filter((n) => !(n in params))
      if (sabotage === 'ferme' || (sabotage !== 'laxiste' && (inconnus.length || manquants.length))) {
        return repondre(400, { code: 'PGRST202', message: `paramètres inconnus : ${inconnus.join(', ') || '—'} ; manquants : ${manquants.join(', ') || '—'}` })
      }
      const r = reponses[m[1]]
      const x = typeof r === 'function' ? r(params) : { status: 200, body: r ?? null }
      repondre(x.status ?? 200, x.body ?? null)
    })
  })
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok))
  return {
    url: `http://127.0.0.1:${serveur.address().port}`,
    appels,
    arreter: () => (sabotage === 'immortel' ? Promise.resolve() : new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) })),
  }
}
