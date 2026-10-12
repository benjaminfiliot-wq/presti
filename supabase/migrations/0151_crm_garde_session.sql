-- 0151 · [APPLIQUÉE en production le 12/10/2026 : essai à sec, puis 32 politiques, 0 droit anon] Garde de session (0138) sur les 8 tables du CRM (0141) + accès anonyme retiré.
-- Audit RGPD du 12/10/2026 (art. 32) : 0141 n'avait pas reposé les politiques restrictives de 0138 ; avec le mot de
-- passe seul (sans le code par e-mail ni la double authentification) ou un compte suspendu, on pouvait lire et écrire
-- directement dans l'équipe, les chantiers et les notes. Même bloc que 0150 §4, plus `revoke … from anon` (défense en
-- profondeur : une lecture anonyme ne reçoit plus une réponse vide filtrée, elle est refusée). Idempotente.
do $$
declare t text;
begin
  foreach t in array array['equipe_membres', 'vehicules', 'chantiers', 'chantier_equipe', 'chantier_taches',
                           'chantier_materiaux', 'crm_notes', 'crm_journal'] loop
    execute format('drop policy if exists garde_session on public.%I', t);
    execute format('create policy garde_session on public.%I as restrictive for all to authenticated
                      using ((select public.jeton_session_valide())) with check ((select public.jeton_session_valide()))', t);
    execute format('drop policy if exists garde_suspension_ins on public.%I', t);
    execute format('create policy garde_suspension_ins on public.%I as restrictive for insert to authenticated
                      with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_maj on public.%I', t);
    execute format('create policy garde_suspension_maj on public.%I as restrictive for update to authenticated
                      using ((select public.compte_non_suspendu())) with check ((select public.compte_non_suspendu()))', t);
    execute format('drop policy if exists garde_suspension_sup on public.%I', t);
    execute format('create policy garde_suspension_sup on public.%I as restrictive for delete to authenticated
                      using ((select public.compte_non_suspendu()))', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
  revoke all on public.assistant_conversations from anon;
  revoke all on public.assistant_journal from anon;
end $$;

-- Contrôle : 8 tables × 4 politiques = 32 ; aucun droit anon.
-- select count(*) from pg_policies where schemaname='public' and policyname in ('garde_session','garde_suspension_ins','garde_suspension_maj','garde_suspension_sup')
--   and tablename in ('equipe_membres','vehicules','chantiers','chantier_equipe','chantier_taches','chantier_materiaux','crm_notes','crm_journal');
