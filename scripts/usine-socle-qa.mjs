#!/usr/bin/env node
// scripts/usine-socle-qa.mjs — le juge du socle des agents sur l'usine Oracle (fiche 026-048, écrite par Claude Code).
//
// Usage :
//   node scripts/usine-socle-qa.mjs [--groupe=coffre,socle,surveillance] [--racine=<copie>]
//        juge les fichiers de l'arbre (ou d'une copie : mutations de 026-133 ; les jeux d'essai restent ceux du dépôt) :
//        coffre et socle → 026-050 ; surveillance → 026-053.
//   node scripts/usine-socle-qa.mjs --preuve-echecs
//        autotest des jeux d'essai (AT-1 à AT-9), puis chaque groupe lancé sur l'arbre de référence (commit REFERENCE, où
//        aucun fichier jugé n'existe) doit échouer avec CF-1, SO-1 et SV-1 en premier ; écrit echecs-attendus.md (026-048).
//   node scripts/usine-socle-qa.mjs --reel [--groupe=socle,surveillance]
//        l'usine elle-même, par ssh (bash -s) : RS-1 à RS-9 (mise en service, 026-058). N'écrit rien là-bas hors du coffre
//        d'essai de RS-6 (/tmp, effacé) ; ne lit jamais une valeur du vrai coffre.
//
// Codes : 0 tout est vert ; 1 un critère en échec ; 2 préalable manquant (bash introuvable, compilateur des doublures
// introuvable sous Windows, usine injoignable ou clé ssh absente en --reel, argument inconnu).
// Sortie : une ligne `PASS <critère> — …` ou `FAIL <critère> — …` par critère (suivie de `  ✗ <critère> …` pour le
// détail), dans l'ordre des critères, puis une ligne de bilan. Tout se passe sous .orchestre/travail/usine-socle-qa/.
//
// Ce que le juge fait lui-même (cahier du juge) : il tire au hasard les valeurs d'essai du coffre et le jeton du faux bus
// à chaque passage et les cherche dans chaque sortie, chaque erreur, chaque argv consigné et chaque journal ; les fausses
// clés sont assemblées à l'exécution (coffre/cas-valeurs.json), jamais écrites en clair ; il compte les requêtes reçues par
// le faux bus et les appels consignés par le faux ssh, jamais ce qu'un script dit avoir fait ; il lit les unités systemd par
// un analyseur INI et les scripts bash instruction par instruction (commentaires ôtés, here-documents rattachés) ; il lance
// presti-coffre.sh, presti-journal.sh et avec-coffre.mjs pour de vrai, sur des dossiers d'essai, jamais sur un vrai coffre ;
// il JOUE socle.sh et les scripts distants de maj, installer et arreter sur un banc de simulation (fixtures/…/banc-sim.sh :
// chemins absolus remis sous un bac, commandes système doublées et consignées) et juge ce qu'ils ont fait, pas seulement
// ce qu'ils contiennent (réparation du 27/09, après la revue Codex : .orchestre/preuves/026-048/reparation-2026-09-27.md) ;
// il refuse tout journal, coffre d'essai ou echecs-attendus.md de 0 octet.
//
// Doublures sous Windows : un `spawn` sans shell ne lance ni un .mjs ni un .cmd. Le juge compile donc (csc du .NET
// Framework, livré avec Windows) un petit lanceur .exe qui relaie argv, entrée et sorties vers un script Node ; copié sous
// les noms ssh.exe (PRESTI_SSH_BIN, et en tête du PATH pour qu'aucun ssh réel ne parte), scp.exe et powershell.exe.
// Git Bash n'a pas `flock` : le juge pose un flock de substitution dans le PATH de bash (poste seulement ; la vraie
// sérialisation se juge sur l'usine, RS-6).
//
// ── Contrat de la surveillance (scripts/usine/surveillance.mjs, 026-053), tel que ce juge le lance ──────────────────────
//   --une-mesure  = UN TOUR complet du service, à l'heure --maintenant=<ISO> : lecture de --proc, mesure calculée contre
//                   la lecture précédente gardée dans le dossier du journal (la toute première lecture ne donne pas de
//                   mesure), ligne au journal, battement s'il est dû (toutes les 15 min), point de 9 h (Paris), décision,
//                   alertes, relevé des IA (toutes les 15 min) ; puis code 0, sans exception, même bus injoignable.
//                   Chaque tour d'essai est un nouveau processus : tout ce qui doit survivre (lecture précédente, marques)
//                   vit dans le dossier du journal.
//   intervalle    = l'écart des horloges (--maintenant) de deux lectures (60 s entre deux tours d'essai) ; Δtotal nul → 0.
//   --proc=<d>    : <d>/stat, <d>/meminfo, <d>/net/dev, et <d>/statfs.json ({ bsize, blocks, bfree, bavail }, la forme
//                   de fs.statfsSync) pour le disque de la racine.
//   --bilan       : imprime les trois p95 des 7 derniers jours et le verdict : une ligne JSON { cpu, mem, res, verdict }
//                   (ou { p95: { cpu, mem, res }, verdict }), ou du texte « processeur x % · mémoire y % · réseau z % ·
//                   verdict v ».
//   --service --accelerer : un tour par seconde réelle, l'horloge avançant d'une minute par tour depuis --maintenant.
//   journal       : mesures-<AAAA-MM-JJ>.jsonl (jour de Paris) ne porte que { le, cpu, mem, res } ; les lignes
//                   { le, bus_injoignable } et { le, ia_injoignable } et les marques vont dans d'AUTRES fichiers du dossier.
//   IA            : --freellmapi=<url> (GET /api/usage, forme dans fixtures/026/usine-socle/freellmapi/reponses.json),
//                   --compteurs-ia=<d> (compteurs-<jour>.jsonl de 026-041), --echange-ia=<d> (quota-codex.json :
//                   { le, cinq_heures, semaine }) ; ia_bascule : « <ancien> → <nouveau> · <quota|erreur|choix> », objet
//                   ia:<nouveau> (quota si l'ancien est épuisé, erreur s'il est en erreur).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const NOM = 'usine-socle-qa'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const FIX = path.join(ICI, 'fixtures', '026', 'usine-socle')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'usine-socle-qa')
const PREUVES = path.join(DEPOT, '.orchestre', 'preuves', '026-048')
// Commit de référence de --preuve-echecs : HEAD le 26/09/2026, quand ce juge a été écrit ; aucun fichier jugé n'y existe.
const REFERENCE = '5012625'
const WIN = process.platform === 'win32'
const MINUTE = 60_000
const JOUR = 24 * 60 * MINUTE
const HOTE_ESSAI = 'essai@192.0.2.10' // TEST-NET-1 : jamais une vraie machine
const NOMS_PERMIS = ['PRESTI_JETON_CHEF', 'PRESTI_JETON_USINE', 'PRESTI_JETON_ATELIER', 'PRESTI_JETON_LIVREUR_USINE', 'PRESTI_JETON_FACTEUR_USINE', 'PRESTI_JETON_TELEGRAM', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'PRESTI_JETON_STANDARDISTE', 'PRESTI_JETON_FACTEUR', 'TELEGRAM_CODE_APPAIRAGE']
const PASSANTS = ['PATH', 'HOME', 'LANG', 'TZ', 'USER', 'PRESTI_HOTE', 'ORCHESTRE_CODEX_BIN', 'PLAYWRIGHT_BROWSERS_PATH', 'PRESTI_URL']
// Variables que libuv ajoute d'office à l'environnement d'un enfant sous Windows (src/win/process.c, required_vars).
const LIBUV_WIN = ['HOMEDRIVE', 'HOMEPATH', 'LOGONSERVER', 'PATH', 'SYSTEMDRIVE', 'SYSTEMROOT', 'TEMP', 'USERDOMAIN', 'USERNAME', 'USERPROFILE', 'WINDIR']
const GROUPES = ['coffre', 'socle', 'surveillance']
const FICHIERS = {
  coffreSh: 'scripts/usine/presti-coffre.sh',
  journalSh: 'scripts/usine/presti-journal.sh',
  socleSh: 'scripts/usine/socle.sh',
  avecCoffre: 'scripts/usine/avec-coffre.mjs',
  regles: 'scripts/usine/coffre-regles.mjs',
  usineCoffre: 'scripts/usine-coffre.mjs',
  usineAgents: 'scripts/usine-agents.mjs',
  surveillance: 'scripts/usine/surveillance.mjs',
  unite: 'scripts/usine/systemd/presti-surveillance.service',
  doc: 'docs/agents/usine.md',
}

// ── arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2)
const CONNUS = ['groupe', 'racine', 'preuve-echecs', 'reel']
for (const a of ARGS) {
  const m = /^--([a-z-]+)(=.*)?$/.exec(a)
  if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (attendus : --groupe=, --racine=, --preuve-echecs, --reel)`); process.exit(2) }
}
const opt = (n) => { const a = ARGS.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? undefined : (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) }
const RACINE = typeof opt('racine') === 'string' ? path.resolve(opt('racine')) : DEPOT
const R_ = (rel) => path.join(RACINE, ...rel.split('/'))

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────────────────────
const existe = (p) => { try { fs.accessSync(p); return true } catch { return false } }
const lire = (p) => fs.readFileSync(p, 'utf8')
const lireSi = (p) => (existe(p) ? lire(p) : null)
const versSlash = (p) => String(p).split(path.sep).join('/')
const rel = (p) => versSlash(path.relative(DEPOT, p))
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')
const lf = (s) => String(s).replace(/\r\n?/g, '\n')
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
const nettoyer = (d) => { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* un fichier encore tenu : le dossier suivant sera neuf */ } }
const dossierNeuf = (...morceaux) => { const d = path.join(TRAVAIL, ...morceaux); nettoyer(d); fs.mkdirSync(d, { recursive: true }); return d }
const normApos = (s) => String(s).replace(/[’‘`´]/g, "'")
function aleatoire(jeu, n, premierSur = false) {
  const alph = { lettres: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', chiffres: '0123456789', code: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' }[jeu]
  const octets = crypto.randomBytes(n * 2)
  let s = ''
  for (let i = 0; i < n; i++) {
    let c = alph[octets[i] % alph.length]
    // Jamais un début de forme interdite (eyJ, sk, sb, rk, whsec) tiré par hasard en tête d'une valeur à accepter.
    if (premierSur && i === 0) while ('esrw'.includes(c)) c = alph[crypto.randomInt(alph.length)]
    s += c
  }
  return s
}
const lettres = (n) => aleatoire('lettres', n, true)
const HASARD = lettres(12) // marqueur de ce passage

// ── le rapport : une ligne par critère, dans l'ordre ─────────────────────────────────────────────────────────────
class Rapport {
  constructor(titre) { this.titre = titre; this.resultats = [] }
  pass(c, m) { this.resultats.push({ c, ok: true, m }); console.log(`PASS ${c} — ${court(m, 400)}`) }
  fail(c, m, details = []) {
    this.resultats.push({ c, ok: false, m })
    console.log(`FAIL ${c} — ${court(m, 400)}`)
    for (const d of details.slice(1, 14)) console.log(`  ✗ ${c} ${court(d, 300)}`)
  }
  note(m) { console.log(`  · ${court(m, 400)}`) }
  get rouges() { return [...new Set(this.resultats.filter((r) => !r.ok).map((r) => r.c))] }
}
/** Un critère : `corps(D)` remplit la liste des défauts D et rend le message de réussite. Une exception du juge est un échec. */
async function juger(R, c, corps) {
  const D = []
  let m = ''
  try { m = await corps(D) } catch (e) { D.push(`exception du juge : ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`) }
  if (D.length) R.fail(c, D[0], D)
  else R.pass(c, m || 'vert')
}

// ── lancer un processus (toujours asynchrone : le faux bus vit dans ce processus) ──────────────────────────────────
function tuerArbre(enfant) {
  try {
    if (WIN) spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    else enfant.kill('SIGKILL')
  } catch { /* déjà mort */ }
}
function demarrer(fichier, args, { cwd = RACINE, env, entree, delaiMs = 60_000 } = {}) {
  const debut = Date.now()
  let enfant
  const so = [], se = []
  let expire = false
  const fin = new Promise((resoudre) => {
    let fini = false
    const finir = (r) => { if (fini) return; fini = true; clearTimeout(minuterie); resoudre({ ...r, sortie: Buffer.concat(so).toString('utf8'), erreur: Buffer.concat(se).toString('utf8') + (r.erreurLancement ? `\n${r.erreurLancement}` : ''), duree: (Date.now() - debut) / 1000, expire }) }
    const minuterie = setTimeout(() => { expire = true; if (enfant) tuerArbre(enfant) }, delaiMs)
    try { enfant = spawn(fichier, args, { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }) } catch (e) { return finir({ code: null, erreurLancement: `lancement impossible : ${e.message}` }) }
    enfant.stdout.on('data', (d) => so.push(d))
    enfant.stderr.on('data', (d) => se.push(d))
    enfant.on('error', (e) => finir({ code: null, erreurLancement: `lancement impossible : ${e.message}` }))
    enfant.on('close', (code, signal) => finir({ code, signal }))
    enfant.stdin.on('error', () => {})
    if (entree !== undefined && entree !== null) enfant.stdin.end(entree)
    else enfant.stdin.end()
  })
  return { get enfant() { return enfant }, fin }
}
const lancer = (fichier, args, o) => demarrer(fichier, args, o).fin
const pile = (s) => /\n\s+at .+:\d+:\d+\)?/.test(s) // une pile d'exception non rattrapée

// Environnement de base des lancements : jamais celui du juge en entier (aucune de ses variables ne doit fuir).
const BASE_ENV = (() => {
  const e = {}
  for (const [k, v] of Object.entries(process.env)) if (/^(systemroot|windir|systemdrive|temp|tmp|comspec|pathext)$/i.test(k)) e[k] = v
  return e
})()
const PATH_SYSTEME = process.env.PATH || process.env.Path || ''
function envDe(extra = {}, cheminsDevant = [], { pathSysteme = true } = {}) {
  const e = { ...BASE_ENV }
  e.PATH = [...cheminsDevant, path.dirname(process.execPath), pathSysteme ? PATH_SYSTEME : ''].filter(Boolean).join(path.delimiter)
  for (const [k, v] of Object.entries(extra)) { if (v === undefined || v === null) delete e[k]; else e[k] = String(v) }
  return e
}

// ── doublures : lanceur .exe (Windows), faux ssh, scp, powershell, flock ──────────────────────────────────────────
const LANCEUR_CS = `using System; using System.Diagnostics; using System.IO; using System.Text; using System.Threading;
// Lanceur des doublures du juge usine-socle-qa (026-048) : relaie argv, entrée et sorties vers « node <script> », lus
// dans <exe>.cible (ligne 1 : node ; ligne 2 : script ; puis NOM=valeur ajoutés à l'environnement, @VAR = valeur de VAR).
class Lanceur {
  static string Q(string a) {
    if (a.Length > 0 && a.IndexOfAny(new char[] { ' ', '\\t', '"', '\\n', '\\v' }) < 0) return a;
    var sb = new StringBuilder("\\"");
    for (int i = 0; i < a.Length; i++) {
      int bs = 0; while (i < a.Length && a[i] == '\\\\') { bs++; i++; }
      if (i == a.Length) { sb.Append('\\\\', bs * 2); break; }
      if (a[i] == '"') { sb.Append('\\\\', bs * 2 + 1); sb.Append('"'); } else { sb.Append('\\\\', bs); sb.Append(a[i]); }
    }
    sb.Append('"'); return sb.ToString();
  }
  static int Main(string[] args) {
    string moi = Process.GetCurrentProcess().MainModule.FileName;
    string[] c = File.ReadAllLines(moi + ".cible");
    var psi = new ProcessStartInfo(c[0]);
    var sb = new StringBuilder(Q(c[1]));
    foreach (var a in args) { sb.Append(' '); sb.Append(Q(a)); }
    psi.Arguments = sb.ToString(); psi.UseShellExecute = false;
    for (int i = 2; i < c.Length; i++) {
      int k = c[i].IndexOf('='); if (k <= 0) continue;
      string n = c[i].Substring(0, k), v = c[i].Substring(k + 1);
      if (v.StartsWith("@")) v = Environment.GetEnvironmentVariable(v.Substring(1)) ?? "";
      psi.EnvironmentVariables[n] = v;
    }
    psi.RedirectStandardInput = true; psi.RedirectStandardOutput = true; psi.RedirectStandardError = true;
    var p = Process.Start(psi);
    var tin = new Thread(() => { try { Console.OpenStandardInput().CopyTo(p.StandardInput.BaseStream); } catch { } try { p.StandardInput.Close(); } catch { } });
    tin.IsBackground = true; tin.Start();
    var so = Console.OpenStandardOutput(); var se = Console.OpenStandardError();
    var tout = new Thread(() => { p.StandardOutput.BaseStream.CopyTo(so); so.Flush(); }); tout.Start();
    var terr = new Thread(() => { p.StandardError.BaseStream.CopyTo(se); se.Flush(); }); terr.Start();
    p.WaitForExit(); tout.Join(); terr.Join();
    return p.ExitCode;
  }
}
`
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`
let lanceurExe = null
function lanceur() {
  if (lanceurExe) return lanceurExe
  const dir = path.join(TRAVAIL, 'lanceur')
  const exe = path.join(dir, `lanceur-${sha256(LANCEUR_CS).slice(0, 12)}.exe`)
  if (existe(exe) && fs.statSync(exe).size > 0) return (lanceurExe = exe)
  fs.mkdirSync(dir, { recursive: true })
  const cs = path.join(dir, 'lanceur.cs')
  fs.writeFileSync(cs, LANCEUR_CS)
  const windir = process.env.WINDIR || process.env.windir || 'C:\\Windows'
  const csc = [path.join(windir, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'), path.join(windir, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')].find(existe)
  if (!csc) { console.error(`✗ ${NOM} : compilateur csc du .NET Framework introuvable : les doublures .exe (ssh, scp, powershell) ne peuvent pas être fabriquées`); process.exit(2) }
  const r = spawnSync(csc, ['/nologo', '/target:exe', '/optimize+', `/out:${exe}`, cs], { encoding: 'utf8', windowsHide: true })
  if (r.status !== 0 || !existe(exe)) { console.error(`✗ ${NOM} : compilation du lanceur impossible : ${court(`${r.stdout}${r.stderr}`, 300)}`); process.exit(2) }
  return (lanceurExe = exe)
}
/** Pose une doublure exécutable `nom` (ssh, scp, powershell…) qui lance `node <script>`, avec des variables ajoutées. */
function poserDouble(dossier, nom, script, envAjout = {}) {
  fs.mkdirSync(dossier, { recursive: true })
  const lignesEnv = Object.entries(envAjout).map(([k, v]) => `${k}=${v}`)
  if (WIN) {
    const exe = path.join(dossier, `${nom}.exe`)
    if (!existe(exe) || fs.statSync(exe).size !== fs.statSync(lanceur()).size) fs.copyFileSync(lanceur(), exe)
    fs.writeFileSync(`${exe}.cible`, `${[process.execPath, script, ...lignesEnv].join('\n')}\n`)
    return exe
  }
  const f = path.join(dossier, nom)
  const exports = Object.entries(envAjout).map(([k, v]) => (String(v).startsWith('@') ? `export ${k}="$${String(v).slice(1)}"` : `export ${k}=${shq(v)}`))
  fs.writeFileSync(f, `#!/bin/sh\n${exports.join('\n')}\nexec ${shq(process.execPath)} ${shq(script)} "$@"\n`)
  fs.chmodSync(f, 0o755)
  return f
}
const FAUX_SSH = path.join(FIX, 'faux-ssh.mjs')
let DOUBLES = null
/** Les doublures, posées une fois par passage sous travail/doublures/. */
function doublures() {
  if (DOUBLES) return DOUBLES
  const d = path.join(TRAVAIL, 'doublures')
  DOUBLES = {
    sshBin: poserDouble(path.join(d, 'bin-ssh'), 'ssh', FAUX_SSH, { FAUX_SSH_VIA: 'PRESTI_SSH_BIN' }),
    dirPath: path.join(d, 'bin-path'),
    dirPs: path.join(d, 'bin-ps'),
  }
  // En tête du PATH : un ssh qui n'est pas PRESTI_SSH_BIN est consigné (et jugé), jamais un vrai ; scp est interdit.
  poserDouble(DOUBLES.dirPath, 'ssh', FAUX_SSH, { FAUX_SSH_VIA: 'ssh-du-PATH' })
  poserDouble(DOUBLES.dirPath, 'scp', FAUX_SSH, { FAUX_SSH_VIA: 'scp', FAUX_SSH_JOURNAL: '@FAUX_SCP_JOURNAL', FAUX_SSH_MODE: 'enregistrer' })
  poserDouble(DOUBLES.dirPs, 'powershell', FAUX_SSH, { FAUX_SSH_VIA: 'powershell', FAUX_SSH_JOURNAL: '@FAUX_PS_JOURNAL', FAUX_SSH_MODE: 'enregistrer' })
  return DOUBLES
}
/** Un banc ssh : des journaux neufs, et l'environnement qui désigne les doublures. */
function bancSsh(dossier) {
  const db = doublures()
  const j = { ssh: path.join(dossier, 'ssh-journal'), scp: path.join(dossier, 'scp-journal'), ps: path.join(dossier, 'ps-journal') }
  for (const x of Object.values(j)) fs.mkdirSync(x, { recursive: true })
  return {
    journaux: j,
    env: (mode = 'enregistrer', extra = {}) => ({ PRESTI_SSH_BIN: db.sshBin, FAUX_SSH_JOURNAL: j.ssh, FAUX_SCP_JOURNAL: j.scp, FAUX_PS_JOURNAL: j.ps, FAUX_SSH_MODE: mode, PRESTI_USINE: HOTE_ESSAI, ...extra }),
    chemins: [db.dirPath],
    appels: () => lireAppels(j.ssh),
    scp: () => lireAppels(j.scp),
    ps: () => lireAppels(j.ps),
    vider: () => { for (const x of Object.values(j)) { nettoyer(x); fs.mkdirSync(x, { recursive: true }) } },
  }
}
function lireAppels(dossier) {
  if (!existe(dossier)) return []
  return fs.readdirSync(dossier).filter((f) => f.endsWith('.argv.json')).sort().map((f) => {
    const base = path.join(dossier, f.slice(0, -'.argv.json'.length))
    const a = JSON.parse(lire(`${base}.argv.json`))
    const stdin = existe(`${base}.stdin`) ? fs.readFileSync(`${base}.stdin`) : Buffer.alloc(0)
    return { ...a, stdin, stdinTexte: stdin.toString('utf8'), fichier: `${base}.argv.json` }
  })
}
/** La commande distante d'un appel ssh : tout ce qui suit l'hôte, joint par des blancs. */
function commandeDistante(appel) {
  const a = appel.argv
  const i = a.findIndex((x) => x === HOTE_ESSAI || /^[^-][^\s]*@[^\s]+$/.test(x))
  return i < 0 ? null : a.slice(i + 1).join(' ').replace(/\s+/g, ' ').trim()
}
/** Les défauts de forme d'un appel ssh : BatchMode, la clé presti-usine, l'hôte, jamais bash -l, par PRESTI_SSH_BIN. */
function defautsAppelSsh(appel, hote = HOTE_ESSAI) {
  const D = []
  const a = appel.argv
  const batch = a.some((x, i) => (x === '-o' && a[i + 1] === 'BatchMode=yes') || x === '-oBatchMode=yes')
  if (!batch) D.push(`ssh sans « -o BatchMode=yes » : ${court(a.join(' '), 160)}`)
  const iCle = a.indexOf('-i')
  if (iCle < 0 || !/[\\/]\.ssh[\\/]presti-usine$/.test(a[iCle + 1] || '')) D.push(`ssh sans la clé ~/.ssh/presti-usine (-i) : ${court(a.join(' '), 160)}`)
  if (!a.includes(hote)) D.push(`ssh vers un autre hôte que PRESTI_USINE (${hote}) : ${court(a.join(' '), 160)}`)
  if (a.some((x) => /(^|\s)bash\s+-l\b|(^|\s)-l(\s|$)/.test(x)) || a.includes('-l')) D.push(`ssh avec « -l » ou « bash -l » : ${court(a.join(' '), 160)}`)
  if (appel.via && appel.via !== 'PRESTI_SSH_BIN') D.push(`ssh lancé par le ${appel.via} et non par PRESTI_SSH_BIN`)
  return D
}

// ── bash : le trouver, lancer un script, et le lire instruction par instruction ────────────────────────────────────
let BASH = undefined
function trouverBash() {
  if (BASH !== undefined) return BASH
  for (const d of PATH_SYSTEME.split(path.delimiter)) {
    if (!d) continue
    if (WIN && (/\\windows\\system32\\?$/i.test(d) || /\\windowsapps\\?$/i.test(d))) continue // lanceurs de WSL, pas un bash du poste
    const f = path.join(d, WIN ? 'bash.exe' : 'bash')
    if (existe(f)) return (BASH = f)
  }
  if (WIN && existe('C:/Program Files/Git/bin/bash.exe')) return (BASH = 'C:/Program Files/Git/bin/bash.exe')
  return (BASH = null)
}
let FLOCK_DIR = undefined
function dossierFlock() {
  if (FLOCK_DIR !== undefined) return FLOCK_DIR
  const r = spawnSync(trouverBash(), ['-c', 'command -v flock'], { encoding: 'utf8', windowsHide: true, env: envDe() })
  if (r.status === 0 && r.stdout.trim()) return (FLOCK_DIR = null)
  const d = path.join(TRAVAIL, 'doublures', 'bin-bash')
  fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(path.join(d, 'flock'), [
    '#!/bin/sh',
    '# flock de substitution du juge usine-socle-qa (026-048) : Git Bash n\'en a pas. Poste seulement, jamais sur l\'usine.',
    '[ -n "${FAUX_FLOCK_JOURNAL:-}" ] && echo "flock $*" >> "$FAUX_FLOCK_JOURNAL"',
    'while [ $# -gt 0 ]; do case "$1" in -w|-E|--timeout|--conflict-exit-code) shift 2 ;; -*) shift ;; *) break ;; esac; done',
    '[ $# -eq 0 ] && exit 0',
    'case "$1" in *[!0-9]*) ;; *) exit 0 ;; esac',
    'shift',
    '[ $# -eq 0 ] && exit 0',
    'if [ "$1" = "-c" ]; then shift; exec sh -c "$1"; fi',
    'exec "$@"', ''].join('\n'))
  try { fs.chmodSync(path.join(d, 'flock'), 0o755) } catch { /* NTFS */ }
  return (FLOCK_DIR = d)
}
const copiesBash = new Map()
/** Copie LF d'un script bash (le poste est en core.autocrlf=true), chemin à barres obliques pour bash. */
function copieBash(fichier) {
  const cle = `${fichier}|${existe(fichier) ? sha256(fs.readFileSync(fichier)) : ''}`
  if (copiesBash.has(cle)) return copiesBash.get(cle)
  const d = path.join(TRAVAIL, 'bash')
  fs.mkdirSync(d, { recursive: true })
  const c = path.join(d, `${path.basename(fichier)}.${sha256(cle).slice(0, 8)}`)
  fs.writeFileSync(c, lf(lire(fichier)))
  const v = versSlash(c)
  copiesBash.set(cle, v)
  return v
}
function lancerBash(fichier, args, { env = {}, entree, delaiMs = 30_000 } = {}) {
  const chemins = [dossierFlock()].filter(Boolean)
  return lancer(trouverBash(), [copieBash(fichier), ...args], { cwd: TRAVAIL, env: envDe({ LANG: 'C.UTF-8', ...env }, chemins), entree, delaiMs })
}

