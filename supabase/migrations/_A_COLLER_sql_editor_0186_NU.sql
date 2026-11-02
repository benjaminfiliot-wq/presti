---------------------------- _A_COLLER_sql_editor_0186_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
set local lock_timeout = '5s';
create or replace function public.sms_texte_conforme(t text) returns boolean
language sql immutable set search_path = '' as $fn$
  select t is not null
    and char_length(t) between 1 and 306
    and btrim(t) <> ''
    and t ~* '(^|[^a-z0-9])stop([^a-z0-9]|$)'
    and t !~* '(https?://|www[.]|\m[a-z0-9-]+[.](fr|com|net|org|io|app|me|ly|co|eu|info|biz)\M|\mbit[.]ly\M)'
    and t !~* '([0-9]\s*(eur|euros?)\M|€)'
    and t !~* '(huissier|contentieux|poursuite|mise en demeure|recouvrement|tribunal|justice|saisie|p[ée]nalit[ée]|majoration|derni[eè]re chance|sans r[ée]ponse de votre part|urgent|sous 24|avocat|plainte)'
    and t ~ '^[A-Za-z0-9 \n\r@£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&''()*+,./:;<=>?¡ÄÖÑÜ§¿äöñüà-]*$'
    and t !~* 'presti'
$fn$;
create or replace function public.sms_segments(t text) returns integer
language sql immutable set search_path = '' as $fn$
  select case when char_length(t) <= 160 then 1 else ceil(char_length(t) / 153.0)::integer end
$fn$;
create table if not exists public.sms_expediteurs (
  artisan_id  uuid primary key references public.artisans(id) on delete cascade,
  nom         text not null check (nom ~ '^[A-Za-z0-9 ]{3,11}$' and nom ~ '[A-Za-z]' and nom !~* 'presti'),
  statut      text not null default 'a_valider' check (statut in ('a_valider', 'valide', 'refuse')),
  valide_le   timestamptz,
  acteur_id   uuid,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now(),
  constraint sms_expediteurs_validation check ((statut = 'valide') = (valide_le is not null))
);
alter table public.sms_expediteurs enable row level security;
drop policy if exists sms_expediteurs_lecture on public.sms_expediteurs;
create policy sms_expediteurs_lecture on public.sms_expediteurs for select to authenticated
  using ((select auth.uid()) = artisan_id);
create or replace function public.sms_expediteurs_garde() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.nom is distinct from old.nom then
    new.statut := 'a_valider';
    new.valide_le := null;
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists sms_expediteurs_maj_le on public.sms_expediteurs;
drop trigger if exists sms_expediteurs_garde on public.sms_expediteurs;
create trigger sms_expediteurs_garde before update on public.sms_expediteurs
  for each row execute function public.sms_expediteurs_garde();
create table if not exists public.sms_oppositions (
  id                uuid primary key default gen_random_uuid(),
  artisan_id        uuid not null references public.artisans(id) on delete cascade,
  numero_empreinte  text not null check (numero_empreinte ~ '^[0-9a-f]{64}$'),
  client_id         uuid references public.clients(id) on delete set null,
  source            text not null check (source in ('stop_sms', 'client', 'artisan')),
  recue_le          timestamptz not null default now(),
  cree_le           timestamptz not null default now(),
  constraint sms_oppositions_unique unique (artisan_id, numero_empreinte)
);
alter table public.sms_oppositions enable row level security;
drop policy if exists sms_oppositions_lecture on public.sms_oppositions;
create policy sms_oppositions_lecture on public.sms_oppositions for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists sms_oppositions_client on public.sms_oppositions (client_id) where client_id is not null;
create or replace function public.sms_oppositions_figees() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  -- Seule la mise à null du client (on delete set null) passe : le numéro, le compte et la date restent.
  if new.artisan_id is distinct from old.artisan_id or new.numero_empreinte is distinct from old.numero_empreinte
     or new.source is distinct from old.source or new.recue_le is distinct from old.recue_le
     or (new.client_id is not null and new.client_id is distinct from old.client_id) then
    raise exception 'sms_oppositions : une opposition ne se modifie pas';
  end if;
  return new;
end
$fn$;
drop trigger if exists sms_oppositions_figees on public.sms_oppositions;
create trigger sms_oppositions_figees before update on public.sms_oppositions
  for each row execute function public.sms_oppositions_figees();
