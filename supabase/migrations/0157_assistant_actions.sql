-- 0157 · L'assistant de gestion qui AGIT (plans/016-assistant.md, jalon A3 : devis, factures, tarifs, inventaire, CRM, messages).
-- Écrite le 15/10/2026, NON APPLIQUÉE (à appliquer et contrôler avant de lever le drapeau `assistant`, voir ci-dessous).
-- Sans elle, l'assistant continue de LIRE et de préparer des brouillons comme avant : aucun outil d'action n'est proposé au modèle
-- (lib/assistant/magasin.ts actionsDisponibles — fail-closed : pas d'action sans carte ni journal).
--
--  1. assistant_actions : une ligne par action de l'assistant — directe (déjà faite, avec de quoi l'annuler) ou « à confirmer »
--     (une carte qui attend le clic de l'artisan : le texte exact de l'e-mail, l'avant/après). Statuts :
--       en_attente → en_cours → executee | echec ;  en_attente → refusee | expiree ;  executee → en_cours → annulee.
--     La transition en_attente → en_cours est la RÉCLAMATION atomique (un UPDATE ... WHERE statut = 'en_attente') : un double clic,
--     deux onglets ou deux requêtes simultanées n'exécutent qu'une fois.
--     Écrite par le service seulement (la route) ; l'artisan LIT ses actions, et seulement les siennes ; personne ne les modifie
--     depuis un navigateur.
--  2. assistant_journal.objet_type : accepte les objets des actions (facture, chantier, article, tarif, tache, note, membre).
--  3. La garde de session de 0138 posée sur la table neuve (mêmes quatre politiques restrictives que 0150).
--
-- RGPD : la table cascade avec le compte ; lib/purgeComptes.ts la vide à l'anonymisation et app/api/donnees/export la joint à
-- l'export. Elle contient du texte du compte (lignes de devis, texte d'une relance) : même durée que les autres données du compte.
--
-- Requêtes de contrôle, à jouer APRÈS application (attendu entre crochets) :
--   select relname, relrowsecurity from pg_class where relname = 'assistant_actions';
--     [1 ligne, relrowsecurity = true]
--   select policyname, permissive, cmd from pg_policies where tablename = 'assistant_actions' order by 1;
--     [assistant_actions_lecture (select, permissive) + les 4 gardes restrictives (garde_session, garde_suspension_ins/maj/sup) ;
--      aucune politique insert/update/delete permissive]
--   select has_table_privilege('anon', 'public.assistant_actions', 'select') as anon_select;
--     [false : rien n'est lisible sans connexion]
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'assistant_journal_objet_type_check';
--     [la liste étendue des objets]

-- 1 ─ Les actions
create table if not exists public.assistant_actions (
  id               uuid primary key default gen_random_uuid(),
  artisan_id       uuid not null references public.artisans(id) on delete cascade,
  conversation_id  uuid not null,
  tour             integer not null check (tour between 1 and 100),
  outil            text not null check (char_length(outil) between 1 and 60),
  mode             text not null check (mode in ('direct', 'confirmation')),
  statut           text not null check (statut in ('en_attente', 'en_cours', 'executee', 'refusee', 'annulee', 'expiree', 'echec')),
  titre            text not null check (char_length(titre) between 1 and 200),
  entrees          jsonb not null default '{}'::jsonb check (jsonb_typeof(entrees) = 'object' and pg_column_size(entrees) <= 100000),
  apercu           jsonb not null default '{}'::jsonb check (jsonb_typeof(apercu) = 'object' and pg_column_size(apercu) <= 50000),
  annulation       jsonb check (annulation is null or (jsonb_typeof(annulation) = 'object' and pg_column_size(annulation) <= 150000)),
  resultat_resume  text check (resultat_resume is null or char_length(resultat_resume) <= 300),
  objet_type       text check (objet_type is null or objet_type in ('devis', 'conversation', 'facture', 'chantier', 'article', 'tarif', 'tache', 'note', 'membre')),
  objet_id         uuid,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now(),
  expire_le        timestamptz,
  constraint assistant_actions_objet check ((objet_type is null) = (objet_id is null)),
  constraint assistant_actions_confirmation check (mode = 'direct' or expire_le is not null)
);
create index if not exists assistant_actions_artisan on public.assistant_actions (artisan_id, cree_le desc);
create index if not exists assistant_actions_attente on public.assistant_actions (artisan_id) where statut = 'en_attente';
create index if not exists assistant_actions_objet_idx on public.assistant_actions (artisan_id, outil, objet_id, maj_le desc) where statut = 'executee';
alter table public.assistant_actions enable row level security;
-- L'artisan lit SES actions. Aucune politique d'écriture : seul le service (la route) écrit.
drop policy if exists assistant_actions_lecture on public.assistant_actions;
create policy assistant_actions_lecture on public.assistant_actions for select
  using (auth.uid() = artisan_id);

comment on table public.assistant_actions is
  'Actions de l''assistant de gestion (0157) : directes (faites, annulables) ou à confirmer (carte en attente du clic de l''artisan). Écrit par le service, lu par l''artisan sous RLS.';

-- 2 ─ Le journal accepte les objets des actions
alter table public.assistant_journal drop constraint if exists assistant_journal_objet_type_check;
alter table public.assistant_journal add constraint assistant_journal_objet_type_check
  check (objet_type is null or objet_type in ('devis', 'conversation', 'facture', 'chantier', 'article', 'tarif', 'tache', 'note', 'membre'));

-- 3 ─ La garde de session (0138) sur la table neuve
do $$
declare t text := 'assistant_actions';
begin
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
end $$;

-- Marche arrière :
--   drop table if exists public.assistant_actions;
--   alter table public.assistant_journal drop constraint if exists assistant_journal_objet_type_check;
--   alter table public.assistant_journal add constraint assistant_journal_objet_type_check check (objet_type is null or objet_type in ('devis', 'conversation'));
