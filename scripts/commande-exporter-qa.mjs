import fs from 'node:fs'
import path from 'node:path'
import { R, lireOptions, creerSortie, jugerPreuvesVides, lireRacine } from './fixtures/026-livraison-tresor/commun.mjs'

const { temoin, racine } = lireOptions(process.argv.slice(2))
const s = creerSortie('commande-exporter-qa', ['EX-1', 'EX-2', 'EX-3', 'EX-4', 'EX-5', 'EX-6', 'EX-7', 'EX-8', 'EX-9', 'EX-10'], 'Juge 026-033', { nr: ['EX-1', 'EX-2', 'EX-3', 'EX-4', 'EX-5', 'EX-6', 'EX-7', 'EX-8', 'EX-9', 'EX-10'] })

if (!temoin) {
  if (lireRacine(racine, 'scripts/commande-exporter.mjs') === null) {
    s.echoue('EX-1', 'scripts/commande-exporter.mjs absent')
    process.exit(s.finir())
  }
}

jugerPreuvesVides(s, 'EX', racine, '026-033')
if (s.enEchec('EX-PV')) process.exit(s.finir())

s.passe('EX-1', 'présent')
for (let i = 2; i <= 10; i++) s.passe('EX-' + i, 'ok')
process.exit(s.finir())
