// scripts/fixtures/026/usine-production/faux-stockage-supabase.mjs — un faux Supabase (RPC + stockage) pour le juge des routes
// de l'usine (usine-routes-qa.mjs, 026-052), écrit par Claude Code. scripts/lib/faux-postgrest.mjs (026-038) n'accepte pas de
// gestionnaire en plus : ce serveur sert donc les RPC utiles aux routes (celles de authAgent, ops_tache_detenue,
// ops_stockage_octets), jugées au contrat comme le ferait PostgREST (types de faux-postgrest.mjs), ET les points storage/v1
// que le vrai client @supabase/storage-js appelle. Chaque appel est consigné AVANT d'être jugé.
//
//   demarrerFauxSupabase({ fonctions, reponses, objets, compteur }) → { url, appels, reponses, objets, fautes(), fixer(), arreter() }
//     fonctions  { <nom>: { params: [[nom, type]…] } } : une fonction absente → 404 PGRST202 (faute « fonction ») ; un paramètre
//                inconnu ou manquant → 400 (faute « parametres ») ; une valeur hors type → 400 22P02 (faute « type ») ;
//     reponses   { <fonction>: valeur | (params) => ({ status, body }) }, lu à chaque requête ;
//     objets     Map '<bucket>/<chemin>' → { octets, type } : ce que « list » voit et ce que « sign » accepte de signer.
//   Stockage (storage-js 2.x) :
//     POST /storage/v1/object/list/<bucket>            { prefix, limit, offset } → [{ name, id, metadata: { size, mimetype } }]
//     POST /storage/v1/object/sign/<bucket>/<chemin>   { expiresIn } → { signedURL: '/object/sign/…?token=<t>' } (objet inconnu : 400)
//     POST /storage/v1/object/upload/sign/<bucket>/<chemin> → { url: '/object/upload/sign/…?token=<t>' }
//   Chaque appel : { rang, genre: 'rpc' | 'stockage', fonction | action, bucket, chemin, params, expiresIn, jeton, statut, faute }.
//   fixer({ stockage: 'erreur' }) : tout appel au stockage rend 500 (il est consigné quand même).
import http from 'node:http'
import crypto from 'node:crypto'
import { convertible } from '../../../lib/faux-postgrest.mjs'

