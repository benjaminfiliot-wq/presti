# 026-087 — contre-vérification du 29/09 (claude-code)

Production : `lib/agents/acquisition/redacteur.ts`, sha256 `561a73c911c40817e6e6753527fb52e96279447854c7480815538b1d0b9ec295`.
Méthode : 7 contrôles à moi (hors dépôt, sur une copie jumelle de `lib/agents/acquisition/` dont `NOTICE_URL` est posée, les modèles approuvés
et les douleurs remplacées par celles du juge : le dépôt réel a `NOTICE_URL = null` et tout `approuve: false`). Chaque sabotage est appliqué à
la production, jugé, puis annulé ; le sha256 est relu après chacun.

Sain : C1 à C7 PASS (envoi_froid fermé, J3 obligatoire, garde ads_archive, douleur stable et répartie, ordre des faits, périmés avant plafonds,
preuve de demande et modèle non approuvé pour preparerMessageLien).

| # | Sabotage de la production | Contrôle qui le repère |
|---|---------------------------|------------------------|
| S1 | verdict de `jugerMessage` ignoré | C2 FAIL (un envoi part malgré le refus de J3) |
| S2 | garde `ads_archive.permis` retirée | C3 FAIL (2 envois au lieu de 1) |
| S3 | douleur toujours d'indice 0 | C4 FAIL (une seule douleur pour 9 prospects) |
| S4 | `envoi_froid` fermé ignoré | C1 FAIL (bilan `ok` au lieu de `envoi_froid_ferme`) |
| S5 | `perimerEnvois` retiré | C6 FAIL (l'envoi de la veille reste préparé) |
| S6 | ordre des faits inversé | C5 FAIL (citation de titre choisie avant l'audit HTTP) |

sha256 après chaque restauration et à la fin : `561a73c911c40817e6e6753527fb52e96279447854c7480815538b1d0b9ec295` (identique).
`npm run typecheck` : vert (49 s).

## Ce que le juge officiel ne peut pas dire vert (redacteur-qa, voir verifier.log)
Voir `.orchestre/en-cours/026-087.question.md` : `NOTICE_URL = null` (026-162), 026-083 non faite (J3, modèles et douleurs approuvés), et sept
défauts du juge lui-même (RD-3, RD-4, RD-6, RD-9, RD-11, RD-13, RD-14, RD-15). Sur la copie jumelle, RD-1, RD-2, RD-5, RD-7, RD-8 et RD-10 sont verts.
