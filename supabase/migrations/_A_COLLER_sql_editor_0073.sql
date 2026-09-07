-- 0073 — Les domaines OBSERVÉS dans la vraie boîte.
--
-- La migration 0072 livrait deux listes de domaines VIDES, et c'était voulu : le dépôt ne contenait
-- aucune adresse d'expédition de service tiers, et une liste écrite de mémoire aurait produit
-- exactement le classement faux que la maison interdit — un classement faux ne se voit pas.
--
-- La boîte a été relevée pour la première fois le 07/09 : 40 messages. Vingt sont tombés dans « À
-- lire », faute de règle. En les lisant, on obtient enfin des adresses RÉELLES. Chaque ligne ajoutée
-- ci-dessous cite le message qui l'a justifiée : personne ne devrait avoir à croire une liste sur
-- parole, et le jour où un domaine change, on saura d'où il venait.
--
-- Ce que cette relève a fait remonter, et qui dormait dans une boîte que personne ne lisait :
--   • « [Action needed] Your Claude API access is turned off » (04/09) — l'accès à l'API était coupé
--     faute de crédits, ce qui arrête l'assistant pour TOUS les artisans ;
--   • « [Action requise] Veuillez nous fournir plus d'informations à propos de presti » (04/09) —
--     Stripe bloque les virements vers le compte bancaire tant que la vérification n'est pas finie.
-- C'est exactement ce que cette messagerie existe pour attraper.

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
  -- OBSERVÉ le 07/09 : « Paiement de 29,00 € effectué par alexandre f », « Une nouvelle clé API pour
  -- votre compte Stripe », « [Action requise] Veuillez nous fournir plus d'informations à propos de
  -- presti » — toutes de notifications@stripe.com. L'argent et les comptes.
  v_stripe       text[] := array['stripe.com'];
  -- OBSERVÉS le 07/09, un par un :
  --   ovhcloud.com   « Une facture est disponible dans votre espace », « [Ovh-005mx] sur prestiapp.fr »,
  --                  « Validation de votre commande » — support@services.ovhcloud.com ;
  --   anthropic.com  « Your receipt from Anthropic, PBC », « [Action needed] Your Claude API access
  --                  is turned off » — mail.anthropic.com ;
  --   google.com     « Welcome to Firebase », « Welcome to the Google Developer Program »,
  --                  « Alerte de sécurité » — firebase-no-reply@, googledev-noreply@, accounts.google.com.
  -- Ne PAS ajouter ici un service que l'entreprise n'utilise pas : « fournisseur » veut dire « une
  -- dépendance de Presti », pas « une entreprise connue ». Le reste va dans « À lire », et c'est bien.
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

  -- Les domaines AVANT l'en-tête de liste : la moitié de ces services posent un List-Unsubscribe
  -- même sur leurs messages importants. Le 07/09, « Vous avez partagé certaines données de votre
  -- compte Google » portait un en-tête de liste et serait tombé dans « Diffusion ». Un fournisseur
  -- reconnu par son domaine est une preuve plus forte qu'un en-tête que tout le monde pose.
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

-- Les courriers déjà rangés automatiquement reprennent leur place avec les nouvelles règles.
-- Ce qui a été corrigé à la main ne bouge pas : c'est le verrou `nature_source = 'auto'`.
select public.reclasser_courriers(null);
