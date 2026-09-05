// Audit D — parcours artisan (desktop + mobile), prod. ZÉRO appel IA.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, devices } from 'playwright'
import { createClient } from '@supabase/supabase-js'

process.chdir('C:/Users/benja/Documents/presti')
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(SB, SVC, { auth: { persistSession: false } })
const APP = 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/shots'
fs.mkdirSync(OUT, { recursive: true })
const st = Date.now()
const EMAIL = `parcours.${st}@presti-test.invalid`, PW = 'pelle-verte-mardi-1983-x'
const LOG = []
const log = (k, v) => { LOG.push({ k, v }); console.log(`• ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`) }
let consoleErrs = [], failed = []
function wire(page) {
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)) })
  page.on('response', (r) => { const s = r.status(); if (s >= 400 && !/_next\/|favicon|\.map$/.test(r.url())) failed.push(`${s} ${r.request().method()} ${r.url().replace(APP, '')}`) })
}
async function obs(page, name) {
  const texts = await page.locator('.msg, .err, [role=alert], .param-notif, .psh-empty, .toast, .mdp-txt, .site-404, .plat-404').allInnerTexts().catch(() => [])
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }).catch(() => {})
  log(name, { url: page.url().replace(APP, ''), texts: texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean), consoleErrs: consoleErrs.splice(0), failed: failed.splice(0) })
}
const step = async (n, f) => { try { await f() } catch (e) { log(`${n} — EXCEPTION`, String(e).slice(0, 300)) } }
const invalid = (page) => page.evaluate(() => { const f = document.querySelector('form'); const i = f && f.querySelector(':invalid'); return i ? { id: i.id || i.name || i.type, msg: i.validationMessage, focused: document.activeElement === i } : null })

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, locale: 'fr-FR' })
const p = await ctx.newPage(); wire(p)

// ── 1. Inscription
await step('signup', async () => {
  await p.goto(`${APP}/signup`, { waitUntil: 'load' })
  await p.getByRole('button', { name: /Créer mon compte/ }).click({ force: true }).catch(() => {})
  log('signup vide', await invalid(p))
  await p.fill('#email-inscription', EMAIL)
  await p.fill('#mdp-inscription', '123456'); await p.waitForTimeout(400)
  log('signup mdp faible', { txt: await p.locator('.mdp-txt').innerText().catch(() => null), btnDisabled: await p.getByRole('button', { name: /Créer mon compte/ }).isDisabled() })
  await p.fill('#mdp-inscription', 'motdepasse123456'); await p.waitForTimeout(1500)
  log('signup mdp fuité?', { txt: await p.locator('.mdp-txt').innerText().catch(() => null), btnDisabled: await p.getByRole('button', { name: /Créer mon compte/ }).isDisabled() })
  await p.fill('#mdp-inscription', PW); await p.waitForTimeout(1500)
  log('signup mdp fort', { txt: await p.locator('.mdp-txt').innerText().catch(() => null), btnDisabled: await p.getByRole('button', { name: /Créer mon compte/ }).isDisabled() })
  // Tab order
  await p.focus('#email-inscription'); const order = []
  for (let i = 0; i < 5; i++) { await p.keyboard.press('Tab'); order.push(await p.evaluate(() => { const a = document.activeElement; return `${a.tagName.toLowerCase()}#${a.id}[${a.getAttribute('aria-label') || a.textContent?.trim().slice(0, 20)}]` })) }
  log('signup tab order', order)
  await p.getByRole('button', { name: /Créer mon compte/ }).click()
  await p.waitForTimeout(6000)
  await obs(p, '01-signup-apres')
})
// Confirmation email éventuelle
let uid = null
await step('confirm', async () => {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const u = data.users.find((x) => x.email === EMAIL); uid = u?.id ?? null
  log('user créé', { uid, confirmed: !!u?.email_confirmed_at })
  if (u && !u.email_confirmed_at) { await admin.auth.admin.updateUserById(u.id, { email_confirm: true }); log('confirmation forcée via admin', true) }
})

