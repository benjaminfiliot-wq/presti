// Style « keynote » de la chaîne TikTok (demande de Benj du 07/10, référence : une démo produit façon keynote).
// Procédés repris, à la charte Brico Travaux (noir / jaune), sans rien copier de la marque de la référence :
//   1. ouverture du produit : un point lumineux arrive, grossit et se MORPHE en produit (révélation en cercle), puis le
//      nom s'écrit lettre à lettre ;
//   2. transitions « whip » : glissé rapide avec FLOU DE MOUVEMENT directionnel (filtre SVG sur l'axe du mouvement),
//      et un éclair lumineux (bloom) sur certaines coupes ;
//   3. cartes en PERSPECTIVE 3D (rotationX/rotationY, profondeur, ombres portées) qui entrent en décalé et flottent ;
//   4. un trait de lumière DESSINE un arc puis devient la barre qui porte le texte du bénéfice ;
//   5. mouvement continu : chaque plan dérive (section(), P.derive) ;
//   6. clôture : une pilule BRICO TRAVAUX, des bulles en parallaxe et la phrase d'appel dessous.
// Tout passe par la timeline GSAP en pause (rendu déterministe, aucune horloge, aucun aléa sans graine).
import { CONSTRUCTEURS as CLASSIQUES, transition as transitionClassique, sousTitres, placer, imgDecoupe, section, esc, n3, graine, mots, ajuster, JAUNE, sceneMiettes, sceneTerrasse, sceneVelo, sceneBoite } from './plans.mjs'

// Pas de texte géant qui défile en fond (il se lisait tronqué : « EMUTS », « SANFIL ») : un fond sombre et une lueur.
const FOND = '<div class="fond-k"></div>'

// ───────────────────────────── 2. Whip : flou directionnel par filtre SVG ─────────────────────────────

/**
 * Une coupe « whip » : le plan sortant file sur l'axe, l'entrant arrive du côté opposé ; un filtre SVG propre à
 * cette coupe (feGaussianBlur « X 0 » ou « 0 Y ») monte jusqu'à la coupe puis retombe à zéro à l'arrêt.
 * Le filtre n'est posé sur les plans que pendant la fenêtre de la coupe (tl.set) : hors fenêtre, aucun flou possible.
 */
function whip(ctx, Q, P, axe = 'x', sens = 1) {
  const k = (ctx.whips = (ctx.whips || 0) + 1)
  const id = `whip${k}`, t = P.t0
  const a = `#${Q.id}-w`, b = `#${P.id}-w`
  const avant = 0.12, apres = 0.24, pic = 42
  ctx.defs.push(`<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur id="${id}-b" in="SourceGraphic" stdDeviation="0 0" /></filter>`)
  const ecrire = `() => document.getElementById("${id}-b").setAttribute("stdDeviation", ${axe === 'x' ? `w${k}.v + " 0"` : `"0 " + w${k}.v`})`
  ctx.js.push(`const w${k} = { v: 0 };`)
  ctx.js.push(`tl.set(["${a}", "${b}"], { filter: "url(#${id})" }, ${n3(t - avant)});`)
  ctx.js.push(`tl.fromTo(w${k}, { v: 0 }, { v: ${pic}, duration: ${avant}, ease: "power2.in", immediateRender: false, onUpdate: ${ecrire} }, ${n3(t - avant)});`)
  ctx.js.push(`tl.fromTo(w${k}, { v: ${pic} }, { v: 0, duration: ${apres}, ease: "expo.out", immediateRender: false, onUpdate: ${ecrire} }, ${t});`)
  ctx.js.push(`tl.set(["${a}", "${b}"], { filter: "none" }, ${n3(t + apres + 0.02)});`)
  const d = axe === 'x' ? 'x' : 'y'
  ctx.js.push(`tl.to("${a}", { ${d}: ${-sens * 760}, duration: ${avant}, ease: "power2.in" }, ${n3(t - avant)});`)
  ctx.js.push(`tl.fromTo("${b}", { ${d}: ${sens * 900} }, { ${d}: 0, duration: ${apres}, ease: "expo.out" }, ${t});`)
}

/** Éclair lumineux (bloom) sur une coupe : voile blanc + halo jaune, l'image entrante sort d'une surexposition. */
function bloom(ctx, P) {
  ctx.js.push(`tl.fromTo("#flash", { opacity: 0.9 }, { opacity: 0, duration: 0.22, ease: "power2.out", immediateRender: false }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#halo", { opacity: 0.85, scale: 0.6 }, { opacity: 0, scale: 1.6, duration: 0.4, ease: "power2.out", immediateRender: false }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${P.id}-w", { scale: 1.12 }, { scale: 1, duration: 0.3, ease: "power3.out" }, ${P.t0});`)
}

