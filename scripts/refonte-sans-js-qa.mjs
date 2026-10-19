#!/usr/bin/env node
// scripts/refonte-sans-js-qa.mjs — PROMPT-BENJ §6 : « Sans JavaScript, la landing reste lisible » et « prefers-reduced-motion :
// tout reste visible et utilisable ». Sur une prévisualisation de la landing v2 :
//   1. JavaScript COUPÉ : les 10 sections sont là, aucun texte n'est caché par une animation d'apparition (opacité 0), les
//      panneaux d'onglets, les quatre étapes de « Comment ça marche » et les quatre métiers sont tous visibles ;
//   2. mouvement réduit : la section « Comment ça marche » n'est pas épinglée et rien ne reste à opacité 0 après chargement.
// Exclus du contrôle, avec leur raison : .ca-note (note du tableur masquée par la landing actuelle elle aussi, globals.css
// .lp-compta-corps .ca-note), .ui-slides-etape p et .ui-slides-texte-m (même texte, montré à un seul des deux endroits selon la
// largeur : contrôlé à part).
// Usage : TEST_BASE=https://<déploiement>.vercel.app VERCEL_SHARE=<jeton> node scripts/refonte-sans-js-qa.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(BASE)) { console.error('TEST_BASE : un déploiement *.vercel.app'); process.exit(2) }
let ko = 0
const T = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}${!c && d ? ' — ' + String(d).slice(0, 300) : ''}`); if (!c) ko++ }

async function cookie(nav) {
  // Le lien de partage pose le cookie dans un contexte AVEC JavaScript ; on le recopie ensuite.
  const ctx = await nav.newContext()
  const p = await ctx.newPage()
  await p.goto(`${BASE}/?_vercel_share=${encodeURIComponent(process.env.VERCEL_SHARE || '')}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  const c = await ctx.cookies()
  await ctx.close()
  return c
}
const mesure = () => {
  const vis = (e) => { const r = e.getBoundingClientRect(); let o = 1; for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') return false; o *= +s.opacity } return r.width > 0 && r.height > 0 && o > 0.05 }
  const sections = [...document.querySelectorAll('main > section')]
  const caches = [...document.querySelectorAll('main h1, main h2, main h3, main p, main li')].filter((e) => (e.textContent || '').trim().length > 2 && !e.closest('.sr-only,.ui-sr,[aria-hidden="true"],details:not([open]),[hidden],.ui-slides-etape p,.ui-slides-texte-m,.ca-note') && !vis(e)).map((e) => (e.textContent || '').trim().slice(0, 60))
  return {
    sections: sections.length,
    caches,
    panneaux: [...document.querySelectorAll('#fonctionnalites [role="tabpanel"]')].filter(vis).length,
    etapes: [...document.querySelectorAll('#comment .ui-slides-etape')].filter(vis).length,
    metiers: [...document.querySelectorAll('#pour-qui [role="tabpanel"]')].filter(vis).length,
    epingle: !!document.querySelector('#comment .ui-epingle'),
    // Le texte de l'étape active est montré soit dans la liste (ordinateur), soit sous les pastilles (téléphone) : l'un des deux.
    texteEtape: [...document.querySelectorAll('#comment .ui-slides-etape p, #comment .ui-slides-texte-m')].some(vis),
  }
}

const nav = await chromium.launch()
try {
  const c = await cookie(nav)
  for (const [nom, opts] of [['sans JavaScript', { javaScriptEnabled: false }], ['mouvement réduit', { reducedMotion: 'reduce' }]]) {
    for (const [lv, vue] of [['1440', { width: 1440, height: 900 }], ['390', { width: 390, height: 844 }]]) {
      const ctx = await nav.newContext({ viewport: vue, ...opts })
      await ctx.addCookies(c)
      const p = await ctx.newPage()
      await p.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90_000 })
      // Défilement à la molette (marche aussi sans JavaScript dans la page) : les sections en content-visibility se dessinent et
      // leurs courtes animations d'entrée (CSS) se jouent ; un texte encore à opacité 0 après ça est réellement caché.
      const H = await p.evaluate(() => document.documentElement.scrollHeight)
      for (let y = 0; y < H; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(60) }
      await p.waitForTimeout(1500)
      const m = await p.evaluate(mesure)
      T(`${nom} ${lv} : 10 sections`, m.sections === 10, m.sections)
      T(`${nom} ${lv} : aucun texte caché`, m.caches.length === 0, m.caches.slice(0, 6).join(' | '))
      T(`${nom} ${lv} : le texte de l'étape de Comment ça marche est lisible`, m.texteEtape)
      if (opts.javaScriptEnabled === false) {
        T(`${nom} ${lv} : tous les panneaux de Fonctionnalités visibles`, m.panneaux >= 3, m.panneaux)
        T(`${nom} ${lv} : les 4 étapes de Comment ça marche visibles`, m.etapes === 4, m.etapes)
        T(`${nom} ${lv} : les 4 métiers visibles`, m.metiers === 4, m.metiers)
      } else T(`${nom} ${lv} : Comment ça marche n'est pas épinglée`, !m.epingle)
      await ctx.close()
    }
  }
} finally { await nav.close() }
console.log(ko ? `\n${ko} rouge(s)` : '\ntout vert')
process.exitCode = ko ? 1 : 0
