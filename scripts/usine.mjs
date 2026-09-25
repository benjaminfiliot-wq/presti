// scripts/usine.mjs — le pont entre l'orchestre (PC de Benj : 8 Go de RAM, saturé) et l'usine (serveur Oracle Always Free :
// 2 OCPU, 12 Go, allumé 24 h/24). Codex y traite une fiche de .orchestre/file/ à la place du PC, avec le MÊME contrat de tâche
// que scripts/antigravity.mjs (le prompt en est importé : une seule source) et la même boucle que scripts/executant.mjs (Codex
// écrit, le vérificateur tourne hors bac à sable, Codex est relancé avec les lignes FAIL). Le PC reste le seul à committer :
// l'usine clone en lecture seule (git push y est refusé, c'est voulu), travaille dans un worktree jetable et rend un patch ;
// le PC l'applique, passe la fiche en fait/ et relance `verifier` — le verdict officiel est celui du PC.
//
// Usage :
//   node scripts/usine.mjs etat                      → joignable ?, charge et mémoire, codex connecté ?, tâches sur l'usine
//   node scripts/usine.mjs preparer [--forcer]       → une fois (idempotent) : git fetch + npm ci dans ~/presti, Chromium et WebKit (+ dépendances)
//   node scripts/usine.mjs paquet <id>               → construit et contrôle le paquet sans rien prendre ni envoyer (essai à sec)
//   node scripts/usine.mjs lancer <id> [--model=gpt-6-sol] [--boucle=3] [--effort=medium] [--minutes=40]
//   node scripts/usine.mjs recuperer <id> [--attendre[=60]] [--forcer]   → rapatrie, applique, fiche en fait/, verdict du PC
//   node scripts/usine.mjs nettoyer <id> [--forcer]  → retire le worktree et le dossier de la tâche sur l'usine
//   node scripts/usine.mjs executer [--nom=verif] [--delai=30] [--attendre=30] [--id=<id>] [--rapatrier=<chemin>] [--forcer] [--liste] -- <commande…>
//                                                    → la commande (un juge) tourne sur l'usine, bac ~/bacs/<nom>, sur l'état du PC
// Codes : 0 ok (PASS) ; 1 FAIL ou refus ; 2 usage ; 3 usine pas prête ; 4 tâche encore en cours ; 5 usine injoignable.
//   executer rend le code de la commande sortie d'elle-même (0, 1, 2…) ; 124 délai dépassé ; 125 verdict non rendu (rien lancé, ssh coupé, commande tuée, code perdu, preuve vide).
//
// Le paquet (PC → usine) est construit à partir de git, jamais en parcourant le disque : les fichiers suivis modifiés depuis
// HEAD (git diff) et les non suivis NON ignorés (git ls-files --others --exclude-standard), filtrés (EXCLUS, preuves des
// autres tâches, .env*, fichiers de clé, > 5 Mo), puis figés par un index temporaire (la technique de l'instantané
// d'antigravity.mjs : ni l'index réel ni l'arbre de travail ne bougent). Avant l'envoi, la liste est imprimée et contrôlée
// par une seconde barrière indépendante : aucun .env*, aucun fichier de clé, aucun chemin ignoré (git check-ignore), aucune
// clé (MOTIFS) dans les lignes ajoutées ni dans le contenu entier des fichiers binaires → refus si un seul est trouvé.
// .env.local et les fichiers ignorés ne sont jamais ouverts.
// Sur l'usine (~/taches/<id>/) : worktree jetable `arbre` sur origin/main (= HEAD du PC, sinon « pousse d'abord »), paquet
// appliqué, node_modules = copie en liens physiques de ~/presti/node_modules (cp -al, pas un lien symbolique : voir
// « lancer »), commit local « base » (commit-tree : jamais poussé, aucun
// crochet), puis `node usine.mjs tourner` détaché de la session ssh (setsid) : journal codex.log, code de fin dans `code`.
// Le retour (usine → PC) : diff binaire depuis « base » limité au `perimetre` de la fiche et à .orchestre/preuves/<id>/ ;
// ce qui a bougé ailleurs est signalé et EXCLU. Journaux rapatriés dans .orchestre/travail/usine/<id>/ (ignoré par git).
// Le PC ne garde que ce que SON verdict juge PASS : rouge, le patch est retiré (git apply -R) ; le verdict est enregistré
// (verdict-pc.json) AVANT la marque `recupere` de l'usine, et un second `recuperer` le redit avec son code.
// Doc : C:/Users/benja/Documents/presti-ops/usine/LISEZMOI.md, section « Exécuter une fiche sur l'usine ».
// `executer` (25/09/2026) fait tourner un JUGE sur l'usine plutôt que sur le PC (8 Go, saturé) : dans une fiche,
// `verifier: node scripts/usine.mjs executer -- node scripts/<juge>.mjs`, et le verdict reste celui de l'orchestre, qui lit
// le code de sortie. Même paquet et mêmes barrières que `lancer` ; bac ~/bacs/<nom> recréé à chaque appel, verrou par bac,
// délai ; rien ne revient sur le PC sans --rapatrier. Détail au-dessus de executerSurUsine ; doc : section « Faire tourner
// un juge sur l'usine (executer) » du LISEZMOI.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CE_FICHIER = fileURLToPath(import.meta.url)
const RACINE = path.resolve(path.dirname(CE_FICHIER), '..')
const ORCH = path.join(RACINE, '.orchestre')
const TRAVAIL = path.join(ORCH, 'travail', 'usine')
const AGENTS = path.join(ORCH, 'agents.jsonl')
// L'IP de l'usine est éphémère (elle change si l'instance est recréée) : PRESTI_USINE=usine@<ip> la remplace sans toucher au code.
const HOTE = process.env.PRESTI_USINE || 'usine@88.96.53.3'
const CLE = path.join(os.homedir(), '.ssh', 'presti-usine')
const SSH = ['-i', CLE, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=30']
const MODELE = 'gpt-6-sol' // consigne de Benj du 24/09/2026 ; tâches légères : --model=gpt-6-luna
const MAX_OCTETS = 5 * 1024 * 1024
// Lourds ou sans rapport avec une fiche : jamais envoyés (en plus : preuves des autres tâches, fichiers > 5 Mo, .env*).
const EXCLUS = ['public/promo/', 'promo-src/', '.claude/', '.orchestre/travail/', '.orchestre/brouillons-ecosysteme/']
// Les clés qu'on refuse de voir partir, cherchées dans les lignes AJOUTÉES du paquet (jamais affichées : chemin, ligne, motif).
// Une vraie clé est aléatoire : chiffres ET lettres. Le 24/09/2026, le juge scripts/publier-serie-qa.mjs donnait dans ses
// jeux d'essai la valeur factice « cle-supabase-du-fichier » (lettres seules) à la clé de service : un motif littéral
// bloquait tout lancement. Quand un motif a un test `cle`, la valeur qui n'en a pas la forme est ÉCARTÉE — et affichée, jamais tue.
const formeDeCle = (v) => /[0-9]/.test(v) && /[A-Za-z]/.test(v)
// Attaque du 24/09/2026 (paquet à sec ; fixtures et journaux dans .orchestre/travail/usine/attaques-2026-09-24/) : passaient la seconde barrière un JWT
// court coupé par des points, un NOM_SECRET=valeur collé d'un .env, une clé sb_secret_ seule, une ligne ajoutée qui
// commençait par « ++ » (lue comme un en-tête « +++ ») et un jeton dans un fichier binaire. D'où les motifs ajoutés
// ci-dessous, la lecture de l'en-tête dans trouverSecrets et l'examen des binaires dans secretsBinaires.
const MOTIFS = [
  { nom: 'sk_ (clé secrète Stripe ou autre)', re: /\b([sr]k_(?:live|test)_[0-9A-Za-z]{8,}|sk_[0-9A-Za-z_]{20,})/, cle: formeDeCle },
  { nom: 'sk- (clé Anthropic / OpenAI)', re: /\b(sk-(?:ant-|proj-)?[0-9A-Za-z_-]{20,})/, cle: formeDeCle },
  { nom: 'whsec_ (secret de webhook Stripe)', re: /\b(whsec_[0-9A-Za-z]{16,})/, cle: formeDeCle },
  // Un JWT se reconnaît aussi à sa forme en-tête.charge, même court : les deux commencent par eyJ (« {" » en base 64).
  { nom: 'eyJ (jeton JWT, clés Supabase)', re: /\b(eyJ[0-9A-Za-z_-]{15,}|eyJ[0-9A-Za-z_-]*\.eyJ[0-9A-Za-z_-]*)/ },
  { nom: 'sb_secret_ (clé secrète Supabase)', re: /\b(sb_secret_[0-9A-Za-z_-]{16,})/, cle: formeDeCle },
  { nom: '-----BEGIN (bloc PEM, hors clé publique)', re: /(-----BEGIN (?!PUBLIC KEY-----)[A-Z0-9 ]+-----)/ },
  { nom: 'service_role= (clé de service Supabase)', re: /service_role(?:_key)?["']?\s*[=:]\s*["']?([0-9A-Za-z._-]{20,})/i, cle: (v) => /^eyJ|^sb_secret_/.test(v) || formeDeCle(v) },
  // Une ligne de .env collée ailleurs : NOM en capitales qui dit secret/jeton/mot de passe/clé, « = » et une valeur de
  // 16 caractères ou plus (VERCEL_TOKEN, CRON_SECRET, IMAP_PASS, VAPID_PRIVATE_KEY… n'ont pas de préfixe reconnaissable).
  { nom: 'NOM_SECRET=valeur (ligne de .env collée)', re: /^\s*(?:export\s+)?[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASS|PRIVATE|API_KEY|_KEY)[A-Z0-9_]*\s*=\s*["']?([^\s"'#]{16,})/, cle: formeDeCle },
  { nom: 'ghp_ / github_pat_ (jeton GitHub)', re: /\b(gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{40,})/ },
  { nom: 'AIza (clé Google)', re: /\b(AIza[0-9A-Za-z_-]{35})/ },
  { nom: 're_ (clé Resend)', re: /\b(re_[0-9A-Za-z]{8,}_[0-9A-Za-z]{16,})/, cle: formeDeCle },
]
// Motifs SUPPLÉMENTAIRES de `executer` seul (attaque du 25/09/2026 : passaient une URL postgres avec utilisateur et mot de passe, un nom de clé
// écrit en JSON, en YAML ou en minuscules). `lancer` et `paquet` gardent MOTIFS seuls. Une valeur qui est une référence de
// code (process.env.X, ${…}, a.b.c) ou qui n'a pas la forme d'une clé est écartée — et affichée, jamais tue.
const REFERENCE_DE_CODE = (v) => /^(?:process\.env|import\.meta|os\.environ|\$\{|\$[A-Za-z_]|\{\{|<)/.test(v) || /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(v)
const MOTIFS_EXECUTER = [
  // Identifiants dans une URL : le mot de passe est ce qui suit « : » avant « @ ». Les gabarits (<mdp>, ${mdp}, [MDP], *, …) ne comptent pas.
  { nom: 'URL avec identifiants (schéma://utilisateur:mot de passe@hôte)', re: /\b[A-Za-z][A-Za-z0-9+.-]*:\/\/([^\s\/:@"'`<>{}$[\]*…]+:[^\s\/@"'`<>{}$[\]*…]+)@[A-Za-z0-9[]/ },
  // Un nom qui dit secret/jeton/mot de passe/clé, quelle que soit la casse, entre guillemets ou non, suivi de « : » (JSON, YAML)
  // ou de « = », puis une valeur de 16 caractères ou plus (la forme NOM_EN_CAPITALES=valeur en début de ligne est dans MOTIFS).
  { nom: 'nom sensible : valeur (JSON, YAML, minuscules)', re: /(?:^|[^A-Za-z0-9_])["']?[A-Za-z0-9_.-]*(?:secret|token|passw(?:or)?d|(?<![A-Za-z])pass(?![A-Za-z])|private[_-]?key|api[_-]?key|service[_-]?role|access[_-]?key|auth[_-]?key|signing[_-]?key|credential)[A-Za-z0-9_.-]*["']?\s*[:=]\s*["'`]?([^\s"'`,;#}\])(]{16,})/i, cle: (v) => formeDeCle(v) && !REFERENCE_DE_CODE(v) },
]
// Archives : refusées dans le paquet de `executer`, au nom (extension) et, pour les fichiers binaires, à la signature
// (un .png qui est un zip). Une archive cache son contenu aux motifs ; les documents Office (.docx, .xlsx) sont des zip.
const ARCHIVE_EXT = /\.(zip|gz|tgz|7z|rar|bz2|tbz2?|xz|txz|tar|zst|lz4|lzma)$/i
const SIGNATURES_ARCHIVE = [
  { nom: 'zip', t: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && [0x0304, 0x0506, 0x0708].includes(b.readUInt16BE(2)) },
  { nom: 'gzip', t: (b) => b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b },
  { nom: '7z', t: (b) => b.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) },
  { nom: 'rar', t: (b) => b.subarray(0, 4).toString('latin1') === 'Rar!' },
  { nom: 'xz', t: (b) => b.subarray(0, 6).equals(Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) },
  { nom: 'bzip2', t: (b) => /^BZh[1-9]1AY&SY/.test(b.subarray(0, 10).toString('latin1')) },
  { nom: 'zstd', t: (b) => b.length >= 4 && b.readUInt32LE(0) === 0xfd2fb528 },
  { nom: 'tar', t: (b) => b.subarray(257, 262).toString('latin1') === 'ustar' },
]
for (const m of [...MOTIFS, ...MOTIFS_EXECUTER]) m.tous = new RegExp(m.re.source, `${m.re.flags}g`) // toutes les occurrences d'une ligne, pas la première
// Fichiers de clé, reconnus au nom : écartés par le filtre (première barrière) ET refusés par controlerPaquet s'ils
// passaient quand même (seconde). Avant le 24/09/2026, seule la seconde les arrêtait.
const estFichierDeCle = (b) => /\.(pem|key|p12|pfx|jks|keystore|ppk)$|^id_(rsa|dsa|ecdsa|ed25519)$/i.test(b) && !/\.pub(\.pem)?$/i.test(b)
const ID_VALIDE = /^\d{3}-[\w-]+$/

const args = process.argv.slice(2)
const commande = args[0]
const positionnels = args.slice(1).filter((a) => !a.startsWith('--'))
const option = (nom, defaut = null) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); if (a) return a.slice(nom.length + 3); return args.includes(`--${nom}`) ? 'oui' : defaut }
const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const horodatage = () => maintenant().replace(/[:T]/g, '-').replace('Z', '')
const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'` // guillemets pour bash
const ko = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`)
const relatif = (p) => path.relative(RACINE, p).split(path.sep).join('/')

// ── ssh et scp (OpenSSH de Windows) ───────────────────────────────────────────────────────────────────────
// Le script distant passe par l'entrée standard de `bash -s` : pas de guillemets imbriqués. Il charge d'abord ~/.profile
// (c'est lui qui met ~/.local/bin, donc codex, dans le PATH) — mais PAS en shell de connexion : avec `bash -l`, un `exit 0`
// exécute ~/.bash_logout, dont `clear_console` échoue sans terminal, et `set -e` changeait le code en 1 (vu le 24/09/2026).
const PREAMBULE = '. "$HOME/.profile" >/dev/null 2>&1 || true\nset -euo pipefail\n'
function distant(script, { timeout = 120_000 } = {}) {
  const r = spawnSync('ssh', [...SSH, HOTE, 'bash -s'], { input: `${PREAMBULE}${script}\n`, encoding: 'utf8', timeout, maxBuffer: 1 << 28, windowsHide: true })
  if (r.error) return { code: 255, sortie: '', erreurs: String(r.error.message) }
  return { code: r.status ?? 255, sortie: r.stdout || '', erreurs: r.stderr || '' }
}
// La même chose, sortie affichée au fil de l'eau (npm ci dure plusieurs minutes).
function distantFlux(script, timeout = 60 * 60_000) {
  return new Promise((resoudre) => {
    const enfant = spawn('ssh', [...SSH, HOTE, 'bash -s'], { stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true })
    const minuteur = setTimeout(() => enfant.kill(), timeout)
    enfant.on('close', (code) => { clearTimeout(minuteur); resoudre(code ?? 255) })
    enfant.on('error', () => { clearTimeout(minuteur); resoudre(255) })
    enfant.stdin.end(`${PREAMBULE}${script}\n`)
  })
}
// scp avec des chemins locaux RELATIFS (cwd) : un « C:\… » passé à scp peut être pris pour un nom d'hôte.
function scp(argv, cwd) {
  const r = spawnSync('scp', ['-q', ...SSH, ...argv], { cwd, encoding: 'utf8', timeout: 15 * 60_000, windowsHide: true })
  if (r.status !== 0) throw new Error(`scp ${argv.join(' ')} : ${String(r.stderr || r.error?.message || '').trim().slice(0, 300)}`)
}
function injoignable(r) {
  if (r.code !== 255) return false
  console.error(`✗ usine injoignable (${HOTE}) : ${r.erreurs.trim().split('\n').pop() || 'ssh a échoué'}`)
  console.error('  L\'IP est éphémère : si l\'instance a été recréée, PRESTI_USINE=usine@<nouvelle ip> (voir presti-ops/usine/LISEZMOI.md).')
  return true
}

// ── git sur le PC : lecture seule, sauf l'index TEMPORAIRE du paquet et `git apply` au retour ───────────────────────
function git(argv, { env, binaire = false } = {}) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...argv], { cwd: RACINE, encoding: binaire ? 'buffer' : 'utf8', env: env ? { ...process.env, ...env } : process.env, maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
}
const nomStatut = (z) => { const p = z.split('\0'); const out = []; for (let i = 0; i + 1 < p.length; i += 2) if (p[i]) out.push({ statut: p[i][0], chemin: p[i + 1] }); return out }

// ── la fiche : l'en-tête YAML d'une ligne par champ, comme l'orchestre le lit ──────────────────────────────────────
function lireFiche(fichier) {
  const texte = fs.readFileSync(fichier, 'utf8')
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const e = {}
  if (m) for (const l of m[1].split(/\r?\n/)) {
    const s = l.replace(/\s+#.*$/, '')
    const i = s.indexOf(':')
    if (i < 1 || /^\s/.test(s) || s.startsWith('#')) continue
    e[s.slice(0, i).trim()] = s.slice(i + 1).trim()
  }
  const liste = (v) => (/^\[.*\]$/.test(v || '') ? v.slice(1, -1).split(',').map((x) => x.trim().replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean) : [])
  const fichiers = ((e.budget || '').match(/fichiers:\s*(\d+)/) || [])[1]
  return { executant: e.executant || null, perimetre: liste(e.perimetre), interdit: liste(e.interdit), fichiers: fichiers ? Number(fichiers) : null }
}
// Copie de globVersRegex (scripts/orchestre.mjs, qu'on ne peut pas importer : il exécute sa ligne de commande au
// chargement) : ** = tout, y compris « / » ; * = tout sauf « / » ; ? = un caractère.
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

// ── le paquet ─────────────────────────────────────────────────────────────────────────────────────────────
function raisonExclusion(chemin, id) {
  const e = EXCLUS.find((x) => chemin.startsWith(x))
  if (e) return e
  if (chemin.startsWith('.orchestre/preuves/') && !chemin.startsWith(`.orchestre/preuves/${id}/`)) return 'preuves d\'autres tâches'
  if (/^\.env/i.test(path.posix.basename(chemin))) return '.env*'
  if (estFichierDeCle(path.posix.basename(chemin))) return 'fichier de clé'
  return null
}
function construirePaquet(id) {
  const tete = git(['rev-parse', 'HEAD']).trim()
  const candidats = [
    ...nomStatut(git(['diff', 'HEAD', '--name-status', '--no-renames', '-z'])),
    ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).map((chemin) => ({ statut: 'A', chemin })),
  ]
  const retenus = []
  const exclus = []
  for (const c of candidats) {
    const raison = raisonExclusion(c.chemin, id)
    if (raison) { exclus.push({ ...c, raison }); continue }
    let octets = 0
    if (c.statut !== 'D') {
      let st = null
      try { st = fs.lstatSync(path.join(RACINE, c.chemin)) } catch { /* disparu entre-temps */ }
      if (st?.isSymbolicLink()) { exclus.push({ ...c, raison: 'lien symbolique' }); continue }
      octets = st ? st.size : 0
    }
    if (octets > MAX_OCTETS) { exclus.push({ ...c, raison: '> 5 Mo', octets }); continue }
    retenus.push({ ...c, octets })
  }
  // L'index temporaire : read-tree HEAD, puis add des seuls chemins retenus (liste passée par fichier, chemins littéraux).
  const index = path.join(os.tmpdir(), `presti-usine-${process.pid}-${Date.now()}.index`)
  const liste = `${index}.liste`
  const env = { GIT_INDEX_FILE: index, GIT_LITERAL_PATHSPECS: '1' }
  try {
    git(['read-tree', 'HEAD'], { env })
    if (retenus.length) {
      fs.writeFileSync(liste, retenus.map((r) => r.chemin).join('\0') + '\0')
      git(['add', `--pathspec-from-file=${liste}`, '--pathspec-file-nul'], { env })
    }
    const patch = git(['diff', '--cached', '--binary', '--no-renames', 'HEAD'], { env, binaire: true })
    const noms = nomStatut(git(['diff', '--cached', '--name-status', '--no-renames', '-z', 'HEAD'], { env }))
    const secrets = trouverSecrets(patch.toString('utf8'))
    // Ce que git traite en binaire (octet NUL, attribut) part en base 85 : illisible ligne à ligne. Le contenu envoyé — le
    // blob de l'index temporaire, octet pour octet — est donc examiné en entier.
    const binaires = git(['diff', '--cached', '--numstat', '--no-renames', '-z', 'HEAD'], { env }).split('\0').filter((x) => x.startsWith('-\t-\t')).map((x) => x.slice(4))
    for (const b of binaires) {
      if (noms.find((n) => n.chemin === b)?.statut === 'D') continue
      secrets.push(...secretsBinaires(git(['cat-file', 'blob', `:${b}`], { env, binaire: true }), b))
    }
    return { tete, patch, retenus, exclus, noms, binaires, secrets }
  } finally { fs.rmSync(index, { force: true }); fs.rmSync(liste, { force: true }) }
}
// Un contenu (une ligne ajoutée, un morceau de binaire) passé à tous les motifs. Pour chaque motif, une trouvaille au plus :
// la première qui a la forme d'une clé, sinon la première écartée (affichée comme telle).
function examiner(contenu, chemin, ligne, trouves, motifs = MOTIFS) {
  for (const m of motifs) {
    let vu = null
    for (const x of contenu.matchAll(m.tous)) {
      const ecarte = !!m.cle && !m.cle(x[1])
      if (!vu || (vu.ecarte && !ecarte)) vu = { chemin, ligne, motif: m.nom, ecarte }
      if (!ecarte) break
    }
    if (vu) trouves.push(vu)
  }
}
// Les clés dans les lignes ajoutées : chemin et numéro de ligne, jamais la valeur. L'en-tête d'un fichier va de
// « diff --git » au premier « @@ » : c'est là seulement que « +++ b/… » donne le chemin. Dans un bloc, une ligne ajoutée
// qui commence elle-même par « ++ » s'écrit « +++ … » ; la prendre pour un en-tête la laissait passer sans examen (et
// faisait de son contenu le « chemin » affiché). Le patch d'un binaire reste dans l'en-tête : il est lu par secretsBinaires.
function trouverSecrets(texte, motifs = MOTIFS) {
  const trouves = []
  let chemin = '?'
  let ligne = 0
  let entete = false
  for (const l of texte.split('\n')) {
    if (l.startsWith('diff --git ')) { entete = true; chemin = '?'; continue }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/)
    if (entete) {
      if (l.startsWith('+++ ')) chemin = l.slice(4).replace(/^"?b\//, '').replace(/"$/, '')
      if (h) { entete = false; ligne = Number(h[1]) - 1 }
      continue
    }
    if (h) { ligne = Number(h[1]) - 1; continue }
    if (l.startsWith('+')) { ligne++; examiner(l.slice(1), chemin, ligne, trouves, motifs) }
    else if (l.startsWith(' ')) ligne++
  }
  return trouves
}
// Le contenu entier d'un fichier binaire, lu octet pour octet (latin1), coupé aux fins de ligne et aux octets NUL ; puis
// une seconde fois sans les NUL, pour l'UTF-16 (une lettre, un NUL). Une trouvaille par motif et par fichier.
function secretsBinaires(buf, chemin, motifs = MOTIFS) {
  const brut = buf.toString('latin1')
  const trouves = []
  for (const texte of [brut, brut.replace(/\0/g, '')]) for (const morceau of texte.split(/[\r\n\0]+/)) if (morceau) examiner(morceau, chemin, 'binaire', trouves, motifs)
  const parMotif = new Map()
  for (const t of trouves) { const d = parMotif.get(t.motif); if (!d || (d.ecarte && !t.ecarte)) parMotif.set(t.motif, t) }
  return [...parMotif.values()]
}
// La seconde barrière : indépendante du filtre, elle refuse l'envoi au premier doute.
function controlerPaquet(p) {
  const problemes = []
  const chemins = p.noms.map((n) => n.chemin)
  for (const c of chemins) {
    const b = path.posix.basename(c)
    if (/^\.env/i.test(b)) problemes.push(`${c} : fichier d'environnement (.env*)`)
    if (estFichierDeCle(b)) problemes.push(`${c} : fichier de clé`)
  }
  const ignores = spawnSync('git', ['check-ignore', '--stdin', '-z'], { cwd: RACINE, input: chemins.join('\0') + '\0', encoding: 'utf8', windowsHide: true })
  if (ignores.status > 1) problemes.push(`git check-ignore a échoué : ${String(ignores.stderr).trim().slice(0, 200)}`)
  for (const c of String(ignores.stdout || '').split('\0').filter(Boolean)) problemes.push(`${c} : chemin ignoré par git`)
  for (const t of p.secrets.filter((s) => !s.ecarte)) problemes.push(`${t.chemin}:${t.ligne} : motif ${t.motif}`)
  const attendus = new Set(p.retenus.map((r) => r.chemin))
  for (const c of chemins) if (!attendus.has(c)) problemes.push(`${c} : dans le patch sans avoir été retenu`)
  return problemes
}
function listePaquet(p) {
  const lignes = p.noms.map((n) => { const r = p.retenus.find((x) => x.chemin === n.chemin); return `${n.statut}  ${n.chemin}${n.statut === 'D' ? '' : `  (${ko(r?.octets || 0)})`}` })
  const parRaison = {}
  for (const e of p.exclus) (parRaison[e.raison] ||= []).push(e.chemin)
  const exclus = Object.entries(parRaison).map(([r, l]) => `${r} : ${l.length}${['> 5 Mo', '.env*', 'fichier de clé', 'lien symbolique'].includes(r) ? ` (${l.join(', ')})` : ''}`)
  return { lignes, exclus }
}
function paquetControle(id, { afficherTout = true } = {}) {
  const p = construirePaquet(id)
  const { lignes, exclus } = listePaquet(p)
  console.log(`· paquet ${id} : ${p.noms.length} fichier(s), patch de ${ko(p.patch.length)}, sur ${p.tete.slice(0, 8)} (HEAD du PC)`)
  const montre = afficherTout ? lignes : lignes.slice(0, 40)
  for (const l of montre) console.log(`    ${l}`)
  if (montre.length < lignes.length) console.log(`    … ${lignes.length - montre.length} de plus (liste complète : paquet.liste.txt)`)
  console.log(`  exclus (${p.exclus.length}) : ${exclus.join(' · ') || 'aucun'}`)
  for (const t of p.secrets.filter((s) => s.ecarte)) console.log(`  · écarté (valeur sans forme de clé : pas de chiffres et de lettres mêlés) : ${t.chemin}:${t.ligne}, motif ${t.motif}`)
  const problemes = controlerPaquet(p)
  if (problemes.length) {
    console.log(`✗ contrôle du paquet : ${problemes.length} problème(s) — rien n'est envoyé`)
    for (const x of problemes.slice(0, 30)) console.log(`    ${x}`)
    return { p, lignes, exclus, problemes }
  }
  console.log(`  contrôle ✓ aucun .env*, aucun fichier de clé, aucun chemin ignoré par git, aucune clé dans les lignes ajoutées ni dans ${p.binaires.length} fichier(s) binaire(s) lus en entier (${MOTIFS.length} motifs)`)
  return { p, lignes, exclus, problemes }
}

// ── le prompt : celui d'antigravity.mjs, plus ce qui change sur l'usine ─────────────────────────────────────────
const SUPPLEMENT_USINE = (id, arbre) => `

Particularité de ton environnement (Codex sur l'usine : serveur Linux d'Oracle, sans écran, allumé 24 h/24) :
- Le dépôt presti est ici une copie jetable : le dossier courant, ${arbre}. Partout où ce prompt dit C:/Users/benja/Documents/presti, lis ce dossier-ci.
- Le vault SaaS n'est pas sur cette machine : saute SaaS/CLAUDE.md et SaaS/Produit/Carte-du-code.md.
- Aucun secret ici (ni .env.local, ni clé, ni base de production). Si la tâche en a besoin, écris .orchestre/en-cours/${id}.question.md (étape 4) puis arrête-toi : la question remonte au PC, personne ne te répondra dans cette session. Ne contourne jamais.
- node_modules est déjà installé (liens physiques vers celui de ~/presti, partagé par toutes les tâches) : ne lance ni npm install ni npm ci, et n'y modifie aucun fichier. Chromium et WebKit sont installés pour Playwright : ne change pas PLAYWRIGHT_BROWSERS_PATH. Tu peux lancer node, npx, Playwright et \`node scripts/orchestre.mjs verifier ${id}\` autant que nécessaire.
- Ne déplace pas la tâche vers fait/ : l'usine lance le vérificateur hors bac à sable juste après toi et la déplace si c'est vert ; sinon sa sortie est ajoutée à la fin de ce fichier et tu es relancé pour corriger.
- Tu ne commites rien et tu ne pousses rien. Tes fichiers reviennent au PC de Benj par un patch limité au \`perimetre\` de la tâche et à .orchestre/preuves/${id}/ : tout le reste est jeté.
Termine par une seule ligne : \`${id} : PRÊT — <ce que tu as fait>\`.`

// ── etat ──────────────────────────────────────────────────────────────────────────────────────────────────
function etat() {
  const r = distant(`
printf 'hote      %s · %s\\n' "$(hostname)" "$(uptime -p)"
printf 'charge    %s (sur %s coeurs)\\n' "$(cut -d' ' -f1-3 /proc/loadavg)" "$(nproc)"
free -m | awk '/^Mem:/ {printf "memoire   %d Mo pris sur %d Mo, %d Mo disponibles\\n", $3, $2, $7}'
df -h "$HOME" | awk 'NR==2 {printf "disque    %s pris sur %s (%s)\\n", $3, $2, $5}'
printf 'codex     %s\\n' "$(codex login status 2>&1 | head -1)"
if [ -d "$HOME/presti/.git" ]; then
  nm="absent : preparer"
  if [ -f "$HOME/presti/node_modules/.usine-lock" ]; then
    if [ "$(cat "$HOME/presti/node_modules/.usine-lock")" = "$(sha256sum "$HOME/presti/package-lock.json" | cut -d' ' -f1)" ]; then nm="à jour"; else nm="à refaire : preparer"; fi
  fi
  printf 'presti    %s · origin/main %s · node_modules %s\\n' "$(git -C "$HOME/presti" log --oneline -1 | cut -c1-70)" "$(git -C "$HOME/presti" rev-parse --short origin/main)" "$nm"
else echo "presti    absent : preparer"; fi
n=0
for d in "$HOME"/taches/*/; do
  [ -d "$d" ] || continue
  n=$((n+1)); id=$(basename "$d")
  if [ -f "$d/code" ]; then e="fini, code $(cat "$d/code")"
  elif [ -f "$d/pid" ] && kill -0 "$(cat "$d/pid")" 2>/dev/null; then e="en cours"
  else e="arrêté sans code"; fi
  [ -f "$d/recupere" ] && e="$e, récupéré $(cut -d' ' -f1 "$d/recupere") PC"
  info=""
  [ -f "$d/etat.json" ] && info=$(jq -r '"tour \\(.tour) · verdict \\(.verdict // "—") · depuis \\(.debut)"' "$d/etat.json")
  printf 'tâche     %-20s %-26s %s\\n' "$id" "$e" "$info"
done
[ "$n" -gt 0 ] || echo "tâches    aucune sur l usine"
`, { timeout: 60_000 })
  if (injoignable(r)) process.exit(5)
  console.log(`usine     ${HOTE} joignable`)
  process.stdout.write(r.sortie)
  if (r.code !== 0) { console.error(r.erreurs.trim()); process.exit(1) }
  const lances = fs.existsSync(AGENTS) ? fs.readFileSync(AGENTS, 'utf8').split(/\r?\n/).filter((l) => l.includes('"usine-')).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
  if (lances.length) { console.log('\nlancements (PC, .orchestre/agents.jsonl) :'); for (const l of lances.slice(-8)) console.log(`  ${l.date}  ${l.agent.padEnd(16)} ${String(l.tache).padEnd(18)} ${l.modele}`) }
}

// ── preparer ──────────────────────────────────────────────────────────────────────────────────────────────
async function preparer() {
  const code = await distantFlux(`
FORCER=${q(option('forcer') ? 'oui' : 'non')}
occupees=0
for p in "$HOME"/taches/*/pid; do
  [ -f "$p" ] || continue
  d=$(dirname "$p"); [ -f "$d/code" ] && continue
  if kill -0 "$(cat "$p")" 2>/dev/null; then occupees=$((occupees+1)); fi
done
if [ "$occupees" -gt 0 ] && [ "$FORCER" != oui ]; then echo "✗ $occupees tâche(s) en cours sur l usine : npm ci casserait leur node_modules partagé (--forcer pour passer outre)"; exit 3; fi
cd "$HOME/presti"
git fetch --quiet origin
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo "✗ ~/presti porte des modifications locales : rien n est écrasé, à regarder à la main"; exit 3; fi
git merge --ff-only --quiet --no-progress origin/main
echo "· ~/presti : $(git log --oneline -1 | cut -c1-80)"
lock=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ -f node_modules/.usine-lock ] && [ "$(cat node_modules/.usine-lock)" = "$lock" ]; then
  echo "· node_modules déjà installé pour ce package-lock.json : npm ci sauté"
else
  echo "· npm ci (plusieurs minutes ; HUSKY=0 : pas de crochets git posés sur l usine)"
  debut=$(date +%s)
  HUSKY=0 npm ci --no-audit --no-fund --loglevel=error
  echo "$lock" > node_modules/.usine-lock
  echo "· npm ci fini en $(( $(date +%s) - debut )) s"
fi
v=$(node -p "require('./node_modules/playwright/package.json').version")
# Les juges de la série 025 lancent Chromium ET WebKit (formulaire-site-qa FS-3/FS-4 ; relecture à froid du 24/09, U1) : sans
# WebKit ici, Codex l installait lui-même hors de ~/.cache (PLAYWRIGHT_BROWSERS_PATH=/tmp/presti-025-browsers, 939 Mo).
# --with-deps pose aussi les bibliothèques système (apt, par sudo sans mot de passe : l utilisateur usine l a).
echo "· Playwright $v (version du dépôt) : Chromium et WebKit, avec leurs dépendances système"
sudo -n true 2>/dev/null || { echo "✗ sudo sans mot de passe indisponible : playwright install --with-deps en a besoin (apt)"; exit 3; }
npx --no-install playwright install --with-deps chromium webkit
node -e "const pw = require('playwright'); (async () => { for (const nom of ['chromium', 'webkit']) { const b = await pw[nom].launch(); const p = await b.newPage(); await p.setContent('<title>ok</title>'); console.log('· ' + nom + ' démarre : ' + (await p.title()) + ' (' + b.version() + ')'); await b.close() } })().catch((e) => { console.error('✗ un navigateur ne démarre pas : ' + e.message); process.exit(1) })"
echo "✓ usine prête : node_modules $(du -sh node_modules | cut -f1), package-lock $(cut -c1-12 node_modules/.usine-lock)"
`)
  if (code === 255) { console.error(`✗ usine injoignable (${HOTE})`); process.exit(5) }
  process.exit(code === 0 ? 0 : 3)
}

// ── lancer ────────────────────────────────────────────────────────────────────────────────────────────────
async function lancer(id) {
  const debut = Date.now()
  const fiche = path.join(ORCH, 'file', `${id}.md`)
  if (!fs.existsSync(fiche)) { console.error(`✗ ${id} n'est pas dans .orchestre/file/ (déjà prise, faite, ou inexistante)`); process.exit(1) }
  const valide = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'orchestre.mjs'), 'valider', relatif(fiche)], { cwd: RACINE, encoding: 'utf8', windowsHide: true })
  if (valide.status !== 0) { console.error(`✗ fiche invalide :\n${valide.stdout}${valide.stderr}`); process.exit(1) }
  const f = lireFiche(fiche)
  if (f.executant === 'claude-code') { console.error(`✗ ${id} est réservée à claude-code : elle ne part pas sur l'usine`); process.exit(1) }
  const horsDepot = f.perimetre.filter((p) => p.startsWith('../') || p.startsWith('SaaS/'))
  if (horsDepot.length) { console.error(`✗ périmètre hors du dépôt (${horsDepot.join(', ')}) : le vault SaaS n'est pas sur l'usine`); process.exit(1) }
  const tete = git(['rev-parse', 'HEAD']).trim()
  let origine = ''
  try { origine = git(['rev-parse', 'origin/main']).trim() } catch { /* pas de origin/main */ }
  if (tete !== origine) { console.error(`✗ HEAD du PC (${tete.slice(0, 8)}) ≠ origin/main (${origine.slice(0, 8) || '?'}) : pousse d'abord — l'usine part de origin/main et le paquet ne porte que le non-commité`); process.exit(1) }
  const modele = option('model', MODELE)
  const effort = option('effort', 'medium')
  if (!/^(none|minimal|low|medium|high|xhigh)$/.test(effort)) { console.error(`✗ --effort=${effort} : none|minimal|low|medium|high|xhigh`); process.exit(2) }
  const tours = Math.max(1, Number(option('boucle', '3')) || 3)
  const minutes = Math.max(1, Number(option('minutes', '40')) || 40)

  // 1. Le paquet, construit AVANT la prise : la fiche y est encore dans file/, l'exécutant la prendra lui-même dans sa copie.
  const { p, lignes, problemes } = paquetControle(id, { afficherTout: option('liste') === 'oui' })
  if (problemes.length) process.exit(1)
  if (p.noms.some((n) => n.chemin === 'package.json' || n.chemin === 'package-lock.json') && !option('forcer')) {
    console.error('✗ le paquet modifie package.json / package-lock.json : le node_modules partagé de l\'usine ne suivrait pas (committe et pousse, puis preparer ; ou --forcer)'); process.exit(1)
  }

  // 2. L'usine est prête, et origin/main y est bien le HEAD du PC (sinon le patch ne s'appliquerait pas au même état).
  const pret = distant(`
ID=${q(id)}; SHA=${q(tete)}; T="$HOME/taches/$ID"
[ -d "$HOME/presti/.git" ] || { echo "✗ ~/presti absent : node scripts/usine.mjs preparer"; exit 3; }
[ -e "$T" ] && { echo "✗ l usine a déjà un dossier $T : node scripts/usine.mjs recuperer $ID, puis nettoyer $ID"; exit 3; }
cd "$HOME/presti"
git fetch --quiet origin
o=$(git rev-parse origin/main)
[ "$o" = "$SHA" ] || { echo "✗ origin/main vu de l usine ($o) ≠ HEAD du PC ($SHA) : pousse d abord (ou tire, si le PC est en retard)"; exit 4; }
[ -f node_modules/.usine-lock ] || { echo "✗ node_modules absent sur l usine : node scripts/usine.mjs preparer"; exit 3; }
[ "$(cat node_modules/.usine-lock)" = "$(git show "$SHA:package-lock.json" | sha256sum | cut -d' ' -f1)" ] || { echo "✗ node_modules de l usine date d un autre package-lock.json : node scripts/usine.mjs preparer"; exit 3; }
case "$(codex login status 2>&1 || true)" in "Logged in"*) ;; *) echo "✗ codex n est pas connecté sur l usine (codex login --device-auth, code validé par Benj)"; exit 3;; esac
echo "HOME=$HOME"
`, { timeout: 180_000 })
  if (injoignable(pret)) process.exit(5)
  if (pret.code !== 0) { console.error((pret.sortie + pret.erreurs).trim()); process.exit(pret.code === 4 ? 1 : 3) }
  const home = (pret.sortie.match(/^HOME=(.+)$/m) || [])[1]?.trim() || '/home/usine'
  const dossierDistant = `${home}/taches/${id}`
  const arbre = `${dossierDistant}/arbre`
  // Un lancement précédent de la même fiche (rejouée, puis relancée) : ses journaux et SON verdict sont rangés à part,
  // sinon le `recuperer` de ce lancement-ci redirait l'ancien verdict (verdict-pc.json).
  const ici = path.join(TRAVAIL, id)
  if (fs.existsSync(ici) && fs.readdirSync(ici).length) {
    if (fs.existsSync(path.join(ici, 'applique.json'))) console.log(`⚠ ${relatif(ici)}/applique.json : le patch d'un lancement précédent est encore appliqué sur le PC, il part donc dans ce paquet`)
    const archive = `${ici}.${horodatage()}`
    fs.renameSync(ici, archive)
    console.log(`· lancement précédent de ${id} rangé dans ${relatif(archive)}/`)
  }

  // 3. La prise SUR LE PC : inscription au registre « un agent, une tâche », puis `prochaine` — aucun autre exécutant ne la prendra.
  const numeros = fs.existsSync(AGENTS) ? fs.readFileSync(AGENTS, 'utf8').split(/\r?\n/).map((l) => { try { return JSON.parse(l).agent } catch { return null } }).map((a) => Number((String(a).match(/^usine-codex-(\d+)$/) || [])[1] || 0)) : []
  const agent = `usine-codex-${Math.max(0, ...numeros) + 1}`
  const conversation = `usine-${id}-${horodatage()}`
  fs.appendFileSync(AGENTS, JSON.stringify({ agent, tache: id, modele: `codex:${modele}`, conversationId: conversation, date: maintenant(), usine: HOTE }) + '\n')
  const prise = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'orchestre.mjs'), 'prochaine', `--agent=${agent}`, `--tache=${id}`], { cwd: RACINE, encoding: 'utf8', windowsHide: true })
  if (prise.status !== 0) { console.error(`✗ prise refusée sur le PC :\n${(prise.stdout + prise.stderr).trim()}`); process.exit(1) }
  console.log(`· ${id} prise sur le PC par ${agent} (en-cours/)`)

  try {
    // 4. Les fichiers envoyés : le paquet, sa liste, le prompt, la configuration du tourneur et ce script (le tourneur).
    fs.mkdirSync(ici, { recursive: true })
    const { PROMPT } = await import('./antigravity.mjs')
    fs.writeFileSync(path.join(ici, 'paquet.patch'), p.patch)
    fs.writeFileSync(path.join(ici, 'paquet.liste.txt'), `# paquet ${id} — ${maintenant()} — base ${tete}\n# statut chemin (taille) ; exclus : ${p.exclus.length}\n${lignes.join('\n')}\n`)
    fs.writeFileSync(path.join(ici, 'prompt.md'), `# Tâche ${id} — agent ${agent} — ${maintenant()} (usine)\n\n${PROMPT(agent, id)}${SUPPLEMENT_USINE(id, arbre)}\n`)
    fs.writeFileSync(path.join(ici, 'config.json'), JSON.stringify({ id, agent, modele, effort, tours, minutes, base: tete, lance: maintenant() }, null, 2))
    fs.copyFileSync(CE_FICHIER, path.join(ici, 'usine.mjs'))
    const mk = distant(`mkdir -p "$HOME/taches/"${q(id)}`)
    if (mk.code !== 0) throw new Error(`mkdir sur l'usine : ${mk.erreurs.trim()}`)
    scp(['paquet.patch', 'prompt.md', 'config.json', 'usine.mjs', `${HOTE}:taches/${id}/`], ici)
    console.log(`· envoyé par scp : paquet.patch (${ko(p.patch.length)}), prompt.md, config.json, usine.mjs → ${dossierDistant}/`)

    // 5. Sur l'usine : worktree jetable, paquet, node_modules partagé, commit « base », tourneur détaché.
    const r = distant(`
ID=${q(id)}; SHA=${q(tete)}; T="$HOME/taches/$ID"
cd "$HOME/presti"
git worktree add --detach --quiet "$T/arbre" "$SHA"
cd "$T/arbre"
[ -s "$T/paquet.patch" ] && git apply --whitespace=nowarn "$T/paquet.patch"
# node_modules : une copie en liens physiques (cp -al : aucun octet de données copié, quelques secondes), pas un lien
# symbolique. tsc résout un lien symbolique vers son chemin réel : avec « ln -s », lib.es5.d.ts était lu dans
# ~/presti/node_modules et constructeur-ferme-qa CF-8, qui l exige sous <arbre>/node_modules, rendait un faux rouge
# (relecture à froid du 24/09, U2). La copie garde le chemin <arbre>/node_modules ; retirer le worktree n ôte que les liens.
cp -al "$HOME/presti/node_modules" node_modules
git add -A
arbre=$(git write-tree)
base=$(GIT_AUTHOR_NAME=usine GIT_AUTHOR_EMAIL=usine@presti.invalid GIT_COMMITTER_NAME=usine GIT_COMMITTER_EMAIL=usine@presti.invalid git commit-tree "$arbre" -p HEAD -m "base $ID : paquet du PC (local, jamais poussé)")
git update-ref HEAD "$base"
echo "$base" > "$T/base.sha"
mkdir -p .orchestre/travail/usine
cp "$T/prompt.md" ".orchestre/travail/usine/$ID.prompt.md"
echo "· worktree $T/arbre sur $(git rev-parse --short HEAD) (base), $(git status --porcelain | wc -l) écart(s) après base"
cd "$T"
setsid -f node "$T/usine.mjs" tourner "$T" > "$T/tourner.out" 2>&1 < /dev/null
for i in 1 2 3 4 5 6 7 8 9 10; do [ -f "$T/pid" ] && break; sleep 1; done
[ -f "$T/pid" ] || { echo "✗ le tourneur n a pas démarré :"; cat "$T/tourner.out"; exit 1; }
echo "· tourneur détaché, pid $(cat "$T/pid")"
`, { timeout: 15 * 60_000 })
    if (r.code !== 0) throw new Error(`lancement sur l'usine : ${(r.sortie + r.erreurs).trim().slice(-800)}`)
    process.stdout.write(r.sortie)
  } catch (e) {
    // Rien ne tourne : on rend la fiche à la file et on retire ce qui a été posé sur l'usine.
    console.error(`✗ ${e.message}`)
    nettoyerDistant(id, true)
    spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'orchestre.mjs'), 'liberer', id], { cwd: RACINE, stdio: 'inherit', windowsHide: true })
    process.exit(1)
  }
  console.log(`✓ ${agent} → ${id} lancé sur l'usine (codex ${modele}, effort ${effort}, ${tours} tour(s) au plus, ${minutes} min par tour) en ${Math.round((Date.now() - debut) / 1000)} s`)
  console.log(`  suivi : node scripts/usine.mjs etat · résultat : node scripts/usine.mjs recuperer ${id} [--attendre]`)
}

