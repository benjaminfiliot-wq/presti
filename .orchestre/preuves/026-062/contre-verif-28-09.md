# 026-062 — contre-vérification du 28/09

Verifier (`node scripts/juges-026-acquisition-preuve.mjs --lot=5`) rejoué en l'état, avant tout sabotage : **PASS** (JP-2, JP-3, JP-5 verts), conforme au `verifier.log` déjà déposé par l'exécutant (référence `86ce0f3`, 5 juges du lot 5 : `facteur-qa --partie=facteur|porteur|gmail`, `disjoncteurs-qa`, `jauges-qa`).

## Moyen

D'abord Codex sur l'usine :

```
node ../presti-ops/usine/revue-codex.mjs 026-062 --sabotages=4 --delai=40
```

Résultat : **NON JUGÉ (code 125)**. Le contrôle du paquet par `usine.mjs` a refusé l'envoi — 8 motifs (`sk-`, « nom sensible ») détectés dans deux fichiers **hors périmètre de cette fiche** et non commités par ailleurs dans le dépôt : `.orchestre/fait/026-041.md:72` et `scripts/agents-llm-qa.mjs:100-102,104`. Rien n'est parti sur l'usine ; aucun verdict Codex. Détail : `.orchestre/travail/revue-codex/026-062/executer.log` (copié ici : `.orchestre/travail/contre-verif-026-062/00-revue-codex.log`). Je n'ai touché ni à ces deux fichiers ni à quoi que ce soit hors `.orchestre/preuves/026-062/` et `.orchestre/travail/`.

Code 125 → attaques maison, comme prévu par la consigne : au moins 4 sabotages réversibles de la **production** (les trois scripts `facteur-qa.mjs`, `disjoncteurs-qa.mjs`, `jauges-qa.mjs` que 026-062 écrit — pas `scripts/juges-026-acquisition-preuve.mjs`, qui est le juge/verifier lui-même, hors cible), chacun devant rougir le bon critère du verifier de la fiche (JP-2, JP-3 ou JP-5, les seuls exigés par `--lot=5`), puis restauration à l'octet près (sha256).

Méthode, un sabotage à la fois : sha256 avant → copie de sauvegarde dans `.orchestre/travail/contre-verif-026-062/backups/` → édition du fichier de production → `node scripts/juges-026-acquisition-preuve.mjs --lot=5` (verifier complet de la fiche, jamais un critère isolé) → restauration par copie de la sauvegarde → nouveau `node scripts/juges-026-acquisition-preuve.mjs --lot=5` → sha256 après.

`scripts/facteur-qa.mjs`, `scripts/disjoncteurs-qa.mjs` et `scripts/jauges-qa.mjs` ne sont pas suivis par git (`??`) : la restauration passe par mes copies de sauvegarde, pas par `git checkout`, d'où le contrôle sha256 systématique à chaque étape.

## Quatre sabotages (production, pas le témoin/verifier)

