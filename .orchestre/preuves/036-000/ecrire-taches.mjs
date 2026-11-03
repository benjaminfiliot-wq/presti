// 036-000 — écrit les tâches .orchestre/file/036-001.md à 036-012.md depuis le § 4 de
// plans/011-cadrage-01-11/p6-signature/premiere-reponse.md. Un seul endroit pour les blocs communs (rôle, Benj, ressources, fin),
// pour que les douze tâches disent la même chose. Rejouable : réécrit les mêmes fichiers.
import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..')
const PLAN = 'plans/011-cadrage-01-11/p6-signature/premiere-reponse.md'
const P6 = 'plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md'

// Le contrôle de la preuve, commun : resume.md COMMENCE par « ## Ressources utilisées », au moins quatre entrées, et cite le prompt 6,
// ce plan, les fiches des vidéos et le réseau neuronal.
const ressources = (id) => `node -e "const t=require('fs').readFileSync('.orchestre/preuves/${id}/resume.md','utf8');const m=t.match(/^\\s*## Ressources utilisées([\\s\\S]*?)(\\n## |$)/);process.exit(m&&(m[1].match(/^\\s*[-*|] /gm)||[]).length>=4&&/p6-signature-et-sur-mesure/.test(m[1])&&/premiere-reponse/.test(m[1])&&/fiches-videos/.test(m[1])&&/cerveau/.test(m[1])?0:1)"`
const TS = 'node --experimental-strip-types --import ./scripts/ts-loader.mjs'
const JUGES_N8N = `node scripts/lib-socle-n8n-qa.mjs && node scripts/lib-metier-n8n-qa.mjs && node scripts/lib-relance-n8n-qa.mjs`
const specs = (id) => `${TS} scripts/n8n-specs-qa.mjs .orchestre/preuves/${id}`
const OFFRES = `${TS} scripts/offres-affichage-qa.mjs && ${TS} scripts/pilote-qa.mjs`

const INTERDIT_N8N = [
  'tout workflow n8n existant hors périmètre (presti-*, hermes-*, reseau-neuronal-*, les lib-* et ent-exemple-* : lecture seule, gabarits ou appels épinglés)',
  'toute publication ou activation', 'tout identifiant n8n créé ou modifié', 'tout appel réel au modèle', 'toute lecture ou écriture réelle de Supabase',
  'tout envoi', 'toute migration appliquée', 'scripts/n8n-specs-qa.mjs', 'scripts/lib-socle-n8n-qa.mjs', 'scripts/lib-metier-n8n-qa.mjs',
  'scripts/lib-relance-n8n-qa.mjs', 'scripts/pilote-qa.mjs', 'app/**', 'lib/**', 'supabase/**', 'le cerveau en écriture', 'le vault', 'commit', 'push', 'build', 'secrets',
]
const INTERDIT_CODE = [
  'tout workflow n8n en écriture', 'toute migration appliquée', 'tout envoi', 'toute dépense', 'tout compte', 'scripts/n8n-specs-qa.mjs',
  'scripts/offres-affichage-qa.mjs', 'scripts/pilote-qa.mjs', 'lib/plans.ts', 'lib/pilote/**', 'le cerveau en écriture', 'le vault', 'commit', 'push',
  'build (next build, next dev)', 'secrets',
]

const BENJ = `## Ce que Benj a dit (03/11, vers 11 h 30-11 h 45)

- Le prompt : \`${P6}\` (696 lignes). Il remplace le prompt 5. « Tu suis ce prompt maintenant. Ça reprend exactement tout ce que j'avais
  demandé et que tu n'as toujours pas fait. »
- « Je te laisse travailler : je n'ai pas besoin d'intervenir, tu as tout en main ; suis bien les instructions et termine le travail entièrement. »
  Les cinq décisions ont pris leur défaut (\`${PLAN}\`, § 5) ; ce lot les applique.
- Les gestes que la sécurité lui réserve restent **préparés, jamais faits** : migration écrite et non appliquée ; drapeau baissé ; envoi à blanc ou
  en mode ombre ; workflow inactif, non publié ; aucun identifiant créé ; aucune dépense ; aucun compte ; aucun secret saisi.
- « Arrête avec cette landing page, notre site est très bien. »`

const ressourcesObligatoires = (extra) => `## Ressources obligatoires (règle de Benj du 02/11 au soir : toutes les ressources du système)

1. Avant de produire, fais l'inventaire de ta session (skills, plugins, MCP) et charge tous ceux qui servent ton domaine.
2. Toujours : le skill \`reseau-neuronal\`, puis MCP \`cerveau\` (\`regles_pour\` sur « agents, n8n, Gmail, données client, envoi automatique »,
   puis \`chercher\` et \`lire\`) ; le prompt 6 en entier (\`${P6}\`, partie 0 et prompt 1) ; ce plan (\`${PLAN}\`) ; \`CLAUDE.md\`,
   \`.claude/rules/*.md\`, \`.orchestre/contexte.md\` ; les vidéos déjà analysées : \`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md\`,
   \`fiches-videos.md\`, \`plans/analyse-videos.md\`, \`docs/connaissance-videos/\`.
3. Selon ton domaine :
${extra.map((l) => `   - ${l}`).join('\n')}
4. Ta preuve \`resume.md\` COMMENCE par « ## Ressources utilisées » : chaque skill, plugin, MCP et source chargé, et ce qu'il a changé dans ton
   travail (au moins quatre entrées). Sans cette section, la tâche est refusée.

Aucune donnée réelle ; identifiants et commentaires en français ; un juge qui fabrique ce qu'il vérifie ne prouve rien.`

const N8N_RES = [
  'n8n : MCP `n8n-oracle` (`get_workflow_sdk_reference`, `get_workflow_best_practices` pour chaque technique utile — triage, scheduling, human_in_the_loop, notification —, `search_nodes`, `validate_workflow`, `create_workflow_from_code`, `test_workflow` sur données épinglées) ; `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md` (« Ce qu\'il faut retenir », l.17-49) et `fiches-depots.md` (gabarits, l.666-681).',
  'Les gabarits déjà construits, à reprendre et non à refaire : `.orchestre/preuves/035-003/` (socle, nœud « Contrat », `construire.mjs`), `035-004`, `035-005` (porte de conformité), `035-007` (parent et chaînes `ent-exemple-*`, plus de démonstration : gabarits seulement), et leurs juges `scripts/lib-*-n8n-qa.mjs`.',
]
const DESIGN_RES = [
  'Design : skills `presti-design`, `frontend-design`, `ui-ux-pro-max:ui-ux-pro-max`, `ui-ux-pro-max:design-system`, `ui-ux-pro-max:ui-styling`, `ui-ux-pro-max:brand`, `emil-design-eng`, `apple-design`, `ecc:make-interfaces-feel-better`, puis `design:design-critique` et `design:accessibility-review` avant de rendre ; la propreté de l\'appli Claude, `plans/011-cadrage-01-11/c2-lot6/reference-claude-com.md` (pas les écrans des vidéos de @restructureai, p6:56).',
]
const SECU_RES = ['Sécurité : skills `ecc:security-review` et `presti-audit-attaque` (lecture seule, sur ton propre diff) ; `supabase-postgres-best-practices` pour tout SQL.']

