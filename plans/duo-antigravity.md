# Le duo — Claude Code dirige, Antigravity exécute, dans la même conversation

> Proposé par Benj le 14/09 à 4 h 40 : « au lieu de lui donner des tâches, travaille avec lui : c'est toi le dirigeant,
> mais tu participes — comme ça tous les deux vous économisez des tokens ». Ce que la nuit a montré : une tâche entière
> confiée d'un bloc coûte à l'agent des dizaines d'essais (quota) et à Claude Code des relectures, des requalifications et
> des reconstitutions (tokens). Le duo découpe le travail en pas courts, chacun vérifié par le juge, dans UNE conversation.

## La règle

1. **Une conversation par tâche**, ouverte par `node scripts/antigravity.mjs lancer <agent> --tache=<id> --model=<m>`,
   puis menée par `dire <agent> <pas>`. L'agent ne reçoit jamais « fais la tâche » : il reçoit **un pas**, avec la commande
   qui prouve que le pas est fait.
2. **Claude Code fait ce qui demande du jugement ou une source sûre**, à l'avance, dans le dépôt : la direction
   artistique (couleur, police — les vraies polices sont dans `public/sites-demo/_polices/`, l'agent copie), le plan des
   sections, les faits à dire et à ne pas dire, les critères. Ça tient en quelques lignes, pas en un prompt de trois pages.
3. **Antigravity fait le volume** : HTML, CSS, textes de commune, recherche de photos sur Commons, itérations Lighthouse.
   Un pas = un livrable vérifiable en moins de dix minutes.
4. **Le juge tranche chaque pas** : `node scripts/site-qa.mjs <site> --statique` (secondes) entre les pas, le juge complet
   (rendu + Lighthouse) à la fin. Claude Code lit la ligne de verdict, pas le diff.
5. **Un pas raté se redit, pas se refait** : Claude Code renvoie la ligne d'échec du juge et la consigne, rien d'autre.
6. **Quota** : deux conversations Antigravity au plus en même temps. Une rafale de cinq vide un modèle en quatre minutes.

## Le découpage type d'un site de démonstration (014-02 à 014-10)

| Pas | Qui | Livrable | Preuve |
|---|---|---|---|
| 0 | Claude Code | `site.json` relu, DA (accent, police) rappelée, plan des 6 sections, faits autorisés | — |
| 1 | Antigravity | squelette : `index.html` + `styles.css` LIÉE, police copiée depuis `_polices/`, `@font-face`, `<noscript>` filet | `site-qa --statique` : feuilles liées, police, CSS utilisé |
| 2 | Antigravity | textes : accueil (≥ 1 200 signes, 6 `<h2>`), 4 communes (≥ 400 signes, écrites, pas répétées) | `site-qa --statique` : texte, répétition |
| 3 | Antigravity | photos Commons : 3 à 5 vraies (≥ 800 px, ≥ 25 Ko), `attributions.json` avec la PAGE du fichier | `site-qa --statique` : photos, attributions |
| 4 | Antigravity | mentions légales, confidentialité, sitemap, robots, JSON-LD | `site-qa --statique` : le dossier |
| 5 | Antigravity | rendu + Lighthouse ≥ 95 sur toutes les pages | `site-qa` complet |
| 6 | Claude Code | une capture à l'œil, `fait/` + `verifier` | verdict |

## Ce que ça change pour les tokens

Claude Code n'écrit plus de tâche de 60 lignes ni ne reconstruit après coup ; il écrit six messages de trois lignes et lit
six lignes de verdict. Antigravity ne cherche plus ce qu'on attend de lui : il n'a qu'un pas à la fois, et le juge lui
dit tout de suite s'il y est.
