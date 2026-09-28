-- 0105_acquisition_socle.sql — TÉMOIN du juge ops-acquisition-qa (fiche 026-037). Jamais appliqué : il prouve que le juge
-- sait être vert sur une implémentation conforme au cahier OA de 026-060 ; chaque sabotage de --auto-controle le casse.

-- ── ops.prospects : seulement des colonnes ajoutées ─────────────────────────────────────────────────────────────────────
alter table ops.prospects
  add column if not exists etape text not null default 'candidat' check (etape in ('candidat', 'recense', 'sans_canal', 'rejete', 'verifie', 'maquette_prete', 'prepare', 'envoye', 'oui', 'non', 'lien_prepare', 'lien_envoye', 'oppose', 'a_decider')),
  add column if not exists bail_jusqua timestamptz,
  add column if not exists tentatives int not null default 0,
  add column if not exists derniere_erreur text check (char_length(derniere_erreur) <= 200),
  add column if not exists entreprise text,
  add column if not exists commune text,
  add column if not exists departement text,
  add column if not exists canaux jsonb not null default '[]',
  add column if not exists emails_generiques jsonb not null default '[]',
  add column if not exists cible text not null default 'artisan' check (cible in ('artisan', 'marque')),
  add column if not exists formulaire jsonb,
  add column if not exists technologie text,
  add column if not exists dernier_contact_recu timestamptz,
  add column if not exists conversation_id uuid;

create table if not exists ops.annonceurs (
  page_id             text primary key,
  page_name           text,
  metier              text,
  nb_pubs_actives     int,
  premiere_diffusion  date,
  domaine             text,
  eu_total_reach_max  bigint,
  vu_le               timestamptz not null default now()
);
alter table ops.annonceurs enable row level security;

create table if not exists ops.curseurs (
  nom     text primary key,
  valeur  text,
  maj_le  timestamptz not null default now()
);
alter table ops.curseurs enable row level security;

-- ── La table des transitions, égale à TRANSITIONS de contrat.ts ─────────────────────────────────────────────────────────
create table if not exists ops.transitions (
  depuis  text not null,
  vers    text not null,
  primary key (depuis, vers)
);
alter table ops.transitions enable row level security;
insert into ops.transitions (depuis, vers) values
  ('candidat', 'recense'), ('candidat', 'sans_canal'), ('candidat', 'rejete'), ('candidat', 'oppose'), ('candidat', 'a_decider'),
  ('recense', 'verifie'), ('recense', 'rejete'), ('recense', 'oppose'), ('recense', 'a_decider'),
  ('verifie', 'maquette_prete'), ('verifie', 'prepare'), ('verifie', 'oppose'),
  ('maquette_prete', 'prepare'), ('maquette_prete', 'lien_prepare'), ('maquette_prete', 'oppose'),
  ('prepare', 'envoye'), ('prepare', 'verifie'), ('prepare', 'maquette_prete'), ('prepare', 'oppose'),
  ('envoye', 'oui'), ('envoye', 'non'), ('envoye', 'oppose'), ('envoye', 'a_decider'),
  ('oui', 'lien_prepare'), ('oui', 'oppose'),
  ('lien_prepare', 'lien_envoye'), ('lien_prepare', 'oui'), ('lien_prepare', 'oppose'),
  ('lien_envoye', 'oppose'),
  ('non', 'oppose'),
  ('a_decider', 'candidat'), ('a_decider', 'recense'), ('a_decider', 'rejete'), ('a_decider', 'oppose')
on conflict do nothing;

-- ── Les fonctions ───────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_en_pause(p_agent text)
returns boolean
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select public.ops_interrupteur('pause_generale')
      or coalesce((select a.en_pause or a.disjoncteur_ouvert_le is not null from ops.agents a where a.nom = p_agent), false)
$$;
revoke all on function public.acq_en_pause(text) from public, anon, authenticated;
grant execute on function public.acq_en_pause(text) to service_role;

create or replace function public.acq_candidats_enregistrer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  c jsonb;
  v_source text;
  v_id uuid;
  n_cree int := 0; n_existant int := 0; n_oppose int := 0;
begin
  for c in select * from jsonb_array_elements(p) loop
    v_source := coalesce(c->>'source', 'manuel');
    if v_source not in ('meta', 'manuel', 'entrant', 'ademe_rge') then
      raise exception 'ops:source';
    end if;
    if public.acq_oppose(jsonb_build_object('siren', c->>'siren', 'domaine', c->>'domaine')) then
      n_oppose := n_oppose + 1;
      continue;
    end if;
    insert into ops.prospects (cle_dedup, siren, domaine, metier, source, cible, froid, etape)
    values (c->>'cle_dedup', c->>'siren', c->>'domaine', c->>'metier', v_source, coalesce(c->>'cible', 'artisan'),
            case when v_source = 'entrant' then false
                 when exists (select 1 from public.artisans a where left(a.siret, 9) = c->>'siren' or a.domaine = c->>'domaine') then false
                 else coalesce((c->>'froid')::boolean, true) end,
            'candidat')
    on conflict (cle_dedup) do nothing
    returning id into v_id;
    if v_id is null then n_existant := n_existant + 1; else n_cree := n_cree + 1; end if;
  end loop;
  return jsonb_build_object('cree', n_cree, 'existant', n_existant, 'oppose', n_oppose);
