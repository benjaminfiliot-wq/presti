// Moteur vidéo promo — Presti
//
//   node scripts/promo-video.mjs            → les trois formats + leurs miniatures
//   node scripts/promo-video.mjs v          → 1080×1920, Reels et Stories
//   node scripts/promo-video.mjs c          → 1080×1350, fil Facebook et LinkedIn
//   node scripts/promo-video.mjs p          → 1920×1080, YouTube et site
//
// Le film est décrit dans promo-src/film.html : une fonction `render(t)` qui pose chaque valeur en
// fonction du temps, sans une seule animation CSS. C'est ce qui rend le résultat identique à chaque
// exécution — on change un mot, on relance, et seul ce mot bouge.
//
// ── Pourquoi cette réécriture du 2026-09-10 ───────────────────────────────────────────────────
//
// Les trois MP4 existaient dans public/promo/ mais PERSONNE ne pouvait les refaire, Benj compris.
// Quatre pannes, toutes vérifiées avant d'écrire une ligne :
//
//   1. `executablePath` pointait sur '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' — un
//      chemin Linux, sur une machine Windows. Le script ne démarrait pas. On laisse maintenant
//      Playwright choisir son propre navigateur : c'est le seul chemin juste sur les deux systèmes.
//   2. film.html appelle crop-*.png, marque.svg et trois .woff qui n'existaient sur AUCUN disque.
//      Ils ne vivent que dans assets-b64.json. Personne ne les dépaquetait : le film se rendait
//      donc sans ses captures et sans ses polices. C'est `deballer()` ci-dessous, et il tourne à
//      chaque exécution.
//   3. Le chemin du film était `process.cwd() + '/film.html'` : il fallait lancer la commande
//      depuis promo-src/, ce qu'aucun commentaire ne disait. On résout maintenant depuis la racine.
//   4. La chaîne ffmpeg était EN COMMENTAIRE, et seulement pour le vertical. D'où presti-paysage.mp4
//      à 40,2 s quand les deux autres font 22,0 s : ce n'était plus le même film. Elle est scriptée
//      ici, pour les trois formats, avec la miniature.
//
// Rien de tout ça ne s'invente à la relecture — c'est pour ça que ces quatre lignes existent.

import { chromium } from 'playwright'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const SRC = path.join(RACINE, 'promo-src')
const SORTIE = path.join(RACINE, 'public', 'promo')

const FPS = 30
const DUREE = 22.0
const FORMATS = {
  v: { dim: [1080, 1920], nom: 'presti-vertical', quoi: 'Reels et Stories' },
  c: { dim: [1080, 1350], nom: 'presti-carre', quoi: 'fil Facebook et LinkedIn' },
  p: { dim: [1920, 1080], nom: 'presti-paysage', quoi: 'YouTube et site' },
}

/**
 * Dépaquette les images et les polices depuis assets-b64.json vers promo-src/.
 * Idempotent : on récrit à chaque fois, ces fichiers sont dérivés et jamais édités à la main.
 * C'est la panne n°2 : sans lui, film.html se rend sans ses captures et retombe sur une police
 * système — le film sort, il est simplement faux, et rien ne le signale.
 */
function deballer() {
  const paquet = JSON.parse(fs.readFileSync(path.join(SRC, 'assets-b64.json'), 'utf8'))
  let n = 0
  for (const [rel, b64] of Object.entries(paquet)) {
    const cible = path.join(SRC, rel)
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.writeFileSync(cible, Buffer.from(b64, 'base64'))
    n++
  }
  return n
}

/** Rend les images une par une. `render(t)` place tout : aucune animation CSS, donc aucun aléa. */
async function images(cle) {
  const { dim } = FORMATS[cle]
  const dossier = path.join(RACINE, `frames-${cle}`)
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.mkdirSync(dossier)

  const navigateur = await chromium.launch({
    args: ['--force-device-scale-factor=1', '--font-render-hinting=none'],
  })
  const page = await navigateur.newPage({ viewport: { width: dim[0], height: dim[1] }, deviceScaleFactor: 1 })
  await page.goto('file://' + path.join(SRC, 'film.html').replace(/\\/g, '/') + `?f=${cle}`)
  await page.waitForTimeout(1200)
  await page.evaluate(() => document.fonts.ready)

  // Le film n'existe pas si `render` n'est pas là : mieux vaut s'arrêter que sortir 660 images
  // identiques d'un écran noir, ce qui est exactement ce qui passe inaperçu.
  const pret = await page.evaluate(() => typeof window.render === 'function')
  if (!pret) throw new Error('film.html ne définit pas window.render(t) — rien à rendre')

  const total = Math.round(FPS * DUREE)
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.render(t), i / FPS)
    await page.screenshot({ path: path.join(dossier, String(i).padStart(4, '0') + '.png') })
    if (i % 90 === 0) process.stdout.write(`${i}/${total} `)
  }
  await navigateur.close()
  return { dossier, total }
}

/** Assemble, puis tire la miniature à 60 % du film — là où le produit est à l'écran, pas le titre. */
function assembler(cle, dossier) {
  const { nom } = FORMATS[cle]
  fs.mkdirSync(SORTIE, { recursive: true })
  const mp4 = path.join(SORTIE, `${nom}.mp4`)
  const jpg = path.join(SORTIE, `${nom}-miniature.jpg`)

  const ff = (args) => {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
    if (r.error) throw new Error(`ffmpeg introuvable : ${r.error.message}`)
    if (r.status !== 0) throw new Error(`ffmpeg a échoué (code ${r.status})`)
  }

  ff(['-framerate', String(FPS), '-i', path.join(dossier, '%04d.png'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
  ff(['-ss', (DUREE * 0.6).toFixed(2), '-i', mp4, '-frames:v', '1', '-q:v', '3', jpg])

  fs.rmSync(dossier, { recursive: true, force: true })
  return { mp4, jpg }
}

// ── Exécution ─────────────────────────────────────────────────────────────────────────────────
const demande = (process.argv[2] || 'tous').toLowerCase()
const cles = demande === 'tous' ? Object.keys(FORMATS) : [demande]
for (const c of cles) if (!FORMATS[c]) throw new Error(`format inconnu : ${c} (attendu v, c, p ou rien)`)

const nAssets = deballer()
console.log(`✓ ${nAssets} fichiers dépaquetés depuis assets-b64.json`)

for (const cle of cles) {
  const { dim, nom, quoi } = FORMATS[cle]
  console.log(`\n${nom} — ${dim[0]}×${dim[1]}, ${quoi}`)
  const { dossier, total } = await images(cle)
  const { mp4, jpg } = assembler(cle, dossier)
  const mo = (fs.statSync(mp4).size / 1e6).toFixed(2)
  console.log(`\n✓ ${path.relative(RACINE, mp4)} — ${total} images, ${DUREE} s, ${mo} Mo`)
  console.log(`  ${path.relative(RACINE, jpg)}`)
}
