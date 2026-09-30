#!/usr/bin/env node
// test/fixtures-026/faux-codex.mjs — faux Codex pour le groupe « quota » de test/preuve-026.mjs (026-098).
// N'appelle jamais le vrai binaire. Désigné par la variable d'environnement ORCHESTRE_CODEX_BIN (que la future
// scripts/executant.mjs doit préférer à binaireCodex() quand elle est posée — fiche 08).
//
// Chaque appel écrit une ligne dans FAUX_CODEX_TEMOIN (si posée) : c'est la preuve qu'il a été lancé. ORQ-5 se
// mesure sur l'ABSENCE de cette ligne (le quota doit empêcher le lancement, pas seulement l'ignorer après coup).
//
// FAUX_CODEX_MODE choisit la réponse :
//   quota            → le message exact vu le 14/09/2026 (avec date lisible, ici projetée au 30/09/2099)
//   quota-sans-date  → un message de quota SANS date lisible (jusqua doit alors valoir vu + 6 h, ORQ-7)
//   (autre / absent) → une réponse normale, code 0
import fs from 'node:fs'
import path from 'node:path'

const temoin = process.env.FAUX_CODEX_TEMOIN
if (temoin) {
  try {
    fs.mkdirSync(path.dirname(temoin), { recursive: true })
    fs.appendFileSync(temoin, `${new Date().toISOString()} ${process.argv.slice(2).join(' ')}\n`)
  } catch { /* le témoin ne doit jamais faire planter le faux Codex */ }
}

const mode = process.env.FAUX_CODEX_MODE || 'normal'
if (mode === 'quota') {
  process.stdout.write("You've hit your usage limit. Upgrade or try again at Sep 30th, 2099 2:17 AM.\n")
  process.exit(1)
} else if (mode === 'quota-sans-date') {
  process.stdout.write("You've hit your usage limit. Upgrade to continue using Codex.\n")
  process.exit(1)
} else {
  process.stdout.write('OK — faux Codex, réponse normale.\n')
  process.exit(0)
}
