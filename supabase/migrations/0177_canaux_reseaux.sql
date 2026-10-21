-- 0177 · TOUS LES RÉSEAUX DANS LA MESSAGERIE (demande du fondateur du 21/10/2026) : le bot TELEGRAM de l'artisan (drapeau
-- `canauxTelegram`), les réseaux sans API lus par leurs E-MAILS DE NOTIFICATION (drapeau `canauxNotifications` : LinkedIn, Page
-- Facebook, Instagram, TikTok, 123devis, Habitatpresto, PagesJaunes, Houzz, Travaux.com, StarOfService), « VOS RÉSEAUX » (liens
-- marqués de leur source, drapeau `canauxLiens`) et l'IMPORT des prospects des formulaires publicitaires (drapeau `importProspects`).
-- Écrite le 21/10/2026. ✅ APPLIQUÉE le 21/10/2026 (contrôle 10/10 vert, essai réel annulé). Ordre suivi : coller, contrôler (supabase/controles/0177_canaux_reseaux.sql), puis
-- `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/canaux-reseaux-qa.mjs`, PUIS lever les drapeaux.
-- Idempotente et additive : AUCUNE table neuve, aucune ligne réécrite, aucun droit accordé. Une colonne, un index, une contrainte
-- élargie, une fonction remplacée (même signature, mêmes droits).
--
-- 1 ─ leads.origine : le réseau d'où vient la demande — ?src= de la page de conversation (liste fermée de lib/canaux/reseaux.ts,
--     relue par app/api/leads) ou le réseau d'un import. Contrainte sur la même liste fermée (`not valid` : vaut pour toute ligne
--     écrite désormais, sans relire l'existant). Pas de nouvelle donnée personnelle : un nom de réseau.
-- 2 ─ index (artisan_id, contact) : l'import écarte les personnes déjà dans les demandes de l'artisan.
-- 3 ─ canaux.type : la contrainte de 0139 (email, whatsapp, messenger, instagram) reçoit « telegram ». Le jeton du bot vit dans
--     `canaux.secret`, CHIFFRÉ par l'application (AES-256-GCM, CANAUX_KEY, lib/secretBox.ts) comme les boîtes e-mail ; `externe_id`
--     porte l'identifiant du bot, UNIQUE par type (index canaux_externe_unique de 0139) : un bot n'est relié qu'à un espace.
--     Les réseaux lus par notification n'ont PAS de ligne `canaux` à eux : ils passent par la boîte e-mail branchée (type email).
-- 4 ─ canaux_conversation_ouvrir (0139) : la liste des canaux admis reçoit telegram et les réseaux lus par notification. Même
--     verrou consultatif, même SECURITY DEFINER, même search_path, mêmes droits (service_role seul).
-- RLS : rien de neuf à protéger. `leads` et `canaux` gardent leur RLS et leurs politiques (lecture de SES lignes), `canaux_evenements`
-- reste sans politique (service_role). Aucun `grant` à anon ni à authenticated.

-- 0 ─ 0177 s'appuie sur 0139 (canaux.externe_id, leads.canal_*, canaux_evenements) : sans elle, on s'arrête AVANT d'écrire quoi que ce soit.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name = 'canal_externe_id')
     or not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'canaux_evenements') then
    raise exception '0177 : appliquez d''abord 0139_canaux_messagerie.sql';
  end if;
end $$;

-- 1 ─ L'origine d'une demande.
alter table public.leads add column if not exists origine text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_origine_connue' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_origine_connue check (origine is null or origine in (
      'whatsapp', 'instagram', 'facebook', 'linkedin', 'tiktok', 'google', 'leboncoin', 'telegram', 'youtube', 'pinterest',
      'site', 'email', 'sms', 'carte', 'flyer', 'vehicule'
    )) not valid;
  end if;
end $$;
comment on column public.leads.origine is
  '0177 — réseau d''origine de la demande (?src= de la page, ou réseau d''un import de formulaire publicitaire). Liste fermée : lib/canaux/reseaux.ts.';

-- 2 ─ Les doublons à l'import.
create index if not exists leads_artisan_contact_idx on public.leads (artisan_id, contact) where contact is not null;

-- 3 ─ Le type « telegram ». La contrainte est remplacée seulement si elle ne le connaît pas encore (rejouable).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'canaux_type_connu' and conrelid = 'public.canaux'::regclass
             and pg_get_constraintdef(oid) not like '%telegram%') then
    alter table public.canaux drop constraint canaux_type_connu;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'canaux_type_connu' and conrelid = 'public.canaux'::regclass) then
    alter table public.canaux add constraint canaux_type_connu check (type in ('email', 'whatsapp', 'messenger', 'instagram', 'telegram')) not valid;
  end if;
end $$;

-- 4 ─ Le fil d'une personne, atomiquement : la fonction de 0139, avec les canaux neufs.
create or replace function public.canaux_conversation_ouvrir(p jsonb, p_depuis timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_artisan uuid := (p->>'artisan_id')::uuid;
  v_canal   text := p->>'canal';
  v_personne text := p->>'canal_externe_id';
  v_id uuid;
  v_statut text;
begin
  if v_artisan is null or v_canal not in (
       'whatsapp', 'messenger', 'instagram', 'leboncoin', 'telegram',
       'linkedin', 'facebook', 'instagram_notif', 'tiktok', '123devis', 'habitatpresto', 'pagesjaunes', 'houzz', 'travaux_com', 'starofservice'
     ) or coalesce(v_personne, '') = '' then
    raise exception 'canaux_conversation_ouvrir : paramètres invalides';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('canaux:' || v_artisan::text || ':' || v_canal || ':' || v_personne, 0));

  select l.id, l.statut into v_id, v_statut
    from public.leads l
   where l.artisan_id = v_artisan and l.canal = v_canal and l.canal_externe_id = v_personne and l.updated_at >= p_depuis
   order by l.updated_at desc
   limit 1;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'statut', v_statut, 'nouveau', false);
  end if;

  insert into public.leads (
    artisan_id, canal, canal_id, canal_externe_id, nom_prospect, contact, message, statut,
    urgence, type_chantier, ville, canal_dernier_entrant_le, canal_lien_reponse
  ) values (
    v_artisan, v_canal, nullif(p->>'canal_id', '')::uuid, v_personne, left(p->>'nom_prospect', 120), nullif(left(p->>'contact', 200), ''),
    left(p->>'message', 5000), 'nouveau', coalesce(p->>'urgence', 'normal'), p->>'type_chantier', p->>'ville',
    coalesce((p->>'canal_dernier_entrant_le')::timestamptz, now()), nullif(p->>'canal_lien_reponse', '')
  ) returning id into v_id;
  return jsonb_build_object('id', v_id, 'statut', 'nouveau', 'nouveau', true);
end $$;
revoke all on function public.canaux_conversation_ouvrir(jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.canaux_conversation_ouvrir(jsonb, timestamptz) to service_role;
