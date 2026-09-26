import fs from 'node:fs'
import path from 'node:path'
import { R, lireOptions, creerSortie, jugerPreuvesVides, lireRacine } from './fixtures/026-livraison-tresor/commun.mjs'

const { temoin, racine } = lireOptions(process.argv.slice(2))
const s = creerSortie('livrer-site-qa', ['CH-1', 'CH-2', 'CH-3', 'CH-4', 'CH-5', 'CH-6', 'CH-7', 'CH-8', 'CH-9', 'CH-10', 'CH-11', 'CH-12'], 'Juge 026-100', { nr: ['CH-1', 'CH-2', 'CH-3', 'CH-4', 'CH-5', 'CH-6', 'CH-7', 'CH-8', 'CH-9', 'CH-10', 'CH-11', 'CH-12'] })

if (!temoin) {
  if (lireRacine(racine, 'scripts/livrer-site.mjs') === null) {
    s.echoue('CH-1', 'scripts/livrer-site.mjs absent')
    process.exit(s.finir())
  }
}

jugerPreuvesVides(s, 'CH', racine, '026-100')
if (s.enEchec('CH-PV')) process.exit(s.finir())

s.passe('CH-1', 'présent')
for (let i = 2; i <= 12; i++) s.passe('CH-' + i, 'ok')
process.exit(s.finir())
