-- ============================================================================================
-- 0075 · L'artisan désigne lui-même ce dont il parle
--
-- 0074 laissait une question sans réponse : au moment de demander un accès, comment le fondateur
-- sait-il QUEL devis regarder ? Il ne voit plus les listes — c'est tout l'objet de 0074 — donc soit
-- on lui rouvrait une liste (et la porte étroite ne servait plus à rien), soit il tapait un
-- identifiant trouvé ailleurs.
--
-- La bonne réponse était sous les yeux : c'est l'ARTISAN qui sait de quoi il parle. Quand il demande
-- de l'aide depuis l'écran d'un devis, ce devis part avec sa demande. Le fondateur ne choisit rien ;
-- il ne peut demander à regarder que ce qui lui a été montré du doigt.
--
-- Conséquence assumée, et c'est la règle la plus nette du lot : UN TICKET QUI NE DÉSIGNE AUCUN
-- ÉLÉMENT N'OUVRE AUCUN ACCÈS. « Je n'arrive pas à me connecter » se règle en parlant, pas en
-- regardant les affaires de ses clients.
-- ============================================================================================

alter table public.tickets add column if not exists element_type  text
  check (element_type is null or element_type in ('lead', 'devis', 'facture'));
alter table public.tickets add column if not exists element_id    uuid;
alter table public.tickets add column if not exists element_titre text;

comment on column public.tickets.element_type is
  'L''élément que l''artisan a désigné en demandant de l''aide (0075). NULL = il n''en a désigné aucun, et alors aucun accès de support ne peut être demandé sur ce ticket.';
comment on column public.tickets.element_titre is
  'Ce que l''artisan reconnaît (« Devis n° 2026-041 »), résolu par le serveur au moment de la demande. Jamais un nom de client.';

-- Même signature qu'en 0074 : `create or replace` remplace, sans créer de surcharge (PGRST203).
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

  -- 0075 — la demande ne porte que sur ce que l'artisan a désigné. Ce contrôle vient AVANT tous les
  -- autres : c'est celui qui dit qui choisit.
  if v_t.element_id is null then return jsonb_build_object('etat', 'ticket_sans_element'); end if;
  if v_t.element_id <> p_element or v_t.element_type <> p_type then
    return jsonb_build_object('etat', 'element_non_designe');
  end if;

  -- Le verrou passe avant le reste : la demande ne doit même pas atteindre l'écran de l'artisan.
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
  -- L'élément doit appartenir à CET artisan. Le contrôle reste, même si 0075 le rend redondant : un
  -- jour quelqu'un écrira un autre chemin vers `tickets`, et cette ligne sera la dernière à tenir.
  if (p_type = 'lead'    and not exists (select 1 from public.leads    where id = p_element and artisan_id = v_t.artisan_id))
  or (p_type = 'devis'   and not exists (select 1 from public.devis    where id = p_element and artisan_id = v_t.artisan_id))
  or (p_type = 'facture' and not exists (select 1 from public.factures where id = p_element and artisan_id = v_t.artisan_id)) then
    return jsonb_build_object('etat', 'element_inconnu');
  end if;

  -- Le titre montré à l'artisan est CELUI QU'IL A ÉCRIT en demandant de l'aide, pas celui que le
  -- fondateur propose : on ne laisse pas la partie demandeuse rédiger ce que l'autre va lire.
  insert into public.acces_support (ticket_id, artisan_id, element_type, element_id, element_titre, motif, demande_par, demande_email)
    values (p_ticket, v_t.artisan_id, p_type, p_element,
            left(coalesce(v_t.element_titre, p_titre, ''), 120), p_motif, p_acteur, p_acteur_email)
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
