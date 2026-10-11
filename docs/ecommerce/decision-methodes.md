# Décision e-commerce — premier jet du chef (05/10/2026, soir)

*Statut : **hypothèse de travail**, à confirmer par les recherches des agents (tâches `ecom-2026-10-05-01` à `-07`, brouillons à recouper) et par un essai à budget zéro. Aucun chiffre ci-dessous n'est « prouvé » : ce sont des ordres de grandeur du chef, marqués comme tels. Benj a dit que l'e-commerce serait « le plus rentable rapidement » ; ses analyses « de tête » sont à confronter à ce tableau.*

## Cap de Benj, 05/10 nuit (remplace le classement ci-dessous pour l'ordre de travail)
**Trio : eBay + TikTok + TikTok Shop, produits trouvés sur AliExpress et Alibaba. Une seule boutique d'abord (eBay) ; Shopify passe en second** (payant dès l'essai fini, alors qu'eBay se démarre sans abonnement). Le pack de pubs UGC reste la seconde ligne de revenu et devient le **moteur de contenu du trio** : les vidéos produit du Studio servent TikTok et TikTok Shop.

| Rôle | Plateforme | Ce que font les agents | Geste humain unique de Benj |
|---|---|---|---|
| Vente | **eBay, compte particulier de Benj (fil_2579)** | fiches, prix d'après les ventes réellement conclues, suivi des annonces par l'API officielle | finir la vérification développeur, cliquer « autoriser » une fois |
| Audience | **TikTok : compte Brico Travaux** (4 000+ abonnés) | scénarios, vidéos courtes, légendes, calendrier | rien |
| Vente + audience | **TikTok Shop**, ouvert depuis Brico Travaux | fiches produit et vidéos liées aux produits | ouvrir la boutique (les pièces demandées par TikTok sont à lui) |
| Sourcing | **AliExpress, Alibaba** | repérer les produits : prix d'achat, volumes, avis, délais, variantes ; écart de prix déjà accepté par les acheteurs | commander un échantillon, payer les fournisseurs |

**Points à ne pas rater** (à vérifier par la recherche 02, sur les pages officielles ; je ne les affirme pas comme prouvés) :
- **Faits relevés le 05/10/2026 (sources de presse et de blogs, à confirmer sur les pages officielles) :**
  - **eBay.fr, vendeur particulier de l'EEE : plus de frais de vente depuis le 1er septembre 2026** ; les frais sont déplacés vers l'acheteur (« protection acheteur » : 0,10 € + 2 à 7 %, inclus dans le prix affiché). Au-delà de **150 annonces par mois**, les frais reviennent. Les versements ne sont plus automatiques (demande manuelle). Sources : [justgeek](https://www.justgeek.fr/ebay-supprime-frais-vente-particuliers-157677/), [dealabs](https://www.dealabs.com/discussions/ebay-chamboule-tout-la-vente-devient-gratuite-pour-les-particuliers-mais-lacheteur-va-payer-a-partir-du-1er-septembre-2026-3384536). Conséquence : le prix que l'acheteur voit est plus haut que le prix net du vendeur ; viser des produits où l'acheteur accepte l'écart.
  - **TikTok Shop France :** commission **9 %** (7 % électronique), **4 % pendant 60 jours** pour les nouveaux vendeurs ; **expédition obligatoire depuis la France**, colis emballé en 2 jours ouvrables, livré en 4, annulation automatique après 7 jours : **le dropshipping depuis la Chine / AliExpress n'y est pas possible** (source : [speed-ecom](https://speed-ecom.eu/blog/tiktok-shop-france-2026-guide-complet-vendre/), [ecommerce-nation](https://www.ecommerce-nation.fr/tiktok-shop-les-commissions-doublent-janvier-2026/)). Les sources divergent sur le statut du vendeur (une exige un SIRET, l'autre accepte « vendeur individuel ») : **à trancher sur la page officielle TikTok Shop Seller Center** avant tout geste de Benj.
  - Catégories qui performent sur TikTok en 2026 (trendtrack, minea) : beauté et soins, cadeaux personnalisés, vêtements ; au-delà de ~50 € la conversion chute ; clientèle de plus en plus de plus de 35 ans.
- Conséquence sur le sourcing : **AliExpress et Alibaba servent à repérer les produits, les prix d'achat et les fournisseurs ; la vente passe par un stock en France ou en Europe** (TikTok Shop l'exige ; eBay sanctionne les délais longs). Piste : AliExpress « livraison depuis l'Europe », ou un lot test acheté et réexpédié depuis la France.
- Produits : marquage CE et sécurité obligatoires dans l'UE (jouets, électrique, cosmétique), marques protégées refusées d'office, TVA et import à intégrer au prix de revient.
- Décision de Benj : on vend avec son **compte particulier** eBay ; les agents ne reviennent pas dessus avec lui. Ils tiennent seulement le **volume vendu** dans leur suivi interne (garde-fou de la loi demandé : rester dans le cadre légal).
- Aucune création de compte par les agents ni par Claude Code.
- Critère d'arrêt de l'essai : 3 produits, 14 jours, aucune vente ni intention d'achat mesurable → on change de produits, pas de plateforme.

