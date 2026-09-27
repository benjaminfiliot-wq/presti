---------------------------- _A_COLLER_sql_editor_0097_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.ops_agent_enregistrer(p_nom text, p_libelle text, p_capacites text[], p_types_crees text[], p_tables text[], p_periode_minutes integer, p_debit_minute integer, p_quota_creations_jour integer, p_plafond_euros_jour numeric)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_existait boolean;
begin
  select exists (select 1 from ops.agents a where a.nom = p_nom) into v_existait;
  insert into ops.agents as a (nom, libelle, capacites, types_crees, tables_ecrites, periode_minutes, debit_minute, quota_creations_jour, plafond_euros_jour)
  values (p_nom, p_libelle, p_capacites, p_types_crees, p_tables, p_periode_minutes, p_debit_minute, p_quota_creations_jour, p_plafond_euros_jour)
  on conflict (nom) do update
     set libelle = excluded.libelle,
         capacites = excluded.capacites,
         types_crees = excluded.types_crees,
         tables_ecrites = excluded.tables_ecrites,
         periode_minutes = excluded.periode_minutes,
         debit_minute = excluded.debit_minute,
         quota_creations_jour = excluded.quota_creations_jour,
         plafond_euros_jour = excluded.plafond_euros_jour;
  insert into ops.evenements (agent, type, objet, resume)
  values (p_nom, 'agent_enregistre', 'agent:' || p_nom,
          left(case when v_existait then 'fiche mise à jour : ' else 'fiche créée : ' end || p_libelle, 200));
