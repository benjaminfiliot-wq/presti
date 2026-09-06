// Test permanent — L'app installable (prompt v9 §2.6), contre la production (ou un build de prod local).
//
// Ce qu'il prouve, dans l'ordre :
//   1. le manifeste : servi en application/manifest+json, champs attendus, icônes « any » ET « maskable »
//      en 192/512 aux bonnes dimensions (le maskable est opaque jusqu'au coin), captures aux dimensions
//      déclarées, raccourcis qui répondent une fois connecté ;
//   2. les métadonnées : manifeste + app iOS + couleur de thème sur les surfaces Presti, et RIEN de tout
//      cela sur les surfaces artisan (/site, /p, leur 404) — white-label ;
//   3. les en-têtes : `worker-src 'self'` dans la CSP, /sw.js servi en JavaScript sans cache long ;
//   4. le service worker (Chromium, Pixel 7) : enregistré depuis la console, installable (CDP
//      Page.getInstallabilityErrors vide — l'équivalent de l'ancien audit Lighthouse « Installable »),
//      /hors-ligne servie sans réseau, une surface artisan hors ligne NE reçoit PAS la page Presti,
//      après un parcours complet (console, API, /p, /site) AUCUNE réponse /api, /auth, /p, /site ni aucune
//      page de la console dans les caches ; bandeau « nouvelle version » quand un worker attend, et
//      rechargement au clic ;
//   5. la carte d'installation : Android (beforeinstallprompt → bouton → prompt rejoué ; refus mémorisé ;
//      rien en mode standalone, rien sur bureau, rien sur la landing) et iOS (les deux gestes, Partager) ;
//   6. l'app installée : bouton retour ≥ 44 px sur une page profonde, liens externes et surfaces artisan
//      ouverts dans un nouvel onglet (sinon l'artisan est piégé sans barre d'adresse).
//
// Coût : 0 IA, 0 email réel. Usage : node scripts/pwa-e2e.mjs   (TEST_BASE=http://localhost:3116 pour un build local)
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { chromium, webkit, devices } from 'playwright'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
const LOCAL = /^http:\/\/localhost/.test(APP)
const OUT = process.env.CAPTURES || 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/pwa'
fs.mkdirSync(OUT, { recursive: true })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const DEMO = { email: 'demo-menuisier@presti-test.invalid', slug: 'atelier-du-chene' }

/** Contre un serveur local en http, WebKit demande https://localhost (CSP upgrade-insecure-requests) : on sert depuis http. */
async function nouveauContexte(b, options) {
  const ctx = await b.newContext(options)
  if (LOCAL) {
    await ctx.route(/^https:\/\/localhost(:\d+)?\//, async (route) => {
      const req = route.request(); const u = req.url().replace(/^https:/, 'http:')
      try {
        const r = await fetch(u, { method: req.method(), headers: req.headers(), body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postDataBuffer() ?? undefined, redirect: 'manual' })
        const headers = {}; r.headers.forEach((v, k) => { if (!/^(content-encoding|transfer-encoding|content-length|connection)$/i.test(k)) headers[k] = v })
        await route.fulfill({ status: r.status, headers, body: Buffer.from(await r.arrayBuffer()) })
      } catch { await route.abort() }
    })
  }
  return ctx
}

