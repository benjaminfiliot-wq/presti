// scripts/juges-026-pilotage-preuve.mjs — la preuve générique des juges du domaine Pilotage (fiche 026-012), écrite par
// Claude Code. Elle ne connaît aucun lot : elle lit scripts/fixtures/026-pilotage/<x>/lot.mjs (contrat dans a/lot.mjs), si
// bien que les lots b (026-066), c (026-104), s (026-067) et les suivants s'ajoutent sans toucher ce script.
//
//   node scripts/juges-026-pilotage-preuve.mjs --lot=<x> [--lot-fichier=<chemin d'un lot.mjs>]
//
// Elle produit elle-même toutes ses preuves (aucun journal déposé par quelqu'un d'autre n'est lu) :
//   JA-1  la référence (commit du lot, ancêtre de HEAD, sans les modules jugés) est extraite par `git archive` sous
//         .orchestre/travail/juges-026-pilotage/reference/ (rien n'est écrit dans .git) ; chaque juge, lancé avec
//         --racine=<référence>, sort en code ≠ 0 (1 ou 2 : un verdict, pas un plantage) et son PREMIER critère est en échec
//         avec l'identifiant attendu ; l'extrait réel
//         de cette ligne est recopié dans echecs-attendus.md, relu, et retrouvé dans la sortie qui vient d'être produite ;
//   JA-2  chaque juge, lancé avec --temoin sur l'état actuel, sort en code 0 ;
//   JA-3  l'auto-contrôle des jeux d'essai du lot (contrôle « JA-3 » déclaré par lot.mjs) est vert ;
//   JA-4  chaque lancement (juges, contrôles, sous-lancements) tourne sous un piège réseau chargé dans chaque processus enfant
//         (NODE_OPTIONS=--import ; le NODE_OPTIONS d'un contrôle s'y ajoute, sans le remplacer) : fetch et
//         net.Socket#connect hors 127.0.0.1 sont refusés et consignés ; le piège prouve d'abord qu'il attrape un fetch et un
//         https.get vers l'extérieur, et laisse passer 127.0.0.1 ; plus les contrôles « JA-4 » déclarés par le lot (lot a :
//         aucun juge ne lit .env.local ni presti-secrets, lu dans le source et vérifié sous un piège des lectures) ;
//   JA-5  `git status --porcelain` (fichiers non suivis compris, taille et date de chaque fichier listé) est le même avant et
//         après, hors .orchestre/travail/, .orchestre/preuves/ et le reste de .orchestre/ (bruit d'autres fiches sur ce
//         dépôt travaillé en continu — seul .orchestre/decisions.md y reste surveillé) ;
//   JA-6  un lot.mjs sans `fiche`, ou avec une `fiche` hors de ^026-[\w-]+$, est refusé (la preuve se relance elle-même sur
//         deux copies fautives et une copie intacte, sous .orchestre/travail/) ; la section du lot est écrite dans le dossier
//         de preuves de SA fiche ; plus les contrôles « JA-6 » déclarés par le lot (lot a : --partie=lot refusée en code 2).
//
// Durcissement du 27/09 (faille révélée par 026-066 : trois juges de 400 à 767 octets, « rouges sur la référence » parce
// qu'ils échouaient TOUJOURS, acceptés par JA-1 à JA-6). « Rouge avant l'implémentation » ne prouve rien si le juge ne sait
// jamais être vert, et « --temoin en code 0 » (JA-2) est un mode que le juge se décerne lui-même. D'où :
//   JA-7  le témoin vert : le lot déclare `temoin`, une IMPLÉMENTATION DE RÉFÉRENCE dans ses fixtures (chemins du dépôt,
//         suffixe .temoin, aucun fichier de 0 octet, au moins un des chemins `absents`). La preuve la pose sur l'arbre de
//         référence (liens physiques, sous .orchestre/travail/juges-026-pilotage/temoin-<lot>/) ; CHAQUE juge, lancé avec
//         --racine=<cet arbre>, sort en code 0, sans aucune ligne ❌, son premier critère (`attendu`) vert ;
//   JA-8  les sabotages : chaque juge déclare des sabotages du témoin (un texte remplacé, ou un fichier retiré) ; sur chacun,
//         le juge sort en code 1 (ou 2) avec « ❌ <tue> » ; le témoin est rétabli après chaque passage (relu octet pour
//         octet) ; et les sabotages de CONTENU (premier critère resté vert) tuent au moins PLANCHER_TUES critères distincts :
//         un juge qui ne regarde que la présence des fichiers ne passe pas ;
//   JA-9  la substance : `criteresMin` (lu dans le lot, entier ≥ PLANCHER_CRITERES) critères verts DISTINCTS sur le témoin ;
//         le source du juge pèse au moins PLANCHER_TAILLE octets de code (commentaires ôtés, blancs réduits ; `tailleMin` du
//         lot peut relever ce plancher, jamais l'abaisser) ;
//   JA-10 les autotests de la preuve : elle se relance (JUGES_026_PILOTAGE_AUTOTEST=1 : JA-1, JA-7, JA-8, JA-9 seulement)
//         sur quatre lots factices de scripts/fixtures/026-pilotage/_autotest/ : un juge conforme → PASS ; un juge qui sort
//         TOUJOURS en 1 → ❌ JA-7 ; un juge qui sort TOUJOURS en 0 → ❌ JA-1 et ❌ JA-8 ; un juge qui ne regarde que la
//         présence du fichier → ❌ JA-8. Sans le cas conforme, les refus ne prouveraient rien.
//
// Sortie : une ligne par critère (« ✅ JA-3 … » ou « ❌ JA-3 … »), puis « juges-026-pilotage-preuve --lot=<x> : PASS|FAIL ».
// Code 0 seulement si tout est vert ; 1 sinon ; 2 si l'appel est invalide. N'écrit que sous .orchestre/travail/ et dans
// .orchestre/preuves/<fiche>/echecs-attendus.md ; ne lit ni .env.local ni presti-secrets. Lourde (les juges du lot a lancent
// tsc sur le témoin, sabotage après sabotage) : elle tourne sur l'usine, `node scripts/usine.mjs executer -- node …`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  R, TRAVAIL, court, premiereLigne, lancer, git, lireOptions, lsTree, extraireReference, exigerSousTravail, lireOuNull, sous,
  listerFichiers, sansCommentaires,
} from './fixtures/026-pilotage/a/commun.mjs'

