#!/usr/bin/env node
// reprise-cloud/outils/etat.mjs — l'état de la série 026 CALCULÉ depuis .orchestre/ (jamais un nombre recopié dans une doc).
// Usage (depuis la racine du dépôt) : node reprise-cloud/outils/etat.mjs [--pretes] [--json]
//   sans option : les comptes par dossier + le total de l'INDEX + le nombre de fiches prêtes par exécutant
//   --pretes    : la liste des fiches PRÊTES réservées à Claude (claude-code, ni juge « elle-même », ni migration), les plus bloquantes d'abord ; --pretes --tout : toutes les prêtes, quel que soit l'exécutant (Codex/Antigravity : seulement avec l'accord de Benj)
// Ce que voit une session cloud, c'est le dépôt tel qu'il est sur origin/main : le disque du PC (fiches faites mais pas encore poussées,
// commits du moteur en avance) peut avoir quelques fiches de plus. Le PC est la référence ; ici on lit ce qui est poussé.
import fs from 'node:fs'
import path from 'node:path'

const RACINE = process.cwd()
const O = path.join(RACINE, '.orchestre')
const ids = (d) => (fs.existsSync(path.join(O, d)) ? fs.readdirSync(path.join(O, d)).filter((f) => /^\d{3}-\d{2,3}\.md$/.test(f)).map((f) => f.slice(0, -3)) : [])
const fait = new Set(ids('fait')), file = new Set(ids('file')), encours = new Set(ids('en-cours')), refuse = new Set(ids('refuse'))
const indexPath = path.join(O, 'brouillons-ecosysteme', '026', 'INDEX.md')
if (!fs.existsSync(indexPath)) { console.error('✗ INDEX introuvable : lance ce script depuis la racine du dépôt presti.'); process.exit(2) }

