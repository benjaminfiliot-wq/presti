# 026-088 — application de 0112 (fonctions station_*), 2026-09-29 vers 19:37 (heure locale)

Projet Supabase gorcdvmueakcncsmrouo, `apply_migration` name `0112_pilotage_station`, requête = contenu exact de `supabase/migrations/0112_pilotage_station.sql`. Réponse : `{"success":true}`.

## Avant l'application
- Essai à sec (2e passage, scénario du juge corrigé) : 22 clés du scénario + 7 du pont à true, `APRES rien_ne_reste=true` → `.orchestre/preuves/026-088/essai-a-sec.txt`. 1er passage : 4 clés fausses, toutes défauts du scénario (colonne `etat`, lecture de l'effet d'une fonction dans la même expression), aucun défaut de la migration.
- `pilotage-sql-qa.mjs --migration=station` : PASS (SS-1 à SS-15, dont SS-10, SS-11 et SS-15).

## Empreinte (md5 du prosrc lu en base, comparé par md5-migration.mjs)
14 corps identiques, 0 différents, sur 14 fonctions du fichier.

## Contrôle supabase/controles/0112_pilotage_station.sql (4 requêtes, toutes oui/true)
- 14 fonctions : prosecdef true, search_path = ops, public, pg_temp, anon_refuse true, authenticated_refuse true, service_role_autorise true ; stable true pour les 4 lectures seulement (station_reunion_chiffres, station_reunion_lire, station_objectif_actif, station_experience_etat), false pour les 10 écritures.
- ops.reunions et ops.experiences : row_level_security_active true, 0 politique, service_role_sans_lecture true.
- cron.job : station-reunions-echues (`*/5 * * * *`, active) et station-experiences-echues (`17 3 * * *`, active).
- ops.agents pont_telegram : capacites {notifier,pause,consigne}, types_crees {}, tables_ecrites {evenements}, plafond_euros_jour 0.00.

## pilotage-sql-qa.mjs --migration=station --reel
PASS, SS-1 à SS-15 tous verts. SS-12 : lectures par la clé de service, clé anonyme refusée partout, rien d'écrit de durable. Un premier passage avait rendu SS-12 en échec (404 sur 9 fonctions) : défaut du juge, la clé anonyme était appelée avec un corps vide, et PostgREST répond 404 (fonction introuvable) avant d'examiner le droit d'exécution. Corrigé dans le juge (vrais noms de paramètres, valeurs refusées d'avance), controleReel du lot b relu : OK.
