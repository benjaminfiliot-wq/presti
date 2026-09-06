-- 0065 — Centre de direction, le socle (prompt v10, J1) : journal, re-confirmation, alertes, rôles, réglages.
--
-- Le problème : le poste de contrôle (/controle) copie six fois la même garde « fondateur », ne journalise
-- AUCUNE action (bannir une IP, lancer un agent payant : aucune trace de qui, quand, avant/après), et
-- n'a aucune notion de re-confirmation ni de rôle (Alexandre = lecture, Benj = direction). Le Centre de
-- direction (app/direction, app/api/direction) s'appuie sur ces cinq tables.
--
-- Doctrine : fondateurs seulement, via public.is_founder() (0004) pour la lecture ; TOUTE écriture par le
-- serveur (service_role), jamais par un jeton navigateur (motif 0064). `reglages_globaux` ne porte que des
-- VALEURS chiffrées (budget, plafonds, taux, seuils datés) — jamais les drapeaux de lib/flags.ts, qui
-- restent une décision de code relue en revue.
--
-- Ordre : coller ici, PUIS lever FLAGS.direction (lib/flags.ts). Drapeau levé sans les tables : la garde
-- répond 503 (fail-closed, voulu) et rien d'autre ne casse.

-- ── 1. Le journal de direction : qui, quoi, quand, avant/après, IP — immuable, 24 mois ─────────────────
create table if not exists public.journal_direction (
  id            uuid primary key default gen_random_uuid(),
  acteur_id     uuid not null references public.artisans(id) on delete restrict,
  acteur_email  text,
  action        text not null,
  cible_type    text,
  cible_id      text,
  artisan_id    uuid references public.artisans(id) on delete set null,
  avant         jsonb,
  apres         jsonb,
  ip            text,
  agent         text,
  reconfirme    boolean not null default false,
  cree_le       timestamptz not null default now()
);
comment on table  public.journal_direction is 'Actions des fondateurs dans le Centre de direction (v10 §1). Écrit par le serveur seul ; une action non journalisée n''a pas lieu (503). Immuable ; conservation 24 mois (purge lib/purgesRgpd.ts).';
comment on column public.journal_direction.action is 'reconfirmation | ban_ip | deban_ip | alerte_acquittee | … (lib/direction/journal.ts)';
comment on column public.journal_direction.ip is 'IP de l''acteur EN CLAIR, côté serveur seul (comme ip_bans) : c''est une preuve, pas une donnée d''artisan.';
comment on column public.journal_direction.avant is 'État minimal avant l''action — jamais un secret, jamais un contenu de prospect.';
comment on column public.journal_direction.apres is 'État minimal après l''action — mêmes règles.';
create index if not exists journal_direction_cree_idx    on public.journal_direction (cree_le desc);
create index if not exists journal_direction_artisan_idx on public.journal_direction (artisan_id, cree_le desc);
create index if not exists journal_direction_acteur_idx  on public.journal_direction (acteur_id, cree_le desc);
alter table public.journal_direction enable row level security;
drop policy if exists journal_direction_fondateurs_lecture on public.journal_direction;
create policy journal_direction_fondateurs_lecture on public.journal_direction for select using (public.is_founder());
-- aucune policy insert/update/delete : service_role seul

create or replace function public.journal_direction_immuable() returns trigger language plpgsql as $fn$
begin
  if tg_op = 'UPDATE' then
    raise exception 'journal_direction : une ligne de journal ne se modifie pas';
  end if;
  if tg_op = 'DELETE' and old.cree_le > now() - interval '24 months' then
    raise exception 'journal_direction : conservation 24 mois';
  end if;
  return old;
end $fn$;
drop trigger if exists journal_direction_immuable on public.journal_direction;
create trigger journal_direction_immuable before update or delete on public.journal_direction
  for each row execute function public.journal_direction_immuable();

-- ── 2. Les re-confirmations : un jeton court (5 min), à usage unique, par portée ─────────────────────
-- Le jeton lui-même n'est jamais stocké : seulement son empreinte sha256 (motif 0063, codes_connexion).
create table if not exists public.reconfirmations (
  jeton_hash  text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  portee      text not null check (portee in ('securite', 'argent', 'artisan', 'reglages')),
  expire_le   timestamptz not null,
  consomme_le timestamptz,
  cree_le     timestamptz not null default now()
);
comment on table public.reconfirmations is 'Re-confirmation d''une écriture du Centre de direction (v10 §1) : mot de passe revérifié côté serveur → jeton 5 min, usage unique, portée. Empreinte seulement. Purge : expirées > 7 j.';
create index if not exists reconfirmations_user_idx on public.reconfirmations (user_id, expire_le);
alter table public.reconfirmations enable row level security;
revoke all on public.reconfirmations from public, anon, authenticated;

