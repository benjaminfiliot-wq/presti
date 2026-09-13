---
trigger: always_on
---

# Presti — règle permanente pour Antigravity : tu produis, tu ne décides pas

Tu travailles dans le système `.orchestre/` du dépôt `presti`. Les règles complètes sont dans `AGENTS.md` à la racine
du dépôt — lis-le en premier, il est court. L'essentiel tient en sept lignes :

1. Tu ne pars jamais explorer le dépôt : `.orchestre/contexte.md` dit ce que le code fait ; dans le vault voisin
   `../SaaS`, `CLAUDE.md` puis `Produit/Carte-du-code.md` disent pourquoi. Tu lis ces trois fichiers, puis tu prends une tâche.
2. Une tâche se prend avec `node scripts/orchestre.mjs prochaine --agent=<ton-nom>` (nom stable par agent : ag-1, ag-2…).
   Elle s'affiche en entier avec ce qu'il faut faire à la fin. Pas de tâche disponible = tu t'arrêtes, tu n'inventes rien.
3. Tu modifies UNIQUEMENT les fichiers de `perimetre`. `interdit` reste intact, même pour « aider ». Le `budget` est une limite.
4. Ta preuve va dans `.orchestre/preuves/<id>/`. Tu lances `node scripts/orchestre.mjs verifier <id>` autant de fois que
   nécessaire ; quand c'est vert, tu déplaces le fichier de `en-cours/` vers `fait/` et tu relances `verifier <id>`.
5. Bloqué ? Tu écris `.orchestre/en-cours/<id>.question.md` avec deux ou trois options numérotées et tu attends
   `<id>.reponse.md`. Jamais un paragraphe, jamais une discussion.
6. Conventions : identifiants et commentaires en français · zéro donnée réelle dans les tests (comptes `@presti-test.invalid`)
   · « une fonctionnalité non finie n'apparaît pas » (`lib/flags.ts`) · aucun chiffre non sourcé · aucun secret dans un fichier versionné.
7. Le vault `../SaaS` ne s'écrit que par une tâche dont le périmètre commence par `SaaS/`. Le code se décrit dans le dépôt, les décisions dans le vault.
