// Titres de sections seulement (aucun texte), pour classer deux fichiers sans lire leur contenu.
import fs from 'node:fs'
const I = JSON.parse(fs.readFileSync('C:/Users/benja/Documents/cerveau/data/index.json', 'utf8'))
for (const f of ['vault/Prospection/Email-artisans-2026-09-15.md', 'vault/Prospection/Messages-influenceurs-2026-10-27.md']) {
  const ch = I.chunks.filter((c) => c.f === f)
  console.log(f, '→', ch.length, 'morceaux ; type :', ch[0]?.ty || '-', '; titres :', [...new Set(ch.map((c) => (c.t || '').slice(0, 60)))].slice(0, 6))
}
console.log('construit :', I.construit)
