// Test de bout en bout — les vidéos dans le centre d'aide, en vrai navigateur, sur un compte de test créé puis supprimé.
//
//  1. /aide affiche la section « Vidéos pas à pas » : une entrée par fonctionnalité visible dans le menu (CRM et assistant
//     compris : le compte de test est Signature) ; l'offre est annoncée là où ce n'est pas Essentiel ;
//  2. ouvrir une entrée monte le <video> (preload="none", affiche, contrôles) et les étapes écrites ; le lien mène à l'écran ;
//  3. /aide#video-crm ouvre directement l'entrée visée ; la recherche « facture » trouve la vidéo des factures ;
//  4. le panneau « ? » d'un écran propose « Voir la vidéo » ; sur le CRM (aucun article d'aide) le « ? » existe aussi ;
//  5. la lecture démarre vraiment (si le navigateur de test sait lire le H.264) ;
//  6. sur téléphone (390 px) : pas de défilement horizontal ; aucune erreur de console.
// Captures : bureau 1440 et téléphone 390 dans AIDE_SHOTS (défaut videos/aide-brut/_captures).
//
// Usage : TEST_BASE=http://localhost:3011 node scripts/aide-videos-e2e.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'http://localhost:3011'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) throw new Error('Tester sur un serveur local, pas sur la production.')
const OUT = process.env.AIDE_SHOTS || path.join(process.cwd(), 'videos', 'aide-brut', '_captures')
fs.mkdirSync(OUT, { recursive: true })
const VIDEOS = JSON.parse(fs.readFileSync('lib/aide-videos.json', 'utf8')).videos
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

