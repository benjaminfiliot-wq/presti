# Essai à sec — 026-060 (migration 0105_acquisition_socle)

Projet Supabase : `gorcdvmueakcncsmrouo`. Outil : MCP Supabase `execute_sql` (jamais `apply_migration`).
Date : 28 septembre 2026.

## Bloc joué

Un seul énoncé `do $essai_026_060$ … end $essai_026_060$;`, texte complet dans
`.orchestre/preuves/026-060/essai-a-sec.sql` (663 lignes) :

1. `execute $migration_essai_026_060$ … $migration_essai_026_060$;` — la migration
   `supabase/migrations/0105_acquisition_socle.sql` **entière**, telle quelle (les colonnes
   ajoutées à `ops.prospects`, les tables `ops.annonceurs` et `ops.curseurs`, les 14 fonctions —
   les 13 du socle plus `acq_transition_valide` —, et les 15 graines d'agents).
2. Les requêtes du contrôle `supabase/controles/0105_acquisition_socle.sql` (les mêmes, mot pour
   mot, collées dans une sous-requête `c(quoi, resultat)`), avec un `raise exception` portant le
   message `ESSAI_A_SEC_CONTROLE_ECHEC` si une seule ligne ne rend pas `'oui'`.
3. `raise exception using message = 'ESSAI_A_SEC_OK', errcode = 'P0001';` — toujours levée si l'on
   arrive jusque-là, pour annuler tout ce qui précède (le bloc entier est une seule instruction :
   l'exception non rattrapée fait échouer, et donc annuler, toute la transaction implicite).

## Résultat de l'appel `execute_sql`

```
ERROR:  P0001: ESSAI_A_SEC_OK
CONTEXT:  PL/pgSQL function inline_code_block line 661 at RAISE
```

C'est exactement le message attendu (`ESSAI_A_SEC_OK`, pas `ESSAI_A_SEC_CONTROLE_ECHEC`) : la
migration entière s'est appliquée sans erreur, **puis** chaque ligne du contrôle a répondu `oui`,
**puis** tout a été annulé par l'exception finale. Aucun `COMMIT` n'a eu lieu à aucun moment.

## Zéro trace, vérifié ensuite (nouvel appel `execute_sql`, en lecture seule)

Après l'essai, une requête séparée relit la base réelle et rend `true` pour chacun des 18 tests
suivants (aucune des lignes n'a persisté) :

| Vérifié | Résultat |
|---|---|
| `to_regclass('ops.annonceurs')` est nul | `true` |
| `to_regclass('ops.curseurs')` est nul | `true` |
| `to_regprocedure('public.acq_en_pause(text)')` est nul | `true` |
| `to_regprocedure('public.acq_candidats_enregistrer(jsonb)')` est nul | `true` |
| `to_regprocedure('public.acq_reserver(text, integer, integer)')` est nul | `true` |
| `to_regprocedure('public.acq_prospect_mettre_a_jour(uuid, text, text, jsonb)')` est nul | `true` |
| `to_regprocedure('public.acq_oppose(jsonb)')` est nul | `true` |
| `to_regprocedure('public.acq_opposer(jsonb, text, text, timestamptz)')` est nul | `true` |
| `to_regprocedure('public.acq_annonceurs_enregistrer(jsonb)')` est nul | `true` |
| `to_regprocedure('public.acq_evenement(text, text, text, uuid)')` est nul | `true` |
| `to_regprocedure('public.acq_purger()')` est nul | `true` |
| `to_regprocedure('public.acq_curseur_lire(text)')` est nul | `true` |
| `to_regprocedure('public.acq_curseur_poser(text, text)')` est nul | `true` |
| `to_regprocedure('public.acq_jeton_meta_poser(text, timestamptz)')` est nul | `true` |
| `to_regprocedure('public.acq_jeton_meta()')` est nul | `true` |
| `to_regprocedure('public.acq_transition_valide(text, text)')` est nul | `true` |
| Colonne `ops.prospects.etape` absente | `true` |
| Aucun des 15 agents n'est semé dans `ops.agents` | `true` |

## Juge statique (avant l'essai à sec)

`node scripts/ops-acquisition-qa.mjs --migration=socle` → **PASS** (OA-1 à OA-13), y compris
`npm run typecheck` (appelé par OA-6). Sortie complète : `.orchestre/preuves/026-060/verifier.log`.

## Conclusion

Un essai à sec a tourné sur la production (`gorcdvmueakcncsmrouo`), en une seule transaction
annulée par construction. La migration 0105 est prête à être appliquée par le connecteur Supabase
(`apply_migration`) — geste que cet exécutant n'a **pas** fait, conformément à la consigne : c'est
Claude qui applique après contre-vérification.
