-- Contrôle 0111, lecture seule. Chaque ligne rend oui ou non.
select 'table:'||t.nom as objet,
 case when to_regclass('ops.'||t.nom) is not null
   and (select c.relrowsecurity from pg_class c where c.oid=to_regclass('ops.'||t.nom))
   and not exists(select 1 from pg_policy pol where pol.polrelid=to_regclass('ops.'||t.nom))
   and not has_table_privilege('anon','ops.'||t.nom,'SELECT')
   and not has_table_privilege('authenticated','ops.'||t.nom,'SELECT') then 'oui' else 'non' end as conforme
from (values ('paliers'),('etat_envoi'),('technologies'),('signaux'),('modeles_suspendus'),('jauges')) t(nom)
union all
select 'fonction:'||f.nom,
 case when exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname=f.schema and p.proname=f.nom
   and p.prosecdef and has_function_privilege('service_role',p.oid,'EXECUTE')
   and not has_function_privilege('anon',p.oid,'EXECUTE')
   and not has_function_privilege('authenticated',p.oid,'EXECUTE')) then 'oui' else 'non' end
from (values
 ('public','acq_etat_envoi'),('public','acq_signal'),('public','acq_palier_evaluer'),
 ('public','acq_palier_appliquer'),('public','acq_notice_verifiee'),('public','acq_modele_suspendre'),
 ('public','acq_modeles_suspendus'),('public','acq_envoi_froid_ouvrir'),('public','acq_technologie_reprendre'),
 ('public','acq_canal_rouvrir'),('public','acq_modele_lever'),('public','acq_palier_plafond'),
 ('public','acq_disjoncteurs_etat'),('public','acq_ventes_froides'),('public','acq_jauge_consommer'),
 ('public','acq_jauges'),('public','acq_echantillon_du_soir')) f(schema,nom)
union all
select 'fonction-privee:'||f.nom,
 case when exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='ops' and p.proname=f.nom
   and not has_function_privilege('service_role',p.oid,'EXECUTE')
   and not has_function_privilege('anon',p.oid,'EXECUTE')
   and not has_function_privilege('authenticated',p.oid,'EXECUTE')) then 'oui' else 'non' end
from (values ('maintenant'),('garde_modeles'),('suivre_technologies'),('acq_commande_du_prospect')) f(nom)
union all
select 'declencheur:'||d.nom,
 case when exists(select 1 from pg_trigger t where t.tgrelid='ops.envois'::regclass and t.tgname=d.nom and t.tgenabled<>'D') then 'oui' else 'non' end
from (values ('garde_modeles'),('suivre_technologies')) d(nom)
union all
select 'graine:'||v.id,
 case when p.par_jour=v.par_jour and p.jours_au_vert is not distinct from v.jours_au_vert then 'oui' else 'non' end
from (values ('P0',5,5),('P1',10,5),('P2',20,null::int),('P3',30,5),('P4',40,null::int)) v(id,par_jour,jours_au_vert)
left join ops.paliers p on p.id=v.id
union all
select 'etat:P0',case when exists(select 1 from ops.etat_envoi where id and palier='P0') then 'oui' else 'non' end
union all
select 'absence:ancien-schema',case when to_regclass('ops.boites') is null then 'oui' else 'non' end
union all
select 'absence:second-accord',case when to_regclass('ops.accords_envoi') is null
  and not exists(select 1 from information_schema.columns where table_schema='ops' and table_name='envois' and column_name='attend_accord_benj')
  and to_regclass('ops.accords_benj') is not null then 'oui' else 'non' end;
