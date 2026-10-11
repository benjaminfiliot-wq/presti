# SearchConsole — contrepreuves causales

- PASS arbre sans module SC-1 : FAIL SC-1 — module/exports/appel du tour absent | search-console-qa : FAIL — SC-1
- PASS courant avant201 SC-1 : 
- PASS faux Google (auto-contrôle) SC-2 : {"verdict":"PASS","appels":12,"rsa_2048_rs256_verifie":true,"assertion_invalide_refusee":true,"quatre_claims_fautifs_signes_refuses":true,"jeton_invalide_refuse":true,"panne_503_reelle":true,"journal_sans_secret":true,"uniquement_loopback":true}
- PASS témoin causal  : 
- PASS scope SC-2 : signature/claims/échange OAuth refusé par faux Google
- PASS date avant refus SC-3 : ordre/date incorrect
- PASS bucket supplémentaire SC-4 : écriture bucket supplémentaire/incorrecte
- PASS sans objet ignoré SC-5 : absence de domaine/déjà soumis non classé sans_objet
- PASS jeton journalisé SC-7 : secret en console/erreur rendue
- PASS quatre commandes SC-6 : trois commandes par tour non respectées
- PASS quatrième essai SC-6 : quatrième essai après trois échecs
- PASS pause ignorée SC-6 : appel sous pause
- PASS compteur perdu SC-6 : compteur/par commande ou autres vérifications perdus
- PASS non-régression réelle SC-8 : package identique ; typecheck réel vert

Faux Google loopback, clé factice mémoire, aucun appel public. UP199 reste hors de ce juge.
