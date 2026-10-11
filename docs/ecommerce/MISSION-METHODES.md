# Mission e-commerce — comparer les méthodes et en déduire la meilleure

*Consigne de Benj, 05/10/2026 : « pour l'e-commerce, il y a plusieurs méthodes pour l'écosystème, et ce sera à eux d'en déduire la meilleure, ce qui me prouvera leurs capacités de réflexion. »*

## Ce que l'équipe doit faire

Rendre **une décision argumentée** : quelle méthode e-commerce Presti doit lancer en premier, laquelle ensuite, lesquelles abandonner, et pourquoi. La décision est jugée sur la qualité du raisonnement, pas sur l'enthousiasme.

## Les quatre sources (analyses image par image, dans `sources/`)

| Source | Méthode montrée | Remarque de l'analyse |
|---|---|---|
| `adamswice-…4794479904` (23 s) | eBay « particulier » + EBX (ebx.army) + Product Sniper, source AliExpress | « échauffement » du compte et anti-ban à ne pas reproduire ; marges d'une capture de démo |
| `adamswice-…0634009889` (71 s) | EBX, dropshipping Amazon → eBay, 15 → 50 produits/jour | Amazon → eBay restreint par eBay ; modes « agressifs » ; aucune preuve de vente |
| `autods-…8078336` (24 s, 960 000 vues) | AutoDS + buildyourstore.ai + Shopify, pubs d'autres annonceurs | publicité de l'outil ; reprise de pubs = droit d'auteur ; faux prix barrés = pratique trompeuse |
| `lgn_creates-…2442823` (34 s) | Livres de coloriage générés par IA vendus sur Amazon KDP (Higgsfield) | sponsorisée ; le prompt copie une œuvre ; chiffres faux ; KDP exige de déclarer l'IA |

## Règles du jeu (non négociables)

1. **Aucune dépense, aucun compte, aucun envoi, aucune mise en ligne** tant que Benj n'a pas dit oui : le drapeau `ecommerce` reste éteint (lib/flags.ts). La mission est une ÉTUDE et un PLAN, chiffrés.
2. **Honnêteté des sources** : une promesse de revenu d'une vidéo est « non prouvée » tant qu'une source indépendante ne la confirme pas. Dire « non vu » / « non vérifié » plutôt qu'inventer.
3. **Droit et plateformes** : pour chaque méthode, vérifier aux textes en vigueur (conditions eBay, Amazon KDP, Shopify ; droit de la consommation français : rétractation 14 jours, garantie de conformité, délais, marquage CE, pratiques commerciales trompeuses ; TVA : franchise en base art. 293 B de Presti, OSS/IOSS ; RGPD : adresses envoyées à des fournisseurs hors UE ; DAC7). Aucune astuce contre la détection d'une plateforme, aucune création en série de comptes, aucun scraping contre les conditions, aucune copie de l'œuvre ou de la publicité d'autrui.
4. **Gestes humains obligatoires** : compte vendeur professionnel, vérification d'identité, SIRET, IBAN, jetons OAuth/API (dans presti-secrets), premier lot, paiements.
5. **Données** : aucune donnée de prospect ou de client vers une IA gratuite ou un modèle `:cloud`.

## Livrable attendu (dans `docs/ecommerce/decision-methodes.md`)

- Un tableau comparatif chiffré : investissement de départ, coût par mois, marge nette réaliste après frais, TVA, délai avant la première vente, risque de suspension, charge humaine, ce que les agents font seuls.
- Le **classement** des quatre méthodes, avec le raisonnement qui y mène, y compris les contre-arguments écartés.
- Pour la méthode retenue : le plan en étapes, les rôles d'agents, les garde-fous, les gestes de Benj, un **test à budget zéro** (essai à blanc) et le critère qui dit « on arrête ».
- Une section « ce que cette analyse ne sait pas » : les inconnues, et comment les lever.

## Qui fait quoi

Le chef distribue ; le recenseur et le rédacteur recueillent et rédigent ; la conformité et le comptable contrôlent le droit et la TVA ; un second agent, indépendant, relit et attaque la conclusion avant qu'elle soit retenue. Aucun agent ne valide son propre raisonnement.
