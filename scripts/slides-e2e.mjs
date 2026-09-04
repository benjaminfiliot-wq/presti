// Slides 3D de réalisations (v5 §10 H2) — vérification visuelle et fonctionnelle.
//
// Ce qu'on prouve :
//  1. sans sélection, le site Signature est inchangé (aucune section .site-slides) ;
//  2. avec 3 photos choisies, la section rend 3 panneaux, s'arme au chargement (JS + desktop),
//     et le panneau 2 devient visible à mi-défilement (le scroll pilote bien la mise en scène) ;
//  3. en reduced-motion et sur mobile, aucun épinglage : panneaux empilés en flux normal ;
//  4. le fait réel ne s'affiche que s'il a été saisi.
// Captures dans le scratchpad : on les REGARDE, une assertion ne voit pas un chevauchement.
//
// Usage : TEST_BASE=http://localhost:3005 node scripts/slides-e2e.mjs   (ou prod par défaut)

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const SHOTS = process.env.SHOTS_DIR || path.join(process.env.TEMP || '.', 'presti-slides')
fs.mkdirSync(SHOTS, { recursive: true })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

// Trois images de test distinctes (SVG en data URL : lourdes de rien, reconnaissables aux couleurs).
const svg = (c, t) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1000'><rect width='100%' height='100%' fill='${c}'/><text x='50%' y='52%' font-size='140' text-anchor='middle' fill='white' font-family='sans-serif'>${t}</text></svg>`)}`
const PHOTOS = [
  { image: svg('#6b4423', 'UN'), titre: 'Escalier en chêne', specialite: 'Escalier' },
  { image: svg('#2f5d50', 'DEUX'), titre: 'Bibliothèque sur mesure', specialite: 'Agencement' },
  { image: svg('#3b3f5c', 'TROIS'), titre: 'Cuisine en noyer', specialite: 'Cuisine' },
]

let uid = null
try {
  const email = `verif-slides-${Date.now()}@presti-test.invalid`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: crypto.randomBytes(18).toString('base64url'), email_confirm: true })
  if (error) throw new Error(error.message)
  uid = u.user.id
  const slug = `verif-slides-${Date.now()}`
  await admin.from('artisans').insert({ id: uid, email, nom: 'Atelier Vérif', metier: 'Menuisier', slug, plan: 'signature', site_active: true, site_tier: 3, realisations: PHOTOS, zone_intervention: 'Marans' })

  const nav = await chromium.launch()
  const page = await (await nav.newContext({ viewport: { width: 1400, height: 900 } })).newPage()

  console.log('\n── 1. Sans sélection : rien ne change')
  await page.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })
  T('aucune section slides', (await page.locator('.site-slides').count()) === 0)
  T('la galerie classique est là', (await page.locator('.site-gallery .site-shot').count()) === 3)

  console.log('\n── 2. Avec 3 photos choisies')
  await admin.from('artisans').update({ site_layout: { v: 2, sections: [
    { id: 'hero', on: true }, { id: 'slides', on: true, opts: { images: PHOTOS.map((p) => p.image), style: 'profondeur', faits: { [PHOTOS[0].image]: 'Chêne massif · 3 semaines' } } },
    { id: 'words', on: true }, { id: 'gallery', on: true }, { id: 'contact', on: true },
  ] } }).eq('id', uid)
  await page.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })
  T('3 panneaux rendus', (await page.locator('.site-slide').count()) === 3)
  await page.waitForFunction(() => document.querySelector('.site-slides')?.classList.contains('armed'), null, { timeout: 8000 }).catch(() => {})
  T('la section s’arme (JS chargé, desktop)', await page.locator('.site-slides.armed').count() === 1)
  T('le fait réel saisi est affiché', await page.locator('.site-slide-fait').first().textContent() === 'Chêne massif · 3 semaines')
  T('et absent là où il n’a pas été saisi', (await page.locator('.site-slide-fait').count()) === 1)

  const y0 = await page.locator('.site-slides').evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
  await page.evaluate((y) => window.scrollTo(0, y), y0)
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(SHOTS, 'slide-1.png') })
  const opa = async (i) => Number(await page.locator('.site-slide').nth(i).evaluate((el) => getComputedStyle(el).opacity))
  T('au début : panneau 1 visible, panneau 2 invisible', (await opa(0)) > 0.9 && (await opa(1)) < 0.1, `opacités ${await opa(0)} / ${await opa(1)}`)

  await page.evaluate((y) => window.scrollTo(0, y + innerHeight * 0.9), y0)
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(SHOTS, 'slide-2.png') })
  T('à mi-parcours : panneau 2 visible', (await opa(1)) > 0.9, `opacité ${await opa(1)}`)
  const num = await page.locator('.site-slides-num').textContent()
  T('le compteur suit', num === '02', num)
  await page.evaluate((y) => window.scrollTo(0, y + innerHeight * 1.8), y0)
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(SHOTS, 'slide-3.png') })
  T('à la fin : panneau 3 visible', (await opa(2)) > 0.9, `opacité ${await opa(2)}`)
  // Après la séquence, la page continue (mots géants) : la section ne « mange » pas le reste.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(400)
  T('le contact est atteignable après les slides', await page.locator('#contact').evaluate((el) => el.getBoundingClientRect().top < innerHeight))

  console.log('\n── 3. Replis')
  const ctxRM = await nav.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' })
  const pRM = await ctxRM.newPage(); await pRM.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' }); await pRM.waitForTimeout(800)
  T('reduced-motion : pas d’épinglage, 3 panneaux en flux', (await pRM.locator('.site-slides.armed').count()) === 0 && (await pRM.locator('.site-slide').count()) === 3)
  const ctxM = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pM = await ctxM.newPage(); await pM.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' }); await pM.waitForTimeout(800)
  T('mobile : pas d’épinglage', (await pM.locator('.site-slides.armed').count()) === 0)
  T('mobile : aucun défilement horizontal', await pM.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await pM.screenshot({ path: path.join(SHOTS, 'slide-mobile.png') })

  await nav.close()
  console.log(`\n📸 captures : ${SHOTS}`)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) { await admin.from('artisans').delete().eq('id', uid); await admin.auth.admin.deleteUser(uid).catch(() => {}); console.log('\n🧹 compte de test supprimé') }
}
console.log(`\n${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : 0)
