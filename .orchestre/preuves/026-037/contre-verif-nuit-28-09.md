# 026-037 — contre-vérification de la nuit du 28/09

Verdict : `node scripts/orchestre.mjs verifier 026-037` → **PASS** (354 s, lot 4 : JP-2, JP-3, JP-5, JP-7, JP-8 verts), sans recours à verifier-isole.

Trace existante : `sait-echouer/` (référence + auto-contrôles des six juges, dont AC-OA-2A, AC-RA-2A, AC-CP-1A…) et la section « lot 4 » d'`echecs-attendus.md`.

## Quatre sabotages nouveaux (réversibles)

Méthode : copie de sauvegarde dans le scratchpad, remplacement d'une chaîne unique, relance de `node scripts/juges-026-acquisition-preuve.mjs --lot=4`, restauration octet pour octet dans un `finally`, sha256 comparé.

| # | Fichier saboté | Sabotage | Verdict | Critère rougi |
|---|---|---|---|---|
| S1 | scripts/ops-acquisition-qa.mjs | le contrôle `security definer` de `securite()` neutralisé (`&& false`) | code 1 | JP-3 : AC-OA-2A « acq_reserver sans security definer » NON repéré |
| S2 | scripts/ops-acquisition-qa.mjs | la garde `--reel` sans `--confirmer-reel` sort en code 0 (avant tout accès base) | code 1 | JP-7 : `--reel` → code 0, code 2 attendu (socle, echanges) |
| S3 | scripts/confidentialite-prospection-qa.mjs | commentaire « relève du sequenceur » ajouté hors du bloc refusé | code 1 | JP-8 : « sequenceur » hors du bloc des chaînes refusées (ligne 197) |
| S4 | scripts/routes-acquisition-qa.mjs | le refus d'un `await` avant le contrôle du jeton neutralisé | code 1 | JP-3 : AC-RA-2A « le contrôle du jeton vient après un await » NON repéré |

Chacun a rougi sur le critère attendu, et seulement celui-là.

## Restauration

sha256 après les quatre passes, identiques à ceux d'avant :
- ops-acquisition-qa.mjs 11c14776…
- routes-acquisition-qa.mjs 979f3ef6…
- confidentialite-prospection-qa.mjs e50478cd…
- `git diff` de juges-026-acquisition-preuve.mjs : 0dd5e9cb… (inchangé, fichier non touché)

Le juge teste de la substance (analyseur de SQL et de source mis à l'épreuve par ses propres sabotages, codes de sortie, lecture des chaînes) et pas une simple présence : contre-vérification verte.
