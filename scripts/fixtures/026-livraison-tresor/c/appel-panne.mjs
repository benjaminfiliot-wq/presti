// Doublure `appel` EN PANNE du lot C (fiche 026-029, Claude Code) pour redigerContenuV2 (fiche 026-093, RV-6) : chaque appel
// lève une erreur, comme un moteur indisponible. Le rédacteur doit rendre un contenu complet quand même (texte du modèle) et
// `rapport.ia = 'indisponible'`, sans lever lui-même. creerAppel() rend un état neuf à chaque jeu.
export function creerAppel() {
  const appels = []
  const appel = async (requete) => {
    appels.push({ requete: { systeme: String(requete?.systeme ?? ''), utilisateur: String(requete?.utilisateur ?? '') } })
    throw new Error('moteur indisponible (doublure appel-panne du lot C)')
  }
  return { appel, appels }
}