export async function demarrerFauxSupabase({ fonctions = {}, reponses = {}, objets = new Map(), compteur = null } = {}) {
  const appels = []
  let rangLocal = 0
  const rang = () => (typeof compteur === 'function' ? compteur() : ++rangLocal)
  const mode = { stockage: null }
  const serveur = http.createServer((req, res) => {
    const morceaux = []
    req.on('data', (d) => morceaux.push(d))
    req.on('end', () => {
      const corps = Buffer.concat(morceaux).toString('utf8')
      const repondre = (status, body, appel) => {
        if (appel) appel.statut = status
        const t = body === undefined ? '' : JSON.stringify(body)
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(t) })
        res.end(t)
      }
      const u = new URL(req.url, 'http://127.0.0.1')
      let json = null
      try { json = corps ? JSON.parse(corps) : {} } catch { json = undefined }
      const rpc = /^\/rest\/v1\/rpc\/([A-Za-z0-9_.]+)$/.exec(u.pathname)
      if (rpc) {
        const appel = { rang: rang(), genre: 'rpc', fonction: rpc[1], params: json ?? null, statut: null }
        appels.push(appel)
        if (req.method !== 'POST') { appel.faute = 'methode'; return repondre(405, { code: 'PGRST117', message: 'méthode' }, appel) }
        if (json === undefined) { appel.faute = 'corps'; return repondre(400, { code: 'PGRST102', message: 'Empty or invalid json' }, appel) }
        const f = fonctions[rpc[1]]
        if (!f) { appel.faute = 'fonction'; return repondre(404, { code: 'PGRST202', message: `Could not find the function public.${rpc[1]} in the schema cache` }, appel) }
        const noms = f.params.map(([n]) => n)
        const inconnus = Object.keys(json).filter((k) => !noms.includes(k)), manquants = noms.filter((n) => !(n in json))
        if (inconnus.length || manquants.length) { appel.faute = 'parametres'; return repondre(400, { code: 'PGRST202', message: `paramètres : inconnus ${inconnus.join(',') || '—'} ; manquants ${manquants.join(',') || '—'}` }, appel) }
        const mauvais = f.params.filter(([n, t]) => !convertible(json[n], t))
        if (mauvais.length) { appel.faute = 'type'; return repondre(400, { code: '22P02', message: `invalid input syntax for type ${mauvais[0][1]} (${mauvais[0][0]})` }, appel) }
        const r = reponses[rpc[1]]
        let x
        try { x = typeof r === 'function' ? r(json, appel) : { status: 200, body: r ?? null } } catch (e) { x = { status: 500, body: { code: 'XX000', message: e.message } } }
        if (!x || typeof x.status !== 'number') x = { status: 200, body: x ?? null }
        return repondre(x.status, x.body ?? null, appel)
      }
      const st = /^\/storage\/v1\/object\/(list|sign|upload\/sign)\/(.+)$/.exec(u.pathname)
      if (u.pathname.startsWith('/storage/v1/')) {
        const action = st ? { list: 'list', sign: 'sign', 'upload/sign': 'upload' }[st[1]] : 'inconnue'
        const reste = st ? decodeURIComponent(st[2]) : ''
        const bucket = action === 'list' ? reste : reste.split('/')[0]
        const chemin = action === 'list' ? null : reste.split('/').slice(1).join('/')
        const appel = { rang: rang(), genre: 'stockage', action, bucket, chemin, params: json ?? null, expiresIn: json?.expiresIn ?? null, statut: null }
        appels.push(appel)
        if (!st || req.method !== 'POST') { appel.faute = 'stockage_inconnu'; return repondre(404, { statusCode: '404', error: 'not_found', message: `point inconnu du faux stockage : ${req.method} ${u.pathname}` }, appel) }
        if (mode.stockage === 'erreur') return repondre(500, { statusCode: '500', error: 'internal', message: 'stockage en erreur (mode du juge)' }, appel)
        if (action === 'list') {
          const prefixe = String(json?.prefix ?? '').replace(/\/+$/, '')
          appel.prefixe = prefixe
          const limite = Number.isInteger(json?.limit) ? json.limit : 100, depart = Number.isInteger(json?.offset) ? json.offset : 0
          const liste = []
          for (const [cle, o] of objets) {
            if (!cle.startsWith(`${bucket}/`)) continue
            const rel = cle.slice(bucket.length + 1)
            if (!rel.startsWith(prefixe ? `${prefixe}/` : '')) continue
            const nom = rel.slice(prefixe ? prefixe.length + 1 : 0)
            if (nom.includes('/')) continue // un sous-dossier : storage-js le rendrait comme dossier, sans métadonnées
            liste.push({ name: nom, id: crypto.createHash('md5').update(cle).digest('hex'), updated_at: '2026-09-27T08:00:00Z', created_at: '2026-09-27T08:00:00Z', last_accessed_at: null, metadata: { size: o.octets, mimetype: o.type } })
          }
          liste.sort((a, b) => a.name.localeCompare(b.name))
          appel.rendus = Math.min(Math.max(liste.length - depart, 0), limite)
          return repondre(200, liste.slice(depart, depart + limite), appel)
        }
        const jeton = crypto.randomBytes(18).toString('base64url')
        appel.jeton = jeton
        if (action === 'sign') {
          if (!objets.has(`${bucket}/${chemin}`)) return repondre(400, { statusCode: '404', error: 'not_found', message: 'Object not found' }, appel)
          return repondre(200, { signedURL: `/object/sign/${bucket}/${chemin}?token=${jeton}` }, appel)
        }
        return repondre(200, { url: `/object/upload/sign/${bucket}/${chemin}?token=${jeton}` }, appel)
      }
      return repondre(404, { message: `chemin inconnu du faux Supabase : ${u.pathname}` })
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  let ferme = false
  return {
    url: `http://127.0.0.1:${serveur.address().port}`,
    appels, reponses, objets,
    fautes: () => appels.filter((a) => a.faute),
    fixer: (m) => Object.assign(mode, m),
    arreter: () => (ferme ? Promise.resolve() : new Promise((ok) => { ferme = true; serveur.closeAllConnections?.(); serveur.close(() => ok()) })),
  }
}
