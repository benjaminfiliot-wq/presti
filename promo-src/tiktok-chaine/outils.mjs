// Outils de la chaîne TikTok : trouver ffmpeg / HyperFrames / Chromium (Windows ou Linux sans écran),
// rapatrier une photo du fournisseur, la recadrer et la DÉCOUPER (fond blanc retiré) sans aucune
// dépendance : ffmpeg décode en RGB brut, le détourage se fait ici, ffmpeg réencode en PNG.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const ICI = path.dirname(fileURLToPath(import.meta.url))
export const RACINE_DEPOT = path.resolve(ICI, '..', '..')
const WIN = process.platform === 'win32'

/** Premier chemin existant d'une liste (les globs simples « * » d'un seul niveau sont résolus). */
function premierExistant(candidats) {
  for (const c of candidats.filter(Boolean)) {
    if (!c.includes('*')) { if (fs.existsSync(c)) return c; continue }
    const morceaux = c.split(/[\\/]/)
    let bases = [morceaux[0] === '' ? '/' : morceaux[0] + (WIN ? '\\' : '/')]
    for (const m of morceaux.slice(1)) {
      const suivantes = []
      for (const b of bases) {
        if (!m.includes('*')) { suivantes.push(path.join(b, m)); continue }
        const re = new RegExp('^' + m.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
        try { for (const e of fs.readdirSync(b).sort().reverse()) if (re.test(e)) suivantes.push(path.join(b, e)) } catch {}
      }
      bases = suivantes
    }
    const ok = bases.find((b) => fs.existsSync(b))
    if (ok) return ok
  }
  return null
}

function dansLePath(nom) {
  for (const d of String(process.env.PATH || process.env.Path || '').split(path.delimiter)) {
    for (const ext of WIN ? ['.exe', '.cmd', ''] : ['']) { const p = path.join(d, nom + ext); if (d && fs.existsSync(p)) return p }
  }
  return null
}

/**
 * Les outils, trouvés par variable d'environnement d'abord, puis aux emplacements connus :
 *   FFMPEG / FFPROBE           — sinon le vrai ffmpeg de WinGet (Gyan) sous Windows, sinon le PATH ;
 *   HYPERFRAMES_BIN            — sinon outils-pubs/node_modules/.bin/hyperframes du dépôt (usine), sinon npx ;
 *   PRODUCER_HEADLESS_SHELL_PATH — sinon le chrome-headless-shell de /srv/playwright (usine ARM).
 */
export function outils() {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const dossierGyan = WIN ? premierExistant([path.join(local, 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg*', 'ffmpeg-*', 'bin')]) : null
  const ffmpeg = process.env.FFMPEG || (dossierGyan && path.join(dossierGyan, 'ffmpeg.exe')) || dansLePath('ffmpeg')
  const ffprobe = process.env.FFPROBE || (dossierGyan && path.join(dossierGyan, 'ffprobe.exe')) || dansLePath('ffprobe')
  const hfLocal = premierExistant([process.env.HYPERFRAMES_BIN, path.join(RACINE_DEPOT, 'outils-pubs', 'node_modules', '.bin', WIN ? 'hyperframes.cmd' : 'hyperframes')])
  const navigateur = process.env.PRODUCER_HEADLESS_SHELL_PATH || (WIN ? null : premierExistant([
    '/srv/playwright/chromium_headless_shell-*/chrome-headless-shell-linux-arm64/chrome-headless-shell',
    '/srv/playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell',
  ]))
  return { ffmpeg, ffprobe, dossierFfmpeg: ffmpeg ? path.dirname(ffmpeg) : null, hyperframes: hfLocal, navigateur }
}

/** Environnement des enfants : le dossier du vrai ffmpeg EN TÊTE du PATH (HyperFrames le cherche là). */
export function envEnfant(O) {
  const env = { ...process.env }
  const cle = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH'
  if (O.dossierFfmpeg) env[cle] = O.dossierFfmpeg + path.delimiter + (env[cle] || '')
  if (O.navigateur) { env.PRODUCER_HEADLESS_SHELL_PATH = O.navigateur; env.HYPERFRAMES_BROWSER_PATH = env.HYPERFRAMES_BROWSER_PATH || O.navigateur }
  return env
}

export function lancer(cmd, args, { cwd, env, entree, minutes = 10, binaire = false } = {}) {
  const shell = WIN && /\.(cmd|bat)$/i.test(cmd)
  const r = spawnSync(cmd, args, {
    cwd, env, input: entree, timeout: minutes * 60_000, maxBuffer: 1 << 30, windowsHide: true, shell,
    encoding: binaire ? 'buffer' : 'utf8',
  })
  return { code: r.status, sortie: r.stdout, erreur: binaire ? String(r.stderr || '') : r.stderr || '', echec: r.error }
}

/** Taille d'une image ou d'une vidéo par ffprobe. */
export function sonder(O, fichier) {
  const r = lancer(O.ffprobe, ['-v', 'error', '-show_entries', 'stream=width,height,codec_type,r_frame_rate:format=duration', '-of', 'json', fichier])
  if (r.code !== 0) throw new Error(`ffprobe a échoué sur ${fichier} : ${r.erreur.slice(0, 300)}`)
  return JSON.parse(r.sortie)
}

/** Rapatrie une photo publique du fournisseur (CDN, aucune clé) dans le cache, une seule fois. */
export async function rapatrier(url, cache) {
  fs.mkdirSync(cache, { recursive: true })
  const nom = url.split('/').pop().split('?')[0].replace(/[^\w.-]/g, '_')
  const f = path.join(cache, nom)
  if (fs.existsSync(f) && fs.statSync(f).size > 1000) return f
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const b = Buffer.from(await r.arrayBuffer())
      if (b.length < 1000) throw new Error('fichier vide')
      fs.writeFileSync(f, b)
      return f
    } catch (e) { if (essai === 3) throw new Error(`photo introuvable (${url}) : ${e.message}`) }
  }
}

/**
 * Prépare une image : recadrage [x, y, l, h] en pixels de la source, mise à l'échelle (largeur max),
 * puis détourage éventuel :
 *   decoupe = "aucune"      → JPEG recadré ;
 *   decoupe = "tout"        → PNG, le fond blanc touchant les bords retiré, toutes les pièces gardées ;
 *   decoupe = "plus-grand"  → PNG, seule la plus grande pièce gardée (ex. l'aspirateur sans ses embouts).
 * masques = [[x, y, l, h], …] (pixels de la source) : zones repeintes en blanc AVANT le détourage, pour ôter un
 * élément collé au produit sur la photo du vendeur (cote, effet dessiné, texte) ; sans effet sans découpe.
 */
export function preparer(O, source, spec, sortie) {
  const info = sonder(O, source).streams[0]
  let [x, y, l, h] = spec.recadrage || [0, 0, info.width, info.height]
  x = Math.max(0, x); y = Math.max(0, y); l = Math.min(l, info.width - x); h = Math.min(h, info.height - y)
  const max = spec.largeur || 1400
  const k = Math.min(1, max / l)
  const L = Math.round(l * k / 2) * 2, H = Math.round(h * k / 2) * 2
  const filtre = `crop=${l}:${h}:${x}:${y},scale=${L}:${H}:flags=lanczos`
  if (!spec.decoupe || spec.decoupe === 'aucune') {
    const r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-i', source, '-vf', filtre, '-q:v', '2', sortie])
    if (r.code !== 0) throw new Error('recadrage : ' + r.erreur.slice(0, 300))
    return { largeur: L, hauteur: H, x, y, k: L / l, bx: 0, by: 0 }
  }
  const brut = lancer(O.ffmpeg, ['-v', 'error', '-i', source, '-vf', filtre, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { binaire: true })
  if (brut.code !== 0 || brut.sortie.length !== L * H * 3) throw new Error('décodage : ' + brut.erreur.slice(0, 300))
  for (const [mx, my, ml, mh] of spec.masques || []) {
    const x0 = Math.max(0, Math.round((mx - x) * k)), y0 = Math.max(0, Math.round((my - y) * k))
    const x1 = Math.min(L, Math.round((mx + ml - x) * k)), y1 = Math.min(H, Math.round((my + mh - y) * k))
    for (let j = y0; j < y1; j++) brut.sortie.fill(255, (j * L + x0) * 3, (j * L + x1) * 3)
  }
  const { rgba, boite } = detourer(brut.sortie, L, H, spec)
  const [bx, by, bl, bh] = boite
  const coupe = Buffer.alloc(bl * bh * 4)
  for (let j = 0; j < bh; j++) rgba.copy(coupe, j * bl * 4, ((by + j) * L + bx) * 4, ((by + j) * L + bx + bl) * 4)
  const r = lancer(O.ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${bl}x${bh}`, '-i', '-', '-frames:v', '1', sortie], { entree: coupe })
  if (r.code !== 0) throw new Error('écriture PNG : ' + r.erreur.slice(0, 300))
  // Correspondance source → image préparée : p' = (p - [x, y]) · k - [bx, by]
  return { largeur: bl, hauteur: bh, x, y, k: L / l, bx, by }
}

/** Détourage d'un packshot sur fond blanc : remplissage depuis les bords, composantes, bord adouci. */
export function detourer(rgb, L, H, spec = {}) {
  const N = L * H
  const seuil = spec.seuilBlanc ?? 232
  const blancAt = (i) => {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b)
    return mn >= seuil && mx - mn <= 22
  }
  // 1. Fond = blanc relié aux bords.
  const fond = new Uint8Array(N)
  const file = new Int32Array(N)
  let tete = 0, queue = 0
  const pousser = (i) => { if (!fond[i] && blancAt(i)) { fond[i] = 1; file[queue++] = i } }
  for (let X = 0; X < L; X++) { pousser(X); pousser((H - 1) * L + X) }
  for (let Y = 0; Y < H; Y++) { pousser(Y * L); pousser(Y * L + L - 1) }
  while (tete < queue) {
    const i = file[tete++], X = i % L
    if (X > 0) pousser(i - 1)
    if (X < L - 1) pousser(i + 1)
    if (i >= L) pousser(i - L)
    if (i < N - L) pousser(i + L)
  }
  // 2. Composantes du premier plan (4-connexité).
  const comp = new Int32Array(N).fill(-1)
  const tailles = []
  for (let s = 0; s < N; s++) {
    if (fond[s] || comp[s] !== -1) continue
    const id = tailles.length
    let n = 0
    tete = 0; queue = 0; file[queue++] = s; comp[s] = id
    while (tete < queue) {
      const i = file[tete++], X = i % L; n++
      const v = [X > 0 ? i - 1 : -1, X < L - 1 ? i + 1 : -1, i >= L ? i - L : -1, i < N - L ? i + L : -1]
      for (const j of v) if (j >= 0 && !fond[j] && comp[j] === -1) { comp[j] = id; file[queue++] = j }
    }
    tailles.push(n)
  }
  let garder
  if (spec.decoupe === 'plus-grand') {
    const m = tailles.indexOf(Math.max(...tailles))
    garder = (c) => c === m
  } else {
    const mini = N * (spec.aireMin ?? 0.0015)
    garder = (c) => tailles[c] >= mini
  }
  // 3. Alpha (1 = gardé), bord adouci sur un anneau de 1 px, blanc retiré des pixels de bord.
  const rgba = Buffer.alloc(N * 4)
  let x0 = L, y0 = H, x1 = 0, y1 = 0
  for (let i = 0; i < N; i++) {
    const c = comp[i]
    if (c === -1 || !garder(c)) continue
    const X = i % L, Y = (i / L) | 0
    let a = 255
    const voisinsFond = (X > 0 && fond[i - 1]) || (X < L - 1 && fond[i + 1]) || (i >= L && fond[i - L]) || (i < N - L && fond[i + L])
    let r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    if (voisinsFond) {
      const mn = Math.min(r, g, b)
      a = Math.max(60, Math.min(255, Math.round(((255 - mn) / (255 - 170)) * 255)))
      const t = a / 255
      r = Math.max(0, Math.min(255, Math.round((r - (1 - t) * 255) / t)))
      g = Math.max(0, Math.min(255, Math.round((g - (1 - t) * 255) / t)))
      b = Math.max(0, Math.min(255, Math.round((b - (1 - t) * 255) / t)))
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y
  }
  if (x1 < x0) throw new Error('détourage vide : aucun objet trouvé sur fond blanc')
  const m = 6
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(L - 1, x1 + m); y1 = Math.min(H - 1, y1 + m)
  return { rgba, boite: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], pieces: tailles.filter((t, c) => garder(c)).length }
}
