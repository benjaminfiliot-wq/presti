-- 0074 — Le mode support : une porte étroite, visible, temporaire, que l'artisan seul ouvre.
--
-- Prompt v11 §3 : « tickets, mode support (lecture seule, journalisé ET notifié à l'artisan) ».
-- Prompt v11 §5 : les données des clients d'un artisan sont interdites au fondateur « sauf ticket
-- support ouvert, journalisé et notifié ».
--
-- L'ENJEU. Un artisan confie à Presti les conversations de SES clients, leurs devis, leurs photos de
-- chantier. Aujourd'hui personne ne peut les lire depuis le Poste de contrôle, et c'est une promesse
-- tenue par le code, pas par une intention. Cette migration ouvre une porte dans cette promesse.
-- Tout ce qui suit existe pour qu'elle reste étroite.
--
-- LES QUATRE PROPRIÉTÉS, et comment chacune est tenue :
--
--   OUVERTE PAR L'ARTISAN SEUL. `ouvrir_acces_support` reçoit l'identifiant de l'artisan depuis SA
--   session et refuse une fenêtre qui ne lui appartient pas. Le fondateur ne peut pas ouvrir : ce
--   n'est pas « il ne devrait pas », c'est qu'il n'existe aucun code pour le faire.
--
--   TEMPORAIRE. Soixante minutes à partir du clic, pas de la demande — sinon la fenêtre se consume
--   pendant que l'artisan est sur un chantier. Aucune route de renouvellement : une heure de plus
--   est une nouvelle demande, donc un nouvel email. Deux emails dans la même après-midi, c'est
--   exactement le signal qu'il doit recevoir.
--
--   LECTURE SEULE. La façon la plus solide de tenir cette promesse est de ne pas écrire le verbe :
--   il n'y a pas de fonction qui écrive sous support, pas même une qui refuse.
--
--   JOURNALISÉE ET VISIBLE PAR LUI. Chaque lecture écrit DEUX lignes dans la même transaction que la
--   donnée qu'elle rend : une chez Presti (`journal_direction`, avec l'IP, preuve) et une chez
--   l'artisan (`acces_support_lectures`, sans elle, qu'il peut lire et exporter). Une route future
--   qui « oublierait » de journaliser n'aurait rien à lire — c'est le même appel.
--
-- CE QUI NE PASSE JAMAIS PAR LA PORTE : le fond. Pas un mot de conversation, pas une désignation de
-- devis, pas une adresse, pas une photo, pas une coordonnée de client. La porte donne la FORME —
-- « sortant, 412 caractères, état proposition, jamais envoyé » suffit à trouver une panne. Le fond
-- passe par la main de l'artisan, jamais par la porte : il peut consentir pour lui, pas pour son client.

-- ══ 0. D'ABORD, fermer la fenêtre d'à côté ═══════════════════════════════════════════════════════
--
-- Mesuré le 07/09 avec un compte fondateur de test, lisant sous RLS comme le ferait son navigateur :
-- il voyait 9 devis, 12 factures et 9 demandes appartenant à d'autres artisans. Le partenaire, lui,
-- voyait zéro — la migration 0070 tient. Le trou vient de 0004 et 0006, qui donnent `for all` à
-- `is_founder()` sur ces cinq tables.
--
-- Le v11 §5 dit : « Données des clients des artisans — fondateur : INTERDIT, sauf ticket support
-- ouvert, journalisé et notifié. » Construire la porte étroite ci-dessous en laissant ces policies
-- ouvertes, ce serait poser une serrure sur une porte ouverte.
--
-- Benjamin garde SES lignes : les policies « propres lignes » de 0002, 0006 et 0010 ne bougent pas.
-- Le `service_role` n'est pas concerné — les routes du produit continuent de fonctionner. L'accès
-- aux données d'un artisan existe toujours ; il passe désormais par une porte qui laisse une trace.
drop policy if exists founders_all_devis        on public.devis;
drop policy if exists founders_all_devis_lignes on public.devis_lignes;
drop policy if exists founders_all_leads        on public.leads;
drop policy if exists founders_all_factures     on public.factures;
drop policy if exists founders_all_factures_lignes on public.factures_lignes;

