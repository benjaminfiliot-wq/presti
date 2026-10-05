// scripts/station-decor-qa.mjs — le juge du DÉCOR de la carte (lot « décor » du 05/10, sur les écarts n° 1 à 3 de
// .orchestre/preuves/conformite-05-10/videos.md : « la carte peint des rectangles de couleur unie, l'atlas livré n'est pas branché, le fond est un
// dégradé sans étoile »). Ajouté À CÔTÉ des juges de la série K (station-claw3d-qa, station-ecran-qa), jamais à leur place : il ne retire ni ne relâche
// aucune de leurs vérifications, et leur témoin n'a pas à satisfaire ces critères.
//
//   node scripts/station-decor-qa.mjs [--racine=<arbre>]
//
// Critères (chacun se MESURE sur les pixels de la texture « decor » du jeu en marche, ou sur le DOM ; rien ne se juge sur une capture) :
//   DC-1 le thème « station » au bureau (400 × 384) : la coque de l'atlas est reconnue pixel pour pixel (la bande gauche de la coque, hors des salles, est
//        celle de public/station/themes/station/atlas.png à y = 384), et le fond n'est pas un aplat ni un dégradé lisse
//   DC-2 le ciel : une nébuleuse (au moins trois tons de violet dans un coin), des étoiles (pixels clairs isolés) dans la marge, le même ciel octet pour octet
//        sur deux pages
//   DC-3 chaque salle (hors la réservée) : un liseré à la teinte de la salle sur son bord haut, plusieurs couleurs dans la case (jamais un aplat) ; les
//        treize salles meublées portent leurs meubles (au moins 8 couleurs)
//   DC-4 les personnages d'une même salle s'étalent : deux agents du même genre (porte ou poste) dans la même salle ne sont jamais au même point, tous sont
//        dans la salle, et un agent seul est à son poste exact
//   DC-5 le portrait (390 × 844, onglet Station) : le décor vient aussi de l'atlas (les cases recopiées), chaque salle porte son nom court [data-nom-court],
//        visible, lisible (≥ 9 px de haut), dans le canevas, et aucune plaque [data-plaque] n'est visible en vue d'ensemble (CE-24 : elles viennent au zoom ×2)
//   DC-6 les autres thèmes (« vaisseau ») : le repli en code garde un décor riche (couleurs, liseré, meubles), la carte ne reste pas vide
//   DC-7 le décor de l'atlas ne réveille rien : au repos la boucle de Phaser dort et la texture du décor ne change pas (règle de vérité : CE-3, CL-9), et la zone de
//        l'antenne [data-antenne] est posée sur la tête de l'antenne de l'atlas (à 3 px près), pas dans un coin
//
// Où il tourne : comme station-ecran-qa, sur l'usine (un build, Chromium). Lancé ailleurs, il se relance par `scripts/usine.mjs executer --nom=decor`
// (PRESTI_JUGE_LOCAL=1 force le jugement sur place). Sortie : « ✅ DC-n … » ou « ❌ DC-n … » par critère, puis « station-decor-qa : PASS|FAIL ».
// Code 0 seulement si tout est vert, 1 si un critère est rouge, 2 si un préalable manque. Aucun réseau hors 127.0.0.1 ; ne lit ni .env.local ni aucune clé.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { R, lireOptions, creerSortie, premiereLigne } from './fixtures/026-pilotage/a/commun.mjs'

const JUGE = 'station-decor-qa'
const IDS = ['DC-1', 'DC-2', 'DC-3', 'DC-4', 'DC-5', 'DC-6', 'DC-7']
const o = lireOptions(process.argv.slice(2), { connues: [] })
if (o.inconnues.length || o.positionnels.length) { console.log(`${JUGE} : appel refusé — option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`); process.exit(2) }

