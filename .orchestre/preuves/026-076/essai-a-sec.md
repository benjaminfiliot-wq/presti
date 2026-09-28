# 026-076 — essai à sec de 0107_pilotage_lecture.sql

Migration écrite, jumeaux (`_A_COLLER_sql_editor_0107.sql`, `_A_COLLER_sql_editor_0107_NU.sql`) et contrôle
(`supabase/controles/0107_pilotage_lecture.sql`) générés. `pilotage-sql-qa.mjs --migration=lecture` (statique) :
**SQ-1 à SQ-8 et SQ-10 verts.** Essai à sec exécuté sur la production (gorcdvmueakcncsmrouo) par le MCP Supabase
`execute_sql`, dans un bloc `do $essai_026$ … raise exception 'ESSAI_A_SEC …' … end;` qui annule tout ce qu'il fait —
confirmé après coup par `select to_regprocedure('public.pilotage_decisions(integer)') is null` → `true` (aucune trace).

Sortie brute complète : `.orchestre/preuves/026-076/essai-a-sec.txt`.

## Résultat : 17 clés sur 19 à `true`

Les deux clés à `false` (`code_ok_relu`, `agents_dernier_evenement`) ont été creusées une par une, avec des essais
isolés séparés (donc sans laisser de trace non plus), jusqu'à une explication complète. **Aucune des deux n'est un
défaut de la migration** — les deux sont un défaut du scénario (`scripts/fixtures/026-pilotage/b/scenarios-sql.mjs`,
critère SQ-9 de la fiche, écrit en 026-066), qui est hors de mon périmètre 026-076 (`scripts/fixtures/**` est listé
`interdit`) : je ne peux ni le corriger ni le contourner dans la migration sans désobéir au contrat de la fiche.

### 1. `code_ok_relu` — un artefact de Postgres, pas de la migration

Le cas du scénario (lignes ~230-236 de `scenarios-sql.mjs`) :
```sql
ok := public.pilotage_code_publier('{"essai": true, "n": 1}'::jsonb) = 'ok'
  and (select etat from public.pilotage_code_lire()) = '{"essai": true, "n": 1}'::jsonb;
```
Ceci combine, DANS UNE SEULE expression PL/pgSQL, un appel qui écrit (`pilotage_code_publier`, insère la ligne) et un
appel `stable` qui lit (`pilotage_code_lire`). Postgres fixe l'instantané (`ActiveSnapshot`) de toute l'expression
avant d'exécuter les deux appels : la lecture ne voit jamais l'écriture faite par le premier appel PENDANT LA MÊME
instruction — même si c'est la même transaction, le même agent, la même seconde.

**Preuve que ce n'est ni `pilotage_code_publier` ni `pilotage_code_lire` qui sont en cause :**
- Appelés l'un après l'autre en DEUX instructions séparées (ce que fait réellement toute route HTTP — publier puis,
  dans un AUTRE appel, relire), le couple fonctionne parfaitement : `ret='ok'`, `etat_lu={"n":1,"essai":true}`,
  identique à ce qui a été publié.
- Reproduit à l'identique avec deux fonctions jetables sans AUCUN rapport avec 0107 (pas de schéma `ops`, pas de
  `security definer`, juste une table temporaire et deux fonctions triviales) :
  ```sql
  ok := pg_temp.ecrit() = 1 and pg_temp.lit() = 1;  -- ok = false
  select count(*) into v_n from t_diag3;              -- v_n = 1 (la ligne EST là)
  ```
  Même résultat : `ok=false` alors que la ligne existe bel et bien. C'est un comportement de Postgres pour toute
  paire écriture-puis-lecture combinée dans une même expression, pas quelque chose que ma migration peut changer.

### 2. `agents_dernier_evenement` — le scénario ne trace pas tous ses propres événements

Le cas attend :
```sql
ok := exists (... nom = 'essai_e2e_pl2' and dernier_type is null)
  and exists (... nom = 'essai_e2e_pl1' and dernier_type = 'essai_fait' and dernier_resume = 'Essai fait par un');
```
Mais **après** avoir posé l'événement `essai_fait` pour `essai_e2e_pl1`, le même bloc de préparation enchaîne :
```sql
for i in 1..7 loop
  select id into v_id from public.ops_decision_creer('essai_e2e_pl1', 'Décision d''essai ' || i, …);
  …
end loop;
```
Or `ops_decision_creer` (0098_ops_taches.sql, déjà appliquée, hors de mon périmètre) insère systématiquement un
événement `decision_creee` pour l'agent appelant :
```sql
insert into ops.evenements (agent, type, objet, resume, tache_id)
values (p_agent, 'decision_creee', 'decision:' || v_id, …);
```
Sept décisions créées par `essai_e2e_pl1` **après** `essai_fait` → sept événements `decision_creee` de plus pour ce
même agent, tous plus récents. Le vrai dernier événement non-`battement` de `essai_e2e_pl1` est donc le dernier
`decision_creee`, pas `essai_fait`. Le scénario n'en tient pas compte.

Le contrat de la fiche (section « Contrat », ligne `pilotage_agents()`) est pourtant explicite et sans ambiguïté :
« `dernier_*` = son dernier événement **autre que battement** (nuls s'il n'en a aucun) ». Rien d'autre n'est à
exclure. `pilotage_agents()` suit ce contrat à la lettre — et le fait à raison : un agent qui vient de créer sept
décisions, c'est précisément « ce qu'il fait en ce moment » (§4.0 du contexte de la fiche), l'information que la
station doit montrer.

