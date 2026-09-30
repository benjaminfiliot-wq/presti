// scripts/fixtures/026-transverse/usine-horloge.mjs — l'HORLOGE ACCÉLÉRÉE du juge du pont Telegram (fiche 026-194, Claude Code).
//
// Le service jugé (scripts/usine/telegram.mjs) ne connaît aucune option d'horloge, mais la fiche exige de constater « la relève de
// sortie toutes les 60 s », « le battement toutes les 5 min », « 20 commandes par heure » et « l'appairage valable 10 min ». Le juge
// précharge donc ce module dans le processus jugé :
//
//     node --import <ce fichier>?actif=1 scripts/usine/telegram.mjs …        (le processus est lancé avec un canal IPC)
//
// Ce qui est VIRTUEL (le juge le fait avancer, jamais le temps réel) : Date (new Date(), Date.now(), Date()), performance.now(),
// setTimeout, setInterval, clearTimeout, clearInterval, et leurs doubles de node:timers et node:timers/promises (setTimeout, setInterval).
// Ce qui reste RÉEL : les sockets, donc le fetch vers 127.0.0.1 et les serveurs d'essai ; les fichiers ; setImmediate, queueMicrotask,
// process.nextTick ; AbortSignal.timeout et process.hrtime (jamais utilisés par un service qui respecte le contrat : il n'y a pas de
// « temps » à accélérer dans ce qu'ils mesurent). Le temps virtuel part de DEPART (2026-06-01T12:00:00Z) et ne bouge qu'à l'ordre du juge.
//
// Protocole IPC (process.send / process.on('message')) :
//   juge → service : { t: 'avancer', id, ms }   le temps virtuel avance de ms : les minuteurs échus se déclenchent UN PAR UN, dans l'ordre
//                                                de leur échéance, le temps virtuel valant l'échéance de chacun ; entre deux minuteurs, l'horloge
//                                                attend le CALME (voir plus bas) pour que la suite de ce que fait le service (fetch, réponses)
//                                                ait eu lieu avant le minuteur suivant.
//   service → juge : { t: 'fait', id, ms }       fin de l'avance, ms = temps virtuel courant (ms depuis l'époque Unix) ;
//                    { t: 'fetch', id, ms, methode, url }   un fetch commence, avec le temps virtuel exact (c'est la preuve des cadences) ;
//                    { t: 'fin', id }             ce fetch a rendu ses en-têtes (ou échoué) ;
//                    { t: 'pret', ms }            le module est chargé.
// Le CALME : aucun fetch n'a commencé ni fini depuis 6 ms réelles (12 ms en fin d'avance) et aucun fetch commencé il y a moins de 400 ms
// n'est encore en vol (une longue attente, comme getUpdates, est ignorée : elle dure des secondes). Aucun juge ne dort « au hasard » :
// il attend cet accusé.
//
// Un minuteur virtuel « référencé » retient le processus en vie (comme un vrai) grâce à un vrai minuteur de garde ; sans minuteur
// virtuel référencé ni fetch en vol, le processus se termine tout seul (--une-passe). Le canal IPC est dé-référencé pour ne pas le retenir.
// Une exception levée dans un rappel de minuteur virtuel est relancée hors de la boucle (setImmediate réel) : le processus plante comme il
// planterait avec de vrais minuteurs — un juge ne doit pas la masquer.
import { createRequire } from 'node:module'
import { syncBuiltinESMExports } from 'node:module'

export const DEPART = Date.UTC(2026, 5, 1, 12, 0, 0)
const ACTIF = import.meta.url.includes('?actif=1')

if (ACTIF) installer()

