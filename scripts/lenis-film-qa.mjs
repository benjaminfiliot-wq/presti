// scripts/lenis-film-qa.mjs — le juge de la tâche 021-09 : deux films de la démo défilée par le même programme de molette, en
// défilement natif et avec Lenis, et leur montage côte à côte, pour que Benj choisisse (cahier de la vague 5,
// .orchestre/preuves/021-00/cahier-vague-5.md, §3.2, §6.7 LN-1 à LN-4 ; ref-recit.md §3.2). Il lit .orchestre/preuves/021-09/.
//   LN-1 fichiers : natif.mp4, lenis.mp4, cote-a-cote.mp4, planche.jpg, mesures.json, tournage.mjs, lenis.min.js (copie du
//        paquet, avec sa licence MIT) ;
//   LN-2 ffprobe : natif et lenis en 1440 × 900, ≥ 29 images/s, 12 s (≥ 11,5 s), même durée ±0,1 s ; cote-a-cote au rapport
//        3,2 et de même durée. Même horloge : à 3, 6 et 9 s, la moitié gauche du montage est natif et la droite lenis (écart
//        moyen < 0,03), et la page défile vraiment (natif à 3 s contre 9 s : écart ≥ 0,02) ;
//   LN-3 mesures.json : un programme de molette d'au moins 5 événements, instants croissants, identique pour les deux films ;
//        par film, arretMs (du dernier événement à l'arrêt de scrollY) et rafP95Ms ; Lenis 1.3.26 avec lerp 0.1, smoothWheel
//        true, syncTouch false ; et Lenis s'arrête plus tard que le natif (sinon il n'a pas été injecté) ;
//   LN-4 rien dans le site : package.json et package-lock.json identiques au dépôt, aucun fichier lenis non suivi sous public/
//        ou scripts/, aucune trace de Lenis dans public/sites-demo/lestraque (index.html, site.js).
//
// Usage : node scripts/lenis-film-qa.mjs [--dossier=<preuve>]   (essai du juge sur un autre dossier)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argDossier = process.argv.find((a) => a.startsWith('--dossier='))
const P = argDossier ? path.resolve(argDossier.slice('--dossier='.length)) : path.join(R, '.orchestre', 'preuves', '021-09')
const echecs = [], faits = []
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ films natif et Lenis : FAIL — ${echecs.join(' ; ')}` : '✓ films natif et Lenis : PASS — deux films comparables sur la même horloge, même molette, Lenis bien actif, rien dans le site')
  process.exitCode = echecs.length ? 1 : 0
}
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }

// LN-1
for (const f of ['natif.mp4', 'lenis.mp4', 'cote-a-cote.mp4', 'planche.jpg', 'mesures.json', 'tournage.mjs', 'lenis.min.js']) if (taille(path.join(P, f)) <= 0) echecs.push(`LN-1 : ${f} absent ou vide`)
if (echecs.length) { fin(); process.exit(1) }
const lenisJs = fs.readFileSync(path.join(P, 'lenis.min.js'), 'utf8')
if (lenisJs.length < 5000 || !/MIT/.test(lenisJs) || !/lenis/i.test(lenisJs)) echecs.push('LN-1 : lenis.min.js ne ressemble pas au paquet (moins de 5 000 caractères, ou sans licence MIT)')

// LN-2
const sonde = (f) => { const s = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(P, f)], { encoding: 'utf8' }).stdout || '{}'); const v = (s.streams || []).find((x) => x.codec_type === 'video') || {}; const [a, b] = String(v.avg_frame_rate).split('/').map(Number); return { l: v.width, h: v.height, ips: b ? a / b : 0, duree: Number(s.format?.duration) } }
const n = sonde('natif.mp4'), l = sonde('lenis.mp4'), c = sonde('cote-a-cote.mp4')
faits.push(`natif ${n.l} × ${n.h} ${n.duree.toFixed(2)} s ${n.ips.toFixed(1)} i/s ; lenis ${l.l} × ${l.h} ${l.duree.toFixed(2)} s ; côte à côte ${c.l} × ${c.h} ${c.duree.toFixed(2)} s`)
for (const [nom, s] of [['natif', n], ['lenis', l]]) {
  if (s.l !== 1440 || s.h !== 900) echecs.push(`LN-2 : ${nom} en ${s.l} × ${s.h}, 1440 × 900 attendu`)
  if (s.ips < 29) echecs.push(`LN-2 : ${nom} à ${s.ips.toFixed(1)} images/s, 29 au moins`)
  if (!(s.duree >= 11.5)) echecs.push(`LN-2 : ${nom} dure ${s.duree.toFixed(2)} s, 12 s attendues`)
}
if (!(Math.abs(n.duree - l.duree) <= 0.1)) echecs.push(`LN-2 : durées différentes (${n.duree.toFixed(2)} et ${l.duree.toFixed(2)} s)`)
if (!(Math.abs(c.l / c.h - 3.2) <= 0.01) || !(Math.abs(c.duree - n.duree) <= 0.1)) echecs.push(`LN-2 : cote-a-cote.mp4 n'est pas le montage des deux films (${c.l} × ${c.h}, ${c.duree.toFixed(2)} s)`)
const image = (f, t, filtre) => spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', path.join(P, f), '-frames:v', '1', '-vf', `${filtre ? `${filtre},` : ''}scale=160:100,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 }).stdout
const ecart = (a, b) => { if (!a?.length || a.length !== b?.length) return 1; let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }
if (!echecs.some((e) => e.startsWith('LN-2'))) {
  for (const t of [3, 6, 9]) {
    const g = ecart(image('cote-a-cote.mp4', t, 'crop=iw/2:ih:0:0'), image('natif.mp4', t)), d = ecart(image('cote-a-cote.mp4', t, 'crop=iw/2:ih:iw/2:0'), image('lenis.mp4', t))
    if (g >= 0.03 || d >= 0.03) echecs.push(`LN-2 : à ${t} s, le montage ne montre pas natif à gauche et lenis à droite sur la même horloge (écarts ${g.toFixed(3)} et ${d.toFixed(3)})`)
  }
  const defile = ecart(image('natif.mp4', 3), image('natif.mp4', 9))
  faits.push(`natif entre 3 et 9 s : écart ${defile.toFixed(3)}`)
  if (defile < 0.02) echecs.push(`LN-2 : la page ne défile pas dans natif.mp4 (écart ${defile.toFixed(3)} entre 3 et 9 s)`)
}

