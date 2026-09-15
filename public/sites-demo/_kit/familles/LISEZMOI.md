# Familles d’effets des sites de démonstration

Une famille nommée `<nom>` peut fournir, dans ce dossier :

- `<nom>.css`, ajouté après `kit.css` ;
- `<nom>.bureau.css`, assemblé dans `bureau.css` sans commentaires ;
- `<nom>.js`, ajouté après `kit.js` avec le séparateur `\n;\n` ;
- `<nom>.mjs`, module de rendu chargé avec `await import()`.

Chaque fichier est facultatif. Une famille absente ne produit rien.
L’ordre de `da.familles` est l’ordre d’assemblage.
`--familles=a,b` remplace cette liste et `--familles=` la vide.

Le module `.mjs` exporte par défaut un objet de crochets facultatifs :

- `plateauCitation(texte, ctx)` rend le contenu du paragraphe de citation ;
- `plateauValeur(chiffre, i, ctx)` rend le span de valeur d’un chiffre ;
- `atelierPhrase(texte, ctx)` rend le contenu d’une phrase de l’atelier ;
- `etapesMedia(ctx)` remplace la photo des étapes quand il ne renvoie pas `null` ;
- `herosMedia(ctx)` ajoute du HTML après la photo du héros de l’accueil ;
- `garde(html, ctx)` vérifie chaque page et lève une erreur pour la refuser.
- `credits(entrees, ctx)` renvoie la liste des crédits, enrichie si nécessaire.

Sans crochet, les rendus par défaut sont ceux du générateur historique : texte
échappé, span `chiffre__valeur`, photo des étapes et aucun média ajouté au héros.
Si plusieurs familles définissent un crochet de remplacement, la dernière gagne.
Les résultats de `herosMedia` sont concaténés dans l’ordre des familles.
Tous les crochets `garde` sont exécutés.
Les crochets `credits` sont chaînés dans l’ordre des familles. Une entrée non photo
porte `{ type, base, legende, auteur, licence, licenceUrl, source }` ; la licence et
la source sont liées dans les mentions, sans rejoindre la ligne ni le contrôle photo.

Le contexte est exactement :
`{ metier, da, site, contenu, rel, photoDe, esc, page }`.
Les crochets rendent du HTML de confiance et doivent appeler `ctx.esc` pour tout
texte provenant des données.

Les fichiers publiés d’une famille vivent dans `<metier>/<nom>/`.
Un éventuel `<metier>/<nom>/attributions.json` est fusionné seulement quand la
famille est active. Les entrées `type: "video"` et `type: "rendu"` ne sont pas
des photos : elles restent hors de la ligne et du contrôle photo ; le crochet
`credits` peut les ajouter aux mentions légales.

`--sortie=<dossier>` rend sur une copie sans toucher au site source.
`--da=<fichier.json>` remplace la direction artistique pour les contrôles.
Toute lecture, tout rendu et tout garde-fou précèdent la première copie ou écriture.
S’il existe une feuille de bureau active, toutes sont assemblées dans l’ordre puis
liées après `styles.css` avec `media="(min-width: 1024px)"`. Sans elles, aucun lien
ni `bureau.css` ne subsiste.
