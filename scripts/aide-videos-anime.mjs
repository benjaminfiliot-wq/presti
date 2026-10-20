// Montage « motion design » des vidéos du centre d'aide : videos/aide-brut/<id>.mp4 (+ .marques.json, .evenements.json)
//   → videos/aide-anime/<id>/ (projet HyperFrames) → public/aide-videos/<id>.mp4 (+ affiche .webp).
//
// Matière : la VRAIE capture de l'écran (2160 × 1350, sans sous-titre). Par-dessus, tout vient du journal des gestes de la capture :
//   · zooms doux sur la zone de l'action (courbe lente, jamais de secousse ni de pulsation) ;
//   · curseur dessiné, onde de clic, surlignage corail #D97757 de l'élément visé ;
//   · carton d'étape numéroté (le texte de `etapes`, sous l'écran : il ne masque jamais l'interface) ;
//   · intro (titre de la fonctionnalité), fin (« À vous ! » + offre requise) ;
//   · attente de l'IA accélérée ×5 (pastille « ×5 ») ;
//   · PAS DE VOIX (décision du fondateur, 17/10) : des sous-titres incrustés en bas de l'image, une phrase par étape
//     (lib/aide-videos.json → voix.intro, voix.etapes[], voix.fin), dans une pastille sombre, 2 lignes au plus, calés sur l'étape animée.
//     Le fichier livré porte une piste AAC silencieuse (compatibilité des lecteurs), pas de musique.
// Le temps de chaque étape = le temps de lecture de son sous-titre (0,4 s par mot + 1,2 s, fondus compris), jamais moins que ce que montrent
// les gestes : on COUPE le temps mort de la capture ou on le PROLONGE (image tenue), la capture elle-même n'est jamais modifiée.
// Les instants des sous-titres sont écrits dans lib/aide-videos.json (`sousTitres` : debut, fin, texte) : le test aide-videos-qa.mjs les contrôle.
//
// Usage : node scripts/aide-videos-anime.mjs <id ...|toutes> [--plan] [--projet] [--garder]
//   --plan : écrit seulement le plan   --projet : s'arrête avant le rendu   (--sans-voix : accepté, sans effet — c'est désormais le seul mode)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINE = process.cwd()
const BRUT = path.join(RACINE, 'videos', 'aide-brut')
const PROJETS = path.join(RACINE, 'videos', 'aide-anime')
const OUT = path.join(RACINE, 'public', 'aide-videos')
const JSON_VIDEOS = path.join(RACINE, 'lib', 'aide-videos.json')
const VIDEOS = JSON.parse(fs.readFileSync(JSON_VIDEOS, 'utf8')).videos
const args = process.argv.slice(2)
const drapeaux = new Set(args.filter((a) => a.startsWith('--')))
if (drapeaux.has('--sans-voix')) console.log('(--sans-voix : sans effet, il n’y a plus de voix)')
let ids = args.filter((a) => !a.startsWith('--'))
if (!ids.length || ids[0] === 'toutes') ids = VIDEOS.map((v) => v.id)

const W = 1920, H = 1200, FPS = 30
// Pile verticale (1200 px) : l'écran (16:10) 18→898 · progression 906 · carton d'étape 926→1030 · sous-titre 1042→1180 (voir le gabarit : mêmes valeurs).
const CARTE = { x: 256, y: 18, w: 1408, h: 880 }
const SRC_W = 2160, SRC_H = 1350 // la capture (1440 × 900 CSS à 1,5)
const BASE = CARTE.w / SRC_W // échelle de l'écran dans la carte
const OFFRES = { essentiel: 'Essentiel', studio: 'Studio', signature: 'Signature' }
const MAX_ZOOM = 1.55

const run = (cmd, a, opts = {}) => { const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 28, shell: process.platform === 'win32' && cmd === 'npx', ...opts }); return r }
const ff = (a) => { const r = run('ffmpeg', ['-loglevel', 'error', '-y', ...a]); if (r.status !== 0) throw new Error('ffmpeg : ' + (r.stderr || '').slice(0, 800)); return r }
// Windows verrouille parfois un fichier de public/ une seconde (serveur de dev, antivirus) : on réessaie avant d'échouer
const ffReprise = (a) => { for (let n = 1; ; n++) { try { return ff(a) } catch (e) { if (n >= 4) throw e; spawnSync('ping', ['-n', '3', '127.0.0.1'], { stdio: 'ignore' }) } } }
const duree = (f) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).stdout)
const r3 = (x) => Math.round(x * 1000) / 1000
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))

