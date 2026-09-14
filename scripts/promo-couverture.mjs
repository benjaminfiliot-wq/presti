// La couverture de la Page Facebook « Presti » (prompt v12 §2.1).
//
//   node scripts/promo-couverture.mjs            → public/promo/facebook-couverture-1640x856.png
//   node scripts/promo-couverture.mjs --guide    → + une version avec les zones de rognage tracées
//
// Pourquoi ce n'est pas un simple recadrage de `presti-partage-1200x630.png`, comme le prompt le
// suggérait : cette image est calée à GAUCHE, et une couverture Facebook est rognée par les côtés
// sur mobile. Le logo et la phrase disparaîtraient pour la moitié des visiteurs. La couverture est
// donc recomposée, CENTRÉE, à partir des mêmes éléments de marque — et rendue à 1640×856 natif
// plutôt qu'agrandie depuis 1200 de large.
//
// Ce que Facebook affiche, et qui commande la composition :
//   · fichier téléversé  1640 × 856
//   · bureau             820 × 312  (les bords haut et bas sont rognés)
//   · mobile             640 × 360  (les bords gauche et droit sont rognés)
//
// ⚠️ ET SURTOUT — constaté à l'œil dans l'aperçu de Facebook le 08/09, pas déduit : la PHOTO DE
// PROFIL de la Page se pose AU CENTRE de la couverture, dans les deux aperçus. Sur bureau elle
// masquait la moitié de la phrase ; sur mobile le cercle couvre la couverture presque entière.
// Une couverture centrée est donc le pire choix possible, et c'était ma première version.
//
// Conclusion : la couverture ne porte AUCUN texte. C'est une toile de fond — l'aube de la marque,
// en lumière, sur le fond nuit. Le message est déjà porté par le nom de la Page et par la bio, qui
// s'affichent en clair juste dessous (vérifié dans l'aperçu mobile). Un décor qui ne se bat avec
// rien vaut mieux qu'une phrase à moitié cachée.

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const RACINE = process.cwd()
const SORTIE = path.join(RACINE, 'public', 'promo')
const W = 1640
const H = 856
// La bande sûre. Mesurée au rendu, pas devinée : à 62 % de la largeur, la phrase débordait des
// 640 px que le mobile conserve et se faisait couper des deux côtés. Le bloc tient donc DANS ces
// 640 px, moins une marge — c'est étroit pour une image de 1640, et c'est le prix d'une couverture
// lisible partout.
const SUR_L = 600 / 1640
const SUR_H = 0.86

const NUIT = '#0A0C11'
const CORAIL = '#D97757'
const TEXTE = '#EDEFF4'
const CREME = '#F3EEE6'
const GUIDE = process.argv.includes('--guide')

const dataUri = (rel) => {
  const p = path.join(RACINE, 'public', rel)
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`
}

// La phrase est celle de la vidéo LinkedIn : elle parle du monde (qui répond décroche), pas du
// produit — rien à prouver dans le code. La sous-ligne, elle, décrit le produit : elle dit
// « réponse PRÊTE en moins d'une minute », parce que `mode_reponse` vaut 'assistee' par défaut
// (lib/plateformeConfig.ts:45) et que l'artisan garde l'envoi. Voir scripts/promo-video.mjs.
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  body{background:${NUIT};position:relative}
  /* L'aube : une lumière chaude qui monte du bas, comme le trait du logo. Rien au centre, où se
     pose la photo de profil. */
  .aube{position:absolute;inset:0;background:
    radial-gradient(135% 95% at 50% 108%, ${CORAIL}D9 0%, ${CORAIL}8C 22%, ${CORAIL}3D 44%, transparent 68%),
    radial-gradient(80% 55% at 12% 4%, #6C4A7A2E, transparent 66%),
    radial-gradient(70% 50% at 90% 6%, ${CORAIL}1F, transparent 68%)}
  /* L'horizon : le trait du logo, tenu à hauteur du tiers bas. C'est lui qui fait lire une aube
     plutôt qu'un dégradé, et il reste visible même quand la photo de profil mange le centre. */
  .horizon{position:absolute;left:0;right:0;top:66%;height:2px;
    background:linear-gradient(90deg, transparent, ${CORAIL}66 12%, ${CREME}CC 50%, ${CORAIL}66 88%, transparent);
    box-shadow:0 0 ${Math.round(H * 0.09)}px ${CORAIL}66}
  .grain{position:absolute;inset:0;opacity:.035;
    background-image:radial-gradient(${CREME} 1px, transparent 1px);background-size:3px 3px}
  ${GUIDE ? `
  body::after{content:'';position:absolute;top:0;bottom:0;left:${(W - 640) / 2}px;width:640px;
    outline:2px dashed #F59E0B99;pointer-events:none}
  .cercle{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:${Math.round(H * 0.92)}px;height:${Math.round(H * 0.92)}px;border-radius:50%;
    outline:2px dashed #4ADE80AA}
  ` : '.cercle{display:none}'}
</style></head><body>
  <div class="aube"></div><div class="horizon"></div><div class="grain"></div>
  <div class="cercle"></div>
</body></html>`

fs.mkdirSync(SORTIE, { recursive: true })
const navigateur = await chromium.launch()
const page = await navigateur.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(150)
const f = path.join(SORTIE, GUIDE ? 'facebook-couverture-GUIDE.png' : 'facebook-couverture-1640x856.png')
await page.screenshot({ path: f })
await navigateur.close()
console.log(`✓ ${path.relative(RACINE, f)} — ${W}×${H}, ${(fs.statSync(f).size / 1e6).toFixed(2)} Mo`)
if (GUIDE) console.log('  vert = la photo de profil de la Page · orange = ce que le mobile garde (640 px centrés)')
