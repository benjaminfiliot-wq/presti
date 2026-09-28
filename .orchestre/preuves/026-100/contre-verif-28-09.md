# Contre-vérification 026-100 — 28/09

Contre-vérifie la fiche donnée comme PASS (« 12/12 critères verts : CH-1,2,3,4,5,6,7,8,10,11,12,PV », `.orchestre/fait/026-100.md`, preuve `.orchestre/preuves/026-100/verifier.log` datée `2026-09-28T13:58:10Z`). **Le résultat n'est pas celui attendu : la fiche ne rejoue plus PASS en ce moment (17h24, 28/09).** `.orchestre/fait/026-100.md` et `.orchestre/preuves/026-100/verifier.log` n'ont pas été touchés (la preuve d'origine reste lisible telle quelle) ; rien d'autre n'a été modifié hors `.orchestre/preuves/026-100/` et `.orchestre/travail/` ; aucun commit.

## Moyen

### 1. Revue Codex sur l'usine

`cd presti && node ../presti-ops/usine/revue-codex.mjs 026-100 --sabotages=4` (journal complet : `.orchestre/travail/revue-codex/026-100/executer.log`, `codex.log`, `journal.json`).

→ **code 3, QUOTA — NON JUGÉ.** Raison exacte rendue par l'outil (`codex.log` et `journal.json`) :

```
⏸ revue-codex 026-100 : QUOTA (3) — quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM.
ERROR: You've hit your usage limit. Upgrade to Pro (…), visit https://chatgpt.com/codex/settings/usage
       to purchase more credits or try again at 3:48 PM.
```

Codex n'a fait aucun sabotage (quota épuisé dès l'ouverture de la session `codex exec`, 3 s après le lancement) : `journal.json` confirme `"codex": { "code": 1, "quota": "quota de l'abonnement ChatGPT épuisé — try again at 3:48 PM." }` et `"verdict": { "valide": false, "erreurs": ["verdict.json absent"] }`. Aucun faux vert : conforme au protocole (`decider()` de l'outil).

**Mais le service a lancé, avant Codex, un passage « témoin » du verifier exact sur l'état actuel de la production, dans un bac neuf (copie de HEAD + non-commités, sur `usine@88.96.53.3`, indépendant du PC) : ce témoin est rendu ROUGE**, `.orchestre/travail/revue-codex/026-100/runs/0.log` :

```
❌ CH-6 code 1, 3 attendu — export : code 3 | Export échoué
livrer-site-qa : FAIL — CH-6
# fin : code 1
```

Les 11 autres critères (CH-1,2,4,5,7,8,10,11,12,3,PV) restent verts dans ce même passage. C'est la première alerte : **le témoin indépendant sur l'usine ne rejoue pas le PASS enregistré**, alors que le paquet envoyé sur l'usine est un instantané de l'état courant du dépôt (HEAD + non-commités), donc de la même version de `scripts/livrer-site.mjs` que celle actuellement sur le PC.

### 2. Confirmation indépendante sur le PC lui-même

Sans dépendre du bac de l'usine, rejeu du verifier exact **directement sur le poste**, à 16h59 (17h01 code 1) :

```
$ node --import ./scripts/ts-loader.mjs scripts/livrer-site-qa.mjs
❌ CH-6 code 1, 3 attendu — export : code 3 | Export échoué
livrer-site-qa : FAIL — CH-6
```

Identique au témoin de l'usine : même critère (CH-6), même message. Deux environnements indépendants (Linux ARM sur l'usine, Windows sur le PC), même verdict rouge, à quelques minutes d'écart — exclut un aléa d'environnement ou de réseau propre à l'usine.

### 3. Ce qui a changé entre la preuve PASS et maintenant

