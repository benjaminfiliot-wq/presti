#!/usr/bin/env node
// scripts/media-octets-qa.mjs — juge des octets magiques de /api/media (fiche 026-002, pour 026-003), écrit par Claude Code
// AVANT le code qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/media-octets-qa.mjs [--racine=<dossier>] [--git=<dépôt>] [--seulement=MO-1,MO-3]
//   node scripts/media-octets-qa.mjs --autotest      le juge sur un témoin (vert), puis un défaut planté par critère (rouge)
//   node scripts/media-octets-qa.mjs --reel          Claude Code, après le déploiement : compte d'essai, vrais envois
//
//   --racine=<d>  lit <d>/lib/typeImage.ts, <d>/app/api/media/route.ts, <d>/package.json… (défaut : ce dépôt)
//   --git=<d>     le dépôt dont HEAD sert de référence (MO-4, MO-5, MO-NR1) ; défaut : --racine (une copie rangée sous
//                 .orchestre/travail/ de presti y trouve le HEAD de presti, git remontant les dossiers)
//   --seulement=  ne juge que ces critères (l'autotest s'en sert pour ne pas relancer le typecheck à chaque cas)
//
// Sortie : une ligne par critère, « PASS MO-n — … » ou « FAIL MO-n — … », dans l'ordre MO-1 … MO-6, MO-NR1, puis le bilan
// « media-octets-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si l'appel est invalide.
//
//   MO-1   lib/typeImage.ts existe, sans aucun import, et exporte detecterTypeImage(octets), importée par scripts/ts-loader.mjs.
//          Sur des octets construits ici : JPEG (FF D8 FF), le PNG 1×1 de quota-media-e2e.mjs:47, WebP (RIFF…WEBP) →
//          { ok: true, type, ext } champ par champ ; ftyp + avif/avis → { ok: false, raison: 'avif' } ; ftyp + heic, heix,
//          hevc, mif1, msf1 → 'heic' (la marque des octets 8-11 décide, même si mif1 figure plus loin) ; <svg, <?xml,
//          <!doctype html après un BOM ou des blancs, sans casse → 'svg' ; GIF, PDF, ZIP, RIFF/WAVE, vide, PNG tronqué à
//          7 octets → 'inconnu'.
//   MO-2   Dans le corps de POST de route.ts (commentaires retirés) : detecterTypeImage(corps vient après le contrôle « vide »
//          (!corps.length) et le contrôle « trop lourd » (corps.length > TAILLE_MAX_FICHIER), avant consommerLimite( et avant
//          .upload( ; la fonction est importée de lib/typeImage. Puis la route est EXÉCUTÉE ici, avec des doublures de la
//          session, de Supabase, des limites et du quota (aucun réseau, aucune base) : un en-tête HEIC, AVIF, du SVG, du HTML
//          et un GIF, déclarés png/jpg/webp, répondent 415 sans appeler consommerLimite ni .upload ; le message de HEIC
//          contient « HEIC », celui d'AVIF « AVIF », et les deux « JPG » et « réessay » ; un corps vide garde son 400 et un
//          corps trop lourd son 413.
//   MO-3   Route exécutée : l'objet passé à .upload( a contentType = type détecté et le chemin finit par l'extension détectée
//          (PNG déclaré webp → image/png et « .png » ; JPEG déclaré png → image/jpeg et « .jpg » ; WebP déclaré jpg →
//          image/webp et « .webp »), l'URL rendue aussi ; et le corps de POST ne contient plus « ${ext} ».
//   MO-4   Les clés de TYPES sont exactement webp, png, jpg, jpeg, comme à HEAD ; route exécutée : gif, svg ou une extension
//          absente répondent 400 sans rien écrire, jpeg reste accepté.
//   MO-5   Les dépendances de package.json (dependencies, devDependencies, optionalDependencies, peerDependencies) sont
//          identiques à celles de HEAD.
//   MO-6   npm run typecheck est vert (son cache .tsbuildinfo va sous .orchestre/travail/media-octets-qa/).
//   MO-NR1 scripts/quota-media-e2e.mjs est identique à HEAD.
//
// --reel (MO-R1 … MO-R5, jamais dans un verifier d'exécutant) : un compte d'essai sur le modèle de quota-media-e2e.mjs:53-72
// (leads_pause: true), de vrais envois à https://prestiapp.fr/api/media (TEST_BASE pour une autre base), le relevé du dossier
// du compte, et le ménage dans un finally ; code 1 si le ménage échoue.
//
// Écritures : seulement sous <racine>/.orchestre/travail/media-octets-qa/ (le rapport dernier.log, refusé s'il fait 0 octet ;
// le cache du typecheck ; les copies de l'autotest). Aucun secret littéral dans ce fichier.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const JUGE = 'media-octets-qa'
// Un lecteur qui ferme le tube (… | head) ne doit pas tuer le juge avant son ménage.
process.stdout.on('error', () => {}); process.stderr.on('error', () => {})
const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const CRITERES = ['MO-1', 'MO-2', 'MO-3', 'MO-4', 'MO-5', 'MO-6', 'MO-NR1']
const TYPES_ATTENDUS = ['jpeg', 'jpg', 'png', 'webp']
const DEPS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
const TAILLE_SIMU = 256 * 1024 // TAILLE_MAX_FICHIER de la doublure de lib/quotaMedia : le « trop lourd » se prouve vite

// ── options ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function lireOptions(argv) {
  const o = { racine: DEPOT, git: null, seulement: null, autotest: false, reel: false }
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a)
    if (!m) refuser(`argument inconnu : ${a}`)
    const [, k, v] = m
    if (k === 'racine' && v) o.racine = path.resolve(v)
    else if (k === 'git' && v) o.git = path.resolve(v)
    else if (k === 'seulement' && v) o.seulement = v.split(',').map((x) => x.trim()).filter(Boolean)
    else if (k === 'autotest' && v === undefined) o.autotest = true
    else if (k === 'reel' && v === undefined) o.reel = true
    else refuser(`option inconnue ou sans valeur : ${a}`)
  }
  if (o.seulement) for (const c of o.seulement) if (!CRITERES.includes(c)) refuser(`--seulement : critère inconnu ${c}`)
  if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
  o.git = o.git || o.racine
  return o
}
function refuser(m) { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }

// ── petites mains ────────────────────────────────────────────────────────────────────────────────────────────────────
const lireOuNull = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } }
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const sansCr = (s) => String(s).replace(/\r\n/g, '\n')
const versSlash = (p) => p.split(path.sep).join('/')
function git(dossier, args) {
  const r = spawnSync('git', ['--no-optional-locks', '-C', dossier, ...args], { encoding: 'utf8', maxBuffer: 1 << 26, windowsHide: true })
  return r.status === 0 ? r.stdout : null
}
/** Retire les commentaires // et /* *​/ d'un source TS/JS en respectant les chaînes et les gabarits (approché). */
function sansCommentaires(src) {
  let out = '', i = 0, chaine = null
  while (i < src.length) {
    const c = src[i], d = src[i + 1]
    if (chaine) {
      out += c
      if (c === '\\') { out += d ?? ''; i += 2; continue }
      if (c === chaine) chaine = null
      i++; continue
    }
    if (c === '"' || c === "'" || c === '`') { chaine = c; out += c; i++; continue }
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; out += ' '; continue }
    out += c; i++
  }
  return out
}
/** Le corps de la fonction POST : de sa déclaration à l'export suivant (ou la fin). */
function corpsPost(src) {
  const nus = sansCommentaires(src)
  const m = /export\s+(?:async\s+)?function\s+POST\b|export\s+const\s+POST\b/.exec(nus)
  if (!m) return null
  const reste = nus.slice(m.index + m[0].length)
  const fin = reste.search(/\nexport\s/)
  return nus.slice(m.index, m.index + m[0].length + (fin < 0 ? reste.length : fin))
}
function clesTypes(src) {
  const m = /const\s+TYPES\b[^=]*=\s*\{([^}]*)\}/.exec(sansCommentaires(src ?? ''))
  if (!m) return null
  return [...m[1].matchAll(/['"]?([A-Za-z0-9_]+)['"]?\s*:/g)].map((x) => x[1]).sort()
}
function dependances(json) {
  const o = {}
  for (const k of DEPS) if (json && json[k] && typeof json[k] === 'object') o[k] = Object.fromEntries(Object.entries(json[k]).sort(([a], [b]) => a.localeCompare(b)))
  return o
}
function lancer(cmd, args, options = {}) {
  return new Promise((resoudre) => {
    const debut = Date.now()
    const enfant = spawn(cmd, args, { windowsHide: true, ...options, env: { ...process.env, FORCE_COLOR: '0', ...(options.env || {}) } })
    let sortie = '', expire = false
    enfant.stdout?.setEncoding('utf8'); enfant.stderr?.setEncoding('utf8')
    enfant.stdout?.on('data', (d) => { sortie += d })
    enfant.stderr?.on('data', (d) => { sortie += d })
    const minuterie = setTimeout(() => {
      expire = true
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(enfant.pid), '/T', '/F'], { stdio: 'ignore' })
      else enfant.kill('SIGKILL')
    }, options.delaiMs ?? 120_000)
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 1), sortie, expire, duree: (Date.now() - debut) / 1000 }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, expire, duree: (Date.now() - debut) / 1000 }) })
  })
}

