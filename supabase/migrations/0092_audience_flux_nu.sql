-- ============================================================================================
-- 0092 · Mesure d'audience : le flux ne porte plus que la page, la minute et l'arrivée (contre-revue du 14/09)
--        (suite de 0091, appliquée)
--
-- 0091 masquait source, appareil et pays sur /login et /signup SEULEMENT. La contre-revue a montré que ça
-- déplaçait le recoupement sans le fermer : par faible trafic, la ligne d'ACCUEIL du même visiteur, juste sous
-- « Inscription », gardait « depuis LinkedIn · Mobile · Belgique », et l'onglet Aujourd'hui nomme l'artisan
-- inscrit à la minute. Les attributs d'une visite ne vivent donc plus que dans les agrégats sur 7 jours, jamais
-- ligne par ligne ; et les campagnes n'y comptent plus les arrivées sur /login et /signup (lib/audience.ts,
-- CHEMINS_DISCRETS), où une campagne à une seule arrivée désignerait l'inscrit du jour.
-- ============================================================================================

create or replace function public.audience_direct()
returns jsonb
language sql
stable
set search_path = public
as $$
  with actifs as (
    select distinct on (empreinte) empreinte, chemin
    from public.audience_vues
    where vue_le > now() - interval '5 minutes' and empreinte is not null
    order by empreinte, vue_le desc
  ),
  jour as (
    select chemin, empreinte from public.audience_vues
    where vue_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
  ),
  semaine as (
    select chemin, entree, source, campagne, appareil, pays from public.audience_vues
    where vue_le > now() - interval '7 days'
  )
  select jsonb_build_object(
    'en_ligne', (select count(*) from actifs),
    'pages_en_ligne', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select chemin as cle, count(*) as n from actifs group by chemin) x), '[]'::jsonb),
    'vues_jour', (select count(*) from jour),
    'visiteurs_jour', (select count(distinct empreinte) from jour),
    'entonnoir_jour', jsonb_build_object(
      'accueil', (select count(distinct empreinte) from jour where chemin = '/'),
      'inscription', (select count(distinct empreinte) from jour where chemin = '/signup'),
      'connexion', (select count(distinct empreinte) from jour where chemin = '/login')
    ),
    'sources_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select coalesce(source, 'direct') as cle, count(*) as n from semaine where entree group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'campagnes_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select campagne as cle, count(*) as n from semaine
            where entree and campagne is not null and chemin not in ('/login', '/signup')
            group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'pages_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select chemin as cle, count(*) as n from semaine group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'appareils_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select appareil as cle, count(*) as n from semaine where entree group by 1) x), '[]'::jsonb),
    'pays_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select coalesce(pays, '??') as cle, count(*) as n from semaine where entree group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'flux', coalesce((select jsonb_agg(jsonb_build_object('a', date_trunc('minute', vue_le), 'chemin', chemin, 'entree', entree) order by vue_le desc)
      from (select vue_le, chemin, entree from public.audience_vues order by vue_le desc limit 40) x), '[]'::jsonb),
    'premiere_vue', (select min(vue_le) from public.audience_vues)
  );
$$;

revoke all on function public.audience_direct() from public, anon, authenticated;
grant execute on function public.audience_direct() to service_role;
