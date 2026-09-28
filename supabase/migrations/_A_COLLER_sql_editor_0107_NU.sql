---------------------------- _A_COLLER_sql_editor_0107_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create table if not exists ops.code_etat (
  id         smallint primary key default 1 check (id = 1),
  etat       jsonb not null,
  publie_le  timestamptz not null default now()
);
alter table ops.code_etat enable row level security;
revoke all on ops.code_etat from public, anon, authenticated, service_role;
comment on table ops.code_etat is 'État de l''orchestre publié par le poste (026-017), ligne unique (id = 1). Fermée à tous les rôles : lue et écrite par pilotage_code_lire / pilotage_code_publier seules.';
create or replace function public.pilotage_decisions(p_limite integer)
returns table(id uuid, question text, contexte text, options jsonb, option_defaut text, montant_cents integer, portee text, echeance timestamptz, cree_le timestamptz, creee_par text)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select d.id, d.question, d.contexte, d.options, d.option_defaut, d.montant_cents, d.portee, d.echeance, d.cree_le, d.creee_par
    from ops.decisions d
   where d.statut = 'ouverte'
   order by coalesce(d.montant_cents, 0) desc, d.echeance, d.cree_le
   limit greatest(1, least(coalesce(p_limite, 100), 100))
$$;
revoke all on function public.pilotage_decisions(integer) from public, anon, authenticated;
grant execute on function public.pilotage_decisions(integer) to service_role;
comment on function public.pilotage_decisions(integer) is
  'Décisions ouvertes (026-076), triées comme ops_etat() : montant (nul = 0) décroissant, échéance, création. p_limite borné à 1-100.';
create or replace function public.pilotage_decision(p_id uuid)
returns table(id uuid, question text, contexte text, options jsonb, option_defaut text, montant_cents integer, portee text, echeance timestamptz, cree_le timestamptz, creee_par text)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select d.id, d.question, d.contexte, d.options, d.option_defaut, d.montant_cents, d.portee, d.echeance, d.cree_le, d.creee_par
    from ops.decisions d
   where d.id = p_id
     and d.statut = 'ouverte'
$$;
revoke all on function public.pilotage_decision(uuid) from public, anon, authenticated;
grant execute on function public.pilotage_decision(uuid) to service_role;
comment on function public.pilotage_decision(uuid) is
  'Une décision ouverte par son id (026-076), 0 ou 1 ligne. Une décision tranchée ne ressort plus ici.';
