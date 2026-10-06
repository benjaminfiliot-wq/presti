#!/usr/bin/env node
// scripts/modele/kaggle-chef-leger.mjs — pousse les données et l'entraînement du modèle maison « presti-chef-leger » sur Kaggle, suit la session, rapatrie le GGUF.
//
// Le jeton Kaggle (format KGAT_…) est lu dans le coffre (../presti-secrets/kaggle api.txt, première ligne) et passé à la CLI `kaggle` par la variable
// KAGGLE_API_TOKEN, jamais en argument : il n'apparaît ni dans le dépôt, ni dans un journal, ni dans une sortie (toute suite KGAT_… est masquée par précaution).
// Prérequis : `pip install kaggle` (CLI 2.x). Tout est PRIVÉ (dataset et notebook).
//
// Usage :
//   node scripts/modele/kaggle-chef-leger.mjs --dataset                 juge des données (doit être vert), puis crée ou versionne le dataset privé
//   node scripts/modele/kaggle-chef-leger.mjs --pousser [--modele=1.5b|0.5b] [--epoques=3] [--sans-source-modele]
//                                                                       pousse le notebook (script) privé sur GPU T4 ; il lit le dataset
//   node scripts/modele/kaggle-chef-leger.mjs --etat [--modele=1.5b]    statut de la session
//   node scripts/modele/kaggle-chef-leger.mjs --recuperer [--modele=1.5b]   rapatrie les sorties (GGUF, Modelfile, journal) dans .orchestre/travail/…/sortie-<modele>/
//   node scripts/modele/kaggle-chef-leger.mjs --quota                   heures de GPU restantes cette semaine
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { RACINE } from '../chef/commun.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', 'modele-maison', 'chef-leger')
const COFFRE = path.resolve(RACINE, '..', 'presti-secrets', 'kaggle api.txt')
const UTILISATEUR = 'benjaminfiliot'
const DATASET = `${UTILISATEUR}/presti-chef-leger-donnees`
const MODELES = { '1.5b': 'Qwen/Qwen2.5-1.5B-Instruct', '0.5b': 'Qwen/Qwen2.5-0.5B-Instruct' }
const SOURCES_KAGGLE = { '1.5b': 'qwen-lm/qwen2.5/transformers/1.5b-instruct/1', '0.5b': 'qwen-lm/qwen2.5/transformers/0.5b-instruct/1' }

