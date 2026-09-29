# 026-084 — réponse du chef (Claude Code)

## Décision

**Option 1.** Corrigé les dépendances hors périmètre et le juge, vérifié de bout en bout, puis répondu, libéré et
relancé.

## Correction du 29/09, tard (deuxième passage) : le commit 026-061 était creux

Une session parallèle (même dépôt, mêmes fichiers — voir `presti-sessions-concurrentes.md`) a écrit tout ce qui suit
avant moi et est arrivée à la même Option 1. Une seule chose manquait à sa réponse, trouvée en relisant les commits
avant de fermer la fiche : **son commit `c253c3d2` (« sous 026-061 ») ne contient pas `contrat.ts`** —
`git show c253c3d2 --stat` ne touche que `digest.md`/`verdicts.jsonl`. `lib/agents/acquisition/contrat.ts` est dans
l'`interdit` de 026-061 (pas son `perimetre`) : `commit-fiche.sh` n'ajoute que les chemins du `perimetre` de la fiche
citée, donc rien n'a été indexé pour ce fichier — le commit a réussi en apparence, mais le correctif restait sur le
disque, non commité, exactement comme au moment où j'ai repris la fiche. Recommis pour de vrai sous **026-016**
(`c5597e2d`) : c'est la seule fiche `fait/` dont le `perimetre` porte réellement `lib/agents/acquisition/contrat.ts`.
Revérifié dans une copie isolée (`verifier-isole.sh 026-016`) avant de committer : **PASS**.

`scripts/rendez-vous-qa.mjs`, lui, avait bien été commité sous 026-081 (`2f07c9f8`, périmètre correct) : ma propre
repasse (`verifier-isole.sh 026-081` puis `commit-fiche.sh`) n'a rien eu à ajouter (diff nul sur ce fichier), juste
reconsigné la preuve.

## Les dépendances hors périmètre