let uid = null, nav = null
try {
  const stamp = Date.now()
  const email = `aide-e2e-${stamp}@presti-test.invalid`
  const mdp = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  uid = u.user.id
  const up = await sb.from('artisans').upsert({ id: uid, email, nom: 'Atelier Durand', metier: 'Carreleur', slug: `aide-e2e-${stamp}`, plan: 'signature', credits: 100, aide_vues: ['visite:console', 'visite:crm', 'visite:assistant'] })
  if (up.error) throw new Error('artisan : ' + up.error.message)

  nav = await chromium.launch()
  const connecter = async (ctx) => {
    const p = await ctx.newPage()
    await p.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
    await p.fill('#email-connexion', email); await p.fill('#mdp-connexion', mdp)
    await p.click('form button[type="submit"], form button:not([type="button"])')
    await codeEmailSiDemande(p, email)
    await p.waitForURL(/\/(outils|dashboard)/, { timeout: 30000 })
    await p.evaluate(() => { try { localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console', 'visite:crm', 'visite:assistant'])) } catch {} })
    return p
  }
  const erreurs = []
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  const page = await connecter(ctx)
  page.on('pageerror', (e) => erreurs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon|status of 4\d\d/.test(m.text())) erreurs.push(m.text()) })

  console.log('── 1. La section vidéos')
  await page.goto(`${BASE}/aide`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#grp-videos', { timeout: 20000 })
  const cartes = page.locator('details.aide-vid')
  T(`une entrée par fonctionnalité (${VIDEOS.length})`, (await cartes.count()) === VIDEOS.length, `${await cartes.count()} entrées`)
  const titres = await page.locator('details.aide-vid > summary > span:first-of-type').allInnerTexts()
  T('titres dans l’ordre du menu', JSON.stringify(titres) === JSON.stringify(VIDEOS.map((v) => v.titre)), titres.join(' | '))
  const offres = await page.locator('.aide-vid-offre').allInnerTexts()
  T('offres annoncées : Signature (CRM, assistant) et Studio (inventaire)', offres.filter((o) => /Signature/.test(o)).length === 2 && offres.filter((o) => /Studio/.test(o)).length === 1, offres.join(', '))
  T('aucun <video> monté avant l’ouverture (rien ne se télécharge)', (await page.locator('details.aide-vid video').count()) === 0)
  await page.screenshot({ path: path.join(OUT, 'aide-bureau-1440.png') })

  console.log('\n── 2. Ouvrir une entrée')
  await page.locator('#video-devis > summary').click()
  const vd = page.locator('#video-devis video')
  await vd.waitFor({ timeout: 5000 })
  T('<video> avec contrôles, preload="none" et affiche', (await vd.getAttribute('preload')) === 'none' && (await vd.getAttribute('controls')) !== null && /\/aide-videos\/devis\.webp$/.test((await vd.getAttribute('poster')) || ''))
  const etapes = await page.locator('#video-devis .aide-vid-etapes li').allInnerTexts()
  const devis = VIDEOS.find((v) => v.id === 'devis')
  T('les étapes écrites sont celles des sous-titres (JSON)', JSON.stringify(etapes) === JSON.stringify(devis.etapes))
  T('le lien « Ouvrir » mène à l’écran', (await page.locator('#video-devis a.aide-vid-go').getAttribute('href')) === '/devis')
  await page.locator('#video-devis').scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(OUT, 'aide-bureau-1440-devis-ouvert.png') })

  console.log('\n── 5. La lecture')
  const lecture = await page.evaluate(async () => {
    const v = document.querySelector('#video-devis video')
    if (!v.canPlayType('video/mp4; codecs="avc1.42E01E"')) return { sansH264: true }
    v.muted = true
    try { await v.play() } catch (e) { return { erreur: String(e) } }
    await new Promise((r) => setTimeout(r, 1800))
    return { t: v.currentTime, w: v.videoWidth, h: v.videoHeight }
  })
  if (lecture.sansH264) console.log('  ⚪ ce navigateur de test ne lit pas le H.264 : lecture non vérifiée ici (le fichier l’est par ffprobe)')
  else T(`la vidéo se lit (${lecture.t?.toFixed?.(1)} s, ${lecture.w}×${lecture.h})`, lecture.t > 0.5 && lecture.w === 1440, JSON.stringify(lecture))

  console.log('\n── 3. Lien direct et recherche')
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' }) // arrivée par un vrai chargement, comme depuis le panneau « ? »
  await page.goto(`${BASE}/aide#video-crm`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#video-crm[open]', { timeout: 8000 }).catch(() => {})
  T('/aide#video-crm ouvre l’entrée du CRM', await page.locator('#video-crm[open]').count() === 1)
  T('le CRM annonce l’offre Signature', /Disponible avec l’offre Signature/.test(await page.locator('#video-crm').innerText()))
  await page.screenshot({ path: path.join(OUT, 'aide-bureau-1440-crm.png') })
  await page.fill('input[type="search"]', 'facture')
  await page.waitForTimeout(400)
  T('la recherche « facture » propose la vidéo des factures', await page.locator('#video-factures').count() === 1)
  await page.fill('input[type="search"]', 'zzzzqx')
  await page.waitForTimeout(300)
  T('une recherche sans résultat n’affiche aucune vidéo', await page.locator('details.aide-vid').count() === 0)

  console.log('\n── 4. Le panneau « ? »')
  await page.goto(`${BASE}/devis`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /C’est quoi, cet écran/ }).click()
  const voir = page.getByRole('link', { name: 'Voir la vidéo' })
  T('/devis : le panneau propose « Voir la vidéo »', await voir.count() === 1 && (await voir.getAttribute('href')) === '/aide#video-devis')
  await page.keyboard.press('Escape')
  await page.goto(`${BASE}/crm`, { waitUntil: 'networkidle' })
  T('/crm : le bouton « ? » existe (pas d’article, mais une vidéo)', await page.getByRole('button', { name: /C’est quoi, cet écran/ }).count() === 1)
  await page.getByRole('button', { name: /C’est quoi, cet écran/ }).click()
  T('/crm : « Voir la vidéo » → /aide#video-crm', (await page.getByRole('link', { name: 'Voir la vidéo' }).getAttribute('href')) === '/aide#video-crm')
  await ctx.close()

  console.log('\n── 6. Téléphone 390 px')
  const mob = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', isMobile: true, hasTouch: true })
  const pm = await connecter(mob)
  pm.on('pageerror', (e) => erreurs.push(e.message))
  await pm.goto(`${BASE}/aide`, { waitUntil: 'networkidle' })
  await pm.waitForSelector('#grp-videos')
  await pm.locator('#video-assistant > summary').click()
  await pm.locator('#video-assistant video').waitFor()
  const largeur = await pm.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  T(`pas de défilement horizontal (${largeur.sw} ≤ ${largeur.cw})`, largeur.sw <= largeur.cw + 1)
  const boite = await pm.locator('#video-assistant video').boundingBox()
  T('la vidéo tient dans l’écran', !!boite && boite.x >= 0 && boite.x + boite.width <= 391)
  await pm.locator('#video-assistant').scrollIntoViewIfNeeded()
  await pm.screenshot({ path: path.join(OUT, 'aide-telephone-390.png') })
  await pm.screenshot({ path: path.join(OUT, 'aide-telephone-390-pleine.png'), fullPage: true })
  await mob.close()

  T('aucune erreur de console ni de page', erreurs.length === 0, erreurs.slice(0, 3).join(' | '))
} finally {
  try { if (nav) await nav.close() } catch {}
  if (uid) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid).catch(() => {})
    const r = await sb.from('artisans').select('id', { count: 'exact', head: true }).eq('id', uid)
    console.log(r.count === 0 ? '🧹 compte de test détruit' : '⚠️ compte de test encore présent')
  }
}
console.log(`\n${ko ? '❌' : '✅'} ${ok} contrôles passés, ${ko} échecs`)
process.exit(ko ? 1 : 0)
