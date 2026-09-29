---------------------------- _A_COLLER_sql_editor_0116_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
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

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'acq_maquette_par_jeton rend objet ET objets (attendu : oui)' as quoi,
       case when pg_get_functiondef(to_regprocedure('public.acq_maquette_par_jeton(text)')) ilike '%''objet'', m.objet%'
             and pg_get_functiondef(to_regprocedure('public.acq_maquette_par_jeton(text)')) ilike '%''objets'', m.objets%'
            then 'oui' else 'non' end as resultat
union all
select 'acq_maquette_par_jeton : security definer, stable (attendu : oui)',
       case when exists (select 1 from pg_proc where oid = to_regprocedure('public.acq_maquette_par_jeton(text)')
                          and prosecdef and provolatile = 's')
            then 'oui' else 'non' end
union all
select 'acq_maquette_par_jeton : service_role seul (attendu : oui)',
       case when to_regprocedure('public.acq_maquette_par_jeton(text)') is not null
             and has_function_privilege('service_role', 'public.acq_maquette_par_jeton(text)', 'execute')
             and not has_function_privilege('anon', 'public.acq_maquette_par_jeton(text)', 'execute')
             and not has_function_privilege('authenticated', 'public.acq_maquette_par_jeton(text)', 'execute')
            then 'oui' else 'non' end
union all
select 'aucune autre fonction acq_* touchée par 0116 (attendu : oui)',
       case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname like 'acq\_%') = 63
            then 'oui' else 'non' end;
