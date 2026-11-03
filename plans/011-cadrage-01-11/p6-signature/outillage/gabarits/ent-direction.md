# gabarit-ent-direction — Direction et équipe (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-018 (prompt 6, outillage, lot 5 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-018/gabarit-ent-direction.workflow.json`.
> Département 9 du § 7 de OUTILLAGE.md : Slack, Teams, Google Chat ; validation d'équipe par les outils HITL de n8n ; Sheets, Docs (PDF du lundi). Prompt 2 : mode privé, compteur de ce qui part vers un modèle externe.
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Prépare la **page du matin** de la direction, le **rapport du lundi**, le **point mensuel** et le **bilan à un mois**, et les diffuse par Slack, Teams, Google Chat ou Gmail. **Le code compte** (chaque chiffre vient de la plateforme, « non lu » sinon), **le modèle rédige** une phrase d'ouverture *sans chiffre* et choisit des numéros de priorités. Le point mensuel et le bilan passent par la **validation d'équipe** ; le **compteur** dit combien de documents sont partis vers un modèle externe ; en **mode privé** aucun texte n'y part.

## Chemin d'un passage

1. **Passage** : le jour et l'heure (Paris) sont lus sur le déclencheur. Page du matin dès 7 h ; rapport du lundi à partir de 8 h le lundi ; point mensuel le 1er du mois ; bilan 30 jours après `deploye_le`.
2. **Compter** : le code assemble les lignes de chaque document (impayés, devis, demandes, rendez-vous, cartes, encaissé, signé, coût IA, appels à un modèle externe) et la liste des priorités possibles.
3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → **Mode privé ?** : vrai → *Rédiger sans modèle* (phrase du code) ; faux → **Rédacteur de la direction** → **Revalider les documents** (aucun chiffre, aucun « Presti », priorités dans la liste).
4. **Décider les effets** : diffusion sur le canal de la configuration, document Docs et ligne Sheets le lundi, compteur du jour, alerte si le plafond du coût IA est atteint ; carte forcée + **validation Slack ou Teams** pour le point mensuel et le bilan.
5. **Quel effet ?** → carte, diffusion Slack / Teams / Google Chat / Gmail, Docs (créer puis écrire), Sheets (ajouter la ligne), indicateur, validation d'équipe → **Journaliser**.

## Les outils (nœuds réels, 55 nœuds au total)

Slack, Teams, Google Chat, Gmail (diffusion), Docs (rapport du lundi), Sheets (journal des lundis), **outils de validation humaine de n8n** (Slack et Teams), Drive (lecture des rapports précédents).

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Lire le classeur Sheets (outil) (googleSheetsTool 4.7)
- Chercher dans le Drive (outil) (googleDriveTool 3)
- Demander l’accord de l’équipe (Slack) (slackHitlTool 2.7)
- Demander l’accord de l’équipe (Teams) (microsoftTeamsHitlTool 2)
- Diffuser par Slack (slack 2.7)
- Diffuser par Teams (microsoftTeams 2)
- Diffuser par Google Chat (googleChat 1)
- Diffuser par Gmail (gmail 2.2)
- Docs : créer (rapport_docs) (googleDocs 2)
- Docs : écrire (rapport_docs) (googleDocs 2)
- Sheets : ajouter la ligne du lundi (googleSheets 4.7)
- Valider par Slack (slack 2.7)
- Valider par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :


## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Rédacteur de la direction** — modèle `Claude : Rédacteur de la direction`, parseur `Schéma : Rédacteur de la direction`, outils : `Lire le classeur Sheets (outil)`, `Chercher dans le Drive (outil)`, `Demander l’accord de l’équipe (Slack)`, `Demander l’accord de l’équipe (Teams)`.

