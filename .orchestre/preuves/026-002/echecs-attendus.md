# 026-002 — les juges de la sécurité échouent aujourd'hui sur leur premier critère

Écrit par `node scripts/juges-026-securite-preuve.mjs` le 2026-09-26T09:10:29.017Z, sur l'arbre actuel. Une ligne par juge : le critère en échec aujourd'hui, l'extrait réel de sa sortie (sa première ligne en échec), les critères de non-régression verts. Les sorties complètes sont dans `sorties/` et `autotest-*.log`.

| Juge | Code | Critère en échec aujourd'hui | Extrait réel de sa sortie | Critères NR verts |
|---|---|---|---|---|
| `scripts/media-octets-qa.mjs` | 1 | MO-1 | FAIL MO-1 — lib/typeImage.ts absent de C:/Users/benja/Documents/presti | MO-NR1 |
| `scripts/instantane-quotidien-qa.mjs` | 1 | IQ-1 | FAIL IQ-1 — scripts/instantane-quotidien.mjs absent de C:/Users/benja/Documents/presti | — (aucun critère NR) |
| `../orchestre/test/git-garde-qa.mjs` | 1 | GG-1 | FAIL GG-1 — hooks/git-garde.mjs absent de C:/Users/benja/Documents/orchestre | GG-NR1 |

## Contrôles de la preuve

- **JP-1** PASS — media-octets-qa code 1, premier échec MO-1 ; instantane-quotidien-qa code 1, premier échec IQ-1 ; git-garde-qa code 1, premier échec GG-1
- **JP-2** PASS — critères NR verts : MO-NR1, GG-NR1 (instantane-quotidien-qa n'en a pas)
- **JP-3** PASS — aucun motif de secret dans 4 fichiers (les 3 juges et cette preuve) ; motifs éprouvés : 11/11 faux secrets reconnus, 0 signalement sur 3 textes propres
- **JP-4** PASS — git status de presti inchangé hors .orchestre/travail/ et .orchestre/preuves/026-002/ ; ../orchestre inchangé hors test/git-garde-qa.mjs
- **JP-5** PASS — bac à sable créé et supprimé par le juge (bac-2026-09-26T0903-26744), dépôt nu local dans le bac ; juges lancés avec GIT_ALLOW_PROTOCOL=file
- **JP-6** PASS — témoins verts et défauts plantés attrapés par leur critère : media-octets-qa 13 défauts plantés, instantane-quotidien-qa 16 défauts plantés, git-garde-qa 14 défauts plantés

Verdict : **PASS**
