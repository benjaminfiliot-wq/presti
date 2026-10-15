// Montage des deux vidéos de la landing à partir des enregistrements bruts (scripts/demo-gestion-videos.mjs) :
//   videos/gestion-brut/assistant-devis.mp4 + .marques.json  →  public/demo/assistant-devis.mp4 + affiche
//   videos/gestion-brut/crm-atelier.webm    + .marques.json  →  public/demo/crm-atelier.mp4 + affiche
// Rognage des temps morts, attente du modèle ACCÉLÉRÉE ×4 (dite à l'écran : « Accéléré »), H.264 sans son, 1280 × 800, faststart,
// < 3 Mo. Rien n'est ajouté à l'image que ce libellé : ce qui s'affiche est l'écran réel.
// Usage : node scripts/demo-gestion-montage.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const BRUT = path.join(process.cwd(), 'videos', 'gestion-brut')
const OUT = path.join(process.cwd(), 'public', 'demo')
const lire = (n) => JSON.parse(fs.readFileSync(path.join(BRUT, `${n}.marques.json`), 'utf8'))
const ff = (args) => { const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('ffmpeg : ' + r.stderr.slice(0, 600)) }
const FONT = 'C\\:/Windows/Fonts/arialbd.ttf'
const ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', '-r', '25']

/** segments : [{ de, a, vitesse?, etiquette? }] en secondes de la vidéo brute ; rend la concaténation. */
function monter(entree, segments, sortie) {
  const filtres = segments.map((s, i) => {
    let f = `[0:v]trim=start=${s.de.toFixed(3)}:end=${s.a.toFixed(3)},setpts=(PTS-STARTPTS)/${s.vitesse ?? 1},scale=1280:800:flags=lanczos`
    if (s.etiquette) f += `,drawtext=fontfile='${FONT}':text='${s.etiquette}':fontcolor=white:fontsize=26:box=1:boxcolor=black@0.55:boxborderw=10:x=w-tw-28:y=24`
    return `${f}[s${i}]`
  })
  const chaine = segments.map((_, i) => `[s${i}]`).join('') + `concat=n=${segments.length}:v=1:a=0[v]`
  ff(['-i', entree, '-filter_complex', [...filtres, chaine].join(';'), '-map', '[v]', ...ENC, sortie])
}
const duree = (f) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f], { encoding: 'utf8' }).stdout)

function affiche(video, instant, sortie) {
  const png = sortie.replace(/\.webp$/, '.png')
  ff(['-ss', String(instant), '-i', video, '-frames:v', '1', png])
  // PNG → WebP par ffmpeg (libwebp) ; qualité 80 : une affiche légère (~50 Ko).
  ff(['-i', png, '-c:v', 'libwebp', '-quality', '80', sortie]); fs.rmSync(png)
}

fs.mkdirSync(OUT, { recursive: true })

// ── Assistant : saisie, attente accélérée, réponse, devis ouvert
{
  const m = lire('assistant-devis'); const D = m.depart
  const v = (t) => t - D // temps de script → temps de la vidéo
  const segs = [
    { de: v(m.debut_saisie - 0.9), a: v(m.envoi + 0.5) },
    { de: v(m.envoi + 0.5), a: v(m.reponse - 0.2), vitesse: 4, etiquette: 'Accéléré ×4' },
    { de: v(m.reponse - 0.2), a: v(m.ouvrir + 0.3) },
    { de: v(m.ouvrir + 0.3), a: v(m.ouvrir + 5.0) },
  ]
  const src = path.join(BRUT, 'assistant-devis.mp4'); const out = path.join(OUT, 'assistant-devis.mp4')
  monter(src, segs, out)
  affiche(src, v(m.reponse + 2.2), path.join(OUT, 'assistant-devis-affiche.webp'))
  console.log(`assistant-devis.mp4 ${(fs.statSync(out).size / 1048576).toFixed(2)} Mo, ${duree(out).toFixed(1)} s`)
}

// ── CRM : la carte Atelier, puis la fiche d'un chantier
{
  const m = lire('crm-atelier')
  const segs = [
    { de: m.atelier - 2.8, a: m.atelier + 5.2 },
    { de: m.fiche_prete + 0.3, a: m.fin },
  ]
  const src = path.join(BRUT, 'crm-atelier.webm'); const out = path.join(OUT, 'crm-atelier.mp4')
  monter(src, segs, out)
  affiche(src, m.atelier + 3, path.join(OUT, 'crm-atelier-affiche.webp'))
  console.log(`crm-atelier.mp4 ${(fs.statSync(out).size / 1048576).toFixed(2)} Mo, ${duree(out).toFixed(1)} s`)
}
