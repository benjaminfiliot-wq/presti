---
id: 000-exemple                       # NNN-slug, unique ; c'est aussi le nom du fichier (.orchestre/file/<id>.md) et du dossier de preuves
type: feature                         # feature | test | contenu | audit | boucle-qa
objectif: Une phrase qui dit ce qui doit exister à la fin   # une seule ligne, vérifiable
perimetre: [app/exemple/**, lib/exemple.ts]   # les seuls chemins où l'agent écrit ; relatifs à la racine ; deux tâches ne se chevauchent jamais
interdit: [supabase/**, lib/plans.ts]          # intact même pour « aider » ; la violation est un refus
verifier: node scripts/verifier-exemple.mjs    # la commande exécutée par `orchestre verifier` ; son code de sortie fait le verdict
budget: { fichiers: 4, minutes: 20 }           # une limite, pas une cible ; minutes = délai de `verifier`, plafonné par maxMinutes
preuve: sortie de `verifier` dans .orchestre/preuves/000-exemple/verifier.log   # ce qui doit se trouver dans preuves/<id>/ ; jamais un fichier de 0 octet
# executant: antigravity              # facultatif : antigravity | codex | claude-code | gemini-cli | qwen ; « claude-code » réserve la tâche
---

# 000-exemple — titre lisible de la tâche

## Contexte

Deux ou trois phrases : ce qui existe déjà, où (fichier:ligne quand c'est possible), et pourquoi cette tâche
maintenant. L'agent ne lit que ceci et `.orchestre/contexte.md` — pas le dépôt.

## Ce qu'il faut faire

1. Étape concrète, avec le fichier visé.
2. Étape concrète.
3. Ce qu'il ne faut PAS faire, si le périmètre laisse un doute.

## C'est fini quand

- `verifier` est vert depuis `fait/`.
- La preuve attendue est dans `.orchestre/preuves/<id>/` et n'est pas vide.
- Rien n'a bougé hors `perimetre` (le vérificateur compare à `avant.txt`).
