// scripts/fixtures/026-pilotage/e/fabriquer-jeux.mjs — écrit les jeux JSON du lot e (fiche 026-172) à partir de jeux.mjs : `node scripts/fixtures/026-pilotage/e/fabriquer-jeux.mjs`.
// Le contrôle JA-3 du lot relit chaque fichier et exige qu'il soit identique à ce que `fabriquer()` rend aujourd'hui.
import fs from 'node:fs'
import path from 'node:path'
import { E } from './commun.mjs'
import { fabriquer } from './jeux.mjs'

for (const [nom, contenu] of Object.entries(fabriquer())) fs.writeFileSync(path.join(E, nom), `${JSON.stringify(contenu, null, 1)}\n`)
console.log('jeux écrits dans', E)
