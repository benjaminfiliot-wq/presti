# Dépôts ouverts pour 036-016

Lecture seule, le 03/11/2026, sur `~/agents/depots/`. 18 fichiers JSON ouverts et analysés avec `node` (nœuds, types, connexions, paramètres, notes adhésives). Aucun JSON, aucune clé, aucun identifiant ni adresse e-mail n'est recopié ici : on s'inspire de la forme, on n'importe rien.

Deux pièges de lecture à connaître avant de s'inspirer de ces dépôts :
- **Dans les 12 fichiers `Zie619_n8n-workflows` ouverts, les connexions sont fausses** : elles ne mènent qu'à des nœuds « error-handler » ajoutés par le dépôt. L'ordre des nœuds ci-dessous est donc reconstitué d'après les positions sur le canevas et les noms (sauf mention contraire). Un nœud `stopAndError` « Error Handler » est ajouté à presque tous et ne compte pas dans la forme utile.
- **Dans `enescingoz_awesome-n8n-templates`, les connexions sont réelles** (chaînes lues telles quelles).

Légende des colonnes : « Nœuds » = total du fichier (dont notes adhésives et gestionnaire d'erreur ajoutés). « IA » : agent = nœud agent LangChain ; modèle seul = un nœud OpenAI appelé une fois, sans outils ; non = aucune IA (ce n'est pas inventé).

## Tableau

| # | Chemin relatif (sous `~/agents/depots/`) | Nom du workflow | Nœuds | IA | Parseur | Outils | Validation humaine | Dédoublonnage |
|---|---|---|---|---|---|---|---|---|
| 1 | `Zie619_n8n-workflows/workflows/Airtable/1220_Airtable_Lemlist_Automate.json` | Airtable Workflow | 5 | non | non | non | non | non |
| 2 | `Zie619_n8n-workflows/workflows/Code/0379_Code_Pipedrive_Create_Triggered.json` | Pipedrive Workflow | 12 | modèle seul (gpt-4) | JSON.parse dans un nœud Code | non | non | recherche de la personne, pas de contrôle avant création de l'affaire |
| 3 | `Zie619_n8n-workflows/workflows/Code/1619_Code_Pipedrive_Automation_Triggered.json` | Pipedrive Workflow | 12 | idem n° 2 | idem | non | non | idem |
| 4 | `Zie619_n8n-workflows/workflows/Aggregate/0691_Aggregate_Jotform_Create_Triggered.json` | Klicktipp Workflow | 15 | non | non | non | non | oui pour les étiquettes (liste existante, Merge, If « exist ») |
| 5 | `Zie619_n8n-workflows/workflows/Aggregate/0697_Aggregate_Typeform_Create_Triggered.json` | Set Workflow | 15 | non | non | non | non | oui pour les étiquettes (même schéma que n° 4) |
| 6 | `Zie619_n8n-workflows/workflows/Activecampaign/0057_Activecampaign_Create_Triggered.json` | Receive updates when a new account is added by an admin in ActiveCampaign | 2 | non | non | non | non | non |
| 7 | `Zie619_n8n-workflows/workflows/Code/0693_Code_Webhook_Create_Webhook.json` | Agent Workflow | 27 | agent (le fichier a aplati les types en `noOp`) | non (extraction par Code, chaîne magique) | 4 (2 Sheets, 2 Docs) | non | non |
| 8 | `Zie619_n8n-workflows/workflows/Facebookleadads/0896_Facebookleadads_Stickynote_Automate_Triggered.json` | Stickynote Workflow | 4 | non | non | non | non | non |
| 9 | `Zie619_n8n-workflows/workflows/Manual/0987_Manual_Facebookgraphapi_Automation_Triggered.json` | Production Workflow | 3 | non | non | non | non | non |
| 10 | `Zie619_n8n-workflows/workflows/Manual/1094_Manual_Salesforce_Automate_Triggered.json` | Manualtrigger Workflow | 5 | non | non | non | non | non |
| 11 | `Zie619_n8n-workflows/workflows/Manual/1024_Manual_Mondaycom_Automate_Triggered.json` | Manualtrigger Workflow | 3 | non | non | non | non | non |
| 12 | `Zie619_n8n-workflows/workflows/Odoo/0977_Odoo_Code_Import_Scheduled.json` | Import Odoo Product Images from Google Drive | 20 | non | non | non | non | recherche par référence avant mise à jour (jamais de création) |
| 13 | `enescingoz_awesome-n8n-templates/OpenAI_and_LLMs/lemlist __ GPT-3_ Supercharge your sales workflows.json` | (sans nom dans le fichier) | 12 | modèle seul (classification) | non (le texte sert directement au Switch) | non | alerte Slack, pas de validation | contact HubSpot retrouvé par e-mail avant l'affaire |
| 14 | `enescingoz_awesome-n8n-templates/Notion/Automate LinkedIn Outreach with Notion and OpenAI.json` | Automate LinkedIn Posts with AI | 11 | modèle seul (assistant OpenAI) | non | non | en amont : le texte est rédigé par l'humain dans Notion | statut « Done » écrit après publication |
| 15 | `enescingoz_awesome-n8n-templates/OpenAI_and_LLMs/AI-Powered Social Media Amplifier.json` | Social Media AI Agent - Telegram | 26 | modèle seul (gpt-4o-mini), malgré le nom | oui : nœud Code de validation de structure + filtre des erreurs | non | alerte Telegram puis attente de 5 min (fenêtre, pas une approbation) | oui (recherche Airtable + filtre sur les identifiants déjà traités) |
| 16 | `enescingoz_awesome-n8n-templates/Instagram_Twitter_Social_Media/Generate Instagram Content from Top Trends with AI Image Generation.json` | Generate Instagram Content from Top Trends with AI Image Generation | 44 | 2 nœuds OpenAI (image + légende), pas d'agent | non | non | non (Telegram informatif) | oui (lecture Postgres sur un code avant tout travail) |
| 17 | `enescingoz_awesome-n8n-templates/Instagram_Twitter_Social_Media/AI agent for Instagram DM_inbox. Manychat + Open AI integration.json` | InstaTest | 11 | agent (+ modèle + mémoire à fenêtre) | non | aucun outil branché | non | non |
| 18 | `enescingoz_awesome-n8n-templates/Google_Drive_and_Google_Sheets/B2B Demo Lead Rescue Desk - Enrich Score Route and Escalate.json` | B2B Demo Lead Rescue Desk: Enrich, Score, Route, and SLA Escalate | 26 | non (notation par Code) | non | non | alertes Gmail aux humains, pas de validation | clé de dédoublonnage calculée, aucune recherche qui l'applique |

