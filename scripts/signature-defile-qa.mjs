// scripts/signature-defile-qa.mjs — le juge de la tâche 020-03 : la DESCENTE au défilement du moment signature de la démo Atelier
// Lestraque (https://prestiapp.fr/sites-demo/lestraque/index.html). Au bureau, au premier coup de molette, le regard plonge vers le
// puits de l'escalier : palier de 30svh, zoom 1 → 1,04 vers l'œil, surtitre et pied effacés sur 25svh, avancée de caméra δ jusqu'à
// δmax dans le shader du relief (WebGL 2 et texture 2880), sans roulis ; le geste au repos ne change pas.
// Cahiers (lecture seule) : .orchestre/preuves/021-00/cahier-vague-5.md (« vague 5 ») §3.5 ligne 020-03 et « Seuil de D-15 », §6.6,
// §7.2 « 020-03 » ; .orchestre/preuves/020-01/cahier/cahier-des-charges.md (« cahier 020 ») §2, §5, §6, §7.3 bloc 2, §7.4, §7.5,
// §8.0, §8.2, §8.3, §11 « Tâche 020-03 ».
//
// Le juge génère le site dans une copie (node public/sites-demo/generer.mjs lestraque --sortie=.orchestre/travail/
// signature-defile-<pid>), plus une page témoin sans descente (même commande avec --da sans relief.descente, dossier
// …-<pid>-reference) ; les deux sont effacées à la sortie. Il les sert en local avec les en-têtes de production (CSP lue dans
// next.config.mjs), capture et mesure tout lui-même. Ses mesures (mesures.json), sa référence de D-15 (d15-reference.json) et ses
// images vont dans .orchestre/preuves/020-03/juge/.
//
// CRITÈRES (identifiant — mesure — seuil — origine)
//   PRÉALABLE  da.json → lestraque.relief.descente présent et roulisParDelta = 0 ; data-relief-descente sur le héros généré
//              (decisions.md:61 : ρ = 0 ; attribut posé par 021-01).
//   D-1   sans carte graphique, 1440×900 et 1280×800 (valeurs × h/900), scrollTo puis 400 ms : haut du plateau 1170 / 900 / 652 /
//         405 / 0 aux y 0 / 270 / 518 / 765 / 1170 (= 1,30 h − y) à ±1 px ; opacité de .hero__contenu 1 / 1 / 0,50 / 0 aux y 0 /
//         270 / 518 / 765 à ±0,02 ; voile (::after du héros) 0,30 à y = 765 et 0,60 à y = 1170 à ±0,02 ; margin-top du plateau
//         = 0,30 h ±1 px ; hauteur de .ouverture = héros + plateau + 0,30 h ±1 px (2158 en 1440×900 avec le plateau de 988 px
//         d'aujourd'hui) — cahier 020 §2 et §8.2 D-1 (cdc-en-ligne.json → palier30svh).
//   D-2   sans carte, 1440×900 : opacité du surtitre (.h1__cle) et du pied (.hero__pied) ≥ 0,98 à y = 0 (2 s après le chargement) ;
//         0,50 ±0,05 à y = 112 ; ≤ 0,01 et visibility:hidden à y = 225 et 270 — §8.2 D-2 (cdc-css-test.json).
//   D-3   sans carte, 1440×900 : top de .h1__ligne à ±0,5 px de sa valeur à y = 0 pour y ∈ {90, 180, 270} ; opacité du contenu
//         ≥ 0,99 — §8.2 D-3.
//   D-4   un seul appel visible : nav-retenue-qa.mjs PASS — §8.2 D-4. Lu dans la chaîne signature-relief-qa.mjs →
//         signature-repos-qa.mjs (son point 7) → nav-retenue-qa.mjs.
//   D-5   contraste p90 du fond du titre (§8.0 : texte rendu transparent, 1,05/(L90 + 0,05)), 1280×800, 1366×768 et 1440×900,
//         sans et avec carte, y ∈ {0 ; 0,10 h ; 0,20 h ; 0,30 h} × 8 instants du cycle au repos (t = 0 à 17,5 s par pas de 2,5 s,
//         animations au temps figées), là où l'opacité du contenu est ≥ 0,5 : ≥ 3,0 — §8.2 D-5 (WCAG 2.2, 1.4.3).
//   D-6   avec carte, 1440×900 : compte.descente = clamp(y/270) ±0,01 à y ∈ {0 ; 135 ; 270 ; 540} ; après scrollTo(0, 3000) puis
//         scrollTo(0, 0), descente = 0 en moins de 200 ms ; même saut pendant l'onglet caché simulé (§8.0, témoin : un message
//         « actif » = false), mesuré après la réactivation — §8.2 D-6.
//   D-7   compte.dmax, une fois la texture 2880 téléversée : dmax1 ±0,002 à dpr 1 et dmax15 ±0,002 à deviceScaleFactor 1,5 (valeurs
//         de da.json) ; 2880 bloquée par page.route : 0 ; --disable-webgl2 avec le témoin compte.webgl2 = false : 0 (témoin vrai :
//         branche déclarée non testée, §8.0) — §8.2 D-7.
//   D-8   budget de grossissement recalculé par le juge pour le dmax lu (modèle proto7.mjs:19-24, grille 64 × 40 de
//         relecture/bornes-et-budget.mjs recopiée de .orchestre/preuves/020-01/descente/avant-correction/budget.mjs), facteurs E_b
//         (transform calculé de la toile) × 1,06 × 1,04 × dpr de toile × largeur de la toile / largeur de la texture (compte) :
//         p90 ≤ 1,53 à dpr 1 et à dpr 1,5 — §8.2 D-8, §6.
//   D-9   netteté en fin de palier : variance du laplacien, zone bois x 900-1400 y 120-420, toile à y = 270 ≥ 0,68 × photo à y = 0 —
//         §8.2 D-9, « indicatif » : consignée, jamais bloquante.
//   D-10  inversion : la boucle de Newton du §7.5 portée en JS contre une dichotomie du même modèle, grille 64 × 48 sur 1440×1080,
//         δ ∈ {0,03 ; 0,06 ; 0,09 ; dmax1} : erreur × 1080 ≤ 0,5 px en double précision ; en demi-précision simulée
//         (Math.f16round à chaque opération) ≤ 0,5 px, sinon le shader généré doit forcer highp (« si la demi-précision échoue,
//         forcer highp ») ; le shader déclare uDelta, uRoulis, uRW et uGamma — §8.2 D-10, §7.5.
//   D-11  avec carte, 1440×900, dpr 1 et 1,5 : défilement continu de 600 px (témoin ≥ 100 changements de scrollY) :
//         compte.latences p95 ≤ 34 ms et maximum ≤ 50 ms ; 100 ms après la fin, derniereDescenteDessinee = descente() de la page
//         (±0,001) — §8.2 D-11.
//   D-12  pendant D-11 : 0 tâche longue > 50 ms (PerformanceObserver longtask) — §8.2 D-12.
//   D-13  remplacé par R-15 (§8.2) : contexte perdu (hero.reliefFil.onmessage({data:{type:'perdu'}})) pendant le fondu d'apparition,
//         puis 3 s après l'état prêt : photo jamais visibility:hidden à +0 et +1 000 ms ; pendant le fondu, toile encore dans le DOM
//         avec une opacité strictement entre 0 et 1 ; toile retirée à +1 100 ms — §8.1 R-15.
//   D-14  à y = 300 en 1440×900, passage en 1000×800 : descente = 0 en 300 ms au plus ; retour en 1440×900 : descente = 1 en 300 ms au
//         plus ; puis R-16 : part > 8 < 0,05 — §8.2 D-14, §8.1 R-16.
//   D-15  la descente se voit : appariement de blocs de 16 px (réduction grise de 160 px, pas de 2, SAD, recherche ±32, affinage
//         parabolique ; blocs dont l'appariement touche la limite exclus), médiane du déplacement dans la zone de l'œil (carré de
//         48 px réduits centré sur l'œil, sous la barre, au-dessus du h1) et dans celle des nez de marche (x 150-500, y 120-420),
//         entre y = 0 et y = 0,30 h, 1440×900, animations au temps figées : ≥ 0,9 × la même mesure faite par le juge sur le film
//         retenu, dans chaque zone — vague 5 §3.5 « Seuil de D-15 » ; cahier 020 l.782-785 ; méthode de
//         .orchestre/preuves/020-01/descente/avant-correction/d15.mjs.
//   R-4   à y = 0,30 h, feuille magenta de test (§8.1 R-4), rotation à ses deux extrêmes et poussée à 1 : sans carte en 1088×800,
//         1280×800, 1366×768, 1440×900, 1920×1080, 1920×1200 et 2560×1080 ; avec carte en 1440×900 ; barres de défilement visibles
//         en 1440×900 et 1088×800 : 0 pixel magenta (|R − 255| < 40, G < 60, |B − 255| < 40) ; témoin : photo cachée → magenta.
//   R-6   mouvement réduit, 1440×900 : 0 requête dont l'URL contient « relief » ; rotate de la photo = none ; aucune animation
//         signature-* ; haut du plateau = h ±1 px à y = 0 — §8.1 R-6.
//   R-7   (partie palier) téléphone 390×844, dpr 3 : margin-top du plateau = 0 — §8.1 R-7, §4 « rien ne change au téléphone ».
//   R-8   sans JavaScript, 1440×900 : rotate de la photo = none ; aucune animation signature-* sur la photo ; haut du plateau à
//         y = 0 = 1,30 h ±1 px (1170) ; opacité du pied à y = 225 ≤ 0,01 — §8.1 R-8, §8.2 « R-8 complet ».
//   P-1   Lighthouse mobile : node scripts/lighthouse-mediane.mjs <copie> (5 passes, brotli, CSP) → code 0 (performance ≥ 95, LCP
//         < 2 500 ms, TBT < 200 ms, CLS < 0,1, accessibilité, bonnes pratiques et SEO ≥ 95) — vague 5 §5.1, qui remplace la
//         référence c62c866 du §8.3.
//   P-2   croissance de styles.css ≤ 1 000 octets en brotli 11 : styles.css généré contre le même fichier dont kit.css est remis à
//         son état du commit e556a5d (avant 020-03) — §8.3 P-2.
//   P-3   node scripts/site-qa.mjs <copie> --statique : aucun échec absent du même juge sur le site en place
//         (public/sites-demo/lestraque) — §8.3 P-3 (« un échec déjà présent n'est pas imputé à l'exécutant »).
//   P-4   avec carte, 1440×900, dpr 1 et 1,5, relief prêt : 20 s au repos, puis pendant D-11 : compte.dureeP95 ≤ 16,7 ms ; 0 tâche
//         longue ; p95 des intervalles de requestAnimationFrame du fil principal ≤ 20 ms — §8.3 P-4.
//   REPOS geste au repos intact : node scripts/signature-relief-qa.mjs PASS ; il lance lui-même signature-repos-qa.mjs, qui lance
//         nav-retenue-qa.mjs (D-4) : un seul lancement couvre les trois juges.
//
// CHOIX DU JUGE (le cahier est ambigu ou impossible à la lettre)
//   1. D-15 sans carte : la référence est descente-sansgpu.mp4, pas descente-d116.mp4. Sans WebGL, δ = 0 par construction (cahier
//      020 §2, formule de δ, et §5) : le seuil tiré du film à δ 0,116 échouerait toujours. Avec carte, la référence est
//      descente-d116.mp4 (vague 5 §3.5). Images du film : n° 0 (y = 0) et n° y270.imageDuFilm de controle-film-*.json (y = 270).
//      Le haut du h1 de la zone de l'œil est lu dans mesures-*.json pour le film, et mesuré sur la page pour la page.
//   2. D-5 : un format dont le repos (y = 0) est déjà sous 3,0 à l'un des 8 instants n'est pas jugé ; ses valeurs sont consignées.
//      Aujourd'hui, 1366×768 est à 2,69 au repos, sans rien défiler (sonde du 15/09). Le rapport de la descente l'annonçait : « il
//      faudra traiter le dégradé (bloc 1 bis) avant de juger la descente sur ce format » (020-01/descente/avant-correction/rapport.md),
//      et le geste au repos est interdit à 020-03. Dès que le repos tient 3,0, le format est jugé.
//   3. D-1 : la hauteur de .ouverture est jugée comme « héros + plateau + 0,30 h ». Le « 2158 × 800/900 » ne tient pas en 1280×800 :
//      le plateau ne se met pas à l'échelle de h (887 px en 1280×800, 988 en 1440×900).
//   4. D-6, onglet caché : le saut part de y = 270 (descente = 1), va à 3000 puis revient à 0 pendant l'onglet caché. Sinon la valeur
//      d'avant le masquage vaudrait déjà 0 et la valeur périmée ne se verrait pas.
//   5. D-11 : le défilement continu est posé par la page elle-même, avec scrollTo de 5 px à chaque image sur 120 images. Sous la
//      charge de la machine, page.mouse.wheel(0, 5) n'a donné que 70 changements en 2 s et Input.synthesizeScrollGesture 4 (sonde du
//      15/09) : le témoin de 100 changements était inatteignable. La durée n'est pas imposée : sous charge, 120 images ont pris 7,9 s.
//   6. D-13 (R-15) : « 100 ms après prêt » devient « pendant le fondu, dès que l'opacité de la toile est strictement entre 0 et 1 ».
//      Sous charge, la classe du fondu arrive parfois après 100 ms, et la toile serait alors retirée avant d'être montrée.
//   7. D-14 (R-16) : la toile au repos diffère de la photo par construction (marge et creusement du shader) : part > 8 de 0,29 mesurée
//      le 15/09 sans rien redimensionner. R-16 compare donc la toile après l'aller-retour à la toile avant, au même instant figé et
//      à y = 0. Pendant D-14, html{overflow-anchor:none} est injecté : l'ancrage du défilement déplacerait scrollY quand le palier
//      disparaît à 1000 px.
//   8. R-4 à y = 0,30 h : cas 2 (extrêmes de la rotation, poussée à 1) et cas 4 (barres visibles) seulement. Les cas 1 et 3 ne sont
//      pas rejoués : E_b couvre les deux sens, les extrêmes sont le pire instant, et le palier n'ajoute qu'un scale ≥ 1 autour d'un
//      point intérieur.
//   9. D-10 : la référence est une dichotomie de 70 pas du modèle, et non la table de 8 192 valeurs de proto7.mjs, dont
//      l'interpolation ajouterait sa propre erreur.
//  10. Le geste au repos (REPOS, avec D-4), P-3 et P-1 ne tournent que si tous les autres critères passent (sinon « non lancés »),
//      sauf avec --tout, comme site-qa.mjs. Ils coûtent un quart d'heure : 8 min pour signature-repos-qa.mjs sous charge le 15/09,
//      cinq minutes et le verrou pour Lighthouse. Ils ne changent pas un verdict déjà rouge. Lancé en parallèle des mesures au
//      premier essai, signature-relief-qa.mjs est tombé sur un « compte » attendu 3 s : la charge de ce juge l'aurait fait échouer.
//      P-3 tourne en --statique : Lighthouse est P-1, servi en brotli, et la série sans compression n'est plus une référence
//      (vague 5 §5.1). P-1 n'est pas lancé passé 23 min de juge (échec « non mesuré ») : le plafond de l'orchestre est de 30 min.
//  11. Mesures de temps sous charge (P-4, D-11, D-12). Sonde du 15/09, 1440×900 avec carte, sans rien toucher : p95 rAF de 33 ms,
//      arrêts de 5 s sur la page ET sur une page vide, tâches longues de 51 à 356 ms. Une barre absolue échouerait donc à cause des
//      autres tâches. Le juge mesure en même temps, dans le même navigateur, une page témoin : le même site généré sans
//      relief.descente.
//      - Si le témoin tient 20 ms au p95 rAF, les barres du cahier s'appliquent telles quelles.
//      - Sinon la machine est chargée, et la page est jugée contre le témoin avec la dispersion de deux pages identiques. Le 15/09,
//        au même code, la page et le témoin ont mesuré 216,6 et 150 ms, soit 44 % d'écart. Barres : p95 rAF ≤ 1,5 × témoin + 3,3 ms
//        (la marge du cahier au-dessus de 16,7 ms) ; tâches longues ≤ 1,5 × témoin + 2.
//      - Latences : 34 et 50 ms tant qu'une trame (p95 rAF du témoin, ou de la page sans témoin) tient 20 ms ; sinon 2 et 3 trames.
//        34 ms valent deux trames à 60 Hz, et le fil du relief ne dessine qu'à la cadence de la machine.
//      - Si le témoin n'est pas prêt en 60 s et que la page dépasse la barre du cahier, la cadence est consignée « non jugée ».
//      - Toute mesure de temps en défaut est refaite après 2 s.
//      - Ces mesures ne tournent que si le fil rend compte de la descente (compte.descente et derniereDescenteDessinee). Sans ces
//        champs, « compte » est déjà en échec, et la cadence ne dirait rien de la descente.
//  12. Ordre : critères de la tâche (mesures figées sans carte, films de référence, captures avec carte, puis mesures de temps), puis
//      REPOS, P-3 et P-1 (choix 10). La durée de chaque étape est consignée dans mesures.json → chrono.
//  13. Tout état d'interface en défaut est remesuré 2 s plus tard, et n'échoue que si le défaut persiste. D'autres tâches et Blender
//      chargent la machine en même temps.
//
// CONTRÔLES À L'ŒIL (non jugés ici ; images produites par ce juge dans .orchestre/preuves/020-03/juge/)
//   - Claude Code regarde palier-y090, -y180, -y270 (1440×900 avec carte) : l'image plonge vers le puits ; surtitre et bouton
//     effacés sans fantôme ; titre immobile et lisible ; « Devis » visible à 180 et à 270 ; bois au moins aussi net que
//     cahier/moment-B-y270.jpg, jamais comme cahier/zoom/D-bois.png.
//   - palier-sansgpu-y240 (1280×800) : zoom léger vers le puits, palier non vide.
//   - plateau-y518, -y765, -y1170, apres-y1270 : plateau avec son ombre haute ; texte qui se lève ; aucune bande de photo sous la
//     barre.
//   - reduit-y270 et tel-y422 : pas de palier.
//   - Benj juge la descente sur film (Q2, décision déjà prise : garder) : ce n'est pas un critère de ce juge.
//
// Usage : node scripts/signature-defile-qa.mjs [--tout]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEMOS = path.join(R, 'public', 'sites-demo')
const TOUT = process.argv.includes('--tout')
const SITE = path.join(R, '.orchestre', 'travail', `signature-defile-${process.pid}`)
const TEMOIN = `${SITE}-reference`, DA_TEMOIN = `${SITE}-reference.json`
const PREUVE = path.join(R, '.orchestre', 'preuves', '020-03', 'juge')
const FILMS = path.join(R, '.orchestre', 'preuves', '020-01', 'descente', 'avant-correction')
const BASE_KIT = 'e556a5d' // le commit d'avant 020-03 : kit.css y est sans bloc 2
const GPU = ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist']
const enfants = []
process.on('exit', () => {
  for (const e of enfants) { try { if (e.exitCode === null) e.kill() } catch { /* déjà fini */ } }
  for (const d of [SITE, TEMOIN, DA_TEMOIN]) fs.rmSync(d, { recursive: true, force: true })
})
const debut = Date.now()
const minutes = () => (Date.now() - debut) / 60000
const echecs = [], faits = [], mesures = { date: new Date().toISOString() }
const chrono = (mesures.chrono = {}), jalon = (nom) => { chrono[nom] = +((Date.now() - debut) / 60000).toFixed(2) }
const nombre = (x, n = 2) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(n) : String(x))
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const resumer = (liste, n = 3) => `${liste.slice(0, n).join(', ')}${liste.length > n ? ` (+${liste.length - n})` : ''}`
let termine = false
const fin = () => {
  if (termine) return
  termine = true
  mesures.dureeMinutes = +minutes().toFixed(1)
  try { fs.mkdirSync(PREUVE, { recursive: true }); fs.writeFileSync(path.join(PREUVE, 'mesures.json'), JSON.stringify(mesures, null, 1)) } catch { /* la preuve ne fait pas le verdict */ }
  faits.push(`durée du juge : ${nombre(minutes(), 1)} min`)
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length
    ? `✗ descente de la signature : FAIL — ${echecs.join(' ; ')}`
    : '✓ descente de la signature : PASS — palier de 30svh, zoom et fondus au défilement, plongée jusqu\'à δmax suivie par le worker sans latence ni roulis, contraste et coins tenus, budget et Lighthouse tenus, geste au repos intact')
  process.exitCode = echecs.length ? 1 : 0
}

