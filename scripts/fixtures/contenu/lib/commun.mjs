// scripts/fixtures/contenu/lib/commun.mjs — petites mains partagées par contenu-qa.mjs, contenu-ecran-qa.mjs et
// juges-026-reseaux-preuve.mjs (fiche 026-204, écrit par Claude Code). Rien ici n'importe une clé réelle ni ne parle
// à un vrai réseau : les seules E/S sont vers des faux serveurs démarrés par CE juge (127.0.0.1) et vers le faux
// `jev` de scripts/fixtures/contenu/lib/faux-jev.mjs.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const WIN = process.platform === 'win32'
export const ICI = path.dirname(fileURLToPath(import.meta.url)) // scripts/fixtures/contenu/lib
export const FIXTURES = path.dirname(ICI) // scripts/fixtures/contenu
export const DEPOT = path.resolve(FIXTURES, '..', '..', '..') // racine du dépôt
export const TEMOIN = path.join(FIXTURES, 'temoin') // scripts/fixtures/contenu/temoin
export const TS_LOADER = path.join(DEPOT, 'scripts', 'ts-loader.mjs')
export const EXECUTER = path.join(ICI, 'executer.mjs')
export const EXECUTER_META = path.join(ICI, 'executer-meta.mjs')
export const EXECUTER_EXPORTS = path.join(ICI, 'executer-exports.mjs')
export const FAUX_JEV = path.join(ICI, 'faux-jev.mjs')
export const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'contenu-qa')

// ── petites mains génériques ──────────────────────────────────────────────────────────────────────────────────────
export const existe = (p) => { try { fs.accessSync(p); return true } catch { return false } }
export const estDossier = (p) => { try { return fs.statSync(p).isDirectory() } catch { return false } }
export const lire = (p) => fs.readFileSync(p, 'utf8')
export const lireSi = (p) => (existe(p) ? lire(p) : null)
export const lireJsonSi = (p) => { const t = lireSi(p); if (t === null) return null; try { return JSON.parse(t) } catch { return undefined } }
export const court = (s, n = 220) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
export function garantirDossier(d) { fs.mkdirSync(d, { recursive: true }); return d }
export function hasard(n = 8) { return crypto.randomBytes(n).toString('hex') }
let compteurTravail = 0
export function dossierTravail(...sous) { const d = path.join(TRAVAIL, ...sous, `${Date.now()}-${++compteurTravail}-${hasard(4)}`); return garantirDossier(d) }
export function vivant(pid) { if (!pid) return false; try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }
export function tuer(pid) { if (!pid) return; try { if (WIN) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(pid, 'SIGKILL') } catch { /* déjà mort */ } }

// ── résultats de critère ──────────────────────────────────────────────────────────────────────────────────────────
export const ok = (resume = '') => ({ ok: true, resume, echecs: [] })
export const fail = (echecs, resume = '') => ({ ok: false, resume, echecs: Array.isArray(echecs) ? echecs : [echecs] })
export function fusion(...res) {
  const echecs = res.flatMap((r) => r.echecs)
  return { ok: echecs.length === 0, echecs, resume: res.map((r) => r.resume).filter(Boolean).join(' ; ') }
}
export const nonJuge = (chemin) => ({ ok: null, resume: `non jugé : ${chemin} absent`, echecs: [] })
/** Combine plusieurs sous-vérifications DANS UN MÊME critère, à trois états (jamais deux) : un échec l'emporte sur
 *  tout ; sinon un non-jugé (module absent) l'emporte sur un succès — `fusion` (binaire, ci-dessus) ne sait pas
 *  distinguer un non-jugé d'un succès et dirait « ok » à tort si le seul « sous-résultat » est un module absent. */
export function fusionEtats(...res) {
  const resumes = res.map((r) => r.resume).filter(Boolean).join(' ; ')
  const echoues = res.filter((r) => r.ok === false)
  if (echoues.length) return { ok: false, echecs: echoues.flatMap((r) => r.echecs), resume: resumes }
  if (res.some((r) => r.ok === null)) return { ok: null, echecs: [], resume: resumes }
  return { ok: true, echecs: [], resume: resumes }
}

// ── sentinelles (jamais un vrai secret, jamais un vrai identifiant ; assemblées, jamais écrites d'un bloc) ─────────
export const PROSPECT_INVALID = '@presti' + '-test.invalid'
export const NOM_PIEGE = 'Jean Témoin ' + 'Plomberie'
export const TEL_PIEGE = '06 ' + '12 34 56 78'
export const EMAIL_PIEGE = 'jean.temoin' + PROSPECT_INVALID
export const SIREN_PIEGE = '912 345 678'
export const CLE_SENTINELLE = 'sk-' + 'ant-CONTENU-026-sentinelle'

