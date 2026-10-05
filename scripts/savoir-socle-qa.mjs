#!/usr/bin/env node
// scripts/savoir-socle-qa.mjs — le juge du socle du savoir (fiche 026-229, écrit par Claude Code, JAMAIS par
// l'exécutant qui produira l'export, l'envoi, la réception et l'index : 026-230 et 026-231).
//
// Usage :
//   node scripts/savoir-socle-qa.mjs [--partie=export,envoi,reception,index,unites] [--racine=<copie>]
//        SVS-1 (contrat) et SVS-12 (hygiène) toujours, plus les SVS des parties choisies (toutes par défaut).
//        --racine juge une copie (témoin, sabotage) ; par défaut, le dépôt.
//   node scripts/savoir-socle-qa.mjs --temoin          copie le témoin sous .orchestre/travail/ et le juge : rend 0.
//   node scripts/savoir-socle-qa.mjs --preuve-echecs   le `verifier` de 026-229 : (a) le dépôt échoue, SVS-2 en premier ;
//        (b) le témoin est vert ; (c) chaque sabotage de sabotages.json fait échouer SON critère ; (d) SVS-1 est vert sur
//        le dépôt. Écrit .orchestre/preuves/026-229/echecs-attendus.md avec les extraits réels.
//   node scripts/savoir-socle-qa.mjs --reel            SVS-R1 à SVS-R4 : la mise en service (026-241), sur le poste, l'usine
//        lue par ssh sans rien y écrire ; sans clé ou usine injoignable → code 2 « usine injoignable ».
// Codes : 0 tout vert ; 1 un critère en échec ; 2 préalable manquant (argument inconnu, outil absent, usine injoignable).
// Tout se passe sous .orchestre/travail/savoir-socle-qa/ (effacé en fin de passage, sauf SAVOIR_SOCLE_QA_GARDER=1).
// Aucun appel réseau hors 127.0.0.1 (espion-reseau bloque le reste), aucune lecture de .env.local ni de presti-secrets,
// aucun vrai secret : la fausse clé est assemblée à l'exécution, jamais écrite d'un bloc dans un fichier suivi.
//
// ── Le contrat que ce juge fait respecter (026-230 et 026-231 le réalisent ; le témoin le réalise déjà) ──────────────
// EXPORT  node scripts/savoir/exporter.mjs --sources=<sources.json> --sortie=<dossier> [--a-sec]
//   Parcours de chaque racine (ordre de `racines`), sans jamais suivre un lien. Pour chaque entrée, dans l'ordre :
//   1. `exclusions` (motif `**/…` pour toutes les racines, `racine:glob` pour une seule ; un motif vaut pour le chemin et
//      pour chacun de ses dossiers) : un dossier exclu n'est JAMAIS listé, un fichier exclu JAMAIS ouvert ; chaque entrée
//      écartée compte 1 dans `exclus`. Racine `memoire` : un fichier (hors MEMORY.md) dont le NOM répond à
//      `exclusions_memoire.regex` compte dans `exclus_memoire`, jamais ouvert.
//   2. classe : `prospects` si un motif de `prospects` répond (chemin ou dossier) ; sinon la PREMIÈRE ligne de `sources`
//      qui répond au chemin entier ; sinon `hors_liste` (compté, jamais ouvert, jamais nommé nulle part).
//   3. format hors `formats` → `format_non_lu` ; taille (lstat) au-delà de `plafonds.octets_par_fichier` → `trop_gros` :
//      inscrits dans `non_lus` du manifeste de leur compartiment `{ racine, chemin, raison }`, jamais ouverts.
//   4. lecture ; un motif `MOTIFS_SECRETS` (scripts/instantane-quotidien.mjs) → fichier écarté entier, rapport
//      `secrets: [{ racine, chemin, motifs }]`, la valeur nulle part. MEMORY.md de `memoire` : ses lignes qui répondent à
//      la regex sont retirées (`lignes_memoire_retirees`).
//   5. public/interne : `caviardage.regles` dans l'ordre (siren retenu seulement si Luhn) ; `reclassement.coordonnees_min`
//      remplacements ou plus sur le texte brut → compartiment prospects, `classe: "prospects"`, `reclasse: true`, texte
//      brut ; sinon texte caviardé, `caviardages: n`. Prospects : octets d'origine, `caviardages: 0`.
//   Sortie : <sortie>/{general,prospects}/manifeste.json + <sortie>/{general,prospects}/fichiers/<racine>/<chemin>
//   + <sortie>/rapport.json. Manifeste : `{ version: 1, compartiment, exporte_le, fichiers: [{ racine, chemin, classe,
//   sha256, octets, caviardages, reclasse }], non_lus: [...] }` (+ `prospects_compte` dans general : un nombre, aucun
//   chemin prospects) ; sha256 et octets du fichier EXPORTÉ. Rapport : `{ version, exporte_le, compteurs: { general,
//   prospects, reclasses, hors_liste, exclus, exclus_memoire, lignes_memoire_retirees, format_non_lu, trop_gros, secrets,
//   caviardages, autres }, secrets: [...] }`. Écriture dans <sortie>.part puis renommage vers <sortie>. Plafonds
//   `fichiers`/`octets_total` dépassés → code 1, rien d'écrit. --sortie dans une racine de --sources ou dans le dépôt qui
//   porte le script (traité comme la racine `presti`), ou qui en contient une → code 2, rien d'écrit — sauf si son chemin
//   répond à une exclusion de cette racine (ops:savoir/** : la sortie de synchroniser.mjs ; presti:.orchestre/travail/**).
//   --a-sec : tout le calcul, aucune écriture, code 0.
// ENVOI   node scripts/savoir/envoyer.mjs --export=<dossier> [--reglages=<reglages.json>] [--a-sec]
//   `interrupteurs.envoi.actif` faux → « envoi éteint », code 0, aucun appel. Sinon, deux appels à PRESTI_SSH_BIN (ssh
//   par défaut), general puis prospects : `-i <home>/.ssh/presti-usine -o BatchMode=yes [-o ConnectTimeout=N…]
//   <PRESTI_USINE|usine@88.96.53.3> "umask 007 && cat > /srv/presti-savoir/depot/<c>-<AAAAMMJJTHHMMSSZ>.tar.part && mv
//   …/<c>-<h>.tar.part …/<c>-<h>.tar && touch …/<c>-<h>.pret"`, l'entrée standard = une archive ustar de
//   <export>/<c>/ (manifeste.json, fichiers/…), en-têtes pax `x` permis pour `path` seul. Après les deux :
//   <export>/envoi.json ; retiré avant d'envoyer, jamais écrit si ssh échoue (code 5). --a-sec : aucun appel.
//   synchroniser.mjs [--sources=] [--reglages=] : exporte vers <racine ops>/savoir/export puis envoie.
// RÉCEPTION  node scripts/usine/savoir-recevoir.mjs --depot=<dossier> [--racine-travail=/home/agents/travail/savoir]
//   Chaque <c>-<h>.pret (c = general|prospects) et son <c>-<h>.tar, vus par lstat (un lien est refusé) : archive ustar
//   validée ENTIÈRE avant toute écriture (fichiers réguliers seulement ; chemins relatifs sans `..`, sans `\`, sans `:`,
//   `manifeste.json` ou `fichiers/…` ; 20 000 fichiers et 100 Mo déclarés au plus ; pax path/mtime/atime/ctime
//   seulement ; manifeste du bon compartiment, empreintes et tailles exactes ; aucune classe prospects dans general).
//   Saine : <rt>/<c>/courant remplacé par renommage, l'ancien en <rt>/<c>/precedent, <rt>/a-indexer écrit. Refusée :
//   code 1, rien d'écrit sauf le journal. Dans les deux cas : archive et .pret retirés, une ligne sans contenu au
//   journal <rt>/journal.jsonl.
// INDEX   lib/savoir/index.ts : CLASSES, normaliser, decouper, construireIndex, chercherIndex, caviarder,
//   fusionnerScores (formes exactes : questions.json). Indexeur : node --experimental-strip-types --import
//   ./scripts/ts-loader.mjs scripts/savoir/indexer.mjs --compartiment=tous [--racine-travail=] [--reglages=] →
//   <rt>/index/<c>/ (etat.json { compartiment, fichiers, passages, manifeste_sha256, synchronise_le, indexe_le,
//   semantique, vecteurs } + l'index), ligne `savoir index` sans contenu au journal du chef <rt>/../chef/cycles.jsonl (ce que
//   lit `presti-journal chef`, SVS-R2) et à <rt>/journal.jsonl, a-indexer retiré. Vecteurs : general seulement,
//   `semantique` allumé, url 127.0.0.1/localhost, modèle sans :cloud/-cloud, POST <url>/api/embed par lots de 16 au plus,
//   rien de renvoyé pour un passage déjà vectorisé ; sinon `semantique: "refusee"` et aucune connexion.
// UNITÉS  scripts/usine/systemd/presti-chef-savoir-{recevoir,index}.{service,path} (SVS-11).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const NOM = 'savoir-socle-qa'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const FIX = path.join(ICI, 'fixtures', '026', 'savoir', 'socle')
const TEMOIN_SRC = path.join(FIX, 'temoin')
const SABOTAGES_SRC = path.join(FIX, 'sabotages.json')
const RACINES_SRC = path.join(FIX, 'racines')
const SOURCES_ESSAI_SRC = path.join(FIX, 'sources-essai.json')
const ATTENDU_SRC = path.join(FIX, 'attendu-export.json')
const QUESTIONS_SRC = path.join(FIX, 'questions.json')
const ESPION_FS = path.join(FIX, 'espion-fs.mjs')
const ESPION_RESEAU = path.join(FIX, 'espion-reseau.mjs')
const FAUX_SSH = path.join(FIX, 'faux-ssh.mjs')
const FAUX_OLLAMA = path.join(FIX, 'faux-ollama.mjs')
const TS_LOADER = path.join(DEPOT, 'scripts', 'ts-loader.mjs')
const TSC = path.join(DEPOT, 'node_modules', 'typescript', 'bin', 'tsc')
const QUOTIDIEN = path.join(DEPOT, 'scripts', 'instantane-quotidien.mjs')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', NOM)
const ESSAIS = path.join(TRAVAIL, 'essais')
const PREUVES = path.join(DEPOT, '.orchestre', 'preuves', '026-229')
const MAJ_SH = path.join(DEPOT, 'reprise-cloud', 'maj.sh')
const WIN = process.platform === 'win32'
const SENTINELLE = 'SENTINELLE-PROSPECT-SAVOIR'
const HOTE_ESSAI = 'usine@usine-essai.invalid'
const DEPOT_DISTANT = '/srv/presti-savoir/depot'
const MODELE_ESSAI = 'nomic-embed-text'

const GROUPES = ['export', 'envoi', 'reception', 'index', 'unites']
const SVS_DE_GROUPE = {
  export: ['SVS-2', 'SVS-3', 'SVS-4', 'SVS-5', 'SVS-6'],
  envoi: ['SVS-7'],
  reception: ['SVS-8'],
  index: ['SVS-9', 'SVS-10'],
  unites: ['SVS-11'],
}
const GROUPE_DE_SVS = Object.fromEntries(Object.entries(SVS_DE_GROUPE).flatMap(([g, ids]) => ids.map((id) => [id, g])))
const PREMIER_ECHEC_ATTENDU = 'SVS-2'
const CHEMINS = {
  exporter: 'scripts/savoir/exporter.mjs',
  envoyer: 'scripts/savoir/envoyer.mjs',
  synchroniser: 'scripts/savoir/synchroniser.mjs',
  recevoir: 'scripts/usine/savoir-recevoir.mjs',
  index: 'lib/savoir/index.ts',
  indexer: 'scripts/savoir/indexer.mjs',
  systemd: 'scripts/usine/systemd',
}
// Les champs de sources.json qui gouvernent l'export : sources-essai.json doit les reprendre à l'identique.
const CHAMPS_EXPORT = ['formats', 'exclusions', 'exclusions_memoire', 'prospects', 'sources', 'reclassement', 'caviardage', 'plafonds']

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const lireJSON = (p) => JSON.parse(lire(p))
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
const memeEnsemble = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])
const rel = (p) => path.relative(DEPOT, p).split(path.sep).join('/')
const posix = (p) => p.split(path.sep).join('/')
const cle = (p) => { const r = path.resolve(String(p)); return WIN ? r.toLowerCase() : r }
const dans = (parent, enfant) => { const r = path.relative(cle(parent), cle(enfant)); return r === '' || (!!r && !r.startsWith('..') && !path.isAbsolute(r)) }
const court = (s, n = 240) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const nettoyer = (p) => fs.rmSync(p, { recursive: true, force: true, maxRetries: 3 })
function ecrire(p, contenu) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, contenu) }
function lireJournal(f) {
  if (!existe(f)) return []
  return lire(f).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { illisible: l } } })
}
const attendre = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
/** Tous les fichiers d'un dossier, chemins relatifs posix, sans suivre de lien. */
function listerFichiers(dossier) {
  const out = []
  const rec = (d, r) => {
    let entrees
    try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entrees) {
      const rr = r ? `${r}/${e.name}` : e.name
      if (e.isDirectory()) rec(path.join(d, e.name), rr)
      else out.push(rr)
    }
  }
  rec(dossier, '')
  return out.sort()
}
/** Empreinte d'un arbre (lstat, jamais un lien suivi) : Map chemin → description. */
function arbre(dossier, exclure = () => false) {
  const m = new Map()
  const rec = (d, r) => {
    let entrees
    try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entrees) {
      const rr = r ? `${r}/${e.name}` : e.name
      if (exclure(rr)) continue
      const p = path.join(d, e.name)
      const st = fs.lstatSync(p)
      if (st.isSymbolicLink()) m.set(rr, `lien:${fs.readlinkSync(p)}`)
      else if (st.isDirectory()) { m.set(rr, 'dossier'); rec(p, rr) }
      else m.set(rr, `fichier:${st.size}:${sha256(fs.readFileSync(p))}`)
    }
  }
  rec(dossier, '')
  return m
}
function ecartsArbre(avant, apres) {
  const e = []
  for (const [k, v] of apres) if (!avant.has(k)) e.push(`apparu : ${k}`); else if (avant.get(k) !== v) e.push(`changé : ${k}`)
  for (const k of avant.keys()) if (!apres.has(k)) e.push(`disparu : ${k}`)
  return e
}
function res(id, detail) { return { id, ok: detail.length === 0, detail } }
/** L'expression EXCL de reprise-cloud/maj.sh, telle quelle (single-quoted bash). */
function litExcl() {
  const m = /^EXCL='([^']*)'/m.exec(lire(MAJ_SH))
  if (!m) throw new Error(`EXCL introuvable dans ${rel(MAJ_SH)}`)
  return m[1]
}
function luhn(chiffres) {
  let t = 0
  for (let i = 0; i < chiffres.length; i++) { let d = Number(chiffres[chiffres.length - 1 - i]); if (i % 2) { d *= 2; if (d > 9) d -= 9 } t += d }
  return chiffres.length > 0 && t % 10 === 0
}
/** Le caviardage du JUGE, écrit ici d'après les règles de sources-essai.json (jamais repris du script jugé). */
function caviarderJuge(contrat, texte) {
  let n = 0
  let t = texte
  for (const r of contrat.caviardage.regles) {
    t = t.replace(new RegExp(r.regex, r.flags || 'g'), (m) => {
      if (r.luhn && !luhn(m.replace(/\D/g, ''))) return m
      n++
      return r.remplace_par
    })
  }
  return { texte: t, n }
}

