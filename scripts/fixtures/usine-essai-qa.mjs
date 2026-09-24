// scripts/fixtures/usine-essai-qa.mjs — le juge des fiches d'essai du pont PC ↔ usine (000-usine-essai, 24/09/2026).
// Exige scripts/fixtures/<dossier>/bonjour.txt contenant exactement « bonjour depuis l'usine » (apostrophe droite, sans
// BOM ; une seule fin de ligne finale tolérée, \n ou \r\n : sur le PC Windows, Git peut la convertir), et rien d'autre dans
// le dossier. Un fichier de 0 octet est un échec : une preuve vide est un mensonge.
// Usage : node scripts/fixtures/usine-essai-qa.mjs [dossier]   (par défaut usine-essai ; un second essai prend usine-essai-2)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const NOM = process.argv[2] || 'usine-essai'
if (!/^usine-essai(-\d+)?$/.test(NOM)) { console.log(`ÉCHEC dossier refusé : ${NOM} (usine-essai ou usine-essai-N)`); process.exit(1) }
const DOSSIER = path.join(RACINE, 'scripts', 'fixtures', NOM)
const FICHIER = path.join(DOSSIER, 'bonjour.txt')
const REL = `scripts/fixtures/${NOM}/bonjour.txt`
const ATTENDU = "bonjour depuis l'usine"
const echecs = []
let octets = 0

if (!fs.existsSync(FICHIER)) echecs.push(`${REL} absent`)
else {
  const brut = fs.readFileSync(FICHIER)
  octets = brut.length
  if (!octets) echecs.push('bonjour.txt fait 0 octet')
  const texte = brut.toString('utf8')
  if (texte.replace(/\r?\n$/, '') !== ATTENDU) echecs.push(`contenu inattendu : ${JSON.stringify(texte.slice(0, 80))} (attendu ${JSON.stringify(ATTENDU)})`)
}
const autres = fs.existsSync(DOSSIER) ? fs.readdirSync(DOSSIER).filter((f) => f !== 'bonjour.txt') : []
if (autres.length) echecs.push(`fichier(s) en trop dans scripts/fixtures/${NOM}/ : ${autres.join(', ')}`)

for (const e of echecs) console.log(`ÉCHEC ${e}`)
if (echecs.length) process.exit(1)
console.log(`✓ ${REL} : « ${ATTENDU} » (${octets} octets), seul fichier du dossier`)
