// TEMPORAIRE — audit qualité (auditeur C). Lecture seule, GET publics, aucun formulaire soumis.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, devices } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'

const BASE = 'https://prestiapp.fr'
const OUT = process.argv[2] || 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad/qualite'
fs.mkdirSync(OUT, { recursive: true })
const PAGES = ['/', '/faq', '/contact', '/cgu', '/confidentialite', '/mentions-legales', '/abonnement',
  '/site/atelier-du-chene', '/site/atelier-du-chene/infos-legales', '/p/atelier-du-chene',
  '/inexistant', '/site/inexistant', '/p/inexistant']
const VIEWPORTS = [
  { nom: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
  { nom: 'iphone13', opts: { ...devices['iPhone 13'] } },
]

const nav = await chromium.launch()
const resultats = []
for (const vp of VIEWPORTS) {
  const ctx = await nav.newContext({ ...vp.opts, reducedMotion: 'reduce', locale: 'fr-FR', userAgent: (vp.opts.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36') + ' presti-verif' })
  await ctx.addInitScript(() => {
    window.__lcp = 0
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
  })
  for (const p of PAGES) {
    const page = await ctx.newPage()
    const console_ = []; const echecs = []; const requetes = []
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console_.push(`${m.type()}: ${m.text().slice(0, 200)}`) })
    page.on('requestfailed', (r) => echecs.push(`${r.url().slice(0, 120)} — ${r.failure()?.errorText}`))
    page.on('requestfinished', async (r) => { try { const s = await r.sizes(); const resp = await r.response(); requetes.push({ url: r.url(), type: r.resourceType(), corps: s.responseBodySize, entetes: s.responseHeadersSize, statut: resp?.status() }) } catch {} })
    const t0 = Date.now()
    let statut = null
    try {
      const resp = await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 60000 })
      statut = resp?.status()
    } catch (e) { console_.push('goto: ' + e.message.slice(0, 100)) }
    await page.waitForTimeout(1200)
    const charge = Date.now() - t0
    const info = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)
      const attr = (s, a) => q(s)?.getAttribute(a) ?? null
      const imgs = [...document.querySelectorAll('img')]
      const sansAlt = imgs.filter((i) => !i.hasAttribute('alt')).map((i) => (i.getAttribute('src') || '').slice(0, 80))
      const altVide = imgs.filter((i) => i.hasAttribute('alt') && i.getAttribute('alt') === '').length
      const liens = [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href))]
      const champs = [...document.querySelectorAll('input:not([type=hidden]), textarea, select')].map((el) => {
        const id = el.id
        const label = (id && document.querySelector(`label[for="${id}"]`)) || el.closest('label')
        const ok = !!(label || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'))
        return { tag: el.tagName, type: el.type, ok, nom: el.name || el.placeholder || el.getAttribute('aria-label') || '' }
      })
      const cibles = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), textarea, select, [role=button]')].map((el) => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
        const visible = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && el.getAttribute('aria-hidden') !== 'true'
        return { visible, w: Math.round(r.width), h: Math.round(r.height), txt: (el.innerText || el.getAttribute('aria-label') || el.value || el.tagName).trim().slice(0, 40) }
      }).filter((c) => c.visible && (c.w < 24 || c.h < 24))
      const navE = performance.getEntriesByType('navigation')[0]
      const ldjson = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent)['@type'] } catch { return 'INVALIDE' } })
      const scripts = [...document.scripts].map((s) => s.src).filter(Boolean)
      const texte = document.body?.innerText || ''
      return {
        url: location.href, titre: document.title, lang: document.documentElement.lang,
        description: attr('meta[name="description"]', 'content'), canonical: attr('link[rel="canonical"]', 'href'),
        robots: attr('meta[name="robots"]', 'content'), viewportMeta: attr('meta[name="viewport"]', 'content'),
        ogTitle: attr('meta[property="og:title"]', 'content'), ogImage: attr('meta[property="og:image"]', 'content'), ogDesc: attr('meta[property="og:description"]', 'content'),
        twitterCard: attr('meta[name="twitter:card"]', 'content'), twitterImage: attr('meta[name="twitter:image"]', 'content'),
        icones: [...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => l.getAttribute('href')),
        h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim().slice(0, 80)),
        imgs: imgs.length, sansAlt, altVide, liens, champs, cibles, ldjson, scripts,
        gtag: scripts.some((s) => /googletagmanager|google-analytics/.test(s)) || !!document.querySelector('script#ga-init'),
        externes: scripts.filter((s) => !s.startsWith(location.origin)),
        debordement: document.documentElement.scrollWidth > window.innerWidth + 1, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
        noeuds: document.getElementsByTagName('*').length, texteChars: texte.length,
        presti: (texte.match(/presti/gi) || []).length,
        lcp: Math.round(window.__lcp || 0), ttfb: navE ? Math.round(navE.responseStart) : null, dcl: navE ? Math.round(navE.domContentLoadedEventEnd) : null, load: navE ? Math.round(navE.loadEventEnd) : null,
        localStorage: (() => { try { return Object.keys(localStorage) } catch { return [] } })(),
        sessionStorage: (() => { try { return Object.keys(sessionStorage) } catch { return [] } })(),
      }
    })
    const cookies = (await ctx.cookies()).map((c) => ({ nom: c.name, domaine: c.domain, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite }))
    let axe = null
    try {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
      axe = r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, cibles: v.nodes.slice(0, 3).map((n) => n.target.join(' ').slice(0, 90)), aide: v.help }))
    } catch (e) { axe = [{ id: 'axe-erreur', impact: '?', aide: e.message.slice(0, 120) }] }
    const poids = {}
    for (const r of requetes) { poids[r.type] = (poids[r.type] || 0) + (r.corps || 0) + (r.entetes || 0) }
    const total = Object.values(poids).reduce((a, b) => a + b, 0)
    const nomFichier = (vp.nom + p.replace(/\//g, '_') || '_racine') + '.png'
    try { await page.screenshot({ path: path.join(OUT, nomFichier), fullPage: true }) } catch {}
    resultats.push({ vp: vp.nom, page: p, statut, chargeMs: charge, ...info, cookies, axe, poids, totalKo: Math.round(total / 1024), nbReq: requetes.length, console: console_.slice(0, 15), echecs: echecs.slice(0, 15), capture: nomFichier })
    console.log(`${vp.nom} ${p} → ${statut} ${info.url} · ${Math.round(total / 1024)} Ko / ${requetes.length} req · LCP ${info.lcp} ms · débord ${info.debordement} · axe ${axe?.length ?? '?'} · cookies ${cookies.length} · gtag ${info.gtag}`)
    await page.close()
  }
  await ctx.close()
}
await nav.close()

