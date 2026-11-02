## Ressources utilisées

- **Réseau neuronal, MCP `cerveau`** : `regles_pour` sur « sauvegarde, migration, données » a rendu `regles-presti/migration-production.md` (colle PUIS drapeau, aucune migration par un agent) et `memoire/migrations-je-les-applique.md`. J'en ai tiré une règle de conception : L9 ne demande aucune migration (pas de fonction `sauvegarde_liste_tables()`), la découverte passe par l'OpenAPI seule. `chercher` a rendu `vault/Produit/Ecosysteme-Plan-2026-09-24.md` §3.2 : « le schéma `ops` n'est pas exposé à l'API publique ». C'est la trouvaille la plus lourde de ce lot (plus bas). Il a rendu aussi `presti/docs/sauvegardes.md` et `vault/wiki/concepts/Sauvegardes - restaurer et garder la cle a part.md` (le format chiffré et `restaurer.mjs` restent compatibles).
- **Skill `reseau-neuronal`** : lecture seule du vault, notes citées par leur chemin, aucune écriture (consigne de la tâche).
- **Skill `supabase-postgres-best-practices`** (`references/data-pagination.md`) : une pagination par OFFSET sans ORDER BY peut sauter ou doubler des lignes. Chaque page est maintenant triée par la clé primaire lue dans l'OpenAPI (`scripts/sauvegarde.mjs:275`). La doublure rend un ordre libre quand le tri manque. Le mutant « tri retiré » est tué.
- **Skill `tdd`** : l'interface testée est publique (la ligne de commande contre une doublure, plus les fonctions exportées). La vérité attendue est indépendante, écrite à la main dans le bloc `attendu` de la fixture, jamais recalculée par le script. Ce principe m'a fait corriger mon propre attendu : Kahn range par couches (`a, e, b, c, d`), pas `a, b, c, d, e`. Chaque mutant est tué par une assertion qui garde encore après cette correction.
- **Skill `ecc:security-review`** : la clé de service ne part que vers `NEXT_PUBLIC_SUPABASE_URL`. Les noms de table et les chemins de stockage sont encodés dans l'URL (`encodeURIComponent`). `.env.local` n'est plus lu quand les variables sont déjà posées (`chargerEnv`). La suite tourne avec un environnement réduit (PATH + URL de la doublure + clé fictive), dans un dossier jetable, avec une paire RSA jetable supprimée en fin de suite.
- **Sources du dépôt** : `plans/011-cadrage-01-11/chantier-4-assistant-plan.md` §4.1 (l.390-410), `plans/011-cadrage-01-11/cadrage-p3.md:100-118`, l'ancien `scripts/sauvegarde.mjs` (liste figée l.49-59), `scripts/restaurer.mjs` (lecture seule, hors périmètre), `scripts/ops-sql-qa.mjs:789-793` (`ops` refusé à PostgREST, même avec la clé de service), `.github/workflows/sauvegarde.yml:46-48` (interface gardée), `.claude/rules/migration-production.md`.
- **MCP `n8n-oracle` : non utilisé**, à dessein. Le workflow `presti-sauvegarde` et le chien de garde relèvent des pas 3 et 4 du §4.1, hors de cette tâche (n8n est dans `interdit`).

## Ce qui change dans `scripts/sauvegarde.mjs` (v2)

