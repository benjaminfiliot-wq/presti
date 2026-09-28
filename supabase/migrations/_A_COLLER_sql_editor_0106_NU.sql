---------------------------- _A_COLLER_sql_editor_0106_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table ops.prospects
  add column if not exists effacement_demande_le timestamptz;
alter table ops.envois
  add column if not exists objet                 text check (char_length(objet) <= 120),
  add column if not exists texte                  text check (char_length(texte) <= 1500),
  add column if not exists variante               text check (variante is null or variante in ('A', 'B')),
  add column if not exists modele_id              text,
  add column if not exists fait_id                text,
  add column if not exists douleur_id             text,
  add column if not exists fil_envoi_id           uuid references ops.envois(id) on delete set null,
  add column if not exists tentatives_envoi       int not null default 0 check (tentatives_envoi between 0 and 3),
  add column if not exists derniere_erreur        text check (char_length(derniere_erreur) <= 200),
  add column if not exists preuve                 jsonb,
  add column if not exists preuve_demande         jsonb,
  add column if not exists reference              text unique check (reference ~ '^[A-Z0-9]{6}$'),
  add column if not exists technologie            text,
  add column if not exists bail_porteur_jusqua     timestamptz,
  add column if not exists commentaire_id         text;
alter table ops.maquettes
  add column if not exists empreintes jsonb,
  add column if not exists prete_le   timestamptz,
  add column if not exists objets     jsonb;
create table if not exists ops.conversations (
  id                        uuid primary key default gen_random_uuid(),
  plateforme                text not null check (plateforme in ('instagram', 'facebook')),
  meta_id                   text not null check (char_length(meta_id) <= 200),
  pseudo                    text check (char_length(pseudo) <= 60),
  suit_le_compte            boolean,
  abonnes                   int check (abonnes is null or abonnes >= 0),
  commentaire_id            text,
  commentaire_le            timestamptz,
  dernier_message_recu_le   timestamptz,
  prospect_id               uuid references ops.prospects(id) on delete set null,
  cree_le                   timestamptz not null default now(),
  constraint conversations_une_par_plateforme unique (plateforme, meta_id)
);
create index if not exists conversations_prospect on ops.conversations (prospect_id);
alter table ops.envois
  add column if not exists conversation_id uuid references ops.conversations(id) on delete set null;
do $$ begin
  alter table ops.envois add constraint envois_prospect_ou_conversation
    check (prospect_id is not null or conversation_id is not null);
exception when duplicate_object then null;
end $$;
create table if not exists ops.meta_evenements (
  id           bigint generated always as identity primary key,
  id_externe   text not null unique check (char_length(id_externe) <= 200),
  plateforme   text,
  type         text check (type in ('commentaire', 'message', 'postback', 'autre')),
  charge       jsonb not null check (pg_column_size(charge) <= 8192),
  recu_le      timestamptz not null default now(),
  traite_le    timestamptz
);
create index if not exists meta_evenements_a_traiter on ops.meta_evenements (recu_le) where traite_le is null;
create table if not exists ops.reponses (
  id                       uuid primary key default gen_random_uuid(),
  id_externe               text not null unique check (char_length(id_externe) <= 300),
  envoi_id                 uuid references ops.envois(id) on delete set null,
  conversation_id          uuid references ops.conversations(id) on delete set null,
  prospect_id              uuid references ops.prospects(id) on delete cascade,
  canal                    text,
  source                   text not null check (source in ('courriel', 'meta', 'formulaire', 'essai')),
  texte                    text check (char_length(texte) <= 4000),
  auto                     boolean not null default false,
  accuse_site              boolean not null default false,
  en_reponse_a             text,
  imap_uid                 bigint,
  recu_le                  timestamptz not null default now(),
  classe                   text,
  classe_par               text,
  certitude                numeric check (certitude is null or certitude between 0 and 1),
  faq_id                   text,
  rappel_le                date,
  traitee_le               timestamptz,
  actes_le                 timestamptz,
  repondue_le              timestamptz,
  appel_rendu_le           timestamptz,
  reclassee_par_decision   uuid references ops.decisions(id) on delete set null,
  constraint reponses_envoi_ou_conversation_ou_courriel
    check (envoi_id is not null or conversation_id is not null or source = 'courriel')
);
create index if not exists reponses_prospect on ops.reponses (prospect_id);
create index if not exists reponses_a_traiter on ops.reponses (recu_le) where classe is null;
create index if not exists reponses_a_repondre on ops.reponses (recu_le) where classe is not null and repondue_le is null;
create table if not exists ops.rendez_vous (
  id               uuid primary key default gen_random_uuid(),
  prospect_id      uuid references ops.prospects(id) on delete cascade,
  jeton_hache      text unique check (jeton_hache ~ '^[0-9a-f]{64}$'),
  cree_le          timestamptz not null default now(),
  expire_le        timestamptz check (expire_le <= cree_le + interval '21 days'),
  creneau          timestamptz,
  telephone        text check (telephone is null or telephone ~ '^\+?[0-9]{10,15}$'),
  statut           text not null default 'propose' check (statut in ('propose', 'reserve', 'annule', 'fait')),
  reserve_le       timestamptz,
  appel_rendu_le   timestamptz
);
create unique index if not exists rendez_vous_creneau_reserve on ops.rendez_vous (creneau) where statut = 'reserve';
alter table ops.conversations enable row level security;
alter table ops.meta_evenements enable row level security;
alter table ops.reponses enable row level security;
alter table ops.rendez_vous enable row level security;
revoke all on ops.conversations from public, anon, authenticated, service_role;
revoke all on ops.meta_evenements from public, anon, authenticated, service_role;
revoke all on ops.reponses from public, anon, authenticated, service_role;
revoke all on ops.rendez_vous from public, anon, authenticated, service_role;
comment on table ops.conversations is 'Conversations Meta (Instagram, Facebook, 026-061) : fenêtre de 24 h, commentaire SITE (7 jours), rattachement à un prospect facultatif (on delete set null).';
comment on table ops.meta_evenements is 'Boîte d''arrivée du webhook de Meta (026-061) : idempotente par id_externe, traitée puis marquée.';
comment on table ops.reponses is 'Réponses des deux chemins (Gmail de prospection, webhook Meta, 026-061) : idempotentes par id_externe, rattachées par référence puis domaine puis en_reponse_a, classées par le Standard ou reclassées par Benj.';
comment on table ops.rendez_vous is 'Rendez-vous de la page maison (026-061, R14) : jeton haché, 21 jours au plus, un seul par créneau réservé.';
create or replace function ops.garde_fenetre_meta()
returns trigger
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_conv record;
begin
  if new.statut not in ('prepare', 'approuve') then
    return new;
  end if;
  if new.canal = 'messagerie' then
    if new.conversation_id is null then
      raise exception using message = 'ops:fenetre_fermee', errcode = 'P0001';
    end if;
    select dernier_message_recu_le into v_conv from ops.conversations where id = new.conversation_id;
    if not found or v_conv.dernier_message_recu_le is null or v_conv.dernier_message_recu_le <= now() - interval '24 hours' then
      raise exception using message = 'ops:fenetre_fermee', errcode = 'P0001';
    end if;
  elsif new.canal = 'reponse_privee' then
    if new.conversation_id is null then
      raise exception using message = 'ops:fenetre_fermee', errcode = 'P0001';
    end if;
    select commentaire_id, commentaire_le into v_conv from ops.conversations where id = new.conversation_id;
    if not found or v_conv.commentaire_id is null or v_conv.commentaire_le is null or v_conv.commentaire_le <= now() - interval '7 days' then
      raise exception using message = 'ops:fenetre_fermee', errcode = 'P0001';
    end if;
    if exists (
      select 1 from ops.envois e
       where e.commentaire_id = v_conv.commentaire_id
         and e.id <> new.id
         and e.type <> 'confirmation_stop'
         and e.statut not in ('saute', 'perime', 'annule')
    ) then
      raise exception using message = 'ops:fenetre_fermee', errcode = 'P0001';
    end if;
  end if;
  return new;
end
$$;
revoke all on function ops.garde_fenetre_meta() from public, anon, authenticated, service_role;
comment on function ops.garde_fenetre_meta() is
  'Déclencheur de ops.envois (026-061, revue du 25/09) : sur messagerie, la conversation doit avoir reçu un message depuis moins de 24 h ; sur reponse_privee, un commentaire SITE de moins de 7 jours et une seule réponse privée par commentaire ; sinon ops:fenetre_fermee. Sans droit d''exécution : personne ne l''appelle directement.';
drop trigger if exists garde_fenetre_meta on ops.envois;
create trigger garde_fenetre_meta
  before insert or update of statut on ops.envois
  for each row execute function ops.garde_fenetre_meta();
comment on trigger garde_fenetre_meta on ops.envois is
  'La fenêtre de Meta tenue par la base (026-061, OB-14) : un bogue du Répondeur ou du Facteur ne peut pas écrire à quelqu''un qui n''a pas écrit.';
create or replace function public.acq_plafond_du_jour(p_canal text, p_envoyeur text default '*')
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object('envois', q.plafond_jour, 'nouveaux', q.plafond_nouveaux_jour)
    from ops.quotas_canaux q
   where q.canal = p_canal and q.envoyeur = coalesce(p_envoyeur, '*')
$$;
revoke all on function public.acq_plafond_du_jour(text, text) from public, anon, authenticated;
grant execute on function public.acq_plafond_du_jour(text, text) to service_role;
comment on function public.acq_plafond_du_jour(text, text) is
  'Le plafond du jour (envois, nouveaux) de ops.quotas_canaux pour ce canal et cet envoyeur (* par défaut), ou null si la ligne n''existe pas : le canal est fermé (026-061).';
create or replace function public.acq_envois_du_jour(p_canal text, p_envoyeur text default '*')
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_jour    date := (now() at time zone 'Europe/Paris')::date;
  v_debut   timestamptz := v_jour::timestamp at time zone 'Europe/Paris';
  v_fin     timestamptz := (v_jour + 1)::timestamp at time zone 'Europe/Paris';
  v_envois  int;
  v_nouveaux int;
