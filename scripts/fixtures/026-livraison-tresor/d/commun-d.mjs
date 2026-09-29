// scripts/fixtures/026-livraison-tresor/d/commun-d.mjs — le socle propre aux juges du lot D (fiche 026-026 : dossier-zip-qa,
// retrait-site-qa, poste-sites-qa, bus-livraison-qa), écrit par Claude Code le 27/09. Il s'ajoute à ../commun.mjs (règles
// communes du domaine, fiche 026-018), qu'il ne modifie pas. Les fiches d'exécutant n'y touchent jamais (scripts/fixtures/**
// est dans leur `interdit`).
//
// Ce qu'il apporte :
//   - l'enfant du lot D (preparerEnfantD) : le crochet de ../commun.mjs, servi avec d/doublures.mjs (le socle a/doublures.mjs
//     plus un stockage en mémoire, un rpc vers le faux PostgREST, des pannes de table, des espions) ; fetch hors 127.0.0.1
//     refusé et consigné ;
//   - la base « d'avant la fiche » lue dans le dépôt git de la RACINE quand elle en a un (maquette témoin de la preuve
//     « sait échouer »), sinon dans le dépôt qui contient ce script (même règle que baseAvant de ../commun.mjs) ;
//   - un lecteur ZIP indépendant de lib/zip.ts (répertoire central, en-têtes locaux, zlib.inflateRawSync, CRC-32 recalculé) ;
//   - de petits outils de lecture de source (appel dans un try, sous une condition), de dates et de routes.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import http from 'node:http'
import { register } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { R, DEPOT_GIT, CROCHET, court, premiereLigne, lf, lireOuNull, sansCommentaires, fermante } from '../commun.mjs'

export const D_DIR = path.dirname(fileURLToPath(import.meta.url))
export const DOUBLURES_D = path.join(D_DIR, 'doublures.mjs')
/** Un jeu d'essai du lot D, relu à chaque appel (copie neuve). */
export const jeuD = (nom) => JSON.parse(fs.readFileSync(path.join(D_DIR, nom), 'utf8'))
export const posix = (p) => String(p).split(path.sep).join('/')
export const relR = (p) => posix(path.relative(R, p)) || '.'

// ── L'enfant ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Dans l'enfant : fetch piégé (127.0.0.1 permis : le faux PostgREST ; tout autre hôte refusé et consigné dans `reseau`),
 * crochet de résolution de ../commun.mjs servi avec `doublures` (d/doublures.mjs par défaut) → { D, reseau }.
 */
export async function preparerEnfantD({ racines, doubles, doublures = DOUBLURES_D }) {
  const reseau = []
  const vrai = globalThis.fetch
  globalThis.fetch = async (u, init) => {
    const x = String(u?.url ?? u)
    let h = ''
    try { h = new URL(x).hostname } catch { /* illisible */ }
    if (h === '127.0.0.1' || h === 'localhost') return vrai(u, init)
    reseau.push(x)
    throw new Error(`réseau interdit dans un juge du lot D (hors --reel) : ${x.slice(0, 80)}`)
  }
  const sep = (d) => pathToFileURL(path.resolve(d) + path.sep).href
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racines: racines.map(sep), doublures: pathToFileURL(doublures).href, depot: sep(R), doubles } })
  const D = await import(`${pathToFileURL(doublures).href}?m=juge`)
  return { D, reseau }
}

/** POST JSON vers 127.0.0.1 par node:http (le faux PostgREST) → { status, body }. */
export function posterJson(url, corps) {
  return new Promise((ok, ko) => {
    const u = new URL(url)
    if (u.hostname !== '127.0.0.1') return ko(new Error(`posterJson : ${u.hostname} refusé (127.0.0.1 seulement)`))
    const texte = JSON.stringify(corps ?? {})
    const req = http.request({ agent: false, hostname: '127.0.0.1', port: u.port, path: u.pathname + u.search, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(texte) } }, (res) => {
      let t = ''
      res.setEncoding('utf8')
      res.on('data', (d) => { t += d })
      res.on('end', () => { let body = null; try { body = t ? JSON.parse(t) : null } catch { body = t } ok({ status: res.statusCode, body }) })
    })
    req.on('error', ko)
    req.end(texte)
  })
}

