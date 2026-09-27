// Le socle des trois juges des droits du bus (026-038) : agents-garde-qa, agents-routes-qa, pause-qa. Écrit par Claude Code.
//
// Méthode de la maison (scripts/webhook-muet-qa.mjs) : le code jugé est importé dans un processus à part (une « sonde »),
// sans réseau ni secret, par le crochet de résolution de doublures/crochet.mjs (alias @/, extensions .ts, doublures nommées).
// La sonde (doublures/sonde.mjs) démarre elle-même le faux PostgREST (scripts/lib/faux-postgrest.mjs) sur 127.0.0.1, pose
// NEXT_PUBLIC_SUPABASE_URL sur lui AVANT d'importer le code, puis appelle SONDES[nom] exporté par le juge : le vrai client
// @supabase/supabase-js parle au juge, chaque appel est consigné et jugé contre contrat-ops.json.
//
// Le témoin (--temoin) : une copie de lib/ sous .orchestre/travail/<juge>/temoin/, où sont superposées les implémentations de
// référence de doublures/temoins/**.temoin et les fichiers dérivés de HEAD (drapeau, carte, type Action). Chaque critère doit
// y être VERT ; puis chaque sabotage (une altération d'un fichier du témoin) doit rendre son critère ROUGE. Un juge qui ne
// sait pas échouer, ou pas réussir, est vu là.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { R, creerRapport } from '../../../lib/sql-essai.mjs'
import { sansCommentaires as sansCommentairesTs, importsDe, grapheExecution } from '../../../webhook-muet-qa.mjs'

export { R, creerRapport, sansCommentairesTs, importsDe, grapheExecution }
export const ICI = path.dirname(fileURLToPath(import.meta.url))
export const TRAVAIL = path.join(R, '.orchestre', 'travail')
export const CONTRAT = path.join(R, 'scripts', 'fixtures', '026-horloge-bus', 'contrat-ops.json')
export const PREUVE_01 = path.join(R, 'scripts', 'fixtures', '026-horloge-bus', 'preuve-01.json')
export const TEMOINS = path.join(ICI, 'temoins')
export const CROCHET = path.join(ICI, 'crochet.mjs')
export const SONDE = path.join(ICI, 'sonde.mjs')
export const CHARGEUR = path.join(R, 'scripts', 'ts-loader.mjs')

export const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
export const hasard = (n = 12) => crypto.randomBytes(n).toString('hex').slice(0, n)
export const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex')
export const posix = (p) => String(p).split(path.sep).join('/')
export const lf = (t) => String(t ?? '').replace(/\r\n/g, '\n')
export const lire = (racine, rel) => { try { return lf(fs.readFileSync(path.join(racine, rel), 'utf8')) } catch { return null } }
export const existe = (racine, rel) => { try { return fs.statSync(path.join(racine, rel)).isFile() } catch { return false } }
const cleChemin = (p) => { const x = path.resolve(p).split(path.sep).join('/'); return process.platform === 'win32' ? x.toLowerCase() : x }

/** Le format des jetons, tel que 026-040 l'écrit : le juge garde sa propre copie (un format assoupli est vu). */
export const FORMAT_SPEC = /^pa_([a-z0-9_]{2,40})_([A-Za-z0-9_-]{43})$/
/** Un jeton au format, tiré au hasard à chaque passage (aucun jeton réel dans une fixture). */
export const jetonEssai = (nom) => `pa_${nom}_${crypto.randomBytes(32).toString('base64url')}`
export const uuid = () => crypto.randomUUID()

/** consommer_limite(p_cle, p_max, p_fenetre_s) de la migration 0049 : hors de contrat-ops.json, ajoutée au faux PostgREST. */
export const FONCTIONS_HORS_CONTRAT = { consommer_limite: { params: [['p_cle', 'text'], ['p_max', 'integer'], ['p_fenetre_s', 'integer']] } }
export function lireContrat() {
  const c = JSON.parse(fs.readFileSync(CONTRAT, 'utf8'))
  return { ...c, fonctions: { ...c.fonctions, ...FONCTIONS_HORS_CONTRAT } }
}
/** Les fonctions des migrations 0097 et 0098 (fiches 026-011 et 026-013) : celles de lib/agents/bus.ts. */
export function fonctionsDuBus(contrat = lireContrat()) {
  return Object.entries(contrat.fonctions).filter(([n, f]) => ['0097', '0098'].includes(f.migration) && !n.startsWith('ops.')).map(([n, f]) => [n, f.params])
}

