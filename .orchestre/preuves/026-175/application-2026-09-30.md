# Application de 0113_station_reglages (fiche 026-175) — 30/09/2026

- **Par qui, sur quel ordre** : Claude Code (session cloud), sur la demande de Benj du 30/09 (« tu fais » : fusionner la PR et appliquer). Base : projet Supabase `gorcdvmueakcncsmrouo`.
- **Avant** : 0105 et 0112 appliquées (list_migrations) ; deux essais à sec joués (`essai-a-sec.txt`, `essai-separe.txt`), rien laissé.
- **Application** : `apply_migration`, nom `0113_station_reglages`, corps EXACT de `supabase/migrations/0113_station_reglages.sql` (fusionné dans main par la PR #1, commit cda6a99). Résultat : `{"success":true}`.
- **Contrôle** (`supabase/controles/0113_station_reglages.sql`, relu par `execute_sql`) : cinq fonctions présentes ; security definer, search_path posé, service_role seul ; les deux tables sous RLS, sans politique, sans droit pour anon, authenticated ni service_role ; aucune ligne de réglages et historique vide ; `pilotage_radar()` et `pilotage_prospects_departements()` répondent sans exception. Toutes les lignes à « oui ».
- **Reste** : le juge `pilotage-sql-qa --migration=reglages` reste rouge sur SR-9 (défaut du scénario du juge, voir `question.md`) ; `--reel` (clé de service) est à lancer sur le PC ; les cinq graines d'agents attendent l'extension du juge ; aucun drapeau n'est levé (la route des réglages, 026-177, n'existe pas encore).
