// scripts/fixtures/026-pilotage/e/juge-carte.mjs — les parties `camera`, `themes` et `webkit` du juge d'écran (lot e, fiche 026-172, écrit par Claude Code).
//   camera  CE-9 (échelle entière, zoom ×1 à ×3, ⊞, glissé borné, croix, cadre blanc), CE-10 (survol, main, étiquette à pointe, hublot en polygone, teintes),
//           CE-11 (vingt zones et la réservée `[data-station-carte] [data-zone-salle]` posées sur la carte, elementFromPoint, ?salle= sans changer de page)
//   themes  CE-17 (le thème livré chargé : canevas = grille × k, ses vingt emplacements et la réservée posés ; captures bureau-<clé>.jpg et telephone-<clé>.jpg)
//   webkit  CE-24 (sous WebKit à 390×844 : pas de défilement horizontal, cadre de 358 px en vue d'ensemble, feuilles, touch-action, gesturestart, boutons de 44 px,
//           plaques à partir de ×2, TouchEvent synthétiques ; le pincement ne se prouve pas : Playwright 1.63 n'offre que tap(x, y))
// Les sélecteurs sont ceux de CONTRAT.md : `data-zoom`, `data-vue-x/y`, `data-vue` sur [data-station-carte] ; `[data-action="zoom-avant|zoom-arriere|vue-ensemble"]` ;
// `[data-zone-salle]` (data-teinte, data-survol, data-selectionnee) ; `[data-etiquette]` et son `[data-pointe]`.
import path from 'node:path'
import { nouvellePage, attendrePrete, attendreCalme, attendre, jusqua, pool, premiereLigne, court, lancerWebkit } from './commun.mjs'
import { base } from './jeux.mjs'

async function ouvrir(ctx, o = {}) {
  const P = await nouvellePage(ctx, { reponses: o.reponses ?? base(), ...o })
  await P.aller()
  if (o.telephone) await P.page.locator('[data-onglet-tel="station"]').click({ timeout: 30_000 })
  const raison = await attendrePrete(P, { personnages: o.personnages ?? true })
  if (raison) { await P.fermer(); throw new Error(raison) }
  return P
}
const etatCarte = (page) => page.evaluate(() => { const c = document.querySelector('[data-station-carte]'); return c ? { zoom: c.dataset.zoom ?? null, x: c.dataset.vueX ?? null, y: c.dataset.vueY ?? null, vue: c.dataset.vue ?? null } : null })
const toile = (page) => page.evaluate(() => { const t = document.querySelector('[data-station-carte] canvas'); const r = t.getBoundingClientRect(); return { w: t.width, h: t.height, cssW: r.width, cssH: r.height, x: r.x, y: r.y, dpr: window.devicePixelRatio } })
const zoneBoite = (page, cle) => page.evaluate((c) => { const z = document.querySelector(`[data-station-carte] [data-zone-salle="${c}"]`); if (!z) return null; const r = z.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, n: document.querySelectorAll(`[data-station-carte] [data-zone-salle="${c}"]`).length } }, cle)
const salleUrl = (page) => new URL(page.url()).searchParams.get('salle')
async function fermerSalle(page) {
  await page.keyboard.press('Escape')
  if (await jusqua(async () => !salleUrl(page), { delai: 2500, pas: 100 })) return
  await page.evaluate(() => { const u = new URL(location.href); u.searchParams.delete('salle'); history.replaceState(null, '', u) })
  await jusqua(async () => !salleUrl(page), { delai: 2500, pas: 100 })
}
const attendreZoom = (page, v) => jusqua(async () => (await etatCarte(page))?.zoom === String(v), { delai: 3000, pas: 80 })
const dessin = async (P) => { await attendreCalme(P, { ms: 400, delai: 8000 }) }

