// scripts/fixtures/026/usine-production/faux-bus-usine.mjs — le faux bus des agents ET le stockage d'essai, pour le juge du
// tourneur de l'usine (usine-production-qa.mjs, 026-052), écrit par Claude Code. Un vrai serveur HTTP local (127.0.0.1, port
// libre) que le tourneur appelle comme https://prestiapp.fr ; il valide et refuse AU CONTRAT (contrat-usine.json) comme le
// feraient les routes réelles, et il consigne chaque requête SANS la valeur du jeton.
//
//   demarrerFauxBusUsine({ jeton, taches, entrees, contrat }) → bus
//     jeton     le jeton Bearer attendu (tiré au hasard par le juge) ; tout autre en-tête → 401 ;
//     taches    la file : [{ id, type, cle_idempotence, capacite, charge, … }] (prendre la vide dans l'ordre) ;
//     entrees   { <id de tâche>: [{ nom, octets: Buffer, type }] } : ce que le serveur a déposé sous usine/<tache>/entree/.
//   Routes servies :
//     POST /api/agents/battement                → 200 { ok: true }
//     POST /api/agents/taches/prendre           → 200 { tache | null } (mode en_pause : 423 { error, code: 'agent_en_pause' })
//     POST /api/agents/taches/<id>/rendre       { resultat: faite|echec, preuve_url?, erreur? } : clés exactes ; faite exige
//                                                 une preuve supabase://… ; tâche non prise → 409 bail_perdu
//     POST /api/agents/evenements               { type, objet?, resume, tache? } → 201
//     POST /api/agents/usine/entree             { tache } → { tache, entrees: [{ nom, url, octets }] } (tâche prise, sinon 404)
//     POST /api/agents/usine/depot              { tache, fichiers: [{ nom, octets, type, sha256 }] } → { depots: [{ nom, url, jeton }] }
//                                                 validé au contrat (nombre, tailles, total, types, noms, doublons, sha256)
//     GET  /stockage/<jeton>                    les octets d'une entrée (URL signée d'essai) ; aucun Bearer attendu
//     PUT  /stockage/<jeton>                    garde les octets et le Content-Type d'un dépôt ; un Bearer ici est consigné
//                                                 (le jeton de l'agent ne doit jamais partir vers le stockage)
//   bus.requetes : [{ rang, le, methode, chemin, route, statut, auth: 'ok'|'absent'|'autre', corps (JSON, ou { octets, sha256,
//     type } pour un PUT), bearerStockage? }] ; bus.rendus, bus.depots (réponses rendues), bus.puts (reçus), bus.file.
//   bus.fixer({ mode }) : { statutA: { rang, statut } } (la n-ième requête reçoit ce statut), { tout401: true },
//     { enPause: true }, { depot507: true }, { putEchecs: { <nom>: n } } (les n premiers PUT de ce fichier → 500),
//     { putRangEchec: k } (le k-ième fichier PUT distinct échoue toujours).
import http from 'node:http'
import crypto from 'node:crypto'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')

