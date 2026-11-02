# 032-016 — audit offensif du juge des détecteurs n8n réécrit par 032-012 (chantier 4, lot L3)

Fait le 02/11/2026 par Claude Code (Opus 4.8), sur le serveur Oracle (hôte d'agents, 24 Go), hors ligne, en lecture seule. Je n'ai écrit
ni le workflow `presti-detecteurs`, ni son juge `scripts/detecteurs-n8n-qa.mjs`, ni l'audit 032-010, ni le correctif 032-012. Rien n'a été
modifié hors de `.orchestre/preuves/032-016/`. Aucun appel à n8n ni à Supabase. Aucune donnée réelle : identifiants inventés
`00000000-0000-4000-8000-…`, hôtes `exemple.invalid`. Mes scripts d'attaque ont tourné dans `/tmp/atk-032-016/` (hors du dépôt) ; leur code
est copié en preuve ici (`evasion2.mjs`, `evasion3.mjs`, `couverture.mjs`, `_sandbox-extrait.js`) et résumé en annexe.

Réseau neuronal d'abord (MCP `cerveau`) : `regles_pour` sur « n8n, détecteurs, sécurité, offres » (rendus : ADR-006, et la règle « comptes
non Presti intouchables ») ; `chercher` « presti-detecteurs juge n8n bac à sable » (rendus : ADR-001 « tout dans n8n », ADR-003 Oracle, l'état
de l'instance n8n 2.45.x sur Oracle avec exécuteurs et bac à sable). Lus ensuite : la règle n8n-first (`.claude/rules/architecture-outils.md`),
le plan du chantier 4 §9 (`chantier-4-assistant-plan.md:577-618`), `lib/plans.ts` (capacités par offre, `peut`), `lib/pilote/regles.ts`
(`OUTILS_JAMAIS_AUTO`, `OUTILS_EXECUTABLES_PILOTE`), l'audit `.orchestre/preuves/032-010/rapport.md` (É1, É2, É3, annexes A et E), le résumé du
correctif `.orchestre/preuves/032-012/resume.md`, le juge entier, et l'export `.orchestre/preuves/032-003/presti-detecteurs.workflow.json`.

## La règle du verdict (celle de 032-010, reprise par la tâche)

**NE TIENT PAS** s'il reste au moins un défaut ÉLEVÉ : un juge qui reste vert sur une lecture de donnée personnelle, une écriture, un envoi,
un appel à un modèle ou une sortie réseau possible depuis le workflow ; sur un compte lu pour un autre ; sur un niveau au-dessus de ce que
l'offre permet, un geste §3.2 ou une facture qui partirait seule ; ou un juge qu'on peut faire exécuter du code hors de son bac à sable sur la
machine qui lance `verifier`. **TIENT** sinon ; les défauts moyens et faibles se listent pour le lot L12.

## Verdict en une ligne

Le juge réécrit par 032-012 ferme les trois défauts élevés de 032-010. J'ai attaqué chacune de ses garanties — gabarit HTTP, plafonds par
propriété, empreintes, bac à sable — et n'ai **trouvé aucun défaut élevé qui survive**. Treize évasions du bac à sable, dont celles de
l'annexe E de 032-010 et six vecteurs neufs, sont toutes arrêtées ; le code du workflow n'est jamais exécuté hors du processus enfant.
Restent des points **moyens et faibles** pour le lot L12 (dont certains déjà listés par 032-010).

VERDICT : TIENT

## Ce que j'ai éprouvé, garantie par garantie

### É1 — gabarit HTTP exact : fermé par construction (liste blanche)

Le juge compare chaque nœud HTTP à un gabarit **exact** : `clesExactes(p.options, ['timeout', 'pagination'])` et
`clesExactes(p, CLES_HTTP)` (`detecteurs-n8n-qa.mjs:249,252`) rejettent **toute** clé absente de la liste blanche, pas seulement celles qu'un
auteur a pensées. J'ai cherché une porte de sortie non couverte ; il n'y en a pas, parce que la logique est inversée depuis 032-010 : ce n'est
plus « ces clés-ci sont interdites » mais « seules ces clés-ci sont permises ».

- `options` = exactement `{timeout, pagination}` → `proxy`, `allowUnauthorizedCerts`, `redirect`, `response`, `batching`, `lowercaseHeaders`,
  `queryParameterArrays`… rougissent tous sans être nommés (`options HTTP hors gabarit`). Les mutants C3, C4, redirection, réponse complète du
  juge le prouvent, et tout autre nom tombe pareil.
- `parameters` = exactement `CLES_HTTP` → `sendBody`, `sendHeaders`, `jsonParameters`, `headerParameters`… rougissent (`paramètres HTTP hors
  gabarit`). Mutants « sendHeaders posé à faux », « onError » (clé de nœud).
- Pagination = exactement `updateAParameterInEachRequest`, un seul `qs`/`offset = {{ $pageCount * 1000 }}`, `completeExpression` à la lettre,
  `limitPagesFetched: true`, `maxRequests ≤ 50`. La « next URL » vers un tiers (C2, la sortie réseau de 032-010), les 5 000 pages, la fin
  jamais atteinte, un second paramètre : tous rouges.
- `url` doit commencer par `BASE` (l.202) et la table doit être dans `PERMISES` ; un hôte collé en biais (`…supabase.co.evil.com/…`,
  `…/rest/v1/@evil/…`) ne commence pas par `BASE` ou donne une table hors liste → ko.
- Un seul identifiant, `supabaseApi` « Supabase account » (`clesExactes(n.credentials, ['supabaseApi'])`, l.248) → un second identifiant
  (en-tête générique) rougit.
- Un 16ᵉ nœud HTTP, un 2ᵉ Supabase, un 2ᵉ déclencheur, un nœud d'un type hors `TYPES_PERMIS`, un nœud Code en plus : tous bloqués par les
  comptes de `structure` et par les empreintes (É3).

**Aucune sortie réseau depuis une lecture ne laisse le juge vert.** É1 tient.

### É2 — plafonds par offre : la table du juge = plan §9 = lib/plans.ts, et `controler` passe sur chaque constat

J'ai recoupé **chaque ligne** de `PLAFONDS` (`detecteurs-n8n-qa.mjs:113-124`) avec le tableau du plan §9
(`chantier-4-assistant-plan.md:585-594`) et avec `lib/plans.ts` / `lib/pilote/regles.ts` :

| n° | outil (juge) | max (juge) | condition | plan §9 | `peut`/listes | verdict |
|---|---|---|---|---|---|---|
| 1 | relancer_facture | 3 | impayés | 1-2 · **3** · comme Signature | ∈ EXECUTABLES, ∉ JAMAIS_AUTO | OK |
| 2 | creer_facture | 2 | — | 1-2 partout (jamais émise seule) | ∈ JAMAIS_AUTO → plafonné à 2 | OK |
| 3 | creer_facture | 2 | — | 1-2 partout | ∈ JAMAIS_AUTO | OK |
| 4 | relancer_devis | 3 | — (relances.auto) | 1-2 · **3** · comme Signature | ∈ EXECUTABLES | OK |
| 5 | envoyer_facture | 0 | — | coupé | — | OK |
| 6 | valider_reponse_proposee | 3 | auto (ia.auto) | 1-2 · **3** en auto · comme Signature | ∈ EXECUTABLES | OK |
| 7 | creer_devis | 2 | — | 2 au plus partout | ∉ EXECUTABLES → jamais 3 | OK |
| 8 | relancer_devis | 3 | — (relances.auto) | comme n° 4 | ∈ EXECUTABLES | OK |
| 9 | preparer_liste_achat | 2 | — | 1-2 partout | ∉ listes | OK |
| 10 | demander_avis | 2 | — | 1-2 partout | ∉ EXECUTABLES | OK |

Aucun écart. Les capacités le confirment (mesuré, annexe) : Studio n'a ni `assistant.pilote`, ni `plateforme.ia.auto`, ni `relances.auto`, ni
`factures.relances.auto` → `plafond()` ne lui donne jamais 3 ; Signature et Entreprise les ont (`peut('entreprise', 'assistant.pilote')=true`,
« même autonomie que Signature », `lib/plans.ts:103`). `creer_facture`/`creer_facture_libre` sont dans `OUTILS_JAMAIS_AUTO` → `plafond`
les cape à 2 **et** `controler` re-vérifie `outil ∈ OUTILS_JAMAIS_AUTO ⇒ niveau ≤ 2` sur **chaque constat de chaque cas** (l.153), plus la
règle « une facture partirait seule » du jeu riche (l.641).

Surtout, le contrôle n'est plus sur un seul jeu : `controler` (l.139-155) passe sur les 1 632 cas de la propriété (l.737), les 63 cas par
détecteur et l'essai n8n, et calcule le plafond **dans le juge** par `peut()` importé, jamais par la copie du workflow. Les huit mutants D
(niveau 3 en Studio, facture au niveau 3, n° 7 au niveau 3 en Entreprise…) rougissent tous sur `plafond` ou `geste §3.2` (vérifié, baseline).
Je n'ai pas trouvé d'offre, de détecteur ou de condition où un niveau au-dessus de l'offre passe. É2 tient.

### É3 (a) — empreintes : tout changement de code est vu

`empreintes(wf)` (l.280-290) épingle le sha256 des 16 `jsCode` et exige que chaque nœud Code ait une empreinte **et** que chaque empreinte
épinglée existe. Conséquences, vérifiées :

- **Nœud ajouté** → « sans empreinte épinglée » (mutant du juge, rouge).
- **Nœud renommé** → double rouge : le nouveau nom n'a pas d'empreinte, l'ancien nom épinglé est absent.
- **Un octet changé** (un espace) → sha256 différent → « nouvel audit requis » ; même un `fetch` masqué dans « Preuve de connexion » (le seul
  nœud non rejoué) est pris par là, pas par le rejeu.
- **Déplacé** : si « déplacé » veut dire `position` (coordonnées du canevas), l'empreinte passe — mais `position` n'a aucun effet sur
  l'exécution ni la sécurité (cosmétique). Si « déplacé » veut dire recâblé dans le graphe : le code reste épinglé, et un recâblage ne crée
  aucune porte de sortie (les nœuds HTTP sont jugés par le gabarit quel que soit le câblage ; les nœuds Code ne peuvent rien exfiltrer, É3 b).
  La chaîne des détecteurs est vérifiée exactement (`chaineDepuis`, l.239). Point faible, pas élevé (voir « Moyens », graphe partiel).

Sur l'export réel, le juge tourne **avec** les empreintes : donc toute mutation d'un nœud Code rougit avant même le rejeu. É3 (a) tient.

### É3 (b) — le bac à sable du rejeu : aucune évasion, et aucun code hors du bac

C'était la cible principale. Le point (2) de 032-010 — « `verifier` exécute, avec tous les droits du poste, le code de l'export » — est **fermé** :
tout le code du workflow passe par `BAC.demander({type:'executer'|'passer'})` → IPC → `vm.runInContext` dans le **processus enfant**
(`enfant()`, l.299-419), lancé `node --permission --disallow-code-generation-from-strings`, environnement vide, stdout ignoré. Le côté hôte du
juge ne fait que du texte : `readFileSync`, `sha256`, des regex, `JSON`. `codeDe(wf, nom)` lit une chaîne, ne l'exécute jamais. `-e CODE_ENFANT`
ne porte que le code du juge (`enfant.toString()`), jamais celui du workflow.

J'ai reconstruit **à l'identique** ce bac à sable hors du dépôt (`_sandbox-extrait.js` = copie verbatim des lignes 299-447) et lui ai envoyé
treize évasions (`evasion2.mjs`, `evasion3.mjs`, `couverture.mjs`). Résultats (sorties complètes en preuve) :

| Évasion | Résultat |
|---|---|
| `Error.prepareStackTrace` → `CallSite.getFunction().constructor('return process')` | les CallSite appartiennent au royaume du contexte ; `constructor` = `fauxConstructeur` → **refus** (génération de code) |
| `prepareStackTrace` → `CallSite.getThis()` | rend le Proxy `ceci` → **refus** (`this.constructor` interdit) |
| `(/x/).constructor.constructor('return this')` | Function du contexte → **refus** (génération de code coupée) |
| `(async()=>{}).constructor` / générateurs | `=== fauxConstructeur` → **refus** |
| `Object.getPrototypeOf(globalThis).constructor.constructor` | **refus** |
| `Reflect.getPrototypeOf(()=>{}).constructor` | **refus** |
| `Promise.resolve().then(exfil)` | le callback tourne dans le contexte (aucun objet hôte) → sans effet |
| getter `json` tardif (à la sérialisation) | tourne dans le contexte → **refus** sur Function |
| `WebAssembly`, `import` | piégé / erreur de syntaxe |
| APIs web (`crypto`, `fetch`, `structuredClone`, `atob`…) | **absentes** du royaume |
| `console` | présent, non piégé, mais `console.constructor` = Function du contexte (refus) et son stdout est ignoré |

**Constat central, à inscrire au brief.** Le royaume du contexte (`vm.constants.DONT_CONTEXTIFY`) n'est **pas vierge** : il contient les vrais
globaux de Node — `process`, `require`, `module`, `exports`, `Buffer`, `global`, `setTimeout/Interval/Immediate`, `fetch`, `WebSocket`,
`XMLHttpRequest`, `EventSource`, `helpers`, `$http`… (énumérés, `couverture.mjs`). La défense n'est donc pas « il n'y a pas d'objet de
l'hôte », mais trois murs qui tiennent ensemble : (1) la liste `PIEGES` **masque** chacun de ces noms par un piège `get/set` non
reconfigurable — et j'ai vérifié que **tout** nom dangereux du royaume est couvert (« NON couverts par PIEGES : (aucun) ») ; (2)
`--disallow-code-generation-from-strings` + `codeGeneration:{strings:false,wasm:false}` tuent `Function`/`eval`, donc aucun constructeur ne
régénère de code, même atteint depuis un autre royaume ; (3) les `constructor` des quatre prototypes de fonction sont remplacés. Comme aucun
objet de l'hôte n'entre par les données (texte JSON) ni ne sort (texte), et qu'aucun primitif réseau n'est joignable depuis le contexte, le
code du workflow n'atteint rien. Les deux évasions de 032-012 (annexe E et sa version rattrapée) et mes treize restent toutes « refus ».

La seule réserve est une **défense en profondeur**, pas un trou : (voir « Moyens ») la liste `PIEGES` est une **liste noire** liée à la version
de Node, et le réseau de l'enfant n'est pas coupé sur Node 24. Aucun des deux n'ouvre une porte aujourd'hui, car le code ne joint aucun
primitif réseau et aucun nom dangereux n'échappe à la liste sur Node 24.21.0. É3 (b) tient.

## Défauts MOYENS (lot L12)

1. **Bac à sable en liste noire, lié à la version de Node.** `PIEGES` énumère les noms à masquer. Sur Node 24.21.0 la couverture est
   complète (mesuré). Mais une version future de Node peut exposer un global neuf (ex. un `navigator`, un `crypto` par défaut, une nouvelle
   API réseau) que la liste ne masquerait pas ; combiné à une faille de code-gen, il deviendrait une capacité. **Correctif** : passer d'une
   liste noire à une liste blanche — après le préambule, `delete`/geler tout nom de `globalThis` hors d'un petit ensemble sûr (built-ins ECMA +
   `console`), plutôt que n'en masquer qu'une liste connue. Et ajouter une sonde qui échoue si un nom hors liste blanche apparaît dans le
   royaume (elle attraperait une régression de Node). Même esprit que la réserve #1 du résumé de 032-012.
