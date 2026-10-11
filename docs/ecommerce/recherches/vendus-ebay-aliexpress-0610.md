# Prix VENDUS sur eBay.fr et prix fournisseur AliExpress — première mesure réelle (06/10/2026)

Lecture faite par Claude Code dans le Chrome de Benj (eBay exige une connexion pour afficher les « ventes réussies » : le robot public (Firecrawl) est renvoyé vers la page de connexion, vérifié le 06/10). Produit mesuré : **kit de tournevis de précision « 115 en 1 »**. Mesure ponctuelle, à refaire ; chaque ligne est une annonce vendue (une annonce peut avoir vendu plusieurs unités).

## eBay.fr — annonces vendues (recherche « kit tournevis precision 115 », ventes réussies, Union européenne)
- ~38 annonces vendues entre le 8 juillet et le 4 octobre 2026 pour **tous** les kits de tournevis de précision (de 2 à 56 €) ; **7 seulement** sont des kits 115/116 pièces.
- Kits **115/116 pièces**, vendus : 11,90 € (26/07), 12,99 € (13/09), 14,67 € (30/07), 11,77 € (04/10, vendeur britannique, + 17,66 € de port), 21,49 € (déc. 2025), 24,15 € (30/09, vendeur espagnol, + 12 € de port), 37,54 € (10/09, « faire une offre »). Le cœur du marché, port gratuit : **11,90 à 14,67 €**.
- Tous kits confondus, la plupart des ventes se font entre 6 et 13 €, port gratuit ; les kits à 25-40 € existent mais se vendent rarement (une annonce chacun).

## AliExpress — prix fournisseur (même produit, tri par commandes)
- Kits 115 en 1 en tête des ventes : **11,49 €** (plus de 10 000 vendus, 4,9 étoiles), **10,19 €** (plus de 5 000), 19,59 € (marque, plus de 5 000). Un résultat à 3,79 € (« 25/115/135 en 1 », 0,45 €/pièce) est le prix de la plus petite variante, pas du kit 115. Livraison « Choice » gratuite dès 10 € d'achat.

