#!/usr/bin/env node
// test/preuve-026.mjs — le juge des groupes source (fiche 06), baux (fiche 07) et quota (fiche 08), écrit AVANT leur
// code (026-098). Sur la référence d'aujourd'hui (faaef0d, avant ces fiches), chaque groupe échoue à son PREMIER
// critère : ORS-1 (source), ORB-1 (baux), ORQ-1 (quota) — c'est ce que --preuve-echecs vérifie.
//
// Usage :
//   node test/preuve-026.mjs [--groupe=source,baux,quota] [--source=<dossier outil>] [--garder]
//     lance les groupes demandés contre --source (par défaut : ce dépôt). Une ligne par critère (✓/✗ <id> — détail).
//     Code 0 seulement si tout est vert.
//   node test/preuve-026.mjs --preuve-echecs
//     1. lance PX-1 en direct, dans presti (scripts/executant.mjs lancer x --tache=t --a-blanc) ;
//     2. extrait git archive faaef0d du dépôt orchestre dans os.tmpdir() (jamais d'écriture dans .git) ;
//     3. relance ce même fichier pour chacun des 3 groupes avec --source=<extrait>, et vérifie que chacun sort en
//        code ≠ 0 avec ORS-1 / ORB-1 / ORQ-1 comme PREMIER échec ;
//     4. vérifie que test/preuve.mjs de l'extrait est vert ;
//     5. écrit .orchestre/preuves/026-098/echecs-attendus.md dans presti.
//
// Chaque critère est autonome : une exception dans l'un est rattrapée et comptée FAIL, jamais une exception qui
// arrête tout le fichier (le groupe suivant doit quand même tourner). Les modules du futur (bin/executant.mjs,
// bin/antigravity.mjs) sont importés dans un SOUS-PROCESSUS séparé (sondeModule) : un process.exit() qu'ils
// pourraient contenir tue la sonde, jamais ce juge.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CE_FICHIER = fileURLToPath(import.meta.url)
const OUTIL = path.resolve(path.dirname(CE_FICHIER), '..')
const GARDER = process.argv.includes('--garder')
const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const versSlash = (p) => String(p).split(path.sep).join('/')
const existe = (p) => fs.existsSync(p)
const nettoyer = (p) => { if (!GARDER) { try { fs.rmSync(p, { recursive: true, force: true }) } catch { /* best effort */ } } }

// ── petites mains partagées ──────────────────────────────────────────────────────────────────────
function run(argv, cwd, input, env) {
  const r = spawnSync(process.execPath, argv, { cwd, encoding: 'utf8', input, env: { ...process.env, FORCE_COLOR: '0', ...env } })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }
}
function creerRapport() {
  const lignes = []
  const ok = (id, cond, detail = '') => { const c = !!cond; lignes.push({ id, cond: c, detail }); if (!c) console.log(`FAIL ${id} — ${detail || 'critère non satisfait'}`); console.log(`${c ? '✓' : '✗'} ${id}${detail ? ' — ' + detail : ''}`) }
  return { ok, lignes }
}
// Copie test/projet-factice (de --source, sinon de ce dépôt) dans os.tmpdir(), git init, puis `init` depuis --source.
function creerFactice(source, motif) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `orchestre-026-${motif}-`))
  const projet = path.join(tmp, 'projet')
  const fixture = existe(path.join(source, 'test', 'projet-factice')) ? path.join(source, 'test', 'projet-factice') : path.join(OUTIL, 'test', 'projet-factice')
  fs.cpSync(fixture, projet, { recursive: true })
  spawnSync('git', ['init', '-q'], { cwd: projet })
  spawnSync('git', ['add', '-A'], { cwd: projet })
  spawnSync('git', ['-c', 'user.email=a@b.c', '-c', 'user.name=essai-026', 'commit', '-qm', 'base'], { cwd: projet })
  const BIN = path.join(source, 'bin', 'orchestre.mjs')
  const r = run([BIN, 'init', 'projet', '--projet=essai-026', '--pile=Next.js + Supabase', '--description=Projet de preuve du 026-098.'], tmp)
  if (r.code !== 0) throw new Error(`init depuis ${versSlash(source)} a échoué (code ${r.code}) : ${r.out}`.slice(0, 500))
  return { tmp, projet }
}
// Importe un module DANS UN SOUS-PROCESSUS (jamais in-process : un process.exit() du module ne doit tuer que la
// sonde) ; corpsJs est une expression qui reçoit `mod` (l'objet importé, ou null si l'import a échoué) et doit
// rendre un objet sérialisable.
function sonderModule(fichierAbs, cwd, corpsJs) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestre-026-sonde-'))
  const probe = path.join(tmp, 'sonde.mjs')
  fs.writeFileSync(probe, [
    'const capture = []',
    'const _log = console.log, _err = console.error',
    "console.log = (...a) => capture.push(a.map(String).join(' '))",
    "console.error = (...a) => capture.push(a.map(String).join(' '))",
    'let mod = null, erreur = null',
    `try { mod = await import(${JSON.stringify(pathToFileURL(fichierAbs).href)}) } catch (e) { erreur = String((e && e.message) || e) }`,
    'console.log = _log; console.error = _err',
    `let resultat = null; try { resultat = (${corpsJs}) } catch (e) { resultat = { erreurSonde: String((e && e.message) || e) } }`,
    "process.stdout.write('\\n###SONDE###' + JSON.stringify({ capture, erreur, resultat }))",
  ].join('\n'))
  const r = spawnSync(process.execPath, [probe], { cwd, encoding: 'utf8', timeout: 20000 })
  nettoyer(tmp)
  const m = (r.stdout || '').match(/###SONDE###([\s\S]*)$/)
  if (!m) return { ok: false, capture: [], resultat: null, sortie: ((r.stdout || '') + (r.stderr || '')).slice(0, 300) }
  try { const j = JSON.parse(m[1]); return { ok: true, ...j } } catch { return { ok: false, capture: [], resultat: null, sortie: 'JSON de sonde illisible' } }
}
const addDirs = (argv) => { const out = []; for (let i = 0; i < argv.length; i++) if (argv[i] === '--add-dir') out.push(versSlash(path.resolve(String(argv[i + 1] || '')))); return out }
const lireVerdictsDe = (projet) => { const p = path.join(projet, '.orchestre', 'verdicts.jsonl'); return existe(p) ? fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : [] }

