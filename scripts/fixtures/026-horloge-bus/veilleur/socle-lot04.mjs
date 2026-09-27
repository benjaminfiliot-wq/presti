// Le socle des quatre juges de l'horloge applicative (lot 04, fiche 026-045) : file-argent-qa, veilleur-qa, tic-qa et
// horloge-qa. Écrit par Claude Code. Il vit sous veilleur/ parce que c'est le seul dossier de fixtures du périmètre de 026-045 ;
// il complète le socle du lot 03 (doublures/commun.mjs), qu'il importe sans le modifier.
//
// Ce qu'il ajoute au lot 03 :
//   - le témoin du lot 04 : lib/ du dépôt copié sous .orchestre/travail/<juge>/temoin/, puis superposés les implémentations
//     de référence de veilleur/temoins/**.temoin (fileArgent, veilleur, tic), celles du lot 03 dont elles dépendent
//     (doublures/temoins/: bus, pause) et des fichiers dérivés de HEAD (lib/alertes.ts, la route « À faire », la carte de
//     fermeture) ;
//   - l'horloge simulée (scripts/lib/horloge-simulee.mjs) chargée par --import dans chaque sonde, figée par HORLOGE_FIGER ;
//   - des doublures du lot 04 (veilleur/doublures/*.mjs) branchées dans la sonde par un crochet de résolution enregistré
//     avant l'import du code jugé (doubler) : lib/email, lib/direction/stripe, lib/agents/pause, et les espions du tic ;
//   - une base factice complète (demarrerBase) : le faux PostgREST du lot 03 avec les fonctions acq_* de 026-063 en plus, des
//     tables filtrées comme PostgREST les filtre (eq, gte, in, is, order, limit…), et, pour la file de l'argent, un stockage
//     factice (buckets, upload, download, exists, copy, list) qui consigne chaque geste ;
//   - le réseau de la sonde tenu (tenirReseau) : seul 127.0.0.1 répond ; toute autre tentative est refusée ET consignée
//     (api.resend.com compris), dns.google reçoit une réponse factice (la ronde du lundi de lib/alertes.ts le lit).
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import * as C from '../doublures/commun.mjs'

export { C }
export const ICI = path.dirname(fileURLToPath(import.meta.url))
export const DOUBLURES = path.join(ICI, 'doublures')
export const TEMOINS = path.join(ICI, 'temoins')
export const ETATS = path.join(ICI, 'etats')
export const TEMOINS_03 = path.join(C.ICI, 'temoins')
export const HORLOGE = path.join(C.R, 'scripts', 'lib', 'horloge-simulee.mjs')
export const FAUX_POSTGREST = path.join(C.R, 'scripts', 'lib', 'faux-postgrest.mjs')
export const court = C.court
export const res = (echecs, resume = '') => ({ ok: echecs.length === 0, echecs, resume })
export const lireJson = (f) => JSON.parse(fs.readFileSync(path.isAbsolute(f) ? f : path.join(ICI, f), 'utf8'))
export const RE_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
export const RE_COURRIEL = C.RE_COURRIEL

/** Les fonctions hors de contrat-ops.json que le lot 04 sert : celles de 0111 (026-063) que le veilleur lit, et 0049. */
export const FONCTIONS_04 = {
  acq_disjoncteurs_etat: { params: [] },
  acq_jauges: { params: [] },
  limite_atteinte: { params: [['p_cle', 'text'], ['p_max', 'integer'], ['p_fenetre_s', 'integer']] },
}

