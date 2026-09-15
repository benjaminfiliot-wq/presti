// scripts/lib/survol-banc.mjs — le banc de mesure du juge de la révélation au survol (scripts/survol-qa.mjs, tâche 021-06).
// Génération isolée, serveur brotli avec les en-têtes de production, instrumentation injectée avant la navigation, relevés
// dans la page et géométrie des vignettes. Rien ici ne décide d'un verdict : le juge compare aux seuils du cahier.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// --sources=<copie de public/sites-demo> : essai du juge par Claude Code sur une famille prototype, sans toucher à public/
const argSources = process.argv.find((a) => a.startsWith('--sources='))
export const DEMOS = argSources ? path.resolve(argSources.slice('--sources='.length)) : path.join(R, 'public', 'sites-demo')

/** node public/sites-demo/generer.mjs lestraque --sortie=<dossier> --familles=<liste> ; jamais en place. */
export function generer(sortie, familles) {
  const r = spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque', `--sortie=${sortie}`, `--familles=${familles.join(',')}`], { cwd: R, encoding: 'utf8', timeout: 240000 })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`.trim() }
}

/** Les en-têtes de la route des démos, lus dans next.config.mjs (même traitement que lighthouse-mediane.mjs). */
export async function entetesProduction() {
  const conf = (await import(pathToFileURL(path.join(R, 'next.config.mjs')).href)).default
  const strict = (await conf.headers()).find((r) => r.source.startsWith('/((?!site'))
  const entetes = strict.headers.filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => (h.key === 'Content-Security-Policy' ? { key: h.key, value: h.value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ') } : h))
  if (!entetes.some((h) => h.key === 'Content-Security-Policy')) throw new Error('CSP absente de la route stricte de next.config.mjs')
  return entetes
}

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', mp4: 'video/mp4' }
const TEXTES = new Set(['html', 'css', 'js', 'json', 'svg', 'xml', 'txt'])

/** Sert `dossier` (repli sur public/sites-demo pour ce qui manque), en brotli 11, avec les en-têtes de production. */
export async function servir(dossier, entetes) {
  const cache = new Map()
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
    let f = path.join(dossier, p); if (!fs.existsSync(f)) f = path.join(DEMOS, p)
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
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
  return { base: `http://127.0.0.1:${srv.address().port}`, fermer: () => new Promise((ok) => srv.close(ok)) }
}

/** Injecté avant tout script de la page : écouteurs, rAF, CSP, journal du pointeur, relevés des vignettes. */
export function instrumentation() {
  const S = (window.__survol = { ecouteurs: [], raf: 0, csp: [], pointeurs: [], focus: [], touches: [] })
  const ajouter = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (type, fn, opt) {
    if (['pointermove', 'scroll', 'wheel', 'touchmove'].includes(type)) S.ecouteurs.push({ type, passive: !!(opt && typeof opt === 'object' && opt.passive === true), cible: this === window ? 'window' : this === document ? 'document' : String(this.nodeName || '?').toLowerCase() })
    return ajouter.call(this, type, fn, opt)
  }
  const raf = window.requestAnimationFrame
  window.requestAnimationFrame = function (cb) { S.raf++; return raf.call(window, cb) }
  ajouter.call(document, 'securitypolicyviolation', (e) => S.csp.push(`${e.violatedDirective} ${e.blockedURI}`), true)
  ajouter.call(window, 'pointermove', (e) => { S.pointeurs.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }); if (S.pointeurs.length > 400) S.pointeurs.splice(0, 200) }, { capture: true, passive: true })
  ajouter.call(document, 'focusin', (e) => S.focus.push({ t: e.timeStamp, bouton: !!(e.target.matches && e.target.matches('button.presta__declencheur')), rang: [...document.querySelectorAll('button.presta__declencheur')].indexOf(e.target) }), true)
  ajouter.call(document, 'keydown', (e) => S.touches.push({ t: e.timeStamp, touche: e.key }), true)
  const px = (v, ref) => (/%$/.test(v) ? (parseFloat(v) / 100) * ref : parseFloat(v) || 0)
  // clip-path calculé → la part visible de la boîte (fraction d'aire) et le rectangle visible dans le repère de la boîte
  const decoupe = (cp, w, h) => {
    if (!cp || cp === 'none') return { part: 1, t: 0, r: 0, b: 0, l: 0, forme: 'none' }
    let m = /^inset\((.*)\)$/.exec(cp.trim())
    if (m) {
      const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
      const [t, r = t, b = t, l = r] = v
      const T = px(t, h), Rr = px(r, w), B = px(b, h), L = px(l, w)
      const lw = Math.max(0, w - L - Rr), lh = Math.max(0, h - T - B)
      return { part: w && h ? (lw * lh) / (w * h) : 0, t: T, r: Rr, b: B, l: L, forme: 'inset' }
    }
    m = /^polygon\((.*)\)$/.exec(cp.trim())
    if (m) {
      const pts = m[1].replace(/^(nonzero|evenodd),/, '').split(',').map((c) => { const [x, y] = c.trim().split(/\s+/); return [px(x, w), px(y, h)] })
      let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1 }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
      return { part: w && h ? Math.abs(a / 2) / (w * h) : 0, t: Math.max(0, Math.min(...ys)), l: Math.max(0, Math.min(...xs)), r: Math.max(0, w - Math.max(...xs)), b: Math.max(0, h - Math.max(...ys)), forme: 'polygon' }
    }
    return { part: 1, t: 0, r: 0, b: 0, l: 0, forme: cp.slice(0, 20) }
  }
  const angle = (cs) => {
    let a = 0
    const rot = cs.rotate && cs.rotate !== 'none' ? /(-?[\d.]+)(deg|rad|turn)\s*$/.exec(cs.rotate) : null
    if (rot) a += rot[2] === 'rad' ? (Number(rot[1]) * 180) / Math.PI : rot[2] === 'turn' ? Number(rot[1]) * 360 : Number(rot[1])
    if (cs.transform && cs.transform !== 'none') { const m = new DOMMatrixReadOnly(cs.transform); a += (Math.atan2(m.b, m.a) * 180) / Math.PI }
    return a
  }
  window.__survolMesure = () => {
    const lis = [...document.querySelectorAll('#prestations ol.presta > li.presta__ligne')]
    return {
      t: performance.now(),
      v: lis.map((li) => {
        const v = li.querySelector('.presta__vignette')
        if (!v) return null
        const cs = getComputedStyle(v)
        let op = 1, cache = cs.display === 'none'
        for (let n = v; n && n.nodeType === 1; n = n.parentElement) { const c = n === v ? cs : getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') cache = true; op *= Number(c.opacity) }
        const w = parseFloat(cs.width) + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)
        const h = parseFloat(cs.height) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
        const r = v.getBoundingClientRect(), d = decoupe(cs.clipPath, w, h), img = v.querySelector('img')
        return { f: cache ? 0 : d.part * op, op, part: d.part, forme: d.forme, clip: [d.t, d.r, d.b, d.l], w: w || 0, h: h || 0, cx: r.left + r.width / 2, cy: r.top + r.height / 2, a: angle(cs), img: img ? { complet: img.complete, src: img.currentSrc } : null }
      }),
    }
  }
  window.__survolSerie = (duree, pas) => new Promise((ok) => {
    const s = [], t0 = performance.now(), n0 = S.pointeurs.length
    const tic = () => { s.push(window.__survolMesure()); if (performance.now() - t0 >= duree) { clearInterval(id); ok({ t0, echantillons: s, pointeurs: S.pointeurs.slice(Math.min(n0, S.pointeurs.length)) }) } }
    const id = setInterval(tic, pas); tic()
  })
  window.__survolBoites = () => {
    const rr = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } }
    const sec = document.querySelector('#prestations'), ol = sec && sec.querySelector('ol.presta')
    return {
      section: rr(sec), liste: rr(ol), barre: rr(document.querySelector('header')),
      lignes: [...document.querySelectorAll('#prestations ol.presta > li.presta__ligne')].map((li) => {
        const h3 = li.querySelector('h3'), mots = []
        if (h3) { const tw = document.createTreeWalker(h3, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.data.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const x of rg.getClientRects()) if (x.width > 0 && x.height > 0) mots.push({ l: x.left, t: x.top, r: x.right, b: x.bottom }) } }
        return { li: rr(li), texte: rr(li.querySelector('.presta__texte')), num: rr(li.querySelector('.presta__num')), h3: mots, titre: h3 ? h3.textContent.replace(/\s+/g, ' ').trim() : '' }
      }),
    }
  }
}

