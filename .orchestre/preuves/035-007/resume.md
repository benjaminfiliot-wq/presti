## Ressources utilisées

- **Inventaire de la session.** Hôte d'agents Oracle, sans écran. Ont servi :
  - l'outil Skill ;
  - le MCP `cerveau`, en lecture seule ici ;
  - le MCP `n8n-oracle`, branché sur le n8n local d'Oracle ;
  - un sous-agent `Explore` (`haiku`), en lecture seule.

  Les connecteurs Supabase, Vercel, Gmail, Slack et autres sont interdits par la tâche : aucun appel.
- **Le skill `reseau-neuronal`**, chargé avant de produire : `regles_pour`, puis `chercher`, puis `lire`. Rien n'est écrit dans le vault (copie du 02/11).
- **Le MCP `cerveau`.**
  - `regles_pour` (« offre entreprise, n8n, multi-agents… ») rend `[]`.
  - `chercher` a rendu l'**ADR-008** (« n8n-first — la logique métier récurrente aussi ») et le Journal-Decisions du 02/11 ; l'ADR-001 est cité par l'ADR-008 et par `architecture-outils.md`.
  - Effet : toute la logique de la démo vit dans six workflows n8n. Aucun fichier `app/**` ni `lib/**` n'est touché. Le parent ne garde que le routage.
- **Le prompt 5, `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`**, lu aux lignes citées :
  - p5:27-35 : Entreprise, c'est le moteur de Signature. D'où une démo qui appelle les mêmes `lib-*` ;
  - p5:42 : aucun chiffre de gain, ce qui donne la règle G1 du juge ;
  - p5:156 : un parent par client qui ne fait que router, aucun calcul métier (règle G2) ;
  - p5:176 : l'orchestrateur n'appelle aucun modèle pour une décision d'argent ;
  - p5:226 : la liste « jamais en automatique » (règle G3) ;
  - p5:263 : l'arrêt immédiat. D'où l'interrupteur général et ceux par agent, l'essai 455 et le runbook § 3 ;
  - p5:313-320 : les tests hors ligne capables de rougir (G4, G5, N, P) ;
  - p5:339 : la définition du « fini » du mode A.
- **L'addendum `benj-0111-addendum.md`**, parcouru aux mots clés (l.10-11, 23) : chaque remplacement passe par un essai à blanc, et n8n est le moteur de toutes les automatisations.
- **La première réponse, `p5-entreprise/premiere-reponse.md`** :
  - § 4.1 à 4.6 (l.184-431) ;
  - § 5.1 (la matrice Bâti-Démo) et § 5.3 (les fiches Relance, Rédaction, Alerte, Reporting) ;
  - § 5.5 (les contrats de tous les `lib-*`) ;
  - § 7.2 A4 (l.819) et § 7.3 (les KPI : toute base « inconnue, à mesurer » en mode A) ;
  - la ligne 035-007 (l.940) et l'**Amendement B1** (l.1012-1027), qui fixe la liste du kit, à savoir la liste du code plus les gestes de p5:226.
- **`p5-entreprise/fiche-methode-n8n.md`** (l.920-926) :
  - chaque Execute Sub-workflow passe en `continueErrorOutput` et le parent n'échoue pas. C'est appliqué aux appels de chaînes ; voir l'écart 2 ;
  - l'enfant fautif alerte par son propre workflow d'erreur.