// ── Les dates relatives des jeux d'essai ─────────────────────────────────────────────────────────────────────────────
// Un jeu d'essai écrit « -8j », « +3h », « -61min » ou « -2p+130min » (deux périodes de l'agent plus 130 minutes) : le juge
// les résout sur l'instant simulé. « infinity » reste tel quel (arrêté jusqu'à la décision de Benj).
const UNITES = { j: 86_400_000, h: 3_600_000, min: 60_000, s: 1000 }
export function resoudreDate(v, maintenant, periodeMin = null) {
  if (typeof v !== 'string') return v
  const m = /^([+-])(?:(\d+(?:\.\d+)?)p)?(?:([+-]?)(\d+(?:\.\d+)?)(j|h|min|s))?$/.exec(v)
  if (!m || (!m[2] && !m[4])) return v
  const signe = m[1] === '-' ? -1 : 1
  let ms = 0
  if (m[2]) { if (periodeMin === null) throw new Error(`« ${v} » : période inconnue`); ms += Number(m[2]) * periodeMin * 60_000 }
  if (m[4]) ms += (m[3] === '-' ? -1 : 1) * Number(m[4]) * UNITES[m[5]]
  return new Date(maintenant + signe * ms).toISOString()
}
/** Résout toutes les dates relatives d'un objet (les champs d'un agent se résolvent avec sa période). */
export function resoudre(o, maintenant, periodeMin = null) {
  if (Array.isArray(o)) return o.map((x) => resoudre(x, maintenant, periodeMin))
  if (o && typeof o === 'object') {
    const p = typeof o.periode_minutes === 'number' ? o.periode_minutes : periodeMin
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, resoudre(v, maintenant, p)]))
  }
  return resoudreDate(o, maintenant, periodeMin)
}
/** Le jour de Paris (AAAA-MM-JJ) d'un instant, par Intl, comme le code jugé. */
export const jourParis = (t) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
export const heureParis = (t) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t))

// ── Le témoin du lot 04 ──────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Construit le témoin : lib/ du dépôt copié, puis superposés `lot03` (doublures/temoins/<rel>.temoin), `propres`
 * (veilleur/temoins/<rel>.temoin), les `derives` de HEAD ([rel, (texte de HEAD) => texte]) et les `copies` du dépôt tel quel.
 * → { dest, superposes[], derives[] }
 */
export function construireTemoin(juge, { lot03 = [], propres = [], derives = [], copies = [] } = {}) {
  const dest = path.join(C.TRAVAIL, juge, 'temoin')
  C.vider(dest)
  fs.cpSync(path.join(C.R, 'lib'), path.join(dest, 'lib'), { recursive: true })
  const poser = (rel, texte) => { fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true }); fs.writeFileSync(path.join(dest, rel), texte) }
  const superposes = []
  for (const [dossier, liste, nom] of [[TEMOINS_03, lot03, 'doublures/temoins'], [TEMOINS, propres, 'veilleur/temoins']]) {
    for (const rel of liste) {
      const f = path.join(dossier, `${rel}.temoin`)
      if (!fs.existsSync(f) || !fs.statSync(f).size) throw new Error(`témoin incomplet : ${nom}/${rel}.temoin absent ou vide`)
      poser(rel, fs.readFileSync(f))
      superposes.push(rel)
    }
  }
  for (const [rel, f] of derives) {
    const h = C.aHead(rel)
    if (h === null) throw new Error(`${rel} introuvable à HEAD : témoin dérivé impossible`)
    poser(rel, f(h))
  }
  for (const rel of copies) {
    const f = path.join(C.R, rel)
    if (!fs.existsSync(f)) throw new Error(`${rel} introuvable dans le dépôt : copie du témoin impossible`)
    poser(rel, fs.readFileSync(f))
  }
  return { dest, superposes, derives: derives.map(([rel]) => rel), copies }
}

/**
 * Le déroulé d'un juge du lot 04 (celui du lot 03, avec le témoin du lot 04). `criteres` : { id: { juger, temoin?, reel?,
 * eprouver?, sansSabotage? } } ; `sabotages` : [{ id, nom, fichier, chercher, remplacer } | { …, supprimer: true }].
 * Hors --temoin, sur la racine : chaque critère une fois. En --temoin : chaque critère VERT sur le témoin, puis chacun de ses
 * sabotages ROUGE ; un critère sans sabotage (et sans `temoin` ni `sansSabotage`) est rouge : rien ne prouve qu'il sait échouer.
 */
