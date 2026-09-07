-- À coller dans Supabase → SQL Editor. Contient 0069 : la messagerie de l'ENTREPRISE (boîte unifiée par fil,
-- classement, assignation, réponse dans le fil). La table n'a AUCUNE policy de lecture, volontairement :
-- un jeton obtenu au mot de passe seul ne doit pas pouvoir lire la boîte par PostgREST.
-- Après collage, dites-le moi : je lève FLAGS.messagerie et la suite prouve le tout en production.

-- 0069 — La messagerie de l'entreprise (prompt v10 §2.3, J3).
--
-- Ce que c'est : les emails reçus et envoyés par PRESTI — contact@prestiapp.fr, les messages du
-- formulaire « Nous écrire » (qui y arrivent par email), les réponses des artisans aux emails Presti.
-- Ce que ce n'est PAS, et ne sera jamais : les conversations d'un artisan avec SES clients. Le §2.3 est
-- explicite — c'est la messagerie de l'entreprise Presti, pas celle du produit.
--
-- Pourquoi une table plutôt qu'une lecture IMAP à chaque affichage : l'IMAP dit ce qui est arrivé, il ne
-- sait pas ce qu'on en a fait. Un statut (« à traiter », « répondu », « classé »), une assignation, un lien
-- vers un artisan : tout ça n'existe nulle part ailleurs. La table les porte, et sert d'index pour ne pas
-- rouvrir une connexion IMAP à chaque coup d'œil (la relève d'hier prenait 30 s de délai maximum).
--
-- Conservation : 24 mois, comme le journal de direction. Ce sont nos propres échanges professionnels ;
-- ils entrent au registre des traitements (docs/registre-traitements.md) au titre de la gestion commerciale.

create table if not exists public.courriers (
  id                  uuid primary key default gen_random_uuid(),
  -- L'en-tête Message-ID : c'est LUI qui dédoublonne. Relever deux fois la même boîte ne crée pas
  -- deux lignes, et une relève interrompue peut reprendre sans trier quoi que ce soit à la main.
  message_id          text not null unique,
  -- La racine du fil (premier References, sinon le Message-ID lui-même) : regrouper par sujet
  -- rapprocherait deux « Bonjour » sans rapport.
  fil                 text not null,
  sens                text not null check (sens in ('recu', 'envoye')),
  correspondant_email text not null,
  correspondant_nom   text,
  sujet               text,
  apercu              text,
  corps               text,
  recu_le             timestamptz not null,
  boite               text not null default 'INBOX',
  uid_imap            bigint,
  artisan_id          uuid references public.artisans(id) on delete set null,
  statut              text not null default 'a_traiter' check (statut in ('a_traiter', 'repondu', 'classe')),
  assigne_a           uuid references public.artisans(id) on delete set null,
  repond_a            uuid references public.courriers(id) on delete set null,
  cree_le             timestamptz not null default now(),
  maj_le              timestamptz not null default now()
);
comment on table  public.courriers is 'Messagerie de l''ENTREPRISE Presti (v10 §2.3) : ses emails reçus et envoyés. Jamais les conversations d''un artisan avec ses clients. Écrite par le serveur seul ; conservation 24 mois.';
comment on column public.courriers.message_id is 'En-tête Message-ID : la clé de dédoublonnage. Relever deux fois ne duplique rien.';
comment on column public.courriers.fil is 'Racine du fil (premier References, sinon le Message-ID) — jamais le sujet, qui rapprocherait deux échanges sans rapport.';
comment on column public.courriers.corps is 'Texte brut du message, borné à 40 000 caractères par la fonction d''enregistrement. Aucun HTML n''est conservé : il n''est ni utile ici, ni sûr à réafficher.';

create index if not exists courriers_fil_idx     on public.courriers (fil, recu_le);
create index if not exists courriers_statut_idx  on public.courriers (statut, recu_le desc);
create index if not exists courriers_artisan_idx on public.courriers (artisan_id, recu_le desc) where artisan_id is not null;
create index if not exists courriers_corresp_idx on public.courriers (correspondant_email, recu_le desc);

alter table public.courriers enable row level security;
-- Aucune policy de lecture, volontairement : un jeton obtenu au mot de passe seul (sans second facteur)
-- ne doit pas pouvoir lire la boîte de l'entreprise par PostgREST. La lecture passe par l'API, derrière
-- la garde du Centre. C'est la leçon du 07/09 sur le journal de direction, appliquée d'emblée.
revoke all on public.courriers from public, anon, authenticated;