end
$$;
revoke all on function public.acq_candidats_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_candidats_enregistrer(jsonb) to service_role;

create or replace function public.acq_reserver(p_etape text, p_limite int, p_bail_s int)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v jsonb;
begin
  if p_etape not in ('candidat', 'recense') then raise exception 'ops:etape'; end if;
  update ops.prospects p set etape = 'a_decider', bail_jusqua = null
   where p.etape = p_etape and p.tentatives >= 2 and (p.bail_jusqua is null or p.bail_jusqua < now());
  with pris as (
    select p.id from ops.prospects p
     where p.etape = p_etape and (p.bail_jusqua is null or p.bail_jusqua < now())
     order by p.cree_le
     limit least(p_limite, 200)
     for update skip locked
  )
  update ops.prospects p set bail_jusqua = now() + make_interval(secs => p_bail_s), tentatives = p.tentatives + 1
    from pris where p.id = pris.id;
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v from ops.prospects p where p.etape = p_etape and p.bail_jusqua > now();
  return v;
end
$$;
revoke all on function public.acq_reserver(text, int, int) from public, anon, authenticated;
grant execute on function public.acq_reserver(text, int, int) to service_role;

create or replace function public.acq_prospect_mettre_a_jour(p_id uuid, p_depuis text, p_vers text, p_patch jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  if not exists (select 1 from ops.transitions t where t.depuis = p_depuis and t.vers = p_vers) then
    return false;
  end if;
  update ops.prospects p
     set etape = p_vers, bail_jusqua = null, maj_le = now(),
         faits = coalesce(p_patch->'faits', p.faits),
         canaux = coalesce(p_patch->'canaux', p.canaux),
         formulaire = coalesce(p_patch->'formulaire', p.formulaire),
         technologie = coalesce(p_patch->>'technologie', p.technologie)
   where p.id = p_id and p.etape = p_depuis;
  return found;
end
$$;
revoke all on function public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb) to service_role;

create or replace function public.acq_oppose(p_cles jsonb)
returns boolean
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select exists (
    select 1 from ops.opposition o, jsonb_each_text(p_cles) k
     where o.cle_type = k.key and o.cle_valeur = lower(btrim(k.value))
       and (o.expire_le is null or o.expire_le > now())
  )
$$;
revoke all on function public.acq_oppose(jsonb) from public, anon, authenticated;
grant execute on function public.acq_oppose(jsonb) to service_role;

create or replace function public.acq_opposer(p_cles jsonb, p_motif text, p_source text, p_expire_le timestamptz default null)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  k record;
  v text;
begin
  if p_expire_le is not null and (p_expire_le < now() + interval '1 day' or p_expire_le > now() + interval '180 days') then
    raise exception 'ops:expire_le';
  end if;
  for k in select * from jsonb_each_text(p_cles) loop
    v := regexp_replace(lower(btrim(k.value)), '^(www\.|@)', '');
    if p_expire_le is null then
      insert into ops.opposition (cle_type, cle_valeur, motif, source)
      values (k.key, v, p_motif, p_source)
      on conflict (cle_type, cle_valeur) do update set expire_le = null, motif = excluded.motif;
      update ops.prospects p set etape = 'oppose', maj_le = now()
       where (k.key = 'siren' and p.siren = v) or (k.key = 'domaine' and p.domaine = v);
    else
      insert into ops.opposition (cle_type, cle_valeur, motif, source, expire_le)
      values (k.key, v, p_motif, p_source, p_expire_le)
      on conflict (cle_type, cle_valeur) do nothing;
    end if;
  end loop;
