# Brief — workflow n8n `presti-detecteurs` (chantier 4, lot L3 n8n, tâche 032-003)

Écrit le 02/11/2026 par Claude Code. Sources : tâche `.orchestre/en-cours/032-003.md` ; plan du chantier 4
(`plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) §0.1, §0 bis « Ce que n8n lit », §9, §13, §16 ; prompt de Benj
`prompts-benj/p3-assistant.md` (P3:584 : l'argent qui dort d'abord, puis les clients qui attendent ; §3.2 : ce qui ne s'automatise
jamais) ; règle n8n-first (`.claude/rules/architecture-outils.md`, ADR-008). Juge hors ligne : `scripts/detecteurs-n8n-qa.mjs`.

## Ce que fait le workflow

Chaque matin à 6 h 45 (Europe/Paris), en **simulation** : il lit, il forme des constats, il rend un bilan agrégé par détecteur.
Il n'écrit rien dans Supabase, n'envoie rien, n'appelle aucun modèle, ne poste rien sur Slack. Livré **inactif**, jamais publié
sans le « go » de Benj.

| # | Nœud | Type | Rôle |
|---|---|---|---|
| 1 | Déclencheur 6 h 45 | Schedule Trigger 1.4 | tous les jours à 6 h 45, fuseau du workflow `Europe/Paris` |
| 2 | Lecture de connexion (regles_automatisation) | Supabase 1, `getAll`, limite 1 | la seule lecture réelle, pour prouver l'identifiant « Supabase account » (`dTewDK98MLrNckNG`) ; aucune donnée personnelle (0050:46-53) |
| 3 | Preuve de connexion | Code | ne garde que `{ connexion: 'ok', lignes }` : rien de la ligne lue ne descend |
| 4 | Contexte du passage | Code | le jour de Paris, le mode `simulation`, les seuils (sources plus bas) |
| 5 | Capacités des offres (copie de lib/plans.ts) | Code | copie figée des capacités Studio, Signature, Entreprise (`lib/plans.ts:63-103`), plus `OUTILS_JAMAIS_AUTO` et `OUTILS_EXECUTABLES_PILOTE` (`lib/pilote/regles.ts:70-82`) ; la suite les compare au code |
| 6-20 | Lire comptes … Lire après-chantier | HTTP Request 4.5, **GET** | une lecture par table sur `https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/<table>`, `select=` limité aux colonnes permises, identifiant prédéfini `supabaseApi` « Supabase account » ; filtrée par compte (`artisan_id=in.(…)` des comptes lus au nœud 6) ; pages de 1 000 lignes ; `executeOnce` |
| 21 | Départ des constats | Code | un seul élément `{ constats: [] }` qui traverse la chaîne des détecteurs |
| 22-31 | Détecteur 01 … Détecteur 10 | Code | chacun ajoute ses constats ; le n° 5 est coupé et n'ajoute rien |
| 32 | Niveau proposé selon l'offre | Code | niveau 1, 2 ou 3 et outil existant, lus dans la copie des capacités, jamais un `plan === 'studio'` |
| 33 | Bilan par détecteur | Code | la seule sortie : une ligne par détecteur (nombre, montant total en centimes, répartition par niveau) |

Un constat : `{ detecteur, numero, cle, artisan_id, objet: { type, id }, montant_centimes, jours, etape }`, puis `offre`, `niveau`,
`outil`. La clé change à chaque étape : `devis_sans_reponse:<id>:j7`. Jamais un nom, une adresse, un e-mail ni un texte.

## Les colonnes permises (et rien d'autre)

Règle (plan §0 bis, « Ce que n8n lit ») : des identifiants, des dates, des montants et des statuts. La liste de base est celle que
Benj a déjà accordée au rôle `n8n_lecture` (`0189_role_lecture_n8n.sql:40-61`), restreinte à ce dont les détecteurs se servent ;
trois tables s'y ajoutent (`relances_impayes_arrets`, `relances_impayes_reglages`, `prix_artisan`), avec les mêmes interdits.
`detecteurs-n8n-qa` tient cette liste et rougit sur toute autre colonne, et sur tout nom qui contient `nom`, `email`, `contact`,
`adresse`, `message`, `contenu` ou `texte`.

| Table | Colonnes lues | Filtres de la requête | Source des colonnes |
|---|---|---|---|
| `artisans` | `id`, `plan`, `est_demo`, `suppression_demandee_le` | `plan=in.(studio,signature,entreprise)`, `est_demo=is.false`, `suppression_demandee_le=is.null` | `0001_artisans.sql:5`, `:12` ; `0068_controle.sql:127` ; `0052_parametres.sql:26` |
| `factures` | `id`, `artisan_id`, `devis_id`, `statut`, `date_echeance`, `total_ttc`, `avoir_de`, `payee_le`, `type_facture` | compte | `0006_factures.sql:11`, `:12`, `:13`, `:17`, `:19`, `:25` ; `0041_facturation_electronique.sql:20` ; `0140_compta_automatisations.sql:18` ; `0176_types_devis_factures.sql:44` |
| `devis` | `id`, `artisan_id`, `statut`, `date_emission`, `validite_jours`, `acompte_pct`, `total_ttc`, `lead_id`, `accepte_le`, `envoye_le`, `created_at` | compte | `0002_devis.sql:37`, `:38`, `:42`, `:43`, `:44`, `:46`, `:50`, `:51` ; `0033_devis_conversation.sql:3`, `:4` ; `0055_verrou_credits_stripe.sql:35` |
| `leads` | `id`, `artisan_id`, `statut`, `urgence`, `type_chantier`, `created_at` | compte | `0010_hardening.sql:7`, `:8`, `:10`, `:11` ; `0026_lead_qualif.sql:4`, `:5` |
| `chantiers` | `id`, `artisan_id`, `devis_id`, `statut`, `date_fin_reelle`, `maj_le` | compte | `0141_crm_atelier.sql:62`, `:63`, `:64`, `:70`, `:74`, `:78` |
| `chantier_materiaux` | `id`, `artisan_id`, `chantier_id`, `materiau_id`, `quantite`, `statut` | compte, `statut=eq.reserve` | `0141_crm_atelier.sql:122`-`:126`, `:128` |
| `materiaux` | `id`, `artisan_id`, `seuil_alerte` | compte | `0040_inventaire.sql:8`, `:9`, `:19` |
| `stock` | `id`, `materiau_id`, `quantite` | `materiau_id=in.(…)` des matériaux lus | `0040_inventaire.sql:36`, `:37`, `:39` |
| `commandes_fournisseur` | `id`, `artisan_id`, `statut`, `chantier_id` | compte, `statut=eq.commandee` | `0158_crm_commandes_temps_reel.sql:30`, `:31`, `:36`, `:40` |
| `relances_impayes` | `id`, `artisan_id`, `facture_id`, `rang`, `statut` | compte | `0159_relances_impayes.sql:42`-`:45`, `:48` ; statut `a_valider` : `0181_relances_impayes_a_valider.sql` |
| `relances_impayes_arrets` | `facture_id`, `artisan_id`, `raison`, `reprise_le` | compte | `0159_relances_impayes.sql:60`, `:61`, `:62`, `:65` |
| `relances_impayes_reglages` | `artisan_id`, `actif`, `jours` | compte | `0159_relances_impayes.sql:25`, `:26`, `:27` |
| `plateforme_config` | `artisan_id`, `mode_reponse` | compte | `0032_plateforme_config.sql:5`, `:6` |
| `prix_artisan` | `id`, `artisan_id`, `actif` | compte, `actif=is.true` | `0038_prix_artisan.sql:9`, `:10`, `:21` |
| `crm_apres_chantier` | `artisan_id`, `avis` | compte | `0165_crm_apres_chantier.sql:20`, `:21` |
| `regles_automatisation` (nœud Supabase) | toutes (le nœud n'en choisit pas) : `artisan_id`, `prereglage`, `maillons`, `actif`, `maj_le` | limite 1 | `0050_pilotage.sql:47`-`:52` ; aucune donnée personnelle ; rien n'en descend |

Écartés exprès : `devis.objet`, `factures.objet`, `chantiers.titre`, `commandes_fournisseur.lignes` (des textes), `relances_impayes.destinataire`
(une adresse), `crm_apres_opposition.empreinte` (l'empreinte d'une adresse : n8n ne peut pas la rapprocher sans l'adresse).

## Les détecteurs (plan §9 ; « jours » comptés au jour de Paris)

| # | Clé | Se déclenche | Se tait | Montant | Outil · niveau max |
|---|---|---|---|---|---|
| 1 | `facture_echue:<facture>:j3|j10|j21` | facture `emise`, sans `payee_le` ni `avoir_de`, montant > 0, échue ; première étape libre dont le jour est venu et dont la fenêtre (jour + 10) n'est pas close (règle `decider`, `lib/relancesImpayes.ts:192-226`) ; jours du compte (`relances_impayes_reglages.jours`) sinon 3, 10, 21 | payée, annulée, avoir ; arrêt en cours (`reprise_le` vide) ; relance `a_valider` en attente ; rang déjà pris | TTC | `relancer_facture` · 3 |
| 2 | `chantier_a_facturer:<chantier|devis>:termine|accepte` | avec la capacité `crm` : chantier `termine` lié à un devis ; sans elle : devis `accepte` ; et aucune facture `standard` ni `solde` (un type vide vaut `standard`) non annulée sur ce devis | facture de solde émise ; reste ≤ 0 | TTC du devis moins ce qui est déjà facturé (hors annulées et avoirs) | `creer_facture` · 2 |
| 3 | `devis_signe_sans_acompte:<devis>:signe` | devis `accepte`, `acompte_pct` > 0, aucune facture `acompte` non annulée liée | facture d'acompte liée | TTC × `acompte_pct` / 100 | `creer_facture` · 2 |
| 4 | `devis_sans_reponse:<devis>:j3|j7|j14` | devis `envoye`, encore valable (`devisDepasse`, `lib/comptaTableau.ts:178-185`), la plus haute étape atteinte depuis l'envoi | accepté, refusé, expiré, ou validité dépassée | TTC | `relancer_devis` · 3 |
| 5 | — | **coupé** : aucune donnée ne dit qu'une facture est partie (`envoisPdfServeur.ts:101-138`), jusqu'à 0187 | toujours | — | `envoyer_facture` · 0 |
| 6 | `demande_sans_reponse:<lead>:j1|j3` | demande `nouveau` depuis au moins 1 jour | répondue (statut changé) | — | `valider_reponse_proposee` · 3 |
| 7 | `demande_sans_devis:<lead>:brouillon` | demande `nouveau`, `repondu` ou `en_cours`, qualifiée (`urgence` ou `type_chantier`), sans devis lié, compte avec au moins un tarif actif | devis lié ; demande gagnée ou perdue ; aucun tarif | — | `creer_devis` · **2, jamais 3** |
| 8 | `devis_bientot_expire:<devis>:expire` | devis `envoye` dont il reste de 1 à 7 jours de validité | accepté, refusé, expiré | TTC | `relancer_devis` · 3 |
| 9 | `stock_chantier:<chantier>:stock` (CRM) ou `stock_bas:<matériau>:stock` (sans CRM) | CRM : réservation `reserve` d'un chantier ouvert, dont le reste (somme du stock) est sous la quantité réservée ou au seuil, sans commande `commandee` sur ce chantier (`lib/crm/alertes.ts:109-125`) ; sans CRM : matériau au seuil (`seuil_alerte` > 0, reste ≤ seuil) | stock remonté ; commande passée | — | `preparer_liste_achat` · 2 |
| 10 | `demande_avis:<chantier>:avis` | capacité `crm`, après-chantier « avis » coché, chantier `termine` depuis 2 à 16 jours (`DELAI_AVIS_JOURS` et `RATTRAPAGE_JOURS`, `lib/apresChantier.ts:23-24`) | hors fenêtre ; avis non coché | — | `demander_avis` · 2 |

## Le niveau proposé (copie figée des capacités)

- niveau 1 (repéré) par défaut ; niveau 2 (carte préparée) si l'offre a `assistant` ;
- niveau 3 (part seul après 10 minutes) seulement si : le détecteur l'admet ; l'offre a `assistant.pilote` et la capacité
  d'envoi du détecteur (`factures.relances.auto` pour le n° 1, `relances.auto` pour les n° 4 et 8, `plateforme.ia.auto` pour le n° 6) ;
  l'outil n'est pas dans `OUTILS_JAMAIS_AUTO` et figure dans `OUTILS_EXECUTABLES_PILOTE` ; et la condition du compte est remplie
  (relances d'impayés cochées, opt-in `lib/plans.ts:77` ; réponse en mode `auto`, défaut `assistee`, `lib/plateformeConfig.ts:46`) ;
- conséquences tenues par la suite : Studio reste aux niveaux 1 et 2 (pas de `assistant.pilote`) ; le n° 7 n'atteint jamais 3 ; une
  facture ne s'émet jamais seule (`creer_facture` est dans `OUTILS_JAMAIS_AUTO`) ; un geste §3.2 reste une carte.
- Les drapeaux (`detecteurs`, `piloteAutomatique`, `relancesImpayes`, `crm`, …) vivent dans `lib/flags.ts`, que n8n ne lit pas : en
  simulation, le constat les nomme seulement ; ils seront vérifiés au moment d'écrire une carte (0185, vague 2).

## Les seuils (nœud « Contexte du passage »)

| Seuil | Valeur | Source |
|---|---|---|
| étapes des impayés, fenêtre de rattrapage | 3, 10, 21 ; 10 jours | `lib/relancesImpayes.ts:27`, `:31` |
| étapes du devis sans réponse | 3, 7, 14 | plan §9, n° 4 |
| validité d'un devis sans valeur | 90 jours | `lib/comptaTableau.ts:144` |
| devis bientôt expiré | 7 jours avant la fin | **défaut du lot, à valider par Benj** |
| demande sans réponse | 1 et 3 jours | **défaut du lot, à valider par Benj** |
| demande d'avis | 2 jours, rattrapage 14 | `lib/apresChantier.ts:23-24` |

## Sortie

Une ligne par détecteur, dans l'ordre de l'argent récupéré : `{ numero, detecteur, nombre, montant_total_centimes, par_niveau, mode: 'simulation' }`.
Rien d'autre ne sort du workflow.

## Ce que le juge garantit (032-012, après l'audit 032-010) — et ses limites

Juge : `scripts/detecteurs-n8n-qa.mjs`, hors ligne, sur l'export `.orchestre/preuves/032-003/presti-detecteurs.workflow.json`.
Il rejoue le code des nœuds, il ne rejoue pas n8n. Les trois défauts élevés de 032-010 (É1, É2, É3) sont fermés dans le juge ; le
workflow n'a pas changé. Preuve : `.orchestre/preuves/032-012/resume.md` (49 mutants, tous rouges, chacun pour la raison nommée).

**Ce qu'il garantit**
- **Sorties HTTP (É1)** : chaque lecture est comparée à un gabarit exact (`gabaritHttp`) — clés du nœud, `parameters`, `options` et
  pagination, clé par clé et valeur par valeur : `timeout` ≤ 30 s ; pagination `updateAParameterInEachRequest` avec un seul paramètre
  `qs` `offset` = `={{ $pageCount * 1000 }}`, fin `={{ !Array.isArray($response.body) || $response.body.length < 1000 }}`,
  `limitPagesFetched: true`, `maxRequests` ≤ 50 ; `limit=1000` ; un seul identifiant, « Supabase account ». Un proxy, des certificats
  non vérifiés, une redirection, une réponse complète, une « next URL », un en-tête, un second identifiant, `onError` rougissent.
  Au passage (M10, à moitié) : `settings` en liste blanche, un `errorWorkflow` rougit.
- **Plafonds (É2)** : le plafond est calculé dans le juge, par `peut()` (`lib/plans.ts`), `OUTILS_JAMAIS_AUTO` et
  `OUTILS_EXECUTABLES_PILOTE` (`lib/pilote/regles.ts`) et la table du plan §9 (n° 2, 3, 7, 9, 10 : 2 ; n° 5 : 0 ; n° 1, 4, 6, 8 : 3
  seulement avec `assistant.pilote`, la capacité d'envoi et la condition du compte). Chaque constat de chaque cas — les cas par
  détecteur, l'essai n8n, et un test par propriété de 1 632 cas (10 détecteurs × Studio, Signature, Entreprise × impayés cochés ou
  non × réponse `auto` ou `assistee` × étapes × montants de 1 € à 100 000 €, deux jours dont le lendemain du passage à l'heure d'été)
  — doit avoir `niveau ≤ plafond`, l'outil du plan §9 et l'offre réelle du compte ; un outil de `OUTILS_JAMAIS_AUTO` ne dépasse
  jamais 2. Chaque cas de la propriété doit déclencher : une propriété muette ne prouverait rien.
- **Code des nœuds (É3)** : (a) l'empreinte SHA-256 du `jsCode` de chacun des 16 nœuds Code est épinglée ; toute différence, tout nœud
  Code ajouté ou retiré rougit et dit « nouvel audit requis » — c'est la seule barrière pour « Preuve de connexion », que le juge ne
  rejoue pas ; (b) le code est rejoué dans un processus enfant `node --permission --disallow-code-generation-from-strings`, sans
  aucune `--allow-*` (ni lecture ni écriture disque, ni processus, ni worker), environnement vide ; chaque nœud a un contexte vm neuf
  (`vm.constants.DONT_CONTEXTIFY`) où n'entre aucun objet de l'hôte (les données passent en texte JSON), génération de code coupée ;
  `fetch`, `process`, `require`, les minuteries, `Function`, `eval`, `this` (où n8n met ses helpers)… y sont des pièges qui notent
  toute tentative, même rattrapée. La suite sonde l'enfant à chaque passage (écriture, lecture, processus, worker : `ERR_ACCESS_DENIED`)
  et y rejoue l'évasion de l'annexe E de 032-010 : rien n'est atteint. Les mutants du code sont jugés **sans** les empreintes, pour
  prouver que le rejeu les voit aussi.

**Ses limites**
- **Réseau du processus enfant** : Node 24 (celui d'Oracle, v24.21.0) n'a pas de barrage réseau dans `--permission` (`--allow-net`
  arrive avec Node 25 ; la sonde le dit à chaque passage). Le code rejoué n'atteint pas le réseau faute de tout objet de l'hôte dans
  son contexte, mais si une faille de V8 permettait d'en sortir, l'enfant pourrait ouvrir une connexion. Le juge reste hors ligne
  pour l'export audité (empreintes) ; un export muté n'est rejoué qu'après avoir changé d'empreinte, donc après un rouge.
- **Le rejeu n'est pas n8n** : ce que l'exécuteur de code de n8n 2.45.6 permet sur Oracle (réseau, modules, `this.helpers`,
  `NODE_FUNCTION_ALLOW_BUILTIN` / `_EXTERNAL`, exécuteurs de tâches) n'est pas vérifié ici : question ouverte à la session principale
  (`.orchestre/preuves/032-012/resume.md`). Le juge ne regarde ni les identifiants dans n8n (l'hôte de « Supabase account », M12), ni
  les exécutions réelles.
- **Restent au lot L12** : M1 (valeurs des filtres de requête : `est_demo`, `suppression_demandee_le`, `plan=in.(…)`, expression du
  compte), M2 (données croisées entre comptes), M3 (portes du pilote), M4 à M9 (statuts, doublons, seuils), M10 (`alwaysOutputData`
  exigé), M11 (liste blanche des clés d'un constat), M12 (identifiant), F1 à F6.
- **Une empreinte neuve** ne s'épingle qu'après un audit par un agent distinct de celui qui a écrit le code.

## Ce que l'exécuteur de code de n8n permet sur Oracle (relevé par la session principale, 02/11 vers 17 h 50, réponse à 032-012 (c))

- n8n **2.45.7** (passé de 2.45.6 le 02/11, accord de Benj). Le code des nœuds Code tourne dans le conteneur à part `runners`
  (`ghcr.io/n8n-io/runners`, même version ; courtier `N8N_RUNNERS_TASK_BROKER_URI=http://n8n:5679`), en `NODE_ENV=production`.
- Aucune des variables `N8N_RUNNERS_MODE`, `NODE_FUNCTION_ALLOW_BUILTIN`, `NODE_FUNCTION_ALLOW_EXTERNAL`, `N8N_BLOCK_ENV_ACCESS_IN_NODE`
  n'est posée sur `n8n` ni sur `runners` (`docker compose exec … env`, valeurs secrètes non lues) : réglages par défaut de n8n, donc aucun
  module intégré ni externe autorisé dans un nœud Code.
- **Le conteneur `runners` a le réseau sortant** (réseau `n8n-complet_default` ; `wget https://example.com` réussi depuis le conteneur).
  Un nœud Code modifié dans n8n pourrait donc tenter un appel sortant par les aides de n8n : l'empreinte SHA-256 de chaque nœud Code dans
  le juge (É3) est la barrière, avec la règle « aucune modification du workflow hors du MCP de Claude Code, et toute empreinte changée
  = nouvel audit ».
- **Proposé à Benj (geste sur le serveur, non fait)** : couper le réseau sortant de `runners` (réseau Docker `internal: true` partagé
  avec `n8n` seulement) ; les lectures HTTP des détecteurs passent par le processus principal de n8n, pas par `runners`, et n'en
  dépendent pas. À essayer sur une copie du compose, avec un retour arrière écrit.
