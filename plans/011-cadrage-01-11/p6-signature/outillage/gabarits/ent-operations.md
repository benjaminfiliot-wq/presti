# gabarit-ent-operations — Opérations (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-018 (prompt 6, outillage, lot 5 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-018/gabarit-ent-operations.workflow.json`.
> Département 5 du § 7 de OUTILLAGE.md : Google Agenda et Outlook ; projets ClickUp, monday, Notion ; Drive et OneDrive ; Sheets et Excel.
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Planifie les chantiers sur l'agenda **réel** du client, répartit les équipes, crée la tâche de projet et le dossier du chantier, et importe des lignes de tableur par un circuit contrôlé. Le **code** cherche les créneaux libres de chaque membre compétent (heures de travail du client, dix jours, jamais le week-end) ; le **modèle** ne choisit qu'un *numéro* dans cette liste. Rien ne s'écrit sans passer par l'annexe d'autonomie, et un rendez-vous n'est **jamais** pris seul : l'agenda ne reçoit un chantier que par une carte approuvée.

## Chemin d'un passage

1. **Entrées** : un déclencheur horaire lit, derrière la porte « simulation » de relève, l'agenda (Google ou Outlook, par le Switch « Quel agenda ? »), l'outil de projets (ClickUp, monday ou Notion), le tableur d'import (Sheets ou Excel) et les chantiers à planifier posés dans la plateforme.
2. **Normaliser** : événements (créneaux pris), tâches, chantiers, lignes d'import. Une ligne dont le libellé manque ou dont la quantité est hors limites reçoit ses **anomalies** : elle ne s'importera jamais.
3. **Préparer le planning** : le code numérote, par membre, les créneaux libres ; les membres d'une autre organisation n'existent pas.
4. **Porte « simulation »** : vrai → « Effets prévus ». Faux → filtre (un chantier qui n'a qu'une proposition n'a pas besoin du modèle) → **Répartiteur** → revalidation (le numéro doit être dans la liste du code).
5. **Décider les effets** → **Réserver les actions** → **Quel effet ?** → carte d'agenda (Google ou Outlook), tâche ClickUp / monday / Notion, dossier Drive / OneDrive, ligne importée, prévenir l'équipe → **Journaliser**.

## Les outils (nœuds réels, 73 nœuds au total)

Google Agenda (lecture des créneaux, pose du rendez-vous), Outlook (idem), ClickUp, monday, Notion (lecture des tâches existantes, création), Drive et OneDrive (dossier du chantier), Sheets et Excel (lecture des lignes à importer), Slack et Teams (prévenir l'équipe).

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Lire l’agenda Google (googleCalendar 1.3)
- Lire l’agenda Outlook (microsoftOutlook 2)
- Lire les tâches ClickUp (clickUp 1)
- Lire les éléments monday (mondayCom 2)
- Lire les pages Notion (notion 3)
- Lire le classeur Sheets (googleSheets 4.7)
- Lire le classeur Excel (microsoftExcel 2.2)
- Lire l’agenda Google (outil) (googleCalendarTool 1.3)
- Lire l’agenda Outlook (outil) (microsoftOutlookTool 2)
- Tâches ClickUp (outil) (clickUpTool 1)
- Lire le classeur Sheets (outil) (googleSheetsTool 4.7)
- Pages Notion (outil) (notionTool 3)
- Agenda Google : poser le chantier (googleCalendar 1.3)
- Agenda Outlook : poser le chantier (microsoftOutlook 2)
- ClickUp : créer la tâche (clickUp 1)
- monday : créer l’élément (mondayCom 2)
- Notion : créer la page (notion 3)
- Drive : créer le dossier (googleDrive 3)
- OneDrive : créer le dossier (microsoftOneDrive 1.1)
- Prévenir l’équipe par Slack (slack 2.7)
- Prévenir l’équipe par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :


## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Répartiteur** — modèle `Claude : Répartiteur`, parseur `Schéma : Répartiteur`, outils : `Lire l’agenda Google (outil)`, `Lire l’agenda Outlook (outil)`, `Tâches ClickUp (outil)`, `Lire le classeur Sheets (outil)`, `Pages Notion (outil)`.

Le **répartiteur** lit l'agenda (disponibilités Google, événements Outlook), les tâches ClickUp, la charge de l'équipe (Sheets) et les projets Notion ; il rend `proposition` (un entier), `motif` (une phrase). Son schéma n'a aucun champ de date, de créneau ou de membre : le code recalcule tout depuis le numéro.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_chantiers`, `entreprise_equipes`, `entreprise_autonomie`, `entreprise_actions`
- Écrites : `entreprise_cartes`, `entreprise_imports`, `entreprise_actions`
- Mises à jour : `entreprise_actions`, `entreprise_cartes`

`entreprise_equipes` porte les membres et leur compétence ; `entreprise_chantiers` les chantiers à planifier (`statut = a_planifier`) ; `entreprise_imports` reçoit les lignes importées après le contrôle du code.

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- import_ligne → voie import_ligne
- planifier_chantier → voie planifier_ + agenda
- creer_tache_projet → voie tache_ + projets
- creer_dossier → voie dossier_ + dossiers
- prevenir_equipe → voie prevenir_ + config.outil_equipe

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `planifier_google`, `planifier_outlook`, `tache_clickup`, `tache_monday`, `tache_notion`, `dossier_drive`, `dossier_onedrive`, `import_ligne`, `prevenir_slack`, `prevenir_teams`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** (annexe d'autonomie, « jamais en automatique », `kit/annexe-autonomie.md`) : prendre un rendez-vous seul (`planifier_chantier`), marquer une facture payée (`solder_facture`), créer une facture (`facturer_chantier`), parler au nom de l'entreprise sur un litige ou un avis négatif (`repondre_avis_negatif`), un point mensuel ou un bilan sans la validation d'équipe, tout prix estimé.
Seules les écritures internes (notification de l'équipe, indicateurs, import contrôlé, compteur IA) valent 3 sans annexe. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Les cartes d'agenda vont au périmètre `planifier_chantier` de la configuration, souvent « opérations » ; chaque chef d'équipe valide son périmètre.

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `AGENDA_DU_CLIENT`
- `A_IMPORTER`
- `CLASSEUR_EXCEL_DU_CLIENT`
- `CLASSEUR_SHEETS_DU_CLIENT`
- `EQUIPE_CLICKUP`
- `ESPACE_CLICKUP`
- `LISTE_CLICKUP`
- `ORGANISATION_DU_CLIENT`
Et les identifiants : l'agenda (Google ou Outlook), l'outil de projets, le Drive ou le OneDrive, le tableur, Slack ou Teams, la clé du modèle, la base de la plateforme. Un seul outil par rôle : on garde la branche de son outil dans chaque Switch (« Quel agenda ? », « Quel outil de projets ? », « Quel tableur ? ») et on débranche les autres.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Le planificateur* → membre 1 occupé de 8 h à 10 h : proposé à 10 h ; membre 2 libre : proposé à 8 h ; le choix du modèle donne une carte d'agenda « À valider », la tâche et le dossier ; plan simulé = plan réel ; un numéro hors liste ou « Presti » est rejeté.
- *Une ligne en anomalie* → L1 importée, L2 refusée avec une carte d'information et une alerte à l'équipe ; la tâche déjà dans ClickUp n'est pas recréée.
- *Une autre organisation* → rien : ni chantier, ni membre, ni action automatique.

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

- **Fuseau** : les créneaux sont calculés en heure de Paris ; l'agenda du client doit y être. Les horaires de travail viennent de `horaires` dans la configuration (8 h – 18 h par défaut).
- **Un agenda commun** : un événement lu par l'agenda du client bloque *toute* l'équipe (`membre_ref = equipe`). Pour des agendas par membre, la copie duplique le nœud de lecture, un par agenda, et pose `membre_ref` dans « Source ».
- Les paramètres de ClickUp (équipe, espace, liste), du classeur Sheets/Excel et de l'événement Outlook sont à confirmer à l'essai de lecture sur le compte du client.
- **Deux chantiers le même jour pour le même membre** : le second reçoit une carte d'information « conflit de créneau », jamais un double rendez-vous.

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-018/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-018/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-018/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-018/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
