# R3 — Les vidéos de Benj pour le chantier 4 (assistant de gestion, CRM, automatisations) et le chantier 2 (landing)

Partie « vidéos » du chantier 4, rédigée le 02/11/2026 en lecture seule : aucune modification du dépôt ni du vault, aucun build,
aucun test, aucune migration, aucun appel qui écrit. Je n'ai regardé aucune vidéo : tout ce qui suit vient des analyses écrites.

Conventions :
- **AV:l.N** = ligne N de `C:/Users/benja/Documents/presti/plans/analyse-videos.md` (lu en entier, l.1 à 1577).
- « (vérifié) » = citation de code relue par moi le 02/11 (grep ou lecture de lignes, sans exécuter le code).
- Horodatages : ceux de l'analyse, recopiés tels quels. **Pour les YouTube, le format est `[hh:mm]` (heures:minutes), pas
  `[mm:ss]`** : « C3 [01:44] veut dire le cours 3, à la minute 1 h 44 » (`videos/references-2026-11-01/ANALYSE-YOUTUBE.md:12`),
  ce que confirment les durées (5 h 00, 4 h 05, 1 h 27). Pour les TikToks, ce sont des secondes (« 49,8-51,8 s », « image 30,5 s »).

---

## 0. Ce qu'il faut retenir

1. **Le corpus du 01/11 compte 13 vidéos** : 3 cours YouTube de Tim Chao et 10 TikToks (`videos/references-2026-11-01/liens.txt:1-13` ;
   AV:l.3-5 et l.1478). D'après leurs blocs `applicabilite_chantiers`, **12 sur 13 apportent quelque chose à l'assistant (C4) et
   11 sur 13 à la landing (C2)** (décompte au §6). Exceptions : realbastianvolkis-7678… n'a rien pour l'assistant (AV:l.824-827) ;
   realbastianvolkis-7684… (AV:l.627-630) et metakaihos (AV:l.1431-1434) n'ont rien pour la landing.
2. **Le vault garde des références plus anciennes qui portent sur le CRM et l'assistant** (15/10, 18/10, 20/10 ; §3). Elles ont déjà
   produit du code en ligne : assistant à outils, carte Atelier, CRM « vivant ». Plusieurs n'ont **aucune analyse écrite** (20/10 :
   3 TikToks et un Short YouTube ; 12/10 : `crm-3d` et `compta-milesreeves` ; 15/10 : pas de décomposition). Je n'en dis que ce que
   les notes disent.
3. **Le cadrage du chantier 4 n'intègre pas ces vidéos.** `plans/011-cadrage-01-11/cadrage-p3.md` est daté du 01/11 à 13 h 11 et
   l'analyse du 01/11 à 20 h 19 (dates des fichiers) ; aucun des 13 identifiants n'apparaît dans `cadrage-p3.md` (grep). Le plan de
   landing du 02/11 (`plans/011-cadrage-01-11/chantier-2-landing-plan.md:34`) n'en reprend que trois : mikalianov, yova2n et
   RWKyUJLi-kI [03:26].
4. **Une source fausse dans le top 20.** L'action n° 15 (« un bouton manuel pour chaque action automatique », AV:l.1531) cite
   « realbastianvolkis 53,2-61,0 s ». La fiche corrigée place le double chemin à 209,6-221,4 s de la vidéo 7684… (AV:l.589, l.639),
   et 50,9-60,9 s est « la confusion » de la vidéo 7685… (AV:l.696, l.740). Le « 53,2-61,0 » vient de l'analyse du matin
   (`videos/references-2026-11-01/ANALYSE-TIKTOK.md:280`). « realbastianvolkis » seul désigne quatre vidéos : il faut toujours
   donner l'identifiant.
5. **Cinq tensions à trancher** entre les vidéos et les décisions de Benj (détail au §7) :
   - les questions avant le devis, contre « l'assistant ne sert pas à poser des questions » (14/10) ;
   - « sans jargon IA », contre les deux promesses du prompt 4, qui disent « l'IA » ;
   - « → entretien » dans la chaîne de la landing, alors que le contrat d'entretien n'existe pas dans le code ;
   - des « niveaux d'autonomie convenus » pour l'offre entreprise, contre le bloc d'offres corrigé du 01/11 ;
   - une vraie capture d'écran, ou une animation de la fonctionnalité.

---

## 1. Sources lues

- `plans/011-cadrage-01-11/prompts-benj/p3-assistant.md`, lu en entier (l.1 à 630), et le bloc d'offres corrigé
  `p3-assistant-bloc-offres-corrige-0111.md` (l.1 à 46).
- `plans/analyse-videos.md`, lu en entier par morceaux (l.1 à 1577).
- `videos/references-2026-11-01/` : `liens.txt`, `ANALYSE-TIKTOK.md` (tableau l.14-29 et synthèse l.272-296), `ANALYSE-YOUTUBE.md:12`,
  en-tête de `youtube/fiches/O3A2xnBadFo.synthese.md`.
- Réseau neuronal (MCP `cerveau`), avec `chercher` sur « vidéo référence assistant de gestion », « CRM vidéo référence Benj »,
  « agentique », « landing vidéo référence », « verdict », « ref-1510-crm », « ref-1310-crm », « ref-1810-crm », « motiondesign.ch
  morgan_rize », « double chemin », « Geste », puis `lire` et `regles_pour` :
  - `memoire/nuit-1510-crm-assistant.md`, `memoire-presti/tiktoks-a-voir-plus-tard-2010.md`, `memoire-presti/crm-vivant-3d-2010.md`,
    `memoire-presti/consigne-crm-anime-site-gabriel-2010.md` ;
  - `references/ref-1810-crm/DECOMPOSITION.md`, `references/ref-1910-cerveau/DECOMPOSITION.md` ;
  - `vault/wiki/concepts/Références de Benj et ce qu'elles enseignent.md`, `vault/wiki/concepts/Verdicts de Benj sur les films - historique.md`,
    `vault/wiki/sources/Source - docs studio marketing presti-ops vidéo.md`, `vault/inbox/sessions/2026-10-27-elargir-chasse.md`,
    `vault/inbox/sessions/2026-11-02-01h07-b6e06ae6-avant-compression.md`, `vault/Produit/Session-2026-11-01-Reseau-neuronal-phase-1-4.md`
    (section « Contrôle croisé ») ;
  - `plans/crm-idees-twenty-1810.md` §3 ; les cinq notes « Geste - … » de `vault/10 Presti/01 Produit/` (extraits).
- `plans/011-cadrage-01-11/` : `cadrage-p3.md` (l.1-40, 161-255, 400-427), `chantier-2-landing-plan.md` (entier), `cadrage-p4.md:140` et
  `:174`, `cadrage-00-synthese.md:72` et `:103`, `prompts-benj/p4-landing.md` (l.20-109 et lignes trouvées par grep).
- Contrôles de code (grep et lecture de lignes) : voir les « (vérifié) » plus bas.

---

## 2. Les 13 vidéos du 01/11, une par une

Pour chaque vidéo : l'identifiant ou l'auteur, le sujet, puis **(a)** ce qu'elle impose ou suggère pour le chantier 4, **(b)** pour le
chantier 2, et les autres chantiers où l'analyse la range, sans détail.

### 2.1 O3A2xnBadFo — Tim Chao, « The ONLY Ai Agency Course You Need To Watch in 2026 » (YouTube, 5 h 00, priorité moyenne, AV:l.10)

Sujet : cours sur la vente de services IA en agence, mêlé à la promotion du coaching du vidéaste ; le cœur est une méthode de vente
par appel de décision. Les revenus cités sont « affirmés, non vérifiables » (AV:l.20).

**(a) C4** (AV:l.134-146) :
- [02:39] Demande en langage naturel « relance les devis non signés depuis 30 jours », avec un échantillon validé par l'artisan et
  l'exclusion des clients à ne pas relancer ; l'artisan valide en Studio ([02:10], [04:08]).