end
$$;
revoke all on function public.ops_agent_enregistrer(text, text, text[], text[], text[], integer, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.ops_agent_enregistrer(text, text, text[], text[], text[], integer, integer, integer, numeric) to service_role;
comment on function public.ops_agent_enregistrer(text, text, text[], text[], text[], integer, integer, integer, numeric) is
  'Insère ou met à jour la fiche d''un agent (026-011). Ne touche jamais jeton_hash, battement_le, en_pause ni disjoncteur_ouvert_le. Événement agent_enregistre.';
create or replace function public.ops_agent_poser_jeton(p_nom text, p_hash text)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  if p_hash is null or char_length(p_hash) <> 64 or p_hash ~ '[^0-9a-f]' then
    raise exception using message = 'ops:jeton_format', errcode = 'P0001';
  end if;
  perform 1 from ops.agents a where a.nom = p_nom and a.retire_le is null for update;
  if not found then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  if exists (select 1 from ops.agents a where a.jeton_hash = p_hash and a.nom <> p_nom) then
    raise exception using message = 'ops:jeton_deja_pris', errcode = 'P0001';
  end if;
  update ops.agents set jeton_hash = p_hash, jeton_pose_le = now() where nom = p_nom;
  insert into ops.evenements (agent, type, objet, resume)
  values (p_nom, 'jeton_pose', 'agent:' || p_nom, 'jeton d''accès posé (son empreinte ne se journalise jamais)');
end
$$;
revoke all on function public.ops_agent_poser_jeton(text, text) from public, anon, authenticated;
grant execute on function public.ops_agent_poser_jeton(text, text) to service_role;
comment on function public.ops_agent_poser_jeton(text, text) is
  'Pose l''empreinte sha256 (64 hexadécimaux) du jeton d''un agent non retiré (026-011). ops:jeton_format, ops:agent_inconnu, ops:jeton_deja_pris. Événement jeton_pose, sans l''empreinte.';
create or replace function public.ops_agent_par_jeton(p_hash text)
returns table(nom text, capacites text[], types_crees text[], tables_ecrites text[], debit_minute integer, en_pause boolean, disjoncteur_ouvert boolean)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select a.nom, a.capacites, a.types_crees, a.tables_ecrites, a.debit_minute, a.en_pause, a.disjoncteur_ouvert_le is not null
    from ops.agents a
   where a.jeton_hash = p_hash
     and a.retire_le is null
$$;
revoke all on function public.ops_agent_par_jeton(text) from public, anon, authenticated;
grant execute on function public.ops_agent_par_jeton(text) to service_role;
comment on function public.ops_agent_par_jeton(text) is
  'L''agent non retiré qui porte cette empreinte de jeton, ou rien (026-011). Lecture, sans événement : c''est la porte de la garde du bus.';
create or replace function public.ops_agent_retirer(p_nom text)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_retire timestamptz;
  v_purge text;
begin
  if p_nom in ('systeme', 'a0') then
    raise exception using message = 'ops:agent_protege', errcode = 'P0001';
  end if;
  select a.retire_le into v_retire from ops.agents a where a.nom = p_nom for update;
  if not found then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  if left(p_nom, 10) = 'essai_e2e_' then
    -- agent d essai : effacement complet, cascade comprise, sous le drapeau de purge du journal
    v_purge := current_setting('ops.purge', true);
    perform set_config('ops.purge', 'oui', true);
    delete from ops.agents a where a.nom = p_nom;
    perform set_config('ops.purge', coalesce(v_purge, ''), true);
    return;
  end if;
  if v_retire is not null then
    return;
  end if;
  update ops.agents
     set jeton_hash = null, en_pause = true, pause_motif = 'agent retiré', retire_le = now()
   where nom = p_nom;
  insert into ops.evenements (agent, type, objet, resume)
  values (p_nom, 'agent_retire', 'agent:' || p_nom, 'agent retiré : jeton effacé, mis en pause');
end
$$;
revoke all on function public.ops_agent_retirer(text) from public, anon, authenticated;
grant execute on function public.ops_agent_retirer(text) to service_role;
comment on function public.ops_agent_retirer(text) is
  'Retire un agent (026-011). systeme et a0 : ops:agent_protege. essai_e2e_… : effacement complet et cascade sous ops.purge = oui, sans trace. Sinon jeton effacé, pause, retire_le et un événement agent_retire.';
create or replace function public.ops_agent_pause(p_nom text, p_pause boolean, p_motif text)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_retire timestamptz;
begin
  if p_pause is null then
    raise exception using message = 'ops:pause', errcode = 'P0001';
  end if;
  if p_motif is not null and char_length(p_motif) > 200 then
    raise exception using message = 'ops:motif', errcode = 'P0001';
  end if;
  select a.retire_le into v_retire from ops.agents a where a.nom = p_nom for update;
  if not found or (v_retire is not null and not p_pause) then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  update ops.agents
     set en_pause = p_pause,
         pause_motif = p_motif,
         disjoncteur_ouvert_le = case when p_pause then disjoncteur_ouvert_le else null end
   where nom = p_nom;
  insert into ops.evenements (agent, type, objet, resume)
  values (p_nom, case when p_pause then 'agent_pause' else 'agent_reprise' end, 'agent:' || p_nom,
          left(case when p_pause then 'mis en pause' else 'reprise' end || coalesce(' : ' || p_motif, ''), 200));
end
$$;
revoke all on function public.ops_agent_pause(text, boolean, text) from public, anon, authenticated;
grant execute on function public.ops_agent_pause(text, boolean, text) to service_role;
comment on function public.ops_agent_pause(text, boolean, text) is
  'Met un agent en pause ou le reprend (026-011). La reprise efface aussi disjoncteur_ouvert_le ; un agent retiré ne reprend pas. Événement agent_pause ou agent_reprise.';
create or replace function public.ops_agent_echeance(p_nom text, p_expire_le timestamptz)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  update ops.agents set jeton_externe_expire_le = p_expire_le where nom = p_nom;
  if not found then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  insert into ops.evenements (agent, type, objet, resume)
  values (p_nom, 'jeton_echeance', 'agent:' || p_nom,
          case when p_expire_le is null then 'jeton externe sans échéance'
               else 'jeton externe valable jusqu''au ' || to_char(p_expire_le at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI') end);
end
$$;
revoke all on function public.ops_agent_echeance(text, timestamptz) from public, anon, authenticated;
grant execute on function public.ops_agent_echeance(text, timestamptz) to service_role;
comment on function public.ops_agent_echeance(text, timestamptz) is
  'Pose l''échéance du jeton externe d''un agent (jeton Meta de A7 : 60 jours). Nulle = jeton sans expiration (meta-echeance.mjs --jamais, expires_at: 0, 026-077). Événement jeton_echeance.';
create or replace function public.ops_battement(p_nom text)
returns timestamptz
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_le timestamptz;
begin
  update ops.agents set battement_le = now()
   where nom = p_nom and retire_le is null
  returning battement_le into v_le;
  if not found then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  return v_le;
end
$$;
revoke all on function public.ops_battement(text) from public, anon, authenticated;
grant execute on function public.ops_battement(text) to service_role;
comment on function public.ops_battement(text) is
  'battement_le = now() pour un agent existant et non retiré (026-011). Sans événement, pour ne pas inonder le journal.';
create or replace function public.ops_evenement_ajouter(p_agent text, p_type text, p_objet text, p_resume text, p_tache uuid)
returns bigint
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_id bigint;
begin
  if p_resume is null or char_length(p_resume) < 1 or char_length(p_resume) > 200 then
    raise exception using message = 'ops:resume', errcode = 'P0001';
  end if;
  if p_type is null or char_length(p_type) < 2 or char_length(p_type) > 40 or p_type ~ '[^a-z_]' then
    raise exception using message = 'ops:type', errcode = 'P0001';
  end if;
  if p_objet is not null and char_length(p_objet) > 200 then
    raise exception using message = 'ops:objet', errcode = 'P0001';
  end if;
  if not exists (select 1 from ops.agents a where a.nom = p_agent) then
    raise exception using message = 'ops:agent_inconnu', errcode = 'P0001';
  end if;
  insert into ops.evenements (agent, type, objet, resume, tache_id)
  values (p_agent, p_type, p_objet, p_resume, p_tache)
  returning id into v_id;
  return v_id;
end
$$;
revoke all on function public.ops_evenement_ajouter(text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.ops_evenement_ajouter(text, text, text, text, uuid) to service_role;
comment on function public.ops_evenement_ajouter(text, text, text, text, uuid) is
  'Ajoute une ligne au journal du bus et rend son id (026-011). Résumé de 1 à 200 signes, sinon ops:resume.';
create or replace function public.ops_evenements_lire(p_agent text, p_apres bigint, p_limite integer)
returns table(id bigint, le timestamptz, agent text, type text, objet text, resume text, tache_id uuid)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select e.id, e.le, e.agent, e.type, e.objet, e.resume, e.tache_id
    from ops.evenements e
   where e.id > coalesce(p_apres, 0)
     and e.agent <> p_agent
   order by e.id
   limit least(greatest(coalesce(p_limite, 200), 1), 200)
$$;
revoke all on function public.ops_evenements_lire(text, bigint, integer) from public, anon, authenticated;
grant execute on function public.ops_evenements_lire(text, bigint, integer) to service_role;
comment on function public.ops_evenements_lire(text, bigint, integer) is
  'Les événements d''id > p_apres, SANS ceux de p_agent (plan §3.4 : un agent ne réagit jamais à ses propres événements), par id, 1 à 200 lignes (026-011).';
create or replace function public.ops_evenements_purger(p_jours integer)
returns integer
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_n integer;
  v_purge text;
begin
  if p_jours is null or p_jours < 30 then
    raise exception using message = 'ops:purge', errcode = 'P0001';
  end if;
  -- le journal est en ajout seul : la purge se declare le temps de son effacement
  v_purge := current_setting('ops.purge', true);
  perform set_config('ops.purge', 'oui', true);
  delete from ops.evenements e where e.le < now() - make_interval(days => least(p_jours, 36500));
  get diagnostics v_n = row_count;
  perform set_config('ops.purge', coalesce(v_purge, ''), true);
  if v_n > 0 then
    insert into ops.evenements (agent, type, objet, resume)
    values ('systeme', 'purge', 'journal', left('purge du journal : ' || v_n || ' événement(s) de plus de ' || p_jours || ' jours', 200));
  end if;
  return v_n;
end
$$;
revoke all on function public.ops_evenements_purger(integer) from public, anon, authenticated;
grant execute on function public.ops_evenements_purger(integer) to service_role;
comment on function public.ops_evenements_purger(integer) is
  'Efface les événements de plus de p_jours jours (au moins 30, sinon ops:purge) sous ops.purge = oui, et rend leur nombre (026-011).';
create or replace function public.ops_interrupteur(p_nom text)
returns boolean
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_actif boolean;
begin
  select i.actif into v_actif from ops.interrupteurs i where i.nom = p_nom;
  if not found then
    raise exception using message = 'ops:interrupteur', errcode = 'P0001';
  end if;
  return v_actif;
end
$$;
revoke all on function public.ops_interrupteur(text) from public, anon, authenticated;
grant execute on function public.ops_interrupteur(text) to service_role;
comment on function public.ops_interrupteur(text) is
  'L''état d''un interrupteur du bus (pause_generale, envoi_froid). Nom inconnu : ops:interrupteur (026-011).';
create or replace function public.ops_interrupteur_poser(p_nom text, p_actif boolean, p_motif text, p_auteur uuid)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  if p_motif is null or char_length(p_motif) < 3 or char_length(p_motif) > 200 then
    raise exception using message = 'ops:motif', errcode = 'P0001';
  end if;
  if p_actif is null then
    raise exception using message = 'ops:interrupteur', errcode = 'P0001';
  end if;
  update ops.interrupteurs
     set actif = p_actif, motif = p_motif, change_le = now(), change_par = p_auteur
   where nom = p_nom;
  if not found then
    raise exception using message = 'ops:interrupteur', errcode = 'P0001';
  end if;
  insert into ops.evenements (agent, type, objet, resume)
  values ('systeme', 'interrupteur', 'interrupteur:' || p_nom,
          left(p_nom || case when p_actif then ' passe à actif : ' else ' passe à inactif : ' end || p_motif, 200));
end
$$;
revoke all on function public.ops_interrupteur_poser(text, boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.ops_interrupteur_poser(text, boolean, text, uuid) to service_role;
comment on function public.ops_interrupteur_poser(text, boolean, text, uuid) is
  'Pose un interrupteur du bus (026-011). p_auteur doit être un artisan is_founder, sinon ops:auteur ; motif de 3 à 200 signes, sinon ops:motif. Événement de l''agent systeme, type interrupteur.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
with attendues(signature) as (
  values ('public.ops_agent_enregistrer(text, text, text[], text[], text[], integer, integer, integer, numeric)'),
         ('public.ops_agent_poser_jeton(text, text)'),
         ('public.ops_agent_par_jeton(text)'),
         ('public.ops_agent_retirer(text)'),
         ('public.ops_agent_pause(text, boolean, text)'),
         ('public.ops_agent_echeance(text, timestamptz)'),
         ('public.ops_battement(text)'),
         ('public.ops_evenement_ajouter(text, text, text, text, uuid)'),
         ('public.ops_evenements_lire(text, bigint, integer)'),
         ('public.ops_evenements_purger(integer)'),
         ('public.ops_interrupteur(text)'),
         ('public.ops_interrupteur_poser(text, boolean, text, uuid)')
), lues as (
  select a.signature, to_regprocedure(a.signature) as fonction from attendues a
)
select l.signature || ' : existe, security definer, search_path, exécutable par service_role seul (attendu : oui)' as quoi,
       case when l.fonction is not null
             and coalesce(p.prosecdef, false)
             and 'search_path=ops, public, pg_temp' = any(coalesce(p.proconfig, array[]::text[]))
             and not has_function_privilege('anon', l.fonction, 'execute')
             and not has_function_privilege('authenticated', l.fonction, 'execute')
             and has_function_privilege('service_role', l.fonction, 'execute')
            then 'oui' else 'NON (anormal)' end as resultat
  from lues l
  left join pg_proc p on p.oid = l.fonction
union all
select 'les 12 fonctions présentes, une seule version de chacune (attendu : oui)',
       case when (select count(*) from lues where fonction is not null) = 12
             and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public'
                                and p.proname in ('ops_agent_enregistrer', 'ops_agent_poser_jeton', 'ops_agent_par_jeton',
                                                  'ops_agent_retirer', 'ops_agent_pause', 'ops_agent_echeance', 'ops_battement',
                                                  'ops_evenement_ajouter', 'ops_evenements_lire', 'ops_evenements_purger',
                                                  'ops_interrupteur', 'ops_interrupteur_poser')
                              group by p.proname having count(*) > 1)
            then 'oui' else 'NON (anormal)' end
union all
select 'aucune fonction public.ops_* exécutable par anon ni authenticated (attendu : oui)',
       case when not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                              where n.nspname = 'public' and p.proname like 'ops\_%'
                                and (has_function_privilege('anon', p.oid, 'execute')
                                     or has_function_privilege('authenticated', p.oid, 'execute')))
            then 'oui' else 'NON (anormal)' end;