- **`p5-entreprise/fiches-depots.md`** (l.433) : « les données épinglées ne couvrent pas les sous-workflows ». C'est la raison pour laquelle les appels sont épinglés **dans** chaque essai, puis rejoués pour de vrai par le juge (règle P).
- **Toutes les vidéos de @restructureai, `/home/usine/agents/videos/references-2026-11-02/restructureai/TOUTES-LES-TRANSCRIPTIONS.md`**, ainsi que `p5-entreprise/fiches-videos-restructureai.md`. Elles ont été lues en entier par le sous-agent `haiku`, qui a rendu chaque point avec sa ligne. Ce qu'elles ont fixé :
  - **l'orchestrateur ne fait pas le travail, il route** :
    - l.205-207 « It doesn't do tasks, it routes them » ;
    - l.428-433 « It just decides who does… If something's off, it stops and calls the owner ».

    D'où un parent sans calcul, des chaînes à responsabilité unique, et un disjoncteur qui coupe et prévient ;
  - **le rapport tient en une page, pas un tableau de bord** (l.1177, l.20). Il a trois têtes, « already handled or sitting on your desk with a fix ready to go » (l.1151-1152) : Déjà traité, Sur votre bureau, À reprendre. Ce sont les trois cases du rapport du gérant ;
  - **rien ne part sans signature au début** (l.457-458 « nothing publishes unless a person signs off »). En mode A, tout est carte et rien n'est « déjà traité seul » ;
  - **« if anything breaks, you hear about it first »** (l.1185) : l'agent Alerte et le runbook § 1 ;
  - **les chiffres de gain des vidéos** (28 400 $, « an extra $10,000 a month », « 5-9% more revenue », 24 jours ramenés à 6, « Three salaries? … Gone! »…), listés par le sous-agent comme **à éviter**. La règle G1 et son motif `GAIN` les refusent ; le rapport n'en contient aucun.
  - Le sous-agent signale aussi des **absences** : rien sur le rejeu, la reprise après échec ou l'interrupteur global. Le runbook comble ces trois points.
- **`p5-entreprise/fiches-videos.md` et `docs/connaissance-videos/`** : non relus pour cette tâche. Les fiches propres à @restructureai et les preuves 035-003 à 035-005, qui les citent, couvrent les règles appliquées ici.
- **Le skill `presti-design`**, chargé pour le rapport du gérant :
  - les jetons du socle `app/base.css` : fond `#0A0C11`, surfaces `#13161F`, texte `#EDEFF4`, gris froid `#8B93A2` ;
  - l'**accent corail `#D97757` / `#E8946F`**, jamais bleu ni violet ;
  - les polices Bricolage, Hanken et JetBrains, en pile locale, sans réseau ;
  - le respect de `prefers-reduced-motion`.

  Les skills `frontend-design`, `ui-ux-pro-max`, `emil-design-eng` et `design-critique` **n'ont pas été chargés** : une page statique d'une colonne n'en avait pas besoin. La critique de design a été faite par relecture du rendu texte. Elle a corrigé deux défauts : le doublon …0103 n'était pas signalé, et les chiffres de la semaine passée se confondaient avec ceux du passage.
- **Le MCP `n8n-oracle`** :
  - `get_workflow_sdk_reference` (`rules`, `patterns`, `functions`), ce qui a donné `.onError()`, `switchCase` avec sortie de secours et `merge.input(i)` ;
  - `get_workflow_best_practices` (`triage`), ce qui a donné la sortie de secours du Switch, qui envoie vers le journal ;
  - `create_workflow_from_code` (×6), `update_workflow` (callerIds, étiquettes, deux correctifs) et `test_workflow` (12 exécutions) ;
  - `get_workflow_execution`, `get_workflow_details` (×6) et `search_workflows`.

  Aucun `publish_workflow`, aucun identifiant créé ni modifié, aucun appel au modèle.
- **Les preuves 035-003, 035-004 et 035-005** : les exports des `lib-*`, rejoués par le juge ; leurs contrats et leurs essais. Le gabarit « Contrat » (`codeEntree`, `codeSortie`) est importé **tel quel** ; les cas de relance (`casRelances`), les lignes de demandes, la grille et la sortie épinglée du modèle (`sortieModele`) aussi.
- **Le jeu fictif `.orchestre/preuves/035-006/exemple/`**, « Exemple. Bâti-Démo ». Ses cas limites passent tous dans la démo : sans contact (…0130), doublon (…0103), stop (…0104), litige (…0106), escalade (…0121), palier manqué (FAC-2026-007) et prix absent (DEV-2026-012).