// ── camera ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function scCamera(ctx) {
  const P = await ouvrir(ctx), { page } = P, g = ctx.theme.grille, r = {}
  try {
    await dessin(P)
    const t = await toile(page)
    r.k = t.w / g.largeur; r.kEntier = Number.isInteger(r.k) && r.k >= 1; r.cssOk = Math.abs(t.cssW - t.w / t.dpr) <= 1
    r.depart = await etatCarte(page)
    const cx = t.x + t.cssW / 2, cy = t.y + t.cssH / 2
    await page.mouse.move(cx, cy)
    const suite = []
    for (const dy of [-120, -120, -120, 120, 120, 120]) { await page.mouse.wheel(0, dy); await attendre(250); suite.push((await etatCarte(page))?.zoom) }
    r.molette = suite
    await attendreZoom(page, 1)
    await page.locator('[data-action="zoom-avant"]').click(); await attendre(250); r.plus = (await etatCarte(page))?.zoom
    await page.locator('[data-action="zoom-avant"]').click(); await attendre(250)
    await page.locator('[data-action="zoom-arriere"]').click(); await attendre(250); r.moins = (await etatCarte(page))?.zoom
    await page.locator('[data-action="zoom-avant"]').click(); await attendre(250)
    await page.locator('[data-action="vue-ensemble"]').click(); await attendre(300); r.ensemble = await etatCarte(page)
    // le glissé, borné
    await page.locator('[data-action="zoom-avant"]').click(); await attendre(250)
    const glisser = async (dx, dy, n) => { for (let i = 0; i < n; i++) { await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx / 2, cy + dy / 2, { steps: 3 }); await page.mouse.move(cx + dx, cy + dy, { steps: 3 }); await page.mouse.up(); await attendre(40) } }
    await glisser(-300, -300, 24); r.glisse1 = await etatCarte(page)
    await glisser(-300, -300, 6); r.glisse2 = await etatCarte(page)
    await glisser(300, 300, 36); r.glisse3 = await etatCarte(page)
    await glisser(300, 300, 6); r.glisse4 = await etatCarte(page)
    await page.locator('[data-action="vue-ensemble"]').click(); await attendre(300)
    // la croix sur le vide, la main sur une zone
    r.vide = await page.evaluate(() => {
      const c = document.querySelector('[data-station-carte] canvas').getBoundingClientRect(), zones = [...document.querySelectorAll('[data-station-carte] [data-zone-salle]')].map((z) => z.getBoundingClientRect()), ui = [...document.querySelectorAll('[data-camera],[data-etiquette]')].map((z) => z.getBoundingClientRect())
      const dans = (b, x, y) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
      for (let y = c.top + 3; y < c.bottom - 3; y += 6) for (let x = c.left + 3; x < c.right - 3; x += 6) if (![...zones, ...ui].some((b) => dans(b, x, y))) {
        const e = document.elementFromPoint(x, y)
        return { x, y, curseur: e ? getComputedStyle(e).cursor : null, balise: e?.tagName ?? null }
      }
      return null
    })
    // le survol d'une zone
    const zb = await zoneBoite(page, 'radar')
    if (zb) {
      await page.mouse.move(zb.x + zb.w / 2, zb.y + zb.h / 2); await attendre(300)
      r.survol = await page.evaluate(() => {
        const z = document.querySelector('[data-station-carte] [data-zone-salle="radar"]'), e = document.querySelector('[data-etiquette]'), cadre = z.getBoundingClientRect()
        const sous = document.elementFromPoint(cadre.x + cadre.width / 2, cadre.y + cadre.height / 2)
        const visible = !!e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0
        return { survol: z.dataset.survol ?? null, curseur: sous ? getComputedStyle(sous).cursor : null, etiquette: visible, texte: e ? e.textContent : null, pointe: !!e?.querySelector('[data-pointe]') }
      })
    }
    r.hublot = await page.evaluate(() => { const z = document.querySelector('[data-station-carte] [data-zone-salle="reunion"]'); const radar = document.querySelector('[data-station-carte] [data-zone-salle="radar"]'); return z ? { reunion: getComputedStyle(z).clipPath, radar: radar ? getComputedStyle(radar).clipPath : null } : null })
    r.teintes = await page.evaluate(() => [...document.querySelectorAll('[data-station-carte] [data-zone-salle]')].map((z) => [z.dataset.zoneSalle, z.dataset.teinte ?? ''] ))
    // la salle choisie, encadrée de blanc
    if (zb) {
      await page.mouse.move(zb.x + zb.w / 2, zb.y + zb.h / 2); await page.mouse.down(); await page.mouse.up()
      r.choisie = await jusqua(async () => salleUrl(page) === 'radar', { delai: 4000, pas: 100 })
      await attendre(300)
      r.cadre = await page.evaluate(() => {
        const z = document.querySelector('[data-station-carte] [data-zone-salle="radar"]')
        const blanc = (e) => { const s = getComputedStyle(e); const b = (c, w, st) => c === 'rgb(255, 255, 255)' && parseFloat(w) > 0 && st !== 'none'; return b(s.outlineColor, s.outlineWidth, s.outlineStyle) || b(s.borderTopColor, s.borderTopWidth, s.borderTopStyle) || /rgb\(255, 255, 255\)/.test(s.boxShadow) }
        const e = [z, ...z.querySelectorAll('*')].find(blanc)
        const autres = [...document.querySelectorAll('[data-station-carte] [data-zone-salle]')].filter((o) => o !== z && blanc(o)).length
        return { choisie: z.dataset.selectionnee ?? null, blanc: !!e, autres }
      })
      await fermerSalle(page)
    }
    r.erreurs = P.erreurs
    return r
  } finally { await P.fermer() }
}
async function scEchelle2(ctx) {
  const P = await ouvrir(ctx, { dpr: 2 })
  try { await dessin(P); const t = await toile(P.page); return { k: t.w / ctx.theme.grille.largeur, cssOk: Math.abs(t.cssW - t.w / t.dpr) <= 1 } } finally { await P.fermer() }
}
async function zonesPosees(page, theme) {
  const e = []
  const t = await toile(page)
  for (const emp of theme.emplacements) {
    const z = await zoneBoite(page, emp.cle)
    if (!z) { e.push(`la zone [data-zone-salle="${emp.cle}"] n'existe pas sous [data-station-carte]`); continue }
    if (z.n !== 1) { e.push(`${z.n} zones pour ${emp.cle}, 1 attendue`); continue }
    const cx = z.x + z.w / 2, cy = z.y + z.h / 2
    if (cx < t.x || cx > t.x + t.cssW || cy < t.y || cy > t.y + t.cssH) { e.push(`le centre de la zone ${emp.cle} (${Math.round(cx)},${Math.round(cy)}) est hors du canevas`); continue }
    const ok = await page.evaluate(([x, y, c]) => { const el = document.elementFromPoint(x, y); return !!el && !!el.closest(`[data-zone-salle="${c}"]`) }, [cx, cy, emp.cle])
    if (!ok) e.push(`elementFromPoint au centre de la zone ${emp.cle} ne rend pas la zone`)
  }
  return e
}
async function scZones(ctx) {
  const P = await ouvrir(ctx), { page } = P
  try {
    await dessin(P)
    await page.evaluate(() => { window.__marqueur = 'intact' })
    const echecs = await zonesPosees(page, ctx.theme), clics = []
    for (const emp of ctx.theme.emplacements) {
      const z = await zoneBoite(page, emp.cle)
      if (!z) { clics.push(`${emp.cle} : zone absente`); continue }
      await page.mouse.move(z.x + z.w / 2, z.y + z.h / 2); await page.mouse.down(); await page.mouse.up()
      const ok = await jusqua(async () => salleUrl(page) === emp.cle, { delai: 4000, pas: 100 })
      if (!ok) clics.push(`un clic sur ${emp.cle} ne pose pas ?salle=${emp.cle} (${salleUrl(page) ?? 'rien'})`)
      if (!(await page.evaluate(() => window.__marqueur === 'intact'))) { clics.push(`un clic sur ${emp.cle} a changé de page`); break }
      await fermerSalle(page)
    }
    return { echecs, clics, listeIgnoree: await page.locator('[data-station-carte] [data-zone-salle]').count() }
  } finally { await P.fermer() }
}