export async function derouler({ juge, ids, criteres, sabotages = [], temoin = {}, prealables = [], notes = [], o, avantCriteres = null }) {
  const s = C.creerRapport(juge, ids, { entete: `${juge} — ${o.temoin ? 'témoin' : o.reel ? 'réel' : `racine ${o.racine === C.R ? '(le dépôt)' : C.posix(path.relative(C.R, o.racine)) || o.racine}`}` })
  for (const n of notes) s.note(n)
  for (const p of prealables) {
    let r
    try { r = await p() } catch (e) { r = { ok: false, resume: e.message } }
    if (!r.ok) { console.error(`✗ ${juge} : préalable manquant — ${r.resume}`); process.exit(2) }
    s.note(r.resume)
  }
  const verdict = (id, r) => { if (r.ok) s.passe(id, r.resume); else for (const e of r.echecs.length ? r.echecs : ['échec sans détail']) s.echoue(id, e) }
  if (!o.temoin) {
    if (avantCriteres) { const x = await avantCriteres(o.racine, s); if (x === 'arret') process.exit(s.fin()) }
    for (const id of ids) {
      const c = criteres[id]
      if (c.reel && !o.reel) { s.saute(id, '--reel seulement (après déploiement, Claude Code)'); continue }
      let r
      try { r = await c.juger(o.racine, o) } catch (e) { r = { ok: false, echecs: [`le juge a planté sur ${id} : ${court(e.message, 200)}`] } }
      verdict(id, r)
    }
    process.exit(s.fin())
  }
  let t
  try { t = construireTemoin(juge, temoin) } catch (e) { console.error(`✗ ${juge} --temoin : ${e.message}`); process.exit(2) }
  s.note(`témoin : lib/ du dépôt copié sous ${C.posix(path.relative(C.R, t.dest))} ; superposés : ${t.superposes.join(', ') || '—'}${t.derives.length ? ` ; dérivés de HEAD : ${t.derives.join(', ')}` : ''}${t.copies.length ? ` ; copiés du dépôt : ${t.copies.join(', ')}` : ''}`)
  for (const id of ids) {
    const c = criteres[id]
    if (c.reel) {
      if (c.eprouver) {
        let r
        try { r = await c.eprouver(t.dest) } catch (e) { r = { ok: false, echecs: [`l'épreuve de la lecture a planté : ${court(e.message, 200)}`] } }
        verdict(id, r)
      } else s.saute(id, '--reel seulement (après déploiement, Claude Code)')
      continue
    }
    let r
    try { r = c.temoin ? await c.temoin(t.dest) : await c.juger(t.dest, o) } catch (e) { r = { ok: false, echecs: [`le juge a planté sur le témoin : ${court(e.message, 200)}`] } }
    if (!r.ok) { for (const e of r.echecs) s.echoue(id, `témoin refusé : ${e}`); continue }
    const siens = sabotages.filter((x) => x.id === id)
    const pris = [], rates = []
    for (const sab of siens) {
      let x
      try { x = await C.eprouverSabotage(t.dest, sab, () => c.juger(t.dest, o)) } catch (e) { x = { casse: `plantage : ${court(e.message, 120)}` } }
      if (x.casse) rates.push(`sabotage « ${sab.nom} » inapplicable : ${x.casse}`)
      else if (x.r.ok) rates.push(`sabotage « ${sab.nom} » accepté (${sab.fichier}) : le juge ne sait pas échouer`)
      else pris.push(`« ${sab.nom} » (${court(x.r.echecs[0], 90)})`)
    }
    if (!c.temoin && !siens.length && !c.sansSabotage) rates.push('aucun sabotage déclaré pour ce critère : rien ne prouve qu\'il sait échouer')
    if (rates.length) for (const e of rates) s.echoue(id, e)
    else s.passe(id, `témoin vert (${court(r.resume, 200)})${pris.length ? ` ; ${pris.length} sabotage(s) pris : ${pris.join(' ; ')}` : ''}`)
  }
  process.exit(s.fin())
}

// ── La sonde du lot 04 ───────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Une sonde (doublures/sonde.mjs du lot 03), avec l'horloge simulée chargée par --import (figée à `figer`, une date ISO en
 * UTC) et le piège réseau de la preuve conservé s'il est dans NODE_OPTIONS. `doublures03` : les doublures du lot 03 (lib/flags).
 */
export function sonde({ juge, fichier, nom, racine, params = {}, figer = null, doublures03 = [], delaiMs = 180_000 }) {
  const opts = `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''}--import="${pathToFileURL(HORLOGE).href}"`
  return C.lancerSonde({ juge, jugeFichier: fichier, nom, racine, doublures: doublures03, params, delaiMs, env: { NODE_OPTIONS: opts, ...(figer ? { HORLOGE_FIGER: figer } : {}) } })
}
/** Le résultat d'une sonde en verdict de critère. */
export const deSonde = (x) => (x.ok ? res(x.res?.echecs || ['résultat de sonde sans liste'], x.res?.resume || '') : res([x.erreur]))