// ── Git de la racine ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Le dépôt git où lire l'historique d'une racine : elle-même si elle porte un .git (maquette), sinon le dépôt du script. */
export const depotDe = (racine) => (fs.existsSync(path.join(racine, '.git')) ? path.resolve(racine) : DEPOT_GIT)
export function gitDans(depot, args, { binaire = false } = {}) {
  const r = spawnSync('git', args, { cwd: depot, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 256 * 1024 * 1024, encoding: binaire ? 'buffer' : 'utf8', windowsHide: true })
  return { code: r.status, stdout: r.stdout ?? (binaire ? Buffer.alloc(0) : ''), stderr: r.stderr ? r.stderr.toString() : '' }
}
export function texteDans(depot, rev, chemin) {
  const r = gitDans(depot, ['show', `${rev}:${chemin}`], { binaire: true })
  return r.code === 0 ? lf(r.stdout.toString('utf8')) : null
}
/**
 * La version « d'avant la fiche » de `chemin` : dans le dépôt de la racine (depotDe), le plus récent commit de HEAD dont le
 * fichier ne porte pas `marqueur`. → { commit, texte, depot } (texte null si le fichier n'existait pas).
 */
export function baseAvantD(racine, chemin, marqueur) {
  const depot = depotDe(racine)
  const tete = gitDans(depot, ['rev-parse', 'HEAD']).stdout.trim()
  const aHead = texteDans(depot, 'HEAD', chemin)
  if (aHead === null || !marqueur.test(aHead)) return { commit: tete, texte: aHead, depot }
  const commits = gitDans(depot, ['log', '--format=%H', 'HEAD', '--', chemin]).stdout.split(/\r?\n/).filter(Boolean)
  for (const c of commits) { const t = texteDans(depot, c, chemin); if (t === null || !marqueur.test(t)) return { commit: c, texte: t, depot } }
  return { commit: commits.at(-1) ? `${commits.at(-1)}^` : tete, texte: null, depot }
}

// ── Lecture de source ────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le source où le CONTENU des commentaires, chaînes, gabarits (hors ${…}) et expressions régulières est remplacé par des
 * espaces (fins de ligne gardées) : même longueur, mêmes positions ; accolades, parenthèses et appels ne s'y lisent plus que
 * dans le code. Même découpe que sansCommentaires de ../commun.mjs.
 */
