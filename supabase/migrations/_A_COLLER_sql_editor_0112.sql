---------------------------- _A_COLLER_sql_editor_0112.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists ops.reunions (
  id         uuid primary key default gen_random_uuid(),
  jour       date not null,
  ouverte_le timestamptz not null default now(),
  close_le   timestamptz,
  statut     text not null default 'ouverte' check (statut in ('ouverte', 'close', 'abandonnee')),
  motif      text check (char_length(motif) <= 200),
  chiffres   jsonb check (pg_column_size(chiffres) <= 8192),
  lignes     text[],
  objectif   jsonb,
  idees      text[] not null default '{}',
  par        text not null default 'chef' references ops.agents(nom) on delete cascade,
  check ((statut = 'ouverte') = (close_le is null)),
  check (statut <> 'close' or lignes is not null)
);
create unique index if not exists reunions_une_par_jour on ops.reunions (jour) where statut in ('ouverte', 'close');
create table if not exists ops.experiences (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null check (char_length(nom) between 3 and 80),
  budget_eur    numeric(8,2) not null default 0 check (budget_eur = 0),
  debut_le      timestamptz not null default now(),
  fin_prevue_le timestamptz not null,
  gains_eur     numeric(10,2) not null default 0 check (gains_eur >= 0),
  depense_eur   numeric(10,2) not null default 0 check (depense_eur >= 0),
  statut        text not null default 'en_cours' check (statut in ('en_cours', 'arretee', 'arretee_auto', 'gagnante')),
  motif         text check (char_length(motif) <= 200),
  lancee_par    uuid references public.artisans(id) on delete set null,
  arretee_le    timestamptz,
  check (fin_prevue_le = debut_le + interval '30 days')
);
create unique index if not exists experiences_une_en_cours on ops.experiences ((true)) where statut = 'en_cours';
alter table ops.reunions enable row level security;
alter table ops.experiences enable row level security;
revoke all on ops.reunions, ops.experiences from public, anon, authenticated, service_role;
create or replace function public.station_reunion_chiffres()
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_minuit timestamptz := ((now() at time zone 'Europe/Paris')::date)::timestamp at time zone 'Europe/Paris';
begin
  return jsonb_build_object(
    'agents_total', (select count(*) from ops.agents a where a.retire_le is null),
    'agents', coalesce((
      select jsonb_agg(x.o order by x.nom)
        from (select a.nom,
                     jsonb_build_object(
                       'nom', a.nom,
                       'en_pause', a.en_pause,
                       'disjoncteur', a.disjoncteur_ouvert_le is not null,
                       'battement_le', date_trunc('second', a.battement_le),
                       'periode_minutes', a.periode_minutes,
                       'taches_jour', jsonb_build_object(
                         'faites', (select count(*) from ops.taches t where t.agent = a.nom and t.statut = 'faite' and t.maj_le >= v_minuit),
                         'echec', (select count(*) from ops.taches t where t.agent = a.nom and t.statut = 'echec' and t.maj_le >= v_minuit),
                         'file', (select count(*) from ops.taches t where t.cree_par = a.nom and t.statut = 'file'),
                         'a_decider', (select count(*) from ops.taches t where t.cree_par = a.nom and t.statut = 'a_decider')),
                       'evenements_jour', (select count(*) from ops.evenements e where e.agent = a.nom and e.le >= v_minuit),
                       'cout_jour_eur', (select coalesce(sum(c.montant_eur), 0) from ops.couts c where c.agent = a.nom and c.le >= v_minuit)) as o
                from ops.agents a
               where a.retire_le is null
               order by a.nom
               limit 30) x), '[]'::jsonb),
    'bus', jsonb_build_object(
      'decisions_ouvertes', (select jsonb_build_object(
                               'argent', count(*) filter (where d.portee = 'argent'),
                               'artisan', count(*) filter (where d.portee = 'artisan'),
                               'securite', count(*) filter (where d.portee = 'securite'),
                               'aucune', count(*) filter (where d.portee = 'aucune'))
                               from ops.decisions d where d.statut = 'ouverte'),
      'taches_bloquees', (select count(*) from ops.taches t
                           where t.statut = 'a_decider' or (t.statut = 'bail' and t.bail_jusqua < now()))),
    'acquisition', coalesce((select jsonb_object_agg(p.etape, p.nombre) from public.pilotage_tapis(v_minuit) p), '{}'::jsonb),
    'argent', jsonb_build_object(
      'commandes_payees_jour', (select count(*) from public.sites_commandes c where c.paye_le >= v_minuit and c.etat <> 'brouillon')));
