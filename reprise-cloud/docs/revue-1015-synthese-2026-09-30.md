# Revue du paquet de contexte de Codex (1015 fichiers) — synthèse du 30/09/2026

Douze agents ont lu le paquet `docs/contexte-cloud/` (PR #5, branche `codex/contexte-ecosysteme-0930`), chacun sur un périmètre, en lecture seule ; Claude Code a relu leurs rapports et vérifié plusieurs constats au fichier (paramètres SQL, code secret, IP). Rapports complets : scratchpad de la session (`revue-1015/*.md`), non versionnés. **Ce qui a été lu** : le cœur de l'écosystème en entier (quinze documents `Ecosysteme-*`, organigramme compris), le vault SaaS en partie, le code `app/` et `lib/` par extraits, le SQL en partie, les fiches 001 à 254 par en-têtes (corps de 15 à 45 fiches par plage), aucun juge. **Non lu** : migrations 0096, 0097, 0109, 0115, 0118, 0119 ; `lib/direction/*` ; `scripts/usine` ; la plupart de `SaaS/Recherche` ; les cahiers de critères des juges. Un constat de ce document est une piste à confirmer, pas un verdict.

## La décision qui change tout (Benj, 30/09)
L'écosystème n'a pas besoin de son accord à chaque envoi ni publication (fin de R24 « accord individuel »). Les garde-fous automatiques sont donc la seule protection : ils doivent être irréprochables. Reste à Benj : ouvrir l'envoi à froid (12/10 au plus tôt), lever une pause, changer un plafond, compte, secret, dépense.

## P0 — à corriger avant qu'un agent agisse seul
1. **STOP / RGPD hors fil non traités** : `standardiste.ts` range `hors_fil` avant de tester STOP et RGPD ; un STOP en nouvel e-mail ne crée ni opposition ni carte.
2. **Le portier d'envoi n'est qu'un statut** : la base ne refuse pas `envoye` hors règle (événement `envoi_hors_regle` seulement) ; trois envoyeurs (`facteur_usine`, `gmail`, `repondeur`) ; `essai_e2e` exempté ; le Facteur envoie avant de consigner (`facteur.ts` : pas de réservation, doublon possible à 15 min si `marquerEnvoye` échoue) ; en-têtes figés puis réécrits ; empreinte liée au seul texte.
3. **La pause générale ne coupe pas tout** : `cron/relances` (jusqu'à 100 e-mails IA, sans idempotence, hors Facteur) et le Crieur n'y sont pas ; aucun drapeau sur les crons Facteur/Crieur.
4. **Identité = argument** (`p_auteur`, `p_agent`) dans des fonctions SQL, contre la règle du jeton ; les exécutants du poste ont `.env.local` et le réseau : « aucun agent ne voit de secret » est faux pour eux.
5. **Plafond 0 € non mécanisé** (coûts auto-déclarés, constatés après coup) ; des documents prévoient des dépenses (clé agents 30 $, pubs 490 €, ElevenLabs/Veo, « budget de test » dropshipping).
6. **Décisions auto-approuvables** : défaut et échéance choisis par l'agent, `tranchee` et `defaut_applique` non distingués.
7. **Chaîne dépôt → production sans humain** : le moteur pousse sur `main` après un simple PASS ; la fusion automatique laisse passer `docs/**` (cerveaux, interrupteurs) ; la liste des fichiers protégés oublie `garde.ts`, le Facteur, `scripts/usine` ; l'utilisateur de l'usine est dans le groupe docker (root de fait).
8. **D1 (données de prospect)** : modèles cloud par défaut pour Hermes et OpenClaw (aucun script ne pose `OLLAMA_NO_CLOUD`) ; URLs et noms vers Firecrawl ; reclassement qui laisse des noms en `interne` ; 026-226 étape 3 autorise des extraits anonymisés vers des IA gratuites que sa décision interdit.

## P1 — fuites et intégrité
- `fileArgent.ts` : `select('*')` de la commande (e-mail, jeton d'aperçu) vers l'usine ; `clients/[id]` rend journal et facture au partenaire.
- Argent et droits écrits **avant** le journal : changement de rôle (`reglages`), apports, compta.
- `releve` : remboursements tronqués jamais signalés ; J1 : extrait vide = vrai, SIRENE en panne = éligible ; Codex sans `cwd` sur du texte de prospect.
- Douze routes d'écriture sans test de rôle « direction » visible (à confirmer dans la garde) ; injection `.or()` (`courriers`, `recherche`).
- **Secrets du paquet publié** (sécurité de l'usine, vérifié) : le code fixe du compte de relecture Apple/Google est en clair dans `presti-secrets/relecture.txt` (à retirer de la branche et à renouveler sur Vercel) ; l'IP publique de l'usine est répétée dans 27 fichiers, port 22 ouvert au monde. Aucune clé, jeton ni mot de passe en clair trouvé (motifs testés partout).
- Fiche 026-092 (Codex) : paramètres rpc faux (`p_agent` au lieu de `p_nom`, `p_depuis` au lieu de `p_debut` ; vérifiés dans 0107), colonnes (`eur`/`montant_eur`, `tache`/`tache_id`), deux fuites d'argent hors `ARGENT_DIRECT` (compteur « J6/30 · X € », événements `commande_payee`/`pack_paye`). Critère SV-23 ajouté au juge (PR #6).

## P2 — juridique et conformité (à faire trancher)
Cadre légal du 27/09 (envoi manuel pour les formulaires) contre robot Playwright à 40/jour ; message type sans SIREN, adresse, « EI », lien de désinscription (le juge J3 ne le contrôle pas) ; preuve de demande falsifiable (026-145 : une adresse + une case) ; rétractation L221-28 pour un site livré en 48 h ; Vercel Hobby interdit l'usage commercial alors que le site à 300 € est vendu ; INPI (risque moyen à élevé, presti.ai) jamais arbitré ; statut micro-entreprise « à confirmer » depuis le 14/08 ; dropshipping : TVA, rétractation, CGV, fournisseurs, conformité produit non traités ; 166 mails partis le 16/09 sans vérification des mentions.

## P3 — cohérence du chantier
- **Fiches qui exigent `attend_accord_benj` / accord individuel** (026-044, 034, 063, 089, 095, 096, 145, Crieur de 122) : à aligner sur la décision du 30/09, avec leurs juges ; 26 « Corrections du 27/09 » ajoutent du texte sans adapter périmètre ni `verifier`.
- **Dix fiches de juges avec `--preuve-echecs`** qui exige que la production n'existe pas (194, 199, 229, 232, 234, 238, 242, 244, 246, 248) ; quatre autres (004, 041, 048, 052) : rouges après livraison.
- Verifiers qui ne prouvent pas : 026-163 pose elle-même l'événement qui ouvre l'envoi ; 026-165 n'exécute que l'autotest ; 200 accepte `juge.code:0` auto-déclaré ; 026-253 sans rapport avec budget-perf.
- Second portier d'envoi (SAV 026-244/245, type de décision ajouté « à l'assemblage », auto après 20 approbations) non jugé (026-251 « fiche à écrire »).
- Méthode non tenue : argent, sécurité, droits confiés à Codex (046, 074, 042, 049, 056, 077, 030, 031, 118) ; 055 et 065 faites par Antigravity ; 026-008 lance `next build` sans `PRESTI_DIST`.
- Structure : cycle 252/253 ; `lib/flags.ts` et `fermeture-e2e.mjs` écrits par 3-4 fiches, `entree.tsx` par 6 ; `sources.json` dans le périmètre de 231 (codex) ; interdit quasi vide sur 204-219.
- Chiffres : 6 fiches en double sur disque (026-012, 023, 134, 175, 155, 194) ; tarifs 39/79 € (docs) contre 29/59/99 € (`plans.ts`) ; journal des décisions arrêté au 24/09, boussole du 15/09.
- Laya (seuil « noul ≥ 0,5 » comme garde de vérité) jugée peu fiable par les documents eux-mêmes.

## Ce qui tient (vérifié par la revue)
Jetons d'agent (`garde.ts`), aucun `p_agent` tiré du corps, signature HMAC Meta, secrets des crons, messages en gabarits exacts (J3), Crieur en brouillons, durcissement SSH et conteneurs de l'usine (read-only, `cap_drop`, digests épinglés), masquage des données personnelles dans le paquet.

## Ordre de jugement proposé
Garde-fous d'abord : (1) STOP hors fil et opposition, (2) verrou d'envoi en base + réservation d'envoi du Facteur, (3) pause générale sur les crons et le Crieur, (4) identité par jeton partout, (5) plafond 0 € mécanisé ; puis les fiches 092, 244-245, 089/095/096/145 (alignées sur la décision), 210-212-217, 226-227, 163, 106, 098, 148.

---

# Complément du 30/09 (soir) — lecture des 1712 fichiers ajoutés (PR #5, 2727 fichiers)

Huit agents supplémentaires (preuves 017 ; autres preuves ; sites de référence ; données de prospection ; sources des juges et 17 questions ; vidéos promo et veille ; documents de l'entreprise ; balayage de secrets). **Non lus** : images (313 fichiers) et PDF ; tous les `.log` et `verifier.log` (exclus du paquet, donc aucun PASS n'est recoupable avec sa sortie brute) ; les 808 vidéos (archives privées de release, inaccessibles d'ici : 404 sans authentification, pas de ffmpeg — il faut des planches d'images JPEG et des transcriptions dans git).

## Nouveaux constats graves
1. **Fuite du nom « Presti » sur les surfaces du prospect** (10 maquettes de référence sur 10 ; démo Lestraque ; adresse d'envoi sur le domaine de Presti ; crédits photo « modifiées par Presti ») : contre la règle white-label. Aucun juge de site ne cherche le mot.
2. **Les quatre protections prioritaires du 30/09 n'ont aucun juge démontré rouge** (STOP hors fil, pause générale incluant le Crieur et les relances, réservation anti-doublon du Facteur, plafond 0 €) ; `scripts/chef/commun.mjs:143,151` ne borne pas `engage_cents`/`montant_cents` ; ORB-9 survit (prix promu sans Benj).
3. **Données personnelles de tiers dans le dépôt** (≈370 e-mails, ≈1 900 téléphones, ≈1 200 SIRET, 4 contrats avec état civil, listes de prospects) : contredit D1 et les mentions « hors dépôt, exprès » ; aucun registre de suppression exploitable (une société « opposée au marketing direct » reste dans la liste et le kit) ; entrepreneurs individuels non repérés ; 49 constats « site vieillot » sur 70 reposent sur une fiche d'annuaire.
4. **Campagne du 16/09 (166 e-mails) non conforme au cadre du 27/09** (ni SIREN, ni adresse, ni « EI », ni désinscription ; 15 s d'intervalle ; 62 liens réécrits, 5 rebonds, 1 STOP, 1 réponse non traitée).
5. **Promesses fausses dans les pubs** (« rien ne part sans vous », « 29 € : vous validez tout ») ; pubs UGC avec avatars et témoignages en première personne contre « l'IA ne fabrique aucun avis » ; veille qui télécharge les vidéos d'autrui (yt-dlp/ffmpeg) contre la règle.
6. **Sites de référence** : zone d'intervention affirmée dans `<title>`/h1 alors que le corps dit « à confirmer » ; légendes d'images inventées ; provenance CC BY/BY-SA non prouvée ; mentions légales d'un site d'artisan absentes ; numéro de téléphone cliquable « à reconfirmer ».
7. **Chaîne d'outils** : `chantier.mjs:181-191` zone protégée contournable (`**`, `./supabase`) ; `verifier-fiche` exécute un script choisi par la fiche avec tout l'environnement ; `douleurs.mjs:262` n'anonymise que `extrait` (`probleme` part en clair vers freellmapi).
8. **Entreprise** : « coentreprise » = 12 agents Claude (pas une société humaine) dont la mémoire enseigne encore `/api/control/*` et un mot de passe en password grant (à purger) ; aucun contrat signé dans le paquet, quatre versions successives du partage, pas de pièce de sortie ; INPI affirmé mais non prouvé ; prospection à froid par Gmail (Resend l'interdit dans ses CGU).
9. **Secrets** : rien de grave (2727 fichiers, 2406 lisibles balayés) ; à traiter : code du compte de relecture en clair (renouveler), IP de l'usine dans 27 fichiers, URL CDN signées et cookies `ttwid` dans les `info.json` de veille.

## Corrections engagées (ordre)
Juges d'abord (rouges sur l'arbre actuel, verts sur un correctif témoin), puis correctifs : (1) STOP et opposition hors fil ; (2) pause générale sur relances, Facteur et Crieur (publications déjà programmées comprises) ; (3) réservation atomique anti-doublon du Facteur ; (4) plafond 0 € avant consommation, coût inconnu refusé ; (5) white-label des surfaces du prospect ; puis alignement des fiches sur la décision du 30/09 (fin de l'accord individuel).
