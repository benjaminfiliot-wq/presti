# Bonnes pratiques n8n pour les workflows à agent IA, validation humaine, CRM et réseaux sociaux

Source : `get_workflow_best_practices` (serveur n8n-oracle, relevé du 03/11/2026) et `get_node_types` / `search_nodes`.
Deux techniques n'ont AUCUNE documentation côté outil (« does not have detailed best-practices documentation yet ») :
`human_in_the_loop` et `enrichment`. Leurs lignes viennent donc des définitions de nœuds lues, pas d'un guide ; chaque ligne le dit.

## human_in_the_loop

Pas de guide fourni par l'outil. Ce qui suit vient des types de nœuds (Slack 2.7, Teams 2, HITL) et des aides du constructeur.
- Deux mécanismes : un nœud « sendAndWait » placé dans le flux (Slack `message`, Teams `chatMessage`, Gmail, Outlook, WhatsApp, e-mail SMTP), ou un nœud `*HitlTool` qui garde les outils d'un agent.
- Un nœud `*HitlTool` se branche sur l'agent dans `subnodes.tools`, et les outils à valider vont dans ses propres `subnodes.tools` ; le message peut citer `{{ $tool.name }}` et `{{ $tool.parameters }}` pour montrer ce que l'agent veut lancer.
- Pour une approbation sur un flux fixe, préférer `sendAndWait` avec `responseType: 'approval'` et `approvalType: 'double'` (deux boutons) ; la sortie est `data.approved` (booléen) et `data.respondedAt`.
- Le délai d'attente par défaut est de 45 minutes (`options.limitWaitTime`) : le fixer explicitement (24 h pour un artisan) et prévoir ce qui se passe à l'échéance, que le type ne décrit pas (approved faux ou clé absente) ; tester les deux cas.
- Toujours brancher les DEUX issues (validé, refusé) d'un If/Switch après l'attente ; une branche non reliée perd les éléments en silence.
- Slack : limiter qui peut valider demande `captureResponder` + `approvers` et une configuration supplémentaire de l'application Slack ; sans cela, n'importe quel membre du canal peut cliquer.
- Teams : `sendAndWait` n'existe que pour `chatMessage`, pas pour `channelMessage` ; pas de style de bouton ni de capture de l'identité du répondant.
- `appendAttribution` vaut true par défaut : la mention « envoyé avec n8n » serait ajoutée ; la couper sur toute surface où la marque ne doit pas paraître.
- Règle Presti (`autonomie-abonnements.md`) : Studio prépare et l'artisan valide, Signature envoie seul ; le gabarit doit donc distinguer les deux chemins par un If sur l'offre, jamais par un chemin unique.
- Une exécution en attente occupe de la mémoire : éviter les attentes de plusieurs jours, et passer par une Data Table + relance planifiée (voir `scheduling`).

## triage

Guide fourni par l'outil.
- Découper en étapes : déclencheur, prétraitement (recherche CRM, normalisation), classification, routage, actions, journalisation.
- Prévoir une sortie de repli : `Switch` avec `options.fallbackOutput: 'extra'` relié à une file de revue manuelle ; sans cela, les cas non reconnus disparaissent.
- Avec le nœud Text Classifier, régler « When No Clear Match » sur la branche « Other », sinon les éléments sans catégorie sont jetés.
- Catégories mutuellement exclusives : un `Switch` plutôt que plusieurs `If` parallèles ; ordonner du plus spécifique au plus général.
- Sortie d'agent en JSON structuré (outputParserStructured) avec un champ `reasoning` à côté de la catégorie, pour déboguer ; lire ensuite `$json.output.categorie`.
- Le guide conseille une température basse (0 à 0,2) ; MAIS le nœud `lmChatAnthropic` 1.6 ignore température, topK et topP sur Claude Opus 4.7+ et Sonnet 5+ : le contrôle passe par un schéma strict et des exemples (few-shot) dans le prompt.
- Combiner règles et IA : un `If` sur mots-clés d'abord (gratuit, déterministe), l'agent seulement pour le reste.
- Déclencheurs e-mail : le simple `gmailTrigger` / `microsoftOutlookTrigger` renvoie le corps seulement avec `simple: false` (gourmand en mémoire, plantages possibles) ; garder `simple: true` pour router par expéditeur ou sujet.
- Éviter les doublons : filtrer sur « non lu » ET marquer le mail traité (Gmail `markAsRead` ou `addLabels`, Outlook `update` isRead ou `move`) après la création de l'enregistrement, ou tenir une Data Table d'identifiants déjà vus.
- Toujours poser un filtre `q` (Gmail) ou `filters` (Outlook) sur le déclencheur : sans filtre, tout courrier entrant lance le workflow.
- Aucune donnée inventée : le schéma doit autoriser « inconnu » plutôt que forcer une catégorie.

