-- 0126_agents_identites_station.sql — conformité 05/10 (E-18) : quatre identités de la station n'avaient pas de fiche en base.
-- `garde` (Contrôle), `tresorier` (Trésorerie), `contenu` (Contenu) et `douleurs` (Observatoire) figurent dans EQUIPAGE
-- (lib/pilotage/equipage.ts) mais pas dans ops.agents : la liste des agents de la station ne pouvait donc pas les montrer.
-- La graine prévue par 026-175 n'était pas dans la 0113 appliquée (voir 0125 pour `studio`, même cause).
-- Idempotent (ops_agent_enregistrer insère ou met à jour). N'écrit ni jeton, ni pause, ni battement : un agent sans battement
-- s'affiche « jamais battu », il ne prétend rien. Aucune capacité, aucun type de tâche, aucune table : l'identité seule, sans
-- aucun droit sur le bus ; un droit s'ajoutera le jour où l'agent a un jeton et une fiche qui le demande.
select public.ops_agent_enregistrer('garde', 'Garde (contrôle de conformité)', '{}'::text[], '{}'::text[], '{}'::text[], 60, 30, 0, 0);
select public.ops_agent_enregistrer('tresorier', 'Trésorier (trésorerie)', '{}'::text[], '{}'::text[], '{}'::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('contenu', 'Contenu (réseaux)', '{}'::text[], '{}'::text[], '{}'::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('douleurs', 'Douleurs (observatoire)', '{}'::text[], '{}'::text[], '{}'::text[], 1440, 30, 0, 0);
