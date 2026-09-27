# 026-005 — réparation du 27/09 : l'invariant ne juge plus que le script

Deux sessions de réparation ont écrit ce rapport, puis ont été coupées. Une session de reprise, le 27/09 à partir de
22 h 57 (Paris), a tout rejoué elle-même sans rien modifier au script ni au juge :
- le vert (IQ-1 à IQ-14) ;
- les deux rouges : l'ancien script, puis l'invariant neutralisé ;
- l'autotest, que la coupure avait laissé sans résultat.

Elle a aussi vérifié sur le poste ce que le bac n'exerce pas. Ses résultats portent la mention « session de reprise ».

Fichiers touchés par la réparation, aucun commité :
- `scripts/instantane-quotidien.mjs`
- `scripts/instantane-quotidien-qa.mjs`
- `scripts/fixtures/026/securite/instantane/instantane-quotidien.temoin.mjs`
- `docs/sauvegardes.md`
- ce dossier de preuves

## Le défaut

Le 27/09 à 19 h 41 (Paris), l'envoi réel de 026-007 a abouti : la branche `instantane-2026-09-27` du dépôt de
sauvegarde porte le commit `1eadc661`, dont le parent est le HEAD local du départ. Pourtant le script a rendu le code 1
et « ALERTE BENJ » (ligne de journal `ok: false`).

La cause est l'invariant local de `scripts/instantane-quotidien.mjs`, version livrée par 026-005 (commit `8875c34`,
blob `41604e02`). Il comparait trois choses avant et après le passage : `HEAD`, `git status --porcelain -uall` et
l'empreinte SHA-256 de `.git/index`. Pendant les 49 s du passage, le moteur a indexé puis commité 026-066. L'invariant
prouvait donc que le monde était resté immobile, pas que le script n'avait rien touché. Avec un moteur qui tourne
24 h/24, la tâche de 13 h serait presque toujours tombée en code 1.

Un second défaut venait de la même hypothèse. Le script désignait `HEAD` par son nom dans `read-tree HEAD` et
`diff --cached HEAD`, et par son empreinte dans `commit-tree -p`. Un commit concurrent entre les deux changeait donc la
base de l'index temporaire et la liste des fichiers scannés, sans changer le parent de l'instantané.

## L'invariant choisi

Le script prouve quatre choses, toutes attribuables à son seul processus. Ce que les autres processus font pendant ce
temps (commits, index, fichiers) ne fait plus échouer.

1. **L'enrobage, une liste fermée** (`creerGit`, règle `commandeRefusee`). Toute commande git du script passe par une
   seule fonction :
   - `read-tree`, `add`, `diff`, `rm` et `write-tree` ne partent qu'avec `GIT_INDEX_FILE` = l'index temporaire ;
   - `update-ref` ne fait que créer `refs/instantanes/quotidien-*` vers l'instantané (ancienne valeur nulle) ;
   - `push` ne porte qu'un refspec, l'instantané vers `refs/heads/instantane-*` ;
   - les autres sous-commandes sont en lecture seule (`rev-parse`, `cat-file`, `ls-tree`, `for-each-ref`,
     `ls-remote`), plus `commit-tree` ;
   - toute autre commande n'est pas lancée : erreur d'invariant, code 1.
2. **La trace git, pour les index.** Tout processus git né du script, par l'enrobage ou non, hérite de
   `GIT_TRACE2_EVENT`. Git y inscrit chaque écriture d'index avec son chemin (`do_write_index`, vérifié sur git 2.54).
   Toutes doivent nommer l'index temporaire, et il en faut au moins une : une trace muette ne prouve rien, elle fait
   échouer.
3. **La signature, pour les références.** Tout processus git né du script hérite d'une identité à jeton unique
   (`GIT_COMMITTER_NAME` et `GIT_COMMITTER_EMAIL` = `instantane-quotidien.<jeton>@presti.invalid`), que git inscrit dans
   le reflog de toute référence qu'il déplace. Trois contrôles en découlent :
   - aucun reflog hors de `logs/refs/instantanes/` ne porte ce jeton ;
   - aucune référence hors de `refs/instantanes/` ne pointe sur l'instantané ;
   - l'instantané a pour seul parent le HEAD lu au départ.
