// scripts/recit-qa.mjs — le juge de la tâche 021-03 : le récit du plateau et de l'atelier de la démo Atelier Lestraque, famille
// « recit » (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.1 A, B et C, §3.2, §5.2, §5.3, §6.0 et §6.2
// RC-1 à RC-15). Le site est généré dans des copies (--sortie), servi en local avec le brotli et l'en-tête CSP de production
// (next.config.mjs), puis mesuré dans Chromium sans carte graphique ; le juge capture et filme lui-même. Jamais de génération en
// place : les copies sous .orchestre/travail/recit-qa-<pid>* sont supprimées à la sortie.
//
// Générations : « recit » = --familles=<déjà fusionnées>,recit ; « référence » = --familles=<déjà fusionnées> (aucune au 15/09).
// Méthodes (§6.0) : « cover c » d'un élément = position où (hauteur d'écran − haut) / (hauteur d'écran + hauteur) = c, le haut
// étant la position de mise en page (somme des offsetTop, transformations exclues, comme une view-timeline) ; « opacité
// effective » = produit des opacités calculées de l'élément et de ses parents ; « défilement continu » : la cadence du §6.0
// (5 px à chaque image), mais pilotée dans la page (choix du juge). Le 15/09, sous la charge des autres tâches, un
// page.mouse.wheel(0, 5) par aller-retour CDP tombait à 11 px/s : la citation mettait 11,8 s à se remplir une fois le bloc entier
// à l'écran, et le filet de 4 s partait avant le départ, à juste titre. RC-5 à RC-7 défilent donc à 300 px/s au temps
// (5 px par image à 60 images/s), RC-12 de 5 px à chaque image.
//
//   RC-1  génération avec recit acceptée (code 0) ; ordre des id de l'accueil = prestations, atelier, realisations, communes,
//         etapes, questions, contact, et identique à la référence (§0.3 point 1 ; generer.mjs, gardeFousScenes).
//         Choix du juge (§3.1 « Fichiers ») : _kit/familles/recit.mjs, recit.bureau.css et recit.js présents et non vides ; si
//         recit.bureau.css existe, la génération écrit bureau.css (sinon 021-20 n'est pas versée) ; site.js contient recit.js.
//   RC-2  nombre de span.citation__mot = nombre de mots de site.json → artisan.citation (découpe sur les espaces) ; texte de
//         chaque span = le mot ; texte du paragraphe = la citation ; --i = rang à partir de 0 (§3.1 A).
//   RC-3  1440×900 et 1088×800 : opacité effective de chaque mot de cover 0 (haut de la citation au bas de l'écran) à cover 70 %
//         par pas de 2 % : ≤ 0,57 partout à cover 0 ; ≥ 0,98 à cover 70 ; à chaque pas, mot i ≥ mot i+1 − 0,01 (kit.css:1136 et
//         :1091). Choix du juge (§3.1 A) : à cover 0, l'opacité propre de chaque mot vaut 0,55 ± 0,02 (le plancher sur lequel
//         RC-4 est calculé), et la figure .plateau__citation ne joue plus sa montée (opacité effective ≥ 0,99, transform none).
//   RC-4  contraste des mots au plancher 0,55, méthode du texte translucide (§0.1) : texte rendu transparent, pour chaque pixel des
//         boîtes des mots (getClientRects), couleur effective 0,55 × encre + 0,45 × fond, rapport WCAG avec le fond, p10 ≥ 3,0
//         (WCAG 1.4.3, grands caractères). Choix du juge : citation centrée dans l'écran (tous les mots à l'écran), 1440×900 et
//         1088×800 ; le mélange est fait en sRVB comme le compositeur et comme la contre-expertise (verbes-mots.mjs, qui donne
//         5,49), la luminance sur les valeurs linéarisées.
//   RC-5  chiffres, bureau, défilement continu (choix du juge : il part du début de la bande d'attente, où le bloc n'est pas
//         encore entier, et s'arrête quand le haut de .chiffres est à 40 px du haut de l'écran) : t0 = première valeur non vide de
//         .chiffre__compte ; échantillons à chaque image : à t0 + 300 ms, au moins une valeur visible ≠ finale ; fin atteinte
//         entre t0 + 1 100 et t0 + 1 500 ms ; à t0 + 2 000 ms, valeurs affichées = site.json → plateau.chiffres ; .chiffre__vrai
//         vaut toujours la valeur finale (ref-recit.md §1 R5, ≈ 1,3 s). Choix du juge : « fin » = retour à l'état initial du §3.1 B
//         (tous les .chiffre__compte vidés) — pas la première image où le nombre arrondi touche la valeur finale, qui arrive vers
//         960 ms avec cette courbe ; à t0 + 2 000 ms le bloc .chiffres a aussi une opacité effective ≥ 0,98 ; le comptage ne repart
//         jamais ensuite (« une seule fois ») ; .chiffre__vrai n'est jamais en display:none ; structure du crochet plateauValeur :
//         .chiffre__vrai (valeur finale) et .chiffre__compte aria-hidden="true", vide au chargement. Mesuré en 1440×900 et
//         1088×800.
//   RC-6  même défilement : t0 ≥ max(instant où le dernier mot atteint 0,98 d'opacité effective, instant où .chiffres est visible
//         à 100 %) + 250 ms (§2, un seul mouvement à la fois ; 0,3 s du §3.1 B moins une trame).
//   RC-7  largeur de chaque .chiffre__valeur pendant le comptage (t0 → fin) : constante à ±0,5 px autour de sa largeur finale
//         (site-qa.mjs, jugerGeste).
//   RC-8  verbes : 4 span.atelier__verbe, textes « trace », « débite », « assemble », « ponce » dans l'ordre, --i de 0 à 3, texte
//         de la phrase inchangé (contenu.json) ; opacités comme RC-3 sur la timeline de la phrase (0,55 → 1), en 1440×900 et
//         1088×800. Choix du juge (§3.1 C) : décalage vertical de chaque verbe par rapport à la phrase entre cover 0 et cover 70 =
//         0,12 em ± 1 px (translateY(.12em) → 0) ; une copie du site dont la phrase a perdu « ponce » est refusée par la
//         génération (code ≠ 0, message qui nomme « ponce »), rien n'est écrit.
//   RC-9  contraste des verbes à 0,55, méthode du texte translucide, boîtes des verbes, à cover 20, 38 et 52 % : p10 ≥ 4,5 en
//         1088×800 ; ≥ 3,0 en 1280×800 et 1440×900 (§3.1 C ; mesuré 5,28 à 5,40).
//   RC-10 mouvement réduit (1440×900), téléphone (390×844, dpr 3, tactile), JavaScript coupé (choix du juge : 1440×900, là où la
//         chorégraphie jouerait) : opacité propre des mots et des verbes = 1 à cover 10 % et centrés, opacité effective ≥ 0,98
//         centrés après 2 s (le dévoilement du kit au téléphone) ; valeurs affichées finales d'emblée (au chargement puis toutes
//         les 100 ms pendant 3 s, 0 changement de texte) ; bloc .chiffres visible (≥ 0,98) ; 0 animation dont le nom commence par
//         « citation- » ou « verbe- » (choix du juge : et « chiffres- »). Témoin, choix du juge : au bureau 1440×900, au moins une
//         animation citation-* par mot et verbe-* par verbe, pour que ce zéro ne soit pas vide ; choix du juge : tous les
//         @keyframes de recit*.css portent un nom qui commence par citation-, verbe- ou chiffres-.
//   RC-11 @keyframes de _kit/familles/recit*.css : seulement opacity, transform, translate (animation-timing-function toléré
//         dans une image-clé) (§3.2). Choix du juge, même origine : transitions seulement sur opacity, transform, translate,
//         scale, rotate, clip-path (jamais all ni une propriété de mise en page, jamais filter) ; valeurs cubic-bezier ∈
//         {(.16,1,.3,1) ; (.2,.7,.2,1) ; (.37,0,.63,1) ; (.45,0,.55,1)} (DF-5) ; pas de scroll-behavior:smooth (DF-1) ; dans
//         recit.js ni eval, ni new Function, ni Worker, ni blob:, ni WebAssembly (§5.3) ; écouteurs scroll, wheel, touchmove,
//         touchstart et pointermove posés par recit.js tous { passive: true } (§3.2 et DF-3, addEventListener instrumenté,
//         attribution par la ligne de site.js).
//   RC-12 défilement continu du haut de .ouverture à la fin de #atelier, 1440×900, sans carte : 0 tâche longue (≥ 50 ms,
//         PerformanceObserver longtask) ; témoin ≥ 100 changements de scrollY (cahier 020 D-12). Choix du juge (machine chargée
//         par d'autres tâches : le 15/09, la référence sans la famille en comptait 15) : jusqu'à 4 passages, le critère tient
//         dès qu'un passage n'en voit aucune (la charge ajoute des tâches longues, elle n'en retire pas) ; sinon la référence est
//         mesurée deux fois et le motif dit si elle en a aussi (« machine chargée, à relancer »).
//   RC-13 téléphone 390×844 dpr 3, cache désactivé : requêtes jusqu'à load (CDP) = celles de la référence, avec une seule
//         exception tolérée, bureau.css quand la famille en produit une (choix du juge : « même nombre » du §6.2 contre « + 1
//         bureau.css, non bloquante » du §5.2) ; croissance brotli 11 de styles.css ≤ 1 000 octets et de site.js ≤ 2 710 octets
//         contre la référence ; bureau.css ≤ 6 000 octets en brotli (§5.2) ; Lighthouse mobile, node scripts/lighthouse-mediane.mjs
//         (5 passes) : code 0 (médiane ≥ 95, LCP < 2 500 ms, et la barre complète de l'outil). Choix du juge : Lighthouse n'est
//         lancé que si tous les autres critères tiennent (plusieurs minutes, et le verdict serait FAIL de toute façon).
//   RC-14 visiteur arrêté dans la bande d'attente : 1440×900 à y = 840, 1088×800 à y = 675, 3 s sans défiler : opacité effective
//         de .chiffres ≤ 0,02, aucun nombre visible (§3.1 B). Choix du juge : si la page a changé de hauteur et que ce y sort de la
//         bande recalculée (de « chiffres vus », 12 % visibles avec la marge de −6 % de kit.js:159, à « citation pleine », cover
//         66 %), le milieu de la bande recalculée est pris et le fait est écrit ; .chiffres reste dans l'arbre d'accessibilité
//         (ni display:none, ni visibility:hidden, ni aria-hidden).
//   RC-15 filet : le dernier mot figé à 0,55 par une feuille injectée (!important), bloc .chiffres centré, visible à 100 % :
//         valeurs finales visibles (opacité effective ≥ 0,98) en ≤ 4,5 s (§3.1 B). Choix du juge : pendant les 3,5 premières
//         secondes, .chiffres reste à ≤ 0,02 (le filet est à 4 s) ; aucun comptage pendant le filet ; le figeage doit tenir
//         (dernier mot < 0,98), sinon la mesure est déclarée invalide.
//   §5.3  choix du juge : 0 violation CSP sur les pages de la famille ; 0 exception de page venue des lignes de recit.js.
//   §6.10 preuves du juge dans .orchestre/preuves/021-03/juge/ : citation-cover10|35|70-<format>.jpg, chiffres-film.mp4,
//         verbes-film.mp4, mesures.json ; jamais un fichier de 0 octet.
//
// Remesures (machine chargée par 021-02, 021-20, Blender, Chromium) : une position de RC-3 ou RC-8 en échec est remesurée après
// 2 s ; les scènes au temps (RC-5 à RC-7 avec RC-14, RC-15) sont rejouées une fois dans une page neuve avant d'échouer, quand la
// famille est en place.
//
// Contrôles à l'œil, non jugés ici (Claude Code puis Benj, §6.10) : citation-cover10/35/70 — les mots s'allument dans l'ordre de
// lecture, les mots pâles restent lisibles ; chiffres-film.mp4 — aucun nombre pendant l'attente, le bloc entre et compte après la
// citation, décélère, finit sur 10 / 180 / 8 ; verbes-film.mp4 — les quatre verbes s'allument avant le milieu de l'écran.
//
// Usage : node scripts/recit-qa.mjs
//         node scripts/recit-qa.mjs --sites=<copie de public/sites-demo> — seulement pour éprouver le juge sur une implémentation
//         d'essai hors du dépôt (générateur, kit et site lus dans la copie) ; le verdict de la tâche se prend sans cette option.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARG_SITES = process.argv.find((a) => a.startsWith('--sites='))
const DEMOS = ARG_SITES ? path.resolve(ARG_SITES.slice('--sites='.length)) : path.join(R, 'public', 'sites-demo')
const FAM = path.join(DEMOS, '_kit', 'familles')
const DEJA = [] // familles déjà fusionnées avant 021-03 (cahier §6.0 et §7.0) : aucune au 15/09
const TRAVAIL = path.join(R, '.orchestre', 'travail')
const SITE = path.join(TRAVAIL, `recit-qa-${process.pid}`)
const REF = path.join(TRAVAIL, `recit-qa-${process.pid}-reference`)
const GARDE = path.join(TRAVAIL, `recit-qa-${process.pid}-garde`)
const FILMS = path.join(TRAVAIL, `recit-qa-${process.pid}-films`)
// avec --sites (essai du juge), les preuves vont à côté de la copie, jamais dans celles de la tâche
const PREUVE = ARG_SITES ? path.join(path.dirname(DEMOS), 'juge-essai') : path.join(R, '.orchestre', 'preuves', '021-03', 'juge')
process.on('exit', () => { for (const d of [SITE, REF, GARDE, FILMS]) { try { fs.rmSync(d, { recursive: true, force: true }) } catch { /* rien */ } } })
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

