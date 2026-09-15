// scripts/telephone-qa.mjs — le juge de la tâche 021-17 : le profil téléphone de la démo Atelier Lestraque, famille « telephone »,
// en CSS seul (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.6, §3.2, §5.1, §5.2, §5.3, §6.0 et §6.7
// TL-1 à TL-12 ; Q4 tranchée « oui, sans les cartes des prestations » par Claude Code le 15/09 à 16 h 02, decisions.md).
//
// Génération isolée : un instantané de public/sites-demo (generer.mjs, _kit, _polices, lestraque) est copié dans
// .orchestre/travail/telephone-qa-<pid>/sources, et trois copies du site en sont générées avec --sortie :
//   « téléphone » --familles=<base>,telephone ; « référence » --familles=<base> ; « nue » --familles= (plafond commun de styles.css).
// Les trois partent du même instantané : une tâche qui modifie le kit (relief.js, relief-fil.js, da.json, generer.mjs) pendant le
// jugement ne fausse aucune comparaison. Le dossier de travail est supprimé à la sortie ; le site n'est jamais régénéré en place.
// Les copies sont servies en brotli 11 avec les en-têtes de production (next.config.mjs, route des démos) ; l'écoute de
// securitypolicyviolation et les compteurs de TL-11 sont injectés avant la navigation.
// Téléphone = 390×844, dpr 3, isMobile, hasTouch. Chromium de Playwright sans carte graphique, sauf TL-11 (avec carte : --use-gl=angle
// --enable-webgl --ignore-gpu-blocklist). Les animations au temps sont posées image par image (pause, currentTime), jamais filmées
// en temps réel.
//
//   F     §3.6, §3.2, §7.2 (fiche 021-17) :
//         F-1 _kit/familles/telephone.css présent et non vide ; ni telephone.js, ni telephone.mjs, ni telephone.bureau.css ;
//         F-2 @keyframes de telephone.css : seulement opacity, transform, translate, scale, rotate ; aucune transition de filter, ni de
//             width, height, top, left, padding, margin (site-qa.mjs, jugerGeste) ;
//         F-3 cubic-bezier ∈ {(.16,1,.3,1) ; (.2,.7,.2,1) ; (.37,0,.63,1) ; (.45,0,.55,1)} (DF-5, §6.8) ;
//         F-4 chaque règle sous un @media « téléphone portrait » (max-width ≤ 767px et min-height:560px, §0.1) et
//             prefers-reduced-motion:no-preference ; chaque sélecteur commence par html.js ; toute déclaration animation-timeline,
//             view-timeline, animation-range ou timeline-scope sous @supports (animation-timeline: view()) ;
//         F-5 CSS seul : pages HTML et site.js de la copie « téléphone » identiques octet pour octet à celles de la « référence ».
//   TL-1  héros, tout masqué sauf .hero__media (voile ::after ôté, projecteur gardé) : images posées à 2,5 s et 5,0 s
//         → part > 8 ≥ 0,40 (choix du cahier ; le bureau fait 0,64 à 0,71, decisions.md:57).
//   TL-2  coins : fond magenta sur .hero__media, voile (::after), projecteur (::before), grain de la page et tout le reste masqués ;
//         témoin (photo cachée) ≥ 10 000 pixels magenta ; puis une image sur trois à 60 images/s pendant 10 s (pas de 50 ms,
//         201 images de 0 à 10 000 ms, capture en pixels CSS), et les instants 0, 5 000 et 10 000 ms (extrêmes et milieu de la
//         rotation) repris à la densité de l'écran (dpr 3) → 0 pixel magenta ; détecteur du cahier 020 R-4 (|R − 255| < 40, G < 60,
//         |B − 255| < 40).
//   TL-3  contraste p90 du fond de la boîte du h1 (texte rendu transparent, voile, projecteur et grain compris), une image sur cinq
//         à 60 images/s pendant 10 s (pas de 83,3 ms, 121 images) → 1,05/(L90 + 0,05) ≥ 3,0 à chaque image (cahier 020 §8.0, R-12 ;
//         mesuré avant : 4,68).
//   TL-4  animations au temps (timeline du document) sur .hero--plein et ses descendants : aucune derive* ; présentes, la rotation
//         sur la photo (img ou picture : 10 s, alternate, cubic-bezier(.37,0,.63,1), infinie, images-clés rotate ou transform) et le
//         projecteur sur un pseudo-élément (9 s, linear, délai −2,5 s, infini, images-clés rotate ou transform) (§3.6 point 1,
//         020-01/RL/bloc.css:13 et :22) ; aucune autre que `pousse` ; propriétés : rotate, scale, translate, transform pour la photo,
//         opacity en plus pour le projecteur (cahier 020 R-3).
//   TL-5  820×1180 et 768×1024 (dpr 2, tactile) : animations au temps du héros = {pousse} dans les deux copies ; captures du héros
//         posées à 0, 2,5 et 5 s → part > 8 entre « référence » et « téléphone » < 0,02.
//   TL-6  citation : span.citation__mot = mots de site.json → artisan.citation découpée sur les espaces, texte recollé identique
//         (RC-2) ; opacité effective de chaque mot de cover 0 % (haut du <p> au bas de l'écran) à cover 70 %, par pas de 2 % :
//         ≤ 0,57 à 0 %, ≥ 0,98 à 70 %, et à chaque pas mot i ≥ mot i+1 − 0,01 (RC-3) ; contraste des mots à 0,55 d'opacité, méthode
//         du texte translucide (§0.1, p10 sur les boîtes des mots), à cover 35 % (RC-4). Verbes : 4 span.atelier__verbe, dans
//         l'ordre « trace », « débite », « assemble », « ponce » ; mêmes planchers et même ordre sur la timeline de leur phrase
//         (RC-8) ; contraste à cover 20, 38 et 52 % (RC-9).
//   TL-7  éclaté (#etapes figure.eclate) : à cover 10 % de la figure, chaque img.eclate__calque rendu et centré sur sa place
//         d'eclate.json (boîte × taille de div.eclate__rendu) à ±0,5 px sur chaque axe ; à cover 50 %, centre = place + vecteur ×
//         taille de la boîte à ±2 px, calques à opacité effective ≥ 0,98, autant de pastilles que d'étiquettes d'eclate.json, chacune
//         à ≥ 0,98, sans chevauchement ; requêtes d'eclate/ : assemble.avif et chaque calque, jamais eclate.avif ; aucune à y = 0
//         pendant 3 s après load ; la première quand la figure est sous le bas de l'écran à au plus max(un écran, seuil du
//         chargement paresseux natif) + 100 px (voir les choix du juge).
//   TL-8  node scripts/lighthouse-mediane.mjs <copie « téléphone »>, 5 passes → code 0 : médiane de performance ≥ 95, LCP < 2 500 ms,
//         CLS < 0,1, et le reste de la barre du §5.1 (accessibilité, bonnes pratiques, SEO ≥ 95 ; TBT < 200 ms).
//   TL-9  jusqu'à load (CDP, cache désactivé) : chemins demandés par « téléphone » ⊆ ceux de la « référence » + bureau.css, donc
//         requêtes = référence + 1 au plus ; octets ≤ référence + croissance brotli 11 de styles.css, site.js et bureau.css + 512 octets
//         (en-têtes HTTP) ; styles.css « téléphone » ≤ styles.css « nue » + 1 000 octets en brotli 11 (plafond commun du §5.2).
//   TL-10 mouvement réduit au téléphone : capture à y = 0 et capture de la figure à cover 50 % → part > 8 < 0,02 contre la
//         « référence » ; éclaté fixe : aucune animation sur la figure ni ses descendants (cahier 020 R-7).
//   TL-11 constructeurs instrumentés (Worker, SharedWorker, navigator.serviceWorker.register, getContext « webgl* » sur canvas et
//         OffscreenCanvas) et page.on('worker'), avec carte graphique, page défilée jusqu'en bas → 0 worker, 0 contexte WebGL.
//   TL-12 film tel-avant-apres.mp4 : les deux copies défilées par le même programme (3 s en haut, 1 200 px/s jusqu'en bas, 1 s en
//         bas), images posées une à une à 30 images/s, « référence » à gauche → fichier > 0 octet, ≥ 29 images/s, durées des deux
//         moitiés égales à ±0,1 s, images non unies (écart-type du gris ≥ 8 à 25, 50 et 75 % du film).
//   CSP   §5.3, §6.0 : 0 violation (événement securitypolicyviolation ou message de console) dans les pages ouvertes par le juge.
//   PR    §6.0 : preuves du juge dans .orchestre/preuves/021-17/juge/ (mesures.json, heros-*.jpg, citation-cover35.jpg,
//         verbes-cover38.jpg, eclate-cover10.jpg, eclate-cover50.jpg, tel-avant-apres.mp4, lighthouse.json), aucune de 0 octet.
//
// Choix du juge (le cahier ne tranche pas, ou se contredit) :
//   - « Familles déjà fusionnées » : la liste finale du §7.0 (recit, survol, eclate, video, telephone) réduite à da.json →
//     lestraque.familles plus recit et eclate (TL-6 et TL-7 en ont besoin, §6.7), sans telephone ; --base=a,b la remplace. Une famille
//     sans aucun fichier est consignée : TL-6 ou TL-7 échouent alors d'eux-mêmes.
//   - « 2,5 s et 5,0 s après load », « pendant 10 s » : temps propre des animations posé par currentTime, chaque animation depuis son
//     départ (le délai de −2,5 s du projecteur compte) ; la machine est chargée, le temps réel n'est pas fiable.
//   - Remesure : une position de défilement, une comparaison de captures (TL-5, TL-10) ou un relevé réseau (TL-9) en défaut est
//     refait une fois après 2 s et n'échoue que si le défaut persiste. Avant chaque relevé lié au défilement : 2 images, 150 ms, puis
//     attente (3 s au plus) de la fin des transitions et animations finies de la section (le .reveal de kit.js au téléphone).
//   - « cover X % » : position de mise en page du sujet (chaîne des offsetTop, sans transformation, comme une timeline view()),
//     scrollTo instantané à haut − hauteur d'écran + X × (hauteur d'écran + hauteur du sujet). Sujets : le <p> de la citation, la
//     phrase de l'atelier qui contient les verbes, la figure de l'éclaté.
//   - Seuil de contraste de TL-6 selon la taille calculée du texte (WCAG 1.4.3, « grand texte ») : 3,0 si ≥ 24 px, ou ≥ 18,66 px en
//     graisse ≥ 700 ; 4,5 sinon. Au téléphone, la citation (35,9 px) est à 3,0 comme RC-4, les verbes (21,6 px, graisse 300) à 4,5.
//   - TL-7, distance du premier chargement : « jamais avant que la figure soit à moins d'un écran » ne peut pas se tenir en CSS seul.
//     021-05 pose loading="lazy" et 021-17 n'a pas de JavaScript ; or Chromium lance une image paresseuse vers 2 980 px sous le bas
//     de l'écran (mesuré par Claude Code le 15/09, 390×844 et 1440×900, avec et sans carte graphique). Le juge mesure ce seuil sur
//     une page témoin servie par lui (une image loading="lazy" sous 7 000 px de vide, même navigateur, même format, pas de 100 px),
//     et exige : aucune requête d'eclate/ à y = 0 pendant 3 s, puis une première requête à une distance ≤ max(844, seuil) + 100 px.
//   - TL-7 contredit la plage « entry 20 % cover 45 % » du §3.6 (choix du cahier) : sur la figure de 292 px, entry 20 % vaut
//     cover 5,1 %, et les calques auraient déjà 12 % de leur vecteur à cover 10 %. Le juge suit TL-7, le critère d'acceptation ;
//     la fiche donne une plage sur la timeline nommée de la figure qui commence à cover 10 %.
//   - TL-7, pastilles : éléments de la figure hors de ol.eclate__legende dont la classe contient « pastille » (les plus extérieurs) ;
//     s'il n'y en a aucun, éléments sans enfant dont le texte est un chiffre de 1 à 5. Le cahier ne nomme pas leur classe (§3.4 C).
//   - TL-7, position d'un calque : centre de sa boîte affichée dans le repère de div.eclate__rendu, qui ne dépend que de la
//     translation ; la place vient d'eclate.json lu dans la copie générée.
//   - TL-4 tolère `pousse`, composée avec la rotation dans le geste RL du bureau (kit.css:1172 ; 020-01/RL/bloc.css:13).
//   - TL-9, octets : 512 octets tolérés pour les en-têtes HTTP comptés par encodedDataLength. TL-9, plafond commun : contre la
//     génération sans famille du même instantané, pas contre e33aec0, dont le kit a changé depuis (020-02, 020-15, 021-02).
//   - TL-10, « éclaté fixe » : aucune animation (de n'importe quelle timeline) sur la figure ou ses descendants.
//   - Sans telephone.css (F-1 en échec), TL-8 et TL-12 ne sont pas lancés : le verdict est déjà FAIL et il n'y a rien à mesurer ;
//     --complet les force.
//
// Contrôles à l'œil, non jugés ici (§6.10, Claude Code puis Benj avant 021-11, CC-5) :
//   - tel-avant-apres.mp4 : la cage tourne autour de l'œil de la spirale sans à-coup ; le projecteur balaie le bois sans gêner la
//     lecture du titre ; la citation et les verbes s'allument dans l'ordre de lecture ; l'éclaté s'ouvre en entrant et se referme en
//     remontant, sans image fantôme ; rien d'autre ne bouge que ce qui bougeait avant ;
//   - heros-t25.jpg, heros-t50.jpg, eclate-cover10.jpg, eclate-cover50.jpg : le pivot est bien l'œil de la spirale (aucune mesure
//     automatique de l'œil dans le recadrage portrait) ;
//   - sur un vrai iPhone (§8 « Demande », CC-6) : mode économie d'énergie de Safari, coût du calque du projecteur (§9 point 9).
//
// Usage : node scripts/telephone-qa.mjs [--base=a,b] [--complet] [--sources=<copie de public/sites-demo>] [--preuves=<dossier>]
//   --sources et --preuves servent à essayer le juge sur une copie ; la tâche 021-17 lance la commande sans option.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ARGS = process.argv.slice(2)
const option = (nom) => { const a = ARGS.find((x) => x.startsWith(`--${nom}=`)); return a === undefined ? undefined : a.slice(nom.length + 3) }
const COMPLET = ARGS.includes('--complet')
const SOURCES = path.resolve(option('sources') ?? path.join(R, 'public', 'sites-demo'))
const PREUVE = path.resolve(option('preuves') ?? path.join(R, '.orchestre', 'preuves', '021-17', 'juge'))
const T = path.join(R, '.orchestre', 'travail', `telephone-qa-${process.pid}`)
const SRC = path.join(T, 'sources')
const ORDRE = ['recit', 'survol', 'eclate', 'video', 'telephone']
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
const GPU = { args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] }
const IDS = ['F', 'TL-1', 'TL-2', 'TL-3', 'TL-4', 'TL-5', 'TL-6', 'TL-7', 'TL-8', 'TL-9', 'TL-10', 'TL-11', 'TL-12', 'CSP', 'PR']

