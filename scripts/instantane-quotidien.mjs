#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const DEPOT_DEFAUT = 'https://github.com/benjaminfiliot-wq/presti-sauvegarde.git'
const LIMITE = 90 * 1024 * 1024

function jwtService(texte) {
  const candidats = texte.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || []
  return candidats.some((jeton) => {
    try { return JSON.parse(Buffer.from(jeton.split('.')[1], 'base64url').toString('utf8')).role === 'service_role' }
    catch { return false }
  })
}

export const MOTIFS_SECRETS = [
  { nom: 'stripe', re: /\b(?:sk_live_|rk_live_|sk_test_)[A-Za-z0-9]{20,}/ },
  { nom: 'stripe_webhook', re: /\bwhsec_[A-Za-z0-9]{10,}/ },
  { nom: 'anthropic', re: /\bsk-ant-[A-Za-z0-9_-]{10,}/ },
  { nom: 'resend', re: /\bre_[A-Za-z0-9]{20,}/ },
  { nom: 'supabase_service', re: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { nom: 'cle_privee', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nom: 'google', re: /\bAIza[A-Za-z0-9_-]{35}/ },
  { nom: 'github', re: /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/ },
]

export function chercherSecrets(texte) {
  const trouves = []
  for (const { nom, re } of MOTIFS_SECRETS) {
    if (nom === 'supabase_service' ? jwtService(texte) : re.test(texte)) trouves.push(nom)
  }
  return trouves
}

function options(argv) {
  const o = { racine: RACINE, depot: process.env.PRESTI_SAUVEGARDE_DEPOT || DEPOT_DEFAUT, pousser: false, vault: undefined }
  let mode = false
  for (const a of argv) {
    if (a === '--pousser' || a === '--sans-pousser') {
      if (mode) throw new Error('usage')
      o.pousser = a === '--pousser'; mode = true
    } else if (a.startsWith('--racine=') && a.length > 9) o.racine = path.resolve(a.slice(9))
    else if (a.startsWith('--depot=') && a.length > 8) o.depot = a.slice(8)
    else if (a.startsWith('--vault=') && a.length > 8) o.vault = path.resolve(a.slice(8))
    else throw new Error('usage')
  }
  if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) throw new Error('usage')
  if (o.vault === undefined) {
    let valeur = '../SaaS'
    try { valeur = JSON.parse(fs.readFileSync(path.join(o.racine, '.orchestre/orchestre.json'), 'utf8')).vault || valeur } catch { /* dépôt d'essai */ }
    o.vault = path.resolve(o.racine, valeur)
  }
  return o
}

// ── L'invariant : ce que LE SCRIPT a écrit, pas ce qui a bougé autour de lui ────────────────────────────────────────
// Le 27/09 à 19 h 41, l'envoi réel a abouti mais le script a rendu le code 1 : il comparait HEAD, git status et
// l'empreinte de .git/index avant et après, et le moteur avait commité entre-temps. Un dépôt où d'autres processus
// écrivent 24 h/24 bouge toujours pendant un passage. L'invariant prouve désormais quatre choses sur le seul script :
//   1. l'enrobage : toute commande git du script passe par creerGit(), liste fermée ; celles qui écrivent un index ne
//      partent qu'avec GIT_INDEX_FILE = l'index temporaire ; update-ref ne fait que CRÉER refs/instantanes/quotidien-*
//      vers l'instantané ; l'envoi ne porte qu'un refspec, l'instantané vers refs/heads/instantane-*.
//   2. la trace : chaque processus git né du script (par l'enrobage ou non) hérite de GIT_TRACE2_EVENT, et git y écrit
//      chaque écriture d'index avec son chemin (do_write_index). Toutes doivent nommer l'index temporaire, et il en faut
//      au moins une : une trace muette ne prouve rien, elle fait échouer.
//   3. la signature : chaque processus git né du script hérite d'une identité à jeton unique (GIT_COMMITTER_*), que git
//      inscrit dans le reflog de toute référence qu'il déplace. Aucun reflog hors de logs/refs/instantanes/ ne doit
//      porter ce jeton ; aucune référence hors de refs/instantanes/ ne doit pointer sur l'instantané ; son seul parent
//      est le HEAD lu au départ.
//   4. la liste des commandes, relue dans la trace : git y inscrit l'argv de chaque processus (événement « start »). Les
//      processus de premier niveau (sid sans « / ») sont ceux que le script a lancés lui-même, par l'enrobage ou non ;
//      chacun doit passer la même règle que l'enrobage (commandeRefusee). Cela couvre ce que la signature ne voit pas :
//      git ne tient aucun reflog pour refs/tags/ (ni pour une référence supprimée), un git tag ou un update-ref -d lancé
//      hors de l'enrobage n'y laisserait rien. Les processus que git lance lui-même (pack-objects, remote-https, crochets,
//      gestionnaire d'identifiants) ont un sid avec « / » et ne sont pas jugés ici.
// Ce que les autres processus font pendant ce temps (commits, index, fichiers) ne fait plus échouer.
class Invariant extends Error {}
const LECTURE = new Set(['rev-parse', 'cat-file', 'ls-tree', 'for-each-ref', 'ls-remote'])
const INDEX_TEMPORAIRE = new Set(['read-tree', 'add', 'diff', 'rm', 'write-tree'])

