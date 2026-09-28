# Application de 0106_acquisition_echanges.sql (fiche 026-061) — 2026-09-28

Projet Supabase Presti (gorcdvmueakcncsmrouo), par l'outil MCP `apply_migration` (jamais de SQL collé à la main).

## Correction préalable du contrôle (avant application)

`supabase/controles/0106_acquisition_echanges.sql` avait deux défauts établis par la contre-vérification
indépendante (`.orchestre/preuves/026-061/contre-verif-28-09.md`) :

1. **Le compte de fonctions** : le test comparait `count(*) = 47` alors que la CTE `attendues` porte
   **49** signatures (vérifié : `sed -n '1,51p' ... | grep -c "('public\."` → 49). Corrigé : `= 49`,
   et le libellé de la ligne (« les 49 fonctions… »).
2. **Le test `public.courriers`** : le contrôle exigeait `to_regclass('public.courriers') is null`,
   alors que cette table existe en production depuis une migration antérieure à 0106, que 0106 ne
   crée ni ne modifie (aucune ligne du fichier de migration ne cite « courriers » — vérifié à la
   lecture). Un contrôle en base ne peut pas constater une absence de mention dans un fichier ;
   retiré, avec une note dans le fichier expliquant pourquoi, ne laissant que le test des trois
   fonctions que 0106 promet de ne pas créer (`acq_reponse_relayer`, `acq_envoi_marquer`,
   `acq_oppositions_depuis`).

Les jumeaux (`_A_COLLER_sql_editor_0106.sql`, `_A_COLLER_sql_editor_0106_NU.sql`) ont été régénérés
avec `node scripts/sql-nu.mjs supabase/migrations/0106_acquisition_echanges.sql <dest> --controle
supabase/controles/0106_acquisition_echanges.sql` pour rester exactement synchronisés avec le
contrôle corrigé (OB-3 l'exige). Le juge statique rejoué après correction :
`node scripts/ops-acquisition-qa.mjs --migration=echanges` → **PASS** (OB-1 à OB-24 tous verts,
notamment OB-3 redevenu vert).

## 1. Lecture entière du fichier
`supabase/migrations/0106_acquisition_echanges.sql` lu en entier (1794 lignes) avant application.

## 2. apply_migration
`apply_migration` nommée `0106_acquisition_echanges`, `query` = contenu exact du fichier. Résultat :
`{"success":true}`. Avant application : les 4 tables neuves (`ops.conversations`,
`ops.meta_evenements`, `ops.reponses`, `ops.rendez_vous`) et les fonctions `acq_*`/
`ops.garde_fenetre_meta` n'existaient pas (contre-vérification du même jour). Après application,
vérifié par `execute_sql` (`supabase_migrations.schema_migrations`) : la migration est enregistrée.

## 3. md5(prosrc) des fonctions
`node md5-migration.mjs supabase/migrations/0106_acquisition_echanges.sql '<json base>'` (json
obtenu par `select n.nspname||'.'||p.proname as f, md5(p.prosrc) as h from pg_proc p join
pg_namespace n ... where (n.nspname='public' and p.proname like 'acq\_%') or (n.nspname='ops' and
p.proname='garde_fenetre_meta')`) →
**`50 corps identiques, 0 différents, sur 50 fonction(s) du fichier`** (49 `public.acq_*` +
`ops.garde_fenetre_meta`). Tout identique.

## 4. Contrôle supabase/controles/0106_acquisition_echanges.sql (corrigé)
Exécuté tel quel (execute_sql, lecture seule) : **61 lignes, 61 « oui »** — les 49 vérifications par
fonction, « les 49 fonctions présentes, une seule version de chacune », aucune fonction acq_*
exécutable par anon/authenticated, `ops.garde_fenetre_meta` fermée et son déclencheur actif, les
quatre tables neuves fermées, les colonnes de `ops.envois`, la contrainte `reference`, les colonnes
de `ops.maquettes`, la contrainte `source` de `ops.reponses`, l'index unique de `ops.rendez_vous`,
`ops.prospects.effacement_demande_le`, le bucket `maquettes`, et le test corrigé (ni
`acq_reponse_relayer` ni `acq_envoi_marquer` ni `acq_oppositions_depuis`). Tout à « oui ».

## 5. Juge de la fiche en --reel
`node scripts/ops-acquisition-qa.mjs --migration=echanges --reel --confirmer-reel` :
```
ops-acquisition-qa echanges — racine . — --reel
✅ OB-1 … ✅ OB-24 (tous verts, y compris OB-3 après régénération des jumeaux)
✅ OB-R acq_preuves_a_garder : un id inconnu n'est pas rendu ; 501 ids → ops:borne ; acq_preuves_a_garder
   refusée avec la clé anon ; acq_formulaires_a_porter refusée avec la clé anon ; acq_envoi_preparer
   refusée avec la clé anon ; acq_oppositions_depuis inconnue (retirée) ; acq_envoi_envoye(p_envoi,
   p_sequenceur_id, p_entetes) inconnue ; acq_decision_creer à 8/1 option(s) → refus sans écrire ;
   acq_rdv_par_jeton/acq_maquette_par_jeton(inconnu) → null
ops-acquisition-qa echanges : PASS
```

## 6. Zéro trace
Après le `--reel` (lecture seule, execute_sql) :
`ops.conversations` = 0, `ops.meta_evenements` = 0, `ops.reponses` = 0, `ops.rendez_vous` = 0,
`ops.decisions` = 0, `ops.envois` = 0, `ops.prospects` = 0, objets du bucket `maquettes` = 0.
Le test `--reel` d'OB-R n'écrit rien de durable (appels en lecture seule, refus attendus, ou nettoyage
par la fonction elle-même) — confirmé par ces comptes tous à zéro juste après son exécution.

## Étape 8
`.orchestre/en-cours/026-061.md` déplacée vers `.orchestre/fait/026-061.md` ; `026-061.lock` et
`026-061.avant.txt` rangés dans `.orchestre/preuves/026-061/`. `node scripts/orchestre.mjs verifier
026-061` rejoué après application (voir la sortie de la commande suivante, PASS attendu avant
commit).
