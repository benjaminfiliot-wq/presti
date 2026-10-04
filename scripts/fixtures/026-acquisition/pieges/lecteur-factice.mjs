// scripts/fixtures/026-acquisition/pieges/lecteur-factice.mjs — le Lecteur factice du second juge (fiche 026-069, point 5),
// écrit par Claude Code. Sert CO-8 de 026-083 : jugerTon doit fermer par défaut (refus) devant un lecteur qui ne rend pas
// exactement `{"verdict":"ok"|"refus","raisons":[codes de la liste fermée]}`.
//
// creerLecteurFactice(mode) → un Lecteur (`(entree) => Promise<unknown>`) qui, selon `mode` :
//   'ok'             → JSON valide, verdict 'ok', raisons vides ;
//   'refus'          → JSON valide, verdict 'refus', une raison de la liste fermée (promesse_implicite) ;
//   'texte'          → une chaîne qui n'est pas du JSON ;
//   'verdict_inconnu'→ JSON valide, mais verdict hors de 'ok' | 'refus' ;
//   'code_inconnu'   → JSON valide, verdict 'refus', une raison hors de la liste fermée ;
//   'objet'          → un objet déjà décodé (pas une chaîne), pour vérifier que le juge ne suppose pas un format ;
//   'null'           → null ;
//   'leve'           → lève une exception (panne du lecteur) ;
//   défaut ('ok').
// `.recus` : chaque `entree` reçue (systeme, donnees), pour vérifier ce que jugerTon lui envoie (jamais un secret).
// `identite` : le nom que le lecteur déclare (`lecteur.identite`), lu par jugerTon (étalonnage valable pour ce seul lecteur).
export function creerLecteurFactice(mode = 'ok', identite = undefined) {
  const recus = []
  const lecteur = async (entree) => {
    recus.push(entree)
    if (mode === 'ok') return JSON.stringify({ verdict: 'ok', raisons: [] })
    if (mode === 'refus') return JSON.stringify({ verdict: 'refus', raisons: ['promesse_implicite'] })
    if (mode === 'texte') return "ceci n'est pas du JSON, juste une phrase."
    if (mode === 'verdict_inconnu') return JSON.stringify({ verdict: 'peut-etre', raisons: [] })
    if (mode === 'code_inconnu') return JSON.stringify({ verdict: 'refus', raisons: ['code_invente_par_le_modele'] })
    if (mode === 'objet') return { verdict: 'ok', raisons: [] }
    if (mode === 'null') return null
    if (mode === 'leve') throw new Error('panne du lecteur (factice, mode leve)')
    return JSON.stringify({ verdict: 'ok', raisons: [] })
  }
  lecteur.recus = recus
  if (identite !== undefined) lecteur.identite = identite
  lecteur.mode = mode
  return lecteur
}
/** Les modes qui doivent tous mener à un refus fermé (`second_juge_indisponible`), CO-8. */
export const MODES_FERMETURE = Object.freeze(['texte', 'verdict_inconnu', 'code_inconnu', 'objet', 'null', 'leve'])
