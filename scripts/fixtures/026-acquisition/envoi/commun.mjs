// scripts/fixtures/026-acquisition/envoi/commun.mjs — le socle des jeux d'essai du lot 5 (envoi automatique, fiche 026-062),
// écrit par Claude Code AVANT les modules qu'il juge (CLAUDE.md:23). Repris par facteur-qa.mjs, disjoncteurs-qa.mjs et
// jauges-qa.mjs, jamais par un exécutant (scripts/fixtures/** est dans leur `interdit`).
//
// Domaines en .invalid (RFC 2606) ; tous les noms de personnes ou d'entreprises contiennent « Témoin ». Rien ici n'appelle le
// réseau ni n'écrit hors de .orchestre/travail/ : les serveurs factices (formulaires, SMTP, notice) écoutent sur 127.0.0.1
// seulement, sur un port libre choisi par l'OS (port 0), jamais un port fixe (plusieurs juges peuvent tourner en parallèle).
//
// Index : ADRESSE_PROSPECTION, NOM_EXPEDITEUR_TEMOIN, portLibre, ecouterLocal, sha256Hex, sansEspaces, ligne.
import net from 'node:net'
import dns from 'node:dns'
import http from 'node:http'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const A = path.dirname(fileURLToPath(import.meta.url))
// Domaine .invalid (JP-4 du lot 5 : aucune vraie adresse, seuls smtp.gmail.com/imap.gmail.com sont permis comme HÔTES du
// protocole, jamais comme domaine d'une adresse e-mail de jeu d'essai) : l'adresse TÉMOIN du Gmail de prospection.
export const ADRESSE_PROSPECTION = 'contact.presti@presti-prospection.invalid'
export const NOM_EXPEDITEUR_TEMOIN = 'Benjamin Filiot – Presti'

/**
 * `serveur.listen(port, '127.0.0.1', …)`, à l'abri du piège réseau du juge (`piegerReseau()` de ../commun.mjs bloque TOUT
 * `dns.lookup`, même celui — purement local — que Node émet en interne pour un littéral IPv4 avant d'écouter). Le temps du
 * seul appel `listen`, un relais reconnaît les littéraux IP (`net.isIP`) et répond sans jamais toucher le réseau ; tout
 * le reste (un vrai nom d'hôte) retombe sur le `dns.lookup` déjà en place, piège compris.
 */
export function ecouterLocal(serveur, port, hote = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const original = dns.lookup
    const restaurer = () => { if (dns.lookup === relais) dns.lookup = original }
    const relais = (nom, options, callback) => {
      const cb = typeof options === 'function' ? options : callback
      const tousLesFormats = typeof options === 'object' && options?.all
      if (net.isIP(nom)) { cb(null, tousLesFormats ? [{ address: nom, family: net.isIP(nom) }] : nom, net.isIP(nom)); return undefined }
      return original(nom, options, callback)
    }
    dns.lookup = relais
    serveur.once('error', (e) => { restaurer(); reject(e) })
    serveur.listen(port, hote, () => { restaurer(); resolve() })
  })
}

/** Un port TCP libre sur 127.0.0.1, choisi par l'OS (port 0), sans jamais fixer de numéro. */
export async function portLibre() {
  const srv = net.createServer()
  await ecouterLocal(srv, 0)
  const { port } = srv.address()
  await new Promise((resolve, reject) => srv.close((err) => (err ? reject(err) : resolve())))
  return port
}

/**
 * `net.createConnection({ host: '127.0.0.1', port }, …)`, avec le même relais que `ecouterLocal` : `Socket#connect` appelle
 * lui aussi `dns.lookup` pour un littéral IPv4, que le piège réseau du juge bloquerait sinon (le piège autorise déjà
 * `net.Socket#connect` vers 127.0.0.1 lui-même — c'est la résolution DNS sous-jacente, systématique même pour un littéral,
 * qu'il faut détourner ici). Rend le socket, déjà connecté (`connect`) ou en erreur (`error`, rejeté).
 */
export function connecterLocal(port, hote = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const original = dns.lookup
    const restaurer = () => { if (dns.lookup === relais) dns.lookup = original }
    const relais = (nom, options, callback) => {
      const cb = typeof options === 'function' ? options : callback
      const tousLesFormats = typeof options === 'object' && options?.all
      if (net.isIP(nom)) { cb(null, tousLesFormats ? [{ address: nom, family: net.isIP(nom) }] : nom, net.isIP(nom)); return undefined }
      return original(nom, options, callback)
    }
    dns.lookup = relais
    const s = net.createConnection({ host: hote, port }, () => { restaurer(); resolve(s) })
    s.once('error', (e) => { restaurer(); reject(e) })
  })
}

/** sha256 hexadécimal d'un texte ou buffer. */
export const sha256Hex = (x) => crypto.createHash('sha256').update(x).digest('hex')

/** Un mot de passe d'application Google débarrassé de ses espaces (comme lib/canaux.ts, mémoire « messagerie d'entreprise »). */
export const sansEspaces = (s) => String(s ?? '').replace(/\s+/g, '')

/** Une ligne de journal compacte pour les sessions consignées (SMTP, IMAP, formulaires). */
export const ligne = (...a) => a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')

/**
 * Une requête GET vers un serveur local (127.0.0.1), par `node:http` plutôt que le `fetch` global : le piège réseau du
 * juge (`piegerReseau()`) consigne CHAQUE appel à `fetch`, même local, dans ses tentatives (alors qu'il laisse passer un
 * `net.Socket#connect` local sans le consigner) — un juge qui vérifie lui-même ses serveurs factices doit donc passer par
 * `http.get`, jamais par `fetch`, pour ne pas se signaler à lui-même un faux accès réseau. → { statut, texte }
 */
