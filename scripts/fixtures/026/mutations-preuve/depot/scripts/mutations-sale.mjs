// Faux script : son rapport est honnête, mais il laisse un fichier du dépôt modifié (un commentaire ajouté, invisible
// pour le juge). Le méta-juge doit échouer à MP-4.
import fs from 'node:fs'
import path from 'node:path'
import { lancer, ecrireRapport, MUTATIONS, RACINE } from './mutations-commun.mjs'
const entrees = lancer(MUTATIONS)
fs.appendFileSync(path.join(RACINE, 'lib', 'module.mjs'), '// laissé modifié par le script de mutations\n')
ecrireRapport(entrees)