- **Découverte** (`decouvrir`, l.262 ; `lireOpenApi`, l.94) : `GET /rest/v1/` avec la clé de service, `Accept: application/openapi+json`. Une relation est un chemin de `paths` hors `/` et `/rpc/…`. On la tient pour une table quand elle a un `post`. Sa clé primaire est lue dans `<pk/>`, ses clés étrangères dans `<fk table='…' column='…'/>` (les descriptions de colonnes de PostgREST). La règle est **fail-closed** : une OpenAPI illisible, ou sans aucune table, fait refuser la sauvegarde sans écrire d'archive. On ne revient jamais à une liste figée.
- **Classement** (`classer`, l.116) : toute relation découverte est soit sauvegardée, soit écartée **avec sa raison**. Il n'y a pas de troisième voie. Une table nouvelle entre sans toucher au code.
- **Ordre** (`ordreRestauration`, l.134) : tri de Kahn, les parents d'abord, les égalités tranchées par ordre alphabétique. Une clé vers soi-même est notée (`auto_references`) sans contraindre l'ordre. Un cycle est rangé en fin et signalé (`cycles`, restauration en deux passes). Un parent écarté est noté (`parents_absents`). `donnees.tables` est rempli dans cet ordre (l.387). `restaurer.mjs` parcourt `Object.entries(donnees.tables)` : il restaure donc déjà les parents d'abord, sans changer une ligne de son code.
- **Lecture** (`lireTable`, l.271) : pages triées par clé primaire, `Prefer: count=exact` sur la première page. Un écart entre les lignes lues et le compte de la base est écrit dans `ecarts_de_lecture`.
- **Manifeste v2** : `relations_decouvertes`, `lignes` (compte par table), `comptes_exacts`, `empreintes` (sha256 par table), `ecartees` (raisons), `schemas_ecartes`, `exclues_absentes`, `ordre_restauration`, `cycles`, `auto_references`, `parents_absents`, plus ce qui existait déjà (comptes, fichiers, `sha256_clair`, chiffrement AES-256-GCM + RSA-OAEP par `cle-sauvegarde.pub.pem`, inchangé). Les buckets restent (`BUCKETS`, l.75).
- **`--verifier <f>`** (`verifierArchive`, l.173) :
  - sans clé : contrôle structurel. La longueur du corps doit égaler `octets_compresses` (l.188, GCM ne change pas la longueur), donc une archive tronquée échoue. L'ordre doit couvrir exactement les tables, et chaque écartée doit avoir une raison ;
  - avec `--cle-privee <pem>` : déchiffrement, sha256, puis comptes **comparés** table par table (l.218), avec les empreintes, l'ordre des tables et les comptes d'auth ;
  - avec `--vivant` : comptes du manifeste comparés à la base (`HEAD`, `count=exact`) ;
  - `--dernier --dossier <d>` prend la plus récente ;
  - le code de sortie fait le verdict ;
  - les archives v1 restent lisibles (contrôle de longueur ; comptes avec la clé).

## La découverte, et ce qu'elle ne peut pas voir

- Schéma `public` : les migrations créent **92 tables** (relevé du 02/11 sur `supabase/migrations/0*.sql`, en lecture seule). Aucune vue n'y est créée. Attendu au vrai passage : **90 sauvegardées + 2 EXCLUES**, si toutes les migrations sont appliquées. Si l'écart vient d'une migration non collée, la table est simplement absente de l'OpenAPI. Liste à confronter au manifeste :
  `acces_support acces_support_lectures achats actions_auto alertes app_errors appareils_confiance apporteurs artisans assistant_actions assistant_conversations assistant_journal audience_jours audience_vues canaux canaux_evenements chantier_equipe chantier_materiaux chantier_pieces chantier_pointage chantier_suivi chantier_taches chantiers clients clients_liens clients_plateforme clients_sessions codes_connexion commandes_fournisseur compta_alertes_envoyees compta_reglages contenu_comptes contenu_idees contenu_lignes contenu_mesures contenu_posts contenu_suspensions courriers crieur_posts crm_agenda crm_apres_chantier crm_apres_opposition crm_journal crm_notes crm_rappels crm_reglages devis devis_lignes direction_roles equipe_membres essais_gratuits factures factures_lignes fournisseurs ip_abus ip_bans journal_direction leads lignes_achat limites listes_achat materiaux messages mouvements_stock obligations packs_pubs passages_cron password_resets pilote_reglages plat_events plateforme_config postes_types prix_artisan prix_observations push_abonnements recherche_cache reconfirmations registre_apports reglages_globaux regles_automatisation relances relances_impayes relances_impayes_arrets relances_impayes_reglages reversements sessions_verifiees sites_commandes stock support_verrou suspensions tickets vehicules`
- ⚠ **Le schéma `ops` (31 tables : prospects, envois, opposition, décisions…) n'est pas lisible par PostgREST**, et c'est voulu : `scripts/ops-sql-qa.mjs:789-793` vérifie que `schema('ops')` est refusé, même avec la clé de service ; note du vault `Ecosysteme-Plan-2026-09-24.md` §3.2. Aucune sauvegarde par PostgREST ne peut donc couvrir `ops`. Il est écarté avec sa raison dans `SCHEMAS_ECARTES` (l.60) et écrit dans chaque manifeste. Cela demande une décision (plus bas, point 1).

## La liste EXCLUES et ses raisons

| Écartée | Raison (texte du code) |
|---|---|
| `codes_connexion` | codes de connexion à usage unique, hachés, qui expirent en minutes (`0063_code_connexion.sql:20-25`) : restaurés, ils seraient déjà périmés ; l'artisan en redemande un |
| `sessions_verifiees` | marques de session (`0063_code_connexion.sql:28-33`) liées aux sessions d'auth, que l'API admin ne rend pas : après une restauration, toutes les sessions sont neuves |
| toute relation sans `post` (vue) | lecture seule : elle se recalcule depuis les tables, rien à restaurer (règle automatique, raison écrite dans le manifeste) |
| schéma `ops` | fermé à PostgREST (0094/0096) ; il faut `pg_dump` ou une fonction de service, voir plus haut |
| schémas `auth`, `storage`, `cron` | comptes par l'API admin, fichiers par l'API storage, tâches pg_cron recréées par les migrations |

