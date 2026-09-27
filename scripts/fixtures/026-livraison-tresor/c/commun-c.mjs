// scripts/fixtures/026-livraison-tresor/c/commun-c.mjs — les outils propres aux juges du lot C (fiche 026-029, Claude Code) :
// commande-exporter-qa, redacteur-v2-qa, livrer-site-qa, generation-actions-qa. Le socle reste ../commun.mjs (026-018), que
// ce fichier ne change pas. Les exécutants ne touchent jamais ce dossier (scripts/fixtures/** est dans leur `interdit`).
//
// Index : C, JEU, PROJET, ID_COMMANDE, ID_ARTISAN, ID_AUTRE · jeuC, copieJeu · sansAccents, contientSansAccents ·
//   lancerAsync, envEnfant, piegeReseau · servirPhotos · regleAttribution · exifAvecGps · siteQaStatique ·
//   gitStatusPublic · lireArbre · auPlus.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, exigerSousTravail, court } from '../commun.mjs'

export const C = path.join(R, 'scripts', 'fixtures', '026-livraison-tresor', 'c')
export const JEU = path.join(C, 'commande-payee.json')
/** Le projet Supabase du jeu d'essai : il n'existe pas ; le juge le pose dans NEXT_PUBLIC_SUPABASE_URL et ne le joint jamais. */
export const PROJET = 'https://projet-temoin-026.supabase.co'
export const ID_COMMANDE = '00000000-0000-4000-8000-000000260291'
export const ID_ARTISAN = '00000000-0000-4000-8000-000000260292'
export const ID_AUTRE = '00000000-0000-4000-8000-000000260299'
export const LOADER_URL = pathToFileURL(path.join(R, 'scripts', 'ts-loader.mjs')).href

export const jeuC = (nom) => JSON.parse(fs.readFileSync(path.join(C, nom), 'utf8'))
/** Écrit sous .orchestre/travail/<juge>/ une copie du jeu d'essai modifiée par `f` ; rend son chemin. */
export function copieJeu(dossier, nom, f) {
  const j = jeuC('commande-payee.json')
  f(j)
  const p = exigerSousTravail(path.join(dossier, nom))
  fs.writeFileSync(p, JSON.stringify(j, null, 1))
  return p
}

