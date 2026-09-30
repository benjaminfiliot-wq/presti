# Presti — le plan final de l'écosystème d'agents

*Écrit le 24/09/2026 en lecture seule, puis révisé le même jour après une critique de complétude. Pour Benj et pour les exécutants (Codex, Antigravity, Claude Code).*

**D'où vient ce plan.**
- **Le socle** est le plan 3, « risque d'abord », classé premier par le juge avec 35/50. C'est le seul qui n'invente pas de revenu à court terme, qui refuse de vendre un site perdant les demandes et qui protège ce qui ne se rachète pas : les comptes, la clé du produit, la base.
- **Du plan 1**, on reprend le moteur commercial : la fabrication en trois niveaux, la production au rythme de l'envoi, les seuils d'arrêt, le pack pubs à 149 € et la base chaude.
- **Du plan 2**, on reprend l'ossature : les trois couches, l'épreuve du feu, le paiement avant le dossier, le Web Push, le juge de promesse et le plafond de 3 Mo par maquette.
- **Toutes les failles relevées par les deux juges sont corrigées.**
- **La critique de complétude du 24/09 est corrigée aussi.** Elle a relu le plan contre le dépôt, l'orchestre et le vault. J'ai revérifié chacun de ses constats avant de le reprendre. Le §9 dit où chaque correction se trouve.

**Ce qui change dans cette révision (les huit points qui comptent).**
1. **Gabriel et Louis-Victor ne prospectent pour Presti qu'avec un statut et leur propre compte** (D1, D2). Sans ça, seul Benj envoie, et le jalon attend 60 contacts au lieu de conclure « NON » sur un volume trop faible.
2. **Claude Code écrit les juges (025-01), la migration (025-04) et le code de l'argent (025-07)**, comme le veut la règle 1 de `CLAUDE.md:23`. Codex contre-vérifie les juges par des mutations (025-10).
3. **Les maquettes ne s'écrivent jamais dans `public/`**, que prestiapp.fr sert à tout le monde.
4. **Le formulaire des vrais sites a un repli** : le téléphone et l'e-mail de l'artisan. Il retrouve aussi un artisan dont l'adresse Presti a changé (025-03).
5. **Le dossier de commande recueille la voix de l'artisan** (025-09). Sans elle, le générateur refuse chaque vente.
6. **La sauvegarde de J+1 ne touche pas `main`** et ne part pas dans un dépôt relié à Vercel.
7. **Les promesses à corriger sont 13 occurrences dans 7 fichiers, plus la séquence de démo**, et non 7 ou 8. « Réponse prête en moins d'une minute » est vrai et se garde.
8. **Deux « affirmations permises » étaient fausses.** Elles sont réécrites (§3.1).

**Étiquettes utilisées.**
- **[prouvé]** : lu dans un fichier ou sur une page datée, avec sa source.
- **[mesuré]** : rejoué par moi le 24/09 sur des copies, dans mon dossier temporaire, ou compté par `grep` et `git`, sans rien écrire dans le dépôt.
- **[déduit]** : conséquence du code, pas rejouée.
- **[supposé]** : mon hypothèse.
- **[à vérifier]** : une vérification reste à faire.

Je n'ai lu ni `.env.local` ni `presti-secrets`, et je n'ai interrogé ni la base ni Stripe. Ce document n'est pas un avis juridique.

**Vérifié pour ce plan le 24/09**, en plus des trois recensements et des deux jugements :
- **État du dépôt.** HEAD est `1620723` (16/09), sur la branche `main`, qui suit `origin/main`. `git status` compte 184 entrées non versées : 9 fichiers suivis modifiés et 175 non suivis. Détaillé fichier par fichier (`-uall`), cela fait entre 2 589 et 2 598 fichiers non suivis selon l'heure de la mesure. On y trouve `ChromeSetup.exe` (12 Mo), 935 fichiers de `.claude/skills`, des preuves en image ou en vidéo jusqu'à 10 Mo, et 31 fichiers sous `public/` (`public/sites-demo/kit/`, `public/promo/`, dont `voix/`) [mesuré].
- **Le générateur rejoué sur des copies** [mesuré] :
  - Lestraque se régénère à l'identique : `index.html` et `site.js` sont identiques au site en ligne, et `styles.css` ne diffère que par la date de sa ligne 1.
  - Plombier, couvreur, électricien et carreleur s'arrêtent sur « site.json → artisan manque ».
  - Après ajout de la voix de l'artisan dans une copie, plombier et couvreur s'arrêtent ensuite sur « contenu.json → pages["/"].h1Ligne manque ».
  - **Conclusion : les 9 démos gelées sont au format v1 et ne servent pas de point de départ direct.** Le plan 1 et le juge supposaient le contraire.
- **Webhook Stripe** (`app/api/stripe/webhook/route.ts:32-79`) : il n'existe aucune branche `else`. Un paiement qui n'a ni `metadata.type` ni la paire `uid` + `plan` n'écrit rien et ne signale rien [prouvé].
- **Verrou des colonnes** (`0068_controle.sql:157-186`, dernière définition de `lock_artisan_privileges`) : il ne fige ni `site_active`, ni `site_tier`, ni `site_contenu`, ni `site_origine`. Cette dernière colonne est ajoutée par `0088:76` [prouvé]. L'écran `/profil` écrit les trois premières depuis le navigateur (`app/profil/page.tsx:213-227`) [prouvé].
- **Domaine perso sans site publié** : la racine du domaine affiche « Site non publié » (`middleware.ts:67-68` puis `app/site/[slug]/page.tsx:131-133`) [prouvé].
- **Contrat de `/api/leads`** : la route reçoit du JSON `{slug, contact, nom_prospect, message, website}` ; `website` est un piège à robots qui doit rester vide (`route.ts:26-47` et `:59`). Le middleware ne touche pas `/api` (`middleware.ts:141`) et la CSP autorise `connect-src 'self'` (`next.config.mjs:39`). **Un formulaire posté sur le même domaine passe donc** [déduit].
- **Accusé de réception** : il part par e-mail seulement quand le client laisse une adresse (`api/leads/route.ts:203-204`) [prouvé].
- **Google Workspace**, politique d'utilisation modifiée le 13/10/2025 et lue le 24/09/2026 : elle interdit « des e-mails en masse non sollicités, des promotions, des publicités ou toute autre sollicitation (\"spam\") » [prouvé].
- **Vercel**, conditions mises à jour le 14/09/2026 : « Hobby teams are restricted to non-commercial personal use only ». Est commercial « Any method of requesting or processing payment from visitors of the site » [prouvé]. Le code parle de l'offre Hobby (`api/cron/purge-comptes/route.ts:5`) [à vérifier dans le tableau de bord].
- **Tâche 023-03** : dernier verdict FAIL le 16/09 à 20 h 25 UTC. Son verrou est tenu par `codex-22` depuis 8 jours (`.orchestre/verdicts.jsonl`, `.orchestre/en-cours/023-03.lock`) [prouvé].
- **L'équipe**, tranché le 10/09 (mémoire `presti-qui-tient-quel-reseau`) : LinkedIn revient à Louis-Victor, Facebook et Instagram à Gabriel, et Benj garde @prestiapp.
- **Limite Instagram mesurée le 09/09** : un compte sans publication est freiné vers 6 messages ; la consigne est de 3 ou 4 par jour tant que le compte est vide (mémoire `instagram-dm-automatisation`).
- **Calendrier** : J+1 tombe le vendredi 25/09, J+7 le jeudi 01/10, J+14 le jeudi 08/10 et J+30 le samedi 24/10. Le jalon J+30 est donc posé au vendredi 23/10.

**Vérifié en plus pour cette révision, le 24/09** [prouvé, sauf mention] :
- **Droits.** La garde de la direction exige `is_founder` (`lib/direction/garde.ts:51`) et ramène le rôle `partenaire` à `lecture` (`:59-60`). Aucun rôle ne permet d'écrire sans être fondateur.
- **Reconfirmation.** « 5 minutes, usage unique, une portée » (`lib/direction/reconfirmation.ts:7`) ; `consommer()` brûle le jeton (`:30-35`).
- **Compte supprimé.** La purge efface la ligne de l'artisan (`lib/purgeComptes.ts:57-60`) ou remplace son adresse par `supprime-…`, vide `slugs_anciens` et met `leads_pause` à vrai (`:99-104`). `/api/leads` ne cherche que `.eq('slug', slug)` (`route.ts:77`) et répond alors 404 « Artisan introuvable » (`:84`). La CGU 3 bis promet pourtant le site en ligne douze mois après la suppression (`app/cgu/page.tsx:59`), et le retrait comme l'envoi du dossier n'existent pas : la décision H3 « n'est pas prise » (`0088_site_commande.sql:22-24`).
- **Adresse changée.** 0051 promet qu'« une adresse changée ne casse rien » (`0051_slug_modifiable.sql:4`). La fonction `artisan_par_ancien_slug` (`:33-42`) et son aide `artisanParAncienSlug` (`lib/slugRedirect.ts:6`) existent, mais `/api/leads` ne s'en sert pas. Un site généré avant le changement posterait donc l'ancienne adresse et perdrait chaque demande [déduit].
- **Voix de l'artisan.** Le dossier `/site/commander` ne demande que photos, adresse, SIREN, horaires, décennale, avis et logo (`app/site/commander/page.tsx:54`). Le générateur exige prénom, nom, année d'installation, parcours et citation à la première personne (`generer.mjs:192-201`), et le plateau « une phrase et trois chiffres » (`:147`, `:216-222`).
- **Rédacteur d'un site.** Le type `SiteContenu` de `generateSiteContent` est au format v1 (`lib/ai.ts:1039-1049`) ; le générateur lit un `contenu.json` v2 à pages (`generer.mjs:279-280`).
- **Promesses** [mesuré par `grep`] :
  - « moins d'une minute » apparaît 13 fois dans 7 fichiers : `app/layout.tsx:45,47` ; `app/page.tsx:47,82,98,110,192` ; `app/profil/page.tsx:309` ; `app/dashboard/page.tsx:124` ; `app/faq/page.tsx:18` ; `app/manifest.ts:18,37` ;
  - s'y ajoute `app/DemoSequence.tsx:26` : « L'assistant répond, dans la seconde » ;
  - `lib/platStats.ts:45` n'affiche la formule que si la médiane mesurée est sous 60 s : c'est vrai, on la garde ;
  - le registre `plans/promesses.md:9` prouve la version « réponse prête » en mode assisté (suite `pilotage-e2e`, 05/09), et `scripts/promo-couverture.mjs:53-56` l'écrit déjà ainsi. Ce qui est faux, c'est « Presti répond » sur l'offre Essentiel : le mode par défaut est « assistée » (`lib/plateformeConfig.ts:45`), où Presti prépare la réponse et l'artisan l'envoie (`:184`).
- **Constructeur.**
  - Le bloc « Votre site web » porte aussi le seul bouton « Commander mon site » de la page (`app/profil/page.tsx:442-450`).
  - `scripts/fermeture-e2e.mjs` refuse un drapeau absent de sa carte (`:258-260`) et attend 404 d'une route fermée (`:214`).
  - `scripts/site-sorti-des-formules-verifier.mjs:48` exige `site_active` dans `/profil`.
  - `scripts/audit-final-e2e.mjs:153-155` exige `signalerPanneIA` et `rendreCredit` dans `app/api/site/generate/route.ts`.
- **Générateur et `public/`.** Sans `--sortie`, il écrit dans `public/sites-demo/<métier>` (`generer.mjs:276-277`), que prestiapp.fr sert à tout le monde [déduit].
- **Orchestre.**
  - `maj` ne recopie que `orchestre.mjs`, `preuves.mjs`, les crochets et les juges (`Documents/orchestre/bin/orchestre.mjs:826-835`).
  - `executant.mjs` n'existe pas dans la source.
  - `presti/scripts/executant.mjs` a été modifié le 24/09 sans commit, sur consigne de Benj : `gpt-6-sol` par défaut, `gpt-6-luna` pour le tri et la veille (`:33-36`).
  - La copie de `orchestre.mjs` dans presti ne diffère de la source que par la ligne 51, où `codex` manque [mesuré par `diff`].
- **Série 023.** 023-01 et 023-02 sont PASS avec 0 ligne, les 16/09 à 17 h 48 et 17 h 50 UTC (`.orchestre/verdicts.jsonl`). Selon `023-03.md`, Antigravity a assoupli leurs propres juges, qui restent modifiés sans commit (`git status` : `scripts/familles-socle-suite-qa.mjs`, `scripts/signature-repos-qa.mjs`).
- **Base chaude.** `est_demo` marque des comptes internes : la relecture Apple et Google, `demo-menuisier`, l'ancien partenaire (`CLAUDE.md:221-227`). Deux des trois « vrais comptes » portent le nom de famille de Benj (`SaaS/Récap-Projet.md:115`).
- **Ce qui existe déjà pour les alertes et l'argent.**
  - `lib/alertes.ts` porte les motifs `cron_muet` (`:186-218`), `paiement` (`:257-268`), `solde_ia` et `digest` (`:271-300`), avec un verrou d'une fois par jour et par clé (`:311-313`).
  - La ronde tourne chaque jour depuis `api/cron/relances/route.ts:151`.
  - Le seuil de TVA est déjà suivi dans l'onglet Comptabilité (`app/controle/Comptabilite.tsx:114-138`), et les recettes Stripe dans `lib/direction/stripe.ts`.
- **Consigne obsolète.** `SaaS/Produit/Prompt-Codex-2026-09-15.md` §4 (e-mails depuis le Gmail de Benj) et §5 (corbeille du Gmail) sont toujours écrits comme des tâches à faire. Les 166 e-mails sont partis le 16/09, et 11 autres brouillons sans rapport restaient dans Gmail ce jour-là (`Prospection/emails-artisans/envois-2026-09-15.md`).
- **Équipe.**
  - Prospecter « sans statut, sans facture et sans déclaration », c'est le risque de travail dissimulé, « à la charge de Benj » (`SaaS/Decisions/Journal-Decisions.md:161-165`). La convention n'est ni signée ni relue, et ne couvre que Louis-Victor.
  - Gabriel travaille « sur son compte », celui de Benj (`:166-172`).
  - Décision du 09/09 : « pas de réponse automatique de messagerie » (`:173-174`).