## Ce que ça dit (à recouper, deux relevés ponctuels)
- Marge brute d'un kit 115 : vendu **≈ 12,99 €** port gratuit, acheté **≈ 10,19 à 11,49 €** livré, frais eBay ≈ 13 % du total (≈ 1,7 €) + 0,35 € par commande : **marge nette ≈ 0 € voire négative**. Le prix fournisseur est quasi le prix de vente.
- Le volume est faible : une poignée de ventes de kits 115 par mois sur eBay.fr, plus de vendeurs établis (jusqu'à 44 000 évaluations) qui tiennent déjà le prix bas.
- **Verdict provisoire : le kit tournevis 115 pièces n'est pas rentable pour nous** (pas de marge, pas de volume). Ne pas le lister. Ce n'est pas une conclusion sur tous les produits : le même relevé (prix vendus + prix fournisseur livré) doit être fait pour les quatre autres candidats avant tout choix.

## Méthode (pour que l'écosystème la reprenne)
1. eBay : `https://www.ebay.fr/sch/i.html?_nkw=<mots>&LH_Sold=1&LH_Complete=1&_sop=13&LH_PrefLoc=3` — Chrome connecté à eBay, lire le texte de la page (annonce, prix, « Vendu le », port).
2. AliExpress : `https://fr.aliexpress.com/w/wholesale-<mots-avec-tirets>.html?sortType=total_tranpro_desc` — les cartes `a[href*="/item/"]` donnent titre, prix, étoiles, nombre vendu.
3. Marge nette = prix vendu médian − (prix fournisseur livré + 13 % de frais eBay + 0,35 €). Jamais de marge sans les deux prix mesurés.
4. L'usine n'a pas accès à ce Chrome (compte eBay de Benj) : ces relevés se font depuis le PC, puis sont envoyés au Savoir (`node scripts/savoir/synchroniser.mjs`) pour que les agents les lisent.

---

## Produit 2 — niveau laser en croix (mesuré le 06/10/2026, même méthode)

**eBay.fr, ventes réussies depuis janvier 2026** (recherche « niveau laser croix bricolage », accessoires, trépieds, lunettes retirés) : 50 annonces vendues, mais **34 à plus de 60 €** (Bosch, Dewalt, Huepar : les marques tiennent le marché). Les niveaux **sans marque à 2 lignes vertes** se vendent **19,90 à 34,99 €**, port gratuit : environ 9 annonces vendues en trois mois sur toute la plateforme (≈ 3 par mois).

**AliExpress, tri par commandes, niveau laser vert auto-nivelant à 2 lignes** : 16,39 € (HILDA, 4,9 étoiles, plus de 5 000 vendus), 20,99 € (HILDA mini USB), 25,39 € (Lfine, 4,6 étoiles), et un modèle à **10,49 €** (4,3 étoiles, plus de 4 000 vendus : note basse, risque de retours). Les 12 et 16 lignes (4D) coûtent 45 à 69 €.

**Marge nette** (prix vendu ≈ 22 €, frais eBay ≈ 13 % + 0,35 € ≈ 3,2 €) :
- avec le HILDA à 16,39 € : **≈ 2,4 € par vente** ;
- avec le modèle à 10,49 € : ≈ 8 € mais une note de 4,3 (retours, avis négatifs qui tuent un compte neuf).

**Verdict provisoire : marge trop mince et volume trop faible** pour le niveau sans marque. Même schéma que le kit de tournevis : le prix AliExpress « Choice » livré est déjà proche du prix de vente eBay.fr.

## Lecture d'ensemble (deux produits, à confirmer sur les trois autres)
Sur eBay.fr, les produits sans marque de bricolage se vendent à des prix déjà écrasés par des vendeurs établis qui achètent aux mêmes fournisseurs. Un produit n'a de chance que si l'écart « prix vendu − (prix fournisseur livré + 13 %) » dépasse **5 €** avec au moins **10 ventes par mois** sur la plateforme. Les deux premiers n'y sont pas.

## Produit 3 — barre magnétique porte-outils (mesuré le 06/10/2026)
Le mot-clé « rangement atelier magnétique » de la liste de surveillance ramène des étagères (24 ventes 2026, médiane 39,90 €) : **mauvais mot-clé**, à remplacer par « barre magnétique porte outils ».
- **eBay.fr, ventes réussies 2026** : 60 annonces vendues, médiane **18,51 €** (quartiles 10,59 € et 28,26 €) ; les lots de 2 à 4 barres 12 pouces se vendent 16 à 22 €, un lot de 6 à 29,95 € ; **le volume est bon** (une dizaine de ventes sur les cinq derniers jours).
- **AliExpress** : porte-outils magnétique 12 pouces à étiquettes **7,19 €** la barre (6,99 € à partir de 2), 4,9 étoiles, plus de 10 000 vendus.
- **Marge** : un lot de 4 vendu ≈ 20 € coûte ≈ 28 € à l'achat : **perte**. Une barre seule vendue ≈ 11 € pour 7,19 € : ≈ 1 à 3 € net après frais. **Verdict provisoire : non**, malgré un bon volume.

## Conclusion intermédiaire (trois produits sur cinq)
Aucun des trois ne dégage 5 € de marge nette : les prix AliExpress livrés sont trop proches des prix vendus sur eBay.fr. **Ne rien lister avant d'avoir un produit où le prix vendu dépasse le coût livré de plus de 5 € avec au moins 10 ventes par mois.** Pistes non encore mesurées : produits à marque d'usine peu distribuée, lots/bundles (la valeur perçue monte plus que le coût), produits à forte valeur et faible concurrence (50 à 150 €), et surtout le **scan automatique de beaucoup de mots-clés** pour trouver l'écart (l'écosystème peut le faire, mais seulement avec ce Chrome : l'usine n'a pas accès au compte eBay de Benj).

---

## Balayage de la demande eBay.fr (20 mots-clés, ventes réussies 2026, 06/10/2026, Chrome connecté)
Une page de résultats = au plus ~130 annonces vendues ; « ventes » ci-dessous est ce que la première page contient. Médiane du prix vendu :
| Mot-clé | Ventes (p. 1) | Médiane | Quartiles |
|---|---|---|---|
| lampe frontale rechargeable led | 132 | 14,95 € | 10,9 – 25 |
| souffleur sans fil | 131 | 47 € | 31 – 70+ |
| pistolet à graisse | 126 | 21,9 € | 11,2 – 45 |
| caméra d'inspection endoscope | 116 | 23,2 € | 13 – 53 |
| testeur de tension stylo | 110 | 9,1 € | 6,4 – 19 |
| aspirateur d'atelier sans fil | 107 | 62,5 € | 34 – 106 |
| détecteur de câbles muraux | 86 | 29,4 € | 16,5 – 54,5 |
| visseuse sans fil 21 V | 81 | 31,9 € | 22,9 – 49,9 |
| mini scie circulaire sans fil | 75 | 45 € | 14,9 – 65 |
| pistolet à colle sans fil | 61 | 31,9 € | 19 – 60 |
| multimètre numérique | 60 | 27,5 € | 15,4 – 57,5 |
| télémètre laser | 59 | 69,9 € | 43 – 200 |
| lampe de travail led magnétique | 53 | 20,2 € | 16,9 – 30 |
(les 7 autres mots-clés de la liste n'ont pas fini de s'afficher : à refaire). **La demande est là partout ; le problème est la marge.**

