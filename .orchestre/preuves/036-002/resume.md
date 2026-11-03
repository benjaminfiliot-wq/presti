## Ressources utilisées

- **MCP `cerveau`** (réseau neuronal, copie du vault du 02/11) : `regles_pour` sur « migration Supabase non appliquée, agents n8n,
  connexions Gmail chiffrées, données client, envoi automatique » → `regles-presti/migration-production.md` (« on colle PUIS on lève »,
  go écrit de Benj) et `memoire/migrations-je-les-applique.md` (Benj veut que l'agent principal applique lui-même : ici, sous-agent sur
  Oracle, la garde l'interdit, donc la pose revient à la session principale). `chercher` « connexions chiffrées… palier simulation ombre »
  → plan p6 § 1.1, prompt 6 § 1.4, `fiche-methode-n8n.md` § 3.5 (« simulation » vraie par défaut, mode ombre). Effet : défaut
  « simulation, coupé », ordre de pose écrit et imposé par un bloc de prérequis.
- **Skill `reseau-neuronal`** : mode d'emploi du cerveau (lire seulement, ne rien écrire dans le vault : consigne de la session).
- **Le prompt 6** `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md` (partie 0 : A3, A4, A14, B1, D3, § 0.3,
  § 0.4 « l'autorisation chiffrée, jamais dans n8n en clair », règles « interrupteur général et par département, plafonds de coût par
  jour », « Supabase account passe outre la RLS » ; prompt 1 : § 1.2 les sept départements, § 1.3 « Connexions » et « Mes
  départements », § 1.4 paliers compte par compte). Effet : les sept départements + `tous`, `plafond_cout_centimes_jour` en plus du
  plafond d'actions, « ombre » et « reel » réservés à Presti.
- **Le plan** `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md` (premiere-reponse, lu en entier : § 2 patterns, § 3.1 schéma,
  § 3.2 départements, § 4 ligne 036-002, § 5 décision 1). Effet : deux secrets `secret_app` / `secret_n8n` au format v1, la table
  `connexions` « à côté de canaux », la vue étroite lue par n8n.
- **Fiches vidéos** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` (§ 3.3 trevsagents / androoagi, D3 « ce que coûte l'IA, en
  clair », l.721) et `fiches-videos-restructureai.md` (§ 11 réputation, l.363-368 « Approval Desk » ; le 29/10 « 0 octet vers le nuage »
  → A14) ; `plans/analyse-videos.md` et `docs/connaissance-videos/` parcourus (rien de propre au schéma). Effet : `couts_ia_jour` avec
  `externe` VRAI par défaut (un appel qu'on ne sait pas situer compte comme sortant), le compteur de A14.
- **Skill `supabase-postgres-best-practices`** (`security-rls-performance.md`, `security-privileges.md`) : `(select auth.uid())` dans
  chaque politique, index en tête `artisan_id` (clés primaires, `connexions_compte`, `couts_ia_appels_compte_jour`), la seule fonction
  security definer à `search_path = ''` et exécution retirée à public, anon, authenticated, service_role ; moindre privilège par colonne.
- **Skill `ecc:security-review`** (sur mon propre diff) : checklist secrets, RLS, messages d'erreur. Effet : constat « une contrainte CHECK
  refusée recopie la ligne, donc un secret en clair, dans l'erreur » → validation du format dans le déclencheur, avant la contrainte, avec
  un message qui ne recopie rien (voir « Risques »).
- **Agent `presti-audit-attaque`** (auditeur distinct, lecture seule, sur 0193) : constats et suites dans la section « Audit ».
- **Sources du dépôt** : `CLAUDE.md`, `.claude/rules/*.md` (les cinq), `.orchestre/contexte.md` (cité par la tâche), `0185_automatisation.sql`
  (evenements_metier l.125-160, gardes l.451-469), `0189_role_lecture_n8n.sql`, `0192_accuse_reception_n8n.sql` (vue l.99, marque),
  `0138_garde_session_rls.sql`, `lib/secretBox.ts:21-30`, `lib/flags.ts`, `scripts/sql-nu.mjs`, `scripts/migrations-jumelles-e2e.mjs`,
  `scripts/automatisation-schema-qa.mjs` (modèle du juge : statique + mutants + PGlite derrière `PGLITE_DIR`).
- **MCP `n8n-oracle`** : non sollicité (aucun workflow dans ce lot ; interdit en écriture).

## 036-002 — le schéma du système d'un artisan : migration 0193 écrite, NON appliquée

Tâche du lot 036-002 (§ 4 de `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`), écrite le 03/11/2026 sur l'hôte d'agents d'Oracle
par claude-code. Rien n'a touché la base, ni n8n, ni le vault.

## Ce qui a été livré (périmètre)

| Fichier | Quoi |
|---|---|
| `supabase/migrations/0193_systeme_agents.sql` | la migration, « ÉTAT : NON APPLIQUÉE », 523 lignes |
| `supabase/migrations/_A_COLLER_sql_editor_0193_systeme_agents_NU.sql` | le jumeau, par `scripts/sql-nu.mjs --controle` |
| `lib/flags.ts` | `systemeAgents: false`, `connexions: false`, commentés ; rien d'autre |
| `scripts/systeme-agents-schema-qa.mjs` | le juge |
| `.orchestre/preuves/036-002/controle-0193.sql` | le pied du jumeau (contrôles qui ne font que LIRE) |

## L'ordre de pose : 0185 → 0192 → 0193

Écrit en tête de 0193 (l.7-12) et **imposé** : le bloc `do $prerequis$` (avant tout objet) lève une exception si `evenements_metier`,
`faits_sans_texte`, `automatisation_maj_le` (0185), `leads.accuse_n8n_le` (0192) ou les gardes de 0138 manquent. Puis les contrôles du pied
du jumeau, puis seulement les drapeaux `systemeAgents` et `connexions`, puis les workflows. 0193 **s'appuie sur 0185 sans la recopier**
(le juge le prouve : aucune table ni fonction de 0185 recréée) : elle ajoute une colonne à `evenements_metier` et redéfinit une seule
fonction, `evenements_metier_coherence`, pour que la marque `traite_le` soit la seule chose qui change dans un fait.

## Chaque table, sa RLS, ses droits par colonne

Toutes : RLS activée ; une seule politique permissive, la lecture de ses lignes `((select auth.uid()) = artisan_id)` ; les quatre gardes
restrictives de 0138 (boucle `$gardes$`) ; tout retiré à anon ; **tout** retiré à authenticated (`revoke all`, MAINTAIN de Postgres 17
compris), puis `grant select` rendu explicitement (sauf `connexions`, rendue par colonne) ; `artisan_id … on delete cascade` ; aucune `organization_id` ; montants et coûts en `bigint`.

| Table | Clé | Ce qu'elle tient | Particularités |
|---|---|---|---|
| `connexions` | `id` ; une seule vivante par (compte, fournisseur, compte affiché) | les onze fournisseurs de la tâche, `portees text[]`, état `a_verifier` · `active` · `expiree` · `retiree` · `erreur`, `verifiee_le`, `derniere_synchro`, `expire_le`, `retiree_le`, `secret_app`, `secret_n8n` | **droits par colonne** : `revoke all … from anon, authenticated` APRÈS la boucle des gardes, puis `grant select (13 colonnes)` sans aucun secret (un `select *` du navigateur échoue). Format v1 `^v1\.[16]\.[22]\.[…]+$`, vérifié contre de vrais chiffrés de `lib/secretBox.ts`, et validé d'abord par le déclencheur avec un message qui ne recopie pas la valeur. Une portée = un mot. Naît `a_verifier` ; `active` exige `verifiee_le` (C4) ; `erreur` exige un motif ; `retiree` est sans retour et efface les deux secrets (contrainte + déclencheur) |
| `departements_reglages` | (compte, département) | `tous` + accueil, devis, suivi, facturation, apres, operations, direction ; palier `arret` · `simulation` · `ombre` · `reel` (défaut **simulation**), `en_marche` (défaut **faux** : coupé), `plafond_jour`, `plafond_cout_centimes_jour` | déclencheur : une ligne **naît** en arrêt ou en simulation ; **monter** à l'ombre ou au réel exige un `acteur_id` fondateur (`artisans.is_founder`, lu en base, jamais `pose_par` recopié) et force `pose_par = 'presti'` ; ce qui ne change pas de palier (couper, plafonds) passe toujours. Pas de ligne = défaut |
| `competences` | `id` ; unique (compte, département, clé, version) ; une seule active par clé | titre (≤ 120), corps (≤ 8 000), version, actif (défaut faux) | naît inactive (refus à l'insertion) ; une version ne se réécrit pas (seul `actif` change) |
| `couts_ia_appels` | `id` ; unique (compte, clé) | un appel de modèle : département, modèle, `externe` (défaut **vrai**), jetons, `cout_millicentimes` ; `jour` calculé à Paris par le déclencheur | ne se réécrit pas (un upsert « do update » est refusé) ; « on conflict do nothing » = idempotent ; date de l'appel dans [maintenant − 7 j, maintenant + 5 min] |
| `couts_ia_jour` | (compte, jour, **département**, modèle) | appels, jetons, `cout_millicentimes`, `cout_centimes` **généré** (arrondi au centime supérieur), `externe` | alimentée par `couts_ia_cumuler` à chaque appel NEUF ; toute écriture directe est refusée (`pg_trigger_depth() < 2`), clé de service comprise |
| `evenements_metier` (0185) | inchangée | + `traite_le`, index partiel des non traités `(survenu_le, id)` | seule `traite_le` peut changer (posée, ou remise à vide pour rejouer) |

Pourquoi `couts_ia_appels` en plus de `couts_ia_jour` : l'idempotence par clé (règle de tout lot). Un compteur qu'on incrémente compte deux
fois un appel rejoué après un plantage ; une ligne par appel à clé unique, non. Pourquoi des millièmes de centime : un appel court de
Haiku coûte moins d'un centime, l'arrondir à l'appel le ferait disparaître du compteur. Le cumul par déclencheur est un compteur dérivé,
pas une automatisation (il ne déclenche rien) : la règle n8n-first n'est pas en cause.

## Ce que n8n lit et écrit

- **Lit** la vue `n8n_evenements_a_traiter` par le rôle `n8n_lecture` (0189), comme `n8n_accuses_dus` (0192:99) : `security_barrier`,
  droits du propriétaire, colonnes d'un fait seulement (id, artisan_id, type, objet_type, objet_id, cle, faits, survenu_le — les faits sont
  sans texte libre par 0185), non traités, comptes en suppression écartés ; retirée à public, anon, authenticated, service_role.
- **Marque** par `evenements_marquer_traites(p_artisan, p_ids)` (security definer, search_path vide, compte obligatoire, 200 ids au plus,
  `where artisan_id = p_artisan and … traite_le is null`, jamais un compte en suppression), exécutable par `n8n_lecture` seul, dans
  `start transaction read write; … commit;` (trois instructions sans paramètre lié : à rejouer à l'essai de n8n, comme 0192).
- **Lit** `departements_reglages`, `competences`, `connexions` (dont `secret_n8n`, déchiffré en mémoire avec SA clé) et `couts_ia_jour` par
  « Supabase account », qui passe outre la RLS : chaque requête filtre sur `artisan_id`.
- **Écrit** `couts_ia_appels` (« on conflict do nothing ») et l'état d'une connexion (`etat`, `derniere_synchro`, `motif_erreur`) par
  « Supabase account », filtré sur `artisan_id`. Jamais `secret_app`, jamais un palier.
- Si 0189 manquait, les deux droits sont sautés avec un avis (à rejouer après 0189) ; 0189 est appliquée (plan § 1.3).

## L'essai à sec

**Non fait** : ni PGlite ni Postgres sur l'hôte des agents, réseau sortant fermé (`npm install` impossible) ; la garde de la session
refuse en plus tout geste qui ressemble à une migration. Le juge porte une partie PGlite complète (0138 + 0185 + 0193 rejouée deux fois,
56 essais sous anon, authenticated, n8n_lecture, service_role, dont « sans 0185 la pose est refusée ») qui se joue avec
`PGLITE_DIR=<dossier où @electric-sql/pglite est installé>` ; **elle n'a jamais tourné** : son premier passage est celui de la session
principale. Sans elle, le verdict repose sur la lecture du texte et les mutants. Code 2 vérifié : `PGLITE_DIR` posé sur un dossier vide
→ « partie PGlite en attente », sortie 2.

## Audit (agent `presti-audit-attaque`, distinct, lecture seule) et ce qui en a été fait

Verdict de l'auditeur : aucun chemin par lequel un jeton de navigateur lit un secret ou les lignes d'un autre artisan (le `revoke all`
puis droits par colonne tient : filtrer ou trier sur `secret_*` exige aussi le droit de colonne) ; « à corriger avant le go » pour :

| # | Constat | Suite |
|---|---|---|
| 1 | palier « reel » posable sans Presti (la contrainte lisait `pose_par`, que l'écrivain remplit ; rien à l'insertion) | **corrigé** : déclencheur `departements_reglages_coherence` (naissance en arrêt ou simulation, montée par un acteur fondateur lu en base) ; mutants et essais PGlite |
| 2 | plafond de coût par département incontrôlable (`couts_ia_jour` sans département) | **corrigé** : `departement` dans la clé et le cumul |
| 3 | les deux secrets risquent la même clé (`lib/secretBox.ts` ne connaît que `CANAUX_KEY`) ; chiffré non lié à sa ligne | **reporté à 036-009** (code, hors périmètre `lib/**`) et écrit dans la migration : `secret_n8n` chiffré avec la clé de n8n, jamais `CANAUX_KEY` ; l'id de la connexion en donnée associée GCM. La base ne peut pas voir quelle clé a chiffré |
| 4 | l'interrupteur pouvait se bloquer (contrainte `pose_par` à chaque écriture) | **corrigé** : la garde ne joue qu'à la montée de palier ; essai PGlite « au réel, couper passe toujours » |
| 5 | la marque touchait un compte en suppression | **corrigé** : même filtre que la vue |
| 6 | lecture seule de n8n_lecture ≠ barrière ; transaction en une requête paramétrée | **écrit** dans la migration (ce sont les droits qui bornent ; trois instructions sans paramètre, à essayer comme 0192) |
| 7 | cumul faussable (upsert « do update », purge puis rejeu, écriture directe, `survenu_le` libre) | **corrigé** : écriture directe de `couts_ia_jour` refusée, fenêtre de date ; « do update » déjà refusé (écrit) ; purge : jamais (écrit, runbook 036-012), clé déterministe |
| 8, 9 | MAINTAIN (PG 17) non retiré ; lecture dépendant des droits par défaut | **corrigé** : `revoke all` puis `grant select` explicite |
| 10 | rejouer 0185 après 0193 remet l'ancienne fonction | **écrit** en tête : rejouer 0193 ensuite |
| 11 | compétence pouvant naître active ; portée avec espace ; `cree_le` à venir bloquant un lot de marques ; limites de `faits_sans_texte` (0185) | **corrigés** (refus à l'insertion, compte des mots, contrainte `traite_le >= cree_le` retirée) ; `faits_sans_texte` : limite de 0185, déjà écrite à 0185:58-59, non touchée (interdit) |

Mon propre constat (`ecc:security-review`) : une contrainte CHECK refusée recopie la ligne (« Failing row contains ») dans l'erreur, donc
un secret en clair → **corrigé** (validation du déclencheur, message sans la valeur ; essai PGlite « le refus ne recopie pas le secret »).
L'entrée du journal d'audit (`.claude/agents/knowledge/audit.journal.md`) reste à écrire par la session principale : hors de mon périmètre.

## La sortie du juge et ses mutants

`node scripts/systeme-agents-schema-qa.mjs` (sortie complète dans `.orchestre/preuves/036-002/verifier.log`) :

```
══ 1. 0193, son jumeau et les drapeaux, lus tels quels ══      (176 contrôles, tous verts)
══ 2. Les drapeaux, lus par le code (pas par le texte) ══       FLAGS.systemeAgents === false · FLAGS.connexions === false · chiffrés d'essai déchiffrés
══ 3. Les mutants rougissent ══                                60 mutants, 60 rougissent leur vérification visée
⏸  Partie PGlite non jouée : PGLITE_DIR n'est pas posé
✅ 239 réussis, 0 échoués
```

Les cinq mutants que la tâche exige, tous rouges : colonne de secret lisible par authenticated (`secret_n8n` ajouté à la liste des
colonnes rendues), RLS absente (`connexions`, et `couts_ia_jour`), vue sans `security_barrier`, défaut de palier `reel`, drapeau levé
(`systemeAgents`, et `connexions`). Les 55 autres couvrent : droit de table rendu, revoke retiré, format affaibli ou faux (contre de vrais
chiffrés de `secretBox`), retrait qui garde les secrets, validation du déclencheur retirée, portée avec espace, fournisseur ou département
oublié, active sans essai, interrupteur allumé, réel par l'artisan / à la naissance / garde revenue à `pose_par`, gardes de 0138
retirées ou affaiblies, lecture ouverte, écriture au navigateur ou à anon, compétence active ou réécrite, corps sans borne, appel compté
deux fois, externe faux par défaut, coût en numeric, cumul sans département ou écrit en direct, date libre, fait modifiable, vue élargie
ou en security_invoker ou laissée au navigateur ou sans filtre, marque sans compte / sans borne / ouverte à service_role / sur compte en
suppression, deuxième security definer, search_path oublié, 0185 recopiée (table ou fonction), en-tête, ordre, prérequis, retour arrière,
organization_id.

Vérification de la tâche (`node scripts/orchestre.mjs verifier 036-002`) : juge 239/0 ; `migrations-jumelles-e2e` 592/0 ;
`npx tsc --noEmit` sans erreur ; `offres-affichage-qa` 286/286 ; `pilote-qa` 95 verts, 0 rouge ; section « Ressources utilisées » lue par la
commande. Verdict final : la ligne de `.orchestre/digest.md`.

## Risques et points à valider (pour la session principale et Benj)

- **Aucun essai à sec** : à faire avant le collage (bloc do qui exécute le jumeau puis `raise exception`), et `PGLITE_DIR=… node
  scripts/systeme-agents-schema-qa.mjs` (56 essais jamais joués : un échec du banc lui-même est possible et doit se lire avant de conclure).
- **Les gestes de Benj** : « go » écrit, puis 0185, 0192, 0193 dans cet ordre, contrôles du pied, PUIS les drapeaux. Le rôle `n8n_lecture`
  n'a de mot de passe que si Benj l'a posé (0189).
- **036-009** doit tenir la séparation des clés (`secret_n8n` jamais sous `CANAUX_KEY`) et lier le chiffré à sa ligne ; **036-011** doit
  nommer ses colonnes sur `connexions` (un `select *` du navigateur échoue, voulu).
- La garde du palier arrête une route ou un workflow qui recopie un corps de requête, pas un geste délibéré avec la clé de service.
- Le conseiller Supabase signalera la vue en « security definer view » : attendu, comme pour 0192 (droits retirés, `security_barrier`).
- `lib/flags.ts` porte d'autres modifications non commitées qui ne sont pas de ce lot (`accuseParN8n`, `smsClients`…) : seules les
  entrées `systemeAgents` et `connexions` sont de 036-002.
