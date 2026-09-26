#!/usr/bin/env node
// Faux bus des agents du juge du socle de l'usine (026-048) : un serveur HTTP local, sur un port libre de 127.0.0.1, qui
// sert les trois routes que la surveillance appelle, avec LE CONTRAT DES CORPS de 026-042 (et de 0098 pour les décisions) :
//   POST /api/agents/battement    aucun corps (vide ou {}) → 200 { ok: true }
//   POST /api/agents/evenements   { type, objet?, resume, tache? } → 201 { id }
//   POST /api/agents/decisions    { question, contexte?, options: [{ cle, libelle, recommandee }], defaut, montant_cents?,
//                                   portee, echeance, cle, tache? } → 201 { id, creee: true } ; clé déjà vue → 200 { id, creee: false }
// Un champ inconnu ou hors bornes → 400 { erreur, champ } (le nom du champ, jamais sa valeur) ; JSON invalide → 400 ;
// plus de 16 Ko → 413 ; sans le bon `Authorization: Bearer <jeton>` → 401 ; mode 503 → 503 partout ; autre route → 404.
// Chaque requête est consignée { n, le, methode, route, statut, jeton: 'bon' | 'faux' | 'absent', corps, erreur?, champ? },
// SANS la valeur du jeton. Le faux bus du chef (026-102) n'existe pas encore : la validation est écrite ici et exportée
// (`validerCorps`), pour qu'il l'importe plutôt que de la recopier.
//
// Usage dans un juge : const bus = await demarrerFauxBus({ jeton, maintenant }) ; bus.url ; bus.requetes ;
//   bus.fixer({ mode: '503' | 'normal', maintenant: Date | ISO, jeton }) ; await bus.fermer()
// Seul : node faux-bus.mjs [--mode=503] [--journal=<fichier.jsonl>]  (jeton dans FAUX_BUS_JETON, port libre) ; imprime { url }.
import http from 'node:http'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

export const ROUTES = ['/api/agents/battement', '/api/agents/evenements', '/api/agents/decisions']
export const PORTEES = ['aucune', 'argent', 'artisan', 'securite']
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RE_TYPE = /^[a-z_]{2,40}$/
const RE_CLE_OPTION = /^[a-z_]{2,30}$/
const HEURE = 3600_000
const JOUR = 24 * HEURE
const MAX_OCTETS = 16 * 1024

const texte = (v, min, max) => typeof v === 'string' && v.length >= min && v.length <= max
const refus = (erreur, champ) => ({ ok: false, statut: 400, erreur, champ })

/** Le contrat des corps (026-042, 0098). `maintenant` borne l'échéance d'une décision (+1 h à +30 j). */
export function validerCorps(route, corps, maintenant = new Date()) {
  if (route === '/api/agents/battement') {
    if (corps === undefined || corps === null) return { ok: true }
    if (typeof corps !== 'object' || Array.isArray(corps)) return refus('corps_invalide', 'corps')
    const k = Object.keys(corps)
    return k.length ? refus('champ_inconnu', k[0]) : { ok: true }
  }
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return refus('corps_invalide', 'corps')
  if (route === '/api/agents/evenements') {
    for (const k of Object.keys(corps)) if (!['type', 'objet', 'resume', 'tache'].includes(k)) return refus('champ_inconnu', k)
    if (typeof corps.type !== 'string' || !RE_TYPE.test(corps.type)) return refus('champ_invalide', 'type')
    if (corps.objet !== undefined && !texte(corps.objet, 1, 200)) return refus('champ_invalide', 'objet')
    if (!texte(corps.resume, 1, 200)) return refus('champ_invalide', 'resume')
    if (corps.tache !== undefined && !(typeof corps.tache === 'string' && RE_UUID.test(corps.tache))) return refus('champ_invalide', 'tache')
    return { ok: true }
  }
  if (route === '/api/agents/decisions') {
    const permis = ['question', 'contexte', 'options', 'defaut', 'montant_cents', 'portee', 'echeance', 'cle', 'tache']
    for (const k of Object.keys(corps)) if (!permis.includes(k)) return refus('champ_inconnu', k)
    if (!texte(corps.question, 5, 300)) return refus('champ_invalide', 'question')
    if (corps.contexte !== undefined && !texte(corps.contexte, 0, 2000)) return refus('champ_invalide', 'contexte')
    const o = corps.options
    if (!Array.isArray(o) || o.length < 2 || o.length > 3) return refus('champ_invalide', 'options')
    const cles = new Set()
    let recommandees = 0
    for (const x of o) {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return refus('champ_invalide', 'options')
      for (const k of Object.keys(x)) if (!['cle', 'libelle', 'recommandee'].includes(k)) return refus('champ_inconnu', `options.${k}`)
      if (typeof x.cle !== 'string' || !RE_CLE_OPTION.test(x.cle) || cles.has(x.cle)) return refus('champ_invalide', 'options.cle')
      if (!texte(x.libelle, 1, 80)) return refus('champ_invalide', 'options.libelle')
      if (typeof x.recommandee !== 'boolean') return refus('champ_invalide', 'options.recommandee')
      cles.add(x.cle)
      if (x.recommandee) recommandees++
    }
    if (recommandees !== 1) return refus('champ_invalide', 'options.recommandee')
    if (typeof corps.defaut !== 'string' || !cles.has(corps.defaut)) return refus('champ_invalide', 'defaut')
    if (corps.montant_cents !== undefined && !(Number.isInteger(corps.montant_cents) && corps.montant_cents >= 0)) return refus('champ_invalide', 'montant_cents')
    if (!PORTEES.includes(corps.portee)) return refus('champ_invalide', 'portee')
    const e = typeof corps.echeance === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(corps.echeance) ? Date.parse(corps.echeance) : NaN
    const t = new Date(maintenant).getTime()
    if (!Number.isFinite(e) || e < t + HEURE || e > t + 30 * JOUR) return refus('champ_invalide', 'echeance')
    if (!texte(corps.cle, 1, 200)) return refus('champ_invalide', 'cle')
    if (corps.tache !== undefined && !(typeof corps.tache === 'string' && RE_UUID.test(corps.tache))) return refus('champ_invalide', 'tache')
    return { ok: true }
  }
  return { ok: false, statut: 404, erreur: 'route_inconnue' }
}