export function transition(ctx, Q, P) {
  switch (P.entree) {
    case 'balaye': return whip(ctx, Q, P, 'x', 1)
    case 'balaye-g': return whip(ctx, Q, P, 'x', -1)
    case 'monte': return whip(ctx, Q, P, 'y', 1)
    case 'coupe': return whip(ctx, Q, P, 'x', 1)
    case 'flash': return bloom(ctx, P)
    default: return transitionClassique(ctx, Q, P)
  }
}

// ───────────────────────────── 3. Cartes en perspective ─────────────────────────────

/** Entrée d'une carte en 3D (de biais et en profondeur → presque de face), puis flottement continu. */
function carte3D(ctx, sel, P, { retard = 0, de = { ry: 38, rx: 16, x: 340, z: -420 }, a = { ry: -9, rx: 7 }, fin = { ry: 7, rx: 3 } } = {}) {
  const t = n3(P.t0 + retard)
  ctx.js.push(`tl.fromTo("${sel}", { transformPerspective: 1500, rotationY: ${de.ry}, rotationX: ${de.rx}, x: ${de.x}, z: ${de.z}, opacity: 0 }, { transformPerspective: 1500, rotationY: ${a.ry}, rotationX: ${a.rx}, x: 0, z: 0, opacity: 1, duration: 0.5, ease: "expo.out" }, ${t});`)
  ctx.js.push(`tl.to("${sel}", { rotationY: ${fin.ry}, rotationX: ${fin.rx}, y: -22, duration: ${n3(Math.max(0.3, P.d - retard - 0.5))}, ease: "sine.inOut" }, ${n3(t + 0.5)});`)
}

