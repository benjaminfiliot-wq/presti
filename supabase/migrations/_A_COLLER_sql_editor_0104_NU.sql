---------------------------- _A_COLLER_sql_editor_0104_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- 0104 · Contrôle en lecture seule (fiche 026-134) : à lancer APRÈS l'application, il ne fait que LIRE.
-- Chaque ligne « resultat » doit valoir « oui ».
select 'la table public.crieur_posts existe (attendu : oui)' as quoi,
       case when to_regclass('public.crieur_posts') is not null then 'oui' else 'NON (anormal)' end as resultat
union all
select 'crieur_posts sous RLS (relrowsecurity), sans aucune politique (pg_policies) (attendu : oui)',
       case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                          where n.nspname = 'public' and c.relname = 'crieur_posts' and c.relrowsecurity)
             and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'crieur_posts')
            then 'oui' else 'NON (anormal)' end
union all
select 'anon et authenticated sans aucun droit sur crieur_posts (attendu : oui)',
       case when not has_table_privilege('anon', 'public.crieur_posts', 'select') and not has_table_privilege('authenticated', 'public.crieur_posts', 'select')
             and not has_table_privilege('anon', 'public.crieur_posts', 'insert') and not has_table_privilege('authenticated', 'public.crieur_posts', 'insert')
            then 'oui' else 'NON (anormal)' end
union all
select 'crieur_appel : security definer et exécutable par personne, ni anon, ni authenticated, ni service_role (attendu : oui)',
       case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = 'crieur_appel' and p.prosecdef
                            and not has_function_privilege('anon', p.oid, 'execute') and not has_function_privilege('authenticated', p.oid, 'execute')
                            and not has_function_privilege('service_role', p.oid, 'execute'))
            then 'oui' else 'NON (anormal)' end
union all
select 'la tâche presti-crieur est planifiée « 0 5 * * * » et active (attendu : oui)',
       case when exists (select 1 from cron.job j where j.jobname = 'presti-crieur' and j.schedule = '0 5 * * *' and j.active)
            then 'oui' else 'NON (anormal)' end;
