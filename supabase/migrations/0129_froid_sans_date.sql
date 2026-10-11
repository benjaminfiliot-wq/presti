-- 0129_froid_sans_date.sql — l'ouverture de l'envoi à froid ne dépend plus d'une DATE (05/10/2026).
-- Décision du propriétaire (Benj, chat, 05/10/2026) : « virez-moi cette date du 12/10, c'est maintenant ». Le 12/10 était un rythme
-- que nous nous étions fixé, pas une obligation légale ; le cadre légal reste ENTIER et inchangé :
--   - acq_envoi_froid_ouvrir reste réservée au fondateur (is_founder, avant toute écriture) et au service_role ;
--   - elle exige toujours, dans cet ordre : la mesure à sec PASS (ops:mesure_absente), l'épreuve de bout en bout PASS de moins de
--     30 jours (ops:epreuve_absente), la notice CNIL B2B vérifiée depuis moins de 7 jours (ops:notice_absente) ;
--   - l'interrupteur envoi_froid reste fermé (semé fermé par 0096) : seule une écriture explicite de cette fonction l'ouvre ;
--   - le garde ops.garde_envois (0099, 0124), les paliers (P0 d'abord : acq_palier_appliquer), le STOP, les opposants et les
--     plafonds (ops.quotas_canaux, 0121) ne sont PAS touchés.
-- Seule différence avec 0111 : la ligne « if date < '2026-10-12' then raise exception 'ops:trop_tot' » disparaît ; le code
-- ops:trop_tot n'existe plus. Même signature, mêmes droits (revoke puis grant service_role), même corps pour le reste.
-- Rejouable sans dommage (create or replace + revoke/grant).
create or replace function public.acq_envoi_froid_ouvrir(p_auteur uuid) returns jsonb language plpgsql security definer set search_path = public, ops, pg_temp as $$
declare v_notice timestamptz; deja boolean;
begin
 if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;
 select actif into deja from ops.interrupteurs where nom='envoi_froid';
 if deja then return jsonb_build_object('deja',true); end if;
 if not exists(select 1 from ops.evenements where agent='systeme' and type='mesure_a_sec' and resume like 'PASS%') then raise exception 'ops:mesure_absente'; end if;
 if not exists(select 1 from ops.evenements where agent='systeme' and type='epreuve_bout_en_bout' and resume like 'PASS%' and le>=ops.maintenant()-interval '30 days') then raise exception 'ops:epreuve_absente'; end if;
 select notice_verifiee_le into v_notice from ops.etat_envoi where id for update;
 if v_notice is null or v_notice<ops.maintenant()-interval '7 days' then raise exception 'ops:notice_absente'; end if;
 update ops.interrupteurs set actif=true,motif='Ouverture par le fondateur',change_le=ops.maintenant(),change_par=p_auteur where nom='envoi_froid';
 update ops.etat_envoi set palier_depuis=(ops.maintenant() at time zone 'Europe/Paris')::date,maj_le=ops.maintenant() where id;
 insert into ops.evenements(agent,type,resume) values('systeme','envoi_froid_ouvert','Envoi froid ouvert par le fondateur');
 perform public.acq_palier_appliquer();
 return jsonb_build_object('deja',false,'ouvert',true);
end $$;
revoke all on function public.acq_envoi_froid_ouvrir(uuid) from public,anon,authenticated;
grant execute on function public.acq_envoi_froid_ouvrir(uuid) to service_role;

-- Le motif de l'interrupteur (affiché dans la station) ne parle plus de date. L'état ne change pas : actif reste false.
update ops.interrupteurs
   set motif = 'semé fermé par 0096 : Benj l''ouvre depuis la station, après la mesure à sec, l''épreuve de bout en bout et la notice'
 where nom = 'envoi_froid' and actif = false and motif like '%12/10/2026%';
