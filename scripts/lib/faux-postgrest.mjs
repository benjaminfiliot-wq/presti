// scripts/lib/faux-postgrest.mjs — un faux PostgREST pour les juges des droits du bus (fiche 026-038), écrit par Claude Code.
// Un vrai serveur HTTP local (127.0.0.1, port libre) : le vrai client @supabase/supabase-js du code jugé lui parle comme à
// Supabase (NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port>), et chaque appel est consigné.
//
//   demarrer({ contrat, reponses, tables, compteur, port }) → Promise<{ url, appels, reponses, tables, fautes(), arreter() }>
//     contrat   scripts/fixtures/026-horloge-bus/contrat-ops.json lu (ou tout objet { fonctions: { <nom>: { params: [[nom, type]…] } } }) ;
//     reponses  { <fonction>: valeur | (params, appel) => ({ status, body }) } : lu À CHAQUE requête (l'objet rendu est le même :
//               un scénario peut le changer entre deux appels). Sans réponse déclarée : 200 et null ;
//     tables    { <table>: lignes[] | (requete) => ({ status, body }) } pour /rest/v1/<table> (lecture et écriture consignées) ;
//     compteur  () => number : le rang de chaque appel, partagé avec les doublures (l'ordre « journal, puis écriture ») ;
//     port      un port à reprendre (0 par défaut : le système en donne un libre).
//
// Ce que le serveur refuse, comme PostgREST refuserait (et le juge compte ces refus comme des fautes du code jugé) :
//   - /rest/v1/rpc/<f> d'une fonction absente du contrat → 404 PGRST202 ;
//   - un paramètre inconnu ou manquant (les fonctions du contrat n'ont aucun défaut) → 400 PGRST202, `faute: 'parametres'` ;
//   - une valeur qui ne se convertit pas dans le type du contrat (uuid, entier, booléen, date…) → 400 22P02, `faute: 'type'`.
// Chaque appel est consigné AVANT d'être jugé : { rang, methode, fonction | table, params, statut, faute? }.
//
// erreurOps('quota') rend la réponse d'un `raise exception 'ops:quota'` (400, P0001), erreurPg(message, code) une autre.
import http from 'node:http'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ENTIER = /^-?\d+$/
const NOMBRE = /^-?\d+(\.\d+)?$/

/** La valeur `v` se convertit-elle dans le type SQL `t` (comme PostgREST la passerait à Postgres) ? null passe toujours. */
export function convertible(v, t) {
  if (v === null) return true
  const x = String(t).toLowerCase().trim()
  if (x.endsWith('[]')) return Array.isArray(v) && v.every((e) => convertible(e, x.slice(0, -2)))
  if (/^(jsonb?|record)$/.test(x)) return v !== undefined
  if (/^(text|varchar|character varying|citext|name)/.test(x)) return typeof v === 'string'
  if (x === 'uuid') return typeof v === 'string' && UUID.test(v)
  if (/^(int|integer|bigint|smallint|int2|int4|int8)$/.test(x)) return Number.isInteger(v) || (typeof v === 'string' && ENTIER.test(v))
  if (/^(numeric|real|double|double precision|float|decimal)/.test(x)) return (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && NOMBRE.test(v))
  if (/^bool/.test(x)) return typeof v === 'boolean' || v === 'true' || v === 'false'
  if (/^(timestamptz|timestamp|date)/.test(x)) return typeof v === 'string' && Number.isFinite(Date.parse(v))
  return true
}

export const erreurOps = (code, status = 400) => ({ status, body: { code: 'P0001', message: `ops:${code}`, details: null, hint: null } })
export const erreurPg = (message, code = 'XX000', status = 400) => ({ status, body: { code, message, details: null, hint: null } })

