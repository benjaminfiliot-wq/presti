// scripts/eclate-qa.mjs — le juge de la tâche 021-05 : la grande scène des étapes de la démo Atelier Lestraque, famille « eclate »
// (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.4 C, §3.2, §5.1, §5.2, §5.3, §6.0, §6.4 EC-1 à EC-16,
// §6.10 et fiche « 021-05 » du §7.2). Le site est généré dans des copies sous .orchestre/travail/eclate-qa-<pid>/ (supprimées à la
// sortie), jamais en place : « site » = --familles=<base>,eclate ; « référence » = --familles=<base>. Il est servi en local en
// brotli 11 avec les en-têtes de production (next.config.mjs, route des démos), puis mesuré dans le Chromium de Playwright, sans
// carte graphique et avec (--use-gl=angle --enable-webgl --ignore-gpu-blocklist). Le juge capture, filme et mesure lui-même ; il ne
// lit de l'exécutant que les trois fichiers de la famille. 021-05 ne déclare aucune mesure : tout est mesuré ici.
// « Cx » = position p de la plage contain de #etapes, y = haut(#etapes) + p × (hauteur(#etapes) − innerHeight), scrollTo instantané
// puis 2 rAF (§6.0) ; centres des paliers C1 = 14,56 ; C2 = 43,75 ; C3 = 66,25 ; C4 = 90,44 % (§0.3 point 5). « Opacité effective »
// = produit des opacités calculées de l'élément et de ses parents, 0 si l'un d'eux est display:none ou visibility:hidden (§6.0).
//
//   préalable  public/sites-demo/lestraque/eclate/ existe (recopie de 021-22, §3.4 B) ; eclate.json lisible : 4 pièces (limon,
//         marche, contremarche, vis) avec boîte et vecteur, 5 étiquettes avec texte, pièce et point dans [0 ; 1], une cote ; les
//         fichiers qu'il nomme, assemble.avif et eclate.avif, présents et > 0 octet. Sinon le juge s'arrête là.
//   F     _kit/familles/eclate.mjs, eclate.bureau.css et eclate.css présents et non vides ; aucun eclate.js (§3.4 C « Fichiers » :
//         « Aucune ligne de JavaScript »). Sinon le juge s'arrête là.
//   EC-1  génération avec eclate acceptée (code 0) ; figure.etapes__photo.eclate[role=img] avec l'aria-label « Anatomie d'un
//         escalier : limon à la française, marches en chêne de 40 mm, contremarches et vis » ; aucune tournage-copeaux dans
//         #etapes ; tournage-copeaux toujours dans #prestations, autant de fois que dans la référence (§3.4 C ; generer.mjs, photos
//         orphelines). Choix du juge, tableau du §3.4 C : dans la figure, une div.eclate__rendu, une img.eclate__assemble
//         (eclate/assemble.avif), une img.eclate__calque par pièce d'eclate.json (loading="lazy", decoding="async"), une
//         img.eclate__eclate (eclate/eclate.avif), une .eclate__cote qui porte le texte de la cote, 5 .eclate__etiquette
//         aria-hidden aux textes d'eclate.json, chacune avec un .eclate__point et un .eclate__filet, 5 .eclate__pastille « 1 » à
//         « 5 » ; dans #etapes, un span.eclate__compteur aria-hidden (.compteur__fenetre > .compteur__piste de 4 spans « 01 » à
//         « 04 », .compteur__total « / 04 », comme le travelling, generer.mjs:561) et un ol.eclate__legende de 5 li aux textes
//         d'eclate.json, dans l'ordre ; toute img de la figure a un attribut alt ; toute référence à eclate/ des pages générées
//         existe dans la copie. Garde (§3.4 C « Fichiers ») : dans une copie des sources dont le calque des vis est vidé (0 octet),
//         la génération est refusée avec un message qui nomme ce fichier, et rien n'est écrit.
//   EC-2  bureau 1440×900 et 1088×800, sans et avec carte, aux centres C1 à C4 (§3.4 C ; ±2 px de ref-survol-objet.md §5) :
//         C1 et C4 : assemble.avif ≥ 0,98, calques ≤ 0,02 ; C2 : de même, et .eclate__cote ≥ 0,98 ; C3 : calques ≥ 0,98, bord
//         haut gauche de chaque calque = sa boîte d'eclate.json + vecteur × taille de div.eclate__rendu, ± 2 px, et sa taille = sa
//         boîte ± 2 px ; les 5 étiquettes ≥ 0,98 ; C4 : étiquettes ≤ 0,02 ; compteur « 01 », « 02 », « 03 », « 04 ».
//         Choix du juge : « assemblée » (C1, C2, C4) veut aussi des calques au repos (± 2 px), l'éclatement part de là ; à C3,
//         assemble.avif ≤ 0,02 (le tableau la fait passer de 1 à 0) ; img.eclate__eclate (repli) ≤ 0,02 aux quatre centres ; le
//         chiffre du compteur est le span de .compteur__piste dont le milieu vertical est dans .compteur__fenetre, avec
//         .compteur__total « / 04 » et le compteur ≥ 0,98. Choix du juge, ligne « Sans JavaScript » du §3.4 C (« rien ne dépend
//         de JavaScript ») : JavaScript coupé, 1440×900, la page à C3 tient les mêmes seuils.
//         Récit de 021-16 (span.eclate__fiche dans la figure) : à C1, ce qu'attend ER-2 (cahier l. 913 ; §3.4 D l. 528, la fiche
//         « à la place du rendu ») : les trois lignes de la fiche ≥ 0,98, assemble.avif et calques ≤ 0,02 ; à C2, les cotes
//         « 40 mm » et « 17 mm » ≥ 0,98 (ER-3, l. 914 ; §3.4 D l. 535 : « les cotes du relevé entrent, remplaçant la cote seule de
//         021-05 ») au lieu de .eclate__cote ; lignes et cotes cherchées par leur texte, comme etapes-recit-qa ; C3 et C4 inchangés.
//         Sans JavaScript, à C3, en plus des styles : la boîte du rendu capturée, comparée à celle de la capture avec JavaScript
//         (1440×900 sans carte, C3) : écart moyen du gris ≤ 12 niveaux et écart-type du gris ≥ 0,6 × celui avec JavaScript (choix du
//         juge ; trou prouvé par .orchestre/travail/021-05-verif-raf-sans-js : html.no-js .eclate__rendu{clip-path:inset(50%)} passait).
//   EC-3  aux mêmes instants, les .etape__num d'opacité effective ≥ 0,98 : exactement une, de rang = rang de l'état de la scène
//         (règle « Deux chiffres, un écran ») ; et le chiffre du compteur est le même.
//   EC-4  immobilité dans les tenues (les trous du §3.4 C) : à Ck − 2,5 %, Ck et Ck + 2,5 % (k = 1 à 4), mêmes contextes qu'EC-2 :
//         décalage (x, y) et opacité de chaque calque, opacité d'assemble.avif, opacité et point de chaque étiquette, opacité de la
//         cote : écart max − min ≤ 0,5 px et ≤ 0,01 ; chiffre du compteur identique. Choix du juge : trois relevés au lieu de
//         deux (le centre en plus), pour que « identiques » vaille sur toute la tenue.
//   EC-5  contraste des étiquettes (à C3), de la cote (à C2) et du compteur (chiffre visible et total, aux quatre centres), 1440×900
//         et 1088×800 sans carte : ≥ 4,5 (WCAG 1.4.3 ; §3.4 C « Contraste »). Méthode du §0.1 : texte rendu transparent, pour chaque
//         pixel des boîtes des mots (Range.getClientRects), couleur effective α × encre + (1 − α) × fond, α = alpha de la couleur ×
//         opacité effective, rapport WCAG avec le fond, p10 des rapports. Pour un texte opaque, ce p10 est le rapport au p90 de la
//         luminance du fond (« p90 » du cahier). Choix du juge : mélange en sRVB comme le compositeur, luminance sur les valeurs
//         linéarisées (comme recit-qa.mjs, RC-4) ; images décodées attendues avant la capture.
//   EC-6  téléphone 390×844 (dpr 3, tactile), mouvement réduit 1440×900, hauteur 1440×640, après défilement complet par demi-écrans :
//         requêtes de /eclate/ = eclate.avif seule ; figure.eclate au rapport 4:3 ± 1 % ; 5 .eclate__pastille ≥ 24 × 24 px,
//         chiffres ≥ 14 px, sans chevauchement deux à deux ; ol.eclate__legende de 5 li ≥ 14 px ; aucun débordement horizontal
//         (scrollWidth ≤ innerWidth) (§3.4 C ; 390 × 260 px mesuré avant). Choix du juge, même tableau : pastille k (ordre
//         d'eclate.json) centrée sur l'ancre de l'étiquette k ± 2 px et ≥ 0,98 ; textes de la légende = ceux d'eclate.json, dans
//         l'ordre, haut de la légende ≥ bas de la figure − 1 px, légende ≥ 0,98 ; eclate.avif ≥ 0,98, assemble.avif et calques
//         ≤ 0,02, étiquettes du bureau ≤ 0,02 ; « rien ne bouge » = aucune animation dont la cible est dans la figure.
//         Au téléphone, sous chaque pastille : pastilles et leurs traits masqués (visibility:hidden, feuille ajoutée dans ce seul
//         contexte de mesure), le pixel capturé au centre de la pastille s'écarte du fond de la scène de plus de 30 en distance RVB
//         (fond = background-color calculée de #etapes si elle est opaque, sinon rgb(21, 17, 14) relevé) ; choix du juge, trou prouvé
//         par .orchestre/travail/021-05-verif-ancres (EC-6 ne lisait aucun pixel sous les pastilles).
//   EC-7  bureau 1440×900, sans carte : requêtes de /eclate/ depuis la navigation jusqu'à 3 s après load, sans défiler = 0.
//   EC-8  défilement continu à travers #etapes (d'un écran avant son haut jusqu'à son bas), 1440×900 avec carte,
//         page.mouse.wheel(0, 5) à chaque rAF, témoin ≥ 100 changements de scrollY : 0 tâche longue (PerformanceObserver longtask,
//         50 ms) ; p95 des intervalles rAF ≤ 20 ms (cahier 020 P-4). Choix du juge : deux essais à 2 s d'écart, l'échec seulement
//         si les deux échouent ; alors la référence est mesurée de même et citée dans l'échec (machine chargée ou page).
//   EC-9  @keyframes d'eclate.css et d'eclate.bureau.css : seulement translate, opacity, scale (§3.2 ; §3.4 C « Propriétés »).
//         Choix du juge : animation-timing-function toléré dans une image-clé ; dans la page (1440×900, C1 et C3), les animations
//         déclarées dans ces fichiers n'animent que ces propriétés, aucune img de la figure ne joue glisse-cadre et le scale
//         calculé d'assemble.avif vaut none ou 1 (ligne « Neutraliser le cadre photo » du §3.4 C).
//         clip-path (ligne EC-9 du cahier, l. 899 : « et clip-path pour 021-16 » ; §3.4 D l. 534, le volet du relevé) : accepté
//         seulement si la fiche du récit (span.eclate__fiche) est dans la figure générée et dans la page, si les règles qui jouent
//         l'@keyframes ne visent que img.eclate__assemble et .eclate__releve (dans la page aussi, aux mêmes instants, sans
//         pseudo-élément) et si toutes ses valeurs de clip-path sont des inset(…) ; sinon échec, comme toute autre propriété.
//   EC-10 poids de lestraque/eclate/ dans la copie générée (tous ses fichiers) ≤ 75 000 octets ; brotli 11 : styles.css ≤ +1 000
//         octets contre la référence, bureau.css ≤ 6 000 octets ; Lighthouse téléphone, node scripts/lighthouse-mediane.mjs <copie>
//         (5 passes, barre du §5.1 : médiane ≥ 95, LCP < 2 500 ms), code 0 (§5.1, §5.2). Choix du juge (§3.4 C « Aucune ligne de
//         JavaScript ») : site.js identique octet pour octet à la référence ; bureau.css écrit (sinon 021-20 n'est pas versée).
//   EC-11 longueur du geste, 1440×900 et 1088×800 sans carte : défilement entre la première position où un calque quitte son repos
//         (> 0,5 px) et celle où le dernier atteint son vecteur (≤ 0,5 px) ; idem au remontage (du premier qui quitte son vecteur au
//         dernier revenu) : ≥ 450 px (contre-expertise ; 520 et 462 px au calcul du §3.4 C). Choix du juge : balayage de la plage
//         contain tous les 8 px, puis au pixel près autour de chaque bord ; un calque de vecteur nul est ignoré ; la piste #etapes
//         mesure 4,5 × innerHeight ± 1 px (450svh, §3.4 C « Grande scène »). Départs par pièce consignés, pas jugés.
//   EC-12 aire de div.eclate__rendu / aire de l'écran, à C3 : ≥ 30 % en 1440×900, ≥ 23 % en 1088×800, consignée en 1280×800
//         (§3.4 C ; 11,72 % et 13,76 % avant).
//   EC-13 à C3, 1440×900 et 1088×800 sans carte (choix du cahier ; heart-health-dashboard, veyra-electric) : police de chaque
//         étiquette ≥ 14 px ; boîtes de texte des étiquettes sans chevauchement deux à deux ; le point de chaque étiquette sur un
//         pixel opaque (alpha > 128) de sa pièce, dans l'état éclaté. Choix du juge : boîte de texte = union des Range.getClientRects
//         de l'étiquette ; chevauchement = plus de 0,5 px sur les deux axes ; le point est le centre de .eclate__point, posé sur
//         l'ancre d'eclate.json ± 2 px (repère de la vue éclatée : au téléphone, les pastilles sont « posées sur leurs ancres » sur
//         eclate.avif) ; « sur un pixel opaque » = un pixel d'alpha > 128 à 2 px d'écran au plus du point, dans le fichier du calque
//         rapporté à sa boîte affichée ; si l'ancre d'eclate.json elle-même tombe hors de la pièce éclatée, l'échec le dit (donnée
//         de 021-22) ; chaque étiquette a un .eclate__filet d'au moins 4 px ; à C2, texte de la cote ≥ 14 px (§3.4 C
//         « Contraste ») ; au bureau chorégraphié, pastilles et légende ≤ 0,02 (elles sont le profil du téléphone).
//   EC-14 à C2 : largeur de chaque .etape__corps p ≥ 420 px en 1440×900 et ≥ 310 px en 1088×800 ; lignes = arrondi(hauteur /
//         line-height) ≤ 4 (mesuré avant : 503 et 352 px, 2 et 3 lignes, méthode d'etapes-mise-en-page.mjs).
//   EC-15 aux centres C1 à C4 : boîte du h2 de #etapes sans intersection (> 0,5 px sur les deux axes) avec div.eclate__rendu ; boîte
//         du rendu dans l'écran (0 ≤ gauche, 0 ≤ haut, droite ≤ innerWidth, bas ≤ innerHeight, ± 0,5 px) ; à C1 et C3, couleur du
//         fond de la figure à ≤ 3 niveaux sur chaque canal du pixel (0, 0) d'assemble.avif (§3.4 C). Choix du juge : fond = médiane
//         7 × 7 px de la capture à 4 px hors de chaque bord du rendu et à 4 px dans chaque coin, points cachés par un texte, la
//         barre, la liste, ou hors écran écartés ; 2 points au moins.
//   EC-16 nav-retenue-qa et signature-repos-qa PASS avec eclate active (§5.4 ; la page est plus longue de 150svh). Choix du juge :
//         ces deux juges n'ont pas d'option --dossier (§0.2) et régénèrent depuis leur propre racine ; une copie inchangée des deux
//         tourne dans un arbre de travail (.orchestre/travail/eclate-qa-<pid>/arbre : generer.mjs, _kit, _polices, lestraque) dont le
//         da.json active <base>,eclate ; signature-repos-qa lance lui-même nav-retenue-qa (son point 7) : un lancement couvre les
//         deux. Les neuf démos gelées, que nav-retenue-qa ne voit plus dans l'arbre, sont vérifiées ici (git status vide).
//   CSP   §6.0 et §5.3 : 0 violation (événement securitypolicyviolation ou message de console) dans toutes les pages à JavaScript.
//   PR    §6.0 et §6.10 : dans .orchestre/preuves/021-05/juge/, écrits pendant ce lancement, aucun de 0 octet et aucune image unie
//         (écart-type du gris ≥ 8) : eclate-c1..c4-1440x900.jpg et -1088x800.jpg (sans carte), eclate-tel.jpg (390×844),
//         eclate-film.mp4 (12 s ± 0,1 à 30 images/s, 1440×900 sans carte, plage contain traversée image par image), mesures.json,
//         lighthouse.json.
//
// Choix du juge (le cahier ne tranche pas) :
//   - « Familles déjà fusionnées » (base) = lestraque.familles de da.json au moment du jugement, sans eclate ni telephone (021-17
//     remplace le profil téléphone de l'éclaté, §3.6 point 4) ; --base=a,b la remplace.
//   - Les deux générations sont faites coup sur coup ; si le kit (generer.mjs, _kit/**) change entre elles (autres tâches), elles sont
//     refaites une fois après 2 s : aucune comparaison ne dépend d'une tâche parallèle.
//   - Un état transitoire en défaut (un centre, une tenue, un contexte d'EC-6, EC-7) est remesuré une fois après 2 s.
//   - Noms de classes non écrits au §3.4 C mais imposés par la fiche pour être mesurés : .eclate__etiquette, .eclate__point,
//     .eclate__filet, .eclate__pastille, .eclate__cote ; la légende est une sœur de la figure (la figure elle-même est en 4:3).
//
// Contrôles à l'œil, non jugés ici (§6.10, Claude Code puis Benj) : eclate-c1..c4 (grande scène ; assemblée ; cote ; éclatée et
// nommée, bois chaud ; remontée), eclate-film.mp4 (l'escalier s'ouvre pièce par pièce sur un long défilement, se tient, se remonte ;
// la liste reste lisible à droite), eclate-tel.jpg (éclaté 4:3, pastilles et légende lisibles, rien ne déborde). « Choix du cahier, à
// juger sur film » : 450svh, tenues de ±3 %, 9 % par groupe, départs décalés de 2,5 %, l'ordre vis → marches → contremarches →
// limon puis l'inverse (consigné dans mesures.json, pas jugé).
//
// Usage : node scripts/eclate-qa.mjs [--base=a,b]
//   essais du juge seulement : --demos=<copie de public/sites-demo> ; --sauter=lighthouse,ec16 (chaque critère sauté échoue).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const option = (nom) => { const a = process.argv.find((x) => x.startsWith(`--${nom}=`)); return a === undefined ? null : a.slice(nom.length + 3) }
const DEMOS = option('demos') ? path.resolve(option('demos')) : path.join(R, 'public', 'sites-demo')
const SAUTER = new Set((option('sauter') || '').split(',').map((x) => x.trim()).filter(Boolean))
const KIT = path.join(DEMOS, '_kit'), FAM = path.join(KIT, 'familles'), ECL = path.join(DEMOS, 'lestraque', 'eclate')
const T = path.join(R, '.orchestre', 'travail', `eclate-qa-${process.pid}`)
const PREUVE = path.join(R, '.orchestre', 'preuves', '021-05', 'juge')
const NOM = 'grande scène des étapes'
const ARIA = 'Anatomie d\'un escalier : limon à la française, marches en chêne de 40 mm, contremarches et vis'
const CENTRES = [14.56, 43.75, 66.25, 90.44]
const CARTE = ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist']
const GELEES = ['plombier', 'electricien', 'chauffagiste', 'macon', 'menuisier', 'peintre', 'carreleur', 'couvreur', 'serrurier']
const PIECES = ['contremarche', 'limon', 'marche', 'vis']
const DEBUT = Date.now()
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* déjà parti */ } })

