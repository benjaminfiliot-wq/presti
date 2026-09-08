-- ============================================================================================
-- 0080 · Les crédits offerts survivent au mois, et un devis n'émet qu'un acompte
--
-- Deux défauts trouvés par l'audit du 08/09.
--
--  1. LES CRÉDITS OFFERTS ÉTAIENT EFFACÉS au renouvellement mensuel. `offrir_credits` (0068)
--     AJOUTE au solde, mais le reset paresseux de `consume_credit` (0008) l'ÉCRASE :
--     `set credits = p_credits_mois`. Un artisan Essentiel (80/mois) à qui la direction offre
--     200 crédits voyait l'écran répondre « il en a maintenant 280 », puis retombait à 80 au
--     premier appel IA après la date de renouvellement. Deux autres endroits du code se donnent
--     explicitement du mal pour protéger ces crédits (le webhook Stripe dit « les crédits ne
--     s'ÉCRASENT pas ») — c'est le chemin le plus fréquent qui les détruisait.
--
--     Une colonne à eux, et non un calcul plus malin sur `credits` : un geste commercial doit
--     rester lisible séparément du forfait, sinon on ne peut ni le prouver ni le reprendre.
--
--  2. ACCEPTER UN DEVIS DEUX FOIS émettait deux factures d'acompte SCELLÉES. Le contrôle
--     d'idempotence était un lire-puis-écrire, et deux requêtes concurrentes — double-clic du
--     prospect, renvoi automatique du navigateur — le passaient toutes les deux. Deux pièces
--     numérotées dans la séquence continue, qu'on ne peut plus supprimer : il faut un avoir pour
--     réparer. La route est corrigée (mise à jour conditionnelle) ; l'index est la seconde serrure.
-- ============================================================================================

-- ══ 1. Les crédits offerts ═══════════════════════════════════════════════════════════════════════

alter table public.artisans add column if not exists credits_offerts integer not null default 0
  check (credits_offerts >= 0);

comment on column public.artisans.credits_offerts is
  'Crédits offerts par la direction, cumulés (0080). Ils S''AJOUTENT au forfait mensuel et lui survivent : le renouvellement remet le forfait, jamais ce solde-là. Colonne distincte de `credits` pour qu''un geste commercial reste lisible, prouvable et reprenable séparément du forfait.';

-- Le reset remet le FORFAIT, et rajoute ce qui a été offert. Même signature qu'en 0008 : `create
-- or replace` remplace, sans créer de surcharge.
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

-- `offrir_credits` alimente les deux : le solde utilisable tout de suite, et la mémoire du geste.
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

-- ══ 2. Un devis, un acompte ══════════════════════════════════════════════════════════════════════
--
-- Index partiel : seules les factures d'acompte rattachées à un devis sont concernées. Les autres
-- factures d'un même devis (le solde, un avoir) restent possibles, et une facture sans devis aussi.
-- L'index ne se pose que si la base le permet. Un doublon existe déjà (deux acomptes de 3,55 EUR
-- sur un compte fondateur, le 02/09 — la preuve que le défaut s'est produit en vrai), et un
-- `create unique index` ferait échouer TOUTE la migration : les corrections de crédits ci-dessus,
-- qui n'ont rien à voir, seraient perdues à cause d'une facture de trois euros.
--
-- On ne supprime pas la pièce en double pour faire passer l'index : elle est scellée, et c'est
-- l'invariant que 0078 vient de poser. Une facture d'acompte émise en double se corrige par un
-- AVOIR — une décision de Benjamin, pas d'une migration.
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
