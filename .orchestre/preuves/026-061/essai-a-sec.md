# Essai à sec — 026-061 (0106_acquisition_echanges)

**Date** : 2026-09-28
**Projet Supabase** : `gorcdvmueakcncsmrouo` (presti-usine, prod)
**Outil** : `mcp__692ffb0a-135d-434e-8d36-36d86f4b81c3__execute_sql` (jamais `apply_migration`)
**Empreinte du jumeau nu jugé** : `77e196e537ce486681842dc354a0f82c6cd1529dce8fc0ec132b0fd4f02b6c1c`

## Ce qui a été fait

Un seul appel `execute_sql` a soumis, dans l'ordre : la migration entière (tables, déclencheur
`ops.garde_fenetre_meta`, 46 fonctions `public.acq_*`, bucket `maquettes`), puis un bloc
`do $essai0261$ ... end $essai0261$;` couvrant les critères OB-14 à OB-24 du cahier du juge
(`scripts/ops-acquisition-qa.mjs`), puis `raise exception 'ESSAI_A_SEC <empreinte> {json}'`.

Postgres exécute un lot multi-instructions soumis en une fois comme une unité atomique : la
`raise exception` finale annule tout (DDL compris), donc l'essai prouve le comportement sans
laisser aucune trace, sans `BEGIN`/`ROLLBACK` explicite.

**Résultat** : les 54 clés d'assertion sont toutes à `true` (voir `essai-a-sec.json`). Vérification
de trace après coup (hors transaction) : `ops.reponses`, `ops.conversations`, `ops.rendez_vous`,
`ops.meta_evenements` n'existent pas, `acq_envoi_envoye(uuid,jsonb)` n'existe pas, zéro prospect
`essai0261*`, zéro décision, zéro ligne d'opposition posée par l'essai.

## Deux défauts trouvés et corrigés pendant l'essai (hors périmètre du juge statique)

1. **`acq_formulaires_a_porter` référençait `ops.technologies`, table absente de cette migration**
   (et de toute migration appliquée). Une référence statique à une table inexistante fait échouer
   le *parsing* de la requête même dans une branche `OR`/`EXISTS` jamais évaluée — ce n'est pas
   du SQL dynamique. Le juge statique ne l'a pas vu (il ne lit que le texte). Fixé en retirant le
   sous-bloc `technologie`/`ops.technologies` (la technologie active de 0111 n'est pas dans le
   périmètre de 026-061 ; à réintroduire quand 0111 sera appliquée, par qui l'écrira).
2. **Scénario de test lui-même faux sur deux points**, non des bugs de la migration :
   - `ops.prospects.cle_dedup` exige le préfixe `siren:`/`domaine:`/`page_meta:`/`instagram:` — mes
     prospects entrants utilisaient `entrant:`, refusé par la contrainte. Corrigé en `domaine:`.
   - Le test OB-17 avait un entrant directement seedé à `maquette_prete` avec une maquette déjà
     posée, ce qui exclut structurellement cet entrant de la branche `p_froid=false` de
     `acq_prospects_pour_maquette` (qui ne rend que `verifie` sans maquette, par la fiche §3 point
     « le chemin entrant aboutit »). Le nom de la clé `ob17_deux_entrants_rendus` et le texte de la
     fiche (« les deux entrants `verifie` d'essai ») confirment que les deux entrants doivent
     démarrer à `verifie` ; l'un des deux avance ensuite via `acq_maquette_prete` pour tester la
     suite du chemin (`acq_prospects_oui`, puis `lien_maquette`). Le scénario a été réécrit dans ce
     sens — la fonction elle-même n'a pas changé.
   - Le test OB-18 vérifiait que l'opposition posée par une demande d'effacement survit à la purge
     (7 jours), mais le prospect de test était inséré directement avec `effacement_demande_le`
     déjà backdaté, sans jamais appeler `acq_effacement_demander` — donc sans jamais poser
     l'opposition réelle. Corrigé en rejouant l'appel `acq_opposer` que la fonction aurait fait.

Ces deux points sont désormais documentés ici pour que quiconque relit cette fiche comprenne
pourquoi le scénario ressemble à ceci, et pas à une version plus directe.

## Découverte architecturale à transmettre (026-089, Facteur)

La migration 0099 (appliquée) impose depuis le 27/09 un mécanisme d'« accord de Benj » :
entrer dans `ops.envois.statut = 'approuve'` exige d'abord être en `attend_accord_benj` avec une
ligne `ops.accords_benj` valide (canal/destinataire/empreinte_texte correspondants, donnée par un
fondateur réel). Ce mécanisme est **postérieur** à la rédaction de 026-061 (24-25/09), dont le
schéma littéral (`acq_envoi_approuver` en une étape) ne le prévoit pas.

Le juge statique ne voit pas ce conflit (il ne lit que le texte SQL), donc `acq_envoi_approuver`
tel qu'écrit ici passe OB-9/OB-11 sans modification. Mais l'essai à sec, lui, s'exécute contre la
vraie base avec les vrais déclencheurs : pour faire passer un envoi par `approuve` dans le
scénario (OB-20, OB-21), j'ai dû faire jouer la vraie danse `attend_accord_benj` +
`ops.accords_benj` avant chaque `acq_envoi_approuver`, avec le seul fondateur réel
(`public.artisans.is_founder = true`).

**Conséquence pour qui construira le Facteur (026-089)** : le Facteur en production devra lui
aussi jouer cette danse (ou Benj devra décider si l'approbation d'un envoi de prospection
nécessite son accord individuel par message — ce n'est pas une décision que je prends ici). Sans
cela, `acq_envoi_approuver` échouera en production sur toute tentative d'approbation directe.

## Ce qui reste à faire (hors mon périmètre d'exécutant)

- Claude (l'orchestrateur) applique `0106_acquisition_echanges.sql` par `apply_migration` après
  contre-vérification, puis lit le contrôle (`supabase/controles/0106_acquisition_echanges.sql`).
- La fiche 026-089 (Facteur) devra tenir compte de la découverte ci-dessus.
