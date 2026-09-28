// Espion du réseau du juge savoir-socle-qa (026-229), chargé par `node --import <ce fichier>`.
// Il consigne dans SAVOIR_ESPION_RESEAU (une ligne JSON par tentative) chaque hôte contacté par fetch, http(s).request
// ou une socket (net.Socket#connect, que http, https, tls et fetch empruntent tous), et BLOQUE tout hôte qui n'est pas
// la boucle locale (127.0.0.1, localhost, ::1) : un essai ne sort jamais de la machine.
import fs from 'node:fs'
import net from 'node:net'

const JOURNAL = process.env.SAVOIR_ESPION_RESEAU
const LOCAUX = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])
if (JOURNAL) {
  const ajouter = fs.appendFileSync.bind(fs)
  const local = (h) => LOCAUX.has(String(h ?? '').toLowerCase())
  const noter = (op, hote, port) => { try { ajouter(JOURNAL, `${JSON.stringify({ op, hote: hote ?? null, port: port ?? null, bloque: !local(hote) })}\n`) } catch { /* ignoré */ } }
  const fetchOrig = globalThis.fetch
  if (typeof fetchOrig === 'function') {
    globalThis.fetch = async function espionFetch(entree, init) {
      const u = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url)
      noter('fetch', u.hostname, u.port ? Number(u.port) : null)
      if (!local(u.hostname)) throw new TypeError(`espion-reseau : hôte ${u.hostname} refusé (boucle locale seulement)`)
      return fetchOrig.call(this, entree, init)
    }
  }
  const connecter = net.Socket.prototype.connect
  net.Socket.prototype.connect = function espionConnect(...args) {
    let a = args
    if (Array.isArray(a[0])) a = a[0]
    const o = a[0]
    let hote = 'localhost'
    let port = null
    let ipc = false
    if (o && typeof o === 'object') { if (o.path) ipc = true; hote = o.host ?? 'localhost'; port = o.port ?? null }
    else if (typeof o === 'number' || /^\d+$/.test(String(o))) { port = Number(o); if (typeof a[1] === 'string') hote = a[1] }
    else if (typeof o === 'string') ipc = true
    if (ipc) { noter('ipc', 'localhost', null); return connecter.apply(this, args) }
    noter('connect', hote, port)
    if (!local(hote)) { process.nextTick(() => this.destroy(new Error(`espion-reseau : hôte ${hote} refusé (boucle locale seulement)`))); return this }
    return connecter.apply(this, args)
  }
}
