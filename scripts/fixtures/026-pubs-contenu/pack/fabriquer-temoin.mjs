#!/usr/bin/env node
// scripts/fixtures/026-pubs-contenu/pack/fabriquer-temoin.mjs — fabrique le pack témoin de pub-locale-qa.mjs sous
// .orchestre/travail/026-pubs-contenu/pack-temoin/ (fiche 026-126, point 3, 3e puce) : un pack CONFORME avec des
// compositions minimales PROPRES AU TÉMOIN (pas le gabarit gabarits-pubs/locale/, qui n'existe pas encore — fiche
// 026-153), rendues par HyperFrames, visuels par snapshot, textes et fiche écrits à la main. Mis en cache par
// existence des fichiers (idempotent, comme scripts/fixtures/026-pubs-contenu/socle/fabriquer-films.mjs) : relancer
// sans --force ne refait que ce qui manque.
//
// Deux niveaux (--niveau=) : « base » (pack.json, photos/, voix.mp3, manifeste-entrees.json, gabarits-temoin/, les
// textes de sortie/) est rapide et suffit à pub-locale-qa.mjs --partie=gabarit et --partie=textes ; « media » (tout
// « base » + hf/*/ instanciés + sortie/video-N.mp4 rendus + sortie/visuel-N.jpg) est lent (rendu HyperFrames) et ne
// tourne que pour --partie=complet.
//
// Usage : node scripts/fixtures/026-pubs-contenu/pack/fabriquer-temoin.mjs [--niveau=base|media] [--force]
// N'écrit que sous .orchestre/travail/026-pubs-contenu/pack-temoin/ (ignoré par git).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync, spawn } from 'node:child_process'
import sharp from 'sharp'
import { instancier, TEMOIN_DIR, NOMS_GABARITS } from '../../../pub-locale-qa.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..', '..')
const FORCER = process.argv.includes('--force')
const NIVEAU = (process.argv.find((a) => a.startsWith('--niveau=')) || '--niveau=media').slice(9)
if (!['base', 'media'].includes(NIVEAU)) { console.error(`✗ fabriquer-temoin : --niveau=base|media attendu (reçu ${NIVEAU})`); process.exit(2) }

const existeNonVide = (f) => { try { const s = fs.statSync(f); return s.isFile() && s.size > 0 } catch { return false } }
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const p = (...s) => path.join(TEMOIN_DIR, ...s)

fs.mkdirSync(TEMOIN_DIR, { recursive: true })

// ── 1. pack.json ─────────────────────────────────────────────────────────────────────────────────────────────────────
const PHOTOS_SOURCES = [
  { fichier: 'public/sites-demo/electricien/images/variateur-720.webp', role: 'detail' },
  { fichier: 'public/sites-demo/chauffagiste/images/pac-720.webp', role: 'chantier' },
  { fichier: 'public/sites-demo/menuisier/images/escalier-tournant-720.webp', role: 'detail' }, // texturé (photo « thermostat » écartée : fond de mur presque uni, trop peu de mouvement mesurable au filé)
  { fichier: 'public/sites-demo/lestraque/images/boiserie-720.webp', role: 'avant' },
  { fichier: 'public/sites-demo/lestraque/images/mains-noyer-720.webp', role: 'chantier' },
  { fichier: 'public/sites-demo/menuisier/images/bibliotheque-720.webp', role: 'apres' },
]
const TEXTE_VOIX = 'Electricien a Nantes. Intervention rapide et travail soigne. Appelez-nous maintenant.'
function ecrirePackJson() {
  const f = p('pack.json')
  if (existeNonVide(f) && !FORCER) { const pack = JSON.parse(fs.readFileSync(f, 'utf8')); pack.__dir = TEMOIN_DIR; return pack }
  const pack = {
    pack_id: 'temoin',
    matiere: {
      metier: 'Électricité', ville: 'Nantes', communes: ['Nantes'],
      duree_travaux: '2 jours', materiaux: 'matériel aux normes',
      cta: 'appel', telephone: '01 23 45 67 89',
      voix: 'synthese', texte_voix: TEXTE_VOIX,
      decennale: true, accroche: 'Electricien a Nantes, reactif et a votre ecoute',
      photos: PHOTOS_SOURCES.map((s, i) => ({ fichier: `photos/${String(i + 1).padStart(2, '0')}.jpg`, role: s.role, personnes: false, accord_personnes: false })),
    },
  }
  fs.writeFileSync(f, JSON.stringify(pack, null, 2))
  pack.__dir = TEMOIN_DIR
  return pack
}

