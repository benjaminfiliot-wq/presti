#!/usr/bin/env node
// scripts/pack-pub/fabriquer.mjs — fabrique un pack de pubs locales depuis un dossier de pack (fiche 026-156).
//
// Usage : node scripts/pack-pub/fabriquer.mjs <dossier-pack> [--meta-logement=<fichier>]
//
// Dans cet ordre, chaque étape arrête tout au premier échec (code 1, message qui nomme le fichier) :
//   1 lire pack.json · 2 préparer les photos (octets décodés, sans métadonnées) · 3 refuser une personne sans accord
//   · 4 écrire manifeste-entrees.json · 5 normaliser la voix de synthèse · 6 instancier hf/video-1..3 et
//   hf/visuel-1..3 · 7 hyperframes check · 8 rendre les trois films · 9 tirer les trois visuels · 10 textes.mjs ·
//   11 résumé.
//
// Tourne sur l'usine comme sur le poste : chemins POSIX ou Windows indifféremment, `hyperframes` et `ffmpeg` pris
// dans le PATH (repli : npx hyperframes@0.8.33), aucune clé lue, aucun appel réseau autre que le téléchargement
// des photos du bucket public artisan-media (les enfants reçoivent un environnement sans clé ni télémétrie).
// Codes : 0 pack fabriqué · 1 refus ou échec · 3 tout fabriqué mais catégorie « Logement » non vérifiée (rendu de textes.mjs).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..')
const HF_VERSION = '0.8.33'
const PHOTO_MAX_OCTETS = 15 * 1024 * 1024
const PHOTO_DELAI_MS = 20_000
const PHOTO_COTE_MAX = 2160
const FILM_MAX_OCTETS = 8 * 1024 * 1024
const VISUEL_MAX_OCTETS = 1024 * 1024
const DEBIT_PLANCHER_BPS = 3_200_000
const DELAI_RENDU_MS = 6 * 60_000
const DELAI_HF_MS = 5 * 60_000
const FILM_DUREE_MIN = 14
const FILM_DUREE_MAX = 16
const VOIX_DUREE_MAX = 15
const BUCKET_PUBLIC = '/storage/v1/object/public/artisan-media/'

class Refus extends Error {}
const refuser = (message) => { throw new Refus(message) }
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const nomPhoto = (i) => `${String(i + 1).padStart(2, '0')}.jpg`
const posix = (p) => String(p).split(path.sep).join('/')
const mo = (octets) => `${(octets / 1e6).toFixed(2)} Mo`

// ── Arguments ────────────────────────────────────────────────────────────────────────────────────────────────────────
function lireArguments(argv) {
  let dossier = ''
  let metaLogement = ''
  for (const a of argv) {
    if (a.startsWith('--meta-logement=')) metaLogement = a.slice('--meta-logement='.length)
    else if (a.startsWith('--')) refuser(`option inconnue : ${a} (usage : fabriquer.mjs <dossier-pack> [--meta-logement=<fichier>])`)
    else if (!dossier) dossier = a
    else refuser(`argument en trop : ${a}`)
  }
  if (!dossier) refuser('dossier de pack manquant (usage : fabriquer.mjs <dossier-pack> [--meta-logement=<fichier>])')
  return { dossier: path.resolve(dossier), metaLogement: metaLogement ? path.resolve(metaLogement) : '' }
}

