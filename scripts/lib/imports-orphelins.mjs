// scripts/lib/imports-orphelins.mjs — « un fichier suivi qui importe un fichier NON suivi » (04/10/2026).
//
// Le défaut (audit du 04/10, C §2.1) : le commit d7a1128f ajoutait lib/agents/acquisition/facteur.ts et porteurs/gmail.ts, qui
// importent « ./porteurs » ; porteurs.ts, lui, restait non suivi sur le PC. `npm run typecheck` lit le DISQUE (fichiers non suivis
// compris) : vert. Le hook ne faisait qu'une liste de regex. Vercel, qui lit git, a été la première machine à voir l'arbre propre :
// build en ERROR, la production n'a plus avancé jusqu'à la correction. Même défaut le 28/09 (026-077 → vigieMeta.ts) : la garde de
// presti-ops/usine/garde-imports.mjs ne couvre que les commits faits PAR le moteur ou commit-fiche.sh, et seulement les fichiers du
// commit. Ici : TOUT l'index, à CHAQUE commit (appelé par scripts/garde-commit.mjs, donc par .husky/pre-commit).
//
// Règle : chaque import relatif (« ./x », « ../x ») ou « @/x » (tsconfig : paths @/* → ./*) d'un fichier de code SUIVI OU INDEXÉ doit
// se résoudre vers un fichier SUIVI OU INDEXÉ. Sinon, une ligne par import, avec la raison :
//   HORS-GIT     la cible existe sur le disque mais pas dans git : c'est le défaut du 04/10 (le typecheck local ne le voit pas) ;
//   INTROUVABLE  la cible n'existe nulle part (un .mjs n'est pas typechecké : personne d'autre ne le voit avant l'exécution) ;
//   CASSE        la cible existe dans git sous une autre casse (Windows la trouve, Linux/Vercel non).
//
// Le contenu lu est celui de l'INDEX (`git ls-files -s` + `git cat-file --batch`), pas celui du disque : c'est ce que le commit
// contiendra. Sous `git commit -- <chemins>`, git donne au hook un index temporaire (HEAD + ces chemins) : la garde juge alors
// exactement le commit, pas l'index complet. `arbre: 'HEAD'` juge au contraire un commit déjà fait (vérification de main).
//
// La résolution suit celle de TypeScript (moduleResolution « bundler ») : le chemin tel quel, puis ses extensions, puis
// <dossier>/index.* ; « x.js » vise aussi « x.ts ». Dérivée de presti-ops/usine/garde-imports.mjs (28/09), qui reste l'outil du moteur.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

// Les fichiers dont les imports sont jugés : du code. Les dossiers qui ne sont PAS du code du produit sont écartés, chacun pour sa raison.
const CODE = /\.(?:[cm]?[jt]sx?)$/i
const NON_CODE = [
  ['.orchestre/', 'fiches, preuves et brouillons de l’orchestre : des textes qui citent du code, pas du code'],
  ['docs/contexte-cloud/', 'copies de documents pour Claude cloud (30/09) : pas le dépôt, pas exécutées ici'],
  ['reprise-cloud/', 'kit de reprise pour le cloud : outils copiés, jugés là-bas'],
  ['_to_delete/', 'corbeille en attente de suppression'],
  ['presti-debug-apk/', 'sortie de build Android'],
  ['mobile/', 'projet Capacitor : sa propre résolution (tsconfig l’exclut)'],
]
// Les témoins des juges : du code que le juge COPIE dans un bac d'essai, où ses imports se résolvent (scripts/fixtures/…/temoin/,
// …/temoins/, que tsconfig exclut aussi, et les fichiers « temoin-*.mjs » à côté de leur juge : temoin-tour.mjs importe
// @/lib/sites/searchConsole, le module que la production doit encore écrire ; juge 026-199). Dans le dépôt ils ne se résolvent pas,
// par construction.
// Les autres fichiers de scripts/fixtures/ (communs, lots, jeux) sont de vrais modules : ils restent jugés.
const FIXTURE_TEMOIN = /^scripts\/fixtures\/(?:.*\/)?(?:temoins?\/|temoin-[^/]*$)/

export const estCibleDeCode = (p) => CODE.test(p) && !NON_CODE.some(([d]) => p.startsWith(d)) && !FIXTURE_TEMOIN.test(p)
export const racinesEcartees = () => NON_CODE.map(([d, pourquoi]) => ({ dossier: d, pourquoi }))

const EXTS = ['.ts', '.tsx', '.mts', '.cts', '.d.ts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.svg']

// Le scanner de TypeScript lit les imports comme le compilateur : ce qui est dans une chaîne, un gabarit ou un commentaire n'en est pas
// un (les juges du dépôt écrivent des dizaines de « import … from './x' » dans des chaînes, pour fabriquer des bacs d'essai : une
// regex les prenait pour de vrais imports). preProcessFile voit « import », « export … from », « import() », « require() »,
// « import x = require() » et « import('x').T ». typescript est une dépendance du dépôt : sans elle, le typecheck du hook échoue déjà.
let ts = null
try { ts = createRequire(import.meta.url)('typescript') } catch { ts = null }
export const typescriptDisponible = () => !!ts

export function importsDe(texte) {
  if (!ts) throw new Error('typescript introuvable : la garde des imports ne peut pas lire le code')
  const vus = new Set(ts.preProcessFile(String(texte), true, true).importedFiles.map((f) => f.fileName))
  return [...vus].filter((s) => s.startsWith('@/') || s.startsWith('./') || s.startsWith('../'))
}

