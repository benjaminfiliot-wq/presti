# Contre-vérification indépendante — 026-060 (migration 0105_acquisition_socle)

Exécutant : Claude Code (contre-vérificateur), 28 septembre 2026. Fiche produite par un autre
exécutant (`statut: PRET_A_APPLIQUER`, verdict `vert` non repris tel quel : entièrement rejoué et
attaqué à neuf ci-dessous, avant application réelle).

Projet Supabase : `gorcdvmueakcncsmrouo`.

## 1. Ce qui a été relu

- `supabase/migrations/0105_acquisition_socle.sql` (555 lignes) : colonnes ajoutées à
  `ops.prospects`, tables `ops.annonceurs` et `ops.curseurs`, quatorze fonctions `public.acq_*`
  (plus `acq_transition_valide`), quinze graines d'agents.
- `supabase/controles/0105_acquisition_socle.sql` : des `select` seuls, rejoué contre la vraie
  base après application (§4).
- `lib/agents/acquisition/magasinSupabase.ts` : une méthode par fonction `acq_*`, appelée par
  `supabaseAdmin.rpc`.
- `docs/registre-traitements.md` §11 et `docs/agents/analyse-interet-legitime.md` : les éléments
  cités par le juge statique (OA-7, OA-13 — 3 ans, dernier contact émanant du prospect, diffusion
  partielle, opposition, 10 minutes, assistant IA, formulaire de contact, ADEME, STOP, les cinq
  sources, OpenAI/Meta/Google/Oracle/GitHub en sous-traitants) sont bien présents au § 11 du
  registre, mot pour mot.
- La table `TRANSITIONS` de `lib/agents/acquisition/contrat.ts` (lignes 677-690) comparée paire
  par paire à `acq_transition_valide` de la migration : 34 paires des deux côtés, identiques une
  par une (candidat, recense, verifie, maquette_prete, prepare, envoye, oui, lien_prepare,
  lien_envoye, non, a_decider).
- Reconnaissance avant essai (lecture seule) : `ops.prospects` et `ops.opposition` à 0 ligne,
  `ops.agents` à 2 lignes (aucune des quinze à semer), `ops.annonceurs`/`ops.curseurs`
  inexistantes — la base était bien vierge de tout historique sur ce périmètre, donc les essais
  ci-dessous n'ont pu percuter aucune donnée réelle.
- Rôle de connexion du connecteur (`current_user`) : `postgres`, non superuser mais **membre** de
  `anon` et de `authenticated` — ce qui a permis de tester les droits par un vrai `SET ROLE`, pas
  seulement par une lecture statique de `has_function_privilege`.

## 2. L'essai à sec attaqué (avant application)

