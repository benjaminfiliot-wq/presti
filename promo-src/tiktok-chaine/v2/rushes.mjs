#!/usr/bin/env node
// Rushes de la méthode v2 : les VIDÉOS RÉELLES du produit, prises chez le fournisseur, avec leur provenance.
//
//   node promo-src/tiktok-chaine/v2/rushes.mjs            → rapatrie (ou vérifie) chaque rush de provenance.json
//   node promo-src/tiktok-chaine/v2/rushes.mjs --chercher <pid> [<pid>…]
//        → liste les vidéos CJ d'un produit (API queryVideosByProductId), sans rien télécharger
//
// Règle : un rush vient du FOURNISSEUR (vidéo produit mise à disposition des revendeurs), jamais d'un créateur
// TikTok / YouTube tiers. Chaque rush est noté dans provenance.json : source, identifiant, licence relevée
// (CJ : isFree = 1, copyrightBuyType = 1 « gratuit »), modèle vérifié à l'image, plans écartés et pourquoi.
// La clé CJ est lue dans presti-secrets/cj api.txt (BOM retiré), jamais affichée ni écrite ailleurs ; le jeton
// d'accès est gardé dans cache/ (non versionné).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const CHAINE = path.resolve(ICI, '..')
export const PROVENANCE = path.join(ICI, 'provenance.json')
export const DOSSIER_RUSHES = process.env.TIKTOK_RUSHES || path.join(CHAINE, 'cache', 'rushes')
const API = 'https://developers.cjdropshipping.com/api2.0/v1'
const SECRETS = process.env.PRESTI_SECRETS || path.resolve(CHAINE, '..', '..', '..', 'presti-secrets')

export const lireProvenance = () => JSON.parse(fs.readFileSync(PROVENANCE, 'utf8'))
export const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
export const cheminRush = (r) => path.join(DOSSIER_RUSHES, r.fichier)

async function jetonCJ() {
  const cache = path.join(CHAINE, 'cache', 'cj-jeton.json')
  try { const c = JSON.parse(fs.readFileSync(cache, 'utf8')); if (Date.now() < c.expire) return c.jeton } catch {}
  const brut = fs.readFileSync(path.join(SECRETS, 'cj api.txt'), 'utf8').replace(/^﻿/, '')
  const cle = brut.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 20 && !s.includes(' ')) || brut.trim()
  const r = await fetch(`${API}/authentication/getAccessToken`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ apiKey: cle }) })
  const j = await r.json()
  if (!j.data?.accessToken) throw new Error(`CJ : authentification refusée (${j.code} ${j.message})`)
  fs.mkdirSync(path.dirname(cache), { recursive: true })
  fs.writeFileSync(cache, JSON.stringify({ jeton: j.data.accessToken, expire: Date.now() + 10 * 24 * 3600e3 }))
  return j.data.accessToken
}

export async function videosCJ(pid) {
  const r = await fetch(`${API}/product/queryVideosByProductId`, { method: 'POST', headers: { 'CJ-Access-Token': await jetonCJ(), 'content-type': 'application/json' }, body: JSON.stringify({ productId: pid }) })
  const j = await r.json()
  if (j.code !== 0 && j.code !== 200) throw new Error(`CJ queryVideosByProductId ${pid} : ${j.code} ${j.message}`)
  return j.data || []
}

async function rapatrier() {
  const P = lireProvenance()
  fs.mkdirSync(DOSSIER_RUSHES, { recursive: true })
  let ko = 0
  for (const r of P.rushes) {
    const f = cheminRush(r)
    if (fs.existsSync(f) && sha256(f) === r.sha256) { console.log(`ok        ${r.id} (${r.fichier})`); continue }
    if (r.source !== 'cj_queryVideosByProductId') { console.log(`MANQUANT  ${r.id} : source ${r.source} non rapatriable ici`); ko++; continue }
    const v = (await videosCJ(r.pid)).find((x) => x.videoId === r.videoId)
    if (!v) { console.log(`MANQUANT  ${r.id} : la vidéo ${r.videoId} n'est plus listée chez CJ`); ko++; continue }
    if (String(v.isFree) !== '1') { console.log(`REFUSÉ    ${r.id} : la vidéo n'est plus gratuite (isFree=${v.isFree})`); ko++; continue }
    // La doc CJ (6.1) exige le Referer du portail développeur pour télécharger.
    const rep = await fetch(v.videoUrl, { headers: { Referer: 'https://developers.cjdropshipping.com/' } })
    if (!rep.ok) { console.log(`ÉCHEC     ${r.id} : HTTP ${rep.status}`); ko++; continue }
    fs.writeFileSync(f, Buffer.from(await rep.arrayBuffer()))
    const h = sha256(f)
    console.log(`${h === r.sha256 ? 'rapatrié ' : 'CHANGÉ   '} ${r.id} (${r.fichier})${h === r.sha256 ? '' : ' — empreinte différente : revoir les plans à l\'image avant tout rendu'}`)
    if (h !== r.sha256) ko++
  }
  if (ko) process.exitCode = 1
}

async function chercher(pids) {
  for (const pid of pids) {
    for (const v of await videosCJ(pid)) {
      console.log([pid, v.videoId, `${v.duration}s`, `${v.width}x${v.height}`, `isFree=${v.isFree}`, `copyrightBuyType=${v.copyrightBuyType}`, `type=${v.videoType}`, v.videoState].join('  '))
    }
    await new Promise((r) => setTimeout(r, 1200))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2)
  ;(a[0] === '--chercher' ? chercher(a.slice(1)) : rapatrier()).catch((e) => { console.error(e.message); process.exitCode = 1 })
}