// ── outils de mesure ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SANS_TEXTE = '.hero h1,.hero h1 *{color:transparent!important;text-shadow:none!important}'
const MAGENTA = '.hero--plein{background:#f0f!important}.hero--plein .hero__media::after,.hero--plein .hero__media::before,.ouverture .hero--plein::after,.hero__contenu,.nav{display:none!important}'
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const deuxImages = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
const defiler = async (page, y, ms = 400, sansJs = false) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y)
  if (!sansJs) await deuxImages(page)
  if (ms) await page.waitForTimeout(ms)
}
// fige les animations au temps qui bouclent (le geste au repos : pousse, signature-tourne-*, signature-projecteur…) ; les entrées
// finies, les transitions et les animations liées au défilement ne sont pas touchées
const figer = async (page, t = 0, reglage = null) => {
  await page.evaluate(({ t, reglage }) => {
    for (const a of document.getAnimations()) {
      if (a.timeline !== document.timeline || !a.animationName) continue
      if (a.effect && a.effect.getTiming().iterations !== Infinity) continue
      a.pause()
      const propre = reglage && Object.entries(reglage).find(([motif]) => new RegExp(motif).test(a.animationName))
      a.currentTime = propre ? propre[1] : t
    }
  }, { t, reglage })
  await deuxImages(page)
}
const relancerAnimations = (page) => page.evaluate(() => { for (const a of document.getAnimations()) if (a.timeline === document.timeline && a.animationName && a.playState === 'paused') a.play() })
const gris160 = async (buf) => {
  const { data, info } = await sharp(buf).removeAlpha().resize(160).greyscale().raw().toBuffer({ resolveWithObject: true })
  if (info.channels !== 1) throw new Error(`réduction grise à ${info.channels} canaux`)
  return { data, w: info.width, h: info.height }
}
const part8 = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 8) n++; return n / a.length }
async function contraste(page) {
  const b = await page.evaluate(() => { const r = document.querySelector('.hero h1').getBoundingClientRect(); return { left: Math.max(0, Math.round(r.x)), top: Math.max(0, Math.round(r.y)), width: Math.round(Math.min(r.width, innerWidth - Math.max(0, r.x))), height: Math.round(Math.min(r.height, innerHeight - Math.max(0, r.y))) } })
  const { data, info } = await sharp(await page.screenshot({ type: 'png' })).extract(b).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const L = []; for (let i = 0; i < data.length; i += info.channels) L.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
  L.sort((x, y) => x - y)
  return 1.05 / (L[Math.floor(0.9 * (L.length - 1))] + 0.05)
}
async function magenta(page) {
  const { data, info } = await sharp(await page.screenshot({ type: 'png' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let n = 0; for (let i = 0; i < data.length; i += info.channels) if (Math.abs(data[i] - 255) < 40 && data[i + 1] < 60 && Math.abs(data[i + 2] - 255) < 40) n++
  return n
}
async function laplacien(buf, [x0, x1, y0, y1]) {
  const { data, info } = await sharp(buf).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true })
  const w = info.width, h = info.height, v = []
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; v.push(data[i - 1] + data[i + 1] + data[i - w] + data[i + w] - 4 * data[i]) }
  const m = v.reduce((a, b) => a + b, 0) / v.length
  return v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length
}
const enregistrerImage = async (page, nom) => { try { fs.writeFileSync(path.join(PREUVE, `${nom}.jpg`), await page.screenshot({ type: 'jpeg', quality: 85 })) } catch { /* image d'œil */ } }
const centile = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : null }

