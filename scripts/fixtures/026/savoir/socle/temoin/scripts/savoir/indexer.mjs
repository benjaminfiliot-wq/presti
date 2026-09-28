#!/usr/bin/env node
// TÉMOIN (026-229) de scripts/savoir/indexer.mjs, jugé par SVS-10 : sur l'usine, sous le compte agents, lancé par
// presti-chef-savoir-index.path quand a-indexer paraît. Un index plein texte par compartiment, séparés ; des vecteurs
// pour general SEULEMENT, sous l'interrupteur `semantique`, vers un Ollama de la boucle locale et un modèle sans :cloud.
//
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir/indexer.mjs --compartiment=tous
//        [--racine-travail=/home/agents/travail/savoir] [--reglages=docs/savoir/reglages.json]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { construireIndex } from '../../lib/savoir/index.ts'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..')
const LOT = 16
const empreinte = (b) => crypto.createHash('sha256').update(b).digest('hex')

function ecrireAtomique(p, contenu) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(`${p}.part`, contenu)
  fs.renameSync(`${p}.part`, p)
}
/** « active » si allumée et sûre ; « refusee » si allumée vers un hôte ou un modèle interdits ; sinon « eteinte ». */
function semantique(reglages) {
  const s = reglages.interrupteurs?.semantique
  if (s?.actif !== true) return { etat: 'eteinte' }
  let u
  try { u = new URL(reglages.semantique?.url ?? '') } catch { return { etat: 'refusee' } }
  const modele = reglages.semantique?.modele
  if (u.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(u.hostname)) return { etat: 'refusee' }
  if (typeof modele !== 'string' || !modele || /cloud/i.test(modele)) return { etat: 'refusee' }
  return { etat: 'active', url: `${u.protocol}//${u.host}`, modele }
}
async function vectoriser(sem, textes, cache) {
  const neufs = textes.filter((t) => !cache[empreinte(t)])
  for (let i = 0; i < neufs.length; i += LOT) {
    const lot = neufs.slice(i, i + LOT)
    const r = await fetch(`${sem.url}/api/embed`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: sem.modele, input: lot }) })
    if (!r.ok) throw new Error(`embed : HTTP ${r.status}`)
    const j = await r.json()
    lot.forEach((t, k) => { cache[empreinte(t)] = j.embeddings[k] })
  }
  return cache
}

async function indexer(compartiment, racine, reglages) {
  const courant = path.join(racine, compartiment, 'courant')
  const brut = fs.readFileSync(path.join(courant, 'manifeste.json'))
  const m = JSON.parse(brut.toString('utf8'))
  const documents = m.fichiers.map((f) => ({ chemin: `${f.racine}:${f.chemin}`, classe: f.classe, texte: fs.readFileSync(path.join(courant, 'fichiers', f.racine, ...f.chemin.split('/'))).toString('utf8') }))
  const index = construireIndex(documents)
  const sortie = path.join(racine, 'index', compartiment)
  ecrireAtomique(path.join(sortie, 'index.json'), index)
  const passages = JSON.parse(index).passages.map((p) => p.texte)
  let etatSem = 'interdite'
  let vecteurs = 0
  if (compartiment === 'general') {
    const sem = semantique(reglages)
    etatSem = sem.etat
    if (sem.etat === 'active') {
      const fCache = path.join(sortie, 'vecteurs.json')
      let cache = {}
      try { const c = JSON.parse(fs.readFileSync(fCache, 'utf8')); if (c.modele === sem.modele) cache = c.vecteurs } catch { /* premier passage */ }
      cache = await vectoriser(sem, passages, cache)
      const gardes = Object.fromEntries(passages.map((t) => [empreinte(t), cache[empreinte(t)]]))
      ecrireAtomique(fCache, JSON.stringify({ modele: sem.modele, vecteurs: gardes }))
      vecteurs = Object.keys(gardes).length
    }
  }
  const etat = { compartiment, fichiers: documents.length, passages: passages.length, manifeste_sha256: empreinte(brut), synchronise_le: m.exporte_le, indexe_le: new Date().toISOString(), semantique: etatSem, vecteurs }
  ecrireAtomique(path.join(sortie, 'etat.json'), `${JSON.stringify(etat, null, 2)}\n`)
  // Une ligne sans contenu au journal du savoir ET au journal du chef (<racine>/../chef/cycles.jsonl, que lit
  // `presti-journal chef` : c'est par lui que le poste juge la mise en service, SVS-R2).
  const ligne = `${JSON.stringify({ le: etat.indexe_le, evenement: 'savoir index', compartiment, fichiers: etat.fichiers, passages: etat.passages, manifeste_sha256: etat.manifeste_sha256, semantique: etatSem, vecteurs, code: 0 })}\n`
  fs.appendFileSync(path.join(racine, 'journal.jsonl'), ligne)
  const chef = path.join(path.dirname(racine), 'chef', 'cycles.jsonl')
  fs.mkdirSync(path.dirname(chef), { recursive: true })
  fs.appendFileSync(chef, ligne)
  return etat
}

function options(argv) {
  const o = { racine: '/home/agents/travail/savoir', reglages: path.join(DEPOT, 'docs', 'savoir', 'reglages.json') }
  for (const a of argv) {
    if (a.startsWith('--compartiment=')) o.compartiment = a.slice(15)
    else if (a.startsWith('--racine-travail=') && a.length > 17) o.racine = path.resolve(a.slice(17))
    else if (a.startsWith('--reglages=') && a.length > 11) o.reglages = path.resolve(a.slice(11))
    else return null
  }
  return ['tous', 'general', 'prospects'].includes(o.compartiment) ? o : null
}
const o = options(process.argv.slice(2))
if (!o) { console.error('usage : indexer.mjs --compartiment=tous|general|prospects [--racine-travail=<dossier>] [--reglages=<fichier>]'); process.exit(2) }
try {
  const reglages = JSON.parse(fs.readFileSync(o.reglages, 'utf8'))
  const liste = o.compartiment === 'tous' ? ['general', 'prospects'] : [o.compartiment]
  for (const c of liste) {
    if (!fs.existsSync(path.join(o.racine, c, 'courant', 'manifeste.json'))) { console.log(`${c} : rien à indexer`); continue }
    const e = await indexer(c, o.racine, reglages)
    console.log(`${c} : ${e.fichiers} fichier(s), ${e.passages} passage(s), sémantique ${e.semantique}, ${e.vecteurs} vecteur(s)`)
  }
  fs.rmSync(path.join(o.racine, 'a-indexer'), { force: true })
} catch (e) {
  console.error(`✗ index : ${e.message}`)
  process.exitCode = 1
}