Une entrée de `EXCLUES` sans raison lisible (moins de 12 caractères) fait refuser la sauvegarde (`controlerExclues`, l.83). Une entrée qui nomme une table absente de la base est signalée (`exclues_absentes`).

## L'ordre de restauration

L'ordre est calculé à chaque passage depuis les clés étrangères de l'OpenAPI, donc pas figé. Sur la doublure, il place chaque parent avant ses 11 enfants fictifs : `factures_lignes→factures→devis→leads→clients→artisans`, `messages`, `devis_lignes`, `assistant_actions`. Il note `categories` (clé vers elle-même) et signale le cycle `noeuds_a ↔ noeuds_b`. Les tables qui pointent vers `auth.users` ne voient pas cette clé dans l'OpenAPI, qui ne couvre que `public` : les comptes se restaurent d'abord (`restaurer.mjs --restaurer` le fait déjà).

## La suite `scripts/sauvegarde-qa.mjs` et ses mutants

La suite tourne hors ligne. La doublure PostgREST écoute sur 127.0.0.1, sur un port au hasard. Elle est servie par `scripts/fixtures/sauvegarde-qa/doublure.json` : Swagger 2.0 au format de PostgREST, enfants listés avant les parents, une vue, une fonction `/rpc`, une clé composée, une table sans clé primaire, un cycle, une auto-référence, et `leads` à 7 lignes pour 3 par page. Elle refuse toute requête sans la clé fictive et note toute requête inattendue. La sauvegarde tourne comme en vrai, dans un processus séparé. La suite déchiffre elle-même l'archive pour comparer les lignes une à une. Huit mutants, tous tués : liste figée remise, ordre inversé, comptes non comparés, raison non exigée, troncature ignorée, pagination coupée, tri retiré, EXCLUES ignorée. Un mutant dont le motif ne se trouve plus exactement une fois dans le script fait rougir la suite : elle ne peut pas passer au vert parce que le code a changé sous elle. Durée : environ 15 s.

Sortie de `node scripts/sauvegarde-qa.mjs` (02/11, Oracle, code 0) :

```
▶ sauvegarde-qa — le vrai script contre la doublure PostgREST (hors ligne)
  ✅ EXCLUES : une table écartée sans raison est refusée
  ✅ EXCLUES : une raison trop courte est refusée aussi (classer)
  ✅ les EXCLUES réelles portent toutes une raison
  ✅ ordre de restauration d’un graphe écrit à la main : a, e, b, c, d
  ✅ la sauvegarde passe (code 0) et écrit une archive
  ✅ toutes les tables attendues sont sauvegardées, et elles seules
  ✅ aucune relation découverte n’est perdue en silence (sauvegardée ou écartée avec raison)
  ✅ chaque table écartée porte une raison
  ✅ la vue (sans POST) est écartée comme lecture seule
  ✅ le compte de chaque table est celui de la doublure
  ✅ l’ordre de restauration met chaque parent avant ses enfants
  ✅ le cycle de clés est signalé et la clé vers soi-même notée
  ✅ le manifeste dit les schémas écartés (ops compris) et porte une empreinte par table
  ✅ chaque page d’une table à clé primaire est triée par cette clé
  ✅ la doublure n’a reçu aucune requête inattendue
  ✅ chaque table contient exactement les lignes de la doublure (ni doublon ni manque)
  ✅ les tables de l’archive suivent l’ordre de restauration
  ✅ comptes et fichiers de stockage embarqués
  ✅ --verifier avec la clé privée : vert, niveau complet
  ✅ --verifier sans la clé : vert, niveau structurel
  ✅ une archive tronquée échoue à --verifier sans clé
  ✅ une archive tronquée échoue à --verifier avec clé
  ✅ un manifeste dont un compte ment échoue à --verifier (comptes comparés)
  ✅ --verifier --vivant : comptes égaux à la base (doublure)
  ✅ --verifier --vivant voit une table qui a bougé
  ✅ une table nouvelle entre sans changer le code
  ✅ --verifier relit l’archive en clair et recompte (niveau complet)
  ✅ OpenAPI en panne : la sauvegarde refuse et n’écrit rien
  → 28 vérifiées, 0 en échec

▶ mutants — chacun doit faire rougir la suite
  ✅ mutant « liste figée remise » tué — 10 vérification(s) rougissent
  ✅ mutant « ordre inversé » tué — 3 vérification(s) rougissent
  ✅ mutant « comptes non comparés » tué — 1 vérification(s) rougissent
  ✅ mutant « raison non exigée » tué — 2 vérification(s) rougissent
  ✅ mutant « troncature ignorée » tué — 1 vérification(s) rougissent
  ✅ mutant « pagination coupée » tué — 3 vérification(s) rougissent
  ✅ mutant « tri retiré » tué — 2 vérification(s) rougissent
  ✅ mutant « EXCLUES ignorée » tué — 3 vérification(s) rougissent

✅ sauvegarde-qa VERTE
```