// ── Le compte connecté : la démo « Atelier du Chêne » ──────────────────────────────────────────────
const users = await (await admin('users?per_page=200')).json()
const demo = (users.users || []).find((x) => x.email === DEMO.email)
if (!demo) { console.log('❌ compte démo introuvable'); process.exit(1) }
const mdp = 'pwa-' + Math.random().toString(36).slice(2, 10) + '-Aa1!'
await admin(`users/${demo.id}`, { method: 'PUT', body: JSON.stringify({ password: mdp }) })
const sess = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEMO.email, password: mdp }) })).json()
if (!sess.access_token) { console.log('❌ connexion du compte démo impossible'); process.exit(1) }
await verifierSessionTest(sess.access_token)
const ref = SB.match(/https:\/\/([^.]+)\./)[1], CLE_SESSION = `sb-${ref}-auth-token`
const initSession = ([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console', 'visite:messages', 'visite:devis', 'visite:plateforme', 'visite:inventaire'])) } catch {} }

// ── 1. Le manifeste ────────────────────────────────────────────────────────────────────────────────
console.log('\n1. Le manifeste')
const rm = await fetch(`${APP}/manifest.webmanifest`)
T('manifeste servi (200)', rm.status === 200, `HTTP ${rm.status}`)
T('type application/manifest+json', /application\/manifest\+json/.test(rm.headers.get('content-type') || ''), rm.headers.get('content-type') || '')
const man = await rm.json().catch(() => ({}))
T('name et short_name « Presti »', man.name === 'Presti' && man.short_name === 'Presti')
T('id « / », scope « / », start_url /dashboard?source=pwa', man.id === '/' && man.scope === '/' && man.start_url === '/dashboard?source=pwa', `${man.id} ${man.scope} ${man.start_url}`)
T('display standalone + display_override', man.display === 'standalone' && Array.isArray(man.display_override) && man.display_override[0] === 'standalone')
T('lang fr, dir ltr, aucun verrou d’orientation (tablette, paysage — WCAG 1.3.4)', man.lang === 'fr' && man.dir === 'ltr' && (!man.orientation || man.orientation === 'any'), `orientation: ${man.orientation}`)
T('couleurs de fond et de thème #0A0C11', man.background_color === '#0A0C11' && man.theme_color === '#0A0C11')
T('catégories business/productivity', Array.isArray(man.categories) && man.categories.includes('business') && man.categories.includes('productivity'))
const sharp = (await import('sharp')).default
const icones = man.icons || []
for (const pur of ['any', 'maskable']) for (const taille of ['192x192', '512x512']) {
  const ic = icones.find((i) => (i.purpose || 'any') === pur && i.sizes === taille)
  if (!ic) { T(`icône ${pur} ${taille} déclarée`, false, 'absente du manifeste'); continue }
  const r = await fetch(`${APP}${ic.src}`)
  const buf = Buffer.from(await r.arrayBuffer())
  let dims = '', coin = null
  try { const m = await sharp(buf).metadata(); dims = `${m.width}x${m.height}`; const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true }); coin = [data[0], data[1], data[2], data[3]]; void info } catch {}
  T(`icône ${pur} ${taille} : ${ic.src} servie en PNG aux bonnes dimensions`, r.status === 200 && /image\/png/.test(r.headers.get('content-type') || '') && dims === taille && ic.type === 'image/png', `HTTP ${r.status} ${dims}`)
  if (pur === 'maskable') T(`icône maskable ${taille} opaque jusqu'au coin (fond nuit plein cadre)`, !!coin && coin[3] === 255 && coin[0] < 30 && coin[1] < 30 && coin[2] < 40, JSON.stringify(coin))
}
const captures = man.screenshots || []
T('captures : au moins 2 « narrow » et 1 « wide »', captures.filter((c) => c.form_factor === 'narrow').length >= 2 && captures.some((c) => c.form_factor === 'wide'))
for (const c of captures) {
  const r = await fetch(`${APP}${c.src}`)
  let dims = ''; try { const m = await sharp(Buffer.from(await r.arrayBuffer())).metadata(); dims = `${m.width}x${m.height}` } catch {}
  T(`capture ${c.src} servie aux dimensions déclarées (${c.sizes})`, r.status === 200 && dims === c.sizes && !!c.label, `HTTP ${r.status} ${dims}`)
}
const raccourcis = man.shortcuts || []
T('3 raccourcis (Messages, Nouveau devis, Inventaire) avec icône', raccourcis.length === 3 && raccourcis.every((s) => s.url && s.icons?.[0]?.src) && raccourcis.map((s) => s.url).join(' ') === '/messages /devis/nouveau /inventaire', raccourcis.map((s) => s.url).join(' '))

// ── 2. Les métadonnées : surfaces Presti oui, surfaces artisan non ─────────────────────────────────
console.log('\n2. Les métadonnées et le white-label')
const html = async (chemin) => { const r = await fetch(`${APP}${chemin}`, { headers: { Accept: 'text/html' }, redirect: 'follow' }); return { status: r.status, t: await r.text(), h: r.headers } }
for (const chemin of ['/', '/login', '/dashboard']) {
  const { t } = await html(chemin)
  // Next rend `mobile-web-app-capable` (norme) ; `apple-mobile-web-app-capable` est ajouté pour les iOS < 17.4.
  const attendu = {
    manifeste: /rel="manifest"[^>]*href="[^"]*manifest\.webmanifest"|href="[^"]*manifest\.webmanifest"[^>]*rel="manifest"/,
    capable: /name="mobile-web-app-capable"\s+content="yes"/,
    capableApple: /name="apple-mobile-web-app-capable"\s+content="yes"/,
    titre: /name="apple-mobile-web-app-title"\s+content="Presti"/,
    barre: /name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"/,
    theme: /name="theme-color"\s+content="#0A0C11"/,
  }
  const manquant = Object.entries(attendu).filter(([, re]) => !re.test(t)).map(([k]) => k)
  T(`${chemin} : manifeste relié, app iOS (capable ×2, titre, barre d’état), couleur de thème`, manquant.length === 0, `manque : ${manquant.join(', ')}`)
}
for (const chemin of [`/site/${DEMO.slug}`, `/site/${DEMO.slug}/infos-legales`, `/site/${DEMO.slug}/page-inexistante-pwa`, `/p/${DEMO.slug}`]) {
  const { status, t } = await html(chemin)
  const fuite = [/rel="manifest"/, /manifest\.webmanifest/, /apple-mobile-web-app/, /name="theme-color"/, /psh-installer/, /Installer Presti/].filter((re) => re.test(t)).map(String)
  T(`${chemin} (${status}) : ni manifeste, ni app iOS, ni couleur de thème, ni invitation — white-label`, fuite.length === 0, fuite.join(' '))
}

