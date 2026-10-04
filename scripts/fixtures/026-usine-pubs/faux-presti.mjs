// Le banc du tourneur de usine-pubs-qa (026-199) : un FAUX PRESTI (les trois routes), un FAUX STOCKAGE (adresses signées de lecture et de dépôt) et un
// FAUX SITE DE MARQUE (robots.txt, page produit, photo), tous sur 127.0.0.1. Le juge les possède : le tourneur les joint par --base et par les adresses
// que les routes lui rendent, exactement comme en production. Chaque requête est consignée AVANT d'être jugée, avec l'heure monotone du système
// (process.hrtime, la même horloge que les doublures d'outils : l'ordre des événements se lit sans croire personne).
//
//   demarrerBanc({ jeton, photos, page }) → { presti, stockage, web, requetes, file, mode, arreter() }
//     file        les travaux que /travail rend, dans l'ordre (un seul rendu par passage, sauf servirToujours : deux passages simultanés)
//     mode        { presti: null | 'coupe' | '500', stockage: null | 'coupe', depot: null | 'coupe', robots: 'libre' | 'interdit' | 'absent' }
//     requetes[]  { t, serveur, methode, chemin, ua, autorise, corps, octets, sha256 }
//     depots      Map chemin → { octets, sha256, type, taille } : ce que le faux stockage a REÇU (jamais ce que le tourneur dit)
//     refus[]     { route, raison } : ce que le faux Presti a refusé de bon droit (un tourneur conforme n'en provoque aucun)
import http from 'node:http'
import crypto from 'node:crypto'

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
const LIMITE_PACK = 60 * 1024 * 1024, LIMITE_STUDIO = 3 * 1024 * 1024
const TYPES = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png' }

function ecouter(serveur) { return new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) }) }