export function demarrerFauxBus({ jeton, mode = 'normal', maintenant = null, journal = null } = {}) {
  const etat = { jeton, mode, maintenant }
  const requetes = []
  const decisions = new Map() // cle → id
  let n = 0
  const consigner = (r) => {
    requetes.push(r)
    if (journal) { try { fs.appendFileSync(journal, `${JSON.stringify(r)}\n`) } catch { /* journal facultatif */ } }
  }
  const serveur = http.createServer((req, res) => {
    const morceaux = []
    let octets = 0
    let trop = false
    req.on('data', (d) => { octets += d.length; if (octets > MAX_OCTETS) trop = true; else morceaux.push(d) })
    req.on('end', () => {
      const route = String(req.url || '').split('?')[0]
      const auth = String(req.headers.authorization || '')
      const jetonVu = !auth ? 'absent' : (etat.jeton && auth === `Bearer ${etat.jeton}` ? 'bon' : 'faux')
      const r = { n: ++n, le: new Date().toISOString(), methode: req.method, route, statut: 0, jeton: jetonVu, corps: null }
      const repondre = (statut, objet) => {
        r.statut = statut
        consigner(r)
        res.writeHead(statut, { 'content-type': 'application/json' })
        res.end(JSON.stringify(objet))
      }
      if (etat.mode === '503') return repondre(503, { erreur: 'indisponible' })
      if (req.method !== 'POST' || !ROUTES.includes(route)) return repondre(404, { erreur: 'route_inconnue' })
      if (jetonVu !== 'bon') return repondre(401, { erreur: 'jeton' })
      if (trop) return repondre(413, { erreur: 'trop_grand' })
      const brut = Buffer.concat(morceaux).toString('utf8')
      let corps
      if (brut.trim() === '') corps = undefined
      else {
        try { corps = JSON.parse(brut) } catch { r.erreur = 'json'; return repondre(400, { erreur: 'json' }) }
      }
      r.corps = corps === undefined ? null : corps
      const v = validerCorps(route, corps, etat.maintenant || new Date())
      if (!v.ok) { r.erreur = v.erreur; r.champ = v.champ; return repondre(v.statut, { erreur: v.erreur, champ: v.champ }) }
      if (route === '/api/agents/battement') return repondre(200, { ok: true })
      if (route === '/api/agents/evenements') return repondre(201, { id: `evt-${r.n}` })
      const connu = decisions.get(corps.cle)
      if (connu) { r.creee = false; return repondre(200, { id: connu, creee: false }) }
      const id = `dec-${decisions.size + 1}`
      decisions.set(corps.cle, id)
      r.creee = true
      return repondre(201, { id, creee: true })
    })
  })
  return new Promise((resoudre, rejeter) => {
    serveur.on('error', rejeter)
    serveur.listen(0, '127.0.0.1', () => {
      const { port } = serveur.address()
      resoudre({
        url: `http://127.0.0.1:${port}`,
        port,
        requetes,
        decisions,
        fixer(changements) { Object.assign(etat, changements) },
        fermer() { return new Promise((ok) => { serveur.closeAllConnections?.(); serveur.close(() => ok()) }) },
      })
    })
  })
}

// Lancé seul : sert jusqu'à ce qu'on le tue.
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const opt = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, ...v]) => [k, v.join('=') || true]))
  const bus = await demarrerFauxBus({ jeton: process.env.FAUX_BUS_JETON || null, mode: opt.mode === '503' ? '503' : 'normal', journal: typeof opt.journal === 'string' ? opt.journal : null })
  process.stdout.write(`${JSON.stringify({ url: bus.url })}\n`)
}
