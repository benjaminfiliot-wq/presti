// scripts/fixtures/026/usine-production/commun.mjs — ce que partagent les trois juges de la production sur l'usine (026-052,
// écrit par Claude Code) : usine-sql-qa.mjs, usine-routes-qa.mjs, usine-production-qa.mjs.
//
//   CONTRAT                 contrat-usine.json lu (la copie du juge).
//   REFERENCE               le commit où aucun fichier jugé n'existe : chaque juge y échoue sur son premier critère.
//   extraireReference(j, d) git archive REFERENCE <dossiers> extrait sous .orchestre/travail/<juge>/reference/ (tar relatif :
//                           le tar MSYS lit « C: » comme un hôte ; un nom sans « : » passe avec les deux tar du poste).
//   construireTemoin(j, o)  le TÉMOIN : une mise en œuvre de référence, écrite par Claude Code, qui n'est le livrable d'aucune
//                           fiche. Les fichiers temoin/**.temoin (suffixe ôté) superposés à ce que le juge demande de copier
//                           (depuis HEAD par git archive, ou depuis le dépôt, ou depuis d'autres témoins de la maison).
//   eprouver(j, o)          le témoin intact doit être VERT (code 0), puis chaque sabotage — UN remplacement de texte exact dans
//                           UN fichier du témoin, présent une seule fois — doit rendre son critère ROUGE (code 1 et une ligne
//                           « FAIL <critère> »). Le fichier est rétabli après chaque sabotage. Un juge qui sort toujours en 0
//                           ou toujours en 1 est vu là.
//   ecrireSection(j, md)    la section du juge dans .orchestre/preuves/026-052/echecs-attendus.md (entre deux marques), les
//                           sections des deux autres juges gardées ; refuse un fichier de 0 octet.
//   lancer(cmd, args, o)    un processus sans bloquer la boucle, délai, arbre tué par PID au délai.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const ICI = path.dirname(fileURLToPath(import.meta.url))
export const DEPOT = path.resolve(ICI, '..', '..', '..', '..')
export const FIX = ICI
export const CONTRAT_F = path.join(ICI, 'contrat-usine.json')
export const CONTRAT = JSON.parse(fs.readFileSync(CONTRAT_F, 'utf8'))
export const TEMOIN = path.join(ICI, 'temoin')
export const PREUVES = path.join(DEPOT, '.orchestre', 'preuves', '026-052')
export const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail')
// HEAD le 27/09/2026 quand ces juges ont été écrits : aucun des fichiers qu'ils jugent n'y existe.
export const REFERENCE = 'a14b6c1'
export const WIN = process.platform === 'win32'

export const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
export const lf = (t) => String(t ?? '').replace(/\r\n?/g, '\n')
export const posix = (p) => String(p).split(path.sep).join('/')
export const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex')
export const lettres = (n) => { const a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; const o = crypto.randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += a[o[i] % a.length]; return s }
export const existe = (p) => { try { fs.accessSync(p); return true } catch { return false } }
export const lireSi = (p) => { try { return lf(fs.readFileSync(p, 'utf8')) } catch { return null } }
export const attendre = (ms) => new Promise((r) => setTimeout(r, ms))
// L'espace de travail d'un passage de sabotage (eprouver en lance plusieurs à la fois) : JUGE_026_052_ESPACE=w<n>. Chaque
// passage écrit alors sous .orchestre/travail/<juge>/espaces/w<n>/, jamais dans le dossier d'un autre.
export const ESPACE = /^w\d{1,2}$/.test(process.env.JUGE_026_052_ESPACE || '') ? process.env.JUGE_026_052_ESPACE : null
export function dossierTravail(juge, ...parties) {
  const d = ESPACE ? path.join(TRAVAIL, juge, 'espaces', ESPACE, ...parties) : path.join(TRAVAIL, juge, ...parties)
  fs.mkdirSync(d, { recursive: true })
  return d
}
export function vider(d) {
  const r = path.relative(TRAVAIL, path.resolve(d))
  if (!r || r.startsWith('..') || path.isAbsolute(r)) throw new Error(`suppression refusée hors de .orchestre/travail/ : ${d}`)
  fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  fs.mkdirSync(d, { recursive: true })
  return d
}
export function git(args, { cwd = DEPOT } = {}) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 28, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' }
}

/** Tue un arbre de processus par son PID (jamais par nom). */
export function tuerArbre(pid) {
  if (!pid) return
  try {
    if (WIN) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    else { try { process.kill(-pid, 'SIGKILL') } catch { process.kill(pid, 'SIGKILL') } }
  } catch { /* déjà mort */ }
}
export const vivant = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }

