-- 0066 — Centre de direction : ménage du journal (suite du J1).
--
-- Le problème, vu à l'œil sur le premier écran de production : la suite `direction-e2e` doit prouver que le
-- journal refuse la suppression d'une ligne fraîche. Elle créait pour cela une ligne « e2e_conservation » sans
-- adresse d'acteur — donc NON exemptée, donc indestructible pendant vingt-quatre mois. Six passages, six lignes
-- de bruit en tête du Fil de Benj, et une par nuit à venir.
--
-- Deux corrections : le trigger laisse partir les lignes dont l'action commence par « e2e_ » (ce ne sont pas des
-- actions réelles), et on efface celles déjà écrites. La suite, elle, réutilise désormais une seule ligne.

create or replace function public.journal_direction_immuable() returns trigger language plpgsql as $fn$
begin
  if tg_op = 'UPDATE' then
    -- Une seule modification tolérée : la nullification d'une clé étrangère par « on delete set null » quand le
    -- compte cité est supprimé. Sans cette exception, supprimer un compte échouait (le trigger refusait l'UPDATE
    -- que Postgres exécute pour la contrainte).
    if (to_jsonb(new) - 'acteur_id' - 'artisan_id') = (to_jsonb(old) - 'acteur_id' - 'artisan_id')
       and (new.acteur_id is null or new.acteur_id is not distinct from old.acteur_id)
       and (new.artisan_id is null or new.artisan_id is not distinct from old.artisan_id) then
      return new;
    end if;
    raise exception 'journal_direction : une ligne de journal ne se modifie pas';
  end if;
  -- Conservation 24 mois — sauf les lignes des comptes de TEST et les actions de test (« e2e_… »), que les
  -- suites doivent pouvoir effacer : ce ne sont pas des actions de direction.
  if tg_op = 'DELETE' and old.cree_le > now() - interval '24 months'
     and coalesce(old.acteur_email, '') not like '%@presti-test.invalid'
     and coalesce(old.action, '') not like 'e2e\_%' then
    raise exception 'journal_direction : conservation 24 mois';
  end if;
  return old;
end $fn$;

-- Les lignes de test déjà écrites (elles n'ont jamais été des actions réelles).
delete from public.journal_direction where action like 'e2e\_%';
