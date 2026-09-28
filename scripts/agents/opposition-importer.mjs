#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = fs.realpathSync(process.cwd())
const fichier = process.argv.slice(2).find((a) => !a.startsWith('--'))
const sec = process.argv.includes('--sec')
const refuser = (message) => { console.error(message); process.exit(2) }
if (!fichier || process.argv.slice(2).some((a) => a.startsWith('--') && a !== '--sec')) refuser('Usage : opposition-importer.mjs <fichier> [--sec]')
let contenu
try {
  const reel = fs.realpathSync(path.resolve(fichier))
  if (reel === racine || reel.startsWith(racine + path.sep)) refuser('Fichier du dépôt refusé')
  contenu = fs.readFileSync(reel, 'utf8')
} catch { refuser('Fichier illisible') }
const cles = [], vues = new Set()
let ignorees = 0
for (const ligne of contenu.replace(/\r?\n$/, '').split(/\r?\n/)) {
  const valeur = ligne.trim()
  if (!valeur || valeur.startsWith('#') || /^nom\s*:/i.test(valeur)) { ignorees++; continue }
  let cle
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeur)) cle = { email: valeur.toLowerCase() }
  else if (/^@[\w.]{2,100}$/.test(valeur)) cle = { instagram: valeur.slice(1).toLowerCase() }
  else if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(valeur)) cle = { domaine: valeur.toLowerCase().replace(/^www\./, '') }
  else { ignorees++; continue }
  const identifiant = JSON.stringify(cle)
  if (vues.has(identifiant)) { ignorees++; continue }
  vues.add(identifiant)
  cles.push(cle)
}
console.log(`${cles.length} clés, ${ignorees} lignes ignorées`)
if (sec) process.exit(0)
for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) refuser('Configuration de la base absente')
const admin = createClient(url, cle, { auth: { persistSession: false } })
let importees = 0
for (const p_cles of cles) {
  const { error } = await admin.rpc('acq_opposer', { p_cles, p_motif: 'deja_contacte_avant_026', p_source: 'import' })
  if (error) { console.error('Import impossible'); process.exit(1) }
  importees++
}
console.log(`${importees} oppositions importées`)
