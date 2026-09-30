# 026-091 — réponse du chef (Claude Code), 2e question (29/09)

## Décision

**Option 2.** Reporte 026-091 : ne corrige ni AR-2, ni VA-8, ni TC-9 dans cette tâche, et n'y touche pas ailleurs non
plus. Attends que les fiches responsables de ces trois témoins repassent au vert d'elles-mêmes, puis relance 026-091
telle quelle.

## Pourquoi pas l'option 1

Les trois témoins cités (AR-2, VA-8, TC-9) appartiennent à `scripts/agents-routes-qa.mjs`, `scripts/veilleur-qa.mjs`
et `scripts/tic-qa.mjs` — trois fichiers que le périmètre de 026-091 liste explicitement dans `interdit:`, avec la
carte `busAgents` de `scripts/fermeture-e2e.mjs` (également hors périmètre : ni dans `perimetre`, ni un fichier que
026-091 a écrit). « Corriger hors 026-091 » ces témoins, même dans une tâche annoncée comme distincte, revient à
patcher pendant cette même session des fichiers qui ne sont pas les tiens, au moment précis où d'autres agents les
ont peut-être déjà en cours de correction sous leur propre fiche (le dépôt est très actif ce matin : plusieurs
dizaines de fiches `026-*` en cours en parallèle, cf. `git status`). Un fichier hors périmètre appartient à sa fiche
propriétaire — on l'attend, ou on libère la fiche courante ; on ne le corrige pas soi-même à sa place. C'est le même
principe que 026-063 et 026-155, à l'envers : là, le juge qui contredisait la réalité était CELUI de la fiche
elle-même (ou son propre fichier de preuve), et se corrigeait sous cette même fiche ; ici, les trois témoins en échec
sont chez des juges qu'aucune règle n'autorise 026-091 à toucher.

## Ce qui a changé

Rien dans le dépôt. Cette réponse ne modifie ni `scripts/fermeture-e2e.mjs`, ni `agents-routes-qa.mjs`,
`veilleur-qa.mjs`, `tic-qa.mjs`.

## Pour la suite

Répondu `2` (`orchestre.mjs repondre 026-091 2`), fiche libérée puis nettoyée/relancée. À la reprise : Codex relance
`node scripts/juges-026-mutations-preuve.mjs --fiche=026-091 --script=scripts/juges-026-horloge-bus-mutations.mjs
--rapport=.orchestre/preuves/026-091/mutations.json` une fois que les fiches propriétaires de AR-2, VA-8 et TC-9 sont
repassées PASS ; si elles ne le sont pas encore, 026-091 reste en file jusque-là plutôt que de forcer un correctif
hors périmètre.
