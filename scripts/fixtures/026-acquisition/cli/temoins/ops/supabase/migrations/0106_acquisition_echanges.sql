-- 0106_acquisition_echanges.sql — TÉMOIN du juge ops-acquisition-qa (fiche 026-037). Jamais appliqué : il prouve que le
-- juge sait être vert sur une implémentation conforme au cahier OB de 026-061 ; chaque sabotage de --auto-controle le casse.

-- ── Tables ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
alter table ops.envois
  add column if not exists objet text check (char_length(objet) <= 120),
  add column if not exists texte text check (char_length(texte) <= 1500),
  add column if not exists variante text,
  add column if not exists modele_id text,
  add column if not exists fait_id text,
  add column if not exists douleur_id text,
  add column if not exists fil_envoi_id uuid references ops.envois(id),
  add column if not exists conversation_id uuid,
  add column if not exists tentatives_envoi int not null default 0 check (tentatives_envoi between 0 and 3),
  add column if not exists derniere_erreur text check (char_length(derniere_erreur) <= 200),
  add column if not exists commentaire_id text,
  add column if not exists preuve jsonb,
  add column if not exists preuve_demande jsonb,
  add column if not exists reference text unique check (reference ~ '^[A-Z0-9]{6}$'),
  add column if not exists technologie text,
  add column if not exists bail_porteur_jusqua timestamptz;

alter table ops.maquettes
  add column if not exists empreintes jsonb,
  add column if not exists prete_le timestamptz,
  add column if not exists objets jsonb;

alter table ops.prospects
  add column if not exists effacement_demande_le timestamptz;

create table if not exists ops.conversations (
  id                       uuid primary key default gen_random_uuid(),
  plateforme               text not null check (plateforme in ('instagram', 'facebook')),
  meta_id                  text not null check (char_length(meta_id) <= 200),
  pseudo                   text check (char_length(pseudo) <= 60),
  suit_le_compte           boolean,
  abonnes                  int,
  commentaire_id           text,
  commentaire_le           timestamptz,
  dernier_message_recu_le  timestamptz,
  prospect_id              uuid references ops.prospects(id) on delete set null,
  cree_le                  timestamptz not null default now(),
  unique (plateforme, meta_id)
);
alter table ops.conversations enable row level security;

create table if not exists ops.meta_evenements (
  id          bigint generated always as identity primary key,
  id_externe  text not null unique check (char_length(id_externe) <= 200),
  plateforme  text,
  type        text not null check (type in ('commentaire', 'message', 'postback', 'autre')),
  charge      jsonb not null check (pg_column_size(charge) <= 8192),
  recu_le     timestamptz not null default now(),
  traite_le   timestamptz
);
alter table ops.meta_evenements enable row level security;

create table if not exists ops.reponses (
  id                      uuid primary key default gen_random_uuid(),
  id_externe              text not null unique,
  envoi_id                uuid references ops.envois(id) on delete set null,
  conversation_id         uuid references ops.conversations(id) on delete set null,
  prospect_id             uuid references ops.prospects(id) on delete cascade,
  canal                   text,
  source                  text not null check (source in ('courriel', 'meta', 'formulaire', 'essai')),
  texte                   text check (char_length(texte) <= 4000),
  auto                    boolean not null default false,
  accuse_site             boolean not null default false,
  en_reponse_a            text,
  imap_uid                bigint,
  recu_le                 timestamptz not null default now(),
  classe                  text,
  classe_par              text,
  certitude               numeric,
  faq_id                  text,
  rappel_le               date,
  traitee_le              timestamptz,
  actes_le                timestamptz,
  repondue_le             timestamptz,
  appel_rendu_le          timestamptz,
  reclassee_par_decision  uuid,
  constraint reponses_attache check (envoi_id is not null or conversation_id is not null or source = 'courriel')
);
alter table ops.reponses enable row level security;

create table if not exists ops.rendez_vous (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid not null references ops.prospects(id) on delete cascade,
  jeton_hache     text unique check (jeton_hache ~ '^[0-9a-f]{64}$'),
  cree_le         timestamptz not null default now(),
  expire_le       timestamptz not null,
  creneau         timestamptz,
  telephone       text check (telephone is null or telephone ~ '^\+?[0-9]{10,15}$'),
  statut          text not null default 'propose' check (statut in ('propose', 'reserve', 'annule', 'fait')),
  reserve_le      timestamptz,
  appel_rendu_le  timestamptz,
  constraint rendez_vous_21_jours check (expire_le <= cree_le + interval '21 days')
);
create unique index if not exists rendez_vous_creneau_reserve on ops.rendez_vous (creneau) where statut = 'reserve';
alter table ops.rendez_vous enable row level security;

-- ── Le bucket privé des maquettes ───────────────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maquettes', 'maquettes', false, 3145728, array['image/jpeg', 'video/mp4'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'video/mp4'];