-- ══ 1. Le ticket : minuscule, et sa seule raison d'être est l'artisan PROUVÉ ══════════════════════
--
-- Le formulaire de contact du site est public et anonyme : rien aujourd'hui ne prouve de qui vient
-- une demande d'aide. Or on n'ouvre pas une porte sur les données de quelqu'un sur la foi d'un email
-- signé « Jean ». Un ticket naît d'une session authentifiée, et c'est tout ce qu'il apporte.
--
-- Pas de statut ici (le fil de `courriers` le porte déjà), pas de priorité (elle se dérive), pas
-- d'échéance stockée (elle se calcule ; stockée, elle serait fausse le jour où l'offre change).
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
comment on table public.tickets is
  'Une demande d''aide RATTACHÉE À UN ARTISAN PROUVÉ (v11 §3). Le corps et le statut vivent dans courriers (0069) : ici, seulement le lien et la preuve. ouvert_par NULL = ouvert par l''artisan lui-même. Un ticket ouvert par le fondateur n''autorise RIEN par lui-même : seul le clic de l''artisan ouvre une fenêtre.';
create index if not exists tickets_artisan_idx on public.tickets (artisan_id, ouvert_le desc);
create index if not exists tickets_ouverts_idx on public.tickets (artisan_id) where ferme_le is null;
alter table public.tickets enable row level security;
revoke all on public.tickets from public, anon, authenticated;
drop policy if exists "support : l'artisan lit ses tickets" on public.tickets;
create policy "support : l'artisan lit ses tickets" on public.tickets for select using (auth.uid() = artisan_id);

-- ══ 2. Le verrou personnel : « ne me demandez jamais d'accès de support » ═════════════════════════
--
-- Une table et non une colonne sur `artisans` : 0068 a déjà tranché ce point pour les suspensions —
-- ajouter un champ sensible de plus revient à élargir une surface déjà protégée.
--
-- Ce qu'on promet à l'artisan, exactement : AUCUNE ROUTE DU POSTE DE CONTRÔLE ne peut écrire cette
-- table. On ne promet pas « impossible » — le service_role peut tout, c'est vrai de toute la base, et
-- un trigger n'y changerait rien. Ce qui rend ce verrou honnête, c'est qu'il est LISIBLE PAR LUI à
-- tout moment : il peut vérifier lui-même qu'il tient.
create table if not exists public.support_verrou (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  pose_le    timestamptz not null default now()
);
comment on table public.support_verrou is
  'L''artisan a décidé une fois pour toutes que personne ne lui demanderait d''accès de support. La demande est refusée AVANT d''atteindre son écran. Écrit uniquement sous la session de l''artisan.';
alter table public.support_verrou enable row level security;
revoke all on public.support_verrou from public, anon, authenticated;
drop policy if exists "support : l'artisan lit son verrou" on public.support_verrou;
create policy "support : l'artisan lit son verrou" on public.support_verrou for select using (auth.uid() = artisan_id);

-- ══ 3. La fenêtre : née FERMÉE, ouverte par l'artisan seul, expirant seule ════════════════════════
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
comment on table public.acces_support is
  'Une autorisation DATÉE de regarder UN élément nommé (v11 §5). Elle naît fermée. notifie_le posé = l''artisan a été prévenu ; sans lui, rien ne s''ouvre. ouvert_le n''est posé que sous la session de l''artisan : le fondateur ne peut pas ouvrir.';
comment on column public.acces_support.element_titre is
  'Ce que l''artisan reconnaît (« Devis n° 2026-041 »), écrit POUR LUI. Jamais un nom de client.';
comment on column public.acces_support.expire_le is
  '60 minutes à partir du clic de l''artisan — le même nombre que les URL signées des photos : le temps de consulter une demande, pas plus.';
create index if not exists acces_support_artisan_idx on public.acces_support (artisan_id, demande_le desc);
create index if not exists acces_support_ouverts_idx on public.acces_support (artisan_id) where ouvert_le is not null and ferme_le is null;
create index if not exists acces_support_releve_idx on public.acces_support (expire_le) where releve_envoye_le is null and expire_le is not null;
alter table public.acces_support enable row level security;
revoke all on public.acces_support from public, anon, authenticated;
drop policy if exists "support : l'artisan lit ses accès" on public.acces_support;
create policy "support : l'artisan lit ses accès" on public.acces_support for select using (auth.uid() = artisan_id);

