#!/usr/bin/env node
// scripts/crm-atelier-qa.mjs — juge NAVIGATEUR de l'atelier 3D (jalons J3-J5), sur la page de démonstration interne
// /atelier-demo (données fictives injectées côté client, aucune base, aucun compte).
//
// Prérequis : un serveur de l'application lancé avec PRESTI_DEMO_ATELIER=1 (sans cette variable, la page répond 404).
// Pour des mesures qui valent quelque chose : le build de production (`next build --webpack` puis `next start`).
//   TEST_BASE=http://localhost:3158 node scripts/crm-atelier-qa.mjs [--captures=<dossier>]
//
//  P. PERFORMANCE (plan 3.2) : processeur graphique réel (ANGLE / Direct3D, jamais le rendu logiciel sans le dire) ;
//     première image ≤ 2,5 s (à froid et cache chaud), ≥ 55 images/s de moyenne PENDANT des rotations de caméra,
//     ≤ 150 appels de dessin. Chiffres imprimés tels quels.
//  L. CHARGEMENT À LA DEMANDE : en plan 2D, aucun octet de three n'est téléchargé ; en 3D, si.
//  R. REPLI 2D AUTOMATIQUE : téléphone, « réduire les animations », WebGL coupé — le plan 2D s'affiche et dit pourquoi.
//  I. INTERACTIONS : filtres (allument / estompent), clic sur un objet → panneau, Échap ferme, clavier seul (Tab, Entrée)
//     ouvre un panneau et y met le focus ; « Préparer la commande » propose les bonnes quantités.
//  C. CONTRASTES (WCAG AA, texte ≥ 4,5:1) des textes de l'atelier dans les deux modes.
//  E. ZÉRO erreur de console pendant tout le parcours.
//  K. CAPTURES : trois métiers × trois angles, plus le plan 2D et le téléphone (--captures).
// Codes : 0 vert · 1 rouge · 2 page de démonstration absente (serveur lancé sans PRESTI_DEMO_ATELIER=1).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const BASE = (process.env.TEST_BASE || '').replace(/\/$/, '')
if (!BASE) { console.error('TEST_BASE manquant'); process.exit(2) }
const CAPTURES = process.argv.find((a) => a.startsWith('--captures='))?.slice(11)
if (CAPTURES) fs.mkdirSync(CAPTURES, { recursive: true })
const DEMO = `${BASE}/atelier-demo`
const ARGS_GPU = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']

let verts = 0
const rouges = []
const T = (n, c, d = '') => { if (c) { verts++; console.log(`PASS ${n}`) } else { rouges.push(n); console.log(`FAIL ${n}${d ? ' — ' + String(d).slice(0, 400) : ''}`) } }
const erreurs = []
const surveiller = (page, nom) => {
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', (e) => erreurs.push(`${nom}: ${e}`))
}

const statut = await fetch(DEMO).then((r) => r.status).catch(() => 0)
if (statut !== 200) { console.error(`⏸  ${DEMO} répond ${statut} : lancez le serveur avec PRESTI_DEMO_ATELIER=1.`); process.exit(2) }

// Le Chromium « headless shell » plafonne une toile WebGL VIDE à ≈ 49 i/s (mesuré le 12/10) : il fausserait la mesure.
// Le nouveau mode sans fenêtre (channel « chromium ») compose comme un vrai navigateur ; on le prend, et on imprime le
// témoin (une toile vide) pour que le chiffre de l'atelier se lise à côté de ce que la machine sait faire.
const temoinFps = (page) => page.evaluate(() => new Promise((ok) => { document.body.innerHTML = ''; const c = document.createElement('canvas'); c.width = 1408; c.height = 645; document.body.append(c); const gl = c.getContext('webgl2', { antialias: true }); let n = 0; const t0 = performance.now(); const f = () => { gl.clearColor(Math.random(), 0.5, 0.5, 1); gl.clear(gl.COLOR_BUFFER_BIT); n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else ok(Math.round(n / 4)) }; requestAnimationFrame(f) }))
let attentes = 0
const nav = await chromium.launch({ args: ARGS_GPU, channel: 'chromium' }).catch(() => chromium.launch({ args: ARGS_GPU }))
// La page s'hydrate puis choisit son mode : on attend ce choix avant toute lecture.
const choisi = (page) => page.waitForSelector('[data-atelier-mode="2d"], [data-atelier-mode="3d"]', { timeout: 120_000 })
const pret3D = (page) => page.waitForFunction(() => window.__atelier && window.__atelier.fps > 0, null, { timeout: 120_000 })

