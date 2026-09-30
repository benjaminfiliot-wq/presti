---
id: 000-modeles-metiers
type: feature
objectif: Ajouter six modèles de contenu de maquette (maçon, carreleur, peintre, chauffagiste, isolation, paysagiste) au format exact de maquettes/modeles/couvreur/contenu.json, pour les maquettes de prospection et les sites vendus
perimetre: [maquettes/modeles/macon/**, maquettes/modeles/carreleur/**, maquettes/modeles/peintre/**, maquettes/modeles/chauffagiste/**, maquettes/modeles/isolation/**, maquettes/modeles/paysagiste/**, .orchestre/preuves/000-modeles-metiers/**]
interdit: [maquettes/modeles/couvreur/**, maquettes/modeles/electricien/**, maquettes/modeles/menuisier/**, maquettes/modeles/plombier/**, scripts/**, app/**, lib/**, public/**]
verifier: node scripts/modeles-metiers-qa.mjs
budget: { fichiers: 7, minutes: 40 }
preuve: sortie de verifier dans .orchestre/preuves/000-modeles-metiers/verifier.log
executant: antigravity
---

# 000-modeles-metiers — six nouveaux métiers pour les maquettes

## Pourquoi
Les maquettes du 27/09 ont dû adapter des modèles voisins (menuisier pour le carreleur et le paysagiste, couvreur pour le maçon) : seuls 4 modèles existent. Avec les 6 métiers manquants, les maquettes et les sites vendus parleront le bon métier.

## Ce qu'il faut faire
1. Lis les 4 modèles existants (`maquettes/modeles/*/contenu.json`) et reprends EXACTEMENT leur structure : `metier`, `libelles` (`sur`, `alt_heros`, `alt_atelier`, `reperes` ×3), `pages["/"]` (`type`, `title`, `description`, `h1`, `h1Ligne`, `chapeau`, 2 `sections` avec `genre`, `h2` et `blocs`), `photos` (`demo`, `fichiers` ×2).
2. Écris `maquettes/modeles/<metier>/contenu.json` pour `macon`, `carreleur`, `peintre`, `chauffagiste`, `isolation` et `paysagiste`. Le ton est sobre, comme couvreur, avec les gabarits `{ville}` et `{entreprise}`, et le vocabulaire exact du métier.
3. **Rien d'invérifiable** : pas d'années d'expérience, pas de nombre de chantiers, pas d'avis ni de note, pas de « garantie décennale », pas de certification ni de label (RGE, Qualibat…). Le modèle ne connaît pas l'entreprise.
4. **Photos.** `photos.demo` pointe sur un dossier existant de `public/sites-demo/`. Il en existe un pour `macon`, `carreleur`, `peintre` et `chauffagiste` : prends ses fichiers réels. Pour `isolation` et `paysagiste`, il n'y a pas de dossier. Prends le plus proche (couvreur pour l'isolation), et ajoute dans `libelles` la mention « Photos d'illustration, à remplacer par celles de vos chantiers ».
5. Lance `node scripts/modeles-metiers-qa.mjs` jusqu'au PASS. Ne touche pas aux 4 modèles existants.

## C'est fini quand
- `node scripts/modeles-metiers-qa.mjs` rend PASS depuis `fait/`.
- Les 4 modèles existants n'ont pas bougé.
- Chaque nouveau modèle cite des photos qui existent.
