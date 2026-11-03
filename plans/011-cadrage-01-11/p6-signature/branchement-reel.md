# Branchement réel des agents n8n de Studio et Signature (tâche 036-030, 03/11/2026 au soir)

Écrit par Claude Code sur l'hôte d'agents d'Oracle. Il répond à l'audit `audit-0311-fonctionnement.md` (036-029), aux gestes 2 de son verdict.
- **Rien n'est envoyé**, et aucune porte « simulation » n'est levée.
- Aucun palier « réel » n'est servi. Aucune migration n'est appliquée et aucun identifiant n8n n'est créé.
- Juge : `node scripts/branchement-reel-qa.mjs`. Il est vert, avec 23 mutants sur 23 tués. Sorties complètes : `.orchestre/preuves/036-030/resume.md`.

## Ce que l'audit a trouvé, et ce qui change

| # | Maillon (audit) | Avant (036-029) | Après (036-030) | Preuve |
|---|---|---|---|---|
| 1 | Une demande devient un événement pour n8n (S10) | **absent** : aucun écrivain de `evenements_metier` | **branché, derrière `systemeAgents` (baissé)**. Il écrit `demande_recue` après l'enregistrement de la demande, avec la clé unique `demande_recue:<lead>`, sans texte libre. Il ne lève jamais d'exception et abandonne au bout de 1,5 s. | `lib/evenements/ecrivain.ts` ; `app/api/leads/route.ts` (bloc « 2quater ») ; juge E1 à E10 |
| 1 bis | Une relance due devient un événement | **absent** | **écrit, pas encore appelé**. `evenementRelanceDue` donne une clé par demande et par rang. Son seul appelant naturel, `app/api/cron/relances/route.ts`, est hors de mon périmètre : une ligne à poser par la session principale (plus bas). | `lib/evenements/ecrivain.ts` ; juge E6 |
| 2 | Les lectures du Cerveau (S11) | **trois `noOp`** ; tables lues inexistantes (`systeme_reglages`) ou colonnes fausses | **six lectures HTTP réelles**, par « Supabase account », la voie de `presti-accuse-reception`. Lectures : `departements_reglages` (« tous », puis les départements), `artisans`, `plateforme_config`, `n8n_evenements_a_traiter` et `leads`. Chacune filtre par compte, avec `select=` limité, et ne tourne qu'une fois par passage. Une panne n'arrête que le passage, sans effet. | export `.orchestre/preuves/036-030/presti-cerveau.workflow.json` ; juge L2 à L9 |
| 2 bis | Lecture réelle constatée | — | **exécution 996** (manuelle, sans données épinglées) : `departements_reglages` répond 200 avec `[]`. La table de 0193 existe donc en production. Aucun compte n'est en marche, le passage s'arrête sur `interrupteur_general_coupe`, sans effet. | `essais-n8n.json`, essai « lectures-reelles » ; juge O8 |
| 3 | Le palier « ombre » (G8) | **absent** : « Aiguiller » sautait tout ce qui n'était pas en simulation | **servi**. Le palier d'un département est le plus prudent de « tous » et du sien (0193:181-183). Les chefs reçoivent toujours `simulation: true` : la porte d'envoi reste fermée, et aucun brouillon ne se pose dans la boîte (`mode-ombre.md:41`). « réel » donne le saut `palier_reel_non_branche`. | `lib/agents/n8n/cerveau-reel.mjs` (`CODE_AIGUILLER`) ; juge L13, L14, O5 |
| 4 | L'écriture d'une carte (S12, G6) | **absente** : `lib-executer` s'arrête, et la cible `opportunites` n'est lue par personne | **branchée, en ombre seulement**. Le nœud « Préparer les cartes de l'ombre » écrit une ligne `assistant_actions` par carte : à valider, à confirmer, échéance de 7 jours, département, motif, source de chaque fait, clé du chef. L'écriture se fait par un seul POST `on_conflict=artisan_id,cle` avec doublons ignorés. Même compte exigé partout. En ombre, une mise en file du pilote devient une carte. | `CODE_CARTES` ; essai n8n **999** (épinglé, aucune écriture) ; juge O1, O2, O7, C6 à C8 |
| 4 bis | Colonnes de la carte | absentes | **migration écrite, non appliquée** : `0194_cartes_agents.sql` et son jumeau. Elle ajoute `origine`, `departement`, `motif`, `sources` et `cle`. Une carte d'agent a forcément ses sources, est toujours à confirmer et naît « à valider ». La clé est unique par compte. La vue des événements et la marque « traité » sont ouvertes à la voie de n8n. | `supabase/migrations/0194_cartes_agents.sql` ; `_A_COLLER_sql_editor_0194_cartes_agents_NU.sql` ; juge C9 à C15 ; `migrations-jumelles-e2e` : 596 verts |
| 4 ter | La marque « traité » | absente | **branchée** (`evenements_marquer_traites`, 200 identifiants au plus par compte). Elle porte sur les événements servis, rejetés ou sautés, jamais sur un département en échec, qui sera rejoué. Sans elle, un événement serait relu chaque minute : coût du modèle, et file bouchée. | `CODE_MARQUES` ; essai 999 ; juge O3 |
| 5 | Où l'artisan voit et valide (§ 2) | **aucune surface** | **boîte « À valider » dans l'outil de gestion**, derrière le drapeau neuf `boiteAgents`, baissé. Chaque carte montre ce qui est proposé, pourquoi (motif et sources), la ligne « Fait : … » une fois l'action faite, et deux boutons, Valider et Refuser. Le clic ne fait que **noter** la décision (`en_cours` ou `refusee`) : il n'envoie rien, sur aucune offre. | `app/crm/BoiteAgents.tsx`, `app/crm/Gestion.tsx`, `app/api/assistant/agents/route.ts`, `lib/agents/n8n/cartes.ts` ; juge B1 à B10, C1 à C5 |

