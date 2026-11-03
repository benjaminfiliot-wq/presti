# gabarit-artisan-operations — Opérations : agenda, chantiers, stock

Fiche du gabarit outillé (tâche 036-015, prompt 6, outillage, lot 3). Ligne 6 de la matrice de `OUTILLAGE.md` § 5 : Planificateur (agent Claude ; outils : disponibilité de Google Agenda ou événements d’Outlook), rendez-vous posé dans l’Agenda après le choix du client, rappel de la veille (Telegram, WhatsApp, Twilio), Gardien du stock (commande en brouillon Gmail ou Outlook), Archiviste (Drive ou OneDrive, un dossier par client et par chantier), import Sheets ou Excel par le circuit contrôlé.

**Inactif, en simulation, sans identifiant.** Identifiant n8n d’Oracle : `1Z8e8h5ePVa6t4Np` (jamais publié, jamais activé). 72 nœuds. Export : `.orchestre/preuves/036-015/gabarit-artisan-operations.workflow.json`. Juges : `scripts/n8n-specs-qa.mjs` (R1 à R23) et `scripts/gabarits-terrain-qa.mjs`. Générateur : `.orchestre/preuves/036-015/construire.mjs operations`.

## Le geste

Trois entrées, toutes à intervalle (aucun webhook) : toutes les 15 minutes (rendez-vous, imports), chaque jour à 17 h 05 (rappel de la veille et stock ; 17 h 05 pour ne jamais tomber sur le quart d’heure), un nouveau document dans Drive. Le Code **compte et choisit** :

- **un créneau vient de l’agenda lu** : le Code fabrique des créneaux *candidats* (9 h, 11 h, 14 h, 16 h, hors dimanche) ; ils partent lire l’agenda (Google : `availability`, une réponse par candidat ; Outlook : les événements, un créneau qui en chevauche un n’est pas libre). Un créneau n’est libre que si l’agenda le dit. Au plus 3 créneaux, 2 par jour. **Aucun créneau libre : aucun rendez-vous, une carte.** Une lecture qui ne rend pas autant de réponses que de candidats ne libère rien ;
- **le modèle choisit des numéros, jamais une date** : le Planificateur rend `indices` parmi les créneaux lus ; toute heure citée dans son message doit être celle d’un créneau offert, sinon rejet ;
- **un rendez-vous ne se pose qu’après le choix du client** : l’événement `creneau_choisi` doit venir du client, viser un créneau *proposé*, encore libre à la relecture, et être validé (clic de l’artisan, ou Signature avec le type `rendez_vous` activé). Sinon une carte ;
- **rappel de la veille** : consentement et aucune opposition ; texte fixe (aucun modèle), STOP dans chaque SMS ; envoyé seul en Signature avec le type `rappel_rendez_vous`, sinon une carte ;
- **stock** : un article au seuil, avec un fournisseur désigné par l’artisan et sans commande ouverte. La **quantité est calculée par le code** (`2 × seuil − quantité`) ; le modèle rédige l’e-mail, tout nombre étranger est rejeté, aucun prix. La commande reste un **brouillon** Gmail ou Outlook : une commande envoyée est une validation ;
- **document reçu** : l’Archiviste choisit le type et le chantier dans la liste lue ; un chantier hors liste ne range rien. Classement en Signature avec le type `classement_documents`, sinon une carte ;
- **import** : lecture du classeur (Sheets ou Excel), aperçu, carte de validation. Aucune écriture avant la validation (`lib-synchroniser-outil`).

**La porte « simulation » est unique et se place devant chaque effet** : sa sortie « vrai » ne fait que journaliser l’effet prévu (le modèle n’est pas appelé, la réponse vient d’un enregistrement daté) ; tout nœud qui écrit, envoie, publie, pose un rendez-vous ou appelle le modèle n’est atteint que par sa sortie « faux ». Le gabarit pose `simulation: true` : la copie ne le lève qu’avec le « go » écrit de Benj.

## Les nœuds (table lue dans l’export)

