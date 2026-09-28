#!/usr/bin/env node
// scripts/fixtures/026/llm/faux-lanceur.mjs — le faux Codex de la fiche 026-041, écrit par Claude Code.
//
// Remplace `env.CODEX_LANCEUR` (et, pour Laya, `JEV_CHEMIN` : voir faux-jev.mjs) : le juge le lance par
// `process.execPath <ce fichier> <argv que le module a construit pour son vrai lanceur>`, jamais le module lui-même.
// Ce fichier ne parle JAMAIS au réseau et ne lit aucun secret réel : sa configuration vient de variables d'environnement
// ajoutées par la doublure `deps.lancer` du juge (§ « coordination » ci-dessous), PAR-DESSUS l'environnement que le
// module a construit — jamais à la place. Le juge relit ces variables séparément pour vérifier que l'environnement REÇU
// (avant l'ajout de coordination) ne portait que PATH, HOME et LANG (LL-5, LL-9, LL-16) ; ce fichier, lui, se contente
// d'écrire ce qu'il a reçu, sans juger.
//
// Coordination (jamais posée par le module lui-même) :
//   FAUX_LANCEUR_JOURNAL     chemin d'un fichier JSON (tableau) : une ligne { le, argv, env, entree } y est ajoutée à
//                            chaque lancement (l'entrée standard entière, sans coupe : LL-5 vérifie les marques
//                            <donnees>…</donnees> dessus).
//   FAUX_LANCEUR_COMPTEUR    chemin d'un fichier texte qui contient le nombre d'appels déjà servis (créé si absent) :
//                            sert à choisir le scénario courant dans FAUX_LANCEUR_SCENARIOS (au-delà, le dernier reste).
//   FAUX_LANCEUR_SCENARIOS   un JSON, tableau de scénarios : 'propre' | 'texte' | 'tronque' | 'sans_texte' | 'jamais' |
//                            'quota' | '401' | '503' (par défaut : ['propre']).
//   FAUX_LANCEUR_CONTENU     un JSON, le corps de la réponse « propre » (par défaut { classe: 'oui' }).
//   FAUX_LANCEUR_ECHEANCE    le texte d'échéance du scénario 'quota' (par défaut une date à 2 minutes de maintenant).
//
// Le fichier de sortie du modèle est celui qui suit `--output-last-message` dans l'argv (absent : rien n'est écrit).
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const iOut = argv.indexOf('--output-last-message')
const fichierSortie = iOut >= 0 ? argv[iOut + 1] : null

function lireStdinSync() {
  // L'entrée peut être longue (émballage de données) : on la lit en bloquant sur le descripteur 0, comme un vrai
  // exécutable la lirait avant de répondre.
  try {
    const morceaux = []
    const tampon = Buffer.alloc(65536)
    let n
    // eslint-disable-next-line no-cond-assign
    while ((n = fs.readSync(0, tampon, 0, tampon.length)) > 0) morceaux.push(Buffer.from(tampon.subarray(0, n)))
    return Buffer.concat(morceaux).toString('utf8')
  } catch {
    return ''
  }
}

function compteurAppel() {
  const p = process.env.FAUX_LANCEUR_COMPTEUR
  if (!p) return 0
  let n = 0
  try { n = parseInt(fs.readFileSync(p, 'utf8'), 10) || 0 } catch { n = 0 }
  try { fs.writeFileSync(p, String(n + 1)) } catch { /* le juge relit le journal, pas ce compteur */ }
  return n
}

function journaliser(entree) {
  const p = process.env.FAUX_LANCEUR_JOURNAL
  if (!p) return
  let lignes = []
  try { lignes = JSON.parse(fs.readFileSync(p, 'utf8')) } catch { lignes = [] }
  lignes.push({ le: new Date().toISOString(), argv, env: { ...process.env }, entree })
  fs.writeFileSync(p, JSON.stringify(lignes))
}

function scenarioCourant() {
  let scenarios = ['propre']
  try { scenarios = JSON.parse(process.env.FAUX_LANCEUR_SCENARIOS || '["propre"]') } catch { scenarios = ['propre'] }
  const n = compteurAppel()
  return scenarios[Math.min(n, scenarios.length - 1)]
}

async function main() {
  const entree = argv.includes('-') ? lireStdinSync() : ''
  journaliser(entree)
  const scenario = scenarioCourant()
  const contenu = (() => { try { return JSON.parse(process.env.FAUX_LANCEUR_CONTENU || '{"classe":"oui"}') } catch { return { classe: 'oui' } } })()
  const echeance = process.env.FAUX_LANCEUR_ECHEANCE || new Date(Date.now() + 120_000).toISOString().slice(0, 16).replace('T', ' ')

  if (scenario === 'jamais') {
    // N'écrit rien, ne sort jamais de lui-même : c'est le délai du module (deps lancer → kill) qui doit y mettre fin.
    await new Promise(() => {})
    return
  }
  if (scenario === 'quota') { process.stderr.write(`You've hit your usage limit for gpt-6, try again at ${echeance}\n`); process.exitCode = 1; return }
  if (scenario === '401') { process.stderr.write('401 Unauthorized\n'); process.exitCode = 1; return }
  if (scenario === '503') { process.stderr.write('stream error: 503 Service Unavailable\n'); process.exitCode = 1; return }

  if (!fichierSortie) { process.stderr.write('faux-lanceur : --output-last-message absent, rien à écrire\n'); process.exitCode = 1; return }
  fs.mkdirSync(path.dirname(fichierSortie), { recursive: true })
  const json = JSON.stringify(contenu)
  if (scenario === 'propre') fs.writeFileSync(fichierSortie, json)
  else if (scenario === 'texte') fs.writeFileSync(fichierSortie, `Voici la réponse : ${json}\nMerci.`)
  else if (scenario === 'tronque') fs.writeFileSync(fichierSortie, json.slice(0, Math.max(1, json.length - 6)))
  else if (scenario === 'sans_texte') fs.writeFileSync(fichierSortie, 'je ne peux pas répondre à cette demande')
  else fs.writeFileSync(fichierSortie, json)
  process.exitCode = 0
}

main()
