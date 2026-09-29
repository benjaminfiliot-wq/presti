#!/usr/bin/env node
// scripts/studio/monter.mjs <echantillon> — monte un échantillon de 15 s du Studio (fiche 026-158).
//
// Entrées (dossier de l'échantillon, dans le vault, jamais dans le dépôt) : script.json { marque, produit, lignes,
// allegations, presentateur_virtuel }, voix.mp3 (ff_siwis), fonds/*.jpg facultatifs (FLUX.1 schnell, jamais le produit ni
// une personne) ; et, dans le dossier de la marque au-dessus : produit.jpg, la vraie photo du produit.
// Sortie : <échantillon>/sortie/echantillon.mp4 (1080x1920, 15 s, 30 i/s, H.264 ≥ 3 200 kbps, voix normalisée -14 LUFS).
//
// Aucun plan généré : les six plans sont faits de la seule photo (cadrage plein, zoom lent ancré en haut, tantôt à
// gauche tantôt à droite), sur un fond de fonds/ ou, sans fond, un aplat de la couleur dominante de la photo. Six plans de
// 2,5 s parce que le juge (video-qa, profil pub-locale) demande au moins 3 coupes par tranche de 10 s, soit 5 coupes sur
// 15 s. La mention IA et le filigrane viennent de gabarits-pubs/studio/contrat-habillage.json (au juge, jamais modifié ici).
// Tourne sur l'usine (Linux, PC éteint) comme sur le poste (Windows) : chemins par `path`, `hyperframes` puis `ffmpeg`/`ffprobe`
// pris dans le PATH. N'écrit que dans le dossier de l'échantillon (hf/, sortie/, error.log).
//
// Codes : 0 monté ; 1 refus ou échec (message sur stderr) ; jamais process.exit() (Node 24 Windows : assertion libuv).
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..', '..')
const CHEMIN_CONTRAT = path.join(RACINE, 'gabarits-pubs', 'studio', 'contrat-habillage.json')
const DOSSIER_HABILLAGE = path.join(RACINE, 'gabarits-pubs', 'studio', 'habillage')

const VERSION_HF = '0.8.33'
const DUREE_S = 15
const PLANS = 6
const DUREE_PLAN_S = DUREE_S / PLANS
// Deux exigences du juge tirent en sens contraire (mesurées le 29/09 par simulation puis sur le rendu réel) : chaque coupe doit
// faire un saut ≥ 0,085 (COUPE_EPS de video-qa, 5 coupes sur 15 s) et le produit, sous sous-titres, doit rester à une distance
// ≤ 10 de produit.jpg (PQ-7). Un zoom centré à 1,16 ne sautait que de 0,081 (0 coupe comptée) ; à 1,22 le sous-titre portait PQ-7
// à 13. Ancré en haut, à gauche puis à droite, un zoom de 1,13 saute de ~0,098 et reste sous 9,5 : le haut du produit garde sa place
// dans la bande, seuls les côtés glissent.
const ZOOM_FIN = 1.13
const ANCRAGES = ['0% 0%', '100% 0%', '0% 0%', '100% 0%', '0% 0%', '100% 0%']
const DEBIT_MIN_KBPS = 3200
const DEBIT_CIBLE_KBPS = 3800
const GROUPE_MAX_CARACTERES = 20 // groupes courts : une ligne d'environ 400 px (PQ-7 mesure le produit, et la boîte du sous-titre s'ajoute à sa distance)
const MAX_FONDS = 6
const ESSAIS_HF = 3

class Refus extends Error {}

// Tournures de témoignage (le juge pub-qa PQ-6 en connaît neuf : on refuse les mêmes dès le montage).
const TEMOIGNAGES = ["j'ai testé", "j'utilise", 'ma peau', 'depuis que je', 'je recommande', 'mon avis', 'client ravi', "j'adore", 'mon expérience']
const normaliser = (t) => String(t).toLowerCase().normalize('NFC').replace(/[’']/g, '').replace(/[.,;:!?…«»"()%]/g, ' ').replace(/\s+/g, ' ').trim()

function lancer(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024, ...options })
  return { code: r.status ?? (r.error ? 127 : 1), stdout: r.stdout || '', stderr: r.stderr || '', error: r.error, brut: r }
}
function ffmpeg(args) {
  const r = lancer('ffmpeg', ['-y', '-v', 'error', ...args])
  if (r.code !== 0) throw new Error(`ffmpeg ${args.slice(0, 4).join(' ')}… : ${(r.stderr || String(r.error || '')).trim().slice(0, 300)}`)
  return r
}
function sonder(fichier) {
  const r = lancer('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', fichier])
  if (r.code !== 0) throw new Error(`ffprobe ${path.basename(fichier)} : ${(r.stderr || String(r.error || '')).trim().slice(0, 200)}`)
  const j = JSON.parse(r.stdout)
  const video = (j.streams || []).find((s) => s.codec_type === 'video')
  return {
    largeur: video ? Number(video.width) : null,
    hauteur: video ? Number(video.height) : null,
    duree: Number(j.format?.duration) || 0,
    octets: Number(j.format?.size) || 0,
    debitKbps: video && Number(video.bit_rate) ? Number(video.bit_rate) / 1000 : null,
  }
}