begin
  select count(*) into v_envois
    from ops.envois e
   where e.canal = p_canal
     and (coalesce(p_envoyeur, '*') = '*' or e.envoyeur = p_envoyeur)
     and e.statut not in ('saute', 'perime', 'annule')
     and e.prepare_le >= v_debut and e.prepare_le < v_fin
     and (case
            when p_canal = 'formulaire_site' then e.type = 'premier_contact'
            when p_canal in ('email_sollicite', 'reponse_privee', 'messagerie') then true
            else e.type in ('premier_contact', 'relance')
          end);
  select count(*) into v_nouveaux
    from ops.envois e
   where e.canal = p_canal
     and (coalesce(p_envoyeur, '*') = '*' or e.envoyeur = p_envoyeur)
     and e.statut not in ('saute', 'perime', 'annule')
     and e.type = 'premier_contact'
     and e.prepare_le >= v_debut and e.prepare_le < v_fin;
  return jsonb_build_object('envois', coalesce(v_envois, 0), 'nouveaux', coalesce(v_nouveaux, 0));
end
$$;
revoke all on function public.acq_envois_du_jour(text, text) from public, anon, authenticated;
grant execute on function public.acq_envois_du_jour(text, text) to service_role;
comment on function public.acq_envois_du_jour(text, text) is
  'Compte les envois du jour de Paris (026-061), hors saute/perime/annule, avec le filtre de 0099 : sur formulaire_site, les premiers contacts ; sur email_sollicite/reponse_privee/messagerie, tout type ; ailleurs, premier_contact et relance. Les nouveaux : premiers contacts seulement.';
create or replace function public.acq_historique_contacts(p_prospect uuid)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('envoi_id', x.id, 'type', x.type, 'canal', x.canal, 'statut', x.statut, 'le', x.le) order by x.le desc), '[]'::jsonb)
    from (
      select e.id, e.type, e.canal, e.statut, coalesce(e.envoye_le, e.approuve_le, e.prepare_le) as le
        from ops.envois e
       where e.prospect_id = p_prospect
       order by coalesce(e.envoye_le, e.approuve_le, e.prepare_le) desc
       limit 200
    ) x
$$;
revoke all on function public.acq_historique_contacts(uuid) from public, anon, authenticated;
grant execute on function public.acq_historique_contacts(uuid) to service_role;
comment on function public.acq_historique_contacts(uuid) is
  'Les 200 derniers envois d''un prospect, du plus récent au plus ancien (026-061).';
create or replace function public.acq_prospects_pour_premier_contact(p_canal text, p_limite int)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if p_canal = 'formulaire_site' then
    select coalesce(jsonb_agg(to_jsonb(x.*) order by x.rang, x.maj_le), '[]'::jsonb) into v_result
      from (
        select p.*, (case when p.etape = 'maquette_prete' then 0 else 1 end) as rang
          from ops.prospects p
         where p.etape in ('maquette_prete', 'verifie')
           and p.froid = true
           and coalesce(p.formulaire ->> 'eligible', '') = 'true'
           and not exists (
                 select 1 from ops.opposition o
                  where (o.expire_le is null or o.expire_le > now())
                    and (
                          (p.siren is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p.siren)))
                       or (p.domaine is not null and o.cle_type = 'domaine' and o.cle_valeur = lower(regexp_replace(btrim(p.domaine), '^www\.', '')))
                        )
               )
           and not exists (
                 select 1 from ops.envois e
                  where e.canal = 'formulaire_site'
                    and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
                    and exists (
                          select 1 from ops.prospects p2
                           where p2.id = e.prospect_id
                             and ((p.siren is not null and p2.siren = p.siren)
                               or (p.domaine is not null and lower(btrim(p2.domaine)) = lower(btrim(p.domaine))))
                        )
               )
      ) x
     order by x.rang, x.maj_le
     limit greatest(coalesce(p_limite, 1), 0);
  else
    select coalesce(jsonb_agg(to_jsonb(x.*) order by x.rang, x.maj_le), '[]'::jsonb) into v_result
      from (
        select p.*, (case when p.etape = 'maquette_prete' then 0 else 1 end) as rang
          from ops.prospects p
         where p.etape in ('maquette_prete', 'verifie')
           and p.froid = true
           and exists (select 1 from jsonb_array_elements(coalesce(p.canaux, '[]'::jsonb)) c
                        where c ->> 'canal' = p_canal and coalesce((c ->> 'verifie')::boolean, false))
           and not exists (
                 select 1 from ops.opposition o
                  where (o.expire_le is null or o.expire_le > now())
                    and (
                          (p.siren is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p.siren)))
                       or (p.instagram is not null and o.cle_type = 'instagram' and o.cle_valeur = lower(regexp_replace(btrim(p.instagram), '^@', '')))
                       or (p.page_meta is not null and o.cle_type = 'page_meta' and o.cle_valeur = lower(btrim(p.page_meta)))
                        )
               )
      ) x
     order by x.rang, x.maj_le
     limit greatest(coalesce(p_limite, 1), 0);
  end if;
  return v_result;
end
$$;
revoke all on function public.acq_prospects_pour_premier_contact(text, integer) from public, anon, authenticated;
grant execute on function public.acq_prospects_pour_premier_contact(text, integer) to service_role;
comment on function public.acq_prospects_pour_premier_contact(text, integer) is
  'Prospects froids maquette_prete puis verifie, canal vérifié, sans opposition active (026-061). Sur formulaire_site : formulaire éligible, aucune entreprise de même SIREN ou domaine déjà servie.';
create or replace function public.acq_prospects_pour_relance(p_limite int)
returns jsonb
language sql
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(x.*) order by x.dernier_contact), '[]'::jsonb)
    from (
      select p.*
        from ops.prospects p
       where p.etape = 'lien_envoye'
         and p.dernier_contact <= now() - interval '4 days'
         and not exists (select 1 from ops.reponses r where r.prospect_id = p.id and r.recu_le > p.dernier_contact and coalesce(r.accuse_site, false) = false)
         and not exists (select 1 from ops.envois e where e.prospect_id = p.id and e.type = 'relance')
         and not exists (
               select 1 from ops.opposition o
                where (o.expire_le is null or o.expire_le > now())
                  and ((p.siren is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p.siren)))
                    or (p.domaine is not null and o.cle_type = 'domaine' and o.cle_valeur = lower(regexp_replace(btrim(p.domaine), '^www\.', ''))))
             )
       order by p.dernier_contact
       limit greatest(coalesce(p_limite, 1), 0)
    ) x
$$;
revoke all on function public.acq_prospects_pour_relance(integer) from public, anon, authenticated;
grant execute on function public.acq_prospects_pour_relance(integer) to service_role;
comment on function public.acq_prospects_pour_relance(integer) is
  'Voie gratuite (026-061) : plus aucun froid relancé. Seulement les prospects lien_envoye depuis 4 jours ou plus, sans réponse depuis le lien, jamais relancés, sans opposition active.';
create or replace function public.acq_prospects_pour_maquette(p_limite int, p_froid boolean)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if p_froid then
    select coalesce(jsonb_agg(to_jsonb(x.*) order by x.maj_le), '[]'::jsonb) into v_result
      from (
        select p.*
          from ops.prospects p
         where p.froid = true
           and p.source <> 'entrant'
           and p.etape = 'verifie'
           and mod(abs(hashtext(p.cle_dedup)), 2) = 0
           and not exists (select 1 from ops.maquettes m where m.prospect_id = p.id and m.purgee_le is null)
         order by p.maj_le
         limit greatest(coalesce(p_limite, 1), 0)
      ) x;
  else
    select coalesce(jsonb_agg(to_jsonb(x.*) order by x.maj_le), '[]'::jsonb) into v_result
      from (
        (
          select p.* from ops.prospects p
           where p.source = 'entrant'
             and p.etape = 'verifie'
             and not exists (select 1 from ops.maquettes m where m.prospect_id = p.id and m.purgee_le is null)
        )
        union all
        (
          select p.* from ops.prospects p
           where p.etape = 'oui'
             and not exists (
                   select 1 from ops.maquettes m
                    where m.prospect_id = p.id and m.purgee_le is null and (m.expire_le is null or m.expire_le > now())
                 )
        )
        order by maj_le
        limit greatest(coalesce(p_limite, 1), 0)
      ) x;
  end if;
  return v_result;
end
$$;
revoke all on function public.acq_prospects_pour_maquette(integer, boolean) from public, anon, authenticated;
grant execute on function public.acq_prospects_pour_maquette(integer, boolean) to service_role;
comment on function public.acq_prospects_pour_maquette(integer, boolean) is
  'p_froid=true : le froid verifie sans maquette, empreinte de cle_dedup paire (comparaison A/B). p_froid=false : les demandes — entrants verifie sans maquette, et froids à oui sans maquette prête non expirée — sans parité (026-061, revue du 25/09).';
create or replace function public.acq_prospects_oui(p_limite int)
returns jsonb
language sql
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(x.*) order by x.maj_le), '[]'::jsonb)
    from (
      (
        select p.* from ops.prospects p
         where p.etape = 'oui'
           and exists (select 1 from ops.maquettes m where m.prospect_id = p.id and m.purgee_le is null and (m.expire_le is null or m.expire_le > now()))
      )
      union all
      (
        select p.* from ops.prospects p
         where p.source = 'entrant' and p.etape = 'maquette_prete'
           and exists (select 1 from ops.maquettes m where m.prospect_id = p.id and m.purgee_le is null and (m.expire_le is null or m.expire_le > now()))
      )
      order by maj_le
      limit greatest(coalesce(p_limite, 1), 0)
    ) x
$$;
revoke all on function public.acq_prospects_oui(integer) from public, anon, authenticated;
grant execute on function public.acq_prospects_oui(integer) to service_role;
comment on function public.acq_prospects_oui(integer) is
  'Les prospects à oui avec maquette prête non expirée, et les entrants maquette_prete avec maquette prête non expirée (leur demande vaut oui, 026-061, revue du 25/09).';
create or replace function public.acq_envois_perimer()
returns int
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_rec record;
  v_n int := 0;