## Le vrai passage — pour la session principale, depuis le PC

Prérequis : `.env.local` du PC (URL et clé de service) et `cle-sauvegarde.pub.pem` à la racine. Aucune écriture en base : le script ne fait que des `GET`, des `HEAD` et des listes de stockage.

```
node scripts/sauvegarde.mjs --dossier D:/presti-travail/sauvegardes/base
node scripts/sauvegarde.mjs --verifier --dernier --dossier D:/presti-travail/sauvegardes/base
node scripts/sauvegarde.mjs --verifier --dernier --dossier D:/presti-travail/sauvegardes/base --vivant
```

(Ou `--verifier D:/presti-travail/sauvegardes/base/<horodatage>.presti`. Ajouter `--fichiers` à la première commande pour embarquer les images. Ajouter `--cle-privee <chemin du coffre>` le jour où Benj ouvre la clé privée : la vérification passe alors en niveau « complet ».) À lire dans la sortie :
- la ligne « N relations découvertes : 90 tables sauvegardées, 2 écartées » à confronter à la liste des 92 ;
- aucune ligne « ⚠️ EXCLUES nomme… » ;
- les `ecarts_de_lecture`.

`--vivant` sort rouge si une table a bougé entre la sauvegarde et la relecture (`plat_events`, `app_errors` s'écrivent en continu) : relancer aussitôt, ou lire l'écart. Un écart négatif mérite un regard.

## Risques et points à valider

1. **`ops` hors sauvegarde** (31 tables, dont les données de prospection) : seul `pg_dump` les couvre. Il faut le geste de Benj sur le mot de passe Postgres (Q1 de `cadrage-p3.md`), ou une fonction de service (migration, donc son « go »). La preuve « toutes les tables avant migration » (§4.1) ne sera pas complète sans cela.
2. ⚠ **Le comportement réel de Supabase reste à éprouver.** `GET /rest/v1/` rend l'OpenAPI à la clé de service (attendu, non prouvé ici : pas de réseau). S'il refuse, la sauvegarde refuse aussi, sans archive : fail-closed, rien de faux.
3. La suite neuve n'est pas encore déclarée dans `SUITES` du lanceur de vérification (fichier interdit à cette tâche) : à y ajouter (hors ligne, `cout` nul, environ 15 s).
4. `scripts/restaurer.mjs` (hors périmètre) suit l'ordre de l'archive, mais son `--restaurer` ne filtre que `artisan_id`, et le lot ne lui ajoute pas de seconde passe pour les cycles : à reprendre dans un lot suivant. `docs/sauvegardes.md` est à mettre à jour (hors périmètre).
5. Le stockage n'est listé que sur deux niveaux (dossier/fichier), comme avant ; les buckets restent la liste fixe `BUCKETS`.
6. Rien n'a été commité, poussé, compilé ni migré. Aucun secret n'a été lu (`.env.local` est absent de ce serveur), aucune donnée réelle n'a été utilisée.

## Réserve Windows (session principale, 02/11, vers 20 h 40)

Au PC (Windows, Node 24.16.0), la suite rougit sur un seul contrôle : « --verifier --vivant : comptes égaux à la base (doublure) ». Le
processus fils écrit « ✅ archive relue, comptes égaux (et égaux à la base) » puis plante à la sortie : « Assertion failed: !(handle->flags &
UV_HANDLE_CLOSING), file src\win\async.c, line 94 ». Quatre essais de correction (exitCode, lecture du corps du HEAD, fermeture du
répartiteur de fetch, SystemRoot passé au fils, GET au lieu de HEAD) n'y ont rien changé, et une reproduction minimale ne plante pas : tous
ont été retirés, `scripts/sauvegarde.mjs` et `scripts/sauvegarde-qa.mjs` sont identiques à la livraison (md5 `6ef977b8…` et `17425e3a…`).
Sur Oracle (Linux), avec les mêmes fichiers, la suite est verte (`verifier-oracle.log`). La sauvegarde tournera sur Oracle (`presti-sauvegarde`,
lot L8) : la suite est rangée dans `HORS_LANCEUR` avec cette raison, et la tâche passe dans `fait/` à la main.
