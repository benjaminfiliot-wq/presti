#!/usr/bin/env node
// scripts/instantane-quotidien-qa.mjs — juge de la sauvegarde quotidienne du code (fiche 026-002, pour 026-005 et 026-007),
// écrit par Claude Code AVANT le script qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/instantane-quotidien-qa.mjs [--racine=<dossier>]
//   node scripts/instantane-quotidien-qa.mjs --autotest   le juge sur un témoin (vert), puis un défaut planté par critère
//   node scripts/instantane-quotidien-qa.mjs --reel       Claude Code, fiche 026-007 : le vrai dépôt, la vraie tâche Windows
//
// Tout se joue dans un bac à sable que le juge crée, puis supprime lui-même, sous <racine>/.orchestre/travail/instantane-qa/ :
// un dépôt de travail (deux commits, un fichier suivi modifié, deux non suivis, un .exe, un .env.local ignoré, un fichier
// qui porte un faux secret Stripe assemblé à l'exécution, un fichier qui porte l'adresse d'un faux prospect, un fichier
// creux de 91 Mo), un faux vault (Prospection/deja-contactes-email.txt) et un dépôt nu, qui est TOUJOURS un chemin local.
// Le script est lancé quatre fois : --pousser, --pousser (même jour), --sans-pousser, puis --pousser vers un dépôt absent,
// avec GIT_ALLOW_PROTOCOL=file (aucun envoi réseau possible) et un plafond GIT_CEILING_DIRECTORIES (git ne remonte pas
// jusqu'à presti).
//
// Puis quatre bacs neufs de plus (même fabrique, avec en plus un fichier indexé non commité), un passage --pousser chacun,
// PENDANT lequel un écrivain concurrent tenu par le juge écrit dans le dépôt (IQ-13, IQ-14).
//
// Sortie : « bac à sable : … », « dépôt nu : … », puis une ligne par critère, « PASS IQ-n — … » ou « FAIL IQ-n — … », dans
// l'ordre IQ-1 … IQ-14, puis le bilan « instantane-quotidien-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ;
// 1 sinon ; 2 si l'appel est invalide. Un script absent fait échouer IQ-1 ; les autres critères du script (tous sauf
// IQ-12) sont alors « non jugés » (en échec).
//
//   IQ-1   scripts/instantane-quotidien.mjs existe et le premier passage sort en code 4 (poussé, avec des exclusions).
//   IQ-2   (objets git) le dépôt nu porte refs/heads/instantane-<AAAA-MM-JJ> à la date de Paris ; son commit a pour seul
//          parent le HEAD du dépôt de travail ; son arbre contient le fichier modifié (avec son contenu modifié) et les deux
//          non suivis, et ni le .exe, ni .env.local.
//   IQ-3   dans le dépôt de travail, rien n'a bougé après les quatre passages : HEAD, sa branche, git status --porcelain,
//          l'empreinte SHA-256 de .git/index et celle de chaque fichier de l'arbre (hors .orchestre/travail/) ; aucune
//          référence créée ou déplacée, sauf des refs/instantanes/quotidien-* ajoutées.
//   IQ-4   le fichier au faux secret est absent de l'arbre poussé, et git grep n'y trouve pas la valeur ; le journal le
//          donne dans exclus avec son chemin et le motif « stripe » ; la valeur n'apparaît ni dans la sortie des quatre
//          passages ni dans le journal.
//   IQ-5   même chose pour le fichier qui porte l'adresse du prospect (motif « prospect »).
//   IQ-6   le fichier de 91 Mo est absent de l'arbre poussé, donné dans exclus (motif « taille ») et nommé dans la sortie.
//   IQ-7   le second passage du même jour crée refs/heads/instantane-<date>-<HHMM> sans toucher la première branche, et le
//          dépôt nu ne porte que des branches instantane-* ; le texte brut du script (commentaires compris) ne contient ni
//          --force, ni -f après push, ni --mirror, ni --all, ni --tags, ni +refs.
//   IQ-8   vers un dépôt introuvable : code 1, la ligne du journal porte ok: false, une référence locale
//          refs/instantanes/quotidien-* est gardée, et la dernière ligne de la sortie commence par « ALERTE BENJ : ».
//   IQ-9   <bac>/.orchestre/travail/sauvegardes.jsonl gagne exactement une ligne JSON par passage, chacune avec date, commit
//          (40 signes hexadécimaux), branche, fichiers, octets, exclus: [{chemin, motif}] et ok (booléen) ; la ligne du
//          premier passage porte ok: true, la branche instantane-<date> et le commit du dépôt nu.
//   IQ-10  avec --sans-pousser, le dépôt nu ne reçoit rien.
//   IQ-11  importer le script n'exécute rien (aucune sortie, aucun fichier écrit, aucune ligne de journal) ; il exporte
//          chercherSecrets(texte) et MOTIFS_SECRETS (tableau de { nom, re }) ; chercherSecrets rend le nom du motif de
//          chacun des faux secrets (stripe ×3, stripe_webhook, anthropic, resend, supabase_service, cle_privee ×2, google,
//          github ×2), jamais leur valeur, et un tableau vide sur des textes propres (dont un JWT « anon »).
//   IQ-12  docs/sauvegardes.md a une section « Le code et l'arbre de travail » avec `git fetch <dépôt> instantane-…` et
//          `git show <commit>:<chemin>`.
//   IQ-13  (réparation du 27/09 : le moteur commitait pendant l'envoi réel, le script rendait le code 1 alors que l'envoi
//          avait abouti) PENDANT le passage, un écrivain concurrent écrit des fichiers, indexe (.git/index réel), commite
//          sur la branche courante et crée des non suivis, en boucle jusqu'à la sortie du script. Le script doit finir
//          en code 4 (ok: true, une ligne de journal), avoir poussé un commit dont le seul parent est un HEAD du passage
//          (celui du départ ou un commit de l'écrivain), et laisser vide son dossier temporaire (TEMP/TMP pointés dans le
//          bac : l'index temporaire est retiré). Le juge prouve que le script n'a rien touché : il mesure .git/index et
//          les références juste après chaque opération de l'écrivain et juste avant la suivante (un écart entre les deux
//          est une écriture étrangère), puis exige l'état exact que l'écrivain seul produit : l'index entrée par entrée,
//          l'historique de la branche fait de ses seuls commits (avec leurs seuls fichiers), les fichiers de l'arbre, et
//          aucune autre référence que des refs/instantanes/quotidien-* ajoutées. Au moins 3 opérations et 1 commit de
//          l'écrivain pendant le passage, sinon le scénario n'est pas prouvé.
//   IQ-14  trois sabotages du script, sous le même écrivain concurrent, injectés par une précharge (node --import) qui
//          enrobe execFileSync et spawnSync du script : « index » rejoue le git add du script sans GIT_INDEX_FILE (le
//          script écrit lui-même dans .git/index) ; « branche » ajoute un update-ref refs/heads/main vers l'instantané
//          (le script déplace une branche) ; « etiquette » ajoute un git tag vers HEAD (le script crée une référence
//          hors de refs/instantanes/ dont git ne tient AUCUN reflog, et qui ne pointe pas sur l'instantané : ni la
//          signature des reflogs ni --points-at ne la voient). Pour chacun : le sabotage s'est déclenché, le juge voit
//          l'écriture (index, resp. références) malgré l'écrivain, et le script sort en code 1, ok: false, « ALERTE
//          BENJ : » en dernière ligne. Un script sans invariant passe IQ-13 et échoue ici.
//
// --reel (IQ-R1 … IQ-R5, fiche 026-007, sans bac à sable) : le dépôt privé benjaminfiliot-wq/presti-sauvegarde porte la
// branche du jour, c'est le commit de la dernière ligne ok: true du journal et son parent était le HEAD local ; l'API GitHub
// sans authentification répond 404 ; la tâche Windows « Presti instantane quotidien » est quotidienne ET à l'ouverture de
// session, StartWhenAvailable, 30 min au plus, et lance node … scripts\instantane-quotidien.mjs --pousser ; la dernière
// ligne ok: true a moins de 36 h.
//
// Écritures : seulement sous <racine>/.orchestre/travail/instantane-qa/ (le bac à sable, supprimé à la fin ; le rapport
// dernier.log, refusé s'il fait 0 octet) et, pour --autotest, sous .orchestre/travail/instantane-quotidien-qa/.
// Aucun secret littéral dans ce fichier : les faux secrets sont assemblés à l'exécution.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const JUGE = 'instantane-quotidien-qa'
// Un lecteur qui ferme le tube (… | head) ne doit pas tuer le juge avant son ménage.
process.stdout.on('error', () => {}); process.stderr.on('error', () => {})
const BAC = 'instantane-qa'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const CRITERES = ['IQ-1', 'IQ-2', 'IQ-3', 'IQ-4', 'IQ-5', 'IQ-6', 'IQ-7', 'IQ-8', 'IQ-9', 'IQ-10', 'IQ-11', 'IQ-12', 'IQ-13', 'IQ-14']
const DU_SCRIPT = CRITERES.filter((id) => id !== 'IQ-12')
const GROS = 91 * 1024 * 1024
const DEPOT_SAUVEGARDE = 'https://github.com/benjaminfiliot-wq/presti-sauvegarde.git'
const TACHE = 'Presti instantane quotidien'

function refuser(m) { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
function lireOptions(argv) {
  const o = { racine: DEPOT, autotest: false, reel: false }
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a)
    if (!m) refuser(`argument inconnu : ${a}`)
    if (m[1] === 'racine' && m[2]) o.racine = path.resolve(m[2])
    else if (m[1] === 'autotest' && m[2] === undefined) o.autotest = true
    else if (m[1] === 'reel' && m[2] === undefined) o.reel = true
    else refuser(`option inconnue ou sans valeur : ${a}`)
  }
  if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
  return o
}

