---------------------------- _A_COLLER_sql_editor_0192_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.leads add column if not exists motif_reponse text;
alter table public.leads add column if not exists accuse_n8n_le timestamptz;
do $contrainte$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_motif_reponse_borne' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_motif_reponse_borne check (motif_reponse is null or motif_reponse in
      ('auto','assistee','verrou_offre','manuelle','escalade','horaire','humain','limite','pause','throttle','credits'));
  end if;
end
$contrainte$;
create index if not exists leads_motif_reponse_cree on public.leads (created_at) where motif_reponse is not null;
comment on column public.leads.motif_reponse is
  'Motif de la réponse décidé par /api/leads (0192) : auto, assistee, verrou_offre, manuelle, escalade, horaire, humain, limite, pause, throttle, credits ; vide pour un formulaire de site sans plateforme. Lu par n8n (presti-accuse-reception).';
comment on column public.leads.accuse_n8n_le is
  'Accusé de réception et avis envoyés par n8n (0192) ; écrit seulement par leads_marquer_accuse.';
create or replace function public.leads_motif_garde()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.motif_reponse := null;
      new.accuse_n8n_le := null;
    else
      new.motif_reponse := old.motif_reponse;
      new.accuse_n8n_le := old.accuse_n8n_le;
    end if;
  end if;
  return new;
end
$fn$;
drop trigger if exists leads_motif_garde on public.leads;
create trigger leads_motif_garde
  before insert or update of motif_reponse, accuse_n8n_le on public.leads
  for each row execute function public.leads_motif_garde();
revoke all on function public.leads_motif_garde() from public, anon, authenticated;
create or replace view public.n8n_accuses_dus with (security_barrier = true) as
select
  l.id,
  l.artisan_id,
  l.created_at,
  l.motif_reponse,
  l.nom_prospect,
  l.contact,
  (select count(*) from public.leads d
     where d.contact is not null
       and lower(btrim(d.contact)) = lower(btrim(l.contact))
       and d.created_at >= l.created_at - interval '24 hours'
       and (d.created_at, d.id) < (l.created_at, l.id))::integer as doublons_24h,
  a.nom as artisan_nom,
  a.email as artisan_email,
  a.notifications as artisan_notifications
from public.leads l
join public.artisans a on a.id = l.artisan_id
where l.motif_reponse in ('manuelle','escalade','horaire','humain','limite')
  and l.created_at >= now() - interval '1 hour'
  and l.accuse_n8n_le is null;
comment on view public.n8n_accuses_dus is
  'Les seules demandes dont n8n doit envoyer l''accusé et l''avis (0192) : silence, dernière heure, non marquées ; ce que l''envoi exige, rien d''autre. Lue par n8n_lecture seul.';
revoke all on public.n8n_accuses_dus from public, anon, authenticated, service_role;
create or replace function public.leads_marquer_accuse(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $fn$
declare
  n integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 200 then
    raise exception 'leads_marquer_accuse : 200 identifiants au plus par appel (% reçus)', cardinality(p_ids);
  end if;
  update public.leads
     set accuse_n8n_le = now()
   where id = any(p_ids)
     and accuse_n8n_le is null
     and motif_reponse in ('manuelle','escalade','horaire','humain','limite')
     and created_at >= now() - interval '1 hour';
  get diagnostics n = row_count;
  return n;
end
$fn$;
revoke all on function public.leads_marquer_accuse(uuid[]) from public, anon, authenticated, service_role;
do $droits$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    grant select on public.n8n_accuses_dus to n8n_lecture;
    grant select (motif_reponse, accuse_n8n_le) on public.leads to n8n_lecture;
    grant execute on function public.leads_marquer_accuse(uuid[]) to n8n_lecture;
  else
    raise notice '0192 : rôle n8n_lecture absent (0189 non appliquée) — droits sautés, à rejouer après 0189';
  end if;
end
$droits$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'colonnes motif_reponse, accuse_n8n_le (attendu : accuse_n8n_le timestamp with time zone, motif_reponse text)' as controle,
  coalesce(string_agg(column_name || ' ' || data_type, ', ' order by column_name), 'ABSENTES') as valeur
  from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name in ('motif_reponse', 'accuse_n8n_le')
union all
select 'contrainte leads_motif_reponse_borne', coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'leads_motif_reponse_borne' and conrelid = 'public.leads'::regclass), 'ABSENTE')
union all
select 'index leads_motif_reponse_cree', coalesce((select indexdef from pg_indexes where schemaname = 'public' and indexname = 'leads_motif_reponse_cree'), 'ABSENT')
union all
select 'garde leads_motif_garde', coalesce((select tgname::text from pg_trigger where tgname = 'leads_motif_garde' and tgrelid = 'public.leads'::regclass), 'ABSENTE')
union all
select 'colonnes de la vue (attendu : 10, de id à artisan_notifications)', coalesce(string_agg(column_name, ', ' order by ordinal_position), 'VUE ABSENTE')
  from information_schema.columns where table_schema = 'public' and table_name = 'n8n_accuses_dus'
union all
select 'droits sur la vue (attendu : n8n_lecture:SELECT seul, hors propriétaire)', coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee), 'aucun')
  from information_schema.role_table_grants where table_schema = 'public' and table_name = 'n8n_accuses_dus' and grantee <> (select pg_get_userbyid(relowner) from pg_class where oid = to_regclass('public.n8n_accuses_dus'))
union all
select 'fonction leads_marquer_accuse (attendu : security definer, search_path vide)', coalesce((select case when prosecdef then 'security definer' else 'INVOKER' end || ', ' || coalesce(array_to_string(proconfig, ' '), 'sans réglage') from pg_proc where oid = to_regprocedure('public.leads_marquer_accuse(uuid[])')), 'ABSENTE')
union all
select 'qui exécute leads_marquer_accuse (attendu : n8n_lecture, hors propriétaire)', coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee), 'personne')
  from information_schema.role_routine_grants where routine_schema = 'public' and routine_name = 'leads_marquer_accuse' and grantee <> (select pg_get_userbyid(proowner) from pg_proc where oid = to_regprocedure('public.leads_marquer_accuse(uuid[])'))
union all
select 'leads lues par n8n_lecture (attendu : accuse_n8n_le et motif_reponse parmi elles)', coalesce(string_agg(column_name, ', ' order by column_name), 'aucune (0189 absente ?)')
  from information_schema.column_privileges where table_schema = 'public' and table_name = 'leads' and grantee = 'n8n_lecture' and privilege_type = 'SELECT' and column_name in ('motif_reponse', 'accuse_n8n_le')
union all
select 'demandes dues maintenant (lecture de la vue)', count(*)::text from public.n8n_accuses_dus
union all
select 'demandes avec un motif', count(*)::text from public.leads where motif_reponse is not null;
