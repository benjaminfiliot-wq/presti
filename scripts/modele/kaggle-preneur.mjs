#!/usr/bin/env node
// scripts/modele/kaggle-preneur.mjs — pousse les données et l'entraînement du modèle maison « presti-preneur » sur Kaggle, suit la session, rapatrie les sorties.
// Copie de kaggle-chef-leger.mjs (docs/agents/modele-maison-chef-leger.md) : dataset presti-preneur-donnees, noyau presti-preneur-1-5b, tous deux PRIVÉS.
//
// Le jeton Kaggle (KGAT_…) est lu dans le coffre (../presti-secrets/kaggle api.txt, première ligne, BOM retiré) et passé à la CLI `kaggle` par la variable
// KAGGLE_API_TOKEN, jamais en argument : il n'apparaît ni dans le dépôt, ni dans un journal, ni dans une sortie (toute suite KGAT_… est masquée).
// Kaggle gratuit seulement : GPU T4, 30 h par semaine (--quota) ; rien n'est payé.
//
// Usage :
//   node scripts/modele/kaggle-preneur.mjs --dataset       juge des données (doit être vert), puis crée ou versionne le dataset privé
//   node scripts/modele/kaggle-preneur.mjs --pousser [--epoques=3] [--sans-source-modele]   pousse le noyau (script) privé sur GPU T4
//   node scripts/modele/kaggle-preneur.mjs --etat          statut de la session
//   node scripts/modele/kaggle-preneur.mjs --recuperer     rapatrie les sorties (adaptateur, GGUF s'il existe, Modelfile, journal) dans .orchestre/travail/…/sortie-1.5b/
//   node scripts/modele/kaggle-preneur.mjs --quota         heures de GPU restantes cette semaine
//   node scripts/modele/kaggle-preneur.mjs --maitre-dataset | --maitre-pousser | --maitre-etat | --maitre-recuperer
//                                                          le maître de la distillation sur Kaggle (vLLM, Qwen3 AWQ), entrées de donnees-preneur.mjs --exporter-maitre
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { RACINE } from '../chef/commun.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', 'modele-maison', 'preneur')
const COFFRE = path.resolve(RACINE, '..', 'presti-secrets', 'kaggle api.txt')
const UTILISATEUR = 'benjaminfiliot'
const DATASET = `${UTILISATEUR}/presti-preneur-donnees`
const MODELE = 'Qwen/Qwen2.5-1.5B-Instruct'
const SOURCE_KAGGLE = 'qwen-lm/qwen2.5/transformers/1.5b-instruct/1'
const NOYAU = `${UTILISATEUR}/presti-preneur-1-5b`
// le maître de la distillation sur Kaggle (kaggle/preneur-maitre.py), quand les maîtres gratuits en ligne sont à bout
const DATASET_MAITRE = `${UTILISATEUR}/presti-preneur-maitre-entrees`
const NOYAU_MAITRE = `${UTILISATEUR}/presti-preneur-maitre`

