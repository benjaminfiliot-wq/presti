# La preuve du lot A sait échouer (JL-1 à JL-5)

Produit par un script de Claude Code le 2026-09-26T06:15:32Z : `node scripts/juges-026-lt-preuve.mjs --lot=A --preuve-fichier=<lot fautif>`, fichiers de lot et faux juge sous `.orchestre/travail/026-lt-preuve/sait-echouer/` (sorties complètes à côté : `lot-<n>.sortie.log`). Le fichier posé par le faux juge « intrus » est retiré après son passage ; git status ne le montre plus : oui.

| Cas | Attendu | Code | Juste | Ligne relevée (extrait réel) |
|---|---|---|---|---|
| témoin : faux juge sain | PASS | 0 | oui | juges-026-lt-preuve --lot=A : PASS |
| JL-1 : critère attendu faux (FX-3 au lieu de FX-1) | JL-1 | 1 | oui | ❌ JL-1 faux-qa --mode=sain sur la référence : premier critère « ❌ FX-1 lib/faux.ts absent : le module n'existe pas (encore) », « ❌ FX-3 … » attendu |
| JL-1 : la ligne d’échec ne cite pas le fichier attendu | JL-1 | 1 | oui | ❌ JL-1 faux-qa --mode=sain sur la référence : la ligne d'échec « ❌ FX-1 lib/faux.ts absent : le module n'existe pas (encore) » ne cite pas lib/autre.ts |
| JL-1 : pile d’exception non rattrapée sur la référence | JL-1 | 1 | oui | ❌ JL-1 faux-qa --mode=pile sur la référence : pile d'exception non rattrapée — if (mode === 'pile') throw new Error('plantage volontaire du faux juge') ; faux-qa --mode=pile sur la référence : aucune ligne de critère — Node.js v24.16.0 |
| JL-1 : un vrai juge, critère attendu SC-2 au lieu de SC-1 | JL-1 | 1 | oui | ❌ JL-1 livraison-schema-qa --numero=0103 sur la référence : premier critère « ❌ SC-1 supabase/migrations/0103_livraison_commandes.sql absent : la migration de la fiche 026-021 n'existe pas (encore) », « ❌ SC-2 … » attendu |
| JL-2 : témoin rouge | JL-2 | 1 | oui | ❌ JL-2 faux-qa --mode=temoin-rouge --temoin : code 1, ❌ FX-2 (NR) rouge volontaire, aucun critère (NR) vert |
| JL-2 : témoin vert sans critère (NR) | JL-2 | 1 | oui | ❌ JL-2 faux-qa --mode=sans-nr --temoin : code 0, aucun critère (NR) vert |
| JL-3 : un fetch vers api.stripe.com en témoin | JL-3 | 1 | oui | ❌ JL-3 1-faux-qa.temoin : 22816 fetch api.stripe.com https://api.stripe.com/v1/charges ; 1-faux-qa.copie-intacte : 25340 fetch api.stripe.com https://api.stripe.com/v1/charges ; 1-faux-qa.copie-preuve-vide : 25660 fetch api.stripe.com https://api.stripe.com/v1 |
| JL-4 : une preuve de 0 octet ignorée | JL-4 | 1 | oui | ❌ JL-4 faux-qa --mode=vide-ignore --temoin avec un verifier.log de 0 octet : code 0, aucune ligne « ❌ <P>-PV » — un refus qui cite verifier.log attendu |
| JL-5 : un fichier écrit hors scripts/ et .orchestre/{travail,preuves}/ | JL-5 | 1 | oui | ❌ JL-5 .orchestre/026-lt-intrus.tmp apparu dans git status (??) |

Bilan : 10/10 justes.