## content_generation

Guide fourni par l'outil.
- Préférer le nœud dédié à un HTTP Request quand il existe (authentification, champs et erreurs déjà gérés) ; HTTP Request seulement pour une API non couverte.
- Découper en étapes séquentielles (texte, image, vidéo, publication) pour isoler les pannes.
- Médias vers Facebook/Instagram : le guide recommande le binaire plutôt qu'une URL pour éviter les erreurs de type de média ; EXCEPTION lue dans le type de `facebookGraphApi` : le conteneur Instagram (`edge: media`) exige `image_url` ou `video_url` en paramètres de requête, pas de binaire. Les deux consignes se contredisent en apparence ; suivre le type pour `/media`, le binaire pour les `/photos` et `/videos` de page.
- Génération asynchrone (vidéo surtout) : ne jamais supposer une réponse immédiate ; Wait + sondage de l'état avant `media_publish`.
- Valider et assainir le texte généré avant publication (longueur, caractères, liens) ; un champ de sortie mal formé fait échouer le nœud de publication.
- Vérifier l'identifiant de page et les permissions du jeton avant toute publication ; ne rien publier d'irréversible sans la validation prévue par `autonomie-abonnements.md` (2 à 3 premières vidéos et carrousels validés par Benj).
- LinkedIn : publier une organisation et publier une personne n'ont pas les mêmes champs (`organization` / `person`, `visibility` réservé à la personne) ; l'aide du constructeur rappelle que l'API ne permet ni scraping de profils ni de leads.
- X : `tweet.create` limite le texte ; les pièces jointes passent par un identifiant de média déjà téléversé, que ce nœud ne produit pas.
- Voix et vidéos : ElevenLabs et les générateurs vidéo passent par HTTP Request ou un nœud communautaire d'après le guide ; ils ne sont pas prévus dans l'architecture Presti (Kokoro, Fish) sans décision de Benj.
- Agent de rédaction : `systemMessage` doit nommer exactement les outils connectés et la forme de réponse ; interdire à l'agent d'inventer un prix, un délai ou un fournisseur (règle anti-fabrication).

## enrichment

Pas de guide fourni par l'outil. Ce qui suit vient des types de nœuds lus.
- Enrichir = lire une source (CRM, e-mail, Brevo) puis fusionner : prévoir un nœud `Merge` ou un champ `Set` explicite, car `Set` et `Merge` ne stockent rien (guide data_persistence).
- Recherche avant écriture : HubSpot `contact.search`, Pipedrive `person.search`, Airtable `record.search`, Brevo `contact.get`, Lemlist `lead.get` ; ne créer que si la recherche ne renvoie rien (sinon doublons).
- Préférer l'upsert quand le nœud l'offre : HubSpot, Brevo, Salesforce, Zoho, Airtable ; Mailchimp et Odoo n'en exposent pas dans leurs types (créer puis mettre à jour). ActiveCampaign : `updateIfExists` sur `contact.create`.
- Les noms de propriétés d'un CRM sont ceux du compte de l'artisan (Airtable, Notion, Odoo, Salesforce) : un gabarit ne peut qu'utiliser des marqueurs ; ne jamais écrire un nom de colonne comme s'il était confirmé.
- Les nœuds de lecture en outil d'agent existent (`gmailTool`, `microsoftOutlookTool`, `airtableTool`, `hubspotTool`, `notionTool`, `mondayComTool`) : leur donner uniquement la lecture, jamais l'écriture, quand l'agent n'est pas sous validation.
- Aucune donnée de prospect ni de client vers un modèle gratuit en ligne (`securite.md`) ; l'enrichissement passe par Claude via le nœud Anthropic ou par les outils auto-hébergés.
- Données personnelles : ne conserver dans le gabarit aucune adresse ni numéro réel ; n'enrichir que ce qui est nécessaire (RGPD).
- Limite des API de réseaux : `linkedIn` ne lit rien (seule opération : `post.create`) ; `youTube` n'a pas de ressource commentaire ; `twitter` n'a pas d'opération « mentions » (contournement par `tweet.search`, non équivalent confirmé).
- Prévoir un chemin « non enrichi » : si la source ne répond pas, le flux continue avec la donnée d'origine et le manque est journalisé.

## notification