// ── Git ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function git(args) {
  const r = spawnSync('git', args, { cwd: R, encoding: 'utf8', windowsHide: true, maxBuffer: 256 << 20, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  return r.status === 0 ? r.stdout : null
}
export const aHead = (rel) => { const t = git(['show', `HEAD:${rel}`]); return t === null ? null : lf(t) }
export const aLaReference = (rel) => {
  let ref = null
  try { ref = JSON.parse(fs.readFileSync(PREUVE_01, 'utf8')).reference } catch { return null }
  const t = git(['show', `${ref}:${rel}`]); return t === null ? null : lf(t)
}

/** Diff de lignes (plus longue sous-suite commune) : { ajoutes: [lignes], retires: [lignes] }. */
export function diffLignes(avant, apres) {
  const a = lf(avant).split('\n'), b = lf(apres).split('\n')
  // les lignes communes en tête et en queue d'abord : le reste est petit (les fichiers jugés changent d'une ou deux lignes)
  let d = 0
  while (d < a.length && d < b.length && a[d] === b[d]) d++
  let fa = a.length, fb = b.length
  while (fa > d && fb > d && a[fa - 1] === b[fb - 1]) { fa--; fb-- }
  const A = a.slice(d, fa), B = b.slice(d, fb)
  if (A.length * B.length > 4_000_000) return { ajoutes: B, retires: A, trop: true }
  const L = Array.from({ length: A.length + 1 }, () => new Int32Array(B.length + 1))
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const ajoutes = [], retires = []
  let i = 0, j = 0
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) retires.push(A[i++]); else ajoutes.push(B[j++])
  }
  while (i < A.length) retires.push(A[i++])
  while (j < B.length) ajoutes.push(B[j++])
  return { ajoutes, retires }
}

// ── Options ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** --racine=<dossier> (défaut : le dépôt), --temoin, --reel. Toute autre option : code 2. */
export function lireOptions(argv, juge) {
  const o = { racine: R, temoin: false, reel: false }
  for (const a of argv) {
    if (a === '--temoin') o.temoin = true
    else if (a === '--reel') o.reel = true
    else if (a.startsWith('--racine=') && a.length > 9) o.racine = path.resolve(a.slice(9))
    else { console.error(`✗ ${juge} : option inconnue « ${a} » (--racine=<dossier>, --temoin, --reel)`); process.exit(2) }
  }
  if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) { console.error(`✗ ${juge} : racine introuvable : ${o.racine}`); process.exit(2) }
  if (o.temoin && o.reel) { console.error(`✗ ${juge} : --temoin et --reel ne vont pas ensemble`); process.exit(2) }
  return o
}
export function dossierTravail(juge, ...sous) {
  const d = path.join(TRAVAIL, juge, ...sous)
  fs.mkdirSync(d, { recursive: true })
  return d
}
export function vider(d) {
  const r = path.relative(TRAVAIL, path.resolve(d))
  if (!r || r.startsWith('..') || path.isAbsolute(r)) throw new Error(`suppression refusée hors de .orchestre/travail/ : ${d}`)
  fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  fs.mkdirSync(d, { recursive: true })
}

