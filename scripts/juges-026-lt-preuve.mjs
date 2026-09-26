// scripts/juges-026-lt-preuve.mjs — la preuve des juges du domaine « livraison et trésorerie » (fiche 026-018), écrite par
// Claude Code. Elle ne connaît aucun juge : elle lit scripts/fixtures/026-livraison-tresor/preuve-<lot>.json (lot A : les
// juges de 026-018 ; B, C, D : ceux de 026-023, 026-029, 026-026, qui s'ajoutent sans toucher ce script).
//
//   node scripts/juges-026-lt-preuve.mjs --lot=A|B|C|D [--preuve-fichier=<json sous .orchestre/travail/>]
//
// preuve-<lot>.json : { lot, fiche, reference, absents_de_la_reference, chemins_reference, juges: [{ commande,
// echec_attendu, cite, fiche_jugee }] } ; `commande` est la ligne exacte du `verifier` de la fiche jugée (« node
// [--import ./scripts/ts-loader.mjs] scripts/x-qa.mjs [arguments] ») ; les lots B à D portent la référence du lot A.
// --preuve-fichier (auto-contrôle de la preuve seulement) : un autre fichier de lot, sous .orchestre/travail/ ; ses
// juges peuvent alors être des scripts de .orchestre/travail/.
//
// Elle produit elle-même toutes ses preuves (aucun journal déposé par quelqu'un d'autre n'est lu) :
//   JL-1  l'arbre de référence (le commit du lot, ancêtre de HEAD, sans les fichiers jugés) est extrait par `git archive`
//         sous .orchestre/travail/026-lt-preuve/reference/ (rien n'est écrit dans .git) ; chaque juge, lancé avec
//         --racine=<référence>, sort en code 1 ou 2 (un verdict, pas un plantage), sans pile d'exception, et sa PREMIÈRE
//         ligne de critère est « ❌ <echec_attendu> … » et cite `cite` (le fichier ou la fonction absente) ; l'extrait
//         réel est recopié dans echecs-attendus.md, relu, et retrouvé dans la sortie qui vient d'être produite ;
//   JL-2  chaque juge, lancé avec --temoin sur l'arbre courant, sort en code 0, sans critère rouge, avec au moins un
//         critère « (NR) » vert ;
//   JL-3  chaque lancement tourne sous un piège réseau chargé dans chaque processus par NODE_OPTIONS=--import : fetch et
//         net.Socket#connect hors 127.0.0.1 sont refusés et consignés ; le piège prouve d'abord qu'il attrape un fetch
//         vers api.stripe.com et un https.get vers api.resend.com, et laisse passer 127.0.0.1 ; puis 0 appel consigné,
//         dont 0 vers api.resend.com, api.stripe.com, api.github.com et *.supabase.co ;
//   JL-4  chaque juge, lancé avec --temoin sur une copie (app/, lib/, supabase/ sous .orchestre/travail/026-lt-preuve/
//         copie/) : intacte → code 0 ; avec un verifier.log de 0 octet dans .orchestre/preuves/<fiche jugée>/ de la
//         copie → code ≠ 0 et une ligne « ❌ <P>-PV » qui cite verifier.log ;
//   JL-5  `git status --porcelain` (fichiers non suivis compris) ne montre rien de nouveau hors scripts/,
//         .orchestre/travail/ et .orchestre/preuves/.
//
// Sortie : une ligne par critère (« ✅ JL-3 … » ou « ❌ JL-3 … »), puis « juges-026-lt-preuve --lot=<x> : PASS|FAIL ». Code 0
// seulement si tout est vert ; 1 sinon ; 2 si l'appel est invalide. N'écrit que sous .orchestre/travail/026-lt-preuve/ et
// dans .orchestre/preuves/<fiche du lot>/echecs-attendus.md ; ne lit ni .env.local ni presti-secrets.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  R, TRAVAIL, PREUVE_A, court, premiereLigne, lancer, git, lireOptions, lsTree, extraireReference, exigerSousTravail,
  lireOuNull, sous, dossierTravail,
} from './fixtures/026-livraison-tresor/commun.mjs'