// ── 2. Connexion
await step('login', async () => {
  await ctx.clearCookies(); await p.goto(`${APP}/login`, { waitUntil: 'load' })
  await p.evaluate(() => localStorage.clear())
  await p.goto(`${APP}/login?retour=/parametres`, { waitUntil: 'load' })
  await p.fill('input[type=email]', EMAIL); await p.fill('input[type=password]', 'mauvais-mot-de-passe-1')
  await p.keyboard.press('Enter'); await p.waitForTimeout(2500)
  await obs(p, '02-login-mauvais')
  await p.fill('input[type=password]', PW); await p.getByRole('button', { name: /Se connecter/ }).click()
  await p.waitForTimeout(6000)
  await obs(p, '03-login-ok-retour')
})

// ── 3. Onboarding
await step('onboarding', async () => {
  if (!/onboarding/.test(p.url())) await p.goto(`${APP}/onboarding`, { waitUntil: 'load' })
  await p.waitForTimeout(1500)
  await p.getByRole('button', { name: /Enregistrer et continuer/ }).click().catch(() => {})
  log('onboarding vide', await invalid(p))
  const longNom = 'Entreprise ' + 'Très Longue '.repeat(30)
  await p.locator('input').first().fill(longNom)
  await p.locator('input').nth(1).fill('abc<script>')
  await p.getByRole('button', { name: /Enregistrer et continuer/ }).click()
  await p.waitForTimeout(6000)
  await obs(p, '04-onboarding-apres')
  const { data: a } = await admin.from('artisans').select('nom, slug, tel, metier').eq('id', uid).maybeSingle()
  log('artisan en base', { nomLen: a?.nom?.length, slug: a?.slug, tel: a?.tel, metier: a?.metier })
})
let slug = null
{ const { data: a } = await admin.from('artisans').select('slug').eq('id', uid).maybeSingle(); slug = a?.slug }

// ── 4. Tableau de bord vide + visite
await step('dashboard', async () => {
  await p.goto(`${APP}/dashboard`, { waitUntil: 'load' }); await p.waitForTimeout(3000)
  const visite = await p.locator('.visite, [class*=visite]').first().innerText().catch(() => null)
  log('visite guidée', visite?.slice(0, 300) ?? null)
  await obs(p, '05-dashboard-vide')
  const later = p.getByRole('button', { name: /Plus tard/ })
  if (await later.count()) { await later.first().click(); await p.waitForTimeout(500) }
  const kpis = await p.locator('.psh-kpi').allInnerTexts()
  log('kpis', kpis.map((t) => t.replace(/\s+/g, ' ')))
  log('titre dashboard', await p.locator('h1').first().innerText().catch(() => null))
  log('lien plateforme affiché', await p.locator('.linkbox-url').innerText().catch(() => null))
  await p.locator('.linkbox-btn').click().catch(() => {}); await p.waitForTimeout(300)
  log('bouton copier après clic', await p.locator('.linkbox-btn').innerText().catch(() => null))
})

