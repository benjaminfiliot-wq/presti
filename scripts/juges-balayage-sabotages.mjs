#!/usr/bin/env node
// juges-balayage-sabotages.mjs — la preuve que les juges à balayage global voient toujours le code et ne voient plus les copies.
//
// Le 04/10/2026 (audit C §5.5), docs/contexte-cloud/ (2 729 fichiers de contexte pour Claude cloud) rougissait SO-1 (« 490 »),
// SG-5 (la marque d'essai du Studio) et MQ-9 (le nom fictif de la maquette) : ils balaient « tous les fichiers suivis ». La correction
// (scripts/fixtures/025/commun.mjs, COPIES_DE_DOCUMENTATION) écarte les COPIES de documents, jamais le code. Ce script le prouve,
// juge par juge, par quatre séries :
//   0. le CONTRÔLE NÉGATIF : la correction neutralisée (COPIES_DE_DOCUMENTATION vidée), le juge sur l'arbre COMPLET est ROUGE —
//      sans lui, « les copies ne comptent plus » ne prouverait rien (le bac de l'usine n'a pas ces dossiers : voir plus bas) ;
//   1. le TÉMOIN : le juge sur l'arbre tel quel → le critère est vert ;
//   2. les SABOTAGES DANS LE CODE : la valeur cherchée écrite dans un fichier de lib/, de app/, de components/ ou de scripts/ →
//      le critère est ROUGE (le juge voit toujours le code) ;
//   3. les MÊMES VALEURS DANS LES COPIES (docs/contexte-cloud/, docs/relais-fiches-claude/, reprise-cloud/, .orchestre/preuves/) →
//      le critère reste VERT.
// Chaque sabotage ajoute une ligne en pied d'un fichier SUIVI existant, lance le juge, puis rend le fichier tel qu'il était.
//
// Le clone de l'usine exclut docs/contexte-cloud/ (sparse-checkout « !/docs/contexte-cloud/ ») : un juge qui y tourne ne voit donc
// jamais ce dossier et reste vert sans la correction. Le script déplie ce dossier dans son bac (git sparse-checkout disable) pour
// juger sur l'arbre complet, celui du PC et du cloud.
//
// ⚠ Ce script ÉCRIT dans l'arbre (et le rend). Il refuse de tourner ailleurs que dans un bac jetable de l'usine :
//   node scripts/usine.mjs executer --nom=balayage --delai=40 -- node scripts/juges-balayage-sabotages.mjs
//   (le bac est recréé à chaque appel ; jamais sur le PC, où d'autres travaux sont en cours dans le même arbre).
// Par défaut le script juge un arbre PROPRE : un second worktree du HEAD du bac, sans le travail en cours d'autres fiches que le
// paquet de `executer` y a posé (le 04/10, un fichier modifié d'une autre fiche suffisait à rougir SG-5 sans rapport avec la correction).
// Options : --juge=SO-1,SG-5,MQ-9 (défaut : les trois) ; --arbre-du-bac : juger l'arbre du bac tel quel, travail en cours compris
// (pour éprouver une correction pas encore committée) ; --avec=<fichiers> : des fichiers du bac posés dans l'arbre propre (la correction
// pas encore committée, sans le travail des autres). Code 0 : tout est comme attendu ; 1 : un écart ; 2 : refus.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import * as St from './fixtures/026-pubs-contenu/studio/commun.mjs'

const BAC = process.cwd()
let RACINE = BAC
const dansUnBac = /[\\/]bacs[\\/]/.test(BAC.replace(/\\/g, '/')) || process.env.PRESTI_BAC_JETABLE === '1'
if (!dansUnBac) {
  console.error('✗ juges-balayage-sabotages : ce script écrit dans l\'arbre ; il ne tourne que dans un bac jetable de l\'usine (node scripts/usine.mjs executer … -- node scripts/juges-balayage-sabotages.mjs).')
  process.exit(2)
}

const arg = process.argv.slice(2).find((a) => a.startsWith('--juge='))
const VOULUS = arg ? arg.slice(7).split(',').map((x) => x.trim()).filter(Boolean) : ['SO-1', 'SG-5', 'MQ-9']

