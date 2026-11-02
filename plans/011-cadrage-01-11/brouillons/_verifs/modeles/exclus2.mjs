// Chemins (seulement) des fichiers du vault écartés hors de Prospection/.
import fs from 'node:fs'
const I = JSON.parse(fs.readFileSync('C:/Users/benja/Documents/cerveau/data/index.json', 'utf8'))
for (const e of (I.exclus || [])) {
  const c = e.chemin || e.f || ''
  if (/^vault\//.test(c) && !/^vault\/Prospection\//.test(c)) console.log(e.raison, '|', c)
}
