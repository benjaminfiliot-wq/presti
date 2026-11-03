# Audit du fonctionnement réel de Studio et Signature (tâche 036-029, 03/11/2026 au soir)

Auditeur indépendant, en lecture seule, pôles audit et gestion-fiabilité. Écrit par Claude Code sur l'hôte d'agents d'Oracle, de 17 h à 18 h (UTC).
- Rien n'a été corrigé, lancé, publié, envoyé ni migré.
- n8n a été lu seulement, avec le MCP `n8n-oracle` : `search_workflows`, `get_workflow_details`, `search_workflow_executions`, `get_workflow_execution`,
  `list_credentials`, `search_data_tables`.
- Le code lu est la copie du dépôt sur l'hôte : commit `5cb575d` (« HEAD 74db706a du PC + travail en cours »), arbre modifié.

**Je n'ai pas pu vérifier** :
- la base de production : aucun accès depuis l'hôte, pas de MCP Supabase ici, réseau sortant refusé ;
- le site en ligne (`556eab2`) : même raison ;
- le contenu du conteneur n8n (variables, modules) : `docker` et `ssh` sont refusés aux agents.

Ce que la session principale annonce sur ces trois points est repris comme **déclaré**, jamais comme constaté.

## En tête : le trou principal

**Aucune carte préparée par les agents n8n ne peut aujourd'hui atteindre un écran, même une fois `systemeAgents` levé.**

La chaîne est coupée à quatre endroits, chacun constaté.

1. **Rien ne crée les événements que le Cerveau doit lire.**
   - Le Cerveau route des événements typés `demande_recue`, `devis_a_preparer`, `relance_due`, etc. (nœud « Aiguiller » de `presti-cerveau`, `596OC5mL2aMBq6SD`, constante `ROUTES`).
   - Ces événements vivent dans `evenements_metier` (`supabase/migrations/0185_automatisation.sql:125`).
   - Aucune ligne de `app/` ni de `lib/` n'écrit dans cette table : `grep -rn evenements_metier app lib` ne rend qu'un commentaire, `lib/flags.ts:338`.
   - `demande_recue` n'apparaît que dans des juges, des contrats et des exports n8n (`scripts/*-qa.mjs`, `contrats/cerveau.json`, `.orchestre/preuves/…`).
   - Le seul producteur prévu est `lib-capturer-lead`, en simulation : « rien lu ni écrit » (sa description dans n8n).
2. **Les lectures du Cerveau sont des emplacements vides.**
   - Les trois nœuds « Lire l'interrupteur général », « Lire les comptes » et « Lire les événements non traités » sont des `n8n-nodes-base.noOp`. Leur requête réelle n'existe qu'en note.
   - Non épinglé, l'interrupteur ne rend rien. Le passage s'arrête donc toujours sur `interrupteur_general_coupe` (nœud « Bilan du passage »).
   - Les tables nommées en note ne correspondent pas au schéma :
     - `systeme_reglages` n'existe dans aucune migration (grep vide hors `.orchestre/preuves/036-001` et `036-003`) ;
     - `departements_reglages` est lue avec des colonnes `offre, interrupteurs, accueil, empreintes_connues, cles_existantes` qui n'existent pas. La table a une ligne par département avec `palier, en_marche, plafond_jour…` (`0193_systeme_agents.sql:184-198`) ;
     - `evenements_a_traiter` est lue avec `demande, donnees`. La vue réelle s'appelle `n8n_evenements_a_traiter` et porte `faits, objet_type…` (`0193_systeme_agents.sql:425-436`).
3. **Le Cerveau ne sert que le palier « simulation ».** Le code d'« Aiguiller » saute tout compte dont `palier !== 'simulation'`, avec le motif `palier_non_branche` et le commentaire « ombre et réel ne sont pas branchés ici ». Le mode ombre ne peut donc pas passer par le Cerveau.
4. **L'écriture d'une carte n'existe pas, et sa cible n'est lue par personne.**
   - Hors simulation, `lib-executer` (`ADX5mPWqIvq1LGs6`, version publiée) mène au nœud `stopAndError` « Hors simulation : effet réel non branché (mode A, tâche 035-005) ».
   - L'effet prévu vise `POST /rest/v1/opportunites?on_conflict=organisation_id,cle` ou `pilote_file` :
     - `opportunites` a `artisan_id`, pas `organisation_id` (`0185_automatisation.sql:227-241`) ;
     - `pilote_file` n'existe dans aucune migration ;
     - aucun fichier de `app/` ni de `lib/` ne lit `opportunites` (grep vide).
   - Les écrans de cartes existants lisent `assistant_actions` : `app/api/aujourdhui/route.ts:141`, `app/api/systeme/[vue]/route.ts:43`, `app/api/crm/assistants/activite/route.ts:19-21`.

