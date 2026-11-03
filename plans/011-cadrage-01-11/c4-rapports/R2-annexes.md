# R2 — Chantier 4 (assistant de gestion) : ce que disent les annexes

*Rédigé le 02/11/2026, la nuit, par le sous-agent « annexes » du workflow du chantier 4. Lecture seule : aucune écriture hors de ce
fichier, aucun commit, aucun build, aucune migration, aucune requête en base, aucun `.env` ni `presti-secrets` lu.*

## Sources et conventions

**Lus en entier** (abréviation utilisée ensuite) :

| Abr. | Fichier | Lignes |
|---|---|---|
| **P3** | `presti/plans/011-cadrage-01-11/prompts-benj/p3-assistant.md` (identique à `presti-ops/assistant-gestion/prompts-maitres/PROMPT-3-assistant-gestion.md`, au marqueur `</pasted_content>` près : `diff` de 3 lignes ✔) | 631 |
| **AT** | `presti-ops/assistant-gestion/PROMPT-AUTOMATISATION-ARTISAN.md` (l'annexe technique, 29/10) | 437 |
| **EDL** | `presti-ops/assistant-gestion/ETAT-DES-LIEUX-2026-10-29.md` | 43 |
| **CP3** | `presti/plans/011-cadrage-01-11/cadrage-p3.md` (cadrage du 01/11, vers 12 h) | 427 |
| **OFF** | `presti/plans/011-cadrage-01-11/prompts-benj/p3-assistant-bloc-offres-corrige-0111.md` (01/11, 18 h 06) | 46 |
| **ADD** | `presti/plans/011-cadrage-01-11/prompts-benj/benj-0111-addendum.md` | 180 |
| **CTX** | `presti/plans/011-cadrage-01-11/prompts-benj/contexte-cerveau.md` | 35 |
| **SYN** | `presti/plans/011-cadrage-01-11/cadrage-00-synthese.md` | 129 |
| **AUT** | `presti/.claude/rules/autonomie-abonnements.md` | 53 |
| **CAP** | `SaaS/inbox/sessions/2026-11-02-01h07-b6e06ae6-avant-compression.md` (fil capturé : paroles de Benj, l. 9-73) | 100 |

Les chemins de code sont relatifs à `C:/Users/benja/Documents/presti/`. **✔** = revérifié ce jour dans le code ou le dépôt (commandes
au §8) ; **⚠** = non vérifié, ou déduit ; **[CP3]** = chiffre du cadrage du 01/11 (requêtes de catalogue en base), non rejoué ici.

---

## 0. L'essentiel

1. **Le cadrage du 01/11 n'est pas approuvé.** Aucune trace d'un « approuvé » ni d'un « défauts OK » dans le réseau neuronal (recherche
   du 02/11). Benj a même rejeté en bloc le document des quatre chantiers : il juge faux les systèmes annoncés « presque en place »
   et exige qu'on suive ses prompts (CAP:56). Il a ensuite imposé n8n, Hermes et Orca (CAP:60, CAP:65, ADD). Les défauts de CP3
   qui écartaient n8n et Hermes du chemin du produit (CP3:153, Q10) sont donc à reprendre.
2. **Budget temps imposé par Benj** (CAP:63) : échéance absolue le 03/11, 48 h d'agent, priorité C4 > C3 > C1 > C2 > C5. Une phase
   sans test vert au bout de 4 h passe « bloquée ». Un MVP qui marche vaut mieux qu'un système parfait non livré.
3. **La plomberie existe**, vérifiée ce jour : 52 actions, dont 32 directes et 20 à confirmer, et 21 lectures. Le pilote a un délai
   d'annulation de 10 min, un plafond de 20 envois par jour et une liste fermée de 6 outils ; une carte vit 24 h (✔ §8). Tous les
   documents de référence disent encore « 45 actions ».
4. **L'amont n'existe toujours pas** (✔) : ni `evenements_metier`, ni file d'opportunités, ni `lib/automatisations/`, ni table
   d'organisation, ni n8n dans le code. Des **règles de détection pures existent pourtant** : alertes du CRM, briefing, relances
   d'impayés, relances de conversation, expiration des devis. Elles affichent ou relancent, elles ne remplissent aucune boîte
   « À valider ».
5. **Trois contradictions bloquent le plan tel qu'écrit** (§7) :
   - (a) le mode « fait tout seul » (29/10) exécute, sur demande de l'artisan, des gestes que §3.2 veut « toujours en carte » :
     encaisser, émettre, supprimer, prix en lot ;
   - (b) l'offre Entreprise : « même autonomie que Signature » (OFF:28) contre « niveau 3 sur les types convenus par contrat »
     (P3:546, P3:550) ;
   - (c) les détecteurs « en code sur le tic » (AT:53-54, CP3 §4) contre « toute automatisation dans n8n, jamais en dur » (ADD:23,
     ADR-001, CAP:65).
