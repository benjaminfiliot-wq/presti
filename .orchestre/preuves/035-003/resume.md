## Ressources utilisées

- **Inventaire de la session** (hôte d'agents Oracle, sans écran) : outil Skill (aucun skill n8n dans la liste ; les skills de design, de vidéo et d'animation ne servent pas ce domaine) ; MCP `cerveau` (lecture seule ici), MCP `n8n-oracle` (n8n local d'Oracle, 2.45.7). Les autres connecteurs (Supabase, Vercel, Slack, Gmail…) sont hors périmètre ou interdits par la tâche : pas un appel.
- **Skill `reseau-neuronal`** : chargé avant de produire. Il fixe l'ordre `regles_pour` puis `chercher` puis `lire`, et l'interdit d'écrire dans le vault (copie du 02/11). Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`, `regles_pour`** (« offre entreprise, n8n ») : rend `[]`, aucune règle propre. D'où les deux lectures suivantes.
- **MCP `cerveau`, `lire` : ADR-008** (`vault/10 Presti/04 Décisions/ADR-008 — n8n-first…`) et **ADR-001** (§ Décision). Ce qu'ils changent : toute la logique du socle vit dans n8n, et rien dans l'app (aucun fichier `app/**` ni `lib/**` touché). Le pas « testé en dry-run » de l'ADR-001 donne la porte « simulation » de chaque gabarit, et l'arrêt qui la suit hors simulation.
- **MCP `n8n-oracle`, `get_workflow_sdk_reference`** (sections `patterns`, `rules`, `guidelines`, `functions`) : la forme `ifElse().onTrue().onFalse()`, les `expr()`, les réglages posés dans `workflow(id, nom, { settings })`. Le SDK refuse les fonctions fléchées hors des chaînes, ce qui a fait réécrire le banc en clair (`sdkBanc`, `construire.mjs`).
- **MCP `n8n-oracle`, `get_workflow_best_practices`** sur `monitoring` (pas de fiche), `notification` (une seule condition puis des canaux en parallèle, une alerte agrégée plutôt que N, un journal des envois), `data_persistence` (pas de doublon : clé unique ou upsert). D'où trois choix : `lib-alerter` regroupe, `lib-dedoublonner` laisse la garde à la contrainte unique, `lib-journaliser` pose une clé par ligne.
- **MCP `n8n-oracle`, `search_nodes` et `get_node_types`** sur Execute Workflow Trigger 1.3, Stop and Error 1, Execute Sub-workflow 1.4, Code 2, If 2.4. On en tire les noms exacts : `inputSource: passthrough`, `errorType`/`errorMessage`, `source: database`, `workflowId.__rl`, `waitForSubWorkflow`.
- **MCP `n8n-oracle`, `validate_workflow`, `create_workflow_from_code`, `update_workflow`, `test_workflow`, `prepare_workflow_pin_data`, `get_workflow_execution`, `get_workflow_details`, `search_workflows`** : création des 7 workflows, réglages des appelants et étiquettes, 10 exécutions sur données épinglées (363 à 377), 7 exports. Aucun `publish_workflow`, aucun identifiant.
- **Sources du dépôt** : `plans/011-cadrage-01-11/p5-entreprise/premiere-reponse.md` (ligne 035-003 du tableau ; § 4.3 à 4.6 ; § 5.5 et ses contrats `enveloppe@1` ; Amendement B1, sans effet sur ces six gabarits : la liste « jamais en automatique » vit dans `lib-porte-conformite`, 035-005) ; `fiche-methode-n8n.md` § 3.3 (le contrat de chaque enfant : « Un écart rend `statut: rejete` et une entrée de journal ») et § 3.6 (disjoncteur, battement, « Une alerte par panne ») ; `scripts/n8n-specs-qa.mjs` et ses trois exports fictifs (035-001), que mes exports devaient passer ; `.orchestre/preuves/032-033/resume.md` (n8n refuse, par `update_workflow`, de désigner un workflow d'erreur non publié ; vu ici : à la création, le réglage est accepté) ; `scripts/garde-commit.mjs:15-28`, pour qu'aucune fausse clé des cas ne bloque un commit.
- **Fiches vidéo et dépôts** (`fiches-videos.md`, `fiches-depots.md`, `docs/connaissance-videos/`) : survolées par 035-001, elles n'ajoutent aucune règle à ce socle. Seule `fiches-depots.md:86` (« aucun workflow d'erreur désigné ») compte ici : chaque enfant désigne `lib-erreur-commune`.

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Couche (étiquettes) | Rôle |
|---|---|---|---|
| `lib-erreur-commune` | `yekMM9ewk03F9y2q` | `lib`, `couche-erreurs` | Error Trigger → Diagnostic (7 catégories, masquage) → porte → effets prévus (journal, alerte, compteur) → Contrat de sortie |
| `lib-dedoublonner` | `MnNHht0kG7S6ehDV` | `lib`, `couche-decision` | Clé (organisation, type, objet, étape), condensée au-delà de 80 caractères ; « déjà fait » si connue |
| `lib-journaliser` | `NQg0KDXIa5hhzAvq` | `lib`, `couche-journal` | Une ligne par entrée, une clé par ligne ; en simulation, « aurait été fait » ; coût sans source remis à null |
| `lib-alerter` | `meYNTqcDsMzcFjdr` | `lib`, `couche-alerte` | Texte minimal ; une alerte par organisation, workflow et catégorie en 5 min glissantes |
| `lib-disjoncteur` | `zmmR9U9S0gc3X6tC` | `lib`, `couche-erreurs` | Coupé après N échecs de suite ; un succès remet à zéro ; réarmé à la main seulement |
| `lib-battement` | `XwjyA6PFjzlI2vpd` | `lib`, `couche-supervision` | « battre » ; « contrôler » : un parent muet depuis 26 h donne une seule alerte |
| `lib-banc-socle` | `rAAqj7NSVJoA3grm` | `lib`, `couche-essai` | Banc d'essai : seul appelant permis des cinq enfants tant qu'aucun parent `ent-*` n'existe (035-007) |

**Réglages, sur chacun** (relus par `get_workflow_details`, posés dans le code SDK) :
- `active: false` et `activeVersionId: null` ;
- `timezone: Europe/Paris`, `executionTimeout` de 60 s (120 s pour le banc) ;
- `saveDataSuccessExecution: none`, `saveDataErrorExecution: all` ;
- les cinq enfants : `errorWorkflow: yekMM9ewk03F9y2q` (`lib-erreur-commune`), `callerPolicy: workflowsFromAList`, `callerIds: rAAqj7NSVJoA3grm` (le banc) ;
- `lib-erreur-commune` et le banc : `callerPolicy: none`. `lib-erreur-commune` ne désigne aucun workflow d'erreur : il est celui des autres.

**Mode A, sans base ni envoi.** Aucun nœud de lecture, d'écriture ou d'envoi, aucun identifiant : le juge le vérifie (S2). Les tables du journal, du disjoncteur et du battement « naissent avec la configuration par organisation, au go de Benj » (PR § 5.5). Les clés connues et les états précédents sont donc fournis par l'appelant ; en mode A, ils sont épinglés. Tout l'état prévu part dans `effets_prevus`. La sortie « faux » de chaque porte mène à un Stop and Error, « Hors simulation : non branché » : hors simulation, rien n'est atteignable. L'effet réel se branchera derrière cette même porte, avec sa table.

## Le gabarit de nœud « Contrat »

C'est un gabarit de **nœud Code**, et non un sous-workflow (PR § 5.5, 1re ligne). Il est écrit dans `construire.mjs` (`CORPS_ENTREE`, `CORPS_SORTIE`).

- **« Contrat d'entrée »** : deux lignes propres à l'enfant (`const CONTRAT = '<nom>@1'` et `const SCHEMA = {…}`), un repère, puis un corps commun. Ce corps valide l'`enveloppe@1` : les 7 clés, aucune en trop, `contrat` imposé, `organisation_id` en UUID, `simulation` booléen, `cle_idempotence` de 1 à 80 caractères, `trace` complète. Il valide aussi `config` et `donnees` contre le schéma du gabarit : types, `required`, `additionalProperties: false`, `enum`, `const`, `pattern`, `format` (uuid, date-heure), tailles, `maxItems`. Avec `sans_contact`, une adresse e-mail ou un téléphone font rejeter l'entrée.
  - Hors contrat, la sortie est `conforme: false`, avec la simulation forcée à vrai. Les valeurs fautives ne sont jamais recopiées dans les erreurs : seul le chemin du champ l'est.
  - `Entrée conforme ?` envoie alors l'élément droit au « Contrat de sortie » : statut `rejete`, une ligne de journal `contrat_rejete`, aucun effet (FM § 3.3).
- **« Contrat de sortie »** : une ligne propre (`CONTRAT`), puis le corps commun. Il rend exactement les 9 clés de la sortie, `effets_faits` toujours vide en simulation, et `statut` dans l'énumération.
- **Empreintes du corps commun**, tenues par le juge (S5), identiques dans les cinq enfants (et dans `lib-erreur-commune` pour la sortie) :
  - entrée : `20f6ff371969130e45b37ea58466baaa9b4581f7dbe145863a2f4a1a57713899` ;
  - sortie : `8f0f37c68d78f3154204655b3f5343889c5c74733c8b852f27e34bc517394a70`.
- **Le déclencheur est en `passthrough`, et non en champs déclarés** (FM § 3.3 demandait sept champs déclarés). Raison : des champs déclarés laisseraient n8n jeter les clés en trop et mettre `null` à la place des manquantes avant le contrat. Le gabarit ne verrait alors ni l'intrus ni l'absence. En `passthrough`, c'est le contrat qui rejette, et le juge le prouve (C2 : « champ en trop dans l'enveloppe »). À valider par Benj (point 4 plus bas).

