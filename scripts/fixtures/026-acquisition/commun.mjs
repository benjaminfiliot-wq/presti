// scripts/fixtures/026-acquisition/commun.mjs — le socle des juges du domaine acquisition (fiche 026-016), écrit par
// Claude Code.
//
// Ce module ne juge rien seul. Il donne aux juges du lot 1 (recenseur-qa, faits-qa), à la preuve du domaine
// (juges-026-acquisition-preuve) et aux lots suivants les mêmes outils. Les fiches d'exécutant ne le modifient jamais
// (scripts/fixtures/** est dans leur `interdit`).
//
//   Options communes du domaine (026-016, point 3) : --racine=<dossier> (défaut : la racine du dépôt ; le juge importe
//   <racine>/lib/agents/acquisition/<module>.ts par URL de fichier et lit les sources sous <racine>), --auto-controle (les
//   jeux d'essai se lisent, le magasin factice applique ses règles sur son propre scénario, chaque échantillon fautif est
//   repéré par les contrôles du juge), une ligne par critère « ✅ ID … » ou « ❌ ID … », code 0 seulement si tout est vert,
//   code 2 si l'appel est invalide. Un module absent fait échouer le premier critère avec son identifiant, jamais un
//   plantage sans identifiant. Écriture seulement sous .orchestre/travail/<juge>/ ; rien ne lit .env.local ni
//   presti-secrets ; aucun appel réseau (le piège de `piegerReseau` le prouve dans le processus même du juge).
//
// Index : A, R, TRAVAIL, LOADER, REFERENCE · court, premiereLigne, sous, exigerSousTravail, lireJson, lireOuNull, sha256,
//   shaBlob · lancer, git · lireOptions, creerSortie · sansCommentaires, importsDe, importsNommes, exportsNommes,
//   corpsDeFonction · normaliser, sansAccents, contient · jourParis, luhn, RE_EMAIL · importerDepuis, importerContrat,
//   typecheck · piegerReseau, capturerConsole · lsTree, extraireTar, verifierArbre, extraireReference.
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import dns from 'node:dns'
import crypto from 'node:crypto'
import { syncBuiltinESMExports } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ── Chemins ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const A = path.dirname(fileURLToPath(import.meta.url))
export const R = path.resolve(A, '..', '..', '..')
export const TRAVAIL = path.join(R, '.orchestre', 'travail')
export const LOADER = path.join(R, 'scripts', 'ts-loader.mjs')
/** Le commit de référence du domaine (HEAD au lancement de 026-016), lu dans reference.txt. */
export const REFERENCE = fs.readFileSync(path.join(A, 'reference.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim()).find((l) => /^[0-9a-f]{40}$/.test(l)) ?? null

// ── Petits outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const court = (t, n = 160) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
export const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
export function sous(parent, enfant) {
  const rel = path.relative(path.resolve(parent), path.resolve(enfant))
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}
export function exigerSousTravail(p) {
  if (!sous(TRAVAIL, p)) throw new Error(`${p} n'est pas sous ${TRAVAIL} : refusé (les juges n'écrivent que dans .orchestre/travail/)`)
  return path.resolve(p)
}
export const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
export const lireOuNull = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
export const shaBlob = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
/** Copie profonde d'une valeur JSON. */
export const cloner = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)))

