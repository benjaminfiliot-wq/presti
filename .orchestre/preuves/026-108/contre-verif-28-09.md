# Contre-vérification 026-108 — 28/09

Vérifie la fiche PASS de 026-108 (verdicts.jsonl : `PASS`, `2026-09-28T09:02:58Z`, `482s`, `copie_isolee:true`). Rien touché hors `.orchestre/preuves/026-108/` et `.orchestre/travail/` ; aucun commit.

## Moyen

**1. Revue Codex sur l'usine** — `cd presti && node ../presti-ops/usine/revue-codex.mjs 026-108 --sabotages=4` (log complet : `.orchestre/travail/revue-codex/026-108/`).

→ **code 125, NON JUGÉ.** Le contrôle du paquet (`usine executer`) a refusé d'envoyer quoi que ce soit : 8 « problèmes » détectés, tous dans deux fichiers **hors du périmètre de 026-108** et déposés par d'autres sessions en cours pendant que je travaillais :
- `.orchestre/fait/026-041.md:72` (motif `sk-`)
- `scripts/agents-llm-qa.mjs:100-102` (motif `sk-` / nom sensible)

Vérification (lecture seule, aucune écriture) : ce sont des **sentinelles de test** de la fiche 026-041 (`ANTHROPIC_API_KEY = 'sk-ant-PRODUIT-026-sentinelle'`, etc.), jamais de vraies clés. Le commentaire du script le dit lui-même : « le préfixe est assemblé à l'exécution : écrit d'un bloc, garde-commit le prenait pour une vraie clé et refusait tout commit du dépôt (28/09) » — un faux positif déjà connu et déjà contourné dans le code de 026-041, mais la fiche `.orchestre/fait/026-041.md` (texte, pas code) le cite encore en toutes lettres. `usine executer` a bien fait de refuser (« jamais un faux vert ») ; ça ne prouve ni ne réfute rien sur 026-108 elle-même. **Aucune revue Codex n'a eu lieu** (aucun `verdict.json` produit).

Code 125 → bascule sur le repli imposé : 4 sabotages faits moi-même.

