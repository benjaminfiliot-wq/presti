-- 0137_premier_contact_formulaire_verifie.sql — 08/10/2026
--
-- Panne : acq_prospects_pour_premier_contact('formulaire_site', …) exigeait `formulaire ->> 'eligible' = 'true'`, or cette clé
-- n'est JAMAIS écrite à « true » (0106 ne l'écrit qu'à `false`, sur un abandon définitif ; le recenseur et le juge des faits
-- gardent le verdict dans le canal, pas dans l'objet formulaire). Résultat : zéro prospect choisi, zéro premier contact,
-- « premiers_contacts: 0 » à chaque passe du rédacteur alors que 8 prospects étaient vérifiés (constaté le 08/10).
--
-- Règle corrigée : un prospect a un formulaire utilisable quand (a) son formulaire n'est pas marqué eligible=false et
-- (b) il porte un canal `formulaire_site` dont `verifie` est vrai (posé par le juge des faits quand le formulaire est lisible,
-- sans captcha ni pot de miel ni refus de démarchage). Tout le reste est repris À L'IDENTIQUE de 0135 : opposition (siren,
-- domaine), un seul envoi en cours par entreprise, ordre maquette prête puis score de douleur. Les autres gardes (interrupteur
-- envoi_froid, palier, notice, Facteur, juges) ne sont pas touchées.

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
           and p.formulaire is not null
           and coalesce(p.formulaire ->> 'eligible', '') <> 'false'
           and exists (select 1 from jsonb_array_elements(coalesce(p.canaux, '[]'::jsonb)) c
                        where c ->> 'canal' = 'formulaire_site' and coalesce((c ->> 'verifie')::boolean, false))
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