6. **Deux détecteurs du top 10 sont mal fondés sur le code.**
   - Le n° 5 (« facture émise non envoyée ») n'a aucune donnée : envoyer une facture n'écrit rien sur la facture (✔).
   - Le n° 7 (devis tiré d'une demande) ne peut jamais partir seul : la carte née d'un texte de tiers lu n'est jamais pilotée (✔).
7. **L'e-mail heurtera l'automatisation.**
   - Volume : le code plafonne à 80 e-mails transactionnels par jour pour toute la plateforme ; un commentaire du code dit que
     l'offre gratuite de Resend s'arrête à 100 (✔).
   - Marque blanche : l'adresse d'expédition par défaut des e-mails au nom de l'artisan est `contact@prestiapp.fr` (✔) ; sa valeur
     en production n'est pas lisible ici (⚠).
8. **La sauvegarde couvre toujours 34 tables** (✔ `scripts/sauvegarde.mjs:49-59`). Le préalable de la migration des organisations
   n'est donc pas levé (P3:561).
9. **Le plan des organisations de CP3 est complet et réversible** (§5) :
   - quatre tables neuves ;
   - trois fonctions : `comptes_accessibles`, `peut_acceder`, `role_de` ;
   - un interrupteur global ;
   - des politiques `org_*` ajoutées sans toucher aux existantes, lots M0 à M6 ;
   - côté routes, le non-titulaire est refusé par défaut.

   La faille de la garde 0138 pour un membre sans ligne `artisans` est confirmée dans le fichier (✔).
10. **Des chiffres périmés circulent dans les annexes** : « ≈ 180 migrations », « garde sur 63 tables », « tâches du PC arrêtées »,
    « identifiants refusés », « Orca à vérifier ». Le dépôt et CP3 donnent autre chose (§7). Les dossiers du vault cités par CTX
    existent depuis la phase 1.4 (✔), contrairement à ce que dit SYN:38.

---

## 1. Les exigences du chantier 4

### 1.A Le prompt de Benj (corps de P3)

| N° | Exigence | Source |
|---|---|---|
| E01 | Presti devient « l'assistant de gestion des artisans ». L'artisan voit d'abord son assistant, ses tâches prioritaires, ses alertes (devis à relancer, impayés, stock bas, chantiers en retard), puis ses modules. | P3:9-18 |
| E02 | L'assistant est au centre : l'artisan lui parle, lui donne un fichier, une photo, un lien ou une consigne. Les agents préparent, l'artisan valide selon son abonnement. | P3:20 |
| E03 | Stack demandée : Next.js mobile-first, API TypeScript ou Python, Supabase, pgvector, n8n, Hermes + Orca, MCP, LLM configurable, Kokoro, WaveSpeed « si nécessaire », logs et table d'exécutions, Vitest ou pytest, Docker. Arbitrée par l'annexe 2 et les règles du dépôt (C14). | P3:22-38 |
| E04 | Neuf principes non négociables : multi-locataire strict par RLS, Supabase source de vérité, aucune donnée inventée, toute sortie IA validée par un schéma strict, aucune action externe irréversible sans autorisation, autonomie selon l'abonnement, chaque action IA traçable, jamais n8n, MCP, agents ni prompts à l'écran, système arrêtable, auditable et rejouable. | P3:40-50 |
| E05 | Trois abonnements, trois autonomies : **Assisté** (tout est validé) ; **Semi-automatique** (rappels de rendez-vous, relances de devis et de factures, alertes de stock partent seuls) ; **Autonome supervisé** (devis selon règles, factures après devis validé, commandes fournisseurs selon seuils, réponses simples, classement), avec journal, budget, blocages, validation des cas à risque et arrêt immédiat. Réécrit par l'annexe 2 et OFF (C3). | P3:52-84 |
| E06 | Architecture cible : interface à 12 modules, backend (auth, rôles, règles, API agents, webhooks, files), Supabase (données, documents, mémoire, audit), n8n (workflows, intégrations, notifications, relances), Hermes + Orca (8 agents). | P3:86-136 |
| E07 | L'écran 1 est l'assistant : conversation, tâches, alertes, actions recommandées, derniers documents, devis et factures, chantiers en cours. Il comprend la demande, demande ce qui manque, consulte, propose, brouillonne, demande validation, exécute si l'offre l'autorise. | P3:140-172 |
| E08 | Écrans 2 à 7 : CRM (fiche complète, prochaine action recommandée), devis (du brouillon à la conversion en facture), factures et impayés, inventaire (seuils, commandes proposées, besoins par chantier), conversations (WhatsApp, e-mail, SMS, validation selon l'offre), documents classés automatiquement. | P3:174-237 |
| E09 | Dix agents : assistant de gestion, Devis, Facturation, Inventaire, Fournisseur, Relance, Conversation, Document, Reporting, QA. | P3:239-250 |
| E10 | Modèle de données d'au moins 34 tables. Chacune porte `id`, `organization_id`, `created_at`, `updated_at`, `created_by`, un statut, un audit et la RLS. Arbitré par P3 §3.3 et CP3 §5.1 (C13). | P3:252-299 |
| E11 | Sécurité : isolation par organisation, aucun agent ne lit une autre organisation, chaque appel d'outil journalisé, permission pour chaque action sensible, actions financières traçables, documents protégés, données minimisées, droit à l'effacement. | P3:301-310 |
| E12 | Fiabilité : idempotence, nouvel essai avec attente croissante, file des échecs, limites de débit, délais maximaux, disjoncteur, versions des prompts et des règles, audit, mode à blanc, drapeaux par offre et par agent. | P3:312-326 |
| E13 | Tests obligatoires en 14 thèmes : multi-locataire, permissions, devis, devis vers facture, TVA et marges, inventaire, alertes de stock, relances, impayés, validation humaine, reprise après panne, sorties LLM invalides, documents illisibles, mode à blanc. | P3:328-343 |
| E14 | Méthode en 14 pas. Seulement les questions bloquantes. Architecture et modèle validés avant tout code complet. | P3:345-360, P3:388 |
| E15 | Definition of Done en 11 points : assistant clair en entrée, devis en langage naturel, validation avant envoi, devis vers facture, inventaire et alertes, relances, traçabilité, isolation, autonomie selon l'offre, rien d'irréversible sans autorisation, testé, documenté, déployable. | P3:362-376 |
| E16 | Première réponse en 7 points : compréhension, questions, architecture, arborescence, modèle, plan de migration, phases. | P3:378-386 |

### 1.B Annexe 1 de P3 (faits et décisions du 01/11)

| N° | Exigence | Source |
|---|---|---|
| E17 | Partir de la mémoire : le réseau neuronal (`regles_pour`, `chercher`, `lire`), le QG, `CLAUDE.md` et `AGENTS.md`, `.orchestre/contexte.md`, `plans/` et l'audit du 29/10. Citer les notes utilisées. Ne jamais modifier une note stratégique sans accord. Aucune donnée de client dans Obsidian. Proposer une note de décision après chaque décision importante. | P3:396-400, CTX:3-23 |
| E18 | Aucun outil payant en plus : ce qui est payant ou à sec est remplacé par un équivalent gratuit, sur Oracle ou sur le PC. | P3:428 |
| E19 | Ne rien raser. Un push sur `main` déploie. On colle la migration puis on lève le drapeau. `lib/plans.ts` est la seule vérité des offres. Marque blanche. Aucune donnée réelle dans les tests, aucun secret versionné. | P3:430-443 |
| E20 | « Automatique » vrai selon l'offre, avec cinq interdits. Anti-fabrication. Aucun vocabulaire technique devant l'artisan. Piste A « Instrument ». Règles du SMS. Sauvegarde rétablie avant la migration des organisations. | P3:495-506 |

### 1.C Annexe 2 de P3 (mise en œuvre)

| N° | Exigence | Source |
|---|---|---|
| E21 | D'abord l'inventaire de l'existant, puis on branche et on corrige pas à pas. | P3:516, P3:530-536 |
| E22 | Aucune action irréversible ni sortante sans Benj, sauf la prospection par e-mail. Préparer, simuler, mesurer, brouillonner : sans attendre. | P3:517 |
| E23 | Un outil gratuit s'installe sur Oracle ou le PC : licence notée, ni carte ni abonnement, inscription au registre des traitements s'il touche des données de prospect ou de client. | P3:518 |
| E24 | Chaque question bloquante a sa réponse par défaut ; tout ce qui se défait avance avec ce défaut. | P3:519 |
| E25 | Chaque fait a une source et une date. Une preuve est une sortie de commande. | P3:520 |
| E26 | Chaque suite peut rougir (mutation prouvée), entre au lanceur et se joue hors ligne. | P3:521 |
| E27 | Trois niveaux : 1 propose, 2 prépare et l'artisan valide d'un geste, 3 fait seul sous limites et rend compte. Le niveau 3 est ouvert en Signature (`plateforme.ia.auto`) et en Entreprise (types convenus par contrat), jamais en Studio. **Il se règle par type d'action.** | P3:540-548 |
| E28 | « Presti pour l'entreprise » : vendue sur démonstration et sur devis, sans prix public. Elle ouvre les organisations, les intégrations n8n et le niveau 3 convenu. Elle entre dans `lib/plans.ts` comme offre « sur devis » sans prix Stripe en libre-service. C'est un changement d'argent : la session principale l'écrit et le teste (`essais-gratuits-qa`, grille), sans changer Studio ni Signature. | P3:550 |
| E29 | La liste §3.2 ne s'automatise jamais : ces gestes restent des cartes, toujours (§6). | P3:552-553 |
| E30 | Organisations multi-membres dans ce chantier, en quatre pas réversibles. Avant la première migration : plan validé par Benj et sauvegarde vérifiée (§5). | P3:555-561 |
| E31 | Supabase reste la vérité et la file. n8n sur Oracle porte les intégrations, les déclencheurs planifiés et les rappels de validation ; il appelle Presti avec une clé de service dédiée à droits limités. Hermes n'est jamais devant un artisan. Orca, s'il est installé. Les agents deviennent des familles d'outils et de détecteurs de l'assistant existant. Mémoire : tables et recherche plein texte ; pgvector seulement sur besoin mesuré. Les données d'un artisan qui passent par n8n restent sur Oracle. | P3:563-570 |
| E32 | Canaux : l'e-mail part au nom de l'artisan. SMS oui : rappel, devis prêt, paiement. Fournisseur au moins cher, coût par SMS montré à Benj avant le premier envoi réel, expéditeur à l'artisan, STOP, rien de commercial sans consentement, drapeau. WhatsApp et réseaux restent derrière leurs drapeaux. Le téléphone jamais. | P3:572-576 |
| E33 | Couches 0 à 9 : réparer le socle (sauvegarde hors Actions, boîte e-mail, tâches, réseau neuronal), mise en route (5 questions au plus), `evenements_metier`, détecteurs activables par artisan, priorisation (l'argent qui dort d'abord), rédaction au palier le moins cher avec montants par le code, porte de conformité, une seule boîte « À valider » et un briefing poussé, exécution suivie (« ce que j'ai fait pour vous »), boucle d'amélioration tracée. | P3:578-589 |
| E34 | L'accueil de la console devient l'assistant : briefing, boîte « À valider », ce qui est parti seul (annulable 10 min), niveau par type d'action. Piste A, derrière un drapeau ; vérifier `consoleV2` sur `refonte-1018`. Aucun jargon. | P3:591-593 |
| E35 | Idempotence par clé (artisan, type, objet, jour), reprise après panne, délai maximal, plafonds par jour et par coût, disjoncteur par détecteur après N échecs, isolation RLS testée, aucune clé côté client, aucun doublon. | P3:595-597 |
| E36 | Sept familles de tests hors ligne, au lanceur, capables de rougir : un geste §3.2 jamais automatique même réglé au niveau 3, niveau 3 refusé sous Studio (`verrou_offre`), droits par rôle, délai et plafond, isolation, montants par le code, mode à blanc. | P3:599-608 |
| E37 | Architecture validée avant le code. Pas réversibles et déployables : build local, push, `attendre-deploiement`, vérification en direct, nettoyage. Auditeurs distincts. En fin de chantier : note de session, `Récap-Projet`, `Journal-Decisions`. | P3:610-612 |
| E38 | Première réponse en 6 points : inventaire en 15 lignes, plan du socle, Mermaid, 10 détecteurs, plan des organisations, questions avec défauts. | P3:614-621 |
| E39 | DoD de l'annexe : cartes du matin produites seules sur un compte de test, relance de devis au niveau 3 sous Signature (annulable 10 min, au journal), aucun geste §3.2 automatisable, aucun montant venu du modèle, deux membres aux droits différents, deux organisations étanches, sauvegarde verte, tests verts capables de rougir. | P3:623-629 |

### 1.D L'annexe technique (AT, 29/10)

| N° | Exigence | Source |
|---|---|---|
| E40 | Le système repère, prépare, soumet, exécute une fois validé, suit et s'améliore. Ni un chatbot qui attend, ni un agent non supervisé : il devient autonome peu à peu. | AT:9-11 |
| E41 | Treize règles de philosophie. Le code repère, calcule, décide, valide, orchestre, journalise et exécute ; tout montant, date, TVA, total et numéro sort du code. Aucune action irréversible déclenchée par un LLM. Porte de conformité, idempotence, explication après coup, appels bornés, un agent par responsabilité, marque blanche absolue, autonomie gagnée type par type, proactif par défaut. | AT:34-48 |
| E42 | Coût : le code fait tout ce qu'il peut sans modèle. Le modèle rédige et classe du texte libre, au palier le moins cher, sous plafond par compte et par jour. | AT:56 |
| E43 | Tout envoi automatique passe par les fonctions d'envoi partagées, jamais par un second chemin. | AT:26, AT:254 |
| E44 | Couche 1 : un événement métier normalisé, avec format JSON et clé unique `(artisan_id, cle)`. Il est émis depuis l'endroit qui écrit déjà, sous RLS, sans texte libre de client. | AT:68-99 |
| E45 | Couche 2 : détecteurs en code sans LLM, par lots bornés, avec verrou par artisan. Catalogue de 21 détecteurs et format d'opportunité. Règles : lecture sous l'identité de l'artisan, constat écrit par le code, `resolue` si la condition disparaît, échec journalisé sans perte, seulement les outils existants. | AT:101-156 |
| E46 | Couche 0, la mise en route : imports de tarifs (source gardée, prix illisible laissé vide), de clients (dédoublonnés), de stock et de fournisseurs. Test de boîte lisible, simulation sur 30 jours, jeu fictif `est_demo`. | AT:158-167 |
| E47 | Couche 3 : priorisation par règles versionnées (urgence, montant, risque). Une donnée manquante met l'opportunité en `a_completer`. | AT:169-178 |
| E48 | Couche 4 : le code assemble les faits, le modèle rédige, puis les chiffres sont revérifiés ; 3 variantes au plus ; 40 à 110 mots, première personne, aucune menace. Le trieur range les réponses en 8 classes ; toute réponse arrête la séquence. | AT:180-215 |
| E49 | Couche 5 : porte de conformité en 12 contrôles, plus une liste de gestes jamais automatisables. | AT:217-236 |
| E50 | Couche 6 : une seule boîte « À valider », sur la console et le mobile, avec 5 boutons et la validation par lot. Le briefing est poussé même si l'artisan n'ouvre rien. Le chat connaît la boîte. L'intention ne dépend plus d'une liste de mots fixe. | AT:238-250 |
| E51 | Couche 7 : exécution par les fonctions partagées et le pilote existant, avec webhooks, arrêt immédiat d'une séquence et 16 statuts. | AT:252-262 |
| E52 | Couche 8 : mesures hebdomadaires par détecteur. Elle propose, ne change rien seule (exemple : 19 validations sur 20). Rapport à l'artisan, et `/controle` sans donnée de client. | AT:264-280 |
| E53 | Modèle de données : réutiliser d'abord, ajouter 9 tables, poser 7 contraintes en base. Protocole de migration : essai à sec, 4 sabotages, `apply_migration`, contrôle, jumeau, puis le drapeau. | AT:282-307 |
| E54 | Onze rôles, presque tous en code. Chaque agent LLM a un prompt versionné, des outils déclarés, un schéma, des refus, un journal et un rejeu. | AT:309-325 |
| E55 | Fiabilité : files en tables, réclamation atomique, coupe-circuit par fournisseur, crédits, baux, mode simulation global et par artisan, faux modèle pour les tests, pause générale, alertes au fondateur. | AT:327-340 |
| E56 | Dix-neuf cas de test et un jeu de données fictif. | AT:342-364 |
| E57 | Treize livrables, dont `lib/automatisations/`, les prompts versionnés, les écrans, la documentation et les promesses alignées. | AT:366-380 |
| E58 | Méthode en 12 étapes strictes : simulation avant préparation, pilote désactivé par défaut. | AT:382-399 |
| E59 | DoD en 12 points : un artisan avec ses anciens devis PDF est importé, puis trouve un briefing et sa boîte le lendemain matin. Rien en double, une réponse arrête la séquence dans la minute, simulation sans envoi. | AT:401-416 |
| E60 | Première réponse en 8 points et 6 questions minimales. | AT:418-437 |

### 1.E Règles du 01/11 qui s'appliquent au chantier

| N° | Exigence | Source |
|---|---|---|
| E61 | Tout est automatique par défaut, selon l'abonnement. Studio prépare et l'artisan valide ; Signature envoie seul. Pilote en Signature, 10 min pour annuler. Jamais un prix estimé ni un paiement sans l'artisan. Les verrous passent par `peut()`. Une ligne de la grille n'apparaît que si son drapeau est levé. Essais de 7 et 21 jours. | AUT:8-12, AUT:29-49, ADD:67-73 |
| E62 | Toutes les automatisations vivent dans n8n, remplacées une par une en cinq pas (créé, à blanc, comparé, ancien coupé, drapeau vérifié). On ne rase rien. | ADD:9-13, ADD:23 |
| E63 | Claude Code et Hermes sont les seuls agents ; Orca est le harnais de Hermes. Claude Code n'écrit que le schéma, l'argent, la sécurité, les prompts et les verdicts ; le reste va en tâches `.orchestre/file/`. | ADD:15-23, ADD:90-99 |
| E64 | Aucun secret. Aucune donnée de prospect ni de client vers un modèle gratuit en ligne. Jamais de mot de passe, de clé ni d'OAuth saisis par un agent. Toute action irréversible attend Benj, sauf trois exceptions. | ADD:101-111 |
| E65 | Grille corrigée à 3 offres (18 h 06). Studio : « automatique avec validation ». Signature : « tout automatique », journal, garde-fous, CRM et workflows n8n standards. Entreprise sur mesure : CRM entièrement adapté (champs, processus, rôles, interface), automatisations n8n propres à leurs outils, même autonomie que Signature, prix sur devis, CTA « Demander une démo » ou « Parler à l'équipe ». Ce n'est pas un niveau d'autonomie à part. | OFF:7-36 |
| E66 | Pour toute automatisation : la construire dans n8n, jamais en dur. Tâche de jugement : Hermes. Exécution d'agent : Orca. Si l'un des trois manque, s'arrêter et demander à Benj. | CAP:65 |
| E67 | Budget temps : échéance le 03/11, priorité au chantier 4, coupure à 4 h sans test vert, un MVP plutôt que la perfection. | CAP:63 |
| E68 | Partir du constat du 29/10 : il manque les détecteurs, la mise en route, la boîte poussée et le socle d'exploitation. | EDL:36-42 |

### 1.F Ce que Benj a demandé dans le fil (réseau neuronal)

| N° | Exigence | Source |
|---|---|---|
| E69 | « Grosse alerte » : l'assistant doit pouvoir tout faire à la place de l'artisan. Il cherche pour lui, crée devis, factures, tableaux Excel et tarifs. Vérifier qu'il agit aussi sur le CRM. Priorité absolue. Le commit `8022cc60` du 29/10 (✔ `git log`) a répondu en partie : outils d'action toujours donnés, « fait tout seul », export Excel, facture sans devis. | CAP:29, CAP:44, CAP:49-50 |
| E70 | Comptes fournisseurs connectés : l'artisan met ses identifiants (BigMat, Gedimat…) et l'IA cherche le matériel. Dire qui a besoin d'un compte et qui n'en a pas besoin. État : branche `claude/comptes-fournisseurs-0a934e`, 1 commit d'avance, non fusionnée (✔), drapeau baissé, migration 0182 non posée. | CAP:53-54, `memoire-presti/comptes-fournisseurs-connectes-2910.md` |
| E71 | Demande relayée du 02/11 dans la nuit : après vérification du chantier 1, passer au chantier « assistant de gestion, CRM et tout », lire tous les prompts et toutes les vidéos qui le concernent, avancer aussi la landing, et viser les deux chantiers finis au réveil. | demande relayée par le harnais |

---

## 2. Les décisions de Benj déjà prises

| Date | Décision | Source |
|---|---|---|
| 24/09 | Les migrations : Claude les applique lui-même par le connecteur, sans jamais demander à Benj de les coller. Le 01/11, `securite.md` ajoute un « go » écrit de Benj (Q2). | `memoire/migrations-je-les-applique.md` |
| 13/10 | Essai gratuit sans carte des offres payantes. | `lib/plans.ts:104` ✔ |
| 15/10 | La plateforme commence avec Studio. Relances d'impayés à activer, dès Studio. | `lib/plans.ts:21-26`, `:58`, `:67` ✔ |
| 21/10 | Pilote automatique en Signature seulement, type par type, 10 min pour annuler. | `lib/plans.ts:87-89` ✔, `memoire-presti/pilote-auto-aide-2110.md` |
| 25/10 | Deux offres seulement. Studio : tout est préparé, l'artisan valide. Signature : tout part seul. L'Essentiel n'est plus vendu. L'assistant passe en Studio. `plateforme.ia.auto` passe en Signature. | `lib/plans.ts:11-13`, `:63`, `:73-75`, `:79-80` ✔ ; commit `2ba41f92` du 25/10 ✔ |
| 25/10 | Positionnement « automatique » : vrai selon l'offre, avec des interdits. | `memoire-presti/positionnement-automatique-2510.md`, `SaaS/wiki/concepts/Positionnement automatique.md` |
| 26/10 | Essai Studio de 7 jours (Signature : 21). | `lib/plans.ts:105`, `:108` ✔ ; commit `24e5caee` du 26/10 ✔ |
| 29/10 | Outils d'action toujours donnés. Mode « fait tout seul ». Une réponse qui commence par « oui » vaut accord. | `lib/assistant/cadrage.ts:145`, `:151-162` ✔ ; commit `8022cc60` du 29/10 ✔ |
| 29/10 | Comptes fournisseurs connectés (ordre de Benj). | `memoire-presti/comptes-fournisseurs-connectes-2910.md` |
| 29/10 | freellmapi seulement pour la relecture publique de la recherche fournisseurs, derrière un drapeau baissé. Gemini gratuit exclu du produit (EEE). | `memoire-presti/ia-gratuite-produit-2910.md` |
| 01/11 | Aucun outil payant en plus. | P3:428 |
| 01/11 | Trois offres, dont « Presti pour l'entreprise ». Organisations multi-membres maintenant. SMS : oui. Outils : Claude Code, Hermes, Orca, n8n. | P3:486-493 |
| 01/11 | Prospection e-mail automatique sans Benj. Outils gratuits installables. Une question vient toujours avec son défaut. | P3:517-519 |
| 01/11 | Addendum : n8n pour toutes les automatisations, remplacées une par une ; Claude Code et Hermes seuls agents, Orca en harnais ; Oracle ; Brevo gratuit ; tout automatique par défaut ; exceptions pour les vidéos et les carrousels ; règles de sécurité. Posé en ADR-001 à ADR-006, statut « acceptée ». | ADD ; `SaaS/10 Presti/04 Décisions/ADR-001…`, `ADR-002…` |
| 01/11 (⚠ date déduite de l'ordre du fil, qui ne date pas les messages) | Après le cadrage : rejet du document des quatre chantiers (« suis ces prompts »). Tout doit être relié à Orca, Hermes et Claude. Outils obligatoires à chaque tâche. Budget temps et priorité C4. | CAP:56, CAP:60, CAP:63, CAP:65 |
| 01/11, 18 h 06 | Grille à trois offres corrigée : Studio, Signature, Entreprise sur mesure. | OFF:1-36 ; `Journal-Decisions`, entrée du 01/11 |
| 01/11, soir | Hermes en Haiku 5.5 par défaut, Sonnet 5.5 si besoin. freellmapi pour les petites tâches seulement. Le complexe va à Claude Code. | `memoire-presti/repartition-claude-freellmapi-0111.md` ; `Journal-Decisions`, « 2026-11-01 (fin de soirée) » |
| 01/11 | Cinq chantiers ; échéance le 03/11 ; « l'écrasante majorité » visée le 02/11 à 10 h. | `Journal-Decisions`, « 2026-11-01 — Addendum » |
| 01/11 | SMS : jamais pour prospecter, oui entre l'artisan et ses clients. ADR rédigée par Claude Code, **statut « proposée »**. | `SaaS/10 Presti/04 Décisions/ADR-007…` |

**Rien de ce qui suit n'est décidé** : les 14 questions de CP3, les 3 de P3 §9.6 et les deux points « à trancher » de OFF.
Le réseau neuronal ne garde aucune réponse de Benj sur ces points (recherche du 02/11).

---

## 3. Les questions ouvertes et leur défaut

### 3.1 Celles que posent les documents

| # | Question | Défaut proposé | Source | État au 02/11 |
|---|---|---|---|---|
| A1 | Quel fournisseur de SMS ? | Le moins cher en France ; coût montré avant le premier envoi. | P3:621 | ouverte ; ADR-007 « proposée » |
| A2 | Par où pousser le briefing ? | Notification de l'app. | P3:621 | ouverte |
| A3 | Que contient l'offre Entreprise ? | Organisations, intégrations n8n, niveau 3 convenu par contrat. | P3:621 | **contredit par OFF:28-36** (C2) |
| Q1 | Remettre à jour le mot de passe de la base pour retrouver `pg_dump` ? | Oui ; sinon une sauvegarde PostgREST qui découvre les tables. | CP3:144 | ouverte (geste de Benj) |
| Q2 | Qui applique une migration ? | Claude prépare, fait l'essai à sec, applique par le connecteur après un « go » écrit de Benj, lot par lot ; le jumeau `_A_COLLER` reste le repli. | CP3:145, SYN:74 | ouverte ; `migration-production.md` ne cite pas le connecteur (C16) |
| Q3 | Quelle offre ouvre les membres ? | « Presti pour l'entreprise », plus Business. Studio et Signature ont une organisation à un titulaire, invitation verrouillée (`organisation.membres`). | CP3:146 | à revoir avec OFF:28 (C2) |
| Q4 | Une organisation, est-ce un compte ou un regroupement ? | Un pour un en v1 (`organisations.id = artisans.id`), sans colonne ajoutée ; le multi-comptes vient en second. | CP3:147, SYN:75 | ouverte |
| Q5 | Quelle matrice des rôles ? | Le tableau CP3 §5.3 (repris au §5.5). | CP3:148 | ouverte |
| Q6 | Comment payer le SMS ? | Étape 0 gratuite : un lien `sms:` préparé, envoyé d'un geste par l'artisan. Étape 1 : une API, coût passé en crédits, aucun envoi réel avant que Benj voie le coût. | CP3:149, SYN:76 | ouverte |
| Q7 | Quel canal et quelle heure pour le briefing ? | Notification de l'app, 7 h 30 par défaut, e-mail en option. | CP3:150 | ouverte |
| Q8 | Quel budget IA ? | Plafond par compte et par jour ; palier le moins cher ; coupe-circuit global ; aucune rédaction avant la mesure 0b. | CP3:151 | ouverte (1 547 € relevés, non vérifiés) |
| Q9 | Quel lexique d'escalade ? | Un par métier : pour un plombier, « fuite » est une urgence, pas une escalade. | CP3:152 | ouverte ; le code traite la fuite en urgence (C21) |
| Q10 | Quel n8n, et Hermes ou Orca en production ? | Oracle seul ; n8n tire et Presti ne l'appelle jamais ; Hermes et Orca restent hors production. | CP3:153 | **dépassé par CAP:60, CAP:65 et ADD** (C5, C6) |
| Q11 | Ajouter les dépendances du prompt ? | Aucune. | CP3:154 | ouverte |
| Q12 | Créer une table `paiements` ? | Oui, après les organisations. | CP3:155 | ouverte (argent : session principale) |
| Q13 | Rejouer les tests `--live` ? | Non : on corrige hors ligne, le rejeu est la décision de Benj. | CP3:156 | ouverte |
| Q14 | Que veut dire « envoyer un devis signé » ? | Un devis signé ne part jamais seul ; un devis non signé reste pilotable s'il a des prix sourcés. | CP3:157 | ouverte |
| OFF-1 | `plateforme.ia.auto` « à partir de Studio » ? | Rien n'est changé ; à confirmer avec Benj. | OFF:40-44 | ouverte (C1) |
| OFF-2 | L'offre Entreprise est absente de `lib/plans.ts`. | — | OFF:45 | ouverte (✔ `lib/plans.ts:14`) |
| AT-1 | Les sauvegardes, alors que le quota Actions est épuisé ? | Passer sur pg_cron ou une tâche du PC. CP3 0a propose ensuite un minuteur Oracle, avec n8n pour la surveiller. | AT:424, CP3:106-117 | ouverte |
| AT-2 | Qu'active-t-on à l'inscription ? | Les détecteurs tournent pour tous en « je propose » ; l'envoi seul reste un choix explicite en Signature. | AT:425 | **en tension avec « tout automatique par défaut »** (ADD:69-72 ; C4) |
| AT-3 | Le SMS ? | Aucun SMS. | AT:426 | **dépassé** : « SMS : oui » (P3:492) |
| AT-4 | Les données du compte fondateur ? | Un jeu fictif `est_demo`. | AT:427 | ouverte |
| AT-5 | Le budget IA ? | Plafond de crédits par compte et par jour, palier bas, vérifier le dépassement. | AT:428 | = Q8 |
| AT-6 | Quand proposer l'automatique ? | Après 20 validations sans modification et 0 refus en 3 semaines. | AT:429 | ouverte |

### 3.2 Celles que soulèvent les contradictions du §7

Défauts suggérés par ce rapport, réversibles, à faire valider. Aucun n'est une décision.

| # | Question | Défaut suggéré | Contradiction |
|---|---|---|---|
| R1 | Le mode « fait tout seul » couvre-t-il les gestes §3.2 ? | Non pour encaisser ou marquer payé, émettre une facture, supprimer et changer les prix en lot : une carte d'un clic, préremplie par la demande. Oui pour le reste. Cela défait en partie le choix du 29/10 : à confirmer par Benj. | C19 |
| R2 | L'offre Entreprise est-elle une offre à part ou une Signature sur mesure ? | Un `PlanId` « entreprise » qui reprend SIGNATURE, plus `organisation.membres`, sans prix Stripe. Même autonomie que Signature (OFF:28), plus les types convenus par contrat. Champs du CRM sur mesure : plus tard, en fiche de conception. | C2, C3 |
| R3 | Hermes est-il sur le chemin du produit ? | Il reste derrière : il prépare et orchestre (workflows n8n, tâches), mais n'est jamais dans la réponse en direct à un artisan. Raisons : marque blanche, Hermes tourne sur le PC (8 Go), il consomme le crédit du produit. | C6 |
| R4 | Où vivent les détecteurs ? | La règle reste en code pur, testée au lanceur et protégée par RLS. Son déclenchement et son enchaînement passent dans un workflow n8n Oracle, qui appelle une route protégée par une clé dédiée. Le tic reste en place pendant la transition, puis on remplace une étape à la fois. | C5 |
| R5 | Le volume d'e-mails transactionnels ? | Mesurer avant d'ouvrir les détecteurs qui envoient. Les relances aux clients restent sur Resend (marque blanche, réponse à l'artisan) ; Brevo sert à la prospection (ni marque Brevo chez les clients, ni quota partagé). Toute hausse est une dépense : décision de Benj. | C22 |
| R6 | L'adresse d'expédition au nom de l'artisan ? | Vérifier la valeur de `EMAIL_EXPEDITEUR_ARTISAN` en production (geste de Benj). Sinon, un domaine neutre à vérifier chez Resend. | C23 |
| R7 | Tout automatique par défaut, ou à activer ? | Détecteurs actifs pour tous en « propose et prépare ». En Signature, relances de devis et d'impayés activées à la fin de la mise en route, l'artisan les coupe d'un geste. Réponse aux prospects et envoi de devis restent à activer. Repli : tout à activer, proposé par carte (AT-2). | C4 |
| R8 | Le détecteur n° 5 n'a pas de donnée. | Colonne additive `factures.envoyee_le` ou événement `facture.envoyee`, après le « go » de Benj. Détecteur coupé d'ici là. | C11 |
| R9 | Le détecteur n° 7 ne part jamais seul. | Garder ce verrou (injection indirecte, audit du 21/10) : l'envoi d'un devis né d'une demande reste au niveau 2. | C12 |
| R10 | Des détecteurs reposent sur le CRM, réservé à Signature. | En Studio, variante sans chantier : « devis accepté sans facture de solde ». En Signature, variante par chantier. | C10 |
| R11 | Peut-on afficher « systèmes n8n inclus » sur la grille ? | Pas avant un workflow métier prouvé. Une ligne de la grille n'apparaît que si la fonction existe (`lib/plans.ts:5-7`). | C7 |
| R12 | Quelle clé d'idempotence ? | (artisan, type, objet, étape), plutôt que « jour ». | C20 |

---

## 4. Les 10 premiers détecteurs, classés par argent récupéré

L'ordre vient de CP3:361. Il est donné « par argent à récupérer le plus probable », avec une réserve explicite : aucun compte réel n'est
assez rempli pour le mesurer, et le classement sera recalculé en simulation. Au 29/10, il n'existait que 3 comptes non démo, et le compte
fondateur n'avait ni tarif, ni facture, ni chantier, ni stock (EDL:22). P3 fixe la priorisation : l'argent qui dort d'abord, puis les
clients qui attendent (P3:584).

Les déclencheurs et les propositions viennent du catalogue d'AT (AT:107-129). Les niveaux par offre viennent de CP3 §4.1 (CP3:211-224)
et des capacités du code. Les colonnes et les outils ont été vérifiés ce jour.

| Rang | Détecteur | Déclencheur (données ✔) | Carte ou action (outil existant ✔) | Studio | Signature | Entreprise | Existe déjà |
|---|---|---|---|---|---|---|---|
| 1 | Facture échue à J+3, J+10, J+21 | `factures.statut='emise'`, `date_echeance` dépassée, non payée (`0006_factures.sql:17`, `:19` ; `payee_le` `0140:18`). Calendrier réglable de 1 à 3 relances, entre 1 et 90 j (`lib/relancesImpayes.ts:7-8`). | `relancer_facture`, texte fixe à 2 tons (`outils-actions.ts:141-145`), ou relance du passage de 8 h (3 modèles, `relancesImpayes.ts:49-51`). | niv. 1-2 (préparée « à valider », 0181) | niv. 3 : `factures.relances.auto` (`plans.ts:80`), type pilote `relance_impaye` (`regles.ts:33`, `:53`, `:67`) | = Signature, ou selon contrat (R2) | Oui, à activer et coupé par défaut (`relancesImpayes.ts:36`). Manque la boîte et le briefing. |
| 2 | Chantier terminé sans facture de solde | `chantiers.statut='termine'` et `etape='a_facturer'` (`lib/crm/alertes.ts:59-61`, `:129`). En Studio, sans CRM : devis accepté sans facture complète ni de solde (R10, ⚠). | Carte `creer_facture`, type `solde` : déduit acomptes et situations (`outils-actions.ts:110-121` ; drapeau `facturesSituation` levé, `flags.ts:271`). | niv. 1-2 | niv. 1-2 seulement : `creer_facture` est dans `OUTILS_JAMAIS_AUTO` (`regles.ts:71`) | niv. 1-2 | Alerte CRM affichée, en Signature seulement (`plans.ts:86`). Aucune carte. |
| 3 | Devis signé sans facture d'acompte | `devis.statut='accepte'` (`0002_devis.sql:42`, `accepte_le` `0033:4`), `acompte_pct > 0` (`0002:46`), aucune facture `type_facture='acompte'` liée (`0176:44`). AT et CP3 disent « si l'artisan en demande d'habitude » ; l'`acompte_pct` du devis est la donnée sourcée la plus simple (⚠ proposition). | Carte `creer_facture`, type `acompte`, au pourcentage du devis (`outils-actions.ts:117-118`, `sourcer: true`). | niv. 1-2 | niv. 1-2 | niv. 1-2 | Non |
| 4 | Devis envoyé sans réponse à J+3, J+7, J+14 | `devis.statut='envoye'`, `envoye_le` (`0055:35`) plus N jours, encore valable : `validite_jours`, 90 par défaut (`0002:44`, `devisExpiration.ts:57`). Demande non répondue (`STATUTS_DEMANDE`, `outils-actions.ts:42`). | `relancer_devis`, texte fixe à 2 tons (`outils-actions.ts:104-108`). | niv. 1-2 | niv. 3 : type `relance_devis` (`regles.ts:52`, `:67`) | R2 | En partie : relances de conversation J+2, J+5, J+10 (`relances.ts:22-23`), liste à 7 j (`briefing.ts:35`). Aucun J+3, J+7, J+14 planifié. |
| 5 | Facture émise non envoyée | `factures.statut='emise'` **sans aucune trace d'envoi** : l'envoi n'écrit rien sur la facture (`envoisPdfServeur.ts:101-138`). Les colonnes de `factures` (0006, 0041, 0140, 0176) n'en ont aucune. | `envoyer_facture` (`outils-actions.ts:340`), type `envoi_facture` (`regles.ts:42`, `:55`, `:67`), mentions bloquantes (`envoisPdfServeur.ts:120-121`). | niv. 1-2 | niv. 3, facture déjà émise seulement | R2 | Non. **Il faut une migration** (R8). |
| 6 | Demande entrante sans réponse au-delà du délai | Lead `statut='nouveau'` (`outils-actions.ts:42`) depuis plus de N minutes dans les horaires de l'artisan (AT:109). Mode de réponse : `plateformeConfig.ts:45`. | Réponse préparée par le moteur, puis `valider_reponse_proposee` (`regles.ts:51`), via `piloterProposition` (`pilote/serveur.ts:120`). | niv. 1-2 (« assistée », `verrou_offre` : `plateformeConfig.ts:183-185`) | niv. 3 en mode « auto » (`plans.ts:80`) | = Signature | Le moteur existe. Aucun détecteur de délai relevé (⚠ recherche non exhaustive). |
| 7 | Demande qualifiée : brouillon de devis sur ses tarifs | Demande assez précise pour chiffrer (AT:110). C'est du texte libre à classer : le seul détecteur qui a besoin du modèle (⚠). Lit `prix_artisan` ; un poste sans tarif reste « à chiffrer ». | `creer_devis` direct, en brouillon (`outils-actions.ts:60`), puis carte `envoyer_devis` (`:99-103`). | brouillon niv. 2 | l'envoi ne part **jamais** seul : texte de tiers lu, donc carte marquée et refusée par le pilote (`regles.ts:132` ; `actions-serveur.ts:1380-1386`), en plus de `prixSources` (`regles.ts:105`, `:154`) | niv. 2 | Il existe un chiffrage depuis la conversation (⚠ non relu). Aucun détecteur. |
| 8 | Devis bientôt expiré | `devis.statut='envoye'` ; échéance = `envoye_le` (ou `date_emission`) + `validite_jours`, moins X jours (`devisExpiration.ts:28-31`, `:57`). | Relance « votre devis expire le … » (AT:112). `relancer_devis` n'a que deux tons fixes (`outils-actions.ts:106`) : un modèle de texte est à ajouter (⚠). | niv. 1-2 | comme le rang 4 | R2 | Seule l'expiration existe, au passage quotidien. |
| 9 | Stock sous le seuil pour un chantier planifié | Matériau réservé par un chantier visible, sous son seuil ou en quantité insuffisante, pas déjà commandé (`lib/crm/alertes.ts:57`, `:109-125`). | `preparer_liste_achat` (`outils-actions.ts:220`), `enregistrer_commande` (`:419`), `rechercher_fournisseurs` (`:229`), auprès d'un fournisseur de sa liste. | niv. 1-2 | niv. 1-2 : commande proposée, l'envoi au fournisseur reste au niveau 2 (CP3:220) ; aucun type pilote | niv. 1-2, plus intégrations sur contrat | Alerte CRM (Signature) ; stock bas dans le briefing dès Studio (`briefing.ts:72`, `plans.ts:71`). |
| 10 | Chantier réceptionné : demande d'avis | Chantier `statut='termine'` depuis N jours. « Réceptionné » n'est pas un statut du code (`outils-actions.ts:43`). | `demander_avis` (`outils-actions.ts:440`). Opposition notée par `noter_opposition_client` (`:450`). | niv. 1-2 | niv. 1-2 : type `assistant_client` (`regles.ts:58`), mais pas exécutable sans session (`regles.ts:62-67`) | niv. 1-2 | Routine « après-chantier » du passage de 8 h, à activer (EDL:16). |

**Exclus des dix faute de donnée source** (CP3:361) :
- le paiement partiel : il n'existe pas de table `paiements`, seulement `factures.payee_le` (CP3:83) ;
- le seuil de franchise de TVA de l'artisan : aucune donnée (CP3:82).

**Notes sur les détecteurs**

- **Horloge.** AT prévoit le tic de la minute pour l'urgent et le passage quotidien pour le reste (AT:103, AT:329). Avec ADR-001 et
  CAP:65, le déclenchement passe dans n8n (R4). Les relances, elles, se déclenchent chaque jour.
- **Coût.** Les détecteurs 1, 4 et 8 n'ont pas besoin du modèle : le texte des relances est déjà fixe en code
  (`outils-actions.ts:106`, `:143` ; `relancesImpayes.ts:49-51`). La couche « rédaction » ne sert vraiment qu'aux rangs 6 et 7 et
  aux messages libres.
- **Double envoi.** Un même devis peut aujourd'hui recevoir trois relances par trois chemins séparés : conversation, CRM et
  assistant. Chacun garde son historique (note `SaaS/10 Presti/01 Produit/Geste - Relancer un devis sans réponse.md`). Le rang 4
  doit lire les trois avant de proposer.
- **Vidéos de Benj.** Les « agents » de la vidéo angelotturri recoupent trois gestes déjà présents : la relance des factures échues
  (rang 1), le chiffrage sur les prix de l'artisan (rang 7) et la proposition d'entretien (`envoyer_rappel_entretien`,
  `outils-actions.ts:445`) (SYN:87).

---

## 5. Le plan des organisations multi-membres, tel que cadré

### 5.1 Ce que Benj demande (P3:555-561)

1. Une migration additive : tables `organisations` et `membres`, avec cinq rôles (titulaire, associé, administratif, compagnon,
   invité). Chaque artisan existant reçoit son organisation, dont il est titulaire. Aucune colonne n'est supprimée.
2. Une fonction SQL unique, par exemple `peut_acceder(artisan_id)`. Les politiques RLS existantes passent dessus **table par
   table**, chaque pas testé : isolation entre organisations, droits par rôle. Un compagnon voit ses chantiers et son pointage, pas
   la compta.
3. `artisan_id` reste la clé de rattachement. On n'ajoute `organisation_id` à une table que si un besoin réel l'exige.
4. Un écran d'équipe (inviter, changer un rôle, retirer) et un journal de qui a fait quoi, derrière un drapeau : migration
   collée **puis** drapeau levé.

Avant la première migration : le plan complet (tables, politiques touchées, ordre, retour arrière) validé par Benj, et une
sauvegarde vérifiée.

### 5.2 Les choix de cadrage proposés (non approuvés)

- **Une organisation = un compte artisan** : `organisations.id = artisans.id`, aucune colonne `organisation_id` ajoutée
  (CP3:147, Q4).
- **L'invitation est réservée** à « Presti pour l'entreprise » et à Business. Studio et Signature ont une organisation à un
  titulaire (CP3:146, Q3).
- **La matrice des rôles vit en code** (`lib/organisations/droits.ts`) ; seul le rôle est en base (CP3:275).

### 5.3 Les tables neuves (CP3:281-283)

Toutes ont la RLS dès leur création, la garde de session posée et les droits `anon` retirés ; on y écrit par fonction ou par la clé de
service.

| Table | Contenu |
|---|---|
| `organisations` | id = `artisans.id`, nom, `actif`, `cree_le` |
| `membres` | `organisation_id`, `user_id`, rôle ∈ {titulaire, associé, administratif, compagnon, invité}, statut, `equipe_membre_id` facultatif vers `equipe_membres` (pour relier un compagnon à ses chantiers), `invite_par`, dates |
| `invitations` | jeton haché, rôle, expiration courte, usage unique |
| `utilisateurs` | sécurité par personne : id = `auth.uid`, `sessions_invalides_avant`, `connexion_verifiee_le`, nom (CP3:261) |

Remarque ✔ : les rôles actuels de l'équipe sont des métiers (artisan, compagnon, apprenti, salarié, sous-traitant, autre,
`outils-actions.ts:41`), pas des droits d'accès. Les fiches `equipe_membres` n'ont pas de compte de connexion [CP3:53].

### 5.4 Les fonctions SQL (CP3:308-313)

- **`comptes_accessibles(domaine text, niveau text) → setof uuid`** : STABLE, SECURITY DEFINER, `search_path = ''`. Elle rend le
  compte de l'utilisateur, **plus** les organisations où il est membre actif avec un droit suffisant, **sans** les comptes suspendus
  pour l'écriture. Les politiques s'écrivent `artisan_id in (select public.comptes_accessibles('devis','ecriture'))` : la fonction
  est évaluée une fois par requête (InitPlan), pas une fois par ligne.
- **`peut_acceder(artisan uuid, domaine text, niveau text) → boolean`** : le nom voulu par Benj. Elle répond vrai tout de suite si
  `auth.uid() = artisan`, puis consulte `membres`. Elle sert aux contrôles unitaires, à l'application et aux tests.
- **`role_de(artisan uuid)`**.
- **Interrupteur** : `comptes_accessibles` lit un réglage global (`reglages_globaux.organisations_actives`). À `false`, elle ne
  rend que `auth.uid()` : c'est un retour arrière instantané, sans DDL.

### 5.5 La matrice des rôles proposée (CP3:289-306, Q5)

| Domaine | Titulaire | Associé | Administratif | Compagnon | Invité |
|---|---|---|---|---|---|
| Abonnement, Stripe, suppression du compte, membres | écriture | — | — | — | — |
| Réglages, canaux (mots de passe de boîte), plateforme | écriture | écriture | lecture | — | — |
| Demandes, conversations, clients | écriture | écriture | écriture | — | lecture |
| Devis | écriture | écriture | écriture | — | lecture |
| Factures, impayés, compta | écriture | écriture | écriture | — | lecture (comptable) |
| Tarifs | écriture | écriture | lecture | — | — |
| Stock, commandes fournisseurs | écriture | écriture | écriture | lecture | — |
| Chantiers, tâches, pièces | écriture | écriture | écriture | **ses chantiers seulement** | lecture |
| Pointage, notes de chantier | écriture | écriture | lecture | écriture (les siens) | — |
| Assistant (chat) | complet | complet | sans actions d'argent | — | — |
| Boîte « À valider » | tout | tout | commercial et factures | ses tâches | — |
| Niveau 3 (réglages d'autonomie) | oui | non | non | non | non |

La RLS filtre des lignes, pas des colonnes : les colonnes secrètes (`canaux.secret`, identifiants Stripe d'`artisans`) n'ont aucune
politique pour les membres. Ceux-ci passent par une vue ou une fonction de service (CP3:306).

### 5.6 Les politiques RLS, dans l'ordre, avec leur retour arrière (CP3:315-332)

On **ne modifie aucune politique existante**. Chaque lot **ajoute**, table par table, des politiques permissives (`org_lire`,
`org_ecrire`, `org_maj`, `org_sup`), qui s'ajoutent en OU à l'existante. Pour un titulaire, le comportement reste identique par
construction ; le retour arrière est un `drop policy`. Le seul risque est d'élargir l'accès, c'est-à-dire une fuite : c'est ce que la
suite d'isolation doit prouver en rougissant (CP3:317).

| Pas | Contenu | Retour arrière | Prérequis |
|---|---|---|---|
| M0 | Sauvegarde des 92 tables prouvée. Base reconstruite en local (168 migrations rejouées dans un Postgres jetable). Essai à sec de chaque migration (`do $essai$ … raise exception`). | — | Q1, Q2 |
| M1, additif | Les quatre tables et les fonctions du §5.4. Une organisation et un titulaire par ligne `artisans` : 7 lignes [CP3:52], dont 4 de démo. Aucune table existante touchée. | `drop` des objets neufs | M0 |
| M2, garde | `jeton_session_valide()` et `compte_non_suspendu()` lisent aussi `utilisateurs`. La suspension d'une organisation bloque l'écriture de ses membres. | Restaurer les corps de 0138, gardés en tête de la migration | M1 ; banc d'essai des 24 cas de 0138, à recréer (⚠) |
| M3-A, lecture seule | `assistant_actions`, `assistant_journal`, `assistant_conversations`, `crm_journal`, `acces_support_lectures`, `prix_observations` | `drop` des `org_*` | M2 |
| M3-B, CRM | `chantiers`, `chantier_equipe`, `chantier_taches`, `chantier_materiaux`, `chantier_pieces`, `crm_notes`, `crm_rappels`, `crm_apres_chantier`, `equipe_membres`, `vehicules`. Le compagnon ne voit que les chantiers où `chantier_equipe` pointe vers son `equipe_membre_id`. | idem | M3-A |
| M3-C, commercial | `leads`, `messages` et `relances` (par le lead), `clients`, `clients_plateforme`, `plateforme_config`, `regles_automatisation`, `push_abonnements` (qui reste par utilisateur) | idem | M3-B |
| M3-D, argent | `devis`, `devis_lignes`, `factures`, `factures_lignes`, `relances_impayes`, `relances_impayes_arrets`, `relances_impayes_reglages`, `compta_reglages`, `prix_artisan`, `sites_commandes`, `packs_pubs` | idem | M3-C ; revue par un auditeur distinct |
| M3-E, stock | `materiaux`, `stock`, `mouvements_stock`, `fournisseurs`, `listes_achat`, `lignes_achat`, `commandes_fournisseur` | idem | M3-D |
| M3-F, fermé | `canaux`, `artisans`, `postes_types` : les membres n'y accèdent que par une vue ou une fonction de service | — | — |
| M4, stockage | Politiques `storage.objects` étendues au dossier de l'organisation. `chantier-pieces` reste privé, avec des URL signées par le serveur. | `drop` | M3-B |
| M5, `acteur_id` | Colonne facultative sur `assistant_journal` et `crm_journal`, et `opportunites_decisions.acteur_id` | `drop column` | M1 |
| M6, gardes manquantes | Rejouer la boucle de 0138 sur les 10 tables sans garde [CP3:48]. Un test échoue si une table sous RLS n'a pas `garde_session`. | `drop` | indépendant |

**Retour arrière global**, à tout moment : `organisations_actives = false`. On retrouve le comportement d'aujourd'hui, sans DDL
(CP3:313).

### 5.7 La couche application (CP3:334-338)

`authArtisan` rend `{ uid, iat, email }`, et environ 270 fichiers lisent `uid` comme l'identifiant du compte [CP3:51]. Le plan :

1. `resoudreCompte(session)` rend `{ acteurId, compteId, role }`. Pour un titulaire, `compteId = uid` : rien ne change.
2. **Un non-titulaire est refusé par défaut** (403, « route non ouverte aux membres ») sur toute route qui ne déclare pas
   `{ domaine, niveau }`. Sur une route pas encore migrée, il ne voit rien.
3. Les routes migrent par vagues, au rythme des lots M3.
4. Le pilote, le tic et les crons restent par `artisan_id`. Le journal reçoit `acteur_id` partout où un humain décide.

### 5.8 Les tests (CP3:340-342)

Une suite `organisations-qa.mjs` (absente ✔) tourne sur un Postgres local avec les 168 migrations. Elle couvre :

- (a) deux organisations, chacune avec titulaire, administratif, compagnon et invité : aucun croisement sur chacune des 44 tables,
  liste lue dans le catalogue ;
- (b) la matrice des rôles, en cas positifs et négatifs ;
- (c) le compagnon ne voit que ses chantiers ;
- (d) quatre mutations qui doivent la faire échouer : retirer la clause `statut = 'actif'`, inverser `organisation_id`, retirer la
  garde de suspension, passer la fonction en `security invoker` ;
- (e) la garde 0138 appliquée à un membre sans ligne `artisans` ;
- (f) l'interrupteur à `false` donne le comportement d'aujourd'hui ;
- (g) la couverture : toute table avec `artisan_id` a sa politique `org_*`, ou une exclusion motivée.

Phases : P4a (M1, M2, M6 et la suite, drapeau `organisations` baissé), puis P4b (M3 à M5, lot par lot, chaque lot avec le « go » de
Benj, plus l'écran d'équipe) (CP3:354, CP3:356).

### 5.9 Ce qui reste à régler avant M1

- **La sauvegarde ne couvre que 34 tables** (✔ `scripts/sauvegarde.mjs:49-59`) : M0 n'est pas fait, et rien dans le réseau
  neuronal ne montre une sauvegarde rétablie depuis le 01/11.
- **La faille de la garde 0138 est confirmée ✔** (`supabase/migrations/0138_garde_session_rls.sql:44-70`). La CTE `a` lit
  `artisans` par `auth.uid()`. Pour un membre absent d'`artisans`, les conditions 1 (révocation) et 3 (code e-mail) sont vraies à
  vide. M2 doit donc passer avant toute invitation.
- **56 ou 44 tables ?** CP3 écrit « aucune colonne ajoutée aux 56 tables » (CP3:147) et « 44 tables concernées » (CP3:342). La
  différence n'est pas expliquée. Lecture probable ⚠ : 56 tables portent `artisan_id` (37 directes + 19 servies par la clé de
  service, CP3:49) ; 44 portent une politique métier hors `postes_types` et `contenu_*`. À vérifier dans le catalogue avant M3.
- **Qui a droit aux membres** (Q3) dépend de C2 : OFF dit l'offre Entreprise « disponible dans l'offre Signature ».
- **La RLS n'est que la moitié du modèle** [CP3:51] : 268 fichiers passent par la clé de service, qui l'ignore. Le refus par
  défaut côté routes (§5.7) est aussi critique que les politiques.

---

## 6. Ce qui ne s'automatise jamais

### 6.1 La liste §3.2 (P3:553)

« Même au niveau 3 », ces gestes restent des cartes, toujours :

1. envoyer un devis **signé**, ou modifier un prix sans source ;
2. encaisser, rembourser, ou toucher un moyen de paiement ;
3. déclarer à l'URSSAF ou aux impôts ;
4. supprimer des données ;
5. parler au nom de l'artisan sur un sujet d'escalade : litige, sinistre, « fuite », menace, avocat ;
6. inventer un créneau, un délai, un fournisseur ou un prix.

### 6.2 Les listes voisines, à fusionner

- **AT:236**, jamais automatisables quel que soit le réglage : émettre une facture, encaisser ou marquer payé, rembourser, faire un
  avoir, supprimer un document émis, envoyer un message juridique, modifier les tarifs en masse, contacter un client opposé.
- **CP3:221-224**, au niveau 3 : préparer une facture d'acompte ou de solde, jamais l'émettre. Émettre, encaisser, rembourser,
  faire un avoir, supprimer, changer les prix en lot : jamais. Message juridique, litige, sinistre, menace : jamais. URSSAF et
  impôts : hors périmètre.
- **P3:496-501**, interdits du positionnement : appels gérés, rendez-vous pris seuls, notifications inventées, devis envoyé seul
  sous Studio, paiements encaissés par l'IA. Et **P3:576** : l'IA ne passe ni ne décroche d'appel.
- **`lib/plans.ts:207` ✔** et AUT:42 : même en Signature, jamais un prix estimé ni un paiement sans l'artisan.

### 6.3 Ce qui le garantit dans le code aujourd'hui (✔), et les trous

| Geste interdit | Garde actuelle | Trou |
|---|---|---|
| Émettre une facture | `creer_facture` dans `OUTILS_JAMAIS_AUTO` (`lib/pilote/regles.ts:71`) ; la facture est émise et scellée à la confirmation (`outils-actions.ts:113`) | `creer_facture_libre`, ajouté le 29/10, n'est pas sur cette liste noire : seule la liste blanche le bloque (`regles.ts:67`, `:76`). Et le mode « fait tout seul » l'émet sur demande (C19). |
| Encaisser, rembourser, avoir | `marquer_facture_payee`, `rembourser`, `payer`, `creer_avoir` dans `OUTILS_JAMAIS_AUTO` (`regles.ts:70-73`). Les trois derniers ne sont pas dans le catalogue `SPEC` : les outils n'existent pas. | « Fait tout seul » marque payé sur demande de l'artisan (`actions-serveur.ts:1362-1379`) |
| Supprimer | `supprimer_devis_brouillon`, `supprimer_tarif` sur la liste noire | `supprimer_article` (29/10) n'y est pas ; seule la liste blanche le protège |
| Prix en lot, prix sans source | `augmenter_tarifs` sur la liste noire ; `prixSources` pour `envoi_devis` (`regles.ts:105`, `:154`) ; `chiffresNonSources` et `nombresASourcer` [CP3:24-25] | « Fait tout seul » applique un lot de prix sur demande (`actions-serveur.ts:1363`) |
| Escalade | Playbook « réclamation » : escalade humaine immédiate, ni devis ni rendez-vous (`lib/ai/playbooks.ts:41-49`) | Pour l'IA, « fuite » est une **urgence** à laquelle elle répond et propose un créneau (`playbooks.ts:32-38`, `lib/ai.ts:418`), alors que §3.2 en fait une escalade (C21, Q9) |
| Créneau, délai, fournisseur, prix inventés | Garde-fous des prompts (`lib/ai.ts`, anti-fabrication) ; « sans promettre une heure précise » (`playbooks.ts:37`) | Le moteur **propose** un créneau tiré des disponibilités. C'est permis tant que le créneau vient de l'agenda ; un rendez-vous pris seul reste interdit. |
| Client opposé | `noter_opposition_client` (`outils-actions.ts:450`) ; table `crm_apres_opposition` [CP3:48] | La porte de conformité unique reste à écrire (AT:221-232) |
| URSSAF, impôts | Aucune fonction de déclaration : le mot ne sert qu'à classer des pièces [CP3:82] | — |
| Liste noire tenue à la main | La sécurité réelle vient de la liste blanche `OUTILS_EXECUTABLES_PILOTE` (`regles.ts:67`) | Il faut dériver `jamais_auto` du catalogue (CP3:36, CP3:287), et tester sur tout le catalogue qu'aucun geste §3.2 ne devient pilotable (P3:603) |

---

## 7. Contradictions : documents entre eux, documents et code

| # | Ce que dit l'un | Ce que dit l'autre, ou le code (✔ = vérifié ce jour) | Conséquence et défaut |
|---|---|---|---|
| C1 | OFF:12 : « `plateforme.ia.auto` à partir de Studio ». La note `positionnement-automatique-2510` dit aussi « réponse automatique et relances dès Studio ». | `lib/plans.ts:63` et `:80` ✔ : réservé à Signature depuis le 25/10. OFF:10 dit lui-même pour Studio « l'artisan valide avant envoi ». | On garde le code et AUT, et on fait confirmer par Benj (OFF-1). La note de mémoire est périmée. |
| C2 | OFF:28-36 : Entreprise « disponible dans l'offre Signature, même niveau d'autonomie », « pas un niveau d'autonomie différent ». | P3:546 et P3:550 : niveau 3 « sur les types convenus par contrat ». CP3:226 : niveaux posés par un administrateur après contrat. `lib/plans.ts:14`, `:151-152` ✔ : aucune offre « entreprise », deux offres seulement. | R2. OFF est plus récent (18 h 06) et prime sur le fond : même autonomie que Signature. |
| C3 | P3:52-84 : trois abonnements, Assisté, Semi-automatique, Autonome supervisé. | OFF et AUT : Studio et Signature, Entreprise sans autonomie propre. L'annexe règle l'autonomie **par type d'action** (P3:548). Le palier « semi-automatique » n'a pas d'équivalent : en Studio, rien ne part (`plans.ts:11`). | Les alertes internes à l'artisan (stock, briefing) ne « partent » chez personne : elles peuvent être automatiques dans toutes les offres. |
| C4 | ADD:69-72 et AUT:8-11 : « TOUT est automatique par défaut ». | Code ✔ : tout est à activer. `mode_reponse: 'assistee'` (`plateformeConfig.ts:45`), relances d'impayés `actif: false` (`relancesImpayes.ts:36`), types du pilote coupés (EDL:25). AT:425 propose « je propose » pour tous. AUT:37-38 relève l'écart sans le trancher. | R7. |
| C5 | AT:53-54 : « pas de n8n, pas de Docker », le détecteur s'ajoute au tic. CP3 §4 et Q10 : détecteurs en code sur le tic, n8n réduit au chien de garde et aux intégrations Entreprise. | ADD:23, ADR-001 et CAP:65 : « toute automatisation vit dans n8n, jamais en dur dans le backend ». Aucune trace de n8n dans `lib/`, `app/`, `scripts/` [CP3:94]. | R4 : la règle en code, le déclenchement dans n8n. |
| C6 | P3:127-135 : les agents tournent sur Hermes + Orca. OFF:34 : « même moteur (n8n + Hermes + Orca) ». CAP:65 : le jugement passe par Hermes. | P3:566 et `architecture-outils.md` : Hermes n'est jamais devant un artisan. P3:568 : les agents deviennent des familles d'outils de l'assistant existant. CP3:153 : Hermes et Orca hors production. ADR-002, points 3 et 4 : Hermes tourne sur le PC, il dépend du tunnel. Hermes partage le crédit du produit (`architecture-outils.md`). | R3. |
| C7 | OFF:8, OFF:15, OFF:22 : « systèmes complexes n8n inclus » dans chaque offre. | Aucun workflow métier dans n8n (ADR-001) ; n8n absent du code. | Une promesse non tenue : à ne pas afficher (R11, `lib/plans.ts:5-7` ✔). |
| C8 | « 45 outils d'action » (P3:448, P3:532 ; EDL:13 ; AT:23, AT:156). | `outils-actions.ts` ✔ : 52 actions, 32 `direct` et 20 `confirmation` ; 21 lectures dans `outils.ts` ✔. | Citer 52. |
| C9 | « Aucun détecteur », « aucun code ne parcourt les données » (P3:459 ; EDL:23). | ✔ Règles pures existantes : `lib/crm/alertes.ts:76-150` (6 types : retard, livraison, attendue, stock, à facturer, sans équipe, avec une clé par objet), `briefing.ts:35-80`, `relancesImpayes.ts`, `relances.ts`, `devisExpiration.ts`. | Les réutiliser : elles affichent ou relancent, mais aucune ne remplit une file d'opportunités. Le constat reste vrai pour la file seulement. |
| C10 | Détecteurs 2, 9, 10 « pour tous » (CP3:361). | ✔ Les alertes de chantier ne vivent que dans le CRM, réservé à Signature (`plans.ts:84-86`). En Studio, les outils CRM sont refusés (`plans.ts:73-74`). | R10. |
| C11 | Détecteur « facture émise non envoyée » (AT:116, CP3:361). | ✔ L'envoi n'écrit rien sur la facture (`envoisPdfServeur.ts:101-138`), à part une clé anti-doublon de 10 min (`:105-106`). `factures` n'a aucune colonne d'envoi. | R8 : il faut une migration. |
| C12 | P3:72-78 : en autonomie, « devis selon des règles » et « réponses clients simples ». | ✔ Toute carte née après lecture d'un texte de client ou de fournisseur est marquée et ne part jamais seule (`regles.ts:132`, `actions-serveur.ts:1380-1386`, audit du 21/10). | R9 : le devis tiré d'une demande reste au niveau 2. |
| C13 | P3:290-299 : `organization_id` sur chaque table, noms anglais (`users`, `organizations`…). | P3:559 : `artisan_id` reste la clé. CP3:147 : aucune colonne ajoutée. `CLAUDE.md` : identifiants en français. | L'annexe et les règles du dépôt priment (P3:515). |
| C14 | P3:22-38 : Vitest ou pytest, Docker, pgvector, OpenAI ou OpenRouter, Kokoro, WaveSpeed. | Aucun de ces paquets dans le dépôt, pas d'extension `vector` [CP3:47, CP3:98]. WaveSpeed interdit sans Benj, et aucune donnée de client vers un modèle gratuit en ligne (`architecture-outils.md`, `securite.md`). | CP3:154 (Q11) : aucune dépendance ajoutée. OpenRouter gratuit est exclu pour les données d'artisan. |
| C15 | P3:489 : « sous Signature, `modeEffectif` rétrograde ». | `plateformeConfig.ts:183-185` ✔ : il rétrograde quand l'offre n'a pas `plateforme.ia.auto`, donc **en dessous** de Signature. | Erreur de rédaction de l'annexe, déjà relevée en CP3:401. |
| C16 | `migration-production.md` : voie 1 `appliquer-migration.mjs`, qui exige `DIRECT_URL` ; voie 2, Benj colle le jumeau. | `DIRECT_URL` est refusée depuis le 14/09 [CP3:108]. La règle du 24/09 interdit de demander à Benj de coller. CP3 Q2 passe par le connecteur, chemin que la règle ne cite pas. | Q2 : le connecteur, après « go » écrit, avec le jumeau en repli. Faire inscrire cette voie dans la règle. |
| C17 | AT:113 et AT:115 : facture d'acompte ou de solde « préparée, non émise ». | ✔ `creer_facture` émet **et scelle** à la création (`outils-actions.ts:113-114`, `:124`). Il n'existe pas de facture brouillon. | « Préparée » veut dire : une carte `creer_facture` en attente. La facture n'existe qu'au clic. |
| C18 | DoD de P3:626 : une relance de devis au niveau 3 « s'annule pendant 10 minutes ». | En Signature, les relances de **conversation** partent du passage de 8 h **sans** fenêtre de 10 min. Seules les cartes et propositions du pilote l'ont (note du vault « Geste - Relancer un devis… », §6 ; `lib/pilote/serveur.ts:99-142`). | Deux chemins automatiques, deux garanties. Le rang 4 doit passer par le pilote, et le chemin J+2/5/10 être aligné ou documenté. |
| C19 | P3:553 : gestes §3.2 « toujours en carte ». AT:236 : « toujours des cartes à confirmer ». | ✔ « Fait tout seul » (29/10, choix de Benj) exécute **toute** action à confirmer, encaissement, émission, suppression et lot de prix compris, quand l'artisan l'a demandée et qu'aucun texte de tiers n'a été lu. Cela vaut dans toutes les offres qui ont l'assistant (`cadrage.ts:151-162`, `actions-serveur.ts:15-21`, `:1362-1379`). | R1. Le test « jamais en automatique au niveau 3 » (P3:603) tient, grâce à la liste blanche, mais la phrase « toujours en carte » est fausse aujourd'hui. |
| C20 | P3:597 : clé d'idempotence (artisan, type, objet, **jour**). | AT:140 et CP3:379 : clé par **étape** (`devis_sans_reponse:<id>:j7`). | Avec « jour », une relance J+7 retentée le jour 8 crée une seconde opportunité, donc un double envoi possible. R12 : par étape. |
| C21 | P3:553 : « fuite » est un sujet d'escalade, jamais traité seul. | ✔ `lib/ai/playbooks.ts:32-38` et `lib/ai.ts:418` : une fuite est une **urgence**. L'IA rassure, donne le geste de sécurité et propose un créneau, seule en mode « auto ». | Q9 : un lexique par métier. Pour un plombier, la fuite est une urgence, le litige une escalade. |
| C22 | `email-brevo.md` : relances de factures et de devis dans un workflow n8n distinct de la prospection, « pour ne pas consommer le même quota ». Brevo gratuit : 300 par jour, avec sa marque. | ✔ Le code envoie par Resend. Un commentaire du code donne l'offre gratuite à 100 par jour (`lib/email.ts:77` ; formule réelle du compte ⚠). Le code plafonne **pour toute la plateforme**, avec des clés sans identifiant d'artisan : 80 e-mails transactionnels par jour (`emails:produit:jour`) et 80 autres (`emails:jour`) (`lib/email.ts:88-94`). Un même compte Brevo partage ses 300 envois quel que soit le workflow. | R5 : mesurer, rester sur Resend pour les clients des artisans. Monter un plafond est une dépense, donc une décision de Benj. |
| C23 | Marque blanche : jamais « Presti » chez le client (P3:442, AT:46). | ✔ L'adresse d'expédition des e-mails au nom d'un artisan vaut par défaut `contact@prestiapp.fr` (`lib/email.ts:18-20`) ; le nom affiché et le `Reply-To` sont ceux de l'artisan. La valeur de `EMAIL_EXPEDITEUR_ARTISAN` en production n'est pas lisible ici (⚠). | R6. |
| C24 | P3:432, P3:516, P3:556 : « ≈ 180 migrations » ; « garde de session sur 63 tables » (P3:432, P3:475, P3:536). | ✔ 168 fichiers de migration, le dernier `0181`, plus 136 jumeaux `_A_COLLER`. CP3 a compté 328 politiques `garde_*`, soit 82 tables × 4, et 10 tables sous RLS sans garde [CP3:48]. « 63 », c'est le nombre de fichiers qui importent `authArtisan` [CP3:51]. | Ne plus citer 180 ni 63. |
| C25 | P3:424-425, P3:580 : « relève de boîte : identifiants refusés » ; « tâches du PC arrêtées depuis le 28/10 » ; P3:407 : « Orca à vérifier ». | CP3:11 et CP3:69-75 : au 01/11, la boîte est « non configurée », la panne a changé de nature, et les tâches tournent de nouveau. Six tâches ont depuis été mises en pause (`chantiers-0111-etat-et-branchements`). Orca est installé sur le PC (ADR-002, CP3:95). | Partir de l'état du 01/11, pas de l'annexe. |
| C26 | SYN:38 : les dossiers `10 Presti/…`, `30 Prospection/…`, `40 Vidéos/…`, `50 Automatisations/…` cités par CTX:26-32 « n'existent pas ». | ✔ Ils existent depuis la phase 1.4 (`ls` du 02/11) : `01 Produit` (6 fichiers), `04 Décisions` (8, dont ADR-007), les autres 1 fichier chacun. | Constat périmé : lire ces dossiers. |
| C27 | ADR-007 (« proposée », 02/11) : « Studio prépare et Signature envoie seul » le SMS, par n8n. | CP3:219 : SMS « niveau 3 : non en v1 ». CP3:149 : étape 0 par lien `sms:`, coût vu avant tout envoi réel. P3:574 : drapeau, coût montré à Benj. Aucun SMS dans le code [CP3:80]. | Garder CP3, plus prudent, tant que l'ADR n'est pas acceptée. |
| C28 | P3:568 : les agents deviennent « Devis, Facture, Relance, Fournisseur, Stock, Planning, Compta, Client ». | P3:241-250 en nomme dix autres : Conversation, Document, Reporting, QA… AT:311-323 en propose onze rôles. | Trois découpages : en garder un, « familles d'outils et de détecteurs » (P3:568). |
| C29 | `CLAUDE.md` : « cinq chantiers, dans cet ordre, jamais deux en parallèle » ; `Journal-Decisions` du 01/11 : « en gardant l'ordre ». | CAP:63 : priorité C4 > C3 > C1 > C2 > C5 si le temps manque. La demande relayée du 02/11 : C4 **et** la landing la même nuit. | La parole la plus récente de Benj prime ; à la session principale de le noter au journal. |

---

## 8. Vérifications faites ce jour (lecture seule) et ce qui ne l'a pas été

**Fait, avec les outils Grep, Read, `git` et `ls`, sans rien écrire :**

- **Offres** : `lib/plans.ts:11-15`, `:56-90`, `:95-108`, `:134-136`, `:151-152`, `:207`. Le `PlanId` sans « entreprise »,
  `plateforme.ia.auto` seulement en Signature, aucune capacité `organisation.*`.
- **Mode de réponse** : `lib/plateformeConfig.ts:45`, `:183-185`.
- **Pilote** : `lib/pilote/regles.ts:24`, `:27`, `:29`, `:33`, `:50-60`, `:67`, `:70-73`, `:105`, `:132`, `:149-155` ;
  `lib/pilote/serveur.ts:99`, `:120`.
- **Actions et lectures de l'assistant** :
  - `lib/assistant/outils-actions.ts` : 52 `cat:` dont 20 `confirmation` ; les 52 noms relevés ; `:41-49`, `:104-145`, `:468`,
    `:474` ;
  - `lib/assistant/outils.ts` : 21 `name:` ;
  - `lib/assistant/cartes.ts:18` ; `lib/assistant/cadrage.ts:145`, `:151-162` ;
  - `lib/assistant/actions-serveur.ts:15-21`, `:1355-1399` ; `lib/assistant/briefing.ts:35-80`.
- **Règles de détection existantes** : `lib/crm/alertes.ts:1-150` ; `lib/relancesImpayes.ts:7-8`, `:36`, `:49-51`, `:164`,
  `:204-230` ; `lib/relances.ts:22-23` ; `lib/devisExpiration.ts:28-31`, `:57`.
- **E-mail** : `lib/email.ts:15-20`, `:77`, `:93` ; `lib/envoisPdfServeur.ts:101-138`.
- **Escalade et urgence** : `lib/ai/playbooks.ts:20-49` ; `lib/ai.ts:81-86`, `:418` (grep).
- **Drapeaux** : `lib/flags.ts`, 57 drapeaux ; `assistant` (l. 161), `crm` (172), `piloteAutomatique` (243) et
  `facturesSituation` (271) sont levés ; `inventaireOcr` (56) et `canauxWhatsapp` (70) sont baissés ; aucun drapeau `consoleV2`,
  `organisations` ni `sms` sur `main`.
- **Migrations** : 168 fichiers `NNNN_*.sql`, le dernier `0181_relances_impayes_a_valider.sql`, 136 jumeaux `_A_COLLER`. Aucune
  table `organisations`, `membres`, `invitations`, `utilisateurs`, `evenements_metier`, `opportunites`, `detecteurs`, `paiements`,
  `autonomie_reglages` ni `sms_envois`. Colonnes relevées : `0002_devis.sql:42`, `:44`, `:46` ; `0006_factures.sql:17`, `:19` ;
  `0033:4` ; `0055:35` ; `0140:18` ; `0176:44`.
- **Garde de session** : `0138_garde_session_rls.sql:40-75`.
- **Sauvegarde** : `scripts/sauvegarde.mjs:49-59`, 34 tables comptées.
- **Absents** : `lib/automatisations/`, `lib/organisations/`, `scripts/organisations-qa.mjs`. **Présents** : `lib/agents/pause.ts`,
  `scripts/rls-e2e.mjs`, `app/assistant/page.tsx`, `app/dashboard/page.tsx`.
- **Git** :
  - dates des commits : `2ba41f92` le 25/10, `24e5caee` le 26/10, `8022cc60` et `a51a12a8` le 29/10 ; HEAD = `a51a12a8` ;
  - branches : `assistant-a1-a2`, `assistant-ameliorations`, `recette-crm-assistant` et `rgpd-crm-assistant` n'ont aucun commit
    d'avance sur `main` (déjà fusionnées) ;
  - `claude/comptes-fournisseurs-0a934e` a 1 commit d'avance : 6 fichiers, un drapeau et `lib/inventaire/acces-prix.ts`, sans
    migration dans son diff ;
  - `refonte-1018` a 37 commits d'avance et 19 de retard ; `consoleV2: true` à `lib/flags.ts:189` de cette branche, avec la
    consigne de le retirer avant fusion.
- **Prompt maître** : P3 et `prompts-maitres/PROMPT-3-assistant-gestion.md` sont identiques, à 3 lignes de `diff` près (le
  marqueur final).
- **Vault** : les 7 dossiers numérotés cités par CTX existent (`ls`).

**Non vérifié** : la base elle-même. Aucune requête n'a été faite ; les chiffres marqués [CP3] viennent du catalogue lu par le cadrage
le 01/11 (92 tables, 389 politiques, 7 lignes `artisans`). Ne sont pas vérifiés non plus :
- les variables Vercel (`EMAIL_EXPEDITEUR_ARTISAN`, `IMAP_*`) ;
- le budget IA réel ;
- l'état des deux sauvegardes ;
- le contenu de `lib/devisAuto.ts` et de `app/api/cron/relances/route.ts`, cité seulement à travers la note du vault ;
- les suites `--live` et `rls-e2e`, non jouées (interdit).

---

## 9. Les notes du réseau neuronal utilisées

Lues avec les outils MCP `cerveau` (`chercher`, `lire`, `regles_pour`, `quoi_de_neuf`) :

- **Mémoire** : `memoire-presti/chantiers-0111-etat-et-branchements.md`, `memoire-presti/repartition-claude-freellmapi-0111.md`,
  `memoire-presti/comptes-fournisseurs-connectes-2910.md`, `memoire-presti/ia-gratuite-produit-2910.md`,
  `memoire-presti/positionnement-automatique-2510.md`, `memoire-presti/pilote-auto-aide-2110.md`,
  `memoire/migrations-je-les-applique.md`.
- **Décisions** : `vault/Decisions/Journal-Decisions.md`, entrées « 2026-11-01 — Addendum… » et « 2026-11-01 (fin de soirée) » ;
  `vault/10 Presti/04 Décisions/ADR-001…`, `ADR-002…` et `ADR-007 — SMS…` (statut « proposée »).
- **Produit** : `vault/10 Presti/01 Produit/Geste - Relancer un devis sans réponse.md` (trois mécanismes, trous connus, absence de
  J+3, J+7, J+14).
- **Fil de session** : `vault/inbox/sessions/2026-11-02-01h07-b6e06ae6-avant-compression.md`, l. 15, 29, 44, 49-50, 53-56, 60-65.
- **Récap** : `vault/Récap-Projet.md`, section « Au 2026-11-01 au soir », et `vault/wiki/concepts/Positionnement automatique.md`
  (extraits).
- **Recherches sans résultat** : un « approuvé » ou des « défauts OK » sur le cadrage du chantier 4 ; une sauvegarde rétablie
  depuis le 01/11.
