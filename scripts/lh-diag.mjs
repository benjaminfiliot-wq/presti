// scripts/lh-diag.mjs <dossier> [chemin=/] — Lighthouse mobile comme le juge, mais on lit le DÉTAIL : d'où vient le temps de
// blocage (tâches longues, répartition du fil principal, animations non composées, poids), pour corriger la cause et pas
// deviner. Sert quand site-qa.mjs dit « Performance < 95 » sans dire pourquoi.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import { chromium } from 'playwright'
import lighthouse from 'lighthouse'

const [dossier, chemin = '/'] = process.argv.slice(2)
const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2', xml: 'application/xml', txt: 'text/plain', json: 'application/json' }
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  const f = path.join(dossier, p)
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end() }
  res.writeHead(200, { 'content-type': types[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res)
})
await new Promise((r) => srv.listen(0, r))
const portLibre = () => new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)) }) })
const port = await portLibre()
const nav = await chromium.launch({ args: [`--remote-debugging-port=${port}`] })
try {
  const url = `http://127.0.0.1:${srv.address().port}${chemin}`
  const r = await lighthouse(url, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility'] })
  const a = r.lhr.audits
  const num = (k) => Math.round(a[k]?.numericValue ?? -1)
  console.log(`Performance ${Math.round(r.lhr.categories.performance.score * 100)} · Accessibilité ${Math.round(r.lhr.categories.accessibility.score * 100)} · LCP ${num('largest-contentful-paint')} ms · TBT ${num('total-blocking-time')} ms · CLS ${a['cumulative-layout-shift']?.numericValue?.toFixed(3)} · Speed Index ${num('speed-index')} · FCP ${num('first-contentful-paint')}`)
  console.log('\nFil principal :', (a['mainthread-work-breakdown']?.details?.items || []).map((i) => `${i.groupLabel} ${Math.round(i.duration)} ms`).join(' · '))
  console.log('Tâches longues :', (a['long-tasks']?.details?.items || []).slice(0, 8).map((i) => `${Math.round(i.duration)} ms ${String(i.url || '').split('/').pop().slice(0, 40)}`).join(' · ') || 'aucune')
  console.log('Démarrage JS :', (a['bootup-time']?.details?.items || []).slice(0, 5).map((i) => `${String(i.url).split('/').pop().slice(0, 30)} ${Math.round(i.total)} ms`).join(' · '))
  console.log('Animations non composées :', (a['non-composited-animations']?.details?.items || []).slice(0, 8).map((i) => `${i.node?.selector?.slice(0, 40)} [${(i.subItems?.items || []).map((s) => s.failureReason || s.animation).join(', ').slice(0, 80)}]`).join('\n   ') || 'aucune')
  console.log('Poids :', (a['network-requests']?.details?.items || []).map((i) => `${String(i.url).split('/').pop().slice(0, 28)} ${Math.round((i.transferSize || 0) / 1024)} Ko`).join(' · '))
  console.log('Élément LCP :', a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector || '?')
  const acc = Object.values(a).filter((x) => x.score !== null && x.score < 1 && r.lhr.categories.accessibility.auditRefs.some((ref) => ref.id === x.id && ref.weight > 0))
  if (acc.length) console.log('\nAccessibilité en échec :', acc.map((x) => `${x.id} (${(x.details?.items || []).slice(0, 2).map((i) => i.node?.selector?.slice(0, 50)).join(', ')})`).join('\n   '))
  const diag = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && r.lhr.categories.performance.auditRefs.some((ref) => ref.id === x.id))
  console.log('\nAudits perf < 0,9 :', diag.map((x) => `${x.id} ${x.displayValue || ''}`).join(' · ') || 'aucun')
} finally { await nav.close(); srv.close() }