J'ai testé une hypothèse alternative (exclure aussi `agent_enregistre`, l'événement posé à l'enregistrement de
l'agent) : ça corrige la moitié du symptôme (pl2 aurait `dernier_type` nul) mais casse l'autre moitié encore plus
franchement, puisque le dernier événement RÉEL de pl1 reste un `decision_creee`, jamais `essai_fait`. Ce n'est pas
la bonne piste : je l'ai annulée (`git diff` sur la migration ne porte plus cette exclusion).

## Ce qu'il faudrait pour un essai tout vert

Corriger le scénario (hors de mon périmètre) : soit déplacer l'assertion `agents_dernier_evenement` avant la boucle
des sept décisions, soit choisir un `dernier_resume` attendu qui corresponde à la dernière décision créée ; et
scinder le cas `code_ok_relu` en deux instructions PL/pgSQL séparées (publier, PUIS — nouvelle instruction — lire),
au lieu d'une seule expression combinée.

## Décision de Benj (28/09) : option 1 — corriger le scénario

Réponse à `.orchestre/preuves/026-076/question.md` : `.orchestre/preuves/026-076/reponse.md` (option 1, déposée via
`node scripts/orchestre.mjs repondre 026-076 1`). Correction explicitement autorisée sur
`scripts/fixtures/026-pilotage/b/scenarios-sql.mjs` malgré `scripts/fixtures/**` listé `interdit` au périmètre
026-076 — l'autorisation vient de cette décision, pas d'une réécriture du périmètre.

### Ce qui a été corrigé

1. **`agents_dernier_evenement` déplacée avant la boucle** : la capture (nouvelle variable `v_ade`, remplie par un
   `select … into` séparé) se fait juste après avoir posé `essai_fait` + les deux `battement` de préparation, avant
   la boucle des sept `ops_decision_creer`. Le dernier événement non-battement de `essai_e2e_pl1` à cet instant est
   bien `essai_fait`, comme prévu.
2. **Un deuxième défaut découvert en testant le point 1** : `ops_agent_enregistrer` (0097, hors périmètre) pose
   TOUJOURS un événement `agent_enregistre` à l'enregistrement d'un agent — donc `essai_e2e_pl2`, même déplacé avant
   la boucle, n'a jamais `dernier_type is null` : son dernier événement réel est `agent_enregistre`. Ce n'était pas
   dans l'énoncé de la correction demandée, mais le premier essai à sec après la correction du point 1 l'a rougi
   quand même (`agents_dernier_evenement: false`) — creusé avec un diagnostic ajouté au scénario
   (`diag_agents_dernier_evenement`, valeurs réelles observées), corrigé dans le même esprit : l'attente de pl2
   passe de « `dernier_type is null` » (une situation qu'aucun agent de cette fixture n'atteint jamais, puisque
   l'enregistrement pose toujours un événement) à « `dernier_type = 'agent_enregistre'`, `dernier_resume = 'fiche
   créée : Essai pilotage deux'` » — la valeur réellement rendue par un `pilotage_agents()` qui suit le contrat à la
   lettre. Le contrat lui-même n'est pas touché (« nuls s'il n'en a aucun » reste vrai, juste jamais atteint ici).
3. **`code_ok_relu` scindé en deux instructions PL/pgSQL** : `v_pub := pilotage_code_publier(...)` puis, en une
   instruction séparée, `select etat into v_lu from pilotage_code_lire()`, puis `ok := v_pub = 'ok' and v_lu = …`.

### Essai à sec rejoué : 19/19 à `true`

Sortie brute complète (nouvelle) : `.orchestre/preuves/026-076/essai-a-sec.txt`. `APRES rien_ne_reste=true` — aucune
trace laissée, comme pour tous les essais de cette fiche.

### Preuve que la correction n'affaiblit rien (sabotage → SQ-9 rougit toujours)

Rejoué une deuxième fois, migration réelle + scénario corrigé, mais avec deux fonctions volontairement sabotées
juste après la création des treize fonctions de 0107 (dans la même transaction annulée) : `pilotage_agents()` sans
le filtre anti-`battement`, et `pilotage_code_lire()` qui ne renvoie plus jamais de ligne. Résultat : **exactement**
les deux clés visées par la correction rougissent (`code_ok_relu=false`, `agents_dernier_evenement=false` — le
diagnostic montre `dernier_type='battement'` pour pl1 ET pl2, confirmant le mécanisme du sabotage), les 17 autres
restent à `true`, y compris `agents_cout_mois`, `agents_modele`, `agents_modele_vieux`, `agents_retire_absent` qui
appellent aussi `pilotage_agents()` mais sur d'autres colonnes, non touchées par le sabotage. Sortie brute complète :
`.orchestre/preuves/026-076/sabotage-preuve.txt`. La correction du scénario teste donc toujours la substance : un
vrai défaut de migration sur ces deux points continuerait de rougir SQ-9.

## Conclusion

La migration `0107_pilotage_lecture.sql` est correcte au regard du contrat de la fiche (SQ-1 à SQ-10 : **PASS**,
essai à sec 19/19). Statut rendu : **PRET_A_APPLIQUER** — Claude Code applique lui-même par `apply_migration`, après
contre-vérification, jamais cette session.
