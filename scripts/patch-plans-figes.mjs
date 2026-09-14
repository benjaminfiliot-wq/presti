// Correctif des plans figés sous le plancher du juge — 2026-09-10.
//
//   node scripts/patch-plans-figes.mjs
//
// LE DÉFAUT, mesuré. `video-qa.mjs` échantillonne à 8 i/s, réduit à 160 px de large, en gris, et
// compare les images ENTIÈRES. En dessous de FIGE_EPS = 0,006 d'écart moyen, l'image est réputée
// figée ; plus de 0,8 s consécutives = échec.
//
// Sur les trente fichiers livrés : 2 recalés, 4 à marge fine, 24 confortables. Mais ce n'était pas
// « deux ratés » : les six plans de code de la flotte mesurent
//   0,00460 · 0,00507 · 0,00516 · 0,00605 · 0,00652 · 0,00658   pour un seuil à 0,006.
// C'est un TYPE DE PLAN sans marge nulle part ; les 28 qui passaient le faisaient par chance de
// phase. Même chose pour le plan carte, par une autre géométrie.
//
// CE QUI A ÉTÉ ÉCARTÉ, et rendu pour le prouver — pas déduit :
//   • easing linéaire partout : ÉCHOUE ENCORE (1,13 s), et l'écart moyen DESCEND à 0,00433 contre
//     0,00450. La fenêtre fautive est au MILIEU du plan, là où `sine.inOut` tourne déjà à 1,4-1,57 ×
//     sa moyenne : supprimer le pic pour regarnir les extrémités rend le défaut pire.
//   • échelle élargie (× 2,1) : passe de justesse (0,63 s / 0,8) mais l'écart moyen reste à 0,00596,
//     SOUS le seuil. Une échelle a un point fixe — son centre — donc la ligne de code qu'on demande
//     de lire est justement ce qui bouge le moins.
//   • curseur clignotant : 0,0007 pour 0,006 requis.
//
// ⚠️ La dérive n° 4 porte sur la SECTION elle-même, motif qui n'existe nulle part ailleurs dans ce
// fichier. C'est le point à vérifier au rendu, pas sur le papier.

import fs from 'node:fs'
import path from 'node:path'

const CIBLE = path.resolve(import.meta.dirname, 'hf-composer.mjs')
let s = fs.readFileSync(CIBLE, 'utf8')
const faits = [], rates = []
const B = String.fromCharCode(96)
const D = String.fromCharCode(36)

const remplacer = (nom, avant, apres) => {
  if (s.includes(apres)) { faits.push(`${nom} — déjà appliqué`); return }
  if (!s.includes(avant)) { rates.push(nom); return }
  if (s.split(avant).length > 2) { rates.push(`${nom} (ancre AMBIGUË — ${s.split(avant).length - 1} occurrences)`); return }
  s = s.replace(avant, apres)
  faits.push(nom)
}

// ── 1 + 2. Le plan CODE : un bloc qui dérive, comme tout plan porteur de texte ────────────────
remplacer(
  '1. id sur le bloc du plan code',
  `        <div class="bloc">\n          <p class="kicker" id="${D}{id}-k">Dans le code, aujourd’hui</p>`,
  `        <div class="bloc" id="${D}{id}-bloc">\n          <p class="kicker" id="${D}{id}-k">Dans le code, aujourd’hui</p>`,
)
remplacer(
  '2. dérive de bloc sur le plan code',
  `      derive(${B}#${D}{id}-f${B}, ${B}{scale: 0.965}${B}, ${B}{scale: 1.055}${B})`,
  `      derive(${B}#${D}{id}-f${B}, ${B}{scale: 0.965}${B}, ${B}{scale: 1.055}${B})
      // Le plan code était le SEUL plan porteur de texte dont le bloc ne dérivait pas : sa seule
      // dérive continue était une échelle, et une échelle a un point fixe — son centre — donc elle
      // ne déplace presque rien. Mesuré : 0,15 px « juge » par échantillon, là où il en faut 0,47.
      //
      // 45 px/s n'est pas un chiffre libre : c'est (31 + 58) / 2, la moyenne des deux vitesses de
      // bloc DÉJÀ écrites dans ce fichier — 31 px/s sur le plan marque, 58 px/s sur les plans texte.
      // On lit du code : on va moins vite qu'un titre. Et pas 58, qui donnerait amp(58) = 70 px sur
      // un plan de 2,4 s alors que la boîte sûre en paysage n'a que 69,5 px de battement.
      //
      // Mesuré sur pub-01-vertical p13 : écart moyen 0,00507 → 0,01114 (× 2,20), plan figé du film
      // 1,13 s → 0,38 s. Sur pub-03-paysage : 0,00460 → 0,00982, 1,00 s → 0,13 s.
      derive(${B}#${D}{id}-bloc${B}, ${B}{y: ${D}{amp(45)}}${B}, ${B}{y: ${D}{-amp(45)}}${B})`,
)

