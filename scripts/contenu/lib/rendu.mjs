// scripts/contenu/lib/rendu.mjs — les adaptateurs de fabrication de scripts/contenu/fabriquer.mjs (fiche 026-209, étapes 3 et 4) :
// capture Playwright de Presti (démo ou fixtures seulement, données masquées AVANT la capture), voix locale `ff_siwis`
// (`hyperframes tts`, Kokoro), rendu HyperFrames, variantes ffmpeg par réseau, sonde ffprobe.
//
// Tourne sur l'usine (Linux, PC éteint) comme sur le poste (Windows) : chemins par `path`, `hyperframes`, `ffmpeg`, `ffprobe`
// pris dans le PATH, jamais de shell (sauf `npx.cmd` sous Windows, sans `|` dans ses arguments). Aucun secret lu, aucun réseau
// hors le navigateur de capture, qui n'ouvre que localhost ou les hôtes de démo déclarés dans `PRESTI_HOTES_DEMO`.
// Le rendu est déterministe : mêmes entrées, même projet HyperFrames ; rien n'est généré par un modèle.
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const VERSION_HF = '0.8.33'
const DEBIT_CIBLE_KBPS = 3800
const DEBIT_AUDIO_KBPS = 128
const TAILLE_TIKTOK_CIBLE_OCTETS = 9_300_000 // marge sous les 9,5 Mo décimaux
const GROUPE_MAX_CARACTERES = 20
const MASQUES_PAR_DEFAUT = ['input', 'textarea', '[data-sensible]']

const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function lancer(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024, ...options })
  return { code: r.status ?? (r.error ? 127 : 1), stdout: r.stdout || '', stderr: r.stderr || '', error: r.error }
}
function ffmpeg(args) {
  const r = lancer('ffmpeg', ['-y', '-v', 'error', ...args])
  if (r.code !== 0) throw new Error(`ffmpeg ${args.slice(0, 4).join(' ')}… : ${(r.stderr || String(r.error || '')).trim().slice(0, 300)}`)
}
function cliHyperframes() {
  const direct = lancer('hyperframes', ['--version'])
  if (!direct.error && direct.code === 0 && direct.stdout.includes(VERSION_HF)) return { cmd: 'hyperframes', pre: [], shell: false }
  const win = process.platform === 'win32'
  return { cmd: win ? 'npx.cmd' : 'npx', pre: ['--yes', `hyperframes@${VERSION_HF}`], shell: win }
}
function hyperframes(args, cwd) {
  const cli = cliHyperframes()
  let dernier
  for (let essai = 1; essai <= 3; essai++) {
    dernier = lancer(cli.cmd, [...cli.pre, ...args], { cwd, shell: cli.shell })
    if (dernier.code === 0) return dernier
    if (!/Navigation timeout|timed out|ETIMEDOUT|check_runtime_failure|FFmpeg cannot start|Failed to run/i.test(dernier.stdout + dernier.stderr)) break
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15_000)
  }
  throw new Error(`hyperframes ${args[0]} en échec (code ${dernier.code}) : ${(dernier.stdout + dernier.stderr).replace(/\s+/g, ' ').trim().slice(-300)}`)
}

/** ffprobe : octets, durée, présence d'une piste audio, dimensions. Un fichier absent rend `octets: 0` (le verdict refuse). */
export function sonder(fichier) {
  let octets = 0
  try { octets = fs.statSync(fichier).size } catch { return { octets: 0 } }
  if (octets === 0) return { octets: 0 }
  const r = lancer('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', fichier])
  if (r.code !== 0) return { octets: 0 }
  let j
  try { j = JSON.parse(r.stdout) } catch { return { octets: 0 } }
  const video = (j.streams || []).find((s) => s.codec_type === 'video')
  return {
    octets, duree_s: Math.round((Number(j.format?.duration) || 0) * 100) / 100,
    pisteAudio: (j.streams || []).some((s) => s.codec_type === 'audio'),
    largeur: video ? Number(video.width) : null, hauteur: video ? Number(video.height) : null,
  }
}
export const hashFichier = (fichier) => crypto.createHash('sha256').update(fs.readFileSync(fichier)).digest('hex')

