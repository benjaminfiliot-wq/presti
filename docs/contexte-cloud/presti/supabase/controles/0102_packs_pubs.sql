-- supabase/controles/0102_packs_pubs.sql — contrôle en LECTURE SEULE de la migration 0102 (fiche 026-114).
-- Une ligne « oui »/« NON (anormal) » par point : table, sécurité par ligne, politique de lecture
-- seule, absence de politique d'écriture, bucket privé et sa limite.
-- pg_policies.cmd rend le mot entier ('SELECT', pas 'r') : le compte lecture/écriture se lit sur
-- pg_policy.polcmd ('r' select, 'a' insert, 'w' update, 'd' delete, '*' toutes) ; pg_policies reste
-- cité pour le nombre total de politiques de la table.
with t as (
  select to_regclass('public.packs_pubs') as id
), securite as (
  select c.relrowsecurity as rls
    from pg_class c join t on c.oid = t.id
), toutes as (
  select count(*) as total from pg_policies where schemaname = 'public' and tablename = 'packs_pubs'
), commandes as (
  select count(*) filter (where p.polcmd = 'r') as lecture,
         count(*) filter (where p.polcmd <> 'r') as ecriture
    from pg_policy p join t on p.polrelid = t.id
), bucket as (
  select public, file_size_limit from storage.buckets where id = 'packs-pubs'
)
select 'table public.packs_pubs existe (to_regclass) (attendu : oui)' as quoi,
       case when (select id from t) is not null then 'oui' else 'NON (anormal)' end as resultat
union all
select 'securite par ligne activee (pg_class.relrowsecurity) (attendu : oui)',
       case when coalesce((select rls from securite), false) then 'oui' else 'NON (anormal)' end
union all
select 'une seule politique en lecture, aucune en ecriture (pg_policies, pg_policy.polcmd) (attendu : oui)',
       case when coalesce((select total from toutes), 0) = 1
             and coalesce((select lecture from commandes), 0) = 1
             and coalesce((select ecriture from commandes), 0) = 0
            then 'oui' else 'NON (anormal)' end
union all
select 'bucket packs-pubs existe, prive, file_size_limit = 20971520 (storage.buckets) (attendu : oui)',
       case when coalesce((select public from bucket), true) = false
             and coalesce((select file_size_limit from bucket), 0) = 20971520
            then 'oui' else 'NON (anormal)' end;