**Ce qui marche aujourd'hui pour un artisan payant, c'est le produit codé dans l'app** :
- la réponse IA aux demandes ;
- les relances par le cron Vercel ;
- les devis et factures ;
- l'assistant de gestion et ses cartes `assistant_actions` ;
- le pilote de Signature, sur le tic.

Le système d'agents n8n de Studio et Signature est une **maquette fonctionnelle en simulation** : bancs verts sur données « Exemple. », aucun branchement au réel.

## 1. La chaîne d'un vrai artisan, maillon par maillon

Légende : **marche** (en production selon le code, et pour n8n selon l'exécution relue) ; **bloqué** (construit, mais un geste ou un drapeau manque) ; **absent** (ni code ni workflow).

### 1.1 Studio (« Studio prépare, l'artisan valide », `lib/plans.ts:11`)

| # | Maillon | État | Ce qui bloque | Preuve | Qui lève |
|---|---|---|---|---|---|
| S1 | Inscription, essai sans carte de 7 jours, abonnement Stripe | **marche** | aucun drapeau | `app/api/account/inscription/route.ts:21` ; `app/api/subscribe/route.ts:61`, `:96-97` ; `app/api/stripe/webhook/route.ts` ; prix 30 € déclaré en ligne (`RAPPORT-0311.md:30`, non revu en direct) | — |
| S2 | « Connecter » Gmail | **bloqué** | drapeau `connexions: false` (`lib/flags.ts:344`) ; Gmail fermé tant que `GOOGLE_VERIFICATION_GMAIL !== 'accordee'` (`lib/connexions/oauth.ts:37-40`) ; vérification OAuth Google non faite | `lib/connexions/routes.ts:62` (404 drapeau baissé) | Google (vérification), puis Benj (variable, accord de lever) |
| S3 | « Connecter » Google Agenda et Drive | **bloqué** | drapeau `connexions` ; `BOITE_CLE_N8N` à poser (déclaré non posé) | `lib/connexions/oauth.ts:9`, `:31-35` ; `lib/connexions/chiffrement.ts:19` | Benj (clé, drapeau), puis Claude Code (lever, après accord) |
| S4 | « Connecter » Outlook | **absent** | aucune route OAuth Microsoft | grep `app/api`, `lib` : seul `connecteurs/outlook.md` le décrit | Claude Code (construire) ; Benj (application Microsoft) |
| S5 | « Connecter » IMAP (boîte quelconque) | **absent côté écran**, **bloqué côté n8n** | aucune route de saisie IMAP dans `lib/connexions` ; `lib-boite-*` épinglés ; modules `imapflow` et `nodemailer` à poser dans le conteneur (déclaré non posé) | `lib/connexions/oauth.ts:9` (Google seul) ; `journal-mise-en-service.md:18-20` | Benj ou session principale en root (conteneur) ; Claude Code (écran) |
| S6 | WhatsApp, Facebook et Instagram | **bloqué** | `canauxWhatsapp: false` (`lib/flags.ts:70`), `canauxReseaux: false` (`:72`) ; Instagram et Facebook sont Signature (`canaux.reseaux`, `lib/plans.ts:97`) | `lib/canaux/regles.ts:27` | Benj (comptes Meta, accord) |
| S7 | Telegram | **marche** (canal existant, hors « Connecter ») | — | `canauxTelegram: true` (`lib/flags.ts:281`) ; `app/api/canaux/telegram/route.ts:48` | — |
| S8 | Copie n8n du client (`presti-provisionnement`, `client-<slug>-*`) | **absent dans n8n** | `presti-provisionnement` absent de n8n (75 workflows listés, aucun) ; aucune copie `client-*` ; aucune table de données `presti_provisionnement` (`search_data_tables` ne rend que `taches_hermes`) ; aucun identifiant n8n API ni Google (`list_credentials` : Supabase, Anthropic, deux Slack, OpenAI) ; rien dans l'app ne le déclenche | export seul : `.orchestre/preuves/036-021/presti-provisionnement.workflow.json` ; `scripts/deployer-client-n8n.mjs:536-538` (`active: false`, `a_blanc`) ; `provisionnement.md:27-36` | Benj (import, identifiants, variables) ; Google (pour Gmail) |
| S9 | Une demande arrive (page publique, `/api/leads`) | **marche** (app) | — | `app/api/leads/route.ts:44` ; `accuseParN8n: false` (`lib/flags.ts:334`) : l'accusé et l'avis partent de la route (`leads/route.ts:410-421`) | — |
| S10 | La demande devient un événement pour n8n | **absent** | aucun écrivain de `evenements_metier` dans l'app ; `lib-capturer-lead` en simulation | voir « En tête », point 1 | Claude Code (code, schéma), puis Benj (go) |
| S11 | Le Cerveau trie, le chef prépare | **bloqué** (simulation seulement) | lectures `noOp` ; tables et colonnes lues inexistantes ; palier « simulation » seul servi | `presti-cerveau` (nœuds « Lire … », « Aiguiller ») ; bancs verts sur données fictives (`journal-mise-en-service.md`, 036-027 : exécution 882) | Claude Code (brancher les lectures sur 0193), puis Benj (go) |
| S12 | La carte s'affiche et l'artisan la valide | **absent** pour les cartes n8n ; **marche** pour les cartes de l'assistant intégré | `lib-executer` s'arrête hors simulation ; `opportunites` lue par personne ; colonne `organisation_id` inexistante | voir « En tête », point 4 ; validation existante : `app/api/assistant/actions/route.ts:16-30` | Claude Code (écrivain et écran), Benj (go) |
| S13 | Réponse préparée à une demande (app) | **marche** | mode « assistée » par défaut (`lib/plateformeConfig.ts:45`) ; Studio n'a pas `plateforme.ia.auto` (`lib/plans.ts:94`) | `app/plateforme/Conversations.tsx` (proposition à valider) | — |
| S14 | Brouillon dans la boîte de l'artisan (`lib-boite-brouillon`) | **bloqué** | épinglé, simulation ; IMAP non branché (S5) | description n8n de `zw2k0vo9wpv7lNfr` | Benj et session principale (conteneur), puis Claude Code |
| S15 | Relances de conversation J+2, J+5, J+10 préparées | **marche** (cron Vercel) | `presti-relances` (n8n) inactif, simulation | `app/api/cron/relances/route.ts` ; `presti-relances` `active: false` | — (migration n8n à finir, 5 pas) |
| S16 | Relances d'impayés préparées (opt-in) | **marche** | — | `relancesImpayes: true` (`lib/flags.ts:179`) ; `peut(...,'factures.relances')` (`app/api/factures/relances-auto/route.ts:23`) | — |
| S17 | Devis et factures (création, envoi au clic) | **marche** | — | `app/api/devis/[id]/envoyer/route.ts`, `app/api/factures/[id]/envoyer/route.ts` | — |
| S18 | Rapport du matin envoyé à l'artisan | **absent** côté artisan ; **bloqué** dans n8n | `presti-briefing-matin` actif mais en simulation : « n'écrit et n'envoie rien » (description n8n) ; dans l'app, le briefing n'existe qu'à la demande | `lib/assistant/outils.ts:242` ; bouton de `/assistant` | Claude Code (sortie réelle), Benj (go) |

### 1.2 Signature (« Signature envoie seul », `lib/plans.ts:79-80`)

Tous les maillons S1 à S12 valent aussi pour Signature. Seules les différences sont écrites ici.

| # | Maillon | État | Ce qui bloque | Preuve | Qui lève |
|---|---|---|---|---|---|
| G1 | Inscription, essai de 21 jours, 60 € | **marche** | — | `app/api/subscribe/route.ts:30` ; prix déclaré en ligne (`RAPPORT-0311.md:30`) | — |
| G2 | Réponse qui part seule (app) | **marche** si l'artisan règle « auto » | défaut « assistée » (`lib/plateformeConfig.ts:45`) | `plateforme.ia.auto` (`lib/plans.ts:94`) ; `lib/plateformeConfig.ts:183-185` | l'artisan (réglage) |
| G3 | Pilote automatique, 10 minutes d'annulation | **marche** si l'artisan l'active | coupé par défaut sur chaque compte (`lib/pilote/regles.ts:100`) | `piloteAutomatique: true` (`lib/flags.ts:243`) ; `app/api/agents/tic/route.ts:87-95` ; `peut(plan,'assistant.pilote')` (`lib/pilote/regles.ts:269`) | l'artisan |
| G4 | Envoi seul par n8n (`lib-boite-envoyer`, SMTP) | **bloqué** | nœud d'envoi désactivé, simulation ; SMTP non posé dans le conteneur | description n8n de `UkMVpSxETSIY4Mku` ; `journal-mise-en-service.md:18-20` | Benj et session principale (conteneur), puis Claude Code |
| G5 | Relances et impayés partis seuls | **marche** (app, opt-in pour les impayés) | — | `relances.auto`, `factures.relances.auto` (`lib/plans.ts:94`) ; `app/api/factures/relances-auto/route.ts:25` | l'artisan (case) |
| G6 | Pilote dans n8n (« carte ou pilote », `lib-decider`) | **absent au réel** | `lib-executer` s'arrête hors simulation ; `pilote_file` n'existe pas | voir « En tête », point 4 | Claude Code, puis Benj |
| G7 | CRM et CRM 3D | **marche** (sur les vraies tables du compte) | — | `peut(plan,'crm')` (`lib/crm/acces.ts:19`) ; `crm: true` (`lib/flags.ts:172`) ; `lib/crm/serveur.ts:107-121` | — |
| G8 | Mode ombre sur un compte volontaire | **absent** | aucun compte volontaire (`mode-ombre.md:111`) ; le Cerveau ne sert pas le palier « ombre » ; aucun écran pour noter les cartes (`mode-ombre.md:108`) | voir « En tête », point 3 | Benj (volontaire, accord écrit), puis Claude Code (palier « ombre ») |

## 2. Où l'artisan voit et valide les cartes des agents

**Trou, en tête de ce rapport : aucune surface ne montre les cartes produites par n8n.**

- `app/systeme/` (`systemeAgents: false`, `lib/flags.ts:340`) ne les montrerait pas non plus : `app/api/systeme/[vue]/route.ts:43` et `:67` lisent `assistant_actions`, jamais `opportunites`.
- Cartes de l'assistant intégré (`assistant_actions`, créées par `lib/assistant/actions-serveur.ts`) : elles sont visibles et validables aujourd'hui à trois endroits.
  - `/assistant` : `app/assistant/CarteView.tsx:57`, `app/assistant/page.tsx:254-262`, `POST /api/assistant/actions`.
  - `/crm`, en Signature : un compteur (`lib/crm/assistantCrm.ts:149`) et l'annulation du pilote (`app/crm/assistant/Activite.tsx:54-57`). On n'y confirme rien.
  - Écrans métier : relances d'impayés « à valider » (`app/factures/RelancesAuto.tsx`), propositions de réponse (`app/plateforme/Conversations.tsx`).
- L'écran qui réunit les quatre sources « À valider » est `app/dashboard/Aujourdhui.tsx` (`app/api/aujourdhui/route.ts:25-26`). Il est derrière `consoleV2: false` (`lib/flags.ts:315` ; `app/dashboard/page.tsx:238-245`) : un artisan voit l'ancien tableau de bord.
- L'outil de gestion (`app/crm/Gestion.tsx`, 036-020) n'a pas d'entrée « À valider » : « l'écran n'existe que dans `app/systeme/` » (`outil-gestion.md:25`).

**Pour que Benj ait ce qu'il veut (« tout dans l'outil de gestion »)**, trois gestes de Claude Code, chacun à faire approuver :
- (a) un écrivain réel des cartes n8n vers `assistant_actions` (le chemin de validation existe déjà), ou un lecteur de `opportunites` ;
- (b) la boîte « À valider » dans `app/crm/Gestion.tsx` et dans le CRM 3D ;
- (c) le tableau de bord « Aujourd'hui » ouvert à tous (`consoleV2`).