// ── Processus ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Lance une commande sans shell. → { code, signal, stdout, stderr, sortie, erreur, duree } */
export function lancer(commande, args = [], { cwd = R, timeout = 300_000, env } = {}) {
  const t0 = Date.now()
  const r = spawnSync(commande, args, { cwd, timeout, env: env ?? process.env, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  const stdout = r.stdout || '', stderr = r.stderr || ''
  return { code: r.status, signal: r.signal, stdout, stderr, sortie: `${stdout}${stderr}`, erreur: r.error ? premiereLigne(r.error) : null, duree: (Date.now() - t0) / 1000 }
}
/** Git en lecture seule (GIT_OPTIONAL_LOCKS=0 : aucune écriture opportuniste de l'index). */
export function git(args, { cwd = R, binaire = false } = {}) {
  const r = spawnSync('git', args, { cwd, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 1024 * 1024 * 1024, encoding: binaire ? 'buffer' : 'utf8', windowsHide: true })
  return { code: r.status, stdout: r.stdout ?? (binaire ? Buffer.alloc(0) : ''), stderr: r.stderr ? r.stderr.toString() : '', erreur: r.error ? premiereLigne(r.error) : null }
}

// ── Options et sortie ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** → { valeurs, drapeaux, positionnels, inconnues, racine, autoControle } */
export function lireOptions(argv, { connues = [], drapeauxConnus = [] } = {}) {
  const valeurs = {}, drapeaux = new Set(), positionnels = [], inconnues = []
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) { positionnels.push(a); continue }
    if (m[2] === undefined) drapeaux.add(m[1]); else valeurs[m[1]] = m[2]
    const connu = m[2] === undefined ? [...drapeauxConnus, 'auto-controle'].includes(m[1]) : [...connues, 'racine'].includes(m[1])
    if (!connu) inconnues.push(a)
  }
  const racine = valeurs.racine ? path.resolve(R, valeurs.racine) : R
  return { valeurs, drapeaux, positionnels, inconnues, racine, autoControle: drapeaux.has('auto-controle') }
}

/**
 * La sortie d'un juge : une ligne d'en-tête, une ligne par critère (« ✅ ID détail » ou « ❌ ID détail »), puis
 * « <nom> : PASS » ou « <nom> : FAIL — ids ». `ids` : les critères déclarés, tous obligatoires ; un critère jamais évalué
 * est un échec.
 */
export function creerSortie(nom, ids, entete) {
  const res = new Map()
  console.log(entete)
  const ligne = (t) => String(t ?? '').replace(/\s*\r?\n\s*/g, ' · ').trim()
  const noter = (id, ok, detail) => {
    if (!ids.includes(id)) ids.push(id)
    if (res.has(id)) { const r = res.get(id); if (!ok) { r.ok = false; r.detail = ligne(detail) || 'en échec' }; console.log(`${ok ? '✅' : '❌'} ${id} ${ligne(detail)} (complément)`); return }
    res.set(id, { ok, detail: ligne(detail) })
    console.log(`${ok ? '✅' : '❌'} ${id} ${ligne(detail) || (ok ? 'conforme' : 'en échec')}`)
  }
  const s = {
    passe: (id, detail) => noter(id, true, detail),
    echoue: (id, detail) => noter(id, false, detail),
    juger: (id, echecs, detailOk) => (echecs.length ? noter(id, false, echecs.slice(0, 6).join(' ; ') + (echecs.length > 6 ? ` ; … (${echecs.length} défauts)` : '')) : noter(id, true, detailOk)),
    nonJuges(liste, raison) { for (const id of liste) if (!res.has(id)) noter(id, false, `non jugé : ${raison}`) },
    enEchec: (id) => res.has(id) && !res.get(id).ok,
    finir() {
      for (const id of ids) if (!res.has(id)) noter(id, false, 'non évalué')
      const rouges = ids.filter((id) => !res.get(id).ok)
      // 001 relit UNE ligne machine par critère réellement rouge, jamais un simple complément ni une citation.
      for (const id of rouges) console.log(`FAIL ${id} — ${res.get(id).detail || 'en échec'}`)
      console.log(rouges.length ? `${nom} : FAIL — ${rouges.join(', ')}` : `${nom} : PASS`)
      return rouges.length ? 1 : 0
    },
  }
  return s
}

// ── Lecture de source ─────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le source sans ses commentaires (// et /* *\/), chaînes, gabarits (avec ${…} imbriqués) et expressions régulières
 * respectés ; les fins de ligne sont gardées. (Repris de scripts/fixtures/026-pilotage/a/commun.mjs, 026-012.)
 */
