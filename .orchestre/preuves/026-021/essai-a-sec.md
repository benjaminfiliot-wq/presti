# 026-021 — essai à sec de 0103 sur la vraie base (27/09/2026, Claude Code)

Projet `gorcdvmueakcncsmrouo` (presti). Connecteur Supabase, `execute_sql` seulement, rôle `postgres`, **jamais `apply_migration`** : la session principale appliquera. Un seul énoncé `do $essai$ … raise exception` : l'exception rend le résultat ET annule tout.

Benj : un essai à sec a tourné sur la production. Il n'a rien laissé (contrôle « zéro trace » plus bas).

## Le jumeau nu éprouvé

- Fichier : `supabase/migrations/_A_COLLER_sql_editor_0103_NU.sql` (5 945 octets, LF).
- **SHA-256 du jumeau nu courant : `179fbd1e22e098d7610d17766e1cea14486db966c94a5a5aae435aeb146276a7`**
- `sha256_nu_recu`, calculé par la base sur le texte reçu : `179fbd1e22e098d7610d17766e1cea14486db966c94a5a5aae435aeb146276a7`. **Identiques** : c'est bien ce fichier, octet pour octet, qui a tourné.
- Le bloc a été fabriqué depuis le fichier, jamais retapé : `.orchestre/preuves/026-021/bloc-essai.sql` (10 510 octets, SHA-256 `a9919fee3f659036995ac2457e5eb723443f85ac1da9b5ff78d847aea240f7c9`). Il coupe le nu à la marque `-- CONTROLE APRES COLLAGE`. Il exécute la partie migration, puis le contrôle en pied comme requête (celui de `supabase/controles/0103_livraison_commandes.sql`).

## Nom de la contrainte

Lu avant l'essai dans `pg_constraint` : `sites_commandes_etat_check`, `CHECK ((etat = ANY (ARRAY['brouillon'::text, 'payee'::text, 'generee'::text, 'validee'::text, 'en_ligne'::text])))`. C'est celui de la migration : rien à corriger.

## Verdict par étape

| Étape | Attendu | Obtenu | Verdict |
|---|---|---|---|
| A. contrôle sur la prod | 21 × « non » | 21 × « non » (17 colonnes, la contrainte sans `retiree`, 3 index) | OK |
| B. migration (le nu) | passe | passée | OK |
| C. contrôle après | 21 × « oui » | 21 × « oui » | OK |
| D. idempotence : la migration une 2e fois | passe, contrôle inchangé | passée, 21 × « oui » | OK |
| E. insertion `etat = 'retiree'` | acceptée, défauts posés | acceptée ; `achat_public` false, `lien_envois` 0, `courriels` `{}`, `generation_tentatives` 0, `generation_duree_s` et `retiree_le` null | OK |
| F1. `etat = 'inconnu'` | refus 23514 | 23514 `sites_commandes_etat_check` | OK |
| F2. `lien_envois = -1` | refus 23514 | 23514 `sites_commandes_lien_envois_check` | OK |
| F3. `generation_tentatives = -1` | refus 23514 | 23514 `sites_commandes_generation_tentatives_check` | OK |
| F4. `generation_duree_s = -1` | refus 23514 | 23514 `sites_commandes_generation_duree_s_check` | OK |
| F5. `courriels = null` | refus 23502 | 23502 not-null | OK |
| G1. `anon` lit `dossier_jeton_hash` | refus | 42501 permission denied | OK |
| G2. `authenticated` lit `dossier_jeton_hash` | refus | 42501 permission denied | OK |
| H. contrainte recréée | les 5 états + `retiree` | `CHECK ((etat = ANY (ARRAY['brouillon'::text, 'payee'::text, 'generee'::text, 'validee'::text, 'en_ligne'::text, 'retiree'::text])))` | OK |

## Sortie brute du connecteur