export function masquer(src) {
  const s = String(src)
  let out = '', i = 0, prec = ''
  const pile = []
  const blanc = (t) => t.replace(/[^\n]/g, ' ')
  const regexPossible = () => prec === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prec) || /\b(?:return|typeof|case|do|else|in|of|void|throw|new|delete|await|yield)$/.test(out.trimEnd())
  while (i < s.length) {
    const c = s[i], d = s[i + 1]
    if (c === '/' && d === '/') { const f = s.indexOf('\n', i); const fin = f < 0 ? s.length : f; out += blanc(s.slice(i, fin)); i = fin; continue }
    if (c === '/' && d === '*') { const f = s.indexOf('*/', i + 2); const fin = f < 0 ? s.length : f + 2; out += blanc(s.slice(i, fin)); i = fin; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1
      out += c + blanc(s.slice(i + 1, Math.min(j, s.length))) + (j < s.length ? s[j] : ''); i = j + 1; prec = c; continue
    }
    if (c === '`' || (c === '}' && pile.length && pile[pile.length - 1] === 0)) {
      if (c === '}') pile.pop()
      let j = i + 1
      out += c
      while (j < s.length && s[j] !== '`' && !(s[j] === '$' && s[j + 1] === '{')) {
        if (s[j] === '\\') { out += blanc(s.slice(j, j + 2)); j += 2 } else { out += s[j] === '\n' ? '\n' : ' '; j++ }
      }
      if (s[j] === '$') { out += '${'; pile.push(0); i = j + 2; prec = '{'; continue }
      out += s[j] ?? ''; i = j + 1; prec = '`'; continue
    }
    if (c === '/' && regexPossible()) {
      let j = i + 1, classe = false
      while (j < s.length && s[j] !== '\n') {
        if (s[j] === '\\') { j += 2; continue }
        if (s[j] === '[') classe = true
        else if (s[j] === ']') classe = false
        else if (s[j] === '/' && !classe) break
        j++
      }
      if (s[j] === '/') { let k = j + 1; while (/[a-z]/i.test(s[k] ?? '')) k++; out += `/${blanc(s.slice(i + 1, j))}/${s.slice(j + 1, k)}`; i = k; prec = '/'; continue }
    }
    if (c === '{' && pile.length) pile[pile.length - 1]++
    if (c === '}' && pile.length) pile[pile.length - 1]--
    out += c
    if (!/\s/.test(c)) prec = c
    i++
  }
  return out
}
/** Les positions de `nom(` (appel ou déclaration) dans le code (ni chaîne, ni commentaire, ni expression régulière). */
export const positionsAppel = (sc, nom) => [...masquer(sc).matchAll(new RegExp(`(?<![\\w$.])${nom}\\s*\\(`, 'g'))].map((m) => m.index)
/** Les blocs `try { … }` ouverts avant `pos` et fermés après : la position est-elle dans un try ? */
export function dansTry(sc, pos) {
  const mk = masquer(sc)
  for (const m of mk.slice(0, pos).matchAll(/\btry\s*\{/g)) {
    const f = apparier(mk, m.index + m[0].length - 1)
    if (f > pos) return true
  }
  return false
}
/** Dans `sc`, la position est-elle couverte par un `.catch(` chaîné à la même instruction ? (promesse.catch) */
export function sousCatchChaine(sc, pos) {
  const fin = sc.indexOf('\n', pos)
  const ligne = sc.slice(pos, fin < 0 ? sc.length : fin)
  return /\)\s*\.catch\s*\(/.test(ligne)
}
/** Le texte du `if (…)` qui englobe `pos` le plus près (ou null) : sa condition et son corps. */
export function conditionsEnglobantes(sc, pos) {
  const out = []
  const mk = masquer(sc)
  for (const m of mk.slice(0, pos).matchAll(/\bif\s*\(/g)) {
    const i = apparier(mk, m.index + m[0].length - 1)
    if (i < 0) continue
    const condition = sc.slice(m.index + m[0].length, i)
    let j = i + 1
    while (/\s/.test(mk[j] ?? '')) j++
    if (mk[j] === '{') { const f = apparier(mk, j); if (j < pos && f > pos) out.push(condition) }
    else { const fin = mk.indexOf('\n', j); if (j <= pos && (fin < 0 || fin > pos)) out.push(condition) }
  }
  return out
}
/** L'indice du caractère qui ferme l'ouvrant `sc[i]` ((, [ ou {), dans le code seulement (source masqué) ; -1 sinon. */
export function apparier(sc, i) {
  const mk = sc.__masque ?? masquer(sc)
  const ouvre = mk[i], ferme = { '(': ')', '[': ']', '{': '}' }[ouvre]
  if (!ferme) return -1
  let n = 0
  for (let j = i; j < mk.length; j++) {
    if (mk[j] === ouvre) n++
    else if (mk[j] === ferme) { n--; if (n === 0) return j }
  }
  return -1
}
/**
 * Le corps d'une fonction nommée, dans un source SANS commentaires, type de retour générique compris (`): Promise<{ a: b }> {`,
 * que corpsDeFonction de ../commun.mjs prend pour le corps). → { debut, fin, corps } (indices des accolades) ou null.
 */
export function corpsFonctionD(sc, nom) {
  const mk = masquer(sc)
  const m = new RegExp(`(?:\\bfunction\\s*\\*?\\s*${nom}\\s*(?:<[^>]*>)?\\s*\\(|\\b(?:const|let|var)\\s+${nom}\\s*(?::[^=]+)?=\\s*(?:async\\s*)?(?:function\\b[^(]*)?\\()`).exec(mk)
  if (!m) return null
  let j = apparier(mk, m.index + m[0].length - 1) + 1
  if (j <= 0) return null
  let angle = 0, attenteType = false
  while (/\s/.test(mk[j] ?? '')) j++
  if (mk[j] === ':') { attenteType = true; j++ }
  for (; j < mk.length; j++) {
    const c = mk[j]
    if (/\s/.test(c)) continue
    if (c === '=' && mk[j + 1] === '>' && angle === 0) { j += 2; while (/\s/.test(mk[j] ?? '')) j++; if (mk[j] !== '{') return { debut: j, fin: j, corps: '' }; break }
    if (c === '<') { angle++; attenteType = true; continue }
    if (c === '>') { angle--; attenteType = false; continue }
    if (c === '{' && angle === 0 && !attenteType) break
    if (c === '{' || c === '(' || c === '[') { j = apparier(mk, j); if (j < 0) return null; attenteType = false; continue }
    if ('|&,:?'.includes(c)) { attenteType = true; continue }
    attenteType = false
  }
  const fin = apparier(mk, j)
  return fin < 0 ? null : { debut: j, fin, corps: sc.slice(j + 1, fin) }
}
export { sansCommentaires }

// ── Dates ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
/** Les écritures acceptées d'un jour civil (heure de Paris) : 14/10/2026, 14 octobre 2026, 1er octobre 2026, 2026-10-14. */
export function ecrituresDate(d) {
  const x = new Date(d)
  const parties = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(x).map((p) => [p.type, p.value]))
  const j = Number(parties.day), m = Number(parties.month), a = parties.year
  const jj = String(j).padStart(2, '0'), mm = String(m).padStart(2, '0')
  return [`${jj}/${mm}/${a}`, `${j}/${m}/${a}`, `${j} ${MOIS[m - 1]} ${a}`, `${jj} ${MOIS[m - 1]} ${a}`, ...(j === 1 ? [`1er ${MOIS[m - 1]} ${a}`] : []), `${a}-${mm}-${jj}`]
}
export const contientDate = (texte, d) => ecrituresDate(d).some((x) => String(texte).toLowerCase().includes(x.toLowerCase()))
/** + n mois calendaires, jour ramené au dernier du mois (29/02 → 28/02). */
export function plusMois(d, n) {
  const x = new Date(d)
  const cible = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + n, 1, x.getUTCHours(), x.getUTCMinutes(), x.getUTCSeconds(), x.getUTCMilliseconds()))
  const dernier = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate()
  cible.setUTCDate(Math.min(x.getUTCDate(), dernier))
  return cible
}

