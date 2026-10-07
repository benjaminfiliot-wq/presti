import type { Canal } from './juge'

export type Fait = {
  id: string
  texte: string
  preuve: { fichier: string; motif: string } | { promesse: number }
  canaux: Canal[]
  drapeau?: string
}

const TOUS: Canal[] = ['instagram', 'facebook', 'linkedin']

/** Chaque formulation renvoie à une preuve vérifiable dans le dépôt. */
export const FAITS: Fait[] = [
  { id: 'reponse-rapide', texte: "La réponse est prête en moins d'une minute : Presti la prépare, vous l'envoyez.", preuve: { fichier: 'plans/promesses.md', motif: "`pilotage-e2e` **18/18 rejoué le 05/09** (mode assisté, prise de main, règles, flux SSE) | 05/09 | ✅ |" }, canaux: TOUS },
  { id: 'devis-prix', texte: "Presti prépare des devis chiffrés sur vos propres prix.", preuve: { fichier: 'plans/promesses.md', motif: '| 14 | « Devis chiffrés par l\'IA, sur vos prix »' }, canaux: TOUS },
  { id: 'factures', texte: 'Presti permet de créer des factures et des factures électroniques.', preuve: { fichier: 'plans/promesses.md', motif: '| 15 | « Factures + facture électronique »' }, canaux: TOUS },
  { id: 'relances', texte: 'Les relances peuvent partir après 2, 5 et 10 jours de silence du prospect.', preuve: { fichier: 'lib/relances.ts', motif: 'CADENCE_RELANCES = [2, 5, 10]' }, canaux: TOUS },
  { id: 'stock', texte: 'Suivez votre stock par lieu, avec scan et seuils.', preuve: { fichier: 'plans/promesses.md', motif: '| 17 | « Stock par lieu, scan, seuils »' }, canaux: TOUS },
  { id: 'fournisseurs', texte: 'Recherchez des prix chez vos fournisseurs avec l’aide de l’IA.', preuve: { fichier: 'plans/promesses.md', motif: '| 18 | « Recherche IA chez vos fournisseurs »' }, canaux: TOUS },
  { id: 'boite-mail', texte: 'Branchez votre boîte e-mail à Presti.', preuve: { fichier: 'plans/promesses.md', motif: '| 19 | « Votre boîte email branchée »' }, canaux: TOUS },
  { id: 'export-donnees', texte: 'Exportez vos données depuis Presti.', preuve: { fichier: 'plans/promesses.md', motif: '| 20 | « Export de vos données »' }, canaux: TOUS },
  { id: 'page-marque', texte: 'Accueillez vos demandes sur une page de conversation à votre marque.', preuve: { fichier: 'plans/promesses.md', motif: '| 9 | « Page de conversation à votre marque »' }, canaux: TOUS },
  { id: 'essai-offert', texte: 'Essayez Presti sans carte bancaire, avec des crédits offerts.', preuve: { fichier: 'plans/promesses.md', motif: '| 4 | « Essai offert, résiliable » / « 3 crédits offerts · sans carte »' }, canaux: TOUS },
  { id: 'assistant-ia', texte: 'En Essentiel, vous validez les réponses de l’assistant IA.', preuve: { fichier: 'plans/promesses.md', motif: '| 10 | « Assistant IA » (autonome dès Studio, « vous validez » en Essentiel)' }, canaux: TOUS },
  { id: 'comptes-clients', texte: 'Vos clients retrouvent leur historique grâce à un lien magique.', preuve: { fichier: 'plans/promesses.md', motif: '| 11 | « Comptes clients (lien magique, historique) »' }, canaux: TOUS },
  { id: 'site-sur-mesure', texte: 'Un site vitrine à la demande est proposé à 300 € une fois.', preuve: { fichier: 'lib/siteCommande.ts', motif: "PRIX_SITE_TEXTE = '300 €'" }, canaux: TOUS, drapeau: 'siteCommandeVente' },
]
