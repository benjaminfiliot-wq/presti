# 026-152 — contre-vérification du 29/09 : 4 sabotages réversibles de la production (Claude Code)

Faits sur le dépôt réel, un fichier à la fois, le juge lancé sur l'arbre saboté, puis le fichier rétabli octet pour octet (sha256 relu). `git status --porcelain` des quatre fichiers vide ensuite.

| # | fichier | faute plantée | juge | verdict lu | sha256 avant = après |
|---|---|---|---|---|---|
| 1 | lib/direction/tresorerie.ts | `caCents >= seuil` devient `caCents > seuil` (depasse) | tresorerie-qa | FAIL TR-2 « pile au seuil : depasse = false, true attendu » (code 1, 120 s) | c59767ff…6d8f, rétabli |
| 2 | lib/siteDossier.ts | l'expiration du lien ignorée | dossier-zip-qa | FAIL DZ-2 « bon jeton, 91 j après (expiré) : true, false attendu » et DZ-4 (code 1, 130 s) | f4982325…f8ab4e2, rétabli |
| 3 | app/connexion/lien/page.tsx | la page poste le jeton au chargement (fetch dans le useEffect) | lien-connexion-qa | FAIL LC-5 « un useEffect poste ou ouvre une session au chargement » (code 1, 482 s) | c7f5bae2…3493, rétabli |
| 4 | app/api/controle/sites/[id]/route.ts | garde `exigerDomaine(f, 'clients', 'ecrire')` retirée | poste-sites-qa | FAIL PS-2 « instruction 3 de POST : exigerDomaine attendue » (code 1, 151 s) | 688200af…dfce, rétabli |

Les quatre sabotages sont pris sur le critère attendu ; les quatre fichiers sont revenus à leur empreinte d'origine.

## Ce que ce fichier ne prouve pas (état du verifier de la fiche)

Le méta-juge n'est PAS vert (deux jugements complets, PC et usine, le 29/09, même cause) : huit juges du domaine sont rouges sur l'arbre RÉEL, indépendamment de toute mutation, parce que le code qu'ils gardent a légitimement bougé depuis leur commit de base, ou parce que l'outillage a changé :

- tuile-argent-qa TA-5 : lib/siteLivraison.ts a gagné des imports (fiche 026-141, 12:04) ; rouge aussi en direct sur le PC, sans copie.
- livraison-tour-qa TL-8, generation-actions-qa GA-6, retrait-site-qa RT-7, achat-public-qa AP-9 (scripts/fermeture-e2e.mjs), livraison-schema-qa SC-9 (_A_COLLER_sql_editor_0101*.sql) : même famille (« base <sha> : ligne ajoutée hors contrat »).
- achat-ecrans-qa EA-2/3/4/6 : `next dev` refuse de démarrer (« Turbopack, with a webpack config and no turbopack config », Next 16.3.6, node_modules/next modifié le 29/09 à 13:27 ; serwist ajoute une config webpack).

Les juges sont dans `interdit` : Claude Code les corrige dans une fiche à lui, puis 026-152 se rejoue.
