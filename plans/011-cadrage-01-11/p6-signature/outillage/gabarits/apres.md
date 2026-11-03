# gabarit-artisan-apres — Après-chantier et réputation

Fiche du gabarit outillé (tâche 036-015, prompt 6, outillage, lot 3). Ligne 5 de la matrice de `OUTILLAGE.md` § 5 : avis lus sur la fiche Google (nœud Business Profile), Préparateur de réponses (agent Claude, parseur, outils de lecture), demande d’avis par un canal consenti (Gmail, SMTP, WhatsApp ; SMS préparé en carte), réponse sur la fiche Google derrière la porte, rappel d’entretien proposé.

**Inactif, en simulation, sans identifiant.** Identifiant n8n d’Oracle : `xPPNohf5XkDoAk7g` (jamais publié, jamais activé). 31 nœuds. Export : `.orchestre/preuves/036-015/gabarit-artisan-apres.workflow.json`. Juges : `scripts/n8n-specs-qa.mjs` (R1 à R23) et `scripts/gabarits-terrain-qa.mjs`. Générateur : `.orchestre/preuves/036-015/construire.mjs apres`.

## Le geste

Chaque jour à 8 h (Europe/Paris), le gabarit lit la configuration du compte, les clés déjà traitées, les avis de la fiche et les chantiers terminés. Un nœud Code **décide**, le modèle ne décide de rien :

- **avis de 3 étoiles ou moins** : toujours une carte « À valider » pour l’artisan, avec un brouillon. Jamais une publication, en Studio comme en Signature, pilote actif ou non ;
- **avis de 4 ou 5 étoiles** : une réponse prévue sur la fiche **seulement** si l’offre est Signature, le pilote actif **et** le type `reponse_avis_positif` activé ; sinon une carte. Si le brouillon du modèle contient un engagement (euros, remboursement, remise, geste commercial, gratuit), la route repasse à la carte ;
- **demande d’avis** : 2 jours après la fin réelle du chantier, 14 jours de rattrapage au plus, 20 par passage (`lib/apresChantier.ts:23-24`), **seulement** pour un client qui a donné un canal et ne s’est pas opposé. Envoyée seule en Signature avec le type `demande_avis` activé ; sinon une carte. Le SMS reste une carte (SMS préparé, ouvert d’un geste sur le téléphone de l’artisan) ;
- **rappel d’entretien** : préavis de 15 jours, **proposé** en carte, jamais envoyé seul.

Toute réponse du modèle repasse un nœud Code qui revalide le schéma (clé connue, longueur, pas le nom de la plateforme) ; la route vient du Code qui a décidé, jamais du modèle. Le texte d’un avis est une **donnée de tiers** : la consigne le dit à l’agent, et le schéma ne laisse passer que `cle` et `reponse`.

**La porte « simulation » est unique et se place devant chaque effet** : sa sortie « vrai » ne fait que journaliser l’effet prévu (le modèle n’est pas appelé, la réponse vient d’un enregistrement daté) ; tout nœud qui écrit, envoie, publie, pose un rendez-vous ou appelle le modèle n’est atteint que par sa sortie « faux ». Le gabarit pose `simulation: true` : la copie ne le lève qu’avec le « go » écrit de Benj.

## Les nœuds (table lue dans l’export)

