---------------------------- _A_COLLER_sql_editor_0104.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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
