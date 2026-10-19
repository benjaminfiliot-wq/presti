#!/usr/bin/env node
// scripts/refonte-apres-pages.mjs — captures des pages publiques de la refonte (/offres, /comparatif, /outils/ui) sur une
// prévisualisation Vercel, en 1440 et 390 px, avec contrôles : réponse 200 sur le bon hôte (pas la page de connexion de
// Vercel), 0 violation de contraste axe-core, 0 px de défilement de côté, aucune erreur JavaScript.
// Usage : TEST_BASE=https://<déploiement>.vercel.app VERCEL_SHARE=<jeton> node scripts/refonte-apres-pages.mjs [dossier]
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(BASE)) { console.error('TEST_BASE : un déploiement *.vercel.app'); process.exit(2) }
const SORTIE = path.resolve(process.argv[2] || path.join(process.cwd(), '..', 'presti-ops', 'refonte-1018', 'apres', 'public'))
fs.mkdirSync(SORTIE, { recursive: true })
const AXE = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js')
const PAGES = ['/offres', '/comparatif', '/outils/ui']
let ko = 0
const T = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${!c && d ? ' — ' + String(d).slice(0, 300) : ''}`); if (!c) ko++ }
const nav = await chromium.launch()
try {
  for (const [lv, vue] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
    const ctx = await nav.newContext({ viewport: vue, locale: 'fr-FR', reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    const err = []; page.on('pageerror', (e) => err.push(String(e).slice(0, 200)))
    if (process.env.VERCEL_SHARE) await page.goto(`${BASE}/?_vercel_share=${encodeURIComponent(process.env.VERCEL_SHARE)}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    for (const ch of PAGES) {
      err.length = 0
      const r = await page.goto(`${BASE}${ch}`, { waitUntil: 'networkidle', timeout: 90_000 })
      await page.waitForTimeout(800)
      const nom = `${ch.replace(/^\//, '').replace(/\//g, '-')}-${lv}`
      const H = await page.evaluate(() => document.documentElement.scrollHeight)
      await page.setViewportSize({ width: vue.width, height: Math.min(Math.max(vue.height, H), 9000) })
      await page.screenshot({ path: path.join(SORTIE, `${nom}.png`), timeout: 120_000 })
      await page.setViewportSize(vue)
      T(`${nom} : 200 sur ${new URL(BASE).host}`, r?.status() === 200 && new URL(page.url()).host === new URL(BASE).host, `${r?.status()} ${page.url()}`)
      await page.addScriptTag({ path: AXE })
      const ax = await page.evaluate(async () => { const x = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } }); return (x.violations[0]?.nodes ?? []).map((n) => `${n.target.join(' ')} — ${(n.any[0]?.message || '').slice(0, 140)}`) })
      T(`${nom} : 0 violation de contraste (axe)`, ax.length === 0, ax.slice(0, 4).join(' | '))
      const deb = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      T(`${nom} : aucun défilement de côté`, deb <= 1, `${deb}px`)
      T(`${nom} : aucune erreur JavaScript`, err.length === 0, err.join(' | '))
    }
    await ctx.close()
  }
} finally { await nav.close() }
console.log(ko ? `\n${ko} rouge(s)` : '\ntout vert')
process.exitCode = ko ? 1 : 0
