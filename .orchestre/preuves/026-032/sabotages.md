# 026-032 — les trois juges : verts sur le témoin, rouges sur chaque sabotage

Écrit par `node .orchestre/preuves/026-032/eprouver.mjs` le 2026-09-27T16:00:46.196Z. Racine de travail : `.orchestre/travail/026-032/temoin` (copie de `supabase/`, migrations témoins de `.orchestre/preuves/026-032/temoins/`, jumeaux fabriqués par `sql-nu.mjs`, compte rendu d'essai synthétique propre à cette racine). Chaque ligne : un passage réel du juge.

## Le témoin : chaque juge vert

| Juge | Code | Bilan | Critères |
|---|---|---|---|
| `scripts/prospection-sql-qa.mjs` | 0 | PASS | ✅ PASS PG-1, PG-2, PG-3, PG-4, PG-5, PG-6, PG-7 ; SAUTE PG-8 (--reel) |
| `scripts/argent-sql-qa.mjs` | 0 | PASS | ✅ PASS FA-1, FA-2, FA-3, FA-4, FA-5, FA-6, FA-7 ; SAUTE FA-8 (--reel) |
| `scripts/horloge-sql-qa.mjs` | 0 | PASS | ✅ PASS HS-1, HS-2, HS-3, HS-4, HS-5, HS-6, HS-7, HS-8, HS-9 ; SAUTE HS-10 (--reel) |

## Les sabotages : chaque critère visé rouge

| Juge | Sabotage | Critère visé | Code | Ligne du critère | Verdict |
|---|---|---|---|---|---|
| prospection | une table créée | PG-1 | 1 | FAIL PG-1 — instruction hors de la liste du point 1 (fonctions, déclencheurs, droits, commentaires) : « create table if not exists ops.essai_sabotage(id int) » ; « create | ✅ vu |
| prospection | une colonne ajoutée | PG-1 | 1 | FAIL PG-1 — instruction hors de la liste du point 1 (fonctions, déclencheurs, droits, commentaires) : « alter table ops.envois add column sabotage text » ; « alter table  | ✅ vu |
| prospection | une fonction qui retire une opposition | PG-2 | 1 | FAIL PG-2 — ops.opposition_retirer hors contrat de 0099 : le contrat est la seule porte ; ops.opposition_retirer : une fonction qui retire une opposition est interdite | ✅ vu |
| prospection | annuler_sur_opposition efface dans ops.opposition | PG-2 | 1 | FAIL PG-2 — ops.annuler_sur_opposition efface dans ops.opposition : aucune fonction ne retire une opposition | ✅ vu |
| prospection | annuler_sur_opposition écrit dans ops.interrupteurs | PG-2 | 1 | FAIL PG-2 — ops.annuler_sur_opposition écrit dans ops.interrupteurs : 0099 n'ouvre ni ne ferme rien | ✅ vu |
| prospection | ops_garde_etat sans la clé du_jour | PG-2 | 1 | FAIL PG-2 — ops_garde_etat ne rend pas la clé « du_jour » | ✅ vu |
| prospection | ops_garde_etat lit ops.prospects | PG-2 | 1 | FAIL PG-2 — ops_garde_etat lit ops.prospects ou un destinataire : aucune donnée de prospect | ✅ vu |
| prospection | ops_garde_etat sans security definer | PG-3 | 1 | FAIL PG-3 — ops_garde_etat n'est pas security definer | ✅ vu |
| prospection | garde_envois encore exécutable par service_role | PG-3 | 1 | FAIL PG-3 — ops.garde_envois : revoke … from public, anon, authenticated, service_role absent ou incomplet (exécutable par aucun des quatre rôles) | ✅ vu |
| prospection | ops_garde_etat accordée à anon | PG-3 | 1 | FAIL PG-3 — grant à anon : « grant execute on function public.ops_garde_etat() to service_role, anon » | ✅ vu |
| prospection | le code ops:72_heures jamais levé | PG-4 | 1 | FAIL PG-4 — code(s) jamais levé(s) par un raise : ops:72_heures | ✅ vu |
| prospection | le code ops:quota_reponses jamais levé | PG-4 | 1 | FAIL PG-4 — code(s) jamais levé(s) par un raise : ops:quota_reponses | ✅ vu |
| prospection | la branche envoye refuse | PG-4 | 1 | FAIL PG-4 — la branche « envoye » lève une exception : le passage à envoye n'est jamais refusé | ✅ vu |
| prospection | le comptage des plafonds avant le verrou | PG-4 | 1 | FAIL PG-4 — verrou « pg_advisory_xact_lock(hashtext('ops:quota:'\|\|new.canal)…) » absent ; verrou « pg_advisory_xact_lock(hashtext('ops:quota:'\|\|new.canal)…) » absent | ✅ vu |
| prospection | le jour à l'heure UTC | PG-4 | 1 | FAIL PG-4 — le jour ne se calcule pas « at time zone 'Europe/Paris' » | ✅ vu |
| prospection | l'opposition expirée compte encore | PG-4 | 1 | FAIL PG-4 — l'opposition lue n'est pas l'opposition active (expire_le is null or expire_le > now()) | ✅ vu |
| prospection | preuve_demande lue par new.preuve_demande | PG-4 | 1 | FAIL PG-4 — preuve_demande n'est pas lue par to_jsonb(new) (0099 doit marcher avant 0106) | ✅ vu |
| prospection | le canal 'email' nommé | PG-4 | 1 | FAIL PG-4 — le canal 'email' est nommé : il n'existe plus (voie gratuite du 25/09) | ✅ vu |
| prospection | une règle par boîte boite_ | PG-4 | 1 | FAIL PG-4 — boite_ dans la migration : les règles par boîte sont retirées (voie gratuite du 25/09) | ✅ vu |
| prospection | le déclencheur ne garde plus que les insertions | PG-4 | 1 | FAIL PG-4 — déclencheur de ops.garde_envois absent ou non conforme (contrat : before insert or update of statut on ops.envois for each row) | ✅ vu |
| prospection | create trigger sans drop trigger if exists avant | PG-4 | 1 | FAIL PG-4 — create trigger garde_envois sans « drop trigger if exists garde_envois » avant lui : la migration n'est pas rejouable | ✅ vu |
| prospection | le contrôle ne lit plus tgenabled | PG-5 | 1 | FAIL PG-5 — supabase/controles/0099_ops_garde_envois.sql ne couvre pas : les deux déclencheurs existent et sont actifs (manque tgenabled) | ✅ vu |
| prospection | le contrôle écrit | PG-5 | 1 | FAIL PG-5 — supabase/controles/0099_ops_garde_envois.sql : instruction qui n'est pas une lecture : « insert into ops.interrupteurs(nom) values('pause_generale') » ; supab | ✅ vu |
| prospection | la migration change après ses jumeaux | PG-5 | 1 | FAIL PG-5 — sql-nu.mjs --verifier supabase/migrations/0099_ops_garde_envois.sql supabase/migrations/_A_COLLER_sql_editor_0099.sql en code 1 : ❌ C:\Users\benja\Documents\p | ✅ vu |
| prospection | compte rendu d'essai de 0 octet | PG-6 | 1 | FAIL PG-6 — .orchestre/preuves/026-034/essai-a-sec.txt : essai-a-sec.txt : 0 octet — une preuve vide est un refus | ✅ vu |
| prospection | compte rendu d'une autre empreinte | PG-6 | 1 | FAIL PG-6 — .orchestre/preuves/026-034/essai-a-sec.txt : empreinte b7c5208787cb… ≠ celle du jumeau courant b7c5208787cb… : l'essai a porté sur un autre texte | ✅ vu |
| prospection | une clé du scénario à false | PG-6 | 1 | FAIL PG-6 — .orchestre/preuves/026-034/essai-a-sec.txt : clé(s) qui ne valent pas true : email_51e_quota=false | ✅ vu |
| prospection | sans la ligne APRES | PG-6 | 1 | FAIL PG-6 — .orchestre/preuves/026-034/essai-a-sec.txt : ligne « APRES rien_ne_reste=true » absente : rien ne prouve que l'essai n'a rien laissé | ✅ vu |
| prospection | une migration existante modifiée | PG-7 | 1 | FAIL PG-7 — 1 fichier(s) existant(s) changé(s) (copie comparée aux blobs de HEAD) : M supabase/migrations/0096_ops_socle.sql | ✅ vu |
| argent | usage de pgmq accordé à anon | FA-1 | 1 | FAIL FA-1 — instruction hors de la liste du point 1 : « grant usage on schema pgmq to anon » ; un grant à anon ou authenticated | ✅ vu |
| argent | le schéma pgmq_public | FA-1 | 1 | FAIL FA-1 — instruction hors de la liste du point 1 : « create schema if not exists pgmq_public » ; pgmq_public nommé : « Expose Queues via PostgREST » ne s'active pas, o | ✅ vu |
| argent | la file créée sans garde | FA-1 | 1 | FAIL FA-1 — « do $fn$ begin perform pgmq.create('argent'); end $fn$ » : un seul bloc permis, la création gardée de la file argent (pgmq.create('argent') si pgmq.list_queu | ✅ vu |
| argent | l'ordre : le schéma pgmq fermé après les fonctions | FA-1 | 1 | FAIL FA-1 — ordre du point 1 : revoke all on schema pgmq vient après les fonctions | ✅ vu |
| argent | un type de plus dans la liste | FA-2 | 1 | FAIL FA-2 — ops.argent_messages : contrainte du contrat introuvable — type in ('commande_payee','essai_e2e') | ✅ vu |
| argent | charge sans défaut | FA-2 | 1 | FAIL FA-2 — ops.argent_messages.charge : défaut « aucun », contrat « '{}' » | ✅ vu |
| argent | ops_argent_lire sans mis_le | FA-2 | 1 | FAIL FA-2 — public.ops_argent_lire rend « table(msg_id bigint, lectures integer, type text, cle text, charge jsonb) », contrat « table(msg_id bigint, lectures integer, ty | ✅ vu |
| argent | un paramètre renommé | FA-2 | 1 | FAIL FA-2 — public.ops_argent_fait : paramètres (p_msg_id bigint, cle text, p_resultat jsonb), contrat (p_msg_id bigint, p_cle text, p_resultat jsonb) | ✅ vu |
| argent | search_path sans pgmq | FA-3 | 1 | FAIL FA-3 — public.ops_argent_envoyer : search_path ops, public, pg_temp, attendu « ops, pgmq, public, pg_temp » (pgmq dedans, pg_temp en dernier) | ✅ vu |
| argent | table sans RLS | FA-3 | 1 | FAIL FA-3 — ops.argent_messages sans « enable row level security » | ✅ vu |
| argent | fonction accordée à authenticated | FA-3 | 1 | FAIL FA-3 — grant à authenticated : « grant execute on function public.ops_argent_etat() to service_role, authenticat… » | ✅ vu |
| argent | send même quand la clé est connue | FA-4 | 1 | FAIL FA-4 — ops_argent_envoyer : pgmq.send('argent', …) n'est pas appelé seulement quand l'insertion a eu lieu (on conflict (cle) do nothing, puis found ou row_count, pui | ✅ vu |
| argent | p_vt_s sans borne haute | FA-4 | 1 | FAIL FA-4 — ops_argent_lire : p_vt_s hors 5-3600 ne lève pas ops:vt | ✅ vu |
| argent | archivé seulement après 5 lectures | FA-4 | 1 | FAIL FA-4 — ops_argent_lire : sans pgmq.read('argent'), sans l'archivage au-delà de 3 lectures (read_ct > 3) | ✅ vu |
| argent | le message supprimé avant la marque | FA-4 | 1 | FAIL FA-4 — ops_argent_fait : la marque (fait_le) ne vient pas avant pgmq.delete | ✅ vu |
| argent | le contrôle ne lit plus l'usage de pgmq | FA-5 | 1 | FAIL FA-5 — supabase/controles/0100_ops_file_argent.sql ne couvre pas : has_schema_privilege('anon', 'pgmq', 'usage') est faux (manque has_schema_privilege('anon','pgmq', | ✅ vu |
| argent | compte rendu d'essai de 0 octet | FA-6 | 1 | FAIL FA-6 — .orchestre/preuves/026-036/essai-a-sec.txt : essai-a-sec.txt : 0 octet — une preuve vide est un refus | ✅ vu |
| argent | compte rendu d'une autre empreinte | FA-6 | 1 | FAIL FA-6 — .orchestre/preuves/026-036/essai-a-sec.txt : empreinte e07c5a8bc150… ≠ celle du jumeau courant e07c5a8bc150… : l'essai a porté sur un autre texte | ✅ vu |
| argent | 0088_site_commande.sql modifiée | FA-7 | 1 | FAIL FA-7 — 1 fichier(s) existant(s) changé(s) (copie comparée aux blobs de HEAD) : M supabase/migrations/0088_site_commande.sql ; supabase/migrations/0088_site_commande. | ✅ vu |
| horloge | un jeton en clair dans un commentaire | HS-1 | 1 | FAIL HS-1 — supabase/migrations/0101_ops_horloge.sql porte une chaîne qui ressemble à un secret : Ab3d… (34 signes) ; supabase/migrations/_A_COLLER_sql_editor_0101.sql po | ✅ vu |
| horloge | vault.create_secret | HS-1 | 1 | FAIL HS-1 — instruction hors de la liste du point 1 : « select vault.create_secret('x', 'cron_secret') » ; vault.create_secret dans la migration : le secret se pose par l | ✅ vu |
| horloge | timeout_milliseconds absent | HS-2 | 1 | FAIL HS-2 — timeout_milliseconds n'est pas explicite (pg_net attend 2 s par défaut) | ✅ vu |
| horloge | timeout de 2 000 ms | HS-2 | 1 | FAIL HS-2 — timeout_milliseconds 2000 hors de 10 000 à 55 000 | ✅ vu |
| horloge | une autre URL | HS-2 | 1 | FAIL HS-2 — l'URL ne vaut pas exactement https://prestiapp.fr/api/agents/tic ; une autre URL est appelée : https://prestiapp.fr/api/agents/tic2 | ✅ vu |
| horloge | Authorization en clair | HS-2 | 1 | FAIL HS-2 — l'en-tête Authorization n'est pas construit par concaténation de 'Bearer ' | ✅ vu |
| horloge | sans secret, pas de return null | HS-2 | 1 | FAIL HS-2 — l'absence du secret ne mène pas à « return null » avant tout appel HTTP | ✅ vu |
| horloge | les baux après la lecture du secret | HS-2 | 1 | FAIL HS-2 — ops_baux_expirer() vient après la lecture du secret | ✅ vu |
| horloge | ops_horloge_minute accordée à service_role | HS-3 | 1 | FAIL HS-3 — ops_horloge_minute : un grant, alors qu'elle n'est à personne | ✅ vu |
| horloge | ops_horloge_etat sans security definer | HS-3 | 1 | FAIL HS-3 — public.ops_horloge_etat n'est pas security definer | ✅ vu |
| horloge | ops_horloge_etat rend le secret | HS-4 | 1 | FAIL HS-4 — decrypted_secret hors d'un exists (…) : « -tic'), 'secret', (select decrypted_secret from vault.decrypted_se » — la valeur du secret pourrait entrer dans le j | ✅ vu |
| horloge | le tic toutes les 5 minutes | HS-5 | 1 | FAIL HS-5 — presti-agents-tic : planning « */5 * * * * », contrat « * * * * * » | ✅ vu |
| horloge | le ménage sous un autre nom | HS-5 | 1 | FAIL HS-5 — cron.schedule('presti-cron-menage', …) absent | ✅ vu |
| horloge | le contrôle lit decrypted_secret hors exists | HS-6 | 1 | FAIL HS-6 — supabase/controles/0101_ops_horloge.sql lit decrypted_secret hors d'un exists (…) : « all select 'valeur', (select decrypted_secret from vault.decrypted_se » | ✅ vu |
| horloge | le contrôle oublie presti-cron-menage | HS-6 | 1 | FAIL HS-6 — supabase/controles/0101_ops_horloge.sql ne couvre pas : les deux tâches existent, actives, presti-agents-tic chaque minute (manque 'presti-cron-menage') | ✅ vu |
| horloge | la notice parle de SQL Editor | HS-7 | 1 | FAIL HS-7 — docs/agents/horloge.md contient « SQL Editor » : Benj n'exécute aucun SQL | ✅ vu |
| horloge | la notice sans « deux endroits » | HS-7 | 1 | FAIL HS-7 — docs/agents/horloge.md ne dit pas le rappel « changer aux deux endroits » | ✅ vu |
| horloge | la notice donne vault.create_secret | HS-7 | 1 | FAIL HS-7 — docs/agents/horloge.md contient vault.create_secret : Benj n'exécute aucun SQL | ✅ vu |
| horloge | compte rendu d'essai de 0 octet | HS-8 | 1 | FAIL HS-8 — .orchestre/preuves/026-086/essai-a-sec.txt : essai-a-sec.txt : 0 octet — une preuve vide est un refus | ✅ vu |
| horloge | compte rendu d'une autre empreinte | HS-8 | 1 | FAIL HS-8 — .orchestre/preuves/026-086/essai-a-sec.txt : empreinte 15dc949b5c7d… ≠ celle du jumeau courant 15dc949b5c7d… : l'essai a porté sur un autre texte | ✅ vu |
| horloge | un contrôle existant modifié | HS-9 | 1 | FAIL HS-9 — 1 fichier(s) existant(s) changé(s) (copie comparée aux blobs de HEAD) : M supabase/controles/0096_ops_socle.sql | ✅ vu |

## Les variantes bénignes : le juge reste vert

| Juge | Variante | Code | Bilan | Verdict |
|---|---|---|---|---|
| prospection | un commentaire qui nomme boite_ dans le corps | 0 | PASS | ✅ vert |
| prospection | l'ordre « update of statut or insert » | 0 | PASS | ✅ vert |
| prospection | create or replace trigger, sans drop | 0 | PASS | ✅ vert |
| argent | if not found remplacé par get diagnostics | 0 | PASS | ✅ vert |
| horloge | timeout de 45 000 ms | 0 | PASS | ✅ vert |

## --sans-essai : le critère d'essai sauté, les autres jugés

| Juge | Compte rendu | Code | Critère d'essai | Bilan | Verdict |
|---|---|---|---|---|---|
| prospection | 0 octet | 0 | SAUTE PG-6 | PASS | ✅ |
| prospection | --sans-essai --temoin (appel invalide) | 2 | — | — | ✅ refusé (code 2) |
| argent | 0 octet | 0 | SAUTE FA-6 | PASS | ✅ |
| argent | --sans-essai --temoin (appel invalide) | 2 | — | — | ✅ refusé (code 2) |
| horloge | 0 octet | 0 | SAUTE HS-8 | PASS | ✅ |
| horloge | --sans-essai --temoin (appel invalide) | 2 | — | — | ✅ refusé (code 2) |

Bilan : 69 sabotages (prospection : 7 critères sabotés ; argent : 7 critères sabotés ; horloge : 9 critères sabotés), 5 variantes bénignes, 3 témoins. **tout est comme attendu**.
