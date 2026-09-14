---------------------------- _A_COLLER_sql_editor_0091_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.audience_direct()
returns jsonb
language sql
stable
set search_path = public
as $$
  with actifs as (
    select distinct on (empreinte) empreinte, chemin
    from public.audience_vues
    where vue_le > now() - interval '5 minutes' and empreinte is not null
    order by empreinte, vue_le desc
  ),
  jour as (
    select chemin, empreinte from public.audience_vues
    where vue_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
  ),
  semaine as (
    select chemin, entree, source, campagne, appareil, pays from public.audience_vues
    where vue_le > now() - interval '7 days'
  )
  select jsonb_build_object(
    'en_ligne', (select count(*) from actifs),
    'pages_en_ligne', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select chemin as cle, count(*) as n from actifs group by chemin) x), '[]'::jsonb),
    'vues_jour', (select count(*) from jour),
    'visiteurs_jour', (select count(distinct empreinte) from jour),
    'entonnoir_jour', jsonb_build_object(
      'accueil', (select count(distinct empreinte) from jour where chemin = '/'),
      'inscription', (select count(distinct empreinte) from jour where chemin = '/signup'),
      'connexion', (select count(distinct empreinte) from jour where chemin = '/login')
    ),
    'sources_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select coalesce(source, 'direct') as cle, count(*) as n from semaine where entree group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'campagnes_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select campagne as cle, count(*) as n from semaine where entree and campagne is not null group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'pages_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select chemin as cle, count(*) as n from semaine group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'appareils_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select appareil as cle, count(*) as n from semaine where entree group by 1) x), '[]'::jsonb),
    'pays_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select coalesce(pays, '??') as cle, count(*) as n from semaine where entree group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'flux', coalesce((select jsonb_agg(jsonb_build_object('a', date_trunc('minute', vue_le), 'chemin', chemin, 'entree', entree,
        'source', case when discret then null else source end,
        'appareil', case when discret then null else appareil end,
        'pays', case when discret then null else pays end) order by vue_le desc)
      from (select vue_le, chemin, entree, source, appareil, pays, chemin in ('/login', '/signup') as discret
            from public.audience_vues order by vue_le desc limit 40) x), '[]'::jsonb),
    'premiere_vue', (select min(vue_le) from public.audience_vues)
  );
$$;
drop function if exists public.audience_cloturer();
create or replace function public.audience_cloturer(p_mois integer default 13)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  limite date := (now() at time zone 'Europe/Paris')::date;
  n_empreintes integer;
  n_plafonds integer;
  n_vues integer;
begin
  -- Chaque jour fini verse son compte AVANT que ses empreintes ne partent : dans l'ordre inverse, il serait perdu.
  insert into public.audience_jours (jour, visiteurs, vues)
  select d.jour, count(distinct v.empreinte), count(*)
  from (
    select distinct (vue_le at time zone 'Europe/Paris')::date as jour
    from public.audience_vues
    where empreinte is not null and (vue_le at time zone 'Europe/Paris')::date < limite
  ) d
  join public.audience_vues v on (v.vue_le at time zone 'Europe/Paris')::date = d.jour
  group by d.jour
  on conflict (jour) do update
    set visiteurs = excluded.visiteurs, vues = excluded.vues, cloture_le = now();
  update public.audience_vues
     set empreinte = null
   where empreinte is not null and (vue_le at time zone 'Europe/Paris')::date < limite;
  get diagnostics n_empreintes = row_count;
  delete from public.limites
   where cle like 'audience:%' and fenetre + make_interval(secs => fenetre_s) <= now();
  get diagnostics n_plafonds = row_count;
  delete from public.audience_vues
   where vue_le < now() - make_interval(months => least(greatest(coalesce(p_mois, 13), 1), 25));
  get diagnostics n_vues = row_count;
  return jsonb_build_object('empreintes', n_empreintes, 'plafonds', n_plafonds, 'vues', n_vues);
end
$$;
revoke all on function public.audience_direct(), public.audience_cloturer(integer) from public, anon, authenticated;
grant execute on function public.audience_direct(), public.audience_cloturer(integer) to service_role;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'audience_cloturer (attendu : p_mois integer → jsonb, une seule)' as quoi,
       coalesce((select string_agg(pg_get_function_identity_arguments(oid) || ' → ' || pg_get_function_result(oid), ' ; ') from pg_proc where pronamespace = 'public'::regnamespace and proname = 'audience_cloturer'), 'ABSENTE (anormal)') as resultat
union all
select 'flux sans campagne ni navigateur (attendu : oui)',
       case when pg_get_functiondef('public.audience_direct()'::regprocedure) like '%''navigateur''%' then 'NON (anormal)' else 'oui' end
union all
select 'appel depuis le navigateur (attendu : non)',
       case when has_function_privilege('anon', 'public.audience_cloturer(integer)', 'execute') or has_function_privilege('authenticated', 'public.audience_cloturer(integer)', 'execute') or has_function_privilege('anon', 'public.audience_direct()', 'execute') then 'OUI (anormal)' else 'non' end
union all
select 'créneaux de plafond audience terminés encore en base (0 après la prochaine clôture)',
       (select count(*)::text from public.limites where cle like 'audience:%' and fenetre + make_interval(secs => fenetre_s) <= now());
