#!/usr/bin/env node
// scripts/qualite-sites-qa.mjs — le juge du Contrôleur qualité des sites livrés (fiche 026-246, cahier QSI-1 à QSI-9), écrit AVANT
// ce qu'il juge (026-247 : scripts/agents/controleur-qualite.mjs et ses deux routes app/api/usine/qualite/{travail,rapport}).
//
//   node scripts/qualite-sites-qa.mjs [--partie=disponibilite,poids,accessibilite,liens,mentions,formulaire,decision]
//                                     [--racine=<dossier>] [--temoin] [--reel]
//   node scripts/qualite-sites-qa.mjs --preuve-echecs            (la commande `verifier` de 026-246)
//
// Sortie : une ligne `PASS|FAIL QSI-n — …` par critère, puis `qualite-sites-qa : PASS|FAIL — ids` ; code 0 seulement si tout est vert.
// Module absent ou qui ne s'importe pas : `FAIL QSI-2` d'abord (cahier : « le module n'existe pas encore »).
//
// Le module jugé est scripts/agents/controleur-qualite.mjs sous --racine (le dépôt par défaut). Il est importé dans un processus à part
// (scripts/fixtures/026/qualite-sites/sonde.mjs) dont le réseau direct est piégé ; il y reçoit des doublures RÉELLES — un navigateur et un
// récupérateur qui parlent en HTTP à un serveur factice (serveur-factice.mjs : cinq sites, vingt-cinq pannes réglables), le vrai lecteur
// prudent de 026-020, une horloge factice (une seconde d'attente ne coûte rien), un magasin et un moteur. Le contrat : CONTRAT.md.
// Aucun secret, aucune clé, aucun .env.local, aucun vrai site : tout est synthétique, hôtes en .test.
//
// Ce que le juge MESURE côté serveur (jamais sur la parole du module) : chaque requête reçue — méthode, hôte, chemin, voie (navigateur
// ou lecteur prudent), instant de l'horloge factice. Une écriture reçue, une soumission du formulaire, une requête à un site programmé au
// retrait, un lien suivi hors du lecteur prudent, deux requêtes à moins d'une seconde : autant de rouges, quoi que le module déclare.
// Il LIT aussi le texte du module : aucune méthode d'écriture vers le site, aucune interaction de page (clic, saisie, envoi), MOTEUR_DE
// et personnelles dans le contrat de l'avis visuel ; et, sur le dépôt réel seulement, les deux routes de 026-247.
// Ce qu'il ne prouve pas : Playwright ni Lighthouse réels, le coffre de l'usine, les gardes de jeton (026-040), la vraie base, la vraie
// Search Console ; `--reel` est refusé (code 2) tant que Benj n'a pas confirmé le premier audit d'un vrai site (026-251).
//
// `--preuve-echecs` (fiche, point 4) : (a) un arbre sans module sort en code 1 avec QSI-2 en premier échec ; (b) le témoin
// (fixtures/…/temoin.mjs, auto-contrôle jamais déployé) passe les neuf critères ; (c) chaque sabotage de sabotages.json (≥ 9) échoue avec
// SON critère nommé, dans la ligne FAIL et dans le bilan. L'étape (a) tourne sur un dossier vide fabriqué par le juge : elle ne dépend pas
// de l'état de l'arbre (le jour où 026-247 livre le module, `verifier` de 026-246 ne doit pas devenir rouge) ; l'arbre courant est jugé en
// plus, pour information, quand le module existe. Écrit .orchestre/preuves/026-246/echecs-attendus.md.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const F = path.join(R, 'scripts/fixtures/026/qualite-sites')
const W = path.join(R, '.orchestre/travail/qualite-sites-qa')
const P = path.join(R, '.orchestre/preuves/026-246')
const MODULE = 'scripts/agents/controleur-qualite.mjs'
const ROUTE_TRAVAIL = 'app/api/usine/qualite/travail/route.ts'
const ROUTE_RAPPORT = 'app/api/usine/qualite/rapport/route.ts'
const IDS = ['QSI-1', 'QSI-2', 'QSI-3', 'QSI-4', 'QSI-5', 'QSI-6', 'QSI-7', 'QSI-8', 'QSI-9']

