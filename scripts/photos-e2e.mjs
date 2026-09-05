// Test permanent — photos de réalisations (v4 §7/E3).
//
// LE point à prouver, et il est de l'ordre de la vie privée : un artisan qui publie la
// photo d'un chantier ne doit JAMAIS publier l'adresse de son client. Les téléphones
// écrivent les coordonnées GPS dans l'EXIF de chaque photo. On fabrique donc un vrai
// JPEG géolocalisé (Nantes), on le fait passer par le vrai parcours d'import, et on
// vérifie que ce qui ressort ne contient plus aucune coordonnée.
//
// On vérifie aussi que la photo principale n'est plus stockée en 1100 px — elle sert de
// fond plein écran, c'était le vrai plafond de qualité du site.
//
// Usage : node scripts/photos-e2e.mjs

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

// ── Fabrique un segment EXIF APP1 contenant de vraies coordonnées GPS (47°13'N, 1°33'W).
function exifGps() {
  const tiff = Buffer.alloc(200)
  let o = 0
  tiff.write('II', o); o += 2                     // petit-boutiste
  tiff.writeUInt16LE(42, o); o += 2
  tiff.writeUInt32LE(8, o); o += 4                // IFD0 à l'octet 8
  // IFD0 : une entrée, le pointeur vers l'IFD GPS
  tiff.writeUInt16LE(1, 8)
  tiff.writeUInt16LE(0x8825, 10)                  // GPSInfo
  tiff.writeUInt16LE(4, 12)                       // LONG
  tiff.writeUInt32LE(1, 14)
  const gpsIfd = 26
  tiff.writeUInt32LE(gpsIfd, 18)
  tiff.writeUInt32LE(0, 22)                       // pas d'IFD suivant
  // IFD GPS : réf latitude, latitude, réf longitude, longitude
  const donnees = gpsIfd + 2 + 4 * 12 + 4
  tiff.writeUInt16LE(4, gpsIfd)
  const ent = (i, tag, type, count, val) => {
    const b = gpsIfd + 2 + i * 12
    tiff.writeUInt16LE(tag, b); tiff.writeUInt16LE(type, b + 2)
    tiff.writeUInt32LE(count, b + 4); tiff.writeUInt32LE(val, b + 8)
  }
  ent(0, 0x0001, 2, 2, 0x004e)                    // 'N\0' en ligne
  ent(1, 0x0002, 5, 3, donnees)                   // latitude → 3 rationnels
  ent(2, 0x0003, 2, 2, 0x0057)                    // 'W\0' en ligne
  ent(3, 0x0004, 5, 3, donnees + 24)              // longitude
  tiff.writeUInt32LE(0, gpsIfd + 2 + 4 * 12)
  const rat = (off, a, b) => { tiff.writeUInt32LE(a, off); tiff.writeUInt32LE(b, off + 4) }
  rat(donnees, 47, 1); rat(donnees + 8, 13, 1); rat(donnees + 16, 5, 1)        // 47°13'05" N
  rat(donnees + 24, 1, 1); rat(donnees + 32, 33, 1); rat(donnees + 40, 20, 1)  //  1°33'20" W
  const utile = tiff.subarray(0, donnees + 48)

  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), utile])
  const seg = Buffer.alloc(4)
  seg.writeUInt16BE(0xffe1, 0)
  seg.writeUInt16BE(payload.length + 2, 2)
  return Buffer.concat([seg, payload])
}

const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-photo-'))
const fichier = path.join(dossier, 'chantier-geolocalise.jpg')
const slug = `verif-photo-${Date.now()}`
const email = `${slug}@presti-test.invalid`
const motDePasse = crypto.randomBytes(18).toString('base64url')
let uid = null