// ═══════════════════════ P. Performance ═══════════════════════
// Trois mesures de chaque, jugées sur la MÉDIANE et toutes imprimées : sur une machine chargée par d'autres programmes, une
// mesure isolée dit surtout ce que faisait la machine à cet instant (juge-relais, 12/10).
const mediane = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
{
  // « À froid » = un navigateur déjà ouvert (comme celui de l'artisan), cache VIDE (contexte neuf) : on chauffe d'abord le
  // navigateur sur une autre page. Le tout premier onglet d'un navigateur qui démarre paie en plus son propre lancement
  // (≈ +1 s ici, mesuré le 12/10) : ce n'est pas le chargement de la scène.
  { const c = await nav.newContext(); const p = await c.newPage(); await p.goto(`${BASE}/login`, { waitUntil: 'load' }).catch(() => {}); await c.close() }
  const froid = [], chaud = [], moyennes = [], appelsMax = [], temoins = []
  let gpu = 'inconnu', triangles = 0
  for (let essai = 0; essai < 3; essai++) {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    surveiller(page, 'perf')
    for (const passage of ['froid', 'chaud']) {
      await page.goto('about:blank')
      await page.goto(`${DEMO}?mode=3d&mesure=1&metier=plombier`, { waitUntil: 'load' })
      await pret3D(page)
      const m = await page.evaluate(() => window.__atelier)
      ;(passage === 'froid' ? froid : chaud).push(Math.round(m.premiereImageMs))
    }
    if (essai === 0) {
      gpu = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const d = c?.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'inconnu' })
      // Les boutons de la caméra, enchaînés (quarts de tour, zooms) : ils doivent répondre sans erreur.
      for (const b of ['Tourner à droite', 'Zoom avant', 'Tourner à gauche', 'Zoom arrière', 'Recentrer']) { await page.getByRole('button', { name: b }).click(); await page.waitForTimeout(650) }
    }
    // Images/s PENDANT un glisser continu de la souris (OrbitControls : la caméra tourne sans arrêt).
    await page.waitForTimeout(1000)
    const toile = await page.locator('.atl-toile canvas').boundingBox()
    const cx = toile.x + toile.width / 2, cy = toile.y + toile.height / 2
    await page.mouse.move(cx, cy); await page.mouse.down()
    let tourne = true
    const glisser = (async () => { let i = 0; while (tourne) { i++; await page.mouse.move(cx + 220 * Math.sin(i / 25), cy + 60 * Math.cos(i / 40)); await page.waitForTimeout(15) } })()
    await page.waitForTimeout(1200)
    const ech = []
    for (let i = 0; i < 4; i++) { await page.waitForTimeout(1000); ech.push(await page.evaluate(() => ({ ...window.__atelier }))) }
    tourne = false; await glisser; await page.mouse.up()
    moyennes.push(Math.round(ech.reduce((s, e) => s + e.fps, 0) / ech.length))
    appelsMax.push(Math.max(...ech.map((e) => e.appels)))
    triangles = ech.at(-1).triangles
    temoins.push(await temoinFps(page))
    await ctx.close()
  }
  console.log(`   GPU : ${gpu}`)
  console.log(`   première image à froid (cache vide) : ${froid.join(' / ')} ms · cache chaud : ${chaud.join(' / ')} ms`)
  console.log(`   images/s en tournant la caméra (moyenne de 4 s, par essai) : ${moyennes.join(' / ')} · témoin toile vide juste après : ${temoins.join(' / ')}`)
  console.log(`   appels de dessin : ${appelsMax.join(' / ')} · triangles : ${triangles}`)
  T('P1 rendu par le processeur graphique (pas le rendu logiciel SwiftShader)', !/swiftshader|llvmpipe|software/i.test(gpu), gpu)
  T(`P2 première image ≤ 2,5 s (médianes : à froid ${mediane(froid)} ms, cache chaud ${mediane(chaud)} ms)`, mediane(froid) <= 2500 && mediane(chaud) <= 2500, `${froid} / ${chaud}`)
  const fps = mediane(moyennes), temoin = mediane(temoins)
  if (fps >= 55) T(`P3 ≥ 55 images/s en manipulant (médiane ${fps})`, true)
  else if (temoin < 58) { attentes++; console.log(`WAIT P3 ≥ 55 images/s NON PROUVÉ ICI : l'atelier tourne à ${fps} i/s, et cette machine ne tient que ${temoin} i/s sur une toile vide au même moment — à remesurer sur une machine libre`) }
  else T(`P3 ≥ 55 images/s en manipulant (médiane ${fps}, témoin ${temoin})`, false, moyennes.join(','))
  T(`P4 ≤ 150 appels de dessin (${Math.max(...appelsMax)})`, Math.max(...appelsMax) <= 150)
}

