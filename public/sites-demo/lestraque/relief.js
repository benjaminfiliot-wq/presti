/* relief.js — le héros en relief, côté page (cerveau site v2, vague 3). Bureau seulement : kit.js ne l'injecte (script module)
   qu'après l'événement load, dans un moment libre, si (min-width: 1024px) and (hover: hover) and (pointer: fine) and
   (prefers-reduced-motion: no-preference), si le navigateur a les workers et OffscreenCanvas, et si sa sonde a obtenu un
   contexte WebGL matériel SUR LE FIL PRINCIPAL (un worker en obtient un même quand la page n'y a pas droit).

   Ici, rien de lourd : une toile posée sur la photo (opacité 0), cédée au fil de rendu (relief-fil.js, qui ouvre le contexte
   WebGL matériel et dessine) ; la page ne lui transmet que la souris, le défilement, la taille et « actif ou non ». Le fil
   s'arrête quand le héros sort de l'écran, quand le plateau le recouvre entièrement ou quand l'onglet est caché. Sans contexte
   matériel, contexte perdu ou erreur : la toile disparaît et la photo reste telle quelle. */
const d = document
const hero = d.querySelector('.hero--plein[data-relief]')
// le worker qui a servi de sonde (kit.js) est repris tel quel : déjà chargé, carte déjà chaude
if (hero) try { demarrer(hero) } catch (e) { /* la photo reste */ if (hero.reliefFil) hero.reliefFil.terminate(); hero.setAttribute('data-relief-etat', 'echec') }

function demarrer(hero) {
  const media = hero.querySelector('.hero__media'), img = media && media.querySelector('img')
  if (!img || !img.complete || !img.naturalWidth) { if (hero.reliefFil) hero.reliefFil.terminate(); hero.setAttribute('data-relief-etat', 'echec'); return }
  const toile = d.createElement('canvas')
  toile.className = 'hero__relief'
  toile.setAttribute('aria-hidden', 'true')
  const offscreen = toile.transferControlToOffscreen()
  const fil = hero.reliefFil || new Worker(new URL(hero.getAttribute('data-relief-fil'), location.href).href)
  hero.reliefFil = fil

  // le cadrage de l'image (object-fit: cover, object-position lu dans le CSS calculé) et la taille affichée en pixels d'écran
  const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => (/%$/.test(v) ? parseFloat(v) / 100 : 0.5))
  // voile : le haut du titre, en fraction de la hauteur du héros, moins 4 % (la poussée de 6 % agrandit la toile vers le bas) ;
  // la lumière du shader s'éteint en dessous. Mesuré au repos ; défilé, le titre est plus haut et le voile aussi (plus prudent).
  const titre = hero.querySelector('h1')
  const taille = () => {
    const k = Math.min(devicePixelRatio || 1, 1.5), mh = media.clientHeight || 1
    const voile = titre ? Math.max(0, Math.min(1, (titre.getBoundingClientRect().top - media.getBoundingClientRect().top) / mh - 0.04)) : 0.5
    return { W: Math.max(1, Math.round(media.clientWidth * k)), H: Math.max(1, Math.round(mh * k)), dpr: k, voile }
  }

  media.appendChild(toile)
  // la poussée lente (kit.css → pousse, 20 s) reprend exactement là où en est l'image
  const anim = (el) => (el.getAnimations ? el.getAnimations().find((a) => a.animationName === 'pousse') : null)
  const ai = anim(img), at = anim(toile)
  if (ai && at) at.currentTime = ai.currentTime

  const fin = () => { fil.terminate(); toile.remove(); img.style.visibility = ''; hero.setAttribute('data-relief-etat', 'echec') }
  fil.onerror = fin
  fil.onmessage = (e) => {
    const m = e.data
    if (m.type === 'pret') {
      hero.setAttribute('data-relief-etat', 'pret')
      toile.addEventListener('transitionend', () => { if (toile.isConnected) img.style.visibility = 'hidden' }, { once: true })
      requestAnimationFrame(() => toile.classList.add('hero__relief--pret'))
    } else if (m.type === 'echec' || m.type === 'perdu') fin()
  }
  fil.postMessage({
    type: 'init', toile: offscreen, image: new URL(img.currentSrc || img.src, location.href).href,
    profondeur: new URL(hero.getAttribute('data-relief-profondeur'), location.href).href,
    oeil: (hero.getAttribute('data-relief-oeil') || '0.4,0.39').split(',').map(Number),
    pos: [pos[0] ?? 0.5, pos[1] ?? 0.5], aspect: img.naturalWidth / img.naturalHeight, largeurNaturelle: img.naturalWidth, ...taille(),
  }, [offscreen])

  // actif : héros à l'écran, pas recouvert par le plateau (héros collant, kit.css v26), onglet visible
  const plateau = hero.parentNode.classList.contains('ouverture') ? hero.nextElementSibling : null
  let enVue = true, couvert = false, etat = null, sx = 0, sy = 0
  const majActif = () => {
    const a = enVue && !couvert && !d.hidden
    if (a === etat) return
    etat = a
    fil.postMessage({ type: 'actif', v: a })
    if (a) fil.postMessage({ type: 'souris', x: sx, y: sy })
  }
  new IntersectionObserver((es) => { enVue = es[es.length - 1].isIntersecting; majActif() }).observe(hero)
  d.addEventListener('visibilitychange', majActif)
  let tDef = 0
  const surDefilement = () => {
    tDef = 0
    if (plateau) couvert = plateau.getBoundingClientRect().top <= 0.5
    majActif()
    if (etat) fil.postMessage({ type: 'defile', v: Math.min(1, Math.max(0, scrollY / innerHeight)) })
  }
  addEventListener('scroll', () => { if (!tDef) tDef = requestAnimationFrame(surDefilement) }, { passive: true })
  let tSou = 0
  addEventListener('pointermove', (e) => {
    sx = e.clientX / innerWidth * 2 - 1; sy = e.clientY / innerHeight * 2 - 1
    if (!tSou) tSou = requestAnimationFrame(() => { tSou = 0; if (etat) fil.postMessage({ type: 'souris', x: sx, y: sy }) })
  }, { passive: true })
  d.documentElement.addEventListener('pointerleave', () => { sx = 0; sy = 0; if (etat) fil.postMessage({ type: 'souris', x: 0, y: 0 }) })
  // le titre change de hauteur quand ses polices arrivent : on l'observe aussi
  const ro = new ResizeObserver(() => fil.postMessage({ type: 'taille', ...taille() }))
  ro.observe(media); if (titre) ro.observe(titre)
  // la parallaxe de défilement de kit.js (navigateurs sans view()) déplace l'image : la toile suit
  new MutationObserver(() => { if (toile.style.translate !== img.style.translate) toile.style.translate = img.style.translate }).observe(img, { attributes: true, attributeFilter: ['style'] })
  requestAnimationFrame(surDefilement)
}