const SUR_USINE = process.platform === 'linux' && os.hostname() === 'presti-usine'
const CLE_USINE = path.join(os.homedir(), '.ssh', 'presti-usine')
if (!SUR_USINE && process.env.PRESTI_JUGE_LOCAL !== '1' && !o.valeurs.racine && fs.existsSync(path.join(R, 'scripts', 'usine.mjs')) && fs.existsSync(CLE_USINE)) {
  console.log(`· ${JUGE} : ce poste (${os.hostname()}) n'est pas l'usine ; le rendu est relancé par scripts/usine.mjs executer`)
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'usine.mjs'), 'executer', '--nom=decor', '--', 'node', 'scripts/station-decor-qa.mjs', ...process.argv.slice(2)], { cwd: R, stdio: 'inherit', windowsHide: true })
  if (r.status === null) { console.log(`❌ DC-1 usine injoignable : ${r.error ? premiereLigne(r.error) : 'aucun verdict rendu'}`); process.exit(2) }
  process.exit(r.status)
}

const racine = o.racine
const s = creerSortie(JUGE, IDS, `${JUGE} — racine ${path.relative(R, racine) || '.'}`)
const aNettoyer = []
const nettoyer = async () => { for (const f of aNettoyer.splice(0).reverse()) { try { await f() } catch { /* déjà arrêté */ } } }
const toutRouge = (m) => { for (const id of IDS) if (!s.evalue(id)) s.echoue(id, m) }

// ── Ce que le navigateur mesure : le décor lu dans la texture « decor » du jeu, et l'atlas relu par la page ────────────────────
const MESURES = async ({ cle, bureau }) => {
  const g = globalThis.__stationGame
  const src = g.textures.get('decor').getSourceImage()
  const W = src.width, H = src.height
  const px = src.getContext('2d').getImageData(0, 0, W, H).data
  const lum = (i) => 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]
  const couleurs = (x0, y0, l, h) => { const v = new Map(); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + l; x++) { const i = (y * W + x) * 4; const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]; v.set(k, (v.get(k) ?? 0) + 1) } return v }
  const sortie = { W, H, tout: couleurs(0, 0, W, H).size }
  // les étoiles : pixels clairs dont les quatre voisins sont sombres, dans la marge haute et basse (hors de la coque)
  const etoiles = (x0, y0, l, h) => { let n = 0; for (let y = Math.max(1, y0); y < Math.min(H - 1, y0 + h); y++) for (let x = Math.max(1, x0); x < Math.min(W - 1, x0 + l); x++) { const i = (y * W + x) * 4; if (lum(i) > 105 && lum(i - 4) < 80 && lum(i + 4) < 80 && lum(i - W * 4) < 80 && lum(i + W * 4) < 80) n++ } return n }
  sortie.etoiles = bureau ? etoiles(0, 0, W, 22) + etoiles(0, H - 40, W, 40) : etoiles(0, 0, W, H)
  sortie.tonsCoin = couleurs(0, 0, 70, 50).size
  const bin = atob(src.toDataURL().split(',')[1]), oct = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i)
  sortie.hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', oct))).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
  // l'atlas relu par la page, comparé au décor
  if (cle === 'station') {
    const img = new Image(); img.src = '/station/themes/station/atlas.png'; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0)
    const comparer = (ax, ay, dx, dy, l, h) => { const a = cx.getImageData(ax, ay, l, h).data; let egal = 0; for (let j = 0; j < h; j++) for (let i = 0; i < l; i++) { const p = ((dy + j) * W + dx + i) * 4, q = (j * l + i) * 4; if (px[p] === a[q] && px[p + 1] === a[q + 1] && px[p + 2] === a[q + 2]) egal++ } return egal / (l * h) }
    sortie.atlas = { l: img.width, h: img.height }
    if (bureau) sortie.bandeGauche = comparer(20, 384 + 130, 20, 130, 34, 160)
    else sortie.caseCommandement = comparer(80 + 8, 384 + 96 + 8, 16 + 8, 24 + 8, 32, 32)
  }
  return sortie
}