/** Sans JavaScript de page (aucun minuteur) : fraction ouverte et boîte de la vignette de la ligne k, lue d'un coup. */
export function vignetteSansJs(k) {
  const li = document.querySelectorAll('#prestations ol.presta > li.presta__ligne')[k], v = li && li.querySelector('.presta__vignette')
  if (!v) return { f: 0, boite: null }
  const cs = getComputedStyle(v), r = v.getBoundingClientRect()
  let op = 1, cache = false
  for (let n = v; n && n.nodeType === 1; n = n.parentElement) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') cache = true; op *= Number(c.opacity) }
  let part = 1
  const m = /^inset\((.*)\)$/.exec(cs.clipPath || '')
  if (m) {
    const px = (x, ref) => (/%$/.test(x) ? (parseFloat(x) / 100) * ref : parseFloat(x) || 0)
    const w = v.offsetWidth, h = v.offsetHeight, [t, rr = t, b = t, l = rr] = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/)
    part = w && h ? (Math.max(0, w - px(l, w) - px(rr, w)) * Math.max(0, h - px(t, h) - px(b, h))) / (w * h) : 0
  }
  return { f: cache ? 0 : part * op, boite: { l: r.left, t: r.top, r: r.right, b: r.bottom } }
}

// ── Géométrie (repère de l'écran, en px CSS)─────────────────────────────────────────────────────────────────────────
/** Polygone visible d'une vignette : sa boîte (taille de mise en page, centrée sur le centre de sa boîte affichée), réduite par
 *  son clip-path ; tournée de son angle si `tourner`. */
