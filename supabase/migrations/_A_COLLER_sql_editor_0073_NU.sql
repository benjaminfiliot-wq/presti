create or replace function public.nature_courrier(
  p_email text, p_sujet text, p_entetes jsonb, p_est_artisan boolean, p_fil_connu boolean
) returns jsonb language plpgsql immutable as $fn$
declare
  v_de     text := lower(btrim(coalesce(p_email, '')));
  v_local  text := split_part(lower(btrim(coalesce(p_email, ''))), '@', 1);
  v_dom    text := split_part(lower(btrim(coalesce(p_email, ''))), '@', 2);
  v_s      text := public.sujet_norme(p_sujet);
  v_e      jsonb := coalesce(p_entetes, '{}'::jsonb);
  v_nous   boolean := v_de = 'contact@prestiapp.fr';
  m        text;
  v_stripe       text[] := array['stripe.com'];
  v_fournisseurs text[] := array['ovhcloud.com', 'anthropic.com', 'google.com'];
  v_argent text[] := array[
    '[presti] paiement - ', '[presti] changement d''offre - ', '[presti] résiliation - ',
    '[presti] webhook stripe en erreur - ', '[presti] votre paiement a échoué - ',
    '[presti] votre abonnement est annulé - ', '[presti] un litige a été ouvert sur votre paiement - ',
    '[presti] nouvel artisan - '];
  v_connus text[] := array[
    '[presti] urgent - le solde de l''api est épuisé', '[presti] urgent - la clé d''api est refusée',
    '[presti] le débit de l''api est saturé', '[presti] l''api est momentanément surchargée',
    '[presti] le service d''ia a échoué', '[presti] erreur critique - ', '[presti] presti a produit ',
    '[presti] la tâche « ', '[presti] chaîne mail cassée', '[presti] dmarc toujours absent',
    '[presti] budget ia : ', '[presti] le budget ia n''est surveillé par personne',
    '[presti] le budget ia ne peut pas être lu', '[presti] presti - point de la semaine',
    '[presti] compte purgé - ', '[presti] compte anonymisé - '];
begin
  if coalesce((v_e->>'rapport_remise')::boolean, false) then
    return jsonb_build_object('nature','non_remise','motif','remise:mime');
  end if;
  if v_local in ('mailer-daemon','postmaster','mail-daemon')
     and (v_e->>'return_path' = '<>' or (v_e->>'x_failed_recipients') is not null) then
    return jsonb_build_object('nature','non_remise','motif','remise:daemon');
  end if;

  if v_nous then
    if v_s like '[presti] [simulation] %' or v_s like 'presti - [simulation] %' then
      return jsonb_build_object('nature','technique','motif','interne:simulation');
    end if;
    if v_s like '[presti] message de %' then
      return jsonb_build_object('nature','prospect','motif','formulaire:contact','repondre_a', true);
    end if;
    foreach m in array v_argent loop
      if v_s like m || '%' then return jsonb_build_object('nature','abonnement','motif','interne:argent'); end if;
    end loop;
    if v_s ~ '^\[presti\] \d+ compte\(s\) à zéro crédit cette semaine$'
       or v_s ~ '^\[presti\] \d+ révocation\(s\) de sessions en 24 h$' then
      return jsonb_build_object('nature','technique','motif','interne:repertorie');
    end if;
    foreach m in array v_connus loop
      if v_s like m || '%' then return jsonb_build_object('nature','technique','motif','interne:repertorie'); end if;
    end loop;
    if v_s like '[presti] %' or v_s like 'presti - %' then
      return jsonb_build_object('nature','technique','motif','interne:non-repertorie');
    end if;
  end if;

  if coalesce(p_est_artisan, false) then
    return jsonb_build_object('nature','artisan','motif','artisan');
  end if;

  if (v_e->>'auto_submitted') is not null and lower(v_e->>'auto_submitted') not like 'no%' then
    return jsonb_build_object('nature','reponse_auto','motif','entete:auto-submitted');
  end if;

  if v_dom <> '' then
    foreach m in array v_stripe loop
      if v_dom = m or v_dom like '%.' || m then return jsonb_build_object('nature','abonnement','motif','domaine:' || m); end if;
    end loop;
    foreach m in array v_fournisseurs loop
      if v_dom = m or v_dom like '%.' || m then return jsonb_build_object('nature','fournisseur','motif','domaine:' || m); end if;
    end loop;
  end if;

  if v_s like 'report domain: %' and position('prestiapp.fr' in v_s) > 0 then
    return jsonb_build_object('nature','technique','motif','dmarc:rapport');
  end if;

  if coalesce(p_fil_connu, false) then
    return jsonb_build_object('nature','prospect','motif','fil:reponse');
  end if;

  if (v_e->>'list_unsubscribe') is not null or (v_e->>'list_id') is not null
     or lower(coalesce(v_e->>'precedence','')) in ('bulk','list') then
    return jsonb_build_object('nature','diffusion','motif','entete:liste');
  end if;

  return jsonb_build_object('nature','a_lire','motif','defaut');
end $fn$;

select public.reclasser_courriers(null);
