// scripts/fixtures/026-pubs-contenu/studio/commun.mjs — le socle des jeux d'essai du Studio (fiche 026-128, « Ce qu'il
// faut faire », point 1), partagé par scripts/studio-garde-qa.mjs et scripts/pub-qa.mjs. Une seule marque fictive,
// « Maison Témoin-Seize » : un produit dessiné par script (SVG rendu en JPEG par sharp — aucune photo réelle, aucune
// personne), une page produit fictive datée, un script.json de démonstration (aucun témoignage, chaque allégation
// sourcée mot pour mot dans la page). Rien de ceci n'est une marque réelle (fiche 026-128, « C'est fini quand »).
//
// Voix : Microsoft Hortense (SAPI, Windows), lue par PowerShell, coupée de son silence de fin, normalisée à −14 LUFS
// en deux passes — jamais l'inverse (mémoire loudnorm-apres-un-carton-muet). Même recette que scripts/fixtures/026-
// pubs-contenu/socle/fabriquer-films.mjs (026-124), reparamétrée sur un texte quelconque.
//
// Index : MARQUE_CLE, MARQUE_NOM, PRODUIT_NOM, PRODUIT_POIDS_G, PART_NATURELLE, ALLEGATIONS, LIGNES ·
//   fabriquerProduit(dest), fabriquerProduitAbime(dest) (SG-7/PQ-7 : étiquette retouchée) ·
//   fabriquerPageProduit(dest, date) (retourne le texte écrit) ·
//   scriptTemoin(overrides) → { marque, produit, lignes, allegations, presentateur_virtuel } ·
//   lireContrat() → gabarits-pubs/studio/contrat-habillage.json relu ·
//   fabriquerVoix(texte, dest) → chemin du wav à −14 LUFS · existeNonVide, ffmpeg, ffmpegMesure, lancer
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const R = path.resolve(ICI, '..', '..', '..', '..')
export const CONTRAT_HABILLAGE = path.join(R, 'gabarits-pubs', 'studio', 'contrat-habillage.json')

// ── La marque fictive (jamais une marque réelle) ─────────────────────────────────────────────────────────────────────
export const MARQUE_CLE = 'maison-solane'
export const MARQUE_NOM = 'Maison Solane'
export const PRODUIT_NOM = 'Savon nourrissant à base d’avoine'
export const PRODUIT_POIDS_G = 150
export const PART_NATURELLE = 98

// Les allégations sourcées : chaque `extrait_source` figure mot pour mot dans fabriquerPageProduit(). Chaque nombre
// des lignes (98, 150) figure dans au moins un extrait (PQ-5). Formulation choisie aussi pour la voix de synthèse :
// aucun mot qui se confond avec un nombre (« seize », « vingt »…), aucun verbe au son proche d'un nom (« durer » /
// « durée ») — défauts trouvés le 28/09 en transcrivant réellement le témoin avec faster-whisper.
export const ALLEGATIONS = [
  { texte: `Formulé avec ${PART_NATURELLE} % d’ingrédients d’origine naturelle.`, extrait_source: `${PART_NATURELLE} % d’ingrédients d’origine naturelle` },
  { texte: 'Fabriqué en France, dans un atelier artisanal.', extrait_source: 'Fabriqué en France' },
  { texte: `Un format de ${PRODUIT_POIDS_G} g, facile à emporter.`, extrait_source: `${PRODUIT_POIDS_G} g` },
]
// Les lignes de la démonstration : jamais de témoignage (« j'ai testé », « ma peau »… — PQ-6), une phrase par
// allégation dans le même ordre, plus une phrase d'ouverture qui nomme le produit.
export const LIGNES = [
  `Le savon ${MARQUE_NOM}, un soin nourrissant à base d’avoine.`,
  ...ALLEGATIONS.map((a) => a.texte),
]

const PHRASE_TEMOIGNAGE = "J’ai testé ce savon, ma peau ne l’a jamais autant aimé."

export function lireContrat() { return JSON.parse(fs.readFileSync(CONTRAT_HABILLAGE, 'utf8')) }