- [00:49] Onboarding court de l'artisan (métier, tarifs, mentions légales, clients types), stocké dans Supabase ([01:08], [04:59]).
- [04:00] Base de connaissance par métier dans Supabase (termes, tâches, douleurs) pour l'assistant ([04:19]).
- [02:35] Requête en langage naturel sur la base clients (exemple : les chantiers de salle de bain de l'an dernier), sans export CSV.
- [02:33] Réponse e-mail immédiate, hors horaires, aux demandes entrantes d'un artisan, via n8n et Supabase.
- [02:12] Calcul automatique de l'acompte ou du prorata, et relances d'impayés ([04:07]).
- [04:41] Rappel de bilan 14 ou 30 jours après la mise en service d'un compte, planifié par n8n, avec des idées tirées des usages
  réels ([00:12]).
- [03:31] Routeur léger pour les demandes simples, grand modèle pour les cas complexes ; alerte e-mail à Benj si un workflow
  échoue ([03:30]).

**(b) C2** (AV:l.108-119) :
- [04:03] Titre de prestiapp.fr en une ou deux phrases (pour qui, quoi, résultat), sans jargon IA ([04:27], [03:46]).
- [03:16] Une page ou un bloc par métier (plombier, électricien, maçon), avec les mots du métier ([04:13], [04:48]).
- [01:49] FAQ qui répond d'avance aux objections (prix, temps, complexité) ([03:17]) ; une courte vidéo par objection.
- [00:36] Tester une vidéo de présentation de 4 à 6 minutes (problème, démo d'un devis et d'une facture), avec le bouton de démo ou
  d'inscription juste dessous ([03:29]).
- [00:22] Bloc « fuite » : le temps et les devis perdus sans la solution, face au prix réel de Studio ou de Signature, sans chiffre
  inventé.
- [01:25] Expliquer ce qui se passe après la demande de démo : questions, démonstration, prix, décision libre ([00:29]).
- [00:41] N'afficher que de vrais cas clients Presti ; en attendant, montrer une démo du produit ([04:23]).

Interdits relevés (AV:l.60-75) : fausse urgence [01:41], prix d'ancrage fictif [01:45], références ou logos empruntés [00:41],
revenus affirmés [00:00].
Autres chantiers : réseau neuronal, prospection et contenu (AV:l.96, l.120, l.147). La majorité de la prospection décrite est interdite
pour Presti (AV:l.20).

### 2.2 RWKyUJLi-kI — Tim Chao, « Launch A $100K/Month AI Agency In 7 Days » (YouTube, 4 h 05, priorité moyenne, AV:l.179)

Sujet : créer une agence de services IA, puis de longues séances de questions-réponses et de coaching d'appels de vente. Elle recoupe
fortement O3A2xnBadFo ; ses actions n'ajoutent que ce qui diffère (AV:l.189).

**(a) C4** (AV:l.288-298) :
- [01:41] Questionnaire d'onboarding en étapes, avec saisie à la dictée, sur la façon dont l'artisan fait ses devis, ses relances et
  ses factures ; réponses rangées dans Supabase.
- [01:43] Écran de validation en un clic de chaque action proposée (relance, envoi de devis), avant que n8n l'exécute ([01:40]).
- [00:36] Rappel de relance de devis et suivi un mois après le chantier ; espace client simple (avancement, documents) ([00:37]).
- [01:48] Séquence d'accueil sur 48 heures (premier devis guidé, e-mail de bienvenue par Brevo) ; première réponse du support faite
  par l'assistant.
- [03:35] À l'onboarding, demander les outils déjà utilisés, leur rôle et leur coût avant de configurer.
- [01:22] Garde-fous de sécurité et de confidentialité des données clients : RLS Supabase, tests d'accès entre locataires.
- [00:08] Détecter les demandes de clients restées sans réponse et proposer une relance.

**(b) C2** (AV:l.262-273) :
- [00:18] Organiser prestiapp.fr autour d'un seul objectif : titre clair, sous-titre, démo courte, bouton de démo, preuves réelles ;
  formulaire minimal, puis page de remerciement ([00:21]).
- [00:08] Accroche en résultat mesurable pour l'artisan (devis plus vite, relances faites), avec des chiffres réels seulement.
- [02:12] Formulaire de demande de démo avec deux questions filtrantes (métier, taille) avant les coordonnées.
- [00:54] Une variante de landing par métier (plombier, électricien).
- [03:26] Calculateur où l'artisan saisit ses propres chiffres (devis par mois, temps perdu), sans aucun exemple fictif.
- [01:31] Studio présenté comme l'entrée simple, Signature comme le palier supérieur ([01:33]).
- [03:42] Ordre de la page : problème, objectif, puis offres ; prix de départ clair, sans prix d'ancrage fictif ([04:00]).
- [02:26] Garantie formulée en conditions vraies (essai sans engagement), sans fausse urgence.

Interdits relevés (AV:l.222-233) : pression à la décision [00:44], revenus affirmés [00:00], monologue et partage d'écran trop tôt
[03:36], [03:41].
Autres chantiers : réseau neuronal, prospection et contenu (AV:l.249, l.275, l.300).

### 2.3 k1adsrTHwPg — Tim Chao, « How to Start an AI Agency in 2026 » (YouTube, 1 h 27, priorité basse, AV:l.329)

Sujet : vidéo surtout promotionnelle, au fond utile mince : vendre en deux appels, trier les prospects, poser des questions avant de
proposer, tenir 60 à 90 jours avant de juger (AV:l.339).

**(a) C4** (AV:l.424-430) :
- [00:42] Devis construit par étapes validées une à une (périmètre, délai, fourchette) avant le prix final.
- [00:46] L'assistant pose quelques questions sur le chantier avant de générer un devis (voir la tension T1 au §7).
- [00:35] Fonction « demande-moi » qui répond à l'artisan depuis une base d'aide dans Supabase, alimentée par les questions réelles
  validées via n8n ([00:36]).

**(b) C2** (AV:l.404-411) :
- [00:52] Une démo courte d'un devis et d'une facture avant tout texte, sans fausse urgence ni faux témoignage.
- [00:13] Bouton « diagnostic gratuit de votre gestion » (formulaire Supabase) ; formulaire court sur le métier et la difficulté
  ([01:08], [01:05]).
- [00:14] Studio et Signature en deux options claires, avec les prix réels, jamais d'ancrage fictif.
- [00:05] Promesse en gain de temps et d'argent pour l'artisan, sans chiffre inventé.

Autres chantiers : réseau neuronal, prospection et contenu (AV:l.394, l.413, l.432).

### 2.4 angelotturri-7698795221999471902 — « Cinq agents IA pas encore saturés à vendre aux entreprises » (TikTok, 146,5 s, priorité haute, AV:l.462)

Sujet : un vendeur d'agence IA, face caméra, énumère des agents à vendre aux patrons : recrutement (6,4-38,0 s), recouvrement des
impayés (38,0-51,8 s), contrat d'entretien vendu après chaque chantier (58,1-69,0 s) puis rappel d'entretien (69,0-85,3 s),
chiffrage d'après les prix des anciens clients du CRM (85,3-117,3 s), le tout vendu en « moteurs » (117,3-140,5 s) (AV:l.470).

**(a) C4** (AV:l.532-538) :
- **Impayé relancé jusqu'au paiement ou jusqu'au motif** (49,8-51,8 s) : quand le client répond, l'assistant lit la réponse, classe
  le motif (contestation, oubli, trésorerie, échéancier demandé), le range sur la facture (migration à poser par Claude Code après
  accord) et propose l'étape suivante en carte. Aujourd'hui, la relance s'arrête à la réponse (`lib/aide.ts:232`, vérifié : J+3,
  J+10, J+21, arrêt dès le paiement ou la réponse) et le mot « motif » n'apparaît dans aucun `lib/relancesImpayes*.ts` (vérifié).
- **Détecteur « chantier terminé → proposer l'entretien »** (60,8-82,7 s), planifié dans n8n (route Presti à clé limitée,
  `cadrage-p3.md:413`), qui dépose une opportunité dans la boîte « À valider » (`cadrage-p3.md:410`) et s'appuie sur l'outil existant
  `envoyer_rappel_entretien` (`lib/assistant/outils-actions.ts:445-448`, vérifié : catégorie « confirmation », CRM).
- **Chiffrage** (85,3-104,5 s) : garder la règle actuelle, le prix de la source « artisan » (`lib/prix/artisan.ts:5`, vérifié) affiché
  avec sa source (`lib/prix/types.ts:24-26`, vérifié). Un « prix pratiqué sur tes derniers chantiers » serait une nouvelle source
  déclarée dans `SourceId` (`lib/prix/types.ts:13`, vérifié), datée et liée au devis d'origine : c'est une décision d'argent.
- À ne pas reprendre (AV:l.494-496) : relancer « comme si le client avait déjà accepté » (82,7-85,3 s), contraire au ton sans
  culpabilisation ; un agent qui téléphone et prend des rendez-vous (14,2-25,9 s) ; l'envoi automatique d'un prix tiré des anciens
  chantiers (105,7-108,1 s), contraire à `lib/ai/exemples.ts:4-5` (vérifié : un exemple montre le ton et la forme, « ni un prix à
  recopier »).