end
$$;
revoke all on function public.station_reunion_chiffres() from public, anon, authenticated;
grant execute on function public.station_reunion_chiffres() to service_role;
comment on function public.station_reunion_chiffres() is
  'Chiffres de la réunion d''équipage, calculés sans modèle (026-088) : par agent non retiré (30 au plus) l''état, les tâches et les événements du jour de Paris et le coût du jour ; le bus ; le tapis d''acquisition depuis minuit (pilotage_tapis) ; les commandes payées du jour. Que des nombres, des dates et des noms d''agents, 8 Ko au plus.';
create or replace function public.station_reunion_lire(p_limite integer)
returns table(id uuid, jour date, ouverte_le timestamptz, close_le timestamptz, statut text, motif text, lignes text[], objectif jsonb, idees text[])
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select r.id, r.jour, r.ouverte_le, r.close_le, r.statut, r.motif, r.lignes, r.objectif, r.idees
    from ops.reunions r
   order by r.ouverte_le desc
   limit least(greatest(1, coalesce(p_limite, 1)), 10)
$$;
revoke all on function public.station_reunion_lire(integer) from public, anon, authenticated;
grant execute on function public.station_reunion_lire(integer) to service_role;
comment on function public.station_reunion_lire(integer) is
  'Les réunions les plus récentes d''abord, limite bornée à 1-10 (026-088).';
