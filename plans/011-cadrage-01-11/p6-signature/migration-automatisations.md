# Migration des automatisations codées vers n8n — où en est chacune (prompt 6, lot 036-012)

Écrit le 03/11/2026 par Claude Code. La règle est celle de `.claude/rules/migration-production.md` : **une par une**, cinq pas dans l'ordre, jamais de table rase.

1. **workflow n8n créé** (inactif, sans identifiant) ;
2. **testé en dry-run** (données épinglées, `test_workflow`, banc) ;
3. **comparé à l'ancien comportement** (cas par cas, juge hors ligne qui a un mutant) ;
4. **ancien code désactivé** (geste de la session principale, après accord : un push sur `main` déploie) ;
5. **drapeau vérifié** (`lib/flags.ts` fait foi ; on colle la migration PUIS on lève).

Légende : ✓ fait et jugé · ◐ fait en partie (dit lequel) · ✗ non fait · — sans objet. Un pas ✓ est celui qu'un juge du lanceur rejoue ; il est nommé. Tout ce qui est ✗ aux pas 4 et 5
est un geste que les règles réservent à Benj ou à la session principale : **aucun n'a été fait par ce lot**. Les identifiants n8n sont ceux des exports versionnés dans
`.orchestre/preuves/` ; ils n'ont pas pu être relus dans n8n depuis l'hôte (pas de MCP n8n ici) : à relire avant d'agir.

## 1. Les quatre du prompt 6