## 3. L'assistant de gestion selon l'abonnement

Constat d'ensemble : l'assistant est en service. Drapeau `assistant: true` (`lib/flags.ts:161`), accès par `peut(plan,'assistant')` (`lib/assistant/acces.ts:24`), Studio et au-dessus (`lib/plans.ts:89`).

| Capacité | Studio | Signature | Preuve | Drapeau |
|---|---|---|---|---|
| 21 outils de lecture et de brouillon (dont `briefing_du_matin`, `preparer_devis_brouillon`, `preparer_reponse`) | oui | oui | `lib/assistant/outils.ts:242`, `:247`, `:252` | `assistant` |
| 52 actions : 32 directes journalisées, 20 « à confirmer » en carte | oui (carte) | oui | `lib/assistant/outils-actions.ts:62-462` ; `lib/assistant/magasin.ts:12-44` | `assistant` |
| 22 actions CRM | non (`sansCrm`, `lib/assistant/actions-serveur.ts:900`) | oui | `lib/assistant/garde.ts:32` | `crm` |
| Pilote, 10 min, par type | non | oui | `lib/pilote/regles.ts:27`, `:269` | `piloteAutomatique` |
| Gestes jamais automatiques (encaisser, émettre, supprimer, lot de prix) | carte | carte | `lib/pilote/regles.ts:79-82` | — |
| Lot de relances : une carte, 20 au plus, jamais le pilote | oui | oui | `lib/assistant/actions-serveur.ts:1827` ; `outils-actions.ts:47` | `assistant` |
| Mode « fait tout seul » sur ordre net de l'artisan, sans texte de tiers lu | **oui, sans contrôle d'offre** | oui | `app/api/assistant/route.ts:131` ; `lib/assistant/cadrage.ts:325-328` ; `actions-serveur.ts:1884-1894` | `assistant` |