// ── doublures ssh : un lanceur .exe sous Windows (un spawn sans shell ne lance ni un .mjs ni un .cmd) ─────────────────
const LANCEUR_CS = `using System; using System.Diagnostics; using System.IO; using System.Text; using System.Threading;
// Lanceur des doublures du juge savoir-socle-qa (026-229) : relaie argv, entrée et sorties vers « node <script> », lus
// dans <exe>.cible (ligne 1 : node ; ligne 2 : script ; puis NOM=valeur ajoutés à l'environnement).
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
      psi.EnvironmentVariables[c[i].Substring(0, k)] = c[i].Substring(k + 1);
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
  if (!csc) { console.error(`✗ ${NOM} : compilateur csc introuvable : la doublure ssh.exe ne peut pas être fabriquée`); process.exit(2) }
  const r = spawnSync(csc, ['/nologo', '/target:exe', '/optimize+', `/out:${exe}`, cs], { encoding: 'utf8', windowsHide: true })
  if (r.status !== 0 || !existe(exe)) { console.error(`✗ ${NOM} : compilation du lanceur impossible : ${court(`${r.stdout}${r.stderr}`, 300)}`); process.exit(2) }
  return (lanceurExe = exe)
}
function poserDouble(dossier, nom, script, envAjout = {}) {
  fs.mkdirSync(dossier, { recursive: true })
  if (WIN) {
    const exe = path.join(dossier, `${nom}.exe`)
    if (!existe(exe) || fs.statSync(exe).size !== fs.statSync(lanceur()).size) fs.copyFileSync(lanceur(), exe)
    fs.writeFileSync(`${exe}.cible`, `${[process.execPath, script, ...Object.entries(envAjout).map(([k, v]) => `${k}=${v}`)].join('\n')}\n`)
    return exe
  }
  const f = path.join(dossier, nom)
  fs.writeFileSync(f, `#!/bin/sh\n${Object.entries(envAjout).map(([k, v]) => `export ${k}=${shq(v)}`).join('\n')}\nexec ${shq(process.execPath)} ${shq(script)} "$@"\n`)
  fs.chmodSync(f, 0o755)
  return f
}
let DOUBLES = null
function doublures() {
  if (DOUBLES) return DOUBLES
  const d = path.join(TRAVAIL, 'doublures')
  DOUBLES = { sshBin: poserDouble(path.join(d, 'bin-ssh'), 'ssh', FAUX_SSH, { FAUX_SSH_VIA: 'PRESTI_SSH_BIN' }), dirPath: path.join(d, 'bin-path') }
  // En tête du PATH de chaque enfant : un ssh ou un scp qui ne passent pas par PRESTI_SSH_BIN sont consignés, jamais réels.
  poserDouble(DOUBLES.dirPath, 'ssh', FAUX_SSH, { FAUX_SSH_VIA: 'ssh-du-PATH' })
  poserDouble(DOUBLES.dirPath, 'scp', FAUX_SSH, { FAUX_SSH_VIA: 'scp' })
  return DOUBLES
}
let ENV_BASE = null
function envBase() {
  if (ENV_BASE) return ENV_BASE
  const env = { ...process.env }
  for (const k of Object.keys(env)) if (/^(PRESTI_SSH_BIN|PRESTI_USINE|SAVOIR_ESPION_FS|SAVOIR_ESPION_RESEAU|FAUX_SSH_JOURNAL|FAUX_SSH_MODE|FAUX_OLLAMA_JOURNAL|NODE_OPTIONS)$/i.test(k)) delete env[k]
  const clePath = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH'
  env[clePath] = `${doublures().dirPath}${path.delimiter}${env[clePath] || ''}`
  // Un ssh du PATH consigne ici : il n'est jamais censé servir.
  env.FAUX_SSH_JOURNAL = path.join(TRAVAIL, 'ssh-inattendu')
  return (ENV_BASE = env)
}
/** Lance `node <args>` (jamais un shell), sortie en octets, délai borné. */
function noeud(args, { cwd = DEPOT, env = {}, input, timeout = 240000 } = {}) {
  const r = spawnSync(process.execPath, args, { cwd, env: { ...envBase(), ...env }, input, timeout, maxBuffer: 512 * 1024 * 1024, windowsHide: true })
  const sortie = r.stdout ? r.stdout.toString('utf8') : ''
  const erreur = r.stderr ? r.stderr.toString('utf8') : ''
  const delai = r.error?.code === 'ETIMEDOUT'
  return { code: delai ? 124 : (r.status ?? (r.error ? 127 : 1)), sortie, erreur, tout: `${sortie}\n${erreur}`, delai }
}
const importer = (p) => ['--import', pathToFileURL(p).href]
function lireAppelsSsh(dossier) {
  if (!existe(dossier)) return []
  return fs.readdirSync(dossier).filter((f) => f.endsWith('.argv.json')).sort().map((f) => {
    const base = path.join(dossier, f.slice(0, -'.argv.json'.length))
    const a = JSON.parse(lire(`${base}.argv.json`))
    return { ...a, stdin: existe(`${base}.stdin`) ? fs.readFileSync(`${base}.stdin`) : Buffer.alloc(0) }
  })
}

// ── ustar : l'écrivain et le lecteur du JUGE (jamais ceux du script jugé) ─────────────────────────────────────────────
function champOctal(b, off, len, v) { b.write(`${v.toString(8).padStart(len - 1, '0')}\u0000`, off, len, 'latin1') }
function tarEntete({ nom, taille, type = '0', lien = '' }) {
  const b = Buffer.alloc(512)
  Buffer.from(nom, 'utf8').copy(b, 0, 0, 100)
  champOctal(b, 100, 8, 0o644); champOctal(b, 108, 8, 0); champOctal(b, 116, 8, 0); champOctal(b, 124, 12, taille); champOctal(b, 136, 12, 1790000000)
  b.write(type, 156, 1, 'latin1')
  Buffer.from(lien, 'utf8').copy(b, 157, 0, 100)
  b.write('ustar\u0000', 257, 6, 'latin1'); b.write('00', 263, 2, 'latin1')
  b.fill(0x20, 148, 156)
  let s = 0
  for (const x of b) s += x
  b.write(`${s.toString(8).padStart(6, '0')}\u0000 `, 148, 8, 'latin1')
  return b
}
function paxDonnees(cles) {
  return Buffer.concat(Object.entries(cles).map(([k, v]) => {
    const corps = ` ${k}=${v}\n`
    const n = Buffer.byteLength(corps)
    let L = n + String(n).length
    if (String(L).length !== String(n).length) L = n + String(L).length
    return Buffer.from(`${L}${corps}`)
  }))
}
const bourrage = (n) => Buffer.alloc((512 - (n % 512)) % 512)
/** entrees : [{ nom, donnees?, type?, lien?, pax?, tailleDeclaree?, tronquee? }] */
function ecrireTar(entrees) {
  const blocs = []
  for (const e of entrees) {
    const donnees = e.donnees || Buffer.alloc(0)
    const pax = { ...(e.pax || {}) }
    const long = Buffer.byteLength(e.nom) > 100 || /[^\x20-\x7e]/.test(e.nom)
    if (long) pax.path = e.nom
    if (Object.keys(pax).length) { const d = paxDonnees(pax); blocs.push(tarEntete({ nom: 'PaxHeaders/entree', taille: d.length, type: 'x' }), d, bourrage(d.length)) }
    blocs.push(tarEntete({ nom: long ? 'fichiers/pax' : e.nom, taille: e.tailleDeclaree ?? donnees.length, type: e.type || '0', lien: e.lien || '' }))
    if (e.tronquee) return Buffer.concat(blocs)
    blocs.push(donnees, bourrage(donnees.length))
  }
  blocs.push(Buffer.alloc(1024))
  return Buffer.concat(blocs)
}
function lirePax(d) {
  const cles = {}
  let i = 0
  while (i < d.length) {
    const esp = d.indexOf(0x20, i)
    const L = esp < 0 ? NaN : Number(d.subarray(i, esp).toString('latin1'))
    if (!Number.isInteger(L) || L <= esp - i + 1 || i + L > d.length) throw new Error('enregistrement pax illisible')
    const rec = d.subarray(esp + 1, i + L).toString('utf8')
    const kv = rec.endsWith('\n') ? rec.slice(0, -1) : rec
    const eg = kv.indexOf('=')
    if (eg <= 0) throw new Error('enregistrement pax sans clé')
    cles[kv.slice(0, eg)] = kv.slice(eg + 1)
    i += L
  }
  return cles
}
/** Lecteur strict : ustar POSIX, fichiers réguliers, pax `path` seul ; lève une erreur sinon. */
function lireTar(buf) {
  const entrees = []
  let pax = null
  let off = 0
  let fin = false
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512)
    if (h.every((x) => x === 0)) { fin = true; break }
    let somme = 0
    for (let i = 0; i < 512; i++) somme += i >= 148 && i < 156 ? 32 : h[i]
    const lu = parseInt(h.subarray(148, 156).toString('latin1').replace(/[\0 ]+/g, ''), 8)
    if (somme !== lu) throw new Error(`somme de contrôle fausse à l'octet ${off}`)
    if (h.subarray(257, 263).toString('latin1') !== 'ustar\u0000' || h.subarray(263, 265).toString('latin1') !== '00') throw new Error('en-tête sans la marque ustar POSIX')
    const type = h[156] === 0 ? '0' : String.fromCharCode(h[156])
    const taille = parseInt(h.subarray(124, 136).toString('latin1').replace(/[\0 ]+/g, '') || '0', 8)
    const d0 = off + 512
    if (d0 + taille > buf.length) throw new Error('archive tronquée')
    const donnees = buf.subarray(d0, d0 + taille)
    off = d0 + Math.ceil(taille / 512) * 512
    if (type === 'x') { pax = lirePax(donnees); for (const k of Object.keys(pax)) if (k !== 'path') throw new Error(`clé pax « ${k} » (seule path est permise)`); continue }
    if (type !== '0') throw new Error(`entrée de type « ${type} » (fichiers réguliers seulement)`)
    const champ = (a, n) => { const s = h.subarray(a, a + n); const z = s.indexOf(0); return (z < 0 ? s : s.subarray(0, z)).toString('utf8') }
    const prefixe = champ(345, 155)
    entrees.push({ nom: pax?.path ?? (prefixe ? `${prefixe}/${champ(0, 100)}` : champ(0, 100)), donnees: Buffer.from(donnees) })
    pax = null
  }
  if (!fin) throw new Error('fin d’archive (blocs nuls) absente')
  return entrees
}

// ── SVS-1 : contrat ──────────────────────────────────────────────────────────────────────────────────────────────
const RACINES_ATTENDUES = {
  saas: 'C:/Users/benja/Documents/SaaS',
  presti: 'C:/Users/benja/Documents/presti',
  memoire: 'C:/Users/benja/.claude/projects/C--Users-benja-Documents-ofm/memory',
  ops: 'C:/Users/benja/Documents/presti-ops',
}
const FORMATS_ATTENDUS = ['.md', '.txt', '.json', '.jsonl', '.csv', '.log', '.yaml', '.yml']
const EXCLUSIONS_OBLIGATOIRES = [
  '**/presti-secrets/**', '**/.env', '**/.env.*', '**/*.key', '**/*.pem', '**/*.p12', '**/*.pfx',
  '**/id_rsa*', '**/id_ed25519*', '**/known_hosts', '**/auth.json', '**/.codex/**', '**/*credential*',
  '**/*secret*', '**/*token*', '**/.git/**', '**/node_modules/**', '**/.venv/**', '**/.obsidian/**',
  '**/*.lock', '**/*.pid', 'saas:Fondateurs/**', 'saas:Legal/_to_delete/**', 'presti:.orchestre/travail/**',
  'presti:reprise-cloud/memoire/**', 'ops:scraper/**', 'ops:usine/codex/**', 'ops:usine/cloud-init.yaml',
  'ops:usine/*.log', 'ops:savoir/**',
]
const PROSPECTS_ATTENDUS = [
  'saas:Prospection/emails-artisans/**', 'saas:Prospection/deja-contactes-*', 'saas:Prospection/corbeille-gmail*',
  'saas:Prospection/cibles-instagram-*', 'saas:Prospection/Lot-*', 'saas:Prospection/FB-10-*',
  'saas:Prospection/Email-artisans*', 'saas:Legal/**', 'presti:plans/demarchage-linkedin*',
  'presti:plans/repondre-aux-artisans*', 'presti:plans/publications-lancement*', 'presti:plans/journal-publications*',
  'ops:prospection/**',
]
// 28/09, relecture : moteurs autorisés par classe — interne ne va JAMAIS à un moteur gratuit.
const MOTEURS_PUBLIC_ATTENDU = 'tout, gratuit compris'
const MOTEURS_INTERNE_ATTENDU = ['codex', 'ollama_local', 'claude']
const MOTEURS_INTERNE_INTERDITS = ['freellmapi', 'ollama_cloud', 'groq']
const INTERRUPTEURS_ATTENDUS = ['envoi', 'semantique', 'recherche_web', 'perplexity', 'lecons_dans_consignes', 'bilan_quotidien']

function verifierMoteursInterne(liste, f) {
  if (!Array.isArray(liste)) { f.push('moteurs.interne : pas une liste'); return }
  if (!memeEnsemble(liste, MOTEURS_INTERNE_ATTENDU)) f.push(`moteurs.interne : ${JSON.stringify(liste)} (attendu exactement ${JSON.stringify(MOTEURS_INTERNE_ATTENDU)})`)
  for (const m of liste) {
    const s = String(m).toLowerCase()
    if (MOTEURS_INTERNE_INTERDITS.includes(s) || /(:|-)cloud$/.test(s)) f.push(`moteurs.interne cite un moteur gratuit interdit pour interne : « ${m} » (28/09, relecture : interne jamais vers un moteur gratuit)`)
  }
}

function svs1(ctx) {
  const racine = ctx.racine
  const f = []
  const pSources = path.join(racine, 'docs', 'savoir', 'sources.json')
  const pReglages = path.join(racine, 'docs', 'savoir', 'reglages.json')
  if (!existe(pSources)) return res('SVS-1', [`absent : ${path.relative(racine, pSources)}`])
  if (!existe(pReglages)) return res('SVS-1', [`absent : ${path.relative(racine, pReglages)}`])
  let s
  let r
  try { s = lireJSON(pSources) } catch (e) { return res('SVS-1', [`sources.json illisible : ${e.message}`]) }
  try { r = lireJSON(pReglages) } catch (e) { return res('SVS-1', [`reglages.json illisible : ${e.message}`]) }

  if (s.version !== 1) f.push(`version : ${s.version} (attendu 1)`)
  if (JSON.stringify(s.racines) !== JSON.stringify(RACINES_ATTENDUES)) f.push(`racines : ${JSON.stringify(s.racines)} (attendu ${JSON.stringify(RACINES_ATTENDUES)})`)
  if (!memeEnsemble(s.formats, FORMATS_ATTENDUS)) f.push(`formats : ${JSON.stringify(s.formats)} (attendu ${JSON.stringify(FORMATS_ATTENDUS)})`)
  const exclusions = Array.isArray(s.exclusions) ? s.exclusions : []
  const exclManquantes = EXCLUSIONS_OBLIGATOIRES.filter((m) => !exclusions.includes(m))
  if (exclManquantes.length) f.push(`exclusions : motifs obligatoires manquants — ${exclManquantes.join(', ')}`)
  let excl
  try { excl = litExcl() } catch (e) { f.push(e.message) }
  if (excl !== undefined && s.exclusions_memoire?.regex !== excl) f.push(`exclusions_memoire.regex ne reprend pas EXCL de reprise-cloud/maj.sh à l'identique`)
  const prospects = Array.isArray(s.prospects) ? s.prospects : []
  const prospManquants = PROSPECTS_ATTENDUS.filter((m) => !prospects.includes(m))
  if (prospManquants.length) f.push(`prospects : motifs obligatoires manquants — ${prospManquants.join(', ')}`)
  for (const motif of prospects) if (String(motif).toLowerCase().includes('presti-secrets')) f.push(`prospects : motif sous presti-secrets — ${motif}`)
  const sources = Array.isArray(s.sources) ? s.sources : []
  if (!sources.length) f.push('sources : liste vide')
  for (const entree of sources) {
    if (!entree || typeof entree.motif !== 'string') { f.push(`sources : entrée sans motif — ${JSON.stringify(entree)}`); continue }
    if (!['public', 'interne'].includes(entree.classe)) f.push(`sources : classe invalide pour ${entree.motif} — ${entree.classe} (attendu public ou interne)`)
    if (entree.motif.toLowerCase().includes('presti-secrets')) f.push(`sources : motif sous presti-secrets — ${entree.motif}`)
  }
  if (typeof s.reclassement?.coordonnees_min !== 'number') f.push('reclassement.coordonnees_min manquant ou non numérique')
  if (!s.caviardage || !memeEnsemble(s.caviardage.classes, ['public', 'interne'])) f.push(`caviardage.classes : ${JSON.stringify(s.caviardage?.classes)} (attendu ["public","interne"])`)
  const types = (s.caviardage?.regles || []).map((x) => x.type)
  if (JSON.stringify(types) !== JSON.stringify(['adresse', 'numero', 'siren'])) f.push(`caviardage.regles : types ${JSON.stringify(types)} (attendu adresse, numero, siren dans cet ordre)`)
  for (const x of s.caviardage?.regles || []) { try { new RegExp(x.regex, x.flags || 'g') } catch (e) { f.push(`caviardage.regles.${x.type} : regex invalide — ${e.message}`) } }
  if (!(s.caviardage?.regles || []).find((x) => x.type === 'siren')?.luhn) f.push('caviardage.regles.siren : luhn: true attendu')
  if (!s.moteurs || s.moteurs.public !== MOTEURS_PUBLIC_ATTENDU) f.push(`moteurs.public : ${JSON.stringify(s.moteurs?.public)} (attendu ${JSON.stringify(MOTEURS_PUBLIC_ATTENDU)})`)
  verifierMoteursInterne(s.moteurs?.interne, f)
  for (const clef of ['octets_par_fichier', 'fichiers', 'octets_total']) if (typeof s.plafonds?.[clef] !== 'number') f.push(`plafonds.${clef} manquant ou non numérique`)

  const interrupteurs = r.interrupteurs || {}
  const clefsVues = Object.keys(interrupteurs)
  if (!memeEnsemble(clefsVues, INTERRUPTEURS_ATTENDUS)) f.push(`interrupteurs : clefs ${JSON.stringify(clefsVues)} (attendu ${JSON.stringify(INTERRUPTEURS_ATTENDUS)})`)
  for (const [nom, v] of Object.entries(interrupteurs)) {
    if (typeof v?.actif !== 'boolean') { f.push(`interrupteurs.${nom}.actif n'est pas un booléen`); continue }
    if (v.actif && (!v.depuis || !v.accord)) f.push(`interrupteurs.${nom} est actif sans depuis/accord`)
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(r.semantique?.url || '')) f.push(`reglages.semantique.url hors localhost : ${r.semantique?.url}`)
  return res('SVS-1', f)
}