create table if not exists public.sms_envois (
  id                   uuid primary key default gen_random_uuid(),
  artisan_id           uuid not null references public.artisans(id) on delete cascade,
  cle                  text not null check (char_length(cle) between 3 and 120 and cle ~ '^[A-Za-z0-9_:.-]+$'),
  type                 text not null check (type in ('rappel_rdv', 'devis_pret', 'rappel_paiement')),
  client_id            uuid references public.clients(id) on delete set null,
  mode                 text not null default 'blanc' check (mode in ('blanc', 'reel')),
  etat                 text not null default 'simule' check (etat in ('simule', 'en_file', 'envoye', 'delivre', 'incertain', 'echec', 'refuse')),
  texte                text not null,
  segments             smallint not null check (segments between 1 and 2),
  fournisseur          text not null default 'factice' check (fournisseur in ('factice', 'sweego')),
  fournisseur_ref      text check (fournisseur_ref is null or (char_length(fournisseur_ref) <= 100 and fournisseur_ref ~ '^[A-Za-z0-9_:.-]+$')),
  cout_ht_milliemes    integer not null default 0 check (cout_ht_milliemes between 0 and 10000),
  tarif_source         text check (tarif_source is null or char_length(tarif_source) between 3 and 200),
  tarif_date           date,
  motif                text check (motif is null or motif ~ '^[a-z][a-z0-9_]{1,59}$'),
  cree_le              timestamptz not null default now(),
  maj_le               timestamptz not null default now(),
  envoye_le            timestamptz,
  constraint sms_envois_cle_unique unique (artisan_id, cle),
  constraint sms_envois_texte check (public.sms_texte_conforme(texte)),
  constraint sms_envois_segments check (segments = public.sms_segments(texte)),
  constraint sms_envois_blanc check ((mode = 'blanc') = (etat = 'simule')),
  constraint sms_envois_reel_tarif check (mode = 'blanc' or etat = 'refuse' or (tarif_source is not null and tarif_date is not null and fournisseur <> 'factice')),
  constraint sms_envois_refus_motif check (etat <> 'refuse' or motif is not null)
);
alter table public.sms_envois enable row level security;
drop policy if exists sms_envois_lecture on public.sms_envois;
create policy sms_envois_lecture on public.sms_envois for select to authenticated
  using ((select auth.uid()) = artisan_id);
create index if not exists sms_envois_compte_date on public.sms_envois (artisan_id, cree_le desc);
create index if not exists sms_envois_en_file on public.sms_envois (cree_le) where etat = 'en_file';
create index if not exists sms_envois_client on public.sms_envois (client_id) where client_id is not null;
create or replace function public.sms_envois_gardes() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
declare
  v_jour timestamptz;
  v_compte integer;
  v_total integer;
