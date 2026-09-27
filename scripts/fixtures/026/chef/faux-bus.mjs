// scripts/fixtures/026/chef/faux-bus.mjs — le faux bus des agents du chef « Matt » (fiche 026-102, écrite par Claude Code).
//
// Serveur HTTP local (127.0.0.1, port libre), démarré DANS le processus du juge : il compte ce qu'il REÇOIT, jamais ce
// qu'un script dit avoir envoyé. Il reprend les routes et les corps de 026-042 (contrat des routes du bus, sur les
// fonctions de contrat-ops.json, 026-009), et il est PLUS STRICT que la route sur les champs inconnus : il ne laisse
// jamais passer un corps que la production refuserait.
//
//   GET  /api/agents/etat                         → 200, la fixture (etat.json ou etat-chef-recent.json), dates relatives
//                                                   matérialisées ; `dernierEvenementId` ajoute dernier_evenement_id
//   GET  /api/agents/evenements?apres=<id>&limite=<n>
//                                                 → 200 { evenements: [{ id, le, agent, type, objet, resume, tache_id }] }
//                                                   id > apres, SANS ceux de l'agent du jeton (ops_evenements_lire),
//                                                   par id croissant ; limite de 1 à 200 (absente : 50), apres entier ≥ 0,
//                                                   sinon 400 ; `sansFin` : chaque page est pleine (au-delà de la fixture)
//   POST /api/agents/taches      { type, cle, capacite, charge?, origine?, objet? }
//   POST /api/agents/decisions   { question, contexte?, options: [{ cle, libelle, recommandee }], defaut, montant_cents?,
//                                  portee, echeance, cle, tache? }
//                                                 → 201 { id, creee: true } ; clé déjà vue → 200 { id, creee: false }
//                                                   (AR-12 de 026-042, jamais 409) ; écart → 400 { error, champ }
//   POST /api/agents/evenements  { type, objet?, resume, tache? } → 201 { id } (id croissant, après la fixture)
//   POST /api/agents/battement   (sans corps, ou {})                 → 200 { le }
// Toute requête sans `Authorization: Bearer <jeton>` exact → 401. Corps de plus de 16 Ko → 413 ; JSON illisible → 400.
// `mode429: n` → 429 à partir de la n-ième requête (toutes méthodes). `forcer: { 'POST /api/agents/taches': 409 }` → ce
// code pour cette route. Chaque requête est consignée : { n, le, methode, chemin, requete, hote, entetes (sans la
// valeur du jeton), corps, statut, reponse }.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { materialiser } from './plans.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const ROUTES = ['/api/agents/etat', '/api/agents/evenements', '/api/agents/taches', '/api/agents/decisions', '/api/agents/battement']
const TYPE_RE = /^[a-z_]{2,40}$/
const CLE_OPTION_RE = /^[a-z_]{2,30}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PORTEES = ['aucune', 'argent', 'artisan', 'securite']
const HEURE = 3_600_000

const lireFixture = (nom) => JSON.parse(fs.readFileSync(path.join(ICI, nom), 'utf8'))
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const signes = (s) => [...s].length

function champsInconnus(corps, permis) { return Object.keys(corps).find((k) => !permis.includes(k)) }
function texte(corps, champ, { requis = false, min = 0, max = Infinity } = {}) {
  if (!(champ in corps)) return requis ? champ : null
  const v = corps[champ]
  if (typeof v !== 'string' || signes(v) < min || signes(v) > max) return champ
  return null
}

