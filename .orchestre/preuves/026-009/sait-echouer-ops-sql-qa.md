# 026-009 — ops-sql-qa sait échouer : une entrée cassée par critère

Écrit le 2026-09-26T02:33:19.481Z par un script hors dépôt, sur l'échantillon `.orchestre/travail/026-009-echantillon/` (supabase/ de HEAD, plus une 0096, une 0097 et une 0098 écrites par 026-009 pour éprouver le juge, et des comptes rendus d'essai fabriqués au format d'execute_sql). L'échantillon intact passe ; chaque cas remplace un texte exact (`avant` → `apres`, présent une seule fois), lance le juge, exige le code 1 et une ligne `FAIL <critère>`, puis restaure le fichier (empreinte vérifiée). Les critères --reel (OS-10, OI-8, OT-8) ne se cassent pas ici : aucun accès à la base dans cette fiche.

- témoin intact 0096 : code 0 — « ops-sql-qa : PASS »
- témoin intact 0097 : code 0 — « ops-sql-qa : PASS »
- témoin intact 0098 : code 0 — « ops-sql-qa : PASS »

| Critère | Fichier cassé | Juge | Ligne en échec (extrait réel) | Restauré |
|---|---|---|---|---|
| OS-1 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-1 — « create policy » interdit dans 0096 ; instruction hors de la liste permise : « create policy tout_voir on ops.taches for select using(true) » | oui |
| OS-2 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-2 — create table ops.couts sans « if not exists » | oui |
| OS-3 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-3 — ops.taches : contrainte du contrat introuvable — profondeur between 0 and 3 | oui |
| OS-3 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-3 — ops.envois : contrainte du contrat introuvable — canal in ('instagram','facebook','linkedin','formulaire_site','email_sollicite','reponse_privee','messagerie'… | oui |
| OS-3 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-3 — ops.taches : contrainte du contrat introuvable — tentatives between 0 and 3 | oui |
| OS-3 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-3 — ops.envois : contrainte du contrat introuvable — jsonb_typeof(verdicts) = 'object' and pg_column_size(verdicts) <= 4096 | oui |
| OS-4 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-4 — enable row level security absent pour : couts | oui |
| OS-5 | `supabase/migrations/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-5 — quota (email_sollicite, *, 50, 0) : 0 graine(s), une attendue ; quota hors contrat : (email_sollicite, *, 60, 0) | oui |
| OS-6 | `supabase/migrations/_A_COLLER_sql_editor_0096_NU.sql` | rouge (code 1) | FAIL OS-6 — supabase/migrations/_A_COLLER_sql_editor_0096_NU.sql ne sort pas de sql-nu.mjs : diverge à la ligne 157 (attendu « plafond_nouveaux_jour int not null default 0 check (plafond_nouveaux_jour betwe… », trouvé « plafond_nouveaux_jour int not null defau | oui |
| OS-7 | `supabase/controles/0096_ops_socle.sql` | rouge (code 1) | FAIL OS-7 — supabase/controles/0096_ops_socle.sql ne couvre pas : aucune politique pour ops (attendu : pg_policies) | oui |
| OS-8 | `.orchestre/preuves/026-010/essai-a-sec.txt` | rouge (code 1) | FAIL OS-8 — .orchestre/preuves/026-010/essai-a-sec.txt : APRES rien_ne_reste=false : l'essai a laissé une trace | oui |
| OS-9 | `supabase/migrations/0095_verrous_maj_slug.sql` | rouge (code 1) | FAIL OS-9 — 1 fichier(s) existant(s) changé(s) (copie comparée aux blobs de HEAD) : M supabase/migrations/0095_verrous_maj_slug.sql | oui |
| OI-1 | `supabase/migrations/0097_ops_identite.sql` | rouge (code 1) | FAIL OI-1 — instruction hors liste (create or replace function public.ops_*, revoke, grant execute … to service_role, comment on function) : « create table if not exists public.ops_intrus(id int) » ; le fichier crée ou modifie autre chose que des fonctions | oui |
| OI-2 | `supabase/migrations/0097_ops_identite.sql` | rouge (code 1) | FAIL OI-2 — public.ops_agent_par_jeton : paramètres (p_jeton text), contrat (p_hash text) | oui |
| OI-3 | `supabase/migrations/0097_ops_identite.sql` | rouge (code 1) | FAIL OI-3 — grant à anon sur ops_battement | oui |
| OI-3 | `supabase/migrations/0097_ops_identite.sql` | rouge (code 1) | FAIL OI-3 — public.ops_interrupteur : search_path pg_temp, ops, public, attendu « ops, public, pg_temp » (pg_temp en dernier) | oui |
| OI-4 | `supabase/migrations/0097_ops_identite.sql` | rouge (code 1) | FAIL OI-4 — ops_evenements_lire : ne filtre pas agent <> p_agent ou ne borne pas sa limite à 200 | oui |
| OI-4 | `supabase/migrations/0097_ops_identite.sql` | rouge (code 1) | FAIL OI-4 — ops_agent_poser_jeton : p_hash (ou une variable qui en dérive) alimente l'événement : le hash ne doit jamais entrer dans resume ni objet | oui |
| OI-5 | `supabase/controles/0097_ops_identite.sql` | rouge (code 1) | FAIL OI-5 — ce qui suit la marque dans supabase/migrations/_A_COLLER_sql_editor_0097_NU.sql n'est pas exactement supabase/controles/0097_ops_identite.sql ; supabase/migrations/_A_COLLER_sql_editor_0097_NU.sql ne sort pas de sql-nu.mjs : diverge à la ligne 170  | oui |
| OI-6 | `.orchestre/preuves/026-011/essai-a-sec.txt` | rouge (code 1) | FAIL OI-6 — .orchestre/preuves/026-011/essai-a-sec.txt : clé(s) qui ne valent pas true : lire_rend_les_autres=false | oui |
| OI-7 | `supabase/migrations/0092_audience_flux_nu.sql` | rouge (code 1) | FAIL OI-7 — 1 fichier(s) existant(s) changé(s) (copie comparée aux blobs de HEAD) : M supabase/migrations/0092_audience_flux_nu.sql | oui |
| OT-1 | `supabase/migrations/0098_ops_taches.sql` | rouge (code 1) | FAIL OT-1 — instruction hors liste (create or replace function public.ops_*, revoke, grant execute … to service_role, comment on function) : « alter table ops.taches add column if not exists intrus text » ; le fichier crée ou modifie autre chose que des foncti | oui |
| OT-2 | `supabase/migrations/0098_ops_taches.sql` | rouge (code 1) | FAIL OT-2 — public.ops_tache_rendre rend « boolean », contrat « text » | oui |
| OT-3 | `supabase/migrations/0098_ops_taches.sql` | rouge (code 1) | FAIL OT-3 — public.ops_etat n'est pas security definer | oui |
| OT-4 | `supabase/migrations/0098_ops_taches.sql` | rouge (code 1) | FAIL OT-4 — ops_tache_prendre : sans « for update skip locked », « limit 1 » ou l'intervalle de « 30 minutes » | oui |
| OT-4 | `supabase/migrations/0098_ops_taches.sql` | rouge (code 1) | FAIL OT-4 — ops_tache_creer : le jour du quota ne se calcule pas « at time zone 'Europe/Paris' » | oui |
| OT-5 | `supabase/migrations/_A_COLLER_sql_editor_0098.sql` | rouge (code 1) | FAIL OT-5 — sql-nu.mjs --verifier supabase/migrations/0098_ops_taches.sql supabase/migrations/_A_COLLER_sql_editor_0098.sql en code 1 : ❌ C:\Users\benja\Documents\presti\.orchestre\travail\026-009-echantillon\supabase\migrations\_A_COLLER_sql_editor_0098.sql d | oui |
| OT-6 | `.orchestre/preuves/026-013/essai-a-sec.txt` | rouge (code 1) | FAIL OT-6 — .orchestre/preuves/026-013/essai-a-sec.txt : APRES rien_ne_reste=faux : l'essai a laissé une trace | oui |
| OT-7 | `supabase/controles/0094_insertion_figee.sql` | rouge (code 1) | FAIL OT-7 — 1 fichier(s) existant(s) changé(s) (copie comparée aux blobs de HEAD) : M supabase/controles/0094_insertion_figee.sql | oui |

Verdict : **PASS** (29 cas).