create or replace function public.station_objectif_actif()
returns table(libelle text, mesure text, cible integer, fixe_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select r.objectif->>'libelle', r.objectif->>'mesure', (r.objectif->>'cible')::integer, r.close_le
    from ops.reunions r
   where r.statut = 'close' and jsonb_typeof(r.objectif) = 'object'
   order by r.close_le desc
   limit 1
$$;
revoke all on function public.station_objectif_actif() from public, anon, authenticated;
grant execute on function public.station_objectif_actif() to service_role;
comment on function public.station_objectif_actif() is
  'L''objectif de la dernière réunion close qui en porte un : 0 ou 1 ligne (026-088).';
create or replace function public.station_experience_etat()
returns table(aucune_vente boolean, id uuid, nom text, budget_eur numeric, debut_le timestamptz, fin_prevue_le timestamptz, jour integer, gains_eur numeric, depense_eur numeric, statut text)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select not exists (select 1 from (select c.etat as statut from public.sites_commandes c) v where v.statut <> 'brouillon'),
         e.id, e.nom, e.budget_eur, e.debut_le, e.fin_prevue_le,
         case when e.id is null then null::integer
              else least(floor(extract(epoch from now() - e.debut_le) / 86400)::integer + 1, 30) end,
         e.gains_eur, e.depense_eur, e.statut
    from (select 1) u
    left join lateral (select x.* from ops.experiences x order by x.debut_le desc limit 1) e on true
$$;
revoke all on function public.station_experience_etat() from public, anon, authenticated;
grant execute on function public.station_experience_etat() to service_role;
comment on function public.station_experience_etat() is
  'Une ligne, toujours : aucune_vente (aucune commande de site au-delà du brouillon, R13) et la dernière expérience ; jour = jours écoulés + 1, borné à 30 (026-088).';
create or replace function public.station_consigne_transmettre(p_texte text, p_auteur uuid, p_agent text default null)
returns bigint
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_texte text;
  v_id bigint;
begin
  if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  v_texte := btrim(p_texte);
  if v_texte is null or char_length(v_texte) not between 3 and 200 or v_texte ~ '[[:cntrl:]]' then
    raise exception using message = 'ops:texte', errcode = 'P0001';
  end if;
  if p_agent is not null and not exists (select 1 from ops.agents a where a.nom = p_agent) then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('station_consigne'));
  if (select count(*) from ops.evenements e
       where e.type = 'consigne'
         and (e.le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date) >= 20 then
    raise exception using message = 'ops:quota', errcode = 'P0001';
  end if;
  insert into ops.evenements (agent, type, objet, resume)
  values ('systeme', 'consigne', case when p_agent is null then 'fondateur' else 'agent:' || p_agent end, v_texte)
  returning id into v_id;
  return v_id;
end
$$;
revoke all on function public.station_consigne_transmettre(text, uuid, text) from public, anon, authenticated;
grant execute on function public.station_consigne_transmettre(text, uuid, text) to service_role;
comment on function public.station_consigne_transmettre(text, uuid, text) is
  'La consigne de Benj (026-088) : p_auteur fondateur (ops:auteur), texte de 3 à 200 signes sans caractère de contrôle (ops:texte), p_agent nul (tout l''équipage, objet fondateur) ou un agent du bus (objet agent:<nom>, sinon ops:agent_inconnu), 20 par jour de Paris au plus (ops:quota). Événement consigne de l''agent systeme ; rend son id.';
create or replace function public.station_consigne_par_agent(p_agent text, p_texte text, p_agent_cible text default 'chef')
returns bigint
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_texte text;
  v_id bigint;
begin
  if not exists (select 1 from ops.agents a where a.nom = p_agent and a.retire_le is null and 'consigne' = any (a.capacites)) then
    raise exception using message = 'ops:agent', errcode = 'P0001';
  end if;
  v_texte := btrim(p_texte);
  if v_texte is null or char_length(v_texte) not between 3 and 200 or v_texte ~ '[[:cntrl:]]' then
    raise exception using message = 'ops:texte', errcode = 'P0001';
  end if;
  if p_agent_cible is null or not exists (select 1 from ops.agents a where a.nom = p_agent_cible) then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('station_consigne'));
  if (select count(*) from ops.evenements e
       where e.type = 'consigne'
         and (e.le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date) >= 20 then
    raise exception using message = 'ops:quota', errcode = 'P0001';
  end if;
  insert into ops.evenements (agent, type, objet, resume)
  values (p_agent, 'consigne', 'agent:' || p_agent_cible, v_texte)
  returning id into v_id;
  return v_id;
end
$$;
revoke all on function public.station_consigne_par_agent(text, text, text) from public, anon, authenticated;
grant execute on function public.station_consigne_par_agent(text, text, text) to service_role;
comment on function public.station_consigne_par_agent(text, text, text) is
  'La consigne du pont Telegram au Chef (026-088, revue du 25/09) : l''agent porte la capacité consigne (ops:agent), texte de 3 à 200 signes (ops:texte), cible présente dans ops.agents (ops:agent_inconnu), le MÊME quota de 20 par jour de Paris que la consigne de Benj (ops:quota). Événement consigne dont la colonne agent est l''auteur (p_agent) et l''objet agent:<cible> ; rend son id.';
create or replace function public.station_pause_par_agent(p_agent text, p_motif text)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_motif text;
begin
  if not exists (select 1 from ops.agents a where a.nom = p_agent and a.retire_le is null and 'pause' = any (a.capacites)) then
    raise exception using message = 'ops:agent', errcode = 'P0001';
  end if;
  v_motif := btrim(p_motif);
  if v_motif is null or char_length(v_motif) not between 3 and 200 or v_motif ~ '[[:cntrl:]]' then
    raise exception using message = 'ops:motif', errcode = 'P0001';
  end if;
  if exists (select 1 from ops.interrupteurs i where i.nom = 'pause_generale' and i.actif) then
    return false;
  end if;
  update ops.interrupteurs
     set actif = true, motif = left('agent ' || p_agent || ' : ' || v_motif, 200), change_le = now()
   where nom = 'pause_generale';
  insert into ops.evenements (agent, type, objet, resume)
  values (p_agent, 'interrupteur', 'interrupteur:pause_generale', left('pause_generale posée : ' || v_motif, 200));
  return true;
end
$$;
revoke all on function public.station_pause_par_agent(text, text) from public, anon, authenticated;
grant execute on function public.station_pause_par_agent(text, text) to service_role;
comment on function public.station_pause_par_agent(text, text) is
  'Pose la pause générale pour un agent qui porte la capacité pause, le pont Telegram (026-088, revue du 25/09) : ops:agent sinon, motif de 3 à 200 signes (ops:motif), false sans rien écrire si la pause est déjà active. Ne peut JAMAIS la lever : aucun chemin ne met actif à false ; ne touche que la ligne pause_generale. Événement interrupteur de l''agent.';
create or replace function public.station_reunion_ouvrir(p_agent text)
returns uuid
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id uuid;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_pause boolean;
begin
  if p_agent is distinct from 'chef' then
    raise exception using message = 'ops:agent', errcode = 'P0001';
  end if;
  select a.en_pause into v_pause from ops.agents a where a.nom = 'chef' and a.retire_le is null;
  if not found then
    raise exception using message = 'ops:agent', errcode = 'P0001';
  end if;
  if v_pause or exists (select 1 from ops.interrupteurs i where i.nom = 'pause_generale' and i.actif) then
    raise exception using message = 'ops:pause', errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('station_reunion'));
  with echues as (
    update ops.reunions r
       set statut = 'abandonnee', close_le = now(), motif = 'delai'
     where r.statut = 'ouverte' and r.ouverte_le < now() - interval '30 minutes'
    returning r.id)
  insert into ops.evenements (agent, type, objet, resume)
  select 'systeme', 'reunion_abandonnee', e.id::text, 'Réunion abandonnée : plus de 30 minutes ouverte' from echues e;
  if exists (select 1 from ops.reunions r where r.statut = 'ouverte') then
    raise exception using message = 'ops:deja_ouverte', errcode = 'P0001';
  end if;
  if exists (select 1 from ops.reunions r where r.statut = 'close' and r.jour = v_jour) then
    raise exception using message = 'ops:deja_tenue', errcode = 'P0001';
  end if;
  insert into ops.reunions (jour, chiffres, par)
  values (v_jour, public.station_reunion_chiffres(), 'chef')
  returning id into v_id;
  insert into ops.evenements (agent, type, objet, resume)
  values ('chef', 'reunion_ouverte', v_id::text, 'Réunion d''équipage ouverte');
  return v_id;