Couverture de la demande : HubSpot (n° 13), LinkedIn (n° 14 et 15), Instagram / Facebook (n° 16 et 17), déclencheur Lead Ads (n° 8), Graph API (n° 9 et 16), Salesforce (n° 10), monday.com (n° 11), Odoo (n° 12). Zoho CRM : un fichier existe (`Zie619_n8n-workflows/workflows/Manual/1021_Manual_Zohocrm_Automate_Triggered.json`) mais je ne l'ai pas ouvert, donc il n'est pas compté.

## 1. Airtable → Lemlist (`Airtable/1220_Airtable_Lemlist_Automate.json`)
- Chaîne : déclencheur manuel → Airtable (liste des lignes) → Lemlist (créer un prospect dans une campagne) → Lemlist (relire le prospect).
- 5 nœuds, dont le gestionnaire d'erreur ajouté. Aucun agent IA, aucun parseur, aucun outil, aucune validation humaine.
- Pas de dédoublonnage : toutes les lignes repartent à chaque exécution, avec un identifiant de campagne écrit en dur dans le nœud.
- Danger : envoi à froid depuis une table, sans désabonnement ni exclusion visibles.
- Forme gardée : le dernier nœud relit ce que le précédent vient d'écrire (relecture de contrôle après écriture).
- Pour un gabarit Presti : « écriture puis relecture de preuve », la liste des destinataires venant d'une table filtrée et plafonnée (300/jour).