Un seul bloc `do $contre026060$ … end $contre026060$;` (864 lignes, écrit par ce
contre-vérificateur, indépendamment du bloc de l'exécutant précédent), joué une fois par
`execute_sql` sur `gorcdvmueakcncsmrouo`, **jamais** `apply_migration` à ce stade :

1. La migration entière, telle quelle, une première fois.
2. **Attaque 1 — droits anon/authenticated, exécution réelle (`set local role`, pas une lecture
   statique)** : six tentatives — `anon` sur `acq_candidats_enregistrer`, `acq_jeton_meta`, lecture
   directe de `ops.annonceurs` ; `authenticated` sur `acq_opposer`, lecture directe de
   `ops.curseurs`, et sur `acq_purger` (fonction destructrice). Chacune devait lever
   `insufficient_privilege` (42501) ; sinon le bloc élève lui-même une erreur
   `CONTRE_VERIF_ECHEC`, non rattrapée, qui aurait fait échouer tout l'essai avec un message
   explicite.
3. **Attaque 2 — contraintes** : neuf tentatives — `etape` invalide et `cible` invalide en
   insertion directe (contrainte `check`) ; `acq_opposer` avec `p_expire_le` à 200 jours (borne
   haute) puis à 12 h (borne basse) ; `acq_candidats_enregistrer` et `acq_annonceurs_enregistrer`
   avec un JSON non-tableau ; `acq_reserver` sur l'étape `oppose` ; `acq_jeton_meta_poser` avec un
   jeton de 5 caractères ; `nom` de curseur en majuscules. Chacune devait être refusée avec le bon
   code (`check_violation`, ou `P0001`/`ops:<code>` avec le message exact).
4. **Attaque 3 — rejouabilité** : la migration entière rejouée une seconde fois dans la même
   transaction. Sans erreur, puis re-comptage : toujours exactement 14 fonctions `acq_*` (aucun
   doublon), toujours 15 agents semés, toujours 14 colonnes de la série sur `ops.prospects`.
5. **Attaque 4 — cas limites de la fiche** (huit vérifications, données de test isolées par des
   clés `900000xxx` / `contre-verif-026-060*`, jamais des clés réelles) :
   - un candidat `source = entrant` avec `froid: true` dans la charge ressort `froid = false`
     (rectification du 24/09) ;
   - une opposition définitive posée après une temporaire remplace bien celle-ci (`expire_le`
     redevient `null`) ;
   - une temporaire posée après une définitive ne l'écrase jamais (`expire_le` reste `null`) ;
   - un candidat inséré sur une clé déjà en opposition active arrive directement à l'étape
     `oppose`, sans passer par `candidat` ;
   - `acq_prospect_mettre_a_jour` refuse un `p_depuis` qui ne correspond pas à l'étape réelle
     (verrou optimiste) et refuse une paire absente de la table des transitions même quand
     `p_depuis` est exact, puis accepte et applique une transition valide ;
   - à la 3ᵉ réservation (`tentatives = 2` avant l'appel), `acq_reserver` bascule la ligne à
     `a_decider` (`tentatives = 3`) et l'exclut du lot rendu, au lieu de poser un 4ᵉ bail ;
   - `acq_purger` efface un prospect dont le dernier contact **du prospect** date de plus de 3 ans
     même si sa création est récente ; ne l'efface **pas** si le dernier contact du prospect est
     récent même avec une création ancienne (garde-fou CNIL : nos relances ne comptent pas) ;
     efface bien sur la date de création à défaut de tout contact du prospect ;
   - le jeton Meta posé par `acq_jeton_meta_poser` se relit à l'identique par `acq_jeton_meta`
     (coffre Supabase Vault), l'échéance de `vigie_meta` est bien posée, et le jeton ne fuite dans
     aucune ligne de `ops.evenements`.

Résultat de l'appel : `ERROR: P0001: CONTRE_VERIF_026_060_OK` — c'est le marqueur final attendu,
atteint seulement si les dix-neuf tentatives d'attaque ci-dessus ont toutes été refusées et les
huit vérifications de cas limites toutes conformes (sinon un message `CONTRE_VERIF_ECHEC:
<raison>` distinct aurait été renvoyé à la place, avant ce marqueur). Comme pour tout essai à sec,
l'exception finale annule la transaction entière : migration comprise, aucun `COMMIT`.

**Zéro trace, vérifié ensuite** (nouvel appel `execute_sql`, en lecture seule) : `ops.annonceurs`
et `ops.curseurs` toujours absentes, les 14 fonctions `acq_*` (+ `acq_transition_valide`) toujours
absentes, la colonne `etape` toujours absente de `ops.prospects`, `ops.prospects` toujours à 0
ligne (y compris aucune des clés de test `siren:90000%` / `domaine:contre-verif%`),
`ops.opposition` toujours sans aucune des clés de test, `ops.agents` toujours à 2 lignes (aucun des
quinze noms), le coffre `meta_adlib_token` absent, `ops.evenements` sans trace du jeton de test.

## 3. Application réelle (après la contre-vérification ci-dessus)

Migration appliquée par le connecteur Supabase — `apply_migration`, nom `0105_acquisition_socle`,
projet `gorcdvmueakcncsmrouo` — **jamais** collée par Benj, conformément à la consigne. Résultat :
`{"success":true}`.

## 4. Contrôle rejoué contre la vraie base, après application

`supabase/controles/0105_acquisition_socle.sql` rejoué mot pour mot par `execute_sql` (lecture
seule, aucune écriture) sur `gorcdvmueakcncsmrouo` maintenant migrée : **22 lignes, toutes
`oui`** — les 14 fonctions une à une (existence, `security definer`, `search_path`, exécutable par
`service_role` seul), les 14 présentes en une seule version, aucune exécutable par `anon` ni
`authenticated`, les 14 colonnes sur `ops.prospects`, la contrainte `cible`, `ops.annonceurs` et
`ops.curseurs` fermées (RLS, aucun droit — y compris pour `service_role`, qui ne passe que par les
fonctions), les 15 agents semés avec leur période, le coffre du jeton Meta.

`get_advisors` (sécurité) après application : `ops.annonceurs` et `ops.curseurs` apparaissent dans
le lint `rls_enabled_no_policy` (niveau INFO) — attendu et voulu, au même titre que les douze
autres tables d'`ops` et la trentaine de tables `public.*` qui suivent déjà ce modèle (fermées,
accès uniquement par fonction `SECURITY DEFINER`). Le lint `authenticated_security_definer_function_executable`
(WARN) liste 4 fonctions préexistantes (`appliquer_mouvement`, `is_founder`,
`sessions_de_l_artisan`, `slug_ancien_d_un_autre`) — **aucune** des 14 fonctions `acq_*` de 0105
n'y figure, confirmant qu'aucune n'est exécutable par `authenticated`. Aucun lint nouveau
n'apparaît sur le périmètre 026-060.

Juge statique `node scripts/ops-acquisition-qa.mjs --migration=socle`, rejoué après application
(fichiers du périmètre 026-060 inchangés depuis le PASS d'avant-application déjà consigné dans
`.orchestre/preuves/026-060/verifier.log`, sha256 identiques — voir § 5) : **OA-1 à OA-5 et OA-7 à
OA-13 toujours ✅. OA-6 est maintenant ❌**, mais pour une raison étrangère à 026-060 : la partie
« `npm run typecheck` » de OA-6 échoue avec `lib/siteRedacteur.ts(21,7): error TS2322: Type
'string' is not assignable to type 'number'`. Ce fichier est **sans rapport avec la fiche 026-060**
(fiche 026-093, rédaction des sites, non suivi par git — `??` au statut), n'a jamais été lu ni
touché par cette contre-vérification, et n'apparaît dans aucun des fichiers listés par la fiche.
C'est très probablement l'effet d'une session concurrente sur ce dépôt (mémoire « Presti —
sessions concurrentes ») survenue entre le PASS de 08:16 et ce rejeu de 11:15. La partie de OA-6
propre à 026-060 (« chaque méthode de `MagasinSocle` dans `magasinSupabase.ts` appelle une fonction
`acq_` du SQL ») n'est pas mise en cause : ce fichier n'a pas changé (sha256 identique, § 5) et le
script ne rapporte aucune anomalie sur son contenu, seulement l'échec du typecheck global. Signalé
séparément (hors du périmètre autorisé pour cette contre-vérification), sans y toucher.

