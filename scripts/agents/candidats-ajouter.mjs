#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = fs.realpathSync(process.cwd())
const fichier = process.argv.slice(2).find((a) => !a.startsWith('--'))
const sec = process.argv.includes('--sec')
const refuser = (message) => { console.error(message); process.exit(2) }
if (!fichier || process.argv.slice(2).some((a) => a.startsWith('--') && a !== '--sec')) refuser('Usage : candidats-ajouter.mjs <fichier.csv> [--sec]')
let contenu
try {
  const reel = fs.realpathSync(path.resolve(fichier))
  if (reel === racine || reel.startsWith(racine + path.sep)) refuser('Fichier du dépôt refusé')
  contenu = fs.readFileSync(reel, 'utf8')
} catch { refuser('Fichier illisible') }

function champs(ligne) {
  const valeurs = []
  let courant = '', cite = false
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (c === '"' && cite && ligne[i + 1] === '"') { courant += '"'; i++ }
    else if (c === '"') cite = !cite
    else if (c === ',' && !cite) { valeurs.push(courant.trim()); courant = '' }
    else courant += c
  }
  valeurs.push(courant.trim())
  return valeurs
}

const lignes = contenu.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
const entete = champs(lignes.shift() ?? '').map((x) => x.toLowerCase())
if (!['domaine', 'instagram', 'page_meta', 'metier'].every((x) => entete.includes(x))) refuser('Colonnes attendues manquantes')
const indices = Object.fromEntries(entete.map((x, i) => [x, i]))
const candidats = [], vus = new Set()
let invalides = 0, doublons = 0
for (const ligne of lignes) {
  const v = champs(ligne)
  if (v.length !== entete.length) { invalides++; continue }
  const domaine = (v[indices.domaine] ?? '').trim().toLowerCase().replace(/^www\./, '')
  const instagram = (v[indices.instagram] ?? '').trim().toLowerCase().replace(/^@/, '')
  const page_meta = (v[indices.page_meta] ?? '').trim()
  const metier = (v[indices.metier] ?? '').trim() || null
  if ((!domaine && !instagram && !page_meta) || domaine && !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domaine) || instagram && !/^[\w.]{2,100}$/.test(instagram) || page_meta && !/^[\w.-]{2,160}$/.test(page_meta)) { invalides++; continue }
  const cle_dedup = domaine ? `domaine:${domaine}` : page_meta ? `page_meta:${page_meta}` : `instagram:${instagram}`
  if (vus.has(cle_dedup)) { doublons++; continue }
  vus.add(cle_dedup)
  candidats.push({ cle_dedup, domaine: domaine || null, instagram: instagram || null, page_meta: page_meta || null, metier, source: 'manuel', cible: 'artisan', froid: true })
}
console.log(`${lignes.length} lignes, ${candidats.length} valides, ${doublons} doublons, ${invalides} invalides`)
if (sec) process.exit(0)
for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) refuser('Configuration de la base absente')
const admin = createClient(url, cle, { auth: { persistSession: false } })
let cree = 0, existant = 0, oppose = 0
for (const candidat of candidats) {
  const { data: estOppose, error: erreurOpposition } = await admin.rpc('acq_oppose', { p_cles: {
    domaine: candidat.domaine, instagram: candidat.instagram, page_meta: candidat.page_meta,
  } })
  if (erreurOpposition) { console.error('Import impossible'); process.exit(1) }
  const { data, error } = await admin.rpc('acq_candidats_enregistrer', { p: [candidat] })
  if (error) { console.error('Import impossible'); process.exit(1) }
  if (Number(data?.ajoutes ?? 0) > 0) {
    if (estOppose) oppose++
    else cree++
  } else existant++
}
console.log(`cree: ${cree}, existant: ${existant}, oppose: ${oppose}`)
