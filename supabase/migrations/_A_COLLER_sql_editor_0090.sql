-- ============================================================================================
-- 0090 · La mesure d'audience de la vitrine : qui regarde prestiapp.fr, en direct, sans savoir QUI
--        (demande de Benj du 14/09 : voir depuis le Poste de contrôle ceux qui viennent juste regarder)
--
-- Pourquoi une mesure maison et pas Google Analytics : la politique de confidentialité promet
-- « uniquement des cookies strictement nécessaires », Google n'est pas un sous-traitant déclaré, et il
-- n'existe aucun bandeau de consentement. Une mesure SANS COOKIE, sans tiers, aux données anonymes,
-- réservée à l'éditeur, entre dans l'exemption de consentement de la CNIL — GA tel quel, non.
--
-- Ce qui est écrit, par vue de page (app/api/audience) : le chemin (8 pages publiques, liste fermée
-- dans lib/audience.ts), si c'est la page d'entrée, la source (hôte du référent ou utm_source, jamais
-- une adresse complète), la campagne, le type d'appareil, la famille de navigateur, le pays (en-tête
-- de l'hébergeur), et une EMPREINTE du jour.
--
-- Ce qui n'est JAMAIS écrit : l'adresse IP, le user-agent, un identifiant de compte, un cookie.
-- L'empreinte est un HMAC de (jour, IP, navigateur) tronqué : elle sert à compter les visiteurs du jour
-- sans compter deux fois la même personne, change chaque jour, et `audience_cloturer()` l'efface dès le
-- lendemain (la purge quotidienne l'appelle) après avoir versé le compte du jour dans `audience_jours`.
-- Rien ne la relie à un compte : c'est l'interdit de « recoupement » de l'exemption CNIL.
--
-- Pourquoi des fonctions plutôt que des lectures PostgREST : compter des visiteurs distincts n'existe
-- pas en PostgREST, et l'écran interroge toutes les dix secondes — une fonction, un aller-retour.
--
-- Qui lit : le service_role seul (la route gardée /api/controle/audience). Aucune politique, tables et
-- fonctions retirées à anon et authenticated — le navigateur d'un fondateur ne lit rien en direct, comme
-- toutes les tables de direction (scripts/controle-e2e.mjs le prouve pour elles, audience-e2e pour ici).
--
-- Durées (lib/audience.ts, lib/purgesRgpd.ts) : l'empreinte, au lendemain ; la vue, 13 mois ; le compte
-- par jour, qui ne contient plus rien d'une visite, reste.
-- ============================================================================================

create table if not exists public.audience_vues (
  id          uuid primary key default gen_random_uuid(),
  vue_le      timestamptz not null default now(),
  chemin      text not null check (char_length(chemin) between 1 and 120),
  entree      boolean not null default false,
  source      text check (source is null or char_length(source) <= 80),
  campagne    text check (campagne is null or char_length(campagne) <= 80),
  appareil    text not null check (appareil in ('mobile', 'tablette', 'ordinateur')),
  navigateur  text check (navigateur is null or char_length(navigateur) <= 24),
  pays        text check (pays is null or pays ~ '^[A-Z]{2}$'),
  empreinte   text check (empreinte is null or empreinte ~ '^[0-9a-f]{16}$')
);
create index if not exists audience_vues_vue_le_idx on public.audience_vues (vue_le desc);

create table if not exists public.audience_jours (
  jour        date primary key,
  visiteurs   integer not null check (visiteurs >= 0),
  vues        integer not null check (vues >= 0),
  cloture_le  timestamptz not null default now()
);

comment on table public.audience_vues is 'Vues des pages publiques de prestiapp.fr, sans cookie ni IP. Empreinte du jour effacée au lendemain (audience_cloturer), ligne supprimée à 13 mois (lib/purgesRgpd.ts).';
comment on table public.audience_jours is 'Visiteurs et vues par jour (Europe/Paris), versés par audience_cloturer avant l’effacement des empreintes. Aucune donnée de visite.';

alter table public.audience_vues enable row level security;
alter table public.audience_jours enable row level security;
revoke all on table public.audience_vues, public.audience_jours from anon, authenticated;
grant all on table public.audience_vues, public.audience_jours to service_role;

-- L'écran en direct : en ligne (5 min), aujourd'hui, 7 jours, et les 40 dernières vues — sans l'empreinte.
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
    select chemin, entree, source, appareil, pays from public.audience_vues
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
    'pages_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select chemin as cle, count(*) as n from semaine group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'appareils_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select appareil as cle, count(*) as n from semaine where entree group by 1) x), '[]'::jsonb),
    'pays_7j', coalesce((select jsonb_agg(jsonb_build_object('cle', cle, 'n', n) order by n desc, cle)
      from (select coalesce(pays, '??') as cle, count(*) as n from semaine where entree group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'flux', coalesce((select jsonb_agg(jsonb_build_object('a', vue_le, 'chemin', chemin, 'entree', entree, 'source', source,
        'campagne', campagne, 'appareil', appareil, 'navigateur', navigateur, 'pays', pays) order by vue_le desc)
      from (select vue_le, chemin, entree, source, campagne, appareil, navigateur, pays
            from public.audience_vues order by vue_le desc limit 40) x), '[]'::jsonb),
    'premiere_vue', (select min(vue_le) from public.audience_vues)
  );
$$;

-- L'historique par jour : la vitrine (depuis cette migration), et ce que la base savait déjà — les vues
-- et demandes des pages de conversation (plat_events, depuis le 02/09), les inscriptions, les sessions
-- ouvertes. Artisans réels seulement (ni fondateur, ni démo, ni adresse de test), en totaux, jamais par
-- artisan.
create or replace function public.audience_historique(p_jours integer default 30)
returns jsonb
language sql
stable
set search_path = public
as $$
  with bornes as (
    select ((now() at time zone 'Europe/Paris')::date - (least(greatest(coalesce(p_jours, 30), 1), 90) - 1)) as debut,
           (now() at time zone 'Europe/Paris')::date as fin
  ),
  depuis as (
    select (select debut from bornes)::timestamp at time zone 'Europe/Paris' as t
  ),
  jours as (
    select generate_series((select debut from bornes), (select fin from bornes), interval '1 day')::date as jour
  ),
  vrais as (
    select id, slug from public.artisans
    where coalesce(is_founder, false) = false and coalesce(est_demo, false) = false
      and coalesce(email, '') not like '%@presti-test.invalid'
  ),
  site as (
    select (vue_le at time zone 'Europe/Paris')::date as jour, count(*) as vues, count(distinct empreinte) as visiteurs
    from public.audience_vues where vue_le >= (select t from depuis) group by 1
  ),
  clos as (
    select jour, visiteurs from public.audience_jours where jour >= (select debut from bornes)
  ),
  plat as (
    select (e.created_at at time zone 'Europe/Paris')::date as jour,
           count(*) filter (where e.event = 'view') as vues,
           count(*) filter (where e.event = 'lead') as demandes
    from public.plat_events e join vrais a on a.slug = e.slug
    where e.created_at >= (select t from depuis) group by 1
  ),
  inscr as (
    select (a.created_at at time zone 'Europe/Paris')::date as jour, count(*) as n
    from public.artisans a join vrais v on v.id = a.id
    where a.created_at >= (select t from depuis) group by 1
  ),
  sess as (
    select (s.verifiee_le at time zone 'Europe/Paris')::date as jour, count(*) as n
    from public.sessions_verifiees s join vrais v on v.id = s.user_id
    where s.verifiee_le >= (select t from depuis) group by 1
  )
  select jsonb_build_object(
    'jours', (select jsonb_agg(jsonb_build_object(
        'jour', j.jour,
        'site_vues', coalesce(site.vues, 0),
        'site_visiteurs', greatest(coalesce(site.visiteurs, 0), coalesce(clos.visiteurs, 0)),
        'plateformes_vues', coalesce(plat.vues, 0),
        'plateformes_demandes', coalesce(plat.demandes, 0),
        'inscriptions', coalesce(inscr.n, 0),
        'sessions', coalesce(sess.n, 0)
      ) order by j.jour)
      from jours j
      left join site on site.jour = j.jour
      left join clos on clos.jour = j.jour
      left join plat on plat.jour = j.jour
      left join inscr on inscr.jour = j.jour
      left join sess on sess.jour = j.jour),
    'mesure_depuis', (select min(vue_le) from public.audience_vues),
    'plateformes_depuis', (select min(created_at) from public.plat_events)
  );
$$;

-- La clôture : chaque jour TERMINÉ (Europe/Paris) verse ses visiteurs et ses vues dans audience_jours,
-- puis ses empreintes sont effacées. Rejouable : un jour déjà clos n'a plus d'empreinte, il n'est plus
-- relu. Rend le nombre d'empreintes effacées.
create or replace function public.audience_cloturer()
returns integer
language plpgsql
set search_path = public
as $$
declare
  limite date := (now() at time zone 'Europe/Paris')::date;
  n integer;
begin
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
  get diagnostics n = row_count;
  return n;
end
$$;

revoke all on function public.audience_direct(), public.audience_historique(integer), public.audience_cloturer() from public, anon, authenticated;
grant execute on function public.audience_direct(), public.audience_historique(integer), public.audience_cloturer() to service_role;