Guide fourni par l'outil.
- Séquence : déclencheur, récupération/traitement, test de condition, notification, journalisation.
- Plusieurs canaux : une seule condition qui se divise en nœuds de notification parallèles, pas un workflow dupliqué par canal.
- Empêcher la notification vide : tester qu'il existe au moins un élément (`items.length > 0`) avant d'envoyer ; l'autre branche termine ou journalise.
- Regrouper (une alerte listant plusieurs éléments) plutôt qu'une alerte par élément.
- Journaliser chaque envoi pour l'audit et la prévention des doublons ; chemins d'erreur avec « Continue on Fail » pour la redondance.
- Slack : identifiant de canal (commence par C) plutôt que le nom ; le robot doit être invité dans le canal ; `includeLinkToWorkflow` vaut true par défaut (lien interne ajouté au message).
- Teams : un message de canal exige `teamId` et `channelId` ; les mentions rendent le message en HTML même en mode texte.
- E-mail à un client d'artisan : au nom de l'artisan, son adresse en Reply-To, jamais « Presti » ni la mention n8n (`appendAttribution: false` sur Gmail et sur les envois avec attente).
- E-mail en masse : Brevo gratuit, 300 par jour ; le nœud `sendInBlue` ne gère pas le quota, donc la vérification du reste et la mise en file du lendemain sont à construire dans le workflow (`email-brevo.md`).
- WhatsApp : `send` (texte) et `sendTemplate` (modèle `nom|langue`) sont deux opérations distinctes ; la règle de la fenêtre de 24 h n'est PAS rappelée par l'outil, à vérifier chez Meta.

## data_persistence

Guide fourni par l'outil.
- Premier choix du guide : Data Table (`n8n-nodes-base.dataTable`), sans identifiant ni coût ; Google Sheets pour le partage, Airtable pour les relations.
- Presti : la source de vérité opérationnelle est Supabase ; les Data Tables n8n ne servent qu'à l'état du workflow (identifiants traités, verrous, file du lendemain), pas aux données clients.
- Stocker la donnée brute avant toute transformation ; `Set` et `Merge` ne stockent rien.
- Éviter les doublons : identifiant unique ou upsert avant insertion ; indispensable pour les relances et les envois (idempotence : un crash ne crée aucun doublon).
- Pour les tables, bases et feuilles, utiliser le mode « list » du resource locator ; « id », « url » ou « name » seulement sur demande explicite (dans un gabarit sans credential la liste est vide, d'où les marqueurs d'identifiant).
- Pas de `getAll` sur `dataTable` : utiliser `get` avec `returnAll: true` (aide du constructeur) ; l'identifiant de ligne est généré, ne pas déclarer de colonne `id`.
- Limites : Google Sheets plafonne par quota d'API et se dégrade au-delà de 10 000 lignes ; regrouper les écritures en lot plutôt que ligne par ligne.
- CRM : Notion v3 attend `dataSourceId` (et non `databaseId`), les propriétés se nomment `Nom|type` ; Airtable demande des colonnes de correspondance pour l'upsert ; Odoo et Notion chargent leur schéma depuis le compte.
- Valider avant d'écrire : un schéma strict en sortie de modèle, puis seulement l'écriture ; aucune donnée inventée en base.
- Journaliser chaque action (qui, quoi, quand) dans une table dédiée, distincte de la table métier.

## scheduling

Guide fourni par l'outil.
- Nommer clairement les déclencheurs (« Quotidien 08:00 », « Toutes les 6 h ») ; plusieurs règles possibles dans un seul `scheduleTrigger`.
- Fuseau horaire : renseigner le paramètre du déclencheur ; le nœud Wait utilise l'heure système du serveur, pas celle du workflow ; préférer des durées relatives à des heures absolues.
- Préférer une condition (If/Switch) après le déclencheur à une expression cron compliquée (dernier jour du mois, jours fériés dans une Data Table).
- Pas de rattrapage automatique : si n8n est arrêté, les passages manqués sont perdus ; concevoir des workflows idempotents qui stockent l'heure du dernier succès dans une Data Table et n'agissent que si le délai est écoulé.
- Chevauchement : durée maximale d'exécution inférieure à l'intervalle ; sinon un verrou (« en cours » posé en début, retiré en fin) dans une Data Table.
- Waits : au-delà de 24 h, passer par une Data Table (date prévue, sondage périodique) ; éviter plus de 7 jours.
- Cron : 5 champs, ou 6 avec les secondes ; pour les cas simples, le mode intervalle est plus lisible.
- Le premier passage après activation se recalcule depuis l'activation ; lancer à la main si un premier passage immédiat est voulu.
- Presti : relances de devis et de factures, relève des canaux et prospection e-mail sont des automatisations récurrentes à porter dans n8n, chacune avec dry-run, comparaison à l'ancien comportement, puis désactivation de l'ancien code (`migration-production.md`).
- Les déclencheurs d'e-mail (`gmailTrigger`, `microsoftOutlookTrigger`) ont leur propre `pollTimes` ; leur fréquence compte dans le quota d'appels de l'API du fournisseur.