**Point à trancher par Benj.** En Studio, un ordre net comme « envoie le devis DEV-… à X » part sans carte. C'est un ordre écrit par l'artisan lui-même, voulu le 29/10 (`cadrage.ts:312-319`). Mais aucun `peut()` ne le borne, ce qui contredit à la lettre « rien ne part sans un clic » (`lib/plans.ts:11`, `.claude/rules/autonomie-abonnements.md`). Deux options :
1. garder : l'ordre écrit vaut le clic, et écrire cette exception dans la règle ;
2. borner en Studio par un `peut()` : carte toujours.

**Ce que le plan du chantier 4 promettait et qui manque** (`chantier-4-assistant-plan.md` § 0 bis et § 9) :
- trois priorités du matin livrées à 7 h 30 : à la demande seulement, le workflow n8n est en simulation ;
- impayé arrêté par une réponse, devenu carte : l'arrêt est écrit (`lib/relancesImpayesTour.ts:108`), mais il n'y a ni carte ni détecteur ;
- « ne plus relancer ce client » : la table `relances_exclusions` existe (0185), mais aucun lecteur ni bouton dans l'app ;
- marge estimée sur matériaux, `lire_aide`, mise en route en frise : absents ;
- assistant à côté de ce que l'artisan regarde : dans le CRM seulement (`app/crm/assistant/PanneauAssistant.tsx`) ;
- les douze détecteurs : `presti-detecteurs` est actif dans n8n, en simulation, lectures GET seulement (description n8n), sans sortie vers l'artisan ;
- aucune marque chez l'artisan : `app/assistant/page.tsx:180` affiche « Claude, Anthropic » (question 5 du plan, ouverte, à Benj).

