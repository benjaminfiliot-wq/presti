# gabarit-ent-marketing — Marketing et réseaux (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-016 (prompt 6, outillage, lot 4 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-016/gabarit-ent-marketing.workflow.json`.
> Département 4 du § 7 de OUTILLAGE.md : Instagram et Facebook (publication, messages, commentaires, API Graph), LinkedIn, TikTok (API), YouTube, X, Google Ads (rapports).
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Rédige les contenus du client à partir de ses briefs et de sa charte, répond aux commentaires, suit quelques nombres (abonnés, coût, clics) et publie sur les comptes **du client**. **Tout ce qui se publie passe par la validation d'équipe** (Slack ou Teams, avec la carte « À valider » dans la plateforme) tant que les 2-3 premiers contenus de **chaque format** ne sont pas validés par un humain, et dès que la QA voit une anomalie (`autonomie-abonnements.md`).

## Chemin d'un passage

1. **Relève** (derrière la porte) : briefs à produire, commentaires Facebook (API Graph) et Instagram, chaîne YouTube, mentions sur X, rapport Google Ads, compte TikTok — les rapports ne gardent que des nombres.
2. **Normaliser** → tronc (configuration, annexe, actions du jour, **formats validés**, **charte**) → **porte « simulation »**.
3. Faux → **Rédacteur de contenu** → **revalidation / QA** (longueur par réseau, aucun lien, au plus dix hashtags, ni prix ni nom de la plateforme) → **Décider** : une publication ne part seule que si le format a ses validations (2 à 3, `validations_requises`) **et** que la QA est propre ; sinon une **carte « À valider »** plus une **demande de validation d'équipe**.
4. **Valider par Slack / Teams** (envoyer et attendre) : approuvé → la carte passe à « approuvée » (le canal est propre au périmètre : ses membres sont les approbateurs) ; refusé ou délai → « refusée ». La publication est faite par la relève des cartes, jamais par la validation.
5. Voies de publication : Facebook (page), Instagram (conteneur puis publication), LinkedIn, TikTok (brouillon), YouTube (passage en public), X ; réponses aux commentaires Facebook et Instagram.

## Les outils (nœuds réels, 69 nœuds au total)

Facebook et Instagram par l'API Graph (nœud natif), LinkedIn (publication seulement), TikTok (API de publication, brouillon dans la boîte du créateur), YouTube, X, Google Ads (rapports), Slack et Teams (envoyer et attendre), Notion et Airtable en outils de lecture (calendrier éditorial, contenus passés).

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Lire les commentaires Facebook (facebookGraphApi 1)
- Lire la chaîne YouTube (youTube 1)
- Lire les mentions sur X (twitter 2)
- Lire le rapport Google Ads (googleAds 1)
- Idées et calendrier (Notion) (notionTool 3)
- Contenus passés (Airtable) (airtableTool 2.2)
- Facebook : publier sur la page (facebookGraphApi 1)
- Instagram : créer le média (facebookGraphApi 1)
- Instagram : publier le média (facebookGraphApi 1)
- LinkedIn : publier (linkedIn 1)
- YouTube : mettre en ligne la vidéo (youTube 1)
- X : publier (twitter 2)
- Facebook : répondre au commentaire (facebookGraphApi 1)
- Instagram : répondre au commentaire (facebookGraphApi 1)
- Valider par Slack (slack 2.7)
- Valider par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
- GET graph.facebook.com/v21.0/COMPTE_INSTAGRAM_DU_CLIENT/media
- GET open.tiktokapis.com/v2/user/info/
- POST open.tiktokapis.com/v2/post/publish/content/init/

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Rédacteur de contenu** — modèle `Claude : Rédacteur de contenu`, parseur `Schéma : Rédacteur de contenu`, outils : `Idées et calendrier (Notion)`, `Contenus passés (Airtable)`.

Le **rédacteur de contenu** écrit un texte par réseau demandé, ou la réponse à un commentaire. Il ne publie rien. Une anomalie de texte (prix, nom de la plateforme, lien, trop long) ou une sortie manquante ne lève jamais d'erreur : elle devient une carte « À valider » marquée *à corriger* (que la relève n'exécute pas tant qu'un humain ne l'a pas réécrite). Un format que la voie automatique ne sait pas publier (carrousel, vidéo sans fichier, image manquante) devient aussi une carte. Les réponses aux commentaires restent à valider tant que l'annexe ne les passe pas au niveau 3 (aucune réponse automatique sans consentement), et un commentaire qui parle de litige, d'avocat, de plainte ou d'arnaque reste une carte même au niveau 3.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_contenus`, `entreprise_formats`, `entreprise_charte`, `entreprise_actions`, `entreprise_autonomie`
- Écrites : `entreprise_cartes`, `entreprise_indicateurs`, `entreprise_actions`
- Mises à jour : `entreprise_cartes`, `entreprise_actions`

