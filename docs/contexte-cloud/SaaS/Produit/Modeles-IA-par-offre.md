# Sélecteur de modèles IA par fonctionnalité (levier d'abonnement)

> Idée Benj (2026-08-14) : comme le sélecteur de modèles de Claude, **chaque fonctionnalité IA** (chiffrage devis, réponse client, relances, factures…) propose **plusieurs modèles**. Les plus performants = **réservés à l'abonnement payant**. Double intérêt : meilleurs résultats + argument d'upsell. Lié à [[Architecture-v2-Devis-Factures-SiteClient]] et aux [[Tarifs]].

## Mapping niveaux ↔ modèles ↔ offre
| Niveau (nom côté artisan) | Modèle réel | Offre | Idée |
|---|---|---|---|
| **Standard** | `claude-haiku-4-5` | Gratuit (inclus) | Rapide, fiable, coût mini |
| **Pro** | `claude-sonnet-5` | **Pro 39 €** | Plus précis / nuancé |
| **Expert** | `claude-opus-5` | **Business 79 €** | Le meilleur résultat (chiffrage & rédaction les plus fins) |

*(Noms « Standard / Pro / Expert » choisis pour des artisans non-techniques — pas « Haiku/Opus ».)*

## Fonctionnement
- **UI** : petit sélecteur (style Claude) dans chaque interface de fonctionnalité. Les options premium sont **affichées mais verrouillées 🔒** si le plan ne les inclut pas → clic = invite « Passer à Pro/Business ».
- **Gating serveur** : chaque endpoint IA lit `artisans.plan` ('gratuit' | 'pro' | 'business'). Si le modèle demandé dépasse le plan → **refus + repli sur Standard** (jamais de premium offert gratuitement).
- **Cohérence coût** : les modèles premium coûtent plus cher par appel → logique de les réserver au payant.
- **Champ modèle** : optionnel dans chaque appel (`{ model: 'standard'|'pro'|'expert' }`), résolu côté serveur vers l'ID réel après vérification du plan. Le mapping vit **uniquement côté serveur** (`lib/models.ts`), jamais exposé au client.

## Dépendances
- **Aujourd'hui** : gating basé sur `artisans.plan` (réglable à la main). Fonctionnel sans Stripe.
- **Étape 10 (Stripe)** : l'abonnement met `plan` à jour automatiquement → les modèles se déverrouillent tout seuls.

## À appliquer sur
Chiffrage devis (flagship, en premier), réponse client (générateur + auto-réponse), relances, génération de factures. Même composant sélecteur réutilisé partout.