// ── petites mains ────────────────────────────────────────────────────────────────────────────────────────────────────
const lireOuNull = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } }
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const versSlash = (p) => String(p).split(path.sep).join('/')
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const derniereLigne = (s) => String(s ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).at(-1) || ''
const lireJson = (l) => { try { return JSON.parse(l) } catch { return null } }
/** L'identifiant git (SHA-1) d'un blob, calculé ici sans git. */
const blob = (texte) => { const b = Buffer.from(texte, 'utf8'); return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])).digest('hex') }
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const alea = (n, jeu = ALNUM) => Array.from(crypto.randomBytes(n), (b) => jeu[b % jeu.length]).join('')
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function paris(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}
/** git sans verrou optionnel (jamais de réécriture opportuniste de l'index), sortie texte ou null si le code ≠ 0. */
function git(dossier, args, { env = {}, brut = false } = {}) {
  const r = spawnSync('git', ['-C', dossier, '-c', 'core.quotepath=false', ...args], { encoding: brut ? 'buffer' : 'utf8', maxBuffer: 1 << 28, windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0', ...env } })
  if (r.status !== 0) return null
  return brut ? r.stdout : r.stdout.replace(/\s+$/, '')
}
function gitOk(dossier, args, env = {}) {
  const r = spawnSync('git', ['-C', dossier, ...args], { encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env } })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${court(r.stderr || r.stdout, 200)}`)
  return r.stdout.trim()
}
function lancer(cmd, args, options = {}) {
  return new Promise((resoudre) => {
    const debut = Date.now()
    const enfant = spawn(cmd, args, { windowsHide: true, cwd: options.cwd, env: { ...process.env, FORCE_COLOR: '0', ...(options.env || {}) } })
    if (options.surEnfant) options.surEnfant(enfant)
    let sortie = '', expire = false
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { sortie += d })
    enfant.stderr.on('data', (d) => { sortie += d })
    const minuterie = setTimeout(() => {
      expire = true
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' })
      else enfant.kill('SIGKILL')
    }, options.delaiMs ?? 180_000)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 1), sortie, expire, duree: (Date.now() - debut) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, expire, duree: (Date.now() - debut) / 1000 }) })
  })
}
function supprimerSous(dir, borne) {
  if (!fs.existsSync(dir)) return
  const a = path.resolve(dir), b = path.resolve(borne)
  if (!a.startsWith(b + path.sep)) throw new Error(`suppression refusée hors de ${b} : ${a}`)
  fs.rmSync(a, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}

// ── les faux secrets, assemblés ici à l'exécution ────────────────────────────────────────────────────────────────────
function fauxSecrets() {
  const jwt = (role) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ iss: 'supabase', ref: alea(20).toLowerCase(), role, iat: 1700000000, exp: 2000000000 })}.${alea(43, `${ALNUM}-_`)}`
  const cle = (genre) => `-----BEGIN ${genre}PRIVATE KEY-----\n${crypto.randomBytes(48).toString('base64')}\n-----END ${genre}PRIVATE KEY-----`
  return {
    secrets: [
      ['stripe', 'sk_' + 'live_' + alea(28)],
      ['stripe', 'rk_' + 'live_' + alea(28)],
      ['stripe', 'sk_' + 'test_' + alea(28)],
      ['stripe_webhook', 'wh' + 'sec_' + alea(32)],
      ['anthropic', 'sk-' + 'ant-' + 'api03-' + alea(40)],
      ['resend', 're' + '_' + alea(28)],
      ['supabase_service', jwt('service' + '_role')],
      ['cle_privee', cle('')],
      ['cle_privee', cle('RSA ')],
      ['google', 'AI' + 'za' + alea(35, `${ALNUM}-_`)],
      ['github', 'gh' + 'p_' + alea(36)],
      ['github', 'github' + '_pat_' + alea(22) + '_' + alea(59)],
    ],
    propres: [
      'Bonjour, le devis du chantier est prêt : 300 € TTC, acompte de 30 %.',
      `Une clé trop courte : ${'sk_' + 'live_' + 'abc'} et ${'re' + '_' + 'court'}.`,
      `La clé publique du navigateur : ${jwt('anon')}`,
      `Un identifiant quelconque : ${'AI' + 'za'}Court, et du code : const essai = 1`,
    ],
  }
}

// ── le bac à sable ───────────────────────────────────────────────────────────────────────────────────────────────────
function fabriquerBac(S, { indexe = false, gros = true } = {}) {
  const W = path.join(S, 'travail'), N = path.join(S, 'nu.git'), V = path.join(S, 'vault'), C = path.join(S, 'crochets-vides')
  for (const d of [W, V, C]) fs.mkdirSync(d, { recursive: true })
  const ecrire = (rel, contenu) => { const p = path.join(W, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, contenu) }
  const secret = 'sk_' + 'live_' + alea(32)
  const prospect = `plomberie.dupont.${alea(6).toLowerCase()}@exemple-prospect.fr`
  const cfg = [['user.name', 'Essai Instantané'], ['user.email', 'essai@presti-test.invalid'], ['core.autocrlf', 'false'], ['core.safecrlf', 'false'], ['commit.gpgsign', 'false'], ['core.hooksPath', C], ['core.fsmonitor', 'false']]
  gitOk(S, ['init', '-q', '-b', 'main', W])
  for (const [k, v] of cfg) gitOk(W, ['config', k, v])
  ecrire('.gitignore', '.env.local\n.orchestre/travail/\n')
  ecrire('README.md', '# Dépôt d’essai du juge instantane-quotidien-qa\n')
  ecrire('app/page.tsx', 'export default function Page() { return null }\n')
  ecrire('lib/outil.ts', 'export const un = 1\n')
  gitOk(W, ['add', '-A']); gitOk(W, ['commit', '-q', '--no-verify', '-m', 'premier'])
  ecrire('lib/outil.ts', 'export const un = 1\nexport const deux = 2\n')
  ecrire('lib/trois.ts', 'export const trois = 3\n')
  gitOk(W, ['add', '-A']); gitOk(W, ['commit', '-q', '--no-verify', '-m', 'second'])
  const modifie = 'export default function Page() { return "modifié, pas encore commité" }\n'
  ecrire('app/page.tsx', modifie)
  ecrire('notes/a.md', 'Note A, non suivie.\n')
  ecrire('notes/b.md', 'Note B, non suivie.\n')
  ecrire('outil.exe', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(510)]))
  ecrire('.env.local', `STRIPE_SECRET_KEY=${'sk_' + 'live_' + alea(32)}\n`)
  ecrire('config/cles.txt', `# à ne jamais pousser\nSTRIPE_SECRET_KEY=${secret}\n`)
  ecrire('prospects/liste.md', `Relancer ${prospect} jeudi, après le devis.\n`)
  // Le fichier de 91 Mo (IQ-6) ; les bacs de IQ-13 et IQ-14 s'en passent (ils ont assez d'exclusions pour le code 4).
  if (gros) {
    fs.mkdirSync(path.join(W, 'gros'), { recursive: true })
    const fd = fs.openSync(path.join(W, 'gros', 'archive.bin'), 'w'); fs.ftruncateSync(fd, GROS); fs.closeSync(fd)
  }
  fs.mkdirSync(path.join(V, 'Prospection'), { recursive: true })
  fs.writeFileSync(path.join(V, 'Prospection', 'deja-contactes-email.txt'), `contact@exemple-autre.fr\n${prospect}\n`)
  // IQ-13, IQ-14 : un travail indexé mais pas commité, qu'un script qui réécrirait l'index réel ferait bouger.
  if (indexe) { ecrire('lib/indexe.ts', 'export const indexe = true\n'); gitOk(W, ['add', '--', 'lib/indexe.ts']) }
  gitOk(S, ['init', '-q', '--bare', N])
  // L'index se stabilise (horodatages « racy ») avant la première empreinte : un git status qui le réécrirait ensuite
  // serait une modification réelle, pas un artefact de l'essai.
  dormir(1200)
  gitOk(W, ['status', '--porcelain'])
  return { W, N, V, secret, prospect, modifie }
}
function fichiersArbre(W) {
  const out = {}
  const rec = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (r === '.git' || r === '.orchestre/travail') continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) rec(p, r)
      else if (e.isFile()) out[r] = sha(fs.readFileSync(p))
    }
  }
  rec(W, '')
  return out
}
const refs = (d) => Object.fromEntries((git(d, ['for-each-ref', '--format=%(refname) %(objectname)']) || '').split('\n').filter(Boolean).map((l) => l.split(' ')))
function empreinte(W) {
  return {
    head: git(W, ['rev-parse', 'HEAD']),
    branche: git(W, ['symbolic-ref', 'HEAD']),
    statut: git(W, ['status', '--porcelain', '-uall']),
    index: sha(fs.readFileSync(path.join(W, '.git', 'index'))),
    fichiers: fichiersArbre(W),
    refs: refs(W),
  }
}
const lignesJournal = (W) => (lireOuNull(path.join(W, '.orchestre', 'travail', 'sauvegardes.jsonl')) || '').split(/\r?\n/).filter((l) => l.trim())
const arbre = (N, c) => (git(N, ['ls-tree', '-r', '--name-only', c]) || '').split('\n').filter(Boolean)
const parents = (N, c) => (git(N, ['cat-file', '-p', c]) || '').split('\n').filter((l) => l.startsWith('parent ')).map((l) => l.slice(7).trim())
const grepCommit = (N, c, valeur) => spawnSync('git', ['-C', N, 'grep', '-q', '-F', '-e', valeur, c], { windowsHide: true }).status === 0
const norm = (p) => String(p ?? '').replace(/\\/g, '/').replace(/^\.\//, '')

// ── le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger(o) {
  const lignes = []
  const dire = (l) => { console.log(l); lignes.push(l) }
  const res = {}
  const noter = (id, ok, detail) => { res[id] = [ok, detail] }
  const racineBac = path.join(o.racine, '.orchestre', 'travail', BAC)
  const S = path.join(racineBac, `bac-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}-${process.pid}`)
  const script = path.join(o.racine, 'scripts', 'instantane-quotidien.mjs')
  try {
    fs.mkdirSync(S, { recursive: true })
    dire(`bac à sable : ${versSlash(S)} (créé par le juge)`)
    const B = fabriquerBac(S)
    dire(`dépôt nu : ${versSlash(B.N)} (chemin local ; envois limités à GIT_ALLOW_PROTOCOL=file)`)
    const texteScript = lireOuNull(script)
    if (texteScript === null) {
      noter('IQ-1', false, `scripts/instantane-quotidien.mjs absent de ${versSlash(o.racine)}`)
      for (const id of DU_SCRIPT.slice(1)) noter(id, false, 'non jugé : le script est absent (IQ-1)')
    } else await jugerScript(o, S, B, script, texteScript, noter)
  } catch (e) {
    for (const id of DU_SCRIPT) if (!res[id]) noter(id, false, `non jugé : le bac à sable a échoué — ${court(e.message, 160)}`)
  } finally {
    try { supprimerSous(S, racineBac) } catch (e) { dire(`bac à sable non supprimé : ${court(e.message, 120)}`) }
  }
  noter('IQ-12', ...juger12(o))
  const rouges = []
  for (const id of CRITERES) { const [ok, d] = res[id] || [false, 'non jugé']; dire(`${ok ? 'PASS' : 'FAIL'} ${id} — ${d}`); if (!ok) rouges.push(id) }
  const supprime = !fs.existsSync(S)
  dire(`bac à sable ${supprime ? 'supprimé' : 'resté en place'} : ${versSlash(S)}`)
  dire(`${JUGE} : ${rouges.length || !supprime ? `FAIL — ${[...rouges, ...(supprime ? [] : ['bac à sable resté'])].join(', ')}` : 'PASS'} · racine ${versSlash(o.racine)}`)
  ecrireRapport(o.racine, lignes.join('\n') + '\n')
  return rouges.length || !supprime ? 1 : 0
}

