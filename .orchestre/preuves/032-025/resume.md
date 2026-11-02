## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« préparer des migrations Postgres, base, RLS, argent ») : il a renvoyé `regles-presti/migration-production.md`
  (go écrit, deux voies, jumeau testé) et `memoire/essai-a-sec-migration.md`. Effet : en-tête « NON APPLIQUÉE », retour arrière écrit, pied
  de contrôle dans chaque jumeau. L'essai à sec reste à la session principale. Rien n'a été appliqué.
- **MCP `cerveau`, `chercher`** (« opportunités, evenements_metier, relances_exclusions, SMS, 0185, 0186 ») : `p5-entreprise/inventaire.md`
  confirme que ces tables n'existent nulle part, ni en base, ni dans un commit, ni dans un worktree. Les numéros 0185 à 0187 sont libres.
  Le vault n'a été que lu.
- **Plan du chantier 4** (`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`), lu : §0, §0 bis (rangs 1, 5, 18, questions 3 et 10), §8.1,
  §8.2, §8.3, §9, §11, §13. Lu aussi `cadrage-p3.md:200-300` (cycle §4.2, tables §5.2). C'est la source de chaque table, chaque colonne et
  chaque garde (tableau plus bas).
- **Vidéos analysées**, par la synthèse du §0 bis du plan, qui cite `plans/analyse-videos.md` (rangs 1, 5, 8, 18). Effet : le `motif` des
  arrêts d'impayé est rangé d'un geste (aucune valeur devinée), `relances_exclusions` existe, et un SMS sans STOP est refusé en base.
  `plans/analyse-videos.md` lui-même n'a pas été rouvert.
- **Skill `supabase-postgres-best-practices`** (`security-rls-performance.md`, `schema-foreign-key-indexes.md`). Effet :
  - politiques en `(select auth.uid()) = artisan_id` et `to authenticated` ;
  - un index sur chaque clé étrangère des cascades (`opportunites_decisions.opportunite_id`, `relances_exclusions.artisan_id`,
    `client_id`, `lead_id`) ;
  - `search_path = ''` sur chaque fonction ;
  - aucune fonction en `security definer`.
- **Skill `ecc:security-review`** : secrets (aucun, vérifié par grep), injection SQL, RLS, messages d'erreur. Le seul SQL dynamique prend son
  nom de table dans une liste blanche (`%I`) et ses valeurs par `using` (`0185:117`). Le nom d'une contrainte (`0186:278`) vient de
  `pg_constraint`. Les messages d'exception ne portent que des statuts, jamais une donnée.
- **Agent `ecc:database-reviewer`**, relecture indépendante en lecture seule, après la première version. Constats et suite donnée :
  - **Bloquant**, corrigé : `clients.tel_source` restait modifiable depuis le navigateur par la politique `client_all_own` en `FOR ALL`
    (0002:31-33). Correctif : le déclencheur `clients_tel_source_garde` (`0186:242-266`).
  - **Corrigés** :
    - plafonds SMS contournables par un `cree_le` fourni par l'appelant ;
    - texte SMS moins strict que `lib/sms` (STOP en mot entier, GSM-7, segments calculés, domaines, menaces) ;
    - `sms_arret` non lu en base ;
    - cycle trop large : une opportunité naissait `a_valider`, la carte ou la ligne n'étaient pas lues dans leur statut réel, et le niveau 3
      n'était pas exigé pour `programmee`.
  - **Remarques retenues** :
    - `lock_timeout` ;
    - un index sur `relances_exclusions.artisan_id` ;
    - un expéditeur renommé redevient « à valider » ;
    - une opposition ne se modifie pas ;
    - l'empreinte du numéro est un HMAC, plus un SHA-256 nu.
  - **Remarques laissées, écrites en risques** : un mot seul en minuscules passe `faits_sans_texte`, et l'`acteur_id` est lisible par
    l'artisan.
- **`lib/sms/encodage.ts`** (lot L7, déjà sur le disque) : `sms_texte_conforme` (`0186:44-58`) en est le miroir en base. Lignes reprises :
  STOP l.46-47, lien l.49-51, montant l.53-54, menace l.56-58, GSM-7 pur l.8-10 et l.32-33, segments l.23-25.
- **Migrations voisines**, pour la forme : 0138 (gardes, boucle l.99-119), 0159 (boucle des gardes l.93-107, déclencheur de cohérence),
  0181 (contrainte anonyme retirée puis renommée, reprise pour `ops.interrupteurs`), 0189 (n8n_lecture), 0174 et 0157 (statuts réels des
  lignes de pilote et des cartes), 0041 et 0044 (facture scellée), 0096:237-243 et 0097:314-357 (interrupteurs).