-- ══ 4. Une ligne par LECTURE — et l'artisan la lit aussi ══════════════════════════════════════════
--
-- Sans elle, le journal dirait que la porte s'est ouverte et jamais ce qui a été regardé : « lecture
-- seule journalisée » ne voudrait plus rien dire. Ce n'est pas le journal : `journal_direction` porte
-- l'IP du fondateur et ne sera jamais lisible par un navigateur. C'est sa projection épurée, faite
-- pour l'artisan.
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
comment on table public.acces_support_lectures is
  'Ce qui a réellement été ouvert, ligne par ligne, écrit dans la MÊME transaction que la ligne de journal_direction. Lisible par l''artisan, exportable avec ses données, immuable, 24 mois.';
comment on column public.acces_support_lectures.acteur_nom is
  'Le NOM de la personne, pas une IP ni « quelqu''un chez Presti » : la société tient en une personne, et l''artisan doit pouvoir constater que ce n''est jamais l''autre.';
create index if not exists acces_support_lectures_idx on public.acces_support_lectures (acces_id, lu_le);
create index if not exists acces_support_lectures_artisan_idx on public.acces_support_lectures (artisan_id, lu_le desc);
alter table public.acces_support_lectures enable row level security;
revoke all on public.acces_support_lectures from public, anon, authenticated;
drop policy if exists "support : l'artisan lit ce qui a été ouvert" on public.acces_support_lectures;
create policy "support : l'artisan lit ce qui a été ouvert" on public.acces_support_lectures for select using (auth.uid() = artisan_id);

-- L'immuabilité, avec deux tolérances nécessaires : le `set null` d'une clé étrangère (sans quoi la
-- suppression d'un compte échouerait, le trigger refusant l'UPDATE que Postgres exécute lui-même) et
-- les comptes de test. Sans ce trigger, la copie de l'ARTISAN s'effacerait pendant que celle de
-- Presti resterait — exactement à l'envers de ce qu'on veut.
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

-- ══ 5. Demander — l'écrit AVANT l'accès, tout ou rien ═════════════════════════════════════════════
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

  -- Le verrou passe avant tout : la demande ne doit même pas atteindre l'écran de l'artisan.
  if exists (select 1 from public.support_verrou where artisan_id = v_t.artisan_id) then
    return jsonb_build_object('etat', 'verrouille');
  end if;
  -- On ne regarde pas les données de quelqu'un à qui on vient de couper l'accès, ni de quelqu'un qui part.
  if exists (select 1 from public.suspensions where artisan_id = v_t.artisan_id and levee_le is null) then
    return jsonb_build_object('etat', 'suspendu');
  end if;
  if exists (select 1 from public.artisans where id = v_t.artisan_id and suppression_demandee_le is not null) then
    return jsonb_build_object('etat', 'suppression_demandee');
  end if;
  -- Au-delà de trois, ce n'est plus un diagnostic : c'est un bug à reproduire sur un compte de démo.
  select count(*) into v_n from public.acces_support where ticket_id = p_ticket and refuse_le is null;
  if v_n >= 3 then return jsonb_build_object('etat', 'plafond'); end if;
  -- Un refus est une réponse : on ne redemande pas la même chose dans la foulée.
  if exists (select 1 from public.acces_support
              where ticket_id = p_ticket and element_id = p_element
                and refuse_le is not null and refuse_le > now() - interval '24 hours') then
    return jsonb_build_object('etat', 'refuse_recemment');
  end if;
  -- L'élément doit appartenir à CET artisan. Sans ce contrôle, un identifiant recopié de travers
  -- ouvrirait une fenêtre sur le compte d'un autre — et la trace irait chez le mauvais.
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

-- ══ 6. Prévenu, ou refusé — jamais « au mieux » ═══════════════════════════════════════════════════
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

