# Spec J1 — Le socle du Centre de direction : garde, re-confirmation, journal, « Aujourd'hui »

> Prompt v10 §1, §2.1, §3 ; carte `plans/009-direction-carte.md` §4. Écrite avec le code (07/09) ; les specs J2+ précèdent leur code.

## Problem Statement

Benj n'a aucun écran qui réponde en dix secondes à « est-ce que tout va bien et qu'est-ce que je dois faire ? ». Le poste de contrôle actuel copie six fois une garde fondateur, ne journalise aucune action, n'a ni re-confirmation ni rôle, et affiche des chiffres sans dire d'où ils viennent ni de quand ils datent.

## Solution

Un espace `/direction` réservé aux fondateurs, derrière le second facteur, avec : une garde unique et fermée par défaut ; une re-confirmation par mot de passe pour toute écriture sensible (jeton de cinq minutes, usage unique, portée) ; un journal immuable de chaque action (qui, quoi, quand, avant/après, adresse) ; une page « Aujourd'hui » — bandeau d'état, file « À faire » avec l'action de chaque ligne, chiffres du jour sourcés et datés, fil des vingt derniers événements — et une page « Journal ». Deux rôles : direction (tout) et lecture (Alexandre).

## User Stories

1. En tant que Benj, je veux entrer dans `/direction` seulement après mon second facteur, pour que personne ne dirige l'entreprise avec un mot de passe seul.
2. En tant que Benj, je veux que chaque écriture sensible me redemande mon mot de passe une fois, valable cinq minutes pour ce type d'action, pour ne pas subir un clic malheureux ni un onglet oublié.
3. En tant que Benj, je veux que chaque action laisse une ligne infalsifiable, pour pouvoir prouver ce qui a été fait et par qui.
4. En tant que Benj, je veux un bandeau vert, orange ou rouge (site, connexion, Stripe, emails, tâches planifiées, budget IA), pour savoir en un regard si le service tient.
5. En tant que Benj, je veux la file des choses qui m'attendent (paiements échoués, alertes non acquittées, tâches en retard), chacune avec son bouton, pour agir sans changer d'outil.
6. En tant que Benj, je veux les chiffres du jour avec leur source et leur fraîcheur (MRR, artisans payants, essais, conversions, encaissé, coût IA, crédits), pour ne jamais lire un nombre inventé.
7. En tant que Benj, je veux voir « non mesuré » plutôt qu'un zéro quand une clé manque, pour savoir ce qu'il me reste à brancher.
8. En tant que Benj, je veux le fil des derniers événements de l'entreprise, pour reprendre le fil après une journée sur chantier.
9. En tant que Benj, je veux acquitter une alerte d'un clic, journalisé, pour vider la file de ce qui est traité.
10. En tant que Benj, je veux bannir ou débannir une adresse avec re-confirmation, pour couper un abus sans ouvrir la base.
11. En tant qu'Alexandre, je veux lire l'état, les chiffres et le journal sans pouvoir rien écrire, conformément à mon rôle.
12. En tant qu'artisan, je veux que rien de mes prospects, devis ou factures n'apparaisse dans cet espace, pour que mes données restent les miennes.
13. En tant que Benj, je veux que l'espace n'existe pas tant que la base n'est pas prête (404), pour ne rien laisser de cassé visible.
14. En tant que Benj, je veux un écran dense, lisible sur téléphone, sans surprise de mise en page, pour m'en servir sur chantier.

## Implementation Decisions

- Une garde unique, fermée par défaut : drapeau, adresse non bannie, session valide et second facteur passé, qualité de fondateur, plafond par fondateur, rôle. Toute erreur de base est un refus, jamais un passage.
- Re-confirmation : le mot de passe est revérifié par une connexion de contrôle fermée aussitôt ; le jeton (aléatoire, 32 octets) n'est stocké que par son empreinte ; consommation atomique en base (absent, rejoué, expiré, mauvaise portée, ok) ; cinq essais par quart d'heure ; le compte de relecture des stores en est exclu.
- Journal : écrit par le serveur seul, immuable par trigger, conservé vingt-quatre mois, adresse en clair côté serveur ; avant/après épurés (clés sensibles retirées, taille bornée) ; **une écriture non journalisée est défaite et refusée**.
- Lectures : chaque valeur est un objet « valeur, source, date, cache, erreur ou manque » ; cache mémoire de soixante secondes ; Stripe en lecture seule (solde, abonnements actifs mensualisés, transactions du mois, factures ouvertes, événements).
- Rôles : une table à côté du compte ; sans ligne, un fondateur est direction ; lecture = jamais une écriture (403 explicite).
- Alertes : persistées à l'envoi (une par motif, clé et jour), lues par « À faire », acquittées sans re-confirmation mais journalisées.
- Page : layout serveur qui répond 404 sur le drapeau ; page cliente qui redirige sans session ou sans qualité ; aucune donnée dans le HTML ; rail d'onglets réutilisant celui des Paramètres ; modale de re-confirmation accessible (focus piégé, Échap, `aria-modal`) ; jeton gardé en mémoire seulement.
- Réglages globaux : des valeurs, jamais des drapeaux.

## Testing Decisions

- Un bon test observe : le code HTTP et le corps des routes, l'état des tables après une action, la ligne de journal, la réponse d'un rejeu ; jamais l'implémentation.
- Suite `direction-e2e` (seize blocs) : préalables (404 sans drapeau, coquille HTML, robots, table présente) ; sans identité ; artisan sans qualité ; fondateur sans second facteur ; lectures sourcées ; écriture sans jeton ; re-confirmation (faux, bon, plafond, journal sans le jeton, session de contrôle fermée) ; écriture avec jeton journalisée ; rejeu, expiration, portée, autre fondateur ; immuabilité et RLS ; débannir ; rôle lecture ; sentinelle « aucune donnée de prospect » ; alerte visible puis acquittée ; plafond en rafale. Code 2 tant que la migration n'est pas collée.
- `fermeture-e2e` prouve le 404 des sept routes tant que le drapeau est baissé.
- Prior art : `code-connexion-e2e` (session attestée, plafonds), `parametres-e2e` (rail d'onglets), `abonnement-e2e` (Stripe en lecture).

## Out of Scope

- Les onglets Clients, Messagerie, Comptabilité, Santé, Artisans, Réglages (J2–J5) ; la suppression de `/controle` (J6) ; la biométrie comme re-confirmation ; la migration du jeton vers un cookie httpOnly (dette séparée).

## Further Notes

- Livré derrière `FLAGS.direction = false` (`054eec4` → `3c80be9`) ; s'ouvre quand Benj colle `_A_COLLER_sql_editor_0065.sql`.
- Deux corrections faites avant le collage : `acteur_id` du journal survit à la suppression du compte ; le trigger laisse partir les lignes des comptes de test.