// ── temps de lecture des sous-titres ─────────────────────────────────────────────────────────────────────────────────────────────
const FONDU = 0.4 // fondu d'entrée (0,2 s) + fondu de sortie (0,2 s) : comptés EN PLUS du minimum, le texte plein reste donc ≥ 0,4 s/mot + 1,2 s
const mots = (t) => t.trim().split(/\s+/).length
const lecture = (t) => 0.4 * mots(t) + 1.2 + FONDU
function dureesLecture(v) {
  const dit = v.voix
  if (!dit || !Array.isArray(dit.etapes) || dit.etapes.length !== v.etapes.length) throw new Error(`${v.id} : voix.etapes (texte des sous-titres) doit avoir une phrase par étape`)
  return { intro: lecture(dit.intro), e: dit.etapes.map(lecture), fin: lecture(dit.fin) }
}
const INTRO_T0 = 0.4 // le sous-titre d'intro apparaît dès que le titre est posé

// ── le plan : coupes/prolongations, instants, caméra ─────────────────────────────────────────────────────────────────────────────
function construirePlan(v) {
  const m = JSON.parse(fs.readFileSync(path.join(BRUT, `${v.id}.marques.json`), 'utf8'))
  const ev = JSON.parse(fs.readFileSync(path.join(BRUT, `${v.id}.evenements.json`), 'utf8'))
  const D = dureesLecture(v)
  // l'intro : son sous-titre dure son temps de lecture ; il déborde de 0,6 s sur le début de l'écran (la pastille est sous l'écran : rien n'est masqué)
  const introFin = INTRO_T0 + D.intro
  const I = Math.max(3.2, introFin - 0.6)
  const debut = ev.debut
  const rawDur = duree(path.join(BRUT, `${v.id}.mp4`))
  const rr = (t) => t - debut // temps de la capture → temps de la vidéo brute
  const marques = v.etapes.map((_, i) => rr(m[`etape${i + 1}`]))
  const attente = m.attente_debut != null ? [rr(m.attente_debut), rr(m.attente_fin)] : null
  const LEAD = 0.35, TAIL = 0.7 // le sous-titre apparaît un peu après le carton, et on laisse respirer à la fin
  const evts = ev.evts.map((e) => ({ ...e, t: rr(e.t), t1: e.t1 != null ? rr(e.t1) : undefined }))
  const finActivite = (e) => e.k === 'click' ? e.t + 0.9 : e.k === 'hover' ? e.t + e.dur + 0.4 : e.k === 'type' ? e.t1 + 0.8 : e.k === 'scroll' ? e.t + 1.4 : e.k === 'move' ? e.t1 + 0.4 : e.t + 0.4

  // pièces de la vidéo finale : { r0, r1, v } (v = vitesse ; v = 0 : image tenue sur r0) et les repères de chaque étape
  const pieces = []
  let F = 0
  const poser = (r0, r1, vit, extra = {}) => { if (r1 - r0 <= 0.001 && vit !== 0) return; const len = vit === 0 ? extra.len : (r1 - r0) / vit; pieces.push({ r0, r1, v: vit, f0: F, f1: F + len, ...extra }); F += len }
  if (marques[0] > 0.05) poser(0, marques[0], 1)
  const etapesF = []
  for (let i = 0; i < v.etapes.length; i++) {
    const a = marques[i], b = i + 1 < marques.length ? marques[i + 1] : rawDur
    // la 1re étape attend la fin du sous-titre d'intro (jamais deux sous-titres en même temps)
    const lead = i === 0 ? Math.max(LEAD, introFin + 0.15 - I - F) : LEAD
    const besoin = D.e[i] + lead + TAIL
    // 1. découpe de la fenêtre [a, b] en parties à vitesse constante (l'attente de l'IA ×5)
    let parts = [[a, b, 1]]
    if (attente && attente[0] < b && attente[1] > a) {
      const w0 = Math.max(a, attente[0] + 1.2), w1 = Math.min(b, attente[1] - 0.5)
      parts = [[a, w0, 1], [w0, w1, 5], [w1, b, 1]].filter((p) => p[1] - p[0] > 0.01)
    }
    // 1 bis. temps mort : un trou de plus de 2,2 s sans geste (page qui charge, pause de lecture du scénario, survol qui s'éternise)
    //        est joué ×4 (0,6 s à vitesse normale avant, 0,4 s après) : l'écran reste continu, mais le film ne s'endort pas.
    const actifs = []
    for (const e of evts) {
      if (e.t < a - 0.3 || e.t > b) continue
      const [x, y] = e.k === 'move' ? [e.t, e.t1 + 0.4] : e.k === 'click' ? [e.t - 0.3, e.t + 0.9] : e.k === 'hover' ? [e.t - 0.1, e.t + Math.min(e.dur, 1.3) + 0.4] : e.k === 'type' ? [e.t, e.t1 + 0.8] : e.k === 'scroll' ? [e.t - 0.2, e.t + 1.4] : [e.t - 0.1, e.t + 0.4]
      actifs.push([x, y])
    }
    actifs.sort((x, y) => x[0] - y[0])
    const fusion = []; for (const iv of actifs) { const l = fusion[fusion.length - 1]; if (l && iv[0] <= l[1]) l[1] = Math.max(l[1], iv[1]); else fusion.push([...iv]) }
    const decouper = ([p0, p1, sp]) => {
      if (sp !== 1) return [[p0, p1, sp]]
      const out = []; let cur = p0
      const trous = []; let c = p0
      for (const [x, y] of fusion) { if (y <= p0 || x >= p1) continue; if (x > c) trous.push([c, x]); c = Math.max(c, y) }
      if (c < p1) trous.push([c, p1])
      for (const [g0, g1] of trous) {
        if (g1 - g0 < 2.2) continue
        if (g0 + 0.6 > cur) out.push([cur, g0 + 0.6, 1]); out.push([g0 + 0.6, g1 - 0.4, 4]); cur = g1 - 0.4
      }
      out.push([cur, p1, 1]); return out.filter((q) => q[1] - q[0] > 0.01)
    }
    parts = parts.flatMap(decouper)
    const total = parts.reduce((s, p) => s + (p[1] - p[0]) / p[2], 0)
    // 2. jusqu'où les gestes vont : la capture est gardée au moins jusque-là (+ 0,9 s pour voir le résultat)
    const dansFenetre = evts.filter((e) => e.t >= a - 0.05 && e.t < b)
    const rAct = dansFenetre.reduce((mx, e) => Math.max(mx, finActivite(e)), a)
    let fAct = 0; for (const p of parts) { const lo = Math.max(p[0], a), hi = Math.min(p[1], rAct); if (hi > lo) fAct += (hi - lo) / p[2] }
    const garde = Math.min(total, Math.max(besoin, fAct + 0.9))
    // 3. on pose les parties jusqu'à `garde`, puis on prolonge par une image tenue si le temps de lecture du sous-titre dépasse la capture
    const f0 = F; let reste = garde
    for (const p of parts) {
      if (reste <= 0.001) break
      const len = (p[1] - p[0]) / p[2]
      if (len <= reste + 0.001) { poser(p[0], p[1], p[2], p[2] >= 4 && p[1] - p[0] >= 5 ? { accel: true } : {}); reste -= len } else { poser(p[0], p[0] + reste * p[2], p[2], p[2] >= 4 && reste * p[2] >= 5 ? { accel: true } : {}); reste = 0 }
    }
    if (garde < besoin - 0.001) { const rf = pieces[pieces.length - 1].r1; poser(rf, rf, 0, { len: besoin - garde }) }
    etapesF.push({ i, f0, f1: F, lead })
  }
  const principal = F
  // sous-titres (temps de la vidéo finale) : intro · une phrase par étape (de l'apparition du carton + lead à 0,35 s avant la sortie du carton) · fin
  const O = 0.35 + D.fin + 0.7
  const sous = [
    { k: 'intro', t0: INTRO_T0, t1: introFin, texte: v.voix.intro },
    ...etapesF.map((e) => ({ k: `e${e.i + 1}`, t0: I + e.f0 + e.lead, t1: I + e.f1 - 0.35, texte: v.voix.etapes[e.i] })),
    { k: 'fin', t0: I + principal + 0.35, t1: I + principal + 0.35 + D.fin, texte: v.voix.fin },
  ].map((s) => ({ ...s, t0: r3(s.t0), t1: r3(s.t1) }))
  { const rf = pieces[pieces.length - 1].r1; poser(rf, rf, 0, { len: 0.9, fin: true }) } // l'écran reste affiché pendant que la carte sort
  // cartes de temps : temps de capture → temps de la vidéo finale (null si la partie a été coupée)
  const versF = (r) => { for (const p of pieces) if (p.v !== 0 && r >= p.r0 - 1e-6 && r <= p.r1 + 1e-6) return p.f0 + (r - p.r0) / p.v; return null }

  // curseur : trajets
  const cursor = []
  for (const e of evts) if (e.k === 'move') { const t0 = versF(e.t), t1 = versF(e.t1); if (t0 != null && t1 != null && t1 > t0) cursor.push({ t0: r3(t0), t1: r3(t1), x0: r3(e.x0 * ev.dpr), y0: r3(e.y0 * ev.dpr), x1: r3(e.x1 * ev.dpr), y1: r3(e.y1 * ev.dpr) }) }
  // surlignages : une cible (arrivée du curseur), un clic (onde), un survol
  const rings = [], clics = []
  const grand = (r) => r.w * r.h > 0.45 * 1440 * 900 || r.w > 1250
  for (let k = 0; k < evts.length; k++) {
    const e = evts[k]
    if (e.k === 'cible') {
      const clic = evts.slice(k + 1).find((x) => x.k === 'click'); const t0 = versF(e.t), t1 = clic ? versF(clic.t) : null
      if (t0 != null && t1 != null && !grand(e.rect)) rings.push({ t0: r3(t0), t1: r3(t1 + 0.55), rect: e.rect, clic: true })
    } else if (e.k === 'hover') { const t0 = versF(e.t), t1 = versF(e.t + e.dur); if (t0 != null && t1 != null && !grand(e.rect)) rings.push({ t0: r3(t0), t1: r3(t1 + 0.2), rect: e.rect }) }
    else if (e.k === 'click') { const t = versF(e.t); if (t != null) clics.push({ t: r3(t), x: r3(e.x * ev.dpr), y: r3(e.y * ev.dpr) }) }
  }

  // caméra : on regroupe les cibles proches dans le temps et dans l'espace, un cadrage par groupe, des transitions lentes
  const cibles = []
  for (let k = 0; k < evts.length; k++) {
    const e = evts[k]
    if (e.k === 'cible') { const clic = evts.slice(k + 1).find((x) => x.k === 'click'); const t0 = versF(e.t), t1 = clic ? versF(clic.t) : null; if (t0 != null && t1 != null) cibles.push({ t0, t1: t1 + 0.9, rect: e.rect }) }
    else if (e.k === 'hover') { const t0 = versF(e.t), t1 = versF(e.t + e.dur); if (t0 != null && t1 != null) cibles.push({ t0, t1: t1 + 0.3, rect: e.rect }) }
  }
  cibles.sort((x, y) => x.t0 - y.t0)
  const union = (a, b) => { const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), x1 = Math.max(a.x + a.w, b.x + b.w), y1 = Math.max(a.y + a.h, b.y + b.h); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } }
  const groupes = []
  for (const c of cibles) {
    const g = groupes[groupes.length - 1]
    const u = g && union(g.box, c.rect)
    if (g && c.t0 - g.t1 < 2.4 && u.w <= 1440 / 1.22 && u.h <= 900 / 1.22) { g.box = u; g.t1 = Math.max(g.t1, c.t1) } else groupes.push({ t0: c.t0, t1: c.t1, box: { ...c.rect } })
  }
  const PAD = 70
  const camera = []
  const cadre = (box) => {
    const bw = box.w + PAD * 2, bh = box.h + PAD * 2
    const s = clamp(Math.min(1440 / bw, 900 / bh), 1, MAX_ZOOM)
    const cx = clamp(box.x + box.w / 2, 720 / s, 1440 - 720 / s), cy = clamp(box.y + box.h / 2, 450 / s, 900 - 450 / s)
    return s < 1.14 ? { s: 1, cx: 720, cy: 450 } : { s: r3(s), cx: r3(cx), cy: r3(cy) }
  }
  for (const g of groupes) camera.push({ t0: g.t0, t1: g.t1, ...cadre(g.box) })

  // textes (cartons) et rubans
  const accel = pieces.filter((p) => p.accel).map((p) => [r3(p.f0), r3(p.f1)])
  return { id: v.id, titre: v.titre, resume: v.resume, offre: v.offre, note: v.note ?? null, etapes: v.etapes, dpr: ev.dpr, I: r3(I), O: r3(O), principal: r3(principal), ecran: r3(F), etapesF, sous, pieces: pieces.map((p) => ({ ...p, f0: r3(p.f0), f1: r3(p.f1) })), cursor, rings, clics, camera, accel }
}

