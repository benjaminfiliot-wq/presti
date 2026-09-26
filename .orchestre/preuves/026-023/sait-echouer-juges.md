# Les quatre juges du lot B savent échouer

Produit par `node .orchestre/preuves/026-023/outils/sait-echouer.mjs` le 2026-09-26T14:34:16.424Z (EA-5 rejouée(s) le 2026-09-26T14:43:56.980Z, après un complément du jeu d'essai). Maquettes : `.orchestre/travail/026-023-maquette/` (implémentation témoin de 026-025 et 026-027, jamais livrée) et `.orchestre/travail/026-023-maquette-2/` (la même plus 026-030 et 026-035) ; copie témoin : `.orchestre/travail/026-023-temoin/` (app, lib, supabase de l'arbre courant). Pour chaque ligne : une entrée cassée, le juge relancé, la ligne rouge relevée telle quelle, puis l'original restauré et vérifié octet pour octet.

## Témoins avant mutation

- AP : .orchestre/travail/026-023-maquette, mode complet → code 0 (tout vert) ; copie témoin, --temoin → code 0
- LC : .orchestre/travail/026-023-maquette, mode complet → code 0 (tout vert) ; copie témoin, --temoin → code 0
- CD : .orchestre/travail/026-023-maquette-2, mode complet → code 0 (tout vert) ; copie témoin, --temoin → code 0
- EA : .orchestre/travail/026-023-maquette-2, mode complet → code 1 ; rouge(s) de départ : ❌ EA-10 (NR) lib/flags.ts modifié (interdit à 026-035) ; lib/siteCommande.ts modifié (interdit à 026-035) ; lib/siteCommandeServeur.ts modifié (interdit à 026-035) ; app/api/site/commander/route.ts m… ; copie témoin, --temoin → code 0

