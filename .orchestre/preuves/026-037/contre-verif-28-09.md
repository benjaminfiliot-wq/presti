# 026-037 — contre-vérification du 28/09 (matin)

Objet : contre-vérifier la fiche 026-037 (statut VERT, `verifier` : `node scripts/orchestre.mjs verifier 026-037` → PASS · 431 s · JP-2, JP-3, JP-5, JP-7, JP-8, JP-9 verts, registre --lot=4), après les corrections annoncées dans `pour_claude` (garde `--reel` déjà réglée la nuit précédente ; `reel()` avec `fetchImpl` injectable + auto-contrôle OA-R/OB-R/PG-R ; `hebergement()` CP-H non bouché ; JP-9 rejouant les lots 1 à 3).

## 1. Relecture par Codex sur l'usine

```
cd /c/Users/benja/Documents/presti && node ../presti-ops/usine/revue-codex.mjs 026-037 --sabotages=4
```

Résultat : **NON JUGÉ (code 125)** — l'usine a refusé d'envoyer le paquet : contrôle de secrets déclenché par 3 occurrences du motif `sk-` dans des fichiers **hors du périmètre de 026-037** (`.orchestre/fait/026-041.md:72`, `scripts/agents-llm-qa.mjs:100` et `:101`). Aucun des fichiers de la fiche (`scripts/ops-acquisition-qa.mjs`, `scripts/juges-026-acquisition-preuve.mjs`) n'est en cause. Ce n'est pas un défaut de 026-037 mais un accroc de transport (faux positif sur un autre chantier) ; sans verdict de Codex, je suis passé aux sabotages maison comme demandé.

## 2. Quatre sabotages maison (réversibles, sur la PRODUCTION de la fiche — les scripts juges eux-mêmes, jamais `juges-026-acquisition-preuve.mjs`)

