// scripts/survol-qa.mjs — le juge de la tâche 021-06 : la révélation au survol des prestations de la démo Atelier Lestraque
// (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.3, §3.2, §5.2, §6.0 et §6.3 SV-1 à SV-16).
// Le site est généré dans deux copies sous .orchestre/travail/survol-qa-<pid>/ (supprimées à la sortie) : « survol »
// (--familles=<familles de da.json>,survol) et « référence » (--familles=<familles de da.json>, sans survol). Les deux sont
// servies en brotli avec les en-têtes de production (next.config.mjs). Chromium de Playwright, sans carte graphique, souris.
// Le juge capture, filme et mesure lui-même ; il ne lit rien de ce que livre l'exécutant hors des deux fichiers de la famille.
//
// Formats de bureau : 1440×900, 1280×800, 1088×800, dpr 2 (dpr exigé par SV-16), mouvement permis.
//   F     _kit/familles/survol.bureau.css et survol.js présents et non vides ; aucun survol.mjs (§3.3 « Fichiers »).
//   SV-1  mouse.move au centre du texte du h3 de la ligne k (k = 1 à 6), depuis un point hors de la liste ; fraction ouverte de
//         sa vignette relevée toutes les 25 ms : ≥ 0,90 en ≤ 250 ms après le premier pointermove reçu dans la ligne.
//   SV-2  vignette ouverte : largeur = min(24vw, 26rem) ± 2 px ; largeur/hauteur = 4/5 ± 1 %.
//   SV-3  suivi : curseur à +200 px en x, 10 pas sur 160 ms, dans le même titre, depuis une abscisse où départ et cible restent dans
//         les bornes ; bord gauche de la vignette : écart à la cible > 5 px 100 ms après l'arrêt, ≤ 2 px 1 000 ms après.
//   SV-4  balayage des six lignes (haut → bas puis bas → haut, 1,5 s chacun), relevé toutes les 25 ms : intersection de chaque
//         vignette visible avec chaque .presta__texte et avec le .presta__num de la ligne sous le curseur = 0 px² ; vignette
//         entièrement dans la boîte de #prestations.
//   SV-5  même balayage en 0,4 s : |rotation| ≤ 4°.
//   SV-6  ligne k → k+1 (k = 1 à 5) : fraction de k ≤ 0,05 en ≤ 250 ms ; 300 ms après le passage, une seule vignette > 0,5.
//   SV-7  clavier, 1440×900 : Tab jusqu'au 1er button.presta__declencheur : vignette ≥ 0,90 en ≤ 250 ms, immobile (relevés à 300
//         et 600 ms identiques ± 0,5 px), au-dessus de sa ligne ; Échap : ≤ 0,05 en ≤ 250 ms, focus toujours sur le bouton ; nom
//         accessible = texte du h3 ; Tab suivant : la vignette 2 s'ouvre (≥ 0,90 en ≤ 250 ms), la 1 se ferme (≤ 0,05 en ≤ 250 ms).
//   SV-8  nombre de a[href*="#contact"] dans #prestations (HTML généré et DOM vivant au bureau) = référence ; mesure des appels
//         visibles de nav-retenue-qa.mjs (fonction appelsVisibles, reprise telle quelle) sur la copie « survol », 1440×900 et
//         1280×800 : en haut un seul appel, le bouton du héros ; à #prestations et #realisations, la barre montre « Devis » seul ;
//         tous les 150 px, exactement un appel visible.
//   SV-9  réseau (1440×900, dpr 2, cache désactivé, CDP encodedDataLength) : avant l'approche, URL des images des vignettes =
//         référence ; section à moins d'un écran, sans souris : octets d'images de vignettes en plus de la référence ≤ 227 478 ;
//         le balayage n'ajoute aucune requête d'image.
//   SV-10 mouvement réduit (1440×900) : deux positions du curseur dans le même titre → vignette à la même place ± 0,5 px ; rotation
//         nulle ; ouverture ≥ 0,90 en ≤ 200 ms.
//   SV-11 téléphone 390×844, dpr 3, tactile : outerHTML de #prestations et requêtes identiques à la référence ; aucun
//         button.presta__declencheur.
//   SV-12 sans JavaScript, 1440×900 : survol d'une ligne → vignette ≥ 0,90 en ≤ 600 ms.
//   SV-13 CSS de la copie « survol » (règle de site-qa.mjs, jugerGeste) : ≥ 8 règles :hover ; aucune transition sur
//         width/height/top/left/padding/margin.
//   SV-14 addEventListener instrumenté avant la navigation : pointermove, scroll, wheel, touchmove en passive: true ; aucune boucle
//         rAF active 1 s après la sortie de la souris de la liste.
//   SV-15 400 ms après l'entrée du curseur dans une ligne (curseur immobile) : part de la surface des boîtes du texte du h3 survolé
//         (Range.getClientRects) couverte par la vignette ≤ 10 %, six lignes, trois formats.
//   SV-16 juste avant que la fraction ouverte atteigne 0,5 au premier survol : img.complete et largeur ≥ 691 px (dpr 2).
//   P     §5.2, famille seule contre la référence : bureau.css ≤ 6 000 octets en brotli 11 ; site.js ≤ +2 710 octets en brotli ;
//         styles.css ≤ +1 000 octets en brotli.
//   CSP   §6.0 et §5.3 : 0 violation (événement securitypolicyviolation ou message de console) ; aucune exception de page absente
//         de la référence.
//   PR    §6.0 et §6.10 : preuves écrites par le juge dans .orchestre/preuves/021-06/juge/ : mesures.json, survol-film-1440x900.mp4
//         et survol-film-1088x800.mp4 (balayage lent puis rapide, ~6 s), survol-clavier.jpg (focus sur la ligne 3) ; aucune de
//         0 octet, et l'image du milieu de chaque film n'est pas unie (écart-type du gris ≥ 8).
//
// Choix du juge (le cahier ne tranche pas) :
//   - « Familles déjà fusionnées » = lestraque.familles de da.json au moment du jugement (sans « survol ») ; --base=a,b la remplace.
//   - Fraction ouverte = part de l'aire de la boîte laissée par clip-path (inset ou polygon) × opacité effective (produit des
//     opacités jusqu'à la racine) ; 0 si la vignette ou un parent est display:none ou visibility:hidden.
//   - Géométrie d'une vignette : taille de mise en page (width/height calculés, sans transformation), centrée sur le centre de sa
//     boîte affichée (rotation autour du centre), réduite par son clip-path. SV-4 la prend SANS rotation : les bornes du §3.3 sont
//     écrites pour la boîte droite, et ±4° ajoutent au plus 15 px aux coins (calcul), bornés par SV-5 ; la couverture tournée est
//     consignée. SV-15 la prend AVEC rotation (ce que l'œil voit ; marge du cahier : 4,5 % au pire). Aire nulle = < 0,01 px² ;
//     « dans la section » à 0,5 px près (arrondis du sous-pixel).
//   - Une vignette est « visible » pour SV-4 et SV-5 dès que sa fraction dépasse 0,02.
//   - Les lignes sont placées avant chaque mesure : haut de la ligne k à 42 % de l'écran (SV-1, SV-3, SV-15, SV-16), à 30 % (SV-6),
//     pour que la ligne ait fini son dévoilement « monte » ; les balayages se font la liste juste sous la barre (la ligne 6 peut
//     y être encore en dévoilement : c'est ce que voit le visiteur).
//   - SV-16 : Chrome rend naturalWidth corrigé de la densité (345 pour le fichier 720w affiché sur 345,6 px, mesuré le 15/09) ; la
//     largeur jugée est celle du fichier servi (currentSrc), lue par sharp dans la copie. La section est d'abord approchée (à moins
//     d'un écran) et le premier survol vient 2 s plus tard : le préchargement à l'approche est ce que le cahier demande.
//   - SV-9 est mesuré à dpr 2, comme SV-16 (à dpr 1, la variante 480 suffit et le critère serait vide) ; « à moins d'un écran » =
//     haut de la section à une demi-hauteur d'écran sous le bas de l'écran.
//   - SV-7 : le point de départ du Tab est l'élément focalisable qui précède le 1er bouton dans l'ordre du document (focus sans
//     défilement) ; « au-dessus de sa ligne » = bas de la vignette ≤ haut de la ligne − 10 + 2 px, ou haut de la vignette au haut
//     de la section ± 2 px (borne du §3.3). Tab suivant : mêmes seuils que le premier focus et qu'Échap (§3.3 : blur ferme).
//   - SV-10 : « en opacité » = pendant l'ouverture, le clip-path laisse ≥ 99 % de la boîte.
//   - SV-11 : la requête de bureau.css est admise en plus (§3.0, §5.2 : « référence + 1 ») ; la classe vu posée par kit.js selon le
//     moment est retirée des deux outerHTML avant comparaison.
//   - SV-12 : la boîte de la vignette ouverte doit aussi être celle de la référence sans JavaScript ± 1 px (§3.3 : « inchangé »).
//   - SV-14 : passive = option objet { passive: true } explicite ; les écouteurs non passifs de la copie « survol » ne peuvent pas
//     être plus nombreux que ceux de la référence (kit.js en a déjà) ; avant la sortie, la souris reste 1,5 s immobile dans la
//     ligne (l'écart résiduel du suivi passe sous 0,5 px), puis les rAF demandés entre 1 s et 2 s après la sortie ne dépassent pas
//     ceux de la référence dans le même scénario.
//   - Un défaut sensible à la charge (délais de SV-1, SV-3, SV-6, SV-7, SV-10 et SV-12, image incomplète de SV-16, couverture de
//     SV-15) est remesuré jusqu'à deux fois, à 2 s d'intervalle, avant d'échouer ; SV-8 et SV-11 une fois. Un délai est interpolé
//     entre les deux relevés qui encadrent le seuil : sous charge, les relevés prévus toutes les 25 ms s'espacent.
//
// Contrôles à l'œil, non jugés ici (§6.10, Claude Code puis Benj) : survol-film-*.mp4 — l'aperçu glisse au-dessus des lignes avec
// du poids, ne cache jamais le titre lu ni un texte, change par un volet franc (comparer à survol-objet/apercus/reveal-hero-planche.jpg
// et survol-objet/prototype/presta-survol-1440.png) ; survol-clavier.jpg — aperçu au-dessus de la ligne 3, anneau de focus visible ;
// la rotation 0,02 × vitesse (« choix du cahier, à juger sur film »).
//
// Usage : node scripts/survol-qa.mjs [--base=a,b]
//   essai du juge par Claude Code sur une famille prototype : --sources=<copie de public/sites-demo> --preuves=<dossier>
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { R, DEMOS, generer, entetesProduction, servir, instrumentation, vignetteSansJs, polygone, aireCommune, aireRect, dans } from './lib/survol-banc.mjs'