/** Photo réelle en carte 3D sur son double flou, une seconde carte (autre cadrage) entre en décalé derrière. */
export function photo(ctx, P) {
  const img = ctx.img(P.image)
  const [fx, fy] = img.focale || [50, 50]
  let html = `<img class="flou" id="${P.id}-f" src="${img.fichier}" alt="" /><div class="voile"></div>`
  html += `<div class="carte carte-dos" id="${P.id}-c2" style="left:150px;top:230px;width:760px;height:900px"><img src="${img.fichier}" alt="" style="object-position:${Math.min(100, fx + 30)}% ${fy}%" /></div>`
  html += `<div class="carte" id="${P.id}-c1" style="left:70px;top:170px;width:820px;height:1000px"><img id="${P.id}-n" src="${img.fichier}" alt="" data-start="${P.t0}" data-duration="${P.d}" style="object-position:${fx}% ${fy}%;transform-origin:${fx}% ${fy}%" /><div class="reflet" id="${P.id}-rf"></div></div>`
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT })
  carte3D(ctx, `#${P.id}-c2`, P, { retard: 0.1, de: { ry: -30, rx: 14, x: -300, z: -600 }, a: { ry: 12, rx: 6 }, fin: { ry: 4, rx: 4 } })
  carte3D(ctx, `#${P.id}-c1`, P)
  const m = P.mouvement || 'zoom'
  const de = m === 'recul' ? 1.22 : 1.04, a = m === 'recul' ? 1.05 : 1.18
  const dx = m === 'gauche' ? [40, -40] : m === 'droite' ? [-40, 40] : m === 'panoramique' ? [60, -60] : [0, 0]
  ctx.js.push(`tl.fromTo("#${P.id}-n", { scale: ${de}, x: ${dx[0]} }, { scale: ${a}, x: ${dx[1]}, duration: ${P.d}, ease: "sine.out" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${P.id}-rf", { xPercent: -120 }, { xPercent: 160, duration: 0.9, ease: "power2.inOut" }, ${n3(P.t0 + 0.35)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-f", { scale: 1.15 }, { scale: 1.0, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  return section(P, html, '#0b0b0b')
}

// ───────────────────────────── 1. Point lumineux → produit, nom lettre à lettre ─────────────────────────────

/** Produit détouré : révélation par morph d'un point lumineux (plan de révélation), sinon posé sur une fiche 3D. */
export function produit(ctx, P) {
  const img = ctx.img(P.image)
  const sombre = P.fond === 'sombre' || P.revelation
  const g = placer(img, 480, 760, 820, 740)
  let html = `<div class="cam ${sombre ? 'sombre' : ''}" id="${P.id}-cam">${sombre ? FOND : ""}`
  if (P.revelation) {
    const cx = 480, cy = 760
    html += `<div class="lueur" id="${P.id}-lu" style="left:${cx - 520}px;top:${cy - 520}px;width:1040px;height:1040px"></div>`
    html += `<div class="revele" id="${P.id}-rv">${imgDecoupe(P, `${P.id}-p`, img, g)}</div>`
    html += `<div class="point" id="${P.id}-pt" style="left:${cx - 70}px;top:${cy - 70}px;width:140px;height:140px"></div></div>`
    // Le point arrive en comète du bas à gauche, se pose, grossit et s'ouvre en cercle sur le produit.
    ctx.js.push(`tl.fromTo("#${P.id}-pt", { scale: 2.4, opacity: 1 }, { scale: 2.0, opacity: 1, duration: 0.12, ease: "power3.out" }, ${P.t0});`)
    ctx.js.push(`tl.to("#${P.id}-pt", { scale: 9, opacity: 0, duration: 0.36, ease: "power2.in" }, ${n3(P.t0 + 0.12)});`)
    ctx.js.push(`tl.fromTo("#${P.id}-rv", { clipPath: "circle(0% at ${n3((cx / 1080) * 100)}% ${n3((cy / 1920) * 100)}%)" }, { clipPath: "circle(78% at ${n3((cx / 1080) * 100)}% ${n3((cy / 1920) * 100)}%)", duration: 0.45, ease: "power2.inOut" }, ${n3(P.t0 + 0.14)});`)
    ctx.js.push(`tl.fromTo("#${P.id}-lu", { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }, ${n3(P.t0 + 0.3)});`)
    ctx.js.push(`tl.fromTo("#${P.id}-p", { scale: 0.7, rotation: -12 }, { scale: 1, rotation: -4, duration: 0.6, ease: "expo.out" }, ${n3(P.t0 + 0.36)});`)
    ctx.js.push(`tl.to("#${P.id}-p", { y: -26, rotation: 2, scale: 1.04, duration: ${n3(Math.max(0.3, P.d - 0.96))}, ease: "sine.inOut" }, ${n3(P.t0 + 0.96)});`)
    ctx.js.push(`tl.fromTo("#flash", { opacity: 0.55 }, { opacity: 0, duration: 0.25, ease: "power2.out", immediateRender: false }, ${n3(P.t0 + 0.4)});`)
    html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT, lettres: true })
    return section(P, html, '#070707')
  }
  // Fiche produit : deux cartes en perspective, le produit flotte devant.
  html += `<div class="fiche fiche-dos" id="${P.id}-f2" style="left:170px;top:330px;width:700px;height:820px"></div>`
  html += `<div class="fiche" id="${P.id}-f1" style="left:90px;top:300px;width:800px;height:900px"></div>`
  html += `<div class="ombre-sol" id="${P.id}-os" style="left:${g.x + g.l * 0.1}px;top:${g.y + g.h - 40}px;width:${g.l * 0.8}px;height:110px"></div>`
  html += imgDecoupe(P, `${P.id}-p`, img, g) + '</div>'
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT })
  carte3D(ctx, `#${P.id}-f2`, P, { retard: 0.08, de: { ry: -40, rx: 20, x: -260, z: -500 }, a: { ry: 14, rx: 8 }, fin: { ry: 6, rx: 5 } })
  carte3D(ctx, `#${P.id}-f1`, P)
  ctx.js.push(`tl.fromTo("#${P.id}-p", { transformPerspective: 1200, rotationY: 40, x: 260, scale: 0.6, opacity: 0 }, { transformPerspective: 1200, rotationY: -6, x: 0, scale: 1, opacity: 1, duration: 0.5, ease: "expo.out" }, ${n3(P.t0 + 0.12)});`)
  ctx.js.push(`tl.to("#${P.id}-p", { rotationY: 8, y: -30, duration: ${n3(Math.max(0.3, P.d - 0.62))}, ease: "sine.inOut" }, ${n3(P.t0 + 0.62)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-os", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power3.out" }, ${n3(P.t0 + 0.12)});`)
  return section(P, html, sombre ? '#101010' : JAUNE)
}

// ───────────────────────────── 4. Trait de lumière → barre du bénéfice ─────────────────────────────

