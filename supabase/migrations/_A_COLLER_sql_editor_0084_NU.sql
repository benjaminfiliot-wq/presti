---------------------------- _A_COLLER_sql_editor_0084_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
do $sortie$
declare
  v_email    constant text := 'alexandremesroua@gmail.com';
  v_id       uuid;
  v_sessions int := 0;
  v_roles    int := 0;
  v_codes    int := 0;
begin
  select id into v_id from public.artisans where lower(email) = v_email;
  if v_id is null then
    raise notice '0084 : aucun compte % en base — rien à retirer.', v_email;
    return;
  end if;
  -- 1. Les privilèges, en une seule instruction (voir l'avertissement ci-dessus).
  --
  -- `est_demo` mérite un mot : ce n'est pas une accusation, c'est le marqueur « ne compte pas
  -- dans les chiffres » (0068). Tant qu'il était fondateur, le filtre l'excluait par `is_founder` ;
  -- ce filtre tombe avec le privilège, et sans ce marqueur son compte deviendrait demain un
  -- « client » de plus dans le tableau de bord — une offre business offerte comptée comme une
  -- vente. Le marqueur n'a aucun effet sur son usage du produit : il ne change que les comptages.
  update public.artisans
     set is_founder               = false,
         role_interne             = null,
         est_demo                 = true,
         sessions_invalides_avant = now() + interval '1 second'
   where id = v_id;
  -- 2. Le rôle du Poste de contrôle. La garde exige `is_founder` d'abord, donc cette ligne était
  --    déjà sans effet — on la retire quand même : un droit qui traîne finit par resservir.
  delete from public.direction_roles where user_id = v_id;
  get diagnostics v_roles = row_count;
  -- 3. Le code d'apport. On DÉSACTIVE, on ne supprime pas : `registre_apports.apporteur_id` est en
  --    `on delete restrict`, et surtout un code retiré ne doit jamais être réattribué à quelqu'un
  --    d'autre — le lien prestiapp.fr/a/<code> a circulé. Inactif, `rattacher_apport` le refuse.
  update public.apporteurs set actif = false
   where actif and (artisan_id = v_id or nom ilike '%alexandre%');
  get diagnostics v_codes = row_count;
  -- 4. Les sessions ouvertes. Le seuil posé plus haut invalide les jetons d'accès déjà émis ;
  --    celle-ci tue les jetons de rafraîchissement. Il faut les DEUX (leçon du 03/09 : sans le
  --    second, un jeton copié se refabriquait un accès pendant que l'écran annonçait le contraire).
  v_sessions := public.revoquer_sessions_auth(v_id);
  -- 5. La trace. Une action de direction non journalisée n'a pas lieu — celle-ci moins que les
  --    autres. L'acteur est Benjamin : c'est sa décision, pas celle d'une migration.
  insert into public.journal_direction
    (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, reconfirme)
  select b.id, b.email, 'partenaire_retire', 'artisan', v_id::text, v_id,
         jsonb_build_object('is_founder', true, 'role_interne', 'partenaire', 'role_centre', 'lecture', 'code_apport', 'actif'),
         jsonb_build_object('is_founder', false, 'role_interne', null, 'role_centre', null,
                            'sessions_fermees', v_sessions, 'codes_apport_desactives', v_codes,
                            'motif', 'fin de la collaboration — décision de Benjamin, migration 0084'),
         true
    from public.artisans b where lower(b.email) = 'benjaminfiliot@gmail.com';
  raise notice '0084 : % — privilèges retirés, % rôle(s) supprimé(s), % code(s) d''apport désactivé(s), % session(s) fermée(s).',
    v_email, v_roles, v_codes, v_sessions;
end $sortie$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'privileges restants' as quoi,
       coalesce(string_agg(email || ' → is_founder=' || is_founder::text || ', role=' || coalesce(role_interne, '(nul)'), ' · '), 'aucun') as resultat
  from public.artisans where is_founder or role_interne is not null
union all
select 'roles du Poste de controle',
       coalesce(string_agg(a.email || ' = ' || r.role, ' · '), 'aucun')
  from public.direction_roles r join public.artisans a on a.id = r.user_id
union all
select 'codes d''apport actifs',
       coalesce(string_agg(code, ', '), 'aucun (attendu)')
  from public.apporteurs where actif
union all
select 'sortie journalisee',
       coalesce(to_char(max(cree_le), 'DD/MM/YYYY HH24:MI'), 'AUCUNE TRACE — anormal')
  from public.journal_direction where action = 'partenaire_retire';