// ── la vidéo d'écran retardée/coupée (image par image, 30 i/s) ────────────────────────────────────────────────────────────────────
function monterEcran(id, plan, projet) {
  const src = path.join(BRUT, `${id}.mp4`)
  const f = plan.pieces.map((p, k) => p.v === 0
    ? `[0:v]trim=start=${Math.max(0, p.r0 - 0.1).toFixed(3)}:end=${p.r0.toFixed(3)},setpts=PTS-STARTPTS,fps=${FPS},tpad=stop_mode=clone:stop_duration=${(p.f1 - p.f0 + 0.5).toFixed(3)},trim=duration=${(p.f1 - p.f0).toFixed(3)},setpts=PTS-STARTPTS[p${k}]`
    : `[0:v]trim=start=${p.r0.toFixed(3)}:end=${p.r1.toFixed(3)},setpts=(PTS-STARTPTS)/${p.v},fps=${FPS}[p${k}]`)
  const fc = [...f, plan.pieces.map((_, k) => `[p${k}]`).join('') + `concat=n=${plan.pieces.length}:v=1:a=0,format=yuv420p[v]`].join(';')
  fs.writeFileSync(path.join(projet, 'filtre.txt'), fc)
  ff(['-i', src, '-filter_complex_script', path.join(projet, 'filtre.txt'), '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-g', '30', '-movflags', '+faststart', '-an', path.join(projet, 'assets', 'screen.mp4')])
}

