// Prototype 7 (bureau) : proto6, mais le front d'ombre est piloté par l'AIRE éclairée (quantile des profondeurs visibles sur une
// grille 64 × 40, recalculé à chaque image — ce que ferait le worker) : la surface éclairée baisse régulièrement avec le défilement.
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require = createRequire('C:/Users/benja/Documents/presti/package.json')
const sharp = require('sharp')
const SRC = 'C:/Users/benja/Documents/presti/public/sites-demo/lestraque/images/heros-escalier-2400.webp'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/signature/'
const { Q, h, theta0: TH0, RW } = JSON.parse(fs.readFileSync(OUT + 'params.json', 'utf8'))
const lq = Math.log(Q)
const c01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (a, b, x) => { const t = c01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const SW = 2400, SH = 1800
const { data: src } = await sharp(SRC).resize(SW, SH).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const VW = 1440, VH = 900, DW = 1440, DH = 1080, off = (DH - VH) * 0.42, k = SW / DW
const ex = 0.404 * DW, ey = 0.386 * DH - off, H = DH
const GAMMA = 0.6, DMAX = 0.26, ROLL = 20, PL = [20, 17, 14], RAMPE = 0.45

function camera(t) {
  const course = smooth(0, 0.65, t), delta = DMAX * course, rho = h * ROLL * Math.PI / 180 * course
  const rStar = delta > 0 ? RW * Math.pow(delta, -1 / GAMMA) : 10
  const n = 8192, rs = new Float64Array(n), rps = new Float64Array(n)
  for (let i = 0; i < n; i++) { const r = rStar * i / n, D = Math.pow(Math.max(r, RW) / RW, -GAMMA); rs[i] = r; rps[i] = r * D / (D - delta) }
  return { delta, rho, n, rs, rps, course }
}
function source(cam, x, y) {
  const dx = x - ex, dy = y - ey, rp = Math.hypot(dx, dy) / H
  let lo = 0, hi = cam.n - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cam.rps[m] < rp) lo = m; else hi = m }
  const f = cam.rps[hi] === cam.rps[lo] ? 0 : (rp - cam.rps[lo]) / (cam.rps[hi] - cam.rps[lo])
  return { r: cam.rs[lo] + (cam.rs[hi] - cam.rs[lo]) * f, a: Math.atan2(dy, dx) - cam.rho, rp }
}
const etage = (r, a) => Math.log(Math.max(r, RW * 0.3) / RW) / lq + 0.12 * Math.sin(h * (a - TH0))

function frame(t) {
  const cam = camera(t)
  // quantile : la part d'écran à éteindre suit le défilement, de 0 (t = 0,45) à 1 (t = 0,95)
  const zs = []
  for (let j = 0; j < 40; j++) for (let i = 0; i < 64; i++) { const s = source(cam, (i + 0.5) * VW / 64, (j + 0.5) * VH / 40); zs.push(etage(s.r, s.a)) }
  zs.sort((a, b) => a - b)
  const part = smooth(0.45, 0.95, t)
  const F = part <= 0 ? zs[0] - 2 * RAMPE : zs[Math.min(zs.length - 1, Math.floor(part * (zs.length - 1)))] + RAMPE * (part >= 1 ? 2 : 0)
  const fin = smooth(0.95, 1, t)
  const out = Buffer.alloc(VW * VH * 3)
  let eclaire = 0
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const { r, a } = source(cam, x, y)
    const ombre = smooth(F + RAMPE, F - RAMPE, etage(r, a))
    if (ombre < 0.5) eclaire++
    const lumiere = 1 - 0.92 * Math.pow(ombre, 1.2)
    const sx = (ex + Math.cos(a) * r * H) * k, sy = (ey + off + Math.sin(a) * r * H) * k
    const x0 = Math.max(0, Math.min(SW - 2, Math.floor(sx))), y0 = Math.max(0, Math.min(SH - 2, Math.floor(sy)))
    const fx = c01(sx - x0), fy = c01(sy - y0), i = (y * VW + x) * 3
    for (let c = 0; c < 3; c++) {
      const p = (yy, xx) => src[(yy * SW + xx) * 3 + c]
      const v = p(y0, x0) * (1 - fx) * (1 - fy) + p(y0, x0 + 1) * fx * (1 - fy) + p(y0 + 1, x0) * (1 - fx) * fy + p(y0 + 1, x0 + 1) * fx * fy
      out[i + c] = Math.round(Math.max(v * lumiere, PL[c] * ombre) * (1 - fin) + PL[c] * fin)
    }
  }
  return { out, F, eclaire: eclaire / (VW * VH) }
}
const positions = [0.5, 0.6, 0.68, 0.75, 0.82, 0.88, 0.94, 1]
const vig = []
for (const t of positions) {
  const { out, F, eclaire } = frame(t)
  const nom = `proto7-t${String(Math.round(t * 100)).padStart(3, '0')}.jpg`
  await sharp(out, { raw: { width: VW, height: VH, channels: 3 } }).jpeg({ quality: 80 }).toFile(OUT + nom)
  vig.push(await sharp(out, { raw: { width: VW, height: VH, channels: 3 } }).resize(480, 300).jpeg({ quality: 78 }).toBuffer())
  console.log(nom, `front=${F.toFixed(2)} surface_eclairee=${(eclaire * 100).toFixed(0)}%`)
}
await sharp({ create: { width: 1920, height: 600, channels: 3, background: '#000' } })
  .composite(vig.map((b, i) => ({ input: b, left: (i % 4) * 480, top: Math.floor(i / 4) * 300 }))).jpeg({ quality: 80 }).toFile(OUT + 'proto7-planche.jpg')
console.log('planche : proto7-planche.jpg')
