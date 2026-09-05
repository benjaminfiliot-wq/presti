// Audit D — parcours CLIENT (anonyme) + compléments. ZÉRO appel IA : aucun message envoyé sur /p.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const APP = 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/shots'
const [EMAIL, PW, SLUG] = process.argv.slice(2)
const NEUTRE = process.env.NEXT_PUBLIC_DOMAINE_NEUTRE
const log = (k, v) => console.log(`• ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
let consoleErrs = [], failed = []
function wire(page) { page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 160)) }); page.on('response', (r) => { const s = r.status(); if (s >= 400 && !/_next\/|favicon|\.map$/.test(r.url())) failed.push(`${s} ${r.request().method()} ${r.url().replace(APP, '')}`) }); page.on('request', (r) => { if (/\/api\/(leads|conversation\/(stream|devis|regles)|devis\/chiffrer|recherche|pilotage)/.test(r.url())) console.log('!!! ROUTE IA APPELÉE', r.url()) }) }
async function obs(page, name) {
  const texts = await page.locator('.msg, .err, [role=alert], .pchat-compte-m, .pchat-err, .site-404, .plat-404, .toast').allInnerTexts().catch(() => [])
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }).catch(() => {})
  log(name, { url: page.url().replace(APP, ''), texts: texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean), consoleErrs: consoleErrs.splice(0), failed: failed.splice(0) })
}
const step = async (n, f) => { try { await f() } catch (e) { log(`${n} — EXCEPTION`, String(e).slice(0, 300)) } }
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

// ── HTTP nus
await step('http', async () => {
  for (const u of [`/p/${SLUG}`, `/site/${SLUG}`, `/site/${SLUG}/infos-legales`, '/p/inexistant-xyz', '/site/inexistant-xyz', '/site/inexistant-xyz/infos-legales', '/p/', '/site/', '/onboarding', '/profil', '/parametres', '/plateforme', '/devis', '/factures']) {
    const r = await fetch(`${APP}${u}`, { redirect: 'manual' }); const h = await r.text()
    log(`GET ${u}`, { status: r.status, loc: r.headers.get('location'), title: (h.match(/<title>([^<]*)/) || [])[1]?.slice(0, 70), robots: (h.match(/name="robots" content="([^"]+)"/) || [])[1], h1: (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>/g, '').slice(0, 60) })
  }
  if (NEUTRE) for (const u of [`https://${NEUTRE}/${SLUG}`, `https://${SLUG}.${NEUTRE}/`, `https://${NEUTRE}/atelier-du-chene`]) {
    const r = await fetch(u, { redirect: 'manual' }).catch((e) => ({ status: 'ERR ' + e.message, headers: new Map(), text: async () => '' })); const h = await r.text()
    log(`GET ${u}`, { status: r.status, loc: r.headers.get?.('location'), title: (h.match(/<title>([^<]*)/) || [])[1]?.slice(0, 70) })
  }
})

const b = await chromium.launch()
for (const [tag, opts] of [['d', { viewport: { width: 1360, height: 900 } }], ['m', devices['iPhone 13']]]) {
  const ctx = await b.newContext({ ...opts, locale: 'fr-FR' }); const p = await ctx.newPage(); wire(p)
  await step(`${tag} /p`, async () => {
    await p.goto(`${APP}/p/${SLUG}`, { waitUntil: 'load' }); await p.waitForTimeout(2500)
    const ov = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: innerWidth, h1: document.querySelector('h1,h2')?.textContent?.trim().slice(0, 80), amorces: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => t.length > 8).slice(0, 8), textarea: !!document.querySelector('textarea'), placeholder: document.querySelector('textarea')?.placeholder }))
    log(`${tag} /p état`, ov)
    await obs(p, `${tag}-p-accueil`)
    // Identification : vide → invalide → valide (email de test)
    const form = p.locator('.pchat-compte form, form:has(.pchat-compte-b)').first()
    const emailIn = p.locator('input[type=email][aria-label="Votre email"]')
    log(`${tag} form identification visible`, await emailIn.isVisible().catch(() => false))
    await p.getByRole('button', { name: /Recevoir mon lien/ }).click({ force: true }).catch(() => {})
    log(`${tag} identification vide`, await p.evaluate(() => { const i = document.querySelector('input[type=email][aria-label="Votre email"]'); return i ? { valid: i.checkValidity(), msg: i.validationMessage } : null }))
    await emailIn.fill('pas-un-email'); await p.getByRole('button', { name: /Recevoir mon lien/ }).click({ force: true }).catch(() => {}); await p.waitForTimeout(800)
    log(`${tag} identification invalide`, { valid: await emailIn.evaluate((i) => i.checkValidity()), texts: await p.locator('.pchat-compte').innerText().then((t) => t.replace(/\s+/g, ' ')) })
    await emailIn.fill(`client.${Date.now()}@presti-test.invalid`); await p.getByRole('button', { name: /Recevoir mon lien/ }).click(); await p.waitForTimeout(3500)
    await obs(p, `${tag}-p-lien-demande`)
    // Photo jointe SANS envoi
    await p.setInputFiles('input[type=file]', { name: 'cuisine.png', mimeType: 'image/png', buffer: PNG }).catch((e) => log('setInputFiles', String(e).slice(0, 100)))
    await p.waitForTimeout(2000)
    log(`${tag} photo jointe`, { chips: await p.locator('.pchat-joint img, .pchat-joint > *').count(), envoiActif: !(await p.locator('button[aria-label="Envoyer"]').isDisabled()), draftVide: (await p.locator('textarea').inputValue()) === '' })
    await obs(p, `${tag}-p-photo`)
    // Lien magique bidon
    await p.goto(`${APP}/p/${SLUG}?connexion=jeton-bidon`, { waitUntil: 'load' }); await p.waitForTimeout(3000)
    log(`${tag} lien magique bidon`, { url: p.url().replace(APP, ''), compte: await p.locator('.pchat-compte').innerText().then((t) => t.replace(/\s+/g, ' ').slice(0, 200)) })
    await obs(p, `${tag}-p-lien-bidon`)
    // Lien infos légales + 404
    const infos = await p.locator('a', { hasText: /légal|Infos|Mentions/i }).first().getAttribute('href').catch(() => null)
    log(`${tag} lien infos légales`, infos)
    await p.goto(`${APP}/site/${SLUG}/infos-legales`, { waitUntil: 'load' }); await p.waitForTimeout(1500)
    log(`${tag} infos-legales texte`, (await p.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500))
    await obs(p, `${tag}-infos-legales`)
    await p.goto(`${APP}/site/${SLUG}`, { waitUntil: 'load' }); await p.waitForTimeout(2500)
    log(`${tag} /site état`, await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: innerWidth, titleLen: document.title.length, ctas: [...document.querySelectorAll('a.btn, a[href*="/p/"], a[href*="demande"]')].map((a) => a.textContent.trim().slice(0, 30) + '→' + a.getAttribute('href')).slice(0, 6), imgs: document.images.length, sections: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim().slice(0, 30)) })))
    await obs(p, `${tag}-site`)
    await p.goto(`${APP}/p/inexistant-xyz`, { waitUntil: 'load' }); await obs(p, `${tag}-404-p`)
  })
  await ctx.close()
}

