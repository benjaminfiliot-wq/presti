#!/usr/bin/env node
// Repli du poste : le juge local précède toute lecture de configuration et tout accès réseau.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const [packId, dossierArg, ...options] = process.argv.slice(2)
if (!packId || !dossierArg || options.length > 1 || (options.length && options[0] !== '--a-sec')) {
  console.error('Usage : node scripts/pack-pub/deposer.mjs <pack_id> <dossier> [--a-sec]')
  process.exit(2)
}
const dossier = path.resolve(dossierArg)
const juge = spawnSync(process.execPath, ['scripts/pub-locale-qa.mjs', '--partie=complet', `--dossier=${dossier}`], {
  encoding: 'utf8', maxBuffer: 64 << 20, timeout: 10 * 60_000,
  env: { ...process.env, npm_config_cache: '/tmp/presti-pack-pub-npm' },
})
const resume = (juge.stdout || '').split(/\r?\n/).filter((l) => /^(PASS|FAIL) PL-|pub-locale-qa.*: (PASS|FAIL)/.test(l))
if (juge.status !== 0) {
  console.error('✗ juge local rouge :')
  console.error((resume.filter((l) => l.startsWith('FAIL ')).join('\n') || juge.stderr || juge.stdout || 'juge indisponible').trim())
  process.exit(1)
}

// sept fichiers toujours ; fiche-10-min.md seulement quand le statut Logement est tranché (sinon a_verifier : elle n'existe pas)
const noms = ['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.jpg', 'textes.md']
if (fs.existsSync(path.join(dossier, 'sortie', 'fiche-10-min.md'))) noms.push('fiche-10-min.md')
const sortie = path.join(dossier, 'sortie')
const fichiers = noms.map((nom) => ({ nom, chemin: path.join(sortie, nom) }))
if (fichiers.some((f) => !fs.existsSync(f.chemin) || !fs.statSync(f.chemin).isFile())) {
  console.error('✗ sortie incomplète : sept fichiers attendus (huit avec fiche-10-min.md)')
  process.exit(1)
}
const taille = fichiers.reduce((n, f) => n + fs.statSync(f.chemin).size, 0)
if (taille > 30 * 1048576) {
  console.error('✗ pack de plus de 30 Mo')
  process.exit(1)
}
const bucket = 'packs-pubs'
for (const f of fichiers) console.log(`${bucket}/${packId}/${f.nom}`)
console.log(`Poids total : ${taille} octets (${(taille / 1048576).toFixed(2)} Mo)`)
if (options[0] === '--a-sec') process.exit(0)

for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) {
  const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) { console.error('✗ configuration Supabase absente'); process.exit(1) }
const admin = createClient(url, cle, { auth: { persistSession: false } })
const entetes = { apikey: cle, Authorization: `Bearer ${cle}` }

async function demander(adresse, optionsFetch = {}) {
  const r = await fetch(adresse, { ...optionsFetch, headers: { ...entetes, ...optionsFetch.headers } })
  if (!r.ok) throw new Error(`stockage indisponible (${r.status})`)
  return r.json()
}
async function occupation() {
  const buckets = await demander(`${url}/storage/v1/bucket`)
  if (!Array.isArray(buckets)) throw new Error('liste des buckets invalide')
  let octets = 0
  for (const b of buckets) {
    async function parcourir(prefixe = '') {
      for (let offset = 0; ; offset += 1000) {
        const objets = await demander(`${url}/storage/v1/object/list/${encodeURIComponent(b.name)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: prefixe, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
        })
        if (!Array.isArray(objets)) throw new Error('liste des objets invalide')
        for (const objet of objets) {
          if (objet.id === null) await parcourir(prefixe ? `${prefixe}/${objet.name}` : objet.name)
          else octets += Number(objet.metadata?.size || 0)
        }
        if (objets.length < 1000) break
      }
    }
    await parcourir()
  }
  return octets
}

try {
  const { data: ligne, error: erreurLigne } = await admin.from('packs_pubs').select('id, etat').eq('id', packId).maybeSingle()
  if (erreurLigne || ligne?.etat !== 'payee') throw new Error('pack absent ou état différent de payee')
  const occupe = await occupation()
  if (1024 * 1048576 - occupe - taille < 400 * 1048576) throw new Error('marge de 400 Mo insuffisante sur le stockage partagé')
  for (const f of fichiers) {
    const contentType = f.nom.endsWith('.mp4') ? 'video/mp4' : f.nom.endsWith('.jpg') ? 'image/jpeg' : 'text/markdown; charset=utf-8'
    const { error } = await admin.storage.from(bucket).upload(`${packId}/${f.nom}`, fs.readFileSync(f.chemin), { contentType, upsert: true })
    if (error) throw new Error(`dépôt de ${f.nom} : ${error.message}`)
  }
  const verifications = { juge: 'pub-locale-qa', verdict: 'PASS', criteres: resume }
  const { data: maj, error: erreurMaj } = await admin.from('packs_pubs')
    .update({ etat: 'fabriquee', fabrique_le: new Date().toISOString(), verifications })
    .eq('id', packId).eq('etat', 'payee').select('id')
  if (erreurMaj) throw new Error(`mise à jour impossible : ${erreurMaj.message}`)
  if (!maj?.length) throw new Error('aucune ligne mise à jour : le pack n’est plus payee')
  console.log('✓ pack fabriqué et déposé')
} catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(1)
}