## Ce qui est construit — n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Étiquettes | Nœuds | Rôle |
|---|---|---|---|---|
| `ent-exemple-parent` | `egBJcOFqHnSnmXaN` | `ent`, `ent-exemple`, `orchestrateur` | 29 | Toutes les 5 min, il lit (épinglé en mode A), route et journalise. Il ne calcule rien. |
| `ent-exemple-qualification` | `CeZdu0DkZfi7XDVn` | `…`, `agent-qualification` | 19 | Exemple. I1 : dédoublonner, qualifier, décider, journaliser |
| `ent-exemple-relance` | `yk2F9qZZrlAAseLB` | `…`, `agent-relance` | 16 | Exemple. I2 et I3 : relancer, dédoublonner, journaliser ; rend des demandes de rédaction |
| `ent-exemple-redaction` | `vtM522VNdzcl4o9I` | `…`, `agent-redaction` | 19 | Rédiger (modèle épinglé), passer la **porte de conformité**, exécuter (carte prévue), journaliser |
| `ent-exemple-alerte` | `BnVx0mm1Ulrg4XlJ` | `…`, `agent-alerte` | 13 | Constater une liste fermée d'anomalies, `lib-alerter`, journaliser |
| `ent-exemple-reporting` | `TrryBnJIbdQ9tzhw` | `…`, `agent-reporting` | 15 | Exemple. I4 : dédoublonner la période, `lib-rapport-hebdo`, journaliser |

**Réglages, relus par `get_workflow_details`** :
- `active: false` et `activeVersionId: null` ;
- `timezone: Europe/Paris` ;
- `errorWorkflow: yekMM9ewk03F9y2q` (`lib-erreur-commune`) ;
- `saveDataSuccessExecution: none` et `saveExecutionProgress: false` ;
- `executionTimeout` : 300 s pour le parent, 120 s pour les chaînes ;
- politique d'appel : chaque chaîne est en `workflowsFromAList`, avec `callerIds = egBJcOFqHnSnmXaN`, le parent seul ; le parent est en `none`.

**Mode A.** Aucun nœud de lecture, d'écriture, d'envoi ni de modèle dans les `ent-*`.
- Les quatre lectures du parent (configuration, verrou, disjoncteurs, événements échus) sont des **emplacements `noOp`**, épinglés dans chaque essai.
- Non épinglés, ils ne rendent rien d'utile : l'interrupteur, lu par `=== true`, vaut faux, et le passage s'arrête sans effet (fail-closed).
- Chaque chaîne porte « Porte simulation ». Sa sortie « faux » mène à « Hors simulation : non branché » (Stop and Error), **avant tout appel**.

## Le schéma des appels

```
ent-exemple-parent (Schedule 5 min) ── route, ne calcule rien
 ├─ Lire la configuration ─ Interrupteur général ouvert ? ─(non)→ Bilan « interrupteur_general_coupe »
 ├─ Poser le verrou ─ Verrou posé ? ─(non)→ Bilan « verrou_deja_pris »
 ├─ Lire les disjoncteurs ─ Lire les événements échus
 ├─ lib-capturer-lead (réclamer les demandes neuves, sans lire le contact)
 ├─ Aiguiller ─ Router par agent (Switch) ── demande_recue → ent-exemple-qualification ─┬─ lib-dedoublonner → lib-qualifier-lead → lib-decider → lib-journaliser
 │                                         ├─ relance_due   → ent-exemple-relance ───────┼─ lib-relancer → lib-dedoublonner → lib-journaliser
 │                                         ├─ balayage      → ent-exemple-alerte ────────┼─ lib-alerter → lib-journaliser
 │                                         ├─ rapport_du    → ent-exemple-reporting ─────┼─ lib-dedoublonner → lib-rapport-hebdo → lib-journaliser
 │                                         └─ (secours)     → Journal : non routé ou sauté
 ├─ Réunir les sorties (Merge, 5 entrées) ─ Préparer les rédactions (2e aiguillage)
 │                                         └─ demandes de la Relance → ent-exemple-redaction ─ lib-rediger-message → lib-porte-conformite → lib-executer → lib-journaliser
 ├─ lib-disjoncteur (une issue par chaîne appelée) ─ lib-journaliser (journal du passage) ─ lib-battement
 └─ Bilan du passage (comptes seulement)
```

