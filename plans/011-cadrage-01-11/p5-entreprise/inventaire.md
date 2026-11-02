# Presti pour l'entreprise — inventaire de ce qui existe déjà (prompt 5, mode A)

> **Mode A** : aucun client signé, aucune donnée réelle. Ce fichier inventorie, il ne réécrit rien et ne construit rien.
> Établi le 02/11/2026 vers 17 h (heure de Paris) par un sous-agent Claude Code, en lecture seule (seul ce fichier est écrit).
>
> **Comment lire les références**
> - Code : arbre de travail du 02/11 vers 16 h 50, HEAD `74db706a`. Seul écart de code à HEAD dans ce qui est cité : `lib/pilote/regles.ts`
>   (correctif E4 non commité, audit `032-011` en cours) a 11 lignes de plus que HEAD après sa l.161.
> - « C4 » = `plans/011-cadrage-01-11/chantier-4-assistant-plan.md` (état du 02/11 à 16 h 53) ; « C2 » = `chantier-2-landing-plan.md`
>   (état de 16 h 49) ; « P5 » = `prompts-benj/p5-entreprise-sur-mesure.md`. Les deux plans sont en cours de correction par la session
>   principale : la section est donnée avec la ligne, pour retrouver le passage s'il bouge.
> - Mesures faites pour ce passage : SQL en lecture seule sur Supabase (2026-11-02 15:46:52 UTC) ; MCP `n8n-oracle` en lecture
>   (`search_workflows`, `list_credentials`, vers 16 h 48, aucun secret lu) ; documentation n8n lue le 02/11/2026. L'état du serveur Oracle
>   vient de la mesure de la session principale (02/11 vers 15 h 55).

## 1. Ce qui existe, ce que ça apporte, ce qui manque

### A. L'offre et l'argent

