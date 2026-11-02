## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** sur « n8n, détecteurs, relances, impayés, entretien » : rend la règle n8n-first (`architecture-outils`,
  ADR-001/008) et la note `source-restructureai-depots-n8n-0211` (dépôts de workflows : à étudier, jamais importés à l'aveugle). Effet :
  rien d'importé, tout écrit à la main dans `presti-detecteurs`. Second appel avant la lecture réelle (« une seule lecture réelle de
  connexion ») : aucune règle de plus ; j'ai appliqué celle de la tâche (chaîne coupée après la preuve, comme 032-003).
- **MCP `n8n-oracle`, `get_workflow_sdk_reference` (section `rules`)** : sa règle 2 déconseille `alwaysOutputData` par défaut. Effet :
  écart **justifié** ici. M10 (032-010) l'exige, parce que les détecteurs lisent les 18 lectures par `$('…')` et qu'une table vide (cas
  courant : aucune commande `commandee`) arrêterait la chaîne avant le bilan. Règle 3 (`executeOnce`) : posée sur les 3 lectures neuves.
- **MCP `n8n-oracle`, `get_workflow_best_practices`** (`scheduling` ; `monitoring`, sans fiche) : le passage à heure fixe reste idempotent
  (clés d'étape) ; le fuseau `Europe/Paris` est posé dans le workflow, pas dans un nœud Wait.
- **MCP `n8n-oracle`, `list_credentials`** (lecture seule) : `Supabase account`, deux `Slack account`, `OpenAI account`, **aucun
  identifiant Telegram**. Effet : la branche d'erreur ne contient aucun nœud d'envoi (les envois Slack sont interdits par la tâche, et
  le Telegram manque) ; elle prépare le message, et l'envoi attend Benj.
- **MCP `n8n-oracle`, `update_workflow`, `execute_workflow`, `get_workflow_execution`, `test_workflow`, `get_workflow_details`,
  `search_workflows`** : 7 versions écrites (workflow toujours inactif), la lecture réelle (exécution 333), deux essais fictifs (334 et
  335), l'export. `get_workflow_details` a été enregistré tel quel par le harnais, puis recopié par `node`, sans retouche.
- **Fiche méthode n8n** (`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md:31-32`, `:151-155`, `:167`) : un Error Trigger
  posé dans le workflow lui sert de workflow d'erreur par défaut, et ne part jamais sur une exécution manuelle ; il reçoit
  `execution.error.message`. Effet : « Message d échec » jette ce message, qui peut citer une ligne lue. Un workflow d'erreur commun
  « pour toute la flotte » (`:167`) serait un autre workflow, interdit par la tâche : il reste à poser (voir « Ce qui reste »).
- **Fiches des dépôts** (`fiches-depots.md:89-90`, `:102`) : un diagnostic d'erreur assaini, et l'écueil « Error Trigger posé, aucun
  workflow d'erreur désigné ». Effet : la garde commune accepte l'un ou l'autre (R3), mais exige qu'un Error Trigger soit relié à un nœud.
- **Vidéos déjà analysées** (`plans/analyse-videos.md:144` : « alerte e-mail à Benj en cas d'échec d'un workflow ») : c'est la source du
  rang 26 (plan §0 bis, l.108), que je respecte sans envoi dans ce lot.
- **Plan du chantier 4** (§0 bis rangs 1, 6, 8, 26 et « Règles communes », l.54-108, l.127-158 ; §9, l.583-602 ; §13 ; §14, l.837), les
  audits `032-010/rapport.md` (M1 à M12) et `032-016/rapport.md` (moyens 1 à 5), `032-012/resume.md`, le brief. Lus en entier.
- **Code et migrations relus** (aucun modifié) : `lib/relancesImpayes.ts:33,62,211-251`, `lib/apresChantier.ts:23-24,51,135-170`,
  `lib/pilote/regles.ts:53-83,251-271`, `lib/mentionAssistant.ts:14-17`, `lib/relances.ts:38`, `0159:59-66`, `0162:22-38`, `0165:32`,
  `0174:21-25`, `0157:31-50`, `0189:38-54`, `app/api/crm/apres-chantier/opposition/route.ts:43-44`.
- **Pas de skill chargé** : aucun skill de la session ne couvre n8n. `presti-verify` vise le cycle build et déploiement, interdit ici.
  La revue de sécurité est faite par les deux juges et leurs mutants. L'audit indépendant revient à un agent distinct (exigence de 032-010).

# 032-019 — lot L12 : détecteurs 11 et 12, défauts M de 032-010, garde commune n8n, lecture réelle

Fait le 02/11/2026 par Claude Code (Opus 5.5), sur l'hôte d'agents Oracle, dans le n8n d'Oracle par le MCP. `presti-detecteurs`
(`J8pduyxn9seR8Z9t`) reste **inactif** (`active: false`, `activeVersionId: null`). Aucun identifiant n'a été créé ni modifié, rien n'a
été écrit dans Supabase, aucun envoi n'est parti. Ni commit, ni build, ni migration. Le seul workflow touché est `presti-detecteurs`.

## Fichiers du périmètre

| Fichier | Changement |
|---|---|
| n8n `presti-detecteurs` | 34 → 41 nœuds : 14 codes réécrits, 2 détecteurs, 3 lectures, Error Trigger et « Message d échec » ; 7 versions |
| `scripts/detecteurs-n8n-qa.mjs` | 959 → 1 295 lignes : relit l'export de 032-019 ; M1 à M12, n° 11 et 12, rang 8 et rang 26 ; 49 → 95 mutants |
| `scripts/n8n-specs-qa.mjs` | neuf (242 lignes) : la garde commune R1 à R7, 33 mutants |
| `plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md` | colonnes et détecteurs mis à jour ; section « Lot L12 » |
| `.orchestre/preuves/032-019/` | `resume.md`, `presti-detecteurs.workflow.json` (l'export), `essai-n8n.json`, `juge-avant.mjs.txt` (le juge d'avant, pour le diff de l'audit), `verifier.log` |

## Les détecteurs 11 et 12

Mêmes règles que les dix autres. Lectures GET `select=` limitées, cloisonnées par compte. Niveau lu dans la copie des capacités. Aucune
donnée personnelle dans un constat : le juge tient la liste blanche de ses clés (M11). Une clé refusée est sautée (rang 8).

- **n° 11 « réponse à une relance d'impayé »** : nœud `Détecteur 11 réponse à une relance d impayé`. Il se déclenche sur un arrêt
  `raison=reponse_client` dont `reprise_le` est vide (`0159_relances_impayes.sql:59-66`), sur une facture **du même compte**, émise,
  ni payée ni avoir, de montant > 0. Il ne lit jamais `messages`. Clé `reponse_impaye:<facture>:r<AAAAMMJJ de l'arrêt>`, donc une clé
  neuve après une reprise puis un nouvel arrêt. Outil `relancer_facture`, **niveau 2 au plus partout** (plan §9, l.601) : la carte
  demande le motif à l'artisan (L13). Le n° 1 se tait sur la même facture. Cas : `scripts/detecteurs-n8n-qa.mjs:783-794` ; propriété
  `:938-939` ; mutants `:1243-1247`.
- **n° 12 « entretien à proposer »** : nœud `Détecteur 12 entretien à proposer`. La source est un rappel `crm_rappels` (`0162:22-38`)
  `type=entretien` (`0165:32`), `origine=systeme`, de clé `entretien:<chantier>:<n>` (`lib/apresChantier.ts:156`, chantier vérifié),
  échu, sans `fait_le` ni `envoye_le`. Il faut aussi la capacité `crm`, « entretien » coché, et un chantier du même compte `termine`.
  Il ne lit jamais `texte` ni `client_cle`. Clé `entretien_a_proposer:<chantier>:e<n>`, outil `envoyer_rappel_entretien`, **niveau 2 au
  plus** (le pilote ne l'exécute pas, `lib/pilote/regles.ts:62-67`). Une opposition du client efface ces rappels
  (`app/api/crm/apres-chantier/opposition/route.ts:43-44`), et l'envoi la revérifie (`lib/apresChantier.ts:170`). Cas `:796-810` ;
  propriété `:940-941` ; mutants `:1248-1252`.
- **Rang 8 (clés refusées)** : lecture `Lire cartes refusees` (`assistant_actions`, `statut=eq.refusee`, `maj_le` des 7 derniers jours,
  sans `titre` ni `entrees`). Le nœud « Niveau proposé selon l offre » saute tout constat dont l'outil et l'objet portent une carte
  refusée. Cas `:705-709`, `:810` ; mutant `:1242`.

## Les défauts M1 à M12 de 032-010 (M3, M4 et M12 d'abord)

| Défaut | Correctif dans le workflow (nœud) | Essai dans le juge (`scripts/detecteurs-n8n-qa.mjs`) |
|---|---|---|
| **M3** portes du pilote | « Niveau proposé selon l offre » : niveau 3 seulement si `pilote_reglages.actif` ET le type de l'outil (`OUTIL_TYPE`, copié dans « Capacités des offres ») sont activés, sans `artisans.leads_pause`, et pour le n° 6 une demande non `prise_en_main`. Chaque niveau 3 porte `reserve: 'pilote'` : n8n n'envoie jamais sur son niveau, et l'app redécide (`decisionPilote`) | `controler` `:196-232` (condition `pilote`, `plafond` `:183`) ; cas `:698-703`, `:726` ; propriété `× pilote activé ou coupé` ; mutants `:1217-1220` ; copie de `OUTIL_TYPE` comparée au code, mutant `:1253` |
| **M4** statuts réels | n° 6 sur `nouveau`, `en_discussion` (depuis `updated_at`) et vide ; n° 7 sur `nouveau`, `en_discussion`, `repondu` et vide | cas `:728-730`, `:745-746` ; mutants `:1221-1223` |
| **M12** identifiant et preuve | « Preuve de connexion » : exactement une ligne, aux colonnes exactes de `regles_automatisation` (`0050:47-52`), `artisan_id` en uuid, sinon arrêt. Branche d'erreur `Échec du passage` → `Message d échec` | `branches` `:1082-1114` : vide, page HTML (le cas de l'exécution 319), deux lignes, autre table, `maillons` nul, faux uuid ; mutants `:1236-1240` ; **lecture réelle** plus bas |
| M1 filtres neutralisés | aucun changement (les filtres étaient bons) | gabarit exact `LECTURES_ATTENDUES` `:83-104`, contrôle `:279-286` ; mutants `:1208-1213` (`est_demo`, `suppression_demandee_le`, `plan`, expression du compte, stock, fenêtre des refus) |
| M2 données croisées | `paire(compte, id)` dans chaque jointure (n° 1, 2, 3, 7, 9, 10, 11, 12) | cas `:666-667`, `:677-679`, `:689`, `:747`, `:764`, `:791`, `:807` ; mutants `:1214-1216`, `:1246` |
| M5 double relance, double compte | le n° 8 remplace le n° 4 sur un même devis ; ligne « argent qui dort » (n° 0), chaque pièce une fois | cas `:755-756`, total `:854-859`, `:860-864` (devis de 2 000 € : 200 000 centimes, plus 260 000) ; mutants `:1224-1225` |
| M6 écart minimal | n° 1 lit `relances_impayes.jour` et applique `ECART_MIN` (2, comparé à `lib/relancesImpayes.ts:33`) | cas `:663-665` ; mutant `:1226` |
| M7 n° 10 contre `propositions` | aucun repli sur `maj_le` (n° 10 et n° 2), activation `actif_depuis` − 14 jours, rappel `avis:<chantier>` fait ou envoyé | cas `:681`, `:771-781` ; mutants `:1227-1229` |
| M8 seuils | n° 6 borné à 10 jours (`CADENCE_RELANCES`, `lib/relances.ts:38`, lu `:45-49`) ; n° 8 compte le dernier jour | cas `:732-734`, `:752-753` ; mutants `:1230-1232` |
| M10 `alwaysOutputData` | posé sur les 18 lectures (« Lire comptes » comprise) | contrôle `:277-278` ; mutant `:1233` |
| M11 liste blanche du constat | `CLES_CONSTAT` `:106` ; `objet` et `argent` = `{type, id}` | `controler` `:211-215` ; mutants `:1234-1235` |
| **M9 — non fait** | une commande quelconque sur le chantier vaut toujours couverture. Pour couvrir par matériau, il faut une vue `commande_lignes(materiau_id)` sans texte, donc une migration, au « go » de Benj | écart déclaré dans le code du n° 9 et dans le brief |

Également fermé : le moyen 4 de 032-016 (graphe validé en entier, `:327-343`, mutants `:1240-1241`).

## La lecture réelle de connexion (une seule)

- Chaîne coupée après « Preuve de connexion » (version « chaîne coupée »), puis **exécution 333** manuelle (`success`, le 02/11 à
  18 h 46 UTC), puis chaîne rétablie (version « chaîne rétablie »). Aucune autre table n'a été lue.
- Le nœud Supabase a rendu **une vraie ligne** de `regles_automatisation`, et non une page HTML (comme celle de l'exécution 319) :
  ```text
  artisan_id: f5b463ec-…  (uuid, tronqué ici)   prereglage: "tout_auto"   actif: true   maj_le: "2026-09-11T20:40:58.358+00:00"
  maillons: { modele: "pro", notifier: true, devis_auto: true, validation: false, acompte_pct: 30, photo_requise: false, envoyer_apres_validation: true }
  ```
  « Preuve de connexion » a rendu `{ "connexion": "ok", "lignes": 1 }`. L'hôte de « Supabase account » vise bien l'API du projet.
- **Une seconde requête réelle, involontaire (à dire)** : dans l'essai 334, j'avais oublié d'épingler « Lire commandes ». n8n l'a envoyée
  pour de vrai : GET `commandes_fournisseur`, filtré sur les deux identifiants **fictifs** `00000000-0000-4000-8000-00000000000{1,2}`,
  réponse 200, corps `[]`. **Aucune ligne réelle n'a été lue.** Les en-têtes de la réponse confirment le projet
  (`sb-project-ref: gorcdvmueakcncsmrouo`). J'ai rejoué l'essai en 335 avec les 18 lectures épinglées (`contextData` vide : aucune
  requête). Le juge rougit désormais si un essai laisse une lecture non épinglée (`:1035`).

## L'essai fictif dans n8n (exécution 335)

Deux comptes fictifs, Studio et Signature. Signature a le pilote activé pour les relances d'impayés et de devis seulement, et la
réponse en mode « auto ». Une carte est refusée, un arrêt « réponse du client », un rappel d'entretien échu. Bilan rendu par n8n, égal
au rejeu hors ligne : `1:2:170000:0/1/1 11:1:70000:0/1/0 2:2:410000:0/2/0 3:1:60000:0/1/0 4:1:40000:0/0/1 8:1:150000:0/0/1 5:0:0:0/0/0
6:3:0:0/3/0 7:1:0:0/1/0 9:2:0:0/2/0 10:1:0:0/1/0 12:1:0:0/1/0 0:7:840000:0/4/3`. Ce qui se voit :
- le n° 6 en Signature « auto » reste à 2, parce que le pilote n'est pas activé pour `reponse_prospect` (M3) ;
- le devis `…204` n'est relancé qu'une fois, par le n° 8 (M5) ;
- la carte refusée fait taire le n° 4 de `…203` (rang 8) ;
- l'argent qui dort vaut 840 000 centimes : la somme des lignes en donnerait 900 000, parce que le devis `…201` est compté à la fois
  par le n° 2 et le n° 3.

## La garde commune `scripts/n8n-specs-qa.mjs`

Elle juge un ou plusieurs exports passés en argument ; sans argument, celui de ce lot. Les règles :
- **R1** inactif ;
- **R2** aucun secret (motifs de `garde-commit.mjs`, jeton porteur, clé privée) ;
- **R3** branche d'erreur ;
- **R4** chaque nœud d'envoi déclare son pied dans ses notes (`pied: mention | PIED_AUTOMATIQUE | PIED_APRES | aucun`), porte ce pied
  et aucun autre, sans « Presti » au nom d'un artisan ;
- **R5** lectures GET seulement, types de nœud en liste blanche (un modèle, Postgres, un type neuf rougissent) ;
- **R6** identifiants `{ id, name }` nommés ;
- **R7** hôte en dur et permis, `select=` sans `*`, jointure, alias ni colonne `nom`/`email`/…, sauf une lecture faite au moment d'envoyer
  qui le déclare (`lecture-pour-envoi: <nœud>`) et alimente ce nœud d'envoi.

Elle juge aussi un **workflow d'envoi fictif**, construit dans le script et jamais posé dans n8n, avec ses 4 pieds, et elle doit le
laisser passer. **Information pour 032-013 et 032-014** (je n'ai pas touché leurs fichiers) : leurs exports actuels rougissent sur R3
seulement, faute de branche d'erreur, ce qu'ils ont renvoyé au lot L12.

## La sortie des deux juges et leurs mutants

`node scripts/orchestre.mjs verifier 032-019`, sortie complète dans `verifier.log`. Fin des deux juges, avant le dépôt :

```text
detecteurs-n8n-qa : 41 nœuds (19 Code, 18 lectures GET), 95 mutants, 165 s
  ✓ structure : inactif, lectures seules, select= limité aux colonnes permises, aucune écriture, aucun envoi, aucun modèle ; graphe entier vérifié
  ✓ M1 filtres exacts (noms et valeurs) sur les 18 lectures ; M10 alwaysOutputData sur chacune ; M11 liste blanche des clés de chaque constat
  ✓ M12 Preuve de connexion : une ligne aux colonnes exactes de regles_automatisation, sinon arrêt (vide, page HTML, deux lignes, autre table) ; rang 26 branche d’erreur : Error Trigger → Message d échec, sans donnée ni texte d’erreur
  ✓ É1 gabarit HTTP exact : parameters, options, pagination (offset seul, fin exacte, ≤ 50 pages), un seul identifiant
  ✓ É3 bac à sable : processus enfant --permission --disallow-code-generation-from-strings (Node v24.21.0) — écriture, lecture, processus, worker ERR_ACCESS_DENIED ; réseau PERMIS (Node 24)
  ✓ détecteurs : … n° 7, 11, 12 jamais 3 ; M2 données croisées, M3 portes du pilote, M4 statuts, M5 …, M6 …, M7 …, M8 bornes ; rang 8 cartes refusées
  ✓ É2 propriété : 3792 cas (12 détecteurs × 3 offres × impayés × réponse × pilote × étapes × montants de 1 € à 100 000 €, 2 jours), 4000 constats, niveaux {"1":0,"2":3440,"3":560}, tous ≤ plafond(offre, détecteur)
  ✓ essai n8n (exécution 335, données fictives épinglées) rejoué hors ligne : même bilan
OK
n8n-specs-qa : 1 export(s), 33 mutants (21 sur presti-detecteurs, 12 sur le fictif)
OK
```

Chacun des 95 + 33 mutants rougit **pour sa raison nommée** : les mutants du code sont jugés sans les empreintes, et chaque mutant
s'arrête à la première phase qui le fait rougir pour sa raison (`suite`, `:1118-1128`). La suite principale, elle, joue toutes les phases.
Deux mutants que j'avais écrits trop faibles ont été corrigés après un premier passage, parce qu'ils rougissaient pour une autre raison :
« n° 12 niveau 3 », et « preuve : liste vide ». Le juge le signalait (« rouge, mais pas pour la raison attendue »).

## Les empreintes du juge (à auditer)

`EMPREINTES` (`:136-156`) : 19 nœuds Code. 14 codes ont changé : Preuve de connexion, Contexte du passage, Capacités des offres, n° 1,
2, 3, 4, 6, 7, 8, 9, 10, Niveau, Bilan. 3 sont neufs : n° 11, n° 12, Message d échec. « Départ des constats » et le n° 5 n'ont pas
changé. **Ces empreintes sont celles de l'auteur** : un audit par un agent distinct doit les confirmer avant toute publication (règle
de 032-010 et 032-012). Autres changements du juge, pour l'auditeur :
- `executer` passe une entrée au bac à sable, une ligne dans `enfant()` (`:517`) : c'est le seul changement du bac audité par 032-016 ;
- `mutantCode` accepte plusieurs remplacements ;
- `--export=` choisit un autre export, utile pour essayer un candidat ;
- l'essai est épinglé dans `essai-n8n.json` et comparé à lui.

## Risques et points à valider

1. **Benj** : M9 (vue `commande_lignes`, migration) ; un seul seuil « devis sans réponse » pour l'app et n8n (J+3 contre 7 jours dans
   `lib/assistant/briefing.ts:35`) ; l'identifiant Telegram (geste de compte) et le « go » de l'envoi de l'alerte d'échec.
2. **Session principale** : un workflow d'erreur commun pour toute la flotte (fiche méthode `:167`), à créer hors de cette tâche, que
   032-013 et 032-014 brancheront ; le juge à ajouter à `SUITES` (F5, toujours ouvert) ; F1 et F2 (conservation des exécutions,
   `availableInMCP`) non traités. L'exécution 334 garde dans n8n les en-têtes d'une réponse réelle, sans aucune donnée.
3. **Durée** : le juge passe de 87 s à environ 165 s. Une suite à la fois.
4. **Le rejeu n'est pas n8n** : la propriété et les cas tournent dans le bac à sable du juge. n8n n'a rejoué que l'essai 335, au même
   bilan.

TACHE 032-019 FAITE
