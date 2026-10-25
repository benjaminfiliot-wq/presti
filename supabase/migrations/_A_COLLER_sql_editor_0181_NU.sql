---------------------------- _A_COLLER_sql_editor_0181_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.relances_impayes add column if not exists sujet text;
alter table public.relances_impayes add column if not exists texte text;
do $statut$
declare c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.relances_impayes'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%statut%'
  loop
    execute format('alter table public.relances_impayes drop constraint %I', c.conname);
  end loop;
end $statut$;
alter table public.relances_impayes drop constraint if exists relances_impayes_statut;
alter table public.relances_impayes add constraint relances_impayes_statut
  check (statut in ('prise', 'envoyee', 'a_valider', 'rejetee'));
alter table public.relances_impayes drop constraint if exists relances_impayes_contenu;
alter table public.relances_impayes add constraint relances_impayes_contenu check (
  (sujet is null or (char_length(sujet) between 1 and 150 and position(chr(10) in sujet) = 0 and position(chr(13) in sujet) = 0))
  and (texte is null or char_length(texte) between 1 and 4000)
);
alter table public.relances_impayes drop constraint if exists relances_impayes_a_valider_contenu;
alter table public.relances_impayes add constraint relances_impayes_a_valider_contenu
  check (statut <> 'a_valider' or (sujet is not null and texte is not null));
create index if not exists relances_impayes_a_valider on public.relances_impayes (artisan_id) where statut = 'a_valider';
comment on column public.relances_impayes.sujet is
  'Offre Studio (0181) : le sujet de la relance preparee, relu et eventuellement retouche par l artisan avant envoi.';
comment on column public.relances_impayes.texte is
  'Offre Studio (0181) : le message complet de la relance preparee (pied compris), tel que le client le recevra une fois valide.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- Contrôle de 0181 (lecture seule).
select 'colonnes sujet et texte (attendu 2)' as quoi, count(*)::text as resultat
  from information_schema.columns where table_schema = 'public' and table_name = 'relances_impayes' and column_name in ('sujet', 'texte') and is_nullable = 'YES'
union all select 'contrainte de statut elargie (attendu 1)', count(*)::text
  from pg_constraint where conrelid = 'public.relances_impayes'::regclass and conname = 'relances_impayes_statut' and pg_get_constraintdef(oid) ilike '%a_valider%' and pg_get_constraintdef(oid) ilike '%rejetee%'
union all select 'contraintes CHECK parlant du statut (attendu 2)', count(*)::text
  from pg_constraint where conrelid = 'public.relances_impayes'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%statut%'
union all select 'index relances_impayes_a_valider (attendu 1)', count(*)::text
  from pg_indexes where schemaname = 'public' and tablename = 'relances_impayes' and indexname = 'relances_impayes_a_valider'
union all select 'RLS active (attendu true)', relrowsecurity::text from pg_class where oid = 'public.relances_impayes'::regclass
union all select 'authenticated peut ecrire (attendu false)', has_table_privilege('authenticated', 'public.relances_impayes', 'update')::text;
