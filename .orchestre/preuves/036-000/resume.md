## Ressources utilisées

- **Skill `reseau-neuronal`**, puis **MCP `cerveau`** : `regles_pour` (« agents, n8n, Gmail, données client, envoi automatique ») a ramené la règle du pilote
  (`memoire-presti/pilote-auto-aide-2110.md` : Signature seulement, 10 min), les actions irréversibles et leurs trois exceptions
  (`regles-presti/securite.md`), l'ADR-005 et l'ADR-006 ; `chercher` sur la vérification Google a ramené l'arrêt protocolaire de 2026-09
  (`presti/plans/journal-v4.md`, « ne pas simuler un bouton Connecter ») — d'où les routes OAuth derrière un drapeau baissé (036-009) ; `chercher` sur le
  pilote a ramené `plans/011-cadrage-01-11/c4-rapports/R1-existant.md`, dont les numéros de ligne ont **vieilli** (l.24 au lieu de l.27) : tout a été
  relu dans le code. Vault en lecture seule, rien écrit.
- **Le prompt 6** `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`, lu en entier (partie 0, prompt 1, § 2.6 pour le format
  des fiches, annexes A et B) : il a fixé les cinq parties, les patterns à ranger et les cinq décisions.
- **MCP `n8n-oracle`, en lecture** : `search_workflows` (37 workflows : 5 actifs, aucun parent multi-comptes, 6 `ent-exemple-*` en démonstration
  abandonnée) ; `list_credentials` (4 identifiants : Supabase, deux Slack, OpenAI ; aucun Google) ; `search_nodes` (Gmail `draft.create`, Google Calendar
  `calendar.availability`, Google Business Profile `review.getAll/reply`, WhatsApp, Execute Sub-workflow) — d'où la décision 1 (un identifiant n8n par
  artisan ne passe pas : jeton déchiffré à l'exécution) ; `get_workflow_best_practices` « triage » (règles d'abord, branche par défaut obligatoire :
  repris dans 036-001) et « human_in_the_loop » (pas de fiche : la carte « À valider » de Presti en tient lieu). Rien créé, rien modifié.
- **MCP Supabase, `list_migrations` (lecture)** : seule `0189_role_lecture_n8n` est enregistrée parmi 0183-0192 — d'où l'ordre de pose 0185 → 0192 →
  0193 écrit dans 036-002 et 036-012.