const echecs = [], faits = [], pb = {}
const mesures = { date: new Date().toISOString(), sources: SOURCES }
const noter = (id, texte) => { (pb[id] ||= []).push(texte) }
let rendu = false
function fin() {
  if (rendu) return
  rendu = true
  for (const id of [...IDS, ...Object.keys(pb).filter((k) => !IDS.includes(k))]) {
    const l = pb[id]
    if (l && l.length) echecs.push(`${id} : ${l.slice(0, 3).join(' ; ')}${l.length > 3 ? ` (et ${l.length - 3} autre(s))` : ''}`)
  }
  try { fs.mkdirSync(PREUVE, { recursive: true }); fs.writeFileSync(path.join(PREUVE, 'mesures.json'), JSON.stringify({ ...mesures, echecs, faits }, null, 1)) } catch { /* consigné par PR si le dossier est inaccessible */ }
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length
    ? `✗ profil téléphone : FAIL — ${echecs.join(' ; ')}`
    : '✓ profil téléphone : PASS — la cage tourne au héros avec le projecteur, coins couverts et titre lisible à chaque image, citation et verbes allumés au défilement, éclaté ouvert en entrant, CSS seul, 0 worker, 0 WebGL, Lighthouse tenu, tablettes et mouvement réduit inchangés')
  process.exitCode = echecs.length ? 1 : 0
}
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* déjà parti */ } })

// ── outils ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
const lire = (f) => { try { return fs.readFileSync(f) } catch { return null } }
const br11 = (f) => { const b = lire(f); return b ? zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length : 0 }
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const f2 = (x) => Number(x).toFixed(2), f3 = (x) => Number(x).toFixed(3)
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const nombres = (s) => String(s).split(',').map((x) => Number(parseFloat(x).toFixed(4)))
const BEZIERS = ['.16,1,.3,1', '.2,.7,.2,1', '.37,0,.63,1', '.45,0,.55,1'].map((b) => nombres(b).join(','))