**(b) C2** (AV:l.519-523) : dans la refonte, sous le drapeau `landingV2` (absent de `lib/flags.ts` sur `main` : il n'existe que sur
la branche `refonte-1018`, `chantier-2-landing-plan.md:14-15`), une section « une chaîne, pas une liste » : les moteurs
reliés (message → réponse → devis → relance → facture → entretien) au lieu d'une grille de fonctions (117,3-130,4 s). Attention au
maillon « entretien » (tension T3 au §7).

Autres chantiers : réseau neuronal, prospection et contenu (AV:l.513, l.525, l.540).

### 2.5 realbastianvolkis-7684021380060302625 — « Arrêtez de construire des agents et des cerveaux » (TikTok, 251,8 s, priorité haute, AV:l.567)

Sujet : le fondateur d'un éditeur de logiciel IA explique que l'IA d'entreprise demande quatre choses, un agent, une mémoire, des
connexions et des compétences (68,2-71,8 s). Les trois premières sont de l'infrastructure à ne pas reconstruire (78,6-101,3 s) ; ce qui
distingue une entreprise, ce sont ses compétences, flux et procédures (108,7-116,9 s), et une compétence n'est qu'un document
d'instructions pas à pas (166,6-173,2 s). Un agent intégré au logiciel est utile s'il connaît le logiciel, à côté des boutons manuels
(197,5-221,4 s) (AV:l.575).

**(a) C4** (AV:l.635-641) :
- **Compétences de l'assistant** : un dossier par geste, sur le modèle de `lib/ai/cerveaux/` (instructions pas à pas, `cas.jsonl`,
  `evaluer.mjs`, `score.json`, voir `LISEZMOI.md` ; vérifié par la liste de `lib/ai/cerveaux/urgence/`). Il se charge selon l'intention
  que repère `cadrerDemande` (`lib/assistant/cadrage.ts:137`, vérifié). Le texte part du playbook du vault, mais la production
  n'appelle jamais le vault (108,7-116,9 s ; 166,6-173,2 s).
- **Double chemin vérifié par un test** : un test parcourt les 52 actions de `SPEC` (`lib/assistant/outils-actions.ts:58`, vérifié) et
  échoue si l'une n'a pas d'écran ou de route manuelle équivalente. La règle est déjà posée dans `plans/016-assistant.md` §3
  (l.32-34, vérifié : « Si l'interface ne sait pas faire une chose, l'assistant ne la fait pas non plus ») (209,6-221,4 s ;
  222,0-236,0 s). Aucune occurrence de « double chemin », « équivalent manuel » ou « route manuelle » dans
  `scripts/assistant-qa.mjs`, `assistant-tout-qa.mjs` et `lib/assistant-qa-live.mjs` (grep du 02/11).
- **Détecteurs de la boîte « À valider » planifiés dans n8n**, qui appellent les routes de Presti (`cadrage-p3.md:413`), plutôt qu'une
  nouvelle boucle d'agent codée ; l'effort va aux compétences (229,9-236,0 s).

**(b) C2** : rien (AV:l.627-630).

