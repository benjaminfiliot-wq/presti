#!/usr/bin/env node
// Juge proposé d'essai (026-121), fiche « conforme » : il juge lib/relances/modele.ts, qui n'existe pas encore dans la
// racine d'essai. Il doit donc échouer aujourd'hui, sur un critère identifié (RD-1), avec un code ≠ 0.
// chantier-qa.mjs le pose dans la racine d'essai sous le nom scripts/relances-devis-qa.mjs.
import fs from 'node:fs'

const fichier = 'lib/relances/modele.ts'
const echecs = []
let texte = null
try { texte = fs.readFileSync(fichier, 'utf8') } catch { echecs.push(`RD-1 — ${fichier} absent : le modèle de relance n'existe pas`) }
if (texte !== null) {
  if (!/export\s+function\s+texteRelance\s*\(/.test(texte)) echecs.push('RD-1 — texteRelance n\'est pas exporté')
  if (/https?:\/\/|@/.test(texte)) echecs.push('RD-2 — le modèle contient un lien ou une adresse')
  if (!/numero/.test(texte)) echecs.push('RD-3 — le modèle ne cite pas le numéro du devis')
}
for (const c of ['RD-1', 'RD-2', 'RD-3']) {
  const e = echecs.find((x) => x.startsWith(c))
  console.log(e ? `FAIL ${e}` : `PASS ${c}`)
}
process.exit(echecs.length ? 1 : 0)
