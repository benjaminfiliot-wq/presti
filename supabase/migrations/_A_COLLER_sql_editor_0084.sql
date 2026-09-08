-- ============================================================================================
-- 0084 · Le partenaire quitte l'entreprise — retrait complet des accès
--        (décision de Benjamin, 08/09/2026 : « je travaille plus avec lui »)
--
-- Ce que ce compte portait, MESURÉ avant d'écrire quoi que ce soit :
--   · artisans.is_founder = true, artisans.role_interne = 'partenaire' ;
--   · direction_roles = 'lecture' (le Poste de contrôle en lecture) ;
--   · un code d'apporteur ACTIF (`ap7k2m9x`, contrat du 06/09) — 0 ligne au registre ;
--   · 0 reversement, aucun abonnement Stripe (son offre « business » était offerte).
--
-- Zéro client apporté, zéro euro versé : la sortie ne laisse aucune dette derrière elle. Ce qui
-- RESTE, et volontairement : ses 11 lignes de journal (une trace ne s'efface pas, c'est même
-- pour ces jours-là qu'elle existe), son compte d'artisan et ses 5 factures — scellées pour dix
-- ans (art. L. 102 B du LPF). On retire des DROITS, on ne réécrit pas le passé.
--
-- ⚠️  L'ORDRE ET LA COMBINAISON COMPTENT — c'est tout l'intérêt de ce fichier.
--     `lib/direction/garde.ts` calcule le rôle ainsi :
--
--         const roleInterne = art.role_interne === 'partenaire' ? 'partenaire' : 'fondateur'
--
--     Vider `role_interne` SANS retirer `is_founder` ne dégraderait donc pas ses droits : ça les
--     PROMOUVRAIT, de partenaire (lecture bornée) à fondateur plein — écriture partout, la
--     comptabilité de l'entreprise comprise. Le repli « rôle inconnu = fondateur » est le bon
--     choix pour un compte de Benj qui n'a pas encore de rôle ; il est un piège le jour d'un
--     départ. Les deux colonnes tombent donc dans la MÊME instruction, et le contrôle en fin de
--     fichier montre l'état obtenu plutôt que de le supposer.
--
-- Et une deuxième chausse-trappe, dans l'autre sens : `0068` AMORCE le rôle par une instruction
-- nommée (`update … where lower(email) = 'alexandremesroua@gmail.com'`). Une base reconstruite
-- depuis les migrations lui rendrait donc son rôle de partenaire. Cette migration vient après :
-- elle est le dernier mot, et elle est idempotente — la rejouer ne fait rien de plus.
-- ============================================================================================

do $sortie$
declare
  v_email    constant text := 'alexandremesroua@gmail.com';
  v_id       uuid;
  v_sessions int := 0;
  v_roles    int := 0;
  v_codes    int := 0;
begin
  select id into v_id from public.artisans where lower(email) = v_email;
  if v_id is null then
    raise notice '0084 : aucun compte % en base — rien à retirer.', v_email;
    return;
  end if;

  -- 1. Les privilèges, en une seule instruction (voir l'avertissement ci-dessus).
  --
  -- `est_demo` mérite un mot : ce n'est pas une accusation, c'est le marqueur « ne compte pas
  -- dans les chiffres » (0068). Tant qu'il était fondateur, le filtre l'excluait par `is_founder` ;
  -- ce filtre tombe avec le privilège, et sans ce marqueur son compte deviendrait demain un
  -- « client » de plus dans le tableau de bord — une offre business offerte comptée comme une
  -- vente. Le marqueur n'a aucun effet sur son usage du produit : il ne change que les comptages.
  update public.artisans
     set is_founder               = false,
         role_interne             = null,
         est_demo                 = true,
         sessions_invalides_avant = now() + interval '1 second'
   where id = v_id;

  -- 2. Le rôle du Poste de contrôle. La garde exige `is_founder` d'abord, donc cette ligne était
  --    déjà sans effet — on la retire quand même : un droit qui traîne finit par resservir.
  delete from public.direction_roles where user_id = v_id;
  get diagnostics v_roles = row_count;

  -- 3. Le code d'apport. On DÉSACTIVE, on ne supprime pas : `registre_apports.apporteur_id` est en
  --    `on delete restrict`, et surtout un code retiré ne doit jamais être réattribué à quelqu'un
  --    d'autre — le lien prestiapp.fr/a/<code> a circulé. Inactif, `rattacher_apport` le refuse.
  update public.apporteurs set actif = false
   where actif and (artisan_id = v_id or nom ilike '%alexandre%');
  get diagnostics v_codes = row_count;

  -- 4. Les sessions ouvertes. Le seuil posé plus haut invalide les jetons d'accès déjà émis ;
  --    celle-ci tue les jetons de rafraîchissement. Il faut les DEUX (leçon du 03/09 : sans le
  --    second, un jeton copié se refabriquait un accès pendant que l'écran annonçait le contraire).
  v_sessions := public.revoquer_sessions_auth(v_id);

  -- 5. La trace. Une action de direction non journalisée n'a pas lieu — celle-ci moins que les
  --    autres. L'acteur est Benjamin : c'est sa décision, pas celle d'une migration.
  insert into public.journal_direction
    (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, reconfirme)
  select b.id, b.email, 'partenaire_retire', 'artisan', v_id::text, v_id,
         jsonb_build_object('is_founder', true, 'role_interne', 'partenaire', 'role_centre', 'lecture', 'code_apport', 'actif'),
         jsonb_build_object('is_founder', false, 'role_interne', null, 'role_centre', null,
                            'sessions_fermees', v_sessions, 'codes_apport_desactives', v_codes,
                            'motif', 'fin de la collaboration — décision de Benjamin, migration 0084'),
         true
    from public.artisans b where lower(b.email) = 'benjaminfiliot@gmail.com';

  raise notice '0084 : % — privilèges retirés, % rôle(s) supprimé(s), % code(s) d''apport désactivé(s), % session(s) fermée(s).',
    v_email, v_roles, v_codes, v_sessions;
end $sortie$;

-- ── Et le verrou ? Il existe déjà, et il n'est pas ici ───────────────────────────────────
--
-- J'ai commencé par poser ici une contrainte « le rôle d'entreprise n'existe que pour une adresse
-- nommée ». Elle aurait tenu deux minutes : `artisans.email` est modifiable par l'artisan lui-même
-- (c'est écrit noir sur blanc dans 0065, à propos de `acteur_email`). Le jour où Benj change son
-- adresse dans ses paramètres, la contrainte lui refuse sa propre ligne — une garde qui casse le
-- compte qu'elle protège.
--
-- Le verrou qui marche existe et tourne chaque nuit : `scripts/zero-demo-e2e.mjs` porte la LISTE
-- CLOSE des comptes autorisés à porter un privilège, et rougit sur tout le reste. Elle est mise à
-- jour dans le même commit que cette migration. Un contrôle qui explique ce qu'il a trouvé vaut
-- mieux qu'une contrainte qui bloque sans dire pourquoi.
