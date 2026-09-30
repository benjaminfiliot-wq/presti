do $essai_026$
declare
  r jsonb := '{}'::jsonb;
begin
  execute $migration_026$---------------------------- _A_COLLER_sql_editor_0104_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists public.crieur_posts (
  id              uuid primary key default gen_random_uuid(),
  semaine         text not null,
  canal           text not null check (canal in ('linkedin', 'facebook', 'instagram')),
  fait_ids        text[] not null default '{}',
  texte           text not null,
  publora_id      text,
  statut          text not null check (statut in ('programmee', 'brouillon_publora', 'erreur', 'externe')),
  programmee_pour timestamptz,
  raisons         text[] not null default '{}',
  cree_le         timestamptz not null default now(),
  check (statut <> 'programmee' or programmee_pour is not null)
);
create unique index if not exists crieur_posts_semaine_canal on public.crieur_posts (semaine, canal) where statut <> 'externe';
create index if not exists crieur_posts_cree_le on public.crieur_posts (cree_le);
alter table public.crieur_posts enable row level security;
revoke all on public.crieur_posts from public, anon, authenticated;
create or replace function public.crieur_appel()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_secret is null then
    return null;
  end if;
  return net.http_get(
    url := 'https://prestiapp.fr/api/cron/crieur',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
end
$$;
revoke execute on function public.crieur_appel() from public, anon, authenticated, service_role;
select cron.schedule('presti-crieur', '0 5 * * *', 'select public.crieur_appel()');
comment on table public.crieur_posts is 'Les publications du Crieur (026-134) : une ligne par publication ; brouillon_publora (créneau proposé, l''accord de Benj se donne dans Publora) ou erreur écrits par la route, externe inscrit par Claude Code, programmee toléré mais plus écrit (R24). Un créneau (semaine, canal) hors externe n''est jamais refait.';
comment on function public.crieur_appel() is 'GET https://prestiapp.fr/api/cron/crieur avec le secret cron_secret du Vault (Bearer, délai 30 s) ; sans secret : return null, aucun appel. Exécutable par PERSONNE d''autre que son propriétaire (revoke de public, anon, authenticated, service_role). Appelée chaque jour à 5 h UTC par pg_cron (tâche presti-crieur).';

$migration_026$;

  begin

  declare ok boolean := false; 
  begin

    ok := to_regclass('public.crieur_posts') is not null
      and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'crieur_posts' and column_name = 'programmee_pour');
    r := r || jsonb_build_object('table', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('table', false, 'diag_table', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    ok := exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'crieur_posts' and c.relrowsecurity)
      and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'crieur_posts');
    r := r || jsonb_build_object('rls', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('rls', false, 'diag_rls', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; n integer := 0;
  begin

    begin execute 'set local role anon'; perform count(*) from public.crieur_posts; execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W01', 'linkedin', 'essai', 'erreur'); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform count(*) from public.crieur_posts; execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    execute 'reset role';
    ok := n = 3;
    r := r || jsonb_build_object('diag_anon_refuse', n || '/3');
    r := r || jsonb_build_object('anon_refuse', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('anon_refuse', false, 'diag_anon_refuse', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W01', 'linkedin', 'un', 'brouillon_publora');
    begin
      insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W01', 'linkedin', 'deux', 'erreur');
      ok := false;
    exception when unique_violation then ok := true; end;
    r := r || jsonb_build_object('unique_refuse', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('unique_refuse', false, 'diag_unique_refuse', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W02', 'facebook', 'un', 'brouillon_publora');
    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W02', 'facebook', 'ailleurs', 'externe');
    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W02', 'facebook', 'ailleurs encore', 'externe');
    ok := (select count(*) = 3 from public.crieur_posts where semaine = '2099-W02');
    r := r || jsonb_build_object('externe_accepte', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('externe_accepte', false, 'diag_externe_accepte', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    insert into public.crieur_posts (semaine, canal, texte, statut, programmee_pour) values ('2099-W03', 'instagram', 'reel', 'programmee', now() + interval '26 hours');
    begin
      insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W03', 'linkedin', 'sans horaire', 'programmee');
      ok := false;
    exception when check_violation then ok := true; end;
    begin
      insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W03', 'tiktok', 'canal inconnu', 'erreur');
      ok := false;
    exception when check_violation then null; end;
    ok := ok and (select count(*) = 1 from public.crieur_posts where semaine = '2099-W03' and canal = 'instagram');
    r := r || jsonb_build_object('instagram_accepte', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('instagram_accepte', false, 'diag_instagram_accepte', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    ok := exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'crieur_appel' and p.prosecdef)
      and not has_function_privilege('anon', 'public.crieur_appel()', 'execute')
      and not has_function_privilege('authenticated', 'public.crieur_appel()', 'execute')
      and not has_function_privilege('service_role', 'public.crieur_appel()', 'execute');
    r := r || jsonb_build_object('appel_protege', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('appel_protege', false, 'diag_appel_protege', left(sqlstate || ' ' || sqlerrm, 200));
  end;

  declare ok boolean := false; 
  begin

    ok := exists (select 1 from cron.job j where j.jobname = 'presti-crieur' and j.schedule = '0 5 * * *' and j.command = 'select public.crieur_appel()');
    r := r || jsonb_build_object('tache_planifiee', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('tache_planifiee', false, 'diag_tache_planifiee', left(sqlstate || ' ' || sqlerrm, 200));
  end;
  end;
  raise exception 'ESSAI_A_SEC % %', '8606e963f32d55f41f295bd5e524efec2a9e942a04313c79ecb4ac38cd0b5d3d', r::text;
end $essai_026$;
