#!/usr/bin/env node
// scripts/pub-qa.mjs — le juge J2 d'un échantillon du Studio (fiche 026-128, « Ce qu'il faut faire », point 3),
// écrit par Claude Code AVANT ce qu'il juge : scripts/studio/monter.mjs (026-158) n'existe pas encore. Dix critères
// (PQ-1 à PQ-10), mesurés par le juge lui-même sur la vidéo qu'il décode (fiche 026-128, « Cahier du juge »).
//
// Un échantillon (contrat de 026-128) : <marque>/echantillon-N/{script.json, voix.mp3, sortie/echantillon.mp4,
// planche.jpg, regard.json, statut.txt}, avec produit.jpg et page-produit-AAAA-MM-JJ.html dans le dossier de la
// marque, un niveau au-dessus. gabarits-pubs/studio/contrat-habillage.json fixe les zones (mention, filigrane) et le
// format (1080×1920, 15 s) : ce juge le lit, ne le modifie jamais.
//
// --temoin : fabrique lui-même un échantillon témoin (marque fictive « Maison Solane », scripts/fixtures/026-pubs-
// contenu/studio/commun.mjs) — un vrai photo dessinée par script, une voix française de synthèse (SAPI Hortense),
// des plans en zoom centré SUR CETTE SEULE PHOTO (aucun plan généré), l'habillage du contrat — puis le juge tel
// quel : les dix critères sont réellement évalués, PAS sautés (à la différence de studio-garde-qa.mjs et studio-
// offre-qa.mjs, dont tous les critères dépendent d'un fichier qui n'existe pas encore — voir leur en-tête). --temoin
// l'emporte toujours sur --monter-temoin (aucun besoin de scripts/studio/monter.mjs, absent tant que 026-158 n'est
// pas fait).
// --etalonner (avec --temoin) : fabrique cinq échantillons à défaut planté depuis le témoin et exige que chacun
// échoue sur son seul critère prévu (fiche 026-128, point 3) ; le témoin propre doit rester vert.
// --monter-temoin (sans --temoin) : fabrique les entrées du témoin (produit, page, script, voix), lance node
// <racine>/scripts/studio/monter.mjs dessus, puis juge sa sortie — c'est le vérificateur de 026-158, une fois
// monter.mjs écrit ; tant qu'il ne l'est pas, échoue proprement sur PQ-1 (monter.mjs absent).
//
// Usage :
//   node scripts/pub-qa.mjs <echantillon-N/> [--racine=<dossier>]     juge un échantillon déjà fabriqué
//   node scripts/pub-qa.mjs --temoin [--etalonner]                   fabrique et juge le témoin (et l'étalonnage)
//   node scripts/pub-qa.mjs --monter-temoin [--racine=<dossier>]     fabrique les entrées, lance monter.mjs, juge
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide.
// N'écrit que sous .orchestre/travail/pub-qa/ (et, avec --etalonner à la racine par défaut, .orchestre/preuves/026-
// 128/etalonnage-pub-qa.md). Aucune donnée réelle : marque et produit fictifs (mémoire demo-photos-licence : jamais
// une vraie photo, jamais une personne).
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { R, lireOptionsOuQuitter, lancer as lancerCommun } from './fixtures/025/commun.mjs'
import { creerRapport, dossierTravail, court, lf } from './lib/sql-essai.mjs'
import * as St from './fixtures/026-pubs-contenu/studio/commun.mjs'

const NOM = 'pub-qa'
const IDS = ['PQ-1', 'PQ-2', 'PQ-3', 'PQ-4', 'PQ-5', 'PQ-6', 'PQ-7', 'PQ-8', 'PQ-9', 'PQ-10']
const DELAI = 4 * 60_000
const posix = (p) => String(p).split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['etalonner', 'monter-temoin'] })
let ARRET = false
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exitCode = 2; ARRET = true }
const ETALONNER = o.drapeau('etalonner')
const MONTER_TEMOIN = o.drapeau('monter-temoin')
if (ETALONNER && !o.temoin) refuser('--etalonner ne se lance qu\'avec --temoin')
if (!o.temoin && !MONTER_TEMOIN && o.positionnels.length !== 1) refuser('un échantillon (dossier echantillon-N/) attendu, ou --temoin, ou --monter-temoin')
if (o.temoin && o.positionnels.length) refuser('--temoin fabrique lui-même l\'échantillon : aucun argument attendu')
const CONTRAT = St.lireContrat()
const TRAVAIL = dossierTravail(NOM)

function lancer(bin, args, opts = {}) { return lancerCommun(bin, args, { cwd: R, timeout: DELAI, ...opts }) }
function jsonOuNull(t) { try { return JSON.parse(t) } catch { return null } }

// ── Extraction d'images (une seule passe, réutilisée par PQ-2, PQ-3, PQ-7, PQ-9) ───────────────────────────────────
/** Extrait des images JPEG à `fps` images/s dans `dossier` (vidé d'abord) → [{ fichier, instant }], triées. */
function extraireImages(video, dossier, fps = 2) {
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.mkdirSync(dossier, { recursive: true })
  const r = lancer('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vf', `fps=${fps}`, '-q:v', '2', path.join(dossier, 'im-%04d.jpg')])
  if (r.code !== 0) throw new Error(`extraction d'images : ${court(r.stderr, 200)}`)
  const noms = fs.readdirSync(dossier).filter((n) => /^im-\d+\.jpg$/.test(n)).sort()
  return noms.map((n, i) => ({ fichier: path.join(dossier, n), instant: i / fps }))
}
/** 16 images, réparties régulièrement sur toute la durée (PQ-9, PQ-10). */
function choisir16(images) {
  if (images.length <= 16) return images
  const pas = (images.length - 1) / 15
  return Array.from({ length: 16 }, (_, i) => images[Math.round(i * pas)])
}

