// Test permanent — Le site sur un téléphone (prompt v8, partie A2), contre la production.
//
// Trois profils Playwright : iPhone 14 (WebKit, Safari-like), Pixel 7 (Chromium), iPad Mini (WebKit).
// Pour CHAQUE page de l'inventaire (plans/inventaire-produit.md), non connectée puis connectée
// (compte démo atelier-du-chene, Signature) :
//   1. aucun défilement horizontal (scrollWidth ≤ innerWidth) ;
//   2. sur les pages publiques, un chemin VISIBLE vers /login dans l'en-tête (≥ 44 px) — le bug n° 1 :
//      sous 760 px la landing cachait « Se connecter » ;
//   3. aucune cible interactive < 44 × 44 px (exceptions justifiées : liens dans un texte courant,
//      cases à cocher dont l'étiquette est la cible, champs de formulaire en hauteur seulement) ;
//   4. aucun champ de saisie dont la taille de police calculée est < 16 px (iOS zoome sinon) ;
//   5. aucun élément interactif dont la boîte dépasse l'écran ;
//   6. axe-core : 0 violation critique ou grave sur mobile.
// Puis les parcours : connexion complète au doigt (mot de passe → code par email → console), le
// composeur des conversations qui reste visible quand la fenêtre visible perd 320 px (clavier),
// 0 tâche longue > 50 ms au défilement sur un profil ralenti ×4 (landing, site Signature), et
// Lighthouse mobile ≥ 90 perf / 100 accessibilité sur /, /login, /dashboard, /p/atelier-du-chene.
//
// Coût : 0 IA, 0 email réel. Usage :
//   node scripts/mobile-e2e.mjs [--profil=iphone|pixel|ipad] [--page=/devis] [--sans-lighthouse]
// Si WebKit n'est pas installé (npx playwright install webkit), les profils WebKit LE DISENT et
// tournent sur Chromium avec la même fenêtre — moins fidèle, jamais silencieux.

import fs from 'node:fs'
import { chromium, webkit, devices } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { verifierSessionTest, poserCodeTest, claims } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.TEST_BASE || 'https://prestiapp.fr'
const OUT = process.env.CAPTURES || 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/mobile'
fs.mkdirSync(OUT, { recursive: true })
const arg = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null }
const SEUL_PROFIL = arg('profil'), SEULE_PAGE = arg('page'), SANS_LH = process.argv.includes('--sans-lighthouse')