// ── recuperer ─────────────────────────────────────────────────────────────────────────────────────────────
// Le PC ne garde que ce que SON verdict juge PASS. L'ordre : rapatrier → git apply (applique.json) → fiche en fait/ →
// `verifier` sur le PC → verdict-pc.json → marque `recupere` sur l'usine, qui porte ce verdict. Rouge : le patch est retiré
// du PC (git apply -R, seulement s'il se retire proprement) et la fiche reste en refuse/, où l'orchestre l'a rangée ; le
// patch attend dans travail/usine/<id>/. Un second `recuperer` redit le verdict enregistré, code 0 seulement si PASS et
// fiche toujours en fait/ ; patch appliqué sans verdict (vérificateur interrompu) : il rejuge.
// Avant le 24/09/2026, la fiche passait en fait/ et la marque était posée AVANT le verdict : sur une tâche refusée par le PC,
// le résultat refusé restait appliqué et un second `recuperer` répondait « ✓ déjà récupérée », code 0 (essai
// 000-usine-attaque-ordre : PASS de l'usine, intrus posé sur le PC dans le périmètre, FAIL du PC).
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const ouEstLaFiche = (id) => ['en-cours', 'fait', 'refuse', 'file'].find((d) => fs.existsSync(path.join(ORCH, d, `${id}.md`))) || null
const empreinte = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
function lireEtatDistant(id) {
  const r = distant(`
T="$HOME/taches/"${q(id)}
[ -d "$T" ] || { echo "ABSENT"; exit 0; }
if [ -f "$T/code" ]; then echo "FINI $(cat "$T/code")"
elif [ -f "$T/pid" ] && kill -0 "$(cat "$T/pid")" 2>/dev/null; then echo "EN_COURS"
else echo "ARRETE"; fi
[ -f "$T/recupere" ] && echo "RECUPERE $(head -c 60 "$T/recupere" | tr -d '\\n')"
[ -f "$T/etat.json" ] && jq -c . "$T/etat.json" || true
tail -n 3 "$T/codex.log" 2>/dev/null | cut -c1-160 | sed 's/^/JOURNAL /' || true
`, { timeout: 60_000 })
  if (injoignable(r)) process.exit(5)
  const l = r.sortie.split('\n')
  let etatJson = null
  try { etatJson = JSON.parse(l.find((x) => x.startsWith('{')) || 'null') } catch { /* pas encore écrit */ }
  const marque = l.find((x) => x.startsWith('RECUPERE'))
  return { brut: l[0] || '', recupere: !!marque, marque: marque ? marque.slice(8).trim() : '', etat: etatJson, journal: l.filter((x) => x.startsWith('JOURNAL ')).map((x) => x.slice(8)) }
}
// Le verdict du PC déjà rendu : redit tel quel. Code 0 seulement si PASS et fiche toujours en fait/.
function redire(id, ici, j) {
  const ou = ouEstLaFiche(id)
  const ok = j.verdict === 'PASS' && ou === 'fait'
  console.log(`${ok ? '✓' : '✗'} ${id} déjà récupérée : ${j.verdict} sur le PC (${j.date})${j.ligne ? ' — ' + j.ligne : ''}${j.retire ? ' · patch retiré du PC' : ''} · fiche en ${ou || '?'}/`)
  if (j.verdict === 'PASS' && ou !== 'fait') console.log(`  ⚠ la fiche n'est plus en fait/ : ce PASS ne vaut plus (voir .orchestre/verdicts.jsonl)`)
  console.log(`  journaux : ${relatif(ici)}/ · puis : node scripts/usine.mjs nettoyer ${id}`)
  process.exit(ok ? 0 : 1)
}
// Le verdict officiel, SUR LE PC, patch déjà appliqué (marque = applique.json).
function juger(id, ici, marque) {
  const ou = ouEstLaFiche(id)
  if (ou === 'en-cours') {
    fs.renameSync(path.join(ORCH, 'en-cours', `${id}.md`), path.join(ORCH, 'fait', `${id}.md`))
    const question = path.join(ORCH, 'en-cours', `${id}.question.md`)
    if (fs.existsSync(question)) fs.renameSync(question, path.join(ORCH, 'fait', `${id}.question.md`))
    console.log(`· ${id} : en-cours/ → fait/ ; verdict du PC :`)
  } else if (ou === 'fait') console.log(`· ${id} déjà en fait/ ; verdict du PC :`)
  else if (ou === 'refuse') {
    // Le vérificateur a rangé la fiche en refuse/, mais le verdict n'a pas été enregistré ici (interruption) : c'est un FAIL.
    const derniers = fs.existsSync(path.join(ORCH, 'verdicts.jsonl')) ? fs.readFileSync(path.join(ORCH, 'verdicts.jsonl'), 'utf8').split(/\r?\n/).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((v) => v?.id === id) : []
    conclure(id, ici, marque, { verdict: 'FAIL', code: 1, ligne: `fiche en refuse/ : ${derniers.at(-1)?.ligne || "verdict de l’orchestre"}` })
  } else { console.error(`✗ ${id} est en ${ou || "aucun dossier de l’orchestre"}/ sur le PC : pas de verdict possible. Le patch appliqué : ${relatif(path.join(ici, 'resultat.patch'))} (git apply -R pour le retirer).`); process.exit(1) }
  const v = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'orchestre.mjs'), 'verifier', id], { cwd: RACINE, encoding: 'utf8', windowsHide: true, timeout: 45 * 60_000 })
  const sortie = `${v.stdout || ''}${v.stderr || ''}`
  process.stdout.write(sortie)
  fs.writeFileSync(path.join(ici, 'verdict-pc.log'), `# ${maintenant()} · node scripts/orchestre.mjs verifier ${id} · code ${v.status}${v.signal ? ' · signal ' + v.signal : ''}\n${sortie}`)
  const apres = ouEstLaFiche(id)
  const ligne = ((sortie.match(new RegExp(`${id}\\s*:\\s*(PASS|FAIL)[^\\n]*`)) || [])[0] || '').replace(/ · \d+s · .*$/, '').slice(0, 200)
  const pass = v.status === 0 && new RegExp(`${id}\\s*:\\s*PASS`).test(sortie) && apres === 'fait'
  const fail = v.status === 1 && new RegExp(`${id}\\s*:\\s*FAIL`).test(sortie)
  if (!pass && !fail) {
    // Ni PASS ni FAIL prononcés (vérificateur tué, fiche introuvable…) : rien n'est conclu, rien n'est marqué.
    console.error(`✗ verdict du PC inconnu (code ${v.status ?? '—'}${v.signal ? ', signal ' + v.signal : ''}${v.error ? ', ' + v.error.message : ''}) : le patch reste appliqué, la fiche est en ${apres || '?'}/. Relancer node scripts/usine.mjs recuperer ${id} : il rejuge.`)
    process.exit(1)
  }
  conclure(id, ici, marque, { verdict: pass ? 'PASS' : 'FAIL', code: v.status, ligne })
}
// Rouge : le patch est retiré du PC. Puis verdict-pc.json, puis la marque sur l'usine — dans cet ordre.
function conclure(id, ici, marque, v) {
  const patch = path.join(ici, 'resultat.patch')
  let retire = false
  if (v.verdict !== 'PASS' && marque.patch) {
    const pareil = fs.existsSync(patch) && empreinte(patch) === marque.patch
    const essai = pareil ? spawnSync('git', ['apply', '-R', '--check', '--whitespace=nowarn', patch], { cwd: RACINE, encoding: 'utf8', windowsHide: true }) : null
    if (essai?.status === 0 && spawnSync('git', ['apply', '-R', '--whitespace=nowarn', patch], { cwd: RACINE, encoding: 'utf8', windowsHide: true }).status === 0) {
      retire = true
      fs.rmSync(path.join(ici, 'applique.json'), { force: true })
      console.log(`· patch retiré du PC (git apply -R) : un résultat refusé n'y reste pas ; il attend dans ${relatif(patch)}`)
    } else console.log(`⚠ le patch ne se retire pas proprement (${pareil ? String(essai?.stderr || '').trim().split('\n')[0] : 'resultat.patch a changé depuis son application'}) : il reste appliqué, à regarder à la main (git apply -R ${relatif(patch)})`)
  }
  const j = { verdict: v.verdict, code: v.code, ligne: v.ligne, date: maintenant(), patch: marque.patch, fichiers: marque.fichiers, verdictUsine: marque.verdictUsine, force: !!marque.force, retire }
  fs.writeFileSync(path.join(ici, 'verdict-pc.json'), JSON.stringify(j, null, 2))
  const m = distant(`printf '%s %s\\n' ${q(v.verdict)} ${q(j.date)} > "$HOME/taches/"${q(id)}"/recupere"`)
  if (m.code !== 0) console.log(`  ⚠ marque « recupere » non posée sur l'usine (${(m.erreurs || m.sortie).trim().split('\n').pop() || `code ${m.code}`}) : nettoyer demandera --forcer`)
  const pass = v.verdict === 'PASS'
  console.log(`${pass ? '✓' : '✗'} ${id} : ${v.verdict} sur le PC${retire ? ' (patch retiré)' : ''} · puis : node scripts/usine.mjs nettoyer ${id}`)
  process.exit(pass ? 0 : 1)
}
async function recuperer(id) {
  const ici = path.join(TRAVAIL, id)
  // 0. Reprise : le verdict du PC est déjà enregistré, ou le patch déjà appliqué sans verdict.
  const juge = lireJson(path.join(ici, 'verdict-pc.json'))
  if (juge) redire(id, ici, juge)
  const applique = lireJson(path.join(ici, 'applique.json'))
  if (applique) { console.log(`· ${id} : patch appliqué sur le PC le ${applique.date}, sans verdict du PC enregistré : je rejuge`); juger(id, ici, applique) }
  let e = lireEtatDistant(id)
  if (e.brut === 'ABSENT') { console.error(`✗ aucune tâche ${id} sur l'usine`); process.exit(1) }
  const attendre = option('attendre')
  if (e.brut === 'EN_COURS' && attendre) {
    const fin = Date.now() + (attendre === 'oui' ? 60 : Number(attendre) || 60) * 60_000
    console.log(`· ${id} en cours sur l'usine : j'attends (au plus ${Math.round((fin - Date.now()) / 60000)} min)`)
    while (e.brut === 'EN_COURS' && Date.now() < fin) { await new Promise((r) => setTimeout(r, 20_000)); e = lireEtatDistant(id) }
  }
  if (e.brut === 'EN_COURS') {
    console.log(`… ${id} en cours sur l'usine (tour ${e.etat?.tour ?? '?'}, depuis ${e.etat?.debut ?? '?'})`)
    for (const l of e.journal) console.log(`    ${l}`)
    process.exit(4)
  }
  // Marquée récupérée sur l'usine, mais aucun verdict ni patch appliqué enregistré ici : rien ne permet de dire PASS.
  if (e.recupere) { console.error(`✗ l'usine dit ${id} récupérée (${e.marque || "sans verdict : marque d’avant le 24/09/2026"}), mais ${relatif(ici)}/ n'a ni verdict-pc.json ni applique.json : aucun verdict du PC à redire. Fiche en ${ouEstLaFiche(id) || '?'}/ sur le PC ; voir .orchestre/verdicts.jsonl.`); process.exit(1) }
  const verdictUsine = e.brut === 'ARRETE' ? 'ARRÊTÉ SANS CODE' : (e.etat?.verdict || '?')
  console.log(`· usine : ${id} ${e.brut === 'ARRETE' ? 'arrêtée sans code de fin' : `finie (code ${e.brut.split(' ')[1]})`}, verdict de l'usine ${verdictUsine}${e.etat?.ligne ? ' — ' + e.etat.ligne : ''}`)

  const ficheEnCours = path.join(ORCH, 'en-cours', `${id}.md`)
  if (!fs.existsSync(ficheEnCours)) { console.error(`✗ ${id} n'est pas en en-cours/ sur le PC : rien n'est appliqué (déjà récupérée à la main, ou libérée ?)`); process.exit(1) }
  const f = lireFiche(ficheEnCours)
  const perimetre = f.perimetre.map(globVersRegex)
  const interdit = f.interdit.map(globVersRegex)

  // 1. Ce qui a bougé depuis « base » (git add -A dans le worktree jetable : les nouveaux fichiers comptent aussi).
  const liste = distant(`
T="$HOME/taches/"${q(id)}; cd "$T/arbre"
git add -A
git -c core.quotepath=false diff --cached --name-status --no-renames -z "$(cat "$T/base.sha")"
`, { timeout: 300_000 })
  if (liste.code !== 0) { console.error(`✗ liste des changements : ${liste.erreurs.trim()}`); process.exit(1) }
  const changes = nomStatut(liste.sortie)
  const garder = []
  const hors = []
  const interne = []
  const preuves = `.orchestre/preuves/${id}/`
  for (const c of changes) {
    if (c.chemin.startsWith(preuves)) {
      // avant.txt et verifier.log de l'usine décrivent SON arbre : le PC a les siens (prise, verdict). Rapatriés à part.
      if (c.chemin === `${preuves}avant.txt` || c.chemin === `${preuves}verifier.log`) interne.push(c)
      else garder.push(c)
    } else if (perimetre.some((re) => re.test(c.chemin))) {
      if (interdit.some((re) => re.test(c.chemin))) hors.push({ ...c, raison: 'interdit' }); else garder.push(c)
    } else if (c.chemin.startsWith('.orchestre/')) interne.push(c)
    else hors.push({ ...c, raison: 'hors périmètre' })
  }
  console.log(`· changements sur l'usine : ${changes.length} — rapatriés ${garder.length}, .orchestre/ interne ${interne.length} (non rapatriés), hors périmètre ${hors.length}`)
  for (const c of garder) console.log(`    ${c.statut}  ${c.chemin}`)
  if (hors.length) { console.log(`  ⚠ ${hors.length} fichier(s) modifié(s) HORS périmètre, EXCLUS du patch :`); for (const c of hors) console.log(`    ${c.statut}  ${c.chemin}  (${c.raison})`) }
  const produits = garder.filter((c) => !c.chemin.startsWith(preuves)).length
  if (f.fichiers !== null && produits > f.fichiers) console.log(`  ⚠ budget dépassé : ${produits} fichier(s) dans le périmètre pour ${f.fichiers} prévus`)

  // 2. Le patch (limité aux fichiers gardés) et les journaux, rassemblés dans ~/taches/<id>/retour/ puis rapatriés.
  const chemins = garder.map((c) => q(c.chemin)).join(' ')
  const prep = distant(`
T="$HOME/taches/"${q(id)}; ID=${q(id)}; R="$T/retour"
mkdir -p "$R"; cd "$T/arbre"
${garder.length ? `GIT_LITERAL_PATHSPECS=1 git diff --cached --binary --no-renames "$(cat "$T/base.sha")" -- ${chemins} > "$R/resultat.patch"` : ': > "$R/resultat.patch"'}
for f in codex.log tourner.out etat.json dernier-message.md config.json paquet.patch; do [ -f "$T/$f" ] && cp "$T/$f" "$R/$f"; done
[ -f ".orchestre/preuves/$ID/verifier.log" ] && cp ".orchestre/preuves/$ID/verifier.log" "$R/verifier-usine.log"
[ -f ".orchestre/travail/usine/$ID.prompt.md" ] && cp ".orchestre/travail/usine/$ID.prompt.md" "$R/prompt-final.md"
q=".orchestre/en-cours/$ID.question.md"; [ -f "$q" ] && cp "$q" "$R/question.md"
printf '%s\\n' ${garder.map((c) => q(`${c.statut}\t${c.chemin}`)).join(' ') || "''"} > "$R/rapatries.txt"
printf '%s\\n' ${hors.map((c) => q(`${c.statut}\t${c.chemin}\t${c.raison}`)).join(' ') || "''"} > "$R/hors-perimetre.txt"
ls -la "$R" | tail -n +2 | awk '{print $5, $9}'
`, { timeout: 300_000 })
  if (prep.code !== 0) { console.error(`✗ préparation du retour : ${(prep.sortie + prep.erreurs).trim()}`); process.exit(1) }
  fs.mkdirSync(ici, { recursive: true })
  fs.rmSync(path.join(ici, 'retour'), { recursive: true, force: true }) // le dossier d'arrivée de scp -r, dans travail/ (ignoré)
  scp(['-r', `${HOTE}:taches/${id}/retour`, '.'], ici)
  for (const n of fs.readdirSync(path.join(ici, 'retour'))) fs.renameSync(path.join(ici, 'retour', n), path.join(ici, n === 'paquet.patch' ? 'paquet-recu-par-l-usine.patch' : n))
  fs.rmSync(path.join(ici, 'retour'), { recursive: true, force: true })
  const patch = path.join(ici, 'resultat.patch')
  const taillePatch = fs.statSync(patch).size
  console.log(`· rapatrié dans ${relatif(ici)}/ : resultat.patch (${ko(taillePatch)}), codex.log (${ko(fs.existsSync(path.join(ici, 'codex.log')) ? fs.statSync(path.join(ici, 'codex.log')).size : 0)}), verifier-usine.log, etat.json`)

  if (verdictUsine === 'QUESTION' && fs.existsSync(path.join(ici, 'question.md'))) {
    fs.copyFileSync(path.join(ici, 'question.md'), path.join(ORCH, 'en-cours', `${id}.question.md`))
    console.log(`? Codex a posé une question : .orchestre/en-cours/${id}.question.md. Rien n'est appliqué ; le patch attend dans ${relatif(patch)}.`)
    console.log(`  Répondre dans la fiche, puis : node scripts/orchestre.mjs liberer ${id} · node scripts/usine.mjs nettoyer ${id} --forcer · node scripts/usine.mjs lancer ${id}`)
    process.exit(1)
  }
  if (verdictUsine !== 'PASS' && !option('forcer')) {
    console.log(`✗ l'usine n'a pas rendu PASS (${verdictUsine}) : rien n'est appliqué sur le PC, ${id} reste en en-cours/. Le patch est dans ${relatif(patch)}.`)
    console.log(`  Voir codex.log ; --forcer applique quand même et laisse le PC juger ; sinon : orchestre liberer ${id}, usine nettoyer ${id} --forcer, relancer.`)
    process.exit(1)
  }

  // 3. Sur le PC : git apply --check, puis git apply (l'arbre de travail seulement : ni l'index ni HEAD ne bougent).
  // --forcer (usine pas PASS) suit le même chemin : le verdict du PC tranche, et un rouge retire le patch.
  if (taillePatch > 0) {
    const essai = spawnSync('git', ['apply', '--check', '--whitespace=nowarn', patch], { cwd: RACINE, encoding: 'utf8', windowsHide: true })
    if (essai.status !== 0) { console.error(`✗ git apply --check refuse le patch (le PC a changé depuis le lancement ?) :\n${essai.stderr.trim()}\n  Rien n'est appliqué ; ${id} reste en en-cours/.`); process.exit(1) }
    const applique = spawnSync('git', ['apply', '--whitespace=nowarn', patch], { cwd: RACINE, encoding: 'utf8', windowsHide: true })
    if (applique.status !== 0) { console.error(`✗ git apply : ${applique.stderr.trim()}`); process.exit(1) }
    console.log(`· patch appliqué sur le PC (${garder.length} fichier(s)) ; retiré de lui-même si le PC rend FAIL`)
  } else console.log('· patch vide : rien à appliquer')
  const marque = { date: maintenant(), patch: taillePatch > 0 ? empreinte(patch) : null, fichiers: garder.length, verdictUsine, force: verdictUsine !== 'PASS' }
  fs.writeFileSync(path.join(ici, 'applique.json'), JSON.stringify(marque, null, 2))

  // 4. La fiche passe d'en-cours à fait comme l'orchestre l'attend, puis le verdict officiel : `verifier` SUR LE PC.
  juger(id, ici, marque)
}

