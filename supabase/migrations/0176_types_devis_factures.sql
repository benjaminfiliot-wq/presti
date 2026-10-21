-- 0176 · TYPES DE DEVIS ET DE FACTURES (demande du fondateur du 21/10/2026 : entreprises tous corps d'état, chantiers longs ;
-- drapeaux `devisLots` et `facturesSituation`, lib/flags.ts ; calculs dans lib/facturesTypes.ts).
-- Écrite le 21/10/2026. ✅ APPLIQUÉE le 21/10/2026 (contrôle 9/9 ; essai réel annulé : recul, dépassement, n° réutilisé,
-- modification et surfacturation refusés). 0180 réécrit factures_situation_verifier. Ordre suivi : essai à sec, application, puis
-- supabase/controles/0176_types_devis_factures.sql, puis
-- `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/types-devis-factures-qa.mjs`.
-- ORDRE : on colle la migration, PUIS on lève les drapeaux. Idempotente et additive : des colonnes neuves (nullables, ou à
-- défaut), un index unique partiel, une fonction et un déclencheur neufs. Rien d'existant n'est réécrit : les factures déjà
-- émises gardent `type_facture` à null (« avant 0176 » : le code les reconnaît comme avant, lib/facturesTypes.ts natureDe), et
-- aucune ligne de facture scellée n'est touchée (ajouter une colonne ne déclenche pas factures_lignes_immuables, 0078).
--
-- 1 ─ devis.type_devis ('simple' | 'lots', défaut 'simple') ; devis_lignes.lot et factures_lignes.lot (texte court, 80 car. au
--     plus). Le lot ne change aucun montant : il regroupe des lignes pour la lecture (titre et sous-total HT sur le PDF).
-- 2 ─ factures : type_facture ('standard' | 'acompte' | 'situation' | 'solde' ; null = émise avant 0176), et pour une situation
--     de travaux : situation_numero (n° 1, 2, 3… par devis), avancement_pct (cumulé à date), avancement_lots (jsonb lot → %
--     cumulé), marche_ht (le total HT du devis), cumul_ht (travaux cumulés à date, HT), situation_detail (jsonb figé pour le PDF :
--     cumul antérieur, déjà facturé, montant de la situation). Le PDF est regénéré à la demande : il doit rendre la pièce telle
--     qu'elle a été émise, donc ces valeurs sont FIGÉES ici, pas recalculées.
-- 3 ─ factures_situation_verifier, avant INSERT ou UPDATE : les garde-fous NON CONTOURNABLES (clé de service comprise, et la
--     policy factures_insert_own de 0044 laisse le navigateur insérer une facture : c'est ici qu'elle est arrêtée) :
--     • UPDATE : le type d'une facture et toutes ses données de situation sont figés dès l'insertion (avant même le scellement).
--       Le reste de la pièce est gardé par facture_immuable (0041) et factures_lignes_immuables (0078), inchangés ;
--     • INSERT d'une situation ou d'un solde : devis du MÊME artisan et SIGNÉ ; verrou par devis (deux émissions simultanées
--       passent l'une après l'autre) ; montant HT positif ; JAMAIS PLUS QUE LE DEVIS (somme HT des factures comptées du devis +
--       celle-ci ≤ total HT du devis, à quelques centimes d'arrondi près : un par facture, plus quatre pour la remise ligne par
--       taux d'un solde) ;
--     • INSERT d'une situation : données complètes ; numéro supérieur à tout numéro déjà donné sur le devis ; cumul > 0 et ≤ marché ;
--       marché = total HT du devis ; avancement qui ne RECULE PAS face aux situations comptées (en %, en montant, lot par lot) ;
--       chaque avancement de lot entre 0 et 100 ;
--     • une facture qui n'est pas une situation ne porte aucune donnée de situation.
--     « Comptées » = émises ou payées, ni avoir, ni visées par un avoir : une situation annulée par un avoir rend son avancement
--     et son montant (le reste à facturer remonte d'autant), même règle que lib/comptaTableau.ts facturesComptees.
-- 4 ─ index unique (devis_id, situation_numero) : deux situations ne portent jamais le même numéro sur un devis.
-- La numérotation des factures (next_numero, FAC-AAAA-NNNN, séquence continue) n'est pas touchée.

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