- **Outils du dépôt** : `scripts/sql-nu.mjs` (jumeaux, avec `--controle`) et `scripts/migrations-jumelles-e2e.mjs`. La forme de la partie
  PGlite vient de `scripts/crm-sql-qa.mjs`.
- **Non servis par cette tâche** :
  - skills de design et de vidéo : aucune interface, aucun média ;
  - MCP `n8n-oracle` : aucun workflow créé ni touché ;
  - `presti-audit-attaque` : un sous-agent ne doit pas viser la production, et la relecture d'attaque a été faite par `ecc:database-reviewer`.

## Ce qui a été préparé (rien n'a touché la base)

Chaque fichier commence par « ⚠️ NON APPLIQUÉE, préparée le 02/11, attend le go écrit de Benj », puis son retour arrière écrit. Jumeaux :
`_A_COLLER_sql_editor_0185_NU.sql`, `_0186_NU.sql` et `_0187_NU.sql`, fabriqués par `node scripts/sql-nu.mjs <src> <dst> --controle
.orchestre/preuves/032-025/controle-018N.sql`. Chaque pied de contrôle ne fait que lire, et chaque ligne annonce `(attendu : X)`.

### 0185_automatisation (480 l.)

| Objet | Colonnes et clés | Source |
|---|---|---|
| `evenements_metier` (l.125) | `type`, `objet_type`/`objet_id`, `cle`, `faits` (sans texte libre), `survenu_le`, `cree_le` ; **unique (artisan_id, cle)** ; un fait ne se modifie pas | plan §8.2 l.562 ; §8.1 l.549 ; cadrage-p3:288 |
| `detecteurs_reglages` (l.164) | pk (artisan_id, detecteur), `actif` faux par défaut, `seuils` numériques, `acteur_id`, `cree_le`, `maj_le` | §8.2 l.562 ; cadrage-p3:288 |
| `autonomie_reglages` (l.186) | pk (artisan_id, type_action), `niveau` 1 à 3, `plafond_jour`, `pose_par` (artisan ou presti), `acteur_id` ; `pilote_reglages` reste en place | §8.2 l.562-563 ; cadrage-p3:208, :288 |
| `passages_detecteurs` (l.207) | `cle` **unique**, `workflow`, `mode` (simulation ou réel), durées, compteurs, `bilan` (agrégats numériques seuls) ; fermée à anon et authenticated | §8.1 l.548 ; §9 l.616-617 ; cadrage-p3:288 |
| `opportunites` (l.227) | `detecteur`, `cle`, objet, `outil`, `niveau`, `statut` (16 états du cycle), **`montant_centimes bigint`**, `faits`, `motif_blocage` codé, liens `assistant_action_id` et `action_auto_id`, `tentatives`, `expire_le`, `ferme_le` ; **index unique partiel (artisan_id, cle) des ouvertes** (l.267) | §8.2 l.563-565 ; cadrage-p3:230-251, :288-290 |
| `opportunites_decisions` (l.351) | `decision` (liste fermée), `motif` codé, `empreinte_avant`/`apres` (SHA-256), `acteur_id`, `cree_le` ; journal non réécrit | §0 bis rang 8 l.70-71 ; cadrage-p3:288 |
| `relances_exclusions` (l.390) | client **ou** conversation, `motif` codé, `acteur_id`, `levee_le`/`leve_par` ; **une exclusion en cours par client et par conversation** (index partiels l.408, l.410) | §0 bis rang 5 l.64-65 ; question 10 l.244 ; §8.2 l.566 |
| `relances_impayes_arrets.motif` (l.446) | nullable, liste fermée : `oubli`, `dit_avoir_paye`, `litige`, `autre` | §0 bis rang 1 l.56-57 ; §9 n° 11 l.597 ; §8.2 l.566 |

Gardes en base, clé de service comprise (déclencheur `opportunites_cycle`, l.276-346) :
- une opportunité naît `detectee`, seulement (cadrage-p3:232) ;
- les passages suivent le schéma de cadrage-p3:230-251. Trois ajouts sont écrits en commentaire (l.273-275) : la résolution ou l'expiration
  d'une opportunité en attente, `manuel` qui se traite comme `a_valider`, et `reportee` qui revient `a_valider` ;
- aucun statut fermé ne se rouvre ; le compte, la clé, le détecteur et l'objet ne changent pas ;
- `programmee` exige le niveau 3 et une ligne `actions_auto` `a_partir` ou `en_cours` ;
- `partie`, `reussie` et `echec` exigent une carte confirmée ou une ligne réclamée, lue dans son statut réel (cadrage-p3:290) ;
- l'objet visé, la carte et la ligne appartiennent au même artisan (`automatisation_objet_du_compte`, l.92-120 : `security invoker`,
  `execute` à service_role seulement) ;