## 2. Pipedrive, réponses de prospection (`Code/0379_Code_Pipedrive_Create_Triggered.json`)
- Chaîne reconstituée : deux déclencheurs Gmail (une boîte chacun, relève chaque minute) → Set (adresse de l'expéditeur) → Pipedrive (recherche de la personne) → Pipedrive (lecture) → If « dans la campagne ? » → OpenAI (gpt-4, « est-il intéressé ? », réponse JSON oui/non + raison) → Code (JSON.parse) → If « intéressé » → Pipedrive (création d'une affaire).
- 12 nœuds, une note adhésive d'installation qui demande un champ personnalisé « in_campaign ».
- IA : un seul appel de modèle, sans outil ni parseur de schéma ; le JSON est lu à la main (aucun garde-fou si le modèle sort un autre format).
- Pas de validation humaine ; pas de dédoublonnage de l'affaire (une réponse relue deux fois peut créer deux affaires).
- Danger : le contenu des e-mails reçus est envoyé à un modèle en ligne ; sondage toutes les minutes.
- Forme gardée : un filtre de garde AVANT l'IA (« la personne est-elle dans la campagne ? ») évite d'appeler le modèle pour rien.
- Pour un gabarit Presti : garde, puis qualification oui/non avec raison, puis action ; mais avec un schéma strict et une clé qui empêche le doublon.

## 3. Pipedrive, variante (`Code/1619_Code_Pipedrive_Automation_Triggered.json`)
- Même workflow que le n° 2 : identifiants et dates différents, un espace de plus dans le code du nœud « Get response ». Aucune différence de fond.
- 12 nœuds, mêmes constats : un appel de modèle, pas d'agent, pas de parseur, pas de validation, pas de dédoublonnage de l'affaire.
- Même danger : e-mails entrants vers un modèle en ligne.
- Constat utile pour 036-016 : les dépôts contiennent des doublons quasi exacts, il ne faut pas les compter comme deux sources.
- Forme gardée : identique à celle du n° 2.
- Pour un gabarit Presti : rien de plus ; ne citer que le n° 2.

