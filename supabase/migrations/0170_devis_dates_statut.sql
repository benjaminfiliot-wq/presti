-- 0170 · [NON APPLIQUÉE — essai à sec en production le 18/10/2026, puis annulé] Devis : la date d'ENVOI et la date de SIGNATURE
-- se posent toutes seules au changement de statut, quel que soit le chemin d'écriture (audit de cohérence du 18/10, C1 et C5).
--
-- Le code les écrit déjà (lib/devisStatut.ts, appelé par POST /api/devis/[id] et lib/devisEnvoi.ts) : cette migration est un
-- FILET, pour tout chemin futur qui écrirait `devis.statut` sans passer par là (une route, l'assistant, une règle, un script).
-- Elle ne remplace jamais une date déjà donnée par l'écrivain, et n'invente aucune date passée :
--   • passage à « envoye » depuis un autre statut, sans que l'écrivain ait changé `envoye_le` → `envoye_le = now()` (premier
--     envoi, ou devis expiré que l'artisan rouvre : la validité repart d'aujourd'hui) ;
--   • passage à « accepte » sans `accepte_le` → `accepte_le = now()`, `accepte_canal = 'manuel'` si vide (une acceptation en
--     ligne porte déjà sa date, son IP pseudonymisée et le canal « plateforme » : jamais écrasés) ;
--   • à l'insertion directement en « envoye » / « accepte », même règle.
-- Rattrapage des devis existants : AUCUN. Pas de source fiable de la date d'envoi passée (aucun journal d'envoi en base) :
-- `envoye_le` reste vide, et tous les écrans retombent déjà sur la date d'émission (lib/comptaTableau.ts, lib/crm/pipeline.ts).
-- Idempotente (create or replace, drop trigger if exists). Aucune table, aucune donnée : pas de RLS à poser ; la fonction n'est
-- exécutable par personne en direct (révoquée), seul le déclencheur l'appelle.
create or replace function public.devis_dates_statut()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if tg_op = 'INSERT' then
    if new.statut = 'envoye' and new.envoye_le is null then new.envoye_le := now(); end if;
    if new.statut = 'accepte' and new.accepte_le is null then
      new.accepte_le := now();
      new.accepte_canal := coalesce(new.accepte_canal, 'manuel');
    end if;
    return new;
  end if;
  if new.statut is distinct from old.statut then
    if new.statut = 'envoye' and new.envoye_le is not distinct from old.envoye_le then new.envoye_le := now(); end if;
    if new.statut = 'accepte' and new.accepte_le is null then
      new.accepte_le := now();
      new.accepte_canal := coalesce(new.accepte_canal, 'manuel');
    end if;
  end if;
  return new;
end $fn$;
revoke all on function public.devis_dates_statut() from public, anon, authenticated;

drop trigger if exists devis_dates_statut on public.devis;
create trigger devis_dates_statut
  before insert or update of statut on public.devis
  for each row execute function public.devis_dates_statut();
