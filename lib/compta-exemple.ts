// Jeu de lignes FICTIF pour la vitrine « Votre compta, comme dans Excel » (app/DemoCompta.tsx) : il nourrit
// le vrai tableur de l'espace artisan (app/chiffres/Tableur.tsx), en lecture seule. Aucune donnée réelle :
// noms, montants et catégories sont inventés, et la landing l'écrit sous la scène.
//
// Dates FIXES, contrairement à lib/tableau-de-bord/exemple.ts : le tableur est un composant client, et la
// landing est prérendue au build. Des dates relatives à « aujourd'hui » différeraient entre le rendu du
// build et celui du navigateur un autre mois, et React refuserait l'hydratation.
import type { Ligne, Sens, Statut } from './comptaImport'

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
