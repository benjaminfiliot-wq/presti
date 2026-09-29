# Application de 0114_contenu.sql (fiche 026-206) — 2026-09-29

Projet Supabase Presti (gorcdvmueakcncsmrouo), par l'outil MCP `apply_migration` (jamais de SQL collé à la main), par Claude Code
(le chef), après l'essai à sec (`essai-a-sec.txt` : 105 cas sur la base, 0 échec, tout annulé) et le verifier PASS.

## 1. Lecture entière du fichier
`supabase/migrations/0114_contenu.sql` lu en entier (656 lignes, sha256 4d49424611c3154b…, md5 aeb0de8561a5149186d6e9f9bce8a90d)
avant application. Numéro 0114 libre en base (0113 promis à N2, non touché).

## 2. apply_migration
Nommée `0114_contenu`, `query` = contenu exact du fichier. Résultat : `{"success":true}`. Enregistrée dans
`supabase_migrations.schema_migrations` (une ligne). Le md5 du texte enregistré (`statements`) est **identique** à celui du fichier :
aeb0de8561a5149186d6e9f9bce8a90d.

## 3. md5(prosrc) des fonctions
`node md5-migration.mjs supabase/migrations/0114_contenu.sql '<json base>'` →
**`17 corps identiques, 0 différents, sur 17 fonction(s) du fichier`** (12 fonctions de service, 5 privées : journal et quatre
déclencheurs).

## 4. Contrôle `controle-0114.sql` (lecture seule)
19 lignes, **19 « oui »** : six tables, RLS active partout, six politiques (SELECT, authenticated), aucune politique d'écriture,
aucun droit de table pour anon/PUBLIC, authenticated en SELECT seulement, service_role lit et écrit, 12 fonctions au seul
service_role, 5 fonctions privées sans exécuteur, 4 déclencheurs actifs, cinq lignes L1-L5 toutes non approuvées et sans
suspension, campagnes `ligne-l1`..`ligne-l5`, quatre comptes avec leur lien de bio, index de déduplication, aucune trace d'essai.

## 5. Essai réel annulé, sur les objets appliqués
Un énoncé DO (vraies décisions du bus, vraie tranche par un fondateur, `set local role` anon/authenticated) puis exception :
`ligne L2 approuvée` vrai ; `sans accord individuel : fermée` vrai (la ligne est approuvée, la publication reste fermée) ;
`décision refuser : fermée` vrai ; `accord exact : publiable` vrai, `verdict ok` vrai ; `retouche : refermée` vrai ;
`anon refusé` (42501) vrai ; `fondateur lit` vrai ; `non-fondateur ne voit rien` vrai.
(Le juge `contenu-qa` n'a pas de mode `--reel` : ce test en tient lieu.)

## 6. Zéro trace
Après l'essai réel : `contenu_posts` 0, `contenu_mesures` 0, `contenu_idees` 0, `contenu_suspensions` 0, lignes approuvées 0,
`ops.decisions` 2 (inchangé, aucune décision d'essai), événements `contenu_*` dans le journal du bus : 0.

## Ce que Benj doit savoir
Un essai à sec et un essai réel annulé ont tourné sur la production (transactions annulées, rien laissé). Rien à faire de sa part
pour la migration. Aucune ligne n'est approuvée et rien ne peut sortir : approuver la voix et les cinq lignes (fiche 026-205) puis
accorder chaque publication reste son geste (R24 ouverte).
