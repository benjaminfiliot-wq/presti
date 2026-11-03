## Ressources utilisées

- **MCP cerveau** (`regles_pour`, tâche de branchement des comptes) : a rendu une liste vide ; aucune règle de plus que celles du dépôt, relues à la main
  (`securite.md` : un agent ne crée aucun identifiant ni ne saisit de secret ; `architecture-outils.md` : n8n-first ; `migration-production.md`).
- **MCP n8n-oracle** : `get_node_types` (nœuds `dataTable` v1.1 : opérations `get`, `insert`, `upsert`, forme des filtres et des colonnes) et `get_workflow_best_practices`
  (`scheduling`) → l'état vit dans des tables de données n8n (pas de migration), et le délai maximal de 240 s sous l'intervalle de 5 min empêche deux passages de se chevaucher.
- **Plans lus** : `outillage/OUTILLAGE.md` (O1, O3 voie a), `fiches-depots.md` fiche 9 (n8n-dynamic-credentials-example : jeton et adresses de n8n restent sur le serveur) →
  le workflow lit la base à intervalle, n8n n'est pas exposé ; `lib/connexions/` (036-009) et `scripts/deployer-client-n8n.mjs` (036-012) réutilisés tels quels.
- Non chargés faute d'utilité ici : skills de design/vidéo ; `security-review` et `presti-audit-attaque` non lancés (un auditeur distinct doit relire : voir les risques).

## Ce qui est livré
- `scripts/deployer-client-n8n.mjs` : en plus du déployeur à blanc, la logique du provisionnement (planifier, liaisonsDe, lierCopie, ouvrirSecretN8n, corpsIdentifiant…) et
  `--provisionnement` qui génère `presti-provisionnement.workflow.json` (20 nœuds, inactif, à blanc, sans identifiant réel). Le code des nœuds Code est la copie exacte (toString) des fonctions testées.
- `scripts/provisionnement-qa.mjs` : rejoue ce code généré contre un faux n8n et une fausse base ; 11 épreuves (P1 à P11), 20 mutants tous rouges.
- `plans/011-cadrage-01-11/p6-signature/provisionnement.md` : le chemin, et les gestes restants.
- Aucun fichier de `lib/connexions/` ni de `app/api/connexions/` modifié : `retour()` laisse déjà la ligne `active` avec `secret_n8n`, c'est la ligne « à provisionner » (pas de migration permise).

## Défauts trouvés par le juge pendant la construction (et corrigés)
- trois connexions d'un même client créaient trois fois chaque copie dans un passage (20 copies au lieu de 10) → un geste par copie et par passage ;
- deux actions sur la même ligne d'état dans un passage se réécrivaient (perte d'un identifiant) → une par connexion et par passage ;
- un retrait laissait réactiver les copies par une autre connexion → activation refusée avec un identifiant retiré, expiré ou supprimé ;
- les gabarits portent des nœuds d'outils que le client n'a pas branchés → ces nœuds sont désactivés, et l'activation exige Supabase et l'IA de Presti liés.

## Sorties des juges
Voir `juge-provisionnement.log` (19+1 mutants), `juge-connexions.log` (39/39), `juge-deployeur.log` (16/16). `npx tsc --noEmit` : sans erreur.

## Ce qui n'est pas prouvé (honnêtement)
Aucun appel réel à n8n (pas de réseau ici) : que `POST /credentials` accepte `gmailOAuth2` avec `oauthTokenData` sur n8n 2.45.7 reste à prouver sur un compte de test par la session du PC,
avant tout `mode: 'reel'`. Voir `provisionnement.md`, « Ce qui n'est PAS prouvé ».
