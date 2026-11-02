## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« migrations RLS organisation membres, sans les appliquer ») : il a rendu `migration-production.md` (go écrit de Benj, on colle PUIS on lève le drapeau) et la mémoire `migrations-je-les-applique` du 24/09. Celle-ci est dépassée par la règle du 01/11 et par l'interdit de la tâche. **Effet** : rien d'appliqué, ni essai à sec, ni connecteur. La garde Orca a d'ailleurs refusé une simple recherche de binaire Postgres.
- **MCP `cerveau`, `chercher`** (« organisations membres rôles RLS garde de session 0138 matrice… ») : il a confirmé les sources (plan §8, cadrage-p3 §5.6, `p3-assistant.md` §3.3, `inventaire.md` §2 : aucune des 5 tables n'existe). Il n'a trouvé aucune décision contraire dans le vault.
- **Skill `supabase-postgres-best-practices`** (`references/security-rls-performance.md`). **Effet** : `(select auth.uid())` dans chaque politique ; des fonctions `security definer` qui contrôlent `auth.uid()` dans leur corps ; un `revoke execute` explicite ; un index partiel `membres_utilisateur_actif_idx` pour `comptes_accessibles`.
- **Skill `supabase`** (liste de contrôle de sécurité). **Effet** : PUBLIC reçoit EXECUTE sur toute fonction neuve, d'où `revoke all … from public, anon` sur chaque fonction de 0183 ; `organisations_ouvertes_lu` est retirée aussi à `authenticated` ; « TO authenticated sans prédicat = IDOR », d'où chaque politique de lecture liée à `auth.uid()`.
- **Skill `ecc:security-review`** : la liste de contrôle passée. Aucun secret ; le SQL dynamique ne passe que par `format(%I/%L)` ; RLS sur chaque table neuve ; rôles vérifiés en base.
- **Agent `ecc:database-reviewer`** (relecture adversariale distincte, lecture seule). **Effet** : 2 défauts graves et 2 moyens corrigés, détail plus bas (G1, G2, M2, M3, plus 4 mineurs).
- **Suite modèle `scripts/automatisation-schema-qa.mjs`** (032-025) et `scripts/assistant-qa.mjs:1131-1137`. **Effet** : même structure pour la partie statique, les mutants en mémoire et le chargement de PGlite par `PGLITE_DIR`.
- **Vidéos analysées, `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md:272`** (« chacun approuve ce qui le concerne », qui relève des rôles). **Effet** : le domaine `a_valider` est différencié par rôle (`restreint` pour l'administratif, `siens` pour le compagnon). `plans/analyse-videos.md` ne dit rien de plus sur les rôles.
- **MCP `n8n-oracle`** : non utilisé, et c'est voulu (n8n-first examiné). Ce lot ne contient aucune automatisation, seulement du schéma et de la sécurité. Rien ne tourne seul.
- **Sources lues** :
  - le plan `chantier-4-assistant-plan.md` : §8.1-8.3 (l.533-577), §10 (l.625-659) et §12 (l.686-752) ;
  - `cadrage-p3.md` §5.2-5.6 (l.281-342) ;
  - les migrations : `0138` (l.35-119), `0001:5,22-23`, `0096:237-243`, `0097:313-360`, `0141:30-39,87-94`, `0186:270-285` ;
  - `app/onboarding/page.tsx:62-67`.
  - La recherche R2 (`…/scratchpad/c4/`) **n'existe pas sur cette machine**. Sa matrice §5.5 est donc reprise de son original, `cadrage-p3.md` §5.3 (l.289-302), que le plan §10 l.635-637 résume.

## Les objets créés, et leur source

**`supabase/migrations/0183_organisations.sql`** (pas M1 ; plan §8.2 l.555-561, §10 l.645 ; cadrage-p3 l.283, l.308-311, l.321)
- **`utilisateurs`** (l.68), la sécurité par personne, plan l.558 :
  - `sessions_invalides_avant` ;
  - `connexion_verifiee_le`, qui **naît à `now()`**, en échec fermé ;
  - RLS, lecture de sa seule ligne.
- **`organisations`** (l.84) : `id = artisans.id` (l.556) et `actif`. RLS ; le titulaire lit la sienne.
- **`membres`** (l.98), plan l.556-557 :
  - 5 rôles et 3 statuts (invité par défaut) ; `equipe_membre_id` ; unicité sur (organisation, utilisateur).
  - Le titulaire est l'artisan lui-même et lui seul (`membres_titulaire_soi`, plus un index unique partiel).
  - Le déclencheur `membres_gardes` (l.122) :
    - vérifie que la fiche d'équipe appartient à la même organisation ;
    - interdit de changer l'organisation ou la personne d'une adhésion ;
    - empêche de retirer le titulaire ;
    - crée la ligne `utilisateurs` de chaque membre non titulaire.
- **`invitations`** (l.155), plan l.558 :
  - seulement l'empreinte SHA-256 du jeton (unique) et celle de l'adresse ;
  - 7 jours au plus, date de création imposée ;
  - un titulaire ne s'invite jamais ;
  - usage unique par `invitations_gardes` (l.179). La mise à null par une clé étrangère passe toujours.
  - Aucune politique : clé de service seulement.
- **`droits_roles`** (l.231, insertion l.241) : la matrice, 60 lignes. Aucune lecture pour le navigateur.
- **Interrupteur `organisations_ouvertes`** (l.322-326) dans `ops.interrupteurs` (`0096:237-243`) :
  - **semé faux**, `on conflict do nothing` ;
  - posé par un fondateur seulement, par la fonction existante `ops_interrupteur_poser` (`0097:336-357`) ;
  - la contrainte de nom est réécrite pour admettre aussi `sms_arret`.
- **Fonctions** :
  - **`organisations_ouvertes_lu()`** (l.329) : absent vaut fermé ; appelable par aucun rôle de l'API.
  - **`comptes_accessibles(domaine, niveau)`** (l.340) : stable, `security definer`, `search_path = ''`, rend `setof uuid`.
    - Elle rend `auth.uid()`, plus les organisations où l'utilisateur est **membre actif**, organisation active, interrupteur ouvert, avec un droit `lecture` ou `ecriture` suffisant ; les organisations **suspendues sont exclues en écriture**.
    - `siens` et `restreint` n'ouvrent pas le compte.
  - **`peut_acceder`** (l.359), en `security invoker`.
  - **`role_de`** (l.366).
  - L'exécution est retirée à `public` et `anon`.
- **Reprise de l'existant** (l.391-397) : une organisation et un titulaire actif par artisan existant, de façon idempotente. Aucun déclencheur sur `artisans` : M1 ne touche aucune table existante. Un artisan inscrit après la pose reçoit son organisation à sa première invitation (P4b).
- **Les gardes** : les quatre gardes de 0138, `anon` retiré, écritures retirées à `authenticated` sur les 5 tables. **Aucune politique existante touchée, aucune `org_*`** : elles viennent en M3, plan l.648-650.

**`supabase/migrations/0184_garde_session_membres.sql`** (pas M2 ; plan l.562-563, l.627-633, l.646)
- Le nouveau corps de `jeton_session_valide()` (l.102) : voir la faille et sa parade plus bas.
- Les corps de 0138 sont recopiés en tête, à l'octet près, pour le retour arrière : `0138:35-96`, contrôlé par la suite.
- Aucune politique n'est créée, retirée ni modifiée.
- **Écart voulu au plan l.562** : `compte_non_suspendu()` n'est **pas** changée (raison au point M3 de la relecture).

**`supabase/migrations/0188_garde_session_rejouee.sql`** (pas M6 ; plan l.569, l.647 ; `0138:28`, `0138:99-119`)
- La boucle de 0138 rejouée, **strictement additive** : elle ne crée une garde que si elle manque, et ne retire ni ne recrée rien.
- Chaque garde posée porte la marque « posée par 0188 ».
- Un contrôle final lève une exception, et rien ne reste, si une table à RLS n'a pas ses quatre gardes restrictives sur la bonne commande, pour `authenticated` et avec la bonne fonction.

**Les jumeaux** `_A_COLLER_sql_editor_0183_NU.sql`, `_0184_NU.sql` et `_0188_NU.sql` sont fabriqués par `node scripts/sql-nu.mjs --controle …`. Chacun porte un contrôle après collage, en lecture seule, avec des « (attendu : …) » :
- pour 0183 : 5 tables, aucune sans RLS, 20 gardes, 0 `org_*`, rien pour `anon`, 60 droits, 0 artisan sans organisation ni sans titulaire, interrupteur `false`, `comptes_accessibles` non exécutable par `anon` ;
- les autres contrôles relèvent l'état de 0184 et de 0188.

**`lib/organisations/droits.ts`** : `ROLES`, `DOMAINES`, `NIVEAUX` et `MATRICE` (60 lignes, dans l'ordre de l'insertion de 0183), plus `niveauDe` et `ouvreLeCompte`. Aucun code ne le lit encore (P4b).

**`scripts/organisations-qa.mjs`** :
- `--statique` : 216 vérifications, dont 40 mutants ;
- sans `--statique` : la partie PGlite, sinon code 2.

## La faille de 0138 et sa parade

- **La faille** (`0138:44-47`, l.55-56, l.66). La CTE `a` ne lit que `artisans`. Pour une personne qui n'y figure pas, un membre invité par exemple, deux conditions sont **vraies à vide** :
  - la révocation (« se déconnecter partout ») ;
  - l'exigence du code par e-mail pour une session au mot de passe seul.
- **La parade, dans 0184** :
  1. `a` lit `artisans` **et** `utilisateurs`, et le plus strict gagne. Un membre qui se crée plus tard une ligne `artisans` par l'onboarding garde donc sa révocation et son code. C'est le défaut G1 de la relecture : ma première version lisait « artisans, sinon utilisateurs ».
  2. Un membre **actif** non titulaire sans aucune ligne est **refusé** (échec fermé).
  3. `utilisateurs.connexion_verifiee_le` naît à `now()`, et chaque adhésion crée sa ligne (0183). Un membre au mot de passe seul passe donc le code dès le premier jour. Le lien d'invitation porte une autre méthode que `password` : il passe.
  4. Un compte neuf, sans adhésion active, garde sa session d'inscription, et `artisan_insert_own` (`0001:22`) reste permise. Les cas PGlite « compte neuf » et « inscription non régressée » le prouvent.
  5. Pour un artisan d'aujourd'hui (aucune ligne `utilisateurs`), le résultat est identique à 0138.
- **La suspension d'une organisation** atteint ses membres par `comptes_accessibles`, qui l'exclut en écriture (plan l.633).

## La matrice (cadrage-p3 §5.3 ; plan §10 l.635-637)

| Domaine | Titulaire | Associé | Administratif | Compagnon | Invité |
|---|---|---|---|---|---|
| abonnement (Stripe, membres, suppression) | ecriture | aucun | aucun | aucun | aucun |
| reglages | ecriture | ecriture | lecture | aucun | aucun |
| demandes | ecriture | ecriture | ecriture | aucun | lecture |
| devis | ecriture | ecriture | ecriture | aucun | lecture |
| factures | ecriture | ecriture | ecriture | aucun | lecture |
| tarifs | ecriture | ecriture | lecture | aucun | aucun |
| stock | ecriture | ecriture | ecriture | lecture | aucun |
| chantiers | ecriture | ecriture | ecriture | siens | lecture |
| pointage | ecriture | ecriture | lecture | siens | aucun |
| assistant | ecriture | ecriture | restreint | aucun | aucun |
| a_valider | ecriture | ecriture | restreint | siens | aucun |
| autonomie (niveau 3) | ecriture | aucun | aucun | aucun | aucun |

- `siens` : ses chantiers par `chantier_equipe` et `equipe_membre_id`, filtrés ligne par ligne en M3-B.
- `restreint` : la partie du domaine que la route déclare.
- Ni `siens` ni `restreint` n'ouvrent le compte dans `comptes_accessibles`.
- La matrice reste la « proposition, à valider » de cadrage-p3 (Q5) : Benj la valide avant M3.

## Le retour arrière

- **Global, sans DDL, à tout moment** (plan l.652) : `ops_interrupteur_poser('organisations_ouvertes', false, motif, fondateur)`. `comptes_accessibles` ne rend alors plus que `auth.uid()`.
- **Défaire 0184** : recoller les corps de 0138, recopiés en tête de 0184, l.31-92.
- **Défaire 0183** : l'en-tête, l.29-47, donne la marche dans l'ordre. Un premier bloc **refuse de passer tant que 0184 est en place** : il teste les deux fonctions de garde (défaut M2 de la relecture).
- **Défaire 0188** : un bloc retire les seules gardes marquées « posée par 0188 ».

## La sortie de la suite statique et de ses mutants

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/organisations-qa.mjs --statique` donne un code 0, et « ✅ 216 réussis, 0 échoués (dont 0 en statique) ». Les 4 mutations du plan (§10 l.658) :

```
  ✅ mutant « PLAN 1 · statut = actif retiré » rougit « comptes_accessibles : membre actif seulement (statut = actif) »
  ✅ mutant « PLAN 2 · organisation_id inversé » rougit « comptes_accessibles : rend l’organisation, filtrée sur la personne (organisation_id dans le bon sens) »
  ✅ mutant « PLAN 3 · garde de suspension retirée » rougit « comptes_accessibles : garde de suspension (écriture refusée à un compte suspendu) »
  ✅ mutant « PLAN 4 · comptes_accessibles en security invoker » rougit « comptes_accessibles : stable, security definer, search_path vide »
```

- **36 autres mutants rougissent aussi**, parmi lesquels : l'interrupteur semé vrai ou non lu ; `siens` compté comme lecture ; la RLS ou une garde retirée ; `anon` non retiré ; une `org_*` posée sur `devis` ; `droits.ts` changé d'un seul côté ou réordonné ; une invitation de 30 jours ; un titulaire invité ; une copie de 0138 altérée ; un membre sans ligne laissé passer ; `artisans` qui masque `utilisateurs` ; une boucle 0188 non additive ; le contrôle final de 0188 réduit au seul nom.
- La suite a rougi pour de vrai pendant le travail, sur des jumeaux périmés (« même SQL que … » en ❌), avant que je les refabrique.
- **Sans `--statique` ni `PGLITE_DIR`** : code 2, « Partie PGlite EN ATTENTE ». Même chose avec un `PGLITE_DIR` sans paquet.
- `node scripts/migrations-jumelles-e2e.mjs` : « ✅ 580 réussis, 0 échoués ».

⚠️ **La partie PGlite n'a jamais tourné.** Aucun PGlite n'existe sur l'Oracle, et toute installation est interdite. Elle est écrite et `node --check` passe, mais elle n'a jamais été exécutée. Son premier passage peut révéler un défaut du banc lui-même. Ce qu'elle prévoit :
- 0138, 0183, 0184 et 0188 posées deux fois ;
- deux organisations, dont A à quatre rôles ;
- la matrice dans les deux sens ;
- l'étanchéité ;
- un membre en attente, retiré, ou dans une organisation fermée ou suspendue ;
- la faille (membre sans ligne) ;
- l'inscription ;
- G1 et G2 ;
- les retours arrière ;
- les 4 mutations du plan rejouées en base.

## La relecture indépendante (`ecc:database-reviewer`) et ce qui en a été fait

Le relecteur n'a trouvé aucune voie de fuite entre locataires.

- **G1, corrigé.** `utilisateurs` naissait à null, donc s'ouvrait à vide, et une ligne `artisans` la masquait. Désormais :
  - `a` lit les deux ;
  - `connexion_verifiee_le` vaut `now()` par défaut ;
  - chaque adhésion crée sa ligne.
- **G2, corrigé.** Les clés étrangères `on delete set null` heurtaient le déclencheur d'usage unique, si bien que l'effacement d'une fiche d'équipe ou d'un compte (RGPD) aurait échoué. La contrainte est assouplie, et la mise à null passe.
- **M2, corrigé.** Le verrou du retour arrière de 0183 teste maintenant les deux fonctions de garde.
- **M3, corrigé.** `compte_non_suspendu` n'est plus élargie. Elle bloquait un membre dans ses autres organisations, et `comptes_accessibles` suffit.
- **Mineurs corrigés** :
  - le contrôle final de 0188 regarde la commande, le rôle et la fonction ;
  - `invitations` fige l'adresse, l'auteur et la fiche ;
  - une invitation ne prend que la fiche d'équipe de sa propre organisation ;
  - une utilisation doit nommer la personne.
- **Restent ouverts**, hors de mon périmètre : M1 et M4, plus deux mineurs (section suivante).

## Ce que la session principale et Benj doivent faire

1. **0186 contre 0183 (M1, hors de mon périmètre).** `0186_sms_clients.sql:282` réécrit la contrainte de `ops.interrupteurs` **sans** `organisations_ouvertes`. Posée après 0183, 0186 échoue (tout ou rien). Son retour arrière (l.36-37) aussi.
   - Avant de poser les deux : ajouter `'organisations_ouvertes'` à la liste de 0186 (l.282 et l.37) et refabriquer son jumeau ; ou bien poser 0186 avant 0183.
   - `organisations-qa` l'affiche en avertissement.
2. **Rejouer la partie PGlite** avec `PGLITE_DIR=<dossier où @electric-sql/pglite est installé> node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/organisations-qa.mjs`. Elle doit rendre 0, et non 2. C'est le « banc de 0138 rejoué », préalable de M2 (plan l.646).
3. **Ajouter la suite à `SUITES`** dans `scripts/tout-verifier.mjs` (interdit dans cette tâche). Sinon personne ne la joue.
4. **M0, puis l'essai à sec de 0183, 0184 et 0188** par `scripts/lib/sql-essai.mjs` (session principale seulement). L'essai de 0188 rend par `raise notice` la liste des tables qui reçoivent une garde. **Puis le « go » écrit de Benj**, dans l'ordre 0183, 0184, puis 0188 (qui reste indépendante).
5. **Avant M3**, à écrire dans les tâches suivantes :
   - chaque politique `org_*` est `to authenticated`, sinon les pages publiques échouent en « permission denied » (M4) ;
   - mesurer par `EXPLAIN` `artisan_id in (select comptes_accessibles(…))` contre `artisan_id = any (array(select …))` ;
   - P4b doit écrire `utilisateurs` pour un membre dans `lib/connexion.ts:79` (code par e-mail) et dans `lib/authArtisan.ts:152` (révocation). Sinon « se déconnecter partout » ne touche pas un membre ;
   - la création d'un membre et de son `utilisateurs` dans une même transaction, déjà garantie par le déclencheur.
6. **Benj** : valider la matrice (Q5 de cadrage-p3) avant M3.
7. **Jumeaux** : `set local lock_timeout` n'a d'effet que dans une transaction. Coller le jumeau dans le SQL Editor en entier, ou passer par `appliquer-migration.mjs`, qui ouvre la transaction.

## La commande `verifier`

Depuis `fait/` : `✓ 032-032 : PASS · 1s · 2601 ligne(s) produite(s) · preuve : .orchestre/preuves/032-032/verifier.log`. Le digest
porte la ligne « | 032-032 | feature | fait | claude-code | PASS | 2026-11-02T20:24:00Z ».