## 4. Le CRM et le CRM 3D

- **Vraies données** :
  - `GET /api/crm/vue` mène à `chargerDossiers`, qui lit 14 tables filtrées par `artisan_id` de session (`lib/crm/serveur.ts:101-142`) ;
  - une erreur affiche un message, jamais des zéros (`app/crm/page.tsx:145`) ;
  - le temps réel écoute les tables (`useTempsReel`, `page.tsx:134`).
- **Données fictives** : un compte vide voit d'office un artisan fictif. Le bandeau « Exemple : données fictives, rien n'est enregistré » est affiché (`app/crm/page.tsx:132` ; `app/crm/mode.tsx:17`) et les écritures sont refusées (`app/crm/client.ts:19`).
- **3D** :
  - three, fiber et drei (`app/crm/atelier/Scene3D.tsx:15-17`) ;
  - chargé à la demande, avec repli 2D sur téléphone, sans WebGL ou en mouvement réduit (`app/crm/atelier/Atelier.tsx:33-47`) ;
  - bâtiment selon la base (`lib/crm/infrastructure.ts:32-33`) ;
  - panneau au clic (`Scene3D.tsx:752`, `Panneau.tsx:56`).
- **Écritures réelles** :
  - pipeline : journal seulement, aucun statut changé (`app/api/crm/pipeline/route.ts:9-35`) ;
  - planning (`app/api/crm/chantiers/[id]/route.ts:77`) ;
  - tâches et validation auto du chantier (`app/api/crm/taches/[id]/route.ts:40-58`) ;
  - notes (`app/api/crm/notes/route.ts:36`) ;
  - rappels et relances (`app/api/crm/relances/envoyer/route.ts`).
