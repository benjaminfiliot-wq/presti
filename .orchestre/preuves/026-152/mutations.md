# 026-152 — contre-vérification des 16 juges de la livraison et de la trésorerie

Script : `node scripts/juges-026-lt-mutations.mjs` ; 39/39 mutation(s) prise(s) ; 10/16 témoin(s) vert(s) ; 543 s.

## Échecs
- TÉMOIN scripts/achat-public-qa.mjs : code 1, en échec : AP-9, AP-10 ; FAIL AP-9 — scripts/fermeture-e2e.mjs : le commit qui a introduit siteAchatPublic est introuvable dans l'historique ; scripts/fermeture-e2e.mjs (base 9dca36e) : ligne 85 retirée ou changée : « const DERRIERE_UN_DRAPEAU … || FAIL AP-10 — (NR) scripts/webhook-muet-qa.mjs : code 1 — FAIL WM-3 — lib/stripe.ts absent de HEAD du dépôt (74004ee) ; lib/stripe.ts absent de 1620723 ; lib/abonnementSync.ts absent de HEAD du dép…
- TÉMOIN scripts/complement-dossier-qa.mjs : code 1, en échec : CD-3 ; FAIL CD-3 — (NR) scripts/parcours-commande-qa.mjs --temoin : code 1 — FAIL PC-1 — interrompu : arbre extrait différent de 1620723 : 0 manquant(s), 0 en trop, 0 différent(s) ()
- TÉMOIN scripts/tuile-argent-qa.mjs : code 1, en échec : TA-5 ; FAIL TA-5 — lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteGenerationDistante → demanderGeneration ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBu…
- TÉMOIN scripts/livraison-tour-qa.mjs : code 1, en échec : TL-8 ; FAIL TL-8 — app/api/cron/relances/route.ts (base ba7d5b6) : import ajouté hors contrat : @/lib/packPubPurge → purgerPacksExpires ; app/api/cron/relances/route.ts (base ba7d5b6) : import ajouté hors contrat : @/lib/agent…
- TÉMOIN scripts/retrait-site-qa.mjs : code 1, en échec : RT-6, RT-7 ; FAIL RT-6 — (NR) node scripts/parcours-commande-qa.mjs --temoin : code 1 — FAIL PC-1 — interrompu : arbre extrait différent de 1620723 : 0 manquant(s), 0 en trop, 0 différent(s) () || FAIL RT-7 — lib/siteLivraison.ts : tourLivraison ne s'importe pas (The requested module '@/lib/siteLivraisonBus' does not provide an export named 'battementTresorier')
- TÉMOIN scripts/generation-actions-qa.mjs : code 1, en échec : GA-6 ; FAIL GA-6 — import ajouté hors contrat : @/lib/siteLivraisonBus → busEnPause ; import ajouté hors contrat : @/lib/siteLivraisonBus → cloreTacheLivraison ; import ajouté hors contrat : @/lib/siteLivraisonBus → battementL…

## Témoins (juge lancé sur la copie intacte)
- PASS témoin scripts/achat-ecrans-qa.mjs — code 0 en 86 s
- FAIL témoin scripts/achat-public-qa.mjs — code 1 en 86 s ; critères en échec sur l'arbre réel : AP-9, AP-10
- FAIL témoin scripts/complement-dossier-qa.mjs — code 1 en 36 s ; critères en échec sur l'arbre réel : CD-3
- FAIL témoin scripts/tuile-argent-qa.mjs — code 1 en 35 s ; critères en échec sur l'arbre réel : TA-5
- FAIL témoin scripts/livraison-tour-qa.mjs — code 1 en 28 s ; critères en échec sur l'arbre réel : TL-8
- PASS témoin scripts/tresorerie-qa.mjs — code 0 en 31 s
- PASS témoin scripts/lien-connexion-qa.mjs — code 0 en 28 s
- PASS témoin scripts/bus-livraison-qa.mjs — code 0 en 42 s
- PASS témoin scripts/poste-sites-qa.mjs — code 0 en 42 s
- FAIL témoin scripts/retrait-site-qa.mjs — code 1 en 40 s ; critères en échec sur l'arbre réel : RT-6, RT-7
- PASS témoin scripts/dossier-zip-qa.mjs — code 0 en 31 s
- PASS témoin scripts/commande-exporter-qa.mjs — code 0 en 19 s
- PASS témoin scripts/redacteur-v2-qa.mjs — code 0 en 36 s
- PASS témoin scripts/livrer-site-qa.mjs — code 0 en 139 s
- FAIL témoin scripts/generation-actions-qa.mjs — code 1 en 26 s ; critères en échec sur l'arbre réel : GA-6
- PASS témoin scripts/livraison-schema-qa.mjs — code 0 en 2 s

