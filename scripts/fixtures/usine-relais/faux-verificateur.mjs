#!/usr/bin/env node
// Doublure du vérificateur pour scripts/usine-relais-qa.mjs : le banc la copie en <arbre>/scripts/orchestre.mjs d'une tâche
// JETABLE (dossier temporaire), là où `usine.mjs tourner` lance `node scripts/orchestre.mjs verifier <id>`. Le vrai
// scripts/orchestre.mjs du dépôt n'est jamais touché.
// BANC_VERDICTS : la suite des verdicts rendus, un par appel (« FAIL,PASS » : rouge au 1er appel, vert ensuite ; le dernier
// se répète). Chaque appel est noté dans BANC_JOURNAL.
import fs from 'node:fs'

const [commande, id] = process.argv.slice(2)
const journal = process.env.BANC_JOURNAL
const avant = journal && fs.existsSync(journal)
  ? fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.qui === 'verificateur').length
  : 0
const suite = (process.env.BANC_VERDICTS || 'PASS').split(',').map((s) => s.trim().toUpperCase())
const verdict = suite[Math.min(avant, suite.length - 1)]
if (journal) fs.appendFileSync(journal, JSON.stringify({ qui: 'verificateur', t: Date.now(), commande, id, verdict, rang: avant + 1 }) + '\n')
if (commande !== 'verifier') { console.error(`doublure : commande ${commande} inconnue`); process.exit(2) }
if (verdict === 'PASS') {
  console.log(`${id} : PASS — critères BANC-1 à BANC-3 tenus (doublure)`)
  process.exit(0)
}
console.log(`critère BANC-2 : la ligne « total » manque dans scripts/banc-relais.mjs`)
console.log(`${id} : FAIL — critère BANC-2 : la ligne « total » manque (doublure, appel ${avant + 1})`)
process.exit(1)
