# Le branchement automatique des comptes (036-021, décision O3 voie a, Benj, 03/11)

Un artisan Studio ou Signature clique « Connecter » : tout le reste est automatique, à blanc d'abord. L'Entreprise sur mesure reste à part
(`offreServie` ne la sert pas).

## Le chemin
1. `retour()` (`lib/connexions/routes.ts`) enregistre la connexion, jetons chiffrés (`secret_n8n`, clé `BOITE_CLE_N8N`), essai de lecture, état `active`.
   **C'est la ligne « à provisionner »** : aucune migration (interdite), donc pas de table de plus côté Presti.
2. Le workflow n8n `presti-provisionnement` (export : `.orchestre/preuves/036-021/presti-provisionnement.workflow.json`, généré par
   `node scripts/deployer-client-n8n.mjs --provisionnement`) passe toutes les 5 minutes (délai maximal 240 s : pas de chevauchement).
3. Un passage : Réglages → lire connexions, comptes, réglages du pilote, état, workflows → **Planifier** → journal du plan → porte **Mode réel ?**
   (sortie vraie seulement) → Préparer la requête → Réserver → Appeler l'API de n8n → Résultat → état + journal → alerte.
4. Une seule action qui change la ligne d'état par connexion et par passage, un seul geste par copie : la suite au passage suivant.

## Ce qui est fait, étape par étape
| Étape | Action n8n | Idempotence |
|---|---|---|
| identifiant | `POST /credentials` (type OAuth2, jetons ouverts en mémoire seulement) | ligne d'état + réservation `en_cours:<type>` écrite AVANT l'appel : un crash ne recrée rien (anomalie journalisée) |
| copies | `POST /workflows`, `client-<slug>-*` depuis `gabarit-artisan-*` (`fabriquerCopie`, garde d'empreinte des nœuds Code), inactives, liées | on ne crée que si le NOM n'existe pas |
| liaison | `PUT /workflows/<id>` ; un nœud sans compte est désactivé ; Studio : tout nœud qui enverrait est désactivé | comparaison des liaisons seules |
| activation | `POST …/activate` | jamais à blanc, jamais hors des comptes de test nommés dans « Réglages », jamais sans Supabase et IA de Presti liés, jamais avec un identifiant retiré, expiré ou supprimé |
| retrait | copies dépendantes désactivées, `DELETE /credentials`, ligne `retire` ; les copies sont reliées à un emplacement et ne se réactivent pas seules | rejeu muet |
| expiration | copies dépendantes désactivées (silence), UNE alerte (`lib-alerter`), identifiant gardé | `alerte_envoyee` |
| renouvellement | ancien identifiant supprimé, neuf créé, copies reliées | — |

État : tables de données n8n `presti_provisionnement` (une ligne par connexion : `connexion_id, artisan_id, slug, fournisseur, identifiants, etape,
alerte_envoyee`) et `presti_provisionnement_journal` (`connexion_id, slug, action, cible, issue, mode`). Jamais un secret, jamais un corps de requête.

## Ce qui n'est PAS prouvé ici (hôte d'agents sans réseau n8n) — gestes pour la session du PC et Benj
1. **L'API de n8n 2.45.7 accepte-t-elle `POST /credentials` pour `gmailOAuth2` avec `oauthTokenData` ?** Seul un faux n8n, qui refuse les propriétés en trop,
   l'a rejoué. À prouver sur un compte de test AVANT d'écrire `reel` : si l'API refuse, la voie (b) de O3 reste ouverte.
2. Importer l'export (inactif), créer les deux tables de données, lier les identifiants `EMPLACEMENT_SUPABASE_PRESTI` et `EMPLACEMENT_N8N_API` et le sous-workflow `lib-alerter`
   (`EMPLACEMENT_LIB_ALERTER`) : gestes de compte, interdits à un agent.
3. Variables d'environnement lues par le workflow : `N8N_API_URL`, `BOITE_CLE_N8N`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (n8n doit les autoriser aux nœuds Code).
4. « Réglages » : `identifiants_presti` (types `supabaseApi`, `anthropicApi` → `{id, name}`), `comptes_de_test`, puis `mode: 'reel'`.
5. Le gabarit `gabarit-artisan-*` doit exister dans n8n (importé tel que dans `.orchestre/preuves/036-013…018`) ; régénérer l'export si un gabarit change (empreintes embarquées).
6. Limite connue : le workflow lit `artisans` (id, plan) et `connexions` par la clé Supabase de n8n ; les types « activés » du pilote viennent de `pilote_reglages`.
