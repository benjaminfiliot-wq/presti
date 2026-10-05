#!/usr/bin/env node
// scripts/juges-026-pubs-usine-mutations.mjs — fiche 026-203 : les mutations des juges de la fabrication des pubs sur l'usine (usine-pubs-qa)
// et de la Search Console automatique (search-console-qa). Chaque mutation est UN remplacement de texte exact, posé dans une COPIE du code livré par
// 026-200 et 026-201 (jamais dans le dépôt) ; le juge est lancé sur la copie intacte (témoin : code 0) puis sur chaque copie mutée (code ≠ 0, avec
// « FAIL <critère> — » et le bilan qui nomme le critère). Aucun --reel, aucun appel à un vrai service : les juges parlent à des faux sur 127.0.0.1.
//
//   node scripts/juges-026-pubs-usine-mutations.mjs [--seul=<critère|nom>] [--garder]
//
// Écrit .orchestre/preuves/026-203/mutations.json (lu par le méta-juge : juges-026-mutations-preuve.mjs) et mutations.md. Une mutation que son
// juge n'attrape pas n'est JAMAIS corrigée ici : elle est écrite en tête de mutations.md et le script sort en code 1 (lacune du juge, à rouvrir
// chez Claude Code). Codes : 0 tout attrapé et tous les témoins verts · 1 une mutation survit ou un témoin est rouge · 3 passage partiel (--seul).
// La partie `tourneur` d'usine-pubs-qa ne tourne que sous Linux : lancer ce script sur l'usine (scripts/usine.mjs executer).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FICHE = '026-203'
const TRAVAIL = path.join(ROOT, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(ROOT, '.orchestre', 'preuves', FICHE)
const DELAI_MS = 12 * 60_000 // un passage de juge (typecheck compris)
const BUDGET_MS = 19 * 60_000 // le méta-juge laisse 20 minutes au script
const DOSSIERS = ['app', 'lib', 'components', 'scripts', 'plans']
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']

const args = process.argv.slice(2)
const garder = args.includes('--garder')
const seul = args.find((a) => a.startsWith('--seul='))?.slice(7) ?? null
const lancerOpt = args.find((a) => a.startsWith('--lancer='))?.slice(9) ?? null
const racineOpt = args.find((a) => a.startsWith('--racine='))?.slice(9) ?? null
for (const a of args) if (a !== '--garder' && !/^--(seul|lancer|racine)=./.test(a)) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }

// ── les deux juges ─────────────────────────────────────────────────────────────────────────────────────────────────────
// usine-pubs-qa juge une racine qui ne porte QUE les fichiers jugés (les sept de UP-1, plus scripts/usine/) : le reste de lib/ vient du dépôt par le
// crochet de résolution de sa sonde, et ses doublures (lib/flags, lib/agents/garde, lib/agents/pause) ne se posent que sur un chemin que la racine ne
// porte pas. Sur une copie complète du dépôt, les routes lisent le vrai lib/flags et rendent 503. Chaque passage de ce juge est donc fait sur une
// PROJECTION de la copie (`projeter`) ; la commande consignée pour le méta-juge est ce script en mode --lancer, qui la fabrique puis lance le juge.
// search-console-qa, lui, fait tourner `npm run typecheck` sur sa racine : copie complète.
const JUGES = {
  'usine-pubs': { chemin: 'scripts/usine-pubs-qa.mjs', nom: 'usine-pubs-qa', projection: true },
  'search-console': { chemin: 'scripts/search-console-qa.mjs', nom: 'search-console-qa', projection: false },
}
const FICHIERS_PROJETES = [
  'app/api/usine/pubs/travail/route.ts', 'app/api/usine/pubs/depot/route.ts', 'app/api/usine/pubs/rendu/route.ts', 'lib/pubs/usinePubs.ts',
  'scripts/usine/pubs.mjs', 'scripts/usine/systemd/presti-pubs.service', 'scripts/usine/systemd/presti-pubs.timer',
]
const R = 'app/api/usine/pubs'
const TOURNEUR = 'scripts/usine/pubs.mjs'
const LIB = 'lib/pubs/usinePubs.ts'
const SC = 'lib/sites/searchConsole.ts'
const LIVRAISON = 'lib/siteLivraison.ts'