-- ── Enregistrer un message relevé : idempotent par construction ────────────────────────────────────────
-- La relève rejoue volontiers les mêmes messages (fenêtre glissante, reprise après coupure). Un message
-- déjà connu voit seulement son numéro IMAP rafraîchi : ni son statut, ni son assignation, ni son lien
-- vers un artisan ne sont écrasés — sinon une relève annulerait le travail de la veille.
create or replace function public.enregistrer_courrier(
  p_message_id text, p_fil text, p_sens text, p_email text, p_nom text, p_sujet text,
  p_corps text, p_recu_le timestamptz, p_boite text, p_uid bigint
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nouveau boolean := false; v_corps text; v_artisan uuid;
begin
  if coalesce(trim(coalesce(p_message_id, '')), '') = '' then return jsonb_build_object('etat', 'sans_identifiant'); end if;
  if p_sens not in ('recu', 'envoye') then return jsonb_build_object('etat', 'sens_inconnu'); end if;

  select id into v_id from public.courriers where message_id = p_message_id;
  if found then
    update public.courriers set uid_imap = coalesce(p_uid, uid_imap), boite = coalesce(p_boite, boite) where id = v_id;
    return jsonb_build_object('etat', 'ok', 'id', v_id, 'nouveau', false);
  end if;

  v_corps := left(coalesce(p_corps, ''), 40000);
  -- Rattachement automatique : si l'adresse est celle d'un artisan, son courrier apparaît sur sa fiche.
  select id into v_artisan from public.artisans where lower(email) = lower(trim(coalesce(p_email, ''))) limit 1;

  insert into public.courriers (message_id, fil, sens, correspondant_email, correspondant_nom, sujet, apercu, corps, recu_le, boite, uid_imap, artisan_id, statut)
  values (p_message_id, coalesce(nullif(trim(coalesce(p_fil, '')), ''), p_message_id), p_sens,
          lower(trim(coalesce(p_email, ''))), nullif(trim(coalesce(p_nom, '')), ''), nullif(trim(coalesce(p_sujet, '')), ''),
          left(regexp_replace(v_corps, '\s+', ' ', 'g'), 400), v_corps, coalesce(p_recu_le, now()),
          coalesce(nullif(trim(coalesce(p_boite, '')), ''), 'INBOX'), p_uid, v_artisan,
          case when p_sens = 'envoye' then 'repondu' else 'a_traiter' end)
  returning id into v_id;
  v_nouveau := true;
  return jsonb_build_object('etat', 'ok', 'id', v_id, 'nouveau', v_nouveau, 'artisan', v_artisan);
end $$;
revoke all on function public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint) from public, anon, authenticated;
grant execute on function public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint) to service_role;

-- ── Classer, assigner, rattacher : l'action et sa trace dans la même transaction ───────────────────────
create or replace function public.classer_courrier(
  p_acteur uuid, p_acteur_email text, p_courrier uuid, p_statut text, p_assigne uuid, p_artisan uuid,
  p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_avant public.courriers%rowtype; v_journal uuid; v_statut text; v_assigne uuid; v_artisan uuid;
begin
  select * into v_avant from public.courriers where id = p_courrier for update;
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  if p_statut is not null and p_statut not in ('a_traiter', 'repondu', 'classe') then return jsonb_build_object('etat', 'statut_inconnu'); end if;
  -- On n'assigne qu'à un fondateur : la messagerie de l'entreprise ne se délègue pas à un client.
  if p_assigne is not null and not exists (select 1 from public.artisans where id = p_assigne and is_founder) then
    return jsonb_build_object('etat', 'assigne_inconnu');
  end if;

  v_statut  := coalesce(p_statut, v_avant.statut);
  v_assigne := coalesce(p_assigne, v_avant.assigne_a);
  v_artisan := coalesce(p_artisan, v_avant.artisan_id);
  update public.courriers set statut = v_statut, assigne_a = v_assigne, artisan_id = v_artisan, maj_le = now() where id = p_courrier;

  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
  values (p_acteur, p_acteur_email, 'courrier_classe', 'courrier', p_courrier::text, v_artisan,
          jsonb_build_object('statut', v_avant.statut, 'assigne', v_avant.assigne_a, 'artisan', v_avant.artisan_id),
          jsonb_build_object('statut', v_statut, 'assigne', v_assigne, 'artisan', v_artisan), p_ip, p_agent, false)
  returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'journal', v_journal, 'statut', v_statut);
end $$;
revoke all on function public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text) to service_role;

-- ── Le fil entier passe en « répondu » quand on répond ─────────────────────────────────────────────────
-- Répondre à un message d'un fil, c'est avoir traité ce fil : laisser les précédents en « à traiter »
-- ferait une pile qui ne descend jamais.
create or replace function public.fil_repondu(p_fil text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.courriers set statut = 'repondu', maj_le = now() where fil = p_fil and statut = 'a_traiter';
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.fil_repondu(text) from public, anon, authenticated;
grant execute on function public.fil_repondu(text) to service_role;
