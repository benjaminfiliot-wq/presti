// scripts/garde-imports-qa.mjs — le juge de la garde « un fichier suivi n'importe pas un fichier non suivi » (04/10/2026).
//
// Le défaut (audit du 04/10, C §2.1, R1) : d7a1128f commitait facteur.ts, qui importe « ./porteurs », sans porteurs.ts (resté non suivi).
// Le typecheck du hook lit le disque : vert ; Vercel lit git : build en ERROR. La garde est scripts/lib/imports-orphelins.mjs, appelée par
// scripts/garde-commit.mjs (donc par .husky/pre-commit) sur l'INDEX de chaque commit. Ce juge prouve qu'elle voit le défaut, qu'elle ne
// crie pas au loup, et qu'elle est bien branchée sur le vrai mécanisme de git (hook réel, `git commit -- <chemins>`).
//
// Usage : node scripts/garde-imports-qa.mjs [--racine=<dépôt>] [--seulement=GI-2,GI-3] [--mutations]     (code 0 : PASS ; 1 : FAIL ; 2 : usage)
//   Tout vient de <racine> (la bibliothèque, garde-commit.mjs, deploiement-etat.mjs) : c'est ce qui permet de lancer le juge sur une copie
//   SABOTÉE de la garde ; node_modules y est cherché dans <racine>, puis dans le dépôt qui contient ce juge.
//   --mutations : la preuve que ce juge est sensible : il fabrique des copies SABOTÉES de la garde (huit mutations : la garde ne voit plus
//   rien, le disque tient lieu de git, le crochet est débranché, « @/ » ignoré, les chaînes comptent comme des imports, l'exemption des
//   scripts, le filtre de deploiement-etat sans « error TS ») et relance ce juge sur chacune : il doit rougir sur les critères attendus.
//
//   GI-1  témoin : un dépôt jetable où tout est suivi ou indexé (neuf formes d'import : relatif, « @/ », « x.js » → x.ts, dossier/index,
//         export … from, import type, import(), require(), script .mjs) rend zéro orphelin ET le juge a bien compté les neuf imports ;
//   GI-2  sabotage « le défaut du 04/10 » : f.ts suivi importe ./porteurs, porteurs.ts est sur le disque mais pas dans git → un orphelin,
//         HORS-GIT, qui nomme porteurs.ts ;
//   GI-3  sabotages par forme : chacune des neuf formes visant un fichier non suivi est vue (neuf orphelins HORS-GIT, un par forme) ;
//   GI-4  INTROUVABLE (la cible n'existe nulle part) et CASSE (git a « porteurs.ts », l'import dit « ./Porteurs » : Windows le trouve,
//         Vercel non) sont nommés comme tels, pas confondus avec HORS-GIT ;
//   GI-5  « suivi OU INDEXÉ » : une cible indexée (git add) mais pas commitée est acceptée en mode index ; jugée sur HEAD elle ne l'est pas ;
//   GI-6  le bruit : un import écrit dans une chaîne, un gabarit ou un commentaire n'est pas un import (les juges du dépôt en fabriquent
//         des dizaines) ; le même texte en vrai import vers un fichier absent, lui, est vu ;
//   GI-7  le vrai crochet : dans un dépôt jetable dont le .git/hooks/pre-commit lance <racine>/scripts/garde-commit.mjs, (a)
//         `git commit -- f.ts` refuse (code ≠ 0, HEAD inchangé, raison nommée) quand porteurs.ts n'est pas dans le commit, y compris quand
//         porteurs.ts est indexé AILLEURS (l'index temporaire d'un commit ciblé ne le contient pas) ; (b) `git commit -- f.ts porteurs.ts`
//         passe ; (c) un commit sans rapport avec le défaut passe aussi (la garde ne bloque pas tout) ;
//   GI-8  le dépôt réel (celui qui contient ce juge, arbre HEAD) : zéro orphelin — main passe la garde ;
//   GI-9  scripts/deploiement-etat.mjs : le filtre d'erreurs de build reconnaît « error TS2307 » et « Failed to type check » (les lignes
//         du build Vercel cassé du 04/10) et pas une ligne ordinaire ; sans « error TS » il n'aurait rien affiché.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const opt = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([\w-]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? 'oui'] : ['?', a] }))
if (opt['?'] || Object.keys(opt).some((k) => !['racine', 'seulement', 'mutations'].includes(k))) { console.error('usage : node scripts/garde-imports-qa.mjs [--racine=<dépôt>] [--seulement=GI-2,GI-3] [--mutations]'); process.exit(2) }
const SEULEMENT = opt.mutations ? new Set() : opt.seulement && opt.seulement !== 'oui' ? new Set(opt.seulement.split(',').map((x) => x.trim())) : null // --mutations : aucun critère direct, seulement les copies sabotées
const veut = (id) => !SEULEMENT || SEULEMENT.has(id)
const RACINE = path.resolve(opt.racine || ICI)
const LIB = path.join(RACINE, 'scripts/lib/imports-orphelins.mjs')
const GARDE = path.join(RACINE, 'scripts/garde-commit.mjs')
const ETAT = path.join(RACINE, 'scripts/deploiement-etat.mjs')