// Chaque mutation : un `avant` présent UNE seule fois dans `fichier`, sur UNE ligne (les copies sont en LF ou en CRLF selon la machine).
// `imposee` : demandée par la fiche ; sinon, une variante ajoutée ici et dite telle dans le rapport.
const MUTATIONS = [
  { juge: 'usine-pubs', critere: 'UP-2', partie: 'routes', nom: 'travail accepte aussi le jeton de chef', imposee: true,
    fichier: `${R}/travail/route.ts`, avant: "if (agent.nom !== AGENT) return repondre({ error: 'agent', code: 'agent' }, 403)",
    apres: "if (agent.nom !== AGENT && agent.nom !== 'chef') return repondre({ error: 'agent', code: 'agent' }, 403)" },
  { juge: 'usine-pubs', critere: 'UP-2', partie: 'routes', nom: 'travail accepte aussi le jeton de livreur_usine', imposee: false,
    fichier: `${R}/travail/route.ts`, avant: "if (agent.nom !== AGENT) return repondre({ error: 'agent', code: 'agent' }, 403)",
    apres: "if (agent.nom !== AGENT && agent.nom !== 'livreur_usine') return repondre({ error: 'agent', code: 'agent' }, 403)" },
  // 05/10/2026 (D-0510-A2) : le jeton du chef sur les deux autres routes (UP-2 l'envoie désormais aux trois : depot et rendu aussi).
  { juge: 'usine-pubs', critere: 'UP-2', partie: 'routes', nom: 'depot accepte aussi le jeton de chef', imposee: false,
    fichier: `${R}/depot/route.ts`, avant: "if (agent.nom !== AGENT) return erreur(403, 'agent')",
    apres: "if (agent.nom !== AGENT && agent.nom !== 'chef') return erreur(403, 'agent')" },
  { juge: 'usine-pubs', critere: 'UP-2', partie: 'routes', nom: 'rendu accepte aussi le jeton de chef', imposee: false,
    fichier: `${R}/rendu/route.ts`, avant: "if (agent.nom !== AGENT) return erreur(403, 'agent')",
    apres: "if (agent.nom !== AGENT && agent.nom !== 'chef') return erreur(403, 'agent')" },
  { juge: 'usine-pubs', critere: 'UP-3', partie: 'routes', nom: 'travail renvoie le courriel du pack', imposee: true,
    fichier: `${R}/travail/route.ts`, avant: "return { type: 'pack', id: l.id, pack: { pack_id: l.id, matiere: l.matiere, site }, photos }",
    apres: "return { type: 'pack', id: l.id, pack: { pack_id: l.id, matiere: l.matiere, site, courriel: (await supabaseAdmin.from('packs_pubs').select('email').eq('id', l.id).maybeSingle()).data?.email }, photos }" },
  { juge: 'usine-pubs', critere: 'UP-4', partie: 'routes', nom: 'depot accepte un chemin hors de livraison/', imposee: true,
    fichier: LIB, avant: "for (let i = 0; i < attendu.length; i++) if (parties[i] !== attendu[i]) return { ok: false, raison: 'chemin_invalide' }",
    apres: "for (let i = 0; i < 2; i++) if (parties[i] !== attendu[i]) return { ok: false, raison: 'chemin_invalide' }" },
  { juge: 'usine-pubs', critere: 'UP-5', partie: 'routes', nom: 'rendu passe le pack à fabriquee sans relire les fichiers', imposee: true,
    fichier: `${R}/rendu/route.ts`, avant: 'const raison = await relire(d.travail, a.annonces)', apres: 'const raison = null' },
  { juge: 'usine-pubs', critere: 'UP-5', partie: 'routes', nom: 'rendu tranche le premier échantillon en depose sans la décision de Benj', imposee: true,
    fichier: `${R}/rendu/route.ts`, avant: 'if (estPremierEchantillon(standard)) {', apres: 'if (false) {' },
  { juge: 'usine-pubs', critere: 'UP-6', partie: 'tourneur', nom: 'le tourneur dépose même si pub-locale-qa est rouge', imposee: true,
    fichier: TOURNEUR, avant: "lancer(process.execPath, ['scripts/pub-locale-qa.mjs', '--partie=complet', `--dossier=${dossier}`], { minutes: 15 })",
    apres: "{ ...lancer(process.execPath, ['scripts/pub-locale-qa.mjs', '--partie=complet', `--dossier=${dossier}`], { minutes: 15 }), code: 0 }" },
  { juge: 'usine-pubs', critere: 'UP-7', partie: 'tourneur', nom: 'le tourneur passe la réponse d\'accord au lecteur studio', imposee: true,
    fichier: TOURNEUR, avant: '{ page_produit: texte }', apres: '{ page_produit: texte, accord: j.accord }' },
  { juge: 'usine-pubs', critere: 'UP-8', partie: 'tourneur', nom: 'le jeton d\'agent écrit dans une ligne de journal', imposee: true,
    fichier: TOURNEUR, avant: 'journal(`travail ${j.type} ${id}`)', apres: 'journal(`travail ${j.type} ${id} ${JETON}`)' },
  { juge: 'search-console', critere: 'SC-7', partie: '', nom: 'le jeton d\'accès écrit dans le journal', imposee: true,
    fichier: SC, avant: 'const entetes = { Authorization:', apres: 'console.log(jeton.jeton); const entetes = { Authorization:' },
  { juge: 'search-console', critere: 'SC-3', partie: '', nom: 'search_console_le posé avant la soumission du plan', imposee: true,
    fichier: SC, avant: "etape = 'sitemap'",
    apres: "await (deps.mettreAJour ?? await miseAJourParDefaut())(commande.id, { search_console_le: horloge().toISOString() }); etape = 'sitemap'" },
  { juge: 'search-console', critere: 'SC-4', partie: '', nom: 'le fichier de vérification écrit à la racine du bucket', imposee: true,
    fichier: SC, avant: '`${commande.id}/${nom}`', apres: 'nom' },
  { juge: 'search-console', critere: 'SC-6', partie: '', nom: 'plus de limite d\'essais (un 4e essai après trois échecs)', imposee: true,
    fichier: LIVRAISON, avant: 'const ESSAIS_SEARCH_CONSOLE = 3', apres: 'const ESSAIS_SEARCH_CONSOLE = 4' },
]

