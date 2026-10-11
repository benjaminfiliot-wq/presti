# 026-201 — juges GA-6 et TA-5, et juges voisins de `lib/siteLivraison.ts` (04/10/2026)

Décision D-0410-10 (`.orchestre/decisions-chef-0410.md`) : le commit 771d765d (026-201, Search Console dans `tourLivraison`) a rendu
rouges `generation-actions-qa` GA-6 et `tuile-argent-qa` TA-5, qui défont des évolutions connues de `lib/siteLivraison.ts` avant de
comparer le fichier à sa base d'avant la fiche. Le chef accorde l'ajout de CETTE évolution nommée à la liste de ces deux juges, sans
rien assouplir.

## Ce qui a changé (2 fichiers, 2 lignes de logique chacun, rien d'autre)

- `scripts/generation-actions-qa.mjs` : `retirerEvolutions(actuel, LIVRAISON, ['49753f4c'])` devient `['771d765d', '49753f4c']`.
- `scripts/tuile-argent-qa.mjs` : `retirerEvolutions(actuel, MODULE_LIV, ['49753f4c', '6d9a9c5a'])` devient
  `['771d765d', '49753f4c', '6d9a9c5a']`.
- Un commentaire par juge nomme 771d765d (026-201 : Search Console, `tourLivraison` appelle `lib/sites/searchConsole.ts`, trois sites au
  plus par tour, hors pause) et dit l'ordre : de la révision la plus récente à la plus ancienne, car chaque évolution se défait sur le
  texte qui la suit (771d765d défait en premier : 49753f4c et 6d9a9c5a se défont ensuite sur un texte qui a retrouvé leur état).
- Ni la fonction `retirerEvolutions`, ni aucun contrôle (import hors contrat, ligne retirée, un seul bloc, appel dans un try, garde
  GITHUB_DISPATCH_TOKEN / !enPause, ajoutTryCatch de veilleTresorerie, route cron inchangée) n'est touché.
- Rien n'est « appris » du fichier jugé : `retirerEvolutions` prend le diff de la révision nommée dans l'historique git
  (`rev^` contre `rev`) et exige que le texte ajouté se retrouve UNE seule fois, à l'identique, dans le fichier jugé. Tout octet
  changé dans la zone couverte (du premier au dernier bloc du commit 771d765d : les imports jusqu'au `try` Search Console de
  `tourLivraison`) donne « évolution 771d765d altérée ou ambiguë ». La liste reste donc une liste de changements NOMMÉS et précis.
