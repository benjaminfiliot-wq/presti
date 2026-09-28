# 026-051 — durcissement du juge du 28/09 (mission « juges à durcir »)

Suite de `.orchestre/preuves/026-051/contre-verif-28-09.md` (verdict : verifier vrai PASS, mais juge à deux angles morts
bloquants + trois majeurs). Fait par Claude Code (permis : le juge est écrit par Claude Code, l'exécutant — Codex — n'y a
jamais touché et n'y touche toujours pas). Fichier modifié : **`scripts/pilotage-push-qa.mjs`** seul. **Aucune ligne de
production** (`lib/push.ts`, `lib/alertes.ts`, `lib/pilotage/notifications.ts`) n'a changé : les trois sha256 ci-dessous sont
identiques à ceux relevés dans `contre-verif-28-09.md`.

```
lib/push.ts                    6591e091ddbe735d87f2542876b3108449cad54537a913be030e113cbe5ce799
lib/alertes.ts                 205f339aa1cf5361b2b7fd7315f700074733dc1faa35992cbfd0042bf9645812
lib/pilotage/notifications.ts  a9801b833a6f6b0085c2d5f165e9c83212ac766bfea65c40bd63d408d7214909
```

## 1. Les cinq défauts et leur correction

| # | gravité | défaut (contre-vérif du 28/09) | correction dans le juge |
|---|---|---|---|
| 1 | **BLOQUANT** | PF-5 ne lit que le texte source de `lireFondateurs` : un corps qui ignore la requête et rend deux identifiants figés (ceux de la fixture) passe PASS 10/10 | Les identifiants F1/F2/DEMO/ARTISAN de la fixture (`TABLES`) sont désormais tirés par `randomUUID()` **à chaque exécution** du processus enfant, plus jamais les littéraux fixes `…f001`/`…f002`. Un `lireFondateurs` qui renverrait des identifiants figés (anciens ou non) ne matche plus les fondateurs réels de la table truquée : PF-8 (déjà présent, scénario A, et H ci-dessous) rougit — « push vers personne, F2, F1 attendu » |
| 2 | **BLOQUANT** | PF-7 ne détecte pas une exclusion supplémentaire dans la condition (`&& al.motif !== 'coupe_circuit'`) ; PF-8 n'exerçait que `panne_agent`, jamais `coupe_circuit` | Nouveau scénario **H** dans PF-8 : chacun des neuf motifs de `MOTIFS_POUSSES` (pas seulement `panne_agent`) est déclenché isolément avec sa propre alerte d'entreprise d'`alertes-push.json`, et le push doit atteindre les deux fondateurs à chaque fois — `coupe_circuit` y compris |
| 3 | MAJEUR | PF-2/PF-8 ne comparent le titre/la ligne qu'à leur longueur, jamais au texte réellement prescrit par la fiche | Table `PRESCRIT` (titre + ligne exacts, recopiés de `fait/026-051.md` § « Ce qu'il faut faire », pour les six motifs d'origine) comparée dans PF-2 ; les trois motifs ajoutés le 28/09 n'ont pas de texte prescrit à la lettre par la fiche et ne sont pas comparés sur ce point |
| 4 | MAJEUR | PF-2/PF-8 ne vérifient jamais `renotify` | Même table `PRESCRIT`, champ `renotify`, comparée pour les neuf motifs (true pour les quatre urgents d'origine + les trois ajoutés du 28/09, false pour `coupe_circuit`/`digest`, conforme à la fiche : « renotify vrai pour les quatre urgents ») |
| 5 | MAJEUR | PF-4 accepte un total `envoyes` calculé sur le nombre de fondateurs plutôt que mesuré sur les envois réellement rendus | La doublure `envoyer` du test « deux fondateurs » rend désormais des `envoyes` **asymétriques et différents de 1** (0 pour le premier, 3 pour le second) : la somme réelle attendue est 3, alors que `fondateurs.length` vaudrait 2 — un total recopié sur le nombre de fondateurs rougit |

Trois sabotages annexes de Codex (n°2 « texte générique figé », n°3 « renotify inversé », n°4/n°5 déjà couverts ci-dessus, n°6
« condition inversée » déjà attrapé par PF-3/PF-7/PF-8 avant durcissement) restent couverts par ailleurs ; les cinq lignes du
tableau sont les cinq défauts listés dans `contre-verif-28-09.md` (2 bloquants confirmés indépendamment R1/R2, 3 majeurs
rapportés par Codex).

## 2. Preuve par sabotage — chaque défaut reproduit puis rougi par le bon critère, restauration octet pour octet

Protocole identique à chaque coup : copie de sauvegarde (déjà faite une fois, `.orchestre/travail/durcissement-026-051/*.avant`),
une modification sur la PRODUCTION (jamais sur le juge), `node --import ./scripts/ts-loader.mjs scripts/pilotage-push-qa.mjs`
rejoué en entier, critère rouge constaté, restauration par `cp`, sha256 recontrôlé identique à l'original avant le sabotage
suivant.

| # | fichier | sabotage (reproduit exactement celui de la contre-vérification) | verdict avant durcissement | verdict après durcissement | sha256 restauré |
|---|---|---|---|---|---|
| 1 | `lib/push.ts` | `lireFondateurs` : requête ignorée (`void data`), retourne `['…f001', '…f002']` en dur (= sabotage R2 de la contre-vérif) | PASS 10/10 | **FAIL — PF-3, PF-8** : « panne_agent : push vers personne, F2, F1 attendu » (+ 12 défauts, dont les scénarios H) | `6591e091…ce799` ✓ (identique) |
| 2 | `lib/alertes.ts` | `al.a === 'entreprise'` → `al.a === 'entreprise' && al.motif !== 'coupe_circuit'` (= sabotage R1 de la contre-vérif) | PASS 10/10 | **FAIL — PF-8** : « motif coupe_circuit (H) : push vers personne, F2, F1 attendu » | `205f339a…5812` ✓ (identique) |
| 3 | `lib/pilotage/notifications.ts` | `paiement` : titre/ligne remplacés par un texte générique (« Notification » / « Une notification demande votre attention. ») (= sabotage n°2 de Codex) | PASS | **FAIL — PF-2** : « paiement : titre "Notification", "Paiement" prescrit par la fiche ; … ligne … » | `a9801b83…4909` ✓ (identique) |
| 4 | `lib/pilotage/notifications.ts` | `paiement` : `renotify: true` → `renotify: false` (= sabotage n°3 de Codex) | PASS | **FAIL — PF-2** : « paiement : renotify false, true prescrit par la fiche » | `a9801b83…4909` ✓ (identique) |
| 5 | `lib/push.ts` | `envoyerPushFondateurs` : `envoyes` = `fondateurs.length` au lieu de la somme des envois réels (= sabotage n°5 de Codex) | PASS | **FAIL — PF-4** : « deux fondateurs : envoyes = 2, 3 attendu (0 + 3, mesuré sur les envois rendus — pas le nombre de fondateurs) » | `6591e091…ce799` ✓ (identique) |

Chaque ligne a été jouée séparément (un seul sabotage actif à la fois), avec restauration complète et sha256 recontrôlé avant
le sabotage suivant — jamais deux sabotages cumulés.

## 3. Rejeu final — verifier entier, code livré non modifié

Après restauration complète des trois fichiers de production (sha256 ci-dessus, identiques à `contre-verif-28-09.md`) :

```
$ node --import ./scripts/ts-loader.mjs scripts/pilotage-push-qa.mjs        → PASS (3 fois de suite, PF-1 à PF-10 verts —
                                                                                stabilité malgré les identifiants aléatoires)
$ node --import ./scripts/ts-loader.mjs scripts/pilotage-push-qa.mjs --temoin → PASS (PF-T1, PF-T2, PF-T3 verts)
$ node scripts/orchestre.mjs verifier 026-051                                → ✓ 026-051 : PASS · 37s
```

Sortie complète de ce dernier rejeu (celui qui fait foi) : `.orchestre/preuves/026-051/verifier.log`.

## 4. Ce qui n'est pas corrigé ici

- Le texte exact (titre/ligne) des trois motifs ajoutés le 28/09 (`usine_injoignable`, `canal_arrete`, `gmail_bloque`) n'est
  comparé à rien de prescrit à la lettre : l'addendum de la fiche ne fixe qu'une forme de charge (`{ motif, depuis_minutes }`
  etc.), pas un titre/une ligne mot pour mot. Seul `renotify` (true) est vérifié pour ces trois-là.
- PF-7 (lecture de source) n'a pas été retouché : le scénario H de PF-8, comportemental et qui exerce réellement les neuf
  motifs, couvre le même défaut plus directement (une exclusion dans la condition, quelle que soit sa forme syntaxique,
  se voit dans le résultat, pas dans le texte).
- Mineur (« un rouge PF-10 transitoire, session concurrente ») : sans rapport avec 026-051, pas retouché.

## 5. Périmètre du commit

`scripts/pilotage-push-qa.mjs` a été ajouté au `perimetre` de `.orchestre/fait/026-051.md` (avec une note) pour que
`commit-fiche.sh` le committe avec la fiche : ce n'est pas l'exécutant (Codex, qui n'a jamais touché ce fichier) qui l'a
modifié, mais Claude Code, dans cette mission de durcissement — permis explicitement, le juge restant interdit à tout
exécutant qui reprendrait 026-051 plus tard (`interdit` inchangé sur ce point, seul `scripts/pilotage-push-qa.mjs` en est
sorti pour refléter qui l'a écrit).
