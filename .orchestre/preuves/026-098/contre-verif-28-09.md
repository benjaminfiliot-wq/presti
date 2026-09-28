# 026-098 — contre-vérification du 28/09

Verdict de l'exécutant : **VERT**. Contre-vérification : **VERT confirmé**, avec un défaut important (non bloquant) trouvé au passage sur la couverture du témoin lui-même.

## Moyen

1. **Revue Codex sur l'usine** (économie de Claude) : `node ../presti-ops/usine/revue-codex.mjs 026-098 --sabotages=4`, depuis `presti`.
   → **code 125 — NON JUGÉ**. Rien n'est parti sur l'usine : le contrôle de paquet de `usine.mjs` a refusé l'envoi pour 8 correspondances « motif sk- / nom sensible », **toutes hors du périmètre de 026-098** :
   `.orchestre/fait/026-041.md:72`, `scripts/agents-llm-qa.mjs:100-104` (fiches et scripts d'autres tâches, présents dans l'arbre de travail au moment de l'essai). Codex n'a jamais tourné ; aucun jugement à recouper. Détail : `.orchestre/travail/revue-codex/026-098/executer.log`.
2. Code 125 = pas jugé → **sabotages faits moi-même**, sur la PRODUCTION du périmètre (`scripts/executant.mjs`, presti), jamais sur le juge (`../orchestre/test/preuve-026.mjs`, `test/fixtures-026/**`, tous deux non touchés). Chaque sabotage a été relu avant, prédit, appliqué, vérifié avec le vrai vérificateur de la fiche (`node ../orchestre/test/preuve-026.mjs --preuve-echecs`, depuis `presti`), puis restauré et recontrôlé par sha256.

Seule la portion **PX-1** du vérificateur dépend du fichier vivant `scripts/executant.mjs` (les groupes source/baux/quota testent une référence figée extraite par `git archive faaef0d` du dépôt orchestre, indépendante de mes modifications). C'est donc PX-1 qui rougit à chaque sabotage réussi ; les trois groupes et `test/preuve.mjs` de l'extrait restent égaux à eux-mêmes (ORS-1/ORB-1/ORQ-1 en premier échec, extrait vert), comme attendu.

sha256 de référence de `scripts/executant.mjs` (état légitime, non commité, tel que livré par 026-098) :
`8c782c6590050c7b58770e47dba00bb0a8d827adc9368d17a80c45bc9b3d8700`

## Sabotages (4 réussis, critère prédit puis observé)

| # | Mutation (1 ligne, `scripts/executant.mjs`) | Critère visé | Prédit | Observé | Verdict global du témoin |
|---|---|---|---|---|---|
| 1 | branche `--a-blanc` : `process.exit(0)` → `process.exit(1)` | PX-1 / code | `code 1`, reste vrai | `✗ PX-1 — code 1 · JSON valide : true · --add-dir orchestre : true · workspace-write : true · rien écrit : true` | 0 → **1** (rouge) |
| 2 | `argvCodex()` : suppression de `...(src ? ['--add-dir', src] : [])` | PX-1 / --add-dir orchestre | `--add-dir C:/Users/benja/Documents/orchestre : false`, reste vrai | `✗ PX-1 — code 0 · JSON valide : true · --add-dir orchestre : false · workspace-write : true · rien écrit : true` | 0 → **1** (rouge) |
| 3 | `argvCodex()` : `'workspace-write'` → `'workspace-write-SABOTAGE'` | PX-1 / workspace-write | `workspace-write : false`, reste vrai | `✗ PX-1 — code 0 · JSON valide : true · --add-dir orchestre : true · workspace-write : false · rien écrit : true` | 0 → **1** (rouge) |
| 4 | branche `--a-blanc` : `console.log(JSON.stringify(...) + ' // 026-098-sabotage')` | PX-1 / sortie JSON valide | `JSON valide : false` (donc `argv=[]` → add-dir et workspace-write retombent aussi à false) | `✗ PX-1 — code 0 · JSON valide : false · --add-dir orchestre : false · workspace-write : false · rien écrit : true` | 0 → **1** (rouge) |

Les 4 sont exactement les 4 sous-critères que `verifierPX1()` (test/preuve-026.mjs:519-536) calcule sur l'exécution réelle de `scripts/executant.mjs lancer x --tache=t --a-blanc` dans presti — chacun rougi isolément (ou en cascade prévisible pour le n°4), rien d'autre n'a bougé. Après restauration de `scripts/executant.mjs` (sha256 identique avant/après à chaque cycle), un nouveau passage du témoin redonne PX-1 vert et le code global 0.

### Tentative ratée, rapportée pour transparence (ne compte pas dans les 4)

J'ai d'abord tenté de rougir le 5ᵉ sous-critère (« rien écrit … agents.jsonl ») en ajoutant `fs.appendFileSync(AGENTS, …)` dans la branche `--a-blanc`. L'écriture a bien eu lieu (sha256 de `.orchestre/agents.jsonl` passé de `07f0ba16…` à `93daa5e4…`, ligne `{"sabotage":"026-098-contre-verif"}` visible en queue de fichier) mais **PX-1 est resté vert** : `.orchestre/agents.jsonl` était déjà modifié (` M .orchestre/agents.jsonl`) par l'activité d'autres sessions concurrentes au moment du test, et `git status --porcelain` ne change pas de sortie entre l'« avant » et l'« après » quand le fichier est déjà marqué `M`. Faux négatif dû au bruit ambiant (sessions concurrentes), pas un défaut du code livré. Fichier restauré (sha256 `07f0ba16…` confirmé) ; j'ai remplacé ce sabotage par le n°4 du tableau ci-dessus pour compléter les 4 exigés.

## Défaut trouvé en creusant (important, non bloquant)

En creusant la même moitié du critère (« rien écrit … dans `.orchestre/travail` »), j'ai fait écrire réellement `--a-blanc` dans `.orchestre/travail/executant/` (`fs.writeFileSync(journal, 'sabotage-test-gitignore-travail\n')` dans la branche `--a-blanc`) — exactement le genre d'écriture que le commentaire du code interdit explicitement (« sans rien lancer ni rien écrire (ni fichier de prompt, ni journal, ni agents.jsonl) »).

- Le fichier a bien été créé : `.orchestre/travail/executant/t-2026-09-28-09-36-07.log`, 32 octets, contenu `sabotage-test-gitignore-travail` (relu par `cat`).
- Le témoin est resté **vert** : `✓ PX-1 — … rien écrit dans .orchestre/travail ni agents.jsonl : true`, code global 0, « tous les contrôles passent ».
- Cause confirmée, pas du bruit ambiant cette fois : `.orchestre/travail/` est intégralement dans `.gitignore` (`git check-ignore -v` → `.gitignore:84:.orchestre/travail/ .orchestre/travail/executant/t-2026-09-28-09-36-07.log`). `git status --porcelain -- .orchestre/travail .orchestre/agents.jsonl` ne peut donc **structurellement** jamais voir une écriture sous `.orchestre/travail`, arbre propre ou non — ça n'a rien à voir avec l'état du dépôt au moment du test.

**Portée** : non bloquant pour 026-098 — le code réellement livré aujourd'hui ne fait cette écriture nulle part dans la branche `--a-blanc` (relu : `journal`/`dernier` n'y servent qu'à construire l'argv passé à Codex, jamais écrits par le mode à blanc lui-même). Mais la moitié « `.orchestre/travail` » de la garantie PX-1 est actuellement invérifiable par construction : une régression future qui ferait écrire un journal ou un fichier de prompt dans ce mode passerait le témoin sans être vue. À corriger dans une prochaine fiche qui touche `preuve-026.mjs` (la fiche 20/026-151 dédiée aux mutations, ou 06/07/08 en passant) : comparer un inventaire du dossier (liste + mtimes de `.orchestre/travail/executant/`) avant/après, pas `git status`, pour cette moitié-là du critère. Je n'ai pas touché `preuve-026.mjs` moi-même (interdit : c'est le juge).

