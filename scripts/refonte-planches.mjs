#!/usr/bin/env node
// scripts/refonte-planches.mjs — planches AVANT | APRÈS de la refonte 18/10 (mêmes comptes d'exemple, mêmes données).
// Lit presti-ops/refonte-1018/avant/console/*.png (production du 18/10) et apres/console/*.png (prévisualisation de la branche),
// compose une image côte à côte par paire, dans presti-ops/refonte-1018/apres/planche-*.png. Aucune donnée réelle.
// Usage : node scripts/refonte-planches.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const OPS = path.resolve(process.cwd(), '..', 'presti-ops', 'refonte-1018')
const PAIRES = [
  ['accueil-1440', 'Accueil de la console · 1440 px', 'avant/console/rempli-dashboard-1440.png', 'apres/console/rempli-dashboard-1440.png', 1440],
  ['accueil-390', 'Accueil de la console · 390 px', 'avant/console/rempli-dashboard-390.png', 'apres/console/rempli-dashboard-390.png', 390],
  ['menu-telephone-390', 'Menu sur téléphone · 390 px', 'avant/console/rempli-menu-ouvert-390.png', 'apres/console/rempli-tiroir-plus-390.png', 390],
  ['coque-devis-1440', 'Coque autour de la liste Devis · 1440 px', 'avant/console/rempli-devis-1440.png', 'apres/console/rempli-devis-1440.png', 1440],
  ['coque-devis-390', 'Coque autour de la liste Devis · 390 px', 'avant/console/rempli-devis-390.png', 'apres/console/rempli-devis-390.png', 390],
  ['accueil-vide-1440', 'Accueil, compte sans données · 1440 px', 'avant/console/vide-dashboard-1440.png', 'apres/console/vide-dashboard-1440.png', 1440],
]
const nav = await chromium.launch()
try {
  const page = await (await nav.newContext({ viewport: { width: 1600, height: 900 } })).newPage()
  for (const [id, titre, avant, apres, w] of PAIRES) {
    const a = path.join(OPS, avant), b = path.join(OPS, apres)
    if (!fs.existsSync(a) || !fs.existsSync(b)) { console.log(`— ${id} : image absente (${!fs.existsSync(a) ? avant : apres})`); continue }
    const largeur = w === 390 ? 390 : 1100
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#1d1d22;font-family:system-ui;color:#eee">
      <div style="padding:18px 24px;font-size:22px;font-weight:600">${titre} <span style="font-size:13px;color:#aaa;font-weight:400">— mêmes données d'exemple ; avant : production du 18/10 · après : prévisualisation refonte-1018 (consoleV2)</span></div>
      <div style="display:flex;gap:24px;padding:0 24px 24px;align-items:flex-start">
        <figure style="margin:0"><figcaption style="margin-bottom:8px;color:#bbb">AVANT</figcaption><img src="${pathToFileURL(a).href}" style="width:${largeur}px;display:block;border:1px solid #333"></figure>
        <figure style="margin:0"><figcaption style="margin-bottom:8px;color:#E8946F">APRÈS</figcaption><img src="${pathToFileURL(b).href}" style="width:${largeur}px;display:block;border:1px solid #333"></figure>
      </div></body>`
    const tmp = path.join(OPS, 'apres', '_planche.html')
    fs.writeFileSync(tmp, html)
    await page.setViewportSize({ width: largeur * 2 + 72, height: 900 })
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' })
    await page.screenshot({ path: path.join(OPS, 'apres', `planche-${id}.png`), fullPage: true })
    fs.rmSync(tmp)
    console.log(`✓ planche-${id}.png`)
  }
} finally { await nav.close() }
