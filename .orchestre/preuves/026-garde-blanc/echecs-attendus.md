# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:gblanc:debut -->
## Lot gblanc — fiche 026-garde-blanc — référence `00f0ab5`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=gblanc` le 2026-09-30T21:11:44Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-gblanc`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| garde-blanc-qa | GB-1 | 1 | ❌ GB-1 271 occurrence(s) de la marque de l'éditeur dans 31 fichier(s) : public/sites-demo/_kit/kit.js:264 « e. Chez un vrai artisan, c'est la messagerie Presti. » ; public/sites-demo/carreleur/contenu.json:900 « ctive présentée dans le cadre de la solution Presti.", » ; public/sites-demo/carreleur/m | PASS, code 0 (GB-1, GB-2, GB-3, GB-4, GB-5, GB-6, GB-7) | PASS, code 0, 7 critères verts | 27/27 (gabarit-pub-presti → ❌ GB-1, pied-prepare-par-presti → ❌ GB-1, modele-exempte-prestiapp → ❌ GB-1, generateur-retire → ❌ GB-1, credit-modifie-par-presti → ❌ GB-2, credit-fondateur → ❌ GB-2, credit-de-page-presti → ❌ GB-2, credit-genere-fondateur → ❌ GB-2, mentions-sans-mediateur → ❌ GB-3, mentions-siren-vide → ❌ GB-3, mentions-sans-hebergeur → ❌ GB-3, mentions-directeur-fondateur-presti → ❌ GB-3, generateur-mentions-sans-mediateur → ❌ GB-3, courrier-adresse-presti → ❌ GB-4, courrier-reply-to-editeur → ❌ GB-4, courrier-repli-sur-la-plateforme → ❌ GB-4, courrier-nom-de-la-plateforme → ❌ GB-4, appelant-nom-vide → ❌ GB-4, appelant-repli-presti → ❌ GB-4, titre-zone-alentours → ❌ GB-5, h1-zone-rayon → ❌ GB-5, h1-reprend-le-telephone → ❌ GB-5, telephone-cliquable → ❌ GB-6, generateur-telephone-cliquable → ❌ GB-6, portee-sans-courriel → ❌ GB-7, portee-sans-generation → ❌ GB-7, portee-sans-site → ❌ GB-7) |
<!-- lot:gblanc:fin -->
