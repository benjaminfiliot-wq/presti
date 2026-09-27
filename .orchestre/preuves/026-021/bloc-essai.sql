do $essai$
declare
  nu text := $nu$---------------------------- _A_COLLER_sql_editor_0103_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.sites_commandes add column if not exists entreprise text;
alter table public.sites_commandes add column if not exists achat_public boolean not null default false;
alter table public.sites_commandes add column if not exists cgu_acceptees_le timestamptz;
alter table public.sites_commandes add column if not exists lien_envoye_le timestamptz;
alter table public.sites_commandes add column if not exists lien_envois integer not null default 0 check (lien_envois >= 0);
alter table public.sites_commandes add column if not exists rattachee_le timestamptz;
alter table public.sites_commandes add column if not exists courriels jsonb not null default '{}'::jsonb;
alter table public.sites_commandes add column if not exists search_console_le timestamptz;
alter table public.sites_commandes add column if not exists compte_supprime_le timestamptz;
alter table public.sites_commandes add column if not exists retiree_le timestamptz;
alter table public.sites_commandes add column if not exists dossier_jeton_hash text;
alter table public.sites_commandes add column if not exists dossier_expire_le timestamptz;
alter table public.sites_commandes add column if not exists dossier_envoye_le timestamptz;
alter table public.sites_commandes add column if not exists fichiers_purges_le timestamptz;
alter table public.sites_commandes add column if not exists generation_demandee_le timestamptz;
alter table public.sites_commandes add column if not exists generation_tentatives integer not null default 0 check (generation_tentatives >= 0);
alter table public.sites_commandes add column if not exists generation_duree_s integer check (generation_duree_s >= 0);
alter table public.sites_commandes drop constraint if exists sites_commandes_etat_check;
alter table public.sites_commandes add constraint sites_commandes_etat_check check (etat in ('brouillon', 'payee', 'generee', 'validee', 'en_ligne', 'retiree'));
create index if not exists sites_commandes_retraits_dus_idx on public.sites_commandes (compte_supprime_le) where etat = 'en_ligne' and compte_supprime_le is not null;
create index if not exists sites_commandes_brouillons_publics_idx on public.sites_commandes (cree_le) where etat = 'brouillon' and achat_public;
create index if not exists sites_commandes_rattachement_idx on public.sites_commandes (lower(email)) where artisan_id is null and achat_public;
comment on column public.sites_commandes.courriels is 'Date d envoi de chacun des trois e-mails a l artisan : cles payee, generee, en_ligne (un envoi par cle, jamais deux).';
comment on column public.sites_commandes.dossier_jeton_hash is 'Empreinte SHA-256 du jeton du lien du dossier, jamais le jeton lui-meme.';
comment on column public.sites_commandes.compte_supprime_le is 'Date de purge du compte de l artisan : le site est retire douze mois plus tard (article 3 bis des CGU).';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
-- Contrôle de 0103_livraison_commandes (fiche 026-021) : lecture seule, une ligne « oui » ou « non » par
-- colonne (type, nullabilité et défaut lus dans information_schema.columns), une pour la contrainte d'état
-- (lue dans pg_constraint, 'retiree' présent) et une par index partiel (lu dans pg_indexes). Tout « oui »
-- après l'application ; tout « non » (colonnes, index) avant.
select 'colonne ' || c.nom as quoi,
       case when exists (
         select 1 from information_schema.columns i
          where i.table_schema = 'public' and i.table_name = 'sites_commandes' and i.column_name = c.nom
            and i.data_type = c.type and i.is_nullable = c.nullable and coalesce(i.column_default, '') = c.defaut
       ) then 'oui' else 'non' end as resultat
  from (values
    ('entreprise', 'text', 'YES', ''),
    ('achat_public', 'boolean', 'NO', 'false'),
    ('cgu_acceptees_le', 'timestamp with time zone', 'YES', ''),
    ('lien_envoye_le', 'timestamp with time zone', 'YES', ''),
    ('lien_envois', 'integer', 'NO', '0'),
    ('rattachee_le', 'timestamp with time zone', 'YES', ''),
    ('courriels', 'jsonb', 'NO', '''{}''::jsonb'),
    ('search_console_le', 'timestamp with time zone', 'YES', ''),
    ('compte_supprime_le', 'timestamp with time zone', 'YES', ''),
    ('retiree_le', 'timestamp with time zone', 'YES', ''),
    ('dossier_jeton_hash', 'text', 'YES', ''),
    ('dossier_expire_le', 'timestamp with time zone', 'YES', ''),
    ('dossier_envoye_le', 'timestamp with time zone', 'YES', ''),
    ('fichiers_purges_le', 'timestamp with time zone', 'YES', ''),
    ('generation_demandee_le', 'timestamp with time zone', 'YES', ''),
    ('generation_tentatives', 'integer', 'NO', '0'),
    ('generation_duree_s', 'integer', 'YES', '')
  ) as c(nom, type, nullable, defaut)
union all
select 'contrainte sites_commandes_etat_check (avec retiree)',
       case when exists (
         select 1 from pg_constraint k
          where k.conrelid = to_regclass('public.sites_commandes') and k.conname = 'sites_commandes_etat_check'
            and pg_get_constraintdef(k.oid) like '%''retiree''%'
       ) then 'oui' else 'non' end
union all
select 'index ' || x.nom,
       case when exists (
         select 1 from pg_indexes p
          where p.schemaname = 'public' and p.tablename = 'sites_commandes' and p.indexname = x.nom
            and p.indexdef ilike x.predicat
       ) then 'oui' else 'non' end
  from (values
    ('sites_commandes_retraits_dus_idx', '%(compte_supprime_le) WHERE ((etat = ''en_ligne''::text) AND (compte_supprime_le IS NOT NULL))'),
    ('sites_commandes_brouillons_publics_idx', '%(cree_le) WHERE ((etat = ''brouillon''::text) AND achat_public)'),
    ('sites_commandes_rattachement_idx', '%(lower(email)) WHERE ((artisan_id IS NULL) AND achat_public)')
  ) as x(nom, predicat);
$nu$;
  marque text := '-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.';
  migration text;
  controle text;
  r jsonb := '{}'::jsonb;
  ligne record;
  avant jsonb := '[]'::jsonb;
  apres jsonb := '[]'::jsonb;
  apres2 jsonb := '[]'::jsonb;
  msg text;
  v_id uuid;
  v_def record;
begin
  r := r || jsonb_build_object('sha256_nu_recu', encode(sha256(convert_to(nu, 'UTF8')), 'hex'));
  migration := split_part(nu, marque, 1);
  controle := regexp_replace(split_part(nu, marque, 2), ';\s*$', '');
  -- A. le contrôle sur la base telle qu'elle est
  for ligne in execute controle loop avant := avant || jsonb_build_array(ligne.quoi || '=' || ligne.resultat); end loop;
  r := r || jsonb_build_object('A_controle_avant', avant);
  -- B. la migration (le jumeau nu, coupé à la marque)
  execute migration;
  r := r || jsonb_build_object('B_migration', 'passee');
  -- C. le contrôle après
  for ligne in execute controle loop apres := apres || jsonb_build_array(ligne.quoi || '=' || ligne.resultat); end loop;
  r := r || jsonb_build_object('C_controle_apres', apres);
  -- D. idempotence : la migration une seconde fois
  execute migration;
  for ligne in execute controle loop apres2 := apres2 || jsonb_build_array(ligne.quoi || '=' || ligne.resultat); end loop;
  r := r || jsonb_build_object('D_seconde_passe', 'passee', 'D_controle_apres_seconde', apres2);
  -- E. une ligne 'retiree' et ses défauts
  insert into public.sites_commandes (email, etat, metier, entreprise)
    values ('essai-a-sec-0103.retiree@presti-test.invalid', 'retiree', 'Essai', 'essai-a-sec-0103')
    returning id into v_id;
  select achat_public, lien_envois, courriels, generation_tentatives, generation_duree_s, retiree_le into v_def from public.sites_commandes where id = v_id;
  r := r || jsonb_build_object('E_insertion_retiree', 'acceptee', 'E_defauts', jsonb_build_object('achat_public', v_def.achat_public, 'lien_envois', v_def.lien_envois, 'courriels', v_def.courriels, 'generation_tentatives', v_def.generation_tentatives, 'generation_duree_s', v_def.generation_duree_s, 'retiree_le', v_def.retiree_le));
  -- F. les refus
  begin insert into public.sites_commandes (email, etat) values ('essai-a-sec-0103.inconnu@presti-test.invalid', 'inconnu'); msg := 'ACCEPTEE (anormal)'; exception when others then msg := sqlstate || ' ' || sqlerrm; end;
  r := r || jsonb_build_object('F1_etat_inconnu', msg);
  begin insert into public.sites_commandes (email, lien_envois) values ('essai-a-sec-0103.lien@presti-test.invalid', -1); msg := 'ACCEPTEE (anormal)'; exception when others then msg := sqlstate || ' ' || sqlerrm; end;
  r := r || jsonb_build_object('F2_lien_envois_negatif', msg);
  begin insert into public.sites_commandes (email, generation_tentatives) values ('essai-a-sec-0103.tent@presti-test.invalid', -1); msg := 'ACCEPTEE (anormal)'; exception when others then msg := sqlstate || ' ' || sqlerrm; end;
  r := r || jsonb_build_object('F3_generation_tentatives_negatif', msg);
  begin insert into public.sites_commandes (email, generation_duree_s) values ('essai-a-sec-0103.duree@presti-test.invalid', -1); msg := 'ACCEPTEE (anormal)'; exception when others then msg := sqlstate || ' ' || sqlerrm; end;
  r := r || jsonb_build_object('F4_generation_duree_negative', msg);
  begin insert into public.sites_commandes (email, courriels) values ('essai-a-sec-0103.courriels@presti-test.invalid', null); msg := 'ACCEPTEE (anormal)'; exception when others then msg := sqlstate || ' ' || sqlerrm; end;
  r := r || jsonb_build_object('F5_courriels_null', msg);
  -- G. la fermeture : anon et authenticated ne lisent pas dossier_jeton_hash
  begin set local role anon; perform dossier_jeton_hash from public.sites_commandes limit 1; msg := 'LU (anormal)'; reset role; exception when others then msg := sqlstate || ' ' || sqlerrm; end;
  r := r || jsonb_build_object('G1_anon_dossier_jeton_hash', msg);
  begin set local role authenticated; perform dossier_jeton_hash from public.sites_commandes limit 1; msg := 'LU (anormal)'; reset role; exception when others then msg := sqlstate || ' ' || sqlerrm; end;
  r := r || jsonb_build_object('G2_authenticated_dossier_jeton_hash', msg);
  r := r || jsonb_build_object('H_role_courant', current_user, 'H_contrainte', (select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.sites_commandes'::regclass and conname = 'sites_commandes_etat_check'));
  raise exception 'essai-a-sec-0103: toutes les instructions ont passé | %', r::text;
end
$essai$;