- **Trois étages au plus** (§ 4.6) : le parent, la chaîne, les `lib-*`.
  - La Relance n'appelle pas la Rédaction elle-même : elle rend des **demandes de rédaction**, que le parent route dans un second aiguillage.
  - Le juge (S3) rougit si une chaîne en appelle une autre.
- **Le parent n'appelle lui-même que l'infrastructure du routage** : capture, disjoncteur, journal et battement. Jamais un gabarit métier (règle G2).
- **Chaque appel de chaîne est en `continueErrorOutput`.** Une issue est lue comme un échec sur la **forme** de la sortie (sans `contrat`), et non sur la seule branche 1 (voir le défaut 3).

## Les contrats (enveloppe@1, gabarit « Contrat » de 035-003)

Chaque chaîne commence par « Contrat d'entrée » et finit par un seul « Contrat de sortie ». Le corps est commun à toute la bibliothèque ; ses empreintes SHA-256 sont dans `empreintes-code.json`. Toutes les chaînes sont en `sans_contact: true`.

| Contrat | `config` | `donnees` |
|---|---|---|
| `ent-exemple-qualification@1` | `grille`, `seuils`, `delais_cibles_min`, `autonomie`, `plan`, `pilote`, `parties_depuis_24h` | `evenements[]` (`demande_recue`), `empreintes_connues[]`, `cles_connues[]`, `escalade[]` |
| `ent-exemple-relance@1` | `regles` (paliers 1/3/7, jours et heures), `canal` par objet, `cible: carte` (const) | `objets[]` (historique des 4 chemins, paliers envoyés, stop, escalade, faits, destinataire), `maintenant`, `cles_connues[]` |
| `ent-exemple-redaction@1` | `redaction`, `porte`, `niveau_max` (1 ou 2) | `demandes[]` (`cible` carte ou pilote), `interrupteurs`, `cles_existantes`, `compteurs`, `maintenant` |
| `ent-exemple-alerte@1` | `seuils`, `destinataires`, `alertes_recentes[]` | `balayages[]` d'agrégats ; `null` = source illisible, jamais « tout est à jour » |
| `ent-exemple-reporting@1` | `periode`, `kpis[]`, `bases_de_depart` (vide en mode A) | `rapports[] { du, au, actions[] }`, `cles_connues[]` |

**La configuration fictive de « Exemple. Bâti-Démo »** (`configuration()` dans `construire.mjs`) :
- simulation, avec l'interrupteur général et les cinq interrupteurs d'agents ouverts ;
- disjoncteur à 3 échecs ;
- grille de qualification « Exemple. » ;
- autonomie au niveau 2 au plus (question 1), le pilote réglé « actif » mais sans effet en mode A ;
- porte du kit (code plus p5:226) ;
- seuils d'alerte : 60 min et 3 jours ;
- rapport hebdomadaire **sans base de départ**.

## Chaque passage par `test_workflow`, et sa sortie

Les essais sont tous sur données épinglées et relus par `get_workflow_execution`. Leurs entrées, épinglages et sorties sont dans `essais-n8n.json`, recopiés du journal du harnais par `rapatrier.mjs`.

