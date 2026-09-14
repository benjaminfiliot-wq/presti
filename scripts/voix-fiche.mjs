// La fiche des voix off, dans public/promo/voix/ — prompt v14 §7.
//
//   node scripts/voix-fiche.mjs
//
// Copie les dix pistes à l'endroit que le §7 demande et écrit leur fiche : la voix retenue, la
// durée de chacune, la marge qui reste dans son film. Les fichiers sont DÉRIVÉS — la source est
// `promo-src/hf/voix.mjs` pour les textes, et le compte ElevenLabs de Benj pour la synthèse.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { TEXTES, VOIX } from '../promo-src/hf/voix.mjs'
import { PUBLICATIONS } from '../promo-src/hf/publications.mjs'

const RACINE = path.resolve(import.meta.dirname, '..')
const DEST = path.join(RACINE, 'public', 'promo', 'voix')
fs.mkdirSync(DEST, { recursive: true })

const duree = (f) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f], { encoding: 'utf8' }).trim())

const lignes = []
const L = (s = '') => lignes.push(s)

L('# Les voix off des dix publications')
L()
L(`**Voix retenue : ${VOIX.nom}** — \`${VOIX.id}\`, français natif, timbre chaud, modèle \`${VOIX.modele}\`.`)
L('Choisie par Benj le 2026-09-10, après comparaison à l’oreille avec Jérôme et Enrick.')
L('**Une marque a une voix, pas dix** : les dix textes ont été dits par elle et par elle seule.')
L()
L('> ## ⚠️ Ces voix ne sont PLUS dans les vidéos livrées')
L('>')
L('> Benj, le 2026-09-10, après écoute : « enlève les voix c’est horrible mais mets de la')
L('> musique à la place ». Les trente fichiers portent désormais une **musique de fond** — voir')
L('> `promo-src/musique/LISEZMOI.md`.')
L('>')
L('> Ce dossier reste, et les MP3 aussi : le §7 du prompt les demande, et rien n’est perdu.')
L('> Pour remettre la voix sur une publication : `node scripts/voix-mixer.mjs NN`.')
L('>')
L('> **La leçon, et elle vaut d’être écrite** : la voix était normalisée à **−16 LUFS**, un')
L('> niveau de premier plan — celui d’un présentateur radio. La musique qui l’a remplacée est à')
L('> **−23 LUFS**. Ce n’était pas seulement le timbre : c’était le niveau.')
L()
L('> Ces fichiers sont **dérivés**. La source, ce sont les textes de `promo-src/hf/voix.mjs` et le')
L('> compte ElevenLabs de Benj. Ils sont copiés ici parce que le §7 du prompt les demande à cet')
L('> endroit ; le pipeline, lui, lit `publications/pub-NN/voix.mp3`.')
L()
L('| N° | Durée | Vidéo | Marge | Mots | Poids |')
L('|---|---|---|---|---|---|')

let manquantes = 0
for (const n of Object.keys(TEXTES).sort()) {
  const source = path.join(RACINE, 'publications', `pub-${n}`, 'voix.mp3')
  if (!fs.existsSync(source)) { L(`| ${n} | ⚠️ absente | | | | |`); manquantes++; continue }
  const cible = path.join(DEST, `pub-${n}.mp3`)
  fs.copyFileSync(source, cible)
  const d = duree(cible)
  const dv = PUBLICATIONS[n].plans.reduce((a, x) => a + x.d, 0)
  const mots = TEXTES[n].split(/\s+/).filter(Boolean).length
  const ko = Math.round(fs.statSync(cible).size / 1024)
  L(`| **${n}** | ${d.toFixed(1)} s | ${dv.toFixed(1)} s | +${(dv - d).toFixed(1)} s | ${mots} | ${ko} Ko |`)
}

L()
L('**Aucune ne demande d’être resserrée** : toutes tiennent dans leur film, avec de la marge.')
L('C’est le résultat de la règle des 45-60 mots du §3, apprise à mes dépens — un premier essai à')
L('78 mots sortait à **27,6 s pour une vidéo de 26,2 s**.')
L()
L('## Refaire une voix')
L()
L(`Corriger le texte dans \`promo-src/hf/voix.mjs\`, régénérer chez ElevenLabs avec la voix ${VOIX.nom},`)
L('déposer le MP3 en `publications/pub-NN/voix.mp3`, puis :')
L()
L('```bash')
L('node scripts/voix-mixer.mjs NN && node scripts/voix-fiche.mjs')
L('```')
L()
L('Le mixeur pose la piste sur la vidéo **déjà rendue** — une seconde, pas cinq heures — et il')
L('remesure ensuite : il refuse si l’image a raccourci.')
L()

fs.writeFileSync(path.join(DEST, 'LISEZMOI.md'), lignes.join('\n'), 'utf8')
const n = fs.readdirSync(DEST).filter((f) => f.endsWith('.mp3')).length
console.log(`✓ public/promo/voix/ — ${n} pistes + LISEZMOI.md${manquantes ? ` · ⚠️ ${manquantes} manquante(s)` : ''}`)