// ── les racines factices (fabriquées par le juge : faux secret assemblé ici, binaires, fichiers dangereux) ────────────
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
function fabriques(cleFausse) {
  return {
    'saas/CLAUDE.md': '# Coffre (essai)\n\nRègles du coffre factice : une note par décision, des liens entre notes, jamais de coordonnées.\n',
    'saas/.claude/skills/coffre/SKILL.md': '---\nname: coffre-essai\ndescription: compétence factice du juge savoir-socle-qa\n---\n\nRanger une note dans le bon dossier du coffre.\n',
    'saas/.agents/rules/regle-essai.md': 'Règle factice du coffre : écrire en français, dates au format ISO.\n',
    'saas/Produit/presti-secrets/cle.txt': 'CONTENU-EXCLU-PRESTI-SECRETS\n',
    'saas/Produit/credentials-essai.md': 'CONTENU-EXCLU-CREDENTIALS\n',
    'saas/Produit/Deck-Investisseurs.docx': Buffer.concat([Buffer.from('504b0304', 'hex'), Buffer.from('CONTENU-NON-LU-DOCX')]),
    'saas/Recherche/Gros-Corpus.md': `CONTENU-TROP-GROS\n${'Remplissage du plafond par fichier, sans aucune coordonnée.\n'.repeat(36000)}`,
    'presti/CLAUDE.md': '# Dépôt (essai)\n\nRègles factices du dépôt : typecheck avant de livrer, jamais de secret dans le code.\n',
    'presti/AGENTS.md': '# Agents (essai)\n\nConsignes factices des exécutants : travailler dans le périmètre de la fiche.\n',
    'presti/.claude/agents/agent-essai.md': '---\nname: agent-essai\ndescription: agent factice du juge savoir-socle-qa\n---\n\nRelire une fiche avant de la produire.\n',
    'presti/.claude/skills/competence-essai/SKILL.md': '---\nname: competence-essai\ndescription: compétence factice du juge savoir-socle-qa\n---\n\nVérifier un déploiement après chaque push.\n',
    'presti/.claude/skills/competence-essai/notes.md': 'CONTENU-HORS-LISTE-SKILL-NOTES\n',
    'presti/.agents/rules/regle-essai.md': 'Règle factice du dépôt : une migration se teste à sec avant la vraie base.\n',
    'presti/.env.local': 'CONTENU-EXCLU-ENV-LOCAL=1\n',
    'presti/docs/.env.essai.json': '{ "marqueur": "CONTENU-EXCLU-ENV-ESSAI" }\n',
    'presti/docs/.codex/auth.json': '{ "marqueur": "CONTENU-EXCLU-CODEX-AUTH" }\n',
    'presti/docs/cles/id_ed25519.txt': 'CONTENU-EXCLU-ID-ED25519-TXT\n',
    'presti/docs/rotation-token-essai.md': 'CONTENU-EXCLU-TOKEN\n',
    'presti/docs/notes-integration.md': `# Notes d'intégration (essai)\n\nClé collée par erreur dans une note : ${cleFausse}\n`,
    'presti/docs/schema.png': Buffer.concat([PNG, Buffer.from('CONTENU-NON-LU-PNG')]),
    'presti/node_modules/paquet-essai/LISEZMOI.md': 'CONTENU-EXCLU-NODE-MODULES\n',
    'presti/.orchestre/preuves/026-000/verifier.log': '$ node scripts/essai-qa.mjs\n# code 0\n\nPASS ESS-1 — journal factice du juge\n',
    'presti/.orchestre/preuves/026-000/capture.png': Buffer.concat([PNG, Buffer.from('CONTENU-HORS-LISTE-CAPTURE')]),
    'ops/veille/id_ed25519': 'CONTENU-EXCLU-ID-ED25519\n',
    'ops/usine/moteur.log': 'CONTENU-EXCLU-MOTEUR-LOG\n',
  }
}
const MARQUES_INTERDITES = ['CONTENU-EXCLU-', 'CONTENU-HORS-LISTE-', 'CONTENU-NON-LU-', 'CONTENU-TROP-GROS']
function preparerRacines(ctx, nom) {
  const base = path.join(ctx.e, nom)
  const racines = path.join(base, 'racines')
  nettoyer(base)
  fs.cpSync(RACINES_SRC, racines, { recursive: true })
  // Fausse clé Anthropic : assemblée à l'exécution, jamais écrite d'un bloc dans un fichier suivi par git.
  const cleFausse = `${['sk', 'ant', 'api03'].join('-')}-sentinelle${crypto.randomBytes(16).toString('hex')}`
  for (const [r, contenu] of Object.entries(fabriques(cleFausse))) ecrire(path.join(racines, ...r.split('/')), contenu)
  const contrat = lireJSON(SOURCES_ESSAI_SRC)
  contrat.racines = Object.fromEntries(Object.entries(contrat.racines).map(([n, p]) => [n, posix(path.resolve(base, p))]))
  const sources = path.join(base, 'sources-essai.json')
  ecrire(sources, JSON.stringify(contrat, null, 2))
  const abs = (id) => { const [r, ...reste] = id.split(':'); return path.join(contrat.racines[r], ...reste.join(':').split('/')) }
  return { base, racines, sources, contrat, cleFausse, abs }
}

// ── SVS-2 à SVS-6 : l'export ─────────────────────────────────────────────────────────────────────────────────────
function exportPrincipal(ctx) {
  if (ctx.cache.export) return ctx.cache.export
  const exp = path.join(ctx.racine, CHEMINS.exporter)
  if (!existe(exp)) return (ctx.cache.export = { absent: `${CHEMINS.exporter} absent de la racine jugée (${rel(ctx.racine) || '.'})` })
  const R = preparerRacines(ctx, 'export')
  const sortie = path.join(R.base, 'sortie')
  const espion = path.join(R.base, 'espion-fs.jsonl')
  const r = noeud([...importer(ESPION_FS), exp, `--sources=${R.sources}`, `--sortie=${sortie}`], { cwd: ctx.racine, env: { SAVOIR_ESPION_FS: espion } })
  const X = { R, sortie, espion, r, journal: lireJournal(espion), attendu: lireJSON(ATTENDU_SRC) }
  X.lu = lireExport(sortie)
  return (ctx.cache.export = X)
}
function lireExport(sortie) {
  const E = { erreurs: [] }
  for (const c of ['general', 'prospects']) {
    const pm = path.join(sortie, c, 'manifeste.json')
    if (!existe(pm)) { E.erreurs.push(`${c}/manifeste.json absent de la sortie`); continue }
    const brut = fs.readFileSync(pm)
    if (!brut.length) { E.erreurs.push(`${c}/manifeste.json : 0 octet`); continue }
    try { E[c] = JSON.parse(brut.toString('utf8')) } catch (e) { E.erreurs.push(`${c}/manifeste.json illisible : ${e.message}`); continue }
    if (!Array.isArray(E[c].fichiers)) { E.erreurs.push(`${c}/manifeste.json : fichiers n'est pas une liste`); delete E[c]; continue }
    E[c].brut = brut.toString('utf8')
    E[c].disque = listerFichiers(path.join(sortie, c, 'fichiers'))
  }
  const pr = path.join(sortie, 'rapport.json')
  if (!existe(pr)) E.erreurs.push('rapport.json absent de la sortie')
  else { try { E.rapport = JSON.parse(lire(pr)); E.rapportBrut = lire(pr) } catch (e) { E.erreurs.push(`rapport.json illisible : ${e.message}`) } }
  return E
}
const idDe = (x) => `${x.racine}:${x.chemin}`
function prealableExport(ctx, id) {
  const X = exportPrincipal(ctx)
  if (X.absent) return { X, echec: res(id, [`${X.absent} — l'export n'est pas encore écrit`]) }
  if (X.r.code !== 0) return { X, echec: res(id, [`exporter : code ${X.r.code}${X.r.delai ? ' (délai dépassé)' : ''} — ${court(X.r.tout)}`]) }
  if (X.lu.erreurs.length) return { X, echec: res(id, X.lu.erreurs) }
  return { X }
}
/** Le contenu attendu d'un fichier exporté, recalculé par le juge depuis la racine factice. */
function contenuAttendu(X, entree, excl) {
  const brut = fs.readFileSync(X.R.abs(idDe(entree)))
  if (entree.classe === 'prospects') return brut
  let texte = brut.toString('utf8')
  if (entree.racine === 'memoire' && entree.chemin === 'MEMORY.md') texte = texte.split('\n').filter((l) => !excl.test(l)).join('\n')
  return Buffer.from(caviarderJuge(X.R.contrat, texte).texte)
}
const OPS_ECRITURE = new Set(['ecriture', 'dossier', 'renommage', 'suppression'])

function svs2(ctx) {
  const f = []
  const pS = path.join(ctx.racine, 'docs', 'savoir', 'sources.json')
  if (!existe(pS)) f.push('docs/savoir/sources.json absent de la racine jugée')
  else {
    const a = lireJSON(pS)
    const b = lireJSON(SOURCES_ESSAI_SRC)
    for (const k of CHAMPS_EXPORT) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) f.push(`sources-essai.json ne reprend pas « ${k} » de docs/savoir/sources.json (les mêmes règles, racines factices)`)
  }
  const { X, echec } = prealableExport(ctx, 'SVS-2')
  if (echec) return res('SVS-2', [...echec.detail, ...f])
  const A = X.attendu
  const vus = []
  for (const c of ['general', 'prospects']) for (const e of X.lu[c].fichiers) vus.push(`${c}|${idDe(e)}|${e.classe}`)
  const attendus = A.fichiers.map((e) => `${e.compartiment}|${idDe(e)}|${e.classe}`)
  const manquants = attendus.filter((x) => !vus.includes(x))
  const enTrop = vus.filter((x) => !attendus.includes(x))
  if (manquants.length) f.push(`fichiers attendus absents de l'export (compartiment|chemin|classe) : ${manquants.slice(0, 6).join(' ; ')}${manquants.length > 6 ? ` … (${manquants.length})` : ''}`)
  if (enTrop.length) f.push(`fichiers exportés hors de attendu-export.json : ${enTrop.slice(0, 6).join(' ; ')}${enTrop.length > 6 ? ` … (${enTrop.length})` : ''}`)
  if (new Set(vus).size !== vus.length) f.push('un fichier est cité deux fois dans les manifestes')
  for (const c of ['general', 'prospects']) {
    const declares = X.lu[c].fichiers.map((e) => `${e.racine}/${e.chemin}`).sort()
    const disque = X.lu[c].disque
    const orphelins = disque.filter((d) => !declares.includes(d))
    const absents = declares.filter((d) => !disque.includes(d))
    if (orphelins.length) f.push(`${c}/fichiers : sur le disque sans être au manifeste — ${orphelins.slice(0, 4).join(', ')}`)
    if (absents.length) f.push(`${c}/fichiers : au manifeste sans être sur le disque — ${absents.slice(0, 4).join(', ')}`)
  }
  const compteurs = X.lu.rapport?.compteurs || {}
  for (const [k, v] of Object.entries(A.compteurs)) if (compteurs[k] !== v) f.push(`rapport.compteurs.${k} : ${JSON.stringify(compteurs[k])} (attendu ${v})`)
  // hors liste : ni exporté, ni nommé nulle part (manifestes, rapport, sortie du script).
  const textes = [X.lu.general.brut, X.lu.prospects.brut, X.lu.rapportBrut || '', X.r.tout]
  for (const h of A.hors_liste) {
    const nomFichier = path.posix.basename(h.split(':').slice(1).join(':'))
    if (textes.some((t) => t.includes(nomFichier))) f.push(`hors liste nommé dans l'export, le rapport ou la sortie : ${h}`)
  }
  return res('SVS-2', f)
}

function svs3(ctx) {
  const { X, echec } = prealableExport(ctx, 'SVS-3')
  if (echec) return echec
  const f = []
  const A = X.attendu
  const J = X.journal
  if (!J.length) return res('SVS-3', ['espion-fs : aucun relevé (espion non chargé, ou l’export n’ouvre rien) — la preuve « jamais ouvert » serait vide'])
  const lectures = J.filter((x) => x.op === 'lecture').map((x) => cle(x.chemin))
  const touches = J.filter((x) => x.op === 'lecture' || x.op === 'liste').map((x) => cle(x.chemin))
  // L'espion voit bien les lectures : chaque fichier exporté a été lu.
  const nonVus = A.fichiers.filter((e) => !lectures.includes(cle(X.R.abs(idDe(e)))))
  if (nonVus.length) f.push(`espion-fs : ${nonVus.length} fichier(s) exporté(s) sans lecture relevée (ex. ${idDe(nonVus[0])}) — l’espion ne voit pas les lectures`)
  const jamais = [...A.jamais_ouverts, ...A.hors_liste, ...A.non_lus.map(idDe)]
  for (const id of jamais) {
    const p = cle(X.R.abs(id))
    const t = touches.find((c) => c === p || c.startsWith(p + path.sep))
    if (t) f.push(`ouvert ou listé alors qu'il ne doit jamais l'être : ${id}`)
  }
  // Rien d'exclu, de hors liste, de non lu ni la fausse clé dans la sortie (fichiers, manifestes, rapport) ni à l'écran.
  for (const fichier of listerFichiers(X.sortie)) {
    const t = fs.readFileSync(path.join(X.sortie, ...fichier.split('/'))).toString('utf8')
    for (const m of MARQUES_INTERDITES) if (t.includes(m)) f.push(`« ${m}… » trouvé dans la sortie : ${fichier}`)
    if (t.includes(X.R.cleFausse)) f.push(`la valeur du faux secret est dans la sortie : ${fichier}`)
  }
  if (X.r.tout.includes(X.R.cleFausse)) f.push('la valeur du faux secret est dans la sortie du script')
  for (const m of MARQUES_INTERDITES) if (X.r.tout.includes(m)) f.push(`« ${m}… » dans la sortie du script`)
  // Le fichier au faux secret : écarté entier, rapporté par son chemin et le nom du motif.
  const secrets = X.lu.rapport?.secrets
  if (!Array.isArray(secrets)) f.push('rapport.secrets absent')
  else {
    for (const s of A.secrets) {
      const vu = secrets.find((x) => x.racine === s.racine && x.chemin === s.chemin)
      if (!vu) f.push(`rapport.secrets ne cite pas ${idDe(s)}`)
      else if (!Array.isArray(vu.motifs) || !vu.motifs.includes(s.motif)) f.push(`rapport.secrets.${idDe(s)}.motifs : ${JSON.stringify(vu?.motifs)} (attendu ${s.motif})`)
    }
    if (secrets.length !== A.secrets.length) f.push(`rapport.secrets : ${secrets.length} entrée(s) (attendu ${A.secrets.length})`)
  }
  for (const c of ['general', 'prospects']) for (const s of A.secrets) if (X.lu[c].fichiers.some((e) => idDe(e) === idDe(s))) f.push(`le fichier au faux secret est exporté (${c})`)
  // MEMORY.md : exporté sans ses lignes EXCL, le reste à l'identique.
  const excl = new RegExp(litExcl())
  const mem = X.lu.general.fichiers.find((e) => e.racine === 'memoire' && e.chemin === 'MEMORY.md')
  if (!mem) f.push('memoire:MEMORY.md absent de l’export general')
  else {
    const exporte = fs.readFileSync(path.join(X.sortie, 'general', 'fichiers', 'memoire', 'MEMORY.md')).toString('utf8')
    const lignesExcl = exporte.split('\n').filter((l) => excl.test(l))
    if (lignesExcl.length) f.push(`MEMORY.md exporté porte encore ${lignesExcl.length} ligne(s) EXCL`)
    if (exporte !== contenuAttendu(X, mem, excl).toString('utf8')) f.push('MEMORY.md exporté ≠ MEMORY.md sans ses lignes EXCL (autres lignes perdues ou changées)')
  }
  for (const nomExcl of A.memoire_excl) if ([X.lu.general.brut, X.lu.prospects.brut].some((t) => t.includes(nomExcl))) f.push(`mémoire EXCL citée dans un manifeste : ${nomExcl}`)
  return res('SVS-3', f)
}

function svs4(ctx) {
  const { X, echec } = prealableExport(ctx, 'SVS-4')
  if (echec) return echec
  const f = []
  const A = X.attendu
  const G = X.lu.general
  const P = X.lu.prospects
  const lireExporte = (c, e) => fs.readFileSync(path.join(X.sortie, c, 'fichiers', e.racine, ...e.chemin.split('/')))
  // Le fichier piégé : trois coordonnées caviardées, texte attendu à l'identique.
  for (const [id, attendu] of Object.entries(A.contenus_attendus)) {
    const e = G.fichiers.find((x) => idDe(x) === id)
    if (!e) { f.push(`${id} absent du compartiment general`); continue }
    const t = lireExporte('general', e).toString('utf8')
    if (t !== attendu.texte) f.push(`${id} : texte exporté ≠ texte caviardé attendu — ${court(t, 160)}`)
    if (e.caviardages !== attendu.caviardages) f.push(`${id} : caviardages ${e.caviardages} (attendu ${attendu.caviardages})`)
  }
  // Le fichier de 6 coordonnées : reclassé en prospects, texte brut.
  for (const id of A.reclasses) {
    const e = P.fichiers.find((x) => idDe(x) === id)
    if (!e) f.push(`${id} : attendu reclassé dans prospects, absent de prospects`)
    else {
      if (e.reclasse !== true) f.push(`${id} : reclasse ${JSON.stringify(e.reclasse)} (attendu true)`)
      if (e.classe !== 'prospects') f.push(`${id} : classe ${e.classe} (attendu prospects)`)
      if (!lireExporte('prospects', e).equals(fs.readFileSync(X.R.abs(id)))) f.push(`${id} : reclassé mais pas à l’identique (caviardé ?)`)
    }
    if (G.fichiers.some((x) => idDe(x) === id)) f.push(`${id} : aussi dans general`)
  }
  // La sentinelle des prospects : nulle part sous general/, bien présente sous prospects/.
  for (const fichier of listerFichiers(path.join(X.sortie, 'general'))) {
    if (fs.readFileSync(path.join(X.sortie, 'general', ...fichier.split('/'))).toString('utf8').includes(SENTINELLE)) f.push(`${SENTINELLE} trouvée sous general/ : ${fichier}`)
  }
  const prospectsAvecSentinelle = P.fichiers.filter((e) => lireExporte('prospects', e).toString('utf8').includes(SENTINELLE))
  if (prospectsAvecSentinelle.length !== A.fichiers.filter((e) => e.compartiment === 'prospects').length) f.push(`sentinelle attendue dans chaque fichier prospects exporté : ${prospectsAvecSentinelle.length}/${P.fichiers.length}`)
  // Aucun chemin prospects dans le manifeste general, un compte seulement.
  for (const e of P.fichiers) if (G.brut.includes(e.chemin) || G.brut.includes(path.posix.basename(e.chemin))) f.push(`le manifeste general nomme un fichier prospects : ${idDe(e)}`)
  if (G.prospects_compte !== P.fichiers.length) f.push(`general.prospects_compte : ${JSON.stringify(G.prospects_compte)} (attendu ${P.fichiers.length}, un nombre)`)
  if (G.fichiers.some((e) => e.classe === 'prospects')) f.push('une entrée de classe prospects dans le manifeste general')
  // Prospects : jamais caviardés.
  for (const e of P.fichiers) {
    if (e.caviardages !== 0) f.push(`${idDe(e)} (prospects) : caviardages ${e.caviardages} (attendu 0)`)
    if (!lireExporte('prospects', e).equals(fs.readFileSync(X.R.abs(idDe(e))))) f.push(`${idDe(e)} (prospects) : octets changés à l’export`)
  }
  // Le fichier public reste public.
  for (const id of A.publics) {
    const e = G.fichiers.find((x) => idDe(x) === id)
    if (!e || e.classe !== 'public') f.push(`${id} : classe ${e?.classe ?? '(absent)'} (attendu public)`)
  }
  return res('SVS-4', f)
}

