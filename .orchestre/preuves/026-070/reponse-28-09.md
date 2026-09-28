# 026-070 — décision du 28/09 sur la question de Codex

## La question

Codex avait produit les sept modules de 026-070 avec `EQUIPAGE` à 25 identités (la décision du chef d'entreprise du 27/09,
en tête de la fiche) mais le juge `scripts/station-logique-qa.mjs` (écrit en 026-067, avant cette décision) en attendait
encore 18 (`EQUIPAGE_ATTENDU` dans `scripts/fixtures/026-pilotage/s/commun.mjs`). EQ-1 était donc rouge, seul critère en
échec sur 27. Deux options posées : (1) mettre le juge à jour sur les 25 identités, ou (2) réduire `EQUIPAGE` à 18.

## Décision (Claude Code, chef de l'écosystème)

**Option 1** : le juge de 026-067 (`scripts/station-logique-qa.mjs`, EQ-1 et ce qui en dépend) doit attendre l'équipage de
la décision du 27/09, soit 25 identités. C'est la fiche 026-070 elle-même qui fait foi (sa section « Décision du chef
d'entreprise (27/09) » prime sur le reste du texte), pas le juge écrit avant elle. **026-251 portera plus tard l'équipage
à 28** (Vigile, SAV, qualité) : ce n'est pas anticipé ici, EQ-7 (nouveau critère annoncé par la fiche pour cette même
extension) n'a pas été ajouté — il reste pour la fiche qui l'écrira.

## Correction apportée au juge

Deux fichiers touchés, tous deux dans le périmètre écrit par Claude Code en 026-067 :

1. **`scripts/fixtures/026-pilotage/s/commun.mjs`** — `EQUIPAGE_ATTENDU` passe de 18 à 25 entrées : les sept nouvelles
   identités (`facteur_usine` → envois, `livreur_usine` → usine, `studio` → studio, `usine` → machines, `contenu` →
   audience, `pont_telegram` → securite, `douleurs` → observatoire), recopiées de la table de la fiche 026-070 (et
   identiques à `descriptifs` dans le `lib/pilotage/equipage.ts` livré par Codex — une seule source de vérité).
2. **`scripts/station-logique-qa.mjs`** — les deux messages d'échec d'EQ-1 qui disaient « dix-huit » disent maintenant
   « vingt-cinq » (texte seul, aucune logique changée).
3. **`scripts/fixtures/026-pilotage/s/temoin/lib/pilotage/equipage.ts.temoin`** — l'implémentation de référence du lot s
   (026-067), qui n'avait que 18 titulaires, gagne les sept mêmes entrées avec la même salle (libellés informatifs,
   non vérifiés mot à mot par EQ-1). Sans cette correction, le témoin du lot — donc le propre contrôle de 026-067 sur ce
   juge (JA-7, `station-logique-qa.mjs --temoin`) — serait devenu rouge après le changement d'`EQUIPAGE_ATTENDU`, alors
   qu'il est resté vert avant et après (voir preuve ci-dessous). Rien d'autre du lot s (routes, réunion) n'a été touché :
   hors du périmètre de cette décision.

Aucun fichier interdit n'a été touché (`scripts/orchestre.mjs`, `scripts/juges-026-pilotage-preuve.mjs`, `lib/pilotage/decisions.ts`
et les autres modules interdits par la fiche n'ont pas bougé).

## Preuve : le juge reste exigeant

Avant toute correction, la production livrée par Codex (patch appliqué) donnait **26/27**, seul EQ-1 rouge — confirmant
exactement le rapport de Codex (`.orchestre/preuves/026-070/verifier.log` conserve ce PASS final, pas ce FAIL initial ;
la sortie brute du FAIL initial a été observée dans cette session avant correction).

Après correction du juge, deux sabotages de la production livrée (`lib/pilotage/equipage.ts`, tel qu'appliqué par le
patch de Codex) ont été testés, chacun restauré ensuite octet pour octet (SHA-256 identique avant/après :
`e024a595c7d513a3a04c34d27eb9e2061b7a86527103ee528c601dffeff0ccad`) :

1. **Suppression d'une des sept identités nouvelles** (`douleurs`, retirée de `EQUIPAGE`) → **EQ-1 rouge** :
   « EQUIPAGE : … (24 noms, sans douleurs) ; les vingt-cinq noms de 026-070 (décision du chef d'entreprise du 27/09)
   attendus ».
2. **Mauvaise salle sur une identité existante** (`contenu` : `audience` → `securite`) → **EQ-1 rouge** :
   « EQUIPAGE.contenu.salle = securite, audience attendue ».

Le juge corrigé a aussi été rejoué sur son témoin (`station-logique-qa.mjs --partie=modules --temoin`, implémentation de
référence de 026-067 posée sur `lib/` du commit de base) : **PASS complet, 27 critères + SM-JEUX**, confirmant que la
correction du témoin (point 3 ci-dessus) garde 026-067 cohérent avec elle-même. La preuve générique complète de 026-067
(`node scripts/juges-026-pilotage-preuve.mjs --lot=s`, qui couvre aussi les juges de route et de réunion, sans rapport
avec cette décision) n'a pas été rejouée : lourde, hors du périmètre de cette question.

## Résultat sur 026-070

Patch de Codex appliqué (`git apply` propre, aucun fichier du périmètre n'avait bougé depuis la prise, base
`b308762e` = ancêtre du HEAD actuel sans divergence sur `lib/pilotage/`, `scripts/station-logique-qa.mjs` ni
`scripts/fixtures/026-pilotage/s/`). Après correction du juge :

```
node --import ./scripts/ts-loader.mjs scripts/station-logique-qa.mjs --partie=modules
station-logique-qa --partie=modules : PASS   (27/27, typecheck vert)
```

Fiche déplacée de `en-cours/` vers `fait/`, puis `node scripts/orchestre.mjs verifier 026-070` rejoué depuis `fait/` :
**PASS · 71 s · 640 lignes produites** (`.orchestre/preuves/026-070/verifier.log`). Les fichiers `.lock`, `.avant.txt` et
`.question.md` d'`en-cours/` ont été nettoyés automatiquement par `orchestre.mjs` à ce PASS final ; leurs copies restent
dans `.orchestre/preuves/026-070/` (`026-070.lock`, `avant.txt`, `question-codex-28-09.md`).

Point ouvert non traité ici (hors mandat) : les cinq paramètres que la fiche laisse à la confirmation de Benj (heure de
réunion 18 h, seuils de niveau, « mois » vs « 30 jours » pour l'argent de la barre, heures de nuit 20 h–7 h, paliers de
l'Usine 1/10/50) restent sans geste requis à la fabrication.