4. **La trace git, pour les commandes** (ajout de la seconde passe du 27/09, voir plus bas). Git inscrit aussi dans la
   trace l'argv de chaque processus (événement `start`). Les processus de premier niveau, ceux dont le `sid` n'a pas de
   « / », sont ceux que le script a lancés lui-même, par l'enrobage ou non. Chacun doit passer la même règle
   `commandeRefusee` que l'enrobage. Les processus que git lance lui-même ont un `sid` avec « / » et ne sont pas jugés :
   `pack-objects`, `remote-https`, `receive-pack`, crochets, gestionnaire d'identifiants. Le script retire
   `GIT_TRACE2_PARENT_SID` de son environnement pour que ses propres appels soient bien au premier niveau. L'alerte ne
   donne que le nom de la sous-commande, jamais ses arguments : l'adresse du dépôt peut porter un jeton.

S'y ajoutent deux changements :
- le HEAD est lu une fois, puis désigné par son empreinte partout (`read-tree`, `diff --cached`, `commit-tree -p`) ;
- l'index temporaire, son verrou et la trace sont retirés dans le `finally`. S'il en reste un, c'est une erreur.

L'invariant est vérifié avant l'envoi : un script qui a écrit hors de son domaine n'envoie rien. Il est vérifié une
dernière fois après, pour couvrir l'envoi lui-même. La raison d'un échec d'invariant est écrite dans l'alerte
(« ALERTE BENJ : instantané quotidien échoué (invariant : …) »). Ce sont des phrases du script, jamais une valeur. Les
autres erreurs restent tues comme avant, car leur texte pourrait porter une adresse de dépôt avec un jeton.

Rien d'autre n'a changé : exclusions, motifs de secrets, prospects, seuil de 20, journal `sauvegardes.jsonl` (même
schéma), codes 0, 1, 2 et 4, refus de forcer l'envoi.

