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
