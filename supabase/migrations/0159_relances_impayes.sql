-- 0159 · Relances automatiques des factures impayées (offre : lib/plans.ts, capacité `factures.relances`).
-- Écrite le 15/10/2026, NON APPLIQUÉE. Le drapeau lib/flags.ts `relancesImpayes` ne doit pas être déployé levé avant elle : sans ces
-- tables, GET/PUT /api/factures/relances-auto répondent 503 et le passage quotidien le note sans rien envoyer (fail-closed).
--
--  1. relances_impayes_reglages : une ligne par artisan. DÉSACTIVÉ par défaut (opt-in). Calendrier en jours après l'échéance
--     (défaut J+3, J+10, J+21) et textes modifiables (clé absente = texte par défaut de lib/relancesImpayes.ts).
--  2. relances_impayes : le JOURNAL. Une ligne est PRISE avant l'envoi (clé unique facture + rang : un second passage, rejoué ou
--     simultané, n'envoie rien), puis confirmée ; un envoi refusé la supprime et la relance repart au passage suivant.
--     Deuxième verrou : jamais deux relances le même jour au même destinataire d'un même artisan.
--  3. relances_impayes_arrets : une facture dont les relances sont arrêtées (par l'artisan, ou parce que le client a répondu) ; reprise_le
--     non nul = l'artisan les a reprises.
--
-- Écrites et lues par le service (route + tâche planifiée) ; l'artisan ne lit que SES lignes.

create or replace function public.relances_jours_valides(j integer[]) returns boolean
language sql immutable as $$
  select j is not null
    and cardinality(j) between 1 and 3
    and j[1] between 1 and 90
    and (cardinality(j) < 2 or (j[2] between 1 and 90 and j[2] - j[1] >= 2))
    and (cardinality(j) < 3 or (j[3] between 1 and 90 and j[3] - j[2] >= 2));
$$;

create table if not exists public.relances_impayes_reglages (
  artisan_id  uuid primary key references public.artisans(id) on delete cascade,
  actif       boolean not null default false,
  jours       integer[] not null default '{3,10,21}',
  textes      jsonb not null default '{}'::jsonb,
  actif_depuis date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint relances_impayes_jours check (public.relances_jours_valides(jours)),
  constraint relances_impayes_textes check (jsonb_typeof(textes) = 'object' and pg_column_size(textes) <= 8000)
);
alter table public.relances_impayes_reglages enable row level security;
drop policy if exists relances_impayes_reglages_own on public.relances_impayes_reglages;
create policy relances_impayes_reglages_own on public.relances_impayes_reglages for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);
create index if not exists relances_impayes_reglages_actifs on public.relances_impayes_reglages (artisan_id) where actif;

create table if not exists public.relances_impayes (
  id           uuid primary key default gen_random_uuid(),
  facture_id   uuid not null references public.factures(id) on delete cascade,
  artisan_id   uuid not null references public.artisans(id) on delete cascade,
  rang         smallint not null check (rang between 1 and 3),
  jour         date not null,
  destinataire text not null check (char_length(destinataire) <= 254 and destinataire = lower(destinataire)),
  statut       text not null default 'prise' check (statut in ('prise', 'envoyee')),
  prise_le     timestamptz not null default now(),
  envoyee_le   timestamptz,
  constraint relances_impayes_une_par_rang unique (facture_id, rang),
  constraint relances_impayes_un_par_jour unique (artisan_id, destinataire, jour)
);
alter table public.relances_impayes enable row level security;
drop policy if exists relances_impayes_lecture on public.relances_impayes;
create policy relances_impayes_lecture on public.relances_impayes for select using (auth.uid() = artisan_id);
create index if not exists relances_impayes_artisan_jour on public.relances_impayes (artisan_id, jour);

create table if not exists public.relances_impayes_arrets (
  facture_id uuid primary key references public.factures(id) on delete cascade,
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  raison     text not null check (raison in ('artisan', 'reponse_client')),
  le         timestamptz not null default now(),
  -- Reprise par l'artisan : l'arrêt cesse (reprise_le non nul) et une réponse du client ne compte plus qu'à partir de ce moment.
  reprise_le timestamptz
);
alter table public.relances_impayes_arrets enable row level security;
drop policy if exists relances_impayes_arrets_lecture on public.relances_impayes_arrets;
create policy relances_impayes_arrets_lecture on public.relances_impayes_arrets for select using (auth.uid() = artisan_id);
create index if not exists relances_impayes_arrets_artisan on public.relances_impayes_arrets (artisan_id);

-- Une ligne de journal ou d'arrêt ne peut viser que la facture DU MÊME artisan, même par la clé de service.
create or replace function public.relances_impayes_coherence() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.factures f where f.id = new.facture_id and f.artisan_id = new.artisan_id) then
    raise exception 'relances_impayes : la facture n''appartient pas à cet artisan';
  end if;
  return new;
end;
$$;
drop trigger if exists relances_impayes_coherence on public.relances_impayes;
create trigger relances_impayes_coherence before insert or update of facture_id, artisan_id on public.relances_impayes
  for each row execute function public.relances_impayes_coherence();
drop trigger if exists relances_impayes_arrets_coherence on public.relances_impayes_arrets;
create trigger relances_impayes_arrets_coherence before insert or update of facture_id, artisan_id on public.relances_impayes_arrets
  for each row execute function public.relances_impayes_coherence();

-- Ajout du 15/10 à l'application : gardes de session et de suspension (0138/0151) et rien pour anon, comme les autres tables.
do $$
declare t text;
begin
  foreach t in array array['relances_impayes_reglages', 'relances_impayes', 'relances_impayes_arrets'] loop
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists garde_session on public.%I', t);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated using ((select public.compte_non_suspendu()))', t);
  end loop;
end $$;
revoke insert, update, delete on public.relances_impayes, public.relances_impayes_arrets from authenticated;
