#!/usr/bin/env node
// scripts/fixtures/026/savoir/reflexion/faux-codex-bilan.mjs — le faux Codex du bilan de Matt (fiche 026-238, écrit par
// Claude Code, sur le modèle de scripts/fixtures/026/chef/faux-codex-chef.mjs).
//
// Le juge en pose UNE COPIE dans un dossier d'essai, à côté d'un `faux-codex.json` :
//   { mode, temoins, empreinte, dort_s, propositions, bilan_fichier }  (bilan_fichier : un bilan tout fait, écrit tel quel)
// et pointe ORCHESTRE_CODEX_BIN sur cette copie. La configuration vit dans un fichier, parce que le modèle reçoit un
// environnement réduit à PATH, HOME et LANG : une variable ne lui parviendrait pas.
//
// À chaque appel, il dépose un témoin `<temoins>/appel-<horodatage>-<pid>.json` :
//   { pid, le, cwd, argv, env (les NOMS seulement, jamais les valeurs), jeton_vu (les noms des variables dont la valeur a
//     l'empreinte sha256 du jeton d'essai), stdin, mode, bilan (chemin écrit), sortie_o, ecrits, petit_enfant }
//
// Il lit le prompt dans son argv (le bilan à écrire : le dernier chemin qui finit par bilan.json ; les données : le
// dernier qui finit par donnees.md), puis lit le bloc <donnees_bilan> des données, comme le ferait un modèle.
//
// Modes : ok (un bilan conforme, dont chaque nombre est pris dans les données, `propositions` propositions, 3 par défaut) ;
// nombre-invente (un nombre que les données ne portent pas) ; source-inconnue (une source qui ne se résout pas) ;
// adresse (une adresse e-mail dans un constat) ; vide (bilan.json de 0 octet) ; rien (aucun fichier) ; dort (lance un
// petit-enfant qui dort, puis dort lui-même : il faut tuer l'arbre).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const conf = JSON.parse(fs.readFileSync(path.join(ICI, 'faux-codex.json'), 'utf8'))
const mode = process.env.FAUX_CODEX_MODE || conf.mode || 'ok'
const argv = process.argv.slice(2)
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const prompt = argv.join('\n')

const temoin = {
  pid: process.pid,
  le: new Date().toISOString(),
  t: Date.now(),
  cwd: process.cwd(),
  argv,
  env: Object.keys(process.env).filter((n) => !n.startsWith('FAUX_CODEX_')).sort(),
  jeton_vu: conf.empreinte ? Object.entries(process.env).filter(([, v]) => v && sha(v) === conf.empreinte).map(([n]) => n) : [],
  mode,
  bilan: null,
  sortie_o: null,
  ecrits: [],
  petit_enfant: null,
}
fs.mkdirSync(conf.temoins, { recursive: true })
const fichierTemoin = path.join(conf.temoins, `appel-${Date.now()}-${process.pid}.json`)
const deposer = () => fs.writeFileSync(fichierTemoin, JSON.stringify(temoin, null, 2))
deposer()

const absolu = (p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p))
const chemins = (re) => [...prompt.matchAll(re)].map((m) => m[0].replace(/[.,;:)]+$/, ''))
const cheminBilan = chemins(/[^\s"'`]*bilan\.json/g).at(-1) || null
const cheminDonnees = chemins(/[^\s"'`]*donnees\.md/g).at(-1) || null
const iO = argv.findIndex((a) => a === '-o' || a === '--output-last-message')
const cheminO = iO >= 0 ? argv[iO + 1] : null

function ecrire(p, contenu) {
  const f = absolu(p)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, contenu)
  temoin.ecrits.push(f)
}
function donnees() {
  if (!cheminDonnees) return {}
  try {
    const t = fs.readFileSync(absolu(cheminDonnees), 'utf8')
    const i = t.indexOf('<donnees_bilan>')
    const j = t.lastIndexOf('</donnees_bilan>')
    return JSON.parse(t.slice(i + '<donnees_bilan>'.length, j))
  } catch { return {} }
}

function bilan(D) {
  const ex = D.executants?.par_executant ?? {}
  const nom = Object.keys(ex)[0]
  const e0 = Array.isArray(D.echecs) ? D.echecs[0] : null
  const constats = [
    nom ? `${nom} : ${ex[nom].pass} PASS et ${ex[nom].fail} FAIL relevés sur la période.` : 'Aucun verdict relevé sur la période.',
    typeof D.couts?.mois_eur === 'number' ? `Coût du mois : ${D.couts.mois_eur} € au bus.` : 'Coût du mois non mesuré.',
  ]
  const propositions = [
    { titre: 'Relire le dernier échec de la période', pourquoi: e0 ? `Le dernier échec, ${e0.verdict} sur la fiche ${e0.id}, n'est pas encore expliqué.` : "Aucun échec à relire : vérifier que le juge n'a rien laissé passer.", sources: [e0 ? '/echecs/0' : '/executants'], effet_attendu: 'Un échec de moins à expliquer.', type: 'relecture' },
    { titre: 'Vérifier les leçons en attente', pourquoi: 'Des leçons candidates attendent la revue : les trier évite de les perdre.', sources: ['/lecons'], effet_attendu: 'Moins de leçons en attente.', type: 'verification' },
    { titre: 'Rédiger la note des recherches', pourquoi: "Les recherches de la période méritent une note interne pour n'être pas refaites.", sources: ['/recherches', '/lecons'], effet_attendu: 'Une note interne relue par Claude Code.', type: 'redaction_interne' },
  ].slice(0, Number.isInteger(conf.propositions) ? conf.propositions : 3)
  const b = { constats, propositions, compte_rendu: ['bilan terminé', 'propositions envoyées', 'rien appliqué'] }
  if (mode === 'nombre-invente') b.constats[0] = '4242 verdicts relevés sur la période.'
  if (mode === 'source-inconnue' && b.propositions[0]) b.propositions[0].sources = ['/inexistant/9']
  if (mode === 'adresse') b.constats[1] = 'Écrire à quelqu-un@exemple.fr pour le signaler.'
  return b
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
async function principal() {
  if (mode === 'dort') {
    const enfant = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'ignore', windowsHide: true })
    temoin.petit_enfant = enfant.pid
    deposer()
    await dormir((conf.dort_s || 120) * 1000)
    return 0
  }
  if (!cheminBilan) { process.stdout.write('faux-codex : aucun chemin de bilan dans le prompt\n'); return 1 }
  if (mode === 'rien') { process.stdout.write('faux-codex : rien écrit\n'); return 0 }
  if (mode === 'vide') ecrire(cheminBilan, '')
  else if (conf.bilan_fichier) ecrire(cheminBilan, fs.readFileSync(conf.bilan_fichier, 'utf8'))
  else ecrire(cheminBilan, JSON.stringify(bilan(donnees()), null, 2))
  temoin.bilan = absolu(cheminBilan)
  if (cheminO) { ecrire(cheminO, `faux-codex : bilan écrit (${mode})\n`); temoin.sortie_o = absolu(cheminO) }
  process.stdout.write(`faux-codex : bilan écrit (${mode})\n`)
  return 0
}
principal().then((code) => { temoin.fin = new Date().toISOString(); deposer(); process.exitCode = code })
  .catch((e) => { temoin.erreur = String(e?.message || e); deposer(); process.exitCode = 1 })
