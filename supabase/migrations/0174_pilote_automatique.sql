-- 0174 · PILOTE AUTOMATIQUE (décision du fondateur du 21/10/2026, offre Signature, drapeau `piloteAutomatique`) et LIEN DE POINTAGE
-- d'un chantier pour un compagnon (drapeau `crmPointage`).
-- Écrite le 21/10/2026. ✅ APPLIQUÉE le 21/10/2026 (contrôle 9/9 vert). Ordre suivi : essai à sec d'abord, puis application, puis supabase/controles/0174_pilote_automatique.sql,
-- puis `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/pilote-qa.mjs` et scripts/avancement-qa.mjs.
-- ORDRE : on colle la migration, PUIS on lève les drapeaux (lib/flags.ts). Idempotente et additive : trois tables neuves, rien
-- d'existant n'est modifié.
--
-- 1 ─ pilote_reglages : UNE ligne par compte. `actif` (l'interrupteur général) et `types` (une case par type d'action, objet jsonb
--     de booléens ; les clés inconnues sont ignorées par lib/pilote/regles.ts lireReglagesPilote). Absent = coupé.
-- 2 ─ actions_auto : la FILE du pilote, et son JOURNAL. Une ligne = une action préparée (carte de l'assistant, ou réponse proposée)
--     qui partira seule à `part_le` (= prete_le + 10 min) sauf annulation. Statuts : a_partir → en_cours (réclamée par le passage
--     de /api/agents/tic, en une instruction) → partie | echec | annulee | manuel (renvoyée à la validation manuelle : garde-fou).
--     IDEMPOTENCE : unique (artisan_id, cle), cle = '<source>:<ref_id>' — un même objet n'entre qu'une fois dans la file.
-- 3 ─ chantier_pointage : au plus UN lien de pointage par chantier (modèle : chantier_suivi, 0167). Le jeton (32 octets aléatoires,
--     base64url) est remis UNE fois à l'artisan, qui le donne à son compagnon ; la base n'en garde que l'EMPREINTE SHA-256. La page
--     /pointage/<jeton> liste les tâches restantes du chantier ; le compagnon coche « fait » en fin de journée (sans compte).
-- Les trois : RLS active SANS politique, aucun droit pour `anon` ni `authenticated` ; tout passe par la clé de service, après garde
-- (routes /api/pilote/*, /api/crm/chantiers/<id>/pointage) ou après vérification du jeton (page publique de pointage).
-- Un déclencheur refuse, clé de service comprise, une ligne rattachée au chantier d'un AUTRE artisan.

create table if not exists public.pilote_reglages (
  artisan_id  uuid primary key references public.artisans(id) on delete cascade,
  actif       boolean not null default false,
  types       jsonb not null default '{}'::jsonb check (jsonb_typeof(types) = 'object'),
  maj_le      timestamptz not null default now()
);

create table if not exists public.actions_auto (
  id          uuid primary key default gen_random_uuid(),
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  type        text not null check (type in ('reponse_prospect', 'relance_devis', 'relance_impaye', 'envoi_devis', 'envoi_facture', 'assistant_client')),
  source      text not null check (source in ('carte', 'proposition')),
  ref_id      uuid not null,
  lead_id     uuid references public.leads(id) on delete cascade,
  libelle     text not null check (char_length(libelle) between 1 and 200),
  prete_le    timestamptz not null default now(),
  part_le     timestamptz not null,
  statut      text not null default 'a_partir' check (statut in ('a_partir', 'en_cours', 'annulee', 'partie', 'echec', 'manuel')),
  motif       text check (motif is null or char_length(motif) <= 300),
  traite_le   timestamptz,
  cle         text not null check (char_length(cle) <= 80),
  constraint actions_auto_cle_unique unique (artisan_id, cle),
  constraint actions_auto_delai check (part_le >= prete_le)
);
create index if not exists actions_auto_a_partir_idx on public.actions_auto (part_le) where statut = 'a_partir';
create index if not exists actions_auto_compte_idx on public.actions_auto (artisan_id, prete_le desc);
create index if not exists actions_auto_parties_idx on public.actions_auto (artisan_id, traite_le) where statut = 'partie';

create or replace function public.actions_auto_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if new.lead_id is not null and not exists (select 1 from public.leads l where l.id = new.lead_id and l.artisan_id = new.artisan_id) then
    raise exception 'pilote : conversation d un autre artisan';
  end if;
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.ref_id is distinct from old.ref_id
      or new.cle is distinct from old.cle or new.prete_le is distinct from old.prete_le or new.part_le is distinct from old.part_le) then
    raise exception 'pilote : une action en file ne change ni de compte, ni d objet, ni d heure de depart';
  end if;
  return new;
end $fn$;
drop trigger if exists actions_auto_verifier on public.actions_auto;
create trigger actions_auto_verifier before insert or update on public.actions_auto
  for each row execute function public.actions_auto_verifier();

create table if not exists public.chantier_pointage (
  chantier_id       uuid primary key references public.chantiers(id) on delete cascade,
  artisan_id        uuid not null references public.artisans(id) on delete cascade,
  jeton_empreinte   text not null unique check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  cree_le           timestamptz not null default now(),
  dernier_acces_le  timestamptz
);
create index if not exists chantier_pointage_artisan_idx on public.chantier_pointage (artisan_id);

create or replace function public.crm_pointage_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.chantier_id is distinct from old.chantier_id) then
    raise exception 'crm : un lien de pointage ne change ni de compte ni de chantier';
  end if;
  return new;
end $fn$;
drop trigger if exists crm_pointage_verifier on public.chantier_pointage;
create trigger crm_pointage_verifier before insert or update on public.chantier_pointage
  for each row execute function public.crm_pointage_verifier();

alter table public.pilote_reglages enable row level security;
alter table public.actions_auto enable row level security;
alter table public.chantier_pointage enable row level security;
revoke all on public.pilote_reglages from anon;
revoke all on public.pilote_reglages from authenticated;
revoke all on public.actions_auto from anon;
revoke all on public.actions_auto from authenticated;
revoke all on public.chantier_pointage from anon;
revoke all on public.chantier_pointage from authenticated;
