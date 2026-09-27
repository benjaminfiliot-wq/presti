  -- scripts/fixtures/026/usine-production/essai-0110.sql — le scénario de l'essai à sec de la migration de l'usine (026-054,
  -- cahier US-7), écrit par 026-052 avant la migration. Placé par `node scripts/usine-sql-qa.mjs --generer-essai` dans le bloc
  -- d'essai, après le jumeau nu (0096 à 0098 sont déjà appliquées quand 026-054 tourne). Une clé par vérification dans `r` ;
  -- les clés `diag_*` ne sont que des diagnostics. Seules des lignes d'essai sont écrites (agent essai_e2e_usine, clés
  -- essai_e2e:usine:*) et tout part avec l'exception finale.
  -- La capacité de l'agent d'essai est `essai_usine`, pas `livraison` : ops_tache_prendre prend la plus ancienne tâche en file
  -- de ses capacités, et une vraie tâche `livrer_site` en file serait prise avant la tâche d'essai (rendue au rollback, mais
  -- l'essai porterait sur elle). ops.taches.capacite n'admet que des lettres et « _ » (0096).
  <<essai_0110>>
  declare
    v_t uuid;
    v_t2 uuid;
    v_p uuid;
    v_n bigint;
    v_ok boolean;
    v_role text;
    v_types text[] := array['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'image/webp',
                            'image/avif', 'image/jpeg', 'image/png', 'image/svg+xml', 'font/woff2', 'text/plain', 'application/xml',
                            'text/xml']::text[];
  begin
    -- ── Installation : un agent d'essai, une tâche prise par lui, une autre laissée en file ────────────────────────────────
    begin
      perform public.ops_agent_enregistrer('essai_e2e_usine', 'Essai usine', array['essai_usine']::text[],
        array['livrer_site']::text[], array['taches', 'evenements']::text[], 60, 30, 10, 0::numeric);
      select t.id into v_t from public.ops_tache_creer('essai_e2e_usine', 'livrer_site', 'essai_e2e:usine:' || gen_random_uuid()::text,
        'essai_usine', jsonb_build_object('commande', gen_random_uuid(), 'essai', true), null::uuid, null::text) t;
      select p.id into v_p from public.ops_tache_prendre('essai_e2e_usine') p;
      select t.id into v_t2 from public.ops_tache_creer('essai_e2e_usine', 'livrer_site', 'essai_e2e:usine:' || gen_random_uuid()::text,
        'essai_usine', jsonb_build_object('commande', gen_random_uuid(), 'essai', true), null::uuid, null::text) t;
      r := r || jsonb_build_object('installation', v_t is not null and v_p = v_t and v_t2 is not null
        and exists (select 1 from ops.taches where id = v_t and statut = 'bail' and agent = 'essai_e2e_usine'));
    exception when others then
      r := r || jsonb_build_object('installation', false, 'diag_installation', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── La fonction rend la tâche à celui qui la tient, et à personne d'autre ───────────────────────────────────────────────
    begin
      select count(*) = 1 into v_ok from public.ops_tache_detenue('essai_e2e_usine', v_t) d
       where d.id = v_t and d.type = 'livrer_site' and d.capacite = 'essai_usine' and d.cle_idempotence like 'essai_e2e:usine:%'
         and d.charge ? 'commande' and (d.charge ->> 'essai') = 'true' and d.bail_jusqua > now();
      r := r || jsonb_build_object('detenue_pour_lui', coalesce(v_ok, false));
      r := r || jsonb_build_object('pas_pour_livreur_usine', not exists (select 1 from public.ops_tache_detenue('livreur_usine', v_t)));
      r := r || jsonb_build_object('pas_pour_id_invente', not exists (select 1 from public.ops_tache_detenue('essai_e2e_usine', gen_random_uuid())));
      r := r || jsonb_build_object('pas_pour_tache_en_file', not exists (select 1 from public.ops_tache_detenue('essai_e2e_usine', v_t2)));
      update ops.taches set bail_jusqua = now() - interval '1 minute' where id = v_t;
      r := r || jsonb_build_object('pas_pour_bail_expire', not exists (select 1 from public.ops_tache_detenue('essai_e2e_usine', v_t)));
    exception when others then
      r := r || jsonb_build_object('detenue_pour_lui', false, 'pas_pour_livreur_usine', false, 'pas_pour_id_invente', false,
        'pas_pour_tache_en_file', false, 'pas_pour_bail_expire', false, 'diag_detenue', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Sécurité et droits : security definer, stable, service_role seul ────────────────────────────────────────────────────
    begin
      select p.prosecdef and p.provolatile = 's' and exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
        into v_ok from pg_proc p where p.oid = to_regprocedure('public.ops_tache_detenue(text,uuid)');
      r := r || jsonb_build_object('securite_definer_stable_search_path', coalesce(v_ok, false));
      r := r || jsonb_build_object('droits_service_role_seul',
        has_function_privilege('service_role', 'public.ops_tache_detenue(text,uuid)', 'execute')
        and not has_function_privilege('anon', 'public.ops_tache_detenue(text,uuid)', 'execute')
        and not has_function_privilege('authenticated', 'public.ops_tache_detenue(text,uuid)', 'execute')
        and not has_function_privilege('public', 'public.ops_tache_detenue(text,uuid)', 'execute'));
    exception when others then
      r := r || jsonb_build_object('securite_definer_stable_search_path', false, 'droits_service_role_seul', false,
        'diag_securite', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform * from public.ops_tache_detenue('essai_e2e_usine', gen_random_uuid());
      r := r || jsonb_build_object('anon_refuse', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse', v_role = 'anon' and sqlstate = '42501', 'diag_anon', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform * from public.ops_tache_detenue('essai_e2e_usine', gen_random_uuid());
      r := r || jsonb_build_object('authenticated_refuse', false);
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;

    -- ── Le bucket privé, ses limites, aucune politique ──────────────────────────────────────────────────────────────────────
    begin
      r := r || jsonb_build_object('bucket_prive_et_limite', exists (select 1 from storage.buckets
        where id = 'usine' and name = 'usine' and not public and file_size_limit = 8388608
          and allowed_mime_types @> v_types and allowed_mime_types <@ v_types));
      r := r || jsonb_build_object('aucune_politique_usine', not exists (select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and (policyname ilike '%usine%' or coalesce(qual, '') ilike '%usine%' or coalesce(with_check, '') ilike '%usine%')));
    exception when others then
      r := r || jsonb_build_object('bucket_prive_et_limite', false, 'aucune_politique_usine', false, 'diag_bucket', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── Les deux graines, et rien sur le jeton, le battement ni la pause ────────────────────────────────────────────────────
    begin
      r := r || jsonb_build_object('graine_usine', exists (select 1 from ops.agents
        where nom = 'usine' and libelle = 'Surveillance de l''usine' and capacites = array['surveillance']::text[]
          and cardinality(types_crees) = 0 and tables_ecrites @> array['evenements', 'decisions'] and tables_ecrites <@ array['evenements', 'decisions']
          and periode_minutes = 30 and debit_minute = 30 and quota_creations_jour = 2 and plafond_euros_jour = 0 and retire_le is null));
      r := r || jsonb_build_object('graine_livreur_usine', exists (select 1 from ops.agents
        where nom = 'livreur_usine' and libelle = 'Livreur de sites (usine)' and capacites = array['livraison']::text[]
          and cardinality(types_crees) = 0 and tables_ecrites @> array['taches', 'evenements'] and tables_ecrites <@ array['taches', 'evenements']
          and periode_minutes = 60 and debit_minute = 30 and quota_creations_jour = 0 and plafond_euros_jour = 0 and retire_le is null));
    exception when others then
      r := r || jsonb_build_object('graine_usine', false, 'graine_livreur_usine', false, 'diag_graines', sqlstate || ' ' || left(sqlerrm, 160));
    end;
  end essai_0110;