export async function demarrer({ contrat, reponses = {}, tables = {}, compteur = null, port = 0 } = {}) {
  if (!contrat || typeof contrat.fonctions !== 'object') throw new TypeError('demarrer : contrat sans « fonctions »')
  const appels = []
  let rangLocal = 0
  const rang = () => (typeof compteur === 'function' ? compteur() : ++rangLocal)
  const serveur = http.createServer((req, res) => {
    let corps = ''
    req.setEncoding('utf8')
    req.on('data', (d) => { corps += d })
    req.on('end', () => {
      const repondre = (status, body, appel = null) => {
        if (appel) appel.statut = status
        const texte = body === undefined ? '' : JSON.stringify(body)
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(texte) })
        res.end(texte)
      }
      const u = new URL(req.url, 'http://127.0.0.1')
      const rpc = /^\/rest\/v1\/rpc\/([A-Za-z0-9_.]+)$/.exec(u.pathname)
      const table = /^\/rest\/v1\/([A-Za-z0-9_]+)$/.exec(u.pathname)
      if (rpc) {
        const appel = { rang: rang(), methode: req.method, fonction: rpc[1], params: null, statut: null }
        appels.push(appel)
        if (req.method !== 'POST') return repondre(405, { code: 'PGRST117', message: `méthode ${req.method} non servie par le faux PostgREST` }, appel)
        let params
        try { params = corps ? JSON.parse(corps) : {} } catch { appel.faute = 'corps'; return repondre(400, { code: 'PGRST102', message: 'Empty or invalid json', details: null, hint: null }, appel) }
        appel.params = params
        const f = contrat.fonctions[rpc[1]]
        if (!f) { appel.faute = 'fonction'; return repondre(404, { code: 'PGRST202', message: `Could not find the function public.${rpc[1]} in the schema cache`, details: 'absente du contrat', hint: null }, appel) }
        if (!params || typeof params !== 'object' || Array.isArray(params)) { appel.faute = 'parametres'; return repondre(400, { code: 'PGRST202', message: 'arguments : un objet attendu', details: null, hint: null }, appel) }
        const noms = f.params.map(([n]) => n)
        const inconnus = Object.keys(params).filter((k) => !noms.includes(k))
        const manquants = noms.filter((n) => !(n in params))
        if (inconnus.length || manquants.length) {
          appel.faute = 'parametres'
          return repondre(400, { code: 'PGRST202', message: `Could not find the function public.${rpc[1]}(${Object.keys(params).sort().join(', ')}) in the schema cache`, details: `inconnus : ${inconnus.join(', ') || '—'} ; manquants : ${manquants.join(', ') || '—'}`, hint: null }, appel)
        }
        const mauvais = f.params.filter(([n, t]) => !convertible(params[n], t))
        if (mauvais.length) {
          appel.faute = 'type'
          const [n, t] = mauvais[0]
          return repondre(400, { code: '22P02', message: `invalid input syntax for type ${t}: ${JSON.stringify(params[n])} (${n})`, details: null, hint: null }, appel)
        }
        const r = reponses[rpc[1]]
        let x
        try { x = typeof r === 'function' ? r(params, appel) : { status: 200, body: r ?? null } } catch (e) { x = { status: 500, body: { code: 'XX000', message: `réponse du scénario : ${e.message}` } } }
        if (!x || typeof x !== 'object' || typeof x.status !== 'number') x = { status: 200, body: x ?? null }
        return repondre(x.status, x.body ?? null, appel)
      }
      if (table) {
        const appel = { rang: rang(), methode: req.method, table: table[1], requete: Object.fromEntries(u.searchParams), params: null, statut: null }
        appels.push(appel)
        if (corps) { try { appel.params = JSON.parse(corps) } catch { appel.params = corps } }
        const t = tables[table[1]]
        if (t === undefined) return repondre(404, { code: '42P01', message: `relation "public.${table[1]}" does not exist`, details: null, hint: null }, appel)
        let x
        try { x = typeof t === 'function' ? t({ methode: req.method, requete: appel.requete, corps: appel.params, entetes: req.headers }) : { status: req.method === 'GET' ? 200 : 201, body: t } } catch (e) { x = { status: 500, body: { code: 'XX000', message: e.message } } }
        let body = x.body
        // .single() / .maybeSingle() de postgrest-js demandent un objet, pas une liste
        if (/vnd\.pgrst\.object/.test(String(req.headers.accept || '')) && Array.isArray(body)) {
          if (body.length !== 1) return repondre(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `${body.length} lignes`, hint: null }, appel)
          body = body[0]
        }
        return repondre(x.status ?? 200, body ?? null, appel)
      }
      return repondre(404, { code: 'PGRST125', message: `chemin inconnu du faux PostgREST : ${u.pathname}` })
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(port, '127.0.0.1', ok) })
  let ferme = false
  return {
    url: `http://127.0.0.1:${serveur.address().port}`,
    port: serveur.address().port,
    appels,
    reponses,
    tables,
    fautes: () => appels.filter((a) => a.faute),
    arreter: () => (ferme ? Promise.resolve() : new Promise((ok) => { ferme = true; serveur.closeAllConnections?.(); serveur.close(() => ok()) })),
  }
}