// ── Données personnelles ─────────────────────────────────────────────────────────────────────────────────────────────────
export const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
export const RE_TEL = /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/
export const RE_PROMESSE = /garanti|classement|premi[eè]re page/i

// ── Routes du dépôt ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Une route d'écran ou d'API (« /controle?onglet=sites », « /api/controle/sites/abc ») existe-t-elle sous <racine>/app ? */
export function routeExiste(racine, route) {
  let chemin = String(route ?? '').split('#')[0].split('?')[0]
  if (/^https?:\/\//.test(chemin)) return { ok: false, raison: 'adresse externe' }
  if (!chemin.startsWith('/')) return { ok: false, raison: 'chemin relatif' }
  const segments = chemin.split('/').filter(Boolean)
  const app = path.join(racine, 'app')
  const chercher = (dossier, i) => {
    if (i === segments.length) {
      for (const f of ['page.tsx', 'page.ts', 'page.jsx', 'route.ts', 'route.tsx']) if (fs.existsSync(path.join(dossier, f))) return path.join(dossier, f)
      return null
    }
    let entrees = []
    try { entrees = fs.readdirSync(dossier, { withFileTypes: true }).filter((e) => e.isDirectory()) } catch { return null }
    const exact = entrees.find((e) => e.name === segments[i])
    if (exact) { const r = chercher(path.join(dossier, exact.name), i + 1); if (r) return r }
    for (const e of entrees) {
      if (/^\(.*\)$/.test(e.name)) { const r = chercher(path.join(dossier, e.name), i); if (r) return r }
      if (/^\[\[?\.\.\.[^\]]+\]\]?$/.test(e.name)) return chercher(path.join(dossier, e.name), segments.length)
      if (/^\[[^\].]+\]$/.test(e.name)) { const r = chercher(path.join(dossier, e.name), i + 1); if (r) return r }
    }
    return null
  }
  const f = chercher(app, 0)
  return f ? { ok: true, fichier: relR(f) } : { ok: false, raison: `aucun page.tsx ni route.ts sous app/${segments.join('/')}` }
}

// ── proxy.ts ou middleware.ts ────────────────────────────────────────────────────────────────────────────────────────────
/** Celui des deux qui existe dans la racine ; une copie partielle (sans l'un ni l'autre) se lit dans le dépôt. */
export function lireProxy(racine) {
  for (const n of ['proxy.ts', 'middleware.ts']) { const t = lireOuNull(path.join(racine, n)); if (t !== null) return { nom: n, texte: lf(t), ou: 'racine' } }
  for (const n of ['proxy.ts', 'middleware.ts']) { const t = lireOuNull(path.join(R, n)); if (t !== null) return { nom: n, texte: lf(t), ou: 'dépôt (copie partielle sans proxy.ts ni middleware.ts)' } }
  return null
}

// ── Lecteur ZIP (indépendant de lib/zip.ts) ──────────────────────────────────────────────────────────────────────────────
/**
 * Ouvre une archive : fin du répertoire central, chaque entrée centrale, son en-tête local, ses données décompressées
 * (méthode 8 par zlib.inflateRawSync, 0 stockée), CRC-32 recalculé. → { entrees: [{ nom, octets, crc, crcCalcule, taille,
 * tailleComp, methode }], defauts: [texte] }.
 */