## 4. Jotform → KlickTipp (`Aggregate/0691_Aggregate_Jotform_Create_Triggered.json`)
- Chaîne reconstituée : déclencheur Jotform (réservation de webinaire) → Set (conversion téléphone, date, URL) → KlickTipp (inscrire le contact) → deux branches parallèles (Set : tableau d'étiquettes du formulaire ; KlickTipp : liste de toutes les étiquettes existantes) → Split Out → Merge → If « l'étiquette existe ? » → oui : Aggregate → étiqueter ; non : créer l'étiquette → Aggregate → étiqueter.
- 15 nœuds ; aucune IA, aucun outil, aucune validation humaine.
- Dédoublonnage : réel pour les étiquettes (on lit l'existant, on fusionne, on crée seulement ce qui manque). Pour le contact lui-même, rien n'est vérifié dans le fichier.
- Danger : déclencheur de formulaire = point d'entrée public ; données personnelles (téléphone, date).
- Forme gardée : « lire l'existant, fusionner, créer le manquant, puis lier ».
- Pour un gabarit Presti : normaliser les champs dans un Set avant l'écriture, et appliquer ce schéma lire/fusionner/créer aux étiquettes de prospect.

## 5. Typeform → KlickTipp (`Aggregate/0697_Aggregate_Typeform_Create_Triggered.json`)
- Chaîne : déclencheur Typeform (quiz) → Set (conversion des réponses) → KlickTipp (inscrire) → [étiquettes du quiz ; étiquettes existantes] → Split Out → Merge → If « existe ? » → créer si besoin → Aggregate → étiqueter.
- 15 nœuds ; même squelette que le n° 4 avec un autre déclencheur. Aucune IA, aucun outil, aucune validation humaine.
- Dédoublonnage des étiquettes identique au n° 4 (le même identifiant de condition y figure).
- Danger : mêmes que le n° 4 (formulaire public, réponses personnelles).
- Forme gardée : le déclencheur change, le noyau « normaliser puis écrire puis étiqueter » reste.
- Pour un gabarit Presti : séparer le déclencheur (interchangeable) du noyau métier ; ne citer qu'un des deux fichiers.

## 6. ActiveCampaign, compte ajouté (`Activecampaign/0057_Activecampaign_Create_Triggered.json`)
- Chaîne : déclencheur ActiveCampaign (événement « compte ajouté » par un administrateur) → gestionnaire d'erreur ajouté. C'est tout.
- 2 nœuds. Aucune action, aucune IA, aucun parseur, aucun outil, aucune validation, aucun dédoublonnage.
- Danger : un déclencheur de service tiers inscrit un webhook chez le fournisseur ; sans action derrière, il ne sert à rien.
- Forme gardée : seulement le choix précis de l'événement et de la source (administrateur) dans les paramètres du déclencheur.
- Pour un gabarit Presti : rien ; fichier trop mince, à ne pas citer comme modèle.

## 7. Webhook ERPNext, agent de prospects (`Code/0693_Code_Webhook_Create_Webhook.json`)
- Chaîne reconstituée : Webhook POST → If « source = site web ET statut = ouvert » → Set → HTTP (relire la fiche du prospect dans l'ERP) → If « la fiche a des notes ? » → Agent IA → Code (extraire adresses, objet, corps depuis le texte libre) → If « demande valide ? » → Set + Code (texte vers HTML) → Outlook (envoi).
- 27 nœuds, dont 11 notes adhésives bien rédigées ; 16 nœuds utiles. L'agent et son modèle de chat sont typés `noOp` dans le fichier (types aplatis), mais leurs noms et l'invite sont lisibles.
- Outils branchés à l'agent : annuaire des contacts et abréviations (tableur), profil de l'entreprise et règles internes (documents) : quatre sources de vérité, pas de recherche web.
- Pas de parseur de sortie : l'agent répond en texte libre, extrait par Code ; l'état « invalide » est une phrase magique comparée dans un If (fragile). Pas de validation humaine ; l'e-mail part à un responsable interne, pas au prospect. Pas de dédoublonnage.
- Dangers : le Webhook n'a aucune authentification dans ses paramètres ; données de prospect envoyées au modèle ; ERP et boîte mail connectés.
- Forme gardée : trois gardes (source/statut, notes présentes, demande valide) autour de l'agent, et une invite qui sépare « sujet de la demande » et « qui prévenir ».
- Pour un gabarit Presti : même squelette mais avec sortie à schéma strict (pas de phrase magique), secret de webhook, et un champ « motif d'invalidité » journalisé.

## 8. Facebook Lead Ads → KlickTipp (`Facebookleadads/0896_Facebookleadads_Stickynote_Automate_Triggered.json`)
- Chaîne : déclencheur Facebook Lead Ads (page et formulaire choisis dans la liste) → KlickTipp (inscrire le prospect avec e-mail et prénom) → gestionnaire d'erreur ajouté.
- 4 nœuds (une note adhésive d'introduction). Aucune IA, aucun outil, aucune validation, aucun dédoublonnage.
- Le prénom est tiré du nom complet par découpe au premier espace ; fragile pour un nom composé.
- Danger : données personnelles de formulaires publicitaires ; les identifiants de page et de formulaire sont écrits dans le fichier (non reproduits ici) ; connexion OAuth Facebook.
- Forme gardée : un déclencheur de leads publicitaires est un nœud natif à deux réglages (page, formulaire), aucun code.
- Pour un gabarit Presti : prévoir un nœud de normalisation du nom et une recherche avant création, qui manquent ici.

## 9. Facebook Graph API, appel manuel (`Manual/0987_Manual_Facebookgraphapi_Automation_Triggered.json`)
- Chaîne : déclencheur manuel → Facebook Graph API (nœud « me », champs prénom et nom) → gestionnaire d'erreur ajouté.
- 3 nœuds. Ce n'est pas un workflow de leads : il lit le profil connecté. Aucune IA ni validation ni dédoublonnage.
- Danger : aucun en soi ; il faut un jeton Graph valide, donc un secret à stocker dans les identifiants n8n.
- Forme gardée : seulement la manière d'appeler un nœud (« me » + liste de champs) pour tester qu'un jeton est bon.
- Pour un gabarit Presti : un test de santé « le jeton répond-il ? » avant toute publication ; rien d'autre à retenir.

## 10. Salesforce, créer puis enchaîner (`Manual/1094_Manual_Salesforce_Automate_Triggered.json`)
- Chaîne : déclencheur manuel → Salesforce (créer un prospect : société, nom) → Salesforce (mettre à jour la ville du même prospect) → Salesforce (ajouter une note « affaire gagnée »).
- 5 nœuds ; données d'essai fictives. Aucune IA, aucun outil, aucune validation, aucun dédoublonnage.
- Danger : l'essai écrit dans un vrai CRM s'il est lancé tel quel.
- Forme gardée : l'identifiant renvoyé par la création alimente les deux écritures suivantes (création → mise à jour → note).
- Pour un gabarit Presti : même enchaînement sur l'objet « prospect » de Supabase, avec une recherche d'existence avant la création.

## 11. monday.com, lecture d'un tableau (`Manual/1024_Manual_Mondaycom_Automate_Triggered.json`)
- Chaîne : déclencheur manuel → monday.com (lire un tableau par son identifiant) → gestionnaire d'erreur ajouté.
- 3 nœuds. Aucune IA, aucune validation, aucun dédoublonnage ; l'identifiant du tableau est écrit en dur.
- Danger : aucun notable (lecture seule).
- Forme gardée : rien de plus qu'un test de connexion.
- Pour un gabarit Presti : ne pas citer comme modèle ; un connecteur monday.com n'est pas dans le périmètre de Presti.

## 12. Odoo, images de produits (`Odoo/0977_Odoo_Code_Import_Scheduled.json`)
- Chaîne logique (lue sur les noms et positions) : déclencheur planifié ou manuel → Drive (lister les fichiers) → Filter → Code (extraire référence et type depuis le nom) → Switch (modèle ou produit) → [Odoo : chercher par référence, 1 résultat → Drive : télécharger → conversion base64 → Odoo : mettre à jour l'image] → Drive : déplacer, chercher et supprimer les anciens → Summarize → message Google Chat récapitulatif.
- 20 nœuds, aucune note ; aucune IA, aucun outil, aucune validation humaine.
- Dédoublonnage par construction : on cherche d'abord par référence (limite 1) et on ne fait QUE des mises à jour, jamais de création.
- Danger : suppression de fichiers dans Drive en fin de chaîne (irréversible) ; écriture dans l'ERP.
- Forme gardée : « chercher par clé métier, mettre à jour, puis ranger l'entrée et annoncer un résumé ».
- Pour un gabarit Presti : clé métier + mise à jour seule, résumé unique en fin de passage (pas un message par ligne).

## 13. lemlist + GPT, réponses classées (`enescingoz.../OpenAI_and_LLMs/lemlist __ GPT-3_ Supercharge your sales workflows.json`)
- Chaîne réelle : déclencheur « réponse d'un prospect » Lemlist → OpenAI (catégorie : intéressé / absent / désabonnement / autre) + Merge → Switch sur le texte de la catégorie → sorties selon la catégorie : désabonner dans Lemlist ; marquer « intéressé » (HTTP) ; HubSpot « récupérer le contact » puis « créer l'affaire » puis Slack ; HubSpot « récupérer le contact » puis tâche de suivi ; un second message Slack part directement du Switch (le fichier ne dit pas laquelle des quatre sorties l'alimente).
- 12 nœuds, aucune note ; le fichier contient du texte parasite après le JSON (lu jusqu'à la fin du premier objet).
- IA : un seul appel de modèle de complétion, catégories fermées, sans outil ni parseur ; le Switch compare des chaînes, donc une réponse hors liste tombe dans la sortie par défaut.
- Pas de validation humaine (alerte Slack aux commerciaux) ; le contact est retrouvé par e-mail avant l'affaire. Il traite correctement le désabonnement comme une branche à part entière.
- Danger : le texte des réponses part vers un modèle en ligne ; le lien Slack contient un identifiant de portail HubSpot (non reproduit).
- Pour un gabarit Presti : classification fermée à 4 classes + Switch + branche désabonnement obligatoire (opt-out de `email-brevo.md`), sortie à schéma strict.

## 14. Notion → LinkedIn (`enescingoz.../Notion/Automate LinkedIn Outreach with Notion and OpenAI.json`)
- Chaîne réelle : déclencheur planifié (15 h) → Notion (lignes datées d'aujourd'hui) → Notion (blocs de la page) → Aggregate (textes + image) → HTTP (récupérer l'image) → OpenAI assistant (remettre en forme le texte) → Merge texte + image → LinkedIn (publier sur le compte de la personne) → Notion (statut « Done »).
- 11 nœuds, 2 notes adhésives. Malgré le titre « Outreach », il n'y a aucune collecte de profils : c'est une publication planifiée de ses propres contenus.
- IA : un modèle (assistant OpenAI) pour la mise en forme seulement ; ni outil ni parseur. Le texte est rédigé par l'humain dans Notion : la validation humaine est en amont.
- Dédoublonnage : le statut « Done » est écrit après la publication, mais la requête du matin ne filtre pas sur le statut (seulement sur la date).
- Danger : publication publique automatique ; identifiant de compte LinkedIn écrit en dur (non reproduit).
- Pour un gabarit Presti : file éditoriale dans une table avec statut, publication à heure fixe, écriture du statut en retour ; ajouter le filtre « pas encore publié ».

## 15. Hacker News → X et LinkedIn (`enescingoz.../OpenAI_and_LLMs/AI-Powered Social Media Amplifier.json`)
- Chaîne réelle : déclencheur planifié → HTTP (page d'accueil HN) → Code (extraire titres et liens) → Airtable (chercher les éléments déjà vus) → Merge → Code (filtrer les non traités) → HTTP (page GitHub) → conversion Markdown → OpenAI (gpt-4o-mini, invite système) → Code (valider la structure) → Filter (écarter les erreurs) → Airtable (créer l'élément) → Telegram (prévenir) → Wait 5 min → X et LinkedIn en parallèle → Airtable (statut par réseau).
- 26 nœuds (7 notes, très bien écrites) ; le nom parle d'« agent » mais il n'y a qu'un appel de modèle, sans outil.
- Parseur : pas de parseur LangChain, un nœud Code qui vérifie que les deux textes sont présents, puis un filtre qui jette les cas en erreur.
- Humain : message Telegram puis attente de 5 minutes avant publication ; ce n'est pas une approbation, il faut arrêter l'exécution à la main pour annuler.
- Dédoublonnage : recherche Airtable + ensemble des identifiants déjà traités ; l'élément est créé AVANT la publication et son statut mis à jour APRÈS.
- Dangers : publication automatique sur deux réseaux ; un identifiant de discussion Telegram et un identifiant de base Airtable sont écrits dans le fichier (non reproduits).
- Pour un gabarit Presti : la meilleure forme du lot : sortie validée, écriture avant action, statut après, fenêtre d'annulation annoncée (cf. les 10 minutes du pilote automatique).

## 16. Instagram, tendances → publication (`enescingoz.../Instagram_Twitter_Social_Media/Generate Instagram Content from Top Trends with AI Image Generation.json`)
- Chaîne réelle (condensée) : planifié → Set (paramètres Telegram, Instagram, API de scraping) → deux requêtes HTTP « meilleurs posts d'un hashtag » → Code (garder les images) → Merge → boucle par lots → Postgres (ce contenu existe déjà ?) → If → si inconnu : Postgres (l'enregistrer) → OpenAI (décrire l'image) → OpenAI (rédiger la légende) → HTTP (générer l'image) → Graph API (créer le média) → Graph API (statut) → If « terminé » → Graph API (publier) → statut → Telegram.
- 44 nœuds, 17 notes (guides de configuration) ; deux nœuds OpenAI, pas d'agent, pas de parseur, pas d'outil, pas de validation humaine (Telegram informatif).
- Dédoublonnage solide : lecture d'une table par code de contenu AVANT tout travail, puis insertion.
- Dangers : il collecte via un service tiers de scraping les meilleurs posts d'autrui et en dérive des publications (droits d'auteur, conditions de la plateforme) ; clés d'API placées dans un nœud Set ; publication automatique.
- Forme gardée : publication Meta en trois temps (créer le conteneur, attendre qu'il soit prêt, publier) avec test d'état entre chaque temps.
- Pour un gabarit Presti : garder les trois temps et la table d'unicité, jeter la collecte de contenus d'autrui ; la source ne peut être que les chantiers de l'artisan.

## 17. Instagram, messages directs via ManyChat (`enescingoz.../Instagram_Twitter_Social_Media/AI agent for Instagram DM_inbox. Manychat + Open AI integration.json`)
- Chaîne réelle : Webhook POST (ManyChat) → Set (invite système + identifiant de session) → Agent IA (modèle OpenAI de chat + mémoire à fenêtre de 20 messages indexée par la session) → Réponse au webhook.
- 11 nœuds, 5 notes de configuration ; 6 nœuds utiles. C'est un vrai nœud agent, mais aucun outil branché, aucun parseur de sortie.
- Pas de validation humaine, pas de dédoublonnage, pas de journal ; le texte du modèle repart tel quel dans la réponse.
- Dangers : le Webhook n'a aucune authentification dans ses paramètres ; messages privés de tiers envoyés à un modèle en ligne ; aucun garde-fou anti-invention (prix, délais).
- Forme gardée : l'invite est séparée de l'agent, dans un Set modifiable ; la mémoire est liée à un identifiant de conversation fourni par l'appelant.
- Pour un gabarit Presti : même découpage (Set d'invite, mémoire par conversation) mais avec un schéma de sortie, la règle anti-fabrication de `CLAUDE.md` et, en offre Studio, un brouillon à valider plutôt qu'une réponse directe.

## 18. Formulaire de prospects B2B, noter et router (`enescingoz.../Google_Drive_and_Google_Sheets/B2B Demo Lead Rescue Desk - Enrich Score Route and Escalate.json`)
- Chaîne réelle (condensée) : Webhook POST → Code (normaliser les champs, noter, attribuer un responsable, calculer une clé de dédoublonnage) → If « contact exploitable ? » → non : réponse 400 immédiate → oui : HTTP (lire la page d'où vient la demande) → Code (signaux de la page) → Set (ligne d'audit) → Sheets (ajouter) → Switch par priorité (chaud / à revoir / normal) → Gmail aux humains → If « escalade direction ? » → Gmail → réponse 200.
- 26 nœuds, 6 notes (une par bloc, très lisibles) ; 20 nœuds utiles. Aucune IA : la note est calculée par règles dans un Code.
- Pas de validation humaine (alertes uniquement). Dédoublonnage : la clé est calculée et renvoyée, mais aucun nœud ne cherche si elle existe déjà ; elle n'est donc pas appliquée.
- Dangers : Webhook sans authentification dans ses paramètres ; le serveur va lire une adresse fournie par l'appelant (risque de requête vers l'interne) ; données de contact dans un tableur.
- Forme gardée : rejeter tôt (réponse 400 avant tout coût), journaliser une ligne d'audit, router par priorité avec un délai de traitement.
- Pour un gabarit Presti : copier ce squelette de prospection entrante, avec la clé de dédoublonnage réellement appliquée (recherche avant création) et sans lecture d'URL fournie.

## Ce qu'on retient pour 036-016
- La forme d'un gabarit : déclencheur → garde(s) → normalisation → recherche d'existence → action → écriture du statut → journal.
- Les dépôts Zie619 ouverts ne sont pas des modèles de chaînage (connexions détruites, doublons) mais de bons catalogues de types de nœuds ; les modèles de structure viennent d'`enescingoz` (n° 7 pour l'agent, n° 15 pour l'écriture avant action, n° 18 pour le tri des prospects).
- Aucun des 18 fichiers n'a de vraie étape de validation humaine ; la fenêtre d'annulation du n° 15 est la plus proche, et elle ne s'annule qu'à la main.