const resultats = []
const ligne = (id, ok, detail) => { resultats.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`) }
const env = () => { const e = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 'juge', GIT_AUTHOR_EMAIL: 'juge@example.invalid', GIT_COMMITTER_NAME: 'juge', GIT_COMMITTER_EMAIL: 'juge@example.invalid' }; for (const k of Object.keys(e)) if (/^GIT_(DIR|INDEX_FILE|WORK_TREE|PREFIX|OBJECT_DIRECTORY)$/.test(k)) delete e[k]; return e }
const git = (cwd, ...args) => { const r = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=.git/hooks', ...args], { cwd, encoding: 'utf8', env: env(), windowsHide: true }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') } }
const ecrire = (dir, rel, texte) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, texte) }
const jetables = []
function depot(fichiers, { indexer = Object.keys(fichiers), commiter = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'garde-imports-qa-'))
  jetables.push(dir)
  git(dir, 'init', '-q', '-b', 'main', '.')
  for (const [rel, texte] of Object.entries(fichiers)) ecrire(dir, rel, texte)
  if (indexer.length) git(dir, 'add', '--', ...indexer)
  if (commiter && indexer.length) git(dir, 'commit', '-q', '-m', 'base', '--no-verify')
  return dir
}

// La bibliothèque sous jugement, chargée depuis <racine> ; node_modules (typescript) de <racine>, sinon du dépôt de ce juge.
let lib = null
try {
  const nm = path.join(RACINE, 'node_modules')
  if (!fs.existsSync(nm) && fs.existsSync(path.join(ICI, 'node_modules'))) fs.symlinkSync(path.join(ICI, 'node_modules'), nm, 'junction')
  lib = await import(pathToFileURL(LIB).href + `?juge=${Date.now()}`)
} catch (e) { console.log(`FAIL GI-0 — la bibliothèque ${path.relative(ICI, LIB) || LIB} ne se charge pas : ${String(e.message).split('\n')[0]}`); process.exitCode = 1 }

// Les neuf formes d'import, chacune vers un fichier cible. `cible` = le fichier visé ; `form` = ce que fait l'importeur.
const FORMES = [
  { nom: 'relatif', importeur: 'lib/imp/relatif.ts', texte: "import { a } from './cible-relatif'\nexport const x = a\n", cible: 'lib/imp/cible-relatif.ts' },
  { nom: '@/', importeur: 'lib/imp/alias.ts', texte: "import { a } from '@/lib/imp/cible-alias'\nexport const x = a\n", cible: 'lib/imp/cible-alias.ts' },
  { nom: 'x.js → x.ts', importeur: 'lib/imp/js.ts', texte: "import { a } from './cible-js.js'\nexport const x = a\n", cible: 'lib/imp/cible-js.ts' },
  { nom: 'dossier/index', importeur: 'lib/imp/dossier.ts', texte: "import { a } from './cible-dossier'\nexport const x = a\n", cible: 'lib/imp/cible-dossier/index.ts' },
  { nom: 'export … from', importeur: 'lib/imp/reexport.ts', texte: "export { a } from './cible-reexport'\n", cible: 'lib/imp/cible-reexport.ts' },
  { nom: 'import type', importeur: 'lib/imp/type.ts', texte: "import type { A } from './cible-type'\nexport type X = A\n", cible: 'lib/imp/cible-type.ts' },
  { nom: 'import()', importeur: 'lib/imp/dynamique.ts', texte: "export const charger = () => import('./cible-dynamique')\n", cible: 'lib/imp/cible-dynamique.ts' },
  { nom: 'require()', importeur: 'lib/imp/requis.js', texte: "const { a } = require('./cible-requis')\nmodule.exports = { a }\n", cible: 'lib/imp/cible-requis.js' },
  { nom: 'script .mjs', importeur: 'scripts/imp-script.mjs', texte: "import { a } from './lib/imp-cible-script.mjs'\nconsole.log(a)\n", cible: 'scripts/lib/imp-cible-script.mjs' },
]
const CONTENU_CIBLE = 'export const a = 1\n'

if (lib) {
  const resume = (r) => r.orphelins.map((o) => `${o.raison} ${o.fichier} → ${o.cible}`).join(' ; ') || 'aucun'

  // GI-1 — le témoin : tout est suivi ou indexé
  if (veut('GI-1')) {
    const f = {}
    for (const x of FORMES) { f[x.importeur] = x.texte; f[x.cible] = CONTENU_CIBLE }
    const dir = depot(f)
    const r = lib.verifierOrphelins({ racine: dir })
    ligne('GI-1', !r.erreur && r.orphelins.length === 0 && r.nbImports === FORMES.length,
      `dépôt témoin : ${FORMES.length} imports attendus, ${r.nbImports} comptés, orphelins : ${r.erreur || resume(r)}`)
  }

  // GI-2 — le défaut du 04/10
  if (veut('GI-2')) {
    const dir = depot({ 'lib/facteur.ts': "import { porteur } from './porteurs'\nexport const f = porteur\n" })
    ecrire(dir, 'lib/porteurs.ts', 'export const porteur = 1\n') // sur le disque, hors de git
    const r = lib.verifierOrphelins({ racine: dir })
    const o = r.orphelins[0]
    ligne('GI-2', r.orphelins.length === 1 && o.raison === 'HORS-GIT' && o.fichier === 'lib/facteur.ts' && o.cible === 'lib/porteurs.ts',
      `facteur.ts suivi → porteurs.ts non suivi : ${resume(r)}`)
  }

  // GI-3 — chacune des neuf formes vers un fichier non suivi
  if (veut('GI-3')) {
    const f = {}
    for (const x of FORMES) f[x.importeur] = x.texte
    const dir = depot(f)
    for (const x of FORMES) ecrire(dir, x.cible, CONTENU_CIBLE) // les cibles existent sur le disque, nulle part dans git
    const r = lib.verifierOrphelins({ racine: dir })
    const vus = new Map(r.orphelins.map((o) => [o.fichier, o]))
    const manques = FORMES.filter((x) => { const o = vus.get(x.importeur); return !o || o.raison !== 'HORS-GIT' || o.cible !== x.cible })
    ligne('GI-3', !manques.length && r.orphelins.length === FORMES.length,
      manques.length ? `formes non vues : ${manques.map((x) => x.nom).join(', ')} (${resume(r)})` : `les ${FORMES.length} formes sont vues, une fois chacune, HORS-GIT`)
  }

  // GI-4 — INTROUVABLE et CASSE
  if (veut('GI-4')) {
    const dir = depot({
      'lib/introuvable.ts': "import { z } from '@/lib/n-existe-pas'\nexport const x = z\n",
      'lib/casse.ts': "import { p } from './Porteurs'\nexport const x = p\n",
      'lib/porteurs.ts': 'export const p = 1\n',
    })
    const r = lib.verifierOrphelins({ racine: dir })
    const i = r.orphelins.find((o) => o.fichier === 'lib/introuvable.ts'), c = r.orphelins.find((o) => o.fichier === 'lib/casse.ts')
    ligne('GI-4', r.orphelins.length === 2 && i?.raison === 'INTROUVABLE' && c?.raison === 'CASSE' && c?.casse === 'lib/porteurs.ts', resume(r))
  }

  // GI-5 — suivi OU INDEXÉ
  if (veut('GI-5')) {
    const dir = depot({ 'lib/f.ts': "import { p } from './p'\nexport const x = p\n" }) // f.ts commité
    ecrire(dir, 'lib/p.ts', 'export const p = 1\n')
    git(dir, 'add', '--', 'lib/p.ts') // p.ts indexé, pas commité
    const enIndex = lib.verifierOrphelins({ racine: dir })
    const surHead = lib.verifierOrphelins({ racine: dir, arbre: 'HEAD' })
    ligne('GI-5', enIndex.orphelins.length === 0 && surHead.orphelins.length === 1 && surHead.orphelins[0].raison === 'HORS-GIT',
      `cible indexée : index ${resume(enIndex)} · HEAD ${resume(surHead)}`)
  }

  // GI-6 — le bruit écarté, le vrai vu
  if (veut('GI-6')) {
    const bruit = [
      "// import { a } from './dans-un-commentaire'",
      "/* import { b } from './dans-un-bloc' */",
      "const gabarit = `import { c } from './dans-un-gabarit'\\nexport { d } from './aussi-dans-le-gabarit'`",
      "const chaine = \"import { e } from './dans-une-chaine'\"",
      "const simple = 'require(\"./dans-un-require-de-chaine\")'",
      'export { gabarit, chaine, simple }',
      '',
    ].join('\n')
    const dir = depot({ 'scripts/juge-factice-qa.mjs': bruit })
    const r = lib.verifierOrphelins({ racine: dir })
    const vrai = depot({ 'scripts/juge-factice-qa.mjs': bruit + "import { vrai } from './dans-un-vrai-import'\nexport { vrai }\n" })
    const rv = lib.verifierOrphelins({ racine: vrai })
    ligne('GI-6', r.orphelins.length === 0 && r.nbImports === 0 && rv.orphelins.length === 1 && rv.orphelins[0].spec === './dans-un-vrai-import',
      `bruit seul : ${r.nbImports} import(s), ${resume(r)} · bruit + un vrai import absent : ${resume(rv)}`)
  }

  // GI-7 — le vrai crochet git
  if (veut('GI-7')) {
    const dir = depot({
      'lib/ai.ts': "const METIER_GUIDES = [\n  {\n    guide: 'texte sans montant',\n  },\n]\n", // ce que garde-commit.mjs exige de lib/ai.ts
      'lib/autre.ts': 'export const autre = 1\n',
    })
    fs.mkdirSync(path.join(dir, '.git/hooks'), { recursive: true })
    fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), `#!/bin/sh\nnode ${JSON.stringify(GARDE.replace(/\\/g, '/'))}\n`, { mode: 0o755 })
    const tete = () => git(dir, 'rev-parse', 'HEAD').out.trim()
    const avant = tete()
    // (a) f.ts importe ./porteurs ; porteurs.ts est INDEXÉ mais pas dans les chemins du commit ciblé
    ecrire(dir, 'lib/f.ts', "import { porteur } from './porteurs'\nexport const f = porteur\n")
    ecrire(dir, 'lib/porteurs.ts', 'export const porteur = 1\n')
    git(dir, 'add', '--', 'lib/f.ts', 'lib/porteurs.ts')
    const a = git(dir, 'commit', '-q', '-m', 'f seul', '--', 'lib/f.ts')
    const refuse = a.code !== 0 && tete() === avant && /porteurs/.test(a.out) && /HORS-GIT|PAS dans git/.test(a.out)
    // (b) les deux fichiers ensemble : le commit passe
    const b = git(dir, 'commit', '-q', '-m', 'f et porteurs', '--', 'lib/f.ts', 'lib/porteurs.ts')
    const passe = b.code === 0 && tete() !== avant
    // (c) un commit sans rapport (un fichier sans import) passe : la garde ne bloque pas tout
    const apres = tete()
    ecrire(dir, 'lib/autre.ts', 'export const autre = 2\n')
    git(dir, 'add', '--', 'lib/autre.ts')
    const c = git(dir, 'commit', '-q', '-m', 'sans rapport', '--', 'lib/autre.ts')
    const libre = c.code === 0 && tete() !== apres
    ligne('GI-7', refuse && passe && libre,
      `(a) f.ts seul, porteurs.ts indexé ailleurs : ${refuse ? 'refusé, HEAD inchangé' : `NON refusé (code ${a.code}) ${a.out.split('\n').slice(0, 3).join(' | ')}`} · (b) f.ts + porteurs.ts : ${passe ? 'passe' : `refusé (${b.out.split('\n').slice(0, 3).join(' | ')})`} · (c) sans rapport : ${libre ? 'passe' : `refusé (${c.out.split('\n').slice(0, 3).join(' | ')})`}`)
  }

  // GI-8 — le dépôt réel, arbre HEAD
  if (veut('GI-8')) {
    const r = lib.verifierOrphelins({ racine: ICI, arbre: 'HEAD' }) // le dépôt qui contient ce juge (la garde, elle, vient de <racine>)
    ligne('GI-8', !r.erreur && r.orphelins.length === 0 && r.nbFichiers > 100,
      r.erreur ? `lecture impossible : ${r.erreur}` : `${r.nbFichiers} fichiers de code et ${r.nbImports} imports lus sur HEAD ; orphelins : ${resume(r)}`)
  }
}

