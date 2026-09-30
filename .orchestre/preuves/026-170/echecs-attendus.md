# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:k:debut -->
## Lot k — fiche 026-170 — référence `1c87006`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=k` le 2026-09-30T18:39:39Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-k`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| station-claw3d-qa --partie=provenance | CL-1 | 1 | ❌ CL-1 app/controle/station/moteur/claw3d/LICENSE-claw3d.txt absent (la notice MIT doit voyager avec le code copié) ; app/controle/station/moteur/claw3d/PROVENANCE.md absent | PASS, code 0 (CL-1, CL-2, CL-3, CL-4) | PASS, code 0, 4 critères verts | 6/6 (notice-absente → ❌ CL-1, classe-tailwind → ❌ CL-2, import-three → ❌ CL-3, fetch-externe-deuxieme → ❌ CL-3, phaser-charge-partout → ❌ CL-3, carte-charge-autre-chose → ❌ CL-4) |
| station-claw3d-qa --partie=verite,grille | CL-6 | 1 | ❌ CL-6 moteur absent : app/controle/station/moteur/entree.tsx n'existe pas sous /home/user/presti/.orchestre/travail/juges-026-pilotage/ref… | PASS, code 0 (CL-6, CL-15, CL-5, CL-7, CL-8) | PASS, code 0, 5 critères verts | 6/6 (between-cache → ❌ CL-6, reservee-prise-pour-destination → ❌ CL-15, reservee-ouverte-a-la-marche → ❌ CL-15, inactif-au-repos → ❌ CL-7, chiffre-peint-dans-le-decor → ❌ CL-8, hasard-de-la-page → ❌ CL-5) |
| station-claw3d-qa --partie=repos,garde,pixel,contexte | CL-9 | 1 | ❌ CL-9 moteur absent : app/controle/station/moteur/entree.tsx n'existe pas sous /home/user/presti/.orchestre/travail/juges-026-pilotage/ref… (rien n'est construit ni lancé) | PASS, code 0 (CL-9, CL-10, CL-13, CL-14) | PASS, code 0, 4 critères verts | 4/4 (pont-appele-a-chaque-lecture → ❌ CL-9, carte-avant-le-200 → ❌ CL-10, k-non-entier → ❌ CL-13, contexte-perdu-sans-reconstruction → ❌ CL-14) |
| station-claw3d-qa --partie=hygiene,csp,poids | CL-16 | 1 | ❌ CL-16 CHEMINS_APP_PRESTI ne porte pas l'alternative station\/.* ; sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json (« next », rewrite:/site/-/introuvable attendu) : les thèmes ne se servent jamais sur le domaine d'un artisan ; sur un hôte d'artisan, proxy() sert /station/them | PASS, code 0 (CL-16, CL-11, CL-12) | PASS, code 0, 3 critères verts | 3/3 (proxy-sans-station → ❌ CL-16, fetch-vers-un-hote-externe → ❌ CL-11, phaser-charge-partout → ❌ CL-12) |
<!-- lot:k:fin -->
