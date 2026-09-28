# 026-054 — application de 0110 (28/09)

Préalables : essai à sec vert (US-1 à US-7), contre-vérification indépendante verte (contre-verif-28-09.md).

1. `apply_migration` (projet gorcdvmueakcncsmrouo, nom 0110_usine_socle), contenu exact du fichier : succès.
2. md5(prosrc) en base = corps du fichier : 1/1 (public.ops_tache_detenue 6e02ef0a…).
3. Contrôle `supabase/controles/0110_usine_socle.sql` : 6/6 « oui ».
4. `node scripts/usine-sql-qa.mjs --reel` : PASS US-R (bucket privé à ses limites, clé anonyme refusée 401, ops_etat rend usine 30 min et livreur_usine 60 min).
5. Zéro trace : la migration ne crée aucune ligne de test ; les deux graines et le bucket sont voulus.
