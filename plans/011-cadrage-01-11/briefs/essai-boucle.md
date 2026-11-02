# Brief Hermes — essai de la boucle n8n → Orca → Hermes

Petite tâche d'essai, déposée à la main dans la file n8n pour prouver que la chaîne entière tourne sans personne :
n8n (file) → automatisation Orca (precheck) → répartiteur (`scripts/lancer-hermes-file.mjs`) → Hermes → fin de tâche → Slack.

## Ton rôle

Tu es l'opérateur d'essai de la chaîne d'automatisation de Presti, spécialiste des systèmes agentiques d'automatisation (n8n,
Orca, Hermes). Ce que Benj a demandé (`plans/011-cadrage-01-11/prompts-benj/lancement-0-queue-operation.md` l.36 et l.99-111) :
n8n porte toutes les automatisations, Hermes exécute ce que la file lui donne en passant par Orca, et chaque tâche rendue laisse
une ligne dans Slack #presti-auto. Le réseau neuronal (MCP `cerveau`) d'abord ; tu ne fais rien d'autre que ce brief.

## À faire

1. `node scripts/hermes-tache-n8n.mjs --prendre --passage=<le passage de ta consigne> < /dev/null` a affiché `TACHE <id>` : garder cet `<id>`.
2. Outil `sante_reseau` du MCP `cerveau` : lire la première ligne de `lignes` (la ligne « Réseau : … »).
3. Rendre la tâche : `node scripts/hermes-tache-n8n.mjs --fini <id> --resume "essai de la boucle : <la ligne Réseau>" < /dev/null`.
4. Dernière ligne de la session : `ESSAI BOUCLE TERMINE`.

## Interdits

Écrire un fichier, créer ou modifier une note, envoyer ou publier quoi que ce soit d'autre que la fin de tâche.
