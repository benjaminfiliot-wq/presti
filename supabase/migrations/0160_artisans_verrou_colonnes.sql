-- 0160 · Deuxième verrou sur public.artisans (18/10/2026, audit « la RLS protège les lignes, pas les colonnes »).
-- Le premier verrou est le déclencheur lock_artisan_privileges (0005 → dernière version 0095) qui remet les colonnes
-- privilégiées à leur ancienne valeur. Il échoue OUVERT : une colonne oubliée dans son corps redevient écrivable en silence
-- (c'est arrivé en 0045). Ici, défense en profondeur au niveau des droits : le client (authenticated) ne peut plus UPDATE
-- que les colonnes de profil listées ; anon ne peut plus rien UPDATE. Une FUTURE colonne n'est pas écrivable par le client
-- tant qu'on ne l'ajoute pas ici (échec VISIBLE, pas trou silencieux).
-- email, slug, origine_declaree, origine_precision restent autorisées : l'inscription (app/onboarding) fait un UPSERT
-- qui exige le droit UPDATE sur ses colonnes ; leur protection reste le déclencheur 0095.
-- Les fonctions SECURITY DEFINER (consume_credit, next_numero, offrir_credits, rendre_credit, suspendre_artisan) et le
-- service_role ne sont pas concernés. Essai à sec fait le 18/10 avant application.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns where table_schema='public' and table_name='artisans'
  and column_name not in ('id','is_founder','plan','credits','credits_reset_le','credits_forfait_servi','credits_periode','credits_offerts',
   'stripe_customer_id','stripe_subscription_id','compteur_devis','compteur_facture','sessions_invalides_avant','slugs_anciens',
   'suppression_demandee_le','domaine','domaine_verifie','role_interne','est_demo','site_active','site_tier','site_contenu',
   'site_origine','site_contenu_le','created_at','connexion_verifiee_le');
  execute 'revoke update on public.artisans from authenticated, anon';
  execute format('grant update (%s) on public.artisans to authenticated', cols);
end $$;
-- Contrôle : select has_column_privilege('authenticated','public.artisans','plan','update');  -- [false]
--            select has_column_privilege('authenticated','public.artisans','nom','update');   -- [true]
-- 0161 (même jour) : l'UPSERT de l'inscription réécrit aussi `id` (ON CONFLICT DO UPDATE SET id = excluded.id) → droit UPDATE
-- sur `id` nécessaire, sinon « permission denied for table artisans » à l'inscription. La RLS (auth.uid() = id) empêche de le
-- changer pour un autre. Prouvé par scripts/verrou-colonnes-qa.mjs (7/7).
grant update (id) on public.artisans to authenticated;
