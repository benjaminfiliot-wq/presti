#!/usr/bin/env node
// scripts/crm-poids-pages.mjs — ce que le navigateur télécharge VRAIMENT en JavaScript sur les pages qui ne sont pas le CRM.
//
// Sert à prouver que la scène 3D (three, @react-three/fiber, @react-three/drei) n'alourdit aucune autre page : on mesure
// avant et après l'ajout, contre `next start` (build de production), et on compare. Les octets comptés sont ceux du
// corps décompressé de chaque réponse de type script, page chargée jusqu'au calme réseau.
//
// Usage :
//   TEST_BASE=http://localhost:3158 node scripts/crm-poids-pages.mjs --sortie=<fichier.json>
//   node scripts/crm-poids-pages.mjs --comparer=<avant.json>,<apres.json>     (rouge si une page grossit de plus de 1 %)
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const PAGES = ['/', '/tarifs', '/login', '/dashboard', '/chiffres', '/inventaire', '/devis', '/factures', '/messages']
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)

const comparer = arg('comparer')
if (comparer) {
  const [a, b] = comparer.split(',').map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))
  let rouge = 0
  for (const p of Object.keys(a.pages)) {
    const av = a.pages[p].octets, ap = b.pages[p]?.octets
    const ecart = ap === undefined ? NaN : ((ap - av) / av) * 100
    const ok = Number.isFinite(ecart) && ecart <= 1
    if (!ok) rouge++
    console.log(`${ok ? 'PASS' : 'FAIL'} ${p.padEnd(12)} avant ${(av / 1024).toFixed(1)} Ko · après ${ap === undefined ? '—' : (ap / 1024).toFixed(1) + ' Ko'} · écart ${Number.isFinite(ecart) ? ecart.toFixed(2) + ' %' : '—'}`)
  }
  const fuite = Object.values(b.pages).filter((x) => x.three).length
  console.log(`${fuite ? 'FAIL' : 'PASS'} aucune page hors CRM ne télécharge three / @react-three (${fuite} page(s) fautive(s))`)
  process.exitCode = rouge || fuite ? 1 : 0
} else {
  const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
  if (!BASE) { console.error('TEST_BASE manquant'); process.exit(2) }
  const { chromium } = require('playwright')
  const nav = await chromium.launch()
  const res = { base: BASE, le: new Date().toISOString(), pages: {} }
  for (const p of PAGES) {
    const ctx = await nav.newContext()
    const page = await ctx.newPage()
    let octets = 0, fichiers = 0, three = false
    page.on('response', async (r) => {
      if (r.request().resourceType() !== 'script') return
      // Octets du corps décompressé (comparables d'une mesure à l'autre) ; et la signature de three dans le CONTENU.
      const corps = await r.body().catch(() => Buffer.alloc(0))
      octets += corps.length; fichiers++
      if (/WebGLRenderer|__THREE__|react-three/.test(corps.toString('latin1'))) three = true
    })
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 120_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    res.pages[p] = { octets, fichiers, three }
    console.log(`${p.padEnd(12)} ${(octets / 1024).toFixed(1)} Ko en ${fichiers} script(s)${three ? ' · contient three !' : ''}`)
    await ctx.close()
  }
  await nav.close()
  const sortie = arg('sortie')
  if (sortie) fs.writeFileSync(sortie, JSON.stringify(res, null, 2))
}