// GI-9 — le filtre d'erreurs de build de deploiement-etat.mjs
if (veut('GI-9')) {
  let ok = false, detail = ''
  try {
    const src = fs.readFileSync(ETAT, 'utf8')
    const m = src.match(/const ERREUR_DE_BUILD = \/(.+)\/([a-z]*)\r?\n/)
    if (!m) detail = 'ERREUR_DE_BUILD introuvable dans le script'
    else {
      const re = new RegExp(m[1], m[2])
      const reelles = [
        "lib/agents/acquisition/facteur.ts(31,30): error TS2307: Cannot find module './porteurs' or its corresponding type declarations.",
        "lib/agents/acquisition/porteurs/gmail.ts(122,86): error TS7006: Parameter 'r' implicitly has an 'any' type.",
        'Failed to type check.',
      ]
      const ordinaires = ['Running TypeScript ...', 'Creating an optimized production build ...', 'Collecting page data using 1 worker']
      const sansTS = new RegExp(m[1].replace('|error TS\\d+', '').replace('|Failed to type check', ''), m[2])
      const toutesVues = reelles.every((l) => re.test(l)), aucuneOrdinaire = !ordinaires.some((l) => re.test(l))
      const ancienAveugle = !sansTS.test(reelles[0]) // le filtre d'avant (sans « error TS ») ne voyait pas la ligne du build cassé
      ok = toutesVues && aucuneOrdinaire && ancienAveugle
      detail = `lignes du build cassé reconnues : ${toutesVues} · lignes ordinaires écartées : ${aucuneOrdinaire} · l'ancien filtre aurait été muet : ${ancienAveugle}`
    }
  } catch (e) { detail = `script illisible : ${e.message}` }
  ligne('GI-9', ok, detail)
}

