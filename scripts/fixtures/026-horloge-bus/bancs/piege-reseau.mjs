// Piège réseau de scripts/juges-026-horloge-bus-preuve.mjs (026-009), contrôle « reseau-piege » : chargé par
// NODE_OPTIONS=--import dans le juge et dans tous les processus qu'il lance. Il note son chargement (« CHARGE pid=… »), puis
// chaque tentative vers un hôte refusé (« VIOLATION <voie> <hôte> pid=… ») dans le journal PIEGE_JOURNAL, et la fait échouer
// AVANT toute connexion : aucun octet ne part. Hôte refusé : hors de PIEGE_PERMIS si cette liste est donnée, sinon dans
// PIEGE_INTERDITS (le domaine ou un sous-domaine). Voies piégées : fetch, http(s).request/get, net/tls.connect — y compris
// importées par nom (`import { request } from 'node:https'`) : syncBuiltinESMExports() recopie les correctifs dans les exports.
import fs from 'node:fs'
import net from 'node:net'
import tls from 'node:tls'
import http from 'node:http'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'

const J = process.env.PIEGE_JOURNAL || ''
const liste = (v) => String(v || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
const PERMIS = liste(process.env.PIEGE_PERMIS)
const INTERDITS = liste(process.env.PIEGE_INTERDITS)
const noter = (l) => { if (J) { try { fs.appendFileSync(J, `${l}\n`) } catch { /* journal illisible : la preuve le verra (aucun CHARGE) */ } } }
noter(`CHARGE pid=${process.pid}`)

const hote = (h) => String(h || '').replace(/^\[|\]$/g, '').toLowerCase()
const refuse = (h) => {
  const x = hote(h)
  if (!x) return false
  if (PERMIS.length) return !PERMIS.includes(x)
  return INTERDITS.some((i) => x === i || x.endsWith(`.${i}`))
}
const bloquer = (voie, h) => {
  noter(`VIOLATION ${voie} ${hote(h)} pid=${process.pid}`)
  const e = new Error(`réseau piégé par la preuve 026-009 : ${hote(h)} (${voie})`)
  e.code = 'ECONNREFUSED'
  return e
}

const f0 = globalThis.fetch
if (f0) {
  globalThis.fetch = function fetchPiege(entree, init) {
    let h = ''
    try { h = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url).hostname } catch { /* URL illisible : fetch la refusera */ }
    if (refuse(h)) return Promise.reject(bloquer('fetch', h))
    return f0.call(this, entree, init)
  }
}
const hoteHttp = (a) => {
  const x = a[0]
  if (typeof x === 'string' || x instanceof URL) { try { return new URL(String(x)).hostname } catch { return '' } }
  if (x && typeof x === 'object') return x.socketPath ? '' : (x.hostname || x.host || 'localhost')
  return ''
}
for (const [nom, mod] of [['http', http], ['https', https]]) {
  for (const f of ['request', 'get']) {
    const o = mod[f]
    mod[f] = function piege(...a) { const h = hoteHttp(a); if (refuse(h)) throw bloquer(`${nom}.${f}`, h); return o.apply(this, a) }
  }
}
const hoteNet = (a) => {
  const x = a[0]
  if (x && typeof x === 'object') return x.path ? '' : (x.host || x.hostname || 'localhost')
  if (typeof x === 'number' || /^\d+$/.test(String(x))) return typeof a[1] === 'string' ? a[1] : 'localhost'
  return '' // un chemin de tube nommé
}
for (const [nom, mod] of [['net', net], ['tls', tls]]) {
  for (const f of ['connect', 'createConnection']) {
    const o = mod[f]
    if (typeof o !== 'function') continue
    mod[f] = function piege(...a) { const h = hoteNet(a); if (refuse(h)) throw bloquer(`${nom}.${f}`, h); return o.apply(this, a) }
  }
}
// sans cela, `import { request } from 'node:http'` (ou `await import('node:net')`) garderait la fonction d'origine
syncBuiltinESMExports()
