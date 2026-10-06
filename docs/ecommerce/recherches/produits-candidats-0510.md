# Produits candidats — niche outils et bricolage (05/10/2026, nuit)

**Statut : hypothèses de catégories, sources citées ; AUCUN produit n'est encore validé au niveau d'une fiche.** Ce document remplace le brouillon de Hermes (`produits-bricolage-hermes-0510-NON-FIABLE.md`, dates inventées).

## Pourquoi cette niche
Le compte TikTok **Brico Travaux** (≈ 4 700 abonnés, référencement bricolage déjà acquis) parle déjà au public visé : on vend à l'audience qu'on a, avec des vidéos de démonstration (le format qui marche selon les analyses des vidéos : `sources/ecomsantiagoo-…analyse.md`, `sources/restructureai-…analyse.md`).

## Catégories candidates (par ordre d'adéquation avec Brico Travaux)
Source des catégories et des fourchettes de prix : [dashboardly.io, outils DIY sur TikTok Shop](https://www.dashboardly.io/tiktok-shop/diy-tools), complétée par [aftership, tendances TikTok Shop](https://ecommerce.aftership.com/product-trend-list/best-hardware-product-to-sell-tiktok-shop-us). **Ces pages décrivent le marché américain et reconnaissent que leurs fourchettes sont « des hypothèses de planification »** : elles disent QUOI regarder, pas combien ça rapportera en France.
| # | Catégorie | Prix de vente observé (US) | Pourquoi ça colle à la vidéo courte | Points de vigilance (UE) |
|---|---|---|---|---|
| 1 | **Kit de tournevis de précision** (100+ embouts) | 14 à 24 $ | démonstration en 10 secondes, produit léger et peu cher | marque : aucune ; pas de marquage CE pour de l'outil à main |
| 2 | **Kit d'accrochage mural** (crochets, chevilles, niveau à bulle) | 12 à 20 $ | résultat « satisfaisant » avant/après, très partageable | quincaillerie standard |
| 3 | **Niveau laser compact** | 18 à 35 $ | précision visible à l'image | laser classe 2, **marquage CE et notice en français** ; pile |
| 4 | **Tournevis électrique sans fil** (USB-C) | 22 à 38 $ | cadeau, démonstration rapide | **batterie lithium : CE, transport, garantie** ; risque plus élevé |
| 5 | **Rangement d'atelier magnétique / établi portable** | 28 à 50 $ | « avant/après » d'atelier | poids et port ; au-delà de ~50 € la conversion baisse |
| 6 | **Adhésifs et mastics spécialisés** | 8 à 16 $ | démonstration d'usage | produit chimique : fiche de sécurité, **hors périmètre au départ** |

## Relevé réel d'eBay.fr (06/10/2026, 00 h 50 Paris) — l'offre, pas les ventes
Lecture par Firecrawl (localisation France), annonces **à prix fixe en vente maintenant** (tri « correspondance »), 5 recherches, 1 crédit chacune. **Ce sont des prix demandés, pas des prix vendus** : le compteur « N vendus » n'apparaît presque jamais, et la page des ventes conclues exige une connexion.
| Recherche | Annonces relevées | Prix médian demandé | Min – max |
|---|---|---|---|
| kit tournevis précision embouts | 106 | **20,99 €** | 4,99 – 209,50 € |
| kit accrochage tableau mural | 80 | **35,99 €** | 8,39 – 142,95 € |
| niveau laser croix | 60 | **68,30 €** | 13,90 – 449,90 € |
| rangement atelier magnétique outils | 58 | **26,69 €** | 6,50 – 3 629 € (valeur aberrante) |
| tournevis électrique sans fil usb | 79 | **49,99 €** | 6,52 – 172,24 € |
**Ce que ça dit** : la catégorie 1 (tournevis de précision) est **très encombrée** (106 annonces, de nombreux vendeurs à 5-15 €) : il faudrait un angle (lot, notice en français, présentation) ; le niveau laser et le tournevis sans fil se vendent plus cher mais demandent CE et batterie. **Ce que ça ne dit pas** : combien se vend réellement, ni la marge (le prix d'achat rendu en Europe n'est pas mesuré).

## Ce qui manque pour passer d'une catégorie à un produit
Les deux sources de données qui permettent de valider un produit **ne sont pas accessibles ce soir** :
- **eBay.fr, ventes conclues** : la page « vendus » exige une connexion (constaté par Firecrawl le 05/10 : mur de connexion) ; l'API officielle (compte développeur, en cours de vérification) donnera les prix réellement vendus.
- **AliExpress, entrepôt européen** : la lecture depuis l'étranger renvoie la boutique américaine en dollars (constaté le 05/10) ; il faut soit l'API d'AliExpress, soit un jeton **Apify** (le fichier `presti-secrets/apify api.txt` ne contient pas encore de jeton : 6 caractères).
Tant que ces deux accès manquent, on **ne chiffre aucune marge** : les agents n'inventent pas de prix.

## Les 5 critères qu'un produit doit passer avant tout achat test
1. **Demande visible** : au moins 5 vidéos TikTok récentes (moins de 90 jours) du même produit à plus de 100 000 vues, avec des commentaires qui demandent où l'acheter.
2. **Prix vendu** : au moins 3 ventes conclues par semaine sur eBay.fr au prix cible (API officielle).
3. **Marge** : prix d'achat rendu en France (entrepôt UE, livraison comprise) inférieur à 40 % du prix vendu, après les frais de protection acheteur eBay.
4. **Conformité** : aucune marque protégée, marquage CE si le produit en exige, notice en français, pas de produit réglementé.
5. **Livraison** : stock en France ou en Europe, livraison annoncée 7 jours au plus.

## Pas d'achat de stock (décision de Benj, 06/10)
Aucun lot test : on **liste d'abord sur eBay, on commande chez le fournisseur seulement après une vente** (voir `STRATEGIE-0610.md`, section « Modèle sans stock »). Un produit est donc retenu sur ses 5 critères (dont le critère 5 : livraison annoncée honnête), jamais sur un achat préalable. Aucun agent n'a d'accès au paiement.

## Prochaines étapes automatiques
1. Les agents de veille relèvent, sur les sources publiques, les vidéos TikTok de ces 6 catégories (vues, date, commentaires) et classent les produits qui passent le critère 1.
2. Dès l'accès aux prix vendus eBay (API) ou à Apify, les critères 2 à 5 sont calculés produit par produit.
3. Pour chaque produit retenu : 3 scripts de vidéos de 20 secondes pour Brico Travaux (accroche, démonstration, appel à l'achat sans promesse mensongère), puis l'annonce eBay (titre, description, photos générées).

## Relevé eBay.fr du 06/10 (≈4 h 30 Paris) — annonces à prix fixe EN VENTE (pas des prix vendus), 1 crédit Firecrawl chacun

| Recherche | Annonces | Prix médian | Min | Max |
|---|---|---|---|---|
| tournevis électrique sans fil usb | 79 | 49,99 € | 6,52 € | 172,24 € |
| kit tournevis précision | 64 | 17,99 € | 3,65 € | 156,99 € |
| niveau laser croix | 60 | 68,30 € | 13,90 € | 449,90 € |
| kit accrochage tableau sans perçage | 22 | 28,50 € | 11,95 € | 235,27 € |

Limites : prix demandés, pas vendus ; aucun compteur de ventes sur la page ; AUCUNE marge calculée (pas de prix fournisseur réel). Le min/max mélange lots, pièces détachées et marques pro : seul le médian est indicatif.