**Effet visible :** le commit d'instantané a désormais pour *committer* `instantane-quotidien
<instantane-quotidien.<jeton>@presti.invalid>`. L'auteur reste celui de la config git.

**Limites, dites franchement :**
- une écriture dans `.git` faite par le script en Node, sans git (`fs.writeFileSync`), échappe à la trace ;
- un processus git lancé par le script avec `GIT_TRACE2_EVENT` retiré de son environnement y échappe aussi.

Le script ne fait ni l'un ni l'autre. Le juge verrait l'effet dans les deux cas : IQ-14 mesure le dépôt lui-même.

### Pourquoi la quatrième preuve

L'invariant de la première passe (1 à 3) affirmait qu'aucune référence hors de `refs/instantanes/` n'était créée ou
déplacée par le script. La signature ne le prouvait pas pour tout. Git ne tient aucun reflog pour `refs/tags/*` dans
un dépôt non nu : vérifié le 27/09, un `git tag` ne crée rien sous `.git/logs/`. Une référence supprimée perd aussi son
reflog. Un `git tag` lancé hors de l'enrobage, vers HEAD et non vers l'instantané, passait donc les trois contrôles.
Le juge le montre plus bas (sabotage « etiquette »). La trace connaît l'argv de chaque processus, elle ferme ce trou
sans rien supposer des reflogs.

## Les nouveaux critères du juge (écrits d'abord)

Dans `scripts/instantane-quotidien-qa.mjs`, hors `--reel`, chaque critère a son bac neuf, sans réseau (dépôt nu local,
`GIT_ALLOW_PROTOCOL=file`).

- **IQ-13 : le moteur écrit pendant le passage.** Un écrivain concurrent tenu par le juge travaille en boucle jusqu'à la
  sortie du script. Il écrit un fichier et l'indexe (`.git/index` réel). Une fois sur deux, il commite ses fichiers
  indexés (`git commit -- <ses chemins>`). Il crée aussi des non suivis. Le bac porte en plus un travail indexé non
  commité (`lib/indexe.ts`).

  Le juge mesure `.git/index` et les références (lues dans les fichiers, sans git) juste après chaque opération de
  l'écrivain et juste avant la suivante. Un écart entre les deux, ou un verrou pris, est une écriture étrangère. À la fin,
  il exige l'état exact que l'écrivain seul produit :
  - l'index entrée par entrée ;
  - l'historique de la branche fait de ses seuls commits, chacun avec ses seuls fichiers ;
  - les fichiers de l'arbre ;
  - aucune autre référence que des `refs/instantanes/quotidien-*` ajoutées.

  Le script doit finir en code 4 (`ok: true`, une ligne de journal) et avoir poussé un commit dont le seul parent est un
  HEAD du passage. Son dossier `TEMP` doit être vide après le passage. Il faut au moins 3 opérations et 1 commit de
  l'écrivain pendant que le script tourne, sinon le scénario n'est pas prouvé.
- **IQ-14 : le script saboté.** Trois sabotages sont injectés sous le même écrivain par une précharge (`node --import`)
  qui enrobe `execFileSync` et `spawnSync` du script. Ils partent de son processus, avec ses arguments et son
  environnement (trace, identité), sans dépendre de son texte :
  - « index » rejoue le `git add` du script sans `GIT_INDEX_FILE` ;
  - « branche » ajoute `update-ref refs/heads/main` vers l'instantané ;
  - « etiquette » ajoute `git tag iq-sabotage HEAD` : une référence hors de `refs/instantanes/`, sans reflog, qui ne
    pointe pas sur l'instantané (ajout de la seconde passe).

  Pour chacun, il faut que le sabotage se soit déclenché (témoin écrit par la précharge), que le juge voie l'écriture
  (index, ou références) malgré l'écrivain, et que le script sorte en code 1, `ok: false`, « ALERTE BENJ : » en dernière
  ligne.
- IQ-1 à IQ-12 sont gardés tels quels.

## Preuve rouge avant

Trois passages du juge final (celui de ce fichier, empreinte SHA-256 `c6c47b58…`), le 27/09 au soir. Chaque version
jugée est placée sous une `--racine` à part dans `.orchestre/travail/`, qui est ignoré par git.

**1. Le script livré par 026-005** (`git show 8875c34:scripts/instantane-quotidien.mjs`, blob `41604e02`,
`--racine=.orchestre/travail/iq-ancien`), lancé à 20:16:35Z. IQ-1 à IQ-12 et IQ-14 sont PASS. Le seul rouge :

```
FAIL IQ-13 — passage sous écriture concurrente en code 1 au lieu de 4 (« ALERTE BENJ : instantané quotidien échoué (vérifier le dépôt et le journal). ») · ligne du journal : ok: false au lieu de true
instantane-quotidien-qa : FAIL — IQ-13 · racine C:/Users/benja/Documents/presti/.orchestre/travail/iq-ancien
```

C'est la panne du 27/09, reproduite en bac. Une première session de réparation avait obtenu la même ligne avec le juge
d'alors.

**Rejoué par la session de reprise** (même juge `c6c47b58…`, même `--racine=.orchestre/travail/iq-ancien`, dont le
script a été recontrôlé : `git hash-object` = `41604e02`, identique à `8875c34:scripts/instantane-quotidien.mjs`), lancé
à 20:59:21Z, fini à 21:03:46Z. IQ-1 à IQ-12 et IQ-14 PASS, code 1. Le seul rouge, mot pour mot :

```
FAIL IQ-13 — passage sous écriture concurrente en code 1 au lieu de 4 (« ALERTE BENJ : instantané quotidien échoué (vérifier le dépôt et le journal). ») · ligne du journal : ok: false au lieu de true
instantane-quotidien-qa : FAIL — IQ-13 · racine C:/Users/benja/Documents/presti/.orchestre/travail/iq-ancien
```

IQ-14 est vert sur l'ancien script, et c'est attendu. Son invariant refuse tout mouvement du dépôt, les siens compris.
IQ-14 sert à empêcher une réparation qui affaiblirait l'invariant.

**2. Le script réparé de la première passe** (preuves 1 à 3, empreinte `2a351975…`,
`--racine=.orchestre/travail/iq-avant-etiquette`), lancé à 20:22:41Z. IQ-1 à IQ-13 sont PASS. Le seul rouge :

```
FAIL IQ-14 — sabotage etiquette : script saboté en code 4 au lieu de 1, dernière ligne « Instantané c7ced2ae87464283f974d522cf591a3e7920197e instant… » au lieu de « ALERTE BENJ : … », journal : 1 ligne(s), ok: true au lieu d'une ligne ok: false
instantane-quotidien-qa : FAIL — IQ-14 · racine C:/Users/benja/Documents/presti/.orchestre/travail/iq-avant-etiquette
```

Le juge voit l'étiquette, sinon la ligne dirait « le juge ne voit pas l'écriture du script ». C'est le script qui la
laisse passer : le trou décrit plus haut.

**3. Le script final avec `verifierInvariant` neutralisé** (`return` en première ligne,
`--racine=.orchestre/travail/iq-neutre-v2`), lancé à 20:31:18Z. Cette version prouve que IQ-14 mord sur chacun des
trois sabotages. IQ-13 y est PASS (26 opérations, dont 8 commits de l'écrivain pendant le passage). Le seul rouge :

```
FAIL IQ-14 — sabotage index : script saboté en code 4 au lieu de 1, dernière ligne « Instantané cb8ceb0fd8dfc2921589066b92d5849639e80058 instant… » au lieu de « ALERTE BENJ : … », journal : 1 ligne(s), ok: true au lieu d'une ligne ok: false · sabotage branche : script saboté en code 4 au lieu de 1, dernière ligne « Instantané dc7552b86406cfcb22995958b36486a2c62b8908 instant… » au lieu de « ALERTE BENJ : … », journal : 1 ligne(s), ok: true au lieu d'une ligne ok: false · sabotage etiquette : script saboté en code 4 au lieu de 1, dernière ligne « Instantané d80df95a2fef27aa0a555124902ccdd4617dd059 instant… » au lieu de « ALERTE BENJ : … », journal : 1 ligne(s), ok: true au lieu d'une ligne ok: false
instantane-quotidien-qa : FAIL — IQ-14 · racine C:/Users/benja/Documents/presti/.orchestre/travail/iq-neutre-v2
```

**Rejoué par la session de reprise** (`iq-neutre-v2` recontrôlé : `diff` avec le script actuel = la seule ligne
`return // NEUTRALISÉ pour la preuve` en tête de `verifierInvariant`), lancé à 20:59:24Z, fini à 21:03:58Z. IQ-1 à
IQ-13 PASS (IQ-13 : 22 opérations, dont 7 commits de l'écrivain pendant le passage), code 1. Le seul rouge, mot pour
mot :

```
FAIL IQ-14 — sabotage index : script saboté en code 4 au lieu de 1, dernière ligne « Instantané 6b9a4b587eeffaf993ea8326f5e90793c52af165 instant… » au lieu de « ALERTE BENJ : … », journal : 1 ligne(s), ok: true au lieu d'une ligne ok: false · sabotage branche : script saboté en code 4 au lieu de 1, dernière ligne « Instantané afac4a6b74529e66d369ec85eaa2b424ea92afda instant… » au lieu de « ALERTE BENJ : … », journal : 1 ligne(s), ok: true au lieu d'une ligne ok: false · sabotage etiquette : script saboté en code 4 au lieu de 1, dernière ligne « Instantané f55f0967fa8521b5837bd0804bd60e4c37b07e20 instant… » au lieu de « ALERTE BENJ : … », journal : 1 ligne(s), ok: true au lieu d'une ligne ok: false
instantane-quotidien-qa : FAIL — IQ-14 · racine C:/Users/benja/Documents/presti/.orchestre/travail/iq-neutre-v2
```

## Vert après

**Passage de référence, rejoué par la session de reprise** : `node scripts/instantane-quotidien-qa.mjs` sur le script
final (empreinte `d87a04c2…`, juge `c6c47b58…`), lancé à 20:59:17Z, en même temps que les deux passages rouges
ci-dessus. Code 0 en 4 min 15 s. Sortie complète dans `verifier-reparation-2026-09-27.log` (même dossier). Les deux
critères nouveaux :

```
PASS IQ-13 — 31 opération(s) dont 10 commit(s) de l'écrivain pendant que le script tournait (36.6 s) ; code 4, instantane-2026-09-27 → b83ab4b4d0, parent 02d3a46904 = un HEAD du passage ; index, historique, fichiers et références = l'œuvre de l'écrivain seul ; dossier temporaire vide
PASS IQ-14 — sabotage index → vu par le juge (verrou ou référence pris par un autre processus pendant git add) et refusé par le script (code 1, « ALERTE BENJ : instantané quotidien échoué (invariant : le script a écrit dans l’index rée… ») ; sabotage branche → vu par le juge (refs/heads/main déplacée (attendu : 347624a3ca, dernier commit de l'é…) et refusé par le script (code 1, « ALERTE BENJ : instantané quotidien échoué (invariant : le script a lancé une commande git… ») ; sabotage etiquette → vu par le juge (refs/tags/iq-sabotage créée (attendu : inchangée)) et refusé par le script (code 1, « ALERTE BENJ : instantané quotidien échoué (invariant : le script a lancé une commande git… »)
instantane-quotidien-qa : PASS · racine C:/Users/benja/Documents/presti
```

IQ-1 à IQ-12 sont PASS dans le même passage.

Le passage de la première session de réparation, pour mémoire :

`node scripts/instantane-quotidien-qa.mjs` sur le script final (empreinte `d87a04c2…`), lancé le 27/09 à 20:28:26Z.
Code 0 en 6 min 7 s ; deux autres juges tournaient en même temps.

```
PASS IQ-1 — premier passage en code 4 (poussé avec exclusions, 34.4 s)
PASS IQ-2 — instantane-2026-09-27 → 33b7e56bbe, parent = HEAD 44b0b3b328, arbre avec le modifié et les deux non suivis, sans .exe ni .env.local
PASS IQ-3 — HEAD, status, .git/index et 12 fichiers identiques après 4 passages ; références ajoutées : 4 refs/instantanes/quotidien-*
PASS IQ-4 — config/cles.txt exclu (motif stripe), absent de l'arbre poussé ; la valeur du faux secret n'est ni dans l'arbre, ni dans la sortie, ni dans le journal
PASS IQ-5 — prospects/liste.md exclu (motif prospect), absent de l'arbre poussé ; l’adresse du prospect n'est ni dans l'arbre, ni dans la sortie, ni dans le journal
PASS IQ-6 — gros/archive.bin (91 Mo) exclu (motif taille), absent de l’arbre et signalé dans la sortie
PASS IQ-7 — second passage → instantane-2026-09-27-2229, première branche intacte, dépôt nu sans autre référence ; ni --force, ni -f, ni --mirror, ni --all, ni --tags, ni +refs dans le script
PASS IQ-8 — dépôt introuvable → code 1, journal ok: false, référence locale gardée, « ALERTE BENJ : » en dernière ligne
PASS IQ-9 — une ligne JSON complète par passage (4) ; la première porte ok: true, instantane-2026-09-27, 7 fichiers, 262 octets
PASS IQ-10 — --sans-pousser : dépôt nu inchangé (code 4)
PASS IQ-11 — l'import n'exécute rien ; chercherSecrets et MOTIFS_SECRETS exportés ; 12 faux secrets nommés sans leur valeur, 4 textes propres (dont un JWT anon) sans signalement
PASS IQ-12 — section « Le code et l’arbre de travail » avec git fetch … instantane-… et git show <commit>:<chemin>
PASS IQ-13 — 27 opération(s) dont 9 commit(s) de l'écrivain pendant que le script tournait (37.4 s) ; code 4, instantane-2026-09-27 → ff4fffcb3b, parent 6c087758c4 = un HEAD du passage ; index, historique, fichiers et références = l'œuvre de l'écrivain seul ; dossier temporaire vide
PASS IQ-14 — sabotage index → vu par le juge (verrou ou référence pris par un autre processus pendant git add) et refusé par le script (code 1, « ALERTE BENJ : instantané quotidien échoué (invariant : le script a écrit dans l’index rée… ») ; sabotage branche → vu par le juge (refs/heads/main : 2 commit(s) depuis le départ, pas exactement les 5 …) et refusé par le script (code 1, « ALERTE BENJ : instantané quotidien échoué (invariant : le script a lancé une commande git… ») ; sabotage etiquette → vu par le juge (refs/tags/iq-sabotage créée entre deux opérations de l’écrivain) et refusé par le script (code 1, « ALERTE BENJ : instantané quotidien échoué (invariant : le script a lancé une commande git… »)
bac à sable supprimé : C:/Users/benja/Documents/presti/.orchestre/travail/instantane-qa/bac-2026-09-27T2028-18276
instantane-quotidien-qa : PASS · racine C:/Users/benja/Documents/presti
```

Le sabotage « branche » est désormais refusé dès la liste des commandes (`update-ref` hors de
`refs/instantanes/quotidien-*`). La signature des reflogs le verrait aussi, en second.

Le script réparé de la première passe était déjà vert sur IQ-1 à IQ-14, dans leur version à deux sabotages. Il l'a été
trois fois dans la première session, et une fois dans celle-ci à 20:14:22Z (code 0, 4 min 16 s).

La mesure A/B de la première session, en `--sans-pousser` sur le même dépôt jetable (200 fichiers, 20 non suivis,
91 Mo), trois tours en alternance :
- ancien script : 9,3 s, 6,2 s et 6,3 s ;
- script réparé : 8,1 s, 8,7 s et 5,6 s.

La trace ne coûte rien de mesurable. La quatrième preuve relit la même trace, déjà lue pour les index.

## Ce que le bac n'exerce pas, vérifié sur le poste (session de reprise)

Le bac pousse vers un dépôt nu local, sans gestionnaire d'identifiants ni crochet. Le passage de 13 h pousse en HTTPS
depuis presti. Trois contrôles, sans rien pousser et sans écrire dans presti :

- **Gestionnaire d'identifiants et trace.** Un `git ls-remote --heads` en lecture seule vers presti-sauvegarde, avec
  l'environnement de trace du script (`GIT_TRACE2_EVENT`, profondeur 100, sans `GIT_TRACE2_PARENT_SID`). La trace
  compte 74 lignes, 0 illisible et 0 écriture d'index. Il y a 7 départs de processus : un seul de premier niveau, le
  `ls-remote` lancé ; les 6 autres sont des enfants (`remote-https`, `credential-manager`, `config`), avec un `sid`
  qui contient « / ». Le gestionnaire d'identifiants ne produit donc ni fausse commande de premier niveau ni ligne
  illisible.
- **Crochets.** `core.hooksPath` = `.husky/_`. Il n'y a pas de `.husky/pre-push`, et `.husky/_/h` sort aussitôt en 0.
  Le `push` du script ne lance donc aucun crochet qui écrirait l'index.
- **Reflogs.** `.git/logs` de presti compte 11 fichiers, soit 492 Ko, relus en moins d'une seconde. Aucun ne porte
  déjà une signature `@presti.invalid`.

La tâche planifiée « Presti instantane quotidien » n'existe pas encore sur le poste (`Get-ScheduledTask`, 27/09 à
23 h 10). Sa pose reste l'étape 4 de 026-007, après le « oui » de Benj. Telle qu'écrite dans la fiche, elle lancera
`scripts\instantane-quotidien.mjs` depuis l'arbre de travail : le script réparé servira donc dès son premier passage,
qu'il soit commité ou non.

## Le témoin de l'autotest

`--autotest` juge un témoin (`scripts/fixtures/026/securite/instantane/instantane-quotidien.temoin.mjs`). Il portait
l'ancien invariant strict et serait tombé au rouge sur IQ-13. Le témoin a été adapté :
- trace, signature et liste des commandes relue dans la trace, comme le script ;
- le dépôt qui bouge n'est plus qu'une note ;
- les ancres des défauts plantés sont inchangées.

Trois défauts plantés sont ajoutés :
- `invariant-strict` remet l'ancien invariant et doit rougir IQ-13 ;
- `sans-invariant` retire l'invariant et doit rougir IQ-14 ;
- `sans-liste-des-commandes` retire la relecture des commandes et doit rougir IQ-14 : le sabotage « etiquette » passe.

Les rouges permis de `code-0-malgre-exclusions`, `sans-parent` et `index-reel` incluent désormais IQ-13 et, pour le
dernier, IQ-14.

Autotest de la première session (fini le 27/09 à 22:02, Paris, machine chargée) :
- le témoin était vert sur IQ-1 à IQ-14, et 15 défauts plantés sur 18 rougissaient bien ;
- `sans-pousser-ignore` est tombé en délai dépassé (25 min pour un juge), ce qui a aussi laissé un bac (`AT-menage`) ;
- `doc-sans-git-show` n'a pas rougi.

Pour ce dernier cas, la copie de la doc devait perdre sa vraie section « Le code et l'arbre de travail » (regex
de `autotest()`). Avec les fins de ligne CRLF de `docs/sauvegardes.md`, la regex actuelle la retire bien : vérifié
le 27/09 au soir, plus de section ni de `git show` dans la copie.

L'autotest de la deuxième session (lancé vers 22 h 38) a été coupé avec elle, sans résultat.

### Autotest de la session de reprise

`node scripts/instantane-quotidien-qa.mjs --autotest`, lancé seul (aucun autre juge en parallèle) à 21:06:12Z, fini à
22:01Z. Juge `c6c47b58…`, témoin `12a0fd27…`. Code 0. Sortie complète dans `autotest-reparation-2026-09-27.log`
(même dossier).

- **AT-temoin** : le témoin est vert sur IQ-1 à IQ-14 (261 s).
- **19 défauts plantés sur 19** rougissent le critère attendu, et seulement des rouges permis :
  - les trois nouveaux : `invariant-strict` → IQ-13, `sans-invariant` → IQ-14, `sans-liste-des-commandes` → IQ-14
    (sabotage « etiquette ») ;
  - les deux ratés de la première session : `sans-pousser-ignore` → IQ-10 (sans délai dépassé cette fois) et
    `doc-sans-git-show` → IQ-12.
- **AT-restauration** et **AT-menage** sont PASS : le témoin revient à l'original, et aucun bac n'est laissé.

```
instantane-quotidien-qa --autotest : PASS — 19 défauts plantés
```
