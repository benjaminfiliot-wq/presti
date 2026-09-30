#!/usr/bin/env node
// presti-ops/usine/revue-codex.mjs — Codex relit une fiche de l'orchestre SUR L'USINE, en juge indépendant (27/09/2026).
//
//   cd presti && node ../presti-ops/usine/revue-codex.mjs <id> [--sabotages=4] [--delai=90] [--delai-juge=15]
//                                                            [--modele=gpt-6-sol] [--effort=medium] [--reseau] [--a-sec]
//
// Codes : 0 vert · 1 rouge (défaut établi) · 2 usage · 3 Codex à bout de quota · 125 pas jugé (paquet refusé, usine
// injoignable, délai, Codex muet, verdict non conforme, revue incomplète, juge instable). Jamais un faux vert : decider().
// --a-sec : construit le coureur et la consigne (écrits dans .orchestre/travail/revue-codex/<id>/), contrôle leur syntaxe,
// rien ne part sur l'usine.
//
// Le trajet. La fiche (.orchestre/en-cours/ ou fait/) → `node scripts/usine.mjs executer --nom=rc-<id> --id=<id>
// --rapatrier=.orchestre/travail/revue-codex/<id> -- node -e <chargeur> <coureur compressé>` : le bac = HEAD du PC + ses
// non-commités (paquet contrôlé par usine.mjs, qui refuse tout fichier qui ressemble à un secret → 125 ici). Dans le bac,
// le COUREUR (la fonction coureur plus bas, sérialisée) :
//  1. relève l'état de l'arbre (git write-tree sur un index temporaire, .orchestre/ exclu) et lance une première fois le
//     verifier exact de la fiche, hors bac à sable : le témoin (passage n°0) ;
//  2. lance `codex exec` : abonnement ChatGPT seul (-c model_provider=openai : aucun relais vers Ollama Cloud ni freellmapi,
//     aucun conseiller — c'est ce qui permet de relire une fiche de prospects), -s workspace-write, réseau coupé sauf
//     --reseau, avec la consigne (consigne()) ;
//  3. sert les demandes de Codex. Codex ne lance pas le verifier lui-même (pas de réseau dans son bac à sable, et ce qu'il
//     en dirait serait invérifiable) : `node <dossier>/juge.cjs temoin | sabotage "quoi"` pose une demande ; le coureur
//     relève l'état, lance le verifier, note n°, fichiers changés, code. Ce relevé, tenu hors de portée de Codex
//     (~/.revue-codex/<jeton>/ : Codex n'écrit que dans le bac et /tmp), est le seul qui compte ;
//  4. rend .orchestre/travail/revue-codex/<id>/ : verdict.json (Codex), journal.json (coureur), runs/<n>.log, codex.log.
// Le PC recoupe (decider) : vert seulement si Codex dit ok, le témoin est vert, au moins N sabotages RELEVÉS (dans le
// périmètre, sans toucher au juge, bac stable pendant le passage, pas une erreur de syntaxe, états distincts), tous vus,
// aucun défaut bloquant ou majeur, aucun témoin de Codex qui contredit le premier. Un sabotage relevé resté vert = rouge.
// Limite connue (la même que `lancer`) : les scripts du juge sont dans le bac, Codex peut les modifier, et le coureur les
// exécute hors bac à sable ; un passage qui touche un fichier cité par le verifier ne compte pas, mais il tourne.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import vm from 'node:vm'
import { spawn } from 'node:child_process'

const PANNE = 125
const RACINE = process.cwd()
const ID_VALIDE = /^\d{3}-[\w-]+$/
const args = process.argv.slice(2)
const opt = (nom, def) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : def }
const usage = (m) => { console.error(`✗ ${m}\nusage : node ../presti-ops/usine/revue-codex.mjs <id> [--sabotages=4] [--delai=90] [--delai-juge=15] [--modele=gpt-6-sol] [--effort=medium] [--reseau] [--a-sec]`); process.exit(2) }
const inconnues = args.filter((a) => a.startsWith('--') && !/^--(sabotages|delai|delai-juge|modele|effort)=.+$|^--(reseau|a-sec)$/.test(a))
if (inconnues.length) usage(`option inconnue : ${inconnues.join(' ')}`)
const id = args.find((a) => !a.startsWith('--'))
if (!id || !ID_VALIDE.test(id)) usage('il faut un identifiant de fiche NNN-slug')
const N = Number(opt('sabotages', 4))
const delaiJuge = Number(opt('delai-juge', 15))
const delai = Number(opt('delai', 90))
const modele = opt('modele', 'gpt-6-sol') // MODELE de scripts/usine.mjs (consigne de Benj du 24/09)
const effort = opt('effort', 'medium')
const reseau = args.includes('--reseau')
if (!Number.isInteger(N) || N < 1 || N > 20) usage('--sabotages : un entier de 1 à 20')
if (!(delaiJuge >= 1 && delaiJuge <= 120)) usage('--delai-juge : de 1 à 120 minutes par passage du verifier')
if (!(delai >= delaiJuge + 20 && delai <= 600)) usage('--delai : de --delai-juge + 20 à 600 minutes')
if (!/^[\w.:-]{1,60}$/.test(modele)) usage('--modele : un nom de modèle')
if (!/^(none|minimal|low|medium|high|xhigh)$/.test(effort)) usage('--effort : none|minimal|low|medium|high|xhigh')
if (!fs.existsSync(path.join(RACINE, 'scripts', 'usine.mjs')) || !fs.existsSync(path.join(RACINE, '.orchestre'))) usage('à lancer depuis la racine de presti')

