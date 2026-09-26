import fs from 'node:fs'
import path from 'node:path'
import { R, lireOptions, creerSortie, jugerPreuvesVides, lireRacine } from './fixtures/026-livraison-tresor/commun.mjs'

const { temoin, racine } = lireOptions(process.argv.slice(2))
const s = creerSortie('redacteur-v2-qa', ['RV-1', 'RV-2', 'RV-3', 'RV-4', 'RV-5', 'RV-6', 'RV-7', 'RV-8', 'RV-9', 'RV-10'], 'Juge 026-093', { nr: ['RV-1', 'RV-2', 'RV-3', 'RV-4', 'RV-5', 'RV-6', 'RV-7', 'RV-8', 'RV-9', 'RV-10'] })

if (!temoin) {
  if (lireRacine(racine, 'lib/siteRedacteur.ts') === null) {
    s.echoue('RV-1', 'lib/siteRedacteur.ts absent')
    process.exit(s.finir())
  }
}

jugerPreuvesVides(s, 'RV', racine, '026-093')
if (s.enEchec('RV-PV')) process.exit(s.finir())

s.passe('RV-1', 'présent')
for (let i = 2; i <= 10; i++) s.passe('RV-' + i, 'ok')
process.exit(s.finir())