async function jugerScript(o, S, B, script, texteScript, noter) {
  const { W, N, V } = B
  const envScript = {
    GIT_ALLOW_PROTOCOL: 'file', GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never',
    GIT_CEILING_DIRECTORIES: path.dirname(S), PRESTI_SAUVEGARDE_DEPOT: path.join(S, 'interdit.git'),
  }
  const passer = (args) => lancer(process.execPath, [script, `--racine=${W}`, `--vault=${V}`, ...args], { cwd: S, env: envScript, delaiMs: 180_000 })
  const avant = empreinte(W)
  const jour0 = paris()
  // 1. --pousser
  const p1 = await passer([`--depot=${N}`, '--pousser'])
  const jour1 = paris()
  const nu1 = refs(N), j1 = lignesJournal(W)
  // 2. --pousser, même jour
  const p2 = await passer([`--depot=${N}`, '--pousser'])
  const jour2 = paris()
  const nu2 = refs(N), j2 = lignesJournal(W)
  // 3. --sans-pousser
  const p3 = await passer([`--depot=${N}`, '--sans-pousser'])
  const nu3 = refs(N), j3 = lignesJournal(W)
  // 4. un dépôt introuvable
  const refsAvant4 = refs(W)
  const p4 = await passer([`--depot=${path.join(S, 'absent.git')}`, '--pousser'])
  const refsApres4 = refs(W), j4 = lignesJournal(W)
  const apres = empreinte(W)
  const passages = [p1, p2, p3, p4]
  const sorties = passages.map((p) => p.sortie).join('\n')
  const journalTexte = lireOuNull(path.join(W, '.orchestre', 'travail', 'sauvegardes.jsonl')) || ''
  const lireLigne = (l) => { try { return JSON.parse(l) } catch { return null } }
  const L1 = lireLigne(j1.at(-1) || '')
  const exclu = (L, chemin) => (Array.isArray(L?.exclus) ? L.exclus : []).find((x) => norm(x?.chemin) === chemin)
  const resumeP = (p) => `code ${p.code}${p.expire ? ' (délai dépassé)' : ''}`

  // IQ-1
  noter('IQ-1', p1.code === 4, p1.code === 4 ? `premier passage en code 4 (poussé avec exclusions, ${p1.duree.toFixed(1)} s)` : `premier passage en ${resumeP(p1)} au lieu de 4 : ${court(p1.sortie.split(/\r?\n/).filter(Boolean).slice(-2).join(' / '), 160)}`)

  // IQ-2
  const branche1 = [jour0, jour1].map((j) => `refs/heads/instantane-${j}`).find((r) => nu1[r])
  const C1 = branche1 ? nu1[branche1] : null
  {
    const f = []
    if (!C1) f.push(`aucune branche instantane-${jour1} dans le dépôt nu (références : ${Object.keys(nu1).join(', ') || 'aucune'})`)
    else {
      const par = parents(N, C1)
      if (par.length !== 1 || par[0] !== avant.head) f.push(`parent(s) du commit : ${par.map((x) => x.slice(0, 10)).join(', ') || 'aucun'} au lieu du HEAD ${avant.head.slice(0, 10)}`)
      const a = arbre(N, C1)
      for (const x of ['app/page.tsx', 'notes/a.md', 'notes/b.md']) if (!a.includes(x)) f.push(`${x} absent de l'arbre`)
      for (const x of ['outil.exe', '.env.local']) if (a.includes(x)) f.push(`${x} présent dans l'arbre`)
      const page = git(N, ['show', `${C1}:app/page.tsx`])
      if (a.includes('app/page.tsx') && page !== B.modifie.replace(/\n$/, '')) f.push('app/page.tsx de l’arbre n’est pas la version modifiée')
    }
    noter('IQ-2', !f.length, f.length ? f.join(' · ') : `${branche1.replace('refs/heads/', '')} → ${C1.slice(0, 10)}, parent = HEAD ${avant.head.slice(0, 10)}, arbre avec le modifié et les deux non suivis, sans .exe ni .env.local`)
  }

  // IQ-3
  {
    const f = []
    if (avant.head !== apres.head) f.push(`HEAD ${avant.head?.slice(0, 10)} → ${apres.head?.slice(0, 10)}`)
    if (avant.branche !== apres.branche) f.push(`branche ${avant.branche} → ${apres.branche}`)
    if (avant.statut !== apres.statut) f.push('git status --porcelain a changé')
    if (avant.index !== apres.index) f.push('.git/index a changé (empreinte SHA-256)')
    const noms = new Set([...Object.keys(avant.fichiers), ...Object.keys(apres.fichiers)])
    const touches = [...noms].filter((n) => avant.fichiers[n] !== apres.fichiers[n])
    if (touches.length) f.push(`fichier(s) de l'arbre changé(s) : ${touches.slice(0, 4).join(', ')}`)
    const refsNoms = new Set([...Object.keys(avant.refs), ...Object.keys(apres.refs)])
    for (const r of refsNoms) {
      if (avant.refs[r] === apres.refs[r]) continue
      if (!(r in avant.refs) && /^refs\/instantanes\/quotidien-/.test(r)) continue
      f.push(`référence ${r} ${r in avant.refs ? (r in apres.refs ? 'déplacée' : 'supprimée') : 'créée'}`)
    }
    const ajoutees = Object.keys(apres.refs).filter((r) => !(r in avant.refs))
    noter('IQ-3', !f.length, f.length ? f.slice(0, 5).join(' · ') : `HEAD, status, .git/index et ${Object.keys(avant.fichiers).length} fichiers identiques après 4 passages ; références ajoutées : ${ajoutees.length} refs/instantanes/quotidien-*`)
  }

  // IQ-4, IQ-5
  for (const [id, chemin, valeur, motif, quoi] of [['IQ-4', 'config/cles.txt', B.secret, 'stripe', 'la valeur du faux secret'], ['IQ-5', 'prospects/liste.md', B.prospect, 'prospect', 'l’adresse du prospect']]) {
    const f = []
    if (!C1) f.push('pas de commit poussé à relire (IQ-2)')
    else {
      if (arbre(N, C1).includes(chemin)) f.push(`${chemin} présent dans l'arbre poussé`)
      if (grepCommit(N, C1, valeur)) f.push(`git grep trouve ${quoi} dans le commit poussé`)
    }
    const x = exclu(L1, chemin)
    if (!x) f.push(`${chemin} absent de exclus dans le journal`)
    else if (x.motif !== motif) f.push(`motif « ${court(x.motif, 40)} » au lieu de « ${motif} »`)
    if (sorties.includes(valeur)) f.push(`${quoi} apparaît dans la sortie du script`)
    if (journalTexte.includes(valeur)) f.push(`${quoi} apparaît dans le journal`)
    noter(id, !f.length, f.length ? f.join(' · ') : `${chemin} exclu (motif ${motif}), absent de l'arbre poussé ; ${quoi} n'est ni dans l'arbre, ni dans la sortie, ni dans le journal`)
  }

  // IQ-6
  {
    const f = []
    if (!C1) f.push('pas de commit poussé à relire (IQ-2)')
    else if (arbre(N, C1).includes('gros/archive.bin')) f.push('gros/archive.bin (91 Mo) présent dans l’arbre poussé')
    const x = exclu(L1, 'gros/archive.bin')
    if (!x) f.push('gros/archive.bin absent de exclus dans le journal')
    else if (x.motif !== 'taille') f.push(`motif « ${court(x.motif, 40)} » au lieu de « taille »`)
    if (!p1.sortie.includes('gros/archive.bin') && !p1.sortie.includes('gros\\archive.bin')) f.push('la sortie du premier passage ne signale pas gros/archive.bin')
    noter('IQ-6', !f.length, f.length ? f.join(' · ') : 'gros/archive.bin (91 Mo) exclu (motif taille), absent de l’arbre et signalé dans la sortie')
  }

  // IQ-7
  {
    const f = []
    const jours = [...new Set([jour1, jour2])]
    const nouvelles = Object.keys(nu2).filter((r) => !(r in nu1))
    const seconde = nouvelles.find((r) => jours.some((j) => new RegExp(`^refs/heads/instantane-${j}-\\d{4}$`).test(r))) || (jour2 !== jour1 ? nouvelles.find((r) => r === `refs/heads/instantane-${jour2}`) : null)
    if (p2.code === 1 || p2.code > 4) f.push(`second passage en ${resumeP(p2)}`)
    if (!seconde) f.push(`aucune branche instantane-<date>-<HHMM> créée par le second passage (nouvelles : ${nouvelles.join(', ') || 'aucune'})`)
    if (branche1 && nu2[branche1] !== C1) f.push(`la première branche a bougé (${C1?.slice(0, 10)} → ${nu2[branche1]?.slice(0, 10) || 'supprimée'})`)
    const autres = Object.keys(refs(N)).filter((r) => !/^refs\/heads\/instantane-\d{4}-\d{2}-\d{2}(-\d{4})?$/.test(r))
    if (autres.length) f.push(`le dépôt nu porte d'autres références : ${autres.slice(0, 3).join(', ')}`)
    const interdits = []
    if (texteScript.includes('--force')) interdits.push('--force')
    // --mirror, --all, --tags comme options entières : « --allow-empty » n'est pas « --all ».
    for (const opt of ['--mirror', '--all', '--tags']) if (new RegExp(`${opt}(?![\\w-])`).test(texteScript)) interdits.push(opt)
    if (texteScript.includes('+refs')) interdits.push('+refs')
    if (texteScript.split(/\r?\n/).some((l) => /\bpush\b.*?(?:^|[\s'"`,[(])-f(?=$|[\s'"`,\])])/.test(l))) interdits.push('-f après push')
    if (interdits.length) f.push(`le texte du script contient ${interdits.join(', ')}`)
    noter('IQ-7', !f.length, f.length ? f.join(' · ') : `second passage → ${seconde.replace('refs/heads/', '')}, première branche intacte, dépôt nu sans autre référence ; ni --force, ni -f, ni --mirror, ni --all, ni --tags, ni +refs dans le script`)
  }

  // IQ-8
  {
    const f = []
    const L4 = lireLigne(j4.at(-1) || '')
    if (p4.code !== 1) f.push(`dépôt introuvable : ${resumeP(p4)} au lieu de 1`)
    if (j4.length !== j3.length + 1) f.push(`le journal a gagné ${j4.length - j3.length} ligne(s) au lieu d'une`)
    else if (!L4 || L4.ok !== false) f.push(`la ligne du journal porte ok: ${L4 ? JSON.stringify(L4.ok) : 'illisible'} au lieu de false`)
    const gardees = Object.keys(refsApres4).filter((r) => !(r in refsAvant4) && /^refs\/instantanes\/quotidien-/.test(r))
    if (gardees.length !== 1) f.push(`${gardees.length} référence(s) refs/instantanes/quotidien-* ajoutée(s) par ce passage au lieu d'une (la référence locale doit être gardée)`)
    const derniere = p4.sortie.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).at(-1) || ''
    if (!derniere.startsWith('ALERTE BENJ :')) f.push(`dernière ligne de la sortie « ${court(derniere, 60)} » au lieu de « ALERTE BENJ : … »`)
    noter('IQ-8', !f.length, f.length ? f.join(' · ') : 'dépôt introuvable → code 1, journal ok: false, référence locale gardée, « ALERTE BENJ : » en dernière ligne')
  }

  // IQ-9
  {
    const f = []
    const comptes = [j1.length, j2.length, j3.length, j4.length]
    if (comptes.join(',') !== '1,2,3,4') f.push(`lignes du journal après chaque passage : ${comptes.join(', ')} au lieu de 1, 2, 3, 4`)
    j4.forEach((l, i) => {
      const x = lireLigne(l)
      if (!x) { f.push(`ligne ${i + 1} : JSON illisible`); return }
      const manque = ['date', 'commit', 'branche', 'fichiers', 'octets', 'exclus', 'ok'].filter((k) => !(k in x))
      if (manque.length) f.push(`ligne ${i + 1} : champ(s) ${manque.join(', ')} absent(s)`)
      if (typeof x.date !== 'string' || Number.isNaN(Date.parse(x.date))) f.push(`ligne ${i + 1} : date illisible`)
      if (!/^[0-9a-f]{40}$/.test(String(x.commit))) f.push(`ligne ${i + 1} : commit « ${court(x.commit, 20)} » au lieu de 40 signes hexadécimaux`)
      if (!(x.branche === null || typeof x.branche === 'string')) f.push(`ligne ${i + 1} : branche ni texte ni null`)
      for (const k of ['fichiers', 'octets']) if (!(Number.isFinite(x[k]) && x[k] >= 0)) f.push(`ligne ${i + 1} : ${k} non numérique`)
      if (!Array.isArray(x.exclus) || x.exclus.some((e) => !e || typeof e.chemin !== 'string' || typeof e.motif !== 'string' || !e.motif)) f.push(`ligne ${i + 1} : exclus n'est pas une liste de { chemin, motif }`)
      if (typeof x.ok !== 'boolean') f.push(`ligne ${i + 1} : ok non booléen`)
    })
    if (L1) {
      if (L1.ok !== true) f.push('ligne du premier passage : ok n’est pas true')
      if (branche1 && L1.branche !== branche1.replace('refs/heads/', '')) f.push(`ligne du premier passage : branche « ${court(L1.branche, 40)} » au lieu de ${branche1.replace('refs/heads/', '')}`)
      if (C1 && L1.commit !== C1) f.push('ligne du premier passage : commit différent de celui du dépôt nu')
      if (!(L1.fichiers > 0 && L1.octets > 0)) f.push('ligne du premier passage : fichiers et octets doivent être > 0')
    }
    noter('IQ-9', !f.length, f.length ? f.slice(0, 4).join(' · ') : `une ligne JSON complète par passage (4) ; la première porte ok: true, ${L1.branche}, ${L1.fichiers} fichiers, ${L1.octets} octets`)
  }

  // IQ-10
  {
    const f = []
    if (JSON.stringify(nu3) !== JSON.stringify(nu2)) f.push('--sans-pousser a changé le dépôt nu')
    if (p3.code !== 0 && p3.code !== 4) f.push(`--sans-pousser en ${resumeP(p3)}`)
    noter('IQ-10', !f.length, f.length ? f.join(' · ') : `--sans-pousser : dépôt nu inchangé (${resumeP(p3)})`)
  }

  // IQ-11
  noter('IQ-11', ...(await juger11(o, S, script)))

  // IQ-13, IQ-14
  await jugerConcurrence(S, script, noter)
}

async function juger11(o, S, script) {
  const vide = path.join(S, 'import')
  fs.mkdirSync(vide, { recursive: true })
  const journalReel = path.join(o.racine, '.orchestre', 'travail', 'sauvegardes.jsonl')
  const avantJournal = lireOuNull(journalReel)
  const { secrets, propres } = fauxSecrets()
  const code = `
    const m = await import(${JSON.stringify(pathToFileURL(script).href)})
    const J = JSON.parse(Buffer.from(process.env.IQ_CAS, 'base64').toString('utf8'))
    const r = { exports: { chercherSecrets: typeof m.chercherSecrets, MOTIFS_SECRETS: Array.isArray(m.MOTIFS_SECRETS) ? m.MOTIFS_SECRETS.map((x) => ({ nom: typeof x?.nom === 'string' ? x.nom : null, re: x?.re instanceof RegExp })) : typeof m.MOTIFS_SECRETS }, secrets: [], propres: [] }
    if (typeof m.chercherSecrets === 'function') {
      for (const [nom, valeur] of J.secrets) { let s; try { s = m.chercherSecrets(valeur) } catch (e) { s = { exception: String(e && e.message) } } const t = JSON.stringify(s) ?? ''; r.secrets.push({ nom, liste: Array.isArray(s), noms: Array.isArray(s) ? s.filter((x) => typeof x === 'string') : [], fuite: t.includes(valeur) || (valeur.length > 24 && t.includes(valeur.slice(8, 24))), apercu: Array.isArray(s) ? '' : t.slice(0, 60) }) }
      for (const t of J.propres) { let s; try { s = m.chercherSecrets(t) } catch (e) { s = { exception: String(e && e.message) } } r.propres.push({ vide: Array.isArray(s) && s.length === 0, apercu: JSON.stringify(s)?.slice(0, 60) }) }
    }
    process.stdout.write('@@IQ11@@' + JSON.stringify(r) + '\\n')`
  const r = await lancer(process.execPath, ['--no-warnings', '--input-type=module', '-e', code], {
    cwd: vide, delaiMs: 60_000,
    env: { IQ_CAS: Buffer.from(JSON.stringify({ secrets, propres })).toString('base64'), GIT_ALLOW_PROTOCOL: 'file', GIT_CEILING_DIRECTORIES: path.dirname(S), PRESTI_SAUVEGARDE_DEPOT: path.join(S, 'interdit.git'), GIT_TERMINAL_PROMPT: '0' },
  })
  const f = []
  const autres = r.sortie.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('@@IQ11@@'))
  if (autres.length) f.push(`l'import a produit une sortie : « ${court(autres[0], 80)} »`)
  if (fs.readdirSync(vide).length) f.push(`l'import a écrit dans son dossier courant : ${fs.readdirSync(vide).slice(0, 3).join(', ')}`)
  if (lireOuNull(journalReel) !== avantJournal) f.push('l’import a écrit une ligne dans le journal de la racine')
  const ligne = r.sortie.split(/\r?\n/).find((l) => l.startsWith('@@IQ11@@'))
  if (!ligne) { f.push(`l'import n'a pas abouti (code ${r.code}${r.expire ? ', délai dépassé' : ''})`); return [false, f.join(' · ')] }
  const j = JSON.parse(ligne.slice(8))
  if (j.exports.chercherSecrets !== 'function') f.push('export chercherSecrets absent ou pas une fonction')
  if (!Array.isArray(j.exports.MOTIFS_SECRETS)) f.push('export MOTIFS_SECRETS absent ou pas un tableau')
  else {
    if (j.exports.MOTIFS_SECRETS.some((x) => !x.nom || !x.re)) f.push('MOTIFS_SECRETS : une entrée sans { nom, re }')
    const noms = new Set(j.exports.MOTIFS_SECRETS.map((x) => x.nom))
    const manquent = ['stripe', 'stripe_webhook', 'anthropic', 'resend', 'supabase_service', 'cle_privee', 'google', 'github'].filter((n) => !noms.has(n))
    if (manquent.length) f.push(`MOTIFS_SECRETS sans ${manquent.join(', ')}`)
  }
  const rates = j.secrets.filter((x) => !x.liste || !x.noms.includes(x.nom)).map((x) => `${x.nom}${x.apercu ? ` (${court(x.apercu, 30)})` : ''}`)
  if (rates.length) f.push(`chercherSecrets ne nomme pas : ${rates.join(', ')}`)
  const fuites = j.secrets.filter((x) => x.fuite).map((x) => x.nom)
  if (fuites.length) f.push(`chercherSecrets rend la valeur trouvée (${[...new Set(fuites)].join(', ')})`)
  const fauxPositifs = j.propres.filter((x) => !x.vide).map((x) => x.apercu)
  if (fauxPositifs.length) f.push(`texte propre signalé : ${fauxPositifs.map((a) => court(a, 40)).join(', ')}`)
  if (f.length) return [false, f.join(' · ')]
  return [true, `l'import n'exécute rien ; chercherSecrets et MOTIFS_SECRETS exportés ; ${secrets.length} faux secrets nommés sans leur valeur, ${propres.length} textes propres (dont un JWT anon) sans signalement`]
}

// ── IQ-13, IQ-14 : un écrivain concurrent pendant le passage, puis deux sabotages du script ──────────────────────────
// La précharge des sabotages, écrite dans le bac et passée par node --import. Elle enrobe execFileSync et spawnSync du
// processus du script : le sabotage part de SON processus, avec ses arguments et son environnement (trace, identité…),
// sans dépendre de son texte. Elle écrit dans IQ_SABOTAGE_TEMOIN ce qu'elle a fait : un sabotage qui ne se déclenche
// pas fait échouer IQ-14, jamais de vert par absence.
const SABOTEUR = String.raw`import fs from 'node:fs'
import { createRequire, syncBuiltinESMExports } from 'node:module'
const cp = createRequire(import.meta.url)('node:child_process')
const genre = process.env.IQ_SABOTAGE, temoin = process.env.IQ_SABOTAGE_TEMOIN
const attendre = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
let fait = false
function sousCommande(args) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-C' || args[i] === '-c') { i++; continue }
    if (!String(args[i]).startsWith('-')) return i
  }
  return -1
}
function insister(orig, fichier, args, options) {
  for (let essai = 0; essai < 80; essai++) {
    try { orig(fichier, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] }); return 'fait' }
    catch (e) { if (!/\.lock/.test(String(e.stderr || e.message))) return 'échec'; attendre(100) }
  }
  return 'verrou'
}
function envelopper(orig) {
  return function (fichier, args, options, ...reste) {
    const resultat = orig.call(this, fichier, args, options, ...reste)
    if (!fait && /(^|[\\/])git(\.exe)?$/i.test(String(fichier)) && Array.isArray(args)) {
      const i = sousCommande(args)
      const env = { ...((options && options.env) || process.env) }
      if (genre === 'index' && args[i] === 'add' && env.GIT_INDEX_FILE) {
        fait = true
        delete env.GIT_INDEX_FILE
        fs.appendFileSync(temoin, 'index ' + insister(cp.execFileSync.orig, fichier, args, { ...options, env }) + '\n')
      } else if (genre === 'branche' && args[i] === 'update-ref' && /^[0-9a-f]{40}$/.test(String(args[i + 2]))) {
        fait = true
        const autre = [...args.slice(0, i), 'update-ref', 'refs/heads/main', args[i + 2]]
        fs.appendFileSync(temoin, 'branche ' + insister(cp.execFileSync.orig, fichier, autre, { ...options, env }) + '\n')
      } else if (genre === 'etiquette' && args[i] === 'update-ref' && /^[0-9a-f]{40}$/.test(String(args[i + 2]))) {
        // Une étiquette légère vers HEAD : pas de reflog (git n'en tient pas pour refs/tags/), pas l'instantané.
        fait = true
        const autre = [...args.slice(0, i), 'tag', 'iq-sabotage', 'HEAD']
        fs.appendFileSync(temoin, 'etiquette ' + insister(cp.execFileSync.orig, fichier, autre, { ...options, env }) + '\n')
      }
    }
    return resultat
  }
}
const vrai = cp.execFileSync
cp.execFileSync = envelopper(vrai); cp.execFileSync.orig = vrai
cp.spawnSync = envelopper(cp.spawnSync)
syncBuiltinESMExports()
`

/**
 * L'écrivain concurrent : ce que fait le moteur 24 h/24, en accéléré, dans le dépôt de travail du bac. À chaque étape il
 * écrit un fichier et l'indexe (écriture de .git/index), écrit un non suivi, et une étape sur deux commite ses fichiers
 * indexés sur la branche courante (git commit -- <ses chemins> : le travail indexé d'avant n'y entre pas). Il mesure
 * .git/index et les références juste après chacune de ses opérations et juste avant la suivante : tout écart entre les
 * deux vient d'un autre processus, c'est-à-dire du script. Un verrou .lock trouvé pris est aussi une écriture étrangère.
 */
function ecrivainConcurrent(W, branche, vivant) {
  const e = { operations: 0, commits: [], ecrits: {}, indexes: [], etrangers: [], pendant: { operations: 0, commits: 0 }, erreur: null }
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' }
  const cfg = ['-c', 'gc.auto=0', '-c', 'maintenance.auto=false', '-c', 'core.quotepath=false']
  const lireIndex = () => {
    for (let k = 0; ; k++) { try { return sha(fs.readFileSync(path.join(W, '.git', 'index'))) } catch (x) { if (k >= 40) throw x; dormir(25) } }
  }
  // Les références lues dans les fichiers (packed-refs, puis les références isolées qui priment) : aucun processus git,
  // donc une mesure de quelques millisecondes entre deux opérations. refs/instantanes/ est le seul domaine du script.
  const G = path.join(W, '.git')
  const lireRefs = () => {
    const out = {}
    for (const l of (lireOuNull(path.join(G, 'packed-refs')) || '').split(/\r?\n/)) {
      const m = /^([0-9a-f]{40,64}) (refs\/\S+)$/.exec(l)
      if (m) out[m[2]] = m[1]
    }
    const rec = (d, rel) => {
      let entrees = []
      try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
      for (const x of entrees) {
        const r = `${rel}/${x.name}`
        if (x.isDirectory()) rec(path.join(d, x.name), r)
        else if (!x.name.endsWith('.lock')) { const v = (lireOuNull(path.join(d, x.name)) || '').trim(); if (/^[0-9a-f]{40,64}$/.test(v)) out[r] = v }
      }
    }
    rec(path.join(G, 'refs'), 'refs')
    return Object.fromEntries(Object.entries(out).filter(([r]) => !r.startsWith('refs/instantanes/')))
  }
  const mesure = () => ({ index: lireIndex(), head: (lireOuNull(path.join(G, 'HEAD')) || '').trim(), refs: lireRefs() })
  let dernier = mesure()
  const etranger = (genre, detail) => { if (!e.etrangers.some((x) => x[0] === genre && x[1] === detail)) e.etrangers.push([genre, detail]) }
  const comparer = (m, quand) => {
    if (m.index !== dernier.index) etranger('index', `.git/index réécrit ${quand}`)
    if (m.head !== dernier.head) etranger('refs', `HEAD changé ${quand}`)
    for (const r of new Set([...Object.keys(m.refs), ...Object.keys(dernier.refs)])) {
      if (m.refs[r] !== dernier.refs[r]) etranger('refs', `${r} ${r in dernier.refs ? (r in m.refs ? 'déplacée' : 'supprimée') : 'créée'} ${quand}`)
    }
  }
  const op = (args) => {
    for (let essai = 0; essai < 100; essai++) {
      comparer(mesure(), 'entre deux opérations de l’écrivain')
      const r = spawnSync('git', ['-C', W, ...cfg, ...args], { encoding: 'utf8', windowsHide: true, env })
      if (r.status === 0) { dernier = mesure(); e.operations++; if (vivant()) e.pendant.operations++; return }
      const m = `${r.stderr || ''}${r.stdout || ''}`
      // Un verrou pris, ou une référence qui n'est plus où git l'a lue (« cannot lock ref … is at … but expected … ») :
      // un autre processus écrit au même moment. C'est une écriture étrangère ; l'écrivain réessaie, comme le moteur.
      if (/\.lock\b|cannot lock ref|but expected/.test(m)) { etranger(/index\.lock/.test(m) ? 'index' : 'refs', `verrou ou référence pris par un autre processus pendant git ${args[0]}`); dormir(100); continue }
      throw new Error(`écrivain concurrent : git ${args[0]} en échec — ${court(m, 140)}`)
    }
    throw new Error(`écrivain concurrent : git ${args[0]}, verrou jamais libéré`)
  }
  let i = 0, attente = []
  const etape = () => {
    i++
    fs.mkdirSync(path.join(W, 'concurrent'), { recursive: true })
    const rel = `concurrent/c-${i}.txt`, libre = `concurrent/libre-${i}.txt`
    e.ecrits[rel] = `écriture concurrente n° ${i}\n`; fs.writeFileSync(path.join(W, rel), e.ecrits[rel])
    e.ecrits[libre] = `non suivi n° ${i}\n`; fs.writeFileSync(path.join(W, libre), e.ecrits[libre])
    op(['add', '--', rel]); e.indexes.push(rel); attente.push(rel)
    if (i % 2 === 0) {
      op(['commit', '-q', '--no-verify', '-m', `écriture concurrente ${i}`, '--', ...attente])
      e.commits.push({ sha: dernier.refs[branche], fichiers: attente })
      if (vivant()) e.pendant.commits++
      attente = []
    }
  }
  e.tourner = async (fini) => { while (!fini()) { etape(); await pause(20) } }
  e.conclure = () => comparer(mesure(), 'après la dernière opération de l’écrivain')
  return e
}

/** Ce qui, dans le dépôt de travail, n'est pas l'œuvre de l'écrivain seul : [genre, détail], genre = index | refs | fichiers. */
function bilanConcurrence(W, avant, e) {
  const f = [...e.etrangers]
  const apres = refs(W)
  const attendu = e.commits.at(-1)?.sha || avant.head
  if (git(W, ['symbolic-ref', 'HEAD']) !== avant.branche) f.push(['refs', `HEAD ne désigne plus ${avant.branche}`])
  for (const r of new Set([...Object.keys(avant.refs), ...Object.keys(apres)])) {
    if (avant.refs[r] === apres[r]) continue
    if (!(r in avant.refs) && /^refs\/instantanes\/quotidien-/.test(r)) continue
    if (r === avant.branche && apres[r] === attendu) continue
    f.push(['refs', `${r} ${r in avant.refs ? (r in apres ? 'déplacée' : 'supprimée') : 'créée'} (attendu : ${r === avant.branche ? `${attendu.slice(0, 10)}, dernier commit de l'écrivain` : 'inchangée'})`])
  }
  const histoire = (git(W, ['rev-list', '--reverse', `${avant.head}..${avant.branche}`]) || '').split('\n').filter(Boolean)
  if (histoire.join(',') !== e.commits.map((c) => c.sha).join(',')) f.push(['refs', `${avant.branche} : ${histoire.length} commit(s) depuis le départ, pas exactement les ${e.commits.length} de l'écrivain`])
  else {
    for (const c of e.commits) {
      const noms = (git(W, ['diff-tree', '--no-commit-id', '--name-only', '-r', c.sha]) || '').split('\n').filter(Boolean).sort()
      if (noms.join(',') !== [...c.fichiers].sort().join(',')) f.push(['refs', `le commit ${c.sha.slice(0, 10)} de l'écrivain porte d'autres fichiers que les siens`])
    }
  }
  const index = new Set((git(W, ['ls-files', '-s']) || '').split('\n').filter(Boolean))
  const indexAttendu = new Set([...avant.stage, ...e.indexes.map((rel) => `100644 ${blob(e.ecrits[rel])} 0\t${rel}`)])
  const enTrop = [...index].filter((l) => !indexAttendu.has(l)), manquent = [...indexAttendu].filter((l) => !index.has(l))
  if (enTrop.length || manquent.length) f.push(['index', `l'index réel n'est pas celui que l'écrivain seul laisse : ${enTrop.length} entrée(s) en trop, ${manquent.length} manquante(s) (ex. ${court((enTrop[0] || manquent[0]).split('\t')[1], 40)})`])
  const fichiers = fichiersArbre(W)
  const attenduF = (n) => (n.startsWith('concurrent/') ? (n in e.ecrits ? sha(Buffer.from(e.ecrits[n], 'utf8')) : undefined) : avant.fichiers[n])
  const touches = [...new Set([...Object.keys(avant.fichiers), ...Object.keys(fichiers)])].filter((n) => fichiers[n] !== attenduF(n))
  if (touches.length) f.push(['fichiers', `fichier(s) de l'arbre changé(s) hors écrivain : ${touches.slice(0, 3).join(', ')}`])
  return f
}

/** Un bac neuf, un passage --pousser du script (saboté ou non) pendant que l'écrivain concurrent travaille. */
async function passageConcurrent(S, script, nom, sabotage) {
  const R = path.join(S, nom)
  fs.mkdirSync(R, { recursive: true })
  const B = fabriquerBac(R, { indexe: true, gros: false })
  const { W, N, V } = B
  const tmp = path.join(R, 'tmp')
  fs.mkdirSync(tmp, { recursive: true })
  const temoin = path.join(R, 'sabotage.txt')
  const env = {
    GIT_ALLOW_PROTOCOL: 'file', GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_CEILING_DIRECTORIES: path.dirname(S),
    PRESTI_SAUVEGARDE_DEPOT: path.join(R, 'interdit.git'), TEMP: tmp, TMP: tmp, TMPDIR: tmp,
  }
  const args = [script, `--racine=${W}`, `--vault=${V}`, `--depot=${N}`, '--pousser']
  if (sabotage) {
    const saboteur = path.join(S, 'saboteur.mjs')
    fs.writeFileSync(saboteur, SABOTEUR)
    Object.assign(env, { IQ_SABOTAGE: sabotage, IQ_SABOTAGE_TEMOIN: temoin })
    args.unshift(`--import=${pathToFileURL(saboteur).href}`)
  }
  const avant = {
    head: git(W, ['rev-parse', 'HEAD']), branche: git(W, ['symbolic-ref', 'HEAD']), refs: refs(W),
    stage: (git(W, ['ls-files', '-s']) || '').split('\n').filter(Boolean), fichiers: fichiersArbre(W),
  }
  const lignesAvant = lignesJournal(W).length
  let enfant = null, fini = false
  const vivant = () => { if (!enfant || fini) return false; try { process.kill(enfant.pid, 0); return true } catch { return false } }
  const E = ecrivainConcurrent(W, avant.branche, vivant)
  const course = lancer(process.execPath, args, { cwd: R, env, delaiMs: 180_000, surEnfant: (x) => { enfant = x } })
  course.then(() => { fini = true })
  try { await E.tourner(() => fini) } catch (x) { E.erreur = x }
  const p = await course
  if (!E.erreur) { try { E.conclure() } catch (x) { E.erreur = x } }
  return {
    p, B, avant, E,
    anomalies: E.erreur ? [] : bilanConcurrence(W, avant, E),
    nouvelles: lignesJournal(W).slice(lignesAvant),
    nu: refs(N),
    temoin: lireOuNull(temoin) || '',
    restes: fs.readdirSync(tmp),
  }
}

async function jugerConcurrence(S, script, noter) {
  const resumeP = (p) => `code ${p.code}${p.expire ? ' (délai dépassé)' : ''}`
  const prouve = (E) => E.pendant.operations >= 3 && E.pendant.commits >= 1
  const ecrivain = (E) => `${E.pendant.operations} opération(s) dont ${E.pendant.commits} commit(s) de l'écrivain pendant que le script tournait`

  // IQ-13 — le moteur écrit pendant le passage : le script doit réussir, et n'avoir rien touché.
  try {
    const r = await passageConcurrent(S, script, 'concurrence', null)
    const f = []
    const L = lireJson(r.nouvelles.at(-1) || '')
    let C = null, par = []
    if (r.E.erreur) f.push(court(r.E.erreur.message, 160))
    if (r.p.code !== 4) f.push(`passage sous écriture concurrente en ${resumeP(r.p)} au lieu de 4 (« ${court(derniereLigne(r.p.sortie), 90)} »)`)
    if (r.nouvelles.length !== 1) f.push(`le journal a gagné ${r.nouvelles.length} ligne(s) au lieu d'une`)
    if (L && L.ok !== true) f.push(`ligne du journal : ok: ${JSON.stringify(L.ok)} au lieu de true`)
    C = L?.branche ? r.nu[`refs/heads/${L.branche}`] || null : null
    if (!C || C !== L?.commit) f.push(`le dépôt nu ne porte pas ${L?.branche || 'de branche du journal'} sur le commit du journal`)
    else {
      par = parents(r.B.N, C)
      const permis = [r.avant.head, ...r.E.commits.map((c) => c.sha)]
      if (par.length !== 1 || !permis.includes(par[0])) f.push(`parent(s) du commit poussé : ${par.map((x) => x.slice(0, 10)).join(', ') || 'aucun'}, pas un HEAD du passage`)
    }
    if (!prouve(r.E)) f.push(`scénario non prouvé : ${ecrivain(r.E)} (3 et 1 au moins)`)
    if (r.anomalies.length) f.push(`le juge voit des écritures qui ne sont pas celles de l'écrivain : ${r.anomalies.slice(0, 3).map((a) => a[1]).join(' ; ')}`)
    if (r.restes.length) f.push(`dossier temporaire du script non vide après le passage : ${r.restes.slice(0, 3).join(', ')}`)
    noter('IQ-13', !f.length, f.length ? f.join(' · ') : `${ecrivain(r.E)} (${r.p.duree.toFixed(1)} s) ; code 4, ${L.branche} → ${C.slice(0, 10)}, parent ${par[0].slice(0, 10)} = un HEAD du passage ; index, historique, fichiers et références = l'œuvre de l'écrivain seul ; dossier temporaire vide`)
  } catch (e) { noter('IQ-13', false, `non jugé : ${court(e.message, 160)}`) }

  // IQ-14 — le script saboté écrit lui-même dans .git/index, ou déplace une branche : le juge le voit malgré l'écrivain,
  // et le script le dit (code 1, ALERTE BENJ).
  try {
    const f = [], vus = []
    for (const [genre, attendu] of [['index', 'index'], ['branche', 'refs'], ['etiquette', 'refs']]) {
      const r = await passageConcurrent(S, script, `sabotage-${genre}`, genre)
      const L = lireJson(r.nouvelles.at(-1) || '')
      const derniere = derniereLigne(r.p.sortie)
      const g = []
      if (r.E.erreur) g.push(court(r.E.erreur.message, 120))
      if (!r.temoin.split(/\r?\n/).includes(`${genre} fait`)) g.push(`sabotage non déclenché (${court(r.temoin, 40) || 'témoin vide'} : le script n'appelle-t-il plus git par execFileSync ou spawnSync ?)`)
      if (!prouve(r.E)) g.push(`écrivain absent : ${ecrivain(r.E)}`)
      const vu = r.anomalies.filter((a) => a[0] === attendu)
      if (!vu.length) g.push(`le juge ne voit pas l'écriture du script (${attendu})`)
      if (r.p.code !== 1) g.push(`script saboté en ${resumeP(r.p)} au lieu de 1`)
      if (!derniere.startsWith('ALERTE BENJ :')) g.push(`dernière ligne « ${court(derniere, 60)} » au lieu de « ALERTE BENJ : … »`)
      if (r.nouvelles.length !== 1 || !L || L.ok !== false) g.push(`journal : ${r.nouvelles.length} ligne(s), ok: ${JSON.stringify(L?.ok)} au lieu d'une ligne ok: false`)
      if (g.length) f.push(`sabotage ${genre} : ${g.join(', ')}`)
      else vus.push(`sabotage ${genre} → vu par le juge (${court(vu[0][1], 70)}) et refusé par le script (code 1, « ${court(derniere, 90)} »)`)
    }
    noter('IQ-14', !f.length, f.length ? f.join(' · ') : vus.join(' ; '))
  } catch (e) { noter('IQ-14', false, `non jugé : ${court(e.message, 160)}`) }
}

function juger12(o) {
  const t = lireOuNull(path.join(o.racine, 'docs', 'sauvegardes.md'))
  if (t === null) return [false, 'docs/sauvegardes.md absent']
  const L = t.split(/\r?\n/)
  const i = L.findIndex((l) => /^#{1,6}\s/.test(l) && /Le code et l['’]arbre de travail/i.test(l))
  if (i < 0) return [false, 'docs/sauvegardes.md n’a pas de section « Le code et l’arbre de travail »']
  const niveau = /^(#+)/.exec(L[i])[1].length
  let j = i + 1
  while (j < L.length && !(new RegExp(`^#{1,${niveau}}\\s`).test(L[j]))) j++
  const section = L.slice(i, j).join('\n')
  const f = []
  if (!/git fetch\s+\S+\s+instantane-/.test(section)) f.push('pas de « git fetch <dépôt> instantane-… »')
  if (!/git show\s+\S+:\S+/.test(section)) f.push('pas de « git show <commit>:<chemin> »')
  if (f.length) return [false, `section « Le code et l’arbre de travail » incomplète : ${f.join(' · ')}`]
  return [true, 'section « Le code et l’arbre de travail » avec git fetch … instantane-… et git show <commit>:<chemin>']
}

function ecrireRapport(racine, texte, nom = 'dernier.log') {
  const f = path.join(racine, '.orchestre', 'travail', BAC, nom)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, texte)
  if (!fs.statSync(f).size) { console.log(`ERREUR ${JUGE} : rapport ${versSlash(f)} de 0 octet, refusé`); process.exit(1) }
}

// ── --autotest : un témoin vert, puis un défaut planté par critère ───────────────────────────────────────────────────
const FIXTURES = path.join(DEPOT, 'scripts', 'fixtures', '026', 'securite', 'instantane')
const T_SCRIPT = 'scripts/instantane-quotidien.mjs'
const CAS_AUTOTEST = [
  { nom: 'code-0-malgre-exclusions', fichier: T_SCRIPT, avant: 'code = ligne.exclus.length ? 4 : 0', apres: 'code = 0', attendu: 'IQ-1', aussi: ['IQ-13'] },
  { nom: 'exe-dans-arbre', fichier: T_SCRIPT, avant: "g(['add', '-A', '--', '.', ':(exclude)*.exe'], envI)", apres: "g(['add', '-A', '--', '.'], envI)", attendu: 'IQ-2' },
  { nom: 'sans-parent', fichier: T_SCRIPT, avant: "g(['commit-tree', arbre, '-p', 'HEAD', '-m',", apres: "g(['commit-tree', arbre, '-m',", attendu: 'IQ-2', aussi: ['IQ-13'] },
  { nom: 'index-reel', fichier: T_SCRIPT, avant: 'const envI = { GIT_INDEX_FILE: index }', apres: 'const envI = {}', attendu: 'IQ-3', aussi: ['IQ-1', 'IQ-7', 'IQ-8', 'IQ-9', 'IQ-10', 'IQ-13', 'IQ-14'] },
  // Réparation du 27/09 : l'ancien invariant (le dépôt immobile) remis en place → IQ-13 ; plus d'invariant du tout → IQ-14.
  { nom: 'invariant-strict', fichier: T_SCRIPT, avant: 'if (bouge.length) console.log(', apres: "if (bouge.length) { ligne.ok = false; code = 1; raison = 'invariant rompu : le dépôt a bougé' }\n  if (bouge.length) console.log(", attendu: 'IQ-13' },
  { nom: 'sans-invariant', fichier: T_SCRIPT, avant: 'if (violations.length) { ligne.ok = false; code = 1;', apres: 'if (false) { ligne.ok = false; code = 1;', attendu: 'IQ-14' },
  // La liste des commandes relue dans la trace retirée : le sabotage « etiquette » (git tag, sans reflog) passe → IQ-14.
  { nom: 'sans-liste-des-commandes', fichier: T_SCRIPT, avant: 'if (horsListe.length) violations.push(', apres: 'if (false) violations.push(', attendu: 'IQ-14' },
  { nom: 'secrets-non-cherches', fichier: T_SCRIPT, avant: 'const noms = chercherSecrets(texte)', apres: 'const noms = []', attendu: 'IQ-4' },
  { nom: 'valeur-au-journal', fichier: T_SCRIPT, avant: "if (noms.length) { ligne.exclus.push({ chemin: c, motif: noms[0] }); continue }", apres: "if (noms.length) { ligne.exclus.push({ chemin: c, motif: noms[0], extrait: texte.slice(0, 120) }); continue }", attendu: 'IQ-4' },
  { nom: 'prospects-ignores', fichier: T_SCRIPT, avant: "if (vault.entrees.some((e) => bas.includes(e)))", apres: 'if (false)', attendu: 'IQ-5' },
  { nom: 'seuil-100-mo', fichier: T_SCRIPT, avant: 'const MAX_OCTETS = 90 * 1024 * 1024', apres: 'const MAX_OCTETS = 100 * 1024 * 1024', attendu: 'IQ-6' },
  { nom: 'push-force', fichier: T_SCRIPT, avant: "g(['push', o.depot,", apres: "g(['push', '--force', o.depot,", attendu: 'IQ-7' },
  { nom: 'meme-branche', fichier: T_SCRIPT, avant: 'ligne.branche = existe(`instantane-${jour}`) ? `instantane-${jour}-${hhmm}` : `instantane-${jour}`', apres: 'ligne.branche = `instantane-${jour}`', attendu: 'IQ-7' },
  { nom: 'echec-en-code-0', fichier: T_SCRIPT, avant: "    ligne.ok = false\n    code = 1\n  } finally {", apres: "    ligne.ok = false\n    code = 0\n  } finally {", attendu: 'IQ-8' },
  { nom: 'journal-sans-octets', fichier: T_SCRIPT, avant: 'fs.appendFileSync(journal, JSON.stringify(ligne) +', apres: 'fs.appendFileSync(journal, JSON.stringify({ ...ligne, octets: undefined }) +', attendu: 'IQ-9' },
  { nom: 'sans-pousser-ignore', fichier: T_SCRIPT, avant: 'if (o.pousser) {', apres: 'if (true) {', attendu: 'IQ-10', aussi: ['IQ-9'] },
  { nom: 'execute-a-l-import', fichier: T_SCRIPT, avant: 'if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exit(', apres: 'if (true) process.exit(', attendu: 'IQ-11' },
  { nom: 'valeur-rendue', fichier: T_SCRIPT, avant: '} else if (m.re.test(t)) noms.push(m.nom)', apres: '} else if (m.re.test(t)) noms.push(m.nom + t.match(m.re)[0])', attendu: 'IQ-11', aussi: ['IQ-4'] },
  { nom: 'doc-sans-git-show', fichier: 'docs/sauvegardes.md', avant: 'git show FETCH_HEAD:app/page.tsx', apres: 'puis relire le fichier', attendu: 'IQ-12' },
]
const rougesDe = (sortie) => [...new Set(sortie.split(/\r?\n/).map((l) => /^FAIL (IQ-\d+)\b/.exec(l)).filter(Boolean).map((m) => m[1]))]
async function autotest() {
  const borne = path.join(DEPOT, '.orchestre', 'travail', JUGE)
  const T = path.join(borne, 'autotest', 'temoin')
  supprimerSous(T, borne)
  fs.mkdirSync(path.join(T, 'scripts'), { recursive: true })
  fs.mkdirSync(path.join(T, 'docs'), { recursive: true })
  fs.copyFileSync(path.join(FIXTURES, 'instantane-quotidien.temoin.mjs'), path.join(T, T_SCRIPT))
  // La vraie doc sert de contexte, SANS sa propre section « Le code et l'arbre de travail » (écrite par 026-005) : sinon
  // IQ-12 la trouve avant celle du témoin, et le défaut planté doc-sans-git-show ne peut plus rougir.
  const docReelle = (lireOuNull(path.join(DEPOT, 'docs', 'sauvegardes.md')) || '# Sauvegardes\n').replace(/^##\s+Le code et l['’]arbre de travail[\s\S]*?(?=^##\s|(?![\s\S]))/m, '')
  fs.writeFileSync(path.join(T, 'docs', 'sauvegardes.md'), docReelle + fs.readFileSync(path.join(FIXTURES, 'sauvegardes.section.temoin.md'), 'utf8'))
  const lignes = []
  const dire = (l) => { console.log(l); lignes.push(l) }
  let ok = true
  try {
    dire(`témoin : ${versSlash(path.relative(DEPOT, T))} — scripts/instantane-quotidien.mjs et la section de docs/sauvegardes.md pris dans scripts/fixtures/026/securite/instantane/`)
    const moi = fileURLToPath(import.meta.url)
    // 25 min par juge : avec IQ-13 et IQ-14 (trois bacs de plus), un juge dure 2 à 4 min au calme, près de 10 sous charge.
    const juge = () => lancer(process.execPath, [moi, `--racine=${T}`], { cwd: T, delaiMs: 25 * 60_000 })
    const t0 = await juge()
    const r0 = rougesDe(t0.sortie)
    const vert = t0.code === 0 && !r0.length && CRITERES.every((c) => new RegExp(`^PASS ${c}\\b`, 'm').test(t0.sortie))
    dire(`${vert ? 'PASS' : 'FAIL'} AT-temoin — témoin en code ${t0.code}${r0.length ? `, rouges : ${r0.join(', ')}` : `, ${CRITERES[0]} à ${CRITERES.at(-1)} verts`} (${t0.duree.toFixed(0)} s)`)
    if (!vert) { ok = false; for (const l of t0.sortie.split(/\r?\n/).filter((x) => /^FAIL /.test(x))) dire(`    ${court(l, 240)}`) }
    for (const c of CAS_AUTOTEST) {
      const f = path.join(T, c.fichier)
      const original = fs.readFileSync(f, 'utf8')
      const nb = original.split(c.avant).length - 1
      if (nb !== 1) { ok = false; dire(`FAIL AT-${c.nom} — « avant » présent ${nb} fois dans ${c.fichier}`); continue }
      fs.writeFileSync(f, original.replace(c.avant, () => c.apres))
      let r
      try { r = await juge() } finally { fs.writeFileSync(f, original) }
      const rouges = rougesDe(r.sortie)
      const permis = new Set([c.attendu, ...(c.aussi || [])])
      const ligne = r.sortie.split(/\r?\n/).find((l) => new RegExp(`^FAIL ${c.attendu}\\b`).test(l))
      const bon = r.code !== 0 && !!ligne && rouges.every((x) => permis.has(x))
      if (!bon) ok = false
      dire(`${bon ? 'PASS' : 'FAIL'} AT-${c.nom} — ${c.fichier} muté → code ${r.code}, rouges ${rouges.join(', ') || 'aucun'} (attendu ${c.attendu}${c.aussi ? ` + ${c.aussi.join(', ')}` : ''})${ligne ? ` · « ${court(ligne, 150)} »` : ''}`)
    }
    const restaure = fs.readFileSync(path.join(T, T_SCRIPT), 'utf8') === fs.readFileSync(path.join(FIXTURES, 'instantane-quotidien.temoin.mjs'), 'utf8')
    if (!restaure) ok = false
    dire(`${restaure ? 'PASS' : 'FAIL'} AT-restauration — le témoin est revenu à l'original après chaque cas`)
    const restes = fs.existsSync(path.join(T, '.orchestre', 'travail', BAC)) ? fs.readdirSync(path.join(T, '.orchestre', 'travail', BAC)).filter((n) => n.startsWith('bac-')) : []
    if (restes.length) ok = false
    dire(`${restes.length ? 'FAIL' : 'PASS'} AT-menage — ${restes.length ? `${restes.length} bac(s) à sable laissé(s)` : 'aucun bac à sable laissé par les passages du juge'}`)
  } finally {
    supprimerSous(T, borne)
  }
  dire(`${JUGE} --autotest : ${ok ? 'PASS' : 'FAIL'} — ${CAS_AUTOTEST.length} défauts plantés`)
  const f = path.join(borne, 'autotest.log')
  fs.mkdirSync(borne, { recursive: true }); fs.writeFileSync(f, lignes.join('\n') + '\n')
  if (!fs.statSync(f).size) { console.log(`ERREUR ${JUGE} : rapport de 0 octet, refusé`); return 1 }
  return ok ? 0 : 1
}

// ── --reel : la sauvegarde en service (fiche 026-007) ────────────────────────────────────────────────────────────────
async function reel(o) {
  const rouges = []
  const noter = (id, ok, d) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${d}`); if (!ok) rouges.push(id) }
  const jour = paris()
  const env = { GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' }
  const distant = git(o.racine, ['ls-remote', DEPOT_SAUVEGARDE, 'refs/heads/instantane-*'], { env })
  const branches = Object.fromEntries((distant || '').split('\n').filter(Boolean).map((l) => l.split(/\s+/)).map(([s, r]) => [r, s]))
  noter('IQ-R1', !!branches[`refs/heads/instantane-${jour}`], distant === null ? 'git ls-remote du dépôt de sauvegarde impossible' : `refs/heads/instantane-${jour} ${branches[`refs/heads/instantane-${jour}`] ? `→ ${branches[`refs/heads/instantane-${jour}`].slice(0, 10)}` : 'absente'} (${Object.keys(branches).length} branche(s) instantane-*)`)
  const lignes = (lireOuNull(path.join(o.racine, '.orchestre', 'travail', 'sauvegardes.jsonl')) || '').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  const derniere = lignes.filter((l) => l.ok === true).at(-1)
  {
    const f = []
    if (!derniere) f.push('aucune ligne ok: true dans .orchestre/travail/sauvegardes.jsonl')
    else {
      const surDistant = derniere.branche ? branches[`refs/heads/${derniere.branche}`] : null
      if (surDistant !== derniere.commit) f.push(`la branche ${derniere.branche} porte ${surDistant?.slice(0, 10) || 'rien'} sur le dépôt, le journal ${String(derniere.commit).slice(0, 10)}`)
      const obj = git(o.racine, ['cat-file', '-p', String(derniere.commit)])
      const par = (obj || '').split('\n').filter((l) => l.startsWith('parent ')).map((l) => l.slice(7))
      if (par.length !== 1) f.push(`commit ${String(derniere.commit).slice(0, 10)} : ${obj === null ? 'introuvable en local' : `${par.length} parent(s)`}`)
      else {
        const ancetre = spawnSync('git', ['-C', o.racine, 'merge-base', '--is-ancestor', par[0], 'HEAD'], { windowsHide: true }).status === 0
        const dansReflog = (git(o.racine, ['reflog', '--format=%H']) || '').split('\n').includes(par[0])
        if (!ancetre && !dansReflog) f.push(`le parent ${par[0].slice(0, 10)} n'a jamais été le HEAD local (ni ancêtre de HEAD, ni dans le reflog)`)
      }
    }
    noter('IQ-R2', !f.length, f.length ? f.join(' · ') : `dernière ligne ok: true → ${derniere.branche} ${derniere.commit.slice(0, 10)}, présent sur le dépôt, parent = un HEAD local`)
  }
  {
    let statut = null
    try { statut = (await fetch('https://api.github.com/repos/benjaminfiliot-wq/presti-sauvegarde', { headers: { 'user-agent': 'presti-instantane-qa' } })).status } catch (e) { statut = `erreur ${e.message}` }
    noter('IQ-R3', statut === 404, `API GitHub sans authentification → ${statut} (404 attendu : dépôt privé)`)
  }
  {
    const r = spawnSync('schtasks', ['/Query', '/TN', TACHE, '/XML'], { windowsHide: true })
    let xml = r.stdout ? Buffer.from(r.stdout) : Buffer.alloc(0)
    let t = xml.includes(0) ? xml.toString('utf16le') : xml.toString('utf8')
    t = t.replace(/^﻿/, '')
    const f = []
    if (r.status !== 0 || !t.includes('<Task')) f.push(`tâche « ${TACHE} » introuvable`)
    else {
      if (!/<CalendarTrigger>[\s\S]*?<ScheduleByDay>[\s\S]*?<\/CalendarTrigger>/.test(t)) f.push('pas de déclencheur quotidien')
      if (!/<LogonTrigger>/.test(t)) f.push('pas de déclencheur à l’ouverture de session')
      if (!/<StartWhenAvailable>true<\/StartWhenAvailable>/.test(t)) f.push('StartWhenAvailable n’est pas true')
      if (!/<ExecutionTimeLimit>PT30M<\/ExecutionTimeLimit>/.test(t)) f.push('limite d’exécution différente de 30 min')
      const cmd = (/<Command>([\s\S]*?)<\/Command>/.exec(t) || [])[1] || ''
      const args = (/<Arguments>([\s\S]*?)<\/Arguments>/.exec(t) || [])[1] || ''
      if (!/node(\.exe)?"?\s*$/i.test(cmd.trim())) f.push(`action « ${court(cmd, 60)} » au lieu de node`)
      if (!/scripts[\\/]instantane-quotidien\.mjs/.test(args) || !/--pousser\b/.test(args)) f.push(`arguments « ${court(args, 80)} » sans scripts\\instantane-quotidien.mjs --pousser`)
    }
    noter('IQ-R4', !f.length, f.length ? f.join(' · ') : `tâche « ${TACHE} » : quotidienne et à l’ouverture de session, StartWhenAvailable, 30 min, node … scripts\\instantane-quotidien.mjs --pousser`)
  }
  {
    const age = derniere ? (Date.now() - Date.parse(derniere.date)) / 3_600_000 : null
    noter('IQ-R5', age !== null && age >= 0 && age < 36, age === null ? 'aucune ligne ok: true' : `dernière ligne ok: true il y a ${age.toFixed(1)} h (moins de 36 h attendu)`)
  }
  console.log(`${JUGE} --reel : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'PASS'}`)
  return rouges.length ? 1 : 0
}

const o = lireOptions(process.argv.slice(2))
const code = o.autotest ? await autotest() : o.reel ? await reel(o) : await juger(o)
process.exit(code)
