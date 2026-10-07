-- 0135_score_douleur.sql — 07/10/2026
--
-- Le score de douleur B2B (lib/agents/acquisition/scoreDouleur.ts, juge scripts/score-douleur-qa.mjs) : contacter d'abord
-- les entreprises qui souffrent le plus de ce que Presti résout (pas de site ou site obsolète, formulaire absent ou
-- cassé, avis publics qui se plaignent de devis ou de rappels absents — comptés, jamais stockés).
--
--   1. ops.prospects : score_douleur (0 à 100, null = pas encore noté), score_douleur_detail (codes et nombres seulement :
--      objet JSON de 2 000 octets au plus, sans « @ »), score_douleur_le.
--   2. acq_prospect_mettre_a_jour : le recenseur peut écrire le score dans son patch (clés score_douleur et
--      score_douleur_detail) ; corps repris À L'IDENTIQUE de la version en base, plus ces trois colonnes.
--   3. acq_score_douleur_poser : (re)note un prospect sans changer son étape ni maj_le (passe scripts/score-douleur-passe.mjs).
--   4. acq_reserver : la file du recenseur passe par score décroissant (les non notés après), puis maj_le, id. Corps repris
--      à l'identique de la version en base (bail, tentatives, a_decider à la 3e), seul l'ordre change.
--   5. acq_prospects_pour_premier_contact : même ordre de priorité, après le rang (maquette prête d'abord).
-- Aucune donnée personnelle n'est ajoutée ; aucun droit nouveau pour anon ou authenticated.

-- ── 1. Colonnes ───────────────────────────────────────────────────────────────────────────────────────────────────────────
alter table ops.prospects
  add column if not exists score_douleur smallint,
  add column if not exists score_douleur_detail jsonb,
  add column if not exists score_douleur_le timestamptz;
alter table ops.prospects drop constraint if exists prospects_score_douleur_check;
alter table ops.prospects add constraint prospects_score_douleur_check check (score_douleur is null or score_douleur between 0 and 100);
alter table ops.prospects drop constraint if exists prospects_score_douleur_detail_check;
alter table ops.prospects add constraint prospects_score_douleur_detail_check check (
  score_douleur_detail is null
  or (jsonb_typeof(score_douleur_detail) = 'object' and octet_length(score_douleur_detail::text) <= 2000 and position('@' in score_douleur_detail::text) = 0)
);
create index if not exists prospects_etape_score_douleur_idx on ops.prospects (etape, score_douleur desc nulls last, maj_le);
comment on column ops.prospects.score_douleur is 'Score de douleur B2B 0-100 (lib/agents/acquisition/scoreDouleur.ts) : signaux publics sur l''entreprise ; null = pas encore noté.';
comment on column ops.prospects.score_douleur_detail is 'Détail du score : { version, signaux: [{ code, poids, n? }] } — codes et nombres seulement, jamais un texte d''avis ni une donnée personnelle.';

-- ── 2. acq_prospect_mettre_a_jour : le score dans le patch ─────────────────────────────────────────────────────────────────
create or replace function public.acq_prospect_mettre_a_jour(p_id uuid, p_depuis text, p_vers text, p_patch jsonb)
returns boolean
language plpgsql
security definer
set search_path to 'ops', 'public', 'pg_temp'
as $function$
declare
  v_etape text;
begin
  if not public.acq_transition_valide(p_depuis, p_vers) then
    return false;
  end if;
  select etape into v_etape from ops.prospects where id = p_id for update;
  if not found or v_etape is distinct from p_depuis then
    return false;
  end if;
  update ops.prospects set
    etape = p_vers,
    bail_jusqua = null,
    siren = coalesce(p_patch ->> 'siren', siren),
    entreprise = coalesce(p_patch ->> 'entreprise', entreprise),
    cible = coalesce(nullif(p_patch ->> 'cible', ''), cible),
    metier = coalesce(p_patch ->> 'metier', metier),
    commune = coalesce(p_patch ->> 'commune', commune),
    departement = coalesce(p_patch ->> 'departement', departement),
    domaine = coalesce(p_patch ->> 'domaine', domaine),
    page_meta = coalesce(p_patch ->> 'page_meta', page_meta),
    instagram = coalesce(p_patch ->> 'instagram', instagram),
    faits = coalesce(p_patch -> 'faits', faits),
    canaux = coalesce(p_patch -> 'canaux', canaux),
    froid = coalesce((p_patch ->> 'froid')::boolean, froid),
    formulaire = coalesce(p_patch -> 'formulaire', formulaire),
    technologie = coalesce(p_patch ->> 'technologie', technologie),
    score_douleur = case when jsonb_typeof(p_patch -> 'score_douleur') = 'number' then (p_patch ->> 'score_douleur')::numeric::smallint else score_douleur end,
    score_douleur_detail = case when jsonb_typeof(p_patch -> 'score_douleur') = 'number' then p_patch -> 'score_douleur_detail' else score_douleur_detail end,
    score_douleur_le = case when jsonb_typeof(p_patch -> 'score_douleur') = 'number' then now() else score_douleur_le end,
    maj_le = now()
  where id = p_id;
  return true;
end
$function$;
revoke all on function public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb) to service_role;

-- ── 3. acq_score_douleur_poser : noter sans changer d'étape ────────────────────────────────────────────────────────────────
create or replace function public.acq_score_douleur_poser(p_id uuid, p_score integer, p_detail jsonb)
returns boolean
language plpgsql
security definer
set search_path to 'ops', 'public', 'pg_temp'
as $function$
begin
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception using message = 'ops:score_douleur', errcode = 'P0001';
  end if;
  update ops.prospects
     set score_douleur = p_score, score_douleur_detail = p_detail, score_douleur_le = now()
   where id = p_id;
  return found;
