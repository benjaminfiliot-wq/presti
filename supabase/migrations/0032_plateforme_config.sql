-- Panneau de contrôle IA de la plateforme (v4 §A4). Un réglage par artisan.
-- Le prompt v4 la nomme 0025 ; la numérotation locale en était déjà à 0031 → 0032.
-- Absente = comportement par défaut (dérivé de artisans.reponse_auto) → aucun artisan cassé.
create table if not exists public.plateforme_config (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  mode_reponse text not null default 'assistee',   -- 'auto' | 'assistee' | 'manuelle'
  modele text,                                     -- NULL = selon la formule (lib/models)
  auto_24_7 boolean not null default true,
  auto_debut smallint,                             -- heure locale de début (si auto_24_7 = false)
  auto_fin smallint,                               -- heure locale de fin
  devis_auto text not null default 'brouillon',    -- 'jamais' | 'brouillon' | 'seuil'
  devis_auto_seuil numeric,                        -- € TTC, si devis_auto = 'seuil'
  facture_auto text not null default 'jamais',     -- 'jamais' | 'acceptation'
  ton text not null default 'chaleureux',          -- 'sobre' | 'chaleureux' | 'direct'
  -- Périmètre : ce que l'IA peut dire, et ce qu'elle ne doit JAMAIS dire.
  peut_dire text[] not null default array['delais','zone','disponibilites'],
  ne_doit_pas_dire text[] not null default array['prix_ferme','engagement_date','garantie'],
  -- Mots qui coupent l'IA et alertent l'artisan.
  escalade_mots text[] not null default array['urgence','fuite','degat des eaux','inondation','gaz','assurance'],
  limite_messages smallint not null default 8,     -- nb max de réponses IA avant reprise humaine
  -- Personnalisation de l'assistant (§A5)
  nom_assistant text, message_accueil text, amorces text[],
  maj_le timestamptz default now()
);

alter table public.plateforme_config enable row level security;

-- L'artisan ne voit et ne modifie QUE sa propre configuration.
drop policy if exists "pconfig_select_own" on public.plateforme_config;
create policy "pconfig_select_own" on public.plateforme_config for select to authenticated
  using (artisan_id = auth.uid());
drop policy if exists "pconfig_insert_own" on public.plateforme_config;
create policy "pconfig_insert_own" on public.plateforme_config for insert to authenticated
  with check (artisan_id = auth.uid());
drop policy if exists "pconfig_update_own" on public.plateforme_config;
create policy "pconfig_update_own" on public.plateforme_config for update to authenticated
  using (artisan_id = auth.uid()) with check (artisan_id = auth.uid());
drop policy if exists "pconfig_delete_own" on public.plateforme_config;
create policy "pconfig_delete_own" on public.plateforme_config for delete to authenticated
  using (artisan_id = auth.uid());
