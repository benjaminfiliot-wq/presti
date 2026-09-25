---
name: postgrest-jointure-ambigue
description: "Une jointure supabase-js vers une table qui a plusieurs clés étrangères échoue en silence (PGRST201) — nommer la clé (table!colonne(...)) ; c'était le vrai défaut de la suspension « sans effet »"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-14T07:49:21.995Z
---

Le 14/09/2026, l'agent de la suite `suspension-e2e` a trouvé pourquoi la suspension d'un compte « n'avait pas d'effet » (prompt v15 §5, cherché à l'œil pendant des jours) : `select('…, suspensions!left(id, message, levee_le)')` échoue avec `PGRST201` (« more than one relationship was found ») parce que `suspensions` porte trois clés vers `artisans` (`artisan_id`, `suspendu_par`, `levee_par`). L'erreur est silencieuse : `maybeSingle()` rend `null`, le code lit « pas suspendu », l'artisan garde l'accès.

**Why:** un défaut qui ne lève rien ne se voit qu'avec un test qui reproduit le cas de bout en bout en production ; le code « avait l'air juste ».

**How to apply:** dès qu'une table a plusieurs clés vers la même cible, nommer la clé dans l'embed : `suspensions!artisan_id(id, message, levee_le)` (jointure gauche par défaut ; supabase-js refuse `!artisan_id!left`). Vérifier les embeds existants avec `grep -rn "!left(\|!inner(" lib app` et la liste des clés (`information_schema.table_constraints`). Et ne jamais traiter `error` d'une lecture comme « absent » : le journaliser. Voir [[presti-state]].