// ── Côté sonde : les doublures ───────────────────────────────────────────────────────────────────────────────────────
const CROCHET = `
import { fileURLToPath } from 'node:url'
let RACINE = null
const CARTE = new Map()
const cle = (u) => { try { let p = fileURLToPath(String(u).split('?')[0]).split('\\\\').join('/').replace(/\\.(tsx?|mjs|js)$/, ''); return process.platform === 'win32' ? p.toLowerCase() : p } catch { return null } }
export async function initialize(d) { RACINE = d.racine; for (const [rel, url] of Object.entries(d.carte)) CARTE.set(cle(new URL(rel, RACINE).href), url) }
export async function resolve(spec, ctx, next) {
  let u = null
  if (spec.startsWith('@/')) u = new URL(spec.slice(2), RACINE).href
  else if ((spec.startsWith('./') || spec.startsWith('../')) && ctx.parentURL && ctx.parentURL.startsWith('file:')) u = new URL(spec, ctx.parentURL).href
  else if (spec.startsWith('file:')) u = spec
  if (u) { const k = cle(u); if (k && CARTE.has(k) && CARTE.get(k) !== ctx.parentURL) return { url: CARTE.get(k), shortCircuit: true } }
  return next(spec, ctx)
}`
/**
 * Branche des doublures du lot 04 AVANT l'import du code jugé : `carte` = { 'lib/email': 'email.mjs', … } (chemin de la
 * racine sans extension → fichier de veilleur/doublures/). Le module est remplacé quel que soit le chemin d'import (alias @/
 * ou relatif), qu'il existe ou non dans la racine.
 */
export function doubler(racine, carte) {
  const data = { racine: pathToFileURL(path.resolve(racine) + path.sep).href, carte: Object.fromEntries(Object.entries(carte).map(([rel, f]) => [rel, pathToFileURL(path.join(DOUBLURES, f)).href])) }
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data })
}
/** Le journal partagé entre le juge (dans la sonde) et les doublures : globalThis.__JUGE_045__. */
export function journal(config = {}) {
  const J = (globalThis.__JUGE_045__ ??= {})
  J.seq = 0
  J.appels = []
  J.emails = []
  J.config = config
  return J
}
export const horloge = () => {
  const h = globalThis.__HORLOGE_SIMULEE__
  if (!h) throw new Error('horloge simulée absente de la sonde (--import non chargé)')
  return h
}

// ── Côté sonde : le réseau ───────────────────────────────────────────────────────────────────────────────────────────
/**
 * Seul 127.0.0.1 (localhost, ::1) répond. Toute autre tentative de fetch est consignée dans la liste rendue (le critère qui
 * la voit échoue) et n'envoie rien : sous le piège réseau de la preuve (PIEGE_JOURNAL posé), elle lui est passée, pour qu'il
 * la note et la refuse lui-même ; sans piège, elle est refusée ici. dns.google (lu par la ronde du lundi de lib/alertes.ts,
 * verifierDomaineMail) reçoit une réponse factice où MX, SPF, DKIM et DMARC existent : c'est une doublure du DNS.
 */