export const sansAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const contientSansAccents = (texte, x) => sansAccents(texte).replace(/[’']/g, "'").includes(sansAccents(x).replace(/[’']/g, "'"))
export const auPlus = (l, n = 4) => (l.length > n ? `${l.slice(0, n).join(' ; ')} ; … (${l.length})` : l.join(' ; '))

// ── Processus enfants ─────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Un environnement d'enfant SANS secret : seulement ce qu'il faut pour que node et sharp tournent (chemins, dossiers
 * temporaires), plus `extra`. Aucune clé du dépôt (Anthropic, Stripe, Supabase, Resend, GitHub) n'y passe.
 */
export function envEnfant(extra = {}) {
  const garder = ['PATH', 'Path', 'PATHEXT', 'SystemRoot', 'SYSTEMROOT', 'windir', 'WINDIR', 'COMSPEC', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'LANG', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE']
  const e = {}
  for (const k of garder) if (process.env[k] !== undefined) e[k] = process.env[k]
  e.TZ = 'UTC'
  return { ...e, ...extra }
}
/**
 * Le piège réseau des enfants du lot C, chargé par NODE_OPTIONS=--import : fetch et net.Socket#connect hors 127.0.0.1 sont
 * refusés ET consignés dans un journal. → { env, lire() : [lignes consignées] }. Le fichier du piège et son journal sont
 * sous .orchestre/travail/<juge>/.
 */
export function piegeReseau(dossier, nom) {
  const fichier = exigerSousTravail(path.join(dossier, 'piege-reseau.mjs'))
  const journal = exigerSousTravail(path.join(dossier, `reseau-${nom}.log`))
  fs.writeFileSync(fichier, `// Piège réseau des juges du lot C (026-029).
import fs from 'node:fs'
import net from 'node:net'
const J = process.env.PIEGE_C_JOURNAL
const noter = (q) => { try { if (J) fs.appendFileSync(J, q + '\\n') } catch {} }
const local = (h) => { const x = String(h ?? '').replace(/^\\[|\\]$/g, '').toLowerCase(); return x === '127.0.0.1' || x === 'localhost' || x === '::1' || x === '::ffff:127.0.0.1' }
const origine = globalThis.fetch
if (typeof origine === 'function') globalThis.fetch = function (entree, init) {
  let hote = '?'
  try { hote = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url).hostname } catch {}
  if (!local(hote)) { noter('fetch ' + hote + ' ' + String(entree && entree.url ? entree.url : entree).slice(0, 160)); return Promise.reject(new Error('réseau interdit hors 127.0.0.1 (piège du lot C) : ' + hote)) }
  return origine.call(this, entree, init)
}
const connecter = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const a = Array.isArray(args[0]) ? args[0][0] : args[0]
  let hote = null
  if (a && typeof a === 'object') { if (a.path) return connecter.apply(this, args); hote = a.host ?? 'localhost' }
  else if (typeof a === 'number' || /^\\d+$/.test(String(a))) hote = typeof args[1] === 'string' ? args[1] : 'localhost'
  else return connecter.apply(this, args)
  if (!local(hote)) { noter('connect ' + hote); const e = new Error('réseau interdit hors 127.0.0.1 (piège du lot C) : ' + hote); process.nextTick(() => this.destroy(e)); return this }
  return connecter.apply(this, args)
}
`)
  fs.rmSync(journal, { force: true })
  const options = [process.env.NODE_OPTIONS, `--import=${pathToFileURL(fichier).href}`].filter(Boolean).join(' ')
  return { env: { NODE_OPTIONS: options, PIEGE_C_JOURNAL: journal }, journal, lire: () => { try { return fs.readFileSync(journal, 'utf8').split('\n').filter(Boolean) } catch { return [] } } }
}
/** Lance une commande sans shell, sans bloquer la boucle (le serveur de photos du juge doit pouvoir répondre). */
export function lancerAsync(commande, args, { cwd = R, env, timeout = 600_000 } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    let stdout = '', stderr = '', fini = false
    let p
    try { p = spawn(commande, args, { cwd, env: env ?? envEnfant(), windowsHide: true }) } catch (e) { resolve({ code: null, stdout: '', stderr: String(e?.message ?? e), sortie: String(e?.message ?? e), duree: 0, erreur: String(e?.message ?? e) }); return }
    const minuterie = setTimeout(() => { if (!fini) { try { p.kill() } catch {} } }, timeout)
    p.stdout.on('data', (d) => { stdout += d })
    p.stderr.on('data', (d) => { stderr += d })
    p.on('error', (e) => { stderr += String(e?.message ?? e) })
    p.on('close', (code, signal) => { fini = true; clearTimeout(minuterie); resolve({ code, signal, stdout, stderr, sortie: `${stdout}${stderr}`, duree: (Date.now() - t0) / 1000, erreur: signal ? `signal ${signal}` : null }) })
  })
}

// ── Le serveur des photos d'essai ─────────────────────────────────────────────────────────────────────────────────────
/**
 * Sert sur 127.0.0.1 les fichiers de c/photos-source/ : GET /<n'importe quel chemin>/<nom> rend le fichier <nom> s'il existe
 * (404 sinon). Chaque requête reçue est notée (méthode et chemin), y compris les 404. → { url, requetes, fermer() }
 */