- **Ce qu'on ne peut pas faire** : modifier un contact (`app/api/crm/clients/route.ts:59-68` répond 405).
- **Offre** :
  - le CRM est Signature (`lib/plans.ts:100`, verrou serveur `lib/crm/acces.ts:19`) ;
  - l'outil de gestion s'ouvre à tous, avec un badge (`app/crm/Gestion.tsx:70`) ;
  - la maquette `maquettes/crm-atelier.html:7` dit « offre Studio » : écart à trancher par Benj.

**Fidélité aux vidéos du 01/11** (`plans/analyse-videos.md` l.672 « Arrêtez de construire des CRM », l.933 « Excel est mort », l.1051 « Blitz ») :

| Élément des vidéos | Présent ? | Preuve |
|---|---|---|
| Monde 3D cliquable de l'entreprise, panneau chiffré au toucher | oui | `Scene3D.tsx:752`, `Panneau.tsx:56` |
| Vols de caméra d'un bâtiment à l'autre | partiel (700 ms, pas de 0,95 s) | `Scene3D.tsx:390` ; visite du briefing `Atelier.tsx:307-339` |
| Mention « Exemple » sur des données fictives | oui | `app/crm/mode.tsx:17` |
| Demande tapée, actions qui s'empilent, carte « À valider » dans le CRM | partiel : fil d'activité, pas de carte à valider | `app/crm/assistant/Activite.tsx` |
| Boîte à trois colonnes Repéré, Préparé, À valider, cartes qui glissent | **absent** (drapeau `boiteAValider` prévu, inexistant) | `cadrage-p3.md:355` ; pipeline par liste déroulante `app/crm/Pipeline.tsx:70-72` |
| Barre d'avancement, une question à la fois | absent | aucune occurrence dans `app/crm` |
| Solde de crédits visible dans l'assistant du CRM | absent | aucune occurrence dans `app/crm`, `lib/crm` |
| « Décrire mon entreprise » pour bâtir le monde | absent | aucune occurrence dans `lib/assistant` |
| Accueil 3D de la landing à la place de l'anneau | absent | `app/page.tsx:172`, `:414` (`ObjetVivant`) |

## 5. Santé de n8n (lecture seule, 03/11 de 16 h à 17 h 05 UTC)

- **75 workflows**. **43 sont publiés**, actifs au sens de n8n 2.x (compte fait sur la sortie de `search_workflows`) : les 7 chefs `presti-dep-*`, `presti-cerveau`, 26 `lib-*`, 6 parents planifiés et `presti-erreurs`, plus `hermes-file-taches-v1` et `reseau-neuronal-revue-hebdo`.
- Inactifs :
  - les 10 `gabarit-artisan-*` ;
  - tous les bancs ;
  - les 6 `ent-exemple-*` ;
  - `presti-relances`, `presti-reponse-seule`, `presti-apres-chantier`, `presti-sauvegarde`, `presti-garde-sauvegarde` et `lib-erreur-commune`.
- Absents : `presti-provisionnement` et toute copie `client-*`.

| Planifié et publié | Rythme | Ce qu'il fait au réel aujourd'hui |
|---|---|---|
| `presti-cerveau` (596OC5mL2aMBq6SD) | chaque minute | s'arrête sur `interrupteur_general_coupe` : lecture `noOp` |
| `presti-boite` (yQK50I6JXchYBH7Y) | 5 min | branche « fermé » ; bilan mal étiqueté « appel en erreur » (`journal-mise-en-service.md`, 036-025) |
| `presti-accuse-reception` (VnU1onu9T4Z2asTu) | chaque minute | GET seulement, envois désactivés (description) |
| `presti-briefing-matin`, `presti-detecteurs`, `presti-suivi-artisan`, `presti-demande-demo` | quotidien ou horaire | simulation : GET seulement, rien n'est écrit ni envoyé (descriptions) |