begin
  for v_rec in
    select e.id, e.prospect_id, e.type
      from ops.envois e
     where e.statut = 'prepare' and e.prepare_le < now() - interval '20 hours'
       for update skip locked
  loop
    update ops.envois set statut = 'perime' where id = v_rec.id;
    if v_rec.prospect_id is not null then
      if v_rec.type = 'premier_contact' then
        update ops.prospects set etape = 'verifie', maj_le = now() where id = v_rec.prospect_id and etape = 'prepare';
      elsif v_rec.type = 'lien_maquette' then
        update ops.prospects set etape = 'oui', maj_le = now() where id = v_rec.prospect_id and etape = 'lien_prepare';
      end if;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end
$$;
revoke all on function public.acq_envois_perimer() from public, anon, authenticated;
grant execute on function public.acq_envois_perimer() to service_role;
comment on function public.acq_envois_perimer() is
  'prepare de plus de 20 h → perime, le prospect revient à son étape d''avant (026-061).';
create or replace function public.acq_envoi_preparer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_texte      text := p ->> 'texte';
  v_empreinte  text := p ->> 'empreinte_texte';
  v_reference  text := nullif(p ->> 'reference', '');
  v_type       text := p ->> 'type';
  v_prospect   uuid := nullif(p ->> 'prospect_id', '')::uuid;
  v_id         uuid;
begin
  if coalesce(btrim(v_texte), '') = '' then
    return jsonb_build_object('ok', false, 'raison', 'texte_vide');
  end if;
  if v_empreinte is null or v_empreinte <> encode(extensions.digest(v_texte, 'sha256'), 'hex') then
    return jsonb_build_object('ok', false, 'raison', 'empreinte');
  end if;
  if v_reference is not null and exists (select 1 from ops.envois where reference = v_reference) then
    return jsonb_build_object('ok', false, 'raison', 'reference');
  end if;
  begin
    insert into ops.envois (
      prospect_id, type, canal, envoyeur, destinataire, objet, texte, empreinte_texte,
      modele_id, variante, fait_id, douleur_id, fil_envoi_id, conversation_id,
      preuve_demande, reference, technologie, commentaire_id, statut, verdicts
    ) values (
      v_prospect, v_type, p ->> 'canal', coalesce(nullif(p ->> 'envoyeur', ''), 'systeme'), p ->> 'destinataire',
      nullif(p ->> 'objet', ''), v_texte, v_empreinte,
      nullif(p ->> 'modele_id', ''), nullif(p ->> 'variante', ''), nullif(p ->> 'fait_id', ''), nullif(p ->> 'douleur_id', ''),
      nullif(p ->> 'fil_envoi_id', '')::uuid, nullif(p ->> 'conversation_id', '')::uuid,
      p -> 'preuve_demande', v_reference, nullif(p ->> 'technologie', ''), nullif(p ->> 'commentaire_id', ''),
      'prepare', '{}'::jsonb
    )
    returning id into v_id;
    if v_prospect is not null then
      if v_type = 'premier_contact' then
        update ops.prospects set etape = 'prepare', maj_le = now() where id = v_prospect and etape in ('verifie', 'maquette_prete');
      elsif v_type = 'lien_maquette' then
        update ops.prospects set etape = 'lien_prepare', maj_le = now() where id = v_prospect and etape in ('oui', 'maquette_prete');
      end if;
    end if;
  exception when others then
    if sqlerrm like 'ops:%' then
      return jsonb_build_object('ok', false, 'raison', substring(sqlerrm from 5));
    end if;
    raise;
  end;
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;
revoke all on function public.acq_envoi_preparer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_preparer(jsonb) to service_role;
comment on function public.acq_envoi_preparer(jsonb) is
  'Prépare un envoi (026-061) : texte vide ou empreinte fausse → refus propre ; référence déjà prise → raison reference ; sinon insère (prepare) et fait avancer le prospect dans un sous-bloc qui rattrape les ops:% de 0099 (seconde serrure) et les rend { ok: false, raison }.';
create or replace function public.acq_envois_a_approuver(p_limite int)
returns jsonb
language sql
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(x.o order by x.prepare_le), '[]'::jsonb)
    from (
      select e.prepare_le,
             jsonb_build_object(
               'envoi', to_jsonb(e.*),
               'prospect', to_jsonb(p.*),
               'historique', (
                 select coalesce(jsonb_agg(jsonb_build_object('type', h.type, 'canal', h.canal, 'statut', h.statut, 'le', coalesce(h.envoye_le, h.prepare_le))), '[]'::jsonb)
                   from ops.envois h where h.prospect_id = e.prospect_id and h.id <> e.id
               )
             ) as o
        from ops.envois e
        left join ops.prospects p on p.id = e.prospect_id
       where e.statut = 'prepare'
       order by e.prepare_le
       limit greatest(coalesce(p_limite, 1), 0)
    ) x
$$;
revoke all on function public.acq_envois_a_approuver(integer) from public, anon, authenticated;
grant execute on function public.acq_envois_a_approuver(integer) to service_role;
comment on function public.acq_envois_a_approuver(integer) is
  'Les envois prepare, avec le prospect, son historique et ses canaux, pour J1 et J3 (026-061).';
create or replace function public.acq_envoi_approuver(p_envoi uuid, p_verdicts jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  begin
    update ops.envois
       set statut = 'approuve', verdicts = coalesce(p_verdicts, '{}'::jsonb), approuve_par_agent = 'facteur'
     where id = p_envoi;
    if not found then
      raise exception using message = 'ops:introuvable', errcode = 'P0001';
    end if;
  exception when others then
    if sqlerrm like 'ops:%' then
      return jsonb_build_object('ok', false, 'raison', substring(sqlerrm from 5));
    end if;
    raise;
  end;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_envoi_approuver(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_approuver(uuid, jsonb) to service_role;
comment on function public.acq_envoi_approuver(uuid, jsonb) is
  'La SEULE fonction qui écrit approuve (026-061) : approuve_par_agent = facteur, les verdicts ; rattrape les ops:% de 0099 (verdicts incomplets, pause, opposition, plafond…) et les rend { ok: false, raison }.';
create or replace function public.acq_envoi_annuler(p_envoi uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_prospect uuid;
  v_type text;
begin
  update ops.envois
     set statut = 'annule', derniere_erreur = left(coalesce(p_raison, ''), 200)
   where id = p_envoi and statut in ('prepare', 'attend_accord_benj', 'approuve')
  returning prospect_id, type into v_prospect, v_type;
  if v_prospect is not null then
    if v_type = 'premier_contact' then
      update ops.prospects set etape = 'verifie', maj_le = now() where id = v_prospect and etape = 'prepare';
    elsif v_type = 'lien_maquette' then
      update ops.prospects set etape = 'oui', maj_le = now() where id = v_prospect and etape = 'lien_prepare';
    end if;
  end if;
end
$$;
revoke all on function public.acq_envoi_annuler(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_envoi_annuler(uuid, text) to service_role;
comment on function public.acq_envoi_annuler(uuid, text) is
  'annule, le prospect revient à son étape d''avant (026-061).';
create or replace function public.acq_envois_approuves(p_canal text, p_limite int)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if p_canal = 'formulaire_site' then
    raise exception using message = 'ops:formulaire_site', errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(x.o order by x.approuve_le), '[]'::jsonb) into v_result
    from (
      select e.approuve_le,
             to_jsonb(e.*) || (case when p_canal = 'email_sollicite' then jsonb_build_object(
               'en_reponse_a', (select r.id_externe from ops.reponses r where r.id::text = (e.preuve_demande ->> 'id') and (e.preuve_demande ->> 'type') = 'message_recu'),
               'references', (select r.en_reponse_a from ops.reponses r where r.id::text = (e.preuve_demande ->> 'id') and (e.preuve_demande ->> 'type') = 'message_recu')
             ) else '{}'::jsonb end) as o
        from ops.envois e
       where e.canal = p_canal and e.statut = 'approuve'
       order by e.approuve_le
       limit greatest(coalesce(p_limite, 1), 0)
    ) x;
  return v_result;
end
$$;
revoke all on function public.acq_envois_approuves(text, integer) from public, anon, authenticated;
grant execute on function public.acq_envois_approuves(text, integer) to service_role;
comment on function public.acq_envois_approuves(text, integer) is
  'Les envois approuve d''un canal, jamais formulaire_site (ops:formulaire_site, réservé au porteur) ; sur email_sollicite, en_reponse_a et references du message reçu que désigne preuve_demande, pour répondre dans le fil (026-061).';
create or replace function public.acq_envoi_envoye(p_envoi uuid, p_preuve jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_canal     text;
  v_prospect  uuid;
  v_type      text;
begin
  select canal, prospect_id, type into v_canal, v_prospect, v_type
    from ops.envois where id = p_envoi and statut = 'approuve' for update;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'statut');
  end if;
  if v_canal in ('formulaire_site', 'essai_e2e') then
    if p_preuve is null
       or coalesce(p_preuve ->> 'code_http', '') = ''
       or coalesce(p_preuve ->> 'empreinte_texte', '') = ''
       or coalesce(p_preuve ->> 'empreinte_avant', '') = ''
       or coalesce(p_preuve ->> 'empreinte_apres', '') = ''
       or coalesce(p_preuve ->> 'chemin_usine', '') = ''
    then
      return jsonb_build_object('ok', false, 'raison', 'preuve');
    end if;
    begin
      update ops.envois set statut = 'envoye', preuve = p_preuve where id = p_envoi;
    exception when others then
      if sqlerrm like 'ops:%' then
        return jsonb_build_object('ok', false, 'raison', substring(sqlerrm from 5));
      end if;
      raise;
    end;
  else
    begin
      update ops.envois
         set statut = 'envoye', id_externe = nullif(p_preuve ->> 'id_externe', ''), entetes = coalesce(p_preuve -> 'entetes', '{}'::jsonb)
       where id = p_envoi;
    exception when others then
      if sqlerrm like 'ops:%' then
        return jsonb_build_object('ok', false, 'raison', substring(sqlerrm from 5));
      end if;
      raise;
    end;
  end if;
  if v_prospect is not null then
    if v_type = 'premier_contact' then
      update ops.prospects set etape = 'envoye', dernier_contact = now(), maj_le = now() where id = v_prospect and etape = 'prepare';
    elsif v_type = 'lien_maquette' then
      update ops.prospects set etape = 'lien_envoye', dernier_contact = now(), maj_le = now() where id = v_prospect and etape = 'lien_prepare';
    else
      update ops.prospects set dernier_contact = now(), maj_le = now() where id = v_prospect;
    end if;
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_envoi_envoye(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_envoi_envoye(uuid, jsonb) to service_role;
comment on function public.acq_envoi_envoye(uuid, jsonb) is
  'envoye, envoye_le (026-061). Pour formulaire_site/essai_e2e, preuve = p_preuve (PreuveSoumission complète, sinon refus sans écrire) ; sinon id_externe et entetes ; prospect prepare → envoye ou lien_prepare → lien_envoye.';
create or replace function public.acq_formulaires_a_porter(p_limite int, p_bail_s int)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_bail              int := greatest(coalesce(p_bail_s, 300), 30);
  v_reste_formulaire  int;
  v_reste_essai       int;
  v_ids               uuid[];
begin
  if public.acq_en_pause('facteur_usine') then
    return '[]'::jsonb;
  end if;
  select (select plafond_jour from ops.quotas_canaux where canal = 'formulaire_site' and envoyeur = '*')
         - coalesce((public.acq_envois_du_jour('formulaire_site', '*') ->> 'envois')::int, 0)
    into v_reste_formulaire;
  select (select plafond_jour from ops.quotas_canaux where canal = 'essai_e2e' and envoyeur = '*')
         - coalesce((public.acq_envois_du_jour('essai_e2e', '*') ->> 'envois')::int, 0)
    into v_reste_essai;
  select coalesce(array_agg(x.id), '{}'::uuid[]) into v_ids
    from (
      select e.id
        from ops.envois e
        left join ops.prospects p on p.id = e.prospect_id
       where e.statut = 'approuve'
         and (e.bail_porteur_jusqua is null or e.bail_porteur_jusqua < now())
         and (
               (e.canal = 'formulaire_site'
                and coalesce(v_reste_formulaire, 0) > 0
                and not exists (
                      select 1 from ops.opposition o
                       where (o.expire_le is null or o.expire_le > now())
                         and ((p.siren is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p.siren)))
                           or (p.domaine is not null and o.cle_type = 'domaine' and o.cle_valeur = lower(regexp_replace(btrim(p.domaine), '^www\.', ''))))
                    ))
            or (e.canal = 'essai_e2e'
                and coalesce(v_reste_essai, 0) > 0
                and coalesce(p.formulaire ->> 'url_action', '') = 'https://prestiapp.fr/essai-formulaire/envoi')
             )
       order by e.prepare_le
       limit greatest(coalesce(p_limite, 1), 0)
         for update of e skip locked
    ) x;
  update ops.envois set bail_porteur_jusqua = now() + make_interval(secs => v_bail) where id = any(v_ids);
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', e.id, 'texte', e.texte, 'objet', e.objet, 'reference', e.reference, 'formulaire', p.formulaire) order by e.prepare_le)
      from ops.envois e
      left join ops.prospects p on p.id = e.prospect_id
     where e.id = any(v_ids)
  ), '[]'::jsonb);
