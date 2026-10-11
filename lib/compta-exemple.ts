// Jeu de lignes FICTIF pour la vitrine « Votre compta, comme dans Excel » (app/DemoCompta.tsx) : il nourrit
// le vrai tableur de l'espace artisan (app/chiffres/Tableur.tsx), en lecture seule. Aucune donnée réelle :
// noms, montants et catégories sont inventés, et la landing l'écrit sous la scène.
//
// Dates FIXES, contrairement à lib/tableau-de-bord/exemple.ts : le tableur est un composant client, et la
// landing est prérendue au build. Des dates relatives à « aujourd'hui » différeraient entre le rendu du
// build et celui du navigateur un autre mois, et React refuserait l'hydratation.
import type { Ligne, Sens, Statut } from './comptaImport'
import type { FichierCompta } from './comptaArtisan'
import type { PlanIA } from './comptaAssistant'

const L = (ligne: number, date: string, libelle: string, tiers: string, sens: Sens, euros: number, categorie: string, statut: Statut): Ligne =>
  ({ ligne, date, libelle, tiers, sens, montant: Math.round(euros * 100), categorie, statut, source: 'exemple.xlsx' })

export const LIGNES_EXEMPLE: readonly Ligne[] = [
  L(2, '2026-07-03', 'Remplacement chauffe-eau 200 L', 'M. Leroy', 'recette', 1240, 'Plomberie', 'paye'),
  L(3, '2026-07-08', 'Chauffe-eau et groupe de sécurité', 'Négoce Bordier', 'depense', 612.4, 'Matériel', 'paye'),
  L(4, '2026-07-15', 'Robinets thermostatiques', 'Mme Garnier', 'recette', 180, 'Dépannage', 'paye'),
  L(5, '2026-07-22', 'Gasoil', 'Station Rivière', 'depense', 96.3, 'Carburant', 'paye'),
  L(6, '2026-07-29', 'Salle de bain complète', 'M. et Mme Robin', 'recette', 6850, 'Rénovation', 'paye'),
  L(7, '2026-08-05', 'Faïence et receveur', 'Carrelages Vidal', 'depense', 1384.9, 'Matériel', 'paye'),
  L(8, '2026-08-12', 'Entretien chaudière', 'Mme Fournier', 'recette', 145, 'Entretien', 'paye'),
  L(9, '2026-08-19', 'Garantie décennale', 'Cabinet Morel', 'depense', 310, 'Frais fixes', 'paye'),
  L(10, '2026-08-26', 'Remplacement mitigeur', 'M. Bertrand', 'recette', 220, 'Plomberie', 'impaye'),
  L(11, '2026-09-02', 'Pompe à chaleur air-eau', 'M. Lambert', 'recette', 9800, 'Chauffage', 'paye'),
  L(12, '2026-09-04', 'Pompe à chaleur et liaisons', 'Négoce Bordier', 'depense', 5120, 'Matériel', 'paye'),
  L(13, '2026-09-11', 'Gasoil', 'Station Rivière', 'depense', 104.6, 'Carburant', 'paye'),
  L(14, '2026-09-18', 'Débouchage canalisation', 'Mme Perrin', 'recette', 160, 'Dépannage', 'impaye'),
  L(15, '2026-09-24', 'Location nacelle', 'Location Garnaud', 'depense', 185, 'Location', 'paye'),
  L(16, '2026-09-30', 'Radiateurs, mise en service', 'Mme Chevalier', 'recette', 1960, 'Chauffage', 'non_renseigne'),
]

// — La même compta, telle qu'un artisan la garde vraiment (vitrine « faite par l'IA », 11/10/2026) —
// Un cahier de chantiers avec un titre, une colonne « Réglé ? » et une ligne TOTAL ; sa feuille de synthèse ; un relevé
// de carte pro en Débit / Crédit sous trois lignes d'en-tête. Mêmes opérations fictives que LIGNES_EXEMPLE.

