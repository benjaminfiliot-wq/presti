# Modèle de données du site artisan — relevé 024-02

Relevé en lecture seule le 2026-09-16 par `node .orchestre/travail/kit-figma/releve-modele.mjs`. Détail complet et toutes les origines : `modele.json`. Site vivant : `public/sites-demo/lestraque`. 62 fichiers lus (empreintes sha256 dans modele.json).

## 1. Entrées d’un site

| Fichier | Lu à |
|---|---|
| site | `public/sites-demo/generer.mjs:279` |
| contenu | `public/sites-demo/generer.mjs:280` |
| attributions | `public/sites-demo/generer.mjs:300` |
| attributions_familles | `public/sites-demo/generer.mjs:302` |
| da | `public/sites-demo/generer.mjs:15` |

### site.json

| Champ | Type | Requis | Rôle | Lestraque | Lu par generer.mjs |
|---|---|---|---|---|---|
| `metier` | string | oui | clé de DA de repli (da.json) et de TYPES_METIER du juge | "menuisier" (`public/sites-demo/lestraque/site.json:2`) | `public/sites-demo/generer.mjs:282` |
| `nom` | string | oui | nom de l’entreprise : nav, pied, JSON-LD, titre de styles.css | "Atelier Lestraque" (`public/sites-demo/lestraque/site.json:3`) | `public/sites-demo/generer.mjs:371`, `public/sites-demo/generer.mjs:401`, `public/sites-demo/generer.mjs:460`, `public/sites-demo/generer.mjs:478` +1 |
| `telephone` | string (E.164 avec espaces) | oui | lien tel: RFC 3966 (telHref) et affichage (telAffiche) ; nav, contact, pied | "+33 2 61 91 38 47" (`public/sites-demo/lestraque/site.json:4`) | `public/sites-demo/generer.mjs:307`, `public/sites-demo/generer.mjs:128`, `public/sites-demo/generer.mjs:145`, `public/sites-demo/generer.mjs:418` +4 |
| `siren` | string (9 chiffres) | oui (juge) | pied de page et mentions légales seulement (garde-fou) | "000000000" (`public/sites-demo/lestraque/site.json:5`) | `public/sites-demo/generer.mjs:144`, `public/sites-demo/generer.mjs:478` |
| `decennale.assureur` | string | oui (juge) | pied de page seulement | "Assureur fictif" (`public/sites-demo/lestraque/site.json:7`) | `public/sites-demo/generer.mjs:144`, `public/sites-demo/generer.mjs:478` |
| `decennale.numero` | string | oui (juge) | pied de page seulement | "DEMO-0001" (`public/sites-demo/lestraque/site.json:8`) | `public/sites-demo/generer.mjs:144`, `public/sites-demo/generer.mjs:478` |
| `communes` | string[] (la 1re = ville de l’atelier) | oui | pages communes, liste monumentale, formulaire (option), infos « Intervention » | ["Rennes","Cesson-Sévigné","Bruz","Saint-Grégoire"] (`public/sites-demo/lestraque/site.json:10`) | `public/sites-demo/generer.mjs:306`, `public/sites-demo/generer.mjs:411` |
| `metiers_secondaires` | string[] | non | lu par le juge site-qa, pas par generer.mjs | [] (`public/sites-demo/lestraque/site.json:16`) | — |
| `demo` | boolean | non | mentions « démonstration », data-demo du formulaire, liens index.html | true (`public/sites-demo/lestraque/site.json:17`) | `public/sites-demo/generer.mjs:482`, `public/sites-demo/generer.mjs:586`, `public/sites-demo/generer.mjs:592`, `public/sites-demo/generer.mjs:603` +2 |
| `pages[].chemin` | string (finit par /) | oui | fichier <chemin>index.html, canonical, sitemap | "/" (`public/sites-demo/lestraque/site.json:20`) | `public/sites-demo/generer.mjs:416`, `public/sites-demo/generer.mjs:417`, `public/sites-demo/generer.mjs:698`, `public/sites-demo/generer.mjs:723` +20 |
| `pages[].type` | "accueil" \| "commune" \| "metier" \| "legal" | oui | choix du gabarit (accueil / interieure / legale) | "accueil" (`public/sites-demo/lestraque/site.json:21`) | `public/sites-demo/generer.mjs:423`, `public/sites-demo/generer.mjs:430`, `public/sites-demo/generer.mjs:434`, `public/sites-demo/generer.mjs:435` +24 |
| `pages[].cible` | string (commune ou métier) | pour commune / metier | h1, fil d’Ariane, commune présélectionnée du formulaire | "Rennes" (`public/sites-demo/lestraque/site.json:26`) | `public/sites-demo/generer.mjs:737`, `public/sites-demo/generer.mjs:739`, `public/sites-demo/generer.mjs:748`, `public/sites-demo/generer.mjs:749` +13 |
| `url_base` | string (URL) | non | canonical, og:url, sitemap, robots (défaut https://<metier>.demo.invalid) | "https://lestraque.demo.invalid" (`public/sites-demo/lestraque/site.json:52`) | `public/sites-demo/generer.mjs:305`, `public/sites-demo/generer.mjs:416`, `public/sites-demo/generer.mjs:418`, `public/sites-demo/generer.mjs:449` +2 |
| `da` | string (clé de da.json) | non | entrée de DA fusionnée après celle du métier | "lestraque" (`public/sites-demo/lestraque/site.json:53`) | `public/sites-demo/generer.mjs:282` |
| `devis.projets` | string[] | si formulaire | options du champ « Votre projet » (et fiche de l’éclaté) | ["Escalier","Dressing ou placard","Cuisine","Bibliothèque"," (`public/sites-demo/lestraque/site.json:56`) | `public/sites-demo/generer.mjs:587` |
| `devis.delais` | string[] | si formulaire | options du champ « Quand », 1re valeur par défaut du récapitulatif | ["Dans les trois mois","Dans trois à six mois","Plus tard, j (`public/sites-demo/lestraque/site.json:63`) | `public/sites-demo/generer.mjs:589`, `public/sites-demo/generer.mjs:604` |
| `devis.rappel` | string | si formulaire | phrase de l’état « Demande reçue » | "Je vous rappelle sous deux jours ouvrés pour fixer une visi (`public/sites-demo/lestraque/site.json:68`) | `public/sites-demo/generer.mjs:603` |
| `artisan.prenom` | string | oui | signature du plateau | "Camille" (`public/sites-demo/lestraque/site.json:72`) | `public/sites-demo/generer.mjs:202`, `public/sites-demo/generer.mjs:210`, `public/sites-demo/generer.mjs:648` |
| `artisan.nom` | string | oui | signature du plateau | "Lestraque" (`public/sites-demo/lestraque/site.json:73`) | `public/sites-demo/generer.mjs:210`, `public/sites-demo/generer.mjs:648`, `public/sites-demo/generer.mjs:202` |
| `artisan.installation` | number (année 1960–aujourd’hui) | oui | « à <ville> depuis <année> » | 2011 (`public/sites-demo/lestraque/site.json:74`) | `public/sites-demo/generer.mjs:195`, `public/sites-demo/generer.mjs:196`, `public/sites-demo/generer.mjs:202` |
| `artisan.parcours` | string (≤ 140 signes) | oui | ligne sous la signature du plateau | "CAP puis brevet professionnel de menuisier, huit ans dans u (`public/sites-demo/lestraque/site.json:75`) | `public/sites-demo/generer.mjs:197`, `public/sites-demo/generer.mjs:648` |
| `artisan.citation` | string (20–160 signes, 1re personne) | oui | citation du plateau (crochet plateauCitation) | "Du premier relevé à la dernière marche posée, je ne passe l (`public/sites-demo/lestraque/site.json:76`) | `public/sites-demo/generer.mjs:198`, `public/sites-demo/generer.mjs:200`, `public/sites-demo/generer.mjs:648` |
| `plateau.chiffres[].valeur` | string (nombre > 0) | si plateau (3 chiffres exactement) | grand chiffre (crochet plateauValeur) | "10" (`public/sites-demo/lestraque/site.json:82`) | `public/sites-demo/generer.mjs:220`, `public/sites-demo/generer.mjs:221`, `public/sites-demo/generer.mjs:222`, `public/sites-demo/generer.mjs:648` |
| `plateau.chiffres[].unite` | string | non | unité à côté du chiffre | "ans" (`public/sites-demo/lestraque/site.json:83`) | `public/sites-demo/generer.mjs:648` |
| `plateau.chiffres[].legende` | string | oui | légende <dt> du chiffre | "de garantie décennale sur chaque ouvrage posé" (`public/sites-demo/lestraque/site.json:84`) | `public/sites-demo/generer.mjs:222`, `public/sites-demo/generer.mjs:648` |

### contenu.json

| Champ | Type | Rôle | Lu par generer.mjs |
|---|---|---|---|
| `metier` | string | non lu par generer.mjs | — |
| `extrait_le` | string (date) | non lu par generer.mjs | — |
| `demo_v16` | string (note) | non lu par generer.mjs | — |
| `pages[chemin].type` | string | recopié du site v1 ; le gabarit suit site.json → pages[].type | — |
| `pages[chemin].title` | string (15–70 signes, juge) | <title>, og:title | `public/sites-demo/generer.mjs:711`, `public/sites-demo/generer.mjs:730`, `public/sites-demo/generer.mjs:771`, `public/sites-demo/generer.mjs:791` +1 |
| `pages[chemin].description` | string (50–160 signes, juge) | meta description, og:description | `public/sites-demo/generer.mjs:711`, `public/sites-demo/generer.mjs:730`, `public/sites-demo/generer.mjs:771`, `public/sites-demo/generer.mjs:791` +1 |
| `pages[chemin].h1` | string (mot-clé SEO) | h1 (.h1__cle en héros plein), fil d’Ariane des pages légales | `public/sites-demo/generer.mjs:673`, `public/sites-demo/generer.mjs:675`, `public/sites-demo/generer.mjs:748`, `public/sites-demo/generer.mjs:749` +1 |
| `pages[chemin].h1Ligne` | string (idée display) | ligne display du h1 (.h1__ligne) ; obligatoire en héros plein à l’accueil | `public/sites-demo/generer.mjs:670`, `public/sites-demo/generer.mjs:673`, `public/sites-demo/generer.mjs:743`, `public/sites-demo/generer.mjs:748` |
| `pages[chemin].chapeau` | string (≤ 90 signes et 20 mots à l’accueil) | chapeau du héros | `public/sites-demo/generer.mjs:673`, `public/sites-demo/generer.mjs:675`, `public/sites-demo/generer.mjs:748`, `public/sites-demo/generer.mjs:749` +2 |
| `pages[chemin].kicker` | string | surtitre des héros sans photo (hero--page, scinde, aplat) | `public/sites-demo/generer.mjs:675`, `public/sites-demo/generer.mjs:737` |
| `pages[chemin].jsonld[]` | object (schema.org) | JSON-LD de la page (url, telephone, image réécrits) | `public/sites-demo/generer.mjs:417` |
| `pages[chemin].sections[].h2` | string (2 à 4 mots à l’accueil) | titre de la scène ; classification si genre absent | `public/sites-demo/generer.mjs:47`, `public/sites-demo/generer.mjs:521`, `public/sites-demo/generer.mjs:531`, `public/sites-demo/generer.mjs:544` +23 |
| `pages[chemin].sections[].genre` | "prestations" \| "atelier" \| "galerie" \| "communes" \| "etapes" \| "faq" \| "contact" \| "engagements" \| "prose" | choisit le gabarit de scène (sinon déduit du h2) | `public/sites-demo/generer.mjs:47`, `public/sites-demo/generer.mjs:88`, `public/sites-demo/generer.mjs:413`, `public/sites-demo/generer.mjs:598` +2 |
| `pages[chemin].sections[].blocs[].type` | "p" \| "h3" \| "li" \| "summary" \| "figcaption" \| "img" | découpe intro / items (h3 + paragraphes) | `public/sites-demo/generer.mjs:53`, `public/sites-demo/generer.mjs:54`, `public/sites-demo/generer.mjs:55`, `public/sites-demo/generer.mjs:56` +1 |
| `pages[chemin].sections[].blocs[].texte` | string | texte des paragraphes et des titres d’items | `public/sites-demo/generer.mjs:54`, `public/sites-demo/generer.mjs:55`, `public/sites-demo/generer.mjs:57` |

Genres de section : `faq` (question|faq, `public/sites-demo/generer.mjs:36`) · `etapes` (deroul|etape|processus|comment, `public/sites-demo/generer.mjs:37`) · `galerie` (realisation|chantier|image|galerie|exemple, `public/sites-demo/generer.mjs:38`) · `communes` (commune|zone|secteur|intervention|desserv|proximite|autour, `public/sites-demo/generer.mjs:39`) · `prestations` (prestation|service|savoir|travaux, `public/sites-demo/generer.mjs:40`) · `engagements` (engagement|garantie, `public/sites-demo/generer.mjs:41`) · `contact` (contact|echange|devis|discut|demand|votre, `public/sites-demo/generer.mjs:42`) · `prose` ((défaut), `public/sites-demo/generer.mjs:43`) · `atelier` ((jamais déduit : champ genre explicite), `public/sites-demo/generer.mjs:688`). Le champ `genre` prime (`public/sites-demo/generer.mjs:47`).

### attributions.json

| Champ | Type | Rôle | Lu par generer.mjs |
|---|---|---|---|
| `fichier` | string (images/<base>-<largeur>.<avif\|webp>) | une ligne par fichier ; largeurs disponibles | `public/sites-demo/generer.mjs:311`, `public/sites-demo/generer.mjs:316` |
| `base` | string | identifiant de la photo ; les valeurs de da.json (chaîne ou { base, position }) le citent | `public/sites-demo/generer.mjs:241`, `public/sites-demo/generer.mjs:246`, `public/sites-demo/generer.mjs:261` +19 |
| `largeur` | number (px du fichier) | attributs width des <img> | `public/sites-demo/generer.mjs:246`, `public/sites-demo/generer.mjs:261`, `public/sites-demo/generer.mjs:513` |
| `hauteur` | number (px du fichier) | attributs height ; orientation portrait | `public/sites-demo/generer.mjs:246`, `public/sites-demo/generer.mjs:261`, `public/sites-demo/generer.mjs:513` |
| `legende` | string | figcaption, légende de l’atelier, crédits | `public/sites-demo/generer.mjs:246`, `public/sites-demo/generer.mjs:261`, `public/sites-demo/generer.mjs:515` +7 |
| `alt` | string | attribut alt (défaut : legende) | `public/sites-demo/generer.mjs:246`, `public/sites-demo/generer.mjs:261` |
| `auteur` | string | crédits (ligne groupée et mentions légales) | `public/sites-demo/generer.mjs:325`, `public/sites-demo/generer.mjs:504`, `public/sites-demo/generer.mjs:506` +3 |
| `licence` | string (CC0, CC BY x.0, CC BY-SA x.0) | crédits ; lien vers l’acte (LICENCES_URL) | `public/sites-demo/generer.mjs:504`, `public/sites-demo/generer.mjs:506`, `public/sites-demo/generer.mjs:515` +5 |
| `source` | string (page Commons) | lien « page du fichier » des mentions ; regroupe les variantes d’une même photo | `public/sites-demo/generer.mjs:815`, `public/sites-demo/generer.mjs:820`, `public/sites-demo/generer.mjs:821` +2 |
| `modifiee` | string (« Oui — … » ou « Non ») | mention « modifiée » / « adaptation » (CC BY-SA) | `public/sites-demo/generer.mjs:235`, `public/sites-demo/generer.mjs:236` |
| `usage` | string (« reserve » = non publiée) | écarte les photos mises de côté | `public/sites-demo/generer.mjs:315` |
| `type` | "video" \| "rendu" (absent = photo) | hors de la ligne de crédits photo | `public/sites-demo/generer.mjs:314`, `public/sites-demo/generer.mjs:824`, `public/sites-demo/generer.mjs:825` |
| `licenceUrl` | string (entrée non photo) | lien de licence d’une entrée vidéo | `public/sites-demo/generer.mjs:821` |
| `titre_commons` | string | non lu par generer.mjs | — |
| `largeur_source / hauteur_source` | number | non lu par generer.mjs | — |
| `etalonnage` | object (réglage de photos-demo / photos-heros) | non lu par generer.mjs | — |
| `recadrage` | number[4] (fractions g, h, l, H) | non lu par generer.mjs (lu par scripts/photos-provenance.mjs) | — |

## 2. Pages produites

| Chemin | Type | Gabarit | Sections rendues (fond) |
|---|---|---|---|
| `/` | accueil | `public/sites-demo/generer.mjs:663` | `section.hero.hero--plein` (photo) → `section.plateau` (noir) → `section.scene.scene--papier.scene--presta#prestations` (papier) → `section.scene.atelier#atelier` (photo) → `section.section.section--noir.scene--galerie#realisations` (noir) → `section.scene.scene--papier.scene--communes#communes` (papier) → `section.section.section--noir#etapes` (noir) → `section.scene.scene--papier.scene--faq#questions` (papier) → `section.contact.contact--photo.contact--matiere#contact` (photo) |
| `/menuisier-rennes/` | commune | `public/sites-demo/generer.mjs:734` | `section.hero.hero--plein.hero--commune` (photo) → `section.scene.scene--papier.scene--presta` (papier) → `section.section.section--noir.scene--galerie` (noir) → `section.scene.scene--papier.scene--communes#communes` (papier) → `section.contact.contact--photo#contact` (photo) |
| `/menuisier-cesson-sevigne/` | commune | `public/sites-demo/generer.mjs:734` | `section.hero.hero--plein.hero--commune` (photo) → `section.scene.scene--papier.scene--presta` (papier) → `section.section.section--noir.scene--galerie` (noir) → `section.scene.scene--papier.scene--communes#communes` (papier) → `section.contact.contact--photo.contact--long#contact` (photo) |
| `/menuisier-bruz/` | commune | `public/sites-demo/generer.mjs:734` | `section.hero.hero--plein.hero--commune.hero--portrait` (photo) → `section.scene.scene--papier.scene--presta` (papier) → `section.section.section--noir.scene--galerie` (noir) → `section.scene.scene--papier.scene--communes#communes` (papier) → `section.contact.contact--photo#contact` (photo) |
| `/menuisier-saint-gregoire/` | commune | `public/sites-demo/generer.mjs:734` | `section.hero.hero--plein.hero--commune.hero--portrait` (photo) → `section.scene.scene--papier.scene--presta` (papier) → `section.section.section--noir.scene--galerie` (noir) → `section.scene.scene--papier.scene--communes#communes` (papier) → `section.contact.contact--photo.contact--long#contact` (photo) |
| `/mentions-legales/` | legal | `public/sites-demo/generer.mjs:829` | `section.hero.hero--page` (papier) → `section.section` (papier) |
| `/confidentialite/` | legal | `public/sites-demo/generer.mjs:829` | `section.hero.hero--page` (papier) → `section.section` (papier) |

Fichiers du site (hors images) : 38 ; images : 12 bases, 108 fichiers (avif + webp).

| Fichier | Octets | Rôle | Produit / lu à |
|---|---|---|---|
| `attributions.json` | 112323 | ENTRÉE : photos et provenance | `public/sites-demo/generer.mjs:300` |
| `bureau.css` | 13745 | les <famille>.bureau.css, liées avec media="(min-width: 1024px)" | `public/sites-demo/generer.mjs:924` |
| `confidentialite/index.html` | 9243 | page HTML rendue | `public/sites-demo/generer.mjs:933` |
| `contenu.json` | 35982 | ENTRÉE : textes des pages | `public/sites-demo/generer.mjs:280` |
| `eclate/assemble.avif` | 9478 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/attributions.json` | 1274 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/calque-contremarche.avif` | 8372 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/calque-limon.avif` | 7844 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/calque-marche.avif` | 10915 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/calque-vis.avif` | 5140 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/eclate.avif` | 15070 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/eclate.json` | 1569 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/releve.avif` | 12100 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `eclate/releve.json` | 560 | ENTRÉE de la famille eclate : rendus, eclate.json, releve.json, attributions.json | `public/sites-demo/_kit/familles/eclate.mjs:9` |
| `favicon.svg` | 968 | monogramme de la police de titre (da.monogramme) | `public/sites-demo/generer.mjs:929` |
| `fonts/OFL.txt` | 285 | copie de _polices/<slug>/ (+ OFL.txt de la police de titre) | `public/sites-demo/generer.mjs:922` |
| `fonts/fraunces-300.woff2` | 18328 | copie de _polices/<slug>/ (+ OFL.txt de la police de titre) | `public/sites-demo/generer.mjs:922` |
| `fonts/fraunces-400.woff2` | 18392 | copie de _polices/<slug>/ (+ OFL.txt de la police de titre) | `public/sites-demo/generer.mjs:922` |
| `fonts/fraunces-600.woff2` | 18364 | copie de _polices/<slug>/ (+ OFL.txt de la police de titre) | `public/sites-demo/generer.mjs:922` |
| `fonts/ibm-plex-sans-400.woff2` | 14824 | copie de _polices/<slug>/ (+ OFL.txt de la police de titre) | `public/sites-demo/generer.mjs:922` |
| `fonts/ibm-plex-sans-600.woff2` | 16176 | copie de _polices/<slug>/ (+ OFL.txt de la police de titre) | `public/sites-demo/generer.mjs:922` |
| `index.html` | 44313 | page HTML rendue | `public/sites-demo/generer.mjs:933` |
| `mentions-legales/index.html` | 14632 | page HTML rendue | `public/sites-demo/generer.mjs:933` |
| `menuisier-bruz/index.html` | 23307 | page HTML rendue | `public/sites-demo/generer.mjs:933` |
| `menuisier-cesson-sevigne/index.html` | 24308 | page HTML rendue | `public/sites-demo/generer.mjs:933` |
| `menuisier-rennes/index.html` | 23642 | page HTML rendue | `public/sites-demo/generer.mjs:933` |
| `menuisier-saint-gregoire/index.html` | 23884 | page HTML rendue | `public/sites-demo/generer.mjs:933` |
| `relief-fil.js` | 21094 | copie de _kit/relief.js / relief-fil.js quand da.relief | `public/sites-demo/generer.mjs:928` |
| `relief.js` | 10661 | copie de _kit/relief.js / relief-fil.js quand da.relief | `public/sites-demo/generer.mjs:928` |
| `relief/escalier-profondeur.webp` | 8264 | ENTRÉE : carte de profondeur du héros (scripts/relief-profondeur.mjs) | `public/sites-demo/generer.mjs:899` |
| `robots.txt` | 75 | Allow + Sitemap | `public/sites-demo/generer.mjs:937` |
| `site.js` | 44552 | kit.js + <famille>.js séparés par « \n;\n » | `public/sites-demo/generer.mjs:927` |
| `site.json` | 3152 | ENTRÉE : dossier de l’artisan (contrat du juge site-qa) | `public/sites-demo/generer.mjs:279` |
| `sitemap.xml` | 617 | pages non légales, lastmod = jour de génération | `public/sites-demo/generer.mjs:936` |
| `styles.css` | 82728 | @font-face + :root (DA) + kit.css sans commentaires + <famille>.css | `public/sites-demo/generer.mjs:923` |
| `video/atelier.av1.mp4` | 96475 | ENTRÉE de la famille video : atelier.av1.mp4, atelier.h264.mp4, attributions.json | `public/sites-demo/_kit/familles/video.mjs:10` |
| `video/atelier.h264.mp4` | 265449 | ENTRÉE de la famille video : atelier.av1.mp4, atelier.h264.mp4, attributions.json | `public/sites-demo/_kit/familles/video.mjs:10` |
| `video/attributions.json` | 652 | ENTRÉE de la famille video : atelier.av1.mp4, atelier.h264.mp4, attributions.json | `public/sites-demo/_kit/familles/video.mjs:10` |

### Photos et provenance (attributions existantes)

| Base | Largeurs | Rôles (da) | Pages | Auteur | Licence | Modifiée | Source | Origine |
|---|---|---|---|---|---|---|---|---|
| `atelier-poncage` | 480, 720, 960, 1600, 2400, 2880 | atelier, prestationsPhotos.parquet | / /menuisier-rennes/ /menuisier-cesson-sevigne/ /menuisier-bruz/ /menuisier-saint-gregoire/ | Shixart1985 | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:Close-up_of_a_carpenters_hand_sandpapering_the_wood.jpg | `public/sites-demo/lestraque/attributions.json:706` |
| `atelier-poncage-portrait` | 720, 1080 | atelierMobile | / | Shixart1985 | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:Close-up_of_a_carpenters_hand_sandpapering_the_wood.jpg | `public/sites-demo/lestraque/attributions.json:1138` |
| `boiserie` | 480, 720, 960, 1600, 2400 | contactPhoto, prestationsPhotos.porte | / | Crew | CC0 | oui | https://commons.wikimedia.org/wiki/File:Coffee_table_by_a_wooden_wall_(Unsplash).jpg | `public/sites-demo/lestraque/attributions.json:1642` |
| `heros-escalier` | 480, 720, 960, 1600, 2400, 2880 | heros, galerie, relief.photo, ouvrages, photosCommunes | / /menuisier-rennes/ /menuisier-cesson-sevigne/ /menuisier-bruz/ /menuisier-saint-gregoire/ | Petar Milošević | CC BY-SA 4.0 | oui | https://commons.wikimedia.org/wiki/File:Wooden_spiral_stairs_(Neboti%C4%8Dnik,_Ljubljana).jpg | `public/sites-demo/lestraque/attributions.json:4` |
| `heros-escalier-portrait` | 720, 1080, 1440 | herosMobile | / | Petar Milošević | CC BY-SA 4.0 | oui | https://commons.wikimedia.org/wiki/File:Wooden_spiral_stairs_(Neboti%C4%8Dnik,_Ljubljana).jpg | `public/sites-demo/lestraque/attributions.json:448` |
| `mains-noyer` | 480, 720, 960, 1600 | plateauPhoto | / | Ian Schneider | CC0 | oui | https://commons.wikimedia.org/wiki/File:Woodworker_in_a_workshop_(Unsplash).jpg | `public/sites-demo/lestraque/attributions.json:2290` |
| `penderie` | 480, 720, 960, 1600 | galerie, ouvrages, prestationsPhotos.dressing, prestationsPhotos.agencement, photosCommunes | / /menuisier-rennes/ /menuisier-cesson-sevigne/ /menuisier-bruz/ /menuisier-saint-gregoire/ | Shixart1985 | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:Empty_wooden_wardrobe_closeup.jpg | `public/sites-demo/lestraque/attributions.json:1306` |
| `reserve-bibliotheque` | 480, 720, 960, 1600, 2400, 2880 | galerie, ouvrages, prestationsPhotos.bibliotheque, photosCommunes | / /menuisier-rennes/ /menuisier-cesson-sevigne/ /menuisier-bruz/ /menuisier-saint-gregoire/ | Shixart1985 | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:Modern_interior_design_featuring_wooden_shelves_and_decorative_elements.jpg | `public/sites-demo/lestraque/attributions.json:3614` |
| `reserve-cuisine-poutres` | 480, 720, 960, 1600, 2400, 2880 | galerie, ouvrages, prestationsPhotos.cuisine | / /menuisier-rennes/ /menuisier-cesson-sevigne/ /menuisier-bruz/ /menuisier-saint-gregoire/ | Shixart1985 | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:This_space_features_a_stylish_kitchen_with_a_wooden_countertop_and_shelves.jpg | `public/sites-demo/lestraque/attributions.json:3182` |
| `reserve-cuisine-tasseaux` | 480, 720, 960, 1600, 2400, 2880 | ouvrages, photosCommunes | /menuisier-cesson-sevigne/ | Shixart1985 | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:Modern_luxury_living_room_with_kitchen_interior.jpg | `public/sites-demo/lestraque/attributions.json:2578` |
| `tasseaux-cloison` | 480, 780 | faqPhoto | / | Shixart1985 | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:Modern_luxury_living_room_with_kitchen_interior.jpg | `public/sites-demo/lestraque/attributions.json:3010` |
| `tournage-copeaux` | 480, 720, 960, 1600 | etapesPhoto, prestationsPhotos.escalier | / /menuisier-rennes/ /menuisier-cesson-sevigne/ /menuisier-bruz/ /menuisier-saint-gregoire/ | Bertrand from Paris, France | CC BY 2.0 | oui | https://commons.wikimedia.org/wiki/File:Woodturning_Indonesia.jpg | `public/sites-demo/lestraque/attributions.json:2002` |
| `video/atelier.av1.mp4 + video/atelier.h264.mp4` | — | video | — | Marco Lopez | Mixkit Stock Video Free License | oui | https://mixkit.co/free-stock-video/carpenter-sanding-a-piece-of-lumber-776/ | `public/sites-demo/lestraque/video/attributions.json:4` |
| `eclate/assemble.avif` | — | rendu | — | Presti | rendu procédural, sans œuvre tierce | — | — | `public/sites-demo/lestraque/eclate/attributions.json:2` |
| `eclate/eclate.avif` | — | rendu | — | Presti | rendu procédural, sans œuvre tierce | — | — | `public/sites-demo/lestraque/eclate/attributions.json:3` |
| `eclate/calque-limon.avif` | — | rendu | — | Presti | rendu procédural, sans œuvre tierce | — | — | `public/sites-demo/lestraque/eclate/attributions.json:4` |
| `eclate/calque-marche.avif` | — | rendu | — | Presti | rendu procédural, sans œuvre tierce | — | — | `public/sites-demo/lestraque/eclate/attributions.json:5` |
| `eclate/calque-contremarche.avif` | — | rendu | — | Presti | rendu procédural, sans œuvre tierce | — | — | `public/sites-demo/lestraque/eclate/attributions.json:6` |
| `eclate/calque-vis.avif` | — | rendu | — | Presti | rendu procédural, sans œuvre tierce | — | — | `public/sites-demo/lestraque/eclate/attributions.json:7` |
| `eclate/releve.avif` | — | rendu | — | Presti | rendu procédural, sans œuvre tierce | — | — | `public/sites-demo/lestraque/eclate/attributions.json:8` |

## 3. Accueil — ordre d’émission

Concaténation : `public/sites-demo/generer.mjs:711` ; boucle des scènes : `public/sites-demo/generer.mjs:687-701` ; l’ordre du corps suit contenu.json ; deux voisines jamais sur le même fond (`public/sites-demo/generer.mjs:164`).

| # | Section (racine rendue) | Fond | Gabarit | Données | Variantes | Crochets | Familles |
|---|---|---|---|---|---|---|---|
| 0 | `header.nav` + `div.voile` + `div.panneau` | — | `public/sites-demo/generer.mjs:459` | site.nom, site.telephone, site.devis (pilule « Devis »), da.monogramme (marque SVG) | nav--claire `public/sites-demo/generer.mjs:435` | — | — |
| 1 | `section.hero.hero--plein` dans `div.ouverture` | photo | `public/sites-demo/generer.mjs:673` | contenu.json → pages["/"].h1 ; contenu.json → pages["/"].h1Ligne (obligatoire) ; contenu.json → pages["/"].chapeau ; da.heros (photo paysage) / da.herosMobile (4:5 sous 768 px) ; da.relief (photo, profondeur, oeil, texture, calme, lumiereCss, descente) | hero--plein (`public/sites-demo/generer.mjs:667`) ; hero--aplat (`public/sites-demo/generer.mjs:676`) ; hero--scinde (`public/sites-demo/generer.mjs:677`) ; data-relief-* (`public/sites-demo/generer.mjs:655`) | herosMedia → (aucune implémentation) | — |
| 2 | `section.plateau` | noir | `public/sites-demo/generer.mjs:641` | site.artisan.citation ; site.artisan.prenom + nom ; site.artisan.installation (+ ville = site.communes[0]) ; site.artisan.parcours ; site.plateau.chiffres[3] { valeur, unite, legende } ; da.plateauPhoto | sans plateau (`public/sites-demo/generer.mjs:643`) ; avec .plateau__photo (`public/sites-demo/generer.mjs:647`) | plateauCitation → `public/sites-demo/_kit/familles/recit.mjs:15` ; plateauValeur → `public/sites-demo/_kit/familles/recit.mjs:22` | — |
| 3 | `section.scene.scene--papier.scene--presta#prestations` | papier | `public/sites-demo/generer.mjs:544` | section genre « prestations » : h2 ; blocs : p avant le 1er h3 = intro ; h3 + p = items ; da.prestationsPhotos { fragment du h3 → base \| { base, position } } ; da.kickers (surtitre si « prestations » y figure) | scène (da.scenes) (`public/sites-demo/generer.mjs:687`) ; section classique + prestaListe (`public/sites-demo/generer.mjs:716`) ; titre en mots masqués (.ml) (`public/sites-demo/generer.mjs:497`) ; rail aimanté de cartes photo (`public/sites-demo/_kit/kit.css:552`) | — | survol |
| 4 | `section.scene.atelier#atelier` | photo | `public/sites-demo/generer.mjs:549` | section genre « atelier » : h2 + paragraphes ; da.atelier (obligatoire) / da.atelierMobile (9:16) ; attributions → legende de la photo (.atelier__legende) | vidéo d’atelier (famille video) (`public/sites-demo/_kit/familles/video.js:9`) | atelierPhrase → `public/sites-demo/_kit/familles/recit.mjs:28` | recit, video, telephone |
| 5 | `section.section.section--noir.scene--galerie#realisations` | noir | `public/sites-demo/generer.mjs:557` | section genre « galerie » : h2 + intro ; da.galerie (exactement 4 bases, toutes dans da.ouvrages) ; attributions → legende, auteur, licence, modifiee (ligne de crédits groupée) ; da.creditsGroupes | travelling épinglé + compteur 01/0n (`public/sites-demo/generer.mjs:570`) ; galerie--rangee (trois ouvrages) (`public/sites-demo/generer.mjs:571`) ; galerie__item--portrait (`public/sites-demo/generer.mjs:513`) ; crédits dans chaque légende (`public/sites-demo/generer.mjs:515`) | — | — |
| 6 | `section.scene.scene--papier.scene--communes#communes` | papier | `public/sites-demo/generer.mjs:573` | section genre « communes » : h2 + intro (les h3 ne sont pas imprimés) ; site.communes + site.pages (lien si une page commune existe) | liste monumentale deux colonnes (bureau), trois voisines sur trois colonnes (`public/sites-demo/_kit/kit.css:904`) ; lien « Retour à l’accueil » (`public/sites-demo/generer.mjs:573`) | — | — |
| 7 | `section.section.section--noir#etapes` | noir | `public/sites-demo/generer.mjs:520` | section genre « etapes » : h2, intro, items h3 + p (≥ 2) ; da.noires contient « etapes » → section--noir ; da.etapesMonumentales (--k, --e, --ne) ; da.etapesPhoto (remplacée par la figure eclate) ; site.devis.projets (« Escalier »), site.communes[0], site.devis.delais[0] → fiche de l’éclaté ; lestraque/eclate/eclate.json + releve.json | numéros monumentaux + jauge (`public/sites-demo/generer.mjs:531`) ; « Étape 0n » en surtitre (`public/sites-demo/generer.mjs:524`) ; figure éclatée à la place de la photo (`public/sites-demo/generer.mjs:531`) ; étapes épinglées (300 → 450 svh) (`public/sites-demo/_kit/kit.css:1111`) ; rail aimanté de cartes (`public/sites-demo/_kit/kit.css:779`) | etapesMedia → `public/sites-demo/_kit/familles/eclate.mjs:98` | eclate, telephone |
| 8 | `section.scene.scene--papier.scene--faq#questions` | papier | `public/sites-demo/generer.mjs:579` | section genre « faq » : h2, intro, items h3 → <summary> + p ; da.faqPhoto | première question ouverte (`public/sites-demo/_kit/kit.js:260`) ; faq classique (entete + .faq) (`public/sites-demo/generer.mjs:724`) | — | — |
| 9 | `section.contact.contact--photo.contact--matiere#contact` | photo | `public/sites-demo/generer.mjs:611` | section genre « contact » : h2 = titre, p (hors adresse et horaires) = textes ; textes et items → infos Adresse / Horaires (+ « sur rendez-vous ») / Email ; Intervention = site.communes ; site.devis.projets / delais / rappel ; site.communes (+ « Autre commune ») ; site.demo ; étapes de l’accueil (items après le 1er) → « La suite » ; site.telephone (une fois) ; da.contactPhoto { base, position } (sinon le héros) | contact--photo (`public/sites-demo/generer.mjs:619`) ; contact--matiere (`public/sites-demo/generer.mjs:707`) ; contact--long (`public/sites-demo/generer.mjs:619`) ; bande sans formulaire (bouton d’appel) (`public/sites-demo/generer.mjs:623`) ; état « Demande reçue » (data-demo) (`public/sites-demo/_kit/kit.js:267`) | — | — |
| 10 | `footer.pied` | papier | `public/sites-demo/generer.mjs:474` | site.nom, da.label, site.communes[0], site.telephone, site.siren, site.decennale.assureur, site.decennale.numero, site.communes (+ pages), site.pages (metier), site.demo | pied--nuit jamais appelé | — | — |

Classes lues dans le HTML rendu, par section :

- **hero** (`public/sites-demo/lestraque/index.html:42:30`, dans .ouverture) — classes : `bouton` `bouton__cercle` `chapeau` `h1__cle` `h1__ligne` `h1__ligne-in` `hero` `hero--plein` `hero__actions` `hero__contenu` `hero__media` `hero__pied` `mot` ; data : `data-nav` `data-relief` `data-relief-calme` `data-relief-descente` `data-relief-fil` `data-relief-lumiere-css` `data-relief-oeil` `data-relief-profondeur` `data-relief-texture` ; variables inline : `--i` ; photos : heros-escalier, heros-escalier-portrait
- **plateau** (`public/sites-demo/lestraque/index.html:42:2476`, dans .ouverture) — classes : `chiffre` `chiffre__compte` `chiffre__unite` `chiffre__valeur` `chiffre__vrai` `chiffres` `citation__mot` `plateau` `plateau__citation` `plateau__haut` `plateau__inner` `plateau__parcours` `plateau__photo` `plateau__signe` `reveal` ; data : `data-nav` ; variables inline : `--i` ; photos : mains-noyer
- **prestations** (`public/sites-demo/lestraque/index.html:42:5316`) — classes : `h2--scene` `ml` `ml__in` `presta` `presta__jauge` `presta__ligne` `presta__num` `presta__texte` `presta__vignette` `reveal` `scene` `scene--papier` `scene--presta` `scene-large` `scene__tete` `scene__tete--deux` ; data : `data-nav` ; variables inline : `--i` ; photos : tournage-copeaux, penderie, reserve-bibliotheque, atelier-poncage, reserve-cuisine-poutres, boiserie
- **atelier** (`public/sites-demo/lestraque/index.html:42:12650`) — classes : `atelier` `atelier__contenu` `atelier__legende` `atelier__media` `atelier__phrase` `atelier__titre` `atelier__verbe` `ml` `ml__in` `reveal` `scene` ; data : `data-nav` ; variables inline : `--i` ; photos : atelier-poncage-portrait, atelier-poncage
- **realisations** (`public/sites-demo/lestraque/index.html:42:14538`) — classes : `compteur` `compteur__fenetre` `compteur__piste` `compteur__total` `galerie` `galerie--scene` `galerie__cadre` `galerie__credits` `galerie__item` `galerie__item--portrait` `galerie__jauge` `galerie__n` `galerie__tete` `h2--scene` `ml` `ml__in` `reveal` `scene--galerie` `scene-large` `scene__tete` `section` `section--noir` `travelling` `travelling__credits` `travelling__epingle` `travelling__fenetre` ; data : `data-nav` ; variables inline : `--i` `--n` ; photos : reserve-bibliotheque, reserve-cuisine-poutres, penderie, heros-escalier
- **communes** (`public/sites-demo/lestraque/index.html:42:20046`) — classes : `commune` `communes` `conteneur` `ml` `ml__in` `reveal` `scene` `scene--communes` `scene--papier` `scene__tete` `scene__tete--deux` ; data : — ; variables inline : `--i` ; photos : —
- **etapes** (`public/sites-demo/lestraque/index.html:42:21653`) — classes : `compteur__fenetre` `compteur__piste` `compteur__total` `conteneur` `eclate` `eclate__assemble` `eclate__calque` `eclate__champ` `eclate__compteur` `eclate__cote` `eclate__cote-entaille` `eclate__eclate` `eclate__etiquette` `eclate__fiche` `eclate__filet` `eclate__legende` `eclate__libelle` `eclate__ligne` `eclate__numero` `eclate__pastille` `eclate__phrase` `eclate__point` `eclate__releve` `eclate__rendu` `eclate__texte` `eclate__tiret` `eclate__trait` `eclate__valeur` `etape` `etape__corps` `etape__num` `etapes` `etapes__jauge` `etapes__liste` `etapes__photo` `etapes__tete` `ml` `ml__in` `mono` `reveal` `section` `section--noir` ; data : `data-nav` ; variables inline : `--ax` `--ca` `--ch` `--cl` `--cx` `--cy` `--dx` `--dy` `--e` `--i` `--k` `--ne` `--o` `--r` `--rx` `--ry` `--vx` `--vy` ; photos : —
- **questions** (`public/sites-demo/lestraque/index.html:42:29546`) — classes : `faq` `faq-scene` `faq-scene__droite` `faq-scene__intro` `faq-scene__photo` `faq-scene__tete` `faq__corps` `ml` `ml__in` `reveal` `scene` `scene--faq` `scene--papier` `scene-large` ; data : `data-nav` ; variables inline : `--i` ; photos : tasseaux-cloison
- **contact** (`public/sites-demo/lestraque/index.html:42:31632`) — classes : `bande__infos` `bande__ligne` `bande__tel` `bouton` `bouton__cercle` `contact` `contact--matiere` `contact--photo` `contact__infos` `contact__inner` `contact__media` `contact__tete` `devis` `devis__champ` `devis__champ--large` `devis__encore` `devis__envoi` `devis__form` `devis__merci` `devis__merci-rappel` `devis__merci-titre` `devis__note` `devis__note--merci` `devis__recap` `devis__suite` `devis__suite-titre` `ml` `ml__in` `mono` `reveal` ; data : `data-champ` `data-demo` `data-nav` ; variables inline : `--i` ; photos : boiserie

Formulaire de devis : `projet` select (requis) « Votre projet » ← site.devis.projets (`public/sites-demo/generer.mjs:587`) · `commune` select « Commune » ← site.communes + « Autre commune » (cible présélectionnée) (`public/sites-demo/generer.mjs:588`) · `delai` select « Quand » ← site.devis.delais (`public/sites-demo/generer.mjs:589`) · `message` textarea (3 lignes) « La pièce, l’usage, le bois » ← saisie (`public/sites-demo/generer.mjs:590`) · `contact` text, autocomplete tel (requis) « Téléphone ou e-mail » ← saisie (`public/sites-demo/generer.mjs:591`)

Page commune : bandeau (héros plein cadre commune) · prestations (items) · galerie en rangée de 3 ouvrages · communes voisines + retour · contact sur la photo du bandeau · pied (`public/sites-demo/generer.mjs:734`). Pages légales : hero--page (fil d’Ariane, h1, chapeau) · section > .prose (h2, p, h3) · crédits (#credits) sur les mentions légales · pied (`public/sites-demo/generer.mjs:829`).

## 4. Jetons

### da.json — une ligne par direction

| Entrée | accent | accentTexte | fond | fond2 | encre | encre2 | ligne | display / texte | graisse | rayon | hero | texture | origine |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| plombier | #1E6FA8 | #1E6FA8 | #F6F8FA | #FFFFFF | #10233A | #4A5F76 | #DCE4EC | Manrope / Manrope | (700) | 14px | plein | aucune | `public/sites-demo/_kit/da.json:3` |
| electricien | #E8B93B | #E8B93B | #0F1115 | #171A21 | #F3F4F6 | #A6ACBA | rgba(255,255,255,.11) | Space Grotesk / IBM Plex Sans | (700) | 6px | scinde | grain | `public/sites-demo/_kit/da.json:4` |
| chauffagiste | #D2622A | #B04D1B | #FBF7F2 | #FFFFFF | #2B1D14 | #6B5A4E | #EADFD3 | Newsreader / IBM Plex Sans | 500 | 10px | plein | aucune | `public/sites-demo/_kit/da.json:5` |
| macon | #8A8177 | #5E564D | #EFEBE4 | #F7F4EF | #1E1B18 | #5B554F | #D9D3CA | Archivo Narrow / IBM Plex Sans | (700) | 0px | scinde | grain | `public/sites-demo/_kit/da.json:6` |
| menuisier | #A9743F | #7F5326 | #F7F1E6 | #FFFBF4 | #2A1E12 | #6A5A48 | #E6DCCB | Fraunces / Fraunces | 500 | 6px | scinde | papier | `public/sites-demo/_kit/da.json:7` |
| lestraque | #A9743F | #7F5326 | #F4EDE2 | #FBF6EE | #1F160E | #5E4E3E | #E2D6C4 | Fraunces / IBM Plex Sans | 400 | 4px | plein | papier | `public/sites-demo/_kit/da.json:8` |
| peintre | #C2543F | #A8432F | #FFFDFB | #FAF4F1 | #1C1A1A | #5F5757 | #ECE3DF | Instrument Serif / Manrope | 400 | 20px | aplat | aucune | `public/sites-demo/_kit/da.json:9` |
| carreleur | #3C6E63 | #3C6E63 | #F4F6F5 | #FFFFFF | #14201D | #4D5D59 | #D8E0DD | Manrope / Manrope | (700) | 2px | scinde | aucune | `public/sites-demo/_kit/da.json:10` |
| couvreur | #6B4A3A | #6B4A3A | #F1EDE8 | #F8F5F1 | #1D1714 | #5C524C | #DDD5CC | Archivo Narrow / IBM Plex Sans | (700) | 0px | plein | grain | `public/sites-demo/_kit/da.json:11` |
| serrurier | #35506B | #35506B | #F5F7F9 | #FFFFFF | #0F1A26 | #4A5A6B | #D9E0E7 | Syne / Manrope | (700) | 2px | scinde | aucune | `public/sites-demo/_kit/da.json:12` |
| paysagiste | #4A7B3F | #3E6A34 | #F6F7F1 | #FFFFFF | #1B2416 | #55604F | #DDE2D5 | Lora / IBM Plex Sans | (700) | 24px | plein | papier | `public/sites-demo/_kit/da.json:13` |
| generique | #3B4E63 | #3B4E63 | #F7F8FA | #FFFFFF | #141A22 | #4E5A68 | #DCE1E8 | Manrope / Manrope | (700) | 10px | plein | aucune | `public/sites-demo/_kit/da.json:14` |

Lestraque effective (fusion `public/sites-demo/generer.mjs:282`) : `label`=Menuisier (lestraque) · `labelPluriel`=menuiserie (lestraque) · `accent`=#A9743F (lestraque) · `accentTexte`=#7F5326 (lestraque) · `fond`=#F4EDE2 (lestraque) · `fond2`=#FBF6EE (lestraque) · `encre`=#1F160E (lestraque) · `encre2`=#5E4E3E (lestraque) · `ligne`=#E2D6C4 (lestraque) · `rayon`=4px (lestraque) · `display`=Fraunces (lestraque) · `texte`=IBM Plex Sans (lestraque) · `texture`=papier (lestraque) · `hero`=plein (lestraque) · `filigrane`= (lestraque) · `grain`=.06 (lestraque) · `graisse`=400 (lestraque) · `approche`=-0.035em (lestraque) · `ombre`=0 40px 80px -40px rgba(31,22,14,.45) (lestraque) · `etapesMonumentales`=true (lestraque) · `communesMonumentales`=true (lestraque) · `creditsGroupes`=true (lestraque) · `navRetenue`=true (lestraque) · `signature`=true (lestraque) · `familles`=["recit","video","survol","eclate","tele… (lestraque) · `heros`=heros-escalier (lestraque) · `herosMobile`=heros-escalier-portrait (lestraque) · `galerie`=["reserve-bibliotheque","reserve-cuisine… (lestraque) · `plateauPhoto`=mains-noyer (lestraque) · `etapesPhoto`=tournage-copeaux (lestraque) · `faqPhoto`=tasseaux-cloison (lestraque) · `contactPhoto`={"base":"boiserie","position":"85% 40%"} (lestraque) · `noires`=["galerie","etapes"] (lestraque) · `sansAlt`=true (lestraque) · `graisseLigne`=300 (lestraque) · `texteStatiques`=[400,600] (lestraque) · `displayStatiques`=[300,400,600] (lestraque) · `displayPrecharge`=[300,400] (lestraque) · `graisseMarque`=400 (lestraque) · `monogramme`=lestraque (lestraque) · `scenes`=true (lestraque) · `relief`={"photo":"heros-escalier","profondeur":"… (lestraque) · `atelier`=atelier-poncage (lestraque) · `atelierMobile`=atelier-poncage-portrait (lestraque) · `ouvrages`=["heros-escalier","reserve-bibliotheque"… (lestraque) · `prestationsPhotos`={"escalier":"tournage-copeaux","dressing… (lestraque) · `kickers`=["etapes","contact"] (lestraque) · `photosCommunes`=["heros-escalier","reserve-cuisine-tasse… (lestraque).

Variables :root écrites par `public/sites-demo/generer.mjs:360`, rendues `public/sites-demo/lestraque/styles.css:7` : `--accent`←accent, `--accent-texte`←accentTexte, `--fond`←fond, `--fond-2`←fond2, `--encre`←encre, `--encre-2`←encre2, `--ligne`←ligne, `--rayon`←rayon, `--police-display`←display, `--police-texte`←texte, `--graisse-titre`←graisse, `--graisse-ligne`←graisseLigne, `--graisse-marque`←graisseMarque, `--approche-titre`←approche, `--ombre`←ombre, `--grain`←grain, `--grain-mode`←grainMode, `--motif`←motif.

Surcharges de scène (variables redéfinies sur les fonds sombres) : `.section--sombre` --fond=#1F160E (`public/sites-demo/_kit/kit.css:272`) · `.section--sombre` --fond-2=#2A1F15 (`public/sites-demo/_kit/kit.css:272`) · `.section--sombre` --encre=#F4EDE2 (`public/sites-demo/_kit/kit.css:272`) · `.section--sombre` --encre-2=rgba(244,237,226,.8) (`public/sites-demo/_kit/kit.css:272`) · `.section--sombre` --ligne=rgba(244,237,226,.14) (`public/sites-demo/_kit/kit.css:272`) · `.section--noir` --fond=#14110E (`public/sites-demo/_kit/kit.css:468`) · `.section--noir` --fond-2=#221A13 (`public/sites-demo/_kit/kit.css:468`) · `.section--noir` --encre=#F4EDE2 (`public/sites-demo/_kit/kit.css:468`) · `.section--noir` --encre-2=rgba(244,237,226,.74) (`public/sites-demo/_kit/kit.css:468`) · `.section--noir` --ligne=rgba(244,237,226,.16) (`public/sites-demo/_kit/kit.css:468`) · `.section--noir` --accent-texte=#D4A574 (`public/sites-demo/_kit/kit.css:468`) · `.contact` --encre=#F4EDE2 (`public/sites-demo/_kit/kit.css:480`) · `.contact` --encre-2=rgba(244,237,226,.76) (`public/sites-demo/_kit/kit.css:480`) · `.contact` --ligne=rgba(244,237,226,.16) (`public/sites-demo/_kit/kit.css:480`) · `.pied--nuit` --ligne=rgba(244,237,226,.14) (`public/sites-demo/_kit/kit.css:682`) · `.pied--nuit` --encre=#F4EDE2 (`public/sites-demo/_kit/kit.css:682`) · `.pied--nuit` --encre-2=rgba(244,237,226,.72) (`public/sites-demo/_kit/kit.css:682`) · `.pied--nuit` --accent=#D4A574 (`public/sites-demo/_kit/kit.css:682`).

Taille du titre display (`--h1-ligne`) : 19vw sur `.hero--plein h1` (`public/sites-demo/_kit/kit.css:327`) · 14.2vw sur `.hero--plein h1` @media(min-width:768px) (`public/sites-demo/_kit/kit.css:328`) · 15vw sur `.hero--commune h1` (`public/sites-demo/_kit/kit.css:425`) · 8.5vw sur `.hero--commune h1` @media(min-width:768px) (`public/sites-demo/_kit/kit.css:427`) · max(32.5vw,121px) sur `.hero--plein:not(.hero--commune) h1` @media(max-width:767px) and (min-height:560px) (`public/sites-demo/_kit/kit.css:440`) · 21vw sur `.hero--plein:not(.hero--commune) h1` @media(min-width:768px) and (max-width:1023px) (`public/sites-demo/_kit/kit.css:447`) · min(14.2vw,24vh) sur `.hero--plein h1` @media(max-height:559px) and (orientation:landscape) (`public/sites-demo/_kit/kit.css:449`) · max(30vw,112px) sur `.hero--plein:not(.hero--commune) h1` @media(max-width:767px) and (min-height:560px) (`public/sites-demo/_kit/kit.css:935`).

### Échelle typographique (kit.css + familles, sélection des titres)

| Sélecteur | Contexte | font-size | line-height | letter-spacing | origine |
|---|---|---|---|---|---|
| `body` | — | 1.0625rem | 1.6 |  | `public/sites-demo/_kit/kit.css:7` |
| `h1` | — | clamp(2.6rem,6.4vw,5.6rem) |  |  | `public/sites-demo/_kit/kit.css:18` |
| `h2` | — | clamp(2rem,4.2vw,3.5rem) |  |  | `public/sites-demo/_kit/kit.css:19` |
| `h3` | — | clamp(1.2rem,1.6vw,1.45rem) | 1.2 | -0.01em | `public/sites-demo/_kit/kit.css:20` |
| `.mono` | — | .74rem |  | .16em | `public/sites-demo/_kit/kit.css:26` |
| `.chapeau` | — | clamp(1.1rem,1.5vw,1.3rem) | 1.5 |  | `public/sites-demo/_kit/kit.css:34` |
| `.carte .mono` | — | .7rem |  |  | `public/sites-demo/_kit/kit.css:141` |
| `.etape .mono` | — | .68rem |  |  | `public/sites-demo/_kit/kit.css:185` |
| `.commune` | — | clamp(1.4rem,2.6vw,2.1rem) |  | -.02em | `public/sites-demo/_kit/kit.css:190` |
| `.faq summary` | — | clamp(1.1rem,1.7vw,1.35rem) | 1.3 | -.01em | `public/sites-demo/_kit/kit.css:200` |
| `.faq summary::after` | — | 1.9rem | 1 |  | `public/sites-demo/_kit/kit.css:203` |
| `.bande h2` | — | clamp(2.2rem,5vw,4.2rem) |  |  | `public/sites-demo/_kit/kit.css:214` |
| `.prose h2` | — | clamp(1.6rem,3vw,2.4rem) |  |  | `public/sites-demo/_kit/kit.css:238` |
| `.da--etapes .etape__num` | — | clamp(7vw,6rem + 2vw,9vw) | .8 | -.05em | `public/sites-demo/_kit/kit.css:289` |
| `.da--etapes .etape h3` | — | clamp(1.45rem,2.2vw,2.1rem) | 1.1 | -.02em | `public/sites-demo/_kit/kit.css:292` |
| `.da--etapes .etape__num` | @media(max-width:759px) | 18vw |  |  | `public/sites-demo/_kit/kit.css:294` |
| `.da--communes #communes .commune` | — | clamp(7vw,4rem + 2.5vw,9vw) | .9 | -.04em | `public/sites-demo/_kit/kit.css:303` |
| `.hero--plein h1` | — | var(--h1-ligne) | .88 | -.045em | `public/sites-demo/_kit/kit.css:327` |
| `.h1__cle` | — | clamp(.78rem,.9vw,.95rem) | 1.3 | .2em | `public/sites-demo/_kit/kit.css:330` |
| `.hero--plein .chapeau` | — | 1rem | 1.5 |  | `public/sites-demo/_kit/kit.css:334` |
| `.plateau__citation p` | — | clamp(2.1rem,4vw,4rem) | 1.08 | -.03em | `public/sites-demo/_kit/kit.css:355` |
| `.chiffre__valeur` | — | 26vw |  | -.055em | `public/sites-demo/_kit/kit.css:364` |
| `.chiffre__valeur` | @media(min-width:768px) | 11vw |  |  | `public/sites-demo/_kit/kit.css:371` |
| `.h2--scene` | — | clamp(2.9rem,7.4vw,8.5rem) | .92 | -.04em | `public/sites-demo/_kit/kit.css:376` |
| `.devis__merci-titre` | — | clamp(2.2rem,4vw,3.4rem) | 1 | -.03em | `public/sites-demo/_kit/kit.css:417` |
| `.hero--plein:not(.hero--commune) .chapeau` | @media(max-width:767px) and (min-height:560px) | 15px |  |  | `public/sites-demo/_kit/kit.css:441` |
| `.presta__num` | — | clamp(2.4rem,5.4vw,6.2rem) | .8 | -.05em | `public/sites-demo/_kit/kit.css:457` |
| `.presta__ligne h3` | — | clamp(1.55rem,3vw,3.3rem) | 1.02 | -.03em | `public/sites-demo/_kit/kit.css:458` |
| `.contact__tete h2` | — | clamp(2.3rem,10vw,4rem) | .95 | -.04em | `public/sites-demo/_kit/kit.css:484` |
| `.contact__tete h2` | @media(min-width:900px) | clamp(3rem,5.2vw,6.5rem) |  |  | `public/sites-demo/_kit/kit.css:496` |
| `.devis__merci-titre` | — | clamp(2.6rem,5.4vw,5.6rem) |  |  | `public/sites-demo/_kit/kit.css:500` |
| `.scene--presta .presta__num` | @media(min-width:900px) | clamp(3.4rem,6.2vw,8rem) |  |  | `public/sites-demo/_kit/kit.css:538` |
| `.scene--presta .presta__ligne h3` | @media(min-width:900px) | clamp(1.9rem,3.05vw,4rem) | 1 |  | `public/sites-demo/_kit/kit.css:539` |
| `.scene--presta .presta__num` | @media(max-width:767px) | 18vw | .8 |  | `public/sites-demo/_kit/kit.css:557` |
| `.scene--presta .presta__ligne h3` | @media(max-width:767px) | 1.8rem | 1.05 |  | `public/sites-demo/_kit/kit.css:558` |
| `.atelier__titre` | — | 18vw | .86 | -.05em | `public/sites-demo/_kit/kit.css:576` |
| `.atelier__phrase` | — | clamp(1.35rem,2.2vw,2.3rem) | 1.18 | -.015em | `public/sites-demo/_kit/kit.css:577` |
| `.atelier__titre` | @media(min-width:768px) | 12.5vw |  |  | `public/sites-demo/_kit/kit.css:579` |
| `.da--communes #communes.scene--communes .commune` | — | min(clamp(7vw,4rem + 2.5vw,9vw),12.4svh) |  |  | `public/sites-demo/_kit/kit.css:656` |
| `.faq-scene__tete h2` | — | clamp(2.5rem,5.4vw,6.4rem) | .92 | -.04em | `public/sites-demo/_kit/kit.css:661` |
| `.contact--photo .contact__tete h2` | — | clamp(2.9rem,14vw,4.5rem) |  |  | `public/sites-demo/_kit/kit.css:673` |
| `.contact--photo .contact__tete h2` | @media(min-width:900px) | 10.4vw | .86 | -.05em | `public/sites-demo/_kit/kit.css:679` |
| `.contact--photo.contact--long .contact__tete h2` | @media(min-width:900px) | 7.2vw |  |  | `public/sites-demo/_kit/kit.css:680` |
| `.plateau__citation p` | @media(max-width:767px) | clamp(1.8rem,8vw,2.2rem) |  |  | `public/sites-demo/_kit/kit.css:715` |
| `.chiffre__valeur` | @media(max-width:767px) | 17vw |  |  | `public/sites-demo/_kit/kit.css:721` |
| `.scene--presta .presta__num` | @media(max-width:767px) | 15vw |  |  | `public/sites-demo/_kit/kit.css:730` |
| `.travelling .galerie__tete .h2--scene` | @media(min-width:1024px) and (prefers-reduced-motion:no-preference) ›  | clamp(2.6rem,5.2vw,6.4rem) |  |  | `public/sites-demo/_kit/kit.css:756` |
| `.da--etapes .etape__num` | @media(max-width:759px) | 18vw |  |  | `public/sites-demo/_kit/kit.css:782` |
| `.plateau__citation p` | @media(max-width:767px) | clamp(2rem,9.2vw,2.5rem) |  |  | `public/sites-demo/_kit/kit.css:842` |
| `.da--communes #communes.scene--communes .commune` | @media(max-width:759px) | 11.5vw | .95 |  | `public/sites-demo/_kit/kit.css:853` |
| `#communes h2,.etapes__tete h2,.faq-scene__tete h2` | @media(min-width:960px) | clamp(2.9rem,7.4vw,8.5rem) | .92 | -.04em | `public/sites-demo/_kit/kit.css:893` |
| `.da--communes #communes.scene--communes .commune` | @media(min-width:900px) | min(5.2vw,10.5svh) | .9 |  | `public/sites-demo/_kit/kit.css:901` |
| `.da--communes #communes.scene--communes .communes:has(>:nth-child(3):last-child) .commune` | @media(min-width:900px) | min(3.6cqi,9svh) |  |  | `public/sites-demo/_kit/kit.css:905` |
| `.contact--photo .contact__tete h2` | @media(min-width:900px) | 8.6vw |  |  | `public/sites-demo/_kit/kit.css:917` |
| `.contact--photo.contact--long .contact__tete h2` | @media(min-width:900px) | 7vw |  |  | `public/sites-demo/_kit/kit.css:918` |
| `.travelling .galerie__tete .h2--scene` | @media(min-width:1024px) and (prefers-reduced-motion:no-preference) ›  | clamp(2.9rem,7vw,8rem) |  |  | `public/sites-demo/_kit/kit.css:962` |
| `.travelling .galerie__tete .h2--scene` | @media(min-width:1024px) and (prefers-reduced-motion:no-preference) ›  | clamp(2.9rem,7.4vw,8.5rem) |  |  | `public/sites-demo/_kit/kit.css:1032` |
| `.da--etapes #etapes .etape__num` | @media(min-width:1024px) and (prefers-reduced-motion:no-preference) ›  | min(clamp(7vw,6rem + 2vw,9vw),12svh) |  |  | `public/sites-demo/_kit/kit.css:1118` |
| `#etapes:has(.eclate) .etapes__tete h2` | @media (min-width:1024px) and (min-height:680px) and (prefers-reduced- | clamp(2.75rem,calc((min(90cqw,1720px) - var(--eclate-liste) - var(--eclate-gap)) / 7.4),6rem) |  |  | `public/sites-demo/_kit/familles/eclate.bureau.css:25` |

### Mouvement

| Courbe | n | premières origines |
|---|---|---|
| `linear` | 60 | `public/sites-demo/_kit/kit.css:179`, `public/sites-demo/_kit/kit.css:563`, `public/sites-demo/_kit/kit.css:582` |
| `cubic-bezier(.16,1,.3,1)` | 39 | `public/sites-demo/_kit/kit.css:43`, `public/sites-demo/_kit/kit.css:48`, `public/sites-demo/_kit/kit.css:67` |
| `ease` | 24 | `public/sites-demo/_kit/kit.css:37`, `public/sites-demo/_kit/kit.css:48`, `public/sites-demo/_kit/kit.css:59` |
| `cubic-bezier(.23,1,.32,1)` | 5 | `public/sites-demo/_kit/kit.css:59`, `public/sites-demo/_kit/kit.css:60`, `public/sites-demo/_kit/kit.css:63` |
| `cubic-bezier(.2,.7,.2,1)` | 4 | `public/sites-demo/_kit/kit.css:1072`, `public/sites-demo/_kit/kit.css:1209`, `public/sites-demo/_kit/kit.css:1210` |
| `cubic-bezier(.45,0,.55,1)` | 4 | `public/sites-demo/_kit/kit.css:322`, `public/sites-demo/_kit/kit.css:1156`, `public/sites-demo/_kit/kit.css:1172` |
| `cubic-bezier(.37,0,.63,1)` | 3 | `public/sites-demo/_kit/kit.css:1172`, `public/sites-demo/_kit/kit.css:1176`, `public/sites-demo/_kit/familles/telephone.css:23` |
| `ease-in-out` | 2 | `public/sites-demo/_kit/kit.css:96`, `public/sites-demo/_kit/kit.css:212` |
| `cubic-bezier(.2,.7,.3,1)` | 1 | `public/sites-demo/_kit/familles/eclate.bureau.css:78` |
| `steps(4,jump-none)` | 1 | `public/sites-demo/_kit/familles/eclate.bureau.css:64` |

| Durée | n | premières origines |
|---|---|---|
| `.3s` | 20 | `public/sites-demo/_kit/kit.css:48`, `public/sites-demo/_kit/kit.css:59`, `public/sites-demo/_kit/kit.css:60` |
| `.45s` | 17 | `public/sites-demo/_kit/kit.css:37`, `public/sites-demo/_kit/kit.css:43`, `public/sites-demo/_kit/kit.css:125` |
| `.55s` | 12 | `public/sites-demo/_kit/kit.css:73`, `public/sites-demo/_kit/kit.css:136`, `public/sites-demo/_kit/kit.css:544` |
| `0s` | 11 | `public/sites-demo/_kit/kit.css:59`, `public/sites-demo/_kit/kit.css:60`, `public/sites-demo/_kit/kit.css:63` |
| `.4s` | 9 | `public/sites-demo/_kit/kit.css:48`, `public/sites-demo/_kit/kit.css:73`, `public/sites-demo/_kit/kit.css:76` |
| `240ms` | 7 | `public/sites-demo/_kit/kit.css:59`, `public/sites-demo/_kit/kit.css:60`, `public/sites-demo/_kit/kit.css:63` |
| `.8s` | 6 | `public/sites-demo/_kit/kit.css:345`, `public/sites-demo/_kit/kit.css:346`, `public/sites-demo/_kit/kit.css:1202` |
| `.6s` | 5 | `public/sites-demo/_kit/kit.css:289`, `public/sites-demo/_kit/kit.css:304`, `public/sites-demo/_kit/kit.css:463` |
| `.2s` | 4 | `public/sites-demo/_kit/kit.css:102`, `public/sites-demo/_kit/kit.css:603`, `public/sites-demo/_kit/familles/survol.bureau.css:27` |
| `20s` | 4 | `public/sites-demo/_kit/kit.css:322`, `public/sites-demo/_kit/kit.css:1156`, `public/sites-demo/_kit/kit.css:1172` |
| `.95s` | 3 | `public/sites-demo/_kit/kit.css:250`, `public/sites-demo/_kit/kit.css:339` |
| `.9s` | 3 | `public/sites-demo/_kit/kit.css:104`, `public/sites-demo/_kit/kit.css:546`, `public/sites-demo/_kit/familles/survol.bureau.css:23` |
| `10s` | 3 | `public/sites-demo/_kit/kit.css:1172`, `public/sites-demo/_kit/kit.css:1176`, `public/sites-demo/_kit/familles/telephone.css:23` |
| `.001s` | 2 | `public/sites-demo/_kit/kit.css:261` |

### Couleurs littérales les plus fréquentes (hors da.json)

| Teinte | n | premières origines |
|---|---|---|
| `rgb(244,237,226)` | 80 | `public/sites-demo/_kit/kit.css:50`, `public/sites-demo/_kit/kit.css:272`, `public/sites-demo/_kit/kit.css:279` |
| `rgb(212,165,116)` | 26 | `public/sites-demo/_kit/kit.css:274`, `public/sites-demo/_kit/kit.css:275`, `public/sites-demo/_kit/kit.css:276` |
| `rgb(10,7,4)` | 24 | `public/sites-demo/_kit/kit.css:319`, `public/sites-demo/_kit/kit.css:321`, `public/sites-demo/_kit/kit.css:422` |
| `rgb(255,255,255)` | 22 | `public/sites-demo/_kit/kit.css:52`, `public/sites-demo/_kit/kit.css:53`, `public/sites-demo/_kit/kit.css:54` |
| `rgb(20,17,14)` | 20 | `public/sites-demo/_kit/kit.css:352`, `public/sites-demo/_kit/kit.css:391`, `public/sites-demo/_kit/kit.css:468` |
| `rgb(0,0,0)` | 8 | `public/sites-demo/_kit/kit.css:112`, `public/sites-demo/_kit/kit.css:117`, `public/sites-demo/_kit/kit.css:127` |
| `rgb(31,22,14)` | 6 | `public/sites-demo/_kit/kit.css:50`, `public/sites-demo/_kit/kit.css:272`, `public/sites-demo/_kit/kit.css:277` |
| `rgb(34,26,19)` | 4 | `public/sites-demo/_kit/kit.css:468`, `public/sites-demo/_kit/kit.css:599`, `public/sites-demo/_kit/kit.css:705` |
| `rgb(14,10,7)` | 3 | `public/sites-demo/_kit/kit.css:316`, `public/sites-demo/_kit/kit.css:994`, `public/sites-demo/_kit/kit.css:1084` |
| `rgb(17,17,17)` | 3 | `public/sites-demo/_kit/kit.css:119`, `public/sites-demo/_kit/kit.css:121`, `public/sites-demo/_kit/kit.css:216` |

### Rayons (toutes les valeurs)

| Valeur | n | sélecteurs | origines |
|---|---|---|---|
| `50%` | 9 | `.nav__marque i`, `.burger`, `.bouton__cercle`, `.etape::before` | `public/sites-demo/_kit/kit.css:40`, `public/sites-demo/_kit/kit.css:66`, `public/sites-demo/_kit/kit.css:125`, `public/sites-demo/_kit/kit.css:182` |
| `999px` | 5 | `.nav__devis`, `.hero--scinde .hero__cadre::after`, `.bouton`, `.nav__liens` | `public/sites-demo/_kit/kit.css:48`, `public/sites-demo/_kit/kit.css:112`, `public/sites-demo/_kit/kit.css:124`, `public/sites-demo/_kit/kit.css:993` |
| `var(--rayon)` | 3 | `.hero--scinde .hero__media,.hero--aplat .hero__media`, `.hero--scinde .hero__cadre::before`, `.carte` | `public/sites-demo/_kit/kit.css:109`, `public/sites-demo/_kit/kit.css:111`, `public/sites-demo/_kit/kit.css:136` |
| `2px` | 2 | `.devis__champ input,.devis__champ select,.devis__champ texta`, `#etapes .eclate__rendu .eclate__texte` | `public/sites-demo/_kit/kit.css:407`, `public/sites-demo/_kit/familles/eclate.bureau.css:59` |
| `.1em` | 1 | `.presta__declencheur:focus-visible` | `public/sites-demo/_kit/familles/survol.bureau.css:47` |
| `calc(var(--rayon) + 10px)` | 1 | `.panneau` | `public/sites-demo/_kit/kit.css:73` |
| `calc(var(--rayon) + 12px)` | 1 | `.bande` | `public/sites-demo/_kit/kit.css:210` |
| `var(--rayon) var(--rayon) 0 0` | 1 | `.hero--aplat .hero__media` | `public/sites-demo/_kit/kit.css:117` |

### Ombres (toutes les valeurs)

| Propriété | Valeur | n | origines |
|---|---|---|---|
| box-shadow | `none` | 3 | `public/sites-demo/_kit/kit.css:385`, `public/sites-demo/_kit/kit.css:391`, `public/sites-demo/_kit/kit.css:982` |
| box-shadow | `0 0 0 2px #14110E,0 0 0 3px #D4A574` | 2 | `public/sites-demo/_kit/familles/eclate.bureau.css:57`, `public/sites-demo/_kit/familles/eclate.bureau.css:105` |
| box-shadow | `var(--ombre)` | 2 | `public/sites-demo/_kit/kit.css:109`, `public/sites-demo/_kit/kit.css:138` |
| box-shadow | `0 -2.5rem 5rem -.5rem rgba(10,7,4,.55)` | 1 | `public/sites-demo/_kit/kit.css:1081` |
| box-shadow | `0 -20px 60px -20px rgba(0,0,0,.4)` | 1 | `public/sites-demo/_kit/kit.css:117` |
| box-shadow | `0 0 0 2px rgba(20,17,14,.85)` | 1 | `public/sites-demo/_kit/familles/eclate.css:19` |
| box-shadow | `0 0 0 4px #1F160E` | 1 | `public/sites-demo/_kit/kit.css:277` |
| box-shadow | `0 0 0 4px var(--fond)` | 1 | `public/sites-demo/_kit/kit.css:182` |
| box-shadow | `0 0 0 7px rgba(10,7,4,.55)` | 1 | `public/sites-demo/_kit/familles/video.bureau.css:27` |
| box-shadow | `0 14px 34px -14px rgba(0,0,0,.5)` | 1 | `public/sites-demo/_kit/kit.css:127` |
| box-shadow | `0 1px 0 var(--ligne)` | 1 | `public/sites-demo/_kit/kit.css:51` |
| box-shadow | `inset 0 -1px 0 var(--ligne)` | 1 | `public/sites-demo/_kit/kit.css:980` |
| text-shadow | `0 1px 14px rgba(10,7,4,.5)` | 1 | `public/sites-demo/_kit/kit.css:321` |
| text-shadow | `0 1px 14px rgba(10,7,4,.85)` | 1 | `public/sites-demo/_kit/kit.css:805` |
| text-shadow | `0 1px 18px rgba(10,7,4,.7)` | 1 | `public/sites-demo/_kit/kit.css:692` |
| text-shadow | `0 2px 24px rgba(10,7,4,.55)` | 1 | `public/sites-demo/_kit/kit.css:804` |
| text-shadow | `0 2px 28px rgba(10,7,4,.4)` | 1 | `public/sites-demo/_kit/kit.css:443` |
| text-shadow | `0 2px 30px rgba(10,7,4,.35)` | 1 | `public/sites-demo/_kit/kit.css:576` |
| text-shadow | `0 2px 36px rgba(10,7,4,.35)` | 1 | `public/sites-demo/_kit/kit.css:693` |
| text-shadow | `0 2px 40px rgba(10,7,4,.45)` | 1 | `public/sites-demo/_kit/kit.css:796` |

### Espacements responsives (clamp), par valeur

| Valeur | n | propriétés | origines |
|---|---|---|---|
| `clamp(1.25rem,2.5vw,2.25rem)` | 2 | gap, padding-top | `public/sites-demo/_kit/kit.css:1012`, `public/sites-demo/_kit/kit.css:1049` |
| `clamp(1rem,1.6vw,1.75rem)` | 2 | column-gap | `public/sites-demo/_kit/kit.css:161`, `public/sites-demo/_kit/kit.css:609` |
| `clamp(1rem,2vw,1.75rem)` | 2 | row-gap, margin-bottom | `public/sites-demo/_kit/kit.css:575`, `public/sites-demo/_kit/kit.css:655` |
| `clamp(2.25rem,7vw,3rem)` | 2 | gap | `public/sites-demo/_kit/kit.css:148`, `public/sites-demo/_kit/kit.css:596` |
| `clamp(2rem,4vw,3.5rem)` | 2 | margin-bottom, gap | `public/sites-demo/_kit/kit.css:521`, `public/sites-demo/_kit/kit.css:704` |
| `clamp(2rem,5vw,4rem)` | 2 | margin-bottom, margin-top | `public/sites-demo/_kit/kit.css:30`, `public/sites-demo/_kit/kit.css:158` |
| `0 5vw clamp(1.5rem,3.6vw,3rem)` | 1 | padding | `public/sites-demo/_kit/kit.css:324` |
| `0 clamp(2.5rem,5vw,4rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:629` |
| `calc(-1 * clamp(2rem,6vw,4rem))` | 1 | margin-bottom | `public/sites-demo/_kit/kit.css:117` |
| `calc(-1 * clamp(3.5rem,14vw,4.5rem))` | 1 | margin-bottom | `public/sites-demo/_kit/kit.css:714` |
| `calc(-1 * clamp(4rem,8vw,7.5rem))` | 1 | margin-top | `public/sites-demo/_kit/kit.css:790` |
| `calc(-1 * clamp(4rem,9vw,8rem))` | 1 | margin-top | `public/sites-demo/_kit/kit.css:778` |
| `calc(clamp(4rem,9vw,8rem) + 3.5vw)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:281` |
| `clamp(.5rem,1.5vw,1.25rem)` | 1 | margin-top | `public/sites-demo/_kit/kit.css:787` |
| `clamp(.75rem,2.5vw,2.5rem)` | 1 | gap | `public/sites-demo/_kit/kit.css:303` |
| `clamp(.75rem,2svh,1.25rem)` | 1 | row-gap | `public/sites-demo/_kit/kit.css:754` |
| `clamp(.75rem,2vw,1.5rem)` | 1 | margin-top | `public/sites-demo/_kit/kit.css:768` |
| `clamp(.7rem,1.4vw,1.3rem)` | 1 | gap | `public/sites-demo/_kit/kit.css:327` |
| `clamp(.85rem,1.45vw,1.6rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:537` |
| `clamp(1.1rem,2.2vw,2rem)` | 1 | gap | `public/sites-demo/_kit/kit.css:324` |
| `clamp(1.25rem,2.2vw,2rem)` | 1 | margin-bottom | `public/sites-demo/_kit/kit.css:299` |
| `clamp(1.25rem,2.6vw,2.25rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:288` |
| `clamp(1.25rem,2.6vw,2.75rem)` | 1 | padding-left | `public/sites-demo/_kit/kit.css:370` |
| `clamp(1.25rem,3vw,2.75rem)` | 1 | column-gap | `public/sites-demo/_kit/kit.css:288` |
| `clamp(1.35rem,2.4vw,2.3rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:456` |
| `clamp(1.5rem,2.5vw,2.5rem)` | 1 | row-gap | `public/sites-demo/_kit/kit.css:1015` |
| `clamp(1.5rem,3vw,2.5rem)` | 1 | margin-top | `public/sites-demo/_kit/kit.css:474` |
| `clamp(1.5rem,3vw,3.5rem)` | 1 | column-gap | `public/sites-demo/_kit/kit.css:461` |
| `clamp(1.6rem,4vw,3rem)` | 1 | gap | `public/sites-demo/_kit/kit.css:481` |
| `clamp(1.75rem,4vw,2.5rem)` | 1 | gap | `public/sites-demo/_kit/kit.css:659` |
| `clamp(1rem,1.8vw,1.5rem)` | 1 | padding-top | `public/sites-demo/_kit/kit.css:333` |
| `clamp(1rem,2vw,2rem)` | 1 | padding-right | `public/sites-demo/_kit/kit.css:369` |
| `clamp(1rem,3svh,2.5rem)` | 1 | row-gap | `public/sites-demo/_kit/kit.css:631` |
| `clamp(2.5rem,3.4vw,3rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:654` |
| `clamp(2.5rem,3.5vw,3rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:298` |
| `clamp(2.5rem,5vw,4.5rem)` | 1 | row-gap | `public/sites-demo/_kit/kit.css:675` |
| `clamp(2.5rem,5vw,4rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:29` |
| `clamp(2.5rem,5vw,6rem)` | 1 | column-gap | `public/sites-demo/_kit/kit.css:525` |
| `clamp(2.5rem,6vw,5rem)` | 1 | padding | `public/sites-demo/_kit/kit.css:210` |
| `clamp(2.5rem,6vw,5rem) clamp(3rem,7vw,5.5rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:88` |
| `clamp(2rem,3.5vw,3rem)` | 1 | padding-top | `public/sites-demo/_kit/kit.css:361` |
| `clamp(2rem,4vw,3.25rem)` | 1 | row-gap | `public/sites-demo/_kit/kit.css:609` |
| `clamp(2rem,4vw,3rem)` | 1 | padding-bottom | `public/sites-demo/_kit/kit.css:235` |
| `clamp(2rem,4vw,4rem)` | 1 | column-gap | `public/sites-demo/_kit/kit.css:755` |
| `clamp(3.5rem,14vw,4.5rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:711` |
| `clamp(3.5rem,6.5vw,6.5rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:533` |
| `clamp(3.5rem,6vw,6rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:621` |
| `clamp(3rem,6vw,6.5rem)` | 1 | row-gap | `public/sites-demo/_kit/kit.css:161` |
| `clamp(3rem,6vw,7rem)` | 1 | column-gap | `public/sites-demo/_kit/kit.css:708` |
| `clamp(3rem,7vw,6.5rem)` | 1 | gap | `public/sites-demo/_kit/kit.css:353` |
| `clamp(3rem,7vw,8rem)` | 1 | column-gap | `public/sites-demo/_kit/kit.css:494` |
| `clamp(3rem,7vw,9rem)` | 1 | column-gap | `public/sites-demo/_kit/kit.css:664` |
| `clamp(3rem,8vw,8rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:480` |
| `clamp(4.5rem,10vw,9.5rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:352` |
| `clamp(4rem,10vw,11rem)` | 1 | margin-top | `public/sites-demo/_kit/kit.css:165` |
| `clamp(4rem,8vw,7.5rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:519` |
| `clamp(4rem,9vw,8rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:27` |
| `clamp(5.25rem,11svh,7rem) clamp(1.25rem,4svh,2.5rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:631` |
| `clamp(5.5rem,12vw,11rem) clamp(3rem,6vw,5.5rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:668` |
| `clamp(5.5rem,9vw,8rem)` | 1 | padding-top | `public/sites-demo/_kit/kit.css:915` |
| `clamp(5rem,10svh,6rem) clamp(.75rem,2svh,1.25rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:754` |
| `clamp(6.5rem,13svh,9rem) clamp(1.5rem,3.5vw,2.75rem)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:575` |
| `clamp(6rem,20svh,11rem) 2rem` | 1 | padding-block | `public/sites-demo/_kit/kit.css:805` |
| `min(clamp(1.25rem,2.6vw,2.25rem),2.4svh)` | 1 | padding-block | `public/sites-demo/_kit/kit.css:1117` |

### Variables CSS les plus utilisées

| Variable | utilisations | défauts de repli | premières origines |
|---|---|---|---|
| `--ligne` | 22 | — | `public/sites-demo/_kit/kit.css:51`, `public/sites-demo/_kit/kit.css:66`, `public/sites-demo/_kit/kit.css:136` |
| `--accent` | 20 | — | `public/sites-demo/_kit/kit.css:32`, `public/sites-demo/_kit/kit.css:40`, `public/sites-demo/_kit/kit.css:111` |
| `--police-display` | 19 | — | `public/sites-demo/_kit/kit.css:14`, `public/sites-demo/_kit/kit.css:39`, `public/sites-demo/_kit/kit.css:76` |
| `--i` | 16 | `0` | `public/sites-demo/_kit/kit.css:102`, `public/sites-demo/_kit/kit.css:250`, `public/sites-demo/_kit/kit.css:613` |
| `--encre-2` | 15 | — | `public/sites-demo/_kit/kit.css:33`, `public/sites-demo/_kit/kit.css:34`, `public/sites-demo/_kit/kit.css:142` |
| `--k` | 12 | `0` | `public/sites-demo/_kit/kit.css:289`, `public/sites-demo/_kit/kit.css:290`, `public/sites-demo/_kit/kit.css:529` |
| `--fond` | 11 | — | `public/sites-demo/_kit/kit.css:6`, `public/sites-demo/_kit/kit.css:48`, `public/sites-demo/_kit/kit.css:51` |
| `--encre` | 11 | — | `public/sites-demo/_kit/kit.css:6`, `public/sites-demo/_kit/kit.css:48`, `public/sites-demo/_kit/kit.css:67` |
| `--police-texte` | 10 | — | `public/sites-demo/_kit/kit.css:7`, `public/sites-demo/_kit/kit.css:26`, `public/sites-demo/_kit/kit.css:203` |
| `--graisse-ligne` | 10 | `300` | `public/sites-demo/_kit/kit.css:327`, `public/sites-demo/_kit/kit.css:355`, `public/sites-demo/_kit/kit.css:363` |
| `--fond-2` | 7 | — | `public/sites-demo/_kit/kit.css:28`, `public/sites-demo/_kit/kit.css:66`, `public/sites-demo/_kit/kit.css:69` |
| `--rayon` | 7 | — | `public/sites-demo/_kit/kit.css:73`, `public/sites-demo/_kit/kit.css:109`, `public/sites-demo/_kit/kit.css:111` |
| `--e` | 6 | `0` | `public/sites-demo/_kit/kit.css:1118`, `public/sites-demo/_kit/kit.css:1118`, `public/sites-demo/_kit/kit.css:1119` |
| `--r` | 6 | `0` | `public/sites-demo/_kit/familles/eclate.bureau.css:42`, `public/sites-demo/_kit/familles/eclate.bureau.css:42`, `public/sites-demo/_kit/familles/eclate.bureau.css:55` |
| `--accent-texte` | 5 | — | `public/sites-demo/_kit/kit.css:26`, `public/sites-demo/_kit/kit.css:157`, `public/sites-demo/_kit/kit.css:457` |
| `--avancee` | 4 | `0` `1` | `public/sites-demo/_kit/kit.css:179`, `public/sites-demo/_kit/kit.css:289`, `public/sites-demo/_kit/kit.css:290` |
| `--ne` | 4 | `4` | `public/sites-demo/_kit/kit.css:1118`, `public/sites-demo/_kit/kit.css:1118`, `public/sites-demo/_kit/kit.css:1119` |
| `--p` | 4 | `0` | `public/sites-demo/_kit/kit.css:1209`, `public/sites-demo/_kit/kit.css:1210`, `public/sites-demo/_kit/kit.css:1210` |
| `--eclate-gap` | 3 | — | `public/sites-demo/_kit/familles/eclate.bureau.css:17`, `public/sites-demo/_kit/familles/eclate.bureau.css:20`, `public/sites-demo/_kit/familles/eclate.bureau.css:25` |
| `--ombre` | 2 | — | `public/sites-demo/_kit/kit.css:109`, `public/sites-demo/_kit/kit.css:138` |

### Polices et relief par direction

Règle de copie : `public/sites-demo/generer.mjs:335-345` ; @font-face : `public/sites-demo/generer.mjs:355` (fichier unique : font-weight 100 900 ; statiques : une face par graisse ; display en swap, texte en optional).

| Entrée | display (statiques ; préchargées) | texte (statiques) | fichiers copiés (octets) |
|---|---|---|---|
| plombier | Manrope (fichier unique) | Manrope (même police) | manrope/manrope.woff2 (24836), manrope/OFL.txt (230) |
| electricien | Space Grotesk (fichier unique) | IBM Plex Sans (fichier unique) | space-grotesk/space-grotesk.woff2 (22288), ibm-plex-sans/ibm-plex-sans.woff2 (45712), space-grotesk/OFL.txt (249) |
| chauffagiste | Newsreader (fichier unique) | IBM Plex Sans (fichier unique) | newsreader/newsreader.woff2 (58084), ibm-plex-sans/ibm-plex-sans.woff2 (45712), newsreader/OFL.txt (257) |
| macon | Archivo Narrow (fichier unique) | IBM Plex Sans (fichier unique) | archivo-narrow/archivo-narrow.woff2 (18692), ibm-plex-sans/ibm-plex-sans.woff2 (45712), archivo-narrow/OFL.txt (252) |
| menuisier | Fraunces (fichier unique) | Fraunces (même police) | fraunces/fraunces.woff2 (36620), fraunces/OFL.txt (285) |
| lestraque | Fraunces (300/400/600 ; 300/400) | IBM Plex Sans (400/600) | fraunces/fraunces-300.woff2 (18328), fraunces/fraunces-400.woff2 (18392), fraunces/fraunces-600.woff2 (18364), ibm-plex-sans/ibm-plex-sans-400.woff2 (14824), ibm-plex-sans/ibm-plex-sans-600.woff2 (16176), fraunces/OFL.txt (285) |
| peintre | Instrument Serif (fichier unique) | Manrope (fichier unique) | instrument-serif/instrument-serif.woff2 (21032), manrope/manrope.woff2 (24836), instrument-serif/OFL.txt (258) |
| carreleur | Manrope (fichier unique) | Manrope (même police) | manrope/manrope.woff2 (24836), manrope/OFL.txt (230) |
| couvreur | Archivo Narrow (fichier unique) | IBM Plex Sans (fichier unique) | archivo-narrow/archivo-narrow.woff2 (18692), ibm-plex-sans/ibm-plex-sans.woff2 (45712), archivo-narrow/OFL.txt (252) |
| serrurier | Syne (fichier unique) | Manrope (fichier unique) | syne/syne.woff2 (34608), manrope/manrope.woff2 (24836), syne/OFL.txt (220) |
| paysagiste | Lora (fichier unique) | IBM Plex Sans (fichier unique) | lora/lora.woff2 (37788), ibm-plex-sans/ibm-plex-sans.woff2 (45712), lora/OFL.txt (220) |
| generique | Manrope (fichier unique) | Manrope (même police) | manrope/manrope.woff2 (24836), manrope/OFL.txt (230) |

Relief (lestraque, `public/sites-demo/_kit/da.json:8`) : `{"photo":"heros-escalier","profondeur":"relief/escalier-profondeur.webp","oeil":[0.404,0.386],"texture":"images/heros-escalier-2880.avif","calme":true,"lumiereCss":true,"descente":{"palier":0.3,"dmax1":0.116,"dmax15":0.066,"roulisParDelta":0,"gamma":0.6,"rw":0.045,"h":-1},"_":"Le héros en relief (vague 3, bureau ≥ 1024 px, souris, mouvement permis, WebGL matériel) : _kit/relief.js copié en relief.js, carte calculée par scripts/relief-profondeur.mjs (qui donne aussi l’œil)"}` ; contrôles `public/sites-demo/generer.mjs:898` à `public/sites-demo/generer.mjs:914` ; attributs rendus `public/sites-demo/generer.mjs:652`.

Rayons : 23 déclarations (50%, 999px, calc(var(--rayon) + 10px), var(--rayon), var(--rayon) var(--rayon) 0 0, calc(var(--rayon) + 12px), 2px, .1em). Ombres : 24. Espacements en clamp : 70. Keyframes : 49. Points de rupture : 37 contextes distincts.

## 5. Effets

| Famille | Sections | Conditions | Crochets | Juge |
|---|---|---|---|---|
| recit | plateau (.plateau__citation p, .chiffres) ; atelier (.atelier__phrase) | bureau (CSS) : @media (min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view()) ; règles sous html.js (`public/sites-demo/_kit/familles/recit.bureau.css:6`)<br>bureau (JS) : rien si mouvement réduit, < 1024 px, sans view() ou sans IntersectionObserver ; valeur non entière → valeurs affichées (`public/sites-demo/_kit/familles/recit.js:8`)<br>téléphone : citation et verbes repris par la famille telephone (`public/sites-demo/_kit/familles/telephone.css:32`)<br>sans JS / mouvement réduit : les spans n’ont aucun style : texte plein, valeur finale (`public/sites-demo/_kit/familles/recit.mjs:3`) | plateauCitation `public/sites-demo/_kit/familles/recit.mjs:15`, plateauValeur `public/sites-demo/_kit/familles/recit.mjs:22`, atelierPhrase `public/sites-demo/_kit/familles/recit.mjs:28`, garde `public/sites-demo/_kit/familles/recit.mjs:35` | `scripts/recit-qa.mjs:98` |
| video | atelier (#atelier .atelier__media) | bureau (JS) : (min-width: 1024px) and (prefers-reduced-motion: no-preference), IntersectionObserver, sans saveData ; créée après load dans un moment libre ; lecture ≥ 60 % de scène, pause < 20 % (`public/sites-demo/_kit/familles/video.js:10`)<br>bureau (CSS) : @media (prefers-reduced-motion:no-preference) dans bureau.css (≥ 1024 px) (`public/sites-demo/_kit/familles/video.bureau.css:5`)<br>téléphone / mouvement réduit / sans JS : aucun élément, aucune requête : la photo reste (`public/sites-demo/_kit/familles/video.js:3`) | credits `public/sites-demo/_kit/familles/video.mjs:25`, garde `public/sites-demo/_kit/familles/video.mjs:41` | `scripts/atelier-video-qa.mjs:76` |
| survol | prestations (#prestations ol.presta) | bureau souris (JS) : (min-width:1024px) and (hover:hover) and (pointer:fine) → .scene--survol (`public/sites-demo/_kit/familles/survol.js:6`)<br>mouvement réduit : .survol--calme : fondu d’opacité 0,2 s, ni volet ni suivi (`public/sites-demo/_kit/familles/survol.bureau.css:40`)<br>téléphone / tactile / sans JS : le survol CSS de kit.css reste (vignette à côté du numéro), rail de cartes au téléphone (`public/sites-demo/_kit/kit.css:544`) | — | `scripts/survol-qa.mjs:88` |
| eclate | etapes (#etapes .etapes__photo.eclate) | bureau chorégraphié (CSS) : @media (min-width:1024px) and (min-height:680px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view()) ; récit 021-16 sous html.js (`public/sites-demo/_kit/familles/eclate.bureau.css:7`)<br>profil fixe (partout ailleurs) : eclate.avif seule + pastilles numérotées + légende (`public/sites-demo/_kit/familles/eclate.css:16`)<br>téléphone : l’éclaté s’ouvre en entrant (famille telephone) (`public/sites-demo/_kit/familles/telephone.css:52`) | etapesMedia `public/sites-demo/_kit/familles/eclate.mjs:98`, garde `public/sites-demo/_kit/familles/eclate.mjs:157` | `scripts/eclate-qa.mjs:134` |
| telephone | héros de l’accueil (rotation + projecteur) ; plateau (citation mot à mot) ; atelier (verbes) ; etapes (éclaté à l’entrée) | téléphone portrait : @media (max-width:767px) and (min-height:560px) and (prefers-reduced-motion:no-preference) ; html.js ; héros sous .da--signature ; défilement sous @supports view() (`public/sites-demo/_kit/familles/telephone.css:11`)<br>tablette, bureau, mouvement réduit, sans JS, pages communes : inchangés (`public/sites-demo/_kit/familles/telephone.css:7`) | — | `scripts/telephone-qa.mjs:111` |

Famille « mobile » : n’existe pas (présentes : eclate, recit, survol, telephone, video).

Effets du kit (hors familles) :

- mots du h1 (motIn) — héros classique (scinde, aplat, page) — `public/sites-demo/_kit/kit.css:102` — (aucun : partout)
- h1 plein qui se lève sous masque — héros plein, bureau — `public/sites-demo/_kit/kit.css:339` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference)
- poussée lente de la photo (pousse 20 s) — héros plein — `public/sites-demo/_kit/kit.css:322` — (aucun : partout)
- dérive verticale du héros au téléphone (derive-tel-haut) — héros plein, < 768 px — `public/sites-demo/_kit/kit.css:940` — @media(max-width:767px) and (min-height:560px) and (prefers-reduced-motion:no-preference)
- moment signature : rotation de la cage (signature-tourne-2 / -4) — héros de l’accueil, bureau — `public/sites-demo/_kit/kit.css:1172` — @media(min-width:1024px) and (min-aspect-ratio:34/25) and (prefers-reduced-motion:no-preference)
- moment signature : projecteur (signature-projecteur) — héros de l’accueil, bureau — `public/sites-demo/_kit/kit.css:1185` — @media(min-width:1024px) and (min-aspect-ratio:34/25) and (prefers-reduced-motion:no-preference)
- moment signature : descente (palier 30 svh, zoom vers l’œil) — héros de l’accueil, bureau — `public/sites-demo/_kit/kit.css:1199` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- relief WebGL du héros (worker + OffscreenCanvas) — héros de l’accueil, bureau souris — `public/sites-demo/_kit/kit.js:182` — (JavaScript)
- ouverture : le plateau monte sur le héros collant — héros + plateau, bureau — `public/sites-demo/_kit/kit.css:1081` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- dévoilement au défilement (.reveal → monte, view()) — toutes les scènes, bureau — `public/sites-demo/_kit/kit.css:1095` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- dévoilement de repli (.reveal + IntersectionObserver) — toutes les scènes, hors chorégraphie — `public/sites-demo/_kit/kit.css:1072` — @media(prefers-reduced-motion:no-preference)
- titres de scène mot à mot (mot-leve) — h2 en .ml, bureau — `public/sites-demo/_kit/kit.css:1091` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- photos qui glissent dans leur cadre (glisse-cadre) — plateau, questions, étapes, contact, bureau — `public/sites-demo/_kit/kit.css:1105` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- dérive de la photo de l’atelier (derive) — atelier, bureau — `public/sites-demo/_kit/kit.css:582` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- travelling épinglé des réalisations + compteur — réalisations, bureau — `public/sites-demo/_kit/kit.css:639` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- relief 3D des photos du travelling — réalisations, bureau souris — `public/sites-demo/_kit/kit.css:1209` — @media(min-width:1024px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view())
- dévoilement en clip des photos de galerie — réalisations — `public/sites-demo/_kit/kit.css:604` — (aucun : partout)
- vignette de prestation au survol (CSS) — prestations, bureau souris — `public/sites-demo/_kit/kit.css:547` — @media(min-width:1024px) and (hover:hover) and (pointer:fine)
- étapes épinglées : numéros et textes par tranche — étapes, bureau ≥ 680 px de haut — `public/sites-demo/_kit/kit.css:1118` — @media(min-width:1024px) and (prefers-reduced-motion:no-preference) › @supports (animation-timeline: view()) › @media(min-height:680px)
- ligne des étapes --avancee (JS) — étapes hors chorégraphie — `public/sites-demo/_kit/kit.js:236` — (JavaScript)
- rails aimantés + jauges (scroll-timeline) — prestations, réalisations, étapes, téléphone — `public/sites-demo/_kit/kit.css:563` — @media(max-width:767px) › @supports (animation-timeline: scroll())
- accordéon des questions (::details-content) — questions — `public/sites-demo/_kit/kit.css:205` — (aucun : partout)
- nav : solide au défilement, bande beige/noire au pixel — toutes les pages — `public/sites-demo/_kit/kit.css:981` — (aucun : partout)
- nav retenue : « Devis » prend le relais du bouton du héros — bureau ≥ 960 px — `public/sites-demo/_kit/kit.css:60` — @media(min-width:960px)
- panneau du menu (croix au-dessus, voile) — toutes les pages — `public/sites-demo/_kit/kit.css:74` — (aucun : partout)
- texture papier (grain fixe) — toute la page ; retirée sous 1024 px — `public/sites-demo/_kit/kit.css:255` (et `public/sites-demo/_kit/kit.css:869`) — (aucun : partout)
- rendu différé des scènes au téléphone (content-visibility) — téléphone — `public/sites-demo/_kit/kit.css:875` — @media(max-width:767px)
- mouvement réduit : tout est là, tout de suite — toutes — `public/sites-demo/_kit/kit.css:261` — @media(prefers-reduced-motion:reduce)

## 6. Procédure de production

1. **Dossier de l’artisan → site.json**
   - contrat site.json exigé par le juge (metier, nom, telephone, siren, decennale, communes, metiers_secondaires, pages) (`scripts/site-qa.mjs:11-30`)
   - champs lus en plus par generer.mjs : artisan, plateau, devis, demo, url_base, da (`public/sites-demo/generer.mjs:192-222`)
   - côté produit, la commande d’un client : Brouillon { metier, metiers_secondaires, communes, matiere { photos, logo_url, adresse, siren, horaires, decennale, avis_google }, domaine } (`lib/siteCommande.ts:50-67`)
2. **Textes → contenu.json (pages[chemin] : title, description, h1, h1Ligne, chapeau, kicker, sections[h2, genre, blocs], jsonld)**
   - `node public/sites-demo/extraire-contenu.mjs <metier>` — une fois, depuis un site v1 ; ensuite contenu.json fait foi (`public/sites-demo/extraire-contenu.mjs:5`)
   - le champ genre remplace la déduction par le h2 (`public/sites-demo/generer.mjs:45`)
   - h1Ligne obligatoire en héros plein (`public/sites-demo/generer.mjs:670`)
3. **Direction artistique → entrée de _kit/da.json (+ site.json → da), polices, monogramme**
   - `node scripts/polices-demo.mjs` (`scripts/polices-demo.mjs:6`)
   - `python scripts/polices-plex-sous-ensemble.py` — si da.texteStatiques (`scripts/polices-plex-sous-ensemble.py:17`)
   - `python scripts/polices-fraunces-statiques.py` — si da.displayStatiques (`scripts/polices-fraunces-statiques.py:10`)
   - `python scripts/monogramme-demo.py <site> <lettre> <police> <graisse>` — si da.monogramme (`scripts/monogramme-demo.py:7`)
   - fusion generique ← site.metier ← site.da ← --da (`public/sites-demo/generer.mjs:282`)
   - police absente ou tronquée → arrêt (`public/sites-demo/generer.mjs:341`)
   - monogramme absent → arrêt (`public/sites-demo/generer.mjs:401`)
4. **Photos avec provenance → images/ + attributions.json (Wikimedia Commons, licences libres)**
   - `node scripts/photos-demo.mjs chercher <metier> [--requetes="q1|q2"] [--planche=nom] [--min=2400] [--sans-sa]` (`scripts/photos-demo.mjs:5`)
   - `node scripts/photos-demo.mjs prendre <metier> <n>:<base>:"Légende" … [--ajouter] [--largeurs=…] [--etalonner] [--recadrer=nom:g,h,l,H]` (`scripts/photos-demo.mjs:7`)
   - `node scripts/photos-demo.mjs variante <metier> <base> <nouvelle-base> --ratio=4:5 --centre=x,y` (`scripts/photos-demo.mjs:23`)
   - `node scripts/photos-provenance.mjs <metier>` — API Commons + empreinte perceptuelle (`scripts/photos-provenance.mjs:7`)
   - `node scripts/photos-heros.mjs lestraque --original=<original>` — étalonnage v4 propre au héros de Lestraque (`scripts/photos-heros.mjs:19`)
   - `node scripts/relief-profondeur.mjs` — si da.relief : carte de profondeur + œil (`scripts/relief-profondeur.mjs:16`)
   - licences acceptées par le juge (`scripts/site-qa.mjs:75`)
   - chaque base citée par la DA doit exister dans attributions.json ET sur le disque (toutes largeurs, avif + webp) (`public/sites-demo/generer.mjs:319`)
   - une photo qu’aucune page n’affiche arrête la génération (`public/sites-demo/generer.mjs:857`)
5. **Générer (déterministe, aucun modèle de langage)**
   - `node public/sites-demo/generer.mjs lestraque` (`public/sites-demo/generer.mjs:9`)
   - `node public/sites-demo/generer.mjs <metier> --sortie=<dossier> [--familles=a,b] [--da=<fichier.json>]` — rendu sur une copie ; --tous est retiré (`public/sites-demo/generer.mjs:944-946`)
   - tous les garde-fous passent AVANT la moindre écriture (`public/sites-demo/generer.mjs:845`)
   - une seule démo vivante : --tous refusé (`public/sites-demo/generer.mjs:943`)
6. **Juges**
   - `node scripts/site-qa.mjs <dossier> [--statique] [--pages=N] [--json]` — Lighthouse mobile ≥ 95, LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms, balises, contrat (`scripts/site-qa.mjs:32-36`)
   - `node scripts/demo-verifier.mjs [dossier] [--statique]` — site-qa → grille-qa → code-qa, dans cet ordre (`scripts/demo-verifier.mjs:6`)
   - `node scripts/grille-qa.mjs [--barre=haut|mediane]` (`scripts/grille-qa.mjs:13`)
   - `node scripts/recit-qa.mjs` (`scripts/recit-qa.mjs:98`)
   - `node scripts/survol-qa.mjs` (`scripts/survol-qa.mjs:88`)
   - `node scripts/eclate-qa.mjs` (`scripts/eclate-qa.mjs:134`)
   - `node scripts/etapes-recit-qa.mjs` (`scripts/etapes-recit-qa.mjs:109`)
   - `node scripts/telephone-qa.mjs` (`scripts/telephone-qa.mjs:111`)
   - `node scripts/atelier-video-qa.mjs` (`scripts/atelier-video-qa.mjs:76`)
   - `node scripts/signature-repos-qa.mjs` (`scripts/signature-repos-qa.mjs:21`)
   - `node scripts/signature-defile-qa.mjs` (`scripts/signature-defile-qa.mjs:145`)
   - `node scripts/signature-relief-qa.mjs` (`scripts/signature-relief-qa.mjs:20`)
   - `node scripts/nav-retenue-qa.mjs` (`scripts/nav-retenue-qa.mjs:21`)
   - `node scripts/familles-socle-qa.mjs` (`scripts/familles-socle-qa.mjs:18`)
   - `node scripts/orchestre.mjs verifier <id>` — la commande « verifier » de la tâche fait le verdict (digest.md) (`scripts/orchestre.mjs:21`)
   - gabarit d’une tâche : verifier, preuve jamais vide, périmètre (`.orchestre/gabarit-tache.md:7-9`)
7. **Mise en ligne**
   - `git push (démo servie par Next depuis public/) puis node scripts/deploiement-etat.mjs` — démo (`scripts/deploiement-etat.mjs:6`)
   - `node scripts/site-deposer.mjs <commande_id> <dossier> [--statique]` — client : juge complet puis dépôt dans le bucket « sites », commande payee → generee (`scripts/site-deposer.mjs:5`)
   - `POST /api/controle/sites/<id> { action: "valider" | "regenerer" | "mettre_en_ligne" }` — Poste de contrôle : generee → validee → en_ligne (`app/api/controle/sites/[id]/route.ts:1`)
   - états de la commande et passages permis (`lib/siteCommande.ts:27-35`)
   - liens internes en index.html (Next redirige /x/ vers /x) (`public/sites-demo/generer.mjs:267`)

## 7. Écarts relevés

- **Aucun code ne transforme une commande client (lib/siteCommande.ts) en site.json / contenu.json / attributions.json : generer.mjs n’est cité par aucun fichier de app/ ni de lib/, seulement par des fichiers de scripts/ (juges et outils de démo).** (`lib/siteCommande.ts:59`)
  - preuve : `scripts/atelier-plan-qa.mjs`, `scripts/atelier-video-qa.mjs`, `scripts/eclate-qa.mjs`, `scripts/etapes-recit-qa.mjs`, `scripts/familles-socle-qa.mjs`, `scripts/familles-socle-suite-qa.mjs`, `scripts/juges-023-mutations.mjs`, `scripts/lenis-film-qa.mjs`, `scripts/lib/survol-banc.mjs`, `scripts/nav-retenue-qa.mjs`, `scripts/ouverture-film-qa.mjs`, `scripts/photos-demo.mjs` +8
- **Valeurs propres à Lestraque écrites en dur dans le générateur**
  - h1 de l’accueil : « Menuisier » et « Rennes » exigés (`public/sites-demo/generer.mjs:140`)
  - h1 des pages communes : « Menuisier » exigé (`public/sites-demo/generer.mjs:876`)
  - libellé du champ message : « La pièce, l’usage, le bois » (`public/sites-demo/generer.mjs:590`)
  - couleurs du favicon #14110E / #E9D6B8 (`public/sites-demo/generer.mjs:406`)
  - theme-color #0E0A07 du héros plein (`public/sites-demo/generer.mjs:445`)
  - liens de la nav (Prestations, Réalisations, Communes, Questions) et ancres fixes (`public/sites-demo/generer.mjs:433`)
  - galerie de l’accueil : exactement 4 photos ; pages communes : 3 ouvrages (`public/sites-demo/generer.mjs:690`)
  - aria-label du plateau « L’atelier en bref » (`public/sites-demo/generer.mjs:648`)
- **Familles liées au contenu de Lestraque**
  - eclate : projet « Escalier » exigé dans site.devis.projets, 4 pièces nommées, phrase et libellés fixes (`public/sites-demo/_kit/familles/eclate.mjs:10-34`)
  - recit : verbes trace, débite, assemble, ponce exigés dans la phrase de l’atelier (`public/sites-demo/_kit/familles/recit.mjs:7`)
  - video : fichiers video/atelier.av1.mp4 et atelier.h264.mp4 (`public/sites-demo/_kit/familles/video.mjs:6`)
- **Les couleurs des scènes sombres sont littérales dans kit.css, hors de da.json (noir chaud, crème, or)**
  - #F4EDE2 : 31 déclarations (`public/sites-demo/_kit/kit.css:50`)
  - #D4A574 : 25 déclarations (`public/sites-demo/_kit/kit.css:274`)
  - #14110E : 14 déclarations (`public/sites-demo/_kit/kit.css:352`)
  - #1F160E : 6 déclarations (`public/sites-demo/_kit/kit.css:50`)
  - #221A13 : 4 déclarations (`public/sites-demo/_kit/kit.css:468`)
  - #0E0A07 : 2 déclarations (`public/sites-demo/_kit/kit.css:316`)
- **Clés de da.json qu’aucune ligne de generer.mjs ne lit**
  - filigrane (`public/sites-demo/_kit/da.json:3`)
  - labelPluriel (`public/sites-demo/_kit/da.json:3`)
- **Le pied « nuit » existe (kit.css) mais generer.mjs n’appelle jamais pied(rel, true)** (`public/sites-demo/generer.mjs:474`)
  - preuve : `public/sites-demo/generer.mjs:711`, `public/sites-demo/generer.mjs:730`, `public/sites-demo/generer.mjs:771`, `public/sites-demo/generer.mjs:791`, `public/sites-demo/generer.mjs:841`
- **Pas de famille « mobile » : le téléphone est la famille « telephone »**
  - preuve : `public/sites-demo/_kit/familles/eclate.bureau.css`, `public/sites-demo/_kit/familles/eclate.css`, `public/sites-demo/_kit/familles/eclate.mjs`, `public/sites-demo/_kit/familles/recit.bureau.css`, `public/sites-demo/_kit/familles/recit.js`, `public/sites-demo/_kit/familles/recit.mjs`, `public/sites-demo/_kit/familles/survol.bureau.css`, `public/sites-demo/_kit/familles/survol.js`, `public/sites-demo/_kit/familles/telephone.css`, `public/sites-demo/_kit/familles/video.bureau.css`, `public/sites-demo/_kit/familles/video.js`, `public/sites-demo/_kit/familles/video.mjs`
- **Le relevé a régénéré Lestraque sur une copie : pages, bureau.css, site.js, favicon et robots identiques au site en ligne ; seules les dates changent (1re ligne de styles.css, lastmod du sitemap)**
  - preuve : `.orchestre/preuves/024-02/generation-copie.log`
- **Classes du kit absentes du HTML rendu de Lestraque (posées par script, ou gabarits hors scènes / autres DA)**
  - 51 classes : `menu-ouvert` (script), `section--alt`, `section--serre`, `entete`, `solide` (script), `nav--sombre` (script), `nav--retenue` (script), `nav--appel` (script), `ouvert` (script), `hero__filigrane`, `hero__tel`, `hero__indice`, `js` (script), `entre`, `hero--scinde`, `hero--aplat`, `hero__grille`, `hero__cadre`, `bouton--contour`, `cartes`, `carte`, `carte--grande`, `vu` (script), `bande`, `deux`, `reveal--zoom`, `texture--grain`, `section--sombre`, `da--raccords`, `entete--scene`, `bande--devis`, `pied--nuit`, `tout-rendu` (script), `pilote` (script), `entier` (script), `nav--bande` (script), `hero__relief` (script), `hero__relief--pret` (script), `relief-3d` (script), `chiffres--attente` (script), `chiffres--entre` (script), `chiffres--compte` (script), `scene--survol` (script), `est-ouverte` (script), `est-sortie` (script), `survol--calme` (script), `presta__declencheur` (script), `atelier__video` (script), `atelier__video--lue` (script), `atelier__media--video` (script), `atelier__pause` (script)