// ── themes ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function scTheme(ctx, cle) {
  const theme = ctx.themesLus[cle], r = base({ hublot: false })
  r.themes = { [cle]: theme }
  r.reglages.reglages.theme = cle
  const out = { cle, echecs: [] }
  const P = await ouvrir(ctx, { reponses: r })
  try {
    await dessin(P)
    const t = await toile(P.page), k = t.w / theme.grille.largeur
    if (!Number.isInteger(k) || k < 1) out.echecs.push(`thème ${cle} : canevas ${t.w} px pour une grille de ${theme.grille.largeur}, k = ${k} (entier ≥ 1 attendu)`)
    out.k = k
    out.echecs.push(...(await zonesPosees(P.page, theme)).map((x) => `thème ${cle} : ${x}`))
    if (ctx.captures) out.bureau = await ctx.captures(P.page, `bureau-${cle}.jpg`, { largeur: 1440, hauteur: 900 })
  } finally { await P.fermer() }
  const Q = await ouvrir(ctx, { reponses: ((x) => { x.themes = { [cle]: theme }; x.reglages.reglages.theme = cle; return x })(base({ hublot: false })), viewport: { width: 390, height: 844 }, telephone: true })
  try { await dessin(Q); if (ctx.captures) out.telephone = await ctx.captures(Q.page, `telephone-${cle}.jpg`, { largeur: 390, hauteur: 844 }) } finally { await Q.fermer() }
  return out
}