## Candidat qui passe le seuil de 5 € : le mini souffleur turbo « violent fan »
- **eBay.fr, ventes réussies 2026** : « turbo jet fan souffleur poussière » 81 ventes, médiane **27,56 €** (quartiles 21,85 – 32,07), 8 sur 81 avec port gratuit ; « mini turbo ventilateur souffleur violent fan » 40 ventes, médiane **31,25 €**.
- **AliExpress** : à partir de **12,59 €** (4,9 étoiles, plus de 100 000 vendus) ; 17,89 à 26,99 € pour les modèles « M18 » à batterie.
- **Marge nette** (vendu ≈ 29 €, frais ≈ 4,1 €) : avec le modèle à 12,59 € ≈ **12 €** ; avec ceux à 17-21 € ≈ 4 à 8 €.
- **Demande TikTok française : NON prouvée** (Apify clockworks, « souffleur turbo violent fan », 12 vidéos : une seule en français, 91 300 vues ; la plus vue, 1,1 million, est en anglais) — le compte Brico Travaux est français.
- **Risques à lever avant de lister** : batterie au lithium (transport, norme CE et sécurité des produits en UE), délai de livraison AliExpress de 2 à 3 semaines face à des acheteurs eBay, retours, produit « tendance » qui peut s'effondrer, et les vendeurs eBay qui le tiennent déjà.

---

## Même produit, expédié depuis la France ou l'Union européenne (AliExpress, filtre « Expédié depuis : France », 06/10/2026)
(Le filtre se règle par l'adresse `…wholesale-<mots>.html?sortType=total_tranpro_desc&shipFromCountry=FR` ; les offres affichent « Envoi local, sans frais de douane supplémentaires ».)
- Mini souffleur turbo de poche, stock France : **26,39 €** (4,9 étoiles, plus de 50 000 vendus), **21,46 €** (3 en 1 pour atelier, plus de 4 000 vendus, « Rapide et gratuit »), 22,35 €, 27,99 €, 34,09 €.
- Prix vendu eBay.fr observé : 27,56 à 31,25 €. **Marge nette avec le stock France : ≈ 3 € au mieux (21,46 €), négative avec les modèles à 26 €.** Le gain de délai (quelques jours au lieu de 2-3 semaines) se paie au prix de toute la marge : le prix « stock local » égale déjà le prix de vente eBay.
- Conclusion : **pour ce produit, le stock européen ne rend pas rentable la revente à l'identique**. Il faut un produit où l'on peut vendre plus cher que le fournisseur (lot de plusieurs pièces, kit thématique « atelier », accessoires associés), ou un fournisseur de gros européen à prix de gros (plateformes B2B avec stock en France/Espagne) : exige un compte professionnel (SIRET) et un compte à ouvrir par Benj.

## Génération d'images (influenceur IA, Nano Banana) — état des voies, 06/10/2026
- **API Gemini avec la clé du dossier secrets** : refusée, « prépaiement épuisé » (erreur 402). Les modèles `gemini-2.5-flash-image` (Nano Banana), `gemini-3.1-flash-image` et `nano-banana-pro-preview` existent bien sur la clé ; il faut recharger le prépaiement dans AI Studio (quelques dollars = plusieurs centaines d'images).
- **Plateforme de flux créatifs (ElevenLabs)** : l'estimation est de 251 crédits (≈ 2,5 cents) l'image, mais le quota est épuisé (47 crédits restants sur 10 000).
- **Application web Gemini dans le Chrome de Benj** : l'image se génère (« généré par IA »), mais l'automatisation n'arrive ni à l'afficher (zone noire en arrière-plan) ni à la télécharger. Voie manuelle seulement pour l'instant.
