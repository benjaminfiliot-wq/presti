# gabarit-artisan-direction — Direction de l’artisan

Fiche du gabarit outillé (tâche 036-015, prompt 6, outillage, lot 3). Ligne 7 de la matrice de `OUTILLAGE.md` § 5 : la page du matin à 7 h, le rapport du lundi à 8 h, envoi par Telegram, WhatsApp, Gmail, Slack ou Teams, export du rapport dans Sheets, compteur du coût IA (`lib-cout-ia`). Le rédacteur est un agent, mais **le code compte**.

**Inactif, en simulation, sans identifiant.** Identifiant n8n d’Oracle : `8KOicif7Wjzhk5VM` (jamais publié, jamais activé). 35 nœuds. Export : `.orchestre/preuves/036-015/gabarit-artisan-direction.workflow.json`. Juges : `scripts/n8n-specs-qa.mjs` (R1 à R23) et `scripts/gabarits-terrain-qa.mjs`. Générateur : `.orchestre/preuves/036-015/construire.mjs direction`.

## Le geste

Deux déclencheurs à intervalle : chaque jour à 7 h, le lundi à 8 h. Le gabarit lit la configuration (canal et destination **de l’artisan lui-même**), les chiffres du jour (ce que `lib/assistant/briefing.ts` calcule par le code), le rapport de la semaine et le coût IA des sept derniers jours. Le nœud « Compter » écrit **toutes les lignes chiffrées**, avec leur libellé :

- l’argent d’abord (impayés échus, devis sans réponse, demandes sans réponse, rendez-vous du jour, coût IA), puis les cartes à valider ; le rapport du lundi : encaissé, signé, en cours, relances ayant précédé une signature, coût IA de la semaine ;
- **une lecture absente se dit « non lu », jamais un zéro** ; un vrai zéro s’écrit « 0 € » ;
- aucun chiffre de gain ni d’économie.

Le **modèle ne compte rien** : il écrit une phrase d’ouverture (ou un commentaire) **sans aucun chiffre** et choisit jusqu’à trois priorités par leur *numéro* dans la liste que le code propose. Le nœud de revalidation rejette toute phrase qui contient un chiffre, un « € » ou, pour le rapport, un mot de gain, d’économie ou de rentabilité. La page envoyée est « phrase du modèle + lignes du code + priorités de la liste ». Elle porte la mention de l’assistant. Rien n’y part chez un client de l’artisan : la page est pour l’artisan.

**La porte « simulation » est unique et se place devant chaque effet** : sa sortie « vrai » ne fait que journaliser l’effet prévu (le modèle n’est pas appelé, la réponse vient d’un enregistrement daté) ; tout nœud qui écrit, envoie, publie, pose un rendez-vous ou appelle le modèle n’est atteint que par sa sortie « faux ». Le gabarit pose `simulation: true` : la copie ne le lève qu’avec le « go » écrit de Benj.

## Les nœuds (table lue dans l’export)