// ── webkit ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function scWebkit(ctx) {
  const nav = await lancerWebkit()
  const sortie = { echecs: [], notes: [] }
  try {
    const c2 = { ...ctx, nav }
    const P = await nouvellePage(c2, { viewport: { width: 390, height: 844 }, dpr: 3, mobile: true, reponses: base() })
    try {
      await P.aller()
      await P.page.locator('[data-onglet-tel="station"]').click({ timeout: 30_000 })
      const raison = await attendrePrete(P)
      if (raison) { sortie.echecs.push(raison); return sortie }
      await attendre(800)
      const e = sortie.echecs
      const m = await P.page.evaluate(() => {
        const cadre = document.querySelector('[data-station-carte]'), r = cadre.getBoundingClientRect(), bouton = (a) => { const b = document.querySelector(`[data-action="${a}"]`)?.getBoundingClientRect(); return b ? [Math.round(b.width), Math.round(b.height)] : null }
        const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
        const evt = (type, cancelable = true) => { const ev = new Event(type, { bubbles: true, cancelable }); return cadre.dispatchEvent(ev) === false }
        let touch = null
        try { const t = new Touch({ identifier: 1, target: cadre, clientX: r.x + 40, clientY: r.y + 40 }); const ev = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [t], targetTouches: [t], changedTouches: [t] }); touch = cadre.dispatchEvent(ev) === false } catch { touch = evt('touchmove') }
        const cs = getComputedStyle(cadre), toile = document.querySelector('[data-station-carte] canvas'), cst = toile ? getComputedStyle(toile) : null
        return { sw, larg: r.width, vue: cadre.dataset.vue ?? null, zoom: cadre.dataset.zoom ?? null, touchAction: cs.touchAction, touchActionToile: cst?.touchAction ?? null, gesture: evt('gesturestart'), touchPrevenu: touch, plus: bouton('zoom-avant'), moins: bouton('zoom-arriere'), ensemble: bouton('vue-ensemble'), scrollY: window.scrollY }
      })
      if (m.sw > 390) e.push(`scrollWidth ${m.sw} px, 390 au plus`)
      if (Math.abs(m.larg - 358) > 1.5) e.push(`le cadre de la carte fait ${m.larg.toFixed(1)} px de large, 358 attendus`)
      if (m.vue !== 'ensemble' || m.zoom !== '1') e.push(`la carte ne s'ouvre pas en vue d'ensemble (data-vue ${m.vue}, data-zoom ${m.zoom})`)
      if (m.touchAction !== 'none' && m.touchActionToile !== 'none') e.push(`touch-action « ${m.touchAction} » sur le cadre, none attendu`)
      if (!m.gesture) e.push('gesturestart n\'est pas bloqué dans le cadre (preventDefault attendu)')
      for (const [nom, b] of [['+', m.plus], ['−', m.moins], ['⊞', m.ensemble]]) if (!b || b[0] < 44 || b[1] < 44) e.push(`le bouton ${nom} fait ${b ? `${b[0]}×${b[1]}` : 'rien (absent)'} px, 44×44 au moins`)
      if (!m.touchPrevenu) e.push('un touchmove envoyé au cadre n\'est pas bloqué (la page défilerait)')
      const plaques = (z) => P.page.evaluate(() => [...document.querySelectorAll('[data-station-carte] [data-plaque]')].filter((p) => { const r = p.getBoundingClientRect(), s = getComputedStyle(p); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' }).length)
      const p1 = await plaques(1)
      if (p1) e.push(`${p1} plaque(s) visible(s) en vue d'ensemble : elles n'apparaissent qu'à partir du zoom ×2`)
      await P.page.locator('[data-action="zoom-avant"]').tap(); await attendre(500)
      const z2 = (await etatCarte(P.page))?.zoom
      if (z2 !== '2') e.push(`+ (tap) : data-zoom « ${z2} », 2 attendu`)
      else if (!(await plaques(2))) e.push('aucune plaque visible au zoom ×2')
      // La capture se prend ici : la carte zoomée, ses plaques allumées (et non la feuille d'une salle, plein écran, presque vide).
      if (ctx.captures) sortie.capture = await ctx.captures(P.page, 'telephone-webkit.jpg', { largeur: 390, hauteur: 844 })
      await P.page.locator('[data-action="vue-ensemble"]').tap(); await attendre(400)
      // les feuilles : un tap sur une salle de la liste ouvre un panneau, sans défilement horizontal
      await P.page.locator('[data-liste-salles] [data-salle="recettes"]').scrollIntoViewIfNeeded()
      await P.page.locator('[data-liste-salles] [data-salle="recettes"]').tap()
      const feuille = await jusqua(async () => P.page.evaluate(() => { const f = document.querySelector('[data-salle-panneau],[data-salle-agents]'); if (!f) return null; const r = f.getBoundingClientRect(); return { l: r.width } }), { delai: 6000, pas: 150 })
      if (!feuille) e.push('un tap sur une salle de la liste n\'ouvre aucune feuille')
      const sw2 = await P.page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
      if (sw2 > 390) e.push(`feuille ouverte : scrollWidth ${sw2} px, 390 au plus`)
      sortie.notes.push(`WebKit 390×844 : scrollWidth ${m.sw}, cadre ${m.larg.toFixed(0)} px, vue d'ensemble, touch-action ${m.touchAction}, gesturestart et touchmove bloqués, boutons ${m.plus?.join('×')}, plaques à partir de ×2, feuille ouverte`)
    } finally { await P.fermer() }
  } finally { try { await nav.close() } catch { /* fermé */ } }
  return sortie
}