const JUGE = 'juges-026-lt-preuve'
const LOTS = { A: '026-018', B: '026-023', C: '026-029', D: '026-026' }
const o = lireOptions(process.argv.slice(2), { connues: ['lot', 'preuve-fichier'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const LOT = o.valeurs.lot
if (!LOT || !LOTS[LOT]) refuser(`--lot=A|B|C|D attendu (reçu : ${LOT ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length || o.valeurs.racine || o.temoin || o.reel) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ') || '--racine / --temoin / --reel (options des juges, pas de la preuve)'}`)
const ESSAI = !!o.valeurs['preuve-fichier']
const FICHIER = ESSAI ? path.resolve(R, o.valeurs['preuve-fichier']) : path.join(R, 'scripts', 'fixtures', '026-livraison-tresor', `preuve-${LOT.toLowerCase()}.json`)
if (ESSAI && !sous(TRAVAIL, FICHIER)) refuser('--preuve-fichier doit désigner un fichier sous .orchestre/travail/')
const TRAV = path.join(TRAVAIL, '026-lt-preuve')
const NOM = `${JUGE} --lot=${LOT}`
const IDS = ['JL-1', 'JL-2', 'JL-3', 'JL-4', 'JL-5']
const posix = (p) => p.split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'
const RE_CRITERE = /^[A-Z0-9]{1,5}-[A-Z0-9-]+$/
const RE_LIGNE = /^(✅|❌) ([A-Z0-9]{1,5}-[A-Z0-9-]+)\b/
const lignesDe = (sortie) => sortie.split(/\r?\n/).map((l) => l.trim())
const PILE = /^\s+at (?:.+ \()?(?:file:|node:|[A-Za-z]:\\|\/).+:\d+:\d+\)?$/m

const verdicts = new Map()
const noter = (id, echecs, detail) => { const v = verdicts.get(id) ?? { echecs: [], details: [] }; v.echecs.push(...echecs); if (detail) v.details.push(detail); verdicts.set(id, v) }
const ligne = (t) => String(t ?? '').replace(/\s*\r?\n\s*/g, ' · ').trim()
function finir() {
  console.log(`${NOM} — ${rel(FICHIER)}${ESSAI ? ' (auto-contrôle)' : ''}`)
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

// ── JL-5 : l'état du dépôt, avant ────────────────────────────────────────────────────────────────────────────────────────
const PERMIS_JL5 = ['scripts/', '.orchestre/travail/', '.orchestre/preuves/']
function etatDepot() {
  const r = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  if (r.code !== 0) throw new Error(`git status : ${court(r.stderr || r.erreur)}`)
  const m = new Map()
  const e = r.stdout.split('\0')
  for (let i = 0; i < e.length; i++) {
    if (!e[i]) continue
    const statut = e[i].slice(0, 2), chemin = e[i].slice(3)
    if (/[RC]/.test(statut)) i++
    m.set(chemin, statut)
  }
  return m
}
let avant = null
try { avant = etatDepot() } catch (e) { noter('JL-5', [`état initial illisible : ${premiereLigne(e)}`]) }

// ── Le fichier du lot ────────────────────────────────────────────────────────────────────────────────────────────────────
let L = null
{
  const e = []
  try { L = JSON.parse(fs.readFileSync(FICHIER, 'utf8')) } catch (err) { e.push(`${rel(FICHIER)} illisible : ${premiereLigne(err)}`) }
  if (L) {
    if (L.lot !== LOT) e.push(`lot ${JSON.stringify(L.lot)} dans ${rel(FICHIER)}, ${LOT} attendu`)
    if (L.fiche !== LOTS[LOT]) e.push(`fiche ${JSON.stringify(L.fiche)}, ${LOTS[LOT]} attendue pour le lot ${LOT}`)
    if (!/^[0-9a-f]{40}$/.test(L.reference ?? '')) e.push(`reference ${JSON.stringify(L.reference)} : un sha complet attendu`)
    if (LOT !== 'A' && L.reference !== PREUVE_A?.reference) e.push(`le lot ${LOT} doit relire la référence du lot A (${String(PREUVE_A?.reference).slice(0, 7)}), il porte ${String(L.reference).slice(0, 7)}`)
    if (!Array.isArray(L.juges) || !L.juges.length) e.push('juges vide ou absent')
    const scriptPermis = ESSAI ? /^(?:scripts|\.orchestre\/travail)\/[\w./-]+\.mjs$/ : /^scripts\/[\w./-]+\.mjs$/
    for (const [i, j] of (L.juges ?? []).entries()) {
      const m = /^node(?: --import \.\/scripts\/ts-loader\.mjs)? (\S+\.mjs)((?: --[\w-]+(?:=[\w.,-]+)?)*)$/.exec(j?.commande ?? '')
      if (!m || !scriptPermis.test(m[1]) || m[1].includes('..') || !fs.existsSync(path.join(R, m[1]))) e.push(`juge ${i + 1} : commande ${JSON.stringify(j?.commande)} (« node [--import ./scripts/ts-loader.mjs] scripts/….mjs [--option=valeur…] » d'un script existant attendu)`)
      else if (/--(?:racine|temoin|reel)\b/.test(m[2])) e.push(`juge ${i + 1} : la commande porte déjà --racine, --temoin ou --reel`)
      if (!RE_CRITERE.test(j?.echec_attendu ?? '')) e.push(`juge ${i + 1} : echec_attendu ${JSON.stringify(j?.echec_attendu)}`)
      if (typeof j?.cite !== 'string' || !j.cite.trim()) e.push(`juge ${i + 1} : cite absent (le fichier ou la fonction que la ligne d'échec doit nommer)`)
      if (!/^026-\d{3}$/.test(j?.fiche_jugee ?? '')) e.push(`juge ${i + 1} : fiche_jugee ${JSON.stringify(j?.fiche_jugee)}`)
    }
  }
  if (e.length) { for (const id of IDS) if (id !== 'JL-5') noter(id, id === 'JL-1' ? e : ['non jugé : fichier du lot refusé (JL-1)']); if (!verdicts.has('JL-5')) noter('JL-5', [], 'rien lancé'); finir() }
}
const decouper = (j) => {
  const m = /^node(?: --import (\.\/scripts\/ts-loader\.mjs))? (\S+\.mjs)((?: --[\w-]+(?:=[\w.,-]+)?)*)$/.exec(j.commande)
  return { loader: m[1] ?? null, script: m[2], args: m[3].trim() ? m[3].trim().split(' ') : [] }
}
const labelJuge = (j) => { const d = decouper(j); return `${path.basename(d.script, '.mjs')}${d.args.length ? ` ${d.args.join(' ')}` : ''}` }

// ── Le piège réseau (JL-3) ───────────────────────────────────────────────────────────────────────────────────────────────
const PIEGE = String.raw`// Piège réseau de juges-026-lt-preuve (JL-3), écrit par la preuve : chargé dans chaque processus par NODE_OPTIONS.
import fs from 'node:fs'
import net from 'node:net'
const J = process.env.PIEGE_LT_JOURNAL
const noter = (quoi) => { try { if (J) fs.appendFileSync(J, process.pid + ' ' + quoi + '\n') } catch { /* journal indisponible */ } }
const local = (h) => { const x = String(h ?? '').replace(/^\[|\]$/g, '').toLowerCase(); return x === '127.0.0.1' || x === 'localhost' || x === '::1' || x === '::ffff:127.0.0.1' }
const origine = globalThis.fetch
if (typeof origine === 'function') {
  globalThis.fetch = function (entree, init) {
    let hote = '?'
    try { hote = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url).hostname } catch { /* illisible */ }
    if (!local(hote)) { noter('fetch ' + hote + ' ' + String(entree && entree.url ? entree.url : entree).slice(0, 160)); return Promise.reject(new Error('réseau interdit hors 127.0.0.1 (piège de juges-026-lt-preuve) : ' + hote)) }
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
    const e = new Error('réseau interdit hors 127.0.0.1 (piège de juges-026-lt-preuve) : ' + hote)
    process.nextTick(() => this.destroy(e))
    return this
  }
  return connecter.apply(this, args)
}
`
fs.mkdirSync(TRAV, { recursive: true })
const FICHIER_PIEGE = exigerSousTravail(path.join(TRAV, 'piege-reseau.mjs'))
fs.writeFileSync(FICHIER_PIEGE, PIEGE)
const DOSSIER_RESEAU = dossierTravail('026-lt-preuve', `reseau-${LOT}`)
const DOSSIER_SORTIES = dossierTravail('026-lt-preuve', `sorties-${LOT}`)
const journaux = []
/** Lance node depuis la racine du dépôt, sous le piège ; garde la sortie sous .orchestre/travail/026-lt-preuve/. */
function lancerNode(args, { nom, timeout = 600_000 } = {}) {
  const journal = path.join(DOSSIER_RESEAU, `${nom}.log`)
  journaux.push({ nom, journal })
  const env = { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(FICHIER_PIEGE).href}`].filter(Boolean).join(' '), PIEGE_LT_JOURNAL: journal }
  const r = lancer(process.execPath, args, { cwd: R, env, timeout })
  fs.writeFileSync(path.join(DOSSIER_SORTIES, `${nom}.log`), `$ node ${args.join(' ')}\n${r.stdout}\n--- stderr ---\n${r.stderr}\n--- code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} · ${r.duree.toFixed(1)} s\n`)
  return r
}
const lu = (f) => (lireOuNull(f) ?? '').trim()
{
  const e = []
  const r = lancerNode(['-e', "fetch('https://api.stripe.com/v1/piege').catch(() => {}); require('node:https').get('https://api.resend.com/piege').on('error', () => {}); fetch('http://127.0.0.1:9/').catch(() => {}); setTimeout(() => {}, 300)"], { nom: 'piege-temoin', timeout: 60_000 })
  const j = lu(journaux.at(-1).journal)
  if (!/fetch api\.stripe\.com/.test(j)) e.push(`le piège n'a pas consigné un fetch vers api.stripe.com (code ${r.code}, journal « ${court(j, 80)} »)`)
  if (!/connect api\.resend\.com/.test(j)) e.push('le piège n’a pas consigné un https.get vers api.resend.com')
  if (/127\.0\.0\.1/.test(j)) e.push('le piège a refusé 127.0.0.1')
  journaux.pop()
  noter('JL-3', e, 'piège prouvé : un fetch vers api.stripe.com et un https.get vers api.resend.com consignés et refusés, 127.0.0.1 laissé passer')
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
    const arbre = lsTree(commit)
    for (const a of L.absents_de_la_reference ?? []) { const x = [...arbre.keys()].find((k) => k === a || k.startsWith(a.endsWith('/') ? a : `${a}/`)); if (x) e.push(`la référence contient ${x}`) }
    for (const j of L.juges) if (arbre.has(j.cite)) e.push(`la référence contient ${j.cite}, que la ligne d'échec de ${labelJuge(j)} doit dire absent`)
    if (!e.length) REF = { ...extraireReference(commit, path.join(TRAV, 'reference'), L.chemins_reference ?? []) }
  } catch (err) { e.push(premiereLigne(err)) }
  if (e.length) noter('JL-1', e)
}

// ── Les juges : sur la référence (JL-1), puis en témoin (JL-2) ──────────────────────────────────────────────────────────
const resultats = []
for (const [i, j] of L.juges.entries()) {
  const d = decouper(j)
  const base = [...(d.loader ? ['--import', d.loader] : []), d.script, ...d.args]
  const nom = `${i + 1}-${path.basename(d.script, '.mjs')}`
  const res = { juge: j, label: labelJuge(j), ref: null, temoin: null, extrait: null }
  if (REF) {
    const r = lancerNode([...base, `--racine=${REF.dest}`], { nom: `${nom}.reference` })
    const premiere = lignesDe(r.sortie).find((l) => RE_LIGNE.test(l)) ?? null
    res.ref = { code: r.code, sortie: r.sortie, premiere }
    const e = []
    if (r.code !== 1 && r.code !== 2) e.push(`${res.label} sur la référence : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, un verdict ≠ 0 (1 ou 2) attendu, pas ${r.code === 0 ? 'un succès' : 'un plantage'}`)
    if (PILE.test(r.stderr) || PILE.test(r.stdout)) e.push(`${res.label} sur la référence : pile d'exception non rattrapée — ${court(r.stderr.split(/\r?\n/).find((l) => /Error/.test(l)) ?? r.stderr, 120)}`)
    if (!premiere) e.push(`${res.label} sur la référence : aucune ligne de critère — ${court(r.sortie.trim().split(/\r?\n/).pop(), 120)}`)
    else if (!premiere.startsWith(`❌ ${j.echec_attendu} `) && premiere !== `❌ ${j.echec_attendu}`) e.push(`${res.label} sur la référence : premier critère « ${court(premiere, 120)} », « ❌ ${j.echec_attendu} … » attendu`)
    else if (!premiere.includes(j.cite)) e.push(`${res.label} sur la référence : la ligne d'échec « ${court(premiere, 120)} » ne cite pas ${j.cite}`)
    else res.extrait = premiere.length > 300 ? premiere.slice(0, 300) : premiere
    noter('JL-1', e)
  }
  const t = lancerNode([...base, '--temoin'], { nom: `${nom}.temoin` })
  const lignes = lignesDe(t.sortie)
  const nr = lignes.filter((l) => /^✅ [A-Z0-9]{1,5}-[A-Z0-9-]+ \(NR\)/.test(l)).map((l) => RE_LIGNE.exec(l)[2])
  const rouges = lignes.filter((l) => l.startsWith('❌ '))
  res.temoin = { code: t.code, nr, rouges }
  noter('JL-2', t.code === 0 && nr.length && !rouges.length ? [] : [`${res.label} --temoin : code ${t.code}${t.erreur ? ` (${t.erreur})` : ''}${rouges.length ? `, ${court(rouges[0], 140)}` : ''}${!nr.length ? ', aucun critère (NR) vert' : ''}`],
    `${res.label} --temoin : code 0, NR vert${nr.length > 1 ? 's' : ''} ${nr.join(', ')}`)
  resultats.push(res)
}

// ── JL-4 : une preuve de 0 octet, dans une copie ─────────────────────────────────────────────────────────────────────────
{
  const e = []
  try {
    const copie = dossierTravail('026-lt-preuve', 'copie')
    for (const d of ['app', 'lib', 'supabase']) fs.cpSync(path.join(R, d), path.join(copie, d), { recursive: true })
    for (const [i, j] of L.juges.entries()) {
      const d = decouper(j)
      const base = [...(d.loader ? ['--import', d.loader] : []), d.script, ...d.args, `--racine=${copie}`, '--temoin']
      const nom = `${i + 1}-${path.basename(d.script, '.mjs')}`
      const intacte = lancerNode(base, { nom: `${nom}.copie-intacte`, timeout: 300_000 })
      if (intacte.code !== 0) { e.push(`${labelJuge(j)} --temoin sur la copie intacte : code ${intacte.code} (${court(lignesDe(intacte.sortie).find((l) => l.startsWith('❌')) ?? intacte.sortie.trim().split(/\r?\n/).pop(), 120)}) — sans cette copie verte, le refus d'une preuve vide ne prouverait rien`); continue }
      const dossierPreuves = exigerSousTravail(path.join(copie, '.orchestre', 'preuves', j.fiche_jugee))
      fs.mkdirSync(dossierPreuves, { recursive: true })
      const vide = path.join(dossierPreuves, 'verifier.log')
      fs.writeFileSync(vide, '')
      const r = lancerNode(base, { nom: `${nom}.copie-preuve-vide`, timeout: 300_000 })
      fs.unlinkSync(vide)
      const pv = lignesDe(r.sortie).find((l) => /^❌ [A-Z0-9]{1,5}-PV\b/.test(l))
      if (r.code === 0 || !pv || !/verifier\.log/.test(pv)) e.push(`${labelJuge(j)} --temoin avec un verifier.log de 0 octet : code ${r.code}, ${pv ? `« ${court(pv, 100)} »` : 'aucune ligne « ❌ <P>-PV »'} — un refus qui cite verifier.log attendu`)
      else noter('JL-4', [], `${labelJuge(j)} : copie intacte → code 0 ; verifier.log de 0 octet → code ${r.code}, « ${court(pv, 90)} »`)
    }
  } catch (err) { e.push(`copie impossible : ${premiereLigne(err)}`) }
  noter('JL-4', e)
}

// ── echecs-attendus.md, relu (JL-1) ──────────────────────────────────────────────────────────────────────────────────────
{
  const dossier = path.join(R, '.orchestre', 'preuves', L.fiche)
  const fichier = path.join(dossier, 'echecs-attendus.md')
  const echapper = (t) => String(t).replace(/\|/g, '\\|')
  const e = []
  if (!ESSAI) {
    try {
      const lignesMd = [
        `# Échecs attendus des juges du lot ${LOT} (${L.fiche}) sur leur arbre de référence`,
        '',
        `Écrit par \`node scripts/juges-026-lt-preuve.mjs --lot=${LOT}\` le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par \`git archive\` (\`${REF ? rel(REF.dest) : '—'}\`), avec \`--racine\`, puis avec \`--temoin\` sur l'arbre courant. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul \`|\` est échappé en \`\\|\`), puis relue ici et retrouvée dans la sortie par la preuve.`,
        '',
        '| Juge | Fiche jugée | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Verdict du témoin |',
        '|---|---|---|---|---|---|---|',
        ...resultats.map((x) => `| ${echapper(x.label)} | ${x.juge.fiche_jugee} | \`${REF ? REF.commit.slice(0, 7) : L.reference.slice(0, 7)}\` | ${x.juge.echec_attendu} | ${x.ref ? x.ref.code : '—'} | ${x.extrait ? echapper(x.extrait) : `(aucun : ${echapper(court(x.ref?.premiere ?? 'juge non lancé', 100))})`} | ${x.temoin.code === 0 && x.temoin.nr.length && !x.temoin.rouges.length ? `PASS, code 0 (NR : ${x.temoin.nr.join(', ')})` : `FAIL, code ${x.temoin.code}`} |`),
        '',
      ]
      fs.mkdirSync(dossier, { recursive: true })
      fs.writeFileSync(fichier, lignesMd.join('\n'))
      const relu = fs.readFileSync(fichier, 'utf8')
      if (!relu.length) e.push(`${rel(fichier)} fait 0 octet après écriture`)
      const rangs = relu.split(/\r?\n/).filter((l) => l.startsWith('| ') && !l.startsWith('| Juge') && !l.startsWith('|---'))
      const cellules = (l) => l.slice(2, -2).split(/(?<!\\) \| /).map((c) => c.replace(/\\\|/g, '|'))
      for (const x of resultats) {
        if (!x.extrait) continue
        const rang = rangs.find((l) => cellules(l)[0] === x.label)
        const extrait = rang ? cellules(rang)[5] : null
        if (!extrait) e.push(`${x.label} : aucune ligne dans ${rel(fichier)}`)
        else if (!x.ref.sortie.includes(extrait)) e.push(`${x.label} : l'extrait recopié « ${court(extrait, 80)} » ne se retrouve pas dans la sortie produite`)
        else if (!extrait.startsWith(`❌ ${x.juge.echec_attendu}`)) e.push(`${x.label} : l'extrait recopié ne porte pas ${x.juge.echec_attendu}`)
      }
      if (rangs.length !== resultats.length) e.push(`${rangs.length} ligne(s) dans ${rel(fichier)}, ${resultats.length} attendue(s)`)
    } catch (err) { e.push(`${rel(fichier)} : ${premiereLigne(err)}`) }
  }
  const ok = resultats.filter((x) => x.extrait)
  noter('JL-1', e, REF ? `référence ${REF.commit.slice(0, 7)} ${REF.reutilise ? 'réutilisée (identique blob pour blob)' : 'extraite par git archive'} sous ${rel(REF.dest)} (${REF.fichiers} fichiers), ancêtre de HEAD, sans ${(L.absents_de_la_reference ?? []).join(', ')} ; ${ok.map((x) => `${x.label} → code ${x.ref.code}, « ${court(x.extrait, 70)} »`).join(' ; ')}${ESSAI ? '' : ` ; extraits recopiés dans ${rel(fichier)}, relus et retrouvés dans les sorties`}` : '')
}

// ── JL-3 : aucun journal du piège ne s'est rempli ; JL-5 : rien de nouveau hors des dossiers permis ─────────────────────
{
  const fuites = journaux.map((x) => ({ ...x, texte: lu(x.journal) })).filter((x) => x.texte)
  const vise = (h) => fuites.filter((x) => x.texte.includes(h)).length
  noter('JL-3', fuites.map((x) => `${x.nom} : ${court(x.texte.split('\n')[0], 120)}`),
    `${journaux.length} lancements sous le piège (juges sur la référence, en témoin et sur la copie) : 0 appel réseau hors 127.0.0.1, dont ${vise('api.resend.com')} vers api.resend.com, ${vise('api.stripe.com')} vers api.stripe.com, ${vise('api.github.com')} vers api.github.com, ${vise('supabase.co')} vers le projet Supabase`)
}
if (avant) {
  try {
    const apres = etatDepot()
    const d = []
    for (const [k, v] of apres) {
      if (PERMIS_JL5.some((p) => k.startsWith(p))) continue
      if (!avant.has(k)) d.push(`${k} apparu dans git status (${v.trim() || v})`)
      else if (avant.get(k) !== v) d.push(`${k} : statut ${avant.get(k).trim()} → ${v.trim()}`)
    }
    noter('JL-5', d, `git status --porcelain : rien de nouveau hors ${PERMIS_JL5.join(', ')} (${apres.size} entrée(s) relues)`)
  } catch (e) { noter('JL-5', [`état final illisible : ${premiereLigne(e)}`]) }
}
finir()
