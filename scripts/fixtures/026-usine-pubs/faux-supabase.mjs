// Un faux Supabase pour usine-pubs-qa (026-199) : PostgREST (tables et RPC) ET stockage, sur 127.0.0.1, que le VRAI client
// @supabase/supabase-js du code jugé interroge. Chaque appel est consigné AVANT d'être jugé ; le juge COMPTE ce qui est arrivé,
// il ne croit jamais ce que le code dit avoir fait.
//
//   demarrerFauxSupabase({ tables, rpcs, fonctions, objets, compteur }) → { url, appels, tables, rpcs, objets, etat, fautes(), arreter() }
//     tables     { <table>: lignes[] } : lues, filtrées (eq neq gt gte lt lte is in like ilike not. or, chemins json a->>b), triées, limitées,
//                insérées (POST), modifiées (PATCH), effacées (DELETE) comme PostgREST le ferait ; une table absente → 404 42P01 ;
//     rpcs       { <fonction>: valeur | (params, appel) => ({ status, body }) | valeur } lus à CHAQUE requête ;
//     fonctions  { <fonction>: { params: [[nom, type]…] } } : le contrat (contrat-ops.json et les fonctions du juge) : une fonction absente
//                → 404 PGRST202 (faute « fonction »), un paramètre inconnu ou manquant → 400 (faute « parametres »), une valeur
//                qui ne se convertit pas dans son type → 400 22P02 (faute « type ») ;
//     objets     Map '<bucket>/<chemin>' → { octets: Buffer, type } : ce que le stockage sert, liste et accepte de signer ;
//     etat       { stockage: null | 'erreur' } : le juge peut faire tomber le stockage (500 sur tout appel).
//   Stockage (storage-js 2.x) : sign (un chemin ou plusieurs), upload/sign, list, bucket, téléchargement authentifié, GET d'une adresse
//   signée (octets), PUT d'une adresse de dépôt signée (octets rangés dans `objets`, jamais ailleurs).
//   Chaque appel : { rang, genre: 'table' | 'rpc' | 'stockage', … , statut, faute? }.
import http from 'node:http'
import crypto from 'node:crypto'
import { convertible } from '../../lib/faux-postgrest.mjs'

const JSON_PATH = /->>|->/
function valeurDe(ligne, cle) {
  const morceaux = cle.split(JSON_PATH)
  let v = ligne?.[morceaux[0]]
  for (const k of morceaux.slice(1)) v = v && typeof v === 'object' ? v[k] : undefined
  if (/->>/.test(cle) && v !== undefined && v !== null && typeof v === 'object') return JSON.stringify(v)
  if (/->>/.test(cle) && v !== undefined && v !== null) return String(v)
  return v === undefined ? null : v
}
const nombre = (x) => (typeof x === 'number' ? x : typeof x === 'string' && /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : null)
const date = (x) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x) && Number.isFinite(Date.parse(x)) ? Date.parse(x) : null)
function comparer(a, b) {
  const na = nombre(a), nb = nombre(b)
  if (na !== null && nb !== null) return na - nb
  const da = date(a), db = date(b)
  if (da !== null && db !== null) return da - db
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}
function condition(ligne, cle, expr) {
  let negation = false, e = expr
  if (e.startsWith('not.')) { negation = true; e = e.slice(4) }
  const i = e.indexOf('.')
  const op = e.slice(0, i), val = e.slice(i + 1)
  const v = valeurDe(ligne, cle)
  let r
  if (op === 'is') r = val === 'null' ? v === null : val === 'true' ? v === true : val === 'false' ? v === false : false
  else if (op === 'in') r = val.replace(/^\(|\)$/g, '').split(',').map((x) => x.trim().replace(/^"|"$/g, '')).some((x) => String(v) === x)
  else if (op === 'eq') r = v !== null && (String(v) === val || (nombre(v) !== null && nombre(v) === nombre(val)))
  else if (op === 'neq') r = v === null ? true : !(String(v) === val)
  else if (op === 'gt') r = v !== null && comparer(v, val) > 0
  else if (op === 'gte') r = v !== null && comparer(v, val) >= 0
  else if (op === 'lt') r = v !== null && comparer(v, val) < 0
  else if (op === 'lte') r = v !== null && comparer(v, val) <= 0
  else if (op === 'like' || op === 'ilike') r = v !== null && new RegExp(`^${val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[*%]/g, '.*')}$`, op === 'ilike' ? 'i' : '').test(String(v))
  else r = false
  return negation ? !r : r
}
function filtrer(lignes, requete) {
  const reserves = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict', 'or', 'and'])
  return lignes.filter((l) => {
    for (const [cle, expr] of Object.entries(requete)) {
      if (reserves.has(cle)) continue
      if (!condition(l, cle, expr)) return false
    }
    if (requete.or) {
      const interieur = requete.or.replace(/^\(|\)$/g, '')
      if (!interieur.split(',').some((c) => { const m = /^([^.]+)\.(.*)$/.exec(c); return m ? condition(l, m[1], m[2]) : false })) return false
    }
    return true
  })
}
function trier(lignes, order) {
  if (!order) return lignes
  const cles = order.split(',').map((o) => { const [col, sens = 'asc'] = o.split('.'); return { col, dir: sens === 'desc' ? -1 : 1 } })
  return [...lignes].sort((a, b) => { for (const { col, dir } of cles) { const c = comparer(valeurDe(a, col) ?? '', valeurDe(b, col) ?? ''); if (c) return c * dir } return 0 })
}
function projeter(l, select) {
  if (!select || select === '*') return structuredClone(l)
  const o = {}
  for (const c of select.split(',').map((x) => x.trim()).filter(Boolean)) if (!c.includes('(')) o[c] = l[c] === undefined ? null : structuredClone(l[c])
  return o
}

