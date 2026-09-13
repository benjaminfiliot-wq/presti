// scripts/orchestre-autotest.mjs — les deux vérificateurs des tâches témoins du système .orchestre/
// (prompt v15 §1.0) : `pass` prouve qu'un PASS remonte dans le digest, `echec` prouve qu'un FAIL
// remonte AVEC la bonne ligne. Sans ces deux lignes dans digest.md, on n'a pas un système, on a un dossier.
//
// Usage : node scripts/orchestre-autotest.mjs pass | echec
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2]

if (mode === 'pass') {
  const fichier = path.join(RACINE, '.orchestre', 'preuves', '000-test', 'bonjour.txt')
  if (!fs.existsSync(fichier)) { console.log('ÉCHEC : .orchestre/preuves/000-test/bonjour.txt absent'); process.exit(1) }
  const contenu = fs.readFileSync(fichier, 'utf8').trim()
  if (contenu !== 'bonjour') { console.log(`ÉCHEC : bonjour.txt contient « ${contenu.slice(0, 40)} », attendu « bonjour »`); process.exit(1) }
  console.log('✓ bonjour.txt présent et conforme')
  process.exit(0)
}
if (mode === 'echec') {
  console.log('ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest.md')
  process.exit(1)
}
console.log('usage : node scripts/orchestre-autotest.mjs pass | echec')
process.exit(2)