// ── Processus ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** L'environnement sans aucune variable qui pourrait porter un secret (le piège réseau, NODE_OPTIONS, est gardé). */
export function envSansSecret(extra = {}) {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (!/(SECRET|KEY|TOKEN|PASSWORD|PASSWD|STRIPE|SUPABASE|RESEND|ANTHROPIC|OPENAI|VERCEL|DATABASE|DIRECT_URL|PRESTI|EMAIL_ENTREPRISE|CRON|WEBHOOK|PAUSE_GENERALE|GITHUB|TELEGRAM)/i.test(k)) env[k] = v
  return { ...env, FORCE_COLOR: '0', NO_COLOR: '1', ...extra }
}
/** Lance un processus sans bloquer la boucle (le faux PostgREST du parent doit pouvoir répondre). */
export function lancer(cmd, args, { cwd = R, env, delaiMs = 120_000, entree = null } = {}) {
  return new Promise((ok) => {
    const t0 = Date.now()
    const p = spawn(cmd, args, { cwd, env: env || envSansSecret(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = '', stderr = '', expire = false
    p.stdout.setEncoding('utf8'); p.stderr.setEncoding('utf8')
    p.stdout.on('data', (d) => { stdout += d })
    p.stderr.on('data', (d) => { stderr += d })
    const m = setTimeout(() => { expire = true; try { spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }) } catch { /* ailleurs */ } try { p.kill('SIGKILL') } catch { /* mort */ } }, delaiMs)
    p.on('error', (e) => { clearTimeout(m); ok({ code: 127, stdout, stderr: `${stderr}\n${e.message}`, expire, duree: (Date.now() - t0) / 1000 }) })
    p.on('close', (code) => { clearTimeout(m); ok({ code: expire ? 124 : code, stdout, stderr, expire, duree: (Date.now() - t0) / 1000 }) })
    if (entree !== null) p.stdin.end(entree); else p.stdin.end()
  })
}

/**
 * Une sonde : node --experimental-strip-types --import crochet.mjs sonde.mjs <config>, cwd = racine, sans secret.
 * Le résultat est lu dans un fichier de sortie, avec un jeton tiré au hasard (une sortie ancienne ou forgée est refusée).
 * → { ok: true, res } ou { ok: false, erreur, journal }
 */
export async function lancerSonde({ juge, jugeFichier, nom, racine, doublures = [], params = {}, env = {}, delaiMs = 120_000 }) {
  const d = dossierTravail(juge, 'sondes')
  const id = `${nom}-${hasard(8)}`
  const config = path.join(d, `${id}.json`), sortie = path.join(d, `${id}.sortie.json`)
  const nonce = hasard(24)
  fs.writeFileSync(config, JSON.stringify({ juge: jugeFichier, nom, racine, sortie, nonce, params, contrat: CONTRAT }))
  const x = await lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(CROCHET).href, SONDE, config], {
    cwd: racine, delaiMs,
    env: envSansSecret({ JUGE_RACINE: racine, JUGE_REPO: R, JUGE_DOUBLURES: doublures.join(','), SUPABASE_SERVICE_ROLE_KEY: 'cle-factice-juge', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'cle-factice-anon', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9', ...env }),
  })
  let brut = null
  try { brut = JSON.parse(fs.readFileSync(sortie, 'utf8')) } catch { /* absent */ }
  for (const f of [config, sortie]) fs.rmSync(f, { force: true })
  const journal = `${x.stdout}${x.stderr}`.trim()
  if (x.expire) return { ok: false, erreur: `sonde ${nom} : délai de ${delaiMs / 1000} s dépassé`, journal }
  if (!brut || brut.nonce !== nonce) return { ok: false, erreur: `sonde ${nom} sans résultat (code ${x.code}) : ${court(journal.split('\n').filter((l) => l.trim()).slice(-3).join(' | '), 260)}`, journal }
  if (brut.exception) return { ok: false, erreur: `sonde ${nom} : exception dans le code jugé ou la sonde : ${court(brut.exception, 240)}`, journal }
  return { ok: true, res: brut.resultat, journal }
}

// ── Le témoin ───────────────────────────────────────────────────────────────────────────────────────────────────────
function listerTemoins(d = TEMOINS, pre = '') {
  const out = []
  for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
    if (e.isDirectory()) out.push(...listerTemoins(path.join(d, e.name), `${pre}${e.name}/`))
    else if (e.name.endsWith('.temoin')) out.push(`${pre}${e.name}`)
  }
  return out
}
/**
 * Construit le témoin du juge : lib/ du dépôt copié, puis superposés les fichiers de doublures/temoins/ (sans .temoin) et les
 * fichiers dérivés de HEAD ([rel, (texte de HEAD) => texte]). → { dest, superposes[], derives[] }
 */
export function construireTemoin(juge, { attendus = [], derives = [] } = {}) {
  const dest = path.join(TRAVAIL, juge, 'temoin')
  vider(dest)
  fs.cpSync(path.join(R, 'lib'), path.join(dest, 'lib'), { recursive: true })
  const presents = listerTemoins()
  const manquants = attendus.filter((rel) => !presents.includes(`${rel}.temoin`) || !fs.statSync(path.join(TEMOINS, `${rel}.temoin`)).size)
  if (manquants.length) throw new Error(`témoin incomplet dans doublures/temoins/ : ${manquants.join(', ')}`)
  for (const f of presents) {
    const cible = path.join(dest, f.slice(0, -'.temoin'.length))
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.copyFileSync(path.join(TEMOINS, f), cible)
  }
  for (const [rel, f] of derives) {
    const h = aHead(rel)
    if (h === null) throw new Error(`${rel} introuvable à HEAD : témoin dérivé impossible`)
    fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true })
    fs.writeFileSync(path.join(dest, rel), f(h))
  }
  return { dest, superposes: presents.map((f) => f.slice(0, -'.temoin'.length)), derives: derives.map(([rel]) => rel) }
}

