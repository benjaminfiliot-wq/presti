# 036-039 — état pour le vérificateur

La route est gardée côté serveur par `app/tableau-de-bord/page.tsx:7` : `tableauComplet=false` produit un 404. Le drapeau n'a pas été modifié. La lecture passe par `lib/supabaseClient.ts` et le jeton de la session artisan, dans `app/tableau-de-bord/Vue.tsx:47-52`. `lib/tableau/charger.ts:24-52` filtre les tables parentes sur `artisan_id` et les tables filles sur les identifiants déjà lus ; `lib/tableau/calculer.ts:22-39` refiltre par artisan en défense. La pagination évite la limite de 1 000 lignes de PostgREST.

| Bloc | Table et colonnes lues | Calcul et affichage |
| --- | --- | --- |
| Aujourd'hui | `leads(id, artisan_id, statut, created_at)`, `messages(id, lead_id, sens, sent_at, etat)`, `crm_rappels(id, artisan_id, type, echeance, heure, fait_le, envoye_le)`, `assistant_actions(id, artisan_id, statut, mode, cree_le, titre)` — `lib/tableau/charger.ts:10-21` | `lib/tableau/calculer.ts:41-47,92-97` |
| Argent | `factures(id, artisan_id, client_id, client_nom, statut, total_ttc, date_emission, date_echeance, payee_le, avoir_de)` — `lib/tableau/charger.ts:13` | `lib/tableau/calculer.ts:49-61,98-103` ; sommes de centimes par facture, avoirs exclus par `facturesComptees` |
| Devis et factures | `devis(id, artisan_id, client_id, client_nom, statut, total_ttc, created_at, date_emission, envoye_le, accepte_le)` et `factures` ci-dessus — `lib/tableau/charger.ts:12-13` | `lib/tableau/calculer.ts:63-68,104-113` |
| Clients | `clients(id, artisan_id, nom, created_at)`, `factures(client_id, client_nom, total_ttc)` — `lib/tableau/charger.ts:13-14` | `lib/tableau/calculer.ts:69-77,114-117` |
| Chantiers et agenda | `chantiers(id, artisan_id, titre, statut, date_debut, date_fin_prevue)`, `crm_rappels` ci-dessus — `lib/tableau/charger.ts:15,19` | `lib/tableau/calculer.ts:79-80,118-122` |
| Stock et tarifs | `materiaux(id, artisan_id, nom, seuil_alerte)`, `stock(id, materiau_id, quantite)`, `prix_artisan(id, artisan_id, designation, actif, maj_le)` — `lib/tableau/charger.ts:16-18` | `lib/tableau/calculer.ts:81-84,123-126` |
| Relances | `crm_rappels` ci-dessus, `relances(id, lead_id, planifiee_le, envoyee)` — `lib/tableau/charger.ts:19-20` | `lib/tableau/calculer.ts:85-88,127-130` |
| Assistants et crédits | `assistant_actions` ci-dessus, `artisans(id, credits, credits_periode, credits_forfait_servi, credits_offerts)` — `lib/tableau/charger.ts:9,21` | `lib/tableau/calculer.ts:89,131-137` |

Chaque bloc porte table et date de lecture au survol (`app/tableau-de-bord/Vue.tsx:17`) et un état vide (`lib/tableau/calculer.ts:92-137`). Relecture à 30 secondes (`app/tableau-de-bord/Vue.tsx:61`). La mise en page mobile et le mouvement réduit sont dans `app/tableau-de-bord/tableau.module.css:27-29`.

## Limites exactes du schéma

- Les règlements antérieurs à la colonne `factures.payee_le` n'ont pas de date ; ils restent hors des mois et une note le signale (`supabase/migrations/0140_compta_automatisations.sql:7-13`, `lib/tableau/calculer.ts:50,103`).
- Le solde de crédits est lisible dans `artisans.credits`, mais aucun journal daté de consommation n'existe dans les migrations lues. « Crédits utilisés ce mois » reste indisponible ; le calcul ne le devine pas (`lib/tableau/calculer.ts:134-137`).
- `crm_agenda` ne stocke qu'un jeton d'agenda, aucun rendez-vous (`supabase/migrations/0164_crm_agenda.sql:14-18`). Le bloc agenda compte les rappels de type rendez-vous, visite ou métré.

## Vérification attendue

`scripts/tableau-de-bord-qa.mjs` conserve le juge existant de `/chiffres` et appelle `lib/tableau/qa.mjs` à sa dernière ligne. Le nouveau juge utilise uniquement des données « Exemple », vérifie les centimes, l'isolation et six mutants : `service_role`, source absente, euros flottants, état vide absent, drapeau inversé, filtre artisan retiré. Il produit deux captures fictives, 1440 et 390 px, dans ce dossier ; ce sont des captures de la maquette du contrat visuel, pas un rendu authentifié de la route.

Contrôles réalisés ici : `node --check` des deux scripts : code 0. `node node_modules/typescript/bin/tsc --noEmit --pretty false --incremental false` : erreurs préexistantes dans `lib/evenements/departements.ts` (hors périmètre) ; aucune modification n'y a été faite. La commande `verifier` et les captures attendent l'exécution hors bac à sable prévue par `.orchestre/travail/executant/036-039.prompt.md` ; aucune sortie ni image n'est déclarée comme obtenue avant cette exécution.
