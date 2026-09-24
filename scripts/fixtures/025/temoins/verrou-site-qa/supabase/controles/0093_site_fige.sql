select 'site_active figé pour le navigateur (attendu : oui)' as quoi,
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_active := old.site_active;%' then 'oui' else 'NON (anormal)' end as resultat
union all
select 'site_tier figé pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_tier := old.site_tier;%' then 'oui' else 'NON (anormal)' end
union all
select 'site_contenu figé pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_contenu := old.site_contenu;%' then 'oui' else 'NON (anormal)' end
union all
select 'site_origine figé pour le navigateur (attendu : oui)',
       case when pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) like '%new.site_origine := old.site_origine;%' then 'oui' else 'NON (anormal)' end
union all
select 'déclencheur trg_lock_artisan_upd sur artisans (attendu : oui)',
       case when exists (select 1 from pg_trigger where tgname = 'trg_lock_artisan_upd' and tgrelid = 'public.artisans'::regclass and not tgisinternal) then 'oui' else 'NON (anormal)' end;