| Nœud | Type · ressource · opération | Fait | Place | Note |
|---|---|---|---|---|
| Chaque jour à 7 h | scheduleTrigger | déclenche (relève à intervalle) | entrée | Page du matin. Le lundi, 8 h : le rapport (déclencheur suivant). |
| Compte et mode | code | calcule | avant la porte, ou sur sa sortie « simulation » | Le compte de la copie du client, le mode à blanc, la page du jour. |
| Le lundi à 8 h | scheduleTrigger | déclenche (relève à intervalle) | entrée | Rapport du lundi. |
| Lire la configuration | httpRequest | lit pilote_reglages | avant la porte, ou sur sa sortie « simulation » | Canal choisi par l'artisan pour sa propre page (jamais un client). Colonnes exactes à fournir à l'intégration (036-012). |
| Lire les chiffres du jour | httpRequest | lit briefing_organisation | avant la porte, ou sur sa sortie « simulation » | Les chiffres que lib/assistant/briefing.ts calcule par le code (devis sans réponse 7 jours, impayé 30 jours, stock). Lecture seule. |
| Lire le rapport de la semaine | httpRequest | lit rapport_hebdo_organisation | avant la porte, ou sur sa sortie « simulation » | Encaissé, signé, en cours : une relance n’est créditée que si elle précède la signature. Aucun chiffre de gain. |
| Lire le coût IA | httpRequest | lit couts_ia_jour | avant la porte, ou sur sa sortie « simulation » | Coût IA par compte et par jour, calculé par le code (couts_ia_jour, migration 0193 ; lib-cout-ia). Un appel sans tarif daté reste inconnu. |
| Compter | code | calcule | avant la porte, ou sur sa sortie « simulation » |  |
| Porte simulation | if | aiguille | PORTE | Vrai : simulation, rien ne part, rien ne s'écrit. Faux : l'effet réel (jamais atteint tant que la copie du client n'a pas le « go » de Benj). |
| Effets prévus | code | calcule | avant la porte, ou sur sa sortie « simulation » | Branche simulation : la page prévue part au journal, rien ne part, rien n’est exporté. |
| Page du matin ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Rédacteur de la page | ia:agent | appelle le modèle | derrière la porte (sortie « faux ») | Agent IA « Rédacteur de la page » : le modèle rédige, il ne compte rien et ne décide de rien ; ses outils lisent seulement. |
| Claude · Rédacteur de la page | ia:lmChatAnthropic | sous-nœud | sous-nœud de l’agent (lecture seule) | Modèle du spécialiste « Rédacteur de la page » : Claude Haiku 5.5, température basse, sans identifiant dans le gabarit (la copie du client branche sa clé). |
| Outil : alertes ouvertes | ia:toolWorkflow | ÉCRIT | sous-nœud de l’agent (lecture seule) | Appelle alertes ouvertes par son identifiant (aucune écriture). La liste des appelants de ce sous-workflow se complète à l’intégration (036-012). |
| Outil : coût IA | ia:toolWorkflow | ÉCRIT | sous-nœud de l’agent (lecture seule) | Appelle coût IA par son identifiant (aucune écriture). La liste des appelants de ce sous-workflow se complète à l’intégration (036-012). |
| Schéma · Rédacteur de la page | ia:outputParserStructured | sous-nœud | sous-nœud de l’agent (lecture seule) | Schéma strict (JSON Schema saisi, autoFix faux) : hors schéma = rejet, la sortie repasse un Code qui la revalide. |
| Revalider la page | code | calcule | derrière la porte (sortie « faux ») |  |
| Rédacteur du rapport | ia:agent | appelle le modèle | derrière la porte (sortie « faux ») | Agent IA « Rédacteur du rapport » : le modèle rédige, il ne compte rien et ne décide de rien ; ses outils lisent seulement. |
| Claude · Rédacteur du rapport | ia:lmChatAnthropic | sous-nœud | sous-nœud de l’agent (lecture seule) | Modèle du spécialiste « Rédacteur du rapport » : Claude Haiku 5.5, température basse, sans identifiant dans le gabarit (la copie du client branche sa clé). |
| Outil : relire les rapports passés | googleSheetsTool · sheet · read | lit | sous-nœud de l’agent (lecture seule) | Google Sheets · sheet · read (lecture seule). L’agent relit l’historique des rapports pour garder le même ton ; il n’écrit jamais. |
| Outil : coût IA (rapport) | ia:toolWorkflow | ÉCRIT | sous-nœud de l’agent (lecture seule) | Appelle coût IA (rapport) par son identifiant (aucune écriture). La liste des appelants de ce sous-workflow se complète à l’intégration (036-012). |
| Schéma · Rédacteur du rapport | ia:outputParserStructured | sous-nœud | sous-nœud de l’agent (lecture seule) | Schéma strict (JSON Schema saisi, autoFix faux) : hors schéma = rejet, la sortie repasse un Code qui la revalide. |
| Revalider le rapport | code | calcule | derrière la porte (sortie « faux ») |  |
| Page par Telegram ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Page par Telegram | telegram · message · sendMessage | ÉCRIT | derrière la porte (sortie « faux ») | Telegram · message · sendMessage, à l’artisan lui-même (sa page), jamais à un client. Atteint après la porte. |
| Journaliser la page | httpRequest | écrit evenements_metier | derrière la porte (sortie « faux ») | Une ligne par page envoyée, clé unique par jour : une page ne part jamais deux fois. |
| Page par WhatsApp ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Page par WhatsApp | whatsApp · message · send | ÉCRIT | derrière la porte (sortie « faux ») | WhatsApp Business Cloud · message · send, à l’artisan lui-même. Atteint après la porte. |
| Page par Slack ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Page par Teams ? | if | aiguille | derrière la porte (sortie « faux ») |  |
| Page par Teams | microsoftTeams · chatMessage · create | ÉCRIT | derrière la porte (sortie « faux ») | Microsoft Teams · chatMessage · create, dans le chat de l’artisan ou de son équipe. Atteint après la porte. La mention de l’assistant figure dans le texte. |
| Page par Gmail | gmail · message · send | ÉCRIT | derrière la porte (sortie « faux ») | Gmail · message · send, de la boîte de l’artisan vers lui-même. Atteint après la porte. |
| Exporter le rapport dans Sheets | googleSheets · sheet · append | ÉCRIT | derrière la porte (sortie « faux ») | Google Sheets · sheet · append : une ligne par rapport du lundi (semaine, encaissé, signé, en cours), clé de semaine. Chiffres du CODE seulement. Atteint après la porte. |
| Page par Slack | slack · message · post | ÉCRIT | derrière la porte (sortie « faux ») | Slack · message · post, dans le canal de l’artisan ou de son équipe. Atteint après la porte. Authentification OAuth2 : la copie du client branche la sienne. |

## Ce que la copie du client doit renseigner
- ses comptes, branchés **par lui** : Telegram, WhatsApp, Gmail, Slack (authentification OAuth2, voir ci-dessous), Teams, Sheets, Claude, Supabase ;
- `Compte et mode` : `organisation_id`, `simulation`, `numero_whatsapp_id` ; `pilote_reglages` : `canal_direction` (telegram, whatsapp, slack, teams ou gmail) et `destination_direction` ; le tableur « Rapports ».

**Slack.** Le MCP n8n a rattaché de lui-même un identifiant Slack existant (« Slack account ») à la création du nœud. Il a été retiré (nœud recréé) et le nœud est en authentification OAuth2, pour qu’aucun identifiant d’un autre compte ne s’y rattache : la copie branche le sien. Le même rattachement automatique peut toucher les autres lots (036-013, 036-014, 036-016) : relire leurs exports.

## Les essais (`test_workflow`, simulation, données épinglées « Exemple. »)
- n8n #653 (success) : page du matin : chiffres du code (1 250 €, 3 devis, …), envoi prévu par Telegram.
- n8n #654 (success) : page du matin sans aucune lecture : « non lu », jamais un zéro.
- n8n #655 (success) : rapport du lundi : chiffres du code, envoi prévu par Slack et export Sheets prévu.

Les cas hors ligne (créneau choisi par l’artisan, opposition, Studio avec types activés par erreur, sortie de modèle piégée…) sont joués par le juge sur les Code des exports, **pas par n8n**.

## À valider / non fait
- **Vues à écrire** : `briefing_organisation`, `rapport_hebdo_organisation` (colonnes en centimes entiers), `couts_ia_jour` (existe, migration 0193), et la question `organisation_id` / `artisan_id`.
- **Appelants** : `lib-alerte-liste` (`v2wfT9qB5e0LHtFI`) et `lib-cout-ia` (`JtGOKOG1ssFP5z1u`) sont appelés en outils par identifiant ; leurs listes d’appelants ne contiennent pas le gabarit (interdit de les modifier dans ce lot).
- **Teams** n’est pas dans la liste des nœuds d’envoi de la garde (pas de « pied » exigé) ; la mention de l’assistant figure pourtant dans son texte.
- Le modèle n’a **jamais été appelé** (aucun identifiant, aucun appel réel) : les agents sont vérifiés pour leur forme et leurs revalidations, pas pour leur rédaction.
- Les nœuds du canevas ne sont pas encore regroupés (avertissement du MCP : plus de 7 boîtes au premier niveau) ; sans effet sur l’exécution.

## Sources
- `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` (O1 à O6, § 5 lignes 5 à 7, R21 à R23) ;
- `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md` § 0.4, § 0.5, § 0.6, § 1.2 (l.336-338) ;
- vidéos : `fiches-videos-restructureai.md` section 11 (« Review Response » : lecteur, rédacteur, « Approval Desk » avant « Reply Poster », l.368-373) ; `premiere-reponse.md` A7, A8, A9, A13, A16, A18, B8, B10, D3 ; `plans/analyse-videos.md` l.1442-1443 (barre « à valider » et trois priorités) ;
- dépôts (la forme seulement, aucun JSON importé) : Zie619 `Aggregate/1430_Aggregate_Schedule_Send_Scheduled.json`, enescingoz « AI Agent : Google calendar assistant using OpenAI », « LINE Assistant with Google Calendar and Gmail Integration », « Daily meetings summarization with Gemini AI », « Effortless Email Management with AI-Powered Summarization & Review » ;
- n8n : `get_workflow_sdk_reference`, `get_workflow_best_practices` (scheduling, notification), `search_nodes`, `get_node_types` (Business Profile, Google Agenda, Gmail).
