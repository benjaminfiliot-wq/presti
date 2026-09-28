# 026-034 — application de 0099 (28/09)

Préalables : essai à sec vert (passe 2, PRET_A_APPLIQUER), contre-vérification indépendante verte (toutes les attaques refusées, zéro trace), fichier identique au jumeau `_A_COLLER_sql_editor_0099.sql` (sha cc58e5128833, 45 994 octets), juge statique PASS.

1. `apply_migration` (connecteur Supabase, projet gorcdvmueakcncsmrouo, nom 0099_ops_garde_envois), contenu exact du fichier : succès.
2. md5(prosrc) en base = corps du fichier : 4/4 (ops.garde_envois bd03ec8e…, ops.garde_accords db8f82dd…, ops.annuler_sur_opposition 94f5c6b8…, public.ops_garde_etat 4da9543e…).
3. Contrôle `supabase/controles/0099_ops_garde_envois.sql` : 11/11 « oui » (3 déclencheurs, contrainte de statut, correction du 28/09, accords_benj sans droit d'API, plafonds, envoi_froid fermé, droits d'ops_garde_etat, aucune fonction exécutable par anon/authenticated, une seule version).
4. `node scripts/prospection-sql-qa.mjs --reel` : PASS PG-8 (ops_garde_etat 200 par la clé de service, 401 42501 par la clé anonyme).
5. Zéro trace : 0 envoi, 0 accord, 0 opposition, 0 événement de garde ; interrupteurs inchangés (envoi_froid false, pause_generale false).