/** Lance sans bloquer la boucle (un faux serveur du juge doit pouvoir répondre). → { code, sortie, erreur, expire, duree, pid } */
export function demarrer(cmd, args, { cwd = DEPOT, env = process.env, delaiMs = 120_000, entree = null, detache = false } = {}) {
  const t0 = Date.now()
  let enfant
  const fin = new Promise((ok) => {
    let so = '', se = '', expire = false, fini = false
    const finir = (code) => { if (fini) return; fini = true; clearTimeout(m); ok({ code: expire ? 124 : code, sortie: so, erreur: se, expire, duree: (Date.now() - t0) / 1000, pid: enfant?.pid }) }
    const m = setTimeout(() => { expire = true; tuerArbre(enfant?.pid) }, delaiMs)
    try { enfant = spawn(cmd, args, { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], detached: detache && !WIN }) } catch (e) { se = e.message; return finir(127) }
    enfant.stdout.setEncoding('utf8'); enfant.stderr.setEncoding('utf8')
    enfant.stdout.on('data', (d) => { so += d })
    enfant.stderr.on('data', (d) => { se += d })
    enfant.on('error', (e) => { se += `\n${e.message}`; finir(127) })
    enfant.on('close', (code) => finir(code))
    enfant.stdin.on('error', () => {})
    if (entree !== null) enfant.stdin.end(entree); else enfant.stdin.end()
  })
  return { get pid() { return enfant?.pid }, fin }
}
export const lancer = (cmd, args, o) => demarrer(cmd, args, o).fin

/** Les lignes « FAIL <id> — … » d'une sortie de juge, et la première. */
export function lignesFail(sortie) { return lf(sortie).split('\n').filter((l) => /^FAIL \S+ — /.test(l)) }
export const premierFail = (sortie) => lignesFail(sortie)[0] || ''
export const critereDe = (ligne) => (/^FAIL (\S+)/.exec(ligne) || [])[1] || null

// ── L'arbre de référence ─────────────────────────────────────────────────────────────────────────────────────────────
export function extraireReference(juge, dossiers, fichiersJuges = []) {
  const D = []
  if (git(['merge-base', '--is-ancestor', REFERENCE, 'HEAD']).code !== 0) D.push(`le commit de référence ${REFERENCE} n'est pas un ancêtre de HEAD`)
  for (const f of fichiersJuges) if (git(['cat-file', '-e', `${REFERENCE}:${f}`]).code === 0) D.push(`${f} existe déjà au commit de référence`)
  const dest = vider(dossierTravail(juge, 'reference'))
  if (D.length) return { dest: null, echecs: D }
  const nomTar = 'reference.tar'
  const a = git(['archive', '--format=tar', `--output=${path.join(dest, nomTar)}`, REFERENCE, ...dossiers])
  if (a.code !== 0) return { dest: null, echecs: [`git archive ${REFERENCE} : ${court(a.stderr, 120)}`] }
  const x = spawnSync('tar', ['-xf', nomTar], { cwd: dest, encoding: 'utf8', windowsHide: true })
  fs.rmSync(path.join(dest, nomTar), { force: true })
  if (x.status !== 0) return { dest: null, echecs: [`extraction de la référence impossible (tar en code ${x.status}) : ${court(x.stderr, 120)}`] }
  return { dest, echecs: [] }
}

// ── Le témoin ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function listerTemoins(d = TEMOIN, pre = '') {
  const out = []
  for (const e of existe(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) {
    if (e.isDirectory()) out.push(...listerTemoins(path.join(d, e.name), `${pre}${e.name}/`))
    else if (e.name.endsWith('.temoin')) out.push(`${pre}${e.name}`)
  }
  return out
}
/**
 * Le témoin d'un juge sous .orchestre/travail/<juge>/temoin/ :
 *   depuisHead  dossiers extraits de HEAD par git archive (ce que la non-régression compare aux blobs de HEAD) ;
 *   copier      chemins du dépôt copiés tels quels ;
 *   autres      [[dossier de témoins .temoin d'une autre fiche, [chemins relatifs]]] superposés ;
 *   prefixes    les témoins de CE lot à superposer (préfixes de chemin relatif) ;
 * → { dest, superposes[] }. Un témoin attendu absent ou de 0 octet lève.
 */
