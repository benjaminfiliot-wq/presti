-- Presti — Étape 7 : Devis. À exécuter dans Supabase → SQL Editor (idempotent).

-- 1) Extension du profil artisan (infos légales réutilisées sur devis/factures)
alter table public.artisans add column if not exists siret text;
alter table public.artisans add column if not exists forme_juridique text;
alter table public.artisans add column if not exists adresse text;
alter table public.artisans add column if not exists code_postal text;
alter table public.artisans add column if not exists ville text;
alter table public.artisans add column if not exists logo_url text;
alter table public.artisans add column if not exists assurance_nom text;
alter table public.artisans add column if not exists assurance_adresse text;
alter table public.artisans add column if not exists assurance_contrat text;
alter table public.artisans add column if not exists assurance_activites text;
alter table public.artisans add column if not exists assurance_zone text;
alter table public.artisans add column if not exists iban text;
alter table public.artisans add column if not exists bic text;
alter table public.artisans add column if not exists tva_regime text default 'franchise';
alter table public.artisans add column if not exists numero_tva text;
alter table public.artisans add column if not exists conditions_paiement text;
alter table public.artisans add column if not exists compteur_devis int default 0;
alter table public.artisans add column if not exists compteur_facture int default 0;

-- 2) Carnet de clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete cascade,
  nom text, email text, tel text, adresse text, code_postal text, ville text, siret text,
  created_at timestamptz default now()
);
alter table public.clients enable row level security;
drop policy if exists client_all_own on public.clients;
create policy client_all_own on public.clients for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);

-- 3) Devis
create table if not exists public.devis (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  numero text,
  objet text,
  statut text default 'brouillon',   -- brouillon | envoye | accepte | refuse | expire
  date_emission date default current_date,
  validite_jours int default 90,
  remise_pct numeric default 0,
  acompte_pct numeric default 0,
  conditions text,
  notes text,
  client_nom text, client_email text, client_adresse text,
  total_ht numeric default 0, total_tva numeric default 0, total_ttc numeric default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.devis enable row level security;
drop policy if exists devis_all_own on public.devis;
create policy devis_all_own on public.devis for all
  using (auth.uid() = artisan_id) with check (auth.uid() = artisan_id);

-- 4) Lignes de devis
create table if not exists public.devis_lignes (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid references public.devis(id) on delete cascade,
  ordre int default 0,
  designation text,
  quantite numeric default 1,
  unite text default 'u',
  prix_unitaire_ht numeric default 0,
  tva_taux numeric default 20
);
alter table public.devis_lignes enable row level security;
drop policy if exists devis_lignes_own on public.devis_lignes;
create policy devis_lignes_own on public.devis_lignes for all
  using (exists (select 1 from public.devis d where d.id = devis_lignes.devis_id and d.artisan_id = auth.uid()))
  with check (exists (select 1 from public.devis d where d.id = devis_lignes.devis_id and d.artisan_id = auth.uid()));

-- 5) Bibliothèque de postes types (adaptabilité par métier)
create table if not exists public.postes_types (
  id uuid primary key default gen_random_uuid(),
  metier text, designation text, unite text,
  prix_ht_min numeric, prix_ht_max numeric, tva_defaut numeric default 10
);
alter table public.postes_types enable row level security;
drop policy if exists postes_read on public.postes_types;
create policy postes_read on public.postes_types for select using (auth.role() = 'authenticated');

-- 6) Numérotation atomique (séquence continue, anti-trou)
create or replace function public.next_numero(p_artisan uuid, p_type text)
returns int language plpgsql security definer as $$
declare n int;
begin
  if p_type = 'facture' then
    update public.artisans set compteur_facture = coalesce(compteur_facture,0)+1 where id = p_artisan returning compteur_facture into n;
  else
    update public.artisans set compteur_devis = coalesce(compteur_devis,0)+1 where id = p_artisan returning compteur_devis into n;
  end if;
  return n;
end $$;

-- 7) Seed bibliothèque (fourchettes indicatives, s'enrichira ; inséré seulement si vide)
insert into public.postes_types (metier, designation, unite, prix_ht_min, prix_ht_max, tva_defaut)
select * from (values
  ('Plombier','Remplacement chauffe-eau 200 L','u',350,700,10),
  ('Plombier','Recherche de fuite','forfait',90,180,10),
  ('Plombier','Pose mitigeur / robinetterie','u',90,200,10),
  ('Plombier','Remplacement WC','u',200,450,10),
  ('Plombier','Tuyauterie cuivre/PER (au ml)','ml',25,60,10),
  ('Électricien','Remplacement tableau électrique','u',800,1800,10),
  ('Électricien','Pose prise / interrupteur','u',40,90,10),
  ('Électricien','Point lumineux','u',60,140,10),
  ('Électricien','Mise aux normes tableau','forfait',500,1500,10),
  ('Électricien','Câblage (au ml)','ml',8,20,10),
  ('Maçon','Mur en parpaing','m²',45,90,10),
  ('Maçon','Ouverture mur porteur + IPN','forfait',1500,4000,10),
  ('Maçon','Dalle béton','m²',40,90,10),
  ('Maçon','Enduit de façade','m²',30,70,10),
  ('Peintre','Peinture murs / plafonds','m²',20,40,10),
  ('Peintre','Préparation / ponçage','m²',8,18,10),
  ('Peintre','Pose toile de verre','m²',18,35,10),
  ('Peintre','Peinture boiseries (au ml)','ml',12,25,10),
  ('Menuisier','Pose porte intérieure','u',150,400,10),
  ('Menuisier','Pose fenêtre PVC','u',300,800,10),
  ('Menuisier','Placard sur mesure (au ml)','ml',250,600,10),
  ('Menuisier','Pose parquet','m²',30,70,10),
  ('Carreleur','Pose carrelage sol','m²',35,70,10),
  ('Carreleur','Pose faïence murale','m²',40,80,10),
  ('Carreleur','Chape / ragréage','m²',20,45,10),
  ('Chauffagiste','Pose chaudière gaz','u',2000,4500,5.5),
  ('Chauffagiste','Entretien chaudière','forfait',90,180,10),
  ('Chauffagiste','Pose radiateur','u',200,500,10),
  ('Chauffagiste','Pose pompe à chaleur','u',8000,15000,5.5),
  ('Couvreur','Réfection toiture','m²',80,200,10),
  ('Couvreur','Démoussage toiture','m²',10,25,10),
  ('Couvreur','Pose gouttière (au ml)','ml',30,70,10),
  ('Couvreur','Remplacement tuiles','forfait',200,600,10)
) as v(metier, designation, unite, prix_ht_min, prix_ht_max, tva_defaut)
where not exists (select 1 from public.postes_types);
