# AGENTS.md — règles pour Antigravity (et tout exécutant) dans le dépôt Presti

Presti est un SaaS Next.js + Supabase pour les artisans du bâtiment (plateforme de conversation, devis, factures, site).
Tu n'explores pas le dépôt : tu lis `.orchestre/contexte.md` (ce que le code fait) et, dans le vault voisin `../SaaS`,
`CLAUDE.md` puis `Produit/Carte-du-code.md` (pourquoi). Puis tu prends une tâche.

## La boucle d'un exécutant

1. `node scripts/orchestre.mjs prochaine --agent=<ton-nom>` — la tâche s'affiche en entier, avec ce qu'il faut faire à la fin.
2. Tu travailles UNIQUEMENT dans `perimetre`. `interdit` reste intact, même pour « aider ». Le `budget` (fichiers, minutes) est une limite, pas une cible. **Interdit absolu, quoi qu'il arrive : `git restore`, `git checkout <fichier>`, `git stash`, `git reset`, `git clean`, et toute suppression hors périmètre** — le 13/09 à 19 h 04, un agent a effacé ainsi trois jours de travail non commité de quatre sessions ; en cas de doute, une question, jamais une action.
3. Tu déposes ta preuve dans `.orchestre/preuves/<id>/` : la sortie de la commande `verifier`, tes captures.
4. Tu lances `node scripts/orchestre.mjs verifier <id>` autant de fois que nécessaire tant que la tâche est en `en-cours/`.
5. Vert ? Tu déplaces le fichier de `en-cours/` vers `fait/` et tu relances `verifier <id>` : ce verdict-là compte.
6. Bloqué ? `.orchestre/en-cours/<id>.question.md` avec deux ou trois options numérotées. Tu attends `<id>.reponse.md`. Jamais un paragraphe.
7. Tu abandonnes ? `node scripts/orchestre.mjs liberer <id>`.

Plusieurs agents peuvent tourner en même temps : `prochaine` ne donne jamais deux tâches aux périmètres qui se chevauchent.

<!-- orchestre:debut — bloc tenu à jour par `node scripts/orchestre.mjs contexte` ; ne pas éditer à la main -->
## Méthode — Claude Code × exécutants (prompt v16 §1)

1. **Claude Code pense, les exécutants produisent** (antigravity, gemini-cli, qwen). Claude Code n'écrit lui-même que ce qui exige du jugement : schéma et migrations, tout ce qui touche à l'argent, sécurité et droits, les cerveaux (prompts) et les verdicts. Tout le reste — variantes, contenus, tests, captures, boucles QA — est une tâche déposée dans `.orchestre/file/`.
2. **Le système vit dans `.orchestre/`** : `file/` (à prendre) → `en-cours/` (verrou `<id>.lock`) → `fait/` ou `refuse/`. Une tâche = un Markdown à en-tête YAML (`id, type, objectif, perimetre, interdit, verifier, budget, preuve` — tous obligatoires) ; `node scripts/orchestre.mjs prochaine --agent=<nom>` la distribue sans chevauchement de périmètre.
3. **La vérification est mécanique** : `node scripts/orchestre.mjs verifier <id>` exécute la commande `verifier` de la tâche ; son code de sortie fait le verdict, écrit dans `.orchestre/digest.md`. Personne ne relit un diff : on lit le digest.
4. **Ce que le code fait vit dans `.orchestre/contexte.md`** (régénéré depuis le code, copié dans `../SaaS/Produit/Carte-du-code.md`) ; **pourquoi on l'a décidé vit dans le vault** `../SaaS` (`CLAUDE.md`, `Decisions/`, `Récap-Projet.md`). Avant toute tâche : lire ces deux cartes, pas le dépôt. On n'écrit dans le vault que par une tâche dont le périmètre est `SaaS/…`.
5. **Bloqué = une question à options** : `.orchestre/en-cours/<id>.question.md`, deux ou trois options numérotées ; la réponse arrive en `<id>.reponse.md` (`orchestre.mjs repondre`). Jamais une discussion.
6. **Poussé n'est pas déployé** : après chaque push sur `main`, `node scripts/deploiement-etat.mjs` (le 13-14/09, 37 déploiements de production en ERROR à la suite, près de quinze heures sans que personne ne le voie) ; avant de pousser une page, `npm run build` en local.
7. **Quand Antigravity est à sec** : `scripts/executant.mjs` (Gemini CLI ou Qwen Code, gratuits, même contrat de tâche). Un site de démonstration se **génère** (`public/sites-demo/generer.mjs`, kit et direction artistique dans `_kit/`), ses photos viennent de `scripts/photos-demo.mjs` et leur provenance se prouve (`scripts/photos-provenance.mjs`) — une attribution déclarée ne vaut rien.
8. **Routage des modèles (v16 §1.3)** : jugement (schéma, argent, sécurité, cerveaux, verdicts) → Claude Code ; exploration et résumés de fichiers → sous-agent `haiku` ; volume (pages, variantes, tests, boucles QA) → Antigravity ou `executant.mjs` ; recherche web → Perplexity ; navigation et captures → navigateur d'Antigravity ou Claude in Chrome. Claude Code lit `digest.md` et `contexte.md`, pas le dépôt ; `node scripts/orchestre.mjs budget --tous` dit s'il lit trop.

Conventions communes : identifiants et commentaires en français · zéro donnée réelle dans les tests · « une fonctionnalité non finie n'apparaît pas » (drapeau dans `lib/flags.ts`) · on ne touche jamais à `interdit`, même pour aider · aucun chiffre non sourcé, aucun secret dans un fichier versionné · une preuve est une sortie de commande, pas une paraphrase.
<!-- orchestre:fin -->
