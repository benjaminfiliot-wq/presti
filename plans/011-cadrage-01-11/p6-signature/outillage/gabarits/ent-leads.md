# gabarit-ent-leads — Leads et acquisition (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-016 (prompt 6, outillage, lot 4 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-016/gabarit-ent-leads.workflow.json`.
> Département 2 du § 7 de OUTILLAGE.md : Facebook Lead Ads (API Graph), LinkedIn (publication), Google Ads, Instagram ; séquences Brevo, Mailchimp, ActiveCampaign, Lemlist ; ManyChat ; chaque lead dans son CRM et dans la plateforme.
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Lit les leads du client (Facebook Lead Ads par l'API Graph, réservations Cal.com, événements Instagram et Messenger rangés par la plateforme), calcule leur score **par le code**, les dédoublonne entre canaux, crée **une seule fiche** dans le CRM du client, rédige le premier message d'une séquence et l'inscrit **sur le compte d'envoi du client** (Brevo, Mailchimp, ActiveCampaign ou Lemlist) ou lance son flux ManyChat. Publie sur LinkedIn l'aimant à leads déjà validé. **Désinscription et quota sont lus avant chaque envoi.**

## Chemin d'un passage

1. **Relève** (derrière la porte « simulation ») : Facebook Lead Ads par l'API Graph (nœud natif, lecture), Cal.com, rapport Google Ads (nombres seulement), événements des canaux, aimants à leads validés.
2. **Normaliser** → tronc (configuration, annexe, actions du jour, disponibilité Calendly, identités connues, événements traités) → **Écarter les doublons** (une personne = une conversation, quel que soit le canal) → **porte « simulation »**.
3. Faux → **Rédacteur de séquence** (rapports et aimants exclus) → revalidation (score calculé ici) → **Décider les effets** → **Réserver** → **Contrôler les envois** : un désinscrit est *exclu* et journalisé ; au-delà du plafond (celui du client et celui du compte), la suite part en **file pour le lendemain** — jamais perdue, jamais bloquée (`email-brevo.md`).
4. Voies : dépôt, fiche CRM (Switch `Quel CRM ?`), séquence Brevo / Mailchimp / ActiveCampaign / Lemlist, ManyChat, LinkedIn (publier), indicateur, carte, exclusion, file, prévenir l'équipe.

## Les outils (nœuds réels, 85 nœuds au total)

Facebook Lead Ads / Graph, Cal.com, Calendly (créneaux pris), Google Ads (rapports), Brevo (lecture du contact, ajout, premier message), Mailchimp, ActiveCampaign, Lemlist, ManyChat (API), LinkedIn (publication seulement), Slack, Teams, et les huit CRM.

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Lire les leads Facebook (facebookGraphApi 1)
- Lire le rapport Google Ads (googleAds 1)
- Fiche CRM : HubSpot (hubspotTool 2.2)
- Fiche CRM : Airtable (airtableTool 2.2)
- Fiche CRM : Notion (notionTool 3)
- HubSpot : fiche (hubspot 2.2)
- Pipedrive : fiche (pipedrive 2)
- Salesforce : fiche (salesforce 1.1)
- Zoho CRM : fiche (zohoCrm 1)
- Odoo : fiche (odoo 2)
- Airtable : fiche (airtable 2.2)
- Notion : fiche (notion 3)
- monday : fiche (mondayCom 2)
- Brevo : lire le contact (sendInBlue 1.1)
- Mailchimp : inscrire (mailchimp 1)
- ActiveCampaign : contact (activeCampaign 1)
- ActiveCampaign : liste (activeCampaign 1)
- Lemlist : ajouter le lead (lemlist 2)
- LinkedIn : publier (linkedIn 1)
- Prévenir l’équipe par Slack (slack 2.7)
- Prévenir l’équipe par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
- GET api.cal.com/v2/bookings
- GET api.calendly.com/scheduled_events
- POST api.brevo.com/v3/contacts
- POST api.brevo.com/v3/smtp/email
- GET api.manychat.com/fb/subscriber/findByEmail
- POST api.manychat.com/fb/sending/sendFlow
- GET api.brevo.com/v3/account

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Rédacteur de séquence** — modèle `Claude : Rédacteur de séquence`, parseur `Schéma : Rédacteur de séquence`, outils : `Fiche CRM : HubSpot`, `Fiche CRM : Airtable`, `Fiche CRM : Notion`, `Contrôler les conflits`.

Le **rédacteur de séquence** choisit le canal conseillé (courriel, ManyChat, aucun) et écrit le message ; il lit les fiches du CRM (HubSpot, Airtable, Notion) et contrôle les conflits (`lib-controler-conflit`). Son schéma n'a ni score ni montant. monday est lu par son nœud, pas en outil d'agent : le juge commun n'admet comme lecture d'outil que `get`, `getAll`, `search`… et monday nomme la sienne `getItems`.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_evenements_canaux`, `entreprise_contenus`, `entreprise_autonomie`, `entreprise_actions`, `entreprise_conversations`, `entreprise_messages_recus`, `entreprise_desinscrits`
- Écrites : `entreprise_cartes`, `entreprise_messages_recus`, `entreprise_conversations`, `entreprise_indicateurs`, `entreprise_actions`
- Mises à jour : `entreprise_conversations`, `entreprise_evenements_canaux`, `entreprise_actions`, `entreprise_cartes`

`entreprise_desinscrits` est la liste de désinscription du client, relue **avant chaque envoi** ; elle prime sur toute autre liste. La liste noire du fournisseur (Brevo) est relue en plus.

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- indicateur_ads → voie indicateur
- publier_linkedin → voie publier_linkedin
- marquer_evenement → voie marquer_evenement
- deposer_conversation → voie deposer
- fiche_crm → voie crm_fiche
- message_manychat → voie manychat
- inscrire_sequence → voie sequence_ + outil
- prevenir_equipe → voie prevenir_ + config.outil_equipe

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `deposer`, `marquer_evenement`, `crm_fiche`, `sequence_brevo`, `sequence_mailchimp`, `sequence_activecampaign`, `sequence_lemlist`, `manychat`, `publier_linkedin`, `indicateur`, `prevenir_slack`, `prevenir_teams`, `exclu`, `file_demain`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** : la demande de signature (Yousign, DocuSign), une proposition dont un prix est estimé, une réponse à un message qui parle de litige, de sinistre, d'avocat, d'assureur ou de plainte, une publication tant que le format n'a pas ses 2-3 validations.
Seuls le dépôt dans la plateforme et la notification de l'équipe valent 3 sans annexe : ce sont des écritures internes. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Les cartes de séquence vont au périmètre configuré pour `inscrire_sequence` ; le plafond d'envoi est une règle du client, jamais de la plateforme.

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `ID_FORMULAIRE_LEAD_ADS`
- `ORGANISATION_DU_CLIENT`
- `URN_PERSONNE_EXEMPLE`
Et les identifiants : Gmail/Outlook/IMAP, WhatsApp, Meta, LinkedIn, TikTok, X, YouTube, le CRM du client, l'outil de séquence, Slack ou Teams, la clé du modèle, la base de la plateforme. Un seul CRM : on garde sa branche du Switch « Quel CRM ? » et on débranche les sept autres.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Un lead Facebook* → 1 dépôt et 1 fiche HubSpot ; score 70 calculé par le code (urgence « sous un mois » 40 + budget 30) ; le score de 100 donné par le modèle est ignoré ; plan de simulation = plan réel.
- *Le même lead par deux canaux* (Facebook + Cal.com) → 2 dépôts, **1 fiche** ; reçu d'un lot à l'autre → 0 fiche.
- *Un désinscrit* → exclu, aucune séquence. *Un quota de 2 avec 1 envoi déjà fait* → 1 part, 2 en file ; le plafond du compte (1 crédit) borne aussi.
- *Une autre organisation* → ni conversation, ni carte, ni configuration ne passent.

Le rejeu est celui du **code des nœuds Code** (bac à sable `node:vm`), pas une exécution dans n8n : `test_workflow` n'a pas été joué dans ce lot (le MCP n8n n'est pas branché sur l'hôte d'agents). La sortie complète est dans `essais-n8n.json`.

## Ce que le gabarit ne fait JAMAIS (tenu par le juge `scripts/gabarits-entreprise-qa.mjs`)

- Aucun identifiant, même celui de la base : la copie du client branche les siens après son accord écrit et le « go » de Benj (OUTILLAGE.md § 4, O3) ; un agent n'en crée jamais.
- Aucun déclencheur à webhook : n8n d'Oracle n'est pas exposé (OUTILLAGE.md § 3). Les canaux à webhook (WhatsApp, Messenger, Instagram, SMS, page publique) arrivent chez la plateforme, qui les range en base ; n8n les relit.
- Aucun appel au modèle, aucune écriture, aucun envoi sans passer par la sortie « faux » d'une porte « simulation » (R15). Sans configuration lisible, c'est la simulation.
- Aucun montant, aucun score, aucune date limite écrit par le modèle : le schéma strict du modèle n'en a pas, le nœud Code qui revalide calcule (R18).
- Aucune donnée d'une autre organisation : chaque lecture et chaque écriture porte `organisation_id`, et chaque ligne lue est re-contrôlée dans le code (R14, C6).
- Aucun nom de la plateforme dans un message pour un tiers (marque blanche) ; la mention de l'assistant (« Message rédigé et envoyé automatiquement par l'assistant de … ») est en pied de tout texte du modèle qui part.
- Aucune collecte LinkedIn : LinkedIn sert à publier, sur le compte du client.
- Un effet n'a lieu qu'une fois : sa clé d'idempotence est réservée dans `entreprise_actions` AVANT l'effet ; un rejeu ou un plantage ne double rien.

## Limites et points à confirmer à l'essai de lecture du client

- **Calendly** : les invités se lisent par un chemin à identifiant (`/scheduled_events/{uuid}/invitees`), que la garde refuse (hôte et adresse écrits en dur, R7). Le gabarit lit donc seulement les créneaux pris ; les invités Calendly demandent un sous-workflow (lot d'intégration).
- **Google Ads** : la forme des lignes (`campaign`, `metrics.cost_micros`) est supposée d'après l'API ; à confirmer à l'essai de lecture.
- **Quota du compte** : la réponse de `GET /v3/account` est lue par `creditsType` ou `type` égal à `sendLimit` ; la forme est à vérifier à l'essai de lecture. Sans elle, le plafond du client (`quota_jour`) s'applique seul. Les relances de devis (gabarit ventes) ont leur propre plafond (`quota_relances_jour`) : elles ne consomment jamais le quota de prospection froide.
- **Désinscription** : le premier message nomme son expéditeur (`expediteur_courriel`), porte l'en-tête `List-Unsubscribe` et la ligne « répondez STOP ». Les réponses STOP et les désinscriptions du fournisseur doivent alimenter `entreprise_desinscrits` (Brevo Trigger ou lecture à intervalle, lot d'intégration) : c'est cette liste qui prime à l'envoi suivant. Sans ce circuit, la ligne STOP promet ce que rien ne tient.
- **Brevo, lecture du contact** : seule une réponse « pas en liste noire » ou « contact inconnu » (404) autorise l'envoi ; toute autre erreur l'arrête.
- **Panne entre deux effets** : même réserve que l'accueil (une action « réservée » sans « faite » est signalée, jamais rejouée à l'aveugle).
- Le Brevo gratuit porte sa propre marque, jamais celle de la plateforme ; la prospection de Presti (ADR-005) reste un système séparé et n'utilise pas ce gabarit.

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-016/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-016/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-016/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-016/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
