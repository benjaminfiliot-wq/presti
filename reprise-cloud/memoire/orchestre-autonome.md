---
name: orchestre-autonome
description: "Depuis le 2026-09-14 (prompt v16 §1) l'orchestre est un outil à part, C:\\Users\\benja\\Documents\\orchestre (dépôt Git) : init sur tout projet, maj pour recopier le bin, budget des jetons, hooks Read/Edit ; Presti en est une installation"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-14T11:24:44.299Z
---

Le système `.orchestre/` n'est plus propre à Presti : `C:\Users\benja\Documents\orchestre\` (dépôt Git) porte `bin/orchestre.mjs` générique piloté par `.orchestre/orchestre.json` (carte du code par globs, vault, exécutants, `methodeSupplement` pour les règles propres au projet), `init` (crée la file, vendorise le bin dans `scripts/`, pose CLAUDE.md/AGENTS.md, `decisions.md`, les hooks dans `.claude/settings.json`, `code-qa`), `maj` (recopie le bin depuis la source), `budget` (jetons lus/produits d'après `~/.claude/projects/<slug>/*.jsonl`, bloc en tête du digest), hooks `read-garde` (refuse un Read > 300 lignes sans offset/limit) et `contexte-fond`. Preuve : `node test/preuve.mjs` (projet factice, tous les contrôles). Presti est installé avec `--vault=../SaaS`.

**Why :** Benj veut réutiliser le système sur le prochain projet (« orchestre init, et rien d'autre ») et que Claude Code dure sans vider ses crédits.

**How to apply :**
- Modifier l'orchestre = modifier `C:\Users\benja\Documents\orchestre\bin\orchestre.mjs`, relancer `node test/preuve.mjs`, committer là-bas, puis `node scripts/orchestre.mjs maj` dans le projet. Ne jamais éditer `presti/scripts/orchestre.mjs` à la main : `maj` l'écraserait.
- Les règles propres à Presti (poussé ≠ déployé, second exécutant, routage) vivent dans `presti/.orchestre/orchestre.json` → `methodeSupplement`, régénérées dans CLAUDE.md et AGENTS.md par `contexte`.
- `budget` : la part lue ne compte que les jetons NEUFS (entrée + création de cache) face aux produits ; la relecture du cache (la conversation relue à chaque tour) est montrée à part. La première version la comptait et affichait 100 % en permanence — une alerte toujours rouge n'alerte plus. Mesure du 14/09 sur la grande session Presti : 89 %, 🔴 à juste titre.
- Voir [[presti-orchestre-antigravity]], [[cerveau-site-v2]], [[pousse-n-est-pas-deploye]].

**code-qa (14/09) :** quand `.orchestre/orchestre.json` déclare `juges.code`, la liste est complète — une étape absente est sautée, jamais reprise de `package.json` (Presti : `{ typecheck }` seul, car aucune configuration ESLint : `next lint` ouvrirait son assistant). Et `video-qa` a deux profils : réseaux (défaut) et `--profil=landing`.
