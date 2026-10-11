# Banc du Comptable — 026-242, préalable de 026-243

Toutes les données sont synthétiques. Le seuil de 100000 centimes est un seuil de test, jamais un seuil fiscal conseillé.

Le module jugé expose `rapprocher(periode, deps)`, `seuilFranchise(periode, deps)`, `preparerDeclaration(periode, deps)`, `libelle(evenement, deps)` et `recettesTuile(periode, deps)`. Le second argument est une injection de dépendances du banc ; les appels de production peuvent fournir leurs dépendances par défaut. Il contient :

- `evenements` : les événements normalisés du client Stripe de lecture ; `stripe` fournit aussi `events.list`, `charges.list`, `refunds.list` et `subscriptions.list`, avec `{ data, has_more: false }`. Ses méthodes d’écriture lèvent une exception et consignent la tentative.
- `ventes.commandes` et `ventes.abonnements` : rapprochement par `paiement_id` externe, jamais par l'ordre des tableaux. `prix_cents` est la valeur de commande à comparer à `amount`.
- `seuil` : `{ valeur_cents, source, date_source }`, trois scénarios datés. `maintenant` donne l'horodatage fixe de préparation.
- `journal.ajouter({ cle, type, montant })` : clé `periode:paiement_id`, primitive idempotente factice ; aucun numéro de carte ni secret accepté. Une sentinelle carte et clé Stripe exclusivement synthétique est placée sur un paiement pour contrôler l'absence de fuite.
- `MOTEUR_DE.comptable` et `moteur(evenement, configuration)` : uniquement Codex ou Ollama local, avec `personnelles: true`, aucun `:cloud`. Le repli fixe attendu est `Encaissement rapproché` ; aucun moteur réel n'est appelé.

Les montants sont des entiers en centimes. Dix paiements de 10000 centimes, moins un remboursement partiel de 1000 centimes, donnent 99000 centimes nets. Les deux orphelins, l'écart de 1 centime, les échecs et l'annulation sont exclus. Le remboursement vient diminuer sa recette rapprochée et n'est jamais une nouvelle recette. Le paiement `ch_8` est payé mais jamais auparavant rapproché ; `ch_9` est un abonnement. Une commande sans paiement reste exclue.

Les deux chemins de total appellent une même fonction interne. Le juge vérifie cette délégation dans le source et compare les résultats réellement exécutés. Le témoin est uniquement un auto-contrôle du juge et ne devient jamais `lib/direction/comptable.ts`.

`--preuve-echecs` exécute le juge en processus séparé sur un dossier sans module que le juge fabrique lui-même (code 1, premier FAIL CPT-2 : l'étape ne dépend donc pas de l'état de `lib/direction/`), puis sur l'arbre courant (même attendu s'il n'a pas de module ; s'il en a un, c'est une information non bloquante : le jour où 026-243 livre le module, `verifier` de 026-242 reste vert), le témoin (code 0), puis les copies sabotées de `sabotages.json` (code 1 et ligne FAIL + bilan nommant le critère attendu). Chaque copie sabotée est posée dans un dossier d'essai qui porte aussi une copie des gabarits légaux. Aucun ancien échec n'est simulé. `preparerDeclaration` reste pure : le témoin partage un calcul sans journal entre les deux totaux ; seul `rapprocher` écrit les événements. Un sabotage qui ajoute une écriture de journal lors de la préparation rougit CPT-4.

`--reel` reste non jugé (code 2) jusqu'aux gestes de 026-243 : clé Stripe restreinte, jeton `tresorier` et premier rapprochement humain. Le banc ne lit aucune clé ni `.env.local`.

CPT-4 prouve aussi la pureté de toute fonction exportée dont le nom contient « declarer » ou « payer » : appelée sur des entrées gelées, elle ne consigne aucun effet et ne modifie rien ; pureté non prouvée = rouge. CPT-5 a deux preuves indépendantes : le piège des écritures de fichiers de la sonde (et la lecture du source), et l'empreinte avant/après des gabarits légaux listés dans `mentions.json` (la mention de franchise ne change qu'avec ses deux autres éléments, jamais par un agent) : un module qui écrirait par un moyen que le piège ne connaît pas change l'empreinte et rougit CPT-5. Un export manquant du contrat est dit en clair (`export <nom>(periode, dependances) absent`).
