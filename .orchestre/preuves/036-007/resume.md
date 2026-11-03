## Ressources utilisées

Session : hôte d'agents Oracle, sans écran, modèle Sonnet 5.5. Inventaire fait avant de produire : outil Skill, MCP `cerveau` (copie du vault du 02/11, lecture seule), MCP `n8n-oracle` (n8n local d'Oracle),
sous-agents. Les skills de design, de vidéo et de pages (presti-design, frontend-design, hyperframes…) ne servent pas ce domaine et n'ont pas été chargés ; `ecc:security-review` et `presti-audit-attaque` n'ont pas été
invoqués comme outils (aucun fichier de `app/**`, `lib/**` ni `supabase/**` n'est touché) : leurs points ont été appliqués à la main sur ce diff (aucun secret, isolation par compte, aucun texte de client dans une alerte).

- **Skill `reseau-neuronal`** : chargé en premier ; il impose `regles_pour`, puis `chercher`, puis `lire`, et interdit d'écrire dans le vault. Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** : `regles_pour` (« agents, n8n, Gmail, données client, envoi automatique : département Direction ») rend `[]` ; `chercher` (liste fermée d'alertes, coût IA par compte et plafond, page du matin l'argent d'abord)
  a rendu la ligne 7 du § 1.2 du prompt 6, la ligne « Direction » de `premiere-reponse.md` § 3.2, la fiche 25 de `fiches-compte-restructureai-lot1.md` (« l'argent déjà perdu d'abord » ouvre la page du matin), l'annexe 2 de `p3-assistant.md`
  (« le code calcule tous les montants, jamais le modèle », plafond de coût par artisan) et la note du vault « Couts IA et solde API - une seule cle, une seule panne ». Effet : l'ordre argent → priorités → cartes, le plafond du jour,
  et la règle que le coût vient du code.
- **Le prompt 6 : `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`** : partie 0 (A7, A8, A9, A10, A16, B2, D3 ; § 0.4 les connecteurs ; § 0.6 les règles qui ne bougent pas) et prompt 1 (§ 1.2 ligne « Direction de l'artisan », § 1.6 KPIs,
  § 1.7 tests). Effet : les cinq genres du chef, la liste fermée d'alertes, la page qui finit par des cartes, la compétence comme consigne ET spécification.
