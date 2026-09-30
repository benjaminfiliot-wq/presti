// scripts/fixtures/026-pilotage/k/controles.mjs — le contrôle « JA-3 » du lot k (fiche 026-170, JK-4), lu par
// scripts/juges-026-pilotage-preuve.mjs --lot=k : l'auto-contrôle des jeux d'essai du lot.
//   · theme.schema.json valide themes/essai/theme.json (schéma ET contraintes hors schéma) ;
//   · il REFUSE, chacun pour la bonne raison (le message attendu doit s'y trouver), un emplacement sans porte, deux
//     emplacements réservés, un réservé avec un poste, une adresse https:// dans le thème, un champ de code (à la racine et
//     dans un emplacement) ; un thème abîmé de plus (tracé du tapis coupé) donne aussi un refus ;
//   · evenements.json est rejouable : une suite d'étapes qui nomme au moins les cinq motifs (tâche, réunion, pause, reprise,
//     panne) et que le juge sait lire (station-claw3d-qa la relit avec la même fonction).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validerTheme } from './validateur.mjs'
import { R, TRAVAIL, court, exigerSousTravail, sansCommentaires } from '../a/commun.mjs'
import { lecturesDeSecrets, jetonsDans, RE_CHEMIN_SECRET } from '../a/jeux.mjs'

const K = path.dirname(fileURLToPath(import.meta.url))
const lire = (rel) => JSON.parse(fs.readFileSync(path.join(K, rel), 'utf8'))
const copie = (x) => JSON.parse(JSON.stringify(x))

export async function controleSchema() {
  const echecs = []
  const notes = []
  let schema, theme
  try { schema = lire('theme.schema.json'); theme = lire('themes/essai/theme.json') } catch (e) { return { echecs: [`theme.schema.json ou themes/essai/theme.json illisible : ${String(e.message).slice(0, 120)}`], detail: '' } }

  const base = validerTheme(theme, schema)
  if (base.length) echecs.push(`le thème d'essai n'est pas conforme à son schéma : ${base.slice(0, 3).join(' ; ')}`)
  else notes.push('thème d\'essai valide')

  const cas = [
    ['emplacement sans porte', (t) => { delete t.emplacements[2].porte }, /porte/],
    ['deux emplacements réservés', (t) => { t.emplacements.find((x) => !x.reservee).reservee = true }, /réservé/],
    ['réservé avec un poste', (t) => { t.emplacements.find((x) => x.reservee).poste = { x: 8, y: 8 } }, /poste/],
    ['adresse https:// dans le thème', (t) => { t.nom = 'https://exemple.invalid/x' }, /nom|adresse/],
    ['adresse dans une plaque', (t) => { t.emplacements[0].plaque.texte = '//exemple.invalid' }, /plaque|adresse/],
    ['champ de code à la racine', (t) => { t.script = 'alert(1)' }, /script/],
    ['champ de code dans un emplacement', (t) => { t.emplacements[1].onclick = 'x()' }, /onclick/],
    ['tracé du tapis coupé', (t) => { t.tapis.trace.splice(3, 2) }, /tracé/],
    ['défaut manquant', (t) => { t.defauts.pop() }, /défaut|defauts/],
  ]
  let refus = 0
  for (const [nom, abimer, attendu] of cas) {
    const t = copie(theme)
    try { abimer(t) } catch (e) { echecs.push(`cas « ${nom} » : le thème d'essai n'a pas la forme attendue (${String(e.message).slice(0, 60)})`); continue }
    const e = validerTheme(t, schema)
    if (!e.length) echecs.push(`le schéma accepte « ${nom} »`)
    else if (!e.some((m) => attendu.test(m))) echecs.push(`« ${nom} » est refusé pour une autre raison que la bonne : ${e[0]}`)
    else refus++
  }
  notes.push(`${refus}/${cas.length} thèmes abîmés refusés pour la bonne raison`)

  try {
    const ev = lire('evenements.json')
    const etapes = ev.etapes ?? ev
    if (!Array.isArray(etapes) || etapes.length < 5) echecs.push('evenements.json : une liste d\'au moins cinq étapes attendue')
    else {
      const texte = JSON.stringify(etapes)
      for (const m of ['tache', 'reunion', 'pause', 'reprise', 'panne']) if (!new RegExp(m, 'i').test(texte)) echecs.push(`evenements.json : aucune étape « ${m} »`)
      notes.push(`evenements.json : ${etapes.length} étapes`)
    }
  } catch (e) { echecs.push(`evenements.json illisible : ${String(e.message).slice(0, 100)}`) }

  return { echecs, detail: notes.join(' ; ') }
}