// --mutations — la preuve que ce juge est sensible : la garde sabotée doit le faire rougir sur les critères attendus.
if (opt.mutations) {
  const FICHIERS = ['scripts/lib/imports-orphelins.mjs', 'scripts/garde-commit.mjs', 'scripts/deploiement-etat.mjs']
  const SI_ELLE_NE_VOIT_RIEN = 'if (liste.some((c) => suivis.has(c))) continue'
  const MUTATIONS = [
    { id: 'M1', nom: 'la garde ne voit plus aucun orphelin', fichier: FICHIERS[0], de: SI_ELLE_NE_VOIT_RIEN, vers: 'if (true) continue', attendus: ['GI-2', 'GI-3', 'GI-4', 'GI-5', 'GI-6', 'GI-7'] },
    { id: 'M2', nom: 'le disque tient lieu de git (le défaut du 04/10)', fichier: FICHIERS[0], de: SI_ELLE_NE_VOIT_RIEN, vers: 'if (liste.some((c) => suivis.has(c) || surDisque(c))) continue', attendus: ['GI-2', 'GI-3', 'GI-5', 'GI-7'] },
    { id: 'M3', nom: 'le crochet est débranché (garde-commit n’appelle plus la garde)', fichier: FICHIERS[1], de: 'let ko = guidesSansMontant() + pagesSansSuspense() + importsOrphelins()', vers: 'let ko = guidesSansMontant() + pagesSansSuspense()', attendus: ['GI-7'] },
    { id: 'M4', nom: 'les imports « @/ » sont ignorés', fichier: FICHIERS[0], de: "s.startsWith('@/') || s.startsWith('./')", vers: "s.startsWith('./')", attendus: ['GI-1', 'GI-3'] },
    { id: 'M5', nom: 'les chaînes et gabarits comptent comme des imports (regex au lieu du scanner)', fichier: FICHIERS[0], de: 'ts.preProcessFile(String(texte), true, true).importedFiles.map((f) => f.fileName)', vers: String.raw`[...String(texte).matchAll(/from\s+['"]([^'"\n]+)['"]/g)].map((m) => m[1])`, attendus: ['GI-1', 'GI-3', 'GI-6'] },
    { id: 'M6', nom: 'tous les scripts/ sont exemptés', fichier: FICHIERS[0], de: String.raw`const FIXTURE_TEMOIN = /^scripts\/fixtures\/(?:.*\/)?(?:temoins?\/|temoin-[^/]*$)/`, vers: String.raw`const FIXTURE_TEMOIN = /^scripts\//`, attendus: ['GI-1', 'GI-3', 'GI-6'] },
    { id: 'M7', nom: 'la casse n’est plus nommée', fichier: FICHIERS[0], de: "raison: cibleCasse ? 'CASSE' : horsGit ? 'HORS-GIT' : 'INTROUVABLE'", vers: "raison: horsGit ? 'HORS-GIT' : 'INTROUVABLE'", attendus: ['GI-4'] },
    { id: 'M8', nom: 'deploiement-etat sans « error TS » ni « Failed to type check »', fichier: FICHIERS[2], de: String.raw`error TS\d+|Failed to type check|`, vers: '', attendus: ['GI-9'] },
  ]
  const lancerSur = (tmp, criteres) => {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--racine=${tmp}`, `--seulement=${criteres.join(',')}`], { encoding: 'utf8', env: env(), windowsHide: true, maxBuffer: 1 << 26 })
    const etats = Object.fromEntries([...(r.stdout || '').matchAll(/^(PASS|FAIL) (GI-\d+) /gm)].map((m) => [m[2], m[1]]))
    return { code: r.status, etats, sortie: (r.stdout || '') + (r.stderr || '') }
  }
  const copie = () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'garde-imports-mut-'))
    jetables.push(tmp)
    for (const f of FICHIERS) { const d = path.join(tmp, f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, fs.readFileSync(path.join(RACINE, f), 'utf8').replace(/\r\n/g, '\n')) }
    return tmp
  }
  // M0 : la copie intacte rend vert sur tous les critères en jeu (sans quoi une « mutation prise » ne prouverait rien)
  const tous = [...new Set(MUTATIONS.flatMap((m) => m.attendus))].sort()
  const t0 = lancerSur(copie(), tous)
  ligne('M0', t0.code === 0 && tous.every((c) => t0.etats[c] === 'PASS'), `copie intacte, critères ${tous.join(' ')} : ${tous.map((c) => `${c} ${t0.etats[c] || '?'}`).join(', ')}`)
  for (const m of MUTATIONS) {
    const tmp = copie()
    const cible = path.join(tmp, m.fichier)
    const src = fs.readFileSync(cible, 'utf8')
    if (src.split(m.de).length !== 2) { ligne(m.id, false, `mutation inapplicable (${m.nom}) : le texte à saboter n'est pas là exactement une fois — la garde a changé, mettre la mutation à jour`); continue }
    fs.writeFileSync(cible, src.replace(m.de, () => m.vers))
    const r = lancerSur(tmp, m.attendus)
    const prises = m.attendus.filter((c) => r.etats[c] === 'FAIL')
    ligne(m.id, r.code === 1 && prises.length === m.attendus.length, `${m.nom} : le juge rougit sur ${prises.join(' ') || 'rien'} (attendu ${m.attendus.join(' ')})`)
  }
}

for (const d of jetables) { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }) } catch { /* le dossier jetable reste dans le dossier temporaire */ } }
const tout = resultats.length > 0 && resultats.every(Boolean) && lib
console.log(`\ngarde-imports-qa : ${tout ? 'PASS' : 'FAIL'}`)
if (!tout) process.exitCode = 1