export async function demarrerFauxBusUsine({ jeton, taches = [], entrees = {}, contrat }) {
  const L = contrat.limites.livraison
  const NOM = new RegExp(contrat.nom_fichier.expression)
  const requetes = [], rendus = [], depots = [], puts = [], evenements = []
  const file = [...taches]
  const prises = new Map() // id → tâche prise (sous bail)
  const signes = new Map() // jeton d'URL → { genre: 'entree'|'depot', tache, nom, octets?, type?, sha256? }
  const stockage = new Map() // 'usine/<tache>/sortie/<nom>' → { octets: Buffer, type }
  const mode = {}
  const putsParNom = new Map()
  const ordrePut = []
  let rang = 0
  const serveur = http.createServer((req, res) => {
    const morceaux = []
    req.on('data', (d) => morceaux.push(d))
    req.on('end', () => {
      const brut = Buffer.concat(morceaux)
      const u = new URL(req.url, 'http://127.0.0.1')
      const h = String(req.headers.authorization || '')
      const auth = !h ? 'absent' : h === `Bearer ${jeton}` ? 'ok' : 'autre'
      const r = { rang: ++rang, le: new Date().toISOString(), methode: req.method, chemin: u.pathname.replace(/\/stockage\/[^/]+$/, '/stockage/<jeton>'), route: null, statut: null, auth }
      requetes.push(r)
      const repondre = (statut, corps, type = 'application/json') => {
        r.statut = statut
        const t = corps === undefined ? '' : type === 'application/json' ? JSON.stringify(corps) : corps
        res.writeHead(statut, { 'content-type': type, 'content-length': Buffer.byteLength(t) })
        res.end(t)
      }
      const refus = (statut, error, champ) => repondre(statut, champ ? { error, champ } : { error })
      // ── le stockage d'essai (URL signées) ──
      const st = /^\/stockage\/([A-Za-z0-9_-]+)$/.exec(u.pathname)
      if (st) {
        r.route = req.method === 'GET' ? 'stockage:lire' : 'stockage:deposer'
        if (h) r.bearerStockage = auth // le jeton de l'agent n'a rien à faire ici
        const s = signes.get(st[1])
        if (!s) return refus(404, 'url_inconnue')
        if (req.method === 'GET') {
          if (s.genre !== 'entree') return refus(403, 'url_de_depot')
          const e = (entrees[s.tache] || []).find((x) => x.nom === s.nom)
          r.corps = { nom: s.nom }
          res.writeHead(200, { 'content-type': e.type, 'content-length': e.octets.length }); r.statut = 200
          return res.end(e.octets)
        }
        if (req.method !== 'PUT' || s.genre !== 'depot') return refus(405, 'methode')
        const type = String(req.headers['content-type'] || '')
        r.corps = { nom: s.nom, octets: brut.length, sha256: sha256(brut), type }
        const n = (putsParNom.get(s.nom) || 0) + 1
        putsParNom.set(s.nom, n)
        if (!ordrePut.includes(s.nom)) ordrePut.push(s.nom)
        const echecs = mode.putEchecs?.[s.nom] || 0
        if (n <= echecs) return refus(500, 'stockage_en_erreur_essai')
        if (mode.putRangEchec && ordrePut.indexOf(s.nom) + 1 === mode.putRangEchec) return refus(503, 'stockage_en_erreur_essai')
        puts.push({ tache: s.tache, nom: s.nom, octets: brut, type, sha256: sha256(brut), attendu: { octets: s.octets, type: s.type, sha256: s.sha256 } })
        stockage.set(`usine/${s.tache}/sortie/${s.nom}`, { octets: brut, type })
        return repondre(200, { Key: `usine/${s.tache}/sortie/${s.nom}` })
      }
      // ── le bus ──
      r.route = u.pathname
      if (mode.tout401 || auth !== 'ok') return refus(401, 'Jeton d’agent refusé.')
      if (mode.statutA && mode.statutA.rang === r.rang) return refus(mode.statutA.statut, mode.statutA.statut === 429 ? 'Trop de requêtes.' : 'Erreur du bus (mode du juge).')
      if (req.method !== 'POST') return refus(405, 'methode')
      let corps = null
      if (brut.length) { try { corps = JSON.parse(brut.toString('utf8')) } catch { return refus(400, 'JSON invalide.') } }
      r.corps = corps
      const obj = corps && typeof corps === 'object' && !Array.isArray(corps)
      const cles = (permis) => (obj ? Object.keys(corps).find((k) => !permis.includes(k)) : null)
      if (u.pathname === '/api/agents/battement') return repondre(200, { ok: true })
      if (u.pathname === '/api/agents/taches/prendre') {
        if (mode.enPause) return repondre(423, contrat.bus.en_pause.corps)
        const t = file.shift() || null
        if (t) prises.set(t.id, t)
        return repondre(200, { tache: t })
      }
      const rd = /^\/api\/agents\/taches\/([^/]+)\/rendre$/.exec(u.pathname)
      if (rd) {
        if (!obj) return refus(400, 'Un objet JSON attendu.')
        const inconnue = cles(['resultat', 'preuve_url', 'erreur']); if (inconnue) return refus(400, 'champ inconnu', inconnue)
        if (!['faite', 'echec'].includes(corps.resultat)) return refus(400, 'resultat : faite ou echec.', 'resultat')
        if (corps.preuve_url !== undefined && corps.preuve_url !== null && typeof corps.preuve_url !== 'string') return refus(400, 'preuve_url : un texte.', 'preuve_url')
        if (corps.erreur !== undefined && corps.erreur !== null && (typeof corps.erreur !== 'string' || corps.erreur.length > 500)) return refus(400, 'erreur : un texte de 500 signes au plus.', 'erreur')
        if (corps.resultat === 'faite' && !/^supabase:\/\//.test(corps.preuve_url || '')) return repondre(400, { error: 'Refusé par le bus.', code: 'preuve' })
        if (!prises.has(rd[1])) return repondre(409, { error: 'Refusé par le bus.', code: 'bail_perdu' })
        prises.delete(rd[1])
        rendus.push({ tache: rd[1], ...corps })
        return repondre(200, { statut: corps.resultat === 'faite' ? 'faite' : 'file' })
      }
      if (u.pathname === '/api/agents/evenements') {
        if (!obj || typeof corps.type !== 'string' || typeof corps.resume !== 'string' || corps.resume.length > 200) return refus(400, 'événement invalide')
        const inconnue = cles(['type', 'objet', 'resume', 'tache']); if (inconnue) return refus(400, 'champ inconnu', inconnue)
        evenements.push(corps)
        return repondre(201, { id: evenements.length })
      }
      if (u.pathname === '/api/agents/usine/entree') {
        if (!obj || !UUID.test(String(corps.tache)) || cles(['tache'])) return refus(400, 'tache : un uuid.')
        if (!prises.has(corps.tache)) return refus(404, 'tache_introuvable')
        const liste = (entrees[corps.tache] || []).map((e) => {
          const j = crypto.randomBytes(18).toString('base64url')
          signes.set(j, { genre: 'entree', tache: corps.tache, nom: e.nom })
          return { nom: e.nom, url: `http://127.0.0.1:${serveur.address().port}/stockage/${j}`, octets: e.octets.length }
        })
        if (liste.length > L.entrees_max) return refus(409, 'trop_d_entrees')
        return repondre(200, { tache: corps.tache, entrees: liste })
      }
      if (u.pathname === '/api/agents/usine/depot') {
        if (!obj || !UUID.test(String(corps.tache)) || !Array.isArray(corps.fichiers) || cles(['tache', 'fichiers'])) return refus(400, 'corps : { tache, fichiers }.')
        if (brut.length > contrat.routes.corps_max_octets) return refus(413, 'Corps trop grand (16 Ko au plus).')
        if (!prises.has(corps.tache)) return refus(404, 'tache_introuvable')
        const f = corps.fichiers
        if (!f.length) return refus(400, 'aucun_fichier')
        if (f.length > L.fichiers_max) return refus(413, 'trop_de_fichiers')
        const vus = new Set()
        let total = 0
        for (const x of f) {
          if (!x || typeof x !== 'object' || Object.keys(x).sort().join(',') !== 'nom,octets,sha256,type') return refus(400, 'fichier : { nom, octets, type, sha256 }')
          if (!Number.isInteger(x.octets) || x.octets <= 0) return refus(400, 'octets')
          if (x.octets > L.octets_fichier_max) return refus(413, 'fichier_trop_gros')
          total += x.octets
          if (!L.types.includes(x.type)) return refus(400, 'type')
          if (typeof x.nom !== 'string' || !NOM.test(x.nom) || x.nom.includes('..') || x.nom.includes('//')) return refus(400, 'nom')
          if (vus.has(x.nom)) return refus(400, 'nom_en_double')
          vus.add(x.nom)
          if (!/^[0-9a-f]{64}$/.test(String(x.sha256))) return refus(400, 'sha256')
        }
        if (total > L.octets_total_max) return refus(413, 'total_trop_gros')
        if (mode.depot507) return refus(507, 'stockage')
        const liste = f.map((x) => {
          const j = crypto.randomBytes(18).toString('base64url')
          signes.set(j, { genre: 'depot', tache: corps.tache, nom: x.nom, octets: x.octets, type: x.type, sha256: x.sha256 })
          return { nom: x.nom, url: `http://127.0.0.1:${serveur.address().port}/stockage/${j}`, jeton: j }
        })
        depots.push({ tache: corps.tache, fichiers: f, reponse: liste })
        return repondre(200, { depots: liste })
      }
      return refus(404, `route inconnue du faux bus : ${u.pathname}`)
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  let ferme = false
  return {
    url: `http://127.0.0.1:${serveur.address().port}`,
    requetes, rendus, depots, puts, evenements, stockage, file, signes,
    compter: (route) => requetes.filter((x) => x.route === route).length,
    fixer: (m) => Object.assign(mode, m),
    fermer: () => (ferme ? Promise.resolve() : new Promise((ok) => { ferme = true; serveur.closeAllConnections?.(); serveur.close(() => ok()) })),
  }
}
