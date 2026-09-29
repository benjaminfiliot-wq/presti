# 026-162 : contre-vérification du 29/09/2026 (4 sabotages réversibles)
Chaque sabotage : fichier modifié, juge rejoué, fichier restauré octet pour octet (empreinte avant = après). Le juge est lancé avec le substitut de gh décrit dans publication.md.

## S1 verdict contraire à la base
- Fichier : `docs/agents/meta-ads-archive-conditions.md` ; sabotage : la ligne finale passe à PERMIS alors que la base dit REFUSE
- Résultat du juge :
```
❌ CP-H6 ads_archive.permis = false, le document dit PERMIS
confidentialite-prospection-qa --hebergement : FAIL — CP-H6
```
- Restauré : oui, empreinte identique

## S2 adresse de notice fausse
- Fichier : `lib/agents/acquisition/contrat.ts` ; sabotage : NOTICE_URL pointe un dépôt inexistant
- Résultat du juge :
```
❌ CP-H1 notice : https://benjaminfiliot-wq.github.io/presti-notice-x/ → 404 ; notice : empreinte 70d613e3acfb… ≠ fichier du dépôt 6c3ae8152eb0… ; mentions : https://benjaminfiliot-wq.github.io/presti-notice-x/mentions-
❌ CP-H2 les mentions en ligne sans « Benjamin Filiot » ; les mentions en ligne sans « entrepreneur individuel » ; les mentions en ligne sans « 109 411 348 » ; les mentions en ligne sans « 1 rue du Brouage, 17230 Marans »
❌ CP-H4 notice : une ressource d'un autre hôte (help.github.com) ; notice : une ressource d'un autre hôte (githubstatus.com) ; notice : une ressource d'un autre hôte (twitter.com) ; mentions : une ressource d'un autre hôte (
❌ CP-H5 date du commit publié de presti-notice illisible (gh api)
confidentialite-prospection-qa --hebergement : FAIL — CP-H1, CP-H2, CP-H4, CP-H5
```
- Restauré : oui, empreinte identique

## S3 G3 absent
- Fichier : `.orchestre/decisions.md` ; sabotage : la ligne « G3 fait » retirée
- Résultat du juge :
```
❌ CP-H5 G3 absent : la notice dirait vrai trop tôt
confidentialite-prospection-qa --hebergement : FAIL — CP-H5
```
- Restauré : oui, empreinte identique

## S4 citation de plus de 15 mots
- Fichier : `docs/agents/meta-ads-archive-conditions.md` ; sabotage : une citation de 16 mots ajoutée
- Résultat du juge :
```
❌ CP-H6 une citation de 16 mots (15 au plus)
confidentialite-prospection-qa --hebergement : FAIL — CP-H6
```
- Restauré : oui, empreinte identique

