-- 0158 · CRM : les commandes fournisseur (livraison en retard, « relancer le fournisseur ») + le TEMPS RÉEL de l'écran CRM.
-- Écrite le 15/10/2026. ⏳ NON APPLIQUÉE : à appliquer par Benj (essai à sec d'abord, puis contrôles du bas, puis
-- `node scripts/crm-temps-reel-qa.mjs` qui prouve l'évènement reçu entre deux clients).
-- Idempotente et additive : aucune colonne existante n'est modifiée, aucune ligne existante n'est réécrite.
--
-- 1 ─ commandes_fournisseur : une commande PASSÉE par l'artisan chez un fournisseur (rien n'est commandé par Presti : la
--     ligne enregistre ce que l'artisan dit avoir commandé, avec la date de livraison annoncée). C'est elle qui permet de
--     dire, avec des données et non à l'estime, « livraison en retard » : statut 'commandee' et livraison_prevue passée.
--     Les lignes (matériau, quantité) sont un jsonb borné : une commande est lue d'un bloc, jamais interrogée ligne à ligne.
--     fournisseur_nom / fournisseur_contact : copie de ce que l'artisan avait sous les yeux à la commande (le fournisseur de
--     l'inventaire peut être renommé ou supprimé ensuite sans réécrire l'histoire d'une commande).
--     relances / relance_le : combien de fois et quand l'artisan a relancé (jamais envoyé sans son geste : routes CRM).
-- 2 ─ RLS comme 0151/0152 : lecture de SES lignes seulement, garde de session et de suspension, aucun droit d'écriture
--     direct pour `authenticated` (tout passe par /api/crm/commandes*, clé de service, après garde et validation), rien pour
--     `anon`. Un déclencheur refuse toute référence (chantier, fournisseur, matériau d'une ligne) vers l'objet d'un AUTRE
--     artisan, clé de service comprise.
-- 3 ─ Publication `supabase_realtime` : les tables que l'écran CRM écoute (postgres_changes, filtre `artisan_id=eq.<uid>`).
--     Chaque table listée porte une colonne artisan_id (le filtre en a besoin) et une RLS de lecture « ses lignes » : Realtime
--     n'envoie à un client que les évènements des lignes qu'il a le droit de lire, ET le filtre limite encore au compte.
--     `stock` n'a pas d'artisan_id : ses variations passent toutes par appliquer_mouvement (0040), qui écrit d'abord
--     `mouvements_stock` (porteur d'artisan_id) ; c'est cette table qui est écoutée.
--     Limite connue de Supabase Realtime : un évènement DELETE n'est ni filtré ni soumis à la RLS (la ligne n'existe plus), et
--     ne porte que la clé primaire. Aucune suppression n'est donc écoutée ici (elle ferait fuiter un identifiant d'un autre
--     compte) : l'écran se rafraîchit de lui-même toutes les 60 s et à chaque retour sur l'onglet, ce qui couvre les
--     suppressions faites depuis un autre appareil.
--     ⚠️ La liste doit rester identique à TABLES_TEMPS_REEL de lib/crm/tempsReel.ts (scripts/crm-qa.mjs le vérifie).

-- 1 ─ La table
create table if not exists public.commandes_fournisseur (
  id                   uuid primary key default gen_random_uuid(),
  artisan_id           uuid not null references public.artisans(id) on delete cascade,
  fournisseur_id       uuid references public.fournisseurs(id) on delete set null,
  fournisseur_nom      text not null check (char_length(fournisseur_nom) between 1 and 120),
  fournisseur_contact  text check (fournisseur_contact is null or char_length(fournisseur_contact) <= 200),
  reference            text check (reference is null or char_length(reference) <= 60),
  statut               text not null default 'commandee' check (statut in ('commandee', 'recue', 'annulee')),
  commandee_le         date not null default current_date,
  livraison_prevue     date not null,
  recue_le             date,
  chantier_id          uuid references public.chantiers(id) on delete set null,
  lignes               jsonb not null default '[]'::jsonb
                       check (jsonb_typeof(lignes) = 'array' and jsonb_array_length(lignes) between 1 and 50),
  note                 text check (note is null or char_length(note) <= 500),
  relances             integer not null default 0 check (relances between 0 and 50),
  relance_le           timestamptz,
  cree_le              timestamptz not null default now(),
  maj_le               timestamptz not null default now(),
  constraint commandes_dates_ordre check (livraison_prevue >= commandee_le),
  constraint commandes_recue_coherente check ((statut = 'recue') = (recue_le is not null))
);
create index if not exists commandes_artisan_idx on public.commandes_fournisseur (artisan_id, statut, livraison_prevue);
create index if not exists commandes_chantier_idx on public.commandes_fournisseur (chantier_id) where chantier_id is not null;

-- 2 ─ Aucune référence vers l'objet d'un autre artisan (chantier, fournisseur, matériaux des lignes).
create or replace function public.crm_commande_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
declare l jsonb; m text;
begin
  if new.chantier_id is not null and not exists (select 1 from public.chantiers c where c.id = new.chantier_id and c.artisan_id = new.artisan_id) then
    raise exception 'crm : chantier d un autre artisan';
  end if;
  if new.fournisseur_id is not null and not exists (select 1 from public.fournisseurs f where f.id = new.fournisseur_id and f.artisan_id = new.artisan_id) then
    raise exception 'crm : fournisseur d un autre artisan';
  end if;
  for l in select * from jsonb_array_elements(new.lignes) loop
    m := l->>'materiau_id';
    if m is not null and not exists (select 1 from public.materiaux x where x.id::text = m and x.artisan_id = new.artisan_id) then
      raise exception 'crm : materiau d un autre artisan';
    end if;
  end loop;
  new.maj_le := now();
  return new;
end $fn$;
drop trigger if exists crm_commande_verifier on public.commandes_fournisseur;
create trigger crm_commande_verifier before insert or update on public.commandes_fournisseur
  for each row execute function public.crm_commande_verifier();

-- 3 ─ RLS : lecture de ses lignes ; garde de session et de suspension (0138/0151) ; aucun droit d'écriture direct ; rien pour anon.
alter table public.commandes_fournisseur enable row level security;
drop policy if exists commandes_fournisseur_lecture on public.commandes_fournisseur;
create policy commandes_fournisseur_lecture on public.commandes_fournisseur for select to authenticated
  using ((select auth.uid()) = artisan_id);
drop policy if exists garde_session on public.commandes_fournisseur;
create policy garde_session on public.commandes_fournisseur as restrictive for all to authenticated
  using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()));
