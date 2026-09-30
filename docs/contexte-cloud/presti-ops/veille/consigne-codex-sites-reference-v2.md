Tu travailles sur l'usine de Presti, dans ~/veille. Écris en français.

SECONDE PASSE des 10 sites de référence de `prospection/sites-reference/`. Les sites de la première passe sont propres et honnêtes : garde leurs choix d'entreprises, leurs téléphones sourcés, leurs textes, leurs attributions et leurs liens-reseaux.json. Mais ils sont faits main (Georgia, Arial, styles.css maison). Ils n'utilisent pas le kit du site de démonstration Atelier Lestraque, qui est la barre de Benj. **Personne n'est contacté, rien n'est publié.**

JUGE : `node juges/juge-sites-reference-v2.mjs` (déjà écrit, NE PAS le modifier). Il relance aussi la v1, qui doit rester verte. Lis-le d'abord et boucle jusqu'au PASS.

LE KIT (lecture seule dans `~/presti`, copie ce qu'il faut dans ton dossier de travail) :
- `~/presti/public/sites-demo/generer.mjs`, le générateur du cerveau site v2. Lis son en-tête et son code. Il rend Lestraque à partir de `site.json`, `contenu.json` et `attributions.json`. Son en-tête dit « tenu exécutable que pour lestraque » : **copie-le** dans `prospection/sites-reference/_generateur/`, adapte ta copie pour qu'elle rende chacun des 10 dossiers, et ne touche jamais l'original.
- `~/presti/public/sites-demo/_kit/` : `da.json` (la direction artistique par métier : accent, fond, encre, police d'affichage et de texte, type de hero, texture), `kit.css`, `kit.js` (le mouvement), `maquette.css`, `familles/`, `monogrammes/`.
- `~/presti/public/sites-demo/_polices/` : les polices en woff2. Copie dans chaque `site/` celles de la direction artistique du métier.
- `~/presti/public/sites-demo/lestraque/` : le résultat à viser. Regarde `index.html`, les pages par commune (`menuisier-rennes/` etc.), `styles.css` et `site.json` (champs `communes`, `pages`).

À FAIRE pour chaque dossier `NN-slug/` :
1. `site.json` :
   - ajoute `nom_affiche`, le nom en casse normale : « Société Percot et Fils », pas « SOCIETE PERCOT ET FILS » ;
   - ajoute `communes`, avec la commune de l'entreprise et 2 ou 3 communes voisines RÉELLES, à moins de 20 km (vérifie la géographie : Saint-Xandre → Marans, Puilboreau, La Rochelle…) ;
   - ajoute `pages`, comme Lestraque.
2. `contenu.json` complété pour les pages par commune. Ces pages sont sobres : le métier, la commune, le téléphone. N'y mets rien d'inventé (ni chantier, ni client, ni délai, ni avis).
3. Le site régénéré dans `site/` par ta copie du générateur. Il comprend l'accueil, les prestations, le contact, les mentions et une page par commune voisine. Il reprend les polices, l'accent et le hero du métier (da.json), avec kit.js et kit.css chargés. Le bandeau « Maquette — exemple non contractuel » reste sur chaque page. Les photos restent les photos de démonstration sous licence, avec leurs crédits.
4. Refais les captures `capture-bureau.png` (1440 × 900) et `capture-telephone.png` (390 × 844) après la régénération. Utilise le Chromium de Playwright de `~/presti`, sur le site servi en local, et attends que les polices soient chargées (`document.fonts.ready`) et le mouvement d'entrée fini.
5. Mets à jour `LISEZMOI.md` : dis que la seconde passe utilise le kit. Garde l'ordre d'appel et la marche à suivre pour les photos. Ajoute, pour chaque artisan, deux liens de RECHERCHE que Benj ouvrira lui-même :
   - `https://www.google.com/maps/search/?api=1&query=<nom+commune>` ;
   - `https://www.facebook.com/search/top?q=<nom+commune>`.

   Ce sont des liens seulement. N'ouvre pas ces pages, ne les télécharge pas, ne les aspire pas.

DONNÉES : ce sont des données d'entreprises. Elles ne partent vers AUCUNE IA gratuite ni vers aucun modèle `:cloud`. Aucune nouvelle recherche Firecrawl n'est nécessaire.

INTERDITS : écrire hors de `~/veille/prospection/sites-reference/` ; modifier `~/presti` ; publier ; modifier les juges.