/** Groupes courts de sous-titres, fenêtre proportionnelle à la longueur, sur la durée de la voix. */
export function groupesSousTitres(phrases, dureeVoix, duree) {
  const groupes = []
  for (const phrase of phrases) {
    let courant = ''
    for (const mot of phrase.trim().split(/\s+/)) {
      if (courant && (courant + ' ' + mot).length > GROUPE_MAX_CARACTERES) { groupes.push(courant); courant = mot } else courant = courant ? `${courant} ${mot}` : mot
    }
    if (courant) groupes.push(courant)
  }
  const total = Math.min(duree, Math.max(dureeVoix + 0.3, 2))
  const poids = groupes.reduce((a, g) => a + g.length, 0) || 1
  let t = 0
  return groupes.map((texte) => {
    const d = Math.max(0.4, (texte.length / poids) * total)
    const g = { texte, debut: Math.min(t, duree - 0.4), duree: Math.min(d, duree - t) }
    t += d
    return g
  }).filter((g) => g.duree >= 0.2)
}

/** Le projet HyperFrames d'une vidéo : des plans de `10 / coupes_par_10s` secondes (les captures en boucle, zoom lent), les
 *  sous-titres incrustés, la mention IA (voix de synthèse), « Exemple. » si le gabarit l'exige, la voix. Rend le HTML. */
