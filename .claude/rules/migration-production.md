# Migration de la production — une par une, réversible

Décision de Benj du 01/11/2026 (addendum §1 et §7).
Pourquoi : vault `C:/Users/benja/Documents/SaaS`, note posée le 01/11/2026 (phase 1.4) :
`10 Presti/04 Décisions/ADR-001 — Toutes les automatisations dans n8n.md`.

## Presti est en production, pas en prototype
- 53 pages, 224 routes, 168 migrations, 2 crons Vercel, une coque Capacitor (compté le 01/11).
- Automatisations déjà en code : pg_cron `acq-*`, tic de la minute, crons Vercel,
  Pilote automatique, relances.

## Où elles sont (relevé le 01/11 ; relire `cron.job` en base avant d'agir)
- En base, `cron.job` lu le 01/11 : exactement les 16 tâches pg_cron listées ici (11 `acq-*`, le tic,
  4 autres), rien d'autre ; `acq-vigie-meta` y est inactive.
- pg_cron `acq-*`, 11 tâches : `supabase/migrations/0109_acquisition_planification.sql:6-17`.
- Tic de la minute : tâche `presti-agents-tic` (`supabase/migrations/0101_ops_horloge.sql:164`),
  route `app/api/agents/tic/route.ts`.
- Autres pg_cron : `presti-cron-menage` (`0101_ops_horloge.sql:165`), `presti-crieur` (`0104_crieur.sql:77`),
  `station-reunions-echues` et `station-experiences-echues` (`0112_pilotage_station.sql:626-628`).
- Crons Vercel (`vercel.json`) : `/api/cron/relances` (`0 8 * * *`), `/api/canaux/relever` (`0 7 * * *`).
- Pilote automatique : `lib/pilote/`. Relances : `lib/relances.ts`, `app/api/cron/relances/route.ts`.

## La règle de remplacement
- On remplace ces automatisations UNE PAR UNE dans n8n.
- Chaque remplacement suit ces pas, dans l'ordre :
  1. workflow n8n créé ;
  2. testé en dry-run ;
  3. comparé à l'ancien comportement ;
  4. ancien code désactivé ;
  5. drapeau vérifié.
- On ne rase rien en attendant.
- Chaque refactor est une suite de pas réversibles, chacun compilable et déployable.
- On fixe et on fait évoluer l'existant ; on ne rase jamais pour réécrire. Quand on choisit
  de ne pas raser un écran qui fonctionne, on le dit dans le journal.

## Poser une migration de base
- **On colle la migration, PUIS on lève le drapeau. Jamais l'inverse.**
- Pourquoi : un drapeau levé sans ses tables fait refuser tout le chemin (fail-closed, voulu) ;
  l'artisan tombe sur un écran mort (`lib/flags.ts:20-22`).
- Une migration en production attend le « go » écrit de Benj (`securite.md`).
- Voie 1, automatique : `node scripts/appliquer-migration.mjs supabase/migrations/00NN_x.sql`.
  Tout ou rien dans une transaction, fichier lu sur le disque (jamais retapé), objets attendus
  vérifiés après coup. Exige `DIRECT_URL` dans `.env.local`.
- Voie 2 : Benj colle à la main le jumeau `_A_COLLER_sql_editor_00NN.sql` dans le SQL Editor Supabase.
  Le jumeau est fabriqué par `scripts/sql-nu.mjs` ; sa parsabilité et son équivalence au fichier
  source sont vérifiées par `scripts/migrations-jumelles-e2e.mjs`, au lanceur.
- Un fichier que Benj colle lui-même est un livrable : sans test, la panne se découvre chez lui.
- Sous-agents : jamais de migration (`securite.md`).
