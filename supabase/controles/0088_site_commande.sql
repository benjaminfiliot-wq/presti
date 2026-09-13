select 'table sites_commandes' as quoi,
       coalesce((select 'oui (' || count(*)::text || ' colonnes)' from information_schema.columns where table_schema = 'public' and table_name = 'sites_commandes'), 'NON (anormal)') as resultat
union all
select 'index unique sur stripe_session_id',
       coalesce((select 'oui' from pg_indexes where schemaname = 'public' and indexname = 'sites_commandes_stripe_session_key'), 'NON (anormal)')
union all
select 'RLS activee sur sites_commandes',
       coalesce((select case when relrowsecurity then 'oui' else 'NON (anormal)' end from pg_class where oid = 'public.sites_commandes'::regclass), 'NON (anormal) : table absente')
union all
select 'politiques sur sites_commandes',
       coalesce((select string_agg(policyname || ' [' || cmd || ']', ', ' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'sites_commandes'), 'aucune (anormal)')
union all
select 'artisans.site_origine',
       coalesce((select 'oui, defaut ' || coalesce(column_default, '?') from information_schema.columns where table_schema = 'public' and table_name = 'artisans' and column_name = 'site_origine'), 'NON (anormal)')
union all
select 'sites existants (site_active) tous en origine abonnement',
       (select count(*)::text || ' actifs, dont ' || count(*) filter (where site_origine = 'abonnement')::text || ' en abonnement' from public.artisans where site_active);