| Exécution | Workflow | Ce qui est prouvé (sortie de n8n) |
|---|---|---|
| **443** | qualification | **Sonde.** n8n applique la politique d'appel **même en manuel** : `The sub-workflow (MnNHht0kG7S6ehDV) cannot be called by this workflow`. La chaîne finit en `erreur`, sans effet, sans planter. |
| 451 | qualification | 7 demandes notées. …0103 est un doublon de …0102, lu sur l'empreinte. 7 cartes « valider la réponse proposée » : 5 au motif `niveau_max`, 2 au motif `escalade` (…0106, …0121). 22 effets prévus, 0 fait. |
| 450 | relance | 10 objets. **5 paliers à préparer** : FAC-007 palier 3 (palier 1 manqué), FAC-008 p3, FAC-009 p2, DEV-012 p3, conversation …0125 p3. **5 écartés** : FAC-010 sans échéance, DEV-011 relancé il y a moins de 3 jours, …0104 STOP, …0106 et …0121 en litige ou escalade. |
| 452 | rédaction | 5 brouillons (modèle épinglé). **La porte en refuse 1** : DEV-012 pour `prix_sans_source`, un montant inventé exprès. **4 cartes prévues** (`POST opportunites?on_conflict=organisation_id,cle`). 0 fait. |
| 447 | alerte | 2 alertes internes prévues, non envoyées : `demande_qui_stagne` vers l'associé, `echeance_proche` vers l'administratif. |
| 448 | reporting | Le rapport de la semaine du 26 octobre : 5 indicateurs, **comptes seulement**, chacun avec sa source. `base: null` partout ; chaque ligne commence par « Exemple. ». |
| 453 | reporting (rejeu) | La même période, rejouée avec les clés du 1er passage : `rien_a_faire`, `rapports: []`, aucun nouveau rapport. |
| 454 | relance | `simulation: false` : arrêt sur « Hors simulation : effet réel non branché », avant tout appel. |
| 455 | parent | Interrupteur général coupé : `arret: interrupteur_general_coupe`, rien appelé, 0 effet. |
| **456** | parent | **Agents en panne, en vrai.** Les chaînes ne sont **pas épinglées** et tournent réellement dans n8n. Leurs appels aux `lib-*` sont refusés par la politique d'appel ; chacune finit en `erreur`, sans effet. Le parent finit son passage, journalise et compte un échec par disjoncteur (1 sur 3, encore fermé). Le Merge à 5 entrées marche avec une entrée vide. |
| 460 | parent | Défaut trouvé (version précédente, voir plus bas) : toutes les chaînes lues « echec ». |
| **461** | parent | **Bout en bout corrigé.** Les 5 chaînes sont `ok`, 48 effets prévus, **0 fait**. 1 événement (`stock_bas`, agent hors démo) part en sortie de secours. Disjoncteurs fermés, verrou à lever. |

**Dans les essais de chaînes, chaque appel `lib-*` est épinglé.**
- Ce qui est épinglé est la sortie de **l'export du `lib-*` rejoué** sur ce que la chaîne lui envoie. Le juge le refait à chaque passage (règle P).
- Dans l'essai de bout en bout, les sorties épinglées des chaînes sont celles de leurs essais. Le champ `journal` en est ôté : le parent ne le lit pas. Le juge compare hors de ce champ, et seulement quand il a été ôté.
- La raison de l'épinglage : la politique d'appel (essai 443) et les données épinglées, qui ne couvrent pas les sous-workflows.

## L'idempotence au rejeu

Trois gardes, de la plus en amont à la plus en aval :
- **la clé de chaque geste** (`lib-dedoublonner`, `cles_connues`) ;
- **la clé de l'action**, relue par `lib-executer` (`cles_existantes`) ;
- en mode B, la contrainte unique à l'écriture.

**Dans n8n**, l'essai 453 : la période déjà faite ne donne aucun rapport.

**Hors ligne**, le juge (G5) rejoue **tout le passage** : le parent, les 5 chaînes et les 13 `lib-*`, depuis leurs exports.
- Au 1er tour, il y a des effets créateurs : cartes, notes, réservations de clés, rapport, alertes.
- Il rejoue ensuite le même lot avec les clés du 1er tour et les alertes récentes. Le 2e tour donne **0** effet créateur.
- Le même événement deux fois dans un lot donne **une seule** carte par clé.
- Mutants : la qualification puis la relance ignorent leurs clés. Le premier recrée 21 effets, le second 5 : rouge.

## Ce qu'il faut ajouter aux `callerIds` des `lib-*` (la session principale le fera ; rien n'a été modifié ici)

Calculé par le juge à partir des exports (`appelantsManquants`). Aujourd'hui, chaque `lib-*` n'accepte que son banc.

