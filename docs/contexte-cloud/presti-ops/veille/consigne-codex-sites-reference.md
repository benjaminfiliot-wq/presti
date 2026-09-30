Tu travailles sur l'usine de Presti, dans ~/veille. Écris en français.

MISSION (décision de Benj du 27/09) : construire **10 SITES DE RÉFÉRENCE complets** pour 10 artisans autour de **Marans**, au niveau du site de démonstration Atelier Lestraque. Benj s'en servira dans ses appels. **Personne n'est contacté par toi, rien n'est mis en ligne.**

JUGE : `node juges/juge-sites-reference.mjs` (déjà écrit, NE PAS le modifier). Lis-le d'abord, boucle jusqu'au PASS.

CHOIX DES 10 : dans `prospection/liste-2026-09-27.csv` (vague 1), prends des entreprises au code postal 17xxx ou 85xxx proche de Marans (Marans 17230 en priorité, puis les communes voisines). Elles doivent être sans site (`a_un_site` = `non` ou `inconnu`) et avoir un téléphone : regarde aussi `prospection/maquettes-2026-09-27/telephones-trouves.csv`. Prends le `score_laya` le plus haut, et varie les métiers. Un téléphone manquant peut se trouver par la recherche Firecrawl (annuaire public ou page de l'entreprise). **Si ta recherche révèle que l'entreprise a déjà un site, écarte-la** et prends la suivante.

GÉNÉRATEUR : utilise le générateur du site de référence, `~/presti/public/sites-demo/generer.mjs`. Il est en lecture seule dans `~/presti` : copie ce qu'il faut dans ton dossier de travail.
- Lis son en-tête : il rend un site à partir de `site.json` (le dossier), `contenu.json` (les textes) et `attributions.json` (les photos et leurs licences), avec la direction artistique du métier (`_kit/da.json`) et le mouvement (`_kit/kit.css`, `kit.js`).
- Pour chaque entreprise, dans `prospection/sites-reference/<NN-slug>/` :
  - `site.json` : siren, nom, métier, commune, téléphone professionnel publié ;
  - `contenu.json`, à partir du modèle du métier dans `~/presti/maquettes/modeles/<metier>/contenu.json`, avec les gabarits {ville} et {entreprise} remplis ;
  - `attributions.json` : les photos de démonstration du métier (`~/presti/public/sites-demo/<metier>/`) **avec leurs licences d'origine** ;
  - puis le site généré dans `site/` (accueil et au moins une autre page).
- Captures `capture-bureau.png` (1440 × 900) et `capture-telephone.png` (390 × 844), avec le Chromium de Playwright de `~/presti`, servi en local.
- Mention visible « Maquette — exemple non contractuel ». **Rien d'invérifiable** : pas d'années d'expérience, pas d'avis, pas de note, pas de décennale ni de certification (RGE seulement si la liste le dit).

LIENS DES RÉSEAUX, pour que Benj choisisse lui-même les photos :
- `liens-reseaux.json` : `{facebook, instagram, site, google_maps}`. Chaque clé vaut `null` ou `{url, source}`.
- Trouve ces liens par la recherche Firecrawl (`outils/firecrawl.sh search`, `--limit 3`, **80 crédits au plus pour les 10**), en lisant seulement les URL des résultats.
- **N'aspire JAMAIS le contenu ni les photos de Facebook, d'Instagram ou de Google** (leurs conditions l'interdisent, et les photos appartiennent aux artisans).

`prospection/sites-reference/LISEZMOI.md` :
- l'ordre d'appel, avec les téléphones ;
- pour chaque artisan, les liens de ses réseaux ;
- la marche à suivre pour les photos : Benj choisit 3 ou 4 photos sur la page de l'artisan, pour une maquette privée qu'il ne montre qu'à lui. Il demande son accord au téléphone : « j'ai mis vos photos, vous validez ? ». On ne publie jamais sans cet accord.

DONNÉES : ce sont des données d'entreprises. Elles ne partent vers AUCUNE IA gratuite ni vers aucun modèle `:cloud`.

INTERDITS : écrire hors de `~/veille/prospection/sites-reference/` ; modifier `~/presti` ; publier ; modifier le juge.
