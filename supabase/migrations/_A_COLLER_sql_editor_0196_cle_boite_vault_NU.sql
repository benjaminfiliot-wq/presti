---------------------------- _A_COLLER_sql_editor_0196_cle_boite_vault_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create or replace function public.poser_cle_boite_n8n(p_cle text) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  if p_cle is null or p_cle !~ '^[A-Za-z0-9+/]{43}=$' then
    raise exception 'poser_cle_boite_n8n : la clé doit faire 32 octets en base64 (44 signes)';
  end if;
  if exists (select 1 from vault.secrets where name = 'boite_cle_n8n') then
    raise exception 'poser_cle_boite_n8n : la clé existe déjà ; on ne la remplace jamais ici';
  end if;
  perform vault.create_secret(p_cle, 'boite_cle_n8n', 'Clé propre à n8n : déchiffre connexions.secret_n8n (0196)');
end
$fn$;
revoke all on function public.poser_cle_boite_n8n(text) from public, anon, authenticated;
grant execute on function public.poser_cle_boite_n8n(text) to service_role;
create or replace function public.cle_boite_n8n() returns text
language sql stable security definer set search_path = '' as $fn$
  select decrypted_secret from vault.decrypted_secrets where name = 'boite_cle_n8n' limit 1
$fn$;
revoke all on function public.cle_boite_n8n() from public, anon, authenticated;
grant execute on function public.cle_boite_n8n() to service_role;
do $droits$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    grant execute on function public.cle_boite_n8n() to n8n_lecture;
  else
    raise notice '0196 : rôle n8n_lecture absent (0189 non appliquée) — droit sauté';
  end if;
end
$droits$;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'tables' as quoi, string_agg(table_name, ', ' order by table_name) as resultat
  from information_schema.tables where table_schema = 'public'
   and table_name in ('tickets', 'acces_support', 'acces_support_lectures', 'support_verrou')
union all
select 'fonctions', string_agg(routine_name, ', ' order by routine_name)
  from information_schema.routines where routine_schema = 'public' and routine_name like '%support%'
union all
select 'policies fondateur restantes', coalesce(string_agg(policyname, ', '), 'aucune (attendu)')
  from pg_policies where schemaname = 'public' and policyname like 'founders_all_%';
