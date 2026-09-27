-- supabase/controles/0099_ops_garde_envois.sql — TÉMOIN de 026-032 (jamais appliqué) : ne fait que LIRE.
select 'les deux déclencheurs existent et sont actifs' as quoi,
       case when (select count(*) from pg_trigger t join pg_proc f on f.oid = t.tgfoid
                   where f.proname in ('garde_envois', 'annuler_sur_opposition') and t.tgenabled <> 'D' and not t.tgisinternal) = 2
            then 'oui' else 'NON' end as resultat
union all
select 'plafonds de la voie gratuite',
       case when (select count(*) from ops.quotas_canaux where envoyeur = '*' and canal in ('instagram', 'facebook', 'formulaire_site') and plafond_jour = 0) = 3
             and exists (select 1 from ops.quotas_canaux where canal = 'email_sollicite' and envoyeur = '*' and plafond_jour = 50)
            then 'oui' else 'NON' end
union all
select 'envoi_froid fermé',
       case when exists (select 1 from ops.interrupteurs where nom = 'envoi_froid' and not actif) then 'oui' else 'NON' end
union all
select 'ops_garde_etat sécurisée',
       case when exists (select 1 from pg_proc where proname = 'ops_garde_etat' and prosecdef and array_to_string(proconfig, ',') like '%search_path%')
             and has_function_privilege('service_role', 'public.ops_garde_etat()', 'execute')
            then 'oui' else 'NON' end
union all
select 'anon et authenticated n''exécutent rien de 0099',
       case when not has_function_privilege('anon', 'public.ops_garde_etat()', 'execute')
             and not has_function_privilege('authenticated', 'public.ops_garde_etat()', 'execute')
             and not has_function_privilege('anon', 'ops.garde_envois()', 'execute')
             and not has_function_privilege('authenticated', 'ops.garde_envois()', 'execute')
            then 'oui' else 'NON' end;