export async function demarrerBanc({ jeton, photos = [], page = { html: '', image: Buffer.alloc(0) } }) {
  const etat = {
    requetes: [], file: [], pris: new Map(), servirToujours: false, depots: new Map(), refus: [], jetonsLecture: new Map(), jetonsDepot: new Map(),
    mode: { presti: null, stockage: null, depot: null, robots: 'libre' }, photos,
  }
  const consigner = (serveur, req, brut, extra = {}) => {
    const r = { t: process.hrtime.bigint(), serveur, methode: req.method, chemin: req.url.split('?')[0], ua: req.headers['user-agent'] ?? null, autorise: req.headers.authorization === `Bearer ${jeton}`, octets: brut.length, ...extra }
    etat.requetes.push(r)
    return r
  }
  const lire = (req) => new Promise((ok) => { const m = []; req.on('data', (d) => m.push(d)); req.on('end', () => ok(Buffer.concat(m))); req.on('error', () => ok(Buffer.concat(m))) })
  const repondre = (res, status, corps, type = 'application/json') => {
    const b = Buffer.isBuffer(corps) ? corps : Buffer.from(typeof corps === 'string' ? corps : JSON.stringify(corps))
    res.writeHead(status, { 'content-type': type, 'content-length': b.length, 'cache-control': 'no-store' })
    res.end(b)
  }
  let urlStockage = '', urlWeb = ''

  // ── le faux Presti ──
  const presti = http.createServer(async (req, res) => {
    const brut = await lire(req)
    let corps = null
    try { corps = brut.length ? JSON.parse(brut.toString('utf8')) : null } catch { corps = { illisible: true } }
    const r = consigner('presti', req, brut, { corps })
    if (etat.mode.presti === 'coupe') return req.socket.destroy()
    if (etat.mode.presti === '500') return repondre(res, 500, { error: 'panne', code: 'panne' })
    if (!r.autorise) return repondre(res, 401, { error: 'jeton', code: 'jeton' })
    const route = r.chemin
    if (route === '/api/usine/pubs/travail' && req.method === 'GET') {
      const j = etat.servirToujours ? etat.file[0] : etat.file.shift()
      if (!j) return repondre(res, 200, { travail: null })
      const id = j.id ?? j.decision
      etat.pris.set(id, j)
      return repondre(res, 200, j)
    }
    const connu = corps && typeof corps === 'object' ? etat.pris.get(corps.travail) : null
    if (route === '/api/usine/pubs/depot' && req.method === 'POST') {
      if (!connu) { etat.refus.push({ route: 'depot', raison: 'travail inconnu' }); return repondre(res, 404, { error: 'travail_introuvable', code: 'travail_introuvable' }) }
      const fs_ = Array.isArray(corps.fichiers) ? corps.fichiers : []
      const pack = connu.type === 'pack'
      const prefixe = pack ? `packs-pubs/${connu.id}/livraison/` : `packs-pubs/studio/${connu.marque_cle}/`
      let raison = null
      if (!fs_.length || fs_.length > (pack ? 6 : 1)) raison = 'nombre de fichiers'
      const vus = new Set()
      for (const f of fs_) {
        if (raison) break
        if (!f || typeof f.chemin !== 'string' || typeof f.type !== 'string' || !Number.isSafeInteger(f.taille) || f.taille <= 0) { raison = 'fichier mal formé'; break }
        const nom = f.chemin.startsWith(prefixe) ? f.chemin.slice(prefixe.length) : null
        const ext = (nom ?? '').split('.').pop()
        const okNom = nom !== null && (pack ? /^(video-[1-3]\.mp4|visuel-[1-3]\.(jpg|png))$/.test(nom) : /^echantillon-[0-9]+\.mp4$/.test(nom))
        if (!okNom || TYPES[ext] !== f.type || vus.has(f.chemin)) { raison = `chemin ou type refusé : ${f.chemin} ${f.type}`; break }
        if (f.taille > (pack ? LIMITE_PACK : LIMITE_STUDIO)) { raison = `trop gros : ${f.chemin}`; break }
        vus.add(f.chemin)
      }
      if (raison) { etat.refus.push({ route: 'depot', raison }); return repondre(res, 400, { error: 'fichier_invalide', code: 'fichier_invalide' }) }
      const depots = fs_.map((f) => { const t = crypto.randomBytes(18).toString('base64url'); etat.jetonsDepot.set(t, { chemin: f.chemin, type: f.type, taille: f.taille }); return { chemin: f.chemin, url: `${urlStockage}/depot/${t}` } })
      return repondre(res, 200, { ok: true, depots })
    }
    if (route === '/api/usine/pubs/rendu' && req.method === 'POST') {
      if (!connu) { etat.refus.push({ route: 'rendu', raison: 'travail inconnu' }); return repondre(res, 404, { error: 'travail_introuvable', code: 'travail_introuvable' }) }
      if (typeof corps.ok !== 'boolean') { etat.refus.push({ route: 'rendu', raison: 'ok absent' }); return repondre(res, 400, { error: 'corps_invalide', code: 'corps_invalide' }) }
      if (corps.ok === false) return repondre(res, 200, { ok: false, raison: String(corps.raison ?? 'echec') })
      const attendu = connu.type === 'pack' ? 'pub-locale-qa' : 'pub-qa'
      const j = corps.juge
      const fichiers = Array.isArray(corps.fichiers) ? corps.fichiers : []
      let raison = null
      if (!j || j.nom !== attendu || j.code !== 0 || typeof j.empreinte_journal !== 'string' || !/^[0-9a-f]{64}$/.test(j.empreinte_journal)) raison = 'juge_non_vert'
      else if (!fichiers.length) raison = 'fichiers_incomplets'
      else for (const f of fichiers) { const d = etat.depots.get(f?.chemin); if (!d) { raison = 'fichier_absent'; break } if (d.sha256 !== f.sha256) { raison = 'empreinte_fausse'; break } }
      if (connu.type === 'pack' && !raison && (fichiers.length !== 6 || ![1, 2, 3].every((i) => etat.depots.has(`packs-pubs/${connu.id}/livraison/video-${i}.mp4`)))) raison = 'fichiers_incomplets'
      if (raison) { etat.refus.push({ route: 'rendu', raison }); return repondre(res, 409, { ok: false, raison }) }
      return repondre(res, 200, { ok: true })
    }
    return repondre(res, 404, { error: 'introuvable', code: 'introuvable' })
  })

  // ── le faux stockage ──
  const stockage = http.createServer(async (req, res) => {
    const brut = await lire(req)
    const chemin = req.url.split('?')[0]
    const r = consigner('stockage', req, brut, { sha256: brut.length ? sha256(brut) : null })
    if (etat.mode.stockage === 'coupe') return req.socket.destroy()
    let m
    if ((m = /^\/lire\/([A-Za-z0-9_-]+)$/.exec(chemin)) && req.method === 'GET') {
      const p = etat.jetonsLecture.get(m[1])
      return p ? repondre(res, 200, p.octets, 'image/jpeg') : repondre(res, 404, { error: 'jeton' })
    }
    if ((m = /^\/depot\/([A-Za-z0-9_-]+)$/.exec(chemin)) && (req.method === 'PUT' || req.method === 'POST')) {
      if (etat.mode.depot === 'coupe') { r.coupe = true; return req.socket.destroy() }
      const j = etat.jetonsDepot.get(m[1])
      if (!j) return repondre(res, 400, { error: 'jeton de dépôt invalide' })
      let octets = brut
      const ct = String(req.headers['content-type'] || '')
      const mp = /^multipart\/form-data;\s*boundary=(.+)$/i.exec(ct)
      if (mp) { // storage-js peut envoyer un FormData : on en retire la partie fichier
        const sep = Buffer.from(`--${mp[1].replace(/^"|"$/g, '')}`)
        const debut = brut.indexOf(Buffer.from('\r\n\r\n'), brut.indexOf(sep)) + 4
        const fin = brut.indexOf(Buffer.from(`\r\n--${mp[1].replace(/^"|"$/g, '')}`), debut)
        if (debut >= 4 && fin > debut) octets = brut.subarray(debut, fin)
      }
      etat.depots.set(j.chemin, { octets, sha256: sha256(octets), type: ct, taille: octets.length, annonce: j })
      return repondre(res, 200, { Key: j.chemin })
    }
    return repondre(res, 404, { error: 'introuvable' })
  })

  // ── le faux site de la marque ──
  const web = http.createServer(async (req, res) => {
    const brut = await lire(req)
    const chemin = req.url.split('?')[0]
    consigner('web', req, brut)
    if (chemin === '/robots.txt') {
      if (etat.mode.robots === 'absent') return repondre(res, 404, 'pas de robots', 'text/plain')
      return repondre(res, 200, etat.mode.robots === 'interdit' ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nDisallow:\n', 'text/plain')
    }
    if (chemin === '/marque/produit.html') return repondre(res, 200, page.html.replaceAll('{{IMAGE}}', `${urlWeb}/marque/produit.jpg`), 'text/html; charset=utf-8')
    if (chemin === '/marque/produit.jpg') return repondre(res, 200, page.image, 'image/jpeg')
    return repondre(res, 404, 'introuvable', 'text/plain')
  })

  await Promise.all([ecouter(presti), ecouter(stockage), ecouter(web)])
  const base = (s) => `http://127.0.0.1:${s.address().port}`
  urlStockage = base(stockage); urlWeb = base(web)
  const bancs = [presti, stockage, web]
  let ferme = false
  return {
    presti: base(presti), stockage: urlStockage, web: urlWeb,
    requetes: etat.requetes, file: etat.file, mode: etat.mode, depots: etat.depots, refus: etat.refus, pris: etat.pris,
    get servirToujours() { return etat.servirToujours }, set servirToujours(v) { etat.servirToujours = v },
    /** Une adresse signée de lecture pour un octet-flux du juge (les photos du pack) → l'url que /travail rend. */
    signerLecture(octets) { const t = crypto.randomBytes(18).toString('base64url'); etat.jetonsLecture.set(t, { octets }); return `${urlStockage}/lire/${t}` },
    arreter: () => (ferme ? Promise.resolve() : new Promise((ok) => { ferme = true; let n = bancs.length; for (const s of bancs) { s.closeAllConnections?.(); s.close(() => { if (--n === 0) ok() }) } })),
  }
}

/** Une adresse locale où personne n'écoute : un port pris puis rendu. */
export async function adresseMorte() {
  const s = http.createServer()
  await ecouter(s)
  const p = s.address().port
  await new Promise((ok) => s.close(ok))
  return `http://127.0.0.1:${p}`
}