// ── nettoyer ──────────────────────────────────────────────────────────────────────────────────────────────
// Le worktree est retiré par git (worktree remove --force sur NOTRE dossier de tâche), puis le dossier de la tâche.
function nettoyerDistant(id, forcer) {
  return distant(`
ID=${q(id)}; FORCER=${q(forcer ? 'oui' : 'non')}
[[ "$ID" =~ ^[0-9]{3}-[A-Za-z0-9_-]+$ ]] || { echo "✗ identifiant refusé : $ID"; exit 2; }
T="$HOME/taches/$ID"
[ -d "$T" ] || { echo "· rien à nettoyer : $T absent"; exit 0; }
if [ -f "$T/pid" ] && [ ! -f "$T/code" ] && kill -0 "$(cat "$T/pid")" 2>/dev/null; then
  [ "$FORCER" = oui ] || { echo "✗ $ID tourne encore sur l usine (--forcer l arrête)"; exit 4; }
  kill -TERM -- "-$(cat "$T/pid")" 2>/dev/null || kill -TERM "$(cat "$T/pid")" 2>/dev/null || true
  sleep 2
fi
[ -f "$T/recupere" ] || [ "$FORCER" = oui ] || { echo "✗ $ID n a pas été récupérée : node scripts/usine.mjs recuperer $ID (ou --forcer pour jeter)"; exit 4; }
if [ -e "$T/arbre" ]; then git -C "$HOME/presti" worktree remove --force "$T/arbre"; fi
git -C "$HOME/presti" worktree prune
rm -rf -- "$T"
echo "✓ $ID retirée de l usine (worktree et dossier $T)"
`, { timeout: 300_000 })
}
function nettoyer(id) {
  const r = nettoyerDistant(id, !!option('forcer'))
  if (injoignable(r)) process.exit(5)
  process.stdout.write(r.sortie)
  if (r.code !== 0) { if (r.erreurs.trim()) console.error(r.erreurs.trim()); process.exit(r.code === 4 ? 4 : 1) }
}