// ═══════════════════════ L. Chargement à la demande ═══════════════════════
async function octetsThree(url, options = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, ...options })
  const page = await ctx.newPage()
  surveiller(page, `charge ${url}`)
  let three = false
  page.on('response', async (r) => { if (r.request().resourceType() === 'script') { const b = await r.body().catch(() => Buffer.alloc(0)); if (/WebGLRenderer/.test(b.toString('latin1'))) three = true } })
  await page.goto(url, { waitUntil: 'networkidle', timeout: 300_000 }); await choisi(page)
  await page.waitForTimeout(2000)
  const mode = await page.locator('[data-atelier-mode]').getAttribute('data-atelier-mode')
  await ctx.close()
  return { three, mode }
}
{
  const plan = await octetsThree(`${DEMO}?mode=2d`)
  const maquette = await octetsThree(`${DEMO}?mode=3d`)
  T('L1 plan 2D : three n’est jamais téléchargé', plan.mode === '2d' && !plan.three, JSON.stringify(plan))
  T('L2 maquette 3D : le morceau three arrive à la demande', maquette.mode === '3d' && maquette.three, JSON.stringify(maquette))
}

// ═══════════════════════ R. Repli 2D automatique ═══════════════════════
{
  const tel = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const p1 = await tel.newPage(); surveiller(p1, 'téléphone')
  await p1.goto(DEMO, { waitUntil: 'networkidle', timeout: 300_000 }); await choisi(p1)
  T('R1 téléphone → plan 2D, et il dit pourquoi', (await p1.locator('[data-atelier-mode]').getAttribute('data-atelier-mode')) === '2d' && /téléphone/.test(await p1.locator('.atl-plan').innerText()))
  const largeurPage = await p1.evaluate(() => document.documentElement.scrollWidth)
  T('R2 téléphone : pas de défilement horizontal de la page', largeurPage <= 390, String(largeurPage))
  if (CAPTURES) await p1.screenshot({ path: path.join(CAPTURES, 'atelier-telephone-plan2d.png'), fullPage: false })
  await tel.close()
  const calme = await nav.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const p2 = await calme.newPage(); surveiller(p2, 'reduced-motion')
  await p2.goto(DEMO, { waitUntil: 'networkidle', timeout: 300_000 }); await choisi(p2)
  T('R3 « réduire les animations » → plan 2D, et il dit pourquoi', (await p2.locator('[data-atelier-mode]').getAttribute('data-atelier-mode')) === '2d' && /moins d’animations/.test(await p2.locator('.atl-plan').innerText()))
  await calme.close()
  const sansGl = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] })
  const p3 = await (await sansGl.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await p3.goto(DEMO, { waitUntil: 'networkidle', timeout: 300_000 }); await choisi(p3)
  const texte = await p3.locator('.atl-plan').innerText().catch(() => '')
  T('R4 WebGL coupé → plan 2D, il dit pourquoi, et la bascule 3D est désactivée', (await p3.locator('[data-atelier-mode]').getAttribute('data-atelier-mode')) === '2d' && /WebGL indisponible/.test(texte) && await p3.getByRole('button', { name: 'Maquette 3D' }).isDisabled())
  await sansGl.close()
}