// CSS : règles (sélecteur, déclarations, at-règles parentes) et @keyframes, sans commentaires
function analyserCss(texte) {
  const src = texte.replace(/\/\*[\s\S]*?\*\//g, '')
  const regles = [], keyframes = []
  let i = 0
  const finBloc = () => { let prof = 1; const debut = i; while (i < src.length && prof) { if (src[i] === '{') prof++; else if (src[i] === '}') prof--; i++ } return src.slice(debut, i - 1) }
  const bloc = (parents) => {
    let prelude = ''
    while (i < src.length) {
      const c = src[i]
      if (c === '"' || c === '\'') { const j = src.indexOf(c, i + 1); const k = j < 0 ? src.length : j + 1; prelude += src.slice(i, k); i = k; continue }
      if (c === '{') {
        i++
        const p = prelude.trim(); prelude = ''
        if (/^@(-webkit-)?keyframes\b/i.test(p)) keyframes.push({ nom: p.replace(/^@(-webkit-)?keyframes\s+/i, '').trim(), corps: finBloc(), parents })
        else if (p.startsWith('@')) bloc([...parents, p])
        else regles.push({ selecteur: p, decl: finBloc(), parents })
        continue
      }
      if (c === '}') { i++; return }
      if (c === ';') { prelude = ''; i++; continue }
      prelude += c; i++
    }
  }
  bloc([])
  return { regles, keyframes }
}
const decouperSelecteurs = (s) => { const out = []; let prof = 0, cour = ''; for (const c of s) { if (c === '(') prof++; if (c === ')') prof--; if (c === ',' && !prof) { out.push(cour.trim()); cour = '' } else cour += c } if (cour.trim()) out.push(cour.trim()); return out }

// serveur : la copie, puis l'instantané de lestraque (en production, le site est généré en place à côté de ses sources)
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', mp4: 'video/mp4' }
const TEXTES = new Set(['html', 'css', 'js', 'json', 'svg', 'xml', 'txt'])
const PNG_1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64')
async function entetesProduction() {
  const conf = (await import(pathToFileURL(path.join(R, 'next.config.mjs')).href)).default
  const strict = (await conf.headers()).find((r) => r.source.startsWith('/((?!site'))
  if (!strict) throw new Error('route des démos absente de next.config.mjs')
  const entetes = strict.headers.filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => (h.key === 'Content-Security-Policy' ? { key: h.key, value: h.value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ') } : h))
  if (!entetes.some((h) => h.key === 'Content-Security-Policy')) throw new Error('CSP absente de la route des démos')
  return entetes
}
async function servir(dossier, entetes) {
  const racines = [dossier, path.join(SRC, 'lestraque'), SRC]
  const cache = new Map()
  const srv = http.createServer((q, r) => {
    const p = decodeURIComponent(new URL(q.url, 'http://x').pathname)
    if (p === '/__temoin-paresseux') {
      r.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      return r.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div style="height:7000px"></div><img id="temoin" loading="lazy" src="/__temoin-image.png" width="300" height="200" alt="" style="display:block"><div style="height:4000px"></div></body></html>')
    }
    if (p === '/__temoin-image.png') { r.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' }); return r.end(PNG_1) }
    const rel = p.endsWith('/') ? `${p}index.html` : p
    let f = null
    for (const base of racines) { const c = path.join(base, rel); if (c.startsWith(base) && fs.existsSync(c) && fs.statSync(c).isFile()) { f = c; break } }
    if (!f) { r.writeHead(404); return r.end() }
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
  return { base: `http://127.0.0.1:${srv.address().port}`, fermer: () => new Promise((ok) => srv.close(() => ok())) }
}

// injecté avant tout script de la page
function INSTRUMENTATION() {
  const S = (window.__tel = { workers: 0, webgl: 0, csp: [] })
  for (const nom of ['Worker', 'SharedWorker']) {
    const V = window[nom]
    if (typeof V === 'function') window[nom] = new Proxy(V, { construct(cible, a) { S.workers++; return Reflect.construct(cible, a) } })
  }
  try { if (navigator.serviceWorker) { const reg = navigator.serviceWorker.register.bind(navigator.serviceWorker); navigator.serviceWorker.register = (...a) => { S.workers++; return reg(...a) } } } catch { /* absent */ }
  for (const P of [window.HTMLCanvasElement && HTMLCanvasElement.prototype, window.OffscreenCanvas && OffscreenCanvas.prototype].filter(Boolean)) {
    const g = P.getContext
    P.getContext = function (type, ...reste) { if (/webgl/i.test(String(type))) S.webgl++; return g.call(this, type, ...reste) }
  }
  document.addEventListener('securitypolicyviolation', (e) => S.csp.push(`${e.violatedDirective} ${e.blockedURI}`), true)
}

const cspVues = []
async function ouvrir(nav, base, opts = TEL, chemin = '/index.html') {
  const ctx = await nav.newContext(opts)
  ctx.setDefaultTimeout(60000)
  await ctx.addInitScript(INSTRUMENTATION)
  const page = await ctx.newPage()
  const journal = { requetes: [], workers: 0 }
  page.on('request', (q) => journal.requetes.push({ url: q.url(), t: Date.now() }))
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) cspVues.push(m.text().slice(0, 160)) })
  page.on('worker', () => { journal.workers++ })
  await page.goto(`${base}${chemin}`, { waitUntil: 'load' })
  await page.waitForFunction(() => document.documentElement.classList.contains('js') && document.fonts.status === 'loaded', null, { timeout: 30000 }).catch(() => {})
  await page.evaluate(async () => { const i = document.querySelector('.hero--plein .hero__media img'); if (i) { try { await i.decode() } catch { /* décodée plus tard */ } } })
  await page.waitForTimeout(1200)
  return { ctx, page, journal }
}
async function fermer(o) {
  try { cspVues.push(...(await o.page.evaluate(() => (window.__tel ? window.__tel.csp : [])))) } catch { /* page fermée */ }
  await o.ctx.close().catch(() => {})
}
const deuxImages = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
const poser = async (page, t) => {
  await page.evaluate((t) => { for (const a of document.getAnimations()) { if (a.timeline !== document.timeline || typeof a.animationName !== 'string') continue; a.pause(); a.currentTime = t } }, t)
  await deuxImages(page)
}
const boiteVisible = (page, sel) => page.evaluate((sel) => {
  const e = document.querySelector(sel); if (!e) return null
  const r = e.getBoundingClientRect(), x = Math.max(0, r.left), y = Math.max(0, r.top), x2 = Math.min(innerWidth, r.right), y2 = Math.min(innerHeight, r.bottom)
  return x2 - x >= 2 && y2 - y >= 2 ? { x: Math.floor(x), y: Math.floor(y), width: Math.floor(x2 - x), height: Math.floor(y2 - y) } : null
}, sel)
const calme = (page, sel) => page.waitForFunction((sel) => {
  const e = sel ? document.querySelector(sel) : null
  const zone = (e && (e.closest('section') || e.closest('figure'))) || document.body
  return !document.getAnimations().some((a) => a.playState === 'running' && a.timeline === document.timeline && a.effect && a.effect.target && zone.contains(a.effect.target) && Number.isFinite(a.effect.getComputedTiming().endTime))
}, sel, { timeout: 3000, polling: 100 }).catch(() => {})
async function placer(page, sel, c) {
  const ok = await page.evaluate(({ sel, c }) => {
    const e = document.querySelector(sel); if (!e) return false
    let haut = 0; for (let x = e; x; x = x.offsetParent) haut += x.offsetTop
    scrollTo({ top: haut - innerHeight + (c / 100) * (innerHeight + e.offsetHeight), behavior: 'instant' })
    return true
  }, { sel, c })
  await deuxImages(page); await page.waitForTimeout(150); await calme(page, sel)
  return ok
}
const opacites = (page, sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((el) => {
  if (getComputedStyle(el).visibility === 'hidden') return 0
  let o = 1
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none') return 0; o *= parseFloat(cs.opacity) }
  return o
}), sel)

;(async () => {
  let nav = null, navGpu = null
  const serveurs = []
  try {
    const sharp = (await import('sharp')).default
    const { chromium } = await import('playwright')
    const gris160 = (buf) => sharp(buf).resize(160).greyscale().raw().toBuffer()
    const comparer = (a, b) => { if (a.length !== b.length) return { moyen: 1, part8: 1 }; let s = 0, n8 = 0; for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); s += d; if (d > 8) n8++ } return { moyen: s / a.length / 255, part8: n8 / a.length } }
    const ecrits = []
    const ecrireJpeg = async (png, nom) => { const f = path.join(PREUVE, nom); fs.mkdirSync(PREUVE, { recursive: true }); await sharp(png).jpeg({ quality: 85 }).toFile(f); ecrits.push(f) }

    // ── F : la famille, lue dans les sources ─────────────────────────────────────────────────────────────────────────────
    const FAM = path.join(SOURCES, '_kit', 'familles')
    const cssTel = lire(path.join(FAM, 'telephone.css'))
    const famille = !!(cssTel && cssTel.length > 0)
    if (!famille) noter('F', '_kit/familles/telephone.css absent ou vide (F-1)')
    for (const f of ['telephone.js', 'telephone.mjs', 'telephone.bureau.css']) if (fs.existsSync(path.join(FAM, f))) noter('F', `_kit/familles/${f} existe : tout va dans telephone.css (F-1, §3.6)`)
    if (famille) {
      const { regles, keyframes } = analyserCss(cssTel.toString('utf8'))
      faits.push(`F : telephone.css ${cssTel.length} octets, ${regles.length} règle(s), ${keyframes.length} @keyframes`)
      const PERMISES = new Set(['opacity', 'transform', 'translate', 'scale', 'rotate', 'animation-timing-function', 'animation-composition'])
      for (const k of keyframes) {
        const props = k.corps.split(/[{};]/).map((s) => s.trim()).filter((s) => s.includes(':')).map((s) => s.slice(0, s.indexOf(':')).trim().toLowerCase())
        const hors = [...new Set(props.filter((p) => !PERMISES.has(p)))]
        if (hors.length) noter('F', `@keyframes ${k.nom} anime ${hors.join(', ')} (F-2 : opacity, transform, translate, scale, rotate seulement)`)
      }
      for (const r of regles) {
        for (const m of r.decl.matchAll(/(?:^|;)\s*transition(?:-property)?\s*:([^;]*)/gi)) if (/\b(filter|width|height|top|left|padding(?:-\w+)?|margin(?:-\w+)?)\b/i.test(m[1])) noter('F', `transition interdite dans « ${r.selecteur.slice(0, 50)} » : ${m[1].trim().slice(0, 60)} (F-2)`)
        const medias = r.parents.filter((p) => /^@media/i.test(p)).join(' ').replace(/\s+/g, '')
        const maxW = [...medias.matchAll(/max-width:(\d+(?:\.\d+)?)px/gi)].map((m) => Number(m[1]))
        if (!(maxW.length && Math.min(...maxW) <= 767 && /min-height:560px/i.test(medias) && /prefers-reduced-motion:no-preference/i.test(medias))) noter('F', `« ${r.selecteur.slice(0, 60)} » hors de @media (max-width:767px) and (min-height:560px) et (prefers-reduced-motion:no-preference) (F-4)`)
        const sansJs = decouperSelecteurs(r.selecteur).filter((s) => !/^html\.js(?![\w-])/.test(s))
        if (sansJs.length) noter('F', `sélecteur sans html.js en tête : « ${sansJs[0].slice(0, 60)} » (F-4)`)
        if (/(?:^|;)\s*(animation-timeline|view-timeline|animation-range|timeline-scope)\s*:/i.test(r.decl) && !r.parents.some((p) => /^@supports/i.test(p) && /animation-timeline/i.test(p))) noter('F', `« ${r.selecteur.slice(0, 60)} » lie une animation au défilement hors de @supports (animation-timeline: view()) (F-4)`)
      }
      for (const m of cssTel.toString('utf8').matchAll(/cubic-bezier\(([^)]*)\)/gi)) if (!BEZIERS.includes(nombres(m[1]).join(','))) noter('F', `cubic-bezier(${m[1].trim()}) hors du jeu du §3.2 (F-3)`)
    }

    // ── instantané et générations ────────────────────────────────────────────────────────────────────────────────────────
    fs.rmSync(T, { recursive: true, force: true })
    fs.mkdirSync(SRC, { recursive: true })
    fs.copyFileSync(path.join(SOURCES, 'generer.mjs'), path.join(SRC, 'generer.mjs'))
    for (const d of ['_kit', '_polices', 'lestraque']) fs.cpSync(path.join(SOURCES, d), path.join(SRC, d), { recursive: true })
    const FAMS = path.join(SRC, '_kit', 'familles')
    const da = JSON.parse(fs.readFileSync(path.join(SRC, '_kit', 'da.json'), 'utf8'))
    const argBase = option('base')
    let base
    if (argBase !== undefined) base = argBase.split(',').map((x) => x.trim()).filter((x) => x && x !== 'telephone')
    else {
      const voulues = new Set([...(da.lestraque.familles || []), 'recit', 'eclate'])
      base = [...ORDRE.filter((f) => voulues.has(f)), ...(da.lestraque.familles || []).filter((f) => !ORDRE.includes(f))].filter((f) => f !== 'telephone')
    }
    const presente = (nom) => ['css', 'bureau.css', 'js', 'mjs'].some((e) => taille(path.join(FAMS, `${nom}.${e}`)) > 0)
    faits.push(`familles de base : ${base.map((f) => `${f}${presente(f) ? '' : ' (aucun fichier)'}`).join(', ') || 'aucune'}`)
    mesures.base = base
    const generer = (sortie, familles) => {
      const r = spawnSync(process.execPath, [path.join(SRC, 'generer.mjs'), 'lestraque', `--sortie=${sortie}`, `--familles=${familles.join(',')}`], { cwd: R, encoding: 'utf8', timeout: 240000 })
      return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`.trim() }
    }
    const G = path.join(T, 'telephone'), REF = path.join(T, 'reference'), NUE = path.join(T, 'nue')
    for (const [dossier, familles, nom] of [[G, [...base, 'telephone'], 'téléphone'], [REF, base, 'référence'], ...(base.length ? [[NUE, [], 'nue']] : [])]) {
      const g = generer(dossier, familles)
      if (g.code !== 0) throw new Error(`génération « ${nom} » (--familles=${familles.join(',')}) en échec : ${g.sortie.split('\n').filter(Boolean).pop() || `code ${g.code}`}`)
    }
    const DNUE = base.length ? NUE : REF

    // F-5 : CSS seul
    {
      const pages = []
      const marcher = (d, rel = '') => { for (const e of fs.readdirSync(path.join(d, rel), { withFileTypes: true })) { const r2 = path.join(rel, e.name); if (e.isDirectory()) { if (!['images', 'fonts', 'relief', 'eclate', 'video'].includes(e.name)) marcher(d, r2) } else if (/\.html$/.test(e.name)) pages.push(r2) } }
      marcher(REF)
      const differentes = [...pages, 'site.js'].filter((f) => { const a = lire(path.join(G, f)), b = lire(path.join(REF, f)); return !a || !b || !a.equals(b) })
      faits.push(`F-5 : ${pages.length} pages HTML et site.js comparés, ${differentes.length} différent(s)`)
      if (differentes.length) noter('F', `CSS seul : ${differentes.slice(0, 3).join(', ')} diffère(nt) de la référence (F-5 : ni HTML ni JavaScript nouveau)`)
    }

    // ── TL-9 : poids ──────────────────────────────────────────────────────────────────────────────────────────────────────
    const poids = {
      stylesTel: br11(path.join(G, 'styles.css')), stylesRef: br11(path.join(REF, 'styles.css')), stylesNue: br11(path.join(DNUE, 'styles.css')),
      siteTel: br11(path.join(G, 'site.js')), siteRef: br11(path.join(REF, 'site.js')),
      bureauTel: br11(path.join(G, 'bureau.css')), bureauRef: br11(path.join(REF, 'bureau.css')),
      stylesTelBrut: taille(path.join(G, 'styles.css')),
    }
    mesures.poids = poids
    faits.push(`TL-9 : styles.css en brotli 11 — téléphone ${poids.stylesTel} o, référence ${poids.stylesRef} o, sans famille ${poids.stylesNue} o (brut ${poids.stylesTelBrut} o)`)
    if (poids.stylesTel - poids.stylesNue > 1000) noter('TL-9', `styles.css +${poids.stylesTel - poids.stylesNue} octets en brotli 11 contre la génération sans famille, 1 000 au plus (plafond commun du §5.2)`)

    const entetes = await entetesProduction()
    const srvG = await servir(G, entetes); serveurs.push(srvG)
    const srvR = await servir(REF, entetes); serveurs.push(srvR)
    nav = await chromium.launch()

    // ── TL-4, TL-1, TL-2, TL-3 : le héros ────────────────────────────────────────────────────────────────────────────────
    {
      const o = await ouvrir(nav, srvG.base)
      const { page } = o
      const anims = await page.evaluate(() => {
        const h = document.querySelector('.hero--plein'); if (!h) return null
        return document.getAnimations().filter((a) => a.timeline === document.timeline && typeof a.animationName === 'string' && a.effect && a.effect.target && h.contains(a.effect.target)).map((a) => {
          const t = a.effect.getTiming()
          // une animation CSS porte sa courbe sur ses images-clés (getTiming().easing reste « linear ») : on lit les deux
          const k = a.effect.getKeyframes()
          const courbes = k.slice(0, -1).map((x) => x.easing).filter((e) => e && e !== 'linear')
          return { nom: a.animationName, pseudo: a.effect.pseudoElement || '', balise: a.effect.target.tagName, duree: t.duration, direction: t.direction, easing: courbes[0] || t.easing, delai: t.delay, infini: t.iterations === Infinity, proprietes: [...new Set(k.flatMap((x) => Object.keys(x).filter((y) => !['offset', 'easing', 'composite', 'computedOffset'].includes(y))))] }
        })
      })
      if (!anims) throw new Error('.hero--plein introuvable dans l\'accueil « téléphone »')
      mesures.TL4 = anims
      faits.push(`TL-4 : animations au temps du héros — ${anims.map((a) => `${a.nom}${a.pseudo} (${a.balise}, ${a.duree} ms, ${a.easing}, délai ${a.delai})`).join(' · ') || 'aucune'}`)
      const tourne = (a) => a.proprietes.some((p) => p === 'rotate' || p === 'transform')
      const easingEst = (a, voulu) => { const m = /cubic-bezier\(([^)]*)\)/.exec(a.easing); return voulu === 'linear' ? a.easing === 'linear' : !!m && nombres(m[1]).join(',') === nombres(voulu).join(',') }
      const derives = anims.filter((a) => /^derive/.test(a.nom))
      if (derives.length) noter('TL-4', `${derives.map((a) => a.nom).join(', ')} tourne encore sur le héros (à remplacer par RL)`)
      const rotations = anims.filter((a) => !a.pseudo && ['IMG', 'PICTURE'].includes(a.balise) && a.nom !== 'pousse' && tourne(a))
      const projecteurs = anims.filter((a) => a.pseudo && tourne(a))
      const rotOk = rotations.filter((a) => a.duree === 10000 && a.direction === 'alternate' && easingEst(a, '.37,0,.63,1') && a.infini)
      const projOk = projecteurs.filter((a) => a.duree === 9000 && easingEst(a, 'linear') && a.delai === -2500 && a.infini)
      if (!rotations.length) noter('TL-4', 'aucune rotation sur la photo du héros')
      else if (!rotOk.length) noter('TL-4', `rotation ${rotations.map((a) => `${a.nom} ${a.duree} ms ${a.direction} ${a.easing}`).join(', ')} : 10 s, alternate, cubic-bezier(.37,0,.63,1), infinie attendus`)
      if (!projecteurs.length) noter('TL-4', 'aucun projecteur (animation de rotation sur un pseudo-élément) au héros')
      else if (!projOk.length) noter('TL-4', `projecteur ${projecteurs.map((a) => `${a.nom}${a.pseudo} ${a.duree} ms ${a.easing} délai ${a.delai}`).join(', ')} : 9 s, linear, délai −2,5 s, infini attendus`)
      const autres = anims.filter((a) => a.nom !== 'pousse' && !rotations.includes(a) && !projecteurs.includes(a) && !derives.includes(a))
      if (autres.length) noter('TL-4', `au-delà du geste RL : ${autres.map((a) => `${a.nom}${a.pseudo}`).join(', ')}`)
      for (const a of anims) {
        const permises = a.pseudo ? ['rotate', 'transform', 'translate', 'opacity'] : ['rotate', 'scale', 'translate', 'transform']
        const hors = a.proprietes.filter((p) => !permises.includes(p))
        if (hors.length) noter('TL-4', `${a.nom}${a.pseudo} anime ${hors.join(', ')}`)
      }

      // TL-1
      await poser(page, 2500)
      const clipPage = await boiteVisible(page, '.hero--plein .hero__media')
      if (clipPage) await ecrireJpeg(await page.screenshot({ clip: clipPage, scale: 'css', type: 'png' }), 'heros-page-t25.jpg')
      const masque = await page.addStyleTag({ content: 'body *{visibility:hidden!important}.hero--plein .hero__media,.hero--plein .hero__media *{visibility:visible!important}.hero--plein .hero__media::after{display:none!important}' })
      const clip = await boiteVisible(page, '.hero--plein .hero__media')
      if (!clip) throw new Error('boîte de .hero__media invisible au téléphone')
      await poser(page, 2500); const i25 = await page.screenshot({ clip, scale: 'css', type: 'png' })
      await poser(page, 5000); const i50 = await page.screenshot({ clip, scale: 'css', type: 'png' })
      await ecrireJpeg(i25, 'heros-t25.jpg'); await ecrireJpeg(i50, 'heros-t50.jpg')
      const e1 = comparer(await gris160(i25), await gris160(i50))
      mesures.TL1 = e1
      faits.push(`TL-1 : part > 8 entre 2,5 et 5,0 s ${f3(e1.part8)} (écart moyen ${f3(e1.moyen)})`)
      if (e1.part8 < 0.40) noter('TL-1', `part > 8 ${f3(e1.part8)} entre 2,5 et 5,0 s, 0,40 au moins`)
      await masque.evaluate((e) => e.remove())

      // TL-2
      const magenta = (data, canaux) => { let n = 0; for (let i = 0; i < data.length; i += canaux) if (Math.abs(data[i] - 255) < 40 && data[i + 1] < 60 && Math.abs(data[i + 2] - 255) < 40) n++; return n }
      const compter = async () => { const { data, info } = await sharp(await page.screenshot({ clip, scale: 'device', type: 'png' })).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return magenta(data, info.channels) }
      const feuille = await page.addStyleTag({ content: 'html::before,html::after,body::before,body::after{display:none!important}body *{visibility:hidden!important}.hero--plein .hero__media,.hero--plein .hero__media *{visibility:visible!important}.hero--plein .hero__media::after,.hero--plein .hero__media::before{display:none!important}.hero--plein .hero__media{background:#f0f!important}' })
      const temoin = await page.addStyleTag({ content: '.hero--plein .hero__media img{visibility:hidden!important}' })
      await poser(page, 0)
      const nTemoin = await compter()
      await temoin.evaluate((e) => e.remove())
      if (nTemoin < 10000) noter('TL-2', `témoin : ${nTemoin} pixels magenta photo cachée (10 000 au moins) — détecteur inopérant`)
      let pireCoins = 0, pireT = 0
      for (let k = 0; k <= 200; k++) { await poser(page, k * 50); const n = await compter(); if (n > pireCoins) { pireCoins = n; pireT = k * 50 } }
      mesures.TL2 = { temoin: nTemoin, pire: pireCoins, t: pireT }
      faits.push(`TL-2 : témoin ${nTemoin} px magenta ; 201 images de 0 à 10 s, pire ${pireCoins} px${pireCoins ? ` à ${pireT} ms` : ''}`)
      if (pireCoins > 0) noter('TL-2', `${pireCoins} pixels magenta à t = ${pireT} ms (coin découvert, 0 attendu)`)
      await feuille.evaluate((e) => e.remove())

      // TL-3
      const sansTexte = await page.addStyleTag({ content: '.hero h1,.hero h1 *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}' })
      let pireC = Infinity, pireCT = 0
      for (let k = 0; k <= 120; k++) {
        const t = Math.round((k * 1000) / 12)
        await poser(page, t)
        const b = await boiteVisible(page, '.hero--plein h1')
        if (!b) { noter('TL-3', `boîte du h1 invisible à t = ${t} ms`); break }
        const { data, info } = await sharp(await page.screenshot({ clip: b, scale: 'css', type: 'png' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        const L = []; for (let i = 0; i < data.length; i += info.channels) L.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
        L.sort((x, y) => x - y)
        const c = 1.05 / (L[Math.floor(0.9 * (L.length - 1))] + 0.05)
        if (c < pireC) { pireC = c; pireCT = t }
      }
      await sansTexte.evaluate((e) => e.remove())
      mesures.TL3 = { pire: pireC, t: pireCT }
      faits.push(`TL-3 : contraste du fond du titre au pire instant ${f2(pireC)} (t = ${pireCT} ms, 121 images)`)
      if (pireC < 3.0) noter('TL-3', `contraste du fond du titre ${f2(pireC)} à t = ${pireCT} ms, 3,0 au moins à chaque image`)
      await fermer(o)
    }

    // ── TL-6 : citation et verbes ────────────────────────────────────────────────────────────────────────────────────────
    {
      const o = await ouvrir(nav, srvG.base)
      const { page } = o
      const site = JSON.parse(fs.readFileSync(path.join(SRC, 'lestraque', 'site.json'), 'utf8'))
      const mots = site.artisan.citation.split(/\s+/).filter(Boolean)
      const lus = await page.evaluate(() => ({
        mots: [...document.querySelectorAll('.plateau__citation span.citation__mot')].map((s) => s.textContent),
        verbes: [...document.querySelectorAll('span.atelier__verbe')].map((s) => s.textContent.trim()),
      }))
      const contraste = async (sel, alpha, nomImage) => {
        const info = await page.evaluate((sel) => {
          const boites = []; let couleur = null, taillePx = 0, graisse = 400
          for (const el of document.querySelectorAll(sel)) {
            const cs = getComputedStyle(el); couleur = cs.color; taillePx = parseFloat(cs.fontSize); graisse = parseInt(cs.fontWeight, 10)
            const rg = document.createRange(); rg.selectNodeContents(el)
            for (const b of rg.getClientRects()) if (b.width > 0 && b.height > 0) boites.push({ x: b.left, y: b.top, l: b.width, h: b.height })
          }
          return { boites, couleur, taillePx, graisse }
        }, sel)
        if (nomImage) await ecrireJpeg(await page.screenshot({ scale: 'css', type: 'png' }), nomImage)
        const tag = await page.addStyleTag({ content: `${sel}{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}` })
        await deuxImages(page)
        const { data, info: im } = await sharp(await page.screenshot({ scale: 'css', type: 'png' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        await tag.evaluate((e) => e.remove()); await deuxImages(page)
        const encre = (info.couleur || '').match(/[\d.]+/g)?.slice(0, 3).map(Number) || [255, 255, 255]
        const eL = encre.map(lin)
        const ratios = []
        for (const b of info.boites) {
          const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y)), x1 = Math.min(im.width, Math.ceil(b.x + b.l)), y1 = Math.min(im.height, Math.ceil(b.y + b.h))
          for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const i = (y * im.width + x) * im.channels
            const f = [lin(data[i]), lin(data[i + 1]), lin(data[i + 2])]
            const Lf = 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]
            const Le = 0.2126 * (alpha * eL[0] + (1 - alpha) * f[0]) + 0.7152 * (alpha * eL[1] + (1 - alpha) * f[1]) + 0.0722 * (alpha * eL[2] + (1 - alpha) * f[2])
            ratios.push((Math.max(Lf, Le) + 0.05) / (Math.min(Lf, Le) + 0.05))
          }
        }
        ratios.sort((x, y) => x - y)
        const seuil = info.taillePx >= 24 || (info.taillePx >= 18.66 && info.graisse >= 700) ? 3.0 : 4.5
        return { p10: ratios.length ? ratios[Math.floor(0.1 * (ratios.length - 1))] : 0, pixels: ratios.length, seuil, taillePx: info.taillePx }
      }
      const balayer = async (sujet, sel, nom, id) => {
        const releve = []
        for (let c = 0; c <= 70; c += 2) {
          const juger = (ops) => {
            const d = []
            if (!ops.length) { d.push(`à cover ${c} %, aucun ${nom}`); return d }
            if (c === 0) { const k = ops.findIndex((x) => x > 0.57); if (k >= 0) d.push(`à cover 0 %, ${nom} ${k + 1} à ${f2(ops[k])} (0,57 au plus)`) }
            if (c === 70) { const k = ops.findIndex((x) => x < 0.98); if (k >= 0) d.push(`à cover 70 %, ${nom} ${k + 1} à ${f2(ops[k])} (0,98 au moins)`) }
            for (let i = 0; i + 1 < ops.length; i++) if (ops[i] < ops[i + 1] - 0.01) { d.push(`à cover ${c} %, ${nom} ${i + 1} (${f2(ops[i])}) sous ${nom} ${i + 2} (${f2(ops[i + 1])})`); break }
            return d
          }
          await placer(page, sujet, c)
          let ops = await opacites(page, sel), d = juger(ops)
          if (d.length) { await attendre(2000); await placer(page, sujet, c); ops = await opacites(page, sel); d = juger(ops) }
          releve.push({ c, ops: ops.map((x) => Number(x.toFixed(3))) })
          for (const x of d) noter(id, x)
        }
        return releve
      }
      mesures.TL6 = {}
      // citation
      if (!lus.mots.length) noter('TL-6', 'aucun span.citation__mot dans la citation (famille recit absente ou sans crochet plateauCitation : 021-03)')
      else {
        if (lus.mots.length !== mots.length || lus.mots.map((s) => s.trim()).join(' ') !== mots.join(' ')) noter('TL-6', `citation : ${lus.mots.length} span.citation__mot pour ${mots.length} mots, ou texte recollé différent de site.json (RC-2)`)
        mesures.TL6.citation = await balayer('.plateau__citation blockquote p', '.plateau__citation span.citation__mot', 'mot', 'TL-6')
        await placer(page, '.plateau__citation blockquote p', 35)
        const c = await contraste('.plateau__citation span.citation__mot', 0.55, 'citation-cover35.jpg')
        mesures.TL6.contrasteCitation = c
        faits.push(`TL-6 : citation, ${lus.mots.length} mots ; contraste à 0,55 d'opacité p10 ${f2(c.p10)} (${c.pixels} px, texte ${f2(c.taillePx)} px, seuil ${f2(c.seuil)})`)
        if (!c.pixels || c.p10 < c.seuil) noter('TL-6', `contraste de la citation à 0,55 d'opacité p10 ${f2(c.p10)}, ${f2(c.seuil)} au moins (RC-4)`)
      }
      // verbes
      const VERBES = ['trace', 'débite', 'assemble', 'ponce']
      if (!lus.verbes.length) noter('TL-6', 'aucun span.atelier__verbe (famille recit absente ou sans crochet atelierPhrase : 021-03)')
      else {
        if (JSON.stringify(lus.verbes) !== JSON.stringify(VERBES)) noter('TL-6', `verbes ${lus.verbes.join(', ')} : trace, débite, assemble, ponce attendus dans cet ordre (RC-8)`)
        const phrase = '.atelier__phrase:has(span.atelier__verbe)'
        mesures.TL6.verbes = await balayer(phrase, 'span.atelier__verbe', 'verbe', 'TL-6')
        const cs = []
        for (const cov of [20, 38, 52]) { await placer(page, phrase, cov); const c = await contraste('span.atelier__verbe', 0.55, cov === 38 ? 'verbes-cover38.jpg' : null); cs.push({ cover: cov, ...c }); if (!c.pixels || c.p10 < c.seuil) noter('TL-6', `contraste des verbes à 0,55 d'opacité à cover ${cov} % : p10 ${f2(c.p10)}, ${f2(c.seuil)} au moins (RC-9)`) }
        mesures.TL6.contrasteVerbes = cs
        faits.push(`TL-6 : verbes ${lus.verbes.join(', ')} ; contraste p10 ${cs.map((c) => `${f2(c.p10)} à cover ${c.cover} %`).join(', ')} (seuil ${f2(cs[0].seuil)})`)
      }
      await fermer(o)
    }

    // ── TL-7 : l'éclaté ──────────────────────────────────────────────────────────────────────────────────────────────────
    {
      const cheminJson = [path.join(G, 'eclate', 'eclate.json'), path.join(SRC, 'lestraque', 'eclate', 'eclate.json')].find((f) => fs.existsSync(f))
      let ej = null
      try { ej = cheminJson ? JSON.parse(fs.readFileSync(cheminJson, 'utf8')) : null } catch { ej = null }
      // seuil du chargement paresseux natif, sur la page témoin
      const ot = await nav.newContext(TEL)
      const pt = await ot.newPage()
      let vuTemoin = false
      pt.on('request', (q) => { if (q.url().includes('__temoin-image')) vuTemoin = true })
      await pt.goto(`${srvG.base}/__temoin-paresseux`, { waitUntil: 'load' })
      await pt.waitForTimeout(800)
      let seuilNatif = null
      for (let y = 0; y <= 7000 && seuilNatif === null; y += 100) {
        await pt.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y)
        await pt.waitForTimeout(90)
        if (vuTemoin) seuilNatif = await pt.evaluate(() => document.getElementById('temoin').getBoundingClientRect().top - innerHeight)
      }
      await ot.close()
      mesures.TL7 = { seuilNatif, eclateJson: cheminJson ? path.relative(T, cheminJson) : null }

      const o = await ouvrir(nav, srvG.base)
      const { page, journal } = o
      const FIG = '#etapes figure.eclate'
      const eclateVues = () => journal.requetes.filter((q) => /\/eclate\//.test(new URL(q.url).pathname)).map((q) => path.posix.basename(new URL(q.url).pathname))
      if (!(await page.$(FIG))) noter('TL-7', `${FIG} absente de l'accueil (famille eclate absente : 021-05)`)
      else if (!ej || !Array.isArray(ej.pieces)) noter('TL-7', 'eclate.json introuvable ou illisible dans la copie (021-22)')
      else {
        await page.waitForTimeout(1800) // 3 s après load avec l'attente d'ouvrir()
        const aZero = eclateVues()
        if (aZero.length) noter('TL-7', `à y = 0, ${aZero.length} requête(s) d'eclate/ dans les 3 s après load (${aZero.slice(0, 3).join(', ')})`)
        const fichiers = new Set(['assemble.avif', ...ej.pieces.map((p) => p.fichier)])
        const hautFig = await page.evaluate((sel) => { const e = document.querySelector(sel); let h = 0; for (let x = e; x; x = x.offsetParent) h += x.offsetTop; return h }, FIG)
        const limite = Math.max(844, seuilNatif ?? 844) + 100
        let distance = null
        for (let y = Math.max(0, hautFig - 844 - limite - 800); y <= hautFig + 844 && distance === null; y += 100) {
          await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y)
          await deuxImages(page); await page.waitForTimeout(120)
          if (eclateVues().some((n) => fichiers.has(n))) distance = hautFig - (y + 844)
        }
        mesures.TL7.distancePremiereRequete = distance
        faits.push(`TL-7 : seuil paresseux natif ${seuilNatif ?? 'non mesuré'} px ; première requête d'eclate/ à ${distance ?? '—'} px sous le bas de l'écran (limite ${limite} px)`)
        if (seuilNatif === null) noter('TL-7', 'témoin du chargement paresseux : aucune requête, seuil non mesurable')
        if (distance === null) noter('TL-7', 'ni assemble.avif ni aucun calque demandé en arrivant sur la figure')
        else if (distance > limite) noter('TL-7', `éclaté demandé à ${distance} px sous le bas de l'écran, ${limite} au plus`)

        const etat = () => page.evaluate((sel) => {
          const fig = document.querySelector(sel), boite = fig && fig.querySelector('.eclate__rendu')
          if (!fig || !boite) return null
          const eff = (el) => { if (getComputedStyle(el).visibility === 'hidden') return 0; let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none') return 0; o *= parseFloat(cs.opacity) } return o }
          const rb = boite.getBoundingClientRect()
          const calques = [...fig.querySelectorAll('img.eclate__calque')].map((i) => { const r = i.getBoundingClientRect(), cs = getComputedStyle(i); return { fichier: (i.getAttribute('src') || '').split('/').pop().split('?')[0], cx: r.left + r.width / 2 - rb.left, cy: r.top + r.height / 2 - rb.top, rendu: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0, opacite: eff(i) } })
          const legende = fig.querySelector('ol.eclate__legende')
          let mode = 'classe'
          let ps = [...fig.querySelectorAll('[class*="pastille"]')].filter((e) => !(legende && legende.contains(e)))
          ps = ps.filter((e) => !ps.some((p) => p !== e && p.contains(e)))
          if (!ps.length) { mode = 'chiffre'; ps = [...fig.querySelectorAll('*')].filter((e) => !(legende && legende.contains(e)) && !e.children.length && /^[1-5]$/.test(e.textContent.trim())) }
          return { boite: { l: rb.width, h: rb.height }, calques, mode, pastilles: ps.map((p) => { const r = p.getBoundingClientRect(); return { x: r.left, y: r.top, l: r.width, h: r.height, opacite: eff(p), rendu: getComputedStyle(p).display !== 'none' && r.width > 0 } }) }
        }, FIG)
        const place = (p, b) => ({ x: (p.x + p.l / 2) * b.l, y: (p.y + p.h / 2) * b.h })
        const juger10 = (e) => {
          const d = []
          if (!e) return ['div.eclate__rendu absente de la figure']
          for (const p of ej.pieces) {
            const c = e.calques.find((x) => x.fichier === p.fichier)
            if (!c || !c.rendu) { d.push(`à cover 10 %, calque ${p.nom} ${c ? 'non rendu' : 'absent'}`); continue }
            const pl = place(p, e.boite)
            if (Math.abs(c.cx - pl.x) > 0.5 || Math.abs(c.cy - pl.y) > 0.5) d.push(`à cover 10 %, calque ${p.nom} décalé de ${f2(c.cx - pl.x)}, ${f2(c.cy - pl.y)} px (±0,5)`)
          }
          return d
        }
        const juger50 = (e) => {
          const d = []
          if (!e) return ['div.eclate__rendu absente de la figure']
          for (const p of ej.pieces) {
            const c = e.calques.find((x) => x.fichier === p.fichier)
            if (!c || !c.rendu) { d.push(`à cover 50 %, calque ${p.nom} ${c ? 'non rendu' : 'absent'}`); continue }
            const pl = place(p, e.boite), vx = p.vecteur[0] * e.boite.l, vy = p.vecteur[1] * e.boite.h
            if (Math.abs(c.cx - pl.x - vx) > 2 || Math.abs(c.cy - pl.y - vy) > 2) d.push(`à cover 50 %, calque ${p.nom} décalé de ${f2(c.cx - pl.x)}, ${f2(c.cy - pl.y)} px pour un vecteur de ${f2(vx)}, ${f2(vy)} (±2)`)
            if (c.opacite < 0.98) d.push(`à cover 50 %, calque ${p.nom} à ${f2(c.opacite)} d'opacité (0,98 au moins)`)
          }
          const n = (ej.etiquettes || []).length || 5
          const ps = e.pastilles.filter((p) => p.rendu)
          if (ps.length !== n) d.push(`à cover 50 %, ${ps.length} pastille(s) rendue(s) (sélection « ${e.mode} »), ${n} attendues`)
          for (const [k, p] of ps.entries()) if (p.opacite < 0.98) d.push(`à cover 50 %, pastille ${k + 1} à ${f2(p.opacite)} (0,98 au moins)`)
          for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) {
            const l = Math.min(ps[a].x + ps[a].l, ps[b].x + ps[b].l) - Math.max(ps[a].x, ps[b].x), h = Math.min(ps[a].y + ps[a].h, ps[b].y + ps[b].h) - Math.max(ps[a].y, ps[b].y)
            if (l > 0 && h > 0 && l * h >= 0.01) d.push(`pastilles ${a + 1} et ${b + 1} se chevauchent (${f2(l * h)} px²)`)
          }
          return d
        }
        for (const [cov, juger, nomImage] of [[10, juger10, 'eclate-cover10.jpg'], [50, juger50, 'eclate-cover50.jpg']]) {
          await placer(page, FIG, cov)
          let e = await etat(), d = juger(e)
          if (d.length) { await attendre(2000); await placer(page, FIG, cov); e = await etat(); d = juger(e) }
          mesures.TL7[`cover${cov}`] = e
          await ecrireJpeg(await page.screenshot({ scale: 'css', type: 'png' }), nomImage)
          for (const x of d) noter('TL-7', x)
        }
        await page.waitForTimeout(1000)
        const vues = [...new Set(eclateVues())]
        mesures.TL7.requetes = vues
        faits.push(`TL-7 : requêtes d'eclate/ — ${vues.join(', ') || 'aucune'}`)
        for (const f of fichiers) if (!vues.includes(f)) noter('TL-7', `${f} jamais demandé`)
        if (vues.includes('eclate.avif')) noter('TL-7', 'eclate.avif demandé au téléphone (assemble.avif et les calques au lieu d\'eclate.avif, §3.6 point 4)')
      }
      await fermer(o)
    }

    // ── TL-5 : tablettes ─────────────────────────────────────────────────────────────────────────────────────────────────
    for (const [w, h] of [[820, 1180], [768, 1024]]) {
      const opts = { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      const og = await ouvrir(nav, srvG.base, opts), or = await ouvrir(nav, srvR.base, opts)
      const noms = (p) => p.evaluate(() => { const hh = document.querySelector('.hero--plein'); return [...new Set(document.getAnimations().filter((a) => a.timeline === document.timeline && typeof a.animationName === 'string' && a.effect && a.effect.target && hh && hh.contains(a.effect.target)).map((a) => a.animationName))].sort() })
      const ng = await noms(og.page), nr = await noms(or.page)
      if (ng.join() !== 'pousse' || nr.join() !== 'pousse') noter('TL-5', `${w}×${h} : animations au temps du héros ${ng.join(', ') || 'aucune'} (référence : ${nr.join(', ') || 'aucune'}), pousse seule attendue`)
      let pire = 0
      for (const t of [0, 2500, 5000]) {
        const mesurer = async () => {
          await poser(og.page, t); await poser(or.page, t)
          const clip = await boiteVisible(or.page, '.hero--plein .hero__media')
          if (!clip) return { part8: 1 }
          return comparer(await gris160(await og.page.screenshot({ clip, scale: 'css', type: 'png' })), await gris160(await or.page.screenshot({ clip, scale: 'css', type: 'png' })))
        }
        let e = await mesurer()
        if (e.part8 >= 0.02) { await attendre(2000); e = await mesurer() }
        pire = Math.max(pire, e.part8)
        if (e.part8 >= 0.02) noter('TL-5', `${w}×${h} à t = ${t} ms : part > 8 ${f3(e.part8)} contre la référence, moins de 0,02`)
      }
      faits.push(`TL-5 : ${w}×${h}, animations du héros ${ng.join(', ') || 'aucune'}, pire part > 8 contre la référence ${f3(pire)}`)
      await fermer(og); await fermer(or)
    }

    // ── TL-9 : requêtes et octets jusqu'à load ───────────────────────────────────────────────────────────────────────────
    {
      const reseau = async (base) => {
        const ctx = await nav.newContext(TEL)
        await ctx.addInitScript(INSTRUMENTATION)
        const page = await ctx.newPage()
        const cdp = await ctx.newCDPSession(page)
        const req = new Map(); let charge = false
        cdp.on('Network.requestWillBeSent', (e) => { if (charge || /^(data|blob):/.test(e.request.url) || req.has(e.requestId)) return; req.set(e.requestId, { chemin: new URL(e.request.url).pathname, octets: 0 }) })
        cdp.on('Network.loadingFinished', (e) => { const r = req.get(e.requestId); if (r) r.octets = e.encodedDataLength })
        cdp.on('Page.loadEventFired', () => { charge = true })
        await cdp.send('Page.enable'); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
        await page.goto(`${base}/index.html`, { waitUntil: 'load' })
        await page.waitForTimeout(1500)
        const l = [...req.values()]
        await fermer({ ctx, page })
        return { n: l.length, octets: l.reduce((s, r) => s + r.octets, 0), chemins: l.map((r) => r.chemin).sort() }
      }
      const croissance = Math.max(0, poids.stylesTel - poids.stylesRef) + Math.max(0, poids.siteTel - poids.siteRef) + Math.max(0, poids.bureauTel - poids.bureauRef)
      const juger = (g, r) => {
        const d = [], reste = [...r.chemins], en_plus = []
        for (const c of g.chemins) { const k = reste.indexOf(c); if (k >= 0) reste.splice(k, 1); else en_plus.push(c) }
        if (en_plus.filter((c) => !/\/bureau\.css$/.test(c)).length || g.n > r.n + 1) d.push(`${g.n} requêtes contre ${r.n} pour la référence, en plus : ${en_plus.slice(0, 4).join(', ') || '—'} (bureau.css seule admise)`)
        if (g.octets > r.octets + croissance + 512) d.push(`${g.octets} octets jusqu'à load contre ${r.octets} + ${croissance} de croissance brotli + 512`)
        return d
      }
      let r = await reseau(srvR.base), g = await reseau(srvG.base), d = juger(g, r)
      if (d.length) { await attendre(2000); r = await reseau(srvR.base); g = await reseau(srvG.base); d = juger(g, r) }
      mesures.TL9 = { telephone: { n: g.n, octets: g.octets }, reference: { n: r.n, octets: r.octets }, croissance }
      faits.push(`TL-9 : jusqu'à load, téléphone ${g.n} requêtes / ${g.octets} o ; référence ${r.n} / ${r.octets} o ; croissance brotli ${croissance} o`)
      for (const x of d) noter('TL-9', x)
    }

    // ── TL-10 : mouvement réduit ─────────────────────────────────────────────────────────────────────────────────────────
    {
      const opts = { ...TEL, reducedMotion: 'reduce' }
      const og = await ouvrir(nav, srvG.base, opts), or = await ouvrir(nav, srvR.base, opts)
      await og.page.waitForTimeout(800); await or.page.waitForTimeout(800)
      const mesurerHaut = async () => comparer(await gris160(await og.page.screenshot({ scale: 'css', type: 'png' })), await gris160(await or.page.screenshot({ scale: 'css', type: 'png' })))
      let e = await mesurerHaut()
      if (e.part8 >= 0.02) { await attendre(2000); e = await mesurerHaut() }
      faits.push(`TL-10 : mouvement réduit, y = 0, part > 8 contre la référence ${f3(e.part8)}`)
      if (e.part8 >= 0.02) noter('TL-10', `mouvement réduit, y = 0 : part > 8 ${f3(e.part8)} contre la référence, moins de 0,02`)
      const FIG = '#etapes figure.eclate'
      if (!(await og.page.$(FIG))) noter('TL-10', `éclaté non mesurable : ${FIG} absente`)
      else {
        const mesurerFig = async () => {
          await placer(og.page, FIG, 50); await placer(or.page, FIG, 50)
          const clip = await boiteVisible(or.page, FIG), clipG = await boiteVisible(og.page, FIG)
          if (!clip || !clipG) return { part8: 1 }
          return comparer(await gris160(await og.page.screenshot({ clip, scale: 'css', type: 'png' })), await gris160(await or.page.screenshot({ clip, scale: 'css', type: 'png' })))
        }
        let ef = await mesurerFig()
        if (ef.part8 >= 0.02) { await attendre(2000); ef = await mesurerFig() }
        const animees = await og.page.evaluate((sel) => { const f = document.querySelector(sel); return document.getAnimations().filter((a) => a.effect && a.effect.target && f.contains(a.effect.target)).map((a) => a.animationName || a.transitionProperty || '?') }, FIG)
        mesures.TL10 = { haut: e, figure: ef, animees }
        faits.push(`TL-10 : mouvement réduit, figure à cover 50 %, part > 8 contre la référence ${f3(ef.part8)} ; ${animees.length} animation(s) sur la figure`)
        if (ef.part8 >= 0.02) noter('TL-10', `mouvement réduit, figure : part > 8 ${f3(ef.part8)} contre la référence, moins de 0,02`)
        if (animees.length) noter('TL-10', `éclaté animé en mouvement réduit : ${animees.slice(0, 3).join(', ')}`)
      }
      await fermer(og); await fermer(or)
    }

    // ── TL-11 : workers et WebGL, avec carte graphique ───────────────────────────────────────────────────────────────────
    {
      navGpu = await chromium.launch(GPU)
      const o = await ouvrir(navGpu, srvG.base)
      await o.page.waitForTimeout(1800)
      const bas = await o.page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
      for (let k = 1; k <= 12; k++) { await o.page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round((bas * k) / 12)); await o.page.waitForTimeout(300) }
      await o.page.waitForTimeout(1500)
      const c = await o.page.evaluate(() => window.__tel || { workers: -1, webgl: -1 })
      const workers = Math.max(c.workers, o.journal.workers)
      mesures.TL11 = { workers, webgl: c.webgl }
      faits.push(`TL-11 : ${workers} worker(s), ${c.webgl} contexte(s) WebGL (avec carte graphique, page défilée)`)
      if (workers !== 0) noter('TL-11', `${workers} worker(s) au téléphone, 0 attendu`)
      if (c.webgl !== 0) noter('TL-11', `${c.webgl} contexte(s) WebGL au téléphone, 0 attendu`)
      await fermer(o)
      await navGpu.close().catch(() => {}); navGpu = null
    }

    // ── TL-12 : le film avant / après ────────────────────────────────────────────────────────────────────────────────────
    if (famille || COMPLET) {
      const hauteur = await (async () => { const o = await ouvrir(nav, srvR.base); const hh = await o.page.evaluate(() => document.documentElement.scrollHeight - innerHeight); await fermer(o); return hh })()
      const n = Math.ceil((3 + hauteur / 1200 + 1) * 30)
      const y = (t) => (t < 3 ? 0 : Math.min(hauteur, Math.round((t - 3) * 1200)))
      const FILM = path.join(T, 'film')
      const pretes = () => [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0 && getComputedStyle(i).display !== 'none' }).every((i) => i.complete)
      for (const [nom, srv] of [['reference', srvR], ['telephone', srvG]]) {
        const o = await ouvrir(nav, srv.base)
        const d = path.join(FILM, nom); fs.mkdirSync(d, { recursive: true })
        for (let k = 0; k < n; k++) {
          const t = k / 30
          await o.page.evaluate((yy) => scrollTo({ top: yy, behavior: 'instant' }), y(t))
          await poser(o.page, Math.round(t * 1000))
          await o.page.waitForFunction(pretes, null, { timeout: 1500 }).catch(() => {})
          await o.page.screenshot({ path: path.join(d, `${String(k).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 80, scale: 'css' })
        }
        await fermer(o)
      }
      const ff = (a) => spawnSync('ffmpeg', ['-y', '-v', 'error', ...a], { encoding: 'utf8', timeout: 900000 })
      const sonde = (f) => { try { return JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { encoding: 'utf8' }).stdout || '{}') } catch { return {} } }
      const moities = {}
      for (const nom of ['reference', 'telephone']) {
        const out = path.join(FILM, `${nom}.mp4`)
        const r = ff(['-framerate', '30', '-i', path.join(FILM, nom, '%05d.jpg'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-an', out])
        if (r.status !== 0) noter('TL-12', `encodage de la moitié « ${nom} » en échec : ${(r.stderr || '').trim().split('\n').pop()}`)
        moities[nom] = Number(sonde(out).format?.duration || 0)
      }
      fs.mkdirSync(PREUVE, { recursive: true })
      const final = path.join(PREUVE, 'tel-avant-apres.mp4')
      const r = ff(['-i', path.join(FILM, 'reference.mp4'), '-i', path.join(FILM, 'telephone.mp4'), '-filter_complex', '[0:v][1:v]hstack=inputs=2[v]', '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', final])
      if (r.status !== 0) noter('TL-12', `montage côte à côte en échec : ${(r.stderr || '').trim().split('\n').pop()}`)
      ecrits.push(final)
      const s = sonde(final), v = (s.streams || []).find((x) => x.codec_type === 'video')
      const [a, b] = String(v?.avg_frame_rate || '0/1').split('/').map(Number), ips = b ? a / b : 0
      const ecartsTypes = []
      for (const q of [0.25, 0.5, 0.75]) { const f = path.join(FILM, 'telephone', `${String(Math.floor(q * (n - 1))).padStart(5, '0')}.jpg`); const st = await sharp(f).greyscale().stats(); ecartsTypes.push(st.channels[0].stdev) }
      mesures.TL12 = { images: n, duree: Number(s.format?.duration || 0), ips, moities, ecartsTypes, octets: taille(final) }
      faits.push(`TL-12 : tel-avant-apres.mp4 ${taille(final)} o, ${n} images, ${f2(ips)} images/s, moitiés ${f2(moities.reference)} s et ${f2(moities.telephone)} s, écart-type du gris ${ecartsTypes.map((x) => f2(x)).join(' / ')}`)
      if (taille(final) <= 0) noter('TL-12', 'tel-avant-apres.mp4 absent ou vide')
      if (ips < 29) noter('TL-12', `${f2(ips)} images/s, 29 au moins`)
      if (!(moities.reference > 0) || Math.abs(moities.reference - moities.telephone) > 0.1) noter('TL-12', `durées des moitiés ${f2(moities.reference)} s et ${f2(moities.telephone)} s (égales à ±0,1 s)`)
      if (ecartsTypes.some((x) => x < 8)) noter('TL-12', `image unie dans le film (écart-type du gris ${ecartsTypes.map((x) => f2(x)).join(' / ')}, 8 au moins)`)
    } else faits.push('TL-12 : film non tourné (telephone.css absent ; --complet le force)')

    await nav.close().catch(() => {}); nav = null
    for (const s of serveurs.splice(0)) await s.fermer()

    // ── CSP ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
    mesures.csp = cspVues
    faits.push(`CSP : ${cspVues.length} violation(s)`)
    if (cspVues.length) noter('CSP', `${cspVues.length} violation(s) : ${cspVues.slice(0, 2).join(' | ')}`)

    // ── TL-8 : Lighthouse mobile ─────────────────────────────────────────────────────────────────────────────────────────
    if (famille || COMPLET) {
      fs.mkdirSync(PREUVE, { recursive: true })
      const resume = path.join(PREUVE, 'lighthouse.json')
      const lh = spawnSync(process.execPath, [path.join(R, 'scripts', 'lighthouse-mediane.mjs'), G, `--resume=${resume}`], { cwd: R, encoding: 'utf8', timeout: 25 * 60000, maxBuffer: 1 << 26 })
      const ligne = `${lh.stdout || ''}${lh.stderr || ''}`.trim().split('\n').filter(Boolean).pop() || `code ${lh.status}`
      let m = null
      try { m = JSON.parse(fs.readFileSync(resume, 'utf8')).medianes } catch { m = null }
      mesures.TL8 = { code: lh.status, medianes: m }
      if (m) { ecrits.push(resume); faits.push(`TL-8 : médianes sur 5 passes — performance ${m.performance}, LCP ${m.lcpMs} ms, CLS ${m.cls}, TBT ${m.tbtMs} ms, accessibilité ${m.accessibilite}, bonnes pratiques ${m.bonnesPratiques}, SEO ${m.seo}`) }
      else faits.push(`TL-8 : ${ligne.replace(/ — .*$/, '').slice(0, 200)}`)
      if (lh.status !== 0) noter('TL-8', `Lighthouse mobile : ${ligne.replace(/ — [A-Z]:.*$|— \/.*$/, '').slice(0, 220)}`)
    } else faits.push('TL-8 : Lighthouse non lancé (telephone.css absent ; --complet le force)')

    // ── PR : preuves non vides ───────────────────────────────────────────────────────────────────────────────────────────
    const vides = ecrits.filter((f) => taille(f) <= 0)
    faits.push(`PR : ${ecrits.length} preuve(s) écrite(s) dans ${path.relative(R, PREUVE) || PREUVE}`)
    if (vides.length) noter('PR', `preuve(s) vide(s) : ${vides.map((f) => path.basename(f)).join(', ')}`)
  } catch (e) {
    noter('juge', `interrompu : ${premiereLigne(e)}`)
  } finally {
    if (navGpu) await navGpu.close().catch(() => {})
    if (nav) await nav.close().catch(() => {})
    for (const s of serveurs) await s.fermer().catch(() => {})
    try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* retiré à la sortie */ }
  }
  fin()
})()
