#!/usr/bin/env node
// Faux bus du juge savoir-recherche-qa (026-232) : un serveur HTTP sur 127.0.0.1 (port libre) qui joue la route
// POST /api/agents/evenements de 026-042, PLUS STRICTE qu'elle sur les champs (voulu, fiche) : corps JSON objet dont les
// clés sont exactement parmi { type, objet, resume }, `type` ^[a-z_]{2,40}$, `resume` de 1 à 200 signes, `objet` chaîne
// ou null ; `Authorization: Bearer <jeton>` exigé. Tout le reste → 400 (ou 401 sans jeton, 404 hors route).
//
// Environnement : FAUX_BUS_PORT (fichier où écrire le port), FAUX_BUS_JOURNAL (une ligne JSON par requête reçue),
// FAUX_BUS_MODE = accepte | refuse (refuse : 400 à tout, pour le code 3 de chercher.mjs).
// Le journal ne garde JAMAIS le jeton : seulement l'empreinte sha256 de l'en-tête Authorization, que le juge compare.
import http from 'node:http'
import fs from 'node:fs'
import crypto from 'node:crypto'

const JOURNAL = process.env.FAUX_BUS_JOURNAL
const MODE = process.env.FAUX_BUS_MODE === 'refuse' ? 'refuse' : 'accepte'
const CLES = new Set(['type', 'objet', 'resume'])
let n = 0

function noter(x) { if (JOURNAL) fs.appendFileSync(JOURNAL, `${JSON.stringify(x)}\n`) }
function valider(corps) {
  if (!corps || typeof corps !== 'object' || Array.isArray(corps)) return 'corps_invalide'
  for (const k of Object.keys(corps)) if (!CLES.has(k)) return `champ_inconnu:${k}`
  if (typeof corps.type !== 'string' || !/^[a-z_]{2,40}$/.test(corps.type)) return 'type_invalide'
  if (typeof corps.resume !== 'string' || !corps.resume.trim() || corps.resume.length > 200) return 'resume_invalide'
  if (corps.objet !== undefined && corps.objet !== null && typeof corps.objet !== 'string') return 'objet_invalide'
  return null
}

const serveur = http.createServer((req, res) => {
  const morceaux = []
  req.on('data', (d) => morceaux.push(d))
  req.on('end', () => {
    const brut = Buffer.concat(morceaux).toString('utf8')
    const auth = String(req.headers.authorization || '')
    const entree = { le: new Date().toISOString(), methode: req.method, url: req.url, autorisation_sha256: auth ? crypto.createHash('sha256').update(auth).digest('hex') : null, type_contenu: String(req.headers['content-type'] || ''), corps: brut }
    const repondre = (statut, obj) => { noter({ ...entree, statut }); res.writeHead(statut, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)) }
    if (req.method !== 'POST' || req.url !== '/api/agents/evenements') return repondre(404, { error: 'introuvable' })
    if (!/^Bearer \S+$/.test(auth)) return repondre(401, { error: 'non_authentifie' })
    if (MODE === 'refuse') return repondre(400, { error: 'refus_essai' })
    let corps
    try { corps = JSON.parse(brut) } catch { return repondre(400, { error: 'json_invalide' }) }
    const faute = valider(corps)
    if (faute) return repondre(400, { error: faute })
    n += 1
    return repondre(200, { id: n })
  })
})
serveur.listen(0, '127.0.0.1', () => {
  if (process.env.FAUX_BUS_PORT) fs.writeFileSync(process.env.FAUX_BUS_PORT, String(serveur.address().port))
})
