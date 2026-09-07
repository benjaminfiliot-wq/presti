alter table public.courriers add column if not exists nature        text not null default 'a_lire';
alter table public.courriers add column if not exists nature_auto   text;
alter table public.courriers add column if not exists nature_motif  text;
alter table public.courriers add column if not exists nature_source text not null default 'auto';
alter table public.courriers add column if not exists nature_le     timestamptz;
alter table public.courriers add column if not exists entetes       jsonb not null default '{}'::jsonb;
alter table public.courriers add column if not exists repondre_a    text;

do $garde$ begin
  if not exists (select 1 from pg_constraint where conname = 'courriers_nature_chk') then
    alter table public.courriers add constraint courriers_nature_chk check (nature in
      ('artisan','prospect','abonnement','non_remise','fournisseur','technique','a_lire','reponse_auto','diffusion'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courriers_nature_auto_chk') then
    alter table public.courriers add constraint courriers_nature_auto_chk check (nature_auto is null or nature_auto in
      ('artisan','prospect','abonnement','non_remise','fournisseur','technique','a_lire','reponse_auto','diffusion'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courriers_nature_source_chk') then
    alter table public.courriers add constraint courriers_nature_source_chk check (nature_source in ('auto','manuel'));
  end if;
end $garde$;

create index if not exists courriers_nature_idx on public.courriers (nature, recu_le desc);
create index if not exists courriers_pile_idx   on public.courriers (nature, recu_le desc) where statut = 'a_traiter';

create or replace function public.sujet_norme(p text) returns text language sql immutable as $fn$
  select btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(
      lower(coalesce(p, '')),
      '’', ''''), '‘', ''''), '´', ''''),
      '—', '-'),  '–', '-'),  ' ', ' '),
    '\s+', ' ', 'g'))
$fn$;

create or replace function public.nature_courrier(
  p_email text, p_sujet text, p_entetes jsonb, p_est_artisan boolean, p_fil_connu boolean
) returns jsonb language plpgsql immutable as $fn$
declare
  v_de     text := lower(btrim(coalesce(p_email, '')));
  v_local  text := split_part(lower(btrim(coalesce(p_email, ''))), '@', 1);
  v_dom    text := split_part(lower(btrim(coalesce(p_email, ''))), '@', 2);
  v_s      text := public.sujet_norme(p_sujet);
  v_e      jsonb := coalesce(p_entetes, '{}'::jsonb);
  v_nous   boolean := v_de = 'contact@prestiapp.fr';
  m        text;
  v_stripe       text[] := array[]::text[];
  v_fournisseurs text[] := array[]::text[];
  v_argent text[] := array[
    '[presti] paiement - ', '[presti] changement d''offre - ', '[presti] résiliation - ',
    '[presti] webhook stripe en erreur - ', '[presti] votre paiement a échoué - ',
    '[presti] votre abonnement est annulé - ', '[presti] un litige a été ouvert sur votre paiement - ',
    '[presti] nouvel artisan - '];
  v_connus text[] := array[
    '[presti] urgent - le solde de l''api est épuisé', '[presti] urgent - la clé d''api est refusée',
    '[presti] le débit de l''api est saturé', '[presti] l''api est momentanément surchargée',
    '[presti] le service d''ia a échoué', '[presti] erreur critique - ', '[presti] presti a produit ',
    '[presti] la tâche « ', '[presti] chaîne mail cassée', '[presti] dmarc toujours absent',
    '[presti] budget ia : ', '[presti] le budget ia n''est surveillé par personne',
    '[presti] le budget ia ne peut pas être lu', '[presti] presti - point de la semaine',
    '[presti] compte purgé - ', '[presti] compte anonymisé - '];
begin
  if coalesce((v_e->>'rapport_remise')::boolean, false) then
    return jsonb_build_object('nature','non_remise','motif','remise:mime');
  end if;
  if v_local in ('mailer-daemon','postmaster','mail-daemon')
     and (v_e->>'return_path' = '<>' or (v_e->>'x_failed_recipients') is not null) then
    return jsonb_build_object('nature','non_remise','motif','remise:daemon');
  end if;

  if v_nous then
    if v_s like '[presti] [simulation] %' or v_s like 'presti - [simulation] %' then
      return jsonb_build_object('nature','technique','motif','interne:simulation');
    end if;
    if v_s like '[presti] message de %' then
      return jsonb_build_object('nature','prospect','motif','formulaire:contact','repondre_a', true);
    end if;
    foreach m in array v_argent loop
      if v_s like m || '%' then return jsonb_build_object('nature','abonnement','motif','interne:argent'); end if;
    end loop;
    if v_s ~ '^\[presti\] \d+ compte\(s\) à zéro crédit cette semaine$'
       or v_s ~ '^\[presti\] \d+ révocation\(s\) de sessions en 24 h$' then
      return jsonb_build_object('nature','technique','motif','interne:repertorie');
    end if;
    foreach m in array v_connus loop
      if v_s like m || '%' then return jsonb_build_object('nature','technique','motif','interne:repertorie'); end if;
    end loop;
    if v_s like '[presti] %' or v_s like 'presti - %' then
      return jsonb_build_object('nature','technique','motif','interne:non-repertorie');
    end if;
  end if;

  if coalesce(p_est_artisan, false) then
    return jsonb_build_object('nature','artisan','motif','artisan');
  end if;

  if (v_e->>'auto_submitted') is not null and lower(v_e->>'auto_submitted') not like 'no%' then
    return jsonb_build_object('nature','reponse_auto','motif','entete:auto-submitted');
  end if;

  if v_dom <> '' then
    foreach m in array v_stripe loop
      if v_dom = m or v_dom like '%.' || m then return jsonb_build_object('nature','abonnement','motif','domaine:' || m); end if;
    end loop;
    foreach m in array v_fournisseurs loop
      if v_dom = m or v_dom like '%.' || m then return jsonb_build_object('nature','fournisseur','motif','domaine:' || m); end if;
    end loop;
  end if;

  if v_s like 'report domain: %' and position('prestiapp.fr' in v_s) > 0 then
    return jsonb_build_object('nature','technique','motif','dmarc:rapport');
  end if;

  if coalesce(p_fil_connu, false) then
    return jsonb_build_object('nature','prospect','motif','fil:reponse');
  end if;

  if (v_e->>'list_unsubscribe') is not null or (v_e->>'list_id') is not null
     or lower(coalesce(v_e->>'precedence','')) in ('bulk','list') then
    return jsonb_build_object('nature','diffusion','motif','entete:liste');
  end if;

  return jsonb_build_object('nature','a_lire','motif','defaut');
end $fn$;

drop function if exists public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint);

create or replace function public.enregistrer_courrier(
  p_message_id text, p_fil text, p_sens text, p_email text, p_nom text, p_sujet text,
  p_corps text, p_recu_le timestamptz, p_boite text, p_uid bigint,
  p_entetes jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_id uuid; v_corps text; v_artisan uuid;
  v_e jsonb := coalesce(p_entetes, '{}'::jsonb);
  v_n jsonb; v_nature text; v_motif text; v_repondre text; v_fil text; v_fil_connu boolean;
begin
  if coalesce(trim(coalesce(p_message_id, '')), '') = '' then return jsonb_build_object('etat', 'sans_identifiant'); end if;
  if p_sens not in ('recu', 'envoye') then return jsonb_build_object('etat', 'sens_inconnu'); end if;

  select id into v_id from public.courriers where message_id = p_message_id;
  if found then
    update public.courriers set uid_imap = coalesce(p_uid, uid_imap), boite = coalesce(p_boite, boite) where id = v_id;
    return jsonb_build_object('etat', 'ok', 'id', v_id, 'nouveau', false);
  end if;

  v_corps := left(coalesce(p_corps, ''), 40000);
  v_fil := coalesce(nullif(trim(coalesce(p_fil, '')), ''), p_message_id);
  select exists (select 1 from public.courriers where fil = v_fil) into v_fil_connu;

  if coalesce((v_e->>'de_soi')::boolean, false) is not true
     and lower(trim(coalesce(p_email,''))) <> 'contact@prestiapp.fr' then
    select id into v_artisan from public.artisans
     where lower(email) = lower(trim(coalesce(p_email, ''))) and email not like '%@presti-test.invalid'
     order by created_at asc limit 1;
  end if;

  if p_sens = 'envoye' then
    select nature into v_nature from public.courriers where fil = v_fil and sens = 'recu' order by recu_le asc limit 1;
    v_nature := coalesce(v_nature, 'a_lire'); v_motif := 'fil';
  else
    v_n := public.nature_courrier(p_email, p_sujet, v_e, v_artisan is not null, v_fil_connu);
    v_nature := v_n->>'nature'; v_motif := v_n->>'motif';
    if coalesce((v_n->>'repondre_a')::boolean, false) and (v_e->>'reply_to') is not null then
      v_repondre := lower(left(trim(v_e->>'reply_to'), 320));
    end if;
  end if;

  insert into public.courriers (message_id, fil, sens, correspondant_email, correspondant_nom, sujet, apercu,
                                corps, recu_le, boite, uid_imap, artisan_id, statut,
                                nature, nature_auto, nature_motif, nature_source, nature_le, entetes, repondre_a)
  values (p_message_id, v_fil, p_sens,
          lower(trim(coalesce(p_email, ''))), nullif(trim(coalesce(p_nom, '')), ''), nullif(trim(coalesce(p_sujet, '')), ''),
          left(regexp_replace(v_corps, '\s+', ' ', 'g'), 400), v_corps, coalesce(p_recu_le, now()),
          coalesce(nullif(trim(coalesce(p_boite, '')), ''), 'INBOX'), p_uid, v_artisan,
          case when p_sens = 'envoye' then 'repondu' else 'a_traiter' end,
          v_nature, v_nature, v_motif, 'auto', now(), v_e, v_repondre)
  returning id into v_id;
  return jsonb_build_object('etat','ok','id',v_id,'nouveau',true,'artisan',v_artisan,'nature',v_nature,'motif',v_motif);
end $fn$;

revoke all on function public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint, jsonb) to service_role;

drop function if exists public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text);

create or replace function public.classer_courrier(
  p_acteur uuid, p_acteur_email text, p_courrier uuid, p_statut text, p_assigne uuid, p_artisan uuid,
  p_ip text, p_agent text, p_nature text default null
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_avant public.courriers%rowtype; v_journal uuid; v_statut text; v_assigne uuid; v_artisan uuid; v_nature text;
begin
  select * into v_avant from public.courriers where id = p_courrier for update;
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  if p_statut is not null and p_statut not in ('a_traiter', 'repondu', 'classe') then return jsonb_build_object('etat', 'statut_inconnu'); end if;
  if p_nature is not null and p_nature not in
     ('artisan','prospect','abonnement','non_remise','fournisseur','technique','a_lire','reponse_auto','diffusion') then
    return jsonb_build_object('etat', 'nature_inconnue');
  end if;
  if p_assigne is not null and not exists (select 1 from public.artisans where id = p_assigne and is_founder) then
    return jsonb_build_object('etat', 'assigne_inconnu');
  end if;

  v_statut  := coalesce(p_statut, v_avant.statut);
  v_assigne := coalesce(p_assigne, v_avant.assigne_a);
  v_artisan := coalesce(p_artisan, v_avant.artisan_id);
  v_nature  := coalesce(p_nature, v_avant.nature);
  update public.courriers
     set statut = v_statut, assigne_a = v_assigne, artisan_id = v_artisan, nature = v_nature,
         nature_source = case when p_nature is not null then 'manuel' else nature_source end,
         nature_le = case when p_nature is not null then now() else nature_le end,
         maj_le = now()
   where id = p_courrier;

  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
  values (p_acteur, p_acteur_email, 'courrier_classe', 'courrier', p_courrier::text, v_artisan,
          jsonb_build_object('statut', v_avant.statut, 'assigne', v_avant.assigne_a, 'artisan', v_avant.artisan_id, 'nature', v_avant.nature),
          jsonb_build_object('statut', v_statut, 'assigne', v_assigne, 'artisan', v_artisan, 'nature', v_nature), p_ip, p_agent, false)
  returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'journal', v_journal, 'statut', v_statut, 'nature', v_nature);
end $fn$;
revoke all on function public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text, text) to service_role;

create or replace function public.reclasser_courriers(p_depuis timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare n_recu int; n_env int;
begin
  update public.courriers c
     set nature = x.n, nature_auto = x.n, nature_motif = x.m, nature_le = now()
    from lateral (select (r->>'nature') as n,
                         (r->>'motif') || case when c.entetes = '{}'::jsonb then ':retro' else '' end as m
                    from public.nature_courrier(c.correspondant_email, c.sujet, c.entetes,
                                                c.artisan_id is not null,
                                                exists (select 1 from public.courriers p
                                                         where p.fil = c.fil and p.recu_le < c.recu_le)) r) x
   where c.sens = 'recu'
     and c.nature_source = 'auto'
     and c.recu_le >= coalesce(p_depuis, '-infinity');
  get diagnostics n_recu = row_count;

  update public.courriers e
     set nature = f.nature, nature_auto = f.nature, nature_motif = 'fil', nature_le = now()
    from (select distinct on (fil) fil, nature from public.courriers
           where sens = 'recu' order by fil, recu_le asc) f
   where e.sens = 'envoye' and e.nature_source = 'auto' and e.fil = f.fil
     and e.recu_le >= coalesce(p_depuis, '-infinity');
  get diagnostics n_env = row_count;
  return jsonb_build_object('recus', n_recu, 'envoyes', n_env);
end $fn$;
revoke all on function public.reclasser_courriers(timestamptz) from public, anon, authenticated;
grant execute on function public.reclasser_courriers(timestamptz) to service_role;

create or replace function public.compter_courriers_par_nature(p_assigne uuid default null)
returns jsonb language sql security definer set search_path = public as $fn$
  select coalesce(jsonb_object_agg(nature, n), '{}'::jsonb) from (
    select nature, count(*) n from public.courriers
     where (p_assigne is null or assigne_a = p_assigne) group by nature) t
$fn$;
revoke all on function public.compter_courriers_par_nature(uuid) from public, anon, authenticated;
grant execute on function public.compter_courriers_par_nature(uuid) to service_role;

select public.reclasser_courriers(null);