export function tenirReseau() {
  const tentatives = []
  const f0 = globalThis.fetch
  globalThis.fetch = async function fetchTenu(entree, init) {
    let u
    try { u = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url) } catch { return f0.call(this, entree, init) }
    const h = u.hostname.replace(/^\[|\]$/g, '')
    if (['127.0.0.1', 'localhost', '::1'].includes(h)) return f0.call(this, entree, init)
    tentatives.push(`${h}${u.pathname}`)
    if (h === 'dns.google') {
      const nom = u.searchParams.get('name') || '', type = u.searchParams.get('type') || ''
      const donnee = type === 'MX' ? '10 mx.exemple.invalid.' : nom.startsWith('_dmarc') ? 'v=DMARC1; p=none' : nom.includes('_domainkey') ? 'p=cle-factice' : 'v=spf1 include:exemple.invalid ~all'
      return new Response(JSON.stringify({ Status: 0, Answer: [{ name: nom, type: 1, data: donnee }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (process.env.PIEGE_JOURNAL && f0.name === 'fetchPiege') return f0.call(this, entree, init)
    throw new TypeError(`réseau tenu par le juge : ${h} refusé`)
  }
  return { tentatives, horsDns: () => tentatives.filter((t) => !t.startsWith('dns.google')), rendre: () => { globalThis.fetch = f0 } }
}

// ── Côté sonde : la base factice ─────────────────────────────────────────────────────────────────────────────────────
const comparable = (v) => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' || typeof v === 'boolean') return v
  const s = String(v)
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  if (/^\d{4}-\d{2}-\d{2}/.test(s) && Number.isFinite(Date.parse(s))) return Date.parse(s)
  return s
}
function vrai(valeur, op, brut) {
  switch (op) {
    case 'eq': return String(valeur) === brut || comparable(valeur) === comparable(brut)
    case 'neq': return !(String(valeur) === brut || comparable(valeur) === comparable(brut))
    case 'gt': return valeur !== null && valeur !== undefined && comparable(valeur) > comparable(brut)
    case 'gte': return valeur !== null && valeur !== undefined && comparable(valeur) >= comparable(brut)
    case 'lt': return valeur !== null && valeur !== undefined && comparable(valeur) < comparable(brut)
    case 'lte': return valeur !== null && valeur !== undefined && comparable(valeur) <= comparable(brut)
    case 'in': { const l = brut.replace(/^\(|\)$/g, '').split(',').map((x) => x.trim().replace(/^"|"$/g, '')); return l.includes(String(valeur)) }
    case 'is': return brut === 'null' ? valeur === null || valeur === undefined : brut === 'true' ? valeur === true : brut === 'false' ? valeur === false : false
    case 'like': case 'ilike': { const re = new RegExp(`^${brut.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*')}$`, op === 'ilike' ? 'i' : ''); return re.test(String(valeur ?? '')) }
    default: return true
  }
}
const RESERVES = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and'])
function filtrer(lignes, requete) {
  let out = lignes
  for (const [k, v] of Object.entries(requete || {})) {
    if (RESERVES.has(k)) continue
    const m = /^(not\.)?(eq|neq|gt|gte|lt|lte|in|is|like|ilike)\.([\s\S]*)$/.exec(String(v))
    if (!m) continue
    out = out.filter((l) => { const r = vrai(l[k], m[2], m[3]); return m[1] ? !r : r })
  }
  return out
}
function projeter(lignes, requete) {
  let out = [...lignes]
  if (requete?.order) {
    const [col, sens] = String(requete.order).split(',')[0].split('.')
    out.sort((a, b) => { const x = comparable(a[col]), y = comparable(b[col]); const r = x === y ? 0 : x === null ? 1 : y === null ? -1 : x < y ? -1 : 1; return sens === 'desc' ? -r : r })
  }
  const off = Number(requete?.offset) || 0
  if (off) out = out.slice(off)
  if (requete?.limit !== undefined) out = out.slice(0, Number(requete.limit))
  const sel = String(requete?.select ?? '*').replace(/\s+/g, '')
  if (sel && sel !== '*' && !sel.includes('(')) { const cols = sel.split(',').map((c) => c.split(':').pop()); out = out.map((l) => Object.fromEntries(cols.map((c) => [c, l[c] ?? null]))) }
  return out
}
/**
 * Une table servie comme PostgREST la servirait : lecture filtrée, insertion, mise à jour, suppression, upsert. Chaque
 * requête est consignée dans `journal` ({ table, methode, requete, corps }). → la fonction de réponse du faux PostgREST.
 */
export function table(nom, lignes, journalTables, { cle = 'id' } = {}) {
  return ({ methode, requete, corps, entetes }) => {
    journalTables.push({ table: nom, methode, requete, corps })
    const prefer = String(entetes?.prefer || '')
    const rendre = /return=representation/.test(prefer)
    if (methode === 'GET' || methode === 'HEAD') return { status: 200, body: projeter(filtrer(lignes, requete), requete) }
    if (methode === 'POST') {
      const neufs = (Array.isArray(corps) ? corps : [corps]).filter(Boolean)
      const fusion = /resolution=merge-duplicates/.test(prefer)
      const conflit = String(requete?.on_conflict || cle)
      const faits = []
      for (const n of neufs) {
        const i = fusion ? lignes.findIndex((l) => l[conflit] !== undefined && l[conflit] === n[conflit]) : -1
        if (i >= 0) { lignes[i] = { ...lignes[i], ...n }; faits.push(lignes[i]) } else { const l = { [cle]: n[cle] ?? crypto.randomUUID(), ...n }; lignes.push(l); faits.push(l) }
      }
      return { status: 201, body: rendre ? faits : null }
    }
    if (methode === 'PATCH') {
      const vises = filtrer(lignes, requete)
      for (const l of vises) Object.assign(l, corps || {})
      return { status: rendre ? 200 : 204, body: rendre ? vises : null }
    }
    if (methode === 'DELETE') {
      const vises = new Set(filtrer(lignes, requete))
      for (let i = lignes.length - 1; i >= 0; i--) if (vises.has(lignes[i])) lignes.splice(i, 1)
      return { status: rendre ? 200 : 204, body: rendre ? [...vises] : null }
    }
    return { status: 405, body: { code: 'PGRST117', message: `méthode ${methode}` } }
  }
}
/** consommer_limite (0049) sur l'horloge simulée : `max` appels par fenêtre glissante de `p_fenetre_s` secondes et par clé. */
export function limiteur() {
  const vus = new Map()
  const f = (p) => {
    const t = Date.now()
    const l = (vus.get(p.p_cle) || []).filter((x) => x > t - Number(p.p_fenetre_s) * 1000)
    const ok = l.length < Number(p.p_max)
    if (ok) l.push(t)
    vus.set(p.p_cle, l)
    return { status: 200, body: ok }
  }
  f.cles = () => [...vus.keys()]
  f.vus = vus
  return f
}

/**
 * Le stockage factice (Supabase Storage) : buckets connus, objets en mémoire, chaque geste consigné
 * ({ op, bucket, chemin, octets? }). `refuser` : un bucket absent (« Bucket not found »), comme avant 0110.
 */
export function stockageFactice({ buckets = ['usine', 'artisan-media'], objets = {} } = {}) {
  const connus = new Set(buckets)
  const donnees = new Map(Object.entries(objets).map(([k, v]) => [k, Buffer.from(v)]))
  const gestes = []
  const S = { compteur: null }
  const noter = (g) => gestes.push({ rang: S.compteur ? S.compteur() : gestes.length + 1, ...g })
  const introuvable = (res, quoi = 'Object not found') => { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ statusCode: '404', error: 'not_found', message: quoi })) }
  const sansBucket = (res) => { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' })) }
  const json = (res, status, o) => { const t = JSON.stringify(o); res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(t) }); res.end(t) }
  const extraireFichier = (corps, type) => {
    const m = /boundary=([^;]+)/.exec(type || '')
    if (!m) return corps
    const b = Buffer.from(`--${m[1].replace(/^"|"$/g, '')}`)
    const parts = []
    let i = corps.indexOf(b)
    while (i >= 0) { const j = corps.indexOf(b, i + b.length); if (j < 0) break; parts.push(corps.subarray(i + b.length, j)); i = j }
    for (const p of parts) {
      const fin = p.indexOf('\r\n\r\n')
      if (fin < 0) continue
      const tete = p.subarray(0, fin).toString('utf8')
      if (/name="cacheControl"|name="metadata"/.test(tete)) continue
      return p.subarray(fin + 4, p.length - 2)
    }
    return Buffer.alloc(0)
  }
  function servir(req, res, corps) {
    const u = new URL(req.url, 'http://127.0.0.1')
    const p = decodeURIComponent(u.pathname.replace(/^\/storage\/v1/, ''))
    let m
    if ((m = /^\/bucket\/?([^/]*)$/.exec(p)) && req.method === 'GET') {
      noter({ op: 'bucket', bucket: m[1] || '*' })
      if (!m[1]) return json(res, 200, [...connus].map((id) => ({ id, name: id, public: id === 'artisan-media' })))
      return connus.has(m[1]) ? json(res, 200, { id: m[1], name: m[1], public: m[1] === 'artisan-media' }) : sansBucket(res)
    }
    if ((m = /^\/object\/list(?:-v2)?\/([^/]+)$/.exec(p))) {
      let o = {}
      try { o = JSON.parse(corps.toString('utf8') || '{}') } catch { /* vide */ }
      noter({ op: 'list', bucket: m[1], chemin: o.prefix || '' })
      if (!connus.has(m[1])) return sansBucket(res)
      const pre = `${m[1]}/${o.prefix ? `${String(o.prefix).replace(/\/$/, '')}/` : ''}`
      const noms = new Set()
      for (const k of donnees.keys()) if (k.startsWith(pre)) noms.add(k.slice(pre.length).split('/')[0])
      return json(res, 200, [...noms].map((name) => ({ name, id: donnees.has(`${pre}${name}`) ? crypto.randomUUID() : null, metadata: donnees.has(`${pre}${name}`) ? { size: donnees.get(`${pre}${name}`).length } : null })))
    }
    if (p === '/object/copy' || p === '/object/move') {
      let o = {}
      try { o = JSON.parse(corps.toString('utf8') || '{}') } catch { /* vide */ }
      const dest = o.destinationBucket || o.bucketId
      noter({ op: p === '/object/copy' ? 'copy' : 'move', bucket: dest, chemin: o.destinationKey, source: `${o.bucketId}/${o.sourceKey}` })
      if (!connus.has(o.bucketId) || !connus.has(dest)) return sansBucket(res)
      const src = `${o.bucketId}/${o.sourceKey}`
      if (!donnees.has(src)) return introuvable(res)
      donnees.set(`${dest}/${o.destinationKey}`, Buffer.from(donnees.get(src)))
      if (p === '/object/move') donnees.delete(src)
      return json(res, 200, { Key: `${dest}/${o.destinationKey}` })
    }
    if ((m = /^\/object\/info\/(?:public\/|authenticated\/)?([^/]+)\/(.+)$/.exec(p))) {
      noter({ op: 'info', bucket: m[1], chemin: m[2] })
      if (!connus.has(m[1])) return sansBucket(res)
      const k = `${m[1]}/${m[2]}`
      return donnees.has(k) ? json(res, 200, { name: m[2], size: donnees.get(k).length, bucket_id: m[1] }) : introuvable(res)
    }
    if ((m = /^\/object\/(?:(public|authenticated)\/)?([^/]+)(?:\/(.*))?$/.exec(p))) {
      const [, , bucket, chemin = ''] = m
      if (req.method === 'DELETE' && !chemin) {
        let o = {}
        try { o = JSON.parse(corps.toString('utf8') || '{}') } catch { /* vide */ }
        noter({ op: 'remove', bucket, chemin: (o.prefixes || []).join(',') })
        if (!connus.has(bucket)) return sansBucket(res)
        for (const x of o.prefixes || []) donnees.delete(`${bucket}/${x}`)
        return json(res, 200, (o.prefixes || []).map((name) => ({ name })))
      }
      const k = `${bucket}/${chemin}`
      if (req.method === 'HEAD' || req.method === 'GET') {
        noter({ op: req.method === 'HEAD' ? 'exists' : 'download', bucket, chemin })
        if (!connus.has(bucket)) return sansBucket(res)
        if (!donnees.has(k)) { if (req.method === 'HEAD') { res.writeHead(404); return res.end() } return introuvable(res) }
        const b = donnees.get(k)
        res.writeHead(200, { 'content-type': /\.json$/.test(chemin) ? 'application/json' : /\.jpe?g$/.test(chemin) ? 'image/jpeg' : 'application/octet-stream', 'content-length': b.length })
        return res.end(req.method === 'HEAD' ? undefined : b)
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        const octets = extraireFichier(corps, req.headers['content-type'])
        noter({ op: 'upload', bucket, chemin, octets: octets.length, upsert: req.method === 'PUT' || req.headers['x-upsert'] === 'true' })
        if (!connus.has(bucket)) return sansBucket(res)
        if (req.method === 'POST' && donnees.has(k) && req.headers['x-upsert'] !== 'true') return json(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' })
        donnees.set(k, octets)
        return json(res, 200, { Id: crypto.randomUUID(), Key: k })
      }
    }
    noter({ op: 'inconnu', bucket: null, chemin: `${req.method} ${p}` })
    return json(res, 404, { statusCode: '404', error: 'not_found', message: `chemin inconnu du stockage factice : ${p}` })
  }
  return Object.assign(S, { connus, donnees, gestes, servir, lire: (bucket, chemin) => donnees.get(`${bucket}/${chemin}`) ?? null })
}

