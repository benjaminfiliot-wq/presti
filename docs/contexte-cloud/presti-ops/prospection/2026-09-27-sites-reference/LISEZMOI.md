# Dix sites de référence privés — Marans et environs

Préparés le 27 septembre 2026 pour les appels de Benj. Chaque dossier contient `site.json`, `contenu.json`, `attributions.json`, `liens-reseaux.json`, sept pages HTML dans `site/` (accueil, prestations, contact, mentions et trois pages par commune voisine), et deux captures. Les sites sont des propositions visuelles privées : ils ne sont pas publiés, aucun artisan n’a été contacté, aucun formulaire ne transmet de données. Le bandeau « Maquette — exemple non contractuel » est visible sur chaque page. Les photos actuelles sont des illustrations sous licence issues des démos métier de Presti, pas des réalisations attribuées à ces entreprises.

## Ordre d’appel conseillé

L’ordre privilégie la zone de Marans, le score de la vague 1, la présence d’un numéro publié et la diversité des métiers. Le numéro doit être confirmé au début de l’appel. Les scores viennent de `prospection/liste-2026-09-27.csv` ; ils ne sont jamais affichés comme une note de qualité sur les sites.

| Ordre | Entreprise et métier | Commune | Téléphone publié | Score Laya | Source du téléphone |
|---:|---|---|---|---:|---|
| 1 | Société Percot et Fils · plomberie | Saint-Xandre 17138 | **05 46 37 20 31** | 0,8051 | [Annuaire métier](https://www.le-site-des-plombiers.com/plombier-a-saint-xandre-percot-et-fils-sarl/) |
| 2 | SARL Cyril Gosse · menuiserie | Longèves 85200 | **02 51 69 32 68** | 0,8312 | Liste de prospection ; [fiche PagesJaunes](https://www.pagesjaunes.fr/pros/50463346) |
| 3 | Borget Ludovic · carrelage | Les Magnils-Reigniers 85400 | **02 51 27 67 90** | 0,8420 | [Annuaire de la commune](https://lesmagnilsreigniers.fr/economie-emploi/) |
| 4 | Établissements Videau et Fils · maçonnerie | Luçon 85400 | **02 51 30 13 38** | 0,8332 | [Fiche PagesJaunes](https://www.pagesjaunes.fr/pros/54932151) |
| 5 | Carrelage et Moquette de l’Océan · carrelage | La Rochelle 17000 | **05 46 44 74 00** | 0,8359 | [Annuaire Yelp](https://m.yelp.com/biz/carrelage-et-moquette-de-l-ocean-rochelle-la) |
| 6 | SARL Bouffet Olivier · menuiserie | Lussant 17430 | **05 46 84 89 86** | 0,8286 | Liste de prospection ; [fiche PagesJaunes](https://www.pagesjaunes.fr/pros/50719112) |
| 7 | M.C.I SARL · menuiserie | Moragne 17430 | **05 46 83 49 93** | 0,8202 | Liste de prospection, donnée ADEME ; numéro à reconfirmer |
| 8 | Couverture 17 · couverture | Saint-Laurent-de-la-Prée 17450 | **05 46 99 83 34** | 0,8040 | [Annuaire 118000](https://www.118000.fr/v_saint-laurent-de-la-pree_17/c_couverture-plomberie-et-zinguerie-couvreur-plombier-zingueur) |
| 9 | Menanteau · peinture | Saint-Jean-d’Hermine 85210 | **02 51 97 91 64** | 0,8015 | [Annuaire 118000](https://www.118000.fr/e_C0096415510) |
| 10 | Elec’Technic · électricité | Saint-Michel-le-Cloucq 85200 | **02 51 69 89 44** | 0,7587 | [Annuaire Batico](https://www.batico.fr/artisans-vendee/m06.html) |

## Liens des réseaux, pour choisir les photos

Les fichiers `liens-reseaux.json` contiennent quatre clés : Facebook, Instagram, site et Google Maps. `null` signifie qu’aucune URL propre à l’entreprise n’a été établie par les recherches Firecrawl faites avec `--limit 3`. La recherche a porté sur les URL des résultats uniquement, sans aspirer les pages ni les photos de Facebook, Instagram ou Google. Les requêtes ont consommé moins de 80 crédits pour cette sélection et les candidats écartés. Un résultat de groupe, une publication d’un tiers ou une recherche Google Maps générique n’est pas traité comme la page de l’artisan.

| Artisan | Facebook | Instagram | Site | Google Maps |
|---|---|---|---|---|
| Société Percot et Fils | non établi | non établi | non repéré | non établi |
| SARL Cyril Gosse | [page repérée](https://www.facebook.com/gossecyril0/) | non établi | non repéré | non établi |
| Borget Ludovic | non établi | non établi | non repéré | non établi |
| Établissements Videau et Fils | non établi | non établi | non repéré | non établi |
| Carrelage et Moquette de l’Océan | non établi | non établi | non repéré | non établi |
| SARL Bouffet Olivier | non établi | non établi | non repéré | non établi |
| M.C.I SARL | non établi | non établi | non repéré | non établi |
| Couverture 17 | non établi | non établi | non repéré | non établi |
| Menanteau | non établi | non établi | non repéré | non établi |
| Elec’Technic | non établi | non établi | non repéré | non établi |

## Recherches à ouvrir manuellement par Benj

Ces URL sont seulement des liens de recherche préparés pour chaque entreprise et sa commune. Elles ne sont ni ouvertes, ni téléchargées, ni aspirées par cette passe. Un résultat doit être vérifié avant d’être associé à l’entreprise.

| Artisan | Recherche Google Maps | Recherche Facebook |
|---|---|---|
| Société Percot et Fils | [Google Maps](https://www.google.com/maps/search/?api=1&query=Soci%C3%A9t%C3%A9+Percot+et+Fils+Saint-Xandre) | [Facebook](https://www.facebook.com/search/top?q=Soci%C3%A9t%C3%A9+Percot+et+Fils+Saint-Xandre) |
| SARL Cyril Gosse | [Google Maps](https://www.google.com/maps/search/?api=1&query=SARL+Cyril+Gosse+Long%C3%A8ves) | [Facebook](https://www.facebook.com/search/top?q=SARL+Cyril+Gosse+Long%C3%A8ves) |
| Borget Ludovic | [Google Maps](https://www.google.com/maps/search/?api=1&query=Borget+Ludovic+Les+Magnils-Reigniers) | [Facebook](https://www.facebook.com/search/top?q=Borget+Ludovic+Les+Magnils-Reigniers) |
| Établissements Videau et Fils | [Google Maps](https://www.google.com/maps/search/?api=1&query=%C3%89tablissements+Videau+et+Fils+Lu%C3%A7on) | [Facebook](https://www.facebook.com/search/top?q=%C3%89tablissements+Videau+et+Fils+Lu%C3%A7on) |
| Carrelage et Moquette de l’Océan | [Google Maps](https://www.google.com/maps/search/?api=1&query=Carrelage+et+Moquette+de+l%E2%80%99Oc%C3%A9an+La+Rochelle) | [Facebook](https://www.facebook.com/search/top?q=Carrelage+et+Moquette+de+l%E2%80%99Oc%C3%A9an+La+Rochelle) |
| SARL Bouffet Olivier | [Google Maps](https://www.google.com/maps/search/?api=1&query=SARL+Bouffet+Olivier+Lussant) | [Facebook](https://www.facebook.com/search/top?q=SARL+Bouffet+Olivier+Lussant) |
| M.C.I Sarl | [Google Maps](https://www.google.com/maps/search/?api=1&query=M.C.I+SARL+Moragne) | [Facebook](https://www.facebook.com/search/top?q=M.C.I+SARL+Moragne) |
| Couverture 17 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Couverture+17+Saint-Laurent-de-la-Pr%C3%A9e) | [Facebook](https://www.facebook.com/search/top?q=Couverture+17+Saint-Laurent-de-la-Pr%C3%A9e) |
| Menanteau | [Google Maps](https://www.google.com/maps/search/?api=1&query=Menanteau+Saint-Jean-d%27Hermine) | [Facebook](https://www.facebook.com/search/top?q=Menanteau+Saint-Jean-d%27Hermine) |
| Elec’Technic | [Google Maps](https://www.google.com/maps/search/?api=1&query=Elec%E2%80%99Technic+Saint-Michel-le-Cloucq) | [Facebook](https://www.facebook.com/search/top?q=Elec%E2%80%99Technic+Saint-Michel-le-Cloucq) |

## Marche à suivre pour les photos

1. Benj ouvre la page de l’artisan lui-même, si une page professionnelle est confirmée. Il choisit trois ou quatre photos utiles pour raconter le métier : une image d’ouverture, deux ou trois détails ou réalisations. Il vérifie que la page appartient bien à l’entreprise.
2. Il prépare une **maquette privée qu’il ne montre qu’à lui** avec ces images. Il conserve la source et n’aspire pas automatiquement le contenu ni les photos des réseaux.
3. Pendant l’appel, il demande explicitement : **« j’ai mis vos photos, vous validez ? »** Il recueille aussi les corrections de nom, prestations, commune, zone, téléphone et éventuelles mentions professionnelles.
4. Sans cet accord, les images de l’artisan ne sont pas montrées à d’autres personnes et **rien n’est publié**. Une validation des textes et du site final est également nécessaire avant toute mise en ligne.

## Sélection et limites

La vague 1 ne fournit qu’une entreprise de Marans avec métier pertinent mais sans numéro direct fiable : EURL Bessus David. Le `09 71 45 22 86` trouvé apparaît sur des services de mise en relation ; il n’a pas été retenu comme téléphone professionnel direct. Chevallier Maçonnerie à Andilly, SEMA à Sainte-Soulle, AP3 Elec et d’autres candidats de la liste ont été écartés dès qu’un site propre a été découvert. Les entreprises restantes ont `a_un_site = non` ou `inconnu` dans la liste ; l’absence de site ne peut pas être prouvée de façon absolue et doit être vérifiée avant l’appel. M.C.I, plus éloignée, complète les dix en conservant un métier et un numéro publiés. Les modèles métier ne sont présents dans `~/presti/maquettes/modeles/` que pour menuisier, plombier, couvreur et électricien. Pour carrelage, maçonnerie et peinture, `construire.py` applique le même schéma de contenu et reprend la direction artistique et les photos des démos métier existantes.

La seconde passe utilise le kit du cerveau site v2 de Presti : la direction artistique par métier (`da.json`), les polices woff2, `kit.css` et `kit.js`. Une copie adaptée du générateur Lestraque est conservée dans `_generateur/` ; l’original dans `~/presti` reste intact. Le rendu privé se rejoue par `node prospection/sites-reference/_generateur/generer.mjs --references`. Il lit les `site.json`, `contenu.json` et `attributions.json` de chaque artisan et écrit seulement dans les dix dossiers de référence. Les textes, téléphones, entreprises et crédits de la première passe restent la base ; les pages locales sont de simples repères métier et commune, sans promesse de desserte. Les sites restent `noindex`, `robots.txt` interdit l’indexation, et aucun site n’est hébergé.
