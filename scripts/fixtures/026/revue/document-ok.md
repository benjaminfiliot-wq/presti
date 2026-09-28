# Revue de la semaine 2026-38

Semaine 2026-38, du lundi 14/09/2026 au dimanche 20/09/2026, heure de Paris. Verdicts lus jusqu'au 22/09/2026 à 07:45 UTC ; état du 21 septembre 2026 à 05:00 UTC.

## Entonnoir

- Contactés : 60 ; réponses : 9 ; « oui » : 4 ; maquettes : 3 ; ventes : 1.
- Source : ops_etat : ops.envois et acq_ventes_froides, semaine en cours.

## Argent et coûts

- Encaissé : 1 250 € ; coûts : 37,5 € ; marge : 1 212,5 €.
- Source : ops_etat : commandes de site payées et ops.couts, mois en cours.

## Exécutants

| exécutant | PASS | FAIL | tâches réussies | minutes médianes par réussite | quotas | expirées | disjonctées |
|---|---|---|---|---|---|---|---|
| codex | 5 | 1 | 3 | 270 | 2 | 1 | 1 |
| antigravity | 3 | 1 | 2 | 75 | 0 | 0 | 0 |
| claude-code | 2 | 2 | 1 | non mesuré | 0 | 0 | 0 |
| gemini-cli | 1 | 0 | 1 | 40 | 0 | 1 | 0 |

Source : `revue.json`, rubrique `executants` (lue dans `.orchestre/verdicts.jsonl` et `.orchestre/agents.jsonl`).

## Échecs

- codex : 2 quotas, 1 tâche expirée, 1 disjonction ; ses 3 tâches réussies ont pris 270 minutes en médiane.
- claude-code : 2 FAIL sur la même tâche, aucun lancement connu pour mesurer sa durée.
- Lignes illisibles : 0.

## Trois décisions

### 1. Garder la vente de sites en tête

En jeu : 1 250 € encaissés ce mois.
Pourquoi : c'est la seule rentrée d'argent ; rien ne doit ralentir les maquettes (3 cette semaine).
Source : `revue.json` › `argent.encaisse_eur` et `entonnoir.maquettes`.

### 2. Couper une dépense

En jeu : 37,5 € de coûts ce mois.
Pourquoi : la marge reste à 1 212,5 € ; une dépense sans effet mesuré se coupe.
Source : `revue.json` › `argent.couts_eur` et `argent.marge_eur`.

### 3. Soulager codex

En jeu : 0 €, mais 2 quotas et 1 disjonction.
Pourquoi : codex porte 5 PASS sur la semaine ; ses quotas retardent les suivantes.
Source : `revue.json` › `executants.codex`.
