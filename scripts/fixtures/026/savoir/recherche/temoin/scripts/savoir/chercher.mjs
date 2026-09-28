#!/usr/bin/env node
// TÉMOIN (026-232) de scripts/savoir/chercher.mjs — la référence du contrat que juge scripts/savoir-recherche-qa.mjs
// (partie cli : SVR-3, SVR-6, SVR-7, SVR-10, SVR-11, SVR-12). 026-233 écrit le vrai, avec les transports réels.
//
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir/chercher.mjs --agent=<nom>
//        --question=<texte> [--web] [--base=https://prestiapp.fr] [--racine-travail=/home/agents/travail/savoir]
//        [--sortie=<fichier>] [--reglages=<dépôt>/docs/savoir/reglages.json]
//
// Index `general` toujours, index `prospects` et ses noms seulement pour un agent qui a la classe `prospects` ; les noms
// servent aussi au refus, pour tous, sans jamais sortir du processus. Un passage n'est rendu que si son fichier se relit
// et que ses lignes debut–fin portent encore son texte (source vérifiable) ; l'empreinte est celle du fichier relu.
// Le témoin ne construit AUCUN transport web (pas de clé ici) : --web rend `indisponible` quand tout le reste est ouvert.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { chercher, classesPour } from '../../lib/savoir/recherche.ts'
import { chercherIndex } from '../../lib/savoir/index.ts'
import { MOTEUR_DE } from '../../lib/agents/moteurs.ts'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..')
const empreinte = (b) => crypto.createHash('sha256').update(b).digest('hex')
const lireJSONSi = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
function ecrireAtomique(p, contenu) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(`${p}.part`, contenu)
  fs.renameSync(`${p}.part`, p)
}
class ErreurBus extends Error { constructor(statut) { super(`bus ${statut}`); this.statut = statut } }

