// scripts/lighthouse-mediane.mjs — Lighthouse mobile en plusieurs passes sur un dossier de site servi comme en production :
// brotli sur les textes (Content-Encoding: br, relevé sur styles.css en ligne le 15/09) et en-têtes de sécurité de la route des
// démos, lus dans next.config.mjs. Un seul Lighthouse à la fois sur la machine : même verrou que site-qa.mjs. Réglages par défaut
// de Lighthouse mobile (simulation, processeur ×4, 412×823 à dpr 1,75), ceux de resume.json de la vague 3.
// Écrit un resume.json (passes, médianes, barre) et sort avec le code 0 si les médianes tiennent la barre du cahier de la vague 5
// §5.1 (performance ≥ 95, accessibilité, bonnes pratiques et SEO ≥ 95, LCP < 2 500 ms, TBT < 200 ms, CLS < 0,1), 1 sinon,
// 2 si la mesure est impossible.
//
// Usage : node scripts/lighthouse-mediane.mjs <dossier> [--chemin=/] [--passes=5] [--resume=<fichier.json>]
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import os from 'node:os'
import zlib from 'node:zlib'
import { fileURLToPath, pathToFileURL } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const option = (nom, defaut) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : defaut }
const dossierArg = args.find((a) => !a.startsWith('--'))
if (!dossierArg || !fs.existsSync(path.join(path.resolve(dossierArg), 'index.html'))) { console.error('Usage : node scripts/lighthouse-mediane.mjs <dossier contenant index.html> [--chemin=/] [--passes=5] [--resume=<fichier.json>]'); process.exit(2) }
const DOSSIER = path.resolve(dossierArg), CHEMIN = option('chemin', '/'), PASSES = Math.max(1, Number(option('passes', '5')) || 5)
const RESUME = path.resolve(option('resume', path.join(DOSSIER, '..', `lighthouse-${path.basename(DOSSIER)}.json`)))
const BARRE = { performance: 95, accessibilite: 95, bonnesPratiques: 95, seo: 95, lcpMs: 2500, tbtMs: 200, cls: 0.1 }

// les en-têtes de la route des démos (/((?!site/|p/).*)), lus dans la configuration de production
let entetes = []
try {
  const conf = (await import(pathToFileURL(path.join(R, 'next.config.mjs')).href)).default
  const regles = await conf.headers()
  const strict = regles.find((r) => r.source.startsWith('/((?!site'))
  // servi en http://127.0.0.1 : HSTS et upgrade-insecure-requests n'ont de sens qu'en https (en production, ils ne changent rien
  // à des requêtes déjà en https de même origine) ; en local, le second ferait passer les sous-ressources en https et casserait la page
  entetes = strict.headers.filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => (h.key === 'Content-Security-Policy' ? { key: h.key, value: h.value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ') } : h))
  if (!entetes.some((h) => h.key === 'Content-Security-Policy')) throw new Error('CSP absente de la route stricte')
} catch (e) { console.error(`✗ en-têtes de production illisibles dans next.config.mjs : ${e.message}`); process.exit(2) }

const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', mp4: 'video/mp4' }
const TEXTES = new Set(['html', 'css', 'js', 'json', 'svg', 'xml', 'txt'])
const cache = new Map()
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  const f = path.join(DOSSIER, p)
  if (!f.startsWith(DOSSIER) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
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
const origine = `http://127.0.0.1:${srv.address().port}`

// le verrou partagé avec site-qa.mjs
const VERROU = path.join(os.tmpdir(), 'site-qa-lighthouse.lock')
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
const vivant = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
async function prendreVerrou() {
  const debut = Date.now()
  for (;;) {
    try { fs.writeFileSync(VERROU, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' }); return VERROU } catch { /* pris */ }
    try {
      const [pid] = fs.readFileSync(VERROU, 'utf8').trim().split(/\s+/)
      if (!vivant(Number(pid)) || Date.now() - fs.statSync(VERROU).mtimeMs > 25 * 60_000) { fs.unlinkSync(VERROU); continue }
    } catch { continue }
    if (Date.now() - debut > 20 * 60_000) throw new Error('un autre juge tient Lighthouse depuis plus de 20 min')
    await attendre(3000)
  }
}
const portLibre = () => new Promise((ok, ko) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)) }); s.on('error', ko) })
const mediane = (v) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