`entreprise_formats` compte les validations positives de chaque format et porte l'écart de la QA ; `entreprise_charte` porte la charte écrite avec le client.

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- indicateur_ads → voie indicateur
- publier_ → voie LANES[reseau]
- repondre_commentaire → voie repondre_commentaire_ + e.reseau

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `publier_facebook`, `publier_instagram`, `publier_linkedin`, `publier_tiktok`, `publier_youtube`, `publier_x`, `repondre_commentaire_facebook`, `repondre_commentaire_instagram`, `indicateur`, `valider_slack`, `valider_teams`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** : la demande de signature (Yousign, DocuSign), une proposition dont un prix est estimé, une réponse à un message qui parle de litige, de sinistre, d'avocat, d'assureur ou de plainte, une publication tant que le format n'a pas ses 2-3 validations.
Seuls le dépôt dans la plateforme et la notification de l'équipe valent 3 sans annexe : ce sont des écritures internes. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Le périmètre « marketing » a son canal Slack ou Teams et ses approbateurs (`canaux_validation`, `approbateurs`) : chaque membre n'approuve que son périmètre. Les outils de validation humaine de n8n (`slackHitlTool`, `microsoftTeamsHitlTool`) sont admis dans un `gabarit-ent-*` et refusés ailleurs — le juge le vérifie avec le juge commun ; ce gabarit emploie le nœud `sendAndWait` du chemin principal, parce qu'un outil de validation ne peut garder qu'un outil de lecture (R23) et que l'agent n'écrit rien.

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `COMPTE_INSTAGRAM_DU_CLIENT`
- `ID_CHAINE_EXEMPLE`
- `ORGANISATION_DU_CLIENT`
- `PAGE_DU_CLIENT`
- `URN_PERSONNE_EXEMPLE`
Et les identifiants : Gmail/Outlook/IMAP, WhatsApp, Meta, LinkedIn, TikTok, X, YouTube, le CRM du client, l'outil de séquence, Slack ou Teams, la clé du modèle, la base de la plateforme. Un seul CRM : on garde sa branche du Switch « Quel CRM ? » et on débranche les sept autres.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Un post Instagram d'exemple, aucune validation* → 3 cartes « À valider » (Instagram, Facebook, LinkedIn) et 3 demandes Slack vers le canal du périmètre ; **aucune publication**.
- *Le format a ses 3 validations et la QA est propre* → les 3 publications partent seules.
- *Écart de la QA, ou « Presti » dans un texte* → retour en cartes, aucune publication.

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

- **sendAndWait** : le lien de réponse pointe vers n8n, qui n'est pas exposé à Internet (OUTILLAGE.md § 10) ; tant que Benj n'a pas tranché l'exposition, la carte « À valider » de la plateforme est la voie sûre, et la demande Slack ou Teams ne fait que prévenir.
- **YouTube** : le nœud ne lit pas les commentaires ; le gabarit ne lit que les vidéos et ne fait que passer en public une vidéo téléversée en privé par l'équipe.
- **Instagram** : le conteneur d'une vidéo se traite en asynchrone (attente avant la publication) : à ajouter dans la copie qui publie des vidéos. **TikTok** : la publication directe exige l'audit de l'application par TikTok ; le gabarit envoie en brouillon.
- **Après une reprise de `sendAndWait`**, le lien d'élément `$('Quel effet ?').item` utilisé par les nœuds d'approbation peut être perdu : à vérifier à l'essai dans n8n. L'approbation ne touche qu'une carte qui attend encore (`statut = a_valider`) : un clic tardif ne ressuscite pas une carte refusée. Le rôle noté est le premier de la liste du périmètre : c'est le canal de validation, propre au périmètre, qui garantit l'approbateur — pas un contrôle d'identité.
- **Commentaires** : le premier passage lit tout l'historique des dernières publications (25 Facebook, 10 Instagram) ; la copie borne par date si elle ne veut pas répondre à de vieux commentaires. Les commentaires propres de la page ne sont pas exclus.
- Une mention d'IA sur les contenus *publiés* est une décision du contrat avec le client ; ce gabarit ne l'ajoute pas (R20 ne vise que les envois à un tiers).

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-016/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-016/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-016/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-016/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
