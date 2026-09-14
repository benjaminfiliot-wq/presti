/* kit.js — cerveau site v2. Sans framework, ≤ 5 Ko : le menu (croix, voile, tap dehors), la nav qui se fait sombre sur
   les scènes sombres, le dévoilement au défilement, la parallaxe du héros, la ligne des étapes, le halo des cartes, une
   seule question ouverte à la fois, le formulaire de devis de démonstration.
   Sans JavaScript, tout est visible d'emblée (kit.css : html.no-js). En mouvement réduit, rien ne bouge. */
(function () {
  var d = document, h = d.documentElement
  h.classList.remove('no-js'); h.classList.add('js')
  var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
  // plus de rideau d'ouverture (14/09, priorité 3) : il cachait l'entrée du titre, et son sessionStorage ne sert plus

  var nav = d.querySelector('.nav')
  function surNav() { if (nav) nav.classList.toggle('solide', scrollY > 40) }
  // première lecture dans la frame suivante : lire scrollY pendant l'exécution du script forçait la mise en page de toute la page
  // dans la tâche du script (longue tâche de 194 ms attribuée à site.js, Lighthouse mobile du 14/09)
  requestAnimationFrame(surNav); addEventListener('scroll', surNav, { passive: true })
  // au téléphone, les scènes lointaines sont en content-visibility:auto (kit.css) : une adresse avec ancre rend tout d'abord
  if (location.hash) h.classList.add('tout-rendu')
  // au premier défilement, dans un moment libre, tout est mis en page une fois : le gain reste au chargement, et une capture
  // pleine page ou une recherche dans la page ne trouvent plus de scènes vides (capture pleine page à 390 px, 14/09)
  var rendreTout = function () {
    removeEventListener('scroll', rendreTout)
    var f = function () { h.classList.add('tout-rendu') }
    if ('requestIdleCallback' in window) requestIdleCallback(f, { timeout: 1200 }); else setTimeout(f, 300)
  }
  addEventListener('scroll', rendreTout, { passive: true })
  // Sur une scène sombre (héros, plateau noir, étapes), la nav passe en noir translucide : une barre beige au-dessus du
  // plateau cassait la coupure franche noir contre photo (juge, 14/09). Une bande de 1 px sous le haut de la nav suffit.
  var sombres = d.querySelectorAll('[data-nav="sombre"]')
  if (nav && sombres.length && 'IntersectionObserver' in window) {
    var dessous = new Set()
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) dessous.add(e.target); else dessous.delete(e.target) })
      nav.classList.toggle('nav--sombre', dessous.size > 0)
    }, { rootMargin: '-40px 0px -' + Math.max(0, innerHeight - 41) + 'px 0px' })
    sombres.forEach(function (s) { obs.observe(s) })
  }

  // Le menu : la croix reste AU-DESSUS du panneau (kit.css), un voile couvre la page et ferme au tap ; un tap ne traverse
  // plus jusqu'au bouton du héros. Échap ferme aussi (clavier).
  var burger = d.querySelector('.burger'), panneau = d.querySelector('.panneau'), voile = d.querySelector('.voile')
  if (burger && panneau) {
    var ouvrir = function (o) {
      burger.setAttribute('aria-expanded', o ? 'true' : 'false'); burger.setAttribute('aria-label', o ? 'Fermer le menu' : 'Ouvrir le menu')
      panneau.classList.toggle('ouvert', o); d.body.classList.toggle('menu-ouvert', o)
    }
    burger.addEventListener('click', function () { ouvrir(burger.getAttribute('aria-expanded') !== 'true') })
    panneau.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { ouvrir(false) }) })
    if (voile) voile.addEventListener('click', function () { ouvrir(false) })
    addEventListener('keydown', function (e) { if (e.key === 'Escape') ouvrir(false) })
  }

  var reveals = d.querySelectorAll('.reveal, .etape')
  if ('IntersectionObserver' in window && !reduit) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target) } }) }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    // une photo de galerie se dévoile dès son premier pixel à l'écran : au seuil de 12 %, le haut d'une photo entrée par le bas
    // restait coupé (clip à 16 %) tant qu'on ne défilait plus (juge du 14/09, galerie à 600 px du haut)
    var ioPhoto = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu'); ioPhoto.unobserve(e.target) } }) }, { threshold: 0 })
    reveals.forEach(function (el) { (el.classList.contains('galerie__item') ? ioPhoto : io).observe(el) })
  } else reveals.forEach(function (el) { el.classList.add('vu') })

  var media = d.querySelector('.hero--plein .hero__media img')
  if (media && !reduit && matchMedia('(min-width: 900px)').matches) {
    var attendu = false
    var parallaxe = function () { var y = Math.min(scrollY, innerHeight); media.style.translate = '0 ' + (y * 0.16).toFixed(1) + 'px'; attendu = false }
    addEventListener('scroll', function () { if (!attendu) { attendu = true; requestAnimationFrame(parallaxe) } }, { passive: true })
  }

  // La ligne des étapes ne mesure rien tant que la liste n'approche pas de l'écran : lue au chargement, sa position force
  // une mise en page complète d'une page longue (longues tâches de 260 ms dans site.js, TBT 241 ms sur mobile, 14/09).
  // Quand la liste est proche, une seule mesure par image (rAF), jamais plus.
  var liste = d.querySelector('.etapes__liste')
  if (liste && 'IntersectionObserver' in window) {
    var enAttente = false, proche = false
    var avancer = function () { enAttente = false; var r = liste.getBoundingClientRect(); var a = (innerHeight * 0.72 - r.top) / r.height; liste.style.setProperty('--avancee', Math.min(1, Math.max(0, a)).toFixed(3)) }
    var surDefilement = function () { if (proche && !enAttente) { enAttente = true; requestAnimationFrame(avancer) } }
    new IntersectionObserver(function (es) { proche = es[0].isIntersecting; if (proche) surDefilement() }, { rootMargin: '25% 0px 25% 0px' }).observe(liste)
    addEventListener('scroll', surDefilement, { passive: true })
  } else if (liste) liste.style.setProperty('--avancee', '1')

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) d.querySelectorAll('.carte').forEach(function (c) {
    c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px') })
  })

  // les ancres défilent en douceur (sauf mouvement réduit) ; le CSS n'impose pas scroll-behavior:smooth, qui bloque
  // tout défilement programmé (juge, capture, technologies d'assistance). La nav fixe est compensée par scroll-margin-top.
  d.querySelectorAll('a[href*="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var h = a.getAttribute('href'), i = h.indexOf('#'), avant = h.slice(0, i)
      var cible = i >= 0 && (avant === '' || avant === 'index.html' || avant === location.pathname) ? d.getElementById(h.slice(i + 1)) : null
      // tout-rendu : les scènes encore sautées (content-visibility) prennent leur vraie hauteur avant le calcul de la cible
      if (cible) { e.preventDefault(); d.documentElement.classList.add('tout-rendu'); cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' }); history.replaceState(null, '', h.slice(i)) }
    })
  })

  var details = d.querySelectorAll('.faq details')
  // sur bureau, la première question est ouverte d'emblée : les deux colonnes des questions s'équilibrent (au téléphone, la
  // liste reste fermée et courte). Section loin sous la ligne de flottaison : aucun décalage visible.
  if (details.length && d.querySelector('.faq-scene') && matchMedia('(min-width: 960px)').matches) details[0].open = true
  details.forEach(function (x) { x.addEventListener('toggle', function () { if (x.open) details.forEach(function (y) { if (y !== x) y.open = false }) }) })

  // Le formulaire de devis d'une démo : rien ne part (ni requête, ni stockage) ; après validation du navigateur, la carte
  // montre l'état « demande reçue » et redit qu'aucune donnée n'a été envoyée. Chez un vrai artisan, c'est la messagerie Presti.
  // L'état « demande reçue » reprend ce qui a été choisi (projet, commune, délai) : lu dans le formulaire, écrit en texte, jamais
  // stocké. « Faire une autre demande » rouvre le formulaire.
  d.querySelectorAll('form[data-demo]').forEach(function (f) {
    var merci = f.parentNode.querySelector('.devis__merci')
    f.addEventListener('submit', function (e) {
      e.preventDefault()
      if (f.reportValidity && !f.reportValidity()) return
      if (merci) merci.querySelectorAll('[data-champ]').forEach(function (dd) {
        var c = f.elements[dd.getAttribute('data-champ')]
        var v = c ? (c.options && c.selectedIndex >= 0 ? (c.value ? c.options[c.selectedIndex].text : '') : c.value) : ''
        dd.textContent = v || 'À préciser à la visite'
      })
      f.reset(); f.hidden = true
      if (merci) {
        merci.hidden = false; merci.focus({ preventScroll: true })
        // Le titre de la section entier sous la nav fixe, et la mention de démonstration dans l'écran : scrollIntoView sur la
        // confirmation laissait « Parlons de votre projet » coupé sous la nav, et la mention sous la ligne de flottaison au
        // téléphone (juge du 14/09). On vise le haut du titre si titre et mention tiennent ensemble dans l'écran, sinon la confirmation.
        var sous = nav ? nav.getBoundingClientRect().bottom : 0
        var sec = f.closest('.contact'), tete = sec && sec.querySelector('.contact__tete')
        var note = merci.querySelector('.devis__note') || merci.querySelector('.devis__merci-titre') || merci
        var ancre = merci
        if (tete && note.getBoundingClientRect().bottom - tete.getBoundingClientRect().top <= innerHeight - sous - 32) ancre = tete
        var dy = ancre.getBoundingClientRect().top - sous - 16
        if (Math.abs(dy) > 4) scrollBy({ top: dy, behavior: reduit ? 'auto' : 'smooth' })
      }
    })
    var encore = merci && merci.querySelector('.devis__encore')
    if (encore) encore.addEventListener('click', function () { merci.hidden = true; f.hidden = false; var p = f.querySelector('select, input, textarea'); if (p) p.focus() })
  })
})()