/** La règle des commandes git du script (args commence à la sous-commande) : la raison du refus, ou null. */
function commandeRefusee(args, ctx) {
  const sc = args[0]
  if (sc === 'update-ref') {
    const cree = args.length === 4 && /^refs\/instantanes\/quotidien-[0-9A-Za-z-]+$/.test(args[1]) && args[2] === ctx.commit && /^0+$/.test(args[3])
    return cree ? null : 'seule la création de refs/instantanes/quotidien-* vers l’instantané est permise'
  }
  if (sc === 'push') {
    const seul = args.length === 3 && args[1] === ctx.depot && Boolean(ctx.commit) && args[2].startsWith(`${ctx.commit}:`) && /^[0-9a-f]+:refs\/heads\/instantane-\d{4}-\d{2}-\d{2}(-\d{4})?$/.test(args[2])
    return seul ? null : 'un seul refspec, l’instantané vers refs/heads/instantane-*'
  }
  return sc === 'commit-tree' || LECTURE.has(sc) || INDEX_TEMPORAIRE.has(sc) ? null : 'sous-commande hors de la liste'
}

function creerGit(ctx) {
  return function git(args, { temporaire = false, brut = false } = {}) {
    const sc = args[0]
    const refus = (pourquoi) => { throw new Invariant(`appel git refusé (${sc}) : ${pourquoi}`) }
    if (INDEX_TEMPORAIRE.has(sc)) { if (!temporaire) refus('sans l’index temporaire') }
    else if (temporaire) refus('l’index temporaire est réservé aux commandes qui écrivent un index')
    const pourquoi = commandeRefusee(args, ctx)
    if (pourquoi) refus(pourquoi)
    const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' }
    delete env.GIT_INDEX_FILE
    if (temporaire) env.GIT_INDEX_FILE = ctx.index
    return execFileSync('git', ['-C', ctx.racine, ...args], {
      env, encoding: brut ? 'buffer' : 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    })
  }
}
const normaliser = (p, base) => { const r = path.resolve(base, p); return process.platform === 'win32' ? r.toLowerCase() : r }
/**
 * Ce que la trace dit des processus git du script : les index écrits (chemins normalisés, sans « .lock ») et l'argv de
 * chaque processus de premier niveau (sid sans « / »), c'est-à-dire lancé par le script lui-même.
 */