| `lib-*` | Ajouter |
|---|---|
| `lib-capturer-lead`, `lib-disjoncteur`, `lib-battement` | `egBJcOFqHnSnmXaN` (parent) |
| `lib-journaliser` | `egBJcOFqHnSnmXaN`, `CeZdu0DkZfi7XDVn`, `yk2F9qZZrlAAseLB`, `vtM522VNdzcl4o9I`, `BnVx0mm1Ulrg4XlJ`, `TrryBnJIbdQ9tzhw` |
| `lib-dedoublonner` | `CeZdu0DkZfi7XDVn`, `yk2F9qZZrlAAseLB`, `TrryBnJIbdQ9tzhw` |
| `lib-qualifier-lead`, `lib-decider` | `CeZdu0DkZfi7XDVn` |
| `lib-relancer` | `yk2F9qZZrlAAseLB` |
| `lib-rediger-message`, `lib-porte-conformite`, `lib-executer` | `vtM522VNdzcl4o9I` |
| `lib-alerter` | `BnVx0mm1Ulrg4XlJ` |
| `lib-rapport-hebdo` | `TrryBnJIbdQ9tzhw` |

Garder le banc dans chaque liste.

Une fois ces appelants ajoutés, l'essai de bout en bout pourra tourner **sans épingler les chaînes**. Seule la sortie du modèle restera épinglée : `lib-rediger-message` n'a pas d'identifiant (question 5).

## Le juge `scripts/demo-entreprise-qa.mjs`

Il est hors ligne : ni réseau, ni base, ni modèle. Il rejoue dans `node:vm` les nœuds Code des exports : Code (`$input`, `$('…').all(b)`, `.first()`, `.isExecuted`), If, Switch avec secours, Merge, Execute Sub-workflow et Stop and Error. Les sous-workflows sont rejoués depuis leurs exports, politique d'appel comprise.

Ses règles :
- **S1 à S3** : inactif, réglages, politique d'appel, types permis, trois étages ;
- **G1** : aucune paire base / résultat chiffrée, aucun chiffre de gain, dans les rapports rendus comme dans le rapport du gérant ;
- **G2** : le parent ne calcule rien. Pas de modèle, pas d'arithmétique, pas de date, pas de montant ni de note, aucun appel à un gabarit métier ;
- **G3** : les 21 gestes du kit (10 du code plus 11 de p5:226), demandés en automatique, n'atteignent jamais `lib-executer` ;
- **G4** : aucun nœud d'envoi, d'écriture ni de modèle. La porte « simulation » précède tout appel. À `simulation: false`, zéro appel. Zéro effet fait ;
- **G5** : le rejeu du même lot ;
- **N1** : chaque essai n8n, rejoué sur l'export, rend la sortie de n8n ;
- **P1** : chaque sortie épinglée est celle de l'export rejoué ;
- **H1 à H3** : « Exemple. » partout ; les comptes du rapport sont ceux des essais ; HTML statique, sans « Presti » ;
- **R1 à R3** : les trois sections du runbook, les ids, aucun secret.

Sortie au 03/11/2026, environ 50 s, mutants compris :