export function sansCommentaires(src) {
  const s = String(src)
  let out = '', i = 0
  const pile = []
  let prec = ''
  const regexPossible = () => prec === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prec) || /\b(?:return|typeof|case|do|else|in|of|void|throw|new|delete|await|yield)$/.test(out.trimEnd())
  while (i < s.length) {
    const c = s[i], d = s[i + 1]
    if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const f = s.indexOf('*/', i + 2); const fin = f < 0 ? s.length : f + 2; out += s.slice(i, fin).replace(/[^\n]/g, ''); i = fin; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1
      out += s.slice(i, j + 1); i = j + 1; prec = c; continue
    }
    if (c === '`' || (c === '}' && pile.length && pile[pile.length - 1] === 0)) {
      if (c === '}') pile.pop()
      let j = i + 1
      out += c
      while (j < s.length && s[j] !== '`' && !(s[j] === '$' && s[j + 1] === '{')) { out += s[j]; if (s[j] === '\\') { out += s[j + 1] ?? ''; j += 2 } else j++ }
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
      if (s[j] === '/') { j++; while (/[a-z]/i.test(s[j] ?? '')) j++; out += s.slice(i, j); i = j; prec = '/'; continue }
    }
    if (c === '{' && pile.length) pile[pile.length - 1]++
    if (c === '}' && pile.length) pile[pile.length - 1]--
    out += c
    if (!/\s/.test(c)) prec = c
    i++
  }
  return out
}
/** Les imports d'un source (commentaires ôtés). → [{ spec, type, genre, liste }] ; spec null pour un import non littéral. */
export function importsDe(src) {
  const s = sansCommentaires(src)
  const out = []
  for (const m of s.matchAll(/(?:^|[;\n}])\s*import\s+(type\s+)?([\w$*{}\s,]*?)\s*from\s*(['"])([^'"]+)\3/g)) out.push({ spec: m[4], type: !!m[1], genre: 'import', liste: m[2] })
  for (const m of s.matchAll(/(?:^|[;\n}])\s*import\s*(['"])([^'"]+)\1/g)) out.push({ spec: m[2], type: false, genre: 'effet', liste: '' })
  for (const m of s.matchAll(/(?:^|[;\n}])\s*export\s+(type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*(['"])([^'"]+)\2/g)) out.push({ spec: m[3], type: !!m[1], genre: 'export', liste: '*' })
  for (const m of s.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)) {
    const lit = /^(['"`])([^'"`$]+)\1$/.exec(m[1].trim())
    out.push({ spec: lit ? lit[2] : null, type: false, genre: 'dynamique', liste: '*' })
  }
  for (const m of s.matchAll(/\brequire\s*\(\s*([^)]*)\)/g)) {
    const lit = /^(['"`])([^'"`$]+)\1$/.exec(m[1].trim())
    out.push({ spec: lit ? lit[2] : null, type: false, genre: 'require', liste: '*' })
  }
  return out
}
/**
 * Les noms importés d'un module donné (spécificateurs qui finissent par `fin`, ex. '/lecteurSite' ou 'lecteurSite').
 * → { noms: Set, espace: boolean } ; `espace` vrai pour un `import * as`, un import dynamique, un require ou un re-export.
 */
export function importsNommes(src, fin) {
  const noms = new Set()
  let espace = false
  for (const i of importsDe(src)) {
    if (!i.spec || !(i.spec === fin || i.spec.endsWith(`/${fin}`) || i.spec.endsWith(`/${fin}.ts`))) continue
    if (i.genre !== 'import' || /\*/.test(i.liste)) { espace = true; continue }
    const m = /\{([^}]*)\}/.exec(i.liste)
    if (m) for (const p of m[1].split(',')) { const x = p.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim(); if (x) noms.add(x) }
  }
  return { noms, espace }
}
/** Les noms exportés d'un source (déclarations, listes `export { a, b as c }`). */
export function exportsNommes(src) {
  const s = sansCommentaires(src)
  const noms = new Set()
  for (const m of s.matchAll(/\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([\w$]+)/g)) noms.add(m[1])
  for (const m of s.matchAll(/\bexport\s*\{([^}]*)\}/g)) for (const p of m[1].split(',')) { const x = p.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '').trim(); if (x) noms.add(x) }
  if (/\bexport\s+default\b/.test(s)) noms.add('default')
  return [...noms]
}
/**
 * Les intervalles [début, fin[ du corps d'une fonction nommée dans un source sans commentaires : `function nom(`,
 * `const nom = (…) =>`, `const nom = async function`, `nom(…) {` (méthode). Le corps va de la déclaration à l'accolade
 * fermante qui équilibre la première accolade ouvrante (chaînes et gabarits comptés grossièrement : suffisant pour un
 * contrôle de lecture ; le juge le dit s'il ne trouve pas la fonction).
 */
export function corpsDeFonction(sourceNu, nom) {
  const s = sourceNu
  const re = new RegExp(`(?:\\bfunction\\s*\\*?\\s*${nom}\\s*\\(|\\b(?:const|let|var)\\s+${nom}\\s*(?::[^=]+)?=|(?:^|[\\s,{])${nom}\\s*\\([^)]*\\)\\s*(?::[^{]+)?\\{)`, 'g')
  const out = []
  for (const m of s.matchAll(re)) {
    const debut = m.index
    let i = s.indexOf('{', debut)
    // `const nom = (…) => expr` sans accolade : jusqu'à la fin de l'instruction
    const fleche = s.slice(debut, i < 0 ? s.length : i)
    if (i < 0 || (/=>\s*[^\s{]/.test(fleche))) { const f = s.indexOf('\n', debut); out.push([debut, f < 0 ? s.length : f]); continue }
    let prof = 0, j = i
    for (; j < s.length; j++) {
      const c = s[j]
      if (c === '"' || c === "'" || c === '`') { const q = c; j++; while (j < s.length && s[j] !== q) { if (s[j] === '\\') j++; j++ } continue }
      if (c === '{') prof++
      else if (c === '}') { prof--; if (prof === 0) break }
    }
    out.push([debut, j + 1])
  }
  return out
}

// ── Texte ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const sansAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
/** Normalisation du juge : NFKC, apostrophes et guillemets droits, trait d'union conditionnel retiré, espaces fusionnés. */
export function normaliser(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(/[‘’‚‛′ʼ]/g, "'")
    .replace(/[“”„‟«»″]/g, '"')
    .replace(/­/g, '')
    .replace(/[\s  ]+/g, ' ')
    .trim()
}
/** Vrai si `aiguille` (≥ 3 signes) se trouve dans `botte`, sans casse ni accents. */
export const contient = (botte, aiguille) => {
  const a = sansAccents(normaliser(aiguille)).toLowerCase()
  return a.length >= 3 && sansAccents(normaliser(botte)).toLowerCase().includes(a)
}
const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', icirc: 'î', copy: '©', shy: '­', ndash: '–', mdash: '—', hellip: '…', euro: '€' }
/** Décode les entités HTML nommées courantes et numériques. */
export const decoderEntites = (s) => String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m }
  return ENTITES[e.toLowerCase()] ?? m
})
/**
 * Le texte visible d'une page, calculé par le JUGE (indépendant de tout module jugé) : sans commentaires, script, style,
 * noscript, template ; balises ôtées ; entités décodées ; normalisé. Le <title> en fait partie.
 */
export function texteVisibleJuge(html) {
  const s = String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return normaliser(decoderEntites(s))
}
/** Retire d'une chaîne les URL de réseaux (Instagram, Facebook) : les seules où un « @ » peut être toléré. */
export const sansUrlsReseaux = (s) => String(s ?? '').replace(/(?:https?:\/\/)?(?:[\w-]+\.)*(?:instagram|facebook)\.com\/[^\s"'<>\\]*/gi, '')
/** Le code d'un refus : { refus: 'x' } → 'x' ; une chaîne seule → elle ; sinon null (ce n'est pas un refus). */
export const refusDe = (x) => (x && typeof x === 'object' && typeof x.refus === 'string' ? x.refus : typeof x === 'string' ? x : null)
/** Toutes les clés d'un objet, en profondeur. */
export function clesProfondes(o, vus = new Set()) {
  const out = []
  if (o && typeof o === 'object' && !vus.has(o)) { vus.add(o); for (const [k, v] of Object.entries(o)) { if (!Array.isArray(o)) out.push(k); out.push(...clesProfondes(v, vus)) } }
  return out
}
const FMT_JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
/** Le jour civil à Paris, « AAAA-MM-JJ ». */
export const jourParis = (d) => FMT_JOUR_PARIS.format(new Date(d))
/** Clé de Luhn d'un SIREN (9 chiffres) ou d'un SIRET (14), comme sirenValide de lib/facturation.ts. */
export function luhn(v) {
  const n = String(v ?? '').replace(/\s/g, '')
  if (!/^\d{9}$/.test(n) && !/^\d{14}$/.test(n)) return false
  if (n.startsWith('356000000')) return true
  let somme = 0
  for (let i = 0; i < n.length; i++) { let c = Number(n[n.length - 1 - i]); if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9 } somme += c }
  return somme % 10 === 0
}
export const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g

// ── Modules jugés ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Importe <racine>/<rel> par URL de fichier (ts-loader chargé, ou les types effacés de Node 24 pour un module sans alias). */
export async function importerDepuis(racine, rel) {
  return import(pathToFileURL(path.join(racine, rel)).href)
}
/** Le contrat du DÉPÔT du juge (jamais celui de --racine : le contrat n'est pas jugé ici, il est la règle). */
export async function importerContrat() {
  return import(pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href)
}
/**
 * `npm run typecheck` (tsc --noEmit) sur <racine>, sans shell ; fichier incrémental sous .orchestre/travail/<juge>/.
 * → { ok, detail }
 */
export function typecheck(racine, juge) {
  const pkg = lireOuNull(path.join(racine, 'package.json'))
  let script = null
  try { script = JSON.parse(pkg).scripts?.typecheck ?? null } catch { /* illisible */ }
  if (!script || !/^tsc\b/.test(script)) return { ok: false, detail: `script typecheck absent ou inattendu dans ${path.join(racine, 'package.json')} (« ${script} »)` }
  const tsc = [path.join(racine, 'node_modules', 'typescript', 'bin', 'tsc'), path.join(R, 'node_modules', 'typescript', 'bin', 'tsc')].find((f) => fs.existsSync(f))
  if (!tsc) return { ok: false, detail: 'typescript introuvable dans node_modules' }
  const cle = sha256(path.resolve(racine).toLowerCase()).slice(0, 12)
  const info = exigerSousTravail(path.join(TRAVAIL, juge, 'tsbuildinfo', `${cle}.tsbuildinfo`))
  fs.mkdirSync(path.dirname(info), { recursive: true })
  const args = [tsc, ...script.replace(/^tsc\s*/, '').split(/\s+/).filter(Boolean), '--pretty', 'false', '--tsBuildInfoFile', info]
  const r = lancer(process.execPath, args, { cwd: racine, timeout: 15 * 60_000 })
  const erreurs = r.stdout.split(/\r?\n/).filter((l) => /error TS\d+/.test(l))
  if (r.code === 0) return { ok: true, detail: `tsc --noEmit vert en ${r.duree.toFixed(0)} s` }
  return { ok: false, detail: `tsc --noEmit en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} : ${erreurs.length} erreur(s) — ${court(erreurs.slice(0, 3).join(' | ') || r.sortie, 400)}` }
}

// ── Pièges ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le piège réseau du processus du juge : fetch, http(s).request/get et net.Socket#connect vers un autre hôte que
 * 127.0.0.1 sont refusés et consignés. Un module jugé qui contournerait le récupérateur injecté échoue ici au lieu de
 * sortir sur Internet. → { tentatives: string[], retirer() }
 */
export function piegerReseau() {
  const tentatives = []
  const local = (h) => { const x = String(h ?? '').replace(/^\[|\]$/g, '').toLowerCase(); return x === '127.0.0.1' || x === 'localhost' || x === '::1' }
  const origFetch = globalThis.fetch
  const origConnect = net.Socket.prototype.connect
  const origDns = { lookup: dns.lookup, resolve: dns.resolve, resolve4: dns.resolve4, resolve6: dns.resolve6, resolveMx: dns.resolveMx }
  const origDnsP = { lookup: dns.promises.lookup, resolve: dns.promises.resolve, resolve4: dns.promises.resolve4, resolve6: dns.promises.resolve6, resolveMx: dns.promises.resolveMx }
  globalThis.fetch = async (entree) => {
    let hote = '?'
    try { hote = new URL(typeof entree === 'string' || entree instanceof URL ? String(entree) : entree.url).hostname } catch { /* illisible */ }
    tentatives.push(`fetch ${court(String(entree?.url ?? entree), 120)}`)
    if (!local(hote)) throw new Error(`réseau interdit dans un juge (piège) : ${hote}`)
    return origFetch(entree)
  }
  net.Socket.prototype.connect = function (...args) {
    const a = Array.isArray(args[0]) ? args[0][0] : args[0]
    let hote = null
    if (a && typeof a === 'object') { if (a.path) return origConnect.apply(this, args); hote = a.host ?? 'localhost' } else if (typeof a === 'number' || /^\d+$/.test(String(a))) hote = typeof args[1] === 'string' ? args[1] : 'localhost'
    if (hote !== null && !local(hote)) {
      tentatives.push(`connect ${hote}`)
      const e = new Error(`réseau interdit dans un juge (piège) : ${hote}`)
      process.nextTick(() => this.destroy(e))
      return this
    }
    return origConnect.apply(this, args)
  }
  // La résolution DNS est un accès au réseau : refusée aussi (rappel ou promesse), et consignée.
  const refusDns = (nom) => (hote, ...reste) => {
    tentatives.push(`dns.${nom} ${hote}`)
    const e = Object.assign(new Error(`DNS interdit dans un juge (piège) : ${hote}`), { code: 'ENOTFOUND' })
    const rappel = reste.find((x) => typeof x === 'function')
    if (rappel) { process.nextTick(() => rappel(e)); return undefined }
    return Promise.reject(e)
  }
  for (const n of Object.keys(origDns)) dns[n] = refusDns(n)
  for (const n of Object.keys(origDnsP)) dns.promises[n] = refusDns(n)
  syncBuiltinESMExports()
  return {
    tentatives,
    retirer() {
      globalThis.fetch = origFetch
      net.Socket.prototype.connect = origConnect
      Object.assign(dns, origDns); Object.assign(dns.promises, origDnsP)
      syncBuiltinESMExports()
    },
  }
}
/** Capture console.log/info/warn/error/debug pendant `f`, sans rien afficher. → { valeur, texte } */
export async function capturerConsole(f) {
  const noms = ['log', 'info', 'warn', 'error', 'debug']
  const orig = Object.fromEntries(noms.map((n) => [n, console[n]]))
  const morceaux = []
  for (const n of noms) console[n] = (...a) => { morceaux.push(a.map((x) => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x) } catch { return String(x) } })())).join(' ')) }
  try { const valeur = await f(); return { valeur, texte: morceaux.join('\n') } } catch (e) { morceaux.push(String(e?.stack ?? e)); return { valeur: undefined, erreur: e, texte: morceaux.join('\n') } } finally { for (const n of noms) console[n] = orig[n] }
}

// ── L'arbre de référence (git archive <sha>) ─────────────────────────────────────────────────────────────────────────────
// Lecteur tar repris de scripts/fixtures/026-pilotage/a/commun.mjs (026-012) : rien n'est écrit dans .git, aucun tar du
// système, pas de conversion de fins de ligne.
export function lsTree(rev) {
  const r = git(['ls-tree', '-r', '-l', '-z', rev], { binaire: true })
  if (r.code !== 0) throw new Error(`git ls-tree ${rev} : ${court(r.stderr)}`)
  const m = new Map()
  for (const e of r.stdout.toString('utf8').split('\0')) {
    if (!e) continue
    const tab = e.indexOf('\t')
    const [mode, type, sha, t] = e.slice(0, tab).split(/\s+/)
    if (type === 'blob') m.set(e.slice(tab + 1), { sha, taille: Number(t), mode })
    else if (type !== 'commit') throw new Error(`ls-tree : entrée ${type} non prise en charge (${e.slice(tab + 1)})`)
  }
  return m
}
export function listerFichiers(dossier) {
  const out = new Set()
  const rec = (rel) => {
    for (const e of fs.readdirSync(path.join(dossier, rel), { withFileTypes: true })) {
      const r2 = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) rec(r2); else out.add(r2)
    }
  }
  if (fs.existsSync(dossier)) rec('')
  return out
}
function lirePax(buf) {
  const out = {}
  let i = 0
  while (i < buf.length) {
    const esp = buf.indexOf(0x20, i)
    if (esp < 0) break
    const long = parseInt(buf.subarray(i, esp).toString('ascii'), 10)
    if (!(long > 0)) break
    const enr = buf.subarray(esp + 1, i + long - 1)
    const eg = enr.indexOf(0x3d)
    if (eg > 0) out[enr.subarray(0, eg).toString('utf8')] = enr.subarray(eg + 1).toString('utf8')
    i += long
  }
  return out
}
export function extraireTar(fichierTar, dest) {
  const fd = fs.openSync(fichierTar, 'r')
  const total = fs.fstatSync(fd).size
  const tete = Buffer.alloc(512)
  const champ = (b, debut, long) => { const s = b.subarray(debut, debut + long); const z = s.indexOf(0); return (z < 0 ? s : s.subarray(0, z)).toString('utf8') }
  const octal = (b, debut, long) => { const t = champ(b, debut, long).trim(); return t ? parseInt(t, 8) : 0 }
  let pos = 0, cheminPax = null, commit = null, fichiers = 0, octets = 0
  const lire = (debut, n) => { const b = Buffer.alloc(n); let lu = 0; while (lu < n) { const k = fs.readSync(fd, b, lu, n - lu, debut + lu); if (!k) throw new Error('archive tronquée'); lu += k } return b }
  try {
    for (;;) {
      if (pos + 512 > total) throw new Error('archive tronquée (pas de bloc de fin)')
      fs.readSync(fd, tete, 0, 512, pos)
      if (tete.every((x) => x === 0)) break
      let somme = 0
      for (let i = 0; i < 512; i++) somme += i >= 148 && i < 156 ? 32 : tete[i]
      if (somme !== octal(tete, 148, 8)) throw new Error(`en-tête tar corrompu à l'octet ${pos}`)
      const type = String.fromCharCode(tete[156] || 0x30)
      const long = octal(tete, 124, 12)
      const nom = champ(tete, 0, 100), prefixe = champ(tete, 345, 155)
      const contenu = long ? lire(pos + 512, long) : Buffer.alloc(0)
      pos += 512 + Math.ceil(long / 512) * 512
      if (type === 'g') { const p = lirePax(contenu); if (p.comment) commit = p.comment.trim(); continue }
      if (type === 'x') { cheminPax = lirePax(contenu).path ?? null; continue }
      const rel = cheminPax ?? (prefixe ? `${prefixe}/${nom}` : nom)
      cheminPax = null
      const cible = path.resolve(dest, rel)
      if (!sous(dest, cible)) throw new Error(`entrée hors de la destination : ${rel}`)
      if (type === '5') { fs.mkdirSync(cible, { recursive: true }); continue }
      if (type !== '0') throw new Error(`entrée tar de type « ${type} » non prise en charge : ${rel}`)
      fs.mkdirSync(path.dirname(cible), { recursive: true })
      fs.writeFileSync(cible, contenu)
      fichiers++; octets += long
    }
  } finally { fs.closeSync(fd) }
  return { commit, fichiers, octets }
}
/** Mêmes fichiers que le commit, même blob chacun. */
export function verifierArbre(dossier, commit) {
  const arbre = lsTree(commit)
  const disque = listerFichiers(dossier)
  const manquants = [...arbre.keys()].filter((k) => !disque.has(k))
  const intrus = [...disque].filter((k) => !arbre.has(k))
  let octets = 0
  const differents = []
  for (const [k, v] of arbre) {
    if (!disque.has(k)) continue
    const b = fs.readFileSync(path.join(dossier, k))
    octets += b.length
    if (shaBlob(b) !== v.sha) differents.push(k)
  }
  return { ok: !manquants.length && !intrus.length && !differents.length && arbre.size > 0, fichiers: arbre.size, octets, manquants, intrus, differents }
}
/**
 * Extrait <sha> dans `dest` (sous .orchestre/travail/) et écrit la marque <dest>.json ; réutilise l'arbre s'il porte la même
 * marque et reste identique blob pour blob. → { dest, commit, fichiers, octets, reutilise }
 */
export function extraireReference(sha, dest) {
  exigerSousTravail(dest)
  const r0 = git(['rev-parse', '--verify', `${sha}^{commit}`])
  if (r0.code !== 0) throw new Error(`référence ${sha} introuvable dans le dépôt : ${court(r0.stderr)}`)
  const commit = r0.stdout.trim()
  const marque = `${dest}.json`
  const deja = (() => { try { return JSON.parse(fs.readFileSync(marque, 'utf8')).commit } catch { return null } })()
  if (deja === commit && fs.existsSync(dest)) {
    const v = verifierArbre(dest, commit)
    if (v.ok) return { dest, commit, fichiers: v.fichiers, octets: v.octets, reutilise: true }
  }
  const partiel = `${dest}.partiel`, tar = `${dest}.tar`
  fs.rmSync(partiel, { recursive: true, force: true }); fs.rmSync(tar, { force: true })
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  try {
    const g = git(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', `--output=${tar.split(path.sep).join('/')}`, commit])
    if (g.code !== 0 || !fs.existsSync(tar)) throw new Error(`git archive ${commit.slice(0, 7)} en échec : ${court(g.stderr || g.erreur)}`)
    const x = extraireTar(tar, partiel)
    if (x.commit && x.commit !== commit) throw new Error(`l'archive porte le commit ${x.commit}, ${commit} attendu`)
    const v = verifierArbre(partiel, commit)
    if (!v.ok) throw new Error(`arbre extrait différent de ${commit.slice(0, 7)} : ${v.manquants.length} manquant(s), ${v.intrus.length} en trop, ${v.differents.length} différent(s)`)
    fs.rmSync(dest, { recursive: true, force: true })
    fs.rmSync(marque, { force: true })
    for (let essai = 0; ; essai++) {
      try { fs.renameSync(partiel, dest); break } catch (e) { if (essai >= 4) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500) }
    }
    fs.writeFileSync(marque, `${JSON.stringify({ commit, fichiers: v.fichiers, octets: v.octets, extrait_le: new Date().toISOString(), par: 'scripts/fixtures/026-acquisition/commun.mjs extraireReference' }, null, 1)}\n`)
    return { dest, commit, fichiers: v.fichiers, octets: v.octets, reutilise: false }
  } finally {
    fs.rmSync(tar, { force: true })
    fs.rmSync(partiel, { recursive: true, force: true })
  }
}
