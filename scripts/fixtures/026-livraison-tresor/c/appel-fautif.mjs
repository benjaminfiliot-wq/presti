// Doublure `appel` FAUTIVE du lot C (fiche 026-029, Claude Code) pour redigerContenuV2 (fiche 026-093, RV-6) : à chaque
// appel, elle rend un JSON bien formé qui invente « 15 ans d’expérience » et « certifié RGE ». Elle consigne chaque requête
// reçue ({ systeme, utilisateur }) et chaque réponse rendue. creerAppel() rend un état neuf à chaque jeu.
export const INVENTIONS = ['15 ans', 'RGE']
export function creerAppel() {
  const appels = []
  const appel = async (requete) => {
    const reponse = JSON.stringify({
      chapeau: 'Menuisier depuis 15 ans, certifié RGE, à votre service.',
      introduction: 'Avec 15 ans d’expérience et certifié RGE, je réalise chaque ouvrage avec soin. Vous êtes entre de bonnes mains.',
    })
    appels.push({ requete: { systeme: String(requete?.systeme ?? ''), utilisateur: String(requete?.utilisateur ?? '') }, brut: requete, reponse })
    return reponse
  }
  return { appel, appels }
}
