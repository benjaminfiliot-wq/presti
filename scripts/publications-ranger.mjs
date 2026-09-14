// Ranger les dix publications — un dossier par publication, tout dedans.
//
//   node scripts/publications-ranger.mjs
//
// Avant : le texte des dix dans un seul fichier (`plans/publications-10.md`), les dix vidéos dans
// `public/promo/pub-NN/`, et il fallait faire l'aller-retour pour publier. Après : `publications/`,
// un dossier par publication, avec le texte à publier et la vidéo à joindre côte à côte.
//
// `scripts/hf-rendre.mjs` écrit désormais **directement** dans ces dossiers : il n'y a qu'UNE copie
// de chaque vidéo. Ce script n'y dépose que le texte, et ne supprime jamais rien.
//
// ── Pourquoi un script et pas un déplacement à la main ───────────────────────────────────────
//
// Parce qu'un rangement à la main se défait à la première retouche : on corrige une phrase dans
// `plans/publications-10.md`, et la copie dans `publications/pub-03/texte.md` ment. Ici, `publications/`
// est **entièrement dérivé** — on le refait d'une commande, et il n'y a jamais deux vérités.
//
// Les deux sources restent :
//   • `plans/publications-10.md`      — l'éditorial (variantes, commentaires, réponses, sourçage)
//   • `promo-src/hf/publications.mjs` — les plans des vidéos
//
// C'est pour ça que `publications/` est dans .gitignore : y versionner les textes ferait un
// deuxième original, et versionner 68 Mo de MP4 dérivés d'une liste de plans n'a pas de sens.

import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const MAITRE = path.join(RACINE, 'plans', 'publications-10.md')
const DEST = path.join(RACINE, 'publications')

const texte = fs.readFileSync(MAITRE, 'utf8')
const lignes = texte.split(/\r?\n/)

// ── Découpage sur les titres « # Publication n° N — … » ───────────────────────────────────────
const debuts = []
lignes.forEach((l, i) => {
  const m = l.match(/^#\s+Publication n°\s*(\d+)\s*—\s*(.+)$/)
  if (m) debuts.push({ i, num: String(m[1]).padStart(2, '0'), titre: m[2].trim() })
})
if (debuts.length !== 10) throw new Error(`${debuts.length} publications trouvées dans ${path.relative(RACINE, MAITRE)}, 10 attendues`)

// Le premier « # » qui suit la dernière publication ferme la série (calendrier, commandes, décisions).
const finSerie = lignes.findIndex((l, i) => i > debuts[9].i && /^#\s+(?!Publication)/.test(l))
const preambule = lignes.slice(0, debuts[0].i).join('\n').trim()
const queue = finSerie > 0 ? lignes.slice(finSerie).join('\n').trim() : ''

// ⚠️ On ne vide JAMAIS `publications/`. Depuis que `scripts/hf-rendre.mjs` écrit directement ici,
// les vidéos n'existent qu'à cet endroit : un `rmSync` sur ce dossier effacerait vingt minutes de
// rendu au premier « je relance le rangeur pour corriger une phrase ». Ce script n'écrit que du
// texte, et il ne supprime rien.
fs.mkdirSync(DEST, { recursive: true })

const index = []

debuts.forEach((p, k) => {
  const fin = k + 1 < debuts.length ? debuts[k + 1].i : finSerie > 0 ? finSerie : lignes.length
  // Le « --- » qui séparait cette publication de la suivante n'a plus rien à séparer, une fois
  // qu'elle est seule dans son fichier.
  const corps = lignes.slice(p.i, fin).join('\n').trimEnd().replace(/\n+-{3,}$/, '').trimEnd()

  const dossier = path.join(DEST, `pub-${p.num}`)
  fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(path.join(dossier, 'texte.md'), corps + '\n', 'utf8')

  // La vidéo est déjà là : `scripts/hf-rendre.mjs` écrit dans ce même dossier. On se contente de
  // la constater — et de le DIRE quand elle manque, parce qu'un dossier de publication sans vidéo
  // ressemble exactement à un dossier de publication avec vidéo tant qu'on ne l'ouvre pas.
  const emporte = fs.readdirSync(dossier).filter((f) => f !== 'texte.md')

  const mp4 = path.join(dossier, 'vertical.mp4')
  const mo = fs.existsSync(mp4) ? (fs.statSync(mp4).size / 1e6).toFixed(1) : null
  index.push({ num: p.num, titre: p.titre, mo, fichiers: emporte.length })
  console.log(`✓ publications/pub-${p.num} — texte.md${mo ? ` + vidéo ${mo} Mo (${emporte.length} fichiers)` : '  ⚠️ AUCUNE VIDÉO'}`)
})

// ── Le mode d'emploi, en tête du dossier ─────────────────────────────────────────────────────
const table = index
  .map((x) => `| **${x.num}** | ${x.titre} | ${x.mo ? `${x.mo} Mo` : '⚠️ pas de vidéo'} | [\`pub-${x.num}/texte.md\`](pub-${x.num}/texte.md) |`)
  .join('\n')

const lisezmoi = `# Les dix publications, prêtes à publier

> **Ce dossier est fabriqué, pas écrit.** \`node scripts/publications-ranger.mjs\` le refait
> entièrement à partir de deux sources, qui restent les seules à corriger :
>
> - \`plans/publications-10.md\` — l'éditorial : variantes, premier commentaire, réponses type, sourçage ;
> - \`promo-src/hf/publications.mjs\` — les plans des vidéos.
>
> Corriger un mot **ici** ne sert à rien : la prochaine exécution l'écrase. Corrigez dans la source,
> relancez, et tout suit.

## Une publication, un dossier

| N° | Titre | Vidéo | Texte |
|---|---|---|---|
${table}

Dans chaque dossier :

| fichier | quoi |
|---|---|
| \`texte.md\` | les deux variantes, le premier commentaire, les trois réponses type, le sourçage |
| \`vertical.mp4\` | la vidéo, 1080 × 1920, à joindre au post |
| \`vertical-miniature.jpg\` | la miniature |
| \`planches-vertical/\` | les images extraites de la vidéo — celles qu'on regarde avant de dire que c'est fini |

${preambule ? `---\n\n${preambule}\n` : ''}
${queue ? `---\n\n${queue}\n` : ''}
---

## Refaire un élément

Une phrase à changer dans un texte :

\`\`\`bash
# on corrige dans plans/publications-10.md, puis :
node scripts/publications-ranger.mjs
\`\`\`

Un plan à changer dans une vidéo (la n° 3 par exemple) :

\`\`\`bash
# on corrige dans promo-src/hf/publications.mjs, puis :
node scripts/hf-composer.mjs 03 vertical && node scripts/hf-rendre.mjs 03 vertical && node scripts/publications-ranger.mjs
\`\`\`

Tout refaire, captures comprises :

\`\`\`bash
node scripts/captures-console.mjs && node scripts/hf-recadrer.mjs && node scripts/hf-composer.mjs tous vertical && for n in 01 02 03 04 05 06 07 08 09 10; do node scripts/hf-rendre.mjs $n vertical; done && node scripts/publications-ranger.mjs
\`\`\`
`

fs.writeFileSync(path.join(DEST, 'LISEZMOI.md'), lisezmoi, 'utf8')

const sansVideo = index.filter((x) => !x.mo)
console.log(`\n✓ ${path.relative(RACINE, DEST)}/ — ${index.length} publications rangées, plus LISEZMOI.md`)
if (sansVideo.length) console.log(`⚠️ sans vidéo : ${sansVideo.map((x) => x.num).join(', ')} — lancer scripts/hf-rendre.mjs`)
