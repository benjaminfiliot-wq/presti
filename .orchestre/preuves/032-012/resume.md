# 032-012 — le juge des détecteurs n8n : É1, É2 et É3 fermés (chantier 4, lot L3)

Fait le 02/11/2026 par Claude Code (Opus 5.5), sur le serveur Oracle, hors ligne. Le workflow `presti-detecteurs` n'a pas été touché
(aucun appel à n8n, l'export `.orchestre/preuves/032-003/presti-detecteurs.workflow.json` est relu tel quel). Aucune donnée réelle :
identifiants `00000000-0000-4000-8000-…`, adresses `exemple.invalid`.

Réseau neuronal d'abord : `regles_pour` sur « juge hors ligne des détecteurs n8n : sécurité, plafonds par offre, bac à sable » (rendus :
`architecture-outils.md` « Où chaque outil tourne » — n8n 2.45.6 sur Oracle, bac à sable, exécuteurs ; ADR-001). Lus : l'audit
`.orchestre/preuves/032-010/rapport.md` (défauts élevés, « Ce qu'il faut pour que le lot tienne », annexes A et E), le plan du chantier 4
§9 (`chantier-4-assistant-plan.md:577-618`, table l.585-594) et §13 (l.745-762), le brief, `lib/plans.ts:149` (`peut`),
`lib/pilote/regles.ts:70-83`, le code du nœud « Niveau proposé selon l offre » dans l'export.

## Fichiers modifiés (périmètre)

| Fichier | Changement |
|---|---|
| `scripts/detecteurs-n8n-qa.mjs` | réécrit autour de l'ancien (476 → 959 lignes) : gabarit HTTP, empreintes, bac à sable enfant, propriété, 31 mutants neufs |
| `plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md` | section neuve « Ce que le juge garantit (032-012) — et ses limites » |
| `.orchestre/preuves/032-012/` | `resume.md`, `verifier.log` (sortie de la suite), `juge-avant.mjs.txt` (le juge d'avant, pour le diff de l'auditeur) |

## É1 — options HTTP : gabarit exact

- **Correctif** : `gabaritHttp` (`scripts/detecteurs-n8n-qa.mjs:244-264`), appelé pour chaque lecture (l.196) ; constantes l.72-81.
  Clés du nœud en liste blanche (`CLES_NOEUD`, l.72) ; `parameters` = exactement `method, url, authentication, nodeCredentialType,
  sendQuery, specifyQuery, queryParameters, options` ; paramètres de requête `{ name, value }` seulement ; `options` = exactement
  `timeout` (1 à 30 000 ms) et `pagination` ; pagination = exactement `paginationMode` (`updateAParameterInEachRequest`), un seul
  paramètre `qs` `offset` = `={{ $pageCount * 1000 }}`, `paginationCompleteWhen: 'other'`, `completeExpression` exacte,
  `limitPagesFetched: true`, `maxRequests` ≤ 50 ; `limit=1000` une fois, pas d'`offset` en paramètre ; un seul identifiant
  (`supabaseApi`, « Supabase account »), HTTP Request 4.5, `executeOnce`.
- **Au passage** : `settings` du workflow en liste blanche (l.171) → le mutant C7 de 032-010 (`errorWorkflow`, moitié de **M10**) rougit.
  L'autre moitié de M10 (`alwaysOutputData` exigé) reste au lot L12.
- **Mutants** (annexe A de 032-010, puis les autres portes) : C2 (next URL vers un tiers), C3 (proxy), C4 (certificats), redirections,
  réponse complète, 5 000 pages, `limitPagesFetched: false`, fin jamais atteinte, second paramètre de pagination (en-tête), offset
  changé en `select=*`, délai de 10 min, second identifiant, `sendHeaders` ajouté, `onError` ajouté, `errorWorkflow` : **15/15 rouges**,
  chacun sur la raison attendue (l.880-899).

## É2 — plafonds par offre : test par propriété

- **Correctif** : `PLAFONDS` (l.113-124, table du plan §9) et `plafond(plan, numero, conditions)` (l.126-136), calculés dans le juge
  par `peut()` importé de `lib/plans.ts`, `OUTILS_JAMAIS_AUTO` et `OUTILS_EXECUTABLES_PILOTE` importés de `lib/pilote/regles.ts` —
  jamais par la copie du workflow. `controler` (l.139-155) passe sur **chaque constat de chaque passage** : les 63 cas par détecteur
  (l.517), l'essai n8n, et la propriété. Il exige le compte lu, l'offre réelle du compte, l'outil du plan §9, `1 ≤ niveau ≤ plafond`, et
  `outil ∈ OUTILS_JAMAIS_AUTO ⇒ niveau ≤ 2`.
- **Propriété** : `jeuPropriete` (l.670-726) et `proprietes` (l.728-753) : 12 comptes fictifs (Studio, Signature, Entreprise × impayés
  cochés ou non × réponse `auto` ou `assistee`), et pour chacun de quoi déclencher les 10 détecteurs à plusieurs étapes (n° 1 : J+3,
  J+10, J+21 ; n° 4 : J+3, J+7, J+14 ; n° 8 : 7 et 1 jours restants ; n° 6 : J+1, J+3, J+10 ; n° 3 : 10, 30, 100 % d'acompte…) et
  cinq montants (1 €, 999,99 €, 1 000 €, 12 345,67 €, 100 000 €), rejoués deux jours (10/11, et 30/03, lendemain de l'heure d'été).
  Chaque cas doit déclencher (le n° 10 doit se taire sans `crm`) ; le jeu doit contenir au moins un niveau 3. Résultat : 1 632 cas,
  2 104 constats, niveaux `{1: 0, 2: 1384, 3: 720}`, tous sous le plafond.
- **Mutants** jugés **sans les empreintes** (sinon l'empreinte seule les verrait) : D1, D2, D3, D4, D5, D6 de 032-010, plus « n° 1 au
  niveau 3 en Signature sans impayés cochés » et « outil de la facture renommé pour sortir de OUTILS_JAMAIS_AUTO » : **8/8 rouges**
  (l.902-909). D2, D3, D4, D6 tombent sur la propriété (`propriété du 2026-11-10 : … niveau 3 au-dessus du plafond 2`) ; D1 et D5 sur
  le contrôle des cas par détecteur (`cas 47`, `cas 54`), qui passent désormais tous par `controler`.

## É3 — code des nœuds : empreinte et bac à sable

- **(a) Empreintes** : `EMPREINTES` (l.87-104, sha256 des 16 `jsCode`) et `empreintes(wf)` (l.280-290) ; une différence, un nœud Code
  ajouté ou absent → « … — nouvel audit requis ». C'est la seule barrière pour « Preuve de connexion », que le rejeu ne joue pas : le
  mutant « fetch masqué dans Preuve de connexion » ne rougit que par elle.
- **(b) Bac à sable** : `enfant()` (l.299-419) tourne dans un **processus enfant** lancé par `BacASable` (l.422-447) :
  `node --permission --disallow-code-generation-from-strings -e <code>` sans aucune `--allow-*` (l.426), environnement vide (seul
  `SystemRoot` sous Windows), sortie standard fermée. Chaque nœud a un contexte vm neuf `vm.createContext(vm.constants.DONT_CONTEXTIFY,
  { codeGeneration: { strings: false, wasm: false } })` (l.365) : aucun objet de l'hôte n'y entre (données en texte JSON relues dedans,
  résultat relu en texte) ; `fetch`, `process`, `require`, `module`, `Buffer`, minuteries, `helpers`, `$execution`,
  `getWorkflowStaticData`, `Function`, `eval`, `WebAssembly`… sont des pièges non reconfigurables, `this` est un Proxy piège, les
  constructeurs de fonction sont remplacés : chaque tentative est **notée même si le code la rattrape**, relue par une boucle que le
  code ne peut pas remplacer, et fait rougir. Le harnais ne s'appelle qu'une fois. Dans l'enfant même, `fetch`, `require`,
  `process.getBuiltinModule`, `binding`, `dlopen` sont retirés avant tout code (défense en profondeur).
- **Sonde à chaque passage** (`bacASable`, l.816-836) : écriture, lecture, processus, worker dans l'enfant → `ERR_ACCESS_DENIED`
  exigé ; le code de l'annexe E de 032-010 à l'identique (l.803) → refusé ; une version qui rattrape chaque refus (l.804-815) → les
  9 tentatives (`Function('return this')`, constructeur de fonction, `globalThis.constructor.constructor`, `this.helpers`, `fetch`,
  `process`, `require`, `eval` indirect, `setTimeout`) rendent « refus ».
- **Mutants** sans les empreintes : C5 (`this['help'+'ers']['http'+'Request']`) → `accès refusé par le bac à sable (this.helpers)` ;
  C6 (`Function('return this')()['fe'+'tch']`) → `(Function)` ; annexe E (process et disque, refus rattrapé) → `(Function)` ;
  `({}).constructor.constructor('return process')()` rattrapé → `(génération de code …)` ; `setTimeout` masqué → `(setTimeout)`.
  Avec les empreintes : un espace ajouté, fetch masqué dans « Preuve de connexion », nœud Code ajouté → « nouvel audit requis ».
  **8/8 rouges** (l.912-919).
- **La sonde sait rougir** (essai hors dépôt, copie du juge dans `/tmp/proto-032-012/`, non versionnée) : sans `--permission` →
  `✗ bac à sable : le modèle de permissions de Node est inactif`, `ecriture PERMIS`, `lecture PERMIS`… ; contexte vm classique
  (`createContext({})`, pièges retirés) → `✗ l'évasion de l'annexe E passe sans refus`, `✗ l'évasion rattrapée atteint
  global_par_Function (object)`, `… eval_indirect (object)`, `ÉCHEC`. Le fichier de sonde écrit par la copie sans permission
  (`/tmp/detecteurs-n8n-qa-sonde.txt`) a été effacé ; la suite du dépôt n'a jamais pu l'écrire.

## La sortie de la suite

`node scripts/orchestre.mjs verifier 032-012` → `✓ 032-012 : PASS · 87s · 1645 ligne(s)` ; sortie complète dans `verifier.log`. Fin :

```text
detecteurs-n8n-qa : 34 nœuds (16 Code, 15 lectures GET), 49 mutants, 87 s
  ✓ structure : inactif, lectures seules, select= limité aux colonnes permises, aucune écriture, aucun envoi, aucun modèle
  ✓ É1 gabarit HTTP exact : parameters, options, pagination (offset seul, fin exacte, ≤ 50 pages), un seul identifiant
  ✓ É3 empreintes : 16 nœuds Code épinglés (sha256), identiques au code audité
  ✓ É3 bac à sable : processus enfant --permission --disallow-code-generation-from-strings (Node v24.21.0) — écriture ERR_ACCESS_DENIED, lecture ERR_ACCESS_DENIED, processus ERR_ACCESS_DENIED, worker ERR_ACCESS_DENIED ; réseau PERMIS (Node v24.21.0 n’a pas de barrage réseau : le code n’y atteint pas, faute de tout objet de l’hôte dans son contexte — voir l’évasion ci-dessous)
  ✓ É3 évasion de l’annexe E (032-010) : refusée (Function interdit dans un nœud Code (bac à sable du juge)) ; version rattrapée : {"global_par_Function":"refus","constructeur_hote":"refus","constructeur_global":"refus","this_helpers":"refus","fetch":"refus","process":"refus","require":"refus","eval_indirect":"refus","minuterie":"refus"}
  ✓ copies : capacités = lib/plans.ts ; listes d’outils = lib/pilote/regles.ts ; seuils sourcés = le code
  ✓ détecteurs : déclenchent, se taisent, tiennent à la limite, changent de clé d’étape ; n° 5 muet ; n° 7 jamais 3
  ✓ É2 propriété : 1632 cas (10 détecteurs × 3 offres × impayés × réponse × étapes × montants de 1 € à 100 000 €, 2 jours), 2104 constats, niveaux {"1":0,"2":1384,"3":720}, tous ≤ plafond(offre, détecteur) ; outil de OUTILS_JAMAIS_AUTO ⇒ niveau ≤ 2 sur chaque constat de chaque cas
  ✓ essai n8n (exécution 320) rejoué hors ligne : même bilan
OK
```

Les 18 mutants d'avant restent rouges ; les mutants du code d'avant le sont désormais **sans** les empreintes.

## Risques et limites (dits aussi dans le brief)

1. **Réseau de l'enfant** : Node 24.21.0 n'a pas de barrage réseau dans `--permission` (la sonde le mesure par une vraie connexion vers
   `127.0.0.1:9`, refermée aussitôt, et l'écrit ; `process.permission.has('net')` rend `false` et ment). Le code rejoué n'atteint pas le
   réseau faute de tout objet de l'hôte dans son contexte (prouvé par C5, C6 et les deux évasions) ; seule une faille de V8 ouvrirait la
   porte. Node 25 et suivants la ferment d'office (`--allow-net` absent). Option : faire tourner le juge sous Node 25 sur le PC.
2. **Durée** : 87 s (49 suites complètes dans un seul processus enfant, un contexte vm neuf par nœud). Une suite à la fois.
3. **Le juge n'est toujours pas dans `SUITES`** de `scripts/tout-verifier.mjs` (F5 de 032-010) : hors de mon périmètre.
4. **Une empreinte neuve** se pose après un audit distinct ; le juge ne dit pas qui a audité.
5. M1 à M12 (sauf la moitié `errorWorkflow` de M10) restent au lot L12, comme la tâche le demande.

## Question pour la session principale — (c) ce que l'exécuteur de code de n8n 2.45.6 permet sur Oracle

Je n'ai pas accès à `/opt/n8n-complet` ni au MCP n8n. À relever sur Oracle (`docker compose config`, variables du conteneur n8n et des
exécuteurs de tâches) avant toute publication du workflow :
- `N8N_RUNNERS_ENABLED` / `N8N_RUNNERS_MODE` (`internal` ou `external` : le code tourne-t-il dans le processus de n8n ?) ;
- `NODE_FUNCTION_ALLOW_BUILTIN` et `NODE_FUNCTION_ALLOW_EXTERNAL` (vides = aucun module ; `*` = tous, dont `http`, `child_process`) ;
- ce que `this.helpers.httpRequest` et `fetch` donnent dans un nœud Code de cette instance (un essai sur un workflow jetable, vers
  `exemple.invalid`, jamais avec l'identifiant « Supabase account ») ; le réseau sortant du conteneur des exécuteurs.

Options :
1. **Relever ces réglages sur Oracle et les écrire dans le brief** (section « Ses limites ») avant le « go » de publication — recommandé :
   l'empreinte protège l'export audité, mais c'est n8n qui exécute.
2. Fermer d'office : `NODE_FUNCTION_ALLOW_BUILTIN` et `NODE_FUNCTION_ALLOW_EXTERNAL` vides, exécuteurs externes sans réseau sortant
   (geste sur le serveur, avec l'accord de Benj), puis relever.
3. Laisser en l'état et compter sur le juge seul (déconseillé : il juge l'export, pas ce que n8n fait tourner).

## Suite

Un audit par un agent distinct de moi, avant toute publication du workflow (exigence de la tâche et de 032-010). Il trouvera le juge
d'avant dans `juge-avant.mjs.txt` pour le diff.

TACHE 032-012 FAITE
