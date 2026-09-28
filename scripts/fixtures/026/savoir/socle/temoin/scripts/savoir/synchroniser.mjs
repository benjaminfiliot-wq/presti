#!/usr/bin/env node
// TÉMOIN (026-229) de scripts/savoir/synchroniser.mjs (la tâche Windows « Presti savoir », toutes les deux heures) :
// exporte vers <racine ops>/savoir/export (sous l'exclusion ops:savoir/**, jamais relu), puis envoie sous l'interrupteur.
//
//   node scripts/savoir/synchroniser.mjs [--sources=<sources.json>] [--reglages=<reglages.json>] [--a-sec]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Arret, exporter, lireContrat } from './exporter.mjs'
import { envoyer } from './envoyer.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..')

function options(argv) {
  const o = { sources: path.join(DEPOT, 'docs', 'savoir', 'sources.json'), reglages: path.join(DEPOT, 'docs', 'savoir', 'reglages.json'), aSec: false }
  for (const a of argv) {
    if (a === '--a-sec') o.aSec = true
    else if (a.startsWith('--sources=') && a.length > 10) o.sources = path.resolve(a.slice(10))
    else if (a.startsWith('--reglages=') && a.length > 11) o.reglages = path.resolve(a.slice(11))
    else throw new Arret(2, `argument inconnu : ${a}`)
  }
  return o
}
try {
  const o = options(process.argv.slice(2))
  const ops = lireContrat(o.sources).racines.find((r) => r.nom === 'ops')
  if (!ops || !fs.existsSync(ops.chemin)) throw new Arret(1, 'racine ops introuvable : la sortie de l’export vit sous <ops>/savoir/export')
  const sortie = path.join(ops.chemin, 'savoir', 'export')
  const e = exporter({ sources: o.sources, sortie, aSec: o.aSec })
  console.log(e.message)
  if (o.aSec) { process.exitCode = 0 } else {
    const r = envoyer({ exportDir: sortie, reglages: o.reglages })
    console.log(r.message)
    process.exitCode = r.code
  }
} catch (e) {
  console.error(`✗ synchronisation : ${e.message}`)
  process.exitCode = e instanceof Arret ? e.code : 1
}
