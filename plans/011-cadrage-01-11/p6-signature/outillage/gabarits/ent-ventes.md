# gabarit-ent-ventes — Ventes et CRM (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-016 (prompt 6, outillage, lot 4 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-016/gabarit-ent-ventes.workflow.json`.
> Département 3 du § 7 de OUTILLAGE.md : HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday ; signature Yousign ou DocuSign par l'API.
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Lit les affaires dans **le CRM du client** (un Switch « CRM du client », la copie garde le sien), rédige les propositions à partir des fiches du CRM et du tarif du client — **les montants sont calculés par le code** —, prépare la demande de signature, relance les propositions sans réponse et note l'intérêt du client.

## Chemin d'un passage

1. **Relève** : Switch « Quel CRM lire ? » → lecture des affaires du CRM → mise en forme commune (référence, étape, contact par empreinte, jours sans réponse ; le nom des champs de chaque CRM vient de la configuration `mapping_crm`).
2. Tronc (configuration, annexe, actions du jour, **tarifs**, **propositions gagnées**) → **Router** (à proposer / à relancer) → **porte « simulation »**.
3. Faux → **Rédacteur de propositions** (réfs du tarif et quantités entières, aucun montant) → **Calculer les montants** ; **Relanceur** (relance + note d'intérêt froid / tiède / chaud) → revalidation. **Décider** → **Réserver** → **Contrôler les envois** (désinscription, plafond) → voies : proposition dans le CRM (Switch), Yousign ou DocuSign, relance Gmail ou Outlook, note d'intérêt, carte, exclusion, file, prévenir l'équipe.
4. **Un prix estimé ne part jamais seul** : si une référence manque au tarif, la proposition est « estimée », le montant est nul et tout passe en carte, même au niveau 3 de l'annexe.

## Les outils (nœuds réels, 93 nœuds au total)

HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday (lecture des affaires, puis proposition), Yousign et DocuSign par l'API, Gmail et Outlook (relance, outil de lecture du fil), Slack et Teams.

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Lire les affaires HubSpot (hubspot 2.2)
- Lire les affaires Pipedrive (pipedrive 2)
- Lire les opportunités Salesforce (salesforce 1.1)
- Lire les affaires Zoho CRM (zohoCrm 1)
- Lire les opportunités Odoo (odoo 2)
- Lire les affaires Airtable (airtable 2.2)
- Lire les affaires Notion (notion 3)
- Lire les affaires monday (mondayCom 2)
- Fiche CRM : HubSpot (hubspotTool 2.2)
- Fiche CRM : Pipedrive (pipedriveTool 2)
- Fiche CRM : Salesforce (salesforceTool 1.1)
- Fiche CRM : Zoho CRM (zohoCrmTool 1)
- Fiche CRM : Odoo (odooTool 2)
- Fiche CRM : Airtable (airtableTool 2.2)
- Fiche CRM : Notion (notionTool 3)
- Lire le fil Gmail (gmailTool 2.2)
- Lire le fil Outlook (microsoftOutlookTool 2)
- HubSpot : proposition (hubspot 2.2)
- Pipedrive : proposition (pipedrive 2)
- Salesforce : proposition (salesforce 1.1)
- Zoho CRM : proposition (zohoCrm 1)
- Odoo : proposition (odoo 2)
- Airtable : proposition (airtable 2.2)
- Notion : proposition (notion 3)
- monday : proposition (mondayCom 2)
- Répondre par Gmail (gmail 2.2)
- Répondre par Outlook (microsoftOutlook 2)
- Prévenir l’équipe par Slack (slack 2.7)
- Prévenir l’équipe par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
- POST api.yousign.app/v3/signature_requests
- POST eu.docusign.net/restapi/v2.1/accounts/COMPTE_DOCUSIGN/envelopes
- GET api.brevo.com/v3/account

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Rédacteur de propositions** — modèle `Claude : Rédacteur de propositions`, parseur `Schéma : Rédacteur de propositions`, outils : `Fiche CRM : HubSpot`, `Fiche CRM : Pipedrive`, `Fiche CRM : Salesforce`, `Fiche CRM : Zoho CRM`, `Fiche CRM : Odoo`, `Fiche CRM : Airtable`, `Fiche CRM : Notion`, `Contrôler les conflits`.
- **Relanceur** — modèle `Claude : Relanceur`, parseur `Schéma : Relanceur`, outils : `Contrôler les conflits`, `Lire le fil Gmail`, `Lire le fil Outlook`.

Le **rédacteur de propositions** lit les fiches du CRM par sept outils de lecture (HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion) et contrôle les conflits ; les propositions déjà gagnées lui sont données en contexte. Le **relanceur** lit le fil Gmail ou Outlook. Aucun schéma ne contient de champ de montant : le juge le vérifie.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_tarifs`, `entreprise_propositions`, `entreprise_actions`, `entreprise_autonomie`, `entreprise_desinscrits`
- Écrites : `entreprise_cartes`, `entreprise_notes_interet`, `entreprise_actions`
- Mises à jour : `entreprise_actions`, `entreprise_cartes`

`entreprise_tarifs` (références, prix HT en centimes, TVA en %) est la seule source des prix ; `entreprise_notes_interet` reçoit la note d'intérêt : elle ne remplace jamais une donnée du CRM du client.

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- proposition_crm → voie crm_proposition
- note_interet → voie note_plateforme
- demande_signature → voie signature_ + signature
- relance_vente → voie relance_ + boite
- prevenir_equipe → voie prevenir_ + config.outil_equipe

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `crm_proposition`, `signature_yousign`, `signature_docusign`, `relance_gmail`, `relance_outlook`, `note_plateforme`, `prevenir_slack`, `prevenir_teams`, `exclu`, `file_demain`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** : la demande de signature (Yousign, DocuSign), une proposition dont un prix est estimé, une réponse à un message qui parle de litige, de sinistre, d'avocat, d'assureur ou de plainte, une publication tant que le format n'a pas ses 2-3 validations.
Seuls le dépôt dans la plateforme et la notification de l'équipe valent 3 sans annexe : ce sont des écritures internes. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Les propositions vont au périmètre « ventes » ; la signature à celui du gérant (configurable).

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `COMPTE_DOCUSIGN`
- `ORGANISATION_DU_CLIENT`
Et les identifiants : Gmail/Outlook/IMAP, WhatsApp, Meta, LinkedIn, TikTok, X, YouTube, le CRM du client, l'outil de séquence, Slack ou Teams, la clé du modèle, la base de la plateforme. Un seul CRM : on garde sa branche du Switch « Quel CRM ? » et on débranche les sept autres.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Un devis* : 2 × 100 € + 1 × 50 € HT = 250 € HT, TVA 50 €, **300 € TTC (30000 centimes) calculés par le code** ; le « 1 » glissé dans la sortie du modèle est ignoré ; la simulation donne aussi 30000.
- *Un tarif inconnu* → proposition estimée, montant nul, aucune écriture dans le CRM ni demande de signature, des cartes à la place.
- *Une relance* → 1 relance Gmail et 1 note d'intérêt dans la plateforme.

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

- **Yousign** : l'activation de la demande exige l'identifiant rendu, dans l'adresse ; la garde refuse une adresse calculée (R7). Le gabarit crée la demande en **brouillon** (aucun envoi au signataire) ; l'activation est un sous-workflow du lot d'intégration.
- **DocuSign** : l'enveloppe est créée au statut `created` (brouillon) ; le PDF de la proposition y est joint par l'étape documentaire du lot Devis.
- **monday** n'a pas d'outil d'agent admis par la garde (opération `getItems`) ; il reste lu et écrit par son nœud.
- **Filtres d'exemple** : les nœuds de lecture des affaires gardent les filtres du squelette (Odoo `name like "Exemple."`, Airtable `{Nom} = 'Exemple.'`, Salesforce `Prospecting`) : la copie les remplace, sinon la lecture ne ramène rien.
- **Relances** : trois au plus par proposition, une par rang (`jours sans réponse ÷ jours avant relance`, rang 1 à 3) ; au-delà, l'humain reprend. Le quota des relances est distinct de celui des séquences.
- **Étapes** : la copie traduit les étapes de son CRM vers `proposition_a_faire` et `proposition_envoyee` dans `mapping_crm.<crm>.etapes`, avec le nom de chaque champ ; sans cette traduction, rien n'est à proposer ni à relancer.
- Les paramètres de lecture des affaires de HubSpot, Pipedrive, Zoho CRM, Airtable, Notion et monday sont à confirmer à l'essai de lecture : ils dépendent des champs du client.

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-016/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-016/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-016/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-016/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
