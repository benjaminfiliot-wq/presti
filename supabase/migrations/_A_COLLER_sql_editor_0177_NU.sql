---------------------------- _A_COLLER_sql_editor_0177_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name = 'canal_externe_id')
     or not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'canaux_evenements') then
    raise exception '0177 : appliquez d''abord 0139_canaux_messagerie.sql';
  end if;
end $$;
alter table public.leads add column if not exists origine text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'leads_origine_connue' and conrelid = 'public.leads'::regclass) then
    alter table public.leads add constraint leads_origine_connue check (origine is null or origine in (
      'whatsapp', 'instagram', 'facebook', 'linkedin', 'tiktok', 'google', 'leboncoin', 'telegram', 'youtube', 'pinterest',
      'site', 'email', 'sms', 'carte', 'flyer', 'vehicule'
    )) not valid;
  end if;
end $$;
comment on column public.leads.origine is
  '0177 — réseau d''origine de la demande (?src= de la page, ou réseau d''un import de formulaire publicitaire). Liste fermée : lib/canaux/reseaux.ts.';
create index if not exists leads_artisan_contact_idx on public.leads (artisan_id, contact) where contact is not null;
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'canaux_type_connu' and conrelid = 'public.canaux'::regclass
             and pg_get_constraintdef(oid) not like '%telegram%') then
    alter table public.canaux drop constraint canaux_type_connu;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'canaux_type_connu' and conrelid = 'public.canaux'::regclass) then
    alter table public.canaux add constraint canaux_type_connu check (type in ('email', 'whatsapp', 'messenger', 'instagram', 'telegram')) not valid;
  end if;
end $$;
create or replace function public.canaux_conversation_ouvrir(p jsonb, p_depuis timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_artisan uuid := (p->>'artisan_id')::uuid;
  v_canal   text := p->>'canal';
  v_personne text := p->>'canal_externe_id';
  v_id uuid;
  v_statut text;
begin
  if v_artisan is null or v_canal not in (
       'whatsapp', 'messenger', 'instagram', 'leboncoin', 'telegram',
       'linkedin', 'facebook', 'instagram_notif', 'tiktok', '123devis', 'habitatpresto', 'pagesjaunes', 'houzz', 'travaux_com', 'starofservice'
     ) or coalesce(v_personne, '') = '' then
    raise exception 'canaux_conversation_ouvrir : paramètres invalides';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('canaux:' || v_artisan::text || ':' || v_canal || ':' || v_personne, 0));
  select l.id, l.statut into v_id, v_statut
    from public.leads l
   where l.artisan_id = v_artisan and l.canal = v_canal and l.canal_externe_id = v_personne and l.updated_at >= p_depuis
   order by l.updated_at desc
   limit 1;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'statut', v_statut, 'nouveau', false);
  end if;
  insert into public.leads (
    artisan_id, canal, canal_id, canal_externe_id, nom_prospect, contact, message, statut,
    urgence, type_chantier, ville, canal_dernier_entrant_le, canal_lien_reponse
  ) values (
    v_artisan, v_canal, nullif(p->>'canal_id', '')::uuid, v_personne, left(p->>'nom_prospect', 120), nullif(left(p->>'contact', 200), ''),
    left(p->>'message', 5000), 'nouveau', coalesce(p->>'urgence', 'normal'), p->>'type_chantier', p->>'ville',
    coalesce((p->>'canal_dernier_entrant_le')::timestamptz, now()), nullif(p->>'canal_lien_reponse', '')
  ) returning id into v_id;
  return jsonb_build_object('id', v_id, 'statut', 'nouveau', 'nouveau', true);
end $$;
revoke all on function public.canaux_conversation_ouvrir(jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.canaux_conversation_ouvrir(jsonb, timestamptz) to service_role;

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'colonne leads.origine (attendu 1)' as quoi, count(*)::text as resultat from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name = 'origine'
union all select 'contrainte leads_origine_connue (attendu 1)', count(*)::text from pg_constraint where conrelid = 'public.leads'::regclass and conname = 'leads_origine_connue'
union all select 'index leads_artisan_contact_idx (attendu 1)', count(*)::text from pg_indexes where schemaname = 'public' and indexname = 'leads_artisan_contact_idx'
union all select 'canaux_type_connu connait telegram (attendu true)', (pg_get_constraintdef(oid) like '%telegram%')::text from pg_constraint where conrelid = 'public.canaux'::regclass and conname = 'canaux_type_connu'
union all select 'fonction connait telegram et linkedin (attendu true)', (prosrc like '%''telegram''%' and prosrc like '%''linkedin''%' and prosrc like '%''starofservice''%')::text from pg_proc where proname = 'canaux_conversation_ouvrir' and pronamespace = 'public'::regnamespace
union all select 'fonction security definer (attendu true)', prosecdef::text from pg_proc where proname = 'canaux_conversation_ouvrir' and pronamespace = 'public'::regnamespace
union all select 'anon execute la fonction (attendu false)', has_function_privilege('anon', 'public.canaux_conversation_ouvrir(jsonb, timestamptz)', 'execute')::text
union all select 'authenticated execute la fonction (attendu false)', has_function_privilege('authenticated', 'public.canaux_conversation_ouvrir(jsonb, timestamptz)', 'execute')::text
union all select 'RLS actives leads, canaux, canaux_evenements (attendu 3)', count(*)::text from pg_class where oid in ('public.leads'::regclass, 'public.canaux'::regclass, 'public.canaux_evenements'::regclass) and relrowsecurity
union all select 'politiques canaux_evenements (attendu 0)', count(*)::text from pg_policies where schemaname = 'public' and tablename = 'canaux_evenements';