| Nœud | Type · ressource · opération | Fait | Place | Note |
|---|---|---|---|---|
| Toutes les 15 minutes | scheduleTrigger | déclenche (relève à intervalle) | entrée | Rendez-vous : créneaux à proposer, rendez-vous à poser, imports demandés. |
| Compte et mode | code | calcule | avant la porte, ou sur sa sortie « simulation » | Le compte de la copie du client, le mode à blanc, les bornes de demain. |
| Chaque jour à 17 h 05 | scheduleTrigger | déclenche (relève à intervalle) | entrée | Rappel de la veille et stock sous le seuil. 17 h 05, pour ne jamais tomber sur le quart d’heure. |
| Nouveau document dans Drive | googleDriveTrigger | déclenche (relève à intervalle) | entrée | Google Drive Trigger (relève à intervalle, pas de webhook). Dossier surveillé à choisir par la copie. |
| Lire la configuration | httpRequest | lit pilote_reglages | avant la porte, ou sur sa sortie « simulation » | Réglages du pilote, offre, et outils choisis par le client. Colonnes exactes à fournir à l'intégration (036-012). |
| Lire les demandes | httpRequest | lit evenements_metier | avant la porte, ou sur sa sortie « simulation » | Demandes du client déposées dans la plateforme ; une clé terminée par :fait est close (idempotence). |
| Lire les rendez-vous de demain | httpRequest | lit rendez_vous | avant la porte, ou sur sa sortie « simulation » | Rendez-vous de DEMAIN (jour de Paris). Un rappel exige le consentement et aucune opposition. |
| Lire le stock sous le seuil | httpRequest | lit articles_sous_seuil | avant la porte, ou sur sa sortie « simulation » | Vue de l'inventaire limitée aux articles dont la quantité est au seuil (lib/inventaire/). Fournisseur désigné par l'artisan seulement. |
| Lire les chantiers | httpRequest | lit chantiers | avant la porte, ou sur sa sortie « simulation » | La liste fermée dans laquelle l’archiviste choisit : il ne peut pas inventer un chantier. |
| Créneaux à vérifier | code | calcule | avant la porte, ou sur sa sortie « simulation » | Créneaux candidats : ils partent lire l’agenda, ils ne sont jamais proposés tels quels. |
| Des créneaux à vérifier ? | if | aiguille | avant la porte, ou sur sa sortie « simulation » |  |
| Agenda Outlook ? | if | aiguille | avant la porte, ou sur sa sortie « simulation » |  |
| Événements Outlook | microsoftOutlook · event · getAll | lit | avant la porte, ou sur sa sortie « simulation » | Microsoft Outlook · event · getAll (lecture) : les événements de la période. Un créneau qui en chevauche un n’est pas libre. |
| Garder les créneaux libres | code | calcule | avant la porte, ou sur sa sortie « simulation » |  |
| Disponibilité Google Agenda | googleCalendar · calendar · availability | lit | avant la porte, ou sur sa sortie « simulation » | Google Calendar · calendar · availability (lecture) : le créneau est-il libre ? C’est la SEULE source d’un créneau proposé ou d’un rendez-vous posé. Une réponse par candi |
| Décider | code | calcule | avant la porte, ou sur sa sortie « simulation » |  |
| Porte simulation | if | aiguille | PORTE | Vrai : simulation, rien ne part, rien ne s'écrit. Faux : l'effet réel (jamais atteint tant que la copie du client n'a pas le « go » de Benj). |
| Effets prévus | code | calcule | avant la porte, ou sur sa sortie « simulation » | Branche simulation : l’effet prévu part au journal, rien ne part, aucun rendez-vous n’est posé. |
| Créneaux à proposer ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Planificateur | ia:agent | appelle le modèle | derrière la porte (sortie « faux ») | Agent IA « Planificateur » : le modèle rédige, il ne compte rien et ne décide de rien ; ses outils lisent seulement. |
| Claude · Planificateur | ia:lmChatAnthropic | sous-nœud | sous-nœud de l’agent (lecture seule) | Modèle du spécialiste « Planificateur » : Claude Haiku 5.5, température basse, sans identifiant dans le gabarit (la copie du client branche sa clé). |
| Outil : disponibilité Google Agenda | googleCalendarTool · calendar · availability | lit | sous-nœud de l’agent (lecture seule) | Google Calendar · availability (lecture seule). L’agent peut vérifier qu’un créneau est libre ; il ne pose rien. |
| Outil : événements Outlook | microsoftOutlookTool · event · getAll | lit | sous-nœud de l’agent (lecture seule) | Microsoft Outlook · event · getAll (lecture seule). Alternative à Google Agenda pour les clients sur Microsoft 365. |
| Schéma · Planificateur | ia:outputParserStructured | sous-nœud | sous-nœud de l’agent (lecture seule) | Schéma strict (JSON Schema saisi, autoFix faux) : hors schéma = rejet, la sortie repasse un Code qui la revalide. |
| Revalider la proposition | code | calcule | derrière la porte (sortie « faux ») |  |
| Préparer la carte | code | calcule | derrière la porte (sortie « faux ») |  |
| Aucun créneau libre ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Rendez-vous à poser ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Pose permise ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Poser sur Outlook ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Journaliser le rendez-vous | httpRequest | écrit evenements_metier | derrière la porte (sortie « faux ») | Une ligne par rendez-vous posé, clé unique : un crash ne pose jamais deux fois. |
| Poser le rendez-vous dans Google Agenda | googleCalendar · event · create | ÉCRIT | derrière la porte (sortie « faux ») | Google Calendar · event · create. Atteint SEULEMENT après la porte, pour un créneau CHOISI par le client, proposé, encore libre à la relecture, et validé (clic de l’artis |
| Rappel de la veille ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Rappel autorisé ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Lire le contact du rappel | httpRequest | lit clients | derrière la porte (sortie « faux ») | Lue AU MOMENT d’envoyer : le seul contact du client consentant, jamais gardé. |
| Assembler le rappel | code | calcule | derrière la porte (sortie « faux ») |  |
| Rappel par Telegram ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Rappel par Telegram | telegram · message · sendMessage | ÉCRIT | derrière la porte (sortie « faux ») | Telegram · message · sendMessage, au client consentant, texte fixe (aucun modèle). Atteint après la porte, en Signature avec le type « rappel_rendez_vous » activé ; sinon |
| Journaliser le rappel | httpRequest | écrit evenements_metier | derrière la porte (sortie « faux ») | Une ligne par rappel envoyé, clé unique : un rappel ne part jamais deux fois. |
| Rappel par WhatsApp ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Rappel par WhatsApp | whatsApp · message · send | ÉCRIT | derrière la porte (sortie « faux ») | WhatsApp Business Cloud · message · send. Un rappel hors fenêtre de 24 h exige un modèle validé par Meta : à brancher dans la copie. |
| Rappel par SMS | twilio · sms · send | ÉCRIT | derrière la porte (sortie « faux ») | Twilio · sms · send, uniquement quand l’API SMS est choisie et que le coût a été montré à Benj. STOP dans chaque SMS. |
| Stock sous le seuil ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Gardien du stock | ia:agent | appelle le modèle | derrière la porte (sortie « faux ») | Agent IA « Gardien du stock » : le modèle rédige, il ne compte rien et ne décide de rien ; ses outils lisent seulement. |
| Claude · Gardien du stock | ia:lmChatAnthropic | sous-nœud | sous-nœud de l’agent (lecture seule) | Modèle du spécialiste « Gardien du stock » : Claude Haiku 5.5, température basse, sans identifiant dans le gabarit (la copie du client branche sa clé). |
| Outil : lire le tableur de stock | googleSheetsTool · sheet · read | lit | sous-nœud de l’agent (lecture seule) | Google Sheets · sheet · read (lecture seule). L’agent peut relire le tableur de stock du client ; il n’écrit jamais. |
| Schéma · Gardien du stock | ia:outputParserStructured | sous-nœud | sous-nœud de l’agent (lecture seule) | Schéma strict (JSON Schema saisi, autoFix faux) : hors schéma = rejet, la sortie repasse un Code qui la revalide. |
| Revalider la commande | code | calcule | derrière la porte (sortie « faux ») |  |
| Brouillon sur Outlook ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Commande en brouillon Outlook | microsoftOutlook · draft · create | ÉCRIT | derrière la porte (sortie « faux ») | Microsoft Outlook · draft · create : un BROUILLON, jamais envoyé. |
| Journaliser la commande | httpRequest | écrit evenements_metier | derrière la porte (sortie « faux ») | Une commande préparée par article et par mois, clé unique. |
| Commande en brouillon Gmail | gmail · draft · create | ÉCRIT | derrière la porte (sortie « faux ») | Gmail · draft · create : un BROUILLON dans la boîte de l’artisan, jamais envoyé. Le destinataire est choisi par l’artisan. Une commande envoyée est une validation (plans/ |
| Document à ranger ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Archiviste | ia:agent | appelle le modèle | derrière la porte (sortie « faux ») | Agent IA « Archiviste » : le modèle rédige, il ne compte rien et ne décide de rien ; ses outils lisent seulement. |
| Claude · Archiviste | ia:lmChatAnthropic | sous-nœud | sous-nœud de l’agent (lecture seule) | Modèle du spécialiste « Archiviste » : Claude Haiku 5.5, température basse, sans identifiant dans le gabarit (la copie du client branche sa clé). |
| Outil : chercher dans Drive | googleDriveTool · fileFolder · search | lit | sous-nœud de l’agent (lecture seule) | Google Drive · search (lecture seule). L’agent peut chercher un fichier ; il ne déplace rien. |
| Schéma · Archiviste | ia:outputParserStructured | sous-nœud | sous-nœud de l’agent (lecture seule) | Schéma strict (JSON Schema saisi, autoFix faux) : hors schéma = rejet, la sortie repasse un Code qui la revalide. |
| Revalider le classement | code | calcule | derrière la porte (sortie « faux ») |  |
| Classement permis ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Classer sur OneDrive ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Créer le dossier dans OneDrive | microsoftOneDrive · folder · create | ÉCRIT | derrière la porte (sortie « faux ») | Microsoft OneDrive · folder · create : un dossier par client et par chantier. Alternative à Drive. |
| Ranger le fichier dans OneDrive | microsoftOneDrive · file · move | ÉCRIT | derrière la porte (sortie « faux ») | Microsoft OneDrive · file · move : le fichier reçu va dans le dossier du chantier. |
| Journaliser le classement | httpRequest | écrit evenements_metier | derrière la porte (sortie « faux ») | Une ligne par document rangé, clé unique. |
| Créer le dossier dans Drive | googleDrive · folder · create | ÉCRIT | derrière la porte (sortie « faux ») | Google Drive · folder · create : un dossier par client et par chantier (Clients/<client>/<chantier>/<type>). Atteint après la porte ; en Studio, carte « Document à classe |
| Ranger le fichier dans Drive | googleDrive · file · move | ÉCRIT | derrière la porte (sortie « faux ») | Google Drive · file · move : le fichier reçu va dans le dossier du chantier. |
| Import par Excel ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Lire le classeur Excel | microsoftExcel · worksheet · readRows | ÉCRIT | derrière la porte (sortie « faux ») | Microsoft Excel (OneDrive) · worksheet · readRows : LECTURE du classeur du client (clients, tarifs ou stock). Circuit contrôlé : lecture, aperçu, validation ; aucune écri |
| Aperçu de l'import | code | calcule | derrière la porte (sortie « faux ») |  |
| Lire le tableur Sheets | googleSheets · sheet · read | lit | derrière la porte (sortie « faux ») | Google Sheets · sheet · read : LECTURE du tableur du client (clients, tarifs ou stock). Circuit contrôlé : lecture, aperçu, validation ; aucune écriture avant la validati |
| Déposer la carte | httpRequest | écrit assistant_actions | derrière la porte (sortie « faux ») | Dépôt dans la plateforme (carte « À valider »), filtre du compte, doublon ignoré par la clé. |
| Poser le rendez-vous dans Outlook | microsoftOutlook · event · create | ÉCRIT | derrière la porte (sortie « faux ») | Microsoft Outlook · event · create (aucun texte du modèle). Mêmes gardes que Google Agenda : choix du client, créneau libre lu, validation ; atteint après la porte. |

## Ce que la copie du client doit renseigner
- ses comptes, branchés **par lui** : Google Agenda ou Outlook, Drive ou OneDrive, Sheets ou Excel, Gmail ou Outlook, Telegram, WhatsApp, Twilio (seulement si l’API SMS est choisie et son coût montré à Benj), Claude, Supabase ;
- `Compte et mode` : `organisation_id`, `agenda_id` (jamais une adresse écrite dans le gabarit), `simulation`, `numero_whatsapp_id`, `numero_sms` ; ses outils dans `pilote_reglages` (`outil_agenda`, `outil_courrier`, `outil_fichiers`, `outil_tableur`) ;
- Outlook : la période des événements lus (le filtre est vide dans le gabarit), l’identifiant du calendrier ; Drive : le dossier surveillé ; Excel : le classeur et la feuille ; Sheets : le tableur de stock.

## Les essais (`test_workflow`, simulation, données épinglées « Exemple. »)
- n8n #638 (success) : aucun créneau libre dans l’agenda lu : aucun rendez-vous, une carte.
- n8n #639 (success) : créneau choisi par le client, proposé, libre, validé : rendez-vous prévu ; import Excel demandé : aperçu prévu.
- n8n #640 (success) : stock sous le seuil : commande en brouillon (quantité calculée par le code) ; rappel de la veille en Studio : carte.
- n8n #643 (success) : document reçu dans Drive en Studio : carte « Document à classer ».

Les cas hors ligne (créneau choisi par l’artisan, opposition, Studio avec types activés par erreur, sortie de modèle piégée…) sont joués par le juge sur les Code des exports, **pas par n8n**.

## À valider / non fait
- **Types nouveaux du pilote** : `rendez_vous`, `rappel_rendez_vous`, `classement_documents` n’existent pas dans `OUTIL_TYPE` (« type nouveau, à ajouter à la liste fermée seulement après tests et accord de Benj », prompt 6 § 1.2, ligne 6).
- **Vues à écrire** : `articles_sous_seuil` (inventaire, `lib/inventaire/`), `rendez_vous`, `chantiers`, `clients`, et la même question `organisation_id` / `artisan_id` que pour l’Après-chantier.
- **Outlook** : pas d’opération « disponibilité » dans le nœud ; le gabarit lit les événements et calcule le chevauchement.
- **Heure de Paris** : les créneaux sont écrits avec le décalage de l’heure de lancement ; un changement d’heure d’été à hiver entre la lecture et la pose se règle à l’intégration.
- Le modèle n’a **jamais été appelé** (aucun identifiant, aucun appel réel) : les agents sont vérifiés pour leur forme et leurs revalidations, pas pour leur rédaction.
- Les nœuds du canevas ne sont pas encore regroupés (avertissement du MCP : plus de 7 boîtes au premier niveau) ; sans effet sur l’exécution.

## Sources
- `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` (O1 à O6, § 5 lignes 5 à 7, R21 à R23) ;
- `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md` § 0.4, § 0.5, § 0.6, § 1.2 (l.336-338) ;
- vidéos : `fiches-videos-restructureai.md` section 11 (« Review Response » : lecteur, rédacteur, « Approval Desk » avant « Reply Poster », l.368-373) ; `premiere-reponse.md` A7, A8, A9, A13, A16, A18, B8, B10, D3 ; `plans/analyse-videos.md` l.1442-1443 (barre « à valider » et trois priorités) ;
- dépôts (la forme seulement, aucun JSON importé) : Zie619 `Aggregate/1430_Aggregate_Schedule_Send_Scheduled.json`, enescingoz « AI Agent : Google calendar assistant using OpenAI », « LINE Assistant with Google Calendar and Gmail Integration », « Daily meetings summarization with Gemini AI », « Effortless Email Management with AI-Powered Summarization & Review » ;
- n8n : `get_workflow_sdk_reference`, `get_workflow_best_practices` (scheduling, notification), `search_nodes`, `get_node_types` (Business Profile, Google Agenda, Gmail).
