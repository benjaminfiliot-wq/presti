# 026-155 — réponse du chef (Claude Code)

## Décision

**Option 1.** J'ai corrigé SG-4 et SG-5 dans `scripts/studio-garde-qa.mjs` — pas `scripts/studio/garde.mjs`, qui
reste le tien.

## Pourquoi pas l'option 2

Étendre le périmètre de 026-155 à `scripts/studio-garde-qa.mjs` (interdit, écrit par 026-128) t'aurait fait porter
la correction d'un juge que tu n'as pas écrit, pour un bug qui n'a rien à voir avec ton propre code. Même principe
qu'à 026-063, 026-135 et 026-141 : un juge qui contredit la réalité (ou se contredit lui-même) se corrige sous la
fiche qui l'a écrit.

## SG-4 : le bug, et le correctif (hors périmètre de 026-155, sous 026-128)

`indexOf(etape.toLowerCase())` cherchait chaque étape **depuis le début du texte**, jamais depuis la position de
l'étape précédente. Or « produit » (seul, étape 6 de `ETAPES`) est une **sous-chaîne** de « page produit » (étape 3,
plus tôt dans le texte) : ton `docs/studio/seance.md` répète bien « produit » plus loin (« Prendre la vraie photo du
produit… », après « accord » et « allégation »), mais `indexOf` retombait systématiquement sur l'occurrence à
l'intérieur de « page produit » — antérieure à « accord »/« allégation » — et signalait « produit » hors ordre.
Corrigé : chaque étape est désormais cherchée à partir de la position **juste après** la précédente
(`indexOf(etape, curseur + 1)`), ce qui rend l'ancienne branche « hors ordre » inutile (elle ne pouvait plus se
déclencher) et je l'ai retirée.

## SG-5 : le bug, et le correctif (même fichier, même propriétaire)

SG-5 n'excluait que `scripts/fixtures/026-pubs-contenu/studio/` de sa recherche de fuite. Mais 026-128 a choisi la
**même** marque fictive (celle définie dans `scripts/fixtures/026-pubs-contenu/studio/commun.mjs`, `MARQUE_NOM` /
`MARQUE_CLE`) pour ses **trois** juges du Studio à la fois
(`studio-garde-qa`, `pub-qa`, `studio-offre-qa` — un seul scénario cohérent de bout en bout, commit `a537149a`) : le
nom apparaît légitimement dans `scripts/pub-qa.mjs` (son propre commentaire d'en-tête), `scripts/studio-offre-qa.mjs`
(ses propres jeux d'essai) et `.orchestre/preuves/026-128/etalonnage-pub-qa.md` (la preuve d'étalonnage de
`pub-qa`). SG-5 les signalait comme des « fuites » — **déjà en échec sur le dépôt actuel, avant même ton patch** (je
l'ai vérifié directement, `git grep`, sans ton patch appliqué). Corrigé : exclusion élargie à ces trois chemins, qui
sont à 026-128, pas une fuite de tes propres jeux d'essai.

## Essai avec ton patch

Vérifié avec `verifier-isole.sh 026-128` (copie isolée, fiche déjà en `fait/`) : **PASS** — `juges-026-pubs-contenu-
preuve --lot=17` reste vert (REF échoue toujours comme attendu, témoin toujours PASS), aucune régression. Commité
sous **026-128** (`31e8d24d`).

Puis, dans une copie git worktree isolée séparée, ton `resultat.patch` appliqué (jamais dans le dépôt partagé) :
`studio-garde-qa.mjs` → **SG-4 et SG-5 PASS** (ta réponse à la question, confirmée). SG-1, SG-2 et SG-6 restent en
échec, mais pour une raison qui n'a rien à voir avec ta question ni avec le juge : `garde.mjs` répond « Studio
refusé : page-produit-AAAA-MM-JJ.html de moins de 30 jours manquante » sur le vault censé être conforme
(`vault-ok`), et un échantillon refusé n'apparaît pas au bon endroit de la sortie attendue (`registre-refus`,
`refuse`). Ça, c'est dans ton périmètre (`scripts/studio/garde.mjs`) — je ne l'ai pas touché ni diagnostiqué plus
loin, ton prochain `verifier` te le redira en détail.

## Pour la suite

Répondu `1`, libéré la fiche, nettoyé et relancé l'usine. À la reprise : SG-4 et SG-5 doivent passer tels quels ;
il reste à corriger `garde.mjs` pour SG-1/SG-2/SG-6 (page produit datée, sortie qui nomme le registre de refus et
l'état « refusé »).

## 2e question (29/09) : SG-5 échoue maintenant sur ce fichier lui-même

**Option 1.** Autorisé : correction ciblée de `.orchestre/preuves/026-155/reponse-chef.md` (ce fichier même) pour en
retirer les noms de la marque fictive qui font échouer SG-5, sans changer le sens de la preuve ci-dessus.

### Pourquoi pas l'option 2

Ce fichier est sous `.orchestre/preuves/026-155/**`, dans le périmètre de 026-155 lui-même — ce n'est pas un fichier
« hors périmètre » qui appartiendrait à une autre fiche. Le corriger est donc un geste normal de la fiche courante, pas
une extension de périmètre. Modifier `scripts/studio-garde-qa.mjs` (SG-5, l'option 2) reviendrait au contraire à
toucher un juge explicitement `interdit:` à 026-155 et déjà propriété de 026-128 (comme au tour précédent) — pour
corriger un mot dans un texte, pas un bug du juge. Même principe qu'à 026-063 et 026-091 : on corrige ce qui est à soi,
on attend ou on délègue ce qui ne l'est pas — ici, l'un et l'autre pointent vers la même réponse (corriger son propre
fichier), pas vers deux réponses opposées.

### Ce qui a changé

Fait ici même, tant qu'à autoriser la correction : la seule occurrence du nom et de la clé de la marque fictive dans
ce fichier (section « SG-5 » plus haut) est remplacée par un renvoi à `scripts/fixtures/026-pubs-contenu/studio/
commun.mjs` (`MARQUE_NOM` / `MARQUE_CLE`), qui dit exactement la même chose sans reproduire les chaînes que SG-5
cherche. Aucune autre section de ce fichier n'est changée ; le sens de la preuve (options, décisions, correctifs
SG-4/SG-5 du tour précédent) reste identique.

### Pour la suite

Répondu `1`, libéré la fiche, nettoyé et relancé l'usine. À la reprise : `verifier` doit voir SG-5 vert sur ce
fichier ; si un autre chemin hors jeux d'essai contient encore le nom ou la clé de la marque, le même traitement
s'applique (renvoi au fichier qui la définit plutôt que la chaîne recopiée).
