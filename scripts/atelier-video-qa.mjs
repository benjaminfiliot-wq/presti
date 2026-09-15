// scripts/atelier-video-qa.mjs — le juge de la tâche 021-13 : la vidéo d'atelier dans la page de la démo Atelier Lestraque, famille
// « video » (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §4.2 « La vraie vidéo », §3.0 crochet credits,
// §3.1 C, §5.1 à §5.3, §6.0 et §6.5 VA-1 à VA-12 ; WCAG 2.2.2). Le cahier nomme ce juge « video-atelier-qa.mjs » : c'est le même.
// Le site est généré dans deux copies sous .orchestre/travail/atelier-video-qa-<pid>/ (supprimées à la sortie), jamais en place :
// « video » = --familles=<base>,video et « référence » = --familles=<base>. Les deux sont servies en brotli avec les en-têtes de
// production (next.config.mjs, CSP comprise) et les requêtes partielles (206) des MP4. Chromium de Playwright sans carte graphique
// (il lit l'AV1, pas le H.264) ; Chrome de marque pour VA-6. Le juge capture, filme et mesure lui-même.
//
//   F     préalables : _kit/familles/video.mjs, video.bureau.css, video.js présents et non vides (§4.2 « Fichiers ») ;
//         lestraque/video/atelier.av1.mp4, atelier.h264.mp4 et attributions.json présents et non vides, avec une entrée
//         "type": "video" (auteur, banque, source, licence, licenceUrl) — livrés par 021-18 ; _kit/familles/recit.mjs présent
//         (021-03 : les verbes dont dépend le départ). Sans eux, rien n'est mesuré.
//   VA-1  HTML de la génération « video » : aucun <video dans l'accueil ni dans les pages communes ; dans les mentions légales,
//         une entrée <li> de la liste des crédits qui porte le texte « Images d’illustration », l'auteur, la banque et la licence
//         de l'entrée vidéo, un lien vers sa page (source) et un lien vers le texte de sa licence (licenceUrl) (§4.2 ; SS-3).
//   VA-2  1440×900 : requêtes vidéo pendant 3 s après load à y = 0 : 0 ; puis #atelier à moins d'un écran : sources AV1 en
//         premier, toutes les requêtes vidéo de même origine, aucune URL blob: (§4.2).
//   VA-3  défilement continu jusqu'à l'atelier et au-delà (page.mouse.wheel(0, 5) à chaque rAF, témoin ≥ 100 changements de
//         scrollY) ; échantillons à chaque rAF : playing seulement après que le dernier .atelier__verbe a atteint 0,98 d'opacité
//         effective et que la scène couvre ≥ 60 % de l'écran ; paused vrai en ≤ 500 ms après que la scène couvre < 20 % (§4.2).
//   VA-4  conditions niées, une à la fois : 390×844 ; 820×1180 ; reducedMotion 'reduce' ; navigator.connection.saveData = true ;
//         JavaScript coupé : 0 requête vidéo et 0 video dans le DOM pendant 8 s après avoir défilé jusqu'à l'atelier (§4.2).
//   VA-5  requestIdleCallback supprimé par un script injecté : playing en ≤ 5 s à l'atelier (Safari ; kit.js:217).
//   VA-6  Chrome de marque (channel 'chrome'), source AV1 bloquée par page.route : playing en ≤ 5 s ; Chrome absent = échec.
//   VA-7  bouton pause : clic, puis Entrée au clavier : paused vrai en ≤ 250 ms ; aria-pressed et nom accessible cohérents ;
//         relance au second appui ; le bouton n'est pas un a[href*="#contact"] (WCAG 2.2.2).
//   VA-8  404 sur les deux sources : élément retiré en ≤ 4,5 s ; photo visible, dérive active (§4.2).
//   VA-9  lisibilité dans la page, pendant la lecture : 8 captures, boîtes des mots de .atelier__phrase (Range.getClientRects),
//         texte rendu transparent, contraste du texte opaque 1,05 / (p90 de L + 0,05) ≥ 4,5 en 1088×800, ≥ 3,0 en 1280×800 et
//         1440×900, à chaque capture (AP-5 ; RC-9 ; §0.1).
//   VA-10 C7 pendant la lecture, sans défiler, 3 s : animations au temps (DocumentTimeline, running) dans #atelier hors la vidéo :
//         0 ; la dérive de la photo en pause ; glisse-cadre et verbes immobiles (§2).
//   VA-11 téléphone 390×844 : requêtes jusqu'à load = celles de la référence ; Lighthouse mobile 5 passes
//         (scripts/lighthouse-mediane.mjs sur la copie « video », code 0 = barre du §5.1 tenue, médiane ≥ 95 comprise).
//   VA-12 CSP et console, bureau, jusqu'à 10 s de lecture : 0 violation, 0 erreur (§5.3).
//   P     §5.2, famille seule contre la référence : bureau.css ≤ 6 000 octets en brotli 11 ; site.js ≤ +2 710 octets en brotli ;
//         styles.css ≤ +1 000 octets en brotli.
//   PR    §6.0 et §6.10 : preuves écrites par le juge dans .orchestre/preuves/021-13/juge/ : mesures.json, atelier-film.mp4
//         (arrivée à l'atelier, lecture, pause au bouton, relance), atelier-lecture.jpg ; aucune de 0 octet, aucune unie
//         (écart-type du gris ≥ 8).
//
// Choix du juge (le cahier ne tranche pas) :
//   - base = lestraque.familles de da.json sans « video », plus « recit » s'il n'y est pas (021-13 dépend de 021-03 : ses verbes
//     règlent le départ) ; ordre de la liste finale du §7.0 (recit, survol, eclate, video, telephone) ; --base=a,b la remplace ;
//   - F : aucun video.css (§3.0 : <nom>.css ne porte que ce que le téléphone, le mouvement réduit ou l'absence de JavaScript
//     reçoivent ; ici, rien) ; VA-1 : la génération d'une copie à laquelle manque atelier.h264.mp4 est refusée par le crochet garde
//     (code ≠ 0) et n'écrit rien (§4.2 « Fichiers » : garde, les deux fichiers et l'entrée existent) ;
//   - « requête vidéo » = type de ressource media, ou chemin en .mp4, .webm ou sous /video/ ; « à moins d'un écran » = haut de
//     #atelier à une demi-hauteur d'écran sous le bas de l'écran, attente de 8 s au plus ;
//   - VA-2 : l'élément est celui du §4.2 : video.atelier__video dans #atelier .atelier__media, muted, loop, playsinline,
//     preload="auto", aria-hidden="true", tabindex="-1", disablepictureinpicture, deux <source> : la 1re en atelier.av1.mp4 de type
//     video/mp4 avec codecs av01, la 2e en atelier.h264.mp4 avec codecs avc1 ;
//   - « couverture » = hauteur de #atelier visible dans l'écran / hauteur de l'écran ; VA-3 compare l'instant de l'événement
//     playing aux échantillons pris à ou avant lui ; le délai de pause court depuis le 1er échantillon sous 20 % après la lecture ;
//   - « à l'atelier » (VA-5 à VA-10) = arrivée comme un visiteur : haut de #atelier placé à un écran sous le haut de l'écran,
//     600 ms, puis 12 pas de molette jusqu'à #atelier en haut de l'écran ; les délais courent depuis la fin de ces pas ;
//   - VA-6 : currentSrc doit être atelier.h264.mp4 (sinon ce n'est pas le H.264 qui joue) ;
//   - VA-7 : lecture → aria-pressed="false" et nom « Mettre la vidéo en pause » ; pause → aria-pressed="true" et nom « Relancer la
//     vidéo » (§4.2) ; relance = paused faux en ≤ 250 ms ; le bouton est un <button>, visible dès la lecture, dans la moitié droite
//     et la moitié basse de #atelier ; autant de a[href*="#contact"] dans #atelier que la référence ;
//   - VA-8 : délai compté depuis l'arrivée à l'atelier ; « dérive active » = animation derive de l'image en running ;
//   - VA-9 : captures toutes les 900 ms (une boucle de 6 à 8 s), vidéo à opacité effective ≥ 0,98 ; on n'assombrit jamais l'image
//     (§4.2) : filter none sur la vidéo et .atelier__media, voiles ::before et ::after de .atelier__media identiques à la référence ;
//     les captures d'une même page doivent différer (écart moyen > 0,002 entre la 1re et la 5e : la vidéo bouge vraiment) ;
//   - VA-10 : immobiles = position à ±0,5 px et opacité à ±0,01 entre 0 et 3 s (verbes, image de la photo, éléments en glisse-cadre) ;
//   - VA-11 : bureau.css est admise en plus si la référence n'en a pas (§5.2 « référence + 1 ») ; Lighthouse ne tourne qu'une fois
//     tout le reste mesuré ;
//   - VA-12 : une erreur de console ou une violation déjà présente, au même texte, dans la référence au même scénario n'est pas
//     comptée (elle vient d'une autre tâche) ; elle est consignée ;
//   - un état transitoire en défaut (VA-2 à VA-10, VA-11 requêtes) est remesuré une fois dans une page neuve après 2 s.
//
// Contrôles à l'œil, non jugés ici (§6.10, Claude Code puis Benj) : juge/atelier-film.mp4 et juge/atelier-lecture.jpg — mains
// seules, geste lisible, phrase lisible sur la vidéo, boucle sans saut, fondu d'entrée, bouton pause discret ; l'essai sur l'iPhone
// de Benj (CC-6).
//
// Usage : node scripts/atelier-video-qa.mjs [--base=a,b]
//   essais du juge seulement : --essai-sites=<copie de public/sites-demo> ; --essai-sans-lighthouse (VA-11 alors en échec)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ID = '021-13'
const arg = (nom) => { const a = process.argv.find((x) => x.startsWith(`--${nom}=`)); return a === undefined ? undefined : a.slice(nom.length + 3) }
const SITES = arg('essai-sites') ? path.resolve(arg('essai-sites')) : path.join(R, 'public', 'sites-demo')
const FAM = path.join(SITES, '_kit', 'familles'), VIDEO = path.join(SITES, 'lestraque', 'video')
// en essai sur une copie, les preuves vont à côté de la copie : jamais de fausses preuves dans .orchestre/preuves/021-13/
const PREUVE = arg('essai-sites') ? path.join(SITES, '..', 'preuves-essai-021-13') : path.join(R, '.orchestre', 'preuves', ID, 'juge')
const T = path.join(R, '.orchestre', 'travail', `atelier-video-qa-${process.pid}`)
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* déjà parti */ } })
const ORDRE = ['recit', 'survol', 'eclate', 'video', 'telephone']
const NOM_PAUSE = 'Mettre la vidéo en pause', NOM_RELANCE = 'Relancer la vidéo'
const echecs = [], faits = [], M = { date: new Date().toISOString() }
const pb = {}
const noter = (id, texte) => { (pb[id] ||= []).push(texte) }
let mesure = false // vrai une fois les préalables tenus : les preuves ne s'écrivent qu'alors
const fin = () => {
  for (const [id, l] of Object.entries(pb)) if (l.length) echecs.push(`${id} : ${l.slice(0, 4).join(' ; ')}${l.length > 4 ? ` (et ${l.length - 4} autre(s))` : ''}`)
  if (mesure) { try { fs.mkdirSync(PREUVE, { recursive: true }); fs.writeFileSync(path.join(PREUVE, 'mesures.json'), `${JSON.stringify({ ...M, echecs, faits }, null, 1)}\n`) } catch { /* consigné par PR */ } }
  if (faits.length) console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ vidéo d'atelier : FAIL — ${echecs.join(' ; ')}` : '✓ vidéo d\'atelier : PASS — chargée à l\'approche, jouée après les verbes, en pause hors de la scène, bouton pause au clavier, repli sans requestIdleCallback et en H.264, retirée en cas d\'échec, phrase lisible, un seul mouvement, rien au téléphone ni en mouvement réduit ni en économie de données, créditée avec sa licence, CSP et Lighthouse tenus')
  process.exitCode = echecs.length ? 1 : 0
}
const taille = (f) => { try { return fs.statSync(f).isFile() ? fs.statSync(f).size : -1 } catch { return -1 } }
const lire = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '')
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms))
const br = (f) => (fs.existsSync(f) ? zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length : 0)
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const texteHtml = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const estVideo = (url, type) => type === 'media' || /\.(mp4|webm)(\?|$)/i.test(url) || /\/video\//.test(url)

