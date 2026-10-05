-- 0128 — la réunion du chef ne s'ouvrait plus (HTTP 503 « Base indisponible ») : avec 30 agents au bus, les chiffres du jour dépassent 8 Ko
-- (contrainte reunions_chiffres_check, 0112). Plafond relevé à 16 Ko : place pour une cinquantaine d'agents. Rien d'autre ne change.
-- Constaté le 05/10/2026 : DO + station_reunion_ouvrir('chef') + raise annule -> 23514 reunions_chiffres_check.
alter table ops.reunions drop constraint if exists reunions_chiffres_check;
alter table ops.reunions add constraint reunions_chiffres_check check (pg_column_size(chiffres) <= 16384);