// ── validation des corps : le contrat des routes de 026-042 ──────────────────────────────────────────────────────
export function validerTache(corps) {
  if (!estObjet(corps)) return 'corps'
  const inconnu = champsInconnus(corps, ['type', 'cle', 'capacite', 'charge', 'origine', 'objet'])
  if (inconnu) return inconnu
  if (typeof corps.type !== 'string' || !TYPE_RE.test(corps.type)) return 'type'
  if (typeof corps.capacite !== 'string' || !TYPE_RE.test(corps.capacite)) return 'capacite'
  const c = texte(corps, 'cle', { requis: true, min: 3, max: 200 }); if (c) return c
  if ('charge' in corps && (!estObjet(corps.charge) || Buffer.byteLength(JSON.stringify(corps.charge)) > 8192)) return 'charge'
  if ('origine' in corps && (typeof corps.origine !== 'string' || !UUID_RE.test(corps.origine))) return 'origine'
  const o = texte(corps, 'objet', { max: 200 }); if (o) return o
  return null
}
export function validerDecision(corps, maintenant = new Date()) {
  if (!estObjet(corps)) return 'corps'
  const inconnu = champsInconnus(corps, ['question', 'contexte', 'options', 'defaut', 'montant_cents', 'portee', 'echeance', 'cle', 'tache'])
  if (inconnu) return inconnu
  const q = texte(corps, 'question', { requis: true, min: 5, max: 300 }); if (q) return q
  const cx = texte(corps, 'contexte', { max: 2000 }); if (cx) return cx
  const o = corps.options
  if (!Array.isArray(o) || o.length < 2 || o.length > 3) return 'options'
  for (const op of o) {
    if (!estObjet(op)) return 'options'
    const inc = champsInconnus(op, ['cle', 'libelle', 'recommandee'])
    if (inc) return `options.${inc}`
    if (typeof op.cle !== 'string' || !CLE_OPTION_RE.test(op.cle)) return 'options.cle'
    if (typeof op.libelle !== 'string' || signes(op.libelle) < 1 || signes(op.libelle) > 80) return 'options.libelle'
    if (typeof op.recommandee !== 'boolean') return 'options.recommandee'
  }
  if (new Set(o.map((x) => x.cle)).size !== o.length) return 'options.cle'
  if (o.filter((x) => x.recommandee).length !== 1) return 'options.recommandee'
  if (typeof corps.defaut !== 'string' || !o.some((x) => x.cle === corps.defaut)) return 'defaut'
  if ('montant_cents' in corps && (!Number.isInteger(corps.montant_cents) || corps.montant_cents < 0)) return 'montant_cents'
  if (!PORTEES.includes(corps.portee)) return 'portee'
  const e = typeof corps.echeance === 'string' ? Date.parse(corps.echeance) : NaN
  if (!Number.isFinite(e) || e < maintenant.getTime() + HEURE - 60_000 || e > maintenant.getTime() + 30 * 24 * HEURE) return 'echeance'
  const c = texte(corps, 'cle', { requis: true, min: 3, max: 200 }); if (c) return c
  if ('tache' in corps && (typeof corps.tache !== 'string' || !UUID_RE.test(corps.tache))) return 'tache'
  return null
}
export function validerEvenement(corps) {
  if (!estObjet(corps)) return 'corps'
  const inconnu = champsInconnus(corps, ['type', 'objet', 'resume', 'tache'])
  if (inconnu) return inconnu
  if (typeof corps.type !== 'string' || !TYPE_RE.test(corps.type)) return 'type'
  const r = texte(corps, 'resume', { requis: true, min: 1, max: 200 }); if (r) return r
  const o = texte(corps, 'objet', { max: 200 }); if (o) return o
  if ('tache' in corps && (typeof corps.tache !== 'string' || !UUID_RE.test(corps.tache))) return 'tache'
  return null
}

