# Orchestre — le système universel (v16, 2026-09-14)

**Ce que c'est.** Le chef de gare « Claude Code pense, les exécutants produisent », sorti du dépôt Presti le 2026-09-14 (prompt v16 §1) pour servir n'importe quel projet. Pas de serveur, pas de base : des fichiers Markdown dans `.orchestre/`, une commande unique, un verdict mécanique. Deux buts posés par Benj : que le système tourne sans lui, et que Claude Code dure sans vider ses crédits. La méthode de production elle-même (tâches, verdicts, exécutants) est décrite dans [[Antigravity]].

**Où il vit.** Dépôt Git `C:\Users\benja\Documents\orchestre\` : `bin/orchestre.mjs` (la commande), `bin/lib/preuves.mjs`, `hooks/`, `gabarits/` (CLAUDE.md, AGENTS.md, tache.md, decisions.md, settings.json), `juges/` (code-qa, site-qa, video-qa), `test/preuve.mjs` + `test/projet-factice/`. Node 20 ou plus, zéro dépendance npm dans `bin/` et `hooks/`, Windows d'abord. Chaque projet en porte une **copie vendorisée** dans `scripts/orchestre.mjs`. Presti en est la première installation (et la seule à ce jour), faite le 2026-09-14 avec `--vault=../SaaS`.

## Les commandes

Sauf `init`, lancé depuis le dépôt orchestre dans le dossier du projet, tout passe par `node scripts/orchestre.mjs <commande>`, lancé depuis n'importe quel sous-dossier (la racine est le dossier qui contient `.orchestre/`).

| Commande | Ce qu'elle fait |
|---|---|
| `init --projet=<nom>` | crée `.orchestre/` et `orchestre.json`, vendorise le bin, pose hooks, CLAUDE.md, AGENTS.md, decisions.md — sans écraser l'existant |
| `maj` | recopie le bin, les hooks et les juges depuis `source` ; ne touche pas aux gabarits du projet |
| `prochaine --agent=<nom> [--tache=<id>]` | donne la première tâche compatible, verrou + `avant.txt` ; jamais deux périmètres qui se chevauchent |
| `verifier <id>` | exécute la commande `verifier` sous délai ; le code de sortie fait le verdict ; une preuve de 0 octet est un refus |
| `digest` | régénère `.orchestre/digest.md`, l'état en un fichier |
| `contexte` | régénère `.orchestre/contexte.md` depuis le code (selon `carte`), le copie dans le vault, réécrit le bloc « Méthode » de CLAUDE.md et AGENTS.md |
| `budget [--tous]` | jetons lus et produits par Claude Code d'après ses transcripts ; part lue, rouge au-delà de 60 %, en tête du digest |

Et les utilitaires : `valider`, `repondre`, `liberer`, `rejouer`.

## orchestre.json

La configuration du projet : `projet`, `description`, `pile`, `source` (le dépôt orchestre, où `maj` va chercher), `vault` et `carteVault`, `carte` (globs des pages, API, lib, migrations, drapeaux, formules), `juges.code` (lint, typecheck, tests), `executants`, `maxMinutes`, `lectureLibre`, et `methodeSupplement` pour les règles propres au projet. **Une clé absente = une section absente.** Pour `juges.code`, la liste est complète : Presti ne déclare que `typecheck` (pas de configuration ESLint).

## Les hooks

- **`read-garde`** (avant `Read`) : refuse la lecture d'un fichier de plus de 300 lignes sans `offset`/`limit`. Ce qu'il faut savoir est dans `contexte.md`. Les motifs de `lectureLibre` y échappent.
- **`contexte-fond`** (après `Edit|Write|MultiEdit`) : relance `contexte` en arrière-plan, au plus une fois par minute.

## Le routage des modèles et la règle simple

Écrit dans le gabarit CLAUDE.md, appliqué sans exception : architecture, schéma, argent, sécurité, cerveaux et verdicts à Claude Code ; exploration et résumés à un agent `haiku` ; génération en volume à Antigravity (quota séparé) ; recherche web à Perplexity ; navigation et captures à Chrome.

**Claude Code ne lit que `.orchestre/digest.md` et `.orchestre/contexte.md`.** Il ne produit que ce qui exige du jugement et délègue le reste à des quotas qui ne sont pas le sien. `/compact` à chaque bloc, `/clear` entre deux chantiers.

**Le budget ne ment plus.** La première version comptait la relecture du cache dans la « part lue » : 100 % en permanence, une alerte qui n'alerte plus. Elle ne compte maintenant que les jetons neufs face aux produits. Mesure réelle de la grande session Presti du 2026-09-14 : **89 %, rouge à juste titre**.

## Démarrer un nouveau projet — une commande

```
cd C:/Users/benja/Documents/mon-projet
node C:/Users/benja/Documents/orchestre/bin/orchestre.mjs init --projet=mon-projet
```

`init` installe dans le **dossier courant** : lancé d'ailleurs, il pose `.orchestre/`, `scripts/` et `CLAUDE.md` au mauvais endroit. Si le projet a un vault, ajouter `--vault=<chemin>` (Presti : `--vault=../SaaS`). Puis remplir ce qui manque dans `.orchestre/orchestre.json` (description, pile, carte, vault s'il y en a un). C'est tout.

## Le modifier

1. On modifie **dans le dépôt orchestre**, jamais `scripts/orchestre.mjs` d'un projet : `maj` l'écraserait.
2. **Preuve** : `node test/preuve.mjs` (init sur le projet factice, tâches PASS/FAIL, contexte, budget, maj, racine, hooks, code-qa) — tous les contrôles verts, puis commit dans le dépôt orchestre.
3. Dans chaque projet : `node scripts/orchestre.mjs maj`.

Les règles propres à Presti (poussé ≠ déployé, second exécutant, routage) vivent dans `presti/.orchestre/orchestre.json` → `methodeSupplement` et sont régénérées par `contexte`. Voir aussi [[Cerveau-site-v2]].

## Codex

Depuis le 14/09/2026, Codex est un exécutant de l'orchestre : ajout dans le dépôt orchestre (`faaef0d`), puis branchement dans Presti (`c05f326`). Il se lance par `node scripts/executant.mjs lancer <agent> --tache=<id> --moteur=codex`. Son bac à sable est `workspace-write` (jamais `danger-full-access`), avec Presti et le vault SaaS, sans `presti-secrets`. Sous Windows, `spawn EPERM` empêche Node d'y lancer les sous-processus : Codex écrit sans lancer verifier/npm/Playwright ; le vérificateur tourne hors bac à sable, puis lui renvoie sa sortie en cas d'échec (`--boucle=3`). Les verdicts finaux de 018-01 (crédits photo) et 018-02 (juge d'usage) sont PASS ; 018-03 (grille à l'aveugle) est livré par Antigravity. Sources : commits cités, décisions du 14/09 et verdicts 018-01 à 018-03 dans Presti.

## Leçons du 15/09

- Un lancement d'exécutant dépend de la session qui l'a lancé. Si cette session est coupée, rendre la tâche avec `node scripts/orchestre.mjs liberer <id>`, puis relancer l'exécutant.
- Un juge d'état lié au défilement échantillonne tout le parcours : pour le relais de la barre Lestraque, le contrôle se fait tous les 150 px, pas seulement à deux positions.