end
$$;
revoke all on function public.station_reunion_ouvrir(text) from public, anon, authenticated;
grant execute on function public.station_reunion_ouvrir(text) to service_role;
comment on function public.station_reunion_ouvrir(text) is
  'Ouvre la réunion du jour (026-088) : p_agent = chef (ops:agent), Chef ni en pause ni pause générale (ops:pause), abandonne d''abord toute réunion ouverte depuis plus de 30 minutes, ops:deja_ouverte, ops:deja_tenue ; chiffres calculés sans modèle. Événement reunion_ouverte ; rend l''id.';
create or replace function public.station_reunion_clore(p_id uuid, p_agent text, p_lignes text[], p_objectif jsonb, p_idees text[])
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_lignes text[];
  v_idees text[];
  v_obj jsonb;
  v_libelle text;
  v_mesure text;
  v_cible integer;
begin
  if p_agent is distinct from 'chef' then
    raise exception using message = 'ops:agent', errcode = 'P0001';
  end if;
  perform 1 from ops.reunions r where r.id = p_id and r.statut = 'ouverte' for update;
  if not found then
    raise exception using message = 'ops:reunion', errcode = 'P0001';
  end if;
  if p_lignes is null or cardinality(p_lignes) not between 1 and 5 then
    raise exception using message = 'ops:lignes', errcode = 'P0001';
  end if;
  select array_agg(btrim(t.l) order by t.n) into v_lignes from unnest(p_lignes) with ordinality as t(l, n);
  if exists (select 1 from unnest(v_lignes) as x(l)
              where x.l is null or char_length(x.l) not between 1 and 140 or x.l ~ '[[:cntrl:]]'
                 or position('@' in x.l) > 0 or x.l ~ '[0-9]{9}' or x.l ~* 'http') then
    raise exception using message = 'ops:lignes', errcode = 'P0001';
  end if;
  if p_objectif is not null and jsonb_typeof(p_objectif) <> 'null' then
    if jsonb_typeof(p_objectif) <> 'object'
       or exists (select 1 from jsonb_object_keys(p_objectif) k where k not in ('libelle', 'mesure', 'cible')) then
      raise exception using message = 'ops:objectif', errcode = 'P0001';
    end if;
    if jsonb_typeof(p_objectif->'libelle') is distinct from 'string' then
      raise exception using message = 'ops:objectif', errcode = 'P0001';
    end if;
    v_libelle := btrim(p_objectif->>'libelle');
    if char_length(v_libelle) not between 5 and 80 or v_libelle ~ '[[:cntrl:]]'
       or position('@' in v_libelle) > 0 or v_libelle ~ '[0-9]{9}' or v_libelle ~* 'http' then
      raise exception using message = 'ops:objectif', errcode = 'P0001';
    end if;
    if p_objectif ? 'mesure' and jsonb_typeof(p_objectif->'mesure') <> 'null' then
      v_mesure := p_objectif->>'mesure';
      if jsonb_typeof(p_objectif->'mesure') <> 'string' or v_mesure <> all (array['encaisse_eur', 'oui', 'contacts_froids', 'sites_en_ligne']) then
        raise exception using message = 'ops:objectif', errcode = 'P0001';
      end if;
    end if;
    if p_objectif ? 'cible' and jsonb_typeof(p_objectif->'cible') <> 'null' then
      if jsonb_typeof(p_objectif->'cible') <> 'number' or (p_objectif->>'cible') !~ '^[0-9]{1,9}$' then
        raise exception using message = 'ops:objectif', errcode = 'P0001';
      end if;
      v_cible := (p_objectif->>'cible')::integer;
    end if;
    v_obj := jsonb_build_object('libelle', v_libelle, 'mesure', v_mesure, 'cible', v_cible);
  end if;
  v_idees := coalesce(p_idees, '{}');
  if p_idees is not null and cardinality(p_idees) > 3 then
    raise exception using message = 'ops:idees', errcode = 'P0001';
  end if;
  if (select count(distinct i.k) from unnest(v_idees) as i(k)) <> cardinality(v_idees)
     or exists (select 1 from unnest(v_idees) as i(k)
                 where i.k is null
                    or i.k !~ '^chef:\d{4}-\d{2}-\d{2}:idee-[a-z0-9-]{3,75}$'
                    or not exists (select 1 from ops.decisions d where d.cle_idempotence = i.k and d.creee_par = 'chef')) then
    raise exception using message = 'ops:idees', errcode = 'P0001';
  end if;
  update ops.reunions r
     set statut = 'close', close_le = now(), lignes = v_lignes, objectif = v_obj, idees = v_idees
   where r.id = p_id;
  insert into ops.evenements (agent, type, objet, resume)
  select 'chef', 'reunion_compte_rendu', p_id::text, x.l from unnest(v_lignes) with ordinality as x(l, n) order by x.n;
  insert into ops.evenements (agent, type, objet, resume)
  values ('chef', 'reunion_close', p_id::text, 'Réunion close : ' || cardinality(v_idees) || ' idée(s)');
  return true;