export function projetHtml({ gabarit, captures, groupes, duree, dureeVoix = duree, voixMention, actifs }) {
  const coupes = Number(gabarit?.coupes_par_10s) > 0 ? Number(gabarit.coupes_par_10s) : 5
  const dPlan = 10 / coupes
  const n = Math.ceil(duree / dPlan)
  const plans = Array.from({ length: n }, (_, i) => {
    const debut = i * dPlan, d = Math.min(dPlan, duree - debut)
    const fond = actifs.length ? `<img class="fond" src="assets/actifs/${actifs[i % actifs.length]}" alt="">` : ''
    return `<div id="plan-${i}" class="clip plan" data-start="${debut}" data-duration="${d}">${fond}<img class="capture" src="assets/captures/${captures[i % captures.length]}" alt="" style="transform-origin:${i % 2 ? '100% 0%' : '0% 0%'}"></div>`
  }).join('\n    ')
  const st = groupes.map((g, i) => `<div id="st-${i}" class="clip sous-titre" data-start="${g.debut.toFixed(2)}" data-duration="${g.duree.toFixed(2)}"><span>${echapper(g.texte)}</span></div>`).join('\n    ')
  const exemple = gabarit?.mention_exemple === true ? `<div id="exemple" class="clip mention haut" data-start="0" data-duration="${duree}"><span>Exemple.</span></div>` : ''
  const ia = `<div id="mention-ia" class="clip mention bas" data-start="0" data-duration="${duree}"><span>${echapper(voixMention)}</span></div>`
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Vidéo du service contenu</title>
<style>
  html, body { margin: 0; padding: 0; background: #000; }
  #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #101418; font-family: Arial, sans-serif; }
  .plan { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; overflow: hidden; }
  .plan .fond { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
  .plan .capture { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: contain; animation: zoom-lent ${dPlan}s linear 1 both; }
  @keyframes zoom-lent { from { transform: scale(1); } to { transform: scale(1.06); } }
  .mention { position: absolute; left: 0; width: 1080px; text-align: center; color: #fff; font-weight: bold; font-size: 34px; text-shadow: 0 2px 4px rgba(0,0,0,.9); z-index: 100; }
  .mention span { display: inline-block; padding: 8px 22px; border-radius: 10px; background: #000; }
  .mention.haut { top: 150px; } .mention.bas { bottom: 150px; }
  .sous-titre { position: absolute; left: 190px; width: 700px; bottom: 330px; text-align: center; z-index: 50; }
  .sous-titre span { display: inline-block; max-width: 700px; padding: 8px 18px; border-radius: 12px; background: rgba(0,0,0,.55); color: #fff; font-weight: bold; font-size: 44px; line-height: 1.25; }
</style></head>
<body>
  <div id="root" data-composition-id="root" data-no-timeline data-start="0" data-duration="${duree}" data-width="1080" data-height="1920">
    ${plans}
    ${exemple}
    ${ia}
    ${st}
    <audio id="voix" data-start="0" data-duration="${Math.min(duree, Math.round(dureeVoix * 100) / 100)}" src="assets/voix.mp3"></audio>
  </div>
</body></html>
`
}

function hotesAutorises(env) {
  return (env.PRESTI_HOTES_DEMO || '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
}

export function creerAdaptateurs({ dossier, env = process.env } = {}) {
  let voixFichier = null

  /** Capture chaque page de démo ou de fixtures : champs saisis et zones sensibles masqués dans la page ET sur l'image ; le
   *  texte lisible après masquage est rendu avec la capture, pour que le verdict le relise (jamais le déclaratif). */
  async function capturer(specs) {
    const { chromium } = await import('playwright')
    const sortie = path.join(dossier, 'captures')
    fs.mkdirSync(sortie, { recursive: true })
    const navigateur = await chromium.launch()
    const resultats = []
    try {
      const page = await (await navigateur.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, locale: 'fr-FR' })).newPage()
      for (const s of specs) {
        let u
        try { u = new URL(s.url) } catch { throw new Error(`capture « ${s.id} » : URL invalide`) }
        const hote = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
        const local = hote === 'localhost' || hote === '127.0.0.1' || hote === '::1' || hote.endsWith('.localhost') || hote.endsWith('.test')
        const demo = hotesAutorises(env).includes(hote)
        if (!(u.protocol === 'http:' || u.protocol === 'https:') || (!local && !demo)) throw new Error(`capture « ${s.id} » : hôte « ${hote} » hors démo et fixtures`)
        await page.goto(s.url, { waitUntil: 'networkidle', timeout: 45_000 })
        if (Number(s.attente_ms) > 0) await page.waitForTimeout(Math.min(Number(s.attente_ms), 10_000))
        const selecteurs = [...MASQUES_PAR_DEFAUT, ...(Array.isArray(s.masques) ? s.masques.filter((x) => typeof x === 'string') : [])]
        await page.evaluate((sels) => {
          for (const el of document.querySelectorAll('input, textarea')) { el.value = ''; el.setAttribute('value', '') }
          for (const sel of sels) for (const el of document.querySelectorAll(sel)) { if (!/^(input|textarea)$/i.test(el.tagName)) el.textContent = '[masqué]' }
        }, selecteurs)
        const fichier = path.join(sortie, `${s.id}.png`)
        await page.screenshot({ path: fichier, mask: selecteurs.map((sel) => page.locator(sel)), maskColor: '#000000' })
        const textes = (await page.evaluate(() => document.body.innerText)).split('\n').map((t) => t.trim()).filter(Boolean)
        resultats.push({ id: s.id, fichier, textes, origine: local ? 'fixture' : 'demo', source: s.source ?? null })
      }
    } finally { await navigateur.close() }
    return resultats
  }

  /** Voix locale : Kokoro `ff_siwis` par `hyperframes tts`, normalisée AVANT d'être posée (mémoire loudnorm-après-un-carton-muet). */
  async function synthLocal(texte, voix, lufs = -23) {
    fs.mkdirSync(dossier, { recursive: true })
    const txt = path.join(dossier, 'voix.txt'), wav = path.join(dossier, 'voix.wav'), mp3 = path.join(dossier, 'voix.mp3')
    fs.writeFileSync(txt, texte, 'utf8')
    hyperframes(['tts', txt, `--voice=${voix}`, `--output=${wav}`], dossier)
    ffmpeg(['-i', wav, '-af', `loudnorm=I=${lufs}:TP=-2:LRA=11`, '-ar', '48000', '-c:a', 'libmp3lame', '-q:a', '3', mp3])
    voixFichier = mp3
    return { audio: mp3 }
  }

  /** Les dépendances de `choisirVoix` (lib/studio/voixFish.ts). Fish n'est PAS branché ici : sans clé (`cle: null`) la garde
   *  ferme la voie et rend la voix locale ; brancher Fish est l'affaire de 026-224, après preuve de licence et de quota. */
  function voixDeps(etat = {}) {
    const memoire = new Map()
    return {
      cle: null, sonder: async () => ({ statut: 0 }), droits: etat.droits ?? null, quota: etat.quota ?? null,
      credits: { reserver: () => false, consommer: () => {}, restituer: () => {} }, memoire,
      synthFish: async () => { throw new Error('Fish non branché') }, synthLocal: (t, v) => synthLocal(t, v),
      horloge: { maintenant: () => Date.now() },
    }
  }

  /** Rend la vidéo puis une variante par réseau. TikTok : débit calculé pour rester sous 9,3 Mo, vérifié, retenté à la baisse. */
  async function rendre({ gabarit, phrases, captures, reseaux, medias = [] }) {
    if (!voixFichier || !fs.existsSync(voixFichier)) throw new Error('voix absente : synthèse locale non faite')
    const dureeVoix = sonder(voixFichier).duree_s || 0
    const duree = Math.min(30, Math.max(15, Math.ceil(dureeVoix + 1)))
    const hf = path.join(dossier, 'hf')
    fs.rmSync(hf, { recursive: true, force: true })
    fs.mkdirSync(path.join(hf, 'assets', 'captures'), { recursive: true })
    fs.mkdirSync(path.join(hf, 'assets', 'actifs'), { recursive: true })
    fs.copyFileSync(voixFichier, path.join(hf, 'assets', 'voix.mp3'))
    const noms = captures.map((c) => { const nom = `${c.id}.png`; fs.copyFileSync(c.fichier, path.join(hf, 'assets', 'captures', nom)); return nom })
    const actifs = []
    for (const m of medias) {
      if (typeof m?.fichier === 'string' && fs.existsSync(m.fichier) && /\.(jpe?g|png)$/i.test(m.fichier)) { const nom = path.basename(m.fichier); fs.copyFileSync(m.fichier, path.join(hf, 'assets', 'actifs', nom)); actifs.push(nom) }
    }
    const mention = 'Vidéo et voix générées par IA' // toute voix de synthèse (Kokoro ou Fish) exige la mention IA
    fs.writeFileSync(path.join(hf, 'index.html'), projetHtml({ gabarit, captures: noms, groupes: groupesSousTitres(phrases, dureeVoix, duree), duree, dureeVoix, voixMention: mention, actifs }))
    fs.writeFileSync(path.join(hf, 'hyperframes.json'), JSON.stringify({ width: 1080, height: 1920, fps: 30, duration: duree }))
    hyperframes(['check', '--timeout=60000', '--samples=3', '.'], hf)
    fs.mkdirSync(path.join(hf, 'renders'), { recursive: true })
    hyperframes(['render', '--quality=high', `--video-bitrate=${DEBIT_CIBLE_KBPS}k`, `--workers=${Math.min(3, Math.max(1, os.cpus().length))}`, '--browser-timeout=120', '--player-ready-timeout=120000', '--output=renders/rendu.mp4'], hf)
    const rendu = path.join(hf, 'renders', 'rendu.mp4')
    if (!fs.existsSync(rendu) || fs.statSync(rendu).size === 0) throw new Error('le rendu HyperFrames n\'a produit aucun fichier mp4')
    const sortieDir = path.join(dossier, 'sortie')
    fs.mkdirSync(sortieDir, { recursive: true })
    const variantes = []
    for (const reseau of reseaux) {
      const fichier = path.join(sortieDir, `${reseau}.mp4`)
      let debit = DEBIT_CIBLE_KBPS
      if (reseau === 'tiktok') debit = Math.min(DEBIT_CIBLE_KBPS, Math.floor((TAILLE_TIKTOK_CIBLE_OCTETS * 8) / duree / 1000 - DEBIT_AUDIO_KBPS))
      for (let essai = 0; essai < 4; essai++) {
        ffmpeg(['-i', rendu, '-c:v', 'libx264', '-preset', 'medium', '-b:v', `${debit}k`, '-maxrate', `${debit}k`, '-bufsize', `${debit * 2}k`, '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-b:a', `${DEBIT_AUDIO_KBPS}k`, '-ar', '48000', '-movflags', '+faststart', fichier])
        if (reseau !== 'tiktok' || fs.statSync(fichier).size <= TAILLE_TIKTOK_CIBLE_OCTETS) break
        debit = Math.floor(debit * 0.85) // trop lourd : on baisse et on recommence ; le verdict tranche à la fin
      }
      variantes.push({ reseau, fichier })
    }
    return variantes
  }

  /** Reprise : une voix déjà synthétisée et normalisée (voix.mp3 du dossier) est reprise sans nouvelle synthèse. */
  const poserVoix = (fichier) => { voixFichier = fichier }

  return { capturer, rendre, sonder, hashFichier, voixDeps, poserVoix }
}
