-- À coller dans Supabase → SQL Editor, AVANT de lever FLAGS.direction (lib/flags.ts) — le code est déjà déployé, l'espace répond 404 tant que le drapeau est baissé.
-- Contient 0065 (Centre de direction, socle J1) : journal_direction (immuable), reconfirmations + consommer_reconfirmation, alertes, direction_roles, reglages_globaux,
-- les trois fonctions qui font l'action ET son journal dans la même transaction (bannir_ip, debannir_ip, acquitter_alerte), et le rôle « direction » pour les fondateurs actuels.

-- 0065 — Centre de direction, le socle (prompt v10, J1) : journal, re-confirmation, alertes, rôles, réglages.
--
-- Le problème : le poste de contrôle (/controle) copie six fois la même garde « fondateur », ne journalise
-- AUCUNE action (bannir une IP, lancer un agent payant : aucune trace de qui, quand, avant/après), et
-- n'a aucune notion de re-confirmation ni de rôle (Alexandre = lecture, Benj = direction). Le Centre de
-- direction (app/direction, app/api/direction) s'appuie sur ces cinq tables.
--
-- Doctrine, corrigée par la revue adversariale du 07/09 (wf_94e34d23) :
--  • ces tables ne sont JAMAIS lues par un jeton de navigateur — `revoke all` sur `anon` et `authenticated`,
--    aucune policy de lecture. Une policy `using (is_founder())` aurait rouvert la porte que la garde ferme :
--    `is_founder()` ne connaît ni le second facteur (aal2) ni `sessions_verifiees`, donc un jeton obtenu au
--    mot de passe seul aurait lu le journal (IP en clair, avant/après) directement par PostgREST. La lecture
--    passe par `app/api/direction/*` (service_role + lib/direction/garde.ts), point.
--  • une action et sa ligne de journal se font dans la MÊME transaction (fonctions `bannir_ip`, `debannir_ip`,
--    `acquitter_alerte` ci-dessous) : plus de « journal d'une action qui n'a pas eu lieu » ni l'inverse.
--  • `reglages_globaux` ne porte que des VALEURS chiffrées (budget, plafonds, taux, seuils datés) — jamais les
--    drapeaux de lib/flags.ts, qui restent une décision de code relue en revue.
--
-- Ordre : coller ici, PUIS lever FLAGS.direction (lib/flags.ts). Drapeau levé sans les tables : la garde
-- répond 503 (fail-closed, voulu) et rien d'autre ne casse.

