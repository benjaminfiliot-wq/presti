# 026-152 — contre-vérification des 16 juges de la livraison et de la trésorerie

Passage du 2026-10-05T02:11:32.409Z : 37 faute(s) prise(s), 16/16 témoin(s) vert(s), 0 échec(s), 0 non jouée(s).

## Témoins (juge complet sur la copie intacte, code 0 exigé)
- scripts/lien-connexion-qa.mjs : code 0 en 45.5 s
- scripts/achat-ecrans-qa.mjs : code 0 en 95.6 s
- scripts/achat-public-qa.mjs : code 0 en 99.9 s
- scripts/tuile-argent-qa.mjs : code 0 en 44.8 s
- scripts/livrer-site-qa.mjs : code 0 en 184.5 s
- scripts/commande-exporter-qa.mjs : code 0 en 25.1 s
- scripts/livraison-schema-qa.mjs : code 0 en 2.6 s
- scripts/redacteur-v2-qa.mjs : code 0 en 48.2 s
- scripts/tresorerie-qa.mjs : code 0 en 44.1 s
- scripts/livraison-tour-qa.mjs : code 0 en 44.2 s
- scripts/complement-dossier-qa.mjs : code 0 en 43.5 s
- scripts/generation-actions-qa.mjs : code 0 en 44.7 s
- scripts/poste-sites-qa.mjs : code 0 en 47.6 s
- scripts/bus-livraison-qa.mjs : code 0 en 48.0 s
- scripts/dossier-zip-qa.mjs : code 0 en 44.5 s
- scripts/retrait-site-qa.mjs : code 0 en 81.1 s

