# Connecteurs et sources pour analyser le marché e-commerce (05/10/2026)

*Demande de Benj : que tous les connecteurs qui permettent d'analyser le marché soient branchés à l'e-commerce, même si les agents sont entraînés pour. État vérifié ce jour ; « à brancher » = il manque une clé ou un compte de Benj.*

| Besoin | Outil | État | Qui l'utilise | Ce qu'il faut |
|---|---|---|---|---|
| Lire une page publique (fiches produit, boutiques concurrentes, conditions des plateformes) | **Firecrawl** | **branché** : clé valide (282 crédits sur 1 000), dans le coffre de l'usine (`FIRECRAWL_API_KEY`) | agents de veille / preneur | surveiller les crédits |
| Recherche web sourcée (tendances, règles, chiffres) | **Perplexity** (connecteur Claude) | **branché côté chef seulement** (pas de clé API pour l'usine) | Claude Code, comme appui | clé API Perplexity si on veut les agents de l'usine dessus |
| Publicités des concurrents et annonceurs | **Bibliothèque publicitaire Meta** | **branché** : jeton valide jusqu'au 24/11 | vigie Meta, studio | renouveler le jeton avant le 24/11 |
| Scraping structuré (meilleures ventes Amazon / AliExpress / eBay vendus, tendances TikTok, avis) | **Apify** (actors) | **connecteur déconnecté ce soir** ; aucun jeton sur l'usine | — | **jeton API Apify** (compte gratuit possible) : à fournir par Benj, puis poser au coffre (nom `APIFY_TOKEN`, plafond de crédits) |
| Catalogue de fournisseurs européens livrables (dropshipping) | **Shopify Collective** (outil `search-collective-product-candidates` du connecteur Shopify) | **connecteur présent**, nécessite une boutique Shopify de test | chef, agent e-commerce | boutique Shopify (essai gratuit) créée par un agent ou par Benj |
| Données de ventes / audiences / pubs de nos comptes | **Windsor.ai** | **branché** (Instagram ; essai) : démographie agrégée, commentaires | agent pubs / TikTok | brancher TikTok et Meta Ads quand ces comptes existent |
| Tendances de recherche | **Google Trends** (public, sans clé) | disponible par lecture web (Firecrawl) | veille produits | rien |
| Tendances TikTok (hashtags, produits) | **TikTok Creative Center** (public) | disponible par lecture web | veille, TikTok Brico Travaux | rien |
| Prix vendus réels eBay | **eBay Marketplace Insights / Browse API** | **à brancher** (clé développeur eBay, accès restreint) | analyse de marge | compte développeur eBay ; sinon lecture des annonces « vendus » en public |
| Mesure interne (nos ventes, coûts, quotas) | connecteur **Presti** (StarNet) + base | **branché** | tous | — |

## Règles
- Données publiques seulement ; jamais de donnée de prospect ou de client vers une IA gratuite.
- Aucune dépense ni création de compte sans l'accord de Benj ; les crédits d'API sont plafonnés dans le coffre.
- Chaque chiffre repris d'un outil porte sa source et sa date ; sinon « non vérifié ».

## Ce que Benj peut donner pour débloquer (facultatif, dans l'ordre d'utilité)
1. Un **jeton Apify** (apify.com, compte gratuit) : le plus utile pour les meilleures ventes et les tendances.
2. Une **boutique Shopify d'essai** pour le catalogue de fournisseurs.
3. Un **compte développeur eBay** pour les prix réellement vendus.
