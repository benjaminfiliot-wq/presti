# Bilan de la semaine AAAA-SS

<!--
Gabarit du bilan du lundi (026-238). Consigne : docs/agents/revue-hebdo.md, étape « Bilan » ; consigne du modèle :
docs/agents/chef-bilan.md. Juge : scripts/savoir-reflexion-qa.mjs --document=… --donnees=bilan-semaine.json.
Règles que le juge tient :
- 100 lignes au plus, ces cinq sections dans cet ordre, sous ces titres exacts ;
- SEULEMENT des nombres présents dans bilan-semaine.json, écrits en entier, mêmes exceptions que la revue (RV-4) : ni
  dates, ni heures, ni semaines AAAA-SS, ni identifiants comme 026-146 ou RV-1 ; aucun total, aucun pourcentage calculé ici ;
- une valeur absente s'écrit « non mesuré », jamais 0 ;
- de 1 à 3 propositions (### 1., ### 2., ### 3.), chacune avec une ligne « Source : » qui nomme une clé de
  bilan-semaine.json, et une ligne « Effet attendu : » ;
- ni adresse, ni lien.
Retirer ce commentaire dans le bilan.
-->

Semaine AAAA-SS, du lundi JJ/MM/AAAA au dimanche JJ/MM/AAAA, heure de Paris. Verdicts lus jusqu'au JJ/MM/AAAA
(executants.fraicheur de bilan-semaine.json).

## Résultats

| exécutant | PASS | FAIL | refusées | expirées | disjonctées |
|---|---|---|---|---|---|
| … | … | … | … | … | … |

Source : `bilan-semaine.json`, rubrique `executants`. Lignes illisibles : … (lignes_illisibles).

## Échecs et leurs leçons

- Les échecs les plus récents, tels que `echecs` les donne : fiche, critère, date.
- Leçons : … candidates, … validées, … rejetées cette semaine ; la plus vieille candidate a … jours (ou « non mesuré »).
- Source : `bilan-semaine.json`, rubriques `echecs` et `lecons`.

## Coûts

- Coût du mois : … € ; agents en pause : … ; disjoncteurs ouverts : … (ou « non mesuré »).
- Source : `bilan-semaine.json`, rubriques `couts` et `quotas`.

## Savoir et recherches

- Recherches : … au total, … avec le web, … avec Perplexity, … refusées, … crédits (ou « non mesuré »).
- Passages du savoir liés aux premiers échecs : ceux de `savoir_lie` (ou « non mesuré »).
- Source : `bilan-semaine.json`, rubriques `recherches` et `savoir_lie`.

## Propositions au chef d'entreprise

Jamais appliquées sans lui : Benj lit, tranche, et Claude Code exécute ce qu'il retient.

### 1. <la proposition la plus utile>

Une ou deux phrases de raison, avec seulement des nombres de bilan-semaine.json.
Source : `bilan-semaine.json` › `<clé>`.
Effet attendu : ce qui change si elle est faite.

### 2. <la suivante, facultative>

Raison.
Source : `bilan-semaine.json` › `<clé>`.
Effet attendu : …
