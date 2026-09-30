-- ============================================================================================
-- 0110 · Le socle de l'usine dans la base : bucket privé, tâche détenue, graines des deux agents
--        (fiche 026-054, série 026 ; lot « usine » du 24/09, assemblé le 24/09 au soir ; contrat
--         scripts/fixtures/026/usine-production/contrat-usine.json, 026-052)
--
-- La production des sites payés passe sur l'usine Oracle presti-usine (rectification du 24/09
-- §3.12, décision R11). L'usine n'a JAMAIS la clé de service Supabase : ses agents portent un
-- jeton d'agent (026-040), limité à leurs types et à leurs tables, et déposent leurs fichiers par
-- des URL signées que rend une route de Vercel (fiche 06, 026-056). Cette migration pose ce que
-- cette route doit trouver dans la base.
--
-- Le bucket privé « usine », séparé des buckets servis (sites, maquettes) : ce que l'usine dépose
-- n'est jamais servi tel quel, le serveur le relit, le décode et le copie ailleurs. 8 Mo par
-- fichier, et seulement les types du contrat de livraison d'un site. Comme le bucket sites
-- (0089_sites_bucket.sql, même règle « jamais la clé de service ») : aucune politique sur
-- storage.objects, seul service_role lit et écrit.
--
-- ops.taches est fermée (0096) : ops_tache_detenue est la seule porte par laquelle la route de
-- dépôt vérifie qu'un agent tient VRAIMENT une tâche sous bail vivant avant de signer quoi que ce
-- soit — zéro ligne sinon. Lecture seule, security definer, sans événement.
--
-- Les deux graines par ops_agent_enregistrer (0097 : insère ou met à jour, sans toucher au jeton,
-- au battement ni à la pause) : usine (surveillance, période 30 min, le veilleur 026-047 crie
-- « usine injoignable » au-delà d'une heure) et livreur_usine (livraison, période 60 min, distinct
-- de livreur — deux processus qui battraient pour le même agent masqueraient la panne de l'un).
-- Ni atelier_maquettes, ni livreur, ni chef : leurs graines restent celles de 0105.
-- ============================================================================================

-- Le bucket privé « usine » : ce que l'usine dépose n'est jamais servi tel quel ; le serveur le relit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('usine', 'usine', false, 8388608, array['text/html', 'text/css', 'text/javascript', 'application/javascript',
  'application/json', 'image/webp', 'image/avif', 'image/jpeg', 'image/png', 'image/svg+xml', 'font/woff2', 'text/plain',
  'application/xml', 'text/xml']::text[])
on conflict (id) do update set public = false, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;

-- Aucune politique sur storage.objects : seul service_role lit et écrit (modèle : 0089_sites_bucket.sql:23-28).

-- La tâche détenue : zéro ligne si l'agent ne la tient pas sous un bail vivant.
create or replace function public.ops_tache_detenue(p_agent text, p_id uuid)
returns table (id uuid, type text, cle_idempotence text, capacite text, charge jsonb, bail_jusqua timestamptz)
language sql stable security definer set search_path = pg_catalog, ops as $$
  select t.id, t.type, t.cle_idempotence, t.capacite, t.charge, t.bail_jusqua
    from ops.taches t
   where t.id = p_id and t.agent = p_agent and t.statut = 'bail' and t.bail_jusqua > now()
$$;
revoke all on function public.ops_tache_detenue(text, uuid) from public, anon, authenticated;
grant execute on function public.ops_tache_detenue(text, uuid) to service_role;
comment on function public.ops_tache_detenue(text, uuid) is
  'Rend la tâche détenue par p_agent sous un bail vivant (026-054), ou zéro ligne sinon. Lecture seule, sans événement : la porte de la route de dépôt de l''usine.';

-- Les deux agents de l'usine (0097 : insère ou met à jour, sans toucher au jeton, au battement ni à la pause).
select public.ops_agent_enregistrer('usine', 'Surveillance de l''usine', array['surveillance']::text[], array[]::text[],
  array['evenements', 'decisions']::text[], 30, 30, 2, 0);
select public.ops_agent_enregistrer('livreur_usine', 'Livreur de sites (usine)', array['livraison']::text[], array[]::text[],
  array['taches', 'evenements']::text[], 60, 30, 0, 0);
