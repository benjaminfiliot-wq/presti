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
  // voile : le haut du titre, en fraction de la hauteur du héros, moins 4 % (la poussée de 6 % agrandit la toile vers le bas) ;
  // la lumière du shader s'éteint en dessous. Mesuré au repos ; défilé, le titre est plus haut et le voile aussi (plus prudent).
  const titre = hero.querySelector('h1')
  const taille = () => {
    const k = Math.min(devicePixelRatio || 1, 1.5)
    const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => (/%$/.test(v) ? parseFloat(v) / 100 : 0.5))
    let voile = 0.5
    if (titre) {
      const A = parseFloat(getComputedStyle(toile).getPropertyValue('--signature-a')) || 0
      const t = titre.getBoundingClientRect(), m = media.getBoundingClientRect()
      const bx = toile.offsetLeft, by = toile.offsetTop, bw = toile.clientWidth || 1, bh = toile.clientHeight || 1
      const ox = bx + 0.404 * bw, oy = by + 0.386 * bh
      const eb = parseFloat((getComputedStyle(toile).transform.match(/matrix\(([^,]+)/) || [0, 1])[1]) || 1
      let yMin = Infinity
      for (const a of A ? [-A, A] : [0]) for (const s of [eb, eb * 1.06]) for (const x of [t.left - m.left, t.right - m.left]) {
        const th = a * Math.PI / 180, vx = x - ox, vy = (t.top - m.top) - oy
        yMin = Math.min(yMin, (oy + (-Math.sin(th) * vx + Math.cos(th) * vy) / s - by) / bh)
      }
      voile = Math.max(0, Math.min(1, yMin - 0.04))
    }
    return { W: Math.max(1, Math.round(toile.clientWidth * k)), H: Math.max(1, Math.round(toile.clientHeight * k)), dpr: k, voile, pos }
  }

  media.appendChild(toile)
  let fini = false
  // toutes les animations de la toile reprennent exactement la phase de leur homologue sur la photo
  const synchroniser = () => {
    if (!img.getAnimations || !toile.getAnimations) return
    const animationsToile = toile.getAnimations()
    for (const animationImage of img.getAnimations()) {
      if (!animationImage.animationName) continue
      const animationToile = animationsToile.find((a) => a.animationName === animationImage.animationName)
      if (!animationToile) continue
      // Une animation CSS nouvellement créée peut encore être « pending » : lui affecter startTime tout de suite
      // serait écrasé quand elle démarre réellement. L'alignement définitif se fait donc une fois les deux prêtes.
      Promise.all([animationImage.ready, animationToile.ready]).then(() => {
        if (fini || !toile.isConnected) return
        if (animationImage.startTime != null) animationToile.startTime = animationImage.startTime
        else animationToile.currentTime = animationImage.currentTime
      }).catch(() => {})
    }
  }
  synchroniser()

  const fin = () => {
    if (fini) return; fini = true
    fil.terminate(); img.style.visibility = ''; hero.setAttribute('data-relief-etat', 'echec')
    if (toile.classList.contains('hero__relief--pret')) {
      toile.classList.remove('hero__relief--pret')
      const retirer = () => { toile.remove(); img.style.visibility = '' }
      toile.addEventListener('transitionend', retirer, { once: true }); setTimeout(retirer, 1000)
    } else toile.remove()
  }
  fil.onerror = fin
  fil.onmessage = (e) => {
    const m = e.data
    if (m.type === 'pret') {
      hero.setAttribute('data-relief-etat', 'pret')
      // Le fil ne démarre les trois secondes d'attente de la texture détaillée qu'après publication
      // de l'état prêt dans la page : une file de messages chargée ne peut plus rogner ce délai observable.
      fil.postMessage({ type: 'pret-visible' })
      toile.addEventListener('transitionend', () => { if (!fini && toile.isConnected) img.style.visibility = 'hidden' }, { once: true })
      requestAnimationFrame(() => { if (!fini) toile.classList.add('hero__relief--pret') })
      // Publier un premier état stable après l'introduction : les bancs et outils de diagnostic qui
      // s'abonnent une fois le relief prêt disposent ainsi du même relevé que la requête « compte ».
      setTimeout(() => { if (!fini) fil.postMessage({ type: 'compte' }) }, 2600)
    } else if (m.type === 'echec' || m.type === 'perdu') fin()
  }
  // la descente du moment signature (020-03, cahier 020 §7.4) : v = clamp(y / (palier × h)), 0 hors chorégraphie (téléphone,
  // mouvement réduit, sans view(), sans réglage). L'horodatage part avec le message : le fil en tire la latence de son dessin.
  const condChoregraphie = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')
  const signature = d.documentElement.classList.contains('da--signature') && !!(window.CSS && CSS.supports('animation-timeline: view()'))
  let reglage = null
  try { reglage = JSON.parse(hero.getAttribute('data-relief-descente') || 'null') } catch (e) { /* réglage illisible : pas de descente */ }
  const defileV = () => Math.min(1, Math.max(0, scrollY / innerHeight))
  const descente = () => (reglage && signature && condChoregraphie.matches ? Math.min(1, Math.max(0, scrollY / (reglage.palier * innerHeight))) : 0)
  const envoyerDescente = () => fil.postMessage({ type: 'descente', v: descente(), t: performance.timeOrigin + performance.now() })

  const texture = hero.getAttribute('data-relief-texture')
  // Le navigateur peut choisir la variante 2880 comme currentSrc sur un écran dense. Le premier rendu du fil
  // repart volontairement de la source de repli de l'élément (1600) : la 2880 reste réservée au remplacement tardif.
  const imageInitiale = img.getAttribute('src') || img.src
  fil.postMessage({
    type: 'init', toile: offscreen, image: new URL(imageInitiale, location.href).href,
    texture: texture ? new URL(texture, location.href).href : '',
    profondeur: new URL(hero.getAttribute('data-relief-profondeur'), location.href).href,
    oeil: (hero.getAttribute('data-relief-oeil') || '0.4,0.39').split(',').map(Number),
    aspect: img.naturalWidth / img.naturalHeight, largeurNaturelle: img.naturalWidth,
    calme: hero.hasAttribute('data-relief-calme'), lumiereCss: hero.hasAttribute('data-relief-lumiere-css'),
    economie: !!(navigator.connection && navigator.connection.saveData), ...taille(),
    descente: reglage, v: descente(),
  }, [offscreen])

  // actif : héros à l'écran, pas recouvert par le plateau (héros collant, kit.css v26), onglet visible
  const plateau = hero.parentNode.classList.contains('ouverture') ? hero.nextElementSibling : null
  let enVue = true, couvert = false, etat = null, sx = 0, sy = 0
  const majActif = () => {
    const a = enVue && !couvert && !d.hidden
    if (a === etat) return
    etat = a
    fil.postMessage({ type: 'actif', v: a })
    // réactivé (onglet revenu, saut, héros de nouveau découvert) : le fil repart des valeurs courantes, pas de celles d'avant l'arrêt
    if (a) { fil.postMessage({ type: 'souris', x: sx, y: sy }); fil.postMessage({ type: 'defile', v: defileV() }); envoyerDescente() }
  }
  new IntersectionObserver((es) => { enVue = es[es.length - 1].isIntersecting; majActif() }).observe(hero)
  d.addEventListener('visibilitychange', majActif)
  let tDef = 0
  const surDefilement = () => {
    tDef = 0
    if (plateau) couvert = plateau.getBoundingClientRect().top <= 0.5
    majActif()
    if (etat) { fil.postMessage({ type: 'defile', v: defileV() }); envoyerDescente() }
  }
  addEventListener('scroll', () => { if (!tDef) tDef = requestAnimationFrame(surDefilement) }, { passive: true })
  // sous 1 024 px ou en mouvement réduit, le palier CSS disparaît : la plongée du shader retombe à 0 avec lui, et revient au retour
  condChoregraphie.addEventListener('change', surDefilement)
  let tSou = 0
  addEventListener('pointermove', (e) => {
    sx = e.clientX / innerWidth * 2 - 1; sy = e.clientY / innerHeight * 2 - 1
    if (!tSou) tSou = requestAnimationFrame(() => { tSou = 0; if (etat) fil.postMessage({ type: 'souris', x: sx, y: sy }) })
  }, { passive: true })
  d.documentElement.addEventListener('pointerleave', () => { sx = 0; sy = 0; if (etat) fil.postMessage({ type: 'souris', x: 0, y: 0 }) })
  // le titre change de hauteur quand ses polices arrivent : on l'observe aussi
  const ro = new ResizeObserver(() => {
    fil.postMessage({ type: 'taille', ...taille() })
    synchroniser()
    surDefilement()
  })
  ro.observe(media); ro.observe(toile); if (titre) ro.observe(titre)
  // la parallaxe de défilement de kit.js (navigateurs sans view()) déplace l'image : la toile suit
  new MutationObserver(() => { if (toile.style.translate !== img.style.translate) toile.style.translate = img.style.translate }).observe(img, { attributes: true, attributeFilter: ['style'] })
  requestAnimationFrame(surDefilement)
}
