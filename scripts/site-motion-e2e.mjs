// Test permanent — visionneuse de galerie et réassurance honnête (v4 §7/E2 + anti-fabrication).
//
// Deux choses à prouver :
//   1. la galerie s'agrandit, et elle est utilisable AU CLAVIER (sinon elle n'existe pas
//      pour une partie des visiteurs) ;
//   2. le site n'affiche AUCUNE affirmation inventée sur l'entreprise de l'artisan.
// Usage : node scripts/site-motion-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const SORTIE = process.env.SORTIE || '.'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

// Images de test : SVG en ligne, aucune ressource externe à télécharger.
const img = (t, c) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${c}"/><text x="400" y="320" font-size="72" text-anchor="middle" fill="#fff" font-family="sans-serif">${t}</text></svg>`)

const slug = `verif-motion-${Date.now()}`
let uid = null

try {
  const { data: u, error } = await sb.auth.admin.createUser({ email: `${slug}@presti-test.invalid`, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({
    id: uid, email: `${slug}@presti-test.invalid`, nom: 'Vérif Motion', metier: 'carreleur', slug,
    plan: 'business', site_active: true, site_tier: 3, theme: 'atelier', accent: '#3C6E63',
    bio: 'Artisan de test, supprimé aussitôt après la vérification.',
    zone_intervention: 'La Rochelle et 30 km alentour',
    services: [{ nom: 'Pose de carrelage', description: 'Sols et murs.' }, { nom: 'Faïence', description: 'Salles de bain.' }, { nom: 'Ragréage', description: 'Préparation des sols.' }],
    realisations: [
      { image: img('UN', '#3C6E63'), titre: 'Salle de bain complète', specialite: 'Faïence' },
      { image: img('DEUX', '#8A5A3B'), titre: 'Terrasse en grès', specialite: 'Extérieur' },
      { image: img('TROIS', '#2F4858'), titre: 'Cuisine ouverte', specialite: 'Sol' },
    ],
  })

  const nav = await chromium.launch()
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })

  console.log('\n── 1. Réassurance : aucune affirmation inventée')
  const texte = await page.evaluate(() => document.body.innerText)
  for (const menteuse of ['Travail assuré', 'Devis gratuit', 'Sérieux engagé', 'Chiffrage clair, sans surprise']) {
    T(`« ${menteuse} » n’apparaît plus`, !texte.includes(menteuse))
  }
  T('la zone réellement saisie est affichée', texte.includes('La Rochelle'))

  console.log('\n── 2. La galerie est atteignable au clavier')
  const fig = page.locator('.site-gallery .site-shot').first()
  T('les vignettes sont des cibles clavier', await fig.getAttribute('tabindex') === '0')
  T('elles ont un rôle et un intitulé', await fig.getAttribute('role') === 'button' && !!(await fig.getAttribute('aria-label')))

  console.log('\n── 3. Ouverture, navigation, fermeture')
  await fig.click()
  await page.waitForSelector('.site-lb', { timeout: 5000 })
  const dlg = page.locator('.site-lb')
  T('la visionneuse s’ouvre', await dlg.count() === 1)
  T('c’est bien un dialogue modal', await dlg.getAttribute('role') === 'dialog' && await dlg.getAttribute('aria-modal') === 'true')
  T('le fond de page est verrouillé', await page.evaluate(() => getComputedStyle(document.body).overflow) === 'hidden')
  T('la première photo est affichée', /UN/.test(decodeURIComponent(await page.locator('.site-lb-img').getAttribute('src'))))
  T('le compteur indique la position', (await page.locator('.site-lb-cap em').textContent()) === '1 / 3')

  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  T('la flèche droite passe à la suivante', (await page.locator('.site-lb-cap em').textContent()) === '2 / 3')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(150)
  T('les flèches bouclent (3 / 3)', (await page.locator('.site-lb-cap em').textContent()) === '3 / 3')

  // Le piège à focus : la tabulation ne doit jamais repartir dans la page derrière.
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
  T('le focus reste enfermé dans la visionneuse',
    await page.evaluate(() => !!document.activeElement?.closest('.site-lb')))

  await page.screenshot({ path: `${SORTIE}/site-lightbox.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(250)
  T('Échap referme', await page.locator('.site-lb').count() === 0)
  T('le fond de page est rendu au défilement', await page.evaluate(() => getComputedStyle(document.body).overflow) !== 'hidden')
  T('le focus revient sur la vignette d’origine',
    await page.evaluate(() => !!document.activeElement?.classList.contains('site-shot')))

  console.log('\n── 4. Clic en dehors')
  await fig.click()
  await page.waitForSelector('.site-lb')
  await page.mouse.click(6, 6)
  await page.waitForTimeout(250)
  T('cliquer sur le fond referme', await page.locator('.site-lb').count() === 0)

  console.log('\n── 5. Mouvement réduit : la visionneuse marche quand même')
  const ctx2 = await nav.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const p2 = await ctx2.newPage()
  await p2.goto(`${BASE}/site/${slug}`, { waitUntil: 'networkidle' })
  await p2.locator('.site-gallery .site-shot').first().click()
  await p2.waitForSelector('.site-lb', { timeout: 5000 })
  T('elle s’ouvre aussi sans animation', await p2.locator('.site-lb').count() === 1)
  T('et le contenu du site reste visible',
    await p2.evaluate(() => Array.from(document.querySelectorAll('.site-reveal')).every((e) => Number(getComputedStyle(e).opacity) === 1)))
  await ctx2.close()

  await nav.close()
  console.log(`\n📸 capture : ${SORTIE}/site-lightbox.png`)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 artisan de test supprimé')
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
