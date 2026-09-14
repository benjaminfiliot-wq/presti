// scripts/trace-longues-taches.mjs <dossier du site> [essais=2] — trace le fil principal d'une démo comme Lighthouse mobile (CPU ×4, 412×823) et décompose chaque longue tâche (> 50 ms).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'
const { chromium } = await import('playwright')
const dossier = process.argv[2], essais = Number(process.argv[3] || 2)
const types = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2' }
const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(dossier, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() } r.writeHead(200, { 'content-type': types[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r) })
await new Promise((r) => srv.listen(0, r))
const nav = await chromium.launch()
for (let e = 1; e <= essais; e++) {
  const ctx = await nav.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true })
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const evenements = []
  cdp.on('Tracing.dataCollected', (d) => evenements.push(...d.value))
  const fini = new Promise((r) => cdp.once('Tracing.tracingComplete', r))
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,blink.user_timing,loading', transferMode: 'ReportEvents' })
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load' })
  await page.waitForTimeout(5000)
  await cdp.send('Tracing.end'); await fini
  // le fil principal du rendu : le thread qui porte le plus d'événements RunTask avec des Layout
  const parThread = new Map()
  for (const ev of evenements) if (ev.name === 'Layout' || ev.name === 'UpdateLayoutTree') parThread.set(`${ev.pid}:${ev.tid}`, (parThread.get(`${ev.pid}:${ev.tid}`) || 0) + 1)
  const principal = [...parThread.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const surFil = evenements.filter((ev) => `${ev.pid}:${ev.tid}` === principal && ev.dur !== undefined)
  const t0 = Math.min(...surFil.map((ev) => ev.ts))
  const taches = surFil.filter((ev) => ev.name === 'RunTask' && ev.dur / 1000 > 50).sort((a, b) => a.ts - b.ts)
  console.log(`\n=== essai ${e} : ${taches.length} longue(s) tâche(s) sur le fil principal`)
  for (const t of taches) {
    const enfants = surFil.filter((ev) => ev !== t && ev.ts >= t.ts && ev.ts + ev.dur <= t.ts + t.dur && ev.name !== 'RunTask')
    const somme = new Map()
    for (const c of enfants) { const cle = c.name === 'FunctionCall' || c.name === 'EvaluateScript' ? `${c.name} ${String(c.args?.data?.url || '').split('/').pop()}:${c.args?.data?.lineNumber ?? ''} ${c.args?.data?.functionName || ''}` : c.name; somme.set(cle, (somme.get(cle) || 0) + c.dur / 1000) }
    const top = [...somme.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${k.trim()} ${Math.round(v)} ms`).join(' · ')
    console.log(`  à ${Math.round((t.ts - t0) / 1000)} ms, ${Math.round(t.dur / 1000)} ms → ${top}`)
  }
  await ctx.close()
}
await nav.close(); srv.close()