// ── Petits outils processus ──────────────────────────────────────────────────────────────────────────────────────────
export const existeNonVide = (f) => { try { return fs.statSync(f).size > 0 } catch { return false } }
export function lancer(bin, args, { entree, timeout = 120_000 } = {}) {
  const r = spawnSync(bin, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28, input: entree, timeout })
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '', signal: r.signal, erreur: r.error ? String(r.error.message || r.error) : null }
}
export function ffmpeg(args, opts) {
  const r = lancer('ffmpeg', ['-y', '-v', 'error', ...args], opts)
  if (r.code !== 0) throw new Error(`ffmpeg ${args.join(' ')}\n${r.stderr || r.erreur}`)
  return r
}
/** Certains filtres (loudnorm print_format=json, silencedetect) n'écrivent qu'au niveau « info » : jamais -v error ici. */
export function ffmpegMesure(args) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'info', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 })
  return r.stderr || ''
}

// ── Le produit dessiné par script : un pot de savon, étiquette lisible ──────────────────────────────────────────────
function svgProduit({ abimee = false } = {}) {
  // Un pot (couvercle + corps) sur fond clair, une étiquette blanche avec le nom de la marque, le produit et le poids.
  // Canevas 1080×1920 (le format vertical du contrat, gabarits-pubs/studio/contrat-habillage.json) : scale+crop du
  // montage (scripts/pub-qa.mjs::segmentProduit) ne recadre alors presque rien — la comparaison à l'écran garde le
  // même cadrage que ce fichier (défaut trouvé le 28/09 : un canevas 1000×1400 se faisait tronquer sur les côtés).
  // `abimee` (PQ-7, --etalonner) : l'étiquette retouchée (teinte et rotation), pour faire chuter la ressemblance.
  const teinteEtiquette = abimee ? '#6a3d2b' : '#33301f'
  const decalage = abimee ? 30 : 0
  const t = abimee ? 'rotate(4 540 1010)' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#5f6b52"/>
  <ellipse cx="540" cy="1760" rx="330" ry="56" fill="#3d4535" opacity="0.55"/>
  <rect x="370" y="150" width="340" height="110" rx="20" fill="#4a4230"/>
  <rect x="240" y="255" width="600" height="1500" rx="90" fill="#e8e4d4" stroke="#8a8264" stroke-width="9"/>
  <rect x="${300 + decalage}" y="650" width="480" height="720" rx="30" fill="#ffffff" stroke="${teinteEtiquette}" stroke-width="5" transform="${t}"/>
  <text x="${540 + decalage}" y="800" font-family="Arial, sans-serif" font-size="58" font-weight="700" text-anchor="middle" fill="${teinteEtiquette}" transform="${t}">MAISON</text>
  <text x="${540 + decalage}" y="875" font-family="Arial, sans-serif" font-size="58" font-weight="700" text-anchor="middle" fill="${teinteEtiquette}" transform="${t}">SOLANE</text>
  <line x1="${370 + decalage}" y1="925" x2="${710 + decalage}" y2="925" stroke="${teinteEtiquette}" stroke-width="3" transform="${t}"/>
  <text x="${540 + decalage}" y="1010" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="${teinteEtiquette}" transform="${t}">Savon nourrissant</text>
  <text x="${540 + decalage}" y="1055" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="${teinteEtiquette}" transform="${t}">a l avoine</text>
  <text x="${540 + decalage}" y="1220" font-family="Arial, sans-serif" font-size="34" text-anchor="middle" fill="${teinteEtiquette}" transform="${t}">${PART_NATURELLE}% naturel</text>
  <text x="${540 + decalage}" y="1275" font-family="Arial, sans-serif" font-size="34" text-anchor="middle" fill="${teinteEtiquette}" transform="${t}">${PRODUIT_POIDS_G} g</text>
  </svg>`
}
/** produit.jpg conforme : 1080×1920 (format du contrat), le pot occupant largement le cadre. */
export async function fabriquerProduit(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  await sharp(Buffer.from(svgProduit())).jpeg({ quality: 92 }).toFile(dest)
  return dest
}
/** L'étiquette retouchée (PQ-7, --etalonner) : teinte et rotation, pour faire chuter la corrélation avec produit.jpg. */
export async function fabriquerProduitAbime(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  await sharp(Buffer.from(svgProduit({ abimee: true }))).jpeg({ quality: 92 }).toFile(dest)
  return dest
}

// ── La page produit fictive, datée ───────────────────────────────────────────────────────────────────────────────────
/** Écrit une page produit HTML datée (les allégations y figurent mot pour mot) ; → le texte écrit (pour relecture). */
export function fabriquerPageProduit(dest, date = new Date()) {
  const jj = String(date.getDate()).padStart(2, '0'), mm = String(date.getMonth() + 1).padStart(2, '0'), aaaa = date.getFullYear()
  const texte = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${PRODUIT_NOM} — ${MARQUE_NOM}</title></head><body>
<article data-page-produit data-capturee-le="${aaaa}-${mm}-${jj}">
  <h1>${PRODUIT_NOM}</h1>
  <p>${MARQUE_NOM} propose ${PRODUIT_NOM.toLowerCase()}, ${ALLEGATIONS[0].extrait_source}.</p>
  <p>${ALLEGATIONS[1].extrait_source}, ce savon est pensé pour un usage quotidien.</p>
  <p>Format : ${ALLEGATIONS[2].extrait_source}.</p>
  <p>Page capturée le ${jj}/${mm}/${aaaa} (jeu d’essai fictif, fiche 026-128 — aucune marque réelle).</p>
</article>
</body></html>`
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, texte, 'utf8')
  return texte
}