const finDe = (id) => `## Fin

\`node scripts/orchestre.mjs verifier ${id}\` vert, la preuve écrite, tâche dans \`fait/\`. Si tu es bloqué : une question à options dans
\`.orchestre/en-cours/${id}.question.md\`, et tu t'arrêtes. Dernière ligne : \`TACHE ${id} FAITE\`.`

// ── Les douze lots, dans l'ordre de valeur du § 4 ─────────────────────────────────────────────────────────────────────────────
const LOTS = [
  {
    id: '036-001', titre: 'le Cerveau et le département Accueil et réponse (n8n, simulation)',
    objectif: 'Prompt 6, lot 1 (le plus rentable) : `presti-cerveau`, le parent multi-comptes qui trie, lit, parle et vérifie, et `presti-dep-accueil` avec ses spécialistes `lib-trier-demande` et `lib-lire-photo` (modèle épinglé), plus les six autres chefs `presti-dep-*` en squelette — INACTIFS, en simulation, contrats JSON versionnés et un juge hors ligne capable de rougir',
    perimetre: ['n8n-oracle:presti-cerveau', 'n8n-oracle:presti-dep-', 'n8n-oracle:lib-trier-demande', 'n8n-oracle:lib-lire-photo', 'n8n-oracle:presti-banc-cerveau', 'scripts/cerveau-accueil-n8n-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/contrats/cerveau.json', 'plans/011-cadrage-01-11/p6-signature/contrats/accueil.json', '.orchestre/preuves/036-001/**'],
    interdit: INTERDIT_N8N,
    verifier: (id) => `node scripts/cerveau-accueil-n8n-qa.mjs && ${JUGES_N8N} && ${specs(id)} && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 22, minutes: 180 },
    preuve: '.orchestre/preuves/036-001/resume.md (« ## Ressources utilisées » d\'abord ; puis chaque workflow, son id, son contrat, son essai sur données épinglées, la comparaison au code — copie figée de MOTS_ESCALADE_TOUJOURS et des listes du pilote —, la sortie du juge et ses mutants) et un export .workflow.json par workflow',
    role: 'Tu es ingénieur d\'automatisation n8n et architecte de systèmes multi-agents. Tu poses le sommet du système de chaque artisan (p6:69, A1) et son premier département, celui qui rapporte le plus : répondre en moins d\'une minute, à toute heure (A11).',
    afaire: [
      '**`presti-cerveau`** (gabarit `ent-exemple-parent`, `.orchestre/preuves/035-007/resume.md:68-73`) : toutes les minutes, lit **page par page** les événements non traités (la vue étroite que prépare 036-002 ; en simulation, données épinglées), la configuration de chaque compte (offre, types activés, interrupteurs, palier simulation / ombre / réel) et appelle le bon chef. Aucun calcul métier, aucun montant, aucun modèle dans le parent (p6:357-359). Interrupteur général lu avant tout appel ; battement par `lib-battement` (appel épinglé).',
      '**`presti-dep-accueil`** : reçoit une demande (page `/p`, e-mail déposé par 036-003, Telegram) et la fait avancer comme un **dossier** (A13) : `lib-trier-demande` (règles d\'abord, C10 : urgence, peut attendre, curieux, spam, client existant ; copie figée de `MOTS_ESCALADE_TOUJOURS` et `MOTS_ESCALADE_ENTIERS`, `lib/pilote/regles.ts:137` et `:174`, comparée au code par le juge), `lib-lire-photo` (modèle épinglé : la photo jointe est décrite, jamais chiffrée), `lib-qualifier-lead` (questions manquantes, une à la fois, B4), `lib-rediger-message`, `lib-decider`, `lib-porte-conformite`, `lib-executer`, `lib-journaliser` — tous appelés **épinglés** (leurs `callerIds` ne contiennent que leurs bancs, `.orchestre/preuves/035-007/resume.md:173-186` : ne les modifie pas). Studio : carte (et demande de brouillon pour 036-003). Signature : file du pilote `reponse_prospect` seulement si mode « auto » et type activé (`lib/plateformeConfig.ts:202-203`, `lib/pilote/regles.ts:257-276`).',
      '**Les six autres chefs** (`presti-dep-devis`, `-suivi`, `-facturation`, `-apres`, `-operations`, `-direction`) en squelette : déclencheur Execute Workflow, nœud « Contrat », un seul « Return » qui rend `non_branche` ; les lots 036-004 à 036-008 les remplissent.',
      '**Contrats** : `plans/011-cadrage-01-11/p6-signature/contrats/cerveau.json` et `accueil.json` (JSON Schema, champs obligatoires, énumérations ; hors contrat = rejet, journal, rien ne part).',
      'Banc `presti-banc-cerveau` (inactif, jamais publié) ; cas fictifs : 40 demandes (« Exemple. » devant tout nom), dont soir, week-end, escalade, doublon, spam, deux comptes.',
      '**Le juge `scripts/cerveau-accueil-n8n-qa.mjs`**, hors ligne, rejoue exports et essais ; mutants obligatoires : Studio qui envoie ; Signature avec un type non activé qui part ; un geste de `OUTILS_JAMAIS_AUTO` qui part ; le même événement rejoué deux fois qui donne deux cartes ; une requête sans filtre `artisan_id` ; un mot d\'escalade ignoré ; un montant calculé dans n8n ; le parent qui appelle un modèle ; un workflow actif.',
    ],
    extra: N8N_RES,
  },
  {
    id: '036-002', titre: 'le schéma du système d\'un artisan (migration écrite, non appliquée)',
    objectif: 'Prompt 6, lot 2 : la migration `0193_systeme_agents` (connexions chiffrées, palier et interrupteur par département, compétences, coût IA par jour, marque « traité » et vue étroite des événements à traiter pour n8n) et son jumeau `_A_COLLER_`, NON APPLIQUÉS, avec les drapeaux `systemeAgents` et `connexions` baissés et un juge capable de rougir',
    perimetre: ['supabase/migrations/0193_systeme_agents.sql', 'supabase/migrations/_A_COLLER_sql_editor_0193_systeme_agents_NU.sql', 'lib/flags.ts', 'scripts/systeme-agents-schema-qa.mjs', '.orchestre/preuves/036-002/**'],
    interdit: [...INTERDIT_CODE, 'toute autre migration (0183 à 0192 : lecture seule)', 'app/**', 'lib/** sauf lib/flags.ts'],
    verifier: (id) => `node scripts/systeme-agents-schema-qa.mjs && node scripts/migrations-jumelles-e2e.mjs && npx tsc --noEmit && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 8, minutes: 150 },
    preuve: '.orchestre/preuves/036-002/resume.md (« ## Ressources utilisées » d\'abord ; chaque table, sa RLS, ses droits par colonne, ce que n8n lit et écrit, l\'ordre de pose 0185 → 0192 → 0193, l\'essai à sec s\'il a pu se faire, la sortie du juge et ses mutants)',
    role: 'Tu es l\'architecte des données de Presti (schéma, sécurité : c\'est un « jugement », Claude Code l\'écrit lui-même). Tu poses les tables sans lesquelles le système ne peut passer en mode ombre.',
    afaire: [
      'Relis d\'abord `0185_automatisation.sql` (`evenements_metier` l.125, clé unique l.135, `autonomie_reglages` l.186) et `0189_role_lecture_n8n.sql` : **0193 s\'appuie sur 0185, ne la recopie pas**. Ordre de pose écrit en tête : 0185, 0192, puis 0193 ; « ÉTAT : NON APPLIQUÉE ».',
      '**`connexions`** : une ligne par compte branché (`imap`, `gmail`, `outlook`, `google_agenda`, `outlook_agenda`, `google_drive`, `onedrive`, `fiche_google`, `whatsapp`, `telegram`, `stripe_artisan`), portées, état (`a_verifier`, `active`, `expiree`, `retiree`, `erreur`), `verifiee_le`, `derniere_synchro`, `expire_le`, deux secrets chiffrés au format `v1.` de `lib/secretBox.ts:21-30` (`secret_app`, `secret_n8n` : décision 1 du plan). RLS : l\'artisan lit ses lignes **sans les colonnes de secret** (droits par colonne) ; rien n\'est inscriptible par `authenticated`.',
      '**`departements_reglages`** : par compte et par département (les sept du plan, plus `tous` pour l\'interrupteur général) : palier (`arret`, `simulation`, `ombre`, `reel`), interrupteur, plafond du jour. Défaut : `simulation`, coupé.',
      '**`competences`** (A4, B2) : par compte et par département, titre, corps borné, version, actif. **`couts_ia_jour`** (D3) : par compte, jour et modèle : appels, jetons, coût en centimes calculé par le code, `externe` (vrai si le modèle n\'est pas sur Oracle : le compteur de A14).',
      '`evenements_metier.traite_le` et la vue `n8n_evenements_a_traiter` (`security_barrier`, colonnes permises seulement, sur le modèle de `0192_accuse_reception_n8n.sql:99`), lisible par n8n.',
      'Le jumeau par `scripts/sql-nu.mjs` ; `scripts/migrations-jumelles-e2e.mjs` reste vert.',
      '`lib/flags.ts` : `systemeAgents: false` et `connexions: false`, commentés (« on colle 0193, PUIS on lève »). Rien d\'autre.',
      '**Le juge `scripts/systeme-agents-schema-qa.mjs`** : lecture du texte SQL (et PGlite si le paquet est présent, sinon code 2 annoncé) ; mutants : une colonne de secret lisible par `authenticated`, une RLS absente, une vue sans `security_barrier`, un défaut de palier `reel`, un drapeau levé.',
    ],
    extra: [...SECU_RES, 'Méthode : `.claude/rules/migration-production.md` (on colle PUIS on lève), `plans/011-cadrage-01-11/chantier-4-assistant-plan.md` § 8 (modèle de données).'],
  },
  {
    id: '036-003', titre: 'la boîte mail de l\'artisan dans la plateforme (n8n, simulation)',
    objectif: 'Prompt 6, lot 3 : `presti-boite` toutes les 5 minutes, `lib-boite-lire` (IMAP), `lib-boite-brouillon` (brouillon de Studio écrit par APPEND dans le dossier Brouillons de l\'artisan) et `lib-boite-envoyer` (SMTP, Signature, désactivé), chaque message déposé une fois dans la bonne conversation — INACTIFS, en simulation, avec les pas 1 à 3 de la migration de la relève quotidienne',
    perimetre: ['n8n-oracle:presti-boite', 'n8n-oracle:lib-boite-', 'n8n-oracle:presti-banc-boite', 'scripts/boite-n8n-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/contrats/boite.json', 'plans/011-cadrage-01-11/p6-signature/connecteurs/imap.md', '.orchestre/preuves/036-003/**'],
    interdit: [...INTERDIT_N8N, 'n8n-oracle:presti-cerveau', 'n8n-oracle:presti-dep-* (lecture seule)'],
    verifier: (id) => `node scripts/boite-n8n-qa.mjs && ${JUGES_N8N} && ${specs(id)} && ${ressources(id)}`,
    budget: { fichiers: 18, minutes: 180 },
    preuve: '.orchestre/preuves/036-003/resume.md (« ## Ressources utilisées » d\'abord ; chaque workflow, son id, son contrat, ses essais, la comparaison à `releverCanal` cas par cas, la fiche connecteur IMAP, le geste d\'exploitation préparé pour Benj, la sortie du juge et ses mutants) et un export .workflow.json par workflow',
    role: 'Tu es ingénieur d\'automatisation n8n. Aujourd\'hui la boîte de l\'artisan n\'est relevée qu\'une fois par jour (cron Vercel de 7 h, `app/api/canaux/relever/route.ts:9-25`) : un e-mail reçu à 7 h 05 attend le lendemain. Tu fermes ce trou, sans OAuth (décision 2 du plan : l\'IMAP/SMTP existant d\'abord).',
    afaire: [
      'Lis `lib/releveCanal.ts` (Message-ID gardé, jamais deux fois, l.21 ; `releverCanal` l.68), `lib/canaux.ts` (hôtes l.5-12, `testerImap` l.86), `lib/secretBox.ts` (format des secrets) : **tu refais leur comportement dans n8n, tu ne le modifies pas**.',
      '**`lib-boite-lire`** : nœud Code avec `imapflow` (module à autoriser dans le conteneur n8n : geste d\'exploitation de Benj, préparé par écrit dans la preuve, jamais fait) ; secret déchiffré en mémoire (décision 1), jamais journalisé ; lot borné, pagination ; en simulation, boîte épinglée.',
      '**Dépôt dans la plateforme d\'abord** (p6:279-285) : chaque message entre **une seule fois**, dans **la conversation du client** quel que soit le canal, avec son canal d\'origine ; un message reçu par deux canaux ne crée pas deux conversations. Écriture prévue seulement (`effets_prevus`), jamais faite.',
      '**`lib-boite-brouillon`** (Studio) : la réponse préparée devient un brouillon dans le dossier Brouillons de l\'artisan (IMAP `APPEND`, drapeau `\\Draft`), **jamais envoyé** ; **`lib-boite-envoyer`** (Signature, après le délai du pilote) : SMTP, nœud désactivé, au nom de l\'artisan, son adresse en réponse (`lib/email.ts:6-11`).',
      '**Autorisation expirée ou refusée** : le département se tait, l\'état « erreur » est prévu pour « Connexions », une alerte part par `lib-alerter` (épinglé), rien ne plante.',
      'Pas 1 à 3 de `.claude/rules/migration-production.md` pour la relève : workflow créé, testé à blanc, **comparé** à `releverCanal` sur les mêmes cas (tableau d\'écarts) ; les pas 4 et 5 restent à Benj.',
      'Fiche connecteur `plans/011-cadrage-01-11/p6-signature/connecteurs/imap.md` (format p6 § 0.4 : portées, lecture, écriture, autorisation, retrait, expiration, quotas, coût, test).',
      '**Le juge `scripts/boite-n8n-qa.mjs`** ; mutants : un message importé deux fois ; deux conversations pour le même client ; un brouillon envoyé en Studio ; un secret dans un journal ; un jeton expiré qui fait planter ; « Presti » dans un e-mail au nom de l\'artisan ; une boîte d\'un autre compte lue.',
    ],
    extra: [...N8N_RES, ...SECU_RES],
  },
  {
    id: '036-004', titre: 'le département Suivi et relances (n8n, simulation)',
    objectif: 'Prompt 6, lot 4 : `presti-dep-suivi` (relances de conversation et de devis, carte de lot du lundi, note d\'intérêt calculée par le code), `lib-controler-conflit` (déjà en cours, déjà relancé, client sensible), et le registre commun qui compte aussi les envois de n8n — INACTIFS, en simulation, avec les pas 1 à 3 de la migration du cron des relances',
    perimetre: ['n8n-oracle:presti-dep-suivi', 'n8n-oracle:lib-controler-conflit', 'n8n-oracle:presti-banc-suivi', 'scripts/suivi-n8n-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/contrats/suivi.json', '.orchestre/preuves/036-004/**'],
    interdit: [...INTERDIT_N8N, 'n8n-oracle:presti-relances (lecture seule : on s\'en sert de gabarit)', 'scripts/relances-n8n-qa.mjs'],
    verifier: (id) => `node scripts/suivi-n8n-qa.mjs && ${TS} scripts/relances-n8n-qa.mjs && ${JUGES_N8N} && ${specs(id)} && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 16, minutes: 180 },
    preuve: '.orchestre/preuves/036-004/resume.md (« ## Ressources utilisées » d\'abord ; le chef, le contrôleur de conflit, leurs contrats et essais, la comparaison au cron cas par cas, la sortie du juge et ses mutants) et un export .workflow.json par workflow',
    role: 'Tu es ingénieur d\'automatisation n8n. Tu fais relancer les devis et les conversations à date (A12) sans jamais déranger deux fois le même client (A20) : c\'est de l\'argent récupéré.',
    afaire: [
      'Pars de `presti-relances` (`.orchestre/preuves/032-044/resume.md:29`, sans le modifier) et de `lib-relancer` (registre de 3 jours copié, `lib/relancesRegistre.ts:18`). Cadences : J+2, J+5, J+10 (`lib/relances.ts:38`) ; impayés laissés à 036-005.',
      '**Le trou à fermer** : un envoi de relance par n8n n\'est pas lu par le registre commun (`.orchestre/preuves/035-005/resume.md:369`). Le chef écrit chaque relance prévue là où `lib/relancesRegistre.ts:38` la lira (table et colonnes à écrire dans la preuve ; si une colonne manque, une question à options, pas de migration).',
      '**`lib-controler-conflit`** (A20) : avant tout geste : dossier déjà en cours ? relance déjà partie en 3 jours ? client sensible (escalade, `lib/pilote/regles.ts:205`) ? proposition écartée récemment (B11, `lib/assistant/confirmation.ts:131`) ? Sinon rien.',
      '**Carte de lot du lundi** (A19, C9) : retenus et exclus avec leur motif, au format de `lib/assistant/cartes.ts:366`. Studio : tout en carte. Signature : `relance_devis` et relances de conversation par le pilote, si activées (`relances.auto`, `lib/plans.ts:90`).',
      'Pas 1 à 3 de la migration de `app/api/cron/relances/route.ts` : créé, à blanc, **comparé** décision par décision (tableau d\'écarts) ; la pause générale illisible par n8n (`.orchestre/preuves/032-044/resume.md:64`) est un écart bloquant à traiter ou à poser en question.',
      '**Le juge `scripts/suivi-n8n-qa.mjs`** ; mutants : deux relances en 3 jours par deux chemins ; un conflit ignoré ; une relance après signature ; Studio qui envoie ; une proposition écartée qui revient ; une requête sans filtre `artisan_id`.',
    ],
    extra: N8N_RES,
  },
  {
    id: '036-005', titre: 'les départements Devis et Facturation-encaissement (n8n, simulation)',
    objectif: 'Prompt 6, lot 5 : `presti-dep-devis` (carte « devis prêt » dont chaque prix porte sa source, sinon « estimé ») et `presti-dep-facturation` (« facture quand le chantier est fini » + « Ask you », relance d\'impayé jusqu\'au paiement ou au motif rangé d\'un geste) — INACTIFS, en simulation ; aucun montant calculé hors du code de l\'app',
    perimetre: ['n8n-oracle:presti-dep-devis', 'n8n-oracle:presti-dep-facturation', 'n8n-oracle:presti-banc-argent', 'scripts/devis-facture-n8n-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/contrats/devis.json', 'plans/011-cadrage-01-11/p6-signature/contrats/facturation.json', '.orchestre/preuves/036-005/**'],
    interdit: INTERDIT_N8N,
    verifier: (id) => `node scripts/devis-facture-n8n-qa.mjs && ${JUGES_N8N} && ${specs(id)} && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 16, minutes: 180 },
    preuve: '.orchestre/preuves/036-005/resume.md (« ## Ressources utilisées » d\'abord ; les deux chefs, contrats, essais, la règle « le code calcule, n8n route », la sortie du juge et ses mutants) et un export .workflow.json par workflow',
    role: 'Tu touches à l\'argent : tu es Claude Code et tu l\'écris toi-même. Le modèle ne calcule jamais un montant ; n8n ne fait que router et préparer des cartes.',
    afaire: [
      '**Devis** (A13, B9) : une demande qualifiée devient une carte « préparer le devis » ; le chiffrage reste le code de l\'app (`lib/devisAuto.ts:25`), lancé au clic de l\'artisan ; un prix pratiqué sur un ancien chantier est un **repère cité**, jamais une source (`lib/pilote/regles.ts:116-124`). Signature : `envoi_devis` seulement si **toutes** les lignes sont sourcées (`lib/pilote/regles.ts:272`).',
      '**Facturation** (A14) : un chantier terminé donne une carte « facture prête » (aperçu par `simulerFacture`, `lib/factureDepuisDevis.ts:64`, côté app) ; **l\'émission reste un clic** (`creer_facture` est dans `OUTILS_JAMAIS_AUTO`, `lib/pilote/regles.ts:79-82`) ; Signature : seulement `envoi_facture` d\'une facture **déjà émise**.',
      '**Impayés** (B7) : J+3, J+10, J+21 (`lib/relancesImpayes.ts:38`), opt-in ; la relance s\'arrête sur un paiement **ou sur un motif** rangé d\'un geste (contestation, échéancier, litige → escalade), jamais sur le silence. Si le motif n\'a pas de colonne, une question à options.',
      'Lecteur de paiements (Stripe de l\'artisan) : fiche seulement (`plans/011-cadrage-01-11/p6-signature/contrats/facturation.json`, section « à venir ») ; aucun nœud.',
      '**Le juge `scripts/devis-facture-n8n-qa.mjs`** ; mutants : un prix sans source qui part ; une facture émise par n8n ; un montant calculé dans un nœud Code de n8n ou par le modèle ; une relance d\'impayé après paiement ; un motif ignoré ; un paiement marqué sans l\'artisan.',
    ],
    extra: [...N8N_RES, ...SECU_RES],
  },
  {
    id: '036-006', titre: 'le département Après-chantier et réputation (n8n, simulation)',
    objectif: 'Prompt 6, lot 6 : `presti-dep-apres` (demande d\'avis par un canal consenti, rappel d\'entretien proposé dans « À valider »), `lib-avis-lire` et `lib-avis-repondre` (épinglés : l\'API des avis n\'est pas encore accordée), avis négatif toujours à l\'artisan — INACTIFS, en simulation, avec la demande d\'accès à l\'API Business Profile rédigée et non envoyée',
    perimetre: ['n8n-oracle:presti-dep-apres', 'n8n-oracle:lib-avis-', 'n8n-oracle:presti-banc-apres', 'scripts/apres-reputation-n8n-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/contrats/apres.json', 'plans/011-cadrage-01-11/p6-signature/connecteurs/fiche-google.md', '.orchestre/preuves/036-006/**'],
    interdit: [...INTERDIT_N8N, 'n8n-oracle:presti-apres-chantier (lecture seule)', 'scripts/apres-chantier-n8n-qa.mjs', 'toute demande envoyée à Google'],
    verifier: (id) => `node scripts/apres-reputation-n8n-qa.mjs && ${TS} scripts/apres-chantier-n8n-qa.mjs && ${JUGES_N8N} && ${specs(id)} && ${ressources(id)}`,
    budget: { fichiers: 16, minutes: 170 },
    preuve: '.orchestre/preuves/036-006/resume.md (« ## Ressources utilisées » d\'abord ; le chef, les deux spécialistes, leurs contrats et essais, la fiche connecteur, la demande d\'accès rédigée, la sortie du juge et ses mutants) et un export .workflow.json par workflow',
    role: 'Tu es ingénieur d\'automatisation n8n. Tu reprends le bloc « Review Response » de la vidéo du 02/11 (`fiches-videos-restructureai.md:368` : lecteur, rédacteur, « Approval Desk » avant « Reply Poster »), à la mode de Presti : rien de négatif ne part sans l\'artisan (A18).',
    afaire: [
      'Pars de `presti-apres-chantier` (sans le modifier) et de `lib/apresChantier.ts` (avis à J+2 l.23, lien d\'avis fermé l.33, désactivé par défaut l.38).',
      '**Demande d\'avis** : seulement par un canal consenti (e-mail du client, lien `sms:` préparé, `lib/sms/lien.ts:10`, décision 4) ; carte de lot avec les exclus (opposés, STOP, litige en cours) ; Studio et Signature : carte (l\'outil `demander_avis` n\'est pas exécutable par le pilote, `lib/pilote/regles.ts:70`).',
      '**Avis** (décision 3) : `lib-avis-lire` et `lib-avis-repondre` sur le nœud Google Business Profile (`review` : `getAll`, `reply`), **épinglés**, sans identifiant ; en attendant l\'accès, l\'entrée est un avis collé par l\'artisan. Avis négatif (note ≤ 3 ou mots de litige) : **toujours** une carte ; avis positif : carte aussi tant que Benj n\'a pas accepté le type.',
      'Rappel d\'entretien (B8) : date proposée dans « À valider », jamais envoyée seule.',
      'Rédige `plans/011-cadrage-01-11/p6-signature/connecteurs/fiche-google.md` (format p6 § 0.4) et, dans la preuve, la demande « Application for Basic API Access » prête à envoyer **par Benj** (projet, usage, volumes) : tu ne l\'envoies pas.',
      '**Le juge `scripts/apres-reputation-n8n-qa.mjs`** ; mutants : un avis négatif publié ; une demande d\'avis sans consentement ; un STOP ignoré ; un faux avis non signalé ; « Presti » dans la réponse ; un avis d\'un autre compte.',
    ],
    extra: N8N_RES,
  },
  {
    id: '036-007', titre: 'le département Direction : page du matin, rapport du lundi, alertes, coût IA (n8n, simulation)',
    objectif: 'Prompt 6, lot 7 : `presti-dep-direction` — la page du matin réelle (l\'argent d\'abord, se termine par des cartes), le rapport du lundi, l\'agent Alerte à liste fermée, le compteur de coût IA par compte et le diagnostic « où perdez-vous de l\'argent ? » — et les compétences par département en brouillon, INACTIFS, en simulation',
    perimetre: ['n8n-oracle:presti-dep-direction', 'n8n-oracle:lib-alerte-liste', 'n8n-oracle:lib-cout-ia', 'n8n-oracle:presti-banc-direction', 'scripts/direction-n8n-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/contrats/direction.json', 'plans/011-cadrage-01-11/p6-signature/competences/**', '.orchestre/preuves/036-007/**'],
    interdit: [...INTERDIT_N8N, 'n8n-oracle:presti-briefing-matin (lecture seule)', 'scripts/briefing-n8n-qa.mjs'],
    verifier: (id) => `node scripts/direction-n8n-qa.mjs && ${TS} scripts/briefing-n8n-qa.mjs && ${JUGES_N8N} && ${specs(id)} && ${ressources(id)}`,
    budget: { fichiers: 22, minutes: 180 },
    preuve: '.orchestre/preuves/036-007/resume.md (« ## Ressources utilisées » d\'abord ; le chef, ses spécialistes, la liste fermée des alertes avec leur responsable, les compétences écrites, la sortie du juge et ses mutants) et un export .workflow.json par workflow',
    role: 'Tu es ingénieur d\'automatisation n8n et rédacteur des « cerveaux » (les compétences sont des consignes d\'agents : Claude Code les écrit). On mesure l\'argent, pas l\'activité (A9).',
    afaire: [
      '**Page du matin** (A7) : `presti-briefing-matin` (sans le modifier) devient le spécialiste du chef ; la page met l\'argent d\'abord (impayés, devis à signer, demandes sans réponse), trois priorités (`lib/assistant/briefing.ts:134`), et **se termine par des cartes**, jamais par une action. Le code compte, le modèle ne compte rien.',
      '**Rapport du lundi** : `lib-rapport-hebdo` (épinglé) ; chaque chiffre avec sa source et sa date ; une relance n\'est créditée que si elle précède la signature (A10) ; aucun « gain ».',
      '**Alerte** (A8) : `lib-alerte-liste`, **liste fermée** (demande de prix ferme, client mécontent, litige, message urgent tard le soir, workflow en panne, coût qui dérive, impayé au-dessus du seuil), chacune avec son responsable ; rien d\'autre ne réveille l\'artisan ; envoi prévu par push (`lib/push.ts:105`), jamais fait.',
      '**Coût IA** (D3, A14) : `lib-cout-ia` additionne par compte et par jour ce que journalise `lib-journaliser` (table `couts_ia_jour` de 036-002, prévue) ; plafond du jour ; la part envoyée à un modèle externe est comptée à part.',
      '**Diagnostic** (A16) : « où perdez-vous de l\'argent ? » (demandes sans réponse ou devis non signés), calculé sur les données ; sans données : « pas encore de données », jamais estimé.',
      '**Compétences** (A4, B2) : `plans/011-cadrage-01-11/p6-signature/competences/<departement>.md`, une par département, pas à pas, au ton de l\'artisan, avec les garde-fous anti-fabrication de `lib/ai.ts` ; elles servent de consigne et de spécification.',
      '**Le juge `scripts/direction-n8n-qa.mjs`** ; mutants : un chiffre sans source ; un chiffre de gain ; une alerte hors liste ; une page qui finit par une action ; un coût calculé par le modèle ; un diagnostic estimé sans données.',
    ],
    extra: [...N8N_RES, 'IA : skill `presti-ai-lab` et `lib/ai/README.md` pour les compétences (cerveaux).'],
  },
  {
    id: '036-008', titre: 'le département Opérations : agenda, rappels, stock (n8n, simulation)',
    objectif: 'Prompt 6, lot 8 : `presti-dep-operations` — créneaux libres LUS dans l\'agenda (jamais inventés), rappel de la veille, gardien du stock (seuil bas → commande fournisseur préparée), import contrôlé d\'un export — avec `lib-agenda-creneaux` et `lib-synchroniser-outil` épinglés, INACTIFS, en simulation ; aucun rendez-vous posé seul (décision 5)',
    perimetre: ['n8n-oracle:presti-dep-operations', 'n8n-oracle:lib-agenda-', 'n8n-oracle:lib-synchroniser-outil', 'n8n-oracle:presti-banc-operations', 'scripts/operations-n8n-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/contrats/operations.json', 'plans/011-cadrage-01-11/p6-signature/connecteurs/agenda.md', '.orchestre/preuves/036-008/**'],
    interdit: INTERDIT_N8N,
    verifier: (id) => `node scripts/operations-n8n-qa.mjs && ${JUGES_N8N} && ${specs(id)} && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 16, minutes: 170 },
    preuve: '.orchestre/preuves/036-008/resume.md (« ## Ressources utilisées » d\'abord ; le chef, les spécialistes, leurs contrats et essais, la fiche connecteur agenda, la sortie du juge et ses mutants) et un export .workflow.json par workflow',
    role: 'Tu es ingénieur d\'automatisation n8n. Anti-fabrication : un créneau vient de l\'agenda réel, ou il n\'existe pas.',
    afaire: [
      '**`lib-agenda-creneaux`** : disponibilités lues (nœud Google Calendar `calendar.availability`, ou HTTP Request avec jeton déchiffré : décision 1), **épinglé**, sans identifiant ; rend au plus trois créneaux libres dans les horaires de l\'artisan ; agenda illisible = aucun créneau, et la carte le dit.',
      '**Rendez-vous** (décision 5) : proposé au client, posé **après un clic** de l\'artisan, Studio comme Signature ; le type n\'entre pas dans `OUTIL_TYPE` (`lib/pilote/regles.ts:53-63`). Rappel de la veille : carte, horaires d\'envoi (`lib/sms/plage.ts:7-8`).',
      '**Stock** : seuil bas (inventaire, `lib/inventaire/`) → commande fournisseur **préparée** en carte (argent : jamais seule).',
      '**Import contrôlé** (B10, C3) : `lib-synchroniser-outil` (gabarit `fiches-depots.md:680`) lit un export épinglé, rend un aperçu ; chaque donnée porte « lu dans <outil> le <date> » ou « déclaré » ; l\'écriture passe par le circuit de « Mes chiffres » (lecture, aperçu validé, puis écriture), jamais directement.',
      'Fiche `plans/011-cadrage-01-11/p6-signature/connecteurs/agenda.md` (Google Agenda et Outlook, portées minimales, vérification Google sans évaluation de sécurité à confirmer).',
      '**Le juge `scripts/operations-n8n-qa.mjs`** ; mutants : un créneau absent de l\'agenda proposé ; un rendez-vous posé seul en Signature ; une commande envoyée seule ; un import écrit sans aperçu ; une donnée sans provenance ; l\'agenda d\'un autre compte.',
    ],
    extra: N8N_RES,
  },
  {
    id: '036-009', titre: 'les connecteurs : fiches, « Connecter » en OAuth derrière un drapeau baissé, demande de vérification Google rédigée',
    objectif: 'Prompt 6, lot 9 : les fiches connecteurs du § 0.4 (Gmail, Outlook, agendas, Drive, Sheets, fiche Google, WhatsApp, Telegram, SMS, Stripe de l\'artisan), le code « Connecter / Retirer » (OAuth avec état et PKCE, jeton chiffré au format secretBox pour l\'app et pour n8n) derrière le drapeau `connexions` BAISSÉ, et la demande de vérification Google rédigée, non envoyée',
    perimetre: ['lib/connexions/**', 'app/api/connexions/**', 'scripts/connexions-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/connecteurs/gmail.md', 'plans/011-cadrage-01-11/p6-signature/connecteurs/outlook.md', 'plans/011-cadrage-01-11/p6-signature/connecteurs/drive-sheets.md', 'plans/011-cadrage-01-11/p6-signature/connecteurs/messageries.md', 'plans/011-cadrage-01-11/p6-signature/connecteurs/stripe-artisan.md', 'plans/011-cadrage-01-11/p6-signature/connecteurs/verification-google.md', '.orchestre/preuves/036-009/**'],
    interdit: [...INTERDIT_CODE, 'lib/flags.ts', 'lib/secretBox.ts (lecture seule)', 'supabase/**', 'toute application OAuth créée', 'toute demande envoyée à Google ou Meta'],
    verifier: (id) => `node scripts/connexions-qa.mjs && npx tsc --noEmit && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 18, minutes: 180 },
    preuve: '.orchestre/preuves/036-009/resume.md (« ## Ressources utilisées » d\'abord ; chaque fiche, les routes et leur garde, le chiffrement, ce qui se passe à l\'expiration et au retrait, la demande de vérification prête pour Benj, la revue de sécurité, la sortie du juge et ses mutants)',
    role: 'Tu touches à la sécurité et aux comptes : tu l\'écris toi-même. Le client branche ses outils lui-même ; aucun agent ne saisit un mot de passe, une clé ou un code OAuth (`.claude/rules/securite.md`).',
    afaire: [
      '**Fiches connecteurs** (p6 § 0.4) dans `plans/011-cadrage-01-11/p6-signature/connecteurs/` : portées demandées (le minimum), ce qu\'on lit, ce qu\'on écrit, où vit l\'autorisation (décision 1 : `connexions`, chiffrée, jamais dans n8n en clair), comment le client la retire, ce qui se passe à l\'expiration (le système se tait, « Connexions » le dit, une alerte part, rien ne plante), quotas, coût daté, test hors ligne.',
      '**`lib/connexions/`** : chiffrement pour l\'app et pour n8n (deux clés, format `v1.` de `lib/secretBox.ts:21-30`, sans modifier ce fichier), état d\'une connexion, retrait (jeton effacé, ligne `retiree`).',
      '**`app/api/connexions/`** : `google/demarrer`, `google/retour`, `retirer` ; **404 tant que le drapeau `connexions` est baissé** (créé par 036-002 ; s\'il manque, lis-le comme baissé) ; paramètre `state` lié à la session, PKCE, portées minimales, aucun secret renvoyé au navigateur, `peut()` pour toute question d\'offre (jamais `plan === …`).',
      '**Vérification Google** (décision 2) : `verification-google.md` — portées et leur justification, écran de consentement, domaines, vidéo de démonstration à tourner, coût de l\'évaluation de sécurité tel que relevé le 03/11 dans le plan (§ 5, décision 2) avec ses sources ; **prête à envoyer par Benj, jamais envoyée**.',
      '**Le juge `scripts/connexions-qa.mjs`** (hors ligne, faux fournisseur) ; mutants : drapeau baissé qui répond 200 ; `state` non vérifié ; jeton renvoyé au client ; secret stocké en clair ; retrait qui garde le jeton ; jeton expiré qui fait planter ; portée élargie.',
    ],
    extra: SECU_RES,
  },
  {
    id: '036-010', titre: 'les maquettes de l\'interface du § 1.3 (avant tout code)',
    objectif: 'Prompt 6, lot 10 : les maquettes statiques des quatre écrans du § 1.3 — centre de commande (barre du jour, page du matin, « À valider » à feu vert par ligne et pour tout le lot, exceptions préparées), « Ce que vos assistants ont fait » (colonnes, « fait : … », coût IA), « Connexions », « Mes départements » (Studio verrouillé par l\'offre) — en 390 et 1440 px, critiquées avant d\'être rendues',
    perimetre: ['plans/011-cadrage-01-11/p6-signature/maquettes/**', 'scripts/maquettes-p6-qa.mjs', '.orchestre/preuves/036-010/**'],
    interdit: ['app/**', 'lib/**', 'supabase/**', 'tout workflow n8n', 'les écrans de 032-041 et 032-046 comme modèle (refusés par Benj)', 'build (next build, next dev)', 'commit', 'push', 'le cerveau en écriture', 'le vault', 'secrets'],
    verifier: (id) => `node scripts/maquettes-p6-qa.mjs && ${ressources(id)}`,
    budget: { fichiers: 20, minutes: 180 },
    preuve: '.orchestre/preuves/036-010/resume.md (« ## Ressources utilisées » d\'abord ; les quatre écrans, leurs captures 390 et 1440 px, la critique de design et ce qu\'elle a changé, la sortie du juge et ses mutants)',
    role: 'Tu es designer produit au niveau de l\'appli Claude. Benj a refusé la première interface (« immonde et médiocre, et respecte absolument pas les directives des prompts », `.orchestre/refuse/032-046.md:22-23`) : **maquettes d\'abord, code ensuite**.',
    afaire: [
      'Lis le § 1.3 du prompt 6 (p6:343-353) et la référence de propreté `plans/011-cadrage-01-11/c2-lot6/reference-claude-com.md` ; **pas** les écrans des vidéos (ce sont des maquettes d\'auteurs, p6:56).',
      'Quatre maquettes HTML statiques (données fictives « Exemple. »), dans `plans/011-cadrage-01-11/p6-signature/maquettes/` : **centre de commande** (barre du jour : « à valider » + trois priorités, B12 ; page du matin, A7 ; « À valider » ligne par ligne et « tout valider », A5, A19 ; exceptions préparées, A6) ; **« Ce que vos assistants ont fait »** (repéré, préparé, à valider, parti, B5 ; « fait : … » sous chaque action, B4 ; coût IA du jour, D3 ; « annuler » pendant le délai) ; **« Connexions »** (état, dernière synchronisation, vérifié le, retirer) ; **« Mes départements »** (par type : « à valider » ou « part seul », plafond, interrupteur ; en Studio tout en « à valider » avec le verrou d\'offre).',
      'Une question à la fois (B4) quand l\'assistant attend une info ; le double chemin (B3) : chaque action d\'agent a son bouton manuel au même endroit.',
      'Captures 390 et 1440 px (navigateur sans écran) ; mouvement réduit respecté ; contraste WCAG ; aucun « Presti » sur une surface que voit le client de l\'artisan.',
      '**Critique de design** (`design:design-critique`) puis corrections, avant de rendre ; écris ce qui a changé.',
      '**Le juge `scripts/maquettes-p6-qa.mjs`** ; mutants : un écran manquant ; « Part seul » actif en Studio ; un « Envoyé » sans journal ; un mot interdit (« garanti », « 100 % ») ; une capture manquante ; une animation sans repli en mouvement réduit.',
    ],
    extra: DESIGN_RES,
  },
  {
    id: '036-011', titre: 'l\'interface du § 1.3 en code, drapeau `systemeAgents` baissé',
    objectif: 'Prompt 6, lot 11 : les quatre écrans des maquettes validées par 036-010, en code, derrière le drapeau `systemeAgents` BAISSÉ (rien dans le DOM, routes en 404), lus depuis Supabase en lecture seule, avec le double chemin et « une question à la fois » ; verrou d\'offre par peut() seulement',
    perimetre: ['app/systeme/**', 'app/api/systeme/**', 'scripts/interface-p6-qa.mjs', '.orchestre/preuves/036-011/**'],
    interdit: [...INTERDIT_CODE, 'lib/flags.ts', 'app/dashboard/** (l\'accueil actuel ne change pas tant que le drapeau est baissé)', 'app/console/** (travail non validé de 032-046)', 'supabase/**'],
    verifier: (id) => `node scripts/interface-p6-qa.mjs && npx tsc --noEmit && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 24, minutes: 180 },
    preuve: '.orchestre/preuves/036-011/resume.md (« ## Ressources utilisées » d\'abord ; chaque écran et sa maquette, les routes et leur garde, l\'écart aux maquettes, la revue d\'accessibilité et de marque, la sortie du juge et ses mutants)',
    role: 'Tu es ingénieur d\'interface et designer : le code de Presti ne fait que l\'interface (p6:343). Tu suis les maquettes de 036-010, pas autre chose.',
    afaire: [
      'Ne commence que si `.orchestre/fait/036-010.md` existe ; sinon une question à options et tu t\'arrêtes.',
      'Pages sous `app/systeme/` (centre de commande, « ce qui a été fait », « connexions », « départements ») et lectures sous `app/api/systeme/` : **404 et rien dans le DOM tant que `systemeAgents` est baissé** (drapeau créé par 036-002 ; absent = baissé) ; lectures seulement (cartes `assistant_actions`, `actions_auto`, journal, `connexions` sans secret, `departements_reglages`).',
      'Toute action passe par les routes existantes (confirmer, écarter, annuler une carte : `lib/assistant/confirmation.ts:95`, `:126`, `:138` ; annuler un envoi du pilote : `lib/pilote/serveur.ts:162`) : **aucune logique d\'automatisation** dans l\'app (n8n-first).',
      'Verrou d\'offre : `peut(plan, capacite)` (`lib/plans.ts:149`), jamais `plan === \'studio\'`. Studio : « part seul » visible mais verrouillé.',
      'Double chemin (B3) et une question à la fois (B4). Mobile d\'abord ; captures 390 et 1440 px en mode production sur un dossier isolé (`PRESTI_DIST=.next-prod`, port dédié) **seulement si** l\'hôte le permet ; sinon dis-le dans la preuve.',
      'Revue par les agents `presti-anim-accessibilite` et `presti-anim-marque` (lecture seule) ; corrige.',
      '**Le juge `scripts/interface-p6-qa.mjs`** ; mutants : drapeau baissé qui rend la page ; `plan === \'studio\'` en dur ; une écriture hors des routes existantes ; un secret de connexion lu ; « Presti » sur une surface artisan ; un bouton d\'agent sans son chemin manuel.',
    ],
    extra: [...DESIGN_RES, ...SECU_RES],
  },
  {
    id: '036-012', titre: 'intégration, tests transverses du § 1.7, runbook et mise en service préparée',
    objectif: 'Prompt 6, lot 12 : tous les juges n8n inscrits au lanceur, la suite transverse des tests obligatoires du § 1.7, le runbook (couper, rejouer, reprendre), le plan de migration des automatisations codées en cinq pas, la base de départ des KPIs (requêtes en lecture), et le dossier du mode ombre prêt pour un compte volontaire — rien de publié, rien d\'appliqué',
    perimetre: ['scripts/tout-verifier.mjs', 'scripts/p6-transverse-qa.mjs', 'plans/011-cadrage-01-11/p6-signature/runbook.md', 'plans/011-cadrage-01-11/p6-signature/migration-automatisations.md', 'plans/011-cadrage-01-11/p6-signature/kpis-base.md', 'plans/011-cadrage-01-11/p6-signature/mode-ombre.md', 'plans/011-cadrage-01-11/p6-signature/mise-en-service.md', '.orchestre/preuves/036-012/**'],
    interdit: [...INTERDIT_N8N.filter((x) => !['app/**', 'lib/**', 'supabase/**'].includes(x)), 'app/**', 'lib/**', 'supabase/**', 'les juges des lots 036-001 à 036-011 (lecture seule)'],
    verifier: (id) => `node scripts/p6-transverse-qa.mjs && ${JUGES_N8N} && ${OFFRES} && ${ressources(id)}`,
    budget: { fichiers: 14, minutes: 180 },
    preuve: '.orchestre/preuves/036-012/resume.md (« ## Ressources utilisées » d\'abord ; les suites inscrites, chaque test du § 1.7 et le juge qui le porte, le runbook, l\'ordre de mise en service pour Benj, la sortie de la suite transverse et ses mutants)',
    role: 'Tu es l\'intégrateur et le juge du prompt 1. Un juge absent du lanceur n\'est joué par personne (`CLAUDE.md`, pièges du lanceur) : aujourd\'hui aucun juge n8n n\'y est.',
    afaire: [
      'Ne commence que lorsque 036-001 à 036-009 sont dans `.orchestre/fait/` ; sinon fais seulement l\'inscription des juges déjà là et pose une question à options pour le reste.',
      '**Lanceur** : inscris dans `SUITES` (gratuit, hors ligne) chaque `scripts/*-n8n-qa.mjs` et chaque juge des lots 036-*, ou mets-le dans `HORS_LANCEUR` avec sa raison ; **ne lance pas le lanceur** (il fait un build).',
      '**Suite transverse `scripts/p6-transverse-qa.mjs`** (§ 1.7, p6:393-403) : elle vérifie, pour chaque test obligatoire, qu\'un juge le porte et qu\'il rougit sur son mutant (le même événement rejoué deux fois, Studio sans envoi et brouillon non envoyé, Signature type non activé = carte, `OUTILS_JAMAIS_AUTO` = carte, 10 min et 20 par jour, prix sans source, créneau absent, autorisation expirée, deux comptes, avis négatif, STOP, empreintes des offres) ; et qu\'aucun `scripts/*-n8n-qa.mjs` n\'est hors du lanceur.',
      '**Runbook** (couper : interrupteur général et par département ; rejouer : par la clé d\'idempotence ; reprendre : disjoncteur réarmé à la main) ; **mise en service** pour Benj, dans l\'ordre : coller 0185, 0192, 0193 et lever leurs drapeaux, poser la clé de n8n et les modules du conteneur, ouvrir les `callerIds` des `lib-*` aux chefs, publier les enfants avant les parents, mode ombre, Studio réel, Signature type par type.',
      '**Migration des automatisations codées** (relève, relances, pilote, après-chantier) : les cinq pas de `.claude/rules/migration-production.md`, où en est chacune, ce qui reste à Benj.',
      '**KPIs** (§ 1.6) : la requête en lecture qui donne la base de départ de chacun (délai médian de première réponse, soir et week-end, taux demande → signé, euros relancés puis signés, délai de paiement, avis, part validée sans retouche, coût IA, envois en double) ; non jouées sur la production sans accord.',
      '**Mode ombre** : le dossier prêt pour un compte volontaire (accord écrit, ce qui est préparé, ce qui est comparé, comment l\'arrêter).',
    ],
    extra: N8N_RES,
  },
]