function svs5(ctx) {
  const { X, echec } = prealableExport(ctx, 'SVS-5')
  if (echec) return echec
  const f = []
  const A = X.attendu
  const excl = new RegExp(litExcl())
  const CHAMPS = ['racine', 'chemin', 'classe', 'sha256', 'octets', 'caviardages', 'reclasse']
  for (const c of ['general', 'prospects']) {
    for (const e of X.lu[c].fichiers) {
      const cles = Object.keys(e)
      const inconnus = cles.filter((k) => !CHAMPS.includes(k))
      const manquants = CHAMPS.filter((k) => k !== 'reclasse' && !cles.includes(k))
      if (inconnus.length || manquants.length) f.push(`${c}:${idDe(e)} : champs ${JSON.stringify(cles)} (attendu ${CHAMPS.join(', ')})`)
      if ('reclasse' in e && typeof e.reclasse !== 'boolean') f.push(`${c}:${idDe(e)} : reclasse non booléen`)
      const p = path.join(X.sortie, c, 'fichiers', e.racine, ...String(e.chemin).split('/'))
      if (!existe(p)) continue
      const octets = fs.readFileSync(p)
      if (e.sha256 !== sha256(octets)) f.push(`${c}:${idDe(e)} : sha256 du manifeste ≠ sha256 du fichier exporté`)
      if (e.octets !== octets.length) f.push(`${c}:${idDe(e)} : octets ${e.octets} (fichier : ${octets.length})`)
      const att = A.fichiers.find((x) => idDe(x) === idDe(e))
      if (att && e.caviardages !== att.caviardages) f.push(`${c}:${idDe(e)} : caviardages ${e.caviardages} (attendu ${att.caviardages})`)
      if (existe(X.R.abs(idDe(e))) && !octets.equals(contenuAttendu(X, e, excl))) f.push(`${c}:${idDe(e)} : contenu exporté ≠ contenu recalculé par le juge`)
    }
  }
  // Formats non lus et trop gros : au manifeste de leur compartiment, jamais ouverts, jamais exportés.
  const nonLus = []
  for (const c of ['general', 'prospects']) for (const n of X.lu[c].non_lus || []) nonLus.push(`${c}|${idDe(n)}|${n.raison}`)
  const nonLusAttendus = A.non_lus.map((n) => `${n.compartiment}|${idDe(n)}|${n.raison}`)
  for (const n of nonLusAttendus) if (!nonLus.includes(n)) f.push(`non_lus : ${n} absent des manifestes`)
  for (const n of nonLus) if (!nonLusAttendus.includes(n)) f.push(`non_lus : ${n} inattendu`)
  for (const n of A.non_lus) {
    if (X.journal.some((x) => x.op === 'lecture' && cle(x.chemin) === cle(X.R.abs(idDe(n))))) f.push(`${idDe(n)} (${n.raison}) ouvert`)
    if (['general', 'prospects'].some((c) => X.lu[c].fichiers.some((e) => idDe(e) === idDe(n)))) f.push(`${idDe(n)} (${n.raison}) exporté`)
  }
  // Plafonds : dépassés → code 1, sortie intacte, pas de .part.
  const exp = path.join(ctx.racine, CHEMINS.exporter)
  const avant = arbre(X.sortie)
  for (const [clef, valeur] of [['octets_total', 1000], ['fichiers', 3]]) {
    const contrat = JSON.parse(JSON.stringify(X.R.contrat))
    contrat.plafonds[clef] = valeur
    const pS = path.join(X.R.base, `sources-plafond-${clef}.json`)
    ecrire(pS, JSON.stringify(contrat, null, 2))
    const r = noeud([exp, `--sources=${pS}`, `--sortie=${X.sortie}`], { cwd: ctx.racine })
    if (r.code !== 1) f.push(`plafond ${clef}=${valeur} dépassé : code ${r.code} (attendu 1) — ${court(r.tout, 120)}`)
    const ecarts = ecartsArbre(avant, arbre(X.sortie))
    if (ecarts.length) f.push(`plafond ${clef} dépassé : la sortie précédente a bougé — ${ecarts.slice(0, 3).join(' ; ')}`)
    if (existe(`${X.sortie}.part`)) f.push(`plafond ${clef} dépassé : ${path.basename(X.sortie)}.part laissé sur le disque`)
  }
  // Déterminisme : un second export du même arbre donne le même manifeste, à exporte_le près.
  const bis = path.join(X.R.base, 'sortie-bis')
  const r2 = noeud([exp, `--sources=${X.R.sources}`, `--sortie=${bis}`], { cwd: ctx.racine })
  if (r2.code !== 0) f.push(`second export : code ${r2.code} — ${court(r2.tout, 120)}`)
  else {
    const L2 = lireExport(bis)
    const sansDate = (m) => { if (!m) return null; const { exporte_le: _d, brut: _b, disque: _x, ...reste } = m; return JSON.stringify(reste) }
    for (const c of ['general', 'prospects']) if (sansDate(L2[c]) !== sansDate(X.lu[c])) f.push(`second export : le manifeste ${c} diffère (hors exporte_le)`)
    if (JSON.stringify(L2.rapport?.compteurs) !== JSON.stringify(X.lu.rapport?.compteurs)) f.push('second export : compteurs différents')
  }
  return res('SVS-5', f)
}

function svs6(ctx) {
  const { X, echec } = prealableExport(ctx, 'SVS-6')
  if (echec) return echec
  const f = []
  const exp = path.join(ctx.racine, CHEMINS.exporter)
  const passe = (nom, sortie, extra = []) => {
    const espion = path.join(X.R.base, `espion-${nom}.jsonl`)
    const r = noeud([...importer(ESPION_FS), exp, `--sources=${X.R.sources}`, `--sortie=${sortie}`, ...extra], { cwd: ctx.racine, env: { SAVOIR_ESPION_FS: espion } })
    return { r, ecritures: lireJournal(espion).filter((x) => OPS_ECRITURE.has(x.op)) }
  }
  const interdites = [
    ['racine-presti', path.join(X.R.contrat.racines.presti, 'docs', 'sortie-interdite')],
    ['racine-saas', path.join(X.R.contrat.racines.saas, 'Produit', 'sortie-interdite')],
    ['depot-du-script', path.join(ctx.racine, 'docs', '.savoir-socle-qa-sortie-interdite')],
    ['contient-les-racines', path.join(X.R.base, 'racines')],
  ]
  for (const [nom, sortie] of interdites) {
    const existaitAvant = existe(sortie)
    const { r, ecritures } = passe(nom, sortie)
    if (r.code !== 2) f.push(`--sortie ${nom} : code ${r.code} (attendu 2)`)
    if (ecritures.length) f.push(`--sortie ${nom} : ${ecritures.length} écriture(s) relevée(s) (ex. ${ecritures[0].op} ${court(ecritures[0].chemin, 90)})`)
    if (!existaitAvant && existe(sortie)) { f.push(`--sortie ${nom} : la sortie interdite a été créée`); if (nom === 'depot-du-script') nettoyer(sortie) }
    if (existe(`${sortie}.part`)) { f.push(`--sortie ${nom} : ${path.basename(sortie)}.part créé`); nettoyer(`${sortie}.part`) }
  }
  // L'exception : sous une exclusion de sa racine (ops:savoir/**, la sortie de synchroniser.mjs), la sortie est permise.
  const permise = path.join(X.R.contrat.racines.ops, 'savoir', 'export-essai')
  const p1 = passe('ops-savoir', permise)
  if (p1.r.code !== 0 || !existe(path.join(permise, 'general', 'manifeste.json'))) f.push(`--sortie sous ops:savoir/** (exclue, donc permise) : code ${p1.r.code}, manifeste ${existe(path.join(permise, 'general', 'manifeste.json')) ? 'présent' : 'absent'} — ${court(p1.r.tout, 120)}`)
  // --a-sec : rien d'écrit.
  const aSec = path.join(X.R.base, 'sortie-a-sec')
  const p2 = passe('a-sec', aSec, ['--a-sec'])
  if (p2.r.code !== 0) f.push(`--a-sec : code ${p2.r.code} (attendu 0) — ${court(p2.r.tout, 120)}`)
  if (existe(aSec) || existe(`${aSec}.part`)) f.push('--a-sec : une sortie a été écrite')
  if (p2.ecritures.length) f.push(`--a-sec : ${p2.ecritures.length} écriture(s) relevée(s) (ex. ${p2.ecritures[0].op} ${court(p2.ecritures[0].chemin, 90)})`)
  if (!p2.r.sortie.trim()) f.push('--a-sec : rien à l’écran (il doit dire ce qu’il exporterait)')
  // L'export principal : tout écrit sous <sortie>.part, puis un renommage .part → sortie, après la dernière écriture.
  const part = `${X.sortie}.part`
  const J = X.journal
  const horsPart = J.filter((x) => (x.op === 'ecriture' || x.op === 'dossier') && !dans(part, x.chemin))
  if (horsPart.length) f.push(`export : ${horsPart.length} écriture(s) hors de ${path.basename(part)} (ex. ${horsPart[0].op} ${court(horsPart[0].chemin, 90)})`)
  const iRen = J.findIndex((x) => x.op === 'renommage' && cle(x.chemin) === cle(part) && cle(x.vers || '') === cle(X.sortie))
  const iDerniere = J.map((x) => x.op).lastIndexOf('ecriture')
  if (iRen < 0) f.push(`export : aucun renommage ${path.basename(part)} → ${path.basename(X.sortie)} relevé (écriture directe, pas atomique)`)
  else if (iRen < iDerniere) f.push('export : une écriture a lieu après le renommage de .part')
  for (const racine of Object.values(X.R.contrat.racines)) {
    const touche = J.find((x) => OPS_ECRITURE.has(x.op) && dans(racine, x.chemin))
    if (touche) f.push(`export : écriture dans une racine (${touche.op} ${court(touche.chemin, 90)})`)
  }
  return res('SVS-6', f)
}