end
$$;
revoke all on function public.station_reunion_clore(uuid, text, text[], jsonb, text[]) from public, anon, authenticated;
grant execute on function public.station_reunion_clore(uuid, text, text[], jsonb, text[]) to service_role;
comment on function public.station_reunion_clore(uuid, text, text[], jsonb, text[]) is
  'Clôt la réunion ouverte (026-088) : p_agent = chef (ops:agent), réunion ouverte (ops:reunion), 1 à 5 lignes de 1 à 140 signes sans @, sans 9 chiffres de suite, sans http (ops:lignes), objectif nul ou {libelle 5 à 80, mesure encaisse_eur|oui|contacts_froids|sites_en_ligne, cible entier >= 0} (ops:objectif), 3 idées au plus au format chef:<date>:idee-… créées par chef (ops:idees). Un événement reunion_compte_rendu par ligne puis reunion_close.';
create or replace function public.station_reunion_abandonner(p_id uuid, p_agent text, p_motif text)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_motif text;
  v_n integer;
begin
  if p_agent is distinct from 'chef' then
    raise exception using message = 'ops:agent', errcode = 'P0001';
  end if;
  v_motif := btrim(p_motif);
  if v_motif is null or char_length(v_motif) not between 3 and 200 or v_motif ~ '[[:cntrl:]]' then
    raise exception using message = 'ops:motif', errcode = 'P0001';
  end if;
  update ops.reunions r
     set statut = 'abandonnee', close_le = now(), motif = v_motif
   where r.id = p_id and r.statut = 'ouverte';
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return false;
  end if;
  insert into ops.evenements (agent, type, objet, resume)
  values ('chef', 'reunion_abandonnee', p_id::text, left('Réunion abandonnée : ' || v_motif, 200));
  return true;
