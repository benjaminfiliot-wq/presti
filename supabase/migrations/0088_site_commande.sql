-- ============================================================================================
-- 0088 · Le site à la demande : la commande (sites_commandes) et l'origine du site (artisans.site_origine)
--        (prompt v15 §2.2 et §3 — le site vitrine sort de l'abonnement et devient un produit à 300 €, une fois)
--
-- Pourquoi une table de commandes et pas une table « sites » : il n'existe pas de table sites. Le site
-- d'un artisan vit en colonnes de public.artisans (site_active, site_contenu, site_layout, site_style…,
-- migrations 0019, 0023, 0037) et le moteur app/site/[slug] le sert depuis là. Une commande est un autre
-- objet : un dossier (métier, communes, matière), un paiement, quatre états, un aperçu, une validation.
-- Le site livré, lui, s'écrira à la fin dans les colonnes existantes — et artisans.site_origine dira d'où
-- il vient : 'abonnement' pour tout site qui existe aujourd'hui (rien ne disparaît, §2.2), 'commande'
-- pour le nouveau.
--
-- Pourquoi 'brouillon' devant les quatre états du prompt (payee → generee → validee → en_ligne) : les
-- quatre écrans (domaine, métier et zone, matière, paiement) se remplissent AVANT de payer, et des photos
-- ne tiennent pas dans les métadonnées d'une session Stripe. Le dossier existe donc avant le paiement ;
-- rien ne se génère tant que le webhook n'a pas écrit 'payee' (§3.1, point 4).
--
-- Pourquoi un index unique sur stripe_session_id : Stripe rejoue ses événements jusqu'à trois jours ;
-- sans lui, un rejeu créerait une seconde commande payée pour un seul paiement. Le webhook ne crée
-- rien : il passe le brouillon à 'payee' — et un second passage ne trouve plus de brouillon à passer.
--
-- Pourquoi artisan_id peut devenir nul : la décision H3 (que devient un site commandé si l'artisan
-- supprime son compte) n'est pas prise ; on ne détruit pas une commande payée avec le compte. L'email
-- est recopié à la création pour garder un interlocuteur.
--
-- Ce que ça débloque : la route /site/commander et /api/site/commander (drapeau siteCommande, à lever
-- APRÈS ce collage : levé sans la table, les routes répondent 503) et la branche paiement unique du
-- webhook Stripe. Le bouton de vente (siteCommandeVente) reste baissé jusqu'à l'étape 7 du prompt.
-- ============================================================================================

create table if not exists public.sites_commandes (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete set null,
  email text not null,
  etat text not null default 'brouillon' check (etat in ('brouillon', 'payee', 'generee', 'validee', 'en_ligne')),
  -- écran 1 : le domaine reste au nom de l'artisan, jamais au nôtre
  domaine_mode text not null default 'aucun' check (domaine_mode in ('existant', 'a_prendre', 'aucun')),
  domaine text,
  -- écran 2 : la matière du référencement local — des communes réellement servies, pas un rayon fictif
  metier text not null default '',
  metiers_secondaires text[] not null default '{}',
  communes text[] not null default '{}',
  -- écran 3 : photos, logo, adresse, SIREN, horaires, décennale, avis — un document, validé par le code
  matiere jsonb not null default '{}'::jsonb,
  -- écran 4 : le paiement (franchise en base, art. 293 B : 300 € nets)
  prix_cents integer not null default 30000 check (prix_cents > 0),
  devise text not null default 'eur',
  stripe_session_id text,
  stripe_payment_intent_id text,
  paye_le timestamptz,
  -- la fabrication (§3.2) : aperçu privé, scores du juge, consigne de régénération, validation humaine
  genere_le timestamptz,
  apercu_jeton text,
  scores jsonb,
  verifications jsonb,
  consigne text,
  regenerations integer not null default 0,
  valide_le timestamptz,
  en_ligne_le timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create unique index if not exists sites_commandes_stripe_session_key on public.sites_commandes (stripe_session_id) where stripe_session_id is not null;
create index if not exists sites_commandes_artisan_idx on public.sites_commandes (artisan_id);
create index if not exists sites_commandes_etat_idx on public.sites_commandes (etat);
comment on table public.sites_commandes is 'Site a la demande (300 euros, une fois) : le dossier, le paiement et les quatre etats - prompt v15.';

alter table public.sites_commandes enable row level security;
revoke all on public.sites_commandes from public, anon, authenticated;
drop policy if exists "site commande : l artisan lit ses commandes" on public.sites_commandes;
create policy "site commande : l artisan lit ses commandes" on public.sites_commandes for select using (auth.uid() = artisan_id);
-- Toute écriture passe par les routes serveur (service_role) : le brouillon est validé par le code, le
-- paiement par le webhook, la validation par le Poste de contrôle. Aucune politique d'écriture, exprès.

-- L'origine du site existant : 'abonnement' pour tous ceux qui vivent aujourd'hui — rien ne disparaît.
alter table public.artisans add column if not exists site_origine text not null default 'abonnement' check (site_origine in ('abonnement', 'commande'));
comment on column public.artisans.site_origine is 'Origine du site vitrine : abonnement (historique, reste actif tant que le compte existe) ou commande (site a la demande, 300 euros).';