// ── les outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const slash = (p) => p.replaceAll('\\', '/')
const court = (t, n = 160) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s }
const ecrire = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t) }
const parcours = (d, rappel) => {
  let noms = []
  try { noms = fs.readdirSync(d) } catch { return }
  for (const n of noms) {
    const p = path.join(d, n)
    let st
    try { st = fs.lstatSync(p) } catch { continue }
    rappel(p, st)
    if (st.isDirectory() && !st.isSymbolicLink()) parcours(p, rappel)
  }
}
/** Retire les jonctions et liens d'un dossier de travail SANS les suivre, puis le dossier. Refuse tout ce qui n'est pas sous .orchestre/travail/026-203. */
function nettoyer(dir) {
  const d = path.resolve(dir)
  if (d !== TRAVAIL && !d.startsWith(TRAVAIL + path.sep)) throw new Error(`nettoyage refusé hors de ${slash(TRAVAIL)} : ${slash(d)}`)
  parcours(d, (p, st) => { if (st.isSymbolicLink()) { try { fs.unlinkSync(p) } catch { /* relevé plus bas */ } } })
  fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
function git(argv) {
  const r = spawnSync('git', ['-C', ROOT, ...argv], { encoding: 'utf8', windowsHide: true, maxBuffer: 256 << 20 })
  if (r.status !== 0) throw new Error(`git ${argv.join(' ')} : ${court(r.stderr, 200)}`)
  return r.stdout
}
function jonction(cible, lien) {
  if (!fs.existsSync(cible)) return false
  fs.symlinkSync(cible, lien, process.platform === 'win32' ? 'junction' : 'dir')
  return true
}
/** La projection d'une racine pour usine-pubs-qa : les sept fichiers jugés et tout scripts/usine/ (le tourneur y lit ses voisins). */
function projeter(source, dest) {
  let n = 0
  const copier = (rel) => {
    const s = path.join(source, rel)
    let st
    try { st = fs.lstatSync(s) } catch { return }
    if (st.isDirectory() && !st.isSymbolicLink()) { for (const e of fs.readdirSync(s)) copier(`${rel}/${e}`); return }
    if (!st.isFile()) return
    const d = path.join(dest, rel)
    fs.mkdirSync(path.dirname(d), { recursive: true })
    fs.copyFileSync(s, d)
    n++
  }
  for (const rel of FICHIERS_PROJETES) copier(rel)
  copier('scripts/usine')
  return n
}
/** La base d'un juge : les fichiers suivis ou non ignorés des dossiers utiles, copiés une fois, plus la jonction vers node_modules. */
function creerBase(dest) {
  const dossiers = DOSSIERS.filter((d) => fs.existsSync(path.join(ROOT, d)))
  const rels = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...dossiers]).split('\0').filter(Boolean)
  let n = 0
  for (const rel of [...rels, ...FICHIERS_RACINE.filter((f) => fs.existsSync(path.join(ROOT, f)))]) {
    const s = path.join(ROOT, rel)
    let st
    try { st = fs.lstatSync(s) } catch { continue }
    if (!st.isFile()) continue
    const d = path.join(dest, rel)
    fs.mkdirSync(path.dirname(d), { recursive: true })
    fs.copyFileSync(s, d)
    n++
  }
  jonction(path.join(ROOT, 'node_modules'), path.join(dest, 'node_modules'))
  return n
}
/** Une copie par mutation : les fichiers de la base en liens durs (rien ne coûte), un fichier à soi pour tout ce que le juge peut écrire. */
function copierDepuis(base, dest, avecJonction = true) {
  const ECRIT = new Set(['tsconfig.tsbuildinfo'])
  fs.mkdirSync(dest, { recursive: true })
  const marche = (d, v) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const de = path.join(d, e.name), vers = path.join(v, e.name)
      if (e.isSymbolicLink()) continue // node_modules : une jonction neuve ci-dessous
      if (e.isDirectory()) { fs.mkdirSync(vers, { recursive: true }); marche(de, vers); continue }
      if (!e.isFile()) continue
      if (ECRIT.has(e.name)) { fs.copyFileSync(de, vers); continue }
      try { fs.linkSync(de, vers) } catch { fs.copyFileSync(de, vers) }
    }
  }
  marche(base, dest)
  if (avecJonction) jonction(path.join(ROOT, 'node_modules'), path.join(dest, 'node_modules'))
}
function lancer(juge, racine, partie) {
  const argv = [path.join(ROOT, JUGES[juge].chemin), `--racine=${racine}`, ...(partie ? [`--partie=${partie}`] : [])]
  return new Promise((resoudre) => {
    const t0 = Date.now()
    const enfant = spawn(process.execPath, argv, { cwd: ROOT, windowsHide: true, detached: process.platform !== 'win32', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    let sortie = '', expire = false
    const prendre = (d) => { if (sortie.length < 8 << 20) sortie += d }
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', prendre); enfant.stderr.on('data', prendre)
    const minuteur = setTimeout(() => {
      expire = true
      try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-enfant.pid, 'SIGKILL') } catch { /* déjà fini */ }
    }, DELAI_MS)
    enfant.on('close', (code) => { clearTimeout(minuteur); resoudre({ code: expire ? 124 : (code ?? 128), sortie, duree_s: Math.round((Date.now() - t0) / 100) / 10 }) })
    enfant.on('error', (e) => { clearTimeout(minuteur); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, duree_s: 0 }) })
  })
}
/** La commande consignée pour le méta-juge : {racine} est une copie COMPLÈTE du dépôt ; usine-pubs-qa passe par --lancer (projection, voir plus haut). */
const commandeModele = (juge, partie) => (JUGES[juge].projection
  ? `node scripts/juges-026-pubs-usine-mutations.mjs --lancer=${juge}:${partie} --racine={racine}`
  : `node ${JUGES[juge].chemin} --racine={racine}${partie ? ` --partie=${partie}` : ''}`)