const options = {}
for (const arg of process.argv.slice(2)) {
  const m = /^--(racine|partie)=(.+)$/.exec(arg)
  if (m) options[m[1]] = m[2]
  else if (['--temoin', '--preuve-echecs', '--reel'].includes(arg)) options[arg.slice(2)] = true
  else { console.error(`option inconnue : ${arg}`); process.exitCode = 2 }
}
const PARTIES = { disponibilite: ['QSI-1', 'QSI-2'], poids: ['QSI-3'], accessibilite: ['QSI-4'], liens: ['QSI-5'], mentions: ['QSI-6'], formulaire: ['QSI-7'], decision: ['QSI-8', 'QSI-9'] }
const selection = options.partie ? options.partie.split(',') : Object.keys(PARTIES)
if (selection.some((p) => !PARTIES[p])) { console.error(`partie inconnue (attendues : ${Object.keys(PARTIES).join(', ')})`); process.exitCode = 2 }
if (options.reel) { console.error('NON JUGÉ — le mode réel audite un vrai site livré : il exige le jeton qualite_sites et le « oui » de Benj au premier audit (026-251) ; ce juge hors réseau n\'en lit aucun'); process.exitCode = 2 }

// ── lectures de source ───────────────────────────────────────────────────────────────────────────────────────────────────
// Les commentaires sont retirés : on juge le code, pas ses explications (un « // PUT » en commentaire n'est pas une requête).
const sourceNu = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
const METHODE_ECRITURE = /['"`](?:PUT|DELETE|PATCH)['"`]/
const METHODE_POST = /['"`]POST['"`]/g
const CLIENT_ECRITURE = /(?:from\s*|require\s*\(\s*)['"`](?:node:)?(?:child_process|basic-ftp|ftp|ssh2|simple-git|isomorphic-git)['"`]/
const INTERACTION_PAGE = /\.(?:click|dblclick|fill|type|press|check|uncheck|selectOption|setInputFiles|dispatchEvent|requestSubmit|submit|tap)\s*\(/

/** Les lectures du texte du module : { 'QSI-n': [raisons] }. */
function lecturesModule(source) {
  const s = sourceNu(source), rouges = { 'QSI-1': [], 'QSI-7': [], 'QSI-8': [] }
  if (METHODE_ECRITURE.test(s)) rouges['QSI-1'].push('méthode d\'écriture (PUT, DELETE ou PATCH) dans le source')
  for (const m of s.matchAll(METHODE_POST)) {
    // Le seul POST permis : le rapport envoyé au bus de Presti (…/api/usine/qualite/…), jamais vers un site audité.
    const fenetre = s.slice(Math.max(0, m.index - 220), m.index + 220)
    // Ajout du 05/10/2026 (point d'entrée de l'usine, 026-251) : l'événement de passe, UN POST vers la route du bus de Presti
    // (/api/agents/evenements, par appelBus), jamais vers un site audité ; la forme exacte de l'appel est exigée.
    const evenementDePasse = /appelBus\(\s*\w+\s*,\s*['"`]\/api\/agents\/evenements['"`]\s*,\s*['"`]POST['"`]/.test(fenetre)
    if (!/\/api\/usine\/qualite\//.test(fenetre) && !evenementDePasse) { rouges['QSI-1'].push('méthode POST dans le source hors du rapport au bus (/api/usine/qualite/) et de l\'événement de passe (/api/agents/evenements)'); break }
  }
  if (CLIENT_ECRITURE.test(s)) rouges['QSI-1'].push('client FTP, SSH, Git ou child_process importé')
  if (INTERACTION_PAGE.test(s)) rouges['QSI-7'].push('interaction de page (clic, saisie, envoi) dans le source : un formulaire ne se soumet jamais, même pour essayer')
  if (!s.includes('MOTEUR_DE') || !s.includes('personnelles')) rouges['QSI-8'].push('MOTEUR_DE/personnelles absent du contrat source de l\'avis visuel')
  return rouges
}

/** Les deux routes de 026-247 — sur le dépôt réel seulement (une racine d'essai n'en porte pas). */
function lecturesRoutes(racine) {
  const rouges = { 'QSI-1': [], 'QSI-2': [], 'QSI-9': [] }
  const lire = (rel) => { const f = path.join(racine, rel); return fs.existsSync(f) ? sourceNu(fs.readFileSync(f, 'utf8')) : null }
  const travail = lire(ROUTE_TRAVAIL), rapport = lire(ROUTE_RAPPORT)
  if (travail === null) rouges['QSI-2'].push(`${ROUTE_TRAVAIL} absente (026-247)`)
  else {
    if (!/export\s+(?:async\s+)?function\s+GET\b/.test(travail)) rouges['QSI-2'].push(`${ROUTE_TRAVAIL} n'exporte pas GET`)
    for (const mot of ['authAgent', 'pauseGenerale']) if (!travail.includes(mot)) rouges['QSI-2'].push(`${ROUTE_TRAVAIL} sans ${mot} (jeton de l'agent, pause générale)`)
  }
  if (rapport === null) rouges['QSI-9'].push(`${ROUTE_RAPPORT} absente (026-247)`)
  else {
    if (!/export\s+(?:async\s+)?function\s+POST\b/.test(rapport)) rouges['QSI-9'].push(`${ROUTE_RAPPORT} n'exporte pas POST`)
    for (const mot of ['authAgent', 'creerDecision', 'qualite_site']) if (!rapport.includes(mot)) rouges['QSI-9'].push(`${ROUTE_RAPPORT} sans ${mot}`)
    if (/sites_commandes[\s\S]{0,160}?\.(?:update|delete|insert|upsert)\s*\(/.test(rapport)) rouges['QSI-9'].push(`${ROUTE_RAPPORT} écrit dans sites_commandes : une décision, jamais une correction`)
  }
  for (const [rel, s] of [[ROUTE_TRAVAIL, travail], [ROUTE_RAPPORT, rapport]]) if (s && /\bfetch\s*\(|\bhttps?\.(?:request|get)\s*\(/.test(s)) rouges['QSI-1'].push(`${rel} fait une requête réseau : les routes ne touchent jamais un site audité`)
  return rouges
}

// ── jugement d'un module : sonde (comportement) + lectures du source ────────────────────────────────────────────────────────
function lancer(cible, { avecRoutes = false, racine = R } = {}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|TMPDIR|HOME|USERPROFILE|LANG|LC_ALL)$/i.test(k)))
  const r = spawnSync(process.execPath, ['--import', pathToFileURL(path.join(R, 'scripts/ts-loader.mjs')).href, path.join(F, 'sonde.mjs'), cible], { cwd: R, env, encoding: 'utf8', timeout: 240_000, maxBuffer: 1 << 26, windowsHide: true })
  if (r.status !== 0 || r.error) return { 'QSI-2': { ok: false, detail: `sonde code ${r.status} : ${r.error?.message ?? r.stderr.slice(-300)}` } }
  let data; try { data = JSON.parse(r.stdout.trim().split(/\r?\n/).at(-1)) } catch { return { 'QSI-2': { ok: false, detail: `sonde sans observations JSON : ${(r.stderr || r.stdout).slice(-200)}` } } }
  if (data.import_echec) return { 'QSI-2': { ok: false, detail: `import : ${data.import_echec}` } }
  const resultats = data.resultats
  const rouges = lecturesModule(fs.readFileSync(cible, 'utf8'))
  if (avecRoutes) for (const [id, l] of Object.entries(lecturesRoutes(racine))) rouges[id] = [...(rouges[id] ?? []), ...l]
  for (const [id, raisons] of Object.entries(rouges)) if (raisons.length) resultats[id] = { ok: false, detail: [resultats[id]?.ok === false ? resultats[id].detail : '', ...raisons].filter(Boolean).join(' ; ') }
  return resultats
}
function afficher(resultats) {
  const ids = [...new Set(selection.flatMap((p) => PARTIES[p]))].sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
  // Module absent ou qui ne s'importe pas : seul QSI-2 est observé, et c'est le premier échec prescrit par le cahier.
  if (!resultats['QSI-1'] && resultats['QSI-2']) { console.log(`FAIL QSI-2 — ${resultats['QSI-2'].detail}`); console.log('qualite-sites-qa : FAIL — QSI-2'); return 1 }
  const rouges = []
  for (const id of ids) {
    const v = resultats[id] ?? { ok: false, detail: 'critère non observé' }
    console.log(`${v.ok ? 'PASS' : 'FAIL'} ${id} — ${v.ok ? 'contrôle observé' : v.detail}`)
    if (!v.ok) rouges.push(id)
  }
  console.log(`qualite-sites-qa : ${rouges.length ? 'FAIL — ' + rouges.join(', ') : 'PASS'}`)
  return rouges.length ? 1 : 0
}
function jugerRacine(racine) {
  const cible = path.join(racine, MODULE)
  return fs.existsSync(cible) ? lancer(cible, { avecRoutes: path.resolve(racine) === R, racine }) : { 'QSI-2': { ok: false, detail: `${MODULE} absent : production 026-247 non livrée` } }
}

// ── --preuve-echecs : le juge se juge lui-même ───────────────────────────────────────────────────────────────────────────
const cli = (argv) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...argv], { cwd: R, encoding: 'utf8', timeout: 300_000, maxBuffer: 1 << 26, windowsHide: true })
const cliAsync = (argv) => new Promise((ok) => {
  const enfant = spawn(process.execPath, [fileURLToPath(import.meta.url), ...argv], { cwd: R, windowsHide: true })
  let stdout = '', stderr = ''
  const minuterie = setTimeout(() => enfant.kill(), 300_000)
  enfant.stdout.on('data', (c) => { stdout += c })
  enfant.stderr.on('data', (c) => { stderr += c })
  enfant.on('close', (status) => { clearTimeout(minuterie); ok({ status, stdout, stderr }) })
})
const premierEchec = (sortie) => sortie.split(/\r?\n/).find((l) => l.startsWith('FAIL '))
async function preuveEchecs() {
  fs.rmSync(W, { recursive: true, force: true })
  fs.mkdirSync(W, { recursive: true })
  const essais = []
  // (a) arbre sans module : dossier vide fabriqué ici, donc stable quoi qu'il arrive à scripts/agents/ dans le dépôt.
  const vide = path.join(W, 'arbre-sans-module')
  fs.mkdirSync(vide, { recursive: true })
  const absent = cli([`--racine=${vide}`])
  essais.push({ nom: 'arbre sans module', ok: absent.status === 1 && Boolean(premierEchec(absent.stdout)?.startsWith('FAIL QSI-2 —')), detail: absent.stdout.trim().split(/\r?\n/).join(' | ') })
  // L'arbre courant : sans module, c'est l'étape (a) du cahier telle quelle ; avec module (026-247 livrée), le juge normal en rend
  // compte pour information, sans que cela change la preuve (aucun ancien échec n'est simulé).
  const courant = cli([])
  if (!fs.existsSync(path.join(R, MODULE))) essais.push({ nom: 'arbre courant', ok: courant.status === 1 && Boolean(premierEchec(courant.stdout)?.startsWith('FAIL QSI-2 —')), detail: courant.stdout.trim().split(/\r?\n/).join(' | ') })
  else essais.push({ nom: 'arbre courant (module livré : information, non bloquant)', ok: true, detail: `code ${courant.status} — ${courant.stdout.trim().split(/\r?\n/).at(-1)}` })
  // (b) le témoin.
  const temoin = cli(['--temoin'])
  essais.push({ nom: 'temoin', ok: temoin.status === 0 && temoin.stdout.includes('qualite-sites-qa : PASS'), detail: temoin.status === 0 ? temoin.stdout.trim().split(/\r?\n/).at(-1) : temoin.stdout.trim().split(/\r?\n/).filter((l) => l.startsWith('FAIL')).join(' | ') })
  // (c) chaque sabotage : une copie du témoin altérée à UNE ancre, posée comme scripts/agents/controleur-qualite.mjs d'un dossier d'essai.
  // Les copies sont jugées par lots de quatre processus (chacun a son serveur factice, son port, son dossier : rien n'est partagé).
  const source = fs.readFileSync(path.join(F, 'temoin.mjs'), 'utf8').replace(/\r\n/g, '\n')
  const sabotages = JSON.parse(fs.readFileSync(path.join(F, 'sabotages.json'), 'utf8'))
  const juger = async (sabotage) => {
    if (source.split(sabotage.avant).length !== 2) return { nom: sabotage.nom, ok: false, critere: sabotage.critere, detail: 'ancre absente ou non unique dans le témoin' }
    const racine = path.join(W, sabotage.nom), cible = path.join(racine, MODULE)
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.writeFileSync(cible, source.replace(sabotage.avant, () => sabotage.apres))
    const r = await cliAsync([`--racine=${racine}`])
    const lignes = r.stdout.split(/\r?\n/)
    const ligne = lignes.find((l) => l.startsWith(`FAIL ${sabotage.critere} — `))
    const bilan = lignes.find((l) => l.startsWith('qualite-sites-qa : FAIL — '))
    const nomme = Boolean(bilan) && bilan.slice('qualite-sites-qa : FAIL — '.length).split(', ').includes(sabotage.critere)
    return { nom: sabotage.nom, critere: sabotage.critere, ok: r.status === 1 && Boolean(ligne) && nomme, detail: ligne ?? `code ${r.status} sans verdict attendu : ${(r.stderr || r.stdout).slice(-150)}` }
  }
  for (let i = 0; i < sabotages.length; i += 4) essais.push(...await Promise.all(sabotages.slice(i, i + 4).map(juger)))
  if (sabotages.length < 9) essais.push({ nom: 'nombre de sabotages', ok: false, detail: `${sabotages.length} sabotage(s), la fiche en exige au moins 9` })
  const couverts = new Set(sabotages.map((s) => s.critere))
  const sansSabotage = IDS.filter((id) => !couverts.has(id))
  if (sansSabotage.length) essais.push({ nom: 'critères sans sabotage', ok: false, detail: `aucun sabotage ne vise ${sansSabotage.join(', ')}` })
  fs.mkdirSync(P, { recursive: true })
  fs.writeFileSync(path.join(P, 'echecs-attendus.md'), '# Contrôleur qualité des sites — échecs réellement observés\n\n' + essais.map((e) => `- ${e.ok ? 'PASS' : 'FAIL'} ${e.nom}${e.critere ? ' → ' + e.critere : ''} : ${e.detail}`).join('\n') + '\n')
  for (const e of essais) console.log(`${e.ok ? 'PASS' : 'FAIL'} AUTO-${e.nom} — ${e.critere ?? e.detail}`)
  const ok = essais.every((e) => e.ok)
  console.log(`qualite-sites-qa --preuve-echecs : ${ok ? 'PASS' : 'FAIL'}`)
  return ok ? 0 : 1
}

if (process.exitCode === 2) { /* usage ou mode réel refusé : rien à juger */ }
else if (options['preuve-echecs']) {
  if (options.temoin || options.partie || options.racine) { console.error('--preuve-echecs exige tous les critères, sans --temoin, --partie ni --racine'); process.exitCode = 2 }
  else process.exitCode = await preuveEchecs()
} else {
  fs.mkdirSync(W, { recursive: true })
  const racine = path.resolve(options.racine ?? R)
  process.exitCode = afficher(options.temoin ? lancer(path.join(F, 'temoin.mjs')) : jugerRacine(racine))
}