// Les lignes du tableau des fiches ont 7 colonnes ; la table « Correspondance » de fin d'INDEX (ancien id → nouveau) n'en a que 2.
const lignes = fs.readFileSync(indexPath, 'utf8').split('\n').filter((l) => /^\|\s*026-\d{3}\s*\|/.test(l) && l.split('|').length >= 7)
const fiches = lignes.map((l) => {
  const c = l.split('|').slice(1, -1).map((x) => x.trim())
  return { id: c[0], objet: c[1] || '', exec: (c[2] || '').replace(/`/g, ''), juge: c[3] || '', dep: (c[4] || '').match(/\d{3}-\d{2,3}/g) || [] }
})
const etat = (f) => (fait.has(f.id) ? 'fait' : encours.has(f.id) ? 'en-cours' : refuse.has(f.id) ? 'refuse' : file.has(f.id) ? 'file' : 'a-deposer')
const depsFaites = (f) => f.dep.every((d) => fait.has(d))
const nbBloque = Object.fromEntries(fiches.map((f) => [f.id, fiches.filter((g) => g.dep.includes(f.id) && !fait.has(g.id)).length]))
const execDe = (f) => (f.exec.split(/[\s(,]/)[0] || '?').toLowerCase()
const reserveeClaude = (f) => execDe(f) === 'claude-code' && !/elle-même/i.test(f.juge) && !/^migration/i.test(f.objet)

// Pourquoi une fiche ne se fait pas dans le cloud : on lit son en-tête (file/, en-cours/ ou brouillon) et on cherche ce que le cloud n'a pas.
function raisonPC(id) {
  const chemins = ['file', 'en-cours'].map((d) => path.join(O, d, `${id}.md`)).concat(path.join(O, 'brouillons-ecosysteme', '026', `${id}.md`))
  const p = chemins.find((c) => fs.existsSync(c))
  if (!p) return 'fiche introuvable'
  const t = fs.readFileSync(p, 'utf8').split(/\r?\n---\r?\n/)[0]
  const perim = ((t.match(/^perimetre:\s*\[(.*)\]/m) || [])[1] || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
  const verif = (t.match(/^verifier:\s*(.*)$/m) || [])[1] || ''
  const raisons = []
  if (perim.some((x) => x.startsWith('../') || x.startsWith('SaaS/'))) raisons.push('périmètre hors du dépôt (../orchestre, SaaS/…)')
  if (/usine\.mjs|revue-codex|presti-ops/.test(verif)) raisons.push('juge qui passe par l\'usine ou presti-ops')
  if (/--reel/.test(verif)) raisons.push('juge --reel : clé de service Supabase (secret du PC)')
  if (/\.env\.local/.test(t)) raisons.push('lit .env.local')
  return raisons.join(' ; ')
}

const TOUT = process.argv.includes("--tout")
if (process.argv.includes("--pretes")) {
  const pretes = fiches.filter((f) => etat(f) !== 'fait' && etat(f) !== 'en-cours' && etat(f) !== 'refuse' && depsFaites(f) && (TOUT || reserveeClaude(f)))
    .sort((a, b) => nbBloque[b.id] - nbBloque[a.id] || a.id.localeCompare(b.id))
  const cloud = [], pc = []
  for (const f of pretes) { const r = raisonPC(f.id); (r ? pc : cloud).push({ f, r }) }
  console.log(`${cloud.length} fiche(s) prête(s) réservée(s) à Claude, FAISABLES DANS LE CLOUD (les plus bloquantes d'abord) :`)
  for (const { f } of cloud) console.log(`  ${f.id}  bloque ${String(nbBloque[f.id]).padStart(3)}  [${execDe(f)}]  ${f.objet.slice(0, 80)}`)
  console.log(`${pc.length} autre(s) prête(s) mais À LAISSER AU PC :`)
  for (const { f, r } of pc) console.log(`  ${f.id}  bloque ${String(nbBloque[f.id]).padStart(3)}  ${r}`)
  process.exit(0)
}

const parExec = {}
for (const f of fiches) {
  const e = execDe(f); parExec[e] ??= { total: 0, fait: 0, pretes: 0 }
  parExec[e].total++
  if (etat(f) === 'fait') parExec[e].fait++
  else if (etat(f) !== 'en-cours' && etat(f) !== 'refuse' && depsFaites(f)) parExec[e].pretes++
}
const r = {
  serie_026: { dans_INDEX: fiches.length, fait: fiches.filter((f) => etat(f) === 'fait').length, en_cours: [...encours].filter((i) => i.startsWith('026-')).length,
    refuse: [...refuse].filter((i) => i.startsWith('026-')).length, dans_file: [...file].filter((i) => i.startsWith('026-')).length },
  par_executant: parExec,
  hors_INDEX_fait_026: [...fait].filter((i) => i.startsWith('026-') && !fiches.some((f) => f.id === i)),
  a_relire: ids('../a-relire').length, // dossier .orchestre/a-relire : fichiers .md libres, comptés à part ci-dessous
}
delete r.a_relire
for (const d of ['a-relire', 'a-decider']) r[d.replace('-', '_')] = fs.existsSync(path.join(O, d)) ? fs.readdirSync(path.join(O, d)).filter((f) => f.endsWith('.md')).length : 0
if (process.argv.includes('--json')) console.log(JSON.stringify(r))
else {
  const s = r.serie_026
  console.log(`Série 026 : ${s.fait} faite(s) sur ${s.dans_INDEX} de l'INDEX · ${s.en_cours} en cours · ${s.refuse} refusée(s) · ${s.dans_file} déposée(s) en file/`)
  console.log(`À relire (rédactions croisées) : ${r.a_relire} · À décider (questions des exécutants) : ${r.a_decider}`)
  console.log('Par exécutant (total / faites / prêtes, dépendances faites) :')
  for (const [e, v] of Object.entries(parExec).sort((a, b) => b[1].total - a[1].total)) console.log(`  ${e.padEnd(14)} ${String(v.total).padStart(4)} / ${String(v.fait).padStart(4)} / ${String(v.pretes).padStart(4)}`)
  if (r.hors_INDEX_fait_026.length) console.log(`Faites mais absentes de l'INDEX : ${r.hors_INDEX_fait_026.join(', ')}`)
}