// ── les critères ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function ce9(c, c2) {
  const e = []
  if (!c.kEntier) e.push(`échelle ${c.k} : canevas = grille × k, k entier ≥ 1 attendu`)
  if (!c.cssOk) e.push('la taille CSS du canevas n\'est pas sa taille ÷ devicePixelRatio')
  if (!c2.interrompu && (!Number.isInteger(c2.k) || !c2.cssOk)) e.push(`à la densité 2 : k = ${c2.k}${c2.cssOk ? '' : ', taille CSS fausse'}`)
  if (c.depart?.zoom == null) e.push('aucun data-zoom sur [data-station-carte] (CONTRAT.md)')
  const attendu = ['2', '3', '3', '2', '1', '1']
  if (JSON.stringify(c.molette) !== JSON.stringify(attendu)) e.push(`molette (haut ×3 puis bas ×3) : zoom ${c.molette.join('→')}, ${attendu.join('→')} attendu (×1 à ×3, borné)`)
  if (c.plus !== '2') e.push(`bouton + : zoom ${c.plus}, 2 attendu`)
  if (c.moins !== '2') e.push(`+, + puis − : zoom ${c.moins}, 2 attendu`)
  if (c.ensemble?.zoom !== '1' || c.ensemble?.vue !== 'ensemble') e.push(`⊞ ne revient pas à la vue d'ensemble (data-zoom ${c.ensemble?.zoom}, data-vue ${c.ensemble?.vue})`)
  const g1 = c.glisse1, g2 = c.glisse2, g3 = c.glisse3, g4 = c.glisse4
  if (!g1 || g1.x == null) e.push('aucun data-vue-x/data-vue-y sur [data-station-carte] (CONTRAT.md)')
  else {
    if (g1.x !== g2.x || g1.y !== g2.y) e.push(`le glissé n'est pas borné : ${g1.x},${g1.y} puis ${g2.x},${g2.y} après d'autres glissés dans le même sens`)
    if (g3.x !== g4.x || g3.y !== g4.y) e.push(`le glissé n'est pas borné de l'autre côté : ${g3.x},${g3.y} puis ${g4.x},${g4.y}`)
    if (g1.x === g3.x && g1.y === g3.y) e.push('le glissé ne déplace pas la vue')
    if (Math.abs(Number(g1.x)) > 4000 || Math.abs(Number(g3.x)) > 4000) e.push('la limite du glissé n\'est pas « dans la nébuleuse » (plus de 4000 pixels de grille)')
  }
  if (!c.vide) e.push('aucun point vide trouvé sur la carte (hors des zones)')
  else if (c.vide.curseur !== 'crosshair') e.push(`le curseur sur le vide est « ${c.vide.curseur} » (${c.vide.balise}), crosshair (une croix) attendu`)
  if (!c.choisie) e.push('un clic sur une zone ne pose pas ?salle=')
  else if (!c.cadre?.blanc || c.cadre.choisie !== 'oui') e.push(`la salle choisie n'est pas encadrée de blanc (data-selectionnee ${c.cadre?.choisie}, cadre blanc : ${c.cadre?.blanc ? 'oui' : 'non'})`)
  else if (c.cadre.autres) e.push(`${c.cadre.autres} autre(s) salle(s) encadrée(s) de blanc : une seule doit l'être`)
  return { echecs: e, detail: `échelle k = ${c.k} (entier, taille CSS = taille ÷ densité) ; molette ${c.molette.join('→')}, + et −, ⊞ revient à la vue d'ensemble ; glissé borné (${g1?.x},${g1?.y} / ${g3?.x},${g3?.y}) ; curseur « ${c.vide?.curseur} » sur le vide ; la salle choisie encadrée de blanc` }
}
function ce10(c) {
  const e = []
  const s = c.survol
  if (!s) e.push('la zone radar est introuvable pour le survol')
  else {
    if (s.survol !== 'oui') e.push(`la plaque ne s'allume pas au survol (data-survol « ${s.survol} »)`)
    if (s.curseur !== 'pointer') e.push(`le curseur sur une salle est « ${s.curseur} », pointer (une main) attendu`)
    if (!s.etiquette) e.push('aucune étiquette [data-etiquette] visible au survol')
    else if (!s.pointe) e.push('l\'étiquette n\'a pas de pointe ([data-pointe])')
    if (s.etiquette && !String(s.texte).includes('Radar')) e.push(`l'étiquette dit « ${court(s.texte, 40)} », le nom du Radar attendu`)
  }
  if (!c.hublot || !/^polygon\(/.test(c.hublot.reunion)) e.push(`le hublot de la salle de réunion n'est pas une zone en polygone (clip-path « ${c.hublot?.reunion} »)`)
  else if (/^polygon\(/.test(c.hublot.radar ?? '')) e.push('une salle rectangulaire a un clip-path en polygone')
  const sans = c.teintes.filter(([, t]) => !t).map(([k]) => k)
  if (c.teintes.length !== 21) e.push(`${c.teintes.length} zones teintées, 21 attendues`)
  if (sans.length) e.push(`sans teinte en vue d'ensemble : ${sans.slice(0, 4).join(', ')}`)
  return { echecs: e, detail: 'survol : plaque allumée (data-survol), main, étiquette à pointe ; le hublot de la salle de réunion est un polygone ; chacune des 21 zones a sa teinte en vue d\'ensemble' }
}
function ce11(z) {
  const e = [...z.echecs, ...z.clics]
  if (z.listeIgnoree < 21) e.push(`${z.listeIgnoree} zone(s) [data-zone-salle] sous [data-station-carte], 21 attendues (la liste des salles et ses [data-salle] ne comptent pas)`)
  return { echecs: e, detail: 'vingt zones et la réservée sous [data-station-carte], leur centre dans le rectangle du canevas, elementFromPoint rend la zone, un clic pose ?salle=<clé> sans changer de page (la réservée comprise)' }
}

export async function critereCarte(ctx, demandes) {
  const sortie = {}, veut = (id) => demandes.includes(id)
  const sorties = {}, taches = []
  const lot = (cle, f) => taches.push(async () => { try { sorties[cle] = await f() } catch (err) { sorties[cle] = { interrompu: premiereLigne(err) } } })
  if (veut('CE-9') || veut('CE-10')) lot('camera', () => scCamera(ctx))
  if (veut('CE-9')) lot('echelle2', () => scEchelle2(ctx))
  if (veut('CE-11')) lot('zones', () => scZones(ctx))
  await pool(taches)
  const brut = (cle, f) => { const s = sorties[cle]; return !s || s.interrompu ? { echecs: [`scénario ${cle} interrompu : ${s?.interrompu ?? 'non joué'}`], detail: '' } : f(s) }
  if (veut('CE-9')) sortie['CE-9'] = brut('camera', (c) => ce9(c, sorties.echelle2 ?? { interrompu: true }))
  if (veut('CE-10')) sortie['CE-10'] = brut('camera', ce10)
  if (veut('CE-11')) sortie['CE-11'] = brut('zones', ce11)
  return sortie
}
export async function critereThemes(ctx) {
  if (!ctx.themes.length) return { 'CE-17': { echecs: ['aucun thème livré sous public/station/themes/ (un theme.json par thème attendu)'], detail: '' } }
  const e = [], details = []
  const rs = await pool(ctx.themes.map((cle) => () => scTheme(ctx, cle)), 2)
  for (const [i, r] of rs.entries()) {
    if (r.interrompu) { e.push(`thème ${ctx.themes[i]} interrompu : ${r.interrompu}`); continue }
    e.push(...r.echecs)
    for (const c of [r.bureau, r.telephone]) if (c?.echecs) e.push(...c.echecs)
    details.push(`${r.cle} : canevas = grille × ${r.k}, 21 zones posées${r.bureau ? `, ${path.basename(r.bureau.fichier)}, ${path.basename(r.telephone?.fichier ?? '')}` : ''}`)
  }
  return { 'CE-17': { echecs: e, detail: details.join(' ; ') } }
}
export async function critereWebkit(ctx) {
  let s
  try { s = await scWebkit(ctx) } catch (err) { if (/WebKit introuvable/.test(premiereLigne(err))) { const x = new Error(premiereLigne(err)); x.prealable = true; throw x } return { 'CE-24': { echecs: [`interrompu : ${premiereLigne(err)}`], detail: '' } } }
  return { 'CE-24': { echecs: [...s.echecs, ...(s.capture?.echecs ?? [])], detail: s.notes.join(' ; ') } }
}
