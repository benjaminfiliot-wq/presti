## Ressources utilisées

- **Réseau neuronal (MCP `cerveau`)** : `regles_pour` sur « banque, compta, factures, données de clients, entreprise, alertes » → **liste vide** (aucune règle indexée sur ces mots dans la copie du vault d'Oracle). Les règles ont donc été prises à la source : `CLAUDE.md`, `.claude/rules/securite.md`, `architecture-outils.md`, `autonomie-abonnements.md`. Effet : aucune écriture bancaire ni compta, aucune donnée d'une autre organisation, marque blanche.
- **MCP `n8n-oracle`** : `search_nodes` (13 services), `get_node_types` (17 combinaisons ressource/opération), `get_workflow_best_practices` (`scheduling` lu, `human_in_the_loop` sans documentation). Effet : paramètres réels des nœuds Agenda, Outlook, ClickUp, Docs, QuickBooks, Xero, Zendesk, Google Chat, Gmail, Convertir en fichier, OneDrive, Drive ; décisions conditionnelles dans le code plutôt qu'en cron (voir `bonnes-pratiques-n8n.md`). **Lecture seule** : aucun workflow créé ni publié ; `test_workflow` non joué.
- **Dépôts de workflows** (`~/agents/depots/`) : 13 fichiers ouverts, listés avec ce qu'on en retient dans `depots-ouverts.md` (QuickBooks, Xero, ClickUp, Zendesk, Stripe→Slack, Trustpilot, relances escaladées, Pennylane, factures fournisseurs avec exceptions, assistant de réunion à agent). Effet : lecture seule sur la compta, palier de relance au code, exception → humain, lire avant de créer, API officielle plutôt que scraping, déclencheurs à webhook remplacés par la lecture à intervalle.
- **Vidéos et fiches** : `plans/analyse-videos.md` (l.533-538, 911, 1129), `fiches-videos-restructureai.md` (fiches 8 et 11, l.258-270 et 356-380), `fiches-videos.md` (l.715-726), motifs A7, A9, A14, A17, A18, B7, B8, C7, C13, D1, D3 de `premiere-reponse.md`, `docs/connaissance-videos/README.md` — détail et écarts dans `videos-lues.md`. Effet : « Ask you » avant l'envoi, « Approval Desk » avant publication, compteur de ce qui sort vers un modèle externe, avis négatif toujours à un humain.
- **Fiches de méthode** : `p5-entreprise/fiche-methode-n8n.md` (en-tête et points retenus), `fiches-depots.md` (sommaire), `kit/annexe-autonomie.md` (lu en entier : « jamais en automatique », 10 minutes, 20 par jour). Effet : `planifier_chantier`, `solder_facture`, `facturer_chantier` et les avis négatifs ne partent jamais seuls.
- **Cadre** : `outillage/OUTILLAGE.md` § 3 à 8, la tâche 036-016 (fabrique, juge, fiches) et le juge commun `scripts/n8n-specs-qa.mjs` (R1 à R23).
- **Skill `presti-verify`** : chargé. Son cycle (build, déploiement, vérification en direct) **ne s'applique pas** à ce lot (ni build, ni commit, ni push, ni réseau permis) ; ce qui en reste : aucun « c'est bon » sans sortie de commande, un juge qui prouve qu'il peut rougir (51 mutants), zéro donnée réelle.
- Non chargés, faute d'objet : skills de design, d'animation et de vidéo (aucune page ni vidéo dans ce lot) ; `security-review` et `presti-audit-attaque` (un juge dédié tient l'isolation par organisation, les identifiants, les webhooks, la marque blanche et la lecture seule de la compta).

# 036-018 — Catalogue Entreprise, seconde moitié : résumé

**Livré** : cinq gabarits `gabarit-ent-operations`, `-administratif`, `-finance`, `-apres-vente`, `-direction` (inactifs, sans identifiant, sans webhook, porte « simulation » devant chaque effet), leur fabrique, leur juge, leurs cinq fiches.

| Gabarit | Nœuds | Types distincts | Nœuds Code | Agents | Nœuds d'outil |
|---|---|---|---|---|---|
| operations | 73 | 29 | 8 | 1 | 5 |
| administratif | 79 | 25 | 9 | 2 | 5 |
| finance | 74 | 28 | 9 | 1 | 5 |
| apres-vente | 62 | 23 | 8 | 1 | 4 |
| direction | 55 | 21 | 9 | 1 | 4 |

(compteurs mesurés sur les exports, notes adhésives exclues pour les types et les outils.)

## Preuves (sorties de commande)

- `node scripts/gabarits-entreprise-2-qa.mjs` → **OK** : structure des 5 gabarits, **18 essais** verts, **51 mutants** qui font tous rougir le juge pour la bonne raison (`sortie-du-juge.txt`).
- `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/n8n-specs-qa.mjs .orchestre/preuves/036-018` → **OK**, R1 à R23 tenues sur les 5 exports (`sortie-juge-commun.txt`).
- Registre `empreintes-code.json` (R19) ; essais rejoués dans `essais-n8n.json` (horloge figée au 03/11/2026, données « Exemple. »).

Les cinq essais demandés : une attestation qui expire donne une relance prévue et un événement d'agenda ; un paiement lu arrête les relances (reste dû du code, 1 000,00 € après un acompte de 200 € lu chez Qonto) ; un avis à 1 étoile donne une carte « À valider » et une alerte, aucune publication ; un rapport du lundi aux chiffres du code (12 345 €, 8 000 €…) ; une autre organisation ne donne rien (cinq gabarits).

Les neuf mutants demandés rougissent : écriture banque/compta (3 variantes), montant du modèle (3), avis négatif publié (3), relance de document sans destinataire, organisation lue sans filtre (7), identifiant branché (2), outil d'agent qui écrit (2), « Presti » dans un message (4), nœud Agenda retiré (+ Outlook, Stripe, Qonto, Zendesk, Google Chat…).

## Décisions de conception

- **Compta et banque en lecture seule** (juge S14) ; l'export au comptable est un **fichier** (CSV → Drive/OneDrive → mail), jamais une écriture.
- **Annexe d'autonomie** : j'ai repris la fabrique de 036-016 dans l'état du 03/11 après-midi (défaut « carte à valider », fenêtre d'annulation de 10 minutes) et ajouté à la liste « jamais en automatique » `planifier_chantier`, `solder_facture`, `facturer_chantier` (annexe : prendre un rendez-vous seul, `marquer_facture_payee`, `creer_facture`) et aux types internes `indicateur_encaissements`, `compteur_ia`, `import_ligne`. Ces deux écarts sont dans `base-codes.mjs`, pas dans le fichier de 036-016.
- **« Impayé arrêté »** : le code ne relance plus une facture dont le paiement est lu ; *marquer payée* reste une carte.
- **Avis négatif / client mécontent** : sentiment = le pire du code (étoiles) et du modèle ; carte forcée + alerte ; vrai même à l'annexe niveau 3.
- **Le modèle choisit des numéros, jamais des valeurs** : créneau (opérations), priorités (direction) ; aucun montant, date, score dans un schéma (juge S6).
- **Mode privé et compteur** : en mode privé la phrase est celle du code, aucun appel externe ; le compteur écrit documents « par modèle externe » / « en mode privé » ; alerte au plafond du coût IA.
- **Validation d'équipe** : `sendAndWait` Slack et Teams sur le chemin principal (point mensuel, bilan à un mois) et outils de validation humaine de n8n branchés sur l'agent de la direction.

## Points à valider / risques

1. **Tiime, Sage, Chatwoot** : leurs hôtes ne sont pas dans la liste blanche de `scripts/n8n-specs-qa.mjs` (interdit à ce lot). Tiime et Sage passent donc par l'**export de fichier** ; Chatwoot est lu par la plateforme (événements en base) et la réponse repart par elle. **Décision de Benj** : étendre la liste blanche si une API directe est voulue.
2. **Format d'import** de Pennylane/Tiime/Sage : CSV générique, **à confirmer avec le comptable** ; rien n'est inventé.
3. **Paramètres à confirmer à l'essai de lecture** (notés dans les nœuds) : outils d'agent `get` de QuickBooks, Xero et Zendesk ; requête QuickBooks ; forme des réponses de Qonto, Pennylane, Trustpilot ; événement Outlook ; chemins Drive/OneDrive.
4. **Non joué dans n8n** : `test_workflow` impossible ici (aucun workflow créé, MCP n8n en lecture). Le rejeu est celui du **code des nœuds Code** (bac à sable `node:vm`) ; la tuyauterie entre nœuds est tenue par les règles du juge commun, pas par une exécution réelle.
5. **Tables `entreprise_*`** indicatives (équipes, pièces attendues, échéances, attestations, relances, factures, contrats, chiffres, rapports, coût IA…) : leur migration est celle du lot d'intégration 036-012, pas de ce lot.
6. **Conventions à écrire avec le client** : nommage des pièces (la référence doit se lire dans un nom de fichier ou un sujet), seuils d'avis, paliers de retard (1/15/30 jours par défaut, ≠ J+3/J+10/J+21 de l'artisan), horaires de travail.
7. La fabrique de 036-016 évolue encore : si elle change l'annexe, `base-codes.mjs` doit être refait (le juge de ce lot le dirait par ses essais).
8. Une ligne du dossier relu ne dit pas ce que la tâche lui prête : `fiches-videos.md:721` (cité par PR:167) ne parle pas de coût IA ; le compteur s'appuie sur PR:167 et la table `entreprise_cout_ia` (écart noté dans `videos-lues.md`).

## Fichiers

- Exports : `gabarit-ent-{operations,administratif,finance,apres-vente,direction}.workflow.json` ; fabrique : `gabarits.mjs`, `codes.mjs`, `base-construire.mjs`, `base-codes.mjs`, `squelettes-noeuds.json`, `fiches.mjs` ; juge : `scripts/gabarits-entreprise-2-qa.mjs`.
- Fiches : `plans/011-cadrage-01-11/p6-signature/outillage/gabarits/ent-{operations,administratif,finance,apres-vente,direction}.md`.
- Sources lues : `depots-ouverts.md`, `videos-lues.md`, `bonnes-pratiques-n8n.md`.