Méthode pour chacun : copie de sauvegarde des 3 fichiers dans le scratchpad avant tout changement → un remplacement d'une ligne unique (neutralise une comparaison ou un message, sans toucher à la structure) → relance du critère concerné (verifier complet de la fiche pour S1 et S4 ; l'auto-contrôle direct du juge visé, exactement la commande que JP-3 lance elle-même, pour S2 et S3, pour limiter le temps machine) → restauration depuis la sauvegarde → sha256 comparé à l'état d'avant sabotage. Chaque sabotage vise une brique **ajoutée ou corrigée par cette session** (le banc `fetchImpl` de `reel()`, l'épreuve réelle de `hebergement()`), donc une brique que les contre-vérifications précédentes n'avaient pas encore mise à l'épreuve.

| # | Fichier saboté | Sabotage (une ligne, réversible) | Commande de contrôle | Verdict | Critère rougi — et lui seul |
|---|---|---|---|---|---|
| S1 | `scripts/ops-acquisition-qa.mjs` (fonction `reel`, branche socle) | `const faux = AGENTS.filter(...)…` → `const faux = []` (neutralise la comparaison de période dans le banc OA-R) | `node scripts/juges-026-acquisition-preuve.mjs --lot=4` (431 s) | code 1 | JP-3 : `ops-acquisition-qa --migration=socle --auto-controle` → **AC-OAR-1** « sabotage période NON repéré : OA-R reste vert ». JP-2, JP-5, JP-7, JP-8, JP-9 restent verts. |
| S2 | `scripts/confidentialite-prospection-qa.mjs` (fonction `jugerEnLigne`, CP-H1) | `if (empreinte(x.corps) !== empreinte(att))` → `if (false && …)` (neutralise la comparaison d'empreinte en ligne) | `node scripts/confidentialite-prospection-qa.mjs --auto-controle` (commande exacte lancée par JP-3) | code 1 | **AC-CPH-1A** « sabotage une autre empreinte en ligne NON repéré ». Les 26 autres épreuves (AC-TEMOIN-CP, AC-CP-1A…7D, AC-TEMOIN-CPH, AC-CPH-1B/1C/2/3/4/5/6) restent vertes. |
| S3 | `scripts/routes-acquisition-qa.mjs` (fonction `gardeJeton`) | `if (/\bawait\b/.test(avant)) e.push(…)` → `if (false && …)` (neutralise le refus d'un `await` avant le contrôle du jeton) | `node --import ./scripts/ts-loader.mjs scripts/routes-acquisition-qa.mjs --lot=recensement --auto-controle` (commande exacte lancée par JP-3) | code 1 | **AC-RA-2A** « sabotage await avant le contrôle du jeton NON repéré ». Les 22 autres épreuves (AC-TEMOIN-RECENSEMENT, AC-RA-1, AC-RA-2B/2C, AC-RA-3…12B) restent vertes. |
| S4 | `scripts/confidentialite-prospection-qa.mjs` (message de refus `--domaines`) | Le message de `refuser(...)` perd la mention « --hebergement --reel --confirmer-reel (026-162) » | `node scripts/juges-026-acquisition-preuve.mjs --lot=4` (431 s) | code 1 | JP-8 : « confidentialite-prospection-qa --domaines : code 2 (2 et renvoi vers --hebergement attendus) » — le code 2 tient, seul le renvoi manque. JP-2, JP-3, JP-5, JP-7, JP-9 restent verts. |

Chacun des 4 sabotages a rougi exactement le critère visé, et seulement celui-là — aucun effet de bord sur les 5 autres critères ni sur les dizaines d'autres épreuves d'auto-contrôle voisines.

## 3. Ce que je n'ai pas resaboté, et pourquoi

Le défaut bloquant d'origine (`--reel` sans `--confirmer-reel` → code 0) était déjà retesté en le rendant rouge par la session de la nuit (`contre-verif-nuit-28-09.md`, S2, JP-7 rouge, sha256 restauré). Je ne l'ai pas rejoué en resabotant le code : lever la garde expose potentiellement `reel()` à `lireEnvLocal()`, qui ne recopie une valeur de `.env.local` que si `process.env[...]` est *actuellement faux* — or le banc de JP-7 vide justement ces trois variables (chaînes vides, donc fausses) avant l'appel, ce qui les rendrait à nouveau chargeables depuis `.env.local` (vraies clés Supabase) si la garde ne coupe plus avant. J'ai vérifié statiquement que `refuser()` (qui appelle `process.exit(2)`) précède toujours, sans condition, toute exécution de `reel()` (ligne 1412 de `scripts/ops-acquisition-qa.mjs`, inchangée depuis la nuit), et les 4 passages du jour confirment JP-7 vert sans que j'y touche. Risque de toucher la vraie base en production jugé disproportionné pour regagner une preuve déjà faite proprement.

## 4. Restauration — sha256 avant/après, sur les trois fichiers touchés

| Fichier | sha256 avant tout sabotage | sha256 après restauration finale |
|---|---|---|
| `scripts/ops-acquisition-qa.mjs` | `2a04c7d2b97749dd81beba9730ec9537387aacd212fed82fe56c1d99ef6ff86d` | `2a04c7d2b97749dd81beba9730ec9537387aacd212fed82fe56c1d99ef6ff86d` — identique |
| `scripts/confidentialite-prospection-qa.mjs` | `e50478cda2d99230591bdcab6324a56baf8d501ee6cbf6c8df47970014d81c84` | `e50478cda2d99230591bdcab6324a56baf8d501ee6cbf6c8df47970014d81c84` — identique |
| `scripts/routes-acquisition-qa.mjs` | `979f3ef6aa894074635688a2c887cc13e8db2b7bcf4f3363151e4299bbf53f1a` | `979f3ef6aa894074635688a2c887cc13e8db2b7bcf4f3363151e4299bbf53f1a` — identique |

`scripts/juges-026-acquisition-preuve.mjs` (le juge de la fiche, hors périmètre du sabotage) n'a jamais été ouvert en écriture pendant cette contre-vérification.

Aucun marqueur de sabotage résiduel (`grep -rn SABOTAGE-CONTRE-VERIF-026-037 scripts/*.mjs` → rien).

## 5. Témoin final, après restauration complète

```
node scripts/juges-026-acquisition-preuve.mjs --lot=4
```
→ **PASS**, code 0 : JP-2, JP-3 (ops-acquisition-qa × 3 migrations, routes-acquisition-qa × 2 lots, confidentialite-prospection-qa — tous en auto-contrôle, dont AC-TEMOIN-OAR/OAR-1/OAR-2, AC-TEMOIN-OBR/OBR-1/OBR-2, AC-TEMOIN-PGR/PGR-1/PGR-2, AC-TEMOIN-CPH et les 6 sabotages CP-H), JP-5, JP-7, JP-8, JP-9 (lot 1 PASS, lots 2 et 3 pas encore peuplés, tolérés) tous verts.

## Verdict

**VERT.** Codex n'a pas pu juger (paquet refusé pour un motif étranger à 026-037), donc j'ai fait moi-même 4 sabotages réversibles de la production de la fiche (les scripts `ops-acquisition-qa.mjs`, `confidentialite-prospection-qa.mjs`, `routes-acquisition-qa.mjs`) ciblant spécifiquement les briques ajoutées cette nuit/ce matin (banc `fetchImpl` de `reel()` pour OA-R/OB-R/PG-R, épreuve réelle de `hebergement()` pour CP-H, message de renvoi `--domaines`) : chacun a rougi exactement le critère attendu du verifier de la fiche (JP-3 deux fois via des auto-contrôles distincts, JP-8 une fois), sans jamais toucher un autre critère. Les trois fichiers sont revenus octet pour octet à leur état d'avant sabotage (sha256 identiques), et le verifier complet de la fiche (`--lot=4`) est repassé PASS avec les six critères verts. Le juge teste bien de la substance (le banc réseau de `reel()`, le faux GitHub Pages de `hebergement()`, l'analyseur de source de `gardeJeton()`, le message exact de `--domaines`) et pas une simple présence de fichier.
