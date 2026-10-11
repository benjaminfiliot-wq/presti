# Connecteurs et sources pour analyser le marché e-commerce (05/10/2026)

*Demande de Benj : que tous les connecteurs qui permettent d'analyser le marché soient branchés à l'e-commerce, même si les agents sont entraînés pour. État vérifié ce jour ; « à brancher » = il manque une clé ou un compte de Benj.*

| Besoin | Outil | État | Qui l'utilise | Ce qu'il faut |
|---|---|---|---|---|
| Lire une page publique (fiches produit, boutiques concurrentes, conditions des plateformes) | **Firecrawl** | **branché** : clé valide (282 crédits sur 1 000), dans le coffre de l'usine (`FIRECRAWL_API_KEY`) | agents de veille / preneur | surveiller les crédits |
| Recherche web sourcée (tendances, règles, chiffres) | **Perplexity** (connecteur Claude) | **branché côté chef seulement** (pas de clé API pour l'usine) | Claude Code, comme appui | clé API Perplexity si on veut les agents de l'usine dessus |
| Publicités des concurrents et annonceurs | **Bibliothèque publicitaire Meta** | **branché** : jeton valide jusqu'au 24/11 | vigie Meta, studio | renouveler le jeton avant le 24/11 |
| Scraping structuré (vidéos TikTok, meilleures ventes, tendances, avis) | **Apify** (acteurs) | **branché le 06/10** : jeton valide dans `presti-secrets/apify api.txt` (compte gratuit, plafond 5 $/mois, 0 $ utilisé au départ) ; premier essai réussi : `apidojo/tiktok-scraper` (0,0003 $ par vidéo, 10 vidéos par recherche) → `recherches/demande-tiktok-apify-0610.md`. **Pas encore au coffre de l'usine** (le coffre refuse les clés de modèle, pas celle-ci : à ajouter proprement avec ses juges) ; le connecteur Claude `plugin:apify` demande une autorisation (réglages des connecteurs) | Claude Code (mesure de la demande) ; les agents quand le jeton sera au coffre | coffre `APIFY_TOKEN` avec plafond de crédits ; connecteur Claude à autoriser par Benj |
| Catalogue de fournisseurs européens livrables (dropshipping) | **Shopify Collective** (outil `search-collective-product-candidates` du connecteur Shopify) | **connecteur présent**, nécessite une boutique Shopify de test | chef, agent e-commerce | boutique Shopify (essai gratuit) créée par un agent ou par Benj |
| Données de ventes / audiences / pubs de nos comptes | **Windsor.ai** | **branché** (Instagram ; essai) : démographie agrégée, commentaires | agent pubs / TikTok | brancher TikTok et Meta Ads quand ces comptes existent |
| Tendances de recherche | **Google Trends** (public, sans clé) | disponible par lecture web (Firecrawl) | veille produits | rien |
| Tendances TikTok (hashtags, produits) | **TikTok Creative Center** (public) | disponible par lecture web | veille, TikTok Brico Travaux | rien |
| Prix vendus réels eBay | **eBay Marketplace Insights / Browse API** ; **AnythingMCP, connecteur « eBay Sell »** (inventaire, offres, commandes ; OAuth) | **disponible dans AnythingMCP (5 connecteurs restants sur le plan)** : il faut l'App ID eBay (compte développeur en cours de vérification), le Cert ID et un jeton saisis par Benj sur la page de AnythingMCP ; **pas de connecteur TikTok ni AliExpress dans son catalogue** (recherche du 06/10) | analyse de marge, annonces |
| (ancienne ligne) eBay Marketplace Insights / Browse API | — | **à brancher** (clé développeur eBay, accès restreint) | analyse de marge | compte développeur eBay ; sinon lecture des annonces « vendus » en public |
| Mesure interne (nos ventes, coûts, quotas) | connecteur **Presti** (StarNet) + base | **branché** | tous | — |

| Données d'entreprises et de contacts B2B | **Vibe Prospecting** (connecteur Claude) | **branché par Benj le 06/10, OPÉRATIONNEL (outils chargés, autocomplete et statistiques répondent)** ; usage : repérer des entreprises (artisans, annonceurs) depuis Claude Code SEULEMENT ; **aucune donnée issue de ce connecteur ne part vers une IA gratuite ni le Savoir général** (données de prospects). Exploration gratuite (autocomplete, fetch-entities-statistics) ; tout export coûte des crédits : `estimate-cost` d'abord, jamais d'export sans accord explicite de Benj. Mesure du 06/10 (statistiques seules, aucune ligne exportée) : **74 526 entreprises du bâtiment en France, 1 à 10 salariés, avec site web** (construction 72 403 ; construction résidentielle 1 575 ; bâtiment 548), presque toutes entre 500 k et 1 M de chiffre d'affaires. Reste à vérifier avant tout envoi à froid : conditions de `envoi_froid` (formulaire de site, notice de moins de 7 jours) | Claude Code | utilisable |

## Règles
- Données publiques seulement ; jamais de donnée de prospect ou de client vers une IA gratuite.
- Aucune dépense ni création de compte sans l'accord de Benj ; les crédits d'API sont plafonnés dans le coffre.
- Chaque chiffre repris d'un outil porte sa source et sa date ; sinon « non vérifié ».

## Ce que Benj peut donner pour débloquer (facultatif, dans l'ordre d'utilité)
1. Un **jeton Apify** (apify.com, compte gratuit) : le plus utile pour les meilleures ventes et les tendances.
2. Une **boutique Shopify d'essai** pour le catalogue de fournisseurs.
3. Un **compte développeur eBay** pour les prix réellement vendus.