**Exécutions en erreur depuis 16 h UTC** (`search_workflow_executions`, statuts `error` et `crashed`) : 7, toutes lancées par des bancs manuels, aucune par un déclencheur planifié.

| Exécution | Workflow | Cause relue |
|---|---|---|
| 750, 781 | `presti-dep-facturation` | enfant de rédaction en panne (banc) |
| 784, 802, 820 | `lib-rediger-message` | sortie vide : 700 jetons de sortie atteints par la réflexion du modèle (820 : `llm.tokens.out` 700, « Invalid JSON in model output ») |
| 790 | `lib-lire-photo` | même cause (300 jetons), et l'image n'était pas transmise (`passthroughBinaryImages: false`) |
| 844 | `presti-dep-facturation` | « Workflow is not active and cannot be executed » (petit-enfant non publié) |

- Aucune erreur après 16 h 49 UTC.
- Les bancs rejoués après la correction de 036-027 ont réussi : 847, 856, 866, 871, 882.
- **Limite** : `saveDataSuccessExecution: none` sur les planifiés. Une exécution planifiée réussie n'est pas conservée, et je ne peux prouver qu'elles tournent que par l'absence d'erreur.
- **Identifiants** : « Anthropic account » (`hZsu1Oq5gUfaa2jB`) sert aux deux nœuds Haiku, et les bancs consomment de vrais jetons (820 : 2 294 en entrée). « Supabase account » passe outre la RLS : chaque requête n8n doit filtrer `artisan_id` (`0193_systeme_agents.sql:31-32`).

## 6. Sécurité et conformité relevées en passant (grille `security-review`)

| Point | Risque | Preuve | Qui lève |
|---|---|---|---|
| Photo de prospect vers Anthropic (`lib-lire-photo`, version publiée `4e504c94`) | le registre des traitements § 23 dit « aucune photo n'est transmise » | `journal-mise-en-service.md`, 036-027, « Ce qui reste » | Benj (registre), avant tout passage réel |
| Copie n8n : clé `service_role` dans « Supabase account » | une requête sans filtre `artisan_id` lit tous les comptes | `0193_systeme_agents.sql:31-32` ; le Cerveau refiltre (`autre_compte`, « Aiguiller ») | Claude Code (juge de filtre sur chaque export), Benj (identifiant) |
| Gardes de session 0184 et 0188 non posées | déclaré « dont dépend chaque requête connectée » | `RAPPORT-0311.md:117-120` | Benj (go), après banc 0138 |
| État des migrations | contradictoire : en-tête de `0193_systeme_agents.sql:4` « NON APPLIQUÉE », `mise-en-service.md:14` « non appliquées », mais `RAPPORT-0311.md:14` « posées » | non vérifiable depuis l'hôte | session principale (lire `supabase_migrations` en base) |

## Verdict

- **Ce qui marche demain matin pour un artisan payant** : l'inscription et l'essai, la réponse IA (assistée ; automatique en Signature si réglée), les relances (cron Vercel), les devis et factures, l'assistant et ses cartes `assistant_actions`, le pilote de Signature, le CRM 3D sur ses vraies données (Signature).
- **Ce qui ne marche pas** :
  - tout le système d'agents n8n de Studio et Signature (Cerveau, chefs, copies client, « Connecter », mode ombre, rapport du matin envoyé) ;
  - les lectures du Cerveau sont des emplacements vides, l'écriture d'une carte n'existe pas, et aucun écran ne lit ces cartes. Les bancs verts ne prouvent que la simulation.
- **Gestes, dans l'ordre** :
  1. la session principale lit en base l'état réel des migrations ;
  2. Claude Code construit et soumet au plan l'écrivain des événements (demande et relance vers `evenements_metier`), les lectures réelles du Cerveau alignées sur 0193 (`departements_reglages`, `n8n_evenements_a_traiter`), le palier « ombre », puis l'écriture des cartes vers `assistant_actions` et la boîte « À valider » de l'outil de gestion ;
  3. Benj pose `BOITE_CLE_N8N`, les modules IMAP et SMTP, importe `presti-provisionnement` et ses identifiants, et choisit les deux volontaires ;
  4. Google accorde la vérification OAuth de Gmail, puis Benj lève `connexions` et `systemeAgents` ;
  5. mode ombre d'un département, comparé, puis le réel compte par compte, sur le « go » écrit de Benj.