export function polygone(v, tourner) {
  const x0 = v.cx - v.w / 2, y0 = v.cy - v.h / 2, [t, r, b, l] = v.clip
  const pts = [[x0 + l, y0 + t], [x0 + v.w - r, y0 + t], [x0 + v.w - r, y0 + v.h - b], [x0 + l, y0 + v.h - b]]
  if (!tourner || !v.a) return pts
  const c = Math.cos((v.a * Math.PI) / 180), s = Math.sin((v.a * Math.PI) / 180)
  return pts.map(([x, y]) => [v.cx + (x - v.cx) * c - (y - v.cy) * s, v.cy + (x - v.cx) * s + (y - v.cy) * c])
}
const aire = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; a += x1 * y2 - x2 * y1 } return Math.abs(a) / 2 }
/** Aire de l'intersection d'un polygone convexe et d'un rectangle {l,t,r,b} (Sutherland–Hodgman). */
export function aireCommune(pts, rect) {
  if (!rect) return 0
  let p = pts
  const couper = (dedans, croise) => { const out = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], ia = dedans(a), ib = dedans(b); if (ia) out.push(a); if (ia !== ib) out.push(croise(a, b)) } p = out }
  const x = (a, b, X) => [X, a[1] + ((b[1] - a[1]) * (X - a[0])) / (b[0] - a[0])], y = (a, b, Y) => [a[0] + ((b[0] - a[0]) * (Y - a[1])) / (b[1] - a[1]), Y]
  couper((q) => q[0] >= rect.l, (a, b) => x(a, b, rect.l)); if (!p.length) return 0
  couper((q) => q[0] <= rect.r, (a, b) => x(a, b, rect.r)); if (!p.length) return 0
  couper((q) => q[1] >= rect.t, (a, b) => y(a, b, rect.t)); if (!p.length) return 0
  couper((q) => q[1] <= rect.b, (a, b) => y(a, b, rect.b)); if (!p.length) return 0
  return aire(p)
}
export const aireRect = (r) => Math.max(0, r.r - r.l) * Math.max(0, r.b - r.t)
export const centre = (r) => ({ x: (r.l + r.r) / 2, y: (r.t + r.b) / 2 })
export const dans = (pt, r) => r && pt.x >= r.l && pt.x <= r.r && pt.y >= r.t && pt.y <= r.b
