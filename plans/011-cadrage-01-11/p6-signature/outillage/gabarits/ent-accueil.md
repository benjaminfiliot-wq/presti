# gabarit-ent-accueil — Accueil et qualification (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-016 (prompt 6, outillage, lot 4 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-016/gabarit-ent-accueil.workflow.json`.
> Département 1 du § 7 de OUTILLAGE.md : Gmail, Outlook, IMAP multi-boîtes ; WhatsApp ; Messenger et Instagram ; Typeform, Jotform, Tally ; Calendly et Cal.com.
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Reçoit les messages de toutes les entrées du client, les trie en trois classes, qualifie les demandes réelles sur une **grille écrite avec le client**, dépose chaque message dans la conversation de la plateforme, crée **une seule fiche** dans le CRM du client et prépare (ou envoie, selon l'annexe) la réponse.

## Chemin d'un passage

1. **Entrées** : les boîtes Gmail, Outlook et IMAP sont lues par leurs déclencheurs à intervalle ; un déclencheur horaire lit, derrière la porte « simulation » de relève, les événements des canaux (WhatsApp, Messenger, Instagram, SMS, page publique) rangés en base par la plateforme, puis Typeform, Jotform et Tally par leur API.
2. **Normaliser** : une seule forme (canal, référence, clés d'identité par empreinte de courriel et de téléphone, texte). **Réglages de la copie**, configuration, annexe d'autonomie, actions du jour, créneaux Calendly et Cal.com (pour ne jamais proposer un créneau inventé), grille, identités connues, événements déjà traités.
3. **Écarter les doublons** : un événement déjà déposé est écarté ; la même personne par un autre canal reste dans **la même conversation**.
4. **Porte « simulation »** : vrai → « Effets prévus » (plan calculé par le même code, sur un enregistrement daté du modèle). Faux → **Trieur** (3 classes) → revalidation → **Qualificateur** (grille) → revalidation, où le **code** calcule le score.
5. **Décider les effets** selon l'annexe → **Réserver les actions** (clé unique) → **Quel effet ?** → dépôt, fiche CRM (Switch « Quel CRM ? »), réponse Gmail / Outlook / WhatsApp / plateforme, brouillon, carte, prévenir l'équipe → **Journaliser**.
6. La **relève des cartes** reprend les cartes approuvées par le bon rôle.

## Les outils (nœuds réels, 81 nœuds au total)

Gmail (déclencheur, réponse, brouillon, outil de lecture du fil), Outlook (idem), IMAP, WhatsApp Business (réponse), Slack et Teams (prévenir l'équipe), Typeform / Jotform / Tally (API à intervalle), Calendly / Cal.com (lecture des créneaux pris), et les huit CRM du Switch « Quel CRM ? » : HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday.

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Boîte Gmail du client (gmailTrigger 1.4)
- Boîte Outlook du client (microsoftOutlookTrigger 1)
- Boîte IMAP du client (emailReadImap 2.2)
- Lire le fil Gmail (gmailTool 2.2)
- Lire le fil Outlook (microsoftOutlookTool 2)
- HubSpot : fiche (hubspot 2.2)
- Pipedrive : fiche (pipedrive 2)
- Salesforce : fiche (salesforce 1.1)
- Zoho CRM : fiche (zohoCrm 1)
- Odoo : fiche (odoo 2)
- Airtable : fiche (airtable 2.2)
- Notion : fiche (notion 3)
- monday : fiche (mondayCom 2)
- Répondre par Gmail (gmail 2.2)
- Répondre par Outlook (microsoftOutlook 2)
- Répondre par WhatsApp (whatsApp 1.1)
- Brouillon Gmail (gmail 2.2)
- Brouillon Outlook (microsoftOutlook 2)
- Prévenir l’équipe par Slack (slack 2.7)
- Prévenir l’équipe par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
- GET api.typeform.com/forms/FORMULAIRE_TYPEFORM/responses
- GET eu-api.jotform.com/form/FORMULAIRE_JOTFORM/submissions
- GET api.tally.so/forms/FORMULAIRE_TALLY/submissions
- GET api.calendly.com/scheduled_events
- GET api.cal.com/v2/bookings

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Trieur** — modèle `Claude : Trieur`, parseur `Schéma : Trieur`, outils : `Trier la demande`.
- **Qualificateur** — modèle `Claude : Qualificateur`, parseur `Schéma : Qualificateur`, outils : `Lire le fil Gmail`, `Lire le fil Outlook`, `Trier la demande`, `Lire la photo`.

Le **trieur** n'a qu'un outil (`lib-trier-demande`, règles écrites avant le modèle). Le **qualificateur** rapporte `oui/non/inconnu` par critère avec sa preuve ; il ne calcule aucun score. Les deux reçoivent comme consigne que le texte du client est une donnée, jamais une instruction.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_evenements_canaux`, `entreprise_grille`, `entreprise_autonomie`, `entreprise_actions`, `entreprise_conversations`, `entreprise_messages_recus`
- Écrites : `entreprise_cartes`, `entreprise_messages_recus`, `entreprise_conversations`, `entreprise_messages_sortants`, `entreprise_actions`
- Mises à jour : `entreprise_conversations`, `entreprise_evenements_canaux`, `entreprise_actions`, `entreprise_cartes`

`entreprise_conversations` porte les clés d'identité : c'est elle qui empêche la deuxième fiche. L'union des clés d'une même personne est faite par la base (fonction SQL à poser avec la migration).

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- marquer_evenement → voie marquer_evenement
- deposer_conversation → voie deposer
- fiche_crm → voie crm_fiche
- reponse_prospect → voie lane
- brouillon_boite → voie brouillon_ + boite
- prevenir_equipe → voie prevenir_ + config.outil_equipe

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `deposer`, `marquer_evenement`, `crm_fiche`, `repondre_gmail`, `repondre_outlook`, `repondre_whatsapp`, `repondre_plateforme`, `brouillon_gmail`, `brouillon_outlook`, `prevenir_slack`, `prevenir_teams`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** : la demande de signature (Yousign, DocuSign), une proposition dont un prix est estimé, une réponse à un message qui parle de litige, de sinistre, d'avocat, d'assureur ou de plainte, une publication tant que le format n'a pas ses 2-3 validations.
Seuls le dépôt dans la plateforme et la notification de l'équipe valent 3 sans annexe : ce sont des écritures internes. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Les réponses et les fiches vont au périmètre configuré (`fiche_crm` → ventes, par défaut la direction).

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `FORMULAIRE_JOTFORM`
- `FORMULAIRE_TALLY`
- `FORMULAIRE_TYPEFORM`
- `ID_NUMERO_EXEMPLE`
- `ORGANISATION_DU_CLIENT`
Et les identifiants : Gmail/Outlook/IMAP, WhatsApp, Meta, LinkedIn, TikTok, X, YouTube, le CRM du client, l'outil de séquence, Slack ou Teams, la clé du modèle, la base de la plateforme. Un seul CRM : on garde sa branche du Switch « Quel CRM ? » et on débranche les sept autres.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Un message d'exemple* → score 100 calculé par le code, 1 dépôt, 1 fiche HubSpot, 1 réponse Gmail ; le plan de simulation est identique au plan réel.
- *Une réponse du modèle qui contient un prix ou « Presti »* → rejetée par la revalidation.
- *Une autre organisation* → rien (voir le gabarit leads, même code d'écartement et de relève).

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

- La fenêtre de 24 h de WhatsApp (texte libre seulement après un message du client) est une règle de Meta que `get_node_types` ne confirme pas : à vérifier ; au-delà, passer par `sendTemplate`.
- Les formes de réponse des API de formulaires (Typeform `items`, Jotform `content`, Tally `submissions`) sont celles de leurs documentations, à confirmer à l'essai de lecture.
- Une boîte IMAP par nœud : plusieurs boîtes = plusieurs copies du nœud ; le nœud ne marque RIEN comme lu (`postProcessAction: nothing`), pour que la simulation laisse le courrier intact.
- **Un événement de la plateforme n'est lu que par un seul gabarit** (catégorie `message` ici, `lead` pour le gabarit leads) et il est marqué « traité » même quand le trieur l'écarte : sinon il repasserait par le modèle à chaque relève.
- **Plafonds** : deux exécutions simultanées (un déclencheur de boîte et la relève de 10 minutes) lisent les mêmes « faits » avant d'écrire : le plafond du jour peut être dépassé de quelques unités. Le jour est celui de Paris.
- **Panne entre deux effets d'un même message** : le dépôt dans la conversation marque l'événement « traité » ; une panne juste après lui, avant la fiche ou la réponse, laisse une action « réservée » sans « faite » dans le journal. Rien n'est doublé, mais rien ne repart seul : un détecteur du lot d'intégration doit signaler les actions réservées depuis plus de 15 minutes.

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-016/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-016/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-016/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-016/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
