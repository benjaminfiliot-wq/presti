// scripts/fixtures/026-pilotage/a/commun.mjs — le socle des juges du domaine Pilotage (fiche 026-012), écrit par Claude Code.
//
// Ce module ne juge rien seul. Il donne aux juges du lot a (pilotage-logique-qa, pilotage-push-qa) et à la preuve générique
// (juges-026-pilotage-preuve) les mêmes outils ; les lots b, c et s peuvent l'importer, jamais le modifier (026-066, 026-067,
// 026-104 l'ont dans `interdit`).
//
//   Options communes du domaine (026-012, point 1) : --racine=<dossier> (défaut : la racine du dépôt ; le juge importe
//   <racine>/lib/pilotage/<module>.ts par URL de fichier et lit les sources sous <racine>), --temoin (seulement les critères
//   de non-régression et l'auto-contrôle des jeux d'essai), une ligne par critère « ✅ ID … » ou « ❌ ID … », code 0 seulement
//   si tout est vert, code 2 si l'appel est invalide ou si un préalable humain manque. Un critère jamais évalué est un échec.
//   Écriture seulement sous .orchestre/travail/<juge>/ ; aucun de ces outils ne lit .env.local ni presti-secrets.
//
// Index : A, R, TRAVAIL, LOADER · court, premiereLigne, sous, exigerSousTravail, dossierTravail, lireJson, jeu, sha256,
//   shaBlob · lancer, lancerAsync, git · lireOptions, creerSortie · sansCommentaires, importsDe, exportsNommes · gelerProfond,
//   valeursInterdites, clesProfondes · jourParis, RE_EMAIL, RE_UUID · importerDepuis, typecheck · lsTree, listerFichiers,
//   extraireTar, verifierArbre, extraireReference · instantaneDossier.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ── Chemins ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const A = path.dirname(fileURLToPath(import.meta.url))
export const R = path.resolve(A, '..', '..', '..', '..')
export const TRAVAIL = path.join(R, '.orchestre', 'travail')
export const LOADER = path.join(R, 'scripts', 'ts-loader.mjs')

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
/** .orchestre/travail/<parties…>, vidé puis recréé. */
export function dossierTravail(...parties) {
  const d = exigerSousTravail(path.join(TRAVAIL, ...parties))
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(d, { recursive: true })
  return d
}
export const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
/** Un jeu d'essai du lot a, relu à chaque appel (copie neuve : les juges le gèlent). */
export const jeu = (nom) => lireJson(path.join(A, nom))
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
export const shaBlob = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
export const lireOuNull = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }

