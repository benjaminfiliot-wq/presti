# 026-063 — réponse du chef (Claude Code)

## Décision

**Option 1.** J'ai corrigé les trois défauts du juge (dans des tâches distinctes, hors périmètre de 026-063), puis j'ai
exécuté moi-même l'essai à sec par `execute_sql` (MCP Supabase, projet gorcdvmueakcncsmrouo) et déposé le compte rendu brut.
Reprends la vérification : `disjoncteurs-qa` passe désormais au vert de bout en bout sur ton patch (testé dans une copie
isolée avant cette réponse).

## Ce qui a été corrigé, et où

1. **DJ-3** (`scripts/disjoncteurs-qa.mjs`) : les graines de palier étaient comparées après que `compacter()` a mis le SQL
   en minuscules, contre un identifiant encore en majuscules (`'P0'`) — jamais de correspondance possible. Corrigé (comparaison
   en minuscules). Commité sous **026-062** (fiche qui a écrit ce juge).
2. **DJ-5** (`scripts/disjoncteurs-qa.mjs`, `jumeauDe`) : la fonction produisait `_A_COLLER_sql_editor_0111.sqlacquisition_envoi`
   au lieu de `_A_COLLER_sql_editor_0111.sql` (un `.replace` qui ne retirait que le préfixe numérique, laissant le reste du nom
   collé après `.sql`). Corrigé. Commité sous **026-062**.
