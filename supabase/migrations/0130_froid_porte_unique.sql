-- 0130_froid_porte_unique.sql — envoi_froid ne s'ouvre QUE par acq_envoi_froid_ouvrir (05/10/2026).
-- Suite de 0129 (la date du 12/10 est retirée sur décision de Benj) : la date n'était de toute façon pas la seule porte. Une seconde
-- porte existait depuis 0097 : ops_interrupteur_poser(p_nom, p_actif, …) écrit n'importe quel interrupteur, envoi_froid compris,
-- sans exiger ni la mesure à sec, ni l'épreuve de bout en bout, ni la notice. Elle reste réservée au fondateur et au service_role,
-- mais elle REFUSE désormais d'ouvrir envoi_froid (ops:envoi_froid_par_geste) : seule acq_envoi_froid_ouvrir l'ouvre, après ses
-- trois preuves. Fermer envoi_froid et poser/lever pause_generale par cette fonction ne changent pas.
-- Même signature, mêmes droits (revoke puis grant service_role), même corps pour le reste. Rejouable (create or replace).
create or replace function public.ops_interrupteur_poser(p_nom text, p_actif boolean, p_motif text, p_auteur uuid)
returns void
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  if p_auteur is null or not exists (select 1 from public.artisans ar where ar.id = p_auteur and ar.is_founder) then
    raise exception using message = 'ops:auteur', errcode = 'P0001';
  end if;
  if p_motif is null or char_length(p_motif) < 3 or char_length(p_motif) > 200 then
    raise exception using message = 'ops:motif', errcode = 'P0001';
  end if;
  if p_actif is null then
    raise exception using message = 'ops:interrupteur', errcode = 'P0001';
  end if;
  if p_nom = 'envoi_froid' and p_actif then
    raise exception using message = 'ops:envoi_froid_par_geste', errcode = 'P0001';
  end if;
  update ops.interrupteurs
     set actif = p_actif, motif = p_motif, change_le = now(), change_par = p_auteur
   where nom = p_nom;
  if not found then
    raise exception using message = 'ops:interrupteur', errcode = 'P0001';
  end if;
  insert into ops.evenements (agent, type, objet, resume)
  values ('systeme', 'interrupteur', 'interrupteur:' || p_nom,
          left(p_nom || case when p_actif then ' passe à actif : ' else ' passe à inactif : ' end || p_motif, 200));
end
$$;
revoke all on function public.ops_interrupteur_poser(text, boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.ops_interrupteur_poser(text, boolean, text, uuid) to service_role;
comment on function public.ops_interrupteur_poser(text, boolean, text, uuid) is
  'Pose un interrupteur du bus (026-011). p_auteur doit être un artisan is_founder, sinon ops:auteur ; motif de 3 à 200 signes, sinon ops:motif. Refuse d''ouvrir envoi_froid (ops:envoi_froid_par_geste) : seule acq_envoi_froid_ouvrir l''ouvre. Événement de l''agent systeme, type interrupteur.';
