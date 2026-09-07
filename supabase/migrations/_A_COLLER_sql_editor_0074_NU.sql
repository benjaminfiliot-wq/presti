drop policy if exists founders_all_devis        on public.devis;
drop policy if exists founders_all_devis_lignes on public.devis_lignes;
drop policy if exists founders_all_leads        on public.leads;
drop policy if exists founders_all_factures     on public.factures;
drop policy if exists founders_all_factures_lignes on public.factures_lignes;

create table if not exists public.tickets (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  fil         text not null,
  sujet       text,
  ouvert_le   timestamptz not null default now(),
  ouvert_par  uuid references public.artisans(id) on delete set null,
  ferme_le    timestamptz,
  ferme_par   uuid references public.artisans(id) on delete set null
);
create index if not exists tickets_artisan_idx on public.tickets (artisan_id, ouvert_le desc);
create index if not exists tickets_ouverts_idx on public.tickets (artisan_id) where ferme_le is null;
alter table public.tickets enable row level security;
revoke all on public.tickets from public, anon, authenticated;
drop policy if exists "support : l'artisan lit ses tickets" on public.tickets;
create policy "support : l'artisan lit ses tickets" on public.tickets for select using (auth.uid() = artisan_id);

create table if not exists public.support_verrou (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  pose_le    timestamptz not null default now()
);
alter table public.support_verrou enable row level security;
revoke all on public.support_verrou from public, anon, authenticated;
drop policy if exists "support : l'artisan lit son verrou" on public.support_verrou;
create policy "support : l'artisan lit son verrou" on public.support_verrou for select using (auth.uid() = artisan_id);

create table if not exists public.acces_support (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  artisan_id    uuid not null references public.artisans(id) on delete cascade,
  element_type  text not null check (element_type in ('lead', 'devis', 'facture')),
  element_id    uuid not null,
  element_titre text,
  motif         text not null,
  demande_le    timestamptz not null default now(),
  demande_par   uuid references public.artisans(id) on delete set null,
  demande_email text,
  notifie_le    timestamptz,
  notifie_id    text,
  ouvert_le     timestamptz,
  expire_le     timestamptz,
  refuse_le     timestamptz,
  refuse_motif  text,
  ferme_le      timestamptz,
  ferme_motif   text check (ferme_motif in ('artisan', 'presti', 'horloge', 'ticket')),
  releve_envoye_le timestamptz
);
sans lui, rien ne s''ouvre. ouvert_le n''est posé que sous la session de l''artisan : le fondateur ne peut pas ouvrir.';
create index if not exists acces_support_artisan_idx on public.acces_support (artisan_id, demande_le desc);
create index if not exists acces_support_ouverts_idx on public.acces_support (artisan_id) where ouvert_le is not null and ferme_le is null;
create index if not exists acces_support_releve_idx on public.acces_support (expire_le) where releve_envoye_le is null and expire_le is not null;
alter table public.acces_support enable row level security;
revoke all on public.acces_support from public, anon, authenticated;
drop policy if exists "support : l'artisan lit ses accès" on public.acces_support;
create policy "support : l'artisan lit ses accès" on public.acces_support for select using (auth.uid() = artisan_id);

create table if not exists public.acces_support_lectures (
  id           uuid primary key default gen_random_uuid(),
  acces_id     uuid not null references public.acces_support(id) on delete cascade,
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  vue          text not null check (vue in ('forme', 'chiffres', 'photos', 'envoi')),
  element_type text not null,
  element_id   uuid not null,
  acteur_nom   text not null,
  lu_le        timestamptz not null default now()
);
create index if not exists acces_support_lectures_idx on public.acces_support_lectures (acces_id, lu_le);
create index if not exists acces_support_lectures_artisan_idx on public.acces_support_lectures (artisan_id, lu_le desc);
alter table public.acces_support_lectures enable row level security;
revoke all on public.acces_support_lectures from public, anon, authenticated;
drop policy if exists "support : l'artisan lit ce qui a été ouvert" on public.acces_support_lectures;
create policy "support : l'artisan lit ce qui a été ouvert" on public.acces_support_lectures for select using (auth.uid() = artisan_id);