// ── Écriture ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const liste = (a) => `[${a.join(', ')}]`
for (const l of LOTS) {
  const texte = `---
id: ${l.id}
type: feature
objectif: ${l.objectif}
perimetre: ${liste(l.perimetre)}
interdit: ${liste(l.interdit)}
verifier: ${l.verifier(l.id)}
budget: { fichiers: ${l.budget.fichiers}, minutes: ${l.budget.minutes} }
preuve: ${l.preuve}
executant: claude-code
---

# ${l.id} — ${l.titre} (prompt 6, prompt 1)

## Ton rôle

${l.role} Ce lot est la ligne **${l.id}** du § 4 de \`${PLAN}\` ; ce plan, ses parties 2 et 3 (patterns, schéma, tableau Studio /
Signature) et ses cinq décisions (§ 5, défauts appliqués) font foi. Tu ne rases rien : tu branches et tu complètes l'existant (p6:32-34).

${BENJ}

## À faire

${l.afaire.map((x) => `- ${x}`).join('\n')}
- Règles de tout lot (plan, § 4) : n8n-first ; tout workflow **inactif**, en simulation, sans identifiant ; migration écrite, jamais
  appliquée ; drapeau baissé ; chaque sortie de modèle passe un schéma strict ; idempotence par clé ; journal ; « Supabase account » passe
  outre la RLS, donc **chaque requête filtre sur le compte** ; white-label (\`lib/email.ts:6-11\`) ; une seule suite lourde à la fois sur Oracle.

${ressourcesObligatoires(l.extra)}

${finDe(l.id)}
`
  const f = path.join(RACINE, '.orchestre/file', `${l.id}.md`)
  fs.writeFileSync(f, texte)
  console.log('écrit', path.relative(RACINE, f))
}