const git = (args, cwd = RACINE) => spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 27 })
const suivis = (prefixe) => git(['ls-files', '--', prefixe]).stdout.split('\n').filter(Boolean)
const premierSuivi = (prefixe, ext) => suivis(prefixe).find((f) => f.endsWith(ext))
const lireJson = (f) => JSON.parse(fs.readFileSync(path.join(RACINE, f), 'utf8'))

// L'arbre propre : un second worktree du HEAD du bac (le travail posé par le paquet n'y est pas), node_modules en liens physiques.
let propre = null
if (!process.argv.includes('--arbre-du-bac')) {
  propre = `${BAC}-propre`
  git(['worktree', 'remove', '--force', propre], BAC)
  fs.rmSync(propre, { recursive: true, force: true })
  const a = git(['worktree', 'add', '--detach', '--quiet', propre, 'HEAD'], BAC)
  if (a.status !== 0) { console.error(`✗ git worktree add ${propre} : ${String(a.stderr).trim().split('\n')[0]}`); process.exit(2) }
  const c = spawnSync('cp', ['-al', path.join(BAC, 'node_modules'), path.join(propre, 'node_modules')], { encoding: 'utf8' })
  if (c.status !== 0) { console.error(`✗ node_modules du bac non liés dans l'arbre propre : ${String(c.stderr).trim().split('\n')[0]}`); process.exit(2) }
  RACINE = propre
  // --avec=<f1>,<f2> : des fichiers du bac (travail en cours) posés dans l'arbre propre — la correction à éprouver, pas encore committée,
  // sans le travail des autres.
  const avec = process.argv.find((a) => a.startsWith('--avec='))
  for (const f of avec ? avec.slice(7).split(',').filter(Boolean) : []) {
    const src = path.join(BAC, f), dst = path.join(propre, f)
    if (!fs.existsSync(src)) { console.error(`✗ --avec : ${f} absent du bac`); process.exit(2) }
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(src, dst)
  }
}
const nettoyer = () => { if (propre) { git(['worktree', 'remove', '--force', propre], BAC); fs.rmSync(propre, { recursive: true, force: true }) } }
console.log(`arbre jugé : ${propre ? 'HEAD du bac, propre (sans le travail en cours)' : 'le bac tel quel (travail en cours compris)'} · ${git(['rev-parse', '--short', 'HEAD']).stdout.trim()}`)

// L'arbre complet : le sparse-checkout du clone de l'usine n'a pas docs/contexte-cloud/.
if (!fs.existsSync(path.join(RACINE, 'docs', 'contexte-cloud'))) {
  const d = git(['sparse-checkout', 'disable'])
  if (d.status !== 0) { console.error(`✗ git sparse-checkout disable : ${String(d.stderr).trim().split('\n')[0]}`); process.exit(2) }
}
if (!fs.existsSync(path.join(RACINE, 'docs', 'contexte-cloud', 'ETAT-ET-DECISIONS.md'))) { console.error('✗ docs/contexte-cloud/ absent du bac : le juge ne verrait pas ce que la correction écarte, la preuve ne prouverait rien'); process.exit(2) }

// Où écrire : le code que les juges doivent continuer de voir, et les copies qu'ils ne doivent plus voir.
const CODE = ['lib/urls.ts', 'app/layout.tsx', 'components/controle/contenu/Couts.tsx', 'scripts/usine.mjs']
const COPIES = [premierSuivi('docs/contexte-cloud/', '.md'), premierSuivi('docs/relais-fiches-claude/', '.md'), premierSuivi('reprise-cloud/', '.md'), premierSuivi('.orchestre/preuves/', '.md') || premierSuivi('.orchestre/preuves/', '.txt')]
for (const f of [...CODE, ...COPIES]) if (!f || !fs.existsSync(path.join(RACINE, f))) { console.error(`✗ fichier suivi introuvable pour un sabotage : ${f}`); process.exit(2) }

