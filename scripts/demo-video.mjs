// scripts/demo-video.mjs — la capture animée de LA démo pour la landing (prompt v16 §3.4) : courte, muette, ≤ 1,5 Mo, et
// passée au juge vidéo (scripts/video-qa.mjs : 12–60 s, aucun plan figé > 0,8 s, ≥ 5 coupes par 10 s, énergie d'image).
//
// Comment : Playwright enregistre la démo servie en local (bureau 1280×800 puis mobile 390×844) pendant une visite scriptée —
// parcours défilant à travers les sections réellement présentes, relevé d'images visibles pour le respect des licences,
// découpe ffmpeg en plans avec mouvements continus, affichage côte à côte bureau+mobile, et encodage deux passes sous 1,5 Mo.
//
// Usage : node scripts/demo-video.mjs [dossier=public/sites-demo/lestraque] [--sortie=<dossier>] [--sans-sa] [--garder]
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dossier = path.resolve(RACINE, args.find((a) => !a.startsWith('--')) || 'public/sites-demo/lestraque')
const sortieArg = args.find((a) => a.startsWith('--sortie='))?.slice(9) ||
  (args.indexOf('--sortie') !== -1 ? args[args.indexOf('--sortie') + 1] : null)
const SORTIE = sortieArg ? path.resolve(RACINE, sortieArg) : path.join(RACINE, 'public', 'promo', 'demo-site')
const sansSa = args.includes('--sans-sa')
const nomSite = path.basename(dossier)
const TRAVAIL = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-video-'))
const POIDS_MAX = 1_500_000
fs.mkdirSync(SORTIE, { recursive: true })

const ATTR = path.join(dossier, 'attributions.json')
const attributions = (() => {
  try {
    const a = JSON.parse(fs.readFileSync(ATTR, 'utf8'))
    return Array.isArray(a) ? a : (a.photos || Object.values(a))
  } catch {
    return []
  }
})()
const licenceDe = (base) => {
  const a = attributions.find((x) => (x.base || x.fichier || x.nom) === base)
  return a ? String(a.licence || a.license || '') : null
}
const estLicenceSA = (lic) => /\bSA\b|BY-SA/i.test(lic || '')
const aLicenceSA = (visibles) => (visibles || []).some((v) => estLicenceSA(v.licence))

const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2' }
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  const f = path.join(dossier, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': types[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res)
})
await new Promise((r) => srv.listen(0, r))
const url = `http://127.0.0.1:${srv.address().port}/index.html`
const ff = (args) => { const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`ffmpeg : ${(r.stderr || '').slice(0, 300)}`) }

// Un défilement doux jusqu'à un élément, en N pas (la page bouge pendant l'enregistrement : pas de saut)
async function glisser(page, selecteur, duree = 1300, decalage = -80) {
  await page.evaluate(async ({ selecteur, duree, decalage }) => {
    const el = document.querySelector(selecteur); if (!el) return
    const depart = scrollY, cible = Math.max(0, el.getBoundingClientRect().top + scrollY + decalage), t0 = performance.now()
    await new Promise((fin) => { const pas = (t) => { const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 3); scrollTo(0, depart + (cible - depart) * e); k < 1 ? requestAnimationFrame(pas) : fin() }; requestAnimationFrame(pas) })
  }, { selecteur, duree, decalage })
}

async function glisserRelatif(page, deltaY, duree = 1300) {
  await page.evaluate(async ({ deltaY, duree }) => {
    const depart = scrollY, cible = depart + deltaY, t0 = performance.now()
    await new Promise((fin) => {
      const pas = (t) => {
        const k = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - k, 3)
        scrollTo(0, depart + (cible - depart) * e)
        k < 1 ? requestAnimationFrame(pas) : fin()
      }
      requestAnimationFrame(pas)
    })
  }, { deltaY, duree })
}

// Relevé des <img> visibles dans la fenêtre (au moins 20 % de leur surface)
async function releverImages(page) {
  const bases = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
    const res = []
    for (const img of imgs) {
      const r = img.getBoundingClientRect()
      const aireTotale = r.width * r.height
      if (aireTotale <= 0) continue
      const w = window.innerWidth, h = window.innerHeight
      const iw = Math.max(0, Math.min(w, r.right) - Math.max(0, r.left))
      const ih = Math.max(0, Math.min(h, r.bottom) - Math.max(0, r.top))
      const part = (iw * ih) / aireTotale
      if (part >= 0.20) {
        const src = img.currentSrc || img.src || ''
        const nom = src.split('/').pop().split('?')[0].replace(/\.[^.]+$/, '').replace(/-\d+$/, '')
        if (nom) res.push(nom)
      }
    }
    return Array.from(new Set(res))
  })
  return bases.map((b) => ({ base: b, licence: licenceDe(b) }))
}