// ── 2. photos/NN.jpg : décodées, orientées, sans métadonnées ────────────────────────────────────────────────────────
async function preparerPhotos() {
  fs.mkdirSync(p('photos'), { recursive: true })
  const manifestePhotos = []
  for (const [i, src] of PHOTOS_SOURCES.entries()) {
    const n = String(i + 1).padStart(2, '0')
    const dest = p('photos', `${n}.jpg`)
    if (!existeNonVide(dest) || FORCER) {
      const buf = await sharp(path.join(R, src.fichier)).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
      fs.writeFileSync(dest, buf)
    }
    manifestePhotos.push({ fichier: `photos/${n}.jpg`, sha256: sha256(fs.readFileSync(dest)), source: src.fichier, role: src.role, personnes: false, accord_personnes: false })
  }
  return manifestePhotos
}

// ── 3. voix.mp3 : réutilise jeu-2/voix.mp3 (même méthode, même contrainte « sans chiffre ») ─────────────────────────
function preparerVoix() {
  const dest = p('voix.mp3')
  const source = path.join(ICI, 'jeu-2', 'voix.mp3')
  if (!existeNonVide(dest) || FORCER) {
    if (!existeNonVide(source)) throw new Error(`${path.relative(R, source)} introuvable — lancer d'abord node scripts/fixtures/026-pubs-contenu/pack/jeu-2/fabriquer-voix.mjs`)
    fs.copyFileSync(source, dest)
  }
  return { fichier: 'voix.mp3', sha256: sha256(fs.readFileSync(dest)) }
}

function ecrireManifeste(manifestePhotos, voix) {
  const f = p('manifeste-entrees.json')
  fs.writeFileSync(f, JSON.stringify({ photos: manifestePhotos, voix }, null, 2))
}

// ── 4. Les 4 gabarits témoin (marques, PAS le gabarit gabarits-pubs/locale/) ─────────────────────────────────────────
// .clip { inset:0 } pose top/right/bottom/left à 0 : un id qui ne fixe QUE top (ou QUE bottom) laisse l'autre bord
// hérité à 0, donc une boîte étirée dont le texte semble « en haut » même quand bottom:8% est bien appliqué (vérifié
// à l'image sur la planche du témoin, pas seulement par le juge). Chaque bloc de texte pose donc explicitement les
// QUATRE côtés (top/bottom à auto quand non voulus), jamais seulement le côté qui l'intéresse.
const CSS_COMMUN = `
  body { margin:0; background:#0b0f14; }
  .clip { position:absolute; inset:0; }
  .fond { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .texte-surimpression { position:absolute; left:8%; right:8%; top:auto; bottom:auto; color:#fff; font:700 54px/1.25 Arial, Helvetica, sans-serif; text-shadow:0 3px 10px rgba(0,0,0,.75); }
  #mention-ia { position:absolute; left:6%; right:auto; top:auto; bottom:8%; color:#fff; font:500 26px/1.3 Arial, Helvetica, sans-serif; background:rgba(0,0,0,.55); padding:10px 16px; border-radius:10px; }
`.trim()

function gabaritFilm(id) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${id}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  ${CSS_COMMUN}
  #root { position:relative; width:1080px; height:1920px; overflow:hidden; }
  #metier { top:20%; }
  #accroche { top:34%; font-size:42px; }
  #cta { top:38%; }
</style>
</head>
<body>
  <div id="root" data-composition-id="${id}" data-start="0" data-width="1080" data-height="1920" data-duration="15">
    <section id="c1" class="clip" data-start="0" data-duration="2.5"><img class="fond" src="{{photo:1}}" /></section>
    <section id="c2" class="clip" data-start="2.5" data-duration="2.5"><img class="fond" src="{{photo:2}}" /></section>
    <section id="c3" class="clip" data-start="5" data-duration="2.5"><img class="fond" src="{{photo:3}}" /></section>
    <section id="c4" class="clip" data-start="7.5" data-duration="2.5"><img class="fond" src="{{photo:4}}" /></section>
    <section id="c5" class="clip" data-start="10" data-duration="2.5"><img class="fond" src="{{photo:5}}" /></section>
    <section id="c6" class="clip" data-start="12.5" data-duration="2.5"><img class="fond" src="{{photo:6}}" /></section>
    <div id="metier" class="clip texte-surimpression" data-start="0" data-duration="5">{{metier}} — {{ville}}</div>
    <div id="accroche" class="clip texte-surimpression" data-start="0" data-duration="5">{{accroche}}</div>
    <div id="cta" class="clip texte-surimpression" data-start="12.5" data-duration="2.5">{{cta}} {{telephone}}</div>
    <!-- solo-si-voix -->
    <audio id="voix" class="clip" data-start="0" data-duration="15" src="{{voix}}"></audio>
    <div id="mention-ia" class="clip" data-start="0" data-duration="15">Voix générée par IA</div>
    <!-- /solo-si-voix -->
  </div>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true })
      var ids = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']
      // Zoom + filé horizontal (pas un zoom centré seul : au centre du cadre, un zoom centré bouge trop peu d'une
      // image à l'autre pour la mesure de video-qa --profil=pub-locale — le filé garantit un mouvement uniforme sur
      // tout le cadre, dès la première image du plan).
      ids.forEach(function (cid, i) {
        var el = document.querySelector('#' + cid + ' .fond')
        var sens = i % 2 === 0 ? 1 : -1
        tl.fromTo(el, { scale: 1.15, xPercent: -9 * sens, yPercent: -3 }, { scale: 1.45, xPercent: 9 * sens, yPercent: 3, duration: 2.5, ease: 'none' }, i * 2.5)
      })
      window.__timelines['${id}'] = tl
    })()
  </script>
