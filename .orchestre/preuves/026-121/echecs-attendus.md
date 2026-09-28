# 026-121 — échecs attendus des juges de la revue du lundi et du chantier

Écrit par `scripts/juges-026-revue-chantier-preuve.mjs` le 2026-09-28T05:37:53.543Z (152 s). Code de sortie : 0.

## Écarts de lecture (relus avant d'écrire les juges)

- **Forme de `revue.json`** : la fiche liste les champs sans fixer leur forme ; `attendu.json` la fixe (c'est le contrat de 026-146) : `executants` est un objet par exécutant (`executant`, sinon `agent`) ; `du` et `au` (lundi et dimanche, jours de Paris) s'ajoutent à `semaine` ; `lignes_illisibles` additionne les deux fichiers ; `fraicheur.etat` reprend `genere_le` de l'état. Une REFUSÉE n'est ni un PASS ni un FAIL ; la médiane part du PREMIER lancement jusqu'au PREMIER PASS depuis `fait/`.
- **RV-2 : un jeton absent** donne aussi « non mesuré » en code 0 (la fiche cite le fichier absent et le 401 ; 026-146 ajoute l'erreur réseau) : une revue sans jeton se fait, et dit ce qui n'est pas mesuré. `lireJeton()` de `commun.mjs` lève une erreur de code 2 : `revue-donnees.mjs` doit l'attraper.
- **RV-4 : ce qui n'est pas un nombre est une liste fermée** : une date valide (jour ≤ 31, mois ≤ 12), une heure HH:MM valide, une semaine AAAA-SS ou « semaine SS » (SS ≤ 53), un numéro de section ou de liste qui se suit, un identifiant qui commence par une lettre (`RV-1`, `gpt-6-sol`) ou de la forme NNN-NN(N) (`026-146`) ou NNN-mot-clé (`090-relances-devis`, la forme des ids du chantier), jamais suivi de « € », et l'adresse d'un lien. Le code en ligne, le code en bloc et les commentaires ne sont plus retirés en bloc : sans chiffre, ils n'ont rien à vérifier ; avec un chiffre, ils se vérifient. Un nombre abrégé (`12k`, `3 k€`, `1e3`) échoue toujours. Les décisions doivent être classées (du plus gros montant au plus petit), une section manquante échoue, et un montant en `_cents` des données peut s'écrire en euros.
- **RV-6 (ajouté)** : la fiche ne nomme pas de critère pour `revue-hebdo.md` et `GABARIT.md` ; RV-6 les juge, comme CT-5 juge `chantier.md`.
- **Zones protégées** : 026-146 dit « par préfixe littéral, comme `orchestre.mjs` » ; lu à la lettre, `scripts/*-qa.mjs` (préfixe `scripts/`) interdirait tout `scripts/` à Codex. Les fiches de CT-1 ne touchent chaque zone que par un chemin que les deux lectures couvrent ; le témoin compare un chemin littéral au motif, et deux motifs par préfixe.
- **Réponse de `GET /api/agents/decisions?tranchees=1`** : la liste nue `[{ id, cle_idempotence, choix, tranchee_le }]` (026-042, AR-13) ; le faux serveur exige `tranchees=1` et un `depuis` de moins de 30 jours (400 sinon), comme la route. `deposer` doit donc passer un `depuis`.
- **Correction du 27/09** : le chantier et la revue sont un travail distinct du cycle du chef (026-148) : Claude Code sur le poste, jeton de la copie de reprise. Jugé par CT-7 (aucun script de `scripts/chef/` ni de `scripts/usine/` ne lance `chantier.mjs` ou `revue-donnees.mjs` ; `chantier.md` le dit ; fixtures du chef et du chantier indépendantes) et par RV-6 (« distinct du cycle du chef »). Les deux autres points de la vérification (« une consigne produit un accusé et un compte rendu », « une tâche hors droits est refusée ») relèvent du chef (026-127/129, 026-105, `chef-qa`) ; côté chantier, la tâche hors droits est la fiche Codex sur une zone protégée (CT-1).
- **Budget de fichiers (14) : dépassé, écart à acter par la session principale** : 20 fichiers hors preuves (compte fait par cette preuve). La fiche en énumère six, plus les fixtures ; s'y ajoutent les deux témoins, les quatre juges proposés d'essai et le second attendu (semaine 2026-39), exigés par la leçon du 26/09 (« vert sur un témoin, rouge sur chaque sabotage ») et par la contre-vérification du 27/09. L'orchestre ne contrôle que le format du budget ; relever le budget de la fiche, ou l'acter dans `decisions.md`, revient à la session principale (hors du périmètre de 026-121).

## Contre-vérification du 27/09 : ce qui a changé

- **RV-1 (R1, R2)** : un second passage `--semaine=2026-39` sur les mêmes fixtures, égal à `attendu-2026-39.json` (du 21/09 au 27/09 ; antigravity 1 PASS, 1 réussite, 30 min ; qwen 1 FAIL ; codex 1 PASS en-cours, 0 réussite, médiane null). `verdicts.jsonl` porte un PASS en-cours de 099-10 avant son PASS depuis `fait/` (la médiane d'antigravity passe de 75 à 68 si l'on compte l'en-cours) et un PASS en-cours seul de 099-41 en semaine 39. Deux sabotages du témoin : « un PASS en-cours compté comme réussite » et « une sortie figée sur la semaine 38 ».
- **RV-4** : l'extraction des nombres réécrite (liste fermée ci-dessus) ; une variante par forme qui passait à tort (`12k €`, `3 k€`, `1e3`, code en ligne, bloc de code, commentaire, `17/20`, date et heure invalides, `marge:9999 €`, `77.`, `100-200 €`, `3 h 45`, `45min`, semaine 77), et deux variantes qui doivent rester vertes (liste qui se suit ; dates, heures et semaines valides).
- **CT-1 (C4)** : juge proposé d'essai `juges/pass-code1.mjs` (seulement des lignes `PASS RD-n`, puis code 1) et sa variante (attendu : 1) ; sabotage « un identifiant de critère suffit, sans ligne en échec ».
- **CT-1 (C3)** : une variante sur zone protégée pour chaque exécutant non-Claude d'`orchestre.json` (antigravity sur `scripts/*-qa.mjs`, gemini-cli sur `supabase/**`, qwen sur `app/api/agents/**`), attendu 1 ; l'autotest exige une variante par exécutant et vérifie que chaque fiche de zone passe `orchestre valider` (le refus vient du garde, jamais de l'en-tête) ; sabotage « les zones protégées contrôlées pour codex seulement ».
- **CT-4 (C5)** : le motif accepte n'importe quels arguments avant `push`, `commit` ou `merge` dans un `'git', [...]` ; sabotage « un git push lancé par spawn, derrière '-C', R » (code mort).
- **Écarts restés à acter** : le budget de fichiers (ci-dessus) ; et, sur les trois cas de la correction du 27/09, « une consigne produit un accusé et un compte rendu » et « une tâche hors droits est refusée » côté chef relèvent de 026-127/129 et 026-105 (`chef-qa`) — côté chantier, seules la séparation (CT-7, RV-6) et la fiche d'un exécutant non-Claude sur zone protégée (CT-1) sont exercées. Répartition à faire acter par la session principale.

## P-1 — l'arbre actuel

- **revue-qa** : scripts/chef/revue-donnees.mjs existe déjà (026-146 livrée) : la rougeur se prouve sur l'arbre de référence (P-4)
- **chantier-qa** : scripts/chef/chantier.mjs existe déjà (026-146 livrée) : la rougeur se prouve sur l'arbre de référence (P-4)

## P-2 — les critères de consigne sur l'arbre actuel

- **revue-qa** : code 0
  - `PASS RV-4`
  - `PASS RV-6`
- **chantier-qa** : code 0
  - `PASS CT-5`
  - `PASS CT-7`

## P-3 — les fixtures

| vérification | verdict | détail |
| --- | --- | --- |
| attendu.json se parse et porte ses clés (semaine 2026-38) | PASS | semaine 2026-38, 4 exécutants |
| attendu-2026-39.json se parse et porte ses clés (semaine 2026-39) | PASS | semaine 2026-39, 3 exécutants |
| le juge proposé de la fiche conforme échoue sur un critère identifié | PASS | code 1 ; « FAIL RD-1 — lib/relances/modele.ts absent : le modèle de relance n'existe pas » |
| le juge proposé de la fiche « juge vert » sort en code 0 | PASS | code 0 |
| le juge « plantage » échoue sans aucun identifiant de critère | PASS | code 1 ; Node.js v24.16.0 |
| le juge « PASS puis code 1 » sort en code ≠ 0 sans aucune ligne en échec | PASS | code 1 ; 3 ligne(s) à identifiant, 0 en échec |
| orchestre valider sur la fiche « conforme » | PASS | ✓ conforme.md : 090-relances-devis · feature · codex · périmètre lib/relances/modele.ts, docs/relances.md, .orchestre/preuves/090-relances-… |
| orchestre valider sur la fiche « zone-claude-code » | PASS | ✓ zone-claude-code.md : 090-relances-devis · feature · claude-code · périmètre lib/relances/modele.ts, docs/relances.md, .orchestre/preuves… |
| orchestre valider sur la fiche « entete-refuse » (témoin négatif) | PASS | ✗ entete-refuse.md type « amelioration » : attendu feature \| test \| contenu \| audit \| boucle-qa |

## P-4 — revue-qa --preuve-echecs (code 0, 33 s)

- Autotest des fixtures : PASS
- Arbre de référence (sans le script jugé) : code 1, premier échec **RV-1**, rouges : RV-1, RV-2, RV-3, RV-5
- Témoin : code 0, 6 critère(s) vert(s) : PASS RV-1, PASS RV-2, PASS RV-3, PASS RV-4, PASS RV-5, PASS RV-6

| sabotage du témoin | critère visé | attrapé | ligne en échec |
| --- | --- | --- | --- |
| la semaine calculée en UTC | RV-1 | oui | FAIL RV-1 — executants.antigravity.pass : attendu 3, obtenu 4 |
| le dernier lancement au lieu du premier | RV-1 | oui | FAIL RV-1 — executants.codex.minutes_mediane_par_reussite : attendu 270, obtenu 70 |
| une REFUSÉE comptée en FAIL | RV-1 | oui | FAIL RV-1 — executants.antigravity.fail : attendu 1, obtenu 2 |
| un PASS en-cours compté comme réussite | RV-1 | oui | FAIL RV-1 — executants.antigravity.minutes_mediane_par_reussite : attendu 75, obtenu 68 |
| une sortie figée sur la semaine 38 | RV-1 | oui | FAIL RV-1 — semaine 2026-39 : semaine : attendu "2026-39", obtenu "2026-38" |
| « non mesuré » remplacé par 0 | RV-2 | oui | FAIL RV-2 — état en fichier absent : argent vaut 0, attendu « non mesuré » |
| le jeton absent fait planter | RV-2 | oui | FAIL RV-2 — jeton absent : code 2 : ✗ PRESTI_JETON_CHEF absent (attendu : code 0, « non mesuré ») |
| un plantage sur une ligne abîmée | RV-3 | oui | FAIL RV-3 — trois lignes abîmées : code 1 : ✗ Unterminated string in JSON at position 51 (line 1 column 52) (attendu : code 0, sans plantage) |
| les lignes illisibles d'agents.jsonl oubliées | RV-3 | oui | FAIL RV-3 — lignes_illisibles vaut 2, attendu 3 (deux dans verdicts.jsonl, une dans agents.jsonl ; les lignes vides ne comptent pas) |
| un fichier écrit hors de --sortie | RV-5 | oui | FAIL RV-5 — fichier écrit hors de --sortie : revue-trace.json |
| un appel hors de --base | RV-5 | oui | FAIL RV-5 — adresse hors de --base dans le code : http://127.0.0.2:9 |
| revue-hebdo.md sans « jamais de fusion » | RV-6 | oui | FAIL RV-6 — revue-hebdo.md ne dit pas jamais de fusion (« jamais de fusion ») |

## P-4 — chantier-qa --preuve-echecs (code 0, 147 s)

- Fixtures de CT-1 : PASS (ligne du juge rouge : `FAIL RD-1 — lib/relances/modele.ts absent : le modèle de relance n'existe pas`)
- Arbre de référence (sans le script jugé) : code 1, premier échec **CT-1**, rouges : CT-1, CT-2, CT-3, CT-4, CT-6
- Témoin : code 0, 7 critère(s) vert(s) : PASS CT-1, PASS CT-2, PASS CT-3, PASS CT-4, PASS CT-5, PASS CT-6, PASS CT-7

| sabotage du témoin | critère visé | attrapé | ligne en échec |
| --- | --- | --- | --- |
| lib/agents/llm.ts retiré des zones protégées | CT-1 | oui | FAIL CT-1 — zone lib/agents/llm.ts : code 0, attendu 1 (executant codex et périmètre sur la zone protégée lib/agents/llm.ts (lib/agents/llm.ts)) — code 0 : ✓ 0… |
| verifier-fiche ne lance plus le juge proposé | CT-1 | oui | FAIL CT-1 — juge-pass-code1 : code 0, attendu 1 (le juge proposé sort en code 1 sans aucune ligne en échec (seulement des PASS RD-n)) — code 0 : ✓ 090-relances… |
| un juge qui plante accepté | CT-1 | oui | FAIL CT-1 — juge-pass-code1 : code 0, attendu 1 (le juge proposé sort en code 1 sans aucune ligne en échec (seulement des PASS RD-n)) — code 0 : ✓ 090-relances… |
| un identifiant de critère suffit, sans ligne en échec | CT-1 | oui | FAIL CT-1 — juge-pass-code1 : code 0, attendu 1 (le juge proposé sort en code 1 sans aucune ligne en échec (seulement des PASS RD-n)) — code 0 : ✓ 090-relances… |
| les zones protégées contrôlées pour codex seulement | CT-1 | oui | FAIL CT-1 — executant-antigravity : code 0, attendu 1 (executant antigravity et périmètre sur la zone protégée scripts/*-qa.mjs (scripts/relances-qa.mjs) : rés… |
| un test e2e existant modifié accepté | CT-2 | oui | FAIL CT-2 — un test e2e existant modifié : code 0, attendu 1 — code 0 : ✓ fusion permise : 1 fichier(s), textes et tests e2e nouveaux seulement ✗ un test e2e e… |
| deposer écrase une fiche existante | CT-3 | oui | FAIL CT-3 — id déjà en file/ : code 0, attendu 1 — code 0 : ✓ 090-relances-devis déposée dans .orchestre/file/ (décision chef:2026-09-21:idee-relances-devis tr… |
| deposer ne relit pas le choix | CT-3 | oui | FAIL CT-3 — tranchée reporter : code 0, attendu 1 — code 0 : ✓ 090-relances-devis déposée dans .orchestre/file/ (décision chef:2026-09-21:idee-relances-devis t… |
| un git push | CT-4 | oui | FAIL CT-4 — scripts/chef/chantier.mjs contient git push, commit ou merge : « // Après le dépôt : git push origin chantier. import fs from » |
| un git push lancé par spawn, derrière '-C', R | CT-4 | oui | FAIL CT-4 — scripts/chef/chantier.mjs contient git lancé avec push, commit ou merge : « = (R) => spawnSync('git', ['-C', R, 'push', 'origin', 'HEAD » |
| chantier.md sans « aucun connecteur » | CT-5 | oui | FAIL CT-5 — chantier.md ne dit pas « aucun connecteur » |
| idees garde les idées tranchées reporter | CT-6 | oui | FAIL CT-6 — idees.json garde 3 décision(s) (chef:2026-09-21:idee-relances-devis, chef:2026-09-21:idee-page-tarifs, chef:2026-09-22:idee-avis-google), attendu l… |
| le jeton dans l'URL | CT-6 | oui | FAIL CT-6 — le jeton est dans l'URL |
| le cycle du chef lance le chantier | CT-7 | oui | FAIL CT-7 — scripts/chef/cycle.mjs:2 lance ou cite le chantier ou la revue : « spawnSync(process.execPath, ['scripts/chef/chantier.mjs', 'idees', '--depuis=202… |
| chantier.md redevient le travail du cycle de 7 h | CT-7 | oui | FAIL CT-7 — chantier.md ne dit pas qu'il n'est pas le travail du cycle du chef ✗ chantier.md se dit encore le travail du cycle du chef de 7 h |
