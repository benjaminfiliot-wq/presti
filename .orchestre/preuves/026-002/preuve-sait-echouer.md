# 026-002 — la preuve sait rougir : un défaut planté par critère JP

Pilote jetable lancé le 2026-09-25T23:33:29.475Z par Claude Code. Chaque cas casse UNE entrée (un remplacement de texte dans un fichier du périmètre de 026-002), lance `node scripts/juges-026-securite-preuve.mjs --sans-autotest` (en entier pour JP-6), relève les critères rouges et l'extrait réel, puis restaure l'original et vérifie son empreinte SHA-256. Avec --sans-autotest, JP-6 est toujours « non jugé » (rouge) : il n'est pas compté.

| Cas | Fichier cassé | Attendu | Code | JP rouges | Extrait réel | Restauré |
|---|---|---|---|---|---|---|
| syntaxe-cassee | `scripts/instantane-quotidien-qa.mjs` | JP-1 | 1 | JP-1, JP-5 | FAIL JP-1 — instantane-quotidien-qa : erreur de syntaxe (C:\Users\benja\Documents\presti\scripts\instantane-quotidien-qa.mjs:66 process.stdout.on('error', () => {}); pro… | oui (SHA-256 identique) |
| premier-critere-change | `scripts/media-octets-qa.mjs` | JP-1 | 1 | JP-1 | FAIL JP-1 — media-octets-qa : première ligne en échec « FAIL MO-2 — 7 défaut(s) — aucun appel detecterTypeImage(corps dans POST · detecterTypeIma… » au lieu de MO-1 | oui (SHA-256 identique) |
| juge-vert-aujourdhui | `scripts/instantane-quotidien-qa.mjs` | JP-1 | 1 | JP-1 | FAIL JP-1 — instantane-quotidien-qa : code 0 sur l'arbre actuel (il devrait échouer sur IQ-1) | oui (SHA-256 identique) |
| nr-rouge | `scripts/media-octets-qa.mjs` | JP-2 | 1 | JP-2 | FAIL JP-2 — media-octets-qa : MO-NR1 n'est pas vert (« FAIL MO-NR1 — scripts/quota-media-e2e.mjs absent ») | oui (SHA-256 identique) |
| secret-litteral | `../orchestre/test/git-garde-qa.mjs` | JP-3 | 1 | JP-3 | FAIL JP-3 — ../orchestre/test/git-garde-qa.mjs correspond au(x) motif(s) github | oui (SHA-256 identique) |
| ecrit-hors-travail | `scripts/instantane-quotidien-qa.mjs` | JP-4 | 1 | JP-4 | FAIL JP-4 — presti a bougé hors de .orchestre/travail/ et .orchestre/preuves/026-002/ : +?? essai-jp4.txt | oui (SHA-256 identique) |
| bac-garde | `scripts/instantane-quotidien-qa.mjs` | JP-5 | 1 | JP-5 | FAIL JP-5 — bac à sable resté sur le disque : C:/Users/benja/Documents/presti/.orchestre/travail/instantane-qa/bac-2026-09-25T2335-12428 · la sortie ne dit pas que le ju… | oui (SHA-256 identique) |
| temoin-faux | `scripts/fixtures/026/securite/media/typeImage.temoin.ts.txt` | JP-6 | 1 | JP-6 | FAIL JP-6 — media-octets-qa --autotest : code 1, 13 cas en échec (FAIL AT-temoin — témoin complet (MO-6 compris) en code 1, rouges : MO-1, MO-3 (…), témoin pas vert | oui (SHA-256 identique) |

Verdict du pilote : **PASS** — chaque critère JP passe au rouge sur son défaut, et chaque fichier est revenu à l'original.
