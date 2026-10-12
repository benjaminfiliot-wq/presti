-- 0152 · [APPLIQUÉE en production le 12/10/2026 : essai à sec, puis 0 politique « _own », 8 lectures, 0 droit d’écriture authenticated, service intact] CRM (0141) : l'artisan connecté ne peut plus ÉCRIRE directement dans les 8 tables par l'API de la base.
-- Audit d'attaque du 12/10/2026 (M2) : les politiques `for all to authenticated` de 0141 étaient inutiles (l'écran du
-- CRM ne touche jamais la base directement, tout passe par /api/crm/* avec la clé de service, après drapeau, offre et
-- validation) et dangereuses : sans drapeau ni offre, un compte pouvait repasser une réservation « sortie » en
-- « réservée » puis la sortir de nouveau (stock décompté deux fois), ou remplir le journal sans limite.
-- Reste : la LECTURE de ses propres lignes (même règle), la garde de session (0151) ; l'écriture passe par les routes.
do $$
declare t text;
begin
  foreach t in array array['equipe_membres', 'vehicules', 'chantiers', 'chantier_equipe', 'chantier_taches',
                           'chantier_materiaux', 'crm_notes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = artisan_id)', t || '_lecture', t);
    execute format('revoke insert, update, delete on public.%I from authenticated', t);
  end loop;
  -- crm_journal n'avait déjà qu'une politique de lecture (crm_journal_lecture) ; on retire aussi le droit d'écrire.
  revoke insert, update, delete on public.crm_journal from authenticated;
end $$;
