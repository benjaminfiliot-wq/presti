#!/usr/bin/env node
// scripts/comptable-qa.mjs — le juge du Comptable (fiche 026-242, cahier CPT-1 à CPT-8), écrit AVANT le module qu'il juge (026-243).
//
//   node scripts/comptable-qa.mjs [--partie=rapprochement,seuil,montants,libelle,mentions] [--racine=<dossier>] [--temoin] [--reel]
//   node scripts/comptable-qa.mjs --preuve-echecs            (la commande `verifier` de 026-242)
//
// Sortie : une ligne `PASS|FAIL CPT-n — …` par critère, puis `comptable-qa : PASS|FAIL — ids` ; code 0 seulement si tout est vert.
// Module absent ou qui ne s'importe pas : `FAIL CPT-2` d'abord (cahier : « le module n'existe pas encore »).
//
// Le module jugé est `lib/direction/comptable.ts` (sous --racine, le dépôt par défaut). Il est importé dans un processus à part
// (scripts/fixtures/026/comptable/sonde.mjs) dont le réseau et les écritures de fichiers sont piégés ; les données (Stripe
// factice en lecture seule, ventes, seuil daté, journal) lui sont injectées en second argument : voir CONTRAT.md, même dossier.
// Aucun secret, aucun réseau, aucune clé, aucun .env.local : tout est synthétique.
//
// Ce que le juge prouve : la conduite du module sur le jeu d'essai, plus quatre lectures de son source (écriture Stripe,
// réseau, écriture de fichier, fonction commune aux deux totaux) et l'empreinte des gabarits légaux avant/après l'exercice.
// Ce qu'il ne prouve pas : le branchement réel (route, tuile, pg_cron, vraie API Stripe, vraie base, vraie porte llm.ts) ;
// `--reel` est refusé (code 2) tant que 026-243 n'a pas livré ses gestes (clé Stripe restreinte, jeton `tresorier`).
//
// `--preuve-echecs` (fiche, point 5) : (a) un arbre sans module sort en code 1 avec CPT-2 en premier échec ; (b) le témoin
// (fixtures/…/temoin.mjs, auto-contrôle jamais déployé) passe les huit critères ; (c) chaque sabotage de sabotages.json (≥ 8) échoue
// avec SON critère nommé, dans la ligne FAIL et dans le bilan. L'étape (a) tourne sur un dossier vide fabriqué par le juge : elle ne
// dépend pas de l'état de l'arbre (le jour où 026-243 livre le module, `verifier` de 026-242 ne doit pas devenir rouge) ; l'arbre
// courant est jugé en plus, pour information, quand le module existe. Écrit .orchestre/preuves/026-242/echecs-attendus.md.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(R, 'scripts/fixtures/026/comptable')
const W = path.join(R, '.orchestre/travail/comptable-qa')
const P = path.join(R, '.orchestre/preuves/026-242')
const MODULE = 'lib/direction/comptable.ts'

const args = process.argv.slice(2)
const options = {}
for (const arg of args) {
  const m = /^--(racine|partie)=(.+)$/.exec(arg)
  if (m) options[m[1]] = m[2]
  else if (['--temoin', '--preuve-echecs', '--reel'].includes(arg)) options[arg.slice(2)] = true
  else { console.error(`option inconnue : ${arg}`); process.exitCode = 2 }
}
const PARTIES = { rapprochement: ['CPT-1', 'CPT-2', 'CPT-8'], seuil: ['CPT-3'], montants: ['CPT-4', 'CPT-7'], libelle: ['CPT-6'], mentions: ['CPT-5'] }
const selection = options.partie ? options.partie.split(',') : Object.keys(PARTIES)
if (selection.some(p => !PARTIES[p])) { console.error('partie inconnue'); process.exitCode = 2 }
if (options.reel) { console.error('NON JUGÉ — mode réel exige clé Stripe restreinte et identité tresorier ; ce juge hors réseau ne les lit pas'); process.exitCode = 2 }

