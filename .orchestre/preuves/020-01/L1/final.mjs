// final.mjs <variante> [etapes] — L1 retenue : bloc.css, vérification image positionnée / capture en temps réel, mesures
// sans carte graphique (1088×800, 1280×800, 1440×900), R-4 (cas 1, 2, 4) et bord du calque, films de 10 s, instants, planche.
// Étapes : bloc,verif,mesures,barres,films,instants,planche (toutes par défaut). Écrit seulement dans films/L1/.
import fs from 'node:fs'
import { spawn, execFileSync } from 'node:child_process'
import { chromium, sharp, DOSSIER, bloc, ouvrir, etatPage, poser, c2a, releve, contrasteCycle, ppcm, gris, ecart, MAGENTA, deuxImages, SANS_TEXTE, contraste } from './commun.mjs'
import { VARIANTES } from './variantes-def.mjs'

const nom = process.argv[2]; const p = VARIANTES[nom]; if (!p) throw new Error('variante inconnue ' + nom)
const etapes = new Set((process.argv[3] || 'bloc,verif,mesures,barres,films,instants,planche').split(','))
const css = bloc(p)
const FICHIER = DOSSIER + 'mesures.json'
const res = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, 'utf8')) : {}
const sauver = () => fs.writeFileSync(FICHIER, JSON.stringify(res, null, 1))
Object.assign(res, { variante: nom, params: p, bloc: 'bloc.css', url: 'https://prestiapp.fr/sites-demo/lestraque/index.html (en ligne, bloc injecté dans le navigateur de test)', navigateur: 'chromium.launch() sans drapeau de carte graphique (cahier §8.0)', methodeTemps: 'animations de document.timeline en pause, currentTime = t ms (t compté depuis le chargement) ; animations liées au défilement laissées à y = 0' })
const VARS_FICHIER = DOSSIER + 'variantes.json'
if (fs.existsSync(VARS_FICHIER)) {
  const VARS = JSON.parse(fs.readFileSync(VARS_FICHIER, 'utf8')).variantes?.[nom]
  if (VARS?.formats) {
    for (const [cle, data] of Object.entries(VARS.formats)) {
      if (!res[cle]) {
        res[cle] = {
          C2a: [data.C2a.paire_2500_5000.part8, data.C2a.paire_5000_8000.part8],
          C2bPlageFigee: data.C2bc.plusLongFige_s,
          C2bEcartMoyen: data.C2bc.ecartMoyenParImage,
          C2cClignote: data.C2bc.pairesAuDessus0085 > 0,
          R12Min: data.R12.p90min
        }
      }
    }
  }
}
sauver()
if (etapes.has('bloc')) fs.writeFileSync(DOSSIER + 'bloc.css', css)
const SANS_CALQUE = 'html.js.da--signature .ouverture>.hero--plein .hero__media::before{display:none!important}'

