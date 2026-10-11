# Rendu du 05/10/2026 — e-commerce, pubs Meta, refonte Presti (puis production)

Un seul document, trois chantiers, ce qui tourne déjà, ce qui manque, et **les comptes à créer** (la seule chose qui reste à Benj). Rien ci-dessous n'est « prouvé » au sens d'un chiffre de vente : ce sont des décisions de travail.

## 1. E-commerce (priorité 1)
**Décision de travail** (détail et sources : `docs/ecommerce/decision-methodes.md`, `connecteurs-marche.md`) :
1. **Pack de pubs UGC vendu à des e-commerçants** (service Presti : 5 vidéos, 490 €) — sans stock ni livraison ; déjà construit (Studio, repérage des annonceurs). **Premier à lancer.**
2. **Boutique de niche propre** (essai à budget zéro sur 3 produits) — pour apprendre la conversion et produire de vraies pubs de démonstration.
3. Impression à la demande, en renfort. *(Livres de coloriage / KDP : retiré sur ordre de Benj.)* Dropshipping Amazon→eBay : **écarté** (règles des plateformes).
**Choix de produits** : peu chers à l'achat, demande déjà prouvée (prix réellement vendus, volumes), écart de prix accepté par les acheteurs — jamais « monter le prix » d'un produit qui ne se vend pas.
**Qui fait quoi** : les 7 recherches des agents sont faites (brouillons, à recouper) ; le Chef a déjà créé des tâches produits/fournisseurs ; Firecrawl, bibliothèque Meta, Windsor et Apify (jeton à poser) alimentent l'analyse ; l'API eBay vient avec le compte développeur.
**Plateformes évaluées** : Shopify (API complète : **retenue pour automatiser**), eBay (API officielle + consentement unique), Amboras (**sans API publique** trouvée : option de boutique d'essai, pas pour le full auto).

## 2. Pubs Meta (service aux annonceurs)
Chaîne : repérer les annonceurs (bibliothèque publicitaire Meta, jeton valide jusqu'au 24/11) → le Studio génère un échantillon (une vidéo de LEUR produit, offerte ; Nano Banana Pro + les autres outils) → relecture conformité → premier contact (**envoi à froid : voie B, palier P0 = 5 par jour**, STOP, opposants, plafonds, notice en ligne et vérifiée) → vente du pack. Le compte TikTok « Brico Travaux » (4 000+ abonnés) est confié au Chef : premier client qui accepte sa pub, sinon pubs de Presti.

## 3. Refonte du site et de l'app Presti
Phases : **audit** de l'existant (ce qui est vieux, ce qui manque) → **maquettes** au niveau du kit Figma (animations, nouvelle landing **avec le formulaire d'entrée** qui manque aujourd'hui) → **construction** par l'atelier / rédacteur de sites, juges de qualité → **mise en ligne**. Le Chef planifie ; Codex (retour le 9/10 à 21 h 15) porte la construction lourde.

## 4. Les comptes à créer (liste unique, ~10 minutes chacun, une fois)
Les agents ne créent aucun compte, n'acceptent aucune condition et ne saisissent aucune coordonnée bancaire à ta place ; une fois le compte créé, ils font tout le reste par les API.
| # | Plateforme | Pourquoi | Ce que Benj fait | Priorité |
|---|---|---|---|---|
| 1 | **eBay, compte particulier de Benj (fil_2579)** — **boutique n° 1 (cap de Benj, 05/10 nuit : « en particulier on peut vendre »)** | vendre ; API de vente ; démarrage sans abonnement | finir la vérification du compte développeur, cliquer « autoriser » une fois | **haute** (après vérification, ≤ 1 jour) |
| 2 | **TikTok Brico Travaux** (4 000+ abonnés) + **TikTok Shop** | vendre et faire de l'audience avec les mêmes vidéos | ouvrir TikTok Shop depuis le compte Brico Travaux | **haute** |
| 3 | **Apify** | meilleures ventes AliExpress / Alibaba, tendances | jeton dans `presti-secrets/apify-token.txt` (le fichier `apify api.txt` est déjà là : à renommer ou me dire « posé ») | haute |
| 3 bis | **AliExpress, Alibaba** (sourcing) | trouver les produits et leurs prix d'achat | rien pour analyser ; un compte acheteur seulement le jour d'un échantillon | à la demande |
| — | ~~Shopify~~ | repoussé : payant dès l'essai fini ; retenu seulement si eBay + TikTok Shop montrent des ventes | le fichier `shopify api.txt` déjà déposé reste au chaud | basse |
| 4 | **Page / Business Manager Meta de Presti** et compte publicitaire | publier pubs, mesurer | vérifier que la Page Facebook Presti est liée à un Business Manager ; créer le compte publicitaire (sans dépense) | moyenne |
| 5 | **TikTok pour entreprise** (Brico Travaux) | pubs et statistiques | activer le compte professionnel sur Brico Travaux | moyenne |
| 6 | **Fournisseurs UE** (candidats à tester par les agents : BigBuy, Spocket, CJ Dropshipping, Printful/Printify) | approvisionnement | rien tant que les agents n'ont pas désigné le ou les retenus ; puis créer 1 compte | à la demande |
| 7 | **Google Merchant Center / Ads** | uniquement si Google Shopping est retenu | rien pour l'instant | basse |
| 8 | Amboras (option sans API) | boutique d'essai rapide | facultatif | basse |

## 5. Passage en production
Ordre : (1) comptes 1 à 3 ; (2) les agents lancent l'essai à budget zéro (3 produits en précommande) ; (3) premiers contacts annonceurs au palier P0 ; (4) refonte du site en parallèle ; (5) le Chef re-planifie chaque jour (réunion de 18 h). Critères d'arrêt : 100 contacts sans 10 « oui » ; essai produits sans intention d'achat en 14 jours.