// ═══════════════════════ I. Interactions (repli 2D : mêmes objets, mêmes panneaux) ═══════════════════════
{
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage(); surveiller(page, 'interactions')
  await page.goto(`${DEMO}?mode=2d`, { waitUntil: 'networkidle', timeout: 300_000 }); await choisi(page)
  const objets = page.locator('[data-atelier-objet]')
  const total = await objets.count()
  await page.locator('[data-atelier-filtre="retard"]').click()
  const allumes = await page.locator('[data-atelier-objet]:not(.estompe)').evaluateAll((els) => els.map((e) => e.getAttribute('data-atelier-objet')))
  T('I1 filtre « En retard » : pressé, il n’allume que les 2 chantiers en retard, les autres s’estompent', (await page.locator('[data-atelier-filtre="retard"]').getAttribute('aria-pressed')) === 'true' && allumes.length === 2 && allumes.every((c) => c.startsWith('chantier:')) && total > 10, JSON.stringify(allumes))
  await page.locator('[data-atelier-filtre="retard"]').click()
  T('I2 recliquer le filtre le retire (tout s’allume)', (await page.locator('[data-atelier-objet].estompe').count()) === 0)
  await page.locator('[data-atelier-objet="categorie:Raccords"]').click()
  T('I3 clic sur un rayonnage → panneau Inventaire, titre focalisé', (await page.locator('[data-atelier-panneau="categorie"] h2').innerText()) === 'Raccords' && await page.evaluate(() => document.activeElement?.id === 'atl-panneau-titre'))
  await page.getByRole('button', { name: 'Préparer la commande' }).click()
  const qLaiton = await page.getByLabel('Quantité de Raccord laiton 20/27').inputValue()
  const qManchon = await page.getByLabel('Quantité de Manchon 32').inputValue()
  T('I4 « Préparer la commande » : 16 raccords laiton (4 en stock, seuil 10), 6 manchons (2, seuil 4), rien d’envoyé', qLaiton === '16' && qManchon === '6' && /rien n’est envoyé d’ici/.test(await page.locator('.atl-commande').innerText()), `${qLaiton} ${qManchon}`)
  await page.keyboard.press('Escape')
  T('I5 Échap ferme le panneau', (await page.locator('.atl-panneau').count()) === 0)
  // Clavier seul : Tab jusqu'au premier objet du plan, Entrée.
  await page.locator('[data-atelier-filtre="aujourdhui"]').focus()
  let atteint = false
  for (let i = 0; i < 40 && !atteint; i++) { await page.keyboard.press('Tab'); atteint = await page.evaluate(() => !!document.activeElement?.getAttribute('data-atelier-objet')) }
  await page.keyboard.press('Enter')
  T('I6 au clavier seul, un objet du plan ouvre son panneau et le focus y va', atteint && (await page.locator('.atl-panneau').count()) === 1 && await page.evaluate(() => document.activeElement?.id === 'atl-panneau-titre'))
  await page.keyboard.press('Escape')
  await page.locator('[data-atelier-objet="bureau"]').click()
  T('I7 le bureau propose les vues 2D du CRM', (await page.locator('[data-atelier-panneau="bureau"] .atl-panneau-corps button').allInnerTexts()).join('|') === 'Tableau de bord|Pipeline|Chantiers|Clients')
  await page.keyboard.press('Escape')
  await page.locator('[data-atelier-objet^="chantier:"]').first().click()
  T('I8 panneau chantier : client, statut, dates, camionnette, équipe ; en démonstration, les actions le disent', /Client/.test(await page.locator('.atl-panneau').innerText()) && /Démonstration/.test(await page.locator('.atl-panneau').innerText()))
  if (CAPTURES) await page.screenshot({ path: path.join(CAPTURES, 'atelier-plan2d-panneau-chantier.png') })
  await page.keyboard.press('Escape')
  // 3D : la pastille d'un chantier ouvre le même panneau.
  await page.goto(`${DEMO}?mode=3d&mesure=1`, { waitUntil: 'load' })
  await pret3D(page)
  await page.locator('.atl-pastille').first().click()
  T('I9 en 3D, cliquer l’épingle d’un chantier ouvre le même panneau', (await page.locator('[data-atelier-panneau="chantier"]').count()) === 1)
  if (CAPTURES) { await page.waitForTimeout(900); await page.screenshot({ path: path.join(CAPTURES, 'atelier-3d-panneau-chantier.png') }) }
  await page.keyboard.press('Escape')
  await page.locator('[data-atelier-filtre="stock_bas"]').click()
  await page.waitForTimeout(600)
  if (CAPTURES) await page.screenshot({ path: path.join(CAPTURES, 'atelier-3d-filtre-stock-bas.png') })
  T('I10 en 3D, le filtre « Stock bas » se presse et compte 5 rayonnages', (await page.locator('[data-atelier-filtre="stock_bas"]').innerText()).trim().endsWith('5'))

  // ═══════════════════════ C. Contrastes ═══════════════════════
  const contrastes = async () => page.evaluate(() => {
    const rgb = (s) => (s.match(/[\d.]+/g) ?? []).map(Number)
    const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const fond = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.9)) return c } return [10, 12, 17] }
    const mauvais = []
    let n = 0
    for (const el of document.querySelectorAll('.atl *')) {
      if (![...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) continue
      const st = getComputedStyle(el)
      if (st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) < 0.9 || el.closest('.estompe, [disabled], .crm-sr, details:not([open]) > :not(summary)')) continue
      const c = rgb(st.color), b = fond(el)
      const L1 = lum(c), L2 = lum(b)
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      n++
      if (ratio < 4.5) mauvais.push(`${el.className || el.tagName} « ${el.textContent.trim().slice(0, 30)} » ${ratio.toFixed(2)}`)
    }
    return { n, mauvais: [...new Set(mauvais)] }
  })
  const c3d = await contrastes()
  await page.goto(`${DEMO}?mode=2d`, { waitUntil: 'networkidle', timeout: 300_000 }); await choisi(page)
  await page.locator('[data-atelier-objet="categorie:Raccords"]').click()
  const c2d = await contrastes()
  T(`C1 contrastes ≥ 4,5:1 (${c3d.n} textes en 3D, ${c2d.n} en 2D avec panneau)`, c3d.mauvais.length === 0 && c2d.mauvais.length === 0, [...c3d.mauvais, ...c2d.mauvais].slice(0, 8).join(' | '))
  await ctx.close()
}

