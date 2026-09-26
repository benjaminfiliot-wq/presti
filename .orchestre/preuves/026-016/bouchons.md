# Les juges LS, RC et JF sur des modules bouchons — fiche 026-016

Les modules lecteurSite.ts, recenseur.ts et jugeFaits.ts n'existent pas encore (026-020, 026-022, 026-065). Pour prouver que leurs critères savent échouer et qu'aucun observateur ne plante, chaque juge est lancé sur des bouchons du scratchpad : chaque fonction exportée rend une valeur triviale ({}, null, true, 'ok'). sirene.ts et rge.ts y sont les témoins jetables de juges-savent-echouer.md. Écrit le 2026-09-26T05:03:03Z.

Critères encore verts sur les bouchons (hors le premier, l'import) : `✅ LS-8 aucun « @ » hors URL de réseaux sur tous les sites d'` — des critères de pure absence (aucune adresse), qu'un module qui ne fait rien ne viole pas ; les autres critères de la partie le mettent au rouge. Observateurs interrompus : aucun.

## recenseur-qa --partie=site (code 1)

```
recenseur-qa --partie=site — racine <bouchons> — contrat et jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition)
✅ LS-1 lecteurSite.ts importé depuis <bouchons> : hoteAutorise, robotsAutorise, recupererPoli, lireSite, extraire, lireFormulaire, validerLecture, recuperateurReseau
❌ LS-2 hoteAutorise(http://localhost/, []) → true, false attendu ; hoteAutorise(http://127.0.0.1/, []) → true, false attendu ; hoteAutorise(http://169.254.169.254/latest/meta-data/, []) → true, false attendu ; hoteAutorise(http://[::1]/, []) → true, false attendu ; hoteAutorise(http://2130706433/, []) → true, false attendu ; hoteAutorise(http://0x7f000001/, []) → true, false attendu ; … (14 défauts)
❌ LS-3 robotsAutorise(« User-agent: * Disallow: *.gif$ Disallow: /example… », /example/autre.html) → true, false attendu ; robotsAutorise(« User-agent: * Disallow: *.gif$ Disallow: /example… », /example/page.html) → true, false attendu ; robotsAutorise(« User-agent: * Disallow: *.gif$ Disallow: /example… », /images/logo.gif) → true, false attendu ; robotsAutorise(« User-agent: PrestiRecenseur Allow: /example/page/… », /example/page/disallowed.gif) → true, false attendu ; robotsAutorise(« User-agent: * Disallow: /*/prive/ », /a/prive/x) → true, false attendu ; robots.txt en 500 : requêtes [], seule /robots.txt attendue ; … (7 défauts)
❌ LS-4 aucune requête vers le site conforme
❌ LS-5 ailleurs : aucune requête vers le site qui redirige (le lecteur n'a rien tenté) ; local : aucune requête vers le site qui redirige (le lecteur n'a rien tenté) ; boucle : aucune requête vers le site qui redirige (le lecteur n'a rien tenté)
❌ LS-6 recupererPoli sur la page de 2 Mo : null, trop_gros attendu
❌ LS-7 le h1 du site conforme n'a donné aucun fait
✅ LS-8 aucun « @ » hors URL de réseaux sur tous les sites d'essai ; ni mailto, data-cfemail, adressesNominatives, ADRESSES_GENERIQUES dans le source
❌ LS-9 SIRET des mentions → null, 900000019 attendu
❌ LS-10 temoin.plomberie absent des réseaux ; TemoinPlomberie absent des réseaux
❌ LS-11 pagesjaunes.fr : {}, refus annuaire attendu ; www.facebook.com : {}, refus annuaire attendu
❌ LS-12 typecheck : script typecheck absent ou inattendu dans <bouchons>\package.json (« null »)
❌ LS-13 formulaire conforme : verdict , eligible attendu ; formulaire conforme non rendu ; maxlength=200 : verdict , longueur_max_message  (eligible et 200 attendus)
❌ LS-14 temoin-recaptcha-v2.invalid → null, captcha attendu ; temoin-recaptcha-v3.invalid → null, captcha attendu ; temoin-hcaptcha.invalid → null, captcha attendu ; temoin-turnstile.invalid → null, captcha attendu ; temoin-friendly-captcha.invalid → null, captcha attendu ; temoin-pot-de-miel.invalid → null, pot_de_miel attendu ; … (18 défauts)
❌ LS-15 robots.txt qui interdit action → , robots_txt attendu ; robots.txt qui interdit page → , robots_txt attendu ; robots.txt qui interdit tout fermé → , robots_txt attendu
❌ LS-16 sans HTTPS : [], un fait site_http d'extrait l'URL lue (http://temoin-sans-https.invalid/…) attendu ; sans viewport : [], un fait site_mobile d'extrait le titre attendu ; « © 2016 » : [], un fait site_copyright d'extrait « © 2016 » attendu
recenseur-qa --partie=site : FAIL — LS-2, LS-3, LS-4, LS-5, LS-6, LS-7, LS-9, LS-10, LS-11, LS-12, LS-13, LS-14, LS-15, LS-16
```

## recenseur-qa --partie=orchestration (code 1)

```
recenseur-qa --partie=orchestration — racine <bouchons> — contrat et jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition)
✅ RC-1 recenseur.ts importé depuis <bouchons> : executerRecenseur
❌ RC-2 C1 conforme (ademe_rge, SIREN d'abord, Contact Form 7) : étape candidat, recense attendue ; C2 diffusion partielle (ademe_rge : SIRENE d'abord, aucune lecture du site) : étape candidat, rejete attendue ; C3 robots.txt fermé à PrestiRecenseur : étape candidat, rejete attendue ; C4 sans domaine ni page : étape candidat, sans_canal attendue ; C5 en opposition (posée après l'enregistrement, avant le recenseur) : étape candidat, oppose attendue ; C6 proche (la page s'appelle « Témoin Filiot »), formulaire nu : étape candidat, recense attendue ; … (8 défauts)
❌ RC-3 candidat en opposition : étape candidat, oppose attendue
❌ RC-4 aucune réservation ; arrete_par_echeance , true attendu
❌ RC-5 le candidat sain : candidat, recense attendu (la panne d'un autre ne doit pas l'empêcher) ; candidat en panne après trois exécutions : candidat, a_decider attendu
❌ RC-6 0 événement(s) du recenseur, 1 attendu
❌ RC-7 page « Témoin Filiot » : étape candidat, froid true (recense et false attendus)
❌ RC-8 la marque au fait pub_meta : étape candidat, recense attendue
❌ RC-9 typecheck : script typecheck absent ou inattendu dans <bouchons>\package.json (« null »)
❌ RC-11 aucun appel SIRENE pour le candidat ademe_rge ; SIREN des mentions différent : candidat [], rejete siren_different attendu ; tranche 11 : candidat [], rejete trop_grand attendu
❌ RC-12 formulaire à reCAPTCHA : candidat [], rejete formulaire_captcha attendu ; bilan.abandons.captcha , 1 attendu ; formulaire conforme : pas de canal formulaire_site à l'URL exacte de la page ; formulaire conforme : formulaire  dans l'état ; formulaire conforme : technologie  ; le prospect du site « © 2016 » : candidat, faits [] (site_copyright attendu)
❌ RC-13 la marque : candidat cible "marque", recense et marque attendus
recenseur-qa --partie=orchestration : FAIL — RC-2, RC-3, RC-4, RC-5, RC-6, RC-7, RC-8, RC-9, RC-11, RC-12, RC-13
```

## faits-qa (code 1)

```
faits-qa — racine <bouchons> — contrat et jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition)
✅ JF-1 jugeFaits.ts importé depuis <bouchons> : executerJugeFaits, normaliserTexte, texteVisible, verifierFait, verifierFormulaire, verifierAvantEnvoi
❌ JF-2 retouche : "ok", absent attendu ; script : "ok", absent attendu
❌ JF-3 aucune requête de J1 vers https://temoin-conforme.invalid/ (fait déjà lu par A8) ; aucune requête de J1 vers https://temoin-poitevine.invalid/ (fait déjà lu par A8) ; aucune requête de J1 vers https://temoin-marque.invalid/ (fait déjà lu par A8)
❌ JF-4 unité passée en diffusion P : recense [], rejete diffusion_partielle attendu
❌ JF-5 prospect au compte inventé et au formulaire sain : recense [], verifie attendu ; le compte Instagram inventé est gardé ; compte inventé seul canal : recense [], rejete aucun_canal_verifie attendu
❌ JF-6 formulaire relu tel quel : recense, canaux ["formulaire_site","instagram","facebook","email_sollicite"] (verifie et formulaire_site gardé attendus) ; reCAPTCHA apparu : recense [], rejete formulaire_captcha attendu ; reCAPTCHA apparu : le canal formulaire_site est gardé ; robots.txt qui interdit l'action : recense [], rejete formulaire_robots_txt attendu ; l'adresse glissée dans le prospect est écrite dans le magasin
❌ JF-7 pub_meta sans jeton : "ok", non_verifiable attendu ; pub_meta, jeton et texte d'annonce changé : "ok", absent attendu ; marque (fait de site ok, pub_meta sans jeton) : recense [], verifie attendu ; la marque ne garde pas son fait pub_meta en non_verifiable
❌ JF-8 prospect mis en opposition entre A8 et J1 : recense, oppose attendu
❌ JF-9 aucun prospect traité
❌ JF-10 typecheck : script typecheck absent ou inattendu dans <bouchons>\package.json (« null »)
❌ JF-11 190 : le prospect au fait de site ok est recense, verifie attendu ; 190 : le fait pub_meta n'est pas gardé en non_verifiable ([null]) ; 190 : 0 requête(s) Meta pendant l'exécution, une seule attendue ; 190 : bilan.meta , jeton_invalide attendu ; 1357045 : le prospect au fait de site ok est recense, verifie attendu ; 1357045 : le fait pub_meta n'est pas gardé en non_verifiable ([null]) ; … (12 défauts)
❌ JF-12 reponse : j1 "ok", sans_objet attendu ; lien_maquette : j1 "ok", sans_objet attendu ; relance : j1 "ok", sans_objet attendu ; retouche : j1 "ok" [], refus fait_absent attendu ; hcaptcha : j1 "ok" [], refus formulaire_captcha attendu ; action : j1 "ok" [], refus formulaire_change attendu ; … (9 défauts)
faits-qa : FAIL — JF-2, JF-3, JF-4, JF-5, JF-6, JF-7, JF-8, JF-9, JF-10, JF-11, JF-12
```
