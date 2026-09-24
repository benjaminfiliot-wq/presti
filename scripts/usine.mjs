// scripts/usine.mjs — le pont entre l'orchestre (PC de Benj : 8 Go de RAM, saturé) et l'usine (serveur Oracle Always Free :
// 2 OCPU, 12 Go, allumé 24 h/24). Codex y traite une fiche de .orchestre/file/ à la place du PC, avec le MÊME contrat de tâche
// que scripts/antigravity.mjs (le prompt en est importé : une seule source) et la même boucle que scripts/executant.mjs (Codex
// écrit, le vérificateur tourne hors bac à sable, Codex est relancé avec les lignes FAIL). Le PC reste le seul à committer :
// l'usine clone en lecture seule (git push y est refusé, c'est voulu), travaille dans un worktree jetable et rend un patch ;
// le PC l'applique, passe la fiche en fait/ et relance `verifier` — le verdict officiel est celui du PC.
//
// Usage :
//   node scripts/usine.mjs etat                      → joignable ?, charge et mémoire, codex connecté ?, tâches sur l'usine
//   node scripts/usine.mjs preparer [--forcer]       → une fois (idempotent) : git fetch + npm ci dans ~/presti, navigateurs Playwright
//   node scripts/usine.mjs paquet <id>               → construit et contrôle le paquet sans rien prendre ni envoyer (essai à sec)
//   node scripts/usine.mjs lancer <id> [--model=gpt-6-sol] [--boucle=3] [--effort=medium] [--minutes=40]
//   node scripts/usine.mjs recuperer <id> [--attendre[=60]] [--forcer]   → rapatrie, applique, fiche en fait/, verdict du PC
//   node scripts/usine.mjs nettoyer <id> [--forcer]  → retire le worktree et le dossier de la tâche sur l'usine
// Codes : 0 ok (PASS) ; 1 FAIL ou refus ; 2 usage ; 3 usine pas prête ; 4 tâche encore en cours ; 5 usine injoignable.
//
// Le paquet (PC → usine) est construit à partir de git, jamais en parcourant le disque : les fichiers suivis modifiés depuis
// HEAD (git diff) et les non suivis NON ignorés (git ls-files --others --exclude-standard), filtrés (EXCLUS, preuves des
// autres tâches, .env*, fichiers de clé, > 5 Mo), puis figés par un index temporaire (la technique de l'instantané
// d'antigravity.mjs : ni l'index réel ni l'arbre de travail ne bougent). Avant l'envoi, la liste est imprimée et contrôlée
// par une seconde barrière indépendante : aucun .env*, aucun fichier de clé, aucun chemin ignoré (git check-ignore), aucune
// clé (MOTIFS) dans les lignes ajoutées ni dans le contenu entier des fichiers binaires → refus si un seul est trouvé.
// .env.local et les fichiers ignorés ne sont jamais ouverts.
// Sur l'usine (~/taches/<id>/) : worktree jetable `arbre` sur origin/main (= HEAD du PC, sinon « pousse d'abord »), paquet
// appliqué, node_modules = lien vers ~/presti/node_modules, commit local « base » (commit-tree : jamais poussé, aucun
// crochet), puis `node usine.mjs tourner` détaché de la session ssh (setsid) : journal codex.log, code de fin dans `code`.
// Le retour (usine → PC) : diff binaire depuis « base » limité au `perimetre` de la fiche et à .orchestre/preuves/<id>/ ;
// ce qui a bougé ailleurs est signalé et EXCLU. Journaux rapatriés dans .orchestre/travail/usine/<id>/ (ignoré par git).
// Le PC ne garde que ce que SON verdict juge PASS : rouge, le patch est retiré (git apply -R) ; le verdict est enregistré
// (verdict-pc.json) AVANT la marque `recupere` de l'usine, et un second `recuperer` le redit avec son code.
// Doc : C:/Users/benja/Documents/presti-ops/usine/LISEZMOI.md, section « Exécuter une fiche sur l'usine ».
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
for (const m of MOTIFS) m.tous = new RegExp(m.re.source, `${m.re.flags}g`) // toutes les occurrences d'une ligne, pas la première
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
function examiner(contenu, chemin, ligne, trouves) {
  for (const m of MOTIFS) {
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
function trouverSecrets(texte) {
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
    if (l.startsWith('+')) { ligne++; examiner(l.slice(1), chemin, ligne, trouves) }
    else if (l.startsWith(' ')) ligne++
  }
  return trouves
}
// Le contenu entier d'un fichier binaire, lu octet pour octet (latin1), coupé aux fins de ligne et aux octets NUL ; puis
// une seconde fois sans les NUL, pour l'UTF-16 (une lettre, un NUL). Une trouvaille par motif et par fichier.
function secretsBinaires(buf, chemin) {
  const brut = buf.toString('latin1')
  const trouves = []
  for (const texte of [brut, brut.replace(/\0/g, '')]) for (const morceau of texte.split(/[\r\n\0]+/)) if (morceau) examiner(morceau, chemin, 'binaire', trouves)
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
- node_modules est partagé et déjà installé : ne lance ni npm install ni npm ci. Tu peux lancer node, npx, Playwright et \`node scripts/orchestre.mjs verifier ${id}\` autant que nécessaire.
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
echo "· Playwright $v (version du dépôt) : navigateurs"
npx --no-install playwright install chromium
node -e "const { chromium } = require('playwright'); chromium.launch().then(async (b) => { const p = await b.newPage(); await p.setContent('<title>ok</title>'); console.log('· Chromium démarre : ' + (await p.title()) + ' (' + b.version() + ')'); await b.close() }).catch((e) => { console.error('✗ Chromium ne démarre pas : ' + e.message); process.exit(1) })"
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
ln -s "$HOME/presti/node_modules" node_modules
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

// ── entrée ────────────────────────────────────────────────────────────────────────────────────────────────
const USAGE = fs.readFileSync(CE_FICHIER, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(7, 15).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')
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
  default: console.log(USAGE); process.exit(commande ? 2 : 0)
}
