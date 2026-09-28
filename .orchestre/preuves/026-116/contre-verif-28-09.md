# Contre-vérification de 026-116 — 2026-09-28

Fiche : « les juges du Crieur » (`lib/crieur/juge.ts`, `jugerPublication`), verdict initial VERT (`node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20`, 2026-09-28T11:13:27Z, code 0, 84 s). Contre-vérificateur : agent Claude Code séparé, aucune ligne touchée hors `.orchestre/preuves/026-116/` et `.orchestre/travail/`.

## Moyen

1. **Relecture Codex sur l'usine** (économie de Claude), comme demandé :
   `node ../presti-ops/usine/revue-codex.mjs 026-116 --sabotages=4`
   → **code 125, NON JUGÉ**, en quelques secondes (le paquet a été refusé avant même d'atteindre l'usine, aucun sabotage tenté). Raison exacte (`executer.log`) :
   ```
   ✗ usine executer : contrôle du paquet, 3 problème(s) — rien n'est envoyé
       .orchestre/fait/026-069.md:42 : motif nom sensible : valeur (JSON, YAML, minuscules)
       lib/agents/llm.ts:82 : motif nom sensible : valeur (JSON, YAML, minuscules)
       scripts/vigile-qa.mjs:639 : motif URL avec identifiants (schéma://utilisateur:mot de passe@hôte)
   ```
   Les 3 motifs sont dans des fichiers **hors périmètre de 026-116** (jamais listés dans `perimetre` ni dans les `fichiers` de la fiche) : c'est un blocage préexistant du contrôle de paquet de `usine.mjs`, pas un défaut de 026-116. Aucun `verdict.json` ni `journal.json` n'a été produit (revue jamais partie). Cela confirme que « le paquet admet maintenant les sentinelles de test » (les jeux d'essai `crieur/etats/*.json` n'ont déclenché aucun rejet), mais qu'il reste bloqué par 3 motifs sans rapport avec cette fiche — à corriger séparément pour que Codex puisse un jour relire une fiche du dépôt entier.

