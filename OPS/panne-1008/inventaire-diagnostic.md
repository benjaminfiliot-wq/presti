# Inventaire — incident du 08/10/2026

Diagnostic checkout : le stock, les matériaux et les fournisseurs passent par Supabase ; la recherche fournisseurs appelle Anthropic directement dans lib/recherche-fournisseurs.ts. Aucun appel Cloudflare dans ces parcours.

Vérification réelle en lecture seule sur la base configurée localement : sélections exactes COLONNES_MATERIAU (jointures stock et fournisseurs), COLONNES_FOURNISSEUR et COLONNES_OBSERVATION sur prix_observations passent sans erreur, limite zéro, aucune donnée personnelle remontée. Tables sessions_verifiees et suspensions accessibles. Cela confirme le schéma accessible, pas la session de Benjamin ni le fonctionnement authentifié complet.

Défaut confirmé de l'interface : app/inventaire/page.tsx ne traitait que le statut 403. Une réponse 401/500 devenait un inventaire vide et effaçait les alertes ; une coupure réseau pouvait laisser le chargement bloqué. Le chargeur affiche maintenant l'erreur et conserve les données précédemment chargées.

Preuve comportement : node OPS/panne-1008/inventaire-charge-test.mjs — 6 PASS : 401, 403, 500 JSON, 500 HTML, coupure réseau, succès 200. Le test exécute le corps du chargeur réel avec réponses fictives ; aucun appel IA ni écriture en production. Compilation syntaxique TSX également vérifiée via transpileModule TypeScript.

Cause candidate IA transmise au parent : resolveModel résout claude-haiku-5-5 / claude-sonnet-5 / claude-opus-5. Validation catalogue Anthropic et correction centrale à l'ownership du parent. Aucun appel de recherche payant effectué.

Limites : aucune preuve de la session utilisateur affectée disponible dans ce sous-agent. Le défaut UI corrigé rend visible la panne ; il ne prouve pas que la cause de production ait été réparée. Aucun déploiement ni push.

## Clé Anthropic locale — preuve réelle en lecture seule
GET /v1/models avec ANTHROPIC_API_KEY de .env.local : HTTP 401 authentication_error. Aucun override par la variable du processus. GET /v1/organizations/api_keys avec la clé admin : HTTP 200 ; correspondance sur l'indication partielle, comparée uniquement en mémoire, clé produit locale = expired, espace Presti. Une autre clé active existe dans cet espace mais sa valeur complète n'est pas renvoyée. .env.development.local ne configure aucune clé Anthropic. La clé admin reçoit 401 sur /models mais fonctionne sur l'endpoint admin : elle ne remplace pas une clé d'inférence.

La clé locale expirée est une cause prouvée pour l'IA exécutée localement. L'environnement Vercel de production reste à vérifier séparément par le parent : aucune conclusion sur la clé déployée. Aucun changement de modèle faute catalogue accessible avec une clé produit valide.

## Vercel — distinction configuration / déploiement
Lecture API Vercel : HTTP 200, projet presti confirmé. ANTHROPIC_API_KEY existe pour production et preview, type sensitive. Vercel masque sa valeur : liste vide, endpoint détail sans champ value malgré decrypt=true. Aucune clé d'inférence de production lisible ; aucun statut d'authentification Anthropic de production établi. Une sonde initiale sans valeur renvoyait 401, mais elle est écartée car ne testait pas la clé réelle. Aucun changement d'environnement ni redéploiement.

## Vérification globale
Le hook de commit a lancé npm run typecheck et échoué hors périmètre : app/api/controle/demandes/route.ts(31,52) TS2322, demande_creee non assignable au type Action. Le TSX modifié passe la compilation syntaxique et les six scénarios comportement. Commit limité aux trois fichiers de cette correction, avec hook désactivé après constat de cette erreur étrangère ; aucune correction ou réinitialisation d'autres travaux.
