# Le vrai multi-agents dans n8n (tâche 036-032, 03/11/2026 au soir)

Écrit par Claude Code sur l'hôte d'agents d'Oracle, avec le MCP `n8n-oracle`. Il répond à l'écart 2 de l'audit 036-028
(`audit-0311-conformite.md:199` : « le chef et ses spécialistes sont absents de n8n, et décoratifs dans les fichiers »).

Règles tenues :
- aucune porte « simulation » levée ;
- rien envoyé, rien écrit en base : `effets_faits` vides dans tous les bancs ;
- aucun identifiant créé ni modifié : « Anthropic account » (`hZsu1Oq5gUfaa2jB`), déjà en place, est affecté aux sept nouveaux nœuds Claude ;
- aucun `gabarit-*` touché (036-031 y travaille), aucune migration, rien dans `app/` ni `lib/`.

Outils et preuves machine : `.orchestre/preuves/036-032/` (générateur `gen.mjs`, passeur `passeur.js`, banc hors ligne
`essai-revalider.mjs`, comparateur `comparer.mjs`, exports des sept chefs dans `exports/`, appelants d'avant dans `appelants-avant.json`).

## 1. Ce qui change, en une phrase

Chaque chef `presti-dep-*` a maintenant un **agent IA « Chef du département … »** (Claude Sonnet 5.5). Il relit la sortie du code, **délègue à
deux spécialistes branchés en outils** (des `lib-*` publiés, par `toolWorkflow`), puis rend une note stricte. Cette note a un effet réel, et un
seul : **retenir un envoi du pilote en carte « À valider »**. Le chef ne peut jamais faire l'inverse, jamais ajouter une action, jamais écrire
un montant.

La logique de décision qui marche (cartes, porte, pilote, montants calculés par le code) **n'est pas touchée** : l'agent se branche entre
le dernier nœud du département et son « Contrat de sortie ».

## 2. La forme, identique pour les sept chefs

```
[dernier nœud du département] → Dossier du chef → Élément vide pour les spécialistes → Chef du département X (agent 3.1) → Revalider le chef → Contrat de sortie
                                                                                          ├ ai_languageModel : Claude Sonnet 5.5 (chef)   — « Anthropic account »
                                                                                          ├ ai_outputParser  : Sortie stricte du chef     — JSON Schema, autoFix faux
                                                                                          ├ ai_tool : Spécialiste A (toolWorkflow 2.2) ─┐
                                                                                          └ ai_tool : Spécialiste B (toolWorkflow 2.2) ─┴→ lib-specialiste-outil → lib-* cible (publié)
```

| Nœud | Rôle |
|---|---|
| **Dossier du chef** (Code) | Compose ce que lit le chef : statut, résultat, effets prévus (clé, type, canal, 500 signes du brouillon) et, pour chaque spécialiste, les clés des requêtes déjà préparées par le département pour ce compte. Ni coordonnée ni montant ajouté ; 12 000 signes au plus. |
| **Élément vide pour les spécialistes** (Code) | Rend `{}`. Le `toolWorkflow` transmet au sous-workflow l'élément d'entrée de l'agent, en plus des champs mappés. Les `lib-*` ont un contrat strict : tout champ de trop les fait rejeter (constaté, exécution 1185). L'agent lit donc son dossier par expression (`$('Dossier du chef').item.json.dossier_du_chef`). |
| **Chef du département X** (AI Agent 3.1) | Prompt système commun aux sept chefs (règles en § 3). `maxIterations` 5, `returnIntermediateSteps` vrai (pour tracer les appels), `passthroughBinaryImages` faux, lots de 4. `onError: continueRegularOutput` : une panne du chef ne fait jamais tomber le département. |
| **Claude Sonnet 5.5 (chef)** (Anthropic Chat Model 1.6) | `claude-sonnet-5-5`, « Anthropic account », `maxTokensToSample` 8 000, `thinkingMode: adaptive`, `effort: low`. 036-027 coupait la réflexion (`disabled`), mais **Sonnet 5.5 refuse de la couper**. Erreur exacte (exécution 1139) : « The model "claude-sonnet-5-5" does not support disabling thinking. Set Thinking Mode to Adaptive… ». La réflexion est donc réglée au plus bas, et le plafond est assez haut pour qu'elle ne vide pas la sortie (le piège de 036-027). |
| **Sortie stricte du chef** (Structured Output Parser 1.3) | `{avis: rien_a_signaler | a_confirmer, note ≤ 400 signes, points_a_confirmer[≤ 20] {cle, motif ≤ 200}, specialistes_consultes[] (noms des deux outils seulement)}`, `additionalProperties: false`, `autoFix` faux (fiche méthode n8n, fiche 4 : hors schéma = rejet). Aucun champ de montant. |
| **Spécialiste A / B** (Call n8n Workflow Tool 2.2) | `$fromAI('cle')` : le modèle choisit une clé parmi celles du dossier. L'outil retrouve la requête déjà préparée par le département sous cette clé (nœud « Préparer … ») et l'envoie au passeur, avec `cible` (l'id du `lib-*`) et `simulation: true` en dur. |
| **lib-specialiste-outil** (`Yicrr9T7m3jqpOXD`, nouveau, publié) | Le passeur. Il ne garde que l'enveloppe du contrat et retire `cle` et `toolCallId`, que `toolWorkflow` ajoute de lui-même (exécution 1198). Il force `simulation: true`, n'accepte qu'une cible de sa liste blanche de onze `lib-*`, et refuse un contrat qui n'est pas celui de la cible. Appelants permis : les sept chefs. |
| **Revalider le chef** (Code) | Reprend l'élément d'origine par appariement. Il revalide la sortie (le parseur n'est pas le contrat) et refuse : avis hors liste, note trop longue, **montant écrit** (`€`, « euros », un chiffre suivi d'une devise), spécialiste inconnu, **spécialiste cité sans avoir été appelé**. Il ne garde que les clés qui existent dans les effets prévus. Si tout est valide, chaque clé signalée qui était `mettre_en_file_pilote` devient `ecrire_carte`, avec `retenu_par_le_chef: true`, et passe de `resultat.pilote` à `resultat.cartes`. Sinon, **rien ne change**. Dans les deux cas, `resultat.note_du_chef` (statut, avis, note, points, appels réels aux spécialistes avec le statut de leur retour, pilotes retenus) et une ligne de journal. |

Pourquoi la note a un effet, contrairement aux fichiers de 036-019 : l'audit reprochait au chef de 036-019 une note que personne ne lisait,
« plus d'appels au modèle, pour aucune décision de plus ». La seule décision donnée ici au chef va **dans le sens de la prudence** : retenir
un envoi seul. Elle est sans risque pour l'artisan (au pire, une carte de plus à valider). Elle est lue par le Cerveau sans rien changer à
son code : `CODE_CARTES` traite déjà `ecrire_carte` et `mettre_en_file_pilote`, avec le même corps (`lib/agents/n8n/cerveau-reel.mjs:191-213`).

**Écart avec 036-019, écrit** : là-bas, le chef se posait après la porte « simulation » et ne tournait pas en simulation. Ici, les chefs
`presti-dep-*` ne tournent **qu'en** simulation (hors simulation, `stopAndError`). Le chef appelle donc le modèle en simulation, comme
`lib-rediger-message` le fait déjà depuis 036-027. Un appel au modèle n'est pas un envoi. Les spécialistes sont des `lib-*` purement codés,
en simulation forcée, qui ne lisent ni n'écrivent rien.

## 3. Le prompt du chef (commun, `gen.mjs` › `systeme`)

1. Jamais un montant, un prix, un pourcentage ni le signe € : les montants sont calculés par le code.
2. Aucun fait inventé : le dossier ou la réponse d'un spécialiste, rien d'autre ; aucune donnée personnelle dans la note.
3. Seulement plus prudent : une clé signalée passe du pilote à une carte ; jamais l'inverse, jamais une action ajoutée.
4. Dès qu'une clé existe, consulter au moins un spécialiste, deux appels au plus, en commençant par le pilote. Sans clé, n'appeler personne.
   La règle « seulement si un point paraît douteux » de la première version laissait le chef ne consulter personne (exécution 1150) :
   un chef qui ne délègue jamais, c'est l'écart 2 de nouveau.
5. Sortie : avis, points (clés prises dans les effets prévus), note de deux phrases, noms exacts des outils appelés.

## 4. Chaque chef : nœud agent, outils, banc, exécution, résultat, retour arrière

Tous publiés le 03/11 vers 18 h 41 UTC, **après** leurs enfants : les `lib-*` étaient déjà publiés, le passeur a été publié à 18 h 31.

| Chef (id) | Nœud agent | Spécialistes en outils → `lib-*` (id) | Version publiée | Version d'avant (retour arrière) |
|---|---|---|---|---|
| `presti-dep-accueil` (`Ls0oFcQzzAk0rWcP`) | Chef du département accueil | trieur → `lib-trier-demande` (`SrT4QJJmb6LLM1FK`) ; porte de conformité → `lib-porte-conformite` (`8c8vkUeSkfgB5FAM`) | `fba83365-de2f-464f-93a1-3879986830a3` | `6d7b830c-095f-4e93-8192-2f8d881727c2` |
| `presti-dep-devis` (`dNikTYPKKsivUbd3`) | Chef du département devis | décideur → `lib-decider` (`hckqX1tQjIommtTH`) ; porte de conformité → `lib-porte-conformite` | `a8b6aa93-1631-492d-87a1-5ff4fdc2b5dc` | `8aa21da4-9e77-425c-ab3c-2ceb982976b2` |
| `presti-dep-facturation` (`bNAF6Xzx5On853kD`) | Chef du département facturation | relanceur d'impayés → `lib-relancer` (`jGM56jxeLUVXZIiM`) ; porte de conformité → `lib-porte-conformite` | `0e06210b-ddd8-40aa-93a3-db87d65745a9` | `ab04ddd7-006b-48b4-93b7-0c64082245d0` |
| `presti-dep-suivi` (`jo8eQMEwiB9wCbKN`) | Chef du département suivi | contrôleur de conflit → `lib-controler-conflit` (`F2son8oGwifPETg3`) ; relanceur → `lib-relancer` | `450d3c52-12c8-4bc1-a5d4-20291075ebb7` | `8d7de560-412b-497f-ba1c-db34f3a99a23` |
| `presti-dep-apres` (`L3GOS7euxi60jCZN`) | Chef du département après-chantier | lecteur d'avis → `lib-avis-lire` (`ScpXQIH54wmmuuel`) ; rédacteur de réponses → `lib-avis-repondre` (`OW7vXn4aPzSYoSdm`) | `b3a1fc56-c256-43ee-8bd2-e0990680598f` | `5483d0ac-6eb4-44a9-8f19-80dd91d012ad` |
| `presti-dep-operations` (`74bDhTw6cEBzPORZ`) | Chef du département opérations | planificateur → `lib-agenda-creneaux` (`414xd7DQaRmEgoTs`) ; synchroniseur → `lib-synchroniser-outil` (`znIxgrxNzUvGeanu`) | `b3d00036-b415-443c-997d-c6ca7496b2ab` | `e56af179-f707-4b8e-946d-ff7c672718e4` |
| `presti-dep-direction` (`oHGOyqsZGoUooxa6`) | Chef du département direction | contrôleur du coût → `lib-cout-ia` (`JtGOKOG1ssFP5z1u`) ; aiguilleur d'alertes → `lib-alerte-liste` (`v2wfT9qB5e0LHtFI`) | `67d54499-ac59-4b41-9160-677cfc51a9ce` | `a5ebbf16-d4ea-4134-a515-c4933458388a` |

Chaque chef a 8 nœuds de plus, et son `executionTimeout` passe de 120 ou 180 s à 600 s (un appel au modèle par compte, plus les outils).
**Contrôle croisé** : `node .orchestre/preuves/036-032/comparer.mjs` relit les sept exports en ligne (pris après la pose). Il rend
« VERT : 56 nœuds identiques au générateur, liens complets, 7 chefs ». Un mutant (une phrase du prompt changée dans un export) le fait
rougir : « ROUGE : 1 écart(s) ».

**Appelants (`callerIds`)** : chaque `lib-*` cible acceptait déjà son chef, qui l'appelle aujourd'hui par `executeWorkflow`. Comme l'outil passe par
le passeur, `Yicrr9T7m3jqpOXD` a été **ajouté** aux appelants des onze `lib-*` (valeurs d'avant dans `appelants-avant.json`). Ce changement de
réglage ne crée pas de version : la version publiée de chaque `lib-*` est restée la même (relu sur `lib-porte-conformite` : `91de7c87`,
avant comme après).

### Bancs (porte « simulation » à vrai, données « Exemple. », une fois chacun après publication)

| Banc | Chef(s) | Exécution | Résultat, relu nœud par nœud |
|---|---|---|---|
| `presti-banc-cerveau` (`x7QfmFAZNIxaoUS6`) | accueil | **1253** | **vert** : deux comptes `ok`, 0 erreur ; Studio 16 cartes, 0 pilote ; Signature 4 cartes, 13 pilote (comme 1007) ; chef Studio : porte de conformité appelée (`refuse` confirmé sur la demande 15) ; chef Signature : porte (`ok`) **et** trieur (`ok`) ; aucun pilote retenu ; `effets_faits` 0 |
| `presti-banc-argent` (`LRO3Jng6Te4Xn7Pg`) | devis, facturation | **1271** | **vert** : devis 3 et 5 cartes, facturation 4 cartes et 4 cartes + 2 pilote (comme 1016) ; les quatre chefs `ok` ; appels réels : porte et décideur (devis), relanceur d'impayés et porte (facturation), tous `ok` ; `effets_faits` 0 |
| `presti-banc-suivi` (`95LajsFcVM4AALac`) | suivi | **1299** | **vert** : Studio `ok` (2 préparées en carte), Signature `ok` (2 parties seules au pilote, registre 2), le 3ᵉ cas `rejete` est le cas hors contrat attendu (comme 871) ; chefs : contrôleur de conflit et relanceur appelés (`ok`), contrôleur ×2 sur Signature ; rien à signaler, aucun pilote retenu ; `effets_faits` 0 |
| `presti-banc-apres` (`Dl8vjXWu71r7q0Fs`) | après-chantier | **1321** (chef : 1325, 1330) | **vert** : cinq cas, `defauts` 0 ; département complet `ok` (9 cartes, rien parti seul) ; interrupteur coupé `rien_a_faire` ; chef : lecteur d'avis appelé les deux fois (`ok`, puis `rien_a_faire`) ; sa note recopie les faits (« trois avis négatifs, dont un litige avec menace de plainte, et trois avis suspects ») ; `effets_faits` 0 |
| `presti-banc-operations` (`v0I7822xbpDICXd8`) | opérations | **1336** (chef : 1337 à 1341) | **vert** : dix cas, `defauts` 0 (rappel `ok`, stock `ok`, pose sans clic `refuse` attendu, pose après clic `ok`, interrupteur coupé `rien_a_faire`, créneaux et import en direct `ok` / `refuse` attendu) ; les cinq notes du chef sont `ok`. **Limite** : aucun cas du chef ne passe par « Préparer les créneaux » ni par « Préparer l'import ». Le chef n'avait donc aucune clé de spécialiste, et il l'écrit (« aucune clé de spécialiste n'existe : personne n'a été consulté ») au lieu d'inventer un appel. Le chemin des outils des opérations est prouvé par la structure (comparateur) et par les mêmes outils sur les autres chefs, pas par ce banc ; `effets_faits` 0 |
| `presti-banc-direction` (`K7lsk0lRJtH5xEOJ`) | direction | **1350** | **vert** : dix cas, `defauts` 0 (page du matin, page sans lecture des impayés, rapport du lundi, deux diagnostics, interrupteur coupé `rien_a_faire`, puis `lib-cout-ia` et `lib-alerte-liste` en direct). Les six notes du chef sont `ok`, et l'une recopie un fait sans l'enjoliver (« les impayés n'ont pas pu être lus… le dossier n'affirme rien à ce sujet »). **Même limite qu'aux opérations** : aucun cas du chef ne passe par « Préparer l'alerte » ni par « Préparer le coût », donc aucun spécialiste appelé, ce que le chef dit lui-même ; `effets_faits` 0 |

**Bilan des bancs** : six sur six verts, une exécution chacun après publication, aucun échec, donc aucune dépublication. Les comptes des
départements sont ceux d'avant les chefs (1007, 1016, 871). Le chef n'a retenu aucun pilote dans ces six passages, mais il en a retenu un dans
l'essai 1198 : le mécanisme marche, et il ne s'est pas déclenché à tort. Des appels réels aux spécialistes sont prouvés pour l'accueil, le devis, la
facturation, le suivi et l'après-chantier. Pour les opérations et la direction, les bancs actuels ne donnent aucune clé au chef. Un cas de banc
qui passe par les créneaux, l'import, l'alerte ou le coût **à travers le chef** reste à écrire (`presti-banc-operations` et `-direction`, une
tâche à part).

### Essais avant publication, sur le brouillon de l'accueil (le banc manuel joue le brouillon de son enfant direct)

| Exécution | Ce qu'elle a montré | Correction |
|---|---|---|
| 1127 | `note_du_chef` présent, chef en erreur ; le département intact (« rien ne change ») | détail de l'erreur ajouté à la note |
| 1139 | « does not support disabling thinking » | réflexion `adaptive`, `effort: low`, 8 000 jetons |
| 1150 | le chef marche : il signale deux brouillons qui remercient pour une photo **refusée** (Studio) ; mais aucun spécialiste consulté | règle 4 : au moins un spécialiste ; appels tracés |
| 1163 | nom d'outil réécrit par n8n (`Sp_cialiste_porte_de_conformit_`), donc refus « cité non appelé » ; porte `rejete` | noms normalisés comme n8n ; extrait d'erreur du retour |
| 1185 | `entrée.enveloppe : champ hors contrat`… : l'outil transmet l'élément de l'agent | « Élément vide pour les spécialistes » ; origine par appariement |
| 1198 | `entrée.cle`, `entrée.toolCallId : champ hors contrat` ; un pilote **retenu** par le chef (Signature : 13 → 12 pilote, 4 → 5 cartes) | passeur `lib-specialiste-outil` |
| 1222 | chaîne complète : chef → outil → passeur → `lib-porte-conformite` → verdict réel (`refuse`, `ok`) | — |

### Retour arrière (dans cet ordre, parents d'abord)

1. Pour chaque chef : `restore_workflow_version` vers la « version d'avant » du tableau, puis `publish_workflow`. C'est la version publiée avant
   036-032, sans agent ; ses bancs étaient verts (882, 856, 871…). Un chef peut aussi rester tel quel avec son agent coupé : `setNodeDisabled` sur
   « Chef du département … » donne une sortie vide, donc `note_du_chef` « indisponible » et un département inchangé.
2. Ensuite seulement : `unpublish_workflow` sur `lib-specialiste-outil` (`Yicrr9T7m3jqpOXD`). Puis, sur les onze `lib-*`, `setWorkflowSettings`
   avec les `callerIds` d'avant (`appelants-avant.json`). Ces deux gestes sont sans effet sur leurs autres appelants.
3. Rien à défaire en base : rien n'y a été écrit.

## 5. La preuve de la clé `BOITE_CLE_N8N`

**Résultat : un nœud Code ne lit PAS `$env.BOITE_CLE_N8N` aujourd'hui. n8n bloque l'accès aux variables d'environnement.**

- Banc : `presti-banc-boite` (`tNEvzy2enkNF41z2`, inactif, jamais publié). Un nœud y est ajouté, « Cas : la clé de la boîte (longueur seule) »,
  sur une branche à part du déclencheur : le bilan des cinq cas n'est pas touché. Il lit `$env.BOITE_CLE_N8N` et ne rend **jamais la valeur** :
  seulement la présence, le type, la longueur, la forme base64, le nombre d'octets décodés, et un aller-retour AES-256-GCM sur le texte fictif
  « Exemple. » si la clé fait 32 octets.
- Exécution **1177** (manuelle, 03/11, 18 h 26 UTC), sortie du nœud :
  `{"cas":"cle-boite","simulation":true,"lue":false,"type":"undefined","longueur":0,"base64_valide":false,"octets_decodes":null,"aller_retour_aes_gcm":"non_tente","erreur_lecture":"access to env vars denied","erreur_chiffrement":null}`
- **Erreur exacte : `access to env vars denied`**, le message de n8n quand `N8N_BLOCK_ENV_ACCESS_IN_NODE` est actif (vrai par défaut en n8n 2.x).
  La longueur de 44 signes n'a donc pas pu être vérifiée. Rien ne dit que la clé posée le 03/11 à 19 h 30 soit absente du conteneur ; seulement
  qu'un nœud n'a pas le droit de la lire.
- Les cinq cas du banc restent verts dans la même exécution : `lib-boite-lire` ok ×2, `lib-boite-brouillon` ok, `lib-boite-envoyer` ok et
  `refuse` (le refus Studio attendu), `defauts` 0.
- **Je n'ai pas changé le réglage du serveur** (il revient à la session principale). Pour débloquer, deux voies au choix de la session principale :
  1. `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` dans l'environnement de n8n (et des exécuteurs) de `/opt/n8n-complet`, puis redémarrage. Cela ouvre
     **toutes** les variables à tous les nœuds Code : à peser.
  2. Garder le blocage et faire porter la clé par un identifiant n8n dédié, lu par un nœud HTTP. Mais créer un identifiant revient à Benj.

  Après l'une ou l'autre, rejouer `presti-banc-boite` : le cas doit rendre `lue: true`, `longueur: 44`, `octets_decodes: 32`,
  `aller_retour_aes_gcm: "ok"`.

## 6. Coût et limites

- **Coût** : un appel Sonnet 5.5 par compte et par passage de chaque département, plus un ou deux tours d'outil (outils sans modèle).
  Les jetons ne sont pas relevés : les sous-exécutions réussies ne sont pas conservées (`saveDataSuccessExecution: none`). Aujourd'hui, le
  Cerveau publié s'arrête avant les chefs, car aucun compte n'est en marche (036-030). Le coût ne court donc que sur les bancs.
- **Données envoyées au modèle** : la sortie du département (identifiants, motifs, 500 signes du brouillon). Pas de coordonnées : le texte des
  demandes est déjà masqué par le code en amont (`[coordonnée]`). Sur un vrai compte, ce sont des données de client vers Anthropic, comme pour
  `lib-rediger-message` : le registre des traitements doit le dire avant le réel.
- **Le chef ne relit que deux spécialistes et deux appels**, pas toutes les actions : il le dit lui-même dans ses notes (« je n'ai pas relu les
  autres actions une à une »). C'est voulu pour borner le coût.
- **Les clés que le chef peut retenir** viennent des effets `ecrire_carte` et `mettre_en_file_pilote`, les seuls que le Cerveau transforme en
  cartes. L'après-chantier, les opérations et la direction prévoient d'autres effets (`preparer_carte`, `preparer_carte_lot`…), qui ne partent
  déjà jamais seuls. Chez eux, le chef relit et annote (note, appels aux spécialistes), mais n'a aucune clé à retenir. C'est cohérent : il n'y a
  pas d'envoi seul à retenir.
- **Les gabarits de 036-019** (fichiers, et `gabarit-*` dans n8n) ne sont pas touchés : 036-031 y travaille.