/**
 * Un sabotage : { id, nom, fichier, chercher, remplacer } — une altération d'un fichier du témoin qui DOIT rendre le critère `id`
 * rouge. `chercher` doit y être (sinon le sabotage lui-même est cassé et le juge le dit). Le fichier est rétabli après.
 */
export async function eprouverSabotage(racine, sab, juger) {
  const f = path.join(racine, sab.fichier)
  const avant = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
  if (avant === null) return { casse: `${sab.fichier} absent du témoin` }
  let apres
  if (sab.supprimer) apres = null
  else {
    const n = typeof sab.chercher === 'string' ? avant.split(sab.chercher).length - 1 : (avant.match(new RegExp(sab.chercher.source, `${sab.chercher.flags.replace('g', '')}g`)) || []).length
    if (n < 1) return { casse: `« ${court(String(sab.chercher), 60)} » introuvable dans ${sab.fichier}` }
    apres = typeof sab.chercher === 'string' ? avant.split(sab.chercher).join(sab.remplacer) : avant.replace(new RegExp(sab.chercher.source, `${sab.chercher.flags.replace('g', '')}g`), sab.remplacer)
    if (apres === avant) return { casse: `le sabotage ne change rien à ${sab.fichier}` }
  }
  try {
    if (apres === null) fs.rmSync(f); else fs.writeFileSync(f, apres)
    return { r: await juger() }
  } finally { fs.writeFileSync(f, avant) }
}

// ── Le typecheck ────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * La lecture d'un passage de `npm run typecheck -- --listFiles` : code 0, chacun des `fichiers` parmi les fichiers vérifiés, ni
 * @ts-nocheck ni @ts-ignore ajouté, tsconfig.json et le script typecheck de HEAD. → { ok, echecs, resume }
 */