const maquette = lireJson('scripts/fixtures/025/maquette-exemple.json')
const JUGES = {
  'SO-1': { cmd: ['node', '--import', './scripts/ts-loader.mjs', 'scripts/studio-offre-qa.mjs'], code: '\nexport const ZZ_SABOTAGE_PRIX = 490\n', copie: '\nLe pack coûte 490 € (copie de documentation).\n', codeCopies: CODE, copies: COPIES },
  'SG-5': { cmd: ['node', 'scripts/studio-garde-qa.mjs'], code: `\nexport const ZZ_SABOTAGE_MARQUE = ${JSON.stringify(`${St.MARQUE_NOM} ${St.MARQUE_CLE}`)}\n`, copie: `\nMarque d'essai : ${St.MARQUE_NOM} (${St.MARQUE_CLE}), copie de documentation.\n`, codeCopies: CODE, copies: COPIES },
  // MQ-9 : un juge de captures (~50 s par passage) : deux fichiers de code et deux copies suffisent.
  'MQ-9': { cmd: ['node', 'scripts/maquette-qa.mjs', '--metier=menuisier'], code: `\nexport const ZZ_SABOTAGE_NOM = ${JSON.stringify(String(maquette.entreprise))}\n`, copie: `\nMaquette d'essai : ${String(maquette.entreprise)} (copie de documentation).\n`, codeCopies: CODE.slice(0, 2), copies: [COPIES[0], COPIES[2]] },
}

function verdict(sortie, id) {
  const m = new RegExp(`^(?:\\s*)(PASS|FAIL|✅|❌)\\s+${id.replace(/[-]/g, '\\-')}\\b`, 'm').exec(sortie)
  return m ? (m[1] === 'PASS' || m[1] === '✅' ? 'PASS' : 'FAIL') : '?'
}
function lancer(j, id) {
  const r = spawnSync(j.cmd[0], j.cmd.slice(1), { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 27, timeout: 15 * 60_000 })
  return verdict(`${r.stdout || ''}\n${r.stderr || ''}`, id)
}
/** Écrit `texte` en pied de `fichier`, lance le juge, rend le fichier. */
function saboter(fichier, texte, j, id) {
  const chemin = path.join(RACINE, fichier)
  const avant = fs.readFileSync(chemin)
  try {
    fs.appendFileSync(chemin, texte, 'utf8')
    return lancer(j, id)
  } finally { fs.writeFileSync(chemin, avant) }
}
/** La correction neutralisée : COPIES_DE_DOCUMENTATION vidée dans commun.mjs (rendu après). */
function sansCorrection(j, id) {
  const chemin = path.join(RACINE, 'scripts', 'fixtures', '025', 'commun.mjs')
  const avant = fs.readFileSync(chemin, 'utf8')
  const apres = avant.replace(/export const COPIES_DE_DOCUMENTATION = \[[^\]]*\]/, 'export const COPIES_DE_DOCUMENTATION = []')
  if (apres === avant) throw new Error('COPIES_DE_DOCUMENTATION introuvable dans scripts/fixtures/025/commun.mjs : le contrôle négatif ne neutralise rien')
  try {
    fs.writeFileSync(chemin, apres, 'utf8')
    return lancer(j, id)
  } finally { fs.writeFileSync(chemin, avant, 'utf8') }
}

let ecarts = 0
const dire = (ok, texte) => { if (!ok) ecarts++; console.log(`${ok ? '✓' : '✗'} ${texte}`) }
for (const id of VOULUS) {
  const j = JUGES[id]
  if (!j) { console.error(`✗ critère inconnu : ${id}`); process.exit(2) }
  console.log(`\n── ${id} : ${j.cmd.slice(-2).join(' ')}`)
  const n = sansCorrection(j, id)
  dire(n === 'FAIL', `${id} contrôle négatif (correction neutralisée, arbre complet) : ${n} (FAIL attendu : les copies font rougir le juge)`)
  const t = lancer(j, id)
  dire(t === 'PASS', `${id} témoin (arbre complet, correction en place) : ${t} (PASS attendu)`)
  for (const f of j.codeCopies) {
    const v = saboter(f, j.code, j, id)
    dire(v === 'FAIL', `${id} sabotage dans le code ${f} : ${v} (FAIL attendu : le juge voit toujours le code)`)
  }
  for (const f of j.copies) {
    const v = saboter(f, j.copie, j, id)
    dire(v === 'PASS', `${id} même valeur dans la copie ${f} : ${v} (PASS attendu : les copies ne comptent pas)`)
  }
}
nettoyer()
console.log(`\njuges-balayage-sabotages :${ecarts ? `FAIL — ${ecarts} écart(s)` : 'PASS'}`)
process.exitCode = ecarts ? 1 : 0