export async function servirPhotos(dossier = path.join(C, 'photos-source')) {
  const requetes = []
  const srv = http.createServer((req, res) => {
    requetes.push(`${req.method} ${req.url}`)
    let nom = ''
    try { nom = decodeURIComponent(String(req.url).split('?')[0].split('/').pop() ?? '') } catch { /* chemin illisible */ }
    const f = path.join(dossier, nom)
    if (nom && !nom.includes('..') && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(fs.readFileSync(f)) } else { res.writeHead(404); res.end() }
  })
  await new Promise((r) => srv.listen(0, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${srv.address().port}`, requetes, fermer: () => new Promise((r) => srv.close(() => r())) }
}

// ── La règle d'attribution de scripts/site-qa.mjs, importée et appliquée ──────────────────────────────────────────────
/**
 * site-qa.mjs est un script (il se lance dès qu'on l'importe) : on en extrait les déclarations de la règle
 * (LICENCES_PERMISES, AUTEURS_BIDON, mojibake, sourcePrecise, attributionCredible), telles quelles, dans un module à part
 * importé par data: URL. → { attributionCredible, LICENCES_PERMISES, source } ; lève si une déclaration manque.
 */
export async function regleAttribution(racine) {
  const f = [path.join(racine, 'scripts', 'site-qa.mjs'), path.join(R, 'scripts', 'site-qa.mjs')].find((x) => fs.existsSync(x))
  if (!f) throw new Error('scripts/site-qa.mjs introuvable')
  const lignes = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  const decl = (nom) => { const l = lignes.find((x) => new RegExp(`^(?:export\\s+)?const\\s+${nom}\\s*=`).test(x)); if (!l) throw new Error(`site-qa.mjs : déclaration de ${nom} introuvable`); return l.replace(/^export\s+/, '') }
  const noms = ['LICENCES_PERMISES', 'AUTEURS_BIDON', 'mojibake', 'sourcePrecise', 'attributionCredible']
  const src = `${noms.map(decl).join('\n')}\nexport { ${noms.join(', ')} }\n`
  const m = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`)
  return { attributionCredible: m.attributionCredible, LICENCES_PERMISES: m.LICENCES_PERMISES, source: path.relative(R, f).split(path.sep).join('/') }
}

/** Un bloc EXIF (celui que rend sharp().metadata().exif) porte-t-il un pointeur vers l'IFD GPS (balise 0x8825) ? */
export function exifAvecGps(exif) {
  if (!exif || !exif.length) return false
  const i = exif.indexOf('Exif\0\0')
  const t = i >= 0 ? exif.subarray(i + 6) : exif
  const le = t.toString('ascii', 0, 2) === 'II'
  const u16 = (o) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o)), u32 = (o) => (le ? t.readUInt32LE(o) : t.readUInt32BE(o))
  try { const ifd0 = u32(4); const n = u16(ifd0); for (let k = 0; k < n; k++) if (u16(ifd0 + 2 + k * 12) === 0x8825) return true } catch { /* bloc tronqué */ }
  return false
}

/** `node scripts/site-qa.mjs <dossier> --statique --json`, lancé par le juge lui-même depuis `racine` (sinon le dépôt). */
export async function siteQaStatique(racine, dossier, env) {
  const script = [path.join(racine, 'scripts', 'site-qa.mjs'), path.join(R, 'scripts', 'site-qa.mjs')].find((x) => fs.existsSync(x))
  const r = await lancerAsync(process.execPath, [script, dossier, '--statique', '--json'], { cwd: fs.existsSync(path.join(racine, 'scripts', 'site-qa.mjs')) ? racine : R, env, timeout: 300_000 })
  let rapport = null
  try { rapport = JSON.parse(r.stdout) } catch { /* pas de JSON */ }
  const echecs = rapport ? rapport.blocs.flatMap((b) => b.tests.filter((t) => !t.passe).map((t) => `${b.nom} › ${t.nom} (${court(t.mesure, 60)})`)) : [court(r.sortie, 200)]
  return { ok: r.code === 0 && !!rapport && !echecs.length, code: r.code, echecs, rapport }
}

/** `git status --porcelain --untracked-files=all -- public/` dans le dépôt de `racine` (texte, trié). */
export function gitStatusPublic(racine) {
  const r = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--', 'public/'], { cwd: racine, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  return { ok: r.status === 0, texte: (r.stdout ?? '').split(/\r?\n/).filter(Boolean).sort().join('\n'), erreur: r.status === 0 ? null : court(r.stderr, 200) }
}

/** Les fichiers d'un dossier (chemins relatifs, séparateur /), ou [] s'il n'existe pas. */
export function lireArbre(dossier) {
  const out = []
  const rec = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const r2 = rel ? `${rel}/${e.name}` : e.name; if (e.isDirectory()) rec(path.join(d, e.name), r2); else out.push(r2) } }
  if (fs.existsSync(dossier)) rec(dossier, '')
  return out.sort()
}
export { TRAVAIL }