- **La première réponse : `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`** : § 2.1 (A7 à A10, A16), § 2.4 (D3), § 3.2 (ligne Direction : « 7 h 30 chaque jour ; lundi 8 h ; événement d'interruption », push `lib/push.ts:105`), § 3.3 (rien n'y part chez un client),
  § 4 (ligne 036-007), § 5 (décisions 1 et 2 : aucune autorisation dans n8n). Effet : le périmètre, les déclencheurs voulus, et le choix de ne rien envoyer.
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md` (« Ce qu'il faut retenir », l.17-49)** : point 2 (« En production, un parent appelle la version PUBLIÉE de l'enfant » : c'est exactement l'erreur « Workflow is not active and cannot be executed » rencontrée
  quand le chef appelait ses enfants depuis le banc : le banc appelle donc les enfants directement, le chef est essayé avec des sorties épinglées), 3 (un seul nœud final, nœud Code de contrat), 6 (idempotence = clé unique en base), 8 (« Supabase account » passe outre la RLS :
  chaque ligne lue porte `artisan_id`, un test « autre compte » par juge). **`fiches-videos.md`** § 5 (l.930-951 : ligne « Alerte » : « une liste fermée d'interruptions », « le coût affiché » ; ligne « Reporting » : « une page qui propose sans agir ; l'argent, pas l'activité »)
  et § 3.1 (le reel du 25/09). Effet : la forme de l'agent Alerte, de la page et du compteur de coût.
- **MCP `n8n-oracle`** : `get_workflow_sdk_reference`, `get_workflow_best_practices` (`notification` : prévenir l'absence d'alerte vide, une seule condition qui branche ; `triage` : un chemin par défaut, jamais de perte silencieuse, d'où la route « stop » du chef), `validate_workflow` (topologie du chef sur un
  squelette), `create_workflow_from_code` (×3), `update_workflow` (chef en place par opérations, son identifiant d'origine conservé pour le Cerveau ; appelants en liste), `test_workflow` (banc, chef avec sorties épinglées), `get_workflow_execution`, `get_workflow_details` (les exports). Aucun `publish_workflow`, aucun identifiant.
- **Les gabarits déjà construits**, relus et réutilisés tels quels : `codeEntree`, `codeSortie` et `CODE_BILAN` de `.orchestre/preuves/035-003/construire.mjs` (nœud « Contrat », empreintes du corps), `lib-rapport-hebdo` de 035-005 (son export est REJOUÉ par le juge sur la demande du chef), la structure chef / enfants / banc de 036-001 et 036-003
  (`construire.mjs`, `rapatrier.mjs`, juge `boite-n8n-qa.mjs`), le contrat de sortie du Cerveau (`presti-dep-direction` y garde son identifiant et son déclencheur). Le workflow `presti-briefing-matin` est resté intact (lecture seule, actif depuis 032-013) : ses lectures (`.orchestre/preuves/032-013/`) ont servi de modèle aux lectures prévues.
- **Le code lu, jamais modifié** : `lib/assistant/briefing.ts` (`composerPriorites` et `composerBriefing`, **exécutés** par le juge), `lib/push.ts:105`, `lib/ai.ts:428-430`, `:583-585`, `:990` (garde-fous anti-fabrication), `lib/pilote/regles.ts:27-30`, `:79-82`, `lib/email.ts:6-11`,
  `supabase/migrations/0193_systeme_agents.sql` (tables `couts_ia_appels`, `couts_ia_jour`, `competences`), `lib/plans.ts`. **Règles** : `.claude/rules/architecture-outils.md` (n8n-first), `securite.md`, `autonomie-abonnements.md`, `migration-production.md`, `CLAUDE.md`.

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant créé ou modifié

| Workflow | Id n8n | Rôle | Appelants permis |
|---|---|---|---|
| `presti-dep-direction` (le chef, rempli en place) | `oHGOyqsZGoUooxa6` | page du matin, rapport du lundi, diagnostic, aiguillage de l'alerte et du coût ; 27 nœuds | `presti-cerveau`, `presti-banc-direction` |
| `lib-alerte-liste` | `v2wfT9qB5e0LHtFI` | l'agent Alerte à LISTE FERMÉE | le chef, le banc |
| `lib-cout-ia` | `JtGOKOG1ssFP5z1u` | le compteur de coût IA par compte et par jour | le chef, le banc |
| `presti-banc-direction` | `K7lsk0lRJtH5xEOJ` | banc : dix cas fictifs | aucun (`none`) |

Fichiers : 4 exports `*.workflow.json` (rendus par `get_workflow_details`, rapatriés sans retouche par `rapatrier.mjs`, qui relit aussi les réponses trop grosses rangées dans un fichier par le harnais), `empreintes-code.json` (empreintes SHA-256 de tous les nœuds Code, R19),
`essais-n8n.json` (3 essais n8n), `construire.mjs` (la fabrique : contrats, nœuds Code, fixtures, programmes SDK), `plans/011-cadrage-01-11/p6-signature/contrats/direction.json`, `scripts/direction-n8n-qa.mjs`, les 7 compétences de
`plans/011-cadrage-01-11/p6-signature/competences/`. Chaque enfant : *Execute Workflow Trigger* → « Contrat d'entrée » (gabarit 035-003) → « Entrée conforme ? » → « Porte simulation » → logique → « Contrat de sortie » (seul nœud final) ; hors simulation, « Hors simulation : non branché » arrête tout.
Réglages de tous : `errorWorkflow` = `lib-erreur-commune` (`yekMM9ewk03F9y2q`), `Europe/Paris`, succès non sauvés. Aucun nœud réseau, aucun nœud Supabase, aucun nœud d'envoi, aucun nœud de modèle : **le code compte, le modèle ne compte rien**.

## Ce que fait chaque workflow

- **La page du matin** (genre `matin`) : lit (passé par l'appelant, jamais lu ici) les impayés, devis envoyés, demandes sans réponse, stock sous le seuil, cartes « à valider » et ce qui y figure déjà. **Bloc 1, l'argent** : impayés échus (nombre et euros), devis à signer sans réponse depuis 7 jours ou plus, demandes sans
  réponse (un nombre, jamais un montant) ; **bloc 2, trois priorités** : copie figée de `composerPriorites` (`lib/assistant/briefing.ts:134`), comparée au vrai code ; **bloc 3, les cartes** (10 au plus). Elle **se termine par les cartes**, `dernier_bloc: 'cartes'`, aucun bloc d'action. Chaque ligne porte `source` et `date` ;
  une lecture en erreur se dit « non lus (lecture en erreur), rien n'est affirmé » et ne devient jamais un zéro. Aucun nom de client (R7) : les textes sont ceux du code avec un client absent (« Un client vous doit 1 841 € »), l'interface résout les noms. Effets prévus : `deposer_page`, `noter_evenement` (comptes seulement).
- **Le rapport du lundi** (genre `lundi`) : quatre chiffres en euros, chacun avec sa source, sa date et sa confiance : encaissé, devis signés, **devis signés après une relance antérieure** (une relance n'est créditée que si elle précède la signature, A10), impayés en cours. Aucun mot de gain, d'économie, de rentabilité (`GAIN`) ;
  une base de départ qui en contient, un indicateur hors de la liste fermée de `lib-rapport-hebdo`, une base sans source ou sans date : rapport REFUSÉ. Il prépare la demande `lib-rapport-hebdo@1` (comptes d'actions) ; le juge exécute l'export de `lib-rapport-hebdo` sur cette demande.
- **Le diagnostic** « où perdez-vous de l'argent ? » (A16) : deux étages (la demande, puis la vente), les nombres lus, rien d'autre ; zéro demande et zéro devis (ou rien de lu) : « Pas encore de données », sans aucun chiffre ; un bloc non lu est « non disponible », jamais un zéro ; aucun seuil inventé, aucun « estimé ».
- **L'agent Alerte `lib-alerte-liste`** (A8) : **liste fermée de sept types**, chacun avec son responsable — `demande_de_prix_ferme`, `client_mecontent`, `litige`, `message_urgent_tard`, `impaye_au_dessus_du_seuil` (artisan) ; `workflow_en_panne`, `cout_qui_derive` (Benj). Tout autre type est **ignoré et compté**, jamais transmis.
  L'artisan n'est réveillé que par ce dont il est le responsable, **jamais entre 21 h et 7 h** (Paris) sauf un message urgent reçu tard, dans la limite du plafond du jour (5 par défaut) ; le reste est reporté à la page du matin (`reportees_au_matin`). Une alerte déjà envoyée (clé) ne repart pas. Le texte est fixe (titre, corps, lien), sans nom ni phrase de client.
  Envoi **prévu** par push (`lib/push.ts:105`, `envoyerPushArtisan`), jamais fait ; Benj par `lib-alerter@1` (catégories `workflow_en_panne` et `cout_qui_derive`, qui existent déjà).
- **Le compteur `lib-cout-ia`** (D3, A14) : pour un compte et un jour de Paris, additionne le cumul déjà en base (`couts_ia_jour`) et les appels nouveaux (`couts_ia_appels`, clé unique, « on conflict do nothing »), en millièmes de centime, arrondi **au centime supérieur par groupe département × modèle** comme la colonne générée de 0193.
  **La part envoyée à un modèle externe est comptée à part** (`externe_centimes`, `part_externe_pct`). Un appel **sans tarif daté** est compté mais son coût reste inconnu (jamais un zéro ni un coût inventé, dit dans la ligne). Plafond du jour atteint : événement `plafond_cout_atteint` et alerte ; dérive (au-delà de +50 % de la moyenne des jours précédents, avec un minimum de
  3 jours de base et un plancher d'un euro) : alerte `cout_qui_derive`. Les deux alertes passent **par `lib-alerte-liste`**, donc par la liste fermée.
- **Le chef** aiguille (`Aiguiller` : interrupteur général et de département ouverts, sinon route « stop » ; un événement `page_du_matin` sans genre vaut « matin », la seule route que le Cerveau connaît), prépare les enveloppes des enfants et **habille** leurs sorties. Le plafond de coût du jour n'est jamais inventé : absent, la route « coût » s'arrête.

### Studio et Signature
Rien n'y part chez un client : la page, le rapport, le diagnostic et le coût sont internes ; seule l'alerte réveille, par push, l'artisan (ou Benj). Studio et Signature se comportent donc de la même façon ici ; les cartes de la page restent « à valider » dans les deux offres, y compris celles de `OUTILS_JAMAIS_AUTO` (`lib/pilote/regles.ts:79-82`).

## Les essais réels dans n8n (`test_workflow`, données épinglées, rien d'écrit)

- `presti-banc-direction` #554 : dix cas, tous rendus par n8n (page du matin, page sans lecture, rapport du lundi, diagnostic sans puis avec données, interrupteur coupé → `rien_a_faire`, alertes du jour, alertes de nuit, coût qui dérive, plafond atteint) ; `defauts: 0` au bilan hors ligne.
- `presti-dep-direction` #565 (chaîne alerte) et #573 (chaîne coût → dérive → liste fermée → alerte Benj) : sorties des enfants épinglées (le chef, essayé en manuel, ne peut pas appeler un enfant non publié à deux niveaux depuis un appel intégré : « Workflow is not active and cannot be executed », fiche-méthode point 2) ; le juge vérifie que **chaque sortie épinglée est exactement
  celle de l'export appelé, rejoué hors ligne** (P3). Écartés : banc #540 (joué avant que le banc appelle les enfants directement), chef #571 (pin de l'alerte avec une faute de frappe, rejoué en #573).
- Détail honnête : le réglage `onError` des trois appels d'enfants du chef a été posé **après** ces deux essais (réglage de nœud, sans effet sur les sorties) ; les exports sont ceux d'après.
- Rejeu hors ligne par le juge : les 10 appels du banc et les deux essais du chef sont identiques, sortie par sortie, à ceux de n8n.

## La comparaison au code (`lib/assistant/briefing.ts`)

Le juge **exécute** `composerPriorites` et `composerBriefing` (processus à part, `--experimental-strip-types`) sur les mêmes lignes lues : les 3 priorités (clé, objet, famille, montant, lien, texte, détail) et le nombre « autres » du chef sont **identiques** au vrai code, sur la page complète ; les comptes d'impayés échus et de devis sans réponse sont ceux de `composerBriefing().chiffres`. Les lignes de montants (cents) sont refaites
dans le juge par un calcul indépendant. Le texte diffère du code en un seul point voulu : le séparateur de milliers (espace simple, au lieu de l'espace fine insécable de `toLocaleString('fr-FR')`) ; le juge normalise les espaces avant de comparer.

## Le juge `scripts/direction-n8n-qa.mjs` et ses mutants

Sortie : `OK`, **33 mutants** qui rougissent chacun pour sa raison, dont les six demandés : un chiffre sans source (M4), un chiffre de gain (L4), une alerte hors liste (A1), une page qui finit par une action (M3), un coût calculé par le modèle (S3 : nœud de modèle ; K1 : coût inventé pour un appel sans tarif), un diagnostic estimé sans données (D1).
Et aussi : la page sans l'argent d'abord, une base de départ de gain acceptée, un zéro inventé pour un bloc non lu (page M6, diagnostic D3), l'isolation par compte retirée (page, alerte, coût), un appel doublé, la part externe fondue dans le total, un plafond jamais atteint, une relance faite après la signature créditée, le plafond d'alertes ignoré, les heures calmes ignorées, une alerte déjà
envoyée qui repart, l'interrupteur ignoré, un nom de client dans un push, l'alerte de coût qui contourne la liste fermée, la porte « simulation » contournée, un workflow publié, un identifiant, un appelant `any`, un nœud HTTP, un nœud d'envoi, le gabarit « Contrat » affaibli, un octet changé dans un nœud Code, un échec d'enfant qui fait échouer le banc.
Un juge qui fabrique ce qu'il vérifie ne prouve rien : la liste fermée du plan (A8) est écrite dans le juge, indépendamment du code ; l'arithmétique du coût et les euros du rapport sont refaits ici ; les priorités viennent du vrai code ; la demande de rapport est jugée par l'export de `lib-rapport-hebdo` ; 300 événements tirés au hasard (graine fixe, trois heures différentes) ne sortent jamais de la liste fermée.

## Les compétences (A4, B2) — `plans/011-cadrage-01-11/p6-signature/competences/`

Sept brouillons, un par département (`accueil`, `devis`, `suivi`, `facturation`, `apres`, `operations`, `direction`), **inactifs** (`actif: false`, `statut: brouillon`, `pose_par: presti`), au format de la table `competences` de 0193 (clé, titre ≤ 120, corps ≤ 8 000 caractères, version 1). Chacune : quand l'agent s'en sert, un pas-à-pas, le ton de l'artisan, les garde-fous
anti-fabrication de `lib/ai.ts` (prix, délais, créneaux, fournisseurs ; `lib/ai.ts:428-430`, `:583-585`, `:990`), la marque blanche (`lib/email.ts:6-11`), ce qui part seul et ce qui attend, la spécification du workflow. Le juge les lit : en-tête, sections, garde-fous, aucune adresse ni aucun téléphone, jamais le nom de la plateforme dans un texte qui pourrait partir chez un client.
Elles ne sont posées en base par personne : la table n'existe pas tant que Benj n'a pas collé 0193.

## Risques et points à valider

1. **Le Cerveau ne connaît qu'une route vers la Direction** (`page_du_matin`, `construire.mjs` de 036-001, table `ROUTES`) : `rapport_du_lundi`, `diagnostic_a_faire`, `alerte_a_evaluer` et `cout_ia_du_jour` sont à y ajouter (une ligne chacune) par la session principale ; et le Cerveau n'envoie pas encore les blocs de lecture (`matin`, `lundi`…) au chef, qui répond alors `lecture_absente` (dit, non inventé : contrôle C4 du juge). Les lectures réelles prévues sont écrites dans `contrats/direction.json`
   (`lectures_reelles_prevues`), sans nom ni texte de client.
2. **Le plafond de coût du jour est calculé et alerté, mais personne ne le fait encore respecter** : `lib-executer` (ou le Cerveau) devra refuser un appel de modèle une fois `plafond_cout_atteint` noté. Tant que ce n'est pas branché, c'est une alerte, pas un frein.
3. **`lib-journaliser` n'a pas les champs du compteur** (département, `externe`, clé d'appel) : sa ligne d'appel (`modele`, jetons, `cout_eur`, `source_tarif`) est complète, mais la ligne `couts_ia_appels` suppose que l'appelant ajoute ces trois champs au moment du branchement réel. Rien n'est écrit en base ici.
4. **Les effets `deposer_page`, `deposer_rapport` et `deposer_diagnostic` n'ont pas de table cible** : la page contient des textes pour l'artisan, qu'une table `evenements_metier` (faits sans texte) ne peut pas porter. Choix à faire par 036-011 (soit l'interface recalcule la page par le même code, soit une table dédiée) ; décision non prise ici.
5. **Aucune publication ni aucun appel réel** : `lib-rapport-hebdo`, `lib-alerter` et `lib-journaliser` ne sont pas appelés par le chef (leur liste d'appelants ne le contient pas, et ils sont hors périmètre) ; le chef prépare leurs enveloppes et le juge les rejoue. À brancher au « go » de Benj, enfants publiés d'abord.
6. **Les seuils sont des défauts écrits dans le chef** (dérive +50 %, 3 jours de base, plancher d'un euro, 5 réveils par jour, heures calmes 21 h-7 h, devis sans réponse à 7 jours comme `briefing.ts:35`) : à confirmer par Benj ; le seuil d'impayé et le plafond de coût du jour, eux, ne sont jamais inventés (absents, l'alerte d'impayé et la route « coût » se taisent).
7. **Le tarif d'un appel** doit avoir une date (`AAAA-MM-JJ`) pour compter : sinon l'appel est compté, son coût reste « inconnu » (visible dans la ligne). Les tarifs réels des modèles ne sont posés nulle part ici.
8. **Le juge n'est pas encore au lanceur** (`scripts/tout-verifier.mjs` hors périmètre) : c'est le lot 036-012 (« aucun juge n8n hors `SUITES` ni `HORS_LANCEUR` »).

## Gestes préparés pour Benj, jamais faits

Coller 0193 (et 0185, 0192 avant) puis lever `systemeAgents` ; publier `lib-cout-ia`, `lib-alerte-liste`, puis `presti-dep-direction`, puis le Cerveau ; ajouter les routes du Cerveau (point 1) ; fournir les lectures réelles du chef (avec `select=` limité et le filtre `artisan_id`) ; confirmer les seuils (point 6) ; activer les compétences, une par une, après relecture.

## Résultat de la commande `verifier`

Voir `verifier.log`. Vert : `direction-n8n-qa` (33 mutants), `briefing-n8n-qa` (intact), `lib-socle-n8n-qa`, `lib-metier-n8n-qa`, `lib-relance-n8n-qa`, `n8n-specs-qa` sur les quatre exports (R1 à R20 pour `lib-*`, R1 à R7 pour le chef et le banc).
