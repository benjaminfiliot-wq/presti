# 026-251 — mise en service des quatre postes, 05/10/2026 (Claude Code, agent Sonnet)

Autorité : l'ordre du chef du 05/10 (« applique 0115 par apply_migration seulement avec le protocole complet ») et D-0410-15 (le « oui » de Benj au compte gardien).
Aucun autre « oui » de Benj n'est couvert : les jetons, le minuteur, la clé Stripe et la première passe du Contrôleur ne sont PAS faits.

## Fait
- **Migration 0115_postes_agents** (graines `sav`, `qualite_sites`, `vigile` sans jeton, sans pause, sans capacité ; `public.vigile_conseiller()` ;
  `public.vigile_agents()` ; `pilotage_activite_salles` remplacée à 28 noms) : écrite, jumeaux (`_A_COLLER_sql_editor_0115.sql`, `_NU.sql`, vérifiés par
  `migrations-jumelles-e2e`), contrôle `supabase/controles/0115_postes_agents.sql`.
- **Essai à sec** (DO + EXECUTE du jumeau nu + raise exception, empreinte 591c80af…) : `essai-a-sec.txt`, 15 assertions vraies, aucune trace.
- **Application** par le connecteur (`apply_migration`, nom `0115_postes_agents`, corps exact du fichier) : `{"success":true}`.
- **Contrôle** (le fichier de contrôle, par `execute_sql`) : six lignes « oui » (graines sans jeton/pause/capacité ; trois fonctions ; security definer + search_path +
  service_role seul ; conseiller à 6 contrôles ; une ligne par agent ; vingt salles). Valeurs du conseiller relevées : function_search_path_mutable=10,
  policy_exists_rls_disabled=0, rls_disabled_in_public=0, rls_enabled_no_policy=31, security_definer_view=0, unindexed_foreign_keys=33 (des comptes, aucun nom).
- **Coffre et groupes** : `PRESTI_JETON_SAV`, `PRESTI_JETON_QUALITE`, `PRESTI_JETON_VIGILE` dans `coffre-regles.mjs` et `presti-coffre.sh` (le .sh ne portait pas
  non plus `PRESTI_JETON_STUDIO`, présent dans `coffre-regles.mjs` : ajouté, parité) ; groupes `sav`, `qualite`, `vigile` dans `usine-agents.mjs`.
- **Équipage** : `lib/pilotage/equipage.ts` à 28 noms (sav -> presti, qualite_sites -> usine, vigile -> securite). `docs/agents/usine.md` : les trois noms et les lignes de services.

## Pas fait (gestes) et constats
- Le `maj` de l'usine (le nouveau code du coffre y est inconnu tant que `usine-agents.mjs maj` n'a pas tourné) ; jetons de `vigile`, `qualite_sites`, `tresorier` ;
  minuteur `presti-vigile` ; clé Stripe restreinte ; première passe du Contrôleur : voir `geste-de-benj.md`.
- **Constat grave pour le Trésorier** : la fiche dit `tresorier` « semé par 0113 ». Faux en production : 0113 ne sème rien (son en-tête le dit) et `ops.agents` n'a
  ni `tresorier`, ni `garde`, ni `studio`, ni `contenu`, ni `douleurs`. Le jeton du Trésorier (et le Studio de 026-202) ne peuvent donc pas être posés avant une graine ;
  elle n'est pas dans 0115 (la fiche limite 0115 à trois graines et le juge SP-1/SP-2 les fige) : à décider par le chef (0125).