// ── 5. Profil → publication du site
await step('profil', async () => {
  const avant = await fetch(`${APP}/site/${slug}`); const avantHtml = await avant.text()
  log('/site avant publication', { status: avant.status, nonPublie: /Site non publié/.test(avantHtml), robots: (avantHtml.match(/name="robots" content="([^"]+)"/) || [])[1] })
  await p.goto(`${APP}/profil`, { waitUntil: 'load' }); await p.waitForTimeout(3500)
  const later = p.getByRole('button', { name: /Plus tard/ }); if (await later.count()) await later.first().click().catch(() => {})
  await obs(p, '06-profil-initial')
  const toggle = p.locator('.prof-toggle input[type=checkbox]').last()
  log('toggle site présent', await toggle.count())
  await toggle.check({ force: true }).catch((e) => log('toggle err', String(e).slice(0, 100)))
  log('libellé après cochage', await p.locator('.prof-toggle').last().innerText().catch(() => null))
  const btn = p.getByRole('button', { name: /^Enregistrer$/ }).first()
  await btn.dblclick(); await p.waitForTimeout(3500)
  await obs(p, '07-profil-enregistre')
  const { data: a } = await admin.from('artisans').select('site_active, site_tier, plan').eq('id', uid).maybeSingle()
  log('base après Enregistrer', a)
  const apres = await fetch(`${APP}/site/${slug}`); const apresHtml = await apres.text()
  log('/site après publication', { status: apres.status, nonPublie: /Site non publié/.test(apresHtml), titre: (apresHtml.match(/<title>([^<]*)/) || [])[1], h1: (apresHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, '').slice(0, 120) })
  log('lien "Voir en grand"', await p.locator('a', { hasText: 'Voir en grand' }).getAttribute('href').catch(() => null))
  log('adresse affichée', await p.locator('.prof-link span').first().innerText().catch(() => null))
})

// ── 6. Paramètres
await step('parametres', async () => {
  await p.goto(`${APP}/parametres?onglet=securite`, { waitUntil: 'load' }); await p.waitForTimeout(3000)
  const later = p.getByRole('button', { name: /Plus tard/ }); if (await later.count()) await later.first().click().catch(() => {})
  const inputs = p.locator('.param-main input[type=password]')
  await inputs.nth(0).fill('faux-ancien-mot-de-passe'); await inputs.nth(1).fill(PW + '-2'); await p.waitForTimeout(1800)
  await p.getByRole('button', { name: /Changer mon mot de passe/ }).click(); await p.waitForTimeout(3000)
  await obs(p, '08-securite-ancien-faux')
  await p.goto(`${APP}/parametres?onglet=donnees`, { waitUntil: 'load' }); await p.waitForTimeout(3000)
  await obs(p, '09-donnees')
  log('boutons données', await p.locator('.param-main button').allInnerTexts())
  await p.getByRole('button', { name: /Supprimer mon compte/ }).click(); await p.waitForTimeout(3000)
  await obs(p, '10-donnees-recap')
  log('recap texte', (await p.locator('.param-main').innerText()).replace(/\s+/g, ' ').slice(0, 900))
  const saisie = p.locator('.param-main input[type=text], .param-main input:not([type])').last()
  await saisie.fill('supprimer'); await p.waitForTimeout(300)
  const confirmBtn = p.locator('.param-main button', { hasText: /Confirmer|Supprimer définitivement|Supprimer mon compte/ }).last()
  log('bouton confirmation', { txt: await confirmBtn.innerText().catch(() => null), disabled: await confirmBtn.isDisabled().catch(() => null) })
  await confirmBtn.click().catch(() => {}); await p.waitForTimeout(3500)
  await obs(p, '11-donnees-programmee')
  const { data: a } = await admin.from('artisans').select('suppression_demandee_le').eq('id', uid).maybeSingle()
  log('base suppression_demandee_le', a)
  await p.getByRole('button', { name: /Annuler/ }).first().click().catch(() => {}); await p.waitForTimeout(3000)
  await obs(p, '12-donnees-annulee')
  const { data: a2 } = await admin.from('artisans').select('suppression_demandee_le').eq('id', uid).maybeSingle()
  log('base après annulation', a2)
})

// ── 7. Abonnement → Stripe (sans payer)
await step('abonnement', async () => {
  await p.goto(`${APP}/abonnement`, { waitUntil: 'load' }); await p.waitForTimeout(3000)
  const later = p.getByRole('button', { name: /Plus tard/ }); if (await later.count()) await later.first().click().catch(() => {})
  await obs(p, '13-abonnement')
  log('boutons abo', await p.locator('.abo-card button').allInnerTexts())
  await p.getByRole('button', { name: /S’abonner à Studio|S'abonner à Studio/ }).click()
  await p.waitForURL(/stripe\.com/, { timeout: 25000 }).catch(() => {})
  await p.waitForTimeout(4000)
  log('après clic abonnement', { url: p.url().slice(0, 90) })
  await p.screenshot({ path: `${OUT}/14-stripe.png` }).catch(() => {})
  const stripeTxt = await p.locator('body').innerText().catch(() => '')
  log('stripe texte', stripeTxt.replace(/\s+/g, ' ').slice(0, 500))
  await p.goBack({ waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(3000)
  await obs(p, '15-retour-stripe')
})

// ── 8. Déconnexion
await step('logout', async () => {
  await p.goto(`${APP}/dashboard`, { waitUntil: 'load' }); await p.waitForTimeout(3000)
  const later = p.getByRole('button', { name: /Plus tard/ }); if (await later.count()) await later.first().click().catch(() => {})
  const menuBtn = p.locator('.psh-menu, [aria-haspopup=menu], .psh-user, .psh-ava').first()
  log('bouton menu compte', { count: await menuBtn.count(), cls: await menuBtn.getAttribute('class').catch(() => null) })
  await menuBtn.click().catch(() => {}); await p.waitForTimeout(500)
  await p.screenshot({ path: `${OUT}/16-menu.png` }).catch(() => {})
  await p.locator('.psh-menu-out').click(); await p.waitForTimeout(3000)
  await obs(p, '17-apres-logout')
  await p.goto(`${APP}/dashboard`, { waitUntil: 'load' }); await p.waitForTimeout(3500)
  await obs(p, '18-dashboard-deconnecte')
})

// ── 9. Reset password
await step('reset', async () => {
  await p.goto(`${APP}/reset-password`, { waitUntil: 'load' })
  await p.fill('#email-reinitialisation', EMAIL); await p.getByRole('button', { name: /Envoyer le lien/ }).click(); await p.waitForTimeout(4000)
  await obs(p, '19-reset-demande')
  await p.goto(`${APP}/reset-password?token=jeton-bidon-0000`, { waitUntil: 'load' }); await p.waitForTimeout(800)
  log('titre reset token', await p.locator('h1').innerText())
  await p.fill('#mdp-nouveau', PW + '-nouveau'); await p.fill('#mdp-confirmation', PW + '-autre'); await p.waitForTimeout(1800)
  await p.getByRole('button', { name: /Mettre à jour/ }).click(); await p.waitForTimeout(1000)
  await obs(p, '20-reset-mismatch')
  await p.fill('#mdp-confirmation', PW + '-nouveau'); await p.getByRole('button', { name: /Mettre à jour/ }).click(); await p.waitForTimeout(4000)
  await obs(p, '21-reset-token-bidon')
})

// ── 10. Mobile — mêmes écrans connectés
await step('mobile', async () => {
  const mctx = await b.newContext({ ...devices['iPhone 13'], locale: 'fr-FR' })
  const m = await mctx.newPage(); wire(m)
  await m.goto(`${APP}/login`, { waitUntil: 'load' })
  await m.fill('input[type=email]', EMAIL); await m.fill('input[type=password]', PW); await m.getByRole('button', { name: /Se connecter/ }).click(); await m.waitForTimeout(5000)
  for (const [n, u] of [['m-dashboard', '/dashboard'], ['m-profil', '/profil'], ['m-parametres', '/parametres?onglet=donnees'], ['m-abonnement', '/abonnement'], ['m-plateforme', '/plateforme'], ['m-outils', '/outils']]) {
    await m.goto(`${APP}${u}`, { waitUntil: 'load' }); await m.waitForTimeout(3500)
    const later = m.getByRole('button', { name: /Plus tard/ }); if (await later.count()) await later.first().click().catch(() => {})
    const ov = await m.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth, small: [...document.querySelectorAll('button, a')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 24 && r.top < innerHeight }).map((e) => `${e.tagName}:${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 25)}:${Math.round(e.getBoundingClientRect().height)}px`).slice(0, 8) }))
    log(`${n} débordement/cibles`, ov)
    await obs(m, n)
  }
  await mctx.close()
})

await b.close()
fs.writeFileSync(path.join(OUT, '..', 'parcours-artisan.json'), JSON.stringify({ EMAIL, uid, slug, LOG }, null, 1))
console.log('\nCOMPTE', EMAIL, uid, slug)
