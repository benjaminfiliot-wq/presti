// Fabrique le bloc d'essai à sec de 0115 (jumeau nu coupé + scénario + raise exception) : node .orchestre/preuves/026-251/fabriquer-essai.mjs
import fs from 'node:fs'
import { blocEssai, jumeauNuCoupe, empreinte } from '../../../scripts/lib/sql-essai.mjs'

const nu = jumeauNuCoupe('supabase/migrations/_A_COLLER_sql_editor_0115_NU.sql')
const scenario = `
  r := r || jsonb_build_object('graines', (select count(*) from ops.agents a where a.nom in ('sav', 'qualite_sites', 'vigile') and a.retire_le is null
        and a.jeton_hash is null and not a.en_pause and a.capacites = '{}'::text[] and a.battement_le is null) = 3);
  r := r || jsonb_build_object('graine_sav', (select a.periode_minutes = 15 and a.tables_ecrites = array['evenements', 'decisions']::text[] and a.plafond_euros_jour = 0 from ops.agents a where a.nom = 'sav'));
  r := r || jsonb_build_object('graine_qualite', (select a.periode_minutes = 1440 and a.tables_ecrites = array['evenements', 'decisions']::text[] from ops.agents a where a.nom = 'qualite_sites'));
  r := r || jsonb_build_object('graine_vigile', (select a.periode_minutes = 1440 and a.tables_ecrites = array['evenements']::text[] from ops.agents a where a.nom = 'vigile'));
  perform public.ops_agent_enregistrer('vigile', 'Vigile (sécurité)', '{}'::text[], '{}'::text[], array['evenements']::text[], 1440, 30, 0, 0);
  r := r || jsonb_build_object('rejouable', (select count(*) = 1 from ops.agents where nom = 'vigile' and jeton_hash is null and not en_pause));
  r := r || jsonb_build_object('refus_anon_authenticated', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('vigile_conseiller', 'vigile_agents', 'pilotage_activite_salles')
          and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute') or not has_function_privilege('service_role', p.oid, 'execute'))));
  r := r || jsonb_build_object('definer_et_search_path', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('vigile_conseiller', 'vigile_agents', 'pilotage_activite_salles')
          and (not p.prosecdef or p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))));
  r := r || jsonb_build_object('conseiller_six_controles', (select count(*) = 6 and bool_and(nombre >= 0) and bool_and(lint ~ '^[a-z0-9_]{1,60}$') from public.vigile_conseiller()));
  r := r || jsonb_build_object('conseiller_forme', (select array_agg(distinct niveau order by niveau) <@ array['ERROR', 'INFO', 'WARN']::text[]
        and array_agg(distinct categorie order by categorie) <@ array['PERFORMANCE', 'SECURITY']::text[] from public.vigile_conseiller()));
  r := r || jsonb_build_object('agents_une_ligne_par_agent', (select count(*) from public.vigile_agents()) = (select count(*) from ops.agents where retire_le is null));
  r := r || jsonb_build_object('agents_chiffres', (select bool_and(echecs_1h >= 0 and cout_jour_eur >= 0 and envois_hors_regle_24h >= 0) from public.vigile_agents()));
  r := r || jsonb_build_object('agents_sav_present', exists (select 1 from public.vigile_agents() where nom = 'sav'));
  r := r || jsonb_build_object('salles_vingt', (select count(*) = 20 from public.pilotage_activite_salles(now() - interval '1 day')));
  r := r || jsonb_build_object('salles_jamais_ecommerce', not exists (select 1 from public.pilotage_activite_salles(now() - interval '1 day') where salle = 'ecommerce'));
  perform public.ops_evenement_ajouter('vigile', 'essai_postes', null, 'événement d''essai, annulé par l''exception finale', null);
  r := r || jsonb_build_object('sav_range_en_presti', (select minutes >= 0 from public.pilotage_activite_salles(now() - interval '1 hour') where salle = 'presti'));
  r := r || jsonb_build_object('vigile_range_en_securite', (select minutes >= 5 from public.pilotage_activite_salles(now() - interval '1 hour') where salle = 'securite'));
`
const e = empreinte(nu)
const bloc = blocEssai({ nus: [nu], scenario, empreinte: e })
fs.writeFileSync('.orchestre/preuves/026-251/bloc-essai-a-sec.sql', bloc)
console.log(`bloc écrit : ${bloc.length} signes, empreinte du jumeau nu ${e}`)
