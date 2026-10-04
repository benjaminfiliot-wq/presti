# 026-201 — mise en service (à faire, état au 04/10/2026)

Le code est livré et jugé (search-console-qa PASS) ; il est **inerte tant que `GSC_COMPTE_SERVICE` n'existe pas dans Vercel** : sans la variable, le tour de livraison ne lit même pas la table et ne compte aucun essai. Rien n'est donc cassé ni consommé avant la mise en service.

## Reste à Benj (une seule fois, aucun geste à chaque vente)

1. Dans la console Google Cloud : un projet, l'API de vérification de site et l'API de la Search Console activées (gratuites), un compte de service et sa clé JSON.
2. Déposer la clé dans `presti-secrets/google-search-console.json`.
3. Dire « oui » à la pose de `GSC_COMPTE_SERVICE` (le JSON en base64) dans Vercel production par Claude Code, sans l'afficher.

## Ensuite (Claude Code)

- Poser la variable par le connecteur Vercel, redéployer, `node scripts/deploiement-etat.mjs` à READY.
- Au premier site vendu avec domaine propre : relire `search_console_le` de la commande, le champ `verifications.search_console_essais`, et la ligne « À faire » du Poste ; noter le résultat ici.

## Point d'attention connu (hors périmètre de la fiche)

Un site en mode « domaine existant » dont le DNS n'est pas encore posé par l'artisan fait échouer la vérification (Google ne trouve pas le fichier). Le tour réessaie toutes les 15 minutes, trois fois, puis laisse la ligne « À faire » et le bouton « Plan soumis » : si le DNS tarde plus de 45 minutes, c'est ce repli qui sert. Pour que l'automatique serve plus souvent, une fiche suivante pourrait n'essayer qu'une fois le domaine confirmé chez Vercel (`getStatus`), mais la fiche 026-201 fixe trois essais par tour de 15 minutes, et le juge le vérifie.
