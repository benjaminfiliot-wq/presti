// Les plans de la vidéo : chaque fonction rend le HTML d'un plan (une `section.clip`) et pousse ses
// tweens GSAP dans ctx.js. Tout est déterministe (positions tirées d'un générateur à graine, aucun
// Math.random), toutes les coordonnées sont en pixels d'une image 1080 × 1920.
//
// Zone sûre TikTok respectée partout pour ce qui compte (texte, produit, appel) :
//   rien d'important au-dessus de y = 120, en dessous de y = 1700, ni à droite de x = 900.

export const ZONE = { gauche: 60, droite: 900, haut: 140, bas: 1690 }
const JAUNE = '#FFC400'

const n3 = (x) => Math.round(x * 1000) / 1000
const J = (x) => JSON.stringify(x)
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Générateur pseudo-aléatoire à graine (même ligne → même vidéo). */
export function graine(texte) {
  let h = 2166136261
  for (const c of String(texte)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 }
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296 }
}

/** Découpe une phrase en mots ; la ponctuation haute française reste collée au mot (espace insécable). */
export function mots(texte) {
  return String(texte).replace(/\s+([?!:;»])/g, ' $1').replace(/([«])\s+/g, '$1 ').trim().split(/[ \t\r\n]+/).filter(Boolean) // pas \s : il couperait l'insécable
}

/** Taille de police qui fait tenir des mots Anton majuscules dans `largeur` sur `lignesMax` lignes. */
function ajuster(listeMots, { max, min = 64, largeur = 840, lignesMax = 3, pad = 0, ecart = 26, interligne = 1.12, hauteurMax = Infinity }) {
  const larg = (m, t) => m.length * t * 0.5 + pad
  for (let t = max; t >= min; t -= 4) {
    if (listeMots.some((m) => larg(m, t) > largeur)) continue
    let lignes = 1, x = 0
    for (const m of listeMots) {
      const w = larg(m, t)
      if (x > 0 && x + ecart + w > largeur) { lignes++; x = w } else x += (x > 0 ? ecart : 0) + w
    }
    if (lignes <= lignesMax && lignes * t * interligne <= hauteurMax) return { taille: t, lignes }
  }
  return { taille: min, lignes: lignesMax }
}

// ───────────────────────────── Sous-titres et rubans ─────────────────────────────

/** Instant d'apparition du mot k : celui où la voix le dit (motsT, un peu avant), sinon réparti dans le plan. */
const instant = (motsT, k, t0, defaut) => (motsT && motsT[k] != null ? n3(Math.max(t0 + 0.02, motsT[k] - 0.04)) : defaut)

/** Sous-titres mot à mot : chaque mot apparaît quand la voix le dit, le mot « dit » passe en jaune. */
function sousTitres(ctx, id, texte, t0, d, { top = 1290, max = 112, hauteurMax = 400, motsT } = {}) {
  const liste = mots(texte)
  if (!liste.length) return ''
  const { taille } = ajuster(liste, { max, hauteurMax })
  const pas = Math.min(0.2, (d * 0.6) / liste.length)
  let html = `<div class="sous" id="${id}" style="top:${top}px">`
  liste.forEach((m, k) => {
    html += `<span class="mot" id="${id}-${k}" style="font-size:${taille}px">${esc(m)}</span>`
    const t = instant(motsT, k, t0, n3(t0 + 0.04 + k * pas))
    ctx.js.push(`tl.fromTo("#${id}-${k}", { opacity: 0, scale: 0.45, y: 34 }, { opacity: 1, scale: 1, y: 0, duration: 0.14, ease: "back.out(2.6)" }, ${t});`)
    ctx.js.push(`tl.set("#${id}-${k}", { color: "${JAUNE}" }, ${t});`)
    if (k > 0) ctx.js.push(`tl.set("#${id}-${k - 1}", { color: "#ffffff" }, ${t});`)
  })
  return html + '</div>'
}

/** Ruban d'accroche : des étiquettes de chantier, plein écran. */
function ruban(ctx, id, texte, t0, { top, hauteur, max = 190, pas = 0.12, styles, motsT } = {}) {
  const liste = mots(texte)
  const { taille } = ajuster(liste, { max, pad: 52, ecart: 18, lignesMax: 4, interligne: 1.22, hauteurMax: hauteur, largeur: 840 })
  let html = `<div class="ruban" id="${id}" style="top:${top}px;height:${hauteur}px">`
  liste.forEach((m, k) => {
    const st = styles ? styles[k % styles.length] : (k === liste.length - 1 ? 'n' : ['', 'b'][k % 2])
    html += `<span class="eti ${st}" id="${id}-${k}" style="font-size:${taille}px">${esc(m)}</span>`
    const rot = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.2][k % 6]
    ctx.js.push(`tl.fromTo("#${id}-${k}", { opacity: 0, scale: 1.9, rotation: ${rot * 4} }, { opacity: 1, scale: 1, rotation: ${rot}, duration: 0.16, ease: "power4.out" }, ${instant(motsT, k, t0, n3(t0 + 0.02 + k * pas))});`)
  })
  return html + '</div>'
}