| Nœud | Type · ressource · opération | Fait | Place | Note |
|---|---|---|---|---|
| Chaque jour à 8 h | scheduleTrigger | déclenche (relève à intervalle) | entrée |  |
| Compte et mode | code | calcule | avant la porte, ou sur sa sortie « simulation » | Le compte de la copie du client et le mode à blanc. |
| Lire la configuration | httpRequest | lit pilote_reglages | avant la porte, ou sur sa sortie « simulation » | Réglages du pilote et offre du compte (lecture, filtre du compte). Colonnes exactes à fournir à l'intégration (036-012), comme 036-008. |
| Lire les clés déjà traitées | httpRequest | lit evenements_metier | avant la porte, ou sur sa sortie « simulation » | Idempotence : une clé déjà vue ne repasse jamais. |
| Lire les avis de la fiche Google | googleBusinessProfile · review · getAll | lit | avant la porte, ou sur sa sortie « simulation » | Google Business Profile · review · getAll (lecture). Les avis arrivent aussi dans la plateforme (règle « tout message arrive dans la plateforme », prompt 6 § 0.5). Accès  |
| Lire les chantiers finis | httpRequest | lit chantiers | avant la porte, ou sur sa sortie « simulation » | Demande d’avis : 2 jours après la fin réelle, 14 jours de rattrapage au plus, 20 par passage (lib/apresChantier.ts:23-24, lib/apresChantierTour.ts). |
| Décider | code | calcule | avant la porte, ou sur sa sortie « simulation » |  |
| Porte simulation | if | aiguille | PORTE | Vrai : simulation, rien ne part, rien ne s'écrit. Faux : l'effet réel (jamais atteint tant que la copie du client n'a pas le « go » de Benj). |
| Effets prévus | code | calcule | avant la porte, ou sur sa sortie « simulation » | Branche simulation : l’effet prévu part au journal, rien ne part. |
| Un avis à préparer ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Préparateur de réponses | ia:agent | appelle le modèle | derrière la porte (sortie « faux ») | Agent IA « Préparateur de réponses » : le modèle rédige, il ne compte rien et ne décide de rien ; ses outils lisent seulement. |
| Claude · Préparateur de réponses | ia:lmChatAnthropic | sous-nœud | sous-nœud de l’agent (lecture seule) | Modèle du spécialiste « Préparateur de réponses » : Claude Haiku 5.5, température basse, sans identifiant dans le gabarit (la copie du client branche sa clé). |
| Outil : relire les avis de la fiche | googleBusinessProfileTool · review · getAll | lit | sous-nœud de l’agent (lecture seule) | Google Business Profile · review · getAll (lecture seule). L’agent relit la fiche pour le ton des réponses passées ; il ne publie rien. |
| Outil : lire et classer un avis | ia:toolWorkflow | ÉCRIT | sous-nœud de l’agent (lecture seule) | Appelle lire et classer un avis par son identifiant (aucune écriture). La liste des appelants de ce sous-workflow se complète à l’intégration (036-012). |
| Schéma · Préparateur de réponses | ia:outputParserStructured | sous-nœud | sous-nœud de l’agent (lecture seule) | Schéma strict (JSON Schema saisi, autoFix faux) : hors schéma = rejet, la sortie repasse un Code qui la revalide. |
| Revalider la réponse | code | calcule | derrière la porte (sortie « faux ») |  |
| Publication permise ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Répondre sur la fiche Google | googleBusinessProfile · review · reply | ÉCRIT | derrière la porte (sortie « faux ») | Google Business Profile · review · reply. Atteint SEULEMENT par un avis positif, en Signature, pilote actif et type « reponse_avis_positif » activé, après la porte. Un av |
| Journaliser la réponse | httpRequest | écrit evenements_metier | derrière la porte (sortie « faux ») | Une ligne par réponse publiée, clé unique : un crash ne crée aucun doublon. |
| Préparer la carte | code | calcule | derrière la porte (sortie « faux ») |  |
| Demande à envoyer ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Lire le destinataire consenti | httpRequest | lit clients | derrière la porte (sortie « faux ») | Lue AU MOMENT d’envoyer : l’adresse ou le numéro du seul client consentant, jamais gardée. |
| Assembler la demande | code | calcule | derrière la porte (sortie « faux ») |  |
| Par e-mail ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Demande d’avis par Gmail | gmail · message · send | ÉCRIT | derrière la porte (sortie « faux ») | Gmail · message · send, depuis la boîte de l’artisan, à son nom. Canal consenti seulement ; atteint après la porte et seulement en Signature avec le type « demande_avis » |
| Journaliser la demande | httpRequest | écrit evenements_metier | derrière la porte (sortie « faux ») | Une ligne par demande d’avis envoyée, clé unique. |
| Par WhatsApp ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Demande d’avis par WhatsApp | whatsApp · message · send | ÉCRIT | derrière la porte (sortie « faux ») | WhatsApp Business Cloud · message · send. Écrire en premier exige un modèle validé par Meta (sendTemplate) : à brancher dans la copie. Canal consenti seulement. |
| Demande d’avis par SMTP | emailSend | ÉCRIT | derrière la porte (sortie « faux ») | SMTP · envoi depuis le serveur de l’artisan. Canal consenti seulement ; même gardes que Gmail. |
| Déposer la carte | httpRequest | écrit assistant_actions | derrière la porte (sortie « faux ») | Dépôt dans la plateforme (carte « À valider »), filtre du compte, doublon ignoré par la clé. |

## Ce que la copie du client doit renseigner (rien de tout cela n’est dans le gabarit)
- ses comptes, branchés **par lui** : Google Business Profile (accès à l’API sur demande auprès de Google : à vérifier avant le premier branchement), Gmail, WhatsApp Business Cloud, SMTP, Claude, Supabase ;
- `Compte et mode` : `organisation_id` du client, `simulation` (vrai tant que Benj n’a pas écrit « go »), `numero_whatsapp_id`, `expediteur` ;
- le compte et la fiche Google (`accounts/000000000000`, `locations/000000000000` : repères neutres exigés par n8n pour tester) ;
- WhatsApp : écrire en premier exige un modèle validé par Meta (`sendTemplate`) ; le nœud `send` du gabarit ne vaut que dans la fenêtre de 24 h.

## Les essais (`test_workflow`, simulation, données épinglées « Exemple. »)
- n8n #619 (success) : avis de 2 étoiles, Signature, type activé : une carte, jamais une publication.
- n8n #620 (success) : avis de 5 étoiles, Signature, type « reponse_avis_positif » activé : réponse prévue sur la fiche.
- n8n #621 (success) : demandes d’avis : e-mail consenti en Signature = envoi prévu, SMS = carte, sans consentement / hors rattrapage / clé vue / opposition = rien, entretien = carte.
- n8n #622 (success) : avis de 5 étoiles en Studio : une carte ; un avis déjà traité est ignoré.

Les cas hors ligne (créneau choisi par l’artisan, opposition, Studio avec types activés par erreur, sortie de modèle piégée…) sont joués par le juge sur les Code des exports, **pas par n8n**.

## À valider / non fait
- **Types nouveaux du pilote** : `reponse_avis_positif` et `demande_avis` ne sont pas dans la liste fermée `OUTIL_TYPE` de `lib/pilote/regles.ts:53-63` ; `demander_avis` et `envoyer_rappel_entretien` n’y sont pas exécutables (`OUTILS_EXECUTABLES_PILOTE`, `:70`). Les ajouter exige des tests et l’accord de Benj (prompt 6 § 1.2, ligne 5).
- **Tables et colonnes** : `pilote_reglages` (colonnes `offre`, `types`), `evenements_metier`, `chantiers`, `clients`, `assistant_actions` sont nommées comme dans les migrations, mais la garde commune (R14) exige `organisation_id=eq.…` alors que ces tables filtrent par `artisan_id` (`organisations.id` = `artisans.id`, `0183_organisations.sql:84-86`). À trancher à l’intégration (036-012) : vues étroites `n8n_*` comme celles des autres lots.
- **Appelants** : `lib-avis-lire` (`ScpXQIH54wmmuuel`) est appelé en outil par identifiant ; sa liste d’appelants (`callerIds`) ne contient pas le gabarit (interdit de la modifier dans ce lot).
- Le modèle n’a **jamais été appelé** (aucun identifiant, aucun appel réel) : les agents sont vérifiés pour leur forme et leurs revalidations, pas pour leur rédaction.
- Les nœuds du canevas ne sont pas encore regroupés (avertissement du MCP : plus de 7 boîtes au premier niveau) ; sans effet sur l’exécution.

## Sources
- `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` (O1 à O6, § 5 lignes 5 à 7, R21 à R23) ;
- `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md` § 0.4, § 0.5, § 0.6, § 1.2 (l.336-338) ;
- vidéos : `fiches-videos-restructureai.md` section 11 (« Review Response » : lecteur, rédacteur, « Approval Desk » avant « Reply Poster », l.368-373) ; `premiere-reponse.md` A7, A8, A9, A13, A16, A18, B8, B10, D3 ; `plans/analyse-videos.md` l.1442-1443 (barre « à valider » et trois priorités) ;
- dépôts (la forme seulement, aucun JSON importé) : Zie619 `Aggregate/1430_Aggregate_Schedule_Send_Scheduled.json`, enescingoz « AI Agent : Google calendar assistant using OpenAI », « LINE Assistant with Google Calendar and Gmail Integration », « Daily meetings summarization with Gemini AI », « Effortless Email Management with AI-Powered Summarization & Review » ;
- n8n : `get_workflow_sdk_reference`, `get_workflow_best_practices` (scheduling, notification), `search_nodes`, `get_node_types` (Business Profile, Google Agenda, Gmail).