export function benefice(ctx, P) {
  if (P.variante !== 0) return CLASSIQUES.benefice(ctx, P)
  const img = ctx.img(P.image)
  const g = placer(img, 480, 700, 900, 760)
  let html = `<div class="cam sombre" id="${P.id}-cam"><div class="lueur" id="${P.id}-lu" style="left:-60px;top:180px;width:1080px;height:1080px"></div>`
  html += imgDecoupe(P, `${P.id}-p`, img, g) + '</div>'
  const liste = mots(P.texte)
  // La barre prend une ou deux lignes de texte, à taille lisible (pas de texte rétréci dans une barre trop courte).
  const { taille, lignes } = ajuster(liste, { max: 104, min: 80, lignesMax: 2, hauteurMax: 280 })
  const yBarre = 1250, hBarre = Math.round(lignes * taille * 1.12 + 40)
  // L'arc part de la gauche, monte et retombe sur la droite de la barre ; la barre naît de son extrémité.
  const chemin = `M 110 ${yBarre + 40} C 260 ${yBarre - 260}, 700 ${yBarre - 260}, 850 ${yBarre + 10}`
  html += `<svg class="abs trait-lumiere" style="left:0;top:0;width:1080px;height:1920px" viewBox="0 0 1080 1920"><path id="${P.id}-arc" d="${chemin}" pathLength="1000" fill="none" stroke="${JAUNE}" stroke-width="12" stroke-linecap="round" stroke-dasharray="1000" stroke-dashoffset="1000" /></svg>`
  html += `<div class="barre" id="${P.id}-ba" style="left:80px;top:${yBarre - 20}px;width:800px;height:${hBarre}px"></div>`
  html += sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT, top: yBarre - 2, max: 104, hauteurMax: 280 })
  ctx.js.push(`tl.fromTo("#${P.id}-arc", { strokeDashoffset: 1000, opacity: 1 }, { strokeDashoffset: 0, duration: 0.34, ease: "power2.inOut" }, ${n3(P.t0 + 0.02)});`)
  ctx.js.push(`tl.to("#${P.id}-arc", { opacity: 0, duration: 0.16, ease: "power1.out" }, ${n3(P.t0 + 0.36)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-ba", { scaleX: 0.02, scaleY: 0.12, transformOrigin: "96% 50%" }, { scaleX: 1, scaleY: 1, transformOrigin: "96% 50%", duration: 0.32, ease: "expo.out" }, ${n3(P.t0 + 0.3)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-p", { transformPerspective: 1300, rotationY: -30, scale: 1.2, x: -200 }, { rotationY: 6, scale: 1, x: 0, duration: 0.5, ease: "expo.out" }, ${P.t0});`)
  ctx.js.push(`tl.to("#${P.id}-p", { rotationY: -6, y: -24, duration: ${n3(Math.max(0.3, P.d - 0.5))}, ease: "sine.inOut" }, ${n3(P.t0 + 0.5)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-lu", { opacity: 0.3, scale: 0.8 }, { opacity: 0.9, scale: 1.1, duration: ${P.d}, ease: "sine.inOut" }, ${P.t0});`)
  void liste
  return section(P, html, '#080808')
}

// ───────────────────────────── 6. Clôture : pilule, bulles en parallaxe, slogan ─────────────────────────────

