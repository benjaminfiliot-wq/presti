// scripts/fixtures/026-pilotage/t/commun-b.mjs — l'aide des deux juges « route » du lot t (fiche 026-171, partie B, écrite par
// Claude Code) : station-reglages-qa (RX-1 à RX-8) et poste-extraction-qa (XT-1 à XT-5). Elle importe les aides des lots a, b et s
// sans les recopier ni les modifier, et porte ce que les deux juges partagent :
//   · arbreTemoinT(juge, { base, chemins }) : l'arbre du mode --temoin (les `chemins` du commit `base`, puis le témoin du lot t —
//     t/temoin/, suffixe .temoin ôté — posé dessus) sous .orchestre/travail/<juge>/temoin-arbre/ ;
//   · figer(iso) : l'horloge figée d'un processus enfant ;
//   · lignesDe / difference : la comparaison d'un fichier à sa version de base, ligne à ligne (multi-ensemble) ;
//   · CROCHET, urlDossier, DOUBLURES_B : le crochet de résolution de s/commun.mjs et le module de doublures de ce lot.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { R, TRAVAIL, court, premiereLigne, git, exigerSousTravail, listerFichiers, extraireTar, lireOuNull, lancer as lancerSync } from '../a/commun.mjs'
import { cheminsBase } from '../b/commun.mjs'
import { CROCHET, urlDossier, posix, lf } from '../s/commun.mjs'

export { R, TRAVAIL, court, premiereLigne, lireOuNull, CROCHET, urlDossier, posix, lf }
export const T = path.dirname(fileURLToPath(import.meta.url))
export const TEMOIN_T = path.join(T, 'temoin')
export const SUFFIXE_TEMOIN = '.temoin'
export const DOUBLURES_B = path.join(T, 'doublures-b.mjs')

/** Les fichiers du témoin du lot t : Map(chemin du dépôt → Buffer). */
export function fichiersTemoinT() {
  const m = new Map()
  for (const f of listerFichiers(TEMOIN_T)) {
    const p = posix(f)
    if (!p.endsWith(SUFFIXE_TEMOIN)) throw new Error(`témoin du lot t : ${p} sans le suffixe ${SUFFIXE_TEMOIN}`)
    m.set(p.slice(0, -SUFFIXE_TEMOIN.length), fs.readFileSync(path.join(TEMOIN_T, f)))
  }
  return m
}

/** Les `chemins` du commit `base` extraits (git archive : rien n'est écrit dans .git) sous .orchestre/travail/<juge>/<nom>/. */
export function arbreBase(juge, { base, chemins, nom = 'reference' }) {
  const dest = exigerSousTravail(path.join(TRAVAIL, juge, nom))
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(dest, { recursive: true })
  const tar = path.join(TRAVAIL, juge, `${nom}.tar`)
  const existants = chemins.filter((c) => cheminsBase(base, c).length)
  if (existants.length) {
    const r = git(['-c', 'core.autocrlf=false', 'archive', '--format=tar', `--output=${tar.split(path.sep).join('/')}`, base, '--', ...existants])
    if (r.code !== 0) throw new Error(`git archive ${base.slice(0, 7)} : ${court(r.stderr)}`)
    extraireTar(tar, dest)
    fs.rmSync(tar, { force: true })
  }
  return dest
}

/** Les `chemins` du commit `base`, puis le témoin du lot t (t/temoin/, suffixe .temoin ôté) posé dessus. */
export function arbreTemoinT(juge, { base, chemins }) {
  const dest = arbreBase(juge, { base, chemins, nom: 'temoin-arbre' })
  const poses = []
  for (const [rel, buf] of fichiersTemoinT()) {
    const f = path.join(dest, rel)
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.rmSync(f, { force: true })
    fs.writeFileSync(f, buf)
    poses.push(rel)
  }
  return { dest, poses }
}

/** Horloge figée : `new Date()` et `Date.now()` rendent l'instant voulu, le reste de Date est intact. */
export function figer(iso) {
  const Vraie = globalThis.__DateVraie ??= Date
  const t = Vraie.parse(iso)
  class DateFigee extends Vraie { constructor(...a) { if (a.length === 0) super(t); else super(...a) } static now() { return t } }
  globalThis.Date = DateFigee
}