// ── graphe : le dossier « racine effective » d'une partie ────────────────────────────────────────────────────────
// mode 'reel' → DEPOT (les fichiers de production, pas encore écrits : échec attendu, nommé)
// mode 'temoin' → TEMOIN (le témoin de cette fiche, mirroir des mêmes chemins relatifs)
// mode 'racine' → un --racine=<dossier> explicite (026-219 y copie une mutation)
export function racineDe({ racine, temoin }) {
  if (racine) return path.resolve(racine)
  return temoin ? TEMOIN : DEPOT
}

// ── jonction node_modules + lib/agents (026-219 copie parfois une racine sans eux) ──────────────────────────────────
const jonctionsPosees = []
export function poserJonctions(racineEff) {
  if (path.resolve(racineEff) === path.resolve(DEPOT)) return
  for (const rel of ['node_modules', 'lib' + path.sep + 'agents']) {
    const cible = path.join(racineEff, rel)
    const source = path.join(DEPOT, rel)
    if (existe(cible) || !existe(source)) continue
    try { garantirDossier(path.dirname(cible)); fs.symlinkSync(source, cible, WIN ? 'junction' : 'dir'); jonctionsPosees.push(cible) } catch { /* droits insuffisants : tant pis, les critères qui en dépendent le diront */ }
  }
  // 05/10/2026 (D-0510-A1, trou de juge vu par 026-219) : ts-loader.mjs résout `@/x` contre le premier dossier parent qui porte
  // package.json, tsconfig.json, lib/ ET app/. Une copie mutée sans `app/` n'en est donc pas une pour lui : il remonte jusqu'au dépôt
  // réel et `@/lib/contenu/lignes` (importé par accord.ts, metaPublier.ts…) rendait le code NON muté — la mutation « STOP ignoré » de
  // lignes.ts restait invisible pour GE-2. Toute racine explicite porte maintenant ces quatre repères : l'alias reste dans la racine jugée.
  for (const [rel, dossier] of [['package.json', false], ['tsconfig.json', false], ['app', true]]) {
    const repere = path.join(racineEff, rel)
    if (existe(repere)) continue
    try { if (dossier) garantirDossier(repere); else { garantirDossier(path.dirname(repere)); fs.writeFileSync(repere, '{}\n') } jonctionsPosees.push(repere) } catch { /* tant pis */ }
  }
  const admin = path.join(racineEff, 'lib', 'supabaseAdmin.ts')
  const adminSource = path.join(DEPOT, 'lib', 'supabaseAdmin.ts')
  if (!existe(admin) && existe(adminSource)) { try { garantirDossier(path.dirname(admin)); fs.copyFileSync(adminSource, admin); jonctionsPosees.push(admin) } catch { /* tant pis */ } }
}
export function retirerJonctions() {
  while (jonctionsPosees.length) { const c = jonctionsPosees.pop(); try { fs.rmSync(c, { recursive: true, force: true }) } catch { /* rien à faire */ } }
}

// ── l'enfant qui importe un module de la racine jugée (via ts-loader, @/ résolu contre CWD=racineEff) ───────────────
function envEnfant(extra = {}) {
  const garder = ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'SYSTEMDRIVE', 'LANG', 'TZ', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH']
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (garder.includes(k.toUpperCase())) env[k] = v
  return { ...env, FORCE_COLOR: '0', NO_COLOR: '1', ...extra }
}
function lancerNoeud(args, { cwd, delaiMs = 15_000 } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const p = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(TS_LOADER).href, ...args], { cwd, env: envEnfant(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = '', expire = false
    p.stdout.setEncoding('utf8'); p.stderr.setEncoding('utf8')
    p.stdout.on('data', (d) => { stdout += d }); p.stderr.on('data', (d) => { stderr += d })
    const t = setTimeout(() => { expire = true; tuer(p.pid) }, delaiMs)
    p.on('close', (code) => { clearTimeout(t); resolve({ code: expire ? 124 : code, stdout, stderr, sortie: stdout + stderr, expire, duree: Date.now() - t0 }) })
    p.on('error', (e) => { clearTimeout(t); resolve({ code: 127, stdout, stderr: `${stderr}${e.message}`, sortie: `${stdout}${stderr}${e.message}`, expire, duree: Date.now() - t0 }) })
  })
}

/**
 * Importe `<racineEff>/<moduleRel>` (chemin relatif SANS extension, résolu par ts-loader vers .ts/.tsx/index.ts) dans
 * un enfant Node, appelle `fonction(...args)` avec un dernier argument `deps` construit ici (env, enregistrerCout
 * doublé, maintenant/attendre doublés si fournis), et rend le résultat sérialisé. Jamais de vrai Supabase : `deps.env`
 * ne porte que ce que CE juge y met (voir `envSentinelle`).
 */