const echecs = [], faits = [], mesures = { date: new Date().toISOString() }
const pb = {}
const noter = (id, texte) => { (pb[id] ||= []).push(texte) }
let ecrirePreuves = false
const fin = () => {
  for (const [id, l] of Object.entries(pb)) if (l.length) echecs.push(`${id} : ${l.slice(0, 4).join(' ; ')}${l.length > 4 ? ` (et ${l.length - 4} autre(s))` : ''}`)
  if (ecrirePreuves) { try { fs.mkdirSync(PREUVE, { recursive: true }); fs.writeFileSync(path.join(PREUVE, 'mesures.json'), JSON.stringify({ ...mesures, dureeS: Math.round((Date.now() - DEBUT) / 1000), echecs, faits }, null, 1)) } catch { /* consigné par PR */ } }
  if (faits.length) console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ ${NOM} : FAIL — ${echecs.join(' ; ')}` : `✓ ${NOM} : PASS — l'escalier s'éclate pièce par pièce sur au moins 450 px, se nomme et se remonte avec la liste, compteur juste, grande scène lisible, éclaté 4:3 fixe au téléphone, poids et Lighthouse tenus, barre et geste au repos intacts`)
  process.exitCode = echecs.length ? 1 : 0
}

// ── outils ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const taille = (f) => { try { const s = fs.statSync(f); return s.isFile() ? s.size : -1 } catch { return -1 } }
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }
const premiere = (e) => String(e && e.message ? e.message : e).split('\n')[0].slice(0, 220)
const derniere = (s) => String(s || '').trim().split('\n').pop() || ''
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const fmt = (w, h) => `${w}×${h}`
const f1 = (x) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(1) : '—')
const f2 = (x) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(2) : '—')
const norm = (s) => String(s || '').replace(/’/g, '\'').replace(/\s+/g, ' ').trim()
const sha = (f) => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') } catch { return null } }
const brotli = (f) => (taille(f) >= 0 ? zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length : 0)
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const chevauche = (a, b, tol = 0.5) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > tol && Math.min(a.b, b.b) - Math.max(a.t, b.t) > tol
const union = (rs) => (rs && rs.length ? { l: Math.min(...rs.map((q) => q.l)), t: Math.min(...rs.map((q) => q.t)), r: Math.max(...rs.map((q) => q.r)), b: Math.max(...rs.map((q) => q.b)) } : null)
const deuxImages = (page) => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))))
const pct = (x) => `${f2(x)} %`

function generer(familles, sortie, generateur = path.join(DEMOS, 'generer.mjs'), cwd = R) {
  const r = spawnSync(process.execPath, [generateur, 'lestraque', `--sortie=${sortie}`, `--familles=${familles.join(',')}`], { cwd, encoding: 'utf8', timeout: 240000, maxBuffer: 1 << 26 })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`.trim() }
}
function empreinteKit() {
  const h = crypto.createHash('sha1')
  const marcher = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const f = path.join(d, e.name); if (e.isDirectory()) marcher(f); else { h.update(f); h.update(fs.readFileSync(f)) } } }
  try { h.update(fs.readFileSync(path.join(DEMOS, 'generer.mjs'))); marcher(KIT) } catch { h.update(String(Date.now())) }
  return h.digest('hex')
}
async function entetesProduction() {
  const conf = (await import(pathToFileURL(path.join(R, 'next.config.mjs')).href)).default
  const strict = (await conf.headers()).find((r) => r.source.startsWith('/((?!site'))
  const entetes = strict.headers.filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => (h.key === 'Content-Security-Policy' ? { key: h.key, value: h.value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ') } : h))
  if (!entetes.some((h) => h.key === 'Content-Security-Policy')) throw new Error('CSP absente de la route stricte de next.config.mjs')
  return entetes
}
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', mp4: 'video/mp4' }
const TEXTES = new Set(['html', 'css', 'js', 'json', 'svg', 'xml', 'txt'])
async function servir(dossier, entetes) {
  const cache = new Map()
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
    const f = path.join(dossier, p)
    if (!f.startsWith(dossier) || taille(f) < 0) { r.writeHead(404); return r.end() }
    const ext = path.extname(f).slice(1), h = { 'content-type': TYPES[ext] || 'application/octet-stream' }
    for (const { key, value } of entetes) h[key] = value
    if (TEXTES.has(ext) && /\bbr\b/.test(q.headers['accept-encoding'] || '')) {
      if (!cache.has(f)) cache.set(f, zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }))
      h['content-encoding'] = 'br'; h.vary = 'Accept-Encoding'
      r.writeHead(200, h); return r.end(cache.get(f))
    }
    r.writeHead(200, h); fs.createReadStream(f).pipe(r)
  })
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
  return { base: `http://127.0.0.1:${srv.address().port}`, fermer: () => new Promise((ok) => { try { srv.closeAllConnections() } catch { /* ancien Node */ } srv.close(() => ok()) }) }
}