export function lireTypecheck({ code, sortie, duree = 0 }, racine, fichiers, textes = null) {
  const echecs = []
  const lignes = lf(sortie).split('\n')
  const vus = new Set(lignes.map((l) => l.trim()).filter((l) => /^([A-Za-z]:[\\/]|\/)/.test(l)).map((l) => cleChemin(l)))
  if (code !== 0) {
    const erreurs = lignes.filter((l) => /error TS\d+/.test(l))
    echecs.push(`npm run typecheck en code ${code} : ${erreurs.length ? `${erreurs.length} erreur(s), ${erreurs.slice(0, 3).map((l) => court(l, 140)).join(' | ')}` : court(lignes.filter((l) => l.trim()).slice(-3).join(' | '), 200)}`)
  }
  const absents = fichiers.filter((rel) => !vus.has(cleChemin(path.join(racine, rel))))
  if (absents.length) echecs.push(`hors des fichiers vérifiés : ${absents.join(', ')}${vus.size ? '' : ' (aucune liste : --listFiles ignoré ?)'}`)
  for (const rel of fichiers) {
    const t = textes ? textes[rel] : lire(racine, rel)
    if (t === null || t === undefined) continue
    if (/@ts-nocheck/.test(t)) echecs.push(`${rel} porte @ts-nocheck`)
    if (/@ts-(ignore|expect-error)/.test(t)) echecs.push(`${rel} porte @ts-ignore ou @ts-expect-error`)
  }
  return { ok: echecs.length === 0, echecs, resume: `npm run typecheck en code 0${duree ? ` (${Math.round(duree)} s)` : ''} ; ${fichiers.join(', ')} parmi les ${vus.size} fichiers vérifiés ; ni @ts-nocheck ni @ts-ignore` }
}
export async function typecheck(juge, racine, fichiers) {
  for (const rel of ['tsconfig.json', 'package.json']) {
    const h = aHead(rel), t = lire(racine, rel)
    if (t === null) return { ok: false, echecs: [`${rel} absent de la racine : le typecheck ne se juge pas ailleurs que dans un projet complet`], resume: '' }
    if (rel === 'tsconfig.json' && h !== null && t !== h) return { ok: false, echecs: ['tsconfig.json diffère de HEAD : le typecheck ne se juge qu\'avec la configuration d\'origine'], resume: '' }
    if (rel === 'package.json' && h !== null) { try { if (JSON.parse(t).scripts?.typecheck !== JSON.parse(h).scripts?.typecheck) return { ok: false, echecs: ['le script typecheck de package.json diffère de HEAD'], resume: '' } } catch { return { ok: false, echecs: ['package.json illisible'], resume: '' } } }
  }
  const info = path.join(dossierTravail(juge, 'tsbuildinfo'), `${sha256(cleChemin(racine)).slice(0, 10)}.tsbuildinfo`)
  const x = await lancer(process.platform === 'win32' ? 'cmd.exe' : 'sh', process.platform === 'win32' ? ['/d', '/s', '/c', `npm run typecheck -- --tsBuildInfoFile ${posix(info)} --listFiles`] : ['-c', `npm run typecheck -- --tsBuildInfoFile '${posix(info)}' --listFiles`], { cwd: racine, delaiMs: 400_000, env: envSansSecret({ NO_UPDATE_NOTIFIER: '1' }) })
  return lireTypecheck({ code: x.code, sortie: `${x.stdout}\n${x.stderr}`, duree: x.duree }, racine, fichiers)
}
/** L'épreuve du critère typecheck en --temoin : sa lecture sur des passages synthétiques (tsc n'est pas relancé : 8 Go). */
export function eprouverLectureTypecheck(racine, fichiers) {
  const liste = fichiers.map((rel) => path.join(racine, rel)).join('\n')
  const textes = Object.fromEntries(fichiers.map((rel) => [rel, 'export const x = 1\n']))
  const cas = [
    ['conforme', { code: 0, sortie: `> tsc --noEmit\n${liste}\n` }, textes, true],
    ['code 2', { code: 2, sortie: `${liste}\nlib/x.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.\n` }, textes, false],
    ['un fichier hors de la liste', { code: 0, sortie: `${fichiers.slice(1).map((rel) => path.join(racine, rel)).join('\n')}\n` }, textes, false],
    ['aucune liste', { code: 0, sortie: '> tsc --noEmit\n' }, textes, false],
    ['@ts-nocheck', { code: 0, sortie: `${liste}\n` }, { ...textes, [fichiers[0]]: '// @ts-nocheck\nexport const x = 1\n' }, false],
  ]
  const rates = cas.filter(([, x, t, ok]) => lireTypecheck(x, racine, fichiers, t).ok !== ok).map(([n, , , ok]) => `${n} ${ok ? 'refusé' : 'accepté'}`)
  return { ok: rates.length === 0, echecs: rates.map((r) => `lecture du typecheck : ${r}`), resume: `lecture du typecheck éprouvée sur ${cas.length} passages synthétiques (conforme accepté ; code 2, fichier hors liste, aucune liste, @ts-nocheck refusés) — tsc n'est pas relancé en --temoin (mémoire du PC), il l'est sans --temoin` }
}

// ── Le faux PostgREST, auto-contrôle (préalable de chaque juge) ─────────────────────────────────────────────────────
/** Démarre le faux PostgREST, lui fait un appel conforme et un appel au mauvais nom (agent au lieu de p_agent). */
export async function autoControleFauxPostgrest() {
  const { demarrer } = await import('../../../lib/faux-postgrest.mjs')
  const contrat = lireContrat()
  const fp = await demarrer({ contrat, reponses: { ops_tache_creer: [{ id: uuid(), creee: true }] } })
  const poster = async (corps) => { try { const r = await fetch(`${fp.url}/rest/v1/rpc/ops_tache_creer`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) }); return r.status } catch (e) { return `erreur ${e.message}` } }
  const bon = { p_agent: 'essai_e2e_x', p_type: 'envoi', p_cle: 'k', p_capacite: 'c', p_charge: {}, p_origine: null, p_objet: null }
  const { p_agent, ...reste } = bon
  const a = await poster(bon), b = await poster({ agent: p_agent, ...reste })
  const n = fp.appels.length, fautes = fp.fautes().length
  await fp.arreter()
  const ok = a === 200 && b === 400 && n === 2 && fautes === 1
  return { ok, resume: `faux PostgREST : ops_tache_creer conforme → ${a}, « agent » au lieu de « p_agent » → ${b} (faute consignée), ${n} appels consignés` }
}

