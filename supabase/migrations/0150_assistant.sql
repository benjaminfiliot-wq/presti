-- 0150 · L'assistant de gestion de la console (plans/016-assistant.md, jalons A1 lecture et A2 brouillons).
-- Écrite le 12/10/2026, APPLIQUÉE en production le 12/10/2026 (connecteur Supabase) et contrôlée : RLS, politiques, fonctions réservées au service,
-- essai sans trace du plafond (1, 2, -1, 1, -2 puis rollback ; 0 ligne restante). Le drapeau `assistant` reste baissé jusqu'à la recette A5.
-- Numéro : 0150, choisi au-dessus de la plus haute migration du dépôt (0140) pour laisser 0141 et suivantes au chantier
-- du CRM, mené en parallèle (sa 0141_crm_atelier.sql existe déjà dans sa copie).
--
--  1. assistant_conversations : une ligne par conversation avec l'assistant, et son nombre de tours. Le plafond (20 tours,
--     décision de Benj du 12/10, plan §9.2) se décide ICI, dans une seule instruction : deux messages envoyés en même temps
--     ne peuvent pas faire un 21e tour.
--  2. assistant_journal : une ligne par appel d'outil — qui (le compte), quel outil, les entrées RÉSUMÉES, le résultat
--     (ok, refus, erreur), une phrase, et l'objet préparé (devis, conversation). Écrit par le service seulement (la route) ;
--     l'artisan LIT son journal, et seulement le sien ; personne ne le modifie depuis un navigateur.
--  3. assistant_prendre_tour / assistant_rendre_tour : réservées au service (révoquées pour anon et authenticated).
--  4. La garde de session de 0138 posée sur les deux tables neuves (sa boucle ne couvre que les tables qui existaient).
--
-- RGPD : les deux tables cascadent avec le compte ; lib/purgeComptes.ts vide le journal à l'anonymisation et
-- app/api/donnees/export le joint à l'export (une table absente y est tolérée). Même durée que les autres données du compte.
--
-- Requêtes de contrôle, à jouer APRÈS application (attendu entre crochets) :
--   select relname, relrowsecurity from pg_class where relname in ('assistant_conversations', 'assistant_journal');
--     [2 lignes, relrowsecurity = true]
--   select tablename, policyname, permissive, cmd from pg_policies where tablename in ('assistant_conversations', 'assistant_journal') order by 1, 2;
--     [assistant_conversations : assistant_conversations_lecture (select) + les 4 gardes restrictives ;
--      assistant_journal : assistant_journal_lecture (select) + les 4 gardes restrictives ; aucune politique insert/update/delete permissive]
--   select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as auth, has_function_privilege('anon', p.oid, 'execute') as anon
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'assistant\_%';
--     [assistant_prendre_tour et assistant_rendre_tour : auth = false, anon = false]
--   Essai sans trace (dans une transaction annulée), avec un artisan existant :
--     begin;
--       select public.assistant_prendre_tour('<uuid artisan>', '00000000-0000-4000-8000-0000000000aa', 2);  [1]
--       select public.assistant_prendre_tour('<uuid artisan>', '00000000-0000-4000-8000-0000000000aa', 2);  [2]
--       select public.assistant_prendre_tour('<uuid artisan>', '00000000-0000-4000-8000-0000000000aa', 2);  [-1 : plafond]
--       select public.assistant_rendre_tour('<uuid artisan>', '00000000-0000-4000-8000-0000000000aa');      [1]
--       select public.assistant_prendre_tour('<uuid autre artisan>', '00000000-0000-4000-8000-0000000000aa', 2); [-2 : autre compte]
--     rollback;

-- 1 ─ Conversations et plafond de tours
create table if not exists public.assistant_conversations (
  id          uuid primary key,
  artisan_id  uuid not null references public.artisans(id) on delete cascade,
  tours       integer not null default 0 check (tours >= 0 and tours <= 100),
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);
create index if not exists assistant_conversations_artisan on public.assistant_conversations (artisan_id, maj_le desc);
alter table public.assistant_conversations enable row level security;
drop policy if exists assistant_conversations_lecture on public.assistant_conversations;
create policy assistant_conversations_lecture on public.assistant_conversations for select
  using (auth.uid() = artisan_id);