// ── Compléments artisan : toast Enregistrer, clavier /login, navigation arrière, champs longs profil
await step('complements', async () => {
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, locale: 'fr-FR' }); const p = await ctx.newPage(); wire(p)
  await p.addInitScript(() => { try { localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} })
  await p.goto(`${APP}/login`, { waitUntil: 'load' })
  // clavier : Tab depuis le haut, Entrée soumet
  await p.keyboard.press('Tab'); const order = []
  for (let i = 0; i < 7; i++) { order.push(await p.evaluate(() => { const a = document.activeElement; return `${a.tagName.toLowerCase()}[${a.id || a.getAttribute('aria-label') || a.textContent?.trim().slice(0, 18)}]` })); await p.keyboard.press('Tab') }
  log('login tab order', order)
  await p.fill('input[type=email]', EMAIL); await p.fill('input[type=password]', PW); await p.keyboard.press('Enter'); await p.waitForTimeout(5000)
  log('login Entrée →', p.url().replace(APP, ''))
  await p.goto(`${APP}/profil`, { waitUntil: 'load' }); await p.waitForTimeout(3500)
  const btn = p.getByRole('button', { name: /^Enregistrer$/ }).first()
  await btn.click(); const t0 = Date.now()
  let toast = null; for (let i = 0; i < 40; i++) { const t = await p.locator('.msg').allInnerTexts(); if (t.length) { toast = { t, ms: Date.now() - t0 }; break } await p.waitForTimeout(100) }
  log('toast après Enregistrer', toast)
  log('bouton pendant sauvegarde', await btn.innerText())
  // champs trop longs : nom 2000 chars, tel 200 chars
  const nomIn = p.locator('.prof-field input, input').filter({ hasNot: p.locator('[type=checkbox]') }).first()
  const info = await p.evaluate(() => [...document.querySelectorAll('input:not([type=checkbox]):not([type=file]), textarea')].map((i) => `${i.id || i.placeholder || i.name || i.type}:max=${i.maxLength}`).slice(0, 30))
  log('maxLength des champs profil', info)
  // retour arrière après enregistrement (bfcache / état)
  await p.goto(`${APP}/dashboard`, { waitUntil: 'load' }); await p.waitForTimeout(2000); await p.goBack({ waitUntil: 'load' }); await p.waitForTimeout(3000)
  await obs(p, 'c-profil-retour-arriere')
  // /login connecté → ?
  await p.goto(`${APP}/login`, { waitUntil: 'load' }); await p.waitForTimeout(3000); log('/login quand déjà connecté →', p.url().replace(APP, ''))
  await p.goto(`${APP}/signup`, { waitUntil: 'load' }); await p.waitForTimeout(3000); log('/signup quand déjà connecté →', p.url().replace(APP, ''))
  // /plateforme mobile viewport cause
  const m = await b.newContext({ ...devices['iPhone 13'], locale: 'fr-FR' }); const mp = await m.newPage()
  await mp.addInitScript(() => { try { localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} })
  await mp.goto(`${APP}/login`, { waitUntil: 'load' }); await mp.fill('input[type=email]', EMAIL); await mp.fill('input[type=password]', PW); await mp.getByRole('button', { name: /Se connecter/ }).click(); await mp.waitForTimeout(5000)
  for (const u of ['/plateforme', '/plateforme?onglet=apparence', '/messages', '/devis', '/factures', '/inventaire', '/tarifs']) {
    await mp.goto(`${APP}${u}`, { waitUntil: 'load' }).catch(() => {}); await mp.waitForTimeout(3500)
    log(`m ${u}`, await mp.evaluate(() => ({ url: location.pathname + location.search, innerW: innerWidth, scrollW: document.documentElement.scrollWidth, vp: document.querySelector('meta[name=viewport]')?.content, vide: document.querySelector('.psh-empty, .vide, [class*=empty]')?.textContent?.trim().slice(0, 140) })))
    await mp.screenshot({ path: `${OUT}/m-${u.replace(/[^a-z]/g, '')}.png` }).catch(() => {})
  }
  await m.close(); await ctx.close()
})
await b.close()