Fichier de test supprimé après coup (`.orchestre/travail/executant/t-2026-09-28-09-36-07.log` n'existe plus) ; `.orchestre/travail/` n'est de toute façon jamais suivi par git, donc rien à restaurer côté dépôt.

## Autres contrôles (claim de l'exécutant recoupé)

- **Diff de `scripts/executant.mjs` vs dernier commit (`c45dd1d3`)** : exactement les deux changements annoncés — `configSource()` (nouvelle fonction) et le bloc `if (option('a-blanc'))` dans `lancer()` — rien d'autre.
- **Dépôt orchestre (`C:\Users\benja\Documents\orchestre`)** : `git status --short` → seulement `?? test/fixtures-026/` et `?? test/preuve-026.mjs`, non commités comme annoncé (pas de dépôt distant). Rien dans `bin/`, `hooks/`, `juges/`, `gabarits/`, `test/preuve.mjs` ni `test/projet-factice/` — zones interdites respectées.
- **`.orchestre/verdicts.jsonl`** : PASS deux fois pour 026-098 (`en-cours`, 158 s ; `fait`, 193 s), `executant: claude-code` — conforme à l'en-tête de la fiche.
- **Dépendance 026-007** : PASS dans `fait/` — condition de départ de 026-098 satisfaite.
- **`.orchestre/preuves/026-098/`** : `verifier.log` (9 113 → inchangé, jamais retouché par mes essais, seul `orchestre.mjs verifier` l'écrit) et `echecs-attendus.md` correspondent au contenu déjà lu avant contre-vérification ; regénéré en fin de session par le témoin final (contenu équivalent, horodatage plus récent).
- **`test/fixtures-026/faux-codex.mjs`** relu (34 lignes) : cohérent avec la description du groupe quota (témoin d'appel, modes quota/quota-sans-date/normal) — fichier du juge, non touché.

## Aléas rencontrés (transparence)

- Plusieurs sessions écrivent en continu dans ce dépôt pendant la contre-vérification (nombreux processus `node` actifs, `.orchestre/agents.jsonl` déjà modifié en permanence). Une tentative de restauration de `scripts/executant.mjs` a essuyé un `Permission denied` transitoire (verrou Windows probable, un autre processus ayant le fichier ouvert un instant) ; la même commande a réussi à la reprise immédiate, sha256 revérifié. Chaque sabotage a été restauré dès que le sous-processus `verifierPX1` avait fini de lire le fichier (pas besoin d'attendre la fin des ~193-400 s du témoin complet), pour réduire la fenêtre où `scripts/executant.mjs` était dans un état cassé pendant qu'une autre session aurait pu l'invoquer.

## sha256 restaurés (avant = après, à chaque cycle)

- `scripts/executant.mjs` : `8c782c6590050c7b58770e47dba00bb0a8d827adc9368d17a80c45bc9b3d8700`
- `.orchestre/agents.jsonl` : `07f0ba165e707b7b1af3a88137f150f57a0a26910ab264bb2c07ac36a38b7f6b`

## Verdict

**VERT confirmé.** Les 4 sabotages rougissent chacun le bon sous-critère de PX-1, prédit puis observé sans surprise ; le témoin (`node ../orchestre/test/preuve-026.mjs --preuve-echecs`) redevient vert (code 0) après restauration complète et vérifiée par sha256, à deux reprises (avant et après le test diagnostique supplémentaire). Rien n'a bougé hors périmètre, dans presti comme dans le dépôt orchestre. Aucun défaut bloquant ou majeur. Un défaut **important, non bloquant** : la moitié « `.orchestre/travail` » de la garantie « rien écrit » de PX-1 est structurellement invérifiable par `git status` (dossier entièrement gitignore), donc aveugle à une régression future sur ce point précis — sans conséquence aujourd'hui puisque le code livré n'y écrit rien, mais à corriger dans une fiche qui touchera `preuve-026.mjs` (juge, hors de mon périmètre ici).