function installer() {
  const require = createRequire(import.meta.url)
  // Charger undici (le fetch) AVANT de remplacer les minuteurs : il garde une référence à setTimeout à son chargement, et ses délais internes
  // (en-têtes, corps, connexion) doivent rester réels, sinon une avance de 10 min virtuelles couperait une longue attente en cours.
  void globalThis.Headers; void globalThis.Request; void globalThis.Response
  const Reel = { Date, setTimeout, setInterval, clearTimeout, clearInterval, now: Date.now.bind(Date), perf: performance.now.bind(performance), fetch: globalThis.fetch }
  const dormirReel = (ms) => new Promise((ok) => Reel.setTimeout(ok, ms))
  let maintenant = DEPART
  let decalagePerf = 0
  let seq = 0
  const minuteurs = new Set()
  let gardes = 0, garde = null
  let activite = 0
  const enCours = new Map()
  const envoyer = (m) => { try { process.send?.(m) } catch { /* canal fermé : le juge s'en va */ } }

  function majGarde() {
    const veut = [...minuteurs].some((t) => t.ref)
    if (veut && !garde) garde = Reel.setInterval(() => {}, 1 << 30)
    else if (!veut && garde) { Reel.clearInterval(garde); garde = null }
  }
  const bornes = (ms) => { const n = Number(ms); return !(n >= 1) || n > 2147483647 ? 1 : Math.trunc(n) }
  function arreter(t) { if (t && minuteurs.delete(t)) majGarde() }
  const trouver = (x) => (typeof x === 'number' || typeof x === 'string' ? [...minuteurs].find((t) => t.n === Number(x)) : undefined)
  // Un minuteur = { n, rappel, args, repete, echeance, ref } ; ce que le service tient en main est une poignée qui imite un Timeout de Node.
  function creer(rappel, ms, args, repete) {
    if (typeof rappel !== 'function') { const e = new TypeError('The "callback" argument must be of type function.'); e.code = 'ERR_INVALID_ARG_TYPE'; throw e }
    const t = { n: ++seq, rappel, args, repete: repete ? bornes(ms) : 0, echeance: maintenant + bornes(ms), ref: true }
    const h = {
      _t: t,
      ref() { t.ref = true; majGarde(); return h },
      unref() { t.ref = false; majGarde(); return h },
      hasRef: () => t.ref,
      refresh() { t.echeance = maintenant + (t.repete || bornes(ms)); minuteurs.add(t); majGarde(); return h },
      close() { arreter(t); return h },
      [Symbol.toPrimitive]: () => t.n,
    }
    t.poignee = h
    minuteurs.add(t); activite++; majGarde()
    return h
  }
  const dePoignee = (x) => (x && typeof x === 'object' && x._t ? x._t : trouver(x))
  // Les appels des modules internes de Node (le fetch d'undici règle ses délais d'en-tête et de corps par le setTimeout global) restent
  // RÉELS : sinon une avance de 10 min virtuelles couperait une longue attente en cours. On regarde le PREMIER appelant.
  const interne = () => {
    const lim = Error.stackTraceLimit; Error.stackTraceLimit = 4
    const l = String(new Error().stack).split('\n')[3] ?? ''
    Error.stackTraceLimit = lim
    return /node:internal|internal\/deps|\(node:/.test(l)
  }
  const setTimeoutV = (rappel, ms, ...args) => (interne() ? Reel.setTimeout(rappel, ms, ...args) : creer(rappel, ms, args, false))
  const setIntervalV = (rappel, ms, ...args) => (interne() ? Reel.setInterval(rappel, ms, ...args) : creer(rappel, ms, args, true))
  const clearV = (x) => { const t = dePoignee(x); if (t) arreter(t); else if (x && typeof x === 'object') { Reel.clearTimeout(x); Reel.clearInterval(x) } }

  const setTimeoutPromesse = (ms, valeur, opts) => new Promise((ok, ko) => {
    const h = setTimeoutV(() => ok(valeur), ms)
    if (opts?.ref === false) h.unref()
    opts?.signal?.addEventListener('abort', () => { clearV(h); const e = new Error('The operation was aborted'); e.name = 'AbortError'; e.code = 'ABORT_ERR'; ko(e) }, { once: true })
  })
  async function* setIntervalPromesse(ms, valeur) {
    let attente = null, echus = 0
    const h = setIntervalV(() => { echus++; attente?.(); attente = null }, ms)
    try { for (;;) { if (!echus) await new Promise((ok) => { attente = ok }); while (echus > 0) { echus--; yield valeur } } } finally { clearV(h) }
  }

  // ── Date virtuelle ────────────────────────────────────────────────────────────────────────────────────────────────
  function DateVirtuelle(...a) {
    if (!new.target) return new Reel.Date(maintenant).toString()
    return a.length === 0 ? new Reel.Date(maintenant) : Reflect.construct(Reel.Date, a, new.target === DateVirtuelle ? Reel.Date : new.target)
  }
  DateVirtuelle.prototype = Reel.Date.prototype
  Object.setPrototypeOf(DateVirtuelle, Reel.Date)
  DateVirtuelle.now = () => maintenant
  Object.defineProperty(Reel.Date.prototype, 'constructor', { value: DateVirtuelle, writable: true, configurable: true })
  globalThis.Date = DateVirtuelle
  globalThis.setTimeout = setTimeoutV
  globalThis.setInterval = setIntervalV
  globalThis.clearTimeout = clearV
  globalThis.clearInterval = clearV
  try { performance.now = () => Reel.perf() + decalagePerf } catch { /* propriété non modifiable : la mesure reste réelle */ }

  const timers = require('node:timers')
  timers.setTimeout = setTimeoutV; timers.setInterval = setIntervalV; timers.clearTimeout = clearV; timers.clearInterval = clearV
  const timersP = require('node:timers/promises')
  timersP.setTimeout = setTimeoutPromesse; timersP.setInterval = setIntervalPromesse
  try { syncBuiltinESMExports() } catch { /* sans effet */ }

  // ── fetch : réel, seulement observé ───────────────────────────────────────────────────────────────────────────────
  globalThis.fetch = function fetchObserve(entree, init) {
    const id = ++seq
    let url = ''
    try { url = typeof entree === 'string' ? entree : (entree?.url ?? String(entree)) } catch { /* illisible */ }
    let methode = String(init?.method ?? entree?.method ?? 'GET').toUpperCase()
    activite++
    enCours.set(id, Reel.now())
    envoyer({ t: 'fetch', id, ms: maintenant, methode, url })
    const fini = () => { if (enCours.delete(id)) { activite++; envoyer({ t: 'fin', id }) } }
    let p
    try { p = Reel.fetch.call(globalThis, entree, init) } catch (e) { fini(); throw e }
    return p.then((r) => { fini(); return r }, (e) => { fini(); throw e })
  }

  // ── L'avance ─────────────────────────────────────────────────────────────────────────────────────────────────────
  async function calme(fenetre) {
    for (let tours = 0; tours < 800; tours++) {
      const vu = activite
      await dormirReel(fenetre)
      const recents = [...enCours.values()].filter((d) => Reel.now() - d < 400).length
      if (vu === activite && recents === 0) return
    }
  }
  const prochain = () => { let m = null; for (const t of minuteurs) if (!m || t.echeance < m.echeance || (t.echeance === m.echeance && t.n < m.n)) m = t; return m }
  async function avancer(ms) {
    const cible = maintenant + Math.max(0, Number(ms) || 0)
    for (;;) {
      const t = prochain()
      if (!t || t.echeance > cible) break
      const avant = maintenant
      maintenant = Math.max(maintenant, t.echeance)
      decalagePerf += maintenant - avant
      if (t.repete) t.echeance = maintenant + t.repete
      else arreter(t)
      activite++
      try { t.rappel.apply(t.poignee, t.args) } catch (e) { Reel.setTimeout(() => { throw e }, 0) }
      await calme(6)
    }
    decalagePerf += cible - maintenant
    maintenant = cible
    await calme(12)
  }

  if (process.send && process.channel) {
    process.on('message', (m) => {
      if (m && m.t === 'avancer') avancer(m.ms).then(() => envoyer({ t: 'fait', id: m.id, ms: maintenant }), () => envoyer({ t: 'fait', id: m.id, ms: maintenant }))
    })
    process.channel.unref?.()
    envoyer({ t: 'pret', ms: maintenant })
  }
}