Autres chantiers : réseau neuronal et contenu (AV:l.619, l.643). Côté réseau neuronal, les playbooks par geste existent depuis le 01/11 au
soir : cinq notes « Geste - … » dans `vault/10 Presti/01 Produit/` (répondre à une demande de prospect, relancer un devis sans réponse,
relancer une facture impayée, facturer une situation de travaux, proposer un contrat d'entretien après un chantier).

### 2.6 realbastianvolkis-7685717353828519170 — « Arrêtez de construire des CRM avec l'IA » (TikTok, 88,2 s, priorité haute, AV:l.672)

Sujet : un logiciel « agentique », c'est un chatbot dans le logiciel, qui le comprend et facture des crédits (26,4-33,4 s) ; sa raison
d'être est de supprimer la confusion, car un logiciel trop compliqué n'est plus payé (50,9-60,9 s). À l'image, le panneau de
planification de CodeSpring : une question à la fois, une ligne d'action sous chaque réponse (« Updating features… »), un compteur de
crédits et une barre « Planning 62 % complete » (image 30,5 s) (AV:l.680).

**(a) C4** (AV:l.735-742) :
- Afficher sous chaque réponse la ligne de ce qui vient d'être fait (« client retrouvé », « devis mis à jour »). `libelleOutil` sert
  déjà au journal (`app/assistant/page.tsx:278`, vérifié) : il suffit de le remonter dans la conversation (image 30,5 s).
- Pour une tâche en plusieurs étapes (devis complet, situation de travaux) : une question à la fois et une barre d'avancement
  (image 30,5 s).
- Critère « zéro confusion » (50,9-60,9 s) : ajouter au harnais `assistant-qa` des demandes floues, où l'assistant doit poser une
  seule question utile au lieu de renvoyer l'artisan vers un menu.
- Solde de crédits visible dans l'assistant (`creditsMois`, `lib/plans.ts:42`, vérifié) ; faire payer l'assistant à l'usage reste une
  décision d'argent de Benj (29,8-33,4 s ; 63,4-67,7 s).

**(b) C2** (AV:l.723-729) :
- Sous-titre du haut de page sur l'angle « Presti fait le travail au lieu d'un logiciel de plus à apprendre » (promesse de la page à
  l'image 84,0 s, réécrite), dit honnêtement : en Studio l'IA prépare et l'artisan valide, en Signature elle envoie seule.
- Bloc avant / après qualitatif (carnet, tableur, relance oubliée → une console qui prépare), sans chiffre absent de
  `plans/promesses.md`, avec des annotations au corail (image 35,0 s).
- Formulaire court, prénom et e-mail, pour réserver la démo de 10 minutes, sur le modèle de la page de l'image 84,0 s, sans chiffre de
  revenu.

Interdits relevés (AV:l.700-705) : montants d'abonnés et revenus affirmés ; désabonnement de 28,39 % sans source ; annotations vertes
(le vert `#38CD8C` ne sert qu'à « validé ») ; démo locale présentée comme produit ; écran filmé au doigt.
Autres chantiers : contenu (AV:l.744).

### 2.7 realbastianvolkis-7678336589503827202 — « En route vers un logiciel IA à 1 M$ » (TikTok, 54,4 s, priorité basse, AV:l.771)

Sujet : épisode d'une série sur sa croissance. Il vend des licences de sa technologie : un cerveau de connaissances monté pour une
entreprise, des agents sous licence, le remplacement d'un produit par un agent (12,9-28,6 s). L'analyse conclut qu'« aucun chantier n'y
trouve plus qu'une idée de cadrage pour l'offre sur devis » (AV:l.779).

**(a) C4** : rien (AV:l.824-827).

**(b) C2** (AV:l.814-818) : page `/entreprise` (offre « Presti pour l'entreprise », `cadrage-p3.md:412`, sans prix ni paiement en
libre-service), présentée comme une mise en place : données importées, procédures de l'entreprise écrites en compétences, niveaux
d'autonomie convenus (12,9-28,6 s). Décision d'offre à Benj (tension T4 au §7).

Interdit relevé : montrer les paiements refusés d'un client et en faire un argument (32,4-37,4 s ; AV:l.795).
Autres chantiers : aucun (AV:l.810, l.820, l.828).

### 2.8 realbastianvolkis-7675806697113357590 — « Un client à 3 700 $ par an pour mon logiciel » (TikTok, 39,9 s, priorité moyenne, AV:l.847)

Sujet : selon lui, le logiciel va vers le paiement au résultat (6,6-17,0 s). À l'image : un tableau de tâches en colonnes Up Next /
Building / Review (image 19,0 s) et une page d'accueil au titre en trois douleurs (image 22,0 s) (AV:l.855).

**(a) C4** (AV:l.902-906) : dessiner la boîte « À valider » (table d'opportunités du cadrage P3) en trois colonnes, comme le tableau de
l'image 19,0 s : **Repéré** (opportunité détectée) → **Préparé** (brouillon de l'assistant) → **À valider** (geste de l'artisan). En
Signature, les types passés au niveau 3 franchissent seuls la dernière colonne, avec l'annulation de 10 minutes
(`lib/pilote/regles.ts:24`, vérifié : `DELAI_ANNULATION_MIN = 10`).

**(b) C2** (AV:l.892-896) : tester un titre de haut de page en trois douleurs d'artisan (le devis promis, la relance oubliée, la
paperasse du soir), sur le modèle de la page de l'image 22,0 s, sans ligne de chiffres tant que `plans/promesses.md` n'en source aucun.
Phrase à faire approuver par Benj.

Interdits relevés (AV:l.871-877) : « nous pouvons garantir des résultats » (11,9-17,0 s) ; chiffres de la page sans source (image
22,0 s) ; page violette et interface bleutée, hors charte.
Autres chantiers : contenu (AV:l.908).

### 2.9 mikalianov-7702516743494733089 — « Les tableaux Excel viennent officiellement de mourir » (TikTok en français, 40,5 s, priorité haute, AV:l.933)

Sujet : tutoriel. Un logiciel d'agence en 3D cliquable (3,0-10,6 s), puis une méthode « avec Claude en 3 étapes » : décrire son
entreprise ou donner un export de CRM ou d'Excel, puis la faire dessiner en monde 3D cliquable ; la 3ᵉ étape est cachée contre un
commentaire « CRM » (AV:l.941). Publiée le 30/10, elle est distincte des envois du même créateur du 18/10 et du 20/10 (AV:l.988).

**(a) C4** (AV:l.1006-1011) :
- **Outil d'action « décrire mon entreprise »** dans `lib/assistant/outils-actions.ts` : l'artisan dit en une phrase son métier, son
  lieu (chez moi, atelier, entrepôt, camion) et son équipe ; l'assistant propose une carte à valider qui enregistre métier et base en
  base. Aujourd'hui, ce réglage ne vit que dans le navigateur (`app/crm/atelier/Atelier.tsx:106` et `:114`, vérifié : `localStorage`)
  et `crm_reglages` ne porte que `validation_auto` (`supabase/migrations/0172_crm_carte_chantiers.sql:34-36`, vérifié). Claude Code écrit
  la migration et l'outil (15,2-19,1 s).
- **Dépôt de fichier dans le chat `/assistant`** : aucun `type="file"` dans `app/assistant` (grep du 02/11). Un export Excel ou CSV
  glissé suivrait le circuit déjà en place dans `/chiffres` : lecture par `lireClasseur` (`app/chiffres/ComptaArtisan.tsx:157`,
  vérifié), plan de colonnes contrôlé par `validerPlanIA` (l.116, vérifié), puis aperçu à valider avant toute écriture (19,1-22,9 s).
  Le prompt 3 le demande aussi : l'artisan peut donner à l'assistant « un fichier, une photo, un lien » (`p3-assistant.md:20`).
- Garde-fou (AV:l.967) : ne pas montrer un geste qui n'existe pas. Tant que l'import par le chat n'existe pas, un export Excel se
  dépose dans « Mes chiffres ».

**(b) C2** (AV:l.993-998) :
- **Frise de pastilles 1-2-3-4** collée au-dessus des quatre cartes de la section « La chaîne complète », sur le modèle des images
  12,5 s, 24,1 s et 34,0 s. L'analyse cite `app/page.tsx:232-237` : ce sont les lignes de l'arbre de travail non commité (titre de la
  section à la l.237, vérifié ; l.229 au commit HEAD, `git diff` : 9 lignes ajoutées, 1 retirée). Pastille corail pour l'étape lue,
  vert `#38CD8C` seulement quand l'étape est « validée », jamais de bleu ; par une tâche, avec la skill `presti-design`.
- **Carte 1 : la demande du prospect tapée lettre à lettre**, comme le champ « Ton business » (≈16,4-18,5 s), texte marqué
  « Exemple », animation coupée sous `prefers-reduced-motion`. Vérifier au navigateur, par des captures à plusieurs instants, que
  l'animation se voit vraiment (leçon de la démo du 14/09).

Interdits relevés (AV:l.962-971) : palette crème et bleue ; visage ; cartes plates sans vraie 3D ; geste absent du produit ; marque
« Claude » à l'écran ; chiffres présentés comme réels (toute maquette porte « Exemple ») ; promesse « fais-le toi-même avec une IA ».
Autres chantiers : réseau neuronal, prospection (option à soumettre à Benj) et contenu (AV:l.985, l.1000, l.1013). Candidate de forme
pour les films (AV:l.1559).

### 2.10 yova2n-7701424216331078945 — « L'accueil 3D de Blitz » (TikTok en français, 33,2 s, priorité moyenne, AV:l.1051)

Sujet : vlog filmé au téléphone. L'accueil de la plateforme est une ville 3D isométrique (0-3,6 s), suivie d'un calendrier fiscal
(19,3-24,9 s) et d'une place de projets (25,0-28,1 s). Seule la grammaire d'accroche se reprend : le monde 3D du produit en héros, les
mots un par un, la caméra qui avance (AV:l.1059).

**(a) C4** (AV:l.1118-1122) : poser à Benj une question à options sur le calendrier fiscal (19,3-24,9 s).
- Option 1 : le laisser hors périmètre, comme le prévoit le cadrage (`cadrage-p3.md:224` : « Déclaration URSSAF / impôts : non, non,
  non, hors périmètre »).
- Option 2 : un détecteur de niveau 1 qui rappelle seulement la date d'une échéance de TVA et le lien impots.gouv.fr, sans montant ni
  dépôt, et qui ignore les artisans en franchise. L'assistant connaît déjà la franchise 293 B (`lib/assistant/outils-actions.ts:132`,
  vérifié).

**(b) C2** (AV:l.1108-1112) : comme premier écran, l'atelier 3D vivant, l'objet réel du produit, à la place de l'anneau WebGL
`ObjetVivant` (`app/page.tsx:179`, vérifié dans l'arbre de travail). L'analyse propose une boucle muette courte, rendue depuis le moteur
`crm-v3`, avec une caméra qui avance comme à 0-3,6 s. Une image fixe s'affiche en attendant, pour ne pas dégrader le LCP. Mention
« Exemple » si des chantiers fictifs sont lisibles, et passage par Lighthouse avant tout push.

Interdits relevés (AV:l.1078-1086) : écran filmé flou ; promesses d'argent ; visages ; émojis et marques ; compteurs à zéro laissés à
l'écran (25,8 s) ; promesse fiscale « de A à Z » ; 20 s d'ambiance avant le premier geste lisible.
Autres chantiers : réseau neuronal (lacune de la question V1 signalée, AV:l.1104) et contenu (AV:l.1100, l.1124). Candidate de forme
pour les films (AV:l.1559).

### 2.11 ghoost.000-7692934139833568544 — « Carrousels automatisés par un agent IA (Hermes Agent) » (TikTok en français, 67,8 s, priorité haute, AV:l.1156)

Sujet : le créateur affirme que son agent Hermes a fabriqué et publié seul un carrousel de 7 diapositives pour artisans du BTP
(13,4-21,3 s) ; c'est affirmé, jamais montré. La vraie matière est le carrousel, déjà décomposé le 30/10 (AV:l.1164).

**(a) C4** (AV:l.1227-1232) :
- La question de la diapositive 1/7 (13,8 s) est une question d'artisan à laquelle l'assistant ne sait pas répondre : « combien
  j'ai gagné sur ce chantier ? ». L'outil `lire_chantiers` (`lib/assistant/crm.ts:98-136`, vérifié) ne calcule qu'avancement et retard,
  et passe `materiaux: []` (l.111, vérifié), alors que la vue CRM porte déjà les indicateurs de chaque chantier (`lib/crm/vue.ts:144-145`,
  vérifié). Ajouter la marge sur matériaux tirée de `indicateurs()` (`lib/crm/chantier.ts:74`, vérifié), toujours dite estimée et signalée
  partielle si des sorties n'ont pas de prix (l.58-61, vérifié : « ce n'est pas un bénéfice »). Développement par Claude Code, avec un cas
  d'évaluation (skill `presti-ai-lab`).
- Jauge d'alerte (diapositive 6/7, 19,1 s) : l'assistant prévient quand la marge sur matériaux estimée d'un chantier passe sous un seuil
  fixé par l'artisan. C'est un nouveau réglage, à décider avec Benj avant tout code.

**(b) C2** (AV:l.1216-1221) :
- La scène 8 de `DemoSequence` promet « combien il vous rapporte » (`app/DemoSequence.tsx:37`, vérifié). L'aligner sur le libellé
  prudent de l'écran, « Marge sur matériaux, estimée » (`app/crm/Indicateurs.tsx:29`, vérifié), puisque `lib/crm/chantier.ts:58-61` dit
  que ce n'est pas un bénéfice.
- Clore la landing sur l'enchaînement des diapositives 5 à 7 (18,1-20,1 s) : trois questions que l'artisan se pose le soir, l'écran
  Presti qui y répond, puis « essai gratuit, sans carte bancaire ». C'est vrai (`lib/essaiGratuit.ts:5-8`, vérifié). Ne pas citer de
  durée : elle dépend de l'offre (`lib/plans.ts:108`, vérifié : 7 jours pour Studio, 21 pour Signature).

Interdits relevés (AV:l.1186-1194) : se servir du rendu en code pour échapper à la mention IA ; chiffres d'exemple sans mention
« Exemple » ; marge complète (Presti ne calcule qu'une marge sur matériaux, estimée).
Autres chantiers : réseau neuronal et surtout contenu (moteur de carrousel, premier workflow n8n) (AV:l.1209, l.1234 ;
`cadrage-p2.md:184`).

### 2.12 sambutlerai-7682094375119146272 — « 40 pubs statiques générées à partir d'une photo produit » (TikTok, 42,3 s, priorité moyenne, AV:l.1263)

Sujet : un graphe à nœuds produit des pubs statiques à partir d'une photo ; régénérer, écarter et cocher sont dits, jamais montrés
(23,2-38,4 s) (AV:l.1271).

**(a) C4** (AV:l.1333-1337) : **mémoire des refus**. Une carte écartée par l'artisan passe au statut `refusee`
(`lib/assistant/confirmation.ts:131`, vérifié), mais rien d'autre dans `lib/assistant` ne lit ce statut (vérifié : `refusee` n'apparaît
qu'à `cartes.ts:15` et `confirmation.ts:131` et `:135`). Vérifier si l'historique passé au modèle (`lib/assistant/boucle.ts:101-104`,
vérifié : il vient de l'écran) contient ces refus. Sinon, y joindre les dernières cartes écartées (type d'action, client), pour que
l'assistant ne repropose pas la même chose : « écartée, elle ne revient pas » (30,2-34,1 s).

**(b) C2** (AV:l.1321-1325) : dans la section « automatique », reprendre l'image de 6 s avec un seul objet en héros, le message du
prospect, d'où partent quatre fils corail vers quatre objets 3D (réponse, devis, relance, facture), sans le jaune ni le vert de la
référence. Texte honnête selon l'offre : en Studio tout se prépare et l'artisan valide, en Signature ça part seul.

Interdits relevés (AV:l.1294-1301) : revenu en accroche ; fausse preuve sociale (« fondateur » au visage généré, faux tweet, « zéro
étoile ») ; coupon ; marque tierce ; image générée par IA.
Autres chantiers : réseau neuronal, prospection et contenu (AV:l.1315, l.1327, l.1339).

### 2.13 metakaihos-7701671513002429729 — « L'appli de notes tout-en-un » (TikTok, 7,7 s, sans parole, priorité moyenne, AV:l.1368)

Sujet : teaser muet d'une appli de notes en graphe planétaire, avec une barre du haut « 0 dues · 3 objectifs du jour → » (image 1,0 s)
(AV:l.1376).

**(a) C4** (AV:l.1439-1444) :
- **Barre « N à valider + 3 priorités du jour → »** sur l'accueil de la console (`app/dashboard/page.tsx`, fichier présent). « N à
  valider » compte les cartes `assistant_actions` en attente et non expirées (`lib/assistant/cartes.ts:15` et `:18`, vérifié : validité
  24 h). « 3 priorités du jour » reprend les trois premières lignes du briefing (`lib/assistant/briefing.ts:35`, vérifié : devis sans
  réponse depuis 7 jours ; `:37` : impayé de 30 jours ; `:72` : stock sous le seuil). Aujourd'hui, ce briefing n'est calculé que si
  l'artisan le demande (outil `briefing_du_matin`, `lib/assistant/outils.ts:70`, vérifié). Le calcul se fait par le code, sans modèle
  (`briefing.ts:5-6` et `:99`, vérifié) et sans migration (image 1,0 s).
- Le **briefing du matin** de niveau 1 se borne à trois priorités, avec la même flèche vers la boîte « À valider ». Un workflow n8n le
  déclenche à heure fixe. Sa sortie compte comme texte de tiers (`lib/pilote/regles.ts:132`, vérifié : `briefing_du_matin` est dans
  `OUTILS_CONTENU_TIERS`) : il propose, il ne déclenche jamais le Pilote.

**(b) C2** : rien. « L'idée d'une constellation sur la landing tombe » (AV:l.1376, l.1407), puisque la direction A est sans WebGL
(`cadrage-p4.md:140` et `:174`, vérifié).
Autres chantiers : réseau neuronal (outil `sante_reseau`, fait le 01/11 : `vault/Produit/Session-2026-11-01-Reseau-neuronal-phase-1-4.md`)
et contenu (AV:l.1424, l.1446).

---

## 3. Les références plus anciennes du vault sur le CRM et l'assistant (hors analyse du 01/11)

Je ne rapporte que ce que les notes écrivent. Le dossier `presti-ops/references/` compte 23 dossiers (`find … -maxdepth 1 -type d`, 02/11).

| Date | Référence | Ce que dit l'analyse écrite | Ce qui en est sorti | Source |
|---|---|---|---|---|
| 12/10 | `crm-3d` (5 images, aucun texte) | Aucune analyse écrite | Citée comme complément de la référence 3D du 18/10 | liste de `presti-ops/references/crm-3d` ; `plans/crm-idees-twenty-1810.md` §3 (titre) |
| 12/10 | `compta-milesreeves` (vidéo et planche) | Aucune analyse écrite trouvée | Rien de rattaché trouvé | liste du dossier |
| 15/10 | `ref-1510-crm` (TikTok ; planches, transcription, pas de `DECOMPOSITION.md`) | La mémoire la résume : logiciel « façon jeu », carte des chantiers, briefing | CRM temps réel sur 12 tables, carte Atelier, assistant à outils (28 actions), cartes « Confirmer » pour tout ce qui sort, journal annulable pour le reste | `memoire/nuit-1510-crm-assistant.md` |
| 18/10 | `ref-1810-crm`, @mikalianov, « Je fais les meilleurs logiciels 3D » (15 s, musique seule) | Monde 3D isométrique façon jeu ; vue région avec étiquettes ; coupe 3D de l'intérieur ; colonne d'indicateurs à gauche ; frise d'étapes en pastilles en bas ; actions à droite ; un décor par métier | Frise d'étapes et colonne d'indicateurs retenues (TOP 8, n° 3 et n° 2), suivi par pièce (n° 8). Jugement écrit : « pour un artisan, la frise et les indicateurs valent plus que la 3D » | `references/ref-1810-crm/DECOMPOSITION.md` ; `plans/crm-idees-twenty-1810.md` §3 |
| 20/10 | 3 TikToks (@motiondesign.ch 63 s, @morgan_rize 41 s, @mikalianov 44 s « Pourquoi personne ne fait ça ? #crm #erp #3d #ia ») et un Short YouTube de Morgan Rize (RaH86YqCKWg : CRM 3D « jeu vidéo » et agents qui font les tâches) | Aucune analyse écrite (« Rien n'a été analysé ») ; les transcriptions étaient dans `AppData/Local/Temp/refs-crm/`, dossier absent le 02/11 | Demande de Benj : un CRM bien meilleur, adapté au métier et à l'infrastructure de l'artisan, en temps réel. Fait et en ligne : accueil en direct, poste des assistants (relanceur, encaissement, facturation, agenda ; « rien ne part sans clic »), 3D par métier et par base (commit e3fcac3, lots 2 à 5) | `memoire-presti/tiktoks-a-voir-plus-tard-2010.md` ; `memoire-presti/crm-vivant-3d-2010.md` ; `vault/inbox/sessions/2026-10-27-elargir-chasse.md` |

Ce que ces références et les verdicts associés imposent encore au chantier 4 :
- **L'assistant agit, il ne questionne pas.** Le 14/10, Benj dit qu'il « ne sert pas à poser des questions » : c'est « un agent qui gère
  toute la plateforme : devis, factures, inventaire, tarifs et CRM » (`memoire/nuit-1510-crm-assistant.md`, décision née de la
  référence `ref-1510-crm`). L'offre « réservée à Signature » de cette note est dépassée : la liste `STUDIO` de `lib/plans.ts`
  (l.56) contient aujourd'hui la capacité `assistant` (l.75, vérifié).
- **Pour le CRM, la frise et l'argent du chantier priment sur la 3D** (`plans/crm-idees-twenty-1810.md` §3). C'est déjà en vitrine
  (`app/DemoSequence.tsx:35-37`, vérifié : « lot 1… la frise du dossier et l'argent du chantier »).
- **Le CRM s'adapte au métier et à la base de l'artisan** ; le drapeau est levé (`lib/flags.ts:224`, vérifié :
  `crmAtelierVivant: true`). Le réglage de la base reste dans le navigateur (vidéo mikalianov du 30/10, §2.9).
- **Pas d'« équipe » présumée.** En corrigeant l'accroche du film CRM du 20/10, Benj dit « pas « ton équipe », beaucoup d'artisans sont
  seuls » (`memoire-presti/consigne-crm-anime-site-gabriel-2010.md`). La règle vaut pour les textes de la landing et pour l'outil
  « décrire mon entreprise ».
- Le verdict « vidéo CRM super, ajoute plus de fonctionnalités : panneaux de gestion, pipeline » (20/10, même mémoire) porte sur le film,
  pas sur le produit.

Contradiction à nettoyer, sans y toucher ici : l'index `MEMORY.md` dit encore des TikToks du 20/10 « mis de côté par Benj, ne rien faire
avant qu'il les redemande ». Or la note `crm-vivant-3d-2010`, modifiée plus tard le même jour (15 h 17 UTC, contre 13 h 29 UTC pour
`tiktoks-a-voir-plus-tard-2010`, dates rendues par le MCP `cerveau`), montre que Benj s'en est servi pour le CRM.

---

## 4. Règles « Assistant (C4) », dédoublonnées

Les règles fusionnent les propositions proches. La colonne « Appui » dit ce qui existe déjà (vérifié) ou qui décide.

### A. Ce que l'assistant fait, et comment il le montre

| n° | Règle | Vidéos sources | Appui |
|---|---|---|---|
| A1 | L'assistant agit d'abord. Il ne pose **qu'une question à la fois**, et seulement si une donnée manque ; une demande floue reçoit une question utile, jamais un renvoi vers un menu | k1adsrTHwPg [00:46] ; realbastianvolkis-7685 (50,9-60,9 s ; image 30,5 s) ; décision du 14/10 née de ref-1510-crm | `p3-assistant.md:166-167` (« Demander une information manquante ») ; cas à ajouter au harnais `assistant-qa` |
| A2 | Montrer le travail fait : sous chaque réponse, la ligne de l'action faite ; pour une tâche en plusieurs étapes, une barre d'avancement | realbastianvolkis-7685 (image 30,5 s) | `libelleOutil` existe (`app/assistant/page.tsx:278`) |
| A3 | Devis construit par étapes validées (périmètre, délai, puis prix). Montants calculés par le code ; prix toujours sourcés (une fourchette n'existe que si la source la donne : `prix_ht_min`, `prix_ht_max`, `lib/prix/types.ts:20-22`, vérifié) ; jamais un prix recopié d'un ancien chantier | k1adsrTHwPg [00:42] ; angelotturri (85,3-108,1 s) | `lib/ai/exemples.ts:4-5` ; `lib/prix/artisan.ts:5` ; nouvelle source « derniers chantiers » = décision d'argent |
| A4 | Comprendre une consigne en langage naturel sur ses données : « relance les devis non signés depuis 30 jours », avec échantillon validé et clients exclus ; « mes chantiers de salle de bain de l'an dernier », sans export | O3A2xnBadFo [02:39], [02:10], [04:08], [02:35] | Exemples du prompt (`p3-assistant.md:157-162`) |
| A5 | Recevoir un fichier dans le chat : un export Excel ou CSV suit le circuit de `/chiffres` (lecture, plan contrôlé, aperçu avant écriture) | mikalianov (19,1-22,9 s) | `ComptaArtisan.tsx:157` et `:116` ; aucun champ fichier dans `app/assistant` ; `p3-assistant.md:20` |
| A6 | Outil « décrire mon entreprise » (métier, lieu, équipe, zéro compris) en une phrase, puis une carte qui l'enregistre en base | mikalianov (15,2-19,1 s) ; verdict du 20/10 « beaucoup d'artisans sont seuls » | Réglage en `localStorage` (`Atelier.tsx:106`, `:114`) ; migration par Claude Code |
| A7 | Répondre à « combien j'ai gagné sur ce chantier ? » par la marge sur matériaux, estimée, partielle si des prix manquent ; une alerte sous un seuil est un réglage à décider avec Benj | ghoost.000 (13,8 s ; 19,1 s) | `lib/assistant/crm.ts:111` (`materiaux: []`) ; `lib/crm/chantier.ts:58-61`, `:74` |
| A8 | Solde de crédits visible ; faire payer l'assistant à l'usage reste une décision d'argent | realbastianvolkis-7685 (29,8-33,4 s ; 63,4-67,7 s) | `creditsMois` (`lib/plans.ts:42`) |
| A9 | Connaissance métier et base d'aide « demande-moi » dans Supabase, alimentées par des questions réelles validées ; la production ne lit jamais le vault | k1adsrTHwPg [00:35], [00:36] ; O3A2xnBadFo [04:00], [04:19] ; realbastianvolkis-7684 (166,6-173,2 s) | Le vault reste mémoire stratégique, sans donnée client (`.claude/rules/architecture-outils.md`) |

### B. Validation et autonomie

| n° | Règle | Vidéos sources | Appui |
|---|---|---|---|
| B1 | Chaque action proposée se valide en un geste avant de partir (Studio), avec un échantillon visible quand elle touche plusieurs clients | RWKyUJLi-kI [01:43], [01:40] ; O3A2xnBadFo [02:39] ; top 20 n° 15 (AV:l.1531) | 52 actions dont 20 « à confirmer » (`cadrage-p3.md:9`, `:25`) ; cartes (`cartes.ts`, `confirmation.ts`) |
| B2 | Double chemin : chaque action de l'assistant a son écran ou sa route manuelle, et un test qui parcourt `SPEC` le prouve | realbastianvolkis-7684 (209,6-221,4 s ; 222,0-236,0 s) | Règle de `plans/016-assistant.md:32-34` ; test absent des 3 scripts de l'assistant |
| B3 | Boîte « À valider » en trois colonnes : Repéré → Préparé → À valider. En Signature, au niveau 3, la dernière colonne se franchit seule, avec 10 minutes pour annuler | realbastianvolkis-7675 (image 19,0 s) | `lib/pilote/regles.ts:24` ; `cadrage-p3.md:410` (opportunités, pas cartes de 24 h) |
| B4 | Accueil : barre « N à valider + 3 priorités du jour → », calculée par le code ; briefing du matin borné à trois priorités, lancé par n8n à heure fixe, qui propose et ne déclenche jamais le Pilote | metakaihos (image 1,0 s) | `briefing.ts:35`, `:37`, `:72`, `:99` ; `outils.ts:70` ; `regles.ts:132` |
| B5 | Une proposition écartée ne revient pas : les refus récents entrent dans le contexte de l'assistant | sambutlerai (30,2-34,1 s ; 34,1-38,4 s) | Statut `refusee` (`confirmation.ts:131`) que rien ne relit |

### C. Détecteurs et automatisations (dans n8n, qui appelle les routes de Presti)

| n° | Règle | Vidéos sources | Appui |
|---|---|---|---|
| C1 | Ne construire ni nouvelle boucle d'agent ni nouvelle couche mémoire. Les détecteurs sont planifiés dans n8n, qui appelle les routes de Presti avec une clé à droits limités ; l'effort va aux compétences | realbastianvolkis-7684 (229,9-236,0 s ; 54,7-63,7 s) | `cadrage-p3.md:413` ; `.claude/rules/architecture-outils.md` (n8n pour toute automatisation) |
| C2 | Compétences : un dossier par geste (instructions, cas, évaluation, score), chargé selon l'intention de la demande | realbastianvolkis-7684 (108,7-116,9 s ; 166,6-173,2 s) ; top 20 n° 18 | Modèle `lib/ai/cerveaux/` ; `cadrerDemande` (`cadrage.ts:137`) ; les 5 playbooks « Geste - … » du vault |
| C3 | Repérer les demandes restées sans réponse et proposer une relance ; selon l'offre, répondre aussi hors horaires | RWKyUJLi-kI [00:08] ; O3A2xnBadFo [02:33] | Événement « prospect entrant sans réponse » (`p3-assistant.md:582`) ; garde d'horaires (`cadrage-p3.md:213`) |
| C4 | Impayés : relancer jusqu'au paiement ou jusqu'au motif (classer le motif, le ranger sur la facture, proposer la suite) ; ton sans culpabilisation, jamais « comme s'il avait accepté » ; acompte, prorata et montants calculés par le code | angelotturri (49,8-51,8 s ; 82,7-85,3 s) ; O3A2xnBadFo [02:12], [04:07] | `lib/aide.ts:232` (arrêt à la réponse) ; aucun « motif » dans `lib/relancesImpayes*.ts` ; migration après accord |
| C5 | Après chantier : proposer l'entretien par une opportunité « À valider » qui passe par `envoyer_rappel_entretien` ; relance de devis et suivi un mois après le chantier | angelotturri (60,8-82,7 s) ; RWKyUJLi-kI [00:36], [00:37] | `outils-actions.ts:445-448` ; `lib/apresChantier.ts:6-12` (rappel seulement, désactivé par défaut) |
| C6 | Calendrier fiscal : question à options à Benj (hors périmètre, ou rappel de date de TVA sans montant, hors franchise) | yova2n (19,3-24,9 s) | `cadrage-p3.md:224` ; `outils-actions.ts:132` ; `p3-assistant.md:553` |
| C7 | Petit modèle pour le simple, grand modèle pour le complexe ; alerte à Benj quand un workflow échoue | O3A2xnBadFo [03:31], [03:30] | `routerModele` existe (`cadrage-p3.md:23`) |

### D. Mise en route

| n° | Règle | Vidéos sources | Appui |
|---|---|---|---|
| D1 | Onboarding court, en étapes, avec dictée : métier, tarifs, mentions légales, clients types, façon de faire devis, relances et factures, outils déjà utilisés (rôle, coût) | O3A2xnBadFo [00:49], [01:08], [04:59] ; RWKyUJLi-kI [01:41], [03:35] ; top 20 n° 17 | `p3-assistant.md:581` (« 5 questions au plus ») |
| D2 | Accueil sur 48 heures (premier devis guidé, e-mail de bienvenue, première réponse du support par l'assistant) et point à 14 ou 30 jours, planifié par n8n | RWKyUJLi-kI [01:48] ; O3A2xnBadFo [04:41], [00:12] | L'e-mail en masse passe par Brevo (`.claude/rules/email-brevo.md`) |

### E. Sécurité, vérité, interdits

| n° | Règle | Vidéos sources | Appui |
|---|---|---|---|
| E1 | Isolation entre locataires prouvée par des tests | RWKyUJLi-kI [01:22] | Principe non négociable du prompt (`p3-assistant.md:42`) |
| E2 | L'assistant ne téléphone pas, ne prend pas de rendez-vous seul, n'envoie jamais seul un prix tiré d'anciens chantiers, ne promet ni résultat garanti ni accompagnement fiscal | angelotturri (14,2-25,9 s ; 105,7-108,1 s) ; realbastianvolkis-7675 (11,9-17,0 s) ; yova2n (19,3-24,9 s) | `p3-assistant.md:497-501` et `:553` |
| E3 | Aucun mot technique devant l'artisan, aucune marque ni nom de modèle dans l'interface | metakaihos (image 3,5 s, « Opus 5.5 Extra » ; AV:l.1403) | `p3-assistant.md:49`, `:503` |

---

## 5. Règles « Landing (C2) », dédoublonnées

Le cadre du prompt 4 passe avant les vidéos : 7 sections au plus (`p4-landing.md:35`), une promesse claire en 5 secondes et un seul
appel à l'action principal (`:326`), « La démo ne montre que des gestes qui existent dans le code aujourd'hui » (`:297`).

| n° | Règle | Vidéos sources | Appui |
|---|---|---|---|
| L1 | Un seul objectif : un titre d'une ou deux phrases (pour qui, quoi, résultat), un sous-titre, une démo, un bouton ; un formulaire minimal, puis une page de remerciement | O3A2xnBadFo [04:03] ; RWKyUJLi-kI [00:18], [00:21] ; top 20 n° 4 | `p4-landing.md:37-50` |
| L2 | Titre : trois douleurs d'artisan (le devis promis, la relance oubliée, la paperasse du soir) ou un résultat mesurable ; aucun chiffre absent de `plans/promesses.md` ; phrase validée par Benj | realbastianvolkis-7675 (image 22,0 s) ; RWKyUJLi-kI [00:08] ; k1adsrTHwPg [00:05] | « 3 douleurs maximum » (`p4-landing.md:54-58`) |
| L3 | Sous-titre : Presti fait le travail au lieu d'un logiciel de plus à apprendre, dit honnêtement selon l'offre | realbastianvolkis-7685 (image 84,0 s) ; sambutlerai (image 6 s) | Accroches de `lib/plans.ts:98-99` (vérifié) : Studio « vous validez d'un clic, rien ne part sans vous », Signature « Tout part automatiquement » |
| L4 | Le produit d'abord : une démo courte (devis, relance, facture) avant tout texte. Premier écran : l'atelier 3D vivant ou le vrai écran animé, en vidéo muette chargée après l'affichage, avec une image fixe en attente ; jamais de WebGL au chargement ; Lighthouse avant le push | k1adsrTHwPg [00:52] ; yova2n (0-3,6 s) ; mikalianov (3-34 s) ; top 20 n° 5 | `cadrage-p4.md:140`, `:174` ; `p4-landing.md:290` ; `chantier-2-landing-plan.md:34-40` (direction B) |
| L5 | Une chaîne, pas une liste : les étapes reliées (message → réponse → devis → relance → facture) ; frise de pastilles 1-2-3-4 au-dessus des cartes de « La chaîne complète » (corail pour l'étape lue, vert seulement pour « validée », jamais de bleu) ; carte 1 tapée lettre à lettre et marquée « Exemple » ; image-éventail du message du prospect vers quatre objets | angelotturri (117,3-130,4 s) ; mikalianov (images 12,5 / 24,1 / 34,0 s ; ≈16,4-18,5 s) ; sambutlerai (image 6 s) | `app/page.tsx:237` (arbre de travail) ; `prefers-reduced-motion` ; captures à plusieurs instants |
| L6 | Montrer ce qui échappe sans l'inventer : avant / après qualitatif, bloc « fuite » face au prix réel, ou calculateur avec les seuls chiffres de l'artisan | realbastianvolkis-7685 (image 35,0 s) ; O3A2xnBadFo [00:22] ; RWKyUJLi-kI [03:26] ; top 20 n° 7 | Direction C du plan (`chantier-2-landing-plan.md:34`) |
| L7 | Offres : Studio en entrée, Signature en palier, « Presti pour l'entreprise » sur démonstration ; prix lus dans `lib/plans.ts`, jamais d'ancrage fictif ; ordre problème → objectif → offres ; garantie en conditions vraies (essai sans carte), sans fausse urgence ; jamais de durée d'essai générique | RWKyUJLi-kI [01:31], [01:33], [03:42], [04:00], [02:26] ; k1adsrTHwPg [00:14] ; ghoost.000 (image 20,1 s) ; top 20 n° 8 | `lib/plans.ts:98-99`, `:108` ; `lib/essaiGratuit.ts:5-8` |
| L8 | Bloc ou page « Presti pour l'entreprise » : une mise en place sur devis (données importées, procédures de l'entreprise, CRM et automatisations sur mesure), sans prix ni paiement en libre-service | realbastianvolkis-7678 (12,9-28,6 s) | Texte imposé `p4-landing.md:87-98` ; bloc corrigé `p3-assistant-bloc-offres-corrige-0111.md:21-36` (tension T4) |
| L9 | Demande de démo : formulaire court (prénom et e-mail, ou deux questions filtrantes, métier et taille), libellé possible « diagnostic gratuit de votre gestion » ; dire ce qui se passe ensuite (questions, démonstration, prix, décision libre) | realbastianvolkis-7685 (image 84,0 s) ; RWKyUJLi-kI [02:12] ; k1adsrTHwPg [00:13], [01:08], [01:05] ; O3A2xnBadFo [01:25], [00:29] | Choix du formulaire à trancher par Benj |
| L10 | FAQ qui répond d'avance aux objections : prix, temps, complexité, confiance, peur de l'informatique | O3A2xnBadFo [01:49], [03:17] ; top 20 n° 6 | Section « Questions » du plan (`chantier-2-landing-plan.md:58`) |
| L11 | Fin de page : trois questions que l'artisan se pose le soir, l'écran Presti qui y répond, puis « essai gratuit, sans carte bancaire » | ghoost.000 (18,1-20,1 s) | `lib/essaiGratuit.ts:5-8` |
| L12 | Libellés prudents : « Marge sur matériaux, estimée », jamais « combien il vous rapporte » | ghoost.000 (image 19,1 s) | `app/DemoSequence.tsx:37` à corriger ; `app/crm/Indicateurs.tsx:29` |
| L13 | Une variante ou un bloc par métier, avec les mots du métier | O3A2xnBadFo [03:16], [04:13], [04:48] ; RWKyUJLi-kI [00:54] | À placer dans les 7 sections ou sur des sous-pages |
| L14 | Vidéo de présentation de 4 à 6 minutes, à tester, avec le bouton juste dessous | O3A2xnBadFo [00:36], [03:29] | Drapeau `landingVideo` baissé (`chantier-2-landing-plan.md:9`) |
| L15 | Preuves : seulement de vrais cas Presti, sinon la démo du produit ; toute maquette fictive porte « Exemple » | O3A2xnBadFo [00:41], [04:23] ; mikalianov (AV:l.969) | `p4-landing.md:254`, `:297` |
| L16 | Interdits de forme confirmés par les vidéos : aucun chiffre de revenu ni compteur à zéro ; ni bleu, ni cyan, ni violet ; vert seulement pour « validé » ; aucune marque tierce ni visage ; pas de constellation ; pas d'« équipe » présumée | yova2n (image 25,8 s) ; mikalianov et realbastianvolkis-7675 (palettes) ; realbastianvolkis-7685 (image 35,0 s) ; metakaihos (AV:l.1407) ; verdict du 20/10 | Test « ni bleu ni cyan » prévu (`chantier-2-landing-plan.md:78`) |

---

## 6. Décompte par chantier, et vidéos rangées ailleurs

| Vidéo | Réseau neuronal | Landing | Prospection | Assistant | Contenu | Lignes AV |
|---|---|---|---|---|---|---|
| O3A2xnBadFo | oui | oui | oui | oui | oui | 96, 108, 120, 134, 147 |
| RWKyUJLi-kI | oui | oui | oui | oui | oui | 249, 262, 275, 288, 300 |
| k1adsrTHwPg | oui | oui | oui | oui | oui | 394, 404, 413, 424, 432 |
| angelotturri-7698… | oui | oui | oui | oui | oui | 513, 519, 525, 532, 540 |
| realbastianvolkis-7684… | oui | **non** | non | oui | oui | 619, 627, 631, 635, 643 |
| realbastianvolkis-7685… | non | oui | non | oui | oui | 719, 723, 731, 735, 744 |
| realbastianvolkis-7678… | non | oui | non | **non** | non | 810, 814, 820, 824, 828 |
| realbastianvolkis-7675… | non | oui | non | oui | oui | 888, 892, 898, 902, 908 |
| mikalianov-7702… | oui | oui | oui | oui | oui | 985, 993, 1000, 1006, 1013 |
| yova2n-7701… | oui | oui | non | oui | oui | 1100, 1108, 1114, 1118, 1124 |
| ghoost.000-7692… | oui | oui | non | oui | oui | 1209, 1216, 1223, 1227, 1234 |
| sambutlerai-7682… | oui | oui | oui | oui | oui | 1315, 1321, 1327, 1333, 1339 |
| metakaihos-7701… | oui | **non** | non | oui | oui | 1424, 1431, 1435, 1439, 1446 |

Vidéos déjà rangées surtout dans d'autres chantiers, sans détail :
- **Prospection (C3)** : l'essentiel des trois cours YouTube (AV:l.20, l.189, l.339 ; top 20 n° 9 à 14, AV:l.1525-1530) ; les 4 TikToks
  du 25/10 (`presti-ops/ia-caller/ANALYSE-TIKTOKS-2026-10-25.md`) et les deux carrousels sur le cold e-mail du 20/10
  (`vault/inbox/sessions/2026-10-27-elargir-chasse.md`).
- **Vidéo et carrousels (C5)** : ghoost.000 (gabarit de carrousel, `cadrage-p2.md:184`), mikalianov et yova2n (candidates de forme,
  AV:l.1559), sambutlerai (plan en éventail) ; ZGdX1uxhx, référence par défaut de la prochaine pub (`cadrage-00-synthese.md:72`) ; toutes
  les références de pub d'octobre (@maneo.ai, Scalyx, @troiscoups.fr, @lemosthiagoo, Slash, @neildegracce, @nicolas.scalyx, Créneau,
  @motionlovee, @stepan.strauf, @tonytuyisenge, @rikibosso, @game_on.69), d'après `vault/wiki/concepts/Références de Benj et ce
  qu'elles enseignent.md` ; les dossiers `ref-2026-10-28…`, `ref-2026-10-29…` et `ref-1910-*` de `presti-ops/references/`.
- **Réseau neuronal (C1)** : metakaihos et realbastianvolkis-7684 (contrôle croisé du 01/11,
  `vault/Produit/Session-2026-11-01-Reseau-neuronal-phase-1-4.md`) ; @shazamob « Prompt Spider » (`references/ref-1910-cerveau/DECOMPOSITION.md`),
  dont le principe recoupe C1 et C7 du §4 : le code tranche les cas sûrs, le modèle les cas durs, l'accord revient à l'humain.
- **Hors Presti** : adamswice (veille e-commerce), @lucca.the.develop (site d'un tiers).

---

## 7. Tensions et points à trancher

- **T1. Questions ou action.** k1adsrTHwPg [00:46] veut des questions avant le devis. Benj, le 14/10, ne veut pas d'un assistant à
  questions (`memoire/nuit-1510-crm-assistant.md`), et le prompt dit « Demander une information manquante » (`p3-assistant.md:167`).
  Lecture proposée : une seule question, et seulement si une donnée bloque (règle A1), mesurée au harnais.
- **T2. « Sans jargon IA ».** O3A2xnBadFo [04:03], [04:27] demande un titre sans jargon d'IA. Les deux promesses proposées par Benj
  disent « l'IA » (`p4-landing.md:27`, `:31`). Le prompt prime ; sa liste de mots interdits vise « IA générative, agent, workflow, LLM,
  automatisation « intelligente » » (`p4-landing.md:297`), pas le mot « IA » seul.
- **T3. « → entretien » dans la chaîne.** Le contrat d'entretien n'existe pas dans le code : seul un rappel « Proposer l'entretien »,
  relu et confirmé par l'artisan, existe en Signature avec le CRM (note `vault/10 Presti/01 Produit/Geste - Proposer un contrat
  d'entretien après un chantier.md` ; `lib/apresChantier.ts:6-12`, vérifié : désactivé par défaut, aucun message ne part seul). La landing
  ne peut montrer que des gestes existants (`p4-landing.md:297`) : maillon à retirer ou à dire « proposer l'entretien ».
- **T4. L'autonomie de l'offre entreprise.** La vidéo realbastianvolkis-7678 suggère des « niveaux d'autonomie convenus », et le prompt
  dit qu'elle ouvre « le niveau 3 sur les types d'action convenus » (`p3-assistant.md:550`). Le bloc corrigé par Benj le 01/11 vers
  18 h 06 dit l'inverse : elle « n'est pas un niveau d'autonomie différent », c'est le même moteur, avec un CRM et des automatisations
  sur mesure (`p3-assistant-bloc-offres-corrige-0111.md:33-36`). À trancher par Benj avant d'écrire la page. Ce même bloc dit
  « plateforme.ia.auto à partir de Studio », ce qui contredit le code ; c'est déjà relevé à `p3-assistant-bloc-offres-corrige-0111.md:40-44`
  et cela touche les textes honnêtes des règles L3 et L7.
- **T5. Vraie capture ou animation.** La question V1 propose par défaut qu'« une vraie capture de la plateforme est permise »
  (`cadrage-00-synthese.md:103`). L'analyse rappelle que le film CRM v2, fait de captures réelles, a été refusé le 20/10 (« c'est des
  animations de la fonctionnalité qu'il faut faire ») (AV:l.1104 ; `memoire-presti/consigne-crm-anime-site-gabriel-2010.md`). Pour la
  landing, le prompt demande « vrais écrans de Presti animés » (`p4-landing.md:290`) : le prompt tranche pour C2. La question reste
  ouverte pour les films.

---

## 8. Limites

- Je n'ai vu aucune vidéo ; je ne garantis que la fidélité au texte des analyses.
- Sans analyse écrite : `crm-3d` et `compta-milesreeves` (12/10), `ref-1510-crm` (pas de décomposition), les 3 TikToks et le Short du
  20/10 (transcriptions perdues avec le dossier temporaire). Si Benj veut qu'elles comptent pour le chantier 4, il faut les analyser.
- Les lignes de `app/page.tsx` citées par l'analyse sont celles de l'arbre de travail non commité (9 lignes de plus qu'au commit HEAD).
- Je n'ai pas cherché un test de « double chemin » ailleurs que dans les trois scripts de l'assistant : le grep sur tout `scripts/`
  a dépassé 20 s.
- Contexte qui n'est pas une vidéo : la note de session du 02/11 (`vault/inbox/sessions/2026-11-02-01h07-b6e06ae6-avant-compression.md`)
  contient une « grosse alerte » de Benj. Selon lui, l'assistant « ne peut absolument pas interagir » : ni recherche, ni devis, ni
  facture, ni tableau Excel, ni tarifs ; il demande aussi de vérifier le CRM. Le message n'a pas de date propre, et ses points
  ressemblent à ceux que le commit 8022cc6 du 29/10 dit traiter. Il est à confronter au code par la partie « inventaire » de ce chantier.