async function lireSalles(page, emplacements) {
  return page.evaluate((emps) => {
    const src = globalThis.__stationGame.textures.get('decor').getSourceImage()
    const W = src.width, H = src.height, px = src.getContext('2d').getImageData(0, 0, W, H).data
    return emps.map((e) => {
      const v = new Map()
      for (let y = e.y; y < e.y + e.h; y++) for (let x = e.x; x < e.x + e.l; x++) { const i = (y * W + x) * 4; const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]; v.set(k, (v.get(k) ?? 0) + 1) }
      const i = (e.y * W + e.x + Math.floor(e.l / 2) - 6) * 4
      const lis = `#${[px[i], px[i + 1], px[i + 2]].map((n) => n.toString(16).padStart(2, '0')).join('')}`
      return { cle: e.cle, couleurs: v.size, dominante: Math.max(...v.values()) / (e.l * e.h), lisere: lis }
    })
  }, emplacements)
}
const boite = (e) => {
  const f = e.forme
  if (f.type === 'polygone') { const xs = f.points.map((p) => p[0]), ys = f.points.map((p) => p[1]); return { cle: e.cle, x: Math.min(...xs), y: Math.min(...ys), l: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } }
  return { cle: e.cle, x: f.x, y: f.y, l: f.l, h: f.h }
}
const MEUBLEES = ['radar', 'envois', 'atelier', 'usine', 'crieur', 'recettes', 'tresorerie', 'studio', 'audience', 'machines', 'chantier', 'securite', 'repos']