// ── Le script.json de démonstration ──────────────────────────────────────────────────────────────────────────────────
/**
 * scriptTemoin({ lignes, allegations, presentateur_virtuel, avecTemoignage }) → l'objet du contrat (fiche 026-128,
 * « Contrat du vault Studio ») : { marque, produit, lignes, allegations, presentateur_virtuel }.
 * avecTemoignage: true remplace la dernière ligne par une tournure de témoignage (PQ-6, --etalonner).
 */
export function scriptTemoin({ lignes = LIGNES, allegations = ALLEGATIONS, presentateur_virtuel = false, avecTemoignage = false } = {}) {
  const l = avecTemoignage ? [...lignes, PHRASE_TEMOIGNAGE] : lignes
  return { marque: MARQUE_NOM, produit: PRODUIT_NOM, lignes: l, allegations, presentateur_virtuel }
}

// ── La voix française, normalisée à −14 LUFS (SAPI Hortense, comme le socle 026-124) ───────────────────────────────
export function fabriquerVoix(texte, dest, { travail } = {}) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const dossierTmp = travail || path.dirname(dest)
  const brut = path.join(dossierTmp, `voix-brute-${path.basename(dest, '.wav')}.wav`)
  const ps = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voix = $s.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like '*Hortense*' } | Select-Object -First 1
if (-not $voix) { Write-Error 'voix Microsoft Hortense introuvable'; exit 2 }
$s.SelectVoice($voix.VoiceInfo.Name)
$s.Rate = 2
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$s.SetOutputToWaveFile('${brut.replace(/\\/g, '\\\\')}', $fmt)
$s.Speak('${texte.replace(/['’]/g, "''")}')
$s.SetOutputToNull()
`.trim()
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true, timeout: 60_000 })
  if (r.status !== 0 || !existeNonVide(brut)) throw new Error(`PowerShell (voix SAPI) : code ${r.status}\n${r.stderr}`)

  // Plusieurs phrases → plusieurs pauses internes (silence_start à chaque point) : c'est la DERNIÈRE qui marque le
  // silence de fin, jamais la première (sinon la voix est coupée après la première phrase — défaut trouvé le 28/09).
  const journal = ffmpegMesure(['-i', brut, '-af', 'silencedetect=noise=-45dB:d=0.2', '-f', 'null', '-'])
  const debuts = [...journal.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]))
  const coupureA = debuts.filter((t) => t > 1).sort((a, b) => b - a)[0]
  const coupe = path.join(dossierTmp, `voix-coupee-${path.basename(dest, '.wav')}.wav`)
  if (coupureA) ffmpeg(['-i', brut, '-t', String(coupureA), coupe]); else fs.copyFileSync(brut, coupe)

  const mesure = ffmpegMesure(['-i', coupe, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'])
  const bloc = mesure.match(/\{[\s\S]*?\}/)
  if (!bloc) throw new Error(`loudnorm (mesure) : JSON introuvable\n${mesure}`)
  const mes = JSON.parse(bloc[0])
  ffmpeg(['-i', coupe, '-af',
    `loudnorm=I=-14:TP=-1.5:LRA=7:measured_I=${mes.input_i}:measured_TP=${mes.input_tp}:measured_LRA=${mes.input_lra}:measured_thresh=${mes.input_thresh}:offset=0:linear=true`,
    '-ar', '48000', dest])
  if (!existeNonVide(dest)) throw new Error(`${dest} vide après loudnorm`)
  return dest
}
