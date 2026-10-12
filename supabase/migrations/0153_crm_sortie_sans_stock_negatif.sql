-- 0153 · [APPLIQUÉE en production le 12/10/2026 : essai à sec, puis test réel annulé : 50 sur 3 refusé « reste 3 », 2 sur 3 → reste 1] CRM : sortir un matériau réservé ne peut plus faire passer le stock sous zéro.
-- Recette du 12/10/2026 : 50 raccords réservés pour 3 en stock, « Sortir » donnait −47 (appliquer_mouvement, 0040,
-- accepte le négatif, et rien ne vérifiait avant). La RÉSERVATION au-delà du stock reste permise (c'est ce qui nourrit
-- « Préparer la commande ») ; la SORTIE, elle, exige le stock du lieu, verrouillé pendant la vérification.
-- appliquer_mouvement n'est pas touchée (l'écran Inventaire garde son comportement).
create or replace function public.crm_sortir_materiau(p_artisan uuid, p_reservation uuid)
returns numeric language plpgsql security definer set search_path = public as $fn$
declare
  r       chantier_materiaux%rowtype;
  c       chantiers%rowtype;
  v_dispo numeric;
  v_reste numeric;
begin
  select * into r from chantier_materiaux where id = p_reservation and artisan_id = p_artisan for update;
  if not found then raise exception 'crm : reservation introuvable'; end if;
  if r.statut <> 'reserve' then raise exception 'crm : reservation deja traitee'; end if;
  select * into c from chantiers where id = r.chantier_id and artisan_id = p_artisan;
  if not found then raise exception 'crm : chantier introuvable'; end if;
  select s.quantite into v_dispo from stock s
   where s.materiau_id = r.materiau_id and s.lieu = r.lieu for update;
  if coalesce(v_dispo, 0) < r.quantite then
    raise exception 'crm : stock insuffisant (reste %)', trim(to_char(coalesce(v_dispo, 0), 'FM999999990.##'));
  end if;
  v_reste := appliquer_mouvement(p_artisan, r.materiau_id, 'sortie', r.quantite, r.lieu, c.devis_id, 'devis', null,
                                 left('Chantier : ' || c.titre, 300));
  update chantier_materiaux set statut = 'sorti', sorti_le = now(), maj_le = now() where id = r.id;
  insert into crm_journal (artisan_id, objet, objet_id, chantier_id, champ, de, vers, note)
  values (p_artisan, 'materiau', r.id, r.chantier_id, 'sortie', 'reserve', 'sorti', left(r.quantite::text || ' — ' || r.lieu, 300));
  return v_reste;
end $fn$;
revoke all on function public.crm_sortir_materiau(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_sortir_materiau(uuid, uuid) to service_role;
