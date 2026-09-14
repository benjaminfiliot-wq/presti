/* kit.js — cerveau site v2. Sans framework, ≤ 4 Ko : le menu, le rideau (une fois par session), le dévoilement au
   défilement, la parallaxe du héros, la ligne des étapes, le halo des cartes, une seule question ouverte à la fois.
   Sans JavaScript, tout est visible d'emblée (kit.css : html.no-js). En mouvement réduit, rien ne bouge. */
(function () {
  var d = document, h = d.documentElement
  h.classList.remove('no-js'); h.classList.add('js')
  var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
  try { if (sessionStorage.getItem('rideau')) h.classList.add('splash-vu'); else sessionStorage.setItem('rideau', '1') } catch (e) { h.classList.add('splash-vu') }

  var nav = d.querySelector('.nav')
  function surNav() { if (nav) nav.classList.toggle('solide', scrollY > 40) }
  surNav(); addEventListener('scroll', surNav, { passive: true })

  var burger = d.querySelector('.burger'), panneau = d.querySelector('.panneau')
  if (burger && panneau) {
    var ouvrir = function (o) { burger.setAttribute('aria-expanded', o ? 'true' : 'false'); panneau.classList.toggle('ouvert', o); d.body.classList.toggle('menu-ouvert', o) }
    burger.addEventListener('click', function () { ouvrir(burger.getAttribute('aria-expanded') !== 'true') })
    panneau.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { ouvrir(false) }) })
    addEventListener('keydown', function (e) { if (e.key === 'Escape') ouvrir(false) })
  }

  var reveals = d.querySelectorAll('.reveal, .etape')
  if ('IntersectionObserver' in window && !reduit) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target) } }) }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    reveals.forEach(function (el) { io.observe(el) })
  } else reveals.forEach(function (el) { el.classList.add('vu') })

  var media = d.querySelector('.hero--plein .hero__media img')
  if (media && !reduit && matchMedia('(min-width: 900px)').matches) {
    var attendu = false
    var parallaxe = function () { var y = Math.min(scrollY, innerHeight); media.style.translate = '0 ' + (y * 0.16).toFixed(1) + 'px'; attendu = false }
    addEventListener('scroll', function () { if (!attendu) { attendu = true; requestAnimationFrame(parallaxe) } }, { passive: true })
  }

  var liste = d.querySelector('.etapes__liste')
  if (liste) {
    var avancer = function () { var r = liste.getBoundingClientRect(); var a = (innerHeight * 0.72 - r.top) / r.height; liste.style.setProperty('--avancee', Math.min(1, Math.max(0, a)).toFixed(3)) }
    // la première mesure attend une image : lue tout de suite, elle force une mise en page complète (822 ms de fil principal
    // attribués à site.js par Lighthouse mobile, 14/09)
    addEventListener('scroll', avancer, { passive: true }); requestAnimationFrame(function () { requestAnimationFrame(avancer) })
  }

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) d.querySelectorAll('.carte').forEach(function (c) {
    c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px') })
  })

  // les ancres défilent en douceur (sauf mouvement réduit) ; le CSS n'impose pas scroll-behavior:smooth, qui bloque
  // tout défilement programmé (juge, capture, technologies d'assistance)
  d.querySelectorAll('a[href*="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var h = a.getAttribute('href'), i = h.indexOf('#'), cible = i >= 0 && (h.slice(0, i) === '' || h.slice(0, i) === location.pathname) ? d.getElementById(h.slice(i + 1)) : null
      if (cible) { e.preventDefault(); cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' }); history.replaceState(null, '', h.slice(i)) }
    })
  })

  var details = d.querySelectorAll('.faq details')
  details.forEach(function (x) { x.addEventListener('toggle', function () { if (x.open) details.forEach(function (y) { if (y !== x) y.open = false }) }) })
})()
