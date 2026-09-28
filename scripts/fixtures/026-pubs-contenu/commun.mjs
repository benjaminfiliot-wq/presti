// scripts/fixtures/026-pubs-contenu/commun.mjs — le socle du domaine « pubs-contenu » de la série 026 (fiche 026-108),
// écrit par Claude Code. Partagé par pack-pub-base-qa.mjs, pack-pub-paiement-qa.mjs, cgu-pack-pub-qa.mjs et
// juges-026-pubs-contenu-preuve.mjs : ils réutilisent par ailleurs R, TRAVAIL, git, lireOptionsOuQuitter, extraireReference…
// de scripts/fixtures/025/commun.mjs, et creerRapport, jumeauNuCoupe, empreinte, lireCompteRendu, nonRegression… de
// scripts/lib/sql-essai.mjs (fiche 026-108, « Ce qu'il faut faire », point 2) : rien de tout cela n'est recopié ici.
//
// Ce module ne porte que ce qui est propre au domaine :
//   FIXTURES     scripts/fixtures/026-pubs-contenu/
//   CONTRAT      contrat-pack.json relu (seule source du contrat pour les trois juges, voir son en-tête)
//   lireSessions()   les jeux d'essai argent/sessions/*.json → [{ nom, fichier, session }]
//   lireDossiers()   les jeux d'essai argent/dossiers/*.json → [{ nom, fichier, entree, champ }] (champ = null sur
//                    valide.json, le seul jeu que erreursAvantPaiementPack doit accepter)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
export const CONTRAT = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'contrat-pack.json'), 'utf8'))

function lireDossierJson(sousDossier) {
  const dossier = path.join(FIXTURES, 'argent', sousDossier)
  const noms = fs.readdirSync(dossier).filter((f) => f.endsWith('.json')).sort()
  if (!noms.length) throw new Error(`${path.relative(FIXTURES, dossier)} : aucun fichier .json`)
  return noms.map((f) => {
    const fichier = path.join(dossier, f)
    let contenu
    try { contenu = JSON.parse(fs.readFileSync(fichier, 'utf8')) } catch (e) { throw new Error(`${f} illisible : ${e.message}`) }
    return { nom: f.replace(/\.json$/, ''), fichier, contenu }
  })
}

/** argent/sessions/*.json : chacun EST un objet Checkout.Session réduit. → [{ nom, fichier, session }] */
export function lireSessions() {
  return lireDossierJson('sessions').map(({ nom, fichier, contenu }) => ({ nom, fichier, session: contenu }))
}

/**
 * argent/dossiers/*.json : { entree, champ } — `entree` est le `matiere` du pack passé à erreursAvantPaiementPack ;
 * `champ` est le nom (ou préfixe pointé) que le message d'erreur doit contenir, ou null sur valide.json (le seul jeu
 * que la fonction doit accepter, sans aucune erreur rendue).
 */
export function lireDossiers() {
  return lireDossierJson('dossiers').map(({ nom, fichier, contenu }) => {
    if (!contenu || typeof contenu !== 'object' || !('entree' in contenu)) throw new Error(`${path.basename(fichier)} : { entree, champ } attendu`)
    if (nom !== 'valide' && (typeof contenu.champ !== 'string' || !contenu.champ.trim())) throw new Error(`${path.basename(fichier)} : champ (le nom attendu dans l'erreur) manquant`)
    return { nom, fichier, entree: contenu.entree, champ: nom === 'valide' ? null : contenu.champ }
  })
}
