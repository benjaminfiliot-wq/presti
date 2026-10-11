// starnet-plan-png.mjs — dessine le plan de la station enregistrée (vue de dessus, une couleur par style de sol / type d'objet) en PNG, sans passer par l'écran de StarNet.
import fs from 'node:fs'
import zlib from 'node:zlib'
const port = process.argv[2], jeton = process.argv[3] // optionnels ; sinon lit la dernière sauvegarde locale
const SAUV = new URL('./sauvegardes-starnet/', import.meta.url)
let doc
if (port && jeton) doc = (await (await fetch(`http://127.0.0.1:${port}/api/save?agent=agent`, { headers: { 'x-starnet-token': jeton } })).json()).save.station
else { const f = fs.readdirSync(SAUV).sort().pop(); doc = JSON.parse(fs.readFileSync(new URL(f, SAUV), 'utf8')).save.station }
const S = 9
const rooms = Object.values(doc.rooms)
const maxX = Math.max(...rooms.flatMap((r) => r.rects.map((q) => q.x2))) + 2, maxY = Math.max(...rooms.flatMap((r) => r.rects.map((q) => q.y2))) + 2
const W = maxX * S, H = maxY * S, buf = Buffer.alloc(W * H * 4)
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const SOL = { cobalt: '#2a4a9a', indigo: '#3a3a8a', violet: '#6a3aa8', orchid: '#a03aa0', teal: '#1f8a8a', onyx: '#2a2a33', amber: '#b88a2a', hull: '#556', corridor: '#445', verdant: '#2e7a4a', rust: '#7a4a2e', sterile: '#8899aa', crimson: '#8a2a3a', ember: '#b8532a', moss: '#4a6a2a', fern: '#3a7a3a', white: '#cccccc', bone: '#bbb099' }
const rect = (x, y, w, h, c) => { const [r, g, b] = hex(c); for (let j = y * S; j < (y + h) * S; j++) for (let i = x * S; i < (x + w) * S; i++) { if (i < 0 || j < 0 || i >= W || j >= H) continue; const o = (j * W + i) * 4; buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = 255 } }
const bord = (x, y, w, h, c) => { rect(x, y, w, 0.12, c); rect(x, y + h - 0.12, w, 0.12, c); rect(x, y, 0.12, h, c); rect(x + w - 0.12, y, 0.12, h, c) }
rect(0, 0, maxX, maxY, '#07070e')
for (const r of rooms) for (const q of r.rects) {
  rect(q.x1, q.y1, q.x2 - q.x1 + 1, q.y2 - q.y1 + 1, SOL[r.floorStyle] || '#444')
  for (const k of Object.keys(r.floorPaint || {})) { const [x, y] = k.split(',').map(Number); rect(x, y, 1, 1, SOL[r.floorPaint[k]] || '#666') }
  bord(q.x1, q.y1, q.x2 - q.x1 + 1, q.y2 - q.y1 + 1, SOL[r.hullStyle || r.wallStyle] ? '#dddddd' : '#aaaaaa')
}
const COUL = (t) => t === 'desk' ? '#d8b04a' : t === 'intake' ? '#3ad08a' : t === 'outbox' ? '#e0605a' : t === 'bay' ? '#ffd23a' : /plant|monstera/.test(t) ? '#2f9a3f' : /rug|cable/.test(t) ? '#7a62c8' : /screen|wall|ticker|holo|board|table/.test(t) ? '#7fe0ff' : '#c9c9d4'
for (const p of doc.props) rect(p.x, p.y, p.w || 1, p.h || 1, COUL(p.t))
for (const [k, d] of Object.entries(doc.belts || {})) { const [x, y] = k.split(',').map(Number); rect(x, y, 1, 1, '#ff9a2a'); rect(x + (d === 'E' ? 0.6 : 0.2), y + 0.35, 0.3, 0.3, '#fff') }
// PNG
const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4) }
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6
const out = process.env.PLAN_PNG || 'plan-station.png'
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
console.log(out, W + 'x' + H)