```
✓ démo du mode A (6 workflows, 12 essais n8n dont 11 rejoués) : S1 à S3, G1 à G5, N1, P1, H1 à H3, R1 à R3 tenus
  bout en bout #461 : {"qualification":"ok","relance":"ok","alerte":"ok","reporting":"ok","redaction":"ok"} ; 48 effets prévus, 0 fait
  ✓ « chiffre de gain dans le rapport du gérant » → G1 rapport du gérant : chiffre de gain (« Gain »)
  ✓ « base de départ chiffrée dans le rapport du gérant » → G1 … (« 12 h par semaine »)
  ✓ « paire base / résultat dans un rapport rendu » → G1 essai 448 : l'indicateur actions_preparees porte une base chiffrée (2)
  ✓ « ligne de gain dans un rapport rendu » → G1 essai 448 : chiffre de gain dans le rapport
  ✓ « le parent calcule (arithmétique) » → G2 parent / Aiguiller : arithmétique ou date dans le parent
  ✓ « le parent touche à un montant » → G2 parent / Bilan du passage
  ✓ « le parent appelle lui-même un gabarit métier (lib-decider) » → G2
  ✓ « le parent appelle un modèle » → G4 ent-exemple-parent / Classer (modèle)
  ✓ « un geste « jamais en automatique » atteint l’exécution (filtre de la porte ôté) » → G3 21 geste(s) … atteignent lib-executer
  ✓ « nœud d’envoi ajouté à une chaîne » → G4
  ✓ « porte « simulation » contournée » → G4 ent-exemple-relance / Appeler lib-relancer : appel atteignable sans passer la porte
  ✓ « effet fait en simulation dans un essai » → G4 essai 452
  ✓ « le rejeu ignore les clés déjà réservées (qualification) » → G5 … recrée 21 effet(s)
  ✓ « le rejeu ignore les clés déjà réservées (relance) » → G5 … recrée 5 effet(s)
  ✓ « chaîne appelable par tous » → S2 · ✓ « workflow activé » → S1 · ✓ « workflow d’erreur retiré » → S2
  ✓ « une chaîne appelle une autre chaîne (quatre étages) » → S3
  ✓ « sortie n8n retouchée après coup » → N1 essai 461 · ✓ « sortie épinglée d’un lib-* retouchée » → P1 essai 450
  ✓ « « Exemple. » ôté d’une ligne du rapport du gérant » → H1 · ✓ « compte du rapport du gérant écrit à la main » → H2 (12 ≠ 11)
  ✓ « script dans le rapport du gérant » → H3 · ✓ « runbook sans la section « couper » » → R1 · ✓ « runbook sans l’identifiant du parent » → R2
demo-entreprise-qa : 25 mutants, 25 rouges
OK
```

Les autres juges de la commande `verifier`, relancés par `orchestre.mjs verifier` (voir `verifier.log`), sont tous verts :

| Juge | Résultat |
|---|---|
| `n8n-specs-qa .orchestre/preuves/035-007` | les 6 exports tiennent R1 à R20, 88 mutants rouges |
| `lib-socle-n8n-qa` | 35/35 |
| `lib-metier-n8n-qa` | 35/35 |

## Défauts trouvés en route, tous corrigés

1. **La politique d'appel est appliquée en manuel** (sonde 443). Il fallait le savoir avant de concevoir les essais. De là viennent l'épinglage des appels `lib-*`, la règle P et la liste des `callerIds`.
2. **« rapport [object Object] » dans le journal du Reporting.** La période est un objet. C'est corrigé dans n8n (`update_workflow`) avant l'essai 448.
3. **Une chaîne saine était lue en échec** (essai 460) : avec des données épinglées, n8n rend aussi les éléments épinglés sur `$('…').all(1)`, la branche d'erreur.
   - Le parent lit désormais l'échec sur la **forme** : un élément sans `contrat` est un échec.
   - Correctif poussé dans trois nœuds, puis bout en bout rejoué (461).
   - Le moteur du juge reproduit ce comportement de n8n : l'ancien code y donne `echec` partout, le nouveau `ok`.
   - L'essai 460 reste dans `essais-n8n.json`, marqué `version_precedente`.
4. **La fabrique avait ajouté l'aide `issue` dans le préambule commun**, donc dans quatre nœuds déployés sans elle. `rapatrier.mjs` l'a vu (« 4 écarts ») ; l'aide est limitée aux deux nœuds qui s'en servent. Le code des exports est maintenant égal **octet pour octet** à `construire.mjs`.

## Écarts au plan, et points à valider par Benj

