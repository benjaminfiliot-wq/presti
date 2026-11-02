// Tâche 032-033 : rejoue les cinq juges sur une RACINE FACTICE (/tmp/racine-032-033) où chaque export porte, en plus de ses réglages
// en ligne, `errorWorkflow: 'AQeHiC58UgbMR4Kr'` (presti-erreurs) — l'état attendu une fois le workflow d'erreur désigné. Les exports
// du dépôt ne sont pas touchés. Sert à prouver, avant le geste de Benj, que les juges modifiés sont verts sur l'état visé et que
// leurs mutants rougissent. Lancement : node .orchestre/preuves/032-033/rejeu-avec-errorworkflow.mjs
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
const DEPOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const R = '/tmp/racine-032-033'
const ID = 'AQeHiC58UgbMR4Kr'
fs.rmSync(R, { recursive: true, force: true })
fs.mkdirSync(path.join(R, 'scripts'), { recursive: true })
for (const f of ['suivi-artisan-qa.mjs', 'briefing-n8n-qa.mjs', 'detecteurs-n8n-qa.mjs', 'sauvegarde-n8n-qa.mjs', 'demandes-demo-qa.mjs', 'ts-loader.mjs', 'sql-nu.mjs'])
  fs.copyFileSync(path.join(DEPOT, 'scripts', f), path.join(R, 'scripts', f))
for (const d of ['lib', 'plans', 'supabase', 'node_modules', 'app', 'components', 'docs']) if (fs.existsSync(path.join(DEPOT, d))) fs.symlinkSync(path.join(DEPOT, d), path.join(R, d))
for (const f of ['package.json', 'tsconfig.json']) fs.copyFileSync(path.join(DEPOT, f), path.join(R, f))
const PREUVES = path.join(DEPOT, '.orchestre/preuves')
fs.mkdirSync(path.join(R, '.orchestre/preuves'), { recursive: true })
const COPIES = ['032-014', '032-013', '032-019', '032-023', '032-026']
for (const d of fs.readdirSync(PREUVES)) {
  if (COPIES.includes(d)) fs.cpSync(path.join(PREUVES, d), path.join(R, '.orchestre/preuves', d), { recursive: true })
  else fs.symlinkSync(path.join(PREUVES, d), path.join(R, '.orchestre/preuves', d))
}
const EXPORTS = ['032-014/presti-suivi-artisan.workflow.json', '032-013/presti-briefing-matin.workflow.json', '032-019/presti-detecteurs.workflow.json',
  '032-023/presti-sauvegarde.workflow.json', '032-023/presti-garde-sauvegarde.workflow.json', '032-026/presti-demande-demo.workflow.json']
for (const e of EXPORTS) {
  const f = path.join(R, '.orchestre/preuves', e)
  const j = JSON.parse(fs.readFileSync(f, 'utf8'))
  j.settings = { ...j.settings, errorWorkflow: ID }
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n')
}
const TS = ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs']
const JUGES = [['suivi-artisan-qa.mjs', TS], ['briefing-n8n-qa.mjs', TS], ['detecteurs-n8n-qa.mjs', TS], ['sauvegarde-n8n-qa.mjs', []], ['demandes-demo-qa.mjs', TS]]
let ko = 0
for (const [j, opts] of JUGES) {
  const t0 = Date.now()
  const r = spawnSync(process.execPath, [...opts, 'scripts/' + j], { cwd: R, encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, QA_RAISONS: '1' } })
  const sortie = (r.stdout + '\n' + r.stderr)
  fs.writeFileSync(path.join(DEPOT, '.orchestre/preuves/032-033', 'rejeu-' + j.replace('.mjs', '.log')), sortie)
  const lignes032 = sortie.split('\n').filter((l) => /032-033|errorWorkflow|saveData|workflow d.erreur|succès gardés|échecs non gardés|réglage neuf/.test(l)).map((l) => '    ' + l.trim().slice(0, 200))
  console.log(`${j} (racine factice, errorWorkflow posé) : code ${r.status}, ${Math.round((Date.now() - t0) / 1000)} s`)
  for (const l of lignes032) console.log(l)
  console.log('    dernière ligne : ' + sortie.trim().split('\n').pop().slice(0, 200))
  if (r.status !== 0) ko++
}
process.exit(ko ? 1 : 0)