end
$$;
revoke all on function public.acq_opposer(jsonb, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_opposer(jsonb, text, text, timestamptz) to service_role;

create or replace function public.acq_annonceurs_enregistrer(p jsonb)
returns int
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  n int;
begin
  insert into ops.annonceurs (page_id, page_name, metier, nb_pubs_actives, domaine, vu_le)
  select a->>'page_id', a->>'page_name', a->>'metier', (a->>'nb_pubs_actives')::int, a->>'domaine', now()
    from jsonb_array_elements(p) a
  on conflict (page_id) do update set page_name = excluded.page_name, nb_pubs_actives = excluded.nb_pubs_actives, vu_le = now();
  get diagnostics n = row_count;
  return n;
end
$$;
revoke all on function public.acq_annonceurs_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_annonceurs_enregistrer(jsonb) to service_role;

create or replace function public.acq_evenement(p_agent text, p_type text, p_resume text, p_objet uuid)
returns void
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  insert into ops.evenements (agent, type, objet, resume) values (p_agent, p_type, p_objet::text, left(p_resume, 200))
$$;
revoke all on function public.acq_evenement(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.acq_evenement(text, text, text, uuid) to service_role;

create or replace function public.acq_purger()
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  n int;
begin
  delete from ops.prospects p where coalesce(p.dernier_contact_recu, p.cree_le) < now() - interval '3 years';
  get diagnostics n = row_count;
  update ops.opposition set motif = null where cree_le < now() - interval '3 years';
  return jsonb_build_object('prospects_effaces', n);
end
$$;
revoke all on function public.acq_purger() from public, anon, authenticated;
grant execute on function public.acq_purger() to service_role;

create or replace function public.acq_curseur_lire(p_nom text)
returns text
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select c.valeur from ops.curseurs c where c.nom = p_nom
$$;
revoke all on function public.acq_curseur_lire(text) from public, anon, authenticated;
grant execute on function public.acq_curseur_lire(text) to service_role;

create or replace function public.acq_curseur_poser(p_nom text, p_valeur text)
returns void
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  insert into ops.curseurs (nom, valeur, maj_le) values (p_nom, p_valeur, now())
  on conflict (nom) do update set valeur = excluded.valeur, maj_le = now()
$$;
revoke all on function public.acq_curseur_poser(text, text) from public, anon, authenticated;
grant execute on function public.acq_curseur_poser(text, text) to service_role;

create or replace function public.acq_jeton_meta_poser(p_jeton text, p_expire_le timestamptz)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v_id uuid;
begin
  select s.id into v_id from vault.secrets s where s.name = 'meta_adlib_token';
  if v_id is null then
    perform vault.create_secret(p_jeton, 'meta_adlib_token', 'jeton de la bibliothèque publicitaire de Meta');
  else
    perform vault.update_secret(v_id, p_jeton);
  end if;
  update ops.agents set jeton_externe_expire_le = p_expire_le where nom = 'vigie_meta';
end
$$;
revoke all on function public.acq_jeton_meta_poser(text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_jeton_meta_poser(text, timestamptz) to service_role;

create or replace function public.acq_jeton_meta()
returns table(jeton text, expire_le timestamptz)
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select (select d.decrypted_secret from vault.decrypted_secrets d where d.name = 'meta_adlib_token'),
         (select a.jeton_externe_expire_le from ops.agents a where a.nom = 'vigie_meta')
$$;
revoke all on function public.acq_jeton_meta() from public, anon, authenticated;
grant execute on function public.acq_jeton_meta() to service_role;

-- ── Les graines des quinze agents du bus ────────────────────────────────────────────────────────────────────────────────
select public.ops_agent_enregistrer('vigie_meta', 'Vigie Meta (A7)', array[]::text[], array[]::text[], array[]::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('recenseur', 'Recenseur (A8)', array[]::text[], array[]::text[], array[]::text[], 360, 30, 0, 0);
select public.ops_agent_enregistrer('juge_faits', 'Juge des faits (J1)', array[]::text[], array[]::text[], array[]::text[], 360, 30, 0, 0);
select public.ops_agent_enregistrer('redacteur', 'Rédacteur du lot (A1)', array[]::text[], array[]::text[], array[]::text[], 720, 30, 0, 0);
select public.ops_agent_enregistrer('standardiste', 'Standardiste (A3)', array[]::text[], array[]::text[], array[]::text[], 5, 30, 0, 0);
select public.ops_agent_enregistrer('atelier_maquettes', 'Atelier des maquettes (A2)', array[]::text[], array[]::text[], array[]::text[], 60, 30, 0, 0);
select public.ops_agent_enregistrer('crieur', 'Crieur (A14)', array[]::text[], array[]::text[], array[]::text[], 1440, 30, 0, 0);
select public.ops_agent_enregistrer('chef', 'Chef d''opérations (A10)', array[]::text[], array['code', 'contenu', 'recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne'], array['taches', 'decisions', 'evenements'], 60, 30, 20, 0);
select public.ops_agent_enregistrer('pont', 'Pont de l''orchestre', array['code', 'contenu', 'recherche', 'tri', 'veille', 'verification', 'relecture', 'redaction_interne'], array[]::text[], array['taches', 'evenements'], 10080, 30, 0, 0);
select public.ops_agent_enregistrer('redacteur_site', 'Rédacteur des sites (A4, v2)', array[]::text[], array[]::text[], array[]::text[], 10080, 30, 0, 0);
select public.ops_agent_enregistrer('livreur', 'Livreur de sites (A4)', array['livraison'], array[]::text[], array[]::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('facteur', 'Facteur (envoi)', array[]::text[], array[]::text[], array[]::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('facteur_usine', 'Porteur du formulaire, sur l''usine', array[]::text[], array[]::text[], array[]::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('repondeur', 'Répondeur (assistant IA)', array[]::text[], array[]::text[], array[]::text[], 15, 30, 0, 0);
select public.ops_agent_enregistrer('experience', 'Expérience isolée', array[]::text[], array[]::text[], array[]::text[], 480, 30, 0, 0);
