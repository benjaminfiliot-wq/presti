-- ============================================================================================
-- 0078 · Ce qui est parti chez un client ne se modifie plus, ni ne s'efface
--
-- Deux défauts trouvés par l'audit du 08/09, de la même famille : un invariant écrit dans quatre
-- écrans, mais jamais posé en base.
--
--  1. LES LIGNES D'UNE FACTURE SCELLÉE étaient modifiables. 0044 croyait retirer le droit
--     d'écriture en faisant `drop policy if exists factures_lignes_all_own` — sauf que la policy
--     s'appelle `factures_lignes_own` (0006:48). Le `if exists` a avalé l'erreur en silence, la
--     migration est passée verte, et le `for all` d'origine est resté. Les policies permissives
--     s'additionnent par OU : celles de 0044 qui exigent `verrouillee = false` ne restreignaient
--     donc rien. Un artisan pouvait, avec la seule clé publique et son jeton de navigateur,
--     réécrire le détail d'une facture déjà remise à son client.
--
--  2. UN DEVIS ENVOYÉ était supprimable. La route DELETE ne regardait pas son statut, alors que
--     quatre écrans promettent « les devis envoyés et factures émises ne sont jamais supprimés :
--     la loi impose de les conserver ». Le supprimer emportait au passage le `devis_id` de la
--     facture qu'il avait produite (0006 : `on delete set null`), qui perdait sa pièce d'origine.
--
-- La route est corrigée dans les deux cas. Ces triggers sont la seconde serrure : une route qu'on
-- écrira dans six mois ne pourra pas rouvrir la porte sans le voir. C'est ce que 0041 fait déjà
-- pour `factures` — il manquait simplement à `factures_lignes` et à `devis`.
-- ============================================================================================

-- ══ 1. Les lignes d'une facture scellée ══════════════════════════════════════════════════════════

-- Le VRAI nom, cette fois. `factures_lignes_all_own` n'a jamais existé.
drop policy if exists factures_lignes_own on public.factures_lignes;

create or replace function public.factures_lignes_immuables() returns trigger language plpgsql as $fn$
declare v_verrouillee boolean;
begin
  select f.verrouillee into v_verrouillee
    from public.factures f
   where f.id = coalesce(new.facture_id, old.facture_id);
  if coalesce(v_verrouillee, false) then
    raise exception 'factures_lignes : cette facture est scellée, son détail ne change plus';
  end if;
  return coalesce(new, old);
end $fn$;

drop trigger if exists factures_lignes_immuables on public.factures_lignes;
create trigger factures_lignes_immuables before insert or update or delete on public.factures_lignes
  for each row execute function public.factures_lignes_immuables();

comment on function public.factures_lignes_immuables() is
  'Le détail d''une facture scellée ne change plus (0078). 0044 avait visé une policy qui n''existait pas sous ce nom : le droit d''écriture était resté ouvert depuis. Le trigger, lui, ne dépend pas d''un nom.';

-- ══ 2. Un devis parti chez le client se conserve ═════════════════════════════════════════════════

-- La purge d'un compte doit rester possible : elle passe par la cascade de `artisans`, où le parent
-- est déjà supprimé quand ce trigger s'exécute, donc le `exists` est faux et l'exception devient
-- inatteignable. Même raisonnement qu'en 0076 : le droit à l'effacement de l'artisan prime sur
-- notre obligation de conservation, qui ne le concerne plus une fois qu'il est parti.
create or replace function public.devis_envoye_conserve() returns trigger language plpgsql as $fn$
begin
  -- Un brouillon s'efface : il n'a jamais quitté l'atelier. Tout le reste est parti chez quelqu'un.
  if coalesce(old.statut, 'brouillon') <> 'brouillon'
     and exists (select 1 from public.artisans a where a.id = old.artisan_id) then
    raise exception 'devis : un devis envoyé se conserve (art. L. 123-22 c. com.), il ne se supprime pas';
  end if;
  return old;
end $fn$;

drop trigger if exists devis_envoye_conserve on public.devis;
create trigger devis_envoye_conserve before delete on public.devis
  for each row execute function public.devis_envoye_conserve();

comment on function public.devis_envoye_conserve() is
  'Un devis qui a quitté l''atelier se conserve (0078). Quatre écrans le promettaient à l''artisan ; la route DELETE ne le vérifiait pas, et supprimer un devis accepté faisait perdre à sa facture sa pièce d''origine.';