/** Les lignes d'un texte (fins de ligne normalisées), sans la dernière ligne vide. */
export const lignesDe = (t) => { const l = lf(t).split('\n'); if (l.length && l[l.length - 1] === '') l.pop(); return l }
/** Les lignes retirées et ajoutées entre deux textes (multi-ensembles : l'ordre n'entre pas en compte). */
export function difference(avant, apres) {
  const compte = new Map()
  for (const l of lignesDe(avant)) compte.set(l, (compte.get(l) ?? 0) + 1)
  const ajoutees = []
  for (const l of lignesDe(apres)) { const n = compte.get(l) ?? 0; if (n > 0) compte.set(l, n - 1); else ajoutees.push(l) }
  const retirees = []
  for (const [l, n] of compte) for (let i = 0; i < n; i++) retirees.push(l)
  return { retirees, ajoutees }
}

// ── Le typage des seuls fichiers jugés ──────────────────────────────────────────────────────────────────────────────────────
/**
 * `tsc --noEmit` sur une liste de fichiers de <racine> (et tout ce qu'ils importent), avec le tsconfig de <racine> : ce que le
 * typage du dépôt entier dirait de ces fichiers, sans le coût du dépôt entier. → { ok, detail }
 * `npm run typecheck` (tout le dépôt) reste la vraie commande : les juges la jouent sur la racine réelle (RX-8, XT-5).
 */
export function typecheckFichiers(racine, juge, fichiers) {
  const tsc = [path.join(racine, 'node_modules', 'typescript', 'bin', 'tsc'), path.join(R, 'node_modules', 'typescript', 'bin', 'tsc')].find((f) => fs.existsSync(f))
  if (!tsc) return { ok: false, detail: 'typescript introuvable dans node_modules' }
  if (!fs.existsSync(path.join(racine, 'tsconfig.json'))) return { ok: false, detail: `${path.join(racine, 'tsconfig.json')} absent` }
  const dossier = exigerSousTravail(path.join(TRAVAIL, juge, 'tsc'))
  fs.mkdirSync(dossier, { recursive: true })
  const presents = fichiers.filter((f) => fs.existsSync(path.join(racine, f))).map((f) => path.join(racine, f))
  const manquants = fichiers.filter((f) => !fs.existsSync(path.join(racine, f)))
  if (manquants.length) return { ok: false, detail: `fichier(s) à typer absent(s) : ${manquants.join(', ')}` }
  const decl = path.join(racine, 'next-env.d.ts')
  const config = path.join(dossier, 'tsconfig.json')
  fs.writeFileSync(config, JSON.stringify({ extends: path.join(racine, 'tsconfig.json'), compilerOptions: { noEmit: true, incremental: false }, include: [...presents, ...(fs.existsSync(decl) ? [decl] : [])], exclude: [] }, null, 1))
  const r = lancerSync(process.execPath, [tsc, '-p', config, '--pretty', 'false'], { cwd: racine })
  const erreurs = r.stdout.split(/\r?\n/).filter((l) => /error TS\d+/.test(l))
  if (r.code === 0) return { ok: true, detail: `tsc --noEmit vert sur ${fichiers.length} fichier(s) et leurs imports (${r.duree.toFixed(0)} s)` }
  return { ok: false, detail: `tsc --noEmit en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} : ${erreurs.length} erreur(s) — ${court(erreurs.slice(0, 3).join(' | ') || r.sortie, 400)}` }
}

/** Un crochet de chargement de plus : `import x from '….json'` (que Next accepte sans attribut) rend le JSON comme export par défaut. */
export const CROCHET_JSON = String.raw`import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export async function load(url, ctx, next) {
  const u = url.split('?')[0]
  if (u.startsWith('file:') && u.endsWith('.json')) return { format: 'module', source: 'export default ' + readFileSync(fileURLToPath(u), 'utf8'), shortCircuit: true }
  return next(url, ctx)
}
`