- **Sauvegarde.** `vercel.json` ne désactive aucune branche. Tout push vers le dépôt relié à Vercel déclenche donc un déploiement [déduit : l'intégration Git est active, puisque 37 déploiements sont partis en erreur les 13 et 14/09].
- **Stockage.** Le stockage Supabase fait 1 Go et il est partagé ; `scripts/site-deposer.mjs:9` refuse un dépôt de site s'il resterait moins de 400 Mo.
- **Search Console.** La soumission du plan du site est un geste manuel de Benj (`app/api/controle/sites/[id]/route.ts:55-56`).
- **Alexya.** Formules à 9 $ (environ 13 vidéos), 29 $ et 99 $ ; le connecteur Claude est un OAuth par utilisateur (`SaaS/Produit/Ecosysteme-Veille-2026-09-24.md:22-23`). Il n'est pas branché dans cette session.

---

## 0. En bref

1. **« Regarder l'argent rentrer » est atteignable à environ 90 %, pas à 100 %.**
   - Tout s'automatise : trouver, vérifier, fabriquer, rédiger, relancer, encaisser, livrer, compter, surveiller.
   - Six gestes restent humains, pour des raisons de règles et non de technique :
     - l'appui sur « Envoyer » du premier message privé : aucune API ne le permet, et un script est interdit par Instagram ;
     - la vérification d'identité Meta ;
     - la validation d'un site avant sa mise en ligne, promise par les CGU 3 bis (`app/cgu/page.tsx:58`) ;
     - la soumission du plan de chaque site à la Search Console (`app/api/controle/sites/[id]/route.ts:55-56`) ;
     - toute dépense ;
     - les appels des clients qui veulent entendre Benj.
   - Cible : **20 min par jour pour Benj à J+30.** Elle descend à 10 min seulement quand Gabriel a un statut (D1), son propre compte (D2) et le rôle délégué (fiche 025-08, phase 2).
2. **On prouve avant de construire.**
   - Les contacts génériques n'ont rien donné : 0 intéressé sur environ 220 entre le 09 et le 16/09 (`SaaS/Prospection/emails-artisans/envois-2026-09-15.md:32`), et un seul payeur à 29 €, non identifié (`SaaS/Récap-Projet.md:115`).
   - La phase 1 (J+1 → J+14) sert donc trois buts : sécuriser, rendre le site vendable, et **mesurer à la main** si une maquette offerte fait répondre.
   - Le bus, l'onglet Pilotage et les agents qui tournent 24 h/24 ne se construisent qu'après le **jalon du jeudi 08/10**, et seulement pour l'étape qui a converti. **Le jalon ne compte que les contacts froids.**
3. **L'offre d'entrée reste le site à 300 €.** C'est la seule dont le paiement et la validation existent déjà (`lib/siteCommande.ts:9-11`, onglet Sites du Poste). L'abonnement devient la suite du site : le formulaire du site envoie les demandes dans Presti.
4. **Les pubs viennent en deux produits, dans cet ordre :**
   - un **pack pubs locales à 149 €** pour ceux qui viennent d'acheter un site : leurs photos, aucune personne générée, livré en dossier, avec sa facture ;
   - puis le **Studio pubs e-commerce**, la méthode d'Hugo : bibliothèque Meta, puis échantillon privé, puis pack à 490 €. C'est un test borné. **La note du juriste passe avant le premier échantillon**, et jamais de faux témoignage.
5. **Presti se recentre sur les sites.** Dès la phase 1 :
   - le constructeur sort de « Ma page » ;
   - la porte du site gratuit se ferme ;
   - les promesses fausses sont corrigées ;
   - le dossier de commande recueille la voix de l'artisan.

   La landing « le site d'abord » arrive après le jalon, avec le message qui a fait répondre.
6. **Le cerveau qui tourne 24 h/24 ne vit pas sur le portable**, qui se met en veille après 10 min et n'a que 8 Go.
   - L'horloge et la mémoire vivent dans Vercel Pro et Supabase.
   - Le jugement passe par des appels courts à l'API (clé séparée et plafonnée) et par quelques routines Claude.
   - Codex et Antigravity fabriquent le code quand le PC est allumé.
   - **La livraison d'un site dépend du poste** jusqu'à la phase 3 (génération et dépôt). Le délai de 48 h ouvrées l'absorbe.
7. **L'e-mail à froid automatique n'est pas le moteur.**
   - Le Gmail personnel est exclu (politique Gmail).
   - Resend est exclu (ses conditions).
   - Workspace interdit « les e-mails en masse non sollicités » [prouvé].
   - Le canal e-mail se décide au jalon, avec un fournisseur qui autorise expressément la prospection B2B [à vérifier avant tout achat].
8. **L'argent attendu, sans l'enjoliver :**

   | Échéance | Hypothèse |
   |---|---|
   | J+1 | 0 € |
   | J+7 | 0 € probable ; 300 € seulement si Richard achète |
   | J+14 | 0 à 600 € ; 0 à 300 € si Benj envoie seul |
   | J+30 | hypothèse centrale 300 à 900 € cumulés, fourchette de 0 à 1 500 € |

   Point d'équilibre : une vente de site par mois couvre les frais nouveaux.
9. **La phase 1, ce sont 10 fiches d'orchestre** : 025-01 à 025-07 et 025-09 à 025-11. La 025-08 est réservée à la phase 2. Claude Code écrit tous les juges (025-01) avant de déposer quoi que ce soit ; chacun échoue aujourd'hui. Codex les contre-vérifie par des mutations (025-10).
10. **Benj, une seule fois :** régler le statut de l'équipe, créer le dépôt privé de sauvegarde, passer Vercel en Pro, poser les garde-fous, couper les tâches zombies, clore la consigne Codex du 15/09, coller une migration, vérifier son identité Meta, écrire à Alexya. Plus les décisions du §11.

---

## 1. Le modèle économique

### 1.1 Les offres

| # | Offre | Prix | À qui | Canal | Qui fabrique | Part humaine | Vendable |
|---|---|---|---|---|---|---|---|
| A | **Site vitrine fait pour vous** | 300 € une fois, TVA non applicable (art. 293 B, `lib/siteCommande.ts:9-11`). Passage à 390-490 € après 5 ventes et 3 références (D17) | Artisans du bâtiment sans site ou avec un site daté ; en priorité ceux qui paient déjà de la pub Meta | Message de permission puis maquette offerte ; appel ; landing | Générateur (`public/sites-demo/generer.mjs`) et juge `site-qa` | « Mettre en ligne » (un geste, qui existe déjà : `app/controle/Sites.tsx:105`) ; la Search Console (5 min) ; un appel de 15 min si l'artisan n'a pas rempli « Votre parcours » | Dès J+7, après 025-03 (le formulaire ne perd plus les demandes) et 025-09 (le dossier recueille la voix) |
| B | **Abonnement Presti**, le moteur du site | 29, 59 ou 99 €/mois (`lib/plans.ts:59-61`). Levier sans code : 2 mois d'Essentiel offerts par code promo, que `/api/subscribe` accepte déjà | Chaque acheteur de site | Proposé à la livraison du site, jamais au premier contact | Le SaaS | Aucune | Existe |
| C | **Pack pubs locales** : 3 vidéos 9:16 de 15 s et 3 visuels 1:1 faits avec LEURS photos de chantier, les textes d'annonce et une fiche « lancer la pub en 10 min » | 149 € une fois, avec facture Stripe au même modèle que le site | Acheteurs de site, puis artisans déjà annonceurs | Mail de livraison du site, carte dans l'app | Gabarit HyperFrames rendu en local ; juges `video-qa`, manifeste des entrées et détection de visages | Valider les 5 premiers packs | Phase 2 (J+30) |
| D | **Studio pubs e-commerce (test)** : 10 vidéos × 3 accroches, en démonstration produit ; un présentateur éventuel est annoncé comme virtuel | 490 € [supposé] | Marques qui paient déjà de la pub en France (bibliothèque Meta) | Échantillon privé après un message de permission, depuis un compte Instagram distinct de @prestiapp ; page ou domaine à part, pas la landing Presti | Séance Claude Code supervisée : ElevenLabs, déjà connecté ; Alexya seulement après sa réponse écrite, formule à 9 $ d'abord ; juge `pub-qa` | Accord écrit de la marque avant toute diffusion | **Après la note du juriste, jamais avant** (D12) |

**Le domaine d'un site.** Par défaut, l'artisan le réserve lui-même, à son nom, avec notre guide, pour environ 10 € par an [prix à vérifier] (D9). Aucun agent n'achète de domaine. L'option « proposez-m'en un » du dossier (`app/site/commander/page.tsx:200`) disparaît avec 025-09.

**Ce qu'on ne vend pas :**
- **La gestion mensuelle de campagnes.** L'API Marketing exige l'App Review et l'Advanced Access ; sans elles, c'est du temps humain.
- **De faux avis ou de faux témoignages.** Le Code de la consommation les interdit (art. L121-4, notamment 21°, 27° et 28°) [à faire confirmer par le juriste].
- **WhatsApp et les réseaux sociaux**, dont les drapeaux sont à `false` (`lib/flags.ts:64-65`).
- **Des positions sur Google**, que les CGU 3 bis excluent déjà.

**Règles de prix et de paiement.**
- **Tout paiement porte `metadata.type`.** Après 025-07, un paiement qui n'est rattaché à rien déclenche une alerte : fini le lien de paiement que le webhook ignore sans bruit.
- **Chaque vente a sa facture.** Les packs C et D reprennent le modèle du site : `invoice_creation` avec la mention de franchise (`app/api/site/commander/route.ts:51-55`). Jamais un lien de paiement nu.
- **Aucun abonnement récurrent autre que Presti** tant que le webhook ne filtre pas `metadata.type` dans `customer.subscription.updated` et `.deleted`. Deux fonctions poseraient problème [prouvé, juge 2] :
  - `planDepuisMontant` (`lib/abonnementSync.ts:17-23`) transforme en formule Presti tout abonnement de 29, 59 ou 99 € ;
  - `concerneAbonnementCourant` (`lib/stripe.ts:15-17`) répond vrai quand aucun abonnement n'est en base.

  Les packs restent donc des **paiements uniques**.
- **Coût net d'une vente :**
  - frais Stripe, de l'ordre de 1,5 % + 0,25 € par carte européenne [à vérifier sur le relevé Stripe] ;
  - frais éventuels de la facture Stripe émise pour un paiement unique [à vérifier sur le relevé] ;
  - cotisations de la micro-entreprise [à vérifier auprès de l'URSSAF] ;
  - chaque encaissement compte dans le plafond de la franchise en base (mémoire `presti-facturation-tva`).

### 1.2 Le jalon et les seuils de décision [seuils supposés, révisés à chaque revue]

**Jalon du jeudi 08/10 (J+14), sur au moins 60 contacts de permission suivis, tous en canal froid.**
- **Ne comptent que les contacts froids.** Les ventes et les « oui » de la base chaude, des comptes `est_demo` ou de proches (même nom de famille) sont notés à part et ne déclenchent jamais un GO.
- **Moins de 60 contacts froids au 08/10**, par exemple si Benj envoie seul (D1) : on prolonge la mesure jusqu'à 60, au plus tard jusqu'au jeudi 15/10 (J+21). Un volume trop faible ne vaut jamais NON.

| Résultat mesuré | Décision |
|---|---|
| Au moins 1 vente ou au moins 4 « oui » | **GO** : la phase 2 entière (§6.4) |
| 1 à 3 « oui », aucune vente | **GO partiel** : on automatise seulement la fabrication et la livraison ; les envois restent à la main ; un nouveau message est testé pendant 10 jours |
| 0 « oui » | **NON** : on ne construit rien de plus. On change de segment (artisans au site daté, artisans annonceurs) ou d'offre (site + 3 mois de Studio), puis 10 jours de mesure en plus |

**Ensuite (repris du plan 1, adapté) :**
- après 300 contacts, moins de 1,5 % de « oui » : on change le message, pas le volume ;
- plus de 2 % de « oui » mais aucune vente après 15 aperçus : c'est l'offre qui bloque ;
- pack C : moins d'1 acheteur de site sur 5 après 10 livraisons, on le retire ou on change son prix ;
- test D : arrêt après 40 échantillons sans paiement et avec moins de 3 réponses positives ;
- montée en volume : seulement quand une vente tombe pour 150 contacts ou moins.

### 1.3 Ce qu'on retire, cache ou corrige

**Temps 1 (phase 1, fiches 025-04, 025-05, 025-06 et 025-09) :**
- **Fermer la porte du site gratuit.** La migration 0093 fige `site_active`, `site_tier`, `site_contenu` et `site_origine` hors `service_role`. Les écritures légitimes passent déjà par le serveur (`api/donnees/route.ts:118`, `lib/purgeComptes.ts:102`, `api/controle/sites/[id]/route.ts:83`). **Benj la colle seulement après le déploiement de 025-05** : sinon, la case « Mon site est publié » de l'ancien écran serait ignorée sans message.
- **Retirer de « Ma page »** tout ce qui ne sert qu'au constructeur :
  - l'apparence et `StyleAvance` ;
  - les réalisations ;
  - dans le bloc « Votre site web », les niveaux et « Rédiger avec l'IA » ;
  - le composeur, les textes du site, la case « Mon site est publié », l'aperçu, l'avant/après ;
  - le bouton « Réinitialiser le site ».
- **Garder « Supprimer le site » pour les titulaires d'un site historique actif.** Après 0093, c'est leur seul moyen de retirer eux-mêmes leur site (`api/donnees/route.ts:114-121`).
- **Garder le bloc « Le site, à la demande » et son bouton « Commander mon site »**, qui vivent dans le même bloc (`app/profil/page.tsx:442-450`).
- **Couper `/api/site/generate`** : elle répond **404** (et non 410, que refuserait `fermeture-e2e.mjs:214`), derrière le nouveau drapeau `constructeurSite: false`, inscrit dans la carte de `fermeture-e2e.mjs`. Le reste de la route reste en place : `audit-final-e2e.mjs:153-155` y exige `signalerPanneIA` et `rendreCredit`.
- **Garder** ce que l'IA et la page de contact lisent (`lib/ai.ts:39-66`) : lien, interrupteur « page active », logo, bio, zone, horaires, prestations, contacts, domaine, suppression du compte.
- **Garder `findFabrications` et `lib/ai/antiFabrication.ts`** (`lib/ai.ts:1054`) : ils contrôleront le rédacteur du convertisseur en phase 2. `generateSiteContent` (`:1083`) reste en place derrière le drapeau, mais **ne peut pas** être ce rédacteur : son type est au format v1 (`:1039-1049`), et le générateur lit un `contenu.json` v2 à pages. Il faudra une fonction nouvelle au schéma v2.
- **Corriger les promesses :**
  - « Présence en ligne soignée » (`lib/plans.ts:60`) ;
  - « Inclus dès Studio / Signature » (`profil:432`) et « Inclus dans l'offre Signature » (`profil:597`), qui partent avec le constructeur ;
  - les 13 « moins d'une minute » et « L'assistant répond, dans la seconde » (`app/DemoSequence.tsx:26`). « Presti répond » devient « réponse prête en moins d'une minute : Presti la prépare, vous l'envoyez », ou « répond seul dès Studio ».
- **Réécrire l'aide de « Ma page »** (`lib/aide.ts:247-267`), qui décrit l'apparence, les réalisations et la rédaction du site.
- **Recueillir la voix de l'artisan dans le dossier** (025-09) : prénom, nom, année d'installation, parcours d'une ligne, phrase signée, trois chiffres ou « je préfère ne pas ».

**Temps 2 (après J+30) :**
- déplacer `infos-legales` sous `/p/<slug>` ;
- faire mener la racine d'un domaine sans site vers la page de contact, au lieu de « Site non publié » ;
- supprimer le moteur `/site/[slug]`, sauf pour les 5 sites historiques (D16) ;
- réécrire les 27 scripts de test qui visent `/site/<slug>` ou `/profil` ;
- mettre à jour le plan du site et l'aide ;
- ajouter `sites_commandes` à l'export RGPD (`api/donnees/export/route.ts:24-52`) ;
- **retirer un site douze mois après la suppression du compte et envoyer son dossier à l'artisan** (H3, D15) : une tâche planifiée.

**À geler :**
- les 12 Managed Agents de la « coentreprise », jamais déclenchés (`coentreprise.mjs:12`) : on archive le registre ;
- la tâche planifiée « Ghost Towns » ;
- l'automatisation Codex « Publora série 2 », après sa dernière parution (02/10) ;
- la tâche 023-03 ;
- **la consigne Codex du 15/09, §4 et §5** (`SaaS/Produit/Prompt-Codex-2026-09-15.md`) : e-mails depuis le Gmail de Benj et corbeille de sa boîte (D6).

### 1.4 La landing : le site d'abord, les pubs en plus

- **En phase 1**, on ne corrige que les promesses (025-05 et 025-06). Le reste attend que le message gagnant soit connu.
- **Après le jalon**, la page se construit dans cet ordre :
  1. **Accroche** : « Votre site d'artisan, fait pour vous. 300 €, une fois. En ligne sous 48 h ouvrées après validation par Presti. »
     - Bouton principal : « Commander mon site », qui dépend du drapeau `siteCommandeVente`.
     - Bouton secondaire : « Recevoir la maquette de mon site (gratuit) », un formulaire de 4 champs qui crée un prospect de source « entrant ».
  2. La démo Lestraque, qui existe déjà (`app/DemoSite.tsx`).
  3. **« Ce qui est inclus »**, strictement ce que disent les CGU 3 bis :
     - une page par commune servie ;
     - le formulaire branché sur Presti ;
     - le domaine au nom de l'artisan ;
     - le site maintenu 12 mois s'il quitte Presti, **seulement une fois que le retrait et l'envoi du dossier existent** (D15).
  4. **« Et chaque demande reçoit une réponse »** : l'abonnement, formulé exactement.
  5. **« En plus : vos pubs locales, 149 € »**.
  6. **« Parler à Benjamin »**, avec son numéro (D13). Aucune voix clonée : un appel avec une IA doit être annoncé comme tel (AI Act, art. 50).
  7. Des preuves réelles seulement, puis la FAQ.
- **Le Studio e-commerce** a sa page, voire son domaine, à part. La réputation d'un démarchage auprès des marques ne doit pas déteindre sur prestiapp.fr.
- **Levée de `siteCommandeVente`** (`lib/flags.ts:71-74`), décision D8 : après que 025-03 et 025-09 sont PASS et déployés, que `formulaire-site-qa --reel` est vert, et que Benj a regardé un site généré (condition H5). Visé à J+7, pour que les prospects chauds achètent en passant par `/signup` puis « Commander mon site ».

### 1.5 L'argent attendu et le point d'équilibre

**La formule :** ventes = contacts froids × taux de « oui » × taux d'achat après la maquette. Tous les taux sont [supposé] tant que la phase 1 ne les a pas mesurés.

| Échéance | Volume | Hypothèses | Encaissé |
|---|---|---|---|
| J+1 (ven 25/09) | 0 | — | 0 € |
| J+7 (jeu 01/10) | environ 25 contacts ; base chaude qualifiée | « oui » de 3 à 8 % ; achat de 10 à 25 % | hypothèse centrale 0 € ; 300 € seulement si Richard achète, le seul contact chaud qui ne soit ni interne ni un proche [supposé] |
| J+14 (jeu 08/10) | 60 à 100 contacts si l'équipe envoie : Instagram 3-4 par jour (Benj), Facebook 5 (Gabriel, D1, D2), LinkedIn jusqu'à 10 invitations (Louis-Victor, D1, D2), appels. **30 à 40 si Benj envoie seul** | idem | 0 à 600 € (0 à 2 sites) ; 0 à 300 € si Benj envoie seul |
| J+30 (ven 23/10) | 150 à 250 contacts si GO | taux mesurés au jalon | hypothèse centrale 300 à 900 € (1 à 3 sites) ; fourchette de 0 à 1 500 € ; 0 à 2 abonnements ; 0 ou 1 pack |

**Coûts fixes nouveaux :**
- **Phase 1 :** Vercel Pro, 20 $/mois (prix relevé par les plans 1 et 2 le 24/09). Il est obligatoire de toute façon, puisque Presti encaisse. Le dépôt privé de sauvegarde : 0 € [à vérifier selon l'offre GitHub].
- **Phase 2 :** s'ajoutent :
  - la clé « agents » : plafond de 30 $, 10 à 20 € réellement dépensés au départ [supposé] ; (annulé : plafond de 0 € par agent, migration 0105 et organigramme du 27/09 ; aucun achat)
  - éventuellement Supabase Pro (25 $), dès que le stockage partagé dépasse 60 %, et GitHub Pro (4 $) [à vérifier] ;
  - le canal e-mail s'il est retenu : domaine d'environ 10 €/an plus les boîtes [prix à vérifier].
- **Phase 3 :** Alexya, formule à 9 $/mois d'abord (environ 13 vidéos, assez pour 5 échantillons), si le test D est lancé ; et une consultation juridique unique de 150 à 300 € [supposé], **avant** le test D.

**Point d'équilibre :** 1 site par mois.

---

## 2. La carte des agents

### 2.1 Trois couches et quatre règles

| Couche | Rôle | Où | Tourne PC éteint | Tourne sans quota Claude |
|---|---|---|---|---|
| **C0 — l'horloge et la plomberie**, sans modèle | Distribuer, expirer les baux, envoyer ce qui est approuvé, relever, traiter les STOP, compter, prévenir | Tâches planifiées de Vercel Pro (à la minute) ; Supabase | oui | oui |
| **C1 — le jugement court** | Classer, extraire, rédiger un champ, juger | Appels à l'API Anthropic depuis Vercel, avec une clé « agents » séparée et plafonnée ; quelques routines Claude en phase 3 | oui | l'API oui ; les routines non |
| **C2 — la fabrication de code et le jugement lourd** | Fiches de l'orchestre, juges, migrations, code de l'argent, maquettes et sites à la main en phase 1, relecture de code | Claude Code, Codex et Antigravity sur le poste | non | non : la tâche attend ou change d'exécutant |

**Les quatre règles :**
1. **Le déterministe d'abord.** Un agent, c'est d'abord un script. Le modèle n'intervient qu'en appels courts, à sortie structurée stricte. Jamais d'agent libre avec des outils d'écriture.
2. **Séparer le lecteur de l'acteur.** Ce qui lit du contenu extérieur n'a aucun outil : c'est le cas des pages, des annonces et des réponses de prospects. Il rend un JSON validé par un schéma, et seul ce JSON passe à l'acteur.
3. **Deux clés Anthropic.** Le 04/09, une seule clé vidée a éteint tout Presti (`docs/couts-et-solde.md:1-15`). Les agents n'utilisent donc jamais la clé du produit, et la clé « agents » n'est lue que par `lib/agents/llm.ts`.
4. **Rien qui encaisse ne dépend de C2.** La livraison, elle, en dépend jusqu'à la phase 3 : « Mettre en ligne » exige un site déposé par `scripts/site-deposer.mjs` (`app/api/controle/sites/[id]/route.ts:59`), et la génération tourne sur le poste. On l'assume, sous le délai de 48 h ouvrées. En phase 3, une fiche déplace la génération et le dépôt dans GitHub Actions, avec un budget de minutes.

**Où tourne quoi, et ses limites :**
- **Vercel Pro.** Tâches planifiées à la minute, 100 par projet (doc Vercel du 15/07/2026, lue par le plan 2). Le commentaire « 2 tâches » du code est périmé.
- **GitHub Actions.** 2 000 min/mois sur un dépôt privé [à vérifier]. Les nuits consomment déjà jusqu'à 75 min (`audit.yml:17,27` et `sauvegarde.yml:18,28`), soit un pire cas d'environ 2 250 min/mois. S'ajoutent `qualite` et `security` sur chaque push ou PR. En conséquence :
  - la phase 1 n'y ajoute rien ;
  - Benj lit la consommation réelle avant J+14 ;
  - **aucun chien de garde planifié sur Actions**.
- **Routines Claude** (code.claude.com/docs/en/routines) :
  - une heure au moins entre deux lancements ;
  - un plafond quotidien, en plus du quota Max, qui a déjà été épuisé le 10/09 et le 17/09 ;
  - tous les connecteurs y sont inclus par défaut et écrivent sans demander : **les routines n'auront aucun connecteur** ;
  - leur environnement cloud filtre le réseau par défaut : il faudra y permettre `prestiapp.fr` et mettre le jeton dans les « API credentials » [à vérifier].
- **Le poste de Benj.** Veille après 10 min sur secteur, 8 Go de RAM : **2 exécutants en parallèle au plus**.

### 2.2 Les agents, et la phase où chacun arrive

Les coûts sont mensuels et [supposé]. « API » désigne la clé « agents ».

| # | Agent | Rôle | Déclencheur | Où | Entrées → sorties | Garde-fous | Coût | Phase |
|---|---|---|---|---|---|---|---|---|
| H | **Humains** : Benj ; Gabriel et Louis-Victor seulement avec un statut (D1) et leur propre compte (D2) | Envoyer le premier message, appeler, décider, valider | Le lot du jour, les décisions | Téléphone ou PC | Cartes → « Envoyé » | Plafonds §5.2 ; liste des affirmations permises | — | 1 |
| C2 | **Claude Code** (local) | Écrire les juges, les migrations et le code de l'argent ; essai à sec ; préparer le lot ; fabriquer les maquettes et les sites à la main | Séance ouverte par Benj, une fois tous les 1 à 2 jours | Poste | Suivi → lot, maquettes, fiches | Aucun envoi lui-même ; liste d'opposition vérifiée ; `prospects-hors-depot.mjs` avant chaque push | quota Max | 1 |
| C2 | **Codex, Antigravity** | Les fiches de l'orchestre | `orchestre prochaine` | Poste | Fiche → code, puis PASS du juge | Jamais `flash_lite` (a inventé des données et lancé le `git restore` du 13/09) ; 2 exécutants au plus ; aucun juge dans leur périmètre | abonnements existants | 1 |
| A0 | **Horloge et veilleur** : la ronde de `lib/alertes.ts`, passée de quotidienne à `*/5`, avec de nouveaux motifs | Baux, battements, disjoncteurs, état du dernier déploiement, stockage, jeton Meta à J-7, digest | Vercel `*/5` | C0 | Tables `ops` et `passages_cron` → Attention, notifications | Aucun modèle ; au plus 3 notifications par jour, hors paiement, appel et panne ; son absence se voit : pas de digest à 7 h 30 | ≈ 0 | 2 |
| A1 | **Rédacteur** | Remplit un modèle de message approuvé avec 2 ou 3 faits sourcés, pour les cartes du lot du jour | Prospect vérifié | Vercel + API Haiku | Prospect → envoi à l'état `prepare` | Chaque fait est cité mot pour mot depuis sa source ; juge J3 de conformité et juge de promesse (liste fermée) | ≈ 4 € | 2 |
| A2 | **Atelier maquettes** | `generer.mjs --maquette` + capture, au rythme de l'envoi : rien qui ne parte dans les 48 h | « oui » ou prospect retenu pour le lot | Poste (C2) tant que la consommation de minutes Actions n'est pas mesurée ; ensuite Actions | Fiche du prospect → deux captures (phase 1) ; en phase 2, un lien privé `noindex` qui expire à 21 j | Juge `maquette-qa` ; jamais dans `public/` ; 3 Mo au plus, captures de 1 Mo au plus ; 10 par jour au plus ; photos d'illustration avant le « oui » (§5.3) ; le lien privé exige une table `maquettes` avec date d'expiration, car `apercu_jeton` n'expire jamais (`app/site-genere/[commande]/[[...chemin]]/route.ts:23-33`) | minutes | 1 à la main, 2 automatique |
| A3 | **Standardiste** | Classe les réponses (e-mail, formulaire entrant) : intéressé, question, pas maintenant, STOP, réponse automatique, appel | Relève toutes les 15 min | Vercel + API Haiku sans outil | Réponse → action | **Ne lit que les fils qui répondent à un envoi de `ops.envois`** : la boîte relevée est le Gmail personnel de Benj (banque, URSSAF). STOP : opposition immédiate, en code. Aucun lien suivi, aucune pièce jointe ouverte. Au plus 2 relances, puis silence | ≈ 3 € | 2 |
| A4 | **Livreur de sites** | Mène la commande payée jusqu'au site en ligne | `sites_commandes` passe à `payee` | Poste (génération, dépôt) + Vercel ; Actions en phase 3 | Rédacteur v2 → `generer --source` → `site-qa` → dépôt → décision « Mettre en ligne » → 3 e-mails à l'artisan (payée, générée, en ligne) + guide DNS ; rappel « Search Console » à Benj | 2 régénérations au plus ; seulement les photos fournies par l'artisan ; voix de l'artisan tirée du dossier, jamais inventée ; aucun achat de domaine | ≈ 1 € par site | 2 |
| A5 | **Trésorier** | Recettes, abonnement mensuel récurrent, coûts, marge, cumul face au seuil de TVA | 6 h + webhook | Vercel | Mêmes fonctions que l'onglet Comptabilité et `lib/direction/stripe.ts` → tuile Argent | Un seul calcul par chiffre (mémoire « Deux chiffres, un écran ») ; aucune écriture dans Stripe ; les estimations sont marquées comme telles | 0 | 2 |
| A6 | **Atelier pubs locales** | Pack C | Paiement `pack_pub` | Poste (HyperFrames en local, mémoire `hyperframes-en-local`) | Photos → 6 créas + fiche | `video-qa` ; manifeste des entrées (seulement les photos du client) et détection de visages ; aucune personne générée ; voix de synthèse annoncée | 0 | 2 |
| A7 | **Vigie Meta** | Annonceurs artisans et e-commerce, comptés par métier | Chaque jour | Vercel ou Actions | API officielle `ads_archive` → `ops.annonceurs` | L'API seulement, jamais l'interface moissonnée ; environ 150 appels/h ; jeton de 60 j | 0 | 3 |
| A8 | **Recenseur + J1 juge des faits** | SIREN, métier, site, adresse générique ; J1 revérifie lui-même chaque fait | Prospect nouveau | Vercel | API Recherche d'entreprises (ouverte, sans e-mail) + site de l'artisan | `robots.txt` respecté ; 1 requête/s ; **adresses génériques seulement** (`contact@`, `devis@`) ; unités en diffusion partielle ou opposées à la prospection écartées [à vérifier] ; pas de Google Maps ni de PagesJaunes | ≈ 5 € | 3 |
| A9 | **Studio e-commerce + J2 `pub-qa`** | Échantillons produit | Prospect marque vérifié, **après son accord** pour l'usage de ses photos | Séance Claude Code **supervisée** (ElevenLabs ; Alexya est un OAuth par utilisateur, inutilisable depuis Vercel) ; jamais une routine | Page produit → vidéo de 15 s + 3 visuels | Aucun témoignage ; mention « générée par IA » du début à la fin ; aucun visage réel ; logo seulement en privé ; J2 rejette 5 défauts plantés | crédits existants, puis 9 $ | 3 |
| A10 | **Chef** | Priorités, découpage en tâches, brief en 3 lignes | Routine à 7 h | Cloud Claude | `GET /api/agents/etat` → au plus 10 tâches et 5 décisions | Aucun connecteur ; ne peut ni envoyer, ni dépenser, ni approuver | quota Max | 3 |
| A11 | **Revue hebdomadaire** | Entonnoir, coûts, échecs, 3 décisions classées en euros | Routine du lundi à 7 h | Cloud Claude | → PR `docs/revues/AAAA-SS.md` | Aucun connecteur ; jamais de fusion | quota Max | 3 |
| A12 | **Chantier** | Idée approuvée → fiche → exécutant → juge → PR | Décision « idée » | Routine (écrit la fiche), puis poste | `.orchestre/file/` → PR | Fusion automatique seulement pour les textes, les tests et `docs/**` ; jamais un juge écrit par l'exécutant qui l'utilise | abonnements | 3 |
| A13 | **Support** | Existant, plus des brouillons pour les courriers de l'entreprise | Relève | Vercel | Courrier → brouillon | **Suspendu à D18** (décision du 09/09 : pas de réponse automatique). Ensuite : envoi automatique seulement pour les questions de la FAQ, après 20 brouillons approuvés sans retouche | ≈ 1 € | 3 |
| A14 | **Crieur** | Publora à partir de faits réels | Hebdomadaire | Vercel | → une décision « lot de la semaine » | 15 posts par mois et 3 programmés à la fois (formule Starter) ; aucune photo sous licence CC BY-SA dans une vidéo | ≈ 1 € | 3 |

**Le rythme d'arrivée** : 3 rôles au départ, 7 agents à J+30, 14 au-delà. Personne ne construit 14 agents avant la première vente.

### 2.3 La chaîne type

**En phase 1, à la main :**
1. Benj repère un annonceur dans la bibliothèque Meta, à la main, 10 min deux fois par semaine, sans robot sur son interface. Gabriel aussi, une fois D1 et D2 réglés.
2. Claude Code complète la fiche : SIREN par l'API Recherche d'entreprises, un fait daté et sourcé.
3. Benj envoie le message de permission. **Variante B seulement tant que 025-02 n'est pas PASS** : la variante A dit « j'ai préparé une maquette », ce qui serait faux avant que l'outil existe. Envoi depuis le PC (Instagram et Messenger sur le web) ou le téléphone (D11).
4. Le prospect répond « oui » : Claude Code écrit `maquette.json` dans `SaaS/Prospection/phase0/maquettes/<clé>/`, lance `generer.mjs --maquette` avec une sortie dans ce même dossier, puis `maquette-capturer.mjs`.
5. Benj envoie les deux captures.
6. Il y a de l'intérêt : Benj appelle.
7. La vente passe par `/signup` puis « Commander mon site », avec l'étape « Votre parcours » (025-09).
8. Claude Code fabrique le site :
   - il exporte la commande par un court script qui lit la clé de service lui-même, sans l'afficher, sur le modèle de `scripts/site-deposer.mjs` ;
   - il écrit `contenu.json` v2 à partir du modèle du métier et des seuls faits du dossier ;
   - il lance `generer --source`, `site-qa` et `site-deposer`.
9. Benj clique « Mettre en ligne », soumet le plan du site à la Search Console, et envoie le guide DNS.

**En phase 2 :** A8 → J1 → A2 → A1 → J3 → carte du lot → Benj envoie → A3 classe → A2 fabrique l'aperçu → paiement → A4 livre → A5 compte → proposition de l'abonnement et du pack C.

### 2.4 Les compétences ECC

**Reprises**, recopiées dans le dépôt quand une routine en a besoin :
- `operator-approval-loop` : le contrat des décisions et des approbations d'envoi ;
- `loop-operator` : la logique de A0 ;
- `email-ops` : la preuve d'un envoi, c'est le dossier « Envoyés » ;
- `data-scraper-agent` : le patron de A7 et A8 ;
- `automation-audit-ops` : l'inventaire mensuel ;
- `cost-tracking` ;
- `git-guardrails-claude-code` : les interdits git.

**Écartées :**
- `unified-memory` : exige `ecc-universal`, qui n'est pas installé ;
- `social-publisher` : SocialClaw est payant et doublonne Publora ;
- `lead-intelligence` : exige Exa et l'API X, absents ;
- `fal-ai-media` : exige le MCP fal.ai, absent.

---

## 3. Le bus de communication

### 3.1 Phase 1 : pas de bus, un suivi local

Tout vit dans le vault, qui reste sur le poste et ne va jamais sur GitHub : il contient déjà des données de prospects (`deja-contactes-email.txt`, 177 lignes). Dans `SaaS/Prospection/phase0/` :
- `suivi.csv`, avec les colonnes date, canal, envoyeur, prospect, **froid ou chaud**, source du fait (URL et date), variante (A ou B), maquette (minutes de fabrication), envoyé, réponse, oui, appel, vente, STOP ;
- `affirmations-permises.md`, la liste fermée :
  - 300 €, une fois, TVA non applicable ;
  - en ligne sous 48 h ouvrées après validation par Presti ; sur votre domaine dès que ses DNS sont posés ;
  - formules 29, 59 et 99 € par mois ;
  - la réponse est prête en moins d'une minute : Presti la prépare, vous l'envoyez ; avec Studio ou Signature, l'assistant peut répondre seul ;
  - un accusé de réception part par e-mail quand le client laisse son adresse ;
  - le domaine est à votre nom, et vous le réservez vous-même avec notre guide (D9) ;
  - « site maintenu 12 mois » : **retiré** tant que le retrait et l'envoi du dossier n'existent pas (D15) ;
- `modeles-messages.md` ;
- `lot-AAAA-MM-JJ.md` ;
- `maquettes/<clé>/` : `maquette.json`, la sortie et les deux captures, jamais dans le dépôt.

**Les deux variantes de message**, chacune avec un fait sourcé, sans lien ni prix, signée « Benjamin, Presti » :
- **A** (seulement après le PASS de 025-02) : « Bonjour, j'ai vu <fait sourcé>. J'ai préparé une maquette de la page d'accueil d'un site à votre nom (<métier> à <ville>), privée : rien n'est publié. Je vous l'envoie ? Pas intéressé ? Répondez « non », je ne reviendrai pas. »
- **B** : « Bonjour, j'ai vu <fait sourcé>. Je peux vous préparer gratuitement une maquette de la page d'accueil d'un site à votre nom, privée. Ça vous intéresse ? Pas intéressé ? Répondez « non », je ne reviendrai pas. »

**La liste d'opposition** part des deux fichiers « déjà contactés ». Claude Code la vérifie avant chaque lot, et `prospects-hors-depot.mjs` vérifie avant chaque push qu'aucun nom de prospect n'est entré dans le dépôt.

### 3.2 Phase 2 : le schéma `ops` dans Supabase (migration 0094, essayée à sec)

- **Accès.**
  - Le schéma `ops` n'est pas exposé à l'API publique, et la sécurité par ligne est fermée à tous.
  - **Il n'est joignable que par des fonctions `SECURITY DEFINER` du schéma `public`**, exécutables par `service_role` seulement : `revoke` à `public`, `anon` et `authenticated`, `grant` à `service_role`, sur le modèle de `artisan_par_ancien_slug` (`0051_slug_modifiable.sql:33-42`). Sans ça, PostgREST ne le servirait pas, et la connexion directe est refusée depuis le 14/09 (mémoire `essai-a-sec-migration`) [déduit]. L'autre voie, exposer `ops` dans les réglages de l'API avec des droits réservés à `service_role`, demande un réglage du tableau de bord.
  - Tout passe par `/api/agents/*`, avec **un jeton par agent** : haché en base, limité à ses types de tâches et à ses tables, et limité en débit (`consommerLimite`).
  - Chaque écriture est journalisée : « une écriture qui ne peut pas être journalisée n'a pas lieu » (`lib/direction/journal.ts:7-9`).

| Table | Contenu clé | Qui écrit |
|---|---|---|
| `ops.taches` | `type`, `cle_idempotence` UNIQUE, `capacite`, `statut` (file, bail, faite, echec, a_decider, annulee), `bail_jusqua`, `tentatives` (3 au plus), `origine_id`, `profondeur` (3 au plus, contrainte `check`), `charge`, `preuve_url` | Les agents, pour les types qui leur sont permis ; A0 affecte |
| `ops.evenements` | Ajout seul : agent, type, objet, résumé en français de 200 signes au plus | Tous |
| `ops.decisions` | Question, contexte, 2 ou 3 options dont une recommandée, option par défaut sans risque, montant, portée de reconfirmation, échéance, choix, auteur | Les agents créent ; **seuls Benj ou son délégué tranchent** |
| `ops.prospects` | `cle_dedup` UNIQUE (SIREN, sinon domaine, sinon Page Meta, sinon Instagram), faits avec leurs preuves, score, statut, froid ou chaud, `dernier_contact` | A7, A8 ; J1 fait passer à `verifie` |
| `ops.envois` | Canal, envoyeur, empreinte du texte, modèle, statut, jeton de réservation | A1 prépare ; un humain ou le Facteur envoie |
| `ops.opposition` | Adresse, domaine ou identifiant, motif, date | A3, Benj |
| `ops.maquettes` | Prospect, chemin dans le stockage, jeton, `expire_le` (21 j) | A2 ; purge par A0 |
| `ops.quotas_canaux`, `ops.agents`, `ops.couts` | Plafonds ; battements et disjoncteurs ; coûts | Benj ; chaque agent ; A5 |

**Des déclencheurs SQL font respecter la loi et les plateformes même si le code se trompe.** Ils refusent le passage d'un envoi à `approuve` quand :
- le destinataire est en opposition ;
- son dernier contact date de moins de 90 jours, hors réponse dans un fil ouvert ;
- le compteur du jour du canal ou de l'envoyeur est plein.

### 3.3 Comment un agent confie une tâche à un autre

1. Il insère une tâche d'un type qui lui est permis, avec une clé d'idempotence (par exemple `maquette:siren:123456789`), `origine_id` et une profondeur augmentée de 1.
2. A0 l'affecte à l'agent disponible qui a la capacité. Le bail dure 30 min.
3. Un bail expiré remet la tâche en file et compte une tentative. Après 3 tentatives, elle devient une décision.
4. Le verdict vient toujours d'un juge extérieur à l'agent. Une preuve de 0 octet est un refus.

### 3.4 Éviter les doublons et les boucles

- La clé d'idempotence est unique, avec une seule tâche ouverte par objet.
- Les prospects sont dédoublonnés de façon hiérarchique.
- Profondeur de 3 au plus, 5 sous-tâches au plus.
- Un agent ne réagit jamais à ses propres événements.
- Quota quotidien de créations par agent.
- Disjoncteur : 3 échecs en une heure mettent l'agent en pause et ouvrent une décision.
- La même erreur deux fois de suite arrête la chaîne.
- Au plus 3 messages sortants par prospect, avec 72 h au moins entre deux.

### 3.5 Le bus du code : l'orchestre

- **Versionner `.orchestre/`**, sauf `travail/`, `scratch/` et les médias de `preuves/`, pour que les routines le voient au clonage (§6.1).
- **Dans `Documents/orchestre`, puis `maj`**, jamais à la main dans la copie de Presti (mémoire `orchestre-autonome`) :
  - l'expiration des verrous : un verrou de plus de 2 × `maxMinutes` est repris par `prochaine`. Aujourd'hui, `orchestre.mjs:256` écrit l'heure mais ne la compare jamais ;
  - le réaiguillage sur quota : `executant.mjs:131-135` détecte le quota épuisé, mais laisse la tâche bloquée ;
  - le retrait de `gemini-cli` et `qwen`, qui ne sont ni connectés ni installés.
- **Mais `maj` ne recopie pas les exécutants.** Il ne recopie que `orchestre.mjs`, `preuves.mjs`, les crochets et les juges (`Documents/orchestre/bin/orchestre.mjs:826-835`), et `executant.mjs` comme `antigravity.mjs` n'existent que dans presti. La fiche de l'orchestre commence donc par déplacer ces deux scripts dans la source, ajouter leur recopie à `maj` et leur preuve à `test/preuve.mjs`. Avant cela, la modification du 24/09 de `executant.mjs` (`gpt-6-sol`, `gpt-6-luna`) est sauvegardée (§6.1). La copie de `orchestre.mjs` dans presti n'a de retard que sur la ligne 51 : un `maj` après la sauvegarde la remet à niveau.
- **Jamais un juge dans le périmètre de l'exécutant qu'il juge.** Claude Code les écrit ; un autre exécutant les contre-vérifie par mutations.
- **En phase 2**, un script local `pont-orchestre.mjs` transforme les tâches `ops` de type `code` approuvées en fichiers `.orchestre/file/*.md`, et renvoie les verdicts en événements.

### 3.6 La mémoire partagée

| Horizon | Où | Règle |
|---|---|---|
| Court terme | Tables `ops` | L'état fait foi |
| Moyen terme | `docs/agents/*.md` dans le dépôt : modèles de messages approuvés et leur empreinte, affirmations permises, règles des juges, `lecons.md` (200 lignes au plus) | Changés par une PR fusionnée par Benj ; **aucune donnée de prospect** |
| Long terme | Vault `SaaS/` | Local ; recopié par une séance Claude Code (skill `vault-organizer`) |

**Un message d'un agent n'est jamais une consigne.** Le destinataire lit des champs typés, et un texte libre passe au modèle emballé comme une donnée (sur le modèle de `blocProspect`, `lib/ai.ts:430`).

---

## 4. Les décisions de Benj et le tableau de bord Pilotage

### 4.1 Phase 1

- **Les décisions** se prennent dans la séance Claude Code et dans le Poste existant : onglet Sites pour « Mettre en ligne », Aujourd'hui pour l'argent.
- **L'état des tâches de code** est dans `.orchestre/digest.md`.
- **Le suivi commercial** est dans `phase0/suivi.csv`.

### 4.2 Phase 2 : l'onglet « Pilotage », en premier dans `/controle`

Le Poste a déjà les briques utiles :
- l'accès réservé au fondateur ;
- la reconfirmation par portée : un jeton de 300 s, à usage unique (`lib/direction/reconfirmation.ts:7-13`) ;
- le journal ;
- la file « À faire » typée (`api/controle/a-faire/route.ts:21-22`), étendue à `decision | envoi | commande | appel`.

**Ce qu'affiche l'onglet, de haut en bas, pensé pour le téléphone :**
1. **Argent** : encaissé aujourd'hui, sur 7 jours et sur le mois ; abonnement mensuel récurrent ; sites et packs vendus ; dépenses du mois face à leur plafond ; marge ; cumul face au seuil de TVA. Chaque chiffre porte sa source et sa fraîcheur (`lib/direction/fraicheur.ts`), et **se calcule par la même fonction que l'onglet Comptabilité ou Aujourd'hui** (`lib/direction/stripe.ts`, `app/controle/Comptabilite.tsx`).
2. **À décider** : 5 cartes au plus, triées par euros en jeu puis par échéance. Chacune a 2 ou 3 boutons et affiche « Par défaut dans 24 h : … ».
3. **À appeler** : nom, bouton `tel:`, deux lignes de contexte, la source.
4. **Lot du jour** : « Copier », « Ouvrir le profil », « Envoyé » ou « Sauter », avec le compteur face au plafond.
5. **Entonnoir** sur 7 et 30 jours, contacts froids seulement : taux mesurés face aux hypothèses du §1.2.
6. **Agents** : une ligne par agent, avec le dernier battement, le statut, le coût et un bouton Pause.
7. **Code** : les tâches de l'orchestre et les PR qui attendent.

### 4.3 Valider en un geste

- **Une décision sans enjeu** se tranche d'un appui.
- **Une décision à enjeu** demande le mot de passe. Aujourd'hui, **un jeton sert une seule fois, 5 minutes, pour une seule portée** (`lib/direction/reconfirmation.ts:7`, `consommer()` à `:30-35`). Deux voies (D10) :
  - un mot de passe par décision à enjeu, et ce temps compte dans le temps de Benj (recommandé en phase 2) ;
  - ou une fiche dédiée, réservée à Claude Code : un jeton « séance de décision » valable pour N décisions et 300 s, avec une revue de sécurité.

  Portées concernées :
  - `argent` ;
  - `artisan` : mettre en ligne, écrire à un client ;
  - `securite` : pause, clés.
- **L'option par défaut à l'échéance est toujours la plus prudente** : ne rien envoyer, ne rien dépenser, reporter.
- **Pour que le système ne s'arrête pas quand Benj est absent** (faille 7 du juge 1) :
  - **Délégation** (D14) : **impossible avec le code actuel.** Le rôle `partenaire` est ramené à la lecture (`lib/direction/garde.ts:59-60`) et la garde exige `is_founder` (`:51`). Il faut la fiche 025-08, réservée à Claude Code parce qu'elle touche aux droits : un rôle d'entreprise `delegue` limité à deux écritures, approuver un lot et valider un site, avec sa propre reconfirmation et chaque geste journalisé. Préalable : le statut de Gabriel (D1). La validation humaine des CGU 3 bis n'exige pas Benj en personne.
  - **Auto-approbation bornée** (`operator-approval-loop`) : un modèle de message devient automatique pour 7 jours après 20 approbations manuelles sans retouche. L'approbation manuelle revient d'elle-même à la première plainte, au-delà de 3 % de rebonds ou au-delà de 5 % de STOP. Un envoi sur dix reste tiré au hasard pour relecture.
  - Les commandes déjà payées continuent d'avancer jusqu'à la validation.

### 4.4 Notifications

- **Deux par jour** : un digest à 7 h 30 et un autre à 18 h 30. C'est le motif `digest` de `lib/alertes.ts:271-300`, aujourd'hui hebdomadaire, rendu biquotidien et enrichi. Il part par Resend à Benj lui-même, comme e-mail de service. Ses liens ne portent que l'identifiant : `/controle?onglet=pilotage&decision=<id>`, jamais de donnée personnelle dans l'adresse.
- **Web Push étendu aux fondateurs.** `lib/push.ts` n'écrit aujourd'hui qu'aux artisans. Benj installe l'application web du Poste une fois.
- **Immédiat seulement pour** : un paiement reçu, un client qui demande un appel, un agent en panne depuis plus de 2 h.

---

## 5. Les garde-fous

### 5.1 L'argent

- **Aucun agent n'a de moyen de payer.**
  - Jamais le connecteur Vercel dans une routine : il a `buy_domain`, `buy_credits` et `buy_pro`.
  - Jamais `create_project` ni `confirm_cost` de Supabase.
  - Jamais de clé Stripe en écriture pour un agent.
  - Toute dépense nouvelle est une décision reconfirmée.
- **Les plafonds sont posés chez le fournisseur**, pas dans une consigne :
  - clé Anthropic « agents » : 30 $/mois, alertes à 50 % et 80 % ; (annulé : plafond de 0 € par agent, migration 0105 et organigramme du 27/09 ; aucun achat)
  - Alexya : formule fixe, sans recharge automatique ;
  - Apify : non utilisé, plafonné à 10 $ s'il sert un jour.
- **Coupe-circuit** : au-delà de 150 € de coûts dans le mois sans aucune recette, A0 met tout en pause sauf la livraison et le support, et ouvre une décision.
- **TVA** : A5 lit le cumul que suit déjà l'onglet Comptabilité (`app/controle/Comptabilite.tsx:114-138`) [seuil 2026 à vérifier sur impots.gouv.fr]. Les trois changements du jour du dépassement sont décrits dans la mémoire `presti-facturation-tva`.

### 5.2 Les comptes : volumes par jour, appliqués par le serveur en phase 2

**Chaque envoyeur sur son propre compte (D2).** Les plafonds par envoyeur ci-dessous le supposent. Tant que Gabriel travaille sur le compte de Benj (`Journal-Decisions.md:166-172`), ses envois comptent dans le plafond de Benj, et le partage de compte reste contraire aux conditions de Meta.

| Canal | Plafond | Raison |
|---|---|---|
| Instagram @prestiapp | **3 ou 4 messages, à la main**, tant que le compte n'a pas de publications régulières ; ensuite 10 au plus. Pas de lien dans le premier message. 7 jours d'arrêt au premier « action bloquée » | Freiné vers 6 messages le 09/09 ; 12 contactés, 0 réponse, 1 compte qui nous a bloqués (`Lot-20x20-2026-09-14.md`) |
| Facebook, profil personnel de l'envoyeur | 5 messages au plus, à la main, seulement à des membres actifs d'un groupe | La Page ne peut pas écrire la première, et le profil qui l'administre l'emporterait dans sa chute ; Gabriel en « Modérateur » de la Page depuis son propre compte |
| LinkedIn (Louis-Victor, sur son propre compte) | 10 à 15 invitations, sans outil | Automatisation interdite ; 4 affirmations fausses le 09/09, parties du compte de Benj : liste permise obligatoire |
| Instagram du Studio e-commerce | Compte distinct de @prestiapp, mêmes plafonds | La réputation du démarchage des marques ne doit pas toucher Presti |
| Gmail personnel, Resend | **0 e-mail à froid** | Politiques Gmail et Resend ; ce Gmail porte Stripe et Supabase |
| E-mail à froid en volume | **0 jusqu'à la décision du jalon** (D19) | Workspace interdit « les e-mails en masse non sollicités » [prouvé] ; fournisseur conforme à choisir [à vérifier] |
| Publora | 15 posts par mois, 3 programmés à la fois | Formule Starter |
| API de la bibliothèque Meta | 150 appels/h | Marge sous les ~200 |
| Sites d'artisans lus | 1 requête/s, `robots.txt` respecté, robot identifié | Bonne foi |

### 5.3 Le droit (lectures à faire valider, pas un avis juridique)

- **Statut de l'équipe.** Quelqu'un qui prospecte régulièrement pour Presti et fait entrer du chiffre sans statut, sans facture et sans déclaration, c'est le risque de travail dissimulé, à la charge de Benj (`Journal-Decisions.md:161-165`). Avant que Gabriel ou Louis-Victor n'envoie un message : un statut (micro-entreprise) et un contrat écrit, facturé, pour chacun (D1) [à vérifier avec un comptable].
- **Photos du prospect.** Avant son « oui », la maquette n'utilise **que les photos d'illustration du métier**, sous licence et créditées (025-02). Ses propres photos n'y entrent qu'après son accord, ce qui écarte le risque lié à l'article L122-4 du CPI (juge 1, faille 8). C'est un arbitrage de Benj (D7). **La même règle vaut pour les photos produit d'une marque** (test D) : pas d'échantillon avec ses photos avant son accord.
- **Voix de l'artisan.** Jamais inventée : aucune citation, aucun chiffre, aucun parcours dans une maquette. Le générateur exige ces champs pour un vrai site : le dossier les demande (025-09) ; à défaut, un appel de 15 min.
- **Un moyen de refuser dans chaque message.** La définition du courrier électronique de la LCEN (art. 1) semble couvrir les messages privés ; l'article L34-5 du CPCE s'appliquerait donc [lecture à faire valider]. Les variantes A et B portent : « Pas intéressé ? Répondez « non », je ne reviendrai pas », et la source du fait.
- **Prospection B2B par e-mail**, selon la CNIL (10/06/2026) :
  - un message en rapport avec la profession ;
  - l'identité de l'expéditeur et la source de l'adresse ;
  - un refus simple, par « STOP » ;
  - un lien vers `/confidentialite`, qui gagne une section « prospection » ;
  - des adresses génériques seulement ;
  - une purge 3 ans après le dernier contact [à vérifier] ;
  - aucun pixel de suivi.
- **Données SIRENE** (A8) : écarter les unités en diffusion partielle et celles qui se sont opposées à la prospection [à vérifier].
- **Pubs :**
  - aucun faux témoignage ni faux consommateur (L121-4) ;
  - la mention « générée par IA » ou « images virtuelles » dès qu'un humain est généré (AI Act art. 50, applicable depuis le 02/08/2026 ; loi 2023-451 art. 5, par prudence) ;
  - aucun visage réel (Code civil, art. 9) ;
  - la marque d'un tiers seulement dans un échantillon privé (CPI L713-2) ;
  - la réponse écrite d'Alexya sur « unauthorised advertising » avant d'acheter ;
  - les conditions d'ElevenLabs lues sur le même point.
- **Meta** : les pubs de travaux relèvent-elles de la catégorie spéciale « Logement » ? [à vérifier] Cela change le ciblage du pack C.
- **Contrats et factures** : une section 3 ter des CGU pour le pack C ; des CGV B2B à part pour le Studio ; **une consultation d'une heure avant le premier échantillon du test D, pas après** ; une facture Stripe pour chaque pack.

### 5.4 La qualité

- **Chaque sortie passe par un juge écrit avant la fabrication, par Claude Code** (série 025 : 025-01 écrit les juges, les exécutants n'y touchent pas ; 025-10 les contre-vérifie par mutations).
- **Le juge capture lui-même, et une preuve de 0 octet est un refus** (mémoires `juge-capture-lui-meme` et `preuve-vide-est-un-mensonge`).
- **Humain au départ, échantillonnage ensuite** : 20 approbations manuelles par nouveau type, puis une auto-approbation bornée, avec un envoi sur dix relu en permanence.
- **Code :**
  - `main` est protégée (GitHub Pro si nécessaire [à vérifier]) ;
  - pour `supabase/**`, `lib/plans.ts`, `lib/stripe*`, le webhook, `middleware.ts`, `lib/ai.ts`, `/api/agents/**` et `vercel.json` : en phase 1, Claude Code montre le diff à Benj et attend son accord avant de pousser ; à partir de la phase 2, c'est une PR que Benj fusionne ;
  - avant chaque push : `npm run build` et `prospects-hors-depot.mjs` ; après chaque push : `node scripts/deploiement-etat.mjs` (37 déploiements en ERROR sont passés inaperçus les 13 et 14/09).

### 5.5 Les secrets

- **Aucun agent ne lit** `.env.local` ni `presti-secrets`. Le crochet `read-garde` de l'orchestre et les interdits de `settings.json` l'imposent. Un script peut charger `.env.local` lui-même sans l'afficher, comme `scripts/site-deposer.mjs`.
- **Les nouveaux secrets** vont dans les variables de Vercel, les secrets GitHub ou les « API credentials » des routines, jamais dans une fiche, le vault ou une consigne :
  - jetons d'agents (hachés en base) ;
  - clé « agents » ;
  - clé Stripe restreinte en lecture ;
  - jeton `ads_archive`.
- **Avant la sauvegarde** : scan des secrets et des données personnelles.

### 5.6 L'injection de prompt et les outils trop permissifs

- **Le contenu non fiable** (pages, annonces, réponses, pièces jointes) est lu sans outil, emballé comme une donnée et rendu en schéma strict. Une réponse qui demande de payer, de changer de coordonnées ou d'écrire ailleurs va chez Benj.
- **Les moteurs locaux tournent aujourd'hui sans garde-fou :**
  - Claude en `bypassPermissions` avec une liste `deny` vide ;
  - Codex en `danger-full-access` ;
  - Antigravity en `EAGER` avec un terminal hors bac à sable. C'est lui qui a lancé le `git restore` du 13/09.
- **À J+1 (D3)**, cinq réglages :
  - interdire `git restore`, `git checkout --`, `git reset --hard`, `git clean -f`, `git push --force` et `rm -rf` **dans l'outil Bash et dans l'outil PowerShell**, où s'ajoute `Remove-Item -Recurse -Force` ;
  - refuser les outils d'achat et de suppression des connecteurs : Vercel `buy_*` ; Supabase `create_project`, `confirm_cost` ; ElevenLabs `agents_delete` et la gestion des numéros ;
  - passer Codex en `workspace-write` ;
  - ajouter un crochet `git-garde` dans `Documents/orchestre/hooks`, recopié par `maj` ;
  - **un instantané avant chaque lancement d'Antigravity**, que ces interdits ne couvrent pas : `scripts/antigravity.mjs` fait un index temporaire, `git add -A`, `git write-tree`, `git commit-tree`, et range le commit sous une référence locale `refs/instantanes/ag-<horodatage>`, sans push. Il ne touche ni `main` ni l'arbre de travail, et il couvre aussi les fichiers non suivis.

### 5.7 L'arrêt d'urgence

Un interrupteur `ops.pause_generale` (phase 2) coupe tout ce qui sort : envois, publications, mises en ligne. Il se commande depuis le Poste, sous reconfirmation `securite`, ou par une variable de Vercel si le Poste est en panne. Les commandes déjà payées continuent à la main.

---

## 6. Le plan de construction

Qui fait quoi, d'après les verdicts du 13 au 16/09 et la règle 1 de `CLAUDE.md:23` :
- **Codex** : scripts, routes, générateur, contenus, mutations. Médiane de 7 min jusqu'au PASS, 85 % de PASS au final.
- **Antigravity en Flash** : interface et textes. Médiane de 38 min, 93 % de PASS au final.
- **Claude Code**, la ressource la plus rare : **les juges, les migrations, le code de l'argent, les droits**, les essais à sec, les maquettes et les sites de la phase 1, la relecture.

### 6.1 J+1 (vendredi 25/09) : stopper les fuites, lancer la phase 1

| # | Livrable | Qui | C'est fini quand |
|---|---|---|---|
| 1 | **Sauvegarde, sans toucher à `main` ni à l'arbre de travail.** Scan des secrets (motifs de clés Stripe, Supabase, Resend, Anthropic, clés privées) et des données personnelles sur l'instantané. Instantané : un index temporaire (`GIT_INDEX_FILE`), `git add -A`, qui respecte `.gitignore` et donc écarte `.env.local`, en excluant `*.exe` ; puis `git write-tree` et `git commit-tree -p HEAD`. Push de ce seul commit vers un **dépôt GitHub privé à part, non relié à Vercel** (D4). En attendant ce dépôt, un `git bundle` du commit est rangé hors du dépôt. L'instantané contient la modification du 24/09 de `executant.mjs` et les diffs des juges 023 | Benj crée le dépôt (2 min) ; Claude Code fait le reste après son accord | le scan ne trouve rien ; `git ls-remote <dépôt de sauvegarde>` montre le commit ; `git rev-parse main` et `git status --porcelain` sont inchangés |
| 2 | `.gitignore` complété (`*.exe`, `.orchestre/scratch/`, les médias de `.orchestre/preuves/`). Il part avec le premier push de la série 025, jamais avec les 2 589 fichiers non suivis | Claude Code | `git status --porcelain` ne liste plus `ChromeSetup.exe` ; aucun fichier de `public/` ajouté sans décision |
| 3 | **Les juges d'abord : 025-01**, écrite et jugée par Claude Code avant tout dépôt dans `file/`. 023-03 libérée, son verrou levé, et rangée à la main en refusée (dernier verdict FAIL, hors du chemin de l'argent). Décision D5 appliquée à 023-01 et 023-02 | Claude Code | `node scripts/juges-025-preuve.mjs` vert ; `.orchestre/en-cours/` ne contient plus 023-03 |
| 4 | Garde-fous locaux (D3) ; Vercel Pro ; Ghost Towns désactivée ; consigne Codex du 15/09 marquée « CLOS — ne pas exécuter » en tête des §4 et §5 (D6) | Benj (§7) | la facture Vercel Pro est visible ; `list_scheduled_tasks` ne montre plus Ghost Towns active ; `Prompt-Codex-2026-09-15.md` porte les deux mentions |
| 5 | **Statut de l'équipe (D1) et comptes séparés (D2)** | Benj | décision écrite dans Journal-Decisions ; tant qu'elle n'est pas prise, seul Benj envoie |
| 6 | **Base chaude qualifiée**, avant d'être comptée. Claude Code lit, en lecture seule et avec l'accord de Benj : qui est l'abonné payant, qui sont les 3 essais et les titulaires des 5 sites. **Il écarte les comptes `est_demo`**, qui sont internes (`CLAUDE.md:221-227`), et marque les proches. Benj appelle Richard (On Off Solutions, silencieux depuis le 10/09) et ouvre la réponse de franck.papot, probablement automatique | Claude Code + Benj | une liste de 0 à 5 vrais contacts, chacun avec un fait vérifiable ; les autres écartés par écrit ; tous marqués « chaud, hors mesure » |
| 7 | Kit de la preuve à la main (`SaaS/Prospection/phase0/`, §3.1) : suivi avec la colonne froid ou chaud, affirmations permises corrigées, variantes A et B avec la phrase de refus. **Seule B part avant le PASS de 025-02** | Claude Code | fichiers présents ; opposition chargée ; modèles relus par Benj |
| 8 | @prestiapp prêt : 3 publications réelles, lien de bio `prestiapp.fr/a/instagram` posé depuis le téléphone (la migration `0087_NU` doit être collée pour que ce lien compte) | Benj, ou Gabriel si D1 et D2 | profil vérifié sans session |

**Argent attendu à J+1 : 0 €.**

### 6.2 J+7 (jeudi 01/10) : le site est vendable, la mesure tourne

Ordre de dépôt, deux exécutants au plus : Antigravity enchaîne 025-02, 025-05, 025-06 et 025-09 ; Codex enchaîne 025-03 (après 025-02), 025-11 et 025-10. Si Codex attend, Claude Code peut lui confier 025-09 en changeant `executant`. Claude Code mène 025-04 et 025-07 en parallèle.

| # | Livrable | Qui | C'est fini quand |
|---|---|---|---|
| 1 | 025-01 PASS (J+1 ou J+2), relue à froid | Claude Code | `echecs-attendus.md` non vide ; chaque juge échoue sur la référence et passe sur son témoin |
| 2 | 025-02 PASS : mode maquette, capture, modèle menuisier. Première maquette réelle, dont on mesure le temps. **La variante A peut partir à partir d'ici** | Antigravity ; Claude Code | `maquette-qa` vert ; temps par maquette noté dans `suivi.csv` (seuil d'alerte : 30 min) ; Benj a regardé les 3 captures témoins prises par le juge |
| 3 | 025-11 PASS : modèles plombier, électricien, couvreur | Codex | `maquette-qa --metier=plombier,electricien,couvreur` vert |
| 4 | 025-03 PASS : `--source`, formulaire branché sur `/api/leads`, repli, ancien slug. Poussé, déployé, puis testé en réel par `--reel` | Codex ; push et `--reel` par Claude Code | `formulaire-site-qa` vert ; `deploiement-etat.mjs` à READY ; `--reel` vert, ménage fait dans le `finally`, `zero-demo-e2e.mjs` vert |
| 5 | 025-05 PASS, poussé, déployé ; **puis** 025-04 : essai à sec → Benj colle 0093 → contrôle | Antigravity ; Claude Code (migration, essai à sec : `DO` + `EXECUTE` du jumeau nu + `raise exception`, mémoire `essai-a-sec-migration`) ; Benj | `supabase/controles/0093_site_fige.sql` rend « oui » partout ; `verrou-site-qa --reel` : un compte d'essai qui modifie `site_active` le retrouve inchangé ; `fermeture-e2e.mjs` vert |
| 6 | 025-06 (après 025-05), 025-07 et 025-09 PASS, relues, poussées et déployées | Antigravity, Claude Code, Antigravity | les trois juges verts ; déploiement à READY ; `lib/plans.ts` et le webhook : accord de Benj avant le push |
| 7 | 025-10 PASS : chaque juge a échoué sur une vraie faute | Codex | `mutations.md` non vide ; si une mutation passe, la fiche concernée est rouverte et son push réexaminé |
| 8 | `siteCommandeVente` levé (D8) | Benj décide ; Claude Code exécute | le bloc de vente et « Commander mon site » apparaissent ; `fermeture-e2e.mjs` vert |
| 9 | Mesure en cours | Benj ; Gabriel et Louis-Victor si D1 et D2 | au moins 25 contacts froids (15 si Benj envoie seul) et au moins 8 maquettes dans `suivi.csv`, 0 blocage de compte |

**Argent attendu à J+7 : hypothèse centrale 0 € ; 300 € seulement si Richard achète.**

### 6.3 J+14 (jeudi 08/10) : le jalon

| Livrable | Qui | C'est fini quand |
|---|---|---|
| Bilan de la mesure, **contacts froids seulement** : contacts, « oui », taux par variante A ou B et par canal, minutes par maquette, ventes ; la base chaude à part | Claude Code | tableau daté dans le vault |
| Décision GO, GO partiel ou NON (§1.2). Moins de 60 contacts froids : prolongation jusqu'au 15/10 au plus tard | Benj, 15 min | décision écrite dans Journal-Decisions |
| Canal e-mail à froid : oui ou non, et quel fournisseur (D19) | Benj | décision écrite |
| Test D, **seulement si la note du juriste est reçue** (D12) : 5 échantillons e-commerce envoyés à la main, avec permission préalable pour les photos, depuis le compte Instagram du Studio. Sinon, le test D part après le jalon | Claude Code (séance supervisée) + Benj | note du juriste datée ; réponse d'Alexya ou conditions d'ElevenLabs lues avant le premier ; 0 faux témoignage |
| Consommation réelle des minutes GitHub Actions et du stockage Supabase | Benj (2 min) | chiffres notés |
| À chaque vente : export de la commande, `contenu.json` v2, `generer --source`, `site-qa`, `site-deposer`, « Mettre en ligne », Search Console, guide DNS | Claude Code ; Benj pour les deux gestes | site en ligne ; formulaire → une demande de test arrive, puis elle est effacée |

**Argent attendu à J+14 : 0 à 600 € ; 0 à 300 € si Benj envoie seul.**

### 6.4 J+30 (vendredi 23/10) : phase 2, seulement si GO

| Livrable | Qui | C'est fini quand |
|---|---|---|
| **Bus v1 :** migration 0094 `ops` (§3.2), accès par fonctions `SECURITY DEFINER` réservées à `service_role`, `/api/agents/*` à jetons, déclencheurs d'opposition, de quotas et des 90 jours | Claude Code (schéma, essai à sec) ; Codex (routes) | e2e : un jeton d'agent crée une décision mais ne la tranche pas ; le 5e message Instagram du jour est refusé par la base ; un bail expiré revient en file ; `anon` et `authenticated` n'exécutent aucune fonction `ops` |
| **A0 :** la ronde de `lib/alertes.ts` passée à `*/5`, avec les motifs agent muet, bail expiré, jeton Meta à J-7 et stockage ; digest biquotidien | Codex ; Claude Code relit | `passages_cron` montre 24 h de battements ; un agent fictif muet crée une ligne « Attention » |
| **Onglet Pilotage v1** et Web Push pour les fondateurs | Antigravity (écran) ; Codex (routes) | « Encaissé ce mois » égal à Stripe au centime, calculé par la même fonction que l'onglet Aujourd'hui ; une décision tranchée à 390 px, capture prise par le juge |
| **025-08, rôle `delegue`**, si D1 est réglé et D14 choisie | Claude Code | Gabriel approuve un lot et valide un site de test, avec reconfirmation ; il ne peut rien faire d'autre ; chaque geste est journalisé |
| **Achat public sans compte :** Checkout `commande_site`, compte artisan créé par `auth.admin.generateLink`, lien envoyé par Resend (`lib/email.ts`), et non par l'envoi par défaut de Supabase, très limité [à vérifier]. **Pas** sur le modèle de `lib/clientAuth.ts`, qui gère les clients d'un artisan (`:5-10`) | Claude Code (argent) ; Codex (écran) | e2e en mode test Stripe [à vérifier : clés de test] : un visiteur anonyme paie, reçoit le lien et arrive sur son dossier |
| **Convertisseur commande → site**, puis livraison. Une fonction nouvelle au schéma v2 rédige les textes, contrôlée par `findFabrications` et `lib/ai/antiFabrication.ts`. La voix de l'artisan est tirée du dossier, jamais inventée. 3 e-mails à l'artisan ; guide DNS ; commande payée dans « À faire » ; matière visible dans le Poste (`api/controle/sites/route.ts` ne lit pas `matiere`) | Claude Code (consignes du rédacteur) ; Codex + Antigravity | une commande de test va de `payee` à `en_ligne` avec un seul geste humain ; `site-qa` vert ; formulaire → `leads` |
| **Lien privé de maquette** : table `ops.maquettes` avec `expire_le` à 21 j ; une seule capture de moins de 1 Mo en ligne ; purge par A0 | Claude Code (schéma) ; Codex | un lien expiré répond 404 ; le stockage reste sous 60 % |
| **Retrait du site 12 mois après la suppression du compte, et envoi du dossier** (D15) | Claude Code ; Codex | e2e sur un compte d'essai daté de 12 mois : site retiré, dossier envoyé à l'adresse gardée pour cela |
| **A1 Rédacteur**, juge J3 et juge de promesse | Claude Code (consignes) ; Codex | 20 cartes : 100 % des faits retrouvés mot pour mot, 0 affirmation hors liste |
| **A3 Standardiste** (formulaire entrant et fils qui répondent à `ops.envois`) et **A5 Trésorier** | Codex ; Claude Code relit | un STOP de test entre dans l'opposition en moins de 10 min ; un courrier hors fil n'est jamais lu ; tuile Argent égale à Stripe |
| **Landing v2** avec le message gagnant, et « Recevoir ma maquette » | Antigravity ; Claude Code relit | `promesses-qa` et `grille-qa` verts ; une demande entrante crée un prospect `entrant` |
| **Pack C** (A6), prix à 149 €, branche `pack_pub` du webhook, facture Stripe, CGU 3 ter | Antigravity (gabarit) ; Claude Code (webhook) ; Benj valide les CGU | `video-qa` vert sur 3 jeux de photos ; manifeste des entrées vérifié ; 0 visage détecté ; mention « voix de synthèse » présente ; une facture émise |
| **Orchestre** : `executant.mjs` et `antigravity.mjs` déplacés dans la source et recopiés par `maj` ; baux qui expirent ; réaiguillage sur quota ; exécutants fantômes retirés ; crochet `git-garde` | Codex, dans `Documents/orchestre`, puis `maj` | `test/preuve.mjs` : un verrou vieilli est repris ; un quota simulé fait passer la tâche à un autre exécutant ; `maj` recopie les deux scripts |

**Argent attendu à J+30 : hypothèse centrale 300 à 900 € cumulés ; fourchette de 0 à 1 500 €.**

### 6.5 Après J+30 : phase 3, visée vers J+60

- A7 Vigie Meta, A8 Recenseur et J1.
- A9 Studio e-commerce avec J2, derrière la note du juriste.
- A10, A11 et A12 en routines sans connecteur, avec `prestiapp.fr` permis dans leur environnement [à vérifier].
- **Génération et dépôt des sites dans GitHub Actions**, avec un budget de minutes : c'est ce qui libère la livraison du poste (règle 4).
- Retrait complet du constructeur (temps 2, §1.3) et sort des 5 sites (D16).
- Auto-approbation bornée.
- Canal e-mail, si un fournisseur conforme est retenu.
- A13, seulement si D18 le permet.
- Modification des CGU : validation par échantillonnage après 20 sites sans rejet (décision de Benj).

**L'épreuve du feu**, qui sert de recette du « 24 h/24 » : le PC éteint pendant 72 h, avec un quota Claude épuisé simulé. Il faut :
- un battement de A0 toutes les 5 min ;
- les envois approuvés partis et les STOP traités ;
- une commande de test qui passe à `payee` et apparaît dans « À faire » ; elle n'avance jusqu'à la validation que si la génération dans Actions existe ;
- aucun événement perdu.

### 6.6 La phase 1 en fiches d'orchestre

Les brouillons sont dans `presti/.orchestre/brouillons-ecosysteme/`. Tous passent `node scripts/orchestre.mjs valider`. Claude Code les relit avant de les déposer dans `file/`, un par un, dans l'ordre des dépendances.

| Fiche | Objet | Exécutant | Juge (écrit par Claude Code en 025-01) | Dépend de |
|---|---|---|---|---|
| 025-01 | Les juges, leurs jeux d'essai et la preuve qu'ils échouent sur l'arbre de référence `1620723` | Claude Code | `juges-025-preuve.mjs` | — |
| 025-02 | Mode maquette privée du générateur (hors `public/`), capture, modèle menuisier | Antigravity | `maquette-qa.mjs --metier=menuisier` | 025-01 |
| 025-03 | `--source`, formulaire des vrais sites → `/api/leads`, repli, ancien slug | Codex | `formulaire-site-qa.mjs` (+ `--reel` par Claude Code) | 025-02 (même fichier, l'orchestre les sérialise) |
| 025-04 | Migration 0093 : figer les colonnes du site | Claude Code | `verrou-site-qa.mjs` (+ `--reel` après collage) | 025-01 ; collage après le déploiement de 025-05 |
| 025-05 | Constructeur retiré de « Ma page », `/api/site/generate` en 404, carte de `fermeture-e2e`, aide | Antigravity | `constructeur-ferme-qa.mjs` | 025-01 |
| 025-06 | Promesses de la landing, du manifeste, de la FAQ, du tableau de bord, de la démo et de Studio | Antigravity | `promesses-qa.mjs` | 025-05 |
| 025-07 | Webhook : plus aucun paiement muet | Claude Code | `webhook-muet-qa.mjs` | 025-01 |
| 025-08 | Rôle `delegue` (réservée, phase 2) | Claude Code | à écrire | D1, D14 |
| 025-09 | Étape « Votre parcours » du dossier, domaine au nom de l'artisan | Antigravity | `parcours-commande-qa.mjs` | 025-01 |
| 025-10 | Mutations : chaque juge échoue sur une vraie faute | Codex | `juges-025-mutations.mjs` | 025-02 à 025-07, 025-09, 025-11 |
| 025-11 | Modèles de maquette plombier, électricien, couvreur | Codex | `maquette-qa.mjs --metier=plombier,electricien,couvreur` | 025-02 |

Au plus deux exécutants à la fois. Chaque PASS est poussé par Claude Code après `npm run build` et `prospects-hors-depot.mjs`, et suivi de `deploiement-etat.mjs`.

---

## 7. Ce que Benj fait lui-même

### 7.1 Une fois

| Geste | Pourquoi | Coût | Durée | Quand |
|---|---|---|---|---|
| Régler le statut de Gabriel et de Louis-Victor (D1) ; chacun sur son propre compte, Gabriel « Modérateur » de la Page (D2) | Travail dissimulé à la charge de Benj ; partage de compte contraire aux conditions de Meta | selon le statut [à vérifier avec un comptable] | 30 min | avant tout message envoyé par eux |
| Créer un dépôt GitHub privé pour la sauvegarde, non relié à Vercel (D4) | La sauvegarde ne doit ni toucher `main` ni déployer | 0 [à vérifier] | 2 min | J+1 |
| Passer Vercel en **Pro** | Usage commercial interdit en Hobby ; tâches planifiées à la minute | 20 $/mois | 5 min | J+1 |
| Accepter la sauvegarde | Un `git restore` a effacé 3 jours de travail le 13/09 | 0 | 2 min | J+1 |
| Garde-fous locaux (§5.6, D3) | Trois moteurs sans garde-fou | 0 | 10 min | J+1 |
| Trancher le sort des juges 023 (D5) ; clore la consigne Codex du 15/09 (D6) ; vérifier qu'aucun brouillon de prospection ne reste dans Gmail [à vérifier] | Un juge assoupli sur `main`, une consigne d'e-mail à froid encore active | 0 | 5 min | J+1 |
| Désactiver « Ghost Towns » ; arrêter l'automatisation Codex Publora après le 02/10 | Tâches sans objet ou sans fin | 0 | 5 min | J+1 et 02/10 |
| Vérifier son identité Meta (facebook.com/ID), créer le compte développeur et l'application | Seul lui le peut ; 1 à 2 jours de délai | 0 | 20 min | J+1 (sert en phase 3) |
| Écrire au support d'Alexya (« unauthorised advertising ») | Condition du test D | 0 | 10 min | J+1 |
| Préparer @prestiapp : 3 publications et le lien de bio | Publier avant de démarcher | 0 | 15 min | J+1 ou J+2 |
| Appeler Richard ; ouvrir la réponse de franck.papot ; nommer l'abonné payant | Qualifier la base chaude | 0 | 20 min | J+1 ou J+2 |
| Regarder les 3 captures témoins de 025-02 | Condition de la première maquette réelle | 0 | 5 min | vers J+3 |
| Coller 0093 après l'essai à sec, **après le déploiement de 025-05** | Fermer la porte du site gratuit | 0 | 5 min | vers J+5 |
| Donner son accord sur les diffs de `lib/plans.ts` (025-06) et du webhook (025-07) | Prix et argent | 0 | 5 min | vers J+5 |
| Lire la consommation GitHub Actions et Supabase | Décider l'hébergement des maquettes | 0 | 2 min | avant J+14 |
| Phase 2 (si GO) : espace Anthropic « agents » plafonné ; clé Stripe restreinte en lecture ; application web du Poste sur le téléphone ; CGU 3 ter | Autonomie sans risque | 30 $ de plafond | 30 min | J+14 à J+20 |
| **Avant le premier échantillon du test D** : consultation juridique d'une heure ; activité secondaire à déclarer [à vérifier avec un comptable] ; compte Instagram distinct pour le Studio | Pubs e-commerce | 150 à 300 € [supposé] | 1 h | avant le test D |

### 7.2 Récurrent

- **Chaque jour :** envoyer 3 ou 4 messages Instagram (10 min) ; trancher 0 à 5 décisions ; rappeler les demandes d'appel.
- **À chaque vente :** cliquer « Mettre en ligne » ; soumettre le plan du site à la Search Console (5 min) ; si « Votre parcours » manque, appeler l'artisan (15 min) ; envoyer le guide DNS.
- **Chaque lundi :** 15 min de revue.
- **Tous les 55 jours environ :** régénérer le jeton Meta (10 min), qui dure 60 jours ; A0 prévient à J-7.
- **À chaque migration :** coller le fichier après l'essai à sec (2 min).

**Temps visé :** environ 20 min par jour. 10 min seulement quand Gabriel a un statut, son propre compte et le rôle délégué (D1, D2, D14).

---

## 8. Les indicateurs suivis chaque jour

| Indicateur | Source | Depuis | Seuil d'alerte |
|---|---|---|---|
| Encaissé du jour et du mois (€) | Stripe, Poste « Aujourd'hui » (`lib/direction/stripe.ts`) | J+1 | aucun encaissement 14 jours après un GO → revue |
| Abonnement mensuel récurrent (€) | `mrr()` de Stripe | J+1 | baisse d'une semaine sur l'autre |
| Sites vendus, générés, en attente de validation, en ligne | `sites_commandes.etat` | J+1 | commande payée non générée après 48 h ouvrées |
| Commandes payées sans voix complète | `sites_commandes.matiere` | J+7 | 1 → appel sous 24 h |
| Contacts de permission par canal et par envoyeur, face au plafond, **froids et chauds séparés** | `suivi.csv`, puis `ops.envois` | J+2 | plafond atteint → le canal s'arrête pour la journée |
| Taux de « oui » (cumul et 7 jours), par variante A ou B, contacts froids seulement | idem | J+2 | 0 « oui » sur 30 contacts → changer de message |
| Délai entre un « oui » et l'envoi de la maquette | idem | J+5 | plus de 24 h |
| Minutes de fabrication par maquette | noté par Claude Code | J+5 | plus de 30 min |
| Appels demandés et appels rendus | cartes « À appeler » | J+1 | rappel au-delà de 24 h |
| STOP, oppositions, blocages de compte (Instagram, Facebook) | `suivi.csv`, puis `ops.opposition` | J+2 | 1 blocage → 7 jours d'arrêt du canal |
| Nom de prospect dans un fichier suivi | `prospects-hors-depot.mjs` | J+2 | 1 → aucun push |
| Tâches de l'orchestre : en file, PASS, FAIL, verrous vieux | `.orchestre/digest.md` | J+1 | verrou de plus de 60 min |
| Dernier déploiement de production | `node scripts/deploiement-etat.mjs` | J+1 | ERROR → plus aucune fusion |
| Dépenses du mois face à leur plafond | factures, puis `ops.couts` | J+1 | 80 % d'un plafond |
| Coût IA du produit | ronde `solde_ia` (`lib/alertes.ts`) | existe | solde bas |
| Cumul du chiffre d'affaires face au seuil de franchise | onglet Comptabilité | J+1 | 80 % du seuil |
| Stockage Supabase (1 Go partagé, dépôt de site refusé sous 400 Mo libres) et minutes Actions (/2 000) | tableaux de bord | J+14 | 60 % et 70 % |
| Agents : battement en retard, disjoncteur ouvert | `ops.agents` | phase 2 | retard de plus de 2 cycles |
| Quota hebdomadaire de Claude, que la phase 1 sollicite davantage (juges, migration, webhook, maquettes) | `/usage` | J+1 | plus de 75 % avant jeudi → routines en pause, et les maquettes passent à Codex dans `.orchestre/travail/`, ignoré par git |
| Temps passé par Benj | déclaré | J+1 | plus de 30 min trois jours de suite → revoir la délégation |

---

## 9. Ce que ce plan corrige

### 9.1 Les failles relevées par les juges des trois plans

| Faille relevée par les juges | Correction |
|---|---|
| On construisait le bus et 13 à 15 agents avant toute preuve | Phase 1 à la main, jalon au 08/10 ; bus et agents seulement ensuite, et seulement ce qui a converti |
| Le segment « annonceur sans site » n'est pas joignable automatiquement | C'est assumé : il passe par le lot manuel et l'appel. L'API Meta ne sert qu'en phase 3, pour compter et trier |
| La chauffe d'un domaine est un travail caché, et Workspace interdit l'envoi en masse | Pas d'e-mail à froid en volume ; canal choisi au jalon [à vérifier] |
| Instagram à 10-15 messages par jour, au-dessus de la limite mesurée | 3 ou 4 par jour tant que le compte est vide ; publier d'abord |
| Minutes GitHub Actions jamais additionnées ; chien de garde du plan 2 à 1 440 exécutions par mois | La phase 1 n'ajoute rien à Actions ; aucun chien de garde sur Actions ; consommation relevée avant J+14 |

Ce tableau m'est parvenu coupé après sa cinquième ligne. Les corrections des lignes suivantes restent dans le corps du plan ; je ne les réécris pas de mémoire.

### 9.2 La critique de complétude du 24/09

Chaque constat a été revérifié dans le dépôt, l'orchestre ou le vault avant d'être repris. Les repères A1 à E1 sont ceux de la critique ; « Crit. D1 » à « Crit. D9 » ne sont pas les décisions D1 à D20 du §11.

| Constat de la critique | Correction, et où |
|---|---|
| A1. Gabriel ne peut ni approuver ni valider (`garde.ts:51`, `:59-60`) | Fiche 025-08 réservée à Claude Code, phase 2, après D1 ; cible de 10 min seulement ensuite (§0, §4.3, §6.4) |
| A2. « Un jeton couvre la séance » est faux (`reconfirmation.ts:7`) | Un mot de passe par décision à enjeu, ou une fiche « séance » avec revue de sécurité (D10, §4.3) |
| A3. Après la suppression du compte, le formulaire du site mène à un 404 ; le retrait à 12 mois n'existe pas | Repli téléphone et e-mail dans 025-03, prouvé par `--reel` ; retrait et dossier en phase 2 (D15) ; « maintenu 12 mois » retiré des affirmations (§3.1) |
| A4. Une adresse changée casse le formulaire | `/api/leads` cherche aussi l'ancien slug par `artisanParAncienSlug` (025-03) ; `--reel` change l'adresse après génération |
| A5. Chaque vente se bloque faute de voix | Étape « Votre parcours » (025-09) ; appel de 15 min à défaut (§7.2) |
| A6. `generateSiteContent` est au format v1 | Fonction nouvelle au schéma v2 en phase 2 ; seuls `findFabrications` et `antiFabrication.ts` sont repris (§1.3, §6.4) |
| A7. Il manquait des promesses ; le compte réel est plus haut | 13 occurrences dans 7 fichiers plus `DemoSequence.tsx:26`, mesurées ; juge par expression régulière sur trois graphies ; `lib/aide.ts` dans 025-05 ; « réponse prête » gardé car prouvé (§1.3, 025-06) |
| A8. Deux affirmations permises fausses ; domaine sans acheteur ; Search Console oubliée | Affirmations réécrites (§3.1) ; l'artisan réserve son domaine (D9, 025-09) ; Search Console dans §0, §7.2 |
| A9. 025-05 cassait la surveillance nocturne et risquait le bouton de vente | 404 et non 410 ; carte de `fermeture-e2e` et ligne 48 de `site-sorti` dans le périmètre, diffs bornés ; bloc `SITE_A_LA_DEMANDE` gardé (025-05) |
| A10. `maj` ne recopie pas `executant.mjs` | Déplacement des exécutants dans la source d'abord ; modification du 24/09 sauvegardée à J+1 (§3.5, §6.4) |
| A11. 023-01 et 023-02 passées en assouplissant leurs juges | Décision D5 à J+1 ; jamais sur `main` sans contre-vérification |
| A12. Base chaude surestimée | Comptes `est_demo` et proches exclus ; jalon sur contacts froids seulement ; J+7 ne repose que sur Richard (§1.2, §1.5, §6.1) |
| A13. La règle 4 contredisait le livreur | Règle 4 réécrite : rien qui encaisse ne dépend de C2 ; livraison sur le poste jusqu'à la génération dans Actions (phase 3) ; épreuve du feu ajustée (§2.1, §6.5) |
| A14. A0 et A5 doublonnaient l'existant | A0 = la ronde de `lib/alertes.ts` à `*/5` ; A5 lit les fonctions de Comptabilité et de `lib/direction/stripe.ts` (§2.2, §4.2) |
| A15. Consigne Codex du 15/09 encore active | §4 et §5 marqués « CLOS » à J+1 (D6) |
| B1. 025-01 se jugeait elle-même | Claude Code écrit tous les juges ; Codex fait les mutations (025-10) |
| B2. Les maquettes auraient atterri dans `public/` | Le générateur refuse `public/` ; juges : sortie hors `public/`, démos gelées intactes, Lestraque identique, noms de prospects hors du dépôt (`prospects-hors-depot.mjs`) |
| B3. Trois arrêts du générateur à contourner | Zones « à compléter avec vous » en mode maquette ; le juge prouve l'absence de citation, de chiffre et de parcours (025-02) |
| B4. Le test réel de 025-03 laissait des traces | Compte d'essai en pause (sans IA ni e-mail), contact téléphonique, ménage dans un `finally`, `zero-demo-e2e` vert |
| B5. Précisions sur 0093 | Deux jumeaux par `sql-nu.mjs`, contrôle post-collage, corps de 0068:157-186 vérifié comme dernière définition (025-04) |
| B6. La branche du webhook devait alerter et répondre 200 | Alerte dédoublonnée par identifiant d'événement, réponse 200 (025-07) |
| B7. La variante A mentait avant 025-02 | Seule B part avant le PASS de 025-02 (§2.3, §3.1, §6.1) |
| B8. « Aucune personne générée » invérifiable par `video-qa` | Manifeste des entrées et détection de visages (§1.1, §6.4) |
| C1. Schéma `ops` injoignable | Fonctions `SECURITY DEFINER` réservées à `service_role` (§3.2) |
| C2. Routines sans accès réseau au site | Domaine permis et jeton en « API credentials » [à vérifier] (§2.1) |
| C3. Lien magique freiné | `auth.admin.generateLink` + Resend (§6.4) |
| C4. Le lien privé à 21 j n'existait pas | Table `ops.maquettes` avec `expire_le` (§3.2, §6.4) |
| C5. Le stockage déborderait | Phase 1 sans hébergement ; phase 2 : une capture de moins de 1 Mo, purge à 21 j, Supabase Pro au-delà de 60 % (§1.5, §8) |
| C6. Comment les captures arrivent au téléphone | Envoi depuis le PC par défaut ; téléphone en option (D11) |
| C7. Connecteur Alexya non branché, OAuth par utilisateur | A9 reste une séance Claude Code ; formule à 9 $ d'abord (§1.1, §2.2) |
| Crit. D1. Travail dissimulé | Statut et contrat écrit avant tout envoi par eux ; sinon Benj seul et prolongation de la mesure (D1, §1.2, §5.3) |
| Crit. D2. Partage de comptes | Chacun sur son compte ; Gabriel « Modérateur » de la Page (D2, §5.2) |
| Crit. D3. Aucun moyen de refuser dans les messages | Phrase de refus et source du fait dans A et B (§3.1, §5.3) |
| Crit. D4. Données SIRENE | Diffusion partielle et opposition écartées [à vérifier] (§2.2, §5.3) |
| Crit. D5. Test D incohérent | Note du juriste avant tout échantillon ; compte Instagram distinct ; règle des photos étendue aux marques (D12, §1.1, §5.3, §6.3) |
| Crit. D6. Aucune facture pour les packs | Modèle `invoice_creation` repris ; jamais un lien nu (§1.1) |
| Crit. D7. A3 lirait tout le Gmail de Benj | Seulement les fils qui répondent à `ops.envois` (§2.2, §6.4) |
| Crit. D8. « Pas de réponse automatique » (09/09) contredit l'agent A13 (Support) | L'agent A13 est suspendu à la décision D18 (§2.2) |
| Crit. D9. Garde-fous incomplets | PowerShell couvert ; crochet `git-garde` ; instantané avant chaque lancement d'Antigravity (§5.6) |
| E1. Sauvegarde sur `main` : 2 600 fichiers en production au push suivant | Instantané par index temporaire et `commit-tree`, sans toucher `main` ; push vers un dépôt privé non relié à Vercel, car tout push vers le dépôt relié déclenche un déploiement [déduit] (§6.1, D4) |
| **Ajouts de cette révision** : règle 1 de `CLAUDE.md:23` | 025-04 (migration) et 025-07 (argent) passent à Claude Code |
| Ajout : ordre de collage de 0093 | Après le déploiement de 025-05, pour ne pas ignorer sans message la case de l'ancien écran (§1.3, 025-04) |
| Ajout : « Supprimer le site » | Gardé pour les sites historiques actifs, seul moyen de les retirer après 0093 (§1.3, 025-05) |
| Ajout : modèles de maquette v2 | 025-11 pour trois métiers ; le menuisier vient avec 025-02 |

---

## 10. Ce que je n'ai pas pu vérifier

- **La critique m'est parvenue coupée** au milieu de son point E1. Ses points suivants, s'il y en avait, ne sont pas traités. J'ai ajouté ce que j'ai trouvé moi-même sur la sauvegarde (le déploiement à chaque push) et sur l'ordre de collage de 0093.
- **Les fiches de la version précédente ne m'ont pas été transmises.** Je les ai réécrites à partir du §6.6 et de la critique ; chacune passe `valider`.
- **Le §9 d'origine** est coupé après sa cinquième ligne (§9.1).
- Non vérifiés, et marqués comme tels dans le texte :
  - la protection des déploiements de prévisualisation Vercel ;
  - le caractère privé du dépôt GitHub ;
  - les frais de la facture Stripe d'un paiement unique ;
  - les limites d'envoi de Supabase Auth ;
  - le réseau des routines ;
  - l'offre Vercel réelle ;
  - le seuil de TVA 2026 ;
  - les brouillons restés dans Gmail.
- Je n'ai lancé aucun juge : ils n'existent pas encore. Les numéros de ligne cités sont ceux du 24/09 et bougeront au premier changement.

---

## 11. Les décisions de Benj

Chaque décision a une recommandation, qui s'applique par défaut si rien n'est tranché à l'échéance, sauf quand le défaut est « ne rien faire ».

### Avant J+1 (vendredi 25/09) : elles bloquent la suite

| # | Question | Recommandation (défaut) | Coût |
|---|---|---|---|
| D1 | **Statut de Gabriel et de Louis-Victor.** Ils prospectent pour Presti sans statut ni contrat : risque de travail dissimulé à la charge de Benj (`Journal-Decisions.md:161-165`) | Une micro-entreprise et un contrat écrit, facturé, pour chacun, avant tout message envoyé par eux. **Défaut : seul Benj envoie** jusqu'à la signature | selon le statut [à vérifier avec un comptable] |
| D2 | **Comptes séparés.** Revenir sur la décision du 09/09 (« Gabriel travaillera sur son compte ») | Chacun sur son propre compte ; Gabriel « Modérateur » de la Page ; Louis-Victor sur son LinkedIn. Défaut : dès que D1 est réglé | 0 |
| D3 | **Garde-fous locaux** (§5.6) : interdits git dans Bash et PowerShell, outils d'achat refusés, Codex en `workspace-write`, crochet `git-garde`, instantané avant Antigravity | Oui, les cinq | 0 |
| D4 | **Sauvegarde : où ?** | Instantané par `commit-tree` sans toucher `main`, poussé vers un dépôt GitHub privé à part, non relié à Vercel ; `git bundle` local en attendant. Jamais sur `main`, jamais une branche du dépôt relié à Vercel | 0 [à vérifier] |
| D5 | **Juges de 023-01 et 023-02**, assouplis par Antigravity et jamais contre-vérifiés | Garder les deux diffs dans les preuves, les annuler, et ranger 023-01 et 023-02 en refusées. Autre voie : les garder avec la note « non contre-vérifiés ». Jamais sur `main` sans contre-vérification | 0 |
| D6 | **Consigne Codex du 15/09, §4 et §5** (e-mails depuis le Gmail de Benj, corbeille de sa boîte) | Les marquer « CLOS — ne pas exécuter » | 0 |

### Avant J+7 (jeudi 01/10)

| # | Question | Recommandation (défaut) | Coût |
|---|---|---|---|
| D7 | **Photos du prospect avant son « oui »** | Photos d'illustration seulement ; les siennes après son accord | 0 |
| D8 | **Lever `siteCommandeVente`** | Oui, quand 025-03 et 025-09 sont PASS et déployés, `--reel` vert, et un site généré regardé. Défaut : rester baissé | 0 |
| D9 | **Qui réserve le domaine d'un artisan ?** | L'artisan lui-même, à son nom, avec notre guide. Autre voie : Presti l'achète et le refacture, geste humain à chaque fois. Aucun agent n'achète | environ 10 €/an, payés par l'artisan [à vérifier] |
| D10 | **Reconfirmation des décisions à enjeu** | Un mot de passe par décision (le code actuel). Le jeton « séance » seulement avec une fiche et une revue de sécurité | 0 |
| D11 | **D'où partent les maquettes ?** | Du PC (Instagram et Messenger sur le web), les captures restant dans le vault. Autre voie : un dossier Google Drive synchronisé vers le téléphone [à vérifier : Drive pour ordinateur installé] | 0 |

### Au jalon (jeudi 08/10) ou plus tard

| # | Question | Recommandation (défaut) | Échéance |
|---|---|---|---|
| D12 | **Test D** : lancer la consultation juridique maintenant, pour des échantillons à J+14, ou reporter le test après le jalon | Reporter après le jalon ; la note du juriste passe avant tout échantillon ; compte Instagram distinct ; permission avant d'utiliser les photos d'une marque | 08/10 |
| D13 | **Le numéro de Benj sur la landing v2** (« Parler à Benjamin ») | Oui, un numéro dédié si possible ; jamais de voix clonée | landing v2 |
| D14 | **Délégation à Gabriel** (fiche 025-08 : approuver un lot, valider un site) | Oui, seulement après D1 et D2 | phase 2 |
| D15 | **Le site 12 mois après la suppression du compte** (H3) : retrait automatique et envoi du dossier | Oui, par une tâche planifiée en phase 2 ; d'ici là, ne pas vendre cet argument | phase 2 |
| D16 | **Sort des 5 sites historiques** | Les garder sur le moteur actuel jusqu'à leur remplacement, sans nouvel éditeur | après J+30 |
| D17 | **Prix du site** | Passer à 390-490 € après 5 ventes et 3 références | après 5 ventes |
| D18 | **Réponse automatique de messagerie** : confirmer ou lever la décision du 09/09 (« ce sont des humains qui répondent ») | La confirmer tant que 20 brouillons n'ont pas été approuvés sans retouche ; A13 attend | phase 3 |
| D19 | **E-mail à froid** : oui ou non, et quel fournisseur | Non tant qu'aucun fournisseur n'autorise expressément la prospection B2B par écrit | 08/10 |
| D20 | **GO, GO partiel ou NON** (§1.2), sur 60 contacts froids au moins | Selon le tableau du §1.2 ; prolongation jusqu'au 15/10 si le volume manque | 08/10 |