begin
  if tg_op = 'INSERT' then
    if new.etat not in ('simule', 'en_file', 'refuse') then
      raise exception 'sms_envois : une ligne naît simule, en_file ou refuse (reçu : %)', new.etat;
    end if;
    -- La date de création fait le compte des plafonds : elle n'est jamais fournie par l'appelant.
    new.cree_le := now();
    new.maj_le := now();
    if new.client_id is not null and not public.automatisation_objet_du_compte(new.artisan_id, 'client', new.client_id) then
      raise exception 'sms_envois : le client n''appartient pas à cet artisan';
    end if;
    if new.mode = 'reel' and new.etat = 'en_file' then
      -- L'interrupteur général, lu en base (0097:314-333) : actif = SMS arrêtés ; absent = refus (ops_interrupteur lève).
      if public.ops_interrupteur('sms_arret') then
        raise exception 'sms_envois : l''interrupteur sms_arret est actif, aucun SMS réel ne part';
      end if;
      perform pg_advisory_xact_lock(hashtext('sms_envois_plafonds'));
      v_jour := (date_trunc('day', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
      select count(*) filter (where e.artisan_id = new.artisan_id), count(*) into v_compte, v_total
        from public.sms_envois e
       where e.mode = 'reel' and e.etat <> 'refuse' and e.cree_le >= v_jour;
      if v_compte >= 10 then
        raise exception 'sms_envois : plafond de 10 SMS réels par artisan et par jour atteint';
      end if;
      if v_total >= 100 then
        raise exception 'sms_envois : plafond de 100 SMS réels par jour atteint';
      end if;
    end if;
    return new;
  end if;
  if new.artisan_id is distinct from old.artisan_id or new.cle is distinct from old.cle or new.type is distinct from old.type
     or new.mode is distinct from old.mode or new.texte is distinct from old.texte or new.cree_le is distinct from old.cree_le then
    raise exception 'sms_envois : le compte, la clé, le type, le mode et le texte ne changent pas';
  end if;
  if new.client_id is not null and new.client_id is distinct from old.client_id then
    raise exception 'sms_envois : le destinataire ne change pas';
  end if;
  if new.etat is distinct from old.etat
     and (old.etat || '>' || new.etat) <> all (array['en_file>envoye', 'en_file>incertain', 'en_file>echec', 'en_file>refuse',
                                                     'envoye>delivre', 'envoye>echec', 'incertain>delivre', 'incertain>echec']) then
    raise exception 'sms_envois : passage interdit de % à % (un envoi incertain n''est jamais renvoyé)', old.etat, new.etat;
  end if;
  if new.etat = 'envoye' and new.envoye_le is null then
    new.envoye_le := now();
  end if;
  new.maj_le := now();
  return new;
end
$fn$;
drop trigger if exists sms_envois_gardes on public.sms_envois;
create trigger sms_envois_gardes before insert or update on public.sms_envois
  for each row execute function public.sms_envois_gardes();
alter table public.clients add column if not exists tel_source text;
alter table public.clients add column if not exists tel_source_le timestamptz;
alter table public.clients drop constraint if exists clients_tel_source;
alter table public.clients add constraint clients_tel_source
  check ((tel_source is null or tel_source in ('demande', 'artisan', 'import')) and (tel_source is null) = (tel_source_le is null));
create or replace function public.clients_tel_source_garde() returns trigger
language plpgsql security invoker set search_path = '' as $fn$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.tel_source := null;
      new.tel_source_le := null;
    else
      new.tel_source := old.tel_source;
      new.tel_source_le := old.tel_source_le;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.tel is distinct from old.tel and new.tel_source is not distinct from old.tel_source then
    new.tel_source := null;
    new.tel_source_le := null;
  end if;
  return new;
end
$fn$;
drop trigger if exists clients_tel_source_garde on public.clients;
create trigger clients_tel_source_garde before insert or update on public.clients
  for each row execute function public.clients_tel_source_garde();
do $nom$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'ops.interrupteurs'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%pause_generale%'
  loop
    execute format('alter table ops.interrupteurs drop constraint %I', c.conname);
  end loop;
end
$nom$;
alter table ops.interrupteurs add constraint interrupteurs_nom check (nom in ('pause_generale', 'envoi_froid', 'sms_arret'));
insert into ops.interrupteurs (nom, actif, motif)
values ('sms_arret', true, 'semé ACTIF par 0186 : aucun SMS réel tant que le coût n''est pas approuvé par Benj')
on conflict (nom) do nothing;
do $gardes$
declare t text;
begin
  foreach t in array array['sms_envois', 'sms_oppositions', 'sms_expediteurs'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
    execute format('drop policy if exists garde_session on public.%I', t);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated using ((select public.compte_non_suspendu()))', t);
  end loop;
end
$gardes$;
comment on table public.sms_envois is 'File et journal des SMS aux clients (0186) : unique par (artisan_id, cle), à blanc par défaut, STOP obligatoire, plafonds en base. Clé de service seulement.';
comment on table public.sms_oppositions is 'Oppositions aux SMS (STOP) par artisan, sur l empreinte SHA-256 du numéro normalisé (0186).';
comment on table public.sms_expediteurs is 'Nom d expéditeur SMS de l artisan, validé ; jamais Presti (0186).';
comment on column public.clients.tel_source is 'D où vient le numéro (0186) : demande (donné par le client pour ce chantier), artisan, import ; null = inconnu, aucun SMS.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables SMS (attendu : 3)' as quoi, count(*)::text as resultat
  from information_schema.tables where table_schema = 'public' and table_name in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'tables SMS sans RLS (attendu : aucune)', coalesce(string_agg(c.relname, ', '), 'aucune')
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and not c.relrowsecurity and c.relname in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'gardes de session posées (attendu : 12)', count(*)::text
  from pg_policies where schemaname = 'public' and policyname in ('garde_session', 'garde_suspension_ins', 'garde_suspension_maj', 'garde_suspension_sup')
   and tablename in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'droits restants pour anon (attendu : aucun)', coalesce(string_agg(distinct table_name, ', '), 'aucun')
  from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'écritures ouvertes à authenticated (attendu : aucune)', coalesce(string_agg(distinct table_name, ', '), 'aucune')
  from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public'
   and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE') and table_name in ('sms_envois', 'sms_oppositions', 'sms_expediteurs')
union all
select 'colonnes tel_source des clients (attendu : 2)', count(*)::text
  from information_schema.columns where table_schema = 'public' and table_name = 'clients' and column_name in ('tel_source', 'tel_source_le')
union all
select 'interrupteur sms_arret actif (attendu : true)', coalesce((select actif::text from ops.interrupteurs where nom = 'sms_arret'), 'absent');
