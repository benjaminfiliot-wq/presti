#!/usr/bin/env node
// scripts/fixtures/026/llm/faux-jev.mjs — le faux Jev/Laya de la fiche 026-041 (LL-18), écrit par Claude Code.
//
// Remplace `JEV_CHEMIN` : `decider`, `noter` et `vraisemblance` doivent lancer
// `process.execPath <JEV_CHEMIN> ask -f <fichier>` (LL-18) par `deps.lancer`, sans détour. Le juge pose
// `env.JEV_CHEMIN` sur CE fichier : aucune substitution n'est nécessaire (contrairement au faux Codex), le module
// l'exécute déjà par `process.execPath`, donc directement par `node`.
//
// Contrat précisé par ce juge (absent du texte de la fiche, à tenir par 026-043) : le fichier de requête
// (`-f <fichier>`, mode 0600, créé et effacé par le MODULE — ce script ne l'efface jamais) est un JSON
// `{ mode: 'decide' | 'score' | 'noul', texte: string, options?: string[] }`. `mode` dit la forme de la réponse :
//   'decide' → { choix: <une des options, ou 'a' à défaut> }
//   'score'  → { niveau: <entier>, distribution: {...} }
//   'noul'   → { p: <0..1> }
// Aucune de ces réponses ne porte du texte généré (LL-18) : ce sont des valeurs fixes ou pilotées par le juge
// (FAUX_JEV_REPONSE), jamais une génération.
//
// Coordination (ajoutée par la doublure `deps.lancer` du juge, jamais par le module) :
//   FAUX_JEV_JOURNAL   chemin d'un fichier JSON (tableau) : { le, argv, env, fichier, contenu, mode: <mode du fichier> }
//   FAUX_JEV_REPONSE   un JSON, la réponse exacte à imprimer (remplace la réponse par défaut du mode)
//   FAUX_JEV_SCENARIO  'ok' (défaut) | 'muet' (ne répond jamais : sert à éprouver un délai côté module)
import fs from 'node:fs'

const argv = process.argv.slice(2)
const iF = argv.indexOf('-f')
const fichierRequete = iF >= 0 ? argv[iF + 1] : null

function lireRequete() {
  if (!fichierRequete) return { contenu: null, mode: null, permission: null }
  let contenu = null
  let mode = null
  let permission = null
  try {
    const brut = fs.readFileSync(fichierRequete, 'utf8')
    contenu = JSON.parse(brut)
    mode = contenu && typeof contenu === 'object' ? contenu.mode : null
  } catch { /* fichier absent ou illisible : consigné tel quel */ }
  try { permission = (fs.statSync(fichierRequete).mode & 0o777).toString(8) } catch { permission = null }
  return { contenu, mode, permission }
}

function journaliser(x) {
  const p = process.env.FAUX_JEV_JOURNAL
  if (!p) return
  let lignes = []
  try { lignes = JSON.parse(fs.readFileSync(p, 'utf8')) } catch { lignes = [] }
  lignes.push({ le: new Date().toISOString(), argv, env: { ...process.env }, fichier: fichierRequete, ...x })
  fs.writeFileSync(p, JSON.stringify(lignes))
}

function reponseParDefaut(mode, requete) {
  if (mode === 'decide') return { choix: (requete?.options && requete.options[0]) || 'a' }
  if (mode === 'score') return { niveau: 3, distribution: { 1: 0.1, 2: 0.1, 3: 0.6, 4: 0.1, 5: 0.1 } }
  if (mode === 'noul') return { p: 0.8 }
  return { erreur: `mode inconnu : ${mode}` }
}

async function main() {
  const { contenu, mode, permission } = lireRequete()
  journaliser({ contenu, mode, permission })
  const scenario = process.env.FAUX_JEV_SCENARIO || 'ok'
  if (scenario === 'muet') { await new Promise(() => {}); return }
  const reponse = (() => { try { return process.env.FAUX_JEV_REPONSE ? JSON.parse(process.env.FAUX_JEV_REPONSE) : reponseParDefaut(mode, contenu) } catch { return reponseParDefaut(mode, contenu) } })()
  process.stdout.write(JSON.stringify(reponse))
  process.exitCode = 0
}

main()