Le **rédacteur de la direction** lit le journal Sheets et le Drive ; il dispose aussi des **outils de validation humaine de n8n** (Slack, Teams) pour demander l'accord d'un membre de l'équipe avant de proposer des priorités pour un point mensuel ou un bilan. Il rend `intro` (sans chiffre) et `priorites` (des numéros).

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_chiffres`, `entreprise_rapports`, `entreprise_cout_ia`, `entreprise_autonomie`, `entreprise_actions`
- Écrites : `entreprise_cartes`, `entreprise_indicateurs`, `entreprise_actions`
- Mises à jour : `entreprise_cartes`, `entreprise_actions`

`entreprise_chiffres` (chiffres du jour), `entreprise_rapports` (semaine, mois, bilan), `entreprise_cout_ia` (coût et appels par jour, dont les appels privés), `entreprise_indicateurs` (le compteur).

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- rapport_docs → voie rapport_docs
- journal_sheets → voie journal_sheets
- compteur_ia → voie indicateur
- alerte_cout_ia → voie diffuser_ + canal

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `diffuser_slack`, `diffuser_teams`, `diffuser_googlechat`, `diffuser_gmail`, `rapport_docs`, `journal_sheets`, `indicateur`, `valider_slack`, `valider_teams`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** (annexe d'autonomie, « jamais en automatique », `kit/annexe-autonomie.md`) : prendre un rendez-vous seul (`planifier_chantier`), marquer une facture payée (`solder_facture`), créer une facture (`facturer_chantier`), parler au nom de l'entreprise sur un litige ou un avis négatif (`repondre_avis_negatif`), un point mensuel ou un bilan sans la validation d'équipe, tout prix estimé.
Seules les écritures internes (notification de l'équipe, indicateurs, import contrôlé, compteur IA) valent 3 sans annexe. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Le point mensuel et le bilan sont des cartes du périmètre « direction » : ses approbateurs (par exemple le gérant) valident, sur le canal de validation de la configuration.

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `CANAL_VALIDATION_DU_CLIENT`
- `CHAT_VALIDATION_DU_CLIENT`
- `CLASSEUR_SHEETS_DU_CLIENT`
- `DOSSIER_RAPPORTS_DU_CLIENT`
- `ORGANISATION_DU_CLIENT`
Et les identifiants : Slack ou Teams ou Google Chat (le canal de la direction et celui de la validation), Gmail, Docs, Sheets, le Drive, la clé du modèle, la base de la plateforme.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Le rapport du lundi* → 8 h 15 : encaissé 12 345 €, signé 8 000 €, en cours 2 500 €, impayés 400 €, coût IA 2,00 € (chiffres du code, ceux d'une autre organisation ignorés) ; envoi, document et ligne Sheets ; un chiffre, « Presti » ou une priorité hors liste dans la phrase du modèle sont rejetés ; avant 7 h rien.
- *Le point mensuel* → carte « À valider » du périmètre direction et demande Slack ; le bilan 30 jours après le déploiement ; la carte approuvée par un rôle hors liste est ignorée.
- *Le compteur* → un document rédigé par le modèle : 1 externe ; en mode privé : 0 externe, 1 privé ; plafond dépassé : alerte.
- *Une autre organisation* → « non lu », jamais ses valeurs.

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

- **Modèles locaux** : le mode privé rédige avec le code, sans modèle. Les modèles locaux sur Oracle pour les tâches sensibles sont un lot ultérieur ; ce gabarit n'en suppose aucun.
- **PDF du lundi** : le gabarit crée un document Docs ; son export en PDF est un geste de la copie du client (le nœud Docs n'exporte pas).
- **Outils de validation humaine** sur l'agent : ils sont admis dans les gabarits Entreprise seulement (R23). Leur sémantique exacte (ils protègent un outil) est à confirmer à l'essai dans n8n ; la validation qui compte, celle de la carte, passe par les nœuds « Valider par Slack / Teams ».
- Après une reprise de `sendAndWait`, le lien d'élément `$('Quel effet ?').item` peut être perdu : à vérifier à l'essai dans n8n.
- Le coût IA du jour dépend de la table `entreprise_cout_ia`, alimentée par la plateforme.

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-018/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-018/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-018/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-018/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