-- ── La fenêtre de Meta, tenue par la base ───────────────────────────────────────────────────────────────────────────────
create or replace function ops.garde_fenetre_meta()
returns trigger
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v_c ops.conversations%rowtype;
begin
  if new.statut not in ('prepare', 'approuve') then return new; end if;
  if new.canal = 'messagerie' then
    select * into v_c from ops.conversations c where c.id = new.conversation_id;
    if v_c.dernier_message_recu_le is null or v_c.dernier_message_recu_le <= now() - interval '24 hours' then
      raise exception 'ops:fenetre_fermee';
    end if;
  elsif new.canal = 'reponse_privee' then
    select * into v_c from ops.conversations c where c.id = new.conversation_id;
    if v_c.commentaire_id is null or v_c.commentaire_le <= now() - interval '7 days' then
      raise exception 'ops:fenetre_fermee';
    end if;
    if exists (select 1 from ops.envois e where e.canal = 'reponse_privee' and e.commentaire_id = new.commentaire_id
                and e.id <> new.id and e.statut not in ('annule', 'perime')) then
      raise exception 'ops:fenetre_fermee';
    end if;
  end if;
  return new;
end
$$;
revoke all on function ops.garde_fenetre_meta() from public, anon, authenticated, service_role;
create or replace trigger envois_garde_fenetre_meta before insert or update of statut on ops.envois for each row execute function ops.garde_fenetre_meta();

-- ── Plafonds ────────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_plafond_du_jour(p_canal text, p_envoyeur text default '*')
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select jsonb_build_object('envois', q.plafond_jour, 'nouveaux', q.plafond_nouveaux_jour)
    from ops.quotas_canaux q where q.canal = p_canal and q.envoyeur = p_envoyeur
$$;
revoke all on function public.acq_plafond_du_jour(text, text) from public, anon, authenticated;
grant execute on function public.acq_plafond_du_jour(text, text) to service_role;

create or replace function public.acq_envois_du_jour(p_canal text, p_envoyeur text default '*')
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select jsonb_build_object(
    'envois', count(*) filter (where e.canal <> 'formulaire_site' or e.type = 'premier_contact'),
    'nouveaux', count(*) filter (where e.type = 'premier_contact'))
    from ops.envois e
   where e.canal = p_canal and (p_envoyeur = '*' or e.envoyeur = p_envoyeur)
     and e.statut not in ('saute', 'perime', 'annule')
     and (e.prepare_le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date
$$;
revoke all on function public.acq_envois_du_jour(text, text) from public, anon, authenticated;
grant execute on function public.acq_envois_du_jour(text, text) to service_role;

create or replace function public.acq_historique_contacts(p_prospect uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('envoi_id', e.id, 'type', e.type, 'canal', e.canal, 'statut', e.statut, 'le', e.prepare_le) order by e.prepare_le), '[]'::jsonb)
    from ops.envois e where e.prospect_id = p_prospect
$$;
revoke all on function public.acq_historique_contacts(uuid) from public, anon, authenticated;
grant execute on function public.acq_historique_contacts(uuid) to service_role;