end
$$;
revoke all on function public.station_reunion_abandonner(uuid, text, text) from public, anon, authenticated;
grant execute on function public.station_reunion_abandonner(uuid, text, text) to service_role;
comment on function public.station_reunion_abandonner(uuid, text, text) is
  'Le Chef abandonne la réunion ouverte (026-088) : ops:agent si p_agent n''est pas chef, motif de 3 à 200 signes (ops:motif), false si la réunion n''est pas ouverte. Événement reunion_abandonnee.';
create or replace function public.station_reunions_echues_abandonner()
returns integer
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n integer;
begin
  with echues as (
    update ops.reunions r
       set statut = 'abandonnee', close_le = now(), motif = 'delai'
     where r.statut = 'ouverte' and r.ouverte_le < now() - interval '30 minutes'
    returning r.id)
  insert into ops.evenements (agent, type, objet, resume)
  select 'systeme', 'reunion_abandonnee', e.id::text, 'Réunion abandonnée : plus de 30 minutes ouverte' from echues e;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;
revoke all on function public.station_reunions_echues_abandonner() from public, anon, authenticated;
grant execute on function public.station_reunions_echues_abandonner() to service_role;
comment on function public.station_reunions_echues_abandonner() is
  'Abandonne chaque réunion ouverte depuis plus de 30 minutes (motif delai), avec son événement reunion_abandonnee de l''agent systeme ; rend leur nombre. Appelée toutes les 5 minutes par pg_cron (026-088).';
create or replace function public.station_experience_lancer(p_nom text, p_budget_eur numeric, p_auteur uuid)
returns uuid
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id uuid;
  v_nom text;
  v_debut timestamptz := now();
begin
  if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  v_nom := btrim(p_nom);
  if v_nom is null or char_length(v_nom) not between 3 and 80 or v_nom ~ '[[:cntrl:]]' then
    raise exception using message = 'ops:nom', errcode = 'P0001';
  end if;
  if not exists (select 1 from (select c.etat as statut from public.sites_commandes c) v where v.statut <> 'brouillon') then
    raise exception using message = 'ops:aucune_vente', errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('station_experience'));
  if exists (select 1 from ops.experiences x where x.statut = 'en_cours') then
    raise exception using message = 'ops:deja_en_cours', errcode = 'P0001';
  end if;
  if p_budget_eur is distinct from 0 then
    raise exception using message = 'ops:budget', errcode = 'P0001';
  end if;
  insert into ops.experiences (nom, budget_eur, debut_le, fin_prevue_le, lancee_par)
  values (v_nom, 0, v_debut, v_debut + interval '30 days', p_auteur)
  returning id into v_id;
  insert into ops.evenements (agent, type, objet, resume)
  values ('systeme', 'experience_lancee', v_id::text, left('Expérience isolée lancée : ' || v_nom, 200));
  return v_id;
end
$$;
revoke all on function public.station_experience_lancer(text, numeric, uuid) from public, anon, authenticated;
grant execute on function public.station_experience_lancer(text, numeric, uuid) to service_role;
comment on function public.station_experience_lancer(text, numeric, uuid) is
  'Lance l''expérience isolée (026-088) : p_auteur fondateur (ops:auteur), nom de 3 à 80 signes (ops:nom), ops:aucune_vente tant qu''aucune commande de site n''a dépassé le brouillon (R13), ops:deja_en_cours, ops:budget si le budget n''est pas nul (aucun achat). Dure 30 jours. Événement experience_lancee ; rend l''id.';