// ── le mode --lancer : ce que le méta-juge exécute ─────────────────────────────────────────────────────────────────────────
if (lancerOpt) {
  const [juge, partie = ''] = lancerOpt.split(':')
  if (!JUGES[juge] || !racineOpt) { console.error('usage : --lancer=<usine-pubs|search-console>:<partie> --racine=<dossier>'); process.exit(2) }
  const source = path.resolve(racineOpt)
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-026-203-'))
  try {
    if (JUGES[juge].projection) projeter(source, temp)
    const argv = [path.join(ROOT, JUGES[juge].chemin), `--racine=${JUGES[juge].projection ? temp : source}`, ...(partie ? [`--partie=${partie}`] : [])]
    const r = spawnSync(process.execPath, argv, { cwd: ROOT, stdio: 'inherit', windowsHide: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    process.exitCode = r.status ?? 1
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
  process.exit(process.exitCode ?? 1)
}

/** La ligne « FAIL <critère> — … » rendue UNE fois, et le bilan « <juge> : FAIL — ids » qui nomme le critère (même lecture que le méta-juge). */
function lireVerdict(sortie, critere, nomJuge) {
  const L = String(sortie).split(/\r?\n/)
  const siennes = L.filter((l) => new RegExp(`^(PASS|FAIL|SAUTE) ${critere}(?: — |$)`).test(l))
  const defauts = []
  let ligne = ''
  if (siennes.length !== 1) defauts.push(siennes.length ? `${critere} rapporté ${siennes.length} fois` : `aucune ligne « FAIL ${critere} — … »`)
  else if (!siennes[0].startsWith(`FAIL ${critere} — `)) defauts.push(`${critere} : « ${court(siennes[0], 80)} »`)
  else ligne = siennes[0]
  const bilan = L.map((l) => /^([\w.-]+(?: --[a-z][a-z0-9-]*(?:=[A-Za-z0-9_./=,-]+)?)*) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  if (!bilan) defauts.push('aucun bilan')
  else if (bilan[1].split(' ')[0] !== nomJuge) defauts.push(`bilan d'un autre juge : ${bilan[1]}`)
  else if (bilan[2] !== 'FAIL') defauts.push(`bilan ${bilan[2]}`)
  else if (!(bilan[3] || '').split(/,\s*/).includes(critere)) defauts.push(`le bilan ne nomme pas ${critere}`)
  if (/^\s+at .*:\d+:\d+/m.test(sortie)) defauts.push('stack d\'infrastructure dans la sortie')
  return { ligne: defauts.length ? '' : ligne, defauts }
}

// ── le passage ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const t0 = Date.now()
const etat = () => git(['status', '--porcelain', '--untracked-files=all']).split(/\r?\n/).filter((l) => l && !l.includes('.orchestre/travail/') && !l.includes('.orchestre/preuves/026-203/')).sort().join('\n')
const avant = etat()
const jonctionsAvant = []
const temoins = [], entrees = [], survivantes = [], erreurs = [], lignes = []
try {
  if (fs.existsSync(TRAVAIL)) nettoyer(TRAVAIL)
  const choisies = MUTATIONS.filter((m) => !seul || m.critere === seul || m.juge === seul || m.nom.includes(seul))
  if (!choisies.length) throw new Error(`--seul=${seul} : aucune mutation`)
  for (const juge of Object.keys(JUGES)) {
    const ms = choisies.filter((m) => m.juge === juge)
    if (!ms.length) continue
    const base = path.join(TRAVAIL, juge, 'temoin')
    const n = JUGES[juge].projection ? projeter(ROOT, base) : creerBase(base)
    console.log(`copie de ${juge} : ${n} fichier(s)`)
    // Les témoins : la ligne complète de la fiche (usine-pubs-qa : routes, tourneur, unites) puis, une fois par commande de mutation, le témoin de CETTE commande.
    const commandes = [...new Set(ms.map((m) => m.partie))]
    const listeT = juge === 'usine-pubs' ? ['routes,tourneur,unites', ...commandes.filter((p) => p !== 'routes,tourneur,unites')] : commandes
    const verts = new Map()
    for (const partie of listeT) {
      const copieT = partie === listeT[0] ? base : path.join(TRAVAIL, juge, `temoin-${partie || 'defaut'}`)
      if (copieT !== base) copierDepuis(base, copieT, !JUGES[juge].projection)
      const r = await lancer(juge, copieT, partie)
      ecrire(path.join(TRAVAIL, juge, `temoin-${partie || 'defaut'}.log`), r.sortie)
      const fin = r.sortie.split(/\r?\n/).filter(Boolean).at(-1) ?? ''
      const vert = r.code === 0 && new RegExp(`^${JUGES[juge].nom} : PASS$`).test(fin)
      verts.set(partie, vert)
      temoins.push({ juge, partie, code: r.code, fin: court(fin, 120), duree_s: r.duree_s })
      console.log(`${vert ? 'PASS' : 'FAIL'} témoin ${juge} ${partie || '(sans option)'} : code ${r.code}, ${r.duree_s} s — ${court(fin, 80)}`)
      if (!vert) erreurs.push(`témoin ${juge} ${partie || ''} rouge (code ${r.code}) : ${court(r.sortie.split(/\r?\n/).filter((l) => /^FAIL |: FAIL|✗|Error/.test(l)).slice(0, 3).join(' | ') || fin, 240)}`)
    }
    for (const m of ms) {
      if (Date.now() - t0 > BUDGET_MS) { erreurs.push(`${m.critere} « ${m.nom} » non jouée : budget de ${BUDGET_MS / 60000} min épuisé`); continue }
      if (!verts.get(m.partie)) { erreurs.push(`${m.critere} « ${m.nom} » non jouée : le témoin de sa commande est rouge`); continue }
      const dir = path.join(TRAVAIL, juge, `m-${MUTATIONS.indexOf(m)}`)
      copierDepuis(base, dir, !JUGES[juge].projection)
      const cible = path.join(dir, m.fichier)
      const original = fs.readFileSync(cible, 'utf8')
      const nb = original.split(m.avant).length - 1
      if (nb !== 1) { erreurs.push(`${m.critere} « ${m.nom} » : « avant » présent ${nb} fois dans ${m.fichier} (une seule attendue)`); nettoyer(dir); continue }
      const i = original.indexOf(m.avant)
      fs.unlinkSync(cible) // le lien dur de la base ne bouge pas : le fichier muté est un fichier neuf
      fs.writeFileSync(cible, original.slice(0, i) + m.apres + original.slice(i + m.avant.length))
      const r = await lancer(juge, dir, m.partie)
      ecrire(path.join(TRAVAIL, juge, `m-${MUTATIONS.indexOf(m)}.log`), `# ${m.fichier} : « ${m.avant} » → « ${m.apres} »\n# code ${r.code}\n\n${r.sortie}`)
      const v = lireVerdict(r.sortie, m.critere, JUGES[juge].nom)
      const attrapee = r.code !== 0 && r.code !== 124 && !!v.ligne && v.ligne.length >= 20
      const rouges = r.sortie.split(/\r?\n/).filter((l) => /^FAIL /.test(l)).map((l) => l.split(' ')[1])
      const commande = commandeModele(juge, m.partie)
      if (attrapee) entrees.push({ juge: JUGES[juge].chemin, commande, fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait: v.ligne, duree_s: r.duree_s })
      else survivantes.push({ m, code: r.code, defauts: v.defauts, rouges })
      lignes.push({ m, attrapee, code: r.code, extrait: v.ligne || '', defauts: v.defauts, rouges, commande, duree_s: r.duree_s })
      console.log(`${attrapee ? 'PASS' : 'FAIL'} mutation ${m.critere} « ${m.nom} » : code ${r.code}, ${r.duree_s} s${attrapee ? '' : ` — NON ATTRAPÉE (${v.defauts.join(' ; ') || 'code 0'} ; en échec : ${rouges.join(', ') || 'aucun'})`}`)
      nettoyer(dir)
    }
  }
} catch (e) {
  erreurs.push(e?.stack || String(e))
} finally {
  if (!garder) { try { if (fs.existsSync(TRAVAIL)) nettoyer(TRAVAIL) } catch (e) { erreurs.push(`nettoyage : ${e.message}`) } }
  let apres = avant
  try { apres = etat() } catch { /* git illisible : relevé ci-dessous */ }
  if (apres !== avant) erreurs.push('MU-3 : git status a changé pendant le passage (une copie a-t-elle débordé ?)')
  const entete = []
  if (survivantes.length) {
    entete.push('## MUTATIONS NON ATTRAPÉES (lacunes des juges : à rouvrir chez Claude Code, jamais corrigées ici)', '')
    for (const s of survivantes) entete.push(`- **${s.m.critere}** — ${s.m.nom} (${JUGES[s.m.juge].chemin}, ${s.m.imposee ? 'imposée par la fiche' : 'variante ajoutée'}) : code ${s.code}, ${s.defauts.join(' ; ') || 'code 0'} ; critères en échec : ${s.rouges.join(', ') || 'aucun'}.`)
    entete.push('')
  }
  if (erreurs.length) { entete.push('## ÉCHECS DU PASSAGE', '', ...erreurs.map((x) => `- ${x}`), '') }
  const md = [
    `# 026-203 — mutations de usine-pubs-qa et search-console-qa`, '',
    `Écrit par \`node scripts/juges-026-pubs-usine-mutations.mjs\` le ${new Date().toISOString()} (${Math.round((Date.now() - t0) / 1000)} s). Copies sous .orchestre/travail/026-203/, effacées à la fin ; aucun --reel.`, '',
    ...entete,
    '## Témoins (copie intacte : code 0 attendu)', '', '| Juge | Partie | Code | Dernière ligne | Durée |', '|---|---|---|---|---|',
    ...temoins.map((t) => `| ${t.juge} | ${t.partie || '(aucune option)'} | ${t.code} | ${t.fin.replace(/\|/g, '\\|')} | ${t.duree_s} s |`), '',
    '## Mutations (un remplacement de texte exact par copie)', '', '| Juge | Critère | Faute | Fichier | Verdict | Extrait réel | Commande |', '|---|---|---|---|---|---|---|',
    ...lignes.map((l) => `| ${JUGES[l.m.juge].nom} | ${l.m.critere} | ${l.m.nom}${l.m.imposee ? '' : ' (variante)'} | ${l.m.fichier} | ${l.attrapee ? 'attrapée' : '**SURVIT**'} | ${(l.extrait || `code ${l.code} : ${l.defauts.join(' ; ')}`).replace(/\|/g, '\\|')} | \`${l.commande}\` |`), '',
  ].join('\n')
  const partiel = !!seul
  if (!partiel || survivantes.length || erreurs.length || entrees.length) {
    ecrire(path.join(PREUVES, 'mutations.json'), `${JSON.stringify({ mutations: entrees }, null, 2)}\n`)
    ecrire(path.join(PREUVES, 'mutations.md'), `${md}\n`)
  }
  const ok = !erreurs.length && !survivantes.length && entrees.length === MUTATIONS.length
  console.log(`juges-026-pubs-usine-mutations : ${ok ? 'PASS' : 'FAIL'} — ${entrees.length}/${MUTATIONS.length} mutation(s) attrapée(s), ${survivantes.length} survivante(s), ${erreurs.length} échec(s) de passage`)
  process.exitCode = partiel && !survivantes.length && !erreurs.length ? 3 : ok ? 0 : 1
}