try {
  const nav = await chromium.launch()
  const contexte = await nav.newContext({ viewport: { width: 1280, height: 1000 } })
  // Pas de visite guidée pendant le test : son voile intercepte les clics (même règle que parametres-e2e).
  await contexte.addInitScript(() => { try { localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} })
  const page = await contexte.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })

  // 1. Le navigateur fabrique les pixels (2000×1400, contrasté pour passer le contrôle de netteté).
  const b64 = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 2000; c.height = 1400
    const x = c.getContext('2d')
    x.fillStyle = '#cfc6b4'; x.fillRect(0, 0, 2000, 1400)
    for (let i = 0; i < 2000; i += 20) { x.fillStyle = i % 40 ? '#2a2520' : '#e8e2d6'; x.fillRect(i, 0, 10, 1400) }
    for (let j = 0; j < 1400; j += 26) { x.fillStyle = j % 52 ? '#514636' : '#f2ede2'; x.fillRect(0, j, 2000, 9) }
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''; for (const o of buf) s += String.fromCharCode(o)
    return btoa(s)
  })
  const jpeg = Buffer.from(b64, 'base64')
  // 2. Node y injecte l'EXIF GPS, juste après SOI (FFD8).
  const avecGps = Buffer.concat([jpeg.subarray(0, 2), exifGps(), jpeg.subarray(2)])
  fs.writeFileSync(fichier, avecGps)

  console.log('\n── 0. La photo de départ est bien géolocalisée')
  T('segment EXIF présent dans le fichier source', avecGps.includes(Buffer.from('Exif\0\0', 'binary')))
  T('marqueur GPSInfo présent', avecGps.indexOf(Buffer.from([0x25, 0x88])) > 0)

  // 3. Compte de test + parcours réel d'import.
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  // La visite guidée est mémorisée en BASE (0047, aide_vues) : on la marque vue, sinon son voile intercepte les clics.
  await sb.from('artisans').insert({ id: uid, email, nom: 'Vérif Photo', metier: 'carreleur', slug, plan: 'business', site_active: false, aide_vues: ['visite:console'] })

  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await codeEmailSiDemande(page, email)
  await page.waitForURL(/outils|dashboard|profil/, { timeout: 30000 })
  await page.goto(`${BASE}/profil`, { waitUntil: 'networkidle' })

  console.log('\n── 1. Import par le vrai parcours')
  await page.setInputFiles('input[type="file"][multiple]', fichier)
  try { await page.waitForSelector('.pf-item img', { timeout: 60000 }) }
  catch { throw new Error('import échoué — message affiché : ' + (await page.locator('.pf-up p').first().innerText().catch(() => '(aucun)'))) }
  T('la photo est acceptée (nette, assez grande)', await page.locator('.pf-item').count() === 1)
  T('elle est marquée comme photo principale', await page.locator('.pf-role').count() === 1)

  await page.getByRole('button', { name: /Enregistrer/i }).first().click()
  await page.waitForTimeout(3500)

  const { data: art } = await sb.from('artisans').select('realisations').eq('id', uid).single()
  const rz = (art?.realisations ?? [])[0]
  T('la réalisation est enregistrée', !!rz?.image, JSON.stringify(art?.realisations)?.slice(0, 120))
  T('une vignette floue est stockée', typeof rz?.blur === 'string' && rz.blur.startsWith('data:image'))

  console.log('\n── 2. Ce qui est PUBLIÉ ne contient plus la position du chantier')
  const bin = Buffer.from(await (await fetch(rz.image)).arrayBuffer())
  T('le fichier publié est en WebP', /\.webp$/.test(rz.image) && bin.subarray(8, 12).toString() === 'WEBP', rz.image.slice(-40))
  T('plus aucun segment EXIF', !bin.includes(Buffer.from('Exif\0\0', 'binary')))
  T('plus aucune trace « GPS »', !bin.includes(Buffer.from('GPS', 'binary')))
  // Les rationnels de latitude (47/1, 13/1) ne doivent plus se retrouver tels quels.
  const lat = Buffer.alloc(8); lat.writeUInt32LE(47, 0); lat.writeUInt32LE(1, 4)
  T('les coordonnées elles-mêmes ont disparu', !bin.includes(lat))

  console.log('\n── 3. La qualité est à la hauteur d’un fond plein écran')
  const dim = await page.evaluate((u) => new Promise((res) => {
    const i = new Image(); i.crossOrigin = 'anonymous'
    i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res(null); i.src = u
  }), rz.image)
  T('le master fait au moins 2000 px de large', dim && dim.w >= 2000, dim ? `${dim.w}×${dim.h}` : 'illisible')
  T('le poids reste raisonnable', bin.length < 1_600_000, `${Math.round(bin.length / 1024)} Ko`)

  console.log('\n── 4. Une photo trop petite est refusée, avec une explication')
  const petit = path.join(dossier, 'trop-petite.jpg')
  const b64p = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300
    const x = c.getContext('2d'); x.fillStyle = '#888'; x.fillRect(0, 0, 400, 300)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''; for (const o of buf) s += String.fromCharCode(o)
    return btoa(s)
  })
  fs.writeFileSync(petit, Buffer.from(b64p, 'base64'))
  await page.setInputFiles('input[type="file"][multiple]', petit)
  await page.waitForSelector('.pf-alertes', { timeout: 30000 })
  const texte = await page.locator('.pf-alertes').innerText()
  T('elle n’est pas ajoutée', await page.locator('.pf-item').count() === 1)
  T('et on explique pourquoi, en français', /trop petite/i.test(texte), texte.slice(0, 120))

  console.log('\n── 5. Le guide de prise de vue est accessible')
  // La visite guidée (aideVisites) s'ouvre sur un compte neuf et couvre la page : on la ferme d'abord.
  const plusTard = page.getByRole('button', { name: /Plus tard|Fermer|Terminer/ })
  if (await plusTard.count()) { await plusTard.first().click(); await page.waitForTimeout(500) }
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Réussir vos photos/i }).click()
  T('les six conseils s’affichent', await page.locator('.pf-guide > div').count() === 6)

  await nav.close()
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    const { data: fichiers } = await sb.storage.from('artisan-media').list(uid, { limit: 100 })
    if (fichiers?.length) await sb.storage.from('artisan-media').remove(fichiers.map((f) => `${uid}/${f.name}`))
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 artisan, photos et compte de test supprimés')
  }
  fs.rmSync(dossier, { recursive: true, force: true })
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