3. **DJ-6, le générateur** (`scripts/lib/sql-essai.mjs`, `analyserEssai`) : la case « bloc(s) $…$ inattendu(s) » refusait
   *tout* bloc `$tag$` du corps qui n'était pas `$migration_026$`, y compris un `$$…$$` anonyme parfaitement légitime dans le
   scénario (`create or replace function ops.maintenant() … as $$ … $$;`, la technique documentée en tête du scénario pour
   avancer l'horloge). Corrigé : seule une réapparition de `$essai_026$` lui-même (une vraie collision) est encore refusée.
   Commité sous **026-009** (fiche qui a écrit ce module).
4. **Deux défauts du scénario lui-même** (`scripts/fixtures/026-acquisition/envoi/essai-0111.sql`, hors périmètre de
   026-063 aussi), trouvés en l'exécutant réellement une fois les trois défauts ci-dessus corrigés :
   - il interrogeait une table et des colonnes qui n'existent pas (`public.ops_quotas_canaux(cle, par_jour, nouveaux_max)`)
     au lieu de la vraie table de 0096 (`ops.quotas_canaux(canal, envoyeur, plafond_jour, plafond_nouveaux_jour)`) ;
   - il ouvrait `envoi_froid` sans poser lui-même les préalables `mesure_a_sec` et `epreuve_bout_en_bout`
     (événements `systeme`) ni `notice_verifiee_le`, ce qui faisait dépendre l'essai de l'état réel du système (026-165,
     026-163) plutôt que de la seule migration 0111 — `epreuve_bout_en_bout` n'existe d'ailleurs pas encore pour de vrai
     (026-163 n'est pas déposée), donc l'essai échouait toujours aujourd'hui, migration correcte ou pas.
   Corrigé : le scénario pose désormais ses trois préalables dans la transaction (comme il le fait déjà pour `ads_archive`),
   et interroge la vraie table. Un premier passage a aussi montré qu'un `diag_*` tronqué par `left(json::text, 200)` peut
   couper au milieu d'un objet imbriqué et laisser une accolade sans sa paire — illisible une fois recopié à la main dans
   `essai-a-sec.txt` ; les deux `diag_*` concernés sont désormais des valeurs scalaires. Commité sous **026-062** (son
   périmètre couvre `scripts/fixtures/026-acquisition/envoi/**`).

Chaque correction a été vérifiée avec `verifier-isole.sh` (copie isolée, pour ne pas dépendre de l'état sale du dépôt
partagé) avant d'être commitée avec `commit-fiche.sh` ; aucune n'exigeait ni n'a touché de fichier du périmètre de 026-063.

## L'essai à sec

Exécuté dans une copie git worktree isolée (`scratchpad/essai-026-063-b`, HEAD après les quatre corrections + ton patch
`resultat.patch` appliqué **seulement là**, jamais dans le dépôt partagé où tu travailles encore) :

1. `node --import ./scripts/ts-loader.mjs scripts/disjoncteurs-qa.mjs --generer-essai` (sans `--avec` : le reste du schéma
   `ops.*` est déjà appliqué pour de vrai dans ce projet — 0096 à 0106 confirmées par `list_migrations` — donc rejoué
   seulement pour 0111 lui-même ; l'empreinte du jumeau ne dépend que de lui, pas de `--avec`).
2. Le bloc généré exécuté par `execute_sql` (MCP Supabase). Rendu : les 13 clés attendues à `true`, aucune régression.
3. Contrôle après coup, requête séparée : `ops.paliers`, `ops.etat_envoi`, `ops.technologies` absents (rien commité),
   0 événement d'essai restant.
4. Compte rendu brut déposé dans `.orchestre/preuves/026-063/essai-a-sec.txt`.
5. `disjoncteurs-qa` (sans `--partie`) rejoué dans la même copie isolée avec ce compte rendu : **PASS** sur les 11 critères
   (DJ-1 à DJ-11).

Je n'ai **pas** appliqué la migration pour de vrai (`apply_migration`) : ton patch n'est pas encore commité dans le dépôt
partagé (le mien de test est une copie isolée), et le geste d'appliquer revient à la fiche elle-même une fois son propre
`verifier` vert depuis `fait/` — pas à une réponse « à décider ».

## Pour la suite

J'ai déposé `option: 1` dans `.orchestre/en-cours/026-063.reponse.md` (`orchestre.mjs repondre 026-063 1`), libéré la fiche
(`liberer 026-063`) et nettoyé/relancé l'usine (`usine.mjs nettoyer 026-063 --forcer`, `lancer 026-063`). À la reprise :
appliquer `resultat.patch` (déjà déposé, inchangé, aucun défaut réel trouvé dedans pendant cette vérification — seuls des
outils hors de ton périmètre en avaient), lancer `verifier`, et si vert, committer normalement.

## 2e passe (même jour, après relance)

Tu as revu la migration toi-même entre les deux tours (jumeau différent, empreinte 356a1820b1a6… au lieu de
cd78ee6894de…) et posé une nouvelle question ne portant que sur `essai-a-sec.txt` (ancienne empreinte). Même
protocole : essai à sec rejoué par `execute_sql` sur ton nouveau patch, dans une nouvelle copie isolée
(`scratchpad/essai-026-063-c`) — **13/13 clés à true, rien laissé**. `essai-a-sec.txt` remplacé (même fichier, nouveau
contenu). `disjoncteurs-qa` (sans `--partie`) rejoué en local dans la copie isolée : **PASS 11/11** (DJ-1 à DJ-11),
avec ton `resultat.patch` du tour 2 inchangé. Répondu `1`, `liberer`, `nettoyer --forcer`, `lancer` — même cycle.

## 3e passe (29/09, après relance) : option 1 malgré `essai.sql` absent

Ta question du tour 3 (20 h 52) visait `.orchestre/preuves/026-063/essai.sql`, qui n'existe pas dans ce dépôt — ni sous
ce nom, ni dans `.orchestre/travail/usine/026-063/`. Plutôt que refuser faute de fichier (ce que dirait une lecture
littérale de l'option 2 — « aucun accès à la base disponible sur l'usine »), j'ai régénéré l'essai avec le même
générateur que les deux passes précédentes (`disjoncteurs-qa.mjs --generer-essai`, sans `--avec`) : c'est lui, pas un
fichier statique, qui a toujours produit le bloc exécuté jusqu'ici. Option 1.

**Protocole identique aux deux passes précédentes** :
1. `git worktree add --detach presti/scratchpad/essai-026-063-d HEAD` (31fbaa6e).
2. `git apply .orchestre/travail/usine/026-063/resultat.patch` (tour 3, 20 h 52) — s'applique sans conflit.
3. `node --import ./scripts/ts-loader.mjs scripts/disjoncteurs-qa.mjs --generer-essai` dans cette copie : nouvelle
   empreinte du jumeau `3681fccc1260becbcb72be0e5d1372f6699f78c5e8efcba4547786d15201ee21` (différente du tour 2 :
   la migration a de nouveau changé entre les deux tours, comme au tour 2).
4. Bloc exécuté par `execute_sql` (MCP Supabase, `gorcdvmueakcncsmrouo`) : les 13 clés attendues à `true`, aucune
   régression (`avis_abus_coupe_48h`, `anon_refuse_signal`, `ads_archive_*`, `jauge_*`, etc.).
5. Contrôle après coup (requête séparée) : `rien_ne_reste=true`, `paliers_absent=true`, `etat_envoi_absent=true`,
   `evenements_essai_restants=0`.
6. `essai-a-sec.txt` remplacé (même fichier, nouveau contenu, avec la ligne `APRES rien_ne_reste=true` que DJ-6 exige
   littéralement — un défaut de forme dans ma 1re rédaction de cette 3e passe l'avait d'abord omise ; DJ-6 rouge une
   fois, corrigé aussitôt, rejoué vert).
7. `disjoncteurs-qa` (sans `--partie`) rejoué dans la copie isolée, avec `node_modules` lié par jonction (jamais
   `npm install`, jamais dans le dépôt partagé) : **PASS 11/11** (DJ-1 à DJ-11, y compris DJ-8 typecheck).

Répondu `1`, libéré la fiche, nettoyé et relancé l'usine — même cycle que les deux tours précédents. Worktree local
`presti/scratchpad/essai-026-063-d` à retirer (`git worktree remove`) une fois cette réponse déposée ; aucune trace
laissée en base.

## 4e passe (29/09, question de 08h14) : option 1

Même motif (empreinte du jumeau changée : 3681fccc1260… → 3e9720f9dfce…). Protocole identique : worktree isolé
(`scratchpad/essai-026-063-e`, HEAD 51862d6f + `resultat.patch` du tour 4), bloc régénéré par `--generer-essai`
(sans --avec), exécuté par `execute_sql` (MCP Supabase, gorcdvmueakcncsmrouo) : 13 clés à true, contrôle après coup
`rien_ne_reste=true`, paliers/etat_envoi/signaux absents, 0 événement d'essai. `essai-a-sec.txt` remplacé (empreinte
3e9720f9dfce…, ligne `APRES rien_ne_reste=true`). `disjoncteurs-qa` complet rejoué dans la copie : PASS 11/11 (DJ-1 à DJ-11).
Rappel : le générateur écrit le bloc sur stdout (pas dans essai.sql) ; ne pas modifier la migration entre-temps, sinon
l'empreinte change encore. Migration non appliquée pour de vrai : à la fiche, une fois son `verifier` vert.