2. **Sabotages moi-même**, faute de verdict Codex (code 125 → bascule prévue par la consigne). Cible : la **production**, `lib/crieur/juge.ts` (jamais `scripts/crieur-qa.mjs` ni `scripts/juges-026-pubs-contenu-preuve.mjs`, qui sont le juge). Pour chacun : sha256 avant → édition → `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20` (le verifier exact de la fiche, en entier) pour prouver que le **bon** critère rougit → détail via `node scripts/crieur-qa.mjs --partie=juge --temoin` (le même appel que le verifier utilise en interne, c'est lui que la fiche nomme « témoin ») → restauration octet pour octet depuis une copie de sauvegarde → sha256 après (identique) → témoin revert au vert. `.orchestre/preuves/026-116/sabotages/juge.ts.original` garde la copie de référence.

   sha256 de référence (avant tout sabotage, et après chaque restauration) :
   `e16b552cfbed3601c4e1c226a19c700ee2e6a88a36625189c4d30c57cfd2c20f  lib/crieur/juge.ts`

## Les 5 sabotages (4 exigés, 1 de marge)

| # | Sabotage (réversible, dans `jugerPublication`) | Critère attendu | `crieur-qa --partie=juge --temoin` avant restauration | Verdict du verifier de la fiche (`--lot=20`) | Après restauration |
|---|---|---|---|---|---|
| 1 | `PHRASE_AIMANT` : `.` → `!` en fin de phrase | CR-14 (constante exportée) | `FAIL CR-14 — PHRASE_AIMANT = "…site !", "…site." attendue ; facebook-aimant (conforme) refusée à tort … ; aimant-en-trop-linkedin : raisons ne portent pas aimant_en_trop (et 2 autre(s))` | ligne `crieur-qa --partie=juge` : **FAIL** (code 1) | sha256 identique · témoin `PASS CR-14` (code 0) |
| 2 | `if ((canal===… ) && aimantLeve && …)` → `if (false && …)` (aimant_absent neutralisé) | CR-14, raison `aimant_absent` | `FAIL CR-14 — aimant-absent-instagram (fautive « aimant_absent ») acceptée à tort ; raison aimant_absent jamais observée dans le corpus` | **FAIL** (code 1) | sha256 identique · témoin `PASS CR-14` |
| 3 | `if (canal==='instagram' && !media)` → `… && false` (media_invalide neutralisé pour Instagram sans média) | CR-14, raison `media_invalide` | `FAIL CR-14 — media-absent-instagram (fautive « media_invalide ») acceptée à tort` | **FAIL** (code 1) | sha256 identique · témoin `PASS CR-14` |
| 4 | Ajout `import fs from 'node:fs'` en tête (import non-type interdit) | CR-14, analyse statique (pureté) | `FAIL CR-14 — import non-type dans lib/crieur/juge.ts : import fs from 'node:fs'` | **FAIL** (code 1) | sha256 identique · témoin `PASS CR-14` |
| 5 | `if (f?.drapeau && drapeaux[f.drapeau]!==true)` → `… && false` (drapeau_baisse neutralisé) | CR-14, raison `drapeau_baisse` | `FAIL CR-14 — drapeau-baisse (fautive « drapeau_baisse ») acceptée à tort ; raison drapeau_baisse jamais observée dans le corpus` | **FAIL** (code 1) | sha256 identique · témoin `PASS CR-14` |

Pour chacun des 5 : le verifier complet de la fiche (`--lot=20`) a rougi **exactement** la ligne `crieur-qa --partie=juge` (jamais composer/route/horloge, jamais EA), avec en sortie le message CR-14 attendu ; après restauration, la même commande rend `crieur-qa --partie=juge — référence : code 1, FAIL CR-14 — lib/crieur/juge.ts absent ou vide (…) ; témoin : code 0` — identique à `verifier.log` du 28/09 11:13:27Z. `diff -q` entre `lib/crieur/juge.ts` restauré et la copie de sauvegarde : **identique**.

## Bruit sans rapport, à ne pas confondre avec un défaut de 026-116

Pendant les 5 cycles, la ligne `IMMOBILE` du verifier a été rouge à chaque passage, mais **jamais sur `lib/crieur/juge.ts` ni sur le périmètre de 026-116** : des fichiers sous `scripts/fixtures/026/savoir/socle/…`, `.orchestre/digest.md`, `.orchestre/verdicts.jsonl`, `scripts/usine-socle-qa.mjs`, `.orchestre/en-cours/026-135.*`, `.orchestre/fait/026-058.md`, `.orchestre/fait/026-062.md`, `.orchestre/fait/026-072.md`… apparaissaient et disparaissaient d'un passage à l'autre — signature d'autres sessions concurrentes qui écrivent dans le même dépôt (mémoire « Presti — sessions concurrentes »), pas de mon travail : mes seules écritures ont porté sur `lib/crieur/juge.ts` (restauré à chaque fois) et sur `.orchestre/preuves/026-116/`.

## Verdict de la contre-vérification

**VERT confirmé, avec une réserve hors périmètre.** Le juge d'exécution (`jugerPublication`, CR-14) résiste à 5 sabotages indépendants touchant 5 mécanismes distincts (la constante `PHRASE_AIMANT`, `aimant_absent`, `media_invalide`, `drapeau_baisse`, la pureté du source) : chaque fois, le verifier exact de la fiche rougit le bon critère avec le bon message, et redevient vert après une restauration prouvée octet pour octet (sha256). Le paquet de vérification lui-même (`echecs-attendus.md`, `verifier.log`) correspond à ce qui a été rejoué. Seule réserve, **hors périmètre de 026-116** : la relecture Codex sur l'usine n'a pas pu partir (code 125, contrôle de paquet, 3 motifs dans des fichiers d'autres fiches) — à traiter séparément, sans incidence sur le verdict de cette fiche.