// ── SVS-7 : l'envoi ──────────────────────────────────────────────────────────────────────────────────────────────
const CHEMIN_LONG = 'presti/docs/un/chemin/tres/long/pour/forcer/l-en-tete-pax/du/format-ustar/au-dela-de-cent-octets/note-longue.md'
/** Un compartiment d'essai (manifeste cohérent + fichiers), fabriqué par le juge. */
function compartimentEssai(c, marque) {
  const docs = c === 'general'
    ? [['saas', 'Produit/a.md', 'interne', `# A\n\nCONTENU-RECU-${marque} : note générale A.\n`], ['saas', 'Produit/Récap-accentué-é.md', 'public', `# Récap\n\nCONTENU-RECU-${marque} : accents dans le nom.\n`], [CHEMIN_LONG.split('/')[0], CHEMIN_LONG.split('/').slice(1).join('/'), 'interne', `CONTENU-RECU-${marque} : chemin long.\n`]]
    : [['saas', 'Prospection/Lot-Essai.md', 'prospects', `${SENTINELLE}\nCONTENU-RECU-${marque} : lot inventé.\n`]]
  const fichiers = new Map()
  const liste = []
  for (const [racine, chemin, classe, texte] of docs) {
    const b = Buffer.from(texte)
    fichiers.set(`fichiers/${racine}/${chemin}`, b)
    liste.push({ racine, chemin, classe, sha256: sha256(b), octets: b.length, caviardages: 0, reclasse: false })
  }
  const manifeste = { version: 1, compartiment: c, exporte_le: '2026-09-28T10:00:00.000Z', fichiers: liste, non_lus: [], ...(c === 'general' ? { prospects_compte: 1 } : {}) }
  return { manifeste, fichiers }
}
function ecrireExportEssai(dir) {
  nettoyer(dir)
  for (const c of ['general', 'prospects']) {
    const { manifeste, fichiers } = compartimentEssai(c, 'ENVOI')
    ecrire(path.join(dir, c, 'manifeste.json'), JSON.stringify(manifeste, null, 2))
    for (const [r, b] of fichiers) ecrire(path.join(dir, c, ...r.split('/')), b)
  }
  ecrire(path.join(dir, 'rapport.json'), JSON.stringify({ version: 1, compteurs: { general: 3, prospects: 1 } }))
}
function ecrireReglages(dossier, nom, modif) {
  const r = lireJSON(path.join(DEPOT, 'docs', 'savoir', 'reglages.json'))
  modif(r)
  const p = path.join(dossier, `reglages-${nom}.json`)
  ecrire(p, JSON.stringify(r, null, 2))
  return p
}
const allumer = (r, nom) => { r.interrupteurs[nom] = { actif: true, depuis: '2026-09-28', accord: 'sans accord requis : essai du juge savoir-socle-qa' } }
/** Les défauts d'un appel ssh d'envoi : forme, commande distante, archive relue par le lecteur du juge. */
function defautsAppel(appel, c, exportDir, maison) {
  const D = []
  if (appel.via !== 'PRESTI_SSH_BIN') D.push(`ssh lancé par ${appel.via} et non par PRESTI_SSH_BIN`)
  const a = appel.argv || []
  const i = a.indexOf(HOTE_ESSAI)
  if (i < 0) return [...D, `hôte ${HOTE_ESSAI} (PRESTI_USINE) absent de l'argv : ${court(a.join(' '), 120)}`]
  let cleVue = false
  let batch = false
  for (let k = 0; k < i; k += 2) {
    const [o, v] = [a[k], a[k + 1]]
    if (o === '-i') { if (cle(v || '') === cle(path.join(maison, '.ssh', 'presti-usine'))) cleVue = true; else D.push(`-i ${v} (attendu <home>/.ssh/presti-usine)`) }
    else if (o === '-o') { if (v === 'BatchMode=yes') batch = true; else if (!/^(ConnectTimeout|ServerAliveInterval|ServerAliveCountMax)=\d+$/.test(v || '')) D.push(`option ssh non permise : -o ${v}`) }
    else D.push(`argument ssh non permis avant l'hôte : ${o}`)
  }
  if (!cleVue) D.push('-i <home>/.ssh/presti-usine absent')
  if (!batch) D.push('-o BatchMode=yes absent')
  const commande = a.slice(i + 1).join(' ')
  const d = DEPOT_DISTANT.replace(/\//g, '\\/')
  const re = new RegExp(`^umask 007 && cat > ${d}\\/(general|prospects)-(\\d{8}T\\d{6}Z)\\.tar\\.part && mv ${d}\\/\\1-\\2\\.tar\\.part ${d}\\/\\1-\\2\\.tar && touch ${d}\\/\\1-\\2\\.pret$`)
  const m = re.exec(commande)
  if (!m) D.push(`commande distante hors du gabarit fixe : ${court(commande, 160)}`)
  else {
    if (m[1] !== c) D.push(`compartiment ${m[1]} (attendu ${c} à ce rang)`)
    const h = m[2]
    const quand = Date.parse(`${h.slice(0, 4)}-${h.slice(4, 6)}-${h.slice(6, 8)}T${h.slice(9, 11)}:${h.slice(11, 13)}:${h.slice(13, 15)}Z`)
    if (!Number.isFinite(quand) || Math.abs(quand - Date.now()) > 30 * 60_000) D.push(`horodatage ${h} : pas l'heure de l'envoi`)
  }
  let entrees
  try { entrees = lireTar(appel.stdin) } catch (e) { return [...D, `entrée standard : pas une archive ustar lisible — ${e.message}`] }
  const attendus = listerFichiers(path.join(exportDir, c))
  const noms = entrees.map((e) => e.nom).sort()
  if (JSON.stringify(noms) !== JSON.stringify(attendus)) D.push(`archive ${c} : ses noms d'entrées ≠ les fichiers de l'export (${noms.length} contre ${attendus.length}) — en trop ${court(JSON.stringify(noms.filter((n) => !attendus.includes(n))), 80)}, manquants ${court(JSON.stringify(attendus.filter((n) => !noms.includes(n))), 80)}`)
  for (const e of entrees) {
    const p = path.join(exportDir, c, ...e.nom.split('/'))
    if (existe(p) && !fs.readFileSync(p).equals(e.donnees)) D.push(`archive ${c} : ${e.nom} diffère de l'export`)
  }
  return D
}
function svs7(ctx) {
  const env = path.join(ctx.racine, CHEMINS.envoyer)
  if (!existe(env)) return res('SVS-7', [`${CHEMINS.envoyer} absent de la racine jugée — l'envoi n'est pas encore écrit`])
  const f = []
  const base = path.join(ctx.e, 'envoi')
  nettoyer(base)
  const exportDir = path.join(base, 'export')
  ecrireExportEssai(exportDir)
  const maison = path.join(base, 'maison')
  fs.mkdirSync(path.join(maison, '.ssh'), { recursive: true })
  const eteint = ecrireReglages(base, 'eteint', (r) => { for (const k of Object.keys(r.interrupteurs)) r.interrupteurs[k] = { actif: false, depuis: null, accord: null } }) // « éteint » posé explicitement : le fichier réel peut être allumé (05/10/2026, accord de Benj)
  const allume = ecrireReglages(base, 'allume', (r) => allumer(r, 'envoi'))
  const banc = (nom, mode = 'enregistrer') => {
    const j = path.join(base, `ssh-${nom}`)
    fs.mkdirSync(j, { recursive: true })
    return { j, env: { PRESTI_SSH_BIN: doublures().sshBin, FAUX_SSH_JOURNAL: j, FAUX_SSH_MODE: mode, PRESTI_USINE: HOTE_ESSAI, USERPROFILE: maison, HOME: maison } }
  }
  const inattendus = () => lireAppelsSsh(path.join(TRAVAIL, 'ssh-inattendu')).length
  const inattendusAvant = inattendus()
  // 1. interrupteur éteint
  let b = banc('eteint')
  let r = noeud([env, `--export=${exportDir}`, `--reglages=${eteint}`], { cwd: ctx.racine, env: b.env })
  if (r.code !== 0) f.push(`éteint : code ${r.code} (attendu 0) — ${court(r.tout, 120)}`)
  if (!/envoi éteint/i.test(r.tout)) f.push('éteint : « envoi éteint » absent de la sortie')
  if (lireAppelsSsh(b.j).length) f.push(`éteint : ${lireAppelsSsh(b.j).length} appel(s) ssh`)
  // 2. allumé : deux appels, general puis prospects, forme et archive exactes
  b = banc('allume')
  r = noeud([env, `--export=${exportDir}`, `--reglages=${allume}`], { cwd: ctx.racine, env: b.env })
  let appels = lireAppelsSsh(b.j)
  if (r.code !== 0) f.push(`allumé : code ${r.code} (attendu 0) — ${court(r.tout, 120)}`)
  if (appels.length !== 2) f.push(`allumé : ${appels.length} appel(s) ssh (attendu 2, general puis prospects)`)
  appels.slice(0, 2).forEach((appel, k) => { for (const d of defautsAppel(appel, ['general', 'prospects'][k], exportDir, maison)) f.push(`allumé, appel ${k + 1} : ${d}`) })
  if (!existe(path.join(exportDir, 'envoi.json'))) f.push('allumé : envoi.json (marque d’envoi) absent après deux appels réussis')
  // 3. ssh en échec : code 5, rien de marqué envoyé, pas de second appel
  const exportEchec = path.join(base, 'export-echec')
  ecrireExportEssai(exportEchec)
  ecrire(path.join(exportEchec, 'envoi.json'), JSON.stringify({ envoye_le: '2026-09-27T00:00:00Z', note: 'marque périmée posée par le juge' }))
  b = banc('echec', 'echec')
  r = noeud([env, `--export=${exportEchec}`, `--reglages=${allume}`], { cwd: ctx.racine, env: b.env })
  appels = lireAppelsSsh(b.j)
  if (r.code !== 5) f.push(`ssh en échec : code ${r.code} (attendu 5) — ${court(r.tout, 120)}`)
  if (existe(path.join(exportEchec, 'envoi.json'))) f.push('ssh en échec : envoi.json présent (marqué envoyé)')
  if (appels.length !== 1) f.push(`ssh en échec : ${appels.length} appel(s) (attendu 1 : on s'arrête au premier échec)`)
  // 4. --a-sec : aucun appel
  b = banc('a-sec')
  r = noeud([env, `--export=${exportDir}`, `--reglages=${allume}`, '--a-sec'], { cwd: ctx.racine, env: b.env })
  if (r.code !== 0) f.push(`--a-sec : code ${r.code} (attendu 0)`)
  if (lireAppelsSsh(b.j).length) f.push(`--a-sec : ${lireAppelsSsh(b.j).length} appel(s) ssh`)
  // 5. synchroniser : export vers <ops>/savoir/export, puis l'envoi
  const sync = path.join(ctx.racine, CHEMINS.synchroniser)
  if (!existe(sync)) f.push(`${CHEMINS.synchroniser} absent`)
  else {
    const R = preparerRacines(ctx, 'synchro')
    b = banc('synchro')
    r = noeud([sync, `--sources=${R.sources}`, `--reglages=${allume}`], { cwd: ctx.racine, env: b.env })
    const sortie = path.join(R.contrat.racines.ops, 'savoir', 'export')
    appels = lireAppelsSsh(b.j)
    if (r.code !== 0) f.push(`synchroniser : code ${r.code} — ${court(r.tout, 140)}`)
    if (!existe(path.join(sortie, 'general', 'manifeste.json'))) f.push('synchroniser : pas d’export sous <ops>/savoir/export')
    else if (appels.length !== 2) f.push(`synchroniser : ${appels.length} appel(s) ssh (attendu 2)`)
    else appels.forEach((appel, k) => { for (const d of defautsAppel(appel, ['general', 'prospects'][k], sortie, maison)) f.push(`synchroniser, appel ${k + 1} : ${d}`) })
  }
  if (inattendus() > inattendusAvant) f.push(`${inattendus() - inattendusAvant} appel(s) à un ssh ou un scp du PATH (seul PRESTI_SSH_BIN est permis)`)
  return res('SVS-7', f)
}

// ── SVS-8 : la réception ─────────────────────────────────────────────────────────────────────────────────────────
function entreesSaines(c, marque) {
  const { manifeste, fichiers } = compartimentEssai(c, marque)
  return [{ nom: 'manifeste.json', donnees: Buffer.from(JSON.stringify(manifeste, null, 2)) }, ...[...fichiers].map(([nom, donnees]) => ({ nom, donnees }))]
}
function svs8(ctx) {
  const rec = path.join(ctx.racine, CHEMINS.recevoir)
  if (!existe(rec)) return res('SVS-8', [`${CHEMINS.recevoir} absent de la racine jugée — la réception n'est pas encore écrite`])
  const f = []
  const e = path.join(ctx.e, 'reception')
  nettoyer(e)
  const depot = path.join(e, 'depot')
  const rt = path.join(e, 'travail')
  const hors = path.join(e, 'hors')
  for (const d of [depot, rt, hors]) fs.mkdirSync(d, { recursive: true })
  ecrire(path.join(hors, 'sentinelle.txt'), 'CONTENU-HORS : ne doit jamais bouger\n')
  ecrire(path.join(hors, 'archive-saine.tar'), ecrireTar(entreesSaines('general', 'CIBLE')))
  const journal = path.join(rt, 'journal.jsonl')
  const lancer = () => noeud([rec, `--depot=${depot}`, `--racine-travail=${rt}`], { cwd: ctx.racine })
  const deposer = (nom, archive) => { ecrire(path.join(depot, `${nom}.tar`), archive); ecrire(path.join(depot, `${nom}.pret`), '') }
  const courant = (c) => path.join(rt, c, 'courant')
  const trie = (paires) => JSON.stringify(paires.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)))
  const contenuDe = (dir) => trie(listerFichiers(dir).map((r) => [r, fs.readFileSync(path.join(dir, ...r.split('/'))).toString('utf8')]))
  const attenduDe = (marque) => trie(entreesSaines('general', marque).map((x) => [x.nom, x.donnees.toString('utf8')]))
  const lignesJournal = () => lireJournal(journal)
  const verifierJournal = (avant, quoi) => {
    const L = lignesJournal()
    if (L.length !== avant + 1) f.push(`${quoi} : ${L.length - avant} ligne(s) de journal (attendu 1)`)
    const texte = existe(journal) ? lire(journal) : ''
    if (/CONTENU-RECU-|CONTENU-HORS/.test(texte)) f.push(`${quoi} : du contenu de fichier est au journal`)
    if (texte.includes(SENTINELLE)) f.push(`${quoi} : la sentinelle est au journal`)
    return L.at(-1) || {}
  }
  // 1. deux archives saines : courant remplacé, précédent gardé
  let n0 = lignesJournal().length
  deposer('general-20260928T100000Z', ecrireTar(entreesSaines('general', 'A')))
  let r = lancer()
  if (r.code !== 0) f.push(`archive saine A : code ${r.code} (attendu 0) — ${court(r.tout, 140)}`)
  if (contenuDe(courant('general')) !== attenduDe('A')) f.push('archive saine A : general/courant ≠ contenu de l’archive')
  if (!existe(path.join(rt, 'a-indexer'))) f.push('archive saine A : a-indexer absent')
  if (fs.readdirSync(depot).length) f.push(`archive saine A : dépôt non vidé (${fs.readdirSync(depot).join(', ')})`)
  verifierJournal(n0, 'archive saine A')
  n0 = lignesJournal().length
  deposer('general-20260928T110000Z', ecrireTar(entreesSaines('general', 'B')))
  r = lancer()
  if (r.code !== 0) f.push(`archive saine B : code ${r.code} (attendu 0) — ${court(r.tout, 140)}`)
  if (contenuDe(courant('general')) !== attenduDe('B')) f.push('archive saine B : courant n’a pas été remplacé par B')
  if (contenuDe(path.join(rt, 'general', 'precedent')) !== attenduDe('A')) f.push('archive saine B : l’ancien courant (A) n’est pas gardé en precedent')
  if (fs.readdirSync(depot).length) f.push('archive saine B : dépôt non vidé')
  verifierJournal(n0, 'archive saine B')
  // 2. les archives piégées : code 1, rien d'écrit (hors journal), archive et .pret retirés, raison au journal
  const saines = entreesSaines('general', 'P')
  const sansManif = saines.filter((x) => x.nom !== 'manifeste.json')
  const absolu = posix(path.join(hors, 'evil-absolu.txt'))
  const manifAvec = (ajouts) => { const m = JSON.parse(saines[0].donnees.toString('utf8')); ajouts(m); return { nom: 'manifeste.json', donnees: Buffer.from(JSON.stringify(m)) } }
  const vingtMille = [saines[0], ...Array.from({ length: 20001 }, (_, i) => ({ nom: `fichiers/saas/n/f${String(i).padStart(5, '0')}.md`, donnees: Buffer.alloc(0) }))]
  const pieges = [
    ['../evil', [...saines, { nom: 'fichiers/../../../../../../evil-remontee.txt', donnees: Buffer.from('evil') }]],
    ['chemin absolu', [...saines, { nom: absolu, donnees: Buffer.from('evil') }]],
    ['lien symbolique', [...saines, { nom: 'fichiers/saas/lien.md', type: '2', lien: '../../../../hors/sentinelle.txt' }]],
    ['lien physique', [...saines, { nom: 'fichiers/saas/dur.md', type: '1', lien: 'fichiers/saas/Produit/a.md' }]],
    ['périphérique', [...saines, { nom: 'fichiers/saas/periph', type: '3' }]],
    ['fifo', [...saines, { nom: 'fichiers/saas/fifo', type: '6' }]],
    ['20 001 fichiers', vingtMille],
    ['taille déclarée > 100 Mo', [...saines, { nom: 'fichiers/saas/enorme.md', tailleDeclaree: 100 * 1024 * 1024 + 1, tronquee: true }]],
    ['empreinte ≠ manifeste', [saines[0], ...sansManif.map((x, i) => (i === 0 ? { ...x, donnees: Buffer.from('contenu remplacé après le manifeste\n') } : x))]],
    ['prospects/ dans general', [...saines, { nom: 'prospects/fichiers/saas/x.md', donnees: Buffer.from(`${SENTINELLE}\n`) }]],
    ['classe prospects dans general', [manifAvec((m) => { m.fichiers[0].classe = 'prospects' }), ...sansManif]],
    ['clé pax linkpath', [...saines, { nom: 'fichiers/saas/pax.md', donnees: Buffer.from('x'), pax: { linkpath: '../../../../hors/sentinelle.txt' } }]],
    ['fichier hors manifeste', [...saines, { nom: 'fichiers/saas/intrus.md', donnees: Buffer.from('intrus\n') }]],
  ]
  let h = 12
  const exclureCourants = (r0) => r0 === 'depot' || r0.startsWith('depot/') || r0 === 'travail/journal.jsonl'
  const cas = (quoi, preparer) => {
    const avant = arbre(e, exclureCourants)
    const n = lignesJournal().length
    preparer()
    const rr = lancer()
    if (rr.code !== 1) f.push(`${quoi} : code ${rr.code} (attendu 1) — ${court(rr.tout, 100)}`)
    const ecarts = ecartsArbre(avant, arbre(e, exclureCourants))
    if (ecarts.length) f.push(`${quoi} : écrit ou changé hors du journal — ${ecarts.slice(0, 3).join(' ; ')}`)
    const restes = fs.readdirSync(depot)
    if (restes.length) f.push(`${quoi} : laissé dans le dépôt — ${restes.join(', ')}`)
    const L = verifierJournal(n, quoi)
    if (!L.raison || typeof L.raison !== 'string') f.push(`${quoi} : pas de raison au journal`)
    // Hors de l'essai : là où une remontée `../` depuis l'extraction atterrirait (chaque dossier jusqu'au dépôt), et le
    // chemin absolu visé. Dans l'essai, l'empreinte d'arbre ci-dessus voit déjà tout fichier nouveau.
    for (let d = path.join(rt, 'general', 'entrant', 'fichiers'); dans(DEPOT, d); d = path.dirname(d)) {
      if (existe(path.join(d, 'evil-remontee.txt'))) { f.push(`${quoi} : ${rel(path.join(d, 'evil-remontee.txt'))} écrit`); nettoyer(path.join(d, 'evil-remontee.txt')) }
      if (cle(d) === cle(DEPOT)) break
    }
    if (existe(absolu.replace(/\//g, path.sep))) f.push(`${quoi} : ${absolu} écrit`)
  }
  for (const [quoi, entrees] of pieges) {
    const nom = `general-20260928T${String(h++).padStart(2, '0')}0000Z`
    cas(quoi, () => deposer(nom, ecrireTar(entrees)))
  }
  // Nom hors de la forme <compartiment>-<horodatage>.
  cas('nom d’archive hors forme', () => deposer('divers-20260928T230000Z', ecrireTar(saines)))
  // Un .pret ou une archive qui sont des liens : refusés (lstat), la cible intacte.
  let liens = true
  try {
    cas('.pret en lien symbolique', () => { ecrire(path.join(depot, 'general-20260929T010000Z.tar'), ecrireTar(saines)); fs.symlinkSync(path.join(hors, 'sentinelle.txt'), path.join(depot, 'general-20260929T010000Z.pret'), 'file') })
    cas('archive en lien symbolique', () => { fs.symlinkSync(path.join(hors, 'archive-saine.tar'), path.join(depot, 'general-20260929T020000Z.tar'), 'file'); ecrire(path.join(depot, 'general-20260929T020000Z.pret'), '') })
  } catch (err) { liens = false; f.push(`liens symboliques : impossibles à fabriquer ici (${err.code || err.message}) — ce cas n'est pas jugé, c'est un échec du préalable`) }
  if (liens && !existe(path.join(hors, 'archive-saine.tar'))) f.push('la cible d’un lien refusé a été effacée')
  return res('SVS-8', f)
}

// ── SVS-9 : le contrat de lib/savoir/index.ts ────────────────────────────────────────────────────────────────────
const SONDE = `// Sonde du juge savoir-socle-qa (026-229) : appelle lib/savoir/index.ts de la racine jugée et rend les résultats BRUTS en
// JSON ; le juge (parent) les évalue. Aucune décision ici.
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const E = JSON.parse(fs.readFileSync(process.env.SONDE_ENTREE, 'utf8'))
const out = { erreurs: [] }
const essai = (nom, f) => { try { out[nom] = f() } catch (e) { out.erreurs.push(nom + ' : ' + (e && e.message)) } }
const M = await import(pathToFileURL(process.env.SONDE_MODULE).href)
out.exports = Object.keys(M)
out.types = Object.fromEntries(Object.keys(M).map((k) => [k, typeof M[k]]))
essai('classes', () => [...M.CLASSES])
essai('normaliser', () => E.normalisation.map((c) => M.normaliser(c.entree)))
essai('decouper', () => M.decouper(E.texteDecoupe))
essai('decouperVide', () => M.decouper(''))
essai('index', () => { const a = M.construireIndex(E.corpus); const b = M.construireIndex(E.corpus); const c = M.construireIndex([...E.corpus].reverse()); return { a, egal: a === b, egalInverse: a === c, type: typeof a, taille: typeof a === 'string' ? a.length : 0 } })
essai('recherches', () => { const I = M.construireIndex(E.corpus); return E.questions.map((q) => M.chercherIndex(I, q.question).slice(0, 5).map((r) => ({ chemin: r.chemin, classe: r.classe }))) })
essai('filtres', () => { const I = M.construireIndex(E.corpus); return E.filtres.map((q) => M.chercherIndex(I, q.question, { classes: q.classes }).map((r) => ({ chemin: r.chemin, classe: r.classe }))) })
essai('caviarder', () => E.caviardage.map((c) => M.caviarder(c.entree)))
essai('fusion', () => M.fusionnerScores(E.fusion.listes, E.fusion.k))
process.stdout.write(JSON.stringify(out))
`
function texteDecoupe() {
  const L = []
  for (let i = 0; i < 90; i++) {
    if (i % 11 === 0) { L.push(''); continue }
    L.push(`Ligne ${i} : ${'mot '.repeat((i * 37) % 70)}fin.`)
  }
  L.splice(40, 0, `Une ligne très longue : ${'x'.repeat(3000)} (fin de la longue ligne).`)
  return L.join('\n')
}
function svs9(ctx) {
  const mod = path.join(ctx.racine, CHEMINS.index)
  if (!existe(mod)) return res('SVS-9', [`${CHEMINS.index} absent de la racine jugée — l'index n'est pas encore écrit`])
  const f = []
  const Q = lireJSON(QUESTIONS_SRC)
  const base = path.join(ctx.e, 'index-contrat')
  nettoyer(base)
  const corpus = Q.corpus.map((d) => { const [r, ...reste] = d.chemin.split(':'); return { chemin: d.chemin, classe: d.classe, texte: lire(path.join(RACINES_SRC, r, ...reste.join(':').split('/'))) } })
  const entree = { normalisation: Q.normalisation.cas, texteDecoupe: texteDecoupe(), corpus, questions: Q.questions, filtres: Q.filtres, caviardage: Q.caviardage, fusion: Q.fusion }
  const pEntree = path.join(base, 'entree.json')
  const pSonde = path.join(base, 'sonde-index.mjs')
  ecrire(pEntree, JSON.stringify(entree))
  ecrire(pSonde, SONDE)
  const r = noeud(['--experimental-strip-types', ...importer(TS_LOADER), pSonde], { cwd: ctx.racine, env: { SONDE_ENTREE: pEntree, SONDE_MODULE: mod } })
  let S
  try { S = JSON.parse(r.sortie) } catch { return res('SVS-9', [`sonde : sortie illisible (code ${r.code}) — ${court(r.tout, 200)}`]) }
  for (const e of S.erreurs) f.push(`appel en erreur — ${court(e, 160)}`)
  const ATTENDUS = ['CLASSES', 'normaliser', 'decouper', 'construireIndex', 'chercherIndex', 'caviarder', 'fusionnerScores']
  for (const n of ATTENDUS) if (!S.exports.includes(n)) f.push(`export manquant : ${n}`)
  for (const n of ATTENDUS.slice(1)) if (S.types[n] && S.types[n] !== 'function') f.push(`${n} n'est pas une fonction`)
  if (S.classes && !memeEnsemble(S.classes, ['public', 'interne', 'prospects'])) f.push(`CLASSES : ${JSON.stringify(S.classes)} (attendu public, interne, prospects)`)
  // normaliser : la table fixe
  ;(S.normaliser || []).forEach((sortie, i) => { const c = Q.normalisation.cas[i]; if (JSON.stringify(sortie) !== JSON.stringify(c.attendu)) f.push(`normaliser(${JSON.stringify(c.entree)}) = ${JSON.stringify(sortie)} (attendu ${JSON.stringify(c.attendu)})`) })
  // decouper : chaque passage cite ses lignes, 1 200 signes au plus, toutes les lignes non vides couvertes
  if (S.decouper) {
    const lignes = entree.texteDecoupe.split('\n')
    const couvertes = new Set()
    let precedent = 0
    for (const p of S.decouper) {
      if (!Number.isInteger(p.debut) || !Number.isInteger(p.fin) || p.debut < 1 || p.fin < p.debut || p.fin > lignes.length) { f.push(`decouper : bornes invalides ${p.debut}–${p.fin}`); continue }
      if (typeof p.texte !== 'string' || p.texte.length > 1200) f.push(`decouper : passage ${p.debut}–${p.fin} de ${p.texte?.length} signes (1 200 au plus)`)
      const joint = lignes.slice(p.debut - 1, p.fin).join('\n')
      if (!(joint === p.texte || (p.debut === p.fin && joint.includes(p.texte) && p.texte.length > 0))) f.push(`decouper : le passage ${p.debut}–${p.fin} ne reprend pas le texte de ses lignes`)
      if (p.debut < precedent) f.push('decouper : passages dans le désordre')
      precedent = p.debut
      for (let k = p.debut; k <= p.fin; k++) couvertes.add(k)
    }
    const oubliees = lignes.map((l, i) => (l.trim() && !couvertes.has(i + 1) ? i + 1 : 0)).filter(Boolean)
    if (oubliees.length) f.push(`decouper : ${oubliees.length} ligne(s) non vide(s) dans aucun passage (ex. ${oubliees[0]})`)
    const longue = lignes.findIndex((l) => l.length > 1200) + 1
    const morceaux = S.decouper.filter((p) => p.debut === longue && p.fin === longue).map((p) => p.texte).join('')
    if (morceaux !== lignes[longue - 1]) f.push('decouper : la ligne de 3 000 signes n’est pas rendue entière par ses morceaux')
  }
  if (S.decouperVide && S.decouperVide.length) f.push('decouper("") doit rendre []')
  // construireIndex : mêmes octets deux fois de suite, et quel que soit l'ordre des documents
  if (S.index) {
    if (S.index.type !== 'string' || !S.index.taille) f.push(`construireIndex : rend ${S.index.type} de ${S.index.taille} signe(s) (attendu une chaîne non vide)`)
    if (!S.index.egal) f.push('construireIndex : deux appels sur les mêmes documents rendent des octets différents')
    if (!S.index.egalInverse) f.push('construireIndex : l’ordre des documents change l’index')
    if (S.index.a && S.index.a.includes('undefined')) f.push('construireIndex : « undefined » dans l’index')
  }
  // chercherIndex : le chemin attendu au premier rang pour chacune des 12 questions
  if (Q.questions.length !== 12) f.push(`questions.json : ${Q.questions.length} question(s) (attendu 12)`)
  ;(S.recherches || []).forEach((rs, i) => { const q = Q.questions[i]; if (rs[0]?.chemin !== q.attendu) f.push(`« ${q.question} » : premier rang ${rs[0]?.chemin ?? '(rien)'} (attendu ${q.attendu})`) })
  // le filtre classes
  ;(S.filtres || []).forEach((rs, i) => {
    const q = Q.filtres[i]
    const hors = rs.filter((x) => !q.classes.includes(x.classe))
    if (hors.length) f.push(`filtre ${JSON.stringify(q.classes)} sur « ${q.question} » : ${hors.length} résultat(s) d’une autre classe (ex. ${hors[0].chemin})`)
    for (const j of q.jamais || []) if (rs.some((x) => x.chemin === j)) f.push(`filtre ${JSON.stringify(q.classes)} : ${j} rendu`)
    if (q.attendu_premier && rs[0]?.chemin !== q.attendu_premier) f.push(`filtre ${JSON.stringify(q.classes)} sur « ${q.question} » : premier rang ${rs[0]?.chemin ?? '(rien)'} (attendu ${q.attendu_premier})`)
  })
  // caviarder et fusionnerScores
  ;(S.caviarder || []).forEach((c, i) => { const a = Q.caviardage[i]; if (c?.texte !== a.texte || c?.caviardages !== a.caviardages) f.push(`caviarder(${JSON.stringify(a.entree)}) = ${JSON.stringify(c)} (attendu ${JSON.stringify({ texte: a.texte, caviardages: a.caviardages })})`) })
  if (S.fusion) {
    const k = Q.fusion.k
    const score = new Map()
    for (const liste of Q.fusion.listes) liste.forEach((x, rang) => score.set(x.id, (score.get(x.id) || 0) + 1 / (k + rang + 1)))
    const ids = S.fusion.map((x) => x.id)
    if (JSON.stringify(ids) !== JSON.stringify(Q.fusion.attendu)) f.push(`fusionnerScores : ordre ${JSON.stringify(ids)} (attendu ${JSON.stringify(Q.fusion.attendu)})`)
    for (const x of S.fusion) if (Math.abs(x.score - (score.get(x.id) ?? NaN)) > 1e-12) f.push(`fusionnerScores : score de ${x.id} ${x.score} (attendu ${score.get(x.id)}, 1/(k+rang))`)
  }
  return res('SVS-9', f)
}

// ── SVS-10 : l'indexeur et ses cloisons ──────────────────────────────────────────────────────────────────────────
function courantEssai(rt) {
  const phrases = ['Le devis part le jour même vers le client.', 'La facture suit la signature du devis.', 'Le chantier commence après l’acompte.', 'Le site vitrine présente les réalisations de l’artisan.', 'Le client pose sa question sur le site et reçoit une réponse.', 'La relance du devis dormant part au troisième jour.']
  const docsG = Array.from({ length: 4 }, (_, d) => ({ racine: 'saas', chemin: `Produit/doc-${d}.md`, classe: 'interne', texte: Array.from({ length: 30 }, (_, p) => `Paragraphe ${d}-${p}. ${phrases.map((s, k) => phrases[(k + p + d) % phrases.length]).join(' ')}`).join('\n\n') }))
  const docsP = [{ racine: 'saas', chemin: 'Prospection/Lot-Index.md', classe: 'prospects', texte: `${SENTINELLE}\nLot inventé pour l’index des prospects : Couverture Essai-Morel.\n` }, { racine: 'ops', chemin: 'prospection/cibles-index.json', classe: 'prospects', texte: `{ "note": "${SENTINELLE}" }\n` }]
  const out = {}
  for (const [c, docs] of [['general', docsG], ['prospects', docsP]]) {
    const dir = path.join(rt, c, 'courant')
    const fichiers = docs.map((x) => { const b = Buffer.from(x.texte); ecrire(path.join(dir, 'fichiers', x.racine, ...x.chemin.split('/')), b); return { racine: x.racine, chemin: x.chemin, classe: x.classe, sha256: sha256(b), octets: b.length, caviardages: 0, reclasse: false } })
    const manifeste = JSON.stringify({ version: 1, compartiment: c, exporte_le: '2026-09-28T09:00:00.000Z', fichiers, non_lus: [], ...(c === 'general' ? { prospects_compte: docsP.length } : {}) }, null, 2)
    ecrire(path.join(dir, 'manifeste.json'), manifeste)
    out[c] = { docs, sha: sha256(Buffer.from(manifeste)) }
  }
  ecrire(path.join(rt, 'a-indexer'), JSON.stringify({ recu_le: '2026-09-28T09:00:00Z' }))
  return out
}
function lancerFauxOllama(dossier) {
  const journal = path.join(dossier, 'faux-ollama.jsonl')
  const port = path.join(dossier, 'faux-ollama.port')
  const enfant = spawn(process.execPath, [FAUX_OLLAMA], { env: { ...envBase(), FAUX_OLLAMA_JOURNAL: journal, FAUX_OLLAMA_PORT: port }, stdio: 'ignore', windowsHide: true })
  for (let i = 0; i < 100 && !(existe(port) && lire(port).trim()); i++) attendre(100)
  const p = existe(port) ? Number(lire(port).trim()) : 0
  return { journal, port: p, arreter: () => { try { enfant.kill() } catch { /* déjà mort */ } } }
}
function svs10(ctx) {
  const idx = path.join(ctx.racine, CHEMINS.indexer)
  if (!existe(idx)) return res('SVS-10', [`${CHEMINS.indexer} absent de la racine jugée — l'indexeur n'est pas encore écrit`])
  const f = []
  const base = path.join(ctx.e, 'indexeur')
  nettoyer(base)
  const rt = path.join(base, 'travail')
  const C = courantEssai(rt)
  const lancer = (reglages, nom) => {
    const espion = path.join(base, `espion-reseau-${nom}.jsonl`)
    const r = noeud(['--experimental-strip-types', ...importer(TS_LOADER), ...importer(ESPION_RESEAU), idx, '--compartiment=tous', `--racine-travail=${rt}`, `--reglages=${reglages}`], { cwd: ctx.racine, env: { SAVOIR_ESPION_RESEAU: espion } })
    return { r, reseau: lireJournal(espion) }
  }
  const etat = (c) => { try { return lireJSON(path.join(rt, 'index', c, 'etat.json')) } catch { return null } }
  const fichiersIndex = (c) => listerFichiers(path.join(rt, 'index', c)).map((x) => path.join(rt, 'index', c, ...x.split('/')))
  const CHAMPS_ETAT = ['compartiment', 'fichiers', 'passages', 'manifeste_sha256', 'synchronise_le', 'indexe_le', 'semantique', 'vecteurs']
  // 1. sémantique éteinte
  const eteint = ecrireReglages(base, 'eteint', (r) => { for (const k of Object.keys(r.interrupteurs)) r.interrupteurs[k] = { actif: false, depuis: null, accord: null } }) // « éteint » posé explicitement : le fichier réel peut être allumé (05/10/2026, accord de Benj)
  let L = lancer(eteint, 'eteint')
  if (L.r.code !== 0) return res('SVS-10', [`indexeur : code ${L.r.code} — ${court(L.r.tout, 200)}`])
  for (const c of ['general', 'prospects']) {
    const E = etat(c)
    if (!E) { f.push(`index/${c}/etat.json absent ou illisible`); continue }
    if (JSON.stringify(Object.keys(E).sort()) !== JSON.stringify([...CHAMPS_ETAT].sort())) f.push(`index/${c}/etat.json : champs ${JSON.stringify(Object.keys(E))} (attendu ${CHAMPS_ETAT.join(', ')})`)
    if (E.compartiment !== c) f.push(`index/${c}/etat.json : compartiment ${E.compartiment}`)
    if (E.fichiers !== C[c].docs.length) f.push(`index/${c}/etat.json : fichiers ${E.fichiers} (attendu ${C[c].docs.length})`)
    if (!(Number.isInteger(E.passages) && E.passages >= C[c].docs.length)) f.push(`index/${c}/etat.json : passages ${E.passages}`)
    if (E.manifeste_sha256 !== C[c].sha) f.push(`index/${c}/etat.json : manifeste_sha256 ≠ sha256 de courant/manifeste.json`)
    for (const k of ['synchronise_le', 'indexe_le']) if (!Number.isFinite(Date.parse(E[k]))) f.push(`index/${c}/etat.json : ${k} n'est pas une date`)
    if (E.vecteurs !== 0) f.push(`index/${c}/etat.json : vecteurs ${E.vecteurs} alors que la sémantique est éteinte`)
    const autres = fichiersIndex(c).filter((p) => path.basename(p) !== 'etat.json' && fs.statSync(p).size > 0)
    if (!autres.length) f.push(`index/${c} : aucun fichier d’index (hors etat.json) non vide`)
  }
  if (etat('general') && etat('general').semantique !== 'eteinte') f.push(`sémantique éteinte : etat general.semantique ${JSON.stringify(etat('general').semantique)} (attendu "eteinte")`)
  for (const p of fichiersIndex('general')) if (fs.readFileSync(p).toString('utf8').includes(SENTINELLE)) f.push(`${SENTINELLE} dans l'index general : ${path.basename(p)}`)
  if (!fichiersIndex('prospects').some((p) => fs.readFileSync(p).toString('utf8').includes(SENTINELLE))) f.push('l’index prospects ne porte pas la sentinelle : il n’indexe pas son compartiment')
  if (L.reseau.length) f.push(`sémantique éteinte : ${L.reseau.length} connexion(s) relevée(s) (ex. ${L.reseau[0].hote})`)
  if (existe(path.join(rt, 'a-indexer'))) f.push('a-indexer non retiré après l’indexation')
  // La ligne « savoir index » au journal du chef (<rt>/../chef/cycles.jsonl : ce que lit `presti-journal chef`, SVS-R2).
  const journalChef = path.join(path.dirname(rt), 'chef', 'cycles.jsonl')
  const jl = lireJournal(journalChef).filter((x) => x.evenement === 'savoir index')
  if (!jl.some((x) => x.compartiment === 'general' && x.manifeste_sha256 === C.general.sha && x.code === 0 && Number.isFinite(Date.parse(x.le)))) f.push('journal du chef (<racine-travail>/../chef/cycles.jsonl) : aucune ligne « savoir index » du compartiment general (le, code 0, manifeste_sha256)')
  if (existe(journalChef) && lire(journalChef).includes(SENTINELLE)) f.push('journal du chef : la sentinelle des prospects y est écrite')
  // 2. sémantique allumée vers le faux Ollama local : general seulement, lots de 16 au plus, jamais la sentinelle
  const faux = lancerFauxOllama(base)
  try {
    if (!faux.port) return res('SVS-10', [...f, 'faux-ollama : aucun port (serveur d’essai non démarré)'])
    const allume = ecrireReglages(base, 'allume', (r) => { allumer(r, 'semantique'); r.semantique = { url: `http://127.0.0.1:${faux.port}`, modele: MODELE_ESSAI } })
    L = lancer(allume, 'allume')
    const corps = lireJournal(faux.journal).filter((x) => x.methode === 'POST')
    const entrees = []
    for (const x of corps) {
      if (x.url !== '/api/embed') { f.push(`faux-ollama : appel ${x.url} (attendu /api/embed)`); continue }
      let j
      try { j = JSON.parse(x.corps) } catch { f.push('faux-ollama : corps illisible'); continue }
      const lot = Array.isArray(j.input) ? j.input : [j.input]
      if (lot.length > 16) f.push(`faux-ollama : lot de ${lot.length} passages (16 au plus)`)
      if (j.model !== MODELE_ESSAI) f.push(`faux-ollama : modèle ${j.model} (attendu ${MODELE_ESSAI})`)
      entrees.push(...lot)
    }
    if (L.r.code !== 0) f.push(`sémantique allumée : code ${L.r.code} — ${court(L.r.tout, 140)}`)
    if (entrees.length < 17) f.push(`sémantique allumée : ${entrees.length} passage(s) envoyé(s) (attendu tous les passages general, plus de 16 ici)`)
    if (entrees.some((t) => String(t).includes(SENTINELLE))) f.push('sémantique allumée : la sentinelle des prospects est partie vers le modèle d’embeddings')
    const textesG = C.general.docs.map((d) => d.texte)
    const etrangers = entrees.filter((t) => !textesG.some((d) => d.includes(String(t))))
    if (etrangers.length) f.push(`sémantique allumée : ${etrangers.length} passage(s) envoyé(s) qui ne viennent pas de general`)
    const Eg = etat('general')
    if (Eg?.semantique !== 'active') f.push(`sémantique allumée : etat general.semantique ${JSON.stringify(Eg?.semantique)} (attendu "active")`)
    if (Eg?.vecteurs !== entrees.length) f.push(`sémantique allumée : etat general.vecteurs ${Eg?.vecteurs} (attendu ${entrees.length})`)
    if (etat('prospects')?.vecteurs !== 0) f.push(`prospects : ${etat('prospects')?.vecteurs} vecteur(s) (jamais)`)
    const autresHotes = L.reseau.filter((x) => !['127.0.0.1', 'localhost'].includes(String(x.hote)) || (x.port && Number(x.port) !== faux.port))
    if (autresHotes.length) f.push(`sémantique allumée : connexion vers ${autresHotes[0].hote}:${autresHotes[0].port} (seul le faux Ollama local est permis)`)
    if (!L.reseau.length) f.push('sémantique allumée : espion-reseau n’a rien relevé (l’espion ne voit pas les connexions)')
    // 3. second passage sans changement : rien de renvoyé
    const avant = lireJournal(faux.journal).length
    L = lancer(allume, 'allume-bis')
    if (L.r.code !== 0) f.push(`second passage : code ${L.r.code}`)
    if (lireJournal(faux.journal).length !== avant) f.push(`second passage sans changement : ${lireJournal(faux.journal).length - avant} appel(s) de plus au modèle`)
    if (etat('general')?.vecteurs !== entrees.length) f.push(`second passage : vecteurs ${etat('general')?.vecteurs} (attendu ${entrees.length}, gardés)`)
    // 4. url hors 127.0.0.1/localhost, modèle :cloud → refusee, aucune connexion
    for (const [nom, modif] of [['url-distante', (r) => { r.semantique = { url: 'http://10.20.30.40:11434', modele: MODELE_ESSAI } }], ['url-hote-trompeur', (r) => { r.semantique = { url: `http://127.0.0.1.nip.io:${faux.port}`, modele: MODELE_ESSAI } }], ['modele-cloud', (r) => { r.semantique = { url: `http://127.0.0.1:${faux.port}`, modele: `${MODELE_ESSAI}:cloud` } }], ['modele-tiret-cloud', (r) => { r.semantique = { url: `http://127.0.0.1:${faux.port}`, modele: 'gpt-oss:120b-cloud' } }]]) {
      const p = ecrireReglages(base, nom, (r) => { allumer(r, 'semantique'); modif(r) })
      const n = lireJournal(faux.journal).length
      L = lancer(p, nom)
      if (L.r.code !== 0) f.push(`${nom} : code ${L.r.code}`)
      if (etat('general')?.semantique !== 'refusee') f.push(`${nom} : etat general.semantique ${JSON.stringify(etat('general')?.semantique)} (attendu "refusee")`)
      if (L.reseau.length) f.push(`${nom} : ${L.reseau.length} connexion(s) tentée(s) (ex. ${L.reseau[0].hote}) — aucune n’est permise`)
      if (lireJournal(faux.journal).length !== n) f.push(`${nom} : le faux Ollama a été appelé`)
    }
  } finally { faux.arreter() }
  return res('SVS-10', f)
}

// ── SVS-11 : les unités ──────────────────────────────────────────────────────────────────────────────────────────
/** Analyseur INI de systemd : sections, clés répétées, commentaires, continuations. */
function lireUnite(texte) {
  const U = {}
  let section = null
  const lignes = texte.replace(/\\\r?\n/g, ' ').split(/\r?\n/)
  for (const brute of lignes) {
    const l = brute.trim()
    if (!l || l.startsWith('#') || l.startsWith(';')) continue
    const s = /^\[([^\]]+)\]$/.exec(l)
    if (s) { section = s[1]; U[section] ??= {}; continue }
    const eg = l.indexOf('=')
    if (eg < 0 || !section) continue
    const k = l.slice(0, eg).trim()
    const v = l.slice(eg + 1).trim()
    ;(U[section][k] ??= []).push(v)
  }
  return U
}
function svs11(ctx) {
  const dir = path.join(ctx.racine, CHEMINS.systemd)
  const f = []
  const U = {}
  for (const n of ['presti-chef-savoir-recevoir.service', 'presti-chef-savoir-recevoir.path', 'presti-chef-savoir-index.service', 'presti-chef-savoir-index.path']) {
    const p = path.join(dir, n)
    if (!existe(p)) { f.push(`${CHEMINS.systemd}/${n} absent`); continue }
    const t = lire(p)
    if (!t.trim()) { f.push(`${n} : 0 octet`); continue }
    U[n] = { texte: t, ini: lireUnite(t) }
  }
  if (f.length) return res('SVS-11', f)
  const un = (n, s, k) => U[n].ini[s]?.[k]
  const exige = (n, s, k, v) => { const x = un(n, s, k); if (!x || x.length !== 1 || x[0] !== v) f.push(`${n} [${s}] ${k}=${x ? x.join(' | ') : '(absent)'} (attendu ${v})`) }
  for (const n of ['presti-chef-savoir-recevoir.service', 'presti-chef-savoir-index.service']) {
    exige(n, 'Service', 'Type', 'oneshot')
    exige(n, 'Service', 'User', 'agents')
    exige(n, 'Service', 'WorkingDirectory', '/srv/presti-agents')
    exige(n, 'Service', 'IPAddressDeny', 'any')
    for (const [s, cles] of Object.entries(U[n].ini)) if (cles.EnvironmentFile) f.push(`${n} [${s}] EnvironmentFile= présent (aucun secret n'y sert)`)
    if (/avec-coffre/.test(U[n].texte)) f.push(`${n} : avec-coffre cité (aucun secret n'y sert)`)
    if (/\.config\/presti|agents\.env|presti-secrets/.test(U[n].texte)) f.push(`${n} : cite un fichier de secrets`)
  }
  if (un('presti-chef-savoir-recevoir.service', 'Service', 'IPAddressAllow')) f.push('presti-chef-savoir-recevoir.service : IPAddressAllow= présent (la réception n’a aucun besoin réseau)')
  const allow = (un('presti-chef-savoir-index.service', 'Service', 'IPAddressAllow') || []).join(' ').split(/\s+/).filter(Boolean)
  if (JSON.stringify(allow) !== JSON.stringify(['localhost'])) f.push(`presti-chef-savoir-index.service IPAddressAllow=${allow.join(' ') || '(absent)'} (attendu localhost seul)`)
  const exec = (n) => { const x = un(n, 'Service', 'ExecStart') || []; if (x.length !== 1) f.push(`${n} : ${x.length} ExecStart= (attendu 1)`); return (x[0] || '').split(/\s+/).filter(Boolean) }
  const noeudOk = (t) => /^(\/usr\/bin\/|\/usr\/local\/bin\/)?node$/.test(t || '')
  const er = exec('presti-chef-savoir-recevoir.service')
  const optRt = (t) => t.length === 0 || (t.length === 1 && t[0] === '--racine-travail=/home/agents/travail/savoir')
  if (!(noeudOk(er[0]) && er[1] === 'scripts/usine/savoir-recevoir.mjs' && er[2] === '--depot=/srv/presti-savoir/depot' && optRt(er.slice(3)))) f.push(`presti-chef-savoir-recevoir.service ExecStart=${er.join(' ')} (attendu node scripts/usine/savoir-recevoir.mjs --depot=/srv/presti-savoir/depot)`)
  const ei = exec('presti-chef-savoir-index.service')
  if (!(noeudOk(ei[0]) && JSON.stringify(ei.slice(1, 6)) === JSON.stringify(['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/savoir/indexer.mjs', '--compartiment=tous']) && optRt(ei.slice(6)))) f.push(`presti-chef-savoir-index.service ExecStart=${ei.join(' ')} (attendu node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir/indexer.mjs --compartiment=tous)`)
  exige('presti-chef-savoir-recevoir.path', 'Path', 'PathExistsGlob', '/srv/presti-savoir/depot/*.pret')
  exige('presti-chef-savoir-recevoir.path', 'Path', 'Unit', 'presti-chef-savoir-recevoir.service')
  exige('presti-chef-savoir-index.path', 'Path', 'PathExists', '/home/agents/travail/savoir/a-indexer')
  exige('presti-chef-savoir-index.path', 'Path', 'Unit', 'presti-chef-savoir-index.service')
  // Les sources lancées par ces unités : ni child_process, ni fichier de secrets.
  for (const c of [CHEMINS.recevoir, CHEMINS.indexer, CHEMINS.index]) {
    const p = path.join(ctx.racine, c)
    if (!existe(p)) { f.push(`${c} absent (lancé par une unité)`); continue }
    const t = lire(p)
    for (const interdit of ['child_process', '.config/presti', 'agents.env', 'presti-secrets']) if (t.includes(interdit)) f.push(`${c} cite « ${interdit} »`)
  }
  return res('SVS-11', f)
}

// ── SVS-12 : hygiène ─────────────────────────────────────────────────────────────────────────────────────────────
function git(args, cwd) { const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }); return r.status === 0 ? r.stdout.trim() : null }
let STATUT_AVANT_DEPOT = null
const TYPECHECKS = new Map()
function importsDe(texte) {
  const out = []
  for (const re of [/\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, /^\s*import\s+['"]([^'"]+)['"]/gm, /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g]) for (const m of texte.matchAll(re)) out.push(m[1])
  return out
}
function svs12(ctx) {
  const racine = ctx.racine
  const f = []
  // Aucune dépendance nouvelle : les scripts du savoir n'importent que node:, du relatif ou l'alias @/.
  for (const c of [CHEMINS.exporter, CHEMINS.envoyer, CHEMINS.synchroniser, CHEMINS.recevoir, CHEMINS.indexer, CHEMINS.index]) {
    const p = path.join(racine, c)
    if (!existe(p)) continue
    for (const s of importsDe(lire(p))) if (!/^(node:|\.{1,2}\/|@\/)/.test(s)) f.push(`${c} importe « ${s} » (dépendance nouvelle : node:, relatif ou @/ seulement)`)
  }
  const pkgRacine = path.join(racine, 'package.json')
  if (cle(racine) === cle(DEPOT)) {
    const head = git(['show', 'HEAD:package.json'], DEPOT)
    const enTree = existe(pkgRacine) ? lire(pkgRacine).replace(/\r\n/g, '\n').trim() : null
    if (head !== null && enTree !== null && enTree !== head.replace(/\r\n/g, '\n').trim()) f.push('package.json diffère de HEAD (aucune dépendance ne doit être ajoutée)')
    const tc = noeud([TSC, '--noEmit'], { cwd: DEPOT, timeout: 900000 })
    if (tc.code !== 0) f.push(`npm run typecheck (tsc --noEmit) : code ${tc.code} — ${court(tc.tout.split('\n').filter((l) => /error TS/.test(l)).slice(0, 3).join(' | ') || tc.tout, 300)}`)
    const statutMaintenant = git(['status', '--porcelain'], DEPOT) || ''
    const versEnsemble = (s) => new Set(s.split('\n').filter(Boolean).map((l) => l.slice(3)).filter((p) => !p.startsWith('.orchestre/travail/') && !p.startsWith('.orchestre/preuves/')))
    const avant = versEnsemble(STATUT_AVANT_DEPOT || statutMaintenant)
    const nouveaux = [...versEnsemble(statutMaintenant)].filter((p) => !avant.has(p))
    if (nouveaux.length) f.push(`git status : chemin(s) apparu(s) pendant ce passage, hors .orchestre/travail/ et preuves/ : ${nouveaux.slice(0, 6).join(' | ')}`)
  } else {
    if (existe(pkgRacine) && lire(pkgRacine) !== lire(path.join(DEPOT, 'package.json'))) f.push('package.json de la racine jugée diffère de celui du dépôt')
    // Typecheck du module TypeScript de la racine (strict), une fois par contenu.
    const mod = path.join(racine, CHEMINS.index)
    if (existe(mod)) {
      const k = sha256(fs.readFileSync(mod))
      if (!TYPECHECKS.has(k)) {
        const tc = noeud([TSC, '--noEmit', '--strict', '--target', 'ES2022', '--lib', 'es2022', '--module', 'esnext', '--moduleResolution', 'bundler', '--allowImportingTsExtensions', '--skipLibCheck', mod], { cwd: racine, timeout: 300000 })
        TYPECHECKS.set(k, tc.code === 0 ? null : court(tc.tout.split('\n').filter((l) => /error TS/.test(l)).slice(0, 3).join(' | ') || tc.tout, 300))
      }
      if (TYPECHECKS.get(k)) f.push(`typecheck strict de ${CHEMINS.index} : ${TYPECHECKS.get(k)}`)
    }
  }
  return res('SVS-12', f)
}

