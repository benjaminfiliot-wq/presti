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

## Fournisseur automatique : CJdropshipping (mesuré par l'API CJ le 06/10 à 21 h)
Compte CJ de Benj relié à eBay ; clé API dans `presti-secrets/cj api.txt` (jeton d'accès par `authentication/getAccessToken`, recherche par `product/listV2?keyWord=`, port par `logistic/freightCalculate`).
| Produit CJ | Prix | Port vers la France | Coût livré | Marge à 24,90 € / 34,90 € (frais eBay ≈ 13 % + 0,35 €) |
|---|---|---|---|---|
| Aspirateur de voiture sans fil (pid 2602210241461612300) | 5,44 $ | 11,29 $ depuis la Chine (YunExpress « Sensitive », 7 à 12 j) ; 25,52 $ depuis l'Allemagne (2 à 6 j) | ≈ 15,40 € (Chine) | **≈ 6 €** à 24,90 € |
| Nettoyeur haute pression sans fil (pids 2104756248418136066, 2090652964610564097) | 20,55 à 21 $ | **aucune ligne vers la France** (batterie) | — | — |
Conclusion : **aspirateur par CJ** (commande et suivi automatiques, marge ≈ 6 €) ; **nettoyeur par le vendeur AliExpress en stock France** (21,76 € livré, marge ≈ 8 €), commande manuelle validée par Benj tant qu'aucun outil gratuit ne l'automatise sur eBay. AliExpress « Choice » (port gratuit) reste moins cher que CJ pour l'aspirateur (7 à 10 € livrés) mais sans automatisation.

## Méthode tirée de la vidéo de Benj (@robbedoesecom, TikTok 7673240835810446612, transcrite le 06/10)
Vidéo sponsorisée pour une boutique IA concurrente de Shopify (nom mal prononcé, non vérifié) ; les « 98 000 $ » ne sont pas prouvés. Ce qu'on garde, c'est la méthode, appliquée sans changer de plateforme (on reste sur eBay et TikTok Shop) et sans rien payer :
1. **Tester en A/B contre de vrais clients, en continu.** Pour TikTok : la chaîne produit 3 accroches différentes par produit (lignes `promo-src/tiktok-chaine/lignes/`), publiées à 24 h d'écart ; à 48 h, on garde l'accroche qui a le plus de vues et de clics vers la bio, et on refait 3 variantes à partir d'elle. Pour eBay : une seule annonce par produit (les doublons sont interdits), mais titre et 1ʳᵉ photo changés tous les 7 jours, avec les vues et le taux de vente notés avant et après.
2. **Lots et ventes additionnelles.** eBay propose gratuitement la remise multi-achat (« achetez-en 2, -10 % »), à activer sur l'aspirateur (cadeau, deuxième voiture). Le lot nettoyeur + buse de rechange est à étudier quand le fournisseur aura confirmé le contenu du colis.
3. **Toutes les images à partir d'une seule photo produit.** C'est déjà ce que fait la chaîne vidéo (produit détouré, loupe, avant/après) : on réutilise les mêmes plans pour les photos d'annonce eBay.
L'écosystème suit ces mesures chaque jour (relevé de marché + compteurs TikTok) ; un test ne s'arrête que sur un chiffre lu, jamais sur une impression.

## Vérification avant publication (06/10/2026, 23 h, sur les fiches et l'API, à la demande de Benj : produits d'Europe, bons produits, bons prix)
| | Nettoyeur haute pression sans fil | Aspirateur de voiture sans fil |
|---|---|---|
| Fournisseur retenu | AliExpress, article 1005009522003959, variante « FR 6000mah-2 batteries » | CJ, pid 2039611415532191746, **entrepôt Allemagne** (34 en stock) |
| D'où part le colis | **France** (livraison gratuite, reçu en 2 à 5 jours ; retour gratuit 15 j) | **Allemagne** (DHL DE→FR, 3 à 7 jours) |
| Colis | pistolet 21 V + 2 batteries 6000 mAh (fiche) | aspirateur, 6 embouts, filtre, câble USB, notice ; sec et humide, souffle/aspire |
| Coût livré | **21,76 € TTC** (prix lu sur la fiche, sans droits de douane) | **15 $ + 5,50 $ de port = 20,50 $** (≈ 17,5 à 18,5 € selon le cours) |
| Prix de vente eBay | **34,90 €** livraison incluse (médiane vendue : 41,28 €) | **27,90 €** livraison incluse (médiane vendue : 27,91 €) ; à 24,90 € la marge tomberait à ≈ 3 € |
| Marge nette (frais eBay ≈ 13 % + 0,35 €) | **≈ 8,25 €** | **≈ 5,50 à 6,50 €** |
Abandonnés : l'aspirateur CJ expédié de Chine (pid 2602210241461612300) et tous les nettoyeurs CJ (aucune ligne de port vers la France, y compris depuis l'Allemagne et le Royaume-Uni : batterie).
