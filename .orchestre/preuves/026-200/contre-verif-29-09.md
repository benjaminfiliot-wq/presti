# 026-200 — contre-vérification (Claude Code, Sonnet)

Le juge `usine-pubs-qa` (026-199) est vert sur UP-1 à UP-9 (`verifier.log`) ; UP-10 ne rougit que sur une seule ligne, hors du périmètre de la fiche (`scripts/usine/coffre-regles.mjs` ne porte pas `PRESTI_JETON_STUDIO` : voir `coffre-regles-PRESTI_JETON_STUDIO.patch` et `.orchestre/en-cours/026-200.question.md`).

Sept sabotages RÉVERSIBLES de la production, chacun joué en place contre le juge (`--partie=<routes|tourneur>`, le tourneur sur l'usine), chacun restauré octet pour octet : le sha256 du fichier est relu après la restauration et comparé à celui d'avant. Chacun a mis au rouge le critère visé ; le sabotage « .. et // retirés de cheminPermis » (essayé d'abord) n'a RIEN fait rougir, parce que les autres contrôles du même chemin (segments, préfixe, nom) refusent déjà ces chemins : ce n'était pas une faute, il a été remplacé par le sabotage S4 ci-dessous.

| # | fichier | faute plantée | critère visé | verdict du juge | sha256 avant = après |
|---|---|---|---|---|---|
| S1 | `app/api/usine/pubs/travail/route.ts` | la route travail accepte aussi le jeton de livreur_usine | UP-2 | code 1 — FAIL UP-2 — travail : le jeton de livreur_usine donne 200 et un battement est posé (403 attendu : seule l'identité studio est admise) ; travail : un r | oui (`698913a155c4ee78…`) |
| S2 | `app/api/usine/pubs/rendu/route.ts` | la route rendu ne compare plus le SHA-256 relu à l'empreinte annoncée | UP-5 | code 1 — FAIL UP-5 — une empreinte SHA-256 fausse : statut 200, corps {"ok":true}, état fabriquee, la route a modifié autre chose que le compteur d'échecs ({ o | oui (`46a30e5b55ed24be…`) |
| S3 | `app/api/usine/pubs/depot/route.ts` | la route depot ne refuse plus un stockage plein ou non mesurable | UP-4 | code 1 — FAIL UP-4 — stockage à 61 % : statut 200, 1 adresse(s) signée(s) (507 sans adresse attendu) ; stockage non mesurable (erreur) : statut 200, 1 adresse( | oui (`73dc4a664b7bd56f…`) |
| S4 | `lib/pubs/usinePubs.ts` | cheminPermis ne compare plus le dossier du chemin à celui du travail (le dossier d'un autre pack, d'une autre marque passe) | UP-4 | code 1 — FAIL UP-4 — chemin sous le dossier d'un autre pack : statut 200, 1 adresse(s) signée(s) (400 sans adresse attendu) ; échantillon sous une autre marque | oui (`ed7df70b2975717c…`) |
| S5 | `scripts/usine/pubs.mjs` | le tourneur d'un pack dépose même quand pub-locale-qa est rouge | UP-6 | code 1 — FAIL UP-6 — juge rouge : 1 demande(s) de dépôt, 6 envoi(s) (aucun attendu) ; juge rouge : rendus [{"travail":"11111111-1111-4111-8111-111111111111","o | oui (`b2de4e493def1805…`) |
| S6 | `scripts/usine/pubs.mjs` | le tourneur écrit le jeton de l'agent dans son journal | UP-8 | code 1 — FAIL UP-8 — le jeton d'agent apparaît : pack : la sortie du tourneur ; pack-juge-rouge : la sortie du tourneur ; pack-fabriquer-echec : la sortie du t | oui (`b2de4e493def1805…`) |
| S7 | `scripts/usine/pubs.mjs` | le tourneur d'un échantillon envoie aussi la réponse d'accord de la marque au lecteur (pas seulement la page produit) | UP-7 | code 1 — FAIL UP-7 — lecteur : 1 appel(s) du lanceur, ses données portent la réponse d'accord | oui (`b2de4e493def1805…`) |

Empreintes finales (après restauration, identiques à celles de la production livrée) :

- `app/api/usine/pubs/travail/route.ts` : `698913a155c4ee78658e2dde6b6728ae0ef817476376752e825d89f48b1ad02d`
- `app/api/usine/pubs/depot/route.ts` : `73dc4a664b7bd56f7f6efc6e1635ed74e15495409b71ac8a99402040d9113870`
- `app/api/usine/pubs/rendu/route.ts` : `46a30e5b55ed24beb6d096e90dcb2cb3f7965dd793e76f7bc4b7675b9a2c128b`
- `lib/pubs/usinePubs.ts` : `ed7df70b2975717c6c857dc5767ee9c070eb34ba24788442cdc0193288585176`
- `scripts/usine/pubs.mjs` : `b2de4e493def1805457fc4662ec3eae6e94211c8bc3be22d2aa7b48d71b1e33a`
- `scripts/usine/systemd/presti-pubs.service` : `cd825472d6e1a4882c69ba056a867dfa559174e0e6d897a93bbe792bbad3fc64`
- `scripts/usine/systemd/presti-pubs.timer` : `3b60616d21e6824108f4c453c898f8f4ccdce8387be6f7c2cd443a48cd0ba308`

Preuve de l'unique ligne manquante : la même production, copiée dans une racine d'essai où `coffre-regles.mjs` porte `PRESTI_JETON_STUDIO` (le correctif de `coffre-regles-PRESTI_JETON_STUDIO.patch`), jugée par `node --import ./scripts/ts-loader.mjs scripts/usine-pubs-qa.mjs --racine=<copie> --partie=routes,unites` : `PASS UP-1, UP-2, UP-3, UP-4, UP-5, UP-10`. Le tourneur (UP-6 à UP-9) ne dépend pas du coffre : il est vert en place, trois passages de suite sur l'usine, sans instabilité (la cadence d'une requête par seconde vers la marque est comptée depuis la FIN de la précédente, marge de 200 ms : un premier essai à 1 050 ms depuis le début avait rougi UP-7 une fois, à 857 ms mesurés à l'arrivée, la gigue du réseau).
