#!/usr/bin/env node
// scripts/fixtures/026/chef/faux-codex-chef.mjs — le faux Codex du chef « Matt » (fiche 026-102, écrit par Claude Code).
//
// Le juge en pose une COPIE dans un dossier d'essai, à côté d'un `faux-codex.json` :
//   { mode, temoins, empreinte, plans, quota_texte, dort_s }
// et pointe ORCHESTRE_CODEX_BIN (ou `servir --codex=`) sur cette copie. La configuration vit dans un fichier, parce que
// le modèle reçoit un environnement VIDÉ (CH-U2) : une variable ne lui parviendrait pas. FAUX_CODEX_MODE, s'il existe,
// remplace le mode du fichier.
//
// À chaque appel, il dépose un témoin `<temoins>/appel-<horodatage>-<pid>.json` :
//   { pid, le, cwd, argv, env (les NOMS seulement, jamais les valeurs), jeton_vu (les noms des variables dont la valeur a
//     l'empreinte sha256 du jeton d'essai), stdin_sha256, plan, sortie_o, ecrits, petit_enfant }
// Il lit le prompt dans son argv, et sur son entrée standard si l'argv porte « - ».
//
// Modes : ok (écrit un plan conforme : plan-ok, réduit à une tâche et sans décision si le modèle est gpt-6-luna ; une
// ligne de consignes_lues par consigne trouvée dans le bloc <consignes_benj> de l'entrée) ; oubli (le même plan, sans
// aucune ligne de consigne) ; vide (plan de 0 octet) ; rien (aucun plan) ; lent (dort 4 s puis ok) ; dort (lance un
// petit-enfant qui dort, puis dort lui-même : il faut tuer l'arbre) ; quota (le message de limite d'usage, code 1).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const conf = JSON.parse(fs.readFileSync(path.join(ICI, 'faux-codex.json'), 'utf8'))
const mode = process.env.FAUX_CODEX_MODE || conf.mode || 'ok'
const argv = process.argv.slice(2)
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

let stdin = ''
if (argv.includes('-')) { try { stdin = fs.readFileSync(0, 'utf8') } catch { stdin = '' } }
const prompt = [...argv, stdin].join('\n')

const temoin = {
  pid: process.pid,
  le: new Date().toISOString(),
  t: Date.now(),
  cwd: process.cwd(),
  argv,
  env: Object.keys(process.env).filter((n) => !n.startsWith('FAUX_CODEX_')).sort(),
  jeton_vu: conf.empreinte ? Object.entries(process.env).filter(([, v]) => v && sha(v) === conf.empreinte).map(([n]) => n) : [],
  stdin_sha256: stdin ? sha(stdin) : null,
  stdin: stdin.slice(0, 20_000),
  mode,
  plan: null,
  sortie_o: null,
  ecrits: [],
  petit_enfant: null,
}
fs.mkdirSync(conf.temoins, { recursive: true })
const fichierTemoin = path.join(conf.temoins, `appel-${Date.now()}-${process.pid}.json`)
const deposer = () => fs.writeFileSync(fichierTemoin, JSON.stringify(temoin, null, 2))
deposer()

const chemins = (re) => [...prompt.matchAll(re)].map((m) => m[0].replace(/[.,;:)]+$/, ''))
const cheminPlan = chemins(/[^\s"'`]*plan\.json/g).at(-1) || null
const cheminEntree = chemins(/[^\s"'`]*entree\.md/g).at(-1) || null
const iO = argv.findIndex((a) => a === '-o' || a === '--output-last-message')
const cheminO = iO >= 0 ? argv[iO + 1] : null
const iM = argv.indexOf('-m')
const modele = iM >= 0 ? argv[iM + 1] : null
const absolu = (p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p))

function ecrire(p, contenu) {
  const f = absolu(p)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, contenu)
  temoin.ecrits.push(f)
}

async function plan(avecConsignes) {
  const P = await import(pathToFileURL(conf.plans).href)
  const p = P.materialiser(P.planOk(), { maintenant: new Date() })
  if (modele === 'gpt-6-luna') { p.cycle = 'leger'; p.taches = p.taches.slice(0, 1); p.decisions = [] }
  let ids = []
  if (cheminEntree) {
    try {
      const entree = fs.readFileSync(absolu(cheminEntree), 'utf8')
      const i = entree.lastIndexOf('<consignes_benj>')
      const j = entree.lastIndexOf('</consignes_benj>')
      if (i >= 0 && j > i) ids = [...new Set([...entree.slice(i, j).matchAll(/"id"\s*:\s*(\d+)/g)].map((m) => Number(m[1])))]
    } catch { /* entrée illisible : aucune consigne */ }
  }
  p.consignes_lues = avecConsignes
    ? ids.slice(0, 10).map((id) => (id === P.ID_CONSIGNE_ORDINAIRE
      ? { id, suite: 'tache', pourquoi: 'Relecture de la page tarifs ajoutée aux tâches du pont.' }
      : { id, suite: 'impossible', pourquoi: "Demande hors de mes limites : je n'envoie ni n'approuve rien." }))
    : []
  return p
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
async function principal() {
  if (mode === 'quota') {
    process.stdout.write(`ERROR: You've hit your usage limit. Upgrade to Pro or try again at ${conf.quota_texte || 'Sep 29th, 2026 2:17 AM'}.\n`)
    return 1
  }
  if (mode === 'dort') {
    const enfant = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'ignore', windowsHide: true })
    temoin.petit_enfant = enfant.pid
    deposer()
    await dormir((conf.dort_s || 120) * 1000)
    return 0
  }
  if (mode === 'lent') await dormir(4000)
  if (!cheminPlan && cheminO) { ecrire(cheminO, `{"ok":true}\n`); temoin.sortie_o = absolu(cheminO); process.stdout.write(`faux-codex : réponse écrite ${conf.marque || ''}\n`); return 0 }
  if (!cheminPlan) { process.stdout.write('faux-codex : aucun chemin de plan dans le prompt\n'); return 1 }
  if (mode === 'rien') { process.stdout.write('faux-codex : rien écrit\n'); return 0 }
  if (mode === 'vide') ecrire(cheminPlan, '')
  else ecrire(cheminPlan, JSON.stringify(await plan(mode !== 'oubli'), null, 2))
  temoin.plan = absolu(cheminPlan)
  if (cheminO) { ecrire(cheminO, `faux-codex : plan écrit (${mode})\n`); temoin.sortie_o = absolu(cheminO) }
  process.stdout.write(`faux-codex : plan écrit (${mode}) ${conf.marque || ''}\n`)
  return 0
}
principal().then((code) => { temoin.fin = new Date().toISOString(); deposer(); process.exitCode = code })
  .catch((e) => { temoin.erreur = String(e?.message || e); deposer(); process.exitCode = 1 })
