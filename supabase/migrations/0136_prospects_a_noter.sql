-- 0136_prospects_a_noter.sql — 07/10/2026
--
-- La lecture de la passe de notation (scripts/score-douleur-passe.mjs) : les prospects encore en file (candidat, recense,
-- verifie, maquette_prete, a_decider), avec SEULEMENT ce qu'il faut au score de douleur (lib/agents/acquisition/
-- scoreDouleur.ts) : id, étape, domaine, faits, formulaire, score actuel, et le nombre de nos envois partis depuis plus de
-- 7 jours restés sans réponse (signal « pas de réponse »). Ni nom d'entreprise, ni commune, ni canal, ni texte d'envoi.
-- Les prospects jamais notés d'abord, puis les notes les plus anciennes. Réservée à service_role.

create or replace function public.acq_prospects_a_noter(p_limite integer)
returns jsonb
language sql
stable
security definer
set search_path to 'ops', 'public', 'pg_temp'
as $function$
  select coalesce(jsonb_agg(to_jsonb(x.*) order by x.score_douleur_le nulls first, x.id), '[]'::jsonb)
    from (
      select p.id, p.etape, p.domaine, p.faits, p.formulaire, p.score_douleur, p.score_douleur_le,
             (select count(*)::int from ops.envois e
               where e.prospect_id = p.id and e.statut = 'envoye' and e.envoye_le < now() - interval '7 days'
                 and not exists (select 1 from ops.reponses r where r.prospect_id = p.id and r.recu_le > e.envoye_le and r.neutralisee_le is null)
             ) as messages_sans_reponse
        from ops.prospects p
       where p.etape in ('candidat', 'recense', 'verifie', 'maquette_prete', 'a_decider')
       order by p.score_douleur_le nulls first, p.id
       limit greatest(least(coalesce(p_limite, 100), 500), 0)
    ) x
$function$;
revoke all on function public.acq_prospects_a_noter(integer) from public, anon, authenticated;
grant execute on function public.acq_prospects_a_noter(integer) to service_role;
comment on function public.acq_prospects_a_noter(integer) is
  'Prospects en file à (re)noter pour le score de douleur (0136) : id, étape, domaine, faits, formulaire, score, envois sans réponse depuis 7 j. Jamais de nom ni de canal.';