const T = path.join(R, '.orchestre', 'travail', `survol-qa-${process.pid}`)
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* déjà parti */ } })
const argPreuves = process.argv.find((a) => a.startsWith('--preuves='))
const PREUVE = argPreuves ? path.resolve(argPreuves.slice('--preuves='.length)) : path.join(R, '.orchestre', 'preuves', '021-06', 'juge')
const FAM = path.join(DEMOS, '_kit', 'familles')
const FORMATS = [[1440, 900], [1280, 800], [1088, 800]]
const echecs = [], faits = [], mesures = { date: new Date().toISOString() }
const pb = {} // critère → liste de défauts, résumés en une entrée d'échec chacun
const noter = (id, texte) => { (pb[id] ||= []).push(texte) }
const fin = () => {
  for (const [id, l] of Object.entries(pb)) if (l.length) echecs.push(`${id} : ${l.slice(0, 4).join(' ; ')}${l.length > 4 ? ` (et ${l.length - 4} autre(s))` : ''}`)
  try { fs.mkdirSync(PREUVE, { recursive: true }); fs.writeFileSync(path.join(PREUVE, 'mesures.json'), JSON.stringify({ ...mesures, echecs, faits }, null, 1)) } catch { /* consigné plus bas */ }
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ révélation au survol : FAIL — ${echecs.join(' ; ')}` : '✓ révélation au survol : PASS — grand aperçu au-dessus de la ligne, amorti, jamais sur le titre lu ni sur un texte, préchargé à l\'approche, bouton au clavier, rien de neuf au téléphone ni sans JavaScript, barre retenue intacte')
  process.exitCode = echecs.length ? 1 : 0
}
const px = (v) => `${Math.round(v)} px`
const fmt = (w, h) => `${w}×${h}`
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }

// ── F : les fichiers de la famille ────────────────────────────────────────────────────────────────────────────────────
for (const f of ['survol.bureau.css', 'survol.js']) if (taille(path.join(FAM, f)) <= 0) noter('F', `_kit/familles/${f} absent ou vide`)
if (fs.existsSync(path.join(FAM, 'survol.mjs'))) noter('F', '_kit/familles/survol.mjs existe (aucun .mjs au §3.3)')

// ── génération des deux copies ────────────────────────────────────────────────────────────────────────────────────────
const argBase = process.argv.find((a) => a.startsWith('--base='))
let base = []
try { base = argBase ? argBase.slice(7).split(',').map((x) => x.trim()).filter(Boolean) : (JSON.parse(fs.readFileSync(path.join(DEMOS, '_kit', 'da.json'), 'utf8')).lestraque.familles || []) } catch (e) { echecs.push(`da.json illisible (${e.message})`); fin(); process.exit(1) }
base = base.filter((f) => f !== 'survol')
const SURV = path.join(T, 'survol'), REF = path.join(T, 'reference')
fs.mkdirSync(T, { recursive: true })
for (const [dossier, familles, nom] of [[SURV, [...base, 'survol'], 'survol'], [REF, base, 'référence']]) {
  const g = generer(dossier, familles)
  if (g.code !== 0) { echecs.push(`génération « ${nom} » (--familles=${familles.join(',')}) en échec : ${g.sortie.split('\n').pop().slice(0, 240)}`); fin(); process.exit(1) }
}
faits.push(`copies générées : survol (--familles=${[...base, 'survol'].join(',')}) et référence (--familles=${base.join(',')})`)

const lire = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
const sectionPresta = (html) => { const i = html.indexOf('id="prestations"'); if (i < 0) return ''; const d = html.lastIndexOf('<section', i); return html.slice(d, html.indexOf('</section>', i) + 10) }
const htmlS = lire(path.join(SURV, 'index.html')), htmlR = lire(path.join(REF, 'index.html'))
const presS = sectionPresta(htmlS), presR = sectionPresta(htmlR)
if (!presR) { echecs.push('#prestations introuvable dans l\'accueil généré'); fin(); process.exit(1) }
const decoder = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
const TITRES = [...presR.matchAll(/<h3>([\s\S]*?)<\/h3>/g)].map((m) => decoder(m[1]))
const URLS_VIGNETTES = new Set([...presR.matchAll(/srcset="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((c) => `/${c.trim().split(/\s+/)[0]}`)))
mesures.titres = TITRES

// ── SV-8 (HTML), SV-13, P ─────────────────────────────────────────────────────────────────────────────────────────────
const contactsHtml = (s) => (s.match(/<a\b[^>]*href="[^"]*#contact[^"]*"/g) || []).length
if (contactsHtml(presS) !== contactsHtml(presR)) noter('SV-8', `${contactsHtml(presS)} lien(s) vers #contact dans #prestations généré, ${contactsHtml(presR)} dans la référence`)
{
  const css = []
  const marcher = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) marcher(f); else if (/\.css$/i.test(e.name)) css.push(fs.readFileSync(f, 'utf8')) } }
  marcher(SURV)
  const tout = css.join('\n'), survols = (tout.match(/:hover/g) || []).length
  const fautes = [...tout.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, sel, decl]) => /transition\s*:[^;]*\b(width|height|top|left|padding(?:-\w+)?|margin(?:-\w+)?)\b/.test(decl) && !/etapes__liste::after|details-content/.test(sel)).map(([, sel]) => sel.trim().slice(0, 40))
  faits.push(`SV-13 : ${survols} règles :hover ; ${fautes.length} transition(s) de mise en page`)
  if (survols < 8) noter('SV-13', `${survols} règles :hover, 8 au moins`)
  if (fautes.length) noter('SV-13', `transition de mise en page : ${fautes.slice(0, 3).join(' · ')}`)
  const fam = lire(path.join(FAM, 'survol.bureau.css'))
  if (/(?:^|[;{\s])(?:transition|transition-property|will-change)\s*:[^;}]*\bfilter\b|@keyframes[^{]*\{[^@]*\bfilter\s*:/i.test(fam)) faits.push('§3.2 : survol.bureau.css anime filter (interdit au §3.2)')
}
{
  const br = (f) => (fs.existsSync(f) ? zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length : 0)
  const bureau = br(path.join(SURV, 'bureau.css')) - br(path.join(REF, 'bureau.css'))
  const js = br(path.join(SURV, 'site.js')) - br(path.join(REF, 'site.js')), styles = br(path.join(SURV, 'styles.css')) - br(path.join(REF, 'styles.css'))
  mesures.poids = { bureauCssBrotliEnPlus: bureau, siteJsBrotliEnPlus: js, stylesCssBrotliEnPlus: styles, bureauCssBrotli: br(path.join(SURV, 'bureau.css')) }
  faits.push(`P : brotli 11 en plus de la référence — bureau.css ${bureau} o (total ${br(path.join(SURV, 'bureau.css'))}), site.js ${js} o, styles.css ${styles} o`)
  if (br(path.join(SURV, 'bureau.css')) > 6000) noter('P', `bureau.css ${br(path.join(SURV, 'bureau.css'))} octets en brotli, 6 000 au plus`)
  if (js > 2710) noter('P', `site.js +${js} octets en brotli, +2 710 au plus`)
  if (styles > 1000) noter('P', `styles.css +${styles} octets en brotli, +1 000 au plus`)
}

// ── serveur, navigateur et gestes ─────────────────────────────────────────────────────────────────────────────────────
let entetes
try { entetes = await entetesProduction() } catch (e) { echecs.push(`en-têtes de production illisibles : ${e.message}`); fin(); process.exit(1) }
const srvS = await servir(SURV, entetes), srvR = await servir(REF, entetes)
const nav = await chromium.launch()
const journaux = { survol: { csp: [], erreurs: [] }, reference: { csp: [], erreurs: [] } }
const ouvertes = []

/** Un contexte et une page sur une copie ; instrumentation injectée avant la navigation (sauf JavaScript coupé). */
async function ouvrir(copie, options = {}) {
  const ctx = await nav.newContext({ reducedMotion: 'no-preference', ...options })
  const page = await ctx.newPage()
  const j = { images: [], enVol: 0, dernier: Date.now(), requetes: [] }
  if (options.javaScriptEnabled !== false) await page.addInitScript(instrumentation)
  page.on('pageerror', (e) => journaux[copie].erreurs.push(String(e.message).slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error' && /Content[- ]Security[- ]Policy/i.test(m.text())) journaux[copie].csp.push(m.text().slice(0, 160)) })
  ctx.on('request', (q) => { j.enVol++; j.dernier = Date.now(); const p = new URL(q.url()).pathname; j.requetes.push(p); if (q.resourceType() === 'image') j.images.push(p) })
  const finie = () => { j.enVol = Math.max(0, j.enVol - 1); j.dernier = Date.now() }
  ctx.on('requestfinished', finie); ctx.on('requestfailed', finie)
  const o = { ctx, page, j, copie }
  ouvertes.push(o)
  await page.goto(`${copie === 'survol' ? srvS.base : srvR.base}/index.html`, { waitUntil: 'load' })
  return o
}
async function fermer(o) {
  try { const csp = await o.page.evaluate(() => (window.__survol ? window.__survol.csp : [])); journaux[o.copie].csp.push(...csp) } catch { /* page sans JavaScript */ }
  await o.ctx.close().catch(() => {})
}
const repos = async (o, calme = 800, max = 12000) => { const t = Date.now(); while (Date.now() - t < max && !(o.j.enVol === 0 && Date.now() - o.j.dernier >= calme)) await o.page.waitForTimeout(100) }
const boites = (page) => page.evaluate(() => window.__survolBoites())
const defiler = async (page, y) => { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.max(0, Math.round(y))); await page.waitForTimeout(700) }
const hautDoc = (page, sel, k = null) => page.evaluate(([s, i]) => { const l = document.querySelectorAll(s), e = i === null ? l[0] : l[i]; return e ? e.getBoundingClientRect().top + scrollY : null }, [sel, k])
const LIGNES = '#prestations ol.presta > li.presta__ligne'
/** Haut de la ligne k à la fraction p de la hauteur de l'écran. */
async function placerLigne(page, k, p, h) { const y = await hautDoc(page, LIGNES, k); if (y === null) return false; await defiler(page, y - p * h); return true }
/** Centre du premier rectangle de texte du h3 de la ligne k. */
const centreTitre = (b, k) => { const m = b.lignes[k] && b.lignes[k].h3[0]; return m ? { x: (m.l + m.r) / 2, y: (m.t + m.b) / 2, mot: m } : null }
const neutre = (b, y) => ({ x: Math.max(2, b.liste.l / 2), y })
/** Relevés toutes les `pas` ms pendant `duree` ms, pendant qu'on joue `geste`. */
async function serie(page, duree, geste, pas = 25) {
  const p = page.evaluate(([d, s]) => window.__survolSerie(d, s), [duree, pas])
  await page.waitForTimeout(15)
  await geste()
  return p
}
/** Le curseur suit une ligne brisée en `duree` ms (un mouvement toutes les 16 ms). */
async function parcourir(page, pts, duree) {
  const segs = []; let L = 0
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push([pts[i - 1], pts[i], L, d]); L += d }
  const t0 = Date.now()
  for (;;) {
    const u = Math.min(1, (Date.now() - t0) / duree), s = u * L
    const [a, b, l0, d] = segs.find(([, , l0, d]) => s <= l0 + d + 1e-9) || segs[segs.length - 1]
    const k = d ? Math.min(1, (s - l0) / d) : 1
    await page.mouse.move(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)
    if (u >= 1) break
    await page.waitForTimeout(16)
  }
}
const instantEntree = (res, rect) => { const e = res.pointeurs.find((p) => dans(p, rect)); return e ? e.t : res.t0 }
const apres = (res, t) => res.echantillons.filter((s) => s.t >= t - 1)
const proche = (res, t) => res.echantillons.reduce((m, s) => (Math.abs(s.t - t) < Math.abs(m.t - t) ? s : m), res.echantillons[0])
/** Délai (ms après t0) où la fraction de la vignette k franchit le seuil, interpolé entre les deux relevés qui l'encadrent
 *  (sous charge, les relevés s'espacent : le premier relevé au-delà du seuil surestime le délai) ; null si jamais. */
const franchi = (res, t0, k, seuil, montant) => {
  const f = (s) => (s.v[k] ? s.v[k].f : 0), ok = (s) => (montant ? f(s) >= seuil : f(s) <= seuil), ech = res.echantillons
  const i = ech.findIndex((s) => s.t >= t0 - 1 && ok(s))
  if (i < 0) return null
  if (i === 0 || ok(ech[i - 1])) return Math.max(0, ech[i].t - t0)
  const a = ech[i - 1], b = ech[i], u = f(b) === f(a) ? 1 : Math.min(1, Math.max(0, (seuil - f(a)) / (f(b) - f(a))))
  return Math.max(0, a.t + u * (b.t - a.t) - t0)
}
/** Rejoue un essai tant qu'il reste un défaut sensible à la charge (troisième élément vrai), deux fois au plus, à 2 s d'intervalle. */
async function rejouer(page, essai) {
  let r = await essai()
  for (let i = 0; i < 2 && r.d.some((x) => x[2]); i++) { await page.waitForTimeout(2000); r = await essai() }
  return r
}
const gauche = (v) => v.cx - v.w / 2, haut = (v) => v.cy - v.h / 2
const largeursFichiers = new Map()
async function largeurFichier(src) {
  if (!src) return 0
  const p = decodeURIComponent(new URL(src).pathname)
  if (!largeursFichiers.has(p)) { let w = 0; try { w = (await sharp(fs.existsSync(path.join(SURV, p)) ? path.join(SURV, p) : path.join(DEMOS, p)).metadata()).width || 0 } catch { /* illisible */ } largeursFichiers.set(p, w) }
  return largeursFichiers.get(p)
}
const largeurAttendue = (page) => page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;width:min(24vw,26rem)'; document.body.appendChild(d); const v = parseFloat(getComputedStyle(d).width); d.remove(); return v })

try {
  // ── Bureau, trois formats : SV-1, SV-2, SV-15, SV-16, puis SV-3, SV-6, SV-4, SV-5 ────────────────────────────────────
  mesures.bureau = {}
  for (const [W, H] of FORMATS) {
    const F = fmt(W, H), m = (mesures.bureau[F] = { lignes: [] })
    const o = await ouvrir('survol', { viewport: { width: W, height: H }, deviceScaleFactor: 2 })
    const { page } = o
    await page.waitForTimeout(1500)
    const attendue = await largeurAttendue(page)
    const hautSec = await hautDoc(page, '#prestations')
    if (hautSec === null) { noter('SV-1', `${F} : #prestations introuvable`); await fermer(o); continue }
    // l'approche : la section à moins d'un écran, puis 2 s pour le préchargement
    await defiler(page, hautSec - 1.5 * H); await page.waitForTimeout(2000); await repos(o)

    for (let k = 0; k < 6; k++) {
      const essai = async () => {
        const d = []
        if (!(await placerLigne(page, k, 0.42, H))) return { d: [['SV-1', `${F} : ligne ${k + 1} introuvable`]], info: { ligne: k + 1 } }
        const b = await boites(page), c = centreTitre(b, k)
        if (!c) return { d: [['SV-1', `${F} : ligne ${k + 1} sans texte de h3`]], info: { ligne: k + 1 } }
        const n = neutre(b, c.y)
        await page.mouse.move(n.x, n.y); await page.waitForTimeout(700)
        const res = await serie(page, 750, () => page.mouse.move(c.x, c.y))
        const t0 = instantEntree(res, b.lignes[k].li), ech = apres(res, t0)
        const dt = franchi(res, t0, k, 0.9, true)
        if (dt === null || dt > 250) d.push(['SV-1', `${F} ligne ${k + 1} : ${dt === null ? 'jamais ≥ 0,90 en 750 ms' : `≥ 0,90 en ${Math.round(dt)} ms`} (≤ 250)`, true])
        const i5 = ech.findIndex((s) => s.v[k] && s.v[k].f >= 0.5)
        let net = null
        if (i5 < 0) d.push(['SV-16', `${F} ligne ${k + 1} : jamais ouverte à 0,5`, true])
        else {
          const s = ech[Math.max(0, i5 - 1)].v[k], w = await largeurFichier(s.img && s.img.src)
          net = { complet: !!(s.img && s.img.complet), largeur: w, fichier: s.img ? s.img.src.split('/').pop() : null }
          if (!net.complet || w < 691) d.push(['SV-16', `${F} ligne ${k + 1} : ${net.fichier || 'sans image'} de ${w} px${net.complet ? '' : ', incomplète'} juste avant 0,5 (complète et ≥ 691 px)`, !net.complet])
        }
        // les boîtes du titre relues après le survol : kit.css fait glisser le h3 survolé de 1,2 vw
        const mots = ((await boites(page)).lignes[k] || b.lignes[k]).h3
        const s4 = proche(res, t0 + 400), surf = mots.reduce((a, r) => a + aireRect(r), 0)
        let couv = 0
        for (const v of s4.v) if (v && v.f > 0.02) couv = Math.max(couv, mots.reduce((a, r) => a + aireCommune(polygone(v, true), r), 0) / (surf || 1))
        if (couv > 0.10) d.push(['SV-15', `${F} ligne ${k + 1} : ${(100 * couv).toFixed(1)} % du titre couvert à 400 ms (≤ 10 %)`, true])
        const der = ech.length ? ech[ech.length - 1].v[k] : null
        if (!der || der.f < 0.9) d.push(['SV-2', `${F} ligne ${k + 1} : vignette pas ouverte, taille non mesurable`])
        else {
          if (Math.abs(der.w - attendue) > 2) d.push(['SV-2', `${F} ligne ${k + 1} : largeur ${der.w.toFixed(1)} px, ${attendue.toFixed(1)} ± 2 attendu`])
          if (Math.abs(der.w / der.h / 0.8 - 1) > 0.01) d.push(['SV-2', `${F} ligne ${k + 1} : rapport ${(der.w / der.h).toFixed(3)}, 0,8 ± 1 % attendu`])
        }
        return { d, info: { ligne: k + 1, ouvertureMs: dt === null ? null : Math.round(dt), couverture: Number(couv.toFixed(4)), net, taille: der ? [Number(der.w.toFixed(1)), Number(der.h.toFixed(1))] : null } }
      }
      const r = await rejouer(page, essai)
      for (const [id, t] of r.d) noter(id, t)
      m.lignes.push(r.info)
    }
    faits.push(`${F} : ouverture ${m.lignes.map((l) => l.ouvertureMs ?? '—').join('/')} ms ; titre couvert ${m.lignes.map((l) => (l.couverture === undefined ? '—' : (100 * l.couverture).toFixed(1))).join('/')} % ; fichier d'image ${m.lignes.map((l) => (l.net ? l.net.largeur : '—')).join('/')} px ; taille ${m.lignes[0] && m.lignes[0].taille ? m.lignes[0].taille.join(' × ') : '—'} (attendu ${attendue.toFixed(1)} de large)`)

    // SV-3 : le suivi amorti, sur la ligne dont le titre laisse le plus de place à +200 px dans les bornes
    {
      const essai = async () => {
        let b = await boites(page)
        const xh3 = Math.min(...b.lignes.map((l) => (l.h3[0] ? l.h3[0].l : Infinity))), xT = Math.min(...b.lignes.map((l) => (l.texte ? l.texte.l : Infinity)))
        let choix = null
        b.lignes.forEach((l, k) => { const mt = l.h3[0]; if (!mt) return; const lo = Math.max(xh3 + attendue / 2, mt.l + 2), hi = Math.min(xT - 12 - attendue / 2 - 200, mt.r - 2 - 200); if (hi >= lo && (!choix || hi - lo > choix.hi - choix.lo)) choix = { k, lo, hi } })
        if (!choix) return { d: [['SV-3', `${F} : aucun titre ne laisse +200 px dans les bornes (xh3 ${px(xh3)}, .presta__texte ${px(xT)}, largeur ${px(attendue)})`]] }
        const k = choix.k
        await placerLigne(page, k, 0.42, H); b = await boites(page)
        const c = centreTitre(b, k), x0 = (choix.lo + choix.hi) / 2, n = neutre(b, c.y)
        await page.mouse.move(n.x, n.y); await page.waitForTimeout(500)
        await page.mouse.move(x0, c.y); await page.waitForTimeout(1500)
        const res = await serie(page, 1600, async () => { for (let i = 1; i <= 10; i++) { await page.mouse.move(x0 + 20 * i, c.y); if (i < 10) await page.waitForTimeout(16) } })
        const arret = [...res.pointeurs].reverse().find((p) => Math.abs(p.x - (x0 + 200)) < 1)
        if (!arret) return { d: [['SV-3', `${F} ligne ${k + 1} : mouvement du curseur non reçu par la page`, true]] }
        const v1 = proche(res, arret.t + 100).v[k], v2 = proche(res, arret.t + 1000).v[k]
        if (!v1 || !v2 || v2.f < 0.9) return { d: [['SV-3', `${F} ligne ${k + 1} : vignette pas ouverte pendant le suivi`, true]] }
        const cible = (v) => Math.max(xh3, Math.min(x0 + 200 - v.w / 2, xT - 12 - v.w))
        const e1 = Math.abs(gauche(v1) - cible(v1)), e2 = Math.abs(gauche(v2) - cible(v2)), d = []
        if (!(e1 > 5)) d.push(['SV-3', `${F} ligne ${k + 1} : écart ${e1.toFixed(1)} px 100 ms après l'arrêt (> 5 attendu : suivi amorti)`, true])
        if (!(e2 <= 2)) d.push(['SV-3', `${F} ligne ${k + 1} : écart ${e2.toFixed(1)} px 1 000 ms après l'arrêt (≤ 2)`, true])
        return { d, info: { ligne: k + 1, depart: Math.round(x0), cible: Math.round(cible(v2)), ecart100: Number(e1.toFixed(2)), ecart1000: Number(e2.toFixed(2)) } }
      }
      const r = await rejouer(page, essai)
      for (const [id, t] of r.d) noter(id, t)
      m.suivi = r.info || null
      if (r.info) faits.push(`${F} : suivi sur la ligne ${r.info.ligne}, écart à la cible ${r.info.ecart100} px à 100 ms puis ${r.info.ecart1000} px à 1 s`)
    }

    // SV-6 : d'une ligne à la suivante
    m.passages = []
    for (let k = 0; k < 5; k++) {
      const essai = async () => {
        await placerLigne(page, k, 0.30, H)
        const b = await boites(page), a = centreTitre(b, k), c = centreTitre(b, k + 1)
        if (!a || !c) return { d: [['SV-6', `${F} ${k + 1}→${k + 2} : titre non mesurable`]], info: { de: k + 1 } }
        const n = neutre(b, a.y)
        await page.mouse.move(n.x, n.y); await page.waitForTimeout(500)
        await page.mouse.move(a.x, a.y); await page.waitForTimeout(800)
        const res = await serie(page, 700, () => page.mouse.move(c.x, c.y))
        const t0 = instantEntree(res, b.lignes[k + 1].li), ech = apres(res, t0)
        const dt = franchi(res, t0, k, 0.05, false)
        const ouv = proche(res, t0 + 300).v.map((v, i) => (v && v.f > 0.5 ? i + 1 : 0)).filter(Boolean), d = []
        if (dt === null || dt > 250) d.push(['SV-6', `${F} ${k + 1}→${k + 2} : ligne ${k + 1} ${dt === null ? 'jamais ≤ 0,05 en 700 ms' : `≤ 0,05 en ${Math.round(dt)} ms`} (≤ 250)`, true])
        if (ouv.length !== 1) d.push(['SV-6', `${F} ${k + 1}→${k + 2} : ${ouv.length} vignette(s) > 0,5 à 300 ms (${ouv.join(', ') || 'aucune'}), une seule attendue`, true])
        return { d, info: { de: k + 1, fermetureMs: dt === null ? null : Math.round(dt), ouvertesA300: ouv } }
      }
      const r = await rejouer(page, essai)
      for (const [id, t] of r.d) noter(id, t)
      m.passages.push(r.info)
    }
    faits.push(`${F} : passages de ligne, fermeture ${m.passages.map((p) => p.fermetureMs ?? '—').join('/')} ms`)

    // SV-4 et SV-5 : balayages, la liste juste sous la barre
    {
      const olHaut = await hautDoc(page, '#prestations ol.presta'), barre = (await boites(page)).barre
      await defiler(page, olHaut - (barre ? barre.b : 0) - 16)
      const b = await boites(page)
      const pts = b.lignes.map((l, i) => { const mt = l.h3[0]; return mt ? { x: mt.l + (i % 2 ? 0.75 : 0.25) * (mt.r - mt.l), y: (mt.t + mt.b) / 2 } : null }).filter(Boolean)
      if (pts.length < 6) noter('SV-4', `${F} : ${pts.length} titres mesurables sur 6`)
      else {
        const balayer = async (duree) => {
          const n = neutre(b, pts[0].y)
          await page.mouse.move(n.x, n.y); await page.waitForTimeout(400)
          await page.mouse.move(pts[0].x, pts[0].y); await page.waitForTimeout(700)
          return serie(page, 2 * duree + 900, async () => { await parcourir(page, pts, duree); await parcourir(page, [...pts].reverse(), duree) })
        }
        const lent = await balayer(1500), vite = await balayer(400)
        let inter = 0, interTourne = 0, hors = 0, vus = 0, rotLent = 0, rotVite = 0
        const exemples = []
        for (const s of lent.echantillons) {
          const cur = [...lent.pointeurs].reverse().find((p) => p.t <= s.t)
          const kc = cur ? Math.max(0, b.lignes.findIndex((l) => dans(cur, l.li))) : 0
          const interdites = [...b.lignes.map((l) => l.texte), b.lignes[kc].num]
          s.v.forEach((v, i) => {
            if (!v || v.f <= 0.02) return
            vus++; rotLent = Math.max(rotLent, Math.abs(v.a))
            const poly = polygone(v, false), a = interdites.reduce((x, r) => x + aireCommune(poly, r), 0)
            interTourne = Math.max(interTourne, interdites.reduce((x, r) => x + aireCommune(polygone(v, true), r), 0))
            if (a >= 0.01) { inter = Math.max(inter, a); if (exemples.length < 3) exemples.push(`vignette ${i + 1} sur ${Math.round(a)} px² (curseur ligne ${kc + 1})`) }
            const sec = b.section
            if (poly.some(([x, y]) => x < sec.l - 0.5 || x > sec.r + 0.5 || y < sec.t - 0.5 || y > sec.b + 0.5)) { hors++; if (exemples.length < 3) exemples.push(`vignette ${i + 1} hors de #prestations`) }
          })
        }
        for (const s of vite.echantillons) for (const v of s.v) if (v && v.f > 0.02) rotVite = Math.max(rotVite, Math.abs(v.a))
        m.balayage = { echantillonsLent: lent.echantillons.length, echantillonsVite: vite.echantillons.length, vignettesVues: vus, intersectionMaxPx2: Number(inter.toFixed(2)), intersectionTourneeMaxPx2: Number(interTourne.toFixed(2)), horsSection: hors, rotationMaxLent: Number(rotLent.toFixed(2)), rotationMaxVite: Number(rotVite.toFixed(2)) }
        faits.push(`${F} : balayage lent, ${lent.echantillons.length} relevés, ${vus} vignettes visibles, intersection max ${inter.toFixed(1)} px² (${interTourne.toFixed(1)} px² avec la rotation), ${hors} hors section ; rotation max ${rotLent.toFixed(2)}° lent, ${rotVite.toFixed(2)}° rapide`)
        if (inter >= 0.01 || hors) noter('SV-4', `${F} : ${exemples.join(', ')} (0 px² et dans la section attendus)`)
        if (rotVite > 4 + 1e-6 || rotLent > 4 + 1e-6) noter('SV-5', `${F} : rotation ${Math.max(rotVite, rotLent).toFixed(2)}° (≤ 4°)`)
      }
    }

    await fermer(o)
  }

  // ── SV-9 et SV-14 : réseau, écouteurs et rAF, 1440×900, dpr 2, le même scénario sur les deux copies ──────────────────────
  const reseau = {}
  for (const copie of ['reference', 'survol']) {
    const ctx = await nav.newContext({ reducedMotion: 'no-preference', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    const page = await ctx.newPage()
    const o = { ctx, page, j: { enVol: 0, dernier: Date.now(), images: [], requetes: [] }, copie }
    ouvertes.push(o)
    await page.addInitScript(instrumentation)
    page.on('pageerror', (e) => journaux[copie].erreurs.push(String(e.message).slice(0, 160)))
    ctx.on('request', () => { o.j.enVol++; o.j.dernier = Date.now() })
    const finie = () => { o.j.enVol = Math.max(0, o.j.enVol - 1); o.j.dernier = Date.now() }
    ctx.on('requestfinished', finie); ctx.on('requestfailed', finie)
    const cdp = await ctx.newCDPSession(page), url = new Map(), octets = new Map()
    cdp.on('Network.requestWillBeSent', (e) => { if (e.type === 'Image') url.set(e.requestId, new URL(e.request.url).pathname) })
    cdp.on('Network.loadingFinished', (e) => { if (url.has(e.requestId)) octets.set(e.requestId, e.encodedDataLength) })
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await page.goto(`${copie === 'survol' ? srvS.base : srvR.base}/index.html`, { waitUntil: 'load' })
    await page.waitForTimeout(2500); await repos(o, 1000)
    const avant = [...new Set([...url.values()].filter((u) => URLS_VIGNETTES.has(u)))].sort()
    const octetsVignettes = () => [...octets].filter(([id]) => URLS_VIGNETTES.has(url.get(id))).reduce((a, [, n]) => a + n, 0)
    await defiler(page, (await hautDoc(page, '#prestations')) - 1.5 * 900); await page.waitForTimeout(2500); await repos(o, 1000)
    const approche = octetsVignettes()
    const sizes = await page.evaluate(() => { const s = document.querySelector('#prestations .presta__vignette source'); return s ? s.getAttribute('sizes') : null })
    await defiler(page, (await hautDoc(page, '#prestations ol.presta')) - 94); await repos(o, 1000)
    const b = await boites(page), nAvant = url.size
    const pts = b.lignes.map((l, i) => { const mt = l.h3[0]; return mt ? { x: mt.l + (i % 2 ? 0.75 : 0.25) * (mt.r - mt.l), y: (mt.t + mt.b) / 2 } : null }).filter(Boolean)
    if (pts.length) { await page.mouse.move(pts[0].x, pts[0].y); await parcourir(page, pts, 1500); await parcourir(page, [...pts].reverse(), 1500) }
    await page.waitForTimeout(1000); await repos(o, 800)
    const ajout = [...url.values()].slice(nAvant)
    // SV-14 : 1,5 s immobile dans la ligne 3, sortie de la liste, puis les rAF entre 1 et 2 s après
    const c3 = centreTitre(b, 2) || pts[0] || { x: 400, y: 400 }
    await page.mouse.move(c3.x, c3.y); await page.waitForTimeout(1500)
    const nn = neutre(b, c3.y); await page.mouse.move(nn.x, nn.y); await page.waitForTimeout(1000)
    const raf0 = await page.evaluate(() => window.__survol.raf); await page.waitForTimeout(1000)
    const raf1 = await page.evaluate(() => window.__survol.raf)
    reseau[copie] = { avant, approche, sizes, ajout, raf: raf1 - raf0, ecouteurs: await page.evaluate(() => window.__survol.ecouteurs), total: octetsVignettes() }
    await fermer(o)
  }
  {
    const rs = reseau.survol, rr = reseau.reference
    mesures.reseau = reseau
    const enPlus = rs.approche - rr.approche
    faits.push(`SV-9 : avant l'approche ${rs.avant.length} image(s) de vignette (référence ${rr.avant.length}) ; à l'approche ${rs.approche} octets contre ${rr.approche} (+${enPlus}) ; sizes « ${rs.sizes} » ; le balayage ajoute ${rs.ajout.length} requête(s) d'image`)
    if (JSON.stringify(rs.avant) !== JSON.stringify(rr.avant)) noter('SV-9', `avant l'approche, images des vignettes [${rs.avant.join(', ') || 'aucune'}] contre [${rr.avant.join(', ') || 'aucune'}] dans la référence`)
    if (enPlus > 227478) noter('SV-9', `+${enPlus} octets d'images de vignettes à l'approche (≤ 227 478)`)
    if (rs.ajout.length) noter('SV-9', `le balayage ajoute ${rs.ajout.length} requête(s) d'image (${rs.ajout.slice(0, 3).join(', ')})`)
    const nonPassifs = (l) => l.filter((e) => !e.passive).map((e) => `${e.type}@${e.cible}`)
    const reste = nonPassifs(rr.ecouteurs), nouveaux = []
    for (const e of nonPassifs(rs.ecouteurs)) { const i = reste.indexOf(e); if (i >= 0) reste.splice(i, 1); else nouveaux.push(e) }
    faits.push(`SV-14 : ${rs.ecouteurs.length} écouteurs pointermove/scroll/wheel/touchmove (${nonPassifs(rs.ecouteurs).length} non passifs, référence ${nonPassifs(rr.ecouteurs).length}) ; rAF demandés entre 1 et 2 s après la sortie : ${rs.raf} (référence ${rr.raf})`)
    if (nouveaux.length) noter('SV-14', `écouteur(s) sans passive: true ajouté(s) : ${nouveaux.join(', ')}`)
    if (rs.raf > rr.raf) noter('SV-14', `${rs.raf} rAF demandés entre 1 et 2 s après la sortie de la liste (référence ${rr.raf}) : boucle encore active`)
  }

  // ── SV-7 : clavier, 1440×900 ────────────────────────────────────────────────────────────────────────────────────────
  {
    const o = await ouvrir('survol', { viewport: { width: 1440, height: 900 } })
    const { page } = o
    await page.waitForTimeout(1500)
    const cdp = await o.ctx.newCDPSession(page)
    const actif = () => page.evaluate(() => [...document.querySelectorAll('#prestations button.presta__declencheur')].indexOf(document.activeElement))
    const evenement = (liste, t, filtre) => page.evaluate(([l, t0, f]) => window.__survol[l].find((e) => e.t >= t0 && Object.entries(f).every(([k, v]) => e[k] === v)), [liste, t, filtre])
    const essai = async () => {
      const d = [], info = {}
      await placerLigne(page, 0, 0.42, 900)
      let b = await boites(page)
      await page.mouse.move(2, b.lignes[0] ? (b.lignes[0].li.t + b.lignes[0].li.b) / 2 : 450); await page.waitForTimeout(500)
      info.boutons = await page.evaluate(() => document.querySelectorAll('#prestations button.presta__declencheur').length)
      if (info.boutons !== 6) d.push(['SV-7', `${info.boutons} button.presta__declencheur dans #prestations, 6 attendus`])
      if (!info.boutons) return { d, info }
      await page.evaluate(() => {
        const premier = document.querySelector('#prestations button.presta__declencheur')
        const avant = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')].filter((e) => e.tabIndex >= 0 && !e.disabled && e.getClientRects().length && (e.compareDocumentPosition(premier) & Node.DOCUMENT_POSITION_FOLLOWING))
        if (avant.length) avant[avant.length - 1].focus({ preventScroll: true })
      })
      await page.keyboard.press('Tab')
      for (let i = 0; i < 12 && (await actif()) !== 0; i++) await page.keyboard.press('Tab')
      if ((await actif()) !== 0) { d.push(['SV-7', 'la touche Tab n\'atteint pas le 1er button.presta__declencheur']); return { d, info } }
      await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(800)
      b = await boites(page)
      // focus
      const r1 = await serie(page, 800, () => page.keyboard.press('Tab'))
      const f1 = await evenement('focus', r1.t0, { rang: 0 }), t1 = f1 ? f1.t : r1.t0
      const dt1 = franchi(r1, t1, 0, 0.9, true)
      info.ouvertureMs = dt1 === null ? null : Math.round(dt1)
      if (dt1 === null || dt1 > 250) d.push(['SV-7', `au focus : ${dt1 === null ? 'jamais ≥ 0,90 en 800 ms' : `≥ 0,90 en ${Math.round(dt1)} ms`} (≤ 250)`, true])
      const a3 = proche(r1, t1 + 300).v[0], a6 = proche(r1, t1 + 600).v[0]
      if (a3 && a6 && a6.f >= 0.9) {
        info.deplacement = [Number(Math.abs(gauche(a3) - gauche(a6)).toFixed(2)), Number(Math.abs(haut(a3) - haut(a6)).toFixed(2))]
        if (info.deplacement[0] > 0.5 || info.deplacement[1] > 0.5) d.push(['SV-7', `au focus, la vignette bouge de ${info.deplacement.join(' × ')} px entre 300 et 600 ms (± 0,5)`, true])
        const li = b.lignes[0].li, bas = haut(a6) + a6.h
        if (!(bas <= li.t - 10 + 2 || Math.abs(haut(a6) - b.section.t) <= 2)) d.push(['SV-7', `au focus, vignette de ${px(haut(a6))} à ${px(bas)} pour une ligne dont le haut est à ${px(li.t)} : pas au-dessus de sa ligne`])
      }
      // Échap
      const r2 = await serie(page, 500, () => page.keyboard.press('Escape'))
      const k2 = await evenement('touches', r2.t0, { touche: 'Escape' }), t2 = k2 ? k2.t : r2.t0
      const dt2 = franchi(r2, t2, 0, 0.05, false)
      info.echapMs = dt2 === null ? null : Math.round(dt2)
      if (dt2 === null || dt2 > 250) d.push(['SV-7', `Échap : ${dt2 === null ? 'jamais ≤ 0,05 en 500 ms' : `≤ 0,05 en ${Math.round(dt2)} ms`} (≤ 250)`, true])
      if ((await actif()) !== 0) d.push(['SV-7', 'après Échap, le focus n\'est plus sur le bouton'])
      // nom accessible
      try {
        await cdp.send('Accessibility.enable').catch(() => {})
        const { root } = await cdp.send('DOM.getDocument', { depth: 0 })
        const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '#prestations button.presta__declencheur' })
        const ax = await cdp.send('Accessibility.getPartialAXTree', { nodeId: nodeIds[0], fetchRelatives: false })
        info.nomAccessible = String(((ax.nodes.find((nd) => !nd.ignored) || ax.nodes[0] || {}).name || {}).value || '').replace(/\s+/g, ' ').trim()
      } catch (e) { info.nomAccessible = `illisible (${e.message})` }
      if (info.nomAccessible !== TITRES[0]) d.push(['SV-7', `nom accessible « ${info.nomAccessible} », « ${TITRES[0]} » attendu`])
      // Tab suivant
      const r3 = await serie(page, 800, () => page.keyboard.press('Tab'))
      const f3 = await evenement('focus', r3.t0, { rang: 1 }), t3 = f3 ? f3.t : r3.t0
      if (!f3) d.push(['SV-7', 'Tab suivant : le focus ne va pas au 2e bouton'])
      const o3 = franchi(r3, t3, 1, 0.9, true), c3 = franchi(r3, t3, 0, 0.05, false)
      if (o3 === null || o3 > 250) d.push(['SV-7', `Tab suivant : vignette 2 ${o3 !== null ? `≥ 0,90 en ${Math.round(o3)} ms` : 'jamais ≥ 0,90'} (≤ 250)`, true])
      if (c3 === null || c3 > 250) d.push(['SV-7', `Tab suivant : vignette 1 ${c3 !== null ? `≤ 0,05 en ${Math.round(c3)} ms` : 'jamais refermée'} (≤ 250)`, true])
      // l'image à regarder : focus sur la ligne 3
      await page.keyboard.press('Tab'); await page.waitForTimeout(900)
      if ((await actif()) === 2) { fs.mkdirSync(path.join(T, 'preuves'), { recursive: true }); await page.screenshot({ path: path.join(T, 'preuves', 'survol-clavier.jpg'), type: 'jpeg', quality: 88 }) }
      return { d, info }
    }
    const r = await rejouer(page, essai)
    for (const [id, t] of r.d) noter(id, t)
    mesures.clavier = r.info
    faits.push(`SV-7 : ${r.info.boutons} bouton(s) ; focus ${r.info.ouvertureMs ?? '—'} ms ; Échap ${r.info.echapMs ?? '—'} ms ; nom accessible « ${r.info.nomAccessible ?? '—'} »`)
    await fermer(o)
  }

  // ── SV-10 : mouvement réduit, souris, 1440×900 ──────────────────────────────────────────────────────────────────────────
  {
    const o = await ouvrir('survol', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const { page } = o
    await page.waitForTimeout(1500)
    const essai = async () => {
      const d = [], info = {}
      await placerLigne(page, 2, 0.42, 900)
      const b = await boites(page), c = centreTitre(b, 2)
      if (!c) return { d: [['SV-10', 'titre de la ligne 3 non mesurable']], info }
      const x1 = c.mot.l + 0.2 * (c.mot.r - c.mot.l), x2 = Math.min(c.mot.r - 2, x1 + 150), n = neutre(b, c.y)
      await page.mouse.move(n.x, n.y); await page.waitForTimeout(700)
      const r1 = await serie(page, 700, () => page.mouse.move(x1, c.y))
      const t0 = instantEntree(r1, b.lignes[2].li), ech = apres(r1, t0)
      const dt = franchi(r1, t0, 2, 0.9, true)
      info.ouvertureMs = dt === null ? null : Math.round(dt)
      if (dt === null || dt > 200) d.push(['SV-10', `ouverture ${dt === null ? 'jamais ≥ 0,90 en 700 ms' : `≥ 0,90 en ${Math.round(dt)} ms`} (≤ 200)`, true])
      if (ech.some((s) => s.v[2] && s.v[2].op > 0.02 && s.v[2].part < 0.99)) d.push(['SV-10', 'ouverture par le clip-path, pas en opacité'])
      const p1 = ech.length ? ech[ech.length - 1].v[2] : null
      const r2 = await serie(page, 700, () => page.mouse.move(x2, c.y))
      const p2 = r2.echantillons[r2.echantillons.length - 1].v[2]
      info.rotationMax = Math.max(0, ...[...r1.echantillons, ...r2.echantillons].flatMap((s) => s.v.filter((v) => v && v.f > 0.02).map((v) => Math.abs(v.a))))
      if (info.rotationMax >= 0.01) d.push(['SV-10', `rotation ${info.rotationMax.toFixed(2)}° en mouvement réduit (nulle attendue)`])
      if (!p1 || !p2 || p1.f < 0.9 || p2.f < 0.9) d.push(['SV-10', 'vignette pas ouverte aux deux positions du curseur', true])
      else {
        info.deplacement = [Number(Math.abs(gauche(p1) - gauche(p2)).toFixed(2)), Number(Math.abs(haut(p1) - haut(p2)).toFixed(2))]
        if (info.deplacement[0] > 0.5 || info.deplacement[1] > 0.5) d.push(['SV-10', `la vignette suit le curseur (${info.deplacement.join(' × ')} px pour 150 px de curseur, ± 0,5)`])
      }
      return { d, info }
    }
    const r = await rejouer(page, essai)
    for (const [id, t] of r.d) noter(id, t)
    mesures.mouvementReduit = r.info
    faits.push(`SV-10 : ouverture ${r.info.ouvertureMs ?? '—'} ms, rotation max ${r.info.rotationMax === undefined ? '—' : r.info.rotationMax.toFixed(2)}°, déplacement ${r.info.deplacement ? r.info.deplacement.join(' × ') : '—'} px`)
    await fermer(o)
  }

  // ── SV-11 : téléphone 390×844 ───────────────────────────────────────────────────────────────────────────────────────
  {
    const tel = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    const oS = await ouvrir('survol', tel), oR = await ouvrir('reference', tel)
    const releve = async (o) => {
      await o.page.waitForTimeout(1500)
      await defiler(o.page, (await hautDoc(o.page, '#prestations')) - 60); await o.page.waitForTimeout(1500); await repos(o, 1000)
      return { html: await o.page.evaluate(() => { const s = document.querySelector('#prestations'); return s ? s.outerHTML : '' }), requetes: [...new Set(o.j.requetes)].sort(), boutons: await o.page.evaluate(() => document.querySelectorAll('button.presta__declencheur').length) }
    }
    const norm = (h) => h.replace(/class="([^"]*)"/g, (x, c) => `class="${c.split(/\s+/).filter((k) => k && k !== 'vu').join(' ')}"`)
    let s = await releve(oS), r = await releve(oR)
    const ecarts = () => {
      const d = [], a = norm(s.html), b = norm(r.html)
      if (a !== b) { let i = 0; while (i < a.length && a[i] === b[i]) i++; d.push(`outerHTML de #prestations différent de la référence à partir de « ${a.slice(Math.max(0, i - 20), i + 50)} » (référence « ${b.slice(Math.max(0, i - 20), i + 50)} »)`) }
      const plus = s.requetes.filter((u) => !r.requetes.includes(u) && !/\/bureau\.css$/.test(u)), moins = r.requetes.filter((u) => !s.requetes.includes(u))
      if (plus.length || moins.length) d.push(`requêtes en plus [${plus.slice(0, 3).join(', ')}], en moins [${moins.slice(0, 3).join(', ')}]`)
      if (s.boutons) d.push(`${s.boutons} button.presta__declencheur au téléphone`)
      return d
    }
    let d = ecarts()
    if (d.length) { await oS.page.waitForTimeout(2000); s = await releve(oS); r = await releve(oR); d = ecarts() }
    for (const t of d) noter('SV-11', t)
    faits.push(`SV-11 : téléphone, #prestations ${norm(s.html) === norm(r.html) ? 'identique' : 'différent'} ; ${s.requetes.length} URL demandées (référence ${r.requetes.length}) ; ${s.boutons} bouton(s)`)
    await fermer(oS); await fermer(oR)
  }

  // ── SV-12 : sans JavaScript, 1440×900 ───────────────────────────────────────────────────────────────────────────────
  {
    const sansJs = { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }
    const oS = await ouvrir('survol', sansJs), oR = await ouvrir('reference', sansJs)
    const survoler = async (o) => {
      const { page } = o
      await page.waitForTimeout(800)
      const y = await hautDoc(page, LIGNES, 2)
      if (y === null) return null
      await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.round(y - 0.42 * 900)); await page.waitForTimeout(600)
      const c = await page.evaluate(() => { const h3 = document.querySelectorAll('#prestations ol.presta > li.presta__ligne h3')[2]; if (!h3) return null; const rg = document.createRange(); rg.selectNodeContents(h3); const x = rg.getClientRects()[0]; return x ? { x: (x.left + x.right) / 2, y: (x.top + x.bottom) / 2 } : null })
      if (!c) return null
      await page.mouse.move(2, c.y); await page.waitForTimeout(700)
      await page.mouse.move(c.x, c.y)
      const t0 = Date.now(); let dt = null, der = null
      while (Date.now() - t0 < 900) { der = await page.evaluate(vignetteSansJs, 2); if (dt === null && der.f >= 0.9) dt = Date.now() - t0; await page.waitForTimeout(25) }
      return { dt, boite: der && der.boite }
    }
    const juger = (s, r) => {
      const d = []
      if (!s || s.dt === null || s.dt > 600) d.push(`vignette de la ligne 3 ${!s ? 'introuvable' : s.dt === null ? 'jamais ≥ 0,90 en 900 ms' : `≥ 0,90 en ${s.dt} ms`} (≤ 600)`)
      else if (r && r.boite && s.boite && ['l', 't', 'r', 'b'].some((k) => Math.abs(s.boite[k] - r.boite[k]) > 1)) d.push(`vignette ouverte en ${['l', 't', 'r', 'b'].map((k) => Math.round(s.boite[k])).join(', ')} contre ${['l', 't', 'r', 'b'].map((k) => Math.round(r.boite[k])).join(', ')} dans la référence (± 1 px : survol CSS inchangé)`)
      return d
    }
    let s = await survoler(oS), r = await survoler(oR), d = juger(s, r)
    for (let i = 0; i < 2 && d.length; i++) { await oS.page.waitForTimeout(2000); s = await survoler(oS); r = await survoler(oR); d = juger(s, r) }
    for (const t of d) noter('SV-12', t)
    faits.push(`SV-12 : sans JavaScript, vignette ≥ 0,90 en ${s && s.dt !== null ? `${s.dt} ms` : '—'} (référence ${r && r.dt !== null ? `${r.dt} ms` : '—'})`)
    await fermer(oS); await fermer(oR)
  }

  // ── SV-8 : appels à l'action visibles, mesure reprise de nav-retenue-qa.mjs (appelsVisibles), copie « survol » ──────────
  const appelsVisibles = (page) => page.evaluate(() => {
    const vus = []
    for (const el of document.querySelectorAll('a[href^="tel:"], a[href*="#contact"], a.bouton, a.nav__devis, button.burger')) {
      if (el.closest('#panneau')) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
      let op = 1, cache = false
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.display === 'none' || cs.visibility === 'hidden') { cache = true; break }
        op *= Number(cs.opacity)
      }
      if (cache || op < 0.2) continue
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))
      const dessus = document.elementFromPoint(x, y)
      if (!dessus || !(el === dessus || el.contains(dessus))) continue
      vus.push({ texte: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30), barre: !!el.closest('header'), devis: el.classList.contains('nav__devis'), tel: el.getAttribute('href')?.startsWith('tel:') || false, burger: el.classList.contains('burger') })
    }
    return vus
  })
  const decrire = (vus) => vus.map((v) => `« ${v.texte} »${v.barre ? ' (barre)' : ''}`).join(', ') || 'aucun'
  for (const [W, H] of [[1440, 900], [1280, 800]]) {
    const F = fmt(W, H), o = await ouvrir('survol', { viewport: { width: W, height: H } }), { page } = o
    await page.waitForTimeout(2500)
    const stable = async (ok) => { let vus = await appelsVisibles(page); if (!ok(vus)) { await page.waitForTimeout(2000); vus = await appelsVisibles(page) } return vus }
    const haut0 = await stable((v) => v.length === 1 && !v[0].barre)
    if (haut0.length !== 1 || haut0[0].barre) noter('SV-8', `${F}, haut de l'accueil : ${haut0.length} appel(s) visible(s) — ${decrire(haut0)} — le seul bouton du héros attendu`)
    for (const sel of ['#prestations', '#realisations']) {
      const y = await hautDoc(page, sel)
      if (y === null) { noter('SV-8', `${F} : ${sel} introuvable`); continue }
      await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.round(y + 40)); await page.waitForTimeout(900)
      const vus = (await stable((v) => { const b = v.filter((x) => x.barre); return b.length === 1 && b[0].devis })).filter((v) => v.barre)
      if (vus.length !== 1 || !vus[0].devis) noter('SV-8', `${F}, ${sel} : la barre montre ${decrire(vus)}, « Devis » seul attendu`)
    }
    const liens = await page.evaluate(() => document.querySelectorAll('#prestations a[href*="#contact"]').length)
    if (liens !== contactsHtml(presR)) noter('SV-8', `${F} : ${liens} lien(s) vers #contact dans #prestations au bureau (référence ${contactsHtml(presR)})`)
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(600)
    const bornes = await page.evaluate(() => { const o = document.querySelector('.ouverture'), p = document.querySelector('#prestations'); return { ouverture: o ? Math.round(o.getBoundingClientRect().bottom + scrollY) : 0, prestations: p ? Math.round(p.getBoundingClientRect().bottom + scrollY) : 0 } })
    const jusqua = Math.max(bornes.ouverture + H, bornes.prestations), trous = [], doublons = []
    for (let y = 0; y <= jusqua; y += 150) {
      await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(450)
      const vus = await stable((v) => v.length === 1)
      if (!vus.length) trous.push(y)
      if (vus.length > 1) doublons.push(`${y} px (${decrire(vus)})`)
    }
    if (trous.length) noter('SV-8', `${F} : aucun appel visible à ${trous.join(', ')} px`)
    if (doublons.length) noter('SV-8', `${F} : plusieurs appels visibles à ${doublons.slice(0, 3).join(' ; ')}`)
    faits.push(`SV-8 : ${F}, relais de 0 à ${jusqua} px tous les 150 px : ${trous.length} trou(s), ${doublons.length} doublon(s) ; ${liens} lien(s) vers #contact dans #prestations`)
    await fermer(o)
  }

  // ── PR : les films et l'image à regarder, produits par le juge ──────────────────────────────────────────────────────────
  const DP = path.join(T, 'preuves')
  fs.mkdirSync(DP, { recursive: true })
  for (const [W, H] of [[1440, 900], [1088, 800]]) {
    const ctx = await nav.newContext({ reducedMotion: 'no-preference', viewport: { width: W, height: H }, recordVideo: { dir: path.join(T, `video-${W}`), size: { width: W, height: H } } })
    const t0 = Date.now(), page = await ctx.newPage()
    ouvertes.push({ ctx, page })
    await page.addInitScript(instrumentation)
    await page.goto(`${srvS.base}/index.html`, { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    await defiler(page, (await hautDoc(page, '#prestations')) - 1.5 * H); await page.waitForTimeout(1500)
    await defiler(page, (await hautDoc(page, '#prestations ol.presta')) - 94); await page.waitForTimeout(1000)
    const b = await boites(page)
    const pts = b.lignes.map((l, i) => { const mt = l.h3[0]; return mt ? { x: mt.l + (i % 2 ? 0.75 : 0.25) * (mt.r - mt.l), y: (mt.t + mt.b) / 2 } : null }).filter(Boolean)
    const n = neutre(b, pts.length ? pts[0].y : H / 2)
    await page.mouse.move(n.x, n.y); await page.waitForTimeout(300)
    const debut = (Date.now() - t0) / 1000
    if (pts.length) {
      await parcourir(page, [n, pts[0]], 250); await parcourir(page, pts, 1500); await parcourir(page, [...pts].reverse(), 1500)
      for (let i = 0; i < 2; i++) { await parcourir(page, pts, 400); await parcourir(page, [...pts].reverse(), 400) }
      await page.waitForTimeout(400)
    }
    const duree = (Date.now() - t0) / 1000 - debut, video = page.video()
    await ctx.close()
    const mp4 = path.join(DP, `survol-film-${W}x${H}.mp4`)
    try {
      const webm = await video.path()
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', debut.toFixed(2), '-i', webm, '-t', Math.min(8, duree + 0.3).toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4], { timeout: 180000 })
      const milieu = path.join(T, `milieu-${W}.png`)
      spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', (duree / 2).toFixed(2), '-i', mp4, '-frames:v', '1', milieu], { timeout: 60000 })
      const ecartType = fs.existsSync(milieu) ? (await sharp(milieu).greyscale().stats()).channels[0].stdev : 0
      faits.push(`PR : survol-film-${W}x${H}.mp4, ${taille(mp4)} octets, ${duree.toFixed(1)} s filmées, écart-type du gris à mi-film ${ecartType.toFixed(1)}`)
      if (ecartType < 8) noter('PR', `survol-film-${W}x${H}.mp4 : image du milieu unie (écart-type ${ecartType.toFixed(1)}, 8 au moins)`)
    } catch (e) { noter('PR', `survol-film-${W}x${H}.mp4 non produit (${e.message})`) }
  }
  for (const f of ['survol-film-1440x900.mp4', 'survol-film-1088x800.mp4', 'survol-clavier.jpg']) {
    if (taille(path.join(DP, f)) <= 0) { noter('PR', `${f} absent ou vide`); continue }
    fs.mkdirSync(PREUVE, { recursive: true }); fs.copyFileSync(path.join(DP, f), path.join(PREUVE, f))
  }
} catch (e) {
  echecs.push(`juge interrompu : ${String((e && e.message) || e).split('\n')[0].slice(0, 300)}`)
} finally {
  for (const o of ouvertes) await o.ctx.close().catch(() => {})
  await nav.close().catch(() => {})
  await srvS.fermer(); await srvR.fermer()
}

// ── CSP et exceptions : ce qui n'existe que dans la copie « survol » ──────────────────────────────────────────────────────
{
  const cspR = new Set(journaux.reference.csp), cspS = [...new Set(journaux.survol.csp)].filter((c) => !cspR.has(c))
  const errR = new Set(journaux.reference.erreurs), errS = [...new Set(journaux.survol.erreurs)].filter((e) => !errR.has(e))
  faits.push(`CSP : ${cspS.length} violation(s) propre(s) à la copie « survol » (référence : ${cspR.size}) ; ${errS.length} exception(s) de page propre(s) à la copie « survol »`)
  if (cspS.length) noter('CSP', `${cspS.length} violation(s) : ${cspS.slice(0, 2).join(' | ')}`)
  if (errS.length) noter('CSP', `exception(s) de page : ${errS.slice(0, 2).join(' | ')}`)
}
fin()
