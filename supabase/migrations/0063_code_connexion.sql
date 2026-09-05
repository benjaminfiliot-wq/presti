-- 0063 — Un code par email à la connexion (prompt v7, bloc 2).
--
-- Ce que ça pose :
--  • `codes_connexion`     : le code en attente d'un compte (haché, jamais en clair), sa date
--                            d'expiration (10 min) et le nombre d'essais (5 max). Une ligne par
--                            compte : demander un nouveau code remplace l'ancien.
--  • `sessions_verifiees`  : les sessions Supabase qui ONT passé le code (ou un appareil de
--                            confiance). Le contrôle est PAR SESSION, pas par compte : une date
--                            unique « dernière vérification » sur l'artisan laisserait passer un
--                            jeton obtenu avec le mot de passe volé dès que le vrai titulaire se
--                            reconnecte — avec la table, chaque session prouve la sienne.
--  • `appareils_confiance` : « se souvenir de cet appareil 30 jours » — l'empreinte est le hash
--                            de l'agent du navigateur et d'un secret aléatoire porté par le cookie
--                            (jamais l'adresse IP seule) ; révocables un à un dans Sécurité.
--  • `artisans.connexion_verifiee_le` : la dernière vérification réussie, pour l'affichage.
--
-- Aucune politique RLS : ces tables ne se lisent et ne s'écrivent que par les routes de Presti
-- (clé service). Le navigateur n'y touche jamais, même avec un jeton valide.

create table if not exists public.codes_connexion (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  hash_code text not null,
  expire_le timestamptz not null,
  essais    int not null default 0,
  cree_le   timestamptz not null default now()
);

create table if not exists public.sessions_verifiees (
  session_id  uuid primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  moyen       text not null check (moyen in ('code_email', 'appareil', 'service')),
  verifiee_le timestamptz not null default now()
);
create index if not exists sessions_verifiees_user_idx on public.sessions_verifiees(user_id);

create table if not exists public.appareils_confiance (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  empreinte        text not null,
  nom              text not null,
  cree_le          timestamptz not null default now(),
  expire_le        timestamptz not null,
  dernier_usage_le timestamptz,
  revoque_le       timestamptz
);
create index if not exists appareils_confiance_user_idx on public.appareils_confiance(user_id);

alter table public.artisans add column if not exists connexion_verifiee_le timestamptz;

alter table public.codes_connexion     enable row level security;
alter table public.sessions_verifiees  enable row level security;
alter table public.appareils_confiance enable row level security;
revoke all on public.codes_connexion, public.sessions_verifiees, public.appareils_confiance from anon, authenticated;

-- La vérification d'un code, en UNE instruction : lire, comparer, compter l'essai, effacer —
-- c'est Postgres qui sérialise. Deux essais en parallèle ne peuvent pas « partager » le même
-- compteur (même leçon que consommer_limite, migration 0049).
-- Rend : 'ok' (code juste, effacé — usage unique) · 'absent' · 'expire' · 'epuise' (5 refus,
-- effacé : il faut un nouveau code) · 'faux:<essais restants>'.
create or replace function public.verifier_code_connexion(p_user uuid, p_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.codes_connexion%rowtype;
begin
  select * into c from public.codes_connexion where user_id = p_user for update;
  if not found then return 'absent'; end if;
  if c.expire_le < now() then
    delete from public.codes_connexion where user_id = p_user;
    return 'expire';
  end if;
  if c.essais >= 5 then
    delete from public.codes_connexion where user_id = p_user;
    return 'epuise';
  end if;
  if c.hash_code = p_hash then
    delete from public.codes_connexion where user_id = p_user;
    return 'ok';
  end if;
  if c.essais + 1 >= 5 then
    delete from public.codes_connexion where user_id = p_user;
    return 'epuise';
  end if;
  update public.codes_connexion set essais = essais + 1 where user_id = p_user;
  return 'faux:' || (5 - c.essais - 1)::text;
end
$$;
revoke all on function public.verifier_code_connexion(uuid, text) from public, anon, authenticated;
grant execute on function public.verifier_code_connexion(uuid, text) to service_role;

comment on table public.codes_connexion is 'Code de connexion en attente (haché, 10 min, 5 essais) — v7 bloc 2.';
comment on table public.sessions_verifiees is 'Sessions Supabase ayant passé le code email ou un appareil de confiance — lib/authArtisan refuse les autres.';
comment on table public.appareils_confiance is '« Se souvenir de cet appareil 30 jours » : empreinte = sha256(agent | secret du cookie).';