// Les chemins candidats d'un import, dans l'ordre de TypeScript ; null si la cible sort du dépôt.
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

// Le cœur, sans git ni disque : `fichiers` = Map chemin → texte (le code à juger), `suivis` = Set de tous les chemins suivis ou indexés,
// `surDisque(chemin)` = le fichier existe-t-il sur le disque (pour dire HORS-GIT plutôt qu'INTROUVABLE).
export function orphelinsDe({ fichiers, suivis, surDisque = () => false }) {
  const minuscules = new Map([...suivis].map((p) => [p.toLowerCase(), p]))
  const orphelins = []
  let nbImports = 0
  for (const [f, texte] of fichiers) {
    for (const spec of importsDe(texte)) {
      const liste = candidats(f, spec)
      if (!liste) continue
      nbImports++
      if (liste.some((c) => suivis.has(c))) continue
      // La casse d'abord : sous Windows le disque trouve « ./Porteurs » pour porteurs.ts, ce qui ferait croire à un fichier hors de git.
      const cibleCasse = liste.map((c) => minuscules.get(c.toLowerCase())).find(Boolean)
      const horsGit = cibleCasse ? null : liste.find((c) => surDisque(c))
      orphelins.push({
        fichier: f,
        spec,
        cible: horsGit || liste[0],
        raison: cibleCasse ? 'CASSE' : horsGit ? 'HORS-GIT' : 'INTROUVABLE',
        casse: cibleCasse || null,
      })
    }
  }
  return { orphelins, nbFichiers: fichiers.size, nbImports }
}

function git(racine, argv, entree) {
  const r = spawnSync('git', ['-c', 'core.quotepath=false', ...argv], { cwd: racine, input: entree, maxBuffer: 1 << 30, windowsHide: true })
  return { code: r.status, sortie: r.stdout || Buffer.alloc(0), erreurs: String(r.stderr || '') }
}

// Les enregistrements `git cat-file --batch` : « <sha> <type> <taille>\n<contenu>\n » en suite.
function lireBatch(buf, nb) {
  const sortie = []
  let o = 0
  for (let i = 0; i < nb; i++) {
    const fin = buf.indexOf(10, o)
    if (fin < 0) break
    const [, type, taille] = buf.toString('utf8', o, fin).split(' ')
    if (type === 'missing' || taille === undefined) { sortie.push(null); o = fin + 1; continue }
    const n = Number(taille)
    sortie.push(buf.toString('utf8', fin + 1, fin + 1 + n))
    o = fin + 1 + n + 1
  }
  return sortie
}

// Lit l'index (arbre absent) ou un arbre donné (« HEAD ») : { suivis: Set, codes: Map chemin → texte } ou { erreur }.
export function lireDepot({ racine = process.cwd(), arbre } = {}) {
  const l = arbre ? git(racine, ['ls-tree', '-r', '-z', arbre]) : git(racine, ['ls-files', '-s', '-z'])
  if (l.code !== 0) return { erreur: `git ${arbre ? `ls-tree ${arbre}` : 'ls-files'} : ${l.erreurs.trim().split('\n')[0]}` }
  const suivis = new Set()
  const aLire = []
  for (const e of l.sortie.toString('utf8').split('\0').filter(Boolean)) {
    // ls-files -s : « <mode> <sha> <étape>\t<chemin> » ; ls-tree : « <mode> <type> <sha>\t<chemin> »
    const t = e.indexOf('\t')
    const [mode, a, b] = e.slice(0, t).split(' ')
    const chemin = e.slice(t + 1)
    const sha = arbre ? b : a
    if (mode === '160000') continue // sous-module : pas un fichier
    suivis.add(chemin)
    if (mode !== '120000' && estCibleDeCode(chemin)) aLire.push([chemin, sha])
  }
  const codes = new Map()
  if (aLire.length) {
    const b = git(racine, ['cat-file', '--batch'], aLire.map(([, sha]) => sha).join('\n') + '\n')
    if (b.code !== 0) return { erreur: `git cat-file : ${b.erreurs.trim().split('\n')[0]}` }
    const textes = lireBatch(b.sortie, aLire.length)
    aLire.forEach(([chemin], i) => { if (textes[i] !== null && textes[i] !== undefined) codes.set(chemin, textes[i]) })
  }
  return { suivis, codes }
}

export function verifierOrphelins({ racine = process.cwd(), arbre } = {}) {
  const d = lireDepot({ racine, arbre })
  if (d.erreur) return { erreur: d.erreur, orphelins: [], nbFichiers: 0, nbImports: 0 }
  const surDisque = (p) => { try { return fs.statSync(path.join(racine, p)).isFile() } catch { return false } }
  return orphelinsDe({ fichiers: d.codes, suivis: d.suivis, surDisque })
}

export function ligneOrphelin(o) {
  if (o.raison === 'HORS-GIT') return `${o.fichier} — importe « ${o.spec} » : ${o.cible} existe sur le disque mais PAS dans git (le typecheck local le voit, le build Vercel non — d7a1128f, 04/10) : le commiter avec ce fichier`
  if (o.raison === 'CASSE') return `${o.fichier} — importe « ${o.spec} » : git a ${o.casse} sous une autre casse (Windows la trouve, Linux/Vercel non)`
  return `${o.fichier} — importe « ${o.spec} » : aucun fichier suivi ni indexé ne s'appelle ${o.cible} (ni avec une extension, ni en index)`
}
