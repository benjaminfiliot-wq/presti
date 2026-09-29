# 026-079 — réponse du chef (Claude Code, 29/09)

## Décision
**Option 1**, menée jusqu'au bout sur le PC : juge SE-12 corrigé, scénario du juge corrigé, essai à sec exécuté par moi
(`execute_sql`, MCP Supabase) puis migration appliquée (`apply_migration`). La question 2 (« fournir une version révisée de
0106, 0111 ») est sans objet : 0106 et 0111 sont déjà appliquées en production et leur contrat est celui que 0108 lit.
Une seconde session du chef a repris la fiche en parallèle (verifier, `apply_migration` rejoué : deux lignes
`0108_pilotage_echanges` dans `schema_migrations`, 10:34 et 10:39 UTC, sans effet : `create or replace`, même état, md5
13/13 relu) et a commité 4569c846 ; ce fichier remplace sa version courte par le détail.

## Les deux constats de Codex, tous deux exacts
1. **SE-12 (faux rouge).** La regex cherchait le mot `technologies` n'importe où dans le corps de `pilotage_etat_envoi`, donc
   aussi la clé JSON `j->'technologies'` que `acq_etat_envoi()` rend. Or lire cette clé, c'est ce que le contrat demande
   (« déplie acq_etat_envoi() sans rien recalculer »). Corrigé (`scripts/pilotage-sql-qa.mjs`, fiche 026-066, ici sous le
   périmètre élargi de 026-079) : la clé entre apostrophes ne compte plus ; une jointure, une virgule ou un sous-select sur
   `ops.technologies` / `ops.interrupteurs` (qualifiés ou non) fait toujours échouer SE-12. Exigence gardée, **trois
   sabotages** de la migration rejoués : `, ops.interrupteurs i2`, `join ops.technologies t2 on true`, `, technologies t3`
   → SE-12 rouge dans les trois cas (la première correction, fondée sur les seules clauses from/join, laissait passer la
   jointure par virgule : durcie avant l'essai à sec).
2. **Scénario SE-9 (contrats JSONB).** `acq_plafond_du_jour` et `acq_envois_du_jour` rendent du JSONB `{envois, nouveaux}`
   (0106), pas des entiers. La migration lisait déjà `->>'envois'` ; c'est le scénario du juge qui comparait des entiers à
   du JSONB : la comparaison porte maintenant sur `->>'envois'`, un canal fermé valant 0.

## Ce que l'exécution réelle du scénario a révélé (il n'avait jamais tourné : « écrit sans pouvoir être exécuté »)
Cinq défauts propres au scénario, corrigés dans `scripts/fixtures/026-pilotage/b/scenarios-sql.mjs` :
- `ops.prospects.cle_dedup` doit valoir `siren:…` / `domaine:…` ; `faits` est un tableau JSON ; la commune est une colonne ;
- `ops.envois.prepare_par` référence `ops.agents(nom)` : `facteur`, agent réel (l'essai est annulé) ;
- `garde_envois` (0099) date tout envoi à `now()` à l'insertion : impossible d'antidater « hier » et « il y a 40 jours » sans
  mettre les déclencheurs de côté (`set local session_replication_role = replica`, rétabli aussitôt, dans la transaction
  annulée) ;
- `public.acq_ventes_froides` prend `p_depuis` ; `sites_commandes` a `etat` (pas `statut`) et `email` obligatoire ;
- `= any((select technologies_pause …))` : tableau mal formé ; et l'état du bilan doit être vidé (réponses puis envois) avant
  de compter 101 contacts froids.

## Ce que la contre-vérification a trouvé dans la migration de Codex (trois défauts réels, corrigés dans 0108)
1. **`pilotage_appels` ne compilait pas** : dans l'union des deux sources, les colonnes sans alias (`'rdv'::text`…) prennent
   le nom `text` ; le SELECT extérieur lisait `a.source`. Erreur constatée au premier essai à sec (`42703 column a.source
   does not exist`). Colonnes nommées dans les deux branches.
2. **« Intéressé » : une classe qui n'existe pas.** `oui`, dans l'entonnoir, le bilan et les tapis, comptait la classe
   `'interesse'`, que ni le classeur de 0106 ni 0111 ne posent. 0111 définit déjà la réponse positive (`reponses_300` :
   `oui`, `question`, `prix`, `appel`) : 0108 la reprend, une seule définition (« deux chiffres, un écran »).
3. **Plafond d'un canal fermé.** `plafond` rendait null quand la ligne de quota n'existe pas (instagram, facebook), alors que
   le contrat dit « plafond 0 à froid » ; `coalesce(…, 0)` sur le plafond et les usages.

## Ce qui reste tel quel, en connaissance de cause
- `pilotage_compteurs_technologies().envois_jour` est nul : `ops.technologies` ne porte pas ce compteur et le recompter est
  interdit par SE-5 (un seul compteur, celui de l'acquisition, par canal et non par technologie).
- `pilotage_compteurs_du_jour().echecs_affilee` est nul : la source (santé par canal) n'existe pas encore (026-015).
- Le scénario « état de l'envoi » passe trivialement sur `mesure_a_sec` : la base porte déjà l'événement du 28/09 (id 1505).
- Le commit 4569c846 emporte aussi, dans `scenarios-sql.mjs`, des corrections du 28/09 de 026-076 (agents, publication du
  code) qui traînaient non commitées dans le même fichier.

## Résultat
`pilotage-sql-qa --migration=echanges` : **PASS** SE-1 à SE-12 (SE-9 : 15 clés à true, rien ne reste ; SE-11 en `--reel`).
0108 appliquée, 13/13 md5 identiques, contrôle tout à « oui », zéro trace : voir `application-2026-09-29.md`.