// D-15 : appariement de blocs (méthode de d15.mjs), 1440×900 réduit en 160×100 ; px écran = px réduits × 9
function deplacements(A, B, h1Haut) {
  const W = 160, H = 100, RR = 32
  const EXs = 0.404 * 1440, EYs = 0.386 * 1080 - (1080 - 900) * 0.42, ex = EXs / 9, ey = EYs / 9
  const zones = { oeil: [], marches: [] }
  for (let by = 0; by + 16 <= H; by += 2) for (let bx = 0; bx + 16 <= W; bx += 2) {
    const dansOeil = bx >= ex - 24 && bx + 16 <= ex + 24 && by >= Math.max(ey - 24, 80 / 9) && by + 16 <= Math.min(ey + 24, h1Haut / 9)
    const dansMarches = bx >= 150 / 9 && bx + 16 <= 500 / 9 && by >= 120 / 9 && by + 16 <= 420 / 9
    if (!dansOeil && !dansMarches) continue
    const dedans = (u, v) => bx + u >= 0 && by + v >= 0 && bx + u + 16 <= W && by + v + 16 <= H
    const cout = (u, v, borne = Infinity) => {
      let s = 0
      for (let j = 0; j < 16; j++) {
        const la = (by + j) * W + bx, lb = (by + v + j) * W + bx + u
        for (let i = 0; i < 16; i++) s += Math.abs(A[la + i] - B[lb + i])
        if (s >= borne) return s
      }
      return s
    }
    let best = Infinity, bu = 0, bv = 0
    for (let v = -RR; v <= RR; v++) for (let u = -RR; u <= RR; u++) { if (!dedans(u, v)) continue; const c = cout(u, v, best); if (c < best) { best = c; bu = u; bv = v } }
    const limite = Math.abs(bu) === RR || Math.abs(bv) === RR || !dedans(bu - 1, bv) || !dedans(bu + 1, bv) || !dedans(bu, bv - 1) || !dedans(bu, bv + 1)
    const para = (m, c0, p) => { const den = m - 2 * c0 + p; return den > 0 ? 0.5 * (m - p) / den : 0 }
    const u = limite ? bu : bu + para(cout(bu - 1, bv), best, cout(bu + 1, bv)), v = limite ? bv : bv + para(cout(bu, bv - 1), best, cout(bu, bv + 1))
    const b = { limite, module: Math.hypot(u, v) * 9 }
    if (dansOeil) zones.oeil.push(b)
    if (dansMarches) zones.marches.push(b)
  }
  const mediane = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.floor(0.5 * (s.length - 1))].toFixed(2) : null }
  return Object.fromEntries(Object.entries(zones).map(([z, bl]) => [z, { blocs: bl.length, blocsALaLimite: bl.filter((b) => b.limite).length, mediane_px: mediane(bl.filter((b) => !b.limite).map((b) => b.module)) }]))
}

// D-8 et D-10 : le modèle de caméra (proto7.mjs:19-24 ; budget.mjs, copie de relecture/bornes-et-budget.mjs section 3)
const RW = 0.045, GAMMA = 0.6
const avance = (r, d) => { const D = Math.pow(Math.max(r, RW) / RW, -GAMMA); return r * D / (D - d) }
const inverse = (rp, d) => { let lo = 0, hi = Math.min(d > 0 ? RW * Math.pow(d, -1 / GAMMA) : 10, 10) * (1 - 1e-9); for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2; if (avance(m, d) < rp) lo = m; else hi = m } return (lo + hi) / 2 }
function p90Grossissement(d) {
  const VW = 1440, VH = 900, DH = 1080, off = (DH - VH) * 0.42, ex = 0.404 * 1440, ey = 0.386 * DH - off, v = []
  for (let j = 0; j < 40; j++) for (let i = 0; i < 64; i++) {
    const x = (i + 0.5) * VW / 64, y = (j + 0.5) * VH / 40, rp = Math.hypot(x - ex, y - ey) / DH, r = inverse(rp, d), e = 1e-6
    v.push(Math.max(r > 1e-9 ? rp / r : 1 / (1 - d), (avance(r + e, d) - avance(Math.max(0, r - e), d)) / (r + e - Math.max(0, r - e))))
  }
  return centile(v, 0.9)
}
const f16 = typeof Math.f16round === 'function' ? Math.f16round : (x) => { if (!Number.isFinite(x) || x === 0) return x; const s = Math.sign(x), a = Math.abs(x); if (a >= 65520) return s * Infinity; const m = 2 ** (Math.max(-14, Math.floor(Math.log2(a))) - 10); return s * Math.round(a / m) * m }
// la boucle GLSL du cahier 020 §7.5, opération par opération ; q arrondit chaque résultat (identité en double précision)
function newton(rp, d, q) {
  let r = q(rp * q(1 - d))
  if (d > 0 && r > RW) for (let i = 0; i < 4; i++) {
    const w = q(Math.pow(q(r / RW), GAMMA)), den = q(1 - q(d * w))
    r = Math.max(RW, q(r - q(q(q(r / den) - rp) / q(q(1 + q(q(d * (GAMMA - 1)) * w)) / q(den * den)))))
  }
  return r
}

// ── dans la page : instruments et relevés ──────────────────────────────────────────────────────────────────────────────────────────
const INSTRUMENTS = () => {
  window.__csp = []
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
  window.__taches = []
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__taches.push([e.startTime, e.duration]) }).observe({ type: 'longtask', buffered: true }) } catch { /* pas d'observateur */ }
  window.__versFil = []
  const envoi = Worker.prototype.postMessage
  Worker.prototype.postMessage = function (m, ...reste) {
    try { if (m && ['descente', 'defile', 'actif', 'taille'].includes(m.type) && window.__versFil.length < 20000) window.__versFil.push({ type: m.type, v: m.v, t: performance.now() }) } catch { /* relevé seulement */ }
    return envoi.call(this, m, ...reste)
  }
}
const compte = (page, delai = 4000) => page.evaluate((delai) => new Promise((ok) => {
  const fil = document.querySelector('.hero--plein') && document.querySelector('.hero--plein').reliefFil
  if (!fil) return ok({ erreur: 'fil introuvable (hero.reliefFil)' })
  const t = setTimeout(() => { fil.removeEventListener('message', s); ok({ erreur: 'pas de réponse à « compte »' }) }, delai)
  const s = (e) => { if (e.data && e.data.type === 'compte') { clearTimeout(t); fil.removeEventListener('message', s); ok(e.data) } }
  fil.addEventListener('message', s)
  fil.postMessage({ type: 'compte' })
}), delai)
const largeurTexture = (c) => (c && ((c.texture && c.texture.largeur) || c.largeurTexture)) || 0
const attendrePret = (page, ms = 45000) => page.waitForSelector('.hero--plein[data-relief-etat="pret"]', { state: 'attached', timeout: ms }).then(() => true).catch(() => false)
async function attendreTexture(page, ms = 25000) {
  const t = Date.now(); let c = await compte(page)
  while (largeurTexture(c) < 2880 && Date.now() - t < ms) { await page.waitForTimeout(500); c = await compte(page) }
  return c
}
// attend que le fil ait dessiné la descente voulue (si le champ existe), sinon 600 ms
async function dessin(page, cible, champs) {
  if (!champs) return page.waitForTimeout(600)
  const t = Date.now()
  while (Date.now() - t < 3000) {
    const c = await compte(page)
    if (typeof c.derniereDescenteDessinee === 'number' && Math.abs(c.derniereDescenteDessinee - cible) <= 0.005) return page.waitForTimeout(80)
    await page.waitForTimeout(60)
  }
}
// suit la descente rendue par le fil après une action (scroll en haut, onglet révélé, redimensionnement) : temps jusqu'à la cible
const SUIVRE = ({ action, cible, limite }) => new Promise((ok) => {
  const fil = document.querySelector('.hero--plein') && document.querySelector('.hero--plein').reliefFil
  if (!fil) return ok({ erreur: 'fil introuvable' })
  let t0 = null, clos = false, derniere
  const clore = (res) => { if (clos) return; clos = true; fil.removeEventListener('message', surMessage); ok(res) }
  const surMessage = (e) => {
    if (!e.data || e.data.type !== 'compte' || t0 === null) return
    derniere = e.data.descente
    if (typeof derniere === 'number' && Math.abs(derniere - cible) <= 0.01) clore({ ms: performance.now() - t0, valeur: derniere })
  }
  fil.addEventListener('message', surMessage)
  const sonder = () => { if (clos) return; if (performance.now() - t0 > Math.max(1000, limite * 5)) return clore({ ms: null, valeur: derniere }); fil.postMessage({ type: 'compte' }); setTimeout(sonder, 8) }
  const partir = () => { t0 = performance.now(); sonder() }
  if (action === 'haut') { window.scrollTo({ top: 0, behavior: 'instant' }); partir() }
  else if (action === 'reveler') { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); partir() }
  else { window.addEventListener('resize', partir, { once: true }); setTimeout(() => { if (t0 === null) clore({ erreur: 'aucun événement resize en 10 s' }) }, 10000) }
})
// intervalles rAF et tâches longues d'une fenêtre
const RAF = (ms) => new Promise((ok) => {
  const t = [], t0 = performance.now()
  const f = (x) => {
    t.push(x)
    if (x - t0 < ms) return requestAnimationFrame(f)
    const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1])
    d.sort((a, b) => a - b)
    const taches = (window.__taches || []).filter(([s]) => s >= t0 && s <= x)
    ok({ n: d.length, p95: d.length ? +d[Math.floor(0.95 * (d.length - 1))].toFixed(1) : null, taches: taches.length, pireTache: Math.round(Math.max(0, ...taches.map((q) => q[1]))) })
  }
  requestAnimationFrame(f)
})
// D-11 : 120 images de 5 px, puis 100 ms ; relève rAF, tâches longues, messages « descente » et descente() de la page
const DEFILEMENT = ({ pas, images }) => new Promise((ok) => {
  const t = [], y0 = window.scrollY, i0 = window.__versFil.length, t0 = performance.now()
  let k = 0, changements = 0, dernier = window.scrollY
  const f = (x) => {
    t.push(x)
    if (k < images) {
      window.scrollTo({ top: y0 + pas * ++k, behavior: 'instant' })
      if (window.scrollY !== dernier) { changements++; dernier = window.scrollY }
      return requestAnimationFrame(f)
    }
    setTimeout(() => {
      const d = []; for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1])
      d.sort((a, b) => a - b)
      const avant = window.__versFil.slice(0, i0).filter((m) => m.type === 'descente').pop()
      let precedente = avant ? avant.v : null, nMessages = 0
      for (const m of window.__versFil.slice(i0)) if (m.type === 'descente' && m.v !== precedente) { nMessages++; precedente = m.v }
      const reg = JSON.parse(document.querySelector('.hero--plein').getAttribute('data-relief-descente') || '{"palier":0.3}')
      const cond = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)').matches && document.documentElement.classList.contains('da--signature') && !!(window.CSS && CSS.supports('animation-timeline: view()'))
      const taches = (window.__taches || []).filter(([s]) => s >= t0)
      ok({ changements, y: window.scrollY, nMessages, descentePage: cond ? Math.min(1, Math.max(0, window.scrollY / (reg.palier * innerHeight))) : 0, p95: d.length ? +d[Math.floor(0.95 * (d.length - 1))].toFixed(1) : null, taches: taches.length, pireTache: Math.round(Math.max(0, ...taches.map((q) => q[1]))) })
    }, 100)
  }
  requestAnimationFrame(f)
})
// D-13 (R-15) : perte de contexte simulée pendant le fondu (« fondu ») ou 3 s après l'état prêt (« plein »)
const PERDU = (mode) => {
  window.__r15 = { etapes: [], fini: false }
  const go = () => {
    const hero = document.querySelector('.hero--plein'), img = hero.querySelector('.hero__media img')
    const toile = () => hero.querySelector('canvas.hero__relief')
    const releve = (nom) => { const t = toile(); window.__r15.etapes.push({ nom, photo: getComputedStyle(img).visibility, toile: !!(t && t.isConnected), opacite: t ? parseFloat(getComputedStyle(t).opacity) : null }) }
    const declencher = () => {
      releve('avant'); hero.reliefFil.onmessage({ data: { type: 'perdu' } }); releve('+0')
      setTimeout(() => releve('+1000'), 1000); setTimeout(() => { releve('+1100'); window.__r15.fini = true }, 1100)
    }
    if (mode === 'plein') return setTimeout(declencher, 3000)
    const t0 = performance.now()
    const guetter = () => {
      const t = toile()
      if (t && t.classList.contains('hero__relief--pret')) { const o = parseFloat(getComputedStyle(t).opacity); if (o > 0.02 && o < 0.98) return declencher() }
      if (performance.now() - t0 > 5000) { window.__r15.rate = true; window.__r15.fini = true; return }
      requestAnimationFrame(guetter)
    }
    requestAnimationFrame(guetter)
  }
  new MutationObserver((l, obs) => { if (document.querySelector('.hero--plein[data-relief-etat="pret"]')) { obs.disconnect(); go() } }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-relief-etat'] })
}

// ── juge lancé à côté ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const lancerJuge = (nom, delaiMs) => new Promise((ok) => {
  const enfant = spawn(process.execPath, [path.join(R, 'scripts', nom)], { cwd: R })
  enfants.push(enfant)
  let sortie = ''
  enfant.stdout.on('data', (d) => { sortie += d }); enfant.stderr.on('data', (d) => { sortie += d })
  const minuterie = setTimeout(() => { sortie += `\n✗ ${nom} : arrêté après ${delaiMs / 60000} min`; try { enfant.kill() } catch { /* déjà fini */ } }, delaiMs)
  enfant.on('error', (e) => { clearTimeout(minuterie); ok({ code: 1, sortie: `${sortie}\n✗ ${nom} : ${e.message}` }) })
  enfant.on('close', (code) => { clearTimeout(minuterie); ok({ code, sortie }) })
})

