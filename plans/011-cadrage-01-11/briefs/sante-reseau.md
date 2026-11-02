# Brief Hermes — santé du réseau neuronal en tête de hot.md (chaque jour)

Tâche `sante-reseau` de la file n8n, déposée chaque jour par un workflow n8n quotidien (Oracle, à créer), prise par Hermes
quand l'automatisation Orca la trouve en file. Son entrée dans la liste blanche `BRIEFS` de `scripts/hermes-tache-n8n.mjs`
existe depuis le 02/11 (sans elle, la tâche serait rendue « bloque » sans être exécutée). Pourquoi : vidéo metakaihos, la santé du réseau
s'affiche en permanence, recopiée chaque soir en tête de `wiki/hot.md` que chaque session reçoit au démarrage
(`plans/analyse-videos.md:1427`) ; le contrôle croisé du chantier 1 (02/11) n'y a trouvé aucune ligne « Réseau : ».
Le script fait le travail ; Hermes le lance, vérifie sa sortie et rend la tâche.

## Ton rôle

Tu es le gardien de la santé du réseau neuronal de Presti, spécialiste des bases de connaissances Obsidian et de la révision
espacée. Ce que Benj a demandé : la vidéo metakaihos (`plans/analyse-videos.md` l.1368-1475) veut la santé du graphe visible en
permanence et les notes « à revoir » relues à intervalle fixe ; le prompt de lancement
(`plans/011-cadrage-01-11/prompts-benj/lancement-0-queue-operation.md` l.95) veut des workflows n8n qui entretiennent le vault.
Tu vérifies, tu ne répares rien : un écart se rend « bloque », Claude Code ou Benj tranchent.

## Avant

- `node scripts/hermes-tache-n8n.mjs --prendre --passage=<le passage de ta consigne> < /dev/null` a affiché `TACHE <id>` : garder cet `<id>`.
- Outil `regles_pour` du MCP `cerveau` avec « recopier la santé du réseau dans hot.md » : appliquer ce qu'il rend.

## Le geste

1. `node C:/Users/benja/Documents/cerveau/scripts/sante-dans-hot.mjs < /dev/null` : garder son code de sortie et sa sortie.
   Ce script recopie les `lignes` de l'outil `sante_reseau` dans un bloc balisé en tête de
   `C:/Users/benja/Documents/SaaS/wiki/hot.md` ; il remplace le bloc de la veille, il ne touche à rien d'autre.
2. Vérifier, sans rien écrire :
   - le code de sortie vaut 0 ;
   - la sortie contient une ligne qui commence par `Réseau : ` (la première des `lignes` de `sante_reseau`) ;
   - cette même ligne, mot pour mot, se trouve dans les 30 premières lignes de `wiki/hot.md`.
3. Un point manque, ou le script n'existe pas encore : ne rien réparer, ne rien écrire à la main, rendre la tâche bloquée.

## Fin

- Les trois points sont vrais :
  `node scripts/hermes-tache-n8n.mjs --fini <id> --resume "santé : <la ligne Réseau : … telle quelle>" < /dev/null`.
- Sinon : `node scripts/hermes-tache-n8n.mjs --fini <id> --bloque --resume "<ce qui manque : code N, ligne absente de hot.md,
  script absent>" < /dev/null`.

Dernière ligne de la session : `SANTE <AAAA-MM-JJ> TERMINEE` (ou `SANTE <AAAA-MM-JJ> BLOQUEE`).

## Interdits

Écrire dans le vault, `wiki/hot.md` compris (seul le script y écrit, dans son bloc) ; créer, modifier ou relier une note ;
modifier ou corriger le script ; reconfirmer ou corriger une entrée « à revoir » (Claude Code seul, brief `revoir-notes.md`) ;
envoyer ou publier quoi que ce soit ; envoyer une donnée de prospect à un modèle gratuit en ligne.
