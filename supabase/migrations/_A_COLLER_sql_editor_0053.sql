-- Presti — migration 0053 (persona + apparence de la plateforme) à coller dans Supabase → SQL Editor → Run.

-- 0053 — Persona et apparence avancée de la plateforme (sprint J-1 §9 G2).
--
-- Deux familles de colonnes sur `plateforme_config`, et une seule règle de sécurité :
--
--  1. PERSONA (écrite par l'artisan depuis son navigateur, RLS existante « sa ligne ») :
--     `style_exemples` : 3 messages qu'il a écrits lui-même → l'assistant en tire le TON
--       (injectés comme EXEMPLES DE TON dans le prompt, jamais comme des faits).
--     `formule_ouverture`, `formule_cloture`, `vouvoiement`, `emojis`, `longueur`.
--
--  2. APPARENCE AVANCÉE (écrite par le SERVEUR seulement, /api/plateforme/apparence) :
--     `apparence` (jsonb, ne contient que ce qui diffère du défaut — lib/plateformeStyle),
--     `avatar_url`, et `amorces` qui existait déjà mais devient réservée à l'offre Studio+.
--     Ces trois colonnes sont FIGÉES côté navigateur par un déclencheur : le verrou d'offre
--     (`peut(plan, 'plateforme.personnalisation_avancee')`) vit dans la route, et un jeton
--     d'artisan Essentiel ne doit pas pouvoir le contourner en écrivant directement dans
--     PostgREST — c'est exactement la faille corrigée en 0045 sur `artisans.domaine`.

alter table public.plateforme_config
  add column if not exists avatar_url text,
  add column if not exists style_exemples text[] not null default '{}'::text[],
  add column if not exists formule_ouverture text,
  add column if not exists formule_cloture text,
  add column if not exists vouvoiement boolean not null default true,
  add column if not exists emojis boolean not null default false,
  add column if not exists longueur text not null default 'moyenne',
  add column if not exists apparence jsonb not null default '{}'::jsonb;

-- Bornes : une valeur hors liste ne peut pas entrer, quel que soit le chemin d'écriture.
alter table public.plateforme_config drop constraint if exists plateforme_config_longueur_chk;
alter table public.plateforme_config add constraint plateforme_config_longueur_chk
  check (longueur in ('courte', 'moyenne', 'longue'));
alter table public.plateforme_config drop constraint if exists plateforme_config_style_exemples_chk;
alter table public.plateforme_config add constraint plateforme_config_style_exemples_chk
  check (coalesce(array_length(style_exemples, 1), 0) <= 5);
alter table public.plateforme_config drop constraint if exists plateforme_config_apparence_chk;
alter table public.plateforme_config add constraint plateforme_config_apparence_chk
  check (jsonb_typeof(apparence) = 'object' and pg_column_size(apparence) < 8192);

comment on column public.plateforme_config.style_exemples is
  'Jusqu''à 5 messages écrits par l''artisan lui-même. Injectés dans le prompt comme EXEMPLES DE TON (formules, rythme, tutoiement) — jamais comme des faits.';
comment on column public.plateforme_config.formule_ouverture is 'Formule d''ouverture de l''assistant au premier message d''un échange (facultative).';
comment on column public.plateforme_config.formule_cloture is 'Formule de clôture de l''assistant quand il propose la suite (facultative).';
comment on column public.plateforme_config.vouvoiement is 'true = l''assistant vouvoie le client (défaut) ; false = il tutoie.';
comment on column public.plateforme_config.emojis is 'L''assistant a le droit d''utiliser un émoji de temps en temps.';
comment on column public.plateforme_config.longueur is 'Longueur des réponses : courte | moyenne | longue.';
comment on column public.plateforme_config.avatar_url is 'Avatar de l''assistant sur la page de conversation (bucket artisan-media). NULL = logo/photo de l''artisan. Écrit par le serveur seulement (offre Studio+).';
comment on column public.plateforme_config.apparence is
  'Apparence avancée de la page de conversation, résolue par lib/plateformeStyle.ts. Ne contient QUE ce qui diffère du défaut : {} = rendu inchangé. Écrit par le serveur seulement (offre Studio+).';

-- Colonnes figées côté navigateur : le verrou d'offre est appliqué par la route serveur.
create or replace function public.lock_plateforme_config_avancee()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    if tg_op = 'UPDATE' then
      new.apparence := old.apparence;
      new.avatar_url := old.avatar_url;
      new.amorces := old.amorces;
    else
      -- Une ligne créée depuis le navigateur part du défaut : rien d'avancé sans passer par la route.
      new.apparence := '{}'::jsonb;
      new.avatar_url := null;
      new.amorces := null;
    end if;
  end if;
  return new;
end $$;

comment on function public.lock_plateforme_config_avancee() is
  'Colonnes de plateforme_config que l''artisan ne peut PAS modifier depuis son navigateur (apparence, avatar_url, amorces) : elles sont réservées à l''offre Studio+ et passent par /api/plateforme/apparence.';

drop trigger if exists plateforme_config_lock_avancee on public.plateforme_config;
create trigger plateforme_config_lock_avancee
  before insert or update on public.plateforme_config
  for each row execute function public.lock_plateforme_config_avancee();

select 'apparence' as objet, count(*) as ok from information_schema.columns where table_name='plateforme_config' and column_name='apparence' union all select 'style_exemples', count(*) from information_schema.columns where table_name='plateforme_config' and column_name='style_exemples';