**2. Quatre sabotages réversibles de la production** (les 3 scripts juges livrés par 026-108, jamais `scripts/juges-026-pubs-contenu-preuve.mjs` lui-même — c'est LE juge/verifier de la fiche). Protocole identique ×4 :
1. `Read` puis sauvegarde du fichier (copie + sha256) avant toute modification.
2. Un seul `s.echoue(ID, …)` inversé en `s.passe(ID, …)`, au point de code qui doit signaler l'absence de la fonctionnalité pas-encore-construite sur l'arbre de référence — jamais touché au reste du fichier.
3. Rejoué avec **exactement** la commande que `juges-026-pubs-contenu-preuve.mjs` lance en interne pour ce juge (`lancerJuge` : `node <script> [--partie=…] --racine=.orchestre/travail/juges-026-pubs-contenu/reference-01`, arbre déjà extrait de `4041ec9`, réutilisé blob pour blob) : constat que le critère montre `PASS` au lieu du `FAIL <ID>` attendu.
4. Restauration depuis la sauvegarde ; sha256 recontrôlé identique à l'original.
5. Rejoué une seconde fois : `FAIL <ID>` revenu.

Puis, une fois les 4 fichiers restaurés (sha256 confirmés), **relance complète du vrai verifier de la fiche** : `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=01` (log : `.orchestre/travail/juges-026-pubs-contenu/`, et il a réécrit `.orchestre/preuves/026-108/echecs-attendus.md`, dans mon périmètre).

## Sabotages et critères rougis

| # | Fichier | Point sabotage | Critère visé | Sur la référence, sabotage actif | Sur la référence, après restauration | sha256 restauré |
|---|---|---|---|---|---|---|
| 1 | `scripts/pack-pub-base-qa.mjs` (ligne ~262) | `s.echoue('PB-1', m.erreur)` → `s.passe('PB-1', m.erreur)` dans le cas « migration `*_packs_pubs.sql` absente » | **PB-1** | `PASS PB-1 — 0 fichier(s) …` (faux vert) | `FAIL PB-1 — 0 fichier(s) supabase/migrations/*_packs_pubs.sql, un seul attendu (trouvé(s) : aucun)` | `63503865a743f287d1a5dc317087afabd58ae68d0f30e47fa4fe28bad8e8d308` = original |
| 2 | `scripts/pack-pub-paiement-qa.mjs` (`jugerPP1`) | `s.echoue('PP-1', …); return` → `s.passe('PP-1', …); return` quand `lib/packPub.ts` ne s'importe pas | **PP-1** | `PASS PP-1 — lib/packPub.ts ne s'importe pas : …` (faux vert) | `FAIL PP-1 — lib/packPub.ts ne s'importe pas : Error [ERR_MODULE_NOT_FOUND] …` | `e2e93edd7d30323aa0a3ff4c3a06f1eaa5b3feddd5a74a01d3f6d8b1a8df59e1` = original |
| 3 | `scripts/pack-pub-paiement-qa.mjs` (`jugerPP8`) | `s.echoue('PP-8', …)` → `s.passe('PP-8', …)` quand `app/api/pubs/commander/route.ts` est absent | **PP-8** | `PASS PP-8 — app/api/pubs/commander/route.ts absent ou vide …` (faux vert) | `FAIL PP-8 — app/api/pubs/commander/route.ts absent ou vide` | `e2e93edd7d30323aa0a3ff4c3a06f1eaa5b3feddd5a74a01d3f6d8b1a8df59e1` = original (fichier remis à l'identique après CHAQUE sabotage, y compris entre #2 et #3) |
| 4 | `scripts/cgu-pack-pub-qa.mjs` (`jugerBloc`) | `s.echoue('CG-1', …)` → `s.passe('CG-1', …)` quand le titre « 3 ter » est introuvable | **CG-1** | `PASS CG-1 — titre exact introuvable : … ; « 3 ter … » présent, après id="site" et avant id="support"` (faux vert, double `passe`) | `FAIL CG-1 — titre exact introuvable : « <h2 id="pubs">3 ter. Le pack pubs locales</h2> »` | `e01868c48060e8fe05f912c5181b203dcd9b7b06f4569af76a701f311f438c52` = original |

Chaque sabotage a rougi **exactement** le critère visé (aucun débordement observé sur les autres IDs du même juge, qui restaient FAIL pour leurs propres raisons habituelles, ex. PB-2..PB-8 « non jugé » quand PB-1 est en cause). Les 3 fichiers ont été relus (`diff -q`) contre leur sauvegarde après chaque restauration : aucune différence.

## Vérification finale (verifier officiel de la fiche, après les 4 restaurations)

`node scripts/juges-026-pubs-contenu-preuve.mjs --lot=01` (log complet dans `.orchestre/travail/juges-026-pubs-contenu/`) :

```
PASS REF — 4041ec9 extrait (2421 fichiers), sans lib/packPub.ts, supabase/migrations/*_packs_pubs.sql
PASS pack-pub-base-qa — référence : code 1, FAIL PB-1 — … (86 s) ; témoin : code 0 (9 s)
PASS pack-pub-paiement-qa --partie=noyau — référence : code 1, FAIL PP-1 — … (5 s) ; témoin : code 0 (42 s)
PASS pack-pub-paiement-qa --partie=route — référence : code 1, FAIL PP-8 — … (134 s) ; témoin : code 0 (1 s)
PASS cgu-pack-pub-qa — référence : code 1, FAIL CG-1 — … (42 s) ; témoin : code 0 (1 s)
FAIL IMMOBILE — git status a bougé hors de .orchestre/travail/ et .orchestre/preuves/ : .orchestre/digest.md revenu à l'état suivi ou disparu ; .orchestre/fait/026-044.md revenu à l'état suivi ou disparu ; .orchestre/verdicts.jsonl revenu à l'état suivi ou disparu ; app/api/controle/pause/route.ts revenu à l'état suivi ou disparu ; docs/agents/pause-generale.md revenu à l'état suivi ou disparu ; lib/agents/pause.ts revenu à l'état suivi ou disparu …
PASS EA — .orchestre/preuves/026-108/echecs-attendus.md : 1282 octets, 4 ligne(s)
juges-026-pubs-contenu-preuve : FAIL — IMMOBILE
```

Les **4 critères que je visais (REF, les 4 juges) sont PASS**, identiques au verdict d'origine (mêmes messages `FAIL <ID>` attendus sur la référence, mêmes `PASS code 0` en témoin). Le seul rouge est **IMMOBILE**, et non un critère de contenu : entre le début et la fin de mon run (~7 min), d'autres sessions en cours ont fait avancer `.orchestre/digest.md`, `.orchestre/verdicts.jsonl`, `.orchestre/fait/026-044.md`, et des fichiers d'une fiche 026 sur les pauses (`app/api/controle/pause/route.ts`, `lib/agents/pause.ts`, `docs/agents/pause-generale.md`) — « revenu à l'état suivi ou disparu » veut dire que ces fichiers, modifiés/non suivis avant mon run, ont été committés par une autre session pendant mon run. C'est le même phénomène que la fiche documente déjà elle-même (« deux essais directs avaient un IMMOBILE rouge causé par d'autres sessions qui déplaçaient des fiches en parallèle — pas un défaut du code »), et la raison pour laquelle l'exécutant original était passé par `verifier-isole.sh` (copie de travail isolée). Je n'ai pas rejoué via `verifier-isole.sh` : il écrit dans `.orchestre/verdicts.jsonl` et peut déplacer la fiche, deux choses hors de mon périmètre autorisé (`.orchestre/preuves/026-108/` et `.orchestre/travail/` seulement).

## Vérifications annexes (lecture seule)

- `scripts/fixtures/026-pubs-contenu/contrat-pack.json` relu en entier : prix (14900/149€, 49000/490€), états et transitions, colonnes de table, phrases CGU exigées — conforme mot pour mot au contrat décrit dans la fiche, aucun écart trouvé.
- `scripts/webhook-muet-qa.mjs` : l'amendement du point 5 est bien présent (`metadata.type = 'inconnu' → orphelin`, commentaire daté du 28/09 citant 026-108 point 5) ; fichier non touché par moi.
- 026-114, 026-112, 026-118, 026-131, 026-166 sont toujours seulement en brouillon (`.orchestre/brouillons-ecosysteme/026/`), aucune n'est entrée en `file/` avant le PASS de 026-108 — règle respectée.

## Verdict de la contre-vérification

**VERT, confirmé.** La revue Codex n'a pas pu juger (125, bloquée par du bruit d'autres sessions, sans rapport avec 026-108) ; le repli par sabotage montre que les 4 assertions clés du verifier (PB-1, PP-1, PP-8, CG-1 — exactement les 4 lignes de `echecs-attendus.md`) sont réellement chargées : un juge qui accepterait à tort l'état « pas encore construit » de la référence serait détecté. Restauration bit à bit vérifiée par sha256 sur les 3 fichiers, aux 4 étapes. Le seul rouge rencontré (IMMOBILE, sur ma propre relance directe) est un artefact de concurrence entre sessions déjà documenté par la fiche elle-même, pas un défaut de 026-108.
