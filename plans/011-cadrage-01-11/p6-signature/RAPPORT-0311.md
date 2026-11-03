# Rapport du 03/11/2026 — prompt 6 (Signature et sur mesure), à lire par Benj

Écrit par Claude Code le 03/11 vers 14 h 30, complété au fil des lots. Le prompt de référence est
`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`. Son plan est `premiere-reponse.md`, et sa correction de l'après-midi
est `outillage/OUTILLAGE.md`.

## En bref

**Soir (mis à jour vers 19 h 15)**
- **En ligne (`cb49d81`, vérifié en direct)** : l'offre Entreprise refaite (036-026). Elle comprend :
  - la carte enrichie ;
  - la page `/entreprise` (200, « Parler à l'équipe », outils nommés, aucun prix, aucun « démo ») ;
  - le contact « Parlons de votre entreprise », avec quatre questions préremplies.
- **n8n réparé (036-027)** : la rédaction et la lecture de photo écrivent de nouveau. Les bancs sont verts, la chaîne est republiée en
  simulation.
- **Audit indépendant du fonctionnement (036-029, `audit-0311-fonctionnement.md`)**.
  - **Ce qui marche pour un artisan payant** : l'app actuelle. Elle couvre la réponse IA, les relances (cron Vercel), les devis et factures,
    l'assistant et ses cartes, le Pilote et le CRM 3D.
  - **Ce qui ne marche pas encore** : le système d'agents n8n n'est pas branché aux vraies données. Les lectures du Cerveau sont vides,
    aucune carte n'est écrite, aucun écran ne les montre.
  - **036-030**, lancé sur Oracle vers 18 h 50, branche les événements, les lectures, le palier « ombre », les cartes dans
    `assistant_actions` et la boîte « À valider » de l'outil de gestion, derrière un drapeau baissé. L'audit de conformité 036-028 tourne
    encore.
- **Google** : pas besoin de vérification pour démarrer. Sans elle, Google admet jusqu'à 100 utilisateurs, avec un écran d'avertissement.
  Mais **l'identifiant OAuth n'existe pas** : il n'y a ni `GOOGLE_OAUTH_CLIENT_ID` ni `GOOGLE_OAUTH_CLIENT_SECRET` dans Vercel. Il se crée
  dans la console Google Cloud de Benj :
  1. application Web ;
  2. retour sur `https://prestiapp.fr/api/connexions/google/retour` ;
  3. API Gmail, Agenda et Drive activées ;
  4. écran de consentement « Externe », publié « en production ».
- **Clé `BOITE_CLE_N8N` et modules du conteneur n8n** : il faut root sur Oracle. Le PC n'a que le compte `usine`, sans sudo ni docker. À
  relire d'abord : comment les exécuteurs de n8n 2.45.7 reçoivent une variable et des modules externes.
- **Ensuite, dans l'ordre** :
  1. 036-030 rapatrié, jugé, puis poussé ;
  2. le mode ombre sur un compte de test Studio, puis Signature ;
  3. la bascule type par type : n8n prend un envoi, et l'ancien code de l'app pour cet envoi est coupé. Jamais les deux à la fois, sinon
     les clients reçoivent deux messages.

**Fin d'après-midi (mis à jour à 17 h 50)**
- **En ligne à 17 h 30 (`556eab2`, vérifié en direct)** : la carte « Presti pour l'entreprise », sur devis, sous Studio et Signature, avec
  « Parler à l'équipe ». Tu l'as jugée trop pauvre : **036-026** la refait plus vendeuse et plus complète. Ce lot ajoute une page `/entreprise`
  (ce que l'entreprise obtient, ses outils, ses sept applications, le parcours en cinq temps, les garanties, les questions fréquentes) et un
  contact adapté. Tout y est vrai : aucun prix, aucun chiffre de gain, aucun témoignage. Il te sera montré en aperçu avant la production.
- **Migrations posées** : 0185, 0192, 0193, 0187, 0190 et 0191, chacune contrôlée après pose. Restent 0183, 0186, puis 0184 et 0188.
- **n8n, en simulation** :
  - **036-024** : 32 workflows publiés, plus les détecteurs et le briefing, trouvés déjà actifs.
  - **036-025** : ton identifiant « Anthropic account » est affecté aux deux nœuds Haiku, et les six workflows bloqués ont été publiés. Les
    bancs ont alors montré une panne : le modèle épuise son plafond de sortie (300 et 700 jetons) sans écrire un mot. Et `lib-lire-photo` ne
    reçoit pas l'image : il décrirait une photo qu'il ne voit pas. La chaîne de rédaction a donc été dépubliée proprement : Cerveau, suivi,
    facturation, rédaction.
  - **036-027 répare** ce réglage du modèle, fait passer l'image, rejoue les bancs, puis republie.
  - Aucune exécution planifiée en erreur depuis 16 h 14 UTC.
- **Prompt 2 (Entreprise)** : son plan est écrit (037-000, `p6-entreprise/premiere-reponse.md`). Il compte 16 lots, dont le CRM et les
  applications sur mesure, et pose 5 décisions avec leur réponse par défaut. **Il attend ton « approuvé ».**
- **Le branchement automatique des comptes (036-021, voie O3 a)** est construit et vérifié : `presti-provisionnement`, le déployeur et son
  juge à mutants.

**Plus tôt dans la journée**
- **16 h 30 : les nouveaux prix sont en ligne** (`0750e69`, déployé et vérifié en direct).
  - Studio est à 30 €, Signature à 60 € : l'accueil affiche 30 € et 60 €, `llms.txt` aussi, plus aucun 99 €.
  - L'unique essai Signature est passé de 99 € à 60 €, avec ton accord. Il reste en essai jusqu'au 13/11, sans prélèvement.
  - Les anciens montants restent reconnus pour les abonnements ouverts avant.
  - Ce déploiement a emporté le travail du jour, inerte derrière ses drapeaux baissés.
- **Vérifiés à 17 h** :
  - **036-019, le vrai multi-agents** dans les 16 gabarits. Chaque gabarit a un agent chef (Claude Sonnet, parseur strict, aucun montant) qui
    délègue à 2 ou 3 spécialistes en agents-outils (Claude Haiku, outils de lecture). Un « vérificateur des faits » s'ajoute là où il n'y avait
    qu'un agent.
  - **036-020, tout dans l'outil de gestion** :
    - Devis, Factures, Tarifs et Inventaire sortent du menu ;
    - « CRM atelier » devient « Outil de gestion » ;
    - `/crm` s'ouvre sur deux portes, « CRM 3D » et « Tableau de bord », avec tous les écrans métier dessous ;
    - aucune route n'est supprimée.
- **Production** : trois mises en ligne le 03/11, toutes vérifiées en direct :
  - `0750e69`, les prix ;
  - `fa5141a`, l'outil de gestion ;
  - `556eab2`, la carte Entreprise.

  Le reste est sur la branche de sauvegarde `nuit-0311`. Dans n8n, les gabarits restent inactifs, sans identifiant, avec la porte de
  simulation.
- **La correction de 14 h**, après ta remarque : les workflows n'affichaient aucun outil (132 nœuds Code pour un seul agent IA). Ils reçoivent
  maintenant leurs vrais nœuds, comme dans les vidéos et les 2 669 workflows des dépôts : Gmail, Outlook, IMAP, WhatsApp, Telegram, Facebook
  et Instagram, agents IA avec leurs outils.

## Lots vérifiés (juge hors ligne avec mutants, commande `verifier` au vert)

| Lot | Ce qui est construit | Où |
|---|---|---|
| 036-000 | le plan du prompt 1 : 5 parties, 12 lots, 5 décisions par défaut | `premiere-reponse.md` |
| 036-001 | le Cerveau `presti-cerveau` et l'Accueil (logique de tri et de décision), le banc d'essai | n8n, inactif |
| 036-002 | le schéma du système d'agents, migration 0193 **écrite, non posée**, drapeaux `systemeAgents` et `connexions` baissés | `supabase/migrations/0193_systeme_agents.sql` |
| 036-003 | la boîte mail : relève, brouillon, envoi | n8n, inactif |
| 036-004 | Suivi et relances : J+2, J+5, J+10, contrôleur de conflit | n8n, inactif |
| 036-005 | Devis, Facturation et encaissement, les montants tirés du code | n8n, inactif |
| 036-006 | Après-chantier et réputation : avis, demande d'avis consentie | n8n, inactif |
| 036-007 | Direction : page du matin, alertes, coût IA ; compétences des sept départements | n8n, inactif |
| 036-008 | Opérations : créneaux lus dans l'agenda, rappel, stock, import contrôlé | n8n, inactif |
| 036-009 | connecteurs « Connecter / Retirer » : OAuth avec état et PKCE, jetons chiffrés, retrait, expiration | `app/api/connexions/`, drapeau baissé (404) |
| 036-013 | **gabarits outillés de l'Accueil** : 4 gabarits, 86 nœuds (déclencheurs Gmail, Outlook, IMAP ; Facebook Graph pour Messenger, Instagram, Lead Ads ; deux agents IA Claude avec outils de lecture et parseur ; écritures Gmail, Outlook, SMTP, WhatsApp, Telegram derrière la porte) | n8n, inactifs |
| 036-014 | **gabarits outillés de l'argent** (Devis, Suivi, Facturation) : 3 gabarits, 117 nœuds (outils de lecture Sheets, Excel, Gmail, Outlook, Drive, Stripe ; Stripe en lecture seulement ; PDF dans Drive ou OneDrive ; exports ; envois Gmail, Outlook, SMTP, WhatsApp, Telegram, Twilio ; montants par le code) | n8n, inactifs |
| 036-015 | **gabarits outillés du terrain** (Après-chantier, Opérations, Direction) : 3 gabarits, 138 nœuds (fiche Google Business Profile, Google Agenda avec disponibilités en lecture, Drive et OneDrive, Sheets et Excel, Outlook, Telegram, WhatsApp, Twilio, Slack, Teams, six agents IA) | n8n, inactifs |
| 036-016 | **catalogue Entreprise, partie 1** : 4 gabarits, 328 nœuds (HubSpot, Pipedrive, Salesforce, Zoho, Odoo, Airtable, Notion, monday et leurs outils d'agent ; Brevo, Mailchimp, ActiveCampaign, Lemlist ; Facebook Lead Ads, Instagram et Facebook par Graph, LinkedIn, YouTube, X, Google Ads ; validation d'équipe Slack et Teams) | n8n, inactifs |

| 036-018 | **catalogue Entreprise, partie 2** : 5 gabarits, 343 nœuds (opérations avec Agenda, ClickUp, monday, Notion ; administratif avec Drive, OneDrive, Docs, échéances ; finance avec Stripe, QuickBooks, Xero en lecture, Pennylane et Qonto par l'API ; après-vente avec fiche Google et Zendesk ; direction avec validation d'équipe Slack et Teams, Google Chat) | n8n, inactifs |

| 036-010 | **les maquettes de l'interface**, cinq écrans (juge à navigateur, 18 mutants) : centre de commande (barre du jour, « Votre matin, en une page », « Où vous perdez de l'argent », cartes « À valider » avec ligne « fait : … » et bouton manuel, « Tout valider », hors norme déjà préparé, panneau « une question à la fois ») ; « Ce que vos assistants ont fait » ; « Connexions » (tous les outils de la matrice) ; « Mes départements » (Studio et Signature) ; **CRM « atelier »** (onglets existants gardés, chiffres avec source et date, prochaine action, historique « fait : … », import d'un export en trois temps) | `plans/011-cadrage-01-11/p6-signature/maquettes/`, captures dans `.orchestre/preuves/036-010/captures/` |

| 036-011 | **l'interface en code**, cinq écrans sous `app/systeme/` : centre de commande, « Ce que vos assistants ont fait », « Connexions », « Mes départements », clients et chantiers (CRM « atelier », lecture de `lib/crm/`, `app/crm/` intouché). Lectures seules (`app/api/systeme/`), verrous par `peut()`, drapeau `systemeAgents` baissé (404, rien dans le DOM). Typage complet vert ; l'aperçu Vercel de la branche (`3b366bc`) compile (READY) | `app/systeme/`, drapeau baissé |
| 036-012 | **l'intégration** : déploiement des copies par client à blanc et son juge, suite transverse du § 1.7 (17 mutants), runbook, plan de migration des automatisations codées, base des KPIs, mode ombre, **ordre de mise en service** | `plans/011-cadrage-01-11/p6-signature/mise-en-service.md` |

**Au total : 20 gabarits outillés, environ 1 000 nœuds de vrais outils.**
- Les sept départements des artisans : 11 gabarits.
- Le catalogue Entreprise : 9 gabarits.

Tous sont inactifs, sans identifiant, avec la porte de simulation, et chacun a son juge à mutants au lanceur.

Le juge commun `scripts/n8n-specs-qa.mjs` tient maintenant les gabarits outillés : 110 mutants, dont 22 nouveaux. Chaque juge est inscrit au
lanceur `scripts/tout-verifier.mjs`.

## En cours (sur l'API, hors abonnement)

- 036-017, Hermes : **14 fiches connecteurs écrites sur une quarantaine**. Ce sont Agenda Google et Outlook, OneDrive, Excel, fiche Google,
  Twilio, Telegram, Slack, Teams, Facebook Graph, Instagram, LinkedIn, TikTok et YouTube.
- Cinq passes de plus sont en file. L'automatisation horaire d'Orca les lance une à une ; Claude Code relira ensuite les portées.

## Ce qui reste pour la « définition de terminé » du prompt 1 (p6:416-422)

Tout ce qui se construisait sans toi est construit et vérifié. Le reste suit `mise-en-service.md`, dans l'ordre :
- **Ta validation des écrans**, sur les captures de `.orchestre/preuves/036-010/captures/`.
- **Tes gestes** (liste plus bas).
- **Un compte Studio et un compte Signature volontaires**, puis la copie de chacun déployée.
- **Le mode ombre**, un département à la fois.
- **La mise en production** : drapeaux levés après les migrations, vérifiés en direct.
- **Prompt 2 (Entreprise)** : sa première réponse, l'organisation multi-membres, le CRM et les applications sur mesure, ton organisation en
  client zéro.

## Ce qui t'attend (gestes que la sécurité te réserve)

0. **Ce soir** :
   - « approuvé » sur le plan du prompt 2, ou une décision corrigée ;
   - ton « oui » sur l'aperçu de la page Entreprise refaite (036-026), avant sa mise en production.
1. **Décision O3 : tranchée** (voie a, Presti crée l'identifiant n8n au « Connecter ») et construite par 036-021.
2. **Webhook n8n : tranché**, seulement si nécessaire. Pour l'instant, non : Presti reçoit, n8n lit chaque minute.
3. **Migrations posées le 03/11 en fin d'après-midi**, par le connecteur Supabase, chacune contrôlée après pose :
   - 0185 (automatisation, 7 contrôles verts), 0192 (accusé de réception, 8), 0193 (système d'agents, 9), 0187 (`factures.envoyee_le`),
     0190 (demandes de démo), 0191 (suivi des envois).
   - **Les tables de l'activation des automatisations sont donc en place.**
   - **Restent à poser** :
     - 0183 (organisations) et 0186 (SMS) ;
     - **0184 et 0188, les gardes de session dont dépend chaque requête connectée**. Selon leur propre fichier, elles se posent seulement
       après le banc de 0138 (PGlite) et un essai à sec, et 0184 après 0183.
   - `scripts/appliquer-migration.mjs` reste refusé par la base (`28P01`) : le connecteur Supabase est la voie. Ce n'est pas un blocage.
4. **Google** :
   - la vérification de l'application OAuth pour Gmail, avec évaluation de sécurité annuelle (coût chiffré dans `premiere-reponse.md`,
     décision 2) ;
   - la demande d'accès à l'API Business Profile, rédigée par 036-006, à envoyer par toi.
5. **Comptes** :
   - un compte Studio et un compte Signature volontaires (accord écrit) ;
   - l'accord écrit de ton organisation pour le client zéro ;
   - la clé de déchiffrement de n8n dans son conteneur (décision 1).
6. **Hermes** : sa clé API propre est faite (tu l'as dit le 03/11). Les agents d'Oracle tournent sur ta clé API depuis le 03/11 après-midi.
7. **Usage supplémentaire de l'abonnement** (payant) : seulement si tu veux continuer avant la remise à zéro de dimanche 08/11 vers 7 h.
8. **Mise en production** : un push sur `main` déploie. La page Entreprise refaite te sera montrée en aperçu avant.

## Incidents du jour, sans dégât sur la production

- **9 h 26** : le PC planté une seconde fois par l'outil Workflow. Plus jamais de Workflow sur le PC ; tout le multi-agents va sur Oracle.
- **12 h 46** : j'ai lancé par erreur le lanceur complet en voulant vérifier sa syntaxe. Je l'ai arrêté au bout de 4 minutes, pendant la
  compilation locale. Le dossier `.next` du PC est resté à moitié compilé, sans effet sur Vercel.
- **13 h 58** : Orca s'est mis à jour seul. Les crochets ont bloqué les écritures pendant six minutes, puis tout est reparti.
- **Toute la journée** : l'application Codex (OpenAI), ouverte sur le dépôt, laisse des verrous git orphelins. Je les retire avant chaque
  commit.
- **17 h 25** : `scripts/attendre-deploiement.mjs` a annoncé « en ligne » alors que la production compilait encore. Il avait pris l'aperçu de
  `nuit-0311`, qui porte le même commit et était déjà prêt. Le contrôle de la page l'a vu : la carte était absente en direct. Le script ne
  regarde plus que la production (`target=production`). On a attendu le vrai déploiement, puis vérifié en direct.