- aucune contrainte de table ne bloque une cascade de suppression du compte : les gardes de départ ne jouent qu'au changement de statut.

### 0186_sms_clients (309 l.) — dépend de 0185

| Objet | Colonnes et gardes | Source |
|---|---|---|
| `sms_expediteurs` (l.67) | pk artisan_id ; `nom` de 3 à 11 caractères, jamais « Presti » ; `statut` ; un nom changé redevient `a_valider` | §11 porte 4 l.678 |
| `sms_oppositions` (l.101) | **unique (artisan_id, numero_empreinte)**, HMAC du numéro seul, `source`, `recue_le` ; ne se modifie pas | §11 l.682-683 ; rang 18 |
| `sms_envois` (l.135) | **unique (artisan_id, cle)** ; `type` (3 types) ; `mode` à blanc par défaut ; `etat` ; `texte` conforme (STOP, GSM-7 pur, ni lien, ni montant, ni menace, ni Presti) ; `segments` calculés ; `cout_ht_milliemes integer` ; `tarif_source` et `tarif_date` exigés en réel ; ni numéro ni nom du client | §8.2 l.567 ; §11 l.666-681 ; question 3 l.237 |
| déclencheur `sms_envois_gardes` (l.175-233) | `cree_le` imposé ; `sms_arret` lu en base ; plafonds de 10 par artisan et 100 par jour, sous verrou consultatif ; cycle des états ; un envoi `incertain` n'est jamais renvoyé | §11 porte 6 l.680-681 |
| `clients.tel_source`, `tel_source_le` (l.236-266) | `demande`, `artisan` ou `import`, ou null ; jamais écrits depuis le navigateur ; un numéro changé perd sa source | §8.2 l.568 ; §11 porte 3 l.677 |
| interrupteur `sms_arret` (l.268-285) | contrainte de `ops.interrupteurs` élargie ; **semé ACTIF, donc SMS arrêtés** | §8.2 l.568 ; §11 porte 1 l.674 |

### 0187_factures_envoyee_le (35 l.)

- `factures.envoyee_le timestamptz`, nullable, sans défaut. La contrainte `factures_envoyee_scellee` réserve cette date à une facture scellée.
- Sources : plan §8.2 l.569 et §9 n° 5 l.590 ; `lib/envoisPdfServeur.ts:101-138` n'écrit rien aujourd'hui.
- `factures_immuables` (0041:41-61) ne surveille pas cette colonne. RLS, droits et n8n_lecture : inchangés.

### RLS, gardes et droits (toutes les tables neuves)

- RLS activée dès la création.
- Une seule politique permissive par table, en lecture de ses lignes : `for select to authenticated using ((select auth.uid()) =
  artisan_id)`. `passages_detecteurs` n'en a aucune.
- Les quatre gardes restrictives de 0138, posées par la boucle `do $gardes$` : `0185:452` et `0186:288`.
- Droits :
  - `revoke all … from anon` ;
  - `revoke insert, update, delete, truncate, references, trigger … from authenticated` ;
  - `revoke all on passages_detecteurs from authenticated`.
- Aucune colonne `organization_id`.
- **n8n_lecture (0189) : rien.** Le plan le garde en base, inutilisé par n8n (§0.1 l.30-32), qui passe par l'API.

### Retour arrière

Il est écrit en tête de chaque fichier : `0185:26-43`, `0186:21-37`, `0187:23-25`. Ordre : 0187, puis 0186, puis 0185. 0186 dépend des
fonctions de 0185.

## Sortie des deux suites

`node scripts/automatisation-schema-qa.mjs` : **254 réussis, 0 échoués**, code 0. Sortie complète :
`.orchestre/preuves/032-025/sortie-automatisation-schema-qa.txt`. La partie PGlite n'a pas été jouée (« ⏸ ») : `@electric-sql/pglite`
n'existe pas sur ce serveur, et la garde refuse le réseau. Elle est écrite et prend effet dès que `PGLITE_DIR` est posé (voir plus bas).

`node scripts/migrations-jumelles-e2e.mjs` : **568 réussis, 0 échoués**, code 0. Sortie : `sortie-migrations-jumelles-e2e.txt`. Les trois
jumeaux se parsent et sont inclus dans leur migration.

Sabotage du vrai fichier : la ligne `alter table public.opportunites enable row level security;` a été retirée sur le disque.
- La suite rougit, code 1, sur « 0185 opportunites : RLS activée ».
- Le fichier restauré est identique à l'octet (`cmp`), et la suite est de nouveau verte.

## Les mutants (29, tous rougissent leur vérification visée)