async function compteMagenta(page) {
  const buf = await page.screenshot({ type: 'png' })
  const { data } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let n = 0; for (let i = 0; i < data.length; i += 3) if (Math.abs(data[i] - 255) < 40 && data[i + 1] < 60 && Math.abs(data[i + 2] - 255) < 40) n++
  return { n, buf }
}
async function r4(page, cle, avecCas2 = true) {
  const tag = await page.addStyleTag({ content: MAGENTA })
  const tem = await page.addStyleTag({ content: '.hero--plein .hero__media img{visibility:hidden!important}' })
  await poser(page, 8000); const temoin = (await compteMagenta(page)).n
  await tem.evaluate((e) => e.remove())
  const cas1 = []
  for (let t = 0; t < 40000; t += 500) { await poser(page, t); const m = await compteMagenta(page); cas1.push(m.n); if (m.n) await sharp(m.buf).jpeg({ quality: 80 }).toFile(DOSSIER + `coins-${cle}-t${t}.jpg`) }
  const cas2 = []
  if (avecCas2) for (const tp of [0, 20000]) for (const q of [0, 0.25, 0.5, 0.75]) {
    const tc = q * p.P * 1000
    await page.evaluate(({ tp, tc }) => { for (const a of document.getAnimations()) { if (a.timeline !== document.timeline) continue; a.pause(); a.currentTime = a.animationName === 'pousse' ? tp : String(a.animationName).startsWith('signature-projecteur') ? tc : 8000 } }, { tp, tc })
    await deuxImages(page); cas2.push({ pousse_ms: tp, calque_ms: tc, pixels: (await compteMagenta(page)).n })
  }
  await tag.evaluate((e) => e.remove())
  return { feuille: MAGENTA, temoinPhotoCachee_pixels: temoin, cas1: { instants: cas1.length, pas_ms: 500, pixelsMax: Math.max(...cas1), instantsAvecPixels: cas1.filter((x) => x > 0).length }, cas2: avecCas2 ? { note: 'pousse à 0 (échelle 1) et à 20 s (1,06) ; calque posé à 0, 1/4, 1/2, 3/4 de tour (masqué par la feuille de test, sans effet sur la photo)', mesures: cas2, pixelsMax: Math.max(...cas2.map((x) => x.pixels)) } : null }
}
// R-12 quand P ne divise pas 40 s (le cycle commun dépasserait 120 s) : grille de tout l'espace d'états, poussée × angle des faisceaux.
// Poussée de 0 à 39 s au pas de 1 s (40 valeurs) ; calque de 0 à 170° au pas de 10° (18 valeurs ; le motif deuxLobes se répète tous les 180°).
async function contrasteGrille(page) {
  const tag = await page.addStyleTag({ content: SANS_TEXTE })
  const v = []
  for (let tp = 0; tp < 40000; tp += 1000) for (let k = 0; k < 18; k++) {
    const tc = k * p.P * 1000 / 36
    await page.evaluate(({ tp, tc }) => { for (const a of document.getAnimations()) { if (a.timeline !== document.timeline) continue; a.pause(); a.currentTime = a.animationName === 'pousse' ? tp : String(a.animationName).startsWith('signature-projecteur') ? tc : 8000 } }, { tp, tc })
    await deuxImages(page)
    v.push([tp, k * 10, await contraste(page, await page.screenshot({ type: 'png' }))])
  }
  await tag.evaluate((e) => e.remove())
  const min = v.reduce((m, x) => (x[2] < m[2] ? x : m), v[0])
  return { methode: 'grille poussée (0-39 s, pas 1 s) × rotation du calque (0-170°, pas 10°), autres animations à 8 s', combinaisons: v.length, p90min: min[2], p90minA_pousse_ms: min[0], p90minA_angle_deg: min[1], p90max: Math.max(...v.map((x) => x[2])), sous3: v.filter((x) => x[2] < 3).length, valeurs_pousse_angle_p90: v }
}
// complément propre à L1 : le calque tourne ; son bord carré ne doit jamais se voir. Écart calque présent / calque masqué, au-delà du disque du masque.
async function bordCalque(page, vp) {
  const W = vp.width, H = vp.height, R = p.taille / 2 * W / 100, ex = 0.404 * W, ey = 0.42 * H - 0.0255 * W
  const out = []
  for (let q = 0; q < 8; q++) {
    const t = 8000 + q * p.P * 1000 / 8
    await poser(page, t); const on = await page.screenshot({ type: 'png' })
    const tag = await page.addStyleTag({ content: SANS_CALQUE }); await poser(page, t); const off = await page.screenshot({ type: 'png' }); await tag.evaluate((e) => e.remove())
    const A = (await sharp(on).removeAlpha().raw().toBuffer()), B = (await sharp(off).removeAlpha().raw().toBuffer())
    let hors = 0, touches = 0, dmaxHors = 0; const coins = [[0, 0], [W - 32, 0], [0, H - 32], [W - 32, H - 32]].map(() => 0)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3, d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]))
      if (d > 2) touches++
      if (Math.hypot(x - ex, y - ey) > R + 2) { dmaxHors = Math.max(dmaxHors, d); if (d > 2) hors++ }
      const c = (x < 32 ? 0 : x >= W - 32 ? 1 : -1), r = (y < 32 ? 0 : y >= H - 32 ? 1 : -1)
      if (c >= 0 && r >= 0) coins[r * 2 + c] += d
    }
    out.push({ t_ms: t, pixelsTouches: touches, partTouchee: +(touches / (W * H)).toFixed(3), pixelsHorsDisque_d_sup_2: hors, ecartMaxHorsDisque: dmaxHors, ecartMoyenCoins_HG_HD_BG_BD: coins.map((s) => +(s / (32 * 32)).toFixed(2)) })
  }
  return { rayonDisque_px: +R.toFixed(1), oeil_px: [+ex.toFixed(1), +ey.toFixed(1)], instants: out }
}