create or replace function public.acces_support_lectures_immuable() returns trigger language plpgsql as $fn$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'artisan_id') = (to_jsonb(old) - 'artisan_id')
       and (new.artisan_id is null or new.artisan_id is not distinct from old.artisan_id) then
      return new;
    end if;
    raise exception 'acces_support_lectures : une trace de lecture ne se modifie pas';
  end if;
  if tg_op = 'DELETE' and old.lu_le > now() - interval '24 months'
     and not exists (select 1 from public.artisans a
                      where a.id = old.artisan_id and coalesce(a.email, '') like '%@presti-test.invalid') then
    raise exception 'acces_support_lectures : conservation 24 mois';
  end if;
  return old;
end $fn$;
drop trigger if exists acces_support_lectures_immuable on public.acces_support_lectures;
create trigger acces_support_lectures_immuable before update or delete on public.acces_support_lectures
  for each row execute function public.acces_support_lectures_immuable();

create or replace function public.demander_acces_support(
  p_acteur uuid, p_acteur_email text, p_ticket uuid, p_type text, p_element uuid, p_titre text,
  p_motif text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_t public.tickets%rowtype; v_id uuid; v_journal uuid; v_n int;
begin
  if coalesce(trim(coalesce(p_motif, '')), '') = '' then return jsonb_build_object('etat', 'motif_requis'); end if;
  if p_type not in ('lead', 'devis', 'facture') then return jsonb_build_object('etat', 'type_inconnu'); end if;
  select * into v_t from public.tickets where id = p_ticket for update;
  if not found then return jsonb_build_object('etat', 'ticket_inconnu'); end if;
  if v_t.ferme_le is not null then return jsonb_build_object('etat', 'ticket_ferme'); end if;

  if exists (select 1 from public.support_verrou where artisan_id = v_t.artisan_id) then
    return jsonb_build_object('etat', 'verrouille');
  end if;
  if exists (select 1 from public.suspensions where artisan_id = v_t.artisan_id and levee_le is null) then
    return jsonb_build_object('etat', 'suspendu');
  end if;
  if exists (select 1 from public.artisans where id = v_t.artisan_id and suppression_demandee_le is not null) then
    return jsonb_build_object('etat', 'suppression_demandee');
  end if;
  select count(*) into v_n from public.acces_support where ticket_id = p_ticket and refuse_le is null;
  if v_n >= 3 then return jsonb_build_object('etat', 'plafond'); end if;
  if exists (select 1 from public.acces_support
              where ticket_id = p_ticket and element_id = p_element
                and refuse_le is not null and refuse_le > now() - interval '24 hours') then
    return jsonb_build_object('etat', 'refuse_recemment');
  end if;
  if (p_type = 'lead'    and not exists (select 1 from public.leads    where id = p_element and artisan_id = v_t.artisan_id))
  or (p_type = 'devis'   and not exists (select 1 from public.devis    where id = p_element and artisan_id = v_t.artisan_id))
  or (p_type = 'facture' and not exists (select 1 from public.factures where id = p_element and artisan_id = v_t.artisan_id)) then
    return jsonb_build_object('etat', 'element_inconnu');
  end if;

  insert into public.acces_support (ticket_id, artisan_id, element_type, element_id, element_titre, motif, demande_par, demande_email)
    values (p_ticket, v_t.artisan_id, p_type, p_element, left(coalesce(p_titre, ''), 120), p_motif, p_acteur, p_acteur_email)
    returning id into v_id;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'support_acces_demande', p_type, p_element::text, v_t.artisan_id,
            jsonb_build_object('porte', 'fermée'),
            jsonb_build_object('porte', 'demandée', 'ticket', p_ticket, 'acces', v_id, 'motif', p_motif, 'notifie', false),
            p_ip, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'acces', v_id, 'artisan', v_t.artisan_id, 'journal', v_journal);
