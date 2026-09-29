# 026-220 — contre-vérification indépendante (nuit du 28/09)

- `node scripts/orchestre.mjs verifier 026-220` : **PASS** (avant et après les sabotages ; dernier passage 52 s, `verifier.log` finit par `verdict : PASS` / `code de sortie : 0`). Pas besoin de `verifier-isole.sh`.
- Trace antérieure : `echecs-attendus.md` (90/90 sabotages internes détectés). Les cinq sabotages ci-dessous sont nouveaux (fautes différentes de celles du tableau).
- Le juge n'est pas un test de présence : chaque partie exécute le témoin sur des cas (ventes, bornes, droits, sources, coût) et nomme le critère fautif.

## Méthode

Pour chaque sabotage : copie du fichier témoin dans le scratchpad, `sed` dans `scripts/fixtures/026-completude/temoin/`, relance de la commande `verifier` de l'en-tête (`node scripts/juges-026-completude-qa.mjs --preuve-echecs`), restauration par copie, `cmp` identique. Chaque faute a aussi été rejouée sur une copie du témoin avec `--partie=… --racine=` pour lire le critère seul.

## Sabotages

| n° | fichier du témoin | faute | code verifier | critère rougi | restauré |
|---|---|---|---|---|---|
| S1 | `presti/scripts/chef/lancer-experience.mjs` | condition `v.test === false` retirée (vente de test acceptée) | 1 (témoin 77/78) | EX-2 | oui |
| S2 | `presti/lib/agents/lectureFirecrawl.ts` | `PLAFOND_CAHIER = 1000` → `100000` | 1 | FC-4 | oui |
| S3 | `presti/lib/studio/voixFish.ts` | licence commerciale acceptée sans `source` | 1 | FA-5 | oui |
| S4 | `presti/scripts/chef/douleurs.mjs` | tendance dès 1 source (`>= 2` → `>= 1`) | 1 | DO-4 | oui |
| S5 | `orchestre/bin/cursor.mjs` | coût non nul toléré jusqu'à 100 (`cout !== 0` → `cout > 100`) | 1 | CU-2 | oui |

5/5 rougis sur le bon critère.

## Restauration

- Empreintes md5 du juge et de toutes les fixtures 026-completude : identiques à l'état d'avant (`HASH_IDENTIQUE`), `diff -r` témoin / copie témoin : identique.
- Les passages rouges avaient réécrit `echecs-attendus.md` ; le verifier final l'a régénéré vert (témoin code 0, 0 rouge).