// ── 3 + 4. Le plan CARTE : c'est la SECTION qui porte le plan ────────────────────────────────
remplacer(
  '3. débordement autorisé sur la section carte',
  `        corps.push(${B}      <section id="${D}{id}" class="clip capture carte" ${D}{tempo}>`,
  `        corps.push(${B}      <section id="${D}{id}" class="clip capture carte" data-layout-allow-overflow="true" ${D}{tempo}>`,
)
remplacer(
  '4. dérive de plan sur la section carte',
  `        derive(${B}#${D}{id}-halo${B}, ${B}{opacity: 0.10, scale: 0.78}${B}, ${B}{opacity: 0.5, scale: 1.28}${B})`,
  `        derive(${B}#${D}{id}-halo${B}, ${B}{opacity: 0.10, scale: 0.78}${B}, ${B}{opacity: 0.5, scale: 1.28}${B})
        // Même défaut que le plan code, autre géométrie. Sur une carte, RIEN ne porte le plan
        // entier : l'image dérive à l'intérieur de sa porte, le shimmer s'éteint à
        // min(1,1 s ; 0,62 × durée) — 0,72 s de queue morte sur un plan de 2,0 s, exactement le
        // défaut mesuré sur pub-08-vertical — et légende comme surligne ne bougent plus après leur
        // entrée. On donne donc au PLAN son rail : c'est la SECTION qui monte, à 58 px/s, la vitesse
        // de bloc déjà écrite dans ce fichier. Aucun nombre neuf.
        //
        // La section et NON l'image, et c'est le cœur de l'arbitrage : .porte garde son
        // overflow:hidden (la lueur reste découpée à la hauteur de la carte) et .surligne, posée
        // dans la section, reste alignée sur la carte par construction. Déplacer l'image obligerait
        // à dé-rogner .porte, ce qui ferait baver la lueur sur la nuit et désaligner la surligne.
        //
        // VERS LE HAUT SEULEMENT, et c'est calculé : la légende est à 0,4 × basSur = 154 px du bas
        // en vertical, déjà dans la bande des surcouches Reels/Facebook. Une dérive symétrique la
        // descendrait à 96 px. À sens unique, rien ne passe jamais sous sa position dessinée.
        derive(${B}#${D}{id}${B}, ${B}{y: 0}${B}, ${B}{y: ${D}{-2 * amp(58)}}${B})`,
)

// ── 5. Le CSS qui accompagne la dérive de section ────────────────────────────────────────────
remplacer(
  '5. overflow visible sur la section carte',
  `      .capture.carte .halo {`,
  `      /* La section carte dérive (voir la dérive de plan) : son propre overflow:hidden la ferait
         découper son halo. Invisible en vertical (le halo y vaut 0 d'alpha au bord) mais visible en
         paysage, où il vaut encore 0,31 : on verrait une couture horizontale. Le rognage reste tenu
         par #root, lui aussi en overflow:hidden — au repos l'image est identique au pixel près. */
      .capture.carte { overflow: visible; }
      .capture.carte .halo {`,
)

fs.writeFileSync(CIBLE, s)
console.log(`${faits.length}/5 corrections appliquées`)
for (const f of faits) console.log(`  ✓ ${f}`)
if (rates.length) { console.log('ANCRES MANQUÉES :'); for (const r of rates) console.log(`  » ${r}`); process.exit(1) }
