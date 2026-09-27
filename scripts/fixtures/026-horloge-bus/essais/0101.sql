  -- scripts/fixtures/026-horloge-bus/essais/0101.sql — le scénario de l'essai à sec de 0101 (026-086, cahier HS-8), écrit par
  -- 026-032 avant la migration. Placé par `horloge-sql-qa.mjs --generer-essai [--avec=…]` dans le bloc d'essai, après les
  -- jumeaux nus. Une clé par cas dans `r` ; les clés `diag_*` ne sont que des diagnostics.
  --
  -- Le secret n'est JAMAIS lu : sa présence vient de ops_horloge_etat() (un booléen), et la requête mise en file par pg_net
  -- n'est vérifiée que par ses colonnes url, timeout_milliseconds, method et la PRÉSENCE de la clé Authorization. Elle part
  -- avec l'exception finale : pg_net ne voit que les requêtes validées, celle-ci ne l'est jamais. Le scénario ne touche pas au
  -- Vault : pour simuler l'absence du secret, il recrée dans sa transaction ops_horloge_minute() à l'identique, sauf le nom
  -- qu'elle cherche (« cron_secret » y devient un nom qui n'existe pas) ; la fonction d'origine revient avec l'exception.
  -- Sans le secret posé par Benj (préalable de 026-086), les clés de la requête sont fausses et le disent.
  <<essai_0101>>
  declare
    v_id bigint;
    v_n0 bigint;
    v_n1 bigint;
    v_n2 bigint;
    v_q0 bigint;
    v_q1 bigint;
    v_url text;
    v_to int;
    v_auth boolean;
    v_meth text;
    v_def text;
    v_etat jsonb;
    v_secret boolean := false;
    v_role text;
    v_fin constant text := 'essai_026:fin_de_groupe';
  begin
    -- ── A. Les tâches planifiées ────────────────────────────────────────────────────────────────────────────────────────
    r := r || jsonb_build_object('tache_tic_chaque_minute', exists (select 1 from cron.job where jobname = 'presti-agents-tic' and schedule = '* * * * *'));
    r := r || jsonb_build_object('tache_tic_active', exists (select 1 from cron.job where jobname = 'presti-agents-tic' and active));
    r := r || jsonb_build_object('tic_commande_minute', exists (select 1 from cron.job where jobname = 'presti-agents-tic'
                                   and lower(regexp_replace(command, '[[:space:];]', '', 'g')) = 'selectpublic.ops_horloge_minute()'));
    r := r || jsonb_build_object('tache_menage_planifiee', exists (select 1 from cron.job where jobname = 'presti-cron-menage' and schedule = '17 3 * * *' and active));

    -- ── B. L'état de l'horloge : sept clés, secret_present booléen (jamais la valeur) ───────────────────────────────────
    begin
      v_etat := public.ops_horloge_etat(60);
      r := r || jsonb_build_object('etat_sept_cles', v_etat ?& array['job_actif', 'planning', 'secret_present', 'executions', 'trous', 'reponses', 'derniere_execution'], 'diag_etat', left(v_etat::text, 160));
      r := r || jsonb_build_object('etat_secret_present_booleen', jsonb_typeof(v_etat -> 'secret_present') = 'boolean');
      v_secret := coalesce((v_etat ->> 'secret_present')::boolean, false);
      r := r || jsonb_build_object('secret_present_prealable', v_secret, 'diag_secret', case when v_secret then 'cron_secret présent' else 'cron_secret absent : préalable de 026-086 (Benj le pose par l''écran Vault du tableau de bord)' end);
    exception when others then
      r := r || jsonb_build_object('etat_sept_cles', false, 'etat_secret_present_booleen', false, 'secret_present_prealable', false, 'diag_etat', sqlstate || ' ' || left(sqlerrm, 160));
    end;

    -- ── C. Avec le secret : une requête pg_net vers l'URL exacte, 30 000 ms, un en-tête Authorization (sa valeur non lue) ─
    begin
      v_id := public.ops_horloge_minute();
      r := r || jsonb_build_object('minute_met_en_file_une_requete', v_id is not null and exists (select 1 from net.http_request_queue where id = v_id),
                                   'diag_minute', coalesce(v_id::text, 'null : aucune requête (secret absent ?)'));
      select q.url, q.timeout_milliseconds, q.headers ? 'Authorization', q.method::text into v_url, v_to, v_auth, v_meth
        from net.http_request_queue q where q.id = v_id;
      r := r || jsonb_build_object('requete_url_exacte', v_url is not distinct from 'https://prestiapp.fr/api/agents/tic');
      r := r || jsonb_build_object('requete_timeout_30000', v_to is not distinct from 30000, 'diag_timeout', v_to);
      r := r || jsonb_build_object('requete_authorization_presente', coalesce(v_auth, false));
      r := r || jsonb_build_object('requete_methode_get', upper(coalesce(v_meth, '')) = 'GET');
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then
        r := r || jsonb_build_object('minute_met_en_file_une_requete', false, 'requete_url_exacte', false, 'requete_timeout_30000', false,
                                     'requete_authorization_presente', false, 'requete_methode_get', false, 'diag_groupe_minute', sqlstate || ' ' || left(sqlerrm, 160));
      end if;
    end;

    -- ── D. Sans le secret : aucune requête, un événement horloge_sans_secret, une fois par heure au plus ───────────────
    begin
      v_def := pg_get_functiondef('public.ops_horloge_minute()'::regprocedure);
      r := r || jsonb_build_object('simulation_sans_secret_nom_trouve', position('''cron_secret''' in v_def) > 0);
      execute replace(v_def, '''cron_secret''', '''cron_secret_absent_essai_026''');
      select count(*) into v_q0 from net.http_request_queue;
      select count(*) into v_n0 from ops.evenements where type = 'horloge_sans_secret' and le > now() - interval '1 hour';
      v_id := public.ops_horloge_minute();
      select count(*) into v_q1 from net.http_request_queue;
      select count(*) into v_n1 from ops.evenements where type = 'horloge_sans_secret' and le > now() - interval '1 hour';
      r := r || jsonb_build_object('sans_secret_rend_null', v_id is null);
      r := r || jsonb_build_object('sans_secret_aucune_requete', v_q1 = v_q0, 'diag_sans_secret_requetes', v_q0 || ' puis ' || v_q1);
      r := r || jsonb_build_object('sans_secret_un_evenement', v_n1 = greatest(v_n0, 1), 'diag_sans_secret_evenements', v_n0 || ' puis ' || v_n1);
      v_id := public.ops_horloge_minute();
      select count(*) into v_n2 from ops.evenements where type = 'horloge_sans_secret' and le > now() - interval '1 hour';
      r := r || jsonb_build_object('sans_secret_une_fois_par_heure', v_n2 = v_n1 and v_id is null, 'diag_une_fois', v_n1 || ' puis ' || v_n2);
      raise exception using message = v_fin;
    exception when others then
      if sqlerrm <> v_fin then r := r || jsonb_build_object('diag_groupe_sans_secret', sqlstate || ' ' || left(sqlerrm, 160)); end if;
    end;

    -- ── E. Les droits : ops_horloge_minute n'est à personne, ops_horloge_etat à service_role seul (42501) ───────────────
    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_horloge_minute();
      r := r || jsonb_build_object('anon_refuse_minute', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse_minute', v_role = 'anon' and sqlstate = '42501', 'diag_anon_minute', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
    v_role := null;
    begin
      set local role anon;
      v_role := current_user;
      perform public.ops_horloge_etat(10);
      r := r || jsonb_build_object('anon_refuse_etat', false);
    exception when others then
      r := r || jsonb_build_object('anon_refuse_etat', v_role = 'anon' and sqlstate = '42501', 'diag_anon_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_horloge_minute();
      r := r || jsonb_build_object('authenticated_refuse_minute', false);
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse_minute', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated_minute', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
    v_role := null;
    begin
      set local role authenticated;
      v_role := current_user;
      perform public.ops_horloge_etat(10);
      r := r || jsonb_build_object('authenticated_refuse_etat', false);
    exception when others then
      r := r || jsonb_build_object('authenticated_refuse_etat', v_role = 'authenticated' and sqlstate = '42501', 'diag_authenticated_etat', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
    v_role := null;
    begin
      set local role service_role;
      v_role := current_user;
      perform public.ops_horloge_minute();
      r := r || jsonb_build_object('service_role_refuse_minute', false);
    exception when others then
      r := r || jsonb_build_object('service_role_refuse_minute', v_role = 'service_role' and sqlstate = '42501', 'diag_service_role_minute', coalesce(v_role, '?') || ' ' || sqlstate || ' ' || left(sqlerrm, 120));
    end;
    reset role;
  end essai_0101;
