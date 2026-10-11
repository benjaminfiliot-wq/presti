#!/usr/bin/env node
// 026-249 — contre-vérification du 04/10 : quatre sabotages réversibles du code de production du Vigile, jugés par
// scripts/vigile-qa.mjs. Chaque sabotage se fait sur une COPIE de la production (lib/, la route, le script, les deux unités,
// vigile.md et vigile.json), construite comme construireTemoin du juge ; le fichier est ensuite RESTAURÉ octet pour octet
// depuis la production et son sha256 est contrôlé, puis la même partie est rejouée (elle doit repasser au vert). Aucun
// fichier du dépôt n'est modifié : les sha256 des huit fichiers de la fiche sont relevés au départ et à la fin.
//   node .orchestre/preuves/026-249/contre-verif-04-10.mjs   → écrit contre-verif-04-10.md à côté.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..', '..', '..')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'contre-verif-026-249')
const COPIE = path.join(TRAVAIL, 'prod')
const FICHIERS = [
  'lib/vigile/releve.ts', 'lib/vigile/serveur.ts', 'lib/vigile/sources.ts', 'app/api/agents/vigile/route.ts', 'scripts/vigile/releve.mjs',
  'scripts/usine/systemd/presti-vigile.service', 'scripts/usine/systemd/presti-vigile.timer', 'lib/pilotage/salles/securite.ts',
]
const SABOTAGES = [
  { n: 1, critere: 'VG-12', partie: 'pause', fichier: 'lib/vigile/releve.ts', nom: 'Matt (chef) retiré de la liste en dur des cibles interdites',
    chercher: "Object.freeze(['chef', 'pont', 'pont_telegram'", remplacer: "Object.freeze(['pont', 'pont_telegram'" },
  { n: 2, critere: 'VG-6', partie: 'usine', fichier: 'scripts/vigile/releve.mjs', nom: 'le jeton du Vigile transmis à npm (environnement complet au lieu de PATH, HOME, LANG)',
    chercher: 'ARGS_NPM, { cwd: o.depot, env: envReduit(env),', remplacer: 'ARGS_NPM, { cwd: o.depot, env,' },
  { n: 3, critere: 'VG-3', partie: 'serveur', fichier: 'app/api/agents/vigile/route.ts', nom: 'la route ouverte à tout agent (le refus hors_perimetre supprimé)',
    chercher: "if (agent.nom !== 'vigile')", remplacer: 'if (false)' },
  { n: 4, critere: 'VG-4', partie: 'serveur', fichier: 'lib/vigile/sources.ts', nom: "une requête recopiée sur ip_bans dans sources.ts au lieu de la lecture bans() du Poste",
    chercher: 'bans: () => bans(),', remplacer: "bans: async () => (await supabaseAdmin.from('ip_bans').select('ip, raison, auto, created_at, expires_le').limit(200)).data," },
]
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const abrege = (s, n = 150) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const posix = (p) => p.split(path.sep).join('/')