// ── le projet HyperFrames ────────────────────────────────────────────────────────────────────────────────────────────────────────
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const enCoral = (s) => esc(s).replace(/«\s?([^»]+?)\s?»/g, '<em>« $1 »</em>')

function ecrireProjet(plan, I, O, total) {
  const gabarit = fs.readFileSync(path.join(import.meta.dirname, 'aide-videos-anime.gabarit.html'), 'utf8')
  const etapes = plan.etapes.map((t, i) => `<div class="cap" id="cap${i}"><b class="num">${i + 1}</b><p>${enCoral(t)}</p></div>`).join('\n      ')
  const offre = plan.note ? esc(plan.note.replace(/\.$/, '')) : (plan.offre === 'signature' ? `Réservé à l’offre <strong>${OFFRES[plan.offre]}</strong>` : `Disponible dès l’offre <strong>${OFFRES[plan.offre]}</strong>`)
  const sous = plan.sous.map((c, k) => `<div class="sub" id="sub${k}"><p>${esc(c.texte)}</p></div>`).join('\n      ')
  const data = { plan, I, O, total, CARTE, BASE, W, H, SRC_W, SRC_H }
  return gabarit
    .replaceAll('{{TITRE_PAGE}}', esc(plan.titre))
    .replaceAll('{{TITRE}}', esc(plan.titre))
    .replaceAll('{{RESUME}}', esc(plan.resume))
    .replaceAll('{{OFFRE}}', offre)
    .replaceAll('{{ROUTE}}', esc(plan.titre))
    .replaceAll('{{CAPS}}', etapes)
    .replaceAll('{{SOUS}}', sous)
    .replaceAll('{{DUREE}}', total.toFixed(3))
    .replaceAll('{{I}}', I.toFixed(3))
    .replaceAll('{{M}}', plan.principal.toFixed(3))
    .replaceAll('{{ECRAN}}', plan.ecran.toFixed(3))
    .replaceAll('{{DATA}}', JSON.stringify(data))
}

