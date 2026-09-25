# 025-13 — essai à sec sur la vraie base (24/09/2026, Claude Code)

Projet `gorcdvmueakcncsmrouo` (presti, vérifié par `list_projects`). Connecteur Supabase, `execute_sql` seulement, rôle `postgres`, jamais `apply_migration`. Un seul bloc `do $essai$ … raise exception 'ESSAI_A_SEC %'` : tout est annulé.

## Le bloc exécuté

- Fabriqué depuis les fichiers du dépôt, jamais retapé : `node .orchestre/travail/025-13-juges/essai/generer-bloc.mjs --sortie=.orchestre/preuves/025-13/bloc-essai.sql`.
- Fichier : `.orchestre/preuves/025-13/bloc-essai.sql` (58 791 octets).
- sha256 du fichier : `26fe5fd3272cdac6286a4f70c1e17aa908816f9ce485cc0511fefa683c7f554c`.
- `sha256_bloc_recu` calculé par la base (pied « -- source » ôté par le bloc) : `26fe5fd3272cdac6286a4f70c1e17aa908816f9ce485cc0511fefa683c7f554c`. **Identiques.**
- Nus coupés à la marque : 0093 `7c8ae4ef…`, 0094 `07d64ca7…`, 0095 `0bea561b…`, égaux à `attendu.json`.
- Ce bloc est le même, octet pour octet, que celui du témoin (`.orchestre/travail/025-13-juges/essai/bloc.sql`). C'est normal : les nus ne gardent pas les commentaires, et les contrôles de 025-13 sont ceux du témoin. Seuls les en-têtes en commentaire de 0094 et 0095 diffèrent, et ils ne passent pas dans les nus. L'essai a quand même été rejoué ici, sur la production d'aujourd'hui.

## Verdict par étape

| Étape | Attendu | Obtenu | Verdict |
|---|---|---|---|
| Prod avant | empreintes connues | maj `c7fa1494…`, ins `f7575c7d…`, fonction d'appoint absente, 0 compte et 0 ligne `essai-0095` | OK |
| A. contrôles sur la prod | 0093 non collée, 0094 collée, 0095 absente | c93 `nnnno` (seul le déclencheur dit oui), c94 26 × `o` (**0094 est déjà en production**), c95 `nnnnnnnnoo` (seuls les deux déclencheurs disent oui) | OK |
| B. comptes d'essai | 2 lignes | 2 | OK |
| C1. avant, mise à jour hostile | passe | credits_offerts 5000, created_at 2020-01-01, email `pirate-0095@…`, site_contenu_le et connexion_verifiee_le à null : **tout passe** (le trou existe en prod) | OK (trou prouvé) |
| C2 / C3. avant, inscriptions hostiles | passent | « www » accepté, ancienne adresse d'un autre acceptée | OK (trou prouvé) |
| D. nus 0093, 0094, 0095 | sans erreur | exécutés sans erreur | OK |
| E. contrôles après | tout oui | c93 `ooooo`, c94 26 × `o`, c95 10 × `o` | OK |
| F1. après, même mise à jour hostile | la bio change, les 5 colonnes non | bio `essai-F1` ; credits_offerts 0, created_at 2026-09-01, site_contenu_le 2026-09-01, connexion_verifiee_le 2026-09-01, email d'origine | OK |
| F1b. service_role | écrit les 5 colonnes | credits_offerts 7, email `serveur-0095@…`, site_contenu_le null, connexion_verifiee_le 2026-09-24 | OK |
| F. mots réservés | les 28 de `lib/urls.ts` refusés | 28/28 refusés (23514, « Cette adresse est réservée : choisissez-en une autre. »), « WWW » aussi | OK |
| F. slugs normaux | acceptés, colonnes de 0094 forcées | 7/7 acceptés (dont `www-rozv`, `admin-036j`, `site-vc0w`, `faq-r1uy`) ; site_active false, credits_offerts 0, role_interne null, created_at = now() | OK |
| F. ancienne adresse d'un autre | refusée | refusée (23505, « Cette adresse est déjà utilisée : essayez-en une autre. »), à l'inscription et à l'upsert rejoué | OK |
| F. à un caractère près | acceptée | 2/2 acceptées (un caractère en plus, un en moins) | OK |
| F. upsert rejoué avec sa propre ancienne adresse | accepté | accepté ; slug et date d'inscription gardés (verrou de mise à jour) | OK |
| F7. service_role crée une ligne privilégiée | rien de forcé ni refusé | site_active true, credits_offerts 50, role_interne partenaire | OK |
| G. contrôles exécutés par Postgres sur les mutants, comparés au simulateur du juge | 0 écart | 300 comparaisons (bases LF et CRLF, 7 mutants par affectation, 2 refus retirés, 18 déclencheurs mutés), **0 écart** | OK |
| Prod après (lecture seule, 20:28 UTC) | rien ne reste | maj `c7fa1494…`, ins `f7575c7d…` (inchangées), `slug_ancien_d_un_autre` absente, 0 compte `essai-0095-%`, 0 ligne, 0 table temporaire | OK |

