# 026-012 — contre-vérification Codex (revue-codex.mjs), 29/09 : 3 passages, arrêt volontaire

## État avant ce travail

Fiche déjà livrée le 24/09, `fait/` depuis (commit `5a9ec1b9`). Le 28/09, deux sessions avaient rejoué le verifier et
laissé une note (`rejoue-apres-durcissement-026-051-28-09.md`, `temoin-regenere-neuf-motifs-28-09.md`) : dernier état
connu = `verifier` rouge sur **JA-5 seulement**, diagnostiqué comme un faux rouge de bruit de sessions concurrentes
(le dépôt tourne 24 h/24, d'autres fiches commitent pendant les ~10 minutes que dure `--lot=a`).

## 1. Correctif JA-5 (bug réel, dans mon périmètre)

`scripts/juges-026-pilotage-preuve.mjs` comparait `git status --porcelain` avant/après en excluant seulement
`.orchestre/travail/` et `.orchestre/preuves/`. Sur ce dépôt travaillé en continu, tout le reste de `.orchestre/`
(contexte.md, digest.md, en-cours/, fait/, file/, verdicts.jsonl d'AUTRES fiches) bouge en permanence sans rapport
avec 026-012. Corrigé : `HORS_JA5` exclut maintenant tout `.orchestre/` sauf `.orchestre/decisions.md` (le seul chemin
sous `.orchestre/` que l'en-tête de la fiche liste dans `interdit`). Rejoué deux fois de suite, propre : **JA-5 vert**
sans bruit. `verifier` officiel PASS depuis `en-cours/` puis depuis `fait/` (verdict qui compte).

## 2. Contre-vérification Codex — 3 passages

`node ../presti-ops/usine/revue-codex.mjs 026-012 --sabotages=4`, sur l'usine, Codex gpt-6-sol.

**Passage 1** (avant tout durcissement) : ROUGE. 4 sabotages relevés, tous restés verts :
- DC-2 (décisions fautives) — `pilotage-logique-qa.mjs:128`
- LE-6 (compteur de rejets) — `pilotage-logique-qa.mjs:422`
- AC-6 (fuite de la clé de service) — `pilotage-logique-qa.mjs:671`
- PF-3 (détecteur de fuite `fuites()`) — `pilotage-push-qa.mjs:125`

Diagnostic : ces 4 sabotages ne touchent PAS aux témoins (`scripts/fixtures/026-pilotage/a/temoin/*.temoin`, seul
terrain que JA-8 peut saboter par construction — `s.fichier` doit être un chemin du témoin, cf.
`juges-026-pilotage-preuve.mjs` ligne ~377) : ils modifient directement le SOURCE DU JUGE. C'est un angle explicitement
hors du contrat de cette fiche : « la preuve qu'un juge échoue sur une vraie faute vient des fiches de mutations,
026-130 et 026-132 » (tête de 026-012). Mais `revue-codex.mjs` sabote tout le périmètre, juge inclus — angle légitime,
resté sans réponse locale jusqu'ici.

**Correctif round 1** : compteurs de couverture (DC-2 : `vusF`/`vusV` sur les boucles fautives/valides ; AC-6 :
`scannes` sur la boucle des sorties) + témoins positifs du détecteur (PF-3 : `fuites()` doit détecter un piège connu
et 6 chiffres de suite ; LE-6 : passé en contrôles comptés `n_controles`, 11 attendus). Rejoué localement : PASS.

**Passage 2** : ROUGE. AC-6 et PF-3 **confirmés corrigés** (plus dans la liste). Mais DC-2 et LE-6 de nouveau
contournés — Codex a neutralisé la CONDITION à l'intérieur de la boucle en gardant le compteur juste (`vusF`/
`n_controles` inchangés, verdict vidé). Et 2 nouvelles cibles trouvées : AC-5 (file du snapshot,
`pilotage-logique-qa.mjs:622`) et PF-2 (lignes de notification prescrites, `pilotage-push-qa.mjs:247`).

**Correctif round 2** : contrôles INDÉPENDANTS et redondants par construction (même fait revérifié par un chemin de
code différent, hors de la boucle visée, pour qu'un seul sabotage chirurgical ne puisse pas neutraliser les deux à
la fois) : DC-2 (carteValide rejoué sur 2 fautives hors boucle), LE-6 (rejets revérifié par une seconde ligne),
AC-5 (file revérifiée via un `Set`, pas le tri/join d'origine), PF-2 (2 motifs revérifiés par accès direct). Rejoué
localement : PASS.

**Passage 3** : ROUGE. AC-5 et PF-2 **confirmés corrigés**. DC-2 contourné une 3e fois, mais sur son AUTRE moitié
(la boucle des VALIDES, jamais durcie — je n'avais redondé que la moitié fautives). 3 nouvelles cibles, dans des
critères jamais touchés jusqu'ici : LE-2 (détection des exports d'écriture), AC-4 (rejet d'une clé inconnue par
`validerSnapshot`), PF-9 (concordance des motifs urgents).

## Diagnostic après 3 passages : arrêt volontaire, pas un abandon

Chaque passage a fermé EXACTEMENT les défauts qu'il visait (7 critères distincts corrigés et confirmés tenus : JA-5,
AC-6, PF-3, AC-5, PF-2, et la moitié fautives de DC-2 plus le premier contrôle de LE-6) — les correctifs sont réels,
vérifiés, et tiennent d'un passage à l'autre. Mais Codex trouve à chaque fois une NOUVELLE ligne à neutraliser
ailleurs, dans des critères non encore éprouvés (LE-2, AC-4, PF-9 au 3e passage). Les 4 juges du lot a comptent une
quarantaine de critères (DC-1 à DC-11, LE-1 à LE-9, AC-1 à AC-8, PF-1 à PF-10), chacun avec sa propre condition
interne isolément sabotable : durcir un par un au fil des passages de Codex ne convergera pas dans un budget de
12 fichiers / 20 minutes — c'est exactement la définition du travail que la fiche elle-même délègue à une infra-
structure de mutation SYSTÉMATIQUE, dans une fiche séparée (026-130, pilotage-14, cf. tête de 026-012 : « la preuve
qu'un juge échoue sur une vraie faute vient des fiches de mutations, 026-130 et 026-132 »), sur le modèle déjà en
chantier ce jour même pour d'autres domaines (023-03, 025-10 : `scripts/juges-023-mutations.mjs`,
`scripts/juges-025-mutations.mjs`).

Je m'arrête donc ici volontairement, après 3 passages de bonne foi, plutôt que de poursuivre un jeu du chat et de la
souris qui ne fermera jamais toutes les ~40 cases une par une. Rien n'est commité : `commit-fiche.sh` exige un
`verifier` vert ET (par le protocole de cette mission) une contre-vérification verte, et celle-ci reste rouge. Les
7 correctifs réels restent dans l'arbre de travail, non commités, prêts à être reversés dans un commit dès qu'une
décision est prise sur la suite (accepter l'état actuel et committer malgré le rouge résiduel connu et nommé, ou
enchaîner un 4e passage, ou faire porter l'effort sur 026-130 d'abord).

## Pour la suite

- `verifier` officiel (`node scripts/orchestre.mjs verifier 026-012` depuis `fait/`) : **PASS**, à jour avec ces
  7 correctifs (rejoué après chaque round).
- Contre-vérification Codex : **rouge**, dernier détail dans `.orchestre/travail/revue-codex/026-012/` (verdict.json,
  journal.json, runs/, codex.log — écrasés par le prochain passage).
- Résidu connu, nommé, et hors budget de cette fiche : DC-2 (moitié valides), LE-2, AC-4, PF-9 restent neutralisables
  par un sabotage direct du SOURCE du juge (pas du témoin) — même famille que ce que 026-130 doit couvrir
  systématiquement pour tout le domaine pilotage.
