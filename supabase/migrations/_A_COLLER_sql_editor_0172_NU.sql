---------------------------- _A_COLLER_sql_editor_0172_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.chantiers add column if not exists type_batiment text
  check (type_batiment is null or type_batiment in (
    'maison', 'appartement', 'immeuble', 'hotel', 'restaurant', 'commerce', 'bureaux', 'entrepot',
    'ecole', 'sante', 'equipement', 'exterieur', 'agricole'
  ));
alter table public.chantiers add column if not exists lat numeric check (lat is null or lat between -90 and 90);
alter table public.chantiers add column if not exists lng numeric check (lng is null or lng between -180 and 180);
alter table public.chantiers add column if not exists geocode_le timestamptz;
alter table public.chantiers add column if not exists retire_carte_le timestamptz;
comment on column public.chantiers.type_batiment is
  'Type de bâtiment du chantier pour la maquette 3D (NULL = déduit du titre / de l''objet du devis). Écrit par le serveur seul.';
comment on column public.chantiers.lat is 'Latitude tirée de l''adresse (Base Adresse Nationale, appel serveur). NULL = inconnue.';
comment on column public.chantiers.lng is 'Longitude tirée de l''adresse (Base Adresse Nationale, appel serveur). NULL = inconnue.';
comment on column public.chantiers.geocode_le is 'Date de la dernière recherche de position (même infructueuse) ; NULL = à chercher.';
comment on column public.chantiers.retire_carte_le is 'Chantier validé : retiré de la carte du CRM, gardé dans les données. NULL = sur la carte.';
create table if not exists public.crm_reglages (
  artisan_id       uuid primary key references public.artisans(id) on delete cascade,
  validation_auto  boolean not null default false,
  maj_le           timestamptz not null default now()
);
alter table public.crm_reglages enable row level security;
revoke all on public.crm_reglages from anon;
revoke all on public.crm_reglages from authenticated;
comment on table public.crm_reglages is
  'Réglages du CRM par compte. validation_auto : un chantier dont toutes les tâches sont cochées est validé tout seul. RLS sans politique : service_role seul.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'colonnes chantiers (attendu 5)' as quoi, count(*)::text as resultat from information_schema.columns where table_schema = 'public' and table_name = 'chantiers' and column_name in ('type_batiment', 'lat', 'lng', 'geocode_le', 'retire_carte_le')
union all select 'crm_reglages RLS (attendu true)', relrowsecurity::text from pg_class where oid = 'public.crm_reglages'::regclass
union all select 'crm_reglages politiques (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'crm_reglages'
union all select 'authenticated lit crm_reglages (attendu false)', has_table_privilege('authenticated', 'public.crm_reglages', 'select')::text
union all select 'authenticated ecrit chantiers (attendu false)', has_table_privilege('authenticated', 'public.chantiers', 'update')::text;