function lireTrace(ctx) {
  const ecrits = new Set(), commandes = []
  let texte = ''
  try { texte = fs.readFileSync(ctx.trace, 'utf8') } catch { return { ecrits, commandes } }
  for (const ligne of texte.split(/\r?\n/)) {
    const index = ligne.includes('do_write_index'), debut = ligne.includes('"event":"start"')
    if (!index && !debut) continue
    let e = null
    try { e = JSON.parse(ligne) } catch { /* ligne mêlée : voir plus bas */ }
    if (debut && e?.event === 'start') {
      if (typeof e.sid !== 'string' || !Array.isArray(e.argv)) throw new Invariant('trace git illisible : un processus sans sid ni argv')
      if (!e.sid.includes('/')) commandes.push(e.argv.map(String))
      continue
    }
    if (debut && !e) throw new Invariant('trace git illisible : un départ de processus illisible')
    if (!index) continue
    let msg = null
    if (e) { if (e.label === 'do_write_index') msg = e.msg }
    else { msg = (/"msg":"((?:[^"\\]|\\.)*)"/.exec(ligne) || [])[1] ?? null; if (msg !== null) try { msg = JSON.parse(`"${msg}"`) } catch { msg = null } }
    if (typeof msg !== 'string') throw new Invariant('trace git illisible : une écriture d’index sans chemin')
    ecrits.add(normaliser(msg.replace(/\.lock$/, ''), ctx.haut))
  }
  return { ecrits, commandes }
}
/** L'argv d'un processus git, à partir de la sous-commande (options globales -C, -c et --… retirées). */
function sousCommande(argv) {
  let i = 1
  while (i < argv.length && argv[i].startsWith('-')) i += argv[i] === '-C' || argv[i] === '-c' ? 2 : 1
  return argv.slice(i)
}
/** Les fichiers de reflog (relatifs au dossier git) qui portent la signature de ce passage. */
function reflogsSignes(ctx) {
  const trouves = []
  for (const dossier of new Set(ctx.dossiers)) {
    const parcourir = (d) => {
      let entrees = []
      try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
      for (const x of entrees) {
        const p = path.join(d, x.name)
        if (x.isDirectory()) parcourir(p)
        else { let t = ''; try { t = fs.readFileSync(p, 'utf8') } catch { /* illisible : rien de signé à lire */ } if (t.includes(ctx.email)) trouves.push(path.relative(dossier, p).split(path.sep).join('/')) }
      }
    }
    parcourir(path.join(dossier, 'logs'))
  }
  return trouves
}
function verifierInvariant(ctx, git) {
  if (!ctx.dossiers) return
  const { ecrits, commandes } = lireTrace(ctx)
  const temporaire = normaliser(ctx.index, ctx.haut)
  if (ctx.arbre && !ecrits.has(temporaire)) throw new Invariant('trace git muette : les écritures d’index du script ne sont pas prouvées')
  const autres = [...ecrits].filter((p) => p !== temporaire)
  if (autres.length) throw new Invariant(`le script a écrit dans ${autres.includes(normaliser(ctx.indexReel, ctx.haut)) ? 'l’index réel du dépôt' : 'un index qui n’est pas le sien'}`)
  // Seule la sous-commande est écrite : les arguments peuvent porter l'adresse du dépôt (et un jeton).
  for (const argv of commandes) {
    const args = sousCommande(argv)
    if (commandeRefusee(args, ctx)) throw new Invariant(`le script a lancé une commande git hors de sa liste (${/^[a-z][a-z-]*$/.test(args[0] || '') ? args[0] : 'illisible'})`)
  }
  const signes = reflogsSignes(ctx).filter((f) => !f.startsWith('logs/refs/instantanes/'))
  if (signes.length) throw new Invariant(`le script a déplacé une référence hors de refs/instantanes/ (${signes[0]})`)
  if (!ctx.commit) return
  const pointent = git(['for-each-ref', '--format=%(refname)', `--points-at=${ctx.commit}`]).split(/\r?\n/).filter((r) => r && !r.startsWith('refs/instantanes/'))
  if (pointent.length) throw new Invariant(`${pointent[0]} pointe sur l’instantané`)
  const parents = git(['cat-file', '-p', ctx.commit]).split(/\r?\n/).filter((l) => l.startsWith('parent ')).map((l) => l.slice(7).trim())
  if (parents.length !== 1 || parents[0] !== ctx.head) throw new Invariant('l’instantané n’a pas pour seul parent le HEAD lu au départ')
}