// ── groupe source (fiche 06) ─────────────────────────────────────────────────────────────────────
async function groupeSource(source) {
  const { ok, lignes } = creerRapport()
  const srcExecutant = path.join(source, 'bin', 'executant.mjs')
  const srcAntigravity = path.join(source, 'bin', 'antigravity.mjs')
  const s1 = existe(srcExecutant) && existe(srcAntigravity)
  ok('ORS-1', s1, s1 ? `présents dans ${versSlash(source)}/bin` : `absents de la source : bin/executant.mjs ${existe(srcExecutant) ? 'ok' : 'MANQUANT'}, bin/antigravity.mjs ${existe(srcAntigravity) ? 'ok' : 'MANQUANT'}`)

  let projet, tmp
  try { ({ projet, tmp } = creerFactice(source, 'src')) }
  catch (e) {
    const msg = `factice non créé : ${String(e.message || e).slice(0, 300)}`
    for (const id of ['ORS-2', 'ORS-3', 'ORS-4', 'ORS-5', 'ORS-6', 'ORS-7', 'ORS-8', 'ORS-NR']) ok(id, false, msg)
    return { ok: lignes.every((l) => l.cond), lignes }
  }
  const orch = (...a) => run([path.join(projet, 'scripts', 'orchestre.mjs'), ...a], projet)
  const execu = (...a) => run([path.join(projet, 'scripts', 'executant.mjs'), ...a], projet)
  const lireP = (p) => { try { return fs.readFileSync(path.join(projet, p), 'utf8') } catch { return '' } }
  const existeP = (p) => existe(path.join(projet, p))

  // ORS-2 : maj recopie octet pour octet
  // init a déjà installé ces pilotes : les altérer prouve que maj les recopie réellement.
  for (const p of ['scripts/executant.mjs', 'scripts/antigravity.mjs']) {
    if (existeP(p)) fs.appendFileSync(path.join(projet, p), '\n// témoin ORS-2 : version installée périmée\n')
  }
  const rmaj = orch('maj')
  const bufExec = existeP('scripts/executant.mjs') ? fs.readFileSync(path.join(projet, 'scripts/executant.mjs')) : null
  const bufAntig = existeP('scripts/antigravity.mjs') ? fs.readFileSync(path.join(projet, 'scripts/antigravity.mjs')) : null
  const identiqueExec = bufExec && existe(srcExecutant) && Buffer.compare(bufExec, fs.readFileSync(srcExecutant)) === 0
  const identiqueAntig = bufAntig && existe(srcAntigravity) && Buffer.compare(bufAntig, fs.readFileSync(srcAntigravity)) === 0
  ok('ORS-2', !!(identiqueExec && identiqueAntig), `executant.mjs ${bufExec ? (identiqueExec ? 'identique' : 'DIFFÈRE') : 'absent après maj'} · antigravity.mjs ${bufAntig ? (identiqueAntig ? 'identique' : 'DIFFÈRE') : 'absent après maj'} (${rmaj.out.trim().split('\n').slice(-1)[0] || ''})`)

  // ORS-3 : contenu propre (ni presti, ni 'SaaS', ni Documents) + argv --a-blanc avec vault=../coffre → add-dir coffre + source
  const texte = (lireP('scripts/executant.mjs') || '') + '\n' + (lireP('scripts/antigravity.mjs') || '')
  const sansPresti = texte.trim() !== '' && !/presti|'SaaS'|Documents/.test(texte)
  let argvBlanc = null, err3 = 'scripts/executant.mjs absent (voir ORS-2)'
  if (existeP('scripts/executant.mjs')) {
    try {
      const cfgPath = path.join(projet, '.orchestre', 'orchestre.json')
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      cfg.vault = '../coffre'
      fs.mkdirSync(path.join(tmp, 'coffre'), { recursive: true })
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
      const rb = execu('lancer', 'x', '--tache=t', '--a-blanc')
      err3 = rb.out
      const derniere = rb.out.trim().split(/\r?\n/).filter(Boolean).pop()
      argvBlanc = JSON.parse(derniere).argv
    } catch (e) { err3 = String(e.message || e) }
  }
  const coffreAbs = versSlash(path.resolve(tmp, 'coffre'))
  const sourceAbs = versSlash(path.resolve(source))
  const dirs = Array.isArray(argvBlanc) ? addDirs(argvBlanc) : []
  const contientCoffreEtSource = dirs.includes(coffreAbs) && dirs.includes(sourceAbs)
  ok('ORS-3', sansPresti && contientCoffreEtSource, `contenu sans presti/'SaaS'/Documents : ${sansPresti} · --add-dir coffre+source : ${contientCoffreEtSource} · argv ${argvBlanc ? JSON.stringify(argvBlanc).slice(0, 220) : '(absent : ' + err3.slice(0, 150) + ')'}`)

  // ORS-4 : exec, -s, workspace-write, network_access=true — jamais danger-full-access / --dangerously-bypass… / --yolo
  const contientTous4 = Array.isArray(argvBlanc) && ['exec', '-s', 'workspace-write', 'sandbox_workspace_write.network_access=true'].every((x) => argvBlanc.includes(x))
  const sansInterdits4 = Array.isArray(argvBlanc) && !argvBlanc.some((x) => /danger-full-access|--dangerously-bypass-approvals-and-sandbox|--yolo/.test(String(x)))
  ok('ORS-4', contientTous4 && sansInterdits4, `argv ${argvBlanc ? JSON.stringify(argvBlanc).slice(0, 220) : '(absent, voir ORS-3)'}`)

  // ORS-5 : modèle par défaut gpt-6-sol, --model=gpt-6-luna passe tel quel
  const contientSol = Array.isArray(argvBlanc) && argvBlanc.includes('gpt-6-sol')
  let argvLuna = null
  if (existeP('scripts/executant.mjs')) { try { const rl = execu('lancer', 'x', '--tache=t', '--a-blanc', '--model=gpt-6-luna'); argvLuna = JSON.parse(rl.out.trim().split(/\r?\n/).filter(Boolean).pop()).argv } catch { /* voir détail */ } }
  const contientLuna = Array.isArray(argvLuna) && argvLuna.includes('gpt-6-luna')
  ok('ORS-5', contientSol && contientLuna, `défaut gpt-6-sol dans l'argv : ${contientSol} · --model=gpt-6-luna transmis : ${contientLuna}`)

  // ORS-6 : antigravity.mjs sans git → code 1 « instantané impossible », rien lancé ; exporte PROMPT + instantane ; PROMPT propre
  let ors6 = false, ors6detail = 'scripts/antigravity.mjs absent (voir ORS-2)'
  if (existeP('scripts/antigravity.mjs')) {
    const sansGit = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestre-026-sansgit-'))
    try {
      fs.mkdirSync(path.join(sansGit, 'scripts'), { recursive: true })
      fs.copyFileSync(path.join(projet, 'scripts', 'antigravity.mjs'), path.join(sansGit, 'scripts', 'antigravity.mjs'))
      const rg = run([path.join(sansGit, 'scripts', 'antigravity.mjs'), 'lancer', 'ag-x', '--tache=t'], sansGit)
      const bonEchec = rg.code === 1 && /instantané impossible/i.test(rg.out)
      const s = sonderModule(path.join(sansGit, 'scripts', 'antigravity.mjs'), sansGit, 'mod ? { prompt: typeof mod.PROMPT === "function" ? mod.PROMPT("agent-x","tache-x") : null, exporteInstantane: typeof mod.instantane === "function" } : { prompt:null, exporteInstantane:false }')
      const exportePrompt = s.ok && typeof s.resultat?.prompt === 'string'
      const exporteInstantane = !!s.resultat?.exporteInstantane
      const promptPropre = exportePrompt && !/presti|'SaaS'|Documents/.test(s.resultat.prompt)
      ors6 = bonEchec && exportePrompt && exporteInstantane && promptPropre
      ors6detail = `sans-git : code ${rg.code}, « instantané impossible » ${bonEchec ? 'oui' : 'non'} (rien de lancé) · exporte PROMPT : ${exportePrompt} · exporte instantane : ${exporteInstantane} · PROMPT propre : ${promptPropre}`
    } catch (e) { ors6detail = `erreur : ${String(e.message || e).slice(0, 250)}` }
    finally { nettoyer(sansGit) }
  }
  ok('ORS-6', ors6, ors6detail)

  // ORS-7 : importer executant.mjs n'affiche rien et exporte binaireCodex
  let ors7 = false, ors7detail = 'scripts/executant.mjs absent (voir ORS-2)'
  if (existeP('scripts/executant.mjs')) {
    const s = sonderModule(path.join(projet, 'scripts', 'executant.mjs'), projet, 'mod ? { exporteBinaireCodex: typeof mod.binaireCodex === "function" } : { exporteBinaireCodex:false }')
    ors7 = s.ok && s.capture.length === 0 && !!s.resultat?.exporteBinaireCodex
    ors7detail = `sonde ok : ${s.ok} · sortie à l'import : ${s.capture.length} ligne(s)${s.capture.length ? ' (' + s.capture[0].slice(0, 80) + ')' : ''} · exporte binaireCodex : ${!!s.resultat?.exporteBinaireCodex}`
  }
  ok('ORS-7', ors7, ors7detail)

  // ORS-8 : liste d'exécutants par défaut = [antigravity, codex, claude-code] ; valider refuse qwen ; sonde --moteur=qwen code 2 ;
  //          dans presti, après maj, orchestre.mjs/executant.mjs/antigravity.mjs identiques à la source, sans fantômes
  let ors8 = false, ors8detail = ''
  try {
    const cfgFactice = JSON.parse(lireP('.orchestre/orchestre.json'))
    const listeAttendue = ['antigravity', 'codex', 'claude-code']
    const listeOk = JSON.stringify(cfgFactice.executants) === JSON.stringify(listeAttendue)
    fs.writeFileSync(path.join(projet, 'tache-qwen.md'), '---\nid: qwen-test\ntype: test\nobjectif: essai executant qwen\nperimetre: [x]\ninterdit: []\nverifier: node -e "process.exit(0)"\nbudget: { fichiers: 1, minutes: 1 }\npreuve: x\nexecutant: qwen\n---\n# x\n')
    const rv = orch('valider', 'tache-qwen.md')
    const validerRefuse = rv.code !== 0 && /qwen/.test(rv.out)
    let sondeQwenCode2 = false, sondeDetail = 'scripts/executant.mjs absent'
    if (existeP('scripts/executant.mjs')) { const rs = execu('sonde', '--moteur=qwen'); sondeQwenCode2 = rs.code === 2; sondeDetail = `code ${rs.code}` }
    const presti = path.resolve(OUTIL, '..', 'presti')
    let prestiOk = false, prestiDetail = 'presti introuvable ou non installé'
    const cfgPrestiPath = path.join(presti, '.orchestre', 'orchestre.json')
    if (existe(cfgPrestiPath)) {
      const cfgPresti = JSON.parse(fs.readFileSync(cfgPrestiPath, 'utf8'))
      const sansFantomes = !(cfgPresti.executants || []).some((e) => ['gemini-cli', 'qwen'].includes(e))
      const idOrch = existe(path.join(presti, 'scripts', 'orchestre.mjs')) ? Buffer.compare(fs.readFileSync(path.join(presti, 'scripts', 'orchestre.mjs')), fs.readFileSync(path.join(source, 'bin', 'orchestre.mjs'))) === 0 : false
      const idExec = existe(path.join(presti, 'scripts', 'executant.mjs')) && existe(srcExecutant) ? Buffer.compare(fs.readFileSync(path.join(presti, 'scripts', 'executant.mjs')), fs.readFileSync(srcExecutant)) === 0 : false
      const idAntig = existe(path.join(presti, 'scripts', 'antigravity.mjs')) && existe(srcAntigravity) ? Buffer.compare(fs.readFileSync(path.join(presti, 'scripts', 'antigravity.mjs')), fs.readFileSync(srcAntigravity)) === 0 : false
      prestiOk = sansFantomes && idOrch && idExec && idAntig
      prestiDetail = `sans fantômes : ${sansFantomes} · orchestre.mjs identique : ${idOrch} · executant.mjs identique : ${idExec} · antigravity.mjs identique : ${idAntig}`
    }
    ors8 = listeOk && validerRefuse && sondeQwenCode2 && prestiOk
    ors8detail = `défaut ${JSON.stringify(cfgFactice.executants)} (attendu ${JSON.stringify(listeAttendue)}) · valider refuse qwen : ${validerRefuse} · sonde --moteur=qwen code 2 : ${sondeQwenCode2} (${sondeDetail}) · presti après maj : ${prestiDetail}`
  } catch (e) { ors8detail = `erreur : ${String(e.message || e).slice(0, 300)}` }
  ok('ORS-8', ors8, ors8detail)

  // ORS-NR : test/preuve.mjs de la source reste vert
  ok('ORS-NR', ...testPreuveDe(source))

  nettoyer(tmp)
  return { ok: lignes.every((l) => l.cond), lignes }
}