function generer(sortie, familles) {
  const r = spawnSync(process.execPath, [path.join(SITES, 'generer.mjs'), 'lestraque', `--sortie=${sortie}`, `--familles=${familles.join(',')}`], { cwd: R, encoding: 'utf8', timeout: 300000 })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`.trim() }
}

// ── le serveur : brotli sur les textes, en-têtes de production, requêtes partielles des médias ──────────────────────────
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
    if (!f.startsWith(dossier) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
    const ext = path.extname(f).slice(1), h = { 'content-type': TYPES[ext] || 'application/octet-stream' }
    for (const { key, value } of entetes) h[key] = value
    if (TEXTES.has(ext) && /\bbr\b/.test(q.headers['accept-encoding'] || '')) {
      if (!cache.has(f)) cache.set(f, zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }))
      h['content-encoding'] = 'br'; h.vary = 'Accept-Encoding'
      r.writeHead(200, h); return r.end(cache.get(f))
    }
    const n = fs.statSync(f).size
    h['accept-ranges'] = 'bytes'
    const m = /^bytes=(\d*)-(\d*)$/.exec(q.headers.range || '')
    if (m && (m[1] || m[2])) {
      const a = m[1] ? Number(m[1]) : Math.max(0, n - Number(m[2])), b = m[1] && m[2] ? Math.min(Number(m[2]), n - 1) : n - 1
      if (a >= n || a > b) { r.writeHead(416, { ...h, 'content-range': `bytes */${n}` }); return r.end() }
      r.writeHead(206, { ...h, 'content-range': `bytes ${a}-${b}/${n}`, 'content-length': b - a + 1 })
      return fs.createReadStream(f, { start: a, end: b }).pipe(r)
    }
    r.writeHead(200, { ...h, 'content-length': n }); fs.createReadStream(f).pipe(r)
  })
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
  return { base: `http://127.0.0.1:${srv.address().port}`, fermer: () => new Promise((ok) => { srv.closeAllConnections?.(); srv.close(ok) }) }
}

// ── injecté avant tout script de la page : CSP, événements des médias, apparitions de video, échantillons à chaque rAF ────
function instrumentation() {
  const V = (window.__va = { csp: [], ev: [], dom: [], ech: [], serie: false })
  document.addEventListener('securitypolicyviolation', (e) => V.csp.push(`${e.violatedDirective} ${e.blockedURI}`), true)
  for (const type of ['loadstart', 'loadeddata', 'play', 'playing', 'pause', 'error', 'emptied']) {
    window.addEventListener(type, (e) => { const t = e.target; if (t && (t.tagName === 'VIDEO' || t.tagName === 'SOURCE')) V.ev.push({ type, t: performance.now(), tag: t.tagName, src: t.tagName === 'VIDEO' ? t.currentSrc : t.src }) }, true)
  }
  const aVideo = (n) => n.nodeType === 1 && (n.tagName === 'VIDEO' || !!(n.querySelector && n.querySelector('video')))
  new MutationObserver((l) => { for (const m of l) { for (const n of m.addedNodes) if (aVideo(n)) V.dom.push({ type: 'ajout', t: performance.now() }); for (const n of m.removedNodes) if (aVideo(n)) V.dom.push({ type: 'retrait', t: performance.now() }) } }).observe(document, { childList: true, subtree: true })
  V.op = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o }
  V.mesure = () => {
    const s = document.querySelector('#atelier')
    if (!s) return { t: performance.now(), y: scrollY, c: null }
    const r = s.getBoundingClientRect(), verbes = s.querySelectorAll('.atelier__verbe'), v = s.querySelector('video')
    return { t: performance.now(), y: scrollY, c: Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight, vb: verbes.length ? V.op(verbes[verbes.length - 1]) : null, nv: verbes.length, v: !!v, p: v ? v.paused : null, ct: v ? v.currentTime : null, vo: v ? V.op(v) : null }
  }
  V.demarrer = () => { V.ech = []; V.serie = true; const tic = () => { if (!V.serie) return; V.ech.push(V.mesure()); requestAnimationFrame(tic) }; requestAnimationFrame(tic) }
  V.arreter = () => { V.serie = false; return V.ech }
}
const ECONOMIE = () => {
  const c = navigator.connection
  if (c) Object.defineProperty(Object.getPrototypeOf(c), 'saveData', { get: () => true, configurable: true })
  else Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g', addEventListener() {}, removeEventListener() {} }, configurable: true })
}
const SANS_IDLE = () => { try { delete window.requestIdleCallback } catch { /* non configurable */ } try { delete Window.prototype.requestIdleCallback } catch { /* absent */ } }