export async function appelerFonction({ racineEff, moduleRel, fonction, args = [], env = {}, delaiMs = 15_000, executeur = EXECUTER, extra = {} }) {
  poserJonctions(racineEff)
  const dir = dossierTravail('appel')
  const nonce = hasard(8)
  const cfg = { nonce, sortie: path.join(dir, 'sortie.json'), racineEff, moduleRel, fonction, args, depsEnv: env, ...extra }
  const cfgPath = path.join(dir, 'config.json')
  fs.writeFileSync(cfgPath, JSON.stringify(cfg))
  const r = await lancerNoeud([executeur, cfgPath], { cwd: racineEff, delaiMs })
  let brut = null
  try { brut = JSON.parse(lire(cfg.sortie)) } catch { brut = null }
  try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* .orchestre/travail : sans conséquence */ }
  if (!brut || brut.nonce !== nonce) return { ok: false, erreur: `enfant sans résultat exploitable (code ${r.code}${r.expire ? ', délai dépassé' : ''}) : ${court(r.sortie, 400)}` }
  return { ok: true, erreurImport: brut.erreurImport, exception: brut.exception, valeur: brut.valeur, appelsReseau: brut.appelsReseau, appelsCout: brut.appelsCout, pausesLues: brut.pausesLues, code: r.code, sortieBrute: r.sortie }
}
/** `publierMeta` (metaPublier.ts) seul : `reseauScenario` ('ok'|'erreur-conteneur'|'erreur-publier') construit le
 *  faux Graph DANS l'enfant (executer-meta.mjs) ; `variante`/`ctx` sont les deux premiers arguments réels. */
export async function appelerMeta({ racineEff, moduleRel = 'lib/contenu/metaPublier', fonction = 'publierMeta', variante, ctx, reseauScenario = 'ok', env = {}, delaiMs = 15_000, pauseScenario = 'inactive', extra = {} }) {
  return appelerFonction({ racineEff, moduleRel, fonction, env, delaiMs, executeur: EXECUTER_META, extra: { variante, ctx, reseauScenario, pauseScenario, ...extra } })
}
/** Lit des exports CONSTANTS (pas une fonction à appeler) d'un module : `noms` → `r.valeur = { nom: valeur }`. */
export async function appelerExports({ racineEff, moduleRel, noms, delaiMs = 15_000 }) {
  return appelerFonction({ racineEff, moduleRel, fonction: '(exports)', env: {}, delaiMs, executeur: EXECUTER_EXPORTS, extra: { noms } })
}
export const echecImport = (r) => fail([r.erreurImport || r.exception || r.erreur || 'échec sans détail'], 'module absent ou en échec à l\'import (attendu tant que la fiche de production n\'a pas encore livré)')
/** Classe un appel enfant en trois issues, jamais deux : `nonJuge` seulement quand le module cité est ABSENT du
 *  disque (un préalable extérieur — la fiche de production qui doit l'écrire n'est pas encore passée, code 2 côté
 *  contenu-qa.mjs) ; `fail` pour tout le reste d'anormal (mauvais export, exception, appel enfant illisible : un
 *  vrai défaut, code 1) ; sinon `transform(valeur)` juge le comportement lui-même. */
export function depuisAppel(r, moduleRel, transform) {
  if (!r.ok) return fail([r.erreur], 'appel enfant en échec')
  if (r.erreurImport) {
    if (/introuvable sous/.test(r.erreurImport)) return nonJuge(`${moduleRel} (${r.erreurImport})`)
    return fail([r.erreurImport], `import de ${moduleRel} en échec`)
  }
  if (r.exception) return fail([r.exception], `exception levée par ${moduleRel}`)
  return transform(r.valeur, r)
}