```
{"error":{"name":"HttpException","message":"Failed to run sql query: ERROR:  P0001: essai-a-sec-0103: toutes les instructions ont passé | {\"E_defauts\": {\"courriels\": {}, \"retiree_le\": null, \"lien_envois\": 0, \"achat_public\": false, \"generation_duree_s\": null, \"generation_tentatives\": 0}, \"B_migration\": \"passee\", \"H_contrainte\": \"CHECK ((etat = ANY (ARRAY['brouillon'::text, 'payee'::text, 'generee'::text, 'validee'::text, 'en_ligne'::text, 'retiree'::text])))\", \"H_role_courant\": \"postgres\", \"sha256_nu_recu\": \"179fbd1e22e098d7610d17766e1cea14486db966c94a5a5aae435aeb146276a7\", \"D_seconde_passe\": \"passee\", \"F1_etat_inconnu\": \"23514 new row for relation \\\"sites_commandes\\\" violates check constraint \\\"sites_commandes_etat_check\\\"\", \"A_controle_avant\": [\"colonne entreprise=non\", \"colonne achat_public=non\", \"colonne cgu_acceptees_le=non\", \"colonne lien_envoye_le=non\", \"colonne lien_envois=non\", \"colonne rattachee_le=non\", \"colonne courriels=non\", \"colonne search_console_le=non\", \"colonne compte_supprime_le=non\", \"colonne retiree_le=non\", \"colonne dossier_jeton_hash=non\", \"colonne dossier_expire_le=non\", \"colonne dossier_envoye_le=non\", \"colonne fichiers_purges_le=non\", \"colonne generation_demandee_le=non\", \"colonne generation_tentatives=non\", \"colonne generation_duree_s=non\", \"contrainte sites_commandes_etat_check (avec retiree)=non\", \"index sites_commandes_retraits_dus_idx=non\", \"index sites_commandes_brouillons_publics_idx=non\", \"index sites_commandes_rattachement_idx=non\"], \"C_controle_apres\": [\"colonne entreprise=oui\", \"colonne achat_public=oui\", \"colonne cgu_acceptees_le=oui\", \"colonne lien_envoye_le=oui\", \"colonne lien_envois=oui\", \"colonne rattachee_le=oui\", \"colonne courriels=oui\", \"colonne search_console_le=oui\", \"colonne compte_supprime_le=oui\", \"colonne retiree_le=oui\", \"colonne dossier_jeton_hash=oui\", \"colonne dossier_expire_le=oui\", \"colonne dossier_envoye_le=oui\", \"colonne fichiers_purges_le=oui\", \"colonne generation_demandee_le=oui\", \"colonne generation_tentatives=oui\", \"colonne generation_duree_s=oui\", \"contrainte sites_commandes_etat_check (avec retiree)=oui\", \"index sites_commandes_retraits_dus_idx=oui\", \"index sites_commandes_brouillons_publics_idx=oui\", \"index sites_commandes_rattachement_idx=oui\"], \"F5_courriels_null\": \"23502 null value in column \\\"courriels\\\" of relation \\\"sites_commandes\\\" violates not-null constraint\", \"E_insertion_retiree\": \"acceptee\", \"F2_lien_envois_negatif\": \"23514 new row for relation \\\"sites_commandes\\\" violates check constraint \\\"sites_commandes_lien_envois_check\\\"\", \"D_controle_apres_seconde\": [\"colonne entreprise=oui\", \"colonne achat_public=oui\", \"colonne cgu_acceptees_le=oui\", \"colonne lien_envoye_le=oui\", \"colonne lien_envois=oui\", \"colonne rattachee_le=oui\", \"colonne courriels=oui\", \"colonne search_console_le=oui\", \"colonne compte_supprime_le=oui\", \"colonne retiree_le=oui\", \"colonne dossier_jeton_hash=oui\", \"colonne dossier_expire_le=oui\", \"colonne dossier_envoye_le=oui\", \"colonne fichiers_purges_le=oui\", \"colonne generation_demandee_le=oui\", \"colonne generation_tentatives=oui\", \"colonne generation_duree_s=oui\", \"contrainte sites_commandes_etat_check (avec retiree)=oui\", \"index sites_commandes_retraits_dus_idx=oui\", \"index sites_commandes_brouillons_publics_idx=oui\", \"index sites_commandes_rattachement_idx=oui\"], \"G1_anon_dossier_jeton_hash\": \"42501 permission denied for table sites_commandes\", \"F4_generation_duree_negative\": \"23514 new row for relation \\\"sites_commandes\\\" violates check constraint \\\"sites_commandes_generation_duree_s_check\\\"\", \"F3_generation_tentatives_negatif\": \"23514 new row for relation \\\"sites_commandes\\\" violates check constraint \\\"sites_commandes_generation_tentatives_check\\\"\", \"G2_authenticated_dossier_jeton_hash\": \"42501 permission denied for table sites_commandes\"}\nCONTEXT:  PL/pgSQL function inline_code_block line 131 at RAISE\n"}}
```

## Zéro trace (lecture seule, juste après l'essai)

```
colonnes_0103: 0            colonnes_total: 25 (celles de 0088)
contrainte_etat: CHECK ((etat = ANY (ARRAY['brouillon'::text, 'payee'::text, 'generee'::text, 'validee'::text, 'en_ligne'::text])))   (sans retiree)
contraintes: sites_commandes_artisan_id_fkey, sites_commandes_domaine_mode_check, sites_commandes_etat_check, sites_commandes_pkey, sites_commandes_prix_cents_check
index: sites_commandes_artisan_idx, sites_commandes_etat_idx, sites_commandes_pkey, sites_commandes_stripe_session_key   (aucun des trois de 0103)
lignes: 0                   lignes_essai (essai-a-sec-0103%): 0
politiques: 1 (« site commande : l artisan lit ses commandes », celle de 0088)
commentaires de colonnes: 0
migration 0103 enregistrée (supabase_migrations.schema_migrations): 0
anon select: false          authenticated select: false
fonctions *0103* / *livraison*: 0
```

La base est exactement dans l'état d'avant l'essai.

## Suite (session principale)

1. `apply_migration` nommée `0103_livraison_commandes`, avec le contenu de `supabase/migrations/0103_livraison_commandes.sql`.
2. Lire `supabase/controles/0103_livraison_commandes.sql` : 21 lignes, toutes « oui ».
3. `node scripts/livraison-schema-qa.mjs --numero=0103 --reel` (SC-10, par PostgREST, ménage dans un finally).
