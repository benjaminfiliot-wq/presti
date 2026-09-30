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