function lireArguments() {
  let echantillon = null
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--echantillon=')) echantillon = a.slice('--echantillon='.length)
    else if (a.startsWith('--')) continue // --marque=… et autres options du juge : sans effet, la marque vient de script.json
    else echantillon = a
  }
  if (!echantillon) throw new Refus('dossier de l’échantillon manquant (usage : node scripts/studio/monter.mjs <échantillon>)')
  return path.resolve(RACINE, echantillon)
}

function lireScript(dirEch) {
  const p = path.join(dirEch, 'script.json')
  if (!fs.existsSync(p)) throw new Refus(`script.json absent (${p})`)
  let s
  try { s = JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { throw new Refus(`script.json illisible : ${e.message}`) }
  if (!s || typeof s.marque !== 'string' || !s.marque.trim()) throw new Refus('script.json sans marque')
  if (!Array.isArray(s.lignes) || !s.lignes.length || s.lignes.some((l) => typeof l !== 'string' || !l.trim())) throw new Refus('script.json : lignes vides ou absentes')
  if (s.presentateur_virtuel === true) throw new Refus('presentateur_virtuel: true refusé (contre-revue du 25/09 : aucun présentateur virtuel, aucun plan généré)')
  const n = normaliser(s.lignes.join(' '))
  for (const t of TEMOIGNAGES) if (n.includes(normaliser(t))) throw new Refus(`tournure de témoignage interdite dans les lignes : « ${t} »`)
  return s
}

const echapper = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Le calque d'une zone du contrat (mention, filigrane), dessiné comme la référence du juge : fond du contrat, texte centré. */
function svgZone(zone, texte) {
  const tailleLigne = zone.taille * (zone.interligne || 1.15)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${zone.largeur}" height="${zone.hauteur}">` +
    `<rect width="100%" height="100%" fill="${zone.fond}"/>` +
    texte.split('\n').map((l, i) => `<text x="${zone.largeur / 2}" y="${zone.taille + i * tailleLigne}" font-family="${zone.police}, sans-serif" font-size="${zone.taille}" text-anchor="middle" fill="${zone.couleur}">${echapper(l)}</text>`).join('') +
    '</svg>'
}

/** Découpe les lignes en groupes courts, chacun avec sa fenêtre [début, durée] proportionnelle à sa longueur, sur la durée de la voix. */
function groupesSousTitres(lignes, dureeVoix) {
  const groupes = []
  for (const ligne of lignes) {
    let courant = ''
    for (const mot of ligne.trim().split(/\s+/)) {
      if (courant && (courant + ' ' + mot).length > GROUPE_MAX_CARACTERES) { groupes.push(courant); courant = mot } else courant = courant ? `${courant} ${mot}` : mot
    }
    if (courant) groupes.push(courant)
  }
  const total = Math.min(DUREE_S, Math.max(dureeVoix + 0.3, 2))
  const poids = groupes.reduce((a, g) => a + g.length, 0)
  let t = 0
  return groupes.map((texte) => {
    const duree = Math.max(0.4, (texte.length / poids) * total)
    const g = { texte, debut: Math.min(t, DUREE_S - 0.4), duree: Math.min(duree, DUREE_S - t) }
    t += duree
    return g
  }).filter((g) => g.duree >= 0.2)
}

function couleurDominante(photo) {
  const r = lancer('ffmpeg', ['-v', 'error', '-i', photo, '-vf', 'scale=1:1', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer' })
  const b = r.brut.stdout
  if (r.code !== 0 || !b || b.length < 3) return '#1a1a1a'
  return `#${[b[0], b[1], b[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function cliHyperframes() {
  const direct = lancer('hyperframes', ['--version'])
  if (!direct.error && direct.code === 0 && direct.stdout.includes(VERSION_HF)) return { cmd: 'hyperframes', pre: [], shell: false }
  const win = process.platform === 'win32'
  return { cmd: win ? 'npx.cmd' : 'npx', pre: ['--yes', `hyperframes@${VERSION_HF}`], shell: win }
}
/** `hyperframes <args>` dans `cwd` ; un dépassement de délai du navigateur (poste chargé) est retenté, une vraie erreur non. */
function hyperframes(args, cwd, journal) {
  const cli = cliHyperframes()
  let dernier
  for (let essai = 1; essai <= ESSAIS_HF; essai++) {
    dernier = lancer(cli.cmd, [...cli.pre, ...args], { cwd, shell: cli.shell })
    journal.push(`--- hyperframes ${args[0]} (essai ${essai}) code ${dernier.code}\n${dernier.stdout}\n${dernier.stderr}`)
    if (dernier.code === 0) return dernier
    // Poste ou usine chargé : délai du navigateur ou ffmpeg qui ne démarre pas faute de mémoire → on attend et on retente.
    if (!/Navigation timeout|timed out|ETIMEDOUT|check_runtime_failure|FFmpeg cannot start|Failed to run/i.test(dernier.stdout + dernier.stderr)) break
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15_000)
  }
  throw new Error(`hyperframes ${args[0]} en échec (code ${dernier.code}) : ${(dernier.stdout + dernier.stderr).replace(/\s+/g, ' ').trim().slice(-300)}`)
}

function monter() {
  const dirEch = lireArguments()
  const dirMarque = path.dirname(dirEch)
  if (!fs.existsSync(dirEch)) throw new Refus(`dossier d’échantillon introuvable : ${dirEch}`)
  const script = lireScript(dirEch)
  const contrat = JSON.parse(fs.readFileSync(CHEMIN_CONTRAT, 'utf8'))

  // Aucun plan généré : un plans/ de vidéos est refusé net (contre-revue du 25/09 au soir).
  const plansDir = path.join(dirEch, 'plans')
  if (fs.existsSync(plansDir) && fs.readdirSync(plansDir).some((f) => /\.(mp4|mov|webm|mkv)$/i.test(f))) throw new Refus('plans/ contient des vidéos générées : refusé, les plans sont faits de la vraie photo')

  const produit = path.join(dirMarque, 'produit.jpg')
  if (!fs.existsSync(produit) || fs.statSync(produit).size === 0) throw new Refus(`produit.jpg absent ou vide (${produit})`)
  const voix = path.join(dirEch, 'voix.mp3')
  if (!fs.existsSync(voix) || fs.statSync(voix).size === 0) throw new Refus(`voix.mp3 absente ou vide (${voix})`)
  const dureeVoix = sonder(voix).duree
  if (dureeVoix > DUREE_S + 0.3) throw new Refus(`la voix dure ${dureeVoix.toFixed(1)} s, plus que les ${DUREE_S} s de l’échantillon`)

  // Le projet HyperFrames : un dossier avec index.html, hyperframes.json et assets/ à l'intérieur.
  const hf = path.join(dirEch, 'hf')
  fs.rmSync(hf, { recursive: true, force: true })
  const assets = path.join(hf, 'assets')
  fs.mkdirSync(path.join(assets, 'fonds'), { recursive: true })
  fs.copyFileSync(produit, path.join(assets, 'produit.jpg'))
  const fondsSrc = path.join(dirEch, 'fonds')
  const fonds = fs.existsSync(fondsSrc) ? fs.readdirSync(fondsSrc).filter((f) => /\.jpe?g$/i.test(f)).sort().slice(0, MAX_FONDS) : []
  fonds.forEach((f, i) => fs.copyFileSync(path.join(fondsSrc, f), path.join(assets, 'fonds', `fond-${i}.jpg`)))
  // La voix seule, normalisée AVANT d'être posée (mémoire loudnorm-apres-un-carton-muet).
  ffmpeg(['-i', voix, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'libmp3lame', '-q:a', '3', path.join(assets, 'voix.mp3')])

  const sonde = sonder(produit)
  const ratio = sonde.largeur && sonde.hauteur ? sonde.largeur / sonde.hauteur : 9 / 16
  const modePhoto = Math.abs(ratio - 9 / 16) <= 0.08 ? 'couvre' : 'contient'
  const couleur = couleurDominante(produit)

  const plan = (i, avecFond) => {
    const debut = i * DUREE_PLAN_S
    const fond = avecFond && fonds.length ? `<img id="fond-${i}" class="fond" src="assets/fonds/fond-${i % fonds.length}.jpg" alt="">` : ''
    return `<div id="plan-${i}" class="clip plan" data-start="${debut}" data-duration="${DUREE_PLAN_S}">` +
      `${fond}<img id="photo-${i}" class="photo ${modePhoto}" src="assets/produit.jpg" alt="" data-start="${debut}" style="transform-origin:${ANCRAGES[i % ANCRAGES.length]}"></div>`
  }
  const plans = Array.from({ length: PLANS - 1 }, (_, i) => plan(i, true)).join('\n    ')
  const planProduit = plan(PLANS - 1, false) // le plan d'étiquette : la vraie photo, lent zoom, fond neutre (aplat)

  const zm = contrat.zone_mention, zf = contrat.zone_filigrane
  const texteMention = script.voix === false ? zm.texte_video_ia : zm.texte_video_voix_ia
  const texteFiligrane = zf.gabarit.replace('{marque}', script.marque)
  const zonesCss = `#mention { left: ${zm.x}px; top: ${zm.y}px; width: ${zm.largeur}px; height: ${zm.hauteur}px; z-index: 100; }\n    ` +
    `#filigrane { left: ${zf.x}px; top: ${zf.y}px; width: ${zf.largeur}px; height: ${zf.hauteur}px; z-index: 100; }`
  const sousTitres = groupesSousTitres(script.lignes, dureeVoix)
    .map((g, i) => `<div id="st-${i}" class="clip sous-titre" data-start="${g.debut.toFixed(2)}" data-duration="${g.duree.toFixed(2)}" style="z-index:50"><span>${echapper(g.texte)}</span></div>`).join('\n    ')

  const marques = {
    couleur_fond: couleur, duree_plan: String(DUREE_PLAN_S), zoom_fin: String(ZOOM_FIN), zones_css: zonesCss,
    plans, produit: planProduit, mention: svgZone(zm, texteMention), filigrane: svgZone(zf, texteFiligrane), sous_titres: sousTitres,
    voix: `<audio id="voix" data-start="0" data-duration="${DUREE_S}" src="assets/voix.mp3"></audio>`,
  }
  let html = fs.readFileSync(path.join(DOSSIER_HABILLAGE, 'index.html'), 'utf8')
  for (const [cle, valeur] of Object.entries(marques)) html = html.split(`{{${cle}}}`).join(valeur) // pas de String.replace : un « $' » du texte serait interprété
  const restes = html.match(/\{\{[a-z_]+\}\}/g)
  if (restes) throw new Error(`marques non remplacées dans l’habillage : ${[...new Set(restes)].join(', ')}`)
  fs.writeFileSync(path.join(hf, 'index.html'), html)
  fs.copyFileSync(path.join(DOSSIER_HABILLAGE, 'hyperframes.json'), path.join(hf, 'hyperframes.json'))

  const journal = []
  try {
    hyperframes(['check', '--timeout=60000', '--samples=3', '.'], hf, journal)
    fs.mkdirSync(path.join(hf, 'renders'), { recursive: true })
    const rendu = path.join(hf, 'renders', 'rendu.mp4')
    // Trois navigateurs au plus (chacun ~256 Mo) : « auto » en lançait douze sur un poste de 8 Go déjà chargé, et ffmpeg ne démarrait
    // plus. Mesuré le 29/09 : 76 s à 3 (contre plus de 5 min à 2 sous charge), bien sous les 6 min que pub-qa laisse à ce script.
    hyperframes(['render', '--quality=high', `--video-bitrate=${DEBIT_CIBLE_KBPS}k`, `--workers=${Math.min(3, Math.max(1, os.cpus().length))}`, '--browser-timeout=120', '--player-ready-timeout=120000', '--output=renders/rendu.mp4'], hf, journal)
    if (!fs.existsSync(rendu) || fs.statSync(rendu).size === 0) throw new Error('le rendu HyperFrames n’a produit aucun fichier mp4 dans hf/renders/')

    const sortieDir = path.join(dirEch, 'sortie')
    fs.mkdirSync(sortieDir, { recursive: true })
    const final = path.join(sortieDir, 'echantillon.mp4')
    const m = sonder(rendu)
    const debit = m.debitKbps ?? (m.duree ? (m.octets * 8) / m.duree / 1000 : 0)
    if (debit < DEBIT_MIN_KBPS) {
      // Le juge (video-qa) veut ≥ 3 000 kbps : un débit constant élevé, la voix recopiée telle quelle.
      ffmpeg(['-i', rendu, '-c:v', 'libx264', '-preset', 'medium', '-b:v', `${DEBIT_CIBLE_KBPS}k`, '-minrate', `${DEBIT_CIBLE_KBPS}k`, '-maxrate', `${DEBIT_CIBLE_KBPS}k`,
        '-bufsize', `${DEBIT_CIBLE_KBPS / 2}k`, '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-pix_fmt', 'yuv420p', '-c:a', 'copy', final])
    } else fs.copyFileSync(rendu, final)
    console.log(`monté : ${final} (${sonder(final).duree.toFixed(1)} s, débit du rendu ${Math.round(debit)} kbps)`)
  } catch (e) {
    fs.writeFileSync(path.join(dirEch, 'error.log'), `${e.message}\n\n${journal.join('\n')}`)
    throw e
  }
}

try { monter(); process.exitCode = 0 } catch (e) {
  console.error(`✗ monter.mjs : ${e.message}`)
  process.exitCode = 1
}