## Fautes plantées (fichier:ligne · critère attendu · faute · extrait réel du verdict)
- app/api/auth/lien/route.ts:36 · LC-1 · un GET qui consomme le jeton · « FAIL LC-1 — app/api/auth/lien/route.ts exporte GET (le jeton ne se consomme que par un POST) » (code 1, 45.5 s)
- app/connexion/lien/page.tsx:41 · LC-5 · la page poste le jeton au chargement · « FAIL LC-5 — app/connexion/lien/page.tsx : un useEffect poste ou ouvre une session au chargement (« { fetch('/api/auth/lien', { method: 'POST' }); setLienLisib… ») ; app/connexion/lien/page.tsx : un fetch hors d'un gestionnaire de clic (dans LienConnexionPage ; gestionnaires onClick : ouvrirDossier) » (code 1, 45.5 s)
- app/api/controle/tresorerie/route.ts:20 · TA-2 · des montants additionnés dans la route · « FAIL TA-2 — la route contient .reduce( (ligne 20) » (code 1, 44.8 s)
- lib/suiteSure.ts:2 · EA-5 · suiteSure accepte //evil.fr · « FAIL EA-5 — « adresse relative de protocole » ("//evil.fr") → "//evil.fr", "/outils" attendu » (code 1, 96.9 s)
- lib/siteAchatPublic.ts:68 · AP-6 · le lien part vers une adresse lue dans le corps · « FAIL AP-6 — destinataire "autre@fautif.invalid", acheteur-026@presti-test.invalid attendu » (code 1, 102.8 s)
- scripts/livrer-site.mjs:147 · CH-5 · le plafond de régénérations passe à 3 · « FAIL CH-5 — le rédacteur a été appelé 2 fois, 1 attendue (aucune nouvelle rédaction au plafond) » (code 1, 184.5 s)
- lib/direction/veilleTresorerie.ts:12 · TA-4 · l'alerte part aussi le mardi · « FAIL TA-4 — « mardi 0 h 30 à Paris (lundi en UTC), 90 % » : 1 alerte(s), 0 attendue » (code 1, 44.9 s)
- scripts/livrer-site.mjs:25 · CH-3 · --sortie sous public/ acceptée · « FAIL CH-3 — public/livraison-fautive.txt du banc ajouté par livrer-site » (code 1, 184.5 s)
- scripts/livrer-site.mjs:153 · CH-11 · en --usine, site-deposer.mjs lancé quand même · « FAIL CH-11 — site-deposer.mjs (piège) lancé en --usine » (code 1, 184.5 s)
- lib/siteLivraison.ts:236 · TA-5 · veilleTresorerie() appelée hors de son try · « FAIL TA-5 — évolution 49753f4c altérée ou ambiguë : lib/siteLivraison.ts ; évolution 6d9a9c5a altérée ou ambiguë : lib/siteLivraison.ts ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteGenerationDistante → demanderGeneration ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBus → busEnPause ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBus → cloreTacheLivraison ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBus → battementLivreur ; … (25 défauts) » (code 1, 44.8 s)
- app/site/acheter/page.tsx:51 · EA-2 · le piège website rendu visible et atteignable · « FAIL EA-2 — 390 px : piège website tabindex=0, aria-hidden=false, autocomplete=off ; 1440 px : piège website tabindex=0, aria-hidden=false, autocomplete=off » (code 1, 95.7 s)
- supabase/migrations/0103_livraison_commandes.sql:44 · SC-2 · une colonne supprimée par la migration · « FAIL SC-2 — instruction 11 : drop column — « alter table public.sites_commandes drop column email » ; instruction 11 : « drop column email » (seule la contrainte d'état peut être supprimée) » (code 1, 2.7 s)
- supabase/migrations/0103_livraison_commandes.sql:60 · SC-3 · l'état retiree retiré de la contrainte · « FAIL SC-3 — la contrainte liste ["brouillon","payee","generee","validee","en_ligne"], ["brouillon","payee","generee","validee","en_ligne","retiree"] attendu (ETATS de lib/siteCommande.ts, dans l'ordre, suivis de 'retiree') » (code 1, 3.3 s)
- scripts/commande-exporter.mjs:151 · EX-3 · les métadonnées des photos conservées · « FAIL EX-3 — photos/bibliotheque-480.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-480.webp garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.webp garde un bloc EXIF (186 octets) ; photos/escalier-1600.avif garde un bloc EXIF (364 octets, GPS compris) ; photos/escalier-1600.webp garde un bloc EXIF (364 octets, GPS compris) ; … (14 défauts) » (code 1, 25.1 s)
- lib/siteAchatPublic.ts:73 · AP-6 · un mot de passe posé au compte public · « FAIL AP-6 — ouvrirCompteAcheteur : createUser porte un password ; adresse deja inscrite : createUser porte un password » (code 1, 102.3 s)
- lib/siteRedacteur.ts:234 · RV-3 · la dégradation retirée : le texte fautif est gardé · « FAIL RV-3 — fonction, version finale après doublure fautive : findFabrications → 15 ans, RGE » (code 1, 48.2 s)
- lib/siteRedacteur.ts:410 · RV-7 · le SIREN envoyé au modèle · « FAIL RV-7 — requête 1 : le SIREN est envoyé ; requête 2 : le SIREN est envoyé ; requête 3 : le SIREN est envoyé ; requête 4 : le SIREN est envoyé ; requête 5 : le SIREN est envoyé ; requête 6 : le SIREN est envoyé ; … (9 défauts) » (code 1, 48.2 s)
- scripts/commande-exporter.mjs:52 · EX-7 · une photo d'un autre hôte téléchargée · « FAIL EX-7 — le serveur du juge a reçu 1 requête(s) pour une photo refusée : GET /00000000-0000-4000-8000-000000260292/ailleurs.jpg » (code 1, 25.1 s)
- lib/direction/tresorerie.ts:29 · TR-2 · seuil strict : pile au seuil ne dépasse plus · « FAIL TR-2 — « pile au seuil » : depasse = false, true attendu » (code 1, 44.5 s)
- lib/siteLivraison.ts:100 · TL-4 · la réservation n'est plus retirée après un échec d'envoi · « FAIL TL-4 — envoi refusé : la réservation n'est pas retirée (courriels porte ["payee","en_ligne"]) ; après un envoi refusé, le passage suivant fait 0 envoi(s), 2 attendus ; envoi qui lève : la réservation n'est pas retirée (courriels porte ["payee","en_ligne"]) ; après un envoi qui lève, le passage suivant fait 0 envoi(s), 2 attendus » (code 1, 45.0 s)
- lib/siteAchatPublic.ts:83 · AP-5 · l'erreur d'envoi du lien est avalée · « FAIL AP-5 — envoi refusé → 200, 500 attendu (Stripe doit rejouer) ; envoi refusé : lien_envoye_le posé quand même » (code 1, 106.7 s)
- lib/siteCommandeServeur.ts:48 · CD-4 · l'état envoyé par le client accepté dans la mise à jour · « FAIL CD-4 — l'objet de mise à jour porte etat (seuls domaine_mode, domaine, metier, metiers_secondaires, communes, matiere, modifie_le sont permis) ; etat a changé ("payee" → "en_ligne") » (code 1, 46.9 s)
- lib/direction/tresorerie.ts:10 · TR-6 · une écriture Stripe dans la lecture · « FAIL TR-6 — lib/direction/tresorerie.ts:10 « await stripe.customers.update('client-fautif', {}) » » (code 1, 45.4 s)
- lib/siteLivraison.ts:93 · TL-5 · le courriel de livraison n'est plus critique · « FAIL TL-5 — envoi 1 : critique = undefined, true attendu ; envoi 2 : critique = undefined, true attendu » (code 1, 45.9 s)
- .github/workflows/generer-site.yml:25 · GA-3 · une étape upload-artifact · « FAIL GA-3 — étape 2 : actions/upload-artifact@v4 » (code 1, 44.7 s)
- .github/workflows/generer-site.yml:23 · GA-2 · timeout-minutes: 60 · « FAIL GA-2 — timeout-minutes = 60, un nombre ≤ 20 attendu » (code 1, 44.7 s)
- lib/siteCommandeServeur.ts:56 · CD-4 · la condition genere_le is null retirée · « FAIL CD-4 — genere_le posé : 1 écriture(s), 0 attendue » (code 1, 45.4 s)
- app/api/controle/sites/[id]/route.ts:40 · PS-2 · la garde exigerDomaine omise · « FAIL PS-2 — instruction 4 de POST : « const { id } », « if (domaineRefuse(perimetre)) return reponseRefus(perimetre) » attendue (référence 4041ec9) » (code 1, 47.6 s)
- lib/siteLivraisonBus.ts:8 · BL-2 · busEnPause rend faux sur erreur · « FAIL BL-2 — busEnPause, erreur PostgREST (400) : false, true attendu ; busEnPause, erreur serveur (500) : false, true attendu » (code 1, 48.9 s)
- lib/siteDossier.ts:43 · DZ-2 · comparaison du jeton non constante (===) · « FAIL DZ-2 — lib/siteDossier.ts n'appelle pas timingSafeEqual (lu dans le source, commentaires exclus) » (code 1, 45.5 s)
- lib/siteRetrait.ts:84 · RT-3 · le domaine détaché avant l'e-mail · « FAIL RT-3 — succès : ordre jeton → detacher → email → maj → detacher → notifier ; jeton → e-mail → mise à jour → détachement → notification attendu ; détachement : ["couvreur-temoin.fr","couvreur-temoin.fr"], [couvreur-temoin.fr] attendu ; second appel sur la même commande : un second détachement ; envoi refusé : detacherDomaine appelé ; envoi qui lève : detacherDomaine appelé ; détachement qui lève : retirer lève (Vercel en panne (doublure RT-3)) ; … (8 défauts) » (code 1, 81.9 s)
- app/api/controle/sites/[id]/route.ts:91 · PS-4 · envoyer_dossier sans reconfirmation · « FAIL PS-4 — envoyer_dossier sans reconfirmation → 200 null, 403 « reconfirmation_requise » attendu ; envoyer_dossier sans reconfirmation : un jeton ou un e-mail est parti » (code 1, 48.1 s)
- lib/siteDossier.ts:43 · DZ-2 · l'expiration du lien ignorée · « FAIL DZ-2 — verifierJetonDossier, bon jeton, 91 j après (expiré) : true, false attendu » (code 1, 44.5 s)
- app/api/agents/tic/route.ts:85 · BL-4 · le tic de livraison sans condition de minute · « FAIL BL-4 — l’appel à tourLivraison n’est sous aucune condition de minute multiple de 15 (« % 15 ») ; à 10 h 16 : tourLivraison appelée 1 fois, jamais attendu » (code 1, 48.0 s)
- lib/siteLivraisonBus.ts:14 · BL-3 · la clé livraison:<id> au lieu de livrer_site:<id> · « FAIL BL-3 — hors pause : 0 ops_tache_clore pour la commande generee, exactement un attendu » (code 1, 48.0 s)
- lib/purgeComptes.ts:140 · RT-4 · marquerSuppression avant le contrôle d'échec du compte · « FAIL RT-4 — lib/purgeComptes.ts : marquerSuppression( est avant le bloc if (echec) : il doit le suivre (purge réussie seulement) ; lib/purgeComptes.ts : 2 appel(s) ajouté(s) à marquerSuppression(, 1 attendu ; purge réussie : marquerSuppression [[["d0260000-0000-4000-8000-00000000ee01","d0260000-0000-4000-8000-00000000ee02"]],[["d0260000-0000-4000-8000-00000000ee01","d0260000-0000-4000-8000-00000000ee02"]]], une fois avec les ids rendus par commandesEnLigneDe attendu ; marquerSuppression qui lève : la purge ne va pas au bout (purges = 0) ; l'erreur doit être journalisée sans arrêter la purge ; purge en échec (auth refuse) : marquerSuppression appelée — la date ne se pose que si la purge a réussi » (code 1, 81.1 s)
- lib/siteLivraisonBus.ts:14 · BL-1 · ops_tache_rendre au lieu de ops_tache_clore · « FAIL BL-1 — ops_tache_clore appelée 0 fois, une attendue (appels : ops_interrupteur, ops_tache_rendre, ops_battement, ops_battement) » (code 1, 48.0 s)