Chaque mutant est joué en mémoire ; la vérification qu'il vise doit rougir. Les mutants, regroupés :

- **RLS et gardes** :
  - RLS retirée sur `opportunites`, puis sur `sms_envois` ;
  - `opportunites` sortie de la boucle des gardes ;
  - `garde_suspension_maj` retirée ;
  - `garde_session` rendue permissive.
- **Droits** :
  - anon non retiré ;
  - écritures laissées à authenticated ;
  - politique `for all` ouverte au navigateur ;
  - lecture `using (true)` ;
  - droit accordé à `n8n_lecture`.
- **Clés d'unicité** :
  - index unique des ouvertes retiré, puis élargi (`a_valider` compté comme fermé) ;
  - clés uniques des événements et des SMS retirées.
- **Données** :
  - colonne `organization_id` ajoutée ;
  - montant en `numeric` ;
  - faits en texte libre.
- **Cycle des opportunités** :
  - départ direct depuis `a_valider` ;
  - naissance en `a_valider` ;
  - `programmee` sans niveau 3.
- **SMS** :
  - STOP retiré ;
  - GSM-7 non exigé ;
  - segments déclarés par l'appelant ;
  - `sms_arret` non lu ;
  - garde de `tel_source` retirée ;
  - envoi `incertain` renvoyé.
- **Fichier** :
  - fonction en `security definer` ;
  - en-tête « NON APPLIQUÉE » retiré ;
  - retour arrière d'une table oublié.

## Ce que la session principale doit faire

1. **Rapatrier le périmètre** : les trois migrations, les trois jumeaux, `scripts/automatisation-schema-qa.mjs` et ce dossier. Puis rejouer
   `node scripts/orchestre.mjs verifier 032-025`.
2. **Jouer la partie PGlite**, une fois : `PGLITE_DIR=<dossier où « npm install @electric-sql/pglite » a été fait> node
   scripts/automatisation-schema-qa.mjs`.
   - Environ 60 cas réels : étanchéité entre deux comptes, navigateur refusé, cycle, plafonds SMS, `sms_arret`, `tel_source`, contrôle des
     jumeaux, suppression d'un compte en cascade.
   - **Jamais jouée ici.** Si un cas rougit, il faut lire si c'est la migration ou le banc qui se trompe.
3. **Inscrire la suite dans `SUITES`** de `scripts/tout-verifier.mjs` (lot L11 ; ce fichier m'était interdit).
4. **Essai à sec**, migration par migration, dans l'ordre 0185, 0186, 0187 : un bloc `do … raise exception` (`scripts/lib/sql-essai.mjs`,
   plan §8.3 l.574-575). Le corps du jumeau est pris sans son pied.
5. **« Go » écrit de Benj**, une migration à la fois. Pour 0186, le « go » attend aussi le choix du fournisseur et le prix d'un segment
   (§11 l.684-685).
6. **Appliquer et contrôler** : appliquer, lire le pied de contrôle du jumeau (chaque ligne doit rendre sa valeur `attendu`), PUIS seulement
   les drapeaux et les workflows n8n qui écrivent.

## Risques et points à valider par Benj

- **Listes fermées choisies par le plan, pas par Benj** :
  - motifs d'arrêt d'impayé `oubli`, `dit_avoir_paye`, `litige` et `autre` (le plan ne nomme que les deux premiers) ;
  - `tel_source` : `demande`, `artisan` ou `import` ;
  - décisions : `valider`, `modifier_valider`, `refuser`, `reporter`, `annuler` et `rejouer`.
- **Le cycle des opportunités ajoute trois passages au schéma** (écrits l.273-275), à confirmer.
- **`faits_sans_texte`** refuse les phrases, les majuscules et les chaînes de chiffres. Un mot seul en minuscules (« dupont ») passerait
  encore : la règle « jamais un nom » reste aussi celle du code qui écrit.
- **`acteur_id` est lisible par l'artisan** (l'uuid d'un administrateur Presti sur une ligne `pose_par='presti'`).
- **La garde de `tel_source` ajoute un déclencheur sur `clients`**, une table en production. Il ne touche que les deux colonnes neuves ;
  `lock_timeout` est de 5 s.
- **`envoyee_le` est nulle pour les factures envoyées avant 0187** : le détecteur 5 ne doit viser que les factures émises après la pose.
  L'écriture par la route d'envoi est un lot d'interface à part (`lib/**` était interdit ici).
- **GSM-7 en base** : le caractère `$`, admis par `lib/sms`, est refusé en base (fermé vers le refus).
- **`relances_exclusions`** n'est lue par aucun chemin codé tant que Benj n'a pas tranché l'exception B (question 10).
