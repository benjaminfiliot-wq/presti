#!/usr/bin/env node
// appliquer.mjs — tâche 035-014 : pose le champ « Ce qui s'applique » et les ajouts à « Ce qu'elle montre » dans les fiches.
// Usage : node appliquer.mjs <lot 1|2|3> <données.json>   (données : { "12": { "montre": ["- …"], "applique": ["- …"] }, … })
// N'écrit que dans le fichier du lot ; refuse si le marqueur « (à écrire par Claude Code) » est déjà remplacé.
import fs from 'node:fs'
const [lot, donnees] = process.argv.slice(2)
const P = 'plans/011-cadrage-01-11/p5-entreprise/'
const f = `${P}fiches-compte-restructureai-lot${lot}.md`
let t = fs.readFileSync(f, 'utf8')
const d = JSON.parse(fs.readFileSync(donnees, 'utf8'))
const lignes = t.split('\n')
for (const [num, v] of Object.entries(d)) {
  const debut = lignes.findIndex((l) => new RegExp(`^## ${num}\\. `).test(l))
  if (debut < 0) throw new Error(`fiche ${num} introuvable dans ${f}`)
  let fin = lignes.findIndex((l, i) => i > debut && /^## \d+\. /.test(l)); if (fin < 0) fin = lignes.length
  // Ce qu'elle montre : ajout en fin de champ
  if (v.montre?.length) {
    const i = lignes.findIndex((l, k) => k > debut && k < fin && /^Principes et patterns réutilisables/.test(l))
    if (i < 0) throw new Error(`fiche ${num} : pas de « Principes »`)
    lignes.splice(i, 0, ...v.montre)
  }
  const fin2 = lignes.findIndex((l, i) => i > debut && /^## \d+\. /.test(l)) < 0 ? lignes.length : lignes.findIndex((l, i) => i > debut && /^## \d+\. /.test(l))
  const j = lignes.findIndex((l, k) => k > debut && k < fin2 && /^Ce qui s.applique à Presti/.test(l))
  if (j < 0) throw new Error(`fiche ${num} : pas de champ Presti`)
  if (lignes[j + 1].trim() !== '- (à écrire par Claude Code)') throw new Error(`fiche ${num} : champ déjà écrit`)
  lignes.splice(j, 2, "Ce qui s'applique à Presti / à ce client :", ...v.applique)
}
fs.writeFileSync(f, lignes.join('\n'))
console.log(`lot ${lot} : ${Object.keys(d).length} fiche(s) écrite(s)`)