end $fn$;
revoke all on function public.demander_acces_support(uuid, text, uuid, text, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.demander_acces_support(uuid, text, uuid, text, uuid, text, text, text, text) to service_role;

create or replace function public.notifier_acces_support(p_acces uuid, p_envoi text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  update public.acces_support set notifie_le = now(), notifie_id = left(coalesce(p_envoi, ''), 80)
   where id = p_acces and notifie_le is null and refuse_le is null;
  if not found then return jsonb_build_object('etat', 'deja'); end if;
  return jsonb_build_object('etat', 'ok');
end $fn$;
revoke all on function public.notifier_acces_support(uuid, text) from public, anon, authenticated;
grant execute on function public.notifier_acces_support(uuid, text) to service_role;

create or replace function public.refuser_acces_support(
  p_acces uuid, p_motif text, p_par uuid, p_par_email text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.acces_support%rowtype;
begin
  select * into v from public.acces_support where id = p_acces for update;
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.artisan_id <> p_par then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.refuse_le is not null then return jsonb_build_object('etat', 'deja'); end if;
  if v.ouvert_le is not null then return jsonb_build_object('etat', 'deja_ouvert'); end if;
  update public.acces_support set refuse_le = now(), refuse_motif = left(coalesce(p_motif, ''), 120) where id = p_acces;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_par, p_par_email, 'support_acces_refuse', v.element_type, v.element_id::text, v.artisan_id,
            jsonb_build_object('porte', 'demandée'),
            jsonb_build_object('porte', 'refusée', 'acces', p_acces, 'motif', left(coalesce(p_motif, ''), 120)),
            p_ip, p_agent, false);
  return jsonb_build_object('etat', 'ok');
end $fn$;
revoke all on function public.refuser_acces_support(uuid, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.refuser_acces_support(uuid, text, uuid, text, text, text) to service_role;

create or replace function public.ouvrir_acces_support(
  p_acces uuid, p_artisan uuid, p_artisan_email text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.acces_support%rowtype; v_expire timestamptz;
begin
  select * into v from public.acces_support where id = p_acces for update;
  if not found or v.artisan_id <> p_artisan then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.refuse_le is not null then return jsonb_build_object('etat', 'refuse'); end if;
  if v.ouvert_le is not null then return jsonb_build_object('etat', 'deja', 'expire_le', v.expire_le); end if;
  if v.notifie_le is null then return jsonb_build_object('etat', 'non_notifie'); end if;
  if exists (select 1 from public.tickets t where t.id = v.ticket_id and t.ferme_le is not null) then
    return jsonb_build_object('etat', 'ticket_ferme');
  end if;
  v_expire := now() + interval '1 hour';
  update public.acces_support set ouvert_le = now(), expire_le = v_expire where id = p_acces;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_artisan, p_artisan_email, 'support_acces_ouvert', v.element_type, v.element_id::text, v.artisan_id,
            jsonb_build_object('porte', 'demandée'),
            jsonb_build_object('porte', 'ouverte', 'acces', p_acces, 'par', 'artisan', 'expire_le', v_expire),
            p_ip, p_agent, false);
  return jsonb_build_object('etat', 'ok', 'expire_le', v_expire, 'titre', v.element_titre);
end $fn$;
revoke all on function public.ouvrir_acces_support(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.ouvrir_acces_support(uuid, uuid, text, text, text) to service_role;

create or replace function public.fermer_acces_support(
  p_acces uuid, p_motif text, p_par uuid, p_par_email text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.acces_support%rowtype; v_n int;
begin
  if p_motif not in ('artisan', 'presti', 'horloge', 'ticket') then return jsonb_build_object('etat', 'motif_inconnu'); end if;
  select * into v from public.acces_support where id = p_acces for update;
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.ferme_le is not null then return jsonb_build_object('etat', 'deja'); end if;
  if p_motif = 'artisan' and v.artisan_id <> p_par then return jsonb_build_object('etat', 'inconnu'); end if;
  update public.acces_support set ferme_le = now(), ferme_motif = p_motif where id = p_acces;
  select count(*) into v_n from public.acces_support_lectures where acces_id = p_acces;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_par, p_par_email, 'support_acces_ferme', v.element_type, v.element_id::text, v.artisan_id,
            jsonb_build_object('porte', 'ouverte'),
            jsonb_build_object('porte', 'fermée', 'acces', p_acces, 'par', p_motif, 'lectures', v_n),
            p_ip, p_agent, false);
  return jsonb_build_object('etat', 'ok', 'lectures', v_n, 'artisan', v.artisan_id);
end $fn$;
revoke all on function public.fermer_acces_support(uuid, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.fermer_acces_support(uuid, text, uuid, text, text, text) to service_role;

create or replace function public.fermer_ticket(
  p_ticket uuid, p_par uuid, p_par_email text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.tickets%rowtype; a record; v_n int := 0;
begin
  select * into v from public.tickets where id = p_ticket for update;
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.ferme_le is not null then return jsonb_build_object('etat', 'deja'); end if;
  update public.tickets set ferme_le = now(), ferme_par = p_par where id = p_ticket;
  for a in select id from public.acces_support where ticket_id = p_ticket and ferme_le is null and ouvert_le is not null loop
    perform public.fermer_acces_support(a.id, 'ticket', p_par, p_par_email, p_ip, p_agent);
    v_n := v_n + 1;
  end loop;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, apres, ip, agent, reconfirme)
    values (p_par, p_par_email, 'support_ticket_ferme', 'ticket', p_ticket::text, v.artisan_id,
            jsonb_build_object('fenetres_fermees', v_n), p_ip, p_agent, false);
  return jsonb_build_object('etat', 'ok', 'fenetres', v_n);
end $fn$;
revoke all on function public.fermer_ticket(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.fermer_ticket(uuid, uuid, text, text, text) to service_role;

create or replace function public.lire_sous_support(
  p_acteur uuid, p_acteur_email text, p_acteur_nom text, p_acces uuid, p_vue text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.acces_support%rowtype; v_d jsonb;
begin
  select * into v from public.acces_support where id = p_acces for update;
  if not found               then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.refuse_le is not null then return jsonb_build_object('etat', 'refuse'); end if;
  if v.ouvert_le is null     then return jsonb_build_object('etat', 'pas_ouvert'); end if;
  if v.ferme_le is not null  then return jsonb_build_object('etat', 'ferme'); end if;
  if v.expire_le < now()     then return jsonb_build_object('etat', 'expire'); end if;
  if exists (select 1 from public.tickets t where t.id = v.ticket_id and t.ferme_le is not null) then
    return jsonb_build_object('etat', 'ticket_ferme');
  end if;
  if (v.element_type = 'lead' and p_vue not in ('forme', 'photos', 'envoi'))
  or (v.element_type in ('devis', 'facture') and p_vue <> 'chiffres') then
    return jsonb_build_object('etat', 'vue_inconnue');
  end if;

  if p_vue = 'forme' then
    select jsonb_build_object(
      'element', 'conversation ' || left(l.id::text, 8),
      'statut', l.statut, 'canal', l.canal, 'canal_reponse', l.canal_reponse,
      'urgence', l.urgence, 'type_chantier', l.type_chantier, 'ab_variant', l.ab_variant,
      'creee_le', l.created_at, 'maj_le', l.updated_at, 'lue_le', l.lu_le,
      'prise_en_main', l.prise_en_main, 'prise_en_main_le', l.prise_en_main_le,
      'client_plateforme', left(coalesce(l.client_plateforme_id::text, ''), 8),
      'contact', case when l.contact like '%@%' then '•••@' || split_part(l.contact, '@', 2)
                      when l.contact is null then null else 'contact non-email' end,
      'messages', (select coalesce(jsonb_agg(jsonb_build_object(
          'sens', m.sens, 'type', m.type, 'etat', m.etat, 'modele', m.modele,
          'canal', left(coalesce(m.canal_id::text, ''), 8), 'envoye_le', m.sent_at,
          'longueur', length(coalesce(m.contenu, '')),
          'contient_numero', coalesce(m.contenu, '') ~ '[0-9]{2}[ .-]?[0-9]{2}[ .-]?[0-9]{2}',
          'contient_lien', coalesce(m.contenu, '') ~* 'https?://'
        ) order by m.sent_at), '[]'::jsonb) from public.messages m where m.lead_id = l.id))
      into v_d from public.leads l where l.id = v.element_id and l.artisan_id = v.artisan_id;

  elsif p_vue = 'photos' then
    select jsonb_build_object(
      'nombre', coalesce(jsonb_array_length(l.photos), 0),
      'octets_declares', l.photos_octets,
      'fichiers', (select coalesce(jsonb_agg(jsonb_build_object(
          'nom', split_part(o.name, '/', 2), 'mime', o.metadata->>'mimetype',
          'octets', o.metadata->>'size', 'depose_le', o.created_at)), '[]'::jsonb)
        from storage.objects o where o.bucket_id = 'lead-media' and o.name like l.id::text || '/%'))
      into v_d from public.leads l where l.id = v.element_id and l.artisan_id = v.artisan_id;

  elsif p_vue = 'envoi' then
    select jsonb_build_object(
      'canal_reponse', l.canal_reponse,
      'sortants', (select coalesce(jsonb_agg(jsonb_build_object(
          'etat', m.etat, 'type', m.type, 'envoye_le', m.sent_at,
          'externe_id', left(coalesce(m.externe_id, ''), 16), 'canal', left(coalesce(m.canal_id::text, ''), 8))
        order by m.sent_at), '[]'::jsonb)
        from public.messages m where m.lead_id = l.id and m.sens = 'out'),
      'canaux', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', left(c.id::text, 8), 'libelle', c.libelle, 'actif', c.actif,
          'derniere_releve', c.derniere_releve,
          'derniere_erreur', left(regexp_replace(coalesce(c.derniere_erreur, ''),
            '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+', '•••@…', 'g'), 300))), '[]'::jsonb)
        from public.canaux c where c.artisan_id = v.artisan_id))
      into v_d from public.leads l where l.id = v.element_id and l.artisan_id = v.artisan_id;

  elsif v.element_type = 'devis' then
    select jsonb_build_object(
      'element', 'devis ' || coalesce(d.numero, left(d.id::text, 8)),
      'statut', d.statut, 'date_emission', d.date_emission, 'validite_jours', d.validite_jours,
      'envoye_le', d.envoye_le, 'accepte_le', d.accepte_le, 'accepte_canal', d.accepte_canal,
      'remise_pct', d.remise_pct, 'acompte_pct', d.acompte_pct,
      'total_ht', d.total_ht, 'total_tva', d.total_tva, 'total_ttc', d.total_ttc,
      'lie_a_une_conversation', d.lead_id is not null,
      'lignes', (select coalesce(jsonb_agg(jsonb_build_object(
          'ordre', dl.ordre, 'quantite', dl.quantite, 'unite', dl.unite,
          'prix_unitaire_ht', dl.prix_unitaire_ht, 'tva_taux', dl.tva_taux) order by dl.ordre), '[]'::jsonb)
        from public.devis_lignes dl where dl.devis_id = d.id))
      into v_d from public.devis d where d.id = v.element_id and d.artisan_id = v.artisan_id;

  else
    select jsonb_build_object(
      'element', 'facture ' || coalesce(f.numero, left(f.id::text, 8)),
      'statut', f.statut, 'date_emission', f.date_emission, 'date_echeance', f.date_echeance,
      'emise_le', f.emise_le, 'verrouillee', f.verrouillee, 'empreinte_posee', f.empreinte is not null,
      'avoir', f.avoir_de is not null, 'devise', f.devise, 'pays', f.client_pays,
      'categorie_operation', f.categorie_operation, 'exoneration_code', f.exoneration_code,
      'tva_sur_debits', f.tva_sur_debits,
      'siren_renseigne', f.client_siren is not null, 'adresse_chantier_renseignee', f.adresse_chantier is not null,
      'adresse_client_renseignee', f.client_adresse is not null,
      'remise_pct', f.remise_pct, 'acompte_pct', f.acompte_pct,
      'total_ht', f.total_ht, 'total_tva', f.total_tva, 'total_ttc', f.total_ttc,
      'lignes', (select coalesce(jsonb_agg(jsonb_build_object(
          'ordre', fl.ordre, 'quantite', fl.quantite, 'unite', fl.unite,
          'prix_unitaire_ht', fl.prix_unitaire_ht, 'tva_taux', fl.tva_taux) order by fl.ordre), '[]'::jsonb)
        from public.factures_lignes fl where fl.facture_id = f.id))
      into v_d from public.factures f where f.id = v.element_id and f.artisan_id = v.artisan_id;
  end if;

  if v_d is null then return jsonb_build_object('etat', 'element_introuvable'); end if;

  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'support_vu_comme', v.element_type, v.element_id::text, v.artisan_id,
            jsonb_build_object('porte', 'ouverte'),
            jsonb_build_object('ticket', v.ticket_id, 'acces', p_acces, 'vue', p_vue), p_ip, p_agent, false);
  insert into public.acces_support_lectures (acces_id, artisan_id, vue, element_type, element_id, acteur_nom)
    values (p_acces, v.artisan_id, p_vue, v.element_type, v.element_id, left(coalesce(p_acteur_nom, 'Presti'), 80));

  return jsonb_build_object('etat', 'ok', 'vue', p_vue, 'titre', v.element_titre,
                            'expire_le', v.expire_le, 'donnees', v_d);
end $fn$;
revoke all on function public.lire_sous_support(uuid, text, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.lire_sous_support(uuid, text, text, uuid, text, text, text) to service_role;
