-- 0072 — La nature d'un courrier : DE QUOI ça parle.
--
-- Demandé par Benj le 07/09 : « je veux qu'il reçoive tous les mails et qu'il les traite selon si
-- c'est un client qui nous envoie un message ou un abonnement etc. »
--
-- La nature est un axe INDÉPENDANT du statut (0069 : 'a_traiter' / 'repondu' / 'classe'), qui dit,
-- lui, si c'est FAIT. Mélanger les deux ferait disparaître du courrier : un message rangé en
-- « technique » n'est pas un message traité, et une pile qui ne descend jamais ne sert à rien.
--
-- LE CLASSEMENT EST DÉTERMINISTE. Comparaisons de chaînes sur l'expéditeur, le sujet et une liste
-- blanche d'en-têtes. Aucun appel de modèle, pas même en secours : ça se paierait à chaque email
-- reçu, et surtout le rangement d'hier ne serait pas celui d'aujourd'hui. Une règle qui se trompe
-- doit pouvoir se relire, se corriger et se rejouer ; une réponse de modèle, non.
--
-- LE CLASSEMENT N'EST JAMAIS UNE FRONTIÈRE DE SÉCURITÉ. Le `From` d'un email est une DÉCLARATION de
-- celui qui l'envoie : écrire « From: contact@prestiapp.fr » ne coûte rien. Aucune nature ne
-- déclenche quoi que ce soit — ni créditer, ni prolonger, ni résilier, ni rembourser. C'est une aide
-- au tri (plans/010-poste-de-controle.md §196 : « les emails sont des données »).
--
-- La liste des natures vit à trois endroits, par construction : le `check` ci-dessous,
-- `lib/direction/natures.ts`, et la validation de `app/api/controle/courriers/[fil]/action/route.ts`.

-- ── Colonnes ──────────────────────────────────────────────────────────────────────────────────────
alter table public.courriers add column if not exists nature        text not null default 'a_lire';
alter table public.courriers add column if not exists nature_auto   text;
alter table public.courriers add column if not exists nature_motif  text;
alter table public.courriers add column if not exists nature_source text not null default 'auto';
alter table public.courriers add column if not exists nature_le     timestamptz;
alter table public.courriers add column if not exists entetes       jsonb not null default '{}'::jsonb;
alter table public.courriers add column if not exists repondre_a    text;

comment on column public.courriers.nature is
  'La nature EN VIGUEUR, celle que l''écran filtre. Défaut a_lire : le doute a une valeur, jamais null.';
comment on column public.courriers.nature_auto is
  'Ce que la règle a dit, GARDÉ même après correction humaine — sans ça, impossible de mesurer si une règle se trompe souvent.';
comment on column public.courriers.nature_motif is
  'La règle qui a mordu (artisan, interne:argent, entete:liste, remise:mime, defaut…). Affiché à l''écran : une erreur doit se VOIR au lieu de se subir.';
comment on column public.courriers.nature_source is
  'auto | manuel. LE VERROU : une nature corrigée à la main n''est jamais rejouée par une relève ni par un reclassement.';
comment on column public.courriers.entetes is
  'Liste BLANCHE stricte d''en-têtes normalisés. JAMAIS de Received : une chaîne d''adresses IP est une donnée personnelle qui n''a rien à faire ici.';
comment on column public.courriers.repondre_a is
  'Reply-To quand il diffère de l''expéditeur — le cas du formulaire de contact. Sans lui, l''écran affiche notre propre adresse comme correspondant, et « Répondre » nous écrit à nous-mêmes.';