create or replace function public.pilotage_decisions_par_cles(p_cles text[])
returns table(cle text, question text, statut text, choix text, tranchee_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select d.cle_idempotence as cle, d.question, d.statut, d.choix, d.tranchee_le
    from ops.decisions d
   where d.cle_idempotence = any (p_cles[1:20])
$$;
revoke all on function public.pilotage_decisions_par_cles(text[]) from public, anon, authenticated;
grant execute on function public.pilotage_decisions_par_cles(text[]) to service_role;
comment on function public.pilotage_decisions_par_cles(text[]) is
  'Le statut de décisions par leur clé d''idempotence (026-076), 20 clés au plus, tous statuts confondus : le statut des idées d''une réunion.';
create or replace function public.pilotage_agents()
returns table(nom text, libelle text, capacites text[], en_pause boolean, pause_motif text, battement_le timestamptz, periode_minutes integer, prochain_le timestamptz, disjoncteur_ouvert_le timestamptz, dernier_type text, dernier_resume text, dernier_le timestamptz, cout_mois_eur numeric, modele text, fournisseur text, modele_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select
    a.nom, a.libelle, a.capacites, a.en_pause, a.pause_motif, a.battement_le, a.periode_minutes,
    a.battement_le + make_interval(mins => a.periode_minutes) as prochain_le,
    a.disjoncteur_ouvert_le,
    dern.type as dernier_type, dern.resume as dernier_resume, dern.le as dernier_le,
    coalesce(cm.total, 0) as cout_mois_eur,
    coalesce(rc.modele, case when a.nom = 'chef' then cyc.modele else null end) as modele,
    rc.fournisseur,
    rc.modele_le
    from ops.agents a
    left join lateral (
      select e.type, e.resume, e.le
        from ops.evenements e
       where e.agent = a.nom and e.type <> 'battement'
       order by e.le desc, e.id desc
       limit 1
    ) dern on true
    left join lateral (
      select sum(c.montant_eur) as total
        from ops.couts c
       where c.agent = a.nom
         and c.le >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
    ) cm on true
    left join lateral (
      select c.detail ->> 'modele' as modele, c.fournisseur as fournisseur, c.le as modele_le
        from ops.couts c
       where c.agent = a.nom
         and c.le >= now() - interval '7 days'
       order by c.le desc, c.id desc
       limit 1
    ) rc on true
    left join lateral (
      select e.objet as modele
        from ops.evenements e
       where e.agent = a.nom and e.type = 'cycle_termine'
       order by e.le desc, e.id desc
       limit 1
    ) cyc on true
   where a.retire_le is null
$$;
revoke all on function public.pilotage_agents() from public, anon, authenticated;
grant execute on function public.pilotage_agents() to service_role;
comment on function public.pilotage_agents() is
  'Agents non retirés (026-076) : dernier événement hors battement, prochain passage, coût du mois de Paris, modèle/fournisseur/modele_le du dernier coût sur 7 jours (chef, à défaut : objet du dernier cycle_termine). Jamais un modèle inventé.';
create or replace function public.pilotage_couts_agents(p_depuis timestamptz)
returns table(agent text, montant_eur numeric, appels integer)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select c.agent, sum(c.montant_eur) as montant_eur, count(*)::integer as appels
    from ops.couts c
   where c.le >= greatest(p_depuis, now() - interval '400 days')
   group by c.agent
$$;
revoke all on function public.pilotage_couts_agents(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_couts_agents(timestamptz) to service_role;
comment on function public.pilotage_couts_agents(timestamptz) is
  'Coûts par agent depuis p_depuis, borné à 400 jours (026-076).';
create or replace function public.pilotage_couts_taches(p_depuis timestamptz, p_limite integer)
returns table(tache_id uuid, type text, agent text, montant_eur numeric, le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select t.id as tache_id, t.type, t.cree_par as agent, sum(c.montant_eur) as montant_eur, max(c.le) as le
    from ops.couts c
    join ops.taches t on t.id = c.tache_id
   where c.le >= p_depuis
   group by t.id, t.type, t.cree_par
   order by sum(c.montant_eur) desc
   limit greatest(1, least(coalesce(p_limite, 50), 50))
$$;
revoke all on function public.pilotage_couts_taches(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.pilotage_couts_taches(timestamptz, integer) to service_role;
comment on function public.pilotage_couts_taches(timestamptz, integer) is
  'Les tâches les plus chères depuis p_depuis, limite bornée à 1-50 (026-076). Un coût sans tâche ne compte pas ici.';
create or replace function public.pilotage_couts_modeles(p_debut timestamptz)
returns table(fournisseur text, modele text, appels integer, eur numeric)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select c.fournisseur, c.detail ->> 'modele' as modele, count(*)::integer as appels, sum(c.montant_eur) as eur
    from ops.couts c
   where c.le >= greatest(p_debut, now() - interval '400 days')
   group by c.fournisseur, c.detail ->> 'modele'
$$;
revoke all on function public.pilotage_couts_modeles(timestamptz) from public, anon, authenticated;
grant execute on function public.pilotage_couts_modeles(timestamptz) to service_role;
comment on function public.pilotage_couts_modeles(timestamptz) is
  'Coûts par fournisseur et par modèle depuis p_debut, borné à 400 jours (026-076, revue transverse du 25/09 : remplace le crédit de R16). openai-codex et freellmapi sont inscrits à 0 € : une somme non nulle est une anomalie, montrée telle quelle.';
create or replace function public.pilotage_chef()
returns table(modele text, cycles_jour integer, dernier_cycle_le timestamptz, prochain_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select
    dern.objet as modele,
    (select count(*)::integer
       from ops.evenements e
      where e.agent = 'chef' and e.type = 'cycle_termine'
        and e.le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') as cycles_jour,
    dern.le as dernier_cycle_le,
    a.battement_le + make_interval(mins => a.periode_minutes) as prochain_le
    from (select 1) x
    left join ops.agents a on a.nom = 'chef'
    left join lateral (
      select e.objet, e.le
        from ops.evenements e
       where e.agent = 'chef' and e.type = 'cycle_termine'
       order by e.le desc, e.id desc
       limit 1
    ) dern on true
$$;
revoke all on function public.pilotage_chef() from public, anon, authenticated;
grant execute on function public.pilotage_chef() to service_role;
comment on function public.pilotage_chef() is
  'Une ligne (026-076) : modèle et heure du dernier cycle_termine du Chef, ses cycles depuis minuit à Paris, son prochain passage.';
create or replace function public.pilotage_evenements(p_apres bigint, p_limite integer, p_agent text, p_types text[])
returns table(id bigint, le timestamptz, agent text, type text, objet text, resume text)
language plpgsql
stable
security definer
set search_path = ops, public, pg_temp
as $$
declare
  v_limite integer := greatest(1, least(coalesce(p_limite, 200), 200));
begin
  if p_apres is not null then
    return query
      select e.id, e.le, e.agent, e.type, e.objet, e.resume
        from ops.evenements e
       where e.type <> 'battement'
         and e.id > p_apres
         and (p_agent is null or e.agent = p_agent)
         and (p_types is null or e.type = any (p_types))
       order by e.id
       limit v_limite;
  else
    return query
      select y.id, y.le, y.agent, y.type, y.objet, y.resume
        from (
          select e.id, e.le, e.agent, e.type, e.objet, e.resume
            from ops.evenements e
           where e.type <> 'battement'
             and (p_agent is null or e.agent = p_agent)
             and (p_types is null or e.type = any (p_types))
           order by e.id desc
           limit v_limite
        ) y
       order by y.id;
  end if;
end
$$;
revoke all on function public.pilotage_evenements(bigint, integer, text, text[]) from public, anon, authenticated;
grant execute on function public.pilotage_evenements(bigint, integer, text, text[]) to service_role;
comment on function public.pilotage_evenements(bigint, integer, text, text[]) is
  'Fil d''événements (026-076), jamais battement. id > p_apres par id croissant ; p_apres nul : les p_limite derniers, rendus par id croissant. p_agent et p_types filtrent. Limite bornée à 1-200.';
create or replace function public.pilotage_attention_sources()
returns table(cle text, nombre integer, plus_ancien timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select 'taches_bloquees', count(*)::integer, min(t.cree_le)
    from ops.taches t
   where t.statut in ('echec', 'a_decider')
  union all
  select 'disjoncteur', count(*)::integer, min(a.disjoncteur_ouvert_le)
    from ops.agents a
   where a.retire_le is null and a.disjoncteur_ouvert_le is not null
  union all
  select 'decision_argent', count(*)::integer, min(d.cree_le)
    from ops.decisions d
   where d.statut = 'ouverte' and d.portee in ('argent', 'artisan')
  union all
  select 'escalade_chef', count(*)::integer, min(d.cree_le)
    from ops.decisions d
   where d.statut = 'ouverte' and d.creee_par = 'chef'
     and (d.cle_idempotence is null or d.cle_idempotence not like 'chef:%:idee-%')
  union all
  select 'idee_chef', count(*)::integer, min(d.cree_le)
    from ops.decisions d
   where d.statut = 'ouverte' and d.creee_par = 'chef'
     and d.cle_idempotence like 'chef:%:idee-%'
  union all
  select 'pause_generale',
         case when coalesce((select i.actif from ops.interrupteurs i where i.nom = 'pause_generale'), false) then 1 else 0 end,
         (select i.change_le from ops.interrupteurs i where i.nom = 'pause_generale')
$$;
revoke all on function public.pilotage_attention_sources() from public, anon, authenticated;
grant execute on function public.pilotage_attention_sources() to service_role;
comment on function public.pilotage_attention_sources() is
  'Les sources de la file Attention qui vivent dans le bus (026-076), une ligne par clé, ensemble fermé : taches_bloquees, disjoncteur, decision_argent, escalade_chef, idee_chef, pause_generale.';
create or replace function public.pilotage_taches_agent(p_nom text, p_limite integer)
returns table(id uuid, type text, statut text, objet text, derniere_erreur text, preuve_presente boolean, maj_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select t.id, t.type, t.statut, t.objet, t.derniere_erreur, t.preuve_url is not null as preuve_presente, t.maj_le
    from ops.taches t
   where t.agent = p_nom or t.cree_par = p_nom
   order by t.maj_le desc, t.id desc
   limit greatest(1, least(coalesce(p_limite, 30), 30))
$$;
revoke all on function public.pilotage_taches_agent(text, integer) from public, anon, authenticated;
grant execute on function public.pilotage_taches_agent(text, integer) to service_role;
comment on function public.pilotage_taches_agent(text, integer) is
  'Les tâches prises ou créées par cet agent (026-076), les plus récentes d''abord, limite bornée à 1-30. preuve_presente au lieu de l''adresse de la preuve.';
create or replace function public.pilotage_code_publier(p_etat jsonb)
returns text
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  if jsonb_typeof(p_etat) <> 'object' then
    return 'forme';
  end if;
  if octet_length(p_etat::text) > 20000 then
    return 'trop_gros';
  end if;
  insert into ops.code_etat (id, etat, publie_le)
  values (1, p_etat, now())
  on conflict (id) do update
     set etat = excluded.etat,
         publie_le = excluded.publie_le;
  return 'ok';
end
$$;
revoke all on function public.pilotage_code_publier(jsonb) from public, anon, authenticated;
grant execute on function public.pilotage_code_publier(jsonb) to service_role;
comment on function public.pilotage_code_publier(jsonb) is
  'Remplace la ligne unique de ops.code_etat (026-076). forme si p_etat n''est pas un objet, trop_gros au-delà de 20 000 octets, sinon ok. Sans événement, comme ops_battement (0097).';
create or replace function public.pilotage_code_lire()
returns table(etat jsonb, publie_le timestamptz)
language sql
stable
security definer
set search_path = ops, public, pg_temp
as $$
  select c.etat, c.publie_le from ops.code_etat c where c.id = 1
$$;
revoke all on function public.pilotage_code_lire() from public, anon, authenticated;
grant execute on function public.pilotage_code_lire() to service_role;
comment on function public.pilotage_code_lire() is
  'L''état de l''orchestre publié, 0 ou 1 ligne (026-076).';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- Contrôle de 0107_pilotage_lecture.sql — lecture seule (fiche 026-076). Une ligne « oui » par point du
-- « Ce qu'il faut faire » 3 : les treize fonctions existent, security definer, search_path ops, public,
-- pg_temp posé ; anon et authenticated sans droit d'exécution, service_role avec ; ops.code_etat sous RLS,
-- sans politique.
with fns(sig) as (
  values
    ('public.pilotage_decisions(integer)'),
    ('public.pilotage_decision(uuid)'),
    ('public.pilotage_decisions_par_cles(text[])'),
    ('public.pilotage_agents()'),
    ('public.pilotage_couts_agents(timestamptz)'),
    ('public.pilotage_couts_taches(timestamptz,integer)'),
    ('public.pilotage_couts_modeles(timestamptz)'),
    ('public.pilotage_chef()'),
    ('public.pilotage_evenements(bigint,integer,text,text[])'),
    ('public.pilotage_attention_sources()'),
    ('public.pilotage_taches_agent(text,integer)'),
    ('public.pilotage_code_publier(jsonb)'),
    ('public.pilotage_code_lire()')
),
p as (
  select f.sig, to_regprocedure(f.sig) as oid from fns f
)
select 'les 13 fonctions pilotage_* existent (attendu : oui)' as quoi,
       case when (select count(*) from p where oid is not null) = 13 then 'oui' else 'NON (anormal)' end as resultat
union all
select 'les 13 sont security definer, search_path ops, public, pg_temp posé (attendu : oui)',
       case when (select count(*)
                    from p join pg_proc pr on pr.oid = p.oid
                   where pr.prosecdef
                     and exists (select 1 from unnest(coalesce(pr.proconfig, '{}'::text[])) c where c = 'search_path=ops, public, pg_temp')
                 ) = 13
            then 'oui' else 'NON (anormal)' end
union all
select 'anon sans droit d''exécution sur les 13 (attendu : oui)',
       case when not exists (select 1 from p where has_function_privilege('anon', p.sig, 'execute')) then 'oui' else 'NON (anormal)' end
union all
select 'authenticated sans droit d''exécution sur les 13 (attendu : oui)',
       case when not exists (select 1 from p where has_function_privilege('authenticated', p.sig, 'execute')) then 'oui' else 'NON (anormal)' end
union all
select 'service_role a le droit d''exécution sur les 13 (attendu : oui)',
       case when (select count(*) from p where has_function_privilege('service_role', p.sig, 'execute')) = 13 then 'oui' else 'NON (anormal)' end
union all
select 'ops.code_etat : RLS active, aucune politique (attendu : oui)',
       case when exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                          where n.nspname = 'ops' and c.relname = 'code_etat' and c.relrowsecurity)
             and not exists (select 1 from pg_policies where schemaname = 'ops' and tablename = 'code_etat')
            then 'oui' else 'NON (anormal)' end;