// ── tourner : ce qui tourne SUR L'USINE, détaché de ssh (node ~/taches/<id>/usine.mjs tourner ~/taches/<id>) ──────────
// La boucle d'executant.mjs : Codex écrit (bac à sable workspace-write + réseau, -C le worktree), le vérificateur tourne
// ici, hors bac à sable ; vert → la fiche passe en fait/ et le vérificateur est relancé (ce verdict-là est celui de
// l'usine) ; rouge → sa sortie est ajoutée au prompt et Codex relancé, `tours` fois au plus. Fichiers d'état dans le
// dossier de la tâche : pid, etat.json, codex.log (journal), dernier-message.md, et `code` à la toute fin
// (0 PASS · 1 FAIL · 3 quota épuisé · 4 fiche non prise · 5 erreur · 6 codex déconnecté · 7 question posée · 8 arrêté).
let codexEnCours = null // le processus Codex du tour en cours : il vit dans son propre groupe (detached), qu'on tue en entier
function codexExec(arbre, instruction, cfg, journal, dernier) {
  const binaire = [path.join(os.homedir(), '.local', 'bin', 'codex')].find((b) => fs.existsSync(b)) || 'codex'
  const argv = ['exec', '-C', arbre, '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true', '--color', 'never', '-o', dernier, '-m', cfg.modele, '-c', `model_reasoning_effort=${cfg.effort}`, instruction]
  return new Promise((resoudre) => {
    const debut = Date.now()
    let sortie = ''
    const flux = fs.createWriteStream(journal, { flags: 'a' })
    flux.write(`\n=== ${maintenant()} codex ${cfg.modele} (effort ${cfg.effort}) : ${instruction}\n`)
    const enfant = spawn(binaire, argv, { cwd: arbre, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
    codexEnCours = enfant
    const lire = (b) => { const s = b.toString(); sortie += s; flux.write(s) }
    enfant.stdout.on('data', lire); enfant.stderr.on('data', lire)
    const minuteur = setTimeout(() => { flux.write(`\n[délai de ${cfg.minutes} min dépassé : arrêt]\n`); try { process.kill(-enfant.pid, 'SIGKILL') } catch { /* déjà mort */ } }, cfg.minutes * 60_000)
    const fin = (code) => {
      clearTimeout(minuteur)
      codexEnCours = null
      if (fs.existsSync(dernier)) { const d = fs.readFileSync(dernier, 'utf8'); sortie += '\n' + d; flux.write(`\n--- dernier message de Codex ---\n${d}\n`) }
      flux.write(`=== codex fini, code ${code}, ${Math.round((Date.now() - debut) / 1000)} s\n`)
      flux.end(() => resoudre({ code, sortie }))
    }
    enfant.on('close', (code) => fin(code ?? 1))
    enfant.on('error', (e) => { sortie += String(e.message); fin(127) })
  })
}
async function tourner(dossier) {
  const cfg = JSON.parse(fs.readFileSync(path.join(dossier, 'config.json'), 'utf8'))
  const { id } = cfg
  const arbre = path.join(dossier, 'arbre')
  const journal = path.join(dossier, 'codex.log')
  const dernier = path.join(dossier, 'dernier-message.md')
  const relPrompt = `.orchestre/travail/usine/${id}.prompt.md`
  const fPrompt = path.join(arbre, relPrompt)
  const etatT = { id, agent: cfg.agent, pid: process.pid, debut: maintenant(), tour: 0, codes: [], verdict: null, ligne: null, fin: null }
  const poser = (maj = {}) => { Object.assign(etatT, maj); fs.writeFileSync(path.join(dossier, 'etat.json'), JSON.stringify(etatT, null, 2)) }
  const finir = (code, verdict, ligne) => {
    poser({ verdict, ligne, fin: maintenant() })
    fs.appendFileSync(journal, `\n=== fin du tourneur : ${verdict} (code ${code})${ligne ? ' — ' + ligne : ''}\n`)
    fs.writeFileSync(path.join(dossier, 'code'), `${code}\n`)
    process.exit(code)
  }
  fs.writeFileSync(path.join(dossier, 'pid'), String(process.pid))
  poser()
  const panne = (e) => { try { fs.appendFileSync(journal, `\n[erreur du tourneur] ${e?.stack || e}\n`) } catch { /* rien */ } finir(5, 'ERREUR', String(e?.message || e).slice(0, 200)) }
  process.on('uncaughtException', panne)
  process.on('unhandledRejection', panne)
  // `nettoyer --forcer` envoie SIGTERM au tourneur : il emporte Codex (son groupe entier) avant d'écrire son code de fin.
  process.on('SIGTERM', () => { if (codexEnCours) { try { process.kill(-codexEnCours.pid, 'SIGKILL') } catch { /* déjà mort */ } } finir(8, 'ARRÊTÉ', 'arrêté par nettoyer --forcer') })
  const fiche = (d) => path.join(arbre, '.orchestre', d, `${id}.md`)
  const verifier = () => {
    const r = spawnSync(process.execPath, [path.join(arbre, 'scripts', 'orchestre.mjs'), 'verifier', id], { cwd: arbre, encoding: 'utf8', timeout: 45 * 60_000 })
    const sortie = `${r.stdout || ''}${r.stderr || ''}`
    const ligne = (sortie.match(new RegExp(`${id}\\s*:\\s*(PASS|FAIL)[^\\n]*`)) || [])[0] || sortie.trim().split('\n').pop() || ''
    return { pass: r.status === 0 && new RegExp(`${id}\\s*:\\s*PASS`).test(sortie), sortie, ligne: ligne.slice(0, 200) }
  }
  for (let tour = 1; tour <= cfg.tours; tour++) {
    poser({ tour })
    const instruction = tour === 1
      ? `Lis le fichier ${relPrompt} du depot et fais exactement ce qu il dit, du debut a la fin.`
      : `Relis le fichier ${relPrompt} du depot : sa derniere section contient le retour du verificateur lance hors bac a sable. Corrige ce qui echoue, dans le perimetre de la tache ${id}, puis termine par la ligne ${id} : PRÊT.`
    const r = await codexExec(arbre, instruction, cfg, journal, dernier)
    etatT.codes.push(r.code); poser()
    if (r.code !== 0 && /not logged in|please log ?in|codex login|401 Unauthorized|403 Forbidden/i.test(r.sortie)) finir(6, 'AUTH', 'codex n est pas connecté (codex login --device-auth, code validé par Benj)')
    const limite = r.sortie.match(/hit your usage limit[^\n]*?(try again at [^\n]+)?$/im)
    if (limite) finir(3, 'QUOTA', `quota de l'abonnement ChatGPT épuisé${limite[1] ? ' — ' + limite[1].trim() : ''}`)
    const qf = path.join(arbre, '.orchestre', 'en-cours', `${id}.question.md`)
    if (fs.existsSync(qf) && !fs.existsSync(qf.replace(/\.question\.md$/, '.reponse.md'))) finir(7, 'QUESTION', `Codex a posé une question (.orchestre/en-cours/${id}.question.md)`)
    // Un tour précédent vert en fait/ puis rouge au final a envoyé la fiche en refuse/ : dans cette copie jetable, on la remet en en-cours/.
    if (fs.existsSync(fiche('refuse')) && !fs.existsSync(fiche('en-cours')) && !fs.existsSync(fiche('fait'))) fs.renameSync(fiche('refuse'), fiche('en-cours'))
    let v
    if (fs.existsSync(fiche('fait'))) {
      // Codex l'a déplacée lui-même malgré la consigne : le vérificateur depuis fait/ fait le verdict.
      v = verifier()
      fs.appendFileSync(journal, `\n=== vérificateur hors bac à sable depuis fait/, tour ${tour} (${maintenant()}) ===\n${v.sortie}\n`)
      if (v.pass) finir(0, 'PASS', v.ligne)
      if (fs.existsSync(fiche('refuse'))) fs.renameSync(fiche('refuse'), fiche('en-cours'))
    } else if (!fs.existsSync(fiche('en-cours'))) {
      finir(4, 'NON_PRISE', `${id} n'est ni en en-cours/ ni en fait/ : Codex ne l'a pas prise (voir codex.log)`)
    } else {
      v = verifier()
      fs.appendFileSync(journal, `\n=== vérificateur hors bac à sable, tour ${tour} (${maintenant()}) ===\n${v.sortie}\n`)
      if (v.pass) {
        fs.renameSync(fiche('en-cours'), fiche('fait'))
        const final = verifier()
        fs.appendFileSync(journal, `\n=== vérificateur final (fait/) ===\n${final.sortie}\n`)
        finir(final.pass ? 0 : 1, final.pass ? 'PASS' : 'FAIL', final.ligne)
      }
    }
    // Chaque branche ci-dessus lance le vérificateur ou sort : `v` ne devrait jamais manquer ici. S'il manquait, un
    // `v.ligne` lèverait une exception, prise par `panne` : code 5 ERREUR au lieu de 1 FAIL. D'où le repli.
    if (tour === cfg.tours) finir(1, 'FAIL', `${v?.ligne || 'vérificateur non lancé'} (après ${tour} tour(s))`)
    fs.appendFileSync(fPrompt, `\n\n## Retour du vérificateur, tour ${tour} (${maintenant()}, lancé hors bac à sable)\n\n\`\`\`\n${(v?.sortie || '(vérificateur non lancé)').slice(-6000)}\n\`\`\`\n\nCorrige ce qui échoue, dans le périmètre, puis termine par « ${id} : PRÊT — … ».\n`)
  }
}

// ── executer : un juge sur l'usine, sur l'état du PC, son code de sortie rendu tel quel ───────────────────────────────
// node scripts/usine.mjs executer [--nom=verif] [--delai=30] [--attendre=30] [--id=<id>] [--rapatrier=<chemin>] [--forcer] [--liste] -- <commande…>
// Dans une fiche : `verifier: node scripts/usine.mjs executer -- node scripts/<juge>.mjs`. Le verdict reste celui de
// l'orchestre, sur le PC (il lit ce code de sortie) ; le travail lourd (Chromium, tsc, build) tourne sur l'usine. Ce n'est
// pas un exécutant : aucune fiche prise, ni Codex ni son bac à sable (c'est un juge écrit par Claude Code), aucun patch rendu.
// 1. Le paquet de `lancer` (construirePaquet + controlerPaquet : même filtre, mêmes barrières), plus une barrière propre à
//    executer (controlerPaquetExecuter : URL avec identifiants, noms sensibles en JSON/YAML/minuscules, archives) ; ce qui ne
//    part pas est dit (direCeQuiNePartPas). --id=<id> y met les preuves de cette fiche, sinon aucune. Il part dans l'entrée
//    standard de ssh, derrière le script ; l'usine vérifie à l'arrivée sa taille et son SHA-256.
// 2. Sur l'usine, une seule session ssh : verrou flock du bac (un second appel sur le même bac attend --attendre minutes,
//    puis refuse ; un autre --nom tourne en parallèle) → bac ~/bacs/<nom> recréé au HEAD du PC (worktree remove --force
//    puis add : jamais de reset --hard) → paquet appliqué → node_modules en liens physiques (cp -al, la solution U2 de `lancer`).
// 3. La commande, dans le bac : `bash -c` lancé par LANCEUR_PERL, entrée /dev/null, sous `timeout` (--delai → 124), variable
//    USINE_EXECUTER_RUN posée pour retrouver ses restes (arrêtés à la fin, même détachés). Ses sorties standard et d'erreur
//    arrivent en direct sur le PC ; l'outil ne parle que sur la sortie d'erreur. Si ssh se coupe (PC tué, ssh tué, connexion
//    perdue, juge qui coupe sa propre session), la veille de l'usine voit la fin de son entrée standard, écrit sa marque, puis
//    arrête la commande : le verdict n'est pas rendu (125), quel que soit le code de sortie de la commande arrêtée.
// 4. Un repère (@@usine-executer <run> commande@@, avalé par le PC) sépare la mise en place de la commande : sans repère, c'est
//    une panne de l'outil (125), jamais un code de la commande. À la fin, l'usine écrit ~/bacs/.runs/<jeton>.fin (« code
//    rendu, cause, code brut ») puis l'envoie dans un repère de fin signé du jeton. Causes : seule (code de la commande),
//    delai (124), veille / signal-<NOM> / sans-marque (125). Pas de repère de fin (ssh tué, connexion perdue) : le PC relit la
//    fin sur l'usine (90 s au plus) ; introuvable : 125. Le code de sortie de ssh.exe n'est jamais pris pour celui du juge.
// 5. Rien ne revient sur le PC, sauf avec --rapatrier=<chemin> : les fichiers ÉCRITS par la commande (plus récents que le
//    montage du bac) sous .orchestre/travail/<…> (hors usine/ et executant/, états des outils) ou .orchestre/preuves/<id>/
//    (hors avant.txt et verifier.log, qui sont ceux du PC) ; aucun lien symbolique, 200 Mo au plus. Demandé mais rien de
//    rapporté, ou un fichier de 0 octet (jamais posé sur le PC) : 125 si la commande avait rendu 0 — une preuve absente ou
//    vide ne passe pas pour une preuve. Verdict non rendu (125) : rien n'est rapatrié.
const PANNE = 125
// Le lanceur de la commande sur l'usine (perl : présent sur toute Ubuntu, 5 Mo, démarre en quelques ms). Il est le seul à
// voir le vrai statut d'attente (waitpid) : « code N » (la commande est sortie d'elle-même) ou « signal N » (tuée) ; bash,
// lui, rend 128+N dans les deux cas. La marque est écrite puis renommée ; s'il est arrêté lui-même, il n'écrit rien.
const LANCEUR_PERL = [
  'my ($marque, $cmd) = @ARGV;',
  'my $pid = fork();',
  'exit 126 unless defined $pid;',
  'if ($pid == 0) { exec("bash", "-c", $cmd); exit 127 }',
  'exit 126 unless waitpid($pid, 0) == $pid;',
  'my $s = $?;',
  'my $t = ($s & 127) ? "signal " . ($s & 127) : "code " . ($s >> 8);',
  'if (open(my $f, ">", "$marque.tmp")) { print $f "$t\\n"; close($f); rename("$marque.tmp", $marque) }',
  'exit(($s & 127) ? 128 + ($s & 127) : ($s >> 8));',
].join(' ')
const NOM_BAC = /^[a-z0-9][a-z0-9_-]{0,31}$/
const ETATS_OUTILS = ['.orchestre/travail/usine/', '.orchestre/travail/executant/']
// Un chemin du dépôt, en « / », sous .orchestre/travail/<…> ou .orchestre/preuves/<id>/ ; null sinon. Refusés aussi : « .. »,
// absolu, lecteur, caractères interdits par Windows, élément qui finit par un point ou une espace (Windows les retire : usine./
// deviendrait usine/), et les états des outils quelle que soit la casse (le disque du PC l'ignore).
function cheminRapatriable(brut) {
  const c = String(brut || '').replace(/\\/g, '/')
  if (!c || c.startsWith('/') || /^[A-Za-z]:/.test(c) || c.split('/').includes('..')) return null
  const n = path.posix.normalize(c).replace(/\/+$/, '')
  if (n.split('/').some((s) => /[:*?"<>|\x00-\x1f]|[. ]$/.test(s))) return null
  if (/^\.orchestre\/travail\/[^/]/.test(n)) return ETATS_OUTILS.some((e) => `${n}/`.toLowerCase().startsWith(e)) ? null : n
  const m = n.match(/^\.orchestre\/preuves\/([^/]+)(?:\/|$)/)
  return m && ID_VALIDE.test(m[1]) ? n : null
}
// Le retour de --rapatrier : ~/bacs/.runs/<run>/ copié par scp dans un dossier temporaire du PC, puis chaque fichier recontrôlé
// (dans le chemin demandé, rapatriable, fichier ordinaire) avant d'être posé dans le dépôt. Le dossier de l'usine est retiré.
function rapatrierDepuisUsine(run, chemin) {
  const local = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-usine-retour-'))
  try {
    scp(['-r', `${HOTE}:bacs/.runs/${run}`, '.'], local)
    const base = path.join(local, run)
    let etat = 'aucun état écrit par l\'usine'
    try { etat = fs.readFileSync(path.join(base, 'rapatrier.etat'), 'utf8').trim() } catch { /* absent */ }
    if (etat !== 'ok') return { erreur: etat }
    const trouves = []
    const parcourir = (dossier, rel) => {
      for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name
        if (e.isDirectory()) parcourir(path.join(dossier, e.name), r)
        else trouves.push({ source: path.join(dossier, e.name), rel: r, ordinaire: e.isFile() })
      }
    }
    if (fs.existsSync(path.join(base, 'retour'))) parcourir(path.join(base, 'retour'), '')
    const fichiers = [] // { rel, octets }
    const ecartes = []
    const vides = []
    let octets = 0
    for (const t of trouves) {
      const dedans = t.rel === chemin || t.rel.startsWith(`${chemin}/`)
      const duPC = /^\.orchestre\/preuves\/[^/]+\/(avant\.txt|verifier\.log)$/i.test(t.rel)
      if (!t.ordinaire || !dedans || duPC || cheminRapatriable(t.rel) !== t.rel) { ecartes.push(t.rel); continue }
      // Un fichier de 0 octet n'est PAS posé sur le PC (il y écraserait peut-être une vraie preuve) : il est rendu à part, et
      // executer en fait un 125 « preuve vide » (attaque du 25/09/2026 : une capture.png vide rendait 0, « 1 Ko » au bilan).
      const n = fs.statSync(t.source).size
      if (!n) { vides.push(t.rel); continue }
      const dest = path.join(RACINE, ...t.rel.split('/'))
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(t.source, dest)
      const posee = fs.statSync(dest).size
      octets += posee
      fichiers.push({ rel: t.rel, octets: posee })
    }
    if (!fichiers.length && !vides.length) return { erreur: `aucun fichier écrit par la commande sous ${chemin}${ecartes.length ? ` (écartés : ${ecartes.join(', ')})` : ''}` }
    return { fichiers, ecartes, vides, octets }
  } catch (e) {
    return { erreur: String(e.message).split('\n')[0] }
  } finally {
    fs.rmSync(local, { recursive: true, force: true })
    distant(`rm -rf -- "$HOME/bacs/.runs/"${q(run)}`, { timeout: 60_000 })
  }
}
// Les sections du patch, dans l'ordre : chemin (lu dans « diff --git a/X b/X » quand il n'est pas entre guillemets), blob
// d'arrivée (ligne « index » : identifiant complet, `--binary` implique `--full-index`) et binaire ou non.
function sectionsDuPatch(patch) {
  const sections = []
  let s = null
  for (const l of patch.toString('utf8').split('\n')) {
    if (l.startsWith('diff --git ')) {
      const reste = l.slice(11)
      const n = (reste.length - 5) / 2
      const x = Number.isInteger(n) && n > 0 && reste.startsWith('a/') ? reste.slice(2, 2 + n) : null
      s = { chemin: x !== null && reste.slice(2 + n, 5 + n) === ' b/' && reste.slice(5 + n) === x ? x : null, nouveau: null, binaire: false, entete: true }
      sections.push(s)
      continue
    }
    if (!s?.entete) continue
    const m = l.match(/^index ([0-9a-f]{40,64})\.\.([0-9a-f]{40,64})/)
    if (m) s.nouveau = m[2]
    else if (l === 'GIT binary patch') { s.binaire = true; s.entete = false }
    else if (l.startsWith('@@') || l.startsWith('+++ ')) s.entete = false
  }
  return sections
}
// La barrière SUPPLÉMENTAIRE de `executer` (défaut 3 de l'attaque du 25/09/2026), appelée après controlerPaquet, jamais par
// `lancer` ni `paquet` : (1) les lignes ajoutées passées à MOTIFS_EXECUTER ; (2) toute archive, au nom ; (3) le contenu entier
// de chaque fichier binaire — le blob exact que le patch transporte (git cat-file) — passé aux mêmes motifs et aux signatures
// d'archive. Au moindre doute (blob illisible), refus. Jamais de valeur affichée : chemin, ligne, motif.
function controlerPaquetExecuter(p) {
  const problemes = []
  const trouves = trouverSecrets(p.patch.toString('utf8'), MOTIFS_EXECUTER)
  for (const n of p.noms) if (n.statut !== 'D' && ARCHIVE_EXT.test(n.chemin)) problemes.push(`${n.chemin} : archive compressée (${n.chemin.match(ARCHIVE_EXT)[0]}) : son contenu échapperait aux motifs`)
  let k = -1
  for (const s of sectionsDuPatch(p.patch)) {
    if (!s.binaire) continue
    k++
    const chemin = s.chemin || p.binaires[k] || '(binaire)'
    if (s.nouveau && /^0+$/.test(s.nouveau)) continue // supprimé
    let buf = null
    try { if (s.nouveau) buf = git(['cat-file', 'blob', s.nouveau], { binaire: true }) } catch { /* ci-dessous */ }
    if (!buf) { problemes.push(`${chemin} : contenu binaire introuvable dans le patch ou illisible : refusé par prudence`); continue }
    const sig = SIGNATURES_ARCHIVE.find((x) => x.t(buf))
    if (sig) problemes.push(`${chemin} : archive ${sig.nom}, reconnue à sa signature (quel que soit son nom)`)
    trouves.push(...secretsBinaires(buf, chemin, MOTIFS_EXECUTER))
  }
  for (const t of trouves.filter((x) => !x.ecarte)) problemes.push(`${t.chemin}:${t.ligne} : motif ${t.motif}`)
  return { problemes, ecartes: trouves.filter((x) => x.ecarte) }
}
// Ce qui ne part pas (défaut 4 de l'attaque du 25/09/2026 : les EXCLUS et les > 5 Mo manquaient en silence). Un fichier suivi
// que le PC a modifié ou supprimé garde dans le bac sa version du commit ; un non suivi y est absent. À l'écran, en entier : les
// suivis, les > 5 Mo, les .env*, les fichiers de clé, les liens symboliques ; les non suivis des dossiers exclus, par groupe
// (3 exemples, puis le compte). La liste entière (chemin, raison, effet) va dans un fichier ignoré par git, et à l'écran avec --liste.
function direCeQuiNePartPas(p, nom, tout) {
  const effet = (e) => (e.statut === 'A' ? 'absent du bac' : e.statut === 'D' ? 'supprimé sur le PC, encore dans le bac' : 'le bac garde la version du commit')
  const ligne = (e) => `${e.statut}  ${e.chemin}  (${e.raison}${e.octets ? `, ${ko(e.octets)}` : ''} ; ${effet(e)})`
  const fichier = path.join(TRAVAIL, `executer-${nom}.ne-part-pas.txt`)
  let ou
  try { fs.mkdirSync(TRAVAIL, { recursive: true }); fs.writeFileSync(fichier, p.exclus.map((e) => `${ligne(e)}\n`).join('')); ou = relatif(fichier) } catch (e) { ou = `non écrite : ${String(e.message).split('\n')[0]}` }
  if (!p.exclus.length) { console.error('  ne part pas : rien'); return }
  console.error(`  ne part pas (${p.exclus.length}) — le bac n'a PAS la version du PC de ces fichiers (liste entière : ${ou}) :`)
  const PRECIS = ['> 5 Mo', '.env*', 'fichier de clé', 'lien symbolique']
  const groupes = new Map()
  for (const e of p.exclus) {
    if (tout || e.statut !== 'A' || PRECIS.includes(e.raison)) { console.error(`    ${ligne(e)}`); continue }
    if (!groupes.has(e.raison)) groupes.set(e.raison, [])
    groupes.get(e.raison).push(e)
  }
  for (const [raison, g] of groupes) {
    for (const e of g.slice(0, 3)) console.error(`    ${ligne(e)}`)
    if (g.length > 3) console.error(`    … et ${g.length - 3} autre(s) non suivi(s), « ${raison} » : absents du bac`)
  }
}
// Relire sur l'usine la fin d'une commande dont la session ssh n'a pas rendu le repère de fin (ssh tué sur le PC, connexion
// coupée) : la fin est écrite par l'usine quand tout est arrêté ; on l'attend 90 s au plus. Rend { final, cause, brut, restes }
// ou { erreur }.
function relireFin(run, jeton) {
  const r = distant(`
f="$HOME/bacs/.runs/"${q(jeton)}".fin"
for i in $(seq 1 45); do if [ -s "$f" ]; then break; fi; sleep 2; done
if [ -s "$f" ]; then printf 'fin %s\\n' "$(cat "$f")"; else echo 'fin absente'; fi
printf 'restes %s\\n' "$(grep -lzx "USINE_EXECUTER_RUN="${q(run)} /proc/[0-9]*/environ 2>/dev/null | wc -l)"
`, { timeout: 150_000 })
  if (r.code !== 0) return { erreur: `usine injoignable pour relire la fin (${(r.erreurs.trim().split('\n').pop() || `ssh ${r.code}`).slice(0, 200)})` }
  const restes = Number((r.sortie.match(/^restes (\d+)$/m) || [])[1] || 0)
  const m = r.sortie.match(/^fin (\d+) (\S+) (\d+)$/m)
  if (!m) return { erreur: `aucune fin écrite sur l'usine en 90 s${restes ? ` ; ${restes} processus de la commande y tournent encore` : ''}`, restes }
  return { final: Number(m[1]), cause: m[2], brut: Number(m[3]), restes }
}
async function executerSurUsine() {
  const t0 = Date.now()
  const secondes = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`
  const panne = (msg) => { console.error(`✗ usine executer : ${msg}`); process.exit(PANNE) }
  // Les options vont AVANT « -- » : ce qui suit appartient à la commande (un --nom=… du juge n'est pas lu ici).
  const sep = args.indexOf('--')
  const commandeArgv = sep < 0 ? [] : args.slice(sep + 1)
  const o = {}
  for (const a of sep < 0 ? args.slice(1) : args.slice(1, sep)) {
    const m = a.match(/^--(nom|delai|attendre|id|rapatrier)=(.*)$/) || a.match(/^--(forcer|liste)$/)
    if (!m) { console.error(`✗ usine executer : option inconnue « ${a} » (les options vont avant « -- »)\n\n${USAGE}`); process.exit(PANNE) }
    o[m[1]] = m[2] ?? 'oui'
  }
  if (!commandeArgv.length) { console.error(`✗ usine executer : rien à exécuter — node scripts/usine.mjs executer [options] -- <commande et arguments>\n\n${USAGE}`); process.exit(PANNE) }
  const nom = o.nom ?? 'verif'
  if (!NOM_BAC.test(nom)) panne(`--nom=${nom} : minuscules, chiffres, « - » et « _ », 32 caractères au plus`)
  const delai = o.delai === undefined ? 30 : Number(o.delai)
  if (!(delai > 0 && delai <= 600)) panne(`--delai=${o.delai} : des minutes, plus de 0 et 600 au plus`)
  const attendre = o.attendre === undefined ? 30 : Number(o.attendre)
  if (!(attendre >= 0 && attendre <= 600)) panne(`--attendre=${o.attendre} : des minutes, de 0 (refus immédiat si le bac est pris) à 600`)
  const idFiche = o.id ?? ''
  if (idFiche && !ID_VALIDE.test(idFiche)) panne(`--id=${idFiche} : un identifiant de fiche NNN-slug (ex. 025-05)`)
  const rapatrier = o.rapatrier === undefined ? '' : cheminRapatriable(o.rapatrier)
  if (rapatrier === null) panne(`--rapatrier=${o.rapatrier} : seulement sous .orchestre/travail/<…> (hors usine/ et executant/) ou .orchestre/preuves/<id>/`)

  // 1. Le paquet de `lancer`, ses deux barrières, puis la barrière propre à executer (URL avec identifiants, noms sensibles en
  //    JSON/YAML/minuscules, archives).
  let p = null
  let problemes = []
  let supplement = { problemes: [], ecartes: [] }
  try { p = construirePaquet(idFiche); problemes = controlerPaquet(p); supplement = controlerPaquetExecuter(p) } catch (e) { panne(`construction du paquet : ${String(e.message).split('\n')[0]}`) }
  problemes.push(...supplement.problemes)
  const tPaquet = Date.now()
  const { lignes } = listePaquet(p)
  console.error(`· usine executer : paquet de ${p.noms.length} fichier(s), ${ko(p.patch.length)}, sur ${p.tete.slice(0, 8)} (HEAD du PC)${idFiche ? `, preuves de ${idFiche} comprises` : ''}, construit en ${secondes(tPaquet - t0)}`)
  if (o.liste) for (const l of lignes) console.error(`    ${l}`)
  direCeQuiNePartPas(p, nom, !!o.liste)
  const ecartes = [...p.secrets.filter((s) => s.ecarte), ...supplement.ecartes]
  for (const t of ecartes.slice(0, 15)) console.error(`  · écarté (valeur qui n'a pas la forme d'une clé, ou référence de code) : ${t.chemin}:${t.ligne}, motif ${t.motif}`)
  if (ecartes.length > 15) console.error(`  · … et ${ecartes.length - 15} autre(s) écarté(s)`)
  if (problemes.length) {
    console.error(`✗ usine executer : contrôle du paquet, ${problemes.length} problème(s) — rien n'est envoyé`)
    for (const x of problemes.slice(0, 30)) console.error(`    ${x}`)
    if (problemes.length > 30) console.error(`    … et ${problemes.length - 30} autre(s)`)
    process.exit(PANNE)
  }
  console.error(`  contrôle ✓ aucun .env*, aucun fichier de clé, aucun chemin ignoré par git, aucune archive, aucune clé ni URL avec identifiants dans les lignes ajoutées ni dans ${p.binaires.length} fichier(s) binaire(s) lus en entier (${MOTIFS.length} + ${MOTIFS_EXECUTER.length} motifs)`)
  if (p.noms.some((n) => n.chemin === 'package.json' || n.chemin === 'package-lock.json') && !o.forcer) panne('le paquet modifie package.json / package-lock.json : le node_modules de l\'usine ne suivrait pas (committe et pousse, puis preparer ; ou --forcer)')

  // 2 à 5. Une seule session ssh : script, puis le paquet (lu par head -c), puis l'entrée reste ouverte jusqu'à la fin.
  const run = crypto.randomBytes(8).toString('hex')
  // Le jeton nomme la fin (~/bacs/.runs/<jeton>.fin) et signe le repère de fin : ni exporté ni passé en argument, la commande
  // ne le voit pas (USINE_EXECUTER_RUN, lui, est dans son environnement).
  const jeton = crypto.randomBytes(12).toString('hex')
  const repere = Buffer.from(`@@usine-executer ${run} commande@@\n`)
  const repereFin = Buffer.from(`@@usine-executer ${jeton} fin `)
  const script = `
NOM=${q(nom)}; SHA=${q(p.tete)}; RUN=${q(run)}; JETON=${q(jeton)}; OCTETS=${p.patch.length}; EMPREINTE=${q(crypto.createHash('sha256').update(p.patch).digest('hex'))}
DELAI=${Math.max(1, Math.round(delai * 60))}; ATTENTE=${Math.round(attendre * 60)}; FORCER=${q(o.forcer ? 'oui' : 'non')}
CMD=${q(commandeArgv.map(q).join(' '))}; RAPATRIER=${q(rapatrier)}; REPERE=${q(repere.toString('utf8').trim())}; LANCEUR=${q(LANCEUR_PERL)}
principal() {
  # fd 3 : la vraie sortie standard, rendue à la commande seule ; fd 4 : l'entrée de ssh (sa fin = le PC est parti).
  exec 3>&1 1>&2 4<&0
  local B="$HOME/bacs/$NOM" V="$HOME/bacs/.verrous" R="$HOME/bacs/.runs/$RUN" F="$HOME/bacs/.runs/$JETON" t0 t1 qui
  [[ "$NOM" =~ ^[a-z0-9][a-z0-9_-]{0,31}$ ]] || { echo "✗ usine executer : nom de bac refusé : $NOM"; return 2; }
  [ -d "$HOME/presti/.git" ] || { echo "✗ usine executer : ~/presti absent sur l’usine (node scripts/usine.mjs preparer)"; return 3; }
  mkdir -p "$V" "$R"
  # Mise en place ratée (bac occupé, paquet refusé, git…) : le dossier du run ne reste pas 24 h (essai du 25/09 : un dossier
  # vide laissé par chaque refus, et la copie du paquet après un échec). Commande lancée (« debut » posé) : la fin de principal décide.
  trap "[ -e '$R/debut' ] || rm -rf -- '$R'" EXIT
  find "$HOME/bacs/.runs" -mindepth 1 -maxdepth 1 -mmin +1440 -exec rm -rf -- {} + 2>/dev/null || true
  exec 9>"$V/$NOM.lock"
  if ! flock -n 9; then
    qui=$(cat "$V/$NOM.qui" 2>/dev/null || echo '?')
    if [ "$ATTENTE" -eq 0 ]; then echo "✗ usine executer : bac $NOM occupé ($qui) : refusé (--attendre=0) ; --nom=<autre> pour un bac à part"; return 3; fi
    echo "· usine executer : bac $NOM occupé ($qui) : j’attends au plus $ATTENTE s"
    flock -w "$ATTENTE" 9 || { echo "✗ usine executer : bac $NOM encore occupé après $ATTENTE s : rien n’est lancé ; --nom=<autre> pour un bac à part"; return 3; }
    echo "· usine executer : bac $NOM libéré, je le prends"
  fi
  printf '%s · pid %s · %s\\n' "$(date -u +%FT%TZ)" "$$" "$CMD" > "$V/$NOM.qui"
  t0=$(date +%s%N) # le montage se compte une fois le bac pris : l'attente du verrou est dite à part
  head -c "$OCTETS" > "$R/paquet.patch"
  [ "$(stat -c %s "$R/paquet.patch")" = "$OCTETS" ] || { echo "✗ usine executer : paquet tronqué en route ($(stat -c %s "$R/paquet.patch") octets reçus sur $OCTETS)"; return 3; }
  [ "$(sha256sum "$R/paquet.patch" | cut -d' ' -f1)" = "$EMPREINTE" ] || { echo "✗ usine executer : le paquet reçu n’a pas l’empreinte du paquet envoyé"; return 3; }
  cd "$HOME/presti"
  git cat-file -e "$SHA^{commit}" 2>/dev/null || git fetch --quiet origin || true
  git cat-file -e "$SHA^{commit}" 2>/dev/null || { echo "✗ usine executer : le HEAD du PC ($SHA) est inconnu de GitHub : pousse d’abord"; return 3; }
  [ -f node_modules/.usine-lock ] || { echo "✗ usine executer : node_modules absent sur l’usine (node scripts/usine.mjs preparer)"; return 3; }
  # Le bac est recréé à chaque appel, jamais « remis » par reset --hard : worktree remove --force (s'il est inscrit), puis add.
  if git worktree list --porcelain | grep -qxF "worktree $B"; then git worktree remove --force "$B" 2>/dev/null || true; fi
  if [ -e "$B" ]; then rm -rf -- "$B"; fi
  git worktree add --force --detach --quiet "$B" "$SHA"
  cd "$B"
  if [ -s "$R/paquet.patch" ]; then git apply --whitespace=nowarn "$R/paquet.patch"; fi
  rm -f "$R/paquet.patch"
  cp -al "$HOME/presti/node_modules" node_modules
  if [ "$(cat node_modules/.usine-lock)" != "$(sha256sum package-lock.json | cut -d' ' -f1)" ]; then
    [ "$FORCER" = oui ] || { echo "✗ usine executer : le node_modules de l’usine date d’un autre package-lock.json (node scripts/usine.mjs preparer ; --forcer pour passer outre)"; return 3; }
    echo "· usine executer : ⚠ node_modules d’un autre package-lock.json (--forcer)"
  fi
  t1=$(date +%s%N)
  echo "· usine executer : bac $NOM monté en $(( (t1 - t0) / 1000000 )) ms : $(git rev-parse --short HEAD) + paquet, $(git status --porcelain --untracked-files=all | wc -l) écart(s) ; délai $DELAI s"
  : > "$R/debut"
  printf '%s\\n' "$REPERE"
  set +e
  # ssh coupé : le message du shell sur la commande tuée (« Terminated ») part dans un tube mort, et SIGPIPE tuait l'enveloppe
  # avant son ménage (essai du 25/09 : ni code écrit, ni dossier du run retiré). Un gestionnaire, pas un « ignorer » : il n'est
  # pas hérité à l'exec, la commande garde le SIGPIPE ordinaire.
  trap ':' PIPE HUP
  local code duree debut restes etatR taille veille marque cause final
  # La veille : fin de l'entrée de ssh (PC parti, ssh tué, connexion coupée) → elle écrit D'ABORD sa marque ($F.veille), puis
  # arrête tout ce qui porte USINE_EXECUTER_RUN=<run> (TERM, puis KILL). Sa marque suffit à refuser le code : une commande
  # arrêtée qui sort 0 sur TERM n'a rendu aucun verdict (attaque r5 du 25/09/2026 : le PC relisait ce 0 et rendait 0).
  ( while IFS= read -r -n 1 _; do :; done
    date -u +%FT%TZ > "$F.veille"
    for s in TERM KILL; do
      for f in $(grep -lzx "USINE_EXECUTER_RUN=$RUN" /proc/[0-9]*/environ 2>/dev/null); do kill -$s "$(basename "$(dirname "$f")")" 2>/dev/null; done
      sleep 5
    done ) <&4 >/dev/null 2>&1 3>&- 4<&- 9>&- &
  veille=$!
  debut=$(date +%s)
  # Au premier plan (un « & » ferait ignorer SIGINT à la commande) ; ni le verrou (9) ni l'entrée de ssh (4) ne lui sont transmis.
  # Le lanceur perl (fork, exec bash -c, waitpid) écrit dans $R/marque « code N » ou « signal N » quand la commande s'est
  # terminée — jamais s'il est arrêté lui-même (veille, délai) : pas de marque, pas de fin d'elle-même.
  USINE_EXECUTER_RUN="$RUN" USINE_BAC="$NOM" timeout -k 20 "$DELAI" perl -e "$LANCEUR" "$R/marque" "$CMD" </dev/null >&3 3>&- 4<&- 9>&-
  code=$?
  duree=$(( $(date +%s) - debut ))
  kill "$veille" 2>/dev/null; wait "$veille" 2>/dev/null
  marque=$(cat "$R/marque" 2>/dev/null)
  # La cause, dans cet ordre : la veille a parlé → 125 ; délai (timeout rend 124, ou 137 si la commande a résisté au TERM) → 124 ;
  # le lanceur a vu la commande sortir d'elle-même avec ce code → ce code ; tuée par un signal → 125 ; rien de sûr → 125.
  if [ -e "$F.veille" ]; then cause=veille; final=125
  elif [ -z "$marque" ] && { [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; } && [ "$duree" -ge $(( DELAI - 1 )) ]; then cause=delai; final=124
  elif [ "$marque" = "code $code" ]; then cause=seule; final=$code
  elif [[ "$marque" =~ ^signal\\ ([0-9]+)$ ]]; then cause="signal-$(kill -l "\${BASH_REMATCH[1]}" 2>/dev/null || echo "\${BASH_REMATCH[1]}")"; final=125
  else cause=sans-marque; final=125; fi
  echo "· usine executer : commande finie en $duree s sur l’usine, code $code ($cause)"
  restes=$(grep -lzx "USINE_EXECUTER_RUN=$RUN" /proc/[0-9]*/environ 2>/dev/null | cut -d/ -f3 | tr '\\n' ' ')
  if [ -n "$restes" ]; then
    kill -TERM $restes 2>/dev/null; sleep 2; kill -KILL $restes 2>/dev/null
    echo "· usine executer : ⚠ processus laissés par la commande, arrêtés : $restes"
  fi
  if [ -n "$RAPATRIER" ]; then
    etatR=""
    if [ ! -e "$B/$RAPATRIER" ] && [ ! -L "$B/$RAPATRIER" ]; then etatR="$RAPATRIER absent du bac"
    else
      case "$(readlink -f -- "$B/$RAPATRIER")/" in "$(readlink -f -- "$B")/"*) ;; *) etatR="$RAPATRIER sort du bac (lien symbolique)";; esac
      if [ -z "$etatR" ] && [ -n "$(find "$B/$RAPATRIER" -type l -print -quit)" ]; then etatR="lien symbolique sous $RAPATRIER : rien n’est rapatrié"; fi
      if [ -z "$etatR" ]; then
        (cd "$B" && find "$RAPATRIER" -type f -newer "$R/debut" -print0) > "$R/liste"
        taille=$(cd "$B" && xargs -0 -r stat -c %s < "$R/liste" | awk '{ s += $1 } END { print s + 0 }')
        if [ "$taille" -gt 209715200 ]; then etatR="trop gros : $taille octets, 200 Mo au plus"
        elif mkdir -p "$R/retour" && (cd "$B" && xargs -0 -r cp --parents -p -t "$R/retour" < "$R/liste"); then etatR=ok
        else etatR="copie impossible dans $R/retour"; fi
      fi
    fi
    printf '%s\\n' "$etatR" > "$R/rapatrier.etat"
  fi
  # La fin (code rendu, cause, code brut) : écrite en entier puis renommée, relue par le PC s'il n'a pas eu le repère de fin.
  printf '%s %s %s\\n' "$final" "$cause" "$code" > "$F.fin.tmp" && mv -f "$F.fin.tmp" "$F.fin"
  rm -f "$F.veille"
  if [ -z "$RAPATRIER" ]; then rm -rf -- "$R"; fi
  printf '@@usine-executer %s fin %s %s %s@@\\n' "$JETON" "$final" "$cause" "$code"
  exec 9>&-
  return "$final"
}
principal; exit $?
`
  console.error(`· usine executer : bac ${nom} sur ${HOTE}, délai ${delai} min : ${commandeArgv.join(' ')}`)
  const fin = await new Promise((resoudre) => {
    const enfant = spawn('ssh', [...SSH, HOTE, 'bash -s'], { stdio: ['pipe', 'inherit', 'pipe'], windowsHide: true })
    const r = { code: null, lance: 0, coupe: false, issue: null }
    let tampon = Buffer.alloc(0)
    let minuteur = null
    const veiller = (ms) => { clearTimeout(minuteur); minuteur = setTimeout(() => { r.coupe = true; enfant.kill() }, ms) }
    veiller((attendre + 10) * 60_000) // mise en place et attente du bac
    // Après le lancement : tout est relayé au fil de l'eau, sauf le repère de fin (avalé, il porte le code rendu et sa cause).
    // On ne retient que la queue qui pourrait être le début de ce repère.
    const debutDuRepereFin = (b) => { for (let k = Math.min(b.length, repereFin.length - 1); k > 0; k--) if (b.subarray(b.length - k).equals(repereFin.subarray(0, k))) return k; return 0 }
    const apresLancement = () => {
      for (;;) {
        const i = tampon.indexOf(repereFin)
        if (i < 0) { const k = debutDuRepereFin(tampon); if (tampon.length > k) process.stderr.write(tampon.subarray(0, tampon.length - k)); tampon = tampon.subarray(tampon.length - k); return }
        if (i > 0) { process.stderr.write(tampon.subarray(0, i)); tampon = tampon.subarray(i) }
        const j = tampon.indexOf(0x0a)
        if (j < 0) return // la suite du repère arrive
        const m = tampon.subarray(repereFin.length, j).toString('utf8').match(/^(\d+) (\S+) (\d+)@@$/)
        if (m) r.issue = { final: Number(m[1]), cause: m[2], brut: Number(m[3]) }
        tampon = tampon.subarray(j + 1)
      }
    }
    enfant.stderr.on('data', (morceau) => {
      tampon = Buffer.concat([tampon, morceau])
      if (r.lance) { apresLancement(); return }
      const i = tampon.indexOf(repere)
      if (i >= 0) {
        if (i > 0) process.stderr.write(tampon.subarray(0, i))
        tampon = tampon.subarray(i + repere.length)
        r.lance = Date.now()
        veiller((delai * 60 + 180) * 1000) // la commande : son délai, plus de quoi laisser timeout finir son travail
        apresLancement()
        return
      }
      const nl = tampon.lastIndexOf(0x0a)
      if (nl >= 0) { process.stderr.write(tampon.subarray(0, nl + 1)); tampon = tampon.subarray(nl + 1) }
    })
    enfant.stdin.on('error', () => { /* ssh fini avant d'avoir tout lu : son code dit pourquoi */ })
    enfant.on('error', (e) => { clearTimeout(minuteur); console.error(`  ssh : ${e.message}`); resoudre({ ...r, code: 255 }) })
    enfant.on('close', (code) => { clearTimeout(minuteur); if (tampon.length) process.stderr.write(tampon); resoudre({ ...r, code }) })
    // Le script finit par « principal; exit $?\n » et le paquet suit AUSSITÔT : un octet de plus entre les deux serait lu par
    // head -c comme le premier octet du paquet (empreinte fausse, vu à l'essai). L'entrée reste ouverte : sur l'usine, sa fin
    // veut dire « le PC est parti » et arrête la commande.
    enfant.stdin.write(Buffer.concat([Buffer.from(`${PREAMBULE}${script}`, 'utf8'), p.patch]))
  })
  const tFin = Date.now()
  if (!fin.lance) {
    if (fin.coupe) panne(`pas de réponse de l'usine en ${attendre + 10} min (attente du bac ou mise en place) : ssh coupé, rien n'a été lancé`)
    if (fin.code === 255) panne(`usine injoignable (${HOTE}) ou session coupée avant le lancement : rien n'a été lancé. L'IP est éphémère : si l'instance a été recréée, PRESTI_USINE=usine@<nouvelle ip>`)
    panne(`bac ${nom} non monté (code ${fin.code} sur l'usine) : rien n'a été lancé`)
  }
  // Le code rendu. Il ne vient QUE de l'usine, qui sait si la commande a fini d'elle-même : par le repère de fin (signé du
  // jeton), sinon par la fin relue sur l'usine. Le code de sortie de ssh.exe ne compte plus : ssh tué sous Windows rend 1,
  // comme un vrai FAIL (attaque du 25/09/2026, r6).
  let code
  let issue = fin.issue
  if (fin.coupe) {
    console.error(`✗ usine executer : l'usine n'a pas rendu la main ${delai} min + 3 min après le lancement : ssh coupé, la commande est arrêtée là-bas (code 124)`)
    code = 124
  } else {
    if (!issue) {
      console.error(`✗ usine executer : la session ssh s'est terminée sans le repère de fin (${fin.code === null ? 'ssh tué' : `ssh a rendu ${fin.code}`}) : je relis sur l'usine ce qu'est devenue la commande (90 s au plus)`)
      issue = relireFin(run, jeton)
      if (!issue.erreur) console.error(`· usine executer : fin relue sur l'usine : code ${issue.brut}, cause « ${issue.cause} »${issue.restes ? ` ; ⚠ ${issue.restes} processus de la commande y tournent encore` : ' ; plus rien de la commande ne tourne'}`)
    }
    const secDelai = Math.max(1, Math.round(delai * 60))
    if (issue.erreur) { console.error(`✗ usine executer : verdict non rendu : connexion perdue pendant la commande, ${issue.erreur} : code inconnu → ${PANNE}`); code = PANNE }
    else {
      code = issue.final
      if (issue.cause === 'delai') console.error(`✗ usine executer : délai de ${secDelai} s dépassé, commande arrêtée (code 124)`)
      else if (issue.cause === 'veille') console.error(`✗ usine executer : verdict non rendu : la session ssh s'est coupée pendant la commande et la veille de l'usine l'a arrêtée ; son code (${issue.brut}) ne compte pas → ${PANNE}`)
      else if (issue.cause.startsWith('signal-')) console.error(`✗ usine executer : verdict non rendu : la commande a été tuée par le signal SIG${issue.cause.slice(7)} (mémoire saturée ? arrêt venu d'ailleurs ?) → ${PANNE}`)
      else if (issue.cause !== 'seule') console.error(`✗ usine executer : verdict non rendu : la commande n'a pas fini d'elle-même (aucune marque de fin de son lanceur, code brut ${issue.brut}) → ${PANNE}`)
      else if (code > 128 && code < 160) console.error(`· usine executer : code ${code} = 128 + ${code - 128} : un sous-processus de la commande a peut-être été tué par un signal (la commande, elle, est sortie d'elle-même)`)
    }
  }
  let tRapatrier = 0
  if (rapatrier && code === PANNE && issue?.cause !== 'seule') {
    // Verdict non rendu : rien n'est posé sur le PC ; le dossier du run est retiré de l'usine.
    distant(`rm -rf -- "$HOME/bacs/.runs/"${q(run)}`, { timeout: 60_000 })
    console.error(`· usine executer : --rapatrier=${rapatrier} : rien n'est rapatrié (verdict non rendu)`)
  } else if (rapatrier) {
    const t = Date.now()
    const ret = rapatrierDepuisUsine(run, rapatrier)
    tRapatrier = Date.now() - t
    if (ret.erreur) {
      console.error(`✗ usine executer : --rapatrier=${rapatrier} : ${ret.erreur}`)
      if (code === 0) code = PANNE
    } else {
      console.error(`· usine executer : rapatrié ${ret.fichiers.length} fichier(s), ${ret.octets} octets${ret.octets >= 1024 ? ` (${ko(ret.octets)})` : ''}, sous ${rapatrier}${ret.ecartes.length ? ` ; écartés : ${ret.ecartes.join(', ')}` : ''}`)
      for (const f of ret.fichiers.slice(0, 20)) console.error(`    ${f.rel}  ${f.octets} octets`)
      if (ret.fichiers.length > 20) console.error(`    … et ${ret.fichiers.length - 20} autre(s)`)
      if (ret.vides.length) {
        console.error(`✗ usine executer : --rapatrier=${rapatrier} : preuve vide : ${ret.vides.length} fichier(s) de 0 octet, NON posé(s) sur le PC : ${ret.vides.slice(0, 10).join(', ')}${ret.vides.length > 10 ? ' …' : ''} — une preuve vide ne passe pas pour une preuve`)
        if (code === 0) code = PANNE
      }
    }
  }
  const duree = `paquet ${secondes(tPaquet - t0)} · envoi et bac ${secondes(fin.lance - tPaquet)} · commande ${secondes(tFin - fin.lance)}${rapatrier ? ` · rapatriement ${secondes(tRapatrier)}` : ''} · total ${secondes(Date.now() - t0)}`
  process.stderr.write(`· usine executer : code ${code} · ${duree}\n`, () => process.exit(code))
}

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────────────
const USAGE = fs.readFileSync(CE_FICHIER, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(7, 18).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')
const id = positionnels[0]
const exigeId = ['paquet', 'lancer', 'recuperer', 'nettoyer']
if (exigeId.includes(commande) && !(id && ID_VALIDE.test(id))) { console.error(`${commande} <id> : un identifiant de fiche NNN-slug (ex. 025-05)\n\n${USAGE}`); process.exit(2) }
switch (commande) {
  case 'etat': etat(); break
  case 'preparer': await preparer(); break
  case 'paquet': { const r = paquetControle(id); process.exit(r.problemes.length ? 1 : 0) }
  case 'lancer': await lancer(id); break
  case 'recuperer': await recuperer(id); break
  case 'nettoyer': nettoyer(id); break
  case 'tourner': await tourner(path.resolve(positionnels[0] || '.')); break
  case 'executer': await executerSurUsine(); break
  default: console.log(USAGE); process.exit(commande ? 2 : 0)
}