## 5. Intégrité des fichiers de la fiche

Aucun fichier hors `.orchestre/preuves/026-060/` et `.orchestre/travail/` n'a été modifié par ce
contre-vérificateur (lecture seule partout ailleurs). `sha256sum` des trois fichiers-clés,
inchangés depuis leur lecture initiale :

```
fa7a738ba27145a0d1818613fdad31379d49dac108bc488ab60b1f03ffbe583  supabase/migrations/0105_acquisition_socle.sql
ecf23c133b3cdc41d65d534de1e238f174fe988b433a3e0048cefe0a0b7c5b0  supabase/controles/0105_acquisition_socle.sql
e140ef2c0b252f27dab1f88bcab612e9171ecd3ed30c181d533850475cd074c  lib/agents/acquisition/magasinSupabase.ts
```

## 6. Verdict

**vert = true.** Les quatre catégories d'attaque exigées (droits anon/authenticated par exécution
réelle, contraintes, rejouabilité, cas limites de la fiche) ont toutes été refusées comme attendu
avant application ; le contrôle `supabase/controles/0105_acquisition_socle.sql` rejoué après
application répond « oui » sur ses 22 lignes ; la migration est bien appliquée sur
`gorcdvmueakcncsmrouo` (`apply_migration`, jamais collée par Benj) ; aucun fichier hors du périmètre
autorisé n'a été touché.

**Réserve, hors périmètre de 026-060 :** le rejeu du juge statique après application montre OA-6
maintenant rouge (§ 4), mais uniquement à cause d'une erreur de typecheck dans
`lib/siteRedacteur.ts` — un fichier d'une autre fiche (026-093), non suivi par git, jamais touché
ici, très probablement modifié entre-temps par une session concurrente. Cela ne remet pas en cause
le verdict sur 026-060 (la migration, son contrôle et `magasinSupabase.ts` restent conformes), mais
mérite d'être corrigé séparément avant de considérer le dépôt entièrement vert.
