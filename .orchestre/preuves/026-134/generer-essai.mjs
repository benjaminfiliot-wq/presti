// Génère le bloc de l'essai à sec de 0104_crieur (026-134) avec blocEssai (scripts/lib/sql-essai.mjs) : le jumeau nu (coupé à la
// marque du contrôle) puis le scénario ci-dessous, puis `raise exception 'ESSAI_A_SEC <empreinte> <json>'` : tout est annulé.
// Usage : node .orchestre/preuves/026-134/generer-essai.mjs > essai.sql
import { jumeauNuCoupe, empreinte, blocEssai, analyserEssai } from '../../../scripts/lib/sql-essai.mjs'
const nu = jumeauNuCoupe('supabase/migrations/_A_COLLER_sql_editor_0104_NU.sql')
const cas = (cle, corps, decl = '') => `
  declare ok boolean := false; ${decl}
  begin
${corps}
    r := r || jsonb_build_object('${cle}', coalesce(ok, false));
  exception when others then
    r := r || jsonb_build_object('${cle}', false, 'diag_${cle}', left(sqlstate || ' ' || sqlerrm, 200));
  end;`
const scenario = `
  begin
${cas('table', `
    ok := to_regclass('public.crieur_posts') is not null
      and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'crieur_posts' and column_name = 'programmee_pour');`)}
${cas('rls', `
    ok := exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'crieur_posts' and c.relrowsecurity)
      and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'crieur_posts');`)}
${cas('anon_refuse', `
    begin execute 'set local role anon'; perform count(*) from public.crieur_posts; execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role anon'; insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W01', 'linkedin', 'essai', 'erreur'); execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    begin execute 'set local role authenticated'; perform count(*) from public.crieur_posts; execute 'reset role'; exception when insufficient_privilege then n := n + 1; end;
    execute 'reset role';
    ok := n = 3;
    r := r || jsonb_build_object('diag_anon_refuse', n || '/3');`, 'n integer := 0;')}
${cas('unique_refuse', `
    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W01', 'linkedin', 'un', 'brouillon_publora');
    begin
      insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W01', 'linkedin', 'deux', 'erreur');
      ok := false;
    exception when unique_violation then ok := true; end;`)}
${cas('externe_accepte', `
    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W02', 'facebook', 'un', 'brouillon_publora');
    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W02', 'facebook', 'ailleurs', 'externe');
    insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W02', 'facebook', 'ailleurs encore', 'externe');
    ok := (select count(*) = 3 from public.crieur_posts where semaine = '2099-W02');`)}
${cas('instagram_accepte', `
    insert into public.crieur_posts (semaine, canal, texte, statut, programmee_pour) values ('2099-W03', 'instagram', 'reel', 'programmee', now() + interval '26 hours');
    begin
      insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W03', 'linkedin', 'sans horaire', 'programmee');
      ok := false;
    exception when check_violation then ok := true; end;
    begin
      insert into public.crieur_posts (semaine, canal, texte, statut) values ('2099-W03', 'tiktok', 'canal inconnu', 'erreur');
      ok := false;
    exception when check_violation then null; end;
    ok := ok and (select count(*) = 1 from public.crieur_posts where semaine = '2099-W03' and canal = 'instagram');`)}
${cas('appel_protege', `
    ok := exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'crieur_appel' and p.prosecdef)
      and not has_function_privilege('anon', 'public.crieur_appel()', 'execute')
      and not has_function_privilege('authenticated', 'public.crieur_appel()', 'execute')
      and not has_function_privilege('service_role', 'public.crieur_appel()', 'execute');`)}
${cas('tache_planifiee', `
    ok := exists (select 1 from cron.job j where j.jobname = 'presti-crieur' and j.schedule = '0 5 * * *' and j.command = 'select public.crieur_appel()');`)}
  end;`
const bloc = blocEssai({ nus: [nu], scenario, empreinte: empreinte(nu) })
const a = analyserEssai(bloc, { nus: [nu] })
if (!a.ok) { console.error(`bloc refusé : ${a.raisons.join(' ; ')}`); process.exitCode = 1 } else { process.stdout.write(bloc); console.error(`-- ${a.octets} octets, ${a.charges.length} jumeau(x)`) }
