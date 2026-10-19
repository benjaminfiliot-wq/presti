#!/usr/bin/env node
// scripts/refonte-avant-landing.mjs — chantier « Refonte 18/10 », étape 1 (audit) : l'état « AVANT » du site public, mesuré sur la
// PRODUCTION (c'est l'état réel), sans compte, sans écriture, sans appel IA.
//
// Pour chaque page publique et chaque largeur (1440 et 390 px) :
//   - une capture pleine page + une capture du premier écran ;
//   - les mesures : sections, hauteur de défilement (en écrans), boutons d'appel (« Essayer… », liens /signup), liens d'ancre ;
//   - le relevé du contenu de chaque section (titres, paragraphes, listes, liens) pour l'inventaire de contenu (étape 2) ;
//   - les contrastes WCAG calculés sur chaque élément porteur de texte (couleur du texte contre le fond effectif, alpha composé ;
//     un texte posé sur une image ou un dégradé est compté à part, « non calculable », jamais deviné) ;
//   - une capture de chaque section (pour les planches de défauts).
// Mouvement réduit émulé : le filet `.reveal-armed` laisse alors tout visible, la capture montre tout le contenu.
//
// Usage : node scripts/refonte-avant-landing.mjs [dossier]   (défaut : ../presti-ops/refonte-1018/avant)
// Sortie : <dossier>/landing/*.png et <dossier>/landing-mesures.json
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const DOSSIER = path.resolve(process.argv[2] || path.join(process.cwd(), '..', 'presti-ops', 'refonte-1018', 'avant'))
const SORTIE = path.join(DOSSIER, 'landing')
fs.mkdirSync(SORTIE, { recursive: true })
const PAGES = (process.env.PAGES || '/,/faq,/tarifs,/comparatif,/contact,/confidentialite,/mentions-legales,/cgu,/signup,/login').split(',')
const VUES = [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]

