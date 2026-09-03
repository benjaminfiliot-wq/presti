// Test permanent — le système d'explication (sprint J-1 §4 : B1 panneau « ? », B2 ⓘ,
// B3 visite guidée, B4 centre d'aide).
//
// Ce qu'on vérifie, en vrai navigateur, sur un compte de test créé puis supprimé :
//  1. la visite guidée se lance à la PREMIÈRE ouverture de la console, et pas à la seconde ;
//  2. le bouton « ? » ouvre, sur 4 écrans, le panneau avec le BON article (et Échap le ferme) ;
//  3. un ⓘ s'ouvre au survol, au clavier (focus + Échap), et au clic ;
//  4. /aide trouve « devis » et « facture ».
// Plus deux contrôles de mise en page qu'une assertion textuelle ne voit pas : le « ? »
// ne chevauche pas les actions de la page, et la bulle ⓘ reste dans l'écran.
//
// Usage : node scripts/aide-e2e.mjs [http://localhost:3005]   (défaut : prod)

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.argv[2] || process.env.TEST_BASE || 'https://prestiapp.fr'
const OUT = process.env.AIDE_SHOTS || 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const chevauche = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

const comptes = []
let nav
try {
  const slug = `verif-aide-${Date.now()}`
  const email = `${slug}@presti-test.invalid`
  const pw = crypto.randomUUID() + 'Aa1!'
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: pw, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  comptes.push(u.user.id)
  const { error: eA } = await sb.from('artisans').insert({ id: u.user.id, email, slug, plan: 'studio', nom: 'Menuiserie Test Aide', metier: 'Menuisier' })
  if (eA) throw new Error('artisan : ' + eA.message)

  nav = await chromium.launch()
  // bypassCSP : la CSP de prod interdit unsafe-eval, dont `next dev` a besoin pour hydrater. Sans ça, React
  // ne monte jamais en local et le formulaire de connexion part en GET natif. Sans effet en prod.
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR', bypassCSP: true })
  const page = await ctx.newPage()
  // networkidle : sur un serveur de dev, cliquer avant l'hydratation soumet le formulaire en GET natif.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', pw)
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await page.waitForURL(/\/(outils|dashboard)/, { timeout: 20000 })

  console.log('\n── 1. La visite guidée : première ouverture oui, seconde non')
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' })
  const carte = page.locator('.visite-carte')
  await carte.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
  T('la visite se lance à la première ouverture', await carte.isVisible())
  if (await carte.isVisible()) {
    T('l’étape 1 vise le menu', /1\/\d/.test(await carte.innerText()) && (await carte.innerText()).includes('menu'))
    T('« Plus tard » est visible', await page.locator('.visite-tard').isVisible())
    const spot = await page.locator('.visite-spot').boundingBox()
    T('le projecteur cadre un élément réel', !!spot && spot.width > 40 && spot.height > 20, JSON.stringify(spot))
    await page.locator('.visite-act .psh-btn.primary').click(); await page.waitForTimeout(400)
    T('« Suivant » passe à l’étape 2', /2\/\d/.test(await carte.innerText()))
    await page.screenshot({ path: `${OUT}/aide-visite.png` })
    // on termine la visite
    for (let i = 0; i < 8 && (await carte.count()); i++) { await page.locator('.visite-act .psh-btn.primary').click(); await page.waitForTimeout(350) }
    T('« Terminer » ferme la visite', (await carte.count()) === 0)
  }
  await page.waitForTimeout(800)
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500)
  T('la visite ne revient PAS à la seconde ouverture', (await page.locator('.visite-carte').count()) === 0)
  const { data: row } = await sb.from('artisans').select('aide_vues').eq('id', u.user.id).maybeSingle()
  if (row && 'aide_vues' in row) T('la base a mémorisé la visite (artisans.aide_vues)', Array.isArray(row.aide_vues) && row.aide_vues.includes('visite:console'), JSON.stringify(row.aide_vues))
  else console.log('  ℹ️  colonne aide_vues absente (migration 0047 non appliquée) : repli localStorage vérifié ci-dessus')

  console.log('\n── 2. Le panneau « ? » sur quatre écrans, avec le bon article')
  const ECRANS = [
    ['/dashboard', /tableau de bord/i],
    ['/outils', /Rédiger une réponse/],
    ['/devis/nouveau', /Éditeur de devis/],
    ['/profil', /Ma page/],
  ]
  for (const [chemin, titre] of ECRANS) {
    await page.goto(`${BASE}${chemin}`, { waitUntil: 'load' })
    const btn = page.locator('.psh-aide')
    await btn.waitFor({ state: 'visible', timeout: 15000 })
    // mise en page : le « ? » ne recouvre aucune action de la page
    const bb = await btn.boundingBox()
    const actions = await page.locator('.psh-actions > *').all()
    let recouvre = false
    for (const a of actions) if (chevauche(bb, await a.boundingBox())) recouvre = true
    T(`${chemin} : le « ? » est à sa place, sans chevaucher les actions`, !!bb && bb.x + bb.width <= 1280 && !recouvre)
    await btn.click()
    const pan = page.locator('.aide-pan.on')
    await pan.waitFor({ state: 'visible', timeout: 5000 })
    const h2 = await pan.locator('h2').innerText()
    T(`${chemin} : le panneau porte le bon article`, titre.test(h2), h2)
    T(`${chemin} : le panneau est un dialogue modal (aria-modal)`, (await pan.getAttribute('aria-modal')) === 'true')
    T(`${chemin} : les sections sont là (étapes numérotées, crédits)`, (await pan.locator('.aide-sec ol li').count()) >= 3 && (await pan.locator('.aide-sec h3').count()) >= 4)
    if (chemin === '/devis/nouveau') await page.screenshot({ path: `${OUT}/aide-panneau.png` })
    await page.keyboard.press('Escape'); await page.waitForTimeout(350)
    T(`${chemin} : Échap ferme le panneau`, (await page.locator('.aide-pan.on').count()) === 0)
  }
  // « Revoir la visite » depuis le panneau
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' })
  await page.locator('.psh-aide').click(); await page.waitForTimeout(300)
  const revoir = page.getByRole('button', { name: /Revoir la visite/ })
  T('le panneau propose « Revoir la visite »', (await revoir.count()) === 1)
  if (await revoir.count()) { await revoir.click(); await page.waitForTimeout(700); T('la visite se rejoue', await page.locator('.visite-carte').isVisible()); await page.keyboard.press('Escape'); await page.waitForTimeout(300) }

  console.log('\n── 3. Les info-bulles ⓘ : survol, clavier, clic')
  await page.goto(`${BASE}/outils`, { waitUntil: 'load' })
  const info = page.locator('.info').first()
  await info.waitFor({ state: 'visible', timeout: 15000 })
  const idBulle = await info.getAttribute('aria-describedby')
  T('le ⓘ décrit son label (aria-describedby)', !!idBulle && (await page.locator(`[id="${idBulle}"]`).count()) === 1)
  await info.hover(); await page.waitForTimeout(250)
  const bulle = page.locator('.info-bulle.on').first()
  T('la bulle s’ouvre au survol', await bulle.isVisible())
  const tb = await bulle.boundingBox()
  T('la bulle reste dans l’écran', !!tb && tb.x >= 0 && tb.y >= 0 && tb.x + tb.width <= 1280 && tb.y + tb.height <= 900, JSON.stringify(tb))
  T('elle contient l’explication et un exemple en italique', (await bulle.innerText()).includes('Collez ici') && (await bulle.locator('em').count()) === 1)
  await page.screenshot({ path: `${OUT}/aide-info.png` })
  await page.mouse.move(10, 600); await page.waitForTimeout(250)
  T('elle se ferme quand la souris part', (await page.locator('.info-bulle.on').count()) === 0)
  await info.focus(); await page.waitForTimeout(250)
  T('elle s’ouvre au focus clavier', (await page.locator('.info-bulle.on').count()) === 1)
  await page.keyboard.press('Escape'); await page.waitForTimeout(250)
  T('Échap la ferme', (await page.locator('.info-bulle.on').count()) === 0)
  await page.mouse.move(10, 600)
  await info.click(); await page.waitForTimeout(250)
  T('un clic (tap) l’épingle', (await page.locator('.info-bulle.on').count()) === 1)
  await page.locator('.tool-card h2').first().click(); await page.waitForTimeout(250) // clic dehors, sur un titre inerte (pas sur la carte-lien « Créer un devis »)
  T('un clic dehors la ferme', (await page.locator('.info-bulle.on').count()) === 0)
  // bascule haut/bas : un ⓘ tout en bas de l'écran doit ouvrir sa bulle au-dessus
  await page.goto(`${BASE}/devis/nouveau`, { waitUntil: 'load' })
  await page.locator('.info').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('details.collapse summary').click(); await page.waitForTimeout(300)
  const bas = page.locator('.info').last()
  await bas.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -140)); await page.waitForTimeout(200)
  const bbBas = await bas.boundingBox()
  await bas.hover(); await page.waitForTimeout(250)
  const bulleBas = await page.locator('.info-bulle.on').first().boundingBox()
  T('une bulle proche du bas bascule au-dessus si besoin, et reste dans l’écran', !!bulleBas && bulleBas.y >= 0 && bulleBas.y + bulleBas.height <= 900, `bouton y=${bbBas?.y} bulle y=${bulleBas?.y} h=${bulleBas?.height}`)

  console.log('\n── 4. Le centre d’aide /aide')
  await page.goto(`${BASE}/aide`, { waitUntil: 'load' })
  const rech = page.locator('.aide-rech input')
  await rech.waitFor({ state: 'visible', timeout: 15000 })
  T('les articles sont groupés par outil', (await page.locator('.aide-grp').count()) >= 8)
  await rech.fill('devis'); await page.waitForTimeout(300)
  let titres = await page.locator('.aide-art summary').allInnerTexts()
  T('« devis » trouve les articles Devis', titres.some((t) => /Éditeur de devis/.test(t)) && titres.some((t) => /^Devis/.test(t)), titres.join(' | '))
  await page.screenshot({ path: `${OUT}/aide-centre.png`, fullPage: false })
  await rech.fill('facture'); await page.waitForTimeout(300)
  titres = await page.locator('.aide-art summary').allInnerTexts()
  T('« facture » trouve l’article Factures', titres.some((t) => /^Factures/.test(t)), titres.join(' | '))
  await rech.fill('zzzz-introuvable'); await page.waitForTimeout(300)
  T('une recherche vide le dit sans casser', (await page.locator('.aide-vide').count()) === 1)
  await rech.fill('')
  T('le menu de la console mène au centre d’aide', (await page.locator('.psh-nav a[href="/aide"]').count()) === 1)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.stack || e.message)
} finally {
  if (nav) await nav.close()
  for (const uid of comptes) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} artisan de test supprimé`)
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
