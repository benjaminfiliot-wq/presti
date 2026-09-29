# Bilan de la semaine 2026-39

Semaine 2026-39, du lundi 21/09/2026 au dimanche 27/09/2026, heure de Paris. Verdicts lus jusqu'au 28/09/2026
(executants.fraicheur).

## Résultats

| exécutant | PASS | FAIL | refusées | expirées | disjonctées |
|---|---|---|---|---|---|
| codex | 4 | 6 | 1 | 1 | 0 |
| claude-code | 3 | 3 | 0 | 0 | 1 |
| ag-essai | 0 | 1 | 0 | 0 | 0 |

Source : `executants`. Lignes illisibles : 2 (lignes_illisibles).

## Échecs et leurs leçons

- Le plus récent : la fiche 099-26, critère SVL-10, le 27/09/2026 (echecs).
- Leçons : 3 candidates, 2 validées, 2 rejetées ; la plus vieille candidate a 17 jours (lecons).
- Source : `echecs` et `lecons`.

## Coûts

- Coût du mois : 37.5 € ; agents en pause : 2 ; disjoncteurs ouverts : 2.
- Source : `couts` et `quotas`.

## Savoir et recherches

- Recherches : 5 au total, 2 avec le web, 1 avec Perplexity, 1 refusée, 8 crédits.
- Passages du savoir liés aux premiers échecs : non mesuré (savoir_lie).
- Source : `recherches` et `savoir_lie`.

## Propositions au chef d'entreprise

Jamais appliquées sans le chef d'entreprise : Benj tranche, Claude Code exécute ce qu'il retient.

### 1. Relire l'échec le plus récent

Le critère SVL-10 a échoué sur la fiche 099-26 : l'étape Leçons manquait à la revue.
Source : `bilan-semaine.json` › `echecs`.
Effet attendu : une consigne relue et corrigée.

### 2. Trier les leçons candidates

Trois leçons candidates attendent, la plus vieille depuis 17 jours.
Source : `bilan-semaine.json` › `lecons`.
Effet attendu : moins de leçons en attente à la prochaine revue.