// ── Processus ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Lance une commande sans shell. → { code, signal, stdout, stderr, sortie, erreur, duree } */
export function lancer(commande, args = [], { cwd = R, timeout = 300_000, env, entree } = {}) {
  const t0 = Date.now()
  const r = spawnSync(commande, args, { cwd, timeout, env: env ?? process.env, input: entree, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  const stdout = r.stdout || '', stderr = r.stderr || ''
  return { code: r.status, signal: r.signal, stdout, stderr, sortie: `${stdout}${stderr}`, erreur: r.error ? premiereLigne(r.error) : null, duree: (Date.now() - t0) / 1000 }
}
/** Même chose sans bloquer la boucle d'événements (un faux serveur du même processus doit pouvoir répondre). */
export function lancerAsync(commande, args = [], { cwd = R, timeout = 300_000, env } = {}) {
  return new Promise((resoudre) => {
    const t0 = Date.now()
    let stdout = '', stderr = '', fini = false, expire = false
    const e = spawn(commande, args, { cwd, env: env ?? process.env, windowsHide: true })
    e.stdout.setEncoding('utf8'); e.stderr.setEncoding('utf8')
    e.stdout.on('data', (d) => { stdout += d })
    e.stderr.on('data', (d) => { stderr += d })
    const minuterie = setTimeout(() => { expire = true; try { e.kill('SIGKILL') } catch { /* mort */ } }, timeout)
    const finir = (code, signal, erreur = null) => { if (fini) return; fini = true; clearTimeout(minuterie); resoudre({ code: expire ? null : code, signal, stdout, stderr, sortie: `${stdout}${stderr}`, erreur: expire ? `délai de ${timeout / 1000} s dépassé` : erreur, duree: (Date.now() - t0) / 1000 }) }
    e.on('close', (code, signal) => finir(code, signal))
    e.on('error', (err) => finir(null, null, premiereLigne(err)))
  })
}
/** Git en lecture seule (GIT_OPTIONAL_LOCKS=0 : aucune écriture opportuniste de l'index). */
export function git(args, { cwd = R, binaire = false } = {}) {
  const r = spawnSync('git', args, { cwd, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 1024 * 1024 * 1024, encoding: binaire ? 'buffer' : 'utf8', windowsHide: true })
  return { code: r.status, stdout: r.stdout ?? (binaire ? Buffer.alloc(0) : ''), stderr: r.stderr ? r.stderr.toString() : '', erreur: r.error ? premiereLigne(r.error) : null }
}

// ── Options et sortie ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** → { valeurs, drapeaux, positionnels, inconnues, racine, racineParDefaut, temoin } */
export function lireOptions(argv, { connues = [] } = {}) {
  const valeurs = {}, drapeaux = new Set(), positionnels = [], inconnues = []
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) { positionnels.push(a); continue }
    if (m[2] === undefined) drapeaux.add(m[1]); else valeurs[m[1]] = m[2]
    if (![...connues, 'racine', 'temoin'].includes(m[1])) inconnues.push(a)
  }
  const racine = valeurs.racine ? path.resolve(R, valeurs.racine) : R
  return { valeurs, drapeaux, positionnels, inconnues, racine, racineParDefaut: !valeurs.racine || path.resolve(racine) === path.resolve(R), temoin: drapeaux.has('temoin') }
}

/**
 * La sortie d'un juge : une ligne d'en-tête, une ligne par critère (« ✅ ID détail » ou « ❌ ID détail »), puis
 * « <nom> : PASS » ou « <nom> : FAIL — ids ». `ids` : les critères déclarés, tous obligatoires.
 */
export function creerSortie(nom, ids, entete) {
  const res = new Map()
  console.log(entete)
  const ligne = (t) => String(t ?? '').replace(/\s*\r?\n\s*/g, ' · ').trim()
  const noter = (id, ok, detail) => {
    if (!ids.includes(id)) { ids.push(id) }
    if (res.has(id)) { const r = res.get(id); if (r.ok && !ok) { r.ok = false } r.detail += ` ; ${ligne(detail)}`; console.log(`${ok ? '✅' : '❌'} ${id} ${ligne(detail)} (complément)`); return }
    res.set(id, { ok, detail: ligne(detail) })
    console.log(`${ok ? '✅' : '❌'} ${id} ${ligne(detail) || (ok ? 'conforme' : 'en échec')}`)
  }
  const s = {
    passe: (id, detail) => noter(id, true, detail),
    echoue: (id, detail) => noter(id, false, detail),
    /** echecs : liste de défauts ; vide → PASS avec detailOk. */
    juger: (id, echecs, detailOk) => (echecs.length ? noter(id, false, echecs.slice(0, 6).join(' ; ') + (echecs.length > 6 ? ` ; … (${echecs.length} défauts)` : '')) : noter(id, true, detailOk)),
    async critere(id, f) {
      try { const r = await f(); if (r && typeof r === 'object' && 'echecs' in r) s.juger(id, r.echecs, r.detail); else if (r !== undefined) s.juger(id, [], String(r)) } catch (e) { noter(id, false, `interrompu : ${premiereLigne(e)}`) }
    },
    nonJuges(liste, raison) { for (const id of liste) if (!res.has(id)) noter(id, false, `non jugé : ${raison}`) },
    enEchec: (id) => res.has(id) && !res.get(id).ok,
    evalue: (id) => res.has(id),
    finir() {
      for (const id of ids) if (!res.has(id)) noter(id, false, 'non évalué')
      const rouges = ids.filter((id) => !res.get(id).ok)
      console.log(rouges.length ? `${nom} : FAIL — ${rouges.join(', ')}` : `${nom} : PASS`)
      return rouges.length ? 1 : 0
    },
  }
  return s
}