- Réserve à connaître : cette zone couvre presque tout le fichier (comme celle de 49753f4c). Toute future fiche qui touche
  `lib/siteLivraison.ts` entre ses imports et son `try` Search Console fera de nouveau échouer ces deux juges : même demande au chef,
  une ligne de plus dans chaque liste (c'est le prix de la précision, voulu par D-0410-10).
- Avant ma modification, dans l'arbre : GA-6 FAIL (20 défauts, « évolution 49753f4c altérée ou ambiguë ») et TA-5 FAIL
  (37 défauts, « évolution 49753f4c … 6d9a9c5a altérée ou ambiguë »). `retirerEvolutions` et ses entrées 49753f4c / 6d9a9c5a étaient déjà
  dans les deux fichiers, non commitées depuis 12 h 05 (ajout du chef le 04/10 ; dans `tuile-argent-qa`, aussi les réponses exactes des
  deux RPC du bus et la doublure de stockage « usine vide » du tour exécuté). Le commit ci-joint les emporte, puisqu'un fichier se
  commite entier : ce n'est pas mon travail et je n'y ai pas touché.

## Résultats après la modification

| Juge | Mode | Résultat |
|---|---|---|
| generation-actions-qa | complet (GA-1 à GA-8, GA-PV) | PASS, code 0 (GA-6 vert ; GA-8 `tsc` 131 s) — `complet-ga.log` |
| tuile-argent-qa | complet (TA-1 à TA-7, TA-PV) | PASS, code 0 (TA-5 vert, tour exécuté avec la veille qui lève ; TA-7 `tsc` 108 s) — `complet-ta.log` |

## Contre-vérification : sabotages sur des copies (sha256 du dépôt relevés avant et après)

Le dépôt est partagé par plusieurs sessions et `lib/siteLivraison.ts` y est lu par d'autres juges : je ne l'ai donc pas rendu faux,
même une minute. Chaque sabotage est joué sur une COPIE (`--racine=<copie>`, script `sabotages-copies.mjs` : copie les 4 fichiers lus
par les deux juges, applique UNE faute, imprime le dossier). `lib/siteLivraison.ts` du dépôt :
sha256 `74dade67…0167` avant (`sha-avant.txt`) et après (`sha-apres.txt`), identique : rien à restaurer. Les deux juges eux-mêmes ont
pour sha256 `f0f12fce…edc7` → `c181a5b1…03c5` (generation-actions-qa) et `0ed33f6c…5ac` → `07651177…ffd8` (tuile-argent-qa).

GA-6 (`generation-actions-qa --seulement=GA-6 --racine=<copie>`, `sabotages-ga.log`) : les 6 sabotages sont pris, code 1.

| Sabotage (une faute, sur la copie) | Verdict | Motif donné par le juge |
|---|---|---|
| `SITES_SEARCH_CONSOLE_PAR_TOUR` 3 → 30 (dans le bloc de 026-201) | FAIL GA-6 | « évolution 771d765d altérée ou ambiguë » |
| `if (!pause)` retiré devant `soumettrePlansDus` | FAIL GA-6 | « évolution 771d765d altérée ou ambiguë » |
| `GITHUB_DISPATCH_TOKEN` retiré de la garde de `demanderGeneration` (contrat de 026-106) | FAIL GA-6 | « évolution 771d765d altérée ou ambiguë » (22 défauts) |
| `fetch('https://exemple.invalid/x')` glissé avant `let tresorerieOk` (hors de la zone de 771d765d) | FAIL GA-6 | « évolution 49753f4c altérée ou ambiguë » |
| `import { fuite } from '@/lib/fuite'` en tête de fichier (hors de toute zone nommée) | FAIL GA-6 | « import ajouté hors contrat : @/lib/fuite → fuite » (le contrôle historique) |
| fonction étrangère en fin de fichier (hors de toute zone nommée) | FAIL GA-6 | « 2 bloc(s) ajouté(s), exactement un attendu ; lignes … hors du corps de tourLivraison » |

TA-5 (`tuile-argent-qa --temoin --racine=<copie>`, part de non-régression, `sabotages-ta.log`) : les 6 sabotages sont pris, code 1.

| Sabotage (une faute, sur la copie) | Verdict | Motif donné par le juge |
|---|---|---|
| `SITES_SEARCH_CONSOLE_PAR_TOUR` 3 → 30 | FAIL TA-5 | « évolution 771d765d altérée ou ambiguë » (puis 49753f4c, 6d9a9c5a) |
| `if (!pause)` retiré devant `soumettrePlansDus` | FAIL TA-5 | « évolution 771d765d altérée ou ambiguë » |
| `veilleTresorerie()` appelée hors de son try/catch (contrat de 026-059) | FAIL TA-5 | « évolution 49753f4c altérée ou ambiguë » (24 défauts) |
| `fetch(...)` glissé avant `let tresorerieOk` | FAIL TA-5 | « évolution 49753f4c altérée ou ambiguë » |
| `import { fuite } from '@/lib/fuite'` en tête de fichier | FAIL TA-5 | « import ajouté hors contrat : @/lib/fuite → fuite » |
| fonction étrangère en fin de fichier | FAIL TA-5 | « lignes … ajoutées hors d'un try/catch ; 0 appel à veilleTresorerie ; hors du corps de tourLivraison ; 2 blocs ajoutés » |

Lecture : une faute DANS une zone d'évolution nommée est prise par l'égalité exacte de cette évolution ; une faute HORS de toute zone
nommée est prise par les contrôles historiques, restés intacts. Aucune faute ne passe.
Et sans l'entrée 771d765d, les deux juges étaient rouges sur le code sain (constat en tête de note) : l'entrée est nécessaire, et elle
ne suffit pas à excuser autre chose.

## Juges voisins qui lisent `lib/siteLivraison.ts` (PC chargé : plusieurs sessions et usines de typecheck en même temps)

Lancés complets avec un plafond de 900 s chacun (`voisins/*.log`).

| Juge | Résultat |
|---|---|
| livraison-tour-qa | PASS, code 0 (226 s) |
| bus-livraison-qa | PASS, code 0 (667 s) |
| search-console-qa (le juge de 026-201) | PASS, code 0 (96 s) |
| retrait-site-qa | RT-1 à RT-7 verts, dont RT-7 (le diff de `lib/siteLivraison.ts`, tour exécuté en pause et hors pause) ; RT-8 (`tsc`) coupé par mon plafond de 900 s (code 124) : pas un verdict |
| achat-public-qa | AP-1 à AP-9 et AP-11 verts (dont le contrôle « `lib/siteLivraison.ts` appelle `purgerBrouillonsPublics(` dans un try ») ; AP-10 (NR) : le sous-juge `webhook-muet-qa` (qui ne lit pas `lib/siteLivraison.ts`, son WM-4 est un typecheck) dépasse son plafond de 600 s sur ce PC chargé, deux fois (code 143 puis ETIMEDOUT) : pas un verdict sur `lib/siteLivraison.ts` ; à rejouer sur l'usine ou PC au calme |
| achat-ecrans-qa | EA-1 à EA-5 verts ; coupé à 900 s pendant le serveur `next dev` d'EA-6+ (code 124), qui ne lit `lib/siteLivraison.ts` que comme fichier amont copié : pas un verdict |

| banc `juges-026-lt-mutations.mjs --juge=tuile-argent --seul=TA-5` (026-152 : copie de HEAD, témoin puis la faute « veilleTresorerie() hors de son try ») | INCONCLUANT : le témoin a dépassé le délai du banc (code 124 en 541 s, pendant `tsc` : plus de 20 processus node/tsc d'autres sessions tournaient en même temps) ; la faute n'a pas été jouée. Aucune ligne rouge de critère ; le même contrôle (veille hors try) est pris par mon sabotage « veille-sans-try » ci-dessus. À rejouer sur l'usine ou PC au calme. |

Aucun de ces juges ne rougit à cause de la modification de 026-201 ; je n'en ai modifié aucun (seuls GA-6 et TA-5 étaient autorisés).
Ce qui reste non prouvé de bout en bout, faute de PC au calme : RT-8, AP-10, EA-6 et suivants, et le banc 026-152 ci-dessus. RT-8 est un `tsc`
(vert sur le même arbre dans GA-8, TA-7 et AP-11) ; AP-10 et EA-6+ ne lisent pas `lib/siteLivraison.ts`.
