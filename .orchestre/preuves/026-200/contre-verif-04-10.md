# 026-200 — contre-vérification du 04/10 (Claude Code, Sonnet, sur la production finale)

La production finale (les sept fichiers de la fiche + la ligne `PRESTI_JETON_STUDIO` posée par le chef dans `scripts/usine/coffre-regles.mjs`, décision D-0410-6) est jugée verte par `usine-pubs-qa --partie=routes,tourneur,unites` : UP-1 à UP-10 PASS (`verifier.log`, verdict du PC du 04/10 19:53 UTC, le tourneur UP-6 à UP-9 relayé sur l'usine par le juge lui-même).

Quatre sabotages RÉVERSIBLES, chacun planté en place, jugé par la partie du juge qui le vise, puis restauré depuis une copie ; le sha256 est relu après la restauration et comparé à celui d'avant (les quatre égaux). Un seul critère rouge chacun, celui qui était visé. (Les sept sabotages du 29/09, sur d'autres fautes, restent dans `contre-verif-29-09.md` : ceux-ci les complètent, en particulier sur la ligne du coffre et l'unité, que le 29/09 n'avait pas pu exercer.)

| # | fichier | faute plantée | critère visé | verdict du juge | sha256 avant = après |
|---|---|---|---|---|---|
| S1 | `scripts/usine/coffre-regles.mjs` | la ligne `PRESTI_JETON_STUDIO` retirée de `NOMS_PERMIS` (`avec-coffre.mjs` refuserait de lancer l'unité) | UP-10 | code 1 — FAIL UP-10 — PRESTI_JETON_STUDIO est absent de NOMS_PERMIS : avec-coffre.mjs refuserait de lancer l'unité (code 2) et usine-coffre.mjs de poser le jeton | oui (`13e5bb9892eb96eb…`) |
| S2 | `scripts/usine/systemd/presti-pubs.service` | un `EnvironmentFile=` ajouté (tout le coffre dans l'environnement du tourneur) | UP-10 | code 1 — FAIL UP-10 — EnvironmentFile= présent : il chargerait tout le coffre | oui (`cd825472d6e1a488…`) |
| S3 | `app/api/usine/pubs/rendu/route.ts` | la route `rendu` n'appelle plus `jugeVert` : un juge rouge ou au mauvais nom est accepté | UP-5 | code 1 — FAIL UP-5 — un juge au code 1 : statut 200, corps {"ok":true}, état fabriquee (rejet attendu, pack resté payee) ; idem pour un juge au mauvais nom | oui (`46a30e5b55ed24be…`) |
| S4 | `scripts/usine/pubs.mjs` | le tourneur d'un échantillon dépose et rend même quand `pub-qa` est rouge | UP-7 (sur l'usine) | code 1 — FAIL UP-7 — pub-qa rouge : 1 montage(s), 1 dépôt(s), rendus [{"ok":true…}] (rien monté ni déposé, ok: false et une raison attendus) | oui (`b2de4e493def1805…`) |

Empreintes finales (après restauration, identiques à celles de la production livrée) :

- `scripts/usine/coffre-regles.mjs` : `13e5bb9892eb96eb69bf0077f2f759cae7e00355fbcce6899c8d4f12031ecf1e`
- `scripts/usine/systemd/presti-pubs.service` : `cd825472d6e1a4882c69ba056a867dfa559174e0e6d897a93bbe792bbad3fc64`
- `app/api/usine/pubs/rendu/route.ts` : `46a30e5b55ed24beb6d096e90dcb2cb3f7965dd793e76f7bc4b7675b9a2c128b`
- `scripts/usine/pubs.mjs` : `b2de4e493def1805457fc4662ec3eae6e94211c8bc3be22d2aa7b48d71b1e33a`

Le script de sabotage (copies, restauration, relecture des empreintes) était dans le dossier temporaire de la session ; les fichiers sont CRLF sur le PC, la faute est plantée sur une copie LF puis reconvertie en CRLF, donc le sabotage ne change que la ligne visée. Un seul passage, sans reprise : aucun sabotage n'a été essayé en vain.

Note de bac : le verdict final de la fiche est celui du PC. `verifier-final.mjs` a répondu « l'usine ne juge pas (code 3) → verifier sur le PC » aux deux essais (la raison exacte du code 3 n'est pas dans la sortie tronquée). Au premier essai, le relais du tourneur vers l'usine (que le juge lance lui-même depuis le PC) a échoué à la construction du paquet (`git add --pathspec-from-file … ` en échec, code 125, arbre très mouvant avec plusieurs sessions) : « verdict non rendu », code 2, FAIL d'infrastructure, fiche rangée en `refuse/` par l'orchestre (ligne de `verdicts.jsonl` à 19:45 UTC, sortie gardée hors du dossier de preuves). La fiche a été remise en `fait/` et rejugée sans rien changer : PASS à 19:53 UTC, tourneur relayé sur l'usine compris. Aucun juge touché, aucune vérification retirée.
