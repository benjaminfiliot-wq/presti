# Journal v17 — Lestraque, barre haute et Codex (2026-09-14)

Protocole : blocs datés, puces courtes, faits mesurés. Heures de Paris (UTC + 2), tirées des commits ou des verdicts ; « vers » signale une estimation. Les durées des verdicts mesurent la vérification, pas le temps total de production.

## Bloc 0 — 14 septembre, vers 14 h 30 : la grille ne suffit pas
- Benj juge la démo « loin encore du résultat que je veux mais il y a du progrès », alors qu'elle passe 8/8 à la médiane. Le commit `f827b2d`, à 14 h 45, relève la barre de `grille-qa.mjs` au 3e quartile des références (`--barre=haut`) ; la médiane reste disponible. C5 échoue à cette nouvelle barre.
- L'analyse à sept angles et le critique relèvent ce que les images du héros ne montraient pas : liste d'étapes vide, communes en double, SIREN à zéros, devis sans formulaire, menu mobile qui ne se referme pas, polices système. Ce sont les défauts de départ consignés dans la tâche 018-04 ; les juges d'usage et à l'aveugle doivent élargir la preuve.

## Bloc 1 — 14 septembre, vers 15 h 00 : deux ouvertures en réserve
- Les deux prompts MotionSites gratuits restants ne sont pas ouverts. Les candidats étaient stillmind et church-community : selon le contradicteur, le premier tire son effet phare de sa vidéo, le second montre un montage de présentation à l'entrée.
- L'analyse donne déjà un plan précis ; le manque principal est la composition de page, que les douze aperçus gratuits n'enseignent pas. Les deux ouvertures, irréversibles, restent en réserve (décision du 14 septembre).

## Bloc 2 — 14 septembre, 14 h 39 (commit `10b125f`) : Gemini CLI refusé
- La connexion Google a réussi, mais Google refuse l'offre gratuite à Gemini CLI : `IneligibleTierError UNSUPPORTED_CLIENT`. La consigne et la sonde reconnaissent désormais ce refus.
- Cette trace précède la décision sur les ouvertures ; elle est regroupée ici avec le choix des exécutants. Une connexion réussie ne prouve pas que l'offre est utilisable.

## Bloc 3 — 14 septembre, 17 h 05 (commit `efda4a7`) : vague 1
- Liste des étapes réparée et monumentale ; communes en grand sans doublons ; légendes lisibles sur mobile ; crédits groupés avec liens vers les licences. Le générateur gagne des garde-fous contre une liste vide et un h3 nu.
- Nouvelles photos d'ouvrages finis et de mains : originaux d'au moins 2400 px, étalonnage commun, provenance vérifiée. Elles ne sont pas encore branchées dans ce commit.
- Les dix démos ont été régénérées ; le message du commit rapporte un juge de site vert sur cinq d'entre elles, Lighthouse mobile 96 à 100. Ce résultat ne constitue pas une validation de la vague 2.

## Bloc 4 — 14 septembre, vers 17 h 10 : « un seul site »
- Benj : « pas besoin d'en faire 10, seulement un est suffisant ». La décision suit de peu le commit de vague 1 : la vague 2, lancée vers 17 h 07, a été arrêtée puis relancée vers 17 h 11 avec ce périmètre (heures de création des deux lancements, corrigées par Claude Code : le registre disait à tort « vers 16 h ») ; les neuf démos métier restent gelées dans l'état `efda4a7`, sans nouvelle régénération ni jugement.
- Les retouches visent Lestraque seul. La vague 2 a été arrêtée après le démarrage d'un agent, sans fichier modifié, puis relancée avec ce périmètre ; une regénéralisation du générateur viendra plus tard.

## Bloc 5 — 14 septembre, 21 h 28 (commit `c05f326`) : Codex dans l'orchestre
- Codex rejoint les exécutants du dépôt orchestre à 21 h 17 (commit `faaef0d`), puis est branché dans Presti. Lancement : `node scripts/executant.mjs lancer <agent> --tache=<id> --moteur=codex`, avec le même contrat de tâche.
- Bac à sable `workspace-write` : dépôt Presti et vault SaaS, sans `presti-secrets`, jamais `danger-full-access`. Sous Windows, Node rencontre `spawn EPERM` en lançant les sous-processus : Codex écrit, le vérificateur tourne hors bac à sable, puis sa sortie lui revient en cas d'échec (`--boucle=3`).
- 018-01, codex-1 (Codex) : crédits photo sous la vidéo de la landing, lien vers auteurs et licences. Premier PASS à 21 h 25 en 15 s ; verdict final dans `fait/` à 21 h 27 en 12 s. La réponse de clôture précise que la mention Unsplash de l'exemple a été retirée : les photos viennent de Wikimedia Commons.
- 018-02, codex-2 (Codex) : juge d'usage de la démo — menu, devis, polices réellement rendues, voix, page commune, liens et console. Premier PASS à 21 h 33 en 64 s ; verdict final dans `fait/` à 21 h 34 en 64 s. Le commit `ae5a22d` rapporte un seul tour : le PASS concerne l'outil capable de détecter les défauts, pas leur correction sur le site.
- 018-03, ag-21-flash (Antigravity) : planches anonymes mélangées, clé séparée, consignes C1–C8 sans fuite et déterminisme. Premier PASS à 21 h 34 en 6 s ; verdict final dans `fait/` à 21 h 36 en 9 s. Les deux outils sont consignés dans `ae5a22d`, à 21 h 37.

## Bloc 6 — 14 septembre, après le commit `ae5a22d` : vague 2 en cours
- La vague 2 est en cours au moment de l'écriture. Les verdicts disponibles prouvent les crédits et les nouveaux outils de contrôle ; aucun résultat final de la vague 2 n'est affirmé ici.
- Sources : journaux Git de Presti et d'orchestre depuis le 14 septembre à 14:00 ; `.orchestre/decisions.md` depuis « La démo passe 8/8 à la médiane… » ; verdicts 018-01 à 018-03 de `.orchestre/verdicts.jsonl` et tâches correspondantes dans `fait/`. Forme reprise de `plans/journal-v16.md` ; liste des défauts de départ et état de vague 2 explicités par la tâche 018-04.
