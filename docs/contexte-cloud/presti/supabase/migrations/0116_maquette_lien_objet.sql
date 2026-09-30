-- ============================================================================================
-- 0116 · acq_maquette_par_jeton rend aussi `objet` (fiche 026-082, question à décider par Claude,
--        29/09) : la fonction ne rendait que `objets` (le jsonb posé par acq_maquette_prete, qui
--        n'est qu'un `{ variante: … }` quand l'appelant ne fournit pas de chemins déjà faits —
--        c'est le cas réel, 0106_acquisition_echanges.sql:985) sans le préfixe `objet` (colonne de
--        0096_ops_socle.sql, déjà posée par acq_maquette_lien_creer) dont `servirMaquette`
--        (lib/agents/acquisition/maquettesLien.ts, 026-082) a besoin pour reconstruire
--        `<objet>/capture.jpg` et `<objet>/video.mp4` quand `objets` ne contient que la variante :
--        un lien de maquette pourtant valide rendait 404 en production. Aucune table changée,
--        aucune donnée déplacée : une seule fonction de lecture, remplacée à l'identique sauf ce
--        champ ajouté.
-- ============================================================================================

create or replace function public.acq_maquette_par_jeton(p_jeton_hache text)
returns jsonb
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select jsonb_build_object('objet', m.objet, 'objets', m.objets, 'entreprise', p.entreprise, 'expire_le', m.expire_le)
    from ops.maquettes m
    join ops.prospects p on p.id = m.prospect_id
   where m.jeton_hache = p_jeton_hache and m.purgee_le is null and m.expire_le > now()
$$;
revoke all on function public.acq_maquette_par_jeton(text) from public, anon, authenticated;
grant execute on function public.acq_maquette_par_jeton(text) to service_role;
comment on function public.acq_maquette_par_jeton(text) is
  'null si inconnue, expirée ou purgée ; sinon objet, objets, entreprise, expire_le. Aucune écriture (026-061, objet ajouté en 0116/026-082).';