export async function demarrerFauxSupabase({ tables = {}, rpcs = {}, fonctions = {}, objets = new Map(), compteur = null } = {}) {
  const appels = []
  let rangLocal = 0
  const rang = () => (typeof compteur === 'function' ? compteur() : ++rangLocal)
  const etat = { stockage: null }
  const jetons = new Map() // jeton → { genre: 'lecture' | 'depot', bucket, chemin }
  const serveur = http.createServer((req, res) => {
    const morceaux = []
    req.on('data', (d) => morceaux.push(d))
    req.on('end', () => {
      const brut = Buffer.concat(morceaux)
      const repondre = (status, body, appel, entetes = {}) => {
        if (appel) appel.statut = status
        const octets = Buffer.isBuffer(body) ? body : Buffer.from(body === undefined ? '' : JSON.stringify(body))
        res.writeHead(status, { 'content-type': Buffer.isBuffer(body) ? (entetes['content-type'] || 'application/octet-stream') : 'application/json; charset=utf-8', 'content-length': octets.length, ...entetes })
        res.end(req.method === 'HEAD' ? undefined : octets)
      }
      const u = new URL(req.url, 'http://127.0.0.1')
      const requete = Object.fromEntries(u.searchParams)
      let json = null
      if (brut.length && /json/i.test(String(req.headers['content-type'] || ''))) { try { json = JSON.parse(brut.toString('utf8')) } catch { json = undefined } }
      const preferer = String(req.headers.prefer || ''), accept = String(req.headers.accept || '')

      // ── RPC ──
      const rpc = /^\/rest\/v1\/rpc\/([A-Za-z0-9_.]+)$/.exec(u.pathname)
      if (rpc) {
        let params = {}
        try { params = brut.length ? JSON.parse(brut.toString('utf8')) : {} } catch { params = undefined }
        const appel = { rang: rang(), genre: 'rpc', methode: req.method, fonction: rpc[1], params: params ?? null, statut: null }
        appels.push(appel)
        if (req.method !== 'POST') { appel.faute = 'methode'; return repondre(405, { code: 'PGRST117', message: 'méthode' }, appel) }
        if (params === undefined || params === null || typeof params !== 'object' || Array.isArray(params)) { appel.faute = 'corps'; return repondre(400, { code: 'PGRST102', message: 'Empty or invalid json' }, appel) }
        const f = fonctions[rpc[1]]
        if (!f && !(rpc[1] in rpcs)) { appel.faute = 'fonction'; return repondre(404, { code: 'PGRST202', message: `Could not find the function public.${rpc[1]} in the schema cache`, details: 'absente du contrat du juge', hint: null }, appel) }
        if (f) {
          const noms = f.params.map(([n]) => n)
          const inconnus = Object.keys(params).filter((k) => !noms.includes(k)), manquants = noms.filter((n) => !(n in params))
          if (inconnus.length || manquants.length) { appel.faute = 'parametres'; return repondre(400, { code: 'PGRST202', message: `paramètres : inconnus ${inconnus.join(',') || '—'} ; manquants ${manquants.join(',') || '—'}`, details: null, hint: null }, appel) }
          const mauvais = f.params.filter(([n, t]) => !convertible(params[n], t))
          if (mauvais.length) { appel.faute = 'type'; return repondre(400, { code: '22P02', message: `invalid input syntax for type ${mauvais[0][1]} (${mauvais[0][0]})`, details: null, hint: null }, appel) }
        }
        const r = rpcs[rpc[1]]
        let x
        try { x = typeof r === 'function' ? r(params, appel) : { status: 200, body: r ?? null } } catch (e) { x = { status: 500, body: { code: 'XX000', message: e.message } } }
        if (!x || typeof x !== 'object' || typeof x.status !== 'number') x = { status: 200, body: x ?? null }
        return repondre(x.status, x.body ?? null, appel)
      }

      // ── tables ──
      const table = /^\/rest\/v1\/([A-Za-z0-9_]+)$/.exec(u.pathname)
      if (table) {
        const appel = { rang: rang(), genre: 'table', methode: req.method, table: table[1], requete, corps: json ?? null, statut: null }
        appels.push(appel)
        const lignes = tables[table[1]]
        if (!Array.isArray(lignes)) return repondre(404, { code: '42P01', message: `relation "public.${table[1]}" does not exist`, details: null, hint: null }, appel)
        const objet = /vnd\.pgrst\.object/.test(accept)
        const rendre = (rows, status = 200) => {
          appel.lignes = rows.length
          const sortie = rows.map((l) => projeter(l, requete.select))
          if (objet) { if (sortie.length !== 1) return repondre(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `${sortie.length} lignes`, hint: null }, appel); return repondre(status, sortie[0], appel) }
          return repondre(status, sortie, appel)
        }
        if (req.method === 'GET') {
          let rows = trier(filtrer(lignes, requete), requete.order)
          const depart = Number(requete.offset || 0)
          rows = rows.slice(depart, requete.limit ? depart + Number(requete.limit) : undefined)
          return rendre(rows)
        }
        if (req.method === 'POST') {
          if (json === undefined || json === null) { appel.faute = 'corps'; return repondre(400, { code: 'PGRST102', message: 'Empty or invalid json' }, appel) }
          const neuves = (Array.isArray(json) ? json : [json]).map((x) => structuredClone(x))
          lignes.push(...neuves)
          return /return=representation/.test(preferer) ? rendre(neuves, 201) : repondre(201, undefined, appel)
        }
        if (req.method === 'PATCH') {
          if (json === undefined || json === null || typeof json !== 'object') { appel.faute = 'corps'; return repondre(400, { code: 'PGRST102', message: 'Empty or invalid json' }, appel) }
          const cibles = filtrer(lignes, requete)
          for (const l of cibles) Object.assign(l, structuredClone(json))
          return /return=representation/.test(preferer) ? rendre(cibles) : (appel.lignes = cibles.length, repondre(204, undefined, appel))
        }
        if (req.method === 'DELETE') {
          const cibles = new Set(filtrer(lignes, requete))
          for (let i = lignes.length - 1; i >= 0; i--) if (cibles.has(lignes[i])) lignes.splice(i, 1)
          appel.lignes = cibles.size
          return repondre(204, undefined, appel)
        }
        return repondre(405, { code: 'PGRST117', message: 'méthode' }, appel)
      }

      // ── stockage ──
      if (u.pathname.startsWith('/storage/v1/')) {
        const reste = decodeURIComponent(u.pathname.slice('/storage/v1/'.length))
        const appel = { rang: rang(), genre: 'stockage', methode: req.method, chemin_http: reste.split('?')[0], params: json ?? null, statut: null }
        appels.push(appel)
        if (etat.stockage === 'erreur') return repondre(500, { statusCode: '500', error: 'internal', message: 'stockage en erreur (mode du juge)' }, appel)
        const bucketChemin = (s) => { const i = s.indexOf('/'); return i < 0 ? { bucket: s, chemin: '' } : { bucket: s.slice(0, i), chemin: s.slice(i + 1) } }
        let m
        // adresse de lecture signée (GET) : octets
        if ((m = /^object\/sign\/(.+)$/.exec(reste)) && req.method === 'GET') {
          const { bucket, chemin } = bucketChemin(m[1])
          appel.action = 'lire_signe'; appel.bucket = bucket; appel.chemin = chemin
          const j = jetons.get(requete.token)
          if (!j || j.genre !== 'lecture' || j.bucket !== bucket || j.chemin !== chemin) return repondre(400, { statusCode: '400', error: 'invalid_jwt', message: 'jeton invalide' }, appel)
          const o = objets.get(`${bucket}/${chemin}`)
          return o ? repondre(200, o.octets, appel, { 'content-type': o.type || 'application/octet-stream' }) : repondre(404, { statusCode: '404', error: 'not_found', message: 'Object not found' }, appel)
        }
        // jeton de dépôt (POST sans jeton : createSignedUploadUrl) puis dépôt par adresse signée (PUT, ou POST avec jeton) : octets rangés
        if ((m = /^object\/upload\/sign\/(.+)$/.exec(reste))) {
          const { bucket, chemin } = bucketChemin(m[1])
          if (req.method === 'POST' && !requete.token) {
            appel.action = 'signer_depot'; appel.bucket = bucket; appel.chemin = chemin
            const t = crypto.randomBytes(18).toString('base64url'); jetons.set(t, { genre: 'depot', bucket, chemin }); appel.jeton = t
            return repondre(200, { url: `/object/upload/sign/${bucket}/${chemin}?token=${t}` }, appel)
          }
          if (req.method === 'PUT' || req.method === 'POST') {
            appel.action = 'deposer_signe'; appel.bucket = bucket; appel.chemin = chemin; appel.octets = brut.length
            const j = jetons.get(requete.token)
            if (!j || j.genre !== 'depot' || j.bucket !== bucket || j.chemin !== chemin) return repondre(400, { statusCode: '400', error: 'invalid_jwt', message: 'jeton de dépôt invalide' }, appel)
            objets.set(`${bucket}/${chemin}`, { octets: brut, type: String(req.headers['content-type'] || 'application/octet-stream') })
            return repondre(200, { Key: `${bucket}/${chemin}` }, appel)
          }
          return repondre(405, { message: 'méthode' }, appel)
        }
        // signature (un chemin, ou plusieurs : POST object/sign/<bucket>)
        if ((m = /^object\/sign\/(.+)$/.exec(reste)) && req.method === 'POST') {
          const { bucket, chemin } = bucketChemin(m[1])
          if (Array.isArray(json?.paths)) {
            appel.action = 'signer_plusieurs'; appel.bucket = bucket; appel.chemins = json.paths; appel.expiresIn = json.expiresIn ?? null; appel.jetons = []
            return repondre(200, json.paths.map((p) => {
              if (!objets.has(`${bucket}/${p}`)) return { path: p, signedURL: null, error: 'Object not found' }
              const t = crypto.randomBytes(18).toString('base64url'); jetons.set(t, { genre: 'lecture', bucket, chemin: p }); appel.jetons.push(t)
              return { path: p, signedURL: `/object/sign/${bucket}/${p}?token=${t}`, error: null }
            }), appel)
          }
          appel.action = 'signer'; appel.bucket = bucket; appel.chemin = chemin; appel.expiresIn = json?.expiresIn ?? null
          if (!objets.has(`${bucket}/${chemin}`)) return repondre(400, { statusCode: '404', error: 'not_found', message: 'Object not found' }, appel)
          const t = crypto.randomBytes(18).toString('base64url'); jetons.set(t, { genre: 'lecture', bucket, chemin }); appel.jeton = t
          return repondre(200, { signedURL: `/object/sign/${bucket}/${chemin}?token=${t}` }, appel)
        }
        // téléchargement authentifié (storage-js download / exists / info)
        if ((m = /^object\/(?:authenticated\/|info\/)?(.+)$/.exec(reste)) && (req.method === 'GET' || req.method === 'HEAD')) {
          const { bucket, chemin } = bucketChemin(m[1])
          appel.action = 'telecharger'; appel.bucket = bucket; appel.chemin = chemin
          const o = objets.get(`${bucket}/${chemin}`)
          return o ? repondre(200, o.octets, appel, { 'content-type': o.type || 'application/octet-stream' }) : repondre(404, { statusCode: '404', error: 'not_found', message: 'Object not found' }, appel)
        }
        // liste d'un bucket
        if ((m = /^object\/list\/(.+)$/.exec(reste)) && req.method === 'POST') {
          const bucket = m[1]
          const prefixe = String(json?.prefix ?? '').replace(/\/+$/, '')
          appel.action = 'lister'; appel.bucket = bucket; appel.prefixe = prefixe
          const liste = []
          for (const [cle, o] of objets) {
            if (!cle.startsWith(`${bucket}/`)) continue
            const rel = cle.slice(bucket.length + 1)
            if (!rel.startsWith(prefixe ? `${prefixe}/` : '')) continue
            const nom = rel.slice(prefixe ? prefixe.length + 1 : 0)
            if (nom.includes('/')) continue
            liste.push({ name: nom, id: crypto.createHash('md5').update(cle).digest('hex'), metadata: { size: o.octets.length, mimetype: o.type } })
          }
          return repondre(200, liste, appel)
        }
        if (reste === 'bucket' && req.method === 'GET') { appel.action = 'buckets'; return repondre(200, [...new Set([...objets.keys()].map((k) => k.split('/')[0]))].map((name) => ({ name, id: name })), appel) }
        return repondre(404, { statusCode: '404', error: 'not_found', message: `point inconnu du faux stockage : ${req.method} ${u.pathname}` }, appel)
      }
      return repondre(404, { message: `chemin inconnu du faux Supabase : ${u.pathname}` })
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  let ferme = false
  return {
    url: `http://127.0.0.1:${serveur.address().port}`,
    appels, tables, rpcs, objets, etat, jetons,
    fautes: () => appels.filter((a) => a.faute),
    arreter: () => (ferme ? Promise.resolve() : new Promise((ok) => { ferme = true; serveur.closeAllConnections?.(); serveur.close(() => ok()) })),
  }
}