const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`)); return a === undefined ? defaut : (a.includes('=') ? a.slice(nom.length + 3) : true) }
const masquer = (s) => String(s ?? '').replace(/KGAT_[A-Za-z0-9_-]+/g, 'KGAT_***')

function jeton() {
  const j = fs.readFileSync(COFFRE, 'utf8').split(/\r?\n/)[0].trim()
  if (!/^KGAT_[A-Za-z0-9]{8,}$/.test(j)) throw new Error(`première ligne du coffre ${path.basename(COFFRE)} : jeton KGAT_… attendu`)
  return j
}
/** La CLI kaggle, jeton par l'environnement. Rend { code, sortie } (sortie masquée). */
function kaggle(args) {
  const r = spawnSync('kaggle', args, { encoding: 'utf8', env: { ...process.env, KAGGLE_API_TOKEN: jeton(), PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60_000 })
  return { code: r.status ?? 1, sortie: masquer(`${r.stdout || ''}${r.stderr || ''}${r.error ? r.error.message : ''}`).trim() }
}

const modele = String(arg('modele', '1.5b'))
if (!MODELES[modele]) { console.error(`✗ --modele=${modele} : 1.5b ou 0.5b`); process.exit(2) }
const NOYAU = `${UTILISATEUR}/presti-chef-leger-${modele.replace('.', '-')}`

if (arg('quota', false)) {
  const r = kaggle(['quota']); console.log(r.sortie); process.exitCode = r.code
} else if (arg('dataset', false)) {
  const juge = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'modele-donnees-qa.mjs')], { encoding: 'utf8' })
  if (juge.status !== 0) { console.error(`✗ le juge des données est rouge : rien n'est poussé\n${juge.stdout.split('\n').filter((l) => l.startsWith('❌')).join('\n')}`); process.exit(1) }
  const dossier = path.join(TRAVAIL, 'kaggle-dataset')
  fs.mkdirSync(dossier, { recursive: true })
  fs.copyFileSync(path.join(TRAVAIL, 'donnees.jsonl'), path.join(dossier, 'donnees.jsonl'))
  fs.writeFileSync(path.join(dossier, 'dataset-metadata.json'), JSON.stringify({ title: 'presti-chef-leger-donnees', id: DATASET, licenses: [{ name: 'other' }], isPrivate: true }, null, 2))
  const existe = kaggle(['datasets', 'status', DATASET])
  const r = existe.code === 0 && !/not found|404/i.test(existe.sortie)
    ? kaggle(['datasets', 'version', '-p', dossier, '-m', `donnees du ${new Date().toISOString().slice(0, 16)}`])
    : kaggle(['datasets', 'create', '-p', dossier])
  console.log(r.sortie); process.exitCode = r.code
} else if (arg('pousser', false)) {
  const dossier = path.join(TRAVAIL, `kaggle-noyau-${modele}`)
  fs.mkdirSync(dossier, { recursive: true })
  const epoques = Number(arg('epoques', 3))
  const script = fs.readFileSync(path.join(ICI, 'kaggle', 'chef-leger-entrainement.py'), 'utf8')
    .replace(/^MODELE = .*$/m, `MODELE = "${MODELES[modele]}"`).replace(/^SUFFIXE = .*$/m, `SUFFIXE = "${modele}"`).replace(/^EPOQUES = .*$/m, `EPOQUES = ${epoques}`)
  fs.writeFileSync(path.join(dossier, 'entrainement.py'), script)
  const meta = {
    id: NOYAU, title: `presti-chef-leger-${modele.replace('.', '-')}`, code_file: 'entrainement.py', language: 'python', kernel_type: 'script', is_private: true,
    enable_gpu: true, enable_internet: true, machine_shape: 'NvidiaTeslaT4', dataset_sources: [DATASET], competition_sources: [], kernel_sources: [],
    model_sources: arg('sans-source-modele', false) ? [] : [SOURCES_KAGGLE[modele]],
  }
  fs.writeFileSync(path.join(dossier, 'kernel-metadata.json'), JSON.stringify(meta, null, 2))
  const r = kaggle(['kernels', 'push', '-p', dossier, '--accelerator', 'NvidiaTeslaT4'])
  console.log(r.sortie); process.exitCode = r.code
} else if (arg('etat', false)) {
  const r = kaggle(['kernels', 'status', NOYAU]); console.log(r.sortie); process.exitCode = r.code
} else if (arg('recuperer', false)) {
  const dossier = path.join(TRAVAIL, `sortie-${modele}`)
  fs.mkdirSync(dossier, { recursive: true })
  const r = kaggle(['kernels', 'output', NOYAU, '-p', dossier, '-o'])
  console.log(r.sortie.split('\n').slice(-5).join('\n'))
  const j = path.join(dossier, 'journal.jsonl')
  if (fs.existsSync(j)) console.log(fs.readFileSync(j, 'utf8').trim().split('\n').map((l) => l.slice(0, 400)).join('\n'))
  else {
    // sans journal.jsonl, la session s'est arrêtée avant l'étape 0 : le journal brut de Kaggle dit pourquoi
    const brut = fs.readdirSync(dossier).find((f) => f.endsWith('.log'))
    if (brut) { try { console.log(JSON.parse(fs.readFileSync(path.join(dossier, brut), 'utf8')).map((e) => e.data).join('').slice(-3000)) } catch { console.log(fs.readFileSync(path.join(dossier, brut), 'utf8').slice(-3000)) } }
  }
  process.exitCode = r.code
} else {
  console.error('usage : --dataset | --pousser [--modele=1.5b|0.5b] | --etat | --recuperer | --quota')
  process.exitCode = 2
}
