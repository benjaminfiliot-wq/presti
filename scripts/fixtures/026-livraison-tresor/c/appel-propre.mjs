// Doublure `appel` PROPRE du lot C (fiche 026-029, Claude Code) pour redigerContenuV2 (fiche 026-093, RV-6) : à chaque
// appel, un JSON bien formé, sans chiffre, sans label, sans superlatif, sans promesse de délai ni de déplacement, DIFFÉRENT
// de l'appel précédent (quatre variantes, dans l'ordre). Elle consigne chaque requête reçue et chaque réponse rendue ; le juge
// vérifie que les chapeaux publiés sont bien les siens. creerAppel() rend un état neuf à chaque jeu.
export const VARIANTES = [
  { chapeau: 'Escaliers et bibliothèques tracés pour la maison qui les reçoit.', introduction: 'Le projet commence par un relevé de la pièce. Le plan coté et le choix du bois viennent ensuite, avant toute découpe.' },
  { chapeau: 'Du relevé à la pose, un ouvrage en bois dessiné pour votre intérieur.', introduction: 'Chaque pièce est pensée pour les murs qui la reçoivent. Le dessin est validé ensemble avant la fabrication.' },
  { chapeau: 'Un escalier ou une bibliothèque à la mesure exacte de votre pièce.', introduction: 'Les cotes sont relevées avec soin, puis reportées sur un plan que vous relisez. La pose suit le calendrier convenu.' },
  { chapeau: 'Des ouvrages en bois massif, dessinés un par un pour chaque maison.', introduction: 'Aucun modèle de catalogue : le dessin part de la pièce. Vous choisissez l’essence et la finition sur le plan.' },
]
export function creerAppel() {
  const appels = []
  const appel = async (requete) => {
    const v = VARIANTES[appels.length % VARIANTES.length]
    const reponse = JSON.stringify(v)
    appels.push({ requete: { systeme: String(requete?.systeme ?? ''), utilisateur: String(requete?.utilisateur ?? '') }, brut: requete, reponse, variante: v })
    return reponse
  }
  return { appel, appels }
}
