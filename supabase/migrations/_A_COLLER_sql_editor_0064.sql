-- 0064 — Notifications push (prompt v9, J2 web ; J3 natif).
--
-- Ce que ça pose :
--  • `push_abonnements` : un appareil abonné de l'artisan. Web : `endpoint` + clés `p256dh`/`auth`
--    (Web Push, chiffré de bout en bout par le navigateur) ; natif (J3) : `jeton` APNs/FCM.
--    `appareil` est un libellé déduit du navigateur (jamais l'adresse IP). `echecs` compte les
--    envois ratés d'affilée : 3 → `actif = false` ; un 404/410 du service de push supprime la ligne.
--  • `artisans.notifications` gagne une clé `push` : {type → booléen}, même logique que les emails
--    (absent = activé). Lu par lib/notifications.ts avant chaque envoi.
--
-- Lecture : l'artisan peut lire SES lignes (RLS). Écriture : les routes /api/push seulement
-- (clé service) — un jeton volé ne peut pas abonner un appareil tiers depuis le navigateur.
-- Suppression du compte : cascade depuis artisans (purge RGPD et purger_compte_test).

create table if not exists public.push_abonnements (
  id             uuid primary key default gen_random_uuid(),
  artisan_id     uuid not null references public.artisans(id) on delete cascade,
  type           text not null default 'web' check (type in ('web', 'ios', 'android')),
  endpoint       text,
  jeton          text,
  p256dh         text,
  auth           text,
  appareil       text,
  actif          boolean not null default true,
  cree_le        timestamptz not null default now(),
  dernier_succes timestamptz,
  echecs         int not null default 0,
  constraint push_abonnements_cible check (
    (type = 'web' and endpoint is not null and p256dh is not null and auth is not null)
    or (type <> 'web' and jeton is not null)
  )
);

create unique index if not exists push_abonnements_endpoint_idx on public.push_abonnements (endpoint) where endpoint is not null;
create unique index if not exists push_abonnements_jeton_idx on public.push_abonnements (jeton) where jeton is not null;
create index if not exists push_abonnements_artisan_idx on public.push_abonnements (artisan_id);

alter table public.push_abonnements enable row level security;

drop policy if exists "push : l'artisan lit ses appareils" on public.push_abonnements;
create policy "push : l'artisan lit ses appareils"
  on public.push_abonnements for select
  using (auth.uid() = artisan_id);

comment on table public.push_abonnements is
  'Appareils abonnés aux notifications push de l''artisan (web : endpoint + clés ; natif : jeton). Écrit par /api/push (service_role) seulement. Aucune donnée personnelle : le libellé d''appareil vient du navigateur, jamais l''IP.';

comment on column public.artisans.notifications is
  'Notifications de l''artisan par type : {nouvelle_demande, proposition, devis_accepte} → booléen pour l''email, et push: {mêmes types → booléen}. Absent = activé. Lu par lib/notifications.ts avant chaque envoi.';