// ── Lancement d'outils ───────────────────────────────────────────────────────────────────────────────────────────────
// Environnement des enfants : jamais une clé, un jeton ou un secret (hyperframes lance sinon une description par IA
// dès que GEMINI_API_KEY existe), et pas de télémétrie.
function environnementSobre() {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (!/(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)/i.test(k)) env[k] = v
  env.HYPERFRAMES_NO_TELEMETRY = '1'
  env.DO_NOT_TRACK = '1'
  env.HYPERFRAMES_NO_UPDATE_CHECK = '1' // pas de sonde du registre au démarrage de chaque commande
  env.HYPERFRAMES_SKIP_SKILLS = '1'
  env.PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS = '90000' // snapshot/check : 10 s par défaut, trop court quand trois rendus occupent le poste
  return env
}
const ENV = environnementSobre()
const SOUS_WINDOWS = process.platform === 'win32'
// Sous Windows, npx est un .cmd : il faut un shell, donc des arguments protégés (aucun ici ne porte de « % »).
const proteger = (a) => (SOUS_WINDOWS && /[\s"&|<>^()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)
// (la ligne de commande est assemblée ici : node refuse de recevoir des arguments avec shell:true)
function lancer(cmd, args, { cwd = R, timeout = DELAI_HF_MS } = {}) {
  const shell = SOUS_WINDOWS && /^(npx|hyperframes)$/.test(cmd)
  const opts = { cwd, env: ENV, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 1 << 26 }
  return shell ? spawnSync([cmd, ...args.map(proteger)].join(' '), { ...opts, shell: true }) : spawnSync(cmd, args, opts)
}
function lancerAsync(cmd, args, { cwd = R, timeout = DELAI_RENDU_MS } = {}) {
  return new Promise((resolve) => {
    const shell = SOUS_WINDOWS && /^(npx|hyperframes)$/.test(cmd)
    const opts = { cwd, env: ENV, windowsHide: true }
    const enfant = shell ? spawn([cmd, ...args.map(proteger)].join(' '), { ...opts, shell: true }) : spawn(cmd, args, opts)
    let stdout = ''
    let stderr = ''
    enfant.stdout.on('data', (d) => { stdout += d })
    enfant.stderr.on('data', (d) => { stderr += d })
    const minuteur = setTimeout(() => { try { enfant.kill() } catch { /* déjà fini */ } stderr += '\n[délai dépassé]' }, timeout)
    enfant.on('close', (status) => { clearTimeout(minuteur); resolve({ status, stdout, stderr }) })
    enfant.on('error', (e) => { clearTimeout(minuteur); resolve({ status: 1, stdout, stderr: String(e) }) })
  })
}
const ANSI = /\x1b\[[0-9;?]*[a-zA-Z]/g
const queue = (r) => `${r.stderr || ''}\n${r.stdout || ''}`.split(/\r?\n/).map((l) => l.replace(ANSI, '').trim())
  .filter((l) => l && !/Streaming frame|^[█░ ]+\d+%|^\[INFO\]/.test(l)).slice(-8).join(' | ')

// hyperframes à la bonne version, trouvé SANS le lancer (un `hyperframes --version` ou un `npx` coûte 30 à 60 s sur un poste
// chargé, et on l'appelle douze fois) : d'abord un `hyperframes` du PATH dont le package.json est à la bonne version, puis le
// cache npx (%LOCALAPPDATA%/npm-cache/_npx sous Windows, ~/.npm/_npx ailleurs), enfin npx épinglé.
function versionDuPaquet(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version } catch { return '' }
}
function resoudreHyperframes() {
  const candidats = []
  for (const d of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    candidats.push(path.join(d, 'node_modules', 'hyperframes'), path.join(d, '..', 'lib', 'node_modules', 'hyperframes'))
  }
  const caches = [process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx'), path.join(os.homedir(), '.npm', '_npx')].filter(Boolean)
  for (const c of caches) {
    try { for (const h of fs.readdirSync(c)) candidats.push(path.join(c, h, 'node_modules', 'hyperframes')) } catch { /* pas de cache ici */ }
  }
  for (const dir of candidats) {
    const bin = path.join(dir, 'bin', 'hyperframes.mjs')
    if (versionDuPaquet(dir) === HF_VERSION && fs.existsSync(bin)) return { cmd: process.execPath, pre: [bin] }
  }
  return { cmd: 'npx', pre: ['--yes', `hyperframes@${HF_VERSION}`] }
}

// ── 1. pack.json ─────────────────────────────────────────────────────────────────────────────────────────────────────
function lirePack(dossier) {
  const f = path.join(dossier, 'pack.json')
  if (!fs.existsSync(f)) refuser(`${f} : pack.json absent`)
  let pack
  try { pack = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { refuser(`${f} : JSON illisible (${e.message})`) }
  if (!pack || typeof pack.pack_id !== 'string' || !pack.pack_id.trim()) refuser(`${f} : pack_id manquant`)
  if (!pack.matiere || !Array.isArray(pack.matiere.photos) || !pack.matiere.photos.length) refuser(`${f} : matiere.photos manquant ou vide`)
  const contratF = path.join(R, 'gabarits-pubs', 'locale', 'contrat.json')
  const contrat = JSON.parse(fs.readFileSync(contratF, 'utf8'))
  const { min, max, roles } = contrat.matiere.photos
  const n = pack.matiere.photos.length
  if (n < min || n > max) refuser(`${f} : ${n} photos (attendu ${min} à ${max})`)
  pack.matiere.photos.forEach((p, i) => {
    if (!p || typeof (p.url || p.fichier) !== 'string' || !(p.url || p.fichier)) refuser(`${f} : photo ${nomPhoto(i)} sans url ni fichier`)
    if (!roles.includes(p.role)) refuser(`${f} : photo ${nomPhoto(i)} : rôle « ${p.role} » inconnu`)
  })
  return pack
}

// ── 2. Photos ────────────────────────────────────────────────────────────────────────────────────────────────────────
async function telecharger(url, nom) {
  let adresse
  try { adresse = new URL(url) } catch { refuser(`photo ${nom} : adresse illisible`) }
  if (adresse.protocol !== 'https:' || adresse.username || adresse.password || !adresse.pathname.includes(BUCKET_PUBLIC)) {
    refuser(`photo ${nom} : adresse refusée (seul https://…${BUCKET_PUBLIC}… est admis) : ${adresse.origin}${adresse.pathname}`)
  }
  const controle = new AbortController()
  const minuteur = setTimeout(() => controle.abort(), PHOTO_DELAI_MS)
  try {
    const rep = await fetch(adresse, { signal: controle.signal, redirect: 'error' })
    if (!rep.ok) refuser(`photo ${nom} : téléchargement ${rep.status} (${adresse.pathname})`)
    if (Number(rep.headers.get('content-length') || 0) > PHOTO_MAX_OCTETS) refuser(`photo ${nom} : plus de 15 Mo (${adresse.pathname})`)
    const morceaux = []
    let total = 0
    for await (const morceau of rep.body) {
      total += morceau.length
      if (total > PHOTO_MAX_OCTETS) { controle.abort(); refuser(`photo ${nom} : plus de 15 Mo (${adresse.pathname})`) }
      morceaux.push(morceau)
    }
    return Buffer.concat(morceaux)
  } catch (e) {
    if (e instanceof Refus) throw e
    refuser(`photo ${nom} : téléchargement impossible (${controle.signal.aborted ? 'plus de 20 s ou trop gros' : e.message}) : ${adresse.pathname}`)
  } finally { clearTimeout(minuteur) }
}

/** « photos/… » ou « voix.mp3 » : relatif au pack ; sinon absolu, ou relatif au dépôt (photos des démos), puis au pack. */
function resoudreLocal(source, dossier) {
  if (path.isAbsolute(source)) return source
  if (/^(photos[\\/]|voix\.mp3)/.test(source)) return path.join(dossier, source)
  const depot = path.join(R, source)
  return fs.existsSync(depot) ? depot : path.join(dossier, source)
}

async function lireSource(source, dossier, nom) {
  if (/^https?:/i.test(source)) return telecharger(source, nom)
  const f = resoudreLocal(source, dossier)
  let stat
  try { stat = fs.statSync(f) } catch { refuser(`photo ${nom} : ${f} introuvable`) }
  if (!stat.isFile()) refuser(`photo ${nom} : ${f} n'est pas un fichier`)
  if (stat.size > PHOTO_MAX_OCTETS) refuser(`photo ${nom} : ${f} pèse plus de 15 Mo`)
  return fs.readFileSync(f)
}

/** Décode pour de bon (l'extension ne prouve rien), orient, borne, réécrit en JPEG sans aucune métadonnée. */
async function preparerPhoto(buf, nom, source) {
  let meta
  try { meta = await sharp(buf).metadata() } catch (e) { refuser(`photo ${nom} (${source}) : image illisible (${e.message})`) }
  if (!['jpeg', 'png', 'webp'].includes(meta.format)) refuser(`photo ${nom} (${source}) : format ${meta.format} refusé (jpeg, png ou webp seulement)`)
  try {
    return await sharp(buf).rotate().flatten({ background: '#ffffff' })
      .resize({ width: PHOTO_COTE_MAX, height: PHOTO_COTE_MAX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 }).toBuffer()
  } catch (e) { refuser(`photo ${nom} (${source}) : décodage impossible (${e.message})`) }
}

async function preparerPhotos(pack, dossier, tmp) {
  const bruts = []
  for (const [i, p] of pack.matiere.photos.entries()) {
    const nom = nomPhoto(i)
    const source = p.url || p.fichier
    const buf = await preparerPhoto(await lireSource(source, dossier, nom), nom, source.split('?')[0])
    bruts.push({ nom, buf, sha256: sha256(buf), source: source.split('?')[0], role: p.role, personnes: p.personnes === true, accord_personnes: p.accord_personnes === true })
  }

  // 3. Personnes : sans accord écrit, aucune personne ne passe (une photo « sans personne » ne doit contenir aucun visage).
  for (const p of bruts) if (p.personnes && !p.accord_personnes) refuser(`personne sur photo ${p.nom} sans accord (accord_personnes manquant)`)
  const aVerifier = bruts.filter((p) => !p.personnes)
  if (aVerifier.length) {
    const essai = path.join(tmp, 'visages')
    fs.mkdirSync(essai, { recursive: true })
    for (const p of aVerifier) fs.writeFileSync(path.join(essai, p.nom), p.buf)
    const r = lancer(process.execPath, [path.join(R, 'scripts', 'visages-qa.mjs'), ...aVerifier.map((p) => path.join(essai, p.nom)), '--attendu=0', '--json'], { timeout: 5 * 60_000 })
    if (r.status !== 0 && r.status !== 1) refuser(`visages-qa indisponible (code ${r.status}) : ${queue(r)}`)
    let rapport
    try { rapport = JSON.parse(r.stdout) } catch { refuser(`visages-qa : sortie illisible : ${queue(r)}`) }
    for (const f of rapport) {
      if (f.cadres.some((c) => c.visages.length)) refuser(`visage détecté sur photo ${path.basename(f.fichier)} sans accord`)
    }
    if (r.status === 1) refuser(`visages-qa a refusé sans nommer de photo : ${queue(r)}`)
  }

  // Écriture seulement après les refus : un refus ne laisse rien derrière lui.
  const dossierPhotos = path.join(dossier, 'photos')
  fs.mkdirSync(dossierPhotos, { recursive: true })
  const gardes = new Set(bruts.map((p) => p.nom))
  for (const n of fs.readdirSync(dossierPhotos)) if (/\.(jpe?g|png|webp)$/i.test(n) && !gardes.has(n)) fs.rmSync(path.join(dossierPhotos, n), { force: true })
  for (const p of bruts) fs.writeFileSync(path.join(dossierPhotos, p.nom), p.buf)
  return bruts
}

async function preparerLogo(dossier) {
  const f = path.join(dossier, 'logo.png')
  if (!fs.existsSync(f)) return null
  let buf
  try { buf = await sharp(fs.readFileSync(f)).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).png().toBuffer() } catch (e) { refuser(`${f} : logo illisible (${e.message})`) }
  fs.writeFileSync(f, buf)
  return { fichier: 'logo.png', sha256: sha256(buf) }
}

// ── 5. Voix de synthèse : normalisée SEULE, avant tout montage ───────────────────────────────────────────────────────
function dureeMedia(f) {
  const r = lancer('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', f], { timeout: 60_000 })
  const d = Number(String(r.stdout || '').trim())
  return r.status === 0 && Number.isFinite(d) ? d : NaN
}

function preparerVoix(pack, dossier) {
  if (pack.matiere.voix !== 'synthese') return null
  const voix = path.join(dossier, 'voix.mp3')
  const source = path.join(dossier, 'voix-source.mp3') // l'original produit avant fabriquer.mjs, gardé pour que relancer ne renormalise pas une voix déjà normalisée
  if (!fs.existsSync(source)) {
    if (!fs.existsSync(voix)) refuser(`${voix} : voix.mp3 absent alors que voix = synthese (elle est produite avant fabriquer.mjs)`)
    fs.copyFileSync(voix, source)
  }
  const duree = dureeMedia(source)
  if (!(duree > 0)) refuser(`${source} : audio illisible`)
  if (duree > VOIX_DUREE_MAX) refuser(`${source} : voix de ${duree.toFixed(1)} s, plus que les ${VOIX_DUREE_MAX} s du film`)
  const temporaire = path.join(dossier, 'voix-normalisee.tmp.mp3')
  const r = lancer('ffmpeg', ['-y', '-v', 'error', '-i', source, '-vn', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '192k', temporaire], { timeout: 2 * 60_000 })
  if (r.status !== 0 || !fs.existsSync(temporaire) || fs.statSync(temporaire).size === 0) refuser(`${source} : normalisation de la voix impossible : ${queue(r)}`)
  fs.renameSync(temporaire, voix)
  return { fichier: 'voix.mp3', sha256: sha256(fs.readFileSync(voix)) }
}

// ── Texte affiché : les codes d'accroche et de CTA de pack.json deviennent des phrases (mêmes amorces que textes.mjs) ──
const propre = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
function accrocheAffichee(m) {
  const metier = propre(m.metier)
  const ville = propre(m.ville)
  const amorces = {
    artisan_de_confiance: `Votre projet de ${metier} à ${ville} ?`,
    avant_apres: `Un projet de ${metier} à ${ville} ?`,
    proximite_locale: `${metier} à ${ville} et aux alentours.`,
    reactivite: `Un projet de ${metier} à ${ville} ?`,
    garantie_decennale: `Un projet de ${metier} à ${ville} ?`,
    avis_clients: `Votre projet de ${metier} à ${ville} ?`,
    savoir_faire: `${metier} à ${ville} : parlons de votre projet.`,
    intervention_rapide: `Besoin de ${metier} à ${ville} ?`,
  }
  const brut = propre(m.accroche)
  return amorces[brut] ?? brut
}
function ctaAffiche(m) {
  const tel = propre(m.telephone)
  if (m.cta === 'appel') return tel ? `Appelez le ${tel}` : 'Appelez-nous'
  if (m.cta === 'message') return 'Écrivez-nous'
  if (m.cta === 'devis') return 'Demandez votre devis'
  return propre(m.cta)
}

// ── 6. Instancier ────────────────────────────────────────────────────────────────────────────────────────────────────
/** instancier.mjs lit un dossier de pack : on lui en prépare un (photos réordonnées, textes affichables) dans le tmp. */
function preparerInstance(nom, pack, photos, decalage, dossier, tmp, logo, voix) {
  const dir = path.join(tmp, 'instances', nom)
  fs.mkdirSync(path.join(dir, 'photos'), { recursive: true })
  const ordre = photos.map((_, i) => photos[(i + decalage) % photos.length])
  for (const p of ordre) fs.copyFileSync(path.join(dossier, 'photos', p.nom), path.join(dir, 'photos', p.nom))
  if (logo) fs.copyFileSync(path.join(dossier, 'logo.png'), path.join(dir, 'logo.png'))
  if (voix) fs.copyFileSync(path.join(dossier, 'voix.mp3'), path.join(dir, 'voix.mp3'))
  const matiere = {
    ...pack.matiere,
    accroche: accrocheAffichee(pack.matiere),
    cta: ctaAffiche(pack.matiere),
    photos: ordre.map((p) => ({ fichier: `photos/${p.nom}`, role: p.role, personnes: p.personnes, accord_personnes: p.accord_personnes })),
  }
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify({ pack_id: pack.pack_id, matiere }, null, 2))
  return dir
}

// Le gabarit pose du texte blanc à même la photo : sur un mur clair, hyperframes check le refuse (contraste WCAG AA
// sous 3:1, constaté sur jeu-2 le 29/09). Le gabarit n'est pas à nous : on habille le PROJET instancié d'un bandeau
// sombre derrière chaque texte, sans toucher au gabarit ni à instancier.mjs.
const HABILLAGE_LISIBILITE = `<style id="lisibilite-fabriquer">
  #accroche, #detail, #fin, #sous-titres { left: 5%; width: 90%; box-sizing: border-box; padding: 14px 24px; border-radius: 16px; background: rgba(0, 0, 0, 0.6); color: #fff; }
  #sous-titres:empty { display: none; }
  #mention-ia { padding: 8px 16px; border-radius: 10px; background: rgba(0, 0, 0, 0.6); color: #fff; }
</style>
`

// Le gabarit ne fait que zoomer de 10 % sur trois secondes, ou laisser une photo immobile : video-qa (profil pub-locale) y mesure des
// plans figés de 1,5 à 3,5 s et trop peu de coupes. Le projet instancié reçoit donc un panoramique continu de chaque photo (le cadrage
// glisse dans la photo, sans agrandir au-delà de sa définition) coupé toutes les 3 s par un changement de cadrage franc, posé sur la
// MÊME ligne de temps que le gabarit (son minutage ne bouge pas). Sans effet sur les visuels (image fixe).
const HABILLAGE_MOUVEMENT = `<script id="mouvement-fabriquer">
(function () {
  var tl = window.__timelines && window.__timelines[document.body.getAttribute('data-composition-id')];
  if (!tl) return;
  var segments = [[15, 30, 45, 62], [85, 68, 62, 40], [22, 60, 48, 28], [78, 35, 58, 66], [30, 70, 52, 34]];
  var images = document.querySelectorAll('img.abs');
  for (var i = 0; i < images.length; i++) {
    for (var k = 0; k < segments.length; k++) {
      var s = segments[(k + i) % segments.length];
      tl.fromTo(images[i], { objectPosition: s[0] + '% ' + s[1] + '%' }, { objectPosition: s[2] + '% ' + s[3] + '%', duration: 3, ease: 'none' }, k * 3);
    }
  }
})();
</script>
`

function instancier(gabarit, dirInstance, sortie) {
  const r = lancer(process.execPath, [path.join(ICI, 'instancier.mjs'), gabarit, dirInstance, sortie], { timeout: 60_000 })
  if (r.status !== 0) refuser(`${posix(path.relative(R, sortie))} : instancier.mjs ${gabarit} en échec (code ${r.status}) : ${queue(r)}`)
  const index = path.join(sortie, 'index.html')
  const html = fs.readFileSync(index, 'utf8')
  if (!html.includes('</head>')) refuser(`${posix(path.relative(R, index))} : pas de </head> pour poser l'habillage de lisibilité`)
  let habille = html.replace('</head>', () => `${HABILLAGE_LISIBILITE}</head>`)
  // artisan-ville ouvre sur une photo d'équipe, ou à défaut sur le logo : sans l'un ni l'autre, instancier.mjs laisse src="" et le film
  // s'ouvre sur 2,5 s de noir figé. Le premier plan prend alors la première photo du pack (déjà au manifeste).
  const premierePhoto = fs.existsSync(path.join(sortie, 'assets')) ? fs.readdirSync(path.join(sortie, 'assets')).filter((f) => /^\d\d\.jpg$/.test(f)).sort()[0] : ''
  if (premierePhoto) habille = habille.replace(/(<img\b[^>]*\bclass="abs"[^>]*?\bsrc=)""/g, (_, avant) => `${avant}"assets/${premierePhoto}"`)
  if (gabarit !== 'visuel') {
    if (!habille.includes('</body>')) refuser(`${posix(path.relative(R, index))} : pas de </body> pour poser le mouvement des photos`)
    habille = habille.replace('</body>', () => `${HABILLAGE_MOUVEMENT}</body>`)
  }
  fs.writeFileSync(index, habille)
}

// ── 7-9. HyperFrames, films, visuels ─────────────────────────────────────────────────────────────────────────────────
const nomsProjets = ['video-1', 'video-2', 'video-3', 'visuel-1', 'visuel-2', 'visuel-3']

async function controler(hf, dossier) {
  const rs = await Promise.all(nomsProjets.map((n) => lancerAsync(hf.cmd, [...hf.pre, 'check', path.join(dossier, 'hf', n), '--timeout=45000'], { timeout: DELAI_HF_MS }).then((r) => [n, r])))
  // (hyperframes traîne parfois après « Check passed » : tué au délai, son verdict imprimé fait foi.)
  for (const [n, r] of rs) if (r.status !== 0 && !(r.status === null && /Check passed/.test(r.stdout))) refuser(`hf/${n} : hyperframes check en échec (code ${r.status}) : ${queue(r)}`)
}

function debitBps(f) {
  const r = lancer('ffprobe', ['-v', 'error', '-show_entries', 'format=bit_rate', '-of', 'default=noprint_wrappers=1:nokey=1', f], { timeout: 60_000 })
  const d = Number(String(r.stdout || '').trim())
  return r.status === 0 && Number.isFinite(d) ? d : NaN
}

function reencoder(f, args) {
  const temp = `${f}.reenc.mp4`
  const r = lancer('ffmpeg', ['-y', '-v', 'error', '-i', f, '-map', '0:v', '-map', '0:a?', '-c:v', 'libx264', ...args, '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', temp], { timeout: 5 * 60_000 })
  if (r.status !== 0 || !fs.existsSync(temp)) refuser(`${posix(path.relative(R, f))} : réencodage impossible : ${queue(r)}`)
  fs.renameSync(temp, f)
}

async function rendreFilm(hf, dossier, n) {
  const dest = path.join(dossier, 'sortie', `video-${n}.mp4`)
  const rendre = () => lancerAsync(hf.cmd, [...hf.pre, 'render', path.join(dossier, 'hf', `video-${n}`), '--quality', 'high', '-o', dest])
  let r = await rendre()
  // Trois rendus à la fois sur un poste de 8 Go : un Chrome peut tomber, on retente une fois ce film-là.
  if (r.status !== 0 || !fs.existsSync(dest) || fs.statSync(dest).size === 0) { fs.rmSync(dest, { force: true }); r = await rendre() }
  if (r.status !== 0 || !fs.existsSync(dest) || fs.statSync(dest).size === 0) refuser(`sortie/video-${n}.mp4 : hyperframes render en échec (code ${r.status}) : ${queue(r)}`)
  // Débit sous le plancher : H.264 à qualité constante (CRF 18), plafonné à 4 Mbit/s, son recopié.
  // (idem au-dessus de 8 Mo : « high » rend ~10 Mo, le plafond de 4 Mbit/s ramène à ~7,5 Mo.)
  if (!(debitBps(dest) >= DEBIT_PLANCHER_BPS) || fs.statSync(dest).size > FILM_MAX_OCTETS) {
    reencoder(dest, ['-crf', '18', '-maxrate', '4M', '-bufsize', '8M'])
    // Un plan très simple peut encore rester sous le plancher : on impose alors un débit cible.
    if (!(debitBps(dest) >= DEBIT_PLANCHER_BPS)) reencoder(dest, ['-b:v', '3600k', '-maxrate', '4M', '-bufsize', '8M'])
  }
  const duree = dureeMedia(dest)
  if (!(duree >= FILM_DUREE_MIN && duree <= FILM_DUREE_MAX)) refuser(`sortie/video-${n}.mp4 : durée ${Number.isFinite(duree) ? duree.toFixed(1) : '?'} s (attendu ${FILM_DUREE_MIN} à ${FILM_DUREE_MAX} s)`)
  const taille = fs.statSync(dest).size
  if (taille > FILM_MAX_OCTETS) refuser(`sortie/video-${n}.mp4 : ${mo(taille)} (8 Mo au plus)`)
}

async function tirerVisuel(hf, dossier, tmp, n) {
  const dest = path.join(dossier, 'sortie', `visuel-${n}.jpg`)
  const dirSnap = path.join(tmp, 'snapshots', `visuel-${n}`)
  fs.mkdirSync(dirSnap, { recursive: true })
  const prendre = () => lancerAsync(hf.cmd, [...hf.pre, 'snapshot', path.join(dossier, 'hf', `visuel-${n}`), '--at', '0.5', '--no-end', '--describe', 'false', '--timeout', '45000', '-o', dirSnap], { timeout: DELAI_HF_MS })
  let r = await prendre()
  if (r.status !== 0) r = await prendre() // un Chrome qui tombe sur un poste chargé : une seconde chance
  if (r.status !== 0) refuser(`sortie/visuel-${n}.jpg : hyperframes snapshot en échec (code ${r.status}) : ${queue(r)}`)
  // snapshot écrit aussi une planche-contact « contact-sheet.jpg » (grille d'aperçu, cadre étiqueté) : seul le cadre
  // « frame-NN-at-Ts.png » est le visuel (constaté le 04/10 : la planche, prise pour le visuel, passait PL-9 sans être un visuel).
  const cadre = fs.readdirSync(dirSnap).filter((f) => /^frame-\d+-at-[\d.]+s\.(png|jpe?g)$/i.test(f)).sort()[0]
  if (!cadre) refuser(`sortie/visuel-${n}.jpg : hyperframes snapshot n'a produit aucun cadre (frame-NN-at-Ts.png)`)
  const meta = await sharp(path.join(dirSnap, cadre)).metadata()
  if (meta.width !== meta.height) refuser(`sortie/visuel-${n}.jpg : cadre ${meta.width}×${meta.height}, carré attendu (le visuel est un carré 1080×1080)`)
  let buf
  try { buf = await sharp(path.join(dirSnap, cadre)).resize(1080, 1080, { fit: 'fill' }).jpeg({ quality: 85 }).toBuffer() } catch (e) { refuser(`sortie/visuel-${n}.jpg : cadre illisible (${e.message})`) }
  if (buf.length > VISUEL_MAX_OCTETS) refuser(`sortie/visuel-${n}.jpg : ${mo(buf.length)} (1 Mo au plus)`)
  fs.writeFileSync(dest, buf)
}

// ── Enchaînement ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const { dossier, metaLogement } = lireArguments(process.argv.slice(2))
  const pack = lirePack(dossier)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-pub-'))
  try {
    // Un rendu précédent ne survit à aucune relance : sortie/ n'existe que si tout a réussi.
    fs.rmSync(path.join(dossier, 'sortie'), { recursive: true, force: true })
    fs.rmSync(path.join(dossier, 'hf'), { recursive: true, force: true })

    const photos = await preparerPhotos(pack, dossier, tmp) // 2 et 3
    const logo = await preparerLogo(dossier)
    const voix = preparerVoix(pack, dossier) // 5
    const manifeste = {
      photos: photos.map((p) => ({ fichier: `photos/${p.nom}`, sha256: p.sha256, source: p.source, role: p.role, personnes: p.personnes, accord_personnes: p.accord_personnes })),
      ...(logo ? { logo } : {}),
      ...(voix ? { voix } : {}),
    }
    fs.writeFileSync(path.join(dossier, 'manifeste-entrees.json'), `${JSON.stringify(manifeste, null, 2)}\n`) // 4

    // 6. Films : avant-apres (chantier inversé sans paire avant/après, décidé par instancier.mjs), chantier, artisan-ville.
    const hf = resoudreHyperframes()
    const gabaritsFilms = ['avant-apres', 'chantier', 'artisan-ville']
    gabaritsFilms.forEach((g, i) => {
      const inst = preparerInstance(`video-${i + 1}`, pack, photos, 0, dossier, tmp, logo, voix)
      instancier(g, inst, path.join(dossier, 'hf', `video-${i + 1}`))
    })
    // Visuels : trois photos différentes (la première du pack tourne de un cran à chaque visuel).
    for (let n = 1; n <= 3; n++) {
      const inst = preparerInstance(`visuel-${n}`, pack, photos, n - 1, dossier, tmp, logo, voix)
      instancier('visuel', inst, path.join(dossier, 'hf', `visuel-${n}`))
    }

    const t0 = Date.now()
    const etape = (nom) => console.error(`· ${nom} (${Math.round((Date.now() - t0) / 1000)} s)`)
    fs.mkdirSync(path.join(dossier, 'sortie'), { recursive: true })
    await controler(hf, dossier) // 7
    etape('check ok')
    // Films et visuels ensemble : le délai de navigation des snapshots est relevé (90 s) et chaque snapshot est retenté une fois.
    await Promise.all([
      ...[1, 2, 3].map((n) => rendreFilm(hf, dossier, n)), // 8
      ...[1, 2, 3].map((n) => tirerVisuel(hf, dossier, tmp, n)), // 9
    ])
    etape('films rendus et visuels tirés')

    // 10. Textes : le code 3 (catégorie « Logement » non vérifiée) est rendu tel quel.
    const rt = lancer(process.execPath, [path.join(ICI, 'textes.mjs'), dossier, ...(metaLogement ? [`--meta-logement=${metaLogement}`] : [])], { timeout: 60_000 })
    if (rt.status !== 0 && rt.status !== 3) refuser(`sortie/textes.md : textes.mjs en échec (code ${rt.status}) : ${queue(rt)}`)
    if (rt.status === 3) process.exitCode = 3

    // 11. Résumé.
    for (const nom of fs.readdirSync(path.join(dossier, 'sortie')).sort()) {
      console.log(`sortie/${nom}  ${mo(fs.statSync(path.join(dossier, 'sortie', nom)).size)}`)
    }
    if (rt.status === 3) console.error(`catégorie Logement non vérifiée : ${queue(rt)}`)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

main().catch((e) => {
  console.error(`✗ fabriquer : ${e instanceof Refus ? e.message : e.stack || e.message}`)
  process.exitCode = 1
})