-- ── 1. Le journal de direction : qui, quoi, quand, avant/après, IP — immuable, 24 mois ─────────────────
create table if not exists public.journal_direction (
  id            uuid primary key default gen_random_uuid(),
  acteur_id     uuid references public.artisans(id) on delete set null,
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
comment on table  public.journal_direction is 'Actions des fondateurs dans le Centre de direction (v10 §1). Écrit par le serveur seul ; une action non journalisée n''a pas lieu. Immuable ; conservation 24 mois (purge lib/purgesRgpd.ts). Jamais lisible par un jeton de navigateur : la lecture passe par app/api/direction/journal.';
comment on column public.journal_direction.acteur_email is 'Adresse de connexion (GoTrue) au moment de l''action — PAS artisans.email, que l''acteur peut changer lui-même (revue du 07/09).';
comment on column public.journal_direction.action is 'reconfirmation | ban_ip | deban_ip | alerte_acquittee | … (lib/direction/journal.ts)';
comment on column public.journal_direction.ip is 'IP de l''acteur EN CLAIR, côté serveur seul (comme ip_bans) : c''est une preuve. Montrée aux seuls fondateurs de rôle « direction ».';
comment on column public.journal_direction.avant is 'État minimal avant l''action — jamais un secret, jamais un contenu de prospect.';
comment on column public.journal_direction.apres is 'État minimal après l''action — mêmes règles.';
create index if not exists journal_direction_cree_idx    on public.journal_direction (cree_le desc);
create index if not exists journal_direction_artisan_idx on public.journal_direction (artisan_id, cree_le desc);
create index if not exists journal_direction_acteur_idx  on public.journal_direction (acteur_id, cree_le desc);
alter table public.journal_direction enable row level security;
drop policy if exists journal_direction_fondateurs_lecture on public.journal_direction;
revoke all on public.journal_direction from public, anon, authenticated;

create or replace function public.journal_direction_immuable() returns trigger language plpgsql as $fn$
begin
  if tg_op = 'UPDATE' then
    -- Une seule modification tolérée : la nullification d'une clé étrangère par « on delete set null » quand le
    -- compte cité est supprimé. Sans cette exception, supprimer un compte échouait (le trigger refusait l'UPDATE
    -- que Postgres exécute pour la contrainte) : plus aucun compte de test ni de purge RGPD ne passait.
    if (to_jsonb(new) - 'acteur_id' - 'artisan_id') = (to_jsonb(old) - 'acteur_id' - 'artisan_id')
       and (new.acteur_id is null or new.acteur_id is not distinct from old.acteur_id)
       and (new.artisan_id is null or new.artisan_id is not distinct from old.artisan_id) then
      return new;
    end if;
    raise exception 'journal_direction : une ligne de journal ne se modifie pas';
  end if;
  -- Conservation 24 mois — sauf les lignes des comptes de TEST (@presti-test.invalid), que les suites purgent.
  if tg_op = 'DELETE' and old.cree_le > now() - interval '24 months'
     and coalesce(old.acteur_email, '') not like '%@presti-test.invalid' then
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
-- Seules les alertes ADRESSÉES À L'ENTREPRISE sont gardées ici (revue du 07/09) : celles qui partent à un
-- artisan sont des emails, elles n'ont rien à faire dans la file de Benj — et elles portaient son adresse.
create table if not exists public.alertes (
  id            uuid primary key default gen_random_uuid(),
  motif         text not null,
  cle           text,
  gravite       text not null default 'attention' check (gravite in ('info', 'attention', 'critique')),
  sujet         text not null,
  corps         text,
  source        text,
  artisan_id    uuid references public.artisans(id) on delete cascade,
  acquittee_le  timestamptz,
  acquittee_par uuid references public.artisans(id) on delete set null,
  cree_le       timestamptz not null default now()
);
comment on table public.alertes is 'Alertes destinées à l''entreprise (lib/alertes.ts), gardées pour « À faire » (v10 §2.1) : une par motif+clé+jour. L''artisan concerné est référencé par artisan_id : sa suppression emporte la ligne (RGPD). Acquittement journalisé, pas re-confirmé.';
comment on column public.alertes.artisan_id is 'L''artisan concerné, quand il y en a un — la ligne disparaît avec son compte (on delete cascade).';
create index if not exists alertes_ouvertes_idx on public.alertes (cree_le desc) where acquittee_le is null;
create unique index if not exists alertes_jour_idx on public.alertes (motif, coalesce(cle, '-'), ((cree_le at time zone 'UTC')::date));
alter table public.alertes enable row level security;
drop policy if exists alertes_fondateurs_lecture on public.alertes;
revoke all on public.alertes from public, anon, authenticated;

-- ── 4. Les rôles : direction (tout) ou lecture (Alexandre, art. 7 du contrat) ─────────────────────────
-- Sans ligne, un fondateur (is_founder) est `direction`. La ligne `lecture` restreint.
create table if not exists public.direction_roles (
  user_id  uuid primary key references public.artisans(id) on delete cascade,
  role     text not null check (role in ('direction', 'lecture')),
  maj_le   timestamptz not null default now(),
  maj_par  uuid references public.artisans(id) on delete set null
);
comment on table public.direction_roles is 'Rôle d''un fondateur dans le Centre de direction (v10 §2.7) : direction = lecture + écriture ; lecture = clients, abonnements, registre des apports, messagerie assignée, relevés — aucune écriture, et ni les adresses IP du journal ni les bans. Service seul.';
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
revoke all on public.reglages_globaux from public, anon, authenticated;

-- ── 6. Action + journal dans la MÊME transaction ──────────────────────────────────────────────────────
-- Sans elles, une panne entre l'action et son journal laissait soit un ban sans trace, soit une trace sans
-- ban (le rappel de l'état d'avant pouvant lui-même échouer, en silence). Une fonction plpgsql = une
-- transaction : les deux écritures tiennent ou aucune. Elles rendent l'identifiant de la ligne de journal.

-- `p_cible` est le PSEUDONYME de l'adresse bannie (lib/security.ts) : le journal vit 24 mois, `ip_bans` douze —
-- l'adresse d'un visiteur n'a pas à lui survivre. Celle de l'ACTEUR, elle, reste en clair : c'est la preuve.
create or replace function public.bannir_ip(
  p_acteur uuid, p_acteur_email text, p_ip text, p_cible text, p_raison text, p_expire timestamptz,
  p_ip_acteur text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_avant jsonb; v_apres jsonb; v_journal uuid;
begin
  select to_jsonb(b) - 'created_at' into v_avant from public.ip_bans b where b.ip = p_ip;
  insert into public.ip_bans (ip, raison, auto, expires_le)
    values (p_ip, p_raison, false, p_expire)
    on conflict (ip) do update set raison = excluded.raison, auto = false, expires_le = excluded.expires_le;
  select to_jsonb(b) - 'created_at' into v_apres from public.ip_bans b where b.ip = p_ip;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'ban_ip', 'ip', p_cible,
            case when v_avant is null then null else jsonb_set(v_avant, '{ip}', to_jsonb(p_cible)) end,
            jsonb_set(v_apres, '{ip}', to_jsonb(p_cible)), p_ip_acteur, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('journal', v_journal, 'avant', v_avant, 'apres', v_apres);
end $$;
revoke all on function public.bannir_ip(uuid, text, text, text, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.bannir_ip(uuid, text, text, text, text, timestamptz, text, text) to service_role;

create or replace function public.debannir_ip(
  p_acteur uuid, p_acteur_email text, p_ip text, p_cible text, p_ip_acteur text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_avant jsonb; v_journal uuid;
begin
  select to_jsonb(b) - 'created_at' into v_avant from public.ip_bans b where b.ip = p_ip;
  if v_avant is null then return jsonb_build_object('etat', 'absent'); end if;
  delete from public.ip_bans where ip = p_ip;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'deban_ip', 'ip', p_cible, jsonb_set(v_avant, '{ip}', to_jsonb(p_cible)), null, p_ip_acteur, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'journal', v_journal, 'avant', v_avant);
end $$;
revoke all on function public.debannir_ip(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.debannir_ip(uuid, text, text, text, text, text) to service_role;

create or replace function public.acquitter_alerte(
  p_acteur uuid, p_acteur_email text, p_alerte uuid, p_ip_acteur text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_alerte public.alertes%rowtype; v_journal uuid;
begin
  select * into v_alerte from public.alertes where id = p_alerte for update;
  if not found then return jsonb_build_object('etat', 'inconnue'); end if;
  if v_alerte.acquittee_le is not null then return jsonb_build_object('etat', 'deja'); end if;
  update public.alertes set acquittee_le = now(), acquittee_par = p_acteur where id = p_alerte;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'alerte_acquittee', 'alerte', p_alerte::text, v_alerte.artisan_id,
            jsonb_build_object('acquittee_le', null, 'motif', v_alerte.motif, 'sujet', v_alerte.sujet),
            jsonb_build_object('acquittee_le', now(), 'acquittee_par', p_acteur), p_ip_acteur, p_agent, false)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'journal', v_journal);
end $$;
revoke all on function public.acquitter_alerte(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.acquitter_alerte(uuid, text, uuid, text, text) to service_role;

-- ── 7. Le rôle de départ ──────────────────────────────────────────────────────────────────────────────
-- Sans ligne, un fondateur est « direction » (lib/direction/garde.ts) : on inscrit explicitement les fondateurs
-- actuels, pour que le rôle soit une décision écrite et non un défaut. Une personne à qui l'on veut donner la
-- LECTURE seule reçoit ensuite sa ligne — mais tant que le rôle exige `is_founder`, elle hérite aussi des
-- policies fondateur de 0004/0006 (devis, leads et factures de TOUS les artisans) : à découpler avant d'ouvrir
-- cet accès à quelqu'un d'autre que Benj (chantier du J5).
insert into public.direction_roles (user_id, role)
  select id, 'direction' from public.artisans where is_founder = true
  on conflict (user_id) do nothing;