EA-10 reste rouge sur la maquette 2 : il compare lib/flags.ts, lib/siteCommande.ts, lib/siteCommandeServeur.ts et app/api/site/commander/** à HEAD, et la maquette 2 porte les changements de 026-025 et 026-030, qui seront poussées avant que 026-035 se juge. Sa capacité à échouer se prouve sur la copie témoin (dernière ligne du tableau).

## Mutations

| Juge | Critère | Mode | Fichier cassé | Code | Pris | Restauré | Ligne rouge (extrait réel) |
|---|---|---|---|---|---|---|---|
| AP | AP-1 | complet | .orchestre/travail/026-023-maquette/lib/siteAchatPublic.ts | 1 | oui | oui | ❌ AP-1 lib/siteAchatPublic.ts n'exporte pas purgerBrouillonsPublics |
| AP | AP-2 | complet | .orchestre/travail/026-023-maquette/lib/siteCommandeServeur.ts | 1 | oui | oui | ❌ AP-2 hors des champs permis, avec compte ≠ public : $.billing_address_collection : "required" ≠ "auto" |
| AP | AP-3 | complet | .orchestre/travail/026-023-maquette/lib/siteCommandeServeur.ts | 1 | oui | oui | ❌ AP-3 line_items[0].price_data.unit_amount = 30001, PRIX_SITE_CENTS (30000) attendu |
| AP | AP-4 | complet | .orchestre/travail/026-023-maquette/app/api/site/commander/public/route.ts | 1 | oui | oui | ❌ AP-4 « CGU non cochées » → 200, 400 attendu ; « CGU non cochées » : 2 écriture(s), 0 attendue ; « CGU non cochées » : un Checkout créé |
| AP | AP-5 | complet | .orchestre/travail/026-023-maquette/app/api/stripe/webhook/route.ts | 1 | oui | oui | ❌ AP-5 1er passage : appels auth.admin [], createUser puis generateLink attendus ; 1er passage : 0 e-mail(s) à l'acheteur, 1 attendu ; 1er passage : lien_envoye_le vide ; 1er passage : lien_envois = 0, 1 attendu ; 2e passage : -2 nouvel(s) appel(s) à auth.admin, 0 attendu ; 2e passage : -1 nouvel e-mail, 0 attendu ; … (10 défauts) |
| AP | AP-6 | complet | .orchestre/travail/026-023-maquette/lib/siteAchatPublic.ts | 1 | oui | oui | ❌ AP-6 critique = false, true attendu |
| AP | AP-7 | complet | .orchestre/travail/026-023-maquette/app/api/site/commander/public/renvoyer/route.ts | 1 | oui | oui | ❌ AP-7 4 appels dans l'heure : 4 e-mail(s), 3 attendus |
| AP | AP-8 | complet | .orchestre/travail/026-023-maquette/lib/siteAchatPublic.ts | 1 | oui | oui | ❌ AP-8 lignes restantes ["cmd-achat-public-026b","cmd-autre-026b","cmd-brouillon-compte-026b","cmd-brouillon-recent-026b","cmd-brouillon-vieux-026b","cmd-payee-non-pub-026b"], ["cmd-achat-public-026b","cmd-autre-026b","cmd-brouillon-compte-026b","cmd-brouillon-recent-026b","cmd-payee-non-pub-026b"] attendues (seule cmd-brouillon-vieux-026b s'efface) |
| AP | AP-9 | complet | .orchestre/travail/026-023-maquette/lib/flags.ts | 1 | oui | oui | ❌ AP-9 lib/flags.ts ne porte pas siteAchatPublic: false |
| AP | AP-10 | temoin | .orchestre/travail/026-023-temoin/lib/stripe.ts | 1 | oui | oui | ❌ AP-10 (NR) lib/stripe.ts modifié (interdit à 026-025) |
| AP | AP-11 | complet | .orchestre/travail/026-023-maquette/lib/siteAchatPublic.ts | 1 | oui | oui | ❌ AP-11 tsc --noEmit en code 2 en 12 s : 1 erreur(s) — lib/siteAchatPublic.ts(36,14): error TS2322: Type 'string' is not assignable to type 'number'. |
| LC | LC-1 | complet | .orchestre/travail/026-023-maquette/app/api/auth/lien/route.ts | 1 | oui | oui | ❌ LC-1 app/api/auth/lien/route.ts exporte GET (le jeton ne se consomme que par un POST) |
| LC | LC-2 | complet | .orchestre/travail/026-023-maquette/app/api/auth/lien/route.ts | 1 | oui | oui | ❌ LC-2 app/api/auth/lien/route.ts : isBanned( introuvable |
| LC | LC-3 | complet | .orchestre/travail/026-023-maquette/app/api/auth/lien/route.ts | 1 | oui | oui | ❌ LC-3 21 appels d'une même adresse → 200, 200, 200, … 200, 200 ; 200 × 20 puis 429 attendus |
| LC | LC-4 | complet | .orchestre/travail/026-023-maquette/app/api/auth/lien/route.ts | 1 | oui | oui | ❌ LC-4 app/api/auth/lien/route.ts écrit aal |
| LC | LC-5 | complet | .orchestre/travail/026-023-maquette/app/connexion/lien/page.tsx | 1 | oui | oui | ❌ LC-5 app/connexion/lien/page.tsx : un useEffect poste ou ouvre une session au chargement (« { fetch('/api/auth/lien', { method: 'POST', headers: { 'Con… ») ; app/connexion/lien/page.tsx : un fetch hors d'un gestionnaire de clic (dans Lien ; gestionnaires onClick : ouvrir) |
| LC | LC-6 | complet | .orchestre/travail/026-023-maquette/lib/siteAchatPublic.ts | 1 | oui | oui | ❌ LC-6 deux appels simultanés : 2 commande(s) rendue(s), 2 ligne(s) mise(s) à jour ; 1 et 1 attendus (mise à jour conditionnelle artisan_id is null) |
| LC | LC-7 | complet | .orchestre/travail/026-023-maquette/app/api/auth/lien/route.ts | 1 | oui | oui | ❌ LC-7 tsc --noEmit en code 2 en 4 s : 1 erreur(s) — app/api/auth/lien/route.ts(11,14): error TS2322: Type 'string' is not assignable to type 'number'. |
| LC | LC-9 | temoin | .orchestre/travail/026-023-temoin/lib/connexion.ts | 1 | oui | oui | ❌ LC-9 (NR) lib/connexion.ts modifié (interdit à 026-027) |
| CD | CD-1 | complet | .orchestre/travail/026-023-maquette-2/lib/siteCommandeServeur.ts | 1 | oui | oui | ❌ CD-1 lib/siteCommandeServeur.ts n'exporte pas commandesACompleter |
| CD | CD-2 | complet | .orchestre/travail/026-023-maquette-2/lib/siteCommande.ts | 1 | oui | oui | ❌ CD-2 « 13 prestations : la 13e est écartée » : ["P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12","P13"], ["P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12"] attendu ; « 13 prestations : la 13e est écartée » : 13 prestations, 12 au plus |
| CD | CD-3 | complet | .orchestre/travail/026-023-maquette-2/lib/siteCommande.ts | 1 | oui | oui | ❌ CD-3 (NR) PRIX_SITE_TEXTE : "299 €", "300 €" attendu (référence 4041ec9) |
| CD | CD-3 | temoin | .orchestre/travail/026-023-temoin/lib/siteCommande.ts | 1 | oui | oui | ❌ CD-3 (NR) PRIX_SITE_TEXTE : "299 €", "300 €" attendu (référence 4041ec9) |
| CD | CD-4 | complet | .orchestre/travail/026-023-maquette-2/lib/siteCommandeServeur.ts | 1 | oui | oui | ❌ CD-4 l'objet de mise à jour porte etat, prix_cents, stripe_session_id, paye_le, artisan_id, email, achat_public, genere_le (seuls domaine_mode, domaine, metier, metiers_secondaires, communes, matiere, modifie_le sont permis) ; etat a changé ("payee" → "en_ligne") ; prix_cents a changé (30000 → 1) ; stripe_session_id a changé ("cs_sim_payee_artisan_026b" → "cs_pirate_026b") ; paye_le a changé ("2026-09-25T12:00:00Z" → "2020-01-01T00:00:00Z") ; artisan_id a changé ("90000000-0000-4000-8000-0000000b0002" → "90000000-0000-4000-8000-000000000999") ; … (9 défauts) |
| CD | CD-5 | complet | .orchestre/travail/026-023-maquette-2/app/api/site/commander/complement/route.ts | 1 | oui | oui | ❌ CD-5 GET lit sites_commandes avant rattacherCommandesParEmail |
| CD | CD-6 | complet | .orchestre/travail/026-023-maquette-2/app/api/site/commander/complement/route.ts | 1 | oui | oui | ❌ CD-6 tsc --noEmit en code 2 en 4 s : 1 erreur(s) — app/api/site/commander/complement/route.ts(11,14): error TS2322: Type 'string' is not assignable to type 'number'. |
| EA | EA-1 | complet | .orchestre/travail/026-023-maquette-2/app/site/commander/merci/page.tsx | 1 | oui | oui | ❌ EA-1 app/site/commander/merci/page.tsx n'appelle pas notFound() ; app/site/commander/merci/page.tsx : notFound() ne suit pas !actif('siteAchatPublic') |
| EA | EA-2 | complet | .orchestre/travail/026-023-maquette-2/app/site/acheter/page.tsx | 1 | oui | oui | ❌ EA-2 390 px : 5 champ(s) visible(s) (email, entreprise, metier, telephone, commune), 4 attendus ; 1440 px : 5 champ(s) visible(s) (email, entreprise, metier, telephone, commune), 4 attendus |
| EA | EA-3 | complet | .orchestre/travail/026-023-maquette-2/app/site/commander/merci/page.tsx | 1 | oui | oui | ❌ EA-3 app/site/commander/merci/page.tsx : un useEffect poste au chargement ; app/site/commander/merci/page.tsx : un fetch hors d'un gestionnaire de clic (dans Merci) ; 390 px : /site/commander/merci appelle POST /api/site/commander/public/renvoyer au chargement ; 1440 px : /site/commander/merci appelle POST /api/site/commander/public/renvoyer au chargement |
| EA | EA-4 | complet | .orchestre/travail/026-023-maquette-2/app/site/commander/page.tsx | 1 | oui | oui | ❌ EA-4 l'écran en mode compléter montre encore une étape de paiement (« 6. Le paiement ») |
| EA | EA-5 | complet | .orchestre/travail/026-023-maquette-2/lib/suiteSure.ts | 1 | oui | oui | ❌ EA-5 « barre oblique inverse après le préfixe » ("/site/commander\\evil") → "/site/commander\\evil", "/outils" attendu |
| EA | EA-6 | complet | .orchestre/travail/026-023-maquette-2/app/site/acheter/page.tsx | 1 | oui | oui | ❌ EA-6 défilement horizontal à 390 px sur /site/acheter |
| EA | EA-8 | complet | .orchestre/travail/026-023-maquette-2/lib/suiteSure.ts | 1 | oui | oui | ❌ EA-8 tsc --noEmit en code 2 en 6 s : 1 erreur(s) — lib/suiteSure.ts(2,14): error TS2322: Type 'string' is not assignable to type 'number'. |
| EA | EA-9 | complet | .orchestre/travail/026-023-maquette-2/lib/urls.ts | 1 | oui | oui | ❌ EA-9 SLUGS_RESERVES ne contient pas 'commander' |
| EA | EA-10 | temoin | .orchestre/travail/026-023-temoin/lib/siteCommande.ts | 1 | oui | oui | ❌ EA-10 (NR) lib/siteCommande.ts modifié (interdit à 026-035) |

Bilan : 35 mutation(s) prise(s) sur 35, tous les originaux restaurés.

