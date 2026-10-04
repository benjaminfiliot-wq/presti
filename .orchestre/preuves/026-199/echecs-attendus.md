# 026-199 — échecs attendus et verdicts du témoin (usine-pubs-qa, search-console-qa)

Pour chaque juge : (1) le critère attendu en échec sur l'arbre courant du 04/10/2026, avec l'extrait réel de la sortie ; (2) le verdict du témoin (une référence conforme posée dans les fixtures, jamais déployée) ; (3) les fautes plantées dans des copies du témoin, chacune doit mettre son critère au rouge. Détail brut : `UP-contrepreuves-brutes.log`, `UP-resultats.json`, `SC-contrepreuves-brutes.log`, `SC-resultats.json`.

## usine-pubs-qa

### 1. Critère attendu en échec sur l'arbre courant : UP-1 (aucun des sept fichiers de 026-200)

Commande : `node scripts/usine-pubs-qa.mjs` — code 1.

```
FAIL UP-1 — absent(s) : app/api/usine/pubs/travail/route.ts, app/api/usine/pubs/depot/route.ts, app/api/usine/pubs/rendu/route.ts, lib/pubs/usinePubs.ts, scripts/usine/pubs.mjs, scripts/usine/systemd/presti-pubs.service, scripts/…
usine-pubs-qa : FAIL — UP-1, UP-2, UP-3, UP-4, UP-5, UP-6, UP-7, UP-8, UP-9, UP-10
```

Les neuf autres critères sont « non évalué : des fichiers manquent (UP-1) » : un juge qui ne peut pas juger échoue, il ne passe pas par défaut.

### 2. Verdict du témoin (`--racine=scripts/fixtures/026-usine-pubs/temoin`, mêmes critères, mêmes faux serveurs)

```
PASS UP-1 — les 7 fichiers existent et ne sont pas vides
PASS UP-2 — travail : busAgents baissé → 404 avant toute identité (aucun appel à la garde, aucun accès à la base) ; travail : sans jeton et jeton inconnu → 401 ;…
PASS UP-3 — aucun travail → { travail: null } ; le plus ancien pack payée est pris : { type: 'pack', id } ; pack = exactement le pack.json de exporter.mjs ; ni c…
PASS UP-4 — pack : trois MP4 et trois visuels (jpeg et png) : une adresse signée de dépôt par fichier ; fichier de 60 Mo : une adresse signée de dépôt par fichie…
PASS UP-5 — pack bon : payee → fabriquee, fabrique_le posé ; verifications : juge pub-locale-qa, verdict PASS (comme deposer.mjs) ; la route relit chacun des six…
PASS UP-10 — User=agents ; WorkingDirectory=/srv/presti-agents ; Environment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele ; aucun EnvironmentFile= ; MemoryMax=4G…
PASS UP-6 — un pack payé : le passage finit en code 0, sans exception ; GET travail d'abord, avec le jeton de l'agent ; ~/presti-pubs/<pack>/ et photos/ : dossie…
PASS UP-7 — un échantillon : le passage finit en code 0, sans exception ; le vault ~/presti-studio/<marque>/ est en 0700 ; vault : prealables.md copié de docs/st…
PASS UP-8 — le jeton d'agent (tiré au hasard) n'apparaît dans aucune sortie, aucun argv ni aucune donnée de lanceur, sur 15 passages ; aucun outil lancé ne reçoi…
PASS UP-9 — bus injoignable : code 0, aucune exception, une ligne de journal ; bus en erreur 500 : code 0, aucune exception, une ligne de journal ; stockage injo…
```

### 3. Les fautes plantées (une par copie du témoin ; « PASS » = le juge a mis le critère visé au rouge)

