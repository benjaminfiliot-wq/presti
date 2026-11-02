## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« auditer des workflows n8n inactifs avant publication en simulation : n8n, workflow, données, envoi ») :
  a rendu la règle d'emplacement des outils (`architecture-outils.md`, « n8n cloud ne reçoit aucune donnée personnelle ») et la règle
  des comptes non Presti. Effet : rien n'a été lu ni essayé hors du n8n d'Oracle, aucun appel à un compte tiers.
- **MCP `cerveau`, `chercher`** (« publier un workflow n8n en simulation : conservation des exécutions, workflow d'erreur commun,
  registre… ») : a ramené `fiche-methode-n8n.md` §3.5 (« le mode ombre fait passer de vraies données dans les exécutions… sauvegarde des
  succès coupée… Sans cela, n8n garde les données du client 14 jours sur Oracle… et le registre des traitements doit le dire »), le piège
  14 de `fiches-depots.md` (Error Trigger sans workflow d'erreur désigné : pannes muettes) et `inventaire.md` (« registre des traitements
  sans section n8n »). Effet : la conservation des exécutions réussies et l'absence de branche d'erreur sont jugées **majeures pour une
  publication en simulation** (c'est le moment où de vraies données entrent), et non plus « faibles » comme en 032-010 (F1), qui jugeait un
  workflow inactif nourri de données fictives.
- **MCP `n8n-oracle`, lecture seule** : `search_workflows`, `get_workflow_details` (les trois), `get_workflow_history` (les trois),
  `search_workflow_executions` (les trois), `get_workflow_best_practices` (`scheduling`). Effet : l'état **en ligne** est confronté aux
  exports (versionId, nœuds et liaisons, octet pour octet pour les détecteurs) ; les exécutions passées sont listées (dont la 333, qui a
  gardé une vraie ligne de base) ; « Missed Schedules During Downtime » a fait vérifier le rattrapage de chaque passage. Aucune écriture,
  aucune exécution, aucun identifiant lu ni créé.
- **Skill `ecc:security-review`** : sa grille appliquée aux trois exports — secrets (motifs `eyJ…`, `sk_live_`, `sb_secret_`, `sk-ant-`,
  `xox…`, `Bearer` : 0 occurrence), injection (les filtres `in.(…)` ne prennent que des `uuid` relus en base), messages d'erreur qui fuient
  (« Message d échec » assaini ; ailleurs, aucune branche), données sensibles dans les journaux (les exécutions de n8n **sont** le journal :
  défaut majeur de conservation), RLS contournée par la clé de service (constat 8 de la fiche méthode) d'où le poids des juges.
- **Fiches `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (points 5 et 9, fiche 2, §3.5, §5 q. 4) et
  **`fiches-depots.md`** (piège 14) : le workflow d'erreur se désigne dans les réglages de chaque workflow et ne part jamais en manuel ;
  purge par défaut à 14 jours ; recommandation « succès non sauvés, échecs gardés 7 jours ». Effet : les correctifs proposés plus bas.
- **Vidéos déjà analysées** : `plans/analyse-videos.md:144` (« alerte e-mail à Benj en cas d'échec d'un workflow », source du rang 26) et
  `:143` (bilan à 14 ou 30 jours, source du suivi). Effet : la branche d'erreur est jugée sur ce qu'elle **fait** (alerter Benj), pas sur sa
  seule présence.
- **Règles et sources du dépôt** : plan du chantier 4 §0 bis (rangs 3, 8, 10, 11, 26, « Règles communes », « Ce que n8n lit », « Mise en
  service », `chantier-4-assistant-plan.md:127-158`), `supabase/migrations/0189_role_lecture_n8n.sql`, l'audit 032-010 et son annexe E,
  les trois briefs `c4-n8n-*.md`, les trois `resume.md`, `docs/registre-traitements.md`, `lib/flags.ts`, `lib/canaux/regles.ts`,
  `lib/notificationsTypes.ts`. Effet : chaque colonne lue confrontée à 0189 par un script (annexe A), chaque texte du suivi confronté aux
  drapeaux des canaux.
- **Non chargé** : l'agent `presti-audit-attaque` (c'est un agent, pas un skill ; sa méthode — rejouer l'attaque, la preuve à l'appui — est
  appliquée à la main par les dix mutations de l'annexe C). Aucun skill de design ni de vidéo : sans objet.

VERDICT presti-suivi-artisan : À CORRIGER
VERDICT presti-briefing-matin : À CORRIGER
VERDICT presti-detecteurs : À CORRIGER

# 032-029 — audit distinct des workflows n8n du soir (chantier 4) : `presti-suivi-artisan`, `presti-briefing-matin`, `presti-detecteurs`

Fait le 02/11/2026 au soir par Claude Code (Opus 5.5), sur l'hôte d'agents Oracle, dans `/home/usine/Documents/presti`. Je n'ai écrit ni
ces workflows ni leurs juges. Lecture seule dans le n8n d'Oracle (aucune modification, publication, activation ni exécution) ; aucune
requête vers Supabase ni vers la production ; aucune donnée réelle. Fichiers écrits : ce dossier seulement (et `/tmp/audit-032-029/`, la
racine factice des mutations).

## En une ligne

Les trois workflows **ne peuvent rien envoyer ni rien écrire** : seulement des déclencheurs, des nœuds Code au code épinglé (38 empreintes
reconfirmées), des lectures `GET` aux colonnes d'identifiants, de dates, de montants et de statuts, inactifs et jamais publiés. Aucun défaut
critique. Mais aucun n'est publiable en simulation **tel quel** : deux n'ont aucune branche d'erreur, deux gardent les données réelles de
chaque passage réussi dans la base de n8n, le suivi lirait chaque jour une table qui n'existe pas, et leurs juges **interdisent** les
deux correctifs de réglages (`errorWorkflow`, `saveDataSuccessExecution`). Les corrections sont petites ; la liste est en fin de rapport.

Les trois juges de lot sont verts au rejeu et rougissent sur mes dix mutations, chacune pour sa raison. La garde commune `n8n-specs-qa`
n'en voit que trois et reste verte sur un nœud Supabase qui lirait toute la table `artisans` : sans effet sur ces trois workflows (leur
juge de lot rougit), mais à corriger avant qu'elle serve seule de juge à un workflow futur.

## Échelle de gravité

- **critique** : un envoi, une écriture ou une donnée personnelle (nom, adresse, e-mail, texte) possibles ; ou un juge vert sur l'un d'eux.
- **majeur** : une règle de mise en service du plan non tenue (`chantier-4-assistant-plan.md:154-155` : « avec sa branche d'erreur » ;
  rang 26), ou un passage publié qui échouerait ou garderait des données réelles sans que le registre le dise.
- **moyen** : à corriger avant l'envoi réel ou avant de passer au rôle `n8n_lecture` ; **faible** : hygiène.

## Ce qui a été vérifié en direct, et contre quoi

| Point | presti-suivi-artisan (`2HsfV00lGSX1KGY1`) | presti-briefing-matin (`xPIDCvkp8Gk08A2E`) | presti-detecteurs (`J8pduyxn9seR8Z9t`) |
|---|---|---|---|
| Inactif, jamais publié (en ligne) | `active: false`, `activeVersionId: null`, `triggerCount: 0` | idem | idem |
| En ligne = export | versionId `8cd9a2dc…` = export, `updatedAt` identique, dernière version de l'historique (2 versions) | versionId `d19fec51…` = export, dernière des 5 versions | **octet pour octet** : 41 nœuds et liaisons identiques (sha256 de `nodes` et `connections`) ; versionId `9106bdf6…` |
| Exécutions | 330 seule (manuelle, données épinglées) | 331 seule (idem) | 319, 320, 333 (lecture réelle de connexion), 334 (une lecture réelle involontaire, corps `[]`), 335 |
| Nœuds d'envoi ou d'écriture | aucun (types : schedule, code ×8, httpRequest GET ×5, note) | aucun (schedule, code ×11, httpRequest GET ×7) | aucun (schedule, supabase `getAll` limit 1, code ×19, httpRequest GET ×18, errorTrigger, note) |
| Code sans effet extérieur | 8 empreintes du juge = l'export ; aucun `helpers`, `fetch`, `$http`, `require`, `Function`, `this`, `$env`, `StaticData` (annexe B) | 11 empreintes, idem | 19 empreintes, idem |
| Colonnes contre 0189 (annexe A) | 1 colonne et 1 table hors 0189 (défaut S-M2) | toutes dans 0189 | 4 tables hors 0189, déclarées au brief (défaut D-M2) |
| Donnée personnelle lue | aucune (`notifications` = des booléens, `lib/notificationsTypes.ts:14`) | aucune (`messages` : `lead_id, sens, etat, sent_at`, jamais le contenu) | aucune (le nœud Supabase lit `regles_automatisation` entière, 1 ligne : `prereglage, maillons, actif, maj_le, artisan_id`) |
| Secrets dans l'export | 0 | 0 | 0 |
| Fuseau | `Europe/Paris` (settings) ; jours de Paris dans le code | idem ; instant tiré du déclencheur | idem |
| Idempotence | clé `suivi:<artisan>:<étape>`, registre, 5 jours, un par passage, plafond qui reporte | clé `point_du_jour:<artisan>:<jour>` ; l'unicité viendra de la table (Q2) | clé `<détecteur>:<objet>:<étape>`, dédoublonnée au bilan |
| Rattrapage d'un passage manqué | fenêtres de 3 jours | un jour manqué est perdu (sans objet : point du jour) | clés d'étape, rien ne se perd |
| Workflow d'erreur | **aucun** | **aucun** | Error Trigger interne → « Message d échec », **sans envoi** |
| Exécutions réussies conservées | non (`saveDataSuccessExecution: none`) | **oui** (réglage absent) | **oui** (réglage absent) |
| Textes | 6 brouillons fixes, sans mention d'IA (message de Presti), sans fausse urgence ni culpabilisation ; un texte inexact (S-M1) | aucun texte | aucun texte |

## presti-suivi-artisan — À CORRIGER

| # | Gravité | Défaut | Nœud et fichier:ligne | Correctif |
|---|---|---|---|---|
| S-1 | **majeur** | **Aucune branche d'erreur** : ni Error Trigger ni `settings.errorWorkflow`. Un passage qui échoue ne prévient personne (rang 26, `chantier-4-assistant-plan.md:107-108` ; mise en service `:154-155`). `n8n-specs-qa` rougit (R3, `scripts/n8n-specs-qa.mjs:88`) | réglages, `.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json:12-17` | désigner le workflow d'erreur commun (à créer, fiche méthode point 5), puis l'ajouter à `REGLAGES_ATTENDUS` du juge (`scripts/suivi-artisan-qa.mjs:79`), qui l'interdit aujourd'hui (mutant `:862`) |
| S-2 | **majeur** | **Publié aujourd'hui, il échouerait chaque matin** : `suivi_artisan_envois` n'existe pas (note du canevas, export l.178 ; question 1 de `032-014/resume.md:120-124`). L'échec tombe à la 5e lecture, **après** avoir lu les comptes, demandes, devis et factures réels ; n8n garde par défaut les données des exécutions **en erreur** : chaque jour, les identifiants et dates de tous les inscrits des 34 derniers jours resteraient sur Oracle, sans alerte (S-1) | « Lire registre du suivi », export l.506-515 | ne publier qu'après la migration du registre (« go » de Benj) **et** une lecture réelle qui prouve qu'il répond ; poser `saveDataErrorExecution` à une valeur choisie (fiche méthode §5 q. 4 : échecs gardés 7 jours) |
| S-M1 | moyen | **Texte inexact** : « Une première demande est arrivée sur votre page. » Or une demande peut venir de Telegram ou d'une notification Le Bon Coin, canaux **ouverts** (`lib/flags.ts:281`, `:295`, `canauxTelegram: true`, `canauxNotifications: true` ; capacités `lib/canaux/regles.ts:22-25`). Seul `import` est écarté. Règle anti-fabrication : le texte affirme un fait faux pour ces artisans | « Textes du suivi (brouillons) », `premiers_pas.premiere_demande`, export l.648-658 ; brief `c4-n8n-suivi-artisan.md:107` | « Votre première demande est arrivée. Vous la retrouvez dans Messages… » (sans lieu), ou une variante par canal ; empreinte et brief à reposer |
| S-M2 | moyen | **Hors du rôle `n8n_lecture`** : `artisans.notifications` n'est pas accordée (`0189_role_lecture_n8n.sql:38`), ni la table `suivi_artisan_envois`. Le jour où « Supabase account » cède la place au rôle à droits limités (souhait de `p3-assistant.md` §3.4, F6 de 032-010), la lecture rougit en bloc | « Lire comptes », export l.240 ; « Lire registre du suivi » l.515 | la migration du registre accorde ses colonnes à `n8n_lecture` (déjà proposé, résumé l.123) et y ajoute `notifications` |
| S-M3 | moyen | **Idempotence de l'envoi à venir** : le lot d'envoi doit « écrire le registre après chaque envoi réussi (et seulement alors) » (`032-014/resume.md:136`). Un arrêt entre l'envoi et l'écriture renverrait l'e-mail au passage suivant (règle « un crash ne crée aucun doublon ») | — (lot suivant) | réserver la clé (insertion sur `cle` unique) **avant** l'envoi, marquer `envoye_le` après ; une clé réservée sans date ne repart pas sans regard humain |
| S-M4 | moyen | **Opposition « répondez stop »** traitée à la main (`notifications.suivi = false` posé par quelqu'un) tant que l'interrupteur n'existe pas (question 2) | « Textes du suivi », pied `PIED` | avant l'envoi réel seulement (déjà listé par l'auteur) |
| S-F1 | faible | `availableInMCP: true` : le workflow s'offre à tout client MCP de l'instance (dont `execute_workflow`) ; le juge l'exige à `true` | réglages, export l.14 | `false` à la publication, juge à suivre (question 8 de l'auteur) |

Ce qui tient : les filtres de démo, fondateur, suppression et opposition, dans la requête **et** dans le code ; la garde (registre, 5 jours,
un par passage, plafond) ; les comptes nés d'événements réels ; aucun texte n'invente un chiffre ; aucun n'emploie la mention d'IA, à
raison (un message de Presti, `chantier-4-assistant-plan.md:135-136`).

## presti-briefing-matin — À CORRIGER

| # | Gravité | Défaut | Nœud et fichier:ligne | Correctif |
|---|---|---|---|---|
| B-1 | **majeur** | **Aucune branche d'erreur** (rang 26 ; `n8n-specs-qa` R3 rouge). Ce workflow arrête tout le passage à la moindre lecture douteuse (« Contrôle des lectures ») : bonne règle, mais muette | réglages, `.orchestre/preuves/032-013/presti-briefing-matin.workflow.json:12-15` | workflow d'erreur commun désigné ; le juge l'interdit aujourd'hui (`scripts/briefing-n8n-qa.mjs:89`, `:148-150`, mutant « errorWorkflow posé » `:1366`) : à changer avec lui |
| B-2 | **majeur** | **Chaque passage réussi garde les données réelles** : pas de `saveDataSuccessExecution`. Les sorties de « Point du jour par compte » (identifiant de chaque artisan, identifiants de ses demandes, devis, factures et matériaux, total impayé en centimes) et toutes les lectures restent 14 jours (purge par défaut, fiche méthode l.44, l.233) dans la base de n8n d'Oracle, chaque jour, contre la fiche méthode §3.5 (l.913-915) et sans section au registre | réglages l.12-15 ; « Point du jour par compte » l.850 | `saveDataSuccessExecution: 'none'` (comme le suivi), à ajouter à la liste blanche du juge (`:89`) |
| B-M1 | faible | `availableInMCP: true` (même remarque que S-F1) | l.14 | idem |

Ce qui tient : la comparaison à `composerBriefing` par fonctions importées de l'app (29 cas fixes, 320 tirés) est l'oracle le plus fort des
trois juges ; la sortie finale ne porte aucun identifiant de compte ; une lecture tronquée ou inattendue arrête le passage au lieu de dire
« rien à signaler ».

## presti-detecteurs — À CORRIGER

| # | Gravité | Défaut | Nœud et fichier:ligne | Correctif |
|---|---|---|---|---|
| D-1 | **majeur** | **Chaque passage réussi garde les données réelles** (F1 de 032-010, laissé « non traité » par 032-019, `032-019/resume.md`, « Risques », point 2) : constats par compte (identifiants, montants, niveaux) et la ligne entière de `regles_automatisation` (dont `maillons`). **Déjà arrivé** : l'exécution 333 garde dans n8n une vraie ligne (`artisan_id` réel, `maillons`, `032-019/resume.md`, « La lecture réelle ») | réglages, `.orchestre/preuves/032-019/presti-detecteurs.workflow.json:8-11` | `saveDataSuccessExecution: 'none'` ; le juge l'interdit (`CLES_REGLAGES`, `scripts/detecteurs-n8n-qa.mjs:128`, `:241`) : à ouvrir à cette seule clé et valeur ; supprimer l'exécution 333 (et 334) dans n8n — suppression : geste de Benj |
| D-M1 | moyen | **La branche d'erreur n'alerte personne** : Error Trigger « Échec du passage » → « Message d échec », qui prépare `{alerte, noeud, execution, mode}` et s'arrête. `n8n-specs-qa` la tient pour une branche (R3 vert), mais le rang 26 veut une alerte à Benj. Sans conséquence en simulation (Benj lit le bilan dans la même liste d'exécutions), bloquant avant tout envoi | « Échec du passage » l.1588, « Message d échec » l.1599 | brancher le workflow d'erreur commun (Slack `#presti-auto`, l'identifiant Slack existe ; Telegram : geste de Benj) ; R3 devrait exiger qu'un nœud d'envoi déclaré termine la branche |
| D-M2 | moyen | **Hors du rôle `n8n_lecture`** : `relances_impayes_arrets`, `relances_impayes_reglages`, `prix_artisan`, `pilote_reglages` ne sont pas dans 0189 (déclaré au brief, `c4-n8n-detecteurs.md:32-34`, `:56`) ; même risque que S-M2 | « Lire arrets de relance » l.794, « Lire reglages des relances » l.861, « Lire tarifs » l.995, « Lire reglages du pilote » l.1416 | une migration 0189 bis (au « go » de Benj) qui accorde ces colonnes, avant de changer d'identifiant |
| D-F1 | faible | M9 de 032-010 toujours ouvert (une commande quelconque couvre le chantier), déclaré | « Détecteur 09 » | vue `commande_lignes(materiau_id)` (migration) |
| D-F2 | faible | F4 de 032-010 : le filtre `in.(…)` de tous les comptes croît de 37 caractères par compte ; au-delà d'une taille d'adresse que je n'ai pas mesurée, la lecture échoue (en bloc, donc sans fausse donnée) | les 17 lectures `artisan_id=in.(…)` | à mesurer sur le nombre réel de comptes avant la publication |
| D-F3 | faible | `availableInMCP: true` ; code mort dans « Niveau proposé selon l offre » (`nouveaux`, `constat` jamais lus) | l.10 ; l.1299 | — |

Ce qui tient : les défauts élevés de 032-010 (É1-É3) sont fermés dans le juge et je les ai vus rougir (mutants du juge, `juges.log`) ;
M1 à M8, M10 à M12 corrigés ; niveau 3 seulement « sous réserve du pilote », jamais pour une facture, jamais en Studio (propriété sur 3 792
cas) ; la preuve de connexion arrête le passage sur une page HTML ou une autre table.

## Préalable commun, hors des workflows, avant toute publication

**P-1 (bloquant pour les trois)** : la section « Lectures de n8n sur le serveur Oracle » de `docs/registre-traitements.md` **n'existe pas**
(sections 1 à 24 relues : aucune ne parle de n8n). Le plan l'exige « avant la publication du premier workflow qui lit des données d'artisans »
(`chantier-4-assistant-plan.md:148-150`). Elle doit dire : quelles tables et colonnes (annexe A), sur quel serveur, combien de temps n8n les
garde (exécutions réussies : rien ; en erreur : la durée choisie), et qui y accède. C'est un livrable de la session principale.

## Force des juges

### Rejeu (sortie complète : `juges.log`)

| Juge | Résultat | Durée | Mutants internes |
|---|---|---|---|
| `scripts/suivi-artisan-qa.mjs` | **OK**, code 0 | 70 s | 59/59 rouges pour leur raison |
| `scripts/briefing-n8n-qa.mjs` | **OK**, code 0 | 46 s | 49/49 |
| `scripts/detecteurs-n8n-qa.mjs` | **OK**, code 0 | 185 s | 95/95 ; propriété 3 792 cas |
| `scripts/n8n-specs-qa.mjs` sur les trois exports | **ÉCHEC**, code 1 : R3 sur le suivi et sur le briefing ; détecteurs R1-R7 tenues ; workflow fictif d'envoi accepté | — | 33 |

Le rejeu de `n8n-specs-qa` exige le chargeur TS (`--import ./scripts/ts-loader.mjs`), comme sa tête le dit (l.21) ; lancé sans lui, il
plante sur `@/lib` (`lib/pilote/regles.ts`) au lieu de juger.

### Mutations à la main (annexe C ; copies mutées : `mutants.json` ; banc : `mutations.mjs` ; sortie : `mutations.log`)

Dix mutations écrites par moi, hors des listes `MUTANTS` des juges (aucune ne figure telle quelle dans leurs listes), jouées contre le juge
du lot **et** contre `n8n-specs-qa`. Témoins d'abord : chaque racine factice, avec l'export **intact**, rend le juge vert (code 0) — un
rouge vient donc de la mutation. Les exports du dépôt n'ont pas bougé (aucune ligne « ALERTE »).

| Mutation | Juge du lot | Raison donnée par le juge | `n8n-specs-qa` |
|---|---|---|---|
| S1 « Garde du suivi » désactivée (registre, 5 jours, plafond sautés) | **rouge** | `clé de nœud « disabled » interdite` | rouge, mais pour R3 seul (déjà rouge sans mutation) : **ne la voit pas** |
| S2 nœud `emailSend` orphelin, non relié | **rouge** | `type n8n-nodes-base.emailSend interdit` | **rouge** pour sa raison (R4, nœud d'envoi sans pied) |
| S3 « Lire comptes » : `created_at=gte.2000-01-01` | **rouge** | `filtre created_at … absent ou changé (032-010 M1)` et gabarit HTTP | R3 seul : **ne la voit pas** |
| S4 exécutions en erreur et manuelles conservées | **rouge** | `settings hors liste blanche` | R3 seul : **ne la voit pas** |
| B1 « Contrôle des lectures » désactivé | **rouge** | `clé de nœud non permise (disabled)` | R3 seul : **ne la voit pas** |
| B2 `continueOnFail` sur « Lire factures » (panne lue comme « aucun impayé ») | **rouge** | `clé de nœud non permise (continueOnFail)` | R3 seul : **ne la voit pas** |
| B3 hôte suffixé `….supabase.co.exemple.invalid`, même identifiant | **rouge** | `adresse hors des tables permises de l'API REST du projet` | **rouge** pour sa raison (R7, hôte non permis) |
| D1 nœud Supabase : table `artisans`, `returnAll` (noms, e-mails de tous les comptes) | **rouge** | `table artisans interdite (regles_automatisation seulement)` | **VERT : trou** |
| D2 « Niveau proposé selon l offre » désactivé | **rouge** | `nœud désactivé` | **VERT : trou** |
| D3 Slack après « Message d échec », texte brut de l'erreur | **rouge** | `type de nœud interdit (n8n-nodes-base.slack)` | **rouge** pour sa raison (R4, sans pied) |

**Juges des lots : 10/10 rouges, chacun pour sa raison.** **`n8n-specs-qa` : 3/10 pour leur raison** (S2, B3, D3) ; les cinq autres
rouges du suivi et du briefing ne viennent que de R3, déjà rouge sur l'export intact ; D1 et D2 restent **verts**. D1 est grave pour une
garde **commune** : un nœud Supabase qui lit toutes les colonnes d'une table de données personnelles passe R5 (type permis) et R7 (qui ne
regarde que le `select=` des nœuds HTTP). Ce n'est pas un défaut des trois workflows (leur juge de lot rougit), mais tout futur workflow
qui ne s'appuierait que sur `n8n-specs-qa` serait sans garde sur ce point : **à corriger dans `n8n-specs-qa` avant qu'il serve de seul juge**
(nœud Supabase : table en liste blanche, `limit` borné, jamais `returnAll` ; aucun nœud `disabled` ; clés de nœud en liste blanche ;
réglages en liste blanche).

### Ce que valent les juges

- **Forts** sur ce qu'ils regardent : gabarit exact des lectures (options, pagination, filtres et leurs valeurs), liste blanche des clés de
  nœud et des réglages, graphe entier, empreintes du code, bac à sable en processus enfant `--permission`. Les trous de 032-010 (É1-É3) sont
  fermés.
- **Faiblesse commune 1 — ils figent les défauts B-1, B-2, D-1, S-1** : leurs listes blanches de réglages interdisent `errorWorkflow`
  (les trois) et `saveDataSuccessExecution` (briefing, détecteurs). Corriger le workflow fera rougir son juge : il faut changer les deux
  ensemble, puis un nouvel audit des empreintes et des réglages.
- **Faiblesse commune 2 — les empreintes sont tout** : n'importe quel changement de code rougit, ce qui est voulu ; mais la qualité de ce qui
  est épinglé ne tient qu'aux audits. J'ai reconfirmé les 38 (annexe B), et lu le code du suivi (8 nœuds), du briefing (11) et les nœuds de
  connexion, niveau, bilan et erreur des détecteurs ; pour les dix détecteurs, je m'appuie sur la propriété du juge et sur l'audit 032-010.
- **Faiblesse commune 3 — 0189 n'est la référence d'aucun juge** : chaque juge tient sa propre liste de colonnes (`PERMISES`,
  `scripts/suivi-artisan-qa.mjs:52-58` ; liste des détecteurs, brief l.32-34). D'où S-M2 et D-M2, que personne ne voit. Un contrôle
  « colonne lue ⇒ accordée à `n8n_lecture` » (le script de l'annexe A) devrait entrer dans `n8n-specs-qa`, avec une liste d'exceptions
  déclarées.
- **`n8n-specs-qa`** accepte une branche d'erreur qui n'alerte personne (D-M1), et reste **vert** sur un nœud Supabase qui lit toute la table `artisans` (mutation D1) et sur un nœud désactivé (D2) : comme garde commune, il ne suffit pas encore.

## Ce qu'il faut pour publier en simulation

1. Session principale : créer le workflow d'erreur commun (alerte Slack `#presti-auto` sans donnée, comme « Message d échec ») et le
   désigner dans les trois ; `saveDataSuccessExecution: 'none'` sur le briefing et les détecteurs, et une durée pour les échecs sur les
   trois ; changer les listes blanches des trois juges en même temps ; rejouer les juges et `n8n-specs-qa` (vert attendu sur R3).
2. Session principale : la section du registre des traitements (P-1).
3. Benj : supprimer les exécutions 333 et 334 de `presti-detecteurs` (elles gardent une vraie ligne et des en-têtes réels).
4. Suivi seulement : la migration du registre `suivi_artisan_envois` (avec ses droits pour `n8n_lecture`), sa lecture réelle prouvée, puis
   le texte S-M1 corrigé avant que Benj valide les six textes.
5. Un audit distinct de ces correctifs (réglages, juges, empreintes reposées), puis le « go » écrit de Benj.

Le briefing et les détecteurs n'ont besoin que des points 1 à 3 et 5 : ce sont des correctifs de réglages, sans toucher au code des nœuds.

## Annexe A — colonnes lues contre `0189_role_lecture_n8n.sql` (`node .orchestre/preuves/032-029/colonnes-contre-0189.mjs`)

```text
## presti-suivi-artisan
ÉCART Lire comptes → artisans(id,plan,created_at,is_founder,est_demo,suppression_demandee_le,notifications)  hors 0189 : notifications
ok    Lire demandes → leads(id,artisan_id,canal,created_at)
ok    Lire devis → devis(id,artisan_id,envoye_le,accepte_le)
ok    Lire factures → factures(id,artisan_id,statut,emise_le,avoir_de)
ÉCART Lire registre du suivi → suivi_artisan_envois(cle,artisan_id,etape,envoye_le)  hors 0189 : TABLE ABSENTE DE 0189
## presti-briefing-matin
ok    Lire comptes → artisans(id,plan,est_demo,suppression_demandee_le)
ok    Lire demandes → leads(id,artisan_id,statut,urgence,lu_le,updated_at)
ok    Lire messages → messages(lead_id,sens,etat,sent_at)
ok    Lire devis envoyés → devis(id,artisan_id,statut,total_ttc,envoye_le)
ok    Lire factures → factures(id,artisan_id,statut,date_emission,date_echeance,total_ttc,avoir_de)
ok    Lire matériaux suivis → materiaux(id,artisan_id,seuil_alerte)
ok    Lire stock → stock(id,materiau_id,quantite)
## presti-detecteurs
info  Lecture de connexion (regles_automatisation) → nœud Supabase, table regles_automatisation, toutes colonnes (table dans 0189 : artisan_id,prereglage,maillons,actif,maj_le) ; limit=1
ok    Lire comptes → artisans(id,plan,est_demo,suppression_demandee_le,leads_pause)
ok    Lire factures → factures(id,artisan_id,devis_id,statut,date_echeance,total_ttc,avoir_de,payee_le,type_facture)
ok    Lire devis → devis(id,artisan_id,statut,date_emission,validite_jours,acompte_pct,total_ttc,lead_id,accepte_le,envoye_le,created_at)
ok    Lire demandes → leads(id,artisan_id,statut,urgence,type_chantier,prise_en_main,created_at,updated_at)
ok    Lire chantiers → chantiers(id,artisan_id,devis_id,statut,date_fin_reelle,maj_le)
ok    Lire reservations → chantier_materiaux(id,artisan_id,chantier_id,materiau_id,quantite,statut)
ok    Lire materiaux → materiaux(id,artisan_id,seuil_alerte)
ok    Lire stock → stock(id,materiau_id,quantite)
ok    Lire commandes → commandes_fournisseur(id,artisan_id,statut,chantier_id)
ok    Lire relances impayes → relances_impayes(id,artisan_id,facture_id,rang,jour,statut)
ÉCART Lire arrets de relance → relances_impayes_arrets(facture_id,artisan_id,raison,le,reprise_le)  hors 0189 : TABLE ABSENTE DE 0189
ÉCART Lire reglages des relances → relances_impayes_reglages(artisan_id,actif,jours)  hors 0189 : TABLE ABSENTE DE 0189
ok    Lire reglages de la plateforme → plateforme_config(artisan_id,mode_reponse)
ÉCART Lire tarifs → prix_artisan(id,artisan_id,actif)  hors 0189 : TABLE ABSENTE DE 0189
ok    Lire apres chantier → crm_apres_chantier(artisan_id,avis,entretien,actif_depuis)
ok    Lire rappels → crm_rappels(id,artisan_id,chantier_id,type,echeance,fait_le,envoye_le,origine,cle)
ÉCART Lire reglages du pilote → pilote_reglages(artisan_id,actif,types)  hors 0189 : TABLE ABSENTE DE 0189
ok    Lire cartes refusees → assistant_actions(id,artisan_id,outil,statut,objet_id,maj_le)
écarts : 6
```

## Annexe B — empreintes et motifs (script `/tmp/empreintes-032-029.mjs`, recopié ici)

```js
import fs from 'node:fs'; import c from 'node:crypto'
const cas = [['.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json','scripts/suivi-artisan-qa.mjs'],['.orchestre/preuves/032-013/presti-briefing-matin.workflow.json','scripts/briefing-n8n-qa.mjs'],['.orchestre/preuves/032-019/presti-detecteurs.workflow.json','scripts/detecteurs-n8n-qa.mjs']]
const SUSPECT = /helpers|fetch|http|require|import\s*\(|\bimport\b|Function|eval|constructor|process|globalThis|\$execution|StaticData|\$env|\$vars|\$secrets|setTimeout|setInterval|Buffer|\bthis\b|\$getWorkflow|\$evaluateExpression|\$jmespath|executeWorkflow/
for (const [f, j] of cas) {
  let w = JSON.parse(fs.readFileSync(f,'utf8')); w = w.workflow || w
  const juge = fs.readFileSync(j,'utf8')
  let ok = 0, ko = 0
  for (const n of w.nodes.filter((n) => n.type === 'n8n-nodes-base.code')) {
    const h = c.createHash('sha256').update(n.parameters.jsCode,'utf8').digest('hex')
    if (juge.includes(h)) ok++; else { ko++; console.log('  empreinte ABSENTE du juge :', n.name) }
    const lignes = n.parameters.jsCode.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => !/^\s*\/\//.test(l) && SUSPECT.test(l))
    for (const [i, l] of lignes) console.log(`  motif à lire : ${n.name}:${i} ${l.trim().slice(0, 140)}`)
  }
  console.log(`${f.split('/').pop()} : ${ok} empreintes retrouvées telles quelles dans ${j}, ${ko} absentes`)
}
```

Sortie :

```text
  motif à lire : Étape premiers pas:32 for (const l of lignes('Lire demandes')) if (l.canal !== 'import') ajouter(l.artisan_id, 'leads', l.id, 'created_at', l.created_at, 0, 'prem
  motif à lire : Étape bilan J+14:30 for (const l of lignes('Lire demandes')) if (l.canal !== 'import') compter(l.artisan_id, 'demandes_recues', 'leads', l.id, 'created_at', l.c
  motif à lire : Étape bilan J+30:30 for (const l of lignes('Lire demandes')) if (l.canal !== 'import') compter(l.artisan_id, 'demandes_recues', 'leads', l.id, 'created_at', l.c
presti-suivi-artisan.workflow.json : 8 empreintes retrouvées telles quelles dans scripts/suivi-artisan-qa.mjs, 0 absentes
presti-briefing-matin.workflow.json : 11 empreintes retrouvées telles quelles dans scripts/briefing-n8n-qa.mjs, 0 absentes
presti-detecteurs.workflow.json : 19 empreintes retrouvées telles quelles dans scripts/detecteurs-n8n-qa.mjs, 0 absentes
```

Les trois « motifs à lire » sont la chaîne `'import'` (canal des demandes importées) : faux positifs.

## Annexe C — sortie des mutations (`node .orchestre/preuves/032-029/mutations.mjs`)

```text
TÉMOIN suivi (export intact, même racine) : code 0 — vert, la racine factice ne ment pas
TÉMOIN briefing (export intact, même racine) : code 0 — vert, la racine factice ne ment pas
TÉMOIN detecteurs (export intact, même racine) : code 0 — vert, la racine factice ne ment pas

✓ S1 « Garde du suivi » désactivée (n8n fait passer l’entrée telle quelle : registre, 5 jours et plafond sautés)
  juge du lot : ROUGE (code 1)
    ÉCHEC — 1 défaut(s) sur l'export réel :
    ✗ Garde du suivi : clé de nœud « disabled » interdite (true)
    ✗ mutants : 25/59 rouges pour la raison attendue (code jugé sans les empreintes)
    ✗ mutant fenêtre de J+14 décalée d'un jour : rouge, mais pas pour la raison attendue (Garde du suivi : clé de nœud « disabled » interdite (true))
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-suivi-artisan) : 1 manquement(s)
    ✗ R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    → R1 le workflow doit être inactif (active: false)
    → R1 le workflow ne doit avoir aucune version publiée (activeVersionId)

✓ S2 nœud e-mail orphelin (emailSend, non relié)
  juge du lot : ROUGE (code 1)
    ÉCHEC — 1 défaut(s) sur l'export réel :
    ✗ Envoyer le suivi : type n8n-nodes-base.emailSend interdit (seuls Schedule Trigger, HTTP Request en GET, Code et note) — nœud d'envoi, d'écriture ou de modèle ?
    ✗ mutants : 25/59 rouges pour la raison attendue (code jugé sans les empreintes)
    ✗ mutant fenêtre de J+14 décalée d'un jour : rouge, mais pas pour la raison attendue (Envoyer le suivi : type n8n-nodes-base.emailSend interdit (seuls Schedule Trigger, HTTP Request en GET, Code et note) — nœud d'envoi, 
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-suivi-artisan) : 2 manquement(s)
    ✗ R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    ✗ R4 Envoyer le suivi : nœud d'envoi sans pied déclaré (notes : « pied: mention | PIED_AUTOMATIQUE | PIED_APRES | aucun »)
    → R1 le workflow doit être inactif (active: false)

✓ S3 « Lire comptes » : created_at=gte.2000-01-01 (tous les comptes depuis 2000, filtre de fenêtre neutralisé)
  juge du lot : ROUGE (code 1)
    ÉCHEC — 2 défaut(s) sur l'export réel :
    ✗ Lire comptes : filtre created_at=={{ 'gte.' + $('Réglages du suivi').firs absent ou changé (032-010 M1)
    ✗ gabarit HTTP : Lire comptes.queryParameters.parameters.5.value = "gte.2000-01-01" (attendu "={{ 'gte.' + $('Réglages du suivi').first().json.inscrits_depuis }}")
    ✗ mutants : 25/59 rouges pour la raison attendue (code jugé sans les empreintes)
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-suivi-artisan) : 1 manquement(s)
    ✗ R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    → R1 le workflow doit être inactif (active: false)
    → R1 le workflow ne doit avoir aucune version publiée (activeVersionId)

✓ S4 réglages : exécutions en erreur et manuelles conservées en plus (saveDataErrorExecution, saveManualExecutions)
  juge du lot : ROUGE (code 1)
    ÉCHEC — 1 défaut(s) sur l'export réel :
    ✗ settings hors liste blanche : {"executionOrder":"v1","availableInMCP":true,"timezone":"Europe/Paris","saveDataSuccessExecution":"none","saveDataErrorExecution":"all","saveManualExecutions":true} (attendu {"executionOrd
    ✗ mutants : 25/59 rouges pour la raison attendue (code jugé sans les empreintes)
    ✗ mutant fenêtre de J+14 décalée d'un jour : rouge, mais pas pour la raison attendue (settings hors liste blanche : {"executionOrder":"v1","availableInMCP":true,"timezone":"Europe/Paris","saveDataSuccessExecution":"none"
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-suivi-artisan) : 1 manquement(s)
    ✗ R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    → R1 le workflow doit être inactif (active: false)
    → R1 le workflow ne doit avoir aucune version publiée (activeVersionId)

✓ B1 « Contrôle des lectures » désactivé (lectures tronquées ou inattendues plus vérifiées)
  juge du lot : ROUGE (code 1)
    → Contrôle des lectures : clé de nœud non permise (disabled)
    → Contrôle des lectures : clé de nœud non permise (disabled)
    → Contrôle des lectures : clé de nœud non permise (disabled)
    → Contrôle des lectures : clé de nœud non permise (disabled)
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-briefing-matin) : 1 manquement(s)
    ✗ R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    → R1 le workflow doit être inactif (active: false)
    → R1 le workflow ne doit avoir aucune version publiée (activeVersionId)

✓ B2 « Lire factures » : continueOnFail (ancienne clé de n8n ; une lecture en panne devient « aucun impayé »)
  juge du lot : ROUGE (code 1)
    → Lire factures : clé de nœud non permise (continueOnFail)
    → Lire factures : clé de nœud non permise (continueOnFail)
    → Lire factures : clé de nœud non permise (continueOnFail)
    → Lire factures : clé de nœud non permise (continueOnFail)
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-briefing-matin) : 1 manquement(s)
    ✗ R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    → R1 le workflow doit être inactif (active: false)
    → R1 le workflow ne doit avoir aucune version publiée (activeVersionId)

✓ B3 « Lire messages » : hôte suffixé (gorcdvmueakcncsmrouo.supabase.co.exemple.invalid), même identifiant
  juge du lot : ROUGE (code 1)
    → Lire messages : adresse hors des tables permises de l'API REST du projet (https://gorcdvmueakcncsmrouo.supabase.co.exemple.invalid/rest/v1/messages)
    → Lire messages : adresse hors des tables permises de l'API REST du projet (https://gorcdvmueakcncsmrouo.supabase.co.exemple.invalid/rest/v1/messages)
    → Lire messages : adresse hors des tables permises de l'API REST du projet (https://gorcdvmueakcncsmrouo.supabase.co.exemple.invalid/rest/v1/messages)
    → Lire messages : adresse hors des tables permises de l'API REST du projet (https://gorcdvmueakcncsmrouo.supabase.co.exemple.invalid/rest/v1/messages)
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-briefing-matin) : 2 manquement(s)
    ✗ R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    ✗ R7 Lire messages : hôte non permis (gorcdvmueakcncsmrouo.supabase.co.exemple.invalid)
    → R1 le workflow doit être inactif (active: false)

✓ D1 « Lecture de connexion » : table artisans, returnAll (toutes les colonnes de tous les comptes, dont nom et e-mail)
  juge du lot : ROUGE (code 1)
    → nœud Supabase Lecture de connexion (regles_automatisation) : table artisans interdite (regles_automatisation seulement)
    → nœud Supabase Lecture de connexion (regles_automatisation) : table artisans interdite (regles_automatisation seulement)
    → nœud Supabase Lecture de connexion (regles_automatisation) : table artisans interdite (regles_automatisation seulement)
    → nœud Supabase Lecture de connexion (regles_automatisation) : table artisans interdite (regles_automatisation seulement)
  n8n-specs-qa : VERT (code 0)
    → R1 le workflow doit être inactif (active: false)
    → R1 le workflow ne doit avoir aucune version publiée (activeVersionId)
    → R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    → R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow

✓ D2 « Niveau proposé selon l offre » désactivé (constats sans plafond d’offre ni portes du pilote)
  juge du lot : ROUGE (code 1)
    → nœud désactivé : Niveau proposé selon l offre
    → nœud désactivé : Niveau proposé selon l offre
    → nœud désactivé : Niveau proposé selon l offre
    → nœud désactivé : Niveau proposé selon l offre
  n8n-specs-qa : VERT (code 0)
    → R1 le workflow doit être inactif (active: false)
    → R1 le workflow ne doit avoir aucune version publiée (activeVersionId)
    → R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow
    → R3 aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow

✓ D3 branche d’erreur : Slack après « Message d échec », qui poste le texte brut de l’erreur
  juge du lot : ROUGE (code 1)
    → type de nœud interdit : Poster l échec (n8n-nodes-base.slack)
    → type de nœud interdit : Poster l échec (n8n-nodes-base.slack)
    → type de nœud interdit : Poster l échec (n8n-nodes-base.slack)
    → type de nœud interdit : Poster l échec (n8n-nodes-base.slack)
  n8n-specs-qa : ROUGE (code 1)
    ✗ ../../../../tmp/audit-032-029/specs-mutant.workflow.json (presti-detecteurs) : 1 manquement(s)
    ✗ R4 Poster l échec : nœud d'envoi sans pied déclaré (notes : « pied: mention | PIED_AUTOMATIQUE | PIED_APRES | aucun »)
    ✗ mutants sur presti-detecteurs : la base n'est pas verte, ils ne prouveraient rien
    → R4 Réponse seule : pied « mention » déclaré mais absent du texte envoyé

10/10 mutations rougies par le juge du lot ; 8/10 par n8n-specs-qa
code 0
```
