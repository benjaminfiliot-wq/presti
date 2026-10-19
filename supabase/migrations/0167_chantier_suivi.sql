-- 0167 · CRM : le LIEN DE SUIVI d'un chantier pour le client (plan plans/crm-idees-twenty-1810.md, n°8, version 3).
-- Écrite le 19/10/2026. ⏳ NON APPLIQUÉE : essai à sec d'abord (DO + EXECUTE + raise exception), puis application, puis les
-- contrôles du bas, puis `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-lot5-qa.mjs`.
-- Idempotente et additive : une table neuve, rien d'existant n'est modifié.
--
-- chantier_suivi : au plus UN lien par chantier. Le jeton (32 octets aléatoires, base64url) est remis UNE fois à l'artisan, qui le
-- transmet à son client ; la base n'en garde que l'EMPREINTE SHA-256 (comme crm_agenda, 0164). La page publique /suivi/<jeton>
-- montre l'avancement pièce par pièce, en lecture seule, SANS prix, sans adresse, sans nom de client ni de compagnon.
-- Renouveler le lien remplace l'empreinte (l'ancien lien meurt) ; le révoquer supprime la ligne. Le chantier supprimé emporte
-- son lien. Un déclencheur refuse un chantier d'un AUTRE artisan, clé de service comprise.
-- RLS active SANS politique : aucune lecture ni écriture pour `anon` ni `authenticated` ; tout passe par la clé de service, après
-- garde (routes /api/crm/chantiers/<id>/suivi) ou après vérification du jeton, de l'offre et de la suspension (page publique).

create table if not exists public.chantier_suivi (
  chantier_id       uuid primary key references public.chantiers(id) on delete cascade,
  artisan_id        uuid not null references public.artisans(id) on delete cascade,
  jeton_empreinte   text not null unique check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  cree_le           timestamptz not null default now(),
  dernier_acces_le  timestamptz
);
create index if not exists chantier_suivi_artisan_idx on public.chantier_suivi (artisan_id);

create or replace function public.crm_suivi_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if tg_op = 'UPDATE' and (new.artisan_id is distinct from old.artisan_id or new.chantier_id is distinct from old.chantier_id) then
    raise exception 'crm : un lien de suivi ne change ni de compte ni de chantier';
  end if;
  return new;
end $fn$;
drop trigger if exists crm_suivi_verifier on public.chantier_suivi;
create trigger crm_suivi_verifier before insert or update on public.chantier_suivi
  for each row execute function public.crm_suivi_verifier();

alter table public.chantier_suivi enable row level security;
revoke all on public.chantier_suivi from anon;
revoke all on public.chantier_suivi from authenticated;

-- Contrôles (résultats attendus entre crochets) :
-- select relrowsecurity from pg_class where oid = 'public.chantier_suivi'::regclass;   -- [true]
-- select count(*) from pg_policies where schemaname = 'public' and tablename = 'chantier_suivi';   -- [0]
-- select has_table_privilege('anon', 'public.chantier_suivi', 'select');   -- [false]
-- select has_table_privilege('authenticated', 'public.chantier_suivi', 'select');   -- [false]
-- select count(*) from pg_trigger where tgrelid = 'public.chantier_suivi'::regclass and tgname = 'crm_suivi_verifier';   -- [1]
