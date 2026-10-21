---------------------------- _A_COLLER_sql_editor_0176_NU.sql — coller ce fichier EN ENTIER. Cette ligne est un commentaire : elle peut être abîmée sans conséquence.
alter table public.devis
  add column if not exists type_devis text not null default 'simple' check (type_devis in ('simple', 'lots'));
alter table public.devis_lignes
  add column if not exists lot text check (lot is null or char_length(lot) between 1 and 80);
alter table public.factures_lignes
  add column if not exists lot text check (lot is null or char_length(lot) between 1 and 80);
alter table public.factures
  add column if not exists type_facture text check (type_facture is null or type_facture in ('standard', 'acompte', 'situation', 'solde')),
  add column if not exists situation_numero int check (situation_numero is null or situation_numero > 0),
  add column if not exists avancement_pct numeric check (avancement_pct is null or (avancement_pct >= 0 and avancement_pct <= 100)),
  add column if not exists avancement_lots jsonb check (avancement_lots is null or jsonb_typeof(avancement_lots) = 'object'),
  add column if not exists marche_ht numeric check (marche_ht is null or marche_ht > 0),
  add column if not exists cumul_ht numeric check (cumul_ht is null or cumul_ht >= 0),
  add column if not exists situation_detail jsonb check (situation_detail is null or jsonb_typeof(situation_detail) = 'object');
create unique index if not exists factures_situation_numero_unique
  on public.factures (devis_id, situation_numero) where situation_numero is not null;
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
  if new.type_facture is null or new.type_facture not in ('situation', 'solde') then
    return new;
  end if;
  if new.devis_id is null then
    raise exception 'factures : une situation ou un solde se rattache a un devis';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('presti.factures.devis:' || new.devis_id::text, 0));
  select d.artisan_id, d.statut, d.total_ht into v_artisan, v_statut, v_total_ht from public.devis d where d.id = new.devis_id;
  if not found or v_artisan is distinct from new.artisan_id then
    raise exception 'factures : devis d un autre artisan';
  end if;
  if v_statut is distinct from 'accepte' then
    raise exception 'factures : on ne facture qu un devis signe';
  end if;
  if coalesce(new.total_ht, 0) <= 0 then
    raise exception 'factures : rien a facturer (montant HT nul ou negatif)';
  end if;
  select coalesce(sum(f.total_ht), 0), count(*) into v_somme, v_n
    from public.factures f
   where f.devis_id = new.devis_id and f.id <> new.id and f.avoir_de is null and f.statut in ('emise', 'payee')
     and not exists (select 1 from public.factures a where a.avoir_de = f.id);
  -- Marge d'arrondi : un centime par facture comptée, plus quatre pour la remise d'un solde (une ligne arrondie par taux de TVA).
  if v_somme + new.total_ht > coalesce(v_total_ht, 0) + 0.01 * (v_n + 4) then
    raise exception 'factures : jamais plus que le devis (deja % HT, cette facture % HT, devis % HT)', v_somme, new.total_ht, v_total_ht;
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
drop trigger if exists factures_situation_verifier on public.factures;
create trigger factures_situation_verifier before insert or update on public.factures
  for each row execute function public.factures_situation_verifier();
comment on function public.factures_situation_verifier() is
  'Garde-fous des situations de travaux et des factures de solde (0176) : devis du meme artisan et signe, jamais plus que le devis, cumul <= 100 %, avancement qui ne recule pas, donnees figees des l insertion.';
comment on column public.factures.type_facture is
  'standard | acompte | situation | solde (0176). Null : facture emise avant 0176, reconnue par lib/facturesTypes.ts natureDe.';
comment on column public.devis_lignes.lot is
  'Lot de la ligne dans un devis par lots (0176) : regroupe pour la lecture, ne change aucun montant.';

-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.
select 'devis.type_devis (attendu 1)' as quoi, count(*)::text as resultat from information_schema.columns where table_schema = 'public' and table_name = 'devis' and column_name = 'type_devis'
union all select 'colonnes lot (attendu 2)', count(*)::text from information_schema.columns where table_schema = 'public' and table_name in ('devis_lignes', 'factures_lignes') and column_name = 'lot'
union all select 'colonnes de situation sur factures (attendu 7)', count(*)::text from information_schema.columns where table_schema = 'public' and table_name = 'factures' and column_name in ('type_facture', 'situation_numero', 'avancement_pct', 'avancement_lots', 'marche_ht', 'cumul_ht', 'situation_detail')
union all select 'index unique (devis_id, situation_numero) (attendu 1)', count(*)::text from pg_indexes where schemaname = 'public' and tablename = 'factures' and indexname = 'factures_situation_numero_unique'
union all select 'declencheur factures_situation_verifier (attendu 1)', count(*)::text from pg_trigger where tgname = 'factures_situation_verifier' and tgrelid = 'public.factures'::regclass and not tgisinternal
union all select 'declencheurs d immuabilite toujours la (attendu 3)', count(*)::text from pg_trigger where tgname in ('factures_immuables', 'factures_conservees', 'factures_lignes_immuables') and not tgisinternal
union all select 'search_path fige de la fonction (attendu true)', (proconfig is not null and array_to_string(proconfig, ',') like 'search_path=%')::text from pg_proc where oid = 'public.factures_situation_verifier()'::regprocedure
union all select 'factures deja emises sans type (avant 0176, attendu = total des factures)', count(*) filter (where type_facture is null)::text || ' / ' || count(*)::text from public.factures
union all select 'devis existants restes simples (attendu = total des devis)', count(*) filter (where type_devis = 'simple')::text || ' / ' || count(*)::text from public.devis;