// Liste ordonnée de sélecteurs candidats (prompt v16 §3.4)
const CANDIDATS = [
  { nom: 'heros', selecteurs: ['.hero', '#hero', 'header + section'] },
  { nom: 'chiffres', selecteurs: ['.plateau', '.chiffres', '[aria-label*="bref"]'] },
  { nom: 'prestations', selecteurs: ['#prestations', '.scene--presta', '.presta'] },
  { nom: 'atelier', selecteurs: ['#atelier', '.atelier'] },
  { nom: 'realisations', selecteurs: ['#realisations', '.galerie', '.scene--galerie'] },
  { nom: 'communes', selecteurs: ['#communes', '.scene--communes', '.communes'] },
  { nom: 'etapes', selecteurs: ['#etapes', '.etapes'] },
  { nom: 'questions', selecteurs: ['#questions', '.faq', '.scene--faq'] },
  { nom: 'contact', selecteurs: ['#contact', '.contact'] },
]

// Repère d'horloge : un écran blanc de 300 ms, noté à l'heure du script, que l'on retrouve ensuite dans la vidéo.
async function flash(page, temps) {
  const t = temps()
  await page.evaluate(() => { const o = document.createElement('div'); o.id = '__repere'; o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff'; document.documentElement.appendChild(o) })
  await page.waitForTimeout(300)
  await page.evaluate(() => document.getElementById('__repere')?.remove())
  await page.waitForTimeout(250)
  return t
}

// Débuts des plages d'images entièrement blanches d'une vidéo, à 1/50 s près. Le moindre bloc sous 245 disqualifie l'image
// (une page crème avec du texte n'y passe pas) ; la bande de droite est ignorée (barre de défilement éventuelle).
function reperesBlancs(f) {
  const brut = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'crop=iw-40:ih:0:0,fps=50,scale=32:20,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 }).stdout
  const t = 32 * 20, n = Math.floor(brut.length / t), debuts = []
  let avant = false
  for (let i = 0; i < n; i++) {
    let blanc = true
    for (let k = 0; k < t && blanc; k++) if (brut[i * t + k] < 245) blanc = false
    if (blanc && !avant) debuts.push(i / 50)
    avant = blanc
  }
  return debuts
}

async function enregistrer(nom, viewport, visite) {
  // WebGL activé : sans lui, le relief de l'escalier ne tourne pas dans le navigateur d'enregistrement. Mêmes réglages que la
  // vérification du relief en production.
  const nav = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] })
  const ctx = await nav.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: TRAVAIL, size: viewport } })
  if (nom === 'mobile') await ctx.addInitScript(() => { try { sessionStorage.setItem('rideau', '1') } catch (e) {} })
  const page = await ctx.newPage()
  const t0 = Date.now()
  const temps = () => (Date.now() - t0) / 1000
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const repereA = await flash(page, temps)
  const plans = await visite(page, temps)
  const repereB = await flash(page, temps)
  const video = page.video()
  await ctx.close(); await nav.close()
  const f = path.join(TRAVAIL, `${nom}.webm`)
  fs.renameSync(await video.path(), f)

  // L'horloge du script n'est pas celle de la vidéo : mesuré le 15/09/2026 avec deux écrans blancs par enregistrement, la
  // vidéo est en avance de 0,46 à 0,63 s, et l'écart bouge d'un essai à l'autre et au cours d'un même enregistrement.
  // Découpés à l'heure du script, les plans commençaient une demi-seconde trop tard : la partie rapide de chaque geste
  // tombait avant la coupe et l'attente d'après dedans (plans figés au juge vidéo, quatre essais de suite). Les heures des
  // plans sont donc recalées sur les deux repères retrouvés dans la vidéo, par interpolation entre le début et la fin.
  const vus = reperesBlancs(f)
  if (vus.length !== 2) throw new Error(`${nom} : ${vus.length} repère(s) blanc(s) dans la vidéo au lieu de 2 (${vus.map((v) => v.toFixed(2)).join(', ')}) — horloge impossible à recaler`)
  const ecartA = vus[0] - repereA, ecartB = vus[1] - repereB
  const versVideo = (w) => Number(Math.max(0, w + ecartA + ((ecartB - ecartA) * (w - repereA)) / (repereB - repereA)).toFixed(2))
  for (const p of plans) {
    p.debut = versVideo(p.debut)
    for (const r of p.releves || []) r.t = versVideo(r.t)
  }
  console.log(`${nom} : horloge recalée sur la vidéo (écart ${ecartA.toFixed(2)} s au début, ${ecartB.toFixed(2)} s à la fin)`)
  return { f, plans }
}