// ── le serveur ────────────────────────────────────────────────────────────────────────────────────────────────────
export async function demarrerFauxBus(options = {}) {
  const etat = {
    jeton: options.jeton,
    agent: options.agent || 'chef',
    etat: options.etat || 'etat.json',
    evenements: options.evenements || lireFixture('evenements.json'),
    mode429: options.mode429 ?? null,
    forcer: options.forcer || {},
    sansFin: Boolean(options.sansFin),
    dernierEvenementId: options.dernierEvenementId ?? null,
  }
  if (!etat.jeton) throw new Error('faux bus : jeton requis')
  const requetes = []
  const taches = new Map()
  const decisions = new Map()
  const evenementsPostes = []
  const lectures = [] // { apres, limite, ids } : ce que chaque lecture a rendu
  let prochainId = Math.max(0, ...etat.evenements.map((e) => e.id)) + 1

  const serveur = http.createServer((req, res) => {
    const morceaux = []
    let taille = 0
    req.on('data', (d) => { taille += d.length; if (taille <= 17 * 1024) morceaux.push(d) })
    req.on('end', () => {
      const url = new URL(req.url, 'http://127.0.0.1')
      const auth = req.headers.authorization
      const entetes = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, k === 'authorization' ? (v === `Bearer ${etat.jeton}` ? 'Bearer <jeton-essai>' : 'Bearer <autre>') : v]))
      const brut = Buffer.concat(morceaux).toString('utf8')
      let corps = null
      let illisible = false
      if (brut.trim()) { try { corps = JSON.parse(brut) } catch { illisible = true } }
      const ligne = { n: requetes.length + 1, le: new Date().toISOString(), t: Date.now(), methode: req.method, chemin: url.pathname, requete: url.search, hote: req.headers.host, entetes, jeton: !auth ? 'absent' : auth === `Bearer ${etat.jeton}` ? 'bon' : 'faux', corps: illisible ? { illisible: true } : corps }
      requetes.push(ligne)
      const repondre = (statut, json) => {
        ligne.statut = statut
        ligne.reponse = json
        res.writeHead(statut, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(json))
      }
      if (ligne.jeton !== 'bon') return repondre(401, { error: 'jeton' })
      if (etat.mode429 && ligne.n >= etat.mode429) return repondre(429, { error: 'quota', code: 'ops:quota' })
      const cle = `${req.method} ${url.pathname}`
      if (etat.forcer[cle]) return repondre(etat.forcer[cle], { error: 'force', code: `essai:${etat.forcer[cle]}` })
      if (taille > 16 * 1024) return repondre(413, { error: 'trop_grand' })
      if (illisible) return repondre(400, { error: 'json', champ: 'corps' })
      const maintenant = new Date()

      if (cle === 'GET /api/agents/etat') {
        const e = materialiser(typeof etat.etat === 'string' ? lireFixture(etat.etat) : etat.etat, { maintenant })
        if (etat.dernierEvenementId !== null) e.dernier_evenement_id = etat.dernierEvenementId
        return repondre(200, e)
      }
      if (cle === 'GET /api/agents/evenements') {
        const pa = url.searchParams.get('apres') ?? '0'
        const pl = url.searchParams.get('limite') ?? '50'
        if (!/^\d+$/.test(pa)) return repondre(400, { error: 'parametre', champ: 'apres' })
        if (!/^\d+$/.test(pl) || Number(pl) < 1 || Number(pl) > 200) return repondre(400, { error: 'parametre', champ: 'limite' })
        const apres = Number(pa)
        const limite = Number(pl)
        let rendus
        if (etat.sansFin) {
          rendus = Array.from({ length: limite }, (_, i) => ({ id: apres + i + 1, le: maintenant.toISOString(), agent: 'a0', type: 'notification', objet: 'veille', resume: 'Événement témoin sans fin.', tache_id: null }))
        } else {
          rendus = etat.evenements.filter((e) => e.id > apres && e.agent !== etat.agent).sort((a, b) => a.id - b.id).slice(0, limite)
        }
        lectures.push({ apres, limite, ids: rendus.map((e) => e.id) })
        return repondre(200, { evenements: rendus })
      }
      if (cle === 'POST /api/agents/taches') {
        const faute = validerTache(corps)
        if (faute) return repondre(400, { error: 'corps', champ: faute })
        if (taches.has(corps.cle)) return repondre(200, { id: taches.get(corps.cle).id, creee: false })
        const id = crypto.randomUUID()
        taches.set(corps.cle, { id, corps })
        return repondre(201, { id, creee: true })
      }
      if (cle === 'POST /api/agents/decisions') {
        const faute = validerDecision(corps, maintenant)
        if (faute) return repondre(400, { error: 'corps', champ: faute })
        if (decisions.has(corps.cle)) return repondre(200, { id: decisions.get(corps.cle).id, creee: false })
        const id = crypto.randomUUID()
        decisions.set(corps.cle, { id, corps })
        return repondre(201, { id, creee: true })
      }
      if (cle === 'POST /api/agents/evenements') {
        const faute = validerEvenement(corps)
        if (faute) return repondre(400, { error: 'corps', champ: faute })
        const id = prochainId++
        evenementsPostes.push({ id, ...corps })
        return repondre(201, { id })
      }
      if (cle === 'POST /api/agents/battement') {
        if (corps !== null && !(estObjet(corps) && Object.keys(corps).length === 0)) return repondre(400, { error: 'corps', champ: Object.keys(corps || {})[0] || 'corps' })
        return repondre(200, { le: maintenant.toISOString() })
      }
      return repondre(404, { error: 'route' })
    })
  })
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok) })
  const port = serveur.address().port
  return {
    port,
    base: `http://127.0.0.1:${port}`,
    requetes,
    taches,
    decisions,
    evenementsPostes,
    lectures,
    ecritures: () => requetes.filter((r) => r.methode !== 'GET'),
    fixer(changements) { Object.assign(etat, changements) },
    preconnaitre({ taches: t = [], decisions: d = [] } = {}) {
      for (const c of t) taches.set(c, { id: crypto.randomUUID(), corps: null })
      for (const c of d) decisions.set(c, { id: crypto.randomUUID(), corps: null })
    },
    fermer: () => new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) }),
  }
}