| Automatisation codée | Où elle vit | Pas 1 · workflow | Pas 2 · dry-run | Pas 3 · comparé | Pas 4 · ancien code | Pas 5 · drapeau | Ce qui reste à Benj |
|---|---|---|---|---|---|---|---|
| **La relève** des boîtes (IMAP) | `app/api/canaux/relever/route.ts` (cron Vercel `0 7 * * *`), `lib/releveCanal.ts` | ✓ `presti-boite` `yQK50I6JXchYBH7Y`, `lib-boite-lire` `cQqfkVseZU2Ax0xQ`, `lib-boite-brouillon`, `lib-boite-envoyer` (036-003) | ✓ banc `presti-banc-boite` `tNEvzy2enkNF41z2`, 5 cas fictifs, `test_workflow` | ✓ `scripts/boite-n8n-qa.mjs` : décisions égales à `releverCanal`, ses mutants | ✗ le cron relève toujours | ✗ aucun drapeau ne bascule la relève (`lib/flags.ts` n'en porte pas) : à créer, **baissé = ancien code à l'octet près**, sur le modèle d'`accuseParN8n` | coller 0185/0192/0193, poser `BOITE_CLE_N8N` et les modules des exécuteurs, créer l'index unique demandé par 036-003, publier, puis ombre → réel (`mise-en-service.md` 5-11) |
| **Les relances** (conversation J+2/5/10, devis, impayés) | `app/api/cron/relances/route.ts` (cron `0 8 * * *`), `lib/relances.ts`, `lib/relancesImpayes.ts`, `lib/relancesRegistre.ts` | ✓ `presti-relances` `2VwYlKx60iX8z4pg` (032-044), `presti-dep-suivi` `jo8eQMEwiB9wCbKN`, `lib-controler-conflit` `F2son8oGwifPETg3` (036-004) ; relances d'impayés dans `presti-dep-facturation` `bNAF6Xzx5On853kD` | ✓ banc `presti-banc-suivi` `95LajsFcVM4AALac` ; essais épinglés | ✓ `relances-n8n-qa.mjs` (J+2/5/10, registre de 3 jours, exclus, Studio à valider) et `suivi-n8n-qa.mjs` (jamais deux relances en 3 jours, tous chemins confondus) | ✗ le cron relance toujours ; le chef et le cron ne se doublent pas parce qu'ils partagent le **registre de 3 jours** | ✗ pas de drapeau | publier ; **désactiver l'appel du cron seulement quand le chef est en `reel` sur le compte** ; la pause générale (`ops_interrupteur`) n'est pas lisible par n8n : le chef exige `pause_generale === false` |
| **Le pilote automatique** (file, 10 min, 20 par jour, tic de la minute) | `lib/pilote/` (`regles.ts`, `file.ts`), `app/api/agents/tic/route.ts`, pg_cron `presti-agents-tic` (`0101_ops_horloge.sql:164`) | ◐ la **décision** : `lib-decider` `hckqX1tQjIommtTH` (copie figée des listes du pilote) et l'**exécution simulée** : `lib-executer` `ADX5mPWqIvq1LGs6`. **La file et le minuteur ne sont pas dans n8n** | ◐ `lib-decider` et `lib-executer` en banc ; l'effet réel de `lib-executer` est **non branché** (mode A) | ◐ `lib-metier-n8n-qa.mjs` : copie des listes égale au code ; `pilote-qa.mjs` : 95 verts sur le code | ✗ | ✗ `piloteAutomatique: true` (`lib/flags.ts:243`) : c'est le drapeau du **code**, pas celui d'une bascule | **ne pas migrer en priorité** : la file est la pièce qui garantit « 10 minutes d'annulation » et « un envoi à la fois » ; le remplacer demande une table de file, un verrou et un lot dédié, jugé avant tout |
| **L'après-chantier** (demande d'avis, rappel d'entretien) | `lib/apresChantier.ts`, `lib/apresChantierTour.ts` (appelé par `app/api/cron/relances/route.ts:316`) | ✓ `presti-apres-chantier` `18cmxK4gy1ceqFYD` (032-031), `presti-dep-apres` `L3GOS7euxi60jCZN` (036-006) | ✓ banc `presti-banc-apres` `Dl8vjXWu71r7q0Fs` | ✓ `apres-chantier-n8n-qa.mjs` (même résultat que `tourApresChantier`, cas par cas) et `apres-reputation-n8n-qa.mjs` (avis négatif jamais publié, STOP, consentement) | ✗ « retirer l'appel du cron : à Benj, non fait » (`.orchestre/preuves/036-006/resume.md:85`) ; les deux coexistent sans doublon : mêmes clés `avis:<chantier>` et `entretien:<chantier>:<n>` | ✗ pas de drapeau | publier ; ombre ; retirer l'appel `tourApresChantier` du cron **dans un push dédié** quand le chef est en réel |

## 2. Les autres automatisations déjà en n8n ou en cours (même grille, plus courte)

| Automatisation | Code | Workflow | Pas 1-3 | Pas 4-5 |
|---|---|---|---|---|
| Accusé de réception et avis à l'artisan | `app/api/leads/route.ts` | `presti-accuse-reception` `VnU1onu9T4Z2asTu` (032-040) | ✓ `accuse-reception-n8n-qa.mjs` (le juge de bascule `scripts/accuse-bascule-qa.mjs`, cité par `lib/flags.ts:328`, est **absent de cette copie du dépôt** : à retrouver sur le PC) | **drapeau `accuseParN8n` baissé** (`lib/flags.ts:334`) : c'est le modèle à suivre. Il attend 0192 collée, les envois réactivés, un passage constaté, **puis** le drapeau levé « dans la minute » (`0192_accuse_reception_n8n.sql:15`) |
| Réponse qui part seule | `lib/plateformeConfig.ts` (`decisionReponse`) | `presti-reponse-seule` `5g63ItVJ41l3yP9V` (032-042) | ✓ `reponse-seule-n8n-qa.mjs` : 585 couples égaux au code | ✗ pas de drapeau |
| Briefing du matin | `lib/assistant/briefing.ts` (`composerBriefing`) | `presti-briefing-matin` `xPIDCvkp8Gk08A2E` (032-013) ; `presti-dep-direction` `oHGOyqsZGoUooxa6` (036-007) | ✓ `briefing-n8n-qa.mjs`, `direction-n8n-qa.mjs` | ✗ |
| Détecteurs (opportunités) | nouveau (pas d'ancien code) | `presti-detecteurs` `J8pduyxn9seR8Z9t` (032-003) | ✓ `detecteurs-n8n-qa.mjs` | — rien à désactiver ; attend 0185 |
| Sauvegarde planifiée et sa garde | `.github/workflows/sauvegarde.yml`, `scripts/sauvegarde.mjs` | `presti-sauvegarde` `16Gbnw1jg1JmFbfV`, `presti-garde-sauvegarde` `2uovL6sfTnINC3ka` (032-023) | ✓ `sauvegarde-n8n-qa.mjs` | ✗ |
| Cerveau, Accueil, Devis, Facturation, Opérations, Direction | nouveau (couche d'orchestration du prompt 6) | `presti-cerveau` `596OC5mL2aMBq6SD`, `presti-dep-*` | ✓ juges 036-001, 005, 007, 008 | — attend 0193 et `systemeAgents` |

## 3. Non commencées (hors du périmètre de ce lot, listées pour qu'on ne les oublie pas)

`.claude/rules/migration-production.md` nomme encore : les **11 tâches pg_cron `acq-*`** (`0109_acquisition_planification.sql:6-17`, la prospection : chantier 3, pas ce prompt), le
**tic de la minute** `presti-agents-tic`, `presti-cron-menage` (`0101_ops_horloge.sql:165`), `presti-crieur` (`0104_crieur.sql:77`), `station-reunions-echues` et `station-experiences-echues`
(`0112_pilotage_station.sql:626-628`). Aucune n'a de workflow. Elles se corrigent sur place quand une faille l'exige et migrent **une par une** : relire `cron.job` en base avant d'agir
(`acq-vigie-meta` y est inactive).

## 4. Le modèle d'une bascule (à copier pour chaque pas 4-5)

Le seul exemple de bascule par drapeau est `accuseParN8n` : un drapeau **baissé** laisse l'ancien code agir « à l'octet près » (`lib/flags.ts:326-328`). Pour chaque automatisation :

1. le lot de bascule ajoute un drapeau dans `lib/flags.ts`, **baissé**, et un test qui prouve que baissé = comportement d'avant ;
2. on colle la migration éventuelle, **puis** on lève le drapeau pour **un compte** (ombre d'abord, `mode-ombre.md`) ;
3. un passage constaté, la comparaison lue, puis le code ancien est retiré **dans un push dédié** (réversible par un `git revert` du seul push) ;
4. aucune bascule ne se fait pendant qu'un autre chantier modifie le même fichier.

## 5. Ce que ce lot n'a pas fait, et pourquoi

Pas 4 et 5 de toutes les lignes ci-dessus : ils modifient `app/**` et `lib/**` (interdits à ce lot), touchent la production et déclenchent un déploiement. Ils attendent le « go »
de Benj et les migrations. Aucune ligne de ce tableau n'est un succès tant que son pas 4 n'est pas fait **et** vérifié en direct.