- **Les vidéos déjà analysées** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` (fiches 1, 2, 6, 8, 9, 10, 11 : « Approval Desk »,
  « invoice-when-job-done » + « Ask you », chaîne du dépannage, tri en trois classes, dix minutes le lundi), `fiches-videos.md` § 5 (l.930-951) et
  §§ 3.3, 3.5, 3.6 (D1-D3), `docs/connaissance-videos/` (ray_fu, milesreevesai, trevsagents, androoagi) : chaque pattern du § 2 du plan a son endroit.
- **La méthode n8n** : `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md` (l.17-49, § 3.7) et `fiches-depots.md` (gabarits l.666-681,
  identifiants dynamiques l.571-596) : tableau E du plan, et la raison d'écarter les identifiants n8n par artisan (licence, l.47-49).
- **Les preuves de l'existant** : `.orchestre/preuves/035-003`, `035-004`, `035-005`, `035-007`, `032-040`, `032-041`, `032-042`, `032-044`, et
  `.orchestre/refuse/032-046.md`, `032-047.md` : la partie 1.3 et les limites reprises par les lots (callerIds réservés aux bancs, registre qui ignore
  n8n, pause générale illisible, juges hors du lanceur).
- **Le plan du chantier 4** `plans/011-cadrage-01-11/chantier-4-assistant-plan.md` (amendements § 0, existant § 2, lots § 14) et
  `plans/011-cadrage-01-11/c2-lot6/reference-claude-com.md` (propreté de l'interface, transmise aux lots 036-010 et 036-011).
- **Recherche web du modèle** (aucune donnée de Presti envoyée) : coût de l'évaluation CASA Tier 2 pour Gmail et accès à l'API Business Profile, avec
  leurs sources, dans les décisions 2 et 3.
- **Trois sous-agents `haiku` en lecture seule** (routage de `CLAUDE.md` : exploration et résumés) : inventaire du code au fichier:ligne, résumé des
  preuves, renvois des fiches ; leurs numéros de ligne ont été **contre-vérifiés** par `grep -n` avant usage (deux écarts trouvés et corrigés).
- **Non chargés, et pourquoi** : les skills de design (`presti-design`, `frontend-design`, `ui-ux-pro-max:*`, `emil-design-eng`, `apple-design`,
  `make-interfaces-feel-better`, `design:design-critique`) et de sécurité (`ecc:security-review`, `presti-audit-attaque`) ne servent pas un plan sans
  écran ni code ; ils sont rendus **obligatoires** dans les tâches qui en ont besoin (036-002, 036-003, 036-005, 036-009, 036-010, 036-011). Vidéo
  (hyperframes, motion-doctrine) : hors sujet.

## Ce qui est livré

| Fichier | Contenu |
|---|---|
| `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md` | les cinq parties du § 1.8 : résumé en 10 lignes et inventaire (tourne / simulation / manque) ; les 50 patterns et la méthode E rangés ; le schéma Mermaid (gris, bleu, corail) ; départements, agents, connecteurs ; tableau Studio / Signature par type d'action ; 12 lots classés par valeur ; 5 décisions avec leur défaut appliqué |
| `.orchestre/file/036-001.md` à `036-012.md` | une tâche par lot, en-tête complet, `executant: claude-code`, budget ≤ 180 min, rôle, Benj, à faire, ressources obligatoires, fin |
| `.orchestre/preuves/036-000/ecrire-taches.mjs` | le générateur des douze tâches (blocs communs à un seul endroit, rejouable) |

## Preuves (sorties de commande)

- Partie « document » du `verifier` : `{ sec: true, cit: 184, pat: true, dec: 5, mermaid: true }`.
- Les **184 renvois** fichier:ligne du plan, contrôlés par un script : chaque fichier existe et chaque ligne citée existe (0 écart).
- `node scripts/orchestre.mjs valider` : **12 / 12 ✓** (036-001 à 036-012).
- Contrôle « Ressources utilisées » des tâches : vert sur une preuve conforme, **rouge** (code 1) sur une preuve qui ne commence pas par la section.
- Juges existants enchaînés par les tâches, joués le 03/11 sur Oracle, tous verts : `lib-socle-n8n-qa` OK, `lib-metier-n8n-qa` OK,
  `lib-relance-n8n-qa` OK, `migrations-jumelles-e2e` 588 réussis ; avec `--experimental-strip-types --import ./scripts/ts-loader.mjs` :
  `offres-affichage-qa` 0, `pilote-qa` 95 verts, `relances-n8n-qa` 0, `apres-chantier-n8n-qa` 0, `briefing-n8n-qa` OK. Sans le chargeur, ces cinq-là
  plantent (`ERR_MODULE_NOT_FOUND`) : les tâches les appellent avec le chargeur, comme le lanceur.

## Constats à remonter (risques, points à valider)

1. **Aucun juge n8n n'est au lanceur** (`SUITES`, `scripts/tout-verifier.mjs:25` ; `HORS_LANCEUR`, `:208`) : personne ne les rejoue la nuit. 036-012 les
   inscrit.
2. **La boîte mail n'est relevée qu'une fois par jour** (`app/api/canaux/relever/route.ts`, cron de 7 h) : c'est pourquoi 036-003 vient en troisième.
3. **Le travail interrompu de 032-046 et 032-047** a été écrit sur le disque **après** leur passage en `refuse/` (fichiers non suivis `app/console/**`,
   `scripts/ombre-accuse-reception.mjs`, migration 0192) : état non validé ; 036-011 interdit `app/console/**`, et rien ne s'appuie sur 0192 sans la relire.
4. **`assistant-gestion/ETAT-DES-LIEUX-2026-10-29.md`** (cité par p6:319) n'existe pas dans le dépôt.
5. Numéros de ligne qui ont glissé dans `CLAUDE.md` : `lib/plateformeConfig.ts:45` → `:46` ; `HORS_LANCEUR` « l.184-215 » → `:208`.
6. Gestes réservés à Benj, préparés par les lots : coller 0185, 0192, 0193 puis lever ; clé de déchiffrement et modules `imapflow`/`nodemailer` dans le
   conteneur n8n ; ouvrir les `callerIds` des `lib-*` aux chefs ; publier ; application OAuth Google et, s'il le veut, l'évaluation CASA ; demande d'accès
   à l'API des avis ; compte volontaire du mode ombre.
7. Budget hebdomadaire des agents (83 % le 03/11, arrêt à 95 %) : 036-001 à 036-004 d'abord ; la suite au renouvellement.

Ni commit, ni push, ni build, ni typecheck, ni migration, ni workflow créé ou modifié, ni écriture dans le vault.

## Vérification de la tâche : bloquée par sa propre commande

`node scripts/orchestre.mjs verifier 036-000` → `FAIL — /bin/sh: 1: Syntax error: EOF in backquote substitution` (`verifier.log`) : la commande
contient `/```mermaid/` entre guillemets doubles, et `'\\b'` que sh réduit à un retour arrière. Le même contrôle corrigé de ces deux citations
(`verifier-corrige.sh`) donne **code 0** (`verifier-corrige.log`) et **rougit** sur deux mutants (sans Mermaid ; sans « A14 »). Question à options
posée : `.orchestre/en-cours/036-000.question.md`. La tâche reste dans `en-cours/` : je ne la classe pas en `fait/` à la main.