const nav = await chromium.launch()
res.versionChromium = nav.version()
try {
  // ── vérification : une image positionnée ressemble-t-elle à une capture en temps réel au même instant ? ──
  if (etapes.has('verif')) {
    const vp = { width: 1088, height: 800 }
    const { ctx, page } = await ouvrir(nav, vp, css)
    await page.waitForTimeout(3000)
    const lire = () => page.evaluate(() => document.getAnimations().filter((a) => a.timeline === document.timeline).map((a) => [a.animationName, a.currentTime]))
    const avant = await lire(); const reel = await page.screenshot({ type: 'png' }); const apres = await lire()
    if (avant.length !== apres.length) throw new Error('liste d’animations changée pendant la capture')
    const poserChacune = async (dt) => { await page.evaluate(({ avant, apres, dt }) => { const L = document.getAnimations().filter((a) => a.timeline === document.timeline); L.forEach((a, i) => { a.pause(); a.currentTime = (avant[i][1] + apres[i][1]) / 2 + dt }) }, { avant, apres, dt }); await deuxImages(page); return page.screenshot({ type: 'png' }) }
    const gr = await gris(reel)
    const proj = avant.findIndex((x) => String(x[0]).startsWith('signature-projecteur'))
    const demi = (apres[proj][1] - avant[proj][1]) / 2
    // balayage de toute la fourchette au pas de 25 ms : l'instant réel de la capture est celui où l'écart est minimal
    const balayage = []; let meilleur = null
    for (let dt = -Math.ceil(demi / 25) * 25; dt <= demi; dt += 25) {
      const b = await poserChacune(dt); const e = ecart(gr, await gris(b)); balayage.push([dt, e.moyen, e.part8])
      if (!meilleur || e.moyen < meilleur.e.moyen) meilleur = { dt, e, b }
    }
    const loin = balayage.reduce((m, x) => (Math.abs(x[0] - meilleur.dt) === 125 ? x : m), null)
    res.verification = {
      format: '1088x800', note: 'capture Playwright en temps réel ; currentTime de chaque animation lu juste avant et juste après ; puis chaque animation remise en pause au milieu de cette fourchette + dt, dt balayé au pas de 25 ms',
      fourchette_ms: { projecteur: [avant[proj][1], apres[proj][1]].map((x) => +x.toFixed(1)), largeur: +(2 * demi).toFixed(1) },
      meilleurDecalage_ms: meilleur.dt, projecteurAuMeilleur_ms: +((avant[proj][1] + apres[proj][1]) / 2 + meilleur.dt).toFixed(1), reel_vs_pose_meilleur: meilleur.e,
      pourEchelle_unPasDeReleve_125ms: loin ? { dt: loin[0], moyen: loin[1], part8: loin[2] } : null,
      balayage_dt_moyen_part8: balayage,
    }
    await sharp(reel).jpeg({ quality: 88 }).toFile(DOSSIER + 'verif-temps-reel.jpg'); await sharp(meilleur.b).jpeg({ quality: 88 }).toFile(DOSSIER + 'verif-positionnee.jpg')
    console.log('verif', JSON.stringify(res.verification)); sauver()
    await ctx.close()
  }
  // ── mesures, trois formats ──
  if (etapes.has('mesures')) {
    res.formats = res.formats || {}
    for (const vp of [{ width: 1088, height: 800 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) {
      const cle = `${vp.width}x${vp.height}`, d0 = Date.now()
      const { ctx, page } = await ouvrir(nav, vp, css)
      const etat = await etatPage(page)
      const a = await c2a(page, vp)
      const b = await releve(page)
      const cyc = ppcm(40000, p.P * 1000)
      let c
      if (cyc <= 120000) { const instants = []; for (let t = 2000; t < 2000 + cyc; t += 500) instants.push(t); c = await contrasteCycle(page, instants) }
      else c = await contrasteGrille(page)
      const coins = await r4(page, cle)
      const bord = await bordCalque(page, vp)
      const etatFin = await etatPage(page)
      res.formats[cle] = { etat, reliefEtatFin: etatFin.reliefEtat, C2a: a.C2a, C6a: a.C6a, C2bc: b, R12: c, R4: coins, bordCalque: bord, duree_s: Math.round((Date.now() - d0) / 1000) }
      res[cle] = {
        C2a: [a.C2a.paire_2500_5000.part8, a.C2a.paire_5000_8000.part8],
        C2bPlageFigee: b.plusLongFige_s,
        C2bEcartMoyen: b.ecartMoyenParImage,
        C2cClignote: b.pairesAuDessus0085 > 0,
        R12Min: c.p90min
      }
      console.log(cle, JSON.stringify({ C2a: a.C2a, C6a: a.C6a, C2bc: b, R12min: c.p90min, sous3: c.sous3, R4: { t: coins.temoinPhotoCachee_pixels, c1: coins.cas1.pixelsMax, c2: coins.cas2.pixelsMax }, bord: bord.instants.map((x) => x.pixelsHorsDisque_d_sup_2) }))
      sauver(); await ctx.close()
    }
  }
  // ── R-4 cas 4 : barres de défilement visibles ──
  if (etapes.has('barres')) {
    const nav2 = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] })
    res.R4_cas4 = {}
    for (const vp of [{ width: 1440, height: 900 }, { width: 1088, height: 800 }]) {
      const cle = `${vp.width}x${vp.height}`
      const { ctx, page } = await ouvrir(nav2, vp, css)
      const etat = await etatPage(page)
      const coins = await r4(page, cle + '-barre', false)
      res.R4_cas4[cle] = { barre_px: etat.barre, reliefEtat: etat.reliefEtat, calqueActif: etat.animationsCalque, ...coins }
      console.log('barres', cle, JSON.stringify({ barre: etat.barre, t: coins.temoinPhotoCachee_pixels, c1: coins.cas1.pixelsMax }))
      sauver(); await ctx.close()
    }
    await nav2.close()
  }
  // ── films de 10 s à 30 images/s, page en haut, t = 2 s → 12 s (après l'entrée du titre, finie à 1,6 s) ──
  if (etapes.has('films')) {
    res.films = {}
    for (const [vp, fichier] of [[{ width: 1440, height: 900 }, 'film-1440x900.mp4'], [{ width: 1088, height: 800 }, 'film-1088x800.mp4']]) {
      const { ctx, page } = await ouvrir(nav, vp, css)
      const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', DOSSIER + fichier], { stdio: ['pipe', 'inherit', 'inherit'] })
      const fin = new Promise((ok, ko) => ff.on('close', (c) => (c === 0 ? ok() : ko(new Error('ffmpeg ' + c)))))
      let prec = null; const d = []
      for (let i = 0; i < 300; i++) {
        await poser(page, 2000 + i * 1000 / 30)
        const buf = await page.screenshot({ type: 'png' })
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
        const g = await gris(buf); if (prec) d.push(ecart(prec, g).moyen); prec = g
      }
      ff.stdin.end(); await fin
      const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=codec_name,pix_fmt,width,height,r_frame_rate,nb_read_frames:format=duration,size', '-of', 'json', DOSSIER + fichier], { encoding: 'utf8' }))
      res.films[fichier] = { format: `${vp.width}x${vp.height}`, de_ms: 2000, a_ms: 12000, images: 300, ecartParImage30ips: { moyen: +(d.reduce((s, x) => s + x, 0) / d.length).toFixed(4), max: Math.max(...d), min: Math.min(...d) }, ffprobe: probe }
      console.log('film', fichier, JSON.stringify(res.films[fichier]))
      sauver(); await ctx.close()
    }
  }
  // ── instants t06, t25, t50, t80 (scripts/demo-images-cles.mjs:29 : 0,6 / 2,5 / 5 / 8 s) en 1088×800 ──
  if (etapes.has('instants')) {
    const { ctx, page } = await ouvrir(nav, { width: 1088, height: 800 }, css)
    for (const [t, n] of [[600, 't06'], [2500, 't25'], [5000, 't50'], [8000, 't80']]) {
      await poser(page, t)
      const buf = await sharp(await page.screenshot({ type: 'png' })).jpeg({ quality: 90 }).toBuffer()
      fs.writeFileSync(DOSSIER + `${n}.jpg`, buf)
      fs.writeFileSync(DOSSIER + `grille-${n}.jpg`, buf)
    }
    res.instants = ['t06.jpg', 't25.jpg', 't50.jpg', 't80.jpg']
    sauver(); await ctx.close()
  }
} finally { await nav.close() }