let verrou = null, navigateur = null, code = 2
try {
  const { chromium } = await import('playwright')
  const { default: lighthouse } = await import('lighthouse')
  const port = await portLibre()
  navigateur = await chromium.launch({ args: [`--remote-debugging-port=${port}`] })
  verrou = await prendreVerrou()
  const passes = []
  for (let i = 1; i <= PASSES; i++) {
    let lhr = null
    for (let essai = 1; essai <= 3 && !lhr; essai++) {
      try { lhr = (await lighthouse(origine + CHEMIN, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] })).lhr } catch (e) { if (essai === 3) throw e; await attendre(3000) }
    }
    const note = (c) => Math.round((lhr.categories[c]?.score ?? 0) * 100), n = (id) => lhr.audits[id]?.numericValue
    passes.push({ passe: i, performance: note('performance'), accessibilite: note('accessibility'), bonnesPratiques: note('best-practices'), seo: note('seo'), lcpMs: Math.round(n('largest-contentful-paint') ?? -1), tbtMs: Math.round(n('total-blocking-time') ?? -1), cls: Number((n('cumulative-layout-shift') ?? -1).toFixed(4)), fcpMs: Math.round(n('first-contentful-paint') ?? -1), throttlingMethod: lhr.configSettings.throttlingMethod, cpu: lhr.configSettings.throttling?.cpuSlowdownMultiplier, ecran: lhr.configSettings.screenEmulation, benchmarkIndex: lhr.environment?.benchmarkIndex, version: lhr.lighthouseVersion })
    console.log(`  passe ${i} : performance ${passes.at(-1).performance}, LCP ${passes.at(-1).lcpMs} ms, TBT ${passes.at(-1).tbtMs} ms, CLS ${passes.at(-1).cls}`)
  }
  const medianes = Object.fromEntries(['performance', 'accessibilite', 'bonnesPratiques', 'seo', 'lcpMs', 'tbtMs', 'cls'].map((k) => [k, mediane(passes.map((p) => p[k]))]))
  const ecarts = []
  for (const k of ['performance', 'accessibilite', 'bonnesPratiques', 'seo']) if (medianes[k] < BARRE[k]) ecarts.push(`${k} ${medianes[k]} < ${BARRE[k]}`)
  if (medianes.lcpMs >= BARRE.lcpMs) ecarts.push(`LCP ${medianes.lcpMs} ms ≥ ${BARRE.lcpMs}`)
  if (medianes.tbtMs >= BARRE.tbtMs) ecarts.push(`TBT ${medianes.tbtMs} ms ≥ ${BARRE.tbtMs}`)
  if (medianes.cls >= BARRE.cls) ecarts.push(`CLS ${medianes.cls} ≥ ${BARRE.cls}`)
  const resume = { date: new Date().toISOString(), dossier: DOSSIER, chemin: CHEMIN, compression: 'br', entetes: entetes.map((h) => h.key), charge: os.loadavg(), passes, medianes, barre: BARRE, tient: !ecarts.length, ecarts }
  fs.mkdirSync(path.dirname(RESUME), { recursive: true })
  fs.writeFileSync(RESUME, JSON.stringify(resume, null, 1))
  console.log(ecarts.length ? `✗ Lighthouse mobile, médianes sur ${PASSES} passes : ${ecarts.join(' ; ')} — ${RESUME}` : `✓ Lighthouse mobile, médianes sur ${PASSES} passes : performance ${medianes.performance}, LCP ${medianes.lcpMs} ms, TBT ${medianes.tbtMs} ms, CLS ${medianes.cls} — ${RESUME}`)
  code = ecarts.length ? 1 : 0
} catch (e) {
  console.error(`✗ mesure impossible : ${e.message}`)
  code = 2
} finally {
  if (navigateur) await navigateur.close().catch(() => {})
  if (verrou) { try { fs.unlinkSync(verrou) } catch { /* déjà levé */ } }
  srv.close()
}
process.exit(code)