| # | fichier saboté | sabotage | code | critère(s) rougi(s) | sha256 restauré |
| --- | --- | --- | --- | --- | --- |
| S1 | `scripts/disjoncteurs-qa.mjs` | `s.juger('DJ-1', e1, …)` → `s.juger('DJ-1', [], …)` (DJ-1 forcé vert sur la référence, alors que la migration 0111 et `disjoncteurs.ts` sont bien absents) | 1 | JP-2 : « premier critère « ✅ DJ-1 … », « ❌ DJ-1 … » attendu » ; JP-5 (effet induit, cohérent) : l'extrait recomposé ne se retrouve plus dans la sortie produite | oui (`78dfa319…de715`) |
| S2 | `scripts/jauges-qa.mjs` | `s.juger('JG-1', e1, …)` → `s.juger('JG-1', [], …)` (même sabotage que S1, sur JG-1) | 1 | JP-2 : « premier critère « ✅ JG-1 … », « ❌ JG-1 … » attendu » ; JP-5 (effet induit) : idem S1 | oui (`9313fff1…f07a`) |
| S3 | `scripts/facteur-qa.mjs` | dans `autoControle()`, ajout de `if (PARTIE === 'facteur') e.push('SABOTAGE-CONTRE-VERIF-28-09')` avant le test AC-1 (SMTP/IMAP/Meta) — ne touche que `--partie=facteur`, pas `--partie=gmail` | 1 | JP-3 **seul** : « facteur-qa --partie=facteur --auto-controle : code 1, ❌ AC-1 SABOTAGE-CONTRE-VERIF-28-09 » ; JP-2 et JP-5 restent verts | oui (`3fce90d3…8ede5`) |
| S4 | `scripts/jauges-qa.mjs` | `s.juger('JG-1', e1, …)` → `s.juger('JG-1', e1.length ? ['x'] : e1, …)` (JG-1 reste bien ❌ avec le bon identifiant, mais le message est réduit à 1 caractère : « ❌ JG-1 x », 8 signes) | 1 | JP-5 **seul** : « jauges-qa : extrait de 8 signes (20 au moins) » ; JP-2 reste vert (l'identifiant JG-1 est correct) et JP-3 reste vert | oui (`9313fff1…f07a`) |

Sabotages rougis sur le(s) bon(s) critère(s), et rien d'autre d'inattendu (JP-2/JP-3/JP-5 relevés à chaque passage) : **4/4**. Le lot couvre les trois critères exigés par `--lot=5` (JP-2, JP-3, JP-5), dont un JP-3 isolé (S3, aucun effet sur JP-2/JP-5) et un JP-5 isolé (S4, aucun effet sur JP-2/JP-3) — preuve que le meta-juge distingue bien les trois familles de défauts plutôt que de les confondre.

`scripts/facteur-qa.mjs --partie=porteur` (PF-1) et `--partie=gmail` (GM-1) n'ont pas été sabotés séparément : le même mécanisme que S1/S2 (`s.juger('PF-1'|'GM-1', e1, …)` → `[]`) s'y applique identiquement (code déjà lu et vérifié ligne à ligne), et les 4 sabotages retenus couvrent déjà les trois critères distincts sans redondance, sur 3 fichiers différents.

## Restauration — preuve

- `sha256-avant.txt` / `sha256-apres.txt` (`.orchestre/travail/contre-verif-026-062/`) : **identiques** ligne à ligne (`diff` vide) pour les 5 chemins concernés : `scripts/facteur-qa.mjs`, `scripts/disjoncteurs-qa.mjs`, `scripts/jauges-qa.mjs`, `.orchestre/preuves/026-062/echecs-attendus.md`, `.orchestre/preuves/026-062/verifier.log`.
- `echecs-attendus.md` est réécrit par le verifier à chaque passage (c'est son fonctionnement normal, exigé par JP-5) : il a donc été retouché 9 fois pendant la contre-vérification (1 témoin + 4 sabotages + 4 restaurations), puis restauré à l'octet près à sa version d'origine (celle de l'exécutant, horodatée 2026-09-28T08:48:02Z) une fois les essais terminés.
- `verifier.log` n'a jamais été touché (je n'ai pas relancé `orchestre.mjs` ; seul le verifier lui-même a tourné) : sha256 identique à l'avant sans même une restauration.
- `git status --short` sur les 3 scripts après contre-vérification : identique à avant (`??` pour les trois, comme au départ — rien commité, rien perdu) ; `scripts/juges-026-acquisition-preuve.mjs` (déjà `M` avant mon passage, non touché par moi) inchangé lui aussi.
- Verifier complet rejoué après chaque restauration et une dernière fois en clôture : **PASS** à chaque fois (5/5), dernière sortie identique à la sortie témoin de départ (mêmes 5 lignes, mêmes extraits).

Logs conservés : `.orchestre/travail/contre-verif-026-062/{00-revue-codex.log, sha256-avant.txt, sha256-apres.txt, backups/*.orig}`. Les sorties complètes de chaque passage du verifier restent aussi sous `.orchestre/travail/026-acquisition/sorties-lot-5/` (réécrites à chaque lancement, comme prévu par le script).

## Défauts

Aucun défaut établi sur le périmètre de la fiche (`scripts/facteur-qa.mjs`, `scripts/disjoncteurs-qa.mjs`, `scripts/jauges-qa.mjs`, `scripts/juges-026-acquisition-preuve.mjs` lot 5, `scripts/fixtures/026-acquisition/envoi/**`). Le code relu correspond à ce que demande la fiche : chaque juge échoue sur son premier critère avec l'identifiant attendu sur l'arbre de référence (FA-1, PF-1, GM-1, DJ-1, JG-1), passe en `--auto-controle` indépendamment des modules encore à écrire, et le lot 5 est correctement inscrit au registre sans toucher aux autres lots.

Point hors périmètre, déjà signalé par le `pour_claude` de la fiche et non ré-instruit ici : le lot 4 (`ops-acquisition-qa --migration=planification --auto-controle`, `AC-TEMOIN-PLANIFICATION`) aurait été rouge lors d'un rejeu par l'exécutant — mais `scripts/juges-026-acquisition-preuve.mjs --lot=5` (le seul verifier de 026-062) ne rejoue jamais les lots 1 à 4 (`JP-9`, qui le ferait, n'est armé que pour le lot 4 lui-même) : mes 9 passages du verifier de cette fiche n'ont jamais invoqué le lot 4, donc je ne peux ni confirmer ni infirmer cet état, qui reste hors du périmètre et de l'outillage de 026-062.

## Verdict

**VERT confirmé.** Codex non disponible (125, cause hors périmètre : secrets détectés dans deux fichiers non liés à 026-062) ; contre-vérification maison sur la production réelle : 4/4 sabotages rougissent le(s) bon(s) critère(s) et rien d'autre d'inattendu, couvrant les trois familles JP-2/JP-3/JP-5 exigées par `--lot=5` sur 3 fichiers distincts, restauration à l'octet près prouvée par sha256, verifier complet vert avant et après (5/5 passages PASS).
