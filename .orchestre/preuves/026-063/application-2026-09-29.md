# Application de 0111_acquisition_envoi.sql (fiche 026-063) — 2026-09-29

Projet Supabase Presti (gorcdvmueakcncsmrouo), par l'outil MCP `apply_migration` (jamais de SQL collé à la main).
Appliquée par Claude Code (le chef), après : patch de Codex (`.orchestre/travail/usine/026-063/resultat.patch`, tour 4)
appliqué au dépôt, contre-vérification (`contre-verification-29-09.md` : un défaut réel, le second verrou d'accord,
retiré), jumeaux régénérés, essai à sec rejoué sur la migration corrigée (`essai-a-sec.txt`, empreinte 00d33f981a2f…,
13/13, rien ne reste).

## 1. Lecture entière du fichier
`supabase/migrations/0111_acquisition_envoi.sql` lu en entier (406 lignes) avant application.

## 2. apply_migration
`apply_migration` nommée `0111_acquisition_envoi`, `query` = contenu exact du fichier. Résultat : `{"success":true}`.
Enregistrée dans `supabase_migrations.schema_migrations` (vérifié par `execute_sql`).

## 3. md5(prosrc) des fonctions
`node md5-migration.mjs supabase/migrations/0111_acquisition_envoi.sql '<json base>'` →
**`21 corps identiques, 0 différents, sur 21 fonction(s) du fichier`** (17 `public.acq_*`, `ops.maintenant`,
`ops.garde_modeles`, `ops.suivre_technologies`, `ops.acq_commande_du_prospect`).

## 4. Contrôle supabase/controles/0111_acquisition_envoi.sql
Exécuté tel quel (execute_sql, lecture seule) : **37 lignes, 37 « oui »** — 6 tables (RLS, aucune politique, ni anon ni
authenticated), 17 fonctions exposées au seul service_role en security definer, 4 fonctions privées exécutables par
aucun rôle, 2 déclencheurs actifs sur `ops.envois`, 5 graines de paliers, `etat:P0`, absence de `ops.boites`, absence du
second verrou d'accord (`ops.accords_envoi` et `ops.envois.attend_accord_benj` absents, `ops.accords_benj` présent).

## 5. Juge de la fiche en --reel
`node --import ./scripts/ts-loader.mjs scripts/disjoncteurs-qa.mjs --reel --confirmer-reel` :
```
disjoncteurs-qa --reel — état réel, signal d'essai, ménage
✅ DJ-REEL acq_etat_envoi() : P0, envoi_froid fermé, aucune technologie ; un signal d'essai écrit et nettoyé ; anon refusé
disjoncteurs-qa --reel : PASS
```

## 6. Zéro trace — et un défaut du juge
Le « ménage » de `--reel` **n'a rien nettoyé** tout en se déclarant réussi : il fait un `DELETE` REST sur
`/rest/v1/ops.technologies`, que PostgREST n'expose pas (et service_role n'a aucun droit sur la table), et son `catch`
avale l'échec. Constaté en base juste après : `ops.technologies` = 1 (`essai_026_reel`), `ops.signaux` = 1. Supprimés par
Claude Code (execute_sql, filtrés sur `technologie = 'essai_026_reel'`, 1 + 1 lignes). Puis : `ops.technologies` 0,
`ops.signaux` 0, `ops.modeles_suspendus` 0, `ops.jauges` 0, `ops.envois` 0, aucun événement d'essai ; `etat_envoi` P0
sans coupure ni notice ; `quotas_canaux` identiques à l'avant (formulaire_site 0/0, email_sollicite 50/0,
reponse_privee 50/0, messagerie 100/0, essai_e2e 4/4) ; `envoi_froid=false`, `pause_generale=false`.
Défaut du juge (`scripts/disjoncteurs-qa.mjs`, fiche 026-062, hors périmètre de 026-063) signalé au chef : le ménage
doit passer par une fonction ou par le SQL, et échouer en code 1 si la ligne témoin reste.

## Ce que Benj doit savoir
Un essai à sec a tourné sur la production (transaction annulée, rien laissé). Rien à faire de sa part pour la
migration ; ouvrir `envoi_froid` reste son geste, depuis la station, au plus tôt le 12/10.