// ── planche : L1, puis stellar-launch, puis art-landing, quatre images par ligne, même hauteur ──
if (etapes.has('planche')) {
  const REFS = 'C:/Users/benja/Documents/presti/.orchestre/preuves/refs/'
  const H = 300, G = 6, BANDE = 24
  const lignes = [
    ['L1', ['t06', 't25', 't50', 't80'].map((n, i) => ({ f: DOSSIER + `${n}.jpg`, e: `L1 projecteur · ${['0,6', '2,5', '5', '8'][i]} s · 1088×800 sans carte graphique` }))],
    ['stellar-launch', [0, 1, 2, 3].map((i) => ({ f: REFS + `stellar-launch-t${i}.png`, e: `stellar-launch (C2 = 5) · t${i}` }))],
    ['art-landing', [0, 1, 2, 3].map((i) => ({ f: REFS + `art-landing-t${i}.png`, e: `art-landing (C2 = 4) · t${i}` }))],
  ]
  const cases = []; let largeur = 0
  for (let r = 0; r < lignes.length; r++) {
    let x = 0
    for (const im of lignes[r][1]) {
      const v = await sharp(im.f).resize({ height: H }).toBuffer({ resolveWithObject: true })
      const w = v.info.width
      const e = Buffer.from(`<svg width="${w}" height="${BANDE}"><rect width="${w}" height="${BANDE}" fill="#000" opacity=".7"/><text x="6" y="16" font-size="12" font-family="Arial, sans-serif" fill="#fff">${im.e}</text></svg>`)
      cases.push({ input: await sharp(v.data).composite([{ input: e, top: 0, left: 0 }]).toBuffer(), left: x, top: r * (H + G) })
      x += w + G
    }
    largeur = Math.max(largeur, x - G)
  }
  await sharp({ create: { width: largeur, height: lignes.length * (H + G) - G, channels: 3, background: '#111' } }).composite(cases).jpeg({ quality: 88 }).toFile(DOSSIER + 'planche.jpg')
  res.planche = 'planche.jpg'; sauver()
  console.log('planche', largeur)
}
