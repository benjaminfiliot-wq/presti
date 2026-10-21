---------------------------- _A_COLLER_sql_editor_0180_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
create unique index if not exists factures_artisan_numero_unique
  on public.factures (artisan_id, numero) where numero is not null;
create or replace function public.facture_emettre(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  v_artisan uuid := nullif(p ->> 'artisan_id', '')::uuid;
  v_devis uuid := nullif(p ->> 'devis_id', '')::uuid;
  v_type text := coalesce(nullif(p ->> 'type', ''), 'standard');
  v_avoir_de uuid := nullif(p ->> 'avoir_de', '')::uuid;
  f jsonb := coalesce(p -> 'facture', '{}'::jsonb);
  v_lignes jsonb := coalesce(p -> 'lignes', '[]'::jsonb);
  v_remise numeric := coalesce(nullif(f ->> 'remise_pct', '')::numeric, 0);
  v_total_ht numeric := (f ->> 'total_ht')::numeric;
  v_total_tva numeric := (f ->> 'total_tva')::numeric;
  v_total_ttc numeric := (f ->> 'total_ttc')::numeric;
  v_calc_ht numeric;
  v_calc_tva numeric;
  v_nb_taux int;
  v_devis_artisan uuid;
  v_devis_statut text;
  v_devis_ht numeric;
  v_deja numeric := 0;
  v_n int := 0;
  v_c_id uuid;
  v_c_artisan uuid;
  v_c_verrouillee boolean;
  v_c_avoir_de uuid;
  v_c_statut text;
  v_c_ht numeric;
  v_c_ttc numeric;
  v_id uuid;
  v_num int;
  v_annee text := coalesce(nullif(p ->> 'annee', ''), to_char(now(), 'YYYY'));
  v_numero text;
  v_modele text := p ->> 'empreinte_modele';
begin
  if v_artisan is null then raise exception 'refus : artisan manquant'; end if;
  if v_type not in ('standard', 'acompte', 'situation', 'solde', 'avoir') then raise exception 'refus : type de facture inconnu (%)', v_type; end if;
  if v_annee !~ '^[0-9]{4}$' then raise exception 'refus : annee de numerotation invalide'; end if;
  if v_modele is null or position('"@@NUMERO@@"' in v_modele) = 0 then raise exception 'refus : modele d empreinte absent'; end if;
  if jsonb_typeof(v_lignes) is distinct from 'array' or jsonb_array_length(v_lignes) = 0 then
    raise exception 'refus : une facture sans ligne ne s emet pas';
  end if;
  if jsonb_array_length(v_lignes) > 200 then raise exception 'refus : 200 lignes au plus'; end if;
  if coalesce(btrim(f ->> 'client_nom'), '') = '' then raise exception 'refus : le nom du client est obligatoire'; end if;
  if v_total_ht is null or v_total_tva is null or v_total_ttc is null then raise exception 'refus : totaux absents'; end if;
  if v_remise < 0 or v_remise > 100 then raise exception 'refus : remise hors de 0 a 100'; end if;
  -- Les totaux se recalculent à partir des lignes, comme lib/devisTotals.ts (TVA arrondie par taux).
  select round(coalesce(sum(t.ht), 0), 2), coalesce(sum(round(t.ht * t.taux / 100, 2)), 0), count(*)
    into v_calc_ht, v_calc_tva, v_nb_taux
    from (
      select (e.l ->> 'tva_taux')::numeric as taux,
             sum((e.l ->> 'quantite')::numeric * (e.l ->> 'prix_unitaire_ht')::numeric * (1 - v_remise / 100)) as ht
        from jsonb_array_elements(v_lignes) as e(l)
       group by (e.l ->> 'tva_taux')::numeric
    ) t;
  if abs(v_calc_ht - v_total_ht) > 0.02 then raise exception 'refus : le total HT (%) ne correspond pas aux lignes (%)', v_total_ht, v_calc_ht; end if;
  if abs(v_calc_tva - v_total_tva) > 0.01 * (v_nb_taux + 1) then raise exception 'refus : la TVA (%) ne correspond pas aux lignes (%)', v_total_tva, v_calc_tva; end if;
  if abs(v_total_ht + v_total_tva - v_total_ttc) > 0.01 then raise exception 'refus : TTC different de HT + TVA'; end if;
  -- Verrous : l'artisan d'abord (le numéro), le devis ensuite (le déjà-facturé). Toujours dans cet ordre : pas d'interblocage.
  perform pg_advisory_xact_lock(hashtextextended('presti.factures.artisan:' || v_artisan::text, 0));
  if v_type = 'avoir' then
    if v_avoir_de is null then raise exception 'refus : avoir sans facture visee'; end if;
    select fa.id, fa.artisan_id, fa.verrouillee, fa.avoir_de, fa.statut, fa.total_ht, fa.total_ttc, fa.devis_id
      into v_c_id, v_c_artisan, v_c_verrouillee, v_c_avoir_de, v_c_statut, v_c_ht, v_c_ttc, v_devis
      from public.factures fa where fa.id = v_avoir_de for update;
    if v_c_id is null or v_c_artisan is distinct from v_artisan then raise exception 'refus : facture introuvable'; end if;
    if not coalesce(v_c_verrouillee, false) then raise exception 'refus : cette facture n a pas ete emise, elle n a pas besoin d avoir'; end if;
    if v_c_avoir_de is not null then raise exception 'refus : un avoir ne s annule pas par un autre avoir'; end if;
    if v_c_statut = 'annulee' or exists (select 1 from public.factures a where a.avoir_de = v_avoir_de) then
      raise exception 'refus : cette facture est deja annulee par un avoir';
    end if;
    if abs(v_total_ht + v_c_ht) > 0.01 or abs(v_total_ttc + v_c_ttc) > 0.01 then
      raise exception 'refus : un avoir porte exactement l oppose de la facture annulee';
    end if;
    if v_devis is not null then perform pg_advisory_xact_lock(hashtextextended('presti.factures.devis:' || v_devis::text, 0)); end if;
  elsif v_devis is not null then
    perform pg_advisory_xact_lock(hashtextextended('presti.factures.devis:' || v_devis::text, 0));
    select d.artisan_id, d.statut, d.total_ht into v_devis_artisan, v_devis_statut, v_devis_ht from public.devis d where d.id = v_devis;
    if v_devis_artisan is null or v_devis_artisan is distinct from v_artisan then raise exception 'refus : devis introuvable'; end if;
    if v_devis_statut is distinct from 'accepte' then raise exception 'refus : on ne facture qu un devis signe'; end if;
    select coalesce(sum(fa.total_ht), 0), count(*) into v_deja, v_n
      from public.factures fa
     where fa.devis_id = v_devis and fa.avoir_de is null and fa.statut in ('emise', 'payee')
       and not exists (select 1 from public.factures a where a.avoir_de = fa.id);
    if v_total_ht <= 0 and v_type in ('acompte', 'situation', 'solde') then raise exception 'refus : rien a facturer'; end if;
    if v_deja + v_total_ht > coalesce(v_devis_ht, 0) + 0.01 * (v_n + 4) then
      raise exception 'refus : jamais plus que le devis (deja facture % HT, cette facture % HT, devis % HT)', v_deja, v_total_ht, v_devis_ht;
    end if;
    if v_type = 'situation' and abs(v_total_ht - ((f ->> 'cumul_ht')::numeric - v_deja)) > 0.01 * (v_n + 1) then
      raise exception 'refus : le montant de la situation ne correspond plus au deja facture (% HT) : une autre facture a ete emise entre-temps', v_deja;
    end if;
    if v_type = 'solde' and abs(v_total_ht - (coalesce(v_devis_ht, 0) - v_deja)) > 0.01 * (v_n + 4) then
      raise exception 'refus : le solde ne correspond plus au deja facture (% HT) : une autre facture a ete emise entre-temps', v_deja;
    end if;
  elsif v_type in ('acompte', 'situation', 'solde') then
    raise exception 'refus : une facture d acompte, de situation ou de solde se rattache a un devis';
  end if;
  insert into public.factures (
    artisan_id, devis_id, client_id, numero, objet, statut, date_emission, date_echeance, remise_pct, acompte_pct, conditions, notes,
    client_nom, client_email, client_adresse, client_siren, client_pays, adresse_chantier, categorie_operation, devise, exoneration_code,
    tva_sur_debits, tva_regime, total_ht, total_tva, total_ttc, avoir_de,
    type_facture, situation_numero, avancement_pct, avancement_lots, marche_ht, cumul_ht, situation_detail
  ) values (
    v_artisan, v_devis, nullif(f ->> 'client_id', '')::uuid, null, f ->> 'objet', 'emise',
    coalesce(nullif(f ->> 'date_emission', '')::date, current_date), nullif(f ->> 'date_echeance', '')::date,
    v_remise, coalesce(nullif(f ->> 'acompte_pct', '')::numeric, 0), f ->> 'conditions', f ->> 'notes',
    f ->> 'client_nom', f ->> 'client_email', f ->> 'client_adresse', nullif(f ->> 'client_siren', ''), coalesce(nullif(f ->> 'client_pays', ''), 'FR'),
    f ->> 'adresse_chantier', coalesce(nullif(f ->> 'categorie_operation', ''), 'mixte'), coalesce(nullif(f ->> 'devise', ''), 'EUR'), f ->> 'exoneration_code',
    coalesce((f ->> 'tva_sur_debits')::boolean, false), f ->> 'tva_regime', v_total_ht, v_total_tva, v_total_ttc,
    case when v_type = 'avoir' then v_avoir_de end,
    case when v_type = 'avoir' then null else v_type end,
    case when v_type = 'situation' then (f ->> 'situation_numero')::int end,
    case when v_type = 'situation' then (f ->> 'avancement_pct')::numeric end,
    case when v_type = 'situation' then nullif(f -> 'avancement_lots', 'null'::jsonb) end,
    case when v_type = 'situation' then (f ->> 'marche_ht')::numeric end,
    case when v_type = 'situation' then (f ->> 'cumul_ht')::numeric end,
    case when v_type = 'situation' then nullif(f -> 'situation_detail', 'null'::jsonb) end
  ) returning id into v_id;
  insert into public.factures_lignes (facture_id, ordre, designation, quantite, unite, prix_unitaire_ht, tva_taux, source_prix, lot)
  select v_id, (e.ord - 1)::int, e.l ->> 'designation', (e.l ->> 'quantite')::numeric, coalesce(nullif(e.l ->> 'unite', ''), 'u'),
         (e.l ->> 'prix_unitaire_ht')::numeric, coalesce((e.l ->> 'tva_taux')::numeric, 0), nullif(e.l ->> 'source_prix', ''), nullif(e.l ->> 'lot', '')
    from jsonb_array_elements(v_lignes) with ordinality as e(l, ord);
  v_num := public.next_numero(v_artisan, 'facture');
  if v_num is null then raise exception 'refus : compteur de factures introuvable pour cet artisan'; end if;
  v_numero := 'FAC-' || v_annee || '-' || case when length(v_num::text) >= 4 then v_num::text else lpad(v_num::text, 4, '0') end;
  update public.factures
     set numero = v_numero, verrouillee = true, emise_le = now(),
         empreinte = encode(sha256(convert_to(replace(v_modele, '"@@NUMERO@@"', to_json(v_numero)::text), 'UTF8')), 'hex')
   where id = v_id;
  if v_type = 'avoir' then
    update public.factures set statut = 'annulee', updated_at = now() where id = v_avoir_de;
  end if;
  return jsonb_build_object('id', v_id, 'numero', v_numero);
end $fn$;
revoke all on function public.facture_emettre(jsonb) from public, anon, authenticated;
grant execute on function public.facture_emettre(jsonb) to service_role;
create or replace function public.devis_lignes_remplacer(p_devis uuid, p_artisan uuid, p_lignes jsonb, p_totaux jsonb)
returns int language plpgsql security definer set search_path = '' as $fn$
declare v_n int;
begin
  if not exists (select 1 from public.devis d where d.id = p_devis and d.artisan_id = p_artisan) then
    raise exception 'refus : devis introuvable';
  end if;
  if jsonb_typeof(p_lignes) is distinct from 'array' or jsonb_array_length(p_lignes) > 200 then raise exception 'refus : lignes invalides'; end if;
  delete from public.devis_lignes where devis_id = p_devis;
  insert into public.devis_lignes (devis_id, ordre, designation, quantite, unite, prix_unitaire_ht, tva_taux, source_prix, lot)
  select p_devis, (e.ord - 1)::int, e.l ->> 'designation', (e.l ->> 'quantite')::numeric, coalesce(nullif(e.l ->> 'unite', ''), 'u'),
         (e.l ->> 'prix_unitaire_ht')::numeric, coalesce((e.l ->> 'tva_taux')::numeric, 0), nullif(e.l ->> 'source_prix', ''), nullif(e.l ->> 'lot', '')
    from jsonb_array_elements(p_lignes) with ordinality as e(l, ord);
  get diagnostics v_n = row_count;
  update public.devis
     set total_ht = (p_totaux ->> 'total_ht')::numeric, total_tva = (p_totaux ->> 'total_tva')::numeric, total_ttc = (p_totaux ->> 'total_ttc')::numeric
   where id = p_devis and artisan_id = p_artisan;
  return v_n;
end $fn$;
revoke all on function public.devis_lignes_remplacer(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.devis_lignes_remplacer(uuid, uuid, jsonb, jsonb) to service_role;
create or replace function public.factures_situation_verifier()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
declare
  v_artisan uuid;
  v_statut text;
  v_total_ht numeric;
  v_somme numeric;
  v_n int;
  v_pct numeric;
  v_cumul numeric;
  v_cle text;
  v_val text;
begin
  if tg_op = 'UPDATE' then
    if new.type_facture is distinct from old.type_facture
       or new.situation_numero is distinct from old.situation_numero
       or new.avancement_pct is distinct from old.avancement_pct
       or new.avancement_lots is distinct from old.avancement_lots
       or new.marche_ht is distinct from old.marche_ht
       or new.cumul_ht is distinct from old.cumul_ht
       or new.situation_detail is distinct from old.situation_detail then
      raise exception 'factures : le type d une facture et les donnees d une situation ne changent plus (emettez un avoir)';
    end if;
    return new;
  end if;
  if new.type_facture is distinct from 'situation'
     and (new.situation_numero is not null or new.avancement_pct is not null or new.avancement_lots is not null
          or new.marche_ht is not null or new.cumul_ht is not null or new.situation_detail is not null) then
    raise exception 'factures : donnees de situation sur une facture qui n est pas une situation';
  end if;
  if new.type_facture in ('situation', 'solde') and new.devis_id is null then
    raise exception 'factures : une situation ou un solde se rattache a un devis';
  end if;
  if new.devis_id is null or new.avoir_de is not null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('presti.factures.devis:' || new.devis_id::text, 0));
  select d.artisan_id, d.statut, d.total_ht into v_artisan, v_statut, v_total_ht from public.devis d where d.id = new.devis_id;
  if not found or v_artisan is distinct from new.artisan_id then
    raise exception 'factures : devis d un autre artisan';
  end if;
  select coalesce(sum(f.total_ht), 0), count(*) into v_somme, v_n
    from public.factures f
   where f.devis_id = new.devis_id and f.id <> new.id and f.avoir_de is null and f.statut in ('emise', 'payee')
     and not exists (select 1 from public.factures a where a.avoir_de = f.id);
  -- Marge d'arrondi : un centime par facture comptée, plus quatre pour la remise d'un solde (une ligne arrondie par taux de TVA).
  if v_somme + coalesce(new.total_ht, 0) > coalesce(v_total_ht, 0) + 0.01 * (v_n + 4) then
    raise exception 'factures : jamais plus que le devis (deja % HT, cette facture % HT, devis % HT)', v_somme, new.total_ht, v_total_ht;
  end if;
  if new.type_facture is null or new.type_facture not in ('situation', 'solde') then
    return new;
  end if;
  if v_statut is distinct from 'accepte' then
    raise exception 'factures : on ne facture qu un devis signe';
  end if;
  if coalesce(new.total_ht, 0) <= 0 then
    raise exception 'factures : rien a facturer (montant HT nul ou negatif)';
  end if;
  if new.type_facture = 'situation' then
    if new.situation_numero is null or new.avancement_pct is null or new.marche_ht is null or new.cumul_ht is null or new.situation_detail is null then
      raise exception 'factures : situation incomplete (numero, avancement, marche, cumul, detail)';
    end if;
    if exists (select 1 from public.factures f where f.devis_id = new.devis_id and f.id <> new.id and f.situation_numero >= new.situation_numero) then
      raise exception 'factures : numero de situation deja donne sur ce devis';
    end if;
    if new.cumul_ht <= 0 or new.cumul_ht > new.marche_ht + 0.005 then
      raise exception 'factures : cumul de situation hors du marche (cumul % HT, marche % HT)', new.cumul_ht, new.marche_ht;
    end if;
    if abs(new.marche_ht - coalesce(v_total_ht, 0)) > 0.005 then
      raise exception 'factures : le marche d une situation est le total HT du devis (% HT, devis % HT)', new.marche_ht, v_total_ht;
    end if;
    select coalesce(max(f.avancement_pct), 0), coalesce(max(f.cumul_ht), 0) into v_pct, v_cumul
      from public.factures f
     where f.devis_id = new.devis_id and f.id <> new.id and f.type_facture = 'situation' and f.avoir_de is null
       and f.statut in ('emise', 'payee') and not exists (select 1 from public.factures a where a.avoir_de = f.id);
    if new.avancement_pct < v_pct or new.cumul_ht < v_cumul then
      raise exception 'factures : l avancement ne recule pas (precedent % %% et % HT)', v_pct, v_cumul;
    end if;
    if new.avancement_lots is not null then
      for v_cle, v_val in select e.key, e.value from jsonb_each_text(new.avancement_lots) e loop
        if v_val !~ '^[0-9]+([.][0-9]+)?$' or v_val::numeric > 100 then
          raise exception 'factures : avancement du lot % hors de 0 a 100', v_cle;
        end if;
      end loop;
      if exists (
        select 1
          from public.factures f, jsonb_each_text(f.avancement_lots) p
         where f.devis_id = new.devis_id and f.id <> new.id and f.type_facture = 'situation' and f.avoir_de is null
           and f.statut in ('emise', 'payee') and f.avancement_lots is not null
           and not exists (select 1 from public.factures a where a.avoir_de = f.id)
           and coalesce((new.avancement_lots ->> p.key)::numeric, 0) < p.value::numeric
      ) then
        raise exception 'factures : l avancement d un lot ne recule pas';
      end if;
    end if;
  end if;
  return new;
end $fn$;
comment on function public.facture_emettre(jsonb) is
  'Emission d une facture ou d un avoir en UNE transaction (0180) : verrous artisan puis devis, deja facture recalcule, jamais plus que le devis, lignes, numero (next_numero) et scellement, tout ou rien.';
comment on function public.devis_lignes_remplacer(uuid, uuid, jsonb, jsonb) is
  'Lignes et totaux d un devis remplaces en une transaction (0180) : rien n est supprime si l insertion echoue.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'facture_emettre (attendu 1)' as quoi, count(*)::text as resultat from pg_proc where oid = to_regprocedure('public.facture_emettre(jsonb)')
union all select 'devis_lignes_remplacer (attendu 1)', count(*)::text from pg_proc where oid = to_regprocedure('public.devis_lignes_remplacer(uuid, uuid, jsonb, jsonb)')
union all select 'facture_emettre security definer (attendu true)', prosecdef::text from pg_proc where oid = to_regprocedure('public.facture_emettre(jsonb)')
union all select 'search_path fige (attendu true)', (array_to_string(proconfig, ',') like 'search_path=%')::text from pg_proc where oid = to_regprocedure('public.facture_emettre(jsonb)')
union all select 'authenticated execute facture_emettre (attendu false)', has_function_privilege('authenticated', 'public.facture_emettre(jsonb)', 'execute')::text
union all select 'anon execute facture_emettre (attendu false)', has_function_privilege('anon', 'public.facture_emettre(jsonb)', 'execute')::text
union all select 'service_role execute facture_emettre (attendu true)', has_function_privilege('service_role', 'public.facture_emettre(jsonb)', 'execute')::text
union all select 'authenticated execute devis_lignes_remplacer (attendu false)', has_function_privilege('authenticated', 'public.devis_lignes_remplacer(uuid, uuid, jsonb, jsonb)', 'execute')::text
union all select 'index unique (artisan_id, numero) (attendu 1)', count(*)::text from pg_indexes where schemaname = 'public' and tablename = 'factures' and indexname = 'factures_artisan_numero_unique'
union all select 'factures emises sans numero (attendu 0)', count(*)::text from public.factures where statut in ('emise', 'payee') and numero is null
union all select 'declencheur factures_situation_verifier (attendu 1)', count(*)::text from pg_trigger where tgname = 'factures_situation_verifier' and not tgisinternal;
