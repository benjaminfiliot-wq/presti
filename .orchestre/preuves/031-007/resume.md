# 031-007 — n8n contrôle l'état d'une tâche rendue, et abandonne seul une tâche figée

Fait le 02/11/2026 vers 9 h 30 par l'agent principal (Claude Code), par le MCP n8n-oracle.

## 1. « faite » refuse une ligne qui n'est pas en cours — workflow `SvVxqrXdpt5sOCTL` (hermes-file-taches-v1)
- Nœuds ajoutés : « Lire la tâche (fin) » (lecture de la ligne par son id), « Ligne trouvée (fin) ? », « Ligne en cours ? »,
  « Répondre 409 (pas en cours) » (corps `{"erreur":"pas en cours"}`).
- « Terminer la tâche » ne met plus à jour qu'une ligne encore `en_cours` (filtre id ET statut) et lit le corps du webhook par
  son nom : une seconde fin ne passe plus.
- Inchangés : 400, 404, nœuds de jeton (031-005), « Compte rendu Slack » (031-006, identifiant « Slack account 2 »).

## 2. Abandon automatique des tâches figées — même workflow, groupe « Abandon »
- Choix : une chaîne de plus dans le workflow de la file, et non un workflow neuf (même table, même nœud Slack, une seule
  version active à suivre). Déclencheur « Toutes les 30 min » (cron `0 */30 * * * *`) → « Lire les tâches en cours » →
  « Tâches figées (6 h) » (prise depuis plus de 6 h ou date illisible) → « Abandonner la tâche » (`statut = bloque`,
  `resume = abandon automatique`, `fini_le`, seulement si encore `en_cours` : idempotent) → « Compte rendu Slack (abandon) »
  (canal C0CCEMNCU90, identifiant « Slack account 2 », Continue On Fail). Aucune ligne figée : rien n'est écrit ni posté.
- Version active : `d5ca9377-1e7c-4319-8002-6d2e93280294`.

## 3. Revue sans doublon et santé quotidienne — workflow `spawXoj4S8mBjvyB` (reseau-neuronal-revue-hebdo)
- Fuseau Europe/Paris. Le dimanche à 20 h, la revue n'est déposée que si aucune revue n'est `a_faire` ou `en_cours`.
- Chaque jour à 21 h, la tâche `sante-reseau` (brief `plans/011-cadrage-01-11/briefs/sante-reseau.md`, origine
  `n8n:sante-quotidienne`) est déposée avec la même garde. Version active : `b510be8a-e874-47cf-a09c-fb18fd1b7801`.

## Essais
- `node scripts/hermes-tache-n8n.mjs --verifier-409` → « OK : « faite » refuse une ligne a_faire et une seconde fin (409),
  accepte la ligne prise » (code 0), avant et après l'ajout de l'abandon.
- `node scripts/hermes-tache-n8n.mjs --test` → OK (boucle complète, ligne Slack) ; `--verifier-jeton` → OK.
- Filtre de l'abandon rejoué hors ligne sur trois lignes fabriquées : la figée (7 h) et celle sans date sortent, la récente (1 h)
  reste.
- Le 02/11 vers 9 h, une tâche d'essai réelle (n°17, essai-boucle) a traversé n8n → Orca → Hermes → n8n avec le nouveau client.
