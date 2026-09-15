/* video.js — famille « video » (vague 5, 021-13) : des mains qui poncent le bois, en plein cadre derrière la phrase de « Dans
   l'atelier », une fois les quatre verbes pleins (recit, 021-03) : un seul mouvement à la fois.
   Bureau ≥ 1024 px, mouvement permis, sans économie de données. Ailleurs (téléphone, tablette, mouvement réduit, sans JavaScript),
   aucun élément ni aucune requête : la photo et sa dérive restent. Rien dans le HTML (video.mjs) : l'élément naît à l'approche de
   la scène, après load et dans un moment libre, pour ne rien coûter au haut de page. Au moindre échec, il disparaît pour de bon. */
(function () {
  var d = document, scene = d.querySelector('#atelier'), media = scene && scene.querySelector('.atelier__media')
  var script = d.querySelector('script[src$="site.js"]')
  var bureau = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')
  if (!media || !script || !bureau.matches || !('IntersectionObserver' in window) || (navigator.connection && navigator.connection.saveData)) return

  var PASSIF = { passive: true }, video = null, bouton = null, dernier = null, veille = 0
  var proche = false, attente = false, prevu = false, montree = false, lue = false, parVisiteur = false, fini = false

  function ecouter(oui) {
    var f = oui ? 'addEventListener' : 'removeEventListener'
    window[f]('scroll', planifier, PASSIF); window[f]('resize', planifier, PASSIF)
  }
  // au plus une mesure par image, et seulement quand la scène est à moins d'un écran (les écouteurs n'existent qu'alors)
  function planifier() { if (video && !prevu && !fini) { prevu = true; requestAnimationFrame(suivre) } }

  function suivre() {
    prevu = false
    if (fini) return
    var r = scene.getBoundingClientRect()
    var couverture = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight
    if (couverture < 0.2 || !bureau.matches) {
      if (!video.paused) { video.pause(); clearTimeout(veille); veille = 0 }
      // Hors de la scène, elle revient à son début : la photo et sa dérive, puis le fondu à la prochaine lecture. Le fondu de
      // sortie se joue sous le voile, sur le cinquième de scène qui reste à l'écran. Une pause du visiteur se garde telle quelle.
      if (montree && !parVisiteur) cacher()
    } else if (couverture >= 0.6 && video.paused && !parVisiteur && pleins()) jouer()
  }
  // L'opacité calculée du dernier verbe et de tous ses parents (la phrase monte aussi) : ce que le visiteur voit, pas un calcul
  // tiré du défilement. Sans verbe (famille recit absente), rien n'attend.
  function pleins() {
    for (var o = 1, n = dernier; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
    return o >= 0.98
  }

  function jouer() {
    // chien de garde du premier départ : 4 s sans « playing », la vidéo n'arrivera pas (réseau, décodeur, lecture refusée)
    if (!lue && !veille) veille = setTimeout(function () { if (!lue && !video.paused) echec() }, 4000)
    var p = video.play()
    // AbortError : une pause demandée avant le départ (le visiteur est reparti vite), pas un échec
    if (p && p.catch) p.catch(function (e) { if (!e || e.name !== 'AbortError') echec() })
  }
  function montrer() {
    if (fini || video.paused) return // un « playing » resté en file derrière une pause
    lue = montree = true; clearTimeout(veille)
    video.classList.add('atelier__video--lue'); media.classList.add('atelier__media--video')
    bouton.hidden = false; libeller()
  }
  function cacher() {
    montree = false
    video.classList.remove('atelier__video--lue'); media.classList.remove('atelier__media--video')
    // un bouton qui a le focus reste : le cacher renverrait le clavier en haut de la page
    if (d.activeElement !== bouton) bouton.hidden = true
  }
  function libeller() {
    var p = video.paused
    bouton.textContent = p ? 'Relancer la vidéo' : 'Mettre la vidéo en pause'
    bouton.setAttribute('aria-pressed', p ? 'true' : 'false')
  }
  // Entrée et Espace passent par le clic d'un <button> ; l'état s'écrit tout de suite, sans attendre l'événement du média
  function basculer() {
    if (video.paused) { parVisiteur = false; jouer() } else { parVisiteur = true; video.pause() }
    libeller()
  }
  // la photo reprend sa place et sa dérive, et on ne réessaie plus : un second échec coûterait une requête pour rien
  function echec() {
    if (fini) return
    fini = true; clearTimeout(veille); io.disconnect(); ecouter(false)
    media.classList.remove('atelier__media--video')
    video.pause(); video.remove(); bouton.remove()
  }

  function creer() {
    attente = false
    if (video || fini || !bureau.matches) return
    video = d.createElement('video')
    video.className = 'atelier__video'
    var attributs = ['muted', 'loop', 'playsinline', 'disablepictureinpicture', 'preload', 'auto', 'aria-hidden', 'true', 'tabindex', '-1']
    for (var i = 0; i < 4; i++) video.setAttribute(attributs[i], '')
    for (i = 4; i < 10; i += 2) video.setAttribute(attributs[i], attributs[i + 1])
    // l'attribut muted d'un élément créé en script ne coupe pas le son : sans la propriété, la lecture automatique est refusée
    video.muted = video.loop = video.playsInline = true
    // AV1 d'abord (le plus léger), H.264 ensuite ; même origine, jamais blob: (la CSP n'a pas de media-src)
    var sources = [['atelier.av1.mp4', 'av01.0.08M.08'], ['atelier.h264.mp4', 'avc1.640028']], s
    for (i = 0; i < 2; i++) {
      s = d.createElement('source')
      s.src = new URL('video/' + sources[i][0], script.src).href
      s.type = 'video/mp4; codecs="' + sources[i][1] + '"'
      video.appendChild(s)
    }
    // une source refusée ou introuvable passe la main à la suivante : l'erreur de la dernière veut dire qu'il n'y a rien à lire
    s.addEventListener('error', echec)
    video.addEventListener('error', echec)
    video.addEventListener('playing', montrer)
    video.addEventListener('pause', libeller)
    bouton = d.createElement('button')
    bouton.type = 'button'; bouton.className = 'atelier__pause'; bouton.hidden = true
    bouton.addEventListener('click', basculer)
    dernier = scene.querySelectorAll('.atelier__verbe'); dernier = dernier[dernier.length - 1] || null
    // dans le média (sous son voile) ; le bouton dans la scène : .atelier__media est en z-index -1, il n'y recevrait aucun clic
    media.appendChild(video); scene.appendChild(bouton)
    // sans view(), la phrase entre par une transition au temps : sa fin peut remplir les verbes sans aucun défilement
    scene.addEventListener('transitionend', planifier, PASSIF)
    ecouter(proche); planifier() // le visiteur est peut-être déjà dans la scène
  }

  var io = new IntersectionObserver(function (es) {
    proche = es[es.length - 1].isIntersecting
    if (video) { ecouter(proche); planifier() } else if (proche && !attente) {
      attente = true
      if ('requestIdleCallback' in window) requestIdleCallback(creer, { timeout: 1200 }); else setTimeout(creer, 300)
    }
  }, { rootMargin: '100% 0px' })
  function demarrer() { io.observe(scene) }
  if (d.readyState === 'complete') demarrer(); else addEventListener('load', demarrer)
})()
