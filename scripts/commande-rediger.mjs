// scripts/commande-rediger.mjs — rédige contenu.json (v2) à partir de commande.json (fiche 13) et du modèle du
// métier (maquettes/modeles/<métier>/contenu.json, 025-02/025-11), via lib/siteRedacteur.ts (fiche 026-093).
//
//   node --import ./scripts/ts-loader.mjs scripts/commande-rediger.mjs <dossier-source> [--sans-ia]
//
// Écrit contenu.json et redaction.json (le rapport de rédaction) dans <dossier-source>.
//
// --sans-ia : aucun appel à un modèle de langage ; les pages de commune gardent le texte du modèle du métier (ou un
// texte de repli déterministe si le modèle n'a pas de page de commune). Sans --sans-ia, l'appel est branché sur
// l'export de lib/agents/llm.ts (fiche 026-043) par import dynamique — ce module, réservé à Claude Code, est encore
// absent du dépôt : son absence tombe dans le même repli, avec le message ci-dessous.
//
// Code 0 : rédaction écrite. Code 2 : usage, dossier introuvable ou sous public/, commande.json ou modèle du métier
// absents. Code 3 : rapport.bloquant (prestations non déclarées, ou modèle d'un métier secondaire absent) —
// redaction.json est quand même écrit, avec le motif.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { redigerContenuV2 } from '../lib/siteRedacteur.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const USAGE = 'Usage : node --import ./scripts/ts-loader.mjs scripts/commande-rediger.mjs <dossier-source> [--sans-ia]'

function refuser(code, message) {
  console.error(message)
  process.exit(code)
}

function dans(parent, enfant) {
  const relatif = path.relative(parent, enfant)
  return relatif === '' || (!relatif.startsWith(`..${path.sep}`) && relatif !== '..' && !path.isAbsolute(relatif))
}

function lireJson(fichier) {
  try { return JSON.parse(fs.readFileSync(fichier, 'utf8')) } catch { return null }
}

async function main() {
  const args = process.argv.slice(2)
  const sansIaDemande = args.includes('--sans-ia')
  const positionnels = args.filter((a) => !a.startsWith('--'))
  const inconnues = args.filter((a) => a.startsWith('--') && a !== '--sans-ia')
  if (positionnels.length !== 1 || inconnues.length) refuser(2, USAGE)

  const dossier = path.resolve(positionnels[0])
  if (!fs.existsSync(dossier) || !fs.statSync(dossier).isDirectory()) refuser(2, `Dossier introuvable : ${dossier}`)
  if (dans(path.join(RACINE, 'public'), dossier)) refuser(2, 'Dossier refusé : un dossier sous public/ ne peut pas être rédigé (il serait servi tel quel).')

  const commande = lireJson(path.join(dossier, 'commande.json'))
  if (!commande || typeof commande !== 'object' || Array.isArray(commande)) refuser(2, `commande.json absent ou illisible dans ${dossier} (fiche 13).`)

  const metier = String(commande.metier ?? '')
  const fModele = path.join(RACINE, 'maquettes', 'modeles', metier, 'contenu.json')
  const modele = lireJson(fModele)
  if (!modele) refuser(2, `Modèle du métier absent : ${path.relative(RACINE, fModele)} (025-02/025-11).`)

  const modelesSecondaires = {}
  for (const m of commande.metiers_secondaires ?? []) {
    const ms = lireJson(path.join(RACINE, 'maquettes', 'modeles', String(m), 'contenu.json'))
    if (ms) modelesSecondaires[m] = ms
  }

  let appel
  if (!sansIaDemande) {
    try {
      const mod = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'llm.ts')).href)
      const lecteur = typeof mod.creerLecteur === 'function' ? await mod.creerLecteur('redacteur_site') : null
      if (typeof lecteur?.appel === 'function') appel = lecteur.appel
      else if (typeof mod.appel === 'function') appel = mod.appel
    } catch { /* module absent ou en échec : repli ci-dessous */ }
    if (!appel) console.error('clé agents absente : rédaction sans IA')
  }

  // Pas de ligne « artisans » distincte dans ce dossier (export de la fiche 13) : les services déclarés sont déjà
  // dans commande.matiere.prestations.
  const artisan = { metier, services: [] }

  const { contenu, rapport } = await redigerContenuV2({ commande, artisan, modele, modelesSecondaires }, appel)
  fs.writeFileSync(path.join(dossier, 'redaction.json'), `${JSON.stringify(rapport, null, 1)}\n`)
  if (rapport.bloquant) refuser(3, `Rédaction bloquée : ${rapport.bloquant}`)
  fs.writeFileSync(path.join(dossier, 'contenu.json'), `${JSON.stringify(contenu, null, 1)}\n`)
  console.log(`Rédaction terminée : ${path.relative(RACINE, dossier)} (${rapport.ia === 'indisponible' ? 'IA indisponible, texte du modèle' : appel ? 'avec IA' : 'sans IA'})`)
}

main().catch((e) => refuser(1, `Rédaction impossible : ${e?.message ?? e}`))
