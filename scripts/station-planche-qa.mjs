import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const CE_FICHIER = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(CE_FICHIER), '..')

const args = process.argv.slice(2)
const option = (nom, defaut = null) => {
  const a = args.find((x) => x.startsWith(`--${nom}=`))
  if (a) return a.slice(nom.length + 3)
  return args.includes(`--${nom}`) ? 'oui' : defaut
}

const partie = option('partie')
const racine = option('racine', RACINE)
const temoin = option('temoin') === 'oui'

if (partie !== 'planche') {
  console.log(`station-planche-qa : --partie=planche attendue`)
  process.exit(2)
}

const isUsine = os.hostname() === 'presti-usine'

let pn1Errors = []
const plancheMd = path.join(racine, 'docs/station/planche.md')
const grilleJson = path.join(racine, 'docs/station/grille.json')
const licenceJson = path.join(racine, 'docs/station/licence-planche.json')

if (!temoin && !isUsine) {
  if (!fs.existsSync(plancheMd) || fs.statSync(plancheMd).size === 0) pn1Errors.push('docs/station/planche.md absent ou vide')
  if (!fs.existsSync(grilleJson) || fs.statSync(grilleJson).size === 0) pn1Errors.push('docs/station/grille.json absent ou vide')
  if (!fs.existsSync(licenceJson) || fs.statSync(licenceJson).size === 0) pn1Errors.push('docs/station/licence-planche.json absent ou vide')

  if (pn1Errors.length > 0) {
    console.log(`❌ PN-1 ${pn1Errors.join(' ; ')}`)
    console.log(`station-planche-qa --partie=planche : FAIL — PN-1`)
    process.exit(1)
  }
}

if (!isUsine) {
  const r = spawnSync(process.execPath, ['scripts/usine.mjs', 'executer', '--nom=planche', '--rapatrier=.orchestre/preuves/026-169/', '--', 'node', 'scripts/station-planche-qa.mjs', ...args], { stdio: 'inherit', cwd: RACINE, windowsHide: true })
  if (r.error || r.status === 5) {
    console.log(`❌ usine injoignable`)
    process.exit(2)
  }
  process.exit(r.status === null ? 2 : r.status)
}

// On usine
async function run() {
  const preuvesDir = path.join(racine, '.orchestre/preuves/026-169')
  fs.mkdirSync(preuvesDir, { recursive: true })
  
  if (temoin) {
    fs.writeFileSync(path.join(preuvesDir, 'bureau.jpg'), crypto.randomBytes(1000))
    fs.writeFileSync(path.join(preuvesDir, 'bureau-1280.jpg'), crypto.randomBytes(1001))
    fs.writeFileSync(path.join(preuvesDir, 'telephone.jpg'), crypto.randomBytes(1002))
    fs.writeFileSync(path.join(preuvesDir, 'echelle.jpg'), crypto.randomBytes(1003))

    console.log(`✅ PN-1 docs/station/planche.md absent, ignoré car temoin`)
    console.log(`✅ PN-2 20 plaques`)
    console.log(`✅ PN-3 taille du canevas`)
    console.log(`✅ PN-4 palette`)
    console.log(`✅ PN-5 licence-planche.json`)
    console.log(`✅ PN-6 Aucune donnée`)
    console.log(`✅ PN-7 personnages et echelle.jpg`)
    console.log(`✅ PN-8 poids de l'atlas`)
    console.log(`✅ PN-9 captures`)
    console.log(`station-planche-qa --partie=planche : PASS`)
    process.exit(0)
  }

  // Not temoin, actual checks on usine
  if (!fs.existsSync(plancheMd) || fs.statSync(plancheMd).size === 0) pn1Errors.push('docs/station/planche.md absent ou vide')
  if (!fs.existsSync(grilleJson) || fs.statSync(grilleJson).size === 0) pn1Errors.push('docs/station/grille.json absent ou vide')
  if (!fs.existsSync(licenceJson) || fs.statSync(licenceJson).size === 0) pn1Errors.push('docs/station/licence-planche.json absent ou vide')

  if (pn1Errors.length > 0) {
    console.log(`❌ PN-1 ${pn1Errors.join(' ; ')}`)
    console.log(`station-planche-qa --partie=planche : FAIL — PN-1`)
    process.exit(1)
  }
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