// ── lectures de source ───────────────────────────────────────────────────────────────────────────────────────────────────
// Les commentaires sont retirés : on juge le code, pas ses explications (un « // fetch( » en commentaire n'est pas un appel).
function sourceNu(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1') }
const ECRITURE_STRIPE = /(?:charges|refunds|subscriptions|invoices)\s*\.\s*(?:create|update|del|cancel)\s*\(/
const RESEAU = /\b(?:fetch|axios(?:\s*\.\s*\w+)?|https?\s*\.\s*(?:request|get))\s*\(|from\s*['"](?:node:)?(?:http|https|net|tls|child_process|undici)['"]/
const ECRITURE_FICHIER = /\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|createWriteStream|rename(?:Sync)?|copyFile(?:Sync)?|cp(?:Sync)?|truncate(?:Sync)?|unlink(?:Sync)?|rm(?:Sync)?|rmdir(?:Sync)?|symlink(?:Sync)?|openSync|writeSync)\s*\(/

// ── empreintes des gabarits légaux : la mention de franchise (art. 293 B) vit à plusieurs endroits qui ne changent
// qu'ENSEMBLE, jamais par un agent. Le module ne doit en toucher aucun, par aucun moyen (le piège de la sonde n'en couvre que
// les chemins courants ; l'empreinte couvre le reste). ───────────────────────────────────────────────────────────────────────
const PROTEGES = JSON.parse(fs.readFileSync(path.join(F, 'mentions.json'), 'utf8')).proteges
function empreintes(racine) {
  const sortie = {}
  const parcourir = rel => {
    const abs = path.join(racine, rel)
    let st; try { st = fs.statSync(abs) } catch { return }
    if (st.isDirectory()) { for (const f of fs.readdirSync(abs).sort()) parcourir(`${rel}/${f}`) }
    else sortie[rel] = crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex')
  }
  PROTEGES.forEach(parcourir)
  return sortie
}

// ── jugement d'un module : sonde (comportement) + greps du source + empreintes ────────────────────────────────────────────
function lancer(cible, racine) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|HOME|USERPROFILE)$/i.test(k)))
  const avant = empreintes(racine)
  const r = spawnSync(process.execPath, ['--import', pathToFileURL(path.join(R, 'scripts/ts-loader.mjs')).href, path.join(F, 'sonde.mjs'), cible], { cwd: racine, env, encoding: 'utf8', timeout: 30000, maxBuffer: 2e6, windowsHide: true })
  const apres = empreintes(racine)
  if (r.status !== 0 || r.error) return { 'CPT-2': { ok: false, detail: `sonde code ${r.status} : ${r.error?.message ?? r.stderr.slice(-250)}` } }
  let data; try { data = JSON.parse(r.stdout.trim().split(/\r?\n/).at(-1)) } catch { return { 'CPT-2': { ok: false, detail: 'sonde sans observations JSON' } } }
  const resultats = data.resultats
  const s = sourceNu(fs.readFileSync(cible, 'utf8'))
  const fail = (id, detail) => { resultats[id] = { ok: false, detail } }
  if (ECRITURE_STRIPE.test(s)) fail('CPT-1', 'méthode écriture Stripe dans le source')
  if (RESEAU.test(s)) fail('CPT-4', 'appel réseau ou primitive de dépôt/paiement dans le source')
  if (ECRITURE_FICHIER.test(s)) fail('CPT-5', 'écriture de fichiers dans le source')
  const touches = Object.keys({ ...avant, ...apres }).filter(rel => avant[rel] !== apres[rel])
  if (touches.length) fail('CPT-5', `gabarit légal modifié pendant l'exercice : ${touches.slice(0, 3).join(', ')}`)
  else if (!Object.keys(avant).length) fail('CPT-5', `gabarits légaux introuvables sous ${racine} (mentions.json) : l'empreinte ne prouverait rien`)
  if (!s.includes('MOTEUR_DE') || !s.includes('personnelles')) fail('CPT-6', 'MOTEUR_DE/personnelles absent du contrat source')
  // Deux chemins publics (le total de la tuile, le total de la déclaration) doivent déléguer à UNE même fonction interne.
  const tuile = s.match(/function\s+recettesTuile\s*\([^)]*\)\s*\{([^}]*)/)
  const declaration = s.match(/function\s+preparerDeclaration\s*\([^)]*\)\s*\{([^}]*)/)
  const appels = b => [...(b ?? '').matchAll(/\b(\w+)\s*\(/g)].map(m => m[1])
  const commune = tuile && declaration && appels(tuile[1]).some(n => appels(declaration[1]).includes(n) && !['if', 'Number', 'Date'].includes(n) && new RegExp(`function\\s+${n}\\s*\\(`).test(s))
  if (!commune) fail('CPT-7', 'pas de fonction interne partagée entre les deux totaux')
  return resultats
}
function afficher(resultats) {
  const ids = [...new Set(selection.flatMap(p => PARTIES[p]))].sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
  // Module absent ou illisible : seul CPT-2 est observé, et c'est le premier échec prescrit par le cahier.
  if (!resultats['CPT-1'] && resultats['CPT-2']) { console.log(`FAIL CPT-2 — ${resultats['CPT-2'].detail}`); console.log('comptable-qa : FAIL — CPT-2'); return 1 }
  const rouges = []
  for (const id of ids) {
    const v = resultats[id] ?? { ok: false, detail: 'critère non observé' }
    console.log(`${v.ok ? 'PASS' : 'FAIL'} ${id} — ${v.ok ? 'contrôle observé' : v.detail}`)
    if (!v.ok) rouges.push(id)
  }
  console.log(`comptable-qa : ${rouges.length ? 'FAIL — ' + rouges.join(', ') : 'PASS'}`)
  return rouges.length ? 1 : 0
}
function jugerRacine(racine) {
  const cible = path.join(racine, MODULE)
  return fs.existsSync(cible) ? lancer(cible, racine) : { 'CPT-2': { ok: false, detail: `${MODULE} absent : production 026-243 non livrée` } }
}

