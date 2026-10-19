#!/usr/bin/env node
// scripts/refonte-pistes-captures.mjs — chantier « Refonte 18/10 », étape 3 : photographie les maquettes HTML statiques des deux pistes
// (presti-ops/refonte-1018/pistes/*.html, ?p=a|b) en 1440 et 390 px, vérifie leurs contrastes avec axe-core (WCAG AA) et le
// défilement de côté, puis compose une PLANCHE côte à côte A | B par écran et par largeur.
// Lecture seule sur le dépôt ; rien ne touche la production. Usage : node scripts/refonte-pistes-captures.mjs [dossier-pistes]
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const DOSSIER = path.resolve(process.argv[2] || path.join(process.cwd(), '..', 'presti-ops', 'refonte-1018', 'pistes'))
const SORTIE = path.join(DOSSIER, 'captures')
fs.mkdirSync(SORTIE, { recursive: true })
const AXE = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js')
const ECRANS = (process.env.ECRANS || 'accueil,devis,fiche,landing').split(',')
const LARGEURS = [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]
const NOMS = { accueil: 'Accueil de la console', devis: 'Liste Devis', fiche: 'Fiche devis', landing: 'Haut de la landing' }
const rapport = {}
const nav = await chromium.launch()
try {
  for (const [lv, vue] of LARGEURS) {
    const ctx = await nav.newContext({ viewport: vue, deviceScaleFactor: lv === '390' ? 2 : 1, locale: 'fr-FR', reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    for (const e of ECRANS) for (const p of ['a', 'b']) {
      const url = pathToFileURL(path.join(DOSSIER, `${e}.html`)).href + `?p=${p}`
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(300)
      const f = path.join(SORTIE, `${e}-${p}-${lv}.png`)
      // Viewport à la hauteur du contenu : la barre du bas (fixe) et le menu (100vh) tombent à leur vraie place sur l'image.
      const H = await page.evaluate(() => document.documentElement.scrollHeight)
      await page.setViewportSize({ width: vue.width, height: Math.max(vue.height, H) })
      await page.waitForTimeout(150)
      await page.screenshot({ path: f, timeout: 120_000 })
      await page.setViewportSize(vue)
      await page.addScriptTag({ path: AXE })
      const axe = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } }); return (r.violations[0]?.nodes ?? []).map((n) => `${n.target.join(' ')} — ${(n.any[0]?.message || '').slice(0, 120)}`) })
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      rapport[`${e}-${p}-${lv}`] = { contrasteAxe: axe.length, exemples: axe.slice(0, 5), deborde }
      console.log(`${e} ${p.toUpperCase()} ${lv} : axe contraste ${axe.length} · débord ${deborde}px`)
    }
    await ctx.close()
  }
  // Planches A | B
  const ctx = await nav.newContext({ viewport: { width: 1600, height: 900 } })
  const page = await ctx.newPage()
  for (const e of ECRANS) for (const [lv] of LARGEURS) {
    const img = (p) => pathToFileURL(path.join(SORTIE, `${e}-${p}-${lv}.png`)).href
    const w = lv === '390' ? 390 : 1440
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#1d1d22;font-family:system-ui;color:#eee">
      <div style="padding:18px 24px;font-size:22px;font-weight:600">${NOMS[e]} · ${lv} px · <span style="color:#E8946F">A « Instrument »</span> | <span style="color:#E8946F">B « Cinéma »</span> <span style="font-size:13px;color:#aaa;font-weight:400">— maquettes, données d'exemple</span></div>
      <div style="display:flex;gap:24px;padding:0 24px 24px;align-items:flex-start">
        <figure style="margin:0"><figcaption style="margin-bottom:8px">A · Instrument</figcaption><img src="${img('a')}" style="width:${w}px;display:block;border:1px solid #333"></figure>
        <figure style="margin:0"><figcaption style="margin-bottom:8px">B · Cinéma</figcaption><img src="${img('b')}" style="width:${w}px;display:block;border:1px solid #333"></figure>
      </div></body>`
    const tmp = path.join(SORTIE, `_planche.html`)
    fs.writeFileSync(tmp, html)
    await page.setViewportSize({ width: w * 2 + 72, height: 900 })
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' })
    await page.screenshot({ path: path.join(DOSSIER, `planche-${e}-${lv}.png`), fullPage: true, timeout: 120_000 })
    fs.rmSync(tmp)
  }
  await ctx.close()
} finally { await nav.close() }
fs.writeFileSync(path.join(SORTIE, 'rapport.json'), JSON.stringify(rapport, null, 1))
console.log('planches →', DOSSIER)
