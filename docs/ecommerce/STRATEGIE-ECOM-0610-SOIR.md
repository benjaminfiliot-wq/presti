# Stratégie e-commerce — décidée le 06/10/2026 au soir

Produits choisis sur des MESURES (prix vendus eBay.fr lus connecté, prix AliExpress lus, vidéos TikTok françaises par Apify), pas sur des estimations. Méthode tirée des vidéos de Benj (`docs/ecommerce/sources/`) : **lister d'abord, commander chez le fournisseur après la vente** (aucun stock), **partir de la demande déjà visible sur TikTok**, **contenu organique en volume** avant toute pub payante. Détail des mesures : `docs/ecommerce/recherches/vendus-ebay-aliexpress-0610.md`.

## Les deux produits retenus

| | Nettoyeur haute pression sans fil (pistolet à batterie) | Aspirateur de voiture sans fil |
|---|---|---|
| Ventes eBay.fr 2026, neuf sans marque | 71 (43 en septembre-octobre) | 96 (70 en septembre-octobre) |
| Prix vendu (quartile bas / médiane) | 27,90 € / **41,28 €** | 19,63 € / **27,91 €** |
| Prix fournisseur AliExpress | 19,26 € (3 000+ vendus) ; **21,76 € en stock France** (10 000+ vendus) | **6,89 à 9,99 €** (10 000 à 50 000+ vendus) |
| Vidéos TikTok FR ≥ 100 000 vues (sur 12 lues) | **4** : 3,2 M, 1,9 M, 1,1 M, 908 k | **5** : 1,3 M, 1 M, 804 k, 414 k, 404 k |
| Prix de vente proposé | **34,90 €** livraison incluse | **24,90 €** livraison incluse |
| Marge nette estimée (frais eBay ≈ 13 % + 0,35 €) | ≈ 8 € (stock France, livraison rapide) ; ≈ 10,7 € (Chine) | ≈ 11 € (fournisseur à 9,99 €) |
| Risque | batterie lithium (expédition, CE) ; produit saisonnier (printemps-été plus fort) | batterie lithium ; qualité variable des modèles à 7 € (lire les avis, prendre ≥ 4,7 étoiles) |

Écartés après mesure : kit tournevis 115 pièces, niveau laser, barre magnétique (marge ≤ 3 €), mini souffleur turbo (≈ 3 € en stock France, demande TikTok FR non prouvée).

## Le modèle (sans stock)
1. **eBay.fr** : une annonce par produit au prix ci-dessus, livraison incluse, **délai réel annoncé** (stock France : 3 à 7 jours ; Chine : 10 à 20 jours ouvrés). Une vente arrive → commande AliExpress au nom et à l'adresse de l'acheteur → numéro de suivi recopié sur eBay. Plafond : 10 commandes en attente à la fois au début.
2. **TikTok Brico Travaux** (≈ 4 700 abonnés) : 2 vidéos par jour et par produit, en deux formats (demandés par Benj) :
   - **A — l'influenceuse IA Léa** (image de référence : `promo-src/influenceur/lea-reference.jpg`, Alexya) qui montre le problème et la solution, mention « personnage généré par IA » ;
   - **B — présentation animée** du produit avec des vidéos libres de droits de personnes en situation (lavage de voiture, de terrasse, d'intérieur de voiture) et texte à l'écran.
   Lien du profil → l'annonce eBay. Aucune performance chiffrée tant que le produit n'est pas testé.
3. **TikTok Shop : non** pour ces produits venus de Chine (interdit) ; **Shopify : plus tard**, une boutique d'un seul produit quand une annonce eBay a fait ses premières ventes (clés Shopify déjà dans les secrets).
4. **Pubs payantes : pas avant 10 ventes organiques** ; ensuite seulement, petit test plafonné (décision de Benj).

## Brouillons d'annonces (rien n'est publié)
**1.** `Nettoyeur haute pression sans fil à batterie – pistolet lavage voiture terrasse, buses` — 34,90 €, livraison incluse 3 à 7 jours (stock France). Description : pistolet de lavage autonome à batterie rechargeable, se branche sur un seau ou une bouteille d'eau, pour voiture, vélo, terrasse, vitres ; livré avec ses buses et sa batterie ; rétractation 14 jours ; garantie légale 2 ans. Caractéristiques techniques à recopier de la fiche du fournisseur choisi, rien d'autre.
**2.** `Aspirateur de voiture sans fil rechargeable USB – mini aspirateur à main puissant` — 24,90 €, livraison incluse (délai selon le fournisseur retenu). Même règle de description.
Photos : celles du fournisseur seulement avec son accord, sinon photos d'un échantillon ou visuels générés clairement marqués.

## Ce qui reste à Benj (gestes qu'aucun agent ne doit faire à sa place)
- Dire **« publie »** pour mettre les 2 annonces en ligne sur son compte eBay (fil_2579) ; le statut vendeur (particulier ou micro-entreprise) est sa décision.
- Le paiement fournisseur au moment d'une commande (carte enregistrée sur AliExpress).

## Ce que l'écosystème suit chaque jour
Relevé de marché (06 h 40) sur ces deux produits : demande TikTok FR et annonces eBay ; Chef : rédaction des scripts A et B et des variantes d'accroches ; garde des nombres active sur tout rendu.
