/* kit.js — cerveau site v2. Sans framework, ≤ 5 Ko : le menu (croix, voile, tap dehors), la nav qui se fait sombre sur
   les scènes sombres, le dévoilement au défilement, la parallaxe du héros, la ligne des étapes, le halo des cartes, une
   seule question ouverte à la fois, le formulaire de devis de démonstration.
   Sans JavaScript, tout est visible d'emblée (kit.css : html.no-js). En mouvement réduit, rien ne bouge. */
(function () {
  var d = document, h = d.documentElement
  h.classList.remove('no-js'); h.classList.add('js')
  var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
  // la chorégraphie de bureau (kit.css v26 : plateau sur le héros, étapes épinglées) — les mêmes conditions que le CSS ; quand
  // elle joue, la parallaxe du héros et la ligne des étapes en JS se taisent (un écouteur de défilement de moins chacune)
  var choregraphie = !reduit && matchMedia('(min-width: 1024px)').matches && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'))
  // plus de rideau d'ouverture (14/09, priorité 3) : il cachait l'entrée du titre, et son sessionStorage ne sert plus

  var nav = d.querySelector('.nav')
  function surNav() { if (nav) nav.classList.toggle('solide', scrollY > 40) }
  // première lecture dans la frame suivante : lire scrollY pendant l'exécution du script forçait la mise en page de toute la page
  // dans la tâche du script (longue tâche de 194 ms attribuée à site.js, Lighthouse mobile du 14/09)
  requestAnimationFrame(surNav); addEventListener('scroll', surNav, { passive: true })
  // Sur la démo qui demande une barre retenue, le bouton du héros et « Devis » dans la nav se passent le relais au bureau.
  // Le pilote n'est activé qu'avec IntersectionObserver : sans lui (ou sans JS), le chemin de devis de la nav reste visible.
  var appelHeros = d.querySelector('.hero .hero__actions .bouton'), devisNav = nav && nav.querySelector('.nav__devis')
  if (h.classList.contains('da--nav-retenue') && nav && appelHeros && devisNav && 'IntersectionObserver' in window && matchMedia('(min-width: 960px)').matches) {
    nav.classList.add('nav--retenue')
    var montrerAppelNav = function (montrer) {
      nav.classList.toggle('nav--appel', montrer)
      if (montrer) devisNav.removeAttribute('tabindex'); else devisNav.setAttribute('tabindex', '-1')
    }
    montrerAppelNav(false)
    var appelCoupeEcran = true, appelAttendu = false
    var appelVisible = function () {
      appelAttendu = false
      if (!appelCoupeEcran) return montrerAppelNav(true)
      var r = appelHeros.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2
      if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return montrerAppelNav(true)
      var dessus = d.elementFromPoint(x, y), opacite = 1
      for (var n = appelHeros; n && n.nodeType === 1; n = n.parentElement) opacite *= Number(getComputedStyle(n).opacity)
      montrerAppelNav(!(opacite >= 0.2 && dessus && (dessus === appelHeros || appelHeros.contains(dessus))))
    }
    var demanderAppel = function () {
      if (!appelAttendu) { appelAttendu = true; requestAnimationFrame(appelVisible) }
    }
    new IntersectionObserver(function (es) {
      var e = es[0], r = e.boundingClientRect
      // Le rectangle livré par l'observateur est la porte fiable : Chromium peut émettre une première entrée
      // isIntersecting=false pendant la mise en place du héros collant alors que son bouton est déjà à l'écran.
      appelCoupeEcran = r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
      if (appelCoupeEcran) demanderAppel(); else montrerAppelNav(true)
    }, { threshold: 0 }).observe(appelHeros)
    demanderAppel()
    appelHeros.closest('.hero').addEventListener('animationend', demanderAppel)
    addEventListener('scroll', demanderAppel, { passive: true })
    addEventListener('resize', demanderAppel)
  }
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
  // La ligne est lue au milieu de la nav (mesurée dans une frame, jamais pendant l'exécution du script) et recalculée quand la
  // fenêtre change de hauteur (barre d'adresse du téléphone) : une ligne figée au chargement décalait la bascule.
  // Vague 3, 2e tour : une bascule au milieu de la nav laissait la barre beige coiffer le noir du contact sur 60 px de
  // défilement (juge du 14/09, 390 px). La nav a maintenant deux couches (kit.css → nav--bande) : le beige et le noir
  // translucide, chacune découpée (clip-path) au pixel près sur la frontière de la scène sombre qui passe dessous. Seules les
  // scènes sombres qui touchent la bande de la nav sont mesurées (IntersectionObserver), une fois par image.
  var sombres = d.querySelectorAll('[data-nav="sombre"]')
  if (nav && sombres.length && 'IntersectionObserver' in window) {
    nav.classList.add('nav--bande')
    var dessous = new Set(), obs = null, tRes = 0, hNav = 0, tBande = false, cle = ''
    var bande = function () {
      tBande = false
      var a = hNav, b = hNav, vide = true
      dessous.forEach(function (s) {
        var r = s.getBoundingClientRect(), t = Math.max(0, Math.round(r.top)), u = Math.min(hNav, Math.round(r.bottom))
        // une photo sombre sur une scène claire ne compte que si elle couvre au moins la moitié de la largeur sous la nav (la photo
        // des questions et les cartes du rail des prestations au téléphone) ; au bureau, une vignette ou une photo de colonne laisse
        // la nav sur le papier (juge du 15/09 : barre beige sur la photo à tasseaux, 43 lignes à 390 px)
        if (Math.min(innerWidth, r.right) - Math.max(0, r.left) < innerWidth / 2) return
        if (u > t) { if (vide) { a = t; b = u; vide = false } else { a = Math.min(a, t); b = Math.max(b, u) } }
      })
      var k = a + ',' + b
      if (k === cle) return
      cle = k
      // le noir couvre [a, b] de la nav ; le beige, le reste (au-dessus quand le noir arrive par le bas, dessous sinon)
      nav.style.setProperty('--nav-sh', a + 'px'); nav.style.setProperty('--nav-sb', (hNav - b) + 'px')
      nav.style.setProperty('--nav-ch', (vide || a > 0 ? 0 : b) + 'px'); nav.style.setProperty('--nav-cb', (vide || a <= 0 ? 0 : hNav - a) + 'px')
      nav.classList.toggle('nav--sombre', !vide && a <= hNav / 2 && b >= hNav / 2)
    }
    var demander = function () { if (!tBande) { tBande = true; requestAnimationFrame(bande) } }
    var observer = function () {
      if (obs) obs.disconnect()
      dessous.clear(); cle = ''
      hNav = Math.max(1, Math.round(nav.offsetHeight))
      obs = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) dessous.add(e.target); else dessous.delete(e.target) })
        demander()
      }, { rootMargin: '0px 0px -' + Math.max(0, innerHeight - hNav) + 'px 0px' })
      sombres.forEach(function (s) { obs.observe(s) })
    }
    requestAnimationFrame(observer)
    // en capture : le défilement horizontal d'un rail (qui ne remonte pas jusqu'à window) déplace aussi ses photos sous la nav
    addEventListener('scroll', function () { if (dessous.size || cle !== hNav + ',' + hNav) demander() }, { passive: true, capture: true })
    addEventListener('resize', function () { clearTimeout(tRes); tRes = setTimeout(observer, 150) })
  }

  // Le travelling des réalisations (bureau ≥ 1024 px, view(), mouvement permis — les mêmes conditions que kit.css) : le compteur
  // donne la photo la plus proche du centre de l'écran, et seule une photo entière montre sa légende. Une mesure par image, et
  // seulement quand la scène est à l'écran.
  var trav = d.querySelector('.travelling')
  if (trav && !reduit && matchMedia('(min-width: 1024px)').matches && window.CSS && CSS.supports('animation-timeline: view()') && 'IntersectionObserver' in window) {
    var photos = trav.querySelectorAll('.galerie__item'), piste = trav.querySelector('.compteur__piste'), tAtt = false, actif = false
    trav.classList.add('pilote')
    // vague 3 : l'épaisseur d'un objet posé (kit.css → relief-3d) — chaque photo pivote de quelques degrés selon son écart au
    // centre de l'écran (--e, de -1,2 à 1,2 : × 5° dans kit.css, donc 6° au plus), recule de 48 px au plus (--p, borné à 1) et porte
    // son ombre du côté qui s'éloigne (--s). Souris fine seulement.
    var relief3d = matchMedia('(hover: hover) and (pointer: fine)').matches
    if (relief3d) trav.classList.add('relief-3d')
    var suivre = function () {
      tAtt = false
      var cx = innerWidth / 2, k = 0, mieux = Infinity
      photos.forEach(function (it, i) {
        var r = it.getBoundingClientRect(), centre = r.left + r.width / 2 - cx, ecart = Math.abs(centre)
        if (ecart < mieux) { mieux = ecart; k = i }
        it.classList.toggle('entier', r.left >= -1 && r.right <= innerWidth + 1)
        if (relief3d) {
          var e = Math.max(-1.2, Math.min(1.2, centre / cx))
          it.style.setProperty('--e', e.toFixed(3)); it.style.setProperty('--p', Math.min(1, Math.abs(e)).toFixed(3)); it.style.setProperty('--s', e < 0 ? '-1' : '1')
        }
      })
      if (piste) piste.style.setProperty('--k', k)
    }
    new IntersectionObserver(function (es) { actif = es[0].isIntersecting; if (actif) requestAnimationFrame(suivre) }).observe(trav)
    addEventListener('scroll', function () { if (actif && !tAtt) { tAtt = true; requestAnimationFrame(suivre) } }, { passive: true })
    addEventListener('resize', function () { if (actif) requestAnimationFrame(suivre) })
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

  // Le relief du héros (vague 3) : ordinateur à souris, mouvement permis, ≥ 1024 px, workers et OffscreenCanvas, ET une carte
  // graphique que CETTE page a le droit d'utiliser — sinon rien n'est demandé et la photo reste telle quelle.
  // La présence des interfaces ne prouve rien : lancé avec --disable-webgl --disable-3d-apis (ou carte en liste noire), le fil
  // principal n'obtient aucun contexte, mais un OffscreenCanvas dans un worker en obtient un (juge du 15/09 : Chromium et Chrome 152).
  // D'où une sonde ici, sur une toile de 1 px : elle ne demande que « la page a-t-elle droit à un contexte ? ». Le rendu logiciel
  // (SwiftShader, llvmpipe…) est refusé par son nom dans le worker : failIfMajorPerformanceCaveat ne l'écarte pas partout. Lire ce
  // nom ici et rendre le contexte dans la même tâche coûtait 30 ms de plus (tâche de 108 ms sur un navigateur neuf, 15/09) : la
  // sonde passe dans un moment libre, et le contexte est rendu dans la tâche suivante.
  // Le PREMIER contexte WebGL d'un navigateur fraîchement lancé coûte 370 à 410 ms (la carte s'initialise ; Intel/D3D11, 15/09) ;
  // les suivants, 4 à 40 ms. Sur le fil principal, ce serait une tâche longue : le fil de rendu (relief-fil.js) naît donc d'abord
  // et ouvre, hors du fil principal, un contexte d'1 px qu'il rend aussitôt (message « sonde », rendu logiciel refusé) ; la sonde
  // d'ici ne passe qu'après, à chaud. Pas de worker en URL blob : la CSP de production (next.config.mjs) dit worker-src 'self'.
  // Sans WebGL, seule la requête de relief-fil.js part (≈ 4 Ko compressés) : ni relief.js, ni la carte, ni la photo du relief.
  // Sans réponse en 4 s, ou worker impossible : pas de relief (jamais de sonde à froid ici).
  // Accepté, le worker est passé à relief.js (hero.reliefFil), injecté en <script type="module"> dans la tâche suivante (pas de
  // import() : ce fichier reste lisible par un vieux navigateur). data-relief-etat : « sans » (refusé), puis « pret » ou « echec ».
  var heroRelief = d.querySelector('.hero--plein[data-relief]')
  if (heroRelief && 'IntersectionObserver' in window && 'ResizeObserver' in window && 'Worker' in window && ('WebGL2RenderingContext' in window || 'WebGLRenderingContext' in window) && window.HTMLCanvasElement && 'transferControlToOffscreen' in HTMLCanvasElement.prototype && matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
    var reliefSonde = function () {
      try {
        var c = d.createElement('canvas'); c.width = c.height = 1
        return c.getContext('webgl', { failIfMajorPerformanceCaveat: true, alpha: false, antialias: false, depth: false, stencil: false })
      } catch (e) { return null }
    }
    var reliefGo = function () {
      var fil = null, tFin = 0, fait = false
      var conclure = function (gl) {
        setTimeout(function () {
          if (!gl) { if (fil) fil.terminate(); heroRelief.setAttribute('data-relief-etat', 'sans'); return }
          var perdre = gl.getExtension('WEBGL_lose_context'); if (perdre) perdre.loseContext()
          heroRelief.reliefFil = fil
          setTimeout(function () { var s = d.createElement('script'); s.type = 'module'; s.src = heroRelief.getAttribute('data-relief'); d.head.appendChild(s) }, 0)
        }, 0)
      }
      var decider = function (possible) {
        if (fait) return
        fait = true; clearTimeout(tFin)
        if (!possible) return conclure(null)
        // à chaud (le worker garde son contexte d'1 px ouvert jusqu'à l'init), et dans un moment libre
        var sonder = function () { conclure(reliefSonde()) }
        if ('requestIdleCallback' in window) requestIdleCallback(sonder, { timeout: 800 }); else setTimeout(sonder, 50)
      }
      try {
        fil = new Worker(heroRelief.getAttribute('data-relief-fil'))
        fil.onmessage = function (e) { decider(!!(e.data && e.data.type === 'sonde' && e.data.ok)) }
        fil.onerror = function () { decider(false) }
        tFin = setTimeout(function () { decider(false) }, 4000)
        fil.postMessage({ type: 'sonde' })
      } catch (e) { decider(false) }
    }
    // 1,2 s au plus d'attente d'un moment libre : à 2,5 s, sous charge, le relief n'était pas encore visible 4,6 s après l'arrivée
    var reliefApresLoad = function () { if ('requestIdleCallback' in window) requestIdleCallback(reliefGo, { timeout: 1200 }); else setTimeout(reliefGo, 300) }
    if (d.readyState === 'complete') reliefApresLoad(); else addEventListener('load', reliefApresLoad)
  }

  var media = d.querySelector('.hero--plein .hero__media img')
  if (media && !reduit && matchMedia('(min-width: 900px)').matches && !(choregraphie && media.closest('.ouverture'))) {
    var attendu = false
    var parallaxe = function () { var y = Math.min(scrollY, innerHeight); media.style.translate = '0 ' + (y * 0.16).toFixed(1) + 'px'; attendu = false }
    addEventListener('scroll', function () { if (!attendu) { attendu = true; requestAnimationFrame(parallaxe) } }, { passive: true })
  }

  // La ligne des étapes ne mesure rien tant que la liste n'approche pas de l'écran : lue au chargement, sa position force
  // une mise en page complète d'une page longue (longues tâches de 260 ms dans site.js, TBT 241 ms sur mobile, 14/09).
  // Quand la liste est proche, une seule mesure par image (rAF), jamais plus.
  var liste = d.querySelector('.etapes__liste')
  // étapes épinglées (kit.css v26, écran d'au moins 680 px de haut) : chaque numéro suit sa tranche de la timeline en CSS
  if (liste && choregraphie && liste.closest('#etapes') && matchMedia('(min-height: 680px)').matches) liste = null
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
  // montre l'état « demande reçue » et redit qu'aucune donnée n'a été envoyée. Chez un vrai artisan, c'est la messagerie de l'artisan.
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

;
/* recit.js — famille « recit » (vague 5, 021-03) : les chiffres du plateau se gagnent une fois la citation lue.
   Bureau chorégraphié seulement (mêmes conditions que recit.bureau.css) : le bloc .chiffres attend à opacité 0 que le dernier mot
   de la citation soit plein ET que le bloc soit entier à l'écran ; 0,3 s après, il entre et chaque nombre se compte de 0 à sa
   valeur en 1,3 s décélérées, une seule fois. Au temps, jamais au défilement : un nombre figé à mi-course serait un faux chiffre.
   Si ce script échoue avant de poser l'attente, les valeurs finales restent affichées. */
(function () {
  var d = document, bureau = matchMedia('(min-width: 1024px)')
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !bureau.matches || !(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) || !('IntersectionObserver' in window)) return
  var bloc = d.querySelector('.chiffres'), mots = d.querySelectorAll('.citation__mot')
  if (!bloc || !mots.length) return
  var dernier = mots[mots.length - 1]
  var valeurs = [].map.call(bloc.querySelectorAll('.chiffre__valeur'), function (v) {
    var vrai = v.querySelector('.chiffre__vrai'), texte = vrai ? vrai.textContent.trim() : ''
    return { compte: v.querySelector('.chiffre__compte'), fin: /^\d{1,7}$/.test(texte) ? Number(texte) : NaN }
  })
  // une valeur qui n'est pas un entier (« 4,8 », « 1 200 ») ou un compte absent : rien ne bouge, les valeurs restent affichées
  if (!valeurs.length || valeurs.some(function (v) { return !v.compte || isNaN(v.fin) })) return

  var PASSIF = { passive: true }, etat = 0, prevu = false, filet = 0, calme = 0 // etat : 0 attente, 1 départ pris, 2 fini
  bloc.classList.add('chiffres--attente')

  // cubic-bezier(.16,1,.3,1), la courbe d'entrée du kit : x(t) résolu par bissection ; avec ces points, y(t) = 1 − (1 − t)³
  function courbe(x) {
    var a = 0, b = 1, t = x
    for (var k = 0; k < 24; k++) { t = (a + b) / 2; if (3 * (1 - t) * (1 - t) * t * 0.16 + 3 * (1 - t) * t * t * 0.3 + t * t * t < x) a = t; else b = t }
    return 1 - (1 - t) * (1 - t) * (1 - t)
  }
  function ecouter(oui) {
    var f = oui ? 'addEventListener' : 'removeEventListener'
    window[f]('scroll', defile, PASSIF); window[f]('pointermove', bouge, PASSIF); window[f]('resize', planifier)
  }
  function arreter() { clearTimeout(filet); io.disconnect(); ecouter(false) }
  // au plus une mesure par image, et seulement quand le bloc est près de l'écran (les écouteurs n'existent qu'à ce moment-là)
  function planifier() { if (!prevu && !etat) { prevu = true; requestAnimationFrame(verifier) } }
  function bouge() { calme = performance.now() }
  function defile() { calme = performance.now(); planifier() }
  function verifier() {
    prevu = false
    if (etat) return
    var r = bloc.getBoundingClientRect()
    var entier = r.height > 0 && ((r.top >= -0.5 && r.bottom <= innerHeight + 0.5) || (r.top <= 0 && r.bottom >= innerHeight))
    // le filet part quand le bloc devient entier à l'écran, et repart de zéro dès qu'il cesse de l'être
    if (!entier) { clearTimeout(filet); filet = 0; return }
    if (!filet) { calme = performance.now(); filet = setTimeout(guetter, 4000) }
    // l'opacité calculée du dernier mot, pas un calcul tiré du défilement : c'est ce que le visiteur voit
    if (Number(getComputedStyle(dernier).opacity) >= 0.98) { etat = 1; arreter(); setTimeout(function () { requestAnimationFrame(lancer) }, 300) }
  }
  // Le filet : 4 s de bloc entier sans défilement ni souris, et toujours pas de départ (citation figée, animation absente) —
  // alors les valeurs finales d'un coup, sans compter. Un visiteur qui avance ne se le fait pas voler : en 1088×800, le bloc est
  // entier dès y = 660 et la citation pleine vers y = 750 ; arrêté 3 s puis reparti, il aurait eu le filet au lieu du comptage.
  function guetter() {
    if (etat) return
    var reste = calme + 4000 - performance.now()
    if (reste > 20) filet = setTimeout(guetter, reste); else montrer()
  }
  function montrer() { if (etat) return; etat = 2; arreter(); bloc.classList.remove('chiffres--attente') }
  function lancer() {
    valeurs.forEach(function (v) { v.compte.textContent = '0' }) // le premier nombre dès la première image
    bloc.classList.remove('chiffres--attente'); bloc.classList.add('chiffres--entre', 'chiffres--compte')
    // Le temps part de l'image suivante, quand « 0 » est à l'écran : celle-ci recalcule les styles de l'entrée et dure souvent le
    // double des autres (279 ms contre 120), ce qui raccourcissait le comptage vu (1 139 ms au juge du 15/09, 18 h). Ce qu'une
    // image écrit ne se voit qu'à la suivante : chaque nombre est celui de cet instant-là, et le compte se vide à l'image dont
    // l'affichage tombe au plus près de 1 300 ms (sans cela, des images de 270 ms le faisaient glisser à 1 572 ms, 17 h 38).
    var debut = -1, avant = 0
    requestAnimationFrame(function image() {
      var maintenant = performance.now()
      if (debut < 0) debut = avant = maintenant
      var pas = maintenant - avant || 16.7, vu = maintenant - debut + pas
      avant = maintenant
      if (vu + pas / 2 >= 1300 || !bureau.matches) return finir()
      var e = courbe(vu / 1300)
      valeurs.forEach(function (v) { v.compte.textContent = String(Math.round(v.fin * e)) })
      requestAnimationFrame(image)
    })
  }
  // retour à l'état initial : compte vidé, vraie valeur visible (même place, même largeur)
  function finir() {
    etat = 2
    valeurs.forEach(function (v) { v.compte.textContent = '' })
    bloc.classList.remove('chiffres--compte')
  }

  var io = new IntersectionObserver(function (es) {
    if (es[es.length - 1].isIntersecting) { ecouter(true); planifier() }
    else { ecouter(false); clearTimeout(filet); filet = 0 }
  }, { rootMargin: '10% 0px' })
  io.observe(bloc)
})()