// ── Lecture de source ─────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le source sans ses commentaires (// et /* *\/), chaînes, gabarits (avec ${…} imbriqués) et expressions régulières
 * respectés ; les fins de ligne sont gardées (les numéros de ligne restent justes). `chaines` (facultatif) : une liste où
 * ranger le contenu brut de chaque chaîne et de chaque morceau de gabarit, { texte, pos } (pos : indice dans `src`) ; les
 * expressions régulières n'y vont pas.
 */
export function sansCommentaires(src, chaines = null) {
  const s = String(src)
  let out = '', i = 0
  const pile = [] // profondeur d'accolades de chaque ${ ouvert dans un gabarit
  let prec = '' // dernier caractère significatif émis hors chaîne (pour distinguer division et expression régulière)
  const regexPossible = () => prec === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prec) || /\b(?:return|typeof|case|do|else|in|of|void|throw|new|delete|await|yield)$/.test(out.trimEnd())
  while (i < s.length) {
    const c = s[i], d = s[i + 1]
    if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\n') i++; continue }
    if (c === '/' && d === '*') { const f = s.indexOf('*/', i + 2); const fin = f < 0 ? s.length : f + 2; out += s.slice(i, fin).replace(/[^\n]/g, ''); i = fin; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1
      if (chaines) chaines.push({ texte: s.slice(i + 1, j), pos: i + 1 })
      out += s.slice(i, j + 1); i = j + 1; prec = c; continue
    }
    if (c === '`' || (c === '}' && pile.length && pile[pile.length - 1] === 0)) {
      if (c === '}') pile.pop()
      let j = i + 1
      out += c
      while (j < s.length && s[j] !== '`' && !(s[j] === '$' && s[j + 1] === '{')) { out += s[j]; if (s[j] === '\\') { out += s[j + 1] ?? ''; j += 2 } else j++ }
      if (chaines) chaines.push({ texte: s.slice(i + 1, j), pos: i + 1 })
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

/**
 * Les imports d'un source (commentaires ôtés) : statiques, `export … from`, effets de bord, dynamiques, require.
 * → [{ spec, type, genre }] ; spec null pour un import dynamique non littéral.
 */
export function importsDe(src) {
  const s = sansCommentaires(src)
  const out = []
  for (const m of s.matchAll(/(?:^|[;\n}])\s*import\s+(type\s+)?([\w$*{}\s,]*?)\s*from\s*(['"])([^'"]+)\3/g)) {
    const liste = m[2]
    const toutType = !!m[1] || (/^\{[\s\S]*\}$/.test(liste.trim()) && liste.replace(/[{}]/g, '').split(',').map((x) => x.trim()).filter(Boolean).every((x) => /^type\s/.test(x)))
    out.push({ spec: m[4], type: toutType, genre: 'import' })
  }
  for (const m of s.matchAll(/(?:^|[;\n}])\s*import\s*(['"])([^'"]+)\1/g)) out.push({ spec: m[2], type: false, genre: 'effet' })
  for (const m of s.matchAll(/(?:^|[;\n}])\s*export\s+(type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s*from\s*(['"])([^'"]+)\2/g)) out.push({ spec: m[3], type: !!m[1], genre: 'export' })
  for (const m of s.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)) {
    const lit = /^(['"`])([^'"`$]+)\1$/.exec(m[1].trim())
    out.push({ spec: lit ? lit[2] : null, type: false, genre: 'dynamique' })
  }
  for (const m of s.matchAll(/\brequire\s*\(\s*([^)]*)\)/g)) {
    const lit = /^(['"`])([^'"`$]+)\1$/.exec(m[1].trim())
    out.push({ spec: lit ? lit[2] : null, type: false, genre: 'require' })
  }
  return out
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

// ── Valeurs ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function gelerProfond(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) gelerProfond(v) }
  return o
}
/** Les chemins où une sortie porte NaN, ±Infinity (et undefined si demandé), en profondeur. */
export function valeursInterdites(o, { undefinedInterdit = false } = {}, chemin = '$', vus = new Set()) {
  const out = []
  if (typeof o === 'number' && !Number.isFinite(o)) out.push(`${chemin} = ${o}`)
  else if (o === undefined && undefinedInterdit) out.push(`${chemin} = undefined`)
  else if (o && typeof o === 'object' && !vus.has(o)) {
    vus.add(o)
    if (o instanceof Date) { if (!Number.isFinite(o.getTime())) out.push(`${chemin} = Invalid Date`) } else for (const [k, v] of Object.entries(o)) out.push(...valeursInterdites(v, { undefinedInterdit }, `${chemin}.${k}`, vus))
  }
  return out
}
/** Toutes les clés d'un objet, en profondeur. */
export function clesProfondes(o, vus = new Set()) {
  const out = []
  if (o && typeof o === 'object' && !vus.has(o)) { vus.add(o); for (const [k, v] of Object.entries(o)) { if (!Array.isArray(o)) out.push(k); out.push(...clesProfondes(v, vus)) } }
  return out
}
const FMT_JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
/** Le jour civil à Paris, « AAAA-MM-JJ ». */
export const jourParis = (d) => FMT_JOUR_PARIS.format(new Date(d))
export const RE_EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
export const RE_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

// ── Modules jugés ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Importe <racine>/<rel> par URL de fichier (ts-loader doit être chargé : `node --import ./scripts/ts-loader.mjs`). */
export async function importerDepuis(racine, rel) {
  return import(pathToFileURL(path.join(racine, rel)).href)
}
/**
 * `npm run typecheck` (tsc --noEmit) sur <racine>, sans shell : le tsc de <racine>/node_modules (sinon celui du dépôt), le
 * fichier incrémental rangé sous .orchestre/travail/<juge>/tsbuildinfo/ (jamais tsconfig.tsbuildinfo de la racine).
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
  if (r.code === 0) return { ok: true, detail: `tsc --noEmit vert sur ${racine} en ${r.duree.toFixed(0)} s` }
  return { ok: false, detail: `tsc --noEmit en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} en ${r.duree.toFixed(0)} s : ${erreurs.length} erreur(s) — ${court(erreurs.slice(0, 3).join(' | ') || r.sortie, 400)}` }
}

// ── L'arbre de référence (git archive <sha>) ─────────────────────────────────────────────────────────────────────────────
// Lecteur tar repris de scripts/fixtures/025/commun.mjs (025-01), recopié ici pour ne pas lier le domaine Pilotage aux
// fixtures d'une autre série : rien n'est écrit dans .git, aucun tar du système, pas de conversion de fins de ligne.
export function lsTree(rev, prefixe = '') {
  const args = ['ls-tree', '-r', '-l', '-z', rev]
  if (prefixe) args.push('--', prefixe)
  const r = git(args, { binaire: true })
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
/** Mêmes fichiers que le commit, même blob chacun. → { ok, fichiers, octets, manquants, intrus, differents } */
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
    fs.writeFileSync(marque, `${JSON.stringify({ commit, fichiers: v.fichiers, octets: v.octets, extrait_le: new Date().toISOString(), par: 'scripts/fixtures/026-pilotage/a/commun.mjs extraireReference' }, null, 1)}\n`)
    return { dest, commit, fichiers: v.fichiers, octets: v.octets, reutilise: false }
  } finally {
    fs.rmSync(tar, { force: true })
    fs.rmSync(partiel, { recursive: true, force: true })
  }
}
/** Empreinte sha256 de chaque fichier d'un dossier (chemin posix relatif → sha). */
export function instantaneDossier(dossier) {
  const m = new Map()
  for (const f of listerFichiers(dossier)) m.set(f, sha256(fs.readFileSync(path.join(dossier, f))))
  return m
}
export function comparerInstantanes(avant, apres) {
  const d = []
  for (const [k, v] of avant) if (!apres.has(k)) d.push(`${k} disparu`); else if (apres.get(k) !== v) d.push(`${k} modifié`)
  for (const k of apres.keys()) if (!avant.has(k)) d.push(`${k} ajouté`)
  return d
}
