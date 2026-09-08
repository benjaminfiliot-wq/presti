-- ============================================================================================
-- 0076 · La trace du support ne doit pas rendre un compte indestructible
--
-- Défaut introduit par 0074, trouvé le 08/09 par l'audit : `acces_support_lectures.artisan_id`
-- est `on delete cascade`, et le trigger d'immuabilité refuse tout DELETE de moins de 24 mois.
-- Résultat : dès qu'une lecture de support a eu lieu, supprimer le compte de l'artisan lève une
-- exception et TOUTE la suppression est annulée. L'écran continue d'afficher « Votre compte sera
-- supprimé le … », les CGU promettent « puis la purge est automatique », et rien ne se passe —
-- pour toujours.
--
-- Le pire n'est pas le blocage, c'est pourquoi personne ne l'a vu : le trigger faisait une
-- exception pour les adresses `@presti-test.invalid`. Les comptes de test passaient donc, les
-- suites restaient vertes, et seuls les VRAIS comptes étaient bloqués. Un test qui ne peut échouer
-- que sur les données qu'il n'utilise jamais ne teste rien.
--
-- Deux corrections, et la seconde compte autant que la première :
--
--   1. La cascade passe. Quand l'artisan lui-même disparaît, ses traces partent avec lui — c'est
--      son droit à l'effacement, et il prime sur notre conservation. Techniquement : dans une
--      cascade, Postgres a déjà supprimé la ligne `artisans` quand ce trigger s'exécute, donc
--      `exists (select 1 from artisans …)` est faux et l'exception devient inatteignable. Une
--      suppression DIRECTE d'une trace, elle, trouve toujours son artisan : elle reste refusée.
--
--   2. L'exception « compte de test » disparaît. C'était un trou — n'importe qui créant un compte
--      en `@presti-test.invalid` effaçait ses propres traces — et c'était surtout l'anesthésiant
--      qui empêchait de découvrir le défaut n° 1. Le ménage des suites passe maintenant par la
--      cascade, comme un vrai compte : elles éprouvent enfin le même chemin que la production.
-- ============================================================================================

create or replace function public.acces_support_lectures_immuable() returns trigger language plpgsql as $fn$
begin
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - 'artisan_id') = (to_jsonb(old) - 'artisan_id')
       and (new.artisan_id is null or new.artisan_id is not distinct from old.artisan_id) then
      return new;
    end if;
    raise exception 'acces_support_lectures : une trace de lecture ne se modifie pas';
  end if;
  -- Le droit à l'effacement de l'artisan passe avant notre conservation : si son compte s'en va,
  -- ses traces s'en vont avec. On ne refuse que la suppression d'une trace SEULE, celle qui
  -- servirait à faire disparaître un regard qui a eu lieu.
  if tg_op = 'DELETE'
     and old.lu_le > now() - interval '24 months'
     and exists (select 1 from public.artisans a where a.id = old.artisan_id) then
    raise exception 'acces_support_lectures : conservation 24 mois (la suppression du compte, elle, emporte tout)';
  end if;
  return old;
end $fn$;

comment on function public.acces_support_lectures_immuable() is
  'Immuabilité des traces de lecture du support (0074, corrigé par 0076). Une trace ne se modifie jamais et ne se supprime pas seule avant 24 mois — mais la suppression du compte de l''artisan les emporte, sinon une seule consultation rendrait son compte indestructible.';