| Élément | Où (fichier:ligne) | Ce qu'il fait | Ce qu'il apporte à l'offre | Ce qui manque |
|---|---|---|---|---|
| A1 · Identifiant d'offre `entreprise` | `lib/plans.ts:19-20`, commentaire `:14-18` | `PlanId` contient `entreprise` ; `PlanPayant` reste `studio \| signature` : ni Checkout, ni essai, ni colonne de grille | L'offre vit dans la matrice unique, hors libre-service, comme le veut Benj (P5:27) | Rien pour le mode A |
| A2 · Capacités `ENTREPRISE` | `lib/plans.ts:101-103` ; capacité `:43-45` ; `business` (fondateurs) reprend `ENTREPRISE` `:115-116` | Signature à l'identique, plus `organisation.membres` ; le « sur mesure » se règle par contrat, pas par une capacité (`:101-102`) | « L'autonomie de Signature » (P5:33) est codée ; le compte fondateur a les mêmes capacités pour essayer | `organisation.membres` n'est lue par aucun `peut()` (recherche dans `app/` et `lib/` : seulement `lib/plans.ts:45` et `:103`) ; le drapeau `organisations` que cite `lib/plans.ts:44` n'existe pas dans `lib/flags.ts` (lot L0 non fait, C4 §14 l.804). Aujourd'hui, l'offre vaut exactement Signature |
| A3 · Fiche de l'offre | `lib/plans.ts:113-114` ; plafonds `:181`, `:183`, `:188` | « Presti pour l'entreprise », `surDevis: true`, `prixMois: 0`, 600 crédits, modèles Standard, Pro et Expert, espaces égaux à Signature | Libellé et accroche « Sur démonstration et sur devis » prêts pour l'interface | Crédits fixés au contrat : question 6 (c) ouverte (C4 §0 bis l.238) ; aucun réglage par contrat dans le code |
| A4 · Verrou et offre de référence | `lib/plans.ts:149-151` (`peut`), `:154-157`, `:160-164` (`messageVerrou`), `:168-172` (`offreDeReference`) | Le verrou dit « Disponible avec Presti pour l’entreprise, sur démonstration. » (`:163`) ; l'Entreprise se compare comme Signature (`:170`) | Textes de verrou et comparaisons justes sans code neuf | Le verrou ne mène nulle part : pas de page `/entreprise` (absente de `app/`), le motif « entreprise » de `/contact` n'est qu'au chantier 2 (F2) |
| A5 · Alignement sur Stripe | `lib/abonnementSync.ts:61-75` ; `:17-24` ; `:78-102` ; `:146` | L'Entreprise se reconnaît par son produit ou la métadonnée de son prix, à tout montant ; à défaut par la métadonnée de l'abonnement, seulement à un montant d'aucune offre publique ; `planDepuisMontant` ignore les offres à 0 € ; le compte est retrouvé par `metadata.uid`, puis l'abonnement, puis le client Stripe ; une offre perdue annule la file du pilote | Un contrat sur devis reste Entreprise à n'importe quel prix ; un changement au portail le perd (audit D4, `chantier-4-rapport-L1-L2.md:73`) | Le webhook n'écoute pas `customer.subscription.created` (événements traités : `app/api/stripe/webhook/route.ts:112`, `:202`, `:211`, `:244`, `:246`, `:263`). Un contrat créé à la main ne serait aligné qu'au premier `customer.subscription.updated` : à vérifier en mode test Stripe avant le premier contrat, `metadata.uid` posé sur l'abonnement |
| A6 · Webhook Stripe | `app/api/stripe/webhook/route.ts:211-243` | Relit l'abonnement en dépliant le produit du prix (`:231-232`), aligne, prévient Benj d'un changement d'offre (`:237-243`) ; une écriture refusée rend 500 pour que Stripe rejoue (`:234-236`) | La reconnaissance par produit joue à chaque changement | Voir A5 (la création) |
| A7 · Portail des contrats | `app/api/stripe/portail/route.ts:53-58`, `:65` | Un compte `entreprise` ouvre son propre portail (`STRIPE_PORTAIL_ENTREPRISE`) ; variable absente : 503 et un message, jamais le portail par défaut | Ni changement d'offre ni résiliation en libre-service pour un contrat | Variable sur Vercel non revérifiée ici (la mémoire `stripe-entreprise-0211` du 02/11 la dit posée) |
| A8 · Script des prix de contrat | `scripts/stripe-entreprise.mjs:1-19` (usage), `:36-45`, `:63-80`, `:83-106`, `:108-114`, `:116-123` | Pose une fois le produit sans prix et le portail fermé (`:99-100`) ; crée un prix mensuel HT par contrat, sans prélèvement ; change un prix à blanc sans `--oui` (`:75`), sans prorata (`:77`) | Benj fixe et fait évoluer le prix de chaque contrat sans code (« le prix, c'est Benj », P5:54) | Clé LIVE (`:25-28`) : tout geste réel attend le « go » écrit de Benj, contrat par contrat (`:18`) ; l'état LIVE (produit, portail) n'est pas relu ici (`--voir` non joué) |
| A9 · Console `/controle` | `app/api/controle/clients/[id]/action/route.ts:114` | L'action « offre » n'accepte que `OFFRES` (Studio, Signature) | — | Aucune voie de console pour poser ou changer un contrat Entreprise : tout passe par Stripe et A8 |
| A10 · Écran d'abonnement | `app/parametres/SectionAbonnement.tsx:107` | Affiche « Contrat sur mesure. » pour une offre `surDevis` | Le client voit un contrat, pas un « essai gratuit » | — |
| A11 · Tests de l'offre | `scripts/offres-affichage-qa.mjs:64-71`, mutation `:209-210` ; `scripts/essais-gratuits-qa.mjs:201`, `:216`, `:377-378` ; lanceur `scripts/tout-verifier.mjs:52`, `:57` | Entreprise = Signature plus `organisation.membres`, sur devis, hors `OFFRES`, sans essai ni colonne ; empreintes de Studio et Signature ; un prix marqué `entreprise` à 99 € reste Entreprise | Couvre déjà le dernier test obligatoire du prompt (P5:320) | Aucun test d'isolation entre organisations ni de droits par rôle (`scripts/organisations-qa.mjs` absent) |

### B. L'exécution automatique et ses garde-fous

| Élément | Où (fichier:ligne) | Ce qu'il fait | Ce qu'il apporte à l'offre | Ce qui manque |
|---|---|---|---|---|
| B1 · Pilote automatique | `lib/pilote/regles.ts:1-22`, `:27-34`, `:36`, `:53-63`, `:70`, `:79-82`, `:230-248`, `:251` ; file `actions_auto` et `pilote_reglages` (`supabase/migrations/0174_pilote_automatique.sql:21`, `:28` ; `lib/pilote/serveur.ts:1`) ; départ chaque minute (`app/api/agents/tic/route.ts:87-96`, pg_cron `presti-agents-tic`, `0101_ops_horloge.sql:164`) ; drapeau `lib/flags.ts:243` ; test `scripts/tout-verifier.mjs:162` | Une action préparée part seule après 10 minutes d'annulation, type par type ; 20 envois au plus par compte et par jour glissant ; au-delà de 24 h en file, retour à la main ; 6 types ; liste fermée d'outils ; gestes jamais automatiques (`:79-82` : encaisser, facturer, rembourser, payer, avoir, suppressions, hausse de tarifs) ; un prix non sourcé reste à la main ; idempotence par clé unique | « 10 minutes pour annuler, plafond par jour, liste fermée » (P5:225) existe, et l'Entreprise l'a (`assistant.pilote`, `lib/plans.ts:99`) | Il ne prend que les cartes de l'assistant et les réponses proposées (clés `carte:` et `proposition:`, `:251`) : rien pour une action préparée par n8n. Qui envoie au niveau 3 d'un workflow sur mesure : question 9 (C4 §0 bis l.241), défaut niveau 2, exception A proposée (l.247-251). Délai et plafond sont des constantes, pas réglables par contrat. Migration dans n8n à faire (C4 §0 bis l.165) |
| B2 · Lecture d'escalade | `lib/pilote/regles.ts:137` et suivantes (`MOTS_ESCALADE_TOUJOURS`, `sujetEscalade`), relue au départ (`:15-16`) | Relit les derniers messages du client ; litige, avocat, sinistre, assurance, urgence… renvoient l'action à la main | Base de la « porte de conformité » sur les sujets d'escalade (P5:194, P5:226) | Aucun équivalent côté n8n ; liste en cours de correction (arbre, audit `032-011`) |
| B3 · Registre commun des relances | `lib/relancesRegistre.ts:1-14`, `:18`, `:38-47`, `:57-59`, `:63-119` ; 7 appelants : `app/api/crm/relances/envoyer/route.ts`, `app/api/cron/relances/route.ts`, `app/api/factures/relances-auto/a-valider/route.ts`, `lib/assistant/actions-serveur.ts`, `lib/envoisServeur.ts`, `lib/pilote/executeur.ts:24`, `:85-90`, `lib/relancesImpayesMagasin.ts` ; test `scripts/tout-verifier.mjs:195` | Avant chaque relance : ce dossier (devis, conversation, factures) a-t-il été relancé, par l'un des 4 chemins, depuis moins de 3 jours ? Une lecture en erreur refuse | La règle de l'agent Relance (P5:190) existe, fermée en cas de doute | Code de l'app, que n8n n'appelle pas : un sous-workflow `lib-relance` devra relire les mêmes tables, et un envoi parti de n8n n'est pas l'un des 4 chemins lus. « Ne plus relancer ce client » (`relances_exclusions`, 0185) n'existe pas (C4 §0 bis l.64-65 ; exception B l.252-256) |
| B4 · Cartes « À valider » | `supabase/migrations/0157_assistant_actions.sql:31-51`, `:9-10`, `:55-59`, `:70` et suivantes ; journal `0150_assistant.sql` ; écrans `app/assistant/page.tsx`, `app/crm/assistant/PanneauAssistant.tsx`, `app/parametres/SectionPilote.tsx`, `app/factures/RelancesAuto.tsx`, `app/plateforme/Conversations.tsx` ; lecture par n8n `0189_role_lecture_n8n.sql:54` | Une action directe (annulable) ou à confirmer (carte qui attend le clic, avec expiration) ; réclamation atomique ; l'artisan lit les siennes, seul le service écrit | La boîte où doivent arriver les sorties des agents d'action (P5:112, P5:224) | Aucune table pour une carte née de n8n : `assistant_actions` exige `conversation_id` et `tour` (`0157:34-35`) ; `opportunites` et `opportunites_decisions` (0185) absentes en base (SQL du 02/11) ; colonnes Repéré, Préparé, À valider non faites (C4 §0 bis l.97-98) |

### C. L'envoi et les notifications

| Élément | Où (fichier:ligne) | Ce qu'il fait | Ce qu'il apporte à l'offre | Ce qui manque |
|---|---|---|---|---|
| C1 · E-mail au nom de l'artisan | `lib/email.ts:1-12`, `:18-20`, `:31-35`, `:82-100` ; mention d'IA `lib/mentionAssistant.ts:13-17` ; pied des impayés `lib/relancesImpayes.ts:55` ; Resend sous-traitant `lib/legalArtisan.ts:313` | Nom affiché = celui de l'artisan, jamais « Presti » ; Reply-To = l'artisan ; plafonds : 3 par destinataire et par jour, 80 par jour (réglables) ; mention « Message rédigé et envoyé automatiquement par l’assistant de … » quand rien n'est relu | La marque blanche des e-mails (P5:244, P5:262) est déjà tenue | n8n ne peut pas appeler ce code (n8n tire, l'app ne l'appelle pas, P5:117) : un workflow qui écrit au nom d'un client doit reproduire nom, Reply-To et mention (C4 §0 bis l.128-138), avec un identifiant d'envoi posé par Benj, absent du n8n d'Oracle (question 4, l.236). L'adresse technique reste `contact@prestiapp.fr` tant qu'aucun domaine neutre n'est vérifié (`lib/email.ts:18-20`) |
| C2 · Telegram | fondateur : `lib/agents/telegram.ts:4-8`, `:12`, `:32-37`, routes `app/api/agents/telegram/entree` et `/sortie` ; artisan : drapeau `canauxTelegram` (`lib/flags.ts:281`), sous-traitant `lib/legalArtisan.ts:314-315` | Pont du fondateur à commandes fermées (pause, état, consigne), alertes sans donnée de prospect ; bot propre à l'artisan, s'il en relie un | Le canal d'alerte de Benj que vise le workflow d'erreur commun (P5:162) | Aucun identifiant Telegram dans le n8n d'Oracle ; aucun workflow d'erreur commun |
| C3 · Notifications push | `lib/push.ts:6-16`, `:28` ; drapeau `pushWeb` (`lib/flags.ts:26`) ; appel du pilote `lib/pilote/serveur.ts:87` | Web Push (VAPID) vers l'artisan, 30 par heure au plus | Notifications internes gratuites (P5:247) | Les clés VAPID ne sont que dans l'app : n8n ne pousse rien (question 2, C4 §0 bis l.234) ; le push vise le compte, pas un membre (les membres n'existent pas) |
| C4 · Alertes de Presti à Benj | `lib/email.ts:141-158` (`notifierEntreprise`), `lib/alertes.ts:31-32` | E-mails internes : paiement, panne, tâche muette… ; Reply-To de l'auteur quand il y en a un | La supervision existe côté app | Les workflows n8n alertent par Slack `#presti-auto` (ADR-008, « Garde-fous ») : deux identifiants Slack existent dans n8n, aucun workflow d'erreur ne s'en sert |

### D. Les données métier

| Élément | Où (fichier:ligne) | Ce qu'il fait | Ce qu'il apporte à l'offre | Ce qui manque |
|---|---|---|---|---|
| D1 · CRM « atelier vivant » | capacité `crm`, Signature (`lib/plans.ts:94-96`) ; gardes `lib/crm/acces.ts:19`, `lib/crm/serveur.ts:41-48` ; drapeau `lib/flags.ts:172` ; étapes `lib/crm/pipeline.ts:30` ; tables `0141_crm_atelier.sql:30-39` (équipe), `:43`, `:61`, `:87`, `:99`, `:121`, `:139`, `:158` ; pointage sans compte `0174_pilote_automatique.sql:14-18`, `:65` ; fil d'activité `app/api/crm/assistants/activite/route.ts:7-12` | Pipeline, chantiers, équipe et véhicules, tâches, matériaux réservés, notes, journal, pointage du compagnon par lien, suivi pour le client | Le CRM standard que l'Entreprise hérite de Signature (P5:35) | Rien n'est réglable : 6 étapes en dur (`pipeline.ts:30`), rôles d'équipe en dur (`0141:34`), aucune table de champs propres ; un membre d'équipe est une fiche, pas un compte ; les procédures du client sont prévues « avec 0183 » (C4 §12.1 l.731-733), qui n'existe pas |
| D2 · Compta | `lib/comptaAssistant.ts:1-11` ; `lib/comptaAutomatisations.ts:1-12` ; capacité `chiffres.auto` (`lib/plans.ts:92`) ; drapeaux `lib/flags.ts:141`, `:144` ; écran `app/chiffres/` | L'IA dit où sont les choses et classe ; le code lit chaque cellule et calcule chaque centime ; alerte d'impayé et export mensuel au comptable (Signature) | « Le code calcule tous les montants » (P5:217) est déjà la règle | Ces automatisations sont du code de l'app, lancé par le cron Vercel de 8 h : à migrer dans n8n (C4 §0 bis l.172) ; aucune synchronisation avec l'outil comptable d'un client |
| D3 · Inventaire | `lib/inventaire/CONTEXT.md` ; capacités `lib/plans.ts:81` ; drapeau `lib/flags.ts:58` ; détecteur n° 9 (`briefs/c4-n8n-detecteurs.md:72`) | Stock par lieu, seuils, fournisseurs désignés par l'artisan, prix vus datés (à revérifier après 30 jours) | La matière d'un agent « stock et commandes » (P5:196) | Aucune synchronisation avec l'inventaire ou l'ERP d'un client ; la recherche chez les fournisseurs coûte des crédits (`lib/plans.ts:133-139`) |
| D4 · Journal et briefing | `0150_assistant.sql` (journal de l'assistant) ; `actions_auto`, journal du pilote (`lib/pilote/regles.ts:21`) ; `crm_journal` (`0141:158`) ; `lib/assistant/briefing.ts:1-6` | Chaque action de l'assistant et du pilote est tracée ; le briefing du matin assemble des comptes faits par le code | Une part de « ce que vos assistants ont fait » (P5:220) | Aucun journal des workflows n8n en base (`presti-detecteurs` n'écrit rien ; `passages_detecteurs`, 0185, absente) ; ni « Vos automatisations » (C4 §0 bis l.103-104), ni rapport du gérant, ni base de départ des KPIs |
| D5 · Données d'exemple | `lib/crm/exemple.ts:1-5`, `lib/tableau-de-bord/exemple.ts:1-4`, `lib/compta-exemple.ts:1-3` ; comptes `est_demo` écartés (`briefs/c4-n8n-detecteurs.md:40`) | Données fictives rendues par les vrais composants, jamais écrites en base | De quoi montrer la démo du mode A sans compte réel | Aucune entreprise fictive à plusieurs membres marquée « Exemple. » côté n8n (défaut de l'annexe 2 §3 : un JSON fictif dans les preuves) |

### E. n8n et l'accès aux données

| Élément | Où (fichier:ligne) | Ce qu'il fait | Ce qu'il apporte à l'offre | Ce qui manque |
|---|---|---|---|---|
| E1 · Rôle `n8n_lecture` | `supabase/migrations/0189_role_lecture_n8n.sql:1-22`, `:24-34`, `:38-57`, `:59-71` ; en base : rôle présent, connexion permise, 20 politiques `n8n_lecture_select` (SQL du 02/11) | Lecture seule, colonne par colonne, sur 20 tables, ni nom, ni e-mail, ni texte libre ; 3 connexions, 30 s, sans BYPASSRLS ; mot de passe posé par Benj seul (`:12-14`) | Le modèle d'un identifiant de lecture à droits minimaux (P5:165) | Inutilisé : aucun identifiant Postgres dans n8n ; Benj a choisi « Supabase account », tous droits (C4 §0 l.28-32) ; 3 tables lues par les détecteurs sont hors de ses droits (brief l.33-34) ; l'ADR-008 (« Conséquences ») parle encore d'un identifiant Postgres à créer : à concilier (C4 §0 bis l.220-223) |
| E2 · Identifiant « Supabase account » | n8n d'Oracle, type `supabaseApi`, projet personnel de Benj (MCP `list_credentials`, 02/11) ; doc n8n (docs.n8n.io/integrations/builtin/credentials/supabase/, lue le 02/11/2026) : un hôte et une clé secrète | Le seul accès de n8n à Supabase ; « je veux qu'il ait tous les droits » (C4 §0 l.28-29) | Un seul identifiant pour lire, puis écrire à blanc | Hôte mal réglé : la lecture réelle a rendu une page HTML (`.orchestre/preuves/032-003/resume.md:29-38`), geste de Benj. Avec une clé secrète ou `service_role`, la RLS ne borne pas ce que lit n8n : l'isolation repose sur le filtre par compte de chaque requête, comme pour les routes de l'app (`app/api/crm/assistants/activite/route.ts:9-10`). Aucun identifiant par client (P5:165). Type de clé inconnu : la doc n8n annonce la fin des anciennes clés `service_role` fin 2026 (à vérifier chez Supabase) |
| E3 · Workflows du n8n d'Oracle | MCP `search_workflows` (02/11 vers 16 h 48) | `presti-detecteurs` (inactif), `hermes-file-taches-v1` (actif, file `taches_hermes`), `reseau-neuronal-revue-hebdo` (actif) ; aucun dossier, aucune étiquette | L'instance tourne et porte déjà des automatisations internes de Presti | Aucun `ent-<client>-*` ni `lib-*` (P5:163) ; aucun workflow d'erreur ; un seul projet, personnel ; projets par client : documentation contradictoire (§ 3) |
| E4 · Workflow `presti-detecteurs` | § 3 ; brief `plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md:8-101` ; juge `scripts/detecteurs-n8n-qa.mjs` | Dix détecteurs en simulation, lectures GET bornées, bilan agrégé par détecteur | Le premier gabarit de la bibliothèque (lecture, détection, niveau par offre lu dans une copie des capacités, bilan) ; il compte déjà les comptes `entreprise` (brief l.40) | Voir § 3 |
| E5 · Construction : Hermes et Orca | `.claude/rules/architecture-outils.md:17`, `:76`, `:84`, `:94-95` | Hermes prépare et orchestre par Orca, `n8n-oracle` en lecture seule pour lui ; jamais montré à un client | Les outils de construction de Benj (P5:170) | Sa clé partage le crédit du produit : une clé à plafond mensuel reste à créer par Benj (`:94-95`) |

### F. L'étape 0 : la demande de démo

| Élément | Où (fichier:ligne) | Ce qu'il fait | Ce qu'il apporte à l'offre | Ce qui manque |
|---|---|---|---|---|
| F1 · Le flux d'aujourd'hui | `app/api/contact/route.ts:7-16`, `:37-40`, `:42-47`, `:51`, `:56-60` ; `lib/email.ts:27`, `:141-158` ; page `app/contact/Formulaire.tsx` | Champ piège ; nom, e-mail et message d'au moins 10 signes ; 3 envois par heure et par IP ; puis un e-mail à l'adresse des alertes, Reply-To du demandeur | Une demande de démo arrive, par e-mail seulement | Rien en base (`demandes_demo` absente, SQL du 02/11) ; aucune qualification ; aucun workflow (`presti-demande-demo` absent du n8n d'Oracle) ; motif, taille et activité ignorés par la route (C4 §0 bis l.177-179) ; pas de page `/entreprise` |
| F2 · Ce que prévoient les plans | C4 §0 bis : rangs 14 à 17 (l.83-90), 24 (l.103-104), volet démo (l.174-209, texte « Ce qui se passe ensuite » l.190-193) ; C4 §12.1 (l.716-750) ; lots L19 (l.845) et L20 (l.847) ; C2 §0 (l.17-18, l.21), §0 bis (l.75-78, l.96-98, l.118-157), lot hors chantier (l.286) | Partage par couche : la page et le formulaire au chantier 2, derrière `landingV2` ; la table, le workflow `presti-demande-demo` et la liste de `/controle` au chantier 4 (L19) ; la mise en place d'un client après contrat (L20) | Les étapes 0 et 4 à 8 du cycle (P5:48-58) sont dessinées, avec leurs garde-fous (jamais dans la file de `MaquetteForm`, C4 §0 bis l.185-186) | Rien n'est construit : L19 et L20 non commencés (C4 §14 l.819-821) ; `landingV2` n'existe que dans le worktree `presti-c2` (branche `landing-0111`, `presti-c2/lib/flags.ts:69`, baissé), pas sur `main` ; questions 4, 6 (c, d) et 9 ouvertes |

### G. Conformité, SMS, organisations

| Élément | Où (fichier:ligne) | Ce qu'il fait | Ce qu'il apporte à l'offre | Ce qui manque |
|---|---|---|---|---|
| G1 · Sous-traitants et registre | `lib/legalArtisan.ts:307-316` ; `docs/registre-traitements.md` | Sous-traitants des données de l'artisan : Presti, Supabase, Vercel, Anthropic, Resend, Telegram | La base de la liste « art. 28 » d'un client (P5:260) | Ni Oracle ni n8n dans cette liste ; le registre nomme Oracle pour la prospection (§ 11, `docs/registre-traitements.md:146` ; § 24, `:352`) et pour le savoir des agents (§ 12, `:168`), jamais n8n (aucune occurrence) ; une section « Lectures de n8n sur le serveur Oracle » est exigée avant la première publication (C4 §0 bis l.146-147) ; aucun modèle de contrat de sous-traitance |
| G2 · SMS | ADR-007 (vault) ; C4 §11 (l.659-683) | Conçu : lien `sms:` gratuit d'abord, portes dans l'ordre, plafonds (10 par artisan, 100 par jour, 8 € HT), STOP | Le canal SMS de l'offre (P5:246) est pensé | Rien n'est construit : `lib/sms/` absent, `sms_envois` absente en base, 0186 introuvable ; fournisseur, coût et forme du STOP attendent Benj (question 3, C4 §0 bis l.235) |
| G3 · Organisations multi-membres | C4 §10 (l.623-658), §8 (l.531-580) | Conçues : 1 organisation = 1 compte en v1 ; rôles titulaire, associé, administratif, compagnon, invité ; interrupteur `organisations_ouvertes` faux ; politiques `org_*` ajoutées sans toucher l'existant | L'équipe de l'offre (P5:38) et l'isolation (P5:259) | Aucune migration écrite (§ 2), ni `lib/organisations/droits.ts`, ni `scripts/organisations-qa.mjs` ; préalable M0 : une sauvegarde prouvée (C4 §10 l.641) |

## 2. Migrations des organisations : où elles sont

**Réponse courte : nulle part.** Les six migrations 0183 à 0188 n'existent que comme spécification dans le plan du chantier 4. Aucun
fichier, aucun commit, aucun objet en base. Aucune n'est à appliquer.

| N° | Contenu prévu (C4) | Fichier | Git | Base (SQL du 02/11, 15:46 UTC) |
|---|---|---|---|---|
| 0183 `0183_organisations` (M1) | `utilisateurs`, `organisations`, `membres`, `invitations`, `droits_roles`, interrupteur faux ; une organisation et un titulaire par artisan (§8 l.538, l.552 ; §10 l.642) | introuvable | aucun commit | `organisations`, `membres`, `invitations`, `utilisateurs`, `droits_roles` : absentes |
| 0184 `0184_garde_session_membres` (M2) | garde de session de 0138 étendue aux membres (§8 l.560 ; §10 l.643) | introuvable | aucun commit | non mesurable par une table (corps de fonctions) |
| 0185 `0185_automatisation` | `evenements_metier`, `detecteurs_reglages`, `autonomie_reglages`, `passages_detecteurs`, `opportunites`, `opportunites_decisions`, `relances_exclusions`, colonne `motif` des arrêts d'impayé (§8 l.544-547, l.562-567) | introuvable | aucun commit | `opportunites`, `evenements_metier`, `relances_exclusions` : absentes |
| 0186 `0186_sms_clients` | `sms_envois`, `sms_oppositions`, `sms_expediteurs` (§8 l.568) | introuvable | aucun commit | `sms_envois` : absente |
| 0187 `0187_factures_envoyee_le` | colonne `factures.envoyee_le`, qui manque au détecteur n° 5 (§8 l.570) | introuvable | aucun commit | colonne absente |
| 0188 `0188_garde_session_rejouee` (M6) | la boucle de 0138 rejouée sur chaque table à RLS (§8 l.571 ; §10 l.644) | introuvable | aucun commit | non mesurable par une table |

Comment c'est établi (02/11/2026, vers 16 h 40-17 h) :
- `git -C C:/Users/benja/Documents/presti log --all --oneline -- 'supabase/migrations/018[3-8]*'` : **sortie vide**. `--all` couvre les
  branches locales, les branches distantes connues et la remise `stash@{0}` (du 11/10). Le dépôt distant n'a pas été relu (pas de `fetch`).
- `git worktree list` : 35 entrées. Les dossiers `supabase/migrations/` des 29 worktrees présents sur le disque ne contiennent aucune
  0183 à 0188. Seul `.claude/worktrees/comptes-fournisseurs-0a934e` (branche `claude/comptes-fournisseurs-0a934e`) porte une migration
  hors de `main` : `0182_comptes_fournisseurs.sql` et son jumeau, d'un autre sujet. Les 6 worktrees du dossier Temp sont « prunable » :
  leurs dossiers ont disparu.
- Sur `main`, `supabase/migrations/` passe de `0181_relances_impayes_a_valider.sql` à `0189_role_lecture_n8n.sql`.
- Recherche par nom dans `Documents/presti`, `Documents/presti-ops` et les dossiers de travail de Claude (`AppData/Local/Temp/claude`) :
  seulement des images de vidéo nommées `0183.png` à `0188.png` (dossier `scratchpad/f15/` d'une session).
- Fichiers compagnons absents eux aussi : `lib/organisations/`, `scripts/organisations-qa.mjs`, `scripts/automatisation-schema-qa.mjs`,
  `lib/sms/`, `scripts/demande-demo-qa.mjs`, `scripts/n8n-specs-qa.mjs`. Seul `scripts/detecteurs-n8n-qa.mjs` existe (non suivi par git).
- En base, par une requête en lecture seule (`to_regclass` et `information_schema`, aucune donnée lue) : aucun des objets prévus. Le rôle
  `n8n_lecture` (0189) est bien là, avec ses 20 politiques.

L'écart à corriger dans les documents (rien n'est corrigé ici) : l'annexe 1 §D (P5:386) et le plan (C4 l.470 « 0183 à 0188 préparées, non
appliquées » ; C4 §10 l.657 « Cette nuit : M1, M2 et M6 sont écrites, avec leurs jumeaux et leurs tests ») disent « préparées ». La phrase
juste est celle du même plan, à jour du 02/11 midi : « Rien d'autre n'a commencé : ni les drapeaux de L0, ni les migrations 0183 à 0188, ni
`lib/sms` » (C4 §14 l.819-821). Les numéros 0183 à 0188 restent libres : 0182 est pris par la branche des comptes fournisseurs, 0189 par
`n8n_lecture`.

Ce que ça bloque : rien en mode A (n8n et données fictives seulement, annexe 2 §1). En mode B, tout ce qui touche l'équipe : il faudra
écrire M1, M2 et M6 avec leurs jumeaux et leurs tests (lot L6, session principale), prouver la sauvegarde (M0, C4 §10 l.641), obtenir le
« go » écrit de Benj lot par lot (C4 §15 l.863), coller, puis seulement créer et lever le drapeau `organisations`.

## 3. État d'Oracle et de `presti-detecteurs`

### Le serveur Oracle (`presti-usine`)

| Mesure | Valeur | Source |
|---|---|---|
| Architecture | aarch64, 4 cœurs | session principale, 02/11 vers 15 h 55 |
| Mémoire | 23 974 Mo, dont 22 135 Mo disponibles | idem |
| Disque `/` | 96 Go, 29 Go utilisés (31 %) ; il était à 99 % le 11/10 (P5:359), puis 11 Go libres à l'écriture de l'ADR-003, avant le ménage du 01/11 (mémoire `chantiers-0111-etat-et-branchements`) | idem |
| Charge | 0,17 | idem |
| Docker | non accessible à l'utilisateur `usine` | idem |
| n8n | `127.0.0.1:5678/healthz` répond 200 ; version 2.45.6 relevée le 01/11 (`.claude/rules/architecture-outils.md:69-70`) | idem |
| Workflows | 3 : `presti-detecteurs` (inactif), `hermes-file-taches-v1` (actif), `reseau-neuronal-revue-hebdo` (actif) ; aucun dossier, aucune étiquette | MCP `search_workflows`, 02/11 vers 16 h 48 |
| Identifiants | 4, tous dans le projet personnel de Benj : « Supabase account » (`supabaseApi`), « Slack account » et « Slack account 2 » (`slackApi`), « OpenAI account » (`openAiApi`) ; ni Telegram, ni e-mail, ni Postgres | MCP `list_credentials`, même heure, aucun secret lu |
| Projets | un seul, personnel. La documentation n8n se contredit : la page RBAC réserve les projets en auto-hébergé à « Registered Community, Business, Enterprise » (docs.n8n.io/user-management/rbac/projects/, lue le 02/11/2026) ; la page de l'édition Community classe les projets parmi ce qu'elle n'a pas, l'enregistrement gratuit ne débloquant que les dossiers, le débogage dans l'éditeur et les données d'exécution (docs.n8n.io/hosting/community-edition-features/, lue le 02/11/2026) | à vérifier sur l'instance avant de compter sur « un projet et une étiquette n8n par client » (C4 §12.1 l.736) |

Ce que ça permet : de la place pour la démo du mode A et un premier client, à remesurer avant chaque ajout (P5:166). Ce qui reste
inconnu : la charge par conteneur (n8n et ses exécuteurs, freellmapi, SearXNG, le service du port d'Ollama, ADR-003 « Conséquences »),
puisque Docker n'est pas lisible par `usine`. Ce qui manque dans n8n pour l'offre : un identifiant Telegram, un identifiant d'envoi et,
pour la rédaction par le modèle, un identifiant Anthropic (gestes de Benj), un workflow d'erreur commun, des étiquettes `ent-<client>` et `lib-*`.

### Le workflow `presti-detecteurs` (tâche 032-003)

| Point | État | Source |
|---|---|---|
| Identité | id `J8pduyxn9seR8Z9t`, projet personnel de Benj, ni dossier ni étiquette | export ; MCP |
| Publication | inactif, jamais publié (`active: false`, `activeVersionId: null`), aucun déclencheur actif | export ; MCP `search_workflows` |
| Structure | 34 nœuds : un déclencheur (6 h 45, Europe/Paris), un nœud Supabase (`getAll`, une ligne de `regles_automatisation`), 15 lectures HTTP GET à `select=` borné, 16 nœuds Code, une note | `.orchestre/preuves/032-003/presti-detecteurs.workflow.json` (compté le 02/11) ; brief l.14-25 |
| Écritures et envois | aucun : ni écriture, ni envoi, ni Slack, ni modèle ; seule sortie, un bilan agrégé par détecteur | `resume.md:16-20` ; brief l.10-12, l.100-101 |
| Identifiant | « Supabase account » sur les 16 nœuds de lecture ; hôte mal réglé : l'exécution réelle 319 a rendu une page HTML de 85 226 caractères, aucune ligne | `resume.md:22-40` |
| Essai sur données fictives | exécution 320, succès, 313 ms, bilan égal au calcul fait à la main | `resume.md:42-60` |
| Juge hors ligne | `scripts/detecteurs-n8n-qa.mjs` : OK, 61 cas fictifs, 18 mutants sur 18 rouges ; tâche 032-003 rendue PASS (`.orchestre/digest.md:89`, 15:13 UTC) | `resume.md:62-72` ; `verifier.log` |
| Branche d'erreur | absente (`settings.errorWorkflow` nul) | export ; `resume.md:84-85` |
| Lanceur | `detecteurs-n8n-qa` absent de `SUITES` (`scripts/tout-verifier.mjs`) : personne ne le rejoue | `resume.md:86-87` ; recherche dans le lanceur |
| Audit | `032-010`, offensif et distinct de l'auteur, en cours depuis 15:42 UTC | `.orchestre/digest.md:26` |
| Réserves | seuils sans source (n° 6 : 1 et 3 jours ; n° 8 : 7 jours) ; écarts assumés au plan §9 (n° 1, 2, 9, 10) ; cartes et refus récents non lus (0185) ; pagination non exercée à l'échelle ; registre des traitements sans section n8n | `resume.md:74-87` |

Ce qu'il apporte à l'offre : la forme que le prompt demande à chaque sous-workflow (P5:159-164) y est déjà, sur un cas réel de Presti.
Mode simulation ; colonnes permises tenues par le juge ; copie figée des capacités comparée à `lib/plans.ts`, jamais `plan === …` ;
niveau proposé par offre ; idempotence par clé d'étape ; rejeu hors ligne avec mutants. C'est le premier gabarit de l'agent Alerte, à
reprendre en `lib-*`. Ce qui manque avant toute publication : l'hôte de l'identifiant corrigé par Benj, une branche d'erreur (lot L12),
l'inscription au lanceur, la fin de l'audit `032-010`, la section du registre, puis le « go » de Benj.

## 4. Écarts relevés, à concilier (rien n'est corrigé ici)

1. Migrations 0183 à 0188 dites « préparées » (P5:386 ; C4 l.470, l.657) mais introuvables (§ 2) ; C4 l.819-821 dit vrai.
2. `lib/plans.ts:44` cite un drapeau `organisations` absent de `lib/flags.ts` (lot L0, C4 §14 l.804).
3. ADR-008, « Conséquences » : un identifiant Postgres en lecture seule « à créer par Benj » ; Benj a choisi le 02/11 « Supabase account »,
   tous droits (C4 §0 l.28-32) ; la mise à jour de l'ADR est une tâche prévue (C4 §0 bis l.220-223).
4. Le webhook Stripe n'écoute pas `customer.subscription.created` (A5) : à éprouver en mode test avant le premier contrat.
5. La documentation n8n se contredit sur les projets en édition Community (§ 3).
6. Annexe 1 §B : disque d'Oracle à 99 % le 11/10 (P5:359) ; mesuré à 31 % le 02/11.
7. Annexe 1 §D (P5:384) : « le portail ne doit pas laisser changer d'offre (réglage du compte Stripe, à Benj) ». Selon la mémoire du 02/11,
   c'est fait par `scripts/stripe-entreprise.mjs:92-106`, et la route le respecte (`app/api/stripe/portail/route.ts:53-58`) ; l'état LIVE
   n'est pas relu ici.

## 5. Lu pour cet inventaire

- Prompt 5 en entier (`prompts-benj/p5-entreprise-sur-mesure.md:1-435`).
- Réseau neuronal (MCP `cerveau`) : `regles_pour` (deux formulations ; la seconde rend `architecture-outils.md`, ADR-001, ADR-003) ;
  `chercher` sur l'offre Entreprise, la grille, les organisations, les ADR-007 et 008, les détecteurs, l'identifiant Supabase ; `lire` :
  mémoire `stripe-entreprise-0211`, mémoire `chantiers-0111-etat-et-branchements`, `wiki/concepts/Offres et grille tarifaire.md`,
  ADR-008 en entier, ADR-003 « Conséquences ».
- Code : `lib/plans.ts` (en entier), `lib/abonnementSync.ts` (en entier), `app/api/stripe/webhook/route.ts` (l.76-141, l.208-247 et
  types d'événements), `app/api/stripe/portail/route.ts` (en entier), `scripts/stripe-entreprise.mjs` (en entier),
  `app/api/controle/clients/[id]/action/route.ts` (l.22-51, l.107-159), `lib/pilote/regles.ts` (l.1-100, l.225-284),
  `lib/pilote/serveur.ts`, `lib/pilote/executeur.ts`, `lib/pilote/file.ts` (signatures), `app/api/agents/tic/route.ts:86-96`,
  `lib/relancesRegistre.ts` (en entier), `supabase/migrations/0157_assistant_actions.sql:1-80`, `0189_role_lecture_n8n.sql` (en entier),
  `0141_crm_atelier.sql:28-45`, `lib/email.ts` (l.1-60, l.136-158), `lib/agents/telegram.ts` (en entier), `lib/push.ts` (en-têtes),
  `app/api/contact/route.ts` (en entier), `lib/legalArtisan.ts:307-322`, `lib/mentionAssistant.ts:1-20`, `lib/comptaAssistant.ts:1-14`,
  `lib/comptaAutomatisations.ts:1-12`, `lib/inventaire/CONTEXT.md` (début), `lib/crm/pipeline.ts:30`, `lib/flags.ts` (drapeaux cités),
  `scripts/offres-affichage-qa.mjs:58-75`, `scripts/essais-gratuits-qa.mjs` (lignes « entreprise »), `scripts/tout-verifier.mjs` (lignes citées).
- Plans et preuves : C4 §0, §0 bis, §8, §10, §11, §12, §12.1, §14 (lots), §15 ; C2 §0, §0 bis ;
  `briefs/c4-n8n-detecteurs.md` (en entier) ; `.orchestre/preuves/032-003/resume.md` (en entier), export du workflow (structure),
  `verifier.log` (fin) ; `.orchestre/digest.md` (lignes 032-003 et 032-010) ; en-têtes des tâches 032-009, 032-010, 032-011, 033-001.
- Mesures : git (`log --all`, `worktree list`, `branch -a`, `stash list`, `status`), recherche de fichiers, SQL en lecture seule, MCP
  `n8n-oracle` en lecture, deux pages de docs.n8n.io et une page de credentials n8n, lues le 02/11/2026.