// ── groupe baux (fiche 07) ───────────────────────────────────────────────────────────────────────
async function groupeBaux(source) {
  const { ok, lignes } = creerRapport()
  let projet, tmp
  try { ({ projet, tmp } = creerFactice(source, 'baux')) }
  catch (e) {
    const msg = `factice non créé : ${String(e.message || e).slice(0, 300)}`
    for (const id of ['ORB-1', 'ORB-2', 'ORB-3', 'ORB-4', 'ORB-5', 'ORB-6', 'ORB-7', 'ORB-8', 'ORB-9', 'ORB-NR']) ok(id, false, msg)
    return { ok: lignes.every((l) => l.cond), lignes }
  }
  const orch = (...a) => run([path.join(projet, 'scripts', 'orchestre.mjs'), ...a], projet)
  const lireP = (p) => { try { return fs.readFileSync(path.join(projet, p), 'utf8') } catch { return '' } }
  const existeP = (p) => existe(path.join(projet, p))
  const ecrireP = (p, s) => { fs.mkdirSync(path.dirname(path.join(projet, p)), { recursive: true }); fs.writeFileSync(path.join(projet, p), s) }
  const lireVerdicts = () => lireVerdictsDe(projet)
  const troisHeures = new Date(Date.now() - 3 * 3600_000).toISOString().replace(/\.\d{3}Z$/, 'Z')

  orch('prochaine', '--agent=ag-baux') // prend la première tâche témoin (000-test) — best effort, pas un critère en soi

  // ORB-1 : battement <id> code 0 + ligne battement: à jour ; sans verrou code 3
  const r1 = orch('battement', '000-test')
  const lockApres1 = lireP('.orchestre/en-cours/000-test.lock')
  const avecVerrouOk = r1.code === 0 && /^battement:/m.test(lockApres1)
  const r1b = orch('battement', 'id-inexistant-026')
  const sansVerrouOk = r1b.code === 3
  ok('ORB-1', avecVerrouOk && sansVerrouOk, `avec verrou : code ${r1.code}, champ battement: ${/battement:/.test(lockApres1) ? 'présent' : 'absent'} · sans verrou : code ${r1b.code} (attendu 3)`)

  // ORB-2 : verifier depuis en-cours/ rafraîchit battement:
  if (existeP('.orchestre/en-cours/000-test.lock')) ecrireP('.orchestre/en-cours/000-test.lock', lireP('.orchestre/en-cours/000-test.lock').replace(/^battement:.*$/m, 'battement: 2000-01-01T00:00:00Z') .replace(/^(?!.*battement:)([\s\S]*)$/, '$1battement: 2000-01-01T00:00:00Z\n'))
  orch('verifier', '000-test')
  const battApres2 = (lireP('.orchestre/en-cours/000-test.lock').match(/^battement:\s*(.*)$/m) || [])[1] || null
  ok('ORB-2', existeP('.orchestre/en-cours/000-test.lock') && !!battApres2 && battApres2 !== '2000-01-01T00:00:00Z', `battement forcé à 2000-01-01 avant verifier · après verifier : ${battApres2 || '(absent)'}`)

  // ORB-3 : verrou vieilli (3h), sans battement → prochaine le reprend (file/ puis un autre agent), .lock/.avant.txt
  // refaits, l'ancien preuves/<id>/avant.txt gardé, verdicts.jsonl gagne EXPIRÉE pour l'ancien agent
  const anciennePreuve = 'trace de la première tentative (026-098, ORB-3)\n'
  ecrireP('.orchestre/preuves/000-test/avant.txt', anciennePreuve)
  if (existeP('.orchestre/en-cours/000-test.lock')) ecrireP('.orchestre/en-cours/000-test.lock', `agent: ag-baux\ndepuis: ${troisHeures}\nsha: (essai 026-098)\n`)
  const r3 = orch('prochaine', '--agent=ag-c')
  const priseParC = /000-test prise par ag-c/.test(r3.out)
  const lockRefait = /agent:\s*ag-c/.test(lireP('.orchestre/en-cours/000-test.lock'))
  const avantConserve = existeP('.orchestre/preuves/000-test/avant.txt') && lireP('.orchestre/preuves/000-test/avant.txt') === anciennePreuve
  const verdictExpiree = lireVerdicts().some((v) => v.id === '000-test' && v.verdict === 'EXPIRÉE' && v.agent === 'ag-baux')
  ok('ORB-3', priseParC && lockRefait && avantConserve && verdictExpiree, `reprise par ag-c : ${priseParC} · lock refait (agent: ag-c) : ${lockRefait} · ancien preuves/000-test/avant.txt gardé : ${avantConserve} · verdict EXPIRÉE (agent ag-baux) : ${verdictExpiree}`)

  // ORB-4 : verrou vieilli (3h) mais battu il y a 10 min → PAS repris
  const dixMin = new Date(Date.now() - 10 * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z')
  if (existeP('.orchestre/en-cours/000-test.lock')) ecrireP('.orchestre/en-cours/000-test.lock', `agent: ag-c\ndepuis: ${troisHeures}\nbattement: ${dixMin}\nsha: (essai 026-098)\n`)
  const r4 = orch('prochaine', '--agent=ag-d')
  const nonRepris = existeP('.orchestre/en-cours/000-test.lock') && /agent:\s*ag-c/.test(lireP('.orchestre/en-cours/000-test.lock')) && !existeP('.orchestre/file/000-test.md')
  ok('ORB-4', nonRepris, `après battement de 10 min, verrou toujours agent: ag-c : ${nonRepris} · sortie prochaine : ${(r4.out.trim().split('\n')[0] || '').slice(0, 120)}`)

  // ORB-5 : expirer reprend sans rien distribuer, liste ce qu'il a repris, code 0
  if (existeP('.orchestre/en-cours/000-test.lock')) ecrireP('.orchestre/en-cours/000-test.lock', `agent: ag-c\ndepuis: ${troisHeures}\nsha: (essai 026-098)\n`) // de nouveau expiré, sans battement récent
  const r5 = orch('expirer')
  ok('ORB-5', r5.code === 0 && /000-test/.test(r5.out), `code ${r5.code} (attendu 0) · cite 000-test : ${/000-test/.test(r5.out)} · sortie : ${r5.out.trim().split('\n').slice(0, 2).join(' / ')}`)

  // ORB-6 : disjoncteur — deux FAIL consécutifs depuis fait/ avec la même ligne → DISJONCTÉE + refuse/ au prochain prochaine/expirer
  let dansRefuse = false
  for (let i = 0; i < 2; i++) {
    const rp = orch('prochaine', '--agent=ag-e')
    if (!/001-test-echec/.test(rp.out)) break
    if (existeP('.orchestre/en-cours/001-test-echec.md')) fs.renameSync(path.join(projet, '.orchestre', 'en-cours', '001-test-echec.md'), path.join(projet, '.orchestre', 'fait', '001-test-echec.md'))
    orch('verifier', '001-test-echec')
    if (i === 0) orch('rejouer', '001-test-echec')
  }
  const rDeja = orch('prochaine', '--agent=ag-f')
  orch('expirer')
  const disjonctee = lireVerdicts().some((v) => v.id === '001-test-echec' && v.verdict === 'DISJONCTÉE')
  dansRefuse = existeP('.orchestre/refuse/001-test-echec.md')
  // Deux FAIL de travail en en-cours ne sont jamais des fins de tâche.
  const idTravail = 'tache-travail-026'
  ecrireP(`.orchestre/file/${idTravail}.md`, `---\nid: ${idTravail}\ntype: test\nobjectif: échecs intermédiaires\nperimetre: [temoin-travail]\ninterdit: []\nverifier: node -e "console.error('échec intermédiaire');process.exit(1)"\nbudget: { fichiers: 1, minutes: 1 }\npreuve: temoin-travail\n---\n# témoin\n`)
  const priseTravail = orch('prochaine', '--agent=ag-travail', '--tache=' + idTravail)
  const travail1 = orch('verifier', idTravail)
  const travail2 = orch('verifier', idTravail)
  orch('expirer')
  const failsTravail = lireVerdicts().filter(v => v.id === idTravail && v.verdict === 'FAIL' && v.dossier === 'en-cours')
  const travailNonDisjoncte = priseTravail.code === 0 && travail1.code !== 0 && travail2.code !== 0 && failsTravail.length === 2 && existeP(`.orchestre/en-cours/${idTravail}.md`) && !lireVerdicts().some(v => v.id === idTravail && v.verdict === 'DISJONCTÉE')
  orch('liberer', idTravail)
  ok('ORB-6', disjonctee && dansRefuse && travailNonDisjoncte, `FAIL en-cours ignorés : ${travailNonDisjoncte} (${failsTravail.length} verdicts) · verdict DISJONCTÉE : ${disjonctee} · dans refuse/ : ${dansRefuse} · sortie du prochaine suivant : ${(rDeja.out.trim().split('\n')[0] || '').slice(0, 120)}`)

  // ORB-7 : rejouer sur une tâche DISJONCTÉE → code 3 sans --forcer, remise en file avec --forcer
  let ok7 = false, detail7 = "001-test-echec n'est pas DISJONCTÉE (voir ORB-6) : non testable ici"
  if (dansRefuse) {
    const r7a = orch('rejouer', '001-test-echec')
    const bloque = r7a.code === 3 && !existeP('.orchestre/file/001-test-echec.md')
    const r7b = orch('rejouer', '001-test-echec', '--forcer')
    const passe = r7b.code === 0 && existeP('.orchestre/file/001-test-echec.md')
    ok7 = bloque && passe
    detail7 = `sans --forcer : code ${r7a.code} (attendu 3), pas en file : ${!existeP('.orchestre/file/001-test-echec.md') || bloque} · avec --forcer : code ${r7b.code}, en file : ${passe}`
  }
  ok('ORB-7', ok7, detail7)

  // ORB-8 : digest.md — après le bloc budget s'il existe, la section juste après le titre est « ## Attention (n) »,
  // ≤7 lignes, chacune finie par une commande entre accents graves ; n=0 → « rien à décider »
  orch('digest')
  const digestTxt = lireP('.orchestre/digest.md')
  const titreIdx = digestTxt.indexOf('# Digest —')
  const apresTitre = titreIdx >= 0 ? digestTxt.slice(titreIdx) : ''
  const mAtt = apresTitre.match(/^## Attention \((\d+)\)\n([\s\S]*?)(?=\n## |\n\| id \| type |$)/m)
  let attOk = false, attDetail = 'aucune section « ## Attention (n) » juste après le titre'
  if (mAtt) {
    const n = Number(mAtt[1])
    const lignesAtt = mAtt[2].split('\n').filter((l) => l.trim())
    const septMax = lignesAtt.length <= 7
    const chaqueCommande = lignesAtt.length === 0 || lignesAtt.every((l) => /`[^`]+`\s*$/.test(l))
    const rienADecider = n !== 0 || /rien à décider/.test(mAtt[2])
    attOk = septMax && chaqueCommande && rienADecider
    attDetail = `n=${n} · ${lignesAtt.length} ligne(s) (≤7 : ${septMax}) · chaque ligne finit par une commande entre accents graves : ${chaqueCommande} · « rien à décider » si n=0 : ${rienADecider}`
  }
  ok('ORB-8', attOk, attDetail)

  // ORB-9 : quarantaine des décisions écrites par un exécutant (R3, recherche du 24/09)
  let ok9 = false, detail9 = ''
  try {
    const decTxt = lireP('.orchestre/decisions.md')
    const gabaritOk = /## Proposées \(quarantaine\)/.test(decTxt) && /Claude Code/.test(decTxt) && /Benj/.test(decTxt) && /id de (sa|la) tâche/i.test(decTxt)

    const idC = 'tache-c-026'
    ecrireP(`.orchestre/file/${idC}.md`, `---\nid: ${idC}\ntype: test\nobjectif: essai quarantaine (hors section)\nperimetre: [x]\ninterdit: []\nverifier: node -e "process.exit(0)"\nbudget: { fichiers: 1, minutes: 1 }\npreuve: x\n---\n# x\n`)
    orch('prochaine', '--agent=ag-quarantaine', '--tache=' + idC)
    const decPropre = lireP('.orchestre/decisions.md')
    ecrireP('.orchestre/decisions.md', decPropre.includes('## Décisions ajoutées par les agents')
      ? decPropre.replace('## Décisions ajoutées par les agents', `## Décisions ajoutées par les agents\n\n| Injectée hors quarantaine par ${idC} | oui (${idC}) | Oui |`)
      : decPropre + `\n\n| Injectée hors quarantaine par ${idC} | oui (${idC}) | Oui |\n`)
    if (existeP(`.orchestre/en-cours/${idC}.md`)) fs.renameSync(path.join(projet, '.orchestre', 'en-cours', `${idC}.md`), path.join(projet, '.orchestre', 'fait', `${idC}.md`))
    const rHors = orch('verifier', idC)
    const echoueHorsQuarantaine = rHors.code !== 0 && /decisions\.md/.test(rHors.out)

    ecrireP('.orchestre/decisions.md', decPropre) // remise à l'état propre
    if (existeP(`.orchestre/refuse/${idC}.md`)) fs.renameSync(path.join(projet, '.orchestre', 'refuse', `${idC}.md`), path.join(projet, '.orchestre', 'file', `${idC}.md`))
    orch('prochaine', '--agent=ag-quarantaine2', '--tache=' + idC)
    const decAvantQuar = lireP('.orchestre/decisions.md')
    const propositionTexte = `Proposition test en quarantaine (${idC}) — ne doit fuiter nulle part ailleurs.`
    ecrireP('.orchestre/decisions.md', decAvantQuar.includes('## Proposées (quarantaine)')
      ? decAvantQuar.replace('## Proposées (quarantaine)', `## Proposées (quarantaine)\n\n- ${propositionTexte}`)
      : decAvantQuar + `\n\n## Proposées (quarantaine)\n\n- ${propositionTexte}\n`)
    if (existeP(`.orchestre/en-cours/${idC}.md`)) fs.renameSync(path.join(projet, '.orchestre', 'en-cours', `${idC}.md`), path.join(projet, '.orchestre', 'fait', `${idC}.md`))
    const rDans = orch('verifier', idC)
    const passeQuarantaine = rDans.code === 0

    const idD = 'tache-d-026'
    ecrireP(`.orchestre/file/${idD}.md`, `---\nid: ${idD}\ntype: test\nobjectif: essai quarantaine D\nperimetre: [y]\ninterdit: []\nverifier: node -e "process.exit(0)"\nbudget: { fichiers: 1, minutes: 1 }\npreuve: y\n---\n# y\n`)
    const rD = orch('prochaine', '--agent=ag-d2', '--tache=' + idD)
    const rappelPresent = /d[ée]cisions tranch[ée]es/i.test(rD.out)
    const neLeakePas = !rD.out.includes(propositionTexte)

    orch('digest')
    const digestTxt2 = lireP('.orchestre/digest.md')
    const citeCommande = /node scripts\/orchestre\.mjs promouvoir \d+/.test(digestTxt2)

    // Une proposition de prix reste intacte sans l'accord --benj.
    const avantPrix = lireP('.orchestre/decisions.md')
    const textePrix = 'Prix de démonstration : 999 euros (id de la tâche : tache-d-026)'
    ecrireP('.orchestre/decisions.md', avantPrix.replace('## Proposées (quarantaine)', `## Proposées (quarantaine)\n\n- ${textePrix}`))
    const avantPromotion = lireP('.orchestre/decisions.md')
    const promotion = orch('promouvoir', '1')
    const prixRefuse = promotion.code === 3 && /Benj|--benj/.test(promotion.out) && lireP('.orchestre/decisions.md') === avantPromotion
    ecrireP('.orchestre/decisions.md', avantPrix)
    detail9 = `prix sans --benj refusé et décisions intactes : ${prixRefuse} (code ${promotion.code}) · `
    ok9 = prixRefuse && gabaritOk && echoueHorsQuarantaine && passeQuarantaine && rappelPresent && neLeakePas && citeCommande
    detail9 += `gabarit decisions.md (section quarantaine + règle) : ${gabaritOk} · hors quarantaine → FAIL nommant decisions.md : ${echoueHorsQuarantaine} (code ${rHors.code}) · sous « Proposées » → PASS : ${passeQuarantaine} (code ${rDans.code}) · rappel « décisions tranchées » sur prochaine(D) : ${rappelPresent} · pas de fuite du texte de la proposition : ${neLeakePas} · Attention cite promouvoir : ${citeCommande}`
  } catch (e) { detail9 = `erreur : ${String(e.message || e).slice(0, 300)}` }
  ok('ORB-9', ok9, detail9)

  // ORB-NR : test/preuve.mjs de la source reste vert
  ok('ORB-NR', ...testPreuveDe(source))

  nettoyer(tmp)
  return { ok: lignes.every((l) => l.cond), lignes }
}

// ── groupe quota (fiche 08) ──────────────────────────────────────────────────────────────────────
async function groupeQuota(source) {
  const { ok, lignes } = creerRapport()
  let projet, tmp
  try { ({ projet, tmp } = creerFactice(source, 'quota')) }
  catch (e) {
    const msg = `factice non créé : ${String(e.message || e).slice(0, 300)}`
    for (const id of ['ORQ-1', 'ORQ-2', 'ORQ-3', 'ORQ-4', 'ORQ-5', 'ORQ-6', 'ORQ-7', 'ORQ-8', 'ORQ-9', 'ORQ-NR']) ok(id, false, msg)
    return { ok: lignes.every((l) => l.cond), lignes }
  }
  const orch = (...a) => run([path.join(projet, 'scripts', 'orchestre.mjs'), ...a], projet)
  const lireP = (p) => { try { return fs.readFileSync(path.join(projet, p), 'utf8') } catch { return '' } }
  const existeP = (p) => existe(path.join(projet, p))
  const lireVerdicts = () => lireVerdictsDe(projet)
  const FAUX_CODEX = path.join(OUTIL, 'test', 'fixtures-026', 'faux-codex.mjs')
  const temoin = path.join(tmp, 'faux-codex-appels.log')
  const lireTemoin = () => existe(temoin) ? fs.readFileSync(temoin, 'utf8') : ''
  const runExec = (args, envExtra) => run([path.join(projet, 'scripts', 'executant.mjs'), ...args], projet, undefined, { ORCHESTRE_CODEX_BIN: FAUX_CODEX, FAUX_CODEX_TEMOIN: temoin, ...envExtra })
  const premiereEnCours = () => { const d = path.join(projet, '.orchestre', 'en-cours'); const f = existe(d) ? fs.readdirSync(d).find((x) => x.endsWith('.md')) : null; return f ? f.replace(/\.md$/, '') : null }

  orch('maj')
  const executantOk = existeP('scripts/executant.mjs')

  // ORQ-1 : lancer codex-t --tache=<id> sur le faux quota → code 3, tâche revenue en file/, verrou levé
  let ok1 = false, detail1 = 'scripts/executant.mjs absent (voir groupe source)'
  let idQuota1 = null
  if (executantOk) {
    orch('prochaine', '--agent=codex-t')
    idQuota1 = premiereEnCours()
    if (idQuota1) {
      const r1 = runExec(['lancer', 'codex-t', '--tache=' + idQuota1], { FAUX_CODEX_MODE: 'quota' })
      const revenueEnFile = existeP(`.orchestre/file/${idQuota1}.md`)
      const verrouLeve = !existeP(`.orchestre/en-cours/${idQuota1}.lock`)
      ok1 = r1.code === 3 && revenueEnFile && verrouLeve
      detail1 = `lancer codex-t --tache=${idQuota1} : code ${r1.code} (attendu 3) · revenue en file/ : ${revenueEnFile} · verrou levé : ${verrouLeve}`
    } else detail1 = 'aucune tâche disponible à prendre pour le témoin (voir gabarit-tache.md du factice)'
  }
  ok('ORQ-1', ok1, detail1)

  // ORQ-2 : .orchestre/quotas.json = {"codex":{"jusqua":"2099-09-30T00:17:00Z","vu":…,"message":…}} (Paris → UTC)
  let ok2 = false, detail2 = ''
  try {
    const q = existeP('.orchestre/quotas.json') ? JSON.parse(lireP('.orchestre/quotas.json')) : null
    ok2 = !!(q && q.codex && q.codex.jusqua === '2099-09-30T00:17:00Z' && q.codex.vu && q.codex.message)
    detail2 = q ? `quotas.json → codex : ${JSON.stringify(q.codex).slice(0, 200)}` : 'quotas.json absent'
  } catch (e) { detail2 = `erreur : ${String(e.message || e).slice(0, 200)}` }
  ok('ORQ-2', ok2, detail2)

  // ORQ-3 : verdicts.jsonl gagne {verdict:'QUOTA', executant:'codex'}
  const quotaVerdict = lireVerdicts().some((v) => v.verdict === 'QUOTA' && v.executant === 'codex')
  ok('ORQ-3', quotaVerdict, `verdict QUOTA (executant codex) présent : ${quotaVerdict}`)

  // ORQ-4 : pendant le quota, prochaine --agent=codex-u → code 2 en citant la date ; --agent=ag-u prend la tâche
  let ok4 = false, detail4 = ''
  try {
    const r4a = orch('prochaine', '--agent=codex-u')
    const citeDate = /2099-09-30|30\/09\/2099|30 septembre 2099/i.test(r4a.out)
    const r4b = orch('prochaine', '--agent=ag-u')
    const prise4b = /prise par ag-u/.test(r4b.out)
    ok4 = r4a.code === 2 && citeDate && prise4b
    detail4 = `codex-u : code ${r4a.code} (attendu 2), cite la date : ${citeDate} · ag-u : tâche prise : ${prise4b}`
  } catch (e) { detail4 = `erreur : ${String(e.message || e).slice(0, 200)}` }
  ok('ORQ-4', ok4, detail4)

  // ORQ-5 : pendant le quota, executant.mjs lancer sort en code 3 SANS appeler le faux Codex (aucun fichier témoin)
  let ok5 = false, detail5 = 'scripts/executant.mjs absent'
  if (executantOk) {
    const avantTemoin = lireTemoin()
    const r5 = runExec(['lancer', 'codex-v', '--tache=inexistante-026-098'], { FAUX_CODEX_MODE: 'normal' })
    const apresTemoin = lireTemoin()
    ok5 = r5.code === 3 && apresTemoin === avantTemoin
    detail5 = `code ${r5.code} (attendu 3) · fichier témoin inchangé (faux Codex non appelé) : ${apresTemoin === avantTemoin}`
  }
  ok('ORQ-5', ok5, detail5)

  // ORQ-6 : une date jusqua passée rend la main à codex-u
  let ok6 = false, detail6 = ''
  try {
    if (existeP('.orchestre/quotas.json')) {
      const qp = path.join(projet, '.orchestre', 'quotas.json')
      const q = JSON.parse(fs.readFileSync(qp, 'utf8'))
      q.codex.jusqua = '2000-01-01T00:00:00Z'
      fs.writeFileSync(qp, JSON.stringify(q))
      const r6 = orch('prochaine', '--agent=codex-u')
      ok6 = r6.code !== 2
      detail6 = `jusqua forcée dans le passé → prochaine --agent=codex-u : code ${r6.code} (≠2 attendu)`
    } else detail6 = 'quotas.json absent (voir ORQ-2)'
  } catch (e) { detail6 = `erreur : ${String(e.message || e).slice(0, 200)}` }
  ok('ORQ-6', ok6, detail6)

  // ORQ-7 : sans date lisible dans le message, jusqua = vu + 6h
  let ok7 = false, detail7 = ''
  if (executantOk) {
    try {
      if (existeP('.orchestre/quotas.json')) fs.rmSync(path.join(projet, '.orchestre', 'quotas.json'), { force: true })
      orch('prochaine', '--agent=codex-w')
      const idW = premiereEnCours()
      if (idW) {
        runExec(['lancer', 'codex-w', '--tache=' + idW], { FAUX_CODEX_MODE: 'quota-sans-date' })
        const q = existeP('.orchestre/quotas.json') ? JSON.parse(lireP('.orchestre/quotas.json')) : null
        if (q?.codex?.jusqua && q?.codex?.vu) {
          const delta = new Date(q.codex.jusqua) - new Date(q.codex.vu)
          ok7 = Math.abs(delta - 6 * 3600_000) < 60_000
          detail7 = `jusqua − vu = ${Math.round(delta / 60000)} min (attendu 360, ±1)`
        } else detail7 = 'quotas.json sans jusqua/vu exploitables après un message sans date'
      } else detail7 = 'aucune tâche disponible pour ce sous-test'
    } catch (e) { detail7 = `erreur : ${String(e.message || e).slice(0, 200)}` }
  } else detail7 = 'scripts/executant.mjs absent'
  ok('ORQ-7', ok7, detail7)

  // ORQ-8 : le bloc Attention porte « codex à sec jusqu'au … » et la commande antigravity.mjs lancer ag-<n> --tache=<id>
  let ok8 = false, detail8 = ''
  try {
    orch('digest')
    const d = lireP('.orchestre/digest.md')
    const citeCodexASec = /codex à sec jusqu'au/i.test(d)
    const citeCommande = /node scripts\/antigravity\.mjs lancer ag-\S+ --tache=/.test(d)
    ok8 = citeCodexASec && citeCommande
    detail8 = `« codex à sec jusqu'au » présent : ${citeCodexASec} · commande antigravity.mjs lancer ag-<n> --tache=<id> citée : ${citeCommande}`
  } catch (e) { detail8 = `erreur : ${String(e.message || e).slice(0, 200)}` }
  ok('ORQ-8', ok8, detail8)

  // ORQ-9 : executant.mjs exporte quotaActif(moteur) → { actif, jusqua }
  let ok9 = false, detail9 = 'scripts/executant.mjs absent'
  if (executantOk) {
    const s = sonderModule(path.join(projet, 'scripts', 'executant.mjs'), projet, 'mod && typeof mod.quotaActif === "function" ? { r: mod.quotaActif("codex") } : { r: null }')
    const r = s.resultat?.r
    ok9 = s.ok && r && typeof r === 'object' && 'actif' in r && 'jusqua' in r
    detail9 = `sonde ok : ${s.ok} · quotaActif('codex') → ${r ? JSON.stringify(r).slice(0, 150) : '(non exporté ou erreur)'}`
  }
  ok('ORQ-9', ok9, detail9)

  // ORQ-NR : test/preuve.mjs de la source reste vert
  ok('ORQ-NR', ...testPreuveDe(source))

  nettoyer(tmp)
  return { ok: lignes.every((l) => l.cond), lignes }
}

// test/preuve.mjs de --source (chemin, cond, détail)
function testPreuveDe(source) {
  const pmjs = path.join(source, 'test', 'preuve.mjs')
  if (!existe(pmjs)) return [false, `test/preuve.mjs absent de ${versSlash(source)}`]
  const rp = spawnSync(process.execPath, [pmjs], { cwd: source, encoding: 'utf8', maxBuffer: 1 << 26 })
  const derniere = (rp.stdout || '').trim().split(/\r?\n/).slice(-1)[0] || ''
  return [rp.status === 0, `code ${rp.status} · ${derniere.slice(0, 160)}`]
}

// ── PX-1 (en direct, dans presti) ────────────────────────────────────────────────────────────────
// git status --porcelain est LIMITÉ aux chemins que --a-blanc pourrait toucher (jamais tout le dépôt : d'autres
// sessions y travaillent en parallèle — comparer le statut global serait bruité par leur activité, pas la nôtre).
function verifierPX1(presti) {
  try {
    if (!existe(path.join(presti, 'scripts', 'executant.mjs'))) return { ok: false, detail: `scripts/executant.mjs introuvable dans ${versSlash(presti)}` }
    const perimetreGit = ['status', '--porcelain', '--', '.orchestre/travail', '.orchestre/agents.jsonl']
    const avant = (spawnSync('git', perimetreGit, { cwd: presti, encoding: 'utf8' }).stdout || '')
    const r = spawnSync(process.execPath, [path.join(presti, 'scripts', 'executant.mjs'), 'lancer', 'x', '--tache=t', '--a-blanc'], { cwd: presti, encoding: 'utf8' })
    const apres = (spawnSync('git', perimetreGit, { cwd: presti, encoding: 'utf8' }).stdout || '')
    const rienEcrit = avant === apres
    let obj = null
    try { obj = JSON.parse((r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop()) } catch { /* pas encore de --a-blanc, ou sortie invalide */ }
    const argv = Array.isArray(obj?.argv) ? obj.argv : []
    const contientOrchestre = addDirs(argv).includes('C:/Users/benja/Documents/orchestre')
    const contientWW = argv.includes('workspace-write')
    const ok = r.status === 0 && !!obj && contientOrchestre && contientWW && rienEcrit
    const detail = `code ${r.status} · sortie JSON valide : ${!!obj} · --add-dir C:/Users/benja/Documents/orchestre : ${contientOrchestre} · workspace-write : ${contientWW} · rien écrit dans .orchestre/travail ni agents.jsonl : ${rienEcrit} · argv ${JSON.stringify(argv).slice(0, 260)}`
    return { ok, detail }
  } catch (e) { return { ok: false, detail: `erreur : ${String(e.message || e).slice(0, 300)}` } }
}

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────
async function lancerGroupes(groupes, source) {
  const attendu = { source: 'ORS-1', baux: 'ORB-1', quota: 'ORQ-1' }
  let mauvais = 0
  const rouges = []
  for (const g of groupes) {
    console.log(`\n== groupe ${g} — source ${versSlash(source)} ==`)
    let res
    if (!attendu[g]) { console.error(`✗ groupe inconnu : ${g} (source|baux|quota)`); return 2 }
    try {
      res = g === 'source' ? await groupeSource(source) : g === 'baux' ? await groupeBaux(source) : await groupeQuota(source)
    } catch (e) {
      console.error(`✗ groupe ${g} : exception non rattrapée — ${String(e.stack || e).slice(0, 600)}`)
      console.log(`FAIL ${attendu[g]} — exception dans le groupe : ${String(e.message || e).slice(0, 200)}`)
      console.log(`✗ ${attendu[g]} — exception dans le groupe : ${String(e.message || e).slice(0, 200)}`)
      res = { ok: false, lignes: [{ id: attendu[g], cond: false, detail: 'exception' }] }
    }
    if (!res.ok) mauvais++
    rouges.push(...res.lignes.filter(l => !l.cond).map(l => l.id))
  }
  console.log(mauvais ? `\n✗ ${mauvais} groupe(s) en échec` : '\n✓ tous les groupes passent')
  console.log(`preuve-026 : ${mauvais ? 'FAIL — ' + [...new Set(rouges)].join(', ') : 'PASS'}`)
  return mauvais ? 1 : 0
}

async function modePreuveEchecs() {
  let echecs = 0
  const presti = path.resolve(OUTIL, '..', 'presti')

  console.log('\n== PX-1 (presti, en direct — avant toute autre écriture) ==')
  const px1 = verifierPX1(presti)
  console.log(`${px1.ok ? '✓' : '✗'} PX-1 — ${px1.detail}`)
  if (!px1.ok) echecs++

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestre-preuve-echecs-'))
  const REF = 'faaef0d'
  const tarPath = path.join(tmp, 'reference.tar')
  const extrait = path.join(tmp, 'reference')
  fs.mkdirSync(extrait, { recursive: true })
  const a1 = spawnSync('git', ['archive', '--format=tar', '-o', tarPath, REF], { cwd: OUTIL, encoding: 'utf8' })
  let racineOk = a1.status === 0
  // Le tar de Git for Windows (GNU tar, MSYS) lit « C:\… » comme un hôte distant (« user@host:chemin », « Cannot
  // connect to C: ») : piège de lettre de lecteur, pas un vrai échec réseau. Le tar de Windows (bsdtar,
  // System32) ne l'a pas — on le préfère explicitement plutôt que de dépendre de l'ordre du PATH.
  const TAR = process.platform === 'win32' && existe('C:/Windows/System32/tar.exe') ? 'C:/Windows/System32/tar.exe' : 'tar'
  if (racineOk) { const a2 = spawnSync(TAR, ['-xf', tarPath, '-C', extrait], { encoding: 'utf8' }); racineOk = a2.status === 0; if (!racineOk) console.error('✗ extraction tar : ' + (a2.stderr || a2.stdout)) }
  else console.error('✗ git archive : ' + (a1.stderr || a1.stdout))

  const attendus = { source: 'ORS-1', baux: 'ORB-1', quota: 'ORQ-1' }
  const rapports = {}
  if (racineOk) {
    for (const g of ['source', 'baux', 'quota']) {
      console.log(`\n== --preuve-echecs : groupe ${g} contre la référence ${REF} ==`)
      const r = spawnSync(process.execPath, [CE_FICHIER, `--groupe=${g}`, `--source=${extrait}`], { encoding: 'utf8', maxBuffer: 1 << 26 })
      const sortie = (r.stdout || '') + (r.stderr || '')
      console.log(sortie)
      let premier = null
      for (const ligne of sortie.split(/\r?\n/)) { const m = ligne.match(/^✗ (OR[SBQ]-[A-Za-z0-9-]+)\b/); if (m) { premier = m[1]; break } }
      const bon = r.status !== 0 && premier === attendus[g]
      console.log(`${bon ? '✓' : '✗'} groupe ${g} : code ${r.status}, premier échec ${premier || '(aucun — tout est vert, ce qui ne devrait pas arriver aujourd’hui)'} (attendu ${attendus[g]})`)
      if (!bon) echecs++
      const ligneDetail = sortie.split(/\r?\n/).find((l) => l.startsWith('✗ ' + attendus[g])) || '(introuvable dans la sortie)'
      rapports[g] = { code: r.status, premier, ligneDetail }
    }
  } else {
    for (const g of ['source', 'baux', 'quota']) { rapports[g] = { code: null, premier: null, ligneDetail: 'extraction de la référence en échec' }; echecs++ }
  }

  let preuveVerte = false, preuveDetail = ''
  if (racineOk) {
    const pmjs = path.join(extrait, 'test', 'preuve.mjs')
    if (existe(pmjs)) {
      const rp = spawnSync(process.execPath, [pmjs], { cwd: extrait, encoding: 'utf8', maxBuffer: 1 << 26 })
      console.log('\n== test/preuve.mjs de l’extrait ==\n' + (rp.stdout || '') + (rp.stderr || ''))
      preuveVerte = rp.status === 0
      preuveDetail = `code ${rp.status}`
    } else preuveDetail = 'test/preuve.mjs absent de l’extrait'
  } else preuveDetail = 'extraction en échec'
  console.log(`${preuveVerte ? '✓' : '✗'} test/preuve.mjs (extrait) : ${preuveDetail}`)
  if (!preuveVerte) echecs++

  // echecs-attendus.md — écrit APRÈS PX-1, pour ne pas polluer sa comparaison git status
  const dossierPreuve = path.join(presti, '.orchestre', 'preuves', '026-098')
  fs.mkdirSync(dossierPreuve, { recursive: true })
  const md = [
    "# 026-098 — échecs attendus de `test/preuve-026.mjs --preuve-echecs`", '',
    `Référence : dépôt orchestre extrait à \`${REF}\` (git archive, sans toucher au \`.git\`). Généré le ${maintenant()}.`, '',
    ...['source', 'baux', 'quota'].flatMap((g) => {
      const r = rapports[g]
      return [`## Groupe ${g}`, '', `Premier critère en échec attendu : \`${attendus[g]}\` — obtenu : \`${r.premier || '(aucun)'}\` (code ${r.code}).`, '', '```', r.ligneDetail, '```', '']
    }),
    "## test/preuve.mjs de l'extrait", '', preuveDetail + (preuveVerte ? ' — vert.' : ' — EN ÉCHEC.'), '',
    "## PX-1 (`--a-blanc` dans presti, en direct)", '', px1.detail, '',
    '---', '',
    `${echecs ? `✗ ${echecs} contrôle(s) de --preuve-echecs en échec` : '✓ --preuve-echecs : tous les contrôles passent'}.`, '',
  ].join('\n')
  fs.writeFileSync(path.join(dossierPreuve, 'echecs-attendus.md'), md)
  console.log(`\n${echecs ? `✗ ${echecs} contrôle(s) --preuve-echecs en échec` : '✓ --preuve-echecs : tous les contrôles passent'} · ${versSlash(path.join(dossierPreuve, 'echecs-attendus.md'))} écrit`)

  nettoyer(tmp)
  return echecs ? 1 : 0
}

const args = process.argv.slice(2)
const option = (nom, defaut = null) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); if (a) return a.slice(nom.length + 3); return args.includes(`--${nom}`) ? true : defaut }
const groupesDemandes = String(option('groupe', 'source,baux,quota')).split(',').map((s) => s.trim()).filter(Boolean)
const sourceDemandee = path.resolve(String(option('source', OUTIL)))
const code = args.includes('--preuve-echecs') ? await modePreuveEchecs() : await lancerGroupes(groupesDemandes, sourceDemandee)
process.exit(code)