export function lireZip(buf) {
  const b = Buffer.from(buf)
  const defauts = [], entrees = []
  let fin = -1
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) if (b.readUInt32LE(i) === 0x06054b50) { fin = i; break }
  if (fin < 0) return { entrees, defauts: ['fin du répertoire central (0x06054b50) introuvable : ce n’est pas une archive ZIP complète'] }
  const total = b.readUInt16LE(fin + 10), tailleCentral = b.readUInt32LE(fin + 12), debutCentral = b.readUInt32LE(fin + 16)
  if (debutCentral + tailleCentral > fin) defauts.push(`répertoire central hors de l'archive (${debutCentral} + ${tailleCentral} > ${fin})`)
  let p = debutCentral
  const crc = (x) => (typeof zlib.crc32 === 'function' ? zlib.crc32(x) >>> 0 : crc32Js(x))
  for (let k = 0; k < total; k++) {
    if (p + 46 > b.length || b.readUInt32LE(p) !== 0x02014b50) { defauts.push(`entrée centrale ${k + 1} : signature 0x02014b50 absente à l'octet ${p}`); break }
    const drapeaux = b.readUInt16LE(p + 8), methode = b.readUInt16LE(p + 10), crcC = b.readUInt32LE(p + 16)
    const tailleComp = b.readUInt32LE(p + 20), taille = b.readUInt32LE(p + 24)
    const n = b.readUInt16LE(p + 28), e = b.readUInt16LE(p + 30), c = b.readUInt16LE(p + 32), local = b.readUInt32LE(p + 42)
    const nom = b.subarray(p + 46, p + 46 + n).toString(drapeaux & 0x800 ? 'utf8' : 'latin1')
    p += 46 + n + e + c
    const x = { nom, crc: crcC, taille, tailleComp, methode, octets: null, crcCalcule: null }
    entrees.push(x)
    if (local + 30 > b.length || b.readUInt32LE(local) !== 0x04034b50) { defauts.push(`${nom} : en-tête local absent à l'octet ${local}`); continue }
    const nL = b.readUInt16LE(local + 26), eL = b.readUInt16LE(local + 28)
    const nomLocal = b.subarray(local + 30, local + 30 + nL).toString(drapeaux & 0x800 ? 'utf8' : 'latin1')
    if (nomLocal !== nom) defauts.push(`${nom} : nom local « ${nomLocal} » différent du nom central`)
    const debut = local + 30 + nL + eL
    const donnees = b.subarray(debut, debut + tailleComp)
    try {
      x.octets = methode === 8 ? zlib.inflateRawSync(donnees) : methode === 0 ? Buffer.from(donnees) : null
      if (!x.octets) defauts.push(`${nom} : méthode ${methode} non prise en charge`)
    } catch (err) { defauts.push(`${nom} : décompression impossible (${premiereLigne(err)})`); continue }
    if (x.octets) {
      x.crcCalcule = crc(x.octets)
      if (x.crcCalcule !== crcC) defauts.push(`${nom} : CRC ${crcC.toString(16)} écrit, ${x.crcCalcule.toString(16)} calculé`)
      if (x.octets.length !== taille) defauts.push(`${nom} : ${x.octets.length} octets décompressés, ${taille} annoncés`)
      if (!(drapeaux & 0x8) && b.readUInt32LE(local + 14) !== crcC) defauts.push(`${nom} : CRC local différent du CRC central`)
    }
  }
  return { entrees, defauts }
}
function crc32Js(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1 }
  return (c ^ 0xffffffff) >>> 0
}
/** Lit un ReadableStream (ou Response, Blob, Buffer) jusqu'au bout, avec un délai. */
export async function lireFlux(x, delaiMs = 20_000) {
  const lire = async () => {
    if (x == null) throw new Error('flux absent')
    if (Buffer.isBuffer(x) || x instanceof Uint8Array) return Buffer.from(x)
    if (typeof x.arrayBuffer === 'function') return Buffer.from(await x.arrayBuffer())
    if (typeof x.getReader === 'function') {
      const r = x.getReader(), morceaux = []
      for (;;) { const { done, value } = await r.read(); if (done) break; morceaux.push(Buffer.from(value)) }
      return Buffer.concat(morceaux)
    }
    throw new Error(`flux illisible (${typeof x})`)
  }
  let t
  const delai = new Promise((_, ko) => { t = setTimeout(() => ko(new Error(`flux non terminé après ${delaiMs / 1000} s (terminer() jamais appelé ?)`)), delaiMs) })
  try { return await Promise.race([lire(), delai]) } finally { clearTimeout(t) }
}

export { court, premiereLigne }
