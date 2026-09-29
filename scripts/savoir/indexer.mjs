#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { decouper, construireIndex } from '../../lib/savoir/index.ts'

const arg = (n, d) => process.argv.find(x => x.startsWith(`--${n}=`))?.slice(n.length + 3) || d
const depot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const racine = path.resolve(arg('racine-travail', '/home/agents/travail/savoir'))
const reglage = path.resolve(arg('reglages', path.join(depot, 'docs/savoir/reglages.json')))
const choix = arg('compartiment', 'tous')
const sha = b => crypto.createHash('sha256').update(b).digest('hex')
const journal = (f, objet) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.appendFileSync(f, JSON.stringify(objet) + '\n') }
const ecrire = (f, contenu) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.part', contenu); fs.renameSync(f + '.part', f) }
function semantiquePermise(r) {
  if (!r?.interrupteurs?.semantique?.actif) return 'eteinte'
  const modele = r?.semantique?.modele, url = r?.semantique?.url
  if (typeof modele !== 'string' || !modele || /(?:^|[:\-])cloud(?:$|[:\-])/i.test(modele)) return 'refusee'
  try { const u = new URL(url); return u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname) && !u.username && !u.password && !u.search && !u.hash && (u.pathname === '/' || u.pathname === '') ? 'active' : 'refusee' } catch { return 'refusee' }
}
async function indexer(compartiment, reglages) {
  const courant = path.join(racine, compartiment, 'courant')
  if (!fs.existsSync(courant)) return
  const brut = fs.readFileSync(path.join(courant, 'manifeste.json'))
  const manifeste = JSON.parse(brut.toString('utf8'))
  if (manifeste.compartiment !== compartiment || !Array.isArray(manifeste.fichiers)) throw new Error('manifeste invalide')
  const passages = []
  for (const f of manifeste.fichiers) {
    if (compartiment === 'general' && f.classe === 'prospects') throw new Error('classe interdite')
    if (!['saas', 'presti', 'memoire', 'ops'].includes(f.racine) || !f.chemin || f.chemin.split('/').some(x => !x || x === '.' || x === '..') || f.chemin.startsWith('/')) throw new Error('chemin invalide')
    const nom = path.join(courant, 'fichiers', f.racine, ...f.chemin.split('/'))
    const b = fs.readFileSync(nom)
    if (sha(b) !== f.sha256) throw new Error('empreinte invalide')
    passages.push(...decouper(`${f.racine}:${f.chemin}`, b.toString('utf8'), { classe: f.classe, racine: f.racine }))
  }
  const dossier = path.join(racine, 'index', compartiment)
  ecrire(path.join(dossier, 'index.json'), construireIndex(passages))
  let semantique = compartiment === 'general' ? semantiquePermise(reglages) : 'eteinte', vecteurs = 0
  if (semantique === 'active') {
    const metaF = path.join(dossier, 'vecteurs.json'), binF = path.join(dossier, 'vecteurs.bin')
    let anciens = {}, dimension = 0
    try {
      const meta = JSON.parse(fs.readFileSync(metaF, 'utf8'))
      if (meta.modele === reglages.semantique.modele && fs.existsSync(binF)) {
        dimension = meta.dimension
        const bin = fs.readFileSync(binF)
        meta.ids.forEach((id, i) => { anciens[id] = Array.from({ length: dimension }, (_, j) => bin.readFloatLE((i * dimension + j) * 4)) })
      }
    } catch { /* premier index */ }
    const nouveaux = passages.filter(p => !anciens[p.id])
    for (let i = 0; i < nouveaux.length; i += 16) {
      const lot = nouveaux.slice(i, i + 16)
      const u = new URL('/api/embed', reglages.semantique.url)
      const reponse = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: reglages.semantique.modele, input: lot.map(p => p.texte) }), signal: AbortSignal.timeout(120000) })
      if (!reponse.ok) throw new Error('embeddings indisponibles')
      const j = await reponse.json()
      if (!Array.isArray(j.embeddings) || j.embeddings.length !== lot.length) throw new Error('reponse embeddings invalide')
      j.embeddings.forEach((v, n) => {
        if (!Array.isArray(v) || !v.length || v.some(x => !Number.isFinite(x))) throw new Error('vecteur invalide')
        dimension ||= v.length
        if (v.length !== dimension) throw new Error('dimension incompatible')
        const norme = Math.hypot(...v)
        anciens[lot[n].id] = v.map(x => norme ? x / norme : 0)
      })
    }
    const ids = passages.map(p => p.id).sort()
    const bin = Buffer.alloc(ids.length * dimension * 4)
    ids.forEach((id, i) => anciens[id].forEach((x, j) => bin.writeFloatLE(x, (i * dimension + j) * 4)))
    ecrire(binF, bin)
    ecrire(metaF, JSON.stringify({ ids, dimension, modele: reglages.semantique.modele }))
    vecteurs = ids.length
  }
  const date = new Date().toISOString()
  const etat = { compartiment, fichiers: manifeste.fichiers.length, passages: passages.length, manifeste_sha256: sha(brut), synchronise_le: manifeste.exporte_le || date, indexe_le: date, semantique, vecteurs }
  ecrire(path.join(dossier, 'etat.json'), JSON.stringify(etat))
  const ligne = { le: date, evenement: 'savoir index', compartiment, fichiers: etat.fichiers, passages: etat.passages, manifeste_sha256: etat.manifeste_sha256, code: 0 }
  journal(path.join(racine, 'journal.jsonl'), ligne)
  journal(path.join(path.dirname(racine), 'chef', 'cycles.jsonl'), ligne)
}
let code = 0
try {
  if (!['general', 'prospects', 'tous'].includes(choix)) throw new Error('compartiment invalide')
  try { fs.unlinkSync(path.join(racine, 'a-indexer')) } catch (e) { if (e.code !== 'ENOENT') throw e }
  const reglages = JSON.parse(fs.readFileSync(reglage, 'utf8'))
  for (const c of choix === 'tous' ? ['general', 'prospects'] : [choix]) await indexer(c, reglages)
} catch (e) { code = 1; console.error(String(e.message).slice(0, 120)) }
process.exitCode = code