## Chaque `lib-*` : contrat, essai sur données épinglées, test qui rougit

Les contrats suivent l'`enveloppe@1` et les blocs `donnees`, `config` et `resultat` de PR § 5.5. Les champs marqués « mode A » sont des **ajouts facultatifs** : l'état qu'une table fournira plus tard, épinglé en attendant. Aucun ne contredit un champ obligatoire.

### `lib-erreur-commune` (`yekMM9ewk03F9y2q`) — contrat `lib-erreur-commune@1`
- **Entrée** : l'objet de l'Error Trigger (`execution.{id,url,error,lastNodeExecuted,mode}` et `workflow.{id,name}` ; `trigger.error` à la place si le déclencheur a échoué).
- **Sortie** : `resultat { categorie ∈ {authentification, quota, delai, reseau, entree_invalide, expression, execution}, message_masque ≤ 300, etape_suivante }`. `effets_prevus` reprend la forme exacte des contrats de `lib-journaliser`, `lib-alerter` (vers `benj` : `slack:#presti-auto` et `telegram:benj`) et `lib-disjoncteur` (pour un `ent-*` ou un `lib-*` seulement).
- **Masquage** : adresses, jetons porteurs, clés (`sk-`, `sb_`…), `token=`, liens, UUID, IBAN, téléphones, nombres de 6 chiffres et plus, longues citations. Le message brut ne sort jamais du nœud Diagnostic.
- **Essai n8n 377** (9 objets d'erreur fictifs) : les 7 catégories exactes. Le message chargé sort ainsi : « NodeApiError Exemple. Échec pour [adresse masquée], Bearer [masqué] cle [clé masquée] tél [téléphone masqué] IBAN [compte masqué] sur [adresse web masquée] « [texte masqué] » ». L'échec d'un déclencheur est diagnostiqué, avec la clé `err:AbCdEf123456:declencheur`. `presti-detecteurs` ne reçoit pas de compteur.
- **Ce qui le fait rougir** : E1 (catégories), E2 (fuites), E3 (déclencheur), E4 (rien fait, tout prévu), E5 (ses effets passent le contrat des gabarits qui les recevront).
- **Il ne remplace pas `presti-erreurs`**, publié et intouchable : il n'est désigné que par les `lib-*`.

### `lib-dedoublonner` (`MnNHht0kG7S6ehDV`) — `lib-dedoublonner@1`
- **Entrée** : `donnees { type (a-z0-9_-, ≤ 40), objet_id (uuid), etape (≤ 40) }`, plus en mode A `config.cles_connues[]`.
- **Sortie** : `resultat { cle ≤ 80, deja_fait }`. La clé brute est `org:type:objet:etape` ; au-delà de 80 caractères, `h:<type>:<48 hex du SHA-256>`. Le SHA-256 est écrit à la main, sans module (R19), et le juge le compare à `node:crypto` (S6). Effet prévu : `reserver_cle`. La vraie garde reste la contrainte unique à l'écriture (`lib-executer`, 035-005).
- **Essai n8n 363** (lot de 4) : deux clés neuves ; le doublon du même lot donne `deja_fait: true` et aucun effet ; l'entrée porteuse d'une adresse est rejetée.
- **Essai n8n 376** (`simulation: false`) : arrêt sur « Hors simulation : non branché », « Calculer la clé » jamais atteinte.
- **Ce qui le fait rougir** : D1 (« le rejeu du même lot donne zéro doublon », p5:316), D2, D3 (≤ 80, stable), D4 (sépare les organisations et les étapes).

### `lib-journaliser` (`NQg0KDXIa5hhzAvq`) — `lib-journaliser@1`
- **Entrée** : `donnees.entrees[]` (200 au plus), au schéma de PR § 5.5, sans aucun champ en plus.
- **Sortie** : `resultat { ecrites }`. `journal` porte les lignes : en mode A, le journal est la sortie de l'exécution et l'export. Chaque ligne a sa clé `j:<48 hex>:<i>`, stable au rejeu. En simulation, la décision commence par « [simulation] aurait été fait : ». Un coût sans `source_tarif` est remis à `null`, avec un avis. Effet prévu : `inserer_journal`.
- **Essai n8n 371** : 3 lignes, dont un coût ôté (« entrée 1 : coût sans source de tarif, remis à null ») et un coût gardé (0,12 avec sa source). Une entrée déclarée « réelle » dans une enveloppe en simulation reste en simulation. Le lot porteur d'une adresse est rejeté.
- **Ce qui le fait rougir** : J1 (chaque chemin écrit sa ligne), J2, J3 (plus de 200 entrées, ou une adresse).

### `lib-alerter` (`meYNTqcDsMzcFjdr`) — `lib-alerter@1`
- **Entrée** : `donnees { categorie (8 valeurs), workflow, lien_execution|null, destinataire_role, survenue_le (mode A) }`, plus en mode A `config.alertes_recentes[]`.
- **Sortie** : `resultat { envoyee: false en simulation, regroupees }`. Le texte n'est fait que du libellé de catégorie, du nom de workflow (forme `lib|ent|gabarit|presti-…`, sinon « workflow hors liste ») et du lien d'exécution s'il a la forme exacte `…/workflow/<id>/executions/<n>`. Effet prévu : `envoyer_alerte`.
- **Essai n8n 372** : 10 pannes de 12:04:30 à 12:05:24, à cheval sur deux fenêtres fixes de 5 min, donnent **une seule** alerte, « [Workflow en panne] ent-exemple-relance · exécution : http://localhost:5679/workflow/AbCdEf123456/executions/412 · 10 occurrences en 5 min ». Les 9 autres ressortent `rien_a_faire`. La catégorie « coût » donne sa propre alerte, et son lien porteur d'un faux jeton est ôté : « [Coût qui dérive] ent-exemple-relance ».
- **Ce qui le fait rougir** : A1 (« 10 erreurs en une minute donnent une seule alerte »), A2 (nouvelle catégorie, 6 min plus tard, envoi récent), A3 (aucun secret ni nom libre dans le texte).

### `lib-disjoncteur` (`zmmR9U9S0gc3X6tC`) — `lib-disjoncteur@1`
- **Entrée** : `config { seuil 1..20 }`, `donnees { agent (ent|lib-…), issue }`, plus en mode A `donnees.etat_precedent`.
- **Sortie** : `resultat { etat, echecs_consecutifs }`. Effets prévus : `maj_disjoncteur`, et `alerter` (`disjoncteur_ouvert`) une seule fois, au passage de fermé à ouvert.
- **Essai n8n 373** : quatre échecs donnent fermé, fermé, ouvert (avec l'alerte), ouvert (sans nouvelle alerte). Une autre organisation reste fermée, à 1. Un succès sur un disjoncteur ouvert le laisse ouvert et remet le compteur à 0 : le réarmement se fait à la main.
- **Ce qui le fait rougir** : K1 (« N+1 échecs coupent l'agent »), K2 (« un succès remet le compteur à zéro »), K3, K4.

### `lib-battement` (`XwjyA6PFjzlI2vpd`) — `lib-battement@1`
- **Entrée** : `donnees { workflow, passe_le }`, plus en mode A `operation ∈ {battre, controler}`, `battements[] { workflow, dernier_le, alerte_levee_le }` et `config.silence_max_h` (26 par défaut).
- **Sortie** : `resultat { ecrit: false en mode A, … }`. Effets prévus : `ecrire_battement`, ou bien `alerter` (`battement_absent`) et `noter_alerte_levee`.
- **Essai n8n 374** : le battement est prévu. Au contrôle de trois parents : le muet depuis 26 h donne 1 alerte ; le vivant (25 h), rien ; le muet déjà signalé après son dernier battement, rien.
- **Essai n8n 375** (`simulation: false`) : arrêt avant « Battre ou contrôler ».
- **Ce qui le fait rougir** : B1, B2 (25 h : rien ; 26 h : une alerte), B3 (contrôlé toutes les heures de 26 à 30 h : une seule alerte ; un nouveau silence après un battement réalerte).

### Le banc `lib-banc-socle` (`rAAqj7NSVJoA3grm`) — essai n8n 365
Il appelle pour de vrai les cinq enfants, non publiés, en source `database`, avec la politique « en liste ». Bilan sans défaut :
- `lib-dedoublonner@1` : 2 ok, 1 rien à faire ;
- `lib-journaliser@1` : 1 ok ;
- `lib-alerter@1` : trois pannes en une minute donnent 1 alerte et 2 regroupées ;
- `lib-disjoncteur@1` : 3 ok ;
- `lib-battement@1` : 1 ok, une alerte.

Sous-exécutions 368 et 370, entre autres. `defauts: 0`.

## Les juges

- `scripts/lib-socle-n8n-qa.mjs`, hors ligne, rejoue tels quels les nœuds Code des exports (`node:vm`), en suivant leurs connexions. Puis il rejoue les **8 essais réels de n8n** (`essais-n8n.json`) et exige la même sortie (N1). Sortie complète plus bas : **OK, 35 mutants, 35 rouges**.
- `scripts/n8n-specs-qa.mjs .orchestre/preuves/035-003` (juge commun, 035-001) : les 7 exports tiennent R1 à R20, et les 88 mutants du juge restent rouges. **OK.** Le registre `empreintes-code.json` (R19) est fabriqué par `rapatrier.mjs` depuis les exports.
- **Provenance** : exports et essais sont recopiés par `rapatrier.mjs` depuis le journal du harnais (les réponses brutes du MCP), sans retouche. On n'ôte que `scopes`. Rien n'a été retapé.

## Fichiers (12, budget 14)

`scripts/lib-socle-n8n-qa.mjs` ; dans `.orchestre/preuves/035-003/` :
- `construire.mjs`, la fabrique du code des nœuds et du SDK ;
- `rapatrier.mjs` ;
- `resume.md` ;
- `essais-n8n.json` et `empreintes-code.json` ;
- les 7 `*.workflow.json`.

`avant.txt` et `decisions-avant.md` ont été posés par `orchestre.mjs`. Aucun fichier `app/**`, `lib/**`, `scripts/n8n-specs-qa.mjs` ni vault n'a été touché. Rien n'a été commité, poussé, construit, migré ou publié, et aucun identifiant n'a été créé ou modifié.

## Risques et points à valider

1. **Le workflow d'erreur désigné n'est pas publié.** Les cinq enfants et le banc désignent `lib-erreur-commune`, inactif et jamais publié : n8n a accepté le réglage à la création. Tant qu'il n'est pas publié, une panne de production d'un enfant ne déclenchera rien. Sa publication, et la preuve par une exécution de production d'un workflow fictif (PR § 5.5), attendent le « go » de Benj, avec l'identifiant Telegram dans n8n (geste de Benj).
2. **Les tables manquent.** Journal, disjoncteur, battement, clés réservées : chaque effet réel est un Stop and Error derrière la porte. Les brancher demande la migration de la configuration par organisation, au « go » de Benj (migration-production.md : on colle, puis on lève).
3. **Les appelants permis se limitent au banc.** `ent-exemple-parent` et les chaînes (035-007) devront s'ajouter à `callerIds`. Le banc s'archive quand rien d'autre ne l'utilise (PR § 7.2, A2).
4. **À trancher par Benj** :
   - le déclencheur en `passthrough` au lieu de sept champs déclarés (raison plus haut) ;
   - la fenêtre glissante de 5 min plutôt qu'une fenêtre fixe (dix pannes à cheval sur deux fenêtres fixes donneraient deux alertes) ;
   - la forme condensée des clés, `h:<type>:<48 hex>` ;
   - `executionTimeout` de 60 s ;
   - les champs facultatifs du « mode A » ajoutés aux contrats.
5. **`lib-socle-n8n-qa.mjs` n'est pas dans `SUITES`** (`scripts/tout-verifier.mjs`), pas plus que `n8n-specs-qa.mjs`. Le lanceur est hors de mon périmètre : c'est à la session principale de l'y inscrire (hors ligne, environ 1 s, sans IA).
6. **Une observation, hors périmètre** : à mon premier relevé (`search_workflows`, vers 21 h 05 UTC), `presti-detecteurs` et `presti-briefing-matin` étaient inactifs. Au dernier relevé (vers 21 h 35 UTC), ils sont `active: true`, `updatedAt` inchangé (20:40 UTC). Je ne les ai ni publiés ni touchés : un autre acteur l'a fait pendant la tâche. À vérifier par la session principale.
7. **Un avertissement cosmétique** de n8n sur le banc (« 12 boîtes au premier niveau ») : non traité, le banc est provisoire.

## Sortie de `node scripts/lib-socle-n8n-qa.mjs` (02/11/2026, exports et essais rapatriés)

```
✓ socle lib-* (6 export(s) sur 6, 8 essai(s) n8n rejoué(s)) : S1 à S7, C1 à C4, D, J, A, E, K, B et N tenus
  ✓ mutant « porte « simulation » retirée (p5:318) » (lib-dedoublonner) fait rougir le juge
      → S4 lib-dedoublonner : squelette différent : Entrée conforme ?[main:0]→Calculer la clé en trop, Entrée conforme ?[main:0]→Porte simulation ; Porte simulation[main:0]→Calculer la clé ; Porte simulation[
  ✓ mutant « porte inversée (la logique sur la sortie « faux ») » (lib-journaliser) fait rougir le juge
      → C1 lib-journaliser : l'entrée nominale ne rend pas une sortie conforme (Hors simulation : effet réel non branché (mode A, tâche 035-003). Rien n'a été écrit ni envoyé.)
  ✓ mutant « sortie « faux » de la porte branchée sur la logique » (lib-alerter) fait rougir le juge
      → C3 lib-alerter : hors simulation, la chaîne doit s'arrêter avant tout effet (aucun arrêt, 1 sortie(s))
  ✓ mutant « une écriture HTTP ajoutée après la logique » (lib-battement) fait rougir le juge
      → S2 lib-battement : nœud Écrire le battement de type n8n-nodes-base.httpRequest hors du socle (mode A : ni lecture, ni écriture, ni envoi)
  ✓ mutant « contrat d’entrée contourné » (lib-disjoncteur) fait rougir le juge
      → S4 lib-disjoncteur : squelette différent : Appelé par un parent[main:0]→Porte simulation en trop, Appelé par un parent[main:0]→Contrat d'entrée manquant
  ✓ mutant « contrat d’entrée qui accepte les champs en trop (corps du gabarit affaibli) » (lib-dedoublonner) fait rougir le juge
      → S5 lib-dedoublonner : corps du « Contrat d'entrée » différent du gabarit (empreinte d52ffa3a2983…)
  ✓ mutant « contrat d’entrée sans la garde des adresses (tête : sans_contact ôté) » (lib-alerter) fait rougir le juge
      → C2 lib-alerter : entrée hors contrat (adresse e-mail dans la configuration) : statut ok, la logique a tourné
  ✓ mutant « sortie « non conforme » branchée sur la porte » (lib-journaliser) fait rougir le juge
      → C2 lib-journaliser : entrée hors contrat (trace absente) : statut rejete, la logique a tourné
  ✓ mutant « contrat de sortie qui rend « ok » une entrée rejetée » (lib-battement) fait rougir le juge
      → S5 lib-battement : corps du « Contrat de sortie » différent du gabarit (empreinte 21feca39c1d2…)
  ✓ mutant « clé sans organisation (fuite entre clients) » (lib-dedoublonner) fait rougir le juge
      → D4 lib-dedoublonner : la clé doit séparer les organisations et les étapes
  ✓ mutant « clé non condensée au-delà de 80 caractères » (lib-dedoublonner) fait rougir le juge
      → D3 lib-dedoublonner : clé de 155 caractères (80 au plus, condensée, stable)
  ✓ mutant « clés connues ignorées (le rejeu double) » (lib-dedoublonner) fait rougir le juge
      → D1 lib-dedoublonner : le rejeu du même lot doit donner zéro doublon (passe 1 : 3 réservée(s), passe 2 : 3)
  ✓ mutant « SHA-256 faussé » (lib-dedoublonner) fait rougir le juge
      → S6 lib-dedoublonner : le SHA-256 du nœud Code ne donne pas celui de node:crypto
  ✓ mutant « une ligne perdue » (lib-journaliser) fait rougir le juge
      → J1 lib-journaliser : trois entrées doivent donner trois lignes en simulation, aux clés stables au rejeu
  ✓ mutant « coût gardé sans source de tarif » (lib-journaliser) fait rougir le juge
      → J2 lib-journaliser : un coût sans source de tarif doit être remis à null (jamais une estimation déguisée)
  ✓ mutant « fenêtre de 5 min ôtée » (lib-alerter) fait rougir le juge
      → A1 lib-alerter : 10 erreurs en une minute (à cheval sur deux fenêtres de 5 min) doivent donner une seule alerte (10)
  ✓ mutant « lien d’exécution non vérifié » (lib-alerter) fait rougir le juge
      → A3 lib-alerter : texte minimal attendu (catégorie, workflow, lien d'exécution vérifié), jamais un nom libre ni un lien porteur de jeton (« [Workflow en panne] workflow hors liste · exécution : http://
  ✓ mutant « nom de workflow libre dans le texte » (lib-alerter) fait rougir le juge
      → A3 lib-alerter : texte minimal attendu (catégorie, workflow, lien d'exécution vérifié), jamais un nom libre ni un lien porteur de jeton (« [Workflow en panne] ent-exemple; DROP »)
  ✓ mutant « masquage ôté » (lib-erreur-commune) fait rougir le juge
      → E2 lib-erreur-commune : le masquage laisse passer gerant@, abcdefghijklmnop, sk-ant, 000000000123, 06 12 34, 3000 6000, token=abc, salle de bain
  ✓ mutant « catégorie « quota » ôtée » (lib-erreur-commune) fait rougir le juge
      → E1 lib-erreur-commune : diagnostic en 7 catégories (quota→execution)
  ✓ mutant « SIMULATION à faux » (lib-erreur-commune) fait rougir le juge
      → E4 lib-erreur-commune : journal, alerte et compteur prévus, rien fait (Hors simulation : effet réel non branché (mode A, tâche 035-003). Rien n'a été écrit ni envoyé.)
  ✓ mutant « compteur du disjoncteur oublié » (lib-erreur-commune) fait rougir le juge
      → E4 lib-erreur-commune : journal, alerte et compteur prévus, rien fait (journaliser,alerter)
  ✓ mutant « alerte prévue hors du contrat de lib-alerter » (lib-erreur-commune) fait rougir le juge
      → E5 lib-erreur-commune : ses effets prévus doivent passer le contrat de leur gabarit (lib-journaliser ok, lib-alerter rejete, lib-disjoncteur ok)
  ✓ mutant « seuil franchi d’un cran trop tard (> au lieu de >=) » (lib-disjoncteur) fait rougir le juge
      → K1 lib-disjoncteur : seuil 3 : ferme,ferme,ferme,ouvert (fermé, fermé, ouvert, ouvert attendu), 1 alerte(s) de coupure
  ✓ mutant « un succès ne remet pas le compteur à zéro » (lib-disjoncteur) fait rougir le juge
      → K2 lib-disjoncteur : un succès remet le compteur à zéro (1,2,2,3,4)
  ✓ mutant « un succès referme le disjoncteur ouvert » (lib-disjoncteur) fait rougir le juge
      → K3 lib-disjoncteur : ouvert ne se referme qu’à la main ; l’état lu par l’appelant compte
  ✓ mutant « disjoncteur commun à toutes les organisations » (lib-disjoncteur) fait rougir le juge
      → K4 lib-disjoncteur : une organisation n’en coupe pas une autre
  ✓ mutant « silence de 24 h au lieu de 26 h » (lib-battement) fait rougir le juge
      → B2 lib-battement : 25 h de silence : rien ; 26 h : une alerte ; le seuil configuré compte
  ✓ mutant « alerte déjà levée ignorée (une alerte par heure) » (lib-battement) fait rougir le juge
      → B3 lib-battement : contrôlé toutes les heures de 26 à 30 h, un parent muet donne 5 alerte(s) (une attendue) ; un nouveau silence après un battement réalerte
  ✓ mutant « workflow activé » (lib-alerter) fait rougir le juge
      → S1 lib-alerter : doit rester inactif, sans version publiée
  ✓ mutant « workflow d’erreur retiré » (lib-battement) fait rougir le juge
      → S3 lib-battement : workflow d'erreur absent au lieu de lib-erreur-commune (yekMM9ewk03F9y2q)
  ✓ mutant « appelable par tout workflow » (lib-journaliser) fait rougir le juge
      → S3 lib-journaliser : politique d'appel any (rAAqj7NSVJoA3grm) : une liste d'appelants attendue
  ✓ mutant « fuseau New York » (lib-erreur-commune) fait rougir le juge
      → S3 lib-erreur-commune : fuseau America/New_York
  ✓ mutant « étiquette de couche ôtée » (lib-disjoncteur) fait rougir le juge
      → S7 lib-disjoncteur : étiquettes lib (lib et couche-erreurs attendues)
  ✓ mutant « essai n8n falsifié (sortie retouchée après coup) » (lib-alerter) fait rougir le juge
      → N1 lib-alerter : l'essai n8n « dix pannes en une minute, à cheval sur deux fenêtres de 5 min, et une autre catégorie au lien porteur de jeton » (exécution 372) ne se rejoue pas à l'identique hors lign
lib-socle-n8n-qa : 35 mutants, 35 rouges
OK
```