function rendre(projet, brut) {
  let r
  for (let essai = 1; essai <= 3; essai++) {
    r = spawnSync('npx', ['--yes', 'hyperframes@0.8.33', 'render', '--quality', 'high', '--video-frame-format', essai === 1 ? 'png' : 'jpg', '--fps', String(FPS), '--workers', '4', '--output', brut], { cwd: projet, stdio: 'inherit', shell: process.platform === 'win32' })
    if (r.status === 0) break
    console.log(`  ↻ rendu en échec (code ${r.status}), nouvel essai ${essai + 1}/3`)
    try { for (const f of fs.readdirSync(path.dirname(brut))) if (f.startsWith(`.${path.basename(brut)}.hf-transaction`)) fs.rmSync(path.join(path.dirname(brut), f), { recursive: true, force: true }) } catch {}
  }
  if (r.status !== 0) throw new Error('hyperframes render a échoué')
}

// ── encodage final : H.264 + piste AAC silencieuse (pas de voix, pas de musique ; une piste évite les lecteurs qui se plaignent), < 6 Mo ──────────────────────────────────────────────────────────────────────────────────────────
function encoder(brut, dest, total) {
  const MAX = 5.7 * 1048576
  for (const crf of [25, 27, 29, 31, 33, 35, 37]) {
    ff(['-i', brut, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-maxrate', '1500k', '-bufsize', '3000k', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', '60', '-c:a', 'aac', '-b:a', '32k', '-ar', '48000', '-ac', '1', '-t', total.toFixed(3), '-movflags', '+faststart', dest])
    if (fs.statSync(dest).size <= MAX) return crf
  }
  throw new Error('impossible de passer sous 6 Mo : ' + dest)
}