do $garde$ begin
  if not exists (select 1 from pg_constraint where conname = 'courriers_nature_chk') then
    alter table public.courriers add constraint courriers_nature_chk check (nature in
      ('artisan','prospect','abonnement','non_remise','fournisseur','technique','a_lire','reponse_auto','diffusion'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courriers_nature_auto_chk') then
    alter table public.courriers add constraint courriers_nature_auto_chk check (nature_auto is null or nature_auto in
      ('artisan','prospect','abonnement','non_remise','fournisseur','technique','a_lire','reponse_auto','diffusion'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courriers_nature_source_chk') then
    alter table public.courriers add constraint courriers_nature_source_chk check (nature_source in ('auto','manuel'));
  end if;
  -- Pas de contrainte de taille sur `entetes`, et c'est un choix.
  -- La première version posait `check (pg_column_size(entetes) <= 4096)` : PostgreSQL l'a refusée,
  -- parce qu'un CHECK n'accepte que des fonctions IMMUTABLE et que `pg_column_size` est STABLE.
  -- Plutôt que d'inventer un trigger pour sauver une ceinture par-dessus des bretelles : ce jsonb
  -- est écrit par `lib/direction/courriers.ts` et par personne d'autre, avec une liste blanche de
  -- onze clés dont chaque valeur est coupée à 256 caractères. La borne est dans le code qui écrit.
end $garde$;

create index if not exists courriers_nature_idx on public.courriers (nature, recu_le desc);
create index if not exists courriers_pile_idx   on public.courriers (nature, recu_le desc) where statut = 'a_traiter';

-- ── La normalisation du sujet ─────────────────────────────────────────────────────────────────────
-- Nos propres sujets portent l'apostrophe typographique ’ (U+2019) et le cadratin — (U+2014) :
-- « URGENT — le solde de l'API est épuisé ». Un motif écrit avec ' et - ne mordrait JAMAIS, et
-- l'alerte la plus grave du produit tomberait ailleurs sans que personne ne comprenne pourquoi.
-- On ne mémorise pas le piège, on le supprime : tous les motifs sont écrits en minuscules,
-- apostrophe droite, tiret ASCII. Les accents, eux, sont conservés — ils ne posent pas de problème.
create or replace function public.sujet_norme(p text) returns text language sql immutable as $fn$
  -- Les caractères sont écrits en clair plutôt qu'en U&'\2019' : cette syntaxe dépend d'un réglage
  -- du serveur et déroute les éditeurs SQL, alors que le fichier est en UTF-8 et déjà plein d'accents.
  -- Dans l'ordre : apostrophe typographique ’, apostrophe ouvrante ‘, accent aigu ´,
  -- cadratin —, demi-cadratin –, espace insécable.
  select btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(
      lower(coalesce(p, '')),
      '’', ''''), '‘', ''''), '´', ''''),
      '—', '-'),  '–', '-'),  ' ', ' '),
    '\s+', ' ', 'g'))
$fn$;

-- ── Le classificateur ─────────────────────────────────────────────────────────────────────────────
-- IMMUTABLE et SANS ACCÈS TABLE : l'artisan et l'existence du fil sont déjà calculés par
-- `enregistrer_courrier` et passés en paramètres. Zéro requête de plus, et la fonction se teste par
-- une simple table de cas — c'est ce qui permet de prouver le classement sans relever une boîte.
--
-- L'ORDRE DES RÈGLES EST UN ORDRE DE DANGER, pas de fréquence : plus une règle risque d'enterrer un
-- message vivant, plus elle est testée tôt.
create or replace function public.nature_courrier(
  p_email text, p_sujet text, p_entetes jsonb, p_est_artisan boolean, p_fil_connu boolean
) returns jsonb language plpgsql immutable as $fn$
declare
  v_de     text := lower(btrim(coalesce(p_email, '')));
  v_local  text := split_part(lower(btrim(coalesce(p_email, ''))), '@', 1);
  v_dom    text := split_part(lower(btrim(coalesce(p_email, ''))), '@', 2);
  v_s      text := public.sujet_norme(p_sujet);
  v_e      jsonb := coalesce(p_entetes, '{}'::jsonb);
  -- FROM_ADDR (lib/email.ts) : le From RÉEL de 100 % de nos envois, imposé par `fromHeader()`.
  v_nous   boolean := v_de = 'contact@prestiapp.fr';
  m        text;
  -- Ces deux listes sont VIDES AU DÉPART, et c'est voulu. Le dépôt ne contient aucune adresse
  -- d'expédition de service tiers — pas une seule. Une liste écrite de mémoire produirait
  -- exactement le classement faux que la maison interdit, et un classement faux ne se voit pas.
  -- On les remplit une ligne à la fois, après avoir relevé la vraie boîte et lu le vrai message.
  v_stripe       text[] := array[]::text[];
  v_fournisseurs text[] := array[]::text[];
  -- Nos propres sujets, relevés un par un dans le code. Le début est figé, la suite est interpolée :
  -- la règle porte donc sur le DÉBUT, jamais sur le sujet entier.
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
  -- 1. NON-REMISE, EN PREMIER. Un rapport de non-remise embarque les en-têtes du message d'origine,
  --    `In-Reply-To` compris : testé plus tard, il passerait pour « un humain m'a répondu », et le
  --    fait qu'un devis ne soit jamais arrivé chez un client se lirait comme une bonne nouvelle.
  --    Jamais sur le sujet seul : « Mail delivery failed » est parmi les plus copiés par l'hameçonnage.
  if coalesce((v_e->>'rapport_remise')::boolean, false) then
    return jsonb_build_object('nature','non_remise','motif','remise:mime');
  end if;
  if v_local in ('mailer-daemon','postmaster','mail-daemon')
     and (v_e->>'return_path' = '<>' or (v_e->>'x_failed_recipients') is not null) then
    return jsonb_build_object('nature','non_remise','motif','remise:daemon');
  end if;

  -- 2. NOS PROPRES ENVOIS. Le sous-ordre n'est pas négociable, chaque marche coûte cher si on l'inverse.
  if v_nous then
    -- 2a. Une simulation d'alerte porte [SIMULATION] ENTRE les deux préfixes. Testée après, elle
    --     déclenche une nuit blanche ou passe pour de l'argent.
    --     LE MARQUEUR EST ANCRÉ, jamais cherché n'importe où : le sujet du formulaire de contact
    --     contient 120 caractères que le VISITEUR écrit (« Message de <son nom> »). Cherché
    --     librement, un visiteur nommé « [SIMULATION] Marc » enterrait son propre message dans la
    --     pile des machines — le cas exact que ce classement existe pour empêcher.
    --     Les deux formes viennent de `lib/alertes.ts` : « [Presti] [SIMULATION] … » et
    --     « Presti — [SIMULATION] … ». Aucune autre n'est la nôtre.
    if v_s like '[presti] [simulation] %' or v_s like 'presti - [simulation] %' then
      return jsonb_build_object('nature','technique','motif','interne:simulation');
    end if;
    -- 2b. LE MAIL LE PLUS IMPORTANT DE LA BOÎTE : un vrai visiteur, écrit par notre serveur, avec
    --     notre adresse en expéditeur. Une règle « nos mails = technique » posée plus haut
    --     enterrerait CHAQUE message du site.
    if v_s like '[presti] message de %' then
      return jsonb_build_object('nature','prospect','motif','formulaire:contact','repondre_a', true);
    end if;
    -- 2c. L'argent et les comptes. Piège nommé : « Votre paiement a échoué — Jean Dupont » est une
    --     notification INTERNE malgré sa deuxième personne. Seuls le préfixe ET notre adresse
    --     d'expédition la distinguent d'un mail adressé à un artisan : on exige les deux, sinon la
    --     règle devient un aimant à hameçonnage.
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
    -- 2d. Le jour où une alerte est ajoutée au code sans être ajoutée aux règles : elle reste LUE
    --     (« technique » est en « lire ») et l'écran dit « notification interne non répertoriée ».
    --     Elle ne meurt pas, et elle ne noie pas la pile du doute.
    if v_s like '[presti] %' or v_s like 'presti - %' then
      return jsonb_build_object('nature','technique','motif','interne:non-repertorie');
    end if;
    -- Un message venu de notre adresse sans aucun de nos préfixes ne mord pas ici : il continue et
    -- finira en « à lire ». C'est le bon comportement — ce n'est probablement pas nous.
  end if;

  -- 3. ARTISAN, avant toute heuristique de robot : un artisan dont la signature passe par un outil
  --    qui colle un `List-Unsubscribe` reste un artisan. C'est aussi la preuve la plus forte de
  --    toute la taxonomie — une jointure sur NOTRE base, pas une lecture de sujet.
  if coalesce(p_est_artisan, false) then
    return jsonb_build_object('nature','artisan','motif','artisan');
  end if;

  -- 4. RÉPONSE AUTOMATIQUE, après l'artisan volontairement. Un « je suis absent » d'artisan rangé
  --    en « Artisan » coûte cinq secondes de lecture ; un vrai message d'artisan rangé ici, dans une
  --    pile qu'on n'ouvre pas, coûte un client.
  if (v_e->>'auto_submitted') is not null and lower(v_e->>'auto_submitted') not like 'no%' then
    return jsonb_build_object('nature','reponse_auto','motif','entete:auto-submitted');
  end if;

  -- 5 et 6. Domaines OBSERVÉS. Tant que les listes sont vides, aucune règle ne mord et tout tombe en
  --         « à lire » : c'est le bon échec, pas une panne. On compare le domaine, jamais un nom de
  --         service lu dans le sujet — « Votre facture Vercel » est la signature exacte de l'hameçonnage.
  if v_dom <> '' then
    foreach m in array v_stripe loop
      if v_dom = m or v_dom like '%.' || m then return jsonb_build_object('nature','abonnement','motif','domaine:' || m); end if;
    end loop;
    foreach m in array v_fournisseurs loop
      if v_dom = m or v_dom like '%.' || m then return jsonb_build_object('nature','fournisseur','motif','domaine:' || m); end if;
    end loop;
  end if;

  -- 7. Rapports DMARC agrégés (RFC 7489). Placés après les domaines : ils viennent de Google et de
  --    Microsoft, qui seront un jour dans la liste des fournisseurs.
  if v_s like 'report domain: %' and position('prestiapp.fr' in v_s) > 0 then
    return jsonb_build_object('nature','technique','motif','dmarc:rapport');
  end if;

  -- 8. Quelqu'un répond dans un fil que NOUS avons ouvert. `In-Reply-To` est un identifiant de
  --    message, qu'on ne tape pas à la main ; « Re: » est du texte, qu'on tape.
  if coalesce(p_fil_connu, false) then
    return jsonb_build_object('nature','prospect','motif','fil:reponse');
  end if;

  -- 9. Envoi en masse, nommé par le FAIT (l'en-tête existe ou n'existe pas), jamais par le jugement.
  --    Évaluée en dernier : toute règle plus sûre l'a déjà emporté. Oui, un attaquant peut poser
  --    lui-même un `List-Unsubscribe` pour tomber dans une pile qu'on lit moins — son seul gain est
  --    de se faire moins lire. Une règle usurpable n'est acceptable QUE dans ce cas : quand le seul
  --    bénéficiaire de l'erreur est celui qui la commet.
  if (v_e->>'list_unsubscribe') is not null or (v_e->>'list_id') is not null
     or lower(coalesce(v_e->>'precedence','')) in ('bulk','list') then
    return jsonb_build_object('nature','diffusion','motif','entete:liste');
  end if;

  -- 10. Le doute. Ce n'est pas une poubelle : c'est la pile qu'on descend chaque matin.
  return jsonb_build_object('nature','a_lire','motif','defaut');
end $fn$;

-- ── enregistrer_courrier : la signature change ────────────────────────────────────────────────────
-- ATTENTION, PIÈGE MORTEL : `create or replace function` avec une liste de paramètres DIFFÉRENTE ne
-- remplace rien — Postgres crée une SURCHARGE. L'appel PostgREST à dix arguments nommés devient
-- alors ambigu (PGRST203, « function is not unique ») et toute la relève tombe, sans la moindre
-- erreur SQL au moment de la migration. La seule séquence correcte : `drop` explicite avec la
-- signature complète, puis `create`, puis RÉÉMISSION des droits — le `drop` les efface.
drop function if exists public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint);

create or replace function public.enregistrer_courrier(
  p_message_id text, p_fil text, p_sens text, p_email text, p_nom text, p_sujet text,
  p_corps text, p_recu_le timestamptz, p_boite text, p_uid bigint,
  -- Le DÉFAUT est obligatoire : il rend le changement invisible aux appelants à dix arguments qui
  -- existent déjà (la route de réponse, les six appels de la suite e2e).
  p_entetes jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  v_id uuid; v_corps text; v_artisan uuid;
  v_e jsonb := coalesce(p_entetes, '{}'::jsonb);
  v_n jsonb; v_nature text; v_motif text; v_repondre text; v_fil text; v_fil_connu boolean;
begin
  if coalesce(trim(coalesce(p_message_id, '')), '') = '' then return jsonb_build_object('etat', 'sans_identifiant'); end if;
  if p_sens not in ('recu', 'envoye') then return jsonb_build_object('etat', 'sens_inconnu'); end if;

  select id into v_id from public.courriers where message_id = p_message_id;
  if found then
    -- Message déjà connu : on ne rafraîchit QUE le numéro IMAP et la boîte. Ni le statut, ni
    -- l'assignation, ni l'artisan, ni AUCUNE colonne nature_*. La relève repasse tous les jours et
    -- elle ne doit jamais effacer le rangement de la veille.
    update public.courriers set uid_imap = coalesce(p_uid, uid_imap), boite = coalesce(p_boite, boite) where id = v_id;
    return jsonb_build_object('etat', 'ok', 'id', v_id, 'nouveau', false);
  end if;

  v_corps := left(coalesce(p_corps, ''), 40000);
  v_fil := coalesce(nullif(trim(coalesce(p_fil, '')), ''), p_message_id);
  select exists (select 1 from public.courriers where fil = v_fil) into v_fil_connu;

  -- Rattachement automatique à un artisan : son courrier apparaît alors sur sa fiche. Trois gardes,
  -- ajoutées ici : (a) jamais nous-mêmes — sans ça, le jour où la boîte relevée appartient à un
  -- fondateur qui est AUSSI une ligne `artisans`, tout ce qu'il s'envoie se rattache à sa propre
  -- fiche ; (b) jamais un compte de test ; (c) `order by created_at`, parce que `artisans.email`
  -- n'a aucune contrainte d'unicité et qu'un `limit 1` sans ordre change de réponse d'une relève
  -- à l'autre.
  if coalesce((v_e->>'de_soi')::boolean, false) is not true
     and lower(trim(coalesce(p_email,''))) <> 'contact@prestiapp.fr' then
    select id into v_artisan from public.artisans
     where lower(email) = lower(trim(coalesce(p_email, ''))) and email not like '%@presti-test.invalid'
     order by created_at asc limit 1;
  end if;

  if p_sens = 'envoye' then
    -- On ne classe pas ce qu'on a écrit soi-même : le message prend la nature de son fil.
    select nature into v_nature from public.courriers where fil = v_fil and sens = 'recu' order by recu_le asc limit 1;
    v_nature := coalesce(v_nature, 'a_lire'); v_motif := 'fil';
  else
    v_n := public.nature_courrier(p_email, p_sujet, v_e, v_artisan is not null, v_fil_connu);
    v_nature := v_n->>'nature'; v_motif := v_n->>'motif';
    -- Le Reply-To du formulaire de contact sert à AFFICHER la bonne adresse et à faire partir la
    -- réponse au bon endroit. Il ne décide de rien d'autre, et surtout pas d'un rattachement.
    --
    -- La première version de cette migration rattachait le message à la fiche de l'artisan dont
    -- l'adresse correspondait. Or cette adresse est tapée dans un formulaire PUBLIC, et l'adresse
    -- d'un artisan est lisible sur sa page publique : n'importe qui pouvait faire apparaître son
    -- message sur la fiche d'un vrai client, dans la pile la plus lue de l'écran, sous un motif qui
    -- affirme « c'est un artisan ». Rattacher reste un geste humain, tracé au journal.
    if coalesce((v_n->>'repondre_a')::boolean, false) and (v_e->>'reply_to') is not null then
      v_repondre := lower(left(trim(v_e->>'reply_to'), 320));
    end if;
  end if;

  insert into public.courriers (message_id, fil, sens, correspondant_email, correspondant_nom, sujet, apercu,
                                corps, recu_le, boite, uid_imap, artisan_id, statut,
                                nature, nature_auto, nature_motif, nature_source, nature_le, entetes, repondre_a)
  values (p_message_id, v_fil, p_sens,
          lower(trim(coalesce(p_email, ''))), nullif(trim(coalesce(p_nom, '')), ''), nullif(trim(coalesce(p_sujet, '')), ''),
          left(regexp_replace(v_corps, '\s+', ' ', 'g'), 400), v_corps, coalesce(p_recu_le, now()),
          coalesce(nullif(trim(coalesce(p_boite, '')), ''), 'INBOX'), p_uid, v_artisan,
          case when p_sens = 'envoye' then 'repondu' else 'a_traiter' end,
          v_nature, v_nature, v_motif, 'auto', now(), v_e, v_repondre)
  returning id into v_id;
  return jsonb_build_object('etat','ok','id',v_id,'nouveau',true,'artisan',v_artisan,'nature',v_nature,'motif',v_motif);
end $fn$;

revoke all on function public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.enregistrer_courrier(text, text, text, text, text, text, text, timestamptz, text, bigint, jsonb) to service_role;

-- ── classer_courrier : la nature devient corrigeable à la main ────────────────────────────────────
-- Même chirurgie, même piège que ci-dessus : `drop` explicite avant, droits réémis après.
drop function if exists public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text);

create or replace function public.classer_courrier(
  p_acteur uuid, p_acteur_email text, p_courrier uuid, p_statut text, p_assigne uuid, p_artisan uuid,
  p_ip text, p_agent text, p_nature text default null
) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_avant public.courriers%rowtype; v_journal uuid; v_statut text; v_assigne uuid; v_artisan uuid; v_nature text;
begin
  select * into v_avant from public.courriers where id = p_courrier for update;
  if not found then return jsonb_build_object('etat', 'inconnu'); end if;
  if p_statut is not null and p_statut not in ('a_traiter', 'repondu', 'classe') then return jsonb_build_object('etat', 'statut_inconnu'); end if;
  if p_nature is not null and p_nature not in
     ('artisan','prospect','abonnement','non_remise','fournisseur','technique','a_lire','reponse_auto','diffusion') then
    return jsonb_build_object('etat', 'nature_inconnue');
  end if;
  -- On n'assigne qu'à un fondateur : la messagerie de l'entreprise ne se délègue pas à un client.
  if p_assigne is not null and not exists (select 1 from public.artisans where id = p_assigne and is_founder) then
    return jsonb_build_object('etat', 'assigne_inconnu');
  end if;

  v_statut  := coalesce(p_statut, v_avant.statut);
  v_assigne := coalesce(p_assigne, v_avant.assigne_a);
  v_artisan := coalesce(p_artisan, v_avant.artisan_id);
  v_nature  := coalesce(p_nature, v_avant.nature);
  -- `nature_auto` reste INTACTE : c'est elle qui permettra de mesurer si une règle se trompe souvent.
  -- `nature_source = 'manuel'` est le verrou qui empêche la relève de rejouer sur ce message.
  update public.courriers
     set statut = v_statut, assigne_a = v_assigne, artisan_id = v_artisan, nature = v_nature,
         nature_source = case when p_nature is not null then 'manuel' else nature_source end,
         nature_le = case when p_nature is not null then now() else nature_le end,
         maj_le = now()
   where id = p_courrier;

  insert into public.journal_direction (acteur_id, acteur_email, action, cible_type, cible_id, artisan_id, avant, apres, ip, agent, reconfirme)
  values (p_acteur, p_acteur_email, 'courrier_classe', 'courrier', p_courrier::text, v_artisan,
          jsonb_build_object('statut', v_avant.statut, 'assigne', v_avant.assigne_a, 'artisan', v_avant.artisan_id, 'nature', v_avant.nature),
          jsonb_build_object('statut', v_statut, 'assigne', v_assigne, 'artisan', v_artisan, 'nature', v_nature), p_ip, p_agent, false)
  returning id into v_journal;
  return jsonb_build_object('etat', 'ok', 'journal', v_journal, 'statut', v_statut, 'nature', v_nature);
end $fn$;
revoke all on function public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.classer_courrier(uuid, text, uuid, text, uuid, uuid, text, text, text) to service_role;

-- ── Reclassement de masse ─────────────────────────────────────────────────────────────────────────
-- À appeler quand on AJOUTE une observation — un domaine relevé dans la vraie boîte, par exemple.
-- Le verrou `nature_source = 'auto'` est ce qui garantit qu'une correction humaine n'est jamais
-- rejouée : sans lui, le rangement de la veille disparaîtrait à chaque ajout de règle.
create or replace function public.reclasser_courriers(p_depuis timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare n_recu int; n_env int;
begin
  update public.courriers c
     set nature = x.n, nature_auto = x.n, nature_motif = x.m, nature_le = now()
    from (
      select src.id,
             (calc.j->>'nature') as n,
             (calc.j->>'motif') || case when src.entetes = '{}'::jsonb then ':retro' else '' end as m
        from public.courriers src
        cross join lateral (
          select public.nature_courrier(src.correspondant_email, src.sujet, src.entetes,
                                        src.artisan_id is not null,
                                        exists (select 1 from public.courriers p
                                                 where p.fil = src.fil and p.recu_le < src.recu_le)) as j
        ) calc
       where src.sens = 'recu'
         and src.nature_source = 'auto'
         and src.recu_le >= coalesce(p_depuis, '-infinity')
    ) x
   where c.id = x.id;
  get diagnostics n_recu = row_count;

  update public.courriers e
     set nature = f.nature, nature_auto = f.nature, nature_motif = 'fil', nature_le = now()
    from (select distinct on (fil) fil, nature from public.courriers
           where sens = 'recu' order by fil, recu_le asc) f
   where e.sens = 'envoye' and e.nature_source = 'auto' and e.fil = f.fil
     and e.recu_le >= coalesce(p_depuis, '-infinity');
  get diagnostics n_env = row_count;
  return jsonb_build_object('recus', n_recu, 'envoyes', n_env);
end $fn$;
revoke all on function public.reclasser_courriers(timestamptz) from public, anon, authenticated;
grant execute on function public.reclasser_courriers(timestamptz) to service_role;

-- ── Les compteurs des pastilles ───────────────────────────────────────────────────────────────────
-- Une requête, pas neuf — et surtout PAS dérivés des 300 lignes que la route charge déjà : la limite
-- mentirait dès que la boîte grossit, et un compteur qui ment est pire qu'un compteur absent.
-- `p_assigne` : le partenaire ne voit que ce qui lui est assigné ; sans ce paramètre, les compteurs
-- lui parleraient d'une boîte qu'il n'a pas le droit de lire.
create or replace function public.compter_courriers_par_nature(p_assigne uuid default null)
returns jsonb language sql security definer set search_path = public as $fn$
  select coalesce(jsonb_object_agg(nature, n), '{}'::jsonb) from (
    select nature, count(*) n from public.courriers
     where (p_assigne is null or assigne_a = p_assigne) group by nature) t
$fn$;
revoke all on function public.compter_courriers_par_nature(uuid) from public, anon, authenticated;
grant execute on function public.compter_courriers_par_nature(uuid) to service_role;

-- ── Rattrapage des lignes déjà en base ────────────────────────────────────────────────────────────
-- Elles n'ont pas d'en-têtes : le motif le DIT (« :retro »), pour que l'écran n'affiche jamais une
-- raison qu'il n'a pas réellement eue.
select public.reclasser_courriers(null);