async function mesurer() {
  if (!fs.existsSync(path.join(R, 'node_modules', 'next', 'dist', 'bin', 'next'))) { toutRouge('préalable manquant : next est absent de node_modules'); return }
  const { servirCopie, lancerChromium, nouvellePage, attendrePrete, attendreCalme, lireMiroir, imageFrame, jusqua, attendre } = await import('./fixtures/026-pilotage/e/commun.mjs')
  const { base } = await import('./fixtures/026-pilotage/e/jeux.mjs')
  let serveur
  try { serveur = await servirCopie(racine) } catch (e) { toutRouge(`la copie ne se construit pas ou ne se sert pas : ${premiereLigne(e)}`); return }
  aNettoyer.push(() => serveur.arreter())
  let nav
  try { nav = await lancerChromium() } catch (e) { toutRouge(`préalable manquant : ${premiereLigne(e)}`); return }
  aNettoyer.push(() => nav.close())
  const themes = {}
  for (const cle of ['station', 'vaisseau']) themes[cle] = JSON.parse(fs.readFileSync(path.join(racine, 'public', 'station', 'themes', cle, 'theme.json'), 'utf8'))
  const ctx = { nav, base: serveur.base }
  const reponses = (cle) => { const r = base({ hublot: false }); r.themes = { [cle]: themes[cle] }; r.reglages.reglages.theme = cle; return r }
  const ouvrir = async (cle, o2 = {}) => {
    const P = await nouvellePage(ctx, { reponses: reponses(cle), ...o2 })
    // La session simulée (k/session-simulee.mjs) répond 404 à tout /station/… sauf theme.json : le thème Station, chargé ici comme en production, n'aurait donc jamais
    // son atlas. Le juge le sert LUI-MÊME, depuis le fichier de l'arbre jugé (public/station/themes/station/atlas.png, octet pour octet), avant de charger la page.
    await P.contexte.route((u) => /^\/station\/themes\/(?:station|vaisseau)\/atlas\.png$/.test(u.pathname), (route) => {
      const cle2 = new URL(route.request().url()).pathname.split('/')[3]
      route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(racine, 'public', 'station', 'themes', cle2, 'atlas.png')) })
    })
    await P.aller()
    if (o2.telephone) await P.page.locator('[data-onglet-tel="station"]').click({ timeout: 30_000 })
    const raison = await attendrePrete(P)
    if (raison) { await P.fermer(); throw new Error(raison) }
    await attendreCalme(P, { ms: 600, delai: 15_000 })
    return P
  }
  const mesure = (P, cle, bureau) => P.page.evaluate(`(${MESURES.toString()})(${JSON.stringify({ cle, bureau })})`)

  // ── Le bureau, thème « station », deux pages ───────────────────────────────────────────────────────────────────────────
  let A = null, B = null, salles = null, miroir = null, grille = null, repos = null
  try {
    const PA = await ouvrir('station'), PB = await ouvrir('station')
    try {
      A = await mesure(PA, 'station', true)
      B = await mesure(PB, 'station', true)
      grille = themes.station.grille
      salles = await lireSalles(PA.page, themes.station.emplacements.filter((e) => !e.reservee).map(boite))
      miroir = await lireMiroir(PA.page)
      // Au repos : la boucle de Phaser ne dessine plus rien (le canevas ne change que par une image), la texture du décor reste la même.
      const frames = new Set(), textures = new Set()
      for (let i = 0; i < 8; i++) {
        frames.add(await imageFrame(PA.page))
        textures.add((await mesure(PA, 'station', true)).hash)
        await attendre(400)
      }
      const imm = { frames: [...frames], textures: [...textures] }
      const geo = await PA.page.evaluate(() => {
        const t = document.querySelector('[data-station-carte] canvas').getBoundingClientRect(), a = document.querySelector('[data-antenne]')?.getBoundingClientRect()
        const k = t.width / 400
        return a ? { cx: (a.x + a.width / 2 - t.x) / k, cy: (a.y + a.height / 2 - t.y) / k } : null
      })
      repos = { imm, geo }
    } finally { await PA.fermer(); await PB.fermer() }
  } catch (e) { for (const id of ['DC-1', 'DC-2', 'DC-3', 'DC-4', 'DC-7']) s.echoue(id, `la page du bureau ne se mesure pas : ${premiereLigne(e)}`) }
  if (A) {
    s.juger('DC-1', [
      ...(A.W !== 400 || A.H !== 384 ? [`la texture « decor » fait ${A.W} × ${A.H}, 400 × 384 attendu (la grille du thème)`] : []),
      ...(!(A.bandeGauche >= 0.98) ? [`la bande gauche de la coque ne vient pas de l'atlas : ${(100 * (A.bandeGauche ?? 0)).toFixed(0)} % de pixels identiques à ceux de l'atlas (98 % attendus) : la scène ne dessine pas la coque de l'atlas`] : []),
      ...(A.tout < 40 ? [`${A.tout} couleurs seulement dans le décor entier (40 au moins : une coque, des meubles et un ciel ne tiennent pas dans quelques aplats)`] : []),
    ], `la bande gauche de la coque est celle de l'atlas (${(100 * (A.bandeGauche ?? 0)).toFixed(0)} % de pixels identiques), ${A.tout} couleurs dans le décor`)
    s.juger('DC-2', [
      ...(A.etoiles < 6 ? [`${A.etoiles} étoile(s) dans la marge haute et basse (6 au moins : des pixels clairs isolés sur un fond sombre)`] : []),
      ...(A.tonsCoin < 3 ? [`${A.tonsCoin} ton(s) dans le coin haut-gauche du ciel (3 au moins : une nébuleuse tramée, pas un aplat ni un dégradé de deux couleurs)`] : []),
      ...(A.hash !== B.hash ? [`le décor diffère d'une page à l'autre (${A.hash} et ${B.hash}) : le ciel dépend d'un tirage au hasard ou de l'horloge`] : []),
    ], `${A.etoiles} étoiles dans la marge, ${A.tonsCoin} tons dans le coin de la nébuleuse, la même texture octet pour octet sur deux pages (${A.hash})`)
  }
  if (salles && grille) {
    const teinte = Object.fromEntries(themes.station.emplacements.map((e) => [e.cle, e.teinte.toLowerCase()]))
    const e3 = []
    for (const m of salles) {
      if (m.lisere !== teinte[m.cle]) e3.push(`${m.cle} : le bord haut de la salle est ${m.lisere}, sa teinte ${teinte[m.cle]} attendue (un liseré à la teinte de la salle)`)
      if (m.dominante > 0.85) e3.push(`${m.cle} : ${(100 * m.dominante).toFixed(0)} % de la case d'une seule couleur (un aplat)`)
      if (m.couleurs < 5) e3.push(`${m.cle} : ${m.couleurs} couleur(s) dans la case (5 au moins)`)
      if (MEUBLEES.includes(m.cle) && m.couleurs < 8) e3.push(`${m.cle} : ${m.couleurs} couleurs, 8 au moins pour une salle meublée (deux meubles de son genre)`)
    }
    s.juger('DC-3', e3, `${salles.length} salles : le bord haut de chacune est à sa teinte, aucune n'est un aplat, les ${MEUBLEES.length} salles meublées portent au moins 8 couleurs`)
  }
  if (miroir) {
    const e4 = []
    const emp = Object.fromEntries(themes.station.emplacements.map((e) => [e.cle, e]))
    const groupes = new Map()
    for (const l of miroir) { const k = `${l.salle}|${l.motif === 'porte' ? 'porte' : 'poste'}`; groupes.set(k, [...(groupes.get(k) ?? []), l]) }
    let multiples = 0
    for (const [k, l] of groupes) {
      const [salle, genre] = k.split('|'), e = emp[salle]
      if (!e) continue
      const b = boite(e), base = genre === 'porte' ? e.porte : e.poste
      for (const a of l) {
        const x = Number(a.x), y = Number(a.y)
        if (x < b.x || x > b.x + b.l || y < b.y || y > b.y + b.h) e4.push(`${a.nom} est en ${x},${y}, hors de la salle ${salle}`)
      }
      if (l.length === 1 && base && (Number(l[0].x) !== base.x || Number(l[0].y) !== base.y)) e4.push(`${l[0].nom} est seul à ${genre === 'porte' ? 'la porte' : 'son poste'} de ${salle} et se tient en ${l[0].x},${l[0].y} au lieu de ${base.x},${base.y}`)
      if (l.length > 1) {
        multiples++
        const pts = new Set(l.map((a) => `${a.x},${a.y}`))
        if (pts.size !== l.length) e4.push(`${l.length} agents ${genre === 'porte' ? 'à la porte' : 'au poste'} de ${salle} (${l.map((a) => a.nom).join(', ')}) se superposent : ${pts.size} position(s) distincte(s)`)
      }
    }
    if (!multiples) e4.push('le jeu d\'essai ne place deux agents dans aucune salle : l\'étalement ne se juge pas')
    s.juger('DC-4', e4, `${groupes.size} groupes (salle, porte ou poste) dont ${multiples} de plusieurs agents : positions distinctes et dans la salle, un agent seul exactement à son poste`)
  }

  if (repos) {
    const e7 = []
    if (repos.imm.frames.length !== 1) e7.push(`avec le décor de l'atlas la boucle de Phaser ne s'endort pas : ${repos.imm.frames.length} numéros d'image différents relevés en 3 s au repos (${repos.imm.frames.slice(0, 4).join(', ')}…)`)
    if (repos.imm.textures.length !== 1) e7.push(`la texture du décor change au repos (${repos.imm.textures.length} versions en 3 s)`)
    if (!repos.geo) e7.push('aucune zone [data-antenne]')
    else if (Math.abs(repos.geo.cx - 200) > 3 || Math.abs(repos.geo.cy - 25) > 3) e7.push(`la zone de l'antenne est centrée en ${repos.geo.cx.toFixed(1)},${repos.geo.cy.toFixed(1)}, la tête de l'antenne de l'atlas est en 200,25`)
    s.juger('DC-7', e7, `au repos : la boucle de Phaser reste sur l'image ${repos.imm.frames[0]} pendant 3 s et la texture du décor ne change pas ; la zone de l'antenne est centrée en ${repos.geo?.cx.toFixed(1)},${repos.geo?.cy.toFixed(1)} (tête de l'antenne de l'atlas : 200,25)`)
  }

  // ── Le portrait, thème « station » : le décor de l'atlas et les noms courts ───────────────────────────────────────────────
  try {
    const Q = await ouvrir('station', { viewport: { width: 390, height: 844 }, telephone: true })
    try {
      const m = await mesure(Q, 'station', false)
      const noms = await Q.page.evaluate(() => {
        const toile = document.querySelector('[data-station-carte] canvas').getBoundingClientRect()
        const vis = (n) => { const r = n.getBoundingClientRect(), c = getComputedStyle(n); return r.width > 0 && r.height > 0 && c.display !== 'none' && c.visibility !== 'hidden' }
        const courts = [...document.querySelectorAll('[data-station-carte] [data-nom-court]')]
        const visibles = courts.filter(vis)
        return {
          total: courts.length, visibles: visibles.length, vides: visibles.filter((n) => !n.textContent.trim()).length,
          bas: visibles.filter((n) => n.getBoundingClientRect().height < 9).length,
          dehors: visibles.filter((n) => { const r = n.getBoundingClientRect(); return r.left < toile.left - 1 || r.right > toile.right + 1 || r.top < toile.top - 1 || r.bottom > toile.bottom + 1 }).length,
          plaques: [...document.querySelectorAll('[data-station-carte] [data-plaque]')].filter(vis).length,
          exemples: visibles.slice(0, 4).map((n) => n.textContent),
        }
      })
      const e5 = []
      if (!(m.caseCommandement >= 0.9)) e5.push(`au portrait la case du Commandement ne vient pas de l'atlas (${(100 * (m.caseCommandement ?? 0)).toFixed(0)} % de pixels identiques, 90 % attendus)`)
      if (m.W !== 288 || m.H !== 576) e5.push(`la texture « decor » du portrait fait ${m.W} × ${m.H}, 288 × 576 attendu`)
      if (noms.visibles < 20) e5.push(`${noms.visibles} nom(s) court(s) visible(s) au téléphone en vue d'ensemble (20 attendus, un par salle ; ${noms.total} posés)`)
      if (noms.vides) e5.push(`${noms.vides} nom(s) court(s) vide(s)`)
      if (noms.bas) e5.push(`${noms.bas} nom(s) court(s) de moins de 9 px de haut (illisibles)`)
      if (noms.dehors) e5.push(`${noms.dehors} nom(s) court(s) hors du canevas`)
      if (noms.plaques) e5.push(`${noms.plaques} plaque(s) [data-plaque] visible(s) en vue d'ensemble : elles n'apparaissent qu'à partir du zoom ×2 (CE-24), le nom court les remplace`)
      s.juger('DC-5', e5, `au portrait : les cases viennent de l'atlas (${(100 * (m.caseCommandement ?? 0)).toFixed(0)} %), ${noms.visibles} noms courts visibles et lisibles dans le canevas (${noms.exemples.join(', ')}…), aucune plaque entière en vue d'ensemble`)
    } finally { await Q.fermer() }
  } catch (e) { s.echoue('DC-5', `la page du téléphone ne se mesure pas : ${premiereLigne(e)}`) }

  // ── Un autre thème : le repli en code ────────────────────────────────────────────────────────────────────────────────────
  try {
    const V = await ouvrir('vaisseau')
    try {
      const m = await mesure(V, 'vaisseau', true)
      const sl = await lireSalles(V.page, themes.vaisseau.emplacements.filter((e) => !e.reservee).map(boite))
      const teinte = Object.fromEntries(themes.vaisseau.emplacements.map((e) => [e.cle, e.teinte.toLowerCase()]))
      const e6 = []
      if (m.tout < 40) e6.push(`${m.tout} couleurs dans le décor du Vaisseau (40 au moins)`)
      for (const x of sl) {
        if (x.lisere !== teinte[x.cle]) e6.push(`${x.cle} : liseré ${x.lisere}, ${teinte[x.cle]} attendu`)
        if (x.dominante > 0.85 || x.couleurs < 5) e6.push(`${x.cle} : case pauvre (${x.couleurs} couleurs, ${(100 * x.dominante).toFixed(0)} % d'une seule)`)
      }
      s.juger('DC-6', e6, `Vaisseau (sans atlas lu) : ${m.tout} couleurs, ${sl.length} salles à leur liseré, aucune n'est un aplat`)
    } finally { await V.fermer() }
  } catch (e) { s.echoue('DC-6', `la page du Vaisseau ne se mesure pas : ${premiereLigne(e)}`) }
  void jusqua; void attendre
}

try { await mesurer() } catch (e) { toutRouge(`interrompu : ${premiereLigne(e)}`) } finally { await nettoyer() }
const code = s.finir()
process.exitCode = code
setTimeout(() => process.exit(process.exitCode), 4000).unref()