// Évalué dans la page : mesures + contenu + contrastes.
function mesurer() {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity !== 0 }
  const txt = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim()
  const H = document.documentElement.scrollHeight
  const vh = window.innerHeight
  const racine = document.querySelector('main') || document.body
  // Sections : les <section> qui ne sont pas imbriquées dans une autre section, plus le pied de page.
  const sections = [...racine.querySelectorAll('section')].filter((s) => !s.parentElement.closest('section') && vis(s)).map((s, i) => {
    const r = s.getBoundingClientRect()
    const titre = s.querySelector('h1,h2')
    const kick = s.querySelector('.lp-kick')
    const blocs = [...s.querySelectorAll('h1,h2,h3,h4,p,li,summary,dt,dd,th,td,figcaption,small,blockquote,label,a.lp-btn,button')]
      .filter((e) => vis(e) && txt(e) && !e.closest('li')?.isSameNode?.(null)).map((e) => ({ tag: e.tagName.toLowerCase(), cls: (e.className && typeof e.className === 'string') ? e.className.split(' ').slice(0, 2).join(' ') : '', texte: txt(e).slice(0, 400) }))
    // Dédoublonne les textes identiques consécutifs (un <li> qui contient un <p>).
    const vus = new Set(); const blocsUniques = blocs.filter((b) => { const k = b.tag + '|' + b.texte; if (vus.has(k)) return false; vus.add(k); return true })
    return { rang: i + 1, id: s.id || null, classe: s.className || null, kicker: kick ? txt(kick) : null, titre: titre ? txt(titre) : null, haut: Math.round(r.top + scrollY), hauteur: Math.round(r.height), ecrans: +(r.height / vh).toFixed(2), blocs: blocsUniques }
  })
  const pied = document.querySelector('footer')
  const piedBlocs = pied ? [...pied.querySelectorAll('a,p,small,h3,h4,li')].filter((e) => vis(e) && txt(e)).map((e) => ({ tag: e.tagName.toLowerCase(), texte: txt(e).slice(0, 300), href: e.getAttribute('href') })) : []
  const entete = document.querySelector('header, .lp-head, nav')
  const enteteLiens = entete ? [...entete.querySelectorAll('a,button')].filter(vis).map((e) => ({ texte: txt(e), href: e.getAttribute('href') })) : []
  const liens = [...document.querySelectorAll('a,button')].filter(vis)
  const appels = liens.filter((e) => /essayer/i.test(txt(e)) || /\/signup/.test(e.getAttribute('href') || '')).map((e) => ({ texte: txt(e), href: e.getAttribute('href'), y: Math.round(e.getBoundingClientRect().top + scrollY), dans: e.closest('section')?.id || e.closest('header,footer,nav')?.tagName.toLowerCase() || null }))
  const boutonsLp = [...document.querySelectorAll('.lp-btn')].filter(vis).length

  // ── Contrastes ─────────────────────────────────────────────────────────────────────────────────────────────
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 } }
  const comp = (h, b) => ({ r: h.r * h.a + b.r * (1 - h.a), g: h.g * h.a + b.g * (1 - h.a), b: h.b * h.a + b.b * (1 - h.a), a: 1 })
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const fond = (e) => {
    const pile = []
    for (let n = e; n; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.backgroundImage && s.backgroundImage !== 'none' && !/^url\(.*\.svg/.test(s.backgroundImage)) return { image: true, sel: n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : '') }
      const c = parse(s.backgroundColor); if (c && c.a > 0) { pile.push(c); if (c.a >= 1) break }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 }
    for (let i = pile.length - 1; i >= 0; i--) base = comp(pile[i], base)
    return { c: base }
  }
  const echecs = []; let mesures = 0; let nonCalc = 0
  const porteurs = [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && vis(e))
  for (const e of porteurs) {
    const s = getComputedStyle(e)
    const t = parse(s.color); if (!t) continue
    const f = fond(e)
    if (f.image) { nonCalc++; continue }
    const op = (() => { let o = 1; for (let n = e; n; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o })()
    const tc = comp({ ...t, a: t.a * op }, f.c)
    const r = ratio(tc, f.c)
    const px = parseFloat(s.fontSize); const gras = +s.fontWeight >= 700
    const grand = px >= 24 || (gras && px >= 18.66)
    const seuil = grand ? 3 : 4.5
    mesures++
    if (r < seuil) echecs.push({ texte: [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 80), sel: e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ').join('.') : ''), ratio: +r.toFixed(2), seuil, px, couleur: s.color, fond: `rgb(${Math.round(f.c.r)},${Math.round(f.c.g)},${Math.round(f.c.b)})`, section: e.closest('section')?.id || e.closest('section')?.className?.split(' ')[1] || null })
  }
  // Débordement horizontal (téléphone).
  const deborde = document.documentElement.scrollWidth - window.innerWidth
  return { titre: document.title, hauteurPx: H, vh, ecrans: +(H / vh).toFixed(1), nbSections: sections.length, sections, appels, nbAppels: appels.length, boutonsLp, enteteLiens, piedBlocs, contrastes: { mesures, nonCalculables: nonCalc, echecs }, deborde }
}

const nav = await chromium.launch()
const resultat = { base: BASE, date: new Date().toISOString(), pages: {} }
try {
  for (const [nomVue, vue] of VUES) {
    const ctx = await nav.newContext({ viewport: vue, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'fr-FR' })
    const page = await ctx.newPage()
    // Prévisualisation Vercel protégée : le lien de partage (propre au déploiement) pose le cookie d'accès.
    if (process.env.VERCEL_SHARE) await page.goto(`${BASE}/?_vercel_share=${encodeURIComponent(process.env.VERCEL_SHARE)}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    for (const chemin of PAGES) {
      const nom = chemin === '/' ? 'accueil' : chemin.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-')
      const rep = await page.goto(`${BASE}${chemin}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch((e) => ({ status: () => 'ERR ' + e.message.slice(0, 80) }))
      const statut = rep?.status?.() ?? null
      const urlFinale = page.url()
      // Défilement complet (chargements paresseux, déclencheurs), puis retour en haut.
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } scrollTo(0, 0) })
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(SORTIE, `${nom}-${nomVue}-ecran1.png`) })
      await page.screenshot({ path: path.join(SORTIE, `${nom}-${nomVue}-plein.png`), fullPage: true })
      const m = await page.evaluate(mesurer)
      if (chemin === '/') {
        // Une capture par section (planches de défauts).
        const secs = page.locator('main section:not(section section)')
        const n = await secs.count()
        for (let i = 0; i < n; i++) {
          const s = secs.nth(i)
          if (!(await s.isVisible().catch(() => false))) continue
          await s.screenshot({ path: path.join(SORTIE, `accueil-${nomVue}-section-${String(i + 1).padStart(2, '0')}.png`) }).catch(() => {})
        }
      }
      resultat.pages[`${chemin}@${nomVue}`] = { statut, urlFinale, ...m }
      console.log(`${chemin} @${nomVue} : ${statut} → ${urlFinale} · ${m.nbSections} sections · ${m.ecrans} écrans · ${m.nbAppels} appels « Essayer » · contrastes ${m.contrastes.echecs.length} échec(s)/${m.contrastes.mesures} · débord ${m.deborde}px`)
    }
    await ctx.close()
  }
} finally { await nav.close() }
fs.writeFileSync(path.join(DOSSIER, 'landing-mesures.json'), JSON.stringify(resultat, null, 1))
console.log(`\nMesures → ${path.join(DOSSIER, 'landing-mesures.json')}`)