async function executerPlan(page, temps, nom, duree, action) {
  const debut = Number(temps().toFixed(2))
  const vis0 = await releverImages(page)
  const r0 = { t: debut, visibles: vis0 }

  const pAction = action ? action() : null

  const tMilieuAttendu = debut + duree / 2
  const attenteMilieu = Math.max(0, (tMilieuAttendu - temps()) * 1000)
  if (attenteMilieu > 0) await page.waitForTimeout(attenteMilieu)
  const t1 = Number(temps().toFixed(2))
  const vis1 = await releverImages(page)
  const r1 = { t: t1, visibles: vis1 }

  // Le dernier relevé est pris À LA FIN DU PLAN, à son heure réelle, et seulement ensuite on laisse l'action se terminer.
  // Avant la relecture de 018-07 par Claude Code (14/09/2026), on attendait la fin de l'action puis on remplaçait l'heure
  // mesurée par l'heure attendue dès que l'écart dépassait 0,12 s : un horodatage faux dans plans.json.
  const tFinAttendu = debut + duree
  const attenteFin = Math.max(0, (tFinAttendu - temps()) * 1000)
  if (attenteFin > 0) await page.waitForTimeout(attenteFin)
  const t2 = Number(temps().toFixed(2))
  const vis2 = await releverImages(page)
  const r2 = { t: t2, visibles: vis2 }
  if (pAction) await pAction

  const releves = [r0, r1, r2]
  const unionMap = new Map()
  for (const r of releves) {
    for (const v of r.visibles) {
      if (!unionMap.has(v.base)) unionMap.set(v.base, v)
    }
  }
  return {
    nom,
    debut,
    duree: Number(duree.toFixed(2)),
    releves,
    visibles: Array.from(unionMap.values()),
  }
}

