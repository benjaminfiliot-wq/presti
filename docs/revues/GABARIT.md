# Revue de la semaine AAAA-SS

<!--
Gabarit de la revue du lundi (A11). Consigne : docs/agents/revue-hebdo.md. Juge : scripts/revue-qa.mjs --document.
Règles que le juge tient :
- 120 lignes au plus, ces cinq sections dans cet ordre, sous ces titres exacts ;
- SEULEMENT des nombres présents dans revue.json, écrits en entier (jamais « 12k » ni « 1e3 ») : aucun total, aucun
  pourcentage, aucune moyenne calculée ici. Ne comptent pas : les dates valides, les heures HH:MM, les semaines AAAA-SS,
  les numéros de section et de liste qui se suivent, les identifiants comme 026-146 ou RV-1. Tout le reste se vérifie,
  y compris un chiffre dans du code ou un commentaire, une fraction, une fourchette et une durée (« 3 h 45 ») ;
- une valeur absente s'écrit « non mesuré », jamais 0 ;
- exactement trois décisions (### 1., ### 2., ### 3.), classées par euros en jeu, du plus gros au plus petit ;
  chacune porte un montant en €, pris dans revue.json, et une ligne « Source : ».
Retirer ce commentaire dans la revue.
-->

Semaine AAAA-SS, du lundi JJ/MM/AAAA au dimanche JJ/MM/AAAA, heure de Paris. Verdicts lus jusqu'au JJ/MM/AAAA à HH:MM
UTC ; état du JJ/MM/AAAA à HH:MM UTC (fraicheur.verdicts et fraicheur.etat de revue.json).

## Entonnoir

- Contactés : … ; réponses : … ; « oui » : … ; maquettes : … ; ventes : … (ou « non mesuré »).
- Source : la source que porte entonnoir dans revue.json.

## Argent et coûts

- Encaissé : … € ; coûts : … € ; marge : … € (ou « non mesuré »).
- Source : la source que porte argent dans revue.json.

## Exécutants

| exécutant | PASS | FAIL | tâches réussies | minutes médianes par réussite | quotas | expirées | disjonctées |
|---|---|---|---|---|---|---|---|
| … | … | … | … | … (ou « non mesuré ») | … | … | … |

Source : `revue.json`, rubrique `executants` (lue dans `.orchestre/verdicts.jsonl` et `.orchestre/agents.jsonl`).

## Échecs

- Par exécutant : ses FAIL, quotas, tâches expirées et disjonctions, tels que revue.json les donne.
- Lignes illisibles : … (lignes_illisibles).

## Trois décisions

### 1. <la décision qui engage le plus d'euros>

En jeu : … €.
Pourquoi : une ou deux phrases, avec seulement des nombres de revue.json.
Source : `revue.json` › <la clé d'où vient le montant>.

### 2. <la suivante>

En jeu : … €.
Pourquoi : …
Source : `revue.json` › <clé>.

### 3. <la dernière>

En jeu : … €.
Pourquoi : …
Source : `revue.json` › <clé>.