/**
 * La base factice : le faux PostgREST (contrat-ops.json + FONCTIONS_04 + `fonctions`), des `tables`, et, si `stockage` est
 * donné (stockageFactice()), un serveur de tête qui sert /storage/v1 et relaie /rest/v1 au faux PostgREST. Pose
 * NEXT_PUBLIC_SUPABASE_URL et une clé factice AVANT l'import du code jugé. → { fp, url, rpc(nom), tables, arreter() }
 */
export async function demarrerBase({ reponses = {}, tables = {}, fonctions = {}, stockage = null } = {}) {
  const { demarrer } = await import(pathToFileURL(FAUX_POSTGREST).href)
  const contrat = C.lireContrat()
  contrat.fonctions = { ...contrat.fonctions, ...FONCTIONS_04, ...fonctions }
  let seq = 0
  const fp = await demarrer({ contrat, reponses, tables, compteur: () => ++seq })
  let url = fp.url, tete = null
  if (stockage) {
    stockage.compteur = () => ++seq
    const cible = new URL(fp.url)
    tete = http.createServer((req, res) => {
      const morceaux = []
      req.on('data', (d) => morceaux.push(d))
      req.on('end', () => {
        const corps = Buffer.concat(morceaux)
        if (req.url.startsWith('/storage/v1')) { try { stockage.servir(req, res, corps) } catch (e) { res.writeHead(500); res.end(String(e.message)) } return }
        const r = http.request({ hostname: cible.hostname, port: cible.port, path: req.url, method: req.method, headers: { ...req.headers, host: cible.host } }, (rr) => { res.writeHead(rr.statusCode, rr.headers); rr.pipe(res) })
        r.on('error', (e) => { res.writeHead(502); res.end(e.message) })
        r.end(corps)
      })
    })
    await new Promise((ok, ko) => { tete.once('error', ko); tete.listen(0, '127.0.0.1', ok) })
    url = `http://127.0.0.1:${tete.address().port}`
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = url
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'cle-factice-juge'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'cle-factice-anon'
  return {
    fp, url,
    rpc: (nom) => fp.appels.filter((a) => a.fonction === nom),
    fonctionsAppelees: () => [...new Set(fp.appels.map((a) => a.fonction).filter(Boolean))],
    arreter: async () => {
      if (tete) await new Promise((ok) => { tete.closeAllConnections?.(); tete.close(() => ok()) })
      await fp.arreter()
    },
  }
}

// ── Lecture statique ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Le texte d'un fichier TypeScript sans ses commentaires (les chaînes restent). */
export const sansCommentaires = (t) => C.sansCommentairesTs(t)
/** Les fonctions (déclarations « function nom » et « export async function nom ») d'un texte, sans commentaires, par nom. */
export function corpsDeFonctions(texte, noms) {
  const src = sansCommentaires(C.lf(texte))
  const out = {}
  for (const n of noms) {
    const m = new RegExp(`(?:^|\\n)(?:export\\s+)?(?:async\\s+)?function\\s+${n}\\s*\\(`).exec(src)
    if (!m) { out[n] = null; continue }
    // les paramètres peuvent porter des accolades (types) : le corps commence à la première accolade après la parenthèse
    // qui les ferme
    let prof = 0, j = m.index + m[0].length - 1
    for (; j < src.length; j++) { if (src[j] === '(') prof++; else if (src[j] === ')') { prof--; if (prof === 0) break } }
    const i = src.indexOf('{', j)
    prof = 0
    let f = i
    for (; f < src.length; f++) { if (src[f] === '{') prof++; else if (src[f] === '}') { prof--; if (prof === 0) break } }
    out[n] = src.slice(m.index, f + 1).replace(/\s+/g, ' ').trim()
  }
  return out
}

// ── --reel : .env.local sans rien afficher ───────────────────────────────────────────────────────────────────────────
export function lireEnvLocal() {
  const env = {}
  try { for (const l of fs.readFileSync(path.join(C.R, '.env.local'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') } } catch { /* absent */ }
  return env
}
/** La clé de service et l'adresse du projet, avec priorité à l'environnement (la preuve y pose des canaris). */
export function clesReelles() {
  const f = lireEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || f.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || f.SUPABASE_SERVICE_ROLE_KEY
  return { url, service, cron: process.env.CRON_SECRET || f.CRON_SECRET }
}
/** Retire toute valeur secrète d'un texte avant de l'afficher. */
export function masquer(texte, secrets) {
  let t = String(texte ?? '')
  for (const s of secrets) if (s && s.length >= 6) t = t.split(s).join('[masqué]')
  return t
}

// ── L'identité du fichier lancé ──────────────────────────────────────────────────────────────────────────────────────
export const estLance = (fichier) => {
  if (!process.argv[1]) return false
  const a = path.resolve(process.argv[1]), b = path.resolve(fichier)
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}