// ── JA-4 (JK-5) : aucun secret lu, aucun réseau hors de la boucle locale ─────────────────────────────────────────────────
const SOURCES = () => {
  const out = [path.join(R, 'scripts', 'station-claw3d-qa.mjs')]
  for (const f of fs.readdirSync(K)) if (/^(?:juge-.*|validateur|controles|lot)\.mjs$/.test(f)) out.push(path.join(K, f))
  return out
}
const rel = (f) => path.relative(R, f).split(path.sep).join('/')
const HOTES_PERMIS = /^(?:127\.0\.0\.1|localhost|exemple\.invalid|.*\.exemple\.invalid|phaser\.io|fonts\.gstatic\.com|fonts\.googleapis\.com)$/
const PIEGE = (journal) => String.raw`// Piège des lectures du lot k (JA-4 de 026-170), écrit par scripts/fixtures/026-pilotage/k/controles.mjs.
import fs from 'node:fs'
import fsp from 'node:fs/promises'
const RE = ${RE_CHEMIN_SECRET.toString()}
const J = ${JSON.stringify(journal)}
const vise = (p) => { try { return RE.test(String(p instanceof URL ? p.pathname : p).replace(/\\/g, '/')) } catch { return false } }
const noter = (quoi, p) => { try { fs.appendFileSync(J, process.pid + ' ' + quoi + ' ' + String(p) + '\n') } catch {} }
for (const [o, noms] of [[fs, ['readFileSync', 'openSync', 'existsSync', 'statSync', 'readFile', 'open', 'createReadStream']], [fsp, ['readFile', 'open']]]) {
  for (const n of noms) {
    const f = o[n]
    if (typeof f !== 'function') continue
    o[n] = function (p, ...a) {
      if (vise(p)) { noter(n, p); if (n === 'existsSync') return false; throw new Error('lecture refusée par le piège du lot k : ' + p) }
      return f.call(this, p, ...a)
    }
  }
}
if (typeof process.loadEnvFile === 'function') { process.loadEnvFile = function (p) { noter('loadEnvFile', p ?? '.env'); throw new Error('loadEnvFile refusé par le piège du lot k') } }
`

export async function controleSecrets(ctx) {
  const e = []
  const sources = SOURCES()
  // 1) Lu dans le source : aucune lecture de secret, aucune clé réelle, aucune adresse distante hors liste.
  for (const f of sources) {
    const src = fs.readFileSync(f, 'utf8')
    for (const l of lecturesDeSecrets(src)) e.push(`${rel(f)}${l.ligne ? `:${l.ligne}` : ''} lit un secret : ${l.quoi}`)
    for (const j of jetonsDans(src)) e.push(`${rel(f)}:${j.ligne} porte une clé réelle (${j.nom})`)
    const chaines = []
    sansCommentaires(src, chaines)
    for (const { texte } of chaines) {
      for (const m of texte.matchAll(/\bhttps?:\/\/([^/\s:'"`$]+)/g)) if (!HOTES_PERMIS.test(m[1])) e.push(`${rel(f)} : l'adresse distante « ${m[0]} » (hors de 127.0.0.1)`)
    }
  }
  // 2) À l'exécution, sous le piège des lectures : le juge en mode témoin (ses critères qui se lisent) ne lit aucun secret.
  const d = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', `lectures-${ctx.lot}`))
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(path.join(d, 'leurres'), { recursive: true })
  const leurre = path.join(d, 'leurres', ['', 'env', 'local'].join('.'))
  fs.writeFileSync(leurre, 'LEURRE_TEMOIN=1\n')
  const journal = path.join(d, 'journal.log'), piege = path.join(d, 'piege-lectures.mjs')
  fs.writeFileSync(piege, PIEGE(journal))
  const env = { NODE_OPTIONS: `--import=${pathToFileURL(piege).href}` }
  const lu = () => { try { return fs.readFileSync(journal, 'utf8').trim() } catch { return '' } }
  const t = ctx.lancerNode(['-e', `const fs = require('node:fs'); let a = 'lu', b = 'lu'; try { fs.readFileSync(${JSON.stringify(leurre)}) } catch { a = 'refuse' } try { fs.readFileSync(${JSON.stringify(path.join(K, 'lot.mjs'))}) } catch { b = 'refuse' } console.log(a + ' ' + b)`], { nom: 'piege-lectures-temoin', env, timeout: 60_000 })
  if (t.stdout.trim().split(/\r?\n/).pop() !== 'refuse lu') e.push(`le piège des lectures ne refuse pas le leurre ou gêne une lecture ordinaire (« ${court(t.sortie, 80)} »)`)
  if (!lu().includes(leurre)) e.push('le piège des lectures ne consigne pas le leurre')
  fs.rmSync(journal, { force: true })
  const x = ctx.lancerNode(['scripts/station-claw3d-qa.mjs', '--temoin', '--partie=provenance,hygiene,grille'], { nom: 'lectures-station-claw3d-qa', env, timeout: 300_000 })
  if (x.code !== 0) e.push(`station-claw3d-qa --temoin --partie=provenance,hygiene,grille sous le piège des lectures : code ${x.code}, 0 attendu (« ${court(x.sortie.trim().split(/\r?\n/).filter((l) => l.startsWith('❌'))[0] ?? x.sortie.trim().split(/\r?\n/).pop(), 120)} »)`)
  const jl = lu()
  if (jl) e.push(`lecture de secret consignée sous le piège : ${court(jl.split('\n')[0], 120)}`)
  return { echecs: e, detail: `${sources.length} sources lus (station-claw3d-qa, juge-*, validateur, controles, lot) : aucune lecture de .env.local ni de presti-secrets, aucune clé réelle, aucune adresse distante hors 127.0.0.1 (le navigateur du juge coupe tout hôte externe, la résolution de noms y est fermée) ; piège des lectures prouvé sur un leurre, puis le juge en témoin dessous : rien consigné` }
}