export function appel(ctx, P) {
  if (P.variante === 0) return CLASSIQUES.appel(ctx, P)
  const img = ctx.img(P.image)
  const r = graine(P.id + 'bulles')
  let html = `<div class="cam" id="${P.id}-cam"><div class="lueur" id="${P.id}-lu" style="left:-100px;top:420px;width:1160px;height:1160px"></div>`
  for (let k = 0; k < 16; k++) {
    const taille = Math.round(40 + r() * 220), x = Math.round(-60 + r() * 1100), y = Math.round(80 + r() * 1700)
    const prof = 0.4 + r() * 1.2 // parallaxe : les grosses bulles montent plus vite
    html += `<i class="bulle${k % 3 === 0 ? ' pleine' : ''}" id="${P.id}-b${k}" style="left:${x}px;top:${y}px;width:${taille}px;height:${taille}px"></i>`
    ctx.js.push(`tl.fromTo("#${P.id}-b${k}", { y: ${Math.round(120 * prof)}, scale: ${n3(0.6 + r() * 0.3)}, opacity: 0 }, { y: ${Math.round(-260 * prof)}, scale: 1, opacity: 1, duration: ${P.d}, ease: "power1.out" }, ${n3(P.t0 + (k % 5) * 0.04)});`)
  }
  const gi = placer(img, 480, 640, 420, 360)
  html += imgDecoupe(P, `${P.id}-p`, img, gi)
  html += `<div class="pilule" id="${P.id}-pl" style="top:900px"><span>${esc(String(P.marque).toUpperCase())}</span></div>`
  html += `<div class="ligne-lumiere" id="${P.id}-ll" style="top:1110px"></div>`
  html += '</div>' + sousTitres(ctx, `${P.id}-s`, P.texte, P.t0, P.d, { motsT: P.motsT, top: 1150, max: 104 }) // la phrase d'appel, dite et calée sur la voix
  ctx.js.push(`tl.fromTo("#${P.id}-pl", { scale: 0.2, opacity: 0, transformPerspective: 1200, rotationX: 50 }, { scale: 1, opacity: 1, rotationX: 0, duration: 0.5, ease: "back.out(1.6)" }, ${n3(P.t0 + 0.05)});`)
  ctx.js.push(`tl.to("#${P.id}-pl", { scale: 1.04, duration: ${n3(Math.max(0.3, P.d - 0.6))}, ease: "sine.inOut" }, ${n3(P.t0 + 0.56)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-ll", { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.out" }, ${n3(P.t0 + 0.3)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-p", { y: 140, opacity: 0, rotation: -8 }, { y: 0, opacity: 1, rotation: 0, duration: 0.45, ease: "expo.out" }, ${n3(P.t0 + 0.15)});`)
  ctx.js.push(`tl.to("#${P.id}-p", { y: -20, rotation: 3, duration: ${n3(Math.max(0.3, P.d - 0.6))}, ease: "sine.inOut" }, ${n3(P.t0 + 0.6)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-lu", { opacity: 0.4, scale: 0.7 }, { opacity: 1, scale: 1.1, duration: ${P.d}, ease: "sine.out" }, ${P.t0});`)
  return section(P, html, '#060606')
}

// ───────────────────────────── 1 bis. Ouverture : l'accroche autour de la comète, lisible dès la 1ʳᵉ image ─────────────────────────────

/** Étiquettes de l'accroche VISIBLES dès l'instant t0 (aucune entrée depuis l'invisible) ; le mot dit s'allume. */
function rubanVisible(ctx, id, texte, { top, hauteur, max, motsT, cache }) {
  const liste = mots(texte)
  const { taille } = ajuster(liste, { max, pad: 52, ecart: 18, lignesMax: 4, interligne: 1.22, hauteurMax: hauteur, largeur: 840 })
  let html = `<div class="ruban" id="${id}" style="top:${top}px;height:${hauteur}px">`
  liste.forEach((m, k) => {
    const rot = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.2][k % 6]
    html += `<span class="eti${k % 2 ? ' b' : ''}" id="${id}-${k}" style="font-size:${taille}px;transform:rotate(${rot}deg)">${esc(m)}</span>`
    if (motsT?.[k] != null) {
      const t = n3(Math.max(0, motsT[k] - 0.04))
      ctx.js.push(`tl.set("#${id}-${k}", { backgroundColor: "#111111", color: "${JAUNE}" }, ${t});`)
      ctx.js.push(`tl.fromTo("#${id}-${k}", { scale: 1.18 }, { scale: 1, duration: 0.16, ease: "back.out(2.4)", immediateRender: false }, ${t});`)
    }
  })
  if (cache != null) ctx.js.push(`tl.set("#${id}", { opacity: 0 }, ${cache});`)
  return html + '</div>'
}

/**
 * Accroche : dès 0 s, le problème en grandes étiquettes lisibles, sur la scène du problème assombrie ; un point lumineux
 * arrive en comète (traînée d'échos), tourne autour du texte et vient se poser au centre, grossi : le plan suivant
 * l'ouvre sur le produit. La 2ᵉ partie de l'accroche prend la place de la 1ʳᵉ au temps fort.
 */