// Liens morts : GET sur chaque lien unique des 3 surfaces (HEAD puis GET).
const liens = new Set()
for (const r of resultats) for (const l of r.liens || []) if (/^https?:/.test(l)) liens.add(l.split('#')[0])
const verif = []
for (const l of [...liens].sort()) {
  try {
    const resp = await fetch(l, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 presti-verif' } })
    verif.push({ url: l, statut: resp.status, final: resp.url !== l ? resp.url : undefined })
  } catch (e) { verif.push({ url: l, statut: 'ERREUR', erreur: e.message.slice(0, 80) }) }
}
// Actifs de partage / favicon
const actifs = []
for (const r of resultats.filter((x) => x.vp === 'desktop')) {
  for (const u of [r.ogImage, ...(r.icones || [])]) {
    if (!u) continue
    const abs = new URL(u, BASE).href
    if (actifs.some((a) => a.url === abs)) continue
    try { const resp = await fetch(abs, { headers: { 'User-Agent': 'presti-verif' } }); const buf = await resp.arrayBuffer(); actifs.push({ page: r.page, url: abs, statut: resp.status, type: resp.headers.get('content-type'), ko: Math.round(buf.byteLength / 1024) }) } catch (e) { actifs.push({ page: r.page, url: abs, statut: 'ERREUR' }) }
  }
}
fs.writeFileSync(path.join(OUT, 'resultats.json'), JSON.stringify({ resultats, liens: verif, actifs }, null, 2))
console.log('\n── Liens (' + verif.length + ')'); for (const v of verif) if (v.statut !== 200) console.log('  ', v.statut, v.url, v.final || '', v.erreur || '')
console.log('\n── Actifs'); for (const a of actifs) console.log('  ', a.statut, a.type, a.ko + ' Ko', a.url)
console.log('\nOK →', OUT)