drop policy if exists garde_suspension_ins on public.commandes_fournisseur;
create policy garde_suspension_ins on public.commandes_fournisseur as restrictive for insert to authenticated
  with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_maj on public.commandes_fournisseur;
create policy garde_suspension_maj on public.commandes_fournisseur as restrictive for update to authenticated
  using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()));
drop policy if exists garde_suspension_sup on public.commandes_fournisseur;
create policy garde_suspension_sup on public.commandes_fournisseur as restrictive for delete to authenticated
  using ((select public.compte_non_suspendu()));
revoke all on public.commandes_fournisseur from anon;
revoke insert, update, delete on public.commandes_fournisseur from authenticated;

-- 4 ─ Le temps réel : la publication, table par table, sans jamais échouer si la table y est déjà (idempotent).
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'chantier_equipe', 'chantier_materiaux',
                           'materiaux', 'mouvements_stock', 'vehicules', 'equipe_membres', 'commandes_fournisseur'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Contrôles (résultats attendus entre crochets) :
-- select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'
--   and tablename in ('devis','factures','leads','chantiers','chantier_taches','chantier_equipe','chantier_materiaux','materiaux','mouvements_stock','vehicules','equipe_membres','commandes_fournisseur');   -- [12]
-- select count(*) from pg_policies where schemaname = 'public' and tablename = 'commandes_fournisseur';   -- [5]
-- select has_table_privilege('anon', 'public.commandes_fournisseur', 'select');   -- [false]
-- select has_table_privilege('authenticated', 'public.commandes_fournisseur', 'insert');   -- [false]
-- select relrowsecurity from pg_class where oid = 'public.commandes_fournisseur'::regclass;   -- [true]