for (const id of ids) {
  const v = VIDEOS.find((x) => x.id === id); if (!v) throw new Error('vidéo inconnue : ' + id)
  console.log(`\n══ ${id} ══`)
  const plan = construirePlan(v)
  const { I, O } = plan
  const total = I + plan.principal + O
  const projet = path.join(PROJETS, id)
  fs.mkdirSync(path.join(projet, 'assets'), { recursive: true })
  fs.writeFileSync(path.join(projet, 'plan.json'), JSON.stringify(plan, null, 1))
  fs.copyFileSync(path.join(RACINE, 'public', 'marque', 'presti-logo-empile-sombre.svg'), path.join(projet, 'assets', 'logo.svg'))
  fs.mkdirSync(path.join(projet, 'assets', 'fonts'), { recursive: true })
  for (const f of ['bg700.woff', 'hg400.woff', 'hg500.woff']) fs.copyFileSync(path.join(RACINE, 'promo-src', 'fonts', f), path.join(projet, 'assets', 'fonts', f))
  console.log(`plan : intro ${I.toFixed(1)} s + écran ${plan.principal.toFixed(1)} s + fin ${O.toFixed(1)} s = ${total.toFixed(1)} s ; ${plan.camera.length} cadrages, ${plan.rings.length} surlignages, ${plan.clics.length} clics`)
  if (drapeaux.has('--plan')) continue
  const finir = drapeaux.has('--finir') // reprise après un rendu réussi (rendu-brut.mp4 déjà là) : encodage, affiche, JSON — sans refaire les 10 min de rendu
  if (!finir) {
    monterEcran(id, plan, projet)
    ff(['-i', path.join(projet, 'assets', 'screen.mp4'), '-ss', '0.3', '-frames:v', '1', '-vf', `scale=${CARTE.w}:${CARTE.h}`, '-q:v', '2', path.join(projet, 'assets', 'apercu.jpg')])
    fs.writeFileSync(path.join(projet, 'index.html'), ecrireProjet(plan, I, O, total))
    fs.writeFileSync(path.join(projet, 'hyperframes.json'), JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry', paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' } }, null, 2))
  }
  if (drapeaux.has('--projet')) continue
  const brut = path.join(projet, 'rendu-brut.mp4')
  if (finir) { if (!fs.existsSync(brut)) throw new Error('--finir : pas de rendu-brut.mp4 pour ' + id) } else rendre(projet, brut)
  const dest = path.join(OUT, `${id}.mp4`)
  fs.mkdirSync(OUT, { recursive: true })
  const crf = encoder(brut, dest, total)
  // affiche : l'écran au milieu de l'étape 2 (un écran qui parle, avec son carton et son sous-titre)
  const e = plan.etapesF[Math.min(1, plan.etapesF.length - 1)]
  const png = path.join(projet, 'affiche.png')
  ff(['-ss', (I + e.f0 + (e.f1 - e.f0) * 0.75).toFixed(2), '-i', dest, '-frames:v', '1', png])
  ffReprise(['-i', png, '-vf', 'scale=1280:-1', '-c:v', 'libwebp', '-quality', '78', path.join(OUT, `${id}.webp`)])
  const d = duree(dest)
  const j = JSON.parse(fs.readFileSync(JSON_VIDEOS, 'utf8')); const x = j.videos.find((y) => y.id === id); x.duree = Math.round(d); x.sousTitres = plan.sous.map((c) => ({ debut: Math.floor(c.t0 * 100) / 100, fin: Math.floor(c.t1 * 100) / 100, texte: c.texte })); fs.writeFileSync(JSON_VIDEOS, JSON.stringify(j, null, 2) + '\n')
  console.log(`✅ ${id}.mp4 ${(fs.statSync(dest).size / 1048576).toFixed(2)} Mo, ${d.toFixed(1)} s (crf ${crf})`)
  if (!drapeaux.has('--garder')) { /* les projets restent dans videos/aide-anime (ignoré de la prod) : relançables sans recapturer */ }
}
