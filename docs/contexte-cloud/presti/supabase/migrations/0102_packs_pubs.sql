-- ============================================================================================
-- 0102 · Les packs pubs (packs_pubs) et leur bucket privé (packs-pubs)
--        (fiche 026-114, domaine pubs-contenu 02/25 — dépend de 026-108 PASS)
--
-- Pourquoi une seule table pour deux offres (« locale » et « studio ») : la décision 3 de Benj
-- (25/09, 026-166) fait payer et suivre le pack de départ du Studio (5 vidéos, 490 €, prix en
-- paramètre dans lib/studio/offre.ts) SANS nouvelle migration — un numéro neuf aurait heurté 0113,
-- prise par le lot interface (INDEX.md:483). La colonne type ('locale' | 'studio', défaut
-- 'locale') distingue les deux ; marque_cle ne sert qu'au Studio (la clé de sa marque, nulle sur
-- un pack local). prix_cents n'a JAMAIS de valeur figée dans le code applicatif : la colonne porte
-- un défaut (149 €, l'offre C du plan) mais chaque ligne garde son propre prix — celui du Studio
-- vient de lib/studio/offre.ts (026-166), pas d'ici.
--
-- Le modèle est la commande de site (0088_site_commande.sql) : un dossier qui se remplit AVANT de
-- payer (matiere jsonb), un paiement (Stripe, idempotent par l'index unique partiel sur
-- stripe_session_id — Stripe rejoue ses événements jusqu'à trois jours), puis des états de
-- fabrication et de livraison. Ici : brouillon → payee → fabriquee → livree (le webhook fait
-- brouillon → payee ; rien ne se fabrique avant le paiement).
--
-- Pourquoi artisan_id ET commande_site_id peuvent être nuls : un pack Studio n'a pas d'artisan
-- (matiere = { videos, produit, accord_ref }, artisan_id nul — même raisonnement que
-- artisans.site_origine en 0088) ; commande_site_id relie un pack local à la commande de site dont
-- il découle, quand il en découle une — jamais une contrainte dure.
--
-- Sécurité (même politique que 0088:68-73) : RLS activée, tout révoqué à public/anon/authenticated,
-- UNE politique en lecture (auth.uid() = artisan_id — un pack Studio, sans artisan, n'est donc lu
-- par aucun compte artisan). Aucune politique d'écriture : brouillon, paiement (webhook),
-- fabrication et livraison passent tous par des routes serveur en service_role, qui contourne la RLS.
--
-- Le bucket packs-pubs (même politique que 0089_sites_bucket.sql:23-28) : privé, 20 Mo par fichier
-- (photos fournies + vidéo produite), aucune politique sur storage.objects — seul service_role lit
-- et écrit. fichiers_effaces_le est posé par la purge après expiration du lien (fiche 24 du domaine).
--
-- Ce que ça débloque : la table et le bucket existent avant la levée du drapeau packPub (026-118)
-- et avant le paiement du Studio (026-166) — ni l'un ni l'autre n'est levé par cette fiche.
-- ============================================================================================

create table if not exists public.packs_pubs (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete set null,
  commande_site_id uuid references public.sites_commandes(id) on delete set null,
  email text not null,
  etat text not null default 'brouillon' check (etat in ('brouillon', 'payee', 'fabriquee', 'livree')),
  matiere jsonb not null default '{}'::jsonb,
  -- Le prix n'est JAMAIS figé dans le code applicatif : ce défaut est l'offre C (149 €) ; le prix
  -- du pack Studio (490 €, 026-166) vient de lib/studio/offre.ts et s'écrit à la ligne, pas ici.
  prix_cents integer not null default 14900 check (prix_cents > 0),
  -- 'locale' (offre C, artisan_id rempli) ou 'studio' (pack de départ du Studio, artisan_id nul,
  -- marque_cle rempli) — décision 3 de Benj, 25/09.
  type text not null default 'locale' check (type in ('locale', 'studio')),
  marque_cle text,
  devise text not null default 'eur',
  stripe_session_id text,
  stripe_payment_intent_id text,
  paye_le timestamptz,
  fabrique_le timestamptz,
  livre_le timestamptz,
  lien_expire_le timestamptz,
  fichiers_effaces_le timestamptz,
  verifications jsonb,
  consigne text,
  refaits integer not null default 0,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists packs_pubs_stripe_session_key on public.packs_pubs (stripe_session_id) where stripe_session_id is not null;
create index if not exists packs_pubs_artisan_idx on public.packs_pubs (artisan_id);
create index if not exists packs_pubs_etat_idx on public.packs_pubs (etat);
comment on table public.packs_pubs is 'Packs pubs locale (149 euros, offre C) et pack Studio (490 euros, 026-166) : dossier, paiement, quatre etats - 026-114.';
comment on column public.packs_pubs.type is 'locale (offre C) ou studio (pack de depart du Studio, decision 3 de Benj du 25/09) - jamais une troisieme valeur.';
comment on column public.packs_pubs.marque_cle is 'Cle de la marque du Studio ; nulle sur un pack locale.';

alter table public.packs_pubs enable row level security;
revoke all on public.packs_pubs from public, anon, authenticated;
drop policy if exists "packs pubs : l artisan lit ses packs" on public.packs_pubs;
create policy "packs pubs : l artisan lit ses packs" on public.packs_pubs for select using (auth.uid() = artisan_id);
-- Aucune politique d'écriture, exprès : brouillon, paiement (webhook), fabrication et livraison
-- passent tous par les routes serveur (service_role, qui contourne la RLS).

insert into storage.buckets (id, name, public, file_size_limit)
values ('packs-pubs', 'packs-pubs', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;
-- Aucune politique sur storage.objects : ni lecture ni écriture pour anon/authenticated, seul
-- service_role contourne la RLS du bucket.