// ── --preuve-echecs : le juge se juge lui-même ───────────────────────────────────────────────────────────────────────────
function cli(argv) { return spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...argv], { cwd: R, encoding: 'utf8', timeout: 60000, maxBuffer: 2e6, windowsHide: true }) }
const premierEchec = sortie => sortie.split(/\r?\n/).find(l => l.startsWith('FAIL '))
function preuveEchecs() {
  fs.rmSync(W, { recursive: true, force: true })
  fs.mkdirSync(W, { recursive: true })
  const essais = []
  // (a) arbre sans module : dossier vide fabriqué ici, donc stable quoi qu'il arrive à lib/direction/ dans le dépôt.
  const vide = path.join(W, 'arbre-sans-module')
  fs.mkdirSync(vide, { recursive: true })
  const absent = cli([`--racine=${vide}`])
  essais.push({ nom: 'arbre sans module', ok: absent.status === 1 && Boolean(premierEchec(absent.stdout)?.startsWith('FAIL CPT-2 —')), detail: absent.stdout.trim().split(/\r?\n/).join(' | ') })
  // L'arbre courant : sans module, c'est l'étape (a) du cahier telle quelle ; avec module (026-243 livrée), le juge normal
  // en rend compte pour information, sans que cela change la preuve (aucun ancien échec n'est simulé).
  const courant = cli([])
  if (!fs.existsSync(path.join(R, MODULE))) essais.push({ nom: 'arbre courant', ok: courant.status === 1 && Boolean(premierEchec(courant.stdout)?.startsWith('FAIL CPT-2 —')), detail: courant.stdout.trim().split(/\r?\n/).join(' | ') })
  else essais.push({ nom: 'arbre courant (module livré : information, non bloquant)', ok: true, detail: `code ${courant.status} — ${courant.stdout.trim().split(/\r?\n/).at(-1)}` })
  // (b) le témoin.
  const temoin = cli(['--temoin'])
  essais.push({ nom: 'temoin', ok: temoin.status === 0 && temoin.stdout.includes('comptable-qa : PASS'), detail: temoin.stdout.trim().split(/\r?\n/).at(-1) })
  // (c) chaque sabotage : une copie du témoin altérée à UNE ancre, posée comme lib/direction/comptable.ts d'un dossier d'essai
  // qui porte aussi une copie des gabarits légaux (le sabotage peut les toucher sans salir le dépôt).
  const source = fs.readFileSync(path.join(F, 'temoin.mjs'), 'utf8')
  const sabotages = JSON.parse(fs.readFileSync(path.join(F, 'sabotages.json'), 'utf8'))
  for (const sabotage of sabotages) {
    if (source.split(sabotage.avant).length !== 2) { essais.push({ nom: sabotage.nom, ok: false, critere: sabotage.critere, detail: 'ancre absente ou non unique dans le témoin' }); continue }
    const racine = path.join(W, sabotage.nom), cible = path.join(racine, MODULE)
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.writeFileSync(cible, source.replace(sabotage.avant, () => sabotage.apres))
    for (const rel of PROTEGES) if (fs.existsSync(path.join(R, rel))) { fs.mkdirSync(path.dirname(path.join(racine, rel)), { recursive: true }); fs.cpSync(path.join(R, rel), path.join(racine, rel), { recursive: true }) }
    const r = cli([`--racine=${racine}`])
    const lignes = r.stdout.split(/\r?\n/)
    const ligne = lignes.find(l => l.startsWith(`FAIL ${sabotage.critere} — `))
    const bilan = lignes.find(l => l.startsWith('comptable-qa : FAIL — '))
    const nomme = Boolean(bilan) && bilan.slice('comptable-qa : FAIL — '.length).split(', ').includes(sabotage.critere)
    essais.push({ nom: sabotage.nom, critere: sabotage.critere, ok: r.status === 1 && Boolean(ligne) && nomme, detail: ligne ?? `code ${r.status} sans verdict attendu : ${(r.stderr || r.stdout).slice(-150)}` })
  }
  if (sabotages.length < 8) essais.push({ nom: 'nombre de sabotages', ok: false, detail: `${sabotages.length} sabotage(s), la fiche en exige au moins 8` })
  fs.mkdirSync(P, { recursive: true })
  fs.writeFileSync(path.join(P, 'echecs-attendus.md'), '# Comptable — échecs réellement observés\n\n' + essais.map(e => `- ${e.ok ? 'PASS' : 'FAIL'} ${e.nom}${e.critere ? ' → ' + e.critere : ''} : ${e.detail}`).join('\n') + '\n')
  for (const e of essais) console.log(`${e.ok ? 'PASS' : 'FAIL'} AUTO-${e.nom} — ${e.critere ?? e.detail}`)
  const ok = essais.every(e => e.ok)
  console.log(`comptable-qa --preuve-echecs : ${ok ? 'PASS' : 'FAIL'}`)
  return ok ? 0 : 1
}

if (process.exitCode === 2) { /* usage ou mode réel refusé : rien à juger */ }
else if (options['preuve-echecs']) {
  if (options.temoin || options.partie) { console.error('--preuve-echecs exige tous les critères et pas --temoin'); process.exitCode = 2 }
  else process.exitCode = preuveEchecs()
} else {
  fs.mkdirSync(W, { recursive: true })
  const racine = path.resolve(options.racine ?? R)
  process.exitCode = afficher(options.temoin ? lancer(path.join(F, 'temoin.mjs'), racine) : jugerRacine(racine))
}
