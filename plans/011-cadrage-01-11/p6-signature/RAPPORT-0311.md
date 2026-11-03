# Rapport du 03/11/2026 — prompt 6 (Signature et sur mesure), à lire par Benj

Écrit par Claude Code le 03/11 vers 14 h 30, complété au fil des lots. Le prompt de référence est
`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`. Son plan est `premiere-reponse.md`, et sa correction de l'après-midi
est `outillage/OUTILLAGE.md`.

## En bref

- **En production** (`prestiapp.fr`) : rien de neuf depuis `5640cc75`, déployé et prêt.
- **Hors production** :
  - tout le travail du jour est commité en local et sauvegardé sur la branche `nuit-0311`, jamais poussé sur `main` ;
  - dans n8n, tous les workflows sont **inactifs, en simulation, sans aucun identifiant**.
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

1. **Décision O3** : comment brancher les comptes d'un client sur sa copie (`OUTILLAGE.md` § 4).
   - (a) Presti crée l'identifiant n8n par l'API au moment du « Connecter ».
   - (b) La copie lit le jeton chiffré et appelle l'API par un nœud HTTP.
2. **Exposer ou non un webhook n8n** : temps réel de WhatsApp, Telegram et Facebook Lead Ads. Sinon, ces canaux passent par Presti et la base.
3. **Migrations**, dans l'ordre et jamais un autre : **0185, puis 0192, puis 0193** (`mise-en-service.md`, étapes 3 à 5).
   - Avant tout, on relit l'état réel en base. Aucune hypothèse sur 0186, 0189 ou 0191 : elles sont peut-être déjà posées.
   - **0192** (accusé de réception par n8n) vient du lot 032-047, arrêté ce matin. Elle n'existe que sur Oracle et n'a pas été vérifiée. Or
     0193 l'exige comme prérequis : elle est à reprendre et à juger avant toute pose.
   - Chaque migration attend ton « go » écrit. On colle, puis on lève le drapeau.
4. **Google** :
   - la vérification de l'application OAuth pour Gmail, avec évaluation de sécurité annuelle (coût chiffré dans `premiere-reponse.md`,
     décision 2) ;
   - la demande d'accès à l'API Business Profile, rédigée par 036-006, à envoyer par toi.
5. **Comptes** :
   - un compte Studio et un compte Signature volontaires (accord écrit) ;
   - l'accord écrit de ton organisation pour le client zéro ;
   - la clé de déchiffrement de n8n dans son conteneur (décision 1).
6. **Hermes** : une clé API propre à Hermes, dans un espace à plafond mensuel (console Claude Platform). Il tourne maintenant sur l'API, sur le
   même crédit que les artisans en production.
7. **Usage supplémentaire de l'abonnement** (payant) : seulement si tu veux continuer avant la remise à zéro de dimanche 08/11 vers 7 h.
8. **Mise en production** : un push sur `main` déploie. Rien n'y part sans ton accord.

## Incidents du jour, sans dégât sur la production

- **9 h 26** : le PC planté une seconde fois par l'outil Workflow. Plus jamais de Workflow sur le PC ; tout le multi-agents va sur Oracle.
- **12 h 46** : j'ai lancé par erreur le lanceur complet en voulant vérifier sa syntaxe. Je l'ai arrêté au bout de 4 minutes, pendant la
  compilation locale. Le dossier `.next` du PC est resté à moitié compilé, sans effet sur Vercel.
- **13 h 58** : Orca s'est mis à jour seul. Les crochets ont bloqué les écritures pendant six minutes, puis tout est reparti.
- **Toute la journée** : l'application Codex (OpenAI), ouverte sur le dépôt, laisse des verrous git orphelins. Je les retire avant chaque
  commit.
