# 026-136 — contre-vérification (4 sabotages demandés, 7 faits)

Date : 2026-10-04 (nom du fichier selon la consigne du moteur). Juge : `node scripts/ops-acquisition-qa.mjs --migration=planification`, lancé sur la production du PC.
Méthode : chaque sabotage modifie UN fichier de la production, relance le juge, puis restaure le fichier d'origine (octet pour octet, dans un finally). Les empreintes sha256 sont relues après les sept sabotages.

| # | critère attendu | sabotage | code | pris par |
|---|---|---|---|---|
| S1 | PG-1 | calendrier du Standard changé de */5 à */6 dans la migration | 1 | ❌ PG-1 acq-standardiste à « */6 * * * * », « */5 * * * * » attendu ; ❌ PG-4 sql-nu.mjs --verifier supabase/migrations/0109_acquisition_planification.sql supabase/migrations/_A_COL |
| S2 | PG-2 | timeout_milliseconds de acq-facteur ramené de 60000 à 5000 | 1 | ❌ PG-2 acq-facteur : timeout_milliseconds 5000, 55 000 au moins ; ❌ PG-4 sql-nu.mjs --verifier supabase/migrations/0109_acquisition_planification.sql supabase/migrations/_A_COL |
| S3 | PG-3 | le fichier d'annulation retire aussi une tâche étrangère (cron.unschedule('presti-autre')) | 1 | ❌ PG-3 annule presti-autre, hors des onze |
| S4 | PG-4 | le contrôle n'est plus en lecture seule (delete from cron.job) | 1 | ❌ PG-4 ce qui suit la marque dans supabase/migrations/_A_COLLER_sql_editor_0109_NU.sql n'est pas exactement su |
| S5 | PG-1 | la passe de pause acq-facteur-pause (retirée par la voie gratuite) est replanifiée | 1 | ❌ PG-1 tâche en trop : acq-facteur-pause ; une tâche acq-facteur-pause ou ?passe=pause ; ❌ PG-4 sql-nu.mjs --verifier supabase/migrations/0109_acquisition_planification.sql supabase/migrations/_A_COL |
| S6 | PG-2 | un jeton litteral remplace la lecture du Vault pour acq-repondeur | 1 | ❌ PG-2 acq-repondeur : l'en-tête n'est pas construit depuis vault.decrypted_secrets ; « Bearer » suivi d'un li ; ❌ PG-4 sql-nu.mjs --verifier supabase/migrations/0109_acquisition_planification.sql supabase/migrations/_A_COL |
| S7 | PG-4 | vercel.json touché (une clé ajoutée) | 1 | ❌ PG-4 vercel.json a changé (git diff HEAD) |

Les PG-4 additionnels de S1, S2, S5 et S6 sont attendus : le jumeau _A_COLLER ne dit plus la même chose que la migration sabotée.

## sha256 avant / après (identiques)

- `supabase/migrations/0109_acquisition_planification.sql` : 3013fd85e27fe2c0bb7addba22240cf71a1710a5898bf75fc34246d4426476b7 = restauré
- `supabase/migrations/_A_COLLER_sql_editor_0109.sql` : b9eefd5d1d8e99014f01261ae2f59a63d23f02b97078b345364bdf0e6281a27e = restauré
- `supabase/migrations/_A_COLLER_sql_editor_0109_NU.sql` : 7bcf6a90cd669ad4780757ee46afa00294192262eb31b001283886f005a9350f = restauré
- `supabase/controles/0109_acquisition_planification.sql` : 8b8104be9e7774e6d76d47658d8a03c5369ee12bbb199facca1bcd9bfdbfb5fb = restauré
- `supabase/controles/0109_acquisition_planification_annuler.sql` : 08cf9a6fef89f5d3747376dd740ac5d1b350f388cc9ad4638dc7734ce70cc4ff = restauré
- `vercel.json` : 788d66d88f679477943c9ef0105f386766034ab4e1a012654246d041b7ce0f6d = restauré

Tous pris : true · fichiers restaurés : true · juge rejoué sur la production restaurée : code 0, PASS = true.
