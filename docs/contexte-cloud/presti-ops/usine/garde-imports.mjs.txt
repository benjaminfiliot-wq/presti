#!/usr/bin/env node
// presti-ops/usine/garde-imports.mjs — la garde des imports avant le commit d'une fiche (28/09/2026).
// Le 28/09, le moteur a commité 026-077 dont la route importait lib/agents/acquisition/vigieMeta.ts, présent sur le PC mais
// pas encore commité : le typecheck du PC était vert (il lit le disque), le build Vercel (qui lit git) a cassé de 14:07 à 14:40.
// Règle : chaque import « @/… » ou relatif des fichiers de code du commit (.ts, .tsx, .mts, .cts, .js, .jsx, .mjs, .cjs) doit se
// résoudre vers un fichier de HEAD ou de CE commit (l'index : ce qui est indexé sous les chemins du commit). Sinon, refus, une
// ligne par import : « ✗ <id> : import non commité <chemin> (fichier présent sur le PC mais hors de git) ».
// La résolution suit celle de TypeScript : le chemin tel quel, puis ses extensions, puis <dossier>/index.* ; « x.js » vise aussi
// « x.ts ». Une cible introuvable partout (ni disque, ni HEAD, ni commit) n'est pas l'affaire de cette garde (le typecheck la voit).
// Utilisée par moteur.mjs (commiterEtPousser) et commit-fiche.sh, APRÈS l'indexation et AVANT le commit.
// Usage : node garde-imports.mjs --id=<id> [--racine=<dépôt>] -- <chemins du commit…>   (codes : 0 propre, 1 refus, 2 usage)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const CODE = /\.(?:[cm]?[jt]sx?)$/i
const EXTS = ['.ts', '.tsx', '.mts', '.cts', '.d.ts', '.js', '.jsx', '.mjs', '.cjs', '.json']
const MOTIFS = [
  /\bimport\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"\n]+)['"]/g,
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s+from\s+['"]([^'"\n]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
]

function git(racine, argv) {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...argv], { cwd: racine, encoding: 'utf8', maxBuffer: 1 << 28, windowsHide: true })
  return { code: r.status, sortie: r.stdout || '', erreurs: r.stderr || '' }
}
// Les imports d'un texte de code : commentaires de bloc en début de ligne et commentaires de ligne entière retirés d'abord.
export function importsDe(texte) {
  const t = String(texte).replace(/^\s*\/\*[\s\S]*?\*\//gm, '').replace(/^\s*\/\/.*$/gm, '')
  const vus = new Set()
  for (const re of MOTIFS) for (const m of t.matchAll(re)) vus.add(m[1])
  return [...vus].filter((s) => s.startsWith('@/') || s.startsWith('./') || s.startsWith('../'))
}
// Les chemins candidats d'un import, dans l'ordre de TypeScript ; null s'il sort du dépôt.
export function candidats(depuis, spec) {
  const s = spec.replace(/[?#].*$/, '')
  const base = s.startsWith('@/') ? path.posix.normalize(s.slice(2)) : path.posix.normalize(path.posix.join(path.posix.dirname(depuis), s))
  if (base.startsWith('../') || base === '..' || path.posix.isAbsolute(base)) return null
  const b = base.replace(/\/$/, '')
  const liste = [b, ...EXTS.map((e) => b + e)]
  const js = b.match(/^(.*)\.([cm]?)jsx?$/)
  if (js) liste.push(`${js[1]}.${js[2]}ts`, `${js[1]}.${js[2]}tsx`, `${js[1]}.ts`, `${js[1]}.tsx`)
  liste.push(...EXTS.map((e) => `${b}/index${e}`))
  return [...new Set(liste)]
}
// { commit: [chemins indexés], manques: [{ fichier, spec, cible, casse }] }
export function verifierImports({ racine, pathspecs }) {
  const r = git(racine, ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', ...pathspecs])
  if (r.code !== 0) return { commit: [], manques: [], erreur: r.erreurs.trim().split('\n')[0] }
  const commit = r.sortie.split('\n').map((s) => s.trim()).filter(Boolean)
  const dansCommit = new Set(commit)
  const t = git(racine, ['ls-tree', '-r', '--name-only', 'HEAD'])
  const dansHead = new Set(t.code === 0 ? t.sortie.split('\n').map((s) => s.trim()).filter(Boolean) : [])
  const headMinuscule = new Map([...dansHead].map((p) => [p.toLowerCase(), p]))
  const estFichier = (p) => { try { return fs.statSync(path.join(racine, p)).isFile() } catch { return false } }
  const manques = []
  for (const f of commit.filter((c) => CODE.test(c))) {
    let texte = ''
    try { texte = fs.readFileSync(path.join(racine, f), 'utf8') } catch { continue }
    for (const spec of importsDe(texte)) {
      const liste = candidats(f, spec)
      if (!liste) continue
      // Le premier candidat qui existe quelque part (disque, HEAD ou commit), comme TypeScript le choisirait.
      const cible = liste.find((c) => dansHead.has(c) || dansCommit.has(c) || estFichier(c))
      if (!cible || dansHead.has(cible) || dansCommit.has(cible)) continue
      const casse = headMinuscule.get(cible.toLowerCase())
      manques.push({ fichier: f, spec, cible, casse: casse && casse !== cible ? casse : null })
    }
  }
  return { commit, manques }
}
export const ligneManque = (id, m) => (m.casse
  ? `✗ ${id} : import à la casse différente de git ${m.cible} (git a ${m.casse} ; importé par ${m.fichier})`
  : `✗ ${id} : import non commité ${m.cible} (fichier présent sur le PC mais hors de git ; importé par ${m.fichier})`)

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const argv = process.argv.slice(2)
  const sep = argv.indexOf('--')
  const opts = Object.fromEntries((sep >= 0 ? argv.slice(0, sep) : argv).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i > 0 ? [a.slice(2, i), a.slice(i + 1)] : [a.slice(2), 'oui'] }))
  const pathspecs = sep >= 0 ? argv.slice(sep + 1).filter(Boolean) : []
  if (!opts.id || !pathspecs.length) { console.error('usage : node garde-imports.mjs --id=<id> [--racine=<dépôt>] -- <chemins du commit…>'); process.exitCode = 2 }
  else {
    const racine = path.resolve(opts.racine || process.cwd())
    const r = verifierImports({ racine, pathspecs })
    if (r.erreur) { console.log(`✗ ${opts.id} : garde des imports impossible (git diff --cached : ${r.erreur})`); process.exitCode = 1 }
    else if (r.manques.length) { for (const m of r.manques) console.log(ligneManque(opts.id, m)); process.exitCode = 1 }
    else { console.log(`· ${opts.id} : imports vérifiés (${r.commit.filter((c) => CODE.test(c)).length} fichier(s) de code dans le commit, tous leurs imports « @/ » et relatifs sont dans git ou dans ce commit)`); process.exitCode = 0 }
  }
}
