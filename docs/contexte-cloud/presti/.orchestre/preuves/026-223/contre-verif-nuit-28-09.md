# 026-223 — contre-vérification indépendante (nuit du 28/09)

Verifier : `node scripts/orchestre.mjs verifier 026-223` → PASS 12/12 (FC-0…FC-10, FC-R), code 0, avant et après les sabotages.
Aucune trace de sabotages préexistante dans ce dossier (seulement avant.txt, verifier.log) : sabotages refaits ici.

Méthode : copie de `lib/agents/lectureFirecrawl.ts` (blob a6e3f42) dans le scratchpad, un remplacement de chaîne par sabotage,
`node scripts/juges-026-completude-qa.mjs --partie=firecrawl`, restauration depuis la copie. Juge comportemental (doublures
firecrawl/robots/repli injectées, compte d'appels), pas un test de présence.

| # | Sabotage de la production | Code | Critère rougi |
|---|---|---|---|
| 1 | test robots remplacé par `if (false)` | 1 | FC-3 (Disallow: / → 1 appel Firecrawl) |
| 2 | borne `c.plafond > 100000` au lieu de 1 000 | 1 | FC-4 (borne au-delà de 1 000 : appel) |
| 3 | 429 → refus au lieu du repli 026-020 | 1 | FC-6 (0 repli, 1 attendu) |
| 4 | contrôle de redirection réduit à `^https?:` | 1 | FC-7 (rendu avec autre-domaine) |
| 5 | contrôle d'hôte réduit à `^https?:` | 1 | FC-2 (127.0.0.1 : robots appelé) |
| 6 | provenance inventée `meta.sourceURL \|\| meta.url \|\| url` | 1 | FC-5 (page sans provenance rendue) |

6/6 sabotages rougis sur le critère visé. Restauration : `cmp` identique à la copie, `git diff --quiet` propre sur le fichier,
blob toujours a6e3f42. Aucun autre fichier touché.
