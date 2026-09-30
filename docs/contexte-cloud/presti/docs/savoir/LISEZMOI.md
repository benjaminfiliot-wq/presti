# Savoir local de Presti

Le savoir reprend les documents choisis dans `docs/savoir/sources.json` pour permettre aux agents de retrouver un passage et sa source.

## Cloisons

- `general` contient les classes `public` et `interne`. Les agents du groupe chef peuvent consulter l'index ; les moteurs externes suivent les droits de classe définis dans `sources.json`.
- `prospects` contient les documents de prospection et les documents reclassés. Seuls les scripts des agents autorisés lisent ce compartiment. Ses textes ne partent jamais au modèle d'embeddings.

## Parcours

Sur le poste, `node scripts/savoir/synchroniser.mjs` exporte les sources permises, crée une archive par compartiment et l'envoie dans `/srv/presti-savoir/depot/`. Un fichier `.pret` signale chaque archive achevée. Le service `presti-chef-savoir-recevoir` vérifie l'archive et ses empreintes, puis remplace `courant` sous `/home/agents/travail/savoir/<compartiment>/`. L'ancien lot devient `precedent`. Le marqueur `a-indexer` lance `presti-chef-savoir-index`, qui écrit les index dans `index/general/` et `index/prospects/`.

## Interrupteurs

`docs/savoir/reglages.json` contrôle l'envoi, la sémantique, la recherche web, Perplexity, les leçons dans les consignes et le bilan quotidien. Tous sont éteints au départ. La sémantique, lorsqu'elle est allumée avec un modèle, ne travaille que sur `general` via Ollama sur `127.0.0.1` ou `localhost`. L'index plein texte reste disponible sans elle.

## Chercher et reprendre

La recherche et ses droits sont branchés par la tâche 026-233. L'index plein texte fournit un passage, sa classe, son chemin, ses lignes et un extrait. Pour relire l'état, utiliser `presti-journal chef` : une ligne `savoir index` indique les compteurs et l'empreinte du manifeste ; `etat.json` dans chaque index donne le dernier lot indexé. En cas d'échec de réception ou d'indexation, relancer depuis le poste `node scripts/savoir/synchroniser.mjs` et contrôler de nouveau le journal.
