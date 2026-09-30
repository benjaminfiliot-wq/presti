# 026-152 — contre-vérification des juges de la livraison et de la trésorerie

## À lire d’abord (le script sort en code 1, aucun juge n’a été corrigé)

- TÉMOIN EN ÉCHEC (achat-public, scripts/achat-public-qa.mjs) : témoin en code 1 sur AP-9 : FAIL AP-9 — scripts/fermeture-e2e.mjs (base 9dca36e) : 4 ligne(s) de code ajoutée(s) (« 'busAgents': ['route', '/api/agents/etat', 'GET',… », « 'siteAchatPublic': ['route', '/api/site/commander… », « 'pilotage': ['route', '/api/controle/pilotage', '… »), seule la ligne siteAchatPublic attendue ; scripts/fermeture-e2e.mjs : le drapeau packPub de FLAGS n'est pas dans la carte ; scripts/fermeture-e2e.mjs : le drapeau packPubVente de FLAGS n'est pas dans la carte
- TÉMOIN EN ÉCHEC (ecrans, scripts/achat-ecrans-qa.mjs) : témoin en code 1 sur EA-2, EA-3, EA-4, EA-6 : FAIL EA-2 — serveur ou navigateur : next dev s'est arrêté (code 1) : `--turbopack` or `--webpack` flag explicitly or simply setting an | empty turbopack config in your Next config file (e.g. `turbopack: {}`). | [?25h
- TÉMOIN EN ÉCHEC (tuile, scripts/tuile-argent-qa.mjs) : témoin en code 1 sur TA-5 : FAIL TA-5 — lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteGenerationDistante → demanderGeneration ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBus → busEnPause ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBus → cloreTacheLivraison ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteLivraisonBus → battementLivreur ; lib/siteLivraison.ts (base db6434d) : …
- TÉMOIN EN ÉCHEC (tour, scripts/livraison-tour-qa.mjs) : témoin en code 1 sur TL-8 : FAIL TL-8 — app/api/cron/relances/route.ts (base ba7d5b6) : import ajouté hors contrat : @/lib/packPubPurge → purgerPacksExpires ; app/api/cron/relances/route.ts (base ba7d5b6) : lignes 150-156 : 0 appel(s) à tourLivraison(, 1 attendu ; app/api/cron/relances/route.ts (base ba7d5b6) : 2 bloc(s) ajouté(s), exactement un try/catch autour de tourLivraison() attendu ; lib/alertes.ts : entrée(s) ajoutée(s) livraison:26, tic:1, acq-recenseur:14, acq-standardiste:1, acq-redacteur:18, crieur:26, acq-fac…
- TÉMOIN EN ÉCHEC (schema, scripts/livraison-schema-qa.mjs) : témoin en code 1 sur SC-9 : FAIL SC-9 — supabase/migrations/_A_COLLER_sql_editor_0101.sql modifié (hors des quatre fichiers de la fiche) ; supabase/migrations/_A_COLLER_sql_editor_0101_NU.sql modifié (hors des quatre fichiers de la fiche)
- TÉMOIN EN ÉCHEC (retrait, scripts/retrait-site-qa.mjs) : témoin en code 1 sur RT-7 : FAIL RT-7 — lib/siteLivraison.ts : tourLivraison ne s'importe pas (The requested module '@/lib/siteLivraisonBus' does not provide an export named 'battementTresorier')
- TÉMOIN EN ÉCHEC (generation, scripts/generation-actions-qa.mjs) : témoin en code 1 sur GA-6 : FAIL GA-6 — import ajouté hors contrat : @/lib/siteLivraisonBus → busEnPause ; import ajouté hors contrat : @/lib/siteLivraisonBus → cloreTacheLivraison ; import ajouté hors contrat : @/lib/siteLivraisonBus → battementLivreur ; import ajouté hors contrat : @/lib/siteLivraisonBus → battementTresorier ; import ajouté hors contrat : @/lib/siteLivraisonUsine → consommerSortiesUsine ; ligne 27 de la base retirée ou changée : « enPause: d.enPause ?? (async () => false), » ; … (12 défauts)
- MUTATION NON PRISE : scripts/livrer-site-qa.mjs CH-3 « --sortie sous le dépôt (donc sous public/) acceptée » — code 1, CH-3 non attrapé : CH-3 rapporté PASS : « PASS CH-3 — git status --porcelain public/ identique avant et après ; Lestraque… » ; le bilan ne nomme pas CH-3 (en échec : CH-11)
- MUTATION NON JOUÉE (témoin rouge) : scripts/livraison-schema-qa.mjs SC-2 « un drop column ajouté à la migration »
- MUTATION NON JOUÉE (témoin rouge) : scripts/livraison-schema-qa.mjs SC-3 « 'retiree' retiré de la contrainte d'état »
- MUTATION NON JOUÉE (témoin rouge) : scripts/livraison-tour-qa.mjs TL-4 « la réservation n'est plus retirée après un échec d'envoi »
- MUTATION NON JOUÉE (témoin rouge) : scripts/livraison-tour-qa.mjs TL-5 « critique: true retiré de l'envoi »
- MUTATION NON JOUÉE (témoin rouge) : scripts/tuile-argent-qa.mjs TA-2 « un .reduce( sur des montants dans la route de trésorerie »
- MUTATION NON JOUÉE (témoin rouge) : scripts/tuile-argent-qa.mjs TA-4 « l'alerte de TVA part aussi le mardi »
- MUTATION NON JOUÉE (témoin rouge) : scripts/tuile-argent-qa.mjs TA-5 « veilleTresorerie() appelée hors de son try dans tourLivraison »
- MUTATION NON JOUÉE (témoin rouge) : scripts/achat-public-qa.mjs AP-6 « le lien part aussi vers une autre adresse que commande.email »
- MUTATION NON JOUÉE (témoin rouge) : scripts/achat-public-qa.mjs AP-5 « password ajouté à createUser »
- MUTATION NON JOUÉE (témoin rouge) : scripts/achat-public-qa.mjs AP-5 « l'erreur d'envoi du lien est avalée »
- MUTATION NON JOUÉE (témoin rouge) : scripts/achat-ecrans-qa.mjs EA-5 « suiteSure accepte //evil.fr »
- MUTATION NON JOUÉE (témoin rouge) : scripts/achat-ecrans-qa.mjs EA-2 « le piège website rendu visible »
- MUTATION NON JOUÉE (témoin rouge) : scripts/generation-actions-qa.mjs GA-3 « une étape actions/upload-artifact ajoutée »
- MUTATION NON JOUÉE (témoin rouge) : scripts/generation-actions-qa.mjs GA-2 « timeout-minutes: 60 »
- MUTATION NON JOUÉE (témoin rouge) : scripts/retrait-site-qa.mjs RT-3 « detacherDomaine avant l'e-mail du dossier »
- MUTATION NON JOUÉE (témoin rouge) : scripts/retrait-site-qa.mjs RT-4 « marquerSuppression appelée avant le contrôle de l'échec de la purge »

Généré par `node scripts/juges-026-lt-mutations.mjs` le 2026-09-29T17:27:53.152Z en 676 s (3 juge(s) à la fois).

## Témoins (copie intacte, code 0 attendu)

| juge | commande | code | durée |
|---|---|---|---|
| `scripts/livraison-schema-qa.mjs` --numero=0103 | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=livraison-schema-qa --numero=0103 --racine={racine}` | 1 | 2.0 s |
| `scripts/tresorerie-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=tresorerie-qa --racine={racine}` | 0 | 38.4 s |
| `scripts/livraison-tour-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=livraison-tour-qa --racine={racine}` | 1 | 35.7 s |
| `scripts/tuile-argent-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=tuile-argent-qa --racine={racine}` | 1 | 34.3 s |
| `scripts/achat-public-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=achat-public-qa --racine={racine}` | 1 | 40.0 s |
| `scripts/lien-connexion-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=lien-connexion-qa --racine={racine}` | 0 | 35.4 s |
| `scripts/complement-dossier-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=complement-dossier-qa --racine={racine}` | 0 | 37.5 s |
| `scripts/achat-ecrans-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=achat-ecrans-qa --racine={racine}` | 1 | 44.4 s |
| `scripts/commande-exporter-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=commande-exporter-qa --racine={racine}` | 0 | 22.7 s |
| `scripts/redacteur-v2-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=redacteur-v2-qa --racine={racine}` | 0 | 37.0 s |
| `scripts/livrer-site-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=livrer-site-qa --racine={racine}` | 0 | 178.9 s |
| `scripts/generation-actions-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=generation-actions-qa --racine={racine}` | 1 | 37.6 s |
| `scripts/dossier-zip-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=dossier-zip-qa --racine={racine}` | 0 | 30.1 s |
| `scripts/retrait-site-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=retrait-site-qa --racine={racine}` | 1 | 72.2 s |
| `scripts/poste-sites-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=poste-sites-qa --racine={racine}` | 0 | 36.8 s |
| `scripts/bus-livraison-qa.mjs` | `node /home/usine/bacs/verif-026-152/scripts/juges-026-lt-mutations.mjs --relais=bus-livraison-qa --racine={racine}` | 0 | 36.7 s |

## Mutations (une faute par essai sur une copie, code ≠ 0 attendu avec le critère nommé)

| juge | ce qui est cassé | fichier | critère attendu | code | autres critères en échec | extrait réel du verdict |
|---|---|---|---|---|---|---|
| `scripts/tresorerie-qa.mjs` | seuil de TVA : >= devient > dans situerTva (depasse) | `lib/direction/tresorerie.ts` | TR-2 | 1 | — | « FAIL TR-2 — « pile au seuil » : depasse = false, true attendu » |
| `scripts/tresorerie-qa.mjs` | un .update( Stripe ajouté au module de trésorerie | `lib/direction/tresorerie.ts` | TR-6 | 1 | — | « FAIL TR-6 — lib/direction/tresorerie.ts:33 « export const majAbonnement = (stripe: { subscriptions: { update: (id:… » » |
| `scripts/lien-connexion-qa.mjs` | un GET qui consomme le jeton | `app/api/auth/lien/route.ts` | LC-1 | 1 | LC-2, LC-3, LC-4, LC-5, LC-6, LC-7 | « FAIL LC-1 — app/api/auth/lien/route.ts exporte GET (le jeton ne se consomme que par un POST) » |
| `scripts/lien-connexion-qa.mjs` | la page poste le jeton au chargement | `app/connexion/lien/page.tsx` | LC-5 | 1 | — | « FAIL LC-5 — app/connexion/lien/page.tsx : un useEffect poste ou ouvre une session au chargement (« { const th = lireAdresse().jeton; setLienLisible(th !== nul… ») ; app/connexion/lien/page.tsx : un fetch hors d'un gestionnaire de clic (dans LienConnexionPage ; gestionnaires onClick : ouvrirDossier) » |
| `scripts/complement-dossier-qa.mjs` | etat accepté dans la mise à jour du dossier | `lib/siteCommandeServeur.ts` | CD-4 | 1 | — | « FAIL CD-4 — l'objet de mise à jour porte etat (seuls domaine_mode, domaine, metier, metiers_secondaires, communes, matiere, modifie_le sont permis) ; etat a changé ("payee" → "en_ligne") » |
| `scripts/complement-dossier-qa.mjs` | la condition genere_le is null retirée | `lib/siteCommandeServeur.ts` | CD-4 | 1 | — | « FAIL CD-4 — genere_le posé : 1 écriture(s), 0 attendue » |
| `scripts/commande-exporter-qa.mjs` | withMetadata() ajouté : le GPS des photos est gardé | `scripts/commande-exporter.mjs` | EX-3 | 1 | — | « FAIL EX-3 — photos/bibliotheque-480.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-480.webp garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.webp garde un bloc EXIF (186 octets) ; photos/escalier-1600.avif garde un bloc EXIF (364 octets, GPS compris) ; photos/escalier-1600.webp garde un bloc EXIF (364 octets, GPS compris) ; … (14 défauts) » |
| `scripts/commande-exporter-qa.mjs` | une photo d'un autre hôte (ou d'un autre artisan) est prise : contrôles d'hôte et de dossier retirés de clePhoto | `scripts/commande-exporter.mjs` | EX-7 | 1 | — | « FAIL EX-7 — le serveur du juge a reçu 1 requête(s) pour une photo refusée : GET /00000000-0000-4000-8000-000000260292/voisin.jpg » |
| `scripts/redacteur-v2-qa.mjs` | une invention (« depuis 15 ans ») dans le chapeau de l’accueil | `lib/siteRedacteur.ts` | RV-3 | 1 | RV-6 | « FAIL RV-3 — script (--sans-ia, modèle de la racine) : findFabrications → 15 ans ; fonction sans appel (modèle à cinq prestations) : findFabrications → 15 ans ; fonction, doublure propre : findFabrications → 15 ans » |
| `scripts/redacteur-v2-qa.mjs` | la dégradation retirée : le second texte fautif est gardé | `lib/siteRedacteur.ts` | RV-6 | 1 | — | « FAIL RV-6 — fautive : 15 ans reste dans la version finale ; fautive : \bRGE\b reste dans la version finale ; fautive : rapport.degradations compte 0, 3 attendues » |
| `scripts/redacteur-v2-qa.mjs` | le SIREN envoyé à appel (les faits de contrôle dans <donnees>) | `lib/siteRedacteur.ts` | RV-7 | 1 | — | « FAIL RV-7 — requête 1 : le SIREN est envoyé ; requête 2 : le SIREN est envoyé ; requête 3 : le SIREN est envoyé ; requête 4 : le SIREN est envoyé ; requête 5 : le SIREN est envoyé ; requête 6 : le SIREN est envoyé ; … (9 défauts) » |
| `scripts/livrer-site-qa.mjs` | le plafond de régénérations passe à 3 | `scripts/livrer-site.mjs` | CH-5 | 1 | — | « FAIL CH-5 — le rédacteur a été appelé 2 fois, 1 attendue (aucune nouvelle rédaction au plafond) » |
| `scripts/livrer-site-qa.mjs` | --sortie sous le dépôt (donc sous public/) acceptée | `scripts/livrer-site.mjs` | CH-3 | 1 | CH-11 | **NON PRISE** : code 1, CH-3 non attrapé : CH-3 rapporté PASS : « PASS CH-3 — git status --porcelain public/ identique avant et après ; Lestraque… » ; le bilan ne nomme pas CH-3 (en échec : CH-11) |
| `scripts/livrer-site-qa.mjs` | en --usine, site-deposer.mjs est lancé quand même | `scripts/livrer-site.mjs` | CH-11 | 1 | — | « FAIL CH-11 — --usine : code 1, 0 attendu — depot : code 1 \| Dépôt échoué ; site-deposer.mjs (piège) lancé en --usine » |
| `scripts/dossier-zip-qa.mjs` | === au lieu de timingSafeEqual pour le jeton | `lib/siteDossier.ts` | DZ-2 | 1 | — | « FAIL DZ-2 — lib/siteDossier.ts n'appelle pas timingSafeEqual (lu dans le source, commentaires exclus) » |
| `scripts/dossier-zip-qa.mjs` | l'expiration du lien ignorée | `lib/siteDossier.ts` | DZ-2 | 1 | DZ-4 | « FAIL DZ-2 — verifierJetonDossier, bon jeton, 91 j après (expiré) : true, false attendu » |
| `scripts/poste-sites-qa.mjs` | la garde exigerDomaine retirée de la route des sites | `app/api/controle/sites/[id]/route.ts` | PS-2 | 1 | — | « FAIL PS-2 — instruction 3 de POST : « const { id } », « const perimetre = exigerDomaine(f, 'clients', 'ecrire') » attendue (référence 4041ec9) ; instruction 4 de POST : « = await ctx.params », « if (domaineRefuse(perimetre)) return reponseRefus(perimetre) » attendue (référence 4041ec9) » |
| `scripts/poste-sites-qa.mjs` | envoyer_dossier sans reconfirmation | `app/api/controle/sites/[id]/route.ts` | PS-4 | 1 | — | « FAIL PS-4 — envoyer_dossier sans reconfirmation → 200 null, 403 « reconfirmation_requise » attendu ; envoyer_dossier sans reconfirmation : un jeton ou un e-mail est parti ; envoyer_dossier : exigerReconfirmation jamais appelée » |
| `scripts/bus-livraison-qa.mjs` | busEnPause rend faux sur une erreur | `lib/siteLivraisonBus.ts` | BL-2 | 1 | — | « FAIL BL-2 — busEnPause, erreur PostgREST (400) : false, true attendu ; busEnPause, erreur serveur (500) : false, true attendu » |
| `scripts/bus-livraison-qa.mjs` | tourLivraison appelé par le tic sans condition de minute | `app/api/agents/tic/route.ts` | BL-4 | 1 | — | « FAIL BL-4 — l’appel à tourLivraison n’est sous aucune condition de minute multiple de 15 (« % 15 ») ; à 10 h 16 : tourLivraison appelée 1 fois, jamais attendu » |
| `scripts/bus-livraison-qa.mjs` | la clé livraison:<id> au lieu de livrer_site:<id> | `lib/siteLivraisonBus.ts` | BL-3 | 1 | BL-1 | « FAIL BL-3 — hors pause : 0 ops_tache_clore pour la commande generee, exactement un attendu » |
| `scripts/bus-livraison-qa.mjs` | ops_tache_rendre au lieu de ops_tache_clore | `lib/siteLivraisonBus.ts` | BL-1 | 1 | BL-3 | « FAIL BL-1 — ops_tache_clore appelée 0 fois, une attendue (appels : ops_interrupteur, ops_tache_rendre, ops_battement, ops_battement) » |

## Notes

- La copie est celle du méta-juge : les dossiers app, lib, scripts, supabase, docs, .github, gabarits-pubs et .orchestre/brouillons-ecosysteme (fichiers suivis et non suivis), les fichiers de la racine, node_modules et public en jonctions. Elle remplace le `git archive HEAD` de la fiche : les fichiers de travail des fiches 05 à 20 y sont, et elle est byte pour byte celle que le méta-juge rejoue.
- Le relais (`--relais=<juge>`) ne fait que traduire ✅/❌ en PASS/FAIL, fusionner un critère noté deux fois et garder le bilan et le code du juge ; il ne juge rien.
- Les lignes « ce qui est cassé » sont de vraies fautes du code de production (une ligne remplacée ou ajoutée), jamais un fichier détruit ; chaque `avant` est présent une seule fois dans son fichier.
