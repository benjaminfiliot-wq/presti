-- 0100_ops_file_argent.sql — TÉMOIN de 026-032 : une implémentation de référence du contrat de 026-036, écrite pour prouver
-- que scripts/argent-sql-qa.mjs sait être VERT sur une migration conforme. Jamais appliquée.
-- R8 (recherche du 24/09) : Supabase Queues (pgmq) pour le chemin de l'argent. pgmq livre un message exactement une fois dans
-- sa fenêtre d'invisibilité, pas un effet : la marque fait_le de ops.argent_messages est consultée avant d'agir.

create extension if not exists pgmq;

do $fn$
begin
  if not exists (select 1 from pgmq.list_queues() where queue_name = 'argent') then
    perform pgmq.create('argent');
  end if;
end
$fn$;

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

revoke all on schema pgmq from anon, authenticated;

create or replace function public.ops_argent_envoyer(p_type text, p_cle text, p_charge jsonb, p_delai_s integer)
returns bigint
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $fn$
declare
  v_msg bigint;
begin
  if p_type is null or p_type not in ('commande_payee', 'essai_e2e') then
    raise exception using message = 'ops:type_argent', errcode = 'P0001';
  end if;
  insert into ops.argent_messages (cle, type, charge) values (p_cle, p_type, coalesce(p_charge, '{}'::jsonb))
  on conflict (cle) do nothing;
  if not found then
    return null;
  end if;
  v_msg := pgmq.send('argent', jsonb_build_object('type', p_type, 'cle', p_cle, 'charge', coalesce(p_charge, '{}'::jsonb)), greatest(coalesce(p_delai_s, 0), 0));
  update ops.argent_messages set msg_id = v_msg where cle = p_cle;
  return v_msg;
end
$fn$;

create or replace function public.ops_argent_lire(p_vt_s integer, p_n integer)
returns table(msg_id bigint, lectures integer, type text, cle text, charge jsonb, mis_le timestamptz)
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $fn$
declare
  m record;
  v_fait timestamptz;
begin
  if p_vt_s is null or p_vt_s < 5 or p_vt_s > 3600 then
    raise exception using message = 'ops:vt', errcode = 'P0001';
  end if;
  for m in select * from pgmq.read('argent', p_vt_s, least(greatest(coalesce(p_n, 1), 1), 10)) loop
    select a.fait_le into v_fait from ops.argent_messages a where a.cle = m.message ->> 'cle';
    if v_fait is not null then
      perform pgmq.delete('argent', m.msg_id);
    elsif m.read_ct > 3 then
      perform pgmq.archive('argent', m.msg_id);
      update ops.argent_messages a set abandonne_le = now(), lectures = m.read_ct where a.cle = m.message ->> 'cle';
      perform public.ops_evenement_ajouter('systeme', 'argent_abandonne', left(m.message ->> 'cle', 200), 'Message de la file argent abandonné après 3 lectures', null);
    else
      update ops.argent_messages a set lectures = m.read_ct where a.cle = m.message ->> 'cle';
      msg_id := m.msg_id;
      lectures := m.read_ct;
      type := m.message ->> 'type';
      cle := m.message ->> 'cle';
      charge := m.message -> 'charge';
      mis_le := m.enqueued_at;
      return next;
    end if;
  end loop;
end
$fn$;

create or replace function public.ops_argent_fait(p_msg_id bigint, p_cle text, p_resultat jsonb)
returns boolean
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $fn$
begin
  update ops.argent_messages set fait_le = now(), resultat = coalesce(p_resultat, '{}'::jsonb) where cle = p_cle and fait_le is null;
  if found then
    perform pgmq.delete('argent', p_msg_id);
    return true;
  end if;
  perform pgmq.delete('argent', p_msg_id);
  return false;
end
$fn$;

create or replace function public.ops_argent_etat()
returns jsonb
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $fn$
declare
  v_m record;
begin
  select * into v_m from pgmq.metrics('argent');
  return jsonb_build_object(
    'en_file', coalesce(v_m.queue_length, 0),
    'plus_vieux_s', coalesce(v_m.oldest_msg_age_sec, 0),
    'abandonnes_24h', (select count(*) from ops.argent_messages where abandonne_le > now() - interval '24 hours'),
    'faits_24h', (select count(*) from ops.argent_messages where fait_le > now() - interval '24 hours'),
    'non_faits_plus_de_15_min', (select count(*) from ops.argent_messages where fait_le is null and abandonne_le is null and envoye_le < now() - interval '15 minutes'));
end
$fn$;

create or replace function public.ops_argent_essai_effacer()
returns integer
language plpgsql
security definer
set search_path = ops, pgmq, public, pg_temp
as $fn$
declare
  m record;
  v_n integer;
begin
  for m in select a.msg_id from ops.argent_messages a where a.cle like 'essai_e2e:%' and a.msg_id is not null loop
    perform pgmq.delete('argent', m.msg_id);
  end loop;
  delete from ops.argent_messages where cle like 'essai_e2e:%';
  get diagnostics v_n = row_count;
  return v_n;
end
$fn$;

revoke all on function public.ops_argent_envoyer(text, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.ops_argent_lire(integer, integer) from public, anon, authenticated;
revoke all on function public.ops_argent_fait(bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.ops_argent_etat() from public, anon, authenticated;
revoke all on function public.ops_argent_essai_effacer() from public, anon, authenticated;
grant execute on function public.ops_argent_envoyer(text, text, jsonb, integer) to service_role;
grant execute on function public.ops_argent_lire(integer, integer) to service_role;
grant execute on function public.ops_argent_fait(bigint, text, jsonb) to service_role;
grant execute on function public.ops_argent_etat() to service_role;
grant execute on function public.ops_argent_essai_effacer() to service_role;

comment on table ops.argent_messages is 'La file de l''argent (0100) : une ligne par clé, la marque fait_le avant tout effet.';