**Bancs rejoués** avec le Cerveau branché, porte « simulation » à vrai, données « Exemple. » :
- `presti-banc-cerveau`, exécution **1007** : réussie ;
  - compte Studio : 16 cartes, 0 pilote, 4 escalades, 2 spams ;
  - compte Signature : 4 cartes, 13 pilotes, 3 escalades, 1 spam ;
- `presti-banc-argent`, exécution **1016** : réussie ;
  - devis : 3 et 5 cartes ;
  - facturation : 4 et 3 cartes, plus 2 pilotes.

Ils appellent les chefs directement, avec des demandes fictives : ils prouvent que les départements n'ont pas bougé, pas les lectures. Les lectures réelles sont prouvées par l'exécution 996, le chemin de l'ombre par l'exécution 999.

**Republication** : seul `presti-cerveau` a changé ; ses enfants (chefs, `lib-*`) n'ont pas été touchés. Il a été republié le 03/11 vers 17 h 37 UTC (version active `9b019809-…`). Une fois publié, il tourne chaque minute. Aujourd'hui, il fait une lecture et s'arrête : aucun compte n'est en marche.

## L'écart avec la consigne, écrit

La tâche demandait de lire « par le rôle `n8n_lecture` (0189), avec la même voie que les workflows déjà publiés ». Les deux ne vont pas ensemble aujourd'hui :
- les workflows publiés, `presti-accuse-reception` compris, lisent par « Supabase account » (clé de service) ;
- aucun identifiant Postgres de `n8n_lecture` n'existe dans n8n, et en créer un m'est interdit.

J'ai donc pris **la voie des workflows publiés**, filtrée par compte sur chaque requête (fiche méthode n8n, point 8). La migration 0194 :
- ouvre la vue `n8n_evenements_a_traiter` et la marque à `service_role` (0193 les lui avait retirées) ;
- prépare aussi la lecture de `departements_reglages` par `n8n_lecture`, pour le jour où Benj posera son identifiant.

## Ce qui reste pour le mode ombre sur un compte de test

Dans l'ordre, chaque pas réversible :
1. **Session principale** : l'essai à sec de 0194 (bloc `do` qui exécute le jumeau puis `raise exception`), puis le « go » écrit de Benj. Ensuite la pose de **0194**, et les contrôles du pied du jumeau.
   - Tant que 0194 manque, une carte de l'ombre ne peut pas s'écrire (colonnes absentes). La lecture de la vue des événements échoue elle aussi (droit de `service_role`), et le Cerveau s'arrête sans effet.
2. **Session principale** : rejouer `node scripts/branchement-reel-qa.mjs`, `npm run typecheck` et `npm run build`. Je n'en ai lancé aucun : c'est interdit sur l'hôte.
3. **Benj** : un compte de **test** volontaire (`mode-ombre.md` § 1 : accord écrit, ligne de base des KPI). Puis, par Presti (acteur fondateur, 0193:205-226) :
   - `departements_reglages` : `tous` à `ombre`, `en_marche = true` ;
   - `accueil` à `ombre`, `en_marche = true`.
4. **Lever `systemeAgents`** (sinon aucun `demande_recue` n'est écrit), puis **`boiteAgents`**. Une demande d'essai sur la page `/p` du compte de test doit donner :
   - un événement ;
   - au passage suivant, une carte « À valider » dans l'outil de gestion ;
   - l'événement marqué « traité » ;
   - **zéro envoi**.
5. **Une ligne à poser** (hors de mon périmètre) : l'appel `ecrireEvenement(supabaseAdmin, evenementRelanceDue({ artisanId, leadId, rang }))` dans `app/api/cron/relances/route.ts`, au moment où une relance est due, derrière `systemeAgents`. Sans elle, le Suivi ne reçoit rien en ombre.
6. **Limites connues du Cerveau branché**, à lever avant d'élargir :
   - la demande composée pour l'Accueil n'a ni empreinte de contact, ni proposition existante, ni « client existant » lu : valeurs prudentes (`null`, `false`) ;
   - la configuration de l'Accueil prend des défauts prudents : pilote inactif, horaires larges, grille de qualification du banc ;
   - seuls l'Accueil (demande lue) et les squelettes reçoivent des événements réels. Les chefs Devis et Facturation attendent une entrée qu'aucun événement réel ne porte encore : ils rejettent, et c'est journalisé.

## Ce qui reste pour le réel

- `lib-executer` : brancher l'effet réel d'une carte **validée** (`assistant_actions.statut = 'en_cours'`, origine « agent ») au lieu de `opportunites` et `pilote_file`. Puis passer `executee` et `resultat_resume` : c'est la ligne « Fait : … » que la boîte affiche déjà.
- SMTP et IMAP dans le conteneur, `BOITE_CLE_N8N`, vérification Google de Gmail, puis `connexions` (audit, gestes 3 et 4).
- Le palier « réel » dans « Aiguiller » (aujourd'hui sauté), compte par compte, sur le « go » écrit de Benj (p6 § 1.4).
- Le point ouvert de l'audit : la photo du prospect envoyée au modèle, contraire au registre § 23.