1. **La qualification ne demande pas de rédaction.** `lib-rediger-message@1` ne rédige que des relances (faits en liste fermée, 035-005). L'irritant I1 donne donc une **carte** « valider la réponse proposée » (lib-decider), sans brouillon. Une rédaction de réponse demandera `lib-rediger-message@2`.
2. **Les appels `lib-*` dans les chaînes sont en `continueRegularOutput`**, pas en `continueErrorOutput` comme le veut `fiche-methode-n8n.md:922`. La raison : la règle R16 exige une seule fin, le Contrat de sortie. Un appel en échec rend un élément sans contrat ; l'étape suivante le saute, et l'Assembleur met la chaîne en `erreur` (essai 443). Le parent compte alors l'échec au disjoncteur (essai 456). Les appels de **chaînes**, dans le parent, sont bien en `continueErrorOutput`.
3. **Retry On Fail n'est posé nulle part.** En mode A, il n'y a aucun nœud HTTP ni de modèle dans les `ent-*`. Il viendra avec les lectures réelles du mode B.
4. **Les lectures du parent sont des emplacements `noOp` épinglés**, et non des GET. Les tables (configuration, verrou, disjoncteurs, événements 0185) naissent au « go » de Benj. On colle la migration, puis on lève le drapeau.
5. **Une chaîne attend une enveloppe par appel.** Elle lit `$("Contrat d'entrée").first()`, et le parent n'en envoie qu'une. Deux enveloppes dans un même appel ne seraient pas traitées séparément. À durcir si un autre appelant apparaît.
6. **Le repli « carte » d'un geste refusé en automatique** (035-005, point 5) n'est pas re-présenté, car en mode A tout est déjà carte. Le juge G3 prouve qu'un tel geste n'atteint jamais l'exécution.
7. **Le juge `demo-entreprise-qa.mjs` n'est pas dans `SUITES`** (`scripts/tout-verifier.mjs`, hors de mon périmètre). Il est hors ligne et prend environ 50 s, sans IA. À inscrire par la session principale.
8. **L'audit offensif 035-013** reste à faire, par un agent distinct de l'auteur, avant toute publication.

## Le rapport d'exemple du gérant et le runbook

- **`plans/011-cadrage-01-11/p5-entreprise/demo/rapport-gerant-exemple.html`**, fabriqué par `construire.mjs --rapport` à partir des **sorties réelles** des essais 461, 450, 451, 452, 447 et 448 :
  - HTML statique, sombre et corail, sans script ni ressource distante ;
  - trois cases (Déjà traité seul : 0 · Sur votre bureau : 11 · À reprendre : 1) ;
  - les 11 cartes, le refus de la porte, ce qui est volontairement laissé de côté avec son motif, les 2 alertes internes et le rapport de la semaine passée ;
  - les 8 KPI, chacun « Inconnue, à mesurer ». « Exemple. » est partout et il n'y a **aucun montant ni chiffre de gain**.
- **`plans/011-cadrage-01-11/p5-entreprise/demo/runbook.md`** :
  - **un agent s'arrête** : signes, diagnostic avec la table des causes, réarmement manuel ;
  - **rejouer** : les trois gardes et le rejeu d'un essai en mode A ;
  - **couper** : un agent, tout le client, n8n ;
  - ce qu'il faut faire avant de quitter le mode A.

  Chaque situation renvoie à son essai n8n.

## Fichiers (16, budget 24)

- `scripts/demo-entreprise-qa.mjs`
- `plans/011-cadrage-01-11/p5-entreprise/demo/rapport-gerant-exemple.html`, `…/demo/runbook.md`
- dans `.orchestre/preuves/035-007/` :
  - `construire.mjs`, `rapatrier.mjs`, `resume.md` ;
  - `essais-n8n.json`, `empreintes-code.json` ;
  - les 6 `*.workflow.json` ;
  - `verifier.log`, `avant.txt` et `decisions-avant.md` (ces deux derniers viennent d'`orchestre.mjs`).

Aucun fichier `app/**`, `lib/**`, `scripts/n8n-specs-qa.mjs`, `scripts/lib-*-qa.mjs` ni vault n'a été modifié.
- Aucun workflow `presti-*`, `hermes-*`, `reseau-neuronal-*` ni `lib-*` n'a été touché : ils sont seulement appelés.
- Rien n'a été commité, poussé, construit, migré, publié ni activé.
- Aucun identifiant n'a été créé, et le modèle n'a jamais été appelé.

Il reste dans n8n, hors du livrable, la seule trace de la sonde 443 : l'exécution manuelle elle-même, sans effet.
