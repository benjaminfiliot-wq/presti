# Contre-vérification 026-088 (29/09) — sabotages réversibles de supabase/migrations/0112_pilotage_station.sql

sha256 avant et après chaque sabotage : 8faef4f1e03fde3e8118825fc94ec6b6cdcf94bf4ed390127666055f258f9e67 (restauré à l'identique).
Juge : `node scripts/pilotage-sql-qa.mjs --migration=station` (statique ; SS-10 et SS-15 exigent l'essai à sec, pas encore fait).

| Sabotage | Critères passés au rouge |
|---|---|
| S1 : lecture de `is_founder` retirée de `station_experience_arreter` | SS-5 (+ SS-9, jumeaux désynchronisés) |
| S2 : quota du pont 20 -> 30 | SS-14 (+ SS-9) |
| S3 : la pause du pont met `actif = false` | SS-14 (+ SS-9, SS-11) |
| S4 : `revoke` de `station_pause_par_agent` retiré | SS-3 (+ SS-9, SS-11) |
| S5 : `check (budget_eur = 0)` retiré | SS-2 (+ SS-9, SS-11) |