export function accroche(ctx, P) {
  const [p1, p2] = P.parties, t1 = n3(P.t0 + P.d1)
  let scene = ''
  if (P.scene === 'miettes') scene = sceneMiettes(ctx, P, { mode: 'chute', t: P.t0 })
  else if (P.scene === 'terrasse') scene = sceneTerrasse(ctx, P, { t: n3(t1 + 0.05), d: n3(P.d2 * 0.55), fin: P.t0 + P.d, tags: false })
  else if (P.scene === 'velo') scene = sceneVelo(ctx, P, { t: n3(t1 + 0.05), d: n3(P.d2 * 0.55), fin: P.t0 + P.d })
  else if (P.scene === 'boite-a-gants') scene = sceneBoite(ctx, P, { outil: ctx.img(P.outil), t1, d2: P.d2 })
  else throw new Error(`scène d'accroche inconnue : ${P.scene}`)
  let html = `<div class="cam" id="${P.id}-cam"><div class="scene-voilee">${scene}</div><div class="voile-fort"></div>`
  html += `<div class="lueur" id="${P.id}-lu" style="left:-40px;top:240px;width:1080px;height:1080px"></div>`
  // La comète et ses échos (traînée), sur une courbe qui passe sous le texte puis remonte au centre.
  const cx = 480, cy = 760
  for (let e = 3; e >= 0; e--) html += `<div class="point${e ? ' echo' : ''}" id="${P.id}-pt${e}" style="left:${cx - 70}px;top:${cy - 70}px;width:140px;height:140px;opacity:${e ? 0.5 / e : 1}"></div>`
  html += '</div>'
  const chemin = [[-520, 760, 0.25], [-180, 520, 0.6], [260, 420, 0.7], [120, 120, 0.9], [0, 0, 1.6]]
  const d1 = Math.max(0.6, P.d1)
  for (let e = 0; e <= 3; e++) {
    const sel = `#${P.id}-pt${e}`, ret = e * 0.05
    const [x0, y0, s0] = chemin[0]
    ctx.js.push(`tl.set("${sel}", { x: ${x0}, y: ${y0}, scale: ${s0} }, ${P.t0});`)
    chemin.slice(1).forEach(([x, y, sc], k) => {
      const seg = (d1 + P.d2 * 0.5) / (chemin.length - 1)
      ctx.js.push(`tl.to("${sel}", { x: ${x}, y: ${y}, scale: ${sc}, duration: ${n3(seg)}, ease: "sine.inOut" }, ${n3(P.t0 + ret + k * seg)});`)
    })
    if (e) ctx.js.push(`tl.to("${sel}", { opacity: 0, duration: 0.2 }, ${n3(t1 + P.d2 * 0.5)});`)
  }
  ctx.js.push(`tl.to("#${P.id}-pt0", { scale: 2.4, duration: ${n3(P.d2 * 0.45)}, ease: "power2.in" }, ${n3(t1 + P.d2 * 0.5)});`)
  ctx.js.push(`tl.fromTo("#${P.id}-lu", { opacity: 0.25, scale: 0.6 }, { opacity: 0.9, scale: 1.15, duration: ${P.d}, ease: "sine.in" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#${P.id}-cam", { scale: 1.0 }, { scale: 1.08, duration: ${P.d}, ease: "none" }, ${P.t0});`)
  ctx.js.push(`tl.fromTo("#flash", { opacity: 0.45 }, { opacity: 0, duration: 0.14, ease: "power2.out", immediateRender: false }, ${t1});`)
  const haut = { top: 150, hauteur: 560 }
  html += rubanVisible(ctx, `${P.id}-r1`, p1, { ...haut, max: 170, motsT: P.motsT1, cache: t1 })
  // 2ᵉ partie : chaque mot entre quand la voix le dit (pas lisible à la 1ʳᵉ image : il n'est pas encore dit).
  const liste2 = mots(p2)
  const { taille } = ajuster(liste2, { max: 190, pad: 52, ecart: 18, lignesMax: 4, interligne: 1.22, hauteurMax: haut.hauteur, largeur: 840 })
  html += `<div class="ruban" id="${P.id}-r2" style="top:${haut.top}px;height:${haut.hauteur}px">`
  liste2.forEach((m, k) => {
    html += `<span class="eti${k === liste2.length - 1 ? ' n' : ''}" id="${P.id}-r2-${k}" style="font-size:${taille}px">${esc(m)}</span>`
    const t = n3(Math.max(t1 + 0.02, (P.motsT2?.[k] ?? t1 + 0.1 * k) - 0.04))
    ctx.js.push(`tl.fromTo("#${P.id}-r2-${k}", { opacity: 0, scale: 1.9, rotation: ${[-6, 5, -4, 6][k % 4]} }, { opacity: 1, scale: 1, rotation: ${[-2, 1.5, -1, 2][k % 4]}, duration: 0.16, ease: "power4.out" }, ${t});`)
  })
  html += '</div>'
  return section(P, html, '#060606')
}

export const CONSTRUCTEURS = { ...CLASSIQUES, accroche, produit, photo, benefice, appel }