// ── 3. Les en-têtes ────────────────────────────────────────────────────────────────────────────────
console.log('\n3. Les en-têtes')
{
  const { h } = await html('/dashboard')
  T("CSP de la console : worker-src 'self'", /worker-src 'self'/.test(h.get('content-security-policy') || ''), (h.get('content-security-policy') || '').slice(0, 120))
  const r = await fetch(`${APP}/sw.js`)
  const cc = r.headers.get('cache-control') || ''
  T('/sw.js servi en JavaScript', r.status === 200 && /javascript/.test(r.headers.get('content-type') || ''), `HTTP ${r.status} ${r.headers.get('content-type')}`)
  T('/sw.js sans cache long (le navigateur doit voir les mises à jour)', !/immutable/.test(cc) && !/max-age=\d{4,}/.test(cc), cc)
  const sw = await r.text()
  T('/sw.js : repli /hors-ligne.html, exclusion de /p, /site et /l, jamais skipWaiting automatique', sw.includes('/hors-ligne.html') && /\(p\|site\|l\)/.test(sw) && !/skipWaiting:!0|skipWaiting:true/.test(sw))
  const hl = await html('/hors-ligne.html')
  T('/hors-ligne.html : fichier statique, AUCUN script, « Réessayer » recharge l’adresse demandée (href vide)', hl.status === 200 && hl.t.includes('data-presti-hors-ligne') && hl.t.includes('Vous êtes hors ligne') && !/<script/i.test(hl.t) && /href=""[^>]*>Réessayer</.test(hl.t) && hl.t.includes('href="/dashboard"'))
  const hl2 = await html('/hors-ligne')
  T('/hors-ligne (adresse lisible) : réécrite vers le fichier statique', hl2.status === 200 && hl2.t.includes('data-presti-hors-ligne') && !/<script/i.test(hl2.t))
  // Par en-tête Host (fetch l'interdit, http/https non) : les fichiers de l'app existent sur les hôtes MAISON
  // (qg. = la console, www.) et pas sur un hôte d'artisan. Revue du 06/09 : le middleware renvoyait la 404 artisan
  // sur qg.prestiapp.fr, et aucune sonde ne le voyait.
  const sonder = (hote, chemin) => new Promise((resolve) => {
    const { request } = LOCAL ? http : https
    const base = LOCAL ? { hostname: '127.0.0.1', port: Number(new URL(APP).port || 80) } : { hostname: 'prestiapp.fr', servername: 'prestiapp.fr', port: 443 }
    const req = request({ ...base, path: chemin, method: 'GET', headers: { Host: hote, 'user-agent': 'presti-pwa-e2e' } }, (res) => { const morceaux = []; res.on('data', (c) => morceaux.push(c)); res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'] || '', t: Buffer.concat(morceaux).toString('utf8') })) })
    req.on('error', () => resolve({ status: 0, type: '', t: '' })); req.end()
  })
  // (www.prestiapp.fr n'est pas rattaché au projet Vercel — connexion refusée — : seul qg. est sondé)
  for (const hote of ['qg.prestiapp.fr']) {
    const r = await Promise.all([sonder(hote, '/sw.js'), sonder(hote, '/manifest.webmanifest'), sonder(hote, '/hors-ligne.html'), sonder(hote, '/marque/presti-marque-corail.svg')])
    const ok = r[0].status === 200 && /javascript/.test(r[0].type) && r[0].t.includes('hors-ligne.html') && r[1].status === 200 && /manifest\+json/.test(r[1].type) && r[2].status === 200 && r[2].t.includes('data-presti-hors-ligne') && r[3].status === 200 && /svg/.test(r[3].type)
    T(`hôte maison ${hote} : sw.js, manifeste, hors-ligne.html et marque servis (200)`, ok, r.map((x) => x.status).join(' '))
  }
  const NEUTRE = (process.env.NEXT_PUBLIC_DOMAINE_NEUTRE || '').trim().toLowerCase()
  if (NEUTRE) {
    const hote = `${DEMO.slug}.${NEUTRE}`
    const r = await Promise.all([sonder(hote, '/sw.js'), sonder(hote, '/manifest.webmanifest'), sonder(hote, '/hors-ligne.html'), sonder(hote, '/marque/presti-icone-512.png')])
    T(`hôte d’artisan ${hote} : aucun fichier de l’app Presti (404, sans « Presti »)`, r.every((x) => x.status === 404 && !/Presti/.test(x.t)), r.map((x) => x.status).join(' '))
  } else console.log('  ℹ️  NEXT_PUBLIC_DOMAINE_NEUTRE absent ici : la sonde « hôte d’artisan » est jouée par domaine-perso-e2e / en prod')
}

// ── 4. Le service worker (Chromium, Pixel 7) ───────────────────────────────────────────────────────
console.log('\n4. Le service worker (Pixel 7 · Chrome)')
const pixel = devices['Pixel 7']
const cr = await chromium.launch()
{
  const ctx = await nouveauContexte(cr, { ...pixel, locale: 'fr-FR', reducedMotion: 'reduce' })
  await ctx.addInitScript(initSession, [CLE_SESSION, sess])
  const page = await ctx.newPage()
  await page.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  const reg = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then((r) => ({ scope: r.scope, url: r.active?.scriptURL || '' })), new Promise((r) => setTimeout(() => r(null), 20000))]))
  T('service worker enregistré depuis la console, portée « / »', !!reg && /\/$/.test(reg.scope) && /\/sw\.js$/.test(reg.url), JSON.stringify(reg))
  // clientsClaim : le worker contrôle la page sans rechargement
  await page.waitForTimeout(800)
  const controle = await page.evaluate(() => !!navigator.serviceWorker.controller)
  T('la page est contrôlée sans rechargement (clientsClaim)', controle)
  if (!LOCAL) {
    // l'hôte réel de la console : le worker doit s'y enregistrer aussi (revue du 06/09 : 404 sur /sw.js via le middleware)
    const cq = await cr.newContext({ ...pixel, locale: 'fr-FR', reducedMotion: 'reduce' })
    await cq.addInitScript(initSession, [CLE_SESSION, sess])
    const pq = await cq.newPage()
    await pq.goto('https://qg.prestiapp.fr/dashboard', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    const rq = await pq.evaluate(() => Promise.race([navigator.serviceWorker.ready.then((r) => ({ scope: r.scope, url: r.active?.scriptURL || '' })), new Promise((r) => setTimeout(() => r(null), 20000))])).catch(() => null)
    T('qg.prestiapp.fr (hôte de la console) : service worker enregistré, portée https://qg.prestiapp.fr/', !!rq && rq.scope === 'https://qg.prestiapp.fr/' && /\/sw\.js$/.test(rq.url), JSON.stringify(rq))
    await cq.close()
  }
  // installabilité (CDP) — l'équivalent de l'ancien audit Lighthouse « Installable »
  const cdp = await ctx.newCDPSession(page)
  const inst = await cdp.send('Page.getInstallabilityErrors').catch((e) => ({ erreur: String(e) }))
  const erreursInst = (inst.installabilityErrors || []).map((e) => e.errorId)
  T('installable selon Chrome (Page.getInstallabilityErrors vide)', !inst.erreur && erreursInst.length === 0, inst.erreur || erreursInst.join(', '))
  const am = await cdp.send('Page.getAppManifest').catch((e) => ({ erreur: String(e) }))
  T('manifeste lu par Chrome sans erreur', !am.erreur && (am.errors || []).filter((e) => e.critical).length === 0 && /manifest\.webmanifest$/.test(am.url || ''), am.erreur || JSON.stringify(am.errors || []).slice(0, 200))
  const bip = await page.evaluate(() => new Promise((r) => { window.addEventListener('beforeinstallprompt', () => r(true), { once: true }); setTimeout(() => r(false), 4000) }))
  console.log(`  ℹ️  beforeinstallprompt en headless : ${bip ? 'reçu' : 'non reçu (attendu en headless — la preuve d’installabilité est le CDP ci-dessus, et le téléphone de Benj)'}`)
  // parcours complet : console, API, surfaces artisan — puis inspection des caches
  await page.evaluate((tok) => fetch('/api/auth/code', { headers: { Authorization: `Bearer ${tok}` } }).catch(() => null), sess.access_token)
  for (const chemin of ['/messages', '/devis', '/devis/nouveau', '/inventaire', '/parametres', `/p/${DEMO.slug}`, `/site/${DEMO.slug}`, '/dashboard']) {
    await page.goto(`${APP}${chemin}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  }
  const caches = await page.evaluate(async () => { const out = {}; for (const k of await window.caches.keys()) { const c = await window.caches.open(k); out[k] = (await c.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search) } return out })
  const toutes = Object.values(caches).flat()
  const interdites = toutes.filter((u) => /^\/(api|auth|p|site)\//.test(u) || /^\/(dashboard|messages|devis|factures|inventaire|parametres|profil|plateforme|abonnement|outils|tarifs|aide)(\/|\?|$)/.test(u))
  T(`caches après le parcours : ${toutes.length} entrées, aucune réponse /api, /auth, /p, /site ni page de la console`, toutes.length > 0 && interdites.length === 0, interdites.slice(0, 6).join(' '))
  T('précache : /hors-ligne.html et les icônes de marque y sont', toutes.some((u) => u.startsWith('/hors-ligne.html')) && toutes.some((u) => u.startsWith('/marque/presti-icone-maskable-512.png')), Object.keys(caches).join(', '))
  T('/_next/static mis en cache à l’usage', toutes.some((u) => u.startsWith('/_next/static/')))
  fs.writeFileSync(`${OUT}/caches.json`, JSON.stringify(caches, null, 1))
  // hors ligne
  await ctx.setOffline(true)
  const rOff = await page.goto(`${APP}/devis`, { waitUntil: 'load', timeout: 30000 }).catch(() => null)
  const cOff = await page.content().catch(() => '')
  T('hors ligne : /devis → la page /hors-ligne précachée, lisible', !!rOff && cOff.includes('data-presti-hors-ligne') && cOff.includes('Vous êtes hors ligne'), rOff ? `HTTP ${rOff.status()}` : 'aucune réponse')
  await page.screenshot({ path: `${OUT}/hors-ligne-pixel.png` }).catch(() => {})
  const rArt = await page.goto(`${APP}/p/${DEMO.slug}`, { waitUntil: 'load', timeout: 30000 }).catch(() => null)
  const cArt = rArt ? await page.content().catch(() => '') : ''
  T('hors ligne : /p/[slug] ne reçoit PAS la page Presti (erreur navigateur, white-label)', !rArt || !cArt.includes('data-presti-hors-ligne'), rArt ? `HTTP ${rArt.status()}` : '')
  const rSite = await page.goto(`${APP}/site/${DEMO.slug}`, { waitUntil: 'load', timeout: 30000 }).catch(() => null)
  const cSite = rSite ? await page.content().catch(() => '') : ''
  T('hors ligne : /site/[slug] ne reçoit PAS la page Presti', !rSite || !cSite.includes('data-presti-hors-ligne'), rSite ? `HTTP ${rSite.status()}` : '')
  // l'ancienne adresse des plateformes (/l/<slug>, redirigée en ligne) : hors ligne, pas de redirection — et pas de page Presti non plus
  const rL = await page.goto(`${APP}/l/${DEMO.slug}`, { waitUntil: 'load', timeout: 30000 }).catch(() => null)
  const cL = rL ? await page.content().catch(() => '') : ''
  T('hors ligne : /l/[slug] (ancien lien distribué) ne reçoit PAS la page Presti', !rL || !cL.includes('data-presti-hors-ligne'), rL ? `HTTP ${rL.status()}` : '')
  await ctx.setOffline(false)
  // mise à jour : un worker qui attend → bandeau → rechargement au clic
  await page.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js?maj=1').catch(() => null))
  const bandeau = await page.waitForSelector('[data-presti-maj]', { timeout: 25000 }).catch(() => null)
  T('nouvelle version en attente → bandeau « Une nouvelle version de Presti est prête »', !!bandeau && /nouvelle version/i.test(await page.textContent('[data-presti-maj]').catch(() => '')))
  await page.screenshot({ path: `${OUT}/bandeau-maj-pixel.png` }).catch(() => {})
  const controleurEst = (p, marque) => p.evaluate((m) => !!navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL.includes(m), marque).catch(() => false)
  const attendreControleur = async (p, marque) => { for (let i = 0; i < 40; i++) { await p.waitForTimeout(500); if (await controleurEst(p, marque)) return true } return false }
  if (bandeau) {
    await page.click('[data-presti-maj] button.primary').catch(() => {})
    T('clic « Recharger » → le nouveau worker prend la main et la page est rechargée', await attendreControleur(page, 'maj=1'))
  } else T('clic « Recharger » → le nouveau worker prend la main', false, 'pas de bandeau')
  // deux onglets (revue du 06/09) : « Recharger » dans A ne recharge PAS B, où un devis est en cours ; B voit le
  // bandeau, « Plus tard » le masque, et son propre « Recharger » fonctionne bien qu'aucun worker n'attende plus.
  const pageB = await ctx.newPage()
  await pageB.goto(`${APP}/devis/nouveau`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await pageB.evaluate(() => { window.__onglet_b = 'vivant' })
  await page.evaluate(() => navigator.serviceWorker.register('/sw.js?maj=2').catch(() => null))
  const bandeauA = await page.waitForSelector('[data-presti-maj]', { timeout: 25000 }).catch(() => null)
  if (bandeauA) await page.click('[data-presti-maj] button.primary').catch(() => {})
  const aPris = await attendreControleur(page, 'maj=2')
  await pageB.waitForTimeout(1500)
  const bVivant = await pageB.evaluate(() => window.__onglet_b === 'vivant').catch(() => false)
  const bControle = await controleurEst(pageB, 'maj=2')
  const bBandeau = await pageB.waitForSelector('[data-presti-maj]', { timeout: 8000 }).catch(() => null)
  T('deux onglets : « Recharger » dans A ne recharge pas B (sa saisie reste), B voit le bandeau', !!bandeauA && aPris && bVivant && bControle && !!bBandeau, JSON.stringify({ bandeauA: !!bandeauA, aPris, bVivant, bControle, bBandeau: !!bBandeau }))
  if (bBandeau) {
    await pageB.click('[data-presti-maj] button.ghost').catch(() => {})
    await pageB.waitForTimeout(300)
    const masque = (await pageB.$('[data-presti-maj]')) === null
    const memo = await pageB.evaluate(() => sessionStorage.getItem('presti.maj_reportee')).catch(() => null)
    T('« Plus tard » masque le bandeau pour cet onglet (report horodaté, lié au worker en attente)', masque && !!memo && /"url":/.test(memo) && /"t":\d+/.test(memo), memo || '')
    await pageB.evaluate(() => sessionStorage.removeItem('presti.maj_reportee')).catch(() => {})
    await pageB.reload({ waitUntil: 'networkidle' }).catch(() => {})
    T('B rechargé par l’artisan lui-même : sur la nouvelle version', await controleurEst(pageB, 'maj=2'))
  } else { T('« Plus tard » masque le bandeau', false, 'pas de bandeau dans B'); T('B rechargé par l’artisan lui-même', false, 'pas de bandeau dans B') }
  await pageB.close()
  await ctx.close()
}

// ── 5. La carte d'installation ─────────────────────────────────────────────────────────────────────
console.log('\n5. La carte d’installation')
const simulerPrompt = (page) => page.evaluate(() => {
  const e = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(e, { prompt: () => { window.__prompt_joue = (window.__prompt_joue || 0) + 1; return Promise.resolve() }, userChoice: Promise.resolve({ outcome: 'accepted' }) })
  window.dispatchEvent(e)
})
{
  const ctx = await nouveauContexte(cr, { ...pixel, locale: 'fr-FR', reducedMotion: 'reduce' })
  await ctx.addInitScript(initSession, [CLE_SESSION, sess])
  const page = await ctx.newPage()
  await page.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(600)
  await simulerPrompt(page)
  const carte = await page.waitForSelector('.psh-installer[data-mode="android"]', { timeout: 5000 }).catch(() => null)
  T('Android : beforeinstallprompt → carte « Installer Presti sur votre téléphone » avec bouton', !!carte && /Installer Presti sur votre téléphone/.test(await page.textContent('.psh-installer').catch(() => '')) && (await page.$('.psh-installer button.psh-btn')) !== null)
  await page.screenshot({ path: `${OUT}/carte-android.png` }).catch(() => {})
  // Les styles sont-ils LÀ ? (06/09 : le bloc CSS manquait, la suite passait, la capture montrait une carte nue
  // et une croix pleine largeur — le style global button{width:100%} s'appliquait.)
  const styles = await page.evaluate(() => { const c = document.querySelector('.psh-installer'); const x = document.querySelector('.psh-installer-x'); if (!c || !x) return null; const cs = getComputedStyle(c), xs = getComputedStyle(x); const r = x.getBoundingClientRect(); return { display: cs.display, bord: cs.borderTopWidth, xw: Math.round(r.width), xh: Math.round(r.height), xbg: xs.backgroundColor } })
  T('carte stylée : flex, bordure, croix 44×44 sans fond — le CSS est bien servi', !!styles && styles.display === 'flex' && styles.bord !== '0px' && styles.xw === 44 && styles.xh === 44 && /rgba\(0, 0, 0, 0\)|transparent/.test(styles.xbg), JSON.stringify(styles))
  const bouton = await page.$('.psh-installer button.psh-btn')
  if (bouton) {
    const b = await bouton.boundingBox()
    T('bouton « Installer » ≥ 44 px de haut', !!b && b.height >= 43.5, b ? `${Math.round(b.width)}×${Math.round(b.height)}` : '')
    await bouton.click()
    await page.waitForTimeout(400)
    const joue = await page.evaluate(() => window.__prompt_joue || 0)
    T('clic « Installer » → prompt() rejoué, carte retirée', joue === 1 && (await page.$('.psh-installer')) === null)
  }
  // refus mémorisé 30 jours
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(600)
  await simulerPrompt(page)
  await page.waitForSelector('.psh-installer', { timeout: 5000 }).catch(() => null)
  await page.click('.psh-installer-x').catch(() => {})
  await page.waitForTimeout(300)
  const memo = await page.evaluate(() => localStorage.getItem('presti.installer_refus'))
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(600)
  await simulerPrompt(page)
  await page.waitForTimeout(800)
  T('refus (×) mémorisé : plus de carte au chargement suivant', !!memo && (await page.$('.psh-installer')) === null)
  await page.evaluate(() => localStorage.removeItem('presti.installer_refus'))
  // déjà installée : rien — Chrome (display-mode: standalone) et iOS (navigator.standalone). L'émulation CDP de
  // display-mode n'atteint pas matchMedia en headless (sondé le 06/09) : on pose l'état d'un vrai téléphone dans la page.
  for (const [nom, init] of [
    ['Android installée (display-mode: standalone)', () => { const o = window.matchMedia.bind(window); window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false } : o(q)) }],
    ['iPhone installée (navigator.standalone = true)', () => { Object.defineProperty(navigator, 'standalone', { get: () => true }) }],
  ]) {
    const c2 = await nouveauContexte(cr, { ...pixel, locale: 'fr-FR', reducedMotion: 'reduce' })
    await c2.addInitScript(initSession, [CLE_SESSION, sess])
    await c2.addInitScript(init)
    const p2 = await c2.newPage()
    await p2.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await p2.waitForTimeout(600); await simulerPrompt(p2); await p2.waitForTimeout(800)
    T(`déjà installée — ${nom} : aucune carte`, (await p2.$('.psh-installer')) === null)
    await c2.close()
  }
  // page profonde : le bouton retour de l'en-tête (pas de barre d'adresse en mode installé)
  await page.goto(`${APP}/devis/nouveau`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  const retour = await page.$('.psh-back')
  const rb = retour ? await retour.boundingBox() : null
  T('page profonde : bouton retour visible dans l’en-tête, ≥ 44 px', !!rb && rb.height >= 43.5 && rb.width >= 43.5, rb ? `${Math.round(rb.width)}×${Math.round(rb.height)}` : 'absent')
  // raccourcis du manifeste : ils répondent, connecté
  for (const s of raccourcis) {
    const r = await page.goto(`${APP}${s.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null)
    await page.waitForTimeout(500)
    T(`raccourci « ${s.name} » (${s.url}) répond connecté`, !!r && r.status() === 200 && !/\/login/.test(page.url()), r ? `HTTP ${r.status()} → ${page.url()}` : 'aucune réponse')
  }
  // écrans de conversation : chaque pixel pour le fil — aucune carte (sur iPad elle poussait le composeur sous le clavier)
  for (const chemin of ['/messages', '/plateforme']) {
    await page.goto(`${APP}${chemin}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(600); await simulerPrompt(page); await page.waitForTimeout(800)
    T(`${chemin} : aucune carte d’installation sur un écran de conversation`, (await page.$('.psh-installer')) === null)
  }
  // liens externes et surfaces artisan : nouvel onglet (sinon l'artisan est piégé sans barre d'adresse)
  const pieges = []
  for (const chemin of ['/dashboard', '/profil', '/plateforme', '/abonnement', '/parametres', '/inventaire/fournisseurs', '/devis']) {
    await page.goto(`${APP}${chemin}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    const l = await page.evaluate(() => [...document.querySelectorAll('a[href]')].filter((a) => { let u; try { u = new URL(a.getAttribute('href'), location.href) } catch { return false } if (!/^https?:$/.test(u.protocol)) return false; const externe = u.origin !== location.origin; const artisan = /^\/(site|p)\//.test(u.pathname); return (externe || artisan) && a.getAttribute('target') !== '_blank' }).map((a) => `${a.getAttribute('href')} « ${(a.textContent || '').trim().slice(0, 30)} »`))
    for (const x of l) pieges.push(`${chemin}: ${x}`)
  }
  T('liens externes et surfaces artisan ouverts dans un nouvel onglet (target=_blank)', pieges.length === 0, pieges.slice(0, 6).join(' | '))
  await ctx.close()
}
{
  // bureau à la souris : pas de carte (le navigateur a son bouton, et elle parle « de votre téléphone »)
  const ctx = await nouveauContexte(cr, { viewport: { width: 1280, height: 800 }, locale: 'fr-FR', reducedMotion: 'reduce' })
  await ctx.addInitScript(initSession, [CLE_SESSION, sess])
  const page = await ctx.newPage()
  await page.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(600); await simulerPrompt(page); await page.waitForTimeout(800)
  T('bureau (souris, 1280 px) : aucune carte', (await page.$('.psh-installer')) === null)
  await ctx.close()
}
{
  // bureau à la souris, fenêtre étroite (deux fenêtres côte à côte) : toujours pas de carte — c'est le pointeur qui décide, pas la largeur
  const ctx = await nouveauContexte(cr, { viewport: { width: 1000, height: 700 }, locale: 'fr-FR', reducedMotion: 'reduce' })
  await ctx.addInitScript(initSession, [CLE_SESSION, sess])
  const page = await ctx.newPage()
  await page.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(600); await simulerPrompt(page); await page.waitForTimeout(800)
  T('bureau (souris, fenêtre de 1000 px) : aucune carte « sur votre téléphone »', (await page.$('.psh-installer')) === null)
  await ctx.close()
}
{
  // landing, non connecté : rien (la carte vit dans la console)
  const ctx = await nouveauContexte(cr, { ...pixel, locale: 'fr-FR', reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(`${APP}/`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(600); await simulerPrompt(page); await page.waitForTimeout(800)
  T('landing publique : aucune carte, aucun service worker enregistré depuis là', (await page.$('.psh-installer')) === null && (await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))) === 0)
  await ctx.close()
}
await cr.close()
{
  // iOS / Safari : les deux gestes
  let moteur = webkit, nomMoteur = 'WebKit'
  let b = null
  try { b = await webkit.launch() } catch { console.log('  ⚠️  WebKit absent (npx playwright install webkit) — la carte iOS est vérifiée sur Chromium avec le profil iPhone, moins fidèle') ; moteur = chromium; nomMoteur = 'Chromium (profil iPhone)'; b = await chromium.launch() }
  const ctx = await nouveauContexte(b, { ...devices['iPhone 14'], locale: 'fr-FR', reducedMotion: 'reduce' })
  await ctx.addInitScript(initSession, [CLE_SESSION, sess])
  const page = await ctx.newPage()
  await page.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  const carte = await page.waitForSelector('.psh-installer[data-mode="ios"]', { timeout: 8000 }).catch(() => null)
  const texte = carte ? await page.textContent('.psh-installer').catch(() => '') : ''
  T(`iPhone (${nomMoteur}) : carte avec les deux gestes — Partager, puis « Sur l’écran d’accueil » (icône décorative, dite une seule fois)`, !!carte && /Partager/.test(texte) && /écran d’accueil/.test(texte) && (await page.$('.psh-installer svg[aria-hidden="true"]')) !== null && (await page.$('.psh-installer svg[aria-label]')) === null, texte.slice(0, 80))
  await page.screenshot({ path: `${OUT}/carte-ios.png` }).catch(() => {})
  await page.click('.psh-installer-x').catch(() => {})
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(800)
  T('iPhone : refus mémorisé, plus de carte', (await page.$('.psh-installer')) === null)
  await ctx.close()
  // navigateur intégré (Instagram, Gmail…) ou Chrome iOS : le geste Safari n'existe pas → pas de carte
  for (const [nom, ua] of [['WebView Instagram', `${devices['iPhone 14'].userAgent} Instagram 300.0.0.0`], ['Chrome iOS', devices['iPhone 14'].userAgent.replace(/Version\/[\d.]+ Mobile/, 'CriOS/126.0.0.0 Mobile')]]) {
    const c3 = await nouveauContexte(b, { ...devices['iPhone 14'], userAgent: ua, locale: 'fr-FR', reducedMotion: 'reduce' })
    await c3.addInitScript(initSession, [CLE_SESSION, sess])
    const p3 = await c3.newPage()
    await p3.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await p3.waitForTimeout(1200)
    T(`iPhone dans ${nom} : aucune carte (le geste « Partager → Sur l’écran d’accueil » n’y existe pas)`, (await p3.$('.psh-installer')) === null)
    await c3.close()
  }
  await b.close()
  void moteur
}

console.log(`\n${ko === 0 ? '✅' : '❌'} pwa-e2e : ${ok}/${ok + ko} — ${APP}`)
process.exitCode = ko === 0 ? 0 : 1
