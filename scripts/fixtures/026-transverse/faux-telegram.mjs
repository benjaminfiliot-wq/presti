// scripts/fixtures/026-transverse/faux-telegram.mjs — le FAUX Telegram du juge du pont (fiche 026-194, Claude Code).
// Un serveur HTTP sur 127.0.0.1 (port libre), rien d'autre : jamais le vrai api.telegram.org.
//   GET|POST /bot<jeton>/getUpdates   long polling : sert les mises à jour de la file dont l'update_id ≥ offset ; s'il n'y en a pas, la requête
//                                     est RETENUE (comme le vrai Telegram) jusqu'à un poster()/rejouer() du juge, ou attenteMs réelles (réponse vide) ;
//   POST /bot<jeton>/sendMessage      consigné avec son chemin, ses paramètres et son corps complet ; répond ok ;
//   tout autre chemin → 404 ; un autre jeton dans le chemin → 401 (consigné).
// Le juge consigne CHAQUE requête (requetes[]) et ne se fie à aucun journal du service. Comme le vrai Telegram, une mise à jour dont
// l'update_id < offset est confirmée et supprimée ; rejouer(id) la re-sert malgré l'offset (l'acquittement d'un même update_id rejoué :
// PT-16, correction du 27/09).
import http from 'node:http'

const decouper = (brut, type) => {
  if (!brut) return {}
  try { if (/json/i.test(type ?? '') || /^\s*[{[]/.test(brut)) return JSON.parse(brut) } catch { /* corps illisible : rendu brut */ }
  try { return Object.fromEntries(new URLSearchParams(brut)) } catch { return {} }
}

export async function creerFauxTelegram({ jeton, attenteMs = 1500 }) {
  const etat = { requetes: [], envois: [], polls: [], file: [], retenues: new Set(), seq: 0, idMax: 0, offsetMax: 0, mode: { panne: null, envoi: null }, msg: 0 }
  const repondre = (res, code, obj) => { const t = JSON.stringify(obj); res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(t) }); res.end(t) }

  const liste = (offset, limit) => {
    if (offset > 0) etat.file = etat.file.filter((u) => u.rejeu || u.update_id >= offset)
    const out = [...etat.file].sort((x, y) => x.update_id - y.update_id).slice(0, limit)
    etat.file = etat.file.filter((u) => !(u.rejeu && out.includes(u)))
    return out.map(({ rejeu, ...u }) => u)
  }
  const liberer = () => {
    for (const h of [...etat.retenues]) {
      const r = liste(h.offset, h.limit)
      if (r.length) { clearTimeout(h.minuteur); etat.retenues.delete(h); repondre(h.res, 200, { ok: true, result: r }) }
      else if (h.res.writableEnded) etat.retenues.delete(h)
    }
  }

  const serveur = http.createServer((req, res) => {
    const morceaux = []
    req.on('data', (c) => morceaux.push(c))
    req.on('error', () => {})
    req.on('end', () => {
      const brut = Buffer.concat(morceaux).toString('utf8')
      const u = new URL(req.url, 'http://127.0.0.1')
      const corps = decouper(brut, req.headers['content-type'])
      const params = { ...Object.fromEntries(u.searchParams), ...(corps && typeof corps === 'object' ? corps : {}) }
      const m = /^\/bot([^/]+)\/([A-Za-z]+)$/.exec(u.pathname)
      const r = { n: ++etat.seq, methode: req.method, chemin: u.pathname, methodeApi: m?.[2] ?? null, jetonBon: m ? m[1] === jeton : false, params, corpsBrut: brut, entetes: { ...req.headers } }
      etat.requetes.push(r)
      if (etat.mode.panne === 'coupe') { req.socket.destroy(); return }
      if (etat.mode.panne === '500') return repondre(res, 500, { ok: false, error_code: 500, description: 'Internal Server Error' })
      if (!m) return repondre(res, 404, { ok: false, error_code: 404, description: 'Not Found' })
      if (m[1] !== jeton) return repondre(res, 401, { ok: false, error_code: 401, description: 'Unauthorized' })
      if (m[2] === 'getUpdates') {
        const offset = Number(params.offset ?? 0) || 0
        const limit = Math.min(100, Number(params.limit ?? 100) || 100)
        etat.offsetMax = Math.max(etat.offsetMax, offset)
        etat.polls.push({ n: r.n, offset, timeout: params.timeout === undefined ? undefined : Number(params.timeout), params })
        const out = liste(offset, limit)
        if (out.length || Number(params.timeout) === 0) return repondre(res, 200, { ok: true, result: out })
        const h = { res, offset, limit, minuteur: setTimeout(() => { etat.retenues.delete(h); if (!res.writableEnded) repondre(res, 200, { ok: true, result: [] }) }, attenteMs) }
        etat.retenues.add(h)
        res.on('close', () => { clearTimeout(h.minuteur); etat.retenues.delete(h) })
        return
      }
      if (m[2] === 'sendMessage') {
        const e = { n: r.n, chemin: u.pathname, params, corpsBrut: brut, entetes: r.entetes, chat_id: params.chat_id === undefined ? undefined : String(params.chat_id), texte: params.text, refuse: etat.mode.envoi === '500' }
        etat.envois.push(e)
        if (etat.mode.envoi === '500') return repondre(res, 500, { ok: false, error_code: 500, description: 'Internal Server Error' })
        return repondre(res, 200, { ok: true, result: { message_id: ++etat.msg, chat: { id: Number(params.chat_id) || 0 }, date: 0, text: params.text } })
      }
      return repondre(res, 200, { ok: true, result: true })
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  const port = serveur.address().port

  return {
    port, jeton, url: `http://127.0.0.1:${port}`,
    requetes: etat.requetes, envois: etat.envois, polls: etat.polls, mode: etat.mode,
    offsetMax: () => etat.offsetMax,
    retenues: () => etat.retenues.size,
    /** Ajoute une mise à jour (update_id attribué s'il manque) ; rend son update_id. */
    poster(u) {
      const id = u.update_id ?? ++etat.idMax
      etat.idMax = Math.max(etat.idMax, id)
      etat.file.push({ ...u, update_id: id })
      liberer()
      return id
    },
    /** Re-sert, malgré l'offset, une mise à jour DÉJÀ servie (copie fournie par le juge). */
    /** Le long polling « expire » : toutes les attentes en cours reçoivent une réponse vide (comme le fait Telegram à la fin de timeout). */
    relacher() { for (const h of [...etat.retenues]) { clearTimeout(h.minuteur); etat.retenues.delete(h); if (!h.res.writableEnded) repondre(h.res, 200, { ok: true, result: liste(h.offset, h.limit) }) } },
    rejouer(u) { etat.file.push({ ...u, rejeu: true }); liberer() },
    envoisVers: (chat) => etat.envois.filter((e) => e.chat_id === String(chat)),
    async fermer() { for (const h of etat.retenues) clearTimeout(h.minuteur); etat.retenues.clear(); serveur.closeAllConnections(); await new Promise((ok) => serveur.close(ok)) },
  }
}