// ── les octets des cas, construits ici ───────────────────────────────────────────────────────────────────────────────
// Le PNG 1×1 est celui de scripts/quota-media-e2e.mjs:47 (même base64).
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const octets = (...parts) => Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))))
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }
const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
const ftyp = (marque, compat) => octets(u32(24), 'ftyp', marque, u32(0), ...compat)
const JPEG = octets([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 'JFIF', [0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00])
const WEBP = octets('RIFF', u32le(30), 'WEBPVP8 ', u32le(18), Buffer.alloc(18))
const BOM = [0xef, 0xbb, 0xbf]
const OK = (type, ext) => ({ ok: true, type, ext })
const NON = (raison) => ({ ok: false, raison })
const CAS_TYPE = [
  ['JPEG', JPEG, OK('image/jpeg', 'jpg')],
  ['PNG 1×1 de quota-media-e2e.mjs:47', PNG_1X1, OK('image/png', 'png')],
  ['WebP (RIFF…WEBP)', WEBP, OK('image/webp', 'webp')],
  ['ftyp avif (compat mif1 miaf)', ftyp('avif', ['mif1', 'miaf']), NON('avif')],
  ['ftyp avis', ftyp('avis', ['avif', 'msf1']), NON('avif')],
  ['ftyp heic', ftyp('heic', ['mif1', 'heic']), NON('heic')],
  ['ftyp heix', ftyp('heix', ['mif1', 'heix']), NON('heic')],
  ['ftyp hevc', ftyp('hevc', ['msf1', 'hevc']), NON('heic')],
  ['ftyp mif1', ftyp('mif1', ['mif1', 'heic']), NON('heic')],
  ['ftyp msf1', ftyp('msf1', ['msf1', 'hevc']), NON('heic')],
  ['<svg nu', octets('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'), NON('svg')],
  ['BOM puis <?xml', octets(BOM, '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'), NON('svg')],
  ['blancs puis <!doctype html', octets('\n\t  <!doctype html><html><body></body></html>'), NON('svg')],
  ['BOM, blancs, <!DOCTYPE HTML (casse)', octets(BOM, '  <!DOCTYPE HTML><html></html>'), NON('svg')],
  ['BOM puis <SVG (casse)', octets(BOM, '<SVG></SVG>'), NON('svg')],
  ['GIF89a', octets('GIF89a', [0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00]), NON('inconnu')],
  ['PDF', octets('%PDF-1.7\n%âãÏÓ\n1 0 obj\n'), NON('inconnu')],
  ['ZIP', octets('PK', [0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]), NON('inconnu')],
  ['RIFF…WAVE (pas WEBP)', octets('RIFF', u32le(36), 'WAVEfmt ', u32le(16), Buffer.alloc(16)), NON('inconnu')],
  ['tampon vide', Buffer.alloc(0), NON('inconnu')],
  ['PNG tronqué à 7 octets', PNG_1X1.subarray(0, 7), NON('inconnu')],
]
const remplir = (tete, taille) => Buffer.concat([tete, Buffer.alloc(Math.max(0, taille - tete.length))])

// ── MO-1 : la fonction elle-même ─────────────────────────────────────────────────────────────────────────────────────
async function juger1(o) {
  const f = path.join(o.racine, 'lib', 'typeImage.ts')
  const src = lireOuNull(f)
  if (src === null) return [false, `lib/typeImage.ts absent de ${versSlash(o.racine)}`]
  const nus = sansCommentaires(src)
  if (/(^|[^\w$.])import\s*[\w{*'"(]|\brequire\s*\(|\bexport\s*(?:\*|\{[^}]*\})\s*from\b/.test(nus)) return [false, 'lib/typeImage.ts importe quelque chose : la fonction doit être pure, sans import']
  const loader = path.join(o.racine, 'scripts', 'ts-loader.mjs')
  if (!fs.existsSync(loader)) return [false, 'scripts/ts-loader.mjs absent : lib/typeImage.ts ne peut pas être importé comme le prévoit la fiche']
  const cas = CAS_TYPE.map(([nom, b]) => ({ nom, b64: b.toString('base64') }))
  const code = `
    let m
    try { m = await import(${JSON.stringify(pathToFileURL(f).href)}) } catch (e) { console.log('@@MO1@@' + JSON.stringify({ erreur: 'import impossible : ' + String(e && e.message || e) })); process.exit(0) }
    if (typeof m.detecterTypeImage !== 'function') { console.log('@@MO1@@' + JSON.stringify({ erreur: 'export detecterTypeImage absent ou pas une fonction' })); process.exit(0) }
    const cas = JSON.parse(Buffer.from(process.env.MO1_CAS, 'base64').toString('utf8'))
    const out = []
    for (const c of cas) {
      const b = Buffer.from(c.b64, 'base64')
      try { out.push({ nom: c.nom, r: m.detecterTypeImage(new Uint8Array(b.buffer, b.byteOffset, b.length)) }) }
      catch (e) { out.push({ nom: c.nom, exception: String(e && e.message || e) }) }
    }
    console.log('@@MO1@@' + JSON.stringify({ out }))`
  const r = await lancer(process.execPath, ['--no-warnings', '--import', pathToFileURL(loader).href, '--input-type=module', '-e', code], {
    cwd: o.racine, delaiMs: 60_000, env: { MO1_CAS: Buffer.from(JSON.stringify(cas)).toString('base64') },
  })
  const ligne = r.sortie.split(/\r?\n/).find((l) => l.startsWith('@@MO1@@'))
  if (!ligne) return [false, `l'import de lib/typeImage.ts n'a rien rendu (code ${r.code}${r.expire ? ', délai dépassé' : ''}) : ${court(r.sortie, 200)}`]
  const j = JSON.parse(ligne.slice(7))
  if (j.erreur) return [false, `lib/typeImage.ts : ${court(j.erreur, 200)}`]
  const fautes = []
  j.out.forEach((x, i) => {
    const attendu = CAS_TYPE[i][2]
    if (x.exception) { fautes.push(`${x.nom} : exception « ${court(x.exception, 80)} »`); return }
    const r = x.r
    const bon = r && typeof r === 'object' && Object.entries(attendu).every(([k, v]) => r[k] === v) && (attendu.ok ? true : !('type' in r) || r.type === undefined)
    if (!bon) fautes.push(`${x.nom} : ${court(JSON.stringify(r), 90)} au lieu de ${JSON.stringify(attendu)}`)
  })
  if (fautes.length) return [false, `${fautes.length}/${CAS_TYPE.length} cas faux — ${fautes.slice(0, 4).join(' · ')}${fautes.length > 4 ? ' · …' : ''}`]
  return [true, `detecterTypeImage juste sur ${CAS_TYPE.length} cas (JPEG, PNG, WebP, AVIF ×2, HEIC ×5, SVG/HTML ×5, inconnus ×6), sans import`]
}

// ── la route exécutée avec des doublures ─────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  // MO-2 : les refus, avant la rafale et l'écriture
  { nom: 'HEIC déclaré png', qs: '?ext=png', corps: remplir(ftyp('heic', ['mif1', 'heic']), 2048), groupe: 'refus', raison: 'heic' },
  { nom: 'AVIF déclaré jpg', qs: '?ext=jpg', corps: remplir(ftyp('avif', ['mif1', 'miaf']), 2048), groupe: 'refus', raison: 'avif' },
  { nom: 'SVG déclaré png', qs: '?ext=png', corps: octets('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), groupe: 'refus' },
  { nom: 'HTML déclaré webp', qs: '?ext=webp', corps: octets(BOM, '<!doctype html><html><script>alert(1)</script></html>'), groupe: 'refus' },
  { nom: 'GIF déclaré png', qs: '?ext=png', corps: remplir(octets('GIF89a'), 1024), groupe: 'refus' },
  { nom: 'corps vide', qs: '?ext=png', corps: Buffer.alloc(0), groupe: 'vide' },
  { nom: 'corps trop lourd (octets quelconques)', qs: '?ext=png', corps: Buffer.alloc(TAILLE_SIMU + 1, 0x41), groupe: 'lourd' },
  // MO-3 : le type vient des octets
  { nom: 'PNG déclaré webp', qs: '?ext=webp', corps: remplir(PNG_1X1, 2048), groupe: 'ecrit', type: 'image/png', ext: 'png' },
  { nom: 'JPEG déclaré png', qs: '?ext=png', corps: remplir(JPEG, 2048), groupe: 'ecrit', type: 'image/jpeg', ext: 'jpg' },
  { nom: 'WebP déclaré jpg', qs: '?ext=jpg', corps: remplir(WEBP, 2048), groupe: 'ecrit', type: 'image/webp', ext: 'webp' },
  // MO-4 : la table TYPES et son 400
  { nom: 'extension gif', qs: '?ext=gif', corps: remplir(PNG_1X1, 1024), groupe: 'ext400' },
  { nom: 'extension svg', qs: '?ext=svg', corps: octets('<svg></svg>'), groupe: 'ext400' },
  { nom: 'extension absente', qs: '', corps: remplir(PNG_1X1, 1024), groupe: 'ext400' },
  { nom: 'JPEG déclaré jpeg', qs: '?ext=jpeg', corps: remplir(JPEG, 1024), groupe: 'ext200', type: 'image/jpeg', ext: 'jpg' },
]
// Les modules que la route importe et que l'essai remplace (chemin sous la racine, sans extension ; ou spécificateur nu).
const DOUBLES = ['lib/supabaseAdmin', 'lib/authArtisan', 'lib/media', 'lib/limites', 'lib/quotaMedia']
function nomsExportes(src) {
  const noms = new Set()
  const nus = sansCommentaires(src || '')
  for (const m of nus.matchAll(/export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)) noms.add(m[1])
  for (const m of nus.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)) for (const p of m[1].split(',')) { const n = p.trim().split(/\s+as\s+/).pop()?.trim(); if (n && /^[A-Za-z_$][\w$]*$/.test(n)) noms.add(n) }
  return noms
}
const IMPLEMENTATIONS = `
  const A = () => globalThis.__simuMedia.appels
  class NextResponse extends Response {
    static json(corps, init = {}) { const h = new Headers(init.headers || {}); h.set('content-type', 'application/json'); return new NextResponse(JSON.stringify(corps), { ...init, headers: h }) }
    static next() { return new NextResponse(null) }
  }
  const requete = (resultat) => { const p = new Proxy(function () {}, { get(_, k) {
    if (k === 'then') return (ok, ko) => Promise.resolve({ data: resultat, error: null }).then(ok, ko)
    if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: resultat, error: null })
    return () => p } }); return p }
  const supabaseAdmin = {
    from: () => requete({ plan: 'pro', is_founder: false }),
    rpc: () => requete(null),
    storage: { from: (bucket) => ({
      upload: async (chemin, corps, options) => { A().uploads.push({ bucket, chemin: String(chemin), contentType: options && options.contentType !== undefined ? options.contentType : null }); return { data: { path: chemin }, error: null } },
      remove: async (liste) => { A().retraits.push(...liste); return { data: [], error: null } },
      list: async () => ({ data: [], error: null }),
      getPublicUrl: (chemin) => ({ data: { publicUrl: 'https://simu.supabase.co/storage/v1/object/public/' + bucket + '/' + chemin } }),
    }) },
  }
  globalThis.__simuMedia.exports = {
    NextResponse, NextRequest: Request, supabaseAdmin,
    authArtisan: async () => ({ uid: 'u-simu', id: 'u-simu', email: 'simu@presti-test.invalid' }),
    estEchec: (s) => !s || (typeof s.status === 'number' && s.status >= 400 && 'error' in s),
    MEDIA_BUCKET: 'artisan-media',
    consommerLimite: async () => { A().limite++; return true },
    TAILLE_MAX_FICHIER: ${TAILLE_SIMU},
    formaterOctets: (n) => n + ' o',
    messagePlafondImages: () => 'plafond simulé',
    octetsImages: async () => 0,
    plafondImages: () => 1e12,
    verifierQuotaImages: async () => { A().quota++; return { ok: true, utilise: 0, plafond: 1e12 } },
  }`
async function executerRoute(o) {
  const route = path.join(o.racine, 'app', 'api', 'media', 'route.ts')
  if (!fs.existsSync(route)) return { erreur: 'app/api/media/route.ts absent' }
  const racineUrl = pathToFileURL(o.racine + path.sep).href
  const doubles = { 'next/server': ['NextResponse', 'NextRequest'] }
  for (const d of DOUBLES) doubles[d] = [...nomsExportes(lireOuNull(path.join(o.racine, `${d}.ts`)))]
  const urls = {}
  for (const [k, noms] of Object.entries(doubles)) {
    const tous = new Set([...noms, 'NextResponse', 'NextRequest', 'supabaseAdmin', 'authArtisan', 'estEchec', 'MEDIA_BUCKET', 'consommerLimite', 'TAILLE_MAX_FICHIER', 'formaterOctets', 'messagePlafondImages', 'octetsImages', 'plafondImages', 'verifierQuotaImages'])
    urls[k] = 'data:text/javascript,' + encodeURIComponent(`// doublure ${k}\n${[...tous].map((n) => `export const ${n} = globalThis.__simuMedia.exports[${JSON.stringify(n)}];`).join('\n')}`)
  }
  const crochets = `
    import { statSync } from 'node:fs'
    import { fileURLToPath } from 'node:url'
    const RACINE = ${JSON.stringify(racineUrl)}
    const DOUBLES = ${JSON.stringify(urls)}
    const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
    export async function resolve(spec, ctx, next) {
      if (DOUBLES[spec]) return { url: DOUBLES[spec], shortCircuit: true }
      let s = spec
      if (s.startsWith('@/')) s = new URL(s.slice(2), RACINE).href
      if (s.startsWith('.') || s.startsWith('file:')) {
        const base = s.startsWith('file:') ? s : new URL(s, ctx.parentURL).href
        if (base.startsWith(RACINE)) {
          const rel = decodeURIComponent(base.slice(RACINE.length)).replace(/\\.(ts|tsx|mjs|js)$/, '').replace(/\\/index$/, '')
          if (DOUBLES[rel]) return { url: DOUBLES[rel], shortCircuit: true }
        }
        for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts']) if (estFichier(c)) return next(c, ctx)
      }
      if (ctx.parentURL && ctx.parentURL.startsWith('data:') && !/^(node:|data:|file:|\\.)/.test(s)) return next(s, { ...ctx, parentURL: RACINE + 'package.json' })
      return next(s, ctx)
    }`
  const code = `
    import { register } from 'node:module'
    register('data:text/javascript,' + encodeURIComponent(${JSON.stringify(crochets)}))
    globalThis.__simuMedia = { appels: null, exports: {} }
    ${IMPLEMENTATIONS}
    let route
    try { route = await import(${JSON.stringify(pathToFileURL(route).href)}) } catch (e) { console.log('@@SIMU@@' + JSON.stringify({ erreur: 'route.ts ne s’importe pas avec les doublures : ' + String(e && e.message || e) })); process.exit(0) }
    if (typeof route.POST !== 'function') { console.log('@@SIMU@@' + JSON.stringify({ erreur: 'route.ts n’exporte pas POST' })); process.exit(0) }
    const scenarios = JSON.parse(Buffer.from(process.env.MO_SCENARIOS, 'base64').toString('utf8'))
    const out = []
    for (const sc of scenarios) {
      globalThis.__simuMedia.appels = { limite: 0, quota: 0, uploads: [], retraits: [] }
      const corps = Buffer.from(sc.b64, 'base64')
      const req = new Request('http://simu.local/api/media' + sc.qs, { method: 'POST', headers: { authorization: 'Bearer simu', 'content-type': 'application/octet-stream' }, body: corps })
      const r = { nom: sc.nom, statut: null, json: null, exception: null }
      try { const rep = await route.POST(req); r.statut = rep.status; try { r.json = await rep.json() } catch { r.json = null } }
      catch (e) { r.exception = String(e && e.message || e).slice(0, 300) }
      r.appels = globalThis.__simuMedia.appels
      out.push(r)
    }
    console.log('@@SIMU@@' + JSON.stringify({ out }))`
  const scenarios = SCENARIOS.map((s) => ({ nom: s.nom, qs: s.qs, b64: s.corps.toString('base64') }))
  const r = await lancer(process.execPath, ['--no-warnings', '--input-type=module', '-e', code], {
    cwd: o.racine, delaiMs: 60_000, env: { MO_SCENARIOS: Buffer.from(JSON.stringify(scenarios)).toString('base64') },
  })
  const ligne = r.sortie.split(/\r?\n/).find((l) => l.startsWith('@@SIMU@@'))
  if (!ligne) return { erreur: `la route n'a rien rendu (code ${r.code}${r.expire ? ', délai dépassé' : ''}) : ${court(r.sortie, 200)}` }
  const j = JSON.parse(ligne.slice(8))
  if (j.erreur) return { erreur: j.erreur }
  return { parNom: Object.fromEntries(j.out.map((x) => [x.nom, x])) }
}
const texteReponse = (x) => { const t = []; const f = (v) => { if (typeof v === 'string') t.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(f) }; f(x?.json); return t.join(' ') }
const resume = (x) => x.exception ? `exception « ${court(x.exception, 70)} »` : `${x.statut}${x.appels?.uploads?.length ? ` · upload ${x.appels.uploads.map((u) => `${u.contentType} ${u.chemin.split('/').pop()}`).join(', ')}` : ''}${x.appels?.limite ? ` · consommerLimite ×${x.appels.limite}` : ''}`

async function juger2(o, simu) {
  const src = lireOuNull(path.join(o.racine, 'app', 'api', 'media', 'route.ts'))
  if (src === null) return [false, 'app/api/media/route.ts absent']
  const f = []
  const post = corpsPost(src)
  if (!post) f.push('fonction POST introuvable dans route.ts')
  else {
    const iDet = post.search(/\bdetecterTypeImage\s*\(\s*corps\b/)
    const iVide = post.search(/!\s*corps\s*\.\s*(?:byteL|l)ength\b|\bcorps\s*\.\s*(?:byteL|l)ength\s*(?:===?|<=|<)\s*[01]\b/)
    const iLourd = post.search(/\bcorps\s*\.\s*(?:byteL|l)ength\s*>=?\s*TAILLE_MAX_FICHIER\b/)
    const iLimite = post.indexOf('consommerLimite(')
    const iUpload = post.indexOf('.upload(')
    if (iDet < 0) f.push('aucun appel detecterTypeImage(corps dans POST')
    else {
      if (iVide < 0) f.push('contrôle « vide » (!corps.length) introuvable')
      else if (iVide > iDet) f.push('detecterTypeImage(corps vient avant le contrôle « vide »')
      if (iLourd < 0) f.push('contrôle « trop lourd » (corps.length > TAILLE_MAX_FICHIER) introuvable')
      else if (iLourd > iDet) f.push('detecterTypeImage(corps vient avant le contrôle « trop lourd »')
      if (iLimite < 0) f.push('consommerLimite( introuvable dans POST')
      else if (iLimite < iDet) f.push('consommerLimite( vient avant detecterTypeImage(corps')
      if (iUpload < 0) f.push('.upload( introuvable dans POST')
      else if (iUpload < iDet) f.push('.upload( vient avant detecterTypeImage(corps')
    }
    if (!/import\s*\{[^}]*\bdetecterTypeImage\b[^}]*\}\s*from\s*['"](?:@\/lib\/typeImage|(?:\.\.\/)+lib\/typeImage)(?:\.ts)?['"]/.test(sansCommentaires(src))) f.push('detecterTypeImage n’est pas importée de lib/typeImage')
  }
  if (simu.erreur) f.push(`route non exécutable : ${court(simu.erreur, 160)}`)
  else {
    for (const sc of SCENARIOS.filter((s) => ['refus', 'vide', 'lourd'].includes(s.groupe))) {
      const x = simu.parNom[sc.nom]
      if (!x || x.exception) { f.push(`${sc.nom} : ${x ? resume(x) : 'absent'}`); continue }
      if (sc.groupe === 'refus') {
        if (x.statut !== 415) f.push(`${sc.nom} → ${resume(x)} au lieu de 415`)
        else if (x.appels.uploads.length || x.appels.limite) f.push(`${sc.nom} → 415 mais ${x.appels.uploads.length ? '.upload appelé' : 'consommerLimite appelé'} avant le refus`)
        if (sc.raison && x.statut === 415) {
          const t = texteReponse(x)
          const format = sc.raison === 'heic' ? /HEIC/ : /AVIF/
          if (!format.test(t) || !/JPG/.test(t) || !/r[ée]essa/i.test(t)) f.push(`${sc.nom} : message « ${court(t, 90)} » sans ${sc.raison.toUpperCase()}, « JPG » et « réessay »`)
        }
      } else if (sc.groupe === 'vide' && (x.statut !== 400 || x.appels.uploads.length)) f.push(`${sc.nom} → ${resume(x)} au lieu de 400`)
      else if (sc.groupe === 'lourd' && (x.statut !== 413 || x.appels.uploads.length)) f.push(`${sc.nom} → ${resume(x)} au lieu de 413 (le contrôle « trop lourd » passe avant la détection)`)
    }
  }
  if (f.length) return [false, `${f.length} défaut(s) — ${f.slice(0, 4).join(' · ')}${f.length > 4 ? ' · …' : ''}`]
  return [true, 'detecterTypeImage(corps après « vide » et « trop lourd », avant consommerLimite( et .upload( ; route exécutée : HEIC, AVIF, SVG, HTML, GIF → 415 sans rafale ni écriture, messages HEIC/AVIF + JPG + réessayez ; vide 400, trop lourd 413']
}
async function juger3(o, simu) {
  const src = lireOuNull(path.join(o.racine, 'app', 'api', 'media', 'route.ts'))
  if (src === null) return [false, 'app/api/media/route.ts absent']
  const f = []
  const post = corpsPost(src)
  if (post && /\$\{\s*ext\s*\}/.test(post)) f.push('le corps de POST écrit encore ${ext} (l’extension de la requête) dans un gabarit')
  if (simu.erreur) f.push(`route non exécutable : ${court(simu.erreur, 160)}`)
  else for (const sc of SCENARIOS.filter((s) => s.groupe === 'ecrit')) {
    const x = simu.parNom[sc.nom]
    if (!x || x.exception || x.statut !== 200) { f.push(`${sc.nom} → ${x ? resume(x) : 'absent'} au lieu de 200`); continue }
    const u = x.appels.uploads
    if (u.length !== 1) { f.push(`${sc.nom} : ${u.length} appel(s) à .upload au lieu d'un`); continue }
    if (u[0].contentType !== sc.type) f.push(`${sc.nom} : contentType ${u[0].contentType} au lieu de ${sc.type}`)
    if (!u[0].chemin.endsWith(`.${sc.ext}`)) f.push(`${sc.nom} : fichier « ${u[0].chemin.split('/').pop()} » au lieu de …${sc.ext}`)
    const url = typeof x.json?.url === 'string' ? x.json.url : ''
    if (!url.endsWith(`.${sc.ext}`)) f.push(`${sc.nom} : URL rendue « ${court(url.split('/').pop(), 40)} » au lieu de …${sc.ext}`)
  }
  if (f.length) return [false, `${f.length} défaut(s) — ${f.slice(0, 4).join(' · ')}${f.length > 4 ? ' · …' : ''}`]
  return [true, 'contentType et extension du fichier viennent des octets : PNG déclaré webp → image/png « .png », JPEG déclaré png → image/jpeg « .jpg », WebP déclaré jpg → image/webp « .webp »']
}
async function juger4(o, simu) {
  const f = []
  const ici = clesTypes(lireOuNull(path.join(o.racine, 'app', 'api', 'media', 'route.ts')))
  const tete = git(o.git, ['show', 'HEAD:app/api/media/route.ts'])
  const avant = tete === null ? null : clesTypes(tete)
  if (!ici) f.push('table TYPES introuvable dans route.ts')
  else if (ici.join(',') !== TYPES_ATTENDUS.join(',')) f.push(`clés de TYPES ${ici.join(', ')} au lieu de ${TYPES_ATTENDUS.join(', ')}`)
  if (avant === null) f.push(`HEAD:app/api/media/route.ts illisible depuis ${versSlash(o.git)} (--git=)`)
  else if (ici && avant.join(',') !== ici.join(',')) f.push(`clés de TYPES changées depuis HEAD (${avant.join(', ')} → ${ici.join(', ')})`)
  if (simu.erreur) f.push(`route non exécutable : ${court(simu.erreur, 160)}`)
  else for (const sc of SCENARIOS.filter((s) => s.groupe === 'ext400' || s.groupe === 'ext200')) {
    const x = simu.parNom[sc.nom]
    if (!x || x.exception) { f.push(`${sc.nom} : ${x ? resume(x) : 'absent'}`); continue }
    if (sc.groupe === 'ext400' && (x.statut !== 400 || x.appels.uploads.length)) f.push(`${sc.nom} → ${resume(x)} au lieu de 400 sans écriture`)
    if (sc.groupe === 'ext200' && x.statut !== 200) f.push(`${sc.nom} → ${resume(x)} au lieu de 200`)
  }
  if (f.length) return [false, `${f.length} défaut(s) — ${f.slice(0, 4).join(' · ')}`]
  return [true, `TYPES = ${ici.join(', ')}, comme à HEAD ; gif, svg et une extension absente → 400 sans écriture ; jpeg accepté`]
}
function juger5(o) {
  const ici = lireOuNull(path.join(o.racine, 'package.json'))
  const tete = git(o.git, ['show', 'HEAD:package.json'])
  if (ici === null) return [false, 'package.json absent']
  if (tete === null) return [false, `HEAD:package.json illisible depuis ${versSlash(o.git)} (--git=)`]
  let a, b
  try { a = dependances(JSON.parse(tete)); b = dependances(JSON.parse(ici)) } catch (e) { return [false, `package.json illisible : ${e.message}`] }
  const f = []
  for (const k of DEPS) {
    const x = a[k] || {}, y = b[k] || {}
    for (const n of Object.keys(y)) if (!(n in x)) f.push(`${k} : ${n} ajoutée`)
      else if (x[n] !== y[n]) f.push(`${k} : ${n} ${x[n]} → ${y[n]}`)
    for (const n of Object.keys(x)) if (!(n in y)) f.push(`${k} : ${n} retirée`)
  }
  if (f.length) return [false, `dépendances différentes de HEAD — ${f.slice(0, 5).join(' · ')}`]
  return [true, `dépendances identiques à HEAD (${DEPS.map((k) => Object.keys(b[k] || {}).length).reduce((s, n) => s + n, 0)} paquets)`]
}
async function juger6(o) {
  const cache = path.join(o.racine, '.orchestre', 'travail', JUGE, 'tsconfig.tsbuildinfo')
  fs.mkdirSync(path.dirname(cache), { recursive: true })
  const r = await lancer(`npm run typecheck -- --tsBuildInfoFile "${cache}"`, [], { cwd: o.racine, shell: true, delaiMs: 15 * 60_000 })
  if (r.code === 0) return [true, `npm run typecheck vert (${r.duree.toFixed(0)} s)`]
  const erreurs = r.sortie.split(/\r?\n/).filter((l) => /error TS\d+/.test(l))
  return [false, `npm run typecheck en code ${r.code}${r.expire ? ' (délai dépassé)' : ''} — ${erreurs.length} erreur(s) TS : ${court(erreurs[0] || r.sortie.split(/\r?\n/).filter(Boolean).slice(-2).join(' '), 200)}`]
}
function jugerNr1(o) {
  const ici = lireOuNull(path.join(o.racine, 'scripts', 'quota-media-e2e.mjs'))
  const tete = git(o.git, ['show', 'HEAD:scripts/quota-media-e2e.mjs'])
  if (ici === null) return [false, 'scripts/quota-media-e2e.mjs absent']
  if (tete === null) return [false, `HEAD:scripts/quota-media-e2e.mjs illisible depuis ${versSlash(o.git)} (--git=)`]
  if (sansCr(ici) !== sansCr(tete)) return [false, 'scripts/quota-media-e2e.mjs diffère de HEAD']
  return [true, 'scripts/quota-media-e2e.mjs identique à HEAD']
}

// ── le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger(o) {
  const voulus = o.seulement || CRITERES
  const lignes = []
  const dire = (l) => { console.log(l); lignes.push(l) }
  const rouges = []
  const noter = (id, [ok, detail]) => { dire(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`); if (!ok) rouges.push(id) }
  const simu = voulus.some((c) => ['MO-2', 'MO-3', 'MO-4'].includes(c)) ? await executerRoute(o) : null
  for (const id of CRITERES) {
    if (!voulus.includes(id)) continue
    try {
      if (id === 'MO-1') noter(id, await juger1(o))
      else if (id === 'MO-2') noter(id, await juger2(o, simu))
      else if (id === 'MO-3') noter(id, await juger3(o, simu))
      else if (id === 'MO-4') noter(id, await juger4(o, simu))
      else if (id === 'MO-5') noter(id, juger5(o))
      else if (id === 'MO-6') noter(id, await juger6(o))
      else if (id === 'MO-NR1') noter(id, jugerNr1(o))
    } catch (e) { noter(id, [false, `le juge n'a pas pu mesurer : ${court(e.message, 160)}`]) }
  }
  dire(`${JUGE}${o.seulement ? ` (seulement ${o.seulement.join(', ')})` : ''} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : 'PASS'} · racine ${versSlash(o.racine)}`)
  ecrireRapport(o.racine, 'dernier.log', lignes.join('\n') + '\n')
  return rouges.length ? 1 : 0
}
function ecrireRapport(racine, nom, texte) {
  const f = path.join(racine, '.orchestre', 'travail', JUGE, nom)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, texte)
  if (!fs.statSync(f).size) { console.log(`ERREUR ${JUGE} : rapport ${versSlash(f)} de 0 octet, refusé`); process.exit(1) }
}

// ── --autotest : un témoin vert, puis un défaut planté par critère ───────────────────────────────────────────────────
const FIXTURES = path.join(DEPOT, 'scripts', 'fixtures', '026', 'securite', 'media')
const SANS_TYPECHECK = CRITERES.filter((c) => c !== 'MO-6').join(',')
// Chaque cas : UN remplacement exact dans le témoin (format des mutations de 026-001), le critère attendu en échec, et
// ceux qui échouent forcément avec lui (`aussi`). Le fichier est restauré après chaque cas.
const CAS_AUTOTEST = [
  { nom: 'heic-accepte', fichier: 'lib/typeImage.ts', avant: "if (MARQUES_HEIC.has(marque)) return { ok: false, raison: 'heic' }", apres: "if (MARQUES_HEIC.has(marque)) return { ok: true, type: 'image/jpeg', ext: 'jpg' }", attendu: 'MO-1', aussi: ['MO-2'] },
  { nom: 'svg-sans-bom', fichier: 'lib/typeImage.ts', avant: 'let i = n >= 3 && octets[0] === 0xef', apres: 'let i = n >= 3 && octets[0] === 0x00', attendu: 'MO-1', aussi: ['MO-2'] },
  { nom: 'marque-compat', fichier: 'lib/typeImage.ts', avant: 'const marque = ascii(octets, 8, 12)', apres: 'const marque = ascii(octets, 16, 20)', attendu: 'MO-1', aussi: ['MO-2'] },
  { nom: 'type-import', fichier: 'lib/typeImage.ts', avant: 'export type TypeDetecte =', apres: "import { MEDIA_BUCKET } from './media'\nexport type TypeDetecte =", attendu: 'MO-1' },
  { nom: 'detection-apres-rafale', fichier: 'app/api/media/route.ts', avant: "  // Témoin 026-002 : le type se lit dans les octets, jamais dans ?ext=.\n  const detecte = detecterTypeImage(corps)", apres: "  if (!(await consommerLimite(`media:avant:${s.uid}`, MAX_ENVOIS, FENETRE_ENVOIS))) return NextResponse.json({ error: 'rafale' }, { status: 429 })\n  const detecte = detecterTypeImage(corps)", attendu: 'MO-2' },
  { nom: 'refus-en-200', fichier: 'app/api/media/route.ts', avant: 'return NextResponse.json({ error: message }, { status: 415 })', apres: 'console.warn(message)', attendu: 'MO-2' },
  { nom: 'message-sans-jpg', fichier: 'app/api/media/route.ts', avant: 'réessayez en JPG (réglage', apres: 'réessayez plus tard (réglage', attendu: 'MO-2' },
  { nom: 'contenttype-ext', fichier: 'app/api/media/route.ts', avant: 'contentType: detecte.type,', apres: 'contentType: type,', attendu: 'MO-3' },
  { nom: 'chemin-ext-requete', fichier: 'app/api/media/route.ts', avant: '${rand}.${detecte.ext}`', apres: '${rand}.${ext}`', attendu: 'MO-3' },
  { nom: 'types-gif', fichier: 'app/api/media/route.ts', avant: "webp: 'image/webp', png: 'image/png',", apres: "webp: 'image/webp', png: 'image/png', gif: 'image/gif',", attendu: 'MO-4' },
  { nom: 'dependance-sharp', fichier: 'package.json', avant: '"dependencies": {', apres: '"dependencies": {\n    "sharp": "^0.33.5",', attendu: 'MO-5' },
  { nom: 'quota-e2e-touche', fichier: 'scripts/quota-media-e2e.mjs', avant: "const MO = 1024 * 1024", apres: "const MO = 1000 * 1000", attendu: 'MO-NR1' },
  { nom: 'erreur-de-type', fichier: 'lib/typeImage.ts', avant: 'const n = octets.length', apres: 'const n: string = octets.length', attendu: 'MO-6', seulement: 'MO-6' },
]
const JONCTIONS = ['node_modules']
function supprimerCopie(dir, borne) {
  if (!fs.existsSync(dir)) return
  if (!path.resolve(dir).startsWith(path.resolve(borne) + path.sep)) throw new Error(`suppression refusée hors de ${borne} : ${dir}`)
  for (const j of JONCTIONS) { const p = path.join(dir, j); try { if (fs.lstatSync(p).isSymbolicLink()) fs.unlinkSync(p) } catch { /* absent */ } }
  for (const j of JONCTIONS) if (fs.existsSync(path.join(dir, j))) throw new Error(`jonction ${j} non retirée : suppression refusée`)
  fs.rmSync(dir, { recursive: true, force: true })
}
/** Le témoin part de HEAD (git archive), pas de l'arbre de travail : les chantiers non commités des autres sessions n'y
 *  entrent pas, et le typecheck du témoin ne rougit pas à cause d'eux. next-env.d.ts (ignoré par git) vient de l'arbre. */
function fabriquerTemoin(dir) {
  const voulus = ['app', 'lib', 'package.json', 'tsconfig.json', 'next.config.mjs', 'middleware.ts', 'proxy.ts', 'scripts/ts-loader.mjs', 'scripts/quota-media-e2e.mjs']
  const presents = new Set((git(DEPOT, ['ls-tree', '--name-only', 'HEAD', '--', ...voulus]) || '').split('\n').filter(Boolean))
  const archive = spawnSync('git', ['-C', DEPOT, 'archive', '--format=tar', 'HEAD', '--', ...voulus.filter((v) => presents.has(v))], { maxBuffer: 1 << 28, windowsHide: true })
  if (archive.status !== 0) throw new Error(`git archive HEAD : ${court(archive.stderr, 160)}`)
  const systeme = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : null
  const tar = spawnSync(systeme && fs.existsSync(systeme) ? systeme : 'tar', ['-x', '-f', '-', '-C', dir], { input: archive.stdout, windowsHide: true, maxBuffer: 1 << 26 })
  if (tar.status !== 0) throw new Error(`tar -x : ${court(tar.stderr, 160)}`)
  if (fs.existsSync(path.join(DEPOT, 'next-env.d.ts'))) fs.copyFileSync(path.join(DEPOT, 'next-env.d.ts'), path.join(dir, 'next-env.d.ts'))
  let n = 0
  const compter = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) compter(path.join(d, e.name)); else n++ } }
  compter(dir)
  fs.symlinkSync(path.join(DEPOT, 'node_modules'), path.join(dir, 'node_modules'), 'junction')
  fs.copyFileSync(path.join(FIXTURES, 'typeImage.temoin.ts.txt'), path.join(dir, 'lib', 'typeImage.ts'))
  fs.copyFileSync(path.join(FIXTURES, 'route.temoin.ts.txt'), path.join(dir, 'app', 'api', 'media', 'route.ts'))
  return n
}
const rougesDe = (sortie) => [...new Set(sortie.split(/\r?\n/).map((l) => /^FAIL (MO-[A-Z0-9]+)\b/.exec(l)).filter(Boolean).map((m) => m[1]))]
async function autotest() {
  const borne = path.join(DEPOT, '.orchestre', 'travail', JUGE)
  const T = path.join(borne, 'autotest', 'temoin')
  supprimerCopie(T, borne)
  fs.mkdirSync(T, { recursive: true })
  const lignes = []
  const dire = (l) => { console.log(l); lignes.push(l) }
  let ok = true
  try {
    const n = fabriquerTemoin(T)
    dire(`témoin : ${n} fichiers de app/, lib/ et de la racine, pris à HEAD, dans ${versSlash(path.relative(DEPOT, T))} ; node_modules en jonction ; lib/typeImage.ts et route.ts pris dans scripts/fixtures/026/securite/media/`)
    const moi = fileURLToPath(import.meta.url)
    const juge = (seulement) => lancer(process.execPath, [moi, `--racine=${T}`, `--git=${DEPOT}`, ...(seulement ? [`--seulement=${seulement}`] : [])], { cwd: T, delaiMs: 20 * 60_000 })
    const t0 = await juge(null)
    const r0 = rougesDe(t0.sortie)
    const vert = t0.code === 0 && !r0.length && CRITERES.every((c) => new RegExp(`^PASS ${c}\\b`, 'm').test(t0.sortie))
    dire(`${vert ? 'PASS' : 'FAIL'} AT-temoin — témoin complet (MO-6 compris) en code ${t0.code}${r0.length ? `, rouges : ${r0.join(', ')}` : ', tout vert'} (${t0.duree.toFixed(0)} s)`)
    if (!vert) { ok = false; for (const l of t0.sortie.split(/\r?\n/).filter((x) => /^FAIL /.test(x))) dire(`    ${court(l, 220)}`) }
    for (const c of CAS_AUTOTEST) {
      const f = path.join(T, c.fichier)
      const original = fs.readFileSync(f, 'utf8')
      const nb = original.split(c.avant).length - 1
      if (nb !== 1) { ok = false; dire(`FAIL AT-${c.nom} — « avant » présent ${nb} fois dans ${c.fichier}`); continue }
      fs.writeFileSync(f, original.replace(c.avant, () => c.apres))
      let r
      try { r = await juge(c.seulement || SANS_TYPECHECK) } finally { fs.writeFileSync(f, original) }
      const rouges = rougesDe(r.sortie)
      const permis = new Set([c.attendu, ...(c.aussi || [])])
      const ligne = r.sortie.split(/\r?\n/).find((l) => new RegExp(`^FAIL ${c.attendu}\\b`).test(l))
      const bon = r.code !== 0 && !!ligne && rouges.every((x) => permis.has(x))
      if (!bon) ok = false
      dire(`${bon ? 'PASS' : 'FAIL'} AT-${c.nom} — ${c.fichier} muté → code ${r.code}, rouges ${rouges.join(', ') || 'aucun'} (attendu ${c.attendu}${c.aussi ? ` + ${c.aussi.join(', ')}` : ''})${ligne ? ` · « ${court(ligne, 150)} »` : ''}`)
    }
    const restaure = fs.readFileSync(path.join(T, 'lib', 'typeImage.ts'), 'utf8') === fs.readFileSync(path.join(FIXTURES, 'typeImage.temoin.ts.txt'), 'utf8')
      && fs.readFileSync(path.join(T, 'app', 'api', 'media', 'route.ts'), 'utf8') === fs.readFileSync(path.join(FIXTURES, 'route.temoin.ts.txt'), 'utf8')
    if (!restaure) ok = false
    dire(`${restaure ? 'PASS' : 'FAIL'} AT-restauration — le témoin est revenu à l'original après chaque cas`)
  } finally {
    supprimerCopie(T, borne)
  }
  const nette = fs.existsSync(path.join(DEPOT, 'node_modules', 'next', 'package.json'))
  if (!nette) { ok = false; dire('FAIL AT-jonction — node_modules/next/package.json du dépôt introuvable après le ménage') }
  dire(`${JUGE} --autotest : ${ok ? 'PASS' : 'FAIL'} — ${CAS_AUTOTEST.length} défauts plantés`)
  ecrireRapport(DEPOT, 'autotest.log', lignes.join('\n') + '\n')
  return ok ? 0 : 1
}

// ── --reel : la production, par Claude Code après le déploiement de 026-003 ──────────────────────────────────────────
async function reel(o) {
  const env = lireOuNull(path.join(o.racine, '.env.local'))
  if (env === null) refuser('.env.local absent : --reel se lance depuis le poste de Benj, par Claude Code')
  for (const l of env.split(/\r?\n/)) { const m = l.match(/^([A-Z_0-9]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
  const { createClient } = await import('@supabase/supabase-js')
  const { verifierSessionTest } = await import(pathToFileURL(path.join(o.racine, 'scripts', 'lib', 'connexion-test.mjs')).href)
  const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
  const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rouges = []
  const noter = (id, ok, d) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${d}`); if (!ok) rouges.push(id) }
  let uid = null, menageOk = true
  const envoyer = (jeton, corps, ext) => fetch(`${BASE}/api/media?ext=${ext}`, { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/octet-stream' }, body: corps })
    .then(async (r) => ({ statut: r.status, json: await r.json().catch(() => ({})) }))
  const fichiers = async () => { const { data } = await admin.storage.from('artisan-media').list(uid, { limit: 1000 }); return data || [] }
  try {
    const tag = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
    const email = `verif-octets-${tag}@presti-test.invalid`
    const motDePasse = crypto.randomBytes(18).toString('base64url')
    const { data: u, error } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
    if (error) throw new Error(`compte : ${error.message}`)
    uid = u.user.id
    const { error: eIns } = await admin.from('artisans').insert({ id: uid, email, nom: 'Vérif Octets', metier: 'Plombier', slug: `verif-octets-${tag}`, plan: 'gratuit', leads_pause: true, site_active: false })
    if (eIns) throw new Error(`artisan : ${eIns.message}`)
    const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
    const { data: s, error: eLog } = await pub.auth.signInWithPassword({ email, password: motDePasse })
    if (eLog) throw new Error(`connexion : ${eLog.message}`)
    await verifierSessionTest(s?.session?.access_token)
    const jeton = s.session.access_token
    const heic = await envoyer(jeton, remplir(ftyp('heic', ['mif1', 'heic']), 4096), 'png')
    noter('MO-R1', heic.statut === 415, `en-tête HEIC déclaré png → ${heic.statut} ${court(heic.json?.error, 80)}`)
    const svg = await envoyer(jeton, octets('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'png')
    noter('MO-R2', svg.statut === 415, `SVG déclaré png → ${svg.statut}`)
    const apresRefus = await fichiers()
    const png = await envoyer(jeton, remplir(PNG_1X1, 4096), 'webp')
    noter('MO-R3', png.statut === 200 && /\.png$/.test(png.json?.url || ''), `PNG déclaré webp → ${png.statut} ${court(String(png.json?.url || png.json?.error || '').split('/').pop(), 60)}`)
    const jpeg = await envoyer(jeton, remplir(JPEG, 4096), 'jpg')
    noter('MO-R4', jpeg.statut === 200, `JPEG → ${jpeg.statut}`)
    noter('MO-R5', apresRefus.length === 0, `dossier du compte après les deux refus : ${apresRefus.length} fichier(s)`)
  } catch (e) {
    noter('MO-R0', false, `essai interrompu : ${court(e.message, 160)}`)
  } finally {
    if (uid) {
      try {
        const l = await fichiers()
        if (l.length) { const { error } = await admin.storage.from('artisan-media').remove(l.map((f) => `${uid}/${f.name}`)); if (error) throw error }
        const { error: e1 } = await admin.from('artisans').delete().eq('id', uid); if (e1) throw e1
        const { error: e2 } = await admin.auth.admin.deleteUser(uid); if (e2) throw e2
        console.log('ménage : compte d’essai, artisan et fichiers supprimés')
      } catch (e) { menageOk = false; console.log(`FAIL MO-R6 — ménage incomplet (compte ${uid}) : ${court(e.message, 120)} — ALERTE BENJ : compte d'essai à supprimer`) }
    }
  }
  const ok = !rouges.length && menageOk
  console.log(`${JUGE} --reel : ${ok ? 'PASS' : `FAIL — ${[...rouges, ...(menageOk ? [] : ['MO-R6'])].join(', ')}`}`)
  return ok ? 0 : 1
}

const o = lireOptions(process.argv.slice(2))
const code = o.autotest ? await autotest() : o.reel ? await reel(o) : await juger(o)
process.exit(code)