2. **Réseau de l'enfant non coupé (Node 24).** `process.permission` ne barre pas le réseau avant Node 25 ; la sonde le mesure (`réseau
   PERMIS`) et le juge ne fait que le documenter. Le code du workflow ne peut pas s'en servir (pas de `net`, pas de `fetch`, pas de `require`,
   `Function` mort dans le contexte), donc ce n'est pas une sortie réseau depuis le workflow — mais c'est un filet manquant. **Correctif**
   (résumé 032-012, réserve #1) : faire tourner le juge sous Node ≥ 25 (barrage réseau d'office) ou, à défaut, faire **échouer** la sonde si
   le réseau est permis au lieu de seulement l'écrire.
3. **Filtre de compte neutralisable par une expression (M1 de 032-010, toujours ouvert).** Le gabarit accepte `={{ … }}` dans la **valeur**
   d'un filtre (l.219) : `artisan_id = ={{ 'not.is.null' }}` passe, et une lecture peut alors ramener les lignes de tous les comptes. Ce n'est
   pas élevé : `select=` est en liste blanche de colonnes **non personnelles**, donc même élargie la lecture ne sort aucune donnée personnelle
   ; mais c'est un décloisonnement entre comptes. **Correctif** (déjà au L12) : figer la valeur attendue des trois filtres de « Lire comptes »
   et exiger `artisan_id = ={{ … $json... }}` conforme, pas une expression libre.
4. **Graphe de connexions validé en partie.** `structure` vérifie exactement la chaîne des détecteurs, mais pas tout le graphe (les nœuds
   avant « Départ » — Preuve de connexion, Contexte, Capacités, les 15 lectures — ne sont pas vérifiés dans leur câblage). Aucun chemin
   d'exfiltration n'en découle (HTTP jugé hors câblage ; Code en bac à sable), mais un recâblage pourrait changer l'ordre de lectures pures
   sans être vu. **Correctif** : valider le graphe entier (chaque nœud a exactement les entrées/sorties attendues).
5. **M2–M12 de 032-010** (mélange de comptes sur données incohérentes, statuts manquants, double relance, seuils sans source, repli `maj_le`,
   `alwaysOutputData`, liste blanche des champs d'un constat, identifiant « Supabase account »/hôte) restent ouverts et assignés au L12. Ce
   sont des défauts de **justesse métier** ou de durcissement, pas des barrières de sécurité contournées. M3, M4 et M12 en premier (032-010).

## Défauts FAIBLES

- Le juge n'est toujours pas dans `SUITES` de `scripts/tout-verifier.mjs` (F5 de 032-010/032-012, réserve #3) : personne ne le rejoue ni en
  local ni à l'audit de nuit. Hors de mon périmètre ; à inscrire au L12.
- `position` d'un nœud Code n'est pas couverte par l'empreinte (cosmétique, sans effet).
- Durée : 84 s, un seul processus enfant, un contexte vm neuf par nœud. Une suite à la fois (4 cœurs). Acceptable.
- Une empreinte neuve se pose après un audit distinct ; le juge ne dit pas qui a audité (réserve #4 de 032-012).

## Ce qui reste à la session principale avant publication (hors de mon accès, rappel de 032-012)

Je n'ai ni le MCP n8n ni l'accès à `/opt/n8n-complet`. Le juge juge l'export ; c'est n8n qui exécute. Avant le « go », relever sur Oracle et
inscrire au brief : `N8N_RUNNERS_ENABLED`/`N8N_RUNNERS_MODE`, `NODE_FUNCTION_ALLOW_BUILTIN`/`NODE_FUNCTION_ALLOW_EXTERNAL` (vides = aucun
module), et ce que `this.helpers.httpRequest`/`fetch` donnent dans un nœud Code de cette instance (essai jetable vers `exemple.invalid`,
jamais avec l'identifiant « Supabase account »). L'empreinte protège le texte audité ; elle ne décide pas de ce que l'exécuteur de n8n permet.

## Comment reproduire

- Le juge sur l'export du dépôt : `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/detecteurs-n8n-qa.mjs` →
  `OK` (Node v24.21.0, 84 s ; sortie complète dans `verifier.log`).
- Mes évasions, hors du dépôt, sur une copie verbatim du bac à sable :
  `node --experimental-strip-types /tmp/atk-032-016/evasion2.mjs` (E1-E7), `…/evasion3.mjs` (E8-E13, énumération du royaume),
  `…/couverture.mjs` (couverture `PIEGES` vs royaume). Les scripts sont copiés ici en preuve ; `_sandbox-extrait.js` est la copie exacte des
  lignes 299-447 du juge.

## Annexes (code des attaques)

Les scripts sont déposés dans ce dossier. `_sandbox-extrait.js` : copie verbatim de `enfant()` + `BacASable` du juge (lignes 299-447), pour
éprouver le bac à sable réel sans toucher le dépôt. `evasion2.mjs` / `evasion3.mjs` : les treize charges d'évasion (prepareStackTrace sur
`getFunction` et `getThis`, `RegExp.constructor.constructor`, Async/Generator constructor, proto du global, chaîne Reflect, Promise tardif,
getter `json` tardif, WebAssembly/import, APIs web, énumération `Object.getOwnPropertyNames(globalThis)`, `captureStackTrace`). `couverture.mjs`
: compare les noms dangereux réellement présents dans le royaume à la liste `PIEGES` (résultat : aucun non couvert). Toutes les charges
rendent « refus », « undefined » ou une erreur ; aucune n'atteint un objet de l'hôte.

TACHE 032-016 FAITE