| faute plantée | critère visé | rejoué | extrait réel de la sortie |
|---|---|---|---|
| le jeton de livreur_usine accepté | UP-2 | poste | PASS — travail : le jeton de livreur_usine donne 200 et un battement est posé (403 attendu : seule l'identité studio est admise) ; travail : un refus (livreur) a écrit dans la … |
| le drapeau lu après la garde | UP-2 | poste | PASS — depot : busAgents baissé : statut 404, la garde a été interrogée avant le drapeau (404 sans identité attendu) |
| aucun battement de studio | UP-2 | poste | PASS — rendu : aucun battement de studio (ops_battement) à l'appel authentifié ; rendu : pas de battement de studio sous la pause générale (appel authentifié) |
| la pause générale ignorée | UP-2 | poste | PASS — travail : pause générale : statut 200, corps {"type":"pack","id":"11111111-1111-4111-8111-111111111111","pack":{"pack_id":"1… ({ travail: null } sans écriture attendu) |
| photos hors du dossier de l'artisan signées | UP-3 | poste | PASS — une adresse hors du dossier de l'artisan est signée ou rendue : artisan-media/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/secret.jpg |
| le courriel du client dans la réponse | UP-3 | poste | PASS — pack ≠ pack.json de exporter.mjs (reçu {"email":"client.sentinelle@exemple.invalid","matiere":{"accroche":"artisan_de_confiance","communes":["Rennes"],"cta":"… ; attendu… |
| adresses de lecture de 3 600 s | UP-3 | poste | PASS — adresses de lecture : artisan-media 3600 s (bucket artisan-media, 600 s au plus attendus) |
| aucun bail | UP-3 | poste | PASS — 2e passage : pack 11111111-1111-4111-8111-111111111111 (pack 22222222-2222-4222-8222-222222222222 attendu : le premier est sous bail) ; 3e passage : {"type":"pack","id":… |
| l'extrait garde adresses et numéros | UP-3 | poste | PASS — extrait : 173 signes « Bonjour, oui, vous pouvez utiliser nos photos pour un essai vidéo, avec plaisir, écrivez-moi à resp… » — adresse ou numéro non masqué ; la réponse… |
| une marque en refus prise | UP-3 | poste | PASS — Studio : statut 200, {"type":"studio","decision":"55555555-5555-4555-8555-555555555555","marque_cle":"marque-refusee","page_produit":"http://127.0.0.1:61834/mar… (la déc… |
| un chemin hors de livraison/ admis | UP-4 | poste | PASS — chemin sous le dossier d'un autre pack : statut 200, 1 adresse(s) signée(s) (400 sans adresse attendu) ; adresse signée hors des chemins permis : packs-pubs/22222222-222… |
| aucune borne de taille | UP-4 | poste | PASS — fichier de plus de 60 Mo : statut 200, 1 adresse(s) signée(s) (400 sans adresse attendu) |
| stockage à 99 % toléré | UP-4 | poste | PASS — stockage à 61 % : statut 200, 1 adresse(s) signée(s) (507 sans adresse attendu) |
| stockage non mesurable toléré | UP-4 | poste | PASS — stockage non mesurable (erreur) : statut 200, 1 adresse(s) signée(s) (507 sans adresse attendu) ; stockage non mesurable (valeur nulle) : statut 200, 1 adresse(s) signée… |
| le type n'est pas vérifié | UP-4 | poste | PASS — type video/avi : statut 200, 1 adresse(s) signée(s) (400 sans adresse attendu) |
| l'empreinte n'est pas vérifiée | UP-5 | poste | PASS — une empreinte SHA-256 fausse : statut 200, corps {"ok":true}, état fabriquee, la route a modifié autre chose que le compteur d'échecs ({ ok: false, raison } et payee att… |
| les octets magiques ne sont pas vérifiés | UP-5 | poste | PASS — des octets magiques faux (empreinte juste) : statut 200, corps {"ok":true}, état fabriquee, la route a modifié autre chose que le compteur d'échecs ({ ok: false, raison … |
| un juge non vert accepté | UP-5 | poste | PASS — un juge au code 1 : statut 200, corps {"ok":true}, état fabriquee, la route a modifié autre chose que le compteur d'échecs ({ ok: false, raison } et payee attendus) |
| les fichiers du pack ne sont pas relus | UP-5 | poste | PASS — fichiers relus : aucun ; les six du pack attendus ; un fichier absent du stockage : statut 200, corps {"ok":true}, état fabriquee, la route a modifié autre chose que le … |
| payee → fabriquee sans condition | UP-5 | poste | PASS — écriture : 1 mise(s) à jour vers fabriquee (filtres {"id":"eq.11111111-1111-4111-8111-111111111111","select":"id"}) (une seule, conditionnée à id et etat = payee, attend… |
| le premier échantillon tranché sans Benj | UP-5 | poste | PASS — premier échantillon : statut 200, corps {"ok":true}, décision tranchee (ouverte attendue : Benj regarde d'abord) ; décision pour Benj : 0 décision(s) à options envoyer/r… |
| le lien d'aperçu absent de la décision | UP-5 | poste | PASS — aperçu : lien signé 600 s, absent de la décision (10 min au plus, dans la décision, attendu) |
| plus de reprise arrêtée au 3e échec | UP-5 | poste | PASS — après trois ok: false : état payee, le pack est repris à 91 min (plus de reprise attendue) ; après trois empreintes fausses : état payee, le pack est repris à 91 min (pl… |
| User=usine | UP-10 | poste | PASS — User=usine (agents attendu) |
| Nice=5 | UP-10 | poste | PASS — Nice=5 (10 attendu) |
| MemoryMax=8G | UP-10 | poste | PASS — MemoryMax=8G (une valeur finie de 4G au plus attendue) |
| le jeton du livreur (UP-10, décision du 27/09) | UP-10 | poste | PASS — ExecStart = « /usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_LIVREUR_USINE -- /usr/bin/node --import ./scripts/ts-loader.mjs scripts/usine/pubs.mjs --une-passe… |
| EnvironmentFile= : tout le coffre | UP-10 | poste | PASS — EnvironmentFile= présent : il chargerait tout le coffre |
| PRESTI_JETON_STUDIO absent de la liste fermée du coffre | UP-10 | poste | PASS — PRESTI_JETON_STUDIO est absent de NOMS_PERMIS (scripts/usine/coffre-regles.mjs) : avec-coffre.mjs refuserait de lancer l'unité (code 2) et usine-coffre.mjs de poser le j… |
| Persistent=false | UP-10 | poste | PASS — Persistent=false (true attendu) |
| toutes les 30 min | UP-10 | poste | PASS — minuteur : OnCalendar=*:0/30 (toutes les 15 min attendu) |
| le juge d'un pack ignoré | UP-6 | usine | PASS — juge rouge : 1 demande(s) de dépôt, 6 envoi(s) (aucun attendu) ; juge rouge : rendus [{"travail":"11111111-1111-4111-8111-111111111111","ok":true,"fichiers":[{"chemin":"… |
| la voix produite après la fabrication | UP-6 | usine | PASS — ordre : la voix vient après la fabrication ; voix.mp3 absent quand fabriquer démarre ; ; pub-locale-qa : 0 appel(s), pas avant le premier dépôt ; depot : fichiers annonc… |
| une autre voix que ff_siwis | UP-6 | usine | PASS — voix : 1 appel(s) de hyperframes tts, voix af_heart ; ff_siwis sur le texte_voix du pack attendu |
| aucun verrou par travail | UP-6 | usine | PASS — deux passages simultanés : 2 fabrication(s), 2 rendu(s) ok (une et un attendus), codes 0/0 |
| dossiers de travail en 0755 | UP-6 | usine | PASS — dossiers de travail : presti-pubs 775, presti-pubs/<pack> 775, presti-pubs/<pack>/photos 775 (0700 attendu) |
| les photos laissées par adresse | UP-6 | usine | PASS — pack.json : pack_id 11111111-1111-4111-8111-111111111111, 4 photos, des adresses y figurent, (photos locales et rôles du travail attendus : fabriquer.mjs refuse une adre… |
| aucun rendu en échec | UP-6 | usine | PASS — juge rouge : rendus [] (ok: false et une raison attendus, jamais ok: true) |
| des empreintes fausses au rendu | UP-6 | usine | PASS — le faux Presti a refusé : rendu (empreinte_fausse) ; rendu : les empreintes des six fichiers manquent ou sont fausses |
| la garde du Studio ignorée | UP-7 | usine | PASS — garde en code 3 : le tourneur continue (codex, hyperframes, ffmpeg, monter) ; garde en code 3 : 1 montage(s), 0 dépôt(s), rendus [{"travail":"33333333-3333-4333-8333-333… |
| l'accord de la marque envoyé au lanceur | UP-7 | usine | PASS — lecteur : 1 appel(s) du lanceur, ses données portent le Message-ID de la marque, la réponse d'accord |
| l'extrait des allégations non contrôlé | UP-7 | usine | PASS — allégation dont l'extrait n'est pas sur la page : 1 montage(s), 1 dépôt(s), rendus [{"travail":"33333333-3333-4333-8333-333333333333","ok":true,"fichiers":[{"chemin":"pa… |
| un présentateur virtuel accepté | UP-7 | usine | PASS — script avec un présentateur virtuel : 1 montage(s), 1 dépôt(s), rendus [{"travail":"33333333-3333-4333-8333-333333333333","ok":true,"fichiers":[{"chemin":"packs-pubs/stu… |
| robots.txt ignoré | UP-7 | usine | PASS — robots.txt interdit : le tourneur lit robots, page, image et lance le lecteur 1 fois ; robots.txt qui interdit : 1 montage(s), 1 dépôt(s), rendus [{"travail":"33333333-3… |
| plus d'une requête par seconde vers la marque | UP-7 | usine | PASS — écarts entre requêtes vers la marque : 5 ms, 3 ms (1 000 ms au moins attendus) |
| le User-Agent du Lecteur oublié | UP-7 | usine | PASS — lecture de la marque : robots → page → image ; User-Agent node (robots, page, image avec UA_RECENSEUR attendus) |
| pub-qa ignoré avant le dépôt | UP-7 | usine | PASS — pub-qa rouge : 1 montage(s), 1 dépôt(s), rendus [{"travail":"33333333-3333-4333-8333-333333333333","ok":true,"fichiers":[{"chemin":"packs-pubs/stud… (rien monté ni dépos… |
| un outil payant lancé | UP-7 | usine | PASS — outil payant ou repli lancé : elevenlabs |
| le jeton dans le journal | UP-8 | usine | PASS — le jeton d'agent apparaît : pack : la sortie du tourneur |
| le jeton passé aux outils enfants | UP-8 | usine | PASS — le jeton est transmis dans l'environnement d'un outil enfant : pack : hyperframes ; pack : ffmpeg ; pack : fabriquer (les enfants reçoivent un environnement sans secret) |
| le texte de la réponse affiché | UP-8 | usine | PASS — la sortie du tourneur contient : studio : accord dans la sortie |
| le jeton envoyé à la marque | UP-8 | usine | PASS — le jeton est envoyé à un autre serveur que Presti : studio : web |
| un fichier écrit hors des lieux permis | UP-8 | usine | PASS — écriture hors des lieux permis : pack : cache-pubs.json sous HOME |
| le dossier temporaire laissé plein | UP-8 | usine | PASS — le dossier temporaire n'est pas vidé : pack : passage.tmp |
| une exception sur le bus injoignable | UP-9 | usine | PASS — bus injoignable : code 1 ; trace de pile ; (node:604712) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///home/usine/bacs/pubs/lib/agents/llm.ts is not spe… |
| hyperframes absent non reconnu | UP-9 | usine | PASS — hyperframes absent (pack) : rendus [{"travail":"11111111-1111-4111-8111-111111111111","ok":false,"raison":"voix_en_echec"}], 0 dépôt(s) (ok: false, raison outil_absent e… |
| le verrou jamais levé | UP-9 | usine | PASS — reprise : 1 fabrication(s), 0 rendu(s) ok (le passage suivant doit refaire le travail et le rendre : un verrou ne doit pas rester) |

Arbre sans fichiers (racine vide jugée par le CLI lui-même) : PASS — FAIL UP-1 — absent(s) : app/api/usine/pubs/travail/route.ts, app/api/usine/pubs/depot/route.ts, app/api/usine/pubs/rendu/route.ts, lib/pubs/usinePubs.ts, scrip…

Non-régression (`--temoin`) : PASS — package.json identique au HEAD ; npm run typecheck vert

## search-console-qa

### 1. Critère attendu en échec sur l'arbre courant : SC-1 (aucun lib/sites/searchConsole.ts)

Commande : `node scripts/search-console-qa.mjs` — code 1.

```
FAIL SC-1 — module/exports/appel du tour absent
search-console-qa : FAIL — SC-1
```

### 2. Verdict du témoin

```
PASS faux Google (auto-contrôle) — {"verdict":"PASS","appels":12,"rsa_2048_rs256_verifie":true,"assertion_invalide_refusee":true,"quatre_claims_fautifs_signes_refuses":true,"jeton_invalide_refuse":true,"panne_503_reelle":true,"journal…
PASS témoin causal
```

### 3. Les fautes plantées

| faute plantée | critère visé | extrait réel de la sortie |
|---|---|---|
| scope | SC-2 | PASS — signature/claims/échange OAuth refusé par faux Google |
| date avant refus | SC-3 | PASS — ordre/date incorrect |
| bucket supplémentaire | SC-4 | PASS — écriture bucket supplémentaire/incorrecte |
| sans objet ignoré | SC-5 | PASS — absence de domaine/déjà soumis non classé sans_objet |
| jeton journalisé | SC-7 | PASS — secret en console/erreur rendue |
| quatre commandes | SC-6 | PASS — trois commandes par tour non respectées |
| quatrième essai | SC-6 | PASS — quatrième essai après trois échecs |
| pause ignorée | SC-6 | PASS — appel sous pause |
| compteur perdu | SC-6 | PASS — compteur/par commande ou autres vérifications perdus |

Arbre sans module : PASS — FAIL SC-1 — module/exports/appel du tour absent | search-console-qa : FAIL — SC-1

Non-régression : PASS — package identique ; typecheck réel vert
