---------------------------- _A_COLLER_sql_editor_0113.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists ops.station_reglages (
  cle          smallint primary key default 1 check (cle = 1),
  version      integer not null default 0 check (version >= 0),
  reglages     jsonb not null default '{}'::jsonb,
  modifie_par  uuid references public.artisans(id) on delete set null,
  modifie_le   timestamptz not null default now()
);
create table if not exists ops.station_reglages_historique (
  version   integer primary key check (version >= 1),
  reglages  jsonb not null,
  auteur    uuid,
  le        timestamptz not null default now()
);
alter table ops.station_reglages enable row level security;
alter table ops.station_reglages_historique enable row level security;
revoke all on table ops.station_reglages, ops.station_reglages_historique from public, anon, authenticated, service_role;
create or replace function public.station_reglages_lire()
returns table(version integer, reglages jsonb, modifie_par uuid, modifie_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(s.version, 0), coalesce(s.reglages, '{}'::jsonb), s.modifie_par, s.modifie_le
    from (select 1) u
    left join ops.station_reglages s on s.cle = 1
$$;
revoke all on function public.station_reglages_lire() from public, anon, authenticated;
grant execute on function public.station_reglages_lire() to service_role;
create or replace function public.station_reglages_ecrire(p_reglages jsonb, p_auteur uuid, p_version integer)
returns integer
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_courante integer;
  v_nouvelle integer;
begin
  if p_auteur is null or not exists (select 1 from public.artisans a where a.id = p_auteur and a.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('station_reglages'));
  v_courante := coalesce((select s.version from ops.station_reglages s where s.cle = 1), 0);
  if p_version is distinct from v_courante then
    raise exception using message = 'ops:version_perimee', errcode = 'P0001';
  end if;
  if p_reglages is null or jsonb_typeof(p_reglages) <> 'object' then
    raise exception using message = 'ops:forme', errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_object_keys(p_reglages) k
              where k not in ('theme', 'mise_en_page', 'nuit', 'equipage', 'salles', 'couleurs', 'affichage')) then
    raise exception using message = 'ops:cle_inconnue', errcode = 'P0001';
  end if;
  if octet_length(p_reglages::text) > 65536 then
    raise exception using message = 'ops:trop_gros', errcode = 'P0001';
  end if;
  v_nouvelle := v_courante + 1;
  insert into ops.station_reglages (cle, version, reglages, modifie_par, modifie_le)
  values (1, v_nouvelle, p_reglages, p_auteur, now())
  on conflict (cle) do update
     set version = excluded.version, reglages = excluded.reglages,
         modifie_par = excluded.modifie_par, modifie_le = excluded.modifie_le;
  insert into ops.station_reglages_historique (version, reglages, auteur, le)
  values (v_nouvelle, p_reglages, p_auteur, now());
  delete from ops.station_reglages_historique h
   where h.version in (select x.version from ops.station_reglages_historique x order by x.version desc offset 50);
  return v_nouvelle;
