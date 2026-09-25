# Témoin de `scripts/parcours-commande-qa.mjs` (fiche 025-01, point 10 ; juge de la fiche 025-09)

Écrit par Claude Code. **Ce n'est pas du code de production** : ne pas le copier dans `app/` ni dans `lib/`.

Ce dossier simule l'état « après » des fiches 025-09 et 025-16 (relectures à froid du 24/09). Il sert à prouver qu'un travail conforme passe les neuf critères PC-1 à PC-9.

- `lib/siteCommande.ts.temoin` : `lib/siteCommande.ts` au commit 1620723, plus `matiere.artisan`. Le nettoyage le garde et le borne ; `erreursAvantPaiement` l'exige, avec l'expression « première personne » de `generer.mjs:200`. Aucun prix, délai, état ni transition ne change.
- `app/site/commander/page.tsx.temoin` : une page réduite à ce que PC-3, PC-4, PC-6, PC-7 et PC-8 lisent. On y trouve l'étape « Votre parcours » dans `ETAPES`, un champ par donnée du contrat, le choix « Je préfère ne pas donner de chiffres », des exemples « Exemple : … », l’option `a_prendre` : « je le réserve moi-même, à mon nom » (ni guide ni prix d'un tiers), un champ du domaine aux exemples « Exemple : … », et l'étape du paiement dont le récapitulatif montre « Votre parcours » (prénom, nom, phrase signée, chiffres) et dit le délai par `DELAI_TEXTE`.
- `lib/siteCommande.ts.temoin`, pour 025-16 : `DELAI_TEXTE`, le seul texte du délai (« … après la validation humaine de votre site par Presti. »), repris par `SITE_A_LA_DEMANDE` ; les textes de l'artisan jamais coupés (gardés tels quels jusqu'à 2 000 signes, refusés au-delà de leur borne, avec la borne dans l'erreur).
- `app/api/site/commander/route.ts.temoin` : la route de 1620723 dont la description Stripe dit le délai par `DELAI_TEXTE` (PC-8).

## Pourquoi l'extension `.temoin`

Le `tsconfig.json` du dépôt inclut `**/*.ts` et `**/*.tsx`, ce qui couvre aussi `scripts/`. Des fichiers `.ts` ou `.tsx` posés ici entreraient donc dans le `npm run typecheck` du dépôt. La page témoin y serait vérifiée contre le vrai `lib/siteCommande.ts`, qui n'a pas encore `artisan`, et ferait échouer PC-5, CF-8 et WM-4. Avec l'extension `.temoin`, aucun outil du dépôt ne les voit.

## Ce que fait le juge avec `--temoin`

1. Il extrait l'arbre de référence 1620723 dans `.orchestre/travail/025-01/reference/`, avec `extraireReference` de `commun.mjs`. Si l'arbre est déjà là et intact, il le réutilise. Si `--racine=<dossier>` accompagne `--temoin`, il prend ce dossier à la place.
2. Il copie de cet arbre `app/`, `lib/`, `middleware.ts`, `tsconfig.json`, `package.json`, `scripts/ts-loader.mjs` et `public/sites-demo/generer.mjs` dans `.orchestre/travail/parcours-commande-qa/temoin/`, avec `preparerTemoin`.
3. Il pose chaque fichier `*.temoin` de ce dossier à son chemin, sans l'extension. Les fichiers de 1620723 sont remplacés.
4. Il se juge sur ce dossier comme sur une racine : sonde de `lib/siteCommande.ts` par `scripts/ts-loader.mjs`, lecture de la page par l'analyseur de TypeScript, puis `npm run typecheck -- --listFiles --incremental false` sur tout le projet copié.

Le témoin part de l'arbre figé, pas de l'état courant du dépôt. Il reste donc vert après le PASS de 025-09 et des autres fiches 025, et `juges-025-preuve.mjs` peut le rejouer. Le dossier `temoin/` est refait à chaque passage, puis laissé en place pour qu'on puisse l'inspecter.

Commande : `node scripts/parcours-commande-qa.mjs --temoin` doit sortir en code 0. Sur la référence, `node scripts/parcours-commande-qa.mjs --racine=.orchestre/travail/025-01/reference` doit sortir en code 1, avec PC-1 en échec.