const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const grant = async (email, password) => (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()

/**
 * Contre un serveur LOCAL en http : la CSP de Presti porte `upgrade-insecure-requests`, le navigateur
 * demande donc tous les fichiers en https://localhost — et rien n'y répond : pages sans style ni script,
 * mesures fausses (constaté le 05/09 : 12-13 px partout, tiroir « statique »). On sert ces requêtes
 * depuis le serveur http. En production (https), ce détour n'existe pas.
 */
async function nouveauContexte(b, options) {
  const ctx = await b.newContext(options)
  if (/^http:\/\/localhost/.test(APP)) {
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

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const fin = (code) => { process.exitCode = code; setTimeout(() => {}, 50) }

// ── Le compte connecté : la démo « Atelier du Chêne » (Signature, site + plateforme actifs) ────
const DEMO = { email: 'demo-menuisier@presti-test.invalid', slug: 'atelier-du-chene' }
const PROFILS = [
  { id: 'iphone', nom: 'iPhone 14 · Safari', device: devices['iPhone 14'], moteur: 'webkit' },
  { id: 'pixel', nom: 'Pixel 7 · Chrome', device: devices['Pixel 7'], moteur: 'chromium' },
  { id: 'ipad', nom: 'iPad Mini · Safari', device: devices['iPad Mini'], moteur: 'webkit' },
].filter((p) => !SEUL_PROFIL || p.id === SEUL_PROFIL)

const PUBLIQUES = ['/', '/faq', '/contact', '/login', '/signup', '/reset-password', '/cgu', '/confidentialite', '/mentions-legales', `/p/${DEMO.slug}`, `/site/${DEMO.slug}`, `/site/${DEMO.slug}/infos-legales`]
const CONSOLE = ['/dashboard', '/outils', '/devis', '/devis/[id]', '/factures', '/messages', '/messages/canaux', '/inventaire', '/inventaire/fournisseurs', '/inventaire/recherche', '/parametres', '/plateforme', '/profil', '/abonnement', '/aide']
// Les pages qui portent la barre publique (la landing et ses sœurs) : « Se connecter » doit y être visible.
const AVEC_BARRE_PUBLIQUE = ['/', '/faq', '/contact', '/cgu', '/confidentialite', '/mentions-legales']

/** Les mesures d'une page, faites dans la page elle-même. */
async function mesurer(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0' }
    const decrire = (el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} « ${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)} »`
    const interactifs = [...document.querySelectorAll('a[href], button, input, select, textarea, [role=button], [role=menuitem], [tabindex="0"]')].filter(visible)
    // Exceptions justifiées pour la taille des cibles : liens dans un texte courant (WCAG 2.5.8 les tolère),
    // cases/boutons radio (l'étiquette est la cible), champs de formulaire (la largeur est pleine, seule la hauteur compte).
    const dansTexte = (el) => !!el.closest('p, li, small, td, th, dd, figcaption, .muted, blockquote, label') && (el.tagName === 'A')
    const petites = [], debordantes = [], petitesPolices = []
    for (const el of interactifs) {
      const r = el.getBoundingClientRect()
      const t = el.tagName
      // Entièrement hors écran (tiroir fermé, panneau replié) : ni cible, ni champ à mesurer.
      if (r.right <= 0 || r.bottom <= 0 || r.left >= vw) continue
      // Un tiroir fermé est translaté hors écran à gauche (right ≤ 0) : c'est voulu, pas un débordement.
      // Dans un conteneur qui défile horizontalement (onglets, tableau) : c'est le conteneur qui tient dans
      // l'écran, l'élément peut dépasser — mise en page voulue (v8 A1.5 : « scrollent dans leur conteneur »).
      const dansDefilant = (() => { let a = el.parentElement; while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if ((o === 'auto' || o === 'scroll') && a.getBoundingClientRect().right <= vw + 1) return true; a = a.parentElement } return false })()
      if (!dansDefilant && (r.right > vw + 1 || (r.left < -1 && r.right > 0))) debordantes.push(`${decrire(el)} [${Math.round(r.left)}→${Math.round(r.right)}]`)
      const estChamp = t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA'
      const type = (el.getAttribute('type') || '').toLowerCase()
      if (estChamp && (type === 'checkbox' || type === 'radio')) continue
      // Un lien texte : 44 px de haut (le pouce) et au moins 24 px de large (WCAG 2.5.8) — « FAQ » ou
      // « Accueil » n'ont pas à s'élargir ; un bouton ou une icône : 44 × 44.
      const hauteurOk = r.height >= 43.5, largeurOk = estChamp ? true : (t === 'A' ? r.width >= 24 : r.width >= 43.5)
      if (!(hauteurOk && largeurOk) && !dansTexte(el)) petites.push(`${decrire(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
      if (estChamp && type !== 'checkbox' && type !== 'radio' && type !== 'hidden' && type !== 'range' && type !== 'file') {
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs < 16) petitesPolices.push(`${decrire(el)} ${fs}px`)
      }
    }
    // Un chemin vers /login dans l'en-tête : un lien visible, dans <header>/<nav>, ou un bouton de menu qui l'ouvre.
    const entete = document.querySelector('header, .lp-head, nav')
    const lienLogin = entete ? [...entete.querySelectorAll('a[href="/login"], a[href^="/login"]')].filter(visible) : []
    const boutonMenu = entete ? [...entete.querySelectorAll('button[aria-expanded], button[aria-controls]')].filter(visible) : []
    const boiteLogin = lienLogin[0] ? lienLogin[0].getBoundingClientRect() : null
    return {
      scrollWidth: document.documentElement.scrollWidth, vw, vh,
      petites: petites.slice(0, 8), nPetites: petites.length, debordantes: debordantes.slice(0, 6), nDebordantes: debordantes.length,
      petitesPolices: petitesPolices.slice(0, 6), nPetitesPolices: petitesPolices.length,
      loginVisible: !!boiteLogin, loginBoite: boiteLogin ? `${Math.round(boiteLogin.width)}×${Math.round(boiteLogin.height)}` : '', boutonMenu: boutonMenu.length,
    }
  })
}