Contre-vérification du résultat brut par script (attendus lus dans `attendu.json` et `lib/urls.ts`) : 22 vérifications vertes sur 22.

## Choix pour email

**email est figée à `old.email`.** Aucun chemin légitime du navigateur ne change `artisans.email` :

- aucun `supabase.from('artisans').update|upsert` hors inscription n'envoie `email` ;
- aucun `supabase.auth.updateUser({ email })` ;
- `app/parametres/page.tsx` ne fait qu'afficher l'adresse ;
- l'inscription (`app/onboarding/page.tsx`) envoie l'adresse de la session, à l'insertion, qui n'est pas figée ;
- la purge (`lib/purgeComptes.ts`) passe par `service_role`.

`verrou-maj-qa` (VM-1) refait cette vérification sur les 326 fichiers de app/ et lib/.

## Ordre de collage (Benj)

1. **0094 : rien à coller, elle est déjà en production** (étape A : 26 « oui »). Seuls ses commentaires ont changé. Pour le vérifier, colle seulement `supabase/controles/0094_insertion_figee.sql` : 26 lignes, toutes « oui ».
2. **Après le déploiement de 025-05, jamais avant :**
   - d'abord `_A_COLLER_sql_editor_0093_NU.sql` ; son contrôle en pied répond « oui » sur ses 5 lignes ;
   - puis `_A_COLLER_sql_editor_0095_NU.sql` ; son contrôle en pied répond « oui » sur ses 10 lignes.

   C'est exactement l'étape D de cet essai. 0095 reprend le corps de 0093 : la coller ferme aussi les colonnes du site. Elle ne se colle donc jamais avant 025-05.
3. Quand c'est bon :
   - 0093 : 4 lignes de colonnes + 1 ligne de déclencheur ;
   - 0094 : 25 + 1 ;
   - 0095 : 5 colonnes + 2 refus + la fonction d'appoint + 2 déclencheurs.

   Toutes disent « oui ». Un « NON (… pas collée) » veut dire que le mauvais fichier est en place. Un « NON (anormal) » veut dire qu'un déclencheur est débranché : dans les deux cas, s'arrêter et prévenir.

## Résultat brut

Il est dans `.orchestre/preuves/025-13/essai-resultat.json`, recopié de l'erreur `P0001: ESSAI_A_SEC {…}` rendue par la base. Extrait :

```
A  {"c93": "nnnno", "c94": "oooooooooooooooooooooooooo", "c95": "nnnnnnnnoo"}
E  {"c93": "ooooo", "c94": "oooooooooooooooooooooooooo", "c95": "oooooooooo"}
C1 {"bio": "essai-C", "email": "pirate-0095@presti-test.invalid", "lignes": 1, "created_at": "2020-01-01T00:00:00+00:00", "credits_offerts": 5000, "site_contenu_le": null, "connexion_verifiee_le": null}
C2 "accepté"   C3 "accepté"
F1 {"bio": "essai-F1", "email": "essai-0095-6c296d27-…@presti-test.invalid", "lignes": 1, "created_at": "2026-09-01T00:00:00+00:00", "credits_offerts": 0, "site_contenu_le": "2026-09-01T00:00:00+00:00", "connexion_verifiee_le": "2026-09-01T00:00:00+00:00"}
F1b {"email": "serveur-0095@presti-test.invalid", "credits_offerts": 7, "site_contenu_le": null, "connexion_verifiee_le": "2026-09-24T00:00:00+00:00"}
F7 {"site_active": true, "role_interne": "partenaire", "credits_offerts": 50}
G  {"ecarts": [], "comparaisons": 300}
sha256_bloc_recu 26fe5fd3272cdac6286a4f70c1e17aa908816f9ce485cc0511fefa683c7f554c
sha256_maj_prod  c7fa1494cba61cc2766a0ab97c38f375183e3e4a52bf369c2d8c84f9d7e276d2
sha256_ins_prod  f7575c7d0b386d2ec8a955d4ce1bf5b08f76e9c6beef5e189a05a4df180e7b19
```