async function visiterBureau(page, temps) {
  const plans = []
  const sections = []
  for (const c of CANDIDATS) {
    for (const s of c.selecteurs) {
      const el = await page.$(s)
      if (el) {
        sections.push({ nom: c.nom, sel: s })
        break
      }
    }
  }

  // Héros si présent
  const secHeros = sections.find((s) => s.nom === 'heros')
  if (secHeros) {
    await page.waitForTimeout(200)
    // Le plan d'ouverture montre le titre posé, sans geste (le relief n'est pas encore prêt) : à 1,0 s il sortait figé 0,88 s
    // une fois l'horloge recalée (15/09/2026). 0,8 s suffit à lire « Fait pour rester ».
    const planHeros = await executerPlan(page, temps, 'heros', 0.8, () => page.waitForTimeout(800))
    plans.push(planHeros)
    await page.waitForTimeout(700)

    // Le relief WebGL met de 0,8 s à plus de 4 s à être prêt selon la charge : sans lui, la souris passe sur une image
    // immobile et le plan sort figé (juge vidéo en échec, 15/09/2026). On attend son signal (data-relief-etat="pret")
    // jusqu'à 6 s ; s'il ne vient pas, un léger défilement pendant le plan le garde vivant.
    const reliefPret = await page.waitForSelector('[data-relief-etat="pret"]', { timeout: 6000 }).then(() => true).catch(() => false)
    await page.waitForTimeout(100)
    const planSouris = await executerPlan(page, temps, 'heros_souris', 1.35, async () => {
      // Même prêt, le relief amortit la souris : environ 3,7 % de l'image change en tout, réparti sur une douzaine d'images,
      // donc sous le seuil de 0,6 % d'une image à l'autre du détecteur de plans figés (1,25 s figées à 2,1 s, relief prêt,
      // 15/09/2026). Le plan défile donc aussi, et assez pour se voir : l'enregistrement fait 800 px de haut mais la vidéo
      // n'en garde que les 720 du haut, et le plateau part de 800 px ; un défilement de 90 px n'en montrait que 10 px.
      // À 300 px, le plateau noir monte d'un quart d'écran sur l'escalier. reliefPret reste attendu pour que la souris
      // montre le relief quand il existe.
      void reliefPret
      const pGlide = glisserRelatif(page, 300, 1300)
      for (let i = 0; i <= 18; i++) { await page.mouse.move(640 + i * 30, 600 - i * 20); await page.waitForTimeout(30) }
      for (let i = 0; i <= 18; i++) { await page.mouse.move(1180 - i * 24, 240 + i * 14); await page.waitForTimeout(30) }
      if (pGlide) await pGlide
    })
    plans.push(planSouris)
    await page.waitForTimeout(300)
  }

  // Parcours des autres sections présentes
  for (const sec of sections) {
    if (sec.nom === 'heros') continue
    await glisser(page, sec.sel, 1400)
    await page.waitForTimeout(200)

    if (sec.nom === 'questions') {
      const plan = await executerPlan(page, temps, sec.nom, 1.35, async () => {
        const pGlide = glisserRelatif(page, 100, 1250)
        await page.click('.faq summary').catch(() => {})
        await pGlide
      })
      plans.push(plan)
    } else if (sec.nom === 'etapes') {
      // Sur bureau la section est épinglée (2 400 px de défilement pour un contenu fixe) : 140 px à l'intérieur ne changeaient
      // rien à l'image (1,25 s figées à 18,3 s, 15/09/2026), et l'allumage d'une étape ne change qu'un chiffre sur fond noir.
      // On remonte donc hors plan avant l'épinglage ; pendant le plan, la section monte sur l'écran et se fixe.
      await glisser(page, sec.sel, 700, -560)
      await page.waitForTimeout(150)
      const plan = await executerPlan(page, temps, sec.nom, 1.35, () => glisserRelatif(page, 560, 1300))
      plans.push(plan)

      const elListe = await page.$('.etapes__liste')
      if (elListe) {
        // La liste reste épinglée jusqu'à la dernière étape : 120 px à l'intérieur ne changeaient rien à l'image (1,13 s figées
        // à 21,1 s une fois l'horloge recalée, 15/09/2026). Le plan part 320 px avant la fin de l'épinglage, quatrième étape
        // allumée, et suit la liste qui s'en va.
        const finEpingle = await page.evaluate((sel) => { const s = document.querySelector(sel); return s.getBoundingClientRect().top + scrollY + s.offsetHeight - innerHeight }, sec.sel)
        await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round(finEpingle - 320))
        await page.waitForTimeout(250)
        const planListe = await executerPlan(page, temps, 'etapes_liste', 1.35, () => glisserRelatif(page, 620, 1250))
        plans.push(planListe)
      }
      continue
    } else if (sec.nom === 'realisations') {
      const plan = await executerPlan(page, temps, sec.nom, 1.35, () => glisserRelatif(page, 140, 1250))
      plans.push(plan)

      const elGalerie = await page.$('.galerie')
      if (elGalerie) {
        await glisser(page, '.galerie', 1200, 40)
        await page.waitForTimeout(150)
        const planGal = await executerPlan(page, temps, 'galerie', 1.35, () => glisserRelatif(page, 120, 1250))
        plans.push(planGal)
      }
      continue
    } else if (sec.nom === 'contact') {
      // Le contact est la dernière section : la page est déjà en bas, un défilement de plus ne bouge rien et le plan sortait
      // figé 1,13 s (juge vidéo en échec, 15/09/2026). Taper dans le champ ne suffisait pas : quelques lettres, 0,02 % de
      // l'image d'une image à l'autre, 1,25 s figées. Hors plan, on remonte donc de 420 px ; pendant le plan, la page
      // redescend jusqu'au formulaire et on y tape une demande une fois le champ à l'écran. Rien n'est envoyé (aucun clic
      // sur le bouton).
      await page.evaluate((m) => scrollTo(0, Math.max(0, document.documentElement.scrollHeight - innerHeight - m)), 420)
      await page.waitForTimeout(250)
      const plan = await executerPlan(page, temps, sec.nom, 1.35, async () => {
        const pGlide = glisserRelatif(page, 420, 1250)
        await page.waitForTimeout(700)
        const champ = await page.$('#contact textarea, .contact textarea, form textarea')
        if (champ) {
          await champ.evaluate((el) => el.focus({ preventScroll: true }))
          await page.keyboard.type('Escalier en chêne, trois volées', { delay: 40 })
        }
        await pGlide
      })
      plans.push(plan)
    } else {
      const plan = await executerPlan(page, temps, sec.nom, 1.35, async () => {
        const pGlide = glisserRelatif(page, 140, 1250)
        for (let i = 0; i <= 6; i++) {
          await page.mouse.move(500 + i * 40, 300 + i * 15)
          await page.waitForTimeout(50)
        }
        await pGlide
      })
      plans.push(plan)
    }

    await page.waitForTimeout(200)
  }

  return plans
}

