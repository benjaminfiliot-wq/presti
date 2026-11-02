# 032-014 — le suivi des artisans dans n8n (chantier 4, lot L17) : résumé de preuve

Fait le 02/11/2026 au soir par Claude Code, sur l'hôte d'agents Oracle (`/home/usine/Documents/presti`), session lancée par Orca.

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans le travail |
|---|---|
| MCP `cerveau` — `regles_pour` (« envoyer un e-mail automatique à un artisan depuis n8n », « créer un workflow n8n ») | a remonté la règle `un-message-par-artisan-avant-5-jours` (l'écart de 5 jours de la garde), la règle n8n-first et la séparation des quotas Brevo / produit (`email-brevo.md:19-20`) : d'où un workflow distinct, sans Brevo |
| MCP `cerveau` — `chercher` (« suivi des artisans 48 heures J+14 J+30 », « relances prospection et produit ton », « positionnement automatique », « e-mails envoyés par Presti registre des traitements ») puis `lire` | `memoire-presti/un-message-par-artisan-avant-5-jours.md` (5 jours, jamais deux le même jour) ; `vault/wiki/concepts/Relances - prospection et produit.md` §2 (zéro culpabilisation, « vous n'avez pas répondu » interdit, zéro fausse urgence → liste `TOURNURES` du juge) ; `vault/wiki/concepts/Positionnement automatique.md` (« automatique » doit rester vrai, Studio ne part pas seul → aucun texte ne dit « part seul », le juge le rougit) ; `docs/registre-traitements.md` §4 (section à mettre à jour avant l'activation) |
| Skill `reseau-neuronal` + `quoi_de_neuf` (1 jour, mémoire) | mode d'emploi suivi (lire avant de produire, citer les chemins, ne rien écrire : copie du vault en lecture) ; a fait relire `toutes-les-ressources-a-chaque-construction-0211` (la présente section) |
| MCP `n8n-oracle` — `get_workflow_sdk_reference`, `get_workflow_best_practices` (scheduling, notification), `search_nodes`, `validate_workflow`, `create_workflow_from_code`, `update_workflow`, `prepare_workflow_pin_data`, `test_workflow`, `get_workflow_execution`, `get_workflow_details`, `search_workflows`, `search_projects` | code SDK sans gabarits `${}` dans les `jsCode` ; « Trace item counts » → `executeOnce` sur chaque lecture ; « empty notification prevention » → `alwaysOutputData` assumé (032-010 M10) parce que chaque nœud Code filtre l'élément vide ; groupes du canevas (avertissement du MCP) ; réglages par `setWorkflowSettings` ; aucun workflow d'erreur commun trouvé (`search_workflows` « erreur », « error » : 0) |
| Fiches `plans/011-cadrage-01-11/p5-entreprise/fiches-depots.md` et `fiche-methode-n8n.md` (passages : erreurs, réglages, tests par données épinglées) | workflow d'erreur désigné dans les réglages, pas un Error Trigger caché (→ « Avant l'activation ») ; « les nœuds Code s'exécutent pour de vrai à l'essai » → code pur, sans effet extérieur |
| Juge des détecteurs `scripts/detecteurs-n8n-qa.mjs` (032-012, dans `fait/`) et son bac à sable (l.293-418) | bac à sable **copié** (source citée dans le juge), adapté pour recevoir l'entrée d'un nœud ; gabarit HTTP exact, empreintes SHA-256, mutants jugés sans empreintes : même méthode |
| Audit `032-010` (`.orchestre/preuves/032-010/rapport.md:34-120`, annexe E l.581-600) | É1 (options exactes), É3 (empreintes + bac à sable), M1 (filtres aux valeurs, contrôle nominatif ajouté), M10 (`alwaysOutputData` exigé), M11 (clés d'un brouillon en liste blanche), F1 (`saveDataSuccessExecution: none`), F2 (`availableInMCP` gardé, justifié) ; l'évasion de l'annexe E rejouée dans le bac à sable |
| Brief et export de `032-003` (`c4-n8n-detecteurs.md`, `presti-detecteurs.workflow.json`) | forme suivie : lectures GET `select=`, pagination à 1 000, identifiant « Supabase account » par son id, projet personnel de Benj |
| Vidéos déjà analysées : `plans/analyse-videos.md:143` (bilan à 14 ou 30 jours, idées tirées des usages réels), `:205` et `:255` (48 h, petites réussites) | étapes `premiers_pas` (née de la première réussite), `bilan_j14`, `bilan_j30` (comptes réels) |
| Skill `ecc:security-review` | passé en revue : aucun secret (scan du juge sur l'export) ; aucune donnée personnelle lue (liste blanche de colonnes) ; injection dans les filtres PostgREST : seuls des `uuid` lus en base entrent dans `in.(…)` ; journaux : rien des passages réussis n'est conservé (F1), les passages en erreur gardent des identifiants seulement (noté plus bas) ; RLS du registre proposée sans politique (question 1) |
| Plan du chantier 4 (§0 bis rangs 10, 11, 23, 26 ; question 4 ; règles communes ; §7 ; §14 L17), `.claude/agents/knowledge/mails.md` (§2 Reply-To, §4 ton), `lib/email.ts`, `lib/plans.ts`, `lib/notificationsTypes.ts`, `lib/mentionAssistant.ts`, `lib/canaux/regles.ts` | textes de Presti sans mention d'IA, `peut()` pour « part seul », « absent = activé » pour l'opposition, `CANAL_IMPORT` importé par le juge |

## Ce qui existe maintenant

| Livrable | Où | État |
|---|---|---|
| Workflow `presti-suivi-artisan` | n8n d'Oracle, id **`2HsfV00lGSX1KGY1`**, projet personnel de Benj (`S2WEcbpHoXOWFMVB`), aucun dossier | **inactif, jamais publié** (`active: false`, `activeVersionId: null`), 15 nœuds (14 + une note), fuseau `Europe/Paris` ; aucun identifiant créé ni modifié (les 5 lectures portent « Supabase account » `dTewDK98MLrNckNG`) |
| Brief | `plans/011-cadrage-01-11/briefs/c4-n8n-suivi-artisan.md` | nœuds, colonnes au fichier:ligne (une ligne par colonne), étapes et fenêtres, garde, textes mot pour mot, réglages, limites du juge |
| Export | `.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json` | tiré par `get_workflow_details` après la dernière modification, extrait tel quel du journal de session (rien retapé) ; le `jsCode` de chaque nœud est identique, octet pour octet, à la source écrite |
| Essai | `.orchestre/preuves/032-014/essai-n8n.json` | pin data et sortie de n8n (exécution 330) |
| Juge | `scripts/suivi-artisan-qa.mjs` | vert, 59 mutants sur 59 rouges pour leur raison |

Chaîne : Déclencheur 10 h → Réglages du suivi → Lire comptes → Lire demandes → Lire devis → Lire factures → Lire registre du suivi →
Départ du suivi → Étape premiers pas → Étape bilan J+14 → Étape bilan J+30 → Garde du suivi → Textes du suivi (brouillons) → Brouillons et bilan.
Aucun nœud d'envoi, aucune écriture, aucun appel à un modèle, aucun `getWorkflowStaticData`.

## Les colonnes lues

`artisans` : `id`, `plan`, `created_at`, `is_founder`, `est_demo`, `suppression_demandee_le`, `notifications` ; `leads` : `id`, `artisan_id`, `canal`,
`created_at` ; `devis` : `id`, `artisan_id`, `envoye_le`, `accepte_le` ; `factures` : `id`, `artisan_id`, `statut`, `emise_le`, `avoir_de` ;
`suivi_artisan_envois` (à créer) : `cle`, `artisan_id`, `etape`, `envoye_le`. Source de chacune au fichier:ligne dans le brief, vérifiée par le
juge. Lu en moins que permis : `devis.statut`, `devis.created_at`. Écart relevé dans la tâche : `created_at` des artisans est à
`0001_artisans.sql:13`, pas `:11` (qui est `tel`).

## Les étapes

| Étape | Passe | Né de | Champs |
|---|---|---|---|
| `premiers_pas` | J0 à J+3 | la première réussite datée de J0 à J+2 (demande reçue hors import, devis envoyé, devis accepté, facture émise hors avoir et annulée) ; l'inscription seule ne fait rien | aucun |
| `bilan_j14` | J+14 à J+16 | au moins un événement depuis l'inscription ; sinon « silencieux » | demandes reçues, devis envoyés, devis acceptés, factures émises |
| `bilan_j30` | J+30 à J+32 | idem | idem |

Garde : clé au registre, écart de 5 jours, un par artisan et par passage, plafond de 10 (le surplus reporté, en tête le lendemain).

## L'essai sur données fictives (`test_workflow`)

Exécution **330** (`manual`, `success`, 272 ms), jour de Paris `2026-11-02`, onze comptes fictifs (`00000000-0000-4000-8000-…`), les six nœuds
à épingler épinglés (déclencheur et 5 lectures ; `prepare_workflow_pin_data` : aucun schéma, données écrites à la main), aucune lecture réelle.
Sortie de n8n :

| Étape | Brouillons | Reportés | Silencieux |
|---|---|---|---|
| premiers_pas | 1 (`…0001`, `premiere_demande`, demande `…0101`) | 0 | 2 (inscription seule `…0002` ; demande importée seule `…0011`) |
| bilan_j14 | 1 (`…0003` : demandes 1, devis envoyés 1, acceptés 0, factures 1 — l'import, l'avoir et l'annulée ne comptent pas ; inscrit à 22 h 30 UTC, J+14 au jour de Paris) | 0 | 0 |
| bilan_j30 | 0 | 0 | 1 (`…0004`) |

Écartés : démo 1, fondateur 1, opposition au suivi 1, suppression demandée 1, clé déjà au registre 1, écart de 5 jours 1. C'est le calcul fait
à la main avant l'essai ; le juge le rejoue hors ligne à l'identique et le confronte à son oracle.

## La sortie du juge

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/suivi-artisan-qa.mjs` → code 0, 1 min 34 sur Oracle :

```text
  ✓ structure : inactif, jamais publié ; 5 lectures GET au gabarit exact (options et pagination), select= = brief, filtres aux valeurs attendues ; réglages en liste blanche ; aucun secret ; chaîne exacte
  ✓ empreintes : 8 nœuds Code épinglés (posées par l'auteur : à reconfirmer par l'audit distinct)
  ✓ colonnes : chacune à la ligne citée de sa migration ; le registre est « à créer »
  ✓ textes : égaux au brief, en brouillon, sans chiffre, mot interdit, marque, tournure du rang 10, mention d'IA ni « part seul »
  ✓ rejeu : J−1 à J+40, 41 jours d'affilée avec registre (et second passage du jour), registre et cinq jours, plafond qui reporte, jour de Paris, première réussite, garde seule, 40 jeux au hasard — invariants et oracle
  ✓ essai n8n : pin data rejouée hors ligne = sortie de n8n ; chaque nœud HTTP épinglé
  ✓ bac à sable : processus enfant --permission --disallow-code-generation-from-strings (Node v24.21.0) — écriture ERR_ACCESS_DENIED, lecture ERR_ACCESS_DENIED, processus ERR_ACCESS_DENIED, worker ERR_ACCESS_DENIED, fetch undefined ; réseau PERMIS (Node 24 n’a pas de barrage réseau : le code n’y atteint pas, faute de tout objet de l’hôte dans son contexte) ; évasions (annexe E de 032-010, fetch caché, constructeurs, import, disque) : rien d'atteint
  ✓ mutants : 59/59 rouges pour la raison attendue (code jugé sans les empreintes)
OK
```

Premier passage : rouge, par un défaut du juge lui-même (gabarit de pagination imbriqué une fois de trop, 35 écarts sur l'export réel) ;
corrigé, et un contrôle nominatif des filtres ajouté (le mutant « est_demo neutralisé » rougissait, mais sans nommer le filtre).
Les 59 mutants : fenêtre J+14 décalée, filtres démo, fondateur, suppression et opposition ôtés du code, `est_demo` neutralisé puis retiré de la
requête, registre ignoré, écart de 5 jours ôté, « un par artisan » ôté, plafond qui perd, événement inventé, nombre gonflé, brouillon sans
événement, silencieux qui écrit, import compté (bilan, premiers pas), avoir compté, dernière réussite au lieu de la première, jour en UTC ;
`email`, `nom_prospect`, alias JSON dans un `select=` ; proxy, certificats non vérifiés, redirection, réponse complète, `nextURL` vers un tiers,
POST, hôte changé, second identifiant, `alwaysOutputData` retiré, `onError` ; nœud HTTP POST vers une API d'envoi, nœud e-mail, nœud Brevo ;
workflow actif, publié, `errorWorkflow` inconnu, exécutions conservées ; faux secret, faux jeton (fabriqués à l'exécution) ;
`getWorkflowStaticData` ; texte validé, brief différent du nœud, chiffre, « n8n », « Claude », « modèles », mention d'IA, « part seul »,
tournure culpabilisante, ligne d'opposition retirée, déclaration « non visé » retirée, colonne mal sourcée ; `jsCode` changé (empreinte),
`fetch` caché, écriture disque, `this.helpers`.

## Ce que le réseau neuronal a dit

- Une seule règle d'envoi par artisan : un message, puis cinq jours au moins (`memoire-presti/un-message-par-artisan-avant-5-jours.md`).
- Le ton : ni « vous n'avez pas répondu », ni culpabilité, ni fausse urgence (`vault/wiki/concepts/Relances - prospection et produit.md` §2).
- « Automatique » doit rester vrai : Studio prépare, l'artisan valide (`vault/wiki/concepts/Positionnement automatique.md`).
- Rien sur un suivi des artisans déjà écrit dans le vault : la seule source est le plan (rang 11) et les vidéos (`analyse-videos.md:143`, `:205`, `:255`).

**À porter au réseau neuronal** (par la session principale, tâche de périmètre `SaaS/…`) : une note `playbook` « Workflow n8n en brouillon :
lectures GET au gabarit exact, garde registre + 5 jours + plafond qui reporte, juge hors ligne à oracle indépendant et mutants » (preuve :
ce dossier) ; et l'écart `0001_artisans.sql:11` → `:13` pour `created_at`.

## Questions

1. **Registre des envois du suivi** — une table Supabase neuve, `suivi_artisan_envois` : `cle text primary key` (`suivi:<artisan_id>:<étape>`),
   `artisan_id uuid not null references artisans(id) on delete cascade`, `etape text not null check (etape in ('premiers_pas','bilan_j14','bilan_j30'))`,
   `envoye_le timestamptz not null default now()` ; RLS activée sans politique (service seul), `grant select (cle, artisan_id, etape, envoye_le)
   … to n8n_lecture`. Migration écrite par la session principale, au « go » de Benj. Tant qu'elle manque, la lecture rend 404 et rien ne sort.
2. **L'interrupteur « suivi »** dans Paramètres → Notifications (`lib/notificationsTypes.ts:5-11` : un type `suivi`, absent = activé) et le
   lien d'opposition : un lot d'interface, derrière un drapeau baissé de `lib/flags.ts`. En attendant, le texte dit « répondez stop » (vrai :
   Reply-To `contact@prestiapp.fr`), et l'opposition se pose à la main dans `notifications.suivi = false`.
3. **Plafond par passage** : 10 par défaut, sur les 100 envois par jour de l'offre gratuite de Resend (`lib/email.ts:77-79`), partagés avec les
   e-mails du produit (`:88-94`, 80 par défaut pour le produit). Limite : un report au dernier jour d'une fenêtre (J+3, J+16, J+32) se perd.
   (a) garder 10 ; (b) l'abaisser ; (c) allonger les fenêtres de rattrapage.
4. **L'heure et les fenêtres** : 10 h, premiers pas J0-J+3 (réussites J0-J+2), bilans J+14-J+16 et J+30-J+32. (a) garder ; (b) autre heure ;
   (c) fenêtres plus courtes (le jour pile seulement).
5. **Un compte sans aucun événement à J+14** : (a) rien, compté « silencieux » (défaut, rang 11) ; (b) un message d'aide (un texte de plus à valider).
6. **La pause générale** que l'app respecte avant tout envoi (`lib/email.ts:73-76`) : n8n ne la lit que par la fonction `ops_interrupteur`, le
   schéma `ops` étant fermé à l'API (`0096_ops_socle.sql:258`). (a) le lot d'envoi appelle `rpc/ops_interrupteur` (POST en lecture : exception au
   « GET seul » à écrire) ; (b) une vue en lecture dans `public` (migration, « go »).
7. **La signature** des e-mails : « Presti » seul (défaut, la version la plus sobre) ; (a) garder ; (b) « Benjamin, pour Presti » ; (c) autre.
8. **`availableInMCP`** (F2 de 032-010) : gardé à `true`, parce que c'est par le MCP que Claude Code construit, essaie et exporte le workflow ;
   le passer à `false` avant la publication ? (le juge l'exige aujourd'hui à `true` : à changer avec lui).

## Avant l'activation

- Chaque texte (six, dans le brief) validé par Benj, mot pour mot ; puis l'empreinte du nœud des textes reposée et le juge rejoué.
- La question 4 du plan confirmée (Resend appelé par n8n, hors du quota de la prospection) et la clé Resend posée **par Benj** dans n8n.
- Le registre `suivi_artisan_envois` posé (question 1), et une lecture réelle qui prouve qu'il répond (la connexion se prouve à part, comme 032-003).
- L'interrupteur d'opposition en ligne (question 2).
- Le nœud d'envoi ajouté par un lot suivant : l'adresse et le nom lus au seul moment d'envoyer (plan l.144-145), une adresse `.invalid` écartée
  (`lib/email.ts:69`), la pause générale lue (question 6), le registre écrit après chaque envoi réussi (et seulement alors).
- La branche d'erreur (rang 26) : aucun workflow d'erreur commun n'existe sur l'n8n d'Oracle (`search_workflows` « erreur » / « error » : aucun,
  le 02/11) ; à créer, puis désigné par `settings.errorWorkflow` (et ajouté à la liste blanche du juge).
- La section « Les emails envoyés par Presti » du registre des traitements mise à jour (`docs/registre-traitements.md:41-51`) : suivi des
  artisans, base légale (exécution du contrat), données lues par n8n (identifiants, dates, statuts), opposition ; et la section « Lectures de n8n
  sur le serveur Oracle » (plan, règles communes). Note : un passage **en erreur** garde ses données d'exécution dans n8n (identifiants seulement).
- `suivi-artisan-qa` au tableau `SUITES` de `scripts/tout-verifier.mjs` (L11, session principale).
- Un audit distinct (agent qui n'a pas écrit ce lot), qui reconfirme aussi les huit empreintes du juge.
- La publication, sur le « go » écrit de Benj.

## Réserves

- Le rejeu n'est pas n8n : le conteneur `runners` d'Oracle a le réseau sortant (brief des détecteurs, l.150-160) ; seule l'empreinte du code et la
  règle « aucune modification hors du MCP de Claude Code » protègent un nœud Code dans n8n.
- Les empreintes du juge ont été posées par l'auteur du code : elles ne valent qu'après l'audit distinct.
- « Un brouillon par artisan et par passage » ne peut pas se déclencher avec les fenêtres par défaut (elles ne se chevauchent pas) : le juge le
  prouve en jouant la garde seule sur des candidats fabriqués.