// ───────────────────────────── Produit détouré ─────────────────────────────

/** Place une image dans une boîte (centre cx, cy ; largeur/hauteur max) ; renvoie la géométrie affichée. */
function placer(img, cx, cy, lmax, hmax) {
  const s = Math.min(lmax / img.largeur, hmax / img.hauteur)
  const l = Math.round(img.largeur * s), h = Math.round(img.hauteur * s)
  return { s, l, h, x: Math.round(cx - l / 2), y: Math.round(cy - h / 2) }
}
/** Variété de pose sans retoucher la photo : le produit vu en miroir autour de l'axe de la zone sûre. */
function miroir(oui, html) {
  return oui ? `<div class="abs" style="left:0;top:0;width:960px;height:1920px;transform:scaleX(-1)">${html}</div>` : html
}
function imgDecoupe(P, id, img, g, extra = '') {
  return `<img class="decoupe${img.fondu ? ' fondu' : ''}" id="${id}" src="${img.fichier}" alt="" data-start="${P.t0}" data-duration="${P.d}" style="left:${g.x}px;top:${g.y}px;width:${g.l}px;height:${g.h}px;${extra}" />`
}

/** Lignes de mots géants en contour qui défilent derrière le produit (parallaxe). */
function fondMots(ctx, P, texte) {
  const t = (String(texte || 'BRICO TRAVAUX').toUpperCase() + ' · ').repeat(4)
  let html = '<div class="fond-mots">'
  for (let k = 0; k < 6; k++) {
    html += `<div class="ligne" id="${P.id}-fm${k}" style="top:${-40 + k * 330}px">${esc(t)}</div>`
    const [a, b] = k % 2 ? [-420, -120] : [-120, -420]
    ctx.js.push(`tl.fromTo("#${P.id}-fm${k}", { x: ${a} }, { x: ${b}, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  }
  return html + '</div>'
}

// ───────────────────────────── Scènes dessinées ─────────────────────────────

/** Tapis de sol et miettes. mode "chute" (accroche) ou "aspire" (avant/après avec l'aspirateur). */
function sceneMiettes(ctx, P, { mode, outil, t, d }) {
  const r = graine(P.id + 'mie')
  let html = '<div class="sc-habitacle"></div><div class="tapis"></div>'
  const bande = mode === 'aspire' ? { y0: 760, y1: 1180 } : { y0: 680, y1: 1820 }
  const n = mode === 'aspire' ? 70 : 78
  const miettes = []
  for (let k = 0; k < n; k++) {
    const w = Math.round(22 + r() * 30), x = Math.round(100 + r() * 860), y = Math.round(bande.y0 + r() * (bande.y1 - bande.y0))
    miettes.push({ x, y, w })
    html += `<i class="mie" id="${P.id}-m${k}" style="left:${x}px;top:${y}px;width:${w}px;height:${Math.round(w * 0.8)}px"></i>`
  }
  if (mode === 'chute') {
    miettes.forEach((m, k) => ctx.js.push(`tl.fromTo("#${P.id}-m${k}", { y: ${-900 - Math.round(r() * 900)}, rotation: 0 }, { y: 0, rotation: ${Math.round(120 + r() * 300)}, duration: ${n3(0.45 + r() * 0.35)}, ease: "bounce.out" }, ${n3(t + r() * 0.55)});`))
    return html
  }
  // L'aspirateur traverse de droite à gauche, le bec sur la ligne y = 970 ; les miettes croisées filent dans le bec.
  const g = placer(outil, 0, 0, 780, 640)
  const [bx, by] = outil.bec || [0.08, 0.95]
  const becX = bx * g.l, becY = by * g.h
  const yBec = 1000, X0 = 1120, X1 = 470 // s'arrête au milieu : sale à gauche, propre à droite
  html += `<div class="abs" id="${P.id}-asp" style="left:${Math.round(-becX)}px;top:${Math.round(yBec - becY)}px;width:${g.l}px;height:${g.h}px;z-index:10">`
  html += `<img class="decoupe" id="${P.id}-aspi" src="${outil.fichier}" alt="" data-start="${P.t0}" data-duration="${P.d}" style="left:0;top:0;width:${g.l}px;height:${g.h}px" /></div>`
  html += `<div class="separateur" id="${P.id}-sep" style="left:-5px;top:700px;height:520px"></div>`
  html += `<span class="tag avant" id="${P.id}-ta" style="left:120px;top:560px">Avant</span><span class="tag apres" id="${P.id}-tp" style="left:600px;top:560px">Après</span>`
  const duree = d * 0.7
  ctx.js.push(`tl.fromTo("#${P.id}-asp", { x: ${X0}, rotation: -4 }, { x: ${X1}, rotation: 3, duration: ${n3(duree)}, ease: "none" }, ${n3(t)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-sep", { x: ${X0} }, { x: ${X1}, duration: ${n3(duree)}, ease: "none" }, ${n3(t)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-ta", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.16, ease: "power3.out" }, ${n3(t + 0.05)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-tp", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.16, ease: "power3.out" }, ${n3(t + duree * 0.45)});`)
  ctx.js.push(`tl.to("#${P.id}-asp", { rotation: -2, y: -14, duration: ${n3(Math.max(0.15, d - duree - 0.05))}, ease: "sine.inOut" }, ${n3(t + duree + 0.02)});`)
  miettes.forEach((m, k) => {
    const cx = m.x + m.w / 2
    const f = Math.max(0, (X0 - cx) / (X0 - X1))
    if (f > 1) return // à gauche de l'arrêt : la miette reste (côté « avant »)
    const ta = t + duree * f - 0.03
    const xBec = X0 + (X1 - X0) * Math.min(1, f + 0.1 / duree)
    ctx.js.push(`tl.to("#${P.id}-m${k}", { x: ${Math.round(xBec - cx)}, y: ${Math.round(yBec - (m.y + m.w * 0.4))}, scale: 0.15, opacity: 0, duration: 0.12, ease: "power2.in" }, ${n3(Math.max(t, ta))});`)
  })
  return html
}

/** Dalles de terrasse : couche propre dessous, couche sale dessus, découverte par le jet. */
function dallesHTML(P, sale) {
  const r = graine(P.id + (sale ? 'sale' : 'propre'))
  let h = `<div class="dalles ${sale ? 'sale' : 'propre'}" id="${P.id}-${sale ? 'ds' : 'dp'}">`
  for (let k = 0; k < 20; k++) {
    if (!sale) { h += '<i></i>'; continue }
    // Pierre encrassée : voile brun en coulure, quelques taches sombres, une plaque de lichen.
    const a = Math.round(r() * 360)
    const t1 = `radial-gradient(circle at ${Math.round(r() * 100)}% ${Math.round(r() * 100)}%, rgba(28,26,16,0.75) 0 ${Math.round(6 + r() * 14)}px, rgba(28,26,16,0) ${Math.round(26 + r() * 30)}px)`
    const t2 = `radial-gradient(circle at ${Math.round(r() * 100)}% ${Math.round(r() * 100)}%, rgba(28,26,16,0.6) 0 ${Math.round(4 + r() * 10)}px, rgba(28,26,16,0) ${Math.round(20 + r() * 20)}px)`
    const lichen = `radial-gradient(ellipse at ${Math.round(r() * 100)}% ${Math.round(r() * 100)}%, rgba(92,104,44,0.55) 0 ${Math.round(10 + r() * 20)}px, rgba(92,104,44,0) ${Math.round(50 + r() * 40)}px)`
    const voile = `linear-gradient(${a}deg, rgba(45,40,26,0.55), rgba(45,40,26,0.1) 55%, rgba(45,40,26,0.45))`
    h += `<i style="background:${t1},${t2},${lichen},${voile},#7A735E"></i>`
  }
  return h + '</div>'
}

/**
 * Le jet d'eau qui balaie l'écran de droite à gauche jusqu'à X1, puis reste en place jusqu'à la fin du plan
 * (l'écran reste partagé : sale à gauche, propre à droite). L'impact avance linéairement en x.
 */
function balayageJet(ctx, P, { t, d, X0 = 1000, X1 = 520, Sx = 1250, Sy = -560, L = 1950, fin }) {
  const id = `${P.id}-jet`
  const r = graine(id)
  let gouttes = ''
  for (let k = 0; k < 12; k++) gouttes += `<i class="goutte" id="${id}-d${k}" style="left:${Math.round(150 + (r() - 0.5) * 120)}px;top:${Math.round(110 + (r() - 0.5) * 60)}px;width:${Math.round(8 + r() * 12)}px;height:${Math.round(8 + r() * 12)}px"></i>`
  const html = `<div class="jet" id="${id}" style="left:${Sx - 110}px;top:${Sy}px;height:${L}px"><div class="cone"></div><div class="coeur"></div><div class="gerbe" id="${id}-g">${gouttes}</div></div>`
  const K = 8, deg = (X) => (Math.asin((Sx - X) / L) * 180) / Math.PI
  ctx.js.push(`tl.fromTo("#${id}", { opacity: 0, rotation: ${n3(deg(X0))} }, { opacity: 1, rotation: ${n3(deg(X0))}, duration: 0.06, ease: "none" }, ${n3(t - 0.06)});`)
  for (let k = 0; k < K; k++) {
    const Xb = X0 + ((X1 - X0) * (k + 1)) / K
    ctx.js.push(`tl.to("#${id}", { rotation: ${n3(deg(Xb))}, duration: ${n3(d / K)}, ease: "none" }, ${n3(t + (d * k) / K)});`)
  }
  const reste = Math.max(0.2, (fin ?? t + d) - t)
  ctx.js.push(`tl.fromTo("#${id}-g", { scale: 0.85 }, { scale: 1.12, duration: 0.07, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(1, Math.floor(reste / 0.07))} }, ${n3(t)});`)
  for (let k = 0; k < 12; k++) {
    const dx = Math.round((r() - 0.5) * 300), dy = Math.round(-60 - r() * 160)
    ctx.js.push(`tl.fromTo("#${id}-d${k}", { x: 0, y: 0, opacity: 1 }, { x: ${dx}, y: ${dy}, opacity: 0, duration: 0.28, ease: "power2.out", repeat: ${Math.max(1, Math.floor(reste / 0.28))} }, ${n3(t + (k % 4) * 0.07)});`)
  }
  return { html, tA: (x) => t + d * Math.min(1, Math.max(0, (X0 - x) / (X0 - X1))) }
}

function tagsAvantApres(ctx, P, top, tAvant, tApres) {
  ctx.js.push(`tl.fromTo("#${P.id}-ta", { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.16, ease: "power3.out" }, ${n3(tAvant)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-tp", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.16, ease: "power3.out" }, ${n3(tApres)});`)
  return `<span class="tag avant" id="${P.id}-ta" style="left:120px;top:${top}px">Avant</span><span class="tag apres" id="${P.id}-tp" style="left:600px;top:${top}px">Après</span>`
}

function sceneTerrasse(ctx, P, { t, d, fin, tags = true }) {
  let html = '<div class="sc-jardin"></div>' + dallesHTML(P, false) + dallesHTML(P, true)
  const X0 = 1040, X1 = 520
  const jet = balayageJet(ctx, P, { t, d, X0, X1, Sy: -470, fin })
  html += jet.html
  // La couche sale ne reste visible qu'à gauche de l'impact : ce qui est derrière le jet est propre.
  const R = (X) => n3(((1120 - (X + 20)) / 1120) * 100)
  ctx.js.push(`tl.fromTo("#${P.id}-ds", { clipPath: "inset(0% ${R(X0 + 60)}% 0% 0%)" }, { clipPath: "inset(0% ${R(X1)}% 0% 0%)", duration: ${n3(d)}, ease: "none" }, ${n3(t)});`)
  if (tags) html += tagsAvantApres(ctx, P, 1520, t, jet.tA(760))
  return html
}

/** Vélo dessiné couvert de boue ; le jet fait sauter chaque paquet quand il passe dessus. */
function sceneVelo(ctx, P, { t, d, fin }) {
  const r = graine(P.id + 'velo')
  const ox = 40, oy = 820 // origine du dessin (1000 × 640)
  const R = (a, b, c, e) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${e}" />`
  const roue = (cx, cy) => {
    let s = `<circle cx="${cx}" cy="${cy}" r="190" fill="none" stroke="#1A1A1A" stroke-width="30" /><circle cx="${cx}" cy="${cy}" r="164" fill="none" stroke="#A0A0A0" stroke-width="7" />`
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; s += `<line x1="${cx}" y1="${cy}" x2="${n3(cx + 160 * Math.cos(a))}" y2="${n3(cy + 160 * Math.sin(a))}" stroke="#8A8A8A" stroke-width="3" />` }
    return s + `<circle cx="${cx}" cy="${cy}" r="18" fill="#333" />`
  }
  let html = '<div class="sc-garage"></div>'
  html += `<svg class="abs" style="left:${ox}px;top:${oy}px" width="1000" height="640" viewBox="0 0 1000 640">${roue(220, 430)}${roue(780, 430)}`
  html += `<g stroke="#C62828" stroke-width="24" stroke-linecap="round">${R(220, 430, 470, 440)}${R(220, 430, 420, 210)}${R(470, 440, 420, 210)}${R(420, 210, 700, 200)}${R(470, 440, 712, 280)}${R(700, 200, 712, 280)}${R(712, 280, 780, 430)}</g>`
  html += `<g stroke="#1A1A1A" stroke-width="22" stroke-linecap="round">${R(420, 210, 405, 170)}${R(360, 165, 470, 165)}${R(700, 200, 690, 140)}${R(660, 140, 770, 150)}</g><circle cx="470" cy="440" r="34" fill="#2A2A2A" /></svg>`
  // Paquets de boue sur les pneus et le cadre.
  const points = []
  for (let k = 0; k < 28; k++) { const a = r() * Math.PI * 2, c = k % 2 ? 780 : 220; points.push([c + 186 * Math.cos(a), 430 + 186 * Math.sin(a)]) }
  const segs = [[220, 430, 470, 440], [470, 440, 712, 280], [712, 280, 780, 430], [220, 430, 420, 210], [420, 210, 700, 200]]
  for (let k = 0; k < 22; k++) { const s = segs[k % segs.length], u = r(); points.push([s[0] + (s[2] - s[0]) * u, s[1] + (s[3] - s[1]) * u]) }
  for (let k = 0; k < 14; k++) points.push([40 + r() * 920, 600 + r() * 34])
  const X1 = 520
  const jet = balayageJet(ctx, P, { t, d, X0: 1040, X1, Sy: -640, L: 2000, fin })
  points.forEach(([x, y], k) => {
    const w = Math.round(30 + r() * 42), X = Math.round(ox + x - w / 2), Y = Math.round(oy + y - w / 2)
    html += `<i class="abs" id="${P.id}-b${k}" style="left:${X}px;top:${Y}px;width:${w}px;height:${Math.round(w * 0.82)}px;border-radius:${40 + Math.round(r() * 20)}% ${60 - Math.round(r() * 20)}% ${45 + Math.round(r() * 15)}% ${55 - Math.round(r() * 15)}%;background:#5E3D1E;box-shadow:inset 6px 6px 0 rgba(150,105,60,0.55),inset -5px -5px 0 rgba(35,22,10,0.6);z-index:5"></i>`
    if (X + w / 2 < X1) return // côté « avant » : la boue reste
    const ta = jet.tA(X + w / 2)
    ctx.js.push(`tl.to("#${P.id}-b${k}", { x: ${-Math.round(80 + r() * 160)}, y: ${Math.round(-200 + r() * 260)}, rotation: ${Math.round(-200 + r() * 400)}, scale: 0.3, opacity: 0, duration: 0.3, ease: "power2.out" }, ${n3(ta)});`)
  })
  html += jet.html
  html += tagsAvantApres(ctx, P, 1540, t, jet.tA(760))
  return html
}

/** Boîte à gants dessinée ; l'aspirateur en sort au deuxième temps. */
function sceneBoite(ctx, P, { outil, t1, d2 }) {
  const g = placer(outil, 540, 0, 560, 460)
  let html = '<div class="sc-tableau"></div><div class="bg-fond" id="' + P.id + '-bf"></div>'
  html += `<img class="decoupe" id="${P.id}-asp" src="${outil.fichier}" alt="" data-start="${P.t0}" data-duration="${P.d}" style="left:${g.x}px;top:1150px;width:${g.l}px;height:${g.h}px;z-index:2" />`
  html += `<div class="bg-face" id="${P.id}-bx"><span class="poignee"></span></div><div class="bg-couvercle" id="${P.id}-cv"></div>`
  ctx.js.push(`tl.fromTo(["#${P.id}-bx", "#${P.id}-cv"], { rotation: -1.5 }, { rotation: 1.5, duration: 0.09, ease: "sine.inOut", yoyo: true, repeat: 5 }, ${n3(P.t0 + 0.3)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-cv", { scaleY: 1 }, { scaleY: 0.04, duration: 0.18, ease: "power3.in" }, ${n3(t1)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-asp", { y: 0, rotation: 8 }, { y: -340, rotation: -6, duration: 0.42, ease: "back.out(1.7)" }, ${n3(t1 + 0.1)});`)
  ctx.js.push(`tl.to("#${P.id}-asp", { y: -370, rotation: -2, duration: ${n3(Math.max(0.2, d2 - 0.55))}, ease: "sine.inOut" }, ${n3(t1 + 0.52)});`)
  return html
}

// ───────────────────────────── Les plans ─────────────────────────────

function section(P, contenu, fond = '#111') {
  return `      <section class="clip" id="${P.id}" data-start="${P.t0}" data-duration="${P.d}" data-track-index="${P.i % 2}">
        <div class="plan" id="${P.id}-w" style="background:${fond}">${contenu}</div>
      </section>`
}

/** 1. Accroche : deux temps sur la même scène (le 2ᵉ est un coup de caméra sur le temps fort). */
export function accroche(ctx, P) {
  const [p1, p2] = P.parties, t1 = n3(P.t0 + P.d1)
  let scene = ''
  const cam = `${P.id}-cam`
  if (P.scene === 'miettes') scene = sceneMiettes(ctx, P, { mode: 'chute', t: P.t0 })
  else if (P.scene === 'terrasse') scene = sceneTerrasse(ctx, P, { t: n3(t1 + 0.05), d: n3(P.d2 * 0.55), fin: P.t0 + P.d })
  else if (P.scene === 'velo') scene = sceneVelo(ctx, P, { t: n3(t1 + 0.05), d: n3(P.d2 * 0.55), fin: P.t0 + P.d })
  else if (P.scene === 'boite-a-gants') scene = sceneBoite(ctx, P, { outil: ctx.img(P.outil), t1, d2: P.d2 })
  else throw new Error(`scène d'accroche inconnue : ${P.scene} (miettes, terrasse, velo, boite-a-gants)`)
  const haut = P.scene === 'boite-a-gants' ? { top: 150, hauteur: 620 } : { top: 170, hauteur: 900 }
  let html = `<div class="cam" id="${cam}">${scene}</div>`
  html += ruban(ctx, `${P.id}-r1`, p1, P.t0, { ...haut, max: 190, pas: Math.min(0.15, (P.d1 * 0.55) / Math.max(1, mots(p1).length)), motsT: P.motsT1 })
  html += ruban(ctx, `${P.id}-r2`, p2, t1, { ...haut, max: 210, pas: Math.min(0.14, (P.d2 * 0.4) / Math.max(1, mots(p2).length)), motsT: P.motsT2 })
  ctx.js.push(`tl.fromTo("#${cam}", { scale: 1.0 }, { scale: 1.07, duration: ${P.d1}, ease: "none" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${cam}", { scale: 1.08 }, { scale: 1.13, duration: ${P.d2}, ease: "none", immediateRender: false }, ${t1});`)
  ctx.js.push(`tl.set("#${P.id}-r1", { opacity: 0 }, ${t1});`)
  ctx.js.push(`tl.fromTo("#flash", { opacity: 0.55 }, { opacity: 0, duration: 0.14, ease: "power2.out", immediateRender: false }, ${t1});`)
  return section(P, html)
}

/** 2. Produit détouré sur fond de mots géants en parallaxe. */
export function produit(ctx, P) {
  const img = ctx.img(P.image)
  const sombre = P.fond === 'sombre'
  const g = placer(img, 480, 790, 860, 780)
  let html = `<div class="cam ${sombre ? 'sombre' : ''}" id="${P.id}-cam">${fondMots(ctx, P, P.motFond)}`
  html += `<div class="ombre-sol" id="${P.id}-os" style="left:${g.x + g.l * 0.1}px;top:${g.y + g.h - 40}px;width:${g.l * 0.8}px;height:110px"></div>`
  html += miroir(P.miroir, imgDecoupe(P, `${P.id}-p`, img, g)) + '</div>'
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT })
  ctx.js.push(`tl.fromTo("#${P.id}-p", { y: 760, rotation: -28, scale: 0.55 }, { y: 0, rotation: -5, scale: 1, duration: 0.3, ease: "power4.out" }, ${P.t0});`)
  ctx.js.push(`tl.to("#${P.id}-p", { y: -26, rotation: 3, scale: 1.05, duration: ${n3(P.d - 0.32)}, ease: "sine.inOut" }, ${n3(P.t0 + 0.32)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-os", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }, ${P.t0});`)
  return section(P, html, sombre ? '#141414' : JAUNE)
}

/** 3. Photo réelle : cadre net (Ken Burns vers le point d'intérêt) sur son double flou (parallaxe). */
export function photo(ctx, P) {
  const img = ctx.img(P.image)
  const [fx, fy] = img.focale || [50, 50]
  const top = 120, h = 1120
  let html = `<img class="flou" id="${P.id}-f" src="${img.fichier}" alt="" />`
  html += `<div class="cadre" style="top:${top}px;height:${h}px"><img id="${P.id}-n" src="${img.fichier}" alt="" data-start="${P.t0}" data-duration="${P.d}" style="object-position:${fx}% ${fy}%;transform-origin:${fx}% ${fy}%" /></div>`
  html += `<div class="degrade" style="top:${top + h - 300}px"></div>`
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT })
  const m = P.mouvement || 'zoom'
  if (m === 'panoramique') {
    // Vrai panoramique dans une photo large : on fait glisser le cadrage (object-position), sans agrandir.
    const g0 = Math.max(0, fx - 28), g1 = Math.min(100, fx + 28)
    ctx.js.push(`tl.fromTo("#${P.id}-n", { objectPosition: "${g0}% ${fy}%", scale: 1.02 }, { objectPosition: "${g1}% ${fy}%", scale: 1.09, duration: ${P.d}, ease: "sine.inOut" }, ${P.t0});`)
    ctx.js.push(`tl.fromTo("#${P.id}-f", { scale: 1.12, x: 40 }, { scale: 1.0, x: -40, duration: ${P.d}, ease: "none" }, ${P.t0});`)
    return section(P, html)
  }
  const de =m === 'recul' ? { scale: 1.2, x: 0 } : m === 'gauche' ? { scale: 1.14, x: 50 } : m === 'droite' ? { scale: 1.14, x: -50 } : { scale: 1.03, x: 0 }
  const a = m === 'recul' ? { scale: 1.04, x: 0 } : m === 'gauche' ? { scale: 1.14, x: -50 } : m === 'droite' ? { scale: 1.14, x: 50 } : { scale: 1.17, x: 0 }
  ctx.js.push(`tl.fromTo("#${P.id}-n", ${J(de)}, { ...${J(a)}, duration: ${P.d}, ease: "sine.out" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${P.id}-f", { scale: 1.12, x: ${-de.x / 2} }, { scale: 1.0, x: ${-a.x / 2}, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  return section(P, html)
}

/** 4. Loupe sur un détail RÉEL du produit (point donné en pixels de la photo source). */
export function loupe(ctx, P) {
  const img = ctx.img(P.image)
  const pt = ctx.point(P.image, P.point)
  const g = placer(img, 450, 820, 800, 760)
  const px = g.x + pt[0] * g.s, py = g.y + pt[1] * g.s
  const D = 460, Ri = (D - 28) / 2, z = P.zoom || 2.6
  const choix = [[680, 370], [280, 370], [680, 1010], [280, 1010]].map(([x, y]) => ({ x, y, dist: Math.hypot(x - px, y - py) }))
  const L = choix.filter((c) => c.dist > 330).sort((a, b) => a.dist - b.dist)[0] || choix.sort((a, b) => b.dist - a.dist)[0]
  const ang = (Math.atan2(L.y - py, L.x - px) * 180) / Math.PI
  const dist = Math.hypot(L.x - px, L.y - py)
  const ux = (L.x - px) / dist, uy = (L.y - py) / dist
  const fond = `background:#151515 radial-gradient(circle, rgba(255,196,0,0.16) 6px, rgba(255,196,0,0) 7.5px) 0 0/72px 72px`
  let html = `<div class="cam" id="${P.id}-cam">`
  html += img.decoupe ? imgDecoupe(P, `${P.id}-p`, img, g) : `<img id="${P.id}-p" src="${img.fichier}" alt="" data-start="${P.t0}" data-duration="${P.d}" style="position:absolute;left:${g.x}px;top:${g.y}px;width:${g.l}px;height:${g.h}px" />`
  html += `<div class="anneau" id="${P.id}-an" style="left:${Math.round(px - 90)}px;top:${Math.round(py - 90)}px;width:180px;height:180px"></div>`
  html += `<div class="trait" id="${P.id}-tr" style="left:${Math.round(px + ux * 90)}px;top:${Math.round(py + uy * 90 - 5)}px;width:${Math.round(dist - 90 - D / 2)}px"></div>`
  html += `<div class="loupe" id="${P.id}-lp" style="left:${L.x - D / 2}px;top:${L.y - D / 2}px;width:${D}px;height:${D}px">`
  html += `<img id="${P.id}-li" src="${img.fichier}" alt="" style="width:${Math.round(g.l * z)}px;height:${Math.round(g.h * z)}px;left:${Math.round(Ri - pt[0] * g.s * z)}px;top:${Math.round(Ri - pt[1] * g.s * z)}px" /></div></div>`
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT })
  ctx.js.push(`tl.fromTo("#${P.id}-p", { x: -520, rotation: -10 }, { x: 0, rotation: 0, duration: 0.24, ease: "power4.out" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${P.id}-an", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "back.out(2.4)" }, ${n3(P.t0 + 0.22)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-tr", { rotation: ${n3(ang)}, scaleX: 0 }, { rotation: ${n3(ang)}, scaleX: 1, duration: 0.14, ease: "power2.out" }, ${n3(P.t0 + 0.34)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-lp", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(1.9)" }, ${n3(P.t0 + 0.44)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-li", { scale: 1, x: 0 }, { scale: 1.12, x: -16, duration: ${n3(Math.max(0.3, P.d - 0.44))}, ease: "sine.inOut" }, ${n3(P.t0 + 0.44)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-cam", { scale: 1 }, { scale: 1.06, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  return section(P, html, '#151515').replace('style="background:#151515"', `style="${fond}"`)
}

/** 5. Avant / après : le geste d'usage sur une scène dessinée (le produit, lui, est la vraie photo). */
export function avantApres(ctx, P) {
  let scene
  if (P.scene === 'miettes') scene = sceneMiettes(ctx, P, { mode: 'aspire', outil: ctx.img(P.outil), t: n3(P.t0 + 0.04), d: P.d })
  else if (P.scene === 'terrasse') scene = sceneTerrasse(ctx, P, { t: n3(P.t0 + 0.06), d: n3(P.d * 0.6), fin: P.t0 + P.d })
  else if (P.scene === 'velo') scene = sceneVelo(ctx, P, { t: n3(P.t0 + 0.06), d: n3(P.d * 0.6), fin: P.t0 + P.d })
  else throw new Error(`scène avant/après inconnue : ${P.scene} (miettes, terrasse, velo)`)
  let html = `<div class="cam" id="${P.id}-cam">${scene}</div>`
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { top: P.scene === 'miettes' ? 1300 : 200, motsT: P.motsT })
  ctx.js.push(`tl.fromTo("#${P.id}-cam", { scale: 1.0 }, { scale: 1.05, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  return section(P, html)
}

/** 6. Bénéfice : le produit flotte au-dessus de bandes de chantier qui défilent. */
export function benefice(ctx, P) {
  const img = ctx.img(P.image)
  const clair = P.variante === 1
  // 1er temps : gros plan (le produit déborde du cadre, en miroir) ; 2e temps : le produit entier.
  const g = clair ? placer(img, 480, 700, 820, 700) : placer(img, 470, 690, 1180, 900)
  let html = `<div class="cam" id="${P.id}-cam">`
  html += `<div class="bande" id="${P.id}-b1" style="top:520px"></div><div class="bande" id="${P.id}-b2" style="top:930px;opacity:0.9"></div>`
  html += miroir(!clair, imgDecoupe(P, `${P.id}-p`, img, g)) + '</div>'
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { max: 124, motsT: P.motsT })
  ctx.js.push(`tl.fromTo("#${P.id}-b1", { rotation: -11, x: -160 }, { rotation: -11, x: 140, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${P.id}-b2", { rotation: 8, x: 140 }, { rotation: 8, x: -160, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${P.id}-p", { scale: ${clair ? 1.25 : 0.7}, rotation: ${clair ? 6 : -14}, y: ${clair ? 0 : 120} }, { scale: 1, rotation: ${clair ? -3 : 2}, y: 0, duration: 0.26, ease: "power4.out" }, ${P.t0});`)
  ctx.js.push(`tl.to("#${P.id}-p", { y: -22, rotation: ${clair ? 1 : -2}, duration: ${n3(P.d - 0.28)}, ease: "sine.inOut" }, ${n3(P.t0 + 0.28)});`)
  return section(P, html, clair ? JAUNE : '#121212')
}

/** 7. Appel final, en deux plans : « lien dans la bio » puis le tampon de la marque. */
export function appel(ctx, P) {
  const img = ctx.img(P.image)
  if (P.variante === 0) {
    const g = placer(img, 480, 500, 700, 560)
    let html = `<div class="cam" id="${P.id}-cam">` + fondMots(ctx, P, P.motFond) + imgDecoupe(P, `${P.id}-p`, img, g) + '</div>'
    html += ruban(ctx, `${P.id}-r`, P.texte, n3(P.t0 + 0.1), { top: 900, hauteur: 700, max: 180, pas: 0.12, styles: ['', '', '', 'n'], motsT: P.motsT })
    ctx.js.push(`tl.fromTo("#${P.id}-p", { rotation: -200, scale: 0.2 }, { rotation: -4, scale: 1, duration: 0.34, ease: "back.out(1.5)" }, ${P.t0});`)
    ctx.js.push(`tl.to("#${P.id}-p", { rotation: 2, y: -18, duration: ${n3(P.d - 0.36)}, ease: "sine.inOut" }, ${n3(P.t0 + 0.36)});`)
    return section(P, html, '#141414').replace('<div class="cam"', '<div class="cam sombre"')
  }
  const g = placer(img, 480, 1500, 440, 300)
  let html = `<div class="cam" id="${P.id}-cam">` + fondMots(ctx, P, P.marque) + imgDecoupe(P, `${P.id}-p`, img, g) + '</div>'
  html += ruban(ctx, `${P.id}-r`, P.texte, P.t0, { top: 230, hauteur: 900, max: 210, pas: 0.07, styles: ['n'] })
  html += `<p class="tampon" id="${P.id}-tp" style="left:480px;top:1170px">${esc(String(P.marque).toUpperCase())}</p>`
  ctx.js.push(`tl.fromTo("#${P.id}-tp", { xPercent: -50, rotation: -5, scale: 2.4, opacity: 0 }, { xPercent: -50, rotation: -5, scale: 1, opacity: 1, duration: 0.2, ease: "power4.in" }, ${n3(P.t0 + 0.42)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-r", { scale: 1 }, { scale: 1.05, duration: ${n3(60 / ctx.bpm)}, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(1, Math.floor(P.d / (60 / ctx.bpm)) - 1)} }, ${n3(P.t0 + 0.4)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-p", { y: 300 }, { y: 0, duration: 0.3, ease: "power3.out" }, ${n3(P.t0 + 0.55)});`)
  return section(P, html, JAUNE)
}

// ───────────────────────────── Transitions motivées ─────────────────────────────

/** Entrée du plan `P` et sortie du plan précédent `Q`, centrées sur la coupe (calée sur un temps). */
export function transition(ctx, Q, P) {
  const a = `#${Q.id}-w`, b = `#${P.id}-w`, t = P.t0
  switch (P.entree) {
    case 'balaye': case 'balaye-g': {
      const s = P.entree === 'balaye' ? 1 : -1
      ctx.js.push(`tl.to("${a}", { x: ${-s * 460}, filter: "blur(16px)", duration: 0.1, ease: "power2.in" }, ${n3(t - 0.1)});`)
      ctx.js.push(`tl.fromTo("${b}", { x: ${s * 460}, filter: "blur(16px)" }, { x: 0, filter: "blur(0px)", duration: 0.17, ease: "power3.out" }, ${t});`)
      break
    }
    case 'zoom':
      ctx.js.push(`tl.to("${a}", { scale: 1.55, filter: "blur(14px)", duration: 0.12, ease: "power2.in" }, ${n3(t - 0.12)});`)
      ctx.js.push(`tl.fromTo("${b}", { scale: 1.4, filter: "blur(12px)" }, { scale: 1, filter: "blur(0px)", duration: 0.2, ease: "power3.out" }, ${t});`)
      break
    case 'monte':
      ctx.js.push(`tl.to("${a}", { y: -520, filter: "blur(14px)", duration: 0.1, ease: "power2.in" }, ${n3(t - 0.1)});`)
      ctx.js.push(`tl.fromTo("${b}", { y: 700, filter: "blur(14px)" }, { y: 0, filter: "blur(0px)", duration: 0.18, ease: "power3.out" }, ${t});`)
      break
    case 'flash':
      ctx.js.push(`tl.fromTo("#flash", { opacity: 0.85 }, { opacity: 0, duration: 0.16, ease: "power2.out", immediateRender: false }, ${t});`)
      ctx.js.push(`tl.fromTo("${b}", { scale: 1.1 }, { scale: 1, duration: 0.24, ease: "power3.out" }, ${t});`)
      break
    default: // « coupe » : coupe franche avec un coup de poing d'échelle
      ctx.js.push(`tl.fromTo("${b}", { scale: 1.16 }, { scale: 1, duration: 0.2, ease: "power3.out" }, ${t});`)
  }
}

export const CONSTRUCTEURS = { accroche, produit, photo, loupe, 'avant-apres': avantApres, benefice, appel }
