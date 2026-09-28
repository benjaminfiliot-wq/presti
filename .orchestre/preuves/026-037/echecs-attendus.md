# Échecs attendus des juges du domaine acquisition sur leur arbre de référence

Une section par lot ; chacune est réécrite par la preuve à chaque passage.

<!-- lot:4:debut -->
## Lot 4 — fiche 026-037 — référence `86ce0f3`

Écrit par `node scripts/juges-026-acquisition-preuve.mjs --lot=4` le 2026-09-28T09:46:28Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-acquisition/reference`), avec `--racine`, puis en `--auto-controle` sur l'état actuel. L'extrait est la première ligne de critère de sa sortie, recopiée telle quelle (seul `|` est échappé), relue ici et retrouvée dans la sortie par la preuve.

| Juge et partie | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Autocontrôle |
|---|---|---|---|---|---|
| ops-acquisition-qa --migration=socle | `86ce0f3` | OA-1 | 1 | ❌ OA-1 0 fichier(s) supabase/migrations/*_acquisition_socle.sql, exactement 1 attendu | PASS, code 0 (AC-TEMOIN-SOCLE, AC-OA-1A, AC-OA-1B, AC-OA-2A, AC-OA-2B, AC-OA-2C, AC-OA-2D, AC-OA-3, AC-OA-4A, AC-OA-4B, AC-OA-5A, AC-OA-5B, AC-OA-6, AC-OA-7A, AC-OA-7B, AC-OA-7C, AC-OA-8, AC-OA-9A, AC-OA-9B, AC-OA-9C, AC-OA-10, AC-OA-11A, AC-OA-11B, AC-OA-11C, AC-OA-12A, AC-OA-12B, AC-OA-12C, AC-OA-13A, AC-OA-13B, AC-TEMOIN-OAR, AC-OAR-1, AC-OAR-2) |
| ops-acquisition-qa --migration=echanges | `86ce0f3` | OB-1 | 1 | ❌ OB-1 0 fichier(s) supabase/migrations/*_acquisition_echanges.sql, exactement 1 attendu | PASS, code 0 (AC-TEMOIN-ECHANGES, AC-OB-1, AC-OB-2A, AC-OB-2B, AC-OB-2C, AC-OB-3, AC-OB-4A, AC-OB-4B, AC-OB-4C, AC-OB-5, AC-OB-6A, AC-OB-6B, AC-OB-7, AC-OB-8, AC-OB-9A, AC-OB-9B, AC-OB-10, AC-OB-11, AC-OB-12, AC-OB-13, AC-OB-14A, AC-OB-14B, AC-OB-15, AC-OB-16A, AC-OB-16B, AC-OB-17, AC-OB-18, AC-OB-19, AC-OB-20A, AC-OB-20B, AC-OB-21A, AC-OB-21B, AC-OB-22, AC-OB-23, AC-OB-24A, AC-OB-24B, AC-OB-24C, AC-TEMOIN-OBR, AC-OBR-1, AC-OBR-2) |
| ops-acquisition-qa --migration=planification | `86ce0f3` | PG-1 | 1 | ❌ PG-1 0 fichier(s) supabase/migrations/*_acquisition_planification.sql, exactement 1 attendu | PASS, code 0 (AC-TEMOIN-PLANIFICATION, AC-PG-1A, AC-PG-1B, AC-PG-1C, AC-PG-2A, AC-PG-2B, AC-PG-2C, AC-PG-3, AC-PG-4, AC-TEMOIN-PGR, AC-PGR-1, AC-PGR-2) |
| routes-acquisition-qa --lot=recensement | `86ce0f3` | RA-1 | 1 | ❌ RA-1 absente(s) : app/api/cron/recenseur/route.ts, app/api/cron/juge-faits/route.ts, app/api/cron/vigie-meta/route.ts | PASS, code 0 (AC-TEMOIN-RECENSEMENT, AC-RA-1, AC-RA-2A, AC-RA-2B, AC-RA-2C, AC-RA-3, AC-RA-4A, AC-RA-4B, AC-RA-4C, AC-RA-5, AC-RA-6A, AC-RA-6B, AC-RA-8A, AC-RA-8B, AC-RA-9A, AC-RA-9B, AC-RA-9C, AC-RA-10A, AC-RA-10B, AC-RA-11A, AC-RA-11B, AC-RA-12A, AC-RA-12B) |
| routes-acquisition-qa --lot=echanges | `86ce0f3` | RB-1 | 1 | ❌ RB-1 absente(s) : app/api/cron/redacteur/route.ts, app/api/cron/standardiste/route.ts | PASS, code 0 (AC-TEMOIN-ECHANGES, AC-RB-1A, AC-RB-1B, AC-RB-2, AC-RB-3, AC-RB-4, AC-RB-5, AC-RB-6, AC-RB-8, AC-RB-9A, AC-RB-9B, AC-RB-10A, AC-RB-10B, AC-RB-11, AC-RB-12, AC-RB-13, AC-RB-14, AC-RB-15, AC-RB-16, AC-RB-17, AC-RB-18) |
| confidentialite-prospection-qa | `86ce0f3` | CP-1 | 1 | ❌ CP-1 aucune section Prospection : ni lib/confidentialite/prospection.ts ni « prospection » dans app/confidentialite/page.tsx (page non servie) | PASS, code 0 (AC-TEMOIN-CP, AC-CP-1A, AC-CP-1B, AC-CP-1C, AC-CP-2A, AC-CP-2B, AC-CP-2C, AC-CP-3A, AC-CP-3B, AC-CP-4, AC-CP-5, AC-CP-7A, AC-CP-7B, AC-CP-7C, AC-CP-7D, AC-TEMOIN-CPH, AC-CPH-1A, AC-CPH-1B, AC-CPH-1C, AC-CPH-3, AC-CPH-4, AC-CPH-2, AC-CPH-5, AC-CPH-6) |
<!-- lot:4:fin -->
