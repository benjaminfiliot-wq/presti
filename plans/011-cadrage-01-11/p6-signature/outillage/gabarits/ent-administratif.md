# gabarit-ent-administratif — Administratif (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-018 (prompt 6, outillage, lot 5 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-018/gabarit-ent-administratif.workflow.json`.
> Département 6 du § 7 de OUTILLAGE.md : Drive, OneDrive, Docs, Gmail, Outlook ; prompt 2 : « pièce manquante, croise ses sources, relance qui doit le document ; échéances (assurances, attestations, contrôles) ».
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

**Pièce manquante** : le code croise les noms de fichiers (Drive ou OneDrive) et les sujets de courriers (Gmail ou Outlook) avec les pièces attendues, puis relance **qui doit le document**, trois fois au plus, à trois jours d'écart, et **jamais sans destinataire connu** (l'équipe est informée à la place). **Échéances** (assurances, attestations, contrôles) : posées dans l'agenda du client avant la date, avec une relance à qui doit renouveler. **Attestations** rédigées dans Docs à partir des seuls faits du dossier.

## Chemin d'un passage

1. **Entrées** : lecture des fichiers (Switch « Quel espace de fichiers ? »), des courriers récents (Switch « Quelle boîte ? »), de l'agenda (Switch « Quel agenda ? ») et des pièces, échéances et attestations de la plateforme.
2. **Normaliser** puis **Croiser les sources** : une pièce est *manquante* si sa référence ne se lit nulle part ; une échéance est *proche* dans la fenêtre du client (`jours_echeance`, 30 jours par défaut) ; une relance est *due* selon le nombre et la date des précédentes.
3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → deux filtres → **Rédacteur de relances** et **Rédacteur d'attestations** → revalidations.
4. **Décider les effets** : relance si le destinataire est connu, événement d'agenda si l'échéance n'y est pas déjà (la référence entre crochets dans le titre sert de clé), attestation dans Docs.
5. **Quel effet ?** → carte, agenda Google ou Outlook, Docs (créer puis écrire), relance Gmail ou Outlook (puis **Noter l'envoi**), prévenir l'équipe → **Journaliser**.

## Les outils (nœuds réels, 79 nœuds au total)

Drive et OneDrive (recherche), Gmail et Outlook (lecture des courriers, relances), Google Agenda et Outlook (échéances), Docs (attestations), Slack et Teams (prévenir l'équipe).

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Chercher dans Drive (googleDrive 3)
- Chercher dans OneDrive (microsoftOneDrive 1.1)
- Chercher dans Gmail (gmail 2.2)
- Chercher dans Outlook (microsoftOutlook 2)
- Lire l’agenda Google (googleCalendar 1.3)
- Lire l’agenda Outlook (microsoftOutlook 2)
- Lire le fil Gmail (gmailTool 2.2)
- Lire le fil Outlook (microsoftOutlookTool 2)
- Chercher dans le Drive (outil) (googleDriveTool 3)
- Chercher dans le Drive (outil) (attestations) (googleDriveTool 3)
- Lire le classeur Sheets (outil) (googleSheetsTool 4.7)
- Agenda Google : poser l’échéance (googleCalendar 1.3)
- Agenda Outlook : poser l’échéance (microsoftOutlook 2)
- Docs : créer (attestation_docs) (googleDocs 2)
- Docs : écrire (attestation_docs) (googleDocs 2)
- Envoyer par Gmail (gmail 2.2)
- Envoyer par Outlook (microsoftOutlook 2)
- Prévenir l’équipe par Slack (slack 2.7)
- Prévenir l’équipe par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :


## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Rédacteur de relances** — modèle `Claude : Rédacteur de relances`, parseur `Schéma : Rédacteur de relances`, outils : `Lire le fil Gmail`, `Lire le fil Outlook`, `Chercher dans le Drive (outil)`.
- **Rédacteur d’attestations** — modèle `Claude : Rédacteur d’attestations`, parseur `Schéma : Rédacteur d’attestations`, outils : `Chercher dans le Drive (outil) (attestations)`, `Lire le classeur Sheets (outil)`.

Le **rédacteur de relances** lit le fil de la personne (Gmail, Outlook) et le Drive ; il rend un objet et un texte, sans prix ni date. Le **rédacteur d'attestations** lit les modèles du Drive et le registre des attestations (Sheets) ; sa revalidation exige que **chaque fait du dossier figure mot pour mot** dans le texte et qu'**aucun nombre** n'y paraisse qui ne soit un fait.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_pieces_attendues`, `entreprise_echeances`, `entreprise_attestations`, `entreprise_relances`, `entreprise_autonomie`, `entreprise_actions`
- Écrites : `entreprise_cartes`, `entreprise_relances`, `entreprise_actions`
- Mises à jour : `entreprise_actions`, `entreprise_cartes`

`entreprise_pieces_attendues` (pièce, libellé, destinataire connu ou non), `entreprise_echeances`, `entreprise_attestations` (faits clés), `entreprise_relances` (une ligne par envoi : le code compte et date).

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- attestation_docs → voie attestation_docs
- relance_piece → voie relance_ + boite
- echeance_agenda → voie echeance_agenda_ + agenda
- prevenir_equipe → voie prevenir_ + config.outil_equipe

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `echeance_agenda_google`, `echeance_agenda_outlook`, `attestation_docs`, `relance_gmail`, `relance_outlook`, `prevenir_slack`, `prevenir_teams`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** (annexe d'autonomie, « jamais en automatique », `kit/annexe-autonomie.md`) : prendre un rendez-vous seul (`planifier_chantier`), marquer une facture payée (`solder_facture`), créer une facture (`facturer_chantier`), parler au nom de l'entreprise sur un litige ou un avis négatif (`repondre_avis_negatif`), un point mensuel ou un bilan sans la validation d'équipe, tout prix estimé.
Seules les écritures internes (notification de l'équipe, indicateurs, import contrôlé, compteur IA) valent 3 sans annexe. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Chaque type d'action (`relance_piece`, `echeance_agenda`, `attestation_docs`) a son périmètre ; les cartes d'information (destinataire inconnu) ne sont jamais exécutées.

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `AGENDA_DU_CLIENT`
- `CLASSEUR_SHEETS_DU_CLIENT`
- `DOSSIER_ATTESTATIONS_DU_CLIENT`
- `DOSSIER_DES_PIECES_DU_CLIENT`
- `ORGANISATION_DU_CLIENT`
Et les identifiants : le Drive ou le OneDrive, la boîte (Gmail ou Outlook), l'agenda, Docs, Slack ou Teams, la clé du modèle, la base de la plateforme.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Une attestation qui expire* → échéance à 10 jours : une relance de palier 1 au bon destinataire et un événement d'agenda (plan simulé = plan réel) ; à 90 jours rien ; expirée : relancée ; trois relances faites ou une hier : aucune ; échéance déjà dans l'agenda : pas de doublon.
- *Une pièce manquante* → Kbis lu dans le Drive et RIB lu dans un courrier : présents ; l'attestation de vigilance, sans destinataire connu : aucune relance, une carte d'information.
- *Une attestation* → un nombre inventé, un fait manquant, un prix ou « Presti » sont rejetés.
- *Une autre organisation* → rien.

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

- La pièce est reconnue par sa **référence dans un nom de fichier ou un sujet** : la convention de nommage est à écrire avec le client. Les pièces jointes elles-mêmes ne sont pas ouvertes.
- Les paramètres de recherche Drive (dossier des pièces), Gmail (`newer_than:60d has:attachment`) et OneDrive (`query *`) sont à confirmer à l'essai de lecture.
- L'événement Outlook d'une échéance passe par le nœud Outlook : il déclare donc le pied « mention » dans sa description.
- Les attestations restent des **brouillons Docs** : leur envoi est un autre geste, jamais automatique.

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-018/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-018/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-018/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-018/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
