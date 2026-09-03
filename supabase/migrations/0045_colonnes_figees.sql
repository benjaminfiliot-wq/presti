-- v4 §11 — Correctifs de l'audit sécurité du 2026-09-03. Trois failles réelles.
--
-- ① Le verrou de privilèges (migration 0005) figeait `is_founder`, `plan` et les
--    compteurs, mais PAS les colonnes ajoutées depuis. Deux conséquences prouvées par
--    l'auditeur, en écrivant directement dans PostgREST avec un jeton d'artisan :
--
--    • `sessions_invalides_avant` : un attaquant ayant copié un jeton peut le remettre
--      à NULL et RÉTABLIR son accès juste après que la victime a cliqué « fermer toutes
--      mes sessions ». La fonctionnalité de sécurité était donc annulable par sa cible
--      elle-même — c'est le pire cas possible pour une garantie de sécurité.
--
--    • `domaine` / `domaine_verifie` : un artisan en offre gratuite peut écrire le
--      domaine personnalisé d'un concurrent sur sa propre ligne, contournant le verrou
--      d'offre de /api/domain. Deux artisans portent alors le même domaine, et le
--      middleware (limit 1) résout au premier venu : détournement de trafic.
--
--    Le déclencheur existait, il suffisait d'étendre sa liste. Leçon retenue : toute
--    colonne ajoutée aux artisans doit être examinée ici — d'où le commentaire ci-dessous.

create or replace function public.lock_artisan_privileges()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('service_role', 'postgres') then
    -- Privilèges commerciaux
    new.is_founder := old.is_founder;
    new.plan := old.plan;
    new.compteur_devis := old.compteur_devis;
    new.compteur_facture := old.compteur_facture;
    -- Sécurité : la révocation de sessions ne doit pas pouvoir être annulée par un
    -- jeton volé — sinon « fermer toutes mes sessions » ne protège de rien.
    new.sessions_invalides_avant := old.sessions_invalides_avant;
    -- Domaine personnalisé : réservé à l'offre Signature et vérifié par /api/domain.
    -- Écrivable en base, il permettait de détourner le domaine d'un autre artisan.
    new.domaine := old.domaine;
    new.domaine_verifie := old.domaine_verifie;
  end if;
  return new;
end $$;

comment on function public.lock_artisan_privileges() is
  'Colonnes que l''artisan ne peut PAS modifier depuis son navigateur. ⚠️ Toute nouvelle colonne sensible ajoutée à `artisans` doit être ajoutée ici — c''est l''oubli qui a produit les failles du 2026-09-03.';

-- ② La RPC d'inventaire était exécutable ANONYMEMENT et prenait l'artisan en paramètre
--    au lieu de le déduire de la session : elle contournait donc la RLS. Exploitation
--    limitée (il faut deviner deux UUID), mais c'est une faille de conception.
--    On dérive désormais l'appelant de `auth.uid()`, et le paramètre ne sert plus qu'au
--    serveur (service_role), seul autorisé à agir pour le compte d'un artisan.
create or replace function public.appliquer_mouvement(
  p_artisan uuid, p_materiau uuid, p_type text, p_quantite numeric,
  p_lieu text default 'atelier', p_devis uuid default null,
  p_source text default 'manuel', p_cout numeric default null, p_note text default null
) returns numeric
language plpgsql security definer set search_path = public as $fn$
declare
  v_reste numeric;
  v_artisan uuid;
begin
  -- Appelé par le serveur (service_role) : il agit pour l'artisan qu'il a authentifié.
  -- Appelé depuis une session : c'est la session qui fait foi, jamais le paramètre.
  if auth.uid() is not null then
    v_artisan := auth.uid();
  elsif current_user in ('service_role', 'postgres') then
    v_artisan := p_artisan;
  else
    raise exception 'Authentification requise';
  end if;

  if not exists (select 1 from materiaux where id = p_materiau and artisan_id = v_artisan) then
    raise exception 'Materiau introuvable';
  end if;

  insert into mouvements_stock (artisan_id, materiau_id, type, quantite, lieu, devis_id, source, cout_unitaire_ht, note)
  values (v_artisan, p_materiau, p_type, p_quantite, p_lieu, p_devis, p_source, p_cout, p_note);

  insert into stock (materiau_id, lieu, quantite) values (p_materiau, p_lieu, 0)
  on conflict (materiau_id, lieu) do nothing;

  update stock set
    quantite = case
      when p_type = 'inventaire' then p_quantite
      when p_type in ('sortie', 'perte') then quantite - p_quantite
      else quantite + p_quantite
    end,
    maj_le = now()
  where materiau_id = p_materiau and lieu = p_lieu
  returning quantite into v_reste;

  if p_type = 'entree' and p_cout is not null then
    update materiaux set prix_dernier_ht = p_cout, maj_le = now() where id = p_materiau;
  end if;

  return v_reste;
end $fn$;

revoke execute on function public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text) from public, anon;
grant execute on function public.appliquer_mouvement(uuid, uuid, text, numeric, text, uuid, text, numeric, text) to authenticated, service_role;

-- ③ Les photos de chantier envoyées par les prospects étaient TÉLÉCHARGEABLES PAR
--    N'IMPORTE QUI : bucket public, et le listing anonyme énumérait même les
--    identifiants de demandes. Ce sont des photos de domiciles privés — la fuite la plus
--    grave de l'audit, et elle ne demandait aucun compte.
--    `artisan-media` reste public : logos et réalisations sont faits pour être affichés.
update storage.buckets set public = false where id = 'lead-media';
drop policy if exists lead_media_public_read on storage.objects;