export const FICHIERS_DESORDRE: readonly FichierCompta[] = [
  { nom: 'cahier-2026.xlsx · Chantiers', sensParDefaut: 'recette', texte: [
    'Mes chantiers 2026;;;;',
    ';;;;',
    'Date;Client;Prestation;Montant;Réglé ?',
    '03/07/2026;M. Leroy;Remplacement chauffe-eau 200 L;1 240,00;oui',
    '15/07/2026;Mme Garnier;Robinets thermostatiques;180,00;oui',
    '29/07/2026;M. et Mme Robin;Salle de bain complète;6 850,00;oui',
    '12/08/2026;Mme Fournier;Entretien chaudière;145,00;oui',
    '26/08/2026;M. Bertrand;Remplacement mitigeur;220,00;non',
    '02/09/2026;M. Lambert;Pompe à chaleur air-eau;9 800,00;oui',
    '18/09/2026;Mme Perrin;Débouchage canalisation;160,00;non',
    '30/09/2026;Mme Chevalier;Radiateurs, mise en service;1 960,00;',
    ';;TOTAL;20 555,00;',
  ].join('\n') },
  { nom: 'cahier-2026.xlsx · Synthèse', sensParDefaut: 'recette', texte: 'Mois;Recettes;Dépenses\nJuillet;8 270,00;708,70\nAoût;365,00;1 694,90\nSeptembre;11 920,00;5 409,60' },
  { nom: 'releve-carte-pro.csv', sensParDefaut: 'recette', texte: [
    'BANQUE FICTIVE · Carte professionnelle;;;',
    'Relevé édité le 01/10/2026;;;',
    ';;;',
    'Date opération;Libellé;Débit;Crédit',
    '08/07/2026;CB NEGOCE BORDIER;612,40;',
    '22/07/2026;CB STATION RIVIERE GASOIL;96,30;',
    '05/08/2026;CB CARRELAGES VIDAL;1 384,90;',
    '19/08/2026;PRLV CABINET MOREL DECENNALE;310,00;',
    '04/09/2026;CB NEGOCE BORDIER;5 120,00;',
    '11/09/2026;CB STATION RIVIERE GASOIL;104,60;',
    '24/09/2026;CB LOCATION GARNAUD NACELLE;185,00;',
    ';SOLDE AU 30/09/2026;;',
  ].join('\n') },
]

// Ce que l'assistant répond pour ces trois feuilles. Écrit d'avance pour la vitrine (la landing n'appelle aucune IA),
// puis passé par la même validation que la vraie réponse (validerPlanIA) : une feuille ou une catégorie hors des règles
// serait refusée de la même façon. Aucun nombre : l'IA ne dit que où sont les choses.
export const PLAN_IA_EXEMPLE: PlanIA = {
  feuilles: [
    { role: 'donnees', ligneEntete: 1, colonnes: { date: 0, tiers: 1, libelle: 2, montant: 3, statut: 4 }, montantSigne: false, sensParDefaut: 'recette', raison: 'Cahier de chantiers : une prestation par ligne, « Réglé ? » dit si le client a payé.' },
    { role: 'synthese', ligneEntete: 0, colonnes: {}, montantSigne: false, sensParDefaut: 'recette', raison: 'Totaux par mois, déjà présents ligne à ligne dans les deux autres feuilles.' },
    { role: 'donnees', ligneEntete: 2, colonnes: { date: 0, libelle: 1, debit: 2, credit: 3 }, montantSigne: false, sensParDefaut: 'depense', raison: 'Relevé de carte : chaque débit est une dépense.' },
  ],
  categories: [
    { valeur: 'CB NEGOCE BORDIER', categorie: 'Matériaux et fournitures' },
    { valeur: 'CB CARRELAGES VIDAL', categorie: 'Matériaux et fournitures' },
    { valeur: 'CB LOCATION GARNAUD NACELLE', categorie: 'Outillage et équipement' },
  ],
}