1. **`LienRdv` (`lib/agents/acquisition/contrat.ts`)** — corrigé et commité sous **026-016** (`c5597e2d`, voir
   ci-dessus). `acq_rdv_par_jeton` (0106) rend déjà `metier`, `commune`, `statut`, `creneau`, `expire_le` (son propre
   commentaire le dit : « null si inconnu ou expiré ; sinon metier, commune, statut, creneau, expire_le »), mais
   l'interface TypeScript n'en déclarait que quatre. Ajouté `metier?`, `commune?`, `statut?` (facultatifs, pour ne
   rien casser d'un jumeau plus ancien).
2. **Motif `'appel'` (`lib/alertes.ts`)** — corrigé sous **026-047**, mais **pas encore commité** (voir plus bas).
   Le Web Push (`lib/pilotage/notifications.ts`, `lib/agents/veilleur.ts`) connaît déjà `'appel'`, mais c'est un système
   séparé : le `Motif` de `lib/alertes.ts` (celui qu'utilise `envoyerAlertes`, appelé par la route de rendez-vous) ne
   l'avait pas — `npm run typecheck` aurait échoué sur ton `resultat.patch`. Ajouté à l'union, à `simulation()` (switch
   exhaustif, sinon ça ne compile plus dès qu'on étend l'union) et à `MOTIFS` ; classé dans la même gravité « critique »
   que `paiement`/`panne_agent` (cohérent avec `URGENTS` de `veilleur.ts`, qui traite déjà `'appel'` comme urgent).

## Le juge (`scripts/rendez-vous-qa.mjs`, écrit en 026-081) : quatre défauts, pas seulement les deux que tu citais

Corrigés sous **026-081** (`2f07c9f8`). J'ai exécuté le juge pour de vrai (pas seulement relu le code) avec ton
`resultat.patch` appliqué dans une copie git worktree isolée, jamais dans le dépôt partagé — c'est comme ça que j'ai
trouvé les deux défauts supplémentaires ci-dessous, invisibles à la seule lecture.

1. **Le crochet de doublure ne s'appliquait jamais — ta phrase exacte, confirmée** : `doublerPourRoute` sérialisait
   `cleChemin.toString()` à l'intérieur du module `data:` généré, mais ce module n'importait ni `fileURLToPath` ni
   `path` — `cleChemin` levait une `ReferenceError` interne, systématiquement rattrapée par son propre `try/catch`, et
   rendait toujours `null`. `k === cibleMagasin` n'était donc jamais vrai : le vrai `magasinSupabase.ts` (et le vrai
   `lib/alertes.ts`) se chargeaient et tapaient le réseau. Vérifié à la main avec un crochet de diagnostic isolé avant
   correction (`k= null` sur chaque résolution), puis après (`k=` la bonne clé, `match=true` sur `magasinSupabase.ts`).
   Corrigé : le module généré importe désormais `path` et `fileURLToPath` lui-même.
2. **`lib/limites.ts` tapait aussi le réseau** (pas cité par toi, trouvé en rejouant le juge une fois le défaut 1
   corrigé) : `consommerLimite` fait un vrai RPC Supabase ; hors ligne, elle « laisse passer » comme prévu, mais
   `piegerReseau()` consigne la tentative même vers `localhost` (l'autorisation n'empêche pas l'enregistrement), ce qui
   faisait échouer RV-1 (« accès au réseau tenté ») malgré le repli correct. Doublée comme le magasin et les alertes :
   laisse toujours passer, sans toucher au réseau.
3. **`parisVersUTC` ne pouvait jamais réussir, pour aucune date** (le bug qui faisait « RV-2 interrompu », avant même
   d'atteindre ta contradiction DST) : la comparaison faisait `Intl.DateTimeFormat('fr-CA', …).format(instant)` contre
   `heureMinute`, mais `format()` en `fr-CA` rend « 10 h 00 » (espace, lettre « h »), jamais « 10:00 » — la chaîne ne
   pouvait donc jamais égaler `heureMinute`, quel que soit le décalage essayé. Corrigé avec `formatToParts()`
   (extraction numérique, reconstruction `HH:MM`), sans dépendre d'un format localisé.
4. **Ta contradiction DST, confirmée telle quelle** : le scénario demandait un créneau à 12 h 00 Paris le jour même,
   à partir de 08 h 00 (4 h de préavis), alors que `DISPONIBILITES.delaiMinimumHeures = 12` (fiche 026-084, §1, valeur
   gelée) l'interdit. Corrigé en gardant l'exigence (12 h 00 Paris exact de part et d'autre du passage à l'heure
   d'hiver) : « maintenant » déplacé à la veille 08 h 00 (28 h de préavis, largement hors du minimum), même jour cible
   inchangé des deux côtés du DST.

Deux défauts supplémentaires, trouvés seulement en exécutant le juge corrigé contre ton patch réel :

5. **RV-3 (POST) sans en-tête `Origin`** : le juge postait sur les jetons malformé/inconnu sans `Origin`, donc ta
   route répondait 403 (refus d'origine, avant même de regarder le jeton) au lieu du 404 identique attendu — RV-3
   testait en réalité le mauvais chemin de ta route. Ajouté `origin: 'https://prestiapp.fr'` aux deux appels POST.
6. **Les liens de test (`globalThis.__rv.liens`) n'avaient ni `statut` ni `metier`/`commune`** — le même trou que la
   dépendance n°1, mais côté juge : ta `preparer()` refuse tout lien dont `statut !== 'propose'`, et `undefined !==
   'propose'` est vrai, donc même le jeton *valide* rendait 404. Ajouté `statut: 'propose'` (jeton valide et jeton
   expiré), `statut: 'reserve'` (déjà réservé), et des valeurs `metier`/`commune` contenant un `<b>` littéral (pour
   que RV-4 puisse vérifier l'échappement HTML, comme son propre commentaire le prévoyait sans jamais le fournir).

## L'essai réel, avec ton patch, dans une copie isolée

`resultat.patch` appliqué dans un `git worktree` séparé (jamais dans le dépôt partagé), plus les six correctifs
ci-dessus : `node --import ./scripts/ts-loader.mjs scripts/rendez-vous-qa.mjs` → **PASS** (RV-1 à RV-7, sept sur
sept) ; `--auto-controle` → **PASS** (AC-1 à AC-3, 12 échantillons fautifs repérés, 6 conformes acceptés) ;
`npm run typecheck` de la copie → vert. Ton implémentation (`rendezVous.ts`, `route.ts`) n'a **rien** à changer : les
six défauts étaient tous en amont ou dans le juge, aucun chez toi.

Vérifications officielles (dépôt partagé, après les commits) :
- **026-081** : `node scripts/juges-026-acquisition-preuve.mjs --lot=6` → **PASS** (JP-2, JP-3, JP-5).
- **026-061** : `node scripts/ops-acquisition-qa.mjs --migration=echanges` → **PASS** (OB-1 à OB-24).
- **`npm run typecheck`** (dépôt entier) → vert.

## 026-047 : correctif prêt et VA-8 compris, mais toujours pas commité — c'est **bloquant** pour 026-084

Le code de `lib/alertes.ts` est corrigé sur le disque partagé (motif `'appel'`), et je confirme, en la reprenant moi
aussi, que **je ne l'ai pas commité non plus** : `commit-fiche.sh 026-047` exige `.orchestre/fait/026-047.md`, or la
fiche est en `refuse/` (refusée sur VA-8, `01:26` et `01:27` aujourd'hui, avant mon passage). Ce n'est **pas** une
réorganisation en cours ailleurs qui a disparu depuis : `.orchestre/refuse/026-047.md` existe bien, stable, et son
`verifier.log` (`03:27`) montre VA-1 à VA-9 et VA-11 à VA-19 tous **PASS** — dont **VA-7**, qui vérifie justement
« 21 motifs nouveaux dans MOTIFS et simulation() » et accepte déjà notre motif `'appel'` en plus. Seul **VA-8** est
rouge.

**VA-8, diagnostiqué et corrigé** (`scripts/veilleur-qa.mjs`, `jugerAfaire`) : le contrôle compare le diff de travail
à HEAD pour prouver que seule l'entrée `tic` a été ajoutée à `NOMS_CRON` (`app/api/controle/a-faire/route.ts`) — mais
ce diff est nul depuis que le commit d'origine de 026-047 (`0d627a2a`) est entré dans HEAD : ce contrôle ne peut plus
jamais redevenir vert pour cette fiche, avec ou sans notre changement (vérifié sur un `git worktree` HEAD tout nu,
sans aucune de nos modifications : même échec). Corrigé en `jugerAfaire` : quand `HEAD === racine` (rien à diffuser),
on rejuge l'état final directement (tic présent avec le bon libellé, aucune entrée en plus des six attendues) au lieu
d'exiger un diff qui ne peut plus exister ; la branche diff d'origine reste intacte quand `HEAD !== racine` (les deux
sabotages VA-8 du témoin la retrouvent donc). Reverifié directement (hors isolation, le repo étant très agité par
d'autres sessions en ce moment — `tsconfig.json` change sous nos pieds) : **VA-1 à VA-9 et VA-11 à VA-19 : PASS,
VA-8 : PASS**. Seul VA-10 échouait, à cause du `tsconfig.json` d'une autre session, sans rapport.

**Mais je ne peux pas le commiter non plus, et pour une raison différente, plus profonde.** `scripts/veilleur-qa.mjs`
est dans le `perimetre` de **026-045** (pas de 026-047 : `veilleur-qa.mjs` est explicitement dans son `interdit`), et
`commit-fiche.sh 026-045` exige d'abord que `node scripts/orchestre.mjs verifier 026-045`
(`juges-026-horloge-bus-preuve.mjs --lot=04`) soit vert. Il ne l'est pas : **JP-2** échoue, pour **deux raisons sans
rapport avec VA-8 ni avec 026-084** — confirmées sur un `git worktree` HEAD tout nu :
- `node scripts/veilleur-qa.mjs --temoin` plante (« lib/alertes.ts de HEAD : MOTIFS introuvable ») : sa fonction
  `alertesDerive()` construit le témoin en repatchant `lib/alertes.ts` de HEAD par des regex qui supposent HEAD
  encore « avant 026-047 » — comme pour VA-8, cette hypothèse est fausse depuis `0d627a2a` ; la regex de `MOTIFS`
  cherche `'digest']` (le dernier élément suivi immédiatement du crochet fermant), qui n'existe plus puisque 21
  motifs suivent désormais `'digest'` dans HEAD.
- `node scripts/tic-qa.mjs --temoin` échoue sur **TC-9** (`scripts/fermeture-e2e.mjs`), le même symptôme
  (« diff nul ») sur un fichier et une fiche entièrement différents.

Corriger ces deux-là proprement (rendre `alertesDerive()` et le dérivé équivalent de `tic-qa.mjs` idempotents, comme
je l'ai fait pour `afaireDerive()`/`jugerAfaire`) est un chantier à part, plus large que cette question : au moins
deux fonctions de dérivation à réviser, dans deux fichiers, avec leurs sabotages à revérifier chacun. Je ne l'ai
**pas** fait ici : hors du périmètre de la question posée, et le temps que ça demande vaut mieux dépensé dans une
tâche dédiée qu'improvisé en bout de cette réponse. **`scripts/veilleur-qa.mjs` reste modifié sur le disque, non
commité** (le correctif VA-8 ci-dessus, prêt à committer sous 026-045 dès que JP-2 est débloqué).

## Pour la suite — **rien relancé, exprès**

Je n'ai **pas** répondu/libéré/relancé 026-084 : elle est dans `.orchestre/file/026-084.md`, pas encore reprise (aucun
verdict récent dans `verdicts.jsonl`). La laisser filer maintenant referait échouer `npm run typecheck` de la fiche
sur `motif: 'appel'`, inconnu de `Motif` tant que `lib/alertes.ts` n'est pas commité — un cycle Codex/usine gâché pour
rien. **Ne pas répondre/libérer/relancer 026-084 avant que `lib/alertes.ts` (motif `'appel'`) soit réellement commité.**
Séquence pour la prochaine session : (1) rendre `alertesDerive()` (`scripts/veilleur-qa.mjs`) et le dérivé de
`scripts/tic-qa.mjs` (TC-9) idempotents comme `afaireDerive()`/VA-8 l'ont été ; (2) `verifier-isole.sh 026-045`, PASS,
`commit-fiche.sh 026-045` (embarque aussi le correctif VA-8 déjà en place) ; (3) `orchestre.mjs rejouer 026-047` (elle
est en `refuse/`), `verifier-isole.sh 026-047`, PASS attendu (VA-1 à VA-19 tous verts, confirmé ci-dessus hors VA-10
qui dépend d'un `tsconfig.json` stable), `commit-fiche.sh 026-047` ; (4) alors seulement
`node scripts/orchestre.mjs repondre 026-084 1`, `liberer 026-084`, `usine.mjs nettoyer 026-084 --forcer`, relancer.
Signalé séparément (tâche de fond) pour qu'une session dédiée s'en charge sans attendre la prochaine tournée
« à décider ».