## Ce que montrent les vidéos (4 TikTok analysés image par image : `sources/`)
| Vidéo | Méthode | Ce qui est utilisable | Ce qui est écarté |
|---|---|---|---|
| adamswice (23 s et 71 s) | eBay « particulier » + EBX + Product Sniper, source AliExpress / Amazon | l'idée de **filtrer des produits candidats** par un agent (marques protégées, produits réglementés refusés) | dropshipping Amazon→eBay (restreint par eBay et Amazon), « IA anti-ban » (contournement de plateforme), compte « particulier » pour vendre en volume (requalification) |
| AutoDS + buildyourstore.ai | outils d'automatisation + boutique Shopify, pubs d'autres annonceurs | l'automatisation de la **fiche produit** et de la veille de produits | republier les pubs d'autrui (droit d'auteur, règles TikTok/Meta), faux prix barrés (pratique trompeuse), capture « Cash out » non prouvée |
| lgn_creates (34 s) | livres de coloriage IA vendus sur Amazon KDP | produit numérique sans stock, **dossier de dépôt prêt à coller** (le dépôt reste humain) | recréer la scène d'un livre protégé (œuvre dérivée), chiffres non prouvés, déclaration IA obligatoire |

Aucune des quatre vidéos ne montre une vente prouvée, ni la logistique, ni les retours, ni la TVA : tout chiffre de revenu y est **non prouvé**.

## Méthodes comparées (ordres de grandeur du chef, à vérifier)
| # | Méthode | Départ | Délai 1re vente | Marge nette / vente | Risque | Charge humaine | Fait par les agents |
|---|---|---|---|---|---|---|---|
| 1 | **Pack de pubs UGC vendu à des e-commerçants** (service Presti, déjà conçu : 5 vidéos à 490 €) | ≈ 0 € (outils gratuits, voix locale) | 1 à 3 semaines après les premiers envois | élevée (service : pas de stock, pas de livraison) | faible (droit : voix et visages générés, mentions) | validation du pack | repérage (Meta Ad Library), génération, relecture |
| 2 | **Boutique de niche propre** + fournisseur UE + contenu court organique | 0 à 100 € (domaine, thème) | 2 à 6 semaines | 10 à 30 % après frais (très variable) | moyen (retours, délais, TVA, litiges) | commandes et SAV | fiches, veille, contenus |
| 3 | **Impression à la demande** (sans stock) | 0 € | 1 à 4 semaines | 10 à 25 % | moyen (qualité, droits) | peu | visuels, fiches |
| 4 | **Produits numériques / livres** (KDP, modèles) | 0 € | 2 à 8 semaines | élevée par vente, ventes incertaines | moyen (propriété intellectuelle, déclaration IA, compte plateforme) | dépôt humain | création, préparation du dossier |
| 5 | Dropshipping sur marketplaces (Amazon→eBay) | 0 à 100 € | rapide en apparence | faible, litiges | **fort : interdit ou restreint, suspension** | élevée | — **écarté** |

## Classement (hypothèse)
1. **Pubs UGC vendues aux e-commerçants** : c'est de l'e-commerce **sans les pièges de l'e-commerce** (pas de stock, pas de livraison, pas de retour). Déjà construit dans l'écosystème (Studio, repérage des annonceurs). Premier à lancer.
2. **Boutique de niche propre** (essai à budget zéro sur 3 produits) : seconde voie, pour apprendre la conversion et fournir de vraies pubs de démonstration au pack n° 1.
3. Impression à la demande, 4. produits numériques : en renfort, sans priorité.
5. Dropshipping marketplaces : écarté.

**Contre-argument retenu** (le plus fort) : sans premier client, le pack n° 1 reste théorique ; il dépend de l'envoi à froid et de la qualité des vidéos. D'où la voie n° 2 en parallèle : elle produit des preuves (ventes réelles, chiffres) et du contenu.

## Plan de la voie n° 1 (étapes, rôles, garde-fous)
Repérer des annonceurs (bibliothèque publicitaire Meta, jeton posé le 05/10, valide jusqu'au 24/11) → Studio génère un échantillon (une vidéo de LEUR produit, offerte) → relecture conformité → premier contact (**envoi à froid : conditions du code, STOP, plafonds, paliers**) → pack vendu. Gestes humains : validation du pack, paiement, éventuels accords de droits. Critère d'arrêt : 100 contacts sans 10 « oui ».

## Essai à budget zéro de la voie n° 2
3 produits en précommande d'abord (aucun achat), page + contenus courts, 14 jours ; on arrête si aucune intention d'achat mesurable. Aucune dépense, aucun compte créé sans accord de Benj.

## Ce que cette analyse ne sait pas (à lever)
- Coût d'acquisition réel et conversion en France en 2026 (recherches 01 et 03 en cours).
- Prix acceptable d'un pack UGC pour un petit e-commerçant (à tester à 490 €, puis moins cher si 0 « oui »).
- Règles exactes de chaque plateforme (recherche 02, liens des conditions officielles).
- Les « analyses de tête » de Benj : à lui demander ; elles servent de contre-hypothèse.