// ── dans la page ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function instrumentation() {
  window.__csp = []
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`), true)
  window.__taches = []
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__taches.push([e.startTime, e.duration]) }).observe({ type: 'longtask', buffered: true }) } catch { /* pas d'observateur */ }
}
// Relevé complet de la scène, après défilement à y (ou sur place si y est null).
async function scene(arg) {
  const y = arg && typeof arg.y === 'number' ? arg.y : null
  if (y !== null) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))) }
  const opEff = (el) => { if (!el) return 0; let op = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return 0; op *= Number(c.opacity) } return op }
  const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
  const norme = (s) => String(s || '').replace(/’/g, '\'').replace(/\s+/g, ' ').trim()
  const noeuds = (el) => { const out = []; if (!el) return out; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.data.trim() && n.parentElement) out.push(n); return out }
  const rects = (el) => noeuds(el).flatMap((n) => {
    const rg = document.createRange(); rg.selectNodeContents(n)
    const l = [...rg.getClientRects()].filter((x) => x.width > 0 && x.height > 0).map((x) => ({ l: x.left, t: x.top, r: x.right, b: x.bottom }))
    if (l.length) return l
    const p = n.parentElement.getBoundingClientRect()
    return p.width > 0 && p.height > 0 ? [{ l: p.left, t: p.top, r: p.right, b: p.bottom }] : []
  })
  const opTexte = (el) => noeuds(el).reduce((m, n) => Math.min(m, opEff(n.parentElement)), opEff(el))
  const encre = (el) => { const n = noeuds(el)[0]; if (!n) return null; const p = n.parentElement, cs = getComputedStyle(p); return p instanceof SVGElement ? cs.fill : cs.color }
  const police = (el) => { const n = noeuds(el); return n.length ? Math.min(...n.map((x) => parseFloat(getComputedStyle(x.parentElement).fontSize))) : null }
  const sec = document.querySelector('#etapes')
  const out = { scrollY, ih: innerHeight, iw: innerWidth, sw: document.documentElement.scrollWidth }
  if (!sec) return out
  const rs = sec.getBoundingClientRect()
  out.sec = { haut: rs.top + scrollY, hauteur: rs.height }
  const fig = sec.querySelector('figure.eclate'), rendu = fig && fig.querySelector('.eclate__rendu')
  out.fig = bx(fig); out.rendu = bx(rendu); out.h2 = bx(sec.querySelector('h2'))
  out.nums = [...sec.querySelectorAll('.etape__num')].map(opEff)
  out.paragraphes = [...sec.querySelectorAll('.etape__corps p')].map((p) => { const r = p.getBoundingClientRect(), cs = getComputedStyle(p); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return { l: r.width, lignes: Math.round(r.height / lh) } })
  if (!fig) return out
  const img = (i) => ({ src: i.getAttribute('src') || '', op: opEff(i), b: bx(i), scale: getComputedStyle(i).scale, complet: i.complete, loading: i.getAttribute('loading'), decoding: i.getAttribute('decoding') })
  out.role = fig.getAttribute('role'); out.aria = norme(fig.getAttribute('aria-label'))
  out.classesFigure = (fig.getAttribute('class') || '').split(/\s+/)
  // Récit de 021-16 (EC-2 ; ER-2 et ER-3 du cahier, l. 913-914) : la fiche est span.eclate__fiche ; ses trois lignes et les cotes du
  // relevé sont cherchées par leur texte, comme etapes-recit-qa (plus profond élément de la figure au texte exact, le plus visible)
  out.recit = !!fig.querySelector('span.eclate__fiche')
  if (out.recit) {
    const elements = [...fig.querySelectorAll('*')]
    const parTexte = (t) => { const l = elements.filter((e) => norme(e.textContent) === t), p = l.filter((e) => !l.some((x) => x !== e && e.contains(x))); return { texte: t, n: p.length, op: p.reduce((mx, e) => Math.max(mx, opTexte(e)), 0) } }
    out.ficheLignes = ['Votre projet — Escalier', 'Commune — Rennes', 'Quand — Dans les trois mois'].map(parTexte)
    out.cotesReleve = ['40 mm', '17 mm'].map(parTexte)
  }
  out.assemble = [...fig.querySelectorAll('img.eclate__assemble')].map(img)
  out.eclate = [...fig.querySelectorAll('img.eclate__eclate')].map(img)
  out.calques = [...fig.querySelectorAll('img.eclate__calque')].map(img)
  out.imagesSansAlt = [...fig.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length
  out.etiquettes = [...fig.querySelectorAll('.eclate__etiquette')].map((e) => ({ texte: norme(e.textContent), op: opTexte(e), cache: !!e.closest('[aria-hidden="true"]'), point: bx(e.querySelector('.eclate__point')), filet: bx(e.querySelector('.eclate__filet')), rects: rects(e), encre: encre(e), police: police(e) }))
  out.pastilles = [...fig.querySelectorAll('.eclate__pastille')].map((e) => ({ texte: norme(e.textContent), op: opTexte(e), b: bx(e), police: police(e) }))
  const cote = fig.querySelector('.eclate__cote')
  out.cote = cote ? { texte: norme(cote.textContent), op: opTexte(cote), rects: rects(cote), encre: encre(cote), police: police(cote) } : null
  const cpt = sec.querySelector('.eclate__compteur')
  if (cpt) {
    const fen = bx(cpt.querySelector('.compteur__fenetre')), spans = [...cpt.querySelectorAll('.compteur__piste > span')]
    const vis = fen ? spans.find((s) => { const r = s.getBoundingClientRect(), c = (r.top + r.bottom) / 2; return c >= fen.t - 0.5 && c <= fen.b + 0.5 }) : null
    const tot = cpt.querySelector('.compteur__total')
    const dansFen = (q) => (fen ? { l: Math.max(q.l, fen.l), t: Math.max(q.t, fen.t), r: Math.min(q.r, fen.r), b: Math.min(q.b, fen.b) } : q)
    out.compteur = { piste: spans.map((s) => norme(s.textContent)), visible: vis ? norme(vis.textContent) : null, total: tot ? norme(tot.textContent) : null, op: opEff(cpt), cache: !!cpt.closest('[aria-hidden="true"]'), rectsChiffre: vis ? rects(vis).map(dansFen).filter((q) => q.r > q.l && q.b > q.t) : [], encreChiffre: vis ? encre(vis) : null, opChiffre: vis ? opTexte(vis) : 0, rectsTotal: tot ? rects(tot) : [], encreTotal: tot ? encre(tot) : null, opTotal: tot ? opTexte(tot) : 0 }
  }
  const leg = sec.querySelector('ol.eclate__legende')
  out.legende = leg ? { op: opEff(leg), b: bx(leg), items: [...leg.children].filter((x) => x.tagName === 'LI').map((li) => ({ texte: norme(li.textContent), police: police(li), op: opEff(li) })) } : null
  out.animations = document.getAnimations().filter((a) => a.effect && a.effect.target && fig.contains(a.effect.target)).map((a) => ({
    nom: a.animationName || a.transitionProperty || a.constructor.name,
    cible: `${a.effect.target.tagName.toLowerCase()}.${(a.effect.target.getAttribute('class') || '').trim().split(/\s+/).join('.')}`,
    proprietes: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !['offset', 'easing', 'composite', 'computedOffset'].includes(x))))],
  }))
  return out
}
// EC-9 dans la page, clip-path (ligne EC-9 du cahier, l. 899) : toute animation d'un @keyframes de la famille qui anime clip-path, dans
// tout le document (pas seulement la figure), avec sa cible, son pseudo-élément et ses valeurs.
function animationsClip(noms) {
  return document.getAnimations().filter((a) => a.effect && a.effect.target && noms.includes(a.animationName)).flatMap((a) => {
    const valeurs = a.effect.getKeyframes().flatMap((k) => [k.clipPath, k['clip-path']]).filter((v) => typeof v === 'string')
    if (!valeurs.length) return []
    const t = a.effect.target, pseudo = a.effect.pseudoElement || ''
    return [{ nom: a.animationName, cible: `${t.tagName.toLowerCase()}.${(t.getAttribute('class') || '').trim().split(/\s+/).join('.')}${pseudo}`, permise: !pseudo && t.matches('#etapes figure.eclate img.eclate__assemble, #etapes figure.eclate .eclate__releve'), valeurs: [...new Set(valeurs)] }]
  })
}
// Positions des calques pour une liste de défilements (EC-11), en un seul aller-retour.
async function releverCalques(ys) {
  const out = []
  const rendu = document.querySelector('#etapes figure.eclate .eclate__rendu')
  if (!rendu) return out
  for (const y of ys) {
    scrollTo({ top: y, behavior: 'instant' })
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))
    const b = rendu.getBoundingClientRect()
    out.push({ y: scrollY, rendu: { l: b.left, t: b.top, w: b.width, h: b.height }, cal: [...rendu.querySelectorAll('img.eclate__calque')].map((i) => { const r = i.getBoundingClientRect(); return { f: (i.getAttribute('src') || '').split('/').pop(), l: r.left, t: r.top } }) })
  }
  return out
}

// EC-2 sans JavaScript : requestAnimationFrame ne rappelle jamais quand JavaScript est coupé, et scene({ y }) attendait deux images pour toujours.
// On défile depuis Playwright, on laisse 300 ms au rendu, puis on relève sur place (scene({ y: null }) n'attend aucune image).
async function allerSansJs(page, y) { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(300); return page.evaluate(scene, { y: null }) }

// ── le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────────────
let navA = null, navB = null, srv = null, srvRef = null
const produites = []
const journal = { csp: [], erreurs: [] }

async function juger() {
  // ── préalables et fichiers de la famille ─────────────────────────────────────────────────────────────────────────────
  const frac = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
  let J = null
  if (!fs.existsSync(ECL) || !fs.statSync(ECL).isDirectory()) noter('préalable', 'public/sites-demo/lestraque/eclate/ absent : la recopie des rendus par 021-22 n\'est pas faite (§3.4 B), il n\'y a rien à mettre en scène')
  else {
    try { J = JSON.parse(fs.readFileSync(path.join(ECL, 'eclate.json'), 'utf8')) } catch (e) { noter('préalable', `lestraque/eclate/eclate.json illisible (${premiere(e)})`) }
    if (J) {
      const noms = (Array.isArray(J.pieces) ? J.pieces : []).map((p) => p && p.nom).sort()
      if (JSON.stringify(noms) !== JSON.stringify(PIECES)) noter('préalable', `eclate.json : pièces ${noms.join(', ') || 'aucune'} (limon, marche, contremarche, vis attendues)`)
      for (const p of Array.isArray(J.pieces) ? J.pieces : []) {
        if (!p || ![p.x, p.y, p.l, p.h].every(frac) || !(p.l > 0 && p.h > 0) || !Array.isArray(p.vecteur) || p.vecteur.length !== 2 || !p.vecteur.every((v) => typeof v === 'number' && Math.abs(v) <= 1)) noter('préalable', `eclate.json : boîte ou vecteur de « ${p && p.nom} » invalide`)
        if (!p || typeof p.fichier !== 'string' || taille(path.join(ECL, p.fichier)) <= 0) noter('préalable', `lestraque/eclate/${p && p.fichier} absent ou vide`)
      }
      const et = Array.isArray(J.etiquettes) ? J.etiquettes : []
      if (et.length !== 5) noter('préalable', `eclate.json : ${et.length} étiquette(s), 5 attendues`)
      for (const e of et) if (!e || typeof e.texte !== 'string' || !e.texte.trim() || !frac(e.x) || !frac(e.y) || !(J.pieces || []).some((p) => p && p.nom === e.piece)) noter('préalable', `eclate.json : étiquette « ${e && e.texte} » sans texte, point dans [0 ; 1] ou pièce connue`)
      if (!J.cote || typeof J.cote.texte !== 'string' || ![J.cote.x1, J.cote.y1, J.cote.x2, J.cote.y2].every(frac)) noter('préalable', 'eclate.json : cote absente ou hors de [0 ; 1]')
    }
    for (const f of ['assemble.avif', 'eclate.avif']) if (taille(path.join(ECL, f)) <= 0) noter('préalable', `lestraque/eclate/${f} absent ou vide`)
  }
  for (const f of ['eclate.mjs', 'eclate.bureau.css', 'eclate.css']) if (taille(path.join(FAM, f)) <= 0) noter('F', `_kit/familles/${f} absent ou vide`)
  if (fs.existsSync(path.join(FAM, 'eclate.js'))) noter('F', '_kit/familles/eclate.js existe : la famille n\'a aucune ligne de JavaScript (§3.4 C « Fichiers »)')
  faits.push(`préalables : lestraque/eclate/ ${fs.existsSync(ECL) ? 'présent' : 'absent'} ; _kit/familles/eclate.* présents : ${['eclate.mjs', 'eclate.bureau.css', 'eclate.css', 'eclate.js'].filter((f) => fs.existsSync(path.join(FAM, f))).join(', ') || 'aucun'}`)
  if (Object.keys(pb).length) return
  J.etiquettes = J.etiquettes.map((e) => ({ ...e, texte: norm(e.texte) }))
  const pieceDe = (nom) => J.pieces.find((p) => p.nom === nom)
  // EC-13 et EC-6 : eclate.json déclare ses points en repère assemblé (champ « points ») ; l'ancre dans la vue éclatée ajoute le vecteur de la pièce
  const ancre = (e) => { const p = pieceDe(e.piece); return /assembl/i.test(String(J.points || '')) ? { x: e.x + p.vecteur[0], y: e.y + p.vecteur[1] } : { x: e.x, y: e.y } }
  mesures.eclateJson = { pieces: J.pieces, etiquettes: J.etiquettes, cote: J.cote }

  // ── générations ──────────────────────────────────────────────────────────────────────────────────────────────────────
  let base = []
  try { base = option('base') !== null ? option('base').split(',').map((x) => x.trim()).filter(Boolean) : (JSON.parse(lire(path.join(KIT, 'da.json'))).lestraque.familles || []) } catch (e) { noter('juge', `da.json illisible (${premiere(e)})`); return }
  base = base.filter((f) => f !== 'eclate' && f !== 'telephone')
  const AVEC = [...base, 'eclate']
  const SITE = path.join(T, 'site'), REF = path.join(T, 'reference')
  fs.mkdirSync(T, { recursive: true })
  let g = null, gr = null, stable = false
  for (let essai = 1; essai <= 2; essai++) {
    const k0 = empreinteKit()
    g = generer(AVEC, SITE); gr = generer(base, REF)
    stable = empreinteKit() === k0
    if (g.code === 0 && gr.code === 0 && stable) break
    if (essai === 1) await attendre(2000)
  }
  faits.push(`copies générées : site (--familles=${AVEC.join(',')}) et référence (--familles=${base.join(',')})`)
  if (g.code !== 0) { noter('EC-1', gr.code === 0 ? `la génération avec eclate est refusée alors que la référence passe : ${derniere(g.sortie).slice(0, 240)}` : `le générateur échoue même sans eclate (${derniere(gr.sortie).slice(0, 200)}) : cassé par une autre tâche, rien de jugeable`); return }
  if (gr.code !== 0) { noter('juge', `la génération de référence (--familles=${base.join(',')}) échoue : ${derniere(gr.sortie).slice(0, 200)}`); return }
  if (!stable) { noter('juge', 'le kit a changé pendant les deux générations, deux fois de suite (autres tâches) : comparaison impossible, rejouer le juge'); return }

  // ── EC-1 : le HTML généré ────────────────────────────────────────────────────────────────────────────────────────────
  const html = lire(path.join(SITE, 'index.html')), htmlRef = lire(path.join(REF, 'index.html'))
  const section = (h, id) => { const i = h.indexOf(`id="${id}"`); if (i < 0) return ''; const d = h.lastIndexOf('<section', i), e = h.indexOf('</section>', i); return h.slice(d, e < 0 ? undefined : e + 10) }
  const etapes = section(html, 'etapes')
  if (!etapes) { noter('EC-1', 'section #etapes absente de l\'accueil généré'); return }
  const figTags = etapes.match(/<figure\b[^>]*>/g) || []
  if (!figTags.some((t) => { const c = ((t.match(/\sclass="([^"]*)"/) || [])[1] || '').split(/\s+/); return c.includes('etapes__photo') && c.includes('eclate') })) { noter('EC-1', 'aucune figure.etapes__photo.eclate dans #etapes de l\'accueil généré (crochet etapesMedia)'); return }
  if (/tournage-copeaux/.test(etapes)) noter('EC-1', 'tournage-copeaux est encore dans #etapes')
  const nP = (section(html, 'prestations').match(/tournage-copeaux/g) || []).length, nR = (section(htmlRef, 'prestations').match(/tournage-copeaux/g) || []).length
  faits.push(`EC-1 : figure.eclate dans #etapes ; tournage-copeaux ${nP} fois dans #prestations (référence ${nR}), ${(etapes.match(/tournage-copeaux/g) || []).length} dans #etapes`)
  if (!nP || nP !== nR) noter('EC-1', `tournage-copeaux ${nP} fois dans #prestations, ${nR} dans la référence`)
  {
    const pages = []
    const marcher = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) { if (!['images', 'fonts', 'relief', 'eclate', 'video'].includes(e.name)) marcher(f) } else if (e.name === 'index.html') pages.push(f) } }
    marcher(SITE)
    const cassees = []
    for (const p of pages) {
      const h = lire(p), refs = [...h.matchAll(/\s(?:src|href)="([^"#?]*\beclate\/[^"#?]+)"/g)].map((m) => m[1]).concat([...h.matchAll(/\ssrcset="([^"]*\beclate\/[^"]*)"/g)].flatMap((m) => m[1].split(',').map((c) => c.trim().split(/\s+/)[0])))
      for (const r of refs) if (taille(path.join(path.dirname(p), r)) <= 0) cassees.push(`${path.relative(SITE, p).split(path.sep).join('/')} → ${r}`)
    }
    if (cassees.length) noter('EC-1', `référence(s) à eclate/ sans fichier dans la copie : ${cassees.slice(0, 3).join(', ')}`)
  }

  // ── EC-9 : les @keyframes de la famille ──────────────────────────────────────────────────────────────────────────────
  const keyframes = [], usages = []
  // règles de style d'une feuille (@media et @supports traversés, @keyframes écartés) : sélecteurs et déclarations (clip-path d'EC-9)
  const regles = (css) => {
    const out = []
    const bloc = (s) => {
      for (let i = 0; i < s.length;) {
        const o = s.indexOf('{', i)
        if (o < 0) break
        const prelude = s.slice(i, o).split(/[;}]/).pop().trim()
        let j = o + 1, prof = 1
        while (j < s.length && prof) { if (s[j] === '{') prof++; else if (s[j] === '}') prof--; j++ }
        const corps = s.slice(o + 1, j - 1)
        if (/^@(?:-[a-z]+-)?keyframes\b/i.test(prelude)) { /* images-clés : lues à part */ } else if (prelude.startsWith('@')) bloc(corps); else out.push({ selecteurs: prelude, corps })
        i = j
      }
    }
    bloc(css)
    return out
  }
  const auNiveau0 = (s, coupe) => { const out = []; let prof = 0, debut = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(' || c === '[') prof++; else if (c === ')' || c === ']') prof--; else if (!prof && coupe(c)) { out.push(s.slice(debut, i)); debut = i + 1 } } out.push(s.slice(debut)); return out.map((x) => x.trim()).filter(Boolean) }
  const dernierCompose = (sel) => { const l = auNiveau0(sel, (c) => /[\s>+~]/.test(c)); return l[l.length - 1] || '' }
  for (const f of ['eclate.css', 'eclate.bureau.css']) {
    const css = lire(path.join(FAM, f)).replace(/\/\*[\s\S]*?\*\//g, '')
    const re = /@keyframes\s+([\w-]+)\s*\{/g
    let m
    while ((m = re.exec(css))) {
      let i = re.lastIndex, prof = 1
      const debut = i
      while (i < css.length && prof) { if (css[i] === '{') prof++; else if (css[i] === '}') prof--; i++ }
      const corps = css.slice(debut, i - 1)
      const props = [...new Set([...corps.matchAll(/([a-zA-Z-]+)\s*:/g)].map((x) => x[1].toLowerCase()))]
      const clips = [...corps.matchAll(/(?<![\w-])clip-path\s*:\s*([^;}]+)/gi)].map((x) => x[1].trim())
      keyframes.push({ fichier: f, nom: m[1], props, clips })
      re.lastIndex = i
    }
    for (const r of regles(css)) for (const dec of r.corps.matchAll(/(?<![\w-])animation(?:-name)?\s*:\s*([^;]*)/gi)) usages.push({ fichier: f, selecteurs: r.selecteurs, valeur: dec[1] })
  }
  const PERMISES = new Set(['translate', 'opacity', 'scale', 'animation-timing-function'])
  for (const k of keyframes) { const hors = k.props.filter((p) => !PERMISES.has(p) && p !== 'clip-path'); if (hors.length) noter('EC-9', `@keyframes ${k.nom} (${k.fichier}) anime ${hors.join(', ')} : translate, opacity et scale seulement`) }
  // clip-path : « (et clip-path pour 021-16) » (ligne EC-9 du cahier, l. 899) ; le relevé « entre par clip-path: inset(0 100% 0 0) →
  // inset(0) » (§3.4 D l. 534). Accepté à trois conditions ensemble : fiche du récit (span.eclate__fiche) dans la figure générée ;
  // l'@keyframes n'est joué que par des règles qui visent img.eclate__assemble ou .eclate__releve (dernier composé du sélecteur) ;
  // toutes ses valeurs de clip-path sont des inset(…). Tout autre clip-path (autre élément, autre forme, famille sans récit) échoue.
  const figureEclate = (() => { const i = etapes.search(/<figure\b[^>]*\bclass="[^"]*\beclate\b[^"]*"/); return i < 0 ? '' : etapes.slice(i, etapes.indexOf('</figure>', i) + 9) })()
  const RECIT = /<span\b[^>]*\bclass="(?:[^"]*\s)?eclate__fiche(?:\s[^"]*)?"/.test(figureEclate)
  const estInset = (v) => { const s = String(v).trim(); if (!/^inset\(/i.test(s) || !s.endsWith(')')) return false; let p = 0; for (let i = 5; i < s.length; i++) { if (s[i] === '(') p++; else if (s[i] === ')') { p--; if (!p && i !== s.length - 1) return false } } return p === 0 }
  const CIBLES_CLIP = [/^(?:img)?\.eclate__assemble$/, /^(?:[a-z][\w-]*)?\.eclate__releve$/i]
  const KF_CLIP = keyframes.filter((k) => k.props.includes('clip-path'))
  for (const k of KF_CLIP) {
    const raisons = []
    if (!RECIT) raisons.push('aucune fiche du récit (span.eclate__fiche) dans la figure générée : clip-path n\'est permis que pour le récit de 021-16')
    const formes = k.clips.filter((v) => !estInset(v))
    if (formes.length) raisons.push(`valeur(s) ${formes.join(', ')} : inset(…) seulement`)
    const nomRe = new RegExp(`(?<![\\w-])${k.nom}(?![\\w-])`)
    const horsCible = usages.filter((u) => nomRe.test(u.valeur)).flatMap((u) => auNiveau0(u.selecteurs, (c) => c === ',').filter((s) => !CIBLES_CLIP.some((c) => c.test(dernierCompose(s)))).map((s) => `${s} (${u.fichier})`))
    if (horsCible.length) raisons.push(`jouée sur ${[...new Set(horsCible)].slice(0, 3).join(', ')} : img.eclate__assemble et .eclate__releve seulement`)
    if (raisons.length) noter('EC-9', `@keyframes ${k.nom} (${k.fichier}) anime clip-path : ${raisons.join(' ; ')}`)
  }
  const NOMS_KF = new Set(keyframes.map((k) => k.nom))
  faits.push(`EC-9 : ${keyframes.length} @keyframes dans la famille (${keyframes.map((k) => `${k.nom} : ${k.props.join('/')}`).join(' ; ').slice(0, 300) || 'aucun'})${KF_CLIP.length ? ` ; clip-path dans ${KF_CLIP.map((k) => `${k.nom} (${k.clips.join(' → ')})`).join(', ')}, fiche du récit ${RECIT ? 'présente' : 'absente'} dans la figure générée` : ''}`)

  // ── EC-10 : poids (sans Lighthouse) ──────────────────────────────────────────────────────────────────────────────────
  {
    let poids = 0
    const marcher = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) marcher(f); else poids += taille(f) } }
    if (fs.existsSync(path.join(SITE, 'eclate'))) marcher(path.join(SITE, 'eclate')); else noter('EC-10', 'eclate/ absent de la copie générée')
    const styles = brotli(path.join(SITE, 'styles.css')) - brotli(path.join(REF, 'styles.css'))
    const bureau = brotli(path.join(SITE, 'bureau.css')), bureauRef = brotli(path.join(REF, 'bureau.css'))
    const jsIdentique = sha(path.join(SITE, 'site.js')) === sha(path.join(REF, 'site.js'))
    mesures.poids = { eclateOctets: poids, stylesCssBrotliEnPlus: styles, bureauCssBrotli: bureau, bureauCssBrotliReference: bureauRef, siteJsIdentique: jsIdentique }
    faits.push(`EC-10 : lestraque/eclate/ ${poids} octets ; brotli 11 : styles.css +${styles} octets, bureau.css ${bureau} octets (référence ${bureauRef}) ; site.js ${jsIdentique ? 'identique' : 'différent'} de la référence`)
    if (poids > 75000) noter('EC-10', `lestraque/eclate/ pèse ${poids} octets, 75 000 au plus`)
    if (styles > 1000) noter('EC-10', `styles.css +${styles} octets en brotli 11, +1 000 au plus`)
    if (taille(path.join(SITE, 'bureau.css')) < 0) noter('EC-10', 'aucun bureau.css écrit alors qu\'eclate.bureau.css existe : 021-20 (feuille de bureau) n\'est pas versée')
    else if (bureau > 6000) noter('EC-10', `bureau.css ${bureau} octets en brotli 11, 6 000 au plus`)
    if (!jsIdentique) noter('EC-10', 'site.js diffère de la référence : la famille ne doit ajouter aucune ligne de JavaScript')
  }

  // ── EC-1 : le garde, dans un arbre de travail (servira aussi à EC-16) ─────────────────────────────────────────────────
  const ARBRE = path.join(T, 'arbre'), AD = path.join(ARBRE, 'public', 'sites-demo')
  fs.mkdirSync(AD, { recursive: true })
  fs.copyFileSync(path.join(DEMOS, 'generer.mjs'), path.join(AD, 'generer.mjs'))
  for (const d of ['_kit', '_polices', 'lestraque']) fs.cpSync(path.join(DEMOS, d), path.join(AD, d), { recursive: true })
  {
    const daF = path.join(AD, '_kit', 'da.json'), da = JSON.parse(lire(daF))
    da.lestraque.familles = AVEC
    fs.writeFileSync(daF, JSON.stringify(da, null, 1))
    const vis = pieceDe('vis'), cible = path.join(AD, 'lestraque', 'eclate', vis.fichier), octets = fs.readFileSync(cible)
    fs.writeFileSync(cible, Buffer.alloc(0))
    const G = path.join(T, 'garde')
    const rg = generer(AVEC, G, path.join(AD, 'generer.mjs'), ARBRE)
    fs.writeFileSync(cible, octets)
    mesures.garde = { code: rg.code, message: derniere(rg.sortie).slice(0, 300) }
    if (rg.code === 0) noter('EC-1', `garde : avec un ${vis.fichier} vide, la génération passe (le crochet garde doit refuser un fichier d'eclate.json vide)`)
    else if (!rg.sortie.includes(vis.fichier)) noter('EC-1', `garde : génération refusée, mais le message ne nomme pas le ${vis.fichier} vide (${derniere(rg.sortie).slice(0, 160)})`)
    else faits.push(`EC-1 : garde, un ${vis.fichier} vide est refusé (« ${derniere(rg.sortie).slice(0, 120)} »)`)
    if (taille(path.join(G, 'index.html')) >= 0) noter('EC-1', 'garde : la génération refusée a tout de même écrit index.html')
  }

  // ── navigateur ───────────────────────────────────────────────────────────────────────────────────────────────────────
  let entetes
  try { entetes = await entetesProduction() } catch (e) { noter('juge', `en-têtes de production illisibles (${premiere(e)})`); return }
  srv = await servir(SITE, entetes)
  navA = await chromium.launch()
  navB = await chromium.launch({ args: CARTE })
  ecrirePreuves = true
  fs.mkdirSync(PREUVE, { recursive: true })
  const assemble00 = [...(await sharp(path.join(SITE, 'eclate', 'assemble.avif')).ensureAlpha().extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer())]
  mesures.pixel00Assemble = assemble00

  async function ouvrir(nav, options, serveur = srv) {
    const ctx = await nav.newContext({ reducedMotion: 'no-preference', ...options })
    const page = await ctx.newPage()
    const o = { ctx, page, requetes: [], enVol: 0, dernier: Date.now(), js: options.javaScriptEnabled !== false }
    if (o.js) await page.addInitScript(instrumentation)
    page.on('pageerror', (e) => journal.erreurs.push(premiere(e)))
    page.on('console', (m) => { if (m.type() === 'error' && /Content[- ]Security[- ]Policy/i.test(m.text())) journal.csp.push(m.text().slice(0, 160)) })
    ctx.on('request', (q) => { o.enVol++; o.dernier = Date.now(); try { o.requetes.push(new URL(q.url()).pathname) } catch { /* adresse illisible */ } })
    const finie = () => { o.enVol = Math.max(0, o.enVol - 1); o.dernier = Date.now() }
    ctx.on('requestfinished', finie); ctx.on('requestfailed', finie)
    await page.goto(`${serveur.base}/index.html`, { waitUntil: 'load', timeout: 120000 })
    await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {})
    return o
  }
  async function fermer(o) {
    if (o.js) { try { journal.csp.push(...(await o.page.evaluate(() => window.__csp || []))) } catch { /* page fermée */ } }
    await o.ctx.close().catch(() => {})
  }
  const repos = async (o, calme = 800, max = 15000) => { const t = Date.now(); while (Date.now() - t < max && !(o.enVol === 0 && Date.now() - o.dernier >= calme)) await o.page.waitForTimeout(100) }
  const imagesPretes = (page) => page.waitForFunction(() => [...document.querySelectorAll('#etapes figure.eclate img')].filter((i) => i.getClientRects().length && getComputedStyle(i).display !== 'none').every((i) => i.complete), null, { timeout: 10000 }).catch(() => {})
  const parFichier = (m) => new Map((m.calques || []).map((c) => [c.src.split('/').pop(), c]))
  const decalages = (m) => J.pieces.map((p) => {
    const c = parFichier(m).get(p.fichier)
    if (!c || !m.rendu) return { nom: p.nom, absent: true }
    return { nom: p.nom, dx: c.b.l - (m.rendu.l + p.x * m.rendu.w), dy: c.b.t - (m.rendu.t + p.y * m.rendu.h), tx: p.vecteur[0] * m.rendu.w, ty: p.vecteur[1] * m.rendu.h, ew: c.b.w - p.l * m.rendu.w, eh: c.b.h - p.h * m.rendu.h, op: c.op }
  })
  const etiquettesParTexte = (m) => new Map((m.etiquettes || []).map((e) => [e.texte, e]))

  function jugerCentre(m, k, F) {
    const d = [], C = `${F} C${k + 1}`
    if (!m.fig || !m.rendu) return [['EC-2', `${C} : figure.eclate ou div.eclate__rendu introuvable ou non affichée`]]
    const as = m.assemble[0], dec = decalages(m), cal = dec.filter((x) => !x.absent)
    if (!as) d.push(['EC-2', `${C} : img.eclate__assemble absente`])
    if (dec.some((x) => x.absent)) d.push(['EC-2', `${C} : calque(s) absent(s) de la figure : ${dec.filter((x) => x.absent).map((x) => x.nom).join(', ')}`])
    if (k !== 2) {
      if (k === 0 && m.recit) {
        // Récit de 021-16 (fiche présente) : à C1, ce qu'attend ER-2 (cahier l. 913 ; §3.4 D l. 528, la fiche « à la place du rendu ») :
        // les trois lignes de la fiche ≥ 0,98 et assemble.avif ≤ 0,02 ; calques ≤ 0,02 et au repos, comme sans récit (plus bas)
        for (const f of m.ficheLignes || []) {
          if (!f.n) d.push(['EC-2', `${C} : ligne de la fiche « ${f.texte} » introuvable (récit : la demande à C1, ER-2)`])
          else if (f.op < 0.98) d.push(['EC-2', `${C} : ligne de la fiche « ${f.texte} » à ${f2(f.op)} (≥ 0,98 : la demande, ER-2)`])
        }
        if (as && as.op > 0.02) d.push(['EC-2', `${C} : assemble.avif à ${f2(as.op)} (≤ 0,02 : la fiche à la place du rendu, ER-2)`])
      } else if (as && as.op < 0.98) d.push(['EC-2', `${C} : assemble.avif à ${f2(as.op)} (≥ 0,98 : assemblée)`])
      const vus = cal.filter((x) => x.op > 0.02)
      if (vus.length) d.push(['EC-2', `${C} : calque(s) visible(s) ${vus.map((x) => `${x.nom} ${f2(x.op)}`).join(', ')} (≤ 0,02)`])
      const loin = cal.filter((x) => Math.abs(x.dx) > 2 || Math.abs(x.dy) > 2)
      if (loin.length) d.push(['EC-2', `${C} : calque(s) hors de leur repos ${loin.map((x) => `${x.nom} (${f1(x.dx)} ; ${f1(x.dy)}) px`).join(', ')} (± 2 : assemblée)`])
    } else {
      if (as && as.op > 0.02) d.push(['EC-2', `${C} : assemble.avif encore à ${f2(as.op)} (≤ 0,02 : éclatée)`])
      for (const x of cal) {
        if (x.op < 0.98) d.push(['EC-2', `${C} : calque ${x.nom} à ${f2(x.op)} (≥ 0,98)`])
        if (Math.abs(x.dx - x.tx) > 2 || Math.abs(x.dy - x.ty) > 2) d.push(['EC-2', `${C} : ${x.nom} décalé de (${f1(x.dx)} ; ${f1(x.dy)}) px, vecteur × taille = (${f1(x.tx)} ; ${f1(x.ty)}) ± 2 attendu`])
        if (Math.abs(x.ew) > 2 || Math.abs(x.eh) > 2) d.push(['EC-2', `${C} : ${x.nom} écarté de (${f1(x.ew)} ; ${f1(x.eh)}) px de la taille de sa boîte d'eclate.json (± 2)`])
      }
    }
    const repli = Math.max(0, ...m.eclate.map((e) => e.op))
    if (repli > 0.02) d.push(['EC-2', `${C} : img.eclate__eclate (repli) visible au bureau chorégraphié (${f2(repli)}, ≤ 0,02)`])
    if (k === 1) {
      if (m.recit) {
        // Récit de 021-16 : « les cotes du relevé entrent, remplaçant la cote seule de 021-05 » (§3.4 D l. 535) ; à C2, ce qu'attend
        // ER-3 (cahier l. 914) : cotes « 40 mm » et « 17 mm » ≥ 0,98, au lieu de .eclate__cote
        for (const c of m.cotesReleve || []) {
          if (!c.n) d.push(['EC-2', `${C} : cote « ${c.texte} » du relevé introuvable (récit : ER-3)`])
          else if (c.op < 0.98) d.push(['EC-2', `${C} : cote « ${c.texte} » du relevé à ${f2(c.op)} (≥ 0,98 : ER-3)`])
        }
      } else if (!m.cote) d.push(['EC-2', `${C} : .eclate__cote absente`])
      else if (m.cote.op < 0.98) d.push(['EC-2', `${C} : cote à ${f2(m.cote.op)} (≥ 0,98)`])
    }
    const et = etiquettesParTexte(m)
    if (k === 2) for (const e of J.etiquettes) { const x = et.get(e.texte); if (!x) d.push(['EC-2', `${C} : étiquette « ${e.texte} » absente`]); else if (x.op < 0.98) d.push(['EC-2', `${C} : étiquette « ${e.texte} » à ${f2(x.op)} (≥ 0,98)`]) }
    if (k === 3) { const vues = [...et.values()].filter((x) => x.op > 0.02); if (vues.length) d.push(['EC-2', `${C} : étiquette(s) encore visible(s) ${vues.map((x) => `« ${x.texte} » ${f2(x.op)}`).join(', ')} (≤ 0,02)`]) }
    const attendu = `0${k + 1}`
    if (!m.compteur) d.push(['EC-2', `${C} : span.eclate__compteur absent`])
    else {
      if (m.compteur.visible !== attendu) d.push(['EC-2', `${C} : compteur « ${m.compteur.visible ?? 'aucun chiffre dans la fenêtre'} », « ${attendu} » attendu`])
      if (!/^\/\s?04$/.test(m.compteur.total || '')) d.push(['EC-2', `${C} : total du compteur « ${m.compteur.total ?? 'absent'} », « / 04 » attendu`])
      if (m.compteur.op < 0.98) d.push(['EC-2', `${C} : compteur à ${f2(m.compteur.op)} (≥ 0,98)`])
    }
    const pleines = (m.nums || []).map((o, i) => (o >= 0.98 ? i : -1)).filter((i) => i >= 0)
    if (pleines.length !== 1 || pleines[0] !== k) d.push(['EC-3', `${C} : étape(s) pleine(s) de la liste ${pleines.map((i) => `0${i + 1}`).join(', ') || 'aucune'}, la ${attendu} seule attendue (état de la scène ${k + 1})`])
    else if (m.compteur && m.compteur.visible && m.compteur.visible !== `0${pleines[0] + 1}`) d.push(['EC-3', `${C} : la liste est à l'étape 0${pleines[0] + 1}, le compteur à « ${m.compteur.visible} »`])
    return d
  }
  function signature(m) {
    const v = {}
    for (const x of decalages(m)) if (!x.absent) { v[`${x.nom} x`] = [x.dx, 0.5]; v[`${x.nom} y`] = [x.dy, 0.5]; v[`opacité de ${x.nom}`] = [x.op, 0.01] }
    if (m.assemble && m.assemble[0]) v['opacité d\'assemble.avif'] = [m.assemble[0].op, 0.01]
    for (const e of m.etiquettes || []) { v[`opacité de « ${e.texte} »`] = [e.op, 0.01]; if (e.point && m.rendu) { v[`point de « ${e.texte} » x`] = [e.point.l - m.rendu.l, 0.5]; v[`point de « ${e.texte} » y`] = [e.point.t - m.rendu.t, 0.5] } }
    if (m.cote) v['opacité de la cote'] = [m.cote.op, 0.01]
    return v
  }
  function jugerTenue(ms, k, F) {
    const d = [], sig = ms.map(signature)
    for (const cle of Object.keys(sig[1])) {
      if (!sig.every((s) => s[cle])) continue
      const vals = sig.map((s) => s[cle][0]), ecart = Math.max(...vals) - Math.min(...vals), tol = sig[1][cle][1]
      if (ecart > tol + 1e-9) d.push(['EC-4', `${F} tenue C${k + 1} : ${cle} varie de ${tol === 0.5 ? `${f2(ecart)} px` : f2(ecart)} entre ${f2(CENTRES[k] - 2.5)} et ${f2(CENTRES[k] + 2.5)} % (± ${tol === 0.5 ? '0,5 px' : '0,01'})`])
    }
    const chiffres = [...new Set(ms.map((m) => (m.compteur ? m.compteur.visible : null)))]
    if (chiffres.length !== 1) d.push(['EC-4', `${F} tenue C${k + 1} : le compteur change (${chiffres.join(' → ')})`])
    return d
  }
  async function contraste(page, cibles) {
    const TRANSPARENT = '#etapes .eclate,#etapes .eclate *,#etapes .eclate__compteur,#etapes .eclate__compteur *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;transition:none!important}#etapes .eclate text,#etapes .eclate tspan{fill:transparent!important;stroke:transparent!important}'
    const style = await page.addStyleTag({ content: TRANSPARENT })
    await deuxImages(page)
    const png = await page.screenshot({ type: 'png' })
    await style.evaluate((e) => e.remove()); await deuxImages(page)
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    return cibles.map((c) => {
      const n = (String(c.encre || '').match(/[\d.]+/g) || []).map(Number)
      if (n.length < 3) return { nom: c.nom, p10: null, raison: `couleur illisible (${c.encre})` }
      const alpha = Math.max(0, Math.min(1, (n.length > 3 ? n[3] : 1) * c.op))
      const ratios = []
      for (const q of c.rects) for (let y = Math.max(0, Math.floor(q.t)); y < Math.min(info.height, Math.ceil(q.b)); y++) for (let x = Math.max(0, Math.floor(q.l)); x < Math.min(info.width, Math.ceil(q.r)); x++) {
        const i = (y * info.width + x) * info.channels, fr = data[i], fv = data[i + 1], fb = data[i + 2]
        const L1 = lum(alpha * n[0] + (1 - alpha) * fr, alpha * n[1] + (1 - alpha) * fv, alpha * n[2] + (1 - alpha) * fb), L2 = lum(fr, fv, fb)
        ratios.push((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05))
      }
      if (!ratios.length) return { nom: c.nom, p10: null, raison: 'aucun pixel de texte à l\'écran' }
      ratios.sort((a, b) => a - b)
      return { nom: c.nom, p10: ratios[Math.floor(0.1 * (ratios.length - 1))], pixels: ratios.length }
    })
  }
  async function fondFigure(page, png, m) {
    const r = m.rendu, cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2
    const pts = [[cx, r.t - 4, 'au-dessus'], [r.r + 4, cy, 'à droite'], [cx, r.b + 4, 'en dessous'], [r.l - 4, cy, 'à gauche'], [r.l + 4, r.t + 4, 'coin haut gauche'], [r.r - 5, r.t + 4, 'coin haut droit'], [r.l + 4, r.b - 5, 'coin bas gauche'], [r.r - 5, r.b - 5, 'coin bas droit']]
    const libres = await page.evaluate((l) => l.map(([x, y]) => {
      if (x < 4 || y < 4 || x > innerWidth - 5 || y > innerHeight - 5) return false
      const el = document.elementFromPoint(x, y)
      if (!el || !el.closest('#etapes')) return false
      return !el.closest('.eclate__etiquette, .eclate__cote, .eclate__compteur, .eclate__pastille, .eclate__legende, h2, h3, p, .mono, .etapes__liste, .etapes__jauge, header, nav')
    }), pts.map(([x, y]) => [x, y]))
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const res = []
    pts.forEach(([x, y, nom], i) => {
      if (!libres[i]) return
      const cs = [[], [], []]
      for (let yy = Math.round(y) - 3; yy <= Math.round(y) + 3; yy++) for (let xx = Math.round(x) - 3; xx <= Math.round(x) + 3; xx++) {
        if (xx < 0 || yy < 0 || xx >= info.width || yy >= info.height) continue
        const j = (yy * info.width + xx) * info.channels
        for (let c = 0; c < 3; c++) cs[c].push(data[j + c])
      }
      const med = cs.map((v) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)])
      res.push({ nom, rvb: med, ecart: Math.max(...med.map((v, c) => Math.abs(v - assemble00[c]))) })
    })
    return res
  }
  const alphas = new Map()
  async function alphaDe(fichier) {
    if (!alphas.has(fichier)) {
      const { data, info } = await sharp(path.join(SITE, 'eclate', fichier)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const a = new Uint8Array(info.width * info.height)
      for (let i = 0; i < a.length; i++) a[i] = data[i * info.channels + info.channels - 1]
      alphas.set(fichier, { w: info.width, h: info.height, a })
    }
    return alphas.get(fichier)
  }
  const opaqueAutour = (al, fx, fy, rayon) => {
    for (let y = Math.max(0, Math.floor(fy - rayon)); y <= Math.min(al.h - 1, Math.ceil(fy + rayon)); y++) for (let x = Math.max(0, Math.floor(fx - rayon)); x <= Math.min(al.w - 1, Math.ceil(fx + rayon)); x++) if ((x - fx) ** 2 + (y - fy) ** 2 <= rayon * rayon && al.a[y * al.w + x] > 128) return true
    return false
  }
  async function verifierImage(f, nom) {
    produites.push(f)
    if (taille(f) <= 0) { noter('PR', `${nom} vide ou absente`); return }
    try { const s = await sharp(f).greyscale().stats(); if (s.channels[0].stdev < 8) noter('PR', `${nom} unie (écart-type du gris ${f1(s.channels[0].stdev)}, 8 au moins)`) } catch (e) { noter('PR', `${nom} illisible (${premiere(e)})`) }
  }
  // Trou (a) d'EC-2 sans JavaScript, prouvé par .orchestre/travail/021-05-verif-raf-sans-js : les styles calculés seuls laissaient passer
  // html.no-js .eclate__rendu{clip-path:inset(50%)} (scène vide, PASS). La boîte du rendu est capturée sans JavaScript et comparée à
  // celle de la capture avec JavaScript de la même taille d'écran au même centre (1440×900 sans carte, C3 : refC3). Choix du juge : écart
  // moyen du gris ≤ 12 niveaux sur 255 et écart-type du gris sans JavaScript ≥ 0,6 × celui avec JavaScript (vide, uni ou voilé : dessous).
  let refC3 = null
  async function comparerSansJs(page, m) {
    const F = 'sans JavaScript 1440×900 C3'
    if (!m.rendu) return { defauts: [], releve: null } // jugerCentre le dit déjà
    if (!refC3 || !refC3.rendu) return { defauts: [['EC-2', `${F} : aucune capture avec JavaScript (1440×900 sans carte, C3) à laquelle comparer la scène`]], releve: null }
    // images décodées : sans JavaScript, ni rAF ni minuterie dans la page ; on interroge depuis Node
    for (const t = Date.now(); Date.now() - t < 10000;) {
      if (await page.evaluate(() => [...document.querySelectorAll('#etapes figure.eclate img')].filter((i) => i.getClientRects().length && getComputedStyle(i).display !== 'none').every((i) => i.complete))) break
      await page.waitForTimeout(150)
    }
    const png = await page.screenshot({ type: 'png' })
    const boite = async (buf, r) => { const { width: w, height: h } = await sharp(buf).metadata(), s = w / 1440; const x = Math.max(0, Math.floor(r.l * s)), y = Math.max(0, Math.floor(r.t * s)), x2 = Math.min(w, Math.ceil(r.r * s)), y2 = Math.min(h, Math.ceil(r.b * s)); return x2 - x >= 20 && y2 - y >= 20 ? { left: x, top: y, width: x2 - x, height: y2 - y } : null }
    const bA = await boite(refC3.png, refC3.rendu), bS = await boite(png, m.rendu)
    if (!bA || !bS) return { defauts: [['EC-2', `${F} : boîte du rendu hors de l'écran ${bA ? 'sans' : 'avec'} JavaScript, rien à comparer`]], releve: null }
    const gris = async (buf, b) => {
      let p = sharp(buf).extract(b).removeAlpha()
      if (b.width !== bA.width || b.height !== bA.height) p = p.resize(bA.width, bA.height, { fit: 'fill' })
      const { data, info } = await p.greyscale().raw().toBuffer({ resolveWithObject: true })
      const out = new Float64Array(info.width * info.height)
      for (let i = 0; i < out.length; i++) out[i] = data[i * info.channels]
      return out
    }
    const a = await gris(refC3.png, bA), s = await gris(png, bS)
    const moy = (v) => v.reduce((x, y) => x + y, 0) / v.length, ma = moy(a), ms = moy(s)
    let ecart = 0, va = 0, vs = 0
    for (let i = 0; i < a.length; i++) { ecart += Math.abs(a[i] - s[i]); va += (a[i] - ma) ** 2; vs += (s[i] - ms) ** 2 }
    const releve = { ecartMoyen: ecart / a.length, ecartTypeAvecJs: Math.sqrt(va / a.length), ecartTypeSansJs: Math.sqrt(vs / s.length), boiteAvecJs: bA, boiteSansJs: bS }
    const defauts = []
    if (releve.ecartMoyen > 12) defauts.push(['EC-2', `${F} : la scène capturée s'écarte en moyenne de ${f1(releve.ecartMoyen)} niveaux de gris de celle avec JavaScript (≤ 12) : les styles disent « éclatée », l'écran montre autre chose`])
    if (releve.ecartTypeSansJs < 0.6 * releve.ecartTypeAvecJs) defauts.push(['EC-2', `${F} : écart-type du gris de la scène ${f1(releve.ecartTypeSansJs)}, ${f1(releve.ecartTypeAvecJs)} avec JavaScript (≥ 0,6 × : scène vide, unie ou voilée)`])
    return { defauts, releve }
  }
  // Trou (b) d'EC-6, prouvé par .orchestre/travail/021-05-verif-ancres (sous-le-point.mjs) : au téléphone, les pastilles étaient jugées
  // posées sur leurs ancres sans qu'aucun pixel ne soit lu dessous. Feuille ajoutée dans ce seul contexte de mesure (les pastilles et
  // leurs traits en visibility:hidden : pastilles, numéros, points, filets, traits de cote), une capture, puis le pixel au centre de
  // chaque pastille : à plus de 30 (distance RVB) du fond de la scène. Choix du juge : fond = background-color calculée de #etapes si
  // elle est opaque, sinon rgb(21, 17, 14) relevé.
  const MASQUE_PASTILLES = '#etapes .eclate__pastille,#etapes .eclate__numero,#etapes .eclate__point,#etapes .eclate__filet,#etapes .eclate__trait{visibility:hidden!important}'
  async function sousLesPastilles(page, m, nomCtx) {
    const ps = (m.pastilles || []).map((p, i) => ({ ...p, etiquette: J.etiquettes[i] ? J.etiquettes[i].texte : '?' })).filter((p) => p.b && p.b.w > 0 && p.b.h > 0)
    if (!ps.length) return { defauts: [], releve: null } // jugerFixe le dit déjà
    await imagesPretes(page)
    const calcule = await page.evaluate(() => { const s = document.querySelector('#etapes'); return s ? getComputedStyle(s).backgroundColor : '' })
    const n = (String(calcule).match(/[\d.]+/g) || []).map(Number)
    const fond = n.length >= 3 && (n.length === 3 || n[3] >= 0.99) ? n.slice(0, 3).map(Math.round) : [21, 17, 14]
    const style = await page.addStyleTag({ content: MASQUE_PASTILLES })
    let png
    try { await deuxImages(page); png = await page.screenshot({ type: 'png' }) } finally { await style.evaluate((e) => e.remove()).catch(() => {}); await deuxImages(page).catch(() => {}) }
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const s = info.width / m.iw
    const defauts = [], pixels = []
    for (const p of ps) {
      const x = Math.round((p.b.l + p.b.w / 2) * s), y = Math.round((p.b.t + p.b.h / 2) * s)
      if (x < 0 || y < 0 || x >= info.width || y >= info.height) { defauts.push(`${nomCtx} : pastille ${p.texte} (« ${p.etiquette} ») hors de l'écran, aucun pixel à lire dessous`); continue }
      const i = (y * info.width + x) * info.channels, rvb = [data[i], data[i + 1], data[i + 2]]
      const dist = Math.hypot(rvb[0] - fond[0], rvb[1] - fond[1], rvb[2] - fond[2])
      pixels.push({ pastille: p.texte, rvb, distance: Number(f1(dist)) })
      if (!(dist > 30)) defauts.push(`${nomCtx} : sous la pastille ${p.texte} (« ${p.etiquette} »), pastilles masquées, le pixel rgb(${rvb.join(', ')}) n'est qu'à ${f1(dist)} du fond de la scène rgb(${fond.join(', ')}) (plus de 30 : la pastille ne pose sur aucune pièce)`)
    }
    return { defauts, releve: { fondCalcule: calcule, fond, pixels } }
  }

  // ── EC-1 (DOM), EC-2 à EC-5, EC-9 (page), EC-11 à EC-15 : bureau ──────────────────────────────────────────────────────
  mesures.bureau = {}
  let dom = false
  for (const [W, H] of [[1440, 900], [1088, 800]]) for (const carte of [false, true]) {
    const F = `${fmt(W, H)} ${carte ? 'avec' : 'sans'} carte`
    const rec = (mesures.bureau[F] = { centres: {}, tenues: {} })
    const o = await ouvrir(carte ? navB : navA, { viewport: { width: W, height: H } })
    const { page } = o
    await page.waitForTimeout(1500)
    const m0 = await page.evaluate(scene, { y: null })
    if (!m0.sec || !m0.fig) { noter('EC-2', `${F} : #etapes ou figure.eclate introuvable dans la page servie`); await fermer(o); continue }
    const plage = m0.sec.hauteur - H, yDe = (p) => Math.round(m0.sec.haut + (p / 100) * plage)
    rec.hauteurEtapes = m0.sec.hauteur; rec.plageContain = plage

    if (!dom) {
      dom = true
      const d = []
      if (!m0.classesFigure.includes('etapes__photo')) d.push('la figure a perdu la classe etapes__photo')
      if (m0.role !== 'img') d.push(`role="${m0.role}" sur la figure, "img" attendu`)
      if (m0.aria !== norm(ARIA)) d.push(`aria-label « ${m0.aria} », « ${ARIA} » attendu`)
      if (!m0.rendu) d.push('div.eclate__rendu absente')
      if (m0.assemble.length !== 1 || !/(^|\/)eclate\/assemble\.avif$/.test(m0.assemble[0].src)) d.push(`img.eclate__assemble : ${m0.assemble.length} (une, eclate/assemble.avif)`)
      if (m0.eclate.length !== 1 || !/(^|\/)eclate\/eclate\.avif$/.test(m0.eclate[0].src)) d.push(`img.eclate__eclate : ${m0.eclate.length} (une, eclate/eclate.avif)`)
      const fichiers = m0.calques.map((c) => c.src.split('/').pop()).sort(), attendus = J.pieces.map((p) => p.fichier).sort()
      if (JSON.stringify(fichiers) !== JSON.stringify(attendus) || m0.calques.some((c) => !/(^|\/)eclate\//.test(c.src))) d.push(`img.eclate__calque : ${fichiers.join(', ') || 'aucun'} (attendu eclate/ ${attendus.join(', ')})`)
      const presses = m0.calques.filter((c) => c.loading !== 'lazy' || c.decoding !== 'async')
      if (presses.length) d.push(`${presses.length} calque(s) sans loading="lazy" et decoding="async"`)
      if (m0.imagesSansAlt) d.push(`${m0.imagesSansAlt} img de la figure sans attribut alt`)
      const textes = m0.etiquettes.map((e) => e.texte).sort(), attTextes = J.etiquettes.map((e) => e.texte).sort()
      if (JSON.stringify(textes) !== JSON.stringify(attTextes)) d.push(`.eclate__etiquette : « ${textes.join(' | ')} », attendu « ${attTextes.join(' | ')} »`)
      if (m0.etiquettes.some((e) => !e.cache)) d.push('étiquette(s) sans aria-hidden="true"')
      if (m0.etiquettes.some((e) => !e.point || !e.filet)) d.push('étiquette(s) sans .eclate__point ou .eclate__filet')
      if (JSON.stringify(m0.pastilles.map((p) => p.texte)) !== JSON.stringify(['1', '2', '3', '4', '5'])) d.push(`.eclate__pastille : « ${m0.pastilles.map((p) => p.texte).join(', ') || 'aucune'} », « 1 » à « 5 » attendues`)
      if (!m0.cote || !m0.cote.texte.includes(norm(J.cote.texte))) d.push(`.eclate__cote absente ou sans « ${J.cote.texte} »`)
      if (!m0.compteur) d.push('span.eclate__compteur absent de #etapes')
      else {
        if (JSON.stringify(m0.compteur.piste) !== JSON.stringify(['01', '02', '03', '04'])) d.push(`.compteur__piste : « ${m0.compteur.piste.join(', ')} », « 01 » à « 04 » attendus`)
        if (!m0.compteur.cache) d.push('compteur sans aria-hidden="true" (comme celui du travelling)')
      }
      if (!m0.legende) d.push('ol.eclate__legende absente de #etapes')
      else if (JSON.stringify(m0.legende.items.map((i) => i.texte)) !== JSON.stringify(J.etiquettes.map((e) => e.texte))) d.push(`légende « ${m0.legende.items.map((i) => i.texte).join(' | ')} », attendu les textes d'eclate.json dans l'ordre`)
      for (const t of d) noter('EC-1', t)
      if (!d.length) faits.push('EC-1 : structure de la figure conforme (rendu, assemblée, 4 calques paresseux, repli, cote, 5 étiquettes, 5 pastilles, compteur, légende)')
    }

    // EC-11 : la piste
    if (!carte) {
      const hauteurAttendue = 4.5 * H
      if (Math.abs(m0.sec.hauteur - hauteurAttendue) > 1) noter('EC-11', `${F} : #etapes haut de ${f1(m0.sec.hauteur)} px, 450svh = ${hauteurAttendue} px attendus (± 1)`)
    }

    const centres = []
    for (let k = 0; k < 4; k++) {
      let m = await page.evaluate(scene, { y: yDe(CENTRES[k]) })
      let d = jugerCentre(m, k, F)
      if (d.length) { await page.waitForTimeout(2000); m = await page.evaluate(scene, { y: yDe(CENTRES[k]) }); d = jugerCentre(m, k, F) }
      for (const [id, t] of d) noter(id, t)
      centres.push(m)
      rec.centres[`C${k + 1}`] = { scrollY: m.scrollY, rendu: m.rendu, decalages: decalages(m), assemble: m.assemble && m.assemble[0] ? m.assemble[0].op : null, etiquettes: (m.etiquettes || []).map((e) => [e.texte, Number(f2(e.op))]), cote: m.cote ? m.cote.op : null, compteur: m.compteur ? m.compteur.visible : null, nums: m.nums }
      if (k === 0 || k === 2) {
        // EC-9 dans la page
        const jouees = (m.animations || []).filter((a) => NOMS_KF.has(a.nom))
        for (const a of jouees) { const hors = a.proprietes.filter((p) => !PERMISES.has(p) && p !== 'clipPath'); if (hors.length) noter('EC-9', `${F} : l'animation ${a.nom} sur ${a.cible} anime ${hors.join(', ')}`) }
        // clip-path dans la page (ligne EC-9 du cahier, l. 899, « et clip-path pour 021-16 ») : relu dans tout le document ; fiche du
        // récit présente (HTML généré et page), cible img.eclate__assemble ou .eclate__releve de la figure sans pseudo-élément, inset(…)
        for (const a of await page.evaluate(animationsClip, [...NOMS_KF])) {
          const raisons = []
          if (!RECIT || !m.recit) raisons.push(`fiche du récit (span.eclate__fiche) absente ${RECIT ? 'de la page' : 'de la figure générée'}`)
          if (!a.permise) raisons.push('cible hors de img.eclate__assemble et .eclate__releve de la figure')
          const formes = a.valeurs.filter((v) => !estInset(v))
          if (formes.length) raisons.push(`valeur(s) ${formes.join(', ')} : inset(…) seulement`)
          if (raisons.length) noter('EC-9', `${F} C${k + 1} : l'animation ${a.nom} sur ${a.cible} anime clip-path : ${raisons.join(' ; ')}`)
        }
        const glisse = (m.animations || []).filter((a) => a.nom === 'glisse-cadre')
        if (glisse.length) noter('EC-9', `${F} C${k + 1} : glisse-cadre joue encore sur ${glisse.map((a) => a.cible).join(', ')} (cadre photo non neutralisé)`)
        if (k === 0 && m.assemble && m.assemble[0] && !['none', '1'].includes(m.assemble[0].scale)) noter('EC-9', `${F} : scale ${m.assemble[0].scale} sur assemble.avif (none attendu : cadre photo neutralisé)`)
      }
      if (carte) continue
      // images, contraste, mise en page : sans carte
      await imagesPretes(page)
      const png = await page.screenshot({ type: 'png' })
      if (W === 1440 && k === 2) refC3 = { png, rendu: m.rendu } // référence du trou (a) d'EC-2 sans JavaScript
      const image = path.join(PREUVE, `eclate-c${k + 1}-${W}x${H}.jpg`)
      await sharp(png).jpeg({ quality: 88 }).toFile(image)
      await verifierImage(image, path.basename(image))
      // EC-15
      if (m.rendu && m.h2 && chevauche(m.h2, m.rendu)) noter('EC-15', `${F} C${k + 1} : le h2 (${f1(m.h2.l)}–${f1(m.h2.r)} × ${f1(m.h2.t)}–${f1(m.h2.b)}) recouvre la scène (${f1(m.rendu.l)}–${f1(m.rendu.r)} × ${f1(m.rendu.t)}–${f1(m.rendu.b)})`)
      if (m.rendu && (m.rendu.l < -0.5 || m.rendu.t < -0.5 || m.rendu.r > W + 0.5 || m.rendu.b > H + 0.5)) noter('EC-15', `${F} C${k + 1} : scène hors de l'écran (${f1(m.rendu.l)}–${f1(m.rendu.r)} × ${f1(m.rendu.t)}–${f1(m.rendu.b)} dans ${W} × ${H})`)
      if (m.rendu && (k === 0 || k === 2)) {
        const fond = await fondFigure(page, png, m)
        rec.centres[`C${k + 1}`].fond = fond
        if (fond.length < 2) noter('EC-15', `${F} C${k + 1} : ${fond.length} point de fond mesurable autour de la scène (2 au moins)`)
        const loin = fond.filter((p) => p.ecart > 3)
        if (loin.length) noter('EC-15', `${F} C${k + 1} : fond de la figure ${loin.map((p) => `${p.nom} rgb(${p.rvb.join(', ')})`).join(', ')}, à plus de 3 niveaux du pixel (0, 0) d'assemble.avif rgb(${assemble00.slice(0, 3).join(', ')})`)
      }
      // EC-5
      const cibles = []
      if (m.compteur) {
        if (m.compteur.rectsChiffre.length) cibles.push({ nom: `compteur « ${m.compteur.visible} »`, rects: m.compteur.rectsChiffre, encre: m.compteur.encreChiffre, op: m.compteur.opChiffre })
        if (m.compteur.rectsTotal.length) cibles.push({ nom: 'total du compteur', rects: m.compteur.rectsTotal, encre: m.compteur.encreTotal, op: m.compteur.opTotal })
      }
      if (k === 1 && m.cote && m.cote.rects.length) cibles.push({ nom: 'cote', rects: m.cote.rects, encre: m.cote.encre, op: m.cote.op })
      if (k === 2) for (const e of m.etiquettes || []) if (e.rects.length) cibles.push({ nom: `« ${e.texte} »`, rects: e.rects, encre: e.encre, op: e.op })
      if (cibles.length) {
        const res = await contraste(page, cibles)
        rec.centres[`C${k + 1}`].contraste = res.map((r) => [r.nom, r.p10 === null ? null : Number(f2(r.p10))])
        for (const r of res) if (r.p10 === null || r.p10 < 4.5) noter('EC-5', `${F} C${k + 1} : ${r.nom} p10 ${r.p10 === null ? `non mesuré (${r.raison})` : f2(r.p10)} (≥ 4,5)`)
      }
      // EC-14 et cote (EC-13)
      if (k === 1) {
        const seuil = W === 1440 ? 420 : 310
        const larg = Math.min(...m.paragraphes.map((p) => p.l)), lignes = Math.max(...m.paragraphes.map((p) => p.lignes))
        rec.liste = { largeurMin: larg, lignesMax: lignes, paragraphes: m.paragraphes }
        if (!m.paragraphes.length) noter('EC-14', `${F} : aucun .etape__corps p`)
        else {
          if (larg < seuil) noter('EC-14', `${F} : texte d'étape large de ${f1(larg)} px, ${seuil} au moins`)
          if (lignes > 4) noter('EC-14', `${F} : un paragraphe d'étape sur ${lignes} lignes, 4 au plus`)
        }
        if (m.cote && !(m.cote.police >= 14)) noter('EC-13', `${F} : texte de la cote en ${f1(m.cote.police)} px (≥ 14)`)
      }
      // EC-12 et EC-13
      if (k === 2 && m.rendu) {
        const aire = (m.rendu.w * m.rendu.h) / (W * H), seuil = W === 1440 ? 0.30 : 0.23
        rec.aire = aire
        if (aire < seuil) noter('EC-12', `${F} : la scène couvre ${pct(100 * aire)} de l'écran (${f1(m.rendu.w)} × ${f1(m.rendu.h)} px), ${pct(100 * seuil)} au moins`)
        const et = etiquettesParTexte(m), boites = []
        for (const e of J.etiquettes) {
          const x = et.get(e.texte)
          if (!x) continue
          if (!(x.police >= 14)) noter('EC-13', `${F} : « ${e.texte} » en ${f1(x.police)} px (≥ 14)`)
          const u = union(x.rects)
          if (u) boites.push([e.texte, u])
          if (!x.filet || Math.max(x.filet.w, x.filet.h) < 4) noter('EC-13', `${F} : « ${e.texte} » sans .eclate__filet d'au moins 4 px`)
          if (!x.point) { noter('EC-13', `${F} : « ${e.texte} » sans .eclate__point`); continue }
          const px = x.point.l + x.point.w / 2, py = x.point.t + x.point.h / 2
          const ax = m.rendu.l + ancre(e).x * m.rendu.w, ay = m.rendu.t + ancre(e).y * m.rendu.h
          if (Math.abs(px - ax) > 2 || Math.abs(py - ay) > 2) noter('EC-13', `${F} : point de « ${e.texte} » à (${f1(px - m.rendu.l)} ; ${f1(py - m.rendu.t)}) px dans la scène, son ancre d'eclate.json à (${f1(ax - m.rendu.l)} ; ${f1(ay - m.rendu.t)}) ± 2`)
          const p = pieceDe(e.piece), c = parFichier(m).get(p.fichier)
          if (!c || !(c.b.w > 0 && c.b.h > 0)) continue
          const al = await alphaDe(p.fichier)
          const rayon = (2 * al.w) / c.b.w
          if (!opaqueAutour(al, ((px - c.b.l) / c.b.w) * al.w, ((py - c.b.t) / c.b.h) * al.h, rayon)) {
            const donnee = opaqueAutour(al, ((ancre(e).x - p.x - p.vecteur[0]) / p.l) * al.w, ((ancre(e).y - p.y - p.vecteur[1]) / p.h) * al.h, rayon)
            noter('EC-13', `${F} : le point de « ${e.texte} » ne tombe sur aucun pixel opaque de la pièce « ${p.nom} » éclatée${donnee ? '' : ' ; l\'ancre d\'eclate.json elle-même est hors de la pièce éclatée : donnée à reprendre en amont (021-22), pas dans la famille'}`)
          }
        }
        for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) if (chevauche(boites[i][1], boites[j][1])) noter('EC-13', `${F} : « ${boites[i][0]} » et « ${boites[j][0]} » se chevauchent`)
        const pastillesVues = (m.pastilles || []).filter((p) => p.op > 0.02)
        if (pastillesVues.length) noter('EC-13', `${F} : ${pastillesVues.length} pastille(s) visible(s) au bureau chorégraphié (profil du téléphone, ≤ 0,02)`)
        if (m.legende && m.legende.op > 0.02 && m.legende.b && m.legende.b.h > 0) noter('EC-13', `${F} : légende visible au bureau chorégraphié (profil du téléphone, ≤ 0,02)`)
      }
    }
    faits.push(`${F} : piste ${f1(m0.sec.hauteur)} px, plage ${f1(plage)} px ; compteur ${centres.map((m) => (m.compteur ? m.compteur.visible : '—')).join('/')} ; à C3 ${decalages(centres[2]).map((x) => (x.absent ? `${x.nom} absent` : `${x.nom} (${f1(x.dx)} ; ${f1(x.dy)})`)).join(', ')} px${rec.aire !== undefined ? ` ; scène ${pct(100 * rec.aire)} de l'écran` : ''}${rec.liste ? ` ; texte d'étape ≥ ${f1(rec.liste.largeurMin)} px sur ${rec.liste.lignesMax} ligne(s) au plus` : ''}`)

    // EC-4 : les tenues
    for (let k = 0; k < 4; k++) {
      const releve = async () => { const l = []; for (const dp of [-2.5, 0, 2.5]) l.push(await page.evaluate(scene, { y: yDe(CENTRES[k] + dp) })); return l }
      let ms = await releve(), d = jugerTenue(ms, k, F)
      if (d.length) { await page.waitForTimeout(2000); ms = await releve(); d = jugerTenue(ms, k, F) }
      for (const [id, t] of d) noter(id, t)
      rec.tenues[`C${k + 1}`] = d.length ? d.map((x) => x[1]) : 'immobile'
    }

    // EC-11 : longueur du geste, sans carte
    if (!carte) {
      const relever = async (ys) => { const out = []; for (let i = 0; i < ys.length; i += 120) out.push(...(await page.evaluate(releverCalques, ys.slice(i, i + 120)))); return out }
      const mobiles = J.pieces.filter((p) => Math.hypot(p.vecteur[0], p.vecteur[1]) > 0)
      const etat = (s) => {
        const par = new Map(s.cal.map((c) => [c.f, c]))
        let repos = true, vecteur = true
        for (const p of mobiles) {
          const c = par.get(p.fichier)
          if (!c) return { repos: false, vecteur: false }
          const dx = c.l - (s.rendu.l + p.x * s.rendu.w), dy = c.t - (s.rendu.t + p.y * s.rendu.h)
          if (Math.hypot(dx, dy) > 0.5) repos = false
          if (Math.hypot(dx - p.vecteur[0] * s.rendu.w, dy - p.vecteur[1] * s.rendu.h) > 0.5) vecteur = false
        }
        return { repos, vecteur }
      }
      const geste = {}
      if (!mobiles.length) noter('EC-11', `${F} : tous les vecteurs d'eclate.json sont nuls, aucun geste possible`)
      else {
        const y0 = Math.round(m0.sec.haut), y1 = Math.round(m0.sec.haut + plage), ys = []
        for (let y = y0; y <= y1; y += 8) ys.push(y)
        if (ys[ys.length - 1] !== y1) ys.push(y1)
        const s = await relever(ys), E = s.map(etat)
        const affiner = async (ya, yb, pred) => { const yy = []; for (let y = ya + 1; y <= yb; y++) yy.push(y); const ss = await relever(yy); const j = ss.findIndex((x) => pred(etat(x))); return j < 0 ? yb : ss[j].y }
        const iV = E.findIndex((e) => e.vecteur && !e.repos)
        let iA = -1
        for (let i = iV - 1; i >= 0; i--) if (E[i].repos) { iA = i; break }
        const iR = iV < 0 ? -1 : E.findIndex((e, i) => i > iV && e.repos)
        let iB = -1
        for (let i = iR - 1; i >= iV && iR > 0; i--) if (E[i].vecteur) { iB = i; break }
        const p = (y) => (100 * (y - m0.sec.haut)) / plage
        if (iV < 0) noter('EC-11', `${F} : aucune position de la plage où tous les calques sont à leur vecteur (l'escalier ne s'éclate jamais en entier)`)
        else if (iA < 0) noter('EC-11', `${F} : aucune position assemblée (calques au repos) avant l'éclatement`)
        else if (iR < 0) noter('EC-11', `${F} : l'escalier ne revient jamais au repos après l'éclatement (pas de remontage)`)
        else {
          geste.debutEclatement = await affiner(s[iA].y, s[iA + 1].y, (e) => !e.repos)
          geste.finEclatement = await affiner(s[iV - 1].y, s[iV].y, (e) => e.vecteur)
          geste.debutRemontage = await affiner(s[iB].y, s[iB + 1].y, (e) => !e.vecteur)
          geste.finRemontage = await affiner(s[iR - 1].y, s[iR].y, (e) => e.repos)
          geste.eclatementPx = geste.finEclatement - geste.debutEclatement
          geste.remontagePx = geste.finRemontage - geste.debutRemontage
          geste.plagesPct = [geste.debutEclatement, geste.finEclatement, geste.debutRemontage, geste.finRemontage].map((y) => Number(f2(p(y))))
          // départs par pièce (8 px près), consignés pour le film
          geste.pieces = mobiles.map((pc) => {
            const bouge = (x, cible) => { const c = x.cal.find((q) => q.f === pc.fichier); if (!c) return false; const dx = c.l - (x.rendu.l + pc.x * x.rendu.w), dy = c.t - (x.rendu.t + pc.y * x.rendu.h); return cible ? Math.hypot(dx - pc.vecteur[0] * x.rendu.w, dy - pc.vecteur[1] * x.rendu.h) <= 0.5 : Math.hypot(dx, dy) > 0.5 }
            const part = s.findIndex((x, i) => i > iA && bouge(x, false)), arrive = s.findIndex((x, i) => i > part && part >= 0 && bouge(x, true))
            const repart = s.findIndex((x, i) => i > iB && !bouge(x, true)), revient = s.findIndex((x, i) => i > repart && repart >= 0 && !bouge(x, false))
            return { nom: pc.nom, eclatementPct: [part, arrive].map((i) => (i >= 0 ? Number(f2(p(s[i].y))) : null)), remontagePct: [repart, revient].map((i) => (i >= 0 ? Number(f2(p(s[i].y))) : null)) }
          })
          faits.push(`${F} : éclatement ${geste.eclatementPx} px (${pct(geste.plagesPct[0])} → ${pct(geste.plagesPct[1])}), remontage ${geste.remontagePx} px (${pct(geste.plagesPct[2])} → ${pct(geste.plagesPct[3])}) ; départs ${geste.pieces.map((x) => `${x.nom} ${f1(x.eclatementPct[0])}`).join(', ')} %`)
          if (geste.eclatementPx < 450) noter('EC-11', `${F} : l'éclatement tient en ${geste.eclatementPx} px de défilement, 450 au moins`)
          if (geste.remontagePx < 450) noter('EC-11', `${F} : le remontage tient en ${geste.remontagePx} px de défilement, 450 au moins`)
        }
      }
      rec.geste = geste
    }
    await fermer(o)
  }

  // EC-12 consigné en 1280×800
  {
    const o = await ouvrir(navA, { viewport: { width: 1280, height: 800 } })
    await o.page.waitForTimeout(1200)
    const m0 = await o.page.evaluate(scene, { y: null })
    if (m0.sec && m0.rendu) {
      const m = await o.page.evaluate(scene, { y: Math.round(m0.sec.haut + 0.6625 * (m0.sec.hauteur - 800)) })
      mesures.bureau['1280×800 sans carte'] = { aireC3: m.rendu ? (m.rendu.w * m.rendu.h) / (1280 * 800) : null, rendu: m.rendu }
      faits.push(`EC-12 : 1280×800, la scène couvre ${m.rendu ? pct((100 * m.rendu.w * m.rendu.h) / (1280 * 800)) : '—'} de l'écran à C3 (consigné)`)
    }
    await fermer(o)
  }

  // ── EC-2 sans JavaScript (ligne « Sans JavaScript » du §3.4 C) ─────────────────────────────────────────────────────────
  {
    const o = await ouvrir(navA, { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
    await o.page.waitForTimeout(1200)
    const m0 = await o.page.evaluate(scene, { y: null })
    if (!m0.sec || !m0.fig) noter('EC-2', 'sans JavaScript 1440×900 : figure.eclate introuvable')
    else {
      const y = Math.round(m0.sec.haut + 0.6625 * (m0.sec.hauteur - 900))
      // styles calculés (jugerCentre), puis la capture de la boîte du rendu comparée à celle avec JavaScript (trou (a), comparerSansJs)
      const mesurer = async () => { const m = await allerSansJs(o.page, y), c = await comparerSansJs(o.page, m); return { c, d: [...jugerCentre(m, 2, 'sans JavaScript 1440×900'), ...c.defauts] } }
      let r = await mesurer()
      if (r.d.length) { await o.page.waitForTimeout(2000); r = await mesurer() }
      for (const [id, t] of r.d) noter(id, t)
      mesures.sansJavaScript = r.c.releve
      const cr = r.c.releve
      faits.push(`sans JavaScript 1440×900, C3 : ${r.d.length ? `${r.d.length} défaut(s)` : 'éclatée, nommée, compteur « 03 », comme avec JavaScript'}${cr ? ` ; boîte du rendu capturée : écart moyen du gris ${f1(cr.ecartMoyen)} niveaux (≤ 12), écart-type ${f1(cr.ecartTypeSansJs)} contre ${f1(cr.ecartTypeAvecJs)} avec JavaScript (≥ 0,6 ×)` : ''}`)
    }
    await fermer(o)
  }

  // ── EC-6 : téléphone, mouvement réduit, hauteur 640 ──────────────────────────────────────────────────────────────────
  mesures.fixe = {}
  for (const [nomCtx, opts] of [['téléphone 390×844', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['mouvement réduit 1440×900', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }], ['1440×640', { viewport: { width: 1440, height: 640 } }]]) {
    const o = await ouvrir(navA, opts)
    const { page } = o
    const ih = opts.viewport.height
    await page.waitForTimeout(1200)
    const hTot = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y <= hTot; y += Math.round(ih / 2)) { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(120) }
    await repos(o, 1000)
    const placer = () => page.evaluate(() => { const f = document.querySelector('#etapes figure.eclate'); if (f) { const r = f.getBoundingClientRect(); scrollTo({ top: Math.max(0, r.top + scrollY - (innerHeight - r.height) / 2), behavior: 'instant' }) } })
    const jugerFixe = (m) => {
      const d = []
      if (!m.fig || !m.rendu) return [`${nomCtx} : figure.eclate ou div.eclate__rendu introuvable`]
      const rapport = m.fig.w / m.fig.h
      if (Math.abs(rapport / (4 / 3) - 1) > 0.01) d.push(`${nomCtx} : figure en ${f1(m.fig.w)} × ${f1(m.fig.h)} px (rapport ${rapport.toFixed(3)}, 4:3 ± 1 %)`)
      const repli = m.eclate[0]
      if (!repli || repli.op < 0.98) d.push(`${nomCtx} : eclate.avif ${repli ? `à ${f2(repli.op)}` : 'absente'} (≥ 0,98)`)
      const caches = [...m.assemble, ...m.calques].filter((i) => i.op > 0.02)
      if (caches.length) d.push(`${nomCtx} : ${caches.length} image(s) d'assemblage ou calque(s) affichée(s) (display:none attendu)`)
      const etVues = (m.etiquettes || []).filter((e) => e.op > 0.02)
      if (etVues.length) d.push(`${nomCtx} : ${etVues.length} étiquette(s) du bureau visible(s) (masquées attendues)`)
      const ps = m.pastilles || []
      if (JSON.stringify(ps.map((p) => p.texte)) !== JSON.stringify(['1', '2', '3', '4', '5'])) d.push(`${nomCtx} : pastilles « ${ps.map((p) => p.texte).join(', ') || 'aucune'} », « 1 » à « 5 » attendues`)
      ps.forEach((p, i) => {
        if (!p.b || p.b.w < 24 - 0.01 || p.b.h < 24 - 0.01) d.push(`${nomCtx} : pastille ${p.texte} de ${p.b ? `${f1(p.b.w)} × ${f1(p.b.h)}` : '—'} px (≥ 24 × 24)`)
        if (!(p.police >= 14)) d.push(`${nomCtx} : chiffre de la pastille ${p.texte} en ${f1(p.police)} px (≥ 14)`)
        if (p.op < 0.98) d.push(`${nomCtx} : pastille ${p.texte} à ${f2(p.op)} (≥ 0,98)`)
        const e = J.etiquettes[i]
        if (e && p.b) {
          const cx = p.b.l + p.b.w / 2, cy = p.b.t + p.b.h / 2, ax = m.rendu.l + ancre(e).x * m.rendu.w, ay = m.rendu.t + ancre(e).y * m.rendu.h
          if (Math.abs(cx - ax) > 2 || Math.abs(cy - ay) > 2) d.push(`${nomCtx} : pastille ${p.texte} centrée à (${f1(cx - m.rendu.l)} ; ${f1(cy - m.rendu.t)}) px, ancre de « ${e.texte} » à (${f1(ax - m.rendu.l)} ; ${f1(ay - m.rendu.t)}) ± 2`)
        }
      })
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (ps[i].b && ps[j].b && chevauche(ps[i].b, ps[j].b)) d.push(`${nomCtx} : pastilles ${ps[i].texte} et ${ps[j].texte} se chevauchent`)
      if (!m.legende) d.push(`${nomCtx} : ol.eclate__legende absente`)
      else {
        if (JSON.stringify(m.legende.items.map((x) => x.texte)) !== JSON.stringify(J.etiquettes.map((e) => e.texte))) d.push(`${nomCtx} : légende « ${m.legende.items.map((x) => x.texte).join(' | ')} » (les 5 textes d'eclate.json dans l'ordre)`)
        const petits = m.legende.items.filter((x) => !(x.police >= 14))
        if (petits.length) d.push(`${nomCtx} : ${petits.length} ligne(s) de légende sous 14 px`)
        if (m.legende.op < 0.98) d.push(`${nomCtx} : légende à ${f2(m.legende.op)} (≥ 0,98)`)
        if (m.legende.b && m.legende.b.t < m.fig.b - 1) d.push(`${nomCtx} : la légende commence à ${f1(m.legende.b.t)} px, au-dessus du bas de la figure (${f1(m.fig.b)} px)`)
      }
      if (m.sw > m.iw) d.push(`${nomCtx} : débordement horizontal (scrollWidth ${m.sw} > innerWidth ${m.iw})`)
      if ((m.animations || []).length) d.push(`${nomCtx} : ${m.animations.length} animation(s) dans la figure (${[...new Set(m.animations.map((a) => `${a.nom} sur ${a.cible}`))].slice(0, 2).join(', ')}) : rien ne doit bouger`)
      return d
    }
    // au téléphone, en plus des boîtes : le pixel sous chaque pastille (trou (b), sousLesPastilles)
    const auTel = nomCtx.startsWith('téléphone')
    let sous = null
    const juger6 = async (mm) => { const dd = jugerFixe(mm); if (auTel) { sous = await sousLesPastilles(page, mm, nomCtx); dd.push(...sous.defauts) } return dd }
    await placer(); await page.waitForTimeout(900); await imagesPretes(page)
    let m = await page.evaluate(scene, { y: null }), d = await juger6(m)
    if (d.length) { await page.waitForTimeout(2000); await placer(); await page.waitForTimeout(300); m = await page.evaluate(scene, { y: null }); d = await juger6(m) }
    await repos(o, 800)
    const ecl = [...new Set(o.requetes.filter((p) => /\/eclate\//.test(p)))].sort()
    if (JSON.stringify(ecl) !== JSON.stringify(['/eclate/eclate.avif'])) d.push(`${nomCtx} : requêtes d'eclate/ après défilement complet [${ecl.join(', ') || 'aucune'}], eclate.avif seule attendue`)
    for (const t of d) noter('EC-6', t)
    mesures.fixe[nomCtx] = { figure: m.fig, pastilles: m.pastilles, legende: m.legende, requetesEclate: ecl, scrollWidth: m.sw, innerWidth: m.iw, animations: m.animations, sousLesPastilles: sous ? sous.releve : undefined }
    faits.push(`EC-6 ${nomCtx} : figure ${m.fig ? `${f1(m.fig.w)} × ${f1(m.fig.h)} px` : '—'}, ${(m.pastilles || []).length} pastille(s), légende ${m.legende ? m.legende.items.length : 0} ligne(s), requêtes d'eclate/ [${ecl.join(', ') || 'aucune'}]${sous && sous.releve ? ` ; sous les pastilles, distance au fond rgb(${sous.releve.fond.join(', ')}) : ${sous.releve.pixels.map((x) => `${x.pastille} ${f1(x.distance)}`).join(', ')}` : ''}`)
    if (nomCtx.startsWith('téléphone')) { const f = path.join(PREUVE, 'eclate-tel.jpg'); await page.screenshot({ path: f, type: 'jpeg', quality: 88 }); await verifierImage(f, 'eclate-tel.jpg') }
    await fermer(o)
  }

  // ── EC-7 : rien d'eclate/ en haut de page ────────────────────────────────────────────────────────────────────────────
  {
    const compte = async () => { const o = await ouvrir(navA, { viewport: { width: 1440, height: 900 } }); await o.page.waitForTimeout(3000); const n = o.requetes.filter((p) => /\/eclate\//.test(p)); await fermer(o); return n }
    let n = await compte()
    if (n.length) { await attendre(2000); n = await compte() }
    faits.push(`EC-7 : 1440×900 en haut de page, ${n.length} requête(s) d'eclate/ 3 s après load`)
    if (n.length) noter('EC-7', `1440×900 à y = 0 : ${n.length} requête(s) d'eclate/ 3 s après load (${[...new Set(n)].join(', ')}), 0 attendue`)
  }

  // ── EC-8 : défilement continu, avec carte ────────────────────────────────────────────────────────────────────────────
  {
    const continu = async (serveur) => {
      const o = await ouvrir(navB, { viewport: { width: 1440, height: 900 } }, serveur)
      const { page } = o
      await page.waitForTimeout(2000)
      const m = await page.evaluate(scene, { y: null })
      if (!m.sec) { await fermer(o); return { erreur: '#etapes introuvable' } }
      const finY = Math.round(m.sec.haut + m.sec.hauteur)
      await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.max(0, Math.round(m.sec.haut - 900)))
      await page.mouse.move(720, 450)
      await page.waitForTimeout(1200)
      await page.evaluate(() => { window.__rafs = []; window.__rafOn = true; window.__t0 = performance.now(); const tic = (t) => { if (!window.__rafOn) return; window.__rafs.push(t); requestAnimationFrame(tic) }; requestAnimationFrame(tic) })
      let changements = 0, dernier = await page.evaluate(() => scrollY), pas = 0, arrive = false
      const t0 = Date.now()
      while (pas < 6000 && Date.now() - t0 < 180000) {
        await page.mouse.wheel(0, 5)
        const y = await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => ok(scrollY))))
        if (y !== dernier) { changements++; dernier = y }
        pas++
        if (y >= finY) { arrive = true; break }
      }
      const r = await page.evaluate(() => { window.__rafOn = false; const t = window.__rafs, iv = []; for (let i = 1; i < t.length; i++) iv.push(t[i] - t[i - 1]); return { iv, taches: (window.__taches || []).filter(([s]) => s >= window.__t0) } })
      await fermer(o)
      const s = [...r.iv].sort((a, b) => a - b)
      return { p95: s.length ? s[Math.floor(0.95 * (s.length - 1))] : null, taches: r.taches.length, tacheMax: r.taches.length ? Math.max(...r.taches.map((x) => x[1])) : 0, changements, pas, arrive, images: r.iv.length + 1 }
    }
    const rate = (x) => x.erreur || x.changements < 100 || x.taches > 0 || !(x.p95 <= 20)
    const essais = [await continu(srv)]
    if (rate(essais[0])) { await attendre(2000); essais.push(await continu(srv)) }
    mesures.continu = { essais }
    const dire = (x) => (x.erreur ? x.erreur : `p95 rAF ${f1(x.p95)} ms, ${x.taches} tâche(s) longue(s)${x.taches ? ` (max ${Math.round(x.tacheMax)} ms)` : ''}, ${x.changements} changements de scrollY en ${x.pas} crans${x.arrive ? '' : ', bas de #etapes non atteint'}`)
    faits.push(`EC-8 : ${essais.map(dire).join(' ; puis ')}`)
    if (essais.every(rate)) {
      srvRef = await servir(REF, entetes)
      const ref = await continu(srvRef)
      mesures.continu.reference = ref
      const x = essais[essais.length - 1]
      noter('EC-8', `${x.erreur ? x.erreur : x.changements < 100 ? `défilement non reçu (${x.changements} changements de scrollY, 100 au moins)` : `${x.taches} tâche(s) longue(s) (0) et p95 des intervalles rAF ${f1(x.p95)} ms (≤ 20)`} aux deux essais ; référence sans eclate dans les mêmes conditions : ${dire(ref)}${!rate(ref) ? '' : ' (la machine est peut-être trop chargée pour juger : rejouer)'}`)
    }
  }

  // ── PR : le film de la traversée ─────────────────────────────────────────────────────────────────────────────────────
  {
    const o = await ouvrir(navA, { viewport: { width: 1440, height: 900 } })
    const { page } = o
    await page.waitForTimeout(1500)
    const m = await page.evaluate(scene, { y: null })
    const FILM = path.join(T, 'film'), film = path.join(PREUVE, 'eclate-film.mp4')
    produites.push(film)
    if (!m.sec) noter('PR', 'film : #etapes introuvable')
    else {
      fs.mkdirSync(FILM, { recursive: true })
      const plage = m.sec.hauteur - 900
      for (let i = 0; i < 360; i++) {
        await page.evaluate(async (v) => { scrollTo({ top: v, behavior: 'instant' }); await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))) }, Math.round(m.sec.haut + (i / 359) * plage))
        if (i % 45 === 0) await imagesPretes(page)
        await page.screenshot({ path: path.join(FILM, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 82 })
      }
      const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', path.join(FILM, 'f%04d.jpg'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', film], { encoding: 'utf8', timeout: 300000 })
      const pr = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', film], { encoding: 'utf8' })
      const duree = Number(String(pr.stdout || '').trim())
      mesures.film = { octets: taille(film), duree }
      if (ff.status !== 0 || taille(film) <= 0) noter('PR', `film non produit (ffmpeg : ${derniere(ff.stderr).slice(0, 160) || `code ${ff.status}`})`)
      else if (!(Math.abs(duree - 12) <= 0.1)) noter('PR', `eclate-film.mp4 dure ${f2(duree)} s (12 ± 0,1)`)
      else {
        faits.push(`PR : eclate-film.mp4, ${taille(film)} octets, ${f2(duree)} s (à regarder : l'escalier s'ouvre pièce par pièce, se tient, se remonte ; la liste lisible à droite)`)
        try { const st = await sharp(path.join(FILM, 'f0180.jpg')).greyscale().stats(); if (st.channels[0].stdev < 8) noter('PR', `image du milieu du film unie (écart-type ${f1(st.channels[0].stdev)})`) } catch { /* image absente : déjà vue par ffmpeg */ }
      }
    }
    await fermer(o)
  }

  // ── CSP ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  mesures.journal = journal
  faits.push(`CSP : ${journal.csp.length} violation(s) ; ${journal.erreurs.length} exception(s) de page (consignées)`)
  if (journal.csp.length) noter('CSP', `${journal.csp.length} violation(s) : ${[...new Set(journal.csp)].slice(0, 2).join(' | ')}`)

  // ── EC-10 : Lighthouse ───────────────────────────────────────────────────────────────────────────────────────────────
  if (SAUTER.has('lighthouse')) noter('essai', 'EC-10 Lighthouse non lancé (--sauter)')
  else {
    const lhF = path.join(PREUVE, 'lighthouse.json')
    const lh = spawnSync(process.execPath, [path.join(R, 'scripts', 'lighthouse-mediane.mjs'), SITE, `--resume=${lhF}`], { cwd: R, encoding: 'utf8', timeout: 1500000, maxBuffer: 1 << 26 })
    const ligne = derniere(`${lh.stdout || ''}\n${lh.stderr || ''}`)
    produites.push(lhF)
    faits.push(`EC-10 : ${ligne.replace(/ — .*$/, '').slice(0, 200)}`)
    if (lh.status !== 0) noter('EC-10', `Lighthouse mobile (5 passes) : ${ligne.replace(/ — [^—]*$/, '').slice(0, 220) || `code ${lh.status}`}`)
  }

  // ── EC-16 : barre retenue et geste au repos, avec eclate active ──────────────────────────────────────────────────────
  if (SAUTER.has('ec16')) noter('essai', 'EC-16 non lancé (--sauter)')
  else {
    fs.mkdirSync(path.join(ARBRE, 'scripts'), { recursive: true })
    for (const s of ['nav-retenue-qa.mjs', 'signature-repos-qa.mjs']) fs.copyFileSync(path.join(R, 'scripts', s), path.join(ARBRE, 'scripts', s))
    const sr = spawnSync(process.execPath, [path.join(ARBRE, 'scripts', 'signature-repos-qa.mjs')], { cwd: ARBRE, encoding: 'utf8', timeout: 1200000, maxBuffer: 1 << 26 })
    const sortie = `${sr.stdout || ''}\n${sr.stderr || ''}`, ligne = derniere(sortie)
    const barre = /barre retenue : PASS/.test(sortie)
    faits.push(`EC-16 : signature-repos-qa (copie inchangée, eclate active) code ${sr.status} ; son point 7, nav-retenue-qa : ${barre ? 'PASS' : 'échec ou non lancé'}`)
    if (sr.status !== 0) noter('EC-16', `signature-repos-qa avec eclate active : ${ligne.slice(0, 260) || `code ${sr.status}`}`)
    const gelees = () => GELEES.filter((d) => (spawnSync('git', ['status', '--porcelain', '--', `public/sites-demo/${d}`], { cwd: R, encoding: 'utf8' }).stdout || '').trim())
    let modifiees = gelees()
    if (modifiees.length) { await attendre(2000); modifiees = gelees() }
    if (modifiees.length) noter('EC-16', `démo(s) gelée(s) modifiée(s) : ${modifiees.join(', ')}`)
  }

  // ── PR : les preuves de ce lancement ─────────────────────────────────────────────────────────────────────────────────
  for (const f of produites) {
    const s = (() => { try { return fs.statSync(f) } catch { return null } })()
    if (!s || s.size <= 0) noter('PR', `${path.basename(f)} absent ou vide`)
    else if (s.mtimeMs < DEBUT - 1000) noter('PR', `${path.basename(f)} n'a pas été écrit par ce lancement`)
  }
  faits.push(`à regarder : .orchestre/preuves/021-05/juge/ (eclate-c1..c4 en 1440x900 et 1088x800, eclate-tel.jpg, eclate-film.mp4)`)
}

try { await juger() } catch (e) { noter('juge', `interrompu : ${premiere(e)}`) } finally {
  for (const n of [navA, navB]) if (n) await n.close().catch(() => {})
  for (const s of [srv, srvRef]) if (s) await s.fermer().catch(() => {})
}
fin()
