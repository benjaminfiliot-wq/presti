---------------------------- _A_COLLER_sql_editor_0080_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.artisans add column if not exists credits_offerts integer not null default 0
  check (credits_offerts >= 0);
comment on column public.artisans.credits_offerts is
  'Crédits offerts par la direction, cumulés (0080). Ils S''AJOUTENT au forfait mensuel et lui survivent : le renouvellement remet le forfait, jamais ce solde-là. Colonne distincte de `credits` pour qu''un geste commercial reste lisible, prouvable et reprenable séparément du forfait.';
create or replace function public.consume_credit(p_uid uuid, p_cost int, p_credits_mois int)
returns int language plpgsql security definer set search_path = public as $$
declare cur int; rl date; today date := current_date; offerts int;
begin
  if p_cost is null or p_cost < 1 then p_cost := 1; end if;                 -- jamais négatif
  if p_credits_mois is null or p_credits_mois < 0 then p_credits_mois := 0; end if;
  select credits, credits_reset_le, coalesce(credits_offerts, 0)
    into cur, rl, offerts
    from public.artisans where id = p_uid for update;
  if not found then return -2; end if;
  if rl is null or rl < today then
    -- Le forfait du mois, PLUS ce que la direction a offert : sans ce `+ offerts`, un geste
    -- commercial disparaissait au premier appel IA suivant la date de renouvellement.
    cur := p_credits_mois + offerts;
    update public.artisans
       set credits = cur, credits_reset_le = (today + interval '1 month')::date
     where id = p_uid;
  end if;
  if cur < p_cost then return -1; end if;
  update public.artisans set credits = cur - p_cost where id = p_uid;
  return cur - p_cost;
end $$;
revoke all on function public.consume_credit(uuid, int, int) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid, int, int) to service_role;
create or replace function public.offrir_credits(
  p_acteur uuid, p_acteur_email text, p_artisan uuid, p_credits int, p_motif text, p_ip text, p_agent text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_avant int; v_apres int; v_journal uuid;
begin
  if p_credits is null or p_credits < 1 or p_credits > 500 then return jsonb_build_object('etat', 'hors_bornes'); end if;
  if coalesce(trim(coalesce(p_motif, '')), '') = '' then return jsonb_build_object('etat', 'motif_requis'); end if;
  select credits into v_avant from public.artisans where id = p_artisan for update;
  if not found then return jsonb_build_object('etat', 'artisan_inconnu'); end if;
  update public.artisans
     set credits = coalesce(credits, 0) + p_credits,
         credits_offerts = coalesce(credits_offerts, 0) + p_credits
   where id = p_artisan returning credits into v_apres;
  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
    values (p_acteur, p_acteur_email, 'artisan_credits', 'artisan', p_artisan::text, p_artisan,
            jsonb_build_object('credits', v_avant),
            jsonb_build_object('credits', v_apres, 'offerts', p_credits, 'motif', p_motif), p_ip, p_agent, true)
    returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'avant', v_avant, 'apres', v_apres, 'journal', v_journal);
end $$;
revoke all on function public.offrir_credits(uuid, text, uuid, int, text, text, text) from public, anon, authenticated;
grant execute on function public.offrir_credits(uuid, text, uuid, int, text, text, text) to service_role;
do $garde$
declare v_doublons int;
begin
  select count(*) into v_doublons from (
    select devis_id from public.factures
     where devis_id is not null and acompte_pct > 0 and avoir_de is null
     group by devis_id having count(*) > 1
  ) d;
  if v_doublons = 0 then
    create unique index if not exists factures_acompte_unique_par_devis
      on public.factures (devis_id)
      where devis_id is not null and acompte_pct > 0 and avoir_de is null;
    raise notice 'Index posé : un devis ne peut plus porter deux factures d''acompte.';
  else
    raise notice 'Index NON posé : % devis portent déjà plusieurs factures d''acompte. La route est corrigée et empêche d''en créer de nouvelles ; émettez un avoir sur les doublons existants, puis recollez cette migration pour poser l''index.', v_doublons;
  end if;
end $garde$;

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
