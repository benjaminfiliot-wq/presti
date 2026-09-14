-- ============================================================================================
-- 0091 · Mesure d'audience : les correctifs de la revue adversariale du 14/09, avant la mise en service
--        (suite de 0090, déjà appliquée — d'où une migration et non une réécriture)
--
-- 1. LE RECOUPEMENT. Le flux rendait chaque vue à la seconde, avec campagne et navigateur, et l'écran le
--    mêlait aux connexions nommées : par faible trafic, « arrivée /login depuis LinkedIn, Safari, Belgique »
--    suivie 25 s plus tard de « Connexion : Dupont » disait qui était qui. C'est le rapprochement visite–compte
--    que l'exemption de consentement de la CNIL exclut, et que /confidentialite promet de ne jamais faire.
--    Le flux rend désormais la MINUTE, jamais la campagne ni le navigateur, et seulement la page et l'heure
--    pour /login et /signup (la liste vit aussi dans lib/audience.ts, CHEMINS_DISCRETS). Les campagnes passent
--    en agrégat sur 7 jours. L'écran, lui, ne montre plus aucun compte nommé (app/controle/Visiteurs.tsx).
--
-- 2. L'EMPREINTE DANS `limites`. Le plafond de la route prenait l'empreinte pour clé : elle survivait des jours
--    dans les compteurs, alors que la politique la dit « effacée le lendemain ». La clé du plafond est
--    maintenant dérivée à part (lib/audienceServeur.ts, clePlafond), et la clôture efface chaque jour les
--    créneaux `audience:%` terminés — le créneau en cours reste, le plafond continue de tenir.
--
-- 3. LES 13 MOIS. La suppression passait par PostgREST, plafonnée à 500 lignes par passage : au-delà de 500 vues
--    par jour en moyenne, la durée annoncée n'était plus tenue. Elle est ici, en une instruction sur l'index.
--
-- `audience_cloturer` change de signature (la durée en paramètre, bornée à 25 mois, le maximum de la CNIL) et
-- de retour (le détail, en jsonb) : l'ancienne est supprimée, la nouvelle garde les mêmes droits.
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
      from (select campagne as cle, count(*) as n from semaine where entree and campagne is not null group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'pages_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select chemin as cle, count(*) as n from semaine group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'appareils_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select appareil as cle, count(*) as n from semaine where entree group by 1) x), '[]'::jsonb),
    'pays_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select coalesce(pays, '??') as cle, count(*) as n from semaine where entree group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'flux', coalesce((select jsonb_agg(jsonb_build_object('a', date_trunc('minute', vue_le), 'chemin', chemin, 'entree', entree,
        'source', case when discret then null else source end,
        'appareil', case when discret then null else appareil end,
        'pays', case when discret then null else pays end) order by vue_le desc)
      from (select vue_le, chemin, entree, source, appareil, pays, chemin in ('/login', '/signup') as discret
            from public.audience_vues order by vue_le desc limit 40) x), '[]'::jsonb),
    'premiere_vue', (select min(vue_le) from public.audience_vues)
  );
$$;

drop function if exists public.audience_cloturer();

create or replace function public.audience_cloturer(p_mois integer default 13)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  limite date := (now() at time zone 'Europe/Paris')::date;
  n_empreintes integer;
  n_plafonds integer;
  n_vues integer;
begin
  -- Chaque jour fini verse son compte AVANT que ses empreintes ne partent : dans l'ordre inverse, il serait perdu.
  insert into public.audience_jours (jour, visiteurs, vues)
  select d.jour, count(distinct v.empreinte), count(*)
  from (
    select distinct (vue_le at time zone 'Europe/Paris')::date as jour
    from public.audience_vues
    where empreinte is not null and (vue_le at time zone 'Europe/Paris')::date < limite
  ) d
  join public.audience_vues v on (v.vue_le at time zone 'Europe/Paris')::date = d.jour
  group by d.jour
  on conflict (jour) do update
    set visiteurs = excluded.visiteurs, vues = excluded.vues, cloture_le = now();

  update public.audience_vues
     set empreinte = null
   where empreinte is not null and (vue_le at time zone 'Europe/Paris')::date < limite;
  get diagnostics n_empreintes = row_count;

  delete from public.limites
   where cle like 'audience:%' and fenetre + make_interval(secs => fenetre_s) <= now();
  get diagnostics n_plafonds = row_count;

  delete from public.audience_vues
   where vue_le < now() - make_interval(months => least(greatest(coalesce(p_mois, 13), 1), 25));
  get diagnostics n_vues = row_count;

  return jsonb_build_object('empreintes', n_empreintes, 'plafonds', n_plafonds, 'vues', n_vues);
end
$$;

revoke all on function public.audience_direct(), public.audience_cloturer(integer) from public, anon, authenticated;
grant execute on function public.audience_direct(), public.audience_cloturer(integer) to service_role;
