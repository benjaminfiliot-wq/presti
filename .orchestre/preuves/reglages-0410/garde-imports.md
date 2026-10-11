# Lot « garde des imports » : rendre impossible le défaut du 04/10 (audit C §2.1, §5.1, §5.7, R1)

Décision de Benj du 04/10 (~12 h, `.orchestre/decisions-chef-0410.md` D-0410-1) : les contrôles automatiques remplacent l'accord
individuel ; ce lot ne touche à aucun envoi, aucun drapeau, aucune variable de coût.

## Le défaut

`d7a1128f` commitait `lib/agents/acquisition/facteur.ts` et `porteurs/gmail.ts`, qui importent `./porteurs`, sans `porteurs.ts` (resté
non suivi sur le PC). `npm run typecheck` du hook lit le DISQUE : vert. Vercel lit git : `error TS2307: Cannot find module './porteurs'`,
build en ERROR, production figée jusqu'à la correction. Même classe de défaut le 28/09 (026-077 → vigieMeta.ts) et, trouvée par le balayage
du 04/10, `scripts/usine.mjs → ./usine-repartition.mjs` et `promo-src/hf/*` (régularisés par 7c4e3ead).

## Ce qui est fait

| Pièce | Quoi |
|---|---|
| `scripts/lib/imports-orphelins.mjs` | Tout import relatif (`./x`, `../x`) ou `@/x` d'un fichier de code suivi ou indexé doit se résoudre vers un fichier suivi ou indexé. Lit l'INDEX (`git ls-files -s` + `git cat-file --batch`), pas le disque. Scanner de TypeScript (`preProcessFile`) : un import écrit dans une chaîne, un gabarit ou un commentaire n'en est pas un (les juges du dépôt en écrivent des dizaines). Trois raisons nommées : HORS-GIT (le défaut du 04/10), INTROUVABLE, CASSE (Windows trouve `./Porteurs`, Linux/Vercel non). Écartés, chacun pour sa raison : `.orchestre/`, `docs/contexte-cloud/`, `reprise-cloud/`, `_to_delete/`, `presti-debug-apk/`, `mobile/`, et les témoins que les juges copient dans un bac (`scripts/fixtures/**/temoin(s)/`, `temoin-*.mjs`). |
| `scripts/garde-commit.mjs` | Appelle la garde (`importsOrphelins()`), donc `.husky/pre-commit` (déjà branché) la lance à chaque commit. Fail-closed : sans `typescript` ou sans lecture de git, le commit est refusé. Sous `git commit -- <chemins>`, git donne au hook un index temporaire (HEAD + ces chemins) : la garde juge EXACTEMENT le commit, y compris quand la cible est indexée ailleurs. |
| `scripts/garde-imports-qa.mjs` | Le juge. GI-1 témoin (9 formes d'import, tout suivi : 0 orphelin, 9 imports comptés) ; GI-2 le défaut du 04/10 reproduit ; GI-3 les 9 formes vers un fichier non suivi, toutes vues ; GI-4 INTROUVABLE / CASSE ; GI-5 « suivi OU indexé » (index accepte, HEAD refuse) ; GI-6 le bruit (chaîne, gabarit, commentaire) écarté, le vrai import vu ; GI-7 le vrai crochet git dans un dépôt jetable (`git commit -- f.ts` refusé HEAD inchangé ; `f.ts + porteurs.ts` passe ; commit sans rapport passe) ; GI-8 `HEAD` du dépôt réel : zéro orphelin ; GI-9 filtre de `deploiement-etat.mjs`. `--mutations` : 8 copies sabotées de la garde (M1 ne voit rien, M2 le disque tient lieu de git, M3 crochet débranché, M4 `@/` ignoré, M5 regex au lieu du scanner, M6 `scripts/` exempté, M7 casse non nommée, M8 filtre sans `error TS`), M0 = copie intacte verte. |
| `scripts/deploiement-etat.mjs` | Le filtre des erreurs de build (`ERREUR_DE_BUILD`) reconnaît maintenant `error TS\d+` et `Failed to type check` (Next 16 imprime la sortie brute de tsc, pas « Type error » : le script disait ERROR sans dire pourquoi). |

## Vérifié sur l'USINE (bacs gelés, pas sur le PC chargé)

- `node scripts/usine.mjs executer --nom=gi-direct --delai=30 -- node scripts/garde-imports-qa.mjs` : code 0, GI-1 à GI-9 PASS (1 270 fichiers de code, 2 203 imports lus sur HEAD, 0 orphelin).
- `node scripts/usine.mjs executer --nom=gi-mut --delai=30 -- node scripts/garde-imports-qa.mjs --mutations` : code 0, M0 PASS, M1 à M8 PASS (chaque sabotage fait rougir exactement les critères attendus).
- PC : `node scripts/garde-commit.mjs` code 0 ; `verifierOrphelins({arbre:'origin/main'})` et `({arbre:'HEAD'})` : 0 orphelin sur 1 270 fichiers.

## Corrections de juge (rien d'assoupli)

Aucun juge existant n'a été modifié : le juge est NOUVEAU. Deux exclusions de la garde sont des choix de périmètre, justifiés dans le code et testés
(M6 prouve qu'exempter tout `scripts/` fait rougir GI-1/GI-3/GI-6) : `docs/contexte-cloud/` et `.orchestre/` ne sont pas du code exécuté ici ;
les témoins de juges (`scripts/fixtures/**/temoin(s)/`, `temoin-*.mjs`) importent par construction des modules que le juge écrit ou copie dans son bac.

## Régularisation de l'audit §5.7

| Fichier | Fiche | Verdict | Décision |
|---|---|---|---|
| `scripts/studio/garde.mjs`, `docs/studio/modeles-messages.md`, `docs/studio/seance.md` | 026-155 | PASS usine-codex-112 (29/09) | commités par `b0bd428a` (avant ce lot) |
| `lib/agents/acquisition/redacteur.ts` | 026-087 (la Plume) | **DISJONCTÉE / refuse** (trois baux expirés ; `redacteur-qa` FAIL RD-3 à RD-15) | LAISSÉ non suivi : la fiche n'est pas PASS, committer un livrable rouge le ferait passer pour validé. Aucun fichier suivi ne l'importe (la garde ci-dessus le dirait : 0 orphelin sur HEAD). Si un fichier suivi l'importe un jour, le commit sera refusé par la garde, avec le nom du fichier à commiter. |
| `fix.js` (racine, 317 octets, non suivi) | aucune | n/a | LU (réécrivait `d''exclure`, `l''analyse`, `n''affecte` dans `scripts/juges-026-studio-offre-mutations.mjs`) ; la cible n'a plus aucune de ces chaînes et passe `node --check` : script périmé, SUPPRIMÉ. |

## Ce qui reste

- `redacteur.ts` : à commiter par 026-087 quand elle sera PASS (`orchestre.mjs rejouer 026-087 --forcer` après correction de `redacteur-qa`).
- `lib/agents/acquisition/contrat.ts` et `facteur.ts` ont des modifications non commitées d'une autre main (0124 : plus d'`accord_perime`) : pas dans ce lot.
- Le typecheck du hook lit toujours le disque : la garde des imports couvre la classe « fichier suivi → fichier non suivi » (le défaut du 04/10). Elle ne couvre pas la classe voisine « fichier commité qui utilise un export que son voisin, suivi mais MODIFIÉ non commité, vient d'acquérir » : le typecheck du hook lit le disque, Vercel lit git. R1 propose `git checkout-index` + `tsc` sur l'index pour la couvrir ; non fait ici (≈ 40 s de plus à chaque commit), et c'est une décision de coût du hook, pas un juge à corriger.
