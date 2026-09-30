# {{projet}} — contexte du dépôt

{{description}}

Pile : {{pile}}.

Ce dépôt est piloté par l'orchestre (`scripts/orchestre.mjs`, vendorisé depuis le dépôt `orchestre` ;
sa configuration est `.orchestre/orchestre.json`). Ce fichier est lu par Claude Code à l'ouverture de
la session ; `AGENTS.md` est lu par les exécutants (Antigravity, Gemini CLI, Qwen…). Le bloc « Méthode »
ci-dessous est le même dans les deux : il est réécrit par `node scripts/orchestre.mjs contexte`.

---

<!-- orchestre:debut — bloc tenu à jour par `node scripts/orchestre.mjs contexte` ; ne pas éditer à la main -->
<!-- orchestre:fin -->

---

## Routage des modèles — appliqué sans exception

| Travail | Qui le fait |
|---|---|
| Architecture, schéma, argent, sécurité, cerveaux, verdicts | Claude Code, modèle principal |
| Exploration, recherche dans le code, résumés de fichiers | Agent avec `model: haiku` |
| Génération en volume (pages, variantes, tests, boucles QA) | Antigravity (Gemini, quota séparé) |
| Recherche web, veille, comparaison d'outils | Perplexity (`mcp__perplexity__*`) |
| Navigation, captures, lecture de sites | Chrome via Antigravity (sous-agent navigateur) ou Claude in Chrome |

**La règle simple.** Claude Code ne lit que `.orchestre/digest.md` et `.orchestre/contexte.md`. Il ne
produit que ce qui exige du jugement. Il délègue le reste à des quotas qui ne sont pas le sien.

- `/compact` à chaque bloc terminé, `/clear` entre deux chantiers.
- Après chaque push : vérifier l'état du déploiement avec l'outil du projet, s'il en a un.
- Un fichier de plus de 300 lignes se lit avec `offset` et `limit` (le hook `scripts/hooks/read-garde.mjs`
  refuse le reste) ; ce qu'il faut savoir d'un fichier est déjà dans `contexte.md`.

---

## Où vit la mémoire

- **Ce que le code fait** : `.orchestre/contexte.md`, régénéré depuis le code — on ne l'édite pas à la main.
- **Pourquoi on l'a décidé** : le vault configuré dans `.orchestre/orchestre.json` (`vault`), s'il y en a un.
- **Ce que les agents décident seuls** : `.orchestre/decisions.md` (question → défaut retenu → réversible ?).
- **Ce qui s'est passé** : `.orchestre/digest.md` (les derniers verdicts) et `.orchestre/verdicts.jsonl` (tous).

## Les commandes qui comptent

| But | Commande |
|---|---|
| Déposer une tâche | écrire `.orchestre/file/<id>.md` depuis `.orchestre/gabarit-tache.md`, puis `node scripts/orchestre.mjs valider .orchestre/file/<id>.md` |
| Donner une tâche à un exécutant | `node scripts/orchestre.mjs prochaine --agent=<nom> [--tache=<id>]` |
| Juger une tâche | `node scripts/orchestre.mjs verifier <id>` |
| Relire l'état | `node scripts/orchestre.mjs digest` puis lire `.orchestre/digest.md` |
| Régénérer la carte du code | `node scripts/orchestre.mjs contexte` |
| Ce qu'il reste de budget | `node scripts/orchestre.mjs budget` |
| Répondre à une question d'agent | `node scripts/orchestre.mjs repondre <id> <n> [ligne]` |
| Mettre à jour l'orchestre vendorisé | `node scripts/orchestre.mjs maj` |

## Interdictions pour tout agent

- `git restore`, `git checkout <fichier>`, `git stash`, `git reset`, `git clean`, `git revert` : jamais.
  Le dépôt porte d'autres chantiers non committés qui ne sont pas à l'agent.
- Supprimer ou vider un fichier hors périmètre : jamais.
- Une migration de schéma, un envoi, une publication, un paiement : jamais par un agent — c'est une
  question à Benj (voir `.orchestre/decisions.md`).
- Aucun secret dans un fichier versionné ; aucune donnée réelle dans un test ; aucun chiffre non sourcé.
