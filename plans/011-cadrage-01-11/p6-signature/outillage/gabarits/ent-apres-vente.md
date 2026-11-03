# gabarit-ent-apres-vente — Après-vente et réputation (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-018 (prompt 6, outillage, lot 5 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-018/gabarit-ent-apres-vente.workflow.json`.
> Département 8 du § 7 de OUTILLAGE.md : fiche Google, Trustpilot (API) ; support Zendesk, Chatwoot (API). Prompt 2 : alerte client mécontent, entretien et contrats, avis négatif toujours à un humain.
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Lit les **avis** (fiche Google, Trustpilot) et les **tickets** (Zendesk, Chatwoot), prépare les réponses, **alerte l'équipe** quand un client est mécontent et propose l'**entretien** des contrats à renouveler. **Un avis négatif ou un client mécontent va toujours à un humain** : le code compte les étoiles contre le seuil du client, le modèle ne peut qu'*aggraver* le verdict, la réponse n'est jamais publiée seule — même au niveau 3 de l'annexe.

## Chemin d'un passage

1. **Entrées** : avis Google ou Trustpilot (Switch « Quelle plateforme d'avis ? »), tickets Zendesk ou conversations Chatwoot (Switch « Quel support ? » ; Chatwoot est lu dans les événements que la plateforme range en base), contrats de la plateforme.
2. **Normaliser** puis **Qualifier les retours** : étoiles contre `seuil_avis` (3 par défaut), visites d'entretien dans les 30 jours non encore proposées.
3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → **Rédacteur de réponses** → revalidation (sentiment dans l'énumération, réponse sans prix ni « Presti »).
4. **Décider les effets** : sentiment retenu = le pire du code et du modèle ; mécontent → **carte forcée** + alerte ; sinon réponse selon l'annexe ; entretien proposé par un texte du code.
5. **Quel effet ?** → carte, réponse sur la fiche Google, réponse par la plateforme (Trustpilot, Chatwoot), réponse Zendesk, courriel d'entretien (puis **Noter l'envoi**), événement lu, prévenir l'équipe → **Journaliser**.

## Les outils (nœuds réels, 62 nœuds au total)

Fiche Google (Business Profile : lecture et réponse), Trustpilot (API en lecture), Zendesk (lecture et réponse), Chatwoot (par la plateforme), Gmail et Outlook (entretien), Slack et Teams (alerte client mécontent).

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Lire les avis de la fiche Google (googleBusinessProfile 1)
- Lire les tickets Zendesk (zendesk 1)
- Avis de la fiche Google (outil) (googleBusinessProfileTool 1)
- Ticket Zendesk (outil) (zendeskTool 1)
- Lire le fil Gmail (gmailTool 2.2)
- Lire le fil Outlook (microsoftOutlookTool 2)
- Fiche Google : répondre à l’avis (googleBusinessProfile 1)
- Zendesk : répondre au ticket (zendesk 1)
- Envoyer par Gmail (gmail 2.2)
- Envoyer par Outlook (microsoftOutlook 2)
- Prévenir l’équipe par Slack (slack 2.7)
- Prévenir l’équipe par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
- GET api.trustpilot.com/v1/private/business-units/UNITE_TRUSTPILOT/reviews

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Rédacteur de réponses** — modèle `Claude : Rédacteur de réponses`, parseur `Schéma : Rédacteur de réponses`, outils : `Avis de la fiche Google (outil)`, `Ticket Zendesk (outil)`, `Lire le fil Gmail`, `Lire le fil Outlook`.

Le **rédacteur de réponses** lit la fiche Google, un ticket Zendesk et le fil de la boîte ; il rend `sentiment` (positif, neutre, negatif, tres_mecontent), `reponse` et `probleme`. Son brouillon d'un avis négatif n'est jamais publié : il arrive en carte à l'humain.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_evenements_canaux`, `entreprise_contrats`, `entreprise_relances`, `entreprise_autonomie`, `entreprise_actions`
- Écrites : `entreprise_cartes`, `entreprise_messages_sortants`, `entreprise_relances`, `entreprise_actions`
- Mises à jour : `entreprise_evenements_canaux`, `entreprise_actions`, `entreprise_cartes`

`entreprise_evenements_canaux` (événements Chatwoot, marqués lus), `entreprise_contrats`, `entreprise_relances`, `entreprise_messages_sortants` (réponses envoyées par la plateforme).

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- marquer_evenement → voie marquer_evenement
- repondre_avis_negatif → voie LANES[e.canal]
- proposer_entretien → voie courriel_ + boite
- prevenir_equipe → voie prevenir_ + config.outil_equipe

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `repondre_google`, `reponse_plateforme`, `repondre_zendesk`, `marquer_evenement`, `courriel_gmail`, `courriel_outlook`, `prevenir_slack`, `prevenir_teams`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** (annexe d'autonomie, « jamais en automatique », `kit/annexe-autonomie.md`) : prendre un rendez-vous seul (`planifier_chantier`), marquer une facture payée (`solder_facture`), créer une facture (`facturer_chantier`), parler au nom de l'entreprise sur un litige ou un avis négatif (`repondre_avis_negatif`), un point mensuel ou un bilan sans la validation d'équipe, tout prix estimé.
Seules les écritures internes (notification de l'équipe, indicateurs, import contrôlé, compteur IA) valent 3 sans annexe. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Les avis négatifs vont au périmètre « relation client » avec ses approbateurs et son canal d'équipe ; l'alerte part sur Slack ou Teams.

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `COMPTE_GOOGLE_DU_CLIENT`
- `FICHE_DU_CLIENT`
- `ORGANISATION_DU_CLIENT`
- `UNITE_TRUSTPILOT`
Et les identifiants : la fiche Google, Trustpilot (clé en lecture), Zendesk, la boîte (Gmail ou Outlook), Slack ou Teams, la clé du modèle, la base de la plateforme.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Un avis à 1 étoile* → une carte « À valider » pour le rôle associé et une alerte Slack, **aucune réponse automatique** même avec l'annexe au niveau 3 ; l'avis à 5 étoiles est publié selon l'annexe ; niveau 1 : brouillon ; le modèle aggrave (5 étoiles jugé « très mécontent » : carte).
- *Un contrat d'entretien* → proposition une fois, au bon destinataire ; sans destinataire : carte d'information.
- *Une autre organisation* → rien (avis, événements Chatwoot, configuration).

Le rejeu est celui du **code des nœuds Code** (bac à sable `node:vm`), pas une exécution dans n8n : `test_workflow` n'a pas été joué dans ce lot (le MCP n8n n'est pas branché sur l'hôte d'agents). La sortie complète est dans `essais-n8n.json`.

## Ce que le gabarit ne fait JAMAIS (tenu par le juge `scripts/gabarits-entreprise-2-qa.mjs`)

- Aucun identifiant, même celui de la base : la copie du client branche les siens après son accord écrit et le « go » de Benj (OUTILLAGE.md § 4, O3) ; un agent n'en crée jamais.
- Aucun déclencheur à webhook : n8n d'Oracle n'est pas exposé (OUTILLAGE.md § 3). Les canaux à webhook (WhatsApp, Messenger, Instagram, SMS, page publique) arrivent chez la plateforme, qui les range en base ; n8n les relit.
- Aucun appel au modèle, aucune écriture, aucun envoi sans passer par la sortie « faux » d'une porte « simulation » (R15). Sans configuration lisible, c'est la simulation.
- Aucun montant, aucun score, aucune date limite écrit par le modèle : le schéma strict du modèle n'en a pas, le nœud Code qui revalide calcule (R18).
- Aucune donnée d'une autre organisation : chaque lecture et chaque écriture porte `organisation_id`, et chaque ligne lue est re-contrôlée dans le code (R14, C6).
- Aucun nom de la plateforme dans un message pour un tiers (marque blanche) ; la mention de l'assistant (« Message rédigé et envoyé automatiquement par l'assistant de … ») est en pied de tout texte du modèle qui part.
- Aucune écriture dans la banque ni dans la compta du client : Qonto, Pennylane, QuickBooks, Xero et Stripe ne sont lus qu'en lecture ; l'export au comptable est un fichier.
- Un effet n'a lieu qu'une fois : sa clé d'idempotence est réservée dans `entreprise_actions` AVANT l'effet ; un rejeu ou un plantage ne double rien.

## Limites et points à confirmer à l'essai de lecture du client

- **Chatwoot** : l'hôte d'un Chatwoot est propre à chaque installation et absent de la liste blanche de la garde commune ; il est donc lu par la plateforme (ses événements arrivent par webhook chez elle) et la réponse repart par elle (`entreprise_messages_sortants`).
- **Trustpilot** : répondre à un avis demande une adresse propre à chaque avis, refusée par la garde (R7, adresse calculée). La réponse part donc par la plateforme.
- Les paramètres de la fiche Google (`accounts/…`, `locations/…`), de Zendesk (`status<solved`) et la forme de la réponse de Trustpilot (`reviews`, `stars`) sont à confirmer à l'essai de lecture.
- Le **seuil** d'un avis négatif (3 étoiles par défaut) est un réglage du contrat avec le client.

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-018/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-018/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-018/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-018/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
