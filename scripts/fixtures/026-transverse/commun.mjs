// scripts/fixtures/026-transverse/commun.mjs — aides communes de pont-telegram-qa et usine-durcie-qa (fiche 026-194, Claude Code).
// Rien ici n'écrit hors .orchestre/travail/ et .orchestre/preuves/026-194/ ; aucun réseau, aucun secret.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const TRAVAIL = path.join(R, '.orchestre', 'travail')
export const PREUVES = path.join(R, '.orchestre', 'preuves', '026-194')
export const FIXTURES = path.join(R, 'scripts', 'fixtures', '026-transverse')
export const existe = (p) => { try { fs.accessSync(p); return true } catch { return false } }
export const lire = (p) => fs.readFileSync(p, 'utf8')
export const lireSi = (p) => (existe(p) ? lire(p) : null)
export const lf = (t) => String(t).replace(/\r\n/g, '\n')
export const court = (s, n = 200) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
export const jsonFixture = (nom) => JSON.parse(lire(path.join(FIXTURES, nom)))
/** Un jeton d'essai tiré au hasard à chaque passage, assemblé à l'exécution (jamais écrit dans un fichier du dépôt). */
export const tirerJeton = (prefixe = 'essai') => `${prefixe}-${crypto.randomBytes(12).toString('hex')}`
/** Un code d'appairage de 8 caractères tiré au hasard (alphabet sans ambiguïté). */
export const tirerCode = () => Array.from(crypto.randomBytes(8), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
/** Une fiche de l'orchestre est livrée quand .orchestre/fait/<id>.md existe (dans la racine du dépôt, jamais celle d'une copie). */
export const ficheLivree = (id) => existe(path.join(R, '.orchestre', 'fait', `${id}.md`))

/** Options : --cle=valeur, --drapeau ; les inconnues sont rendues (le juge sort en code 2). */
export function lireOptions(argv, connues) {
  const valeurs = {}, drapeaux = new Set(), inconnues = []
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=(.*))?$/.exec(a)
    if (!m || !connues.includes(m[1])) { inconnues.push(a); continue }
    if (m[2] === undefined) drapeaux.add(m[1]); else valeurs[m[1]] = m[2]
  }
  return { valeurs, drapeaux, inconnues }
}

/** Analyseur INI d'une unité systemd : { sections: { Service: [[cle, valeur], …] }, erreurs: [] }. Une clé peut se répéter. */
export function analyserIni(texte) {
  const sections = {}, erreurs = []
  let courante = null
  for (const [i, brut] of lf(texte).split('\n').entries()) {
    const l = brut.trim()
    if (!l || l.startsWith('#') || l.startsWith(';')) continue
    const s = /^\[([A-Za-z]+)\]$/.exec(l)
    if (s) { courante = s[1]; sections[courante] ??= []; continue }
    const kv = /^([A-Za-z][A-Za-z0-9]*)\s*=\s*(.*)$/.exec(l)
    if (!kv) { erreurs.push(`ligne ${i + 1} illisible : « ${court(l, 60)} »`); continue }
    if (!courante) { erreurs.push(`ligne ${i + 1} avant toute section`); continue }
    sections[courante].push([kv[1], kv[2]])
  }
  return { sections, erreurs, valeurs: (section, cle) => (sections[section] ?? []).filter(([k]) => k === cle).map(([, v]) => v) }
}

/** Lance un processus, rend { code, stdout, stderr, expire } ; jamais d'exception. */
export function lancer(cmd, args, { cwd = R, env = process.env, timeout = 120_000, input } = {}) {
  const r = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', timeout, maxBuffer: 64 << 20, input })
  return { code: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', expire: r.error?.code === 'ETIMEDOUT', erreur: r.error ? String(r.error.message || r.error) : null }
}

/** Écrit (ou remplace) la section d'un juge dans .orchestre/preuves/026-194/echecs-attendus.md, entre deux marques. */
export function ecrireSectionEchecs(juge, lignes) {
  fs.mkdirSync(PREUVES, { recursive: true })
  const f = path.join(PREUVES, 'echecs-attendus.md')
  const debut = `<!-- juge:${juge}:debut -->`, fin = `<!-- juge:${juge}:fin -->`
  const bloc = [debut, ...lignes, fin].join('\n')
  const ex = existe(f) ? lf(lire(f)) : ''
  const i = ex.indexOf(debut), k = ex.indexOf(fin)
  const tete = '# Échecs attendus des juges du pont Telegram et du durcissement de l\'usine (026-194)\n\nUne section par juge, réécrite par `--preuve-echecs` de ce juge.\n\n'
  const txt = i >= 0 && k > i ? `${ex.slice(0, i)}${bloc}${ex.slice(k + fin.length)}` : `${ex.trim() ? `${ex.trimEnd()}\n\n` : tete}${bloc}\n`
  fs.writeFileSync(f, txt)
  return f
}

/** Non-régression du mode --temoin : package.json et package-lock.json identiques à HEAD, typecheck vert. → { ok, details[] } */
export function nonRegression({ racine = R, typecheck = true } = {}) {
  const echecs = []
  for (const f of ['package.json', 'package-lock.json']) {
    const d = lancer('git', ['diff', '--quiet', 'HEAD', '--', f], { cwd: racine })
    if (d.code !== 0) echecs.push(`${f} diffère de HEAD`)
  }
  if (typecheck) {
    const t = lancer('npm', ['run', 'typecheck'], { cwd: racine, timeout: 600_000 })
    if (t.code !== 0) echecs.push(`npm run typecheck : code ${t.code} — ${court((t.stdout + t.stderr).split('\n').filter((l) => /error/i.test(l))[0] ?? t.erreur ?? '', 140)}`)
  }
  return { ok: echecs.length === 0, echecs }
}
