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

async function enregistrer(nom, viewport, visite) {
  const nav = await chromium.launch()
  const ctx = await nav.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: TRAVAIL, size: viewport } })
  if (nom === 'mobile') await ctx.addInitScript(() => { try { sessionStorage.setItem('rideau', '1') } catch (e) {} })
  const page = await ctx.newPage()
  const t0 = Date.now()
  const temps = () => (Date.now() - t0) / 1000
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  const plans = await visite(page, temps)
  const video = page.video()
  await ctx.close(); await nav.close()
  const f = path.join(TRAVAIL, `${nom}.webm`)
  fs.renameSync(await video.path(), f)
  return { f, plans }
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
    const tDebut = temps() + 0.2
    const visHeros = await releverImages(page)
    await page.waitForTimeout(1900)
    plans.push({ nom: 'heros', debut: tDebut, duree: 1.0, visibles: visHeros })

    const tSouris = temps() + 0.1
    for (let i = 0; i <= 18; i++) { await page.mouse.move(640 + i * 30, 600 - i * 20); await page.waitForTimeout(35) }
    for (let i = 0; i <= 18; i++) { await page.mouse.move(1180 - i * 24, 240 + i * 14); await page.waitForTimeout(35) }
    plans.push({ nom: 'heros_souris', debut: tSouris, duree: 1.3, visibles: visHeros })
    await page.waitForTimeout(300)
  }

  // Parcours des autres sections présentes
  for (const sec of sections) {
    if (sec.nom === 'heros') continue
    await glisser(page, sec.sel, 1400)
    await page.waitForTimeout(200)

    const tDebut = temps()
    const visibles = await releverImages(page)

    if (sec.nom === 'questions') {
      const pGlide = glisserRelatif(page, 100, 1300)
      await page.click('.faq summary').catch(() => {})
      await pGlide
    } else if (sec.nom === 'etapes') {
      await glisserRelatif(page, 140, 1300)
      plans.push({ nom: sec.nom, debut: tDebut, duree: 1.3, visibles })

      const elListe = await page.$('.etapes__liste')
      if (elListe) {
        await glisser(page, '.etapes__liste', 1200, 40)
        await page.waitForTimeout(150)
        const tDebutListe = temps()
        const visListe = await releverImages(page)
        await glisserRelatif(page, 120, 1300)
        plans.push({ nom: 'etapes_liste', debut: tDebutListe, duree: 1.3, visibles: visListe })
      }
      continue
    } else if (sec.nom === 'realisations') {
      await glisserRelatif(page, 140, 1300)
      plans.push({ nom: sec.nom, debut: tDebut, duree: 1.3, visibles })

      const elGalerie = await page.$('.galerie')
      if (elGalerie) {
        await glisser(page, '.galerie', 1200, 40)
        await page.waitForTimeout(150)
        const tDebutGal = temps()
        const visGal = await releverImages(page)
        await glisserRelatif(page, 120, 1300)
        plans.push({ nom: 'galerie', debut: tDebutGal, duree: 1.3, visibles: visGal })
      }
      continue
    } else {
      const pGlide = glisserRelatif(page, 140, 1300)
      for (let i = 0; i <= 6; i++) {
        await page.mouse.move(500 + i * 40, 300 + i * 15)
        await page.waitForTimeout(50)
      }
      await pGlide
    }

    plans.push({ nom: sec.nom, debut: tDebut, duree: 1.3, visibles })
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
    const tDebut = temps() + 0.3
    const visHeros = await releverImages(page)
    await page.waitForTimeout(2400)
    plans.push({ nom: 'heros', debut: tDebut, duree: 1.1, visibles: visHeros })
  }

  for (const sec of sections) {
    if (sec.nom === 'heros') continue
    await glisser(page, sec.sel, 1400)
    await page.waitForTimeout(200)

    const tDebut = temps()
    const visibles = await releverImages(page)
    await glisserRelatif(page, 150, 1300)
    plans.push({ nom: sec.nom, debut: tDebut, duree: 1.3, visibles })
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
    visibles: pb.visibles,
  })

  // Appariement avec mobile pour effet côte à côte
  const pm = mobile.plans.find((p) => p.nom === pb.nom)
  if (pm) {
    const visiblesCombines = [...pm.visibles]
    for (const vb of pb.visibles) {
      if (!visiblesCombines.some((v) => v.base === vb.base)) visiblesCombines.push(vb)
    }
    if (!(sansSa && aLicenceSA(visiblesCombines))) {
      plansFinaux.push({
        nom: `${pm.nom}_mobile`,
        source: 'mobile',
        srcFichier: mobile.f,
        debut: pm.debut,
        duree: pm.duree,
        pairBureau: pb.debut,
        visibles: visiblesCombines,
      })
    } else if (!(sansSa && aLicenceSA(pm.visibles))) {
      plansFinaux.push({
        nom: `${pm.nom}_mobile`,
        source: 'mobile',
        srcFichier: mobile.f,
        debut: pm.debut,
        duree: pm.duree,
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
    visibles: p.visibles,
  })),
  affiche: {
    temps: Number(tempsAffiche.toFixed(2)),
    visibles: visiblesAffiche,
  },
}
fs.writeFileSync(path.join(SORTIE, 'plans.json'), JSON.stringify(sortiePlans, null, 2))

const poids = fs.statSync(final).size
console.log(`✓ ${path.relative(RACINE, final)} · ${dureeTotale.toFixed(1)} s · ${plansFinaux.length} plans · ${(poids / 1e6).toFixed(2)} Mo${poids > POIDS_MAX ? ' — ✗ AU-DESSUS DE 1,5 Mo' : ''} · affiche ${path.relative(RACINE, affichePath)}`)
if (!args.includes('--garder')) fs.rmSync(TRAVAIL, { recursive: true, force: true })
process.exit(poids > POIDS_MAX ? 1 : 0)

