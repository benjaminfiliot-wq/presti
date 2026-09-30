# Échecs attendus des juges du Pilotage sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:gstop:debut -->
## Lot gstop — fiche 026-garde-stop — référence `00f0ab5`

Écrit par `node scripts/juges-026-pilotage-preuve.mjs --lot=gstop` le 2026-09-30T20:54:45Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/juges-026-pilotage/reference`), avec `--racine`, puis avec `--temoin` sur l'état actuel, puis sur l'implémentation de référence du lot posée sur la référence (`.orchestre/travail/juges-026-pilotage/temoin-gstop`, JA-7) et sur chacun de ses sabotages (JA-8). L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Critère attendu en échec sur la référence | Code | Extrait réel de sa sortie | Témoin sur l’état actuel | Témoin vert (implémentation de référence) | Sabotages vus |
|---|---|---|---|---|---|---|
| garde-stop-qa | GS-1 | 1 | ❌ GS-1 « stop » classé hors_fil, aucune opposition ; « STOP » classé hors_fil, aucune opposition ; « Stop » classé hors_fil, aucune opposition ; « Stop à vos mails » classé hors_fil, aucune opposition ; « STOP !!! » classé hors_fil, aucune opposition ; « stop. » classé hors_fil, aucune opposition ;  | PASS, code 0 (GS-1, GS-2, GS-3, GS-4, GS-5, GS-6, GS-7) | PASS, code 0, 7 critères verts | 18/18 (hors-fil-avant-le-stop → ❌ GS-1, je-m-oppose-oublie → ❌ GS-1, accents-non-replies → ❌ GS-1, opposition-temporaire → ❌ GS-1, adresse-expediteur-non-opposee → ❌ GS-1, module-expediteur-retire → ❌ GS-1, rgpd-ignore-hors-fil → ❌ GS-2, echeance-a-90-jours → ❌ GS-2, carte-attention-retiree → ❌ GS-3, adresse-non-validee → ❌ GS-3, stop-partout → ❌ GS-4, non-suivi-de-tout → ❌ GS-4, alias-plus-oublie → ❌ GS-5, nom-affiche-non-lu → ❌ GS-5, messagerie-gratuite-opposee → ❌ GS-5, carte-rgpd-avant-l-opposition → ❌ GS-6, reponse-auto-avant-le-stop → ❌ GS-6, confirmation-envoyee → ❌ GS-7) |
<!-- lot:gstop:fin -->