async function visiterMobile(page, temps) {
  const plans = []
  const sections = []
  for (const c of CANDIDATS) {
    for (const s of c.selecteurs) {
      const el = await page.$(s)
      if (el) {
        sections.push({ nom: c.nom, sel: s })
        break
      }
    }
  }

  const secHeros = sections.find((s) => s.nom === 'heros')
  if (secHeros) {
    await page.waitForTimeout(300)
    // Le plan mobile du héros attendait sans bouger : collé à l'ouverture du bureau (immobile elle aussi pendant le
    // chargement), le plan côte à côte sortait figé 1,0 s (15/09/2026). La page défile un peu : le titre monte.
    const planHeros = await executerPlan(page, temps, 'heros', 1.1, () => glisserRelatif(page, 220, 1100))
    plans.push(planHeros)
    await page.waitForTimeout(1000)
  }

  for (const sec of sections) {
    if (sec.nom === 'heros') continue
    await glisser(page, sec.sel, 1400)
    await page.waitForTimeout(200)

    // Près du bas de page, le défilement du plan butait sur la fin et l'image ne bougeait plus (contact : 0,88 s figées,
    // 15/09/2026) : on remonte d'abord, hors plan, de ce qui manque.
    const delta = sec.nom === 'contact' ? 320 : 150
    const manque = await page.evaluate((d) => scrollY + d - (document.documentElement.scrollHeight - innerHeight), delta)
    if (manque > 0) { await page.evaluate((m) => scrollBy(0, -m), manque); await page.waitForTimeout(250) }
    const plan = await executerPlan(page, temps, sec.nom, 1.35, () => glisserRelatif(page, delta, 1250))
    plans.push(plan)
    await page.waitForTimeout(200)
  }

  return plans
}

const bureau = await enregistrer('bureau', { width: 1280, height: 800 }, visiterBureau)
const mobile = await enregistrer('mobile', { width: 390, height: 844 }, visiterMobile)
srv.close()

// Filtrage et assemblage des plans
const plansFinaux = []
for (const pb of bureau.plans) {
  if (sansSa && aLicenceSA(pb.visibles)) continue
  plansFinaux.push({
    nom: pb.nom,
    source: 'bureau',
    srcFichier: bureau.f,
    debut: pb.debut,
    duree: pb.duree,
    releves: pb.releves,
    visibles: pb.visibles,
  })

  // Appariement avec mobile pour effet côte à côte
  const pm = mobile.plans.find((p) => p.nom === pb.nom)
  if (pm) {
    const nReleves = Math.max(pm.releves?.length || 0, pb.releves?.length || 0)
    const relevesCombines = []
    for (let k = 0; k < nReleves; k++) {
      const rm = pm.releves?.[k] || pm.releves?.[pm.releves.length - 1]
      const rb = pb.releves?.[k] || pb.releves?.[pb.releves.length - 1]
      const mapK = new Map()
      for (const v of (rm?.visibles || [])) mapK.set(v.base, v)
      for (const v of (rb?.visibles || [])) {
        if (!mapK.has(v.base)) mapK.set(v.base, v)
      }
      relevesCombines.push({
        t: rm ? rm.t : pm.debut,
        visibles: Array.from(mapK.values()),
      })
    }

    const unionCombinee = new Map()
    for (const r of relevesCombines) {
      for (const v of r.visibles) {
        if (!unionCombinee.has(v.base)) unionCombinee.set(v.base, v)
      }
    }
    const visiblesCombines = Array.from(unionCombinee.values())

    if (!(sansSa && aLicenceSA(visiblesCombines))) {
      plansFinaux.push({
        nom: `${pm.nom}_mobile`,
        source: 'mobile',
        srcFichier: mobile.f,
        debut: pm.debut,
        duree: pm.duree,
        pairBureau: pb.debut,
        releves: relevesCombines,
        visibles: visiblesCombines,
      })
    } else if (!(sansSa && aLicenceSA(pm.visibles))) {
      plansFinaux.push({
        nom: `${pm.nom}_mobile`,
        source: 'mobile',
        srcFichier: mobile.f,
        debut: pm.debut,
        duree: pm.duree,
        releves: pm.releves,
        visibles: pm.visibles,
      })
    }
  }
}