function options(argv) {
  const o = { web: false, base: 'https://prestiapp.fr', racine: '/home/agents/travail/savoir', reglages: path.join(DEPOT, 'docs', 'savoir', 'reglages.json'), sortie: null }
  for (const a of argv) {
    const m = /^--([a-z-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) return null
    const [, k, v] = m
    if (k === 'web' && v === undefined) { o.web = true; continue }
    if (v === undefined || v === '') return null
    if (k === 'agent') o.agent = v
    else if (k === 'question') o.question = v
    else if (k === 'base') o.base = v
    else if (k === 'racine-travail') o.racine = path.resolve(v)
    else if (k === 'sortie') o.sortie = path.resolve(v)
    else if (k === 'reglages') o.reglages = path.resolve(v)
    else return null
  }
  return o.agent && /^[a-z_]{2,40}$/.test(o.agent) && typeof o.question === 'string' ? o : null
}
/** https, ou http sur la boucle locale seulement : le jeton ne part jamais en clair sur le réseau. */
function baseAdmise(base) {
  let u
  try { u = new URL(base) } catch { return null }
  if (u.username || u.password) return null
  if (u.protocol === 'https:') return u.origin
  if (u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) return u.origin
  return null
}

function chargerIndex(racine, avecProspects) {
  const liste = []
  for (const c of avecProspects ? ['general', 'prospects'] : ['general']) {
    let index
    try { index = fs.readFileSync(path.join(racine, 'index', c, 'index.json'), 'utf8') } catch { continue }
    const etat = lireJSONSi(path.join(racine, 'index', c, 'etat.json')) || {}
    liste.push({ compartiment: c, index, synchronise_le: etat.synchronise_le })
  }
  return liste
}
/** Les valeurs `entreprise` des .json/.jsonl du compartiment prospects : en mémoire, jamais écrites ailleurs. */
function nomsProspects(racine) {
  const noms = new Set()
  const cueillir = (v) => {
    if (Array.isArray(v)) v.forEach(cueillir)
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'entreprise' && typeof x === 'string' && x.trim()) noms.add(x.trim()); else cueillir(x) }
  }
  const marcher = (d) => {
    let entrees
    try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entrees) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) marcher(p)
      else if (e.isFile() && e.name.endsWith('.json')) cueillir(lireJSONSi(p))
      else if (e.isFile() && e.name.endsWith('.jsonl')) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { try { cueillir(JSON.parse(l)) } catch { /* ligne illisible */ } }
    }
  }
  marcher(path.join(racine, 'prospects', 'courant', 'fichiers'))
  return [...noms]
}
function savoirIndex(racine, index, question, { k, classes }) {
  const out = []
  for (const c of index) {
    let trouves
    try { trouves = chercherIndex(c.index, question, { classes, limite: k * 3 }) } catch { continue }
    for (const r of trouves) {
      const i = String(r.chemin).indexOf(':')
      if (i <= 0) continue
      const nomRacine = r.chemin.slice(0, i)
      const chemin = r.chemin.slice(i + 1)
      if (!/^[a-z]+$/.test(nomRacine) || chemin.split('/').some((s) => !s || s === '..' || s === '.')) continue
      let brut
      try { brut = fs.readFileSync(path.join(racine, c.compartiment, 'courant', 'fichiers', nomRacine, ...chemin.split('/'))) } catch { continue }
      const lignes = brut.toString('utf8').split('\n')
      if (r.fin > lignes.length || !lignes.slice(r.debut - 1, r.fin).join('\n').includes(r.texte)) continue
      out.push({ texte: r.texte, score: r.score, source: { racine: nomRacine, chemin, debut: r.debut, fin: r.fin, classe: r.classe, sha256: empreinte(brut), synchronise_le: c.synchronise_le } })
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, k)
}
async function publier(base, jeton, e) {
  let r
  try {
    r = await fetch(`${base}/api/agents/evenements`, { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, body: JSON.stringify({ type: e.type, objet: e.objet, resume: e.resume }), signal: AbortSignal.timeout(20000) })
  } catch { throw new ErreurBus('injoignable') }
  if (!r.ok) throw new ErreurBus(r.status)
}
function prendreVerrou(p) {
  for (let i = 0; i < 100; i++) {
    try { fs.closeSync(fs.openSync(p, 'wx')); return p } catch (e) { if (e.code !== 'EEXIST') throw e }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
  }
  return null
}

async function lancer(o, base, jeton) {
  let reglages
  try { reglages = JSON.parse(fs.readFileSync(o.reglages, 'utf8')) } catch { console.error(`✗ réglages illisibles : ${o.reglages}`); return 2 }
  const classes = classesPour(o.agent, MOTEUR_DE)
  const jour = new Date().toISOString().slice(0, 10)
  const index = chargerIndex(o.racine, classes.includes('prospects'))
  const pCompteurs = path.join(o.racine, `compteurs-${jour}.json`)
  const compteurs = lireJSONSi(pCompteurs) || {}
  const pCredits = path.join(o.racine, 'credits-firecrawl.json')
  const credits = { restant: 0 }
  let verrou = null
  let consommes = 0
  if (o.web) {
    fs.mkdirSync(o.racine, { recursive: true })
    verrou = prendreVerrou(`${pCredits}.verrou`)
    if (!verrou) { console.error('✗ réserve de crédits verrouillée'); return 1 }
    consommes = Number(lireJSONSi(pCredits)?.consommes) || 0
    credits.restant = Math.max(0, (Number(reglages.firecrawl?.reserve_credits) || 0) - consommes)
  }
  const initial = credits.restant
  try {
    const deps = {
      savoir: (question, opts) => savoirIndex(o.racine, index, question, opts),
      moteurs: MOTEUR_DE,
      reglages,
      nomsProspects: nomsProspects(o.racine),
      compteurs,
      credits,
      journal: (e) => publier(base, jeton, e),
      horloge: { maintenant: () => Date.now() },
    }
    let r
    try { r = await chercher({ agent: o.agent, question: o.question, web: o.web }, deps) } catch (e) {
      if (e instanceof ErreurBus) { console.error(`✗ événement refusé par le bus (${e.statut})`); return 3 }
      throw e
    }
    const le = new Date().toISOString()
    const origines = { savoir: 0, web: 0, perplexity: 0 }
    for (const x of r.resultats) origines[x.origine] = (origines[x.origine] || 0) + 1
    const sortie = `${JSON.stringify(r, null, 2)}\n`
    if (o.sortie) ecrireAtomique(o.sortie, sortie)
    else process.stdout.write(sortie)
    fs.mkdirSync(o.racine, { recursive: true })
    fs.appendFileSync(path.join(o.racine, `recherches-${jour}.jsonl`), `${JSON.stringify({ le, id: r.id, agent: r.agent, question_sha256: r.question_sha256, n: r.resultats.length, origines, credits: r.web.credits, refus: r.refus ?? null })}\n`)
    const chef = path.join(path.dirname(o.racine), 'chef', 'cycles.jsonl')
    fs.mkdirSync(path.dirname(chef), { recursive: true })
    fs.appendFileSync(chef, `${JSON.stringify({ le, evenement: 'savoir recherche', agent: r.agent, id: r.id, n: r.resultats.length, origines, web: r.web.etat, credits: r.web.credits, code: 0 })}\n`)
    ecrireAtomique(pCompteurs, `${JSON.stringify(compteurs)}\n`)
    if (o.web) ecrireAtomique(pCredits, `${JSON.stringify({ reserve_credits: reglages.firecrawl?.reserve_credits ?? null, consommes: consommes + (initial - credits.restant), maj_le: le })}\n`)
    if (o.sortie) console.log(`✓ ${r.resultats.length} résultat(s) · web ${r.web.etat}`)
    return 0
  } finally {
    if (verrou) fs.rmSync(verrou, { force: true })
  }
}

const o = options(process.argv.slice(2))
if (!o) {
  console.error('usage : chercher.mjs --agent=<nom> --question=<texte> [--web] [--base=<url>] [--racine-travail=<dossier>] [--sortie=<fichier>] [--reglages=<fichier>]')
  process.exitCode = 2
} else {
  const base = baseAdmise(o.base)
  const nomJeton = `PRESTI_JETON_${o.agent.toUpperCase()}`
  const jeton = process.env[nomJeton]
  if (!base) { console.error('✗ --base : https, ou http sur la boucle locale seulement'); process.exitCode = 2 }
  else if (!jeton || !jeton.trim()) { console.error(`✗ jeton absent : ${nomJeton}`); process.exitCode = 2 }
  else process.exitCode = await lancer(o, base, jeton.trim())
}