// ── Lecture ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const RE_COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/
/** Toutes les clés d'un objet JSON, à toute profondeur. */
export function cles(v, out = new Set()) {
  if (Array.isArray(v)) for (const x of v) cles(x, out)
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); cles(x, out) }
  return out
}

/**
 * Le déroulé commun d'un juge. `criteres` : { id: { juger: async (racine) => { ok, echecs, resume }, reel?: true } } ;
 * `sabotages` : [{ id, nom, fichier, chercher, remplacer }] ; `temoin` : { attendus, derives }.
 */
export async function derouler({ juge, ids, criteres, sabotages = [], temoin = {}, prealables = [], o }) {
  const s = creerRapport(juge, ids, { entete: `${juge} — ${o.temoin ? 'témoin' : o.reel ? 'réel' : `racine ${o.racine === R ? '(le dépôt)' : posix(path.relative(R, o.racine)) || o.racine}`}` })
  for (const p of prealables) {
    let r
    try { r = await p() } catch (e) { r = { ok: false, resume: e.message } }
    if (!r.ok) { console.error(`✗ ${juge} : préalable manquant — ${r.resume}`); process.exit(2) }
    s.note(r.resume)
  }
  const verdict = (id, r) => { if (r.ok) s.passe(id, r.resume); else for (const e of r.echecs.length ? r.echecs : ['échec sans détail']) s.echoue(id, e) }
  if (!o.temoin) {
    for (const id of ids) {
      const c = criteres[id]
      if (c.reel && !o.reel) { s.saute(id, '--reel seulement (après déploiement, Claude Code)'); continue }
      let r
      try { r = await c.juger(o.racine) } catch (e) { r = { ok: false, echecs: [`le juge a planté sur ${id} : ${court(e.message, 200)}`] } }
      verdict(id, r)
    }
    process.exit(s.fin())
  }
  let t
  try { t = construireTemoin(juge, temoin) } catch (e) { console.error(`✗ ${juge} --temoin : ${e.message}`); process.exit(2) }
  s.note(`témoin : lib/ du dépôt copié sous ${posix(path.relative(R, t.dest))} ; superposés : ${t.superposes.join(', ')}${t.derives.length ? ` ; dérivés de HEAD : ${t.derives.join(', ')}` : ''}`)
  for (const id of ids) {
    const c = criteres[id]
    if (c.reel) {
      // le critère réel n'est pas lancé (réseau, secrets) : sa lecture seule est éprouvée, s'il en a une
      if (c.eprouver) verdict(id, await c.eprouver(t.dest)); else s.saute(id, '--reel seulement (après déploiement, Claude Code)')
      continue
    }
    let r
    try { r = c.temoin ? await c.temoin(t.dest) : await c.juger(t.dest) } catch (e) { r = { ok: false, echecs: [`le juge a planté sur le témoin : ${court(e.message, 200)}`] } }
    if (!r.ok) { for (const e of r.echecs) s.echoue(id, `témoin refusé : ${e}`); continue }
    const siens = sabotages.filter((x) => x.id === id)
    const pris = [], rates = []
    for (const sab of siens) {
      let x
      try { x = await eprouverSabotage(t.dest, sab, () => c.juger(t.dest)) } catch (e) { x = { casse: `plantage : ${court(e.message, 120)}` } }
      if (x.casse) rates.push(`sabotage « ${sab.nom} » inapplicable : ${x.casse}`)
      else if (x.r.ok) rates.push(`sabotage « ${sab.nom} » accepté (${sab.fichier}) : le juge ne sait pas échouer`)
      else pris.push(`« ${sab.nom} » (${court(x.r.echecs[0], 90)})`)
    }
    if (!c.temoin && !siens.length && !c.sansSabotage) rates.push('aucun sabotage déclaré pour ce critère : rien ne prouve qu\'il sait échouer')
    if (rates.length) for (const e of rates) s.echoue(id, e)
    else s.passe(id, `témoin vert (${court(r.resume, 200)})${pris.length ? ` ; ${pris.length} sabotage(s) pris : ${pris.join(' ; ')}` : ''}`)
  }
  process.exit(s.fin())
}