-- ══ 7. OUVRIR — le seul geste que le fondateur ne peut pas faire ══════════════════════════════════
--
-- `p_artisan` vient de la SESSION de l'artisan, jamais du corps de la requête, et la fonction refuse
-- une fenêtre qui ne lui appartient pas : le contrôle est ici, pas seulement dans la route.
-- L'acteur journalisé est l'ARTISAN, et c'est voulu : le journal doit pouvoir répondre à « qui a
-- ouvert cette porte », et la réponse est toujours « lui ».
create or replace function public.ouvrir_acces_support(
  p_acces uuid, p_artisan uuid, p_artisan_email text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.acces_support%rowtype; v_expire timestamptz;
begin
  select * into v from public.acces_support where id = p_acces for update;
  if not found or v.artisan_id <> p_artisan then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.refuse_le is not null then return jsonb_build_object('etat', 'refuse'); end if;
  if v.ouvert_le is not null then return jsonb_build_object('etat', 'deja', 'expire_le', v.expire_le); end if;
  -- Sans notification, pas d'ouverture : c'est ce qui empêche une porte de s'ouvrir en silence si
  -- l'email n'est pas parti.
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

-- ══ 8. Fermer — jamais plus difficile qu'ouvrir ═══════════════════════════════════════════════════
--
-- Fermer n'est jamais re-confirmé, jamais découragé, jamais expliqué. Une fermeture qu'on rend
-- pénible est une fermeture qui n'arrive pas — c'est la même raison qui fait que l'ouverture, elle,
-- est chère. Les deux gestes ne doivent pas coûter pareil.
create or replace function public.fermer_acces_support(
  p_acces uuid, p_motif text, p_par uuid, p_par_email text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.acces_support%rowtype; v_n int;
begin
  if p_motif not in ('artisan', 'presti', 'horloge', 'ticket') then return jsonb_build_object('etat', 'motif_inconnu'); end if;
  select * into v from public.acces_support where id = p_acces for update;
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  if v.ferme_le is not null then return jsonb_build_object('etat', 'deja'); end if;
  -- Un artisan ne ferme que SES fenêtres. Le contrôle est ici, jamais dans la route seule.
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

-- Clore un ticket ferme ses fenêtres à la seconde : la fenêtre suit le motif, jamais l'horloge seule.
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

-- ══ 9. LIRE — la fonction qui rend les données est celle qui écrit la trace ═══════════════════════
--
-- C'est le cœur du dispositif, et le seul montage qui ne se contourne pas par oubli : il n'existe
-- aucun autre chemin, depuis le Poste de contrôle, vers une donnée de client d'artisan. Une route
-- future qui « oublierait » de journaliser n'aurait rien à lire.
--
-- Chaque lecture revérifie la porte DANS la même transaction : ticket ouvert, accès ouvert, non
-- expiré, non fermé, non refusé, sur cet élément. Un accès dont le contrôle se fait à l'entrée
-- seulement n'a pas de fermeture, il a une politesse.
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
      -- Silhouette : la partie locale disparaît, LE DOMAINE RESTE. Une non-remise est très souvent
      -- une affaire de domaine (@orange.fr, @laposte.net) et jamais une affaire de prénom.
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
    -- La métrologie, pas les images : « 4 fichiers, 18 Mo, le quatrième pèse 0 octet » règle le
    -- problème. L'image ne le règle pas, et une URL signée vivrait son heure HORS de la fenêtre.
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
          -- L'erreur du serveur est utile ; l'adresse qu'elle cite ne l'est pas.
          'derniere_erreur', left(regexp_replace(coalesce(c.derniere_erreur, ''),
            '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+', '•••@…', 'g'), 300))), '[]'::jsonb)
        from public.canaux c where c.artisan_id = v.artisan_id))
      into v_d from public.leads l where l.id = v.element_id and l.artisan_id = v.artisan_id;

  elsif v.element_type = 'devis' then
    -- L'arithmétique nue, sans une seule désignation : un écart de total se trouve dans les nombres.
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

  -- La trace, dans la MÊME transaction que la lecture. Deux lignes, une vérité : l'une chez Presti
  -- (avec l'IP, preuve), l'autre chez l'artisan (sans elle, et lisible par lui).
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
