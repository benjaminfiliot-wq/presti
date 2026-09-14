// Correctif des rideaux de transition — issu des entrées 8 et 9 de `plans/preuve-skills.md`.
//
//   node scripts/patch-transitions.mjs            → le flou seul (sûr par construction)
//   node scripts/patch-transitions.mjs --iris     → le flou + l'easing de l'iris (à mesurer)
//
// Deux skills lancées séparément — `apple-design` (§11, la vitesse par image) et `emil-design-eng`
// (« never animate from scale(0) ») — désignent le même objet : le rideau de 0,32 s. Mesuré à
// 30 i/s : `glisse` franchit jusqu'à 1 260 px entre deux images sur un cadre haut de 1 920, et
// l'iris passe de 0 à 729 px de large en une seule image.
//
// ── Pourquoi deux moitiés, et pourquoi elles ne se valent pas ────────────────────────────────
//
// LE FLOU est sûr sans rien rendre : il n'adoucit que les ARÊTES du rideau. À mi-course, le rideau
// couvre toujours le cadre entier, donc la différence d'image reste au-dessus de COUPE_EPS = 0,085
// et les 5 coupes / 10 s du §4 tiennent. C'est aussi pourquoi on ne rend PAS le rideau translucide
// (la piste « semi-transparent » du §14 d'apple-design) : ça, ça ferait tomber le juge.
//
// L'IRIS ne l'est pas. Le tween fait `opacity: 1 → 0` pendant la croissance : un iris qui s'ouvre
// plus lentement en s'effaçant risque de ne plus produire assez de différence d'image pour que la
// coupe soit comptée. Il est donc derrière `--iris`, et il DEMANDE un rendu + une passe du juge.
//
// La courbe retenue est `power2.inOut` — celle que `balai` et `glisse` emploient DÉJÀ. L'iris
// était le seul des trois en `power2.out`, sans raison écrite. Le corriger, c'est autant remettre
// les trois familles d'accord que supprimer le saut. Mesuré sur la première image, cadre 1080 :
//   power2.out (actuel) → 729 px  ·  power1.inOut → 120 px  ·  power2.inOut → 76 px
//
// Après application : régénérer, rendre, juger.
//   node scripts/hf-composer.mjs tous vertical && … && node scripts/video-qa.mjs publications/…

import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const CIBLE = path.join(RACINE, 'scripts', 'hf-composer.mjs')
const IRIS = process.argv.includes('--iris')

let s = fs.readFileSync(CIBLE, 'utf8')
const fait = []
const rates = []

const remplacer = (nom, avant, apres) => {
  if (s.includes(apres)) { fait.push(`${nom} — déjà appliqué`); return }
  if (!s.includes(avant)) { rates.push(nom); return }
  s = s.replace(avant, apres)
  fait.push(nom)
}

// ── 1. Le flou directionnel sur les rideaux qui TRANSLATENT ──────────────────────────────────
// `.balai` est la classe de base des trois familles ; `:not(.echelle)` vise donc `balai` et
// `glisse`, les deux qui traversent le cadre. L'iris, lui, grandit sur place : un flou dessus
// serait mis à l'échelle par le transform et deviendrait un halo de 34 px.
remplacer(
  'flou sur les rideaux en translation',
  `      .balai { position: absolute; inset: 0; background: ${'${CORAIL}'}; z-index: 3; will-change: transform; }`,
  `      .balai { position: absolute; inset: 0; background: ${'${CORAIL}'}; z-index: 3; will-change: transform; }
      /* Un rendu image par image n'a pas d'obturateur : chaque image est un instant net, et une
         arête qui franchit 1 260 px entre deux images strobe. Le flou en tient lieu — il n'agit
         que sur les ARÊTES, jamais sur la couverture maximale, donc le juge reste vert. */
      .balai:not(.echelle) { filter: blur(14px); }`,
)

// ── 2. L'iris : ni scale(0), ni une easing qui décélère ──────────────────────────────────────
if (IRIS) {
  remplacer(
    'iris — départ visible et easing symétrique',
    `tl.fromTo("#\${id}-tr", {scale: 0, opacity: 1}, {scale: 2.4, opacity: 0, duration: \${T}, ease: "power2.out"}, \${Math.round(at * 1000) / 1000});`,
    `tl.fromTo("#\${id}-tr", {scale: 0.06, opacity: 1}, {scale: 2.4, opacity: 0, duration: \${T}, ease: "power2.inOut"}, \${Math.round(at * 1000) / 1000});`,
  )
}

fs.writeFileSync(CIBLE, s)

console.log(`${fait.length} correction(s) appliquée(s)${IRIS ? ' (avec --iris)' : ' (flou seul — --iris pour l’easing)'}`)
for (const f of fait) console.log(`  ✓ ${f}`)
if (rates.length) {
  console.log('ANCRES MANQUÉES — le composeur a changé depuis :')
  for (const r of rates) console.log(`  » ${r}`)
  process.exit(1)
}
