-- Contrôle de 0107_pilotage_lecture.sql — lecture seule (fiche 026-076). Une ligne « oui » par point du
-- « Ce qu'il faut faire » 3 : les treize fonctions existent, security definer, search_path ops, public,
-- pg_temp posé ; anon et authenticated sans droit d'exécution, service_role avec ; ops.code_etat sous RLS,
-- sans politique.
with fns(sig) as (
  values
    ('public.pilotage_decisions(integer)'),
    ('public.pilotage_decision(uuid)'),
    ('public.pilotage_decisions_par_cles(text[])'),
    ('public.pilotage_agents()'),
    ('public.pilotage_couts_agents(timestamptz)'),
    ('public.pilotage_couts_taches(timestamptz,integer)'),
    ('public.pilotage_couts_modeles(timestamptz)'),
    ('public.pilotage_chef()'),
    ('public.pilotage_evenements(bigint,integer,text,text[])'),
    ('public.pilotage_attention_sources()'),
    ('public.pilotage_taches_agent(text,integer)'),
    ('public.pilotage_code_publier(jsonb)'),
    ('public.pilotage_code_lire()')
),
p as (
  select f.sig, to_regprocedure(f.sig) as oid from fns f
)
select 'les 13 fonctions pilotage_* existent (attendu : oui)' as quoi,
       case when (select count(*) from p where oid is not null) = 13 then 'oui' else 'NON (anormal)' end as resultat
union all
select 'les 13 sont security definer, search_path ops, public, pg_temp posé (attendu : oui)',
       case when (select count(*)
                    from p join pg_proc pr on pr.oid = p.oid
                   where pr.prosecdef
                     and exists (select 1 from unnest(coalesce(pr.proconfig, '{}'::text[])) c where c = 'search_path=ops, public, pg_temp')
                 ) = 13
            then 'oui' else 'NON (anormal)' end
union all
select 'anon sans droit d''exécution sur les 13 (attendu : oui)',
       case when not exists (select 1 from p where has_function_privilege('anon', p.sig, 'execute')) then 'oui' else 'NON (anormal)' end
union all
select 'authenticated sans droit d''exécution sur les 13 (attendu : oui)',
       case when not exists (select 1 from p where has_function_privilege('authenticated', p.sig, 'execute')) then 'oui' else 'NON (anormal)' end
union all
select 'service_role a le droit d''exécution sur les 13 (attendu : oui)',
       case when (select count(*) from p where has_function_privilege('service_role', p.sig, 'execute')) = 13 then 'oui' else 'NON (anormal)' end
union all
select 'ops.code_etat : RLS active, aucune politique (attendu : oui)',
       case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                          where n.nspname = 'ops' and c.relname = 'code_etat' and c.relrowsecurity)
             and not exists (select 1 from pg_policies where schemaname = 'ops' and tablename = 'code_etat')
            then 'oui' else 'NON (anormal)' end;
