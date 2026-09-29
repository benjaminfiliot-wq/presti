# Contre-vérification de 026-206 (29/09/2026)

`node ../presti-ops/usine/revue-codex.mjs 026-206 --sabotages=4` : code 3 (quota de l'abonnement ChatGPT épuisé jusqu'au
03/10 18:01). Repli prévu : quatre sabotages faits par Claude Code, sur des copies de la migration (racines de scratchpad,
`--racine=`), jamais sur le dépôt. Six ont été faits.

## Le juge de la fiche (`contenu-qa --partie=sql`) contre six sabotages

| Sabotage | Code | Critère rouge |
|---|---|---|
| S1 « publie » retiré de la contrainte de statut | 1 | SQ-3 « statut publie absent de la contrainte » |
| S2 accord individuel non exigé (`accord_decision_id is not null` remplacé par `true`) | 1 | SQ-3 « accord_decision_id non exigé » |
| S3 RLS retirée sur `contenu_posts` | 1 | SQ-4 « RLS absente sur contenu_posts » |
| S4 `grant insert` accordé à anon | 1 | SQ-4 « une écriture publique est accordée » |
| S5 table `contenu_idees` absente | 1 | SQ-2 « table contenu_idees absente » |
| S6 `revoke all` des tables retiré | **0** | aucun : le critère SQ-4 se contente d'un `revoke all … from … anon` n'importe où dans le fichier, et les `revoke` des fonctions le satisfont |

Témoin vert (`--temoin`) : code 0. Migration réelle : code 0.

**Faiblesse du juge (026-204, hors périmètre de cette fiche, donc non corrigée ici)** : SQ-4 ne voit pas la disparition du `revoke`
des tables. Elle est rattrapée par l'essai à sec (cas « anon et PUBLIC n'ont aucun droit de table ») : avec S6 sur la copie locale,
4 cas échouent. À signaler au chef pour durcir SQ-4 (un `revoke all on <table> … from … anon` par table).

## Le comportement contre douze mutations (essai à sec, copie locale PGlite + vraies 0096-0098)

L'essai (105 cas) est rejoué sur la migration mutilée ; chaque mutation doit faire échouer au moins un cas :
accord sans contrôle du statut (8 échecs), sans la portée (7), sans le choix (12), sans la cible exacte (13), sans l'expiration de
7 jours (6), ligne fermée ignorée (1), suspension ignorée (3), chiffre sans source (1), seuil de 0,5 retiré (1), déclencheur des
publications retiré (le premier doublon plante l'essai), « non mesuré » autorisé avec valeur (3), ventes affichées comme certaines (2).
Deux défauts réels ont été trouvés par cette chaîne avant la base : un `CASE` dans un `IF` plpgsql (le premier `THEN` coupait
l'expression) et une répétition d'expression régulière au-delà de 255 ; les deux sont corrigés dans la migration.

## Le cas de refus vérifiable que la fiche exige

- Accord de Benj : « publication : sans accord, même ligne approuvée, elle reste fermée », « accord : choix refuser n'ouvre rien »,
  « un défaut appliqué à l'échéance n'ouvre rien », « portée argent », « plus de 7 jours », « tranchée après son échéance »,
  « autre cible », « retouche : l'ancien accord ne vaut plus » ; aucun ne passe par un score.
- Provenance d'une affirmation chiffrée : « chiffre visible sans affirmation sourcée : fermé », « affirmation refusée par Laya »,
  « Laya indisponible (panne) : fermé », « pass mais probabilité 0,4 : fermé », « affirmation sans source refusée ».