create or replace function public.station_experience_arreter(p_id uuid, p_auteur uuid, p_motif text)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_motif text;
  v_n integer;
begin
  if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  v_motif := btrim(p_motif);
  if v_motif is null or char_length(v_motif) not between 3 and 200 or v_motif ~ '[[:cntrl:]]' then
    raise exception using message = 'ops:motif', errcode = 'P0001';
  end if;
  update ops.experiences x
     set statut = 'arretee', motif = v_motif, arretee_le = now()
   where x.id = p_id and x.statut = 'en_cours';
  get diagnostics v_n = row_count;
  if v_n = 0 then
    return false;
  end if;
  insert into ops.evenements (agent, type, objet, resume)
  values ('systeme', 'experience_arretee', p_id::text, left('Expérience arrêtée : ' || v_motif, 200));
  return true;
end
$$;
revoke all on function public.station_experience_arreter(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.station_experience_arreter(uuid, uuid, text) to service_role;
comment on function public.station_experience_arreter(uuid, uuid, text) is
  'Benj arrête l''expérience en cours (026-088) : p_auteur fondateur (ops:auteur), motif de 3 à 200 signes (ops:motif), false si elle n''est pas en cours. Statut arretee, événement experience_arretee.';
create or replace function public.station_experiences_echues_arreter()
returns integer
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n integer;
begin
  with echues as (
    update ops.experiences x
       set statut = case when x.gains_eur = 0 then 'arretee_auto' else 'gagnante' end,
           arretee_le = now(),
           motif = case when x.gains_eur = 0 then 'J30 sans gain' else 'J30 avec gain' end
     where x.statut = 'en_cours' and x.fin_prevue_le <= now()
    returning x.id, x.statut)
  insert into ops.evenements (agent, type, objet, resume)
  select 'systeme', 'experience_arretee', e.id::text,
         case when e.statut = 'arretee_auto' then 'Expérience arrêtée seule à J30 : aucun gain' else 'Expérience arrivée à J30 : gagnante' end
    from echues e;
  get diagnostics v_n = row_count;
  return v_n;
end
$$;
revoke all on function public.station_experiences_echues_arreter() from public, anon, authenticated;
grant execute on function public.station_experiences_echues_arreter() to service_role;
comment on function public.station_experiences_echues_arreter() is
  'Chaque expérience en cours dont la fin prévue est passée : arretee_auto si elle n''a rien rapporté, gagnante sinon, avec son événement experience_arretee de l''agent systeme ; rend leur nombre. Appelée chaque jour par pg_cron (026-088).';
insert into ops.agents (nom, libelle, capacites, types_crees, tables_ecrites, periode_minutes, debit_minute, quota_creations_jour, plafond_euros_jour)
values ('pont_telegram', 'Pont Telegram', '{notifier,pause,consigne}', '{}', '{evenements}', 5, 10, 0, 0)
on conflict (nom) do update
   set libelle = excluded.libelle,
       capacites = excluded.capacites,
       types_crees = excluded.types_crees,
       tables_ecrites = excluded.tables_ecrites,
       plafond_euros_jour = excluded.plafond_euros_jour;
do $$ begin if exists (select 1 from cron.job where jobname = 'station-reunions-echues') then perform cron.unschedule('station-reunions-echues'); end if; end $$;
select cron.schedule('station-reunions-echues', '*/5 * * * *', 'select public.station_reunions_echues_abandonner()');
do $$ begin if exists (select 1 from cron.job where jobname = 'station-experiences-echues') then perform cron.unschedule('station-experiences-echues'); end if; end $$;
select cron.schedule('station-experiences-echues', '17 3 * * *', 'select public.station_experiences_echues_arreter()');
comment on table ops.reunions is 'Réunions d''équipage (026-088) : une tenue par jour de Paris, ouverte et close par le seul Chef, abandonnée après 30 minutes ; chiffres sans modèle, 1 à 5 lignes de compte rendu, un objectif, 3 idées au plus. Fermée à tous les rôles.';
comment on table ops.experiences is 'Expériences isolées (026-088) : budget nul, 30 jours, une seule à la fois, refusées tant qu''aucune vente n''existe (R13), arrêtées seules à J30. Fermée à tous les rôles.';