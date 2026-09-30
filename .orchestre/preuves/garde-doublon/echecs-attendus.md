# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:gdoublon:debut -->
## Lot gdoublon — fiche 026-garde-doublon — référence `00f0ab5`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=gdoublon` le 2026-09-30T20:58:09Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-gdoublon`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| garde-doublon-qa | GD-1 | 1 | ❌ GD-1 lib/agents/acquisition/facteur.ts absent : aucun Facteur à juger | PASS, code 0 (GD-1, GD-2, GD-3, GD-4, GD-5, GD-6, GD-7, GD-8) | PASS, code 0, 8 critères verts | 21/21 (reservation-absente → ❌ GD-1, reservation-apres-envoi → ❌ GD-1, reservation-en-panne-on-envoie → ❌ GD-1, facteur-retire → ❌ GD-1, ecriture-envoye-relache → ❌ GD-2, injoignable-pris-pour-un-refus-net → ❌ GD-2, carte-avec-le-destinataire → ❌ GD-2, magasin-tait-ok-false → ❌ GD-2, refus-de-reservation-ignore → ❌ GD-3, reservation-sql-non-conditionnelle → ❌ GD-3, cle-au-hasard → ❌ GD-4, cle-sans-normalisation → ❌ GD-4, cle-non-unique-en-base → ❌ GD-4, meta-sans-reservation → ❌ GD-5, formulaire-sans-reservation → ❌ GD-5, contrat-sans-reserverEnvoi → ❌ GD-5, envoye-sans-reservation-permis → ❌ GD-6, essai-e2e-non-borne → ❌ GD-6, reservation-sans-pause → ❌ GD-7, reservation-sans-plafond → ❌ GD-8, plafond-brule-un-echec → ❌ GD-8) |
<!-- lot:gdoublon:fin -->
