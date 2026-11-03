# La clé de n8n lue dans le coffre de Supabase, et les chefs sur Haiku (tâche 036-035, 03/11/2026 au soir)

Écrit par Claude Code sur l'hôte d'agents d'Oracle, avec le MCP `n8n-oracle`. Il donne suite au choix A de Benj (03/11 au soir) :
la clé `BOITE_CLE_N8N` vit dans le coffre Vault de Supabase (migration `0196`, posée), et n8n la lit par la fonction `cle_boite_n8n()`,
à la place de `$env`, que n8n refuse (`access to env vars denied`, exécution 1177, `multi-agents-n8n.md` § 5).

Règles tenues :
- la valeur de la clé n'apparaît nulle part : ni dans ce texte, ni dans une sortie de nœud conservée, ni dans un journal. Seule sa longueur est écrite ;
- aucun réglage du serveur changé : `N8N_BLOCK_ENV_ACCESS_IN_NODE` et la liste des modules permis restent tels quels ;
- aucun identifiant créé : « Supabase account » (`dTewDK98MLrNckNG`) et « Anthropic account » (`hZsu1Oq5gUfaa2jB`) existaient déjà ;
- aucune porte « simulation » levée, rien d'envoyé, aucune migration, aucun `gabarit-*` touché, rien dans `app/` ni `lib/`.

## 1. Inventaire : quels nœuds déchiffrent `connexions.secret_n8n` ?

J'ai relu nœud par nœud les workflows du périmètre (`get_workflow_details`) :

| Workflow (id) | Lit `$env.BOITE_CLE_N8N` ? | Déchiffre `secret_n8n` ? |
|---|---|---|
| `presti-banc-boite` (`tNEvzy2enkNF41z2`) | **oui** : nœud « Cas : la clé de la boîte (longueur seule) » (036-032) | non (il vérifie la clé, sans déchiffrer de vrai secret) |
| `lib-boite-lire` (`cQqfkVseZU2Ax0xQ`) | non | non : le mode A ne contrôle que la **forme** du chiffré (`FORMAT_SECRET`) |
| `lib-boite-brouillon` (`zw2k0vo9wpv7lNfr`) | non | non (APPEND IMAP prévu dans `effets_prevus`) |
| `lib-boite-envoyer` (`UkMVpSxETSIY4Mku`) | non | non (nœud SMTP désactivé) |
| `presti-boite` (`yQK50I6JXchYBH7Y`) | non | non (lectures épinglées) |
| `presti-provisionnement` | **absent de n8n** (`search_workflows` : 0 résultat) | son export (`.orchestre/preuves/036-021/presti-provisionnement.workflow.json`) lit `$env.BOITE_CLE_N8N` et `require('crypto')` : voir § 6 |

Dans n8n, un seul nœud lisait donc la clé : celui du banc. Les déchiffrements réels (IMAP, SMTP, provisionnement) ne sont pas encore
branchés (mode A) ; le § 5 donne la forme qu'ils devront suivre.

## 2. Ce qui change dans n8n

### 2.1 Nouveau : `lib-boite-cle` (`flav5A8frXl2BxPi`, jamais publié)

```
Appelé par presti-banc-boite (passthrough)
  → Lire la clé dans le coffre (HTTP 4.2, POST https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/rpc/cle_boite_n8n,
                                 identifiant « Supabase account », réponse lue en texte, executeOnce, erreur → sortie normale)
  → Vérifier la clé puis l oublier (Code) : lit la clé dans son entrée, la vérifie, ne rend que sa longueur, efface son tampon
```

- **Pourquoi un sous-workflow, et pas un nœud HTTP dans le banc** : n8n conserve la sortie de **chaque** nœud d'une exécution conservée.
  Si le nœud HTTP était dans le banc, dont les exécutions manuelles sont conservées, la clé resterait en base dans l'exécution.
  Dans `lib-boite-cle`, la clé ne vit qu'en mémoire : ce workflow ne conserve **aucune** exécution. Le banc ne reçoit que la sortie du Code.
