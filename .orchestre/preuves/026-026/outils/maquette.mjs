// .orchestre/preuves/026-026/outils/maquette.mjs — la maquette témoin des juges du lot D (fiche 026-026), écrite par
// Claude Code le 27/09. Jamais livrée : elle vit sous .orchestre/travail/026-026-maquette/.
//
//   construireMaquette({ neuve }) → { dossier, base, fichiers }
//
// 1. une copie de l'arbre courant (app, lib, supabase, middleware.ts ou proxy.ts, package.json, tsconfig.json,
//    next.config.mjs, le contrat scripts/fixtures/026-horloge-bus/contrat-ops.json) ;
// 2. les préalables des fiches jugées, posés comme s'ils étaient déjà livrés (scripts/fixtures/026-livraison-tresor/d/
//    temoin-base/ : le tic de 026-049, lib/agents/usineLimites.json de 026-056, erreursFabrication de 026-030) ;
// 3. un dépôt git à la racine de la maquette, un commit « base » : c'est l'historique où les juges lisent « la version
//    d'avant la fiche » (commun-d.mjs baseAvantD) ;
// 4. par-dessus, sans commit, les implémentations témoins des quatre fiches jugées (d/temoin/ : 026-028, 026-031, 026-078,
//    026-141). Un fichier « X.temoin » devient X ; un fichier « X.ajout.temoin » est ajouté à la fin de X.
// Une maquette existante est remise à la base (git checkout, git clean dans SON dépôt) puis recouverte, sauf `neuve`.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const R = path.resolve(ICI, '..', '..', '..', '..')
export const MAQUETTE = path.join(R, '.orchestre', 'travail', '026-026-maquette')
const D = path.join(R, 'scripts', 'fixtures', '026-livraison-tresor', 'd')

function git(args, cwd = MAQUETTE) {
  const r = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.name=maquette-026-026', '-c', 'user.email=maquette@presti-test.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} (${cwd}) : ${(r.stderr || r.stdout).slice(0, 300)}`)
  return r.stdout
}
function recouvrir(source) {
  const poses = []
  const rec = (rel) => {
    for (const e of fs.readdirSync(path.join(source, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) { rec(r); continue }
      const contenu = fs.readFileSync(path.join(source, r))
      if (r.endsWith('.ajout.temoin')) {
        const cible = path.join(MAQUETTE, r.slice(0, -'.ajout.temoin'.length))
        fs.appendFileSync(cible, contenu)
        poses.push(`${r.slice(0, -'.ajout.temoin'.length)} (ajout)`)
      } else {
        const nom = r.endsWith('.temoin') ? r.slice(0, -'.temoin'.length) : r
        fs.mkdirSync(path.dirname(path.join(MAQUETTE, nom)), { recursive: true })
        fs.writeFileSync(path.join(MAQUETTE, nom), contenu)
        poses.push(nom)
      }
    }
  }
  rec('')
  return poses
}

export function construireMaquette({ neuve = false } = {}) {
  if (!MAQUETTE.startsWith(path.join(R, '.orchestre', 'travail'))) throw new Error('maquette hors de .orchestre/travail')
  const existe = fs.existsSync(path.join(MAQUETTE, '.git'))
  let base
  if (!existe || neuve) {
    fs.rmSync(MAQUETTE, { recursive: true, force: true })
    fs.mkdirSync(MAQUETTE, { recursive: true })
    for (const d of ['app', 'lib', 'supabase']) fs.cpSync(path.join(R, d), path.join(MAQUETTE, d), { recursive: true })
    for (const f of ['middleware.ts', 'proxy.ts', 'package.json', 'tsconfig.json', 'next.config.mjs', 'next.config.ts']) if (fs.existsSync(path.join(R, f))) fs.copyFileSync(path.join(R, f), path.join(MAQUETTE, f))
    const contrat = 'scripts/fixtures/026-horloge-bus/contrat-ops.json'
    fs.mkdirSync(path.dirname(path.join(MAQUETTE, contrat)), { recursive: true })
    fs.copyFileSync(path.join(R, contrat), path.join(MAQUETTE, contrat))
    const prealables = recouvrir(path.join(D, 'temoin-base'))
    fs.writeFileSync(path.join(MAQUETTE, '.gitignore'), 'node_modules\n*.tsbuildinfo\n')
    git(['init', '-q'])
    git(['add', '-A'])
    git(['commit', '-q', '-m', `base de la maquette 026-026 : arbre courant + préalables (${prealables.join(', ')})`])
  } else {
    git(['checkout', '-q', '--', '.'])
    git(['clean', '-q', '-fd'])
  }
  base = git(['rev-parse', 'HEAD']).trim()
  const fichiers = recouvrir(path.join(D, 'temoin'))
  return { dossier: MAQUETTE, base, fichiers }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = construireMaquette({ neuve: process.argv.includes('--neuve') })
  console.log(`maquette ${path.relative(R, m.dossier)} : base ${m.base.slice(0, 7)} ; témoins posés : ${m.fichiers.join(', ')}`)
}