;
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

;
/* survol.js — famille « survol » (021-06, cahier §3.3). Au bureau à la souris, un grand aperçu posé au-dessus de la ligne survolée,
   jamais sur le titre lu (photo sombre sous titre sombre), un texte ou un numéro ; suivi amorti, volet, bouton au clavier.
   Téléphone, tactile, sans JavaScript : ce script ne touche à rien, le survol CSS de kit.css reste. */
(function () {
  var d = document, sec = d.getElementById('prestations'), ol = sec && sec.querySelector('ol.presta')
  if (!ol || !matchMedia('(min-width:1024px) and (hover:hover) and (pointer:fine)').matches) return
  var calme = matchMedia('(prefers-reduced-motion:reduce)').matches, V = [], actif = -1, clavier = 0, neuf, mesurer = 1, boucle, t0
  var cx = 0, cy = 0, px = 0, py = 0, tx = 0, ty = 0, xg, xd, w, h, marge = 0
  ;[].forEach.call(ol.children, function (li) {
    var el = li.querySelector('.presta__vignette'), h3 = li.querySelector('h3'), k = V.length, b = d.createElement('button')
    if (!el || !h3) return
    // le titre devient un bouton au même texte, donc au même nom accessible ; aucun lien, aucun appel de plus
    b.type = 'button'; b.className = 'presta__declencheur'; b.setAttribute('aria-pressed', false); b.textContent = h3.textContent
    h3.textContent = ''; h3.appendChild(b)
    b.onfocus = function () { if (b.matches(':focus-visible')) ouvrir(k, 1) }
    b.onclick = function () { ouvrir(k, actif != k || clavier) }
    b.onblur = function () { if (actif == k && clavier) fermer() }
    b.onkeydown = function (e) { if (e.key == 'Escape' && actif == k) fermer() }
    V.push({ li: li, el: el, h3: h3, te: li.querySelector('.presta__texte'), img: el.querySelector('img'), b: b, sx: 0, sy: 0, fin: 0 })
  })
  if (!V.length) return
  sec.classList.add('scene--survol')
  if (calme) sec.classList.add('survol--calme')

  // à moins d'un écran, la vraie taille remplace les 11rem du HTML : la 720 est chargée et décodée avant le premier survol
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return
      io.disconnect()
      sec.querySelectorAll('.presta__vignette source,.presta__vignette img').forEach(function (e) { e.sizes = '(max-width: 767px) 80vw, min(24vw, 26rem)' })
      // une tâche plus tard, la nouvelle source est choisie : decode() sur l'ancienne serait rejeté
      setTimeout(function () { V.forEach(function (v) { v.img && v.img.decode().catch(Boolean) }) })
    }, { rootMargin: '100% 0px' })
    io.observe(sec)
  }

  // la boucle ne repart de zéro qu'après un arrêt : entre deux images, dt reste le temps réel (voir image)
  function lancer() { if (!boucle) { t0 = 0; boucle = requestAnimationFrame(image) } }
  function sortir(v, sens, t) {
    v.el.classList.remove('est-ouverte'); v.b.setAttribute('aria-pressed', false); v.fin = t + 250
    if (calme) return
    sens ? v.el.setAttribute('data-sens', sens) : v.el.removeAttribute('data-sens')
    v.el.classList.add('est-sortie'); clearTimeout(v.t)
    // fermée, la vignette revient sans transition au volet du milieu : la prochaine entrée s'ouvre du centre
    v.t = setTimeout(function () { v.el.classList.remove('est-sortie') }, 250)
  }
  function ouvrir(k, kb) {
    var v = V[k], t = performance.now()
    clavier = kb
    if (k != actif) {
      // rien de visible : l'aperçu naît à sa place au lieu de voler depuis l'ancienne, et les bornes sont relues
      if (actif < 0 && !V.some(function (x) { return x.fin > t })) neuf = mesurer = 1
      if (actif > -1) sortir(V[actif], k > actif ? 'b' : 'h', t)
      actif = k; clearTimeout(v.t)
      v.el.classList.remove('est-sortie'); v.el.classList.add('est-ouverte'); v.b.setAttribute('aria-pressed', true)
    }
    lancer()
  }
  function fermer(sens) { if (actif > -1) { sortir(V[actif], sens, performance.now()); actif = -1 } }

  // une image : les lectures, puis les écritures ; plus aucune image dès que l'aperçu est à 0,5 px de sa cible
  function image(t) {
    // dt mesuré, pas 1/60 : Chromium sans carte graphique tourne à 15-40 images/s, et un pas figé ralentissait le suivi d'autant
    var dt = t0 ? Math.min(t - t0, 500) / 1e3 : 1 / 60, fixe = clavier || calme, ro, k, i
    boucle = 0; t0 = t
    if (mesurer) {
      mesurer = 0
      k = getComputedStyle(V[0].el); w = parseFloat(k.width); h = parseFloat(k.height)
      // la place au-dessus de la 1re ligne : l'aperçu, borné au haut de la section, descendait sur le titre de la ligne 1 (en-tête
      // de 347 px pour un aperçu de 432 à 1440). La liste s'écarte de l'en-tête de ce qui manque ; la marge se fond avec celle de
      // l'en-tête (blocs frères), d'où la mesure après chaque écriture. Au chargement, aux polices et au redimensionnement seulement
      for (i = 0; i < 3; i++) {
        k = h + 12 - (ol.getBoundingClientRect().top - sec.getBoundingClientRect().top)
        if (k > 0) marge += Math.ceil(k); else if (k < -2 && marge) marge = Math.max(0, marge + Math.ceil(k)); else break
        ol.style.setProperty('--sv-marge', marge)
      }
      // en x, repère de la liste : du plus à gauche des titres (le titre survolé glisse de 1,2 vw) au bord des textes − 12 px − l
      ro = ol.getBoundingClientRect(); xg = xd = 1e9
      V.forEach(function (v) { xg = Math.min(xg, v.h3.getBoundingClientRect().left); if (v.te) xd = Math.min(xd, v.te.getBoundingClientRect().left) })
      xg -= ro.left; xd -= ro.left + 12 + w
    }
    ro = ro || ol.getBoundingClientRect()
    if (actif > -1) {
      tx = fixe ? xg : Math.max(xg, Math.min(cx - ro.left - w / 2, xd))
      ty = Math.max(sec.getBoundingClientRect().top, V[actif].li.getBoundingClientRect().top - 10 - h) - ro.top
    }
    // le poids : 1 − e^(−5·dt), le 0,08 par image de Codrops à 60 Hz quelle que soit la cadence ; clavier et mouvement réduit : posé
    k = neuf || fixe ? 1 : 1 - Math.exp(-5 * dt); neuf = 0
    px += (tx - px) * k; py += (ty - py) * k
    var ecart = Math.abs(tx - px) > .5 || Math.abs(ty - py) > .5
    if (!ecart) { px = tx; py = ty }
    // rotation : écart au curseur × 0,02, soit la vitesse de l'aperçu sur sa constante de temps (0,2 s) × 0,02, bornée à ±4°
    var sr = Math.max(-4, Math.min(4, (tx - px) / 50)).toFixed(2), vives = V.filter(function (v, i) { return i == actif || !fixe && v.fin > t })
    // origine réelle : une ligne transformée par « monte » reste le bloc conteneur malgré position:static ; centre affiché − l/2 −
    // translation posée (la rotation tourne autour du centre)
    vives.forEach(function (v) { var r = v.el.getBoundingClientRect(); v.ox = (r.left + r.right - w) / 2 - v.sx; v.oy = (r.top + r.bottom - h) / 2 - v.sy })
    vives.forEach(function (v) {
      var s = v.el.style
      s.setProperty('--sx', v.sx = Math.round((ro.left + px - v.ox) * 100) / 100)
      s.setProperty('--sy', v.sy = Math.round((ro.top + py - v.oy) * 100) / 100)
      s.setProperty('--sr', sr)
    })
    // l'image suivante garde t0 : son dt est l'intervalle réel
    if (ecart && vives.length) boucle = requestAnimationFrame(image)
  }

  function suivre(e) {
    if (e.pointerType != 'mouse') return
    var k = V.findIndex(function (v) { return v.li.contains(e.target) })
    cx = e.clientX; cy = e.clientY
    if (k > -1) ouvrir(k, 0)
  }
  // pointerover aussi : quand la page défile sous un curseur immobile, lui seul annonce la nouvelle ligne
  ol.addEventListener('pointerover', suivre, { passive: true })
  ol.addEventListener('pointermove', suivre, { passive: true })
  ol.addEventListener('pointerleave', function (e) {
    var x = e.clientX - cx, y = e.clientY - cy
    if (e.pointerType == 'mouse' && !clavier) fermer(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'd' : 'g') : y > 0 ? 'b' : y < 0 ? 'h' : '')
  })
  addEventListener('scroll', function () { if (actif > -1) lancer() }, { passive: true })
  // la marge et les bornes : dès la première image (section encore loin), puis quand les polices ou la largeur changent l'en-tête
  addEventListener('resize', function () { mesurer = 1; lancer() })
  if (d.fonts) d.fonts.ready.then(function () { mesurer = 1; lancer() })
  lancer()
})()