- **Réglages de conservation de `lib-boite-cle`** : `saveDataSuccessExecution: none`, `saveDataErrorExecution: none`,
  `saveManualExecutions: false`, `saveExecutionProgress: false`. Appelant permis : `presti-banc-boite` seul (`callerPolicy: workflowsFromAList`,
  `callerIds: tNEvzy2enkNF41z2`). Workflow d'erreur : `lib-erreur-commune` ; il ne reçoit que le message d'erreur, qui est masqué (plus bas).
- **Le nœud Code ne rend jamais la valeur.** Sa sortie : `cas, statut, simulation, source, moteur, lue, type, longueur, base64_valide,
  octets_decodes, aller_retour_aes_gcm, format_secret_n8n_v1, erreur_lecture, erreur_chiffrement`. Tout message d'erreur passe par un masque :
  toute suite de 40 signes base64 ou plus devient `[masqué]`. Le contrat d'entrée est une liste blanche : seule l'opération `verifier_cle` est acceptée.
- **AES-256-GCM en JavaScript pur.** Premier essai (exécution 1564) : `Module 'crypto' is disallowed`. Les nœuds Code de ce n8n n'ont pas le
  module `crypto`, et changer la liste des modules permis est un réglage du serveur, donc interdit ici. Le nœud embarque un AES-256-GCM écrit
  en JS (S-box, clés étendues, compteur, GHASH en `BigInt`, étiquette comparée sans court-circuit). Contrôlé hors ligne contre `node:crypto` :
  **120 / 120** vérifications conformes (40 tirages aléatoires × chiffré identique, étiquette identique, refus d'une étiquette altérée).
- **Deux preuves cryptographiques** : (1) l'aller-retour sur le texte fictif « Exemple. » ; (2) la forme de `connexions.secret_n8n`. Un secret
  fictif est chiffré au format `v1.<iv>.<tag>.<données>` (base64url) avec la donnée associée `connexions:<id>:n8n`, puis rouvert. Il **doit**
  être refusé avec une autre donnée associée (`format_secret_n8n_v1: "ok"` exige les deux).

### 2.2 Modifié : `presti-banc-boite` (`tNEvzy2enkNF41z2`, inactif, jamais publié)

- « Cas : la clé de la boîte (longueur seule) » ne lit plus `$env`. Il rend seulement `{ operation: "verifier_cle" }`.
- Nouveau nœud « Appeler lib-boite-cle (6) » (`executeWorkflow`, attend la fin, erreur → sortie normale). Il est sur une branche à part :
  le « Bilan du banc » des cinq cas n'est pas touché.
- Conservation : `saveDataSuccessExecution: none` (inchangé), `saveDataErrorExecution: none` (avant : `all`), `saveExecutionProgress: false`,
  et `saveManualExecutions: true`, **permis pour ce banc seul** : sa sortie ne porte que la longueur.
- Version d'avant : `a86db7e8-6bdc-4c42-ba47-a02d23b3eb46` ; version actuelle (brouillon, jamais publiée) : `5253fc99-c6d5-4fa3-9dc8-03b6076de251`.

## 3. La preuve : `presti-banc-boite`, exécution 1592

Exécution manuelle du 03/11, 19 h 43 UTC, statut `success`. Sortie du nœud « Appeler lib-boite-cle (6) » (sous-exécution 1598, non conservée) :

```json
{"cas":"cle-boite","statut":"ok","simulation":true,"source":"coffre Supabase : cle_boite_n8n()","moteur":"aes-256-gcm en JS pur (crypto refusé aux nœuds Code)",
 "lue":true,"type":"string","longueur":44,"base64_valide":true,"octets_decodes":32,"aller_retour_aes_gcm":"ok","format_secret_n8n_v1":"ok",
 "erreur_lecture":null,"erreur_chiffrement":null}
```

- **`lue: true`, `longueur: 44`, `octets_decodes: 32`, `aller_retour_aes_gcm: "ok"`** : c'est ce que la tâche demande, plus `format_secret_n8n_v1: "ok"`.
- Dans la même exécution, les cinq cas de la boîte restent verts : `lib-boite-lire` ok ×2, `lib-boite-brouillon` ok, `lib-boite-envoyer` ok
  et `refuse` (le refus Studio attendu), `defauts` 0.
- Le nœud « Cas : la clé de la boîte » de l'exécution conservée ne porte que `{"operation":"verifier_cle"}`.
- **Aucune exécution de `lib-boite-cle` n'est conservée** : `search_workflow_executions` sur `flav5A8frXl2BxPi` rend `count: 0`, alors que
  quatre sous-exécutions ont tourné (1570, 1582, 1589, 1598). La clé n'a donc jamais été écrite dans la base de n8n.
- Les essais intermédiaires, conservés eux aussi, ne portent pas la clé. 1564 : `Module 'crypto' is disallowed`. 1576 et 1583 : la lecture
  échouait, puis `Response body is not valid JSON`, parce que PostgREST rend une chaîne JSON nue. D'où la réponse lue en texte, puis décodée.
  L'exécution 1177 (036-032) ne portait que `access to env vars denied`.

## 4. Réglages de conservation : ce qui garde quoi

| Workflow | Succès | Erreur | Manuelle | Progression | Porte la clé ou un secret déchiffré ? |
|---|---|---|---|---|---|
| `lib-boite-cle` | none | none | false | false | la clé, **en mémoire seulement** ; rien n'est conservé |
| `presti-banc-boite` | none | none | **true (banc seul)** | false | non : la longueur et des booléens |
| `lib-boite-lire`, `-brouillon`, `-envoyer`, `presti-boite` | none | all | true | false | non : ils ne déchiffrent rien en mode A (chiffré fictif épinglé) ; **réglages inchangés** |

**Écrit pour la suite : hors banc, aucune trace ne porte la clé ni un secret déchiffré.** Le jour où un vrai nœud IMAP, SMTP ou Gmail
déchiffrera `secret_n8n` dans un de ces workflows, ce workflow passera d'abord à `none` / `none` / `false` / `false`, comme `lib-boite-cle`
(§ 5). Les `lib-boite-*` gardent aujourd'hui leurs erreurs (`all`) parce qu'elles ne portent qu'un chiffré fictif.

## 5. La forme à suivre pour tout nœud qui déchiffrera un vrai `secret_n8n`

1. Dans le **même** workflow que l'usage (IMAP, SMTP, API) : un nœud HTTP `POST …/rest/v1/rpc/cle_boite_n8n`, identifiant « Supabase account »,
   réponse en texte, `executeOnce`, erreur vers la sortie normale.
2. Le nœud Code lit la clé dans l'entrée, ouvre `secret_n8n` avec l'`gcmOuvrir` de `lib-boite-cle` (donnée associée `connexions:<id>:n8n`),
   s'en sert, et ne rend **ni** la clé **ni** le secret ouvert. Il rend seulement l'issue (`ok`, `identifiants_refuses`, …).
3. Le workflow est réglé `saveDataSuccessExecution: none`, `saveDataErrorExecution: none`, `saveManualExecutions: false`,
   `saveExecutionProgress: false`. Aucun nœud en aval ne voit la clé.
4. Pas de `require('crypto')` ni de `require('node:crypto')` : ils sont refusés dans ce n8n. Le code de `connecteurs/imap.md:73-85` doit donc
   remplacer `crypto.createDecipheriv` par l'AES-GCM en JS de `lib-boite-cle`, et `$env.BOITE_CLE_N8N` par le nœud HTTP.

## 6. Les chefs sur Claude Haiku 5.5

Demande de Benj : économiser la clé API. Sur les sept chefs `presti-dep-*`, le nœud modèle « Claude Sonnet 5.5 (chef) » devient
« **Claude Haiku 5.5 (chef)** » : `claude-haiku-5-5`, même identifiant « Anthropic account », même plafond de sortie (`maxTokensToSample` 8 000),
réflexion **coupée** (`thinkingMode: disabled`, que Haiku accepte et que Sonnet refusait). Le renommage suit les liens (`renameNode`).
Les bancs ont été joués **sur les brouillons** : un banc joue le brouillon de son enfant direct, et les sept chefs ont leur banc dans `callerIds`.
Les chefs ont été publiés **après** les six bancs verts.

| Chef (id) | Modèle | Version publiée avant (Sonnet) | Version publiée maintenant (Haiku) |
|---|---|---|---|
| `presti-dep-accueil` (`Ls0oFcQzzAk0rWcP`) | Haiku 5.5 | `fba83365-de2f-464f-93a1-3879986830a3` | `8025147d-286b-4588-a2c5-048a336da0b9` |
| `presti-dep-devis` (`dNikTYPKKsivUbd3`) | Haiku 5.5 | `a8b6aa93-1631-492d-87a1-5ff4fdc2b5dc` | `1c944a38-ac8a-4ee0-a0b0-f3b33b91bee4` |
| `presti-dep-facturation` (`bNAF6Xzx5On853kD`) | Haiku 5.5 | `0e06210b-ddd8-40aa-93a3-db87d65745a9` | `dcffb632-6354-4b20-a7ef-e480dd829b30` |
| `presti-dep-suivi` (`jo8eQMEwiB9wCbKN`) | Haiku 5.5 | `450d3c52-12c8-4bc1-a5d4-20291075ebb7` | `ce6641b9-2138-48bd-8057-fac8cd931a32` |
| `presti-dep-apres` (`L3GOS7euxi60jCZN`) | Haiku 5.5 | `b3a1fc56-c256-43ee-8bd2-e0990680598f` | `41873abb-add1-486b-9201-3e568d6ca49c` |
| `presti-dep-operations` (`74bDhTw6cEBzPORZ`) | Haiku 5.5 | `b3d00036-b415-443c-997d-c6ca7496b2ab` | `c5dc2180-2dd3-40b2-9656-81d115062e61` |
| `presti-dep-direction` (`oHGOyqsZGoUooxa6`) | Haiku 5.5 | `67d54499-ac59-4b41-9160-677cfc51a9ce` | `1a572c9b-ba36-45d0-9fb1-4859fc04649f` |

**Aucun chef ne garde Sonnet.** Aucune note n'est vide ni fausse. J'ai relu chaque note contre les données de sa sortie.

### Bancs rejoués (une fois chacun, porte « simulation » à vrai, données « Exemple. »)

| Banc | Chef(s) | Exécution | Résultat |
|---|---|---|---|
| `presti-banc-cerveau` (`x7QfmFAZNIxaoUS6`) | accueil | **1601** | **vert** : trois comptes `ok`, `effets_faits` 0. Studio : 16 cartes, 0 pilote. Signature : 4 cartes, 13 pilote, comme 1253. Porte et trieur appelés (`ok`), aucun pilote retenu. Note vérifiée : « une action de facture marquée payée » correspond bien à la carte `type_action: marquer_facture_payee` |
| `presti-banc-argent` (`LRO3Jng6Te4Xn7Pg`) | devis, facturation | **1623** | **vert** : devis 3 et 5 cartes ; facturation 4 cartes, puis 4 cartes + 1 pilote ; quatre chefs `ok`, décideur, porte et relanceur appelés (`ok`) ; notes justes (lignes à prix estimé de DEV-EX-0003, -0006, -0008 ; relance FAC-EX-0034 au palier 3) |
| `presti-banc-suivi` (`95LajsFcVM4AALac`) | suivi | **1654** | **vert** : Studio `ok` (1 carte), Signature `ok` (2 parties seules au pilote), 3ᵉ cas `rejete` attendu ; relanceur et contrôleur de conflit appelés (`ok`) |
| `presti-banc-apres` (`Dl8vjXWu71r7q0Fs`) | après-chantier | **1674** | **vert** : cinq cas, `defauts` 0, 9 cartes, rien parti seul, comme 1321 ; note juste (7 avis, 3 négatifs, 3 suspects, une plainte sans brouillon : `ra:col:a3`) |
| `presti-banc-operations` (`v0I7822xbpDICXd8`) | opérations | **1689** | **vert** : dix cas, `defauts` 0, `refuse` attendus ; cinq notes `ok` (stock : prix de la vis à revérifier, mastic sans fournisseur, exact) |
| `presti-banc-direction` (`K7lsk0lRJtH5xEOJ`) | direction | **1702** | **vert** : dix cas, `defauts` 0 ; six notes `ok`, dont « lecture des impayés en erreur… reste à vérifier » sur la page sans lecture |

Relevé machine (notes complètes, comptes, appels) : `.orchestre/preuves/036-035/resume.md`.

### Écarts relevés, qui ne viennent pas du modèle du chef

- **Facturation, compte Signature : 1 pilote au lieu de 2 (1271).** Le journal du département montre `relance_impaye : pilote` pour FAC-EX-0034
  **et** FAC-EX-0037. Mais FAC-EX-0037 ne figure pas dans `relances` et ne passe jamais la porte. Elle se perd dans les étapes du département,
  **avant** le chef (rédaction ou exécution). Le chef n'a rien retenu (`pilotes_retenus: []`) ; un chef ne peut que faire passer un pilote en carte,
  jamais en retirer un. Hors du périmètre de cette tâche : à rejouer et suivre dans une tâche à part (`presti-dep-facturation`, `lib-rediger-message`).
- **Suivi, compte Studio : 1 carte préparée (1299 : 2).** La conversation 009 est désormais `refus_porte` + `sujet_escalade` : c'est une
  décision de la porte, en amont du chef.
- **Opérations, « rendez-vous après le clic » :** le chef écrit « aucun effet prévu ». C'est exact au regard de son dossier : le nœud
  « Dossier du chef » ne transmet que les effets `ecrire_carte` et `mettre_en_file_pilote`, et `poser_rendez_vous` n'y est pas. C'est une
  limite du dossier (036-032), pas une erreur de Haiku.
- **Suivi, compte Signature :** la note dit les deux envois « relus », mais les spécialistes n'ont été appelés que pour la conversation 008.
  Ce n'est pas faux (le dossier les montre tous deux), mais c'est moins précis que la tournure de Sonnet (« je n'ai pas relu les autres »).

## 7. Points ouverts (hors périmètre, pour la session principale)

1. **`presti-provisionnement`** (pas encore dans n8n) : son export lit `$env.BOITE_CLE_N8N`, `$env.GOOGLE_OAUTH_CLIENT_ID`,
   `$env.GOOGLE_OAUTH_CLIENT_SECRET` et `$env.N8N_API_URL`, et appelle `require('crypto')`. Sur ce n8n, les deux échoueront. Le générateur
   (`scripts/deployer-client-n8n.mjs`) doit suivre le § 5 avant tout import. `provisionnement.md:34` dit encore « n8n doit les autoriser aux
   nœuds Code ».
2. **`connecteurs/imap.md:73-85`** : même chose (le § 5, point 4).
3. **FAC-EX-0037** (§ 6) : la relance pilote perdue avant la porte.

## 8. Retour arrière (dans cet ordre)

1. **Chefs** : pour chacun, `restore_workflow_version` vers la « version publiée avant (Sonnet) » du tableau du § 6, puis `publish_workflow`.
   Rien en base à défaire : les bancs n'ont rien écrit (`effets_faits` 0).
2. **Banc de la boîte** : `restore_workflow_version` de `presti-banc-boite` vers `a86db7e8-6bdc-4c42-ba47-a02d23b3eb46`. Il redevient le banc
   de 036-032, `$env` compris ; ne pas le publier.
3. **`lib-boite-cle`** : `archive_workflow` sur `flav5A8frXl2BxPi`. Il n'est pas publié, et seul le banc l'appelle.
4. Rien à défaire en base ni sur le serveur : `cle_boite_n8n()` (0196) reste telle quelle, et aucun réglage du serveur n'a été changé.
