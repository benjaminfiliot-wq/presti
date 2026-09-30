<!-- Gabarit AGENTS.md de l'orchestre. `orchestre init` remplace {{projet}} et {{description}} ; les passages entre
     {{#vault}} … {{/vault}} ne sont gardés que si `.orchestre/orchestre.json` déclare une clé `vault` (sinon ils sont
     retirés, balises comprises). Le bloc entre orchestre:debut / orchestre:fin est réécrit par `orchestre contexte`. -->
# AGENTS.md — règles pour tout exécutant dans le dépôt {{projet}}

{{description}}
Tu n'explores pas le dépôt : tu lis `.orchestre/contexte.md` (ce que le code fait){{#vault}} et, dans le vault
configuré (`vault` dans `.orchestre/orchestre.json`), `CLAUDE.md` puis la carte du code (`carteVault`) — le pourquoi{{/vault}}.
Puis tu prends une tâche.

## La boucle d'un exécutant

1. `node scripts/orchestre.mjs prochaine --agent=<ton-nom>` — la tâche s'affiche en entier, avec ce qu'il faut faire à la fin.
2. Tu travailles UNIQUEMENT dans `perimetre`. `interdit` reste intact, même pour « aider ». Le `budget` (fichiers, minutes) est une limite, pas une cible.
3. Tu déposes ta preuve dans `.orchestre/preuves/<id>/` : la sortie de la commande `verifier`. Les captures d'écran sont prises par le juge quand le vérificateur le prévoit — jamais une image fabriquée, jamais un fichier copié, jamais un fichier de 0 octet : c'est un refus, et la tâche repart en file.
4. Tu lances `node scripts/orchestre.mjs verifier <id>` autant de fois que nécessaire tant que la tâche est en `en-cours/`.
5. Vert ? Tu déplaces le fichier de `en-cours/` vers `fait/` et tu relances `verifier <id>` : ce verdict-là compte.
6. Bloqué ? `.orchestre/en-cours/<id>.question.md` avec deux ou trois options numérotées. Tu attends `<id>.reponse.md`. Jamais un paragraphe.
7. Un choix que la tâche ne tranche pas ? `.orchestre/decisions.md` d'abord : si la question y est, tu appliques le défaut ; sinon tu prends l'option réversible, tu l'écris là, tu continues.
8. Tu abandonnes ? `node scripts/orchestre.mjs liberer <id>`.

Un agent, une tâche : une fois inscrit dans `.orchestre/agents.jsonl`, tu n'en reçois pas d'autre dans la même
conversation. Plusieurs agents peuvent tourner en même temps : `prochaine` ne donne jamais deux tâches aux
périmètres qui se chevauchent.

Interdit, sans exception : `git restore`, `git checkout <fichier>`, `git stash`, `git reset`, `git clean`,
`git revert`, et supprimer ou vider un fichier hors périmètre. Le dépôt porte d'autres chantiers non committés :
ils ne sont pas à toi. Si le vérificateur te reproche un fichier que tu n'as pas touché, écris une question et attends.
{{#vault}}
Tu n'écris dans le vault que par une tâche dont le périmètre le vise explicitement.
{{/vault}}

<!-- orchestre:debut — bloc tenu à jour par `node scripts/orchestre.mjs contexte` ; ne pas éditer à la main -->
<!-- orchestre:fin -->