// ── « C'est fini quand » : relecture à froid de sources.json contre l'inventaire du 27/09 (pas un SVS) ─────────────
function segmentGlobMatch(segment, nomDossier) {
  if (segment === '**' || segment === '*') return true
  return new RegExp(`^${segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`).test(nomDossier)
}
function motifRepond(motifs, racineNom, nomDossier) {
  return motifs.some((m) => {
    const [r, reste] = m.includes(':') ? m.split(/:(.*)/s) : [null, m]
    if (r) return r === racineNom && segmentGlobMatch(reste.split('/')[0], nomDossier)
    return reste.split('/').filter((s) => s && s !== '**').some((seg) => segmentGlobMatch(seg, nomDossier))
  })
}
function relectureAFroid(s) {
  const lignes = []
  const tousMotifs = [...s.exclusions, ...s.prospects, ...s.sources.map((e) => e.motif)]
  for (const [nom, chemin] of Object.entries(RACINES_ATTENDUES)) {
    if (nom === 'memoire') { lignes.push(`- memoire (${chemin}) : fichiers .md à plat, couverts par \`memoire:*.md\` et \`exclusions_memoire\` (EXCL de maj.sh).`); continue }
    let dossiers
    try { dossiers = fs.readdirSync(chemin, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name) } catch { lignes.push(`- ${nom} (${chemin}) : racine illisible d'ici, relecture non faite`); continue }
    const manquants = dossiers.filter((d) => !motifRepond(tousMotifs, nom, d))
    lignes.push(`- ${nom} (${chemin}) : ${dossiers.length} dossier(s) de premier niveau, ${manquants.length ? `hors contrat (ni sources, ni prospects, ni exclusions) → ${manquants.join(', ')} — hors_liste à l'export, jamais lus (liste fermée) : du code, des médias, des sorties dérivées, pas des documents du savoir. Écart volontaire.` : 'tous couverts (sources, prospects ou exclusions)'}`)
  }
  return lignes
}

// ── --reel : la mise en service (026-241), jugée sans qu'elle se juge elle-même ─────────────────────────────────────
// Sur le poste. L'usine se joint par ssh (clé ~/.ssh/presti-usine, BatchMode ; PRESTI_SSH_BIN pour un essai) ; les
// fichiers du compte agents ne se lisent que par `sudo -n -u agents /usr/local/bin/presti-journal chef`. Aucune écriture,
// ni sur l'usine ni sur le poste. Sans clé ou usine injoignable : code 2, « usine injoignable ».
const UNITES_REEL = ['presti-chef-savoir-recevoir.service', 'presti-chef-savoir-recevoir.path', 'presti-chef-savoir-index.service', 'presti-chef-savoir-index.path']
const lf = (s) => String(s).replace(/\r\n?/g, '\n')
function hoteUsine() {
  if (process.env.PRESTI_USINE) return process.env.PRESTI_USINE
  const u = path.join(DEPOT, 'scripts', 'usine.mjs')
  const m = /PRESTI_USINE \|\| '([^']+)'/.exec(existe(u) ? lire(u) : '')
  return m ? m[1] : 'usine@88.96.53.3'
}
function sshReel(commande, delai = 60000) {
  const cleSsh = path.join(os.homedir(), '.ssh', 'presti-usine')
  const r = spawnSync(process.env.PRESTI_SSH_BIN || 'ssh', ['-i', cleSsh, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hoteUsine(), commande], { encoding: 'utf8', timeout: delai, windowsHide: true })
  return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' }
}
function reel() {
  const cleSsh = path.join(os.homedir(), '.ssh', 'presti-usine')
  if (!process.env.PRESTI_SSH_BIN && !existe(cleSsh)) { console.error(`✗ ${NOM} --reel : usine injoignable (clé ${cleSsh} absente)`); return 2 }
  const t = sshReel('echo presti-usine-ok', 30000)
  if (t.code !== 0 || !t.stdout.includes('presti-usine-ok')) { console.error(`✗ ${NOM} --reel : usine injoignable`); return 2 }
  const R = []
  const critere = (id, f) => { const d = []; try { f(d) } catch (e) { d.push(`le juge a levé une erreur : ${court(e.message, 200)}`) } R.push(res(id, d)) }
  critere('SVS-R1', (d) => {
    for (const u of UNITES_REEL) {
      const installee = sshReel(`cat /etc/systemd/system/${u}`)
      const deployee = sshReel(`cat /srv/presti-agents/scripts/usine/systemd/${u}`)
      if (installee.code !== 0) d.push(`${u} : non installée dans /etc/systemd/system`)
      else if (deployee.code !== 0) d.push(`${u} : absente du commit déployé (/srv/presti-agents)`)
      else if (lf(installee.stdout) !== lf(deployee.stdout) || !lf(deployee.stdout).trim()) d.push(`${u} installée ≠ fichier du commit déployé (octet pour octet)`)
    }
    const v = sshReel(`systemd-analyze verify ${UNITES_REEL.map((u) => `/etc/systemd/system/${u}`).join(' ')}`)
    if (v.code !== 0) d.push(`systemd-analyze verify : code ${v.code} — ${court(v.stderr || v.stdout, 160)}`)
    for (const u of UNITES_REEL.filter((x) => x.endsWith('.path'))) {
      const e = sshReel(`systemctl is-enabled ${u}; systemctl is-active ${u}`).stdout.split(/\s+/).filter(Boolean)
      if (e[0] !== 'enabled' || e[1] !== 'active') d.push(`${u} : ${e.join(' ') || 'rien'} (enabled et active attendus)`)
    }
    const st = sshReel(`stat -c '%U:%G %a' ${DEPOT_DISTANT}`).stdout.trim()
    if (st !== 'agents:agents 2770') d.push(`${DEPOT_DISTANT} : ${st || 'absent'} (agents:agents 2770 attendu)`)
    const vieux = sshReel(`find ${DEPOT_DISTANT} -mindepth 1 -maxdepth 1 -mmin +10 | wc -l`)
    if (vieux.code !== 0 || vieux.stdout.trim() !== '0') d.push(`${DEPOT_DISTANT} : ${vieux.stdout.trim() || '?'} fichier(s) de plus de 10 min (la réception ne suit pas)`)
  })
  critere('SVS-R2', (d) => {
    const j = sshReel('sudo -n -u agents /usr/local/bin/presti-journal chef 500')
    if (j.code !== 0) d.push(`presti-journal chef : code ${j.code} — ${court(j.stderr, 120)}`)
    const lignes = lf(j.stdout).split('\n').map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    const ops = lireJSON(path.join(DEPOT, 'docs', 'savoir', 'sources.json')).racines.ops
    const manif = path.join(ops, 'savoir', 'export', 'general', 'manifeste.json')
    const sha = existe(manif) ? sha256(fs.readFileSync(manif)) : null
    if (!sha) d.push(`pas d'export general sur le poste (${manif})`)
    const recentes = lignes.filter((x) => x.evenement === 'savoir index' && x.compartiment === 'general' && x.code === 0 && Date.now() - Date.parse(x.le) < 26 * 3_600_000)
    if (!recentes.length) d.push('aucune ligne « savoir index » general en code 0 de moins de 26 h au journal du chef')
    else if (sha && recentes.at(-1).manifeste_sha256 !== sha) d.push('la dernière indexation n’est pas celle du dernier export general du poste (manifeste_sha256)')
    if (lf(j.stdout).includes(SENTINELLE)) d.push('le journal du chef porte la sentinelle des prospects')
  })
  critere('SVS-R3', (d) => {
    const e = lireJSON(path.join(DEPOT, 'docs', 'savoir', 'reglages.json')).interrupteurs?.envoi
    if (e?.actif !== true) d.push('docs/savoir/reglages.json : interrupteur envoi éteint')
    else {
      if (!Number.isFinite(Date.parse(e.depuis))) d.push(`envoi.depuis : ${JSON.stringify(e.depuis)} (une date attendue)`)
      if (!/benj/i.test(String(e.accord || ''))) d.push('envoi.accord ne cite pas l’accord de Benj')
    }
    if (!WIN) { d.push('tâche Windows « Presti savoir » : --reel se juge sur le poste (Windows)'); return }
    const r = spawnSync('schtasks', ['/Query', '/XML', '/TN', 'Presti savoir'], { encoding: 'utf8', windowsHide: true })
    const x = String(r.stdout || '')
    if (r.status !== 0) { d.push('tâche Windows « Presti savoir » absente'); return }
    if (!x.includes('<Interval>PT2H</Interval>')) d.push('Presti savoir : répétition PT2H absente')
    if (!/<Command>[^<]*node(\.exe)?"?<\/Command>/i.test(x)) d.push('Presti savoir : la commande n’est pas node')
    if (!/<Arguments>[^<]*scripts\\savoir\\synchroniser\.mjs[^<]*<\/Arguments>/i.test(x)) d.push('Presti savoir : l’action n’est pas node scripts\\savoir\\synchroniser.mjs')
    if (!/<WorkingDirectory>[^<]*[\\/]presti[\\/]?<\/WorkingDirectory>/i.test(x)) d.push('Presti savoir : répertoire de travail autre que presti')
  })
  critere('SVS-R4', (d) => {
    const p = path.join(DEPOT, 'docs', 'registre-traitements.md')
    const t = existe(p) ? lf(lire(p)) : ''
    const m = /^(#+)[^\n]*Le savoir des agents[^\n]*$/m.exec(t)
    if (!m) { d.push('docs/registre-traitements.md : section « Le savoir des agents » absente'); return }
    const reste = t.slice(m.index + m[0].length)
    const fin = reste.search(new RegExp(`^#{1,${m[1].length}}\\s`, 'm'))
    const s = fin < 0 ? reste : reste.slice(0, fin)
    for (const [quoi, re] of [['le compartiment prospects de l’usine', /prospects/i], ['Codex parmi les destinataires', /codex/i], ['les modèles locaux parmi les destinataires', /mod[èe]les? locaux|local/i], ['« aucune IA gratuite »', /aucune IA gratuite/i], ['la durée : remplacé à chaque synchronisation', /synchronisation/i], ['la durée : une copie précédente', /pr[ée]c[ée]dente/i]]) if (!re.test(s)) d.push(`section « Le savoir des agents » : ${quoi} absent`)
  })
  for (const l of imprimer(R)) console.log(l)
  return R.every((r) => r.ok) ? 0 : 1
}

// ── batterie ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SVS_FN = { 'SVS-1': svs1, 'SVS-2': svs2, 'SVS-3': svs3, 'SVS-4': svs4, 'SVS-5': svs5, 'SVS-6': svs6, 'SVS-7': svs7, 'SVS-8': svs8, 'SVS-9': svs9, 'SVS-10': svs10, 'SVS-11': svs11, 'SVS-12': svs12 }
function idsPourParties(parties) {
  const ids = ['SVS-1']
  for (const p of GROUPES) if (parties.includes(p)) ids.push(...SVS_DE_GROUPE[p])
  ids.push('SVS-12')
  return ids
}
function lancerBatterie(racine, parties, etiquette) {
  const ctx = { racine: path.resolve(racine), e: path.join(ESSAIS, etiquette), cache: {} }
  nettoyer(ctx.e)
  fs.mkdirSync(ctx.e, { recursive: true })
  return idsPourParties(parties).map((id) => {
    try { return SVS_FN[id](ctx) } catch (e) { return res(id, [`le juge a levé une erreur : ${court(e.stack || e.message, 300)}`]) }
  })
}
function imprimer(resultats) {
  const lignes = []
  for (const r of resultats) {
    lignes.push(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} — ${r.ok ? 'ok' : r.detail[0]}`)
    if (!r.ok) for (const d of r.detail.slice(1, 12)) lignes.push(`  ✗ ${d}`)
    if (!r.ok && r.detail.length > 12) lignes.push(`  … ${r.detail.length - 12} défaut(s) de plus`)
  }
  const echecs = resultats.filter((r) => !r.ok)
  lignes.push(`${NOM} : ${echecs.length ? 'FAIL' : 'PASS'} — ${echecs.length ? echecs.map((r) => r.id).join(', ') : 'tout vert'}`)
  return lignes
}
/** Copie le témoin (et le module des motifs de secrets du dépôt, que l'export importe) dans un dossier de travail. */
function preparerTemoin(dossier) {
  nettoyer(dossier)
  fs.mkdirSync(dossier, { recursive: true })
  if (!existe(TEMOIN_SRC)) return false
  fs.cpSync(TEMOIN_SRC, dossier, { recursive: true })
  const q = path.join(dossier, 'scripts', 'instantane-quotidien.mjs')
  if (!existe(q)) ecrire(q, fs.readFileSync(QUOTIDIEN))
  return true
}
function finir(code) {
  if (process.env.SAVOIR_SOCLE_QA_GARDER !== '1') nettoyer(ESSAIS)
  process.exit(code)
}

// ── entrée ───────────────────────────────────────────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2)
const CONNUS = ['partie', 'racine', 'temoin', 'preuve-echecs', 'reel']
for (const a of ARGS) {
  const m = /^--([a-z-]+)(=.*)?$/.exec(a)
  if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (attendus : --partie=, --racine=, --temoin, --preuve-echecs, --reel)`); process.exit(2) }
}
const option = (nom) => { const a = ARGS.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : null }
const drapeau = (nom) => ARGS.includes(`--${nom}`)
const optPartie = option('partie')
if (optPartie) for (const p of optPartie.split(',')) if (!GROUPES.includes(p)) { console.error(`✗ ${NOM} : partie inconnue « ${p} » (attendues : ${GROUPES.join(', ')})`); process.exit(2) }
const parties = optPartie ? optPartie.split(',') : GROUPES

if (drapeau('reel')) process.exit(reel())
for (const [quoi, p] of [['ts-loader', TS_LOADER], ['typescript', TSC], ['instantane-quotidien', QUOTIDIEN], ['maj.sh', MAJ_SH], ['racines factices', RACINES_SRC], ['sources-essai.json', SOURCES_ESSAI_SRC], ['attendu-export.json', ATTENDU_SRC], ['questions.json', QUESTIONS_SRC], ['espion-fs', ESPION_FS], ['espion-reseau', ESPION_RESEAU], ['faux-ssh', FAUX_SSH], ['faux-ollama', FAUX_OLLAMA]]) {
  if (!existe(p)) { console.error(`✗ ${NOM} : préalable absent — ${quoi} (${rel(p)})`); process.exit(2) }
}
fs.mkdirSync(TRAVAIL, { recursive: true })
fs.mkdirSync(PREUVES, { recursive: true })
STATUT_AVANT_DEPOT = git(['status', '--porcelain'], DEPOT) || ''

if (drapeau('preuve-echecs')) {
  const t0 = Date.now()
  const rapport = []
  rapport.push('# 026-229 — preuve d\'échecs (savoir-socle-qa)\n')
  rapport.push(`Généré le ${new Date().toISOString()} par \`node scripts/savoir-socle-qa.mjs --preuve-echecs\`.\n`)
  rapport.push('## Écart noté en tête — relecture à froid de sources.json contre l\'inventaire du 27/09\n')
  try { for (const l of relectureAFroid(lireJSON(path.join(DEPOT, 'docs', 'savoir', 'sources.json')))) rapport.push(`${l}\n`) } catch (e) { rapport.push(`(relecture non faite : ${e.message})\n`) }
  rapport.push('28/09 : relecture — défaut bloquant corrigé avant la production : `interne` ne va jamais vers un moteur gratuit (`moteurs` de sources.json, SVS-1, sabotage S01).\n')

  // (a) l'arbre courant : code ≠ 0, SVS-2 premier échec
  const resArbre = lancerBatterie(DEPOT, GROUPES, 'depot')
  const premierEchec = resArbre.find((r) => !r.ok)
  const aOk = premierEchec?.id === PREMIER_ECHEC_ATTENDU
  rapport.push(`## (a) Arbre courant du dépôt — attendu : échec, ${PREMIER_ECHEC_ATTENDU} en premier\n`)
  rapport.push(`\`\`\`\n${imprimer(resArbre).join('\n')}\n\`\`\`\n`)
  rapport.push(`Verdict (a) : ${aOk ? 'CONFORME' : 'NON CONFORME'} — premier échec réel : ${premierEchec?.id || '(aucun)'}\n`)

  // (d) SVS-1 seul sur le dépôt : vert
  const resSvs1 = svs1({ racine: DEPOT })
  const dOk = resSvs1.ok
  rapport.push('## (d) SVS-1 seul sur le dépôt — attendu : vert\n')
  rapport.push(`\`\`\`\n${imprimer([resSvs1]).join('\n')}\n\`\`\`\n`)

  // (b) le témoin : vert, et ses copies du contrat identiques à celles du dépôt
  const dossierTemoin = path.join(TRAVAIL, 'temoin')
  let bOk = false
  rapport.push('## (b) Témoin (scripts/fixtures/026/savoir/socle/temoin/) — attendu : vert\n')
  if (!preparerTemoin(dossierTemoin)) rapport.push(`Témoin absent : \`${rel(TEMOIN_SRC)}\`. Non conforme.\n`)
  else {
    const copies = ['sources.json', 'reglages.json'].filter((n) => { const a = path.join(TEMOIN_SRC, 'docs', 'savoir', n); return !existe(a) || lire(a) !== lire(path.join(DEPOT, 'docs', 'savoir', n)) })
    const resTemoin = lancerBatterie(dossierTemoin, GROUPES, 'temoin')
    rapport.push(`\`\`\`\n${imprimer(resTemoin).join('\n')}\n\`\`\`\n`)
    if (copies.length) rapport.push(`Copies du contrat du témoin différentes de celles du dépôt : ${copies.join(', ')}.\n`)
    bOk = resTemoin.every((r) => r.ok) && !copies.length
    rapport.push(`Verdict (b) : ${bOk ? 'CONFORME' : 'NON CONFORME'}\n`)
  }

  // (c) chaque sabotage : code ≠ 0, son critère en échec (S01 : SVS-1 seul, sur toutes les parties)
  rapport.push('## (c) Sabotages (scripts/fixtures/026/savoir/socle/sabotages.json) — attendu : chaque sabotage fait échouer son critère\n')
  let cOk = false
  if (!existe(SABOTAGES_SRC)) rapport.push(`Absent : \`${rel(SABOTAGES_SRC)}\`. Non conforme.\n`)
  else {
    let sabotages = []
    try { sabotages = lireJSON(SABOTAGES_SRC) } catch (e) { rapport.push(`illisible : ${e.message}\n`) }
    const lignesSab = []
    let tousOk = Array.isArray(sabotages) && sabotages.length >= 10
    if (!tousOk) lignesSab.push(`sabotages.json : ${Array.isArray(sabotages) ? sabotages.length : 0} sabotage(s) (attendu au moins 10)`)
    const criteres = new Set()
    for (const s of Array.isArray(sabotages) ? sabotages : []) {
      const dossierSab = path.join(TRAVAIL, 'sabotages', String(s.id))
      preparerTemoin(dossierSab)
      const cible = path.join(dossierSab, ...String(s.fichier || '').split('/'))
      let applique = false
      if (s.fichier && existe(cible) && typeof s.avant === 'string' && typeof s.apres === 'string') {
        const contenu = lire(cible)
        // Un témoin extrait en CRLF (core.autocrlf) garde ses sabotages : les fins de ligne suivent celles du fichier.
        const crlf = contenu.includes('\r\n')
        const avant = crlf ? s.avant.replace(/\r?\n/g, '\r\n') : s.avant
        const apres = crlf ? s.apres.replace(/\r?\n/g, '\r\n') : s.apres
        if (contenu.split(avant).length === 2) { fs.writeFileSync(cible, contenu.replace(avant, () => apres)); applique = true }
      }
      if (!applique) { lignesSab.push(`${s.id} : remplacement introuvable ou ambigu dans le témoin (${s.fichier})`); tousOk = false; continue }
      const seul = Boolean(s.seul)
      const partiesSab = seul ? GROUPES : [GROUPE_DE_SVS[s.critere]].filter(Boolean)
      const resSab = lancerBatterie(dossierSab, partiesSab, `sabotage-${s.id}`)
      const pris = resSab.find((r) => r.id === s.critere && !r.ok)
      const autres = resSab.filter((r) => !r.ok && r.id !== s.critere)
      const ok = Boolean(pris) && (!seul || autres.length === 0)
      if (!ok) tousOk = false
      criteres.add(s.critere)
      lignesSab.push(`${s.id} (${s.fichier}) → attendu ${s.critere}${seul ? ' SEUL' : ''} en échec : ${ok ? 'pris' : 'NON'} — ${pris ? court(pris.detail[0], 160) : `échecs : ${resSab.filter((r) => !r.ok).map((r) => r.id).join(', ') || 'aucun'}`}${autres.length ? ` (aussi : ${autres.map((r) => r.id).join(', ')})` : ''}`)
      nettoyer(dossierSab)
      if (process.env.SAVOIR_SOCLE_QA_GARDER !== '1') nettoyer(path.join(ESSAIS, `sabotage-${s.id}`))
    }
    const nonCouverts = Object.keys(SVS_FN).filter((id) => id !== 'SVS-12' && !criteres.has(id))
    if (nonCouverts.length) { lignesSab.push(`critères sans sabotage : ${nonCouverts.join(', ')}`); tousOk = false }
    rapport.push(`\`\`\`\n${lignesSab.join('\n')}\n\`\`\`\n`)
    cOk = tousOk
    rapport.push(`Verdict (c) : ${cOk ? 'CONFORME' : 'NON CONFORME'}\n`)
  }

  const global = aOk && bOk && cOk && dOk
  rapport.push('## Bilan\n')
  rapport.push(`(a) ${aOk ? 'ok' : 'NON'} · (b) ${bOk ? 'ok' : 'NON'} · (c) ${cOk ? 'ok' : 'NON'} · (d) ${dOk ? 'ok' : 'NON'} · ${Math.round((Date.now() - t0) / 1000)} s\n`)
  rapport.push(`**026-229 : ${global ? 'PASS' : 'FAIL'}**\n`)
  fs.writeFileSync(path.join(PREUVES, 'echecs-attendus.md'), rapport.join('\n'))
  console.log(imprimer(resArbre).join('\n'))
  console.log(`\n--preuve-echecs : (a)=${aOk} (b)=${bOk} (c)=${cOk} (d)=${dOk} → ${global ? 'PASS' : 'FAIL'}`)
  console.log(`preuve : ${rel(path.join(PREUVES, 'echecs-attendus.md'))}`)
  nettoyer(dossierTemoin)
  finir(global ? 0 : 1)
}

// ── mode normal / --temoin / --racine ────────────────────────────────────────────────────────────────────────────
let racine = option('racine') ? path.resolve(option('racine')) : DEPOT
let etiquette = option('racine') ? 'racine' : 'depot'
if (drapeau('temoin')) {
  racine = path.join(TRAVAIL, 'temoin')
  etiquette = 'temoin'
  if (!preparerTemoin(racine)) { console.error(`✗ ${NOM} --temoin : ${rel(TEMOIN_SRC)} n'existe pas`); process.exit(1) }
}
const resultats = lancerBatterie(racine, parties, etiquette)
for (const l of imprimer(resultats)) console.log(l)
finir(resultats.every((r) => r.ok) ? 0 : 1)