function paris(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]))
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}${p.minute}` }
}
function nomsNuls(sortie) { return sortie.toString('utf8').split('\0').filter(Boolean) }
function nomEnv(chemin) { const n = path.posix.basename(chemin); return /^\.env(?:\..+)?$/.test(n) && n !== '.env.local.example' }
function lireProspects(vault) {
  if (!fs.existsSync(vault)) return { vault: 'absent', valeurs: [] }
  const valeurs = new Set()
  const ajouter = (valeur) => { const v = valeur.trim().toLocaleLowerCase(); if (v.length >= 4) valeurs.add(v) }
  for (const nom of ['Prospection/deja-contactes-email.txt', 'Prospection/deja-contactes-instagram.txt']) {
    const fichier = path.join(vault, nom)
    if (fs.existsSync(fichier)) fs.readFileSync(fichier, 'utf8').split(/\r?\n/).forEach(ajouter)
  }
  const csv = path.join(vault, 'Prospection/phase0/suivi.csv')
  if (fs.existsSync(csv)) {
    const lignes = fs.readFileSync(csv, 'utf8').split(/\r?\n/)
    const separateur = lignes[0]?.includes(';') ? ';' : ','
    const colonnes = (lignes.shift() || '').split(separateur).map((h, i) => /prospect/i.test(h) ? i : -1).filter((i) => i >= 0)
    for (const ligne of lignes) {
      const cellules = ligne.split(separateur)
      for (const i of colonnes) if (cellules[i]) ajouter(cellules[i].replace(/^"|"$/g, ''))
    }
  }
  return { vault: 'present', valeurs: [...valeurs] }
}
function motifExclusion(racine, chemin, prospects) {
  if (chemin.toLowerCase().endsWith('.exe')) return 'exe'
  if (nomEnv(chemin)) return 'env'
  const fichier = path.join(racine, chemin)
  if (!fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) return null
  const taille = fs.statSync(fichier).size
  if (taille > LIMITE) return 'taille'
  const contenu = fs.readFileSync(fichier)
  if (contenu.subarray(0, 8192).includes(0)) return null
  const texte = contenu.toString('utf8')
  const secret = chercherSecrets(texte)[0]
  if (secret) return secret
  const minuscule = texte.toLocaleLowerCase()
  if (prospects.some((valeur) => minuscule.includes(valeur))) return 'prospect'
  return null
}
function compteArbre(git, arbre) {
  const sortie = git(['ls-tree', '-r', '-l', '-z', arbre], { brut: true })
  let fichiers = 0, octets = 0
  for (const ligne of nomsNuls(sortie)) {
    const m = /^[0-9]+ blob [0-9a-f]+\s+([0-9]+)\t/.exec(ligne)
    if (m) { fichiers++; octets += Number(m[1]) }
  }
  return { fichiers, octets }
}
function brancheDisponible(git, depot, jour, heure) {
  const existe = (nom) => Boolean(git(['ls-remote', '--heads', depot, `refs/heads/${nom}`]).trim())
  const base = `instantane-${jour}`
  if (!existe(base)) return base
  const minutes = Number(heure.slice(0, 2)) * 60 + Number(heure.slice(2))
  for (let pas = 0; pas < 1440; pas++) {
    const n = (minutes + pas) % 1440
    const nom = `${base}-${String(Math.floor(n / 60)).padStart(2, '0')}${String(n % 60).padStart(2, '0')}`
    if (!existe(nom)) return nom
  }
  throw new Error('aucune branche disponible')
}

function executer(o) {
  const journal = { date: new Date().toISOString(), commit: null, branche: null, fichiers: 0, octets: 0, exclus: [], vault: 'absent', ok: false }
  let code = 1, erreur = null
  const jeton = crypto.randomBytes(6).toString('hex')
  const base = path.join(os.tmpdir(), `presti-quotidien-${process.pid}-${Date.now()}-${jeton}`)
  const ctx = {
    racine: o.racine, depot: o.depot, index: `${base}.index`, trace: `${base}.trace2.json`,
    email: `instantane-quotidien.${jeton}@presti.invalid`, head: null, arbre: null, commit: null, dossiers: null,
  }
  // Tout processus git né de ce processus, par l'enrobage ou non, hérite de la trace et de la signature (invariants 2 à 4).
  // Sans GIT_TRACE2_PARENT_SID hérité, les processus que le script lance sont les seuls de premier niveau (invariant 4).
  delete process.env.GIT_TRACE2_PARENT_SID
  Object.assign(process.env, { GIT_TRACE2_EVENT: ctx.trace, GIT_TRACE2_EVENT_NESTING: '100', GIT_COMMITTER_NAME: 'instantane-quotidien', GIT_COMMITTER_EMAIL: ctx.email })
  const git = creerGit(ctx)
  const texte = (args, opts) => git(args, opts).trim()
  const temporaire = { temporaire: true }
  try {
    // Le HEAD est lu UNE fois, puis désigné par son empreinte : un commit concurrent ne change ni la base de l'index
    // temporaire, ni la liste des fichiers scannés, ni le parent de l'instantané.
    ctx.head = texte(['rev-parse', '--verify', 'HEAD^{commit}'])
    const [gitDir, commun, indexReel, haut] = texte(['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir', '--git-path', 'index', '--show-toplevel']).split(/\r?\n/)
    Object.assign(ctx, { indexReel, haut: haut || o.racine, dossiers: [gitDir, commun] })
    const prospects = lireProspects(o.vault)
    journal.vault = prospects.vault
    git(['read-tree', ctx.head], temporaire)
    git(['add', '-A', '--', '.', ':(exclude)*.exe'], temporaire)
    const modifies = nomsNuls(git(['diff', '--cached', '--name-only', '-z', ctx.head], { ...temporaire, brut: true }))
    for (const chemin of modifies) {
      const motif = motifExclusion(o.racine, chemin, prospects.valeurs)
      if (!motif) continue
      git(['rm', '--cached', '-q', '--ignore-unmatch', '--', chemin], temporaire)
      journal.exclus.push({ chemin, motif })
      console.log(`Exclu : ${chemin} (${motif})`)
    }
    const arbre = texte(['write-tree'], temporaire)
    ctx.arbre = arbre
    const commit = texte(['commit-tree', arbre, '-p', ctx.head, '-m', `instantané quotidien ${journal.date}`])
    ctx.commit = commit
    journal.commit = commit
    Object.assign(journal, compteArbre(git, arbre))
    const ref = `refs/instantanes/quotidien-${journal.date.replace(/[-:.TZ]/g, '')}-${crypto.randomBytes(3).toString('hex')}`
    git(['update-ref', ref, commit, '0'.repeat(commit.length)])
    if (journal.exclus.length > 20) throw new Error('plus de 20 exclusions')
    verifierInvariant(ctx, git) // avant tout envoi : un script qui a écrit hors de son domaine n'envoie rien
    if (o.pousser) {
      const { jour, heure } = paris()
      const branche = brancheDisponible(git, o.depot, jour, heure)
      journal.branche = branche
      git(['push', o.depot, `${commit}:refs/heads/${branche}`])
      const distant = texte(['ls-remote', o.depot, `refs/heads/${branche}`]).split(/\s+/)[0]
      if (distant !== commit) throw new Error('relecture distante différente')
    }
    journal.ok = true
    code = journal.exclus.length ? 4 : 0
  } catch (e) { erreur = e }
  finally {
    // L'invariant une dernière fois (l'envoi compris), puis le ménage : l'index temporaire et la trace sont retirés.
    try { verifierInvariant(ctx, git) } catch (e) { if (e instanceof Invariant || !erreur) erreur = e }
    // recursive: true n'est là que pour que Node réessaie (maxRetries) si un antivirus tient le fichier un instant.
    for (const f of [ctx.index, `${ctx.index}.lock`, ctx.trace]) { try { fs.rmSync(f, { force: true, recursive: true, maxRetries: 5, retryDelay: 100 }) } catch { /* vérifié juste après */ } }
    if (fs.existsSync(ctx.index) || fs.existsSync(ctx.trace)) erreur = new Invariant('index temporaire ou trace non supprimé')
    if (erreur) { journal.ok = false; code = 1 }
    try {
      const fichier = path.join(o.racine, '.orchestre', 'travail', 'sauvegardes.jsonl')
      fs.mkdirSync(path.dirname(fichier), { recursive: true })
      fs.appendFileSync(fichier, JSON.stringify(journal) + '\n')
    } catch { erreur = new Error('journal impossible'); code = 1 }
  }
  // Les raisons d'invariant sont des phrases du script (sous-commande, nom de référence) : jamais une valeur. Les autres
  // erreurs (git, réseau) restent tues, leur texte pourrait porter une adresse de dépôt avec un jeton.
  const raison = erreur instanceof Invariant ? `invariant : ${erreur.message}` : erreur?.message === 'plus de 20 exclusions' ? 'plus de 20 exclusions' : 'vérifier le dépôt et le journal'
  if (code === 1) console.log(`ALERTE BENJ : instantané quotidien échoué (${raison}).`)
  else console.log(`Instantané ${journal.commit} ${journal.branche || 'local'} ; ${journal.exclus.length} exclusion(s).`)
  return code
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = executer(options(process.argv.slice(2))) }
  catch { console.log('Usage : node scripts/instantane-quotidien.mjs [--pousser | --sans-pousser] [--racine=<dépôt>] [--depot=<url ou chemin>] [--vault=<dossier>]'); process.exitCode = 2 }
}