async function principal() {
  // ── F : préalables ──────────────────────────────────────────────────────────────────────────────────────────────
  for (const f of ['video.mjs', 'video.bureau.css', 'video.js']) if (taille(path.join(FAM, f)) <= 0) noter('F', `_kit/familles/${f} absent ou vide (021-13)`)
  if (fs.existsSync(path.join(FAM, 'video.css'))) noter('F', '_kit/familles/video.css existe (aucune règle hors bureau au §4.2)')
  for (const f of ['atelier.av1.mp4', 'atelier.h264.mp4', 'attributions.json']) if (taille(path.join(VIDEO, f)) <= 0) noter('F', `lestraque/video/${f} absent ou vide (021-18 non livrée)`)
  const attr = lireJson(path.join(VIDEO, 'attributions.json'))
  const entree = Array.isArray(attr) ? attr.find((a) => a && a.type === 'video') : null
  if (taille(path.join(VIDEO, 'attributions.json')) > 0 && !(entree && ['auteur', 'banque', 'source', 'licence', 'licenceUrl'].every((k) => typeof entree[k] === 'string' && entree[k].trim()))) noter('F', 'lestraque/video/attributions.json sans entrée "type": "video" complète (auteur, banque, source, licence, licenceUrl)')
  let base = []
  try { base = arg('base') !== undefined ? arg('base').split(',').map((x) => x.trim()).filter(Boolean) : (lireJson(path.join(SITES, '_kit', 'da.json')).lestraque.familles || []) } catch { noter('F', '_kit/da.json illisible') }
  base = base.filter((f) => f !== 'video')
  if (arg('base') === undefined && !base.includes('recit')) base.push('recit')
  base.sort((a, b) => (ORDRE.indexOf(a) < 0 ? 99 : ORDRE.indexOf(a)) - (ORDRE.indexOf(b) < 0 ? 99 : ORDRE.indexOf(b)))
  if (base.includes('recit') && taille(path.join(FAM, 'recit.mjs')) <= 0) noter('F', '_kit/familles/recit.mjs absent (021-03 non versée : pas de verbes pour le départ)')
  faits.push(`F : famille lue dans ${path.relative(R, FAM).split(path.sep).join('/') || FAM}, plan dans ${path.relative(R, VIDEO).split(path.sep).join('/') || VIDEO} ; base ${base.join(',') || '(aucune)'} ; ${Object.values(pb).flat().length} préalable(s) manquant(s)`)
  if (Object.keys(pb).length) return
  mesure = true
  const familles = [...base, 'video'].sort((a, b) => (ORDRE.indexOf(a) < 0 ? 99 : ORDRE.indexOf(a)) - (ORDRE.indexOf(b) < 0 ? 99 : ORDRE.indexOf(b)))

  // ── générations ─────────────────────────────────────────────────────────────────────────────────────────────────
  const VID = path.join(T, 'video'), REF = path.join(T, 'reference')
  fs.mkdirSync(T, { recursive: true })
  for (const [dossier, liste, nom] of [[VID, familles, 'video'], [REF, base, 'référence']]) {
    const g = generer(dossier, liste)
    if (g.code !== 0) { echecs.push(`génération « ${nom} » (--familles=${liste.join(',')}) en échec : ${g.sortie.split('\n').pop().slice(0, 240)}`); return }
  }
  faits.push(`copies générées : video (--familles=${familles.join(',')}) et référence (--familles=${base.join(',')})${SITES !== path.join(R, 'public', 'sites-demo') ? ` depuis l'essai ${SITES}` : ''}`)
  M.familles = { video: familles, reference: base }

  // ── VA-1 : le HTML et les crédits ───────────────────────────────────────────────────────────────────────────────
  {
    const pages = ['index.html', ...fs.readdirSync(VID).filter((d) => /^menuisier-/.test(d) && fs.existsSync(path.join(VID, d, 'index.html'))).map((d) => `${d}/index.html`)]
    const avecVideo = pages.filter((p) => /<video\b/i.test(lire(path.join(VID, p))))
    faits.push(`VA-1 : ${pages.length} pages (accueil et communes), ${avecVideo.length} avec <video>`)
    if (pages.length < 2) noter('VA-1', `${pages.length} page(s) accueil et communes dans la génération`)
    if (avecVideo.length) noter('VA-1', `<video> dans le HTML de ${avecVideo.join(', ')} (l'élément est créé par video.js)`)
    const mentions = lire(path.join(VID, 'mentions-legales', 'index.html'))
    const lis = [...mentions.matchAll(/<ul class="credits">([\s\S]*?)<\/ul>/g)].flatMap((m) => m[1].split('</li>')).filter((l) => l.includes('<li'))
    const li = lis.find((l) => l.includes(`href="${esc(entree.source)}"`))
    if (!li) noter('VA-1', `aucune entrée des crédits des mentions légales ne lie la page du plan (${entree.source})`)
    else {
      const t = texteHtml(li), manque = []
      if (!/Images d[’']illustration/.test(t)) manque.push('« Images d’illustration »')
      for (const k of ['auteur', 'banque', 'licence']) if (!t.includes(entree[k])) manque.push(`${k} « ${entree[k]} »`)
      if (!li.includes(`href="${esc(entree.licenceUrl)}"`)) manque.push(`le lien du texte de la licence (${entree.licenceUrl})`)
      faits.push(`VA-1 : crédit des mentions légales « ${t.slice(0, 120)} »`)
      if (manque.length) noter('VA-1', `l'entrée de crédit du plan n'a pas ${manque.join(', ')}`)
    }
    // le garde : une copie sans atelier.h264.mp4 est refusée, rien n'est écrit
    const COPIE = path.join(T, 'garde'), SORTIE = path.join(T, 'garde-sortie')
    fs.mkdirSync(COPIE, { recursive: true })
    fs.copyFileSync(path.join(SITES, 'generer.mjs'), path.join(COPIE, 'generer.mjs'))
    for (const d of ['_kit', '_polices', 'lestraque']) fs.cpSync(path.join(SITES, d), path.join(COPIE, d), { recursive: true, filter: (s) => path.basename(s) !== 'atelier.h264.mp4' })
    const g = spawnSync(process.execPath, [path.join(COPIE, 'generer.mjs'), 'lestraque', `--sortie=${SORTIE}`, `--familles=${familles.join(',')}`], { cwd: R, encoding: 'utf8', timeout: 300000 })
    const message = `${g.stdout || ''}${g.stderr || ''}`.trim().split('\n').pop() || ''
    faits.push(`VA-1 : copie sans atelier.h264.mp4 → code ${g.status} (${message.slice(0, 120)})`)
    if (g.status === 0) noter('VA-1', 'une copie sans lestraque/video/atelier.h264.mp4 est générée (le crochet garde doit la refuser)')
    if (fs.existsSync(SORTIE)) noter('VA-1', 'la génération refusée a écrit dans --sortie')
    fs.rmSync(COPIE, { recursive: true, force: true })
  }

  // ── P : poids de la famille contre la référence ─────────────────────────────────────────────────────────────────
  {
    const bureau = br(path.join(VID, 'bureau.css')), js = br(path.join(VID, 'site.js')) - br(path.join(REF, 'site.js')), styles = br(path.join(VID, 'styles.css')) - br(path.join(REF, 'styles.css'))
    M.poids = { bureauCssBrotli: bureau, bureauCssBrotliEnPlus: bureau - br(path.join(REF, 'bureau.css')), siteJsBrotliEnPlus: js, stylesCssBrotliEnPlus: styles }
    faits.push(`P : brotli 11 — bureau.css ${bureau} o (+${bureau - br(path.join(REF, 'bureau.css'))}), site.js +${js} o, styles.css +${styles} o`)
    if (bureau > 6000) noter('P', `bureau.css ${bureau} octets en brotli, 6 000 au plus`)
    if (js > 2710) noter('P', `site.js +${js} octets en brotli, +2 710 au plus`)
    if (styles > 1000) noter('P', `styles.css +${styles} octets en brotli, +1 000 au plus`)
  }

  // ── navigateur ──────────────────────────────────────────────────────────────────────────────────────────────────
  const entetes = await entetesProduction()
  const srvV = await servir(VID, entetes), srvR = await servir(REF, entetes)
  const nav = await chromium.launch()
  const navigateurs = [nav]
  try {
    /** Une page neuve sur une copie : instrumentation avant la navigation, requêtes vidéo, erreurs et console relevées. */
    const ouvrir = async (copie, options = {}, { init = [], route = null, navigateur = nav } = {}) => {
      const ctx = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', ...options })
      const page = await ctx.newPage()
      const o = { ctx, page, copie, videos: [], requetes: [], erreurs: [], console: [], base: copie === 'video' ? srvV.base : srvR.base }
      if (options.javaScriptEnabled !== false) { await page.addInitScript(instrumentation); for (const f of init) await page.addInitScript(f) }
      if (route) await route(page)
      ctx.on('request', (q) => { const u = q.url(), t = Date.now(); o.requetes.push({ url: u, t }); if (estVideo(u, q.resourceType())) o.videos.push({ url: u, t, type: q.resourceType() }) })
      page.on('pageerror', (e) => o.erreurs.push(String(e.message).split('\n')[0].slice(0, 160)))
      page.on('console', (m) => { if (m.type() === 'error') o.console.push(m.text().split('\n')[0].slice(0, 160)) })
      await page.goto(`${o.base}/index.html`, { waitUntil: 'load', timeout: 90000 })
      o.load = Date.now()
      return o
    }
    const fermer = (o) => o.ctx.close().catch(() => {})
    const hautAtelier = (page) => page.evaluate(() => { const s = document.querySelector('#atelier'); return s ? Math.round(s.getBoundingClientRect().top + scrollY) : null })
    const ELEMENT = () => {
      const v = document.querySelector('video')
      if (!v) return null
      return { n: document.querySelectorAll('video').length, dansMedia: !!v.closest('#atelier .atelier__media'), classe: v.classList.contains('atelier__video'), muted: v.muted, loop: v.loop, playsInline: v.playsInline, preload: v.getAttribute('preload'), ariaHidden: v.getAttribute('aria-hidden'), tabindex: v.getAttribute('tabindex'), pip: v.hasAttribute('disablepictureinpicture'), src: v.getAttribute('src') || '', currentSrc: v.currentSrc, paused: v.paused, sources: [...v.querySelectorAll('source')].map((x) => ({ src: x.src, type: x.getAttribute('type') || '' })) }
    }
    /** Arrivée comme un visiteur : #atelier à un écran sous le haut, 600 ms, 12 pas de molette, puis #atelier en haut (±2 px). */
    const arriver = async (o) => {
      const { page } = o
      const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
      const y = await hautAtelier(page)
      if (y === null) throw new Error('aucune scène #atelier dans l\'accueil généré')
      await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.max(0, y - h))
      await page.waitForTimeout(600)
      await page.mouse.move(Math.round(w / 2), Math.round(h / 2))
      for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, Math.round(h / 12)); await page.waitForTimeout(40) }
      for (let k = 0; k < 15; k++) {
        const haut = await page.evaluate(() => document.querySelector('#atelier').getBoundingClientRect().top)
        if (Math.abs(haut) <= 2) break
        if (k < 10) await page.mouse.wheel(0, Math.round(haut)); else await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y)
        await page.waitForTimeout(80)
      }
      return page.evaluate(() => performance.now())
    }
    /** Instant de page du 1er événement `type` d'un <video>, attendu `ms` au plus ; null sinon. */
    const evenement = async (page, type, ms) => {
      const lire1 = () => page.evaluate((ty) => { const e = window.__va.ev.find((x) => x.type === ty && x.tag === 'VIDEO'); return e ? { t: e.t, src: e.src } : null }, type)
      const t = Date.now()
      for (;;) { const e = await lire1(); if (e || Date.now() - t >= ms) return e; await page.waitForTimeout(25) }
    }
    /** Un scénario qui rend { f: { id: [défauts] }, info } ; en défaut, il est rejoué une fois dans une page neuve après 2 s. */
    const essai = async (nom, ids, fn) => {
      const lancer = async () => { try { return await fn() } catch (e) { return { f: { [ids[0]]: [`mesure impossible (${String(e.message).split('\n')[0].slice(0, 160)})`] }, info: {} } } }
      let r = await lancer()
      const premier = Object.entries(r.f).find(([, l]) => l.length)
      if (premier) { faits.push(`${nom} : en défaut au 1er passage (${premier[0]} : ${premier[1][0]}) — remesuré après 2 s dans une page neuve`); await pause(2000); r = await lancer() }
      for (const [id, l] of Object.entries(r.f)) for (const x of l) noter(id, x)
      return r.info
    }

    // ── VA-2 et VA-3 : rien au chargement, préchargement à l'approche, départ et pause en défilement continu ──────────
    M.va2va3 = await essai('VA-2/VA-3', ['VA-2', 'VA-3'], async () => {
      const f = { 'VA-2': [], 'VA-3': [] }, info = {}
      const o = await ouvrir('video')
      try {
        const { page } = o
        await page.waitForTimeout(3000)
        info.requetesAvant = o.videos.map((v) => v.url)
        const domAvant = await page.evaluate(() => document.querySelectorAll('video').length)
        if (o.videos.length) f['VA-2'].push(`${o.videos.length} requête(s) vidéo dans les 3 s après load à y = 0 (${o.videos[0].url.replace(o.base, '')})`)
        if (domAvant) f['VA-2'].push(`${domAvant} video dans le DOM à y = 0, 3 s après load`)
        const yA = await hautAtelier(page)
        if (yA === null) { f['VA-2'].push('aucune scène #atelier'); return { f, info } }
        await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.max(0, yA - 1.5 * 900))
        let el = null
        const t = Date.now()
        while (Date.now() - t < 8000) { el = await page.evaluate(ELEMENT); if (el && o.videos.length) break; await page.waitForTimeout(100) }
        info.element = el
        info.requetesApproche = o.videos.map((v) => ({ url: v.url.replace(o.base, ''), type: v.type }))
        if (!el) f['VA-2'].push('aucun video créé en 8 s avec #atelier à moins d\'un écran')
        else {
          const pbs = []
          if (!el.classe || !el.dansMedia) pbs.push('pas video.atelier__video dans #atelier .atelier__media')
          if (!el.muted) pbs.push('muted faux'); if (!el.loop) pbs.push('loop faux'); if (!el.playsInline) pbs.push('playsinline faux')
          if (el.preload !== 'auto') pbs.push(`preload « ${el.preload} »`)
          if (el.ariaHidden !== 'true') pbs.push(`aria-hidden « ${el.ariaHidden} »`)
          if (el.tabindex !== '-1') pbs.push(`tabindex « ${el.tabindex} »`)
          if (!el.pip) pbs.push('sans disablepictureinpicture')
          if (el.n !== 1) pbs.push(`${el.n} éléments video`)
          if (pbs.length) f['VA-2'].push(`élément du §4.2 : ${pbs.join(', ')}`)
          const s = el.sources
          if (s.length !== 2 || !/\/video\/atelier\.av1\.mp4$/.test(s[0].src) || !/^video\/mp4/.test(s[0].type) || !/av01\./.test(s[0].type) || !/\/video\/atelier\.h264\.mp4$/.test(s[1].src) || !/^video\/mp4/.test(s[1].type) || !/avc1\./.test(s[1].type)) f['VA-2'].push(`sources ${JSON.stringify(s.map((x) => `${x.src.replace(o.base, '')} (${x.type})`))} : AV1 (av01) puis H.264 (avc1) attendues`)
          if ([el.src, el.currentSrc, ...s.map((x) => x.src)].some((u) => /^blob:/i.test(u))) f['VA-2'].push('URL blob: sur la vidéo')
        }
        if (!o.videos.length) f['VA-2'].push('aucune requête vidéo en 8 s avec #atelier à moins d\'un écran (chargée à l\'approche, §4.2)')
        else {
          if (!/\/video\/atelier\.av1\.mp4(\?|$)/.test(o.videos[0].url)) f['VA-2'].push(`1re requête vidéo ${o.videos[0].url.replace(o.base, '')}, l'AV1 attendu en premier`)
          const ailleurs = o.videos.filter((v) => new URL(v.url).origin !== o.base)
          if (ailleurs.length) f['VA-2'].push(`requête vidéo hors de l'origine : ${ailleurs[0].url.slice(0, 80)}`)
        }

        // VA-3 : défilement continu depuis là, jusqu'à ce que la scène soit sortie
        await page.mouse.move(720, 450)
        await page.evaluate(() => window.__va.demarrer())
        let changements = 0, dernier = null, tSous20 = null, tPasse = null
        const debut = Date.now()
        while (Date.now() - debut < 240000) {
          await page.mouse.wheel(0, 5)
          const e = await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => ok({ ...window.__va.mesure(), joue: window.__va.ev.some((x) => x.type === 'playing' && x.tag === 'VIDEO') }))))
          if (dernier !== null && e.y !== dernier) changements++
          dernier = e.y
          if (e.c !== null && e.c < 0.2 && e.y > yA) {
            if (e.joue && tSous20 === null) tSous20 = Date.now()
            if (!e.joue && tPasse === null) tPasse = Date.now()
          }
          if (tSous20 !== null && Date.now() - tSous20 >= 1200) break
          if (tPasse !== null && Date.now() - tPasse >= 3000) break
        }
        const ech = await page.evaluate(() => window.__va.arreter())
        const ev = await page.evaluate(() => window.__va.ev)
        info.changements = changements
        const tP = (ev.find((x) => x.type === 'playing' && x.tag === 'VIDEO') || {}).t ?? null
        const nv = Math.max(0, ...ech.map((s) => s.nv || 0))
        const sBoth = ech.find((s) => s.vb !== null && s.vb >= 0.98 && s.c >= 0.6)
        const sVerbe = ech.find((s) => s.vb !== null && s.vb >= 0.98), s60 = ech.find((s) => s.c >= 0.6)
        info.instants = { verbePlein: sVerbe ? Math.round(sVerbe.t) : null, scene60: s60 ? Math.round(s60.t) : null, lesDeux: sBoth ? Math.round(sBoth.t) : null, playing: tP === null ? null : Math.round(tP) }
        if (changements < 100) f['VA-3'].push(`défilement continu de ${changements} changements de scrollY (témoin : 100 au moins)`)
        if (!nv) f['VA-3'].push('aucun span.atelier__verbe dans #atelier (021-03)')
        if (tP === null) f['VA-3'].push('aucun playing en traversant l\'atelier')
        else {
          const sp = [...ech].reverse().find((s) => s.t <= tP)
          info.auPlaying = sp ? { couverture: +sp.c.toFixed(3), dernierVerbe: sp.vb === null ? null : +sp.vb.toFixed(3) } : null
          if (!sBoth || sBoth.t > tP) f['VA-3'].push(`playing à ${Math.round(tP)} ms, avant que le dernier verbe soit plein (${sVerbe ? Math.round(sVerbe.t) : '—'} ms) et la scène à 60 % (${s60 ? Math.round(s60.t) : '—'} ms)${sp ? ` ; au playing : scène ${(100 * sp.c).toFixed(0)} %, verbe ${sp.vb === null ? '—' : sp.vb.toFixed(2)}` : ''}`)
          const s20 = ech.find((s) => s.t > tP && s.c < 0.2 && s.y > yA)
          if (!s20) f['VA-3'].push('la scène n\'est jamais passée sous 20 % après la lecture')
          else {
            const sPause = ech.find((s) => s.t >= s20.t && s.p === true)
            info.pause = { sous20: Math.round(s20.t), paused: sPause ? Math.round(sPause.t) : null, delaiMs: sPause ? Math.round(sPause.t - s20.t) : null }
            if (!sPause) f['VA-3'].push(`paused jamais vrai après que la scène couvre < 20 % (${ech.filter((s) => s.t >= s20.t).length} images relevées${ech.some((s) => s.t >= s20.t && !s.v) ? ', élément retiré' : ''})`)
            else if (sPause.t - s20.t > 500) f['VA-3'].push(`pause ${Math.round(sPause.t - s20.t)} ms après que la scène couvre < 20 % (500 au plus)`)
          }
        }
        return { f, info }
      } finally { await fermer(o) }
    })
    faits.push(`VA-2 : ${M.va2va3.requetesAvant?.length ?? '—'} requête vidéo à y = 0 ; à l'approche ${JSON.stringify(M.va2va3.requetesApproche?.slice(0, 3) ?? [])}`)
    faits.push(`VA-3 : ${M.va2va3.changements ?? '—'} changements de scrollY ; verbe plein ${M.va2va3.instants?.verbePlein ?? '—'} ms, scène à 60 % ${M.va2va3.instants?.scene60 ?? '—'} ms, playing ${M.va2va3.instants?.playing ?? '—'} ms ; pause ${M.va2va3.pause?.delaiMs ?? '—'} ms après la sortie sous 20 %`)

    // ── VA-4 : conditions niées, une à la fois ────────────────────────────────────────────────────────────────────────
    M.va4 = {}
    for (const [nom, options, init] of [
      ['390×844', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, []],
      ['820×1180', { viewport: { width: 820, height: 1180 } }, []],
      ['mouvement réduit', { reducedMotion: 'reduce' }, []],
      ['économie de données', {}, [ECONOMIE]],
      ['JavaScript coupé', { javaScriptEnabled: false }, []],
    ]) {
      M.va4[nom] = await essai(`VA-4 ${nom}`, ['VA-4'], async () => {
        const f = { 'VA-4': [] }, info = {}
        const o = await ouvrir('video', options, { init })
        try {
          const { page } = o
          if (init.length && !(await page.evaluate(() => !!(navigator.connection && navigator.connection.saveData)))) { f['VA-4'].push(`${nom} : saveData n'est pas vrai dans la page (injection du juge)`); return { f, info } }
          const h = options.viewport?.height ?? 900
          const yA = await hautAtelier(page)
          if (yA === null) { f['VA-4'].push(`${nom} : aucune scène #atelier`); return { f, info } }
          for (const y of [yA - 1.5 * h, yA - 0.5 * h, yA]) { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), Math.max(0, Math.round(y))); await page.waitForTimeout(400) }
          await page.mouse.wheel(0, 10)
          const haut = await page.evaluate(() => document.querySelector('#atelier').getBoundingClientRect().top)
          if (haut < -12 || haut > h) f['VA-4'].push(`${nom} : défilement jusqu'à l'atelier impossible (haut à ${Math.round(haut)} px)`)
          let maxi = 0
          const t = Date.now()
          while (Date.now() - t < 8000) { maxi = Math.max(maxi, await page.evaluate(() => document.querySelectorAll('video').length)); await page.waitForTimeout(250) }
          if (options.javaScriptEnabled !== false) maxi = Math.max(maxi, await page.evaluate(() => window.__va.dom.filter((x) => x.type === 'ajout').length))
          info.requetes = o.videos.length; info.videos = maxi
          if (o.videos.length) f['VA-4'].push(`${nom} : ${o.videos.length} requête(s) vidéo (${o.videos[0].url.replace(o.base, '')})`)
          if (maxi) f['VA-4'].push(`${nom} : video dans le DOM`)
          return { f, info }
        } finally { await fermer(o) }
      })
    }
    faits.push(`VA-4 : ${Object.entries(M.va4).map(([n, i]) => `${n} ${i.requetes ?? '—'} requête, ${i.videos ?? '—'} video`).join(' ; ')}`)

    // ── VA-5 : sans requestIdleCallback ; VA-6 : H.264 seul dans Chrome de marque ────────────────────────────────────
    const jouerA = (id, ouvrirPage, verifier = () => null) => essai(id, [id], async () => {
      const f = { [id]: [] }, info = {}
      const o = await ouvrirPage()
      try {
        const { page } = o
        const pre = await verifier(o)
        if (pre) { f[id].push(pre); return { f, info } }
        await page.waitForTimeout(1000)
        const t0 = await arriver(o)
        await page.waitForTimeout(5500)
        const e = await page.evaluate(() => window.__va.ev.find((x) => x.type === 'playing' && x.tag === 'VIDEO') || null)
        const el = await page.evaluate(ELEMENT)
        info.delaiMs = e ? Math.round(e.t - t0) : null; info.currentSrc = el ? el.currentSrc.replace(o.base, '') : null; info.requetes = o.videos.map((v) => v.url.replace(o.base, ''))
        if (!e) f[id].push(`aucun playing en 5 s à l'atelier${el ? '' : ' (aucun élément video)'}`)
        else if (e.t - t0 > 5000) f[id].push(`playing ${Math.round(e.t - t0)} ms après l'arrivée à l'atelier (5 000 au plus)`)
        return { f, info, o, el }
      } finally { await fermer(o) }
    })
    M.va5 = await jouerA('VA-5', () => ouvrir('video', {}, { init: [SANS_IDLE] }), async (o) => ((await o.page.evaluate(() => 'requestIdleCallback' in window)) ? 'requestIdleCallback toujours présent malgré le script injecté (juge)' : null))
    faits.push(`VA-5 : sans requestIdleCallback, playing ${M.va5.delaiMs ?? '—'} ms après l'arrivée`)
    let chrome = null
    try { chrome = await chromium.launch({ channel: 'chrome' }); navigateurs.push(chrome) } catch (e) { noter('VA-6', `Chrome de marque absent ou impossible à lancer (${String(e.message).split('\n')[0].slice(0, 120)})`) }
    if (chrome) {
      M.va6 = await jouerA('VA-6', () => ouvrir('video', {}, { navigateur: chrome, route: (p) => p.route(/\/video\/atelier\.av1\.mp4(\?|$)/, (r) => r.abort('blockedbyclient')) }))
      if (M.va6.delaiMs !== null && M.va6.delaiMs !== undefined && !/\/video\/atelier\.h264\.mp4(\?|$)/.test(M.va6.currentSrc || '')) noter('VA-6', `currentSrc ${M.va6.currentSrc} : ce n'est pas le H.264 qui joue`)
      faits.push(`VA-6 : Chrome ${chrome.version()}, AV1 bloquée, playing ${M.va6.delaiMs ?? '—'} ms après l'arrivée, source ${M.va6.currentSrc ?? '—'}`)
    }

    // ── VA-8 : échec simulé ─────────────────────────────────────────────────────────────────────────────────────────
    M.va8 = await essai('VA-8', ['VA-8'], async () => {
      const f = { 'VA-8': [] }, info = {}
      const o = await ouvrir('video', {}, { route: (p) => p.route(/\/video\/atelier\.(av1|h264)\.mp4(\?|$)/, (r) => r.fulfill({ status: 404, body: '' })) })
      try {
        const { page } = o
        const t0 = await arriver(o)
        let etat
        for (;;) { etat = await page.evaluate(() => ({ t: performance.now(), n: document.querySelectorAll('video').length, dom: window.__va.dom })); if (etat.t >= t0 + 4500) break; await page.waitForTimeout(40) }
        const ajouts = etat.dom.filter((x) => x.type === 'ajout'), retraits = etat.dom.filter((x) => x.type === 'retrait')
        info.requetes404 = o.videos.length; info.cree = ajouts.length > 0; info.retraitMs = retraits.length ? Math.round(retraits[retraits.length - 1].t - t0) : null
        if (!o.videos.length) f['VA-8'].push('aucune requête vidéo : l\'échec n\'a pas pu être simulé')
        if (etat.n > 0) f['VA-8'].push(`video encore dans le DOM ${Math.round(etat.t - t0)} ms après l'arrivée (retirée en 4 500 ms au plus)`)
        else if (retraits.length && retraits[retraits.length - 1].t - t0 > 4500) f['VA-8'].push(`élément retiré ${Math.round(retraits[retraits.length - 1].t - t0)} ms après l'arrivée (4 500 au plus)`)
        const photo = await page.evaluate(() => {
          const img = document.querySelector('#atelier .atelier__media img')
          if (!img) return null
          const cs = getComputedStyle(img), r = img.getBoundingClientRect()
          return { op: window.__va.op(img), vis: cs.visibility, disp: cs.display, l: r.width, w: innerWidth, etat: cs.animationPlayState, anims: img.getAnimations().map((a) => ({ nom: a.animationName || '', etat: a.playState })) }
        })
        info.photo = photo
        if (!photo) f['VA-8'].push('aucune photo dans #atelier .atelier__media')
        else {
          if (photo.op < 0.98 || photo.vis !== 'visible' || photo.disp === 'none' || photo.l < 0.9 * photo.w) f['VA-8'].push(`photo non visible après l'échec (opacité ${photo.op.toFixed(2)}, ${photo.vis}, ${photo.disp}, ${Math.round(photo.l)} px)`)
          if (!photo.anims.some((a) => a.nom === 'derive' && a.etat === 'running') || /paused/.test(photo.etat)) f['VA-8'].push(`dérive de la photo inactive après l'échec (${JSON.stringify(photo.anims)}, animation-play-state ${photo.etat})`)
        }
        return { f, info }
      } finally { await fermer(o) }
    })
    faits.push(`VA-8 : ${M.va8.requetes404 ?? '—'} requête(s) en 404, élément ${M.va8.cree ? `créé puis retiré à ${M.va8.retraitMs} ms de l'arrivée` : 'jamais créé'} ; photo ${M.va8.photo ? `à ${M.va8.photo.op?.toFixed(2)}, dérive ${JSON.stringify(M.va8.photo.anims)}` : '—'}`)

    // ── pendant la lecture : VA-10 et VA-12 (1440×900), VA-9 (trois formats), VA-7 (1440×900) ─────────────────────────
    const htmlRef = lire(path.join(REF, 'index.html'))
    const sceneRef = (() => { const i = htmlRef.indexOf('id="atelier"'); return i < 0 ? '' : htmlRef.slice(htmlRef.lastIndexOf('<section', i), htmlRef.indexOf('</section>', i)) })()
    const contactsRef = (sceneRef.match(/<a\b[^>]*href="[^"]*#contact[^"]*"/g) || []).length
    const VOILE = () => { const m = document.querySelector('#atelier .atelier__media'); if (!m) return null; const a = getComputedStyle(m, '::after'), b = getComputedStyle(m, '::before'); return { after: `${a.content}|${a.backgroundImage}|${a.backgroundColor}|${a.opacity}`, before: `${b.content}|${b.backgroundImage}|${b.backgroundColor}|${b.opacity}`, filtre: getComputedStyle(m).filter } }
    const lecture = (l, h, seuil, complet) => essai(`lecture ${l}×${h}`, complet ? ['VA-9', 'VA-10', 'VA-12', 'VA-7'] : ['VA-9'], async () => {
      const f = { 'VA-9': [], ...(complet ? { 'VA-10': [], 'VA-12': [], 'VA-7': [] } : {}) }, info = {}
      const oR = await ouvrir('reference', { viewport: { width: l, height: h } })
      let voileRef, erreursRef
      try { await arriver(oR); await oR.page.waitForTimeout(3000); voileRef = await oR.page.evaluate(VOILE); erreursRef = { csp: await oR.page.evaluate(() => window.__va.csp), console: oR.console, page: oR.erreurs } } finally { await fermer(oR) }
      const o = await ouvrir('video', { viewport: { width: l, height: h } })
      try {
        const { page } = o
        await page.waitForTimeout(1000)
        const t0 = await arriver(o)
        const e = await evenement(page, 'playing', 6000)
        if (!e) { for (const id of Object.keys(f)) f[id].push(`${l}×${h} : aucune lecture à l'atelier en 6 s, rien de mesurable`); return { f, info } }
        await page.waitForTimeout(1200)
        info.playingMs = Math.round(e.t - t0)
        await page.evaluate(() => { const V = window.__va; V.actions = []; addEventListener('click', () => V.actions.push(performance.now()), true); addEventListener('keydown', (k) => { if (k.key === 'Enter') V.actions.push(performance.now()) }, true) })

        if (complet) {
          // VA-10 : 3 s sans défiler
          const releve = () => page.evaluate(() => {
            const s = document.querySelector('#atelier'), v = s.querySelector('video'), img = s.querySelector('.atelier__media img')
            const auTemps = document.getAnimations().filter((a) => a.timeline === document.timeline && a.playState === 'running' && a.effect && a.effect.target && s.contains(a.effect.target) && a.effect.target !== v)
            const suivis = [...s.querySelectorAll('.atelier__verbe'), ...(img ? [img] : []), ...[...s.querySelectorAll('*')].filter((x) => /glisse-cadre/.test(getComputedStyle(x).animationName))]
            return { auTemps: auTemps.map((a) => `${a.animationName || a.transitionProperty || a.constructor.name} sur ${String(a.effect.target.className || a.effect.target.tagName).slice(0, 40)}`), derive: img ? img.getAnimations().filter((a) => a.animationName === 'derive').map((a) => a.playState) : [], boites: suivis.map((x) => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, window.__va.op(x)] }), paused: v ? v.paused : null }
          })
          const releves = []
          for (let k = 0; k < 4; k++) { releves.push(await releve()); if (k < 3) await page.waitForTimeout(1000) }
          const auTemps = [...new Set(releves.flatMap((r) => r.auTemps))]
          let bouge = 0, pale = 0
          for (const r of releves) r.boites.forEach((b, i) => { const b0 = releves[0].boites[i]; if (!b0) return; bouge = Math.max(bouge, ...[0, 1, 2, 3].map((j) => Math.abs(b[j] - b0[j]))); pale = Math.max(pale, Math.abs(b[4] - b0[4])) })
          info.va10 = { auTemps, derive: releves[0].derive, suivis: releves[0].boites.length, bougePx: +bouge.toFixed(2), opacite: +pale.toFixed(3) }
          if (auTemps.length) f['VA-10'].push(`${auTemps.length} animation(s) au temps dans #atelier pendant la lecture : ${auTemps.slice(0, 3).join(', ')}`)
          if (!releves[0].derive.length || releves.some((r) => r.derive.some((x) => x !== 'paused'))) f['VA-10'].push(`dérive de la photo pas en pause pendant la lecture (${JSON.stringify(releves.map((r) => r.derive))})`)
          if (bouge > 0.5 || pale > 0.01) f['VA-10'].push(`verbes, photo ou glisse-cadre bougent sans défilement (${bouge.toFixed(2)} px, opacité ${pale.toFixed(3)})`)
          if (releves.some((r) => r.paused !== false)) f['VA-10'].push('la vidéo ne joue plus pendant les 3 s')

          // VA-12 : jusqu'à 10 s de lecture
          const joue = await page.evaluate((tp) => performance.now() - tp, e.t)
          if (joue < 10000) await page.waitForTimeout(Math.ceil(10000 - joue))
          const csp = await page.evaluate(() => window.__va.csp)
          const deja = (x, liste) => liste.includes(x)
          const nouveaux = [...csp.filter((x) => !deja(x, erreursRef.csp)).map((x) => `violation CSP ${x}`), ...o.console.filter((x) => !deja(x, erreursRef.console)).map((x) => `console : ${x}`), ...o.erreurs.filter((x) => !deja(x, erreursRef.page)).map((x) => `exception : ${x}`)]
          info.va12 = { csp, console: o.console, exceptions: o.erreurs, reference: erreursRef, lectureMs: Math.round(await page.evaluate((tp) => performance.now() - tp, e.t)) }
          if (nouveaux.length) f['VA-12'].push(`${nouveaux.length} en ${Math.round(info.va12.lectureMs / 1000)} s de lecture : ${nouveaux.slice(0, 3).join(' · ')}`)
        }

        // VA-9 : 8 captures pendant la lecture, texte de la phrase rendu transparent
        const geo = await page.evaluate(() => {
          const s = document.querySelector('#atelier'), v = s.querySelector('video'), m = s.querySelector('.atelier__media'), rects = []
          for (const p of s.querySelectorAll('.atelier__phrase')) {
            const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
            for (let n = w.nextNode(); n; n = w.nextNode()) for (const mot of n.textContent.matchAll(/\S+/g)) { const r = document.createRange(); r.setStart(n, mot.index); r.setEnd(n, mot.index + mot[0].length); for (const b of r.getClientRects()) if (b.width > 0 && b.height > 0) rects.push({ x: b.left, y: b.top, l: b.width, h: b.height }) }
          }
          return { rects, filtreVideo: v ? getComputedStyle(v).filter : null, melange: v ? getComputedStyle(v).mixBlendMode : null, vo: v ? window.__va.op(v) : null, filtreMedia: getComputedStyle(m).filter }
        })
        const voile = await page.evaluate(VOILE)
        info.va9 = { voileIdentique: JSON.stringify(voile) === JSON.stringify(voileRef), filtreVideo: geo.filtreVideo, opaciteVideo: geo.vo }
        if (geo.filtreVideo !== 'none' || geo.filtreMedia !== 'none' || (geo.melange && geo.melange !== 'normal')) f['VA-9'].push(`${l}×${h} : image assombrie ou filtrée (filter ${geo.filtreVideo} / ${geo.filtreMedia}, mix-blend-mode ${geo.melange})`)
        if (JSON.stringify(voile) !== JSON.stringify(voileRef)) f['VA-9'].push(`${l}×${h} : voile de .atelier__media différent de la référence (${JSON.stringify(voile).slice(0, 120)})`)
        if (!(geo.vo >= 0.98)) f['VA-9'].push(`${l}×${h} : vidéo à ${Number(geo.vo).toFixed(2)} d'opacité effective après le fondu (0,98 au moins)`)
        // une sortie anticipée ne laisse jamais VA-7 passer sans avoir été mesuré
        const abandon = (motif) => { f['VA-9'].push(`${l}×${h} : ${motif}`); if (complet) f['VA-7'].push(`non mesuré (${motif})`); return { f, info } }
        if (!geo.rects.length) return abandon('aucune boîte de mot dans .atelier__phrase')
        const x0 = Math.max(0, Math.floor(Math.min(...geo.rects.map((b) => b.x)))), y0 = Math.max(0, Math.floor(Math.min(...geo.rects.map((b) => b.y))))
        const x1 = Math.min(l, Math.ceil(Math.max(...geo.rects.map((b) => b.x + b.l)))), y1 = Math.min(h, Math.ceil(Math.max(...geo.rects.map((b) => b.y + b.h))))
        if (x1 <= x0 || y1 <= y0) return abandon('la phrase est hors de l\'écran')
        const zone = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, masque = new Uint8Array(zone.width * zone.height)
        for (const b of geo.rects) for (let py = 0; py < zone.height; py++) { const cy = y0 + py + 0.5; if (cy < b.y || cy > b.y + b.h) continue; for (let px = 0; px < zone.width; px++) { const cx = x0 + px + 0.5; if (cx >= b.x && cx <= b.x + b.l) masque[py * zone.width + px] = 1 } }
        await page.addStyleTag({ content: '#atelier .atelier__phrase,#atelier .atelier__phrase *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}' })
        const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
        const captures = []
        for (let k = 0; k < 8; k++) {
          await page.waitForTimeout(k ? 900 : 100)
          const etat = await page.evaluate(() => { const v = document.querySelector('#atelier video'); return v ? { p: v.paused, ct: v.currentTime } : null })
          const png = await page.screenshot({ clip: zone, type: 'png' })
          const { data, info: im } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
          const Ls = []
          for (let i = 0, j = 0; i < masque.length && j < data.length; i++, j += im.channels) if (masque[i]) Ls.push(0.2126 * lin(data[j]) + 0.7152 * lin(data[j + 1]) + 0.0722 * lin(data[j + 2]))
          Ls.sort((a, b) => a - b)
          captures.push({ contraste: +(1.05 / (Ls[Math.floor(0.9 * (Ls.length - 1))] + 0.05)).toFixed(3), temps: etat ? +etat.ct.toFixed(2) : null, joue: etat ? !etat.p : false, gris: await sharp(png).resize(160, Math.max(1, Math.round(160 * zone.height / zone.width)), { fit: 'fill' }).greyscale().raw().toBuffer() })
        }
        let d15 = 0; for (let i = 0; i < captures[0].gris.length; i++) d15 += Math.abs(captures[0].gris[i] - captures[4].gris[i])
        d15 /= captures[0].gris.length * 255
        const pire = captures.reduce((m, c) => (c.contraste < m.contraste ? c : m), captures[0])
        info.va9 = { ...info.va9, zone, pixels: masque.reduce((s, v) => s + v, 0), captures: captures.map(({ gris, ...c }) => c), ecart1a5: +d15.toFixed(4) }
        if (captures.some((c) => !c.joue)) f['VA-9'].push(`${l}×${h} : la vidéo ne joue pas à toutes les captures`)
        if (d15 <= 0.002) f['VA-9'].push(`${l}×${h} : captures 1 et 5 identiques (écart ${d15.toFixed(4)}) : la vidéo ne se voit pas bouger sous la phrase`)
        if (pire.contraste < seuil) f['VA-9'].push(`${l}×${h} : contraste de la phrase ${pire.contraste.toFixed(2)} à ${pire.temps} s de la vidéo, ${String(seuil).replace('.', ',')} au moins à chaque capture`)
        if (!complet) return { f, info }

        // VA-7 : le bouton pause, au clic puis à Entrée
        const B = page.locator('#atelier button.atelier__pause')
        const dansScene = page.locator('#atelier')
        const nb = await B.count()
        if (nb !== 1) { f['VA-7'].push(`${nb} button.atelier__pause dans #atelier (1 attendu)`); return { f, info } }
        const b = await B.evaluate((x) => { const s = document.querySelector('#atelier').getBoundingClientRect(), r = x.getBoundingClientRect(), cs = getComputedStyle(x); return { tag: x.tagName, lien: !!x.closest('a') || !!x.querySelector('a'), visible: r.width > 0 && r.height > 0 && cs.visibility === 'visible' && !x.hidden && window.__va.op(x) >= 0.5, droite: r.left + r.width / 2 >= s.left + s.width / 2, bas: r.top + r.height / 2 >= s.top + s.height / 2 } })
        const contacts = await page.locator('#atelier a[href*="#contact"]').count()
        info.va7 = { bouton: b, contacts, contactsRef }
        if (b.tag !== 'BUTTON' || b.lien) f['VA-7'].push('le contrôle n\'est pas un <button> hors de tout lien')
        if (!b.visible) f['VA-7'].push('bouton invisible pendant la lecture')
        if (!b.droite || !b.bas) f['VA-7'].push('bouton hors du coin bas droit de la scène')
        if (contacts !== contactsRef) f['VA-7'].push(`${contacts} a[href*="#contact"] dans #atelier, ${contactsRef} dans la référence`)
        const etatBouton = async () => ({ ...(await page.evaluate(() => { const x = document.querySelector('#atelier button.atelier__pause'), v = document.querySelector('#atelier video'); return { paused: v ? v.paused : null, pressed: x ? x.getAttribute('aria-pressed') : null } })), pause: await dansScene.getByRole('button', { name: NOM_PAUSE, exact: true }).count(), relance: await dansScene.getByRole('button', { name: NOM_RELANCE, exact: true }).count() })
        const coherent = (s, enPause) => (enPause ? s.paused === true && s.pressed === 'true' && s.relance === 1 && s.pause === 0 : s.paused === false && s.pressed === 'false' && s.pause === 1 && s.relance === 0)
        const basculer = async (voulu, geste) => {
          const p = page.evaluate((v) => new Promise((ok) => { const t0 = performance.now(); const tic = () => { const x = document.querySelector('#atelier video'); if (x && x.paused === v) return ok(performance.now()); if (performance.now() - t0 > 3000) return ok(null); requestAnimationFrame(tic) }; tic() }), voulu)
          await geste()
          const tEtat = await p, tAct = await page.evaluate(() => window.__va.actions[window.__va.actions.length - 1] ?? null)
          await page.waitForTimeout(80)
          return { delai: tEtat === null || tAct === null ? null : Math.round(tEtat - tAct), etat: await etatBouton() }
        }
        const s0 = await etatBouton()
        if (!coherent(s0, false)) f['VA-7'].push(`en lecture : ${JSON.stringify(s0)} (aria-pressed="false", nom « ${NOM_PAUSE} »)`)
        const etapes = []
        for (const [nom, voulu, geste] of [
          ['clic', true, () => B.click()], ['2e clic', false, () => B.click()],
          ['Entrée', true, async () => { await B.focus(); await page.keyboard.press('Enter') }], ['2e Entrée', false, () => page.keyboard.press('Enter')],
        ]) {
          const r = await basculer(voulu, geste)
          etapes.push({ nom, ...r })
          if (r.delai === null || r.delai > 250) f['VA-7'].push(`${nom} : paused ${voulu} ${r.delai === null ? 'jamais atteint' : `en ${r.delai} ms`} (250 au plus)`)
          else if (!coherent(r.etat, voulu)) f['VA-7'].push(`${nom} : ${JSON.stringify(r.etat)} (aria-pressed="${voulu}", nom « ${voulu ? NOM_RELANCE : NOM_PAUSE} »)`)
        }
        info.va7.etapes = etapes
        return { f, info }
      } finally { await fermer(o) }
    })
    M.lecture = {}
    for (const [l, h, seuil] of [[1440, 900, 3.0], [1280, 800, 3.0], [1088, 800, 4.5]]) M.lecture[`${l}x${h}`] = await lecture(l, h, seuil, l === 1440)
    const L1440 = M.lecture['1440x900'] || {}
    faits.push(`VA-9 : contraste minimal ${Object.entries(M.lecture).map(([k, i]) => `${k} ${i.va9?.captures ? Math.min(...i.va9.captures.map((c) => c.contraste)).toFixed(2) : '—'} (écart des captures ${i.va9?.ecart1a5 ?? '—'})`).join(' ; ')}`)
    faits.push(`VA-10 : ${L1440.va10 ? `${L1440.va10.auTemps.length} animation au temps, dérive ${JSON.stringify(L1440.va10.derive)}, ${L1440.va10.suivis} éléments suivis bougent de ${L1440.va10.bougePx} px` : '—'}`)
    faits.push(`VA-12 : ${L1440.va12 ? `${L1440.va12.csp.length} violation, ${L1440.va12.console.length} erreur de console, ${L1440.va12.exceptions.length} exception en ${Math.round(L1440.va12.lectureMs / 1000)} s de lecture` : '—'}`)
    faits.push(`VA-7 : ${L1440.va7?.etapes ? L1440.va7.etapes.map((x) => `${x.nom} ${x.delai ?? '—'} ms`).join(', ') : '—'}`)

    // ── VA-11 : requêtes du téléphone jusqu'à load, contre la référence ───────────────────────────────────────────────
    M.va11 = await essai('VA-11 requêtes', ['VA-11'], async () => {
      const f = { 'VA-11': [] }, info = {}
      const sansCache = async (p) => { const c = await p.context().newCDPSession(p); await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true }) }
      const liste = {}
      for (const copie of ['video', 'reference']) {
        const o = await ouvrir(copie, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, { route: sansCache })
        try { liste[copie] = o.requetes.filter((q) => q.t <= o.load).map((q) => new URL(q.url).pathname).sort() } finally { await fermer(o) }
      }
      const compte = (l) => l.reduce((m, p) => m.set(p, (m.get(p) || 0) + 1), new Map())
      const cv = compte(liste.video), cr = compte(liste.reference)
      const enPlus = [...cv].flatMap(([p, n]) => Array(Math.max(0, n - (cr.get(p) || 0))).fill(p)).filter((p) => !(p === '/bureau.css' && !cr.has('/bureau.css')))
      const enMoins = [...cr].flatMap(([p, n]) => Array(Math.max(0, n - (cv.get(p) || 0))).fill(p))
      info.video = liste.video.length; info.reference = liste.reference.length; info.enPlus = enPlus; info.enMoins = enMoins
      if (enPlus.length || enMoins.length) f['VA-11'].push(`téléphone : ${liste.video.length} requêtes jusqu'à load, ${liste.reference.length} dans la référence${enPlus.length ? ` ; en plus : ${enPlus.slice(0, 4).join(', ')}` : ''}${enMoins.length ? ` ; en moins : ${enMoins.slice(0, 4).join(', ')}` : ''}`)
      return { f, info }
    })
    faits.push(`VA-11 : téléphone, ${M.va11.video ?? '—'} requêtes jusqu'à load (référence ${M.va11.reference ?? '—'})`)

    // ── PR : le film et la capture du juge, pour l'œil ─────────────────────────────────────────────────────────────
    try {
      const FILM = path.join(T, 'film')
      const o = await ouvrir('video', { recordVideo: { dir: FILM, size: { width: 1440, height: 900 } } })
      let brut = null
      try {
        const { page } = o
        await page.waitForTimeout(800)
        await arriver(o)
        const e = await evenement(page, 'playing', 6000)
        await page.waitForTimeout(3000)
        fs.mkdirSync(PREUVE, { recursive: true })
        await page.screenshot({ path: path.join(PREUVE, 'atelier-lecture.jpg'), type: 'jpeg', quality: 82 })
        await page.waitForTimeout(6000)
        const B = page.locator('#atelier button.atelier__pause')
        if (e && (await B.count()) === 1) { await B.click(); await page.waitForTimeout(1500); await B.click(); await page.waitForTimeout(1500) }
        brut = page.video()
      } finally { await fermer(o) }
      const webm = brut ? await brut.path() : null
      const mp4 = path.join(PREUVE, 'atelier-film.mp4')
      const r = webm ? spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', webm, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4], { encoding: 'utf8', timeout: 300000 }) : { status: 1, stderr: 'aucun enregistrement' }
      if (r.status !== 0) noter('PR', `atelier-film.mp4 non encodé (${String(r.stderr || '').trim().split('\n').pop()})`)
      const duree = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).stdout || 0)
      const milieu = path.join(T, 'film-milieu.png')
      if (duree > 0) spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(duree * 0.75), '-i', mp4, '-frames:v', '1', milieu], { encoding: 'utf8', timeout: 60000 })
      for (const [nom, f] of [['atelier-film.mp4 (image aux trois quarts)', milieu], ['atelier-lecture.jpg', path.join(PREUVE, 'atelier-lecture.jpg')]]) {
        if (taille(f) <= 0) { noter('PR', `${nom} absente ou vide`); continue }
        const st = await sharp(f).greyscale().stats()
        if (st.channels[0].stdev < 8) noter('PR', `${nom} unie (écart-type ${st.channels[0].stdev.toFixed(1)})`)
      }
      if (taille(mp4) <= 0) noter('PR', 'atelier-film.mp4 vide')
      M.preuves = { film: { octets: taille(mp4), duree: +duree.toFixed(2) }, capture: taille(path.join(PREUVE, 'atelier-lecture.jpg')) }
      faits.push(`PR : ${path.relative(R, PREUVE).split(path.sep).join('/')}/ — atelier-film.mp4 (${duree.toFixed(1)} s, ${taille(mp4)} octets), atelier-lecture.jpg, mesures.json`)
    } catch (e) { noter('PR', `film du juge impossible (${String(e.message).split('\n')[0].slice(0, 160)})`) }
  } finally {
    for (const n of navigateurs) await n.close().catch(() => {})
    await srvV.fermer(); await srvR.fermer()
  }

  // ── VA-11 : Lighthouse mobile, 5 passes, navigateurs et serveurs fermés ───────────────────────────────────────────
  if (process.argv.includes('--essai-sans-lighthouse')) noter('VA-11', 'Lighthouse non mesuré (--essai-sans-lighthouse)')
  else {
    const resume = path.join(T, 'lighthouse.json')
    const lh = spawnSync(process.execPath, [path.join(R, 'scripts', 'lighthouse-mediane.mjs'), VID, `--resume=${resume}`], { cwd: R, encoding: 'utf8', timeout: 1500000, maxBuffer: 1 << 26 })
    const ligne = `${lh.stdout || ''}${lh.stderr || ''}`.trim().split('\n').pop() || `code ${lh.status}`
    faits.push(`VA-11 : Lighthouse — ${ligne.slice(0, 200)}`)
    if (lh.status !== 0) noter('VA-11', `Lighthouse mobile hors barre ou impossible (code ${lh.status} : ${ligne.slice(0, 160)})`)
    try { fs.mkdirSync(PREUVE, { recursive: true }); fs.copyFileSync(resume, path.join(PREUVE, 'lighthouse.json')) } catch { /* résumé absent : consigné par la ligne */ }
  }
}

try { await principal() } catch (e) { echecs.push(`juge interrompu : ${String(e?.message || e).split('\n')[0].slice(0, 240)}`) }
fin()
process.exit()