end
$function$;
revoke all on function public.acq_score_douleur_poser(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.acq_score_douleur_poser(uuid, integer, jsonb) to service_role;
comment on function public.acq_score_douleur_poser(uuid, integer, jsonb) is
  'Pose le score de douleur (0-100) et son détail (codes et nombres) d''un prospect, sans changer son étape ni maj_le (0135).';

-- ── 4. acq_reserver : par score de douleur décroissant ─────────────────────────────────────────────────────────────────────
create or replace function public.acq_reserver(p_etape text, p_limite integer, p_bail_s integer)
returns jsonb
language plpgsql
security definer
set search_path to 'ops', 'public', 'pg_temp'
as $function$
declare
  v_ids uuid[];
  v_result jsonb;
begin
  if p_etape not in ('candidat', 'recense') then
    raise exception using message = 'ops:etape', errcode = 'P0001';
  end if;
  select coalesce(array_agg(x.id), '{}') into v_ids
    from (
      select id from ops.prospects
       where etape = p_etape and (bail_jusqua is null or bail_jusqua < now())
       order by score_douleur desc nulls last, maj_le, id
       limit greatest(coalesce(p_limite, 1), 0)
         for update skip locked
    ) x;
  -- 3e tentative : la ligne passe à a_decider au lieu d'être rendue (026-060 §2)
  update ops.prospects
     set etape = 'a_decider', bail_jusqua = null, tentatives = 3, maj_le = now()
   where id = any(v_ids) and tentatives >= 2;
  update ops.prospects
     set bail_jusqua = now() + make_interval(secs => greatest(coalesce(p_bail_s, 1800), 1)),
         tentatives = tentatives + 1, maj_le = now()
   where id = any(v_ids) and tentatives < 2;
  select coalesce(jsonb_agg(to_jsonb(t.*) order by t.score_douleur desc nulls last, t.id), '[]'::jsonb) into v_result
    from ops.prospects t
   where t.id = any(v_ids) and t.etape = p_etape;
  return v_result;
end
$function$;
revoke all on function public.acq_reserver(text, integer, integer) from public, anon, authenticated;
grant execute on function public.acq_reserver(text, integer, integer) to service_role;

-- ── 5. acq_prospects_pour_premier_contact : même priorité ──────────────────────────────────────────────────────────────────
create or replace function public.acq_prospects_pour_premier_contact(p_canal text, p_limite integer)
returns jsonb
language plpgsql
security definer
set search_path to 'ops', 'public', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  if p_canal = 'formulaire_site' then
    select coalesce(jsonb_agg(to_jsonb(x.*) order by x.rang, x.score_douleur desc nulls last, x.maj_le), '[]'::jsonb) into v_result
      from (
        select p.*, (case when p.etape = 'maquette_prete' then 0 else 1 end) as rang
          from ops.prospects p
         where p.etape in ('maquette_prete', 'verifie')
           and p.froid = true
           and coalesce(p.formulaire ->> 'eligible', '') = 'true'
           and not exists (
                 select 1 from ops.opposition o
                  where (o.expire_le is null or o.expire_le > now())
                    and (
                          (p.siren is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p.siren)))
                       or (p.domaine is not null and o.cle_type = 'domaine' and o.cle_valeur = lower(regexp_replace(btrim(p.domaine), '^www\.', '')))
                        )
               )
           and not exists (
                 select 1 from ops.envois e
                  where e.canal = 'formulaire_site'
                    and e.statut in ('prepare', 'attend_accord_benj', 'approuve', 'envoye')
                    and exists (
                          select 1 from ops.prospects p2
                           where p2.id = e.prospect_id
                             and ((p.siren is not null and p2.siren = p.siren)
                               or (p.domaine is not null and lower(btrim(p2.domaine)) = lower(btrim(p.domaine))))
                        )
               )
         order by rang, p.score_douleur desc nulls last, p.maj_le
         limit greatest(coalesce(p_limite, 1), 0)
      ) x;
  else
    select coalesce(jsonb_agg(to_jsonb(x.*) order by x.rang, x.score_douleur desc nulls last, x.maj_le), '[]'::jsonb) into v_result
      from (
        select p.*, (case when p.etape = 'maquette_prete' then 0 else 1 end) as rang
          from ops.prospects p
         where p.etape in ('maquette_prete', 'verifie')
           and p.froid = true
           and exists (select 1 from jsonb_array_elements(coalesce(p.canaux, '[]'::jsonb)) c
                        where c ->> 'canal' = p_canal and coalesce((c ->> 'verifie')::boolean, false))
           and not exists (
                 select 1 from ops.opposition o
                  where (o.expire_le is null or o.expire_le > now())
                    and (
                          (p.siren is not null and o.cle_type = 'siren' and o.cle_valeur = lower(btrim(p.siren)))
                       or (p.instagram is not null and o.cle_type = 'instagram' and o.cle_valeur = lower(regexp_replace(btrim(p.instagram), '^@', '')))
                       or (p.page_meta is not null and o.cle_type = 'page_meta' and o.cle_valeur = lower(btrim(p.page_meta)))
                        )
               )
         order by rang, p.score_douleur desc nulls last, p.maj_le
         limit greatest(coalesce(p_limite, 1), 0)
      ) x;
  end if;
  return v_result;
end
$function$;
revoke all on function public.acq_prospects_pour_premier_contact(text, integer) from public, anon, authenticated;
grant execute on function public.acq_prospects_pour_premier_contact(text, integer) to service_role;
