// Héberger les vidéos de promotion pour que Publora puisse les joindre — 2026-09-10.
//
//   node scripts/promo-heberger.mjs            → dépose les MP4 manquants
//   node scripts/promo-heberger.mjs --forcer   → réécrit même ceux déjà en ligne
//   node scripts/promo-heberger.mjs --purger   → vide le bucket
//
// ── POURQUOI ────────────────────────────────────────────────────────────────────────────────
//
// Publora ne sait joindre une vidéo que par une URL PUBLIQUE (`mediaUrls`). Son propre client le
// dit : « to attach images or a video, create the post first, then upload media against the
// returned postGroupId via Publora's media workflow » — workflow non implémenté. Nos MP4 étaient
// donc des fichiers locaux, et l'attache restait manuelle.
//
// Décision de Benj le 2026-09-10 : héberger les vidéos pour que la chaîne parte seule.
//
// ── LE GARDE-FOU QUI COMPTE ─────────────────────────────────────────────────────────────────
//
// Le stockage Supabase est PARTAGÉ avec les photos des artisans, et l'offre est de 1 Go. Le code
// du projet le dit déjà (lib/quotaMedia.ts) : « ~70 envois et l'offre entière est pleine. Le
// dépassement ne punit pas le fautif, il coupe le projet : TOUS les artisans perdent leurs images
// en même temps. »
//
// Ce script REFUSE donc de déposer s'il ne resterait pas au moins MARGE_MO libres après. Mesuré
// avant l'écriture, jamais estimé. Un bucket dédié `promo`, séparé de `artisan-media`, pour qu'une
// purge des pubs ne touche jamais une photo de chantier.

import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const BUCKET = 'promo'
const QUOTA_MO = 1024
const MARGE_MO = 400          // ce qu'on laisse libre pour les artisans, quoi qu'il arrive
const FORCER = process.argv.includes('--forcer')
const PURGER = process.argv.includes('--purger')

const env = {}
for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente de .env.local'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const lister = async (bucket, prefix = '') => {
  const r = await fetch(`${URL}/storage/v1/object/list/${bucket}`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  })
  const j = await r.json()
  return Array.isArray(j) ? j : []
}

// ── 1. L'occupation RÉELLE, tous buckets confondus ───────────────────────────────────────────
const rb = await fetch(`${URL}/storage/v1/bucket`, { headers: H })
const buckets = await rb.json()
if (!Array.isArray(buckets)) { console.error('impossible de lister les buckets'); process.exit(1) }

let occupe = 0
for (const b of buckets) {
  const parcourir = async (p) => {
    for (const it of await lister(b.name, p)) {
      if (it.id === null) await parcourir(p ? `${p}/${it.name}` : it.name)
      else occupe += it.metadata?.size || 0
    }
  }
  await parcourir('')
}
const occupeMo = occupe / 1048576
console.log(`Stockage occupé : ${occupeMo.toFixed(1)} Mo sur ${QUOTA_MO} Mo`)

// ── 2. Le bucket dédié ───────────────────────────────────────────────────────────────────────
if (!buckets.some((b) => b.name === BUCKET)) {
  const r = await fetch(`${URL}/storage/v1/bucket`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 52428800, allowed_mime_types: ['video/mp4'] }),
  })
  if (!r.ok) { console.error(`création du bucket ${BUCKET} refusée : ${(await r.text()).slice(0, 200)}`); process.exit(1) }
  console.log(`✓ bucket « ${BUCKET} » créé — public, MP4 uniquement, 50 Mo par fichier`)
} else {
  console.log(`  bucket « ${BUCKET} » déjà là`)
}

if (PURGER) {
  const noms = (await lister(BUCKET)).filter((x) => x.id !== null).map((x) => x.name)
  if (!noms.length) { console.log('  rien à purger'); process.exit(0) }
  const r = await fetch(`${URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: noms }),
  })
  console.log(r.ok ? `✓ ${noms.length} fichier(s) purgé(s)` : `✗ purge refusée : ${(await r.text()).slice(0, 200)}`)
  process.exit(r.ok ? 0 : 1)
}

// ── 3. Ce qu'on a à déposer, et la place que ça prend ────────────────────────────────────────
const aDeposer = []
for (const n of ['01','02','03','04','05','06','07','08','09','10']) {
  for (const f of ['vertical', 'carre', 'paysage']) {
    const p = path.join(RACINE, 'publications', `pub-${n}`, `${f}.mp4`)
    if (fs.existsSync(p)) aDeposer.push({ cle: `pub-${n}-${f}.mp4`, chemin: p, taille: fs.statSync(p).size })
  }
}
const enLigne = new Map((await lister(BUCKET)).filter((x) => x.id !== null).map((x) => [x.name, x.metadata?.size || 0]))
const manquants = aDeposer.filter((x) => FORCER || enLigne.get(x.cle) !== x.taille)
const poidsMo = manquants.reduce((a, x) => a + x.taille, 0) / 1048576

console.log(`${aDeposer.length} vidéo(s) locale(s) · ${enLigne.size} déjà en ligne · ${manquants.length} à déposer (${poidsMo.toFixed(1)} Mo)`)

// Le garde-fou : on mesure ce qui resterait, et on refuse plutôt que de couper le service.
const restantApres = QUOTA_MO - occupeMo - poidsMo
if (restantApres < MARGE_MO) {
  console.error(`\n✗ REFUS : il ne resterait que ${restantApres.toFixed(1)} Mo libres, et on en garde ${MARGE_MO} pour les artisans.`)
  console.error('  Le stockage est partagé : le remplir coupe les photos de TOUS les comptes.')
  console.error('  Purger les pubs précédentes : node scripts/promo-heberger.mjs --purger')
  process.exit(1)
}
if (!manquants.length) { console.log('\n✓ tout est déjà en ligne'); }

// ── 4. Le dépôt ──────────────────────────────────────────────────────────────────────────────
let ok = 0
for (const x of manquants) {
  const corps = fs.readFileSync(x.chemin)
  const r = await fetch(`${URL}/storage/v1/object/${BUCKET}/${x.cle}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'video/mp4', 'x-upsert': 'true', 'cache-control': 'public, max-age=31536000' },
    body: corps,
  })
  if (!r.ok) { console.error(`  ✗ ${x.cle} : ${(await r.text()).slice(0, 160)}`); continue }
  console.log(`  ↑ ${x.cle.padEnd(24)} ${(x.taille / 1048576).toFixed(1)} Mo`)
  ok++
}

// ── 5. La carte des URL, écrite pour que le pipeline la lise ────────────────────────────────
const carte = {}
for (const x of aDeposer) carte[x.cle.replace(/\.mp4$/, '')] = `${URL}/storage/v1/object/public/${BUCKET}/${x.cle}`
const dest = path.join(RACINE, 'publications', 'videos-en-ligne.json')
fs.writeFileSync(dest, JSON.stringify(carte, null, 2), 'utf8')
console.log(`\n✓ ${ok} déposée(s) · carte des URL dans ${path.relative(RACINE, dest)}`)
console.log(`  exemple : ${Object.values(carte)[0]}`)