// ── le banc de simulation (réparation du 27/09) : un script distant JOUÉ, pas seulement lu ────────────────────────────
// La revue Codex du 27/09 a laissé verts SO-2 (useradd sous une condition inversée), SO-4 (chown sans -R), SO-5 (garde de
// maj inversée) et SO-6 (installer qui saute les unités) : la lecture du texte trouvait les bonnes commandes, pas ce
// qu'elles font. Le banc joue le script (socle.sh, ou ce que usine-agents.mjs envoie à ssh) sous bash : ses chemins absolus
// (/etc, /srv, /home, /usr, /var, /opt) sont remis sous <bac>/racine, et les commandes système sont les doublures de
// fixtures/…/banc-sim.sh, qui consignent chaque appel et ne touchent rien hors du bac.
const BANC_SIM = path.join(FIX, 'banc-sim.sh')
let nSim = 0
/** Rend { code, sortie, erreur, appels: [{ sous, cmd, args }] (chemins remis en clair), contenu(rel) : noms d'un dossier du bac }. */
async function simuler(script, { nom, env = {}, preparer } = {}) {
  const d = dossierNeuf('sim', `${String(++nSim).padStart(2, '0')}-${nom}`)
  const racine = path.join(d, 'racine')
  const sous = (relatif) => path.join(racine, ...relatif.split('/'))
  for (const x of ['tmp', 'home-usine']) fs.mkdirSync(sous(x), { recursive: true })
  if (preparer) preparer(sous)
  const Rs = versSlash(racine)
  const remappe = lf(script).replace(/(^|[\s"'=(:;|&<>`])\/(etc|srv|home|usr|var|opt)(?=\/)/g, (m, avant, dossier) => `${avant}${Rs}/${dossier}`)
  const f = path.join(d, 'script.sh')
  fs.writeFileSync(f, `${lf(lire(BANC_SIM))}\n${remappe}\n`)
  const journal = path.join(d, 'journal')
  fs.writeFileSync(journal, '')
  const r = await lancer(trouverBash(), [versSlash(f)], { cwd: d, env: envDe({ LANG: 'C.UTF-8', SIM_JOURNAL: versSlash(journal), SIM_RACINE: Rs, HOME: `${Rs}/home-usine`, TMPDIR: `${Rs}/tmp`, ...env }), delaiMs: 30_000 })
  const appels = lf(lire(journal)).split('\n').filter(Boolean).map((l) => { const [qui, cmd, ...args] = l.split('\x1f').map((x) => x.split(Rs).join('')); return { sous: qui, cmd, args } })
  return { ...r, appels, contenu: (relatif) => (existe(sous(relatif)) ? fs.readdirSync(sous(relatif)).sort() : []) }
}

/** Analyse d'un script bash : instructions (commentaires ôtés, lignes suivies jointes, séparées par ; && || & et fin de
 *  ligne hors guillemets et hors $( )), here-documents rattachés à l'instruction qui les ouvre, pile des if/for/while
 *  qui l'entourent, et variables affectées au plus haut niveau (pour déplier $X, ${X}, ${X:-défaut}, ~ et $(dirname …)). */
function analyserBash(source) {
  const s = lf(source)
  const brutes = []
  let cur = ''
  let ligne = 1
  let debut = 1
  let sep = '\n'
  const pileCtx = []
  let heredocs = [] // en attente : { delim, tiret, index }
  const finir = (separateur) => {
    const t = cur.trim()
    if (t) brutes.push({ brut: t, ligne: debut, sepAvant: sep, heredoc: null })
    cur = ''
    sep = separateur
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const top = pileCtx[pileCtx.length - 1]
    if (top === 'sq') { cur += c; if (c === "'") pileCtx.pop(); if (c === '\n') ligne++; continue }
    if (c === '\\') {
      if (s[i + 1] === '\n') { i++; ligne++; cur += ' '; continue }
      cur += c + (s[i + 1] ?? ''); i++; continue
    }
    if (top === 'dq') {
      cur += c
      if (c === '"') pileCtx.pop()
      else if (c === '$' && s[i + 1] === '(') { pileCtx.push('cmd'); cur += '('; i++ } else if (c === '`') pileCtx.push('bt')
      if (c === '\n') ligne++
      continue
    }
    if (top === 'bt') { cur += c; if (c === '`') pileCtx.pop(); if (c === '\n') ligne++; continue }
    if (c === "'") { pileCtx.push('sq'); cur += c; continue }
    if (c === '"') { pileCtx.push('dq'); cur += c; continue }
    if (c === '`') { pileCtx.push('bt'); cur += c; continue }
    if (c === '$' && s[i + 1] === '(') { pileCtx.push('cmd'); cur += '$('; i++; continue }
    if (c === '#' && (cur === '' || /[\s;&|(]$/.test(cur)) && !/\$$/.test(cur)) { while (i < s.length && s[i] !== '\n') i++; i--; continue }
    if (c === '(') {
      if (!pileCtx.length && /[A-Za-z_][\w-]*\s*$/.test(cur) && s[i + 1] === ')') { cur += '()'; i++; continue } // définition de fonction
      pileCtx.push('par'); cur += c; continue
    }
    if (c === ')') { if (top === 'cmd' || top === 'par') pileCtx.pop(); cur += c; continue }
    if (c === '<' && s[i + 1] === '<' && s[i + 2] !== '<') {
      const m = /^<<(-?)\s*(['"]?)([A-Za-z_][\w]*)\2/.exec(s.slice(i))
      if (m) { heredocs.push({ delim: m[3], tiret: !!m[1], index: brutes.length }); cur += m[0]; i += m[0].length - 1; continue }
    }
    if (pileCtx.length) { cur += c; if (c === '\n') ligne++; continue }
    if (c === '\n') {
      finir('\n')
      ligne++
      if (heredocs.length) {
        for (const h of heredocs) {
          const corps = []
          while (i + 1 < s.length) {
            const j = s.indexOf('\n', i + 1)
            const l = s.slice(i + 1, j < 0 ? s.length : j)
            i = j < 0 ? s.length : j
            ligne++
            if ((h.tiret ? l.replace(/^\t+/, '') : l) === h.delim) break
            corps.push(l)
          }
          const cible = brutes[h.index] || brutes[brutes.length - 1]
          if (cible) cible.heredoc = (cible.heredoc ? `${cible.heredoc}\n` : '') + corps.join('\n')
        }
        heredocs = []
      }
      debut = ligne
      continue
    }
    if (c === ';') { if (s[i + 1] === ';') i++; finir(';'); continue }
    if (c === '&' && s[i + 1] === '&') { i++; finir('&&'); continue }
    if (c === '|' && s[i + 1] === '|') { i++; finir('||'); continue }
    if (c === '&' && s[i + 1] !== '>' && !/[<>]$/.test(cur)) { finir('&'); continue }
    cur += c
  }
  finir('\n')
  // Structure, variables, textes dépliés.
  const vars = new Map()
  const pileStruct = []
  const instrs = []
  let liste = []
  for (const b of brutes) {
    let t = b.brut.replace(/\s+/g, ' ').trim()
    const motsCle = []
    for (;;) {
      const m = /^(then|do|else|\{|\}|!|time)(\s+|$)/.exec(t)
      if (!m || (m[1] === '}' && !t.slice(1).trim())) break
      motsCle.push(m[1]); t = t.slice(m[0].length)
    }
    if (motsCle.includes('else') && pileStruct.length && pileStruct[pileStruct.length - 1].type === 'if') pileStruct[pileStruct.length - 1].sinon = true
    let structure = null
    if (/^if\s/.test(t)) structure = 'if'
    else if (/^elif\s/.test(t)) structure = 'elif'
    else if (/^fi\b/.test(t)) structure = 'fi'
    else if (/^(for|while|until|select)\s/.test(t)) structure = 'boucle'
    else if (/^done\b/.test(t)) structure = 'done'
    else if (/^case\s/.test(t)) structure = 'case'
    else if (/^esac\b/.test(t)) structure = 'esac'
    else if (/^(function\s+[A-Za-z_][\w-]*|[A-Za-z_][\w-]*\s*\(\))\s*\{?$/.test(t)) structure = 'fonction'
    else if (t === '}') structure = 'accolade'
    if (b.sepAvant === ';' || b.sepAvant === '\n' || b.sepAvant === '&') liste = []
    if (!t) continue // « then », « do », « else » ou « { » seuls sur leur ligne
    const ins = {
      index: instrs.length, ligne: b.ligne, brut: b.brut, texte: t, heredoc: b.heredoc, structure,
      conds: pileStruct.filter((p) => p.type === 'if' || p.type === 'case').map((p) => p.texte),
      boucles: pileStruct.filter((p) => p.type === 'boucle').map((p) => p.texte),
      fonction: (pileStruct.find((p) => p.type === 'fonction') || {}).texte || null,
      sepAvant: b.sepAvant,
      avantDansListe: [...liste],
    }
    const cond = t.replace(/^(if|elif|while|until)\s+/, '')
    if (structure === 'if') pileStruct.push({ type: 'if', texte: cond })
    else if (structure === 'elif' && pileStruct.length) pileStruct[pileStruct.length - 1].texte = cond
    else if (structure === 'fi' || structure === 'done' || structure === 'esac') pileStruct.pop()
    else if (structure === 'boucle') pileStruct.push({ type: 'boucle', texte: t })
    else if (structure === 'case') pileStruct.push({ type: 'case', texte: t })
    else if (structure === 'fonction') pileStruct.push({ type: 'fonction', texte: t })
    else if (structure === 'accolade' && pileStruct.length && pileStruct[pileStruct.length - 1].type === 'fonction') pileStruct.pop()
    const aff = /^(?:export\s+|readonly\s+|local\s+|declare\s+(?:-\w+\s+)*)?([A-Za-z_]\w*)=(.*)$/.exec(t)
    if (aff && !/\s/.test(aff[2].replace(/"[^"]*"|'[^']*'|\$\([^)]*\)/g, ''))) {
      ins.affecte = aff[1]
      vars.set(aff[1], deguillemeter(aff[2]))
    }
    ins.vars = new Map(vars)
    ins.plat = aplatir(t, ins.vars)
    ins.mots = motsDe(ins.plat)
    ins.commande = ins.mots[0] || ''
    instrs.push(ins)
    liste.push(ins)
  }
  const texteSansCommentaires = instrs.map((i) => `${i.brut}${i.heredoc !== null ? `\n${i.heredoc}` : ''}`).join('\n')
  return { instrs, texte: texteSansCommentaires, vars }
}
/** Un source JavaScript sans ses commentaires (approché : // en fin de ligne hors chaîne simple, et blocs /* … *\/). */
function sansCommentairesJs(s) {
  return lf(s).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
}
function deguillemeter(v) {
  let s = String(v).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1)
  return s
}
function deplier(texte, vars, profondeur = 0) {
  if (profondeur > 6) return texte
  // Une variable prise d'une substitution de commande ($(mktemp …)) reste nommée : on ne sait pas ce qu'elle vaudra ;
  // seul $(dirname X) se déplie.
  const valeur = (n) => {
    const v = vars.get(n)
    if (/^(\$\(|`)/.test(v) && !/^\$\(\s*dirname\s/.test(v)) return `$${n}`
    return deplier(v, vars, profondeur + 1)
  }
  let t = String(texte)
  t = t.replace(/(^|[\s=:"'])~(?=\/|$|\s)/g, '$1$HOME')
  t = t.replace(/(^|[\s=:"'])~agents(?=\/|$|\s)/g, '$1/home/agents')
  t = t.replace(/\$\{([A-Za-z_]\w*)\}/g, (m, n) => (vars.has(n) ? valeur(n) : `$${n}`))
  t = t.replace(/\$\{([A-Za-z_]\w*)(:?[-=])([^}]*)\}/g, (m, n, _o, def) => (vars.has(n) ? valeur(n) : deplier(def, vars, profondeur + 1)))
  t = t.replace(/\$([A-Za-z_]\w*)/g, (m, n) => (vars.has(n) ? valeur(n) : m))
  t = t.replace(/\$\(\s*dirname\s+["']?([^"')]+)["']?\s*\)/g, (m, p) => path.posix.dirname(p))
  return t
}
/** Le texte d'une instruction déplié, sans guillemets, sans le préfixe sudo. */
function aplatir(t, vars) {
  let p = deplier(t, vars).replace(/["']/g, '').replace(/\s+/g, ' ').trim()
  const m = motsDe(p)
  if (m[0] === 'sudo') {
    let j = 1
    while (j < m.length && m[j].startsWith('-')) j += ['-u', '-g', '-C', '-D', '-h', '-p', '-r', '-t', '-U'].includes(m[j]) ? 2 : 1
    p = m.slice(j).join(' ')
  }
  return p
}
function accolades(mot) {
  const m = /^(.*?)\{([^{}]*,[^{}]*)\}(.*)$/.exec(mot)
  if (!m) return [mot]
  return m[2].split(',').flatMap((x) => accolades(`${m[1]}${x}${m[3]}`))
}
const motsDe = (p) => String(p).split(/\s+/).filter(Boolean).flatMap(accolades)
const sansSlashFinal = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p)
/** Les options d'une commande à la GNU : { opts: Map, args: [] } (options courtes à argument données). */
function options(mots, avecArgument) {
  const opts = new Map(), args = []
  for (let i = 1; i < mots.length; i++) {
    const w = mots[i]
    if (w === '--') { args.push(...mots.slice(i + 1)); break }
    if (/^--[\w-]+=/.test(w)) { const k = w.indexOf('='); opts.set(w.slice(0, k), w.slice(k + 1)); continue }
    if (/^--[\w-]+$/.test(w)) { if (avecArgument.includes(w)) { opts.set(w, mots[i + 1]); i++ } else opts.set(w, true); continue }
    if (/^-[A-Za-z]+$/.test(w)) {
      for (let k = 1; k < w.length; k++) {
        const o = `-${w[k]}`
        if (avecArgument.includes(o)) { opts.set(o, w.slice(k + 1) || mots[++i]); break }
        opts.set(o, true)
      }
      continue
    }
    args.push(w)
  }
  return { opts, args }
}
/** Les droits finaux posés par un script sur un chemin : { mode, proprio } (dans l'ordre ; -R vaut pour les descendants). */
function droitsPoses(instrs) {
  const e = []
  const poser = (p, cle, v, recursif = false) => e.push({ p: sansSlashFinal(p), cle, v, recursif })
  for (const ins of instrs) {
    const m = ins.mots
    const recursif = m.slice(1).some((x) => /^-[A-Za-z]*R/.test(x) || x === '--recursive')
    if (m[0] === 'install' && m.some((x) => x === '-d' || x === '--directory' || /^-[A-Za-z]*d[A-Za-z]*$/.test(x))) {
      const { opts, args } = options(m, ['-m', '--mode', '-o', '--owner', '-g', '--group'])
      for (const p of args) {
        if (opts.get('-m') || opts.get('--mode')) poser(p, 'mode', String(opts.get('-m') || opts.get('--mode')))
        if (opts.get('-o') || opts.get('--owner')) poser(p, 'proprio', String(opts.get('-o') || opts.get('--owner')))
      }
    } else if (m[0] === 'mkdir') {
      const { opts, args } = options(m, ['-m', '--mode'])
      for (const p of args) if (opts.get('-m') || opts.get('--mode')) poser(p, 'mode', String(opts.get('-m') || opts.get('--mode')))
    } else if (m[0] === 'chmod') {
      const a = m.slice(1).filter((x) => !/^-[A-Za-z]+$/.test(x) && !x.startsWith('--'))
      for (const p of a.slice(1)) poser(p, 'mode', a[0], recursif)
    } else if (m[0] === 'chown') {
      const a = m.slice(1).filter((x) => !/^-[A-Za-z]+$/.test(x) && !x.startsWith('--'))
      for (const p of a.slice(1)) poser(p, 'proprio', a[0].split(/[:.]/)[0], recursif)
    } else if (m[0] === 'useradd' && m.some((x) => x === '--create-home' || x === '-m') && m.includes('agents')) {
      poser('/home/agents', 'proprio', 'agents')
    }
  }
  return {
    get(p) {
      const k = sansSlashFinal(p)
      const r = {}
      for (const x of e) if (x.p === k || (x.recursif && k.startsWith(`${x.p}/`))) r[x.cle] = x.v
      return r
    },
  }
}
const mode700 = (m) => /^0?700$|^(u=rwx,)?(go|og)=$|^(u=rwx,)?g=,o=$|^(go|og)-rwx$|^g-rwx,o-rwx$|^o-rwx,g-rwx$/.test(String(m || ''))

// ── les règles du coffre, écrites ici (référence du juge) ─────────────────────────────────────────────────────────
const RE_GENERIQUE = /^[A-Za-z0-9._~+/=-]{20,256}$/
function reglesReference(nom, v) {
  if (!NOMS_PERMIS.includes(nom)) return false
  if (typeof v !== 'string' || v === '') return false
  if (/^eyJ/.test(v) && v.split('.').length === 3) return false
  for (const p of ['sb_secret_', 'sk_live_', 'sk_test_', 'rk_live_', 'whsec_', 'sk-ant-']) if (v.startsWith(p)) return false
  if (nom === 'TELEGRAM_BOT_TOKEN') return /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(v)
  if (nom === 'TELEGRAM_CHAT_ID') return /^-?\d{5,15}$/.test(v) || v === 'aucun'
  if (nom === 'TELEGRAM_CODE_APPAIRAGE') return /^[A-HJ-NP-Z2-9]{8}$/.test(v) || v === 'epuise'
  if (!RE_GENERIQUE.test(v)) return false
  if (nom.startsWith('PRESTI_JETON_') && /^(sk-|eyJ)/.test(v)) return false
  return true
}
/** Assemble une valeur de cas-valeurs.json : { valeur, aleatoires: [morceaux tirés au hasard de 12 signes ou plus] }. */
function assembler(morceaux) {
  let v = ''
  const aleatoires = []
  for (const m of morceaux) {
    if (typeof m === 'string') { v += m; continue }
    const [jeu, n] = Object.entries(m)[0]
    const x = aleatoire(jeu, n, v === '')
    if (n >= 12) aleatoires.push(x)
    v += x
  }
  return { valeur: v, aleatoires }
}
/** Une valeur (ou un de ses morceaux tirés au hasard) répétée dans un texte ? */
function fuite(texte, valeur, aleatoires = []) {
  const t = String(texte)
  if (valeur && valeur.length >= 8 && t.includes(valeur)) return true
  for (const a of aleatoires) for (let k = 0; k + 12 <= a.length; k += 6) if (t.includes(a.slice(k, k + 12))) return true
  return false
}
function chargerCas() {
  const j = JSON.parse(lire(path.join(FIX, 'coffre', 'cas-valeurs.json')))
  return { ...j, cas: j.cas.map((c) => ({ ...c, ...assembler(c.valeur) })) }
}
/** Un coffre d'essai tiré d'un gabarit de fixtures/…/coffre/, ses {{VALEUR_n}} remplacés par des valeurs au hasard. */
function instancierCoffre(gabarit, cible) {
  const brut = lire(path.join(FIX, 'coffre', gabarit))
  const valeurs = {}
  const texte = brut.replace(/\{\{VALEUR_(\d+)\}\}/g, (m, n) => (valeurs[n] ||= lettres(32)))
  fs.mkdirSync(path.dirname(cible), { recursive: true })
  fs.writeFileSync(cible, texte)
  // En 600, comme le vrai coffre : sous Linux, writeFileSync pose 644 (umask 022) et avec-coffre.mjs refuse, à raison, tout
  // autre mode (code 4) ; CF-8 rougissait sur l'usine pour cette seule raison (27/09). Sans effet sur NTFS.
  try { fs.chmodSync(cible, 0o600) } catch { /* NTFS */ }
  if (fs.statSync(cible).size === 0) throw new Error(`coffre d'essai de 0 octet : ${cible}`)
  return { valeurs: Object.values(valeurs), texte }
}
const lignesDe = (texte) => lf(texte).split('\n').filter((l, i, a) => !(l === '' && i === a.length - 1))

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Groupe coffre (026-050) : CF-1 à CF-13
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function groupeCoffre(R) {
  const T = dossierNeuf('coffre')
  const SECRETS = [] // toutes les valeurs d'essai de ce groupe, cherchées partout à la fin
  const sorties = [] // { quoi, texte } : toutes les sorties et erreurs des scripts jugés
  const fCoffre = R_(FICHIERS.coffreSh)
  const coffreEnv = (fichier, home) => ({ PRESTI_COFFRE_FICHIER: fichier ? versSlash(fichier) : undefined, HOME: versSlash(home || path.join(T, 'home')) })
  const poserBash = async (fichier, nom, entree, home) => {
    const r = await lancerBash(fCoffre, ['poser', nom], { env: coffreEnv(fichier, home), entree })
    sorties.push({ quoi: `presti-coffre.sh poser ${nom}`, texte: `${r.sortie}\n${r.erreur}` })
    return r
  }
  const absent = (rel) => `${rel} absent : le fichier de la fiche 026-050 n'existe pas (encore)`

  await juger(R, 'CF-1', async (D) => {
    if (!existe(fCoffre)) { D.push(absent(FICHIERS.coffreSh)); return }
    // a) coffre et dossier absents : créés, une ligne exactement.
    const v1 = lettres(32); SECRETS.push(v1)
    const fa = path.join(T, 'cf1', 'neuf', 'sous-dossier', 'agents.env')
    const ra = await poserBash(fa, 'PRESTI_JETON_CHEF', `${v1}\n`)
    if (ra.code !== 0) D.push(`poser dans un dossier absent : code ${ra.code} (0 attendu) — ${court(ra.erreur || ra.sortie, 160)}`)
    else if (!existe(fa)) D.push('poser dans un dossier absent : le coffre n\'a pas été créé')
    else if (lf(lire(fa)).replace(/\n$/, '') !== `PRESTI_JETON_CHEF=${v1}`) D.push(`poser dans un coffre neuf : le fichier ne contient pas exactement une ligne NOM=valeur (${lignesDe(lire(fa)).length} ligne(s))`)
    // b) une ligne de même nom remplacée, les autres dans leur ordre ; un nom nouveau ajouté.
    const fb = path.join(T, 'cf1', 'deux-noms', 'agents.env')
    const { valeurs: [u1] } = instancierCoffre('deux-noms.env', fb)
    SECRETS.push(...lignesDe(lire(fb)).map((l) => l.split('=')[1]))
    const v3 = lettres(32), v4 = lettres(32); SECRETS.push(v3, v4)
    const rb = await poserBash(fb, 'PRESTI_JETON_CHEF', `${v3}\n`)
    const lb = lignesDe(lire(fb))
    if (rb.code !== 0) D.push(`poser sur un nom existant : code ${rb.code} (0 attendu) — ${court(rb.erreur || rb.sortie, 160)}`)
    else if (JSON.stringify(lb) !== JSON.stringify([`PRESTI_JETON_USINE=${u1}`, `PRESTI_JETON_CHEF=${v3}`])) D.push(`poser PRESTI_JETON_CHEF sur un coffre à deux noms : lignes ${JSON.stringify(lb.map((l) => l.split('=')[0]))}, attendu [USINE (inchangée), CHEF (remplacée, à sa place)]`)
    const rb2 = await poserBash(fb, 'PRESTI_JETON_ATELIER', `${v4}\n`)
    const lb2 = lignesDe(lire(fb))
    if (rb2.code !== 0 || JSON.stringify(lb2) !== JSON.stringify([`PRESTI_JETON_USINE=${u1}`, `PRESTI_JETON_CHEF=${v3}`, `PRESTI_JETON_ATELIER=${v4}`])) D.push(`poser un nom nouveau : code ${rb2.code}, lignes ${JSON.stringify(lb2.map((l) => l.split('=')[0]))} (attendu : les deux anciennes dans leur ordre, puis la nouvelle)`)
    // c) une ligne commentée n'est pas une ligne de même nom : elle reste.
    const fc = path.join(T, 'cf1', 'commentee', 'agents.env')
    const { texte: tc } = instancierCoffre('commentee.env', fc)
    SECRETS.push(...lignesDe(tc).map((l) => l.split('=')[1]))
    const v5 = lettres(32); SECRETS.push(v5)
    const rc = await poserBash(fc, 'PRESTI_JETON_CHEF', `${v5}\n`)
    const lc = lignesDe(lire(fc))
    if (rc.code !== 0 || lc.length !== 3 || lc[0] !== lignesDe(tc)[0] || lc[1] !== lignesDe(tc)[1] || lc[2] !== `PRESTI_JETON_CHEF=${v5}`) D.push(`poser sur un coffre à ligne commentée : code ${rc.code}, ${lc.length} ligne(s) (attendu : le commentaire et l'autre ligne intacts, la nouvelle ligne à la fin)`)
    for (const [r, v] of [[ra, v1], [rb, v3], [rb2, v4], [rc, v5]]) if (fuite(`${r.sortie}\n${r.erreur}`, v)) D.push('la valeur posée apparaît sur la sortie ou l\'erreur de presti-coffre.sh')
    return 'poser crée le coffre et son dossier, écrit exactement une ligne NOM=valeur, remplace la ligne de même nom à sa place, ajoute un nom nouveau à la fin, laisse les autres lignes (et un commentaire) dans leur ordre ; valeur jamais sur la sortie ni l\'erreur'
  })

  const cas = chargerCas()
  const verdictsBash = new Map()
  await juger(R, 'CF-2', async (D) => {
    if (!existe(fCoffre)) { D.push(absent(FICHIERS.coffreSh)); return }
    const f = path.join(T, 'cf2', 'agents.env')
    instancierCoffre('deux-noms.env', f)
    const avant = fs.readFileSync(f)
    SECRETS.push(...lignesDe(avant.toString()).map((l) => l.split('=')[1]))
    for (const nom of cas.noms_hors_liste) {
      const v = lettres(30); SECRETS.push(v)
      const r = await poserBash(f, nom, `${v}\n`)
      if (r.code !== 2) D.push(`poser « ${nom} » (hors liste fermée) : code ${r.code} (2 attendu)`)
      if (!fs.readFileSync(f).equals(avant)) { D.push(`poser « ${nom} » (hors liste fermée) a modifié le coffre`); instancierCoffre('deux-noms.env', f) }
    }
    // Chaque nom de la liste fermée est accepté (la liste est exactement celle-ci).
    for (const nom of NOMS_PERMIS) {
      const v = nom === 'TELEGRAM_BOT_TOKEN' ? `${aleatoire('chiffres', 10)}:${aleatoire('alnum', 35)}` : nom === 'TELEGRAM_CHAT_ID' ? aleatoire('chiffres', 10) : nom === 'TELEGRAM_CODE_APPAIRAGE' ? aleatoire('code', 8) : lettres(30)
      SECRETS.push(v)
      const f2 = path.join(T, 'cf2', `permis-${nom}.env`)
      const r = await poserBash(f2, nom, `${v}\n`)
      if (r.code !== 0) D.push(`poser ${nom} (liste fermée) avec une valeur valide : code ${r.code} (0 attendu) — ${court(r.erreur || r.sortie, 120)}`)
    }
    return `${cas.noms_hors_liste.length} noms hors liste (dont SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, ANTHROPIC_API_KEY, ANTHROPIC_AGENTS_KEY, NEXT_PUBLIC_SUPABASE_URL, presti_jeton_chef) → code 2, coffre identique à l'octet ; les ${NOMS_PERMIS.length} noms de la liste fermée acceptés`
  })

  await juger(R, 'CF-3', async (D) => {
    if (!existe(fCoffre)) { D.push(absent(FICHIERS.coffreSh)); return }
    let n = 0
    for (const c of cas.cas) {
      const f = path.join(T, 'cf3', `${c.id}.env`)
      instancierCoffre('deux-noms.env', f)
      const avant = fs.readFileSync(f)
      SECRETS.push(c.valeur, ...lignesDe(avant.toString()).map((l) => l.split('=')[1]))
      const r = await poserBash(f, c.nom, Buffer.from(`${c.valeur}\n`, 'utf8'))
      const verdict = r.code === 0 ? 'accepte' : r.code === 2 ? 'refuse' : `code ${r.code}`
      verdictsBash.set(c.id, verdict)
      n++
      if (verdict !== c.attendu) { D.push(`${c.id} (${c.nom}, ${c.regle}) : ${verdict === 'accepte' ? 'accepté' : verdict === 'refuse' ? 'refusé' : verdict}, ${c.attendu === 'accepte' ? 'accepté' : 'refusé (code 2)'} attendu${r.code !== 0 && r.code !== 2 ? ` — ${court(r.erreur, 100)}` : ''}`); continue }
      if (c.attendu === 'refuse' && !fs.readFileSync(f).equals(avant)) D.push(`${c.id} (${c.regle}) : refusé mais le coffre a changé`)
      if (c.attendu === 'accepte' && !lignesDe(lire(f)).includes(`${c.nom}=${c.valeur}`)) D.push(`${c.id} (${c.regle}) : accepté mais la ligne ${c.nom}=… n'est pas dans le coffre`)
      if (fuite(`${r.sortie}\n${r.erreur}`, c.valeur, c.aleatoires)) D.push(`${c.id} (${c.regle}) : la valeur est répétée sur la sortie ou l'erreur`)
    }
    // Les deux mises en œuvre : le module Node rejoue la même table.
    const fR = R_(FICHIERS.regles)
    if (!existe(fR)) D.push(`${FICHIERS.regles} absent : la table ne se rejoue pas contre la mise en œuvre Node`)
    else {
      const mod = await import(`${pathToFileURL(fR).href}?cf3-${HASARD}`)
      if (typeof mod.validerValeur !== 'function') D.push('coffre-regles.mjs n\'exporte pas validerValeur')
      else for (const c of cas.cas) {
        const v = mod.validerValeur(c.nom, c.valeur)
        const verdict = v?.ok === true ? 'accepte' : v?.ok === false ? 'refuse' : 'forme inattendue'
        if (verdict !== c.attendu) D.push(`${c.id} (${c.nom}, ${c.regle}) : coffre-regles.mjs ${verdict === 'accepte' ? 'accepte' : verdict === 'refuse' ? 'refuse' : 'rend une forme inattendue'}, ${c.attendu === 'accepte' ? 'accepter' : 'refuser'} attendu`)
        if (v?.ok === false && fuite(JSON.stringify(v), c.valeur, c.aleatoires)) D.push(`${c.id} : la raison du refus de coffre-regles.mjs cite la valeur`)
      }
    }
    // Les formes refusées « quel que soit le nom » sont écrites dans les deux mises en œuvre : avec la liste fermée
    // d'aujourd'hui, d'autres règles les rattrapent aussi, et leur retrait ne se verrait pas autrement.
    const formes = ['sb_secret_', 'sk_live_', 'sk_test_', 'rk_live_', 'whsec_', ['sk', 'ant', ''].join('-')]
    const textes = [[FICHIERS.coffreSh, analyserBash(lire(fCoffre)).texte], [FICHIERS.regles, existe(fR) ? sansCommentairesJs(lire(fR)) : null]]
    for (const [f, t] of textes) if (t !== null) for (const x of [...formes, 'eyJ']) if (!t.includes(x)) D.push(`${f} n'écrit pas la forme refusée « ${x}… » (refus quel que soit le nom)`)
    return `${n} cas de cas-valeurs.json rejoués contre presti-coffre.sh et contre coffre-regles.mjs : chaque verdict est celui attendu, refus = code 2 et coffre inchangé, valeur jamais répétée ; les formes refusées quel que soit le nom écrites dans les deux`
  })

  await juger(R, 'CF-4', async (D) => {
    if (!existe(fCoffre)) { D.push(absent(FICHIERS.coffreSh)); return }
    const a = analyserBash(lire(fCoffre))
    const I = a.instrs
    if (!/^set -[a-zA-Z]*e[a-zA-Z]*u[a-zA-Z]*o pipefail$/.test(I[0]?.texte || '')) D.push(`première instruction : « ${court(I[0]?.texte, 60)} » (set -euo pipefail attendu)`)
    if (!/^umask 0?077$/.test(I[1]?.texte || '')) D.push(`deuxième instruction : « ${court(I[1]?.texte, 60)} » (umask 077 attendu)`)
    // Le chemin du coffre : le défaut, que PRESTI_COFFRE_FICHIER ne fait que remplacer.
    const defaut = I.find((i) => i.affecte && /^\$\{PRESTI_COFFRE_FICHIER:-(\$HOME|\$\{HOME\})\/\.config\/presti\/agents\.env\}$/.test(deguillemeter(i.texte.slice(i.texte.indexOf('=') + 1))))
    if (!defaut) D.push('aucune affectation du chemin « ${PRESTI_COFFRE_FICHIER:-$HOME/.config/presti/agents.env} »')
    const usagesVar = I.filter((i) => /PRESTI_COFFRE_FICHIER/.test(i.brut))
    if (usagesVar.length > 1) D.push(`PRESTI_COFFRE_FICHIER sert ailleurs que pour remplacer le chemin par défaut (ligne ${usagesVar.filter((i) => i !== defaut).map((i) => i.ligne).join(', ')})`)
    const VAR = defaut ? defaut.affecte : null
    const chemin = '$HOME/.config/presti/agents.env'
    const dossierCoffre = '$HOME/.config/presti'
    // La valeur : IFS= read -r <var>, sur l'entrée standard.
    const lecture = I.find((i) => /^IFS= read -r (-[A-Za-z]+ )*([A-Za-z_]\w*)$/.test(i.texte))
    if (!lecture) D.push('la valeur ne se lit pas par « IFS= read -r <variable> » sur l\'entrée standard')
    const VALEUR = lecture ? /([A-Za-z_]\w*)$/.exec(lecture.texte)[1] : null
    // Variables teintées par la valeur.
    const teintes = new Set(VALEUR ? [VALEUR] : [])
    for (const i of I) if (i.affecte && [...teintes].some((t) => new RegExp(`\\$\\{?${t}\\b`).test(i.texte))) teintes.add(i.affecte)
    for (const i of I) {
      for (const t of teintes) if (new RegExp(`\\b(echo|printf)\\b[^|]*\\$\\{?${t}\\b`).test(i.brut)) D.push(`ligne ${i.ligne} : ${/echo/.test(i.brut) ? 'echo' : 'printf'} de la valeur ($${t}) : « ${court(i.brut, 80)} »`)
      if (i.commande === 'eval' || /(^|[\s;(])eval\s/.test(i.brut)) D.push(`ligne ${i.ligne} : eval`)
      if ((i.commande === 'source' || i.commande === '.') && (i.plat.includes(chemin) || (VAR && new RegExp(`\\$\\{?${VAR}\\b`).test(i.brut)))) D.push(`ligne ${i.ligne} : le coffre est chargé (source ou .)`)
      // Redirections vers le coffre lui-même.
      const cibles = [...i.plat.matchAll(/(?:\d?>>?|&>>?|>\|)\s*(\S+)/g)].map((m) => m[1])
      if (cibles.some((c) => sansSlashFinal(c) === chemin)) D.push(`ligne ${i.ligne} : redirection > ou >> vers le coffre lui-même : « ${court(i.brut, 80)} »`)
      if (/\btee\b/.test(i.plat) && i.plat.includes(chemin) && !i.plat.includes(`${chemin}.`)) D.push(`ligne ${i.ligne} : tee vers le coffre`)
    }
    // L'écriture : mktemp dans le dossier du coffre, puis mv -f sur le coffre, sous flock.
    const mk = I.filter((i) => /\bmktemp\b/.test(i.plat))
    const mkBon = mk.find((i) => { const t = i.plat.slice(i.plat.indexOf('mktemp')); return new RegExp(`mktemp[^)]*(\\s-p\\s+${dossierCoffre.replace(/[$.]/g, '\\$&')}(\\s|\\)|$)|--tmpdir=${dossierCoffre.replace(/[$.]/g, '\\$&')}|\\s${dossierCoffre.replace(/[$.]/g, '\\$&')}/)`).test(t) && !/\s-t\b|\/tmp\//.test(t) })
    if (!mkBon) D.push(`aucun mktemp dans le dossier du coffre (${mk.length ? `vus : ${mk.map((i) => court(i.brut, 60)).join(' ; ')}` : 'aucun mktemp'})`)
    const TMP = mkBon && mkBon.affecte
    const mv = I.find((i) => i.mots[0] === 'mv' && (i.mots.includes('-f') || i.mots.some((x) => /^-[a-zA-Z]*f/.test(x))) && sansSlashFinal(i.mots[i.mots.length - 1]) === chemin)
    if (!mv) D.push('aucun « mv -f <temporaire> <coffre> » (écriture atomique)')
    else if (TMP && !new RegExp(`\\$\\{?${TMP}\\b`).test(mv.brut)) D.push(`le mv -f sur le coffre ne part pas du temporaire ${TMP} : « ${court(mv.brut, 80)} »`)
    const fl = I.find((i) => /\bflock\b/.test(i.brut))
    if (!fl) D.push('aucun flock : l\'écriture n\'est pas sérialisée')
    else if (mv && fl.index > mv.index && !/\bmv\b/.test(fl.brut)) D.push(`flock (ligne ${fl.ligne}) vient après le mv (ligne ${mv.ligne})`)
    // Et, pour de vrai : sans PRESTI_COFFRE_FICHIER, le coffre va à $HOME/.config/presti/agents.env.
    const home = path.join(T, 'cf4-home')
    nettoyer(home)
    const v = lettres(32); SECRETS.push(v)
    const r = await lancerBash(fCoffre, ['poser', 'PRESTI_JETON_USINE'], { env: { HOME: versSlash(home) }, entree: `${v}\n` })
    sorties.push({ quoi: 'presti-coffre.sh poser (chemin par défaut)', texte: `${r.sortie}\n${r.erreur}` })
    const fDefaut = path.join(home, '.config', 'presti', 'agents.env')
    if (r.code !== 0 || !existe(fDefaut) || !lignesDe(lire(fDefaut)).includes(`PRESTI_JETON_USINE=${v}`)) D.push(`sans PRESTI_COFFRE_FICHIER, poser n'écrit pas $HOME/.config/presti/agents.env (code ${r.code})`)
    return `lu instruction par instruction (${a.instrs.length}) : set -euo pipefail puis umask 077 en tête ; valeur par IFS= read -r ${VALEUR} ; mktemp dans le dossier du coffre (${TMP || '—'}), mv -f atomique sous flock ; aucune redirection vers le coffre, aucun echo/printf de la valeur, ni eval ni source ; chemin par défaut $HOME/.config/presti/agents.env vérifié en vrai`
  })

  await juger(R, 'CF-5', async (D) => {
    if (!existe(fCoffre)) { D.push(absent(FICHIERS.coffreSh)); return }
    const f = path.join(T, 'cf5', 'agents.env')
    const va = lettres(32), vb = lettres(32), vc = lettres(32); SECRETS.push(va, vb, vc)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, `PRESTI_JETON_USINE=${va}\n# un commentaire\n\nPRESTI_JETON_CHEF=${vb}\nPRESTI_JETON_ATELIER=${vc}\n`)
    const rn = await lancerBash(fCoffre, ['noms'], { env: coffreEnv(f) })
    sorties.push({ quoi: 'presti-coffre.sh noms', texte: `${rn.sortie}\n${rn.erreur}` })
    const noms = lignesDe(rn.sortie).map((l) => l.trim()).filter(Boolean)
    if (rn.code !== 0) D.push(`noms : code ${rn.code}`)
    if (JSON.stringify(noms) !== JSON.stringify(['PRESTI_JETON_ATELIER', 'PRESTI_JETON_CHEF', 'PRESTI_JETON_USINE'])) D.push(`noms imprime ${JSON.stringify(noms.map((x) => court(x, 30)))} : les trois noms seuls, triés, attendus`)
    if (noms.some((x) => x.includes('='))) D.push('noms imprime un « = »')
    const re = await lancerBash(fCoffre, ['etat'], { env: coffreEnv(f) })
    sorties.push({ quoi: 'presti-coffre.sh etat', texte: `${re.sortie}\n${re.erreur}` })
    const le = lignesDe(re.sortie).filter((l) => l.trim())
    const m = /^mode=([0-7]{3,4}) proprietaire=(\S+) noms=(\d+)$/.exec((le[0] || '').trim())
    if (re.code !== 0 || le.length !== 1 || !m) D.push(`etat imprime « ${court(re.sortie, 80)} » (code ${re.code}) : une ligne « mode=<octal> proprietaire=<compte> noms=<n> » attendue`)
    else if (m[3] !== '3') D.push(`etat compte noms=${m[3]} (3 attendu : le commentaire et la ligne vide ne comptent pas)`)
    if (WIN) R.note('CF-5 : sur le poste, le mode NTFS n\'a pas de sens : seule la forme de « etat » est jugée ici (la valeur se juge en --reel, RS-2)')
    for (const r of [rn, re]) for (const v of [va, vb, vc]) if (fuite(`${r.sortie}${r.erreur}`, v)) D.push('une valeur du coffre est imprimée par noms ou etat')
    return 'noms imprime les noms seuls, triés, sans « = » ; etat imprime une ligne mode=<octal> proprietaire=<compte> noms=3 ; aucune valeur'
  })

  await juger(R, 'CF-6', async (D) => {
    if (!existe(fCoffre)) { D.push(absent(FICHIERS.coffreSh)); return }
    const f = path.join(T, 'cf6', 'agents.env')
    const va = lettres(32), vb = lettres(32), vc = lettres(32); SECRETS.push(va, vb, vc)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, `PRESTI_JETON_USINE=${va}\nPRESTI_JETON_CHEF=${vb}\nPRESTI_JETON_ATELIER=${vc}\n`)
    const r = await lancerBash(fCoffre, ['retirer', 'PRESTI_JETON_CHEF'], { env: coffreEnv(f) })
    sorties.push({ quoi: 'presti-coffre.sh retirer', texte: `${r.sortie}\n${r.erreur}` })
    const l = lignesDe(lire(f))
    if (r.code !== 0 || JSON.stringify(l) !== JSON.stringify([`PRESTI_JETON_USINE=${va}`, `PRESTI_JETON_ATELIER=${vc}`])) D.push(`retirer PRESTI_JETON_CHEF : code ${r.code}, lignes ${JSON.stringify(l.map((x) => x.split('=')[0]))} (les deux autres, dans leur ordre, attendues)`)
    const avant = fs.readFileSync(f)
    const ra = await lancerBash(fCoffre, ['retirer', 'PRESTI_JETON_LIVREUR_USINE'], { env: coffreEnv(f) })
    sorties.push({ quoi: 'presti-coffre.sh retirer (absent)', texte: `${ra.sortie}\n${ra.erreur}` })
    if (ra.code !== 0 || !/absent/i.test(`${ra.sortie}${ra.erreur}`)) D.push(`retirer un nom absent : code ${ra.code}, « ${court(ra.sortie || ra.erreur, 60)} » (code 0 et « absent » attendus)`)
    if (!fs.readFileSync(f).equals(avant)) D.push('retirer un nom absent a modifié le coffre')
    for (const args of [['lire', 'PRESTI_JETON_USINE'], ['afficher'], ['valeur', 'PRESTI_JETON_USINE'], ['cat'], ['POSER', 'PRESTI_JETON_USINE'], []]) {
      const x = await lancerBash(fCoffre, args, { env: coffreEnv(f) })
      sorties.push({ quoi: `presti-coffre.sh ${args.join(' ')}`, texte: `${x.sortie}\n${x.erreur}` })
      if (x.code !== 2) D.push(`sous-commande « ${args.join(' ') || '(aucune)'} » : code ${x.code} (2 attendu)`)
      if (!fs.readFileSync(f).equals(avant)) D.push(`sous-commande « ${args.join(' ')} » a modifié le coffre`)
      if (fuite(`${x.sortie}${x.erreur}`, va) || fuite(`${x.sortie}${x.erreur}`, vc)) D.push(`sous-commande « ${args.join(' ')} » imprime une valeur`)
    }
    return 'retirer ôte la seule ligne visée (les autres dans leur ordre) ; nom absent → code 0, « absent », coffre intact ; toute autre sous-commande → code 2'
  })

  // ── avec-coffre.mjs
  const fAvec = R_(FICHIERS.avecCoffre)
  const ESPION = path.join(FIX, 'enfant-espion.mjs')
  const homeAvec = path.join(T, 'avec-home')
  const coffreAvec = path.join(homeAvec, '.config', 'presti', 'agents.env')
  const valeursAvec = { PRESTI_JETON_CHEF: lettres(40), PRESTI_JETON_USINE: lettres(40), PRESTI_JETON_ATELIER: lettres(40) }
  SECRETS.push(...Object.values(valeursAvec))
  const parents = {
    HOME: versSlash(homeAvec), USERPROFILE: homeAvec, LANG: 'fr_FR.UTF-8', TZ: 'Europe/Paris', USER: 'agents', PRESTI_HOTE: 'usine',
    ORCHESTRE_CODEX_BIN: '/usr/local/bin/codex', PLAYWRIGHT_BROWSERS_PATH: '/srv/playwright', PRESTI_URL: 'https://prestiapp.fr',
    PRESTI_COFFRE_FICHIER: versSlash(coffreAvec),
    // Dix variables du parent qui ne doivent jamais passer (fausses valeurs, lettres seules).
    SUPABASE_SERVICE_ROLE_KEY: lettres(40), STRIPE_SECRET_KEY: lettres(40), ANTHROPIC_API_KEY: lettres(40), PRESTI_JETON_CHEF: lettres(40),
    PRESTI_JETON_TELEGRAM: lettres(40), NODE_OPTIONS: '--max-old-space-size=64', GIT_DIR: '/tmp/ailleurs', AWS_SECRET_ACCESS_KEY: lettres(40),
    DATABASE_URL: `postgres${lettres(8)}`, PRESTI_ESPION_PARENT: lettres(20),
  }
  SECRETS.push(parents.SUPABASE_SERVICE_ROLE_KEY, parents.STRIPE_SECRET_KEY, parents.ANTHROPIC_API_KEY, parents.PRESTI_JETON_CHEF, parents.PRESTI_JETON_TELEGRAM, parents.AWS_SECRET_ACCESS_KEY)
  const ecrireCoffreAvec = () => {
    fs.mkdirSync(path.dirname(coffreAvec), { recursive: true })
    fs.writeFileSync(coffreAvec, `${Object.entries(valeursAvec).map(([k, v]) => `${k}=${v}`).join('\n')}\n`)
    try { fs.chmodSync(coffreAvec, 0o600) } catch { /* NTFS */ }
  }
  const lancerAvec = async (args, { env = parents, delaiMs = 30_000 } = {}) => {
    const r = await lancer(process.execPath, [fAvec, ...args], { cwd: RACINE, env: { ...BASE_ENV, PATH: path.dirname(process.execPath), ...env }, delaiMs })
    sorties.push({ quoi: `avec-coffre.mjs ${args.slice(0, 3).join(' ')}`, texte: `${r.sortie}\n${r.erreur}` })
    return r
  }

  await juger(R, 'CF-7', async (D) => {
    if (!existe(fAvec)) { D.push(absent(FICHIERS.avecCoffre)); return }
    ecrireCoffreAvec()
    const sortie = path.join(T, 'cf7-espion.json')
    nettoyer(sortie)
    const r = await lancerAvec(['PRESTI_JETON_CHEF', 'PRESTI_JETON_USINE', '--', process.execPath, ESPION, `--sortie=${sortie}`])
    if (r.code !== 0) { D.push(`avec-coffre PRESTI_JETON_CHEF PRESTI_JETON_USINE -- enfant : code ${r.code} (0 attendu) — ${court(r.erreur || r.sortie, 160)}`); return }
    if (!existe(sortie) || fs.statSync(sortie).size === 0) { D.push('l\'enfant espion n\'a rien écrit : il n\'a pas été lancé'); return }
    const e = JSON.parse(lire(sortie))
    const attendus = new Set([...PASSANTS.filter((k) => parents[k] !== undefined || k === 'PATH'), 'PRESTI_JETON_CHEF', 'PRESTI_JETON_USINE'])
    const tolere = WIN ? new Set(LIBUV_WIN) : new Set()
    const vus = e.noms.map((n) => (WIN ? n.toUpperCase() : n))
    const attendusCmp = new Set([...attendus].map((n) => (WIN ? n.toUpperCase() : n)))
    const intrus = vus.filter((n) => !attendusCmp.has(n) && !tolere.has(n))
    const manquants = [...attendusCmp].filter((n) => !vus.includes(n))
    if (intrus.length) D.push(`l'enfant voit des variables en trop : ${intrus.join(', ')}`)
    if (manquants.length) D.push(`l'enfant ne voit pas : ${manquants.join(', ')}`)
    const emp = Object.fromEntries(Object.entries(e.empreintes).map(([k, v]) => [WIN ? k.toUpperCase() : k, v]))
    for (const n of ['PRESTI_JETON_CHEF', 'PRESTI_JETON_USINE']) if (emp[n] !== sha256(valeursAvec[n])) D.push(`${n} : l'empreinte n'est pas celle de la valeur du coffre${emp[n] === sha256(parents[n] || '') ? ' (c\'est celle du parent !)' : ''}`)
    for (const n of ['HOME', 'LANG', 'TZ', 'USER', 'PRESTI_HOTE', 'ORCHESTRE_CODEX_BIN', 'PLAYWRIGHT_BROWSERS_PATH', 'PRESTI_URL']) if (emp[n] !== sha256(parents[n])) D.push(`${n} : la valeur passée n'est pas celle du parent`)
    if (WIN) R.note(`CF-7 : sous Windows, libuv ajoute d'office ${LIBUV_WIN.join(', ')} : tolérées sur le poste seulement`)
    return `l'enfant voit exactement ${[...attendus].join(', ')}, les deux valeurs venant du coffre (empreintes égales) ; aucune des dix variables du parent (dont SUPABASE_SERVICE_ROLE_KEY et un PRESTI_JETON_CHEF du parent)`
  })

  await juger(R, 'CF-8', async (D) => {
    if (!existe(fAvec)) { D.push(absent(FICHIERS.avecCoffre)); return }
    ecrireCoffreAvec()
    const essais = [
      { args: ['PRESTI_JETON_LIVREUR_USINE'], code: 3, pourquoi: 'un nom absent du coffre' },
      { args: ['SUPABASE_SERVICE_ROLE_KEY'], code: 2, pourquoi: 'un nom hors liste fermée' },
      { args: ['PRESTI_JETON_CHEF', 'PRESTI_JETON_ANTHROPIC'], code: 2, pourquoi: 'un second nom hors liste fermée' },
      { args: ['PRESTI_JETON_CHEF'], code: 2, pourquoi: 'sans « -- »', sansTiret: true },
    ]
    for (const x of essais) {
      const sortie = path.join(T, `cf8-${x.code}-${x.args.length}.json`)
      nettoyer(sortie)
      const args = x.sansTiret ? [...x.args, process.execPath, ESPION, `--sortie=${sortie}`] : [...x.args, '--', process.execPath, ESPION, `--sortie=${sortie}`]
      const r = await lancerAvec(args)
      if (r.code !== x.code) D.push(`${x.pourquoi} : code ${r.code} (${x.code} attendu)`)
      if (existe(sortie)) D.push(`${x.pourquoi} : l'enfant a été lancé`)
    }
    // Le coffre commenté : un nom en commentaire n'est pas dans le coffre.
    const homeC = path.join(T, 'cf8-home-commentee')
    const fC = path.join(homeC, '.config', 'presti', 'agents.env')
    const { texte: tC } = instancierCoffre('commentee.env', fC)
    SECRETS.push(...lignesDe(tC).map((l) => l.split('=')[1]))
    const sC = path.join(T, 'cf8-commentee.json'); nettoyer(sC)
    const rC = await lancerAvec(['PRESTI_JETON_CHEF', '--', process.execPath, ESPION, `--sortie=${sC}`], { env: { ...parents, HOME: versSlash(homeC), USERPROFILE: homeC, PRESTI_COFFRE_FICHIER: versSlash(fC) } })
    if (rC.code !== 3 || existe(sC)) D.push(`un nom seulement en commentaire (« # PRESTI_JETON_CHEF=… ») : code ${rC.code}${existe(sC) ? ', enfant lancé' : ''} (3 attendu, sans lancer)`)
    // Le coffre à ligne mal formée : les bonnes lignes restent lisibles.
    const homeM = path.join(T, 'cf8-home-mal-formee')
    const fM = path.join(homeM, '.config', 'presti', 'agents.env')
    const { valeurs: vM } = instancierCoffre('mal-formee.env', fM)
    SECRETS.push(...vM)
    const sM = path.join(T, 'cf8-mal-formee.json'); nettoyer(sM)
    const rM = await lancerAvec(['PRESTI_JETON_ATELIER', '--', process.execPath, ESPION, `--sortie=${sM}`], { env: { ...parents, HOME: versSlash(homeM), USERPROFILE: homeM, PRESTI_COFFRE_FICHIER: versSlash(fM) } })
    if (rM.code !== 0 || !existe(sM)) D.push(`coffre avec une ligne mal formée : code ${rM.code} (0 attendu pour un nom présent sur une bonne ligne)`)
    else if (JSON.parse(lire(sM)).empreintes.PRESTI_JETON_ATELIER !== sha256(vM[1])) D.push('coffre avec une ligne mal formée : PRESTI_JETON_ATELIER n\'a pas la valeur de sa ligne')
    if (!WIN) {
      // 600 exactement : lisible par le groupe (640) ou par les autres (644, 604), le coffre est refusé. Un contrôle qui ne
      // regarderait que les autres (revue Codex du 27/09) passait 644 et laissait passer 640.
      for (const mode of [0o644, 0o640, 0o604]) {
        ecrireCoffreAvec()
        fs.chmodSync(coffreAvec, mode)
        const s4 = path.join(T, `cf8-${mode.toString(8)}.json`); nettoyer(s4)
        const r4 = await lancerAvec(['PRESTI_JETON_CHEF', '--', process.execPath, ESPION, `--sortie=${s4}`])
        if (r4.code !== 4 || existe(s4)) D.push(`coffre en ${mode.toString(8)} : code ${r4.code}${existe(s4) ? ', enfant lancé' : ''} (4 attendu, sans lancer)`)
      }
      fs.chmodSync(coffreAvec, 0o600)
    } else R.note('CF-8 : sur le poste (NTFS), le contrôle du mode 600 est sauté ; il se juge sur un système POSIX')
    return `nom absent → 3, hors liste → 2, sans « -- » → 2, un nom commenté est absent (3), une ligne mal formée n'empêche pas de lire les autres ; ${WIN ? '' : 'coffre en 644, 640 ou 604 → 4 ; '}jamais d'enfant lancé sur un refus`
  })

  await juger(R, 'CF-9', async (D) => {
    if (!existe(fAvec)) { D.push(absent(FICHIERS.avecCoffre)); return }
    ecrireCoffreAvec()
    for (const code of [0, 7, 1]) {
      const s = path.join(T, `cf9-${code}.json`); nettoyer(s)
      const r = await lancerAvec(['PRESTI_JETON_USINE', '--', process.execPath, ESPION, `--sortie=${s}`, `--code=${code}`])
      if (r.code !== code) D.push(`l'enfant sort en ${code} : avec-coffre rend ${r.code}`)
    }
    const src = lire(fAvec)
    if (/shell\s*:\s*true/.test(src)) D.push('avec-coffre.mjs lance avec shell: true')
    if (/\b(exec|execSync)\s*\(/.test(src.replace(/execPath/g, ''))) D.push('avec-coffre.mjs passe par exec/execSync (un shell)')
    if (/\beval\s*\(|new\s+Function\s*\(/.test(src)) D.push('avec-coffre.mjs évalue du texte (eval, new Function)')
    if (WIN) {
      // Sous Windows, un SIGTERM ne se relaie pas (TerminateProcess) : le relais se lit dans le source, et se juge sur POSIX.
      if (!/['"]SIGTERM['"]/.test(src) || !/['"]SIGINT['"]/.test(src) || !/process\.(on|once)\(/.test(src) || !/\.kill\(/.test(src)) D.push('avec-coffre.mjs ne relaie pas SIGTERM et SIGINT à l\'enfant (process.on(…) des deux signaux et .kill( attendus)')
      R.note('CF-9 : sous Windows, le relais de SIGTERM est lu dans le source ; l\'arrêt de l\'enfant en 2 s se mesure sur un système POSIX')
    } else {
      const s = path.join(T, 'cf9-sigterm.json'); nettoyer(s)
      const h = demarrer(process.execPath, [fAvec, 'PRESTI_JETON_USINE', '--', process.execPath, ESPION, `--sortie=${s}`, '--dormir=30'], { cwd: RACINE, env: { ...BASE_ENV, PATH: path.dirname(process.execPath), ...parents }, delaiMs: 40_000 })
      const debut = Date.now()
      while (!existe(s) && Date.now() - debut < 10_000) await attendre(100)
      if (!existe(s)) D.push('l\'enfant ne démarre pas (10 s)')
      else {
        const pidEnfant = JSON.parse(lire(s)).pid
        h.enfant.kill('SIGTERM')
        const t0 = Date.now()
        let vivant = true
        while (Date.now() - t0 < 2000) { try { process.kill(pidEnfant, 0) } catch { vivant = false; break } await attendre(50) }
        if (vivant) { D.push('SIGTERM à avec-coffre : l\'enfant vit encore après 2 s'); try { process.kill(pidEnfant, 'SIGKILL') } catch { /* mort */ } }
      }
      await h.fin
    }
    const tout = sorties.filter((x) => x.quoi.startsWith('avec-coffre')).map((x) => x.texte).join('\n')
    for (const v of Object.values(valeursAvec)) if (fuite(tout, v)) D.push('une valeur du coffre apparaît sur la sortie ou l\'erreur d\'avec-coffre')
    return 'le code de l\'enfant est rendu tel quel (0, 7, 1) ; ni shell ni exec ni eval ; relais de SIGTERM ; aucune valeur sur la sortie ni l\'erreur d\'avec-coffre'
  })

  // ── usine-coffre.mjs (poste) et coffre-regles.mjs
  const fRegles = R_(FICHIERS.regles)
  const fUC = R_(FICHIERS.usineCoffre)
  const banc = bancSsh(dossierNeuf('coffre', 'ssh'))
  const lancerUC = async (args, { mode = 'enregistrer', env = {}, entree, cwd = RACINE, fichier = fUC, chemins = null, pathSysteme = true } = {}) => {
    const r = await lancer(process.execPath, [fichier, ...args], { cwd, env: envDe({ ...banc.env(mode), HOME: versSlash(path.join(T, 'uc-home')), USERPROFILE: path.join(T, 'uc-home'), ...env }, chemins || banc.chemins, { pathSysteme }), entree, delaiMs: 60_000 })
    sorties.push({ quoi: `usine-coffre.mjs ${args.slice(0, 2).join(' ')}`, texte: `${r.sortie}\n${r.erreur}` })
    return r
  }
  fs.mkdirSync(path.join(T, 'uc-home', '.ssh'), { recursive: true })
  fs.writeFileSync(path.join(T, 'uc-home', '.ssh', 'presti-usine'), 'cle d\'essai factice du juge usine-socle-qa\n')
  const accepteesNode = []

  await juger(R, 'CF-10', async (D) => {
    if (!existe(fRegles)) { D.push(absent(FICHIERS.regles)); return }
    if (!existe(fUC)) { D.push(absent(FICHIERS.usineCoffre)); return }
    const mod = await import(`${pathToFileURL(fRegles).href}?${HASARD}`)
    if (!Array.isArray(mod.NOMS_PERMIS) || JSON.stringify([...mod.NOMS_PERMIS].sort()) !== JSON.stringify([...NOMS_PERMIS].sort())) D.push(`NOMS_PERMIS de coffre-regles.mjs ≠ la liste fermée (${court(JSON.stringify(mod.NOMS_PERMIS), 120)})`)
    if (typeof mod.validerNom !== 'function' || typeof mod.validerValeur !== 'function') { D.push('coffre-regles.mjs n\'exporte pas validerNom et validerValeur'); return }
    // La règle du JWT (eyJ… à deux points) : la seule qui juge les points ; un test sur « eyJ » seul ne la remplace pas.
    if (!sansCommentairesJs(lire(fRegles)).split('\n').some((l) => l.includes('eyJ') && /\\\.|split\(\s*['"]\.['"]\s*\)|\.\*\\\.|\[\^\.\]/.test(l))) D.push('coffre-regles.mjs n\'a pas de règle du JWT (une ligne qui teste « eyJ » et ses deux points)')
    for (const nom of cas.noms_hors_liste) if (mod.validerNom(nom)?.ok !== false) D.push(`validerNom(« ${nom} ») n'est pas un refus`)
    for (const nom of NOMS_PERMIS) if (mod.validerNom(nom)?.ok !== true) D.push(`validerNom(${nom}) refuse un nom de la liste fermée`)
    for (const c of cas.cas) {
      const v = mod.validerValeur(c.nom, c.valeur)
      const verdict = v?.ok === true ? 'accepte' : v?.ok === false ? 'refuse' : 'forme inattendue'
      if (verdict !== c.attendu) D.push(`${c.id} (${c.regle}) : validerValeur ${verdict === 'accepte' ? 'accepte' : verdict === 'refuse' ? 'refuse' : `rend ${court(JSON.stringify(v), 60)}`}, ${c.attendu === 'accepte' ? 'accepter' : 'refuser'} attendu`)
      if (verdictsBash.has(c.id) && verdictsBash.get(c.id) !== verdict) D.push(`${c.id} : le module Node (${verdict}) et le script bash (${verdictsBash.get(c.id)}) divergent`)
      if (v?.ok === false && fuite(JSON.stringify(v), c.valeur, c.aleatoires)) D.push(`${c.id} : la raison du refus cite la valeur`)
    }
    // Par usine-coffre.mjs : --depuis-env, puis l'entrée standard (non interactive). Refus → code 2, aucun appel ssh.
    for (const c of cas.cas) {
      for (const voie of ['env', 'stdin']) {
        if (voie === 'stdin' && c.stdin === false) continue
        banc.vider()
        const r = voie === 'env'
          ? await lancerUC(['poser', c.nom, '--depuis-env=VALEUR_ESSAI_COFFRE'], { env: { VALEUR_ESSAI_COFFRE: c.valeur } })
          : await lancerUC(['poser', c.nom], { entree: Buffer.from(`${c.valeur}\n`, 'utf8') })
        const appels = banc.appels()
        if (c.attendu === 'refuse') {
          if (r.code !== 2) D.push(`${c.id} (${c.regle}) par ${voie === 'env' ? '--depuis-env' : 'l\'entrée standard'} : code ${r.code} (2 attendu)`)
          if (appels.length) D.push(`${c.id} (${c.regle}) par ${voie} : refus, mais ${appels.length} appel(s) ssh`)
        } else {
          if (r.code !== 0) D.push(`${c.id} (${c.regle}) par ${voie} : code ${r.code} (0 attendu) — ${court(r.erreur || r.sortie, 120)}`)
          if (appels.length !== 1) D.push(`${c.id} par ${voie} : ${appels.length} appel(s) ssh (1 attendu)`)
          else accepteesNode.push({ cas: c, appel: appels[0], r, voie })
        }
        if (fuite(`${r.sortie}\n${r.erreur}`, c.valeur, c.aleatoires)) D.push(`${c.id} par ${voie} : la valeur apparaît sur la sortie ou l'erreur d'usine-coffre.mjs`)
      }
    }
    return `NOMS_PERMIS = la liste fermée ; les ${cas.cas.length} cas rejoués par import, par --depuis-env et par l'entrée standard : chaque verdict égal à l'attendu et à celui du script bash ; refus → code 2 sans aucun appel ssh`
  })

  await juger(R, 'CF-11', async (D) => {
    if (!existe(fUC)) { D.push(absent(FICHIERS.usineCoffre)); return }
    if (!accepteesNode.length) { D.push('aucune valeur valide n\'a été posée par usine-coffre.mjs (CF-10) : rien à juger'); return }
    for (const { cas: c, appel, voie } of accepteesNode) {
      for (const d of defautsAppelSsh(appel)) D.push(`${c.id} par ${voie} : ${d.split(c.valeur).join('<valeur>')}`)
      const cmd = commandeDistante(appel)
      if (cmd !== `sudo -n -u agents /usr/local/bin/presti-coffre poser ${c.nom}`) D.push(`${c.id} par ${voie} : commande distante « ${court(String(cmd).split(c.valeur).join('<valeur>'), 100)} » (« sudo -n -u agents /usr/local/bin/presti-coffre poser ${c.nom} » attendue)`)
      if (appel.argv.some((x) => x.includes(c.valeur)) || fuite(appel.argv.join(' '), c.valeur, c.aleatoires)) D.push(`${c.id} par ${voie} : LA VALEUR EST DANS L'ARGV DE SSH`)
      if (appel.stdinTexte !== `${c.valeur}\n`) D.push(`${c.id} par ${voie} : l'entrée standard de ssh n'est pas « valeur + retour à la ligne », une seule fois (${appel.stdin.length} octets reçus, ${c.valeur.length + 1} attendus)`)
    }
    return `${accepteesNode.length} poses valides : argv avec -o BatchMode=yes, la clé presti-usine, l'hôte de PRESTI_USINE et « sudo -n -u agents /usr/local/bin/presti-coffre poser <NOM> », jamais la valeur ; la valeur sur l'entrée standard, une fois, suivie d'un retour à la ligne`
  })

  await juger(R, 'CF-12', async (D) => {
    if (!existe(fUC)) { D.push(absent(FICHIERS.usineCoffre)); return }
    const v = lettres(32); SECRETS.push(v)
    const hors = [
      ['poser', 'PRESTI_JETON_CHEF', `--valeur=${v}`], ['poser', 'PRESTI_JETON_CHEF', v], ['poser'], ['poser', 'PRESTI_JETON_CHEF', '--depuis-env=X', '--autre'],
      ['lire', 'PRESTI_JETON_CHEF'], ['afficher'], ['valeur', 'PRESTI_JETON_CHEF'], ['noms', 'PRESTI_JETON_CHEF'], ['etat', '--tout'], [],
    ]
    for (const args of hors) {
      banc.vider()
      const r = await lancerUC(args, { env: { X: v }, entree: `${v}\n` })
      if (r.code !== 2) D.push(`« ${args.map((a) => (a.includes(v) ? a.replace(v, '<valeur>') : a)).join(' ') || '(aucun argument)'} » : code ${r.code} (2 attendu)`)
      if (banc.appels().length) D.push(`« ${args[0] || ''} … » hors grammaire : ${banc.appels().length} appel(s) ssh`)
    }
    const relais = [[['noms'], 'noms'], [['retirer', 'PRESTI_JETON_CHEF'], 'retirer PRESTI_JETON_CHEF'], [['etat'], 'etat']]
    const sortieNoms = path.join(T, 'cf12-noms.txt')
    fs.writeFileSync(sortieNoms, 'PRESTI_JETON_CHEF\nPRESTI_JETON_USINE\n')
    for (const [args, attendu] of relais) {
      banc.vider()
      const r = await lancerUC(args, { mode: `sortie=${sortieNoms}` })
      const a = banc.appels()
      if (r.code !== 0) D.push(`${args.join(' ')} : code ${r.code} (0 attendu)`)
      if (a.length !== 1) { D.push(`${args.join(' ')} : ${a.length} appel(s) ssh (1 attendu)`); continue }
      for (const d of defautsAppelSsh(a[0])) D.push(`${args.join(' ')} : ${d}`)
      if (commandeDistante(a[0]) !== `sudo -n -u agents /usr/local/bin/presti-coffre ${attendu}`) D.push(`${args.join(' ')} : commande distante « ${court(commandeDistante(a[0]), 90)} » (« sudo -n -u agents /usr/local/bin/presti-coffre ${attendu} » attendue)`)
      if (args[0] === 'noms' && !/PRESTI_JETON_CHEF[\s\S]*PRESTI_JETON_USINE/.test(r.sortie)) D.push('noms : la sortie de l\'usine n\'est pas imprimée telle quelle')
    }
    banc.vider()
    const ri = await lancerUC(['noms'], { mode: 'injoignable' })
    if (ri.code !== 5 || !/usine injoignable/i.test(`${ri.sortie}${ri.erreur}`)) D.push(`ssh en 255 : code ${ri.code}, « ${court(ri.erreur || ri.sortie, 80)} » (code 5 et « usine injoignable » attendus)`)
    return 'tout argument hors grammaire (dont --valeur= et une valeur en argument) → code 2 sans ssh ; noms, retirer <NOM> et etat relayés tels quels ; ssh en 255 → code 5, « usine injoignable »'
  })

  await juger(R, 'CF-13', async (D) => {
    if (!existe(fUC)) { D.push(absent(FICHIERS.usineCoffre)); return }
    const src = lire(fUC)
    if (/System32|WindowsPowerShell|SystemRoot|windir|pwsh/i.test(src)) { D.push('usine-coffre.mjs désigne powershell par un chemin absolu : la doublure du PATH ne serait pas prise ; essai refusé pour ne jamais toucher l\'environnement Windows de Benj'); return }
    // Une copie de l'arbre qui ne porte que usine-coffre.mjs et ce qu'il importe, et la doublure d'agents-jeton.mjs.
    const C = dossierNeuf('coffre', 'cf13')
    const copie = path.join(C, 'arbre')
    const aCopier = new Set()
    const suivre = (f) => {
      if (aCopier.has(f) || !existe(f)) return
      aCopier.add(f)
      for (const m of lire(f).matchAll(/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) suivre(path.resolve(path.dirname(f), m[1]))
    }
    suivre(fUC)
    for (const f of aCopier) { const cible = path.join(copie, path.relative(RACINE, f)); fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(f, cible) }
    const secret = dossierNeuf('coffre', 'cf13-graine') // hors du dossier d'essai : la graine du jeton, lue par la doublure
    const jeton = aleatoire('alnum', 44, true)
    SECRETS.push(jeton)
    fs.writeFileSync(path.join(secret, 'jeton.txt'), `${jeton}\n`)
    const modeDoublure = path.join(C, 'mode-doublure.txt')
    const journalJeton = path.join(C, 'agents-jeton-appels.jsonl')
    fs.writeFileSync(path.join(copie, 'scripts', 'agents-jeton.mjs'), [
      '// Doublure d\'agents-jeton.mjs (026-040) posée par usine-socle-qa (026-048, CF-13) : écrit sur sa sortie le jeton tiré par le juge.',
      "import fs from 'node:fs'",
      `fs.appendFileSync(${JSON.stringify(journalJeton)}, JSON.stringify({ argv: process.argv.slice(2) }) + '\\n')`,
      `if (fs.readFileSync(${JSON.stringify(modeDoublure)}, 'utf8').trim() === 'echec') { process.stderr.write('doublure : échec voulu\\n'); process.exit(1) }`,
      `process.stdout.write(fs.readFileSync(${JSON.stringify(path.join(secret, 'jeton.txt'))}, 'utf8'))`, ''].join('\n'))
    const bancJ = bancSsh(path.join(C, 'journaux'))
    const cheminsJ = [doublures().dirPs, doublures().dirPath]
    const lancerJ = (args) => lancer(process.execPath, [path.join(copie, 'scripts', 'usine-coffre.mjs'), ...args], { cwd: copie, env: envDe({ ...bancJ.env('enregistrer'), HOME: versSlash(path.join(T, 'uc-home')), USERPROFILE: path.join(T, 'uc-home') }, cheminsJ, { pathSysteme: false }), delaiMs: 60_000 })
    const regAvant = WIN ? spawnSync('reg', ['query', 'HKCU\\Environment', '/v', 'PRESTI_JETON_CHEF'], { encoding: 'utf8', windowsHide: true }) : null
    const empAvant = regAvant && regAvant.status === 0 ? sha256(regAvant.stdout) : null
    fs.writeFileSync(modeDoublure, 'ok\n')
    const r = await lancerJ(['poser-jeton-agent', 'chef', '--copie-windows=PRESTI_JETON_CHEF'])
    sorties.push({ quoi: 'usine-coffre.mjs poser-jeton-agent', texte: `${r.sortie}\n${r.erreur}` })
    const aS = bancJ.appels(), aP = bancJ.ps()
    const appelsJeton = existe(journalJeton) ? lignesDe(lire(journalJeton)).map((l) => JSON.parse(l)) : []
    if (r.code !== 0) D.push(`poser-jeton-agent chef --copie-windows=PRESTI_JETON_CHEF : code ${r.code} (0 attendu) — ${court(r.erreur || r.sortie, 140)}`)
    if (appelsJeton.length !== 1 || JSON.stringify(appelsJeton[0]?.argv) !== JSON.stringify(['chef', '--sortie=tube'])) D.push(`la doublure d'agents-jeton.mjs a reçu ${court(JSON.stringify(appelsJeton.map((x) => x.argv)), 100)} (une fois « chef --sortie=tube » attendu)`)
    if (aS.length !== 1) D.push(`${aS.length} appel(s) ssh (1 attendu)`)
    else {
      for (const d of defautsAppelSsh(aS[0])) D.push(d.split(jeton).join('<jeton>'))
      if (commandeDistante(aS[0]) !== 'sudo -n -u agents /usr/local/bin/presti-coffre poser PRESTI_JETON_CHEF') D.push(`commande distante « ${court(String(commandeDistante(aS[0])).split(jeton).join('<jeton>'), 90)} » (« … presti-coffre poser PRESTI_JETON_CHEF » attendue)`)
      if (aS[0].stdinTexte !== `${jeton}\n`) D.push('le faux ssh n\'a pas reçu le jeton exact (suivi d\'un retour à la ligne) sur son entrée standard')
    }
    if (aP.length !== 1) D.push(`${aP.length} appel(s) de la doublure de powershell (1 attendu)`)
    else {
      if (aP[0].stdinTexte.replace(/\r?\n$/, '') !== jeton) D.push('la doublure de powershell n\'a pas reçu le jeton sur son entrée standard')
      if (!aP[0].argv.some((x) => x.includes('PRESTI_JETON_CHEF'))) D.push('la doublure de powershell n\'a pas PRESTI_JETON_CHEF dans son argv')
    }
    for (const x of [...aS, ...aP, ...appelsJeton]) if (JSON.stringify(x.argv).includes(jeton)) D.push('LE JETON EST DANS UN ARGV consigné')
    if (fuite(`${r.sortie}\n${r.erreur}`, jeton)) D.push('le jeton apparaît sur la sortie ou l\'erreur d\'usine-coffre.mjs')
    const fichiersEssai = []
    const marcher = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) marcher(p); else if (!p.endsWith('.stdin')) fichiersEssai.push(p) } }
    marcher(C)
    for (const f of fichiersEssai) if (fs.readFileSync(f).includes(jeton)) D.push(`le jeton est écrit dans un fichier du dossier d'essai : ${rel(f)}`)
    // Doublure en échec : code 1, aucun ssh ; nom hors liste : code 2, aucune doublure.
    bancJ.vider(); nettoyer(journalJeton); fs.writeFileSync(modeDoublure, 'echec\n')
    const r1 = await lancerJ(['poser-jeton-agent', 'chef'])
    if (r1.code !== 1) D.push(`agents-jeton.mjs en code 1 : usine-coffre rend ${r1.code} (1 attendu)`)
    if (bancJ.appels().length || bancJ.ps().length) D.push('agents-jeton.mjs en échec : ssh ou powershell appelé quand même')
    bancJ.vider(); nettoyer(journalJeton); fs.writeFileSync(modeDoublure, 'ok\n')
    const r2 = await lancerJ(['poser-jeton-agent', 'inconnu'])
    if (r2.code !== 2) D.push(`poser-jeton-agent inconnu (PRESTI_JETON_INCONNU, hors liste) : code ${r2.code} (2 attendu)`)
    if (existe(journalJeton) || bancJ.appels().length || bancJ.ps().length) D.push('poser-jeton-agent inconnu : une doublure a été lancée')
    if (WIN) {
      const regApres = spawnSync('reg', ['query', 'HKCU\\Environment', '/v', 'PRESTI_JETON_CHEF'], { encoding: 'utf8', windowsHide: true })
      const empApres = regApres.status === 0 ? sha256(regApres.stdout) : null
      if (empApres !== empAvant) D.push('ALERTE : la variable utilisateur Windows PRESTI_JETON_CHEF a changé pendant l\'essai (le vrai powershell a été lancé) : la retirer ou la reposer à la main')
    }
    return 'poser-jeton-agent chef : le jeton de la doublure part au faux ssh (… presti-coffre poser PRESTI_JETON_CHEF, entrée standard) et à la doublure de powershell (entrée standard, PRESTI_JETON_CHEF dans l\'argv) ; jamais dans un argv, une sortie ni un fichier d\'essai ; doublure en échec → 1 sans ssh ; nom hors liste → 2 sans doublure'
  })

  // Balayage final : aucune valeur d'essai dans aucune sortie ni aucun argv consigné (un défaut de plus pour CF-9/CF-11).
  const toutesSorties = sorties.map((x) => x.texte).join('\n')
  const fuites = SECRETS.filter((v) => v && v.length >= 20 && toutesSorties.includes(v))
  if (fuites.length) R.fail('CF-9', `${fuites.length} valeur(s) d'essai du coffre retrouvée(s) sur une sortie ou une erreur d'un script jugé (${sorties.filter((x) => fuites.some((v) => x.texte.includes(v))).map((x) => x.quoi).slice(0, 3).join(', ')})`)
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Groupe socle (026-050) : SO-1 à SO-10
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const MOTIFS_INTEGRES = [ // copie des motifs de scripts/usine.mjs (026-002) ; ceux de instantane-quotidien.mjs s'y ajoutent s'il existe
  { nom: 'sk_ (clé secrète Stripe ou autre)', re: /\b([sr]k_(?:live|test)_[0-9A-Za-z]{8,}|sk_[0-9A-Za-z_]{20,})/ },
  { nom: 'sk- (clé Anthropic / OpenAI)', re: /\b(sk-(?:ant-|proj-)?[0-9A-Za-z_-]{20,})/ },
  { nom: 'whsec_', re: /\b(whsec_[0-9A-Za-z]{16,})/ },
  { nom: 'eyJ (JWT)', re: /\b(eyJ[0-9A-Za-z_-]{15,}|eyJ[0-9A-Za-z_-]*\.eyJ[0-9A-Za-z_-]*)/ },
  { nom: 'sb_secret_', re: /\b(sb_secret_[0-9A-Za-z_-]{16,})/ },
  { nom: 'bloc PEM', re: /(-----BEGIN (?!PUBLIC KEY-----)[A-Z0-9 ]+-----)/ },
  { nom: 'ghp_ / github_pat_', re: /\b(gh[pousr]_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{40,})/ },
  { nom: 'AIza (clé Google)', re: /\b(AIza[0-9A-Za-z_-]{35})/ },
  { nom: 're_ (clé Resend)', re: /\b(re_[0-9A-Za-z]{8,}_[0-9A-Za-z]{16,})/ },
]
async function motifsSecrets() {
  const m = [...MOTIFS_INTEGRES]
  for (const f of [R_('scripts/instantane-quotidien.mjs'), path.join(DEPOT, 'scripts', 'instantane-quotidien.mjs')]) {
    if (!existe(f)) continue
    try {
      const mod = await import(pathToFileURL(f).href)
      if (Array.isArray(mod.MOTIFS_SECRETS)) for (const x of mod.MOTIFS_SECRETS) if (x && x.re instanceof RegExp) m.push({ nom: x.nom || String(x.re), re: new RegExp(x.re.source, x.re.flags.replace(/[gy]/g, '')) })
      return { motifs: m, source: rel(f) }
    } catch { /* un import qui échoue : les motifs intégrés suffisent */ }
  }
  return { motifs: m, source: 'motifs intégrés (copie de scripts/usine.mjs)' }
}

async function groupeSocle(R) {
  const T = dossierNeuf('socle')
  const fAg = R_(FICHIERS.usineAgents)
  const fSocle = R_(FICHIERS.socleSh)
  const fJournal = R_(FICHIERS.journalSh)
  const fDoc = R_(FICHIERS.doc)
  const banc = bancSsh(path.join(T, 'ssh'))
  const tousAppels = []
  const home = path.join(T, 'home')
  fs.mkdirSync(path.join(home, '.ssh'), { recursive: true })
  fs.writeFileSync(path.join(home, '.ssh', 'presti-usine'), 'cle d\'essai factice du juge usine-socle-qa\n')
  const lancerAg = async (args, mode = 'enregistrer', b = banc) => {
    b.vider()
    const r = await lancer(process.execPath, [fAg, ...args], { cwd: RACINE, env: envDe({ ...b.env(mode), HOME: versSlash(home), USERPROFILE: home }, b.chemins), delaiMs: 60_000 })
    const appels = b.appels()
    tousAppels.push(...appels.map((a) => ({ ...a, pour: args.join(' ') })))
    return { ...r, appels, scp: b.scp() }
  }
  const absent = (relatif) => `${relatif} absent : le fichier de la fiche 026-050 n'existe pas (encore)`
  const contenuSocle = existe(fSocle) ? lf(lire(fSocle)).trim() : null

  await juger(R, 'SO-1', async (D) => {
    if (!existe(fAg)) { D.push(absent(FICHIERS.usineAgents)); return }
    if (!existe(fSocle)) { D.push(absent(FICHIERS.socleSh)); return }
    const a = await lancerAg(['socle', '--a-sec'])
    if (a.code !== 0) D.push(`socle --a-sec : code ${a.code} (0 attendu) — ${court(a.erreur, 120)}`)
    if (a.appels.length) D.push(`socle --a-sec : ${a.appels.length} appel(s) ssh (aucun attendu)`)
    if (!lf(a.sortie).includes(contenuSocle)) D.push('socle --a-sec n\'imprime pas le script distant (le contenu de scripts/usine/socle.sh)')
    const b = await lancerAg(['socle'])
    if (b.code !== 0) D.push(`socle : code ${b.code} (0 attendu, faux ssh en code 0) — ${court(b.erreur, 120)}`)
    if (b.appels.length !== 1) { D.push(`socle : ${b.appels.length} appel(s) ssh (1 attendu)`); return }
    const x = b.appels[0]
    for (const d of defautsAppelSsh(x)) D.push(`socle : ${d}`)
    if (commandeDistante(x) !== 'bash -s') D.push(`socle : commande distante « ${court(commandeDistante(x), 80)} » (« bash -s » attendue)`)
    const entree = lf(x.stdinTexte)
    const iProfil = entree.search(/(^|\n)\s*(\.|source)\s+("?\$HOME"?|~|\$\{HOME\})\/\.profile/)
    const iScript = entree.indexOf(contenuSocle)
    if (iScript < 0) D.push('socle : le script sur l\'entrée standard de ssh n\'est pas celui de scripts/usine/socle.sh')
    if (iProfil < 0 || (iScript >= 0 && iProfil > iScript)) D.push('socle : ~/.profile n\'est pas chargé avant le script (préambule de scripts/usine.mjs)')
    if (/\bbash\s+-l\b/.test(entree)) D.push('socle : « bash -l » dans le script distant')
    if (x.stdin.includes(0x0d)) D.push('socle : le script envoyé à bash -s porte des fins de ligne \\r\\n (le poste est en core.autocrlf=true) : bash échouerait sur l\'usine')
    return 'socle --a-sec imprime le script sans appeler ssh ; socle passe « bash -s » au faux ssh, ~/.profile chargé puis le script de socle.sh sur l\'entrée standard, jamais bash -l'
  })

  const S = contenuSocle !== null ? analyserBash(contenuSocle) : null
  // socle.sh joué sur le banc, connecté sous ubuntu (le compte qui a sudo), compte agents absent (premier passage) ou déjà
  // présent (rejeu) ; /srv/presti-agents absent dans les deux cas. Joué une fois par état, relu par SO-2 et SO-4.
  const simsSocle = new Map()
  const simSocle = async (etat) => {
    if (!simsSocle.has(etat)) simsSocle.set(etat, await simuler(contenuSocle, { nom: `socle-agents-${etat}`, env: { SIM_AGENTS: etat, SIM_MOI: 'ubuntu' } }))
    return simsSocle.get(etat)
  }
  const etatsSocle = { absent: 'compte agents absent', present: 'compte agents déjà présent' }
  await juger(R, 'SO-2', async (D) => {
    if (!S) { D.push(absent(FICHIERS.socleSh)); return }
    const I = S.instrs
    if (!/^set -[a-zA-Z]*e[a-zA-Z]*u[a-zA-Z]*o pipefail$/.test(I[0]?.texte || '')) D.push(`première instruction : « ${court(I[0]?.texte, 60)} » (set -euo pipefail attendu)`)
    const ua = I.filter((i) => i.commande === 'useradd' && i.mots.includes('agents'))
    if (ua.length !== 1) D.push(`${ua.length} useradd du compte agents (1 attendu)`)
    for (const u of ua) {
      if (!u.mots.includes('--create-home') && !u.mots.includes('-m')) D.push('useradd agents sans --create-home')
      const { opts } = options(u.mots, ['-s', '--shell', '-G', '--groups', '-g', '--gid', '-d', '--home-dir', '-u', '--uid'])
      if ((opts.get('--shell') || opts.get('-s')) !== '/usr/sbin/nologin') D.push(`useradd agents avec le shell « ${opts.get('--shell') || opts.get('-s') || 'par défaut'} » (/usr/sbin/nologin attendu)`)
      if (opts.get('-G') || opts.get('--groups')) D.push(`useradd agents avec des groupes : ${opts.get('-G') || opts.get('--groups')}`)
      const garde = [...u.conds, ...u.avantDansListe.map((x) => x.texte)].some((c) => /\b(id\b[^|;]*\bagents\b|getent\s+passwd\s+agents)/.test(c))
      if (!garde) D.push('useradd agents n\'est pas gardé par un test d\'existence (id agents / getent passwd agents) : le script ne serait pas rejouable')
    }
    for (const i of I) {
      if (/^(usermod|gpasswd|adduser|groupmems|useradd)$/.test(i.commande) && i.mots.includes('agents') && i.mots.some((w) => w.split(',').some((g) => ['sudo', 'adm', 'admin'].includes(g)))) D.push(`ligne ${i.ligne} : le compte agents entre dans un groupe sudo, adm ou admin : « ${court(i.brut, 80)} »`)
      if (/\bagents\s+ALL\s*=/.test(`${i.brut}\n${i.heredoc || ''}`)) D.push(`ligne ${i.ligne} : une règle sudoers pour le compte agents`)
    }
    const d = droitsPoses(I)
    for (const p of ['/home/agents', '/home/agents/.config/presti', '/home/agents/travail']) {
      const x = d.get(p) || {}
      if (!mode700(x.mode)) D.push(`${p} : mode ${x.mode || 'jamais posé'} (700 attendu)`)
      if (x.proprio !== 'agents') D.push(`${p} : propriétaire ${x.proprio || 'jamais posé'} (agents attendu)`)
    }
    // Et joué : compte absent → exactement un useradd agents et le script va au bout ; compte présent → aucun useradd. Une
    // condition inversée (useradd quand le compte existe) passe la lecture ci-dessus, pas ceci.
    for (const etat of Object.keys(etatsSocle)) {
      const s = await simSocle(etat)
      const ua = s.appels.filter((a) => /^(useradd|adduser)$/.test(a.cmd) && a.args.includes('agents'))
      if (s.code !== 0) D.push(`socle.sh joué sur le banc, ${etatsSocle[etat]} : code ${s.code} (0 attendu) — ${court(s.erreur, 160)}`)
      if (etat === 'absent' && ua.length !== 1) D.push(`socle.sh joué sur le banc, compte agents absent : ${ua.length} useradd agents exécuté(s) (1 attendu : le compte doit être créé)`)
      if (etat === 'absent' && ua.length === 1 && !ua[0].args.some((w) => w === '--create-home' || w === '-m')) D.push('socle.sh joué sur le banc : useradd agents exécuté sans --create-home')
      if (etat === 'present' && ua.length) D.push(`socle.sh joué sur le banc, compte agents déjà présent : ${ua.length} useradd agents exécuté(s) (aucun attendu : le script doit être rejouable)`)
    }
    return 'set -euo pipefail ; agents créé s\'il manque (--create-home, /usr/sbin/nologin), dans aucun groupe sudo, adm ni admin ; /home/agents, .config/presti et travail en 700, propriété d\'agents ; joué sur le banc : un useradd agents si le compte manque, aucun s\'il existe, code 0 les deux fois'
  })

  await juger(R, 'SO-3', async (D) => {
    if (!S) { D.push(absent(FICHIERS.socleSh)); return }
    const I = S.instrs
    const texte = S.texte
    const regles = [...texte.matchAll(/usine\s+ALL\s*=\s*\([^)\n]*\)\s*[^\n'"\\]*/g)].map((m) => m[0].replace(/\s+/g, ' ').trim())
    const attendues = ['usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-coffre', 'usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-journal']
    const uniques = [...new Set(regles)]
    if (JSON.stringify([...uniques].sort()) !== JSON.stringify(attendues)) D.push(`règles sudoers ${JSON.stringify(uniques)} : exactement les deux règles du socle attendues`)
    if (/SETENV/.test(texte)) D.push('SETENV dans le script')
    if (/env_keep/.test(texte)) D.push('env_keep dans le script')
    const vis = I.find((i) => i.commande === 'visudo' && (i.mots.includes('-cf') || (i.mots.includes('-c') && i.mots.includes('-f'))))
    const inst = I.find((i) => i.commande === 'install' && i.mots.includes('/etc/sudoers.d/presti-agents'))
    if (!vis) D.push('aucun « visudo -cf <temporaire> »')
    if (!inst) D.push('aucun « install -m 440 <temporaire> /etc/sudoers.d/presti-agents »')
    if (vis && inst) {
      if (vis.index > inst.index) D.push(`visudo -cf (ligne ${vis.ligne}) vient après l'install (ligne ${inst.ligne})`)
      const { opts, args } = options(inst.mots, ['-m', '--mode', '-o', '--owner', '-g', '--group'])
      if (!/^0?440$/.test(String(opts.get('-m') || opts.get('--mode') || ''))) D.push(`install du sudoers en mode ${opts.get('-m') || opts.get('--mode') || 'par défaut'} (440 attendu)`)
      const src = args[0]
      const fVis = vis.mots[vis.mots.length - 1]
      if (!src || src !== fVis) D.push(`le fichier contrôlé par visudo (${fVis}) n'est pas celui installé (${src})`)
      const tmpVar = /\$\{?([A-Za-z_]\w*)/.exec(inst.brut.split(/\s+/).find((w) => /\$/.test(w) && !/sudoers/.test(w)) || '')
      if (tmpVar && !/mktemp/.test(S.vars.get(tmpVar[1]) || '')) D.push(`le fichier sudoers ne passe pas par un temporaire (mktemp) : ${tmpVar[1]}`)
    }
    for (const i of I) {
      const cibles = [...i.plat.matchAll(/(?:\d?>>?|&>>?)\s*(\S+)/g)].map((m) => m[1])
      if (cibles.some((c) => /^\/etc\/sudoers/.test(c)) || (/\btee\b/.test(i.plat) && /\/etc\/sudoers/.test(i.plat))) D.push(`ligne ${i.ligne} : écriture directe dans /etc/sudoers* : « ${court(i.brut, 80)} »`)
      if (/^(cp|mv)$/.test(i.commande) && /\/etc\/sudoers/.test(i.plat)) D.push(`ligne ${i.ligne} : ${i.commande} vers /etc/sudoers* (install après visudo attendu)`)
    }
    return 'le sudoers passe par un temporaire contrôlé par visudo -cf avant install -m 440 dans /etc/sudoers.d/presti-agents ; exactement les deux règles presti-coffre et presti-journal ; ni SETENV, ni env_keep, ni ALL en commande'
  })

  await juger(R, 'SO-4', async (D) => {
    if (!S) { D.push(absent(FICHIERS.socleSh)); return }
    const I = S.instrs
    for (const [src, dst] of [['presti-coffre.sh', '/usr/local/bin/presti-coffre'], ['presti-journal.sh', '/usr/local/bin/presti-journal']]) {
      const i = I.find((x) => x.commande === 'install' && x.mots[x.mots.length - 1] === dst)
      if (!i) { D.push(`aucun install vers ${dst}`); continue }
      const { opts, args } = options(i.mots, ['-m', '--mode', '-o', '--owner', '-g', '--group'])
      if (args[0] !== `/srv/presti-agents/scripts/usine/${src}`) D.push(`${dst} installé depuis « ${args[0]} » (/srv/presti-agents/scripts/usine/${src} attendu : jamais depuis le poste)`)
      if ((opts.get('-o') || opts.get('--owner')) !== 'root' || (opts.get('-g') || opts.get('--group')) !== 'root') D.push(`${dst} : propriétaire ${opts.get('-o') || '?'}:${opts.get('-g') || '?'} (root:root attendu)`)
      if (!/^0?755$/.test(String(opts.get('-m') || opts.get('--mode') || ''))) D.push(`${dst} : mode ${opts.get('-m') || 'par défaut'} (755 attendu)`)
    }
    const wt = I.find((i) => i.commande === 'git' && /\bworktree add\b/.test(i.plat) && i.mots.includes('--detach') && i.mots.includes('/srv/presti-agents') && i.mots.includes('origin/main'))
    if (!wt) D.push('aucun « git worktree add --detach /srv/presti-agents origin/main »')
    else if (!/(-C (\$HOME|\/home\/usine)\/presti\b)/.test(wt.plat) && !wt.conds.join(' ').includes('presti') && !I.some((i) => i.commande === 'cd' && /(\$HOME|\/home\/usine)\/presti$/.test(i.plat) && i.index < wt.index)) D.push('le worktree n\'est pas pris dans ~/presti (git -C ~/presti …)')
    const d = droitsPoses(I)
    const srv = d.get('/srv/presti-agents') || {}
    if (srv.proprio !== 'usine') D.push(`/srv/presti-agents : propriétaire ${srv.proprio || 'jamais posé'} (usine, groupe agents, attendu)`)
    // Récursif : sans -R (revue Codex du 27/09), seul le dossier racine prend le groupe agents, pas le code qu'il contient.
    const usineAgents = (w) => /^usine[:.]agents$/.test(w)
    const recursif = (w) => /^-[A-Za-z]*R[A-Za-z]*$/.test(w) || w === '--recursive'
    const chownR = (cmd, mots) => (cmd === 'chown' && mots.map(sansSlashFinal).includes('/srv/presti-agents') && mots.some(usineAgents) && mots.some(recursif))
      || (cmd === 'find' && sansSlashFinal(mots[0] || '') === '/srv/presti-agents' && mots.includes('chown') && mots.some(usineAgents) && !mots.includes('-maxdepth'))
    if (!I.some((i) => chownR(i.commande, i.mots.slice(1)))) D.push('aucun « chown -R usine:agents /srv/presti-agents » (récursif : sans -R, le contenu de l\'arbre n\'a pas le groupe agents)')
    // Et joué sur le banc, aux deux passages (premier et rejeu) : le chown récursif est exécuté, pas seulement écrit.
    for (const etat of Object.keys(etatsSocle)) {
      const s = await simSocle(etat)
      if (s.code === 0 && !s.appels.some((a) => chownR(a.cmd, a.args))) D.push(`socle.sh joué sur le banc, ${etatsSocle[etat]} : aucun chown récursif usine:agents de /srv/presti-agents exécuté`)
    }
    const modesSrv = I.filter((i) => (i.commande === 'chmod' && i.mots.some((w) => w.startsWith('/srv/presti-agents'))) || (i.commande === 'find' && i.mots.includes('/srv/presti-agents') && i.mots.includes('chmod')))
    const retireEcriture = modesSrv.some((i) => {
      const m = i.commande === 'find' ? i.mots[i.mots.indexOf('chmod') + 1] : i.mots.slice(1).find((w) => !w.startsWith('-'))
      return /^[0-7]?[0-7][0145][0145]$/.test(m || '') || /(^|,)(g|go|og|o|a)?-[rx]*w/.test(m || '') || /^u=[rwxX]*,g=[rxX]*,o=[rxX]*$/.test(m || '')
    })
    if (!retireEcriture) D.push('aucun chmod qui ôte l\'écriture au groupe et aux autres sur /srv/presti-agents')
    for (const i of modesSrv) {
      const m = i.commande === 'find' ? i.mots[i.mots.indexOf('chmod') + 1] : i.mots.slice(1).find((w) => !w.startsWith('-'))
      if (/^[0-7]?[0-7][2367][0-7]$|^[0-7]?[0-7][0-7][2367]$/.test(m || '') || /(^|,)(g|o|a|go|og)?\+[rx]*w/.test(m || '')) D.push(`ligne ${i.ligne} : ${court(i.brut, 70)} donne l'écriture au groupe ou aux autres`)
    }
    for (const [lien, cible] of [['/srv/presti-agents/.orchestre/travail', '/home/agents/travail'], ['/srv/presti-agents/.orchestre/quotas.json', '/home/agents/travail/quotas.json']]) {
      const ln = I.find((i) => i.commande === 'ln' && i.mots.some((w) => /^-[a-zA-Z]*s/.test(w)) && sansSlashFinal(i.mots[i.mots.length - 1]) === lien)
      if (!ln) D.push(`aucun lien symbolique ${lien}`)
      else if (sansSlashFinal(ln.mots[ln.mots.length - 2]) !== cible) D.push(`${lien} pointe vers ${ln.mots[ln.mots.length - 2]} (${cible} attendu)`)
    }
    for (const i of I) {
      const t = `${i.plat} ${i.heredoc || ''}`
      if (/\bufw\b/.test(t)) D.push(`ligne ${i.ligne} : ufw (il retire iptables-persistent et les règles d'Oracle)`)
      if (/\biptables\b/.test(t)) D.push(`ligne ${i.ligne} : iptables`)
      if (/\bbubblewrap\b/.test(t)) D.push(`ligne ${i.ligne} : bubblewrap (Codex prendrait /usr/bin/bwrap, hors du profil AppArmor)`)
      if (/sshd_config|\/etc\/ssh\/|systemctl\s+(restart|reload)\s+sshd?\b/.test(t)) D.push(`ligne ${i.ligne} : la configuration de sshd`)
    }
    return 'presti-coffre et presti-journal installés depuis /srv/presti-agents/scripts/usine/*.sh en root:root 755 ; /srv/presti-agents = worktree détaché de ~/presti sur origin/main, usine:agents (chown -R, exécuté sur le banc aux deux passages), sans écriture pour le groupe ni les autres ; travail et quotas.json liés vers /home/agents/travail ; ni ufw, ni iptables, ni bubblewrap, ni sshd'
  })

  await juger(R, 'SO-5', async (D) => {
    if (!existe(fAg)) { D.push(absent(FICHIERS.usineAgents)); return }
    const m = await lancerAg(['maj'])
    const f = await lancerAg(['maj', '--forcer'])
    if (m.code !== 0 || m.appels.length !== 1) { D.push(`maj : code ${m.code}, ${m.appels.length} appel(s) ssh (0 et 1 attendus)`); return }
    for (const d of defautsAppelSsh(m.appels[0])) D.push(`maj : ${d}`)
    if (commandeDistante(m.appels[0]) !== 'bash -s') D.push(`maj : commande distante « ${court(commandeDistante(m.appels[0]), 60)} » (bash -s attendue)`)
    const A = analyserBash(m.appels[0].stdinTexte)
    const I = A.instrs
    if (!I.some((i) => i.commande === 'git' && /\bfetch\b/.test(i.plat))) D.push('maj : aucun git fetch')
    if (!I.some((i) => i.commande === 'git' && i.plat.includes('/srv/presti-agents') && /\b(checkout|reset|switch)\b/.test(i.plat) && i.plat.includes('origin/main'))) D.push('maj : l\'arbre /srv/presti-agents n\'est pas avancé sur origin/main')
    const npm = I.filter((i) => /\bnpm\s+(ci|install|i)\b/.test(i.plat))
    if (!npm.length) D.push('maj : aucun npm ci')
    for (const i of npm) {
      if (!/\bnpm ci\b/.test(i.plat)) D.push(`maj : « ${court(i.brut, 60)} » (npm ci attendu)`)
      if (!/(^|\s)--ignore-scripts(?=\s|\)|$)/.test(i.plat)) D.push(`maj : npm ci sans --ignore-scripts : « ${court(i.brut, 70)} »`)
      if (!/\bHUSKY=0\b/.test(i.plat) && !I.some((x) => /^(export )?HUSKY=0$/.test(x.texte) && x.index < i.index)) D.push('maj : npm ci sans HUSKY=0')
      const conditionne = [...i.conds, ...i.avantDansListe.map((x) => x.texte)].some((c) => /package-lock\.json/.test(c))
      if (!conditionne) D.push('maj : npm ci n\'est pas conditionné à un changement de package-lock.json')
    }
    const pw = I.find((i) => /\bplaywright\s+install\b/.test(i.plat))
    if (!pw) D.push('maj : les navigateurs Playwright ne sont pas installés')
    else if (!/PLAYWRIGHT_BROWSERS_PATH=\/srv\/playwright/.test(pw.plat) && !I.some((x) => /^(export )?PLAYWRIGHT_BROWSERS_PATH=\/srv\/playwright$/.test(x.plat) && x.index < pw.index)) D.push('maj : Playwright installé ailleurs que dans /srv/playwright (PLAYWRIGHT_BROWSERS_PATH)')
    if (!I.some((i) => /^(chmod|chown|setfacl)$/.test(i.commande) && i.plat.includes('/srv/playwright')) && !I.some((i) => i.commande === 'install' && i.plat.includes('/srv/playwright'))) D.push('maj : /srv/playwright n\'est pas rendu lisible par le groupe agents')
    if (!I.some((i) => /^(chmod|chown)$/.test(i.commande) && i.plat.includes('/srv/presti-agents')) && !I.some((i) => i.commande === 'find' && i.plat.includes('/srv/presti-agents') && /chmod/.test(i.plat))) D.push('maj : les droits de /srv/presti-agents ne sont pas réappliqués')
    const garde = I.some((i) => /\bsystemctl\b/.test(i.plat) && /presti-/.test(i.plat)) && I.some((i) => /^exit 1$/.test(i.texte))
    if (!garde) D.push('maj : aucun refus (exit 1) quand un service presti-* est actif')
    if (f.code !== 0 || f.appels.length !== 1) D.push(`maj --forcer : code ${f.code}, ${f.appels.length} appel(s) ssh`)
    else if (lf(f.appels[0].stdinTexte) === lf(m.appels[0].stdinTexte)) D.push('maj --forcer envoie le même script que maj : --forcer ne lève pas le refus')
    if (!I.some((i) => !i.affecte && /\bgit -C \/srv\/presti-agents (rev-parse|log -1|describe)\b/.test(i.plat))) D.push('maj : le commit déployé n\'est pas imprimé')
    // Et joué sur le banc (/srv/presti-agents/.git et /srv/playwright posés) : la garde se juge à ses effets. Une garde
    // inversée (revue Codex du 27/09 : refus quand AUCUN service ne tourne) contient les mêmes mots.
    const arbreMaj = (p) => { fs.mkdirSync(p('srv/presti-agents/.git'), { recursive: true }); fs.mkdirSync(p('srv/playwright'), { recursive: true }); fs.writeFileSync(p('srv/presti-agents/package-lock.json'), '{}\n') }
    const avance = (s) => s.appels.some((a) => a.cmd === 'git' && a.args.map(sansSlashFinal).includes('/srv/presti-agents') && a.args.some((w) => /^(checkout|reset|switch)$/.test(w)) && a.args.includes('origin/main'))
    const actifs = 'presti-atelier.service presti-surveillance.service'
    const sA = await simuler(m.appels[0].stdinTexte, { nom: 'maj-services-actifs', env: { SIM_ACTIFS: actifs }, preparer: arbreMaj })
    if (sA.code !== 1) D.push(`maj joué sur le banc, deux services presti-* en marche : code ${sA.code} (1 attendu : refus)`)
    if (avance(sA)) D.push('maj joué sur le banc, deux services presti-* en marche : l\'arbre est avancé quand même')
    const sR = await simuler(m.appels[0].stdinTexte, { nom: 'maj-au-repos', env: { SIM_ACTIFS: '' }, preparer: arbreMaj })
    if (sR.code !== 0) D.push(`maj joué sur le banc, aucun service presti-* en marche : code ${sR.code} (0 attendu) — ${court(sR.erreur, 160)}`)
    else if (!avance(sR)) D.push('maj joué sur le banc, aucun service presti-* en marche : l\'arbre /srv/presti-agents n\'est pas avancé sur origin/main')
    if (f.code === 0 && f.appels.length === 1) {
      const sF = await simuler(f.appels[0].stdinTexte, { nom: 'maj-forcer', env: { SIM_ACTIFS: actifs }, preparer: arbreMaj })
      if (sF.code !== 0 || !avance(sF)) D.push(`maj --forcer joué sur le banc, services en marche : code ${sF.code}${sF.code === 0 ? ', arbre non avancé' : ''} (0 et l'arbre avancé sur origin/main attendus)`)
    }
    return 'maj : git fetch, arbre avancé sur origin/main, HUSKY=0 npm ci --ignore-scripts seulement si package-lock.json change, Playwright dans /srv/playwright lisible par agents, droits réappliqués, refus si un service presti-* est actif (sauf --forcer), commit déployé imprimé ; joué sur le banc : services en marche → code 1 sans toucher l\'arbre, au repos → 0 et arbre avancé, --forcer → 0 et arbre avancé'
  })

  const UNITES = JSON.parse(lire(path.join(FIX, 'unites', 'noms.json')))
  await juger(R, 'SO-6', async (D) => {
    if (!existe(fAg)) { D.push(absent(FICHIERS.usineAgents)); return }
    const globRe = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`)
    const motifsDe = (I, filtre) => {
      const pris = []
      for (const i of I.filter(filtre)) {
        for (const t of [i.plat, ...i.boucles.map((b) => deplier(b, i.vars))]) for (const m of t.matchAll(/(presti-[A-Za-z0-9*?._-]+)/g)) pris.push(m[1].replace(/[;)"']+$/, ''))
      }
      return [...new Set(pris)]
    }
    const autres = (g) => Object.entries(UNITES.groupes).filter(([k]) => k !== g).flatMap(([, v]) => v.unites)
    // Le banc : dans l'arbre déployé, les unités de TOUS les groupes (et deux leurres hors groupe) ; dans /etc/systemd/system,
    // rien avant installer, tout avant arreter. Revue Codex du 27/09 : un installer qui saute les unités présentes au lieu de
    // les activer, ou un verify sur /dev/null, passaient la lecture du texte.
    const toutesUnites = [...new Set([...Object.values(UNITES.groupes).flatMap((v) => v.unites), 'presti-telegram.service', 'presti-veille.timer'])]
    const poserUnites = (dansEtc) => (p) => {
      for (const d of ['srv/presti-agents/scripts/usine/systemd', 'etc/systemd/system']) fs.mkdirSync(p(d), { recursive: true })
      for (const u of toutesUnites) {
        fs.writeFileSync(path.join(p('srv/presti-agents/scripts/usine/systemd'), u), `[Unit]\nDescription=essai du juge ${u}\n`)
        if (dansEtc) fs.writeFileSync(path.join(p('etc/systemd/system'), u), `[Unit]\nDescription=essai du juge ${u}\n`)
      }
    }
    const unitesDe = (appels, verbe) => appels.filter((a) => a.cmd === 'systemctl' && a.args.includes(verbe) && a.args.includes('--now')).flatMap((a) => a.args.filter((w) => !w.startsWith('-') && w !== verbe).map((w) => path.posix.basename(w)))
    for (const [g, def] of Object.entries(UNITES.groupes)) {
      const inst = await lancerAg(['installer', g])
      if (inst.code !== 0 || inst.appels.length !== 1) { D.push(`installer ${g} : code ${inst.code}, ${inst.appels.length} appel(s) ssh (0 et 1 attendus)`); continue }
      if (inst.scp.length) D.push(`installer ${g} : scp appelé (${inst.scp.length} fois) : rien ne vient du poste`)
      const I = analyserBash(inst.appels[0].stdinTexte).instrs
      if (I.some((i) => /\bscp\b/.test(i.plat))) D.push(`installer ${g} : scp dans le script distant`)
      const installs = I.filter((i) => i.commande === 'install' && (i.plat.includes('/etc/systemd/system') || i.boucles.some((b) => b.includes('/etc/systemd/system'))))
      if (!installs.length) D.push(`installer ${g} : aucun « install -m 644 … /etc/systemd/system/ »`)
      for (const i of installs) {
        const { opts } = options(i.mots, ['-m', '--mode', '-o', '--owner', '-g', '--group', '-t', '--target-directory'])
        if (!/^0?644$/.test(String(opts.get('-m') || opts.get('--mode') || ''))) D.push(`installer ${g} : unités installées en mode ${opts.get('-m') || 'par défaut'} (644 attendu)`)
      }
      const sources = motifsDe(I, (i) => i.commande === 'install' || /\/srv\/presti-agents\/scripts\/usine\/systemd/.test(i.plat) || i.boucles.some((b) => /\/srv\/presti-agents\/scripts\/usine\/systemd/.test(deplier(b, i.vars))))
      if (!I.some((i) => /\/srv\/presti-agents\/scripts\/usine\/systemd\//.test(`${i.plat} ${i.boucles.map((b) => deplier(b, i.vars)).join(' ')}`))) D.push(`installer ${g} : les unités ne viennent pas de /srv/presti-agents/scripts/usine/systemd/`)
      for (const u of def.unites) if (!sources.some((m) => globRe(m).test(u))) D.push(`installer ${g} : ${u} n'est couverte par aucun motif copié (${sources.join(', ') || 'aucun'})`)
      for (const u of autres(g)) if (sources.some((m) => globRe(m).test(u))) D.push(`installer ${g} : copie aussi ${u}, d'un autre groupe`)
      const verif = I.find((i) => /\bsystemd-analyze verify\b/.test(i.plat))
      const reload = I.find((i) => /\bsystemctl daemon-reload\b/.test(i.plat))
      if (!verif) D.push(`installer ${g} : aucun systemd-analyze verify`)
      if (!reload) D.push(`installer ${g} : aucun systemctl daemon-reload`)
      if (verif && reload && verif.index > reload.index) D.push(`installer ${g} : systemd-analyze verify après daemon-reload`)
      const actives = motifsDe(I, (i) => /\bsystemctl enable\b/.test(i.plat) && i.mots.includes('--now'))
      for (const u of def.a_activer) if (!actives.some((m) => globRe(m).test(u))) D.push(`installer ${g} : ${u} n'est pas activée (systemctl enable --now)`)
      for (const u of autres(g)) if (actives.some((m) => globRe(m).test(u))) D.push(`installer ${g} : active aussi ${u}, d'un autre groupe`)
      // Et joué sur le banc : ce qui arrive dans /etc/systemd/system, ce que verify contrôle, ce qui est activé.
      const si = await simuler(inst.appels[0].stdinTexte, { nom: `installer-${g}`, preparer: poserUnites(false) })
      if (si.code !== 0) D.push(`installer ${g} joué sur le banc : code ${si.code} (0 attendu) — ${court(si.erreur, 160)}`)
      else {
        const copiees = si.contenu('etc/systemd/system')
        const attendues = [...def.unites].sort()
        if (JSON.stringify(copiees) !== JSON.stringify(attendues)) D.push(`installer ${g} joué sur le banc : /etc/systemd/system reçoit ${JSON.stringify(copiees)} (exactement ${JSON.stringify(attendues)} attendu)`)
        const verifs = si.appels.map((a, k) => ({ ...a, k })).filter((a) => a.cmd === 'systemd-analyze' && a.args[0] === 'verify')
        const verifies = verifs.flatMap((a) => a.args.slice(1).filter((w) => !w.startsWith('-')))
        const iReload = si.appels.findIndex((a) => a.cmd === 'systemctl' && a.args.includes('daemon-reload'))
        if (!verifs.length) D.push(`installer ${g} joué sur le banc : systemd-analyze verify jamais exécuté`)
        else {
          const intrus = verifies.filter((w) => !def.unites.includes(path.posix.basename(w)) || !/^\/(etc\/systemd\/system|srv\/presti-agents\/scripts\/usine\/systemd)\/[^/]+$/.test(w))
          const oubliees = def.unites.filter((u) => !verifies.some((w) => path.posix.basename(w) === u))
          if (intrus.length) D.push(`installer ${g} joué sur le banc : systemd-analyze verify porte sur ${intrus.join(', ')} (les unités du groupe, et elles seules, attendues)`)
          if (oubliees.length) D.push(`installer ${g} joué sur le banc : systemd-analyze verify ne contrôle pas ${oubliees.join(', ')}`)
          if (iReload < 0 || verifs.some((a) => a.k > iReload)) D.push(`installer ${g} joué sur le banc : systemd-analyze verify ${iReload < 0 ? 'sans daemon-reload' : 'après daemon-reload'}`)
        }
        const activees = unitesDe(si.appels, 'enable')
        for (const u of def.a_activer) if (!activees.some((m) => globRe(m).test(u))) D.push(`installer ${g} joué sur le banc : ${u} copiée mais jamais activée (systemctl enable --now)`)
        for (const u of autres(g)) if (activees.some((m) => globRe(m).test(u))) D.push(`installer ${g} joué sur le banc : active aussi ${u}, d'un autre groupe`)
      }
      const arr = await lancerAg(['arreter', g])
      if (arr.code !== 0 || arr.appels.length !== 1) { D.push(`arreter ${g} : code ${arr.code}, ${arr.appels.length} appel(s) ssh`); continue }
      const J = analyserBash(arr.appels[0].stdinTexte).instrs
      const coupees = motifsDe(J, (i) => /\bsystemctl disable\b/.test(i.plat) && i.mots.includes('--now'))
      for (const u of def.a_activer) if (!coupees.some((m) => globRe(m).test(u))) D.push(`arreter ${g} : ${u} n'est pas désactivée (systemctl disable --now)`)
      for (const u of autres(g)) if (coupees.some((m) => globRe(m).test(u))) D.push(`arreter ${g} : désactive aussi ${u}, d'un autre groupe`)
      const sa = await simuler(arr.appels[0].stdinTexte, { nom: `arreter-${g}`, preparer: poserUnites(true) })
      if (sa.code !== 0) D.push(`arreter ${g} joué sur le banc : code ${sa.code} (0 attendu) — ${court(sa.erreur, 160)}`)
      else {
        const coupeesJ = unitesDe(sa.appels, 'disable')
        for (const u of def.a_activer) if (!coupeesJ.some((m) => globRe(m).test(u))) D.push(`arreter ${g} joué sur le banc : ${u} installée mais jamais désactivée (systemctl disable --now)`)
        for (const u of autres(g)) if (coupeesJ.some((m) => globRe(m).test(u))) D.push(`arreter ${g} joué sur le banc : désactive aussi ${u}, d'un autre groupe`)
      }
    }
    // La FERMETURE de la liste, pas seulement des exemples fixes : un septième groupe accepté doit tomber. Chaque nom qui
    // pourrait être une clé cachée est essayé par installer ET arreter, code 2 et aucun appel ssh exigés : les mots des
    // littéraux, des clés d'objet et des alternatives « a|b » du source d'usine-agents.mjs et de ses imports locaux ; les
    // presti-<x> de ce source et de scripts/usine/** (noms et contenus : une unité ajoutée trahit son groupe) ; des
    // variantes proches des six groupes ; les clés du prototype d'un objet (un GROUPES[g] sans hasOwn les accepte) ; la
    // liste fixe des jeux d'essai ; trois noms tirés au hasard à chaque passage.
    const permis = new Set(Object.keys(UNITES.groupes))
    const candidats = new Set(UNITES.groupes_refuses)
    const motCandidat = /^[a-z_][a-z0-9_-]{1,30}$/
    const presti = (t) => { for (const m of String(t).matchAll(/presti-([a-z][a-z0-9_-]*)/g)) { const s = m[1].replace(/-+$/, ''); candidats.add(s); candidats.add(s.split('-')[0]) } }
    const sourcesAg = [fAg]
    for (const m of lire(fAg).matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\1/g)) { const f = path.resolve(path.dirname(fAg), m[2]); if (existe(f) && fs.statSync(f).isFile()) sourcesAg.push(f) }
    for (const f of sourcesAg) {
      const t = lire(f)
      for (const m of t.matchAll(/(['"`])([^'"`\n]{1,40})\1/g)) if (motCandidat.test(m[2])) candidats.add(m[2])
      for (const m of t.matchAll(/(?:^|[{,\s(])([A-Za-z_$][\w$]{1,30})\s*:(?!:)/gm)) if (motCandidat.test(m[1])) candidats.add(m[1])
      for (const m of t.matchAll(/[\w-]+(?:\|[\w-]+)+/g)) for (const w of m[0].split('|')) if (motCandidat.test(w)) candidats.add(w)
      presti(t)
    }
    const marcherUsine = (d) => { if (!existe(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); presti(e.name); if (e.isDirectory()) marcherUsine(p); else presti(fs.readFileSync(p).toString('latin1')) } }
    marcherUsine(R_('scripts/usine'))
    for (const g of permis) {
      const autre = [...permis].find((x) => x !== g)
      for (const v of [`${g}s`, g.slice(0, -1), `${g}2`, `${g}*`, `${g};id`, `${g},${autre}`, `${g}-${autre}`]) candidats.add(v)
    }
    for (const k of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', 'prototype']) candidats.add(k)
    for (let k = 0; k < 3; k++) candidats.add(lettres(9).toLowerCase())
    for (const p of permis) candidats.delete(p)
    const liste = [...candidats]
    const bancsFermeture = Array.from({ length: 4 }, (_, k) => bancSsh(path.join(T, `ssh-fermeture-${k}`)))
    const acceptes = []
    let suivant = 0
    await Promise.all(bancsFermeture.map(async (b) => {
      while (suivant < liste.length) {
        const g = liste[suivant++]
        for (const cmd of ['installer', 'arreter']) {
          const r = await lancerAg([cmd, g], 'enregistrer', b)
          if (r.code !== 2 || r.appels.length) acceptes.push(`${cmd} « ${g} » : code ${r.code}, ${r.appels.length} appel(s) ssh`)
        }
      }
    }))
    acceptes.sort()
    if (acceptes.length) D.unshift(`la liste des groupes n'est pas fermée : ${acceptes.length} essai(s) hors des ${permis.size} groupes (${[...permis].join(', ')}) sans code 2 ou avec un appel ssh — ${acceptes.slice(0, 6).join(' ; ')}${acceptes.length > 6 ? ' ; …' : ''}`)
    return `installer et arreter pour ${Object.keys(UNITES.groupes).join(', ')} : seules les unités presti-<groupe>* copiées depuis /srv/presti-agents/scripts/usine/systemd/ (install -m 644), systemd-analyze verify avant daemon-reload, enable --now puis disable --now des minuteurs du groupe (et de presti-surveillance.service) ; joué sur le banc : exactement les unités du groupe copiées, toutes passées à verify avant daemon-reload, ses minuteurs activés puis désactivés ; aucun scp ; liste fermée : ${liste.length} autres noms (mots et clés du source, presti-<x> de scripts/usine/**, variantes, clés du prototype, liste fixe, hasard) → code 2 et aucun appel ssh, par installer et par arreter`
  })

  await juger(R, 'SO-7', async (D) => {
    if (!existe(fAg)) { D.push(absent(FICHIERS.usineAgents)); return }
    const valeurs = [lettres(40), lettres(40), lettres(40)]
    const f = path.join(T, 'so7-sortie-usine.txt')
    fs.writeFileSync(f, [
      'agents: présent (uid 1002)', 'presti-surveillance.service active', 'presti-atelier.timer  Sat 2026-09-26 12:00  success',
      `PRESTI_JETON_CHEF=${valeurs[0]}`, `PRESTI_JETON_USINE=${valeurs[1]}`, `TELEGRAM_BOT_TOKEN=${valeurs[2]}`,
      'deploye 0123456789abcdef origin/main 0123456789abcdef', 'Mem: 11960 2100 9860', '/dev/sda1 45G 12G 33G 27% /', ''].join('\n'))
    const r = await lancerAg(['etat'], `sortie=${f}`)
    if (r.code !== 0 || r.appels.length !== 1) { D.push(`etat : code ${r.code}, ${r.appels.length} appel(s) ssh (0 et 1 attendus)`); return }
    for (const v of valeurs) if (fuite(`${r.sortie}${r.erreur}`, v)) D.push('etat réimprime une valeur du coffre renvoyée par l\'usine')
    const I = analyserBash(r.appels[0].stdinTexte).instrs
    const a = (re) => I.some((i) => re.test(i.plat))
    if (!a(/\b(id|getent passwd)\b.*\bagents\b/)) D.push('etat : la présence du compte agents n\'est pas lue')
    if (!a(/\bsystemctl list-timers\b.*presti-/)) D.push('etat : les minuteurs presti-* ne sont pas listés')
    if (!a(/^sudo -n -u agents \/usr\/local\/bin\/presti-coffre noms$|\/usr\/local\/bin\/presti-coffre noms\b/)) D.push('etat : les noms du coffre ne sont pas lus par « sudo -n -u agents /usr/local/bin/presti-coffre noms »')
    if (!I.some((i) => /\bgit -C \/srv\/presti-agents rev-parse\b/.test(i.plat)) || !a(/\brev-parse\b.*origin\/main|origin\/main.*\brev-parse\b/)) D.push('etat : le commit déployé n\'est pas comparé à origin/main (git -C /srv/presti-agents rev-parse, et rev-parse origin/main)')
    if (!a(/\bfree\b/)) D.push('etat : la mémoire n\'est pas lue (free)')
    if (!a(/\bdf\b/)) D.push('etat : le disque n\'est pas lu (df)')
    for (const i of I) {
      if (/presti-coffre\s+(?!noms\b|etat\b)\S+/.test(i.plat)) D.push(`etat : presti-coffre appelé hors noms/etat : « ${court(i.brut, 70)} »`)
      if (/agents\.env/.test(i.plat) && /\b(cat|less|more|head|tail|grep|sed|awk)\b/.test(i.plat)) D.push(`etat : lecture du coffre : « ${court(i.brut, 70)} »`)
    }
    return 'etat lit le compte agents, les minuteurs presti-*, les noms du coffre (presti-coffre noms), le commit déployé face à origin/main, la mémoire et le disque ; une sortie de l\'usine avec des valeurs n\'est jamais réimprimée'
  })

  await juger(R, 'SO-8', async (D) => {
    if (!existe(fJournal)) { D.push(absent(FICHIERS.journalSh)); return }
    const A = analyserBash(lire(fJournal))
    if (/agents\.env/.test(A.texte)) D.push('presti-journal.sh nomme agents.env')
    if (/auth\.json/.test(A.texte)) D.push('presti-journal.sh nomme auth.json')
    const h = path.join(T, 'so8-home')
    nettoyer(h)
    const numerote = (prefixe, n) => Array.from({ length: n }, (_, k) => `${prefixe} ${String(k + 1).padStart(4, '0')}`).join('\n') + '\n'
    const ecr = (relatif, texte) => { const f = path.join(h, ...relatif.split('/')); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, texte) }
    ecr('travail/chef/cycles.jsonl', numerote('{"cycle":', 600))
    ecr('travail/atelier/atelier.log', numerote('atelier ligne', 80))
    ecr('travail/usine/tourneur-livraison.jsonl', numerote('{"livraison":', 70))
    ecr('travail/surveillance/mesures-2026-09-24.jsonl', numerote('{"ancien":', 30))
    ecr('travail/surveillance/mesures-2026-09-25.jsonl', numerote('{"le":', 60))
    fs.utimesSync(path.join(h, 'travail', 'surveillance', 'mesures-2026-09-24.jsonl'), new Date('2026-09-24T23:00:00Z'), new Date('2026-09-24T23:00:00Z'))
    const secretCoffre = lettres(40), secretAuth = lettres(40)
    ecr('.config/presti/agents.env', `PRESTI_JETON_CHEF=${secretCoffre}\n`)
    ecr('.codex/auth.json', `{"jeton":"${secretAuth}"}\n`)
    ecr('.codex/config.toml', ['model = "gpt-6-sol"', 'model_reasoning_effort = "high"', 'approval_policy = "never"', 'sandbox_mode = "workspace-write"', '', '[sandbox_workspace_write]', 'network_access = true', '', '[mcp_servers.essai]', `command = "${lettres(10)}"`, ''].join('\n'))
    const jr = async (args) => { const r = await lancerBash(fJournal, args, { env: { HOME: versSlash(h) } }); for (const s of [secretCoffre, secretAuth]) if (fuite(`${r.sortie}${r.erreur}`, s)) D.push(`presti-journal ${args.join(' ')} imprime le contenu du coffre ou de auth.json`); return r }
    const derniere = (prefixe, total, n) => Array.from({ length: n }, (_, k) => `${prefixe} ${String(total - n + k + 1).padStart(4, '0')}`)
    const cas = [
      [['chef'], derniere('{"cycle":', 600, 50)], [['chef', '10'], derniere('{"cycle":', 600, 10)], [['atelier', '5'], derniere('atelier ligne', 80, 5)],
      [['livreur', '3'], derniere('{"livraison":', 70, 3)], [['surveillance', '4'], derniere('{"le":', 60, 4)],
    ]
    for (const [args, attendu] of cas) {
      const r = await jr(args)
      const l = lignesDe(r.sortie)
      if (r.code !== 0 || JSON.stringify(l) !== JSON.stringify(attendu)) D.push(`presti-journal ${args.join(' ')} : code ${r.code}, ${l.length} ligne(s), « ${court(l[0], 30)} … » (les ${attendu.length} dernières lignes attendues)`)
    }
    const r500 = await jr(['chef', '600'])
    const l500 = lignesDe(r500.sortie)
    if (!((r500.code === 0 && JSON.stringify(l500) === JSON.stringify(derniere('{"cycle":', 600, 500))) || r500.code === 2)) D.push(`presti-journal chef 600 : code ${r500.code}, ${l500.length} lignes (500 au plus : les 500 dernières, ou un refus en code 2)`)
    const rc = await jr(['config-codex'])
    const lc = lignesDe(rc.sortie).map((x) => x.trim()).filter(Boolean)
    if (rc.code !== 0 || JSON.stringify(lc) !== JSON.stringify(['model = "gpt-6-sol"', 'sandbox_mode = "workspace-write"', 'network_access = true'])) D.push(`presti-journal config-codex : ${JSON.stringify(lc.map((x) => court(x, 30)))} (les seules lignes model, sandbox_mode et network_access attendues)`)
    for (const args of [['coffre'], ['agents.env'], ['../chef'], ['chef', 'abc'], ['chef', '-5'], ['chef', '10', 'en-trop'], [], ['auth'], ['config-codex', '5;id']]) {
      const r = await jr(args)
      if (r.code !== 2) D.push(`presti-journal ${args.join(' ') || '(aucun argument)'} : code ${r.code} (2 attendu)`)
    }
    // Un journal qui est un second nom du coffre : agents poserait travail/chef/cycles.jsonl en lien PHYSIQUE vers
    // ~/.config/presti/agents.env, et usine le lirait par presti-journal (revue Codex du 27/09 : le refus des liens physiques
    // retiré restait vert). Puis un lien symbolique vers ~/.codex/auth.json. Refus exigé, rien d'imprimé.
    const hl = path.join(T, 'so8-liens')
    nettoyer(hl)
    const ecrL = (relatif, texte) => { const f = path.join(hl, ...relatif.split('/')); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, texte); return f }
    const secretLie = lettres(40), secretAuthLie = lettres(40)
    const coffreLie = ecrL('.config/presti/agents.env', `PRESTI_JETON_CHEF=${secretLie}\n`)
    const authLie = ecrL('.codex/auth.json', `{"jeton":"${secretAuthLie}"}\n`)
    for (const d of ['chef', 'atelier', 'usine', 'surveillance']) fs.mkdirSync(path.join(hl, 'travail', d), { recursive: true })
    const liens = []
    fs.linkSync(coffreLie, path.join(hl, 'travail', 'chef', 'cycles.jsonl'))
    liens.push(['chef', 'lien physique vers le coffre'])
    try { fs.symlinkSync(authLie, path.join(hl, 'travail', 'atelier', 'atelier.log')); liens.push(['atelier', 'lien symbolique vers ~/.codex/auth.json']) } catch (e) { R.note(`SO-8 : lien symbolique impossible sur ce poste (${e.code}) : seul le lien physique est essayé`) }
    for (const [journal, quoi] of liens) {
      const r = await lancerBash(fJournal, [journal], { env: { HOME: versSlash(hl) } })
      if (r.code === 0 || r.sortie.trim() || fuite(`${r.sortie}${r.erreur}`, secretLie) || fuite(`${r.sortie}${r.erreur}`, secretAuthLie)) D.push(`presti-journal ${journal} sur un journal qui est un ${quoi} : code ${r.code}, ${lignesDe(r.sortie).length} ligne(s) imprimée(s) (refus attendu, rien d'imprimé)`)
    }
    return `presti-journal lit les n dernières lignes (50 par défaut, 500 au plus) des journaux fixés, et pour config-codex les seules lignes model, sandbox_mode et network_access ; tout autre argument → code 2 ; ni agents.env ni auth.json nommés ni imprimés ; un journal ${liens.map(([, q]) => q).join(' ou ')} → refus, rien d'imprimé`
  })

  await juger(R, 'SO-9', async (D) => {
    if (!existe(fDoc)) { D.push(absent(FICHIERS.doc)); return }
    const doc = lf(lire(fDoc))
    const sections = new Map()
    let courante = null
    for (const l of doc.split('\n')) {
      const m = /^#{2,4}\s+(.+?)\s*$/.exec(l)
      if (m) { courante = normApos(m[1]).toLowerCase(); sections.set(courante, []); continue }
      if (courante) sections.get(courante).push(l)
    }
    const section = (titre) => { const k = [...sections.keys()].find((x) => x.startsWith(titre.toLowerCase())); return k ? sections.get(k).join('\n') : null }
    const titres = ['Le compte agents', 'Le coffre', 'Le code déployé', 'Les services', 'La surveillance', 'Reprise par le poste', 'Pièges']
    for (const t of titres) if (section(t) === null) D.push(`section « ${t} » absente de ${FICHIERS.doc}`)
    const coffre = normApos(section('Le coffre') || '').toLowerCase()
    for (const n of NOMS_PERMIS) if (!coffre.includes(n.toLowerCase())) D.push(`« Le coffre » ne cite pas ${n}`)
    for (const p of ['jamais la clé de service', 'jamais stripe', 'jamais la clé du produit']) if (!coffre.includes(p)) D.push(`« Le coffre » ne dit pas « ${p} »`)
    // Le tableau des services : l'en-tête ET sa substance. Au moins une ligne par groupe d'unités des jeux d'essai
    // (unites/noms.json : une unité du groupe dans la colonne service) ; chaque ligne a ses quatre cellules remplies, un
    // service presti-*, le compte agents (le seul qui fait tourner les services et lit le coffre) et, en variables du
    // coffre, des noms de la liste fermée seulement ; la surveillance porte PRESTI_JETON_USINE (SV-14).
    const services = section('Les services') || ''
    const lignesTab = services.split('\n')
    const iEntete = lignesTab.findIndex((l) => /^\s*\|/.test(l))
    const cellules = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    const entete = iEntete < 0 ? '' : lignesTab[iEntete]
    const colonnes = ['service', 'minuteur', 'compte', 'variables du coffre']
    for (const c of colonnes) if (!normApos(entete).toLowerCase().includes(c)) D.push(`le tableau de « Les services » n'a pas la colonne « ${c} »`)
    const titres_ = cellules(entete).map((c) => normApos(c).toLowerCase())
    const col = Object.fromEntries(colonnes.map((c) => [c, titres_.findIndex((t) => t.includes(c === 'variables du coffre' ? 'variables' : c))]))
    const donnees = []
    if (iEntete >= 0) {
      let k = iEntete + 1
      if (k < lignesTab.length && /^\s*\|?\s*:?-{3,}/.test(lignesTab[k])) k++
      else D.push('le tableau de « Les services » n\'a pas de ligne de séparation (|---|) sous son en-tête')
      for (; k < lignesTab.length && /^\s*\|/.test(lignesTab[k]); k++) donnees.push(cellules(lignesTab[k]))
    }
    if (iEntete >= 0 && !donnees.length) D.push('le tableau de « Les services » n\'a aucune ligne de données sous son en-tête')
    const net = (s) => String(s ?? '').replace(/`/g, '').trim()
    const globU = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
    const couverts = new Set()
    for (const cs of donnees) {
      const service = net(cs[col.service]), compte = net(cs[col.compte]), vars = net(cs[col['variables du coffre']])
      const nomLigne = court(service || cs.join(' | '), 60)
      for (const c of colonnes) if (col[c] < 0 || !net(cs[col[c]])) D.push(`« Les services », ligne « ${nomLigne} » : cellule « ${c} » vide`)
      const unites = [...service.matchAll(/presti-[a-z0-9-]+(?:\.(?:service|timer|path))?/g)].map((m) => m[0])
      if (!unites.length) D.push(`« Les services », ligne « ${nomLigne} » : la colonne service ne nomme aucune unité presti-*`)
      if (compte && !/^agents\b/i.test(compte)) D.push(`« Les services », ligne « ${nomLigne} » : compte « ${court(compte, 30)} » (agents attendu : lui seul fait tourner les services et lit le coffre)`)
      for (const m of vars.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) if (!NOMS_PERMIS.includes(m[0])) D.push(`« Les services », ligne « ${nomLigne} » : ${m[0]} en variables du coffre, hors de la liste fermée`)
      for (const [g, def] of Object.entries(UNITES.groupes)) {
        if (!unites.some((u) => def.unites.includes(u) || def.unites.includes(`${u}.service`) || def.motifs.some((mo) => globU(mo).test(u)))) continue
        couverts.add(g)
        if (g === 'surveillance' && !/\bPRESTI_JETON_USINE\b/.test(vars)) D.push('« Les services » : la ligne de la surveillance ne porte pas PRESTI_JETON_USINE en variables du coffre (SV-14)')
      }
    }
    if (donnees.length) for (const g of Object.keys(UNITES.groupes)) if (!couverts.has(g)) D.push(`« Les services » : aucune ligne pour le groupe ${g} (${UNITES.groupes[g].unites.filter((u) => u.endsWith('.service')).join(', ')})`)
    const surv = normApos(section('La surveillance') || '').toLowerCase()
    if (!/\b22\s*%/.test(surv) || !/\b30\s*%/.test(surv)) D.push('« La surveillance » ne donne pas les seuils de 22 et 30 %')
    if (!surv.includes('aucune charge factice')) D.push('« La surveillance » ne dit pas « aucune charge factice »')
    const reprise = section('Reprise par le poste') || ''
    const commandes = [...reprise.matchAll(/`(node [^`]+)`/g)].map((m) => m[1])
    for (const s of ['chef', 'atelier', 'livreur']) if (!commandes.some((c) => c.includes(s)) && !new RegExp(`${s}[^\\n]*\`node `, 'i').test(reprise)) D.push(`« Reprise par le poste » : aucune commande exacte (\`node …\`) pour ${s}`)
    const pieges = normApos(section('Pièges') || '').toLowerCase()
    for (const p of ['apparmor', 'codex', 'ufw', 'bubblewrap', 'bash -l']) if (!pieges.includes(p)) D.push(`« Pièges » ne parle pas de ${p}`)
    return `${FICHIERS.doc} : les sept sections, la liste fermée et les trois « jamais », le tableau des services (service, minuteur, compte, variables du coffre) avec ${donnees.length} lignes remplies qui couvrent les ${Object.keys(UNITES.groupes).length} groupes, sous le compte agents, variables de la liste fermée seulement, les seuils et « aucune charge factice », une commande de reprise par service, les pièges (AppArmor et Codex, ufw, bubblewrap, bash -l)`
  })

  await juger(R, 'SO-10', async (D) => {
    const { motifs, source } = await motifsSecrets()
    const fichiers = []
    const dirUsine = R_('scripts/usine')
    const marcher = (d) => { if (!existe(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) marcher(p); else fichiers.push(p) } }
    marcher(dirUsine)
    for (const f of [fDoc, fAg, R_(FICHIERS.usineCoffre)]) if (existe(f)) fichiers.push(f)
    if (!existe(fAg)) { D.push(absent(FICHIERS.usineAgents)); return }
    for (const f of fichiers) {
      const t = fs.readFileSync(f).toString('latin1')
      for (const m of motifs) { const x = m.re.exec(t); if (x) D.push(`${versSlash(path.relative(RACINE, f))} : une chaîne qui ressemble à une clé (${m.nom})`) }
    }
    for (const a of tousAppels) for (const d of defautsAppelSsh(a)) D.push(`${a.pour} : ${d}`)
    for (const a of tousAppels) if (a.stdin.includes(0x0d)) D.push(`${a.pour} : le script distant porte des \\r (fins de ligne du poste) : bash échouerait sur l'usine`)
    const r = await lancerAg(['etat'], 'injoignable')
    if (r.code !== 5 || !/usine injoignable/i.test(`${r.sortie}${r.erreur}`)) D.push(`etat avec ssh en 255 : code ${r.code}, « ${court(r.erreur || r.sortie, 80)} » (code 5 et « usine injoignable » attendus)`)
    const r2 = await lancerAg(['socle'], 'injoignable')
    if (r2.code !== 5) D.push(`socle avec ssh en 255 : code ${r2.code} (5 attendu)`)
    return `${fichiers.length} fichiers sans aucune chaîne de clé (${source}) ; ${tousAppels.length} appels ssh, tous en -o BatchMode=yes avec la clé ~/.ssh/presti-usine, par PRESTI_SSH_BIN ; ssh en 255 → code 5`
  })
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Surveillance (026-053) : SV-1 à SV-15, SV-IA-1 à SV-IA-4
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const PROC_ATT = () => JSON.parse(lire(path.join(FIX, 'proc', 'attendus.json')))
/** Calcul de référence du juge sur deux instantanés (SV-1 à SV-3). */
function mesureReference(stat1, stat2, mem, net1, net2, intervalleS, debit) {
  const cpu = (t) => lf(t).split('\n').find((l) => /^cpu\s/.test(l)).trim().split(/\s+/).slice(1, 9).map(Number)
  const a = cpu(stat1), b = cpu(stat2)
  const d = b.map((x, i) => x - a[i])
  const total = d.reduce((x, y) => x + y, 0)
  const occupe = total - d[3] - d[4]
  const kv = Object.fromEntries(lf(mem).split('\n').filter(Boolean).map((l) => { const [k, v] = l.split(':'); return [k.trim(), Number.parseInt(v, 10)] }))
  const octets = (t) => lf(t).split('\n').slice(2).filter((l) => l.includes(':')).reduce((s, l) => { const [nom, reste] = [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim().split(/\s+/).map(Number)]; return nom === 'lo' ? s : s + reste[0] + reste[8] }, 0)
  const bps = ((octets(net2) - octets(net1)) * 8) / intervalleS
  const dix = (x) => Math.round(x * 1000) / 10
  return { cpu: total ? dix(occupe / total) : 0, mem: dix(1 - kv.MemAvailable / kv.MemTotal), res: dix(bps / debit) }
}
const p95 = (v) => { if (!v.length) return null; const s = [...v].sort((x, y) => x - y); return s[Math.ceil(0.95 * s.length) - 1] }
const verdictDe = (n, m) => (n < 1440 ? 'incomplet' : m < 22 ? 'danger' : m < 30 ? 'approche' : 'ok')
const jourParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
const heureParis = (t) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t))
/** Instant UTC d'une heure de Paris (AAAA-MM-JJ, HH:MM) — septembre 2026 : heure d'été, UTC+2. */
const paris = (jour, hm) => new Date(`${jour}T${hm}:00+02:00`)
function semaineIso(t) {
  const [a, m, j] = jourParis(t).split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j))
  const js = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - js + 3)
  const an = d.getUTCFullYear()
  const premier = new Date(Date.UTC(an, 0, 4))
  const s = 1 + Math.round(((d - premier) / 86400000 - 3 + ((premier.getUTCDay() + 6) % 7)) / 7)
  return `${an}-S${String(s).padStart(2, '0')}`
}
/** Lit toutes les mesures d'un dossier de journal. */
function mesuresDe(dossier) {
  if (!existe(dossier)) return []
  return fs.readdirSync(dossier).filter((f) => /^mesures-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort().flatMap((f) => lignesDe(lire(path.join(dossier, f))).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { illisible: l } } }))
}
function p95Journal(dossier, maintenant) {
  const t = new Date(maintenant).getTime()
  const l = mesuresDe(dossier).filter((x) => x.le && Date.parse(x.le) > t - 7 * JOUR && Date.parse(x.le) <= t)
  const r = { n: l.length, cpu: p95(l.map((x) => x.cpu)), mem: p95(l.map((x) => x.mem)), res: p95(l.map((x) => x.res)) }
  r.verdict = verdictDe(r.n, Math.max(r.cpu ?? 0, r.mem ?? 0, r.res ?? 0))
  return r
}
const formes = (x) => (x === null || x === undefined ? [] : [x.toFixed(1), x.toFixed(1).replace('.', ','), String(x), String(x).replace('.', ',')])
const citeNombre = (texte, x) => formes(x).some((f) => new RegExp(`(^|[^0-9.,])${f.replace('.', '\\.')}(?![0-9])`).test(texte))

/** Un dossier /proc d'essai : compteurs qui avancent de `k` minutes (37,5 % de processeur à chaque minute). */
function ecrireProc(dossier, k, { memDispoKo = 9437184, disquePct = 50 } = {}) {
  fs.mkdirSync(path.join(dossier, 'net'), { recursive: true })
  const b = [100000, 2000, 30000, 800000, 5000, 1000, 2000, 0, 0, 0]
  const pas = [300, 30, 90, 700, 50, 10, 20, 0, 0, 0]
  const l = b.map((x, i) => x + pas[i] * k)
  fs.writeFileSync(path.join(dossier, 'stat'), `cpu  ${l.join(' ')}\ncpu0 ${l.map((x) => Math.floor(x / 2)).join(' ')}\ncpu1 ${l.map((x) => Math.ceil(x / 2)).join(' ')}\nintr 1 0\nctxt 1\nbtime 1758700000\nprocesses 1\nprocs_running 1\nprocs_blocked 0\n`)
  fs.writeFileSync(path.join(dossier, 'meminfo'), `MemTotal:       12582912 kB\nMemFree:         2097152 kB\nMemAvailable:    ${String(memDispoKo).padStart(8)} kB\nBuffers:          262144 kB\nCached:          6291456 kB\n`)
  const rx = 7000000000 + 150000000 * k, tx = 3000000000 + 30000000 * k
  fs.writeFileSync(path.join(dossier, 'net', 'dev'), `Inter-|   Receive                                                |  Transmit\n face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed\n    lo: ${5000000000 + 1e9 * k} 1000 0 0 0 0 0 0 ${5000000000 + 1e9 * k} 1000 0 0 0 0 0 0\nenp0s6:${rx} 5000 0 0 0 0 0 0 ${tx} 4000 0 0 0 0 0 0\n`)
  const blocks = 10_000_000
  const bavail = Math.round(blocks * (1 - disquePct / 100))
  fs.writeFileSync(path.join(dossier, 'statfs.json'), JSON.stringify({ type: 61267, bsize: 4096, blocks, bfree: bavail, bavail, files: 1000000, ffree: 900000 }))
}
function procFixture(dossier, n) {
  fs.mkdirSync(path.join(dossier, 'net'), { recursive: true })
  fs.copyFileSync(path.join(FIX, 'proc', `stat-${n}`), path.join(dossier, 'stat'))
  fs.copyFileSync(path.join(FIX, 'proc', 'meminfo'), path.join(dossier, 'meminfo'))
  fs.copyFileSync(path.join(FIX, 'proc', `net-dev-${n}`), path.join(dossier, 'net', 'dev'))
  fs.writeFileSync(path.join(dossier, 'statfs.json'), JSON.stringify({ type: 61267, bsize: 4096, blocks: 10_000_000, bfree: 5_000_000, bavail: 5_000_000, files: 1000000, ffree: 900000 }))
}
async function portFerme() {
  const s = http.createServer()
  await new Promise((r) => s.listen(0, '127.0.0.1', r))
  const { port } = s.address()
  await new Promise((r) => s.close(r))
  return port
}
/** Le faux freellmapi : sert le relevé courant à la route enregistrée, sur 127.0.0.1. */
async function fauxFreellmapi(reponses) {
  const etat = { releve: 'r1', piege: lettres(16), requetes: 0 }
  const s = http.createServer((req, res) => {
    etat.requetes++
    const route = String(req.url || '').split('?')[0]
    if (req.method === 'GET' && route === reponses.route) {
      const corps = JSON.stringify(reponses.releves[etat.releve === 'r2' ? 'r1' : etat.releve === 'r4' ? 'r3' : etat.releve]).replaceAll('{{PIEGE}}', `PIEGE-${etat.piege}`)
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(corps); return
    }
    if (req.method === 'GET' && route === '/api/ping') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"status":"ok"}'); return }
    res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"not found"}')
  })
  await new Promise((r) => s.listen(0, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${s.address().port}`, etat, fermer: () => new Promise((r) => { s.closeAllConnections?.(); s.close(() => r()) }) }
}

async function groupeSurveillance(R) {
  const T = dossierNeuf('surveillance')
  const fS = R_(FICHIERS.surveillance)
  const fU = R_(FICHIERS.unite)
  const absent = (relatif) => `${relatif} absent : le fichier de la fiche 026-053 n'existe pas (encore)`
  const { demarrerFauxBus } = await import(pathToFileURL(path.join(FIX, 'faux-bus.mjs')).href)
  const JETON = aleatoire('alnum', 40, true)
  let bus = await demarrerFauxBus({ jeton: JETON })
  const SORTIES = []
  const JOURNAUX = []
  const fermePort = await portFerme()
  const iaDefaut = { freellmapi: `http://127.0.0.1:${fermePort}`, echange: path.join(T, 'echange-vide'), compteurs: path.join(T, 'compteurs-vides') }
  fs.mkdirSync(iaDefaut.echange, { recursive: true }); fs.mkdirSync(iaDefaut.compteurs, { recursive: true })
  /** Un tour : --une-mesure à l'heure `t`. */
  const tour = async ({ proc, journal, t, jeton = JETON, base = null, extra = [], env = {}, ia = iaDefaut }) => {
    bus.fixer({ maintenant: new Date(t) })
    if (!JOURNAUX.includes(journal)) JOURNAUX.push(journal)
    const args = [fS, '--une-mesure', `--proc=${versSlash(proc)}`, `--journal=${versSlash(journal)}`, `--maintenant=${new Date(t).toISOString()}`, `--base=${base || bus.url}`, `--freellmapi=${ia.freellmapi}`, `--echange-ia=${versSlash(ia.echange)}`, `--compteurs-ia=${versSlash(ia.compteurs)}`, ...extra]
    const r = await lancer(process.execPath, args, { cwd: RACINE, env: envDe({ HOME: versSlash(path.join(T, 'home')), USERPROFILE: path.join(T, 'home'), LANG: 'C.UTF-8', TZ: 'UTC', USER: 'agents', PRESTI_HOTE: 'usine', PRESTI_JETON_USINE: jeton, ...env }), delaiMs: 20_000 })
    SORTIES.push(`${r.sortie}\n${r.erreur}`)
    return r
  }
  const requetesDepuis = (n0, route) => bus.requetes.slice(n0).filter((q) => !route || q.route === route)
  const evenements = (liste, type) => liste.filter((q) => q.route === '/api/agents/evenements' && q.statut === 201 && (!type || q.corps?.type === type))
  const DEBUT = paris('2026-09-15', '10:00').getTime()

  try {
    await juger(R, 'SV-1', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const A = PROC_ATT()
      const pA = path.join(T, 'sv1', 'proc-a'), pB = path.join(T, 'sv1', 'proc-b'), j = path.join(T, 'sv1', 'journal')
      procFixture(pA, 1); procFixture(pB, 2)
      const r1 = await tour({ proc: pA, journal: j, t: DEBUT })
      const r2 = await tour({ proc: pB, journal: j, t: DEBUT + MINUTE })
      if (r1.code !== 0 || r2.code !== 0) D.push(`deux tours --une-mesure : codes ${r1.code} et ${r2.code} (0 attendus) — ${court(r1.erreur || r2.erreur, 140)}`)
      const m = mesuresDe(j)
      if (m.length !== 1) { D.push(`${m.length} mesure(s) au journal après deux lectures (1 attendue : la première lecture n'en donne pas)`); return }
      if (m[0].cpu !== A.cpu) D.push(`processeur ${m[0].cpu} % (${A.cpu} % attendu : temps hors idle et iowait sur le temps total, ligne cpu)`)
      return `processeur ${m[0].cpu} % sur les deux instantanés de /proc/stat (référence du juge : ${mesureReference(lire(path.join(pA, 'stat')), lire(path.join(pB, 'stat')), lire(path.join(pB, 'meminfo')), lire(path.join(pA, 'net', 'dev')), lire(path.join(pB, 'net', 'dev')), 60, 2e9).cpu} %)`
    })
    await juger(R, 'SV-2', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const m = mesuresDe(path.join(T, 'sv1', 'journal'))
      if (m.length !== 1) { D.push('pas de mesure (voir SV-1)'); return }
      if (m[0].mem !== PROC_ATT().mem) D.push(`mémoire ${m[0].mem} % (${PROC_ATT().mem} % attendu : 1 − MemAvailable / MemTotal)`)
      return `mémoire ${m[0].mem} %`
    })
    await juger(R, 'SV-3', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const A = PROC_ATT()
      const m = mesuresDe(path.join(T, 'sv1', 'journal'))
      if (m.length !== 1) { D.push('pas de mesure (voir SV-1)'); return }
      if (m[0].res !== A.res) D.push(`réseau ${m[0].res} % (${A.res} % attendu : toutes les interfaces sauf lo, en bits par seconde, sur 2 000 000 000)`)
      const pA = path.join(T, 'sv3', 'proc-a'), pB = path.join(T, 'sv3', 'proc-b'), j = path.join(T, 'sv3', 'journal')
      procFixture(pA, 1); procFixture(pB, 2)
      await tour({ proc: pA, journal: j, t: DEBUT, env: { USINE_DEBIT_BPS: A.debit_bps_essai } })
      await tour({ proc: pB, journal: j, t: DEBUT + MINUTE, env: { USINE_DEBIT_BPS: A.debit_bps_essai } })
      const m2 = mesuresDe(j)
      if (m2.length !== 1 || m2[0].res !== A.res_debit_essai) D.push(`avec USINE_DEBIT_BPS=${A.debit_bps_essai} : réseau ${m2[0]?.res} % (${A.res_debit_essai} % attendu)`)
      return `réseau ${m[0].res} % (et ${m2[0]?.res} % avec USINE_DEBIT_BPS=${A.debit_bps_essai})`
    })

    const ATT_MES = JSON.parse(lire(path.join(FIX, 'mesures', 'attendus.json')))
    const { ecrireJeu } = await import(pathToFileURL(path.join(FIX, 'mesures', 'generer.mjs')).href)
    const bilans = {}
    await juger(R, 'SV-4', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      for (const jeu of ['ok', 'approche', 'danger', 'incomplet']) {
        const j = path.join(T, 'sv4', jeu)
        ecrireJeu(jeu, j, ATT_MES.fin)
        JOURNAUX.push(j)
        const r = await lancer(process.execPath, [fS, '--bilan', `--journal=${versSlash(j)}`, `--maintenant=${ATT_MES.fin}`], { cwd: RACINE, env: envDe({ TZ: 'UTC', LANG: 'C.UTF-8' }), delaiMs: 30_000 })
        SORTIES.push(`${r.sortie}\n${r.erreur}`)
        const b = lireBilan(r.sortie)
        bilans[jeu] = { ...b, code: r.code }
        if (r.code !== 0 || !b) { D.push(`--bilan sur le jeu ${jeu} : code ${r.code}, sortie illisible « ${court(r.sortie || r.erreur, 100)} »`); continue }
        for (const k of ['cpu', 'mem', 'res']) if (b[k] === null || Math.abs(b[k] - ATT_MES[jeu][k]) > 0.05) D.push(`jeu ${jeu} : p95 ${k} = ${b[k]} (${ATT_MES[jeu][k]} attendu, rang le plus proche)`)
      }
      return `p95 des quatre jeux (ok, approche, danger, incomplet) égaux à ceux écrits à côté, au dixième : ${['ok', 'approche', 'danger', 'incomplet'].map((j) => `${j} ${bilans[j]?.cpu}/${bilans[j]?.mem}/${bilans[j]?.res}`).join(' ; ')}`
    })
    await juger(R, 'SV-5', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      for (const jeu of ['ok', 'approche', 'danger', 'incomplet']) {
        const b = bilans[jeu]
        if (!b) { D.push(`jeu ${jeu} : pas de bilan (voir SV-4)`); continue }
        if (b.verdict !== ATT_MES[jeu].verdict) D.push(`jeu ${jeu} : verdict « ${b.verdict} » (« ${ATT_MES[jeu].verdict} » attendu : incomplet sous 1 440 mesures, danger si le plus grand p95 < 22 %, approche < 30 %, ok au-delà)`)
      }
      return 'les quatre jeux rendent leur verdict : ok, approche, danger, incomplet'
    })

    // Une heure de tours : SV-6 (forme), SV-7 (battements), SV-11 (alertes bornées).
    const H = { proc: path.join(T, 'heure', 'proc'), journal: path.join(T, 'heure', 'journal'), codes: [], n0: 0 }
    const heureFaite = existe(fS) ? (async () => {
      H.n0 = bus.requetes.length
      for (let k = 0; k < 60; k++) {
        ecrireProc(H.proc, k, { memDispoKo: 524288, disquePct: 85 })
        const r = await tour({ proc: H.proc, journal: H.journal, t: DEBUT + k * MINUTE })
        H.codes.push(r.code)
        if (pile(r.erreur)) H.pile = r.erreur
      }
      H.heure = bus.requetes.slice(H.n0)
      for (const k of [60, 120]) { ecrireProc(H.proc, k, { memDispoKo: 524288, disquePct: 85 }); H.codes.push((await tour({ proc: H.proc, journal: H.journal, t: DEBUT + k * MINUTE })).code) }
      H.toutes = bus.requetes.slice(H.n0)
    })() : null
    if (heureFaite) await heureFaite

    await juger(R, 'SV-6', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      if (H.codes.some((c) => c !== 0)) D.push(`tours --une-mesure : codes ${[...new Set(H.codes)].join(', ')} (0 attendu à chaque tour)`)
      const fichiers = fs.readdirSync(H.journal).filter((f) => /^mesures-/.test(f))
      for (const f of fichiers) {
        if (!/^mesures-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)) { D.push(`fichier de mesures mal nommé : ${f}`); continue }
        for (const l of lignesDe(lire(path.join(H.journal, f))).filter(Boolean)) {
          let o
          try { o = JSON.parse(l) } catch { D.push(`${f} : ligne illisible « ${court(l, 60)} »`); continue }
          const cles = Object.keys(o).sort().join(',')
          if (cles !== 'cpu,le,mem,res') { D.push(`${f} : ligne { ${Object.keys(o).join(', ')} } (exactement { le, cpu, mem, res } attendu)`); break }
          if (![o.cpu, o.mem, o.res].every((x) => typeof x === 'number' && Number.isFinite(x)) || !Number.isFinite(Date.parse(o.le))) D.push(`${f} : valeurs non numériques ou date illisible`)
          if (`mesures-${jourParis(o.le)}.jsonl` !== f) D.push(`${f} : une mesure du ${jourParis(o.le)} (jour de Paris) dans ce fichier`)
        }
      }
      const m = mesuresDe(H.journal)
      if (m.length !== 61) D.push(`${m.length} mesures pour 62 tours (61 attendues : une par tour, sauf la première lecture)`)
      for (const f of fs.readdirSync(H.journal)) if (f.endsWith('.jsonl') && fs.statSync(path.join(H.journal, f)).size === 0) D.push(`journal de 0 octet : ${f}`)
      // L'effacement : les fichiers de plus de 8 jours partent, les autres restent (horloge réelle du jour, noms et dates).
      const j = path.join(T, 'sv6', 'journal'), p = path.join(T, 'sv6', 'proc')
      const now = Math.floor(Date.now() / MINUTE) * MINUTE
      fs.mkdirSync(j, { recursive: true })
      const vieux = [9, 10].map((d) => `mesures-${jourParis(now - d * JOUR)}.jsonl`)
      const garde = `mesures-${jourParis(now - 7 * JOUR)}.jsonl`
      for (const [f, d] of [[vieux[0], 9], [vieux[1], 10], [garde, 7]]) {
        const t = new Date(now - d * JOUR)
        fs.writeFileSync(path.join(j, f), `${JSON.stringify({ le: t.toISOString().replace(/\.\d{3}Z$/, 'Z'), cpu: 1, mem: 1, res: 1 })}\n`)
        fs.utimesSync(path.join(j, f), t, t)
      }
      fs.writeFileSync(path.join(j, 'note-du-juge.txt'), 'à laisser en place\n')
      for (const k of [0, 1, 2]) { ecrireProc(p, k); await tour({ proc: p, journal: j, t: now + k * MINUTE }) }
      for (const f of vieux) if (existe(path.join(j, f))) D.push(`${f} (plus de 8 jours) n'est pas effacé`)
      if (!existe(path.join(j, garde))) D.push(`${garde} (7 jours) a été effacé`)
      if (!existe(path.join(j, 'note-du-juge.txt'))) D.push('un fichier qui n\'est pas une mesure a été effacé')
      return `mesures-<jour de Paris>.jsonl : ${m.length} lignes { le, cpu, mem, res } et rien d'autre ; les fichiers de plus de 8 jours effacés, ceux de 7 jours gardés`
    })
    await juger(R, 'SV-7', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const b = H.heure.filter((q) => q.route === '/api/agents/battement')
      if (b.length !== 4) D.push(`${b.length} POST /api/agents/battement sur une heure simulée (60 tours de 10:00 à 10:59) : 4 attendus`)
      if (b.some((q) => q.jeton !== 'bon' || q.statut !== 200)) D.push('un battement sans le jeton de PRESTI_JETON_USINE ou refusé')
      return `4 battements en une heure simulée, avec le jeton de PRESTI_JETON_USINE`
    })

    // Le point de 9 h et les décisions.
    const compteurs = new Map() // par dossier /proc : des compteurs qui ne reculent jamais d'un tour à l'autre
    const seq9 = async (journal, jeu, jour, heures, extra = {}) => {
      const p = path.join(path.dirname(journal), 'proc')
      for (const f of existe(journal) ? fs.readdirSync(journal).filter((x) => /^mesures-/.test(x)) : []) fs.rmSync(path.join(journal, f))
      ecrireJeu(jeu, journal, paris(jour, heures[0]).toISOString())
      const res = []
      for (const hm of heures) {
        const k = (compteurs.get(p) ?? -1) + 1
        compteurs.set(p, k)
        ecrireProc(p, k)
        const t = paris(jour, hm).getTime()
        const n0 = bus.requetes.length
        const r = await tour({ proc: p, journal, t, ...extra })
        res.push({ hm, t, r, requetes: bus.requetes.slice(n0), p95: p95Journal(journal, t) })
      }
      return res
    }
    await juger(R, 'SV-8', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const j = path.join(T, 'sv8', 'journal')
      const s1 = await seq9(j, 'approche', '2026-09-16', ['08:58', '08:59', '09:00', '09:01', '09:02', '09:05'])
      const points = (x) => evenements(x.requetes, 'usine_mesure')
      for (const x of s1) if (x.r.code !== 0) D.push(`tour de ${x.hm} : code ${x.r.code}`)
      const avant = s1.filter((x) => x.hm < '09:00').flatMap(points)
      if (avant.length) D.push(`${avant.length} point(s) usine_mesure avant 9 h (heure de Paris)`)
      const tous = s1.flatMap(points)
      if (tous.length !== 1) D.push(`${tous.length} point(s) usine_mesure entre 08:58 et 09:05, un tour par processus (exactement 1 attendu, même après redémarrage)`)
      const a9 = s1.find((x) => x.hm === '09:00')
      if (a9 && !points(a9).length && tous.length) D.push('le point du jour n\'est pas posté au tour de 9 h')
      if (tous[0]) {
        const e = tous[0].corps
        if (e.objet !== 'usine:2026-09-16') D.push(`objet « ${e.objet} » (« usine:2026-09-16 » attendu)`)
        if (!(e.resume?.length <= 200)) D.push(`résumé de ${e.resume?.length} signes (200 au plus)`)
        const at = a9.p95
        for (const k of ['cpu', 'mem', 'res']) if (!citeNombre(e.resume || '', at[k])) D.push(`le résumé « ${court(e.resume, 120)} » ne donne pas le p95 ${k} (${at[k]})`)
        if (!new RegExp(`\\b${at.verdict}\\b`).test(e.resume || '')) D.push(`le résumé ne donne pas le verdict (${at.verdict})`)
      }
      const s2 = await seq9(j, 'approche', '2026-09-17', ['08:59', '09:00', '09:01'])
      const lendemain = s2.flatMap(points)
      if (lendemain.length !== 1 || lendemain[0]?.corps?.objet !== 'usine:2026-09-17') D.push(`le lendemain : ${lendemain.length} point(s) (1 attendu, objet usine:2026-09-17)`)
      const bruit = [...s1, ...s2].flatMap((x) => x.requetes).filter((q) => /usine_(memoire|disque)/.test(q.corps?.type || ''))
      if (bruit.length) D.push(`${bruit.length} alerte(s) usine_memoire/usine_disque alors que la mémoire (9 Go libres) et le disque (50 %) vont bien`)
      return 'un seul point usine_mesure par jour, à 9 h heure de Paris, même avec un processus par tour ; objet usine:<jour>, résumé de 200 signes au plus avec les trois p95 et le verdict ; le lendemain, un nouveau point'
    })
    await juger(R, 'SV-9', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      await bus.fermer() // un faux bus neuf : les décisions de SV-8 (même semaine) ne comptent pas ici
      bus = await demarrerFauxBus({ jeton: JETON })
      const j = path.join(T, 'sv9', 'journal')
      const decisions = (seq) => seq.flatMap((x) => x.requetes.filter((q) => q.route === '/api/agents/decisions').map((q) => ({ ...q, tour: x })))
      const lundi = await seq9(j, 'approche', '2026-09-14', ['08:59', '09:00', '09:01'])
      const dl = decisions(lundi)
      const crees = () => bus.requetes.filter((q) => q.route === '/api/agents/decisions' && q.creee === true)
      if (!dl.length) D.push('verdict « approche » le lundi 14/09 à 9 h : aucune décision postée')
      for (const q of dl) {
        if (q.statut !== 201 && q.statut !== 200) D.push(`décision refusée par le faux bus (${q.statut}, ${q.erreur || ''} ${q.champ || ''}) : contrat de 026-042`)
        const c = q.corps || {}
        if (c.cle !== 'usine:seuil:2026-S38') D.push(`clé « ${c.cle} » (« usine:seuil:2026-S38 » attendue : semaine ISO)`)
        if (normApos(c.question || '') !== "L'usine risque d'être reprise par Oracle pour inactivité : que fait-on ?") D.push(`question « ${court(c.question, 90)} »`)
        const opts = (c.options || []).map((o) => o.cle).sort().join(',')
        if (opts !== 'accepter_le_risque,deplacer_du_travail,paiement_a_l_usage') D.push(`options ${opts} (deplacer_du_travail, accepter_le_risque, paiement_a_l_usage attendues)`)
        const reco = (c.options || []).filter((o) => o.recommandee).map((o) => o.cle)
        if (reco.join() !== 'deplacer_du_travail') D.push(`recommandée : ${reco.join(', ') || 'aucune'} (deplacer_du_travail attendue)`)
        if (c.defaut !== 'accepter_le_risque') D.push(`défaut ${c.defaut} (accepter_le_risque attendu)`)
        if (c.portee !== 'argent') D.push(`portée ${c.portee} (argent attendue)`)
        if (c.montant_cents !== 0) D.push(`montant ${c.montant_cents} (0 attendu)`)
        if (Math.abs(Date.parse(c.echeance) - (q.tour.t + 3 * JOUR)) > 2 * MINUTE) D.push(`échéance ${c.echeance} (tour + 3 jours attendu)`)
        const at = q.tour.p95
        for (const k of ['cpu', 'mem', 'res']) if (!citeNombre(c.contexte || '', at[k])) D.push(`contexte « ${court(c.contexte, 100)} » sans le p95 ${k} (${at[k]})`)
        if (!(c.contexte || '').includes('2026-09-14') && !(c.contexte || '').includes('14/09/2026')) D.push('contexte sans la date')
        break
      }
      if (crees().length !== 1) D.push(`${crees().length} décision(s) créée(s) le lundi (1 attendue)`)
      const mercredi = await seq9(j, 'approche', '2026-09-16', ['09:00', '09:01'])
      for (const q of decisions(mercredi)) if (q.corps?.cle !== 'usine:seuil:2026-S38') D.push(`mercredi (même semaine) : clé ${q.corps?.cle} (même clé attendue, réponse creee: false)`)
      if (crees().length !== 1) D.push(`${crees().length} décisions créées après le mercredi de la même semaine (toujours 1 attendue : aucun doublon)`)
      if (decisions(mercredi).some((q) => q.statut === 200 && q.creee !== false)) D.push('rejouée, la décision n\'a pas reçu creee: false')
      const suivant = await seq9(j, 'danger', '2026-09-21', ['09:00', '09:01'])
      const ds = decisions(suivant)
      if (!ds.length || ds.some((q) => q.corps?.cle !== 'usine:seuil:2026-S39')) D.push(`lundi suivant (danger) : ${ds.length} décision(s), clé ${ds[0]?.corps?.cle} (usine:seuil:2026-S39 attendue)`)
      if (crees().length !== 2) D.push(`${crees().length} décisions créées en deux semaines (2 attendues)`)
      for (const [jeu, jour] of [['ok', '2026-09-22'], ['incomplet', '2026-09-23']]) {
        const jj = path.join(T, `sv9-${jeu}`, 'journal')
        const s = await seq9(jj, jeu, jour, ['08:59', '09:00', '09:01'])
        if (decisions(s).length) D.push(`verdict ${jeu} : ${decisions(s).length} décision(s) postée(s) (aucune attendue)`)
      }
      return 'approche ou danger → une décision par semaine ISO, clé usine:seuil:<AAAA>-S<SS>, contrat exact (question, contexte avec les p95 et la date, trois options dont deplacer_du_travail recommandée, défaut accepter_le_risque, portée argent, montant 0, échéance +3 j) ; rejouée dans la semaine → creee: false, sans doublon ; ok et incomplet → aucune'
    })
    await juger(R, 'SV-10', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const j = path.join(T, 'sv10', 'journal'), p = path.join(T, 'sv10', 'proc')
      const lignesPanne = () => (existe(j) ? fs.readdirSync(j).filter((f) => f.endsWith('.jsonl') && !/^mesures-/.test(f)).flatMap((f) => lignesDe(lire(path.join(j, f)))).filter((l) => /bus_injoignable/.test(l)) : [])
      ecrireProc(p, 0); await tour({ proc: p, journal: j, t: DEBUT })
      const essais = [
        { quoi: 'faux bus en 503', avant: () => bus.fixer({ mode: '503' }), apres: () => bus.fixer({ mode: 'normal' }) },
        { quoi: 'faux bus arrêté', avant: async () => { await bus.fermer() }, apres: async () => { bus = await demarrerFauxBus({ jeton: JETON }) } },
        { quoi: 'jeton refusé (401)', jeton: lettres(40) },
      ]
      let k = 1
      for (const e of essais) {
        const n0 = lignesPanne().length
        const m0 = mesuresDe(j).length
        if (e.avant) await e.avant()
        ecrireProc(p, k)
        const r = await tour({ proc: p, journal: j, t: DEBUT + 15 * MINUTE * k, jeton: e.jeton || JETON })
        k++
        if (e.apres) await e.apres()
        if (r.code !== 0) D.push(`${e.quoi} : code ${r.code} (0 attendu)`)
        if (pile(r.erreur)) D.push(`${e.quoi} : une exception non rattrapée`)
        if (lignesPanne().length < n0 + 1) D.push(`${e.quoi} : aucune ligne bus_injoignable au journal (une attendue, dans un fichier .jsonl du journal autre que mesures-*.jsonl)`)
        if (mesuresDe(j).length !== m0 + 1) D.push(`${e.quoi} : la mesure ne continue pas`)
      }
      return 'bus en 503, arrêté ou en 401 → une ligne bus_injoignable au journal, aucune exception, code 0, et la mesure continue'
    })
    await juger(R, 'SV-11', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const heure = H.heure
      const mem1 = evenements(heure, 'usine_memoire'), disq1 = evenements(heure, 'usine_disque')
      const toutes = H.toutes
      const memT = evenements(toutes, 'usine_memoire').length, disqT = evenements(toutes, 'usine_disque').length
      if (mem1.length !== 1) D.push(`MemAvailable à 512 Mo : ${mem1.length} événement(s) usine_memoire en une heure (1 attendu)`)
      if (memT > 3 || memT < 2) D.push(`MemAvailable à 512 Mo : ${memT} usine_memoire en deux heures et une minute (2 ou 3 attendus : une fois par heure au plus)`)
      if (disq1.length !== 1) D.push(`disque à 85 % : ${disq1.length} usine_disque en une heure (1 attendu)`)
      if (disqT !== 1) D.push(`disque à 85 % : ${disqT} usine_disque dans la journée (1 attendu : une fois par jour au plus)`)
      return 'mémoire disponible sous 1 Go → usine_memoire une fois par heure au plus ; disque au-delà de 80 % → usine_disque une fois par jour au plus ; rien quand tout va bien (SV-8)'
    })
    await juger(R, 'SV-12', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const src = lire(fS)
      if (/Buffer\.alloc/.test(src)) D.push('Buffer.alloc dans le source')
      if (/['"](node:)?crypto['"]/.test(src)) D.push('crypto importé')
      if (/['"](node:)?child_process['"]/.test(src)) D.push('child_process importé')
      for (const m of src.matchAll(/new\s+(?:Array|Float64Array|Float32Array|Uint8Array|Int32Array|Uint32Array|BigInt64Array)\s*\(\s*([\d_]+(?:\s*\*\s*[\d_]+)*)\s*\)/g)) {
        const n = m[1].split('*').reduce((a, x) => a * Number(x.replace(/_/g, '').trim()), 1)
        if (n >= 131072) D.push(`un tableau de ${n} cases dans le source (plus d'1 Mo gardé)`)
      }
      const delais = [...src.matchAll(/set(?:Timeout|Interval)\s*\(/g)].length
      const constantes = [...src.matchAll(/\b(\d[\d_]*(?:\s*\*\s*\d[\d_]*)*)\b/g)].map((m) => m[1].split('*').reduce((a, x) => a * Number(x.replace(/_/g, '').trim()), 1))
      if (!delais || !constantes.some((n) => n >= 55_000 && n <= 3_600_000)) D.push('aucun minuteur de 55 s ou plus dans le source (setTimeout / setInterval et une durée ≥ 55 000 ms)')
      // Mesuré : sans --accelerer, 5 s de service ne font pas plus d'un tour.
      const j1 = path.join(T, 'sv12', 'lent', 'journal'), p1 = path.join(T, 'sv12', 'lent', 'proc')
      ecrireProc(p1, 0)
      JOURNAUX.push(j1)
      const n0 = bus.requetes.length
      const hLent = demarrer(process.execPath, [fS, '--service', `--proc=${versSlash(p1)}`, `--journal=${versSlash(j1)}`, `--base=${bus.url}`, `--freellmapi=${iaDefaut.freellmapi}`, `--echange-ia=${versSlash(iaDefaut.echange)}`, `--compteurs-ia=${versSlash(iaDefaut.compteurs)}`], { cwd: RACINE, env: envDe({ TZ: 'UTC', PRESTI_HOTE: 'usine', PRESTI_JETON_USINE: JETON }), delaiMs: 20_000 })
      let tick = 0
      const iv = setInterval(() => { try { ecrireProc(p1, ++tick) } catch { /* fichier tenu : au suivant */ } }, 250)
      await attendre(5000)
      clearInterval(iv)
      tuerArbre(hLent.enfant)
      const rl = await hLent.fin
      SORTIES.push(`${rl.sortie}\n${rl.erreur}`)
      const toursLents = mesuresDe(j1).length
      const battLents = bus.requetes.slice(n0).filter((q) => q.route === '/api/agents/battement').length
      if (toursLents > 1 || battLents > 1) D.push(`--service sans --accelerer : ${toursLents} mesure(s) et ${battLents} battement(s) en 5 s (la boucle n'avance que par un minuteur de 55 s ou plus)`)
      // Mesuré : 10 s de --service --accelerer consomment moins de 0,5 s de processeur.
      const j2 = path.join(T, 'sv12', 'vite', 'journal'), p2 = path.join(T, 'sv12', 'vite', 'proc')
      ecrireProc(p2, 0)
      JOURNAUX.push(j2)
      const conso = path.join(T, 'sv12', 'conso.json')
      const prechargement = path.join(T, 'sv12', 'conso.cjs')
      fs.writeFileSync(prechargement, `const fs = require('fs'); const f = ${JSON.stringify(conso)}; setInterval(() => { try { const u = process.cpuUsage(); fs.writeFileSync(f, JSON.stringify({ us: u.user + u.system, rss: process.memoryUsage().rss })) } catch {} }, 500).unref()\n`)
      const hVite = demarrer(process.execPath, [`--require=${prechargement}`, fS, '--service', '--accelerer', `--maintenant=${new Date(DEBUT).toISOString()}`, `--proc=${versSlash(p2)}`, `--journal=${versSlash(j2)}`, `--base=${bus.url}`, `--freellmapi=${iaDefaut.freellmapi}`, `--echange-ia=${versSlash(iaDefaut.echange)}`, `--compteurs-ia=${versSlash(iaDefaut.compteurs)}`], { cwd: RACINE, env: envDe({ TZ: 'UTC', PRESTI_HOTE: 'usine', PRESTI_JETON_USINE: JETON }), delaiMs: 30_000 })
      tick = 0
      const iv2 = setInterval(() => { try { ecrireProc(p2, ++tick) } catch { /* au suivant */ } }, 250)
      await attendre(10_000)
      clearInterval(iv2)
      const c = existe(conso) ? JSON.parse(lire(conso)) : null
      tuerArbre(hVite.enfant)
      const rv = await hVite.fin
      SORTIES.push(`${rv.sortie}\n${rv.erreur}`)
      const toursVite = mesuresDe(j2).length
      if (toursVite < 5) D.push(`--service --accelerer : ${toursVite} mesure(s) en 10 s (un tour par seconde attendu, 5 au moins)`)
      if (!c) D.push('--service --accelerer : consommation illisible (le service s\'est arrêté ?)')
      // Le plafond vise une charge factice (boucle occupée, calcul inutile : de l'ordre de 10 s de processeur en 10 s).
      // 0,5 s sous Linux, où le service tourne ; 1,5 s sur le poste Windows, où Node coûte plus (démarrage, lectures de
      // fichiers) : le 27/09, la même surveillance y prenait 0,73 à 0,94 s, contre 0,27 s sur l'usine.
      else if (c.us >= (WIN ? 1_500_000 : 500_000)) D.push(`--service --accelerer : ${(c.us / 1e6).toFixed(2)} s de processeur en 10 s (moins de ${WIN ? '1,5 s sur le poste Windows' : '0,5 s'} attendu : aucune charge factice)`)
      return `ni Buffer.alloc, ni gros tableau, ni crypto, ni child_process ; minuteur de 55 s ou plus ; 5 s de service lent : ${toursLents} mesure ; 10 s de service accéléré : ${toursVite} mesures pour ${c ? (c.us / 1e6).toFixed(2) : '?'} s de processeur`
    })
    await juger(R, 'SV-13', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const p = path.join(T, 'sv13', 'proc'), j = path.join(T, 'sv13', 'journal')
      ecrireProc(p, 0)
      const r = await lancer(process.execPath, [fS, '--service', '--accelerer', `--proc=${versSlash(p)}`, `--journal=${versSlash(j)}`, `--base=${bus.url}`, `--freellmapi=${iaDefaut.freellmapi}`], { cwd: RACINE, env: envDe({ TZ: 'UTC', PRESTI_HOTE: 'usine' }), delaiMs: 15_000 })
      if (r.code !== 2) D.push(`--service sans PRESTI_JETON_USINE : code ${r.code}${r.expire ? ' (toujours en marche après 15 s)' : ''} (2 attendu)`)
      for (const base of ['http://exemple.com', 'http://192.0.2.1:3000']) {
        const x = await tour({ proc: p, journal: j, t: DEBUT, base })
        if (x.code !== 2) D.push(`--base=${base} : code ${x.code} (2 attendu : http:// seulement vers 127.0.0.1 ou localhost)`)
      }
      const xl = await tour({ proc: p, journal: j, t: DEBUT + MINUTE, base: bus.url.replace('127.0.0.1', 'localhost') })
      if (xl.code !== 0) D.push(`--base=http://localhost:<port> : code ${xl.code} (0 attendu)`)
      if (SORTIES.some((s) => s.includes(JETON))) D.push('le jeton apparaît sur une sortie de la surveillance')
      for (const d of JOURNAUX) {
        if (!existe(d)) continue
        for (const f of fs.readdirSync(d)) { const q = path.join(d, f); if (fs.statSync(q).isFile() && fs.readFileSync(q).includes(JETON)) D.push(`le jeton est écrit dans ${rel(q)}`) }
      }
      if (bus.requetes.some((q) => JSON.stringify(q.corps || '').includes(JETON))) D.push('le jeton est dans le corps d\'une requête au bus')
      return 'jeton lu dans PRESTI_JETON_USINE seulement (absent en --service → code 2), jamais sur une sortie, un journal ni un corps ; --base en http:// hors 127.0.0.1 et localhost → code 2'
    })
    await juger(R, 'SV-14', async (D) => {
      if (!existe(fU)) { D.push(absent(FICHIERS.unite)); return }
      const ini = lireIni(lire(fU))
      const v = (s, k) => (ini[s]?.[k] || [])
      const un = (s, k, attendu) => { const x = v(s, k); if (x.length !== 1 || x[0] !== attendu) D.push(`[${s}] ${k}=${x.join(' | ') || '(absent)'} (${attendu} attendu)`) }
      un('Service', 'Type', 'simple'); un('Service', 'User', 'agents'); un('Service', 'WorkingDirectory', '/srv/presti-agents')
      un('Service', 'ExecStart', '/usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_USINE -- /usr/bin/node scripts/usine/surveillance.mjs --service --base=https://prestiapp.fr')
      un('Service', 'Restart', 'always'); un('Service', 'RestartSec', '30'); un('Install', 'WantedBy', 'multi-user.target')
      const envs = v('Service', 'Environment').flatMap((x) => x.match(/"[^"]*"|\S+/g) || []).map((x) => x.replace(/^"|"$/g, ''))
      if (!envs.includes('PRESTI_HOTE=usine')) D.push(`[Service] Environment sans PRESTI_HOTE=usine (${envs.join(' ') || 'aucun'})`)
      for (const e of envs) if (NOMS_PERMIS.includes(e.split('=')[0])) D.push(`[Service] Environment pose ${e.split('=')[0]} : une variable du coffre dans l'unité`)
      for (const [s, cles] of Object.entries(ini)) if (cles.EnvironmentFile) D.push(`[${s}] EnvironmentFile= présent : le coffre ne se lit que par avec-coffre.mjs`)
      return 'presti-surveillance.service lu par un analyseur INI : Type=simple, User=agents, WorkingDirectory=/srv/presti-agents, Environment=PRESTI_HOTE=usine, ExecStart par avec-coffre.mjs PRESTI_JETON_USINE, Restart=always, RestartSec=30, WantedBy=multi-user.target, aucun EnvironmentFile='
    })
    await juger(R, 'SV-15', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      if (process.platform === 'linux') { R.note('SV-15 : ce passage tourne sous Linux : le refus hors Linux se juge sur le poste'); return 'sauté sous Linux' }
      const r = await lancer(process.execPath, [fS, '--une-mesure', `--base=${bus.url}`, `--journal=${versSlash(path.join(T, 'sv15'))}`], { cwd: RACINE, env: envDe({ PRESTI_JETON_USINE: JETON }), delaiMs: 15_000 })
      if (r.code !== 2 || !/la surveillance ne mesure que l'usine/.test(normApos(`${r.sortie}${r.erreur}`))) D.push(`--une-mesure sans --proc sur ${process.platform} : code ${r.code}, « ${court(r.erreur || r.sortie, 80)} » (code 2 et « la surveillance ne mesure que l'usine » attendus)`)
      return 'sur le poste, sans --proc, --une-mesure sort en code 2 : « la surveillance ne mesure que l\'usine »'
    })

    // Les IA gratuites.
    const REP = JSON.parse(lire(path.join(FIX, 'freellmapi', 'reponses.json')))
    const fx = existe(fS) ? await fauxFreellmapi(REP) : null
    const IA = { journal: path.join(T, 'ia', 'journal'), proc: path.join(T, 'ia', 'proc'), echange: path.join(T, 'ia', 'echange'), compteurs: path.join(T, 'ia', 'compteurs'), tours: {} }
    const ecrireCompteurs = (dossier, jour, lignes, ajout = false) => {
      fs.mkdirSync(dossier, { recursive: true })
      const f = path.join(dossier, `compteurs-${jour}.jsonl`)
      const txt = lignes.flatMap((x) => Array.from({ length: x.n }, (_, k) => JSON.stringify({ le: `${jour}T06:${String(k % 60).padStart(2, '0')}:00Z`, agent: 'essai', moteur: 'freellmapi', modele: x.modele, fournisseur_reel: x.fournisseur_reel }))).join('\n') + '\n'
      if (ajout) fs.appendFileSync(f, txt); else fs.writeFileSync(f, txt)
    }
    if (fx) {
      const t0 = Date.parse(REP.horloge)
      const jour = jourParis(t0), veille = jourParis(t0 - JOUR)
      ecrireCompteurs(IA.compteurs, jour, REP.compteurs.jour)
      ecrireCompteurs(IA.compteurs, veille, REP.compteurs.veille)
      fs.mkdirSync(IA.echange, { recursive: true })
      fs.writeFileSync(path.join(IA.echange, 'quota-codex.json'), JSON.stringify(REP.quota_codex))
      const ia = { freellmapi: fx.url, echange: IA.echange, compteurs: IA.compteurs }
      for (const [k, rel_] of [[0, 'r1'], [15, 'r2'], [30, 'r3'], [45, 'r4']]) {
        fx.etat.releve = rel_
        if (rel_ === 'r4') ecrireCompteurs(IA.compteurs, jour, REP.compteurs.ajout_r4, true)
        ecrireProc(IA.proc, k)
        const n0 = bus.requetes.length
        const r = await tour({ proc: IA.proc, journal: IA.journal, t: t0 + k * MINUTE, ia })
        IA.tours[rel_] = { r, requetes: bus.requetes.slice(n0) }
      }
    }
    const iaEv = (x) => evenements(x.requetes).filter((q) => /^ia_/.test(q.corps?.type || '')).map((q) => ({ type: q.corps.type, objet: q.corps.objet, resume: q.corps.resume }))
    const cleEv = (e) => `${e.type}|${e.objet}|${e.resume}`
    await juger(R, 'SV-IA-1', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const t1 = IA.tours.r1
      if (t1.r.code !== 0) D.push(`premier relevé : code ${t1.r.code} — ${court(t1.r.erreur, 120)}`)
      if (!fx.etat.requetes) D.push(`le faux freellmapi n'a reçu aucune requête (GET ${REP.route} attendu)`)
      const vus = iaEv(t1).map(cleEv).sort(), att = REP.attendus.r1.map(cleEv).sort()
      for (const a of att) if (!vus.includes(a)) D.push(`attendu et non posté : ${a}`)
      for (const v of vus) if (!att.includes(v)) D.push(`posté et non attendu : ${v}`)
      for (const e of iaEv(t1)) if (e.resume.length > 200) D.push(`résumé de ${e.resume.length} signes (200 au plus)`)
      const b = iaEv(IA.tours.r3).filter((e) => e.type === 'ia_bascule')
      const bAtt = REP.attendus.r3.filter((e) => e.type === 'ia_bascule').map(cleEv)
      if (b.length !== 1 || cleEv(b[0]) !== bAtt[0]) D.push(`bascule : ${JSON.stringify(b.map(cleEv))} (${bAtt[0]} attendu)`)
      return `les résumés ia_quota (${att.length}) et ia_bascule postés sont exactement ceux attendus`
    })
    await juger(R, 'SV-IA-2', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const e2 = iaEv(IA.tours.r2)
      if (e2.length) D.push(`second relevé sans changement : ${e2.length} événement(s) (aucun attendu) : ${court(e2.map(cleEv).join(' ; '), 160)}`)
      const e3 = iaEv(IA.tours.r3)
      if (e3.filter((e) => e.type === 'ia_bascule').length !== 1) D.push(`changement de fournisseur servi : ${e3.filter((e) => e.type === 'ia_bascule').length} ia_bascule (1 attendu)`)
      const q3 = e3.filter((e) => e.type === 'ia_quota').map(cleEv), q3a = REP.attendus.r3.filter((e) => e.type === 'ia_quota').map(cleEv)
      if (JSON.stringify(q3.sort()) !== JSON.stringify(q3a.sort())) D.push(`troisième relevé : ia_quota ${JSON.stringify(q3)} (${JSON.stringify(q3a)} attendu : le seul changement d'état)`)
      const e4 = iaEv(IA.tours.r4).map(cleEv), e4a = REP.attendus.r4.map(cleEv)
      if (JSON.stringify(e4.sort()) !== JSON.stringify(e4a.sort())) D.push(`quatrième relevé (tranche de 10 % franchie par les compteurs) : ${JSON.stringify(e4)} (${JSON.stringify(e4a)} attendu)`)
      return 'aucun événement sans changement d\'état ni de tranche de 10 % ; un seul ia_bascule au changement de fournisseur ; un ia_quota à la tranche franchie'
    })
    await juger(R, 'SV-IA-3', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      const j = path.join(T, 'ia-piege', 'journal'), p = path.join(T, 'ia-piege', 'proc')
      fx.etat.releve = 'piege'
      ecrireProc(p, 0)
      const n0 = bus.requetes.length
      const r = await tour({ proc: p, journal: j, t: Date.parse(REP.horloge), ia: { freellmapi: fx.url, echange: IA.echange, compteurs: IA.compteurs } })
      const poste = bus.requetes.slice(n0).filter((q) => q.route === '/api/agents/evenements')
      const tout = [...Object.values(IA.tours).flatMap((x) => x.requetes), ...poste].filter((q) => q.route === '/api/agents/evenements').map((q) => `${q.corps?.objet || ''} ${q.corps?.resume || ''}`)
      if (r.code !== 0) D.push(`relevé piégé : code ${r.code}`)
      for (const t of tout) {
        if (t.includes('@')) D.push(`un résumé porte « @ » : « ${court(t, 120)} »`)
        if (/\d{9,}/.test(t)) D.push(`un résumé porte un numéro de 9 chiffres ou plus : « ${court(t, 120)} »`)
        if (t.includes('PIEGE-')) D.push(`un résumé porte le texte de requête piégé : « ${court(t, 120)} »`)
      }
      if (!evenements(bus.requetes.slice(n0), 'ia_quota').some((q) => q.corps.objet === 'ia:cloudflare')) D.push('relevé piégé : aucun ia_quota pour ia:cloudflare (le fournisseur est tu au lieu d\'être masqué)')
      return 'aucun résumé ne porte « @ », un numéro de 9 chiffres ou plus, ni le texte de requête piégé ; le fournisseur piégé est relevé, masqué'
    })
    await juger(R, 'SV-IA-4', async (D) => {
      if (!existe(fS)) { D.push(absent(FICHIERS.surveillance)); return }
      if (fx) await fx.fermer()
      const j = path.join(T, 'ia-injoignable', 'journal'), p = path.join(T, 'ia-injoignable', 'proc')
      ecrireProc(p, 0)
      const n0 = bus.requetes.length
      const r = await tour({ proc: p, journal: j, t: Date.parse(REP.horloge), ia: { freellmapi: `http://127.0.0.1:${await portFerme()}`, echange: path.join(T, 'ia-injoignable', 'echange-vide'), compteurs: path.join(T, 'ia-injoignable', 'compteurs') } })
      if (r.code !== 0) D.push(`freellmapi injoignable : code ${r.code} (inchangé, 0 attendu)`)
      if (pile(r.erreur)) D.push('freellmapi injoignable : une exception non rattrapée')
      const l = existe(j) ? fs.readdirSync(j).filter((f) => f.endsWith('.jsonl') && !/^mesures-/.test(f)).flatMap((f) => lignesDe(lire(path.join(j, f)))).filter((x) => /ia_injoignable/.test(x)) : []
      if (l.length !== 1) D.push(`${l.length} ligne(s) ia_injoignable au journal (1 attendue)`)
      const inventes = evenements(bus.requetes.slice(n0), 'ia_quota').filter((q) => q.corps.objet !== 'ia:codex')
      if (inventes.length) D.push(`${inventes.length} ia_quota inventé(s) alors que freellmapi est injoignable`)
      const codex = evenements(bus.requetes.slice(n0), 'ia_quota').filter((q) => q.corps.objet === 'ia:codex')
      if (codex.some((q) => q.corps.resume !== REP.attendus.sans_quota_codex.resume)) D.push(`sans quota-codex.json, ia:codex « ${codex[0].corps.resume} » (« ${REP.attendus.sans_quota_codex.resume} » attendu)`)
      const x = await tour({ proc: p, journal: j, t: Date.parse(REP.horloge) + MINUTE, ia: { freellmapi: 'https://exemple.com', echange: IA.echange, compteurs: IA.compteurs } })
      if (x.code !== 2) D.push(`--freellmapi=https://exemple.com : code ${x.code} (2 attendu : boucle locale seulement)`)
      return 'freellmapi injoignable → une ligne ia_injoignable, code inchangé, aucune exception, aucun ia_quota inventé ; --freellmapi hors boucle locale → code 2'
    })
  } finally {
    await bus.fermer().catch(() => {})
  }
}
/** Le bilan de --bilan : JSON { cpu, mem, res, verdict } ou { p95: {…}, verdict }, ou le texte « processeur x % … verdict v ». */
function lireBilan(sortie) {
  for (const l of lf(sortie).split('\n').reverse()) {
    try {
      const o = JSON.parse(l)
      const p = o.p95 || o
      if (['cpu', 'mem', 'res'].every((k) => typeof p[k] === 'number') && typeof o.verdict === 'string') return { cpu: p.cpu, mem: p.mem, res: p.res, verdict: o.verdict }
    } catch { /* pas du JSON */ }
  }
  const t = normApos(sortie).toLowerCase()
  const n = (re) => { const m = re.exec(t); return m ? Number(m[1].replace(',', '.')) : null }
  const v = /verdict\s*:?\s*(ok|approche|danger|incomplet)/.exec(t)
  const b = { cpu: n(/processeur\s*:?\s*([\d.,]+)/), mem: n(/m[ée]moire\s*:?\s*([\d.,]+)/), res: n(/r[ée]seau\s*:?\s*([\d.,]+)/), verdict: v ? v[1] : null }
  return b.verdict ? b : null
}
/** Analyseur INI des unités systemd : { section: { clé: [valeurs] } } (lignes suivies par « \ » jointes). */
function lireIni(texte) {
  const o = {}
  let s = null
  const lignes = lf(texte).replace(/\\\n/g, ' ').split('\n')
  for (const brut of lignes) {
    const l = brut.trim()
    if (!l || l.startsWith('#') || l.startsWith(';')) continue
    const m = /^\[(.+)\]$/.exec(l)
    if (m) { s = m[1]; o[s] ||= {}; continue }
    const k = l.indexOf('=')
    if (k < 0 || !s) continue
    const cle = l.slice(0, k).trim(), val = l.slice(k + 1).trim().replace(/\s+/g, ' ')
    ;(o[s][cle] ||= []).push(val)
  }
  return o
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --reel : l'usine elle-même (026-058)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function reel(groupes) {
  const R = new Rapport('reel')
  const socle = groupes.includes('socle'), surv = groupes.includes('surveillance')
  const cle = path.join(os.homedir(), '.ssh', 'presti-usine')
  const hoteUsine = (lireSi(path.join(DEPOT, 'scripts', 'usine.mjs')) || '').match(/process\.env\.PRESTI_USINE\s*\|\|\s*'([^']+)'/)
  const hote = process.env.PRESTI_USINE || (hoteUsine ? hoteUsine[1] : 'usine@88.96.53.3')
  const ssh = process.env.PRESTI_SSH_BIN || 'ssh'
  if (!process.env.PRESTI_SSH_BIN && !existe(cle)) { console.error(`✗ ${NOM} --reel : clé ${cle} absente : usine injoignable`); process.exit(2) }
  const va = lettres(32), vb = lettres(32)
  const script = scriptReel({ socle, surv, va, vb })
  const r = await lancer(ssh, ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hote, 'bash -s'], { cwd: DEPOT, env: { ...process.env }, entree: script, delaiMs: 240_000 })
  if (r.code === 255 || !/^R\|debut\|/m.test(r.sortie)) { console.error(`✗ ${NOM} --reel : usine injoignable (${hote}) : ${court(r.erreur, 200)}`); process.exit(2) }
  const vals = new Map(), listes = new Map()
  for (const l of lf(r.sortie).split('\n')) {
    let m = /^R\|([^|]+)\|(.*)$/.exec(l)
    if (m) { vals.set(m[1], m[2]); continue }
    m = /^L\|([^|]+)\|(.*)$/.exec(l)
    if (m) { if (!listes.has(m[1])) listes.set(m[1], []); listes.get(m[1]).push(m[2]) }
  }
  const v = (k) => vals.get(k) ?? ''
  const L = (k) => listes.get(k) || []
  if (socle) {
    await juger(R, 'RS-1', async (D) => {
      const pw = v('agents_passwd').split(':')
      if (pw[0] !== 'agents') { D.push('le compte agents n\'existe pas'); return }
      if (pw[6] !== '/usr/sbin/nologin') D.push(`shell de agents : ${pw[6]} (/usr/sbin/nologin attendu)`)
      const g = v('agents_groupes').split(/\s+/)
      for (const x of ['sudo', 'adm', 'admin']) if (g.includes(x)) D.push(`agents est dans le groupe ${x}`)
      return `agents existe, shell /usr/sbin/nologin, groupes : ${v('agents_groupes')}`
    })
    await juger(R, 'RS-2', async (D) => {
      if (!/^mode=600 proprietaire=agents noms=\d+$/.test(v('coffre_etat'))) D.push(`presti-coffre etat : « ${court(v('coffre_etat'), 80)} » (mode=600 proprietaire=agents attendu)`)
      if (!/^700 agents$/.test(v('home_mode'))) D.push(`/home/agents : ${v('home_mode')} (700 agents attendu)`)
      if (v('coffre_lisible_par_usine') !== 'non') D.push('le compte usine lit le coffre')
      if (v('home_traversable_par_usine') !== 'non') D.push('le compte usine traverse /home/agents')
      R.note('RS-2 : /home/agents/.config/presti n\'est pas lisible sous usine (parent en 700) : son mode 700 se juge à la création (RS-6)')
      return `coffre en 600 à agents, /home/agents en 700, illisible sous usine`
    })
    await juger(R, 'RS-3', async (D) => {
      const lignes = L('sudo_l').map((x) => x.trim())
      const agents = lignes.filter((x) => /^\(agents\)/.test(x)).flatMap((x) => x.replace(/^\(agents\)\s*/, '').replace(/^NOPASSWD:\s*/, '').split(/,\s*/)).map((x) => x.trim())
      if (JSON.stringify(agents.sort()) !== JSON.stringify(['/usr/local/bin/presti-coffre', '/usr/local/bin/presti-journal'])) D.push(`sudo -n -l, pour agents : ${JSON.stringify(agents)} (exactement les deux commandes du socle attendues)`)
      if (lignes.some((x) => /SETENV|env_keep/.test(x) && /agents|presti/.test(x))) D.push('SETENV ou env_keep dans les droits sudo')
      if (lignes.some((x) => /^\(ALL(\s*:\s*ALL)?\)/.test(x))) R.note('RS-3 : usine a aussi une règle (ALL) : elle couvre agents ; le coffre n\'est hors de sa portée qu\'après le durcissement de l\'usine (026-197)')
      if (v('visudo') !== '0' && v('visudo') !== 'refuse') D.push(`visudo -c : ${v('visudo')}`)
      if (v('visudo') === 'refuse') R.note('RS-3 : visudo -c demande root ; sudo -n -l a répondu, la syntaxe est donc valide')
      return 'sudo -n -l : pour agents, exactement presti-coffre et presti-journal, sans SETENV ni env_keep'
    })
    await juger(R, 'RS-4', async (D) => {
      for (const n of ['coffre', 'journal']) {
        if (v(`bin_${n}`) !== 'root:root 755') D.push(`/usr/local/bin/presti-${n} : ${v(`bin_${n}`)} (root:root 755 attendu)`)
        if (v(`cmp_${n}`) !== '0') D.push(`/usr/local/bin/presti-${n} diffère de scripts/usine/presti-${n}.sh du commit déployé`)
      }
      return 'presti-coffre et presti-journal en root:root 755, identiques à l\'octet au commit déployé'
    })
    await juger(R, 'RS-5', async (D) => {
      if (!v('deploye') || v('deploye') !== v('origin_main')) D.push(`/srv/presti-agents au commit ${v('deploye').slice(0, 10)} (origin/main : ${v('origin_main').slice(0, 10)})`)
      if (L('inscriptible').length) D.push(`${L('inscriptible').length} fichier(s) inscriptible(s) par le groupe ou les autres : ${court(L('inscriptible').join(', '), 160)}`)
      if (v('lien_travail') !== '/home/agents/travail') D.push(`.orchestre/travail → ${v('lien_travail') || '(pas un lien)'}`)
      if (v('lien_quotas') !== '/home/agents/travail/quotas.json') D.push(`.orchestre/quotas.json → ${v('lien_quotas') || '(pas un lien)'}`)
      return `/srv/presti-agents à origin/main (${v('deploye').slice(0, 10)}), rien d'inscriptible hors node_modules, liens vers /home/agents/travail`
    })
    await juger(R, 'RS-6', async (D) => {
      if (v('rs6_lignes') !== '2') D.push(`20 paires de poser simultanés : ${v('rs6_lignes')} ligne(s) à la fin (2 attendues)`)
      if (v('rs6_chef') !== '1' || v('rs6_usine') !== '1') D.push('une des deux lignes manque ou a une autre valeur')
      if (v('rs6_mode_fichier') !== '600') D.push(`coffre d'essai en ${v('rs6_mode_fichier')} (600 attendu)`)
      if (v('rs6_mode_dossier') !== '700') D.push(`dossier d'essai en ${v('rs6_mode_dossier')} (700 attendu)`)
      if (v('rs6_efface') !== 'oui') D.push('le dossier d\'essai de /tmp n\'est pas effacé')
      return '20 paires de poser simultanés sous usine : les deux lignes à la fin, fichier 600, dossier 700, dossier d\'essai effacé'
    })
    await juger(R, 'RS-7', async (D) => {
      if (v('ufw') !== 'absent') D.push(`ufw : ${v('ufw')}`)
      if (v('iptables_persistent') !== 'installe') D.push('iptables-persistent n\'est pas installé')
      if (v('bubblewrap') !== 'absent') D.push('le paquet bubblewrap est installé')
      if (v('apparmor_codex') !== 'present') D.push('/etc/apparmor.d/codex-bwrap absent')
      return 'ufw absent, iptables-persistent installé, bubblewrap absent, profil AppArmor codex-bwrap présent'
    })
  }
  if (surv) {
    await juger(R, 'RS-8', async (D) => {
      if (v('surv_actif') !== 'active' || !/running/.test(v('surv_sous_etat'))) D.push(`presti-surveillance.service : ${v('surv_actif')} (${v('surv_sous_etat')}) (active (running) attendu)`)
      const redem = Number(v('surv_redemarrages') || 0)
      if (redem >= 5) D.push(`${redem} redémarrages (moins de 5 dans l'heure attendus ; source : ${v('surv_redem_source')})`)
      const derniere = L('journal5').map((x) => { try { return JSON.parse(x) } catch { return null } }).filter(Boolean).pop()
      const age = derniere ? Number(v('maintenant_s')) - Date.parse(derniere.le) / 1000 : null
      if (age === null || age > 180) D.push(`dernière mesure de presti-journal surveillance 5 : ${age === null ? 'aucune' : `il y a ${Math.round(age)} s`} (moins de 3 min attendu)`)
      if (v('verify') !== '0') D.push(`systemd-analyze verify : code ${v('verify')}`)
      const env = lireSi(path.join(DEPOT, '.env.local')) || ''
      const url = (/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m.exec(env) || [])[1]?.trim().replace(/^["']|["']$/g, '')
      const cle_ = (/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m.exec(env) || [])[1]?.trim().replace(/^["']|["']$/g, '')
      if (!url || !cle_) { D.push('.env.local sans l\'URL ou la clé de service : battement non vérifiable'); return }
      const rep = await fetch(`${url}/rest/v1/rpc/ops_etat`, { method: 'POST', headers: { apikey: cle_, authorization: `Bearer ${cle_}`, 'content-type': 'application/json' }, body: '{}' }).catch((e) => ({ ok: false, status: e.message }))
      if (!rep.ok) { D.push(`ops_etat : réponse ${rep.status}`); return }
      const etat = await rep.json()
      const u = (etat.agents || []).find((a) => a.nom === 'usine')
      const ageB = u && u.battement_le ? (Date.now() - Date.parse(u.battement_le)) / 60000 : null
      if (ageB === null || ageB > 20) D.push(`l'agent usine a battu ${ageB === null ? 'jamais' : `il y a ${Math.round(ageB)} min`} (moins de 20 min attendu)`)
      return `service actif, ${redem} redémarrage(s), mesure de moins de 3 min, unité vérifiée, battement il y a ${Math.round(ageB)} min`
    })
    const lignes = L('journal500').map((x) => { try { return JSON.parse(x) } catch { return null } }).filter((x) => x && typeof x.cpu === 'number')
    const b = { n: lignes.length, cpu: p95(lignes.map((x) => x.cpu)), mem: p95(lignes.map((x) => x.mem)), res: p95(lignes.map((x) => x.res)) }
    console.log(`INFO RS-9 — p95 sur les ${b.n} dernières mesures (presti-journal borne à 500 : pas 7 jours) : processeur ${b.cpu} % · mémoire ${b.mem} % · réseau ${b.res} % · verdict indicatif ${verdictDe(b.n >= 1440 ? b.n : 1440, Math.max(b.cpu ?? 0, b.mem ?? 0, b.res ?? 0))} (information : ne décide pas du code)`)
  }
  return R
}
function scriptReel({ socle, surv, va, vb }) {
  const L = ['. "$HOME/.profile" >/dev/null 2>&1 || true', 'set -u', "r() { printf 'R|%s|%s\\n' \"$1\" \"$2\"; }", 'r debut ok']
  if (socle) L.push(
    'r agents_passwd "$(getent passwd agents || true)"',
    'r agents_groupes "$(id -nG agents 2>/dev/null || true)"',
    'r coffre_etat "$(sudo -n -u agents /usr/local/bin/presti-coffre etat 2>&1 | head -1)"',
    'r home_mode "$(stat -c \'%a %U\' /home/agents 2>&1)"',
    'if test -r /home/agents/.config/presti/agents.env; then r coffre_lisible_par_usine oui; else r coffre_lisible_par_usine non; fi',
    'if test -x /home/agents; then r home_traversable_par_usine oui; else r home_traversable_par_usine non; fi',
    "sudo -n -l 2>&1 | sed 's/^/L|sudo_l|/'",
    'if visudo -c >/dev/null 2>&1; then r visudo 0; elif visudo -c 2>&1 | grep -qi -e permission -e denied -e root; then r visudo refuse; else r visudo 1; fi',
    'for n in coffre journal; do r "bin_$n" "$(stat -c \'%U:%G %a\' /usr/local/bin/presti-$n 2>&1)"; if cmp -s /usr/local/bin/presti-$n /srv/presti-agents/scripts/usine/presti-$n.sh; then r "cmp_$n" 0; else r "cmp_$n" 1; fi; done',
    'git -C "$HOME/presti" fetch -q origin 2>/dev/null || true',
    'r origin_main "$(git -C "$HOME/presti" rev-parse origin/main 2>/dev/null)"',
    'r deploye "$(git -C /srv/presti-agents rev-parse HEAD 2>/dev/null)"',
    "find /srv/presti-agents -path /srv/presti-agents/node_modules -prune -o ! -type l -perm /022 -print 2>/dev/null | head -20 | sed 's/^/L|inscriptible|/'",
    'r lien_travail "$(readlink /srv/presti-agents/.orchestre/travail 2>/dev/null)"',
    'r lien_quotas "$(readlink /srv/presti-agents/.orchestre/quotas.json 2>/dev/null)"',
    `VA='${va}'; VB='${vb}'`,
    'D=$(mktemp -d /tmp/presti-coffre-essai.XXXXXX); trap \'rm -rf "$D"\' EXIT; F="$D/sous/agents.env"',
    'for i in $(seq 1 20); do printf \'%s\\n\' "$VA" | PRESTI_COFFRE_FICHIER="$F" /usr/local/bin/presti-coffre poser PRESTI_JETON_CHEF >/dev/null 2>&1 & printf \'%s\\n\' "$VB" | PRESTI_COFFRE_FICHIER="$F" /usr/local/bin/presti-coffre poser PRESTI_JETON_USINE >/dev/null 2>&1 & done; wait',
    'r rs6_lignes "$(grep -c \'\' "$F" 2>/dev/null || echo 0)"',
    'r rs6_chef "$(grep -cx "PRESTI_JETON_CHEF=$VA" "$F" 2>/dev/null || echo 0)"',
    'r rs6_usine "$(grep -cx "PRESTI_JETON_USINE=$VB" "$F" 2>/dev/null || echo 0)"',
    'r rs6_mode_fichier "$(stat -c %a "$F" 2>/dev/null)"',
    'r rs6_mode_dossier "$(stat -c %a "$D/sous" 2>/dev/null)"',
    'rm -rf "$D"; if test -e "$D"; then r rs6_efface non; else r rs6_efface oui; fi',
    'if command -v ufw >/dev/null 2>&1 || dpkg -s ufw >/dev/null 2>&1; then r ufw present; else r ufw absent; fi',
    'if dpkg -s iptables-persistent 2>/dev/null | grep -q "Status: install ok installed"; then r iptables_persistent installe; else r iptables_persistent absent; fi',
    'if dpkg -s bubblewrap 2>/dev/null | grep -q "Status: install ok installed"; then r bubblewrap installe; else r bubblewrap absent; fi',
    'if test -e /etc/apparmor.d/codex-bwrap; then r apparmor_codex present; else r apparmor_codex absent; fi',
  )
  if (surv) L.push(
    'r surv_actif "$(systemctl is-active presti-surveillance.service 2>/dev/null)"',
    'r surv_sous_etat "$(systemctl show -p SubState --value presti-surveillance.service 2>/dev/null)"',
    'if [ -n "$(journalctl -u presti-surveillance.service -n 1 -o cat --no-pager 2>/dev/null)" ]; then n=$(journalctl -u presti-surveillance.service --since "-1h" -o cat --no-pager 2>/dev/null | grep -c "Scheduled restart" || true); r surv_redem_source "journal de la dernière heure"; else n=$(systemctl show -p NRestarts --value presti-surveillance.service 2>/dev/null); r surv_redem_source "NRestarts (journal illisible sous usine)"; fi; r surv_redemarrages "$n"',
    "sudo -n -u agents /usr/local/bin/presti-journal surveillance 5 2>/dev/null | sed 's/^/L|journal5|/'",
    "sudo -n -u agents /usr/local/bin/presti-journal surveillance 500 2>/dev/null | sed 's/^/L|journal500|/'",
    'r maintenant_s "$(date -u +%s)"',
    'if systemd-analyze verify /etc/systemd/system/presti-surveillance.service >/dev/null 2>&1; then r verify 0; else r verify 1; fi',
  )
  L.push('r fin ok', '')
  return L.join('\n')
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// --preuve-echecs : autotest des jeux d'essai, puis les échecs attendus sur l'arbre de référence
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function preuveEchecs() {
  const R = new Rapport('preuve-echecs')
  const T = dossierNeuf('preuve')
  const at = []
  const AT = async (c, corps) => { await juger(R, c, corps); at.push(R.resultats[R.resultats.length - 1]) }

  await AT('AT-1', async (D) => {
    const b = trouverBash()
    if (!b) { D.push('bash introuvable (ni dans le PATH, ni C:/Program Files/Git/bin/bash.exe)'); return }
    const r = await lancer(b, ['-c', 'echo "$BASH_VERSION"'], { cwd: T, env: envDe() })
    if (r.code !== 0 || !/^\d+\./.test(r.sortie.trim())) D.push(`bash (${b}) ne répond pas : ${court(r.erreur, 100)}`)
    return `bash trouvé : ${b} (${r.sortie.trim()})${dossierFlock() ? ' ; flock de substitution posé (Git Bash)' : ''}`
  })
  await AT('AT-2', async (D) => {
    const banc = bancSsh(path.join(T, 'ssh'))
    const entree = Buffer.from(`ligne 1 ${HASARD}\nligne 2 é\n`, 'utf8')
    const r1 = await lancer(doublures().sshBin, ['-i', 'k', '-o', 'BatchMode=yes', HOTE_ESSAI, 'bash -s', 'un "guillemet" et un \\ '], { cwd: T, env: envDe(banc.env('enregistrer'), banc.chemins), entree })
    const a = banc.appels()
    if (r1.code !== 0 || r1.sortie !== '') D.push(`mode enregistrer : code ${r1.code}, sortie « ${court(r1.sortie, 40)} » (0 et vide attendus)`)
    if (a.length !== 1) D.push(`${a.length} appel(s) consigné(s) (1 attendu)`)
    else {
      if (JSON.stringify(a[0].argv) !== JSON.stringify(['-i', 'k', '-o', 'BatchMode=yes', HOTE_ESSAI, 'bash -s', 'un "guillemet" et un \\ '])) D.push(`argv consigné ${JSON.stringify(a[0].argv)} ≠ argv passé`)
      if (!a[0].stdin.equals(entree)) D.push('entrée standard consignée ≠ entrée passée (octet pour octet)')
      if (!existe(a[0].fichier.replace('.argv.json', '.stdin')) || lire(a[0].fichier).includes(HASARD)) D.push('argv et entrée standard ne sont pas en fichiers séparés')
      if (a[0].via !== 'PRESTI_SSH_BIN') D.push(`via ${a[0].via} (PRESTI_SSH_BIN attendu)`)
    }
    const f = path.join(T, 'sortie.txt'); fs.writeFileSync(f, `sortie ${HASARD}\n`)
    const r2 = await lancer(doublures().sshBin, [HOTE_ESSAI, 'noms'], { cwd: T, env: envDe(banc.env(`sortie=${f}`), banc.chemins) })
    if (r2.code !== 0 || r2.sortie !== `sortie ${HASARD}\n`) D.push(`mode sortie= : code ${r2.code}, « ${court(r2.sortie, 40)} »`)
    const r3 = await lancer(doublures().sshBin, [HOTE_ESSAI, 'noms'], { cwd: T, env: envDe(banc.env('injoignable'), banc.chemins) })
    if (r3.code !== 255 || !/Connection timed out/.test(r3.erreur)) D.push(`mode injoignable : code ${r3.code}, « ${court(r3.erreur, 60)} » (255 et « Connection timed out » attendus)`)
    const r4 = await lancer(process.execPath, ['-e', "require('child_process').spawnSync('ssh', ['-V'], { stdio: 'inherit' })"], { cwd: T, env: envDe(banc.env('enregistrer'), banc.chemins) })
    if (!banc.appels().some((x) => x.via === 'ssh-du-PATH')) D.push(`le ssh du PATH n'est pas la doublure (un vrai ssh pourrait partir) — ${court(r4.erreur, 80)}`)
    if (fs.readdirSync(banc.journaux.ssh).some((x) => fs.statSync(path.join(banc.journaux.ssh, x)).size === 0 && x.endsWith('.argv.json'))) D.push('un journal du faux ssh de 0 octet')
    return 'le faux ssh consigne son argv et son entrée standard en fichiers séparés (octet pour octet) et rend ses trois modes (enregistrer, sortie=, injoignable) ; le ssh du PATH est une doublure'
  })
  await AT('AT-3', async (D) => {
    const { demarrerFauxBus } = await import(pathToFileURL(path.join(FIX, 'faux-bus.mjs')).href)
    const jeton = aleatoire('alnum', 40, true)
    const bus = await demarrerFauxBus({ jeton, maintenant: new Date('2026-09-14T07:00:00Z') })
    try {
      const post = (route, corps, j = jeton) => fetch(`${bus.url}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(j ? { authorization: `Bearer ${j}` } : {}) }, body: corps === undefined ? undefined : JSON.stringify(corps) }).then(async (r) => ({ statut: r.status, corps: await r.json() }))
      const bonne = { question: "L'usine risque d'être reprise par Oracle pour inactivité : que fait-on ?", contexte: 'essai', options: [{ cle: 'deplacer_du_travail', libelle: 'Déplacer', recommandee: true }, { cle: 'accepter_le_risque', libelle: 'Accepter', recommandee: false }], defaut: 'accepter_le_risque', montant_cents: 0, portee: 'argent', echeance: '2026-09-17T07:00:00Z', cle: 'usine:seuil:2026-S38' }
      const x1 = await post('/api/agents/decisions', { ...bonne, inconnu: 1 })
      if (x1.statut !== 400 || x1.corps.champ !== 'inconnu') D.push(`décision à champ inconnu : ${x1.statut} ${JSON.stringify(x1.corps)} (400 avec le nom du champ attendu)`)
      const x2 = await post('/api/agents/decisions', bonne)
      if (x2.statut !== 201 || x2.corps.creee !== true) D.push(`bonne décision : ${x2.statut} ${JSON.stringify(x2.corps)} (201 creee: true attendu)`)
      const x3 = await post('/api/agents/decisions', bonne)
      if (x3.statut !== 200 || x3.corps.creee !== false || x3.corps.id !== x2.corps.id) D.push(`décision rejouée : ${x3.statut} ${JSON.stringify(x3.corps)} (200 creee: false, même id attendu)`)
      const x4 = await post('/api/agents/decisions', { ...bonne, options: [bonne.options[0]] })
      if (x4.statut !== 400 || x4.corps.champ !== 'options') D.push(`une seule option : ${x4.statut} (400 options attendu)`)
      const x5 = await post('/api/agents/decisions', { ...bonne, cle: 'autre', echeance: '2026-09-14T07:30:00Z' })
      if (x5.statut !== 400 || x5.corps.champ !== 'echeance') D.push(`échéance à +30 min : ${x5.statut} (400 echeance attendu)`)
      const x6 = await post('/api/agents/battement', undefined, null)
      if (x6.statut !== 401) D.push(`battement sans Bearer : ${x6.statut} (401 attendu)`)
      const x7 = await post('/api/agents/evenements', { type: 'usine_mesure', objet: 'usine:2026-09-14', resume: 'x'.repeat(201) })
      if (x7.statut !== 400 || x7.corps.champ !== 'resume') D.push(`résumé de 201 signes : ${x7.statut} (400 resume attendu)`)
      const x8 = await post('/api/agents/evenements', { type: 'usine_mesure', objet: 'usine:2026-09-14', resume: 'p95 7 j' })
      if (x8.statut !== 201) D.push(`bon événement : ${x8.statut} (201 attendu)`)
      bus.fixer({ mode: '503' })
      const x9 = await post('/api/agents/battement', undefined)
      if (x9.statut !== 503) D.push(`mode 503 : ${x9.statut}`)
      if (JSON.stringify(bus.requetes).includes(jeton)) D.push('le journal du faux bus contient la valeur du jeton')
      if (bus.requetes.length !== 9) D.push(`${bus.requetes.length} requêtes consignées (9 attendues)`)
    } finally { await bus.fermer() }
    return 'le faux bus refuse une décision à champ inconnu (400 + nom du champ), accepte la bonne (201 creee: true), rejouée → 200 creee: false ; 401 sans Bearer, 503 à la demande ; journal sans le jeton'
  })
  await AT('AT-4', async (D) => {
    const A = PROC_ATT()
    const p = (f) => lire(path.join(FIX, 'proc', f))
    const m = mesureReference(p('stat-1'), p('stat-2'), p('meminfo'), p('net-dev-1'), p('net-dev-2'), A.intervalle_s, A.debit_bps_defaut)
    const m2 = mesureReference(p('stat-1'), p('stat-2'), p('meminfo'), p('net-dev-1'), p('net-dev-2'), A.intervalle_s, A.debit_bps_essai)
    if (m.cpu !== 37.5 || A.cpu !== 37.5) D.push(`processeur de référence ${m.cpu} % (37,5 % exactement attendu)`)
    if (m.mem !== A.mem) D.push(`mémoire de référence ${m.mem} % (${A.mem} attendu)`)
    if (m.res !== A.res) D.push(`réseau de référence ${m.res} % (${A.res} attendu)`)
    if (m2.res !== A.res_debit_essai) D.push(`réseau à ${A.debit_bps_essai} b/s : ${m2.res} % (${A.res_debit_essai} attendu)`)
    return `instantanés de /proc : processeur ${m.cpu} %, mémoire ${m.mem} %, réseau ${m.res} % (et ${m2.res} % à ${A.debit_bps_essai} b/s), par le calcul de référence du juge`
  })
  await AT('AT-5', async (D) => {
    const A = JSON.parse(lire(path.join(FIX, 'mesures', 'attendus.json')))
    const { genererJeu, JEUX } = await import(pathToFileURL(path.join(FIX, 'mesures', 'generer.mjs')).href)
    const d = []
    for (const jeu of ['ok', 'approche', 'danger', 'incomplet']) {
      if (!JEUX[jeu]) { D.push(`jeu ${jeu} absent du générateur`); continue }
      const l = genererJeu(jeu, A.fin)
      const l2 = genererJeu(jeu, A.fin)
      if (JSON.stringify(l) !== JSON.stringify(l2)) D.push(`jeu ${jeu} : le générateur n'est pas déterministe`)
      const r = { n: l.length, cpu: p95(l.map((x) => x.cpu)), mem: p95(l.map((x) => x.mem)), res: p95(l.map((x) => x.res)) }
      r.verdict = verdictDe(r.n, Math.max(r.cpu, r.mem, r.res))
      for (const k of ['n', 'cpu', 'mem', 'res', 'verdict']) if (r[k] !== A[jeu][k]) D.push(`jeu ${jeu} : ${k} = ${r[k]} par le calcul du juge, ${A[jeu][k]} écrit à côté`)
      d.push(`${jeu} ${r.cpu}/${r.mem}/${r.res} ${r.verdict}`)
    }
    const { cpu, mem, res } = A.approche
    if (![cpu, mem, res].every((x) => x >= 22 && x < 30)) D.push('le jeu approche n\'a pas ses trois p95 entre 22 et 30 %')
    if (![A.danger.cpu, A.danger.mem, A.danger.res].every((x) => x < 22)) D.push('le jeu danger n\'a pas ses trois p95 sous 22 %')
    if (A.ok.cpu !== 41) D.push('le jeu ok n\'a pas son p95 processeur à 41 %')
    if (A.incomplet.n !== 1200) D.push('le jeu incomplet n\'a pas 20 h de mesures')
    return `jeux de mesures déterministes, p95 recalculés égaux à ceux écrits à côté : ${d.join(' ; ')}`
  })
  await AT('AT-6', async (D) => {
    const cas = chargerCas()
    if (JSON.stringify(cas.noms_permis) !== JSON.stringify(NOMS_PERMIS)) D.push('noms_permis de cas-valeurs.json ≠ la liste fermée du juge')
    const ids = new Set()
    for (const c of cas.cas) {
      if (ids.has(c.id)) D.push(`id en double : ${c.id}`)
      ids.add(c.id)
      if (!NOMS_PERMIS.includes(c.nom)) D.push(`${c.id} : nom hors liste ${c.nom}`)
      if (!['accepte', 'refuse'].includes(c.attendu)) D.push(`${c.id} : attendu « ${c.attendu} »`)
      if (reglesReference(c.nom, c.valeur) !== (c.attendu === 'accepte')) D.push(`${c.id} (${c.regle}) : les règles de référence du juge ${reglesReference(c.nom, c.valeur) ? 'acceptent' : 'refusent'}, la table dit ${c.attendu}`)
    }
    for (const n of cas.noms_hors_liste) if (NOMS_PERMIS.includes(n)) D.push(`${n} est dans noms_hors_liste et dans la liste fermée`)
    for (const g of ['vide.env', 'deux-noms.env', 'commentee.env', 'mal-formee.env']) {
      const f = path.join(FIX, 'coffre', g)
      if (!existe(f) || fs.statSync(f).size === 0) D.push(`coffre d'essai ${g} absent ou de 0 octet`)
    }
    // Aucune forme de clé en clair dans les jeux d'essai (scripts/usine.mjs refuserait le paquet).
    const { motifs } = await motifsSecrets()
    const marcher = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? marcher(path.join(d, e.name)) : [path.join(d, e.name)]))
    for (const f of marcher(FIX)) { const t = lire(f); for (const m of motifs) if (m.re.test(t)) D.push(`${rel(f)} : une forme de clé en clair (${m.nom})`) }
    for (const m of motifs) if (m.re.test(lire(fileURLToPath(import.meta.url)))) D.push(`ce juge contient une forme de clé en clair (${m.nom})`)
    return `${cas.cas.length} cas nom × valeur cohérents avec les règles de référence du juge (${cas.cas.filter((c) => c.attendu === 'accepte').length} acceptés, ${cas.cas.filter((c) => c.attendu === 'refuse').length} refusés), ${cas.noms_hors_liste.length} noms hors liste ; quatre coffres d'essai non vides ; aucune forme de clé en clair dans les jeux d'essai ni dans le juge`
  })
  await AT('AT-7', async (D) => {
    const s = path.join(T, 'espion.json')
    const r = await lancer(process.execPath, [path.join(FIX, 'enfant-espion.mjs'), `--sortie=${s}`, '--code=7'], { cwd: T, env: { ...BASE_ENV, PATH: path.dirname(process.execPath), ESPION_A: HASARD } })
    if (r.code !== 7) D.push(`code ${r.code} (7 attendu)`)
    const e = existe(s) ? JSON.parse(lire(s)) : null
    if (!e || !e.noms.includes('ESPION_A') || e.empreintes.ESPION_A !== sha256(HASARD)) D.push('l\'enfant espion n\'écrit pas le nom et l\'empreinte de ses variables')
    if (e && lire(s).includes(HASARD)) D.push('l\'enfant espion écrit une valeur')
    return 'l\'enfant espion écrit les noms et les empreintes SHA-256 (jamais une valeur) et sort avec le code demandé'
  })
  await AT('AT-8', async (D) => {
    const U = JSON.parse(lire(path.join(FIX, 'unites', 'noms.json')))
    const globRe = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
    for (const [g, def] of Object.entries(U.groupes)) {
      for (const u of def.unites) if (!def.motifs.some((m) => globRe(m).test(u))) D.push(`${g} : ${u} hors de ses motifs`)
      for (const [h, d2] of Object.entries(U.groupes)) if (h !== g) for (const u of d2.unites) if (def.motifs.some((m) => globRe(m).test(u))) D.push(`${g} : ses motifs prennent ${u} (${h})`)
      for (const u of def.a_activer) if (!def.unites.includes(u)) D.push(`${g} : ${u} à activer mais pas dans ses unités`)
    }
    if (JSON.stringify(Object.keys(U.groupes)) !== JSON.stringify(['surveillance', 'atelier', 'livreur', 'chef', 'porteur', 'modeles'])) D.push('les groupes ne sont pas surveillance, atelier, livreur, chef, porteur, modeles')
    return `noms des unités de ${Object.keys(U.groupes).length} groupes, chacun couvert par ses seuls motifs`
  })
  await AT('AT-9', async (D) => {
    const REP = JSON.parse(lire(path.join(FIX, 'freellmapi', 'reponses.json')))
    for (const k of ['r1', 'r3', 'piege']) if (!REP.releves[k]?.providers?.length) D.push(`relevé ${k} absent`)
    for (const [k, l] of Object.entries(REP.attendus)) for (const e of [].concat(l)) {
      if (e.resume.length > 200) D.push(`${k} : résumé de plus de 200 signes`)
      if (/@|\d{9,}/.test(e.resume)) D.push(`${k} : un résumé attendu porte @ ou un long numéro`)
    }
    const r1 = REP.releves.r1
    for (const e of REP.attendus.r1.filter((x) => x.objet !== 'ia:codex')) {
      const p = r1.providers.find((x) => `ia:${x.provider}` === e.objet)
      const utilise = p.used ?? REP.compteurs.jour.filter((c) => c.fournisseur_reel === p.provider && c.modele === p.model).reduce((a, c) => a + c.n, 0)
      const etat = { active: 'actif', exhausted: 'épuisé', error: 'erreur' }[p.status]
      const attendu = `${p.provider} · ${p.model} · ${utilise}/${p.limit} ${p.unit} · ${etat} · remis à ${heureParis(p.resets_at)}`
      if (attendu !== e.resume) D.push(`${e.objet} : la table dit « ${e.resume} », le calcul du juge donne « ${attendu} »`)
    }
    if (!REP.releves.piege.recent.some((x) => x.prompt.includes('{{PIEGE}}'))) D.push('le relevé piégé ne glisse pas de texte de requête')
    return 'réponses enregistrées du faux freellmapi et résumés attendus cohérents (recalculés par le juge : utilisé, plafond, état, heure de Paris), sans @ ni long numéro'
  })

  // Les échecs attendus : chaque groupe sur l'arbre de référence.
  const pe = []
  let refDossier = null
  await juger(R, 'PE-1', async (D) => {
    const git = (args) => spawnSync('git', args, { cwd: DEPOT, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28 })
    if (git(['merge-base', '--is-ancestor', REFERENCE, 'HEAD']).status !== 0) { D.push(`le commit de référence ${REFERENCE} n'est pas un ancêtre de HEAD`); return }
    for (const f of Object.values(FICHIERS)) if (git(['cat-file', '-e', `${REFERENCE}:${f}`]).status === 0) D.push(`${f} existe déjà au commit de référence`)
    refDossier = dossierNeuf('reference')
    // L'archive est écrite DANS le dossier cible et nommée en relatif (cwd) : jamais un chemin à lettre de lecteur pour tar.
    // Le tar qui répond dépend de l'ordre du PATH : sous Git Bash, le tar MSYS lit « C: » d'un chemin absolu comme un hôte
    // distant (« Cannot connect to C: resolve failed ») ; sous PowerShell, bsdtar (System32) réussit mais refuse --force-local.
    // Un nom relatif sans « : » marche avec les deux.
    const nomTar = 'reference.tar'
    const tar = path.join(refDossier, nomTar)
    const a = git(['archive', '--format=tar', `--output=${tar}`, REFERENCE, 'scripts', 'docs'])
    if (a.status !== 0) { D.push(`git archive ${REFERENCE} : ${court(a.stderr, 100)}`); return }
    const x = spawnSync('tar', ['-xf', nomTar], { cwd: refDossier, encoding: 'utf8', windowsHide: true })
    fs.rmSync(tar, { force: true })
    if (x.status !== 0 || !existe(path.join(refDossier, 'scripts'))) D.push(`extraction de la référence impossible (tar en code ${x.status}${x.error ? `, ${x.error.code}` : ''}) : ${court(x.stderr, 100)}`)
    return `arbre de référence ${REFERENCE} (ancêtre de HEAD, sans aucun des ${Object.keys(FICHIERS).length} fichiers jugés) extrait sous ${rel(refDossier)}`
  })
  for (const [groupe, attendu, c] of [['coffre', 'CF-1', 'PE-2'], ['socle', 'SO-1', 'PE-3'], ['surveillance', 'SV-1', 'PE-4']]) {
    await juger(R, c, async (D) => {
      if (!refDossier) { D.push('pas d\'arbre de référence (PE-1)'); return }
      const r = await lancer(process.execPath, [fileURLToPath(import.meta.url), `--groupe=${groupe}`, `--racine=${refDossier}`], { cwd: DEPOT, env: { ...process.env }, delaiMs: 300_000 })
      const premier = lf(r.sortie).split('\n').find((l) => /^FAIL /.test(l)) || ''
      const crit = (/^FAIL (\S+)/.exec(premier) || [])[1]
      pe.push({ groupe, attendu, code: r.code, premier, crit })
      if (r.code === 0) D.push(`--groupe=${groupe} sur la référence : code 0 (un échec attendu)`)
      if (r.code !== 1) D.push(`--groupe=${groupe} sur la référence : code ${r.code} (1 attendu) — ${court(r.erreur, 120)}`)
      if (crit !== attendu) D.push(`--groupe=${groupe} : premier échec ${crit || 'aucun'} (${attendu} attendu)`)
      if (pile(r.erreur) || /exception du juge/.test(r.sortie)) D.push(`--groupe=${groupe} : le juge plante (${court(r.erreur || r.sortie, 120)})`)
      return `--groupe=${groupe} sur la référence : code ${r.code}, premier échec « ${court(premier, 140)} »`
    })
  }
  await juger(R, 'PE-5', async (D) => {
    const f = path.join(PREUVES, 'echecs-attendus.md')
    const L = [
      '# Échecs attendus du juge du socle de l\'usine (026-048)', '',
      `Écrit par \`node scripts/usine-socle-qa.mjs --preuve-echecs\` le ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}. Chaque groupe est lancé par le juge lui-même sur l'arbre de référence \`${REFERENCE}\` (extrait par \`git archive\`, ancêtre de HEAD, où aucun fichier jugé n'existe), avec \`--racine\`. L'extrait est la première ligne \`FAIL\` de la sortie, recopiée telle quelle (seul \`|\` est échappé).`, '',
      '## Autotest des jeux d\'essai', '', '| Critère | Verdict | Ce qui est vérifié |', '|---|---|---|',
      ...at.map((x) => `| ${x.c} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.m).replace(/\|/g, '\\|')} |`), '',
      '## Groupes sur l\'arbre de référence', '', '| Groupe | Fiche jugée | Critère attendu en premier | Code | Premier échec réel |', '|---|---|---|---|---|',
      ...pe.map((x) => `| ${x.groupe} | ${x.groupe === 'surveillance' ? '026-053' : '026-050'} | ${x.attendu} | ${x.code} | ${x.premier.replace(/\|/g, '\\|')} |`), '',
    ]
    fs.mkdirSync(PREUVES, { recursive: true })
    fs.writeFileSync(f, `${L.join('\n')}\n`)
    const relu = lireSi(f)
    if (!relu || fs.statSync(f).size === 0) { D.push('echecs-attendus.md de 0 octet'); return }
    for (const x of pe) if (!x.premier || !relu.includes(x.premier.replace(/\|/g, '\\|'))) D.push(`l'extrait du groupe ${x.groupe} n'est pas dans echecs-attendus.md`)
    if (pe.length !== 3) D.push(`${pe.length} groupe(s) jugé(s) sur la référence (3 attendus)`)
    return `${rel(f)} écrit (${fs.statSync(f).size} octets), relu : trois groupes et ${at.length} critères d'autotest`
  })
  return R
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function principal() {
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const groupesDemandes = typeof opt('groupe') === 'string' ? opt('groupe').split(',').map((x) => x.trim()).filter(Boolean) : null
  if (groupesDemandes) for (const g of groupesDemandes) if (!GROUPES.includes(g)) { console.error(`✗ ${NOM} : groupe inconnu « ${g} » (${GROUPES.join(', ')})`); process.exit(2) }
  let R
  let titre
  if (opt('reel')) {
    const g = groupesDemandes || ['socle', 'surveillance']
    if (g.includes('coffre')) { console.error(`✗ ${NOM} --reel : le groupe coffre se juge sur jeux d'essai (--reel : socle, surveillance)`); process.exit(2) }
    titre = `--reel --groupe=${g.join(',')}`
    console.log(`${NOM} ${titre}`)
    R = await reel(g)
  } else if (opt('preuve-echecs')) {
    titre = '--preuve-echecs'
    console.log(`${NOM} ${titre} — jeux d'essai : ${rel(FIX)}`)
    if (!trouverBash()) { console.error(`✗ ${NOM} : bash introuvable`); process.exit(2) }
    R = await preuveEchecs()
  } else {
    const g = GROUPES.filter((x) => (groupesDemandes || GROUPES).includes(x))
    titre = `--groupe=${g.join(',')}${RACINE !== DEPOT ? ` --racine=${versSlash(RACINE)}` : ''}`
    console.log(`${NOM} ${titre}`)
    if ((g.includes('coffre') || g.includes('socle')) && !trouverBash()) { console.error(`✗ ${NOM} : bash introuvable (ni dans le PATH, ni C:/Program Files/Git/bin/bash.exe)`); process.exit(2) }
    R = new Rapport(titre)
    if (g.includes('coffre')) await groupeCoffre(R)
    if (g.includes('socle')) await groupeSocle(R)
    if (g.includes('surveillance')) await groupeSurveillance(R)
  }
  const rouges = R.rouges
  console.log(`${NOM} ${titre} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'PASS'}`)
  process.exit(rouges.length ? 1 : 0)
}
principal().catch((e) => { console.error(`FAIL ${NOM} — exception : ${e && e.stack ? e.stack : e}`); process.exit(1) })