const echecs = [], faits = [], M = {}
let fini = false
const fin = () => {
  if (fini) return
  fini = true
  try { fs.mkdirSync(PREUVE, { recursive: true }); fs.writeFileSync(path.join(PREUVE, 'mesures.json'), JSON.stringify({ date: new Date().toISOString(), echecs, faits, mesures: M }, null, 1)) } catch { /* preuve facultative ici */ }
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length
    ? `✗ récit du plateau et de l’atelier : FAIL — ${echecs.join(' ; ')}`
    : '✓ récit du plateau et de l’atelier : PASS — citation allumée mot à mot, chiffres invisibles jusqu’à la citation pleine puis comptés une fois, verbes allumés et lisibles, rien au téléphone, en mouvement réduit ni sans JavaScript, budgets tenus')
  process.exitCode = echecs.length ? 1 : 0
}
process.on('unhandledRejection', (e) => { echecs.push(`juge interrompu : ${String(e?.message || e).split('\n')[0].slice(0, 200)}`); fin(); process.exit(1) })
const chien = setTimeout(() => { echecs.push('juge interrompu : plus de 28 minutes'); fin(); process.exit(1) }, 28 * 60_000)
chien.unref()

const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const resume = (l, n = 3) => (l.length > n ? `${l.slice(0, n).join(', ')} (+${l.length - n})` : l.join(', '))
const brotli = (f) => { try { return zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length } catch { return null } }
const generer = (dossierSites, args) => {
  const r = spawnSync(process.execPath, [path.join(dossierSites, 'generer.mjs'), 'lestraque', ...args], { cwd: R, encoding: 'utf8', timeout: 300_000, maxBuffer: 1 << 26 })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`.trim() }
}
const parcourir = (o, f) => { if (o && typeof o === 'object') { f(o); for (const v of Object.values(o)) parcourir(v, f) } }

// ── Données de référence ───────────────────────────────────────────────────────────────────────────────────────────
const siteJson = JSON.parse(fs.readFileSync(path.join(DEMOS, 'lestraque', 'site.json'), 'utf8'))
const contenuJson = JSON.parse(fs.readFileSync(path.join(DEMOS, 'lestraque', 'contenu.json'), 'utf8'))
const CITATION = String(siteJson.artisan?.citation || '').replace(/\s+/g, ' ').trim()
const MOTS = CITATION.split(' ')
const FINALES = (siteJson.plateau?.chiffres || []).map((c) => String(c.valeur).trim())
const VERBES = ['trace', 'débite', 'assemble', 'ponce']
let PHRASE = null
parcourir(contenuJson.pages?.['/'], (o) => { if (!PHRASE && o.genre === 'atelier') PHRASE = (o.blocs || []).find((b) => b.type === 'p')?.texte || null })
PHRASE = PHRASE ? PHRASE.replace(/\s+/g, ' ').trim() : null
const ORDRE = ['prestations', 'atelier', 'realisations', 'communes', 'etapes', 'questions', 'contact']
const Y_BANDE = { 1440: 840, 1088: 675 }
const COURBES = [[0.16, 1, 0.3, 1], [0.2, 0.7, 0.2, 1], [0.37, 0, 0.63, 1], [0.45, 0, 0.55, 1]]

// ── Aides exécutées dans la page (évaluées sous forme de texte : la CSP de la page ne s'applique pas à l'évaluation) ──
const AIDES = `
const eff = (el) => { if (!el) return 0; if (getComputedStyle(el).visibility === 'hidden') return 0; let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none') return 0; o *= Number(cs.opacity) } return o };
const haut = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y };
const yCover = (el, c) => haut(el) - innerHeight + c * (innerHeight + el.offsetHeight);
const deux = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const aller = async (y) => { scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'instant' }); await deux(); return scrollY };
`
const ev = (page, corps, arg = null) => page.evaluate(`(async () => { ${AIDES}\nreturn await (${corps})(${JSON.stringify(arg)}) })()`)

try {
  // ── RC-1 : fichiers de la famille ──────────────────────────────────────────────────────────────────────────────
  const fichiersFamille = ['recit.mjs', 'recit.bureau.css', 'recit.js']
  const manquants = fichiersFamille.filter((f) => taille(path.join(FAM, f)) <= 0)
  if (manquants.length) echecs.push(`RC-1 : ${manquants.join(', ')} absent(s) ou vide(s) dans _kit/familles`)
  faits.push(`fichiers de la famille : ${fichiersFamille.map((f) => `${f} ${Math.max(0, taille(path.join(FAM, f)))} o`).join(', ')}`)

  // ── Générations ───────────────────────────────────────────────────────────────────────────────────────────────
  const gRef = generer(DEMOS, [`--familles=${DEJA.join(',')}`, `--sortie=${REF}`])
  if (gRef.code !== 0) throw new Error(`la génération de référence (--familles=${DEJA.join(',')}) échoue : ${gRef.sortie.split('\n').pop().slice(0, 200)}`)
  const gSite = generer(DEMOS, [`--familles=${[...DEJA, 'recit'].join(',')}`, `--sortie=${SITE}`])
  if (gSite.code !== 0) { echecs.push(`RC-1 : la génération avec recit est refusée (${gSite.sortie.split('\n').pop().slice(0, 240)})`); throw new Error('arrêt') }
  const htmlSite = lire(path.join(SITE, 'index.html')) || '', htmlRef = lire(path.join(REF, 'index.html')) || ''
  const ids = (html) => [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1])
  const ordreSite = ids(htmlSite).filter((i) => ORDRE.includes(i))
  faits.push(`RC-1 : génération acceptée ; ordre de l’accueil : ${ordreSite.join(', ')}`)
  if (ordreSite.join() !== ORDRE.join()) echecs.push(`RC-1 : ordre des sections ${ordreSite.join(', ')} (attendu ${ORDRE.join(', ')})`)
  if (ids(htmlSite).join() !== ids(htmlRef).join()) echecs.push('RC-1 : les id des sections de l’accueil diffèrent de la référence')
  if (taille(path.join(FAM, 'recit.bureau.css')) > 0 && taille(path.join(SITE, 'bureau.css')) <= 0) echecs.push('RC-1 : recit.bureau.css existe mais la génération n’écrit aucune bureau.css (la suite du socle 021-20 est-elle versée ?)')
  const recitJs = lire(path.join(FAM, 'recit.js')) || '', siteJs = lire(path.join(SITE, 'site.js')) || ''
  let recitLigne = Infinity
  if (recitJs.trim()) {
    const i = siteJs.indexOf(recitJs)
    if (i < 0) echecs.push('RC-1 : site.js généré ne contient pas recit.js')
    else recitLigne = siteJs.slice(0, i).split('\n').length
  }

  // ── RC-11 : les feuilles et le script de la famille, lus tels quels ──────────────────────────────────────────────
  {
    const feuilles = fs.existsSync(FAM) ? fs.readdirSync(FAM).filter((f) => /^recit(\.[a-z]+)*\.css$/.test(f)) : []
    const f11 = []
    let nImages = 0, nCourbes = 0
    for (const nom of feuilles) {
      const css = (lire(path.join(FAM, nom)) || '').replace(/\/\*[\s\S]*?\*\//g, '')
      const re = /@(?:-webkit-)?keyframes\s+([\w-]+)\s*\{/g
      let m
      while ((m = re.exec(css))) {
        let i = re.lastIndex, prof = 1
        while (i < css.length && prof) { if (css[i] === '{') prof++; else if (css[i] === '}') prof--; i++ }
        const corps = css.slice(re.lastIndex, i - 1)
        re.lastIndex = i
        nImages++
        const props = [...new Set([...corps.matchAll(/([a-zA-Z-]+)\s*:/g)].map((x) => x[1].toLowerCase()))]
        const interdites = props.filter((p) => !['opacity', 'transform', 'translate', 'animation-timing-function'].includes(p))
        if (interdites.length) f11.push(`@keyframes ${m[1]} anime ${interdites.join(', ')}`)
        if (!/^(citation-|verbe-|chiffres-)/.test(m[1])) f11.push(`@keyframes ${m[1]} : le nom doit commencer par citation-, verbe- ou chiffres- (RC-10)`)
      }
      for (const t of css.matchAll(/transition(-property)?\s*:\s*([^;}]+)/g)) {
        for (const item of t[2].split(',')) {
          const premier = item.trim().split(/\s+/)[0] || ''
          if (!['opacity', 'transform', 'translate', 'scale', 'rotate', 'clip-path', 'none'].includes(premier)) f11.push(`transition sur « ${premier || item.trim()} » dans ${nom}`)
        }
      }
      for (const c of css.matchAll(/cubic-bezier\(([^)]*)\)/g)) {
        nCourbes++
        const v = c[1].split(',').map((x) => Number(x.trim()))
        if (!COURBES.some((k) => k.every((x, j) => Math.abs(x - v[j]) < 1e-6))) f11.push(`cubic-bezier(${c[1].trim()}) hors du jeu du §3.2 dans ${nom}`)
      }
      if (/scroll-behavior\s*:\s*smooth/.test(css)) f11.push(`scroll-behavior:smooth dans ${nom}`)
    }
    const motsInterdits = [[/\beval\s*\(/, 'eval'], [/new\s+Function\b/, 'new Function'], [/\bWorker\s*\(/, 'Worker'], [/blob:/, 'blob:'], [/WebAssembly/, 'WebAssembly']].filter(([re]) => re.test(recitJs)).map(([, n]) => n)
    if (motsInterdits.length) f11.push(`recit.js utilise ${motsInterdits.join(', ')} (§5.3)`)
    faits.push(`RC-11 : ${feuilles.length} feuille(s) recit*.css, ${nImages} @keyframes, ${nCourbes} cubic-bezier`)
    if (f11.length) echecs.push(`RC-11 : ${resume(f11, 4)}`)
    M.rc11 = { feuilles, nImages, nCourbes, echecs: f11 }
  }

  // ── RC-13 (poids) : brotli 11 contre la référence ──────────────────────────────────────────────────────────────────
  {
    const p = {}
    for (const f of ['styles.css', 'site.js', 'bureau.css']) p[f] = { site: brotli(path.join(SITE, f)), ref: brotli(path.join(REF, f)), brutSite: taille(path.join(SITE, f)), brutRef: taille(path.join(REF, f)) }
    M.poids = p
    const d = (f) => (p[f].site ?? 0) - (p[f].ref ?? 0)
    faits.push(`RC-13 : brotli 11 — styles.css ${p['styles.css'].site} o (${d('styles.css') >= 0 ? '+' : ''}${d('styles.css')}), site.js ${p['site.js'].site} o (${d('site.js') >= 0 ? '+' : ''}${d('site.js')}), bureau.css ${p['bureau.css'].site ?? 'absente'}${p['bureau.css'].site != null ? ' o' : ''}`)
    if (d('styles.css') > 1000) echecs.push(`RC-13 : styles.css grossit de ${d('styles.css')} octets en brotli (≤ 1 000)`)
    if (d('site.js') > 2710) echecs.push(`RC-13 : site.js grossit de ${d('site.js')} octets en brotli (≤ 2 710)`)
    if ((p['bureau.css'].site ?? 0) > 6000) echecs.push(`RC-13 : bureau.css pèse ${p['bureau.css'].site} octets en brotli (≤ 6 000)`)
  }

  // ── RC-8 (garde) : une copie dont la phrase a perdu « ponce » est refusée ─────────────────────────────────────────────
  {
    const sites = path.join(GARDE, 'sites'), sortie = path.join(GARDE, 'sortie')
    let copie = false
    for (let essai = 0; essai < 2 && !copie; essai++) {
      try {
        fs.rmSync(sites, { recursive: true, force: true }); fs.mkdirSync(sites, { recursive: true })
        fs.copyFileSync(path.join(DEMOS, 'generer.mjs'), path.join(sites, 'generer.mjs'))
        for (const d of ['_kit', '_polices', 'lestraque']) fs.cpSync(path.join(DEMOS, d), path.join(sites, d), { recursive: true })
        copie = true
      } catch { await new Promise((ok) => setTimeout(ok, 2000)) }
    }
    if (!copie) echecs.push('RC-8 : copie du site pour l’essai du garde impossible')
    else {
      const f = path.join(sites, 'lestraque', 'contenu.json'), c = JSON.parse(fs.readFileSync(f, 'utf8'))
      let n = 0
      parcourir(c.pages?.['/'], (o) => { if (o.genre === 'atelier') for (const b of o.blocs || []) if (typeof b.texte === 'string' && b.texte.includes('ponce')) { b.texte = b.texte.replace('ponce', 'polit'); n++ } })
      fs.writeFileSync(f, JSON.stringify(c, null, 2))
      const g = generer(sites, [`--familles=${[...DEJA, 'recit'].join(',')}`, `--sortie=${sortie}`])
      M.garde = { remplacements: n, code: g.code, message: g.sortie.split('\n').pop().slice(0, 240), ecrit: fs.existsSync(sortie) }
      faits.push(`RC-8 : phrase sans « ponce » → code ${g.code}${g.code ? ` (« ${g.sortie.split('\n').pop().replace(/^\s*✗\s*/, '').slice(0, 120)} »)` : ''}`)
      if (!n) echecs.push('RC-8 : « ponce » introuvable dans la phrase de l’atelier (contenu.json)')
      else if (g.code === 0) echecs.push('RC-8 : la génération accepte une phrase de l’atelier sans « ponce » (le crochet garde doit la refuser)')
      else {
        if (!/ponce/i.test(g.sortie)) echecs.push('RC-8 : la génération est refusée, mais son message ne nomme pas le verbe manquant « ponce »')
        if (fs.existsSync(sortie)) echecs.push('RC-8 : le refus du garde laisse des fichiers écrits')
      }
    }
    try { fs.rmSync(GARDE, { recursive: true, force: true }) } catch { /* nettoyé à la sortie */ }
  }

  // ── Serveur : brotli et en-têtes de production ─────────────────────────────────────────────────────────────────────
  let ENTETES = []
  try {
    const conf = (await import(pathToFileURL(path.join(R, 'next.config.mjs')).href)).default
    const strict = (await conf.headers()).find((r) => r.source.startsWith('/((?!site'))
    ENTETES = strict.headers.filter((h) => h.key !== 'Strict-Transport-Security')
      .map((h) => (h.key === 'Content-Security-Policy' ? { key: h.key, value: h.value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ') } : h))
    if (!ENTETES.some((h) => h.key === 'Content-Security-Policy')) throw new Error('CSP absente de la route stricte')
  } catch (e) { echecs.push(`§6.0 : en-têtes de production illisibles dans next.config.mjs (${e.message})`) }
  const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', mp4: 'video/mp4' }
  const TEXTES = new Set(['html', 'css', 'js', 'json', 'svg', 'xml', 'txt'])
  const servir = (racine) => new Promise((ok) => {
    const cache = new Map()
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
      let f = null
      for (const base of [racine, path.join(DEMOS, 'lestraque'), DEMOS]) { const c = path.join(base, p); if (c.startsWith(base) && fs.existsSync(c) && fs.statSync(c).isFile()) { f = c; break } }
      if (!f) { r.writeHead(404); return r.end() }
      const ext = path.extname(f).slice(1).toLowerCase(), h = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' }
      for (const { key, value } of ENTETES) h[key] = value
      if (TEXTES.has(ext) && /\bbr\b/.test(q.headers['accept-encoding'] || '')) {
        if (!cache.has(f)) cache.set(f, zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }))
        h['content-encoding'] = 'br'; h.vary = 'Accept-Encoding'
        r.writeHead(200, h); return r.end(cache.get(f))
      }
      r.writeHead(200, h); fs.createReadStream(f).pipe(r)
    })
    srv.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}`, fermer: () => { srv.closeAllConnections?.(); srv.close() } }))
  })
  const S = await servir(SITE), SR = await servir(REF)

  const nav = await chromium.launch()
  const csp = { site: new Set(), ref: new Set() }, exceptions = []
  const ouvrir = async (serveur, options, { init = null, cle = 'site', avantGoto = null } = {}) => {
    const ctx = await nav.newContext(options)
    const tPage = Date.now()
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { const l = /site\.js:(\d+)/.exec(String(e.stack || '')); exceptions.push({ cle, message: String(e.message).slice(0, 160), ligne: l ? Number(l[1]) : null }) })
    page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy/i.test(m.text())) csp[cle].add(m.text().slice(0, 160)) })
    await page.addInitScript(() => { addEventListener('securitypolicyviolation', (e) => { (window.__csp = window.__csp || []).push(`${e.violatedDirective} ${e.blockedURI}`) }) })
    if (init) await page.addInitScript(init)
    const extra = avantGoto ? await avantGoto(page, ctx) : null
    await page.goto(`${serveur.url}/index.html`, { waitUntil: 'load', timeout: 120_000 })
    await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {})
    return { ctx, page, cle, tPage, extra }
  }
  const fermer = async (o) => {
    try { for (const x of await o.page.evaluate(() => window.__csp || [])) csp[o.cle].add(x) } catch { /* page fermée */ }
    await o.ctx.close().catch(() => {})
  }

  const LIRE_RAMPE = String(async ({ sel, enfant, c, attente }) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cible = yCover(el, c)
    const y = await aller(cible)
    if (attente) { await new Promise((ok) => setTimeout(ok, attente)); await deux() }
    const e = [...el.querySelectorAll(enfant)], re = el.getBoundingClientRect(), fig = el.closest('.plateau__citation')
    return { y, cible: Math.round(Math.max(0, cible)), eff: e.map(eff), propre: e.map((x) => Number(getComputedStyle(x).opacity)), dy: e.map((x) => x.getBoundingClientRect().top - re.top), fs: e.map((x) => parseFloat(getComputedStyle(x).fontSize)), fig: fig ? { eff: eff(fig), transform: getComputedStyle(fig).transform } : null }
  })
  // RC-3 et RC-8 : une rampe de cover 0 à 70 % par pas de 2 %
  const rampe = async (page, { sel, enfant, nom, id, format, figure = false, translation = false }) => {
    const mesures = {}, f = []
    let remesures = 0
    const juger = (c, m) => {
      const x = []
      if (!m) return ['élément introuvable']
      if (Math.abs(m.y - m.cible) > 2) x.push(`défilement arrêté à ${m.y} au lieu de ${m.cible}`)
      if (c === 0) {
        m.eff.forEach((o, i) => { if (o > 0.57) x.push(`${nom} ${i + 1} à ${o.toFixed(3)} (≤ 0,57)`) })
        m.propre.forEach((o, i) => { if (o < 0.53 || o > 0.57) x.push(`${nom} ${i + 1} : plancher ${o.toFixed(3)} (0,55 ± 0,02)`) })
        if (figure && m.fig && (m.fig.eff < 0.99 || m.fig.transform !== 'none')) x.push(`la figure joue encore sa montée (opacité ${m.fig.eff.toFixed(2)}, transform ${m.fig.transform})`)
      }
      if (c === 70) m.eff.forEach((o, i) => { if (o < 0.98) x.push(`${nom} ${i + 1} à ${o.toFixed(3)} (≥ 0,98)`) })
      for (let i = 0; i + 1 < m.eff.length; i++) if (m.eff[i] < m.eff[i + 1] - 0.01) x.push(`${nom} ${i + 1} (${m.eff[i].toFixed(3)}) sous ${nom} ${i + 2} (${m.eff[i + 1].toFixed(3)})`)
      return x
    }
    for (let c = 0; c <= 70; c += 2) {
      let m = await ev(page, LIRE_RAMPE, { sel, enfant, c: c / 100, attente: 0 })
      let x = juger(c, m)
      if (x.length && remesures < 6) { remesures++; m = await ev(page, LIRE_RAMPE, { sel, enfant, c: c / 100, attente: 2000 }); x = juger(c, m) }
      mesures[c] = m
      for (const y of x) f.push(`cover ${c} % : ${y}`)
    }
    if (translation && mesures[0] && mesures[70]) {
      mesures[0].dy.forEach((d0, i) => {
        const d = d0 - mesures[70].dy[i], attendu = 0.12 * mesures[0].fs[i]
        if (Math.abs(d - attendu) > 1) f.push(`${nom} ${i + 1} descend de ${d.toFixed(1)} px entre cover 0 et 70 % (0,12 em = ${attendu.toFixed(1)} ± 1 px)`)
      })
    }
    if (f.length) echecs.push(`${id} ${format} : ${resume(f, 3)}`)
    return { mesures: Object.fromEntries(Object.entries(mesures).map(([c, m]) => [c, m && { y: m.y, eff: m.eff.map((o) => +o.toFixed(3)), propre: m.propre.map((o) => +o.toFixed(3)) }])), echecs: f.length, remesures }
  }
  // RC-4 et RC-9 : contraste d'un texte translucide sur les boîtes de ses mots
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const contraste = async (page, { sel, enfant, place }) => {
    const r = await ev(page, String(async ({ sel, enfant, place }) => {
      const el = document.querySelector(sel)
      if (!el) return null
      await aller(place === 'centre' ? haut(el) - (innerHeight - el.offsetHeight) / 2 : yCover(el, place))
      const img = el.closest('section') && el.closest('section').querySelector('img')
      for (let k = 0; k < 60 && img && !(img.complete && img.naturalWidth > 0); k++) await new Promise((ok) => setTimeout(ok, 250))
      await new Promise((ok) => setTimeout(ok, 300))
      const e = [...el.querySelectorAll(enfant)]
      return { n: e.length, encre: getComputedStyle(e[0] || el).color, vw: innerWidth, vh: innerHeight, rects: e.flatMap((x) => [...x.getClientRects()].map((q) => ({ x: q.x, y: q.y, w: q.width, h: q.height }))) }
    }), { sel, enfant, place })
    if (!r || !r.n) return null
    const style = await page.addStyleTag({ content: `${sel},${sel} *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}` })
    await ev(page, String(async () => { await deux(); await new Promise((ok) => setTimeout(ok, 150)) }))
    const png = await page.screenshot({ type: 'png' })
    await style.evaluate((n) => n.remove()).catch(() => {})
    const encre = (r.encre.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const k = info.width / r.vw, ratios = []
    for (const q of r.rects) {
      const x0 = Math.max(0, Math.floor(q.x * k)), x1 = Math.min(info.width, Math.ceil((q.x + q.w) * k))
      const y0 = Math.max(0, Math.floor(q.y * k)), y1 = Math.min(info.height, Math.ceil((q.y + q.h) * k))
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * info.width + x) * 3
        const lb = lum(data[i], data[i + 1], data[i + 2])
        const lt = lum(0.55 * encre[0] + 0.45 * data[i], 0.55 * encre[1] + 0.45 * data[i + 1], 0.55 * encre[2] + 0.45 * data[i + 2])
        ratios.push((Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05))
      }
    }
    if (!ratios.length) return { p10: null, encre: r.encre, pixels: 0 }
    const s = Float64Array.from(ratios).sort()
    return { p10: +s[Math.floor(0.1 * (s.length - 1))].toFixed(2), encre: r.encre, pixels: ratios.length }
  }
  const ECOUTEURS = () => {
    const orig = EventTarget.prototype.addEventListener
    const liste = window.__ecouteurs = []
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (/^(scroll|wheel|touchmove|touchstart|pointermove)$/.test(type)) liste.push({ type, passif: !!(opts && typeof opts === 'object' && opts.passive === true), pile: String(new Error().stack || '').split('\n').slice(2, 6).join(' | ') })
      return orig.call(this, type, fn, opts)
    }
  }

  let familleEnPlace = false
  M.bureau = {}
  fs.mkdirSync(PREUVE, { recursive: true })
  try {
    // ── Bureau 1440×900 et 1088×800 : RC-2, RC-3, RC-4, RC-8, RC-9, témoin de RC-10, écouteurs, images ─────────────
    for (const [l, h] of [[1440, 900], [1088, 800]]) {
      const format = `${l}×${h}`, mb = M.bureau[`${l}x${h}`] = {}
      const o = await ouvrir(S, { viewport: { width: l, height: h } }, { init: l === 1440 ? ECOUTEURS : null })
      try {
        await o.page.waitForTimeout(1500)
        const dom = await ev(o.page, String(() => {
          const p = document.querySelector('.plateau__citation p'), ph = document.querySelector('.atelier__phrase')
          const noms = document.getAnimations().map((a) => a.animationName || '')
          return {
            choregraphie: document.documentElement.classList.contains('js') && CSS.supports('animation-timeline: view()') && matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)').matches,
            texteP: p ? p.textContent.replace(/\s+/g, ' ').trim() : null,
            mots: p ? [...p.querySelectorAll('span.citation__mot')].map((s) => ({ t: s.textContent, i: s.style.getPropertyValue('--i').trim() })) : [],
            motsPage: document.querySelectorAll('.citation__mot').length,
            phrase: ph ? ph.textContent.replace(/\s+/g, ' ').trim() : null,
            verbes: ph ? [...ph.querySelectorAll('span.atelier__verbe')].map((s) => ({ t: s.textContent, i: s.style.getPropertyValue('--i').trim() })) : [],
            valeurs: [...document.querySelectorAll('.chiffres .chiffre__valeur')].map((v) => ({ vrai: v.querySelector('.chiffre__vrai') ? v.querySelector('.chiffre__vrai').textContent : null, compte: v.querySelector('.chiffre__compte') ? v.querySelector('.chiffre__compte').textContent : null, aria: v.querySelector('.chiffre__compte') ? v.querySelector('.chiffre__compte').getAttribute('aria-hidden') : null })),
            attente: !!document.querySelector('.chiffres.chiffres--attente'),
            animCitation: noms.filter((n) => n.startsWith('citation-')).length, animVerbe: noms.filter((n) => n.startsWith('verbe-')).length,
          }
        }))
        mb.dom = dom
        if (!dom.choregraphie) echecs.push(`§6.0 ${format} : la chorégraphie de bureau ne s’applique pas dans ce Chromium (view() ou html.js absents) : mesure impossible`)
        if (l === 1440) {
          // RC-2
          const f2 = []
          if (dom.mots.length !== MOTS.length) f2.push(`${dom.mots.length} span.citation__mot pour ${MOTS.length} mots`)
          else {
            dom.mots.forEach((s, i) => { if (s.t !== MOTS[i]) f2.push(`mot ${i + 1} « ${s.t} » au lieu de « ${MOTS[i]} »`); if (s.i !== String(i)) f2.push(`mot ${i + 1} : --i « ${s.i} » au lieu de ${i}`) })
            if (dom.motsPage !== dom.mots.length) f2.push(`${dom.motsPage - dom.mots.length} .citation__mot hors de la citation`)
          }
          if (dom.texteP !== CITATION) f2.push(`texte de la citation « ${String(dom.texteP).slice(0, 60)} » différent de site.json`)
          faits.push(`RC-2 : ${dom.mots.length} span.citation__mot sur ${MOTS.length} mots`)
          if (f2.length) echecs.push(`RC-2 : ${resume(f2)}`)
          // RC-8 (structure)
          const f8 = []
          if (dom.verbes.length !== 4) f8.push(`${dom.verbes.length} span.atelier__verbe au lieu de 4`)
          else dom.verbes.forEach((s, i) => { if (s.t !== VERBES[i]) f8.push(`verbe ${i + 1} « ${s.t} » au lieu de « ${VERBES[i]} »`); if (s.i !== String(i)) f8.push(`verbe ${i + 1} : --i « ${s.i} » au lieu de ${i}`) })
          if (dom.phrase !== PHRASE) f8.push(`texte de la phrase « ${String(dom.phrase).slice(0, 60)} » différent de contenu.json`)
          faits.push(`RC-8 : ${dom.verbes.length} span.atelier__verbe (${dom.verbes.map((v) => v.t).join(', ') || 'aucun'})`)
          if (f8.length) echecs.push(`RC-8 : ${resume(f8)}`)
          // RC-5 (structure du crochet plateauValeur)
          const f5 = []
          if (dom.valeurs.length !== FINALES.length) f5.push(`${dom.valeurs.length} .chiffre__valeur pour ${FINALES.length} chiffres`)
          dom.valeurs.forEach((v, i) => {
            if (v.vrai == null) f5.push(`chiffre ${i + 1} sans .chiffre__vrai`); else if (v.vrai.trim() !== FINALES[i]) f5.push(`chiffre ${i + 1} : .chiffre__vrai « ${v.vrai} » au lieu de ${FINALES[i]}`)
            if (v.compte == null) f5.push(`chiffre ${i + 1} sans .chiffre__compte`); else { if (v.aria !== 'true') f5.push(`chiffre ${i + 1} : .chiffre__compte sans aria-hidden="true"`); if (v.compte.trim() !== '') f5.push(`chiffre ${i + 1} : .chiffre__compte non vide au chargement`) }
          })
          if (f5.length) echecs.push(`RC-5 : ${resume(f5)}`)
          familleEnPlace = dom.mots.length > 0 && dom.valeurs.length > 0 && dom.valeurs.every((v) => v.compte != null && v.vrai != null)
          faits.push(`chargement au bureau : classe chiffres--attente ${dom.attente ? 'posée' : 'absente'} ; animations citation-* ${dom.animCitation}, verbe-* ${dom.animVerbe}`)
          if (dom.animCitation < MOTS.length || dom.animVerbe < VERBES.length) echecs.push(`RC-10 (témoin) : au bureau, ${dom.animCitation} animation(s) citation-* et ${dom.animVerbe} verbe-* (au moins ${MOTS.length} et ${VERBES.length})`)
        }
        // RC-3
        if (dom.mots.length) mb.rc3 = await rampe(o.page, { sel: '.plateau__citation p', enfant: '.citation__mot', nom: 'mot', id: 'RC-3', format, figure: true })
        else if (l === 1440) echecs.push('RC-3 : aucun mot à mesurer')
        // images de la citation
        if (dom.texteP != null) for (const c of [10, 35, 70]) {
          await ev(o.page, String(async (c) => { const p = document.querySelector('.plateau__citation p'); await aller(yCover(p, c)); await new Promise((ok) => setTimeout(ok, 400)) }), c / 100)
          const f = path.join(PREUVE, `citation-cover${c}-${l}x${h}.jpg`)
          await o.page.screenshot({ type: 'jpeg', quality: 82, path: f })
          if (taille(f) <= 0) echecs.push(`§6.10 : ${path.basename(f)} vide`)
        }
        // RC-4
        if (dom.mots.length) {
          const c4 = await contraste(o.page, { sel: '.plateau__citation p', enfant: '.citation__mot', place: 'centre' })
          mb.rc4 = c4
          faits.push(`RC-4 ${format} : contraste des mots à 0,55, p10 ${c4?.p10 ?? '—'} (encre ${c4?.encre ?? '—'})`)
          if (!c4 || c4.p10 == null || c4.p10 < 3.0) echecs.push(`RC-4 ${format} : p10 ${c4?.p10 ?? 'non mesuré'} (≥ 3,0)`)
        }
        // RC-8
        if (dom.verbes.length) mb.rc8 = await rampe(o.page, { sel: '.atelier__phrase', enfant: '.atelier__verbe', nom: 'verbe', id: 'RC-8', format, translation: true })
        else if (l === 1440) echecs.push('RC-8 : aucun verbe à mesurer')
        // RC-9
        if (dom.verbes.length) {
          mb.rc9 = {}
          for (const c of [20, 38, 52]) {
            const c9 = await contraste(o.page, { sel: '.atelier__phrase', enfant: '.atelier__verbe', place: c / 100 })
            mb.rc9[c] = c9
            const seuil = l === 1088 ? 4.5 : 3.0
            if (!c9 || c9.p10 == null || c9.p10 < seuil) echecs.push(`RC-9 ${format} cover ${c} % : p10 ${c9?.p10 ?? 'non mesuré'} (≥ ${String(seuil).replace('.', ',')})`)
          }
          faits.push(`RC-9 ${format} : p10 des verbes à cover 20/38/52 % : ${[20, 38, 52].map((c) => mb.rc9[c]?.p10 ?? '—').join(' / ')}`)
        }
        // écouteurs de recit.js
        if (l === 1440) {
          const liste = await o.page.evaluate(() => window.__ecouteurs || [])
          const deRecit = liste.map((e) => ({ ...e, ligne: Number((/site\.js:(\d+):\d+/.exec(e.pile) || [])[1] || 0) })).filter((e) => e.ligne >= recitLigne)
          M.ecouteurs = deRecit
          faits.push(`écouteurs de défilement posés par recit.js : ${deRecit.length} (${deRecit.filter((e) => e.passif).length} passifs)`)
          const actifs = deRecit.filter((e) => !e.passif).map((e) => e.type)
          if (actifs.length) echecs.push(`RC-11 : écouteur(s) ${[...new Set(actifs)].join(', ')} de recit.js sans { passive: true } (§3.2)`)
        }
      } finally { await fermer(o) }
    }
    // RC-9 en 1280×800
    {
      const o = await ouvrir(S, { viewport: { width: 1280, height: 800 } })
      try {
        await o.page.waitForTimeout(1500)
        const n = await ev(o.page, String(() => document.querySelectorAll('.atelier__phrase .atelier__verbe').length))
        if (n) {
          const r9 = M.bureau['1280x800'] = {}
          for (const c of [20, 38, 52]) {
            r9[c] = await contraste(o.page, { sel: '.atelier__phrase', enfant: '.atelier__verbe', place: c / 100 })
            if (!r9[c] || r9[c].p10 == null || r9[c].p10 < 3.0) echecs.push(`RC-9 1280×800 cover ${c} % : p10 ${r9[c]?.p10 ?? 'non mesuré'} (≥ 3,0)`)
          }
          faits.push(`RC-9 1280×800 : p10 des verbes à cover 20/38/52 % : ${[20, 38, 52].map((c) => r9[c]?.p10 ?? '—').join(' / ')}`)
        }
      } finally { await fermer(o) }
    }

    // ── RC-14 puis RC-5, RC-6, RC-7 : la bande d'attente, puis le départ en défilement continu ─────────────────────────
    const ECHANTILLONNEUR = String(() => {
      const mots = [...document.querySelectorAll('.plateau__citation .citation__mot')]
      const dernier = mots.length ? mots[mots.length - 1] : null
      const bloc = document.querySelector('.chiffres')
      const vals = [...document.querySelectorAll('.chiffres .chiffre__valeur')]
      const rc = window.__rc = { ech: [], t0: null, on: true }
      const tour = () => {
        if (!rc.on) return
        const rb = bloc.getBoundingClientRect()
        const v = vals.map((x) => {
          const vr = x.querySelector('.chiffre__vrai'), co = x.querySelector('.chiffre__compte')
          return [vr ? vr.textContent : null, vr ? getComputedStyle(vr).display : null, co ? co.textContent : null, co ? eff(co) : 0, co ? co.getBoundingClientRect().width : 0, x.getBoundingClientRect().width, eff(x), x.textContent]
        })
        const t = performance.now()
        if (rc.t0 == null && v.some((z) => z[2] != null && z[2].trim() !== '')) rc.t0 = t
        rc.ech.push({ t, y: scrollY, d: dernier ? eff(dernier) : null, bv: rb.height > 0 && rb.top >= -0.5 && rb.bottom <= innerHeight + 0.5, bo: eff(bloc), v })
        // le défilement continu, au temps, après la mesure de l'image
        if (rc.defile) scrollTo({ top: Math.min(rc.defile.fin, rc.defile.d + ((performance.now() - rc.defile.t) / 1000) * rc.defile.v), behavior: 'instant' })
        requestAnimationFrame(tour)
      }
      requestAnimationFrame(tour)
      return !!bloc
    })
    const BANDE = String(async (yCahier) => {
      const p = document.querySelector('.plateau__citation p'), ch = document.querySelector('.chiffres')
      if (!p || !ch) return { erreur: 'citation ou .chiffres introuvable' }
      const yVu = haut(ch) - 0.94 * innerHeight + 0.12 * ch.offsetHeight, yPlein = yCover(p, 0.66)
      const dedans = yCahier > yVu && yCahier < yPlein
      const y = dedans || yVu >= yPlein ? yCahier : Math.round((yVu + yPlein) / 2)
      await aller(y)
      await new Promise((ok) => setTimeout(ok, 200))
      const ech = [], t = performance.now()
      while (performance.now() - t < 3000) {
        const cs = getComputedStyle(ch)
        const visibles = [...ch.querySelectorAll('.chiffre__valeur, .chiffre__valeur *')].filter((el) => el.children.length === 0 && /\d/.test(el.textContent) && eff(el) > 0.02).map((el) => el.textContent.trim())
        ech.push({ bo: eff(ch), visibles, display: cs.display, visibility: cs.visibility, aria: ch.getAttribute('aria-hidden'), y: scrollY })
        await new Promise((ok) => setTimeout(ok, 100))
      }
      // départ du défilement de RC-5 : au début de la bande, bloc pas encore entier (en 1088×800, il l'est déjà à y = 675, et
      // 4 s d'arrêt y déclencheraient le filet) ; on y va dans la même évaluation, sans aller-retour
      const yEntier = haut(ch) + ch.offsetHeight - innerHeight
      const yDepart = Math.max(0, Math.round(Math.min(yVu, yEntier - 60)))
      await aller(yDepart)
      return { yVu: Math.round(yVu), yPlein: Math.round(yPlein), yEntier: Math.round(yEntier), yCahier, y, dedans, ech, yDepart, yStop: Math.round(haut(ch) - 40) }
    })
    const nonVide = (z) => z[2] != null && z[2].trim() !== ''
    const compteVisible = (z) => nonVide(z) && z[3] >= 0.1 && z[4] >= 1
    const affiche = (z) => (compteVisible(z) ? z[2].trim() : z[0] != null ? z[0].trim() : String(z[7] || '').trim())
    const jugerBande = (b) => {
      if (!b || b.erreur) return [`RC-14 : ${b?.erreur || 'mesure impossible'}`]
      const f = []
      const pire = Math.max(...b.ech.map((e) => e.bo))
      if (pire > 0.02) f.push(`RC-14 : arrêté à y = ${b.y}, opacité effective de .chiffres jusqu’à ${pire.toFixed(2)} (≤ 0,02)`)
      const vus = [...new Set(b.ech.flatMap((e) => e.visibles))]
      if (vus.length) f.push(`RC-14 : nombres visibles pendant l’attente (${vus.join(', ')})`)
      if (b.ech.some((e) => e.display === 'none' || e.visibility !== 'visible' || e.aria === 'true')) f.push('RC-14 : .chiffres sort de l’arbre d’accessibilité (display, visibility ou aria-hidden) au lieu d’une opacité 0')
      return f
    }
    const jugerComptage = (r) => {
      const f = [], info = {}, ech = r.ech || []
      if (!ech.length || !ech[0].v.length) return { f: ['RC-5 : aucun échantillon des chiffres'], info }
      const t = (pred) => { const e = ech.find(pred); return e ? e.t : null }
      const tCit = t((e) => e.d != null && e.d >= 0.98), tBloc = t((e) => e.bv), t0 = t((e) => e.v.some(nonVide))
      Object.assign(info, { changements: r.changements, yFin: r.yFin, tCitation: tCit, tBloc, t0 })
      if (!(r.changements >= 100 || r.arret)) f.push(`RC-5 : défilement continu non tenu (${r.changements} changements de scrollY)`)
      if (tCit == null) f.push('RC-6 : le dernier mot n’atteint jamais 0,98 d’opacité pendant le défilement')
      if (tBloc == null) f.push('RC-6 : .chiffres jamais visible à 100 %')
      if (t0 == null) f.push('RC-5 : aucun départ (.chiffre__compte reste vide)')
      else {
        if (tCit != null && tBloc != null) { const m = Math.max(tCit, tBloc); info.ecartDepart = Math.round(t0 - m); if (t0 < m + 250) f.push(`RC-6 : départ ${Math.round(t0 - m)} ms après max(citation pleine, bloc entier visible), 250 au moins`) }
        const s300 = ech.find((e) => e.t >= t0 + 300)
        if (!s300) f.push('RC-5 : pas d’échantillon à t0 + 300 ms')
        else if (!s300.v.some((z, i) => compteVisible(z) && z[2].trim() !== FINALES[i])) f.push(`RC-5 : à t0 + 300 ms, aucune valeur visible en cours de comptage (${s300.v.map(affiche).join(' / ')})`)
        const sFin = ech.find((e) => e.t > t0 && e.v.every((z) => !nonVide(z)))
        if (!sFin) f.push('RC-5 : .chiffre__compte n’est jamais vidé (le comptage ne rend pas la main à .chiffre__vrai)')
        else {
          info.dureeComptage = Math.round(sFin.t - t0)
          if (sFin.t - t0 < 1100 || sFin.t - t0 > 1500) f.push(`RC-5 : fin du comptage à t0 + ${Math.round(sFin.t - t0)} ms (de 1 100 à 1 500)`)
          const rejoue = ech.find((e) => e.t > sFin.t && e.v.some(nonVide))
          if (rejoue) f.push(`RC-5 : le comptage repart à t0 + ${Math.round(rejoue.t - t0)} ms (une seule fois)`)
          const ref = ech[ech.length - 1].v.map((z) => z[5])
          let pire = 0
          for (const e of ech) if (e.t >= t0 && e.t <= sFin.t) e.v.forEach((z, i) => { pire = Math.max(pire, Math.abs(z[5] - ref[i])) })
          info.largeurEcartMax = +pire.toFixed(2)
          if (pire > 0.5) f.push(`RC-7 : la largeur de .chiffre__valeur bouge de ${pire.toFixed(2)} px pendant le comptage (±0,5)`)
        }
        const s2000 = ech.find((e) => e.t >= t0 + 2000)
        if (!s2000) f.push('RC-5 : pas d’échantillon à t0 + 2 000 ms')
        else if (!s2000.v.every((z, i) => affiche(z) === FINALES[i]) || s2000.bo < 0.98) f.push(`RC-5 : à t0 + 2 000 ms, ${s2000.v.map(affiche).join(' / ')} avec .chiffres à ${s2000.bo.toFixed(2)} (${FINALES.join(' / ')}, bloc ≥ 0,98 attendus)`)
        info.serie100 = []
        for (let k = 0; k <= 25; k++) { const e = ech.find((x) => x.t >= t0 - 500 + k * 100); if (e) info.serie100.push({ dt: Math.round(e.t - t0), valeurs: e.v.map(affiche), opacite: +e.bo.toFixed(2) }) }
      }
      const faux = ech.find((e) => e.v.some((z, i) => z[0] != null && z[0].trim() !== FINALES[i]))
      if (faux) f.push(`RC-5 : .chiffre__vrai ne vaut pas toujours la valeur finale (${faux.v.map((z) => z[0]).join(' / ')})`)
      if (ech.some((e) => e.v.some((z) => z[1] === 'none'))) f.push('RC-5 : .chiffre__vrai passe en display:none (il doit rester lu par les lecteurs d’écran)')
      return { f, info }
    }
    const scenePlateau = async (l, h) => {
      const o = await ouvrir(S, { viewport: { width: l, height: h } })
      try {
        await o.page.waitForTimeout(1500)
        const bande = await ev(o.page, BANDE, Y_BANDE[l])
        if (bande.erreur) return { bande }
        await o.page.mouse.move(Math.round(l / 2), Math.round(h / 2))
        if (!(await ev(o.page, ECHANTILLONNEUR))) return { bande: { erreur: '.chiffres introuvable' } }
        await o.page.waitForTimeout(1000)
        const tDefile = await ev(o.page, String((fin) => { window.__rc.defile = { d: scrollY, t: performance.now(), v: 300, fin }; return window.__rc.defile.t }), bande.yStop)
        const debut = Date.now()
        while (Date.now() - debut < 60_000) {
          await o.page.waitForTimeout(250)
          const et = await o.page.evaluate(() => ({ t: performance.now(), t0: window.__rc.t0 }))
          if (et.t0 != null && et.t >= et.t0 + 3000) break
          if (et.t0 == null && et.t >= tDefile + 12_000) break
        }
        const ech = await o.page.evaluate(() => { window.__rc.on = false; window.__rc.defile = null; return window.__rc.ech })
        const apres = ech.filter((e) => e.t >= tDefile)
        const changements = apres.slice(1).filter((e, i) => e.y !== apres[i].y).length
        const yFin = ech.length ? ech[ech.length - 1].y : 0
        return { bande, ech, changements, arret: apres.some((e) => e.y >= bande.yStop - 1), yFin }
      } finally { await fermer(o) }
    }
    for (const [l, h] of [[1440, 900], [1088, 800]]) {
      const format = `${l}×${h}`
      let r = await scenePlateau(l, h), jb = jugerBande(r.bande), jc = r.ech ? jugerComptage(r) : { f: [], info: {} }
      if ((jb.length || jc.f.length) && familleEnPlace) {
        faits.push(`${format} : bande et départ en échec au 1er passage (${[...jb, ...jc.f][0]}) — rejoués dans une page neuve`)
        r = await scenePlateau(l, h); jb = jugerBande(r.bande); jc = r.ech ? jugerComptage(r) : { f: [], info: {} }
      }
      if (r.bande && !r.bande.erreur) {
        faits.push(`RC-14 ${format} : arrêt à y = ${r.bande.y}${r.bande.dedans ? '' : ` (y du cahier ${r.bande.yCahier} hors de la bande recalculée ${r.bande.yVu} → ${r.bande.yPlein})`}, opacité de .chiffres au plus ${Math.max(...r.bande.ech.map((e) => e.bo)).toFixed(2)} en 3 s`)
      }
      if (jc.info.t0 != null) faits.push(`RC-5/6/7 ${format} : départ ${jc.info.ecartDepart ?? '—'} ms après la citation pleine et le bloc entier, comptage ${jc.info.dureeComptage ?? '—'} ms, largeur à ±${jc.info.largeurEcartMax ?? '—'} px, ${jc.info.changements} images de défilement depuis y = ${r.bande.yDepart}`)
      else if (r.ech) faits.push(`RC-5/6/7 ${format} : aucun départ en ${jc.info.changements ?? 0} images de défilement depuis y = ${r.bande.yDepart}`)
      M[`plateau-${l}x${h}`] = { bande: r.bande && { ...r.bande, ech: undefined, pireOpacite: r.bande.ech ? Math.max(...r.bande.ech.map((e) => e.bo)) : null }, comptage: jc.info }
      for (const x of [...jb, ...jc.f]) echecs.push(`${x} (${format})`)
    }

    // ── RC-15 : le filet de 4 s ────────────────────────────────────────────────────────────────────────────────────
    const filet = async () => {
      const o = await ouvrir(S, { viewport: { width: 1440, height: 900 } })
      try {
        await o.page.waitForTimeout(1500)
        await o.page.addStyleTag({ content: '.plateau__citation .citation__mot:last-of-type{animation:none!important;transition:none!important;opacity:.55!important}' })
        if (!(await ev(o.page, ECHANTILLONNEUR))) return { erreur: '.chiffres introuvable' }
        await ev(o.page, String(async () => { const ch = document.querySelector('.chiffres'); await aller(haut(ch) - (innerHeight - ch.offsetHeight) / 2) }))
        await o.page.waitForTimeout(6500)
        const ech = await o.page.evaluate(() => { window.__rc.on = false; return window.__rc.ech })
        const f = [], info = {}
        const eVis = ech.find((e) => e.bv)
        if (!eVis) return { f: ['RC-15 : .chiffres jamais visible à 100 %'], info }
        const tVis = eVis.t
        const eFinal = ech.find((e) => e.t >= tVis && e.v.length && e.v.every((z, i) => affiche(z) === FINALES[i] && z[6] >= 0.98))
        info.dernierMax = +Math.max(...ech.map((e) => e.d ?? 0)).toFixed(3)
        info.opaciteAvantFilet = +Math.max(0, ...ech.filter((e) => e.t >= tVis && e.t < tVis + 3500).map((e) => e.bo)).toFixed(3)
        info.delai = eFinal ? Math.round(eFinal.t - tVis) : null
        if (info.dernierMax >= 0.98) f.push(`RC-15 : mesure invalide, le dernier mot n’a pas pu être figé (opacité ${info.dernierMax})`)
        if (ech.some((e) => e.v.some(nonVide))) f.push('RC-15 : comptage pendant le filet (le départ doit lire l’opacité calculée du dernier mot, et le filet afficher sans compter)')
        if (info.opaciteAvantFilet > 0.02) f.push(`RC-15 : citation non pleine, .chiffres à ${info.opaciteAvantFilet} d’opacité avant le filet de 4 s (≤ 0,02)`)
        if (info.delai == null) f.push('RC-15 : valeurs finales jamais visibles en 6,5 s')
        else if (info.delai > 4500) f.push(`RC-15 : valeurs finales visibles ${info.delai} ms après le bloc entier (≤ 4 500)`)
        return { f, info }
      } finally { await fermer(o) }
    }
    {
      let r = await filet()
      if (r.f?.length && familleEnPlace) { faits.push(`RC-15 : échec au 1er passage (${r.f[0]}) — rejoué`); r = await filet() }
      M.filet = r.info
      if (r.erreur) echecs.push(`RC-15 : ${r.erreur}`)
      else {
        faits.push(`RC-15 : valeurs visibles ${r.info.delai ?? '—'} ms après le bloc entier, opacité avant le filet ${r.info.opaciteAvantFilet}, dernier mot figé à ${r.info.dernierMax}`)
        echecs.push(...r.f)
      }
    }

    // ── RC-10 : mouvement réduit, téléphone, JavaScript coupé ─────────────────────────────────────────────────────────
    const LIRE_VALEURS = String(() => [...document.querySelectorAll('.chiffres .chiffre__valeur')].map((x) => {
      const co = x.querySelector('.chiffre__compte'), vr = x.querySelector('.chiffre__vrai')
      const cv = co && co.textContent.trim() !== '' && eff(co) >= 0.1
      return { aff: (cv ? co.textContent : vr ? vr.textContent : x.textContent).trim(), op: +eff(x).toFixed(3) }
    }))
    const PLACER = String(({ sel, c }) => { const el = document.querySelector(sel); if (!el) return null; const y = c === 'centre' ? haut(el) - (innerHeight - el.offsetHeight) / 2 : yCover(el, c); scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'instant' }); return scrollY })
    const PROPRES = String(({ sel, enfant }) => { const e = [...document.querySelector(sel).querySelectorAll(enfant)]; return { propre: e.map((x) => +Number(getComputedStyle(x).opacity).toFixed(3)), eff: e.map((x) => +eff(x).toFixed(3)) } })
    for (const [nom, options] of [
      ['mouvement réduit', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
      ['téléphone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
      ['sans JavaScript', { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }],
    ]) {
      const o = await ouvrir(S, options)
      const r = {}, f = []
      try {
        await o.page.waitForTimeout(1500)
        r.charge = await ev(o.page, LIRE_VALEURS)
        await ev(o.page, String(() => { document.documentElement.classList.add('tout-rendu'); return true }))
        for (const [cle, sel, enfant] of [['mots', '.plateau__citation p', '.citation__mot'], ['verbes', '.atelier__phrase', '.atelier__verbe']]) {
          const n = await ev(o.page, String(({ sel, enfant }) => { const el = document.querySelector(sel); return el ? el.querySelectorAll(enfant).length : 0 }), { sel, enfant })
          if (!n) continue
          await ev(o.page, PLACER, { sel, c: 0.10 }); await o.page.waitForTimeout(500)
          const c10 = await ev(o.page, PROPRES, { sel, enfant })
          await ev(o.page, PLACER, { sel, c: 'centre' }); await o.page.waitForTimeout(2000)
          let centre = await ev(o.page, PROPRES, { sel, enfant })
          if (centre.eff.some((x) => x < 0.98) || centre.propre.some((x) => x < 0.99)) { await o.page.waitForTimeout(2000); centre = await ev(o.page, PROPRES, { sel, enfant }) }
          r[cle] = { n, c10: c10.propre, centre }
          if (c10.propre.some((x) => x < 0.99)) f.push(`${cle} à ${Math.min(...c10.propre)} d’opacité propre à cover 10 %`)
          if (centre.propre.some((x) => x < 0.99)) f.push(`${cle} à ${Math.min(...centre.propre)} d’opacité propre, centrés`)
          if (centre.eff.some((x) => x < 0.98)) f.push(`${cle} à ${Math.min(...centre.eff)} d’opacité effective, centrés`)
        }
        await ev(o.page, PLACER, { sel: '.chiffres', c: 'centre' })
        r.valeurs = []
        const t = Date.now()
        while (Date.now() - t < 3000) { r.valeurs.push((await ev(o.page, LIRE_VALEURS)).map((v) => v.aff).join(' / ')); await o.page.waitForTimeout(100) }
        r.fin = await ev(o.page, LIRE_VALEURS)
        if (r.fin.some((v) => v.op < 0.98)) { await o.page.waitForTimeout(2000); r.fin = await ev(o.page, LIRE_VALEURS) }
        r.animations = await ev(o.page, String(() => document.getAnimations().map((a) => a.animationName || '').filter((n) => /^(citation-|verbe-|chiffres-)/.test(n))))
        const attendu = FINALES.join(' / ')
        const lus = [r.charge.map((v) => v.aff).join(' / '), ...r.valeurs, r.fin.map((v) => v.aff).join(' / ')]
        const faux = lus.filter((x) => x !== attendu)
        if (faux.length) f.push(`valeurs affichées ${[...new Set(faux)].slice(0, 2).join(' puis ')} au lieu de ${attendu}`)
        const changements = lus.slice(1).filter((x, i) => x !== lus[i]).length
        if (changements) f.push(`${changements} changement(s) de texte des valeurs en 3 s`)
        if (r.fin.some((v) => v.op < 0.98)) f.push(`bloc .chiffres à ${Math.min(...r.fin.map((v) => v.op))} d’opacité`)
        if (r.animations.length) f.push(`${r.animations.length} animation(s) de la famille (${[...new Set(r.animations)].join(', ')})`)
      } finally { await fermer(o) }
      M[`rc10-${nom}`] = { ...r, valeurs: [...new Set(r.valeurs || [])] }
      faits.push(`RC-10 ${nom} : mots ${r.mots ? `${r.mots.n} à ${Math.min(...r.mots.centre.eff)}` : 'absents'}, verbes ${r.verbes ? `${r.verbes.n} à ${Math.min(...r.verbes.centre.eff)}` : 'absents'}, valeurs ${r.fin ? r.fin.map((v) => v.aff).join(' / ') : '—'}, ${r.animations?.length ?? 0} animation(s) de la famille`)
      if (f.length) echecs.push(`RC-10 ${nom} : ${resume(f)}`)
    }

    // ── RC-13 : requêtes au téléphone jusqu'à load, famille contre référence ──────────────────────────────────────────
    const requetes = async (serveur, cle) => {
      const journal = { req: [], load: null }
      const o = await ouvrir(serveur, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, {
        cle,
        avantGoto: async (page, ctx) => {
          const cdp = await ctx.newCDPSession(page)
          cdp.on('Network.requestWillBeSent', (e) => { if (!/^data:/.test(e.request.url)) journal.req.push({ url: e.request.url, ts: e.timestamp }) })
          cdp.on('Page.loadEventFired', (e) => { if (journal.load == null) journal.load = e.timestamp })
          await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }); await cdp.send('Page.enable')
        },
      })
      try { await o.page.waitForTimeout(1000) } finally { await fermer(o) }
      return journal.req.filter((q) => journal.load == null || q.ts <= journal.load).map((q) => new URL(q.url).pathname).sort()
    }
    {
      const comparer = (a, b) => {
        const reste = [...b], plus = []
        for (const x of a) { const i = reste.indexOf(x); if (i >= 0) reste.splice(i, 1); else plus.push(x) }
        return { plus, moins: reste }
      }
      const toleres = taille(path.join(SITE, 'bureau.css')) > 0 ? ['/bureau.css'] : []
      let rs = await requetes(S, 'site'), rr = await requetes(SR, 'ref'), d = comparer(rs, rr)
      const ecart = (d) => d.moins.length || d.plus.filter((x) => !toleres.includes(x)).length || d.plus.filter((x) => toleres.includes(x)).length > 1
      if (ecart(d)) { await new Promise((ok) => setTimeout(ok, 2000)); rs = await requetes(S, 'site'); rr = await requetes(SR, 'ref'); d = comparer(rs, rr) }
      M.requetesTelephone = { famille: rs, reference: rr, ...d }
      faits.push(`RC-13 : téléphone jusqu’à load, ${rs.length} requêtes contre ${rr.length} pour la référence${d.plus.length ? ` (en plus : ${d.plus.join(', ')})` : ''}`)
      if (ecart(d)) echecs.push(`RC-13 : requêtes au téléphone différentes de la référence (en plus : ${resume(d.plus) || 'aucune'} ; en moins : ${resume(d.moins) || 'aucune'})`)
    }

    // ── Films du juge (§6.10) ──────────────────────────────────────────────────────────────────────────────────────
    const GLISSER = String(({ cible, v }) => new Promise((ok) => {
      const d = scrollY, t = performance.now(), sens = Math.sign(cible - d) || 1
      const pas = () => { const y = d + sens * Math.min(Math.abs(cible - d), ((performance.now() - t) / 1000) * v); scrollTo({ top: y, behavior: 'instant' }); if (Math.abs(y - cible) < 1) ok(true); else requestAnimationFrame(pas) }
      requestAnimationFrame(pas)
    }))
    const film = async (nom, scenario) => {
      fs.mkdirSync(FILMS, { recursive: true })
      const o = await ouvrir(S, { viewport: { width: 1440, height: 900 }, recordVideo: { dir: FILMS, size: { width: 1440, height: 900 } } })
      const video = o.page.video()
      let bornes = null
      try { await o.page.waitForTimeout(1500); bornes = await scenario(o.page) } finally { await fermer(o) }
      const webm = video ? await video.path().catch(() => null) : null
      if (!bornes || !webm || taille(webm) <= 0) { echecs.push(`§6.10 : ${nom} non filmé`); return }
      const tmp = path.join(FILMS, nom), ss = Math.max(0, (bornes.debut - o.tPage) / 1000 - 0.4), duree = (bornes.fin - bornes.debut) / 1000 + 1.0
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', ss.toFixed(2), '-i', webm, '-t', duree.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', tmp], { encoding: 'utf8', timeout: 300_000 })
      const d = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp], { encoding: 'utf8' }).stdout?.trim())
      if (taille(tmp) <= 0 || !(d >= 2)) { echecs.push(`§6.10 : ${nom} vide ou trop court après ffmpeg (${Math.max(0, taille(tmp))} octets)`); return }
      fs.copyFileSync(tmp, path.join(PREUVE, nom))
      faits.push(`§6.10 : ${nom} ${taille(path.join(PREUVE, nom))} octets, ${d.toFixed(1)} s`)
    }
    await film('chiffres-film.mp4', async (page) => {
      const b = await ev(page, String(async (yCahier) => {
        const p = document.querySelector('.plateau__citation p'), ch = document.querySelector('.chiffres')
        if (!p || !ch) return null
        const yVu = haut(ch) - 0.94 * innerHeight + 0.12 * ch.offsetHeight, yPlein = yCover(p, 0.66)
        await aller(yCahier > yVu && yCahier < yPlein ? yCahier : (yVu + yPlein) / 2)
        return { cible: Math.round(Math.max(yCover(p, 0.72), haut(ch) + ch.offsetHeight - innerHeight + 30)) }
      }), Y_BANDE[1440])
      if (!b) return null
      const debut = Date.now()
      await page.waitForTimeout(1200)
      await ev(page, GLISSER, { cible: b.cible, v: 220 })
      await page.waitForTimeout(2600)
      return { debut, fin: Date.now() }
    })
    await film('verbes-film.mp4', async (page) => {
      const b = await ev(page, String(async () => { const ph = document.querySelector('.atelier__phrase'); if (!ph) return null; await aller(yCover(ph, 0) - 200); return { cible: Math.round(yCover(ph, 0.72)) } }))
      if (!b) return null
      const debut = Date.now()
      await page.waitForTimeout(500)
      await ev(page, GLISSER, { cible: b.cible, v: 200 })
      await page.waitForTimeout(900)
      return { debut, fin: Date.now() }
    })

    // ── RC-12 : tâches longues en défilement continu, de .ouverture à la fin de #atelier ───────────────────────────────
    const OBS_LONGUES = () => { window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ d: Math.round(e.duration), t: Math.round(e.startTime) }) }).observe({ type: 'longtask', buffered: true }) } catch { /* sans longtask */ } }
    const longues = async (serveur, cle) => {
      const o = await ouvrir(serveur, { viewport: { width: 1440, height: 900 } }, { cle, init: OBS_LONGUES })
      try {
        await o.page.waitForTimeout(2000)
        const prep = await ev(o.page, String(async () => { const a = document.querySelector('#atelier'); await aller(0); await new Promise((ok) => setTimeout(ok, 500)); return { fin: a ? Math.round(haut(a) + a.offsetHeight - innerHeight) : null, t: performance.now() } }))
        if (prep.fin == null) return { erreur: '#atelier introuvable' }
        await o.page.mouse.move(720, 450)
        // 5 px à chaque image, dans la page
        const d = await ev(o.page, String((fin) => new Promise((ok) => {
          let changements = 0, dernier = scrollY
          const t = performance.now()
          const pas = () => {
            scrollTo({ top: Math.min(fin, scrollY + 5), behavior: 'instant' })
            if (scrollY !== dernier) { changements++; dernier = scrollY }
            if (scrollY >= fin || performance.now() - t > 240_000) ok({ y: scrollY, changements, duree: Math.round((performance.now() - t) / 1000) })
            else requestAnimationFrame(pas)
          }
          requestAnimationFrame(pas)
        })), prep.fin)
        await ev(o.page, String(async () => { await deux() }))
        const lt = await o.page.evaluate((t) => (window.__lt || []).filter((e) => e.t >= t), prep.t)
        return { fin: prep.fin, y: d.y, changements: d.changements, duree: d.duree, longues: lt }
      } finally { await fermer(o) }
    }
    {
      const valide = (x) => x && !x.erreur && x.y >= x.fin && x.changements >= 100
      const passages = []
      for (let k = 0; k < 4; k++) {
        const x = await longues(S, 'site')
        passages.push(x)
        if (!valide(x) || !x.longues.length) break
        await new Promise((ok) => setTimeout(ok, 3000))
      }
      const bon = passages.find((x) => valide(x) && !x.longues.length)
      const dernier = passages[passages.length - 1]
      M.rc12 = { passages }
      if (!valide(dernier)) echecs.push(`RC-12 : défilement incomplet (${dernier?.erreur || `${dernier?.changements} changements de scrollY, arrêt à ${dernier?.y} sur ${dernier?.fin}`})`)
      else if (bon) faits.push(`RC-12 : 0 tâche longue sur ${bon.changements} images de défilement (${bon.duree} s, passage ${passages.indexOf(bon) + 1})`)
      else {
        const refs = []
        for (let k = 0; k < 2; k++) { const x = await longues(SR, 'ref'); refs.push(x); if (!valide(x) || !x.longues.length) break }
        M.rc12.reference = refs
        const comptes = passages.map((x) => x.longues.length).join(', ')
        const pire = passages.flatMap((x) => x.longues.map((e) => e.d)).sort((a, b) => b - a).slice(0, 3).map((d) => `${d} ms`).join(', ')
        const refValides = refs.filter(valide)
        const motifRef = !refValides.length ? '' : refValides.every((x) => x.longues.length) ? ` ; la référence sans la famille en a aussi (${refValides.map((x) => x.longues.length).join(', ')}) : machine chargée, à relancer` : ' ; la référence sans la famille passe à 0'
        echecs.push(`RC-12 : des tâches longues à chacun des ${passages.length} passages (${comptes} ; les plus longues ${pire})${motifRef}`)
      }
    }
  } finally {
    await nav.close().catch(() => {})
    S.fermer(); SR.fermer()
  }

  // ── §5.3 : CSP et exceptions ─────────────────────────────────────────────────────────────────────────────────────
  faits.push(`§5.3 : ${csp.site.size} violation(s) CSP sur les pages de la famille, ${exceptions.filter((e) => e.cle === 'site').length} exception(s) de page`)
  if (csp.site.size) echecs.push(`§5.3 : violation(s) CSP (${resume([...csp.site], 2)})`)
  const deRecit = exceptions.filter((e) => e.cle === 'site' && e.ligne != null && e.ligne >= recitLigne)
  if (deRecit.length) echecs.push(`§5.3 : exception(s) levée(s) par recit.js (${resume([...new Set(deRecit.map((e) => e.message))], 2)})`)
  M.exceptions = exceptions

  // ── RC-13 : Lighthouse mobile, seulement sur une famille qui tient tout le reste ─────────────────────────────────────
  if (!echecs.length) {
    const resumeLh = path.join(PREUVE, 'lighthouse.json')
    const lh = spawnSync(process.execPath, [path.join(R, 'scripts', 'lighthouse-mediane.mjs'), SITE, `--resume=${resumeLh}`], { cwd: R, encoding: 'utf8', timeout: 25 * 60_000, maxBuffer: 1 << 26 })
    const ligne = `${lh.stdout || ''}${lh.stderr || ''}`.trim().split('\n').pop() || ''
    faits.push(`RC-13 : ${ligne.replace(/ — .*$/, '').slice(0, 200)}`)
    if (lh.status !== 0) echecs.push(`RC-13 : Lighthouse mobile ${lh.status === 1 ? 'sous la barre' : 'impossible'} (${ligne.slice(0, 200)})`)
  } else faits.push('RC-13 : Lighthouse non lancé, d’autres critères échouent (il ne tourne que sur une famille qui tient tout le reste)')
} catch (e) {
  if (e.message !== 'arrêt') echecs.push(`juge interrompu : ${String(e.message).split('\n')[0].slice(0, 240)}`)
}
fin()