end
$$;
revoke all on function public.station_reglages_ecrire(jsonb, uuid, integer) from public, anon, authenticated;
grant execute on function public.station_reglages_ecrire(jsonb, uuid, integer) to service_role;
create or replace function public.pilotage_radar()
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object(
    'annonceurs_du_jour', jsonb_build_object(
      'comptes', (select count(*)::integer from ops.annonceurs a
                   where a.vu_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'),
      'par_categorie', coalesce((
        select jsonb_agg(jsonb_build_object('categorie', x.categorie, 'comptes', x.comptes) order by x.comptes desc, x.categorie)
          from (select coalesce(nullif(btrim(a.metier), ''), 'inconnue') as categorie, count(*)::integer as comptes
                  from ops.annonceurs a
                 where a.vu_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
                 group by 1) x), '[]'::jsonb)),
    'requetes_mesurees', exists (select 1 from ops.evenements e where e.agent = 'vigie_meta' and e.type = 'requete_meta'),
    'requetes_meta_par_heure', coalesce((
      select jsonb_agg(jsonb_build_object('heure', h.heure, 'requetes', coalesce(q.n, 0)) order by h.heure)
        from generate_series(date_trunc('hour', now()) - interval '12 hours', date_trunc('hour', now()), interval '1 hour') as h(heure)
        left join (select date_trunc('hour', e.le) as heure, count(*)::integer as n
                     from ops.evenements e
                    where e.agent = 'vigie_meta' and e.type = 'requete_meta' and e.le > now() - interval '12 hours'
                    group by 1) q on q.heure = h.heure
       where h.heure > now() - interval '12 hours'), '[]'::jsonb))
$$;
revoke all on function public.pilotage_radar() from public, anon, authenticated;
grant execute on function public.pilotage_radar() to service_role;
create or replace function public.pilotage_prospects_departements()
returns table(departement text, trouves integer, contactes integer, oui integer)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select case when p.departement ~ '^(\d{2}|2A|2B|\d{3})$' then p.departement else 'inconnu' end as departement,
         (count(*) filter (where p.etape <> 'oppose'))::integer as trouves,
         (count(*) filter (where p.etape in ('envoye', 'oui', 'non', 'lien_prepare', 'lien_envoye')))::integer as contactes,
         (count(*) filter (where p.etape in ('oui', 'lien_prepare', 'lien_envoye')))::integer as oui
    from ops.prospects p
   group by 1
   order by 1
$$;
revoke all on function public.pilotage_prospects_departements() from public, anon, authenticated;
grant execute on function public.pilotage_prospects_departements() to service_role;
create or replace function public.pilotage_activite_salles(p_depuis timestamptz)
returns table(salle text, minutes integer)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  with plages as (
    select case e.agent
             when 'chef' then 'commandement'
             when 'vigie_meta' then 'radar' when 'recenseur' then 'radar'
             when 'juge_faits' then 'redaction' when 'redacteur' then 'redaction' when 'garde' then 'redaction'
             when 'facteur' then 'envois' when 'facteur_usine' then 'envois'
             when 'standardiste' then 'standard' when 'repondeur' then 'standard'
             when 'atelier_maquettes' then 'atelier'
             when 'redacteur_site' then 'usine' when 'livreur' then 'usine' when 'livreur_usine' then 'usine'
             when 'tresorier' then 'tresorerie'
             when 'crieur' then 'crieur'
             when 'studio' then 'studio'
             when 'experience' then 'experience'
             when 'a0' then 'machines' when 'systeme' then 'machines' when 'usine' then 'machines'
             when 'pont' then 'chantier'
             when 'contenu' then 'audience'
             when 'pont_telegram' then 'securite'
             when 'douleurs' then 'observatoire'
             else 'machines'
           end as salle,
           count(distinct floor(extract(epoch from e.le) / 300)) as plages
      from ops.evenements e
     where e.type <> 'battement' and e.le >= p_depuis and e.le <= now()
     group by 1
  )
  select s.salle,
         least(coalesce(p.plages, 0) * 5, greatest(0, floor(extract(epoch from (now() - p_depuis)) / 60)))::integer as minutes
    from unnest(array['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie',
                      'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']) as s(salle)
    left join plages p on p.salle = s.salle
   order by s.salle
$$;
revoke all on function public.pilotage_activite_salles(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_activite_salles(timestamptz) to service_role;
comment on table ops.station_reglages is 'Les réglages de la station (026-175) : UNE ligne (cle = 1), la version courante ; écrite par station_reglages_ecrire seulement. Habit de la station (thème, noms, couleurs, place des salles), jamais les chiffres.';
comment on table ops.station_reglages_historique is 'Les 50 dernières versions des réglages de la station (026-175) : version, document, auteur, date. Purgée dans la transaction de station_reglages_ecrire.';
comment on function public.station_reglages_lire() is
  'La ligne des réglages de la station (026-175) : version, document, dernier auteur, date ; la version 0 et {} tant que rien n''est écrit. service_role seul.';
comment on function public.station_reglages_ecrire(jsonb, uuid, integer) is
  'Écrit les réglages de la station et leur historique dans la même transaction (026-175) : p_auteur fondateur (ops:auteur) ; p_version différente de la version courante : ops:version_perimee ; document qui n''est pas un objet : ops:forme ; clé de premier niveau hors de theme, mise_en_page, nuit, equipage, salles, couleurs, affichage : ops:cle_inconnue ; plus de 64 Ko : ops:trop_gros. Rend la version nouvelle ; garde les 50 dernières.';
comment on function public.pilotage_radar() is
  'Le Radar de la station, agrégé (026-175) : annonceurs repérés aujourd''hui (comptes par catégorie de métier, aucun nom) et requêtes à la bibliothèque publicitaire de Meta par heure sur 12 h, lues dans les événements requete_meta de la vigie ; requetes_mesurees vaut false tant qu''aucun n''existe (non mesuré, jamais un zéro inventé).';
comment on function public.pilotage_prospects_departements() is
  'Les prospects par département (026-175) : trouvés, contactés, ayant dit oui ; agrégé, jamais un nom, une entreprise ni une adresse. Un département absent ou mal formé compte en inconnu.';
comment on function public.pilotage_activite_salles(timestamptz) is
  'Le temps actif par salle depuis p_depuis (026-175, ACTIVE AUJ.), calculé sur les événements de ops.evenements (hors battements), par plages de cinq minutes ; l''agent de chaque événement est rangé dans la salle de son titulaire (EQUIPAGE), un nom inconnu en machines ; les vingt salles, jamais la salle réservée.';
