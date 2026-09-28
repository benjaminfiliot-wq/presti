# Contre-vérification 026-004 — 28/09/2026

Fiche relue : `.orchestre/fait/026-004.md` (statut annoncé VERT). Verdict de cette contre-vérification : **VERT confirmé**, par sabotages manuels (Codex sur l'usine non jugé, voir ci-dessous).

## Moyen

1. **Codex sur l'usine d'abord** (économie de Claude), comme demandé :
   `cd presti && node ../presti-ops/usine/revue-codex.mjs 026-004 --sabotages=4`
   → **code 125 (pas jugé)**, avant tout envoi : `usine executer` refuse le paquet (8 problèmes détectés dans le bac), à cause de motifs `sk-` / « nom sensible : valeur » dans **`.orchestre/fait/026-041.md:72`** et **`scripts/agents-llm-qa.mjs:100-104`** — deux fichiers hors du périmètre de 026-004, préexistants dans l'arbre (non touchés par cette fiche ni par moi). Détail dans `.orchestre/travail/revue-codex/026-004/executer.log`. Rien n'est parti sur l'usine, donc aucun verdict Codex.
2. Code 125 → bascule prévue : **4 sabotages réversibles moi-même**, chacun sur un fichier de PRODUCTION lu par le juge (jamais sur `scripts/next16-qa.mjs` lui-même), chacun rougissant un critère précis du verifier exact de la fiche (`node scripts/next16-qa.mjs --preuve-echecs`), avec :
   - relevé du sha256 du fichier avant sabotage,
   - exécution du témoin (`--preuve-echecs`) pendant le sabotage → capture de la ligne FAIL exacte,
   - restauration du fichier depuis la copie de sauvegarde,
   - re-relevé du sha256 → comparaison identique,
   - exécution finale du témoin → retour au vert complet.
3. Témoin de référence (avant tout sabotage), rejoué indépendamment le 28/09 à 09:04:24Z : **PASS, code 0**, 9/9 lignes identiques à `.orchestre/preuves/026-004/verifier.log` (produit à 08:42:17Z par l'agent). Confirme que le PASS annoncé est reproductible, pas un artefact d'un seul run.

## Les 4 sabotages

| # | Fichier (hors périmètre `next16-qa.mjs`) | Édition | Critère rougi (ligne FAIL exacte du témoin) | Reste inchangé |
|---|---|---|---|---|
| S1 | `app/p/[slug]/icon.tsx` | `const { slug } = await params` → `const { slug } = params` (retrait du seul `await`) | `FAIL N16-10 est vert — FAIL N16-10 — app/p/[slug]/icon.tsx : pas de "await params"` | les 8 autres lignes PASS, y compris N16-11 |
| S2 | `app/p/[slug]/page.tsx` | ajout d'une ligne morte après l'usage légitime : `if (false) { headers() } // sabotage réversible 026-004` | `FAIL N16-11 est vert — FAIL N16-11 — app/p/[slug]/page.tsx : headers() sans await` | les 8 autres lignes PASS, y compris N16-10 |
| S3 | `scripts/site-commander-verifier.mjs` | `SENSIBLE = /^(...\|(middleware\|proxy)\.ts$)/` → retrait de `\|proxy` dans l'alternative | `FAIL scripts/site-commander-verifier.mjs contient le repli middleware/proxy` | les 8 autres lignes PASS |
| S4 | `scripts/constructeur-ferme-qa.mjs` | `path.join(R, 'proxy.ts')` → `path.join(R, "proxy.ts")` (guillemets doubles, motif REPLIS_ATTENDUS exige des guillemets simples) | `FAIL scripts/constructeur-ferme-qa.mjs contient le repli middleware/proxy` | les 8 autres lignes PASS |

Chaque sabotage a été testé **seul** (les 3 autres fichiers dans leur état d'origine), puis restauré avant le suivant. Dans les 4 cas, le témoin (`node scripts/next16-qa.mjs --preuve-echecs`) est ressorti en **code 1**, avec exactement la ligne attendue en `FAIL` et toutes les autres lignes en `PASS` — la fiche annonce bien le bon critère pour chaque fichier qu'elle prétend couvrir, et le juge ne se contente pas d'un texte figé : il lit vraiment le fichier vivant à chaque run (`fs.readFileSync`, pas de cache).

## Restauration — sha256 avant sabotages vs après restauration complète (identiques)

```
app/p/[slug]/icon.tsx                  c7e3c7bbb696f37fb3871d4e98db05410e26b3993cf6e2bbbdf0afa34c7b07c8
app/p/[slug]/page.tsx                  dfa5a58a5d48c0d2ab775a40012f9bf9958b9190d374158540a831ba59ea6654
scripts/site-commander-verifier.mjs    a6fa59a5d1d0cf4c63a36481daa91214f78d78ce9d9d30c92a5331849f95d0f2
scripts/constructeur-ferme-qa.mjs      02a77cae1a824d4d150a195f689d0dd22fa91ba1eb5747fe3d30cdd8006749a5
scripts/parcours-commande-qa.mjs       1ebe944fd466deae136e83c371a13a083558dfb09fe82424079ac92a5780980a  (jamais touché, témoin de non-régression)
scripts/domaine-perso-e2e.mjs          f4cdcd469be377eaf55ae211a39ab253954508c047a30e08b36702733260d1ca  (jamais touché, témoin de non-régression)
scripts/next16-qa.mjs                  46b31641443ebcf25045c9eb8396d6260e51991decdabd689a745a81ddcad410  (le juge — jamais sabotable, jamais touché)
```

`diff sha256-avant.txt sha256-apres.txt` (dans le scratchpad de session) → **vide, identique octet pour octet** sur les 7 fichiers.

Témoin final (après restauration des 4 sabotages), rejoué le 28/09 à 09:19:32Z : **PASS, code 0**, les 9 lignes identiques au témoin de référence du début.

## Ce que ça établit

- Le PASS de la fiche n'est pas un vert de façade : quand N16-10, N16-11, ou le repli de deux des quatre scripts adaptés sont réellement cassés en production, le verifier exact de la fiche (`--preuve-echecs`) les détecte individuellement et échoue au bon endroit, sans faux négatif ni faux positif croisé (jamais deux critères rougis à la fois par un seul sabotage ciblé).
- Aucun fichier n'est resté modifié hors `.orchestre/preuves/026-004/` et `.orchestre/travail/` : sha256 identiques, `git status` sur les 7 fichiers inchangé par rapport à l'état de début de session (les `M` déjà présents sur `constructeur-ferme-qa.mjs`, `domaine-perso-e2e.mjs`, `parcours-commande-qa.mjs`, `site-commander-verifier.mjs` sont ceux du travail de la fiche elle-même, non-commité, antérieurs à cette contre-vérification).
- Rien n'a été commité.

## Défaut établi (mineur, hors verdict)

- `revue-codex.mjs` (l'outil de contre-vérification lui-même) refuse tout le paquet dès qu'un motif `sk-`/« nom sensible » traîne n'importe où dans l'arbre non-commité, même hors périmètre de la fiche relue (`.orchestre/fait/026-041.md`, `scripts/agents-llm-qa.mjs`) : la revue Codex de 026-004 était **impossible à obtenir** tant que ces deux fichiers restent non-commités et non nettoyés, sans rapport avec la qualité de 026-004 elle-même. Signalé, non corrigé ici (hors périmètre de cette fiche et de mon mandat : ne toucher que `.orchestre/preuves/026-004/` et `.orchestre/travail/`).
