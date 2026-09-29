# 026-166 — contre-vérification du 29/09 (Claude Code)

Juge `scripts/studio-offre-qa.mjs` corrigé (SO-1, SO-2, SO-8 : voir `.orchestre/decisions.md`, ligne 026-166 du 29/09, commit 84ff24a1). Verdict : vert 8/8 sur l'arbre réel, `--temoin` vert, `verifier-final.mjs 026-166` PASS.

Sabotages réversibles rejoués après la correction (fichier sauvegardé, sabotage, juge, restauration, `cmp` identique, juge revenu vert) :

| # | Sabotage | Fichier | Pris par |
|---|---|---|---|
| 1 | `mode: 'payment'` → `mode: 'subscription'` | app/api/studio/commander/route.ts | SO-3 et SO-6 |
| 2 | encaissement sans `.eq('etat', 'brouillon')` | lib/studio/commandeServeur.ts | SO-5 |
| 3 | expiration du lien ignorée | lib/studio/offre.ts | SO-7 |
| 4 | `payment_intent_data.metadata` retiré | app/api/studio/commander/route.ts | SO-3 |
| 5 | « 490 » écrit dans un commentaire | app/cgu/page.tsx | SO-1 |
| 6 | « 490,00 » écrit dans un commentaire | app/cgu/page.tsx | SO-1 |
| 7 | `import('@/lib/studio/offre')` cassé | app/api/cron/repondeur/route.ts | SO-2 |
| 8 | `49000` en dur | app/studio/commander/[jeton]/page.tsx | SO-2 |

Faux positifs de SO-1 écartés par la correction : 14900 (lib/packPub.ts), 14901-PGP, tracés SVG, « 490 ms », notes, historique SQL.
