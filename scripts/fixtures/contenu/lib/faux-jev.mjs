#!/usr/bin/env node
// scripts/fixtures/contenu/lib/faux-jev.mjs — le faux `jev` de la fiche 026-204 (juges du domaine « réseaux »).
//
// `vraisemblance`/`noter`/`decider` (lib/agents/llm.ts, déjà PASS via 026-041/026-043) lancent, par le VRAI
// `child_process.spawn` (aucun double du lanceur n'est nécessaire ici : `node <JEV_CHEMIN> …` marche pareil sur
// Windows et ailleurs) :
//   process.execPath <JEV_CHEMIN> ask -f <fichier-requete> --provider laya
// avec l'environnement de l'enfant réduit à { JEV_PROVIDER: 'laya', PATH?, HOME?, LANG? } (contrat déjà fixé par
// 026-041, LL-9/LL-... : voir appelerJev). Ce script REFUSE tout provider qui ne serait pas EXACTEMENT « laya »
// (aucun repli hébergé Jev n'est permis, R du contrat transversal de 026-204) : argv sans « --provider laya », ou
// JEV_PROVIDER ≠ laya dans l'environnement reçu, rend le code 3 sans rien répondre — c'est le critère JV de
// juges-026-reseaux-preuve.mjs.
//
// Fichier de requête (mode 0600, écrit et effacé par le VRAI module, jamais par ce script) : JSON
// { mode: 'decide' | 'score' | 'noul', texte: string, options?: string[] }.
//
// Coordination (ajoutée par ce juge, jamais par le module réel) :
//   FAUX_JEV_JOURNAL   chemin d'un fichier JSON (tableau) : { le, argv, env, fichier, contenu, mode }
//   FAUX_JEV_REPONSE   un JSON, la réponse exacte à imprimer (remplace la réponse par défaut du mode)
//   FAUX_JEV_SCENARIO  'ok' (défaut) | 'muet' (ne répond jamais : sert à éprouver une vraie panne côté appelant, qui
//                      pour ce module précis rend déjà null AVANT tout lancement si JEV_CHEMIN est illisible — la
//                      panne « en vol » se simule en pointant JEV_CHEMIN vers un fichier illisible ou absent, pas
//                      avec ce scénario, gardé pour un futur module qui lancerait vraiment jev)
import fs from 'node:fs'

const argv = process.argv.slice(2)
const iF = argv.indexOf('-f')
const fichierRequete = iF >= 0 ? argv[iF + 1] : null
const iProvider = argv.indexOf('--provider')
const providerArgv = iProvider >= 0 ? argv[iProvider + 1] : null

function journaliser(x) {
  const p = process.env.FAUX_JEV_JOURNAL
  if (!p) return
  let lignes = []
  try { lignes = JSON.parse(fs.readFileSync(p, 'utf8')) } catch { lignes = [] }
  lignes.push({ le: new Date().toISOString(), argv, env: { ...process.env }, fichier: fichierRequete, ...x })
  fs.writeFileSync(p, JSON.stringify(lignes))
}

function lireRequete() {
  if (!fichierRequete) return { contenu: null, mode: null }
  let contenu = null, mode = null
  try { contenu = JSON.parse(fs.readFileSync(fichierRequete, 'utf8')); mode = contenu?.mode ?? null } catch { /* fichier absent ou illisible : consigné tel quel */ }
  return { contenu, mode }
}

function reponseParDefaut(mode, requete) {
  if (mode === 'decide') return { choix: (requete?.options && requete.options[0]) || 'a' }
  if (mode === 'score') return { niveau: 3, distribution: { 1: 0.1, 2: 0.1, 3: 0.6, 4: 0.1, 5: 0.1 } }
  if (mode === 'noul') return { p: 0.8 }
  return { erreur: `mode inconnu : ${mode}` }
}

async function main() {
  // Verrou provider : aucun repli hébergé, jamais Ollama :cloud, jamais autre chose que « laya » en argv ET en env.
  const providerEnv = process.env.JEV_PROVIDER
  if (providerArgv !== 'laya' || providerEnv !== 'laya') {
    journaliser({ contenu: null, mode: null, refuse: 'provider' })
    process.stderr.write(`jev : provider refusé (argv=${providerArgv}, env=${providerEnv}) — seul « laya » est autorisé\n`)
    process.exitCode = 3
    return
  }
  const { contenu, mode } = lireRequete()
  journaliser({ contenu, mode })
  const scenario = process.env.FAUX_JEV_SCENARIO || 'ok'
  if (scenario === 'muet') { await new Promise(() => {}); return }
  const reponse = (() => { try { return process.env.FAUX_JEV_REPONSE ? JSON.parse(process.env.FAUX_JEV_REPONSE) : reponseParDefaut(mode, contenu) } catch { return reponseParDefaut(mode, contenu) } })()
  process.stdout.write(JSON.stringify(reponse))
  process.exitCode = 0
}

main()
