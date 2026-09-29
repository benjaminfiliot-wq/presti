---------------------------- _A_COLLER_sql_editor_0117.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists ops.demandes (
  id            uuid primary key default gen_random_uuid(),
  texte         text not null check (char_length(texte) between 10 and 4000),
  auteur        uuid references public.artisans(id) on delete set null,
  statut        text not null default 'recue' check (statut in ('recue', 'en_cours', 'faite', 'echec')),
  branche       text check (branche ~ '^demandes/dem-[0-9a-f]{8}$'),
  compte_rendu  text check (char_length(compte_rendu) <= 2000),
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);
create index if not exists demandes_statut_cree on ops.demandes (statut, cree_le);
alter table ops.demandes enable row level security;
revoke all on ops.demandes from public, anon, authenticated, service_role;
do $$
declare
  v_nom text;
begin
  for v_nom in
    select c.conname from pg_constraint c
     where c.conrelid = 'ops.agents'::regclass and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%tables_ecrites%'
  loop
    execute format('alter table ops.agents drop constraint %I', v_nom);
  end loop;
  alter table ops.agents add constraint agents_tables_ecrites_check
    check (tables_ecrites <@ array['taches', 'evenements', 'decisions', 'prospects', 'envois', 'opposition', 'maquettes', 'couts', 'demandes']);
end
$$;
select public.ops_agent_enregistrer('moteur_demandes', 'Moteur des demandes de Benj', array['demandes']::text[], array[]::text[],
  array['demandes']::text[], 5, 60, 0, 0);
create or replace function public.demande_creer(p_texte text, p_auteur uuid)
returns uuid
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_texte text;
  v_id uuid;
begin
  if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  v_texte := btrim(p_texte);
  if v_texte is null or char_length(v_texte) not between 10 and 4000 or translate(v_texte, E'\n\r\t', '') ~ '[[:cntrl:]]' then
    raise exception using message = 'ops:texte', errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('demande_creer'));
  if (select count(*) from ops.demandes d
       where (d.cree_le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date) >= 30 then
    raise exception using message = 'ops:quota', errcode = 'P0001';
  end if;
  insert into ops.demandes (texte, auteur) values (v_texte, p_auteur) returning id into v_id;
  return v_id;
end
$$;
revoke all on function public.demande_creer(text, uuid) from public, anon, authenticated;
grant execute on function public.demande_creer(text, uuid) to service_role;
comment on function public.demande_creer(text, uuid) is
  'La demande de Benj à l''écosystème (0117) : p_auteur fondateur (ops:auteur), texte de 10 à 4000 signes sans caractère de contrôle hors saut de ligne et tabulation (ops:texte), 30 par jour de Paris au plus (ops:quota). Rend son id ; statut recue.';
create or replace function public.demandes_lire(p_statut text default null, p_limite integer default 30)
returns table (id uuid, texte text, statut text, branche text, compte_rendu text, cree_le timestamptz, maj_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select d.id, d.texte, d.statut, d.branche, d.compte_rendu, d.cree_le, d.maj_le
    from ops.demandes d
   where (p_statut is null or d.statut = p_statut)
   order by d.cree_le desc
   limit least(greatest(coalesce(p_limite, 30), 1), 30)
$$;
revoke all on function public.demandes_lire(text, integer) from public, anon, authenticated;
grant execute on function public.demandes_lire(text, integer) to service_role;
comment on function public.demandes_lire(text, integer) is
  'Les demandes les plus récentes (30 au plus), toutes ou d''un seul statut. Lecture seule (0117).';
create or replace function public.demande_maj(p_id uuid, p_statut text, p_branche text default null, p_compte_rendu text default null)
returns text
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_actuel text;
  v_cr text;
begin
  if p_statut is null or p_statut not in ('recue', 'en_cours', 'faite', 'echec') then
    raise exception using message = 'ops:statut', errcode = 'P0001';
  end if;
  if p_branche is not null and p_branche !~ '^demandes/dem-[0-9a-f]{8}$' then
    raise exception using message = 'ops:branche', errcode = 'P0001';
  end if;
  v_cr := left(btrim(p_compte_rendu), 2000);
  if p_compte_rendu is not null and char_length(btrim(p_compte_rendu)) > 2000 then
    raise exception using message = 'ops:compte_rendu', errcode = 'P0001';
  end if;
  select d.statut into v_actuel from ops.demandes d where d.id = p_id for update;
  if v_actuel is null then
    raise exception using message = 'ops:inconnue', errcode = 'P0001';
  end if;
  if not ((v_actuel = 'recue' and p_statut in ('recue', 'en_cours', 'echec'))
       or (v_actuel = 'en_cours' and p_statut in ('en_cours', 'faite', 'echec'))) then
    raise exception using message = 'ops:statut', errcode = 'P0001';
  end if;
  update ops.demandes
     set statut = p_statut,
         branche = coalesce(p_branche, branche),
         compte_rendu = coalesce(v_cr, compte_rendu),
         maj_le = now()
   where id = p_id;
  return p_statut;
end
$$;
revoke all on function public.demande_maj(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.demande_maj(uuid, text, text, text) to service_role;
comment on function public.demande_maj(uuid, text, text, text) is
  'Le moteur met à jour une demande (0117) : recue → recue | en_cours | echec, en_cours → en_cours | faite | echec ; faite et echec sont finaux (ops:statut). Branche demandes/dem-<8 hexadécimaux> (ops:branche), compte rendu de 2000 signes au plus (ops:compte_rendu), demande inconnue (ops:inconnue). Rend le statut.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select c.relname as table_ops,
       c.relrowsecurity as row_level_security_active,
       (select count(*) from pg_policies pp where pp.schemaname = 'ops' and pp.tablename = c.relname) as politiques,
       not has_table_privilege('service_role', c.oid, 'SELECT') as service_role_sans_lecture_directe
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'ops' and c.relname = 'demandes';
select p.proname,
       not has_function_privilege('anon', p.oid, 'EXECUTE') as anon_refuse,
       not has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_refuse,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_autorise
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('demande_creer', 'demandes_lire', 'demande_maj')
order by p.proname;
select a.nom, a.capacites, a.types_crees, a.tables_ecrites from ops.agents a where a.nom = 'moteur_demandes';
