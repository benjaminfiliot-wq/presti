-- ============================================================================================
-- 0100 · La file durable de l'argent (Supabase Queues / pgmq) : ops.argent_messages et les cinq
--        fonctions ops_argent_* — envoi une seule fois par clé, lecture sous délai d'invisibilité
--        borné, abandon après 3 lectures avec événement, effet marqué une seule fois
--        (fiche 026-036, série 026 ; recherche du 24/09,
--         SaaS/Produit/Ecosysteme-Recherche-Agents-2026-09-24.md R8)
--
-- Pourquoi pgmq plutôt qu'une file maison (R8) : il livre un message exactement une fois dans sa
-- fenêtre d'invisibilité, archive ce qu'il a traité, et vit déjà dans Postgres. Chaque étape d'une
-- commande devient un message, avec l'identifiant de la commande pour clé d'idempotence (026-046).
--
-- La limite de l'« exactement une fois », jusqu'où : pgmq garantit une LIVRAISON, pas un EFFET. Un
-- effet externe (un e-mail, un appel à une API) peut encore se produire deux fois si le processus
-- meurt entre l'effet et sa marque. ops.argent_messages porte donc la clé et la marque fait_le ; un
-- gestionnaire idempotent consulte la marque avant d'agir (fiche 13 = 026-046). Les effets de ce
-- premier gestionnaire restent dans la base, où ils sont idempotents par construction.
--
-- Ne JAMAIS activer « Expose Queues via PostgREST » (schéma pgmq_public) : on passe par les cinq
-- fonctions public.ops_argent_*, security definer, exécutables par service_role seul, sur le
-- modèle de 0097 (search_path = ops, pgmq, public, pg_temp, pg_temp en dernier).
--
-- Ce que ce fichier pose, dans cet ordre : l'extension pgmq (sans effet si déjà activée par le
-- tableau de bord Queues) ; la file « argent », créée seulement si pgmq.list_queues() ne la
-- contient pas encore ; la table ops.argent_messages, fermée comme en 0096 (RLS sans politique,
-- aucun droit) ; le schéma pgmq fermé à anon et authenticated ; les cinq fonctions, leurs revoke et
-- leurs grant à service_role seul. Rejouable sans dommage (if not exists, or replace).
--
-- Erreurs métier : `raise exception using message = 'ops:<code>', errcode = 'P0001'`.
-- Codes : type_argent (type hors commande_payee/essai_e2e), vt (délai d'invisibilité hors 5-3600 s).
-- ============================================================================================

create extension if not exists pgmq;

-- ── La file, créée seulement si elle n'existe pas encore ──────────────────────────────────────
do $$
begin
  if not exists (select 1 from pgmq.list_queues() where queue_name = 'argent') then
    perform pgmq.create('argent');
  end if;
end
$$;

-- ── La table, fermée comme en 0096 ─────────────────────────────────────────────────────────────
create table if not exists ops.argent_messages (
  cle           text primary key check (char_length(cle) between 3 and 200),
  type          text not null check (type in ('commande_payee', 'essai_e2e')),
  msg_id        bigint,
  charge        jsonb not null default '{}' check (pg_column_size(charge) <= 4096),
  envoye_le     timestamptz not null default now(),
  lectures      int not null default 0,
  fait_le       timestamptz,
  resultat      jsonb,
  abandonne_le  timestamptz
);
alter table ops.argent_messages enable row level security;
revoke all on table ops.argent_messages from public, anon, authenticated, service_role;
comment on table ops.argent_messages is
  'File durable de l''argent (026-036) : une ligne par clé d''idempotence, msg_id de pgmq, fait_le et resultat posés une seule fois, abandonne_le après 3 lectures sans effet.';

-- ── Le schéma pgmq, fermé à anon et authenticated : on passe par nos fonctions ─────────────────
revoke all on schema pgmq from anon, authenticated;

-- ── Envoyer : une fois par clé ──────────────────────────────────────────────────────────────────
create or replace function public.ops_argent_envoyer(p_type text, p_cle text, p_charge jsonb, p_delai_s integer)
returns bigint
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $$
declare
  v_msg_id bigint;
begin
  if p_type is null or p_type not in ('commande_payee', 'essai_e2e') then
    raise exception using message = 'ops:type_argent', errcode = 'P0001';
  end if;
  insert into ops.argent_messages (cle, type, charge)
  values (p_cle, p_type, coalesce(p_charge, '{}'::jsonb))
  on conflict (cle) do nothing;
  if not found then
    return null;
  end if;
  v_msg_id := pgmq.send('argent', jsonb_build_object('type', p_type, 'cle', p_cle, 'charge', coalesce(p_charge, '{}'::jsonb)), greatest(coalesce(p_delai_s, 0), 0));
  update ops.argent_messages set msg_id = v_msg_id where cle = p_cle;
  return v_msg_id;
end
$$;
revoke all on function public.ops_argent_envoyer(text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.ops_argent_envoyer(text, text, jsonb, integer) to service_role;
comment on function public.ops_argent_envoyer(text, text, jsonb, integer) is
  'Envoie un message dans la file argent, une seule fois par clé (026-036). Type hors commande_payee/essai_e2e : ops:type_argent. Clé déjà connue : rend null, n''envoie rien.';

-- ── Lire : sous délai d'invisibilité borné, abandon après 3 lectures ────────────────────────────
create or replace function public.ops_argent_lire(p_vt_s integer, p_n integer)
returns table(msg_id bigint, lectures integer, type text, cle text, charge jsonb, mis_le timestamptz)
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $$
declare
  v_n integer;
  m record;
  v_cle text;
  v_type text;
  v_charge jsonb;
  v_deja_fait boolean;
begin
  if p_vt_s is null or p_vt_s not between 5 and 3600 then
    raise exception using message = 'ops:vt', errcode = 'P0001';
  end if;
  v_n := least(greatest(coalesce(p_n, 1), 1), 10);
  for m in select * from pgmq.read('argent', p_vt_s, v_n) loop
    v_cle := m.message ->> 'cle';
    v_type := m.message ->> 'type';
    v_charge := coalesce(m.message -> 'charge', '{}'::jsonb);
    select (a.fait_le is not null) into v_deja_fait from ops.argent_messages a where a.cle = v_cle;
    if coalesce(v_deja_fait, false) then
      perform pgmq.delete('argent', m.msg_id);
      continue;
    end if;
    if m.read_ct > 3 then
      perform pgmq.archive('argent', m.msg_id);
      update ops.argent_messages set abandonne_le = now() where ops.argent_messages.cle = v_cle;
      insert into ops.evenements (agent, type, objet, resume)
      values ('systeme', 'argent_abandonne', 'argent:' || v_cle, left('message abandonné après ' || m.read_ct || ' lecture(s) : ' || v_cle, 200));
      continue;
    end if;
    update ops.argent_messages set lectures = m.read_ct::integer where ops.argent_messages.cle = v_cle;
    msg_id := m.msg_id;
    lectures := m.read_ct::integer;
    type := v_type;
    cle := v_cle;
    charge := v_charge;
    mis_le := m.enqueued_at;
    return next;
  end loop;
  return;
end
$$;
revoke all on function public.ops_argent_lire(integer, integer) from public, anon, authenticated;
grant execute on function public.ops_argent_lire(integer, integer) to service_role;
comment on function public.ops_argent_lire(integer, integer) is
  'Lit jusqu''à p_n messages (1 à 10) sous un délai d''invisibilité p_vt_s (5 à 3600 s, sinon ops:vt) (026-036). Un message déjà fait est supprimé sans être rendu ; au-delà de 3 lectures il est archivé, abandonne_le posé, un événement argent_abandonne écrit.';

-- ── Fait : la marque avant la suppression, une seule fois ───────────────────────────────────────
create or replace function public.ops_argent_fait(p_msg_id bigint, p_cle text, p_resultat jsonb)
returns boolean
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $$
declare
  v_marque boolean;
begin
  update ops.argent_messages
     set fait_le = now(), resultat = p_resultat
   where cle = p_cle and fait_le is null;
  v_marque := found;
  perform pgmq.delete('argent', p_msg_id);
  return v_marque;
end
$$;
revoke all on function public.ops_argent_fait(bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.ops_argent_fait(bigint, text, jsonb) to service_role;
comment on function public.ops_argent_fait(bigint, text, jsonb) is
  'Marque un message fait, une seule fois par clé (026-036). Première marque : fait_le et resultat posés, rend true. Déjà marqué (ou clé inconnue) : rend false. Le message est toujours supprimé de la file.';

-- ── État de la file ───────────────────────────────────────────────────────────────────────────
create or replace function public.ops_argent_etat()
returns jsonb
language plpgsql
stable
security definer
set search_path = ops, pgmq, public, pg_temp
as $$
declare
  v_metrics record;
begin
  select queue_length, oldest_msg_age_sec into v_metrics from pgmq.metrics('argent');
  return jsonb_build_object(
    'en_file', coalesce(v_metrics.queue_length, 0),
    'plus_vieux_s', v_metrics.oldest_msg_age_sec,
    'abandonnes_24h', (select count(*) from ops.argent_messages where abandonne_le >= now() - interval '24 hours'),
    'faits_24h', (select count(*) from ops.argent_messages where fait_le >= now() - interval '24 hours'),
    'non_faits_plus_de_15_min', (select count(*) from ops.argent_messages where fait_le is null and abandonne_le is null and envoye_le < now() - interval '15 minutes')
  );
end
$$;
revoke all on function public.ops_argent_etat() from public, anon, authenticated;
grant execute on function public.ops_argent_etat() to service_role;
comment on function public.ops_argent_etat() is
  'État de la file argent (026-036) : en_file et plus_vieux_s (pgmq.metrics), abandonnes_24h, faits_24h, non_faits_plus_de_15_min.';

-- ── Ménage des essais e2e seulement ───────────────────────────────────────────────────────────
create or replace function public.ops_argent_essai_effacer()
returns integer
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $$
declare
  v_n integer;
begin
  delete from pgmq.q_argent where message ->> 'cle' like 'essai_e2e:%';
  delete from pgmq.a_argent where message ->> 'cle' like 'essai_e2e:%';
  delete from ops.argent_messages where cle like 'essai_e2e:%';
  get diagnostics v_n = row_count;
  return v_n;
end
$$;
revoke all on function public.ops_argent_essai_effacer() from public, anon, authenticated;
grant execute on function public.ops_argent_essai_effacer() to service_role;
comment on function public.ops_argent_essai_effacer() is
  'Pour les suites seulement (026-036) : efface les lignes essai_e2e:… de ops.argent_messages et leurs messages en file argent (q_argent et a_argent).';