end
$$;
revoke all on function public.acq_formulaires_a_porter(integer, integer) from public, anon, authenticated;
grant execute on function public.acq_formulaires_a_porter(integer, integer) to service_role;
comment on function public.acq_formulaires_a_porter(integer, integer) is
  'Pour le porteur du formulaire, sur l''usine (026-061) : formulaire_site approuve, sans opposition, hors pause, technologie active, dans le reste du plafond du jour ; et, pour les essais (026-143, 026-163), essai_e2e vers https://prestiapp.fr/essai-formulaire/envoi SEULEMENT. Réservés par bail_porteur_jusqua (for update skip locked). Aucune adresse rendue.';
create or replace function public.acq_formulaire_echec(p_envoi uuid, p_raison text, p_definitif boolean)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_prospect     uuid;
  v_technologie  text;
begin
  update ops.envois
     set tentatives_envoi = tentatives_envoi + 1,
         derniere_erreur = left(coalesce(p_raison, ''), 200),
         bail_porteur_jusqua = null,
         statut = case when p_definitif then 'annule' else statut end
   where id = p_envoi
  returning prospect_id, technologie into v_prospect, v_technologie;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'introuvable');
  end if;
  begin
    perform public.acq_signal('echec_soumission', v_technologie);
  exception when undefined_function then
    null;
  end;
  if p_definitif and v_prospect is not null then
    update ops.prospects
       set etape = case when etape = 'prepare' then 'verifie' else etape end,
           formulaire = coalesce(formulaire, '{}'::jsonb) || jsonb_build_object('eligible', false, 'raison', coalesce(p_raison, '')),
           maj_le = now()
     where id = v_prospect;
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_formulaire_echec(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.acq_formulaire_echec(uuid, text, boolean) to service_role;
comment on function public.acq_formulaire_echec(uuid, text, boolean) is
  'tentatives_envoi + 1, derniere_erreur, bail libéré (026-061). Si p_definitif : annule, le prospect revient à son étape d''avant et son formulaire est marqué eligible=false.';
create or replace function public.acq_envoi_echec(p_envoi uuid, p_raison text)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_tentatives int;
begin
  update ops.envois
     set tentatives_envoi = tentatives_envoi + 1, derniere_erreur = left(coalesce(p_raison, ''), 200)
   where id = p_envoi
  returning tentatives_envoi into v_tentatives;
  if v_tentatives >= 3 then
    update ops.envois set statut = 'annule' where id = p_envoi;
    perform public.ops_evenement_ajouter('systeme', 'envoi_echec_definitif', 'envoi:' || p_envoi::text, 'envoi annulé après 3 échecs', null);
  end if;
end
$$;
revoke all on function public.acq_envoi_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_envoi_echec(uuid, text) to service_role;
comment on function public.acq_envoi_echec(uuid, text) is
  'tentatives_envoi + 1, derniere_erreur ; à la 3e, annule et un événement (026-061).';
create or replace function public.acq_maquette_de(p_prospect uuid)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select to_jsonb(m.*) from ops.maquettes m
   where m.prospect_id = p_prospect and m.purgee_le is null
   order by m.cree_le desc limit 1
$$;
revoke all on function public.acq_maquette_de(uuid) from public, anon, authenticated;
grant execute on function public.acq_maquette_de(uuid) to service_role;
comment on function public.acq_maquette_de(uuid) is
  'La maquette non purgée la plus récente d''un prospect, ou null (026-061).';
create or replace function public.acq_maquettes_du_jour()
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object(
    'faites_aujourdhui', (
      select count(*) from ops.maquettes m join ops.prospects p on p.id = m.prospect_id
       where p.froid = true and m.prete_le >= (now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris'
    ),
    'pretes_non_utilisees', (
      select count(*) from ops.maquettes m join ops.prospects p on p.id = m.prospect_id
       where p.froid = true and p.etape = 'maquette_prete' and m.purgee_le is null and (m.expire_le is null or m.expire_le > now())
    ),
    'entrants_faites_aujourdhui', (
      select count(*) from ops.maquettes m join ops.prospects p on p.id = m.prospect_id
       where p.source = 'entrant' and m.prete_le >= (now() at time zone 'Europe/Paris')::date::timestamp at time zone 'Europe/Paris'
    )
  )
$$;
revoke all on function public.acq_maquettes_du_jour() from public, anon, authenticated;
grant execute on function public.acq_maquettes_du_jour() to service_role;
comment on function public.acq_maquettes_du_jour() is
  'faites_aujourdhui (froides), pretes_non_utilisees (froid préparé d''avance), entrants_faites_aujourdhui à part, 5 au plus (026-061).';
create or replace function public.acq_maquette_prete(p_prospect uuid, p_infos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_etape text;
  v_id uuid;
begin
  select etape into v_etape from ops.prospects where id = p_prospect for update;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'introuvable');
  end if;
  insert into ops.maquettes (prospect_id, objet, empreintes, prete_le, objets)
  values (
    p_prospect,
    coalesce(nullif(p_infos ->> 'chemin', ''), nullif(p_infos ->> 'objet', '')),
    coalesce(p_infos -> 'empreintes', case when p_infos ->> 'empreinte' is not null then jsonb_build_object('principale', p_infos ->> 'empreinte') else null end),
    now(),
    coalesce(p_infos -> 'objets', case when p_infos ->> 'variante' is not null then jsonb_build_object('variante', p_infos ->> 'variante') else '{}'::jsonb end)
  )
  returning id into v_id;
  if v_etape = 'verifie' then
    update ops.prospects set etape = 'maquette_prete', maj_le = now() where id = p_prospect;
  end if;
  -- v_etape = 'oui' : la demande vaut oui, l'étape reste oui (acq_prospects_oui la rend alors)
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;
revoke all on function public.acq_maquette_prete(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_maquette_prete(uuid, jsonb) to service_role;
comment on function public.acq_maquette_prete(uuid, jsonb) is
  'Enregistre la maquette (026-061). Prospect verifie → maquette_prete. Prospect oui : la maquette est enregistrée, l''étape reste oui (acq_prospects_oui la prend alors).';
create or replace function public.acq_maquette_lien_creer(p_prospect uuid, p_objet text, p_jeton_hache text, p_expire_le timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  if p_jeton_hache !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'raison', 'jeton');
  end if;
  if p_expire_le is null or p_expire_le > now() + interval '21 days' then
    return jsonb_build_object('ok', false, 'raison', 'expire_le');
  end if;
  update ops.maquettes
     set objet = coalesce(p_objet, objet), jeton_hache = p_jeton_hache, expire_le = p_expire_le
   where id = (select id from ops.maquettes where prospect_id = p_prospect and purgee_le is null order by cree_le desc limit 1);
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'introuvable');
  end if;
  return jsonb_build_object('ok', true);
end
$$;
revoke all on function public.acq_maquette_lien_creer(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_maquette_lien_creer(uuid, text, text, timestamptz) to service_role;
comment on function public.acq_maquette_lien_creer(uuid, text, text, timestamptz) is
  'Refuse un expire_le au-delà de now()+21 jours ou un jeton_hache qui n''est pas 64 caractères hexadécimaux (026-061).';
create or replace function public.acq_maquette_par_jeton(p_jeton_hache text)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object('objets', m.objets, 'entreprise', p.entreprise, 'expire_le', m.expire_le)
    from ops.maquettes m
    join ops.prospects p on p.id = m.prospect_id
   where m.jeton_hache = p_jeton_hache and m.purgee_le is null and m.expire_le > now()
$$;
revoke all on function public.acq_maquette_par_jeton(text) from public, anon, authenticated;
grant execute on function public.acq_maquette_par_jeton(text) to service_role;
comment on function public.acq_maquette_par_jeton(text) is
  'null si inconnue, expirée ou purgée ; sinon objets, entreprise, expire_le. Aucune écriture (026-061).';
create or replace function public.acq_maquettes_a_purger(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(m.*) order by m.expire_le), '[]'::jsonb)
    from (select * from ops.maquettes where purgee_le is null and expire_le < now() order by expire_le limit greatest(coalesce(p_limite, 1), 0)) m
$$;
revoke all on function public.acq_maquettes_a_purger(integer) from public, anon, authenticated;
grant execute on function public.acq_maquettes_a_purger(integer) to service_role;
comment on function public.acq_maquettes_a_purger(integer) is
  'Les maquettes expirées non purgées, les plus anciennes d''abord (026-061).';
create or replace function public.acq_maquette_purgee(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  update ops.maquettes set purgee_le = now() where id = p_id;
end
$$;
revoke all on function public.acq_maquette_purgee(uuid) from public, anon, authenticated;
grant execute on function public.acq_maquette_purgee(uuid) to service_role;
comment on function public.acq_maquette_purgee(uuid) is
  'Pose purgee_le (026-061).';
create or replace function public.acq_reponse_recue(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id_externe    text := p ->> 'id_externe';
  v_texte         text := coalesce(p ->> 'texte', '');
  v_source        text := p ->> 'source';
  v_conversation  uuid := nullif(p ->> 'conversation_id', '')::uuid;
  v_prospect_id   uuid;
  v_envoi_id      uuid;
  v_ref           text;
  v_dom           text;
  v_classe        text;
  v_accuse        boolean := coalesce((p ->> 'accuse_site')::boolean, false);
  v_id            uuid;
  v_deja          uuid;
begin
  select id into v_deja from ops.reponses where id_externe = v_id_externe;
  if found then
    return jsonb_build_object('id', v_deja, 'nouvelle', false, 'prospect', null);
  end if;
  -- (a) la référence citée dans le texte (« Réf. XXXXXX »)
  v_ref := upper((regexp_match(v_texte, 'R[ée]f\.?\s*:?\s*([A-Z0-9]{6})'))[1]);
  if v_ref is not null then
    select e.id, e.prospect_id into v_envoi_id, v_prospect_id from ops.envois e where e.reference = v_ref;
  end if;
  -- (b) le domaine de l'expéditeur, hors messageries gratuites
  if v_prospect_id is null and coalesce(p ->> 'expediteur', '') like '%@%' then
    v_dom := lower(split_part(p ->> 'expediteur', '@', 2));
    if v_dom <> all (array[
      'gmail.com', 'googlemail.com', 'outlook.fr', 'hotmail.fr', 'live.fr', 'orange.fr', 'wanadoo.fr', 'free.fr',
      'sfr.fr', 'laposte.net', 'yahoo.fr', 'icloud.com'
    ]) then
      select pr.id into v_prospect_id
        from ops.prospects pr
       where pr.domaine = v_dom or lower(btrim(pr.domaine)) = v_dom
       limit 1;
    end if;
  end if;
  -- (c) l'en-tête In-Reply-To (en_reponse_a), égal à l'id_externe d'un de nos envois
  if v_prospect_id is null and v_envoi_id is null and coalesce(p ->> 'en_reponse_a', '') <> '' then
    select e.id, e.prospect_id into v_envoi_id, v_prospect_id from ops.envois e where e.id_externe = p ->> 'en_reponse_a';
  end if;
  if v_prospect_id is null and v_envoi_id is null and v_conversation is not null then
    select c.prospect_id into v_prospect_id from ops.conversations c where c.id = v_conversation;
  end if;
  v_classe := case when v_prospect_id is null and v_envoi_id is null and v_conversation is null then 'hors_fil' else null end;
  insert into ops.reponses (
    id_externe, envoi_id, conversation_id, prospect_id, canal, source, texte, auto, accuse_site,
    en_reponse_a, imap_uid, classe
  ) values (
    v_id_externe, v_envoi_id, v_conversation, v_prospect_id, p ->> 'canal', v_source, left(v_texte, 4000),
    coalesce((p ->> 'auto')::boolean, false), v_accuse,
    nullif(p ->> 'en_reponse_a', ''), nullif(p ->> 'imap_uid', '')::bigint, v_classe
  )
  on conflict (id_externe) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from ops.reponses where id_externe = v_id_externe;
    return jsonb_build_object('id', v_id, 'nouvelle', false, 'prospect', null);
  end if;
  if v_prospect_id is not null and not v_accuse then
    update ops.prospects set dernier_contact_recu = now() where id = v_prospect_id;
  end if;
  return jsonb_build_object(
    'id', v_id, 'nouvelle', true,
    'prospect', (select jsonb_build_object('id', pr.id, 'siren', pr.siren, 'domaine', pr.domaine) from ops.prospects pr where pr.id = v_prospect_id)
  );
end
$$;
revoke all on function public.acq_reponse_recue(jsonb) from public, anon, authenticated;
grant execute on function public.acq_reponse_recue(jsonb) to service_role;
comment on function public.acq_reponse_recue(jsonb) is
  'Idempotente par id_externe (026-061). Rattache dans l''ordre : (a) la référence citée, (b) le domaine (hors messageries gratuites), (c) en_reponse_a ; sinon hors_fil. pose dernier_contact_recu, sauf pour un accusé de site.';
create or replace function public.acq_reponses_a_traiter(p_limite int)
returns jsonb
language sql
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(r.*) order by r.recu_le), '[]'::jsonb)
    from (select * from ops.reponses where classe is null order by recu_le limit greatest(coalesce(p_limite, 1), 0)) r
$$;
revoke all on function public.acq_reponses_a_traiter(integer) from public, anon, authenticated;
grant execute on function public.acq_reponses_a_traiter(integer) to service_role;
comment on function public.acq_reponses_a_traiter(integer) is
  'Les réponses non classées de ops.reponses, et rien d''autre (026-061, OB-6).';
create or replace function public.acq_reponse_classer(p_id uuid, p_classement jsonb)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  update ops.reponses
     set classe = p_classement ->> 'classe',
         classe_par = coalesce(p_classement ->> 'source', 'regle'),
         certitude = nullif(p_classement ->> 'certitude', '')::numeric,
         faq_id = nullif(p_classement ->> 'faq_id', ''),
         rappel_le = nullif(p_classement ->> 'rappel_le', '')::date,
         traitee_le = now(),
         actes_le = case when coalesce(p_classement ->> 'classe', '') = 'accuse_site' then now() else null end
   where id = p_id;
end
$$;
revoke all on function public.acq_reponse_classer(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.acq_reponse_classer(uuid, jsonb) to service_role;
comment on function public.acq_reponse_classer(uuid, jsonb) is
  'Pose classe, classe_par, certitude, faq_id, rappel_le et traitee_le ; actes_le pour un accusé de site seulement (026-061).';
create or replace function public.acq_reponses_a_repondre(p_limite int)
returns jsonb
language sql
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(
    to_jsonb(r.*) || jsonb_build_object('notre_dernier_envoi_le', d.envoye_le, 'notre_dernier_envoi_type', d.type)
    order by r.recu_le), '[]'::jsonb)
    from ops.reponses r
    left join lateral (
      select e.envoye_le, e.type
        from ops.envois e
       where e.statut = 'envoye'
         and ((r.prospect_id is not null and e.prospect_id = r.prospect_id)
           or (r.conversation_id is not null and e.conversation_id = r.conversation_id))
       order by e.envoye_le desc
       limit 1
    ) d on true
   where r.classe is not null
     and r.repondue_le is null
     and r.actes_le is not null
     and r.classe in ('question', 'prix', 'appel', 'stop', 'rgpd', 'rgpd_acces', 'rgpd_effacement', 'entrant')
   limit greatest(coalesce(p_limite, 1), 0)
$$;
revoke all on function public.acq_reponses_a_repondre(integer) from public, anon, authenticated;
grant execute on function public.acq_reponses_a_repondre(integer) to service_role;
comment on function public.acq_reponses_a_repondre(integer) is
  'Classées, repondue_le nul, actes_le posé, classe parmi question/prix/appel/stop/rgpd/rgpd_acces/rgpd_effacement/entrant ; chaque ligne porte notre_dernier_envoi_le et notre_dernier_envoi_type (026-061).';
create or replace function public.acq_reponse_repondue(p_id uuid, p_envoi uuid)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  update ops.reponses set repondue_le = now() where id = p_id;
end
$$;
revoke all on function public.acq_reponse_repondue(uuid, uuid) from public, anon, authenticated;
grant execute on function public.acq_reponse_repondue(uuid, uuid) to service_role;
comment on function public.acq_reponse_repondue(uuid, uuid) is
  'Pose repondue_le (026-061).';
create or replace function public.acq_reponse_reclasser(p_decision uuid, p_par text)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_d            record;
  v_reponse_id   uuid;
  v_classe       text;
begin
  select id, statut, creee_par, cle_idempotence, choix into v_d from ops.decisions where id = p_decision;
  if not found or v_d.statut <> 'tranchee' or v_d.creee_par <> 'standardiste' or v_d.cle_idempotence not like 'acq:reponse:%' then
    return null;
  end if;
  v_reponse_id := split_part(v_d.cle_idempotence, ':', 3)::uuid;
  v_classe := case when v_d.choix = 'ignorer' then 'ignoree' else v_d.choix end;
  if exists (select 1 from ops.reponses where id = v_reponse_id and reclassee_par_decision = p_decision) then
    return (select jsonb_build_object('reponse_id', r.id, 'classe', r.classe, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id)
              from ops.reponses r where r.id = v_reponse_id);
  end if;
  update ops.reponses
     set classe = v_classe,
         classe_par = p_par,
         certitude = 1,
         traitee_le = now(),
         actes_le = null,
         reclassee_par_decision = p_decision,
         repondue_le = case when v_classe in ('ignoree', 'rgpd_autre') then now() else null end
   where id = v_reponse_id;
  if not found then
    return null;
  end if;
  return (select jsonb_build_object('reponse_id', r.id, 'classe', r.classe, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id)
            from ops.reponses r where r.id = v_reponse_id);
end
$$;
revoke all on function public.acq_reponse_reclasser(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_reponse_reclasser(uuid, text) to service_role;
comment on function public.acq_reponse_reclasser(uuid, text) is
  'Lit une décision tranchee, creee_par standardiste, de clé acq:reponse:<uuid>:… (sinon null) ; pose la classe choisie (ignorer → ignoree), classe_par, certitude=1, actes_le=null, reclassee_par_decision ; idempotente (026-061, revue du 25/09).';
create or replace function public.acq_reponses_reclassees(p_limite int)
returns jsonb
language sql
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb)
    from (
      select jsonb_build_object('id', r.id, 'prospect_id', r.prospect_id, 'conversation_id', r.conversation_id, 'classe', r.classe) as x
        from ops.reponses r
       where r.classe_par = 'benj' and r.actes_le is null
       order by r.traitee_le
       limit greatest(coalesce(p_limite, 1), 0)
    ) s
$$;
revoke all on function public.acq_reponses_reclassees(integer) from public, anon, authenticated;
grant execute on function public.acq_reponses_reclassees(integer) to service_role;
comment on function public.acq_reponses_reclassees(integer) is
  'Les réponses classe_par = benj dont actes_le est nul, que le Standard traite à son passage suivant (026-061).';
create or replace function public.acq_reponse_actes_faits(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  update ops.reponses set actes_le = now() where id = p_id;
end
$$;
revoke all on function public.acq_reponse_actes_faits(uuid) from public, anon, authenticated;
grant execute on function public.acq_reponse_actes_faits(uuid) to service_role;
comment on function public.acq_reponse_actes_faits(uuid) is
  'Pose actes_le = now() (026-061).';
create or replace function public.acq_reponse_appel_rendu(p_reponse uuid)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n int;
begin
  update ops.reponses set appel_rendu_le = now()
   where id = p_reponse and classe = 'appel' and appel_rendu_le is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform public.ops_evenement_ajouter('systeme', 'appel_rendu', 'reponse:' || p_reponse::text, 'appel rendu', null);
    return true;
  end if;
  return false;
end
$$;
revoke all on function public.acq_reponse_appel_rendu(uuid) from public, anon, authenticated;
grant execute on function public.acq_reponse_appel_rendu(uuid) to service_role;
comment on function public.acq_reponse_appel_rendu(uuid) is
  'Pose appel_rendu_le sur une réponse classe=appel non rendue, sinon false sans écrire ; un événement appel_rendu de systeme (026-061, revue du 24/09 B5).';
create or replace function public.acq_conversation_enregistrer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into ops.conversations (plateforme, meta_id, pseudo, suit_le_compte, abonnes, commentaire_id, commentaire_le, dernier_message_recu_le, prospect_id)
  values (
    p ->> 'plateforme', p ->> 'meta_id', nullif(p ->> 'pseudo', ''), (p ->> 'suit_le_compte')::boolean, nullif(p ->> 'abonnes', '')::int,
    nullif(p ->> 'commentaire_id', ''), nullif(p ->> 'commentaire_le', '')::timestamptz, nullif(p ->> 'dernier_message_recu_le', '')::timestamptz,
    nullif(p ->> 'prospect_id', '')::uuid
  )
  on conflict (plateforme, meta_id) do update
     set pseudo = coalesce(excluded.pseudo, ops.conversations.pseudo),
         suit_le_compte = coalesce(excluded.suit_le_compte, ops.conversations.suit_le_compte),
         abonnes = coalesce(excluded.abonnes, ops.conversations.abonnes),
         commentaire_id = coalesce(excluded.commentaire_id, ops.conversations.commentaire_id),
         commentaire_le = greatest(coalesce(excluded.commentaire_le, ops.conversations.commentaire_le), coalesce(ops.conversations.commentaire_le, excluded.commentaire_le)),
         dernier_message_recu_le = greatest(coalesce(excluded.dernier_message_recu_le, ops.conversations.dernier_message_recu_le), coalesce(ops.conversations.dernier_message_recu_le, excluded.dernier_message_recu_le)),
         prospect_id = coalesce(ops.conversations.prospect_id, excluded.prospect_id)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end
$$;
revoke all on function public.acq_conversation_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_conversation_enregistrer(jsonb) to service_role;
comment on function public.acq_conversation_enregistrer(jsonb) is
  'Insertion ou mise à jour par (plateforme, meta_id) (026-061).';
create or replace function public.acq_conversation(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select to_jsonb(c.*) from ops.conversations c where c.id = p_id
$$;
revoke all on function public.acq_conversation(uuid) from public, anon, authenticated;
grant execute on function public.acq_conversation(uuid) to service_role;
comment on function public.acq_conversation(uuid) is
  'Une conversation par id (026-061).';
create or replace function public.acq_meta_evenement_enregistrer(p jsonb)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n int;
begin
  insert into ops.meta_evenements (id_externe, plateforme, type, charge)
  values (p ->> 'id_externe', p ->> 'plateforme', coalesce(p ->> 'type', 'autre'), coalesce(p -> 'charge', '{}'::jsonb))
  on conflict (id_externe) do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end
$$;
revoke all on function public.acq_meta_evenement_enregistrer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_meta_evenement_enregistrer(jsonb) to service_role;
comment on function public.acq_meta_evenement_enregistrer(jsonb) is
  'Idempotente par id_externe : true si nouvelle (026-061).';
create or replace function public.acq_meta_evenements_a_traiter(p_limite int)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(m.*) order by m.recu_le), '[]'::jsonb)
    from (select * from ops.meta_evenements where traite_le is null order by recu_le limit greatest(coalesce(p_limite, 1), 0)) m
$$;
revoke all on function public.acq_meta_evenements_a_traiter(integer) from public, anon, authenticated;
grant execute on function public.acq_meta_evenements_a_traiter(integer) to service_role;
comment on function public.acq_meta_evenements_a_traiter(integer) is
  'Les événements du webhook Meta non traités (026-061).';
create or replace function public.acq_meta_evenement_traite(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  update ops.meta_evenements set traite_le = now() where id = p_id;
end
$$;
revoke all on function public.acq_meta_evenement_traite(bigint) from public, anon, authenticated;
grant execute on function public.acq_meta_evenement_traite(bigint) to service_role;
comment on function public.acq_meta_evenement_traite(bigint) is
  'Pose traite_le (026-061).';
create or replace function public.acq_rdv_lien_creer(p_prospect uuid, p_jeton_hache text, p_expire_le timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_jeton_hache !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'raison', 'jeton');
  end if;
  if p_expire_le is null or p_expire_le > now() + interval '21 days' then
    return jsonb_build_object('ok', false, 'raison', 'expire_le');
  end if;
  insert into ops.rendez_vous (prospect_id, jeton_hache, expire_le, statut)
  values (p_prospect, p_jeton_hache, p_expire_le, 'propose')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;
revoke all on function public.acq_rdv_lien_creer(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_rdv_lien_creer(uuid, text, timestamptz) to service_role;
comment on function public.acq_rdv_lien_creer(uuid, text, timestamptz) is
  'Crée le lien de rendez-vous d''un prospect, 21 jours au plus, jeton 64 hex (026-061).';
create or replace function public.acq_rdv_par_jeton(p_jeton_hache text)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object('metier', p.metier, 'commune', p.commune, 'statut', r.statut, 'creneau', r.creneau, 'expire_le', r.expire_le)
    from ops.rendez_vous r
    join ops.prospects p on p.id = r.prospect_id
   where r.jeton_hache = p_jeton_hache and r.expire_le > now()
$$;
revoke all on function public.acq_rdv_par_jeton(text) from public, anon, authenticated;
grant execute on function public.acq_rdv_par_jeton(text) to service_role;
comment on function public.acq_rdv_par_jeton(text) is
  'null si inconnu ou expiré ; sinon metier, commune, statut, creneau, expire_le, JAMAIS le téléphone. Aucune écriture (026-061).';
create or replace function public.acq_rdv_creneaux_pris(p_depuis timestamptz, p_jusqua timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select coalesce(jsonb_agg(r.creneau order by r.creneau), '[]'::jsonb)
    from ops.rendez_vous r
   where r.statut = 'reserve' and r.creneau >= p_depuis and r.creneau < p_jusqua
$$;
revoke all on function public.acq_rdv_creneaux_pris(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.acq_rdv_creneaux_pris(timestamptz, timestamptz) to service_role;
comment on function public.acq_rdv_creneaux_pris(timestamptz, timestamptz) is
  'Les créneaux réservés dans la plage, des instants seulement (026-061).';
create or replace function public.acq_rdv_reserver(p_jeton_hache text, p_creneau timestamptz, p_telephone text)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id         uuid;
  v_statut     text;
  v_expire_le  timestamptz;
begin
  select id, statut, expire_le into v_id, v_statut, v_expire_le
    from ops.rendez_vous where jeton_hache = p_jeton_hache for update;
  if not found or v_expire_le <= now() then
    return jsonb_build_object('ok', false, 'raison', 'expire');
  end if;
  if v_statut <> 'propose' then
    return jsonb_build_object('ok', false, 'raison', 'deja');
  end if;
  if p_creneau is null or p_telephone !~ '^\+?[0-9]{10,15}$' then
    return jsonb_build_object('ok', false, 'raison', 'hors_plage');
  end if;
  begin
    update ops.rendez_vous
       set statut = 'reserve', creneau = p_creneau, telephone = p_telephone, reserve_le = now()
     where id = v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'raison', 'pris');
  end;
  perform public.ops_evenement_ajouter('systeme', 'rdv_reserve', 'rendez_vous:' || v_id::text, 'rendez-vous réservé', null);
  return jsonb_build_object('ok', true, 'id', v_id);
end
$$;
revoke all on function public.acq_rdv_reserver(text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.acq_rdv_reserver(text, timestamptz, text) to service_role;
comment on function public.acq_rdv_reserver(text, timestamptz, text) is
  'expire | deja | pris | hors_plage sans lever ; sinon reserve, un événement rdv_reserve sans donnée personnelle (026-061).';
create or replace function public.acq_rdv_appel_rendu(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n int;
begin
  update ops.rendez_vous set appel_rendu_le = now(), statut = 'fait'
   where id = p_id and statut = 'reserve' and appel_rendu_le is null;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform public.ops_evenement_ajouter('systeme', 'appel_rendu', 'rendez_vous:' || p_id::text, 'appel rendu', null);
    return true;
  end if;
  return false;
end
$$;
revoke all on function public.acq_rdv_appel_rendu(uuid) from public, anon, authenticated;
grant execute on function public.acq_rdv_appel_rendu(uuid) to service_role;
comment on function public.acq_rdv_appel_rendu(uuid) is
  'Pose appel_rendu_le et statut=fait sur une réservation non rendue, sinon false ; un événement appel_rendu (026-061).';
create or replace function public.acq_entrant_email_ajouter(p_conversation uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_prospect_id  uuid;
  v_source       text;
  v_canaux       jsonb;
  v_email        text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return false;
  end if;
  select p.id, p.source, p.canaux into v_prospect_id, v_source, v_canaux
    from ops.prospects p
    join ops.conversations c on c.prospect_id = p.id
   where c.id = p_conversation
     for update of p;
  if not found or v_source <> 'entrant' then
    return false;
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(v_canaux, '[]'::jsonb)) x where x ->> 'canal' = 'email' and lower(x ->> 'valeur') = v_email) then
    return false;
  end if;
  update ops.prospects
     set canaux = coalesce(canaux, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('canal', 'email', 'valeur', v_email, 'nature', 'donnee_par_la_personne')),
         maj_le = now()
   where id = v_prospect_id;
  return true;
end
$$;
revoke all on function public.acq_entrant_email_ajouter(uuid, text) from public, anon, authenticated;
grant execute on function public.acq_entrant_email_ajouter(uuid, text) to service_role;
comment on function public.acq_entrant_email_ajouter(uuid, text) is
  'Ajoute au prospect entrant de cette conversation le canal email donné par la personne, s''il ne l''a pas déjà ; false sans écrire pour un froid, une conversation sans prospect ou une adresse invalide (026-061, revue du 25/09).';
create or replace function public.acq_prospect_export(p_prospect uuid)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object(
    'entreprise', p.entreprise, 'siren', p.siren, 'commune', p.commune, 'metier', p.metier,
    'faits', p.faits, 'canaux', p.canaux,
    'collecte_le', p.cree_le, 'dernier_contact_recu_le', p.dernier_contact_recu,
    'messages_echanges', (select count(*) from ops.envois e where e.prospect_id = p.id and e.statut = 'envoye')
                        + (select count(*) from ops.reponses r where r.prospect_id = p.id)
  )
  from ops.prospects p where p.id = p_prospect
$$;
revoke all on function public.acq_prospect_export(uuid) from public, anon, authenticated;
grant execute on function public.acq_prospect_export(uuid) to service_role;
comment on function public.acq_prospect_export(uuid) is
  'Ce que la base garde (026-061) : entreprise, SIREN, commune, métier, faits et canaux, dates, nombre de messages. Ni jeton ni verdict ni texte.';
create or replace function public.acq_effacement_demander(p_prospect uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_p       record;
  v_resultat timestamptz;
begin
  select siren, domaine, instagram, page_meta, effacement_demande_le into v_p from ops.prospects where id = p_prospect for update;
  if not found then
    return null;
  end if;
  if v_p.effacement_demande_le is null then
    update ops.prospects set effacement_demande_le = now(), maj_le = now() where id = p_prospect;
    perform public.acq_opposer(
      jsonb_build_object('siren', v_p.siren, 'domaine', v_p.domaine, 'instagram', v_p.instagram, 'page_meta', v_p.page_meta),
      'demande d''effacement (RGPD)', 'rgpd_effacement', null
    );
  end if;
  select effacement_demande_le + interval '7 days' into v_resultat from ops.prospects where id = p_prospect;
  return v_resultat;
end
$$;
revoke all on function public.acq_effacement_demander(uuid) from public, anon, authenticated;
grant execute on function public.acq_effacement_demander(uuid) to service_role;
comment on function public.acq_effacement_demander(uuid) is
  'Pose effacement_demande_le une fois, et une opposition définitive sur chaque clé du prospect ; rend l''échéance d''effacement (7 jours, 026-061, revue du 25/09).';
create or replace function public.acq_echanges_purger()
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_meta       int;
  v_tel        int;
  v_prospects  int;
begin
  delete from ops.meta_evenements where traite_le is not null and traite_le < now() - interval '30 days';
  get diagnostics v_meta = row_count;
  update ops.rendez_vous set telephone = null where telephone is not null and creneau < now() - interval '90 days';
  get diagnostics v_tel = row_count;
  with a_effacer as (
    select id from ops.prospects where effacement_demande_le is not null and effacement_demande_le < now() - interval '7 days'
  )
  delete from ops.prospects p using a_effacer a where p.id = a.id;
  get diagnostics v_prospects = row_count;
  return jsonb_build_object('meta_evenements_effaces', v_meta, 'telephones_effaces', v_tel, 'prospects_effaces', v_prospects);
end
$$;
revoke all on function public.acq_echanges_purger() from public, anon, authenticated;
grant execute on function public.acq_echanges_purger() to service_role;
comment on function public.acq_echanges_purger() is
  'Efface les meta_evenements traités depuis plus de 30 jours, le téléphone des rendez-vous 90 jours après leur créneau, et les prospects dont effacement_demande_le a plus de 7 jours, avec leurs réponses, maquettes et rendez-vous (cascade) ; l''opposition reste (026-061). Planifiée chaque nuit par 0109 (026-136).';
create or replace function public.acq_preuves_a_garder(p_envois uuid[])
returns uuid[]
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_out uuid[];
begin
  if cardinality(coalesce(p_envois, '{}'::uuid[])) > 500 then
    raise exception using message = 'ops:borne', errcode = 'P0001';
  end if;
  select coalesce(array_agg(e.id), '{}'::uuid[]) into v_out
    from ops.envois e
    join ops.prospects p on p.id = e.prospect_id
   where e.id = any(p_envois)
     and p.effacement_demande_le is null
     and coalesce((select max(r.recu_le) from ops.reponses r where r.prospect_id = p.id), e.prepare_le) > now() - interval '3 years';
  return v_out;
end
$$;
revoke all on function public.acq_preuves_a_garder(uuid[]) from public, anon, authenticated;
grant execute on function public.acq_preuves_a_garder(uuid[]) to service_role;
comment on function public.acq_preuves_a_garder(uuid[]) is
  'stable, 500 ids au plus (sinon ops:borne, contre-revue du 25/09 au soir, I4) : parmi les ids reçus, ceux dont l''envoi existe, le prospect n''a pas d''effacement_demande_le, et dont le dernier contact VENU DU PROSPECT date de moins de 3 ans. Aucune écriture.';
create or replace function public.acq_decision_creer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_agent        text := p ->> 'agent';
  v_cle          text := nullif(p ->> 'cle_idempotence', '');
  v_options      jsonb := p -> 'options';
  v_defaut       text := nullif(p ->> 'defaut', '');
  v_n            int;
  v_valides      int;
  v_reco         int;
  v_distinctes   int;
  v_id           uuid;
begin
  if v_options is null or jsonb_typeof(v_options) <> 'array' or jsonb_array_length(v_options) not between 2 and 7 then
    return jsonb_build_object('ok', false, 'raison', 'options');
  end if;
  select count(*)::int,
         count(*) filter (where coalesce(
           jsonb_typeof(o.value) = 'object'
           and jsonb_typeof(o.value -> 'cle') = 'string'
           and (o.value ->> 'cle') ~ '^[a-z_]{2,30}$'
           and jsonb_typeof(o.value -> 'libelle') = 'string'
           and char_length(o.value ->> 'libelle') between 1 and 80
           and jsonb_typeof(o.value -> 'recommandee') = 'boolean', false))::int,
         count(*) filter (where o.value -> 'recommandee' = 'true'::jsonb)::int,
         count(distinct o.value ->> 'cle')::int
    into v_n, v_valides, v_reco, v_distinctes
    from jsonb_array_elements(v_options) o;
  if v_n < 2 or v_n > 7 or v_valides <> v_n or v_reco > 1 or v_distinctes <> v_n then
    return jsonb_build_object('ok', false, 'raison', 'options');
  end if;
  if v_defaut is null then
    select o.value ->> 'cle' into v_defaut from jsonb_array_elements(v_options) o limit 1;
  end if;
  if not exists (select 1 from jsonb_array_elements(v_options) o where o.value ->> 'cle' = v_defaut) then
    return jsonb_build_object('ok', false, 'raison', 'options');
  end if;
  if v_cle is not null then
    select id into v_id from ops.decisions where cle_idempotence = v_cle;
    if found then
      return jsonb_build_object('ok', true, 'id', v_id, 'cree', false);
    end if;
  end if;
  insert into ops.decisions (cle_idempotence, question, contexte, options, option_defaut, montant_cents, portee, echeance, creee_par, tache_id)
  values (
    v_cle, left(coalesce(nullif(p ->> 'resume', ''), 'Décision acquisition'), 300), nullif(p ->> 'extrait', ''), v_options, v_defaut,
    null, 'aucune', coalesce(nullif(p ->> 'echeance', '')::timestamptz, now() + interval '30 days'), v_agent, nullif(p ->> 'tache_id', '')::uuid
  )
  on conflict (cle_idempotence) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from ops.decisions where cle_idempotence = v_cle;
    return jsonb_build_object('ok', true, 'id', v_id, 'cree', false);
  end if;
  perform public.ops_evenement_ajouter(v_agent, 'decision_creee', 'decision:' || v_id::text, left('décision acquisition ouverte : ' || coalesce(p ->> 'resume', ''), 200), null);
  return jsonb_build_object('ok', true, 'id', v_id, 'cree', true);
end
$$;
revoke all on function public.acq_decision_creer(jsonb) from public, anon, authenticated;
grant execute on function public.acq_decision_creer(jsonb) to service_role;
comment on function public.acq_decision_creer(jsonb) is
  'Insère dans ops.decisions (026-061) : creee_par = agent, cle_idempotence (doublon → la décision existante), 2 à 7 options {cle, libelle, recommandee}, une seule recommandée au plus, défaut parmi les clés. Hors de ces bornes : { ok: false, raison: options }.';
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maquettes', 'maquettes', false, 3145728, array['image/jpeg', 'video/mp4'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'video/mp4'];

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
with attendues(signature) as (
  values ('public.acq_plafond_du_jour(text, text)'),
         ('public.acq_envois_du_jour(text, text)'),
         ('public.acq_historique_contacts(uuid)'),
         ('public.acq_prospects_pour_premier_contact(text, integer)'),
         ('public.acq_prospects_pour_relance(integer)'),
         ('public.acq_prospects_pour_maquette(integer, boolean)'),
         ('public.acq_prospects_oui(integer)'),
         ('public.acq_envois_perimer()'),
         ('public.acq_envoi_preparer(jsonb)'),
         ('public.acq_envois_a_approuver(integer)'),
         ('public.acq_envoi_approuver(uuid, jsonb)'),
         ('public.acq_envoi_annuler(uuid, text)'),
         ('public.acq_envois_approuves(text, integer)'),
         ('public.acq_envoi_envoye(uuid, jsonb)'),
         ('public.acq_formulaires_a_porter(integer, integer)'),
         ('public.acq_formulaire_echec(uuid, text, boolean)'),
         ('public.acq_envoi_echec(uuid, text)'),
         ('public.acq_maquette_de(uuid)'),
         ('public.acq_maquettes_du_jour()'),
         ('public.acq_maquette_prete(uuid, jsonb)'),
         ('public.acq_maquette_lien_creer(uuid, text, text, timestamptz)'),
         ('public.acq_maquette_par_jeton(text)'),
         ('public.acq_maquettes_a_purger(integer)'),
         ('public.acq_maquette_purgee(uuid)'),
         ('public.acq_reponse_recue(jsonb)'),
         ('public.acq_reponses_a_traiter(integer)'),
         ('public.acq_reponse_classer(uuid, jsonb)'),
         ('public.acq_reponses_a_repondre(integer)'),
         ('public.acq_reponse_repondue(uuid, uuid)'),
         ('public.acq_reponse_reclasser(uuid, text)'),
         ('public.acq_reponses_reclassees(integer)'),
         ('public.acq_reponse_actes_faits(uuid)'),
         ('public.acq_reponse_appel_rendu(uuid)'),
         ('public.acq_conversation_enregistrer(jsonb)'),
         ('public.acq_conversation(uuid)'),
         ('public.acq_meta_evenement_enregistrer(jsonb)'),
         ('public.acq_meta_evenements_a_traiter(integer)'),
         ('public.acq_meta_evenement_traite(bigint)'),
         ('public.acq_rdv_lien_creer(uuid, text, timestamptz)'),
         ('public.acq_rdv_par_jeton(text)'),
         ('public.acq_rdv_creneaux_pris(timestamptz, timestamptz)'),
         ('public.acq_rdv_reserver(text, timestamptz, text)'),
         ('public.acq_rdv_appel_rendu(uuid)'),
         ('public.acq_entrant_email_ajouter(uuid, text)'),
         ('public.acq_prospect_export(uuid)'),
         ('public.acq_effacement_demander(uuid)'),
         ('public.acq_echanges_purger()'),
         ('public.acq_preuves_a_garder(uuid[])'),
         ('public.acq_decision_creer(jsonb)')
), lues as (
  select a.signature, to_regprocedure(a.signature) as fonction from attendues a
)
select l.signature || ' : existe, security definer, search_path, exécutable par service_role seul (attendu : oui)' as quoi,
       case when l.fonction is not null
             and coalesce(p.prosecdef, false)
             and 'search_path=ops, public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
             and not has_function_privilege('anon', l.fonction, 'execute')
             and not has_function_privilege('authenticated', l.fonction, 'execute')
             and has_function_privilege('service_role', l.fonction, 'execute')
            then 'oui' else 'NON (anormal)' end as resultat
  from lues l
  left join pg_proc p on p.oid = l.fonction
union all
select 'les 49 fonctions présentes, une seule version de chacune (attendu : oui)',
       case when (select count(*) from lues where fonction is not null) = 49
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname in (select split_part(split_part(signature, '(', 1), '.', 2) from attendues)
                              group by p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end
union all
select 'aucune fonction public.acq_* exécutable par anon ni authenticated (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'acq\_%'
                                and (has_function_privilege('anon', p.oid, 'execute')
                                     or has_function_privilege('authenticated', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.garde_fenetre_meta existe, sans aucun droit d''exécution, déclencheur actif sur ops.envois (attendu : oui)',
       case when to_regprocedure('ops.garde_fenetre_meta()') is not null
             and not has_function_privilege('anon', to_regprocedure('ops.garde_fenetre_meta()'), 'execute')
             and not has_function_privilege('authenticated', to_regprocedure('ops.garde_fenetre_meta()'), 'execute')
             and not has_function_privilege('service_role', to_regprocedure('ops.garde_fenetre_meta()'), 'execute')
             and exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
                          where n.nspname = 'ops' and c.relname = 'envois' and t.tgname = 'garde_fenetre_meta' and t.tgenabled in ('O', 'A'))
            then 'oui' else 'NON (anormal)' end
union all
select 'les quatre tables neuves existent, fermées (RLS, aucun droit) (attendu : oui)',
       case when (select count(*) from (values ('ops.conversations'), ('ops.meta_evenements'), ('ops.reponses'), ('ops.rendez_vous')) t(n)
                   where to_regclass(t.n) is not null
                     and (select relrowsecurity from pg_class where oid = to_regclass(t.n)) = true
                     and not has_table_privilege('anon', t.n, 'select')
                     and not has_table_privilege('authenticated', t.n, 'select')
                     and not has_table_privilege('service_role', t.n, 'select')) = 4
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.envois porte les colonnes des échanges (attendu : oui)',
       case when (select count(*) from information_schema.columns
                   where table_schema = 'ops' and table_name = 'envois'
                     and column_name in ('objet', 'texte', 'variante', 'modele_id', 'fait_id', 'douleur_id', 'fil_envoi_id',
                                          'conversation_id', 'tentatives_envoi', 'derniere_erreur', 'preuve', 'preuve_demande',
                                          'reference', 'technologie', 'bail_porteur_jusqua', 'commentaire_id')) = 16
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.envois.reference : unique, contrainte ^[A-Z0-9]{6}$ (attendu : oui)',
       case when exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'envois' and c.contype = 'u'
                            and exists (select 1 from unnest(c.conkey) k join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k where a.attname = 'reference'))
             and exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'envois' and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%reference%[A-Z0-9]%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.maquettes porte empreintes, prete_le, objets (attendu : oui)',
       case when (select count(*) from information_schema.columns
                   where table_schema = 'ops' and table_name = 'maquettes' and column_name in ('empreintes', 'prete_le', 'objets')) = 3
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.reponses.source limité à courriel/meta/formulaire/essai (attendu : oui)',
       case when exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
                          where n.nspname = 'ops' and t.relname = 'reponses' and c.contype = 'c'
                            and pg_get_constraintdef(c.oid) ilike '%source%courriel%meta%formulaire%essai%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.rendez_vous : index unique partiel sur creneau, réservé (attendu : oui)',
       case when exists (select 1 from pg_indexes where schemaname = 'ops' and tablename = 'rendez_vous' and indexdef ilike '%unique%(creneau)%where%reserve%')
            then 'oui' else 'NON (anormal)' end
union all
select 'ops.prospects.effacement_demande_le existe (attendu : oui)',
       case when exists (select 1 from information_schema.columns
                          where table_schema = 'ops' and table_name = 'prospects' and column_name = 'effacement_demande_le')
            then 'oui' else 'NON (anormal)' end
union all
select 'bucket maquettes : privé, 3145728 octets, image/jpeg et video/mp4, aucune politique (attendu : oui)',
       case when exists (select 1 from storage.buckets where id = 'maquettes' and public = false and file_size_limit = 3145728
                            and allowed_mime_types = array['image/jpeg', 'video/mp4'])
             and not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and qual ilike '%maquettes%')
            then 'oui' else 'NON (anormal)' end
union all
-- Le test « public.courriers n'existe pas » a été retiré le 2026-09-28 (contre-vérification
-- 026-061, .orchestre/preuves/026-061/contre-verif-28-09.md) : la table public.courriers existe
-- en production depuis une migration antérieure à 0106, que 0106 ne crée ni ne modifie (aucune
-- ligne de 0106_acquisition_echanges.sql ne cite « courriers ») — un contrôle en base ne peut pas
-- constater cette absence de mention dans le fichier ; seule la lecture du fichier le peut, et elle
-- a été faite. Le test ne porte donc plus que sur les trois fonctions que 0106 promet de ne pas créer.
select 'ni acq_reponse_relayer, ni acq_envoi_marquer, ni acq_oppositions_depuis (attendu : oui)',
       case when to_regprocedure('public.acq_reponse_relayer(jsonb)') is null
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('acq_reponse_relayer', 'acq_envoi_marquer', 'acq_oppositions_depuis'))
            then 'oui' else 'NON (anormal)' end;