// ── Comparaison d'images (sharp seul, aucune dépendance) ────────────────────────────────────────────────────────────
/** Buffer gris brut, redimensionné à l×h (sans conserver le ratio : le canevas de comparaison est déjà fixé). */
async function grisRedim(source, l, h) {
  // Une petite taille lisse le bruit de compression H.264/JPEG et les petits écarts de cadrage entre deux passages
  // indépendants de boiteContenu() (défaut trouvé le 28/09 : à 48×64, le témoin propre dépassait déjà la distance 10
  // sur des cadres identiques au pixel près avant l'encodage).
  return sharp(source).resize(l, h, { fit: 'fill' }).blur(1.2).greyscale().raw().toBuffer()
}
/** Distance moyenne (0–255) entre deux images, ramenées à la même petite taille. */
async function distanceImages(a, b, { l = 24, h = 32 } = {}) {
  const [ga, gb] = await Promise.all([grisRedim(a, l, h), grisRedim(b, l, h)])
  let s = 0
  for (let i = 0; i < ga.length; i++) s += Math.abs(ga[i] - gb[i])
  return s / ga.length
}
/**
 * La boîte du contenu qui se détache du fond, en pixels. Le fond est lu aux QUATRE COINS (moyennés), jamais par la
 * couleur la plus fréquente : à fort zoom, le produit (clair) devient plus fréquent que le fond et un histogramme
 * désigne alors le produit comme « fond », inversant la boîte (défaut trouvé le 28/09 : un plan à 1,63 sur 30 sautait
 * à une distance de 41 sans aucun changement visible — seule la détection du fond avait basculé).
 */
