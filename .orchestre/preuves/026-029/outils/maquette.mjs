// .orchestre/preuves/026-029/outils/maquette.mjs — la maquette du dépôt où les juges du lot C (fiche 026-029) sont prouvés
// VERTS sur une implémentation témoin réelle, puis ROUGES sur un sabotage par critère (Claude Code).
//
//   node .orchestre/preuves/026-029/outils/maquette.mjs            (construit, puis affiche le dossier)
//   import { construireMaquette, MAQUETTE } from './maquette.mjs'
//
// La maquette est un dépôt git À PART, sous .orchestre/travail/026-029-maquette/ (jamais versionné) :
//   1. copie de l'arbre courant (app, lib, scripts, supabase, public, maquettes, .github, configuration), node_modules en
//      jonction vers celui du dépôt ;
//   2. les fiches AMONT posées en témoin, puis committées comme « base » (c'est le HEAD de la maquette) : erreursFabrication
//      (026-030) ajoutée à lib/siteCommande.ts, lib/siteLivraison.ts de 026-024, un modèle de métier complet pour le menuisier
//      (maquettes/modeles/menuisier/contenu.json ← c/modele-menuisier.json), et .orchestre/verdicts.jsonl + fait/ qui
//      déclarent PASS les fiches amont (025-02, 025-03, 025-09, 025-11, 026-024, 026-030) ;
//   3. les quatre fiches JUGÉES posées en témoin dans l'arbre de travail, non committées, comme le laisserait un exécutant :
//      scripts/commande-exporter.mjs (026-033), lib/siteRedacteur.ts et scripts/commande-rediger.mjs (026-093),
//      scripts/livrer-site.mjs (026-100), .github/workflows/generer-site.yml, lib/siteGenerationDistante.ts et
//      lib/siteLivraison.ts avec demanderGeneration (026-106).
// Les témoins viennent de scripts/fixtures/026-livraison-tresor/c/temoin/ (les .ts y portent l'extension .ts.temoin pour que
// ni tsc ni Next ne les compilent dans le vrai dépôt).
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
export const MAQUETTE = path.join(R, '.orchestre', 'travail', '026-029-maquette')
export const TEMOIN = path.join(R, 'scripts', 'fixtures', '026-livraison-tresor', 'c', 'temoin')
const COPIES = ['app', 'lib', 'scripts', 'supabase', 'public', 'maquettes', '.github', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.mjs', 'next.config.ts', 'middleware.ts', 'next-env.d.ts', '.gitignore', 'vercel.json']
export const JUGEES = {
  'scripts/commande-exporter.mjs': 'scripts/commande-exporter.mjs',
  'scripts/commande-rediger.mjs': 'scripts/commande-rediger.mjs',
  'lib/siteRedacteur.ts': 'lib/siteRedacteur.ts.temoin',
  'scripts/livrer-site.mjs': 'scripts/livrer-site.mjs',
  '.github/workflows/generer-site.yml': '.github/workflows/generer-site.yml',
  'lib/siteGenerationDistante.ts': 'lib/siteGenerationDistante.ts.temoin',
  'lib/siteLivraison.ts': 'lib/siteLivraison.ts.temoin',
}
const AMONT_PASS = ['025-02', '025-03', '025-09', '025-11', '026-024', '026-030']

const git = (args, cwd = MAQUETTE) => {
  const r = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.name=maquette 026-029', '-c', 'user.email=maquette@presti-test.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 256 << 20 })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${(r.stderr || r.stdout).slice(0, 400)}`)
  return r.stdout
}

/** Remet un fichier jugé à sa version témoin (après un sabotage). */
export function poserJugee(rel) {
  if (!fs.existsSync(path.join(TEMOIN, JUGEES[rel]))) { console.log(`  (témoin absent : ${JUGEES[rel]})`); return }
  const dest = path.join(MAQUETTE, rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(path.join(TEMOIN, JUGEES[rel]), dest)
}

export function construireMaquette({ silencieux = false } = {}) {
  const t0 = Date.now()
  const dire = (m) => { if (!silencieux) console.log(m) }
  fs.rmSync(MAQUETTE, { recursive: true, force: true })
  fs.mkdirSync(MAQUETTE, { recursive: true })
  for (const c of COPIES) {
    const src = path.join(R, c)
    if (!fs.existsSync(src)) continue
    fs.cpSync(src, path.join(MAQUETTE, c), { recursive: true, filter: (s) => !/[\\/](node_modules|\.next|\.next-prod)([\\/]|$)/.test(path.relative(R, s)) })
  }
  fs.symlinkSync(path.join(R, 'node_modules'), path.join(MAQUETTE, 'node_modules'), 'junction')
  // Les fiches jugées ne doivent pas exister dans la base (elles n'existent pas dans le dépôt : on s'en assure).
  for (const rel of Object.keys(JUGEES)) fs.rmSync(path.join(MAQUETTE, rel), { force: true })
  // Les fiches amont, en témoin.
  fs.appendFileSync(path.join(MAQUETTE, 'lib', 'siteCommande.ts'), fs.readFileSync(path.join(TEMOIN, 'lib', 'siteCommande.erreursFabrication.ts.temoin')))
  if (fs.existsSync(path.join(TEMOIN, 'lib', 'siteLivraison.base.ts.temoin'))) fs.copyFileSync(path.join(TEMOIN, 'lib', 'siteLivraison.base.ts.temoin'), path.join(MAQUETTE, 'lib', 'siteLivraison.ts'))
  fs.copyFileSync(path.join(R, 'scripts', 'fixtures', '026-livraison-tresor', 'c', 'modele-menuisier.json'), path.join(MAQUETTE, 'maquettes', 'modeles', 'menuisier', 'contenu.json'))
  const orch = path.join(MAQUETTE, '.orchestre')
  fs.mkdirSync(path.join(orch, 'fait'), { recursive: true })
  fs.writeFileSync(path.join(orch, 'verdicts.jsonl'), AMONT_PASS.map((id) => JSON.stringify({ id, verdict: 'PASS', ligne: '', code: 0, date: '2026-09-27T00:00:00Z', agent: 'maquette 026-029' })).join('\n') + '\n')
  for (const id of AMONT_PASS) fs.writeFileSync(path.join(orch, 'fait', `${id}.md`), `---\nid: ${id}\n---\n\nFiche amont déclarée PASS dans la maquette de 026-029 (témoin).\n`)
  git(['init', '-q', '-b', 'maquette'])
  git(['add', '-A'])
  git(['commit', '-q', '-m', 'base de la maquette 026-029 : arbre courant + fiches amont en témoin'])
  // Les fiches jugées, en témoin, non committées.
  for (const rel of Object.keys(JUGEES)) poserJugee(rel)
  dire(`✓ maquette ${path.relative(R, MAQUETTE)} en ${((Date.now() - t0) / 1000).toFixed(0)} s (HEAD ${git(['rev-parse', '--short', 'HEAD']).trim()})`)
  return MAQUETTE
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) construireMaquette()