async function principal() {
  fs.mkdirSync(PREUVE, { recursive: true })
  const kitDisque = fs.readFileSync(path.join(DEMOS, '_kit', 'kit.css'), 'utf8')
  // ── PRÉALABLE : génération dans une copie ──
  const generer = (sortie, ...options) => spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque', `--sortie=${sortie}`, ...options], { cwd: R, encoding: 'utf8', timeout: 300000 })
  const gen = generer(SITE)
  if (gen.status !== 0) { echecs.push(`PRÉALABLE : génération en échec (${`${gen.stdout || ''}${gen.stderr || ''}`.trim().split('\n').pop().slice(0, 220)})`); return }
  const da = JSON.parse(fs.readFileSync(path.join(DEMOS, '_kit', 'da.json'), 'utf8')).lestraque || {}
  const descenteDa = da.relief && da.relief.descente
  const reglage = { palier: 0.30, dmax1: 0.116, dmax15: 0.066, ...(descenteDa || {}) }
  mesures.reglage = reglage
  if (!descenteDa) echecs.push('PRÉALABLE : da.json → lestraque.relief.descente absent (posé par 021-01)')
  else if (descenteDa.roulisParDelta !== 0) echecs.push(`PRÉALABLE : roulisParDelta vaut ${descenteDa.roulisParDelta}, 0 attendu (decisions.md:61)`)
  const accueil = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')
  const heros = (accueil.match(/<section class="hero hero--plein"[^>]*>/) || [''])[0]
  if (!heros.includes('data-relief-descente=')) echecs.push('PRÉALABLE : le héros de l\'accueil généré ne porte pas data-relief-descente')

  // la page témoin des mesures de temps : le même site, sans relief.descente (choix 11)
  const daTemoin = JSON.parse(JSON.stringify(da)); if (daTemoin.relief) delete daTemoin.relief.descente
  fs.writeFileSync(DA_TEMOIN, JSON.stringify(daTemoin))
  const genTemoin = generer(TEMOIN, `--da=${DA_TEMOIN}`)
  if (genTemoin.status !== 0) faits.push(`page témoin sans descente non générée (${`${genTemoin.stdout || ''}${genTemoin.stderr || ''}`.trim().split('\n').pop().slice(0, 160)}) : barres absolues pour P-4, D-11 et D-12`)
  jalon('générations')

  // ── serveurs : la copie et le témoin, repli sur public/sites-demo, en-têtes de production ──
  let entetes = []
  try {
    const conf = (await import(pathToFileURL(path.join(R, 'next.config.mjs')).href)).default
    const strict = (await conf.headers()).find((r) => r.source.startsWith('/((?!site'))
    entetes = strict.headers.filter((h) => h.key !== 'Strict-Transport-Security')
      .map((h) => (h.key === 'Content-Security-Policy' ? { key: h.key, value: h.value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ') } : h))
  } catch (e) { echecs.push(`CSP : en-têtes de production illisibles dans next.config.mjs (${String(e.message).slice(0, 80)})`) }
  const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json', xml: 'application/xml', txt: 'text/plain', mp4: 'video/mp4' }
  const servir = async (dossier) => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
      let f = path.join(dossier, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
      const h = { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }
      for (const { key, value } of entetes) h[key] = value
      r.writeHead(200, h); fs.createReadStream(f).pipe(r)
    })
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
    return { srv, origine: `http://127.0.0.1:${srv.address().port}` }
  }
  const principalSrv = await servir(SITE), temoinSrv = genTemoin.status === 0 ? await servir(TEMOIN) : null
  const navs = []
  const lancer = async (options) => { const n = await chromium.launch(options); navs.push(n); return n }
  async function ouvrir(nav, options = {}, { chemin = '/index.html', avant = null, surContexte = null, origine = principalSrv.origine } = {}) {
    const js = options.javaScriptEnabled !== false
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, ...options })
    if (surContexte) await surContexte(ctx)
    const page = await ctx.newPage()
    if (js) { await page.addInitScript(INSTRUMENTS); if (avant) await page.addInitScript(avant) }
    await page.goto(`${origine}${chemin}`, { waitUntil: 'load', timeout: 90000 })
    if (js) await page.waitForFunction(() => document.documentElement.classList.contains('js') && document.fonts.status === 'loaded', null, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(js ? 2000 : 2500)
    return { ctx, page }
  }
  const lireEtat = (page) => page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const pl = q('.ouverture>.plateau'), hero = q('.ouverture>.hero--plein'), op = (el) => (el ? parseFloat(getComputedStyle(el).opacity) : null)
    return {
      y: window.scrollY, h: innerHeight, plateauTop: pl.getBoundingClientRect().top, plateauH: pl.offsetHeight, heroH: hero.offsetHeight,
      ouverture: q('.ouverture').offsetHeight, margeHaut: parseFloat(getComputedStyle(pl).marginTop), contenu: op(q('.ouverture .hero__contenu')),
      voile: parseFloat(getComputedStyle(hero, '::after').opacity), cle: op(q('.ouverture .h1__cle')), pied: op(q('.ouverture .hero__pied')),
      cleVis: getComputedStyle(q('.ouverture .h1__cle')).visibility, piedVis: getComputedStyle(q('.ouverture .hero__pied')).visibility,
      ligneTop: q('.ouverture .h1__ligne').getBoundingClientRect().top, h1Top: q('.hero h1').getBoundingClientRect().top,
    }
  })
  // mesure un état à la position y, le juge, et le remesure 2 s plus tard s'il est en défaut (choix 13)
  const etatJuge = async (page, y, juger, sansJs = false) => {
    await defiler(page, y, 400, sansJs)
    let e = await lireEtat(page), f = juger(e)
    if (f.length) { await attendre(2000); e = await lireEtat(page); f = juger(e) }
    return { e, f }
  }
  // grille de contraste D-5 : s'arrête après y = 0 si le repos est déjà sous 3,0 (choix 2)
  const grilleContraste = async (page, h, apresDefilement = null) => {
    const tag = await page.addStyleTag({ content: SANS_TEXTE })
    const valeurs = []
    const mesurer = async (y, t) => {
      await figer(page, t)
      if (apresDefilement) await page.waitForTimeout(60)
      const contenu = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ouverture .hero__contenu')).opacity))
      return { y, t, contenu, c: +(await contraste(page)).toFixed(3) }
    }
    for (const y of [0, 0.1, 0.2, 0.3].map((u) => Math.round(u * h))) {
      await defiler(page, y, 150)
      if (apresDefilement) await apresDefilement(y)
      for (let k = 0; k < 8; k++) valeurs.push(await mesurer(y, k * 2500))
      if (y === 0 && Math.min(...valeurs.map((v) => v.c)) < 3.0) break
    }
    const minRepos = Math.min(...valeurs.filter((v) => v.y === 0).map((v) => v.c))
    if (minRepos >= 3.0) {
      for (const v of valeurs.filter((x) => x.y > 0 && x.contenu >= 0.5 && x.c < 3.0)) {
        await attendre(2000); await defiler(page, v.y, 150); if (apresDefilement) await apresDefilement(v.y)
        const w = await mesurer(v.y, v.t); v.remesure = w.c; v.c = Math.max(v.c, w.c)
      }
    }
    await tag.evaluate((e) => e.remove())
    return { valeurs, minRepos }
  }
  const jugerContraste = (nom, { valeurs, minRepos }) => {
    mesures[`D-5 ${nom}`] = valeurs
    if (minRepos < 3.0) { faits.push(`D-5 ${nom} : non jugé, le repos est déjà à ${nombre(minRepos)} à y = 0 (choix 2)`); return }
    const jugees = valeurs.filter((v) => v.contenu >= 0.5)
    if (!jugees.length) { echecs.push(`D-5 ${nom} : aucune mesure où le contenu est visible (opacité ≥ 0,5)`); return }
    const pire = jugees.reduce((a, b) => (b.c < a.c ? b : a))
    faits.push(`D-5 ${nom} : contraste p90 au pire ${nombre(pire.c)} (y = ${pire.y}, t = ${pire.t / 1000} s)`)
    const sous = jugees.filter((v) => v.c < 3.0)
    if (sous.length) echecs.push(`D-5 ${nom} : contraste du titre sous 3,0 à ${resumer(sous.map((v) => `${nombre(v.c)} (y ${v.y}, t ${v.t / 1000} s)`))}`)
  }
  // D-7 et D-8 pour une séance (dpr 1 ou 1,5)
  const jugerCourse = async (page, c, dpr, attendu) => {
    const etiquette = `dpr ${dpr}`
    if (largeurTexture(c) < 2880) echecs.push(`D-7 ${etiquette} : texture 2880 non téléversée en 25 s (largeur ${largeurTexture(c)})`)
    if (typeof c.dmax !== 'number') { echecs.push(`D-7 et D-8 ${etiquette} : compte.dmax absent, course et budget non vérifiables`); return }
    if (Math.abs(c.dmax - attendu) > 0.002) echecs.push(`D-7 ${etiquette} : dmax ${nombre(c.dmax, 4)} (${attendu} ±0,002)`)
    const geo = await page.evaluate(() => { const t = document.querySelector('.hero__relief'); if (!t) return null; const m = getComputedStyle(t).transform.match(/matrix\(([^,]+)/); return { eb: m ? parseFloat(m[1]) : 1, largeur: t.clientWidth, dpr: Math.min(devicePixelRatio || 1, 1.5) } })
    if (!geo || !largeurTexture(c)) { echecs.push(`D-8 ${etiquette} : toile ou largeur de texture introuvable`); return }
    const p90 = p90Grossissement(c.dmax) * geo.eb * 1.06 * 1.04 * geo.dpr * geo.largeur / largeurTexture(c)
    mesures[`D-8 ${etiquette}`] = { dmax: c.dmax, ...geo, texture: largeurTexture(c), p90 }
    faits.push(`D-7/D-8 ${etiquette} : dmax ${nombre(c.dmax, 4)}, grossissement p90 ${nombre(p90, 3)} (E_b ${geo.eb}, toile ${geo.largeur} px, texture ${largeurTexture(c)} px)`)
    if (p90 > 1.53) echecs.push(`D-8 ${etiquette} : grossissement p90 ${nombre(p90, 3)} (1,53 au plus)`)
  }

  let refGpu = null, refSans = null
  try {
    // ════ A. SANS CARTE GRAPHIQUE : mesures figées (insensibles à la charge) ════
    const navSans = await lancer()
    // D-1 (1440×900 et 1280×800), D-2 et D-3 (1440×900)
    for (const [l, h] of [[1440, 900], [1280, 800]]) {
      const nom = `${l}×${h}`, k = h / 900
      const { ctx, page } = await ouvrir(navSans, { viewport: { width: l, height: h } })
      const d1 = []
      const e0 = await lireEtat(page)
      mesures[`D-1 ${nom} repos`] = e0
      if (Math.abs(e0.margeHaut - 0.3 * h) > 1) d1.push(`margin-top du plateau ${nombre(e0.margeHaut)} px (${nombre(0.3 * h)} ±1)`)
      if (Math.abs(e0.ouverture - (e0.heroH + e0.plateauH + 0.3 * h)) > 1) d1.push(`.ouverture ${e0.ouverture} px (${nombre(e0.heroH + e0.plateauH + 0.3 * h)} ±1)`)
      faits.push(`D-1 ${nom} : .ouverture ${e0.ouverture} px (héros ${e0.heroH}, plateau ${e0.plateauH}), margin-top du plateau ${nombre(e0.margeHaut)} px`)
      for (const [i, y0] of [0, 270, 518, 765, 1170].entries()) {
        const { e, f } = await etatJuge(page, Math.round(y0 * k), (e) => {
          const f = []
          if (Math.abs(e.plateauTop - (1.3 * h - e.y)) > 1) f.push(`haut du plateau ${nombre(e.plateauTop)} px à y = ${e.y} (${nombre(1.3 * h - e.y)} ±1)`)
          if (i <= 3) { const att = 1 - clamp01((e.y - 0.3 * h) / (0.55 * h)); if (Math.abs(e.contenu - att) > 0.02) f.push(`contenu ${nombre(e.contenu)} à y = ${e.y} (${nombre(att)} ±0,02)`) }
          if (i >= 3) { const att = 0.6 * clamp01((e.y - 0.4 * h) / (0.9 * h)); if (Math.abs(e.voile - att) > 0.02) f.push(`voile ${nombre(e.voile)} à y = ${e.y} (${nombre(att)} ±0,02)`) }
          return f
        })
        mesures[`D-1 ${nom} y${e.y}`] = e
        d1.push(...f)
      }
      if (d1.length) echecs.push(`D-1 ${nom} : ${resumer(d1)}`)
      else faits.push(`D-1 ${nom} : palier conforme (haut du plateau, contenu, voile)`)
      if (l === 1440) {
        const d2 = [], d3 = []
        const r0 = await etatJuge(page, 0, (e) => [e.cle < 0.98 && `surtitre ${nombre(e.cle)} à y = 0 (≥ 0,98)`, e.pied < 0.98 && `pied ${nombre(e.pied)} à y = 0 (≥ 0,98)`].filter(Boolean))
        d2.push(...r0.f)
        const ligne0 = r0.e.ligneTop
        const r112 = await etatJuge(page, 112, (e) => [Math.abs(e.cle - 0.5) > 0.05 && `surtitre ${nombre(e.cle)} à y = 112 (0,50 ±0,05)`, Math.abs(e.pied - 0.5) > 0.05 && `pied ${nombre(e.pied)} à y = 112 (0,50 ±0,05)`].filter(Boolean))
        d2.push(...r112.f)
        for (const y of [225, 270]) {
          const r = await etatJuge(page, y, (e) => [(e.cle > 0.01 || e.cleVis !== 'hidden') && `surtitre ${nombre(e.cle)} ${e.cleVis} à y = ${y} (≤ 0,01, hidden)`, (e.pied > 0.01 || e.piedVis !== 'hidden') && `pied ${nombre(e.pied)} ${e.piedVis} à y = ${y} (≤ 0,01, hidden)`].filter(Boolean))
          d2.push(...r.f)
        }
        for (const y of [90, 180, 270]) {
          const r = await etatJuge(page, y, (e) => [Math.abs(e.ligneTop - ligne0) > 0.5 && `titre à ${nombre(e.ligneTop)} px à y = ${y} (${nombre(ligne0)} ±0,5)`, e.contenu < 0.99 && `contenu ${nombre(e.contenu)} à y = ${y} (≥ 0,99)`].filter(Boolean))
          d3.push(...r.f)
        }
        if (d2.length) echecs.push(`D-2 : ${resumer(d2)}`); else faits.push('D-2 : surtitre et pied à 1, à 0,5 à y = 112, effacés et cachés dès y = 225')
        if (d3.length) echecs.push(`D-3 : ${resumer(d3)}`); else faits.push(`D-3 : titre immobile à ${nombre(ligne0)} px de y = 0 à 270`)
      }
      await ctx.close()
    }

    // D-5 sans carte, image palier-sansgpu-y240, captures de D-15 sans carte (1440×900)
    let pngSans0 = null, pngSans270 = null, h1Sans = 489
    for (const [l, h] of [[1280, 800], [1366, 768], [1440, 900]]) {
      const { ctx, page } = await ouvrir(navSans, { viewport: { width: l, height: h } })
      if (l === 1280) { await defiler(page, 240, 300); await figer(page, 0); await enregistrerImage(page, 'palier-sansgpu-y240'); await defiler(page, 0, 200) }
      jugerContraste(`${l}×${h} sans carte`, await grilleContraste(page, h))
      if (l === 1440) {
        await defiler(page, 0, 300); await figer(page, 0)
        h1Sans = (await lireEtat(page)).h1Top
        pngSans0 = await page.screenshot({ type: 'png' })
        await defiler(page, 270, 400); await figer(page, 0)
        pngSans270 = await page.screenshot({ type: 'png' })
      }
      await ctx.close()
    }

    // R-4 à y = 0,30 h (choix 8)
    const coins = async (nav, formats, etiquette) => {
      const defauts = []
      const relever = async (page) => { let pire = 0; for (const extreme of [0, 10000]) { await figer(page, 0, { '^signature-tourne': extreme, '^pousse$': 0 }); await page.waitForTimeout(80); pire = Math.max(pire, await magenta(page)) } return pire }
      for (const [l, h] of formats) {
        const { ctx, page } = await ouvrir(nav, { viewport: { width: l, height: h } })
        await defiler(page, Math.round(0.3 * h), 300)
        await page.addStyleTag({ content: MAGENTA })
        let pire = await relever(page)
        if (pire > 0) { await attendre(2000); pire = await relever(page) }
        if (l === 1440 && etiquette === 'sans carte') {
          const tag = await page.addStyleTag({ content: '.hero__media{visibility:hidden!important}' })
          await deuxImages(page)
          const temoin = await magenta(page)
          await tag.evaluate((e) => e.remove())
          if (temoin < 100000) echecs.push(`R-4 : témoin raté, photo cachée la feuille de test ne rend que ${temoin} pixels magenta`)
        }
        mesures[`R-4 ${l}×${h} ${etiquette}`] = pire
        if (pire > 0) defauts.push(`${l}×${h} ${etiquette} : ${pire} px`)
        await ctx.close()
      }
      return defauts
    }
    const defautsCoins = await coins(navSans, [[1088, 800], [1280, 800], [1366, 768], [1440, 900], [1920, 1080], [1920, 1200], [2560, 1080]], 'sans carte')
    const navBarres = await lancer({ ignoreDefaultArgs: ['--hide-scrollbars'] })
    defautsCoins.push(...await coins(navBarres, [[1440, 900], [1088, 800]], 'barres visibles'))
    await navBarres.close()

    // R-6 : mouvement réduit
    {
      const requetes = []
      const { ctx, page } = await ouvrir(navSans, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, { surContexte: (c) => c.on('request', (q) => { if (/relief/.test(q.url())) requetes.push(q.url()) }) })
      await page.waitForTimeout(3000)
      const e = await page.evaluate(() => ({ rotate: getComputedStyle(document.querySelector('.ouverture .hero__media img')).rotate, signatures: document.getAnimations().map((a) => a.animationName || '').filter((n) => /^signature-/.test(n)), top: document.querySelector('.ouverture>.plateau').getBoundingClientRect().top }))
      const f = []
      if (requetes.length) f.push(`${requetes.length} requête(s) « relief »`)
      if (e.rotate !== 'none') f.push(`rotate de la photo ${e.rotate}`)
      if (e.signatures.length) f.push(`animations ${e.signatures.join(', ')}`)
      if (Math.abs(e.top - 900) > 1) f.push(`haut du plateau ${nombre(e.top)} px à y = 0 (900 ±1)`)
      if (f.length) echecs.push(`R-6 : ${resumer(f)}`); else faits.push('R-6 : en mouvement réduit, ni relief, ni rotation, ni signature, ni palier')
      await defiler(page, 270, 300); await enregistrerImage(page, 'reduit-y270')
      await ctx.close()
    }
    // R-8 : sans JavaScript
    {
      const { ctx, page } = await ouvrir(navSans, { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
      const f = []
      f.push(...(await etatJuge(page, 0, (e) => (Math.abs(e.plateauTop - 1170) > 1 ? [`haut du plateau ${nombre(e.plateauTop)} px à y = 0 (1170 ±1)`] : []), true)).f)
      f.push(...(await etatJuge(page, 225, (e) => (e.pied > 0.01 ? [`pied ${nombre(e.pied)} à y = 225 (≤ 0,01)`] : []), true)).f)
      const g = await page.evaluate(() => { const img = document.querySelector('.ouverture .hero__media img'); return { rotate: getComputedStyle(img).rotate, signatures: img.getAnimations().map((a) => a.animationName || '').filter((n) => /^signature-/.test(n)) } })
      if (g.rotate !== 'none') f.push(`rotate de la photo ${g.rotate}`)
      if (g.signatures.length) f.push(`animations ${g.signatures.join(', ')} sur la photo`)
      if (f.length) echecs.push(`R-8 : ${resumer(f)}`); else faits.push('R-8 : sans JavaScript, palier et fondus présents, photo sans rotation')
      await ctx.close()
    }
    // R-7 (partie palier) : téléphone
    {
      const { ctx, page } = await ouvrir(navSans, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
      const marge = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ouverture>.plateau')).marginTop))
      if (Math.abs(marge) > 0.5) echecs.push(`R-7 : au téléphone, margin-top du plateau ${nombre(marge)} px (0 attendu)`); else faits.push('R-7 : au téléphone, aucun palier')
      await defiler(page, 422, 300); await enregistrerImage(page, 'tel-y422')
      await ctx.close()
    }

    jalon('A sans carte')
    // ── P-2 ──
    {
      const r = spawnSync('git', ['show', `${BASE_KIT}:public/sites-demo/_kit/kit.css`], { cwd: R, encoding: 'utf8', maxBuffer: 1 << 26 })
      const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{2,}/g, '\n').trim()
      const styles = fs.readFileSync(path.join(SITE, 'styles.css'), 'utf8'), segment = sansCommentaires(kitDisque)
      if (r.status !== 0) echecs.push(`P-2 : kit.css de ${BASE_KIT} illisible par git`)
      else if (!styles.includes(segment)) echecs.push('P-2 : styles.css généré ne contient pas kit.css tel quel (kit modifié pendant la génération ?)')
      else {
        const reference = styles.replace(segment, () => sansCommentaires(r.stdout))
        const br = (s) => zlib.brotliCompressSync(Buffer.from(s), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length
        const croissance = br(styles) - br(reference), brut = Buffer.byteLength(styles) - Buffer.byteLength(reference)
        mesures['P-2'] = { brotli: croissance, brut }
        faits.push(`P-2 : styles.css ${croissance >= 0 ? '+' : ''}${croissance} octets en brotli 11 (${brut >= 0 ? '+' : ''}${brut} bruts) contre le kit de ${BASE_KIT}`)
        if (croissance > 1000) echecs.push(`P-2 : styles.css grossit de ${croissance} octets en brotli (1 000 au plus)`)
      }
    }
    // ── D-10 ──
    {
      const shader = fs.readFileSync(path.join(SITE, 'relief-fil.js'), 'utf8')
      const manquants = ['uDelta', 'uRoulis', 'uRW', 'uGamma'].filter((n) => !shader.includes(n))
      const highp = /precision\s+highp\s+float/.test(shader)
      const ex = 0.404 * 1440, ey = 0.386 * 1080
      let pireDouble = 0, pireDemi = 0
      for (const d of [0.03, 0.06, 0.09, reglage.dmax1]) for (let j = 0; j < 48; j++) for (let i = 0; i < 64; i++) {
        const x = (i + 0.5) * 1440 / 64, y = (j + 0.5) * 1080 / 48, rp = Math.hypot(x - ex, y - ey) / 1080, ref = inverse(rp, d)
        pireDouble = Math.max(pireDouble, Math.abs(newton(rp, d, (v) => v) - ref) * 1080)
        const dx = f16(f16(f16(x / 1440) - f16(0.404)) * f16(4 / 3)), dy = f16(f16(y / 1080) - f16(0.386))
        pireDemi = Math.max(pireDemi, Math.abs(newton(f16(Math.sqrt(f16(f16(dx * dx) + f16(dy * dy)))), f16(d), f16) - ref) * 1080)
      }
      mesures['D-10'] = { pireDouble, pireDemi, highp, manquants }
      faits.push(`D-10 : inversion à ${nombre(pireDouble, 3)} px en double précision, ${nombre(pireDemi)} px en demi-précision${pireDemi > 0.5 ? (highp ? ', highp forcé dans le shader' : ', highp absent du shader') : ''}`)
      if (pireDouble > 0.5) echecs.push(`D-10 : inversion de Newton à ${nombre(pireDouble, 3)} px en double précision (0,5 au plus)`)
      if (pireDemi > 0.5 && !highp) echecs.push(`D-10 : ${nombre(pireDemi)} px en demi-précision et le shader ne force pas highp`)
      if (manquants.length) echecs.push(`D-10 : le shader de relief-fil.js ne déclare pas ${manquants.join(', ')}`)
    }
    // ── D-15 : références calculées sur les films (choix 1) ──
    const referenceFilm = async (nomFilm, controle, mesuresFilm) => {
      const film = path.join(FILMS, nomFilm)
      if (!fs.existsSync(film) || fs.statSync(film).size < 100000) return { erreur: `${nomFilm} absent ou vide dans .orchestre/preuves/020-01/descente/avant-correction` }
      let n270 = null, h1Haut = null
      try { n270 = JSON.parse(fs.readFileSync(path.join(FILMS, controle), 'utf8')).y270.imageDuFilm } catch { /* jugé plus bas */ }
      try { h1Haut = Number(JSON.parse(fs.readFileSync(path.join(FILMS, mesuresFilm), 'utf8')).perceptibiliteD15.zones.oeil.def.match(/y < (\d+)/)[1]) } catch { /* jugé plus bas */ }
      if (!Number.isInteger(n270) || !(h1Haut > 0)) return { erreur: `${controle} ou ${mesuresFilm} illisible (image à y = 270, haut du h1)` }
      const sonde = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames', '-of', 'json', film], { encoding: 'utf8' }).stdout || '{}')
      const s = (sonde.streams || [])[0] || {}
      if (s.width !== 1440 || s.height !== 900 || !(Number(s.nb_frames) > n270)) return { erreur: `${nomFilm} : ${s.width}×${s.height}, ${s.nb_frames} images (1440×900 et plus de ${n270} attendus)` }
      const images = []
      for (const n of [0, n270]) {
        const f = path.join(SITE, `film-${path.basename(nomFilm, '.mp4')}-${n}.png`)
        spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', film, '-vf', `select=eq(n\\,${n})`, '-frames:v', '1', f])
        if (!fs.existsSync(f) || fs.statSync(f).size < 10000) return { erreur: `${nomFilm} : image ${n} non décodée` }
        images.push((await gris160(fs.readFileSync(f))).data)
      }
      const zones = deplacements(images[0], images[1], h1Haut)
      if (!(zones.oeil.mediane_px > 0 && zones.marches.mediane_px > 0)) return { erreur: `${nomFilm} : déplacement de référence nul ou illisible (${JSON.stringify(zones)})` }
      return { film: path.relative(R, film).split(path.sep).join('/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(film)).digest('hex'), images: [0, n270], h1Haut, zones, seuils: { oeil: +(0.9 * zones.oeil.mediane_px).toFixed(2), marches: +(0.9 * zones.marches.mediane_px).toFixed(2) } }
    }
    refGpu = await referenceFilm('descente-d116.mp4', 'controle-film-d116.json', 'mesures-d116.json')
    refSans = await referenceFilm('descente-sansgpu.mp4', 'controle-film-sansgpu.json', 'mesures-sansgpu.json')
    fs.writeFileSync(path.join(PREUVE, 'd15-reference.json'), JSON.stringify({ date: new Date().toISOString(), methode: 'réduction grise 160×100 (sharp), blocs 16×16 au pas de 2, SAD, recherche ±32 px réduits, affinage parabolique, blocs à la limite exclus ; médiane du module × 9 px ; seuil = 0,9 × médiane', avecCarte: refGpu, sansCarte: refSans }, null, 1))
    for (const [etiquette, ref] of [['avec carte', refGpu], ['sans carte', refSans]]) if (ref && !ref.erreur) faits.push(`D-15 référence ${etiquette} (${path.basename(ref.film)}) : œil ${ref.zones.oeil.mediane_px} px, nez de marche ${ref.zones.marches.mediane_px} px`)
    const jugerD15 = async (etiquette, ref, png0, png270, h1Haut) => {
      if (!ref || ref.erreur) { echecs.push(`D-15 ${etiquette} : référence impossible (${ref ? ref.erreur : 'absente'})`); return }
      const z = deplacements((await gris160(png0)).data, (await gris160(png270)).data, h1Haut)
      mesures[`D-15 ${etiquette}`] = z
      faits.push(`D-15 ${etiquette} : œil ${z.oeil.mediane_px} px (seuil ${ref.seuils.oeil}), nez de marche ${z.marches.mediane_px} px (seuil ${ref.seuils.marches}, ${z.marches.blocsALaLimite} bloc(s) à la limite)`)
      const f = []
      for (const zone of ['oeil', 'marches']) if (!(z[zone].mediane_px >= ref.seuils[zone])) f.push(`${zone === 'oeil' ? 'œil' : 'nez de marche'} ${z[zone].mediane_px} px (${ref.seuils[zone]} au moins)`)
      if (f.length) echecs.push(`D-15 ${etiquette} : la descente ne se voit pas assez, ${f.join(', ')}`)
    }
    if (pngSans0) await jugerD15('sans carte', refSans, pngSans0, pngSans270, h1Sans)
    jalon('P-2, D-10, films de D-15')

    // ════ B. AVEC CARTE : captures et valeurs (le temps ne compte pas) ════
    const navGpu = await lancer({ args: GPU })
    const CHAMPS = ['descente', 'dmax', 'latences', 'derniereDescenteDessinee', 'webgl2']
    let champsDescente = false
    const s1 = await ouvrir(navGpu, { viewport: { width: 1440, height: 900 } })
    const page = s1.page
    const pret1 = await attendrePret(page)
    let c1 = {}
    if (!pret1) echecs.push('avec carte 1440×900 : le relief n\'est pas prêt en 45 s')
    else {
      await page.mouse.move(-1, -1)
      c1 = await attendreTexture(page)
      await page.waitForTimeout(1000)
      const manquants = CHAMPS.filter((k) => !(k in c1))
      champsDescente = !manquants.includes('derniereDescenteDessinee') && !manquants.includes('descente')
      mesures['compte dpr 1'] = { ...c1, latences: Array.isArray(c1.latences) ? c1.latences.length : c1.latences }
      faits.push(`fil (dpr 1) : texture ${largeurTexture(c1)} px, webgl2 ${c1.webgl2}, dmax ${c1.dmax}, descente ${c1.descente}`)
      if (c1.erreur) echecs.push(`compte : ${c1.erreur}`)
      else if (manquants.length) echecs.push(`compte : le fil ne renvoie pas ${manquants.join(', ')} (cahier 020 §7.5)`)
      await jugerCourse(page, c1, 1, reglage.dmax1)

      // D-6 aux quatre positions
      if (typeof c1.descente !== 'number') echecs.push('D-6 : compte.descente absent, le worker ne suit pas la page')
      else {
        const d6 = []
        for (const y of [0, 135, 270, 540]) {
          const att = clamp01(y / 270)
          await defiler(page, y, 300)
          let c = await compte(page)
          if (!(Math.abs(c.descente - att) <= 0.01)) { await attendre(2000); c = await compte(page) }
          mesures[`D-6 y${y}`] = c.descente
          if (!(Math.abs(c.descente - att) <= 0.01)) d6.push(`${c.descente} à y = ${y} (${nombre(att)} ±0,01)`)
        }
        if (d6.length) echecs.push(`D-6 : descente du fil ${resumer(d6)}`); else faits.push('D-6 : le fil suit la page à 0, 135, 270 et 540 px')
      }

      // D-15 avec carte, D-9 et images d'œil
      await defiler(page, 0, 200); await figer(page, 0); await dessin(page, 0, champsDescente)
      const h1Gpu = (await lireEtat(page)).h1Top
      const png0 = await page.screenshot({ type: 'png' })
      for (const y of [90, 180]) { await defiler(page, y, 150); await dessin(page, clamp01(y / 270), champsDescente); await enregistrerImage(page, `palier-y${String(y).padStart(3, '0')}`) }
      await defiler(page, 270, 150); await dessin(page, 1, champsDescente)
      const png270 = await page.screenshot({ type: 'png' })
      fs.writeFileSync(path.join(PREUVE, 'palier-y270.jpg'), await sharp(png270).jpeg({ quality: 85 }).toBuffer())
      await jugerD15('avec carte', refGpu, png0, png270, h1Gpu)
      {
        const BOIS = [900, 1400, 120, 420]
        const toile270 = await laplacien(png270, BOIS)
        await defiler(page, 0, 200); await dessin(page, 0, champsDescente)
        await page.evaluate(() => { const t = document.querySelector('.hero__relief'); if (t) t.style.visibility = 'hidden'; document.querySelector('.ouverture .hero__media img').style.visibility = 'visible' })
        await deuxImages(page); await page.waitForTimeout(200)
        const photo0 = await laplacien(await page.screenshot({ type: 'png' }), BOIS)
        await page.evaluate(() => { const t = document.querySelector('.hero__relief'); if (t) { t.style.visibility = ''; document.querySelector('.ouverture .hero__media img').style.visibility = 'hidden' } })
        mesures['D-9'] = { toile270, photo0, ratio: toile270 / photo0 }
        faits.push(`D-9 (indicatif) : netteté du bois à y = 270 = ${nombre(toile270 / photo0)} × la photo à y = 0 (repère 0,68)`)
      }
      for (const [y, nom] of [[518, 'plateau-y518'], [765, 'plateau-y765'], [1170, 'plateau-y1170'], [1270, 'apres-y1270']]) { await defiler(page, y, 300); await enregistrerImage(page, nom) }

      // D-5 avec carte en 1440×900, R-4 avec carte
      await defiler(page, 0, 300)
      jugerContraste('1440×900 avec carte', await grilleContraste(page, 900, (y) => dessin(page, clamp01(y / 270), champsDescente)))
      {
        await defiler(page, 270, 200); await dessin(page, 1, champsDescente)
        const tag = await page.addStyleTag({ content: MAGENTA })
        const relever = async () => { let pire = 0; for (const extreme of [0, 10000]) { await figer(page, 0, { '^signature-tourne': extreme, '^pousse$': 0 }); await page.waitForTimeout(120); pire = Math.max(pire, await magenta(page)) } return pire }
        let pire = await relever()
        if (pire > 0) { await attendre(2000); pire = await relever() }
        await tag.evaluate((e) => e.remove())
        mesures['R-4 1440×900 avec carte'] = pire
        if (pire > 0) defautsCoins.push(`1440×900 avec carte : ${pire} px`)
      }
      // D-5 avec carte en 1280×800 et 1366×768 : la toile suit le redimensionnement ; retour en 1440×900 pour les mesures de temps
      for (const [l, h] of [[1280, 800], [1366, 768]]) {
        await page.setViewportSize({ width: l, height: h }); await page.waitForTimeout(1500)
        jugerContraste(`${l}×${h} avec carte`, await grilleContraste(page, h, (y) => dessin(page, clamp01(y / (0.3 * h)), champsDescente)))
      }
      await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(1500)
    }
    if (defautsCoins.length) echecs.push(`R-4 à y = 0,30 h : coins découverts, ${resumer(defautsCoins)}`)
    else faits.push('R-4 à y = 0,30 h : aucun pixel découvert (7 formats sans carte, 2 avec barres, 1440×900 avec carte)')

    // séance dpr 1,5 : D-7 et D-8
    const s15 = await ouvrir(navGpu, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
    const pret15 = await attendrePret(s15.page)
    if (!pret15) echecs.push('avec carte, dpr 1,5 : le relief n\'est pas prêt en 45 s')
    else { await s15.page.mouse.move(-1, -1); await jugerCourse(s15.page, await attendreTexture(s15.page), 1.5, reglage.dmax15) }

    // D-7 : texture 2880 bloquée
    {
      const { ctx, page: pb } = await ouvrir(navGpu, { viewport: { width: 1440, height: 900 } }, { surContexte: (c) => c.route(/heros-escalier-2880/, (r) => r.abort()) })
      if (!(await attendrePret(pb))) echecs.push('D-7 2880 bloquée : relief pas prêt en 45 s')
      else {
        await pb.waitForTimeout(8000)
        const c = await compte(pb)
        mesures['D-7 2880 bloquée'] = { dmax: c.dmax, texture: largeurTexture(c) }
        if (typeof c.dmax !== 'number') echecs.push('D-7 2880 bloquée : compte.dmax absent')
        else if (Math.abs(c.dmax) > 1e-9) echecs.push(`D-7 2880 bloquée : dmax ${c.dmax} (0 attendu)`)
        else faits.push(`D-7 2880 bloquée : dmax 0 (texture ${largeurTexture(c)} px)`)
      }
      await ctx.close()
    }
    // D-7 : WebGL 1
    {
      const nav1 = await lancer({ args: [...GPU, '--disable-webgl2'] })
      const { page: p1 } = await ouvrir(nav1, { viewport: { width: 1440, height: 900 } })
      if (!(await attendrePret(p1))) echecs.push('D-7 WebGL 1 : relief pas prêt en 45 s avec --disable-webgl2 (le shader doit compiler en WebGL 1)')
      else {
        await p1.waitForTimeout(8000)
        const c = await compte(p1)
        mesures['D-7 WebGL 1'] = { webgl2: c.webgl2, dmax: c.dmax }
        if (c.webgl2 === true) faits.push('D-7 WebGL 1 : témoin raté (webgl2 vrai malgré --disable-webgl2), branche non testée')
        else if (c.webgl2 !== false) echecs.push('D-7 WebGL 1 : compte.webgl2 absent, témoin illisible')
        else if (typeof c.dmax !== 'number' || Math.abs(c.dmax) > 1e-9) echecs.push(`D-7 WebGL 1 : dmax ${c.dmax} (0 attendu)`)
        else faits.push('D-7 WebGL 1 : dmax 0')
      }
      await nav1.close()
    }

    jalon('B avec carte, captures')

    // ════ C. AVEC CARTE : mesures de temps, contre la page témoin (choix 11) ════
    const seanceTemps = async (pg, dpr) => {
      const etiquette = `dpr ${dpr}`
      let temoin = null, ctxTemoin = null, temoinAbsent = !temoinSrv
      if (temoinSrv) {
        const o = await ouvrir(navGpu, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr }, { origine: temoinSrv.origine })
        ctxTemoin = o.ctx
        if (await attendrePret(o.page, 60000)) { await o.page.mouse.move(-1, -1); await attendreTexture(o.page, 15000); temoin = o.page }
        else { temoinAbsent = true; faits.push(`P-4 ${etiquette} : la page témoin n'est pas prête en 60 s (machine chargée)`) }
      }
      // choix 11 : barres du cahier si le témoin tient 20 ms ; sinon 1,5 × le témoin plus la marge du cahier
      const chargee = (ref) => !!(ref && ref.p95 > 20)
      const jugerFenetre = (nom, m, ref) => {
        if (m.p95 === null) return [`P-4 ${etiquette} ${nom} : aucun intervalle rAF relevé`]
        const f = [], code = nom === 'en défilement' ? 'D-12' : 'P-4'
        const barreRaf = chargee(ref) ? 1.5 * ref.p95 + 3.3 : 20, plafond = chargee(ref) ? Math.floor(1.5 * ref.taches + 2) : 0
        if ((m.p95 > barreRaf || m.taches > plafond) && temoinAbsent) { faits.push(`P-4 et D-12 ${etiquette} ${nom} : non jugés, témoin indisponible sous charge (p95 rAF ${m.p95} ms, ${m.taches} tâche(s) longue(s))`); return f }
        if (m.p95 > barreRaf) f.push(`P-4 ${etiquette} ${nom} : p95 rAF ${m.p95} ms (${nombre(barreRaf, 1)} au plus${chargee(ref) ? `, témoin chargé à ${ref.p95}` : ''})`)
        if (m.taches > plafond) f.push(`${code} ${etiquette} ${nom} : ${m.taches} tâche(s) longue(s), pire ${m.pireTache} ms (${plafond} au plus${chargee(ref) ? `, témoin ${ref.taches}` : ''})`)
        return f
      }
      // P-4 au repos : 20 s, page et témoin dans la même fenêtre
      await defiler(pg, 0, 300); await relancerAnimations(pg); await pg.mouse.move(-1, -1); await pg.waitForTimeout(500)
      const fenetreRepos = () => Promise.all([pg.evaluate(RAF, 20000), temoin ? temoin.evaluate(RAF, 20000) : null])
      let [m, ref] = await fenetreRepos()
      let f = jugerFenetre('au repos', m, ref)
      if (f.length) { await attendre(2000);[m, ref] = await fenetreRepos(); f = jugerFenetre('au repos', m, ref) }
      const cRepos = await compte(pg)
      if (!(typeof cRepos.dureeP95 === 'number' && cRepos.dureeP95 <= 16.7)) f.push(`P-4 ${etiquette} : dureeP95 ${cRepos.dureeP95} ms au repos (16,7 au plus)`)
      mesures[`P-4 ${etiquette} au repos`] = { page: m, temoin: ref, dureeP95: cRepos.dureeP95 }
      faits.push(`P-4 ${etiquette} au repos : p95 rAF ${m.p95} ms (témoin ${ref ? ref.p95 : '—'}), ${m.taches} tâche(s) longue(s) (témoin ${ref ? ref.taches : '—'}), dureeP95 ${nombre(cRepos.dureeP95)} ms`)
      echecs.push(...f)
      // D-11, D-12 et P-4 pendant le défilement
      const courir = async () => {
        await defiler(pg, 0, 300); await dessin(pg, 0, champsDescente)
        if (temoin) await defiler(temoin, 0, 300)
        const [d, refD] = await Promise.all([pg.evaluate(DEFILEMENT, { pas: 5, images: 120 }), temoin ? temoin.evaluate(DEFILEMENT, { pas: 5, images: 120 }) : null])
        const c = await compte(pg)
        const g = []
        if (d.changements < 100) g.push(`D-11 ${etiquette} : témoin de défilement à ${d.changements} changements de scrollY (100 au moins)`)
        const lat = Array.isArray(c.latences) ? c.latences.slice(-Math.max(1, d.nMessages)) : []
        const p95 = centile(lat, 0.95), max = lat.length ? Math.max(...lat) : null
        const trame = refD ? refD.p95 : d.p95, lourde = trame > 20, barreP95 = lourde ? 2 * trame : 34, barreMax = lourde ? 3 * trame : 50
        if (!lat.length) g.push(`D-11 ${etiquette} : aucune latence dans compte.latences`)
        else {
          if (p95 > barreP95) g.push(`D-11 ${etiquette} : latence p95 ${nombre(p95, 1)} ms (${nombre(barreP95, 1)} au plus${lourde ? `, trame de ${trame} ms sous charge` : ''})`)
          if (max > barreMax) g.push(`D-11 ${etiquette} : latence maximale ${nombre(max, 1)} ms (${nombre(barreMax, 1)} au plus${lourde ? `, trame de ${trame} ms sous charge` : ''})`)
        }
        if (!(typeof c.derniereDescenteDessinee === 'number' && Math.abs(c.derniereDescenteDessinee - d.descentePage) <= 0.001)) g.push(`D-11 ${etiquette} : dernière descente dessinée ${c.derniereDescenteDessinee}, la page est à ${nombre(d.descentePage, 3)}`)
        g.push(...jugerFenetre('en défilement', d, refD))
        if (!(typeof c.dureeP95 === 'number' && c.dureeP95 <= 16.7)) g.push(`P-4 ${etiquette} : dureeP95 ${c.dureeP95} ms en défilement (16,7 au plus)`)
        return { d, refD, lat: { n: lat.length, p95, max }, derniere: c.derniereDescenteDessinee, g }
      }
      let essai = await courir()
      if (essai.g.length && champsDescente) { await attendre(2000); essai = await courir() }
      mesures[`D-11 ${etiquette}`] = { ...essai.d, temoin: essai.refD, latences: essai.lat, derniere: essai.derniere }
      faits.push(`D-11 ${etiquette} : ${essai.d.changements} changements de scrollY, latence p95 ${nombre(essai.lat.p95, 1)} ms et max ${nombre(essai.lat.max, 1)} ms sur ${essai.lat.n}, p95 rAF ${essai.d.p95} ms (témoin ${essai.refD ? essai.refD.p95 : '—'}), ${essai.d.taches} tâche(s) longue(s)`)
      echecs.push(...essai.g)
      if (ctxTemoin) await ctxTemoin.close()
    }
    if (!champsDescente) faits.push('P-4, D-11 et D-12 : non mesurés, le fil ne rend pas compte de la descente (choix 11)')
    else {
      // l'autre séance défile loin du héros pendant la mesure : son relief s'arrête et ne charge pas la fenêtre
      if (pret15) await defiler(s15.page, 3000, 300)
      if (pret1) await seanceTemps(page, 1)
      if (pret1) await defiler(page, 3000, 300)
      if (pret15) await seanceTemps(s15.page, 1.5)
    }
    await s15.ctx.close()
    jalon('C mesures de temps (P-4, D-11, D-12)')

    if (pret1 && typeof c1.descente === 'number') {
      // D-6 : saut, puis saut pendant l'onglet caché (choix 4)
      const saut = async () => { await defiler(page, 3000, 600); return page.evaluate(SUIVRE, { action: 'haut', cible: 0, limite: 200 }) }
      let s = await saut(); if (!(s.ms !== null && s.ms < 200)) { await attendre(2000); s = await saut() }
      mesures['D-6 saut'] = s
      if (!(s.ms !== null && s.ms < 200)) echecs.push(`D-6 : après le saut 3000 → 0, descente ${s.valeur} ${s.ms === null ? 'jamais à 0 en 1 s' : `à 0 en ${Math.round(s.ms)} ms`} (moins de 200 ms)`)
      else faits.push(`D-6 : saut 3000 → 0 suivi en ${Math.round(s.ms)} ms`)
      const cache = async () => {
        await defiler(page, 270, 300); await dessin(page, 1, champsDescente)
        const i0 = await page.evaluate(() => window.__versFil.length)
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
        await page.waitForTimeout(200)
        const temoinActif = await page.evaluate((i0) => window.__versFil.slice(i0).some((m) => m.type === 'actif' && m.v === false), i0)
        await defiler(page, 3000, 400); await defiler(page, 0, 400)
        return { temoinActif, ...(await page.evaluate(SUIVRE, { action: 'reveler', cible: 0, limite: 200 })) }
      }
      let o = await cache(); if (o.temoinActif && !(o.ms !== null && o.ms < 200)) { await attendre(2000); o = await cache() }
      mesures['D-6 onglet caché'] = o
      if (!o.temoinActif) echecs.push('D-6 onglet caché : témoin raté, aucun message « actif » = false après visibilitychange')
      else if (!(o.ms !== null && o.ms < 200)) echecs.push(`D-6 onglet caché : après la réactivation, descente ${o.valeur} ${o.ms === null ? 'jamais à 0 en 1 s' : `à 0 en ${Math.round(o.ms)} ms`} (moins de 200 ms)`)
      else faits.push(`D-6 onglet caché : valeur courante reçue ${Math.round(o.ms)} ms après la réactivation`)

      // D-14 et R-16 (choix 7)
      await defiler(page, 0, 300); await figer(page, 0); await dessin(page, 0, champsDescente); await page.waitForTimeout(300)
      const toileAvant = (await gris160(await page.screenshot({ type: 'png' }))).data
      const ancre = await page.addStyleTag({ content: 'html{overflow-anchor:none!important}' })
      await defiler(page, 300, 300); await dessin(page, 1, champsDescente)
      const redimensionner = async (l, h, cible) => { const p = page.evaluate(SUIVRE, { action: 'redimension', cible, limite: 300 }); await attendre(150); await page.setViewportSize({ width: l, height: h }); return p }
      let r1 = await redimensionner(1000, 800, 0)
      await page.waitForTimeout(800)
      let r2 = await redimensionner(1440, 900, 1)
      if (!(r1.ms != null && r1.ms <= 300 && r2.ms != null && r2.ms <= 300)) {
        await attendre(2000); await defiler(page, 300, 300); await dessin(page, 1, champsDescente)
        r1 = await redimensionner(1000, 800, 0); await page.waitForTimeout(800); r2 = await redimensionner(1440, 900, 1)
      }
      mesures['D-14'] = { vers1000: r1, retour1440: r2 }
      const d14 = []
      if (!(r1.ms != null && r1.ms <= 300)) d14.push(`en 1000×800, descente ${r1.valeur ?? r1.erreur} ${r1.ms == null ? 'jamais à 0 en 1,5 s' : `à 0 en ${Math.round(r1.ms)} ms`}`)
      if (!(r2.ms != null && r2.ms <= 300)) d14.push(`au retour en 1440×900, descente ${r2.valeur ?? r2.erreur} ${r2.ms == null ? 'jamais à 1 en 1,5 s' : `à 1 en ${Math.round(r2.ms)} ms`}`)
      if (d14.length) echecs.push(`D-14 : ${d14.join(', ')} (300 ms au plus)`); else faits.push(`D-14 : descente à 0 en ${Math.round(r1.ms)} ms en 1000×800, à 1 en ${Math.round(r2.ms)} ms au retour`)
      await page.waitForTimeout(1200)
      await ancre.evaluate((e) => e.remove())
      await defiler(page, 0, 400); await figer(page, 0); await dessin(page, 0, champsDescente); await page.waitForTimeout(500)
      let p8 = part8(toileAvant, (await gris160(await page.screenshot({ type: 'png' }))).data)
      if (p8 >= 0.05) { await attendre(2000); await figer(page, 0); p8 = part8(toileAvant, (await gris160(await page.screenshot({ type: 'png' }))).data) }
      mesures['R-16'] = p8
      if (p8 >= 0.05) echecs.push(`D-14 (R-16) : la toile n'a pas retrouvé son cadrage après l'aller-retour (part > 8 ${nombre(p8, 3)}, moins de 0,05)`)
      else faits.push(`D-14 (R-16) : cadrage de la toile retrouvé après redimensionnement (part > 8 ${nombre(p8, 3)})`)
    }
    if (pret1) {
      const csp = await page.evaluate(() => window.__csp || [])
      if (csp.length) echecs.push(`CSP : ${csp.length} violation(s) avec carte (${resumer(csp, 2)})`); else faits.push('CSP de production : 0 violation avec carte')
    }
    await s1.ctx.close()

    // D-13 (R-15) : contexte perdu pendant le fondu, puis 3 s après l'état prêt (choix 6)
    for (const mode of ['fondu', 'plein']) {
      const etiquette = mode === 'fondu' ? 'pendant le fondu' : '3 s après prêt'
      const faire = async () => {
        const { ctx, page: pp } = await ouvrir(navGpu, { viewport: { width: 1440, height: 900 } }, { avant: `(${PERDU.toString()})(${JSON.stringify(mode)})` })
        const ok = await pp.waitForFunction(() => window.__r15 && window.__r15.fini, null, { timeout: 60000 }).then(() => true).catch(() => false)
        const r15 = await pp.evaluate(() => window.__r15 || null)
        await ctx.close()
        const e = Object.fromEntries(((r15 && r15.etapes) || []).map((x) => [x.nom, x]))
        const f = []
        if (!ok) f.push('relief jamais prêt ou relevé inachevé en 60 s')
        else if (r15.rate) f.push('fondu d\'apparition jamais observé (opacité de la toile entre 0 et 1)')
        else {
          for (const n of ['+0', '+1000']) if (!e[n] || e[n].photo === 'hidden') f.push(`photo cachée à ${n} ms`)
          if (mode === 'fondu' && !(e['+0'] && e['+0'].toile && e['+0'].opacite > 0 && e['+0'].opacite < 1)) f.push(`toile ${e['+0'] && e['+0'].toile ? `à l'opacité ${e['+0'].opacite}` : 'déjà retirée'} juste après la perte (présente, opacité entre 0 et 1 attendue)`)
          if (!e['+1100'] || e['+1100'].toile) f.push('toile encore là à +1 100 ms')
        }
        return { r15, f }
      }
      let essai = await faire()
      if (essai.f.length) { await attendre(2000); essai = await faire() }
      mesures[`D-13 ${mode}`] = essai.r15
      if (essai.f.length) echecs.push(`D-13 (R-15) ${etiquette} : ${essai.f.join(', ')}`); else faits.push(`D-13 (R-15) ${etiquette} : photo visible, toile retirée à +1 100 ms`)
    }

    jalon('D-6, D-14, D-13')

    // ════ D. geste au repos, juge du site et Lighthouse : seulement si tout le reste passe (choix 10) ════
    for (const n of navs) await n.close().catch(() => {})
    if (echecs.length && !TOUT) faits.push(`REPOS (avec D-4), P-3 et P-1 : non lancés, ${echecs.length} échec(s) avant eux (--tout pour les forcer)`)
    else {
      const r = await lancerJuge('signature-relief-qa.mjs', 20 * 60000)
      const sortie = r.sortie || '', derniere = sortie.trim().split('\n').pop() || ''
      faits.push(`REPOS : signature-relief-qa.mjs → ${derniere.slice(0, 160)}`)
      if (r.code !== 0) echecs.push(`REPOS : signature-relief-qa.mjs en échec (${derniere.replace(/^✗ [^—]*— /, '').slice(0, 200)})`)
      if (/geste au repos : PASS/.test(sortie)) faits.push('D-4 : nav-retenue-qa.mjs PASS (lu dans signature-repos-qa.mjs, lancé par signature-relief-qa.mjs)')
      else if (/barre retenue : (✗|FAIL)/.test(sortie)) echecs.push('D-4 : nav-retenue-qa.mjs en échec (lu dans signature-repos-qa.mjs)')
      else faits.push('D-4 : non établi, signature-repos-qa.mjs n\'a pas rendu son verdict (voir REPOS)')
      jalon('REPOS')
      const echecsQa = (dossier) => {
        const q = spawnSync(process.execPath, [path.join(R, 'scripts', 'site-qa.mjs'), dossier, '--statique', '--json'], { cwd: R, encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 26 })
        try { return JSON.parse(q.stdout).blocs.flatMap((b) => b.tests.filter((t) => !t.passe).map((t) => `${b.nom} / ${t.nom}`)) } catch { return null }
      }
      const apres = echecsQa(SITE), avant = echecsQa(path.join(DEMOS, 'lestraque'))
      if (!apres || !avant) echecs.push('P-3 : sortie JSON de site-qa.mjs --statique illisible')
      else {
        const nouveaux = apres.filter((x) => !avant.includes(x))
        mesures['P-3'] = { avant, apres }
        faits.push(`P-3 : site-qa --statique, ${apres.length} échec(s) sur la copie, ${avant.length} sur le site en place`)
        if (nouveaux.length) echecs.push(`P-3 : site-qa.mjs --statique, échec(s) nouveau(x) : ${resumer(nouveaux, 2)}`)
      }
      jalon('P-3')
      if (minutes() > 23) echecs.push(`P-1 : non mesuré, le juge en est déjà à ${nombre(minutes(), 1)} min (plafond de l'orchestre : 30)`)
      else {
        const lh = spawnSync(process.execPath, [path.join(R, 'scripts', 'lighthouse-mediane.mjs'), SITE, `--resume=${path.join(PREUVE, 'lighthouse.json')}`], { cwd: R, encoding: 'utf8', timeout: 25 * 60000, maxBuffer: 1 << 26 })
        const ligne = `${lh.stdout || ''}${lh.stderr || ''}`.trim().split('\n').pop() || ''
        faits.push(`P-1 : ${ligne.slice(0, 180)}`)
        if (lh.status !== 0) echecs.push(`P-1 : Lighthouse mobile sous la barre (${ligne.slice(0, 160)})`)
        jalon('P-1')
      }
    }
  } finally {
    for (const n of navs) await n.close().catch(() => {})
    principalSrv.srv.close()
    if (temoinSrv) temoinSrv.srv.close()
  }
}

try { await principal() } catch (e) { echecs.push(`juge interrompu : ${String((e && e.message) || e).split('\n')[0].slice(0, 200)}`) }
for (const e of enfants) { try { if (e.exitCode === null) e.kill() } catch { /* déjà fini */ } }
fin()
