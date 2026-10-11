# 026-178 — contre-vérification (rejouée le 2026-10-04 par claude-code)

Six sabotages réversibles de la production (lib/pilotage/station.ts et lib/pilotage/salles/*), chacun joué contre `station-route-qa --partie=salles2 --statique` sur une copie de l'arbre ; le fichier de la copie est rétabli octet pour octet après chaque passage, et le sha256 des six fichiers de l'arbre réel est relu avant et après (script : `contre-verif-04-10.mjs`). Le nom du fichier suit la consigne (29-09) ; la date de l'épreuve est celle d'aujourd'hui.

- copie propre : PASS (code 0)
- adresses-des-bans (lib/pilotage/salles/securite.ts) → vu : code 1, ❌ SL-5 (attendu ❌ SL-5) ; fichier de la copie rétabli octet pour octet
- mrr-sous-sante (lib/pilotage/station.ts) → vu : code 1, ❌ SL-2 (attendu ❌ SL-2) ; fichier de la copie rétabli octet pour octet
- voix-en-texte (lib/pilotage/salles/natures.ts) → vu : code 1, ❌ SL-8 (attendu ❌ SL-8) ; fichier de la copie rétabli octet pour octet
- activite-depuis-maintenant (lib/pilotage/salles/index.ts) → vu : code 1, ❌ SL-4 (attendu ❌ SL-4) ; fichier de la copie rétabli octet pour octet
- incident-en-ligne (lib/pilotage/salles/sante.ts) → vu : code 1, ❌ SL-3 (attendu ❌ SL-3) ; fichier de la copie rétabli octet pour octet
- contenu-des-tickets (lib/pilotage/salles/presti.ts) → vu : code 1, ❌ SL-2, SL-5, SL-6 (attendu ❌ SL-6) ; fichier de la copie rétabli octet pour octet
- copie rétablie : PASS (code 0)
- arbre réel : les six fichiers sabotés sont inchangés (sha256 avant = après)
contre-verif 026-178 : PASS