// ── environnement jev de test : JEV_CHEMIN pointe TOUJOURS sur le faux jev de cette fiche ───────────────────────────
// `appelerJev` (lib/agents/llm.ts, déjà PASS) lance `process.execPath <JEV_CHEMIN> ask -f <fichier> --provider laya`
// avec `lancer` PAR DÉFAUT (le vrai spawn) et un environnement d'enfant RÉDUIT PAR CE MODULE DÉJÀ PASS à
// { JEV_PROVIDER: 'laya', PATH?, HOME?, LANG? } (voir appelerJev) : FAUX_JEV_REPONSE/SCENARIO/JOURNAL posés sur
// `deps.env` ne traversent donc JAMAIS jusqu'au vrai faux-jev.mjs par cette voie — un fait vérifié à la main (26/09,
// une réponse par défaut {p:0.8} revenait malgré `reponse:{p:0.9}`). Le seul champ qui traverse intact est
// JEV_CHEMIN, lu directement par appelerJev AVANT le spawn : `envJev` pointe donc vers un PETIT LANCEUR généré ici
// (sous .orchestre/travail/contenu-qa/jev/), qui fixe process.env.FAUX_JEV_* EN SON PROPRE SEIN (donc à l'intérieur
// du même processus qui exécutera ensuite faux-jev.mjs par import) avant d'importer le vrai faux-jev.mjs — jamais une
// resaisie de sa logique, jamais un double du lanceur (le lancement reste le vrai `spawn` de lib/agents/llm.ts).
export function envJev({ reponse, scenario = 'ok', journal, indisponible = false } = {}) {
  if (indisponible) return { JEV_CHEMIN: path.join(dossierTravail('jev'), 'absent-expres.mjs') } // fichier jamais écrit : accessible() rend false, appelerJev rend null AVANT tout spawn (panne instantanée)
  const dir = dossierTravail('jev')
  const lanceur = path.join(dir, 'lanceur.mjs')
  const corps = [
    `process.env.FAUX_JEV_SCENARIO = ${JSON.stringify(scenario || 'ok')};`,
    journal ? `process.env.FAUX_JEV_JOURNAL = ${JSON.stringify(journal)};` : '',
    reponse !== undefined ? `process.env.FAUX_JEV_REPONSE = ${JSON.stringify(JSON.stringify(reponse))};` : '',
    `await import(${JSON.stringify(pathToFileURL(FAUX_JEV).href)});`,
  ].filter(Boolean).join('\n')
  fs.writeFileSync(lanceur, corps)
  return { JEV_CHEMIN: lanceur }
}
export function lireJournalJev(journal) { try { return JSON.parse(lire(journal)) } catch { return [] } }

// ── faux réseau (TikTok / Graph / Publora / Firecrawl) : un serveur HTTP 127.0.0.1 démarré PAR CE juge ─────────────
export function demarrerFauxReseau(gestionnaire) {
  const requetes = []
  const serveur = http.createServer((req, res) => {
    const morceaux = []
    req.on('data', (d) => morceaux.push(d))
    req.on('end', async () => {
      const brut = Buffer.concat(morceaux).toString('utf8')
      let corps = null
      try { corps = brut ? JSON.parse(brut) : null } catch { corps = brut }
      const entree = { methode: req.method, url: req.url, corps, brut, entetes: req.headers, le: new Date().toISOString() }
      requetes.push(entree)
      let r
      try { r = await gestionnaire(corps, req, requetes.length - 1) } catch (e) { r = { status: 500, body: { erreur: String(e?.message || e) } } }
      res.writeHead(r.status || 200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(r.body ?? {}))
    })
  })
  return new Promise((resolve) => {
    serveur.listen(0, '127.0.0.1', () => resolve({ port: serveur.address().port, requetes, fermer: () => new Promise((f) => serveur.close(f)) }))
  })
}

// ── git (pour le dépôt seulement, jamais pour une racine copiée qui n'a pas .git) ────────────────────────────────
export function git(args) {
  const r = spawnSync('git', args, { cwd: DEPOT, encoding: 'utf8', windowsHide: true, maxBuffer: 256 << 20, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  return r.status === 0 ? r.stdout : null
}

// ── copie du témoin dans un dossier de travail, avec une faute injectée à un chemin donné (sabotage) ────────────────
// `mutation(texte) => texte muté | null` ; `null` retire le fichier (fichier absent = une faute aussi valide).
export function copierTemoinMute(cheminsRelatifs, mutation) {
  const dir = dossierTravail('sabotage')
  for (const rel of listerFichiers(TEMOIN)) {
    const cible = path.join(dir, path.relative(TEMOIN, rel))
    garantirDossier(path.dirname(cible))
    if (cheminsRelatifs.includes(path.relative(TEMOIN, rel).split(path.sep).join('/'))) {
      const texte = mutation(lire(rel))
      if (texte === null) continue
      fs.writeFileSync(cible, texte)
    } else {
      fs.copyFileSync(rel, cible)
    }
  }
  return dir
}
export function listerFichiers(base) {
  const out = []
  const pile = [base]
  while (pile.length) {
    const d = pile.pop()
    if (!existe(d)) continue
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      // Une jonction posée par poserJonctions() (node_modules, lib/agents) n'est jamais du contenu témoin : si un
      // appel plus tôt dans CE processus l'a laissée en place (nettoyage différé à la toute fin), elle ne doit ni
      // être recopiée (fs.copyFileSync échoue, EPERM, sur une jonction Windows) ni être listée comme un fichier.
      if (e.isSymbolicLink()) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) pile.push(p); else out.push(p)
    }
  }
  return out
}