create or replace function public.consommer_reconfirmation(p_user uuid, p_hash text, p_portee text)
returns text language plpgsql security definer set search_path = public as $$
declare r public.reconfirmations%rowtype;
begin
  select * into r from public.reconfirmations where jeton_hash = p_hash for update;
  if not found or r.user_id <> p_user then return 'absent'; end if;
  if r.consomme_le is not null then return 'rejoue'; end if;
  if r.expire_le < now() then return 'expire'; end if;
  if r.portee <> p_portee then return 'portee'; end if;
  update public.reconfirmations set consomme_le = now() where jeton_hash = p_hash;
  return 'ok';
end $$;
comment on function public.consommer_reconfirmation(uuid, text, text) is 'Une seule instruction : absent | rejoue | expire | portee | ok. Le rejeu est détecté (consomme_le posé).';
revoke all on function public.consommer_reconfirmation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.consommer_reconfirmation(uuid, text, text) to service_role;

-- ── 3. Les alertes, persistées : « À faire » les lit, l'acquittement est journalisé ───────────────────
create table if not exists public.alertes (
  id            uuid primary key default gen_random_uuid(),
  motif         text not null,
  cle           text,
  gravite       text not null default 'attention' check (gravite in ('info', 'attention', 'critique')),
  sujet         text not null,
  corps         text,
  source        text,
  acquittee_le  timestamptz,
  acquittee_par uuid references public.artisans(id) on delete set null,
  cree_le       timestamptz not null default now()
);
comment on table public.alertes is 'Alertes de lib/alertes.ts, gardées (v10 §2.1 « alertes non acquittées ») : une par motif+clé+jour. Acquittement journalisé, pas re-confirmé. Purge : acquittées > 12 mois.';
create index if not exists alertes_ouvertes_idx on public.alertes (cree_le desc) where acquittee_le is null;
create unique index if not exists alertes_jour_idx on public.alertes (motif, coalesce(cle, '-'), ((cree_le at time zone 'UTC')::date));
alter table public.alertes enable row level security;
drop policy if exists alertes_fondateurs_lecture on public.alertes;
create policy alertes_fondateurs_lecture on public.alertes for select using (public.is_founder());

-- ── 4. Les rôles : direction (tout) ou lecture (Alexandre, art. 7 du contrat) ─────────────────────────
-- Sans ligne, un fondateur (is_founder) est `direction`. La ligne `lecture` restreint.
create table if not exists public.direction_roles (
  user_id  uuid primary key references public.artisans(id) on delete cascade,
  role     text not null check (role in ('direction', 'lecture')),
  maj_le   timestamptz not null default now(),
  maj_par  uuid references public.artisans(id) on delete set null
);
comment on table public.direction_roles is 'Rôle d''un fondateur dans le Centre de direction (v10 §2.7) : direction = lecture + écriture ; lecture = clients, abonnements, registre des apports, messagerie assignée, relevés — jamais une écriture. Service seul.';
alter table public.direction_roles enable row level security;
revoke all on public.direction_roles from public, anon, authenticated;

-- ── 5. Les réglages globaux : des valeurs, datées, journalisées — jamais les drapeaux ──────────────────
create table if not exists public.reglages_globaux (
  cle           text primary key,
  valeur        jsonb not null,
  description   text,
  en_vigueur_le date,
  maj_le        timestamptz not null default now(),
  maj_par       uuid references public.artisans(id) on delete set null
);
comment on table public.reglages_globaux is 'Valeurs de direction modifiables sans déploiement (v10 §2.5) : budget IA, plafonds, taux URSSAF, seuils TVA (datés). Écriture par le serveur seul, journalisée. JAMAIS un drapeau de lib/flags.ts.';
alter table public.reglages_globaux enable row level security;
drop policy if exists reglages_globaux_fondateurs_lecture on public.reglages_globaux;
create policy reglages_globaux_fondateurs_lecture on public.reglages_globaux for select using (public.is_founder());