const fond = '#1F160E'
const morceaux = []
plansFinaux.forEach((p, i) => {
  const out = path.join(TRAVAIL, `plan-${String(i).padStart(2, '0')}.mp4`)
  const estMobile = p.source === 'mobile'
  const filtre = estMobile
    ? `scale=-2:720,pad=1280:720:(ow-iw)/2:0:color=${fond},fps=30,format=yuv420p`
    : `scale=1280:-2,crop=1280:720:0:0,fps=30,format=yuv420p`
  if (estMobile && p.pairBureau !== undefined) {
    ff(['-ss', p.pairBureau.toFixed(2), '-t', p.duree.toFixed(2), '-i', bureau.f, '-ss', p.debut.toFixed(2), '-t', p.duree.toFixed(2), '-i', p.srcFichier, '-an',
      '-filter_complex', `[0:v]scale=1280:-2,crop=880:720:0:0[g];[1:v]scale=400:-2,crop=400:720:0:0[d];[g][d]hstack=inputs=2,fps=30,format=yuv420p[v]`, '-map', '[v]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', out])
  } else {
    ff(['-ss', p.debut.toFixed(2), '-t', p.duree.toFixed(2), '-i', p.srcFichier, '-an', '-vf', filtre, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', out])
  }
  morceaux.push(out)
})

const liste = path.join(TRAVAIL, 'liste.txt')
fs.writeFileSync(liste, morceaux.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'))
const brut = path.join(TRAVAIL, 'brut.mp4')
ff(['-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', brut])

// Encodage final : deux passes à débit visé pour tenir sous POIDS_MAX, sans son, démarrage rapide (faststart)
const dureeTotale = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', brut], { encoding: 'utf8' }).stdout.trim())
const final = path.join(SORTIE, `${nomSite}.mp4`)
for (const kbps of [Math.floor((POIDS_MAX * 8 * 0.9) / dureeTotale / 1000), 520, 420]) {
  const nul = process.platform === 'win32' ? 'NUL' : '/dev/null'
  ff(['-i', brut, '-an', '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${kbps}k`, '-pass', '1', '-passlogfile', path.join(TRAVAIL, 'passe'), '-f', 'mp4', nul])
  ff(['-i', brut, '-an', '-c:v', 'libx264', '-preset', 'slow', '-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 1.4)}k`, '-bufsize', `${kbps * 2}k`, '-pass', '2', '-passlogfile', path.join(TRAVAIL, 'passe'), '-movflags', '+faststart', '-pix_fmt', 'yuv420p', final])
  if (fs.statSync(final).size <= POIDS_MAX) break
}

// Instant d'affiche : plan sans SA
const premierPlanPropre = plansFinaux.find((p) => !aLicenceSA(p.visibles))
const tempsAffiche = premierPlanPropre ? Math.min(premierPlanPropre.duree / 2, 0.8) : 1.0
const visiblesAffiche = premierPlanPropre ? premierPlanPropre.visibles : []
const relevesAffiche = [
  {
    t: Number(tempsAffiche.toFixed(2)),
    visibles: visiblesAffiche,
  },
]

const affichePath = path.join(SORTIE, `${nomSite}-affiche.webp`)
ff(['-ss', tempsAffiche.toFixed(2), '-i', final, '-frames:v', '1', '-vf', 'scale=1280:-2', '-c:v', 'libwebp', '-quality', '72', affichePath])

// Écriture de plans.json
const sortiePlans = {
  site: path.relative(RACINE, dossier),
  sansSa,
  plans: plansFinaux.map((p) => ({
    nom: p.nom,
    source: p.source,
    debut: Number(p.debut.toFixed(2)),
    duree: Number(p.duree.toFixed(2)),
    releves: p.releves,
    visibles: p.visibles,
  })),
  affiche: {
    temps: Number(tempsAffiche.toFixed(2)),
    releves: relevesAffiche,
    visibles: visiblesAffiche,
  },
}
fs.writeFileSync(path.join(SORTIE, 'plans.json'), JSON.stringify(sortiePlans, null, 2))

const poids = fs.statSync(final).size
console.log(`✓ ${path.relative(RACINE, final)} · ${dureeTotale.toFixed(1)} s · ${plansFinaux.length} plans · ${(poids / 1e6).toFixed(2)} Mo${poids > POIDS_MAX ? ' — ✗ AU-DESSUS DE 1,5 Mo' : ''} · affiche ${path.relative(RACINE, affichePath)}`)
if (!args.includes('--garder')) fs.rmSync(TRAVAIL, { recursive: true, force: true })
process.exit(poids > POIDS_MAX ? 1 : 0)

