#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const script = path.dirname(fileURLToPath(import.meta.url))
const option = (nom, defaut) => process.argv.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3) || defaut
const sources = option('sources', path.join(depot, 'docs/savoir/sources.json'))
const reglages = option('reglages', path.join(depot, 'docs/savoir/reglages.json'))
const contrat = JSON.parse(fs.readFileSync(sources, 'utf8'))
const sortie = path.join(contrat.racines.ops, 'savoir/export')
const lancer = (fichier, args) => spawnSync(process.execPath, [path.join(script, fichier), ...args], { stdio: 'inherit', shell: false, windowsHide: true }).status ?? 1
const code_export = lancer('exporter.mjs', [`--sources=${sources}`, `--sortie=${sortie}`])
const code_envoi = code_export === 0 ? lancer('envoyer.mjs', [`--export=${sortie}`, `--reglages=${reglages}`]) : null
let general = 0, prospects = 0, octets = 0
if (code_export === 0) {
  try {
    const rapport = JSON.parse(fs.readFileSync(path.join(sortie, 'rapport.json'), 'utf8'))
    general = rapport.compteurs.general; prospects = rapport.compteurs.prospects
    for (const c of ['general', 'prospects']) {
      const manifeste = JSON.parse(fs.readFileSync(path.join(sortie, c, 'manifeste.json'), 'utf8'))
      octets += manifeste.fichiers.reduce((n, f) => n + f.octets, 0)
    }
  } catch { /* compteurs indisponibles */ }
}
const journal = path.join(depot, '.orchestre/travail/savoir/synchro.jsonl')
fs.mkdirSync(path.dirname(journal), { recursive: true })
fs.appendFileSync(journal, `${JSON.stringify({ le: new Date().toISOString(), code_export, code_envoi, general, prospects, octets })}\n`)
process.exitCode = code_export || code_envoi || 0