// ═══════════════════════ K. Captures : 3 métiers × 3 angles ═══════════════════════
if (CAPTURES) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage(); surveiller(page, 'captures')
  const faites = []
  for (const metier of ['plombier', 'electricien', 'macon']) {
    for (const vue of ['ensemble', 'atelier', 'dessus']) {
      await page.goto(`${DEMO}?mode=3d&mesure=1&metier=${metier}&vue=${vue}`, { waitUntil: 'load' })
      await pret3D(page)
      await page.waitForTimeout(1800)
      const f = path.join(CAPTURES, `atelier-${metier}-${vue}.png`)
      await page.screenshot({ path: f })
      faites.push(f)
    }
  }
  T(`K1 ${faites.length} captures (3 métiers × 3 angles), aucune vide`, faites.length === 9 && faites.every((f) => fs.statSync(f).size > 50_000), faites.map((f) => `${path.basename(f)} ${fs.statSync(f).size}`).join(' '))
  await ctx.close()
}

await nav.close()
T(`E1 aucune erreur de console sur tout le parcours (${erreurs.length})`, erreurs.length === 0, erreurs.slice(0, 5).join(' | '))
console.log(`\n${verts} vert(s), ${rouges.length} rouge(s), ${attentes} en attente${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : attentes ? 2 : 0