</body>
</html>
`
}

function gabaritVisuel(id) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${id}</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  ${CSS_COMMUN}
  #root { position:relative; width:1080px; height:1080px; overflow:hidden; }
  #accroche { top:22%; font-size:40px; }
  #cta { top:70%; }
</style>
</head>
<body>
  <div id="root" data-composition-id="${id}" data-start="0" data-width="1080" data-height="1080" data-duration="2">
    <section id="c1" class="clip" data-start="0" data-duration="2"><img class="fond" src="{{photo:1}}" /></section>
    <div id="accroche" class="clip texte-surimpression" data-start="0" data-duration="2">{{accroche}}</div>
    <div id="cta" class="clip texte-surimpression" data-start="0" data-duration="2">{{cta}} {{telephone}}</div>
    <!-- solo-si-voix -->
    <audio id="voix" class="clip" data-start="0" data-duration="2" src="{{voix}}"></audio>
    <div id="mention-ia" class="clip" data-start="0" data-duration="2">Voix générée par IA</div>
    <!-- /solo-si-voix -->
  </div>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true })
      var el = document.querySelector('#c1 .fond')
      tl.fromTo(el, { scale: 1 }, { scale: 1.08, duration: 2, ease: 'none' }, 0)
      window.__timelines['${id}'] = tl
    })()
  </script>
</body>
</html>
`
}

function ecrireGabaritsTemoin() {
  const dir = path.join(TEMOIN_DIR, 'gabarits-temoin')
  for (const nom of NOMS_GABARITS) {
    const dest = path.join(dir, nom, 'index.html')
    if (existeNonVide(dest) && !FORCER) continue
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, nom === 'visuel' ? gabaritVisuel(nom) : gabaritFilm(nom))
  }
}

// ── 5. sortie/textes.md et sortie/fiche-10-min.md (écrits à la main, statut Logement = oui) ─────────────────────────
function ecrireTextesTemoin() {
  fs.mkdirSync(p('sortie'), { recursive: true })
  const fTextes = p('sortie', 'textes.md')
  if (!existeNonVide(fTextes) || FORCER) {
    fs.writeFileSync(fTextes, `# Textes d'annonce — temoin

## Variante 1
- Titre : Électricien à Nantes
- Texte : Électricien à Nantes, réactif et à votre écoute. Intervention en 2 jours. Appelez-nous.
- Description : Devis gratuit rapide

## Variante 2
- Titre : Devis gratuit rapide
- Texte : Électricité à Nantes, matériel aux normes, intervention en 2 jours. Appelez le 01 23 45 67 89.
- Description : Artisan de confiance

## Variante 3
- Titre : Artisan électricien Nantes
- Texte : Travaux couverts par la garantie décennale. Devis gratuit, intervention en 2 jours à Nantes.
- Description : Appelez-nous vite
`)
  }
  const fFiche = p('sortie', 'fiche-10-min.md')
  if (!existeNonVide(fFiche) || FORCER) {
    fs.writeFileSync(fFiche, `# Fiche « lancer la pub en 10 min » — Électricité à Nantes

1. Ouvrez le Gestionnaire de publicités Meta et créez une nouvelle campagne.
2. Choisissez la catégorie spéciale Logement : Meta l'exige pour une pub de travaux et retire le ciblage par âge ou par genre.
3. Définissez un rayon de 15 km autour de Nantes comme ciblage géographique.
4. Importez les 3 vidéos et les 3 visuels fournis, avec les 3 variantes de texte.
5. Gardez la mention Voix générée par IA à l'écran : elle doit rester visible pendant toute la vidéo.
6. Déclarez le contenu généré par IA si Meta le propose dans les réglages de la publicité.
7. Activez le bouton d'appel : Appelez-nous, 01 23 45 67 89.
8. Fixez un budget quotidien et lancez la campagne.
`)
  }
}

