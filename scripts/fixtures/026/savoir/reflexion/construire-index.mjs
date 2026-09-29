#!/usr/bin/env node
// scripts/fixtures/026/savoir/reflexion/construire-index.mjs — reconstruit l'index d'essai de savoir-reflexion-qa (026-238).
//
// Le juge ne lance JAMAIS ce script : il copie l'instantané déjà construit (essai/.orchestre/travail/savoir/{general,index}).
// Ce script sert à le refaire à la main si le contrat de l'index du socle (026-229) change : il écrit le corpus ci-dessous
// comme le fait le socle (<racine-travail>/general/courant/ : manifeste.json + fichiers/<racine>/<chemin>), lance
// l'indexeur du témoin du socle, et recopie general/ et index/general/ sous essai/.orchestre/travail/savoir/.
//   node scripts/fixtures/026/savoir/reflexion/construire-index.mjs
//
// Le corpus est fait pour que le premier résultat de chaque question soit sans ambiguïté (un jeton rare par question) :
//   « SVL-10 099-26 » → revue-hebdo-essai.md ; « SVB-5 099-24 » → chef-essai.md ; « AP-1 099-22 » → agents-essai.md.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..', '..', '..', '..')
const SOCLE = path.join(ICI, '..', 'socle', 'temoin')
const CIBLE = path.join(ICI, 'essai', '.orchestre', 'travail', 'savoir')
const EXPORTE_LE = '2026-09-28T06:00:00.000Z'

const DOCUMENTS = [
  { racine: 'presti', chemin: 'docs/agents/revue-hebdo-essai.md', classe: 'public', lignes: [
    '# La revue du lundi (essai)', '',
    "Le critère SVL-10 vérifie l'étape Leçons de la revue : la fiche 099-26 l'avait oubliée.",
    'Sans cette étape, la revue du lundi ne passe pas le juge des consignes.'] },
  { racine: 'presti', chemin: 'docs/agents/chef-essai.md', classe: 'public', lignes: [
    '# Le chef (essai)', '',
    'Le critère SVB-5 veut un environnement réduit pour le modèle : la fiche 099-24 montrait ses variables.'] },
  { racine: 'ops', chemin: 'veille/agents-essai.md', classe: 'public', lignes: [
    '# Les agents (essai)', '',
    "Le sabotage AP-1 reste invisible quand un exécutant oublie de le relever : c'est la fiche 099-22."] },
  { racine: 'saas', chemin: 'Produit/relances-essai.md', classe: 'public', lignes: [
    '# Relances (essai)', '',
    'Un devis dormant se relance au troisième jour, avec courtoisie.'] },
]

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const tmp = fs.mkdtempSync(path.join(DEPOT, '.orchestre', 'travail', 'construire-index-'))
try {
  const rt = path.join(tmp, 'travail', 'savoir')
  const courant = path.join(rt, 'general', 'courant')
  const fichiers = DOCUMENTS.map((d) => {
    const b = Buffer.from(`${d.lignes.join('\n')}\n`)
    const f = path.join(courant, 'fichiers', d.racine, ...d.chemin.split('/'))
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, b)
    return { racine: d.racine, chemin: d.chemin, classe: d.classe, sha256: sha(b), octets: b.length, caviardages: 0, reclasse: false }
  })
  fs.writeFileSync(path.join(courant, 'manifeste.json'), JSON.stringify({ version: 1, compartiment: 'general', exporte_le: EXPORTE_LE, fichiers, non_lus: [], prospects_compte: 0 }, null, 2))
  fs.writeFileSync(path.join(rt, 'a-indexer'), JSON.stringify({ recu_le: EXPORTE_LE }))
  for (const [de, vers] of [[path.join(SOCLE, 'lib', 'savoir', 'index.ts'), 'lib/savoir/index.ts'], [path.join(SOCLE, 'scripts', 'savoir', 'indexer.mjs'), 'scripts/savoir/indexer.mjs'], [path.join(DEPOT, 'scripts', 'ts-loader.mjs'), 'scripts/ts-loader.mjs']]) {
    const c = path.join(tmp, ...vers.split('/'))
    fs.mkdirSync(path.dirname(c), { recursive: true })
    fs.copyFileSync(de, c)
  }
  const reglages = path.join(tmp, 'reglages.json')
  fs.copyFileSync(path.join(DEPOT, 'docs', 'savoir', 'reglages.json'), reglages)
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--import', new URL(`file:///${path.join(tmp, 'scripts', 'ts-loader.mjs').replace(/\\/g, '/')}`).href, path.join(tmp, 'scripts', 'savoir', 'indexer.mjs'), '--compartiment=tous', `--racine-travail=${rt}`, `--reglages=${reglages}`], { cwd: tmp, encoding: 'utf8' })
  process.stdout.write(r.stdout)
  process.stderr.write(r.stderr)
  if (r.status !== 0) throw new Error(`indexeur : code ${r.status}`)
  for (const d of ['general', path.join('index', 'general')]) {
    fs.rmSync(path.join(CIBLE, d), { recursive: true, force: true })
    fs.cpSync(path.join(rt, d), path.join(CIBLE, d), { recursive: true })
  }
  console.log(`✓ instantané écrit sous ${path.relative(DEPOT, CIBLE)}`)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
