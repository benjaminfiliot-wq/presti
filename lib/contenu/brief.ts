// lib/contenu/brief.ts — C11 (fiche 026-214) : la forme d'une NOUVELLE PROPOSITION issue de la boucle d'apprentissage.
//
// Un score élevé ne crée jamais une publication. Refaire un contenu repart TOUJOURS par le chemin normal :
//   proposition → nouveau contrôle `jev noul --provider laya` de chaque promesse (lib/contenu/lignes.ts) → contrôles
//   automatiques de la ligne (décision du 30/09, confirmée le 04/10 : ils remplacent l'accord individuel) → seulement alors une
//   publication.
// Ce fichier ne fait qu'exposer cette forme : aucun champ de `Brief` ne porte une URL, un statut « publié » ou une autorisation.
export type Brief = {
  id: string
  ligne: string
  motif: string
  /** Le contenu dont la boucle s'inspire (jamais le texte d'un concurrent). */
  inspireDe?: string
  statut: 'proposition'
  /** Ce qui reste à faire avant toute publication : rien n'est déjà fait. */
  restant: readonly ['jev_noul_des_promesses', 'controles_automatiques_de_la_ligne']
}

const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/
const LIGNE = /^L[1-5]$/

/** Une proposition neuve. Entrée invalide : exception (jamais une proposition à moitié formée). */
export function nouveauBrief(id: string, ligne: string, motif: string, inspireDe?: string): Brief {
  if (typeof id !== 'string' || !ID.test(id)) throw new TypeError('brief : identifiant invalide')
  if (typeof ligne !== 'string' || !LIGNE.test(ligne)) throw new TypeError('brief : ligne hors du cadre L1 à L5')
  if (typeof motif !== 'string' || !motif.trim()) throw new TypeError('brief : motif absent')
  if (inspireDe !== undefined && (typeof inspireDe !== 'string' || !ID.test(inspireDe))) throw new TypeError('brief : référence du contenu d\'origine invalide')
  return { id, ligne, motif: motif.trim().slice(0, 300), inspireDe, statut: 'proposition', restant: ['jev_noul_des_promesses', 'controles_automatiques_de_la_ligne'] }
}
