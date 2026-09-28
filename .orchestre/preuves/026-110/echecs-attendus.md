# Échecs attendus des juges du lot 06 (026-110) sur leur arbre de référence

Écrit par `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=06` le 2026-09-28T18:02:35Z. Chaque juge est lancé par la preuve elle-même, sans shell : `--racine=<référence>` (extraite par `git archive` de `4041ec9b4143` sous `.orchestre/travail/juges-026-pubs-contenu/reference-06`) puis `--temoin` sur l'arbre courant.

| Juge | Critère attendu en échec sur la référence | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|
| pack-pub-dossier-qa --partie=api | PD-1 | FAIL PD-1 — lib/packPubDossier.ts ne s'importe pas : Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\benja\AppData\Local\Temp\vi-026-110-10710\.orchestre\travail\juges-026-pubs-contenu\reference-06\lib\packPubDossier.ts' imported from C:\Use… | PASS, code 0 (0 s) |
| pack-pub-dossier-qa --partie=page | PD-5 | FAIL PD-5 — app/pubs/commander/page.tsx absent ou vide | PASS, code 0 (0 s) |
| pack-pub-livraison-qa --partie=depot | LV-1 | FAIL LV-1 — scripts/pack-pub/deposer.mjs absent | PASS, code 0 (0 s) |
| pack-pub-livraison-qa --partie=route | LV-3 | FAIL LV-3 — lib/packPubLivraison.ts ne s'importe pas : Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\benja\AppData\Local\Temp\vi-026-110-10710\.orchestre\travail\juges-026-pubs-contenu\reference-06\lib\packPubLivraison.ts' imported from C:\U… | PASS, code 0 (1 s) |
| pack-pub-livraison-qa --partie=poste | LV-7 | FAIL LV-7 — app/controle/Packs.tsx absent ou vide | PASS, code 0 (0 s) |
| pack-pub-livraison-qa --partie=purge | LV-12 | FAIL LV-12 — lib/packPubPurge.ts ne s'importe pas : Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\benja\AppData\Local\Temp\vi-026-110-10710\.orchestre\travail\juges-026-pubs-contenu\reference-06\lib\packPubPurge.ts' imported from C:\Users… | PASS, code 0 (0 s) |
