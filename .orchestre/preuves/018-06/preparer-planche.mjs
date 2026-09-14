import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const racine = process.cwd()
const site = path.join(racine, 'public/sites-demo/lestraque')
const preuves = path.join(racine, '.orchestre/preuves/018-06')
const propositions = [
  { base: 'reserve-cuisine-poutres', sujet: 'cuisine', legende: 'Cuisine sous poutres avec plan de travail en bois', pourquoi: 'Vue d’ensemble lumineuse : proposition pour une carte cuisine ou une page ouvrage, pour varier la cuisine déjà présente.' },
  { base: 'reserve-bibliotheque', sujet: 'bibliotheque', legende: 'Bibliothèque en bois et niches ouvertes', pourquoi: 'Cadrage vertical sur les niches et les montants : proposition pour remplacer la penderie vide dans les ouvrages finis.' },
  { base: 'reserve-cuisine-tasseaux', sujet: 'cuisine', legende: 'Cuisine en bois et cloison à tasseaux', pourquoi: 'Vue en profondeur montrant les façades et la cloison ajourée : proposition pour illustrer l’agencement intérieur sans répéter le héros.' },
  { base: 'reserve-porte-panneaux', sujet: 'porte', legende: 'Porte intérieure en bois à panneaux', pourquoi: 'Ouvrage posé, cadré de face, dans une famille absente des cartes actuelles : proposition pour une carte menuiserie intérieure.' },
]
const fichier = path.join(site, 'attributions.json')
const attributions = JSON.parse(fs.readFileSync(fichier, 'utf8'))
const bases = new Set(propositions.map(p => p.base))
// Les crédits proviennent exclusivement de photos-demo.mjs et de l’API Commons.
// Seuls le statut de réserve et les dimensions des NOUVEAUX fichiers sont complétés.
for (const entree of attributions) {
  if (!bases.has(entree.base)) continue
  const dimensions = await sharp(path.join(site, entree.fichier)).metadata()
  entree.largeur = dimensions.width
  entree.hauteur = dimensions.height
  entree.usage = 'reserve'
}
for (const base of bases) if (!attributions.some(e => e.base === base)) throw new Error(`Base manquante : ${base}`)
fs.writeFileSync(fichier, JSON.stringify(attributions, null, 1))
fs.writeFileSync(path.join(preuves, 'proposition.json'), JSON.stringify(propositions, null, 2))
const cases = []
for (const [indice, proposition] of propositions.entries()) {
  const entree = attributions.find(e => e.base === proposition.base)
  const photo = await sharp(path.join(site, `images/${proposition.base}-960.webp`)).resize(600, 700, { fit: 'contain', background: '#201c18' }).toBuffer()
  const etiquette = Buffer.from(`<svg width="600" height="80"><rect width="600" height="80" fill="#201c18"/><text x="20" y="30" font-size="23" font-family="sans-serif" fill="#f4e7d5">${proposition.base}</text><text x="20" y="62" font-size="20" font-family="sans-serif" fill="#f4e7d5">${entree.licence} · réserve</text></svg>`)
  cases.push({ input: photo, left: indice * 600, top: 0 }, { input: etiquette, left: indice * 600, top: 700 })
}
await sharp({ create: { width: 2400, height: 780, channels: 3, background: '#201c18' } }).composite(cases).jpeg({ quality: 92 }).toFile(path.join(preuves, 'planche.jpg'))
console.log(`Préparation : ${bases.size} bases en réserve, dimensions réelles renseignées, proposition.json et planche.jpg produits. Vérificateur officiel à lancer par Claude Code.`)
