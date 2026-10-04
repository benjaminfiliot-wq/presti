# Lot « ménage de l'orchestre » : état vrai des fiches en double, PASS du cloud, corrections de juge (04/10/2026)

Audit A §4-5, audit C §5.7 et R6, décision de Benj du 04/10 (D-0410-1 : tout automatique) ; consigne : ne rien supprimer à la main, utiliser les commandes de l'orchestre,
vérifier sur l'usine (bacs gelés), jamais recopier un verdict du cloud, ne pas toucher à 026-099, ne rien supprimer dans les listes de prospects.
Ce lot a été repris deux fois le même jour (première session vers 13 h-15 h, reprise le soir) : ce fichier est le bilan des deux. Heure de Paris sauf mention « Z » (UTC).

## 1. Les 14 fiches « dans plusieurs dossiers » : état vrai, un par un

« Dernier verdict » = dernière ligne PASS/FAIL de `.orchestre/verdicts.jsonl`, journalisée par l'orchestre (`verifier`, `verifier-usine.mjs`) : aucun verdict n'a été écrit ni recopié à la main.

| Fiche | Doublon constaté (audit) | État vrai au 04/10 soir | Dernier verdict | Ce qui a été fait |
|---|---|---|---|---|
| 026-155 | fait + file | **faite** ; livrables (`scripts/studio/garde.mjs`, `docs/studio/*`) commités par `b0bd428a` | PASS 29/09 06:16Z (usine-codex-112) | copie `file/` archivée |
| 026-170 | fait + file | **PAS finie en local** : en `file/` (rouverte), voir §2 | PASS du cloud seulement ; local : FAIL 15:35Z (repli PC), puis FAIL réel sur l'usine le 04/10 21 h (JA-2, JA-7, JA-8, JA-9 : `phaser` absent de node_modules) | `rejouer --forcer` + `prochaine` + vérification usine + `liberer` ; copie `file/` archivée ; **PASS du cloud non recopié** |
| 026-171 | fait + file | **faite** | PASS usine 11:27Z puis 11:36Z | copie `file/` archivée |
| 026-194 | fait + file | **faite** ; ses 33 fixtures (`scripts/fixtures/026-transverse/doublures,systeme,temoin`) n'avaient jamais été commitées (commits du 30/09 « EN COURS, pas un PASS ») : commités par `e8bfd021` | PASS usine 11:09:44Z | copie `file/` archivée ; fixtures commitées |
| 026-012 | fait + refuse | **faite** | PASS 29/09 04:50Z | copie `refuse/` archivée |
| 026-023 | fait + refuse | **faite** | PASS 29/09 03:29Z | copie `refuse/` archivée |
| 026-134 | fait + refuse + a-decider + a-relire | **faite** (migration 0104 appliquée en production) | PASS usine 10:53Z puis 11:15Z | copie `refuse/` archivée ; notes `a-decider/` et `a-relire/` rangées dans `traitees/` |
| 026-175 | fait + refuse + a-decider | **faite** pour la migration 0113 ; reliquat réel : les cinq graines d'agents (voir `preuves/026-175/reponse-chef.md`) | PASS usine 10:57Z puis 11:17Z | copie `refuse/` archivée ; note rangée |
| 026-225 | fait + a-decider | **faite** | PASS 30/09 10:23Z (codex-relais) | note rangée |
| 026-092 | a-decider + file | **faite** depuis le 04/10 16:24Z (deux défauts de juge SV-16 et serveur webpack corrigés par d'autres lots) | PASS 16:24:36Z | note rangée |
| 026-099 | a-decider + en-cours | **NON TOUCHÉE** (consigne : Codex root, bail) ; au moment de ce bilan : `file/` + note `a-decider/` | EXPIRÉE 18:36Z (usine-codex-1472) | rien |
| 026-087 | a-decider + refuse | **faite** | PASS usine 13:49Z | note rangée |
| 026-221 | a-decider + refuse | **faite** | PASS 16:13Z | note rangée |
| 026-226 | a-decider + refuse | **faite** (commitée par un autre lot, `ee2d34f9`) | PASS usine 18:58Z | note rangée |

Autres doublons trouvés par le balayage de ce soir (script `multi.cjs` : toute fiche présente dans deux dossiers) : seules restent les fiches **non résolues** à la fois dans leur dossier et dans `a-decider/`
(question de Codex encore ouverte) : 094 097 101 130 132 159 185 249 251 (en-cours) et 099 150 152 161 180 190 192 219 240 250 (file). Ce n'est pas un doublon d'état : c'est la question en attente ; aucune n'a de
`preuves/<id>/reponse-chef.md` (le chef a tranché 094, 097, 101, 251 dans `decisions-chef-0410.md` D-0410-3, -4, -7 : à lui de ranger les notes quand il écrit ses réponses).

### Fiches « fait » dont le dernier verdict n'était pas un PASS (trouvées par la cohérence dossier / journal)

- **026-162** : fait/, dernier verdict FAIL 13:50Z (« decisions.md modifié… » + CP-H5 « date du commit publié illisible (gh api) »). **Corrigée et rejugée** : PASS officiel le 04/10 à 19:33:49Z (PC, `--reel`, 4 s, CP-H1 à CP-H6 verts) ; voir §3 (correction de juge).
- **026-151** : fait/, dernier verdict FAIL/DISJONCTÉE du 04/10 11:13Z ; son livrable `scripts/juges-026-orchestre-chef-mutations.mjs` est non suivi par git ; vérifier = méta-juge sur le PC avec `../orchestre` : **laissée telle quelle** (autre lot : défauts MP-4 des méta-juges 099/151/152).
- **026-156** : fait/ avec un bail vivant et REJOUÉ 16:54Z : un exécutant la tient, pas touchée.
- Anciennes séries 020-03, 021-03, 021-06, 021-13, 021-18, 021-22 : en `fait/` sans aucune ligne de verdict (antérieures à ce journal), non suivies par git ; pas du ressort de ce lot, pas touchées.

## 2. 026-170 : pourquoi elle n'est PAS marquée faite (et pourquoi son PASS du cloud n'est pas recopié)

Ce que j'ai fait, par les commandes de l'orchestre : `rejouer 026-170 --forcer` (refuse → file), `prochaine --agent=claude-code --tache=026-170` (file → en-cours, bail), vérification **sur l'usine**, puis `liberer 026-170` (retour en file, bail levé).

1. Premier essai : `verifier-final.mjs` a attendu 4 minutes que HEAD soit poussé (commits d'autres sessions en vol), l'usine « n'a pas jugé » (code 3), repli sur le PC, que j'ai arrêté par son PID (il aurait rendu le FAIL de portabilité du 15:35 : `EPERM` au `rename` de `reference.partiel`, JA-1, sous Windows sur un arbre partagé).
2. Second essai, usine seule (`verifier-usine.mjs`, HEAD poussé) : le juge a **réellement jugé** (20 s de commande) et rendu **FAIL — JA-2, JA-7, JA-8, JA-9**. JA-1, JA-3, JA-4, JA-5, JA-6, JA-10 sont verts (donc plus d'EPERM sur l'usine). La cause des quatre rouges est unique : « CL-5 / CL-9 préalable manquant : **phaser est absent de node_modules** (installé par le préalable de l'usine) ». C'est le préalable écrit dans la fiche (« Avant le dépôt (b) : phaser 3.90.0 exact dans package.json et package-lock.json ») qui n'a jamais été fait : `grep phaser package.json package-lock.json` ne trouve rien. Le PASS du cloud (30/09 18:39Z) a été rendu dans un environnement où phaser était installé à la main.
3. **Ce n'est pas un défaut du juge** : le juge dit exactement la vérité (le témoin a besoin de Phaser), je ne l'ai pas modifié et je ne peux pas faire le préalable (`npm install` interdit à ce lot ; c'est un accord du diff de `package.json`). Le chef l'a décidé entre-temps (**D-0410-5**, 21 h 16 : phaser 3.90.0 exact par `npm install --package-lock-only` sur un bac de l'usine, puis `usine.mjs preparer --forcer`, et 170 « rouverte pour que son juge serve la vraie station » : réponse de `/api/controle/journal`, autorisations CL-9 à CL-13). La fiche est donc rendue à `file/` sans bail, `executant: claude-code`, pour que le chef la reprenne après le préalable. **Mise à jour 22 h 30** : le digest la montre déjà en `en-cours` (claude-code, depuis 20:30Z) : le chef l'a reprise ; `package.json` / `package-lock.json` portent phaser depuis `72625e5c` (026-179).
4. Conséquence assumée : tant que 170 n'a pas de PASS local, les juges qui exigent « dernier verdict PASS en fait/ » pour leurs dépendances (`juges-026-completude-qa`, DO-0/OC-0) la voient non faite ; c'est le fait, pas un bug.
5. Piste de travail restante, chiffrée par le diagnostic : après phaser, le témoin doit faire passer JA-7, JA-8, JA-9 ; JA-2 (« --temoin : code 2 ») tombe avec lui.

## 3. Corrections de juge (rien d'assoupli)

| Fiche | Juge | Critère | Défaut | Correction | Preuve |
|---|---|---|---|---|---|
| 026-162 | `scripts/confidentialite-prospection-qa.mjs` (`--hebergement --reel --confirmer-reel`) | **CP-H5** (« G3 daté avant le commit publié ») | le juge appelait `gh api` ; **`gh` n'est pas installé sur le PC de Benj** (ni sur son PATH PowerShell ni dans `Program Files`) : la date du commit publié était « illisible » et CP-H5 rouge sur une notice en ligne et juste. Défaut d'environnement du juge, pas de la fiche | nouvelle fonction `dateCommitPublie(depot)` : `gh api` d'abord, **à défaut le même point d'accès par l'API REST publique de GitHub** (`GET /repos/<dépôt>/commits?per_page=1`, dépôt public, sans jeton). Illisible, hors ligne, 4xx/5xx, tableau vide ou date mal formée : `null`, et `jugerG3` refuse : aucun chemin n'accorde par défaut. Le critère, le seuil (date G3 ≤ date du commit publié) et les messages sont inchangés | `--auto-controle` sur l'usine **avant** : PASS 24 épreuves ; **après** : PASS 25 épreuves (+ AC-CPH-5B : date par l'API sans `gh`, puis 500, tableau vide, date mal formée → `null` → CP-H5 refuse) ; **mutant** « renvoie une date quand l'API répond 500 » : FAIL — AC-CPH-5B seul (donc le nouveau témoin mord) ; verdict officiel rendu après correction : PASS 19:33:49Z, CP-H1 à CP-H6 verts (`preuves/026-162/verifier.log`) |

Aucune autre correction de juge dans ce lot. Aucun juge n'a été affaibli : aucun critère retiré, aucun seuil relevé, aucun sabotage retiré.

## 4. Défauts d'outillage constatés, NON corrigés (hors de ce lot ; à confier)

1. **`presti-ops/usine/verifier-usine.mjs`, motif `s3`** : après un échec (code ≠ 0), la regex `\.env(\.local)?\b|…|ENOENT|Cannot find module|…` est cherchée dans **toute** la sortie, lignes vertes comprises. Un juge qui écrit « aucune lecture de `.env.local` » dans une ligne PASS (JA-4 de `juges-026-pilotage-preuve`) fait basculer un vrai FAIL de l'usine en « à vérifier sur le PC » : c'est ce qui a masqué le verdict réel de 026-170 et l'a renvoyé vers un PC où il échoue pour de mauvaises raisons. Correction proposée : n'appliquer `s3` qu'aux lignes en échec (❌, FAIL, ✗, Error, ENOENT). Fichier hors dépôt (`presti-ops`) et chemin de vérification de TOUTES les fiches : je ne l'ai pas modifié.
2. **Le cliché `decisions-avant.md` rend toute re-vérification d'une fiche « fait » fautive dès que `decisions.md` change** : `verifier()` compare `sansQuarantaine(decisions-avant.md)` à `decisions.md` actuel ; la prise (`prochaine`) écrit ce cliché, mais une fiche déjà faite qu'on rejoue des jours après n'a plus le bon cliché. Effet : FAIL « decisions.md modifié… » puis déplacement fait → refuse (vu sur 026-162, 171, 194, 134, 151). Au 04/10 soir, le cliché diffère de `decisions.md` pour 026-194 et 026-217 (rafraîchi 13 h, `decisions.md` modifié à 13 h 27) : un rejeu les ferait tomber. Correction à faire dans l'outil `Documents/orchestre` (puis `maj`) : ne comparer que pour une tâche en `en-cours/`. `scripts/orchestre.mjs` n'a pas été modifié.
3. **`usine.mjs executer` laisse un bac par appel** (audit C §5.10) et n'a aucune commande pour les retirer : j'en ai laissé six sous `~/bacs/` de l'usine (`verif-026-170`, `verif-170-diag`, `cp-base`, `cp-auto-avant`, `cp-auto-apres`, `cp-mut-h5` ; disque de l'usine à 77 % ce soir). Je voulais les retirer par un `executer … -- rm -rf` : refusé, car le paquet porte désormais la modification de `package.json` / `package-lock.json` (phaser, D-0410-5) et `executer` exige `--forcer` dans ce cas. À retirer après le `preparer --forcer` du chef.

## 5. Livrables de fiches « fait » encore non commités (audit C §5.7 : à régulariser par le lot qui range l'arbre, pas fait ici)

Relevé du 04/10 ~21 h 30 (`git status --porcelain -uall` contre le périmètre `perimetre:` de chaque fiche de `fait/`, hors modifications d'un fichier partagé par plusieurs fiches comme `scripts/fermeture-e2e.mjs`) :

- **026-177** : `app/api/controle/station/reglages/route.ts` et `public/station/` (thèmes) **non suivis** : le PASS du 04/10 15:39Z est vrai sur le disque du PC, mais ni Vercel ni un clone propre ne voient la route. `commit-fiche.sh 026-177` (garde des imports comprise).
- **026-113, 026-117** : `app/controle/station/vues/{Aide,Missions,Succes}.tsx`, `Gestes.tsx` (et variantes) non suivis.
- **022-02** : `plans/publications-serie-2.md` non suivi.
- 026-194 : régularisé ici (`e8bfd021`). 026-155 : régularisé par `b0bd428a`. `lib/agents/acquisition/redacteur.ts` : suivi (026-087, PASS usine 13:49Z).
- Garde en place depuis ce matin (`0de0cf43`, autre lot) : un commit qui ajoute un fichier important un fichier non suivi est refusé, avec le nom du fichier à joindre.

## 6. Archive et rangement (tout est réversible)

- `.orchestre/archive/doublons-0410/{file,refuse}/` : les copies périmées des fiches faites (file : 026-151, 155, 170, 171, 173, 194 ; refuse : 026-012, 023, 134, 162, 175). Pour en remettre une : `mv .orchestre/archive/doublons-0410/<dossier>/<id>.md .orchestre/<dossier>/<id>.md`.
- `.orchestre/archive/obsoletes/` : **026-252** (Next 16 : `LIBELLE_RETIRE` → `lib/sitesConstantes.ts`, déjà fait par `ea6d299c`, son verifier est celui de 026-006, PASS 29/09) + note `026-252.OBSOLETE.md`. Archivée sans rejeu.
- `.orchestre/a-decider/traitees/` : toutes les notes dont la fiche est faite ou dont la question est tranchée par écrit (`preuves/<id>/reponse-chef.md`), dont 026-136, 026-177 et 026-243 rangées ce soir (fiches faites, PASS 18:05Z, 15:39Z et 18:14Z).
- 23 fichiers `reponse-chef.md` (première session) + 3 (ce soir) : la réponse écrite de chaque note rangée.

## 7. Les PASS du cloud (026-134 170 171 175 176 194), un par un

`verdict-cloud.jsonl` n'est repris nulle part dans `verdicts.jsonl`. Rejoué sur l'usine par `verifier-final.mjs` / `verifier-usine.mjs` : **134 PASS (10:53Z, 11:15Z), 171 PASS (11:27Z, 11:36Z), 175 PASS (10:57Z, 11:17Z), 176 PASS (11:03Z), 194 PASS (11:09Z)**, tous `machine: usine`. **170 : FAIL réel** (§2). Pour 217 et 237 (« faites » sans PASS local, audit A §4) : PASS usine 11:14Z et 13:02Z.