export function construireTemoin(juge, { depuisHead = [], copier = [], autres = [], prefixes = [''] } = {}) {
  const dest = vider(dossierTravail(juge, 'temoin'))
  if (depuisHead.length) {
    const a = git(['archive', '--format=tar', `--output=${path.join(dest, 'head.tar')}`, 'HEAD', ...depuisHead])
    if (a.code !== 0) throw new Error(`git archive HEAD : ${court(a.stderr, 120)}`)
    const x = spawnSync('tar', ['-xf', 'head.tar'], { cwd: dest, encoding: 'utf8', windowsHide: true })
    fs.rmSync(path.join(dest, 'head.tar'), { force: true })
    if (x.status !== 0) throw new Error(`tar : ${court(x.stderr, 120)}`)
  }
  for (const rel of copier) fs.cpSync(path.join(DEPOT, rel), path.join(dest, rel), { recursive: true })
  const superposes = []
  for (const [dossier, liste] of autres) {
    for (const rel of liste) {
      const src = path.join(dossier, `${rel}.temoin`)
      if (!existe(src) || !fs.statSync(src).size) throw new Error(`témoin d'une autre fiche absent : ${posix(path.relative(DEPOT, src))}`)
      fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true })
      fs.copyFileSync(src, path.join(dest, rel))
      superposes.push(rel)
    }
  }
  for (const f of listerTemoins().filter((f) => prefixes.some((p) => f.startsWith(p)))) {
    const src = path.join(TEMOIN, f)
    if (!fs.statSync(src).size) throw new Error(`témoin de 0 octet : ${f}`)
    const rel = f.slice(0, -'.temoin'.length)
    fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true })
    fs.copyFileSync(src, path.join(dest, rel))
    superposes.push(rel)
  }
  return { dest, superposes }
}

/** Un remplacement exact (présent une seule fois, fins de ligne normalisées) : rend le texte d'avant, pour le rétablir. */
export function muter(fichier, avant, apres) {
  const brut = fs.readFileSync(fichier)
  const t = lf(brut.toString('utf8'))
  const n = t.split(avant).length - 1
  if (n !== 1) throw new Error(`« ${court(avant, 70)} » présent ${n} fois dans ${posix(path.basename(fichier))} (une fois attendue)`)
  fs.writeFileSync(fichier, t.replace(avant, () => apres))
  return brut
}

/**
 * La preuve qu'un juge sait réussir et échouer, dans le processus de son --preuve-echecs.
 *   juge        chemin du juge ; args(critere|null, racine) → les arguments d'un passage sur le témoin `racine` ;
 *   sabotages   [[critère, fichier relatif du témoin, avant, après, note?]] ;
 *   criteres    les critères qui doivent avoir au moins un sabotage ;
 *   parallele   nombre de passages de sabotage menés à la fois (3 par défaut : le verifier des trois juges tient ainsi dans
 *               son budget de 20 min même quand le poste est chargé). Le témoin intact passe seul, d'abord ; puis chaque
 *               travailleur a SA copie du témoin (<racine>-w<n>, effacée après) et SON espace de travail
 *               (JUGE_026_052_ESPACE=w<n>, voir dossierTravail) : un sabotage n'en croise jamais un autre.
 * → { temoin: { code, fails, sortie }, lignes: [{ critere, fichier, avant, apres, code, juste, releve }], echecs[] }
 */