-- ── Prospects ───────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_prospects_pour_premier_contact(p_canal text, p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from (
    select p.* from ops.prospects p
     where p.etape in ('maquette_prete', 'verifie') and p.froid
       and not public.acq_oppose(jsonb_build_object('siren', p.siren, 'domaine', p.domaine))
       and (p_canal <> 'formulaire_site' or (p.formulaire->>'eligible' = 'true'
            and not exists (select 1 from ops.envois e join ops.prospects q on q.id = e.prospect_id
                             where e.canal = 'formulaire_site' and (q.siren = p.siren or q.domaine = p.domaine))))
     order by (p.etape = 'maquette_prete') desc, p.cree_le
     limit p_limite) p
$$;
revoke all on function public.acq_prospects_pour_premier_contact(text, int) from public, anon, authenticated;
grant execute on function public.acq_prospects_pour_premier_contact(text, int) to service_role;

create or replace function public.acq_prospects_pour_relance(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from (
    select p.* from ops.prospects p
     where p.etape = 'lien_envoye' and p.dernier_contact <= now() - interval '4 days'
       and not exists (select 1 from ops.envois e where e.prospect_id = p.id and e.type = 'relance')
       and not exists (select 1 from ops.reponses r where r.prospect_id = p.id and r.recu_le > p.dernier_contact)
       and not public.acq_oppose(jsonb_build_object('siren', p.siren, 'domaine', p.domaine))
     limit p_limite) p
$$;
revoke all on function public.acq_prospects_pour_relance(int) from public, anon, authenticated;
grant execute on function public.acq_prospects_pour_relance(int) to service_role;

create or replace function public.acq_prospects_pour_maquette(p_limite int, p_froid boolean)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from (
    select p.* from ops.prospects p
     where not exists (select 1 from ops.maquettes m where m.prospect_id = p.id and m.prete_le is not null and m.expire_le > now())
       and ((p_froid and p.froid and p.etape = 'verifie' and ('x' || left(md5(p.cle_dedup), 8))::bit(32)::int % 2 = 0)
         or (not p_froid and ((p.source = 'entrant' and p.etape = 'verifie') or (p.froid and p.etape = 'oui'))))
     order by p.cree_le
     limit p_limite) p
$$;
revoke all on function public.acq_prospects_pour_maquette(int, boolean) from public, anon, authenticated;
grant execute on function public.acq_prospects_pour_maquette(int, boolean) to service_role;

create or replace function public.acq_prospects_oui(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from (
    select p.* from ops.prospects p
     where (p.etape = 'oui' or (p.source = 'entrant' and p.etape = 'maquette_prete'))
       and exists (select 1 from ops.maquettes m where m.prospect_id = p.id and m.prete_le is not null and m.expire_le > now())
     limit p_limite) p
$$;
revoke all on function public.acq_prospects_oui(int) from public, anon, authenticated;
grant execute on function public.acq_prospects_oui(int) to service_role;

-- ── Envois ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_envois_perimer()
returns int
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  n int;
begin
  update ops.envois set statut = 'perime' where statut = 'prepare' and prepare_le < now() - interval '20 hours';
  get diagnostics n = row_count;
  return n;
end
$$;
revoke all on function public.acq_envois_perimer() from public, anon, authenticated;
grant execute on function public.acq_envois_perimer() to service_role;

create or replace function public.acq_envoi_preparer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v_texte text := p->>'texte';
  v_id uuid;
  v_etape text;
begin
  if coalesce(btrim(v_texte), '') = '' then return jsonb_build_object('ok', false, 'raison', 'texte_vide'); end if;
  if p->>'empreinte_texte' <> encode(extensions.digest(v_texte, 'sha256'), 'hex') then return jsonb_build_object('ok', false, 'raison', 'empreinte'); end if;
  if p->>'canal' = 'email_sollicite' and p->'preuve_demande' is null then return jsonb_build_object('ok', false, 'raison', 'preuve_demande_absente'); end if;
  if exists (select 1 from ops.envois e where e.reference = p->>'reference') then return jsonb_build_object('ok', false, 'raison', 'reference'); end if;
  select etape into v_etape from ops.prospects where id = (p->>'prospect_id')::uuid;
  begin
    insert into ops.envois (prospect_id, conversation_id, canal, envoyeur, type, texte, objet, empreinte_texte, statut, preuve_demande, reference, technologie, commentaire_id, prepare_par)
    values ((p->>'prospect_id')::uuid, (p->>'conversation_id')::uuid, p->>'canal', coalesce(p->>'envoyeur', 'systeme'), p->>'type', v_texte, p->>'objet',
            p->>'empreinte_texte', 'prepare', p->'preuve_demande', p->>'reference', p->>'technologie', p->>'commentaire_id', coalesce(p->>'prepare_par', 'systeme'))
    returning id into v_id;
    if p->>'type' = 'premier_contact' then
      update ops.prospects set etape = 'prepare' where id = (p->>'prospect_id')::uuid and etape in ('verifie', 'maquette_prete');
    elsif p->>'type' = 'lien_maquette' then
      update ops.prospects set etape = 'lien_prepare' where id = (p->>'prospect_id')::uuid and etape in ('oui', 'maquette_prete');
    end if;
  exception when others then
    if sqlerrm like 'ops:%' then
      return jsonb_build_object('ok', false, 'raison', substr(sqlerrm, 5));
    end if;
    raise;
  end;
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;
revoke all on function public.acq_envoi_preparer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_preparer(jsonb) to service_role;

create or replace function public.acq_envois_a_approuver(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('envoi', to_jsonb(e), 'prospect', to_jsonb(p), 'historique', public.acq_historique_contacts(p.id))), '[]'::jsonb)
    from (select * from ops.envois where statut = 'prepare' order by prepare_le limit p_limite) e
    left join ops.prospects p on p.id = e.prospect_id
$$;
revoke all on function public.acq_envois_a_approuver(int) from public, anon, authenticated;
grant execute on function public.acq_envois_a_approuver(int) to service_role;

create or replace function public.acq_envoi_approuver(p_envoi uuid, p_verdicts jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  begin
    update ops.envois
       set statut = 'approuve', verdicts = p_verdicts, approuve_par_agent = 'facteur', approuve_le = now()
     where id = p_envoi and statut = 'prepare';
  exception when others then
    if sqlerrm like 'ops:%' then
      return jsonb_build_object('ok', false, 'raison', substr(sqlerrm, 5));
    end if;
    raise;
  end;
  return jsonb_build_object('ok', found);
end
$$;
revoke all on function public.acq_envoi_approuver(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_approuver(uuid, jsonb) to service_role;

create or replace function public.acq_envoi_annuler(p_envoi uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  update ops.envois set statut = 'annule', derniere_erreur = left(p_raison, 200) where id = p_envoi and statut in ('prepare', 'approuve');
end
$$;
revoke all on function public.acq_envoi_annuler(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_envoi_annuler(uuid, text) to service_role;

create or replace function public.acq_envois_approuves(p_canal text, p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.approuve_le), '[]'::jsonb)
    from (select * from ops.envois where statut = 'approuve' and canal = p_canal and canal <> 'formulaire_site' order by approuve_le limit p_limite) e
$$;
revoke all on function public.acq_envois_approuves(text, int) from public, anon, authenticated;
grant execute on function public.acq_envois_approuves(text, int) to service_role;

create or replace function public.acq_envoi_envoye(p_envoi uuid, p_preuve jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v ops.envois%rowtype;
  k text;
begin
  select * into v from ops.envois where id = p_envoi and statut = 'approuve';
  if not found then return jsonb_build_object('ok', false, 'raison', 'statut'); end if;
  if v.canal = 'formulaire_site' then
    foreach k in array array['code_http', 'empreinte_texte', 'empreinte_avant', 'empreinte_apres', 'chemin_usine'] loop
      if not (p_preuve ? k) then return jsonb_build_object('ok', false, 'raison', 'preuve'); end if;
    end loop;
  end if;
  update ops.envois
     set statut = 'envoye', envoye_le = now(), preuve = p_preuve, id_externe = p_preuve->>'id_externe', entetes = p_preuve->'entetes', bail_porteur_jusqua = null
   where id = p_envoi;
  update ops.prospects set etape = case when etape = 'lien_prepare' then 'lien_envoye' else 'envoye' end, dernier_contact = now()
   where id = v.prospect_id and etape in ('prepare', 'lien_prepare');
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_envoi_envoye(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_envoye(uuid, jsonb) to service_role;

create or replace function public.acq_formulaires_a_porter(p_limite int, p_bail_s int)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v jsonb;
  v_reste int;
  v_reste_essai int;
begin
  if public.acq_en_pause('facteur_usine') then return '[]'::jsonb; end if;
  v_reste := coalesce((public.acq_plafond_du_jour('formulaire_site')->>'nouveaux')::int, 0) - coalesce((public.acq_envois_du_jour('formulaire_site')->>'nouveaux')::int, 0);
  v_reste_essai := coalesce((public.acq_plafond_du_jour('essai_e2e')->>'envois')::int, 0) - coalesce((public.acq_envois_du_jour('essai_e2e')->>'envois')::int, 0);
  with pris as (
    select e.id from ops.envois e
      join ops.prospects p on p.id = e.prospect_id
     where e.statut = 'approuve' and (e.bail_porteur_jusqua is null or e.bail_porteur_jusqua < now())
       and not exists (select 1 from ops.opposition o where (o.cle_valeur = p.siren or o.cle_valeur = p.domaine) and (o.expire_le is null or o.expire_le > now()))
       and ((e.canal = 'formulaire_site' and v_reste > 0)
         or (e.canal = 'essai_e2e' and v_reste_essai > 0 and p.formulaire->>'action' = '{{URL_ESSAI}}'))
     order by e.approuve_le
     limit least(p_limite, greatest(v_reste, v_reste_essai, 0))
     for update of e skip locked
  )
  update ops.envois e set bail_porteur_jusqua = now() + make_interval(secs => p_bail_s) from pris where e.id = pris.id;
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'texte', e.texte, 'objet', e.objet, 'reference', e.reference, 'formulaire', p.formulaire)), '[]'::jsonb)
    into v
    from ops.envois e join ops.prospects p on p.id = e.prospect_id
   where e.bail_porteur_jusqua > now() and e.statut = 'approuve';
  return v;
end
$$;
revoke all on function public.acq_formulaires_a_porter(int, int) from public, anon, authenticated;
grant execute on function public.acq_formulaires_a_porter(int, int) to service_role;

create or replace function public.acq_formulaire_echec(p_envoi uuid, p_raison text, p_definitif boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v ops.envois%rowtype;
begin
  update ops.envois set tentatives_envoi = tentatives_envoi + 1, derniere_erreur = left(p_raison, 200), bail_porteur_jusqua = null
   where id = p_envoi returning * into v;
  if p_definitif then
    update ops.envois set statut = 'annule' where id = p_envoi;
    update ops.prospects set formulaire = coalesce(formulaire, '{}'::jsonb) || jsonb_build_object('eligible', false, 'raison', left(p_raison, 200)),
                             etape = 'verifie'
     where id = v.prospect_id;
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_formulaire_echec(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.acq_formulaire_echec(uuid, text, boolean) to service_role;

create or replace function public.acq_envoi_echec(p_envoi uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  update ops.envois set tentatives_envoi = least(tentatives_envoi + 1, 3), derniere_erreur = left(p_raison, 200) where id = p_envoi;
  update ops.envois set statut = 'annule' where id = p_envoi and tentatives_envoi >= 3;
end
$$;
revoke all on function public.acq_envoi_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_envoi_echec(uuid, text) to service_role;

-- ── Maquettes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_maquette_de(p_prospect uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select to_jsonb(m) from ops.maquettes m where m.prospect_id = p_prospect order by m.cree_le desc limit 1
$$;
revoke all on function public.acq_maquette_de(uuid) from public, anon, authenticated;
grant execute on function public.acq_maquette_de(uuid) to service_role;

create or replace function public.acq_maquettes_du_jour()
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select jsonb_build_object(
    'faites_aujourdhui', count(*) filter (where p.source <> 'entrant' and (m.prete_le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date),
    'pretes_non_utilisees', count(*) filter (where p.source <> 'entrant' and p.etape = 'maquette_prete'),
    'entrants_faites_aujourdhui', count(*) filter (where p.source = 'entrant' and (m.prete_le at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date))
    from ops.maquettes m join ops.prospects p on p.id = m.prospect_id
$$;
revoke all on function public.acq_maquettes_du_jour() from public, anon, authenticated;
grant execute on function public.acq_maquettes_du_jour() to service_role;

create or replace function public.acq_maquette_prete(p_prospect uuid, p_infos jsonb)
returns void
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  insert into ops.maquettes (prospect_id, empreintes, objets, prete_le) values (p_prospect, p_infos->'empreintes', p_infos->'objets', now());
  update ops.prospects set etape = 'maquette_prete' where id = p_prospect and etape = 'verifie';
end
$$;
revoke all on function public.acq_maquette_prete(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_maquette_prete(uuid, jsonb) to service_role;

create or replace function public.acq_maquette_lien_creer(p_prospect uuid, p_objet text, p_jeton_hache text, p_expire_le timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  if p_expire_le > now() + interval '21 days' or p_jeton_hache !~ '^[0-9a-f]{64}$' then return false; end if;
  update ops.maquettes set objet = p_objet, jeton_hache = p_jeton_hache, expire_le = p_expire_le
   where id = (select id from ops.maquettes where prospect_id = p_prospect order by cree_le desc limit 1);
  return found;
end
$$;
revoke all on function public.acq_maquette_lien_creer(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_maquette_lien_creer(uuid, text, text, timestamptz) to service_role;

create or replace function public.acq_maquette_par_jeton(p_jeton_hache text)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select jsonb_build_object('objets', m.objets, 'entreprise', p.entreprise, 'expire_le', m.expire_le)
    from ops.maquettes m join ops.prospects p on p.id = m.prospect_id
   where m.jeton_hache = p_jeton_hache and m.expire_le > now() and m.purgee_le is null
$$;
revoke all on function public.acq_maquette_par_jeton(text) from public, anon, authenticated;
grant execute on function public.acq_maquette_par_jeton(text) to service_role;

create or replace function public.acq_maquettes_a_purger(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from (select * from ops.maquettes where expire_le < now() and purgee_le is null limit p_limite) m
$$;
revoke all on function public.acq_maquettes_a_purger(int) from public, anon, authenticated;
grant execute on function public.acq_maquettes_a_purger(int) to service_role;

create or replace function public.acq_maquette_purgee(p_id uuid)
returns void
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  update ops.maquettes set purgee_le = now(), objets = null where id = p_id
$$;
revoke all on function public.acq_maquette_purgee(uuid) from public, anon, authenticated;
grant execute on function public.acq_maquette_purgee(uuid) to service_role;

-- ── Réponses ────────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_reponse_recue(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v_id uuid;
  v_envoi uuid;
  v_prospect uuid;
  v_de text := lower(p->>'de');
  v_ref text := substring(p->>'texte' from 'Réf\. ([A-Z0-9]{6})');
begin
  if v_ref is not null then
    select e.id, e.prospect_id into v_envoi, v_prospect from ops.envois e where e.reference = v_ref;
  end if;
  if v_prospect is null and split_part(v_de, '@', 2) not in ({{GRATUITES_SQL}}) then
    select q.id into v_prospect from ops.prospects q where q.domaine = split_part(v_de, '@', 2) limit 1;
  end if;
  if v_prospect is null and p->>'en_reponse_a' is not null then
    select e.id, e.prospect_id into v_envoi, v_prospect from ops.envois e where e.id_externe = p->>'en_reponse_a';
  end if;
  insert into ops.reponses (id_externe, envoi_id, conversation_id, prospect_id, canal, source, texte, auto, accuse_site, en_reponse_a, imap_uid, classe)
  values (p->>'id_externe', v_envoi, (p->>'conversation_id')::uuid, v_prospect, p->>'canal', p->>'source', left(p->>'texte', 4000),
          coalesce((p->>'auto')::boolean, false), coalesce((p->>'accuse_site')::boolean, false), p->>'en_reponse_a', (p->>'imap_uid')::bigint,
          case when v_envoi is null and v_prospect is null and p->>'conversation_id' is null then 'hors_fil' end)
  on conflict (id_externe) do nothing
  returning id into v_id;
  if v_id is null then return jsonb_build_object('nouvelle', false); end if;
  if v_prospect is not null and not coalesce((p->>'accuse_site')::boolean, false) then
    update ops.prospects set dernier_contact_recu = now() where id = v_prospect;
  end if;
  return jsonb_build_object('id', v_id, 'nouvelle', true,
    'prospect', (select jsonb_build_object('id', q.id, 'siren', q.siren, 'domaine', q.domaine) from ops.prospects q where q.id = v_prospect));
end
$$;
revoke all on function public.acq_reponse_recue(jsonb) from public, anon, authenticated;
grant execute on function public.acq_reponse_recue(jsonb) to service_role;

create or replace function public.acq_reponses_a_traiter(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select r.* from ops.reponses r where r.traitee_le is null order by r.recu_le limit p_limite) x
$$;
revoke all on function public.acq_reponses_a_traiter(int) from public, anon, authenticated;
grant execute on function public.acq_reponses_a_traiter(int) to service_role;

create or replace function public.acq_reponse_classer(p_id uuid, p jsonb)
returns void
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  update ops.reponses set classe = p->>'classe', classe_par = p->>'classe_par', certitude = (p->>'certitude')::numeric, faq_id = p->>'faq_id',
         rappel_le = (p->>'rappel_le')::date, traitee_le = now(), actes_le = now()
   where id = p_id
$$;
revoke all on function public.acq_reponse_classer(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_reponse_classer(uuid, jsonb) to service_role;

create or replace function public.acq_reponses_a_repondre(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select r.*,
           (select e.envoye_le from ops.envois e where e.prospect_id = r.prospect_id and e.statut = 'envoye' order by e.envoye_le desc limit 1) as notre_dernier_envoi_le,
           (select e.type from ops.envois e where e.prospect_id = r.prospect_id and e.statut = 'envoye' order by e.envoye_le desc limit 1) as notre_dernier_envoi_type
      from ops.reponses r
     where r.traitee_le is not null and r.repondue_le is null and r.actes_le is not null
       and r.classe in ('question', 'prix', 'appel', 'stop', 'rgpd', 'rgpd_acces', 'rgpd_effacement', 'entrant')
     limit p_limite) x
$$;
revoke all on function public.acq_reponses_a_repondre(int) from public, anon, authenticated;
grant execute on function public.acq_reponses_a_repondre(int) to service_role;

create or replace function public.acq_reponse_repondue(p_id uuid, p_envoi uuid)
returns void
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  update ops.reponses set repondue_le = now() where id = p_id
$$;
revoke all on function public.acq_reponse_repondue(uuid, uuid) from public, anon, authenticated;
grant execute on function public.acq_reponse_repondue(uuid, uuid) to service_role;

create or replace function public.acq_reponse_reclasser(p_decision uuid, p_par text)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v_d ops.decisions%rowtype;
  v_reponse uuid;
  v_classe text;
  r ops.reponses%rowtype;
begin
  select * into v_d from ops.decisions d where d.id = p_decision and d.statut = 'tranchee' and d.cle_idempotence like 'acq:reponse:%' and d.creee_par = 'standardiste';
  if not found then return null; end if;
  v_reponse := split_part(v_d.cle_idempotence, ':', 3)::uuid;
  select * into r from ops.reponses where id = v_reponse;
  if r.reclassee_par_decision = p_decision then
    return jsonb_build_object('reponse_id', r.id, 'classe', r.classe, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id);
  end if;
  v_classe := case when v_d.choix = 'ignorer' then 'ignoree' else v_d.choix end;
  update ops.reponses
     set classe = v_classe, classe_par = p_par, certitude = 1, traitee_le = now(), actes_le = null, reclassee_par_decision = p_decision,
         repondue_le = case when v_classe in ('ignoree', 'rgpd_autre') then now() end
   where id = v_reponse;
  return jsonb_build_object('reponse_id', r.id, 'classe', v_classe, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id);
end
$$;
revoke all on function public.acq_reponse_reclasser(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_reponse_reclasser(uuid, text) to service_role;

create or replace function public.acq_reponses_reclassees(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id, 'classe', r.classe)), '[]'::jsonb)
    from (select * from ops.reponses where classe_par = 'benj' and actes_le is null limit p_limite) r
$$;
revoke all on function public.acq_reponses_reclassees(int) from public, anon, authenticated;
grant execute on function public.acq_reponses_reclassees(int) to service_role;

create or replace function public.acq_reponse_actes_faits(p_id uuid)
returns void
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  update ops.reponses set actes_le = now() where id = p_id
$$;
revoke all on function public.acq_reponse_actes_faits(uuid) from public, anon, authenticated;
grant execute on function public.acq_reponse_actes_faits(uuid) to service_role;

create or replace function public.acq_reponse_appel_rendu(p_reponse uuid)
returns boolean
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  update ops.reponses set appel_rendu_le = now() where id = p_reponse and classe = 'appel' and appel_rendu_le is null;
  if not found then return false; end if;
  insert into ops.evenements (agent, type, objet, resume) values ('systeme', 'appel_rendu', p_reponse::text, 'appel rendu');
  return true;
end
$$;
revoke all on function public.acq_reponse_appel_rendu(uuid) from public, anon, authenticated;
grant execute on function public.acq_reponse_appel_rendu(uuid) to service_role;

-- ── Conversations et webhook Meta ───────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_conversation_enregistrer(p jsonb)
returns uuid
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  insert into ops.conversations (plateforme, meta_id, pseudo, commentaire_id, commentaire_le, dernier_message_recu_le)
  values (p->>'plateforme', p->>'meta_id', p->>'pseudo', p->>'commentaire_id', (p->>'commentaire_le')::timestamptz, (p->>'dernier_message_recu_le')::timestamptz)
  on conflict (plateforme, meta_id) do update set dernier_message_recu_le = excluded.dernier_message_recu_le, commentaire_id = excluded.commentaire_id, commentaire_le = excluded.commentaire_le
  returning id
$$;
revoke all on function public.acq_conversation_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_conversation_enregistrer(jsonb) to service_role;

create or replace function public.acq_conversation(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select to_jsonb(c) from ops.conversations c where c.id = p_id
$$;
revoke all on function public.acq_conversation(uuid) from public, anon, authenticated;
grant execute on function public.acq_conversation(uuid) to service_role;

create or replace function public.acq_meta_evenement_enregistrer(p jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  insert into ops.meta_evenements (id_externe, plateforme, type, charge) values (p->>'id_externe', p->>'plateforme', p->>'type', p->'charge')
  on conflict (id_externe) do nothing;
  return found;
end
$$;
revoke all on function public.acq_meta_evenement_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_meta_evenement_enregistrer(jsonb) to service_role;

create or replace function public.acq_meta_evenements_a_traiter(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from (select * from ops.meta_evenements where traite_le is null order by recu_le limit p_limite) m
$$;
revoke all on function public.acq_meta_evenements_a_traiter(int) from public, anon, authenticated;
grant execute on function public.acq_meta_evenements_a_traiter(int) to service_role;

create or replace function public.acq_meta_evenement_traite(p_id bigint)
returns void
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  update ops.meta_evenements set traite_le = now() where id = p_id
$$;
revoke all on function public.acq_meta_evenement_traite(bigint) from public, anon, authenticated;
grant execute on function public.acq_meta_evenement_traite(bigint) to service_role;

-- ── Rendez-vous ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.acq_rdv_lien_creer(p_prospect uuid, p_jeton_hache text, p_expire_le timestamptz)
returns uuid
language sql
security definer
set search_path = public, ops, pg_temp
as $$
  insert into ops.rendez_vous (prospect_id, jeton_hache, expire_le) values (p_prospect, p_jeton_hache, p_expire_le) returning id
$$;
revoke all on function public.acq_rdv_lien_creer(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_rdv_lien_creer(uuid, text, timestamptz) to service_role;

create or replace function public.acq_rdv_par_jeton(p_jeton_hache text)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select jsonb_build_object('metier', p.metier, 'commune', p.commune, 'statut', v.statut, 'creneau', v.creneau, 'expire_le', v.expire_le)
    from ops.rendez_vous v join ops.prospects p on p.id = v.prospect_id
   where v.jeton_hache = p_jeton_hache and v.expire_le > now()
$$;
revoke all on function public.acq_rdv_par_jeton(text) from public, anon, authenticated;
grant execute on function public.acq_rdv_par_jeton(text) to service_role;

create or replace function public.acq_rdv_creneaux_pris(p_depuis timestamptz, p_jusqua timestamptz)
returns setof timestamptz
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select v.creneau from ops.rendez_vous v where v.statut = 'reserve' and v.creneau between p_depuis and p_jusqua
$$;
revoke all on function public.acq_rdv_creneaux_pris(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_rdv_creneaux_pris(timestamptz, timestamptz) to service_role;

create or replace function public.acq_rdv_reserver(p_jeton_hache text, p_creneau timestamptz, p_telephone text)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v ops.rendez_vous%rowtype;
begin
  select * into v from ops.rendez_vous where jeton_hache = p_jeton_hache;
  if not found or v.expire_le <= now() then return jsonb_build_object('ok', false, 'raison', 'expire'); end if;
  if v.statut = 'reserve' then return jsonb_build_object('ok', false, 'raison', 'deja'); end if;
  if extract(isodow from p_creneau at time zone 'Europe/Paris') > 5 then return jsonb_build_object('ok', false, 'raison', 'hors_plage'); end if;
  begin
    update ops.rendez_vous set statut = 'reserve', creneau = p_creneau, telephone = p_telephone, reserve_le = now() where id = v.id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'raison', 'pris');
  end;
  insert into ops.evenements (agent, type, objet, resume) values ('systeme', 'rdv_reserve', v.id::text, 'rendez-vous réservé');
  return jsonb_build_object('ok', true, 'id', v.id);
end
$$;
revoke all on function public.acq_rdv_reserver(text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.acq_rdv_reserver(text, timestamptz, text) to service_role;

create or replace function public.acq_rdv_appel_rendu(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  update ops.rendez_vous set appel_rendu_le = now(), statut = 'fait' where id = p_id and statut = 'reserve' and appel_rendu_le is null;
  if not found then return false; end if;
  insert into ops.evenements (agent, type, objet, resume) values ('systeme', 'appel_rendu', p_id::text, 'appel rendu');
  return true;
end
$$;
revoke all on function public.acq_rdv_appel_rendu(uuid) from public, anon, authenticated;
grant execute on function public.acq_rdv_appel_rendu(uuid) to service_role;

-- ── L'adresse donnée par un entrant ; les droits des personnes ──────────────────────────────────────────────────────────
create or replace function public.acq_entrant_email_ajouter(p_conversation uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
begin
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return false; end if;
  update ops.prospects p set canaux = p.canaux || jsonb_build_array(jsonb_build_object('canal', 'email', 'valeur', lower(p_email), 'nature', 'donnee_par_la_personne'))
   where p.id = (select c.prospect_id from ops.conversations c where c.id = p_conversation) and p.source = 'entrant'
     and not p.canaux @> jsonb_build_array(jsonb_build_object('canal', 'email', 'valeur', lower(p_email)));
  return found;
end
$$;
revoke all on function public.acq_entrant_email_ajouter(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_entrant_email_ajouter(uuid, text) to service_role;

create or replace function public.acq_prospect_export(p_prospect uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, ops, pg_temp
as $$
  select jsonb_build_object('entreprise', p.entreprise, 'siren', p.siren, 'commune', p.commune, 'metier', p.metier, 'faits', p.faits,
         'canaux', p.canaux, 'collecte_le', p.cree_le, 'dernier_contact_recu', p.dernier_contact_recu,
         'messages', (select count(*) from ops.envois e where e.prospect_id = p.id) + (select count(*) from ops.reponses r where r.prospect_id = p.id))
    from ops.prospects p where p.id = p_prospect
$$;
revoke all on function public.acq_prospect_export(uuid) from public, anon, authenticated;
grant execute on function public.acq_prospect_export(uuid) to service_role;

create or replace function public.acq_effacement_demander(p_prospect uuid)
returns boolean
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  p ops.prospects%rowtype;
begin
  update ops.prospects set effacement_demande_le = now() where id = p_prospect and effacement_demande_le is null returning * into p;
  if not found then return false; end if;
  perform public.acq_opposer(jsonb_strip_nulls(jsonb_build_object('siren', p.siren, 'domaine', p.domaine)), 'effacement', 'effacement');
  return true;
end
$$;
revoke all on function public.acq_effacement_demander(uuid) from public, anon, authenticated;
grant execute on function public.acq_effacement_demander(uuid) to service_role;

create or replace function public.acq_echanges_purger()
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  n_meta int; n_tel int; n_eff int;
begin
  delete from ops.meta_evenements where traite_le < now() - interval '30 days';
  get diagnostics n_meta = row_count;
  update ops.rendez_vous set telephone = null where telephone is not null and creneau < now() - interval '90 days';
  get diagnostics n_tel = row_count;
  delete from ops.prospects where effacement_demande_le < now() - interval '7 days';
  get diagnostics n_eff = row_count;
  -- (l'opposition reste)
  return jsonb_build_object('meta', n_meta, 'telephones', n_tel, 'effaces', n_eff);
end
$$;
revoke all on function public.acq_echanges_purger() from public, anon, authenticated;
grant execute on function public.acq_echanges_purger() to service_role;

create or replace function public.acq_preuves_a_garder(p_envois uuid[])
returns uuid[]
language plpgsql
stable
security definer
set search_path = public, ops, pg_temp
as $$
begin
  if coalesce(array_length(p_envois, 1), 0) > 500 then raise exception 'ops:borne'; end if;
  return coalesce((
    select array_agg(e.id)
      from ops.envois e join ops.prospects p on p.id = e.prospect_id
     where e.id = any(p_envois) and p.effacement_demande_le is null
       and coalesce((select max(r.recu_le) from ops.reponses r where r.prospect_id = p.id), e.envoye_le, e.prepare_le) > now() - interval '3 years'), '{}');
end
$$;
revoke all on function public.acq_preuves_a_garder(uuid[]) from public, anon, authenticated;
grant execute on function public.acq_preuves_a_garder(uuid[]) to service_role;

create or replace function public.acq_decision_creer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ops, pg_temp
as $$
declare
  v_id uuid;
begin
  if jsonb_array_length(coalesce(p->'options', '[]'::jsonb)) not between 2 and 7 then
    return jsonb_build_object('ok', false, 'raison', 'options');
  end if;
  select id into v_id from ops.decisions where cle_idempotence = p->>'cle_idempotence';
  if v_id is not null then return jsonb_build_object('ok', true, 'id', v_id, 'cree', false); end if;
  insert into ops.decisions (creee_par, question, options, option_defaut, cle_idempotence, echeance)
  values (p->>'agent', p->>'question', p->'options', p->>'defaut', p->>'cle_idempotence', now() + interval '3 days')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'cree', true);
end
$$;
revoke all on function public.acq_decision_creer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_decision_creer(jsonb) to service_role;
