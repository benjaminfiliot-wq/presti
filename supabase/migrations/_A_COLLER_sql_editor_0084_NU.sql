---------------------------- _A_COLLER_sql_editor_0084_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
update public.artisans
   set is_founder               = false,
       role_interne             = null,
       est_demo                 = true,
       sessions_invalides_avant = now() + interval '1 second'
 where lower(email) = 'alexandremesroua@gmail.com';
delete from public.direction_roles
 where user_id in (select id from public.artisans where lower(email) = 'alexandremesroua@gmail.com');
update public.apporteurs
   set actif = false
 where actif
   and (nom ilike '%alexandre%'
        or artisan_id in (select id from public.artisans where lower(email) = 'alexandremesroua@gmail.com'));
select public.revoquer_sessions_auth(id)
  from public.artisans
 where lower(email) = 'alexandremesroua@gmail.com';
insert into public.journal_direction
  (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, reconfirme)
select b.id, b.email, 'partenaire_retire', 'artisan', a.id::text, a.id,
       jsonb_build_object('is_founder', true, 'role_interne', 'partenaire', 'role_centre', 'lecture'),
       jsonb_build_object('is_founder', false, 'role_interne', null::text, 'role_centre', null::text,
                          'motif', 'fin de la collaboration - decision de Benjamin, migration 0084'),
       true
  from public.artisans a, public.artisans b
 where lower(a.email) = 'alexandremesroua@gmail.com'
   and lower(b.email) = 'benjaminfiliot@gmail.com'
   and not exists (select 1 from public.journal_direction where action = 'partenaire_retire');

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'privileges restants' as quoi,
       coalesce(string_agg(email || ' is_founder=' || is_founder::text || ' role=' || coalesce(role_interne, 'nul'), ' | '), 'aucun') as resultat
  from public.artisans where is_founder or role_interne is not null
union all
select 'roles du poste de controle',
       coalesce(string_agg(a.email || '=' || r.role, ' | '), 'aucun')
  from public.direction_roles r join public.artisans a on a.id = r.user_id
union all
select 'codes apport actifs',
       coalesce(string_agg(code, ', '), 'aucun (attendu)')
  from public.apporteurs where actif
union all
select 'sortie journalisee',
       coalesce(to_char(max(cree_le), 'DD/MM/YYYY HH24:MI'), 'AUCUNE TRACE (anormal)')
  from public.journal_direction where action = 'partenaire_retire';
