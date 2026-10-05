# 026-099 — notes de livraison (05/10, lot M-3, Claude Code)

## Ce qui est livré

`scripts/juges-026-envoi-mutations.mjs` : 61 mutations des neuf juges de l'envoi, de l'entrant et de la fabrication (disjoncteurs, jauges, facteur, prospection-sql, meta-webhooks, répondeur, rendez-vous, maquette-vidéo, douleurs), une faute à la fois sur une copie jetable. Sur l'usine, le 05/10 : **méta-juge PASS** (MP-1 script en code 0 en 1 010 s, 61 entrées complètes ; MP-2 les 54 critères imposés couverts ; MP-3 trois contre-mutations tirées, graine 1955970728, toutes prises ; MP-4 aucun fichier bougé ; MP-5 `mutations-contre-verifiees.md` écrit). Copie de la sortie : `verifier.log` (ignoré par git, comme tous les `*.log`).

## Décision D-0410-12 : `scripts/facteur-qa.mjs` corrigé (ce juge seulement, rien d'assoupli)

La fiche attend que « `jugerAvecAvis` qui approuve sur un avis `ok` sans rejouer J3 » rougisse FA-14. Or FA-14 ne regardait que la route `avis` (corps mal formés, 200, 409…), jamais le rejeu de J3 : la mutation ne rougissait que FA-2. Correction : FA-2 (d) garde le verdict que `jugerAvecAvis` rend d'un avis « ok » sur un texte que J3 refuse (`rejeuJ3`), et FA-14 exige qu'il soit `annule` avec un motif `j3:…`. Aucun critère n'est retiré ni assoupli ; le témoin reste vert (`facteur-qa --partie=facteur` PASS) et la mutation sort sur `FAIL FA-14`.

## Ce qui a été corrigé dans le script de Codex

- Une mutation non prise ne coupe plus la série ; seul un témoin rouge arrête son groupe. Les passages de juges différents tournent maintenant ensemble (un enfant par juge, trois à la fois, `--sequentiel` pour l'ancien ordre, `--juges=dj,jg,…` pour la mise au point) : la série dure 17 minutes sur l'usine au lieu de 35, sous le plafond de 20 minutes du méta-juge.
- La copie jetable reçoit aussi `docs/` : `douleurs-qa` y lit `docs/agents/douleurs-methode.md` (le témoin était rouge dans la copie).
- Mutations qui ne prouvaient rien, remplacées par la faute réelle :
  - FA-3 : visait la garde de la voie Gmail ; le juge fait passer son envoi `prepare` par la voie Meta.
  - PF-6 / PF-11 : dans l'essai réel, PF-11 est « route travail : relève du Gmail » et PF-6 « jeton, calendrier, pause » ; la mutation de la relève est rattachée à PF-11, celle du calendrier (samedi, 18 h) à PF-6.
  - PG-4 : la condition du comptage ne se voit que dans l'essai à sec (`--sans-essai` ici) ; la faute lisible est le refus `ops:formulaire_deja` qui n'est plus levé.
  - RP-5 : la fenêtre de 7 jours est aussi refermée par `reponse_privee_jusqua` (défense en profondeur) ; la faute réelle retire ce second contrôle.
  - MV-2 : l'image fixe n'a pas de piste audio, retirer `-an` ne change rien (la faute réelle ajoute une piste) ; la durée par défaut n'est pas jugée (le juge passe `duree: 18`), la faute réelle porte `-t` à 24 s.
  - JG-2 : « avant » sans retour à la ligne (le fichier est en CRLF sur le PC).
- Constat sur le juge (non corrigé) : la vérification de la relève Gmail de la branche `?verifier=` de `app/api/usine/porteur/travail/route.ts` n'est exercée par aucun critère.

## Gestes de Benj

Aucun.