// LN-3
let m = null
try { m = JSON.parse(fs.readFileSync(path.join(P, 'mesures.json'), 'utf8')) } catch { echecs.push('LN-3 : mesures.json illisible') }
if (m) {
  const prog = m.programme
  const valide = Array.isArray(prog) && prog.length >= 5 && prog.every((e, i) => typeof e?.t === 'number' && typeof e?.dy === 'number' && (i === 0 || e.t > prog[i - 1].t))
  if (!valide) echecs.push('LN-3 : programme de molette absent, de moins de 5 événements, ou aux instants non croissants ({t, dy})')
  for (const film of ['natif', 'lenis']) {
    const f = m[film] || {}
    if (JSON.stringify(f.programme) !== JSON.stringify(prog)) echecs.push(`LN-3 : ${film} n'a pas joué le même programme de molette`)
    if (!(typeof f.arretMs === 'number' && f.arretMs >= 0) || !(typeof f.rafP95Ms === 'number' && f.rafP95Ms > 0)) echecs.push(`LN-3 : ${film} sans arretMs ou rafP95Ms`)
  }
  if (m.version !== '1.3.26') echecs.push(`LN-3 : version de Lenis ${m.version}, 1.3.26 attendue`)
  if (JSON.stringify(m.reglages) !== JSON.stringify({ lerp: 0.1, smoothWheel: true, syncTouch: false })) echecs.push(`LN-3 : réglages ${JSON.stringify(m.reglages)}, {"lerp":0.1,"smoothWheel":true,"syncTouch":false} attendus`)
  if (typeof m.natif?.arretMs === 'number' && typeof m.lenis?.arretMs === 'number') {
    faits.push(`arrêt après la dernière molette : natif ${m.natif.arretMs} ms, Lenis ${m.lenis.arretMs} ms`)
    if (!(m.lenis.arretMs > m.natif.arretMs)) echecs.push('LN-3 : Lenis ne s\'arrête pas plus tard que le natif : il n\'a pas agi')
  }
}

// LN-4
if (spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'package.json', 'package-lock.json'], { cwd: R }).status !== 0) echecs.push('LN-4 : package.json ou package-lock.json modifié')
const intrus = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'public', 'scripts'], { cwd: R, encoding: 'utf8' }).stdout.split('\n').filter((f) => /lenis/i.test(f) && f !== 'scripts/lenis-film-qa.mjs')
if (intrus.length) echecs.push(`LN-4 : fichiers Lenis sous public/ ou scripts/ : ${intrus.join(', ')}`)
for (const f of ['index.html', 'site.js']) { const p = path.join(R, 'public', 'sites-demo', 'lestraque', f); if (fs.existsSync(p) && /lenis/i.test(fs.readFileSync(p, 'utf8'))) echecs.push(`LN-4 : trace de Lenis dans lestraque/${f}`) }

fin()