export function getLocal(url) {
  return new Promise((resolve, reject) => {
    const original = dns.lookup
    const restaurer = () => { if (dns.lookup === relais) dns.lookup = original }
    const relais = (nom, options, callback) => {
      const cb = typeof options === 'function' ? options : callback
      const tousLesFormats = typeof options === 'object' && options?.all
      if (net.isIP(nom)) { cb(null, tousLesFormats ? [{ address: nom, family: net.isIP(nom) }] : nom, net.isIP(nom)); return undefined }
      return original(nom, options, callback)
    }
    dns.lookup = relais
    const req = http.get(url, (res) => {
      restaurer()
      const morceaux = []
      res.on('data', (c) => morceaux.push(c))
      res.on('end', () => resolve({ statut: res.statusCode, texte: Buffer.concat(morceaux).toString('utf8') }))
    })
    req.once('socket', restaurer)
    req.on('error', (e) => { restaurer(); reject(e) })
  })
}

// ── Le banc de routes (repris du crochet partagé cli/banc-crochet.mjs, écrit pour 026-037) ─────────────────────────────────
// Chaque route jugée (jauges, usine/facteur/*, usine/porteur/*, cron/facteur) est importée avec « ?banc=<n> » : le crochet
// double chaque import « @/lib/… » par un relais consigné dans D.journal, piloté par D.comportements/D.valeurs. Le juge de
// cette fiche ne modifie jamais banc-crochet.mjs (scripts/fixtures/** hors envoi/ est dans son `interdit`) ; il le RÉUTILISE,
// comme routes-acquisition-qa.mjs (026-037) le fait déjà pour son propre lot.
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

const R = path.resolve(A, '..', '..', '..', '..')
const CLI = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'cli')
let bancEnregistre = false
export function enregistrerBanc() {
  if (bancEnregistre) return
  register(pathToFileURL(path.join(CLI, 'banc-crochet.mjs')).href, import.meta.url, { data: { contrat: pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href } })
  bancEnregistre = true
}
const jsonSur = (x) => { try { const vus = new WeakSet(); return JSON.stringify(x, (k, v) => { if (typeof v === 'function') return '[fonction]'; if (typeof v === 'bigint') return String(v); if (v && typeof v === 'object') { if (vus.has(v)) return '[cycle]'; vus.add(v) } return v }) ?? 'undefined' } catch { return '[illisible]' } }
/** Un objet __DBL frais : { journal, comportements, valeurs, fab, appel }. À réassigner sur globalThis.__DBL avant chaque banc(). */
export function creerDBL() {
  const D = { journal: [], comportements: {}, valeurs: {}, n: 0 }
  D.appel = (chemin, args) => {
    const [mod, exp] = chemin.split('::')
    const nom = exp.split('.').pop()
    D.journal.push({ mod, exp, nom, args, json: jsonSur(args), n: ++D.n })
    for (const k of [exp, nom]) if (Object.hasOwn(D.comportements, k)) return D.comportements[k](...args)
    return undefined
  }
  function universel(chemin) {
    return new Proxy(function () {}, {
      get(_, p) { if (p === 'then' || typeof p === 'symbol' || p === 'toJSON' || p === 'prototype') return undefined; return universel(`${chemin}.${String(p)}`) },
      apply(_, __, args) { return D.appel(chemin, args) },
      construct(_, args) { D.appel(`${chemin}#new`, args); return universel(`${chemin}#instance`) },
    })
  }
  D.fab = (mod, exp) => (Object.hasOwn(D.valeurs, exp) ? D.valeurs[exp] : universel(`${mod}::${exp}`))
  return D
}
let BANC_N = 0
/**
 * Importe et exécute une route App Router (GET/POST/…) sur le banc. → { statut, json, texte, erreur, journal, console }
 * `comportements`/`valeurs` pilotent les doublures ; `env` pose des variables d'environnement le temps de l'appel.
 */
export async function banc(fichierAbsolu, { methode = 'GET', url, entetes = {}, corps, env = {}, comportements = {}, valeurs = {} } = {}) {
  enregistrerBanc()
  const D = creerDBL()
  D.comportements = comportements; D.valeurs = valeurs
  globalThis.__DBL = D
  const env0 = {}
  for (const [k, v] of Object.entries(env)) { env0[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v }
  const sortie = []
  const console0 = {}
  for (const k of ['log', 'error', 'warn', 'info', 'debug']) { console0[k] = console[k]; console[k] = (...a) => sortie.push(a.map((x) => (typeof x === 'string' ? x : jsonSur(x))).join(' ')) }
  let statut = null, json = null, texte = '', erreur = null
  try {
    const mod = await import(`${pathToFileURL(fichierAbsolu).href}?banc=${++BANC_N}`)
    if (typeof mod[methode] !== 'function') throw new Error(`${methode} non exportée`)
    const req = new Request(url, { method: methode, headers: entetes, body: corps === undefined ? undefined : typeof corps === 'string' ? corps : JSON.stringify(corps) })
    const rep = await mod[methode](req)
    statut = rep?.status ?? null
    texte = rep ? await rep.text() : ''
    try { json = JSON.parse(texte) } catch { json = null }
  } catch (e) { erreur = String(e?.message ?? e).split('\n')[0].slice(0, 300) } finally {
    for (const k of Object.keys(console0)) console[k] = console0[k]
    for (const [k, v] of Object.entries(env0)) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
  }
  return { statut, json, texte, erreur, journal: D.journal.slice(), console: sortie.join('\n') }
}