// ── la fiche : l'en-tête comme l'orchestre le lit (une ligne par champ, commentaire « # » retiré) ──────────────────────
const ficheRel = ['en-cours', 'fait'].map((d) => `.orchestre/${d}/${id}.md`).find((r) => fs.existsSync(path.join(RACINE, r)))
if (!ficheRel) usage(`${id} n'est ni dans .orchestre/en-cours/ ni dans .orchestre/fait/`)
const texteFiche = fs.readFileSync(path.join(RACINE, ficheRel), 'utf8')
const entete = {}
for (const l of (texteFiche.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1].split(/\r?\n/)) {
  const s = l.replace(/\s+#.*$/, '')
  const i = s.indexOf(':')
  if (i >= 1 && !/^\s/.test(s) && !s.startsWith('#')) entete[s.slice(0, i).trim()] = s.slice(i + 1).trim()
}
const sansGuillemets = (v) => (/^'.*'$|^".*"$/.test(v) && v.length >= 2 ? v.slice(1, -1) : v)
const liste = (v) => (/^\[.*\]$/.test(v || '') ? v.slice(1, -1).split(',').map((x) => sansGuillemets(x.trim())).filter(Boolean) : [])
const verifier = sansGuillemets(entete.verifier || '')
if (!verifier) usage(`${ficheRel} : pas de champ verifier`)
const perimetre = liste(entete.perimetre).filter((p) => !p.startsWith('.orchestre/'))
// Le juge : les scripts que cite le verifier. Un sabotage qui les touche ne compte pas.
const juges = [...new Set([...verifier.matchAll(/[\w@./-]+\.(?:mjs|cjs|js|ts|sh|py)\b/g)].map((m) => m[0].replace(/^\.\//, '')))]
// Prospects : dit seulement (Codex reste sur l'abonnement ChatGPT, sans conseiller, pour toutes les fiches) ; même esprit
// que MOTIFS_PROSPECTS de scripts/usine.mjs, en plus large.
const prospects = /prospect|\bsir[eè]n\b|\bsiret\b|d[ée]marchage|(?:\+33[\s.]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/i.test(texteFiche)
// Copie de globVersRegex (scripts/usine.mjs) : ** = tout, * = tout sauf « / », ? = un caractère.
function globVersRegex(motif) {
  const m = motif.replace(/\\/g, '/').replace(/^\.\//, '')
  let re = ''
  for (let i = 0; i < m.length; i++) {
    const c = m[i]
    if (c === '*') {
      if (m[i + 1] === '*') { if (m[i + 2] === '/') { re += '(?:.*/)?'; i += 2 } else { re += '.*'; i += 1 } } else re += '[^/]*'
    } else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

// ── le verdict de Codex : format strict (sérialisée aussi dans le coureur, pour son tour de correction) ────────────────
function validerVerdict(v) {
  const G = ['bloquant', 'majeur', 'mineur']
  const err = []
  const objet = (o) => o && typeof o === 'object' && !Array.isArray(o)
  const texte = (x) => typeof x === 'string' && x.trim().length > 0
  const cles = (o, ok, ou) => { for (const k of Object.keys(o)) if (!ok.includes(k)) err.push(`${ou} : clé en trop « ${k} »`) }
  if (!objet(v)) return ['pas un objet JSON']
  cles(v, ['ok', 'resume', 'defauts', 'sabotages'], 'racine')
  if (typeof v.ok !== 'boolean') err.push('ok : true ou false')
  if (!texte(v.resume)) err.push('resume : un texte non vide')
  if (!Array.isArray(v.defauts)) err.push('defauts : un tableau')
  else v.defauts.forEach((d, i) => {
    if (!objet(d)) { err.push(`defauts[${i}] : un objet`); return }
    cles(d, ['gravite', 'description', 'correction'], `defauts[${i}]`)
    if (!G.includes(d.gravite)) err.push(`defauts[${i}].gravite : ${G.join(' | ')}`)
    if (!texte(d.description)) err.push(`defauts[${i}].description : un texte non vide`)
    if (!texte(d.correction)) err.push(`defauts[${i}].correction : un texte non vide`)
  })
  if (!Array.isArray(v.sabotages)) err.push('sabotages : un tableau')
  else v.sabotages.forEach((s, i) => {
    if (!objet(s)) { err.push(`sabotages[${i}] : un objet`); return }
    cles(s, ['quoi', 'vu'], `sabotages[${i}]`)
    if (!texte(s.quoi)) err.push(`sabotages[${i}].quoi : un texte non vide`)
    if (typeof s.vu !== 'boolean') err.push(`sabotages[${i}].vu : true ou false`)
  })
  return err
}

// ── la consigne de Codex ({{TEMOIN}} : posé par le coureur après le passage n°0) ──────────────────────────────────────
const relO = `.orchestre/travail/revue-codex/${id}`
const cmd = `node ${relO}/juge.cjs`
const consigne = `Tu es le JUGE INDÉPENDANT de la fiche ${id} de l'orchestre Presti. Tu ne corriges rien : tu éprouves le juge de la fiche (son \`verifier\`) et tu rends un verdict.

Fiche : ${ficheRel} (lis-la en entier). Périmètre (l'implémentation) : ${perimetre.join(', ') || '(non précisé)'}.
Verifier exact : ${verifier}
Ce dossier est un bac jetable (copie du PC). Tu es dans un bac à sable${reseau ? '' : ' sans réseau'} : ne lance PAS le verifier toi-même. Un service le lance pour toi hors du bac à sable, sur l'état courant des fichiers, et seul son relevé compte :
  ${cmd} temoin                 → le verifier sur l'état actuel, sans sabotage
  ${cmd} sabotage "<quoi>"      → le verifier sur ton sabotage en place ; <quoi> = fichier:ligne et ce que tu as cassé
  ${cmd} attendre <n>           → si un appel a rendu « EN COURS » ou a été coupé
Chaque appel attend le résultat jusqu'à 8 min : donne à la commande un délai d'au moins 10 min. Il affiche le n° du passage, le code (0 = vert), les fichiers changés et la fin du journal (${relO}/runs/<n>.log et <n>.json). Ne modifie AUCUN fichier pendant qu'un passage tourne.
Témoin déjà fait avant toi : passage n°0, {{TEMOIN}} (journal : ${relO}/runs/0.log).

1. Lance \`temoin\` (verifier tel quel). S'il rougit, dis pourquoi : défaut réel, ou environnement de l'usine.
2. Lis le verifier et les scripts qu'il appelle. Relève les critères qui passeraient sur une implémentation vide, figée (valeurs en dur, sortie constante) ou fausse (condition inversée, cas oublié), et ceux que rien ne contrôle vraiment.
3. Fais au moins ${N} sabotages, un à la fois, dans les fichiers du périmètre. Chacun est une implémentation plausible mais fausse qu'un juge correct doit refuser : valeur figée, branche retirée, condition inversée, résultat vide ou en dur, contrôle supprimé. Vise d'abord les critères du point 2. Interdits : erreur de syntaxe, import cassé, fichier supprimé ou vidé, toucher au verifier, à ses scripts, à ses fixtures, à la fiche ou à .orchestre/. Pour chacun : copie le fichier dans /tmp/revue-${id}/, sabote, lance \`sabotage\`, puis restaure avec cp et vérifie avec cmp avant le suivant. Jamais git stash, checkout, restore, reset ni commit (le .git est partagé) ; rien hors de ce dossier et de /tmp. N'appelle \`sabotage\` que pour une panne qu'un juge correct doit voir ; pour tout autre essai, \`temoin\`. Ton verdict est recoupé avec le relevé du service : un sabotage non relevé, hors périmètre ou qui touche au juge ne compte pas, et un sabotage relevé resté vert rend la fiche rouge.
4. Écris ${relO}/verdict.json : UTF-8, le JSON seul, aucune autre clé :
{"ok": false, "resume": "…", "defauts": [{"gravite": "bloquant", "description": "…", "correction": "…"}], "sabotages": [{"quoi": "[n°3] lib/x.ts:42 renvoie [] en dur", "vu": true}]}
 - sabotages : chaque passage \`sabotage\`, dans l'ordre ; \`quoi\` commence par son n° « [n°K] » ; \`vu\` = le verifier a rougi (code ≠ 0).
 - defauts : tout ce qui laisse passer une implémentation vide, figée ou fausse, ou un témoin rouge. gravite : "bloquant" (un critère central de la fiche), "majeur" ou "mineur". correction : ce qu'il faut changer dans le verifier ou l'implémentation. Tableau vide si rien.
 - ok = true seulement si le témoin est vert, que chaque sabotage a été vu et qu'il ne reste aucun défaut bloquant ou majeur.
N'écris rien d'autre dans ${relO}/ et ne modifie pas la fiche. Termine par une phrase : ton verdict.`

// ── le client que Codex appelle (juge.cjs, dans le bac) ─────────────────────────────────────────────────────────────
function client() {
  const fs = require('fs'), path = require('path')
  const O = __dirname, D = path.join(O, 'demandes'), R = path.join(O, 'runs')
  const moi = path.relative(process.cwd(), __filename).replace(/\\/g, '/')
  const nums = (d) => { try { return fs.readdirSync(d).map((f) => /^(\d+)\.json$/.exec(f)).filter(Boolean).map((m) => Number(m[1])) } catch { return [] } }
  const [c, ...reste] = process.argv.slice(2)
  let k
  if (c === 'temoin' || c === 'sabotage') {
    const quoi = reste.join(' ').trim()
    if (c === 'sabotage' && !quoi) { console.log(`usage : node ${moi} sabotage "<fichier:ligne, ce que tu as cassé>"`); process.exit(2) }
    fs.mkdirSync(D, { recursive: true })
    const tmp = path.join(D, `.${process.pid}.tmp`)
    fs.writeFileSync(tmp, JSON.stringify({ type: c, quoi }))
    for (k = Math.max(0, ...nums(D), ...nums(R)) + 1; ; k++) { try { fs.linkSync(tmp, path.join(D, `${k}.json`)); break } catch (e) { if (e.code !== 'EEXIST') throw e } }
    fs.rmSync(tmp, { force: true })
    console.log(`passage n°${k} demandé (${c}) : ne modifie aucun fichier avant le résultat.`)
  } else if (c === 'attendre' && /^\d+$/.test(reste[0] || '')) k = Number(reste[0])
  else { console.log(`usage : node ${moi} temoin | sabotage "<quoi>" | attendre <n>`); process.exit(2) }
  const limite = Date.now() + 8 * 60000
  const voir = () => {
    let r = null
    try { r = JSON.parse(fs.readFileSync(path.join(R, `${k}.json`), 'utf8')) } catch { /* pas encore */ }
    if (r) {
      if (r.erreur) { console.log(`passage n°${k} : ${r.erreur}`); process.exit(1) }
      console.log(`passage n°${k} · ${r.type} · ${r.delai ? 'DÉLAI DÉPASSÉ (indéterminé)' : r.code === 0 ? 'VERT (code 0)' : `ROUGE (code ${r.code})`} · ${r.secondes} s`)
      console.log(`fichiers changés depuis l'état de départ : ${r.fichiers ? r.fichiers.join(', ') || 'aucun' : 'relevé impossible'}`)
      if (!r.stable) console.log('⚠ le bac a changé pendant le passage : il ne compte pas')
      if (r.type === 'sabotage' && r.fichiers && !r.fichiers.length) console.log('⚠ aucun changement relevé (fichier ignoré par git, ou déjà restauré ?) : ce sabotage ne compte pas')
      let log = ''
      try { log = fs.readFileSync(path.join(R, `${k}.log`), 'utf8') } catch { /* rien */ }
      console.log(`--- fin du journal du verifier (${path.relative(process.cwd(), path.join(R, `${k}.log`)).replace(/\\/g, '/')}) ---`)
      console.log(log.split('\n').slice(-40).join('\n'))
      process.exit(0)
    }
    if (Date.now() > limite) { console.log(`EN COURS : le verifier tourne encore. Relance : node ${moi} attendre ${k}`); process.exit(0) }
    setTimeout(voir, 2000)
  }
  voir()
}

// ── le coureur : tourne dans le bac, sur l'usine, hors du bac à sable de Codex ──────────────────────────────────────────
async function coureur(P, valider) {
  const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process')
  const BAC = fs.realpathSync(process.cwd())
  const O = path.join(BAC, ...P.relO.split('/'))
  const A = path.join(os.homedir(), '.revue-codex', P.jeton) // le relevé qui fait foi : Codex n'écrit que dans le bac et /tmp
  const dire = (m) => console.log(`[revue-codex ${new Date().toISOString().slice(11, 19)}] ${m}`)
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
  const queue = (f, n) => { try { const b = fs.readFileSync(f); return b.subarray(Math.max(0, b.length - n)) } catch { return Buffer.alloc(0) } }
  const GROSSIER = /SyntaxError|ERR_MODULE_NOT_FOUND|Cannot find module/
  const J = { jeton: P.jeton, id: P.id, fiche: P.fiche, verifier: P.verifier, modele: P.modele, effort: P.effort, reseau: P.reseau, prospects: P.prospects, debut: new Date().toISOString(), temoin: null, T0: null, derive: [], runs: [], codex: null, correction: null, verdict: null, final: null, restaure: null, erreurs: [] }
  let sortie = 0
  let texteConsigne = P.consigne
  const git = (a, env) => cp.execFileSync('git', ['-c', 'core.quotepath=false', ...a], { cwd: BAC, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  // Un dossier sous le bac, créé au besoin : aucun élément du chemin ne peut être un lien que Codex aurait posé (le coureur,
  // lui, écrit et efface hors bac à sable).
  const sur = (dir) => {
    let p = BAC
    for (const s of path.relative(BAC, dir).split(path.sep).filter(Boolean)) {
      p = path.join(p, s)
      let st = null
      try { st = fs.lstatSync(p) } catch { fs.mkdirSync(p); continue }
      if (st.isSymbolicLink() || !st.isDirectory()) throw new Error(`${path.relative(BAC, p)} n'est pas un dossier ordinaire (lien posé dans le bac ?) : arrêt`)
    }
  }
  const poser = (dest, contenu) => { sur(path.dirname(dest)); const t = `${dest}.${process.pid}.${Date.now()}.tmp`; fs.writeFileSync(t, contenu, { flag: 'wx' }); fs.renameSync(t, dest) }
  let indexReel = null
  const indexTemp = path.join(A, 'index')
  const arbre = () => {
    try {
      try { fs.copyFileSync(indexReel, indexTemp) } catch { fs.rmSync(indexTemp, { force: true }) }
      git(['add', '-A', '--', '.', ':(exclude).orchestre'], { GIT_INDEX_FILE: indexTemp })
      return git(['write-tree'], { GIT_INDEX_FILE: indexTemp })
    } catch (e) { return `illisible: ${String(e.message).split('\n')[0].slice(0, 160)}` }
  }
  const ecarts = (a, b) => {
    if (a === b) return []
    if (!a || !b || a.startsWith('illisible') || b.startsWith('illisible')) return null
    try { return git(['diff', '--name-only', '--no-renames', a, b]).split('\n').filter(Boolean) } catch { return null }
  }
  const lancerJuge = (n, type, quoi) => new Promise((res) => {
    const log = path.join(A, 'runs', `${n}.log`)
    const fd = fs.openSync(log, 'w')
    fs.writeSync(fd, `# passage n°${n} · ${type}${quoi ? ` · ${quoi}` : ''}\n$ ${P.verifier}\n\n`)
    const t = Date.now()
    let delai = false, fini = false
    const e = cp.spawn('bash', ['-c', P.verifier], { cwd: BAC, stdio: ['ignore', fd, fd], detached: true, env: { ...process.env, FORCE_COLOR: '0' } })
    const tuer = () => { try { process.kill(-e.pid, 'SIGKILL') } catch { /* fini */ } }
    const m = setTimeout(() => { delai = true; tuer() }, P.minJuge * 60000)
    const fin = (code, erreur) => {
      if (fini) return
      fini = true; clearTimeout(m); tuer()
      try { fs.writeSync(fd, `\n# fin : ${delai ? `délai de ${P.minJuge} min dépassé` : `code ${code}`}${erreur ? ` (${erreur})` : ''}\n`); fs.closeSync(fd) } catch { /* rien */ }
      res({ code: delai ? 124 : code, delai, secondes: Math.round((Date.now() - t) / 1000), log })
    }
    e.on('close', (c, s) => fin(c ?? 128 + (os.constants.signals[s] || 0)))
    e.on('error', (err) => fin(127, err.message))
  })
  const passage = async (n, type, quoi) => {
    const avant = arbre()
    const r = await lancerJuge(n, type, quoi)
    const apres = arbre()
    const fichiers = ecarts(J.T0, avant)
    const pendant = ecarts(avant, apres)
    const rec = { n, type, quoi, arbre: avant, fichiers: fichiers && fichiers.filter((f) => !J.derive.includes(f)), stable: !!pendant && pendant.every((f) => J.derive.includes(f)), code: r.code, delai: r.delai, secondes: r.secondes, grossier: GROSSIER.test(queue(r.log, 20000).toString('utf8')) }
    J.runs.push(rec)
    poser(path.join(O, 'runs', `${n}.log`), fs.readFileSync(r.log))
    poser(path.join(O, 'runs', `${n}.json`), JSON.stringify(rec))
    dire(`passage n°${n} ${type} : code ${r.code} en ${r.secondes} s ; fichiers changés : ${rec.fichiers ? rec.fichiers.join(', ') || 'aucun' : 'relevé impossible'}${rec.stable ? '' : ' ; bac instable'}`)
  }
  const lancerCodex = (texte, minutes) => new Promise((res) => {
    const log = path.join(A, 'codex.log')
    const fd = fs.openSync(log, 'a')
    const debutLog = fs.fstatSync(fd).size
    const argv = ['exec', '-C', BAC, '-s', 'workspace-write', '-c', `sandbox_workspace_write.network_access=${P.reseau}`, '-c', 'model_provider=openai', '-m', P.modele, '-c', `model_reasoning_effort=${P.effort}`, '--color', 'never', '-o', path.join(A, 'dernier-message.md'), texte]
    const t = Date.now()
    let delai = false, fini = false
    const e = cp.spawn(path.join(os.homedir(), '.local', 'bin', 'codex'), argv, { cwd: BAC, stdio: ['ignore', fd, fd], detached: true })
    const tuer = () => { try { process.kill(-e.pid, 'SIGKILL') } catch { /* fini */ } }
    const m = setTimeout(() => { delai = true; tuer() }, minutes * 60000)
    const fin = (code, erreur) => {
      if (fini) return
      fini = true; clearTimeout(m); tuer()
      try { fs.closeSync(fd) } catch { /* rien */ }
      // Quota : la ligne d'erreur de Codex (regex de fournisseurEpuise, scripts/usine.mjs), et Codex sorti en erreur.
      let s = ''
      if (code !== 0) { try { const b = fs.readFileSync(log); s = b.subarray(Math.max(debutLog, b.length - 400000)).toString('utf8') } catch { /* rien */ } }
      const q = s.match(/^\s*(?:ERROR:?|error:|■)[^\n]*hit your usage limit[^\n]*?(try again at [^\n]+)?$/im)
      const deco = (s.match(/^\s*(?:ERROR:?|■)[^\n]*$/gm) || []).find((l) => /\b401\b|unauthorized|not logged in|log ?in again|sign in/i.test(l))
      res({ code, delai, secondes: Math.round((Date.now() - t) / 1000), quota: q ? `quota de l'abonnement ChatGPT épuisé${q[1] ? ` — ${q[1].trim()}` : ''}` : null, deconnecte: deco ? deco.trim().slice(0, 200) : null, erreur: erreur || null })
    }
    e.on('close', (c, sig) => fin(c ?? 128 + (os.constants.signals[sig] || 0)))
    e.on('error', (err) => fin(127, err.message))
  })
  const lireVerdict = () => {
    const f = path.join(O, 'verdict.json')
    let s
    try { s = fs.lstatSync(f) } catch { return { absent: true, erreurs: ['verdict.json absent'] } }
    if (!s.isFile()) return { erreurs: ["verdict.json n'est pas un fichier ordinaire"] }
    if (!s.size || s.size > 256000) return { erreurs: [`verdict.json : ${s.size} octets`] }
    try { return { erreurs: valider(JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''))) } } catch (e) { return { erreurs: [`JSON illisible : ${String(e.message).slice(0, 160)}`] } }
  }
  try {
    fs.rmSync(O, { recursive: true, force: true })
    fs.mkdirSync(path.join(A, 'runs'), { recursive: true })
    sur(path.join(O, 'demandes')); sur(path.join(O, 'runs'))
    if (!fs.existsSync(path.join(BAC, P.fiche))) throw new Error(`${P.fiche} absente du bac`)
    indexReel = path.resolve(BAC, git(['rev-parse', '--git-path', 'index']))
    poser(path.join(O, 'juge.cjs'), P.client)
    // 1. Le témoin. Ce que le verifier écrit lui-même (hors .orchestre/) est la dérive : elle ne compte jamais comme sabotage.
    const tAvant = arbre()
    const r0 = await lancerJuge(0, 'temoin-initial', '')
    J.T0 = arbre()
    if (J.T0.startsWith('illisible')) throw new Error(`état de l'arbre ${J.T0}`)
    J.derive = ecarts(tAvant, J.T0) || []
    J.temoin = { code: r0.code, delai: r0.delai, secondes: r0.secondes, grossier: GROSSIER.test(queue(r0.log, 20000).toString('utf8')) }
    poser(path.join(O, 'runs', '0.log'), fs.readFileSync(r0.log))
    dire(`témoin : code ${r0.code} en ${r0.secondes} s${J.derive.length ? ` ; le verifier écrit ${J.derive.length} fichier(s) suivi(s)` : ''}`)
    const texte = texteConsigne = P.consigne.replace('{{TEMOIN}}', r0.delai ? `délai de ${P.minJuge} min dépassé` : `code ${r0.code} (${r0.code === 0 ? 'vert' : 'ROUGE'})`)
    poser(path.join(O, 'consigne.md'), texte)
    // 2 et 3. Codex, et le service de ses demandes (une à la fois, dans l'ordre des n°).
    let fini = false
    const cx = lancerCodex(texte, P.minCodex).then((r) => { fini = true; return r })
    const traites = new Set([0])
    while (!fini) {
      let ks = []
      try { ks = fs.readdirSync(path.join(O, 'demandes')).map((f) => /^(\d{1,6})\.json$/.exec(f)).filter(Boolean).map((m) => Number(m[1])).filter((k) => !traites.has(k)).sort((a, b) => a - b) } catch { /* rien */ }
      if (!ks.length) { await dormir(1500); continue }
      const k = ks[0]
      const f = path.join(O, 'demandes', `${k}.json`)
      traites.add(k)
      let d = null
      try { const s = fs.lstatSync(f); if (s.isFile() && s.size < 4096) d = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { /* illisible */ }
      if (d && ['temoin', 'sabotage'].includes(d.type)) await passage(k, d.type, String(d.quoi || '').slice(0, 300))
      else { J.erreurs.push(`demande n°${k} illisible`); poser(path.join(O, 'runs', `${k}.json`), JSON.stringify({ n: k, erreur: 'demande illisible : type temoin ou sabotage' })) }
      fs.rmSync(f, { force: true })
    }
    J.codex = await cx
    dire(`codex : code ${J.codex.code} en ${J.codex.secondes} s${J.codex.quota ? ` ; ${J.codex.quota}` : ''}${J.codex.delai ? ' ; délai dépassé' : ''}`)
    // 4. Le verdict ; présent mais hors format : un tour de correction, court, sans rien relancer.
    let lu = lireVerdict()
    if (lu.erreurs.length && !lu.absent && !J.codex.quota && !J.codex.deconnecte && !J.codex.delai) {
      J.correction = await lancerCodex(`Le fichier ${P.relO}/verdict.json ne respecte pas le format demandé : ${lu.erreurs.slice(0, 8).join(' ; ')}. Réécris-le, JSON seul, exactement {"ok": true|false, "resume": "…", "defauts": [{"gravite": "bloquant"|"majeur"|"mineur", "description": "…", "correction": "…"}], "sabotages": [{"quoi": "[n°K] …", "vu": true|false}]}, sans rien perdre de son contenu (relevé des passages : ${P.relO}/runs/*.json). Ne lance rien, ne modifie aucun autre fichier.`, 5)
      lu = lireVerdict()
    }
    J.verdict = { valide: !lu.erreurs.length, erreurs: lu.erreurs }
    J.final = arbre()
    const e = ecarts(J.T0, J.final)
    J.restaure = !!e && e.every((f) => J.derive.includes(f))
    if (J.codex.quota || J.correction?.quota) sortie = 3
  } catch (e) {
    J.erreurs.push(String(e?.message || e).split('\n')[0].slice(0, 300))
    sortie = 22
  } finally {
    // Rendre O : le verdict de Codex (fichier ordinaire non vide) et nos fichiers ; tout le reste (restes de Codex, demandes,
    // copies non foi des passages, liens) est retiré — un fichier de 0 octet ferait de l'executer un 125.
    try {
      sur(O)
      for (const n of fs.readdirSync(O)) { const f = path.join(O, n); const s = fs.lstatSync(f); if (!(n === 'verdict.json' && s.isFile() && s.size > 0)) fs.rmSync(f, { recursive: true, force: true }) }
      try { for (const n of fs.readdirSync(path.join(A, 'runs'))) poser(path.join(O, 'runs', n), queue(path.join(A, 'runs', n), 300000)) } catch { /* aucun passage */ }
      for (const n of ['codex.log', 'dernier-message.md']) { const b = queue(path.join(A, n), 1500000); if (b.length) poser(path.join(O, n), b) }
      poser(path.join(O, 'consigne.md'), texteConsigne)
      J.fin = new Date().toISOString()
      poser(path.join(O, 'journal.json'), JSON.stringify(J, null, 1))
    } catch (e) { console.log(`[revue-codex] rendu impossible : ${e.message}`); sortie = 22 }
    try { fs.rmSync(A, { recursive: true, force: true }) } catch { /* rien */ }
  }
  process.exit(sortie)
}

// ── le recoupement, sur le PC ────────────────────────────────────────────────────────────────────────────────────────
function decider(v, j) {
  const perim = perimetre.map(globVersRegex)
  const comptes = [], nonComptes = []
  const etats = new Set()
  for (const r of j.runs.filter((x) => x.type === 'sabotage')) {
    let raison = null
    if (r.delai || r.code === 124) raison = 'délai dépassé'
    else if (!r.fichiers) raison = 'état illisible'
    else if (!r.stable) raison = 'bac modifié pendant le passage'
    else if (!r.fichiers.length) raison = 'aucun changement relevé'
    else if (r.fichiers.some((f) => juges.includes(f))) raison = 'touche au juge'
    else if (perim.length && !r.fichiers.some((f) => perim.some((re) => re.test(f)))) raison = 'hors périmètre'
    else if (r.code !== 0 && r.grossier) raison = 'rouge grossier (syntaxe, module introuvable)'
    else if (etats.has(r.arbre)) raison = "même état qu'un passage précédent"
    if (raison) { nonComptes.push({ r, raison }); continue }
    etats.add(r.arbre)
    comptes.push(r)
  }
  const vus = comptes.filter((r) => r.code !== 0)
  const rates = comptes.filter((r) => r.code === 0)
  const t = j.temoin
  const instable = !!t && !t.delai && j.runs.some((r) => r.type === 'temoin' && r.fichiers && !r.fichiers.length && r.stable && !r.delai && (r.code === 0) !== (t.code === 0))
  const graves = v.defauts.filter((d) => d.gravite !== 'mineur')
  let code, raison
  if (rates.length) [code, raison] = [1, `le verifier reste vert sur ${rates.length} sabotage(s) relevé(s)`]
  else if (!v.ok) [code, raison] = [1, 'Codex rend ok: false']
  else if (graves.length) [code, raison] = [1, `Codex dit ok mais liste ${graves.length} défaut(s) bloquant(s) ou majeur(s)`]
  else if (!t || t.delai || t.code !== 0) [code, raison] = [PANNE, `témoin ${!t ? 'absent' : t.delai ? 'hors délai' : `rouge (code ${t.code})`} alors que Codex dit ok : pas de vert possible`]
  else if (instable) [code, raison] = [PANNE, 'juge instable : un témoin de Codex contredit le premier']
  else if (vus.length < N) [code, raison] = [PANNE, `revue incomplète : ${vus.length}/${N} sabotage(s) relevé(s) et vu(s)`]
  else [code, raison] = [0, `${vus.length} sabotage(s) relevé(s), tous vus ; témoin vert`]
  return { code, raison, comptes, nonComptes, vus, graves }
}

// ── le lancement ──────────────────────────────────────────────────────────────────────────────────────────────────
const O = path.join(RACINE, ...relO.split('/'))
fs.rmSync(O, { recursive: true, force: true }) // aucun verdict d'une revue précédente ne peut être relu
fs.mkdirSync(O, { recursive: true })
const jeton = crypto.randomBytes(12).toString('hex')
const P = { id, jeton, relO, fiche: ficheRel, verifier, modele, effort, reseau, prospects, minJuge: delaiJuge, minCodex: delai - delaiJuge - 10, consigne, client: `(${client.toString()})()\n` }
const source = `(${coureur.toString()})(${JSON.stringify(P)}, ${validerVerdict.toString()})`
const charge = zlib.gzipSync(source, { level: 9 }).toString('base64')
const CHARGEUR = 'eval(require("zlib").gunzipSync(Buffer.from(process.argv[1],"base64")).toString())'
const bac = `rc-${id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`.slice(0, 32)
const court = (s, n = 200) => { const t = String(s); const x = t.match(/^ */)[0] + t.replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
if (args.includes('--a-sec')) {
  new vm.Script(source, { filename: 'coureur.cjs' })
  new vm.Script(P.client, { filename: 'juge.cjs' })
  fs.writeFileSync(path.join(O, 'coureur.cjs'), source)
  fs.writeFileSync(path.join(O, 'consigne.md'), consigne)
  console.log(`✓ à sec ${id} : ${ficheRel}, verifier « ${court(verifier, 120)} », périmètre ${perimetre.length} motif(s), juge ${juges.join(', ') || '(aucun script cité)'}${prospects ? ', fiche de prospects' : ''} ; coureur ${source.length} signes → ${charge.length} en base64 ; écrits dans ${relO}/`)
  process.exit(0)
}
if (charge.length > 24000) { console.error(`✗ coureur trop long pour la ligne de commande Windows (${charge.length} signes)`); process.exit(PANNE) }
console.error(`· revue-codex ${id} : Codex ${modele} (${effort}) sur l'usine, ${N} sabotage(s) exigé(s), ${delai} min au plus${prospects ? ' ; fiche de prospects : abonnement ChatGPT seul, aucun conseiller' : ''} ; journal ${relO}/executer.log`)
const fd = fs.openSync(path.join(O, 'executer.log'), 'w')
const code = await new Promise((res) => {
  const e = spawn(process.execPath, [path.join('scripts', 'usine.mjs'), 'executer', `--nom=${bac}`, `--delai=${delai}`, '--attendre=5', `--id=${id}`, `--rapatrier=${relO}`, '--', 'node', '-e', CHARGEUR, charge], { cwd: RACINE, stdio: ['ignore', fd, fd], windowsHide: true })
  e.on('close', (c) => res(c ?? PANNE))
  e.on('error', () => res(PANNE))
})
fs.closeSync(fd)

const L = []
const finir = (c) => { for (const l of L.slice(0, 19)) console.log(court(l, 220)); process.exit(c) }
const lireJson = (n) => { try { const f = path.join(O, n); const s = fs.lstatSync(f); return s.isFile() && s.size <= 5e6 ? JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) : null } catch { return null } }
const j = lireJson('journal.json')
const detail = `  détail : ${relO}/ (verdict.json, journal.json, runs/, codex.log, executer.log)`
const pasJuge = (pourquoi, lignes = []) => { L.push(`⚠ revue-codex ${id} : NON JUGÉ (${PANNE}) — ${pourquoi}`, ...lignes.map((l) => `  ${l}`), detail); finir(PANNE) }
if (code === 3) { L.push(`⏸ revue-codex ${id} : QUOTA (3) — ${j?.codex?.quota || j?.correction?.quota || "Codex à bout de quota sur l'abonnement ChatGPT"}`, detail); finir(3) }
if (![0, 22].includes(code) || !j || j.jeton !== jeton) {
  let log = ''
  try { log = fs.readFileSync(path.join(O, 'executer.log'), 'utf8') } catch { /* rien */ }
  // Les lignes ✗ d'executer et le détail indenté qui les suit (chemin:ligne : motif — jamais une valeur).
  const ls = log.split(/\r?\n/)
  const x = ls.flatMap((l, i) => (/✗/.test(l) ? [l.trim(), ...ls.slice(i + 1, i + 4).filter((m) => /^ {4}\S/.test(m)).map((m) => `  ${m.trim()}`)] : [])).slice(-8)
  pasJuge(!j || j.jeton !== jeton ? `l'usine n'a rien rendu de cette revue (executer : code ${code})` : `executer : code ${code}`, x.length ? x : ['(aucune ligne ✗ : voir executer.log)'])
}
if (code === 22) pasJuge('le coureur a échoué sur l’usine', j.erreurs.slice(0, 4))
if (j.codex?.deconnecte) pasJuge(`Codex déconnecté sur l'usine : ${j.codex.deconnecte}`)
const v = lireJson('verdict.json')
const erreursV = v ? validerVerdict(v) : ['verdict.json absent ou illisible']
if (erreursV.length) pasJuge(`Codex n'a pas rendu de verdict conforme${j.codex?.delai ? ' (délai dépassé)' : ''} : ${erreursV.slice(0, 3).join(' ; ')}`)
const d = decider(v, j)
const t = j.temoin
const etiquette = { 0: '✓ VERT (0)', 1: '✗ ROUGE (1)', [PANNE]: `⚠ NON JUGÉ (${PANNE})` }[d.code]
L.push(`${etiquette} revue-codex ${id} — ${d.raison}`)
L.push(`  Codex : « ${court(v.resume, 240)} »`)
L.push(`  témoin (verifier tel quel) : ${!t ? 'absent' : t.delai ? 'délai dépassé' : t.code === 0 ? 'vert' : `ROUGE (code ${t.code})`}${t ? ` en ${t.secondes} s` : ''}`)
L.push(`  sabotages relevés : ${d.vus.length} vu(s) sur ${d.comptes.length} compté(s), ${N} exigé(s)${d.nonComptes.length ? ` ; ${d.nonComptes.length} non compté(s)` : ''}`)
const items = [
  ...d.comptes.filter((r) => r.code === 0).map((r) => `    ✗ n°${r.n} resté VERT : ${r.quoi}`),
  ...d.comptes.filter((r) => r.code !== 0).map((r) => `    ✓ n°${r.n} vu (code ${r.code}) : ${r.quoi}`),
  ...d.nonComptes.map(({ r, raison }) => `    · n°${r.n} non compté (${raison}) : ${r.quoi}`),
]
L.push(...items.slice(0, 6))
if (items.length > 6) L.push(`    … et ${items.length - 6} autre(s) : journal.json`)
const ordre = { bloquant: 0, majeur: 1, mineur: 2 }
const defauts = [...v.defauts].sort((a, b) => ordre[a.gravite] - ordre[b.gravite])
L.push(`  défauts : ${defauts.length}${defauts.length ? ` (${['bloquant', 'majeur', 'mineur'].map((g) => `${defauts.filter((x) => x.gravite === g).length} ${g}`).join(', ')})` : ''}`)
L.push(...defauts.slice(0, 4).map((x) => `    ${x.gravite} : ${x.description} → ${x.correction}`))
if (j.restaure === false) L.push('  ⚠ bac non restauré à la fin (sans effet sur le PC : le bac est jetable)')
L.splice(18)
L.push(detail)
finir(d.code)