async function verifierPage(page, chemin, profil, { publique }) {
  const url = `${APP}${chemin}`
  const r = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null)
  if (!r) { T(`${chemin} [${profil.id}] se charge`, false, 'timeout'); return }
  await page.waitForTimeout(600)
  const m = await mesurer(page)
  const defauts = []
  if (m.scrollWidth > m.vw) defauts.push(`défilement horizontal : ${m.scrollWidth} px pour ${m.vw} px d'écran`)
  if (publique && AVEC_BARRE_PUBLIQUE.includes(chemin)) {
    const menuOk = m.boutonMenu > 0
    if (!m.loginVisible && !menuOk) defauts.push('aucun chemin visible vers /login dans l’en-tête (ni lien, ni bouton de menu)')
    else if (m.loginVisible && !/^\d+×(4[4-9]|[5-9]\d|\d{3})$/.test(m.loginBoite)) defauts.push(`« Se connecter » visible mais < 44 px de haut (${m.loginBoite})`)
  }
  if (m.nPetites) defauts.push(`${m.nPetites} cible(s) < 44 px : ${m.petites.join(' · ')}`)
  if (m.nPetitesPolices) defauts.push(`${m.nPetitesPolices} champ(s) < 16 px : ${m.petitesPolices.join(' · ')}`)
  if (m.nDebordantes) defauts.push(`${m.nDebordantes} élément(s) interactif(s) hors écran : ${m.debordantes.join(' · ')}`)
  // axe-core : critiques et graves seulement (le reste est couvert par a11y-e2e sur bureau).
  try {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const graves = axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    if (graves.length) defauts.push(`axe : ${graves.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`).join(', ')}`)
  } catch (e) { defauts.push(`axe indisponible : ${e.message.split('\n')[0].slice(0, 80)}`) }
  if (defauts.length) await page.screenshot({ path: `${OUT}/${profil.id}${chemin.replace(/[^a-z0-9]+/gi, '_') || '_accueil'}.png`, fullPage: false }).catch(() => {})
  T(`${chemin} [${profil.id}]`, defauts.length === 0, defauts.join('\n     → '))
}

// ── Lighthouse (Chromium seulement, profil mobile par défaut : Moto G Power simulé) ──────────────
async function lighthouseMobile(url, port) {
  const { default: lighthouse } = await import('lighthouse')
  const r = await lighthouse(url, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility'] })
  const c = r.lhr.categories
  return { perf: Math.round((c.performance?.score ?? 0) * 100), a11y: Math.round((c.accessibility?.score ?? 0) * 100), audits: r.lhr.audits }
}

// ── Préparation : le compte démo reçoit un mot de passe pour la session ────────────────────────
const utilisateurs = await (await admin(`users?per_page=200`)).json()
const demoUser = (utilisateurs.users ?? utilisateurs ?? []).find?.((u) => u.email === DEMO.email)
if (!demoUser) { console.log(`⛔ compte démo ${DEMO.email} introuvable — lancer : node scripts/demo-captures.mjs --garder`); fin(2) }
else {
  const mdp = 'mobile-' + Math.random().toString(36).slice(2, 10) + '-Aa1!'
  await admin(`users/${demoUser.id}`, { method: 'PUT', body: JSON.stringify({ password: mdp, email_confirm: true }) })
  await rest(`artisans?id=eq.${demoUser.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ aide_vues: ['visite:console'] }) })
  const session = await grant(DEMO.email, mdp)
  await verifierSessionTest(session.access_token)
  const ref = SB.match(/https:\/\/([^.]+)\./)[1], storeKey = `sb-${ref}-auth-token`
  const devisId = (await (await rest(`devis?select=id&artisan_id=eq.${demoUser.id}&order=created_at.desc&limit=1`)).json())[0]?.id ?? null
  console.log(`Cible : ${APP} · compte démo ${DEMO.slug} · devis ${devisId ? devisId.slice(0, 8) : 'aucun'} · profils : ${PROFILS.map((p) => p.id).join(', ')}`)

  const webkitDispo = await webkit.launch().then((b) => b.close().then(() => true)).catch(() => false)
  if (!webkitDispo) console.log('⚠️  WebKit absent (npx playwright install webkit) : les profils Safari tournent sur Chromium, même fenêtre.')

  try {
    for (const profil of PROFILS) {
      console.log(`\n── ${profil.nom} — ${profil.device.viewport.width}×${profil.device.viewport.height}`)
      const moteur = profil.moteur === 'webkit' && webkitDispo ? webkit : chromium
      const b = await moteur.launch()
      // Non connecté
      // reducedMotion : axe mesure la couleur RÉELLEMENT peinte ; avec les révélations au défilement, il lit un
      // texte encore transparent (contraste 1,04 sur le site) — même choix que a11y-e2e.
      const ctxPublic = await nouveauContexte(b, { ...profil.device, locale: 'fr-FR', reducedMotion: 'reduce' })
      const p1 = await ctxPublic.newPage()
      for (const chemin of PUBLIQUES.filter((c) => !SEULE_PAGE || c === SEULE_PAGE)) await verifierPage(p1, chemin, profil, { publique: true })
      await ctxPublic.close()
      // Connecté : session posée dans le stockage local (le parcours de connexion au doigt est testé à part).
      const ctx = await nouveauContexte(b, { ...profil.device, locale: 'fr-FR', reducedMotion: 'reduce' })
      await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} }, [storeKey, session])
      const p2 = await ctx.newPage()
      for (const chemin of CONSOLE.filter((c) => !SEULE_PAGE || c === SEULE_PAGE)) {
        if (chemin === '/devis/[id]') { if (devisId) await verifierPage(p2, `/devis/${devisId}`, profil, { publique: false }); continue }
        await verifierPage(p2, chemin, profil, { publique: false })
      }
      // Le composeur reste visible quand le clavier prend 320 px (fenêtre visible réduite).
      if (!SEULE_PAGE) {
        for (const [chemin, sel] of [['/messages', '.inbox-compose textarea, textarea'], [`/p/${DEMO.slug}`, 'form textarea, form input[type=text], textarea']]) {
          await p2.goto(`${APP}${chemin}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null)
          // La liste arrive après le montage : `networkidle` ne suffit pas, et sans cette attente
          // l'échec se lit « aucun composeur » alors que la vraie cause est « liste pas encore là ».
          const liste = p2.locator('.inbox-item, .pil-item, [data-conv]')
          await liste.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {})
          const nbItems = await liste.count()
          if (nbItems) await liste.first().click().catch(() => {})
          await p2.waitForTimeout(800)
          const url = p2.url()
          await p2.setViewportSize({ width: profil.device.viewport.width, height: profil.device.viewport.height - 320 })
          await p2.waitForTimeout(400)
          const champ = p2.locator(sel).first()
          const present = await champ.count()
          const boite = present ? await champ.boundingBox() : null
          const vh = profil.device.viewport.height - 320
          // Le message dit laquelle des trois causes s'est produite : redirigé, liste vide, ou fil fermé.
          const cause = !present
            ? (url.includes('/login') ? `redirigé vers ${url} — la session n'a pas tenu`
              : nbItems === 0 ? 'aucune conversation dans la liste : le compte de démo n’a plus de données, ou la liste n’a pas chargé'
              : `${nbItems} conversation(s) listée(s) mais le fil ne s’est pas ouvert au clic`)
            : (boite ? `composeur à y=${Math.round(boite.y)}…${Math.round(boite.y + boite.height)} pour ${vh} px` : 'composeur présent mais sans boîte (caché)')
          T(`${chemin} [${profil.id}] : le composeur reste visible, fenêtre réduite de 320 px`, !!boite && boite.y >= 0 && boite.y + boite.height <= vh + 1, cause)
          await p2.setViewportSize(profil.device.viewport)
        }
      }
      await ctx.close()

      // Connexion au doigt, de bout en bout (profil iPhone) : mot de passe → code par email → console.
      if (profil.id === 'iphone' && !SEULE_PAGE) {
        const ctx3 = await nouveauContexte(b, { ...profil.device, locale: 'fr-FR' })
        const p3 = await ctx3.newPage()
        await p3.goto(`${APP}/login`, { waitUntil: 'networkidle', timeout: 60000 })
        await p3.locator('#email-connexion').tap(); await p3.keyboard.type(DEMO.email)
        await p3.locator('#mdp-connexion').tap(); await p3.keyboard.type(mdp)
        await p3.getByRole('button', { name: /Se connecter/i }).tap()
        const code = await p3.locator('#code-email').waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false)
        T('connexion au doigt : après le mot de passe, l’écran du code apparaît', code)
        if (code) {
          const attrs = await p3.locator('#code-email').evaluate((el) => ({ inputmode: el.getAttribute('inputmode'), autocomplete: el.getAttribute('autocomplete'), fs: parseFloat(getComputedStyle(el).fontSize) }))
          T('le champ du code ouvre le pavé numérique et accepte le pré-remplissage', attrs.inputmode === 'numeric' && attrs.autocomplete === 'one-time-code', JSON.stringify(attrs))
          T('le champ du code fait ≥ 16 px (pas de zoom iOS)', attrs.fs >= 16, `${attrs.fs}px`)
          const c = await poserCodeTest(demoUser.id, '482913')
          await p3.locator('#code-email').tap(); await p3.keyboard.type(c)
          await p3.getByRole('button', { name: /^Valider$/ }).tap()
          const entre = await p3.waitForURL(/\/(outils|dashboard)/, { timeout: 30000 }).then(() => true).catch(() => false)
          T('le bon code ouvre la console sur mobile', entre, p3.url())
          if (entre) {
            const hamb = p3.locator('.psh-hamb')
            T('la console mobile a un bouton de menu visible et ≥ 44 px', await hamb.isVisible() && ((await hamb.boundingBox())?.height ?? 0) >= 43.5, JSON.stringify(await hamb.boundingBox()))
            await hamb.tap().catch(() => {})
            await p3.waitForTimeout(300)
            const lienDevis = p3.locator('.psh-side a[href="/devis"]')
            T('le tiroir s’ouvre et ses liens sont atteignables', await lienDevis.isVisible())
            await lienDevis.tap().catch(() => {})
            await p3.waitForURL(/\/devis/, { timeout: 20000 }).catch(() => {})
            await p3.waitForTimeout(400)
            T('après navigation, le tiroir s’est refermé', !(await p3.locator('.psh-app.open').count()))
          }
        }
        await ctx3.close()
      }

      // Tâches longues au défilement (Chromium, CPU ralenti ×4) : landing et site Signature.
      if (profil.moteur === 'chromium' && !SEULE_PAGE) {
        for (const chemin of ['/', `/site/${DEMO.slug}`]) {
          const ctx4 = await nouveauContexte(b, { ...profil.device, locale: 'fr-FR', reducedMotion: 'reduce' })
          const p4 = await ctx4.newPage()
          const cdp = await ctx4.newCDPSession(p4)
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
          await p4.goto(`${APP}${chemin}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null)
          await p4.evaluate(() => { window.__longues = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: false }) })
          for (let i = 0; i < 12; i++) { await p4.mouse.wheel(0, 500); await p4.waitForTimeout(160) }
          await p4.waitForTimeout(600)
          const longues = await p4.evaluate(() => window.__longues || [])
          T(`${chemin} [${profil.id}, CPU ×4] : 0 tâche longue > 50 ms au défilement`, longues.length === 0, longues.length ? `${longues.length} tâche(s) : ${longues.slice(0, 8).join(', ')} ms` : '')
          await ctx4.close()
        }
      }
      await b.close()
    }

    // ── Lighthouse mobile (Chromium avec port de débogage : la session du compte démo est partagée) ─
    if (!SANS_LH && !SEULE_PAGE) {
      console.log('\n── Lighthouse mobile (perf ≥ 90 · accessibilité = 100)')
      const port = 9333
      const b = await chromium.launch({ args: [`--remote-debugging-port=${port}`] })
      const ctx = await b.newContext({ ...devices['Pixel 7'], locale: 'fr-FR' })
      await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('presti.aide_vues', JSON.stringify(['visite:console'])) } catch {} }, [storeKey, session])
      const p = await ctx.newPage()
      await p.goto(`${APP}/dashboard`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null)
      // Une seule passe ne suffit pas a juger une performance, et ce n'est pas un aveu : c'est la
      // recommandation de Google pour Lighthouse en local. Mesure du 08/09, TROIS passes de suite sur
      // le MEME code deploye : 72, 73, puis 95 -- le Total Blocking Time allait de 960 ms a 60 ms selon
      // ce que la machine faisait par ailleurs. Un seuil juge sur un tirage pareil ne mesure pas le
      // site, il mesure l'humeur du portable, et un rouge qui vient du bruit finit par etre ignore.
      //
      // On ne relache donc pas le seuil : on relance. Premiere passe verte, on s'arrete la (le cas
      // courant, et la suite reste rapide). Premiere passe rouge, deux passes de plus, et c'est la
      // MEDIANE qui tranche -- la valeur du milieu, insensible a une passe aberrante dans un sens
      // comme dans l'autre. Le detail des trois est imprime : une vraie regression les fait toutes
      // baisser ensemble, du bruit non, et la difference se lit a l'oeil.
      const median = (t) => [...t].sort((x, y) => x - y)[Math.floor(t.length / 2)]
      for (const chemin of ['/', '/login', '/dashboard', `/p/${DEMO.slug}`]) {
        try {
          let r = await lighthouseMobile(`${APP}${chemin}`, port)
          const perfs = [r.perf], a11ys = [r.a11y]
          if (r.perf < 90) {
            for (let i = 0; i < 2; i++) {
              const bis = await lighthouseMobile(`${APP}${chemin}`, port)
              perfs.push(bis.perf); a11ys.push(bis.a11y)
              if (bis.perf > r.perf) r = bis // on garde les audits de la meilleure passe pour le detail
            }
            console.log(`     i  ${chemin} : trois passes ${perfs.join(', ')} -> mediane ${median(perfs)}`)
          }
          const perf = median(perfs), a11y = median(a11ys)
          const pires = Object.values(r.audits).filter((a) => a.score !== null && a.score < 0.5 && a.details?.type !== 'debugdata').slice(0, 4).map((a) => a.id)
          T(`Lighthouse ${chemin} : perf ${perf} >= 90 · a11y ${a11y} = 100`, perf >= 90 && a11y === 100, pires.length ? `audits faibles : ${pires.join(', ')}` : '')
        } catch (e) { T(`Lighthouse ${chemin}`, false, e.message.split('\n')[0].slice(0, 120)) }
      }
      await b.close()
    }
  } catch (e) {
    ko++; console.log('  ❌ exception :', e?.stack?.split('\n').slice(0, 3).join(' | ') || e)
  } finally {
    console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués · captures des écarts : ${OUT}`)
    fin(ko === 0 ? 0 : 1)
  }
}