## Mutations (une ligne par faute : fichier:ligne cassé, critère attendu en échec, ligne réelle du juge)
- PASS EA-5 — suiteSure accepte //evil.fr ; lib/suiteSure.ts:3 ; FAIL EA-5 — « adresse relative de protocole » ("//evil.fr") → "//evil.fr", "/outils" attendu ; « remontée de chemin » ("/outils/../x") → "/outils/../x", "/outils" attendu ; « deux barres après le préfixe » ("/site/commander//evil.fr") → "/site/commander//evil.fr", "/outils" attendu
- PASS EA-2 — le piège website rendu visible ; app/site/acheter/page.tsx:50 ; FAIL EA-2 — 390 px : le piège website est visible à l'écran ; 1440 px : le piège website est visible à l'écran
- PASS AP-6 — le lien part vers une adresse qui n'est pas celle de la commande en base ; lib/siteAchatPublic.ts:82 ; FAIL AP-6 — destinataire "corps-de-requete@presti-test.invalid", acheteur-026@presti-test.invalid attendu
- PASS AP-5 — password ajouté à createUser ; lib/siteAchatPublic.ts:73 ; FAIL AP-5 — 1er passage : createUser porte un password
- PASS AP-5 — l'erreur d'envoi du lien est avalée ; app/api/stripe/webhook/route.ts:81 ; FAIL AP-5 — envoi refusé → 200, 500 attendu (Stripe doit rejouer)
- PASS CD-4 — etat accepté dans la mise à jour du dossier ; lib/siteCommandeServeur.ts:54 ; FAIL CD-4 — l'objet de mise à jour porte etat (seuls domaine_mode, domaine, metier, metiers_secondaires, communes, matiere, modifie_le sont permis) ; etat a changé ("payee" → "en_ligne")
- PASS CD-4 — la condition genere_le is null retirée ; lib/siteCommandeServeur.ts:56 ; FAIL CD-4 — genere_le posé : 1 écriture(s), 0 attendue
- PASS TA-2 — un .reduce( sur des montants dans la route ; app/api/controle/tresorerie/route.ts:32 ; FAIL TA-2 — la route contient .reduce( (ligne 32)
- PASS TA-4 — l'alerte de TVA part aussi le mardi ; lib/direction/veilleTresorerie.ts:12 ; FAIL TA-4 — « mardi 0 h 30 à Paris (lundi en UTC), 90 % » : 1 alerte(s), 0 attendue
- PASS TA-5 — veilleTresorerie() appelée hors de son try dans tourLivraison ; lib/siteLivraison.ts:194 ; déjà rouge sur le témoin (24 défauts), 25 défauts avec la faute plantée ; FAIL TA-5 — lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteGenerationDistante → demanderGeneration ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBus → busEnPause ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contra…
- PASS TL-4 — la réservation n'est plus retirée après un échec d'envoi ; lib/siteLivraison.ts:95 ; FAIL TL-4 — envoi refusé : la réservation n'est pas retirée (courriels porte ["payee","en_ligne"]) ; après un envoi refusé, le passage suivant fait 0 envoi(s), 2 attendus ; envoi qui lève : la réservation n'est pas retirée (courriels porte ["payee","en_ligne"]) ; après un envoi qui lève, le passage…
- PASS TL-5 — critique: true retiré de l'envoi du courriel de livraison ; lib/siteLivraison.ts:90 ; FAIL TL-5 — envoi 1 : critique = undefined, true attendu ; envoi 2 : critique = undefined, true attendu
- PASS TR-2 — >= devient > dans situerTva (le jour du seuil ne dépasse plus) ; lib/direction/tresorerie.ts:29 ; FAIL TR-2 — « pile au seuil » : depasse = false, true attendu
- PASS TR-6 — un .update( Stripe ajouté dans le module de trésorerie ; lib/direction/tresorerie.ts:18 ; FAIL TR-6 — lib/direction/tresorerie.ts:18 « const ecrireStripe = (s: { subscriptions: { update: (id: string, p: o… »
- PASS LC-1 — un GET qui consomme le jeton ; app/api/auth/lien/route.ts:36 ; FAIL LC-1 — app/api/auth/lien/route.ts exporte GET (le jeton ne se consomme que par un POST)
- PASS LC-5 — la page poste au chargement ; app/connexion/lien/page.tsx:41 ; FAIL LC-5 — app/connexion/lien/page.tsx : un useEffect poste ou ouvre une session au chargement (« { setLienLisible(lireAdresse().jeton !== null); void fetch(… ») ; app/connexion/lien/page.tsx : un fetch hors d'un gestionnaire de clic (dans LienConnexionPage ; gestionnaires onClick : ouvrirDossier)
- PASS BL-2 — busEnPause rend faux sur erreur ; lib/siteLivraisonBus.ts:8 ; FAIL BL-2 — busEnPause, erreur PostgREST (400) : false, true attendu ; busEnPause, erreur serveur (500) : false, true attendu
- PASS BL-4 — l'appel du tic sans condition de minute ; app/api/agents/tic/route.ts:85 ; FAIL BL-4 — l’appel à tourLivraison n’est sous aucune condition de minute multiple de 15 (« % 15 ») ; à 10 h 16 : tourLivraison appelée 1 fois, jamais attendu
- PASS BL-3 — la clé livraison:<id> au lieu de livrer_site:<id> ; lib/siteLivraisonBus.ts:14 ; FAIL BL-3 — hors pause : 0 ops_tache_clore pour la commande generee, exactement un attendu
- PASS BL-1 — ops_tache_rendre au lieu d'ops_tache_clore ; lib/siteLivraisonBus.ts:14 ; FAIL BL-1 — ops_tache_clore appelée 0 fois, une attendue (appels : ops_interrupteur, ops_tache_rendre, ops_battement, ops_battement)
- PASS PS-2 — la garde exigerDomaine retirée ; app/api/controle/sites/[id]/route.ts:39 ; FAIL PS-2 — (NR) instruction 3 de POST : « const { id } », « const perimetre = exigerDomaine(f, 'clients', 'ecrire') » attendue (référence 4041ec9) ; instruction 4 de POST : « = await ctx.params », « if (domaineRefuse(perimetre)) return reponseRefus(perimetre) » attendue (référence 4041ec9)
- PASS PS-4 — envoyer_dossier sans reconfirmation ; app/api/controle/sites/[id]/route.ts:90 ; FAIL PS-4 — envoyer_dossier sans reconfirmation → 200 null, 403 « reconfirmation_requise » attendu ; envoyer_dossier sans reconfirmation : un jeton ou un e-mail est parti ; envoyer_dossier : exigerReconfirmation jamais appelée
- PASS RT-3 — detacherDomaine avant l'e-mail du dossier ; lib/siteRetrait.ts:81 ; FAIL RT-3 — succès : ordre detacher → jeton → email → maj → detacher → notifier ; jeton → e-mail → mise à jour → détachement → notification attendu ; détachement : ["couvreur-temoin.fr","couvreur-temoin.fr"], [couvreur-temoin.fr] attendu ; second appel sur la même commande : un second détachement ;…
- PASS RT-4 — marquerSuppression avant if (echec) ; lib/purgeComptes.ts:139 ; FAIL RT-4 — lib/purgeComptes.ts : marquerSuppression( est avant le bloc if (echec) : il doit le suivre (purge réussie seulement) ; lib/purgeComptes.ts : 2 appel(s) ajouté(s) à marquerSuppression(, 1 attendu ; purge réussie : marquerSuppression [[["d0260000-0000-4000-8000-00000000ee01","d0260000-000…
- PASS DZ-2 — === au lieu de timingSafeEqual ; lib/siteDossier.ts:43 ; FAIL DZ-2 — lib/siteDossier.ts n'appelle pas timingSafeEqual (lu dans le source, commentaires exclus)
- PASS DZ-2 — l'expiration du jeton est ignorée ; lib/siteDossier.ts:43 ; FAIL DZ-2 — verifierJetonDossier, bon jeton, 91 j après (expiré) : true, false attendu
- PASS EX-3 — withMetadata() ajouté : le GPS EXIF ressort ; scripts/commande-exporter.mjs:151 ; FAIL EX-3 — photos/bibliotheque-480.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-480.webp garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.webp garde un bloc EXIF (186 octets) ; photos/escalier-1600.avif garde un …
- PASS EX-7 — l'hôte et le dossier de la photo ne sont plus vérifiés : une photo d'un autre hôte et d'un autre compte est téléchargée ; scripts/commande-exporter.mjs:52 ; FAIL EX-7 — le serveur du juge a reçu 2 requête(s) pour une photo refusée : GET /00000000-0000-4000-8000-000000260292/voisin.jpg ; GET /00000000-0000-4000-8000-000000260292/ailleurs.jpg
- PASS RV-3 — une invention (« 15 ans d’expérience ») dans le texte des pages de commune ; lib/siteRedacteur.ts:291 ; FAIL RV-3 — script (--sans-ia, modèle de la racine) : findFabrications → 15 ans ; fonction sans appel (modèle à cinq prestations) : findFabrications → 15 ans ; fonction, doublure propre : findFabrications → 15 ans
- PASS RV-6 — la dégradation retirée : le texte fautif de la seconde réponse est gardé ; lib/siteRedacteur.ts:232 ; FAIL RV-6 — fautive : 15 ans reste dans la version finale ; fautive : \bRGE\b reste dans la version finale
- PASS RV-7 — le SIREN est envoyé à appel ; lib/siteRedacteur.ts:217 ; FAIL RV-7 — requête 1 : le SIREN est envoyé ; requête 2 : le SIREN est envoyé ; requête 3 : le SIREN est envoyé ; requête 4 : le SIREN est envoyé ; requête 5 : le SIREN est envoyé ; requête 6 : le SIREN est envoyé ; … (9 défauts)
- PASS CH-5 — le plafond de régénérations passe à 3 ; scripts/livrer-site.mjs:147 ; FAIL CH-5 — le rédacteur a été appelé 2 fois, 1 attendue (aucune nouvelle rédaction au plafond)
- PASS CH-3 — la livraison s'assemble sous public/ au lieu de .orchestre/travail/ ; scripts/livrer-site.mjs:8 ; FAIL CH-3 — public/livraison/journal.jsonl du banc ajouté par livrer-site
- PASS CH-11 — --usine : une --sortie sous la racine du dépôt (donc sous public/) est acceptée ; scripts/livrer-site.mjs:24 ; FAIL CH-11 — sortie dans le dépôt : code 0, 2 attendu ; sortie dans le dépôt : un manifeste a été écrit
- PASS CH-11 — en --usine, site-deposer.mjs est lancé quand même ; scripts/livrer-site.mjs:158 ; FAIL CH-11 — --usine : code 1, 0 attendu — depot : code 1 | Dépôt échoué ; site-deposer.mjs (piège) lancé en --usine
- PASS GA-3 — une étape upload-artifact ; .github/workflows/generer-site.yml:51 ; FAIL GA-3 — étape 8 : actions/upload-artifact@v4
- PASS GA-2 — timeout-minutes: 60 ; .github/workflows/generer-site.yml:23 ; FAIL GA-2 — timeout-minutes = 60, un nombre ≤ 20 attendu
- PASS SC-2 — un drop column ajouté à la migration ; supabase/migrations/0103_livraison_commandes.sql:55 ; FAIL SC-2 — instruction 18 : drop column — « alter table public.sites_commandes drop column if exists generation_duree_s » ; instruction 18 : « drop column if exists generation_duree_s » (seule la contrainte d'état peut être supprimée)
- PASS SC-3 — 'retiree' retiré de la contrainte d'état ; supabase/migrations/0103_livraison_commandes.sql:60 ; FAIL SC-3 — la contrainte liste ["brouillon","payee","generee","validee","en_ligne"], ["brouillon","payee","generee","validee","en_ligne","retiree"] attendu (ETATS de lib/siteCommande.ts, dans l'ordre, suivis de 'retiree')
