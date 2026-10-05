-- 0125_agent_studio.sql — 026-202 : l'identité `studio` (Studio pubs, A6 et A9) manquait en base.
-- Les routes /api/usine/pubs/* n'acceptent que l'agent `studio` (jeton PRESTI_JETON_STUDIO) ; la graine prévue par 026-175 n'était
-- pas dans la 0113 appliquée. Idempotent (ops_agent_enregistrer insère ou met à jour) ; n'écrit ni jeton, ni pause, ni battement.
select public.ops_agent_enregistrer('studio', 'Studio pubs (A6 et A9)', '{}'::text[], '{}'::text[], array['evenements']::text[], 60, 30, 0, 0);
