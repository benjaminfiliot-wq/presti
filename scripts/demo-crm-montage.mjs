// Montage de la démo CRM de la page d'accueil : videos/aide-brut/demo-crm.mp4 (capture « demo-crm », 2160 × 1350, voir
// scripts/aide-videos-scenarios.mjs) → public/demo/crm-atelier.mp4 + crm-atelier-affiche.webp.
// Même format que l'ancienne démo (scripts/demo-gestion-montage.mjs) : H.264 sans son, 1280 × 800, 25 i/s, faststart, très léger.
// Rien n'est ajouté à l'image : ce qui s'affiche est l'écran réel (données d'exemple fictives).
// Usage : node scripts/demo-crm-montage.mjs   (DEMO_CRM_SEGMENTS='[[0,2],[3,7]]' pour d'autres coupes)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const SRC = path.join(process.cwd(), 'videos', 'aide-brut', 'demo-crm.mp4')
const OUT = path.join(process.cwd(), 'public', 'demo')
const MAX_OCTETS = 1_000_000
const ff = (args) => { const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('ffmpeg : ' + (r.stderr || '').slice(0, 600)) }
const duree = (f) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f], { encoding: 'utf8' }).stdout)
if (!fs.existsSync(SRC)) throw new Error('capture absente : TEST_BASE=http://localhost:3057 node scripts/aide-videos-capture.mjs demo-crm')
// Segments retenus de la capture brute (secondes) : la maquette, l'accueil ouvert, le poste des assistants, la fiche d'un chantier.
// Les temps morts entre deux panneaux (le recadrage de la caméra) sont coupés ; des fondus de 0,3 s relient les segments.
const SEGMENTS = (process.env.DEMO_CRM_SEGMENTS ? JSON.parse(process.env.DEMO_CRM_SEGMENTS) : [[0, 2.4], [3.0, 7.4], [12.0, 16.4], [19.8, 22.0]])
const FONDU = 0.3
const out = path.join(OUT, 'crm-atelier.mp4')
const entree = SEGMENTS.map(([de, a], i) => `[0:v]trim=start=${de}:end=${a},setpts=PTS-STARTPTS,fps=25,scale=1280:800:flags=lanczos,format=yuv420p[s${i}]`)
let cumul = SEGMENTS[0][1] - SEGMENTS[0][0]
const chaine = []
let prec = 's0'
for (let i = 1; i < SEGMENTS.length; i++) {
  const sortie = i === SEGMENTS.length - 1 ? 'v' : `x${i}`
  chaine.push(`[${prec}][s${i}]xfade=transition=fade:duration=${FONDU}:offset=${(cumul - FONDU).toFixed(3)}[${sortie}]`)
  cumul += SEGMENTS[i][1] - SEGMENTS[i][0] - FONDU; prec = sortie
}
let crf = 0
for (const c of [24, 26, 28, 30, 32, 34]) {
  ff(['-i', SRC, '-filter_complex', [...entree, ...chaine].join(';'), '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(c), '-an', '-movflags', '+faststart', out])
  crf = c
  if (fs.statSync(out).size <= MAX_OCTETS) break
}
// Affiche : l'accueil ouvert (un écran qui parle), vers 40 % de la vidéo.
const d = duree(out)
const png = path.join(OUT, 'crm-atelier-affiche.png')
ff(['-ss', String(Math.min(d * 0.4, d - 0.5)), '-i', out, '-frames:v', '1', png])
ff(['-i', png, '-c:v', 'libwebp', '-quality', '80', path.join(OUT, 'crm-atelier-affiche.webp')]); fs.rmSync(png)
console.log(`crm-atelier.mp4 ${(fs.statSync(out).size / 1024).toFixed(0)} Ko, ${d.toFixed(1)} s (crf ${crf})`)