function construire() {
  fs.rmSync(COPIE, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  fs.mkdirSync(COPIE, { recursive: true })
  fs.cpSync(path.join(DEPOT, 'lib'), path.join(COPIE, 'lib'), { recursive: true })
  for (const f of FICHIERS) { if (f.startsWith('lib/')) continue; fs.mkdirSync(path.dirname(path.join(COPIE, f)), { recursive: true }); fs.copyFileSync(path.join(DEPOT, f), path.join(COPIE, f)) }
  fs.mkdirSync(path.join(COPIE, 'docs', 'agents'), { recursive: true })
  for (const f of ['vigile.md', 'vigile.json']) fs.copyFileSync(path.join(DEPOT, 'docs', 'agents', f), path.join(COPIE, 'docs', 'agents', f))
}
function juger(partie) {
  const t = Date.now()
  const r = spawnSync(process.execPath, ['scripts/vigile-qa.mjs', `--racine=${COPIE}`, `--partie=${partie}`], { cwd: DEPOT, encoding: 'utf8', timeout: 20 * 60_000, maxBuffer: 1 << 26, windowsHide: true })
  const sortie = `${r.stdout || ''}${r.stderr || ''}`
  const lignes = sortie.split(/\r?\n/).filter((l) => /^(PASS|FAIL)\s+VG-\d+/.test(l))
  const par = Object.fromEntries(lignes.map((l) => { const m = /^(PASS|FAIL)\s+(VG-\d+)\s+—\s*(.*)$/.exec(l); return [m[2], { ok: m[1] === 'PASS', ligne: m[3] }] }))
  return { code: r.status, par, secondes: Math.round((Date.now() - t) / 1000), brut: sortie }
}

fs.mkdirSync(TRAVAIL, { recursive: true })
const avant = Object.fromEntries(FICHIERS.map((f) => [f, sha(path.join(DEPOT, f))]))
const resultats = []
for (const s of SABOTAGES) {
  construire()
  const cible = path.join(COPIE, s.fichier)
  const original = fs.readFileSync(path.join(DEPOT, s.fichier), 'utf8')
  const n = original.split(s.chercher).length - 1
  if (n !== 1) { console.error(`✗ sabotage ${s.n} : « ${abrege(s.chercher, 60)} » paraît ${n} fois dans ${s.fichier}`); process.exitCode = 2; break }
  fs.writeFileSync(cible, original.replace(s.chercher, () => s.remplacer))
  const shaSabote = sha(cible)
  const rouge = juger(s.partie)
  // restauration octet pour octet depuis la production, puis contrôle du sha256
  fs.copyFileSync(path.join(DEPOT, s.fichier), cible)
  const shaRestaure = sha(cible)
  const vert = juger(s.partie)
  resultats.push({ s, shaSabote, shaRestaure, shaProd: avant[s.fichier], rouge, vert })
  console.log(`sabotage ${s.n} (${s.critere}) : ${rouge.par[s.critere]?.ok === false ? 'rouge' : 'VERT'} · restauré ${shaRestaure === avant[s.fichier] ? 'sha256 identique' : 'SHA DIFFÉRENT'} · rejoué ${vert.code === 0 ? 'vert' : 'ROUGE'}`)
}
const apres = Object.fromEntries(FICHIERS.map((f) => [f, sha(path.join(DEPOT, f))]))
const intact = FICHIERS.every((f) => avant[f] === apres[f])

const lignesMd = []
lignesMd.push('# 026-249 — contre-vérification du 04/10 (le Vigile)', '')
lignesMd.push(`Quatre sabotages **réversibles** du code de production, jugés par \`scripts/vigile-qa.mjs --racine=<copie> --partie=<partie du critère>\`. Méthode : une copie de la production est construite comme \`construireTemoin\` du juge (\`lib/\`, la route, le script, les deux unités, \`vigile.md\`, \`vigile.json\`) ; le fichier visé est modifié dans la copie, jugé, **restauré octet pour octet depuis la production** (sha256 contrôlé), puis la même partie est rejouée. Les fichiers du dépôt ne sont jamais ouverts en écriture : les sha256 des ${FICHIERS.length} fichiers de la fiche sont relevés au départ et à la fin.`, '')
lignesMd.push('| n | critère visé | partie | fichier | sabotage | sabotage jugé | autres critères rouges | restauré (sha256) | partie rejouée |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const r of resultats) {
  const v = r.rouge.par[r.s.critere]
  const autres = Object.entries(r.rouge.par).filter(([id, x]) => !x.ok && id !== r.s.critere).map(([id]) => id).join(', ') || 'aucun'
  lignesMd.push(`| ${r.s.n} | ${r.s.critere} | ${r.s.partie} | \`${r.s.fichier}\` | ${r.s.nom} | ${v?.ok === false ? '**rouge**' : '**VERT (écart)**'} : ${abrege(v?.ligne ?? '(critère non rendu)', 120).replace(/\|/g, '/')} | ${autres} | ${r.shaRestaure === r.shaProd ? 'identique' : '**DIFFÉRENT**'} | ${r.vert.code === 0 ? 'verte' : '**rouge**'} (${r.vert.secondes} s) |`)
}
lignesMd.push('', '## sha256 (production = copie restaurée)', '')
lignesMd.push('| fichier | sha256 de la production, au départ | à la fin |', '| --- | --- | --- |')
for (const f of FICHIERS) lignesMd.push(`| \`${f}\` | \`${avant[f]}\` | ${avant[f] === apres[f] ? 'identique' : '**DIFFÉRENT**'} |`)
lignesMd.push('', '## Sabotages (texte exact)', '')
for (const r of resultats) lignesMd.push(`${r.s.n}. \`${r.s.fichier}\` : \`${r.s.chercher}\` → \`${r.s.remplacer}\` (sha256 du fichier saboté dans la copie : \`${r.shaSabote.slice(0, 16)}…\`)`)
const tous = resultats.length === SABOTAGES.length && resultats.every((r) => r.rouge.par[r.s.critere]?.ok === false && r.shaRestaure === r.shaProd && r.vert.code === 0) && intact
lignesMd.push('', `**Verdict : ${tous ? 'les quatre sabotages sont pris (chacun rougit son critère), les quatre restaurations sont identiques au sha256, les quatre parties rejouées sont vertes, rien du dépôt n\'a bougé.' : 'ÉCART — voir le tableau.'}**`, '')
fs.writeFileSync(path.join(ICI, 'contre-verif-04-10.md'), lignesMd.join('\n'))
fs.writeFileSync(path.join(ICI, 'contre-verif-04-10-brut.txt'), resultats.map((r) => `### sabotage ${r.s.n} (${r.s.critere}, partie ${r.s.partie}) — code ${r.rouge.code}\n${r.rouge.brut}\n### rejoué après restauration — code ${r.vert.code}\n${r.vert.brut}`).join('\n\n'))
fs.rmSync(TRAVAIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
console.log(tous ? '✓ contre-vérification : 4/4' : '✗ contre-vérification : écart')
process.exitCode = tous ? 0 : 1