const JUGE = 'juges-026-pilotage-preuve'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const SOUS = process.env.JUGES_026_PILOTAGE_SOUS === '1'
const AUTOTEST = !SOUS && process.env.JUGES_026_PILOTAGE_AUTOTEST === '1'
const o = lireOptions(process.argv.slice(2), { connues: ['lot', 'lot-fichier'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const LOT = o.valeurs.lot
if (!LOT || !/^[a-z0-9][\w-]*$/.test(LOT)) refuser(`--lot=<x> attendu (lettres minuscules, chiffres, tirets), reçu : ${LOT ?? 'rien'}`)
if (o.inconnues.length || o.positionnels.length || o.valeurs.racine || o.temoin) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ') || '--racine / --temoin (options des juges, pas de la preuve)'}`)
const FICHIER_LOT = o.valeurs['lot-fichier'] ? path.resolve(R, o.valeurs['lot-fichier']) : path.join(R, 'scripts', 'fixtures', '026-pilotage', LOT, 'lot.mjs')
// Le dossier du lot est celui de son lot.mjs : le témoin et les contrôles s'y résolvent (les lots factices de JA-10 vivent
// ensemble dans _autotest/ ; les copies de JA-6, sous .orchestre/travail/, ne font que lire le lot).
const DOSSIER_LOT = path.dirname(FICHIER_LOT)
const TRAV = path.join(TRAVAIL, 'juges-026-pilotage')
const NOM = `${JUGE} --lot=${LOT}`
const IDS = SOUS ? ['JA-6'] : AUTOTEST ? ['JA-1', 'JA-7', 'JA-8', 'JA-9'] : ['JA-1', 'JA-2', 'JA-3', 'JA-4', 'JA-5', 'JA-6', 'JA-7', 'JA-8', 'JA-9', 'JA-10']
// Planchers de la preuve : un lot peut exiger plus (criteresMin, tailleMin), jamais moins.
const PLANCHER_CRITERES = 3 // critères verts distincts sur le témoin
const PLANCHER_TAILLE = 1500 // octets de code du juge, commentaires ôtés (les juges refusés de 026-066 : 400 à 767 octets EN TOUT)
const PLANCHER_TUES = 2 // critères distincts tués par des sabotages de contenu, premier critère resté vert
const SUFFIXE = '.temoin'
const posix = (p) => p.split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'
const RE_FICHE = /^026-[\w-]+$/
const RE_CRITERE = /^[A-Z0-9]{1,5}-[A-Z0-9-]+$/
const ABSENTS_DEFAUT = ['lib/pilotage/', 'app/controle/Pilotage.tsx', 'app/controle/station/']

// Les verdicts sont rassemblés, puis écrits dans l'ordre JA-1 … JA-6 (certains ne se décident qu'à la fin).
const verdicts = new Map()
const noter = (id, echecs, detail) => {
  const v = verdicts.get(id) ?? { echecs: [], details: [] }
  v.echecs.push(...echecs); if (detail) v.details.push(detail)
  verdicts.set(id, v)
}
const ligne = (t) => String(t ?? '').replace(/\s*\r?\n\s*/g, ' · ').trim()
function finir() {
  console.log(`${NOM} — lot ${rel(FICHIER_LOT)}${SOUS ? ' — sous-lancement (lecture du lot seulement)' : ''}`)
  const rouges = []
  for (const id of IDS) {
    const v = verdicts.get(id)
    if (!v) { rouges.push(id); console.log(`❌ ${id} non évalué`); continue }
    if (v.echecs.length) { rouges.push(id); console.log(`❌ ${id} ${ligne(v.echecs.slice(0, 8).join(' ; ') + (v.echecs.length > 8 ? ` ; … (${v.echecs.length} défauts)` : ''))}`) }
    else console.log(`✅ ${id} ${ligne(v.details.join(' ; ')) || 'conforme'}`)
  }
  console.log(rouges.length ? `${NOM} : FAIL — ${rouges.join(', ')}` : `${NOM} : PASS`)
  process.exit(rouges.length ? 1 : 0)
}

// ── JA-5 : l'état du dépôt, avant ────────────────────────────────────────────────────────────────────────────────────────
// 29/09 : ce dépôt est travaillé 24h/24 par plusieurs sessions (l'écosystème 026 tourne en continu). Sur deux rejeux
// consécutifs (28/09 matin puis soir), JA-5 a rougi uniquement sur du bruit d'autres fiches — .orchestre/contexte.md,
// .orchestre/digest.md, des .orchestre/en-cours/<autre-id>.*, .orchestre/a-relire/<autre-id>.md, .orchestre/fait/<autre-id>.md
// — jamais sur un chemin protégé par le périmètre de 026-012 (voir l'en-tête de la fiche : interdit ne cite qu'un seul
// chemin sous .orchestre/, à savoir .orchestre/decisions.md). JA-5 ne doit surveiller que ce que 026-012 doit réellement
// protéger : tout .orchestre/ sauf .orchestre/decisions.md est désormais hors surveillance, comme .orchestre/travail/ et
// .orchestre/preuves/ l'étaient déjà. app/**, lib/**, supabase/**, public/**, scripts/** (hors ce lot) restent surveillés.
const HORS_JA5 = ['.orchestre/travail/', '.orchestre/preuves/']
const PROTEGE_JA5_SOUS_ORCHESTRE = new Set(['.orchestre/decisions.md'])
function horsJA5(chemin) {
  if (HORS_JA5.some((h) => chemin.startsWith(h))) return true
  if (chemin.startsWith('.orchestre/') && !PROTEGE_JA5_SOUS_ORCHESTRE.has(chemin)) return true
  return false
}
function etatDepot() {
  const r = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  if (r.code !== 0) throw new Error(`git status : ${court(r.stderr || r.erreur)}`)
  const m = new Map()
  const e = r.stdout.split('\0')
  for (let i = 0; i < e.length; i++) {
    if (!e[i]) continue
    const statut = e[i].slice(0, 2), chemin = e[i].slice(3)
    if (/[RC]/.test(statut)) i++ // le chemin d'origine d'un renommage suit
    if (horsJA5(chemin)) continue
    let empreinte = 'absent'
    try { const st = fs.statSync(path.join(R, chemin)); empreinte = st.isDirectory() ? 'dossier' : `${st.size}:${st.mtimeMs}` } catch { /* supprimé */ }
    m.set(chemin, `${statut}|${empreinte}`)
  }
  return m
}
let avant = null
if (!SOUS && !AUTOTEST) { try { avant = etatDepot() } catch (e) { noter('JA-5', [`état initial illisible : ${premiereLigne(e)}`]) } }

// ── Le lot ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
let L
try {
  if (!fs.existsSync(FICHIER_LOT)) throw new Error(`${rel(FICHIER_LOT)} absent`)
  const m = await import(`${pathToFileURL(FICHIER_LOT).href}?lu=${Date.now()}`)
  L = m.default && typeof m.default === 'object' && !('fiche' in m) ? m.default : m
} catch (e) {
  noter('JA-6', [`${rel(FICHIER_LOT)} illisible : ${premiereLigne(e)}`])
  finir()
}
{
  const e = []
  if (typeof L.fiche !== 'string' || !L.fiche) e.push(`${rel(FICHIER_LOT)} sans \`fiche\` : la preuve ne saurait pas dans quel dossier de preuves écrire la section du lot`)
  else if (!RE_FICHE.test(L.fiche)) e.push(`\`fiche\` « ${L.fiche} » mal formée (^026-[\\w-]+$ attendu)`)
  if (typeof L.reference !== 'string' || !/^[0-9a-f]{7,40}$/i.test(L.reference)) e.push(`\`reference\` ${JSON.stringify(L.reference)} : un sha de commit attendu`)
  if (!Array.isArray(L.juges) || !L.juges.length) e.push('`juges` vide ou absent')
  for (const [i, j] of (Array.isArray(L.juges) ? L.juges : []).entries()) {
    if (typeof j?.commande !== 'string' || !/^scripts\/[\w./-]+\.mjs$/.test(j.commande) || j.commande.includes('..') || !fs.existsSync(path.join(R, j.commande))) e.push(`juge ${i + 1} : commande ${JSON.stringify(j?.commande)} (un scripts/….mjs du dépôt attendu)`)
    if (!Array.isArray(j?.arguments) || j.arguments.some((a) => typeof a !== 'string' || /^--(?:racine|temoin)\b/.test(a))) e.push(`juge ${i + 1} : arguments ${JSON.stringify(j?.arguments)} (chaînes, sans --racine ni --temoin)`)
    if (!(typeof j?.loader === 'boolean' || (typeof j?.loader === 'string' && /^\.\/scripts\/[\w./-]+\.mjs$/.test(j.loader)))) e.push(`juge ${i + 1} : loader ${JSON.stringify(j?.loader)} (booléen ou ./scripts/….mjs)`)
    if (typeof j?.attendu !== 'string' || !RE_CRITERE.test(j.attendu)) e.push(`juge ${i + 1} : attendu ${JSON.stringify(j?.attendu)} (un identifiant de critère)`)
    // Absents, criteresMin et sabotages sont jugés par JA-9 et JA-8 (le diagnostic y est plus précis) ; présents, ils ont leur forme.
    if (j?.criteresMin !== undefined && !Number.isInteger(j.criteresMin)) e.push(`juge ${i + 1} : criteresMin ${JSON.stringify(j.criteresMin)} (un entier)`)
    if (j?.tailleMin !== undefined && !Number.isInteger(j.tailleMin)) e.push(`juge ${i + 1} : tailleMin ${JSON.stringify(j.tailleMin)} (un entier)`)
    if (j?.sabotages !== undefined && !Array.isArray(j.sabotages)) e.push(`juge ${i + 1} : sabotages ${JSON.stringify(j.sabotages)} (une liste)`)
  }
  if (L.temoin !== undefined && (typeof L.temoin !== 'string' || !/^\.\/[\w./-]+$/.test(L.temoin) || L.temoin.split('/').includes('..'))) e.push(`\`temoin\` ${JSON.stringify(L.temoin)} : un dossier « ./… » du lot attendu`)
  for (const c of L.controles ?? []) if (!/^JA-\d+$/.test(c?.id ?? '') || typeof c?.module !== 'string' || !/^\.\/[\w./-]+\.mjs$/.test(c.module) || c.module.includes('..') || typeof c?.fonction !== 'string') e.push(`contrôle ${JSON.stringify(c)} mal formé ({ id: 'JA-n', module: './….mjs', fonction })`)
  if (L.controles !== undefined && !Array.isArray(L.controles)) e.push('`controles` n’est pas une liste')
  if (e.length) { noter('JA-6', e); if (!SOUS) for (const id of IDS) if (id !== 'JA-6') noter(id, ['non jugé : lot.mjs refusé (JA-6)']); finir() }
  noter('JA-6', [], `${rel(FICHIER_LOT)} lisible : fiche ${L.fiche}, référence ${L.reference.slice(0, 7)}, ${L.juges.length} juge(s), ${(L.controles ?? []).length} contrôle(s) propre(s) au lot, témoin ${L.temoin ?? 'non déclaré'}`)
  if (SOUS) finir()
}
const labelJuge = (j) => `${path.basename(j.commande, '.mjs')}${j.arguments.length ? ` ${j.arguments.join(' ')}` : ''}`

// ── Le piège réseau (JA-4) ───────────────────────────────────────────────────────────────────────────────────────────────
const PIEGE = String.raw`// Piège réseau de juges-026-pilotage-preuve (JA-4), écrit par la preuve : chargé dans chaque processus par NODE_OPTIONS.
import fs from 'node:fs'
import net from 'node:net'
const J = process.env.PIEGE_RESEAU_JOURNAL
const noter = (quoi) => { try { if (J) fs.appendFileSync(J, process.pid + ' ' + quoi + '\n') } catch { /* journal indisponible */ } }
const local = (h) => { const x = String(h ?? '').replace(/^\[|\]$/g, '').toLowerCase(); return x === '127.0.0.1' || x === 'localhost' || x === '::1' || x === '::ffff:127.0.0.1' }
const origine = globalThis.fetch
if (typeof origine === 'function') {
  globalThis.fetch = function (entree, init) {
    let hote = '?'
    try { hote = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url).hostname } catch { /* adresse illisible */ }
    if (!local(hote)) { noter('fetch ' + String(entree && entree.url ? entree.url : entree).slice(0, 200)); return Promise.reject(new Error('réseau interdit hors 127.0.0.1 (piège de juges-026-pilotage-preuve) : ' + hote)) }
    return origine.call(this, entree, init)
  }
}
const connecter = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const a = Array.isArray(args[0]) ? args[0][0] : args[0]
  let hote = null
  if (a && typeof a === 'object') { if (a.path) return connecter.apply(this, args); hote = a.host ?? 'localhost' }
  else if (typeof a === 'number' || /^\d+$/.test(String(a))) hote = typeof args[1] === 'string' ? args[1] : 'localhost'
  else return connecter.apply(this, args)
  if (!local(hote)) {
    noter('connect ' + hote)
    const e = new Error('réseau interdit hors 127.0.0.1 (piège de juges-026-pilotage-preuve) : ' + hote)
    process.nextTick(() => this.destroy(e))
    return this
  }
  return connecter.apply(this, args)
}
`
fs.mkdirSync(TRAV, { recursive: true })
const FICHIER_PIEGE = exigerSousTravail(path.join(TRAV, 'piege-reseau.mjs'))
fs.writeFileSync(FICHIER_PIEGE, PIEGE)
const DOSSIER_RESEAU = exigerSousTravail(path.join(TRAV, `reseau-${LOT}`))
const DOSSIER_SORTIES = exigerSousTravail(path.join(TRAV, `sorties-${LOT}`))
for (const d of [DOSSIER_RESEAU, DOSSIER_SORTIES]) { fs.mkdirSync(d, { recursive: true }); for (const f of fs.readdirSync(d)) fs.unlinkSync(path.join(d, f)) }
const journaux = []
function envPiege(nom) {
  const journal = path.join(DOSSIER_RESEAU, `${nom}.log`)
  journaux.push({ nom, journal })
  const env = { ...process.env }
  delete env.JUGES_026_PILOTAGE_SOUS
  delete env.JUGES_026_PILOTAGE_AUTOTEST
  env.NODE_OPTIONS = [process.env.NODE_OPTIONS, `--import=${pathToFileURL(FICHIER_PIEGE).href}`].filter(Boolean).join(' ')
  env.PIEGE_RESEAU_JOURNAL = journal
  return env
}
const lu = (f) => (lireOuNull(f) ?? '').trim()
/** Lance node depuis la racine du dépôt, sous le piège ; garde la sortie sous .orchestre/travail/. */
function lancerNode(args, { nom, env: extra = {}, timeout = 600_000 } = {}) {
  const base = envPiege(nom)
  // Un NODE_OPTIONS fourni par un contrôle du lot (un piège de plus) s'ajoute au piège réseau, sans jamais le remplacer.
  const env = { ...base, ...extra, NODE_OPTIONS: [base.NODE_OPTIONS, extra.NODE_OPTIONS].filter(Boolean).join(' ') }
  const r = lancer(process.execPath, args, { cwd: R, env, timeout })
  fs.writeFileSync(path.join(DOSSIER_SORTIES, `${nom}.log`), `$ node ${args.join(' ')}\n${r.stdout}\n--- stderr ---\n${r.stderr}\n--- code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} · ${r.duree.toFixed(1)} s\n`)
  return r
}
{
  const e = []
  const r = lancerNode(['-e', "fetch('https://exemple.invalid/piege').catch(() => {}); require('node:https').get('https://exemple.invalid/piege-bis').on('error', () => {}); fetch('http://127.0.0.1:9/').catch(() => {}); setTimeout(() => {}, 300)"], { nom: 'piege-temoin' })
  const j = lu(journaux.at(-1).journal)
  if (!/fetch https:\/\/exemple\.invalid\/piege/.test(j)) e.push(`le piège n'a pas consigné un fetch vers l'extérieur (code ${r.code}, journal « ${court(j, 80)} »)`)
  if (!/connect exemple\.invalid/.test(j)) e.push('le piège n’a pas consigné un https.get vers l’extérieur')
  if (/127\.0\.0\.1/.test(j)) e.push('le piège a refusé 127.0.0.1')
  journaux.pop() // le journal du témoin du piège n'est pas une fuite
  noter('JA-4', e, 'piège réseau prouvé : un fetch et un https.get vers exemple.invalid consignés et refusés, 127.0.0.1 laissé passer')
}

// ── La référence ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let REF = null
{
  const e = []
  try {
    const c = git(['rev-parse', '--verify', `${L.reference}^{commit}`])
    if (c.code !== 0) throw new Error(`référence ${L.reference} introuvable : ${court(c.stderr)}`)
    const commit = c.stdout.trim()
    if (git(['merge-base', '--is-ancestor', commit, 'HEAD']).code !== 0) e.push(`la référence ${commit.slice(0, 7)} n'est pas un ancêtre de HEAD`)
    const absents = Array.isArray(L.absents) && L.absents.length ? L.absents : ABSENTS_DEFAUT
    const arbre = lsTree(commit)
    for (const a of absents) { const x = [...arbre.keys()].find((k) => (a.endsWith('/') ? k.startsWith(a) : k === a)); if (x) e.push(`la référence contient ${x}`) }
    if (!e.length) {
      const x = extraireReference(commit, path.join(TRAV, 'reference'))
      REF = { ...x, absents, commit }
    }
  } catch (err) { e.push(premiereLigne(err)) }
  if (e.length) noter('JA-1', e)
}

// ── Les juges : sur la référence (JA-1), puis en témoin (JA-2) ──────────────────────────────────────────────────────────
const RE_LIGNE_CRITERE = /^(✅|❌) ([A-Z0-9]{1,5}-[A-Z0-9-]+)\b/
const lignesDe = (sortie) => sortie.split(/\r?\n/).map((l) => l.trim())
/** Les lignes de critère d'une sortie de juge. → { premiere, rouges (lignes), rougesIds, vertsNets (ids verts jamais rouges) } */
function analyser(r) {
  const criteres = lignesDe(r.sortie).map((l) => { const m = RE_LIGNE_CRITERE.exec(l); return m ? { ok: m[1] === '✅', id: m[2], ligne: l } : null }).filter(Boolean)
  const rougesIds = [...new Set(criteres.filter((c) => !c.ok).map((c) => c.id))]
  return {
    code: r.code, erreur: r.erreur, premiere: criteres[0] ?? null, rouges: criteres.filter((c) => !c.ok).map((c) => c.ligne), rougesIds,
    vertsNets: new Set(criteres.filter((c) => c.ok && !rougesIds.includes(c.id)).map((c) => c.id)),
    derniere: court(r.sortie.trim().split(/\r?\n/).pop(), 140),
  }
}
const resultats = []
for (const [i, j] of L.juges.entries()) {
  const base = [...(j.loader === true ? ['--import', './scripts/ts-loader.mjs'] : typeof j.loader === 'string' ? ['--import', j.loader] : []), j.commande, ...j.arguments]
  const nom = `${i + 1}-${path.basename(j.commande, '.mjs')}${j.arguments.map((a) => a.replace(/^--/, '').replace(/[^\w-]+/g, '-')).map((a) => `-${a}`).join('')}`
  const res = { juge: j, label: labelJuge(j), base, nom, ref: null, temoin: null, extrait: null, vert: null, sabotages: [], tues: new Set(), taille: null }
  if (REF) {
    const r = lancerNode([...base, `--racine=${REF.dest}`], { nom: `${nom}.reference` })
    const premiere = lignesDe(r.sortie).find((l) => RE_LIGNE_CRITERE.test(l)) ?? null
    res.ref = { code: r.code, sortie: r.sortie, premiere, erreur: r.erreur, duree: r.duree }
    const e = []
    // ≠ 0, et un verdict (1, ou 2 si un préalable manque) : un plantage (127, 134, 0xC0000409, signal…) n'est pas un échec jugé.
    if (r.code !== 1 && r.code !== 2) e.push(`${res.label} sur la référence : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, un code de verdict ≠ 0 (1 ou 2) attendu, pas ${r.code === 0 ? 'un succès' : 'un plantage'}`)
    if (!premiere) e.push(`${res.label} sur la référence : aucune ligne de critère (plantage sans identifiant ?) — ${court(r.sortie.trim().split(/\r?\n/).pop(), 120)}`)
    else if (!premiere.startsWith(`❌ ${j.attendu} `) && premiere !== `❌ ${j.attendu}`) e.push(`${res.label} sur la référence : premier critère « ${court(premiere, 120)} », « ❌ ${j.attendu} … » attendu`)
    else res.extrait = premiere.length > 300 ? premiere.slice(0, 300) : premiere
    noter('JA-1', e)
  }
  if (!AUTOTEST) {
    const t = lancerNode([...base, '--temoin'], { nom: `${nom}.temoin` })
    const verts = lignesDe(t.sortie).filter((l) => l.startsWith('✅ ')).map((l) => RE_LIGNE_CRITERE.exec(l)?.[2]).filter(Boolean)
    const rouges = lignesDe(t.sortie).filter((l) => l.startsWith('❌ '))
    res.temoin = { code: t.code, verts, rouges, derniere: t.sortie.trim().split(/\r?\n/).pop() }
    noter('JA-2', t.code === 0 && verts.length && !rouges.length ? [] : [`${res.label} --temoin : code ${t.code}${t.erreur ? ` (${t.erreur})` : ''}${rouges.length ? `, ${court(rouges[0], 140)}` : ''}${!verts.length ? ', aucun critère vert' : ''}`],
      `${res.label} --temoin : code 0 (${verts.join(', ')})`)
  }
  resultats.push(res)
}

// ── JA-7 : le témoin vert — l'implémentation de référence du lot, posée sur l'arbre de référence ─────────────────────────
// Un juge qui échoue toujours est « rouge sur la référence » (JA-1) ; il ne sait pas être vert. Le témoin l'exige : sur une
// implémentation conforme, fournie par le lot, CHAQUE juge rend 0. L'arbre témoin reprend la référence en liens physiques
// (aucune copie de ses fichiers) ; un fichier du témoin, et plus tard chaque sabotage, REMPLACE le lien (suppression puis
// écriture) : le contenu de la référence n'est jamais touché.
const ecrireNeuf = (f, buf) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.rmSync(f, { force: true }); fs.writeFileSync(f, buf) }
let TEMOIN = null
{
  const e = []
  const RE_CHEMIN_TEMOIN = /^[\w@()[\]-][\w@()[\].-]*(?:\/[\w@()[\]-][\w@()[\].-]*)*$/
  if (typeof L.temoin !== 'string') e.push(`${rel(FICHIER_LOT)} ne déclare aucun \`temoin\` : sans implémentation de référence sur laquelle chaque juge rend 0, un juge qui échoue toujours passe pour rouge « avant l'implémentation » (faille de 026-066)`)
  else if (!REF) e.push('arbre de référence indisponible (JA-1) : le témoin se pose dessus')
  else {
    const src = path.resolve(DOSSIER_LOT, L.temoin)
    if (!sous(DOSSIER_LOT, src) || !fs.existsSync(src) || !fs.statSync(src).isDirectory()) e.push(`témoin ${rel(src)} absent (ou hors du dossier du lot)`)
    else {
      const fichiers = new Map()
      for (const f of [...listerFichiers(src)].sort()) {
        if (!f.endsWith(SUFFIXE)) { e.push(`${rel(path.join(src, f))} sans le suffixe ${SUFFIXE} (chaque fichier du témoin le porte : aucun outil du dépôt ne doit le prendre pour du code)`); continue }
        const chemin = f.slice(0, -SUFFIXE.length)
        if (!RE_CHEMIN_TEMOIN.test(chemin)) { e.push(`${f} : chemin « ${chemin} » refusé (aucun segment qui commence par un point : ni .orchestre, ni .env, ni ..)`); continue }
        const buf = fs.readFileSync(path.join(src, f))
        if (!buf.length) { e.push(`${f} : 0 octet — une preuve vide n'est pas une preuve`); continue }
        fichiers.set(chemin, buf)
      }
      if (!fichiers.size && !e.length) e.push(`témoin ${rel(src)} vide`)
      const apportes = [...fichiers.keys()].filter((k) => REF.absents.some((a) => (a.endsWith('/') ? k.startsWith(a) : k === a)))
      if (fichiers.size && !apportes.length) e.push(`le témoin n'apporte aucun des chemins absents de la référence (${REF.absents.join(', ')}) : il n'implémente rien de ce que les juges jugent`)
      if (!e.length) {
        try {
          const dest = exigerSousTravail(path.join(TRAV, `temoin-${LOT}`))
          fs.rmSync(dest, { recursive: true, force: true })
          let liens = 0, copies = 0
          for (const f of listerFichiers(REF.dest)) {
            const d = path.join(dest, f)
            fs.mkdirSync(path.dirname(d), { recursive: true })
            try { fs.linkSync(path.join(REF.dest, f), d); liens++ } catch { fs.copyFileSync(path.join(REF.dest, f), d); copies++ }
          }
          const remplaces = [...fichiers.keys()].filter((k) => fs.existsSync(path.join(dest, k)))
          for (const [k, b] of fichiers) ecrireNeuf(path.join(dest, k), b)
          TEMOIN = { src, dest, fichiers, apportes, remplaces, liens, copies }
        } catch (err) { e.push(`arbre témoin impossible à poser : ${premiereLigne(err)}`) }
      }
    }
  }
  if (e.length) noter('JA-7', e)
  for (const x of resultats) {
    if (!TEMOIN) break
    // Le témoin est posé sur la référence : ce que ses juges appellent « HEAD » (le code d'avant l'implémentation) est la
    // référence, pas le HEAD du dépôt qui bouge à chaque fiche livrée (JUGE_BASE_GIT, lu par pilotage-push-qa).
    const r = lancerNode([...x.base, `--racine=${TEMOIN.dest}`], { nom: `${x.nom}.temoin-vert`, env: { JUGE_BASE_GIT: REF.commit } })
    const a = analyser(r)
    x.vert = a
    const pb = []
    if (r.code !== 0) pb.push(`code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, 0 attendu`)
    if (a.rouges.length) pb.push(`${a.rougesIds.length} critère(s) en échec (${a.rougesIds.join(', ')}), dont « ${court(a.rouges[0], 160)} »`)
    if (!a.premiere) pb.push(`aucune ligne de critère — ${a.derniere}`)
    else if (a.premiere.id !== x.juge.attendu || !a.premiere.ok) pb.push(`premier critère « ${court(a.premiere.ligne, 80)} », « ✅ ${x.juge.attendu} … » attendu`)
    noter('JA-7', pb.map((p) => `${x.label} sur le témoin : ${p}`))
  }
  if (TEMOIN) noter('JA-7', [], `témoin ${rel(TEMOIN.src)} : ${TEMOIN.fichiers.size} fichier(s) posé(s) sur la référence sous ${rel(TEMOIN.dest)} (${TEMOIN.liens} liens physiques${TEMOIN.copies ? `, ${TEMOIN.copies} copies` : ''}), dont ${TEMOIN.apportes.length} chemin(s) absent(s) de la référence et ${TEMOIN.remplaces.length} remplacé(s) ; ${resultats.map((x) => `${x.label} → code ${x.vert?.code}, ${x.vert?.vertsNets.size ?? 0} critère(s) vert(s), aucun rouge`).join(' ; ')}`)
}

// ── JA-8 : les sabotages du témoin — chaque juge voit la faute ───────────────────────────────────────────────────────────
{
  const e = []
  for (const x of resultats) {
    const S = x.juge.sabotages
    if (!Array.isArray(S) || !S.length) { e.push(`${x.label} : aucun sabotage déclaré dans ${rel(FICHIER_LOT)} — rien ne prouve que le juge voit une implémentation fautive (un juge qui rend toujours 0 passerait JA-7)`); continue }
    if (!TEMOIN) { e.push(`${x.label} : ${S.length} sabotage(s) non joué(s), faute de témoin (JA-7)`); continue }
    const noms = new Set()
    for (const s of S) {
      const quoi = `${x.label}, sabotage « ${s?.nom} »`
      const forme = []
      if (typeof s?.nom !== 'string' || !/^[\w-]{1,60}$/.test(s.nom) || noms.has(s.nom)) forme.push('nom absent, mal formé ou en double')
      else noms.add(s.nom)
      if (typeof s?.tue !== 'string' || !RE_CRITERE.test(s.tue)) forme.push(`tue ${JSON.stringify(s?.tue)} (un identifiant de critère attendu)`)
      if (typeof s?.fichier !== 'string' || !TEMOIN.fichiers.has(s.fichier)) forme.push(`fichier ${JSON.stringify(s?.fichier)} (un fichier du témoin attendu)`)
      const retirer = s?.retirer === true
      if (retirer ? ('avant' in s || 'apres' in s) : !(typeof s?.avant === 'string' && s.avant && typeof s?.apres === 'string' && s.apres !== s.avant)) forme.push(retirer ? 'retirer: true ne prend ni avant ni apres' : '`avant` (non vide) et `apres` (différent) attendus, ou retirer: true')
      if (forme.length) { e.push(`${quoi} : ${forme.join(', ')}`); continue }
      const f = path.join(TEMOIN.dest, s.fichier), original = TEMOIN.fichiers.get(s.fichier), texte = original.toString('utf8')
      if (!retirer) { const n = texte.split(s.avant).length - 1; if (n !== 1) { e.push(`${quoi} : « ${court(s.avant, 60)} » figure ${n} fois dans ${s.fichier}, exactement 1 attendue`); continue } }
      let r
      try {
        if (retirer) fs.rmSync(f, { force: true })
        else ecrireNeuf(f, Buffer.from(texte.replace(s.avant, () => s.apres), 'utf8')) // fonction : aucun $' ni $& interprété
        r = lancerNode([...x.base, `--racine=${TEMOIN.dest}`], { nom: `${x.nom}.sabotage-${s.nom}`, env: { JUGE_BASE_GIT: REF.commit } })
      } finally { ecrireNeuf(f, original) }
      const a = analyser(r)
      const vu = a.rougesIds.includes(s.tue)
      const premierVert = a.premiere?.ok === true && a.premiere.id === x.juge.attendu
      x.sabotages.push({ nom: s.nom, tue: s.tue, code: r.code, vu, premierVert, rouges: a.rougesIds })
      if (r.code !== 1 && r.code !== 2) e.push(`${quoi} (${s.fichier}) : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, 1 (ou 2) attendu — ${r.code === 0 ? 'le juge ne voit pas la faute' : 'un plantage n’est pas un verdict'}`)
      else if (!vu) e.push(`${quoi} (${s.fichier}) : « ❌ ${s.tue} » absent de la sortie (en échec : ${a.rougesIds.join(', ') || 'rien'})`)
      else if (premierVert && s.tue !== x.juge.attendu) x.tues.add(s.tue)
    }
    if (x.tues.size < PLANCHER_TUES) e.push(`${x.label} : ${x.tues.size} critère(s) distinct(s) tué(s) par un sabotage de contenu (premier critère ${x.juge.attendu} resté vert), ${PLANCHER_TUES} au moins — un juge qui ne regarde que la présence des fichiers passerait`)
  }
  if (TEMOIN) {
    for (const [k, b] of TEMOIN.fichiers) {
      let d = null
      try { d = fs.readFileSync(path.join(TEMOIN.dest, k)) } catch { /* disparu */ }
      if (!d || !d.equals(b)) e.push(`${k} : le témoin n'est pas rétabli octet pour octet après les sabotages`)
    }
  }
  noter('JA-8', e, resultats.map((x) => `${x.label} : ${x.sabotages.length} sabotage(s) vu(s) (${x.sabotages.map((y) => `${y.nom} → ❌ ${y.tue}`).join(', ')}), ${x.tues.size} critère(s) de contenu tué(s) (${[...x.tues].join(', ')})`).join(' ; ') + ' ; témoin rétabli octet pour octet après chaque sabotage')
}

// ── JA-9 : la substance — des critères distincts (nombre lu dans le lot) et du code ─────────────────────────────────────
{
  const e = []
  for (const x of resultats) {
    const j = x.juge, min = j.criteresMin
    if (!Number.isInteger(min) || min < PLANCHER_CRITERES) e.push(`${x.label} : criteresMin ${JSON.stringify(min)} dans ${rel(FICHIER_LOT)}, un entier ≥ ${PLANCHER_CRITERES} attendu`)
    else if (!x.vert) e.push(`${x.label} : critères verts du témoin non comptés (JA-7 n'a pas tourné)`)
    else if (x.vert.vertsNets.size < min) e.push(`${x.label} : ${x.vert.vertsNets.size} critère(s) vert(s) distinct(s) sur le témoin (${[...x.vert.vertsNets].join(', ') || 'aucun'}), ${min} exigé(s) par le lot`)
    const plancher = Math.max(PLANCHER_TAILLE, Number.isInteger(j.tailleMin) ? j.tailleMin : 0)
    x.taille = Buffer.byteLength(sansCommentaires(lireOuNull(path.join(R, j.commande)) ?? '').replace(/\s+/g, ' ').trim(), 'utf8')
    x.plancherTaille = plancher
    if (x.taille < plancher) e.push(`${x.label} : ${x.taille} octets de code (commentaires ôtés, blancs réduits), ${plancher} au moins`)
  }
  noter('JA-9', e, resultats.map((x) => `${x.label} : ${x.vert?.vertsNets.size ?? '?'} critères verts distincts sur le témoin (≥ ${x.juge.criteresMin}), ${x.taille} octets de code (≥ ${x.plancherTaille})`).join(' ; '))
}
// Un autotest (JA-10) s'arrête ici : ni contrôles du lot, ni copies de JA-6, ni echecs-attendus.md, ni autotest imbriqué.
if (AUTOTEST) finir()

// ── Les contrôles propres au lot (JA-3, JA-6…) ──────────────────────────────────────────────────────────────────────────
const idsControles = new Set()
for (const c of L.controles ?? []) {
  idsControles.add(c.id)
  const f = path.resolve(DOSSIER_LOT, c.module)
  if (!sous(DOSSIER_LOT, f)) { noter(c.id, [`contrôle ${c.module} hors du dossier du lot`]); continue }
  try {
    const m = await import(pathToFileURL(f).href)
    if (typeof m[c.fonction] !== 'function') throw new Error(`${c.module} n'exporte pas ${c.fonction}`)
    let n = 0
    const r = await m[c.fonction]({ lancerNode: (args, opts = {}) => lancerNode(args, { ...opts, nom: `controle-${c.id}-${opts.nom ?? ++n}` }), racine: R, lot: LOT, reference: REF ? REF.dest : null })
    noter(c.id, Array.isArray(r?.echecs) ? r.echecs : ['le contrôle ne rend pas { echecs, detail }'], r?.detail ? `${c.fonction} : ${r.detail}` : '')
  } catch (err) { noter(c.id, [`contrôle ${c.fonction} de ${c.module} interrompu : ${premiereLigne(err)}`]) }
}
if (!idsControles.has('JA-3')) noter('JA-3', [`${rel(FICHIER_LOT)} ne déclare aucun auto-contrôle de ses jeux d'essai (contrôle « JA-3 »)`])

// ── JA-6 : la preuve refuse un lot.mjs sans fiche ou à la fiche mal formée ──────────────────────────────────────────────
{
  const e = []
  const src = fs.readFileSync(FICHIER_LOT, 'utf8')
  const RE_EXPORT = /^export\s+const\s+fiche\s*=\s*(['"`])[^'"`\n]*\1\s*;?[ \t]*\r?\n/m, RE_CLE = /^([ \t]*)fiche\s*:\s*(['"`])[^'"`\n]*\2\s*,?[ \t]*\r?\n/m
  const re = RE_EXPORT.test(src) ? RE_EXPORT : RE_CLE.test(src) ? RE_CLE : null
  if (!re || src.match(new RegExp(re.source, `${re.flags}g`)).length !== 1) e.push(`${rel(FICHIER_LOT)} : la ligne \`fiche\` introuvable ou en double, copie fautive impossible à fabriquer`)
  else {
    const d = exigerSousTravail(path.join(TRAV, `ja6-${LOT}`))
    fs.mkdirSync(d, { recursive: true })
    const copies = [
      ['sans-fiche', src.replace(re, ''), false],
      ['fiche-mal-formee', src.replace(re, re === RE_EXPORT ? "export const fiche = '26-012'\n" : "$1fiche: '26-012',\n"), false],
      ['intacte', src, true],
    ]
    for (const [nom, texte, bonne] of copies) {
      const f = path.join(d, `${nom}.mjs`)
      fs.writeFileSync(f, texte)
      const r = lancerNode([CE_SCRIPT, `--lot=${LOT}`, `--lot-fichier=${f}`], { nom: `ja6-${nom}`, env: { JUGES_026_PILOTAGE_SOUS: '1' }, timeout: 60_000 })
      const l6 = lignesDe(r.sortie).find((l) => /^(✅|❌) JA-6\b/.test(l)) ?? ''
      if (bonne && !(r.code === 0 && l6.startsWith('✅'))) e.push(`copie intacte du lot : code ${r.code}, « ${court(l6 || r.sortie, 120)} » (la copie doit passer : sinon le refus des copies fautives ne prouverait rien)`)
      if (!bonne && !(r.code !== 0 && r.code !== null && l6.startsWith('❌'))) e.push(`copie ${nom} : code ${r.code}, « ${court(l6 || r.sortie, 120)} » — refus avec ❌ JA-6 attendu`)
    }
    noter('JA-6', e, `copies sous ${rel(d)} : sans fiche → ❌ JA-6, fiche « 26-012 » → ❌ JA-6, copie intacte → ✅ JA-6`)
  }
  if (e.length) noter('JA-6', e)
}

// ── echecs-attendus.md, relu (JA-1, JA-6) ────────────────────────────────────────────────────────────────────────────────
{
  const dossier = path.join(R, '.orchestre', 'preuves', L.fiche)
  const fichier = path.join(dossier, 'echecs-attendus.md')
  const echapper = (t) => String(t).replace(/\|/g, '\\|')
  const debut = `<!-- lot:${LOT}:debut -->`, fin = `<!-- lot:${LOT}:fin -->`
  const lignes = [
    debut,
    `## Lot ${LOT} — fiche ${L.fiche} — référence \`${REF ? REF.commit.slice(0, 7) : L.reference.slice(0, 7)}\``,
    '',
    `Écrit par \`node scripts/juges-026-pilotage-preuve.mjs --lot=${LOT}\` le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par \`git archive\` (\`${REF ? rel(REF.dest) : '—'}\`), avec \`--racine\`, puis avec \`--temoin\` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (\`${TEMOIN ? rel(TEMOIN.dest) : 'aucun témoin'}\`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul \`|\` est échappé en \`\\|\`), puis relue ici et retrouvée dans la sortie par la preuve.`,
    '',
    '| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |',
    '|---|---|---|---|---|---|---|',
    ...resultats.map((x) => {
      const t = x.temoin ? (x.temoin.code === 0 ? `PASS, code 0 (${x.temoin.verts.join(', ')})` : `FAIL, code ${x.temoin.code}`) : '—'
      const v = x.vert ? (x.vert.code === 0 && !x.vert.rouges.length ? `PASS, code 0, ${x.vert.vertsNets.size} critères verts` : `FAIL, code ${x.vert.code} (${x.vert.rougesIds.join(', ') || 'aucune ligne de critère'})`) : 'aucun témoin'
      const vus = x.sabotages.filter((y) => y.vu && (y.code === 1 || y.code === 2))
      const s = Array.isArray(x.juge.sabotages) && x.juge.sabotages.length ? `${vus.length}/${x.juge.sabotages.length} (${x.sabotages.map((y) => `${y.nom} → ${y.vu ? '❌' : 'non vu :'} ${y.tue}`).join(', ')})` : 'aucun sabotage déclaré'
      return `| ${echapper(x.label)} | ${x.juge.attendu} | ${x.ref ? x.ref.code : '—'} | ${x.extrait ? echapper(x.extrait) : `(aucun : ${echapper(court(x.ref?.premiere ?? 'juge non lancé', 100))})`} | ${echapper(t)} | ${echapper(v)} | ${echapper(s)} |`
    }),
    fin,
  ]
  const e = [], e6 = []
  try {
    if (!sous(path.join(R, '.orchestre', 'preuves'), fichier) || path.basename(dossier) !== L.fiche) throw new Error(`section à écrire hors du dossier de preuves de ${L.fiche}`)
    fs.mkdirSync(dossier, { recursive: true })
    const existant = lireOuNull(fichier)
    const i = existant ? existant.indexOf(debut) : -1, k = existant ? existant.indexOf(fin) : -1
    const tete = `# Échecs attendus des juges du Pilotage sur leur arbre de référence\n\nUne section par lot ; chacune est réécrite par la preuve à chaque passage.\n\n`
    const texte = existant && i >= 0 && k > i
      ? `${existant.slice(0, i)}${lignes.join('\n')}${existant.slice(k + fin.length)}`
      : `${existant ? `${existant.replace(/\s*$/, '')}\n\n` : tete}${lignes.join('\n')}\n`
    fs.writeFileSync(fichier, texte)
    // Relecture : chaque extrait recopié doit se retrouver dans la sortie que la preuve vient de produire.
    const relu = fs.readFileSync(fichier, 'utf8')
    const section = relu.slice(relu.indexOf(debut), relu.indexOf(fin))
    const rangs = section.split(/\r?\n/).filter((l) => l.startsWith('| ') && !l.startsWith('| Juge') && !l.startsWith('|---'))
    if (!section.startsWith(debut)) e6.push(`la section « lot ${LOT} » est introuvable dans ${rel(fichier)} après écriture`)
    const cellules = (l) => l.slice(2, -2).split(/(?<!\\) \| /).map((c) => c.replace(/\\\|/g, '|'))
    for (const x of resultats) {
      if (!x.extrait) continue
      const rang = rangs.find((l) => cellules(l)[0] === x.label)
      const extrait = rang ? cellules(rang)[3] : null
      if (!extrait) e.push(`${x.label} : aucune ligne dans ${rel(fichier)}`)
      else if (!x.ref.sortie.includes(extrait)) e.push(`${x.label} : l'extrait recopié « ${court(extrait, 80)} » ne se retrouve pas dans la sortie produite`)
      else if (!extrait.startsWith(`❌ ${x.juge.attendu}`)) e.push(`${x.label} : l'extrait recopié ne porte pas ${x.juge.attendu}`)
    }
    if (rangs.length !== resultats.length) e.push(`${rangs.length} ligne(s) dans la section du lot, ${resultats.length} attendue(s)`)
  } catch (err) { e6.push(`${rel(fichier)} : ${premiereLigne(err)}`) }
  const ok = resultats.filter((x) => x.extrait)
  noter('JA-1', e, REF ? `référence ${REF.commit.slice(0, 7)} ${REF.reutilise ? 'réutilisée (identique blob pour blob)' : 'extraite par git archive'} sous ${rel(REF.dest)} (${REF.fichiers} fichiers), ancêtre de HEAD, sans ${REF.absents.join(', ')} ; ${ok.map((x) => `${x.label} → code ${x.ref.code}, « ${court(x.extrait, 70)} »`).join(' ; ')} ; extraits recopiés dans ${rel(fichier)}, relus et retrouvés dans les sorties` : '')
  if (e6.length && !e.length) e.push('echecs-attendus.md non écrit ou illisible : les extraits ne sont pas relus (JA-6)')
  noter('JA-6', e6, `section « lot ${LOT} » écrite dans ${rel(fichier)} (dossier de preuves de ${L.fiche})`)
}

// ── JA-10 : les autotests — la preuve refuse un juge toujours rouge, toujours vert, ou aveugle au contenu ──────────────
// Elle se relance sur quatre lots factices (même référence, même témoin : un fichier de règles) qui ne diffèrent que par
// leur juge. Le cas conforme doit PASSER : sans lui, les trois refus ne prouveraient rien.
{
  const e = [], vus = []
  const DOSSIER_AT = path.join(R, 'scripts', 'fixtures', '026-pilotage', '_autotest')
  const tous = (v, ids) => ids.every((id) => v.ids[id] === '✅')
  const CAS = [
    ['conforme', 'un juge qui voit le témoin vert et chaque sabotage', (v) => v.code === 0 && tous(v, ['JA-1', 'JA-7', 'JA-8', 'JA-9']), 'PASS, code 0, JA-1 JA-7 JA-8 JA-9 verts'],
    ['toujours-rouge', 'un juge qui sort toujours en 1', (v) => v.code === 1 && v.ids['JA-7'] === '❌', 'FAIL, code 1, ❌ JA-7 (témoin pas vert)'],
    ['toujours-vert', 'un juge qui sort toujours en 0', (v) => v.code === 1 && v.ids['JA-1'] === '❌' && v.ids['JA-8'] === '❌', 'FAIL, code 1, ❌ JA-1 (pas rouge sur la référence) et ❌ JA-8 (sabotages non vus)'],
    ['presence-seule', 'un juge qui ne regarde que la présence du fichier', (v) => v.code === 1 && v.ids['JA-8'] === '❌', 'FAIL, code 1, ❌ JA-8 (sabotages de contenu non vus)'],
  ]
  for (const [cas, quoi, ok, attendu] of CAS) {
    const f = path.join(DOSSIER_AT, `lot-${cas}.mjs`)
    if (!fs.existsSync(f)) { e.push(`${rel(f)} absent`); continue }
    const r = lancerNode([CE_SCRIPT, `--lot=autotest-${cas}`, `--lot-fichier=${f}`], { nom: `ja10-${cas}`, env: { JUGES_026_PILOTAGE_AUTOTEST: '1' }, timeout: 900_000 })
    const ids = {}
    for (const l of lignesDe(r.sortie)) { const m = /^(✅|❌) (JA-\d+)\b/.exec(l); if (m) ids[m[2]] = m[1] }
    const v = { code: r.code, ids }
    const resume = `code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, ${Object.entries(ids).map(([k, x]) => `${x} ${k}`).join(' ') || 'aucune ligne de critère'}`
    vus.push(`${cas} → ${resume}`)
    if (!ok(v)) e.push(`autotest « ${cas} » (${quoi}) : ${resume} ; ${attendu} attendu`)
  }
  noter('JA-10', e, `la preuve relancée sur les quatre lots factices de ${rel(DOSSIER_AT)} (JUGES_026_PILOTAGE_AUTOTEST=1) : ${vus.join(' ; ')}`)
}

// ── JA-4 : aucun journal du piège ne s'est rempli ; JA-5 : rien n'a bougé ──────────────────────────────────────────────
{
  const fuites = journaux.map((x) => ({ ...x, texte: lu(x.journal) })).filter((x) => x.texte)
  noter('JA-4', fuites.map((x) => `${x.nom} : ${court(x.texte.split('\n')[0], 120)}`), `${journaux.length} lancements sous le piège (juges sur la référence, en témoin, sur l'implémentation de référence et ses sabotages, contrôles du lot, copies de JA-6, autotests de JA-10) : aucun accès au réseau hors 127.0.0.1`)
}
if (avant) {
  try {
    const apres = etatDepot()
    const d = []
    for (const [k, v] of avant) if (!apres.has(k)) d.push(`${k} revenu propre ou disparu`); else if (apres.get(k) !== v) d.push(`${k} modifié (${v.split('|')[0].trim() || 'suivi'})`)
    for (const k of apres.keys()) if (!avant.has(k)) d.push(`${k} apparu dans git status`)
    noter('JA-5', d, `git status --porcelain identique avant et après (${avant.size} entrée(s) hors ${HORS_JA5.join(' et ')} et le reste de .orchestre/ sauf .orchestre/decisions.md, taille et date de chacune comprises)`)
  } catch (e) { noter('JA-5', [`état final illisible : ${premiereLigne(e)}`]) }
}
finir()
