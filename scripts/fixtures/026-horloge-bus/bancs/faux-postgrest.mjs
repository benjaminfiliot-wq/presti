// Banc du contrôle « faux-postgrest » de scripts/juges-026-horloge-bus-preuve.mjs (026-009). Lancé dans un processus à part
// (un module qui sortirait de lui-même en code 0 ne termine pas la preuve) : il importe le faux PostgREST à juger
// (BANC_MODULE), le démarre avec le contrat du bus (BANC_CONTRAT), et fait lui-même les appels, par http.request sans
// connexion gardée :
//   1. l'appel conforme au contrat de BANC_FONCTION → 2xx ;
//   2. le même appel, le paramètre BANC_DE renommé BANC_VERS → 400 ;
//   3. chaque appel est consigné dans `appels` (un de plus par appel, le nom de la fonction y paraît) ;
//   4. après arreter(), plus rien ne répond.
// Il rend sur sa dernière ligne « RESULTAT <BANC_NONCE> {defauts, …} ». BANC_SABOTAGE n'est passé qu'au témoin.
import fs from 'node:fs'
import http from 'node:http'
import { pathToFileURL } from 'node:url'

const E = process.env
// le jeton du résultat est lu puis ôté de l'environnement AVANT l'import du code jugé : il ne peut pas le recopier
const NONCE = E.BANC_NONCE
delete process.env.BANC_NONCE
const defauts = []
const fin = (o = {}) => { console.log(`RESULTAT ${NONCE} ${JSON.stringify({ defauts, ...o })}`); process.exit(0) }
const delai = (p, ms, quoi) => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(new Error(`${quoi} : plus de ${ms} ms`)), ms))])
const court = (t, n = 120) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

const contrat = JSON.parse(fs.readFileSync(E.BANC_CONTRAT, 'utf8'))
const F = E.BANC_FONCTION, DE = E.BANC_DE, VERS = E.BANC_VERS
const f = contrat.fonctions?.[F]
if (!f) { defauts.push(`${F} absente du contrat`); fin() }
if (!f.params.some(([n]) => n === DE)) { defauts.push(`${F} n'a pas de paramètre ${DE} au contrat`); fin() }
const valeur = (t) => {
  const x = String(t).toLowerCase()
  if (x.endsWith('[]')) return []
  if (/^(int|integer|bigint|smallint|numeric|real|double)/.test(x)) return 1
  if (/^bool/.test(x)) return true
  if (/^jsonb?$/.test(x)) return { essai: true }
  if (x === 'uuid') return '00000000-0000-4000-8000-000000000026'
  if (/^(timestamptz|timestamp|date)/.test(x)) return '2026-10-24T05:30:00Z'
  return 'essai_026'
}
const conforme = Object.fromEntries(f.params.map(([n, t]) => [n, valeur(t)]))
const fautif = Object.fromEntries(Object.entries(conforme).map(([k, v]) => [k === DE ? VERS : k, v]))

let mod
try { mod = await import(pathToFileURL(E.BANC_MODULE).href) } catch (e) { defauts.push(`import de ${E.BANC_MODULE_AFFICHE} : ${court(e.message)}`); fin() }
if (typeof mod.demarrer !== 'function') { defauts.push('demarrer n\'est pas exportée'); fin() }
const opts = { contrat, reponses: { [F]: [{ id: '00000000-0000-4000-8000-000000000027', creee: true }] } }
if (E.BANC_SABOTAGE) opts.sabotage = E.BANC_SABOTAGE
let srv
try { srv = await delai(Promise.resolve(mod.demarrer(opts)), 5000, 'demarrer') } catch (e) { defauts.push(`demarrer : ${court(e.message)}`); fin() }
if (!srv || typeof srv.url !== 'string' || !/^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+\/?$/.test(srv.url)) { defauts.push(`url « ${court(srv?.url, 60)} » : http://127.0.0.1:<port> attendu`); fin() }
if (typeof srv.arreter !== 'function') { defauts.push('arreter n\'est pas une fonction'); fin() }
const nAppels = () => (Array.isArray(srv.appels) ? srv.appels.length : -1)
const base = srv.url.replace(/\/$/, '')

const poster = (url, corps) => new Promise((ok) => {
  const u = new URL(url)
  const req = http.request({ hostname: u.hostname.replace(/^\[|\]$/g, ''), port: u.port, path: u.pathname, method: 'POST', agent: false, timeout: 5000,
    headers: { 'content-type': 'application/json', apikey: 'cle-factice-juge', authorization: 'Bearer cle-factice-juge', prefer: 'return=representation' } }, (res) => {
    let d = ''
    res.setEncoding('utf8')
    res.on('data', (x) => { d += x })
    res.on('end', () => ok({ status: res.statusCode, corps: d }))
  })
  req.on('timeout', () => req.destroy(new Error('délai de 5 s')))
  req.on('error', (e) => ok({ status: 0, corps: e.message }))
  req.end(JSON.stringify(corps))
})

const n0 = nAppels()
const a = await poster(`${base}/rest/v1/rpc/${F}`, conforme)
if (!(a.status >= 200 && a.status < 300)) defauts.push(`appel conforme au contrat refusé : HTTP ${a.status} ${court(a.corps, 80)}`)
const n1 = nAppels()
const b = await poster(`${base}/rest/v1/rpc/${F}`, fautif)
if (b.status !== 400) defauts.push(`appel fautif (${DE} → ${VERS}) : HTTP ${b.status}, 400 attendu`)
const n2 = nAppels()
if (n0 < 0) defauts.push('`appels` n\'est pas un tableau')
else if (!(n1 > n0 && n2 > n1)) defauts.push(`appels consignés ${n0} → ${n1} → ${n2} : un de plus par appel attendu`)
else if (!JSON.stringify(srv.appels).includes(F)) defauts.push(`${F} ne paraît pas dans les appels consignés`)
try { await delai(Promise.resolve(srv.arreter()), 5000, 'arreter') } catch (e) { defauts.push(`arreter : ${court(e.message)}`) }
const c = await poster(`${base}/rest/v1/rpc/${F}`, conforme)
if (c.status !== 0) defauts.push(`après arreter(), le serveur répond encore (HTTP ${c.status})`)
fin({ conforme: a.status, fautif: b.status, appels: [n0, n1, n2] })