async function boiteContenu(source) {
  const L = 240
  const meta = await sharp(source).metadata()
  const h = Math.max(2, Math.round((L * meta.height) / meta.width / 2) * 2)
  const { data } = await sharp(source).resize(L, h, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  const C = 6 // taille du carré de coin sondé
  const coin = (x0, y0) => { let s = 0, n = 0; for (let y = y0; y < y0 + C; y++) for (let x = x0; x < x0 + C; x++) { s += data[y * L + x]; n++ } return s / n }
  const niveauFond = (coin(0, 0) + coin(L - C, 0) + coin(0, h - C) + coin(L - C, h - C)) / 4
  let x0 = L, x1 = -1, y0 = h, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < L; x++) {
    if (Math.abs(data[y * L + x] - niveauFond) > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  if (x1 < 0) return null
  return { x: x0 / L, y: y0 / h, largeur: (x1 - x0 + 1) / L, hauteur: (y1 - y0 + 1) / h }
}
/**
 * La bande verticale entre la mention et le filigrane (les deux barres de l'habillage, hors zone sûre) : sans elle,
 * boiteContenu() prend les barres sombres pour du contenu et la boîte déborde sur tout le cadre (défaut trouvé le
 * 28/09). PQ-7 et PQ-9 cherchent le produit dans cette bande, jamais dans le cadre entier.
 */
async function bandeSansHabillage(source) {
  const meta = await sharp(source).metadata()
  const zm = CONTRAT.zone_mention, zf = CONTRAT.zone_filigrane
  const top = zm.y + zm.hauteur
  const height = Math.max(1, Math.min(meta.height - top, zf.y - top))
  return sharp(source).extract({ left: 0, top, width: meta.width, height }).toBuffer()
}
/**
 * Le produit tel qu'il apparaît dans un plan à zoom 1,00 (aucun recadrage) : la même bande, le même contenu détaché
 * du fond que dans un cadre du film — jamais produit.jpg brut, dont le cadrage (davantage de fond visible) ne
 * correspond à aucun plan réel (défaut trouvé le 28/09 : comparer un cadre à produit.jpg entier gonflait la distance
 * à 70+, même sur le tout premier cadre, identique au pixel près avant ce recadrage).
 */
async function referenceProduit(produit) {
  const bande = await bandeSansHabillage(produit)
  const boite = await boiteContenu(bande)
  return boite ? recadrer(bande, boite) : bande
}
/** Recadre `source` (image pleine résolution) sur une boîte en proportions [0,1] (marge de 2 % ajoutée). → Buffer JPEG */
async function recadrer(source, boite) {
  const meta = await sharp(source).metadata()
  const marge = 0.02
  const x0 = Math.max(0, boite.x - marge), y0 = Math.max(0, boite.y - marge)
  const x1 = Math.min(1, boite.x + boite.largeur + marge), y1 = Math.min(1, boite.y + boite.hauteur + marge)
  const left = Math.round(x0 * meta.width), top = Math.round(y0 * meta.height)
  const width = Math.max(1, Math.round((x1 - x0) * meta.width)), height = Math.max(1, Math.round((y1 - y0) * meta.height))
  return sharp(source).extract({ left, top, width: Math.min(width, meta.width - left), height: Math.min(height, meta.height - top) }).toBuffer()
}

// ── Le rendu de référence d'un texte incrusté (même police, même zone que le contrat) ──────────────────────────────
function svgZone(zone, texte) {
  const lignes = texte.split('\n')
  const tailleLigne = zone.taille * (zone.interligne || 1.15)
  const yDepart = zone.taille
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${zone.largeur}" height="${zone.hauteur}">
  <rect width="100%" height="100%" fill="${zone.fond}"/>
  ${lignes.map((l, i) => `<text x="${zone.largeur / 2}" y="${yDepart + i * tailleLigne}" font-family="${zone.police}, sans-serif" font-size="${zone.taille}" text-anchor="middle" fill="${zone.couleur}">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('\n')}
  </svg>`
}
async function rendreReference(zone, texte, dest) {
  await sharp(Buffer.from(svgZone(zone, texte))).jpeg({ quality: 95 }).toFile(dest)
  return dest
}
/** Découpe la zone (pixels du contrat) d'une image pleine résolution → Buffer JPEG de la même taille que la zone. */
async function extraireZone(source, zone) {
  return sharp(source).extract({ left: zone.x, top: zone.y, width: zone.largeur, height: zone.hauteur }).resize(zone.largeur, zone.hauteur).toBuffer()
}
/** 1 − distance/255 : 1 = identique. */
async function correspondance(a, b) { return 1 - (await distanceImages(a, b, { l: 120, h: 40 })) / 255 }

// ── Transcription (faster-whisper, modèle « small », français) ─────────────────────────────────────────────────────
const PY_TRANSCRIRE = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', 'studio', 'transcrire.py')
function transcrire(audio) {
  const r = lancer('python', [PY_TRANSCRIRE, audio], { timeout: 5 * 60_000 })
  if (r.code !== 0) return { erreur: court(r.stderr || r.stdout, 200) }
  const j = jsonOuNull((r.stdout || '').trim().split('\n').pop())
  if (!j) return { erreur: `sortie illisible : ${court(r.stdout, 160)}` }
  return { texte: j.texte }
}
// Normalisation pour le taux d'erreur de mots : minuscules, apostrophes retirées (jointes), ponctuation ôtée.
const normaliserMots = (t) => lf(String(t)).toLowerCase().normalize('NFC')
  .replace(/[’']/g, '').replace(/[.,;:!?…«»"()%]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
function distanceLevenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])
  }
  return d[a.length][b.length]
}
function tauxErreurMots(reference, hypothese) {
  const a = normaliserMots(reference), b = normaliserMots(hypothese)
  if (!a.length) return { taux: 1, edits: b.length, mots: 0 }
  const edits = distanceLevenshtein(a, b)
  return { taux: edits / a.length, edits, mots: a.length }
}

const PHRASES_TEMOIGNAGE = ["j'ai testé", "j'utilise", 'ma peau', 'depuis que je', 'je recommande', 'mon avis', 'client ravi', "j'adore", 'mon expérience']
function contientTemoignage(texte) {
  const n = normaliserMots(texte).join(' ')
  return PHRASES_TEMOIGNAGE.filter((p) => n.includes(normaliserMots(p).join(' ')))
}

// ── Lecture du contrat d'un échantillon ─────────────────────────────────────────────────────────────────────────────
function lireEchantillon(dir) {
  const scriptJson = jsonOuNull(fs.readFileSync(path.join(dir, 'script.json'), 'utf8'))
  const dossierMarque = path.dirname(dir)
  const pageProduit = fs.readdirSync(dossierMarque).find((n) => /^page-produit-\d{4}-\d{2}-\d{2}\.html$/.test(n))
  return {
    scriptJson,
    video: path.join(dir, 'sortie', 'echantillon.mp4'),
    voix: path.join(dir, 'voix.mp3'),
    produit: path.join(dossierMarque, 'produit.jpg'),
    pageProduit: pageProduit ? path.join(dossierMarque, pageProduit) : null,
  }
}

// ── Le jugement des dix critères sur un échantillon déjà fabriqué ──────────────────────────────────────────────────
async function jugerEchantillon(s, dir, { racineVideoQa, racineVisagesQa, travail }) {
  const e = lireEchantillon(dir)
  if (!e.scriptJson) { for (const id of IDS) s.echoue(id, `${rel(path.join(dir, 'script.json'))} absent ou illisible`); return }
  const marque = e.scriptJson.marque || '(marque absente)'

  // ── PQ-1 : video-qa --profil=pub-locale --json ──────────────────────────────────────────────────────────────────
  const scriptVideoQa = path.join(racineVideoQa, 'scripts', 'video-qa.mjs')
  let rapportVideo = null
  if (!fs.existsSync(scriptVideoQa)) { for (const id of IDS) s.echoue(id, `${rel(scriptVideoQa)} absent`); return }
  if (!fs.existsSync(e.video)) { for (const id of IDS) s.echoue(id, `${rel(e.video)} absent`); return }
  {
    const r = lancer(process.execPath, [scriptVideoQa, '--profil=pub-locale', '--json', e.video])
    const rap = jsonOuNull(r.stdout)?.[0]
    rapportVideo = rap
    if (!rap) s.echoue('PQ-1', `video-qa --profil=pub-locale --json : sortie illisible (code ${r.code}) — ${court(r.stderr || r.stdout, 160)}`)
    else {
      const echecs = rap.tests.filter((t) => !t.passe).map((t) => t.nom)
      if (r.code !== 0) s.echoue('PQ-1', `video-qa en échec : ${echecs.join(', ')}`)
      else s.passe('PQ-1', `1080×1920, ${rap.mesures.meta.duree.toFixed(1)} s, ${rap.tests.length} critères pub-locale, tous verts`)
    }
  }

  // ── extraction des images (2/s), réutilisée par PQ-2, PQ-3, PQ-7, PQ-9 ─────────────────────────────────────────────
  let images = []
  try { images = extraireImages(e.video, path.join(travail, 'images')) } catch (err) {
    for (const id of ['PQ-2', 'PQ-3', 'PQ-7', 'PQ-9', 'PQ-10']) s.echoue(id, `extraction d'images : ${court(err.message, 160)}`)
  }
  const duree = rapportVideo?.mesures?.meta?.duree ?? (images.length ? images.at(-1).instant : 0)

  // ── PQ-2 : mention IA, toutes les 0,5 s ─────────────────────────────────────────────────────────────────────────
  if (images.length) {
    const zm = CONTRAT.zone_mention
    let texteAttendu = e.scriptJson.presentateur_virtuel
      ? (e.scriptJson.voix === false ? zm.texte_video_ia : `${zm.texte_video_voix_ia}${zm.suffixe_presentateur}`)
      : (e.scriptJson.voix === false ? zm.texte_video_ia : zm.texte_video_voix_ia)
    const ref = await rendreReference(zm, texteAttendu, path.join(travail, 'ref-mention.jpg'))
    const echecs = []
    for (const im of images) {
      const zoneImg = await extraireZone(im.fichier, { x: zm.x, y: zm.y, largeur: zm.largeur, hauteur: zm.hauteur })
      const c = await correspondance(zoneImg, ref)
      if (c < 0.8) echecs.push(`${im.instant.toFixed(1)} s (${c.toFixed(2)})`)
    }
    if (echecs.length) s.echoue('PQ-2', `mention absente ou non conforme à ${echecs.length}/${images.length} instant(s) : ${echecs.slice(0, 5).join(', ')}`)
    else s.passe('PQ-2', `« ${texteAttendu} » conforme sur les ${images.length} image(s) échantillonnées (≥ 0,80)`)
  } else s.echoue('PQ-2', 'non jugé : images non extraites')

  // ── PQ-3 : filigrane ─────────────────────────────────────────────────────────────────────────────────────────────
  if (images.length) {
    const zf = CONTRAT.zone_filigrane
    const texteAttendu = zf.gabarit.replace('{marque}', marque)
    const ref = await rendreReference(zf, texteAttendu, path.join(travail, 'ref-filigrane.jpg'))
    const echecs = []
    for (const im of images) {
      const zoneImg = await extraireZone(im.fichier, { x: zf.x, y: zf.y, largeur: zf.largeur, hauteur: zf.hauteur })
      const c = await correspondance(zoneImg, ref)
      if (c < 0.8) echecs.push(`${im.instant.toFixed(1)} s (${c.toFixed(2)})`)
    }
    if (echecs.length) s.echoue('PQ-3', `filigrane absent ou non conforme à ${echecs.length}/${images.length} instant(s) : ${echecs.slice(0, 5).join(', ')}`)
    else s.passe('PQ-3', `« ${texteAttendu} » présent sur les ${images.length} image(s)`)
  } else s.echoue('PQ-3', 'non jugé : images non extraites')

  // ── PQ-4 : la voix, transcrite ───────────────────────────────────────────────────────────────────────────────────
  let transcription = ''
  if (!fs.existsSync(e.voix)) s.echoue('PQ-4', `${rel(e.voix)} absent`)
  else {
    const t = transcrire(e.voix)
    if (t.erreur) s.echoue('PQ-4', `transcription : ${t.erreur}`)
    else {
      transcription = t.texte
      const reference = (e.scriptJson.lignes || []).join(' ')
      const { taux, edits, mots } = tauxErreurMots(reference, transcription)
      if (taux > 0.10) s.echoue('PQ-4', `taux d'erreur de mots ${(taux * 100).toFixed(1)} % (${edits}/${mots}), 10 % au plus — transcrit : « ${court(transcription, 160)} »`)
      else s.passe('PQ-4', `taux d'erreur de mots ${(taux * 100).toFixed(1)} % (${edits}/${mots}), transcrit : « ${court(transcription, 100)} »`)
    }
  }

  // ── PQ-5 : allégations sourcées, mot pour mot ───────────────────────────────────────────────────────────────────
  {
    const normaliserPage = (t) => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const page = e.pageProduit && fs.existsSync(e.pageProduit) ? normaliserPage(fs.readFileSync(e.pageProduit, 'utf8')) : null
    if (!page) s.echoue('PQ-5', `page produit datée introuvable dans ${rel(path.dirname(dir))}`)
    else {
      const allegs = e.scriptJson.allegations || []
      const echecs = []
      if (!allegs.length) echecs.push('aucune allégation dans script.json')
      for (const a of allegs) if (!page.includes(a.extrait_source)) echecs.push(`« ${court(a.extrait_source, 60)} » absent de la page produit`)
      const nombres = [...new Set((e.scriptJson.lignes || []).join(' ').match(/\d+/g) || [])]
      const extraits = allegs.map((a) => a.extrait_source).join(' ')
      for (const n of nombres) if (!extraits.includes(n)) echecs.push(`le nombre ${n} (dans les lignes) n'apparaît dans aucun extrait_source`)
      if (echecs.length) for (const x of echecs) s.echoue('PQ-5', x)
      else s.passe('PQ-5', `${allegs.length} allégation(s) sourcée(s) mot pour mot ; ${nombres.length} nombre(s) couvert(s)`)
    }
  }

  // ── PQ-6 : aucun témoignage ──────────────────────────────────────────────────────────────────────────────────────
  {
    const dansLignes = contientTemoignage((e.scriptJson.lignes || []).join(' '))
    const dansVoix = transcription ? contientTemoignage(transcription) : []
    if (dansLignes.length || dansVoix.length) {
      if (dansLignes.length) s.echoue('PQ-6', `tournure de témoignage dans les lignes : ${dansLignes.join(', ')}`)
      if (dansVoix.length) s.echoue('PQ-6', `tournure de témoignage dans la voix transcrite : ${dansVoix.join(', ')}`)
    } else s.passe('PQ-6', 'aucune tournure de témoignage, ni dans les lignes ni dans la voix transcrite')
  }

  // ── PQ-7 : étiquette lisible (produit.jpg, ≥ 1,5 s, ≥ 40 % de largeur, empreinte proche) ───────────────────────────
  let planche = null
  if (images.length) {
    if (!fs.existsSync(e.produit)) s.echoue('PQ-7', `${rel(e.produit)} absent`)
    else {
      const reference = await referenceProduit(e.produit)
      const boites = []
      for (const im of images) {
        try { const bande = await bandeSansHabillage(im.fichier); boites.push({ im, bande, boite: await boiteContenu(bande) }) }
        catch { boites.push({ im, bande: null, boite: null }) }
      }
      const larges = boites.filter((b) => b.boite && b.boite.largeur >= CONTRAT.plan_produit.part_largeur_min)
      const pas = images.length > 1 ? images[1].instant - images[0].instant : 1
      const dureeVisible = larges.length * pas
      const echecs = []
      if (dureeVisible < CONTRAT.plan_produit.duree_min_s) echecs.push(`produit visible à ≥ 40 % de largeur ${dureeVisible.toFixed(1)} s, ${CONTRAT.plan_produit.duree_min_s} s au moins attendues`)
      const distances = []
      for (const b of larges) {
        if (!b.boite || !b.bande) continue
        const crop = await recadrer(b.bande, b.boite)
        distances.push({ instant: b.im.instant, d: await distanceImages(crop, reference) })
      }
      const loin = distances.filter((d) => d.d > 10)
      if (loin.length) echecs.push(`empreinte trop éloignée de produit.jpg sur ${loin.length}/${distances.length} image(s) (ex. ${loin[0].instant.toFixed(1)} s, distance ${loin[0].d.toFixed(1)})`)
      if (echecs.length) for (const x of echecs) s.echoue('PQ-7', x)
      else s.passe('PQ-7', `visible ${dureeVisible.toFixed(1)} s à ≥ 40 % de largeur, distance moyenne ${(distances.reduce((a, d) => a + d.d, 0) / (distances.length || 1)).toFixed(1)} (≤ 10)`)
      planche = { boites, distances }
    }
  } else s.echoue('PQ-7', 'non jugé : images non extraites')

  // ── PQ-9 / PQ-10 : 16 images réparties, visages-qa.mjs ──────────────────────────────────────────────────────────
  const script16 = path.join(racineVisagesQa, 'scripts', 'visages-qa.mjs')
  let seize = []
  if (images.length) {
    seize = choisir16(images)
    const dossierPlanche = path.join(travail, 'planche')
    fs.mkdirSync(dossierPlanche, { recursive: true })
    const planches = []
    for (const [i, im] of seize.entries()) { const d = path.join(dossierPlanche, `${String(i).padStart(2, '0')}.jpg`); fs.copyFileSync(im.fichier, d); planches.push(d) }
    // planche.jpg : 4×4, écrite pour que Benj regarde le témoin et chaque défaut planté (fiche 026-128, « C'est fini quand »)
    const cible = path.join(dir, 'planche.jpg')
    try {
      const vign = await Promise.all(planches.map((p) => sharp(p).resize(240, 320, { fit: 'cover' }).toBuffer()))
      const composite = vign.map((buf, i) => ({ input: buf, left: (i % 4) * 240, top: Math.floor(i / 4) * 320 }))
      fs.mkdirSync(path.dirname(cible), { recursive: true })
      await sharp({ create: { width: 960, height: 1280, channels: 3, background: '#111' } }).composite(composite).jpeg({ quality: 88 }).toFile(cible)
    } catch { /* la planche est un confort de relecture, pas un critère */ }

    // PQ-9 : chaque plan est une transformation de produit.jpg, corrélation ≥ 0,8, échelle ramenée à la même taille
    if (!fs.existsSync(e.produit)) s.echoue('PQ-9', `${rel(e.produit)} absent`)
    else {
      const reference = await referenceProduit(e.produit)
      const echecs = []
      const corrs = []
      for (const [i, p] of planches.entries()) {
        const bande = await bandeSansHabillage(p)
        const boite = await boiteContenu(bande)
        if (!boite) { echecs.push(`image ${i + 1} (${seize[i].instant.toFixed(1)} s) : aucun contenu détaché du fond — produit absent ou disparu`); continue }
        const crop = await recadrer(bande, boite)
        const c = await correspondance(crop, reference)
        corrs.push(c)
        if (c < 0.8) echecs.push(`image ${i + 1} (${seize[i].instant.toFixed(1)} s) : corrélation ${c.toFixed(2)} avec produit.jpg, ≥ 0,80 attendue`)
      }
      if (echecs.length) for (const x of echecs.slice(0, 6)) s.echoue('PQ-9', x)
      else s.passe('PQ-9', `${planches.length} images, corrélation moyenne ${(corrs.reduce((a, b) => a + b, 0) / (corrs.length || 1)).toFixed(2)} avec produit.jpg ; planche écrite (${rel(cible)})`)
    }

    // PQ-10 : visages-qa.mjs sur les 16 images
    if (!fs.existsSync(script16)) s.echoue('PQ-10', `${rel(script16)} absent`)
    else {
      const r = lancer(process.execPath, [script16, ...planches, '--json'], { timeout: 3 * 60_000 })
      const rap = jsonOuNull(r.stdout)
      if (!rap) s.echoue('PQ-10', `visages-qa --json : sortie illisible (code ${r.code}) — ${court(r.stderr || r.stdout, 160)}`)
      else {
        const total = rap.reduce((a, f) => a + f.cadres.reduce((b, c) => b + c.visages.length, 0), 0)
        if (total > 0) {
          if (!e.scriptJson.presentateur_virtuel) s.echoue('PQ-10', `${total} visage(s) trouvé(s) sans presentateur_virtuel: true`)
          else {
            const zm = CONTRAT.zone_mention
            const refP = await rendreReference(zm, `${zm.texte_video_voix_ia}${zm.suffixe_presentateur}`, path.join(travail, 'ref-presentateur.jpg'))
            const echecs = []
            for (const [i, p] of planches.entries()) {
              const visagesIci = rap[i]?.cadres?.[0]?.visages?.length || 0
              if (!visagesIci) continue
              const zoneImg = await extraireZone(p, { x: zm.x, y: zm.y, largeur: zm.largeur, hauteur: zm.hauteur })
              if ((await correspondance(zoneImg, refP)) < 0.8) echecs.push(`image ${i + 1} : visage sans mention « présentateur virtuel »`)
            }
            if (echecs.length) for (const x of echecs) s.echoue('PQ-10', x); else s.passe('PQ-10', `${total} visage(s), presentateur_virtuel: true, mention « présentateur virtuel » visible`)
          }
        } else s.passe('PQ-10', `0 visage sur ${planches.length} images`)
      }
    }
  } else { s.echoue('PQ-9', 'non jugé : images non extraites'); s.echoue('PQ-10', 'non jugé : images non extraites') }

  // ── PQ-8 : présentateur (redondant, à partir des 16 images déjà classées) ──────────────────────────────────────────
  if (!s.evalue('PQ-8')) {
    if (!e.scriptJson.presentateur_virtuel) s.passe('PQ-8', 'presentateur_virtuel: false — aucune mention « présentateur virtuel » attendue')
    else if (s.enEchec('PQ-10')) s.echoue('PQ-8', 'voir PQ-10 (mention « présentateur virtuel »)')
    else s.passe('PQ-8', 'voir PQ-10 : mention « présentateur virtuel » conforme')
  }

  return { transcription, planche }
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Fabrication du témoin (--temoin, --etalonner, --monter-temoin) : aucun plan généré, seulement des transformations
// de produit.jpg (zoom centré, jamais de déplacement qui sortirait le produit du cadre), une voix SAPI Hortense, et
// l'habillage du contrat posé par un calque image (rendu par la même fonction que la référence de PQ-2/PQ-3 : le
// témoin et son juge partagent donc, par construction, le même rendu — mémoire « le juge capture lui-même »
// appliquée à l'envers : c'est le fabricant qui doit être fidèle au juge, pas l'inverse).
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function ffmpeg(args) {
  const r = lancer('ffmpeg', ['-y', '-v', 'error', ...args])
  if (r.code !== 0) throw new Error(`ffmpeg ${args.slice(0, 6).join(' ')}…\n${court(r.stderr, 400)}`)
  return r
}
/** Un segment de `duree` s (1080×1920) : zoom centré sur produit.jpg, de `zDe` à `zA` (jamais de recadrage hors cadre). */
function segmentProduit(produit, dest, { duree = 2.5, zDe = 1.0, zA = 1.12 } = {}) {
  const cadres = Math.round(duree * 30)
  const filtre = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,` +
    `scale=1620:2880,zoompan=z='min(${zDe}+(${zA}-${zDe})*on/${cadres},${zA})':d=${cadres}:s=1080x1920:fps=30:` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',format=yuv420p`
  ffmpeg(['-loop', '1', '-i', produit, '-t', String(duree), '-vf', filtre, '-an', '-r', '30',
    '-c:v', 'libx264', '-b:v', '3600k', '-minrate', '3600k', '-maxrate', '3600k', '-bufsize', '1800k',
    '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-pix_fmt', 'yuv420p', dest])
  return dest
}
function concatenerSegments(segments, dest, travail) {
  const liste = path.join(travail, `liste-${path.basename(dest, '.mp4')}.txt`)
  fs.writeFileSync(liste, segments.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'))
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', liste, '-c', 'copy', dest])
  return dest
}
/** Les 6 segments (5 « coupes » aux frontières : la plage de zoom alterne pour qu'il y ait un vrai saut visuel). */
function fabriquerPlans(produit, travail) {
  // Chaque segment repart de 1,00 : la frontière (fin ~1,32 → début 1,00) crée un vrai saut visuel à chacune des cinq
  // coupes (une plage qui alterne entre deux paliers proches n'en faisait que 2/5 — défaut trouvé le 28/09).
  const plages = [[1.00, 1.20], [1.00, 1.20], [1.00, 1.20], [1.00, 1.20], [1.00, 1.20], [1.00, 1.20]]
  const segs = plages.map(([zDe, zA], i) => segmentProduit(produit, path.join(travail, `seg-${i}.mp4`), { duree: 2.5, zDe, zA }))
  return concatenerSegments(segs, path.join(travail, 'plans-muet.mp4'), travail)
}
/** Mixe la voix (décalée de 500 ms) dans le film muet, un vrai silence numérique (apad) jusqu'à `dureeTotale`. */
function mixerVoix(muet, voixWav, dureeTotale, dest) {
  ffmpeg(['-i', muet, '-i', voixWav, '-filter_complex', '[1:a]adelay=500|500,apad[a]',
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', String(dureeTotale), dest])
  return dest
}
/** Pose les deux calques (mention, filigrane) sur la vidéo, chacun avec sa fenêtre de visibilité (`enable` ffmpeg). */
function poserHabillage(video, mentionPng, filigranePng, dest, { enableMention = '1', enableFiligrane = '1' } = {}) {
  const zm = CONTRAT.zone_mention, zf = CONTRAT.zone_filigrane
  ffmpeg(['-i', video, '-i', mentionPng, '-i', filigranePng, '-filter_complex',
    `[0:v][1:v]overlay=${zm.x}:${zm.y}:enable='${enableMention}'[t1];[t1][2:v]overlay=${zf.x}:${zf.y}:enable='${enableFiligrane}'[v]`,
    '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-b:v', '3600k', '-minrate', '3600k', '-maxrate', '3600k',
    '-bufsize', '1800k', '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-pix_fmt', 'yuv420p', '-c:a', 'copy', dest])
  return dest
}

const AUJOURDHUI = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/**
 * Fabrique un échantillon complet sous `dirMarque/echantillon-1/` (+ produit.jpg et la page produit dans `dirMarque`).
 * `defaut` : null (témoin propre) ou l'un des cinq défauts plantés de --etalonner (fiche 026-128, point 3) :
 *   'PQ-2' mention dès 1 s seulement · 'PQ-3' filigrane absent de 6 à 9 s · 'PQ-6' témoignage ajouté ·
 *   'PQ-5' allégation non sourcée ajoutée · 'PQ-7' étiquette du produit retouchée.
 */
async function fabriquerEchantillon(dirMarque, { defaut = null } = {}) {
  fs.mkdirSync(dirMarque, { recursive: true })
  const travail = path.join(TRAVAIL, 'fabrication', path.basename(dirMarque))
  fs.rmSync(travail, { recursive: true, force: true }); fs.mkdirSync(travail, { recursive: true })

  const produit = path.join(dirMarque, 'produit.jpg')
  if (defaut === 'PQ-7') await St.fabriquerProduitAbime(produit); else await St.fabriquerProduit(produit)
  St.fabriquerPageProduit(path.join(dirMarque, `page-produit-${AUJOURDHUI()}.html`))

  let lignes = St.LIGNES, allegations = St.ALLEGATIONS
  if (defaut === 'PQ-5') {
    allegations = [...St.ALLEGATIONS, { texte: 'Distingué par trois prix internationaux.', extrait_source: 'trois prix internationaux' }]
    lignes = [...St.LIGNES, 'Distingué par trois prix internationaux.']
  }
  const scriptJson = St.scriptTemoin({ lignes, allegations, avecTemoignage: defaut === 'PQ-6' })

  const dirEch = path.join(dirMarque, 'echantillon-1')
  fs.mkdirSync(path.join(dirEch, 'sortie'), { recursive: true })
  fs.writeFileSync(path.join(dirEch, 'script.json'), JSON.stringify(scriptJson, null, 2))
  fs.writeFileSync(path.join(dirEch, 'CONSIGNES.md'), `# Échantillon témoin (fiche 026-128)\n\nFabriqué par scripts/pub-qa.mjs --temoin. Marque et produit fictifs, aucune personne. Jamais publié.\n`)

  const voixWav = St.fabriquerVoix(scriptJson.lignes.join(' '), path.join(dirEch, 'voix.wav'), { travail })
  ffmpeg(['-i', voixWav, '-codec:a', 'libmp3lame', '-q:a', '3', path.join(dirEch, 'voix.mp3')])
  fs.rmSync(voixWav)

  const plans = fabriquerPlans(produit, travail)
  const dureeTotale = CONTRAT.format.duree_s
  const avecVoix = mixerVoix(plans, path.join(dirEch, 'voix.mp3'), dureeTotale, path.join(travail, 'avec-voix.mp4'))

  const zm = CONTRAT.zone_mention, zf = CONTRAT.zone_filigrane
  const mentionPng = path.join(travail, 'mention.jpg')
  const filigranePng = path.join(travail, 'filigrane.jpg')
  await rendreReference(zm, zm.texte_video_voix_ia, mentionPng)
  await rendreReference(zf, zf.gabarit.replace('{marque}', St.MARQUE_NOM), filigranePng)

  const enableMention = defaut === 'PQ-2' ? 'gte(t,1)' : '1'
  const enableFiligrane = defaut === 'PQ-3' ? 'not(between(t,6,9))' : '1'
  poserHabillage(avecVoix, mentionPng, filigranePng, path.join(dirEch, 'sortie', 'echantillon.mp4'), { enableMention, enableFiligrane })

  fs.writeFileSync(path.join(dirEch, 'statut.txt'), 'fabrique')
  return dirEch
}

// ── Le pilote ────────────────────────────────────────────────────────────────────────────────────────────────────────
const DEFAUTS_ETALONNAGE = [
  { id: 'PQ-2', nom: 'mention IA qui n’apparaît qu’à 1 s' },
  { id: 'PQ-3', nom: 'filigrane absent de 6 à 9 s' },
  { id: 'PQ-6', nom: 'témoignage ajouté dans le script et la voix' },
  { id: 'PQ-5', nom: 'allégation ajoutée, absente de la page produit' },
  { id: 'PQ-7', nom: 'étiquette du plan produit retouchée' },
]

async function jugerDansUnTravail(dirEch, s) {
  const t = path.join(TRAVAIL, `jugement-${path.basename(path.dirname(dirEch))}-${path.basename(dirEch)}`)
  fs.rmSync(t, { recursive: true, force: true }); fs.mkdirSync(t, { recursive: true })
  return jugerEchantillon(s, dirEch, { racineVideoQa: o.racine, racineVisagesQa: o.racine, travail: t })
}

async function principal() {
  const entete = `${NOM}${o.temoin ? ' --temoin' : ''}${ETALONNER ? ' --etalonner' : ''}${MONTER_TEMOIN ? ' --monter-temoin' : ''} — racine ${rel(o.racine)}`
  const s = creerRapport(NOM, IDS, { entete })

  if (o.temoin) {
    const dirMarque = path.join(TRAVAIL, 'temoin', St.MARQUE_CLE)
    fs.rmSync(dirMarque, { recursive: true, force: true })
    let dirEch = null
    try { dirEch = await fabriquerEchantillon(dirMarque) } catch (err) {
      for (const id of IDS) s.echoue(id, `fabrication du témoin : ${court(err.message, 300)}`)
    }
    if (dirEch) await jugerDansUnTravail(dirEch, s)

    if (ETALONNER && dirEch) {
      const lignesPreuve = [`# Étalonnage de pub-qa.mjs — fiche 026-128\n`, `Le témoin propre (${rel(dirEch)}) et cinq échantillons à défaut planté, un par critère.\n`]
      for (const d of DEFAUTS_ETALONNAGE) {
        const dirMarqueD = path.join(TRAVAIL, 'etalonnage', d.id)
        fs.rmSync(dirMarqueD, { recursive: true, force: true })
        let dirEchD
        try { dirEchD = await fabriquerEchantillon(dirMarqueD, { defaut: d.id }) } catch (err) {
          s.echoue(d.id, `étalonnage : fabrication du défaut en échec : ${court(err.message, 200)}`)
          lignesPreuve.push(`- **${d.id}** (${d.nom}) : fabrication en échec — ${court(err.message, 200)}\n`)
          continue
        }
        const sD = creerRapport(`${NOM}-etalonnage-${d.id}`, IDS, { entete: `étalonnage ${d.id} (${d.nom})` })
        await jugerDansUnTravail(dirEchD, sD)
        const lignesD = sD.lignes()
        const ligneCritere = lignesD.find((l) => l.startsWith(`FAIL ${d.id} `))
        const autresRouges = lignesD.filter((l) => l.startsWith('FAIL ') && !l.startsWith(`FAIL ${d.id} `)).map((l) => l.split(' ')[1])
        if (!ligneCritere) {
          s.echoue(d.id, `étalonnage : le défaut planté (${d.nom}) n'a pas fait échouer ${d.id} — ${lignesD.filter((l) => l.startsWith('FAIL')).join(' ; ') || 'tout est vert'}`)
          lignesPreuve.push(`- **${d.id}** (${d.nom}) : PAS refusé — défaut de l'étalonnage.\n`)
        } else {
          s.passe(d.id, `étalonnage : « ${d.nom} » correctement refusé`)
          lignesPreuve.push(`- **${d.id}** (${d.nom}) : refusé comme attendu.\n  Extrait réel : ${court(ligneCritere.replace(/^FAIL \S+ — /, ''), 260)}${autresRouges.length ? `\n  (également rouge, sans rapport : ${autresRouges.join(', ')})` : ''}\n`)
        }
      }
      if (o.racineParDefaut) {
        const dossierPreuve = path.join(R, '.orchestre', 'preuves', '026-128')
        fs.mkdirSync(dossierPreuve, { recursive: true })
        fs.writeFileSync(path.join(dossierPreuve, 'etalonnage-pub-qa.md'), lignesPreuve.join('\n'))
      }
    }
    return s.fin()
  }

  if (MONTER_TEMOIN) {
    const monterScript = path.join(o.racine, 'scripts', 'studio', 'monter.mjs')
    const dirMarque = path.join(TRAVAIL, 'monter-temoin', St.MARQUE_CLE)
    fs.rmSync(dirMarque, { recursive: true, force: true }); fs.mkdirSync(dirMarque, { recursive: true })
    await St.fabriquerProduit(path.join(dirMarque, 'produit.jpg'))
    St.fabriquerPageProduit(path.join(dirMarque, `page-produit-${AUJOURDHUI()}.html`))
    const scriptJson = St.scriptTemoin()
    const dirEch = path.join(dirMarque, 'echantillon-1')
    fs.mkdirSync(path.join(dirEch, 'sortie'), { recursive: true })
    fs.writeFileSync(path.join(dirEch, 'script.json'), JSON.stringify(scriptJson, null, 2))
    const voixWav = St.fabriquerVoix(scriptJson.lignes.join(' '), path.join(dirEch, 'voix.wav'), { travail: TRAVAIL })
    ffmpeg(['-i', voixWav, '-codec:a', 'libmp3lame', '-q:a', '3', path.join(dirEch, 'voix.mp3')])
    fs.rmSync(voixWav)
    if (!fs.existsSync(monterScript)) {
      s.echoue('PQ-1', `${rel(monterScript)} absent : scripts/studio/monter.mjs n'est pas encore écrit (fiche 026-158)`)
      return s.fin()
    }
    const r = lancer(process.execPath, [monterScript, `--marque=${St.MARQUE_CLE}`, `--echantillon=${dirEch}`], { timeout: 6 * 60_000 })
    if (r.code !== 0) { s.echoue('PQ-1', `monter.mjs en code ${r.code} : ${court(r.stderr || r.stdout, 200)}`); return s.fin() }
    await jugerDansUnTravail(dirEch, s)
    return s.fin()
  }

  // mode normal : juge un échantillon déjà fabriqué
  const dirEch = path.resolve(o.positionnels[0])
  if (!fs.existsSync(dirEch)) { s.echoue(IDS[0], `introuvable : ${o.positionnels[0]}`); return s.fin() }
  await jugerDansUnTravail(dirEch, s)
  return s.fin()
}

if (!ARRET) process.exitCode = await principal()