- Preuve PASS enregistrée : `2026-09-28T13:58:10Z` (`.orchestre/preuves/026-100/verifier.log`, inchangé, relu ci-dessus).
- `scripts/livrer-site.mjs` (fichier non suivi par git, seul fichier du `perimetre` de la fiche) : `mtime = 2026-09-28T14:35:30+02:00` = **14:35:30Z, soit ~37 min après la preuve PASS.** sha256 relevé en tout début de contre-vérification et resté strictement stable pendant toute la campagne ci-dessous : `139b4c0e00b1801f1372d1bb935fee6a1db290f1cc8bd90d0716e6a7ab46398a` (donc le fichier n'a plus bougé depuis, mais il AVAIT bougé entre 13:58 et 14:35).
- `scripts/livrer-site-qa.mjs` (le juge, `verifier` de la fiche) : `mtime = 27/09 15:07`, `git status --porcelain` vide, aucun commit depuis le 25/09 — **le juge n'a pas été corrigé** : le rouge actuel n'est pas un juge qui aurait changé, c'est la production qui a régressé après l'instant de la preuve. (Confirme le diagnostic transmis : pas de juge à contre-vérifier en plus, donc pas de sabotages supplémentaires visant une correction du juge.)
- Le moteur autonome n'a lui-même aucune trace de ce PASS de 13:58 dans `presti-ops/usine/moteur.log` (sa dernière ligne sur 026-100 reste le rouge de 10:44) : la fiche a été déplacée en `fait/` par une session manuelle, hors moteur, cohérent avec le message reçu.

**Diagnostic du code actuel** (`scripts/livrer-site.mjs:134`) :

```js
const exporte = etape('export', …)
if (exporte.code) { issue = exporte.code === 4 ? 3 : 1; throw new Error('Export échoué') }
```

`scripts/commande-exporter.mjs` ne rend jamais le code 4 — tous ses `refuser(code, …)` sont en `2` (usage) ou `3` (dossier incomplet : lignes 115, 117, 119, 165 ; vérifié par `grep -n "refuser(" scripts/commande-exporter.mjs`). Donc `exporte.code === 4` n'est jamais vrai, et **toute sortie d'export non nulle — y compris le cas « dossier incomplet », code 3, exactement le cas que CH-6 exerce — retombe sur `issue = 1`** au lieu du `code 3 (dossier incomplet…)` promis par la fiche (« Codes de sortie … 3 dossier incomplet ou rédaction bloquée ») et attendu par CH-6. Un défaut réel et déterministe de `scripts/livrer-site.mjs`, pas un aléa de données ni un effet de bord d'un autre test (`ch6-sans-prestation.json` est un jeu figé, indépendant de toute base partagée, lu via `--depuis`).

### 4. Campagne de sabotage (protocole imposé, sur les 11 critères que le témoin rend encore verts)

Le témoin étant déjà rouge sur CH-6 sans intervention de ma part, les 4 sabotages exigés par le protocole visent les critères **encore verts**, pour vérifier que le juge n'est pas aveugle sur eux non plus — jamais CH-6 lui-même (déjà cassé par la production, inutile et trompeur de le saboter en plus). Seul fichier du périmètre : `scripts/livrer-site.mjs`. Protocole identique ×4 : sauvegarde + sha256 avant modification (`139b4c0e00b1801f1372d1bb935fee6a1db290f1cc8bd90d0716e6a7ab46398a`) → un seul point changé → `node --import ./scripts/ts-loader.mjs scripts/livrer-site-qa.mjs` rejoué en entier (le vrai verifier de la fiche) → constat du rouge → restauration par `cp` depuis la sauvegarde → `cmp` + sha256 recontrôlés identiques → sabotage suivant (jamais deux actifs en même temps).

| # | Ligne sabotée | Point sabotage | Critère visé | Sabotage actif (`verifier` complet) | Après restauration (sha256) |
|---|---|---|---|---|---|
| 1 | `:53` `spawnSync(process.execPath, …)` | ajout `const exe = process.execPath` + appel `spawnSync(exe, …)` — **comportement strictement inchangé** (`exe === process.execPath`), seul le texte source change | **CH-10** (littéral `process.execPath` exigé par le juge) | `❌ CH-10 spawnSync(exe, …) : process.execPath attendu` — `FAIL — CH-6, CH-10` (CH-6 inchangé, rien d'autre touché) | `139b4c0e…6398a` identique (`cmp` : fichiers identiques) |
| 2 | `:40` `if (age <= 60 * 60_000)` | seuil de reprise du verrou porté à `9999 * 60_000` : un verrou de 61 min n'est plus jamais repris | **CH-4** | `❌ CH-4 verrou de 61 min : code 5, 0 attendu (repris) — Déjà en cours.` — cascade attendue : le verrou factice (pid 999999) posé par le sous-test CH-4 n'est alors plus jamais purgé (l'`exit(5)` de la ligne 40 sort avant le `finally` qui supprime `.verrou`), donc CH-5, CH-6, CH-7, CH-8, CH-11, CH-12 (qui réutilisent le même dossier de commande) buttent tous sur le même verrou « toujours en cours » : `FAIL — CH-4, CH-5, CH-6, CH-7, CH-8, CH-11, CH-12`. Cascade mécanique et attendue (même verrou, même dossier), pas un faux rouge ailleurs. Verrou-fantôme nettoyé après restauration (`.orchestre/travail/livrer-site-qa/banc/.orchestre/travail/livraison/…/.verrou`, sous `.orchestre/travail/`) | `139b4c0e…6398a` identique |
| 3 | `:147` `issue = 4` (plafond de régénérations) | `issue = 4` → `issue = 1` (le plafond déclenche toujours au même seuil, seul le code de sortie change) | **CH-5** | `❌ CH-5 regenerations: 2 et un texte répété : code 1, 4 attendu — site-qa : code 1 \| Plafond de régénérations` — `FAIL — CH-5, CH-6` (aucun autre critère touché) | `139b4c0e…6398a` identique |
| 4 | `:25` `process.exit(2)` (usage invalide) | `process.exit(2)` → `process.exit(7)` | **CH-1** (et une partie de CH-11, qui partage la même garde d'usage pour `--usine`) | `❌ CH-1 sans argument : code 7, 2 attendu ; --sortie sous public/ sans --usine : code 7, 2 attendu` et `❌ CH-11 sortie dans le dépôt : code 7, 2 attendu` — `FAIL — CH-1, CH-6, CH-11` | `139b4c0e…6398a` identique |

Chaque sabotage a rougi **exactement** le ou les critères qui partagent son point de code, sans aucun rouge inexpliqué ailleurs : deux cascades (#2 et #4) sont mécaniques et documentées (même verrou reparcouru, même garde d'usage partagée), pas un juge qui décroche au hasard.

## Vérification finale (verifier officiel, après les 4 restaurations)

```
$ node --import ./scripts/ts-loader.mjs scripts/livrer-site-qa.mjs
✅ CH-1  ✅ CH-2  ✅ CH-4  ✅ CH-5  ❌ CH-6 (code 1, 3 attendu — export : code 3 | Export échoué)
✅ CH-12 ✅ CH-7  ✅ CH-8  ✅ CH-10 ✅ CH-11 ✅ CH-3  ✅ CH-PV
livrer-site-qa : FAIL — CH-6
```

Identique au témoin de départ (section 2) : 11 critères verts, CH-6 seul rouge, même message au caractère près. `git status --porcelain scripts/livrer-site.mjs` : `?? scripts/livrer-site.mjs` (fichier non suivi, aucune modification résiduelle). Aucun artefact laissé (verrou-fantôme purgé, section sabotage #2).

## Verdict de la contre-vérification

**ROUGE — le PASS n'est plus reproductible maintenant.** La revue Codex n'a pas pu juger (3, quota ChatGPT épuisé, aucun rapport avec 026-100), mais le passage témoin qu'elle déclenche avant Codex — sur un bac neuf de l'usine, indépendant du PC — a suffi à révéler que **CH-6 échoue actuellement**, confirmé une seconde fois en direct sur le PC. Ce n'est ni le défaut déjà connu et corrigé (CH-8, FAIL du 10:44), ni un défaut du juge (`livrer-site-qa.mjs` intact depuis le 27/09, aucune correction en cause), ni un aléa d'environnement (deux machines indépendantes, même verdict) : c'est un vrai bug de `scripts/livrer-site.mjs:134`, apparu **après** l'instant de la preuve PASS (13:58:10Z) et **avant** cette contre-vérification (le fichier a changé de mtime à 14:35:30Z pendant cette fenêtre) — `issue = exporte.code === 4 ? 3 : 1` ne peut jamais valoir 3 en pratique puisque l'exporteur ne rend jamais le code 4, alors que CH-6 (dossier incomplet, code 3 côté exporteur) est exactement le cas que la fiche promet de propager en code 3.

Les 4 sabotages confirment par ailleurs que le juge n'est pas aveugle sur les 11 autres critères : chacun, avec exactement un point de production changé et un comportement autrement inchangé, a fait rougir le ou les critères attendus, restauration octet pour octet vérifiée par sha256 et `cmp` à chaque étape, verifier revenu à l'état témoin exact après les 4 cycles.

**En clair pour Benj : 026-100 est actuellement en échec (CH-6), pas PASS**, malgré la preuve de 13h58 encore dans `.orchestre/preuves/026-100/verifier.log` (laissée intacte, non écrasée, pour garder la trace de l'écart). Le fichier `scripts/livrer-site.mjs` reste sur le disque **dans l'état trouvé** (celui qui échoue), restauré depuis mes 4 sabotages mais pas corrigé — cette contre-vérification n'avait pas mandat de réparer, seulement de vérifier. Correction suggérée pour qui reprendra la fiche (non appliquée ici) : `scripts/livrer-site.mjs:134`, faire correspondre le code réel de l'exporteur pour « dossier incomplet » (3) plutôt que le code 4 qu'il ne rend jamais.
