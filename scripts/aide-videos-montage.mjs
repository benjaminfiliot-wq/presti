// Montage des vidéos du centre d'aide : videos/aide-brut/<id>.mp4 (+ .marques.json) → public/aide-videos/<id>.mp4 + <id>.webp (affiche).
// H.264, sans piste son, 1440 × 900, faststart, < 4 Mo. Une attente de l'IA (marques attente_debut / attente_fin) est ACCÉLÉRÉE ×5 ;
// le sous-titre le dit déjà (« vidéo accélérée »). Les sous-titres sont dans l'image (incrustés pendant la capture).
// Usage : node scripts/aide-videos-montage.mjs [id ...]   (sans argument : toutes les vidéos qui ont un enregistrement brut)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const BRUT = path.join(process.cwd(), 'videos', 'aide-brut')
const OUT = path.join(process.cwd(), 'public', 'aide-videos')
const VIDEOS = JSON.parse(fs.readFileSync('lib/aide-videos.json', 'utf8')).videos
const ff = (args) => { const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('ffmpeg : ' + (r.stderr || '').slice(0, 500)) }
const duree = (f) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f], { encoding: 'utf8' }).stdout)
fs.mkdirSync(OUT, { recursive: true })

const ids = process.argv.slice(2).length ? process.argv.slice(2) : VIDEOS.map((v) => v.id).filter((id) => fs.existsSync(path.join(BRUT, `${id}.mp4`)))
for (const id of ids) {
  const src = path.join(BRUT, `${id}.mp4`); const m = JSON.parse(fs.readFileSync(path.join(BRUT, `${id}.marques.json`), 'utf8'))
  const out = path.join(OUT, `${id}.mp4`)
  const D = m.depart ?? 0 // tout ce qui précède `depart` est le chargement, non filmé
  const total = duree(src)
  // Segments : [début, fin, vitesse] en secondes de la vidéo brute. Le script de capture note ses marques en secondes depuis son
  // propre t0 ; la vidéo brute commence à `depart` (la première image est prise une fois l'écran prêt).
  const t = (x) => x - D
  const segs = []
  if (m.attente_debut != null && m.attente_fin != null) {
    segs.push([0, t(m.attente_debut) + 1.2, 1], [t(m.attente_debut) + 1.2, t(m.attente_fin) - 0.5, 5], [t(m.attente_fin) - 0.5, total, 1])
  } else segs.push([0, total, 1])
  const vf = segs.map((s, i) => `[0:v]trim=start=${s[0].toFixed(3)}:end=${s[1].toFixed(3)},setpts=(PTS-STARTPTS)/${s[2]}[s${i}]`)
  const fc = [...vf, segs.map((_, i) => `[s${i}]`).join('') + `concat=n=${segs.length}:v=1:a=0,fps=25,scale=in_range=pc:out_range=tv,format=yuv420p[v]`].join(';')
  ff(['-i', src, '-filter_complex', fc, '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-an', '-movflags', '+faststart', out])
  // Affiche : une image avec son sous-titre, vers le milieu (un écran parlant, pas l'écran de départ).
  const d = duree(out)
  const png = path.join(OUT, `${id}.png`)
  ff(['-ss', String(Math.min(d * 0.45, d - 1)), '-i', out, '-frames:v', '1', png])
  ff(['-i', png, '-vf', 'scale=1280:-1', '-c:v', 'libwebp', '-quality', '78', path.join(OUT, `${id}.webp`)]); fs.rmSync(png)
  const j = JSON.parse(fs.readFileSync('lib/aide-videos.json', 'utf8')); const e = j.videos.find((x) => x.id === id); e.duree = Math.round(d); fs.writeFileSync('lib/aide-videos.json', JSON.stringify(j, null, 2) + '\n')
  console.log(`${id}.mp4 ${(fs.statSync(out).size / 1048576).toFixed(2)} Mo, ${d.toFixed(1)} s`)
}