const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`)); return a === undefined ? defaut : (a.includes('=') ? a.slice(nom.length + 3) : true) }
const masquer = (s) => String(s ?? '').replace(/KGAT_[A-Za-z0-9_-]+/g, 'KGAT_***')

function jeton() {
  const j = fs.readFileSync(COFFRE, 'utf8').replace(/^﻿/, '').split(/\r?\n/)[0].trim()
  if (!/^KGAT_[A-Za-z0-9]{8,}$/.test(j)) throw new Error(`première ligne du coffre ${path.basename(COFFRE)} : jeton KGAT_… attendu`)
  return j
}
/** La CLI kaggle, jeton par l'environnement. Rend { code, sortie } (sortie masquée). */
function kaggle(args) {
  const r = spawnSync('kaggle', args, { encoding: 'utf8', env: { ...process.env, KAGGLE_API_TOKEN: jeton(), PYTHONIOENCODING: 'utf-8' }, maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60_000 })
  return { code: r.status ?? 1, sortie: masquer(`${r.stdout || ''}${r.stderr || ''}${r.error ? r.error.message : ''}`).trim() }
}

if (arg('quota', false)) {
  const r = kaggle(['quota']); console.log(r.sortie); process.exitCode = r.code
} else if (arg('dataset', false)) {
  const juge = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'modele-preneur-donnees-qa.mjs')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  if (juge.status !== 0) { console.error(`✗ le juge des données est rouge : rien n'est poussé\n${String(juge.stdout).split('\n').filter((l) => l.startsWith('❌')).join('\n')}`); process.exit(1) }
  const dossier = path.join(TRAVAIL, 'kaggle-dataset')
  fs.mkdirSync(dossier, { recursive: true })
  fs.copyFileSync(path.join(TRAVAIL, 'donnees.jsonl'), path.join(dossier, 'donnees.jsonl'))
  fs.writeFileSync(path.join(dossier, 'dataset-metadata.json'), JSON.stringify({ title: 'presti-preneur-donnees', id: DATASET, licenses: [{ name: 'other' }], isPrivate: true }, null, 2))
  const existe = kaggle(['datasets', 'status', DATASET])
  const r = existe.code === 0 && !/not found|404/i.test(existe.sortie)
    ? kaggle(['datasets', 'version', '-p', dossier, '-m', `donnees du ${new Date().toISOString().slice(0, 16)}`])
    : kaggle(['datasets', 'create', '-p', dossier])
  console.log(r.sortie); process.exitCode = r.code
} else if (arg('pousser', false)) {
  const dossier = path.join(TRAVAIL, 'kaggle-noyau-1.5b')
  fs.mkdirSync(dossier, { recursive: true })
  const epoques = Number(arg('epoques', 3))
  const script = fs.readFileSync(path.join(ICI, 'kaggle', 'preneur-entrainement.py'), 'utf8')
    .replace(/^MODELE = .*$/m, `MODELE = "${MODELE}"`).replace(/^SUFFIXE = .*$/m, 'SUFFIXE = "1.5b"').replace(/^EPOQUES = .*$/m, `EPOQUES = ${epoques}`)
  fs.writeFileSync(path.join(dossier, 'entrainement.py'), script)
  const meta = {
    id: NOYAU, title: 'presti-preneur-1-5b', code_file: 'entrainement.py', language: 'python', kernel_type: 'script', is_private: true,
    enable_gpu: true, enable_internet: true, machine_shape: 'NvidiaTeslaT4', dataset_sources: [DATASET], competition_sources: [], kernel_sources: [],
    model_sources: arg('sans-source-modele', false) ? [] : [SOURCE_KAGGLE],
  }
  fs.writeFileSync(path.join(dossier, 'kernel-metadata.json'), JSON.stringify(meta, null, 2))
  const r = kaggle(['kernels', 'push', '-p', dossier, '--accelerator', 'NvidiaTeslaT4'])
  console.log(r.sortie); process.exitCode = r.code
} else if (arg('maitre-dataset', false)) {
  // les entrées du maître (donnees-preneur.mjs --exporter-maitre : déjà passées par la garde d'entrée), en dataset privé
  const dossier = path.join(TRAVAIL, 'maitre-kaggle', 'dataset')
  fs.writeFileSync(path.join(dossier, 'dataset-metadata.json'), JSON.stringify({ title: 'presti-preneur-maitre-entrees', id: DATASET_MAITRE, licenses: [{ name: 'other' }], isPrivate: true }, null, 2))
  const existe = kaggle(['datasets', 'status', DATASET_MAITRE])
  const r = existe.code === 0 && !/not found|404/i.test(existe.sortie)
    ? kaggle(['datasets', 'version', '-p', dossier, '-m', `entrees du ${new Date().toISOString().slice(0, 16)}`])
    : kaggle(['datasets', 'create', '-p', dossier])
  console.log(r.sortie); process.exitCode = r.code
} else if (arg('maitre-pousser', false)) {
  const dossier = path.join(TRAVAIL, 'maitre-kaggle', 'noyau')
  fs.mkdirSync(dossier, { recursive: true })
  fs.copyFileSync(path.join(ICI, 'kaggle', 'preneur-maitre.py'), path.join(dossier, 'maitre.py'))
  const meta = {
    id: NOYAU_MAITRE, title: 'presti-preneur-maitre', code_file: 'maitre.py', language: 'python', kernel_type: 'script', is_private: true,
    enable_gpu: true, enable_internet: true, machine_shape: 'NvidiaTeslaT4', dataset_sources: [DATASET_MAITRE], competition_sources: [], kernel_sources: [], model_sources: [],
  }
  fs.writeFileSync(path.join(dossier, 'kernel-metadata.json'), JSON.stringify(meta, null, 2))
  const r = kaggle(['kernels', 'push', '-p', dossier, '--accelerator', 'NvidiaTeslaT4'])
  console.log(r.sortie); process.exitCode = r.code
} else if (arg('maitre-etat', false)) {
  const r = kaggle(['kernels', 'status', NOYAU_MAITRE]); console.log(r.sortie); process.exitCode = r.code
} else if (arg('maitre-recuperer', false)) {
  const dossier = path.join(TRAVAIL, 'maitre-kaggle', 'sortie')
  fs.mkdirSync(dossier, { recursive: true })
  const r = kaggle(['kernels', 'output', NOYAU_MAITRE, '-p', dossier, '-o'])
  console.log(r.sortie.split('\n').slice(-3).join('\n'))
  const j = path.join(dossier, 'journal.jsonl')
  if (fs.existsSync(j)) console.log(fs.readFileSync(j, 'utf8').trim().split('\n').map((l) => l.slice(0, 600)).join('\n'))
  else { const brut = fs.readdirSync(dossier).find((f) => f.endsWith('.log')); if (brut) console.log(fs.readFileSync(path.join(dossier, brut), 'utf8').slice(-3000)) }
  process.exitCode = r.code
} else if (arg('etat', false)) {
  const r = kaggle(['kernels', 'status', NOYAU]); console.log(r.sortie); process.exitCode = r.code
} else if (arg('recuperer', false)) {
  const dossier = path.join(TRAVAIL, 'sortie-1.5b')
  fs.mkdirSync(dossier, { recursive: true })
  const r = kaggle(['kernels', 'output', NOYAU, '-p', dossier, '-o'])
  console.log(r.sortie.split('\n').slice(-5).join('\n'))
  const j = path.join(dossier, 'journal.jsonl')
  if (fs.existsSync(j)) console.log(fs.readFileSync(j, 'utf8').trim().split('\n').map((l) => l.slice(0, 400)).join('\n'))
  else {
    const brut = fs.readdirSync(dossier).find((f) => f.endsWith('.log'))
    if (brut) { try { console.log(JSON.parse(fs.readFileSync(path.join(dossier, brut), 'utf8')).map((e) => e.data).join('').slice(-3000)) } catch { console.log(fs.readFileSync(path.join(dossier, brut), 'utf8').slice(-3000)) } }
  }
  process.exitCode = r.code
} else {
  console.error('usage : --dataset | --pousser | --etat | --recuperer | --quota')
  process.exitCode = 2
}
