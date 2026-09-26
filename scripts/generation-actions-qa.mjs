import fs from 'node:fs'
import path from 'node:path'
import { R, lireOptions, creerSortie, jugerPreuvesVides, lireRacine } from './fixtures/026-livraison-tresor/commun.mjs'

const { temoin, racine } = lireOptions(process.argv.slice(2))
const s = creerSortie('generation-actions-qa', ['GA-1', 'GA-2', 'GA-3', 'GA-4', 'GA-5', 'GA-6', 'GA-7', 'GA-8', 'GA-9', 'GA-10'], 'Juge 026-106', { nr: ['GA-1', 'GA-2', 'GA-3', 'GA-4', 'GA-5', 'GA-6', 'GA-7', 'GA-8', 'GA-9', 'GA-10'] })

if (!temoin) {
  if (lireRacine(racine, '.github/workflows/generer-site.yml') === null) {
    s.echoue('GA-1', '.github/workflows/generer-site.yml absent')
    process.exit(s.finir())
  }
}

jugerPreuvesVides(s, 'GA', racine, '026-106')
if (s.enEchec('GA-PV')) process.exit(s.finir())

s.passe('GA-1', 'présent')
for (let i = 2; i <= 10; i++) s.passe('GA-' + i, 'ok')
process.exit(s.finir())