export async function eprouver({ juge, racine, args, sabotages, criteres, delaiMs = 600_000, env = process.env, prefixeNode = [], parallele = 3 }) {
  const echecs = []
  const t = await lancer(process.execPath, [...prefixeNode, juge, ...args(null, racine)], { cwd: DEPOT, delaiMs, env })
  const failsT = lignesFail(t.sortie)
  const temoin = { code: t.code, fails: failsT, sortie: t.sortie + t.erreur }
  if (t.code !== 0) echecs.push(`témoin intact : code ${t.code} (0 attendu)${failsT.length ? ` — ${court(failsT[0], 200)}` : ` — ${court(t.erreur || t.sortie, 200)}`}`)
  const sautes = lf(t.sortie).split('\n').filter((l) => /^SAUTE /.test(l) && !/^SAUTE \S+ — --reel/.test(l))
  if (sautes.length) echecs.push(`témoin intact : ${sautes.length} critère(s) sauté(s) hors --reel : ${court(sautes[0], 160)}`)
  const n = Math.max(1, Math.min(Number(parallele) || 1, sabotages.length))
  const racines = [racine]
  for (let w = 1; w < n; w++) {
    const d = `${racine}-w${w}`
    const r = path.relative(TRAVAIL, d)
    if (!r || r.startsWith('..') || path.isAbsolute(r)) throw new Error(`copie de travailleur hors de .orchestre/travail/ : ${d}`)
    fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    fs.cpSync(racine, d, { recursive: true })
    racines.push(d)
  }
  const unSabotage = async ([critere, rel, avant, apres, note], rac, w) => {
    const f = path.join(rac, rel)
    let brut = null, ajout = null
    const l = { critere, fichier: rel, avant: avant ?? '(copie du fichier)', apres, note: note || '', code: null, juste: false, releve: '' }
    try {
      if (avant === null) { // un fichier en plus : copie de `rel` vers `apres`, retirée après
        const cible = path.join(rac, apres)
        if (existe(cible)) throw new Error(`${apres} existe déjà dans le témoin`)
        fs.copyFileSync(f, cible); ajout = cible
      } else brut = muter(f, avant, apres)
      const r = await lancer(process.execPath, [...prefixeNode, juge, ...args(critere, rac)], { cwd: DEPOT, delaiMs, env: { ...env, JUGE_026_052_ESPACE: `w${w}` } })
      const fails = lignesFail(r.sortie)
      const sienne = fails.find((x) => critereDe(x) === critere)
      l.code = r.code
      l.releve = sienne || fails[0] || court(r.erreur || r.sortie, 200)
      l.juste = r.code === 1 && !!sienne
      if (!l.juste) echecs.push(`sabotage de ${critere} (${rel}) : code ${r.code}, ${sienne ? '' : `aucune ligne « FAIL ${critere} » — `}${court(l.releve, 160)}`)
    } catch (e) {
      l.releve = `sabotage inapplicable : ${e.message}`
      echecs.push(`sabotage de ${critere} inapplicable : ${e.message}`)
    } finally {
      if (brut !== null) fs.writeFileSync(f, brut)
      if (ajout) fs.rmSync(ajout, { force: true })
    }
    return l
  }
  const lignes = new Array(sabotages.length)
  let suivant = 0
  try {
    await Promise.all(racines.map(async (rac, w) => {
      while (suivant < sabotages.length) {
        const k = suivant++
        lignes[k] = await unSabotage(sabotages[k], rac, w)
      }
    }))
  } finally {
    for (const d of racines.slice(1)) fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  const sansSabotage = criteres.filter((c) => !sabotages.some(([x]) => x === c))
  if (sansSabotage.length) echecs.push(`critère(s) sans sabotage : ${sansSabotage.join(', ')} — rien ne prouve qu'ils savent échouer`)
  return { temoin, lignes, echecs }
}

// ── echecs-attendus.md : une section par juge ────────────────────────────────────────────────────────────────────────
const echapper = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
export function tableSabotages(lignes) {
  return [
    '| Critère | Fichier du témoin | Remplacement | Code | Juste | Ligne relevée (extrait réel) |', '|---|---|---|---|---|---|',
    ...lignes.map((l) => `| ${l.critere} | \`${l.fichier}\` | « ${echapper(court(l.avant, 70))} » → « ${echapper(court(l.apres, 70))} »${l.note ? ` (${echapper(l.note)})` : ''} | ${l.code ?? '—'} | ${l.juste ? 'oui' : 'NON'} | ${echapper(court(l.releve, 220))} |`),
  ]
}
export function ecrireSection(juge, lignesMd) {
  const f = path.join(PREUVES, 'echecs-attendus.md')
  fs.mkdirSync(PREUVES, { recursive: true })
  const debut = `<!-- debut:${juge} -->`, fin = `<!-- fin:${juge} -->`
  let t = lireSi(f) || '# Échecs attendus des juges de la production sur l\'usine (026-052)\n\nChaque juge écrit sa section par `--preuve-echecs` ; les deux autres sections sont gardées telles quelles.\n'
  const bloc = `${debut}\n${lignesMd.join('\n')}\n${fin}`
  const i = t.indexOf(debut), j = t.indexOf(fin)
  t = i >= 0 && j > i ? `${t.slice(0, i)}${bloc}${t.slice(j + fin.length)}` : `${t.trimEnd()}\n\n${bloc}\n`
  fs.writeFileSync(f, t)
  const relu = lireSi(f)
  if (!relu || !fs.statSync(f).size) throw new Error('echecs-attendus.md de 0 octet après écriture')
  return { fichier: f, octets: fs.statSync(f).size, relu }
}

// ── Petites lectures communes ────────────────────────────────────────────────────────────────────────────────────────
/** Un analyseur INI pour les unités systemd : { sections: { Nom: [[cle, valeur]…] } }, commentaires et suites « \ » gérés. */
export function lireIni(texte) {
  const sections = {}
  let cur = null
  const lignes = lf(texte).split('\n')
  for (let i = 0; i < lignes.length; i++) {
    let l = lignes[i]
    while (/\\$/.test(l) && i + 1 < lignes.length) l = l.slice(0, -1) + ' ' + lignes[++i].trim()
    const x = l.trim()
    if (!x || x.startsWith('#') || x.startsWith(';')) continue
    const s = /^\[([^\]]+)\]$/.exec(x)
    if (s) { cur = s[1]; (sections[cur] ??= []); continue }
    const kv = /^([A-Za-z][A-Za-z0-9]*)\s*=\s*(.*)$/.exec(x)
    if (!kv) return { erreur: `ligne ${i + 1} illisible : « ${court(x, 60)} »`, sections }
    if (!cur) return { erreur: `ligne ${i + 1} hors de toute section`, sections }
    sections[cur].push([kv[1], kv[2].trim()])
  }
  return { erreur: null, sections }
}
export const valeurs = (ini, section, cle) => (ini.sections[section] || []).filter(([k]) => k === cle).map(([, v]) => v)