// ── 6. hf/video-1..3, hf/visuel-1..3 : instanciés (fiche 026-126, instancier()) ──────────────────────────────────────
const AFFECTATION = { 'video-1': 'chantier', 'video-2': 'avant-apres', 'video-3': 'artisan-ville', 'visuel-1': 'visuel', 'visuel-2': 'visuel', 'visuel-3': 'visuel' }
function instancierHf(pack) {
  const dirGabarits = path.join(TEMOIN_DIR, 'gabarits-temoin')
  for (const [dest, gabarit] of Object.entries(AFFECTATION)) {
    const sortie = p('hf', dest)
    if (existeNonVide(path.join(sortie, 'index.html')) && !FORCER) continue
    instancier(path.join(dirGabarits, gabarit, 'index.html'), pack, sortie)
  }
}

// ── 7. Rendu : sortie/video-N.mp4 (HyperFrames) et sortie/visuel-N.jpg (snapshot) ───────────────────────────────────
// shell: true — sous Windows, spawnSync('npx', …) sans shell échoue en ENOENT (npx est un .cmd) ; aucun argument ici
// ne porte de métacaractère de shell.
function hf(args, { timeout = 6 * 60_000 } = {}) {
  return spawnSync('npx', ['--yes', 'hyperframes@0.8.33', ...args], { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28, timeout, shell: true })
}
// Les 3 rendus en parallèle (spawn async, pas spawnSync) : sur ce poste (12 coeurs, 8 Go), 3 rendus concurrents
// tiennent largement mieux dans le budget de 8 min par appel de juges-026-pubs-contenu-preuve.mjs que 3 rendus
// sériels (chacun ~2 min, donc ~6 min de suite rien que pour les films, avant même la vérification).
function hfAsync(args, { timeout = 6 * 60_000 } = {}) {
  return new Promise((resolve) => {
    const enf = spawn('npx', ['--yes', 'hyperframes@0.8.33', ...args], { cwd: R, windowsHide: true, shell: true })
    let stdout = '', stderr = ''
    enf.stdout.on('data', (d) => { stdout += d })
    enf.stderr.on('data', (d) => { stderr += d })
    const minuteur = setTimeout(() => { try { enf.kill() } catch { /* */ } }, timeout)
    enf.on('close', (code) => { clearTimeout(minuteur); resolve({ status: code, stdout, stderr }) })
    enf.on('error', (e) => { clearTimeout(minuteur); resolve({ status: 1, stdout, stderr: String(e) }) })
  })
}
async function rendreVideos() {
  const taches = []
  for (let n = 1; n <= 3; n++) {
    const dest = p('sortie', `video-${n}.mp4`)
    if (existeNonVide(dest) && !FORCER) continue
    const hfDir = p('hf', `video-${n}`)
    taches.push(hfAsync(['render', hfDir, '-o', dest, '--fps', '30', '--video-bitrate', '3600k', '--quality', 'standard']).then((r) => {
      if (r.status !== 0 || !existeNonVide(dest)) throw new Error(`rendu video-${n} : code ${r.status} — ${(r.stderr || r.stdout || '').split('\n').slice(-10).join(' | ')}`)
    }))
  }
  await Promise.all(taches)
}
async function rendreVisuels() {
  for (let n = 1; n <= 3; n++) {
    const dest = p('sortie', `visuel-${n}.jpg`)
    if (existeNonVide(dest) && !FORCER) continue
    const hfDir = p('hf', `visuel-${n}`)
    const out = p('_snap-visuel', String(n))
    fs.rmSync(out, { recursive: true, force: true })
    const r = hf(['snapshot', hfDir, '--at', '1', '--no-end', '-o', out])
    if (r.status !== 0) throw new Error(`snapshot visuel-${n} : code ${r.status} — ${(r.stderr || r.stdout || '').split('\n').slice(-10).join(' | ')}`)
    const png = fs.readdirSync(out).find((f) => /^frame-\d+-at-/.test(f))
    if (!png) throw new Error(`snapshot visuel-${n} : aucun cadre produit`)
    await sharp(path.join(out, png)).jpeg({ quality: 90 }).toFile(dest)
  }
}

// ── Enchaînement ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const pack = ecrirePackJson()
  const manifestePhotos = await preparerPhotos()
  const voix = preparerVoix()
  ecrireManifeste(manifestePhotos, voix)
  ecrireGabaritsTemoin()
  ecrireTextesTemoin()
  if (NIVEAU === 'base') { console.log(`fabriquer-temoin --niveau=base : prêt sous ${path.relative(R, TEMOIN_DIR)}`); return }

  instancierHf(pack)
  rendreVideos()
  await rendreVisuels()
  console.log(`fabriquer-temoin --niveau=media : prêt sous ${path.relative(R, TEMOIN_DIR)}`)
}
main().catch((e) => { console.error(`✗ fabriquer-temoin : ${e.stack || e.message}`); process.exitCode = 1 })