-- 2 ─ Journal des appels d'outils
create table if not exists public.assistant_journal (
  id               uuid primary key default gen_random_uuid(),
  artisan_id       uuid not null references public.artisans(id) on delete cascade,
  conversation_id  uuid not null,
  tour             integer not null check (tour between 1 and 100),
  outil            text not null check (char_length(outil) between 1 and 60),
  entrees          jsonb not null default '{}'::jsonb check (jsonb_typeof(entrees) = 'object' and pg_column_size(entrees) <= 2000),
  resultat         text not null check (resultat in ('ok', 'refus', 'erreur')),
  resume           text not null check (char_length(resume) between 1 and 300),
  objet_type       text check (objet_type is null or objet_type in ('devis', 'conversation')),
  objet_id         uuid,
  cree_le          timestamptz not null default now(),
  constraint assistant_journal_objet check ((objet_type is null) = (objet_id is null))
);
create index if not exists assistant_journal_artisan on public.assistant_journal (artisan_id, cree_le desc);
create index if not exists assistant_journal_conversation on public.assistant_journal (conversation_id, cree_le);
alter table public.assistant_journal enable row level security;
-- L'artisan lit SON journal. Aucune politique d'écriture : seul le service (la route) écrit, et rien ne se modifie.
drop policy if exists assistant_journal_lecture on public.assistant_journal;
create policy assistant_journal_lecture on public.assistant_journal for select
  using (auth.uid() = artisan_id);

comment on table public.assistant_journal is
  'Journal de l''assistant de gestion (0150) : une ligne par appel d''outil (entrées résumées, résultat, objet préparé). Écrit par le service, lu par l''artisan sous RLS.';

-- 3 ─ Le plafond, en une instruction
-- Rend le numéro du tour pris (1..p_max), -1 si le plafond est atteint, -2 si la conversation appartient à un autre compte.
create or replace function public.assistant_prendre_tour(p_artisan uuid, p_conversation uuid, p_max integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_artisan is null or p_conversation is null or p_max is null or p_max < 1 then
    raise exception 'assistant_prendre_tour : paramètres invalides';
  end if;
  insert into public.assistant_conversations (id, artisan_id, tours) values (p_conversation, p_artisan, 0)
  on conflict (id) do nothing;
  update public.assistant_conversations
     set tours = tours + 1, maj_le = now()
   where id = p_conversation and artisan_id = p_artisan and tours < p_max
  returning tours into n;
  if n is not null then
    return n;
  end if;
  if exists (select 1 from public.assistant_conversations where id = p_conversation and artisan_id = p_artisan) then
    return -1;
  end if;
  return -2;
end;
$$;

-- Rend un tour (le modèle a échoué : le tour n'a pas eu lieu). Rend le nombre de tours pris après restitution, -2 si inconnu.
create or replace function public.assistant_rendre_tour(p_artisan uuid, p_conversation uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.assistant_conversations
     set tours = greatest(tours - 1, 0), maj_le = now()
   where id = p_conversation and artisan_id = p_artisan
  returning tours into n;
  return coalesce(n, -2);
end;
$$;

revoke all on function public.assistant_prendre_tour(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.assistant_rendre_tour(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assistant_prendre_tour(uuid, uuid, integer) to service_role;
grant execute on function public.assistant_rendre_tour(uuid, uuid) to service_role;

-- 4 ─ La garde de session (0138) sur les deux tables neuves : mêmes quatre politiques restrictives, mêmes fonctions.
do $$
declare t text;
begin
  foreach t in array array['assistant_conversations', 'assistant_journal'] loop
    execute format('drop policy if exists garde_session on public.%I', t);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated
                      using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated
                      with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated
                      using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated
                      using ((select public.compte_non_suspendu()))', t);
  end loop;
end $$;

-- Marche arrière :
--   drop function if exists public.assistant_prendre_tour(uuid, uuid, integer);
--   drop function if exists public.assistant_rendre_tour(uuid, uuid);
--   drop table if exists public.assistant_journal;
--   drop table if exists public.assistant_conversations;
