# gabarit-ent-finance — Finance (Entreprise sur mesure)

> Fiche du gabarit, écrite par la tâche 036-018 (prompt 6, outillage, lot 5 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : `.orchestre/preuves/036-018/gabarit-ent-finance.workflow.json`.
> Département 7 du § 7 de OUTILLAGE.md : Stripe, QuickBooks, Xero ; Pennylane, Tiime, Sage (API ou export) ; Qonto en lecture. Prompt 2 : « facturier quand c'est fini, relanceur d'impayés jusqu'au paiement ou au motif, lecteur des encaissements, export au comptable ».
> **Inactif, sans identifiant, en simulation.** On le copie en `client-<slug>-<département>` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).

## Ce qu'il fait

Lit les **encaissements** (Stripe, QuickBooks, Xero, Qonto par l'API, en lecture seule), les **rapproche** des factures de la plateforme, **arrête les relances** d'une facture soldée, relance les autres au palier du retard, **facture un chantier terminé** avec le tarif du client et prépare l'**export au comptable** (un fichier). **Les montants viennent du code**, en centimes entiers ; **aucune écriture bancaire ni dans la compta du client**.

## Chemin d'un passage

1. **Entrées** : Stripe / QuickBooks / Xero (Switch « Quel outil d'encaissement ? »), Qonto, Pennylane (ce que le comptable a déjà), les factures et les chantiers terminés de la plateforme.
2. **Normaliser** (paiements en centimes) puis **Rapprocher** : le code somme les paiements d'une facture (par son numéro ou une référence libre), calcule le reste dû, le retard, le palier (1 : dès 1 jour ; 2 : dès 15 jours ; 3 : dès 30 jours) et chiffre les chantiers terminés.
3. **Porte « simulation »** : vrai → « Effets prévus ». Faux → **Rédacteur d'impayés** → revalidation.
4. **Décider les effets** : carte « marquer payée » pour une facture soldée, relance avec le **reste dû du code**, carte de facture pour un chantier terminé, indicateur des encaissements, export du mois (les trois premiers jours).
5. **Quel effet ?** → carte, facture en brouillon, relance Gmail ou Outlook (puis **Noter l'envoi**), indicateur, export (CSV → fichier → Drive ou OneDrive → mail au comptable), prévenir l'équipe → **Journaliser**.

## Les outils (nœuds réels, 74 nœuds au total)

Stripe, QuickBooks, Xero (lecture), Qonto et Pennylane (API en lecture), Convertir en fichier, Drive et OneDrive (dépôt de l'export), Gmail et Outlook (relances, envoi de l'export), Slack et Teams. **Tiime et Sage** : pas de nœud ni d'hôte admis par la garde commune ; ils passent par l'export de fichier (voir les limites).

Nœuds natifs de l'export (type et version, tirés du fichier) :
- Lire les paiements Stripe (stripe 1)
- Lire les factures QuickBooks (quickbooks 1)
- Lire les factures Xero (xero 1)
- Paiement Stripe (outil) (stripeTool 1)
- Facture QuickBooks (outil) (quickbooksTool 1)
- Facture Xero (outil) (xeroTool 1)
- Lire le fil Gmail (gmailTool 2.2)
- Lire le fil Outlook (microsoftOutlookTool 2)
- Envoyer par Gmail (gmail 2.2)
- Envoyer par Outlook (microsoftOutlook 2)
- Convertir en fichier (convertToFile 1.2)
- Drive : déposer l’export (googleDrive 3)
- OneDrive : déposer l’export (microsoftOneDrive 1.1)
- Envoyer l’export par Gmail (gmail 2.2)
- Envoyer l’export par Outlook (microsoftOutlook 2)
- Prévenir l’équipe par Slack (slack 2.7)
- Prévenir l’équipe par Teams (microsoftTeams 2)

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
- GET thirdparty.qonto.com/v2/transactions
- GET app.pennylane.com/api/external/v2/customer_invoices

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

- **Rédacteur d’impayés** — modèle `Claude : Rédacteur d’impayés`, parseur `Schéma : Rédacteur d’impayés`, outils : `Paiement Stripe (outil)`, `Facture QuickBooks (outil)`, `Facture Xero (outil)`, `Lire le fil Gmail`, `Lire le fil Outlook`.

Le **rédacteur d'impayés** lit un paiement Stripe, une facture QuickBooks ou Xero et le fil de la boîte ; il rend un objet et un texte **sans montant, sans date, sans numéro de facture** : le code ajoute « Montant restant dû : … € TTC (facture …) » après son texte. Son schéma n'a aucun champ de montant.

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : `entreprise_configuration`, `entreprise_cartes`, `entreprise_factures`, `entreprise_chantiers`, `entreprise_tarifs`, `entreprise_relances`, `entreprise_autonomie`, `entreprise_actions`
- Écrites : `entreprise_cartes`, `entreprise_factures`, `entreprise_relances`, `entreprise_indicateurs`, `entreprise_actions`
- Mises à jour : `entreprise_factures`, `entreprise_actions`, `entreprise_cartes`

`entreprise_factures` (montant, échéance, statut, date de paiement), `entreprise_chantiers` (terminés, sans facture), `entreprise_tarifs`, `entreprise_relances`, `entreprise_indicateurs`.

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

- solder_facture → voie facture_payee
- facturer_chantier → voie facture_creer
- indicateur_encaissements → voie indicateur
- export_comptable → voie export_comptable
- relance_impaye → voie courriel_ + boite
- prevenir_equipe → voie prevenir_ + config.outil_equipe

## Les voies d'effet (sortie de « Quel effet ? »)

`carte`, `facture_creer`, `facture_payee`, `courriel_gmail`, `courriel_outlook`, `indicateur`, `export_comptable`, `prevenir_slack`, `prevenir_teams`.

## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit `entreprise_autonomie` (un niveau par `type_action`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », `kit/annexe-autonomie.md`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé `…:approuvee` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (`plafond_jour`, 20 par défaut comme `PLAFOND_AUTO_JOUR`) **après la fenêtre d'annulation** (`delai_annulation_min`, 10 minutes par défaut comme le pilote automatique, `lib/pilote/regles.ts:27`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** (annexe d'autonomie, « jamais en automatique », `kit/annexe-autonomie.md`) : prendre un rendez-vous seul (`planifier_chantier`), marquer une facture payée (`solder_facture`), créer une facture (`facturer_chantier`), parler au nom de l'entreprise sur un litige ou un avis négatif (`repondre_avis_negatif`), un point mensuel ou un bilan sans la validation d'équipe, tout prix estimé.
Seules les écritures internes (notification de l'équipe, indicateurs, import contrôlé, compteur IA) valent 3 sans annexe. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).

## Organisation multi-membres (C6)

Chaque carte porte son `perimetre` et ses `approbateurs_roles`, lus dans la configuration (`perimetres`, `approbateurs`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. Les cartes de facture et de paiement vont au périmètre « finance » ; le comptable reçoit l'export à l'adresse de la configuration (`courriel_comptable`).

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

- `DOSSIER_EXPORTS_DU_CLIENT`
- `IBAN_DU_CLIENT`
- `ORGANISATION_DU_CLIENT`
- `ORGANISATION_XERO_DU_CLIENT`
Et les identifiants : Stripe ou QuickBooks ou Xero (un seul, par le Switch), Qonto (jeton en lecture), Pennylane, Drive ou OneDrive, Gmail ou Outlook, Slack ou Teams, la clé du modèle, la base de la plateforme.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

- *Un paiement lu* → F002 payée (Stripe) : soldée, plus aucune relance, une carte « marquer payée » ; F001 payée en partie (Qonto, 200 €) : reste 1 000,00 € calculé par le code (le « 999,99 » du modèle est ignoré) ; F004 déjà payée : rien ; un prix écrit par le modèle est rejeté.
- *Le facturier* → 2×100 € + 1×50 € HT = 250 € HT, TVA 50 €, 300 € TTC ; tarif inconnu ou aucune ligne : pas de facture, une carte d'information.
- *L'export* → le 2 décembre : une ligne ; les factures déjà chez le comptable ou d'un autre mois sont écartées ; le 15 : pas d'export ; le CSV porte 120,00 calculé par le code.
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

- **Marquer payée, créer une facture, rembourser** : toujours des cartes (annexe d'autonomie). Ce que le gabarit fait seul, c'est *ne plus relancer* une facture dont le paiement est lu.
- **Tiime et Sage** : l'hôte de leur API n'est pas dans la liste blanche de la garde commune (`scripts/n8n-specs-qa.mjs`, interdit à ce lot). L'export est donc un CSV générique ; le **format d'import propre à Pennylane, Tiime ou Sage est à confirmer avec le comptable**, rien n'est inventé. À valider par Benj : ajouter ces hôtes à la garde si une écriture par API est un jour voulue.
- La forme des réponses de Qonto (`transactions`, `amount_cents`) et de Pennylane (`items`, `invoice_number`) est à confirmer à l'essai de lecture ; la requête QuickBooks et les identifiants Xero aussi.
- Une facture n'est rapprochée que si son **numéro figure** dans les métadonnées du paiement (Stripe), le numéro de document (QuickBooks, Xero) ou la référence du virement (Qonto).

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : `.orchestre/preuves/036-018/depots-ouverts.md`.
- Vidéos et fiches relues : `.orchestre/preuves/036-018/videos-lues.md` ; `plans/analyse-videos.md` ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`.
- Nœuds : `.orchestre/preuves/036-018/squelettes-noeuds.json` (MCP n8n-oracle `get_node_types`, `search_nodes`) ; bonnes pratiques : `.orchestre/preuves/036-018/bonnes-pratiques-n8n.md`.
- Cadre : `plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
