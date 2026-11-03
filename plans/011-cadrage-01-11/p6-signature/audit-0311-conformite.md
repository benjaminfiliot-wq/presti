# Audit de conformité du prompt 1 (Studio et Signature) — tâche 036-028, 03/11/2026

Auditeur indépendant, pôle audit (`.claude/agents/presti-audit-conformite.md`), en lecture seule. Je n'ai rien construit ici et je n'ai rien
corrigé. Je réponds à la question de Benj du 03/11 au soir : « tous les systèmes d'agents et d'automatisation de Studio et Signature […] sont
prêts, fonctionnels, faits en prenant les vidéos en exemple et les workflows n8n de GitHub […] ? »

**La réponse courte est non.** Il y a beaucoup de travail réel et bien jugé hors ligne, mais rien ne tourne pour un artisan. Les gabarits « à
vrais outils » ne peuvent pas s'exécuter contre la base telle qu'elle est. Et le multi-agents (un chef et ses spécialistes) n'existe que dans
des fichiers.

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans l'audit |
|---|---|
| MCP `cerveau` : `regles_pour` (« audit, conformité, prompt 6 »), `chercher` (« prompt 6 Signature », « vidéos workflows n8n agents »), `lire` (`memoire-presti/workflows-vrais-outils-0311.md`, `decisions-benj-0311-apres-midi.md`) | M'a donné les exigences de Benj du 03/11 : vrais nœuds, agent IA avec ses outils, porte de simulation, multi-agents « un agent chef qui délègue à ses spécialistes », et « active toutes les automatisations en les testant ». Ce sont les lignes 31 à 38 du tableau. |
| MCP `n8n-oracle`, en **lecture seule** : `search_workflows` (75 workflows), `get_workflow_details` (`presti-cerveau`, `gabarit-artisan-suivi` ; puis `-direction`, `-operations`, `-facturation`, `-devis` par un sous-agent en lecture), `search_workflow_executions`, `get_workflow_execution` (844, 882) | M'a permis de comparer ce qui est dans n8n à ce que disent les exports et le rapport. Constat : aucun chef d'agents dans n8n, aucun gabarit Entreprise, un Cerveau publié qui ne lit rien. Rien n'a été écrit dans n8n. |
| Sous-agent `general-purpose` (Sonnet), consigne de lecture seule | Il a compté les nœuds de quatre gabarits tirés au sort (`shuf --random-source`, graine « 036028 »). Je n'ai pas relu ses sorties : j'ai recompté `-operations` moi-même avec `jq`. |
| Juges du dépôt, joués un par un : `multi-agents-qa`, `p6-transverse-qa` (statique, puis `--vivant`), `provisionnement-qa`, `offres-affichage-qa`, `n8n-specs-qa` sur 036-019, `gabarits-{accueil,argent,terrain,entreprise}-qa` | Ils séparent ce qui est **prouvé hors ligne** de ce qui ne l'est pas. Le juge `offres-affichage-qa` est **rouge**. |
| Mes scripts de mesure (`.orchestre/preuves/036-028/*.mjs`) : nœuds par famille, atteignabilité des agents, tables appelées contre les migrations, taille des 2 669 workflows des dépôts clonés (`~/agents/depots`) | Ils remplacent les qualificatifs (« très gros », « vrais outils ») par des comptes. C'est le relevé des tables qui a trouvé l'écart le plus grave. |
| `plans/analyse-videos.md`, p6 § 0.2 (A1 à E), `outillage/OUTILLAGE.md`, `releve-depots.md`, `types-noeuds-depots.md`, `multi-agents.md`, les `resume.md` de 036-001 à 036-027, `RAPPORT-0311.md` | Ce sont les sources des exigences et des affirmations que j'ai contrôlées. |
| `.claude/agents/knowledge/audit.md` et son journal ; `CLAUDE.md` ; `.claude/rules/*.md` | J'en ai tiré la méthode (aucun « en place » sans fichier:ligne, une source doit prouver CETTE mesure) et les règles à contrôler. |
| Skill `security-review` : non chargé dans cette session | L'audit porte sur la conformité, pas sur une revue de code. Je le signale au lieu de prétendre l'avoir appliqué. |

## Méthode et limites

- Les états possibles sont **prouvé** (juge à mutants vert rejoué ici, exécution n8n relue, ou fichier:ligne), **construit non prouvé**,
  **manquant** et **non conforme**. Toutes les sorties de juge citées sont dans `.orchestre/preuves/036-028/juge-*.log`.
- **Je n'ai pas pu vérifier** :
  - l'état réel de la base, faute de connecteur Supabase dans cette session. Les migrations « posées » ne le sont que d'après la mémoire
    `decisions-benj-0311-apres-midi.md` ;
  - les exécutions planifiées réussies : `saveDataSuccessExecution: "none"` dans les réglages de `presti-cerveau` et des gabarits, donc
    aucune trace n'en reste ;
  - la production en direct : pas de réseau sortant.
- **Deux systèmes coexistent**, et je les distingue partout :
  - **la chaîne** (036-001 à 036-008) : `presti-cerveau`, `presti-dep-*` et `lib-*`, **publiée dans n8n**, en simulation, sur données
    épinglées ;
  - **les gabarits outillés** (036-013 à 036-019) : `gabarit-*`, avec les vrais nœuds d'outils, **jamais exécutés**.

## 1. Les exigences et leur état

| # | Exigence | Source | État | Preuve |
|---|---|---|---|---|
| 1 | Un Cerveau `presti-cerveau`, multi-comptes, qui **lit en base** les événements et la configuration, puis appelle le bon chef | p6:357-359, p6:225 | **non conforme** | Il est publié (`active: true`) et tourne chaque minute. Mais ses trois lectures sont des nœuds `noOp` « simulation : épinglé » (relu par `get_workflow_details`, 23 nœuds) : il ne lit rien en production. Sa note dit « INACTIF, jamais publié », ce qui contredit n8n. |
| 2 | Le Cerveau route et ne décide jamais d'un montant | p6:225 | **prouvé** (simulation) | Le nœud `Aiguiller` ne fait que router. Exécution n8n 882 (`presti-banc-cerveau`, 16:52 UTC) : 40 cas fictifs ; Studio donne 16 cartes et 0 envoi par le pilote, Signature 4 cartes et 13 envois par le pilote, 0 erreur. |
| 3 | Chaque département a un chef qui distribue et des spécialistes `lib-*` | p6:228, p6:360 | **construit non prouvé** | Dans n8n : 7 `presti-dep-*` publiés, 26 `lib-*` publiés. Seul le chef de l'Accueil est rejoué (exécution 882). |
| 4 | Toute sortie passe la porte de conformité ; une lecture en erreur vaut un refus | p6:230 | **construit non prouvé** | `lib-porte-conformite` est publié. Les gabarits ont une porte « simulation » devant chaque effet : R15 tenue sur 16 exports (`juge-n8n-specs-036-019.log`). Aucune exécution réelle. |
| 5 | Une exception a deux issues : traitée, ou posée sur le bureau avec la solution prête | p6:232 | **construit non prouvé** | Escalades comptées dans 882 (4 et 3). Aucune carte « préparée » relue en base. |
| 6 | Chaque action laisse une ligne « fait : … » au journal | p6:233 | **non conforme** | Les gabarits écrivent dans `journal_agents`, table qui n'existe dans aucune migration (`tables-appelees.txt`). La chaîne journalise par `lib-journaliser`, en simulation. |
| 7 | Une fiche par connecteur, avec la décision de stockage des autorisations | p6:258-262, p6:380 | **construit non prouvé** | 8 fiches dans `connecteurs/` et 26 dans `outillage/connecteurs/`. Décision O3 tranchée (voie a, mémoire du 03/11). `provisionnement-qa` vert (20 mutants sur 20), mais `POST /credentials` n'a jamais été essayé sur n8n (`036-021/resume.md`). |
| 8 | Tout message reçu est déposé une seule fois dans la bonne conversation de la plateforme, quel que soit le canal | p6:279-285 | **manquant** | `gabarit-artisan-accueil-boite` et `-leads` appellent `rpc/deposer_message`, fonction absente des migrations. `outillage/gabarits/accueil.md:82` l'écrit lui-même. Le test obligatoire de p6:284 n'est joué nulle part. |
| 9 | n8n-first : l'automatisation dans n8n, l'application pour l'interface | p6:289, `architecture-outils.md` | **construit non prouvé** | Toute la logique du prompt 1 est dans n8n. Mais le pilote, les relances et les crons de l'application restent les seuls à envoyer (p6:368, permis). Les pas 4 et 5 de la migration ne sont pas faits (`036-012/resume.md`). |
| 10 | Le code calcule les montants, jamais le modèle | p6:292 | **prouvé** (hors ligne) | `gabarit-artisan-devis` : « Revalider les lignes », prix lu dans les tarifs ou ligne « estimée » sans prix. Juge `multi-agents-qa`, mutant « montant pris dans la sortie du chef » rouge (`juge-multi-agents.log`). |
| 11 | Anti-fabrication : aucun créneau inventé, aucun prix deviné envoyé comme sûr | p6:293 | **prouvé** (hors ligne) | `p6-transverse-qa --vivant` : `operations-n8n-qa` (créneau) et `devis-facture-n8n-qa` (29 mutants sur 29) verts (`juge-p6-transverse-vivant.log`). |
| 12 | Chaque sortie de modèle passe un schéma strict | p6:294 | **prouvé** (hors ligne) | Parseur `additionalProperties: false`, `autoFix: false`, puis un nœud Code de revalidation. R18 tenue sur 16 exports. `multi-agents-qa` : 20 mutants rouges. |
| 13 | Idempotence : un rejeu ne crée ni doublon ni second envoi | p6:295, p6:395 | **non conforme** (gabarits) / **prouvé** (chaîne, hors ligne) | Les gabarits écrivent avec `on_conflict=organisation_id,cle`. Or `opportunites` n'a pas de colonne `organisation_id` et son index unique est partiel (`0185_automatisation.sql:229-267`). `assistant_actions` n'a ni `organisation_id` ni `cle` (`0157_assistant_actions.sql:30-50`). `messages` n'a pas non plus ces colonnes. Pour la chaîne, T1 est porté par le juge transverse. |
| 14 | Mode à blanc avant la production ; interrupteur général et par département | p6:295, `CLAUDE.md` | **prouvé** (simulation) | Porte « simulation » fail-closed. Les interrupteurs sont lus dans `Aiguiller` (`presti-cerveau`). Exécution 882. |
| 15 | Plafond de coût IA par jour | p6:295 | **construit non prouvé** | `lib-cout-ia` publié en simulation ; `couts_ia_jour` existe (`0193_systeme_agents.sql:315`). Aucune mesure réelle. |
| 16 | White-label : le client ne voit jamais « Presti » | p6:296, `lib/email.ts:6-11` | **prouvé** (exports) | 0 nœud d'envoi des exports 036-013 à 036-019 ne contient « Presti » (relevé mécanique). Le pied de message dit « l'assistant de {enseigne} ». |
| 17 | Multi-tenant strict ; chaque requête n8n filtre explicitement le compte | p6:298, p6:401 | **construit non prouvé** | Les requêtes des gabarits filtrent `organisation_id` et `artisan_id`, mais sur des vues absentes. La clé de « Supabase account » est « à vérifier » (`036-027/resume.md`, « À trancher »). |
| 18 | Migration collée, PUIS drapeau levé | p6:298, `migration-production.md` | **construit non prouvé** | `systemeAgents: false` (`lib/flags.ts:340`), `connexions: false` (`lib/flags.ts:344`). Restent à poser 0183, 0184, 0186 et 0188 (`RAPPORT-0311.md`). Pas de vérification en base possible ici. |
| 19 | Une fonctionnalité non finie n'apparaît pas | p6:299 | **prouvé** | Drapeaux baissés aux lignes 340 et 344 ; `interface-p6-qa` est au lanceur (`scripts/tout-verifier.mjs:236`). |
| 20 | Studio : tout s'arrête à « À valider », avec un brouillon dans Gmail | p6:313-315, p6:396 | **prouvé** (hors ligne et simulation) | Exécution 882 : Studio, 0 envoi par le pilote. Brouillons Gmail et Outlook (`create`) dans `gabarit-artisan-accueil-reponse` et `-devis`. T2 porté par le juge transverse. |
| 21 | Signature : envoi seul des types activés, 10 minutes pour annuler, 20 par jour | p6:316-318, p6:397 | **prouvé** (règles du pilote) | `p6-transverse-qa` : mutants T4 et T5 rouges sur `lib/pilote/regles.ts` (17 sur 17). `pilote-qa` vert. Dans n8n, rien ne part (envois coupés). |
| 22 | Sept départements, chacun avec ses spécialistes, ses déclencheurs, ses connecteurs et son KPI | p6:325-338 | **construit non prouvé** | Sept chefs publiés et dix gabarits artisans dans n8n (voir § 5). Aucun KPI mesuré. |
| 23 | Premier écran : « où perdez-vous de l'argent ? » calculé sur les vraies données | p6:340 | **construit non prouvé** | Maquette 036-010 et code 036-011 derrière `systemeAgents` baissé ; écrans jugés inutiles par Benj (mémoire du 03/11). |
| 24 | Interface § 1.3 : centre de commande, « Ce que vos assistants ont fait », « Connexions », « Mes départements », double chemin, une question à la fois | p6:343-353, p6:383 | **construit non prouvé** | `app/systeme/` derrière son drapeau. Benj a décidé « tout dans l'outil de gestion » (036-020). Aucun de ces écrans n'est visible d'un artisan. |
| 25 | Les workflows existants deviennent des départements | p6:365-366 | **construit non prouvé** | `presti-detecteurs`, `-briefing-matin` et `-suivi-artisan` sont publiés. `presti-apres-chantier` est inactif. Aucun n'est appelé par `presti-cerveau`. |
| 26 | Mise en production par paliers : simulation, ombre, Studio réel, Signature réel | p6:370-372 | **manquant** au-delà de la simulation | `Aiguiller` saute tout compte hors palier « simulation » (`palier_non_branche`). L'ombre et le réel ne sont pas branchés (`036-001/resume.md:83`). |
| 27 | Charge : lots bornés, quotas, mémoire et disque d'Oracle mesurés | p6:373 | **construit non prouvé** | `limit=200` et 50 par page dans les requêtes. Aucune mesure d'Oracle dans les preuves lues. |
| 28 | Livrables 1 à 3 : fiches des patterns, schéma Mermaid, fiches de départements | p6:377-379 | **prouvé** (documents) | `premiere-reponse.md` : § 2 (50 lignes de patterns A à D), Mermaid à la ligne 193, § 3.2. `competences/` : 7 fichiers. |
| 29 | Livrable 5 : le tableau Studio et Signature contrôlé contre `lib/plans.ts` | p6:381 | **non conforme** | `premiere-reponse.md` § 3.3. Mais `offres-affichage-qa` est **rouge** au commit en production : les empreintes de Studio, de Signature et des offres ont changé avec les prix 30 € et 60 € sans que le juge soit remis à jour (`juge-offres.log`, code 1). |
| 30 | Livrable 6 : contrats JSON, exports versionnés, plan de migration | p6:382 | **prouvé** (documents) | `contrats/` (9 JSON), exports `.orchestre/preuves/036-0*`, `migration-automatisations.md`. |
| 31 | Livrable 8 : KPIs avec leur base mesurée | p6:384-391 | **manquant** | « Aucune requête de `kpis-base.md` n'a été jouée » (`036-012/resume.md`). |
| 32 | Tests du § 1.7 hors ligne, capables de rougir, inscrits au lanceur | p6:393-403 | **non conforme** (1 sur 12) | `p6-transverse-qa --vivant` : 8 juges verts, `offres-affichage-qa` rouge (T12). `provisionnement-qa` n'est pas au lanceur (0 occurrence). |
| 33 | Définition de terminé : un vrai compte Studio et un vrai compte Signature tournent sur leurs vraies données, déploiement vérifié | p6:416-422 | **manquant** | Aucun compte volontaire, aucune copie `client-*` dans n8n (`search_workflows` « client- » : 0), aucun `presti-provisionnement` dans n8n (0). |
| 34 | (Benj, 03/11) Les vrais nœuds d'outils dans les workflows, pas du Code déguisé | `workflows-vrais-outils-0311`, `OUTILLAGE.md` § 1 | **construit non prouvé** | Dans n8n : 63 nœuds d'outils natifs et 29 outils d'agent sur 334 nœuds (10 gabarits). Les nœuds Code font encore 19,5 % des nœuds, contre 5,7 % dans les dépôts (§ 3). Aucun gabarit n'a été exécuté. |
| 35 | (Benj, 03/11) Le multi-agents : dans chaque gabarit, un agent chef qui délègue à ses spécialistes | `decisions-benj-0311-apres-midi` | **non conforme** | Dans n8n : **0 chef, 0 `agentTool`** (5 gabarits sur 5 relus). Dans les exports 036-019, le chef est branché, mais « la note du chef n'est lue par personne » et « les agents d'origine tournent toujours » (`036-019/resume.md`, points 2 à 4). Le chef se place entre le Qualificateur et le Rédacteur, qui tournent quoi qu'il décide. |
| 36 | (Benj, 03/11) Instagram, Facebook et les outils de leads | `workflows-vrais-outils-0311` | **construit non prouvé** | `gabarit-artisan-accueil-leads` (n8n) : Facebook Graph pour Lead Ads, Messenger et Instagram, en lecture. Aucune exécution. |
| 37 | (Benj, 03/11) LinkedIn et Brevo | `workflows-vrais-outils-0311`, `email-brevo.md` | **manquant** dans n8n | Présents seulement dans les exports Entreprise (`gabarit-ent-leads`, `-marketing`), qui ne sont pas dans n8n (`search_workflows` « gabarit-ent » : 0). Aucun workflow de prospection Brevo dans n8n. |
| 38 | (Benj, 03/11) « Active toutes les automatisations en les testant » | `decisions-benj-0311-apres-midi` | **manquant** | Il y a 43 workflows publiés, tous en simulation, sur données épinglées ou avec les envois coupés. Les 10 gabarits sont inactifs et jamais joués. Le mode ombre n'a pas commencé. |
| 39 | Les compétences par département sont lues par l'agent | p6:229, A4, B1, B2 | **manquant** au branchement | La table `competences` existe (`0193_systeme_agents.sql:241`) et 7 fichiers de compétences sont écrits. Mais **aucun export** (chaîne ou gabarits) ne la lit (recherche de « competences » : 0 fichier). |
| 40 | Les dépôts communautaires servent d'idées, et aucun JSON n'est copié | p6:146-147 | **prouvé** | « Aucun JSON n'est importé » (`OUTILLAGE.md` § 2). Les gabarits sont fabriqués par des `construire.mjs`. |

## 2. Les vidéos : dix motifs d'automatisation et d'agents, et où ils sont repris

| # | Motif (`plans/analyse-videos.md`) | Où il est repris | État |
|---|---|---|---|
| V1 | Validation en un clic de chaque action avant son exécution par n8n (l.292, RWKyUJLi-kI [01:43]) | voie « carte » des gabarits (`Déposer la carte` → `opportunites`) ; Studio dans `presti-dep-accueil` (exécution 882) | repris ; l'écriture vise une colonne `organisation_id` absente (ligne 13 du tableau) |
| V2 | Un bouton manuel pour chaque action automatique (l.1496, volkis 53-61 s) | maquettes 036-010 ; `app/systeme/` derrière son drapeau | repris à l'interface, invisible ; absent de n8n (normal) |
| V3 | Agent, mémoire, connexions, compétences (l.587, volkis 68-79 s) | connexions : `0193`, `app/api/connexions/` (drapeau baissé) ; agent : nœuds AI Agent | partiel : la mémoire (refus, choix) et les compétences ne sont lues par aucun workflow |
| V4 | Des compétences métier écrites, un document par geste (l.1532) | `p6-signature/competences/*.md` (7) ; table `competences` | **non repris à l'exécution** : aucun agent ne les lit |
| V5 | Des questions sur le chantier avant le devis (l.428, k1adsrTHwPg [00:46]) | `gabarit-artisan-accueil-reponse` : Qualificateur, `questions_manquantes[0]`, une seule question au Rédacteur | repris (export et n8n) |
| V6 | Relancer un impayé jusqu'au paiement, ou jusqu'à la raison du non-paiement (l.470, angelotturri 38-52 s) | `gabarit-artisan-facturation` : `contestation`, `motif`, paiement lu dans Stripe (`stripe`, `stripeTool`) | repris dans la forme ; la vue lue (`n8n_factures_argent`) est absente |
| V7 | Contrat d'entretien après le chantier, puis rappels (l.480, angelotturri 60-83 s) | `gabarit-artisan-apres`, `presti-dep-apres` (publié), `presti-apres-chantier` (inactif) | repris, en simulation |
| V8 | À REJETER : envoyer seul un prix tiré des anciens chantiers (l.496) | `gabarit-artisan-devis` : repère cité (`n8n_reperes_prix`), envoi seul seulement si chaque prix vient des tarifs | rejet respecté (juge `devis-facture-n8n-qa` vert) |
| V9 | Ne plus relancer au troisième report de rendez-vous ; score avant envoi (l.355, l.418) | paliers J+2, J+5, J+10 et contrôleur de conflit (`lib-controler-conflit`) ; `lib-qualifier-lead` (Entreprise) | **arrêt au troisième report non repris** (0 occurrence de « report » dans les exports) |
| V10 | Onboarding sur 48 heures (l.255, RWKyUJLi-kI [01:48]) | `presti-suivi-artisan` (J0 à J+2, brouillons), publié | repris, en simulation, aucun envoi |

Bilan : 6 motifs repris dans n8n, 2 repris en partie (V3, V6), 2 non repris à l'exécution (V4, V9), et le rejet V8 respecté. Tous
restent en simulation.

## 3. Les dépôts : de vrais nœuds, ou du Code déguisé ?

**Dans les exports**, version la plus récente de chaque gabarit (`comptes-exports.txt`) : 19 gabarits, 1 230 nœuds.
- Nœuds Code : 160 (13 %).
- Nœuds d'outils natifs : 192, plus 166 outils d'agent.
- Agents : 39 nœuds AI Agent et 38 agents-outils.
- HTTP : 239 nœuds, presque tous vers Supabase.
- 81 types distincts, 41 outils distincts.
- Tous les agents sont atteints depuis un déclencheur (`atteignabilite.mjs`).
- Identifiants : 0. Inactifs : 19 sur 19.

**Dans n8n**, 10 gabarits artisans, 334 nœuds (`comptes-version-n8n.txt`) :
- Nœuds Code : 65 (19,5 %).
- Nœuds d'outils natifs : 63, plus 29 outils d'agent.
- Agents : 11 nœuds AI Agent, **0 agent-outil**.
- HTTP : 64 nœuds.
- 17 vrais outils : IMAP, SMTP, Gmail, Outlook, Agenda, Drive, Sheets, fiche Google, Excel, OneDrive, Teams, Slack, Stripe, Telegram, Twilio,
  WhatsApp, Facebook Graph.
- Pas de Brevo, pas de LinkedIn, pas de CRM.

**Cinq gabarits tirés au sort**, comparés à n8n :

| Gabarit | n8n (nœuds, agents, chef ?) | Export 036-019 (nœuds, agents) | Export de son lot | Verdict |
|---|---|---|---|---|
| `-suivi` | 34, 1, non | 48, 4 | 036-014 : 34, 1 | n8n porte l'ancien export : le multi-agents n'y est pas |
| `-direction` | 34, 2, non | 50, 6 | 036-015 : 34, 2 | idem |
| `-operations` | 71, 3, non | 85, 7 | 036-015 : 71, 3 | idem |
| `-facturation` | 41, 1, non | 55, 4 | 036-014 : 41, 1 | idem |
| `-devis` | 42, 1, non | 56, 4 | 036-014 : 42, 1 | idem |

**Comparaison aux dépôts** (`mesure-depots.txt`, 2 669 workflows, le même nombre que `releve-depots.md:1`) :
- Taille : médiane de 9 nœuds, 90e centile 24, 99e centile 45. Seuls 38 workflows dépassent 40 nœuds.
- Code et Function font 5,7 % des nœuds.
- 120 workflows ont un agent, le même compte que `releve-depots.md` (`agent : 120`).
- Les gabarits sont donc **plus gros que 97 % des workflows des dépôts**. Ils portent de vrais nœuds d'outils, ce ne sont pas des nœuds Code
  déguisés. Mais ils ont **3,4 fois plus de Code en proportion**, à cause de la revalidation, des décisions et de la simulation.
- Aucun dépôt n'emploie `agentTool` (`multi-agents.md`, « Limites assumées ») : la forme « chef et agents-outils » ne vient pas des dépôts.

**Le défaut qui annule le reste** : 52 des 61 tables, vues et fonctions Supabase que les gabarits appellent n'existent dans aucune migration
(`tables-appelees.txt`). Parmi elles, `v_accueil_*`, `n8n_config_agents`, `n8n_tarifs_artisan`, `n8n_destinataires`, `pilote_file`,
`journal_agents`, `rpc/deposer_message`, `rpc/n8n_pdf_*`, et les 27 `entreprise_*`. Les constructeurs le disent eux-mêmes
(`outillage/gabarits/accueil.md:82`, `devis.md:31`, `devis.md:92`). Le rapport du 03/11 ne le dit pas.

Il y a plus grave : le gabarit écrit la file du pilote dans `pilote_file`, alors que le pilote lit `actions_auto`
(`0174_pilote_automatique.sql:28-42`). Et `Inscrire au registre` écrit `mode: 'n8n'` dans `assistant_actions`, dont la contrainte n'admet
que `direct` ou `confirmation` (`0157_assistant_actions.sql:37`). Branché tel quel, aucun gabarit n'écrirait une seule ligne.

## 4. « Très gros, très puissants » : les mesures

**Dans n8n, au 03/11 à 17 h UTC** :
- 75 workflows : 43 publiés et 32 inactifs.
- Les 43 publiés sont 26 `lib-*`, 15 `presti-*`, la file de Hermes et la revue du réseau neuronal. Tous sont en simulation, sur données
  épinglées ou avec les envois coupés.
- Les inactifs comprennent les 10 `gabarit-artisan-*`, 10 bancs, 6 `ent-exemple-*` (« Bâti-Démo », que p6:16-17 abandonne) et 6 autres.
- Agents IA dans les gabarits de n8n : 11 nœuds, tous spécialistes, aucun chef.

**Dans les fichiers** : 19 gabarits, 1 230 nœuds et 77 agents, dont 16 chefs.

**Le rapport du 03/11 ne tient pas sur trois points** :
- il annonce « 20 gabarits, environ 1 000 nœuds », dont « 11 » pour les artisans ; il y en a 10 ;
- il dit les lots 036-016 et 036-018 « n8n, inactifs », alors que leurs propres preuves disent « pas dans n8n »
  (`036-016/resume.md:21`, `036-018/resume.md:4`) ;
- il ne mentionne pas les 52 objets de base manquants.

Ce que fait **vraiment** chaque département aujourd'hui (simulation seulement, aucun client touché) :

| Département | Ce qui tourne (n8n) | Ce qui existe en gabarit, jamais exécuté |
|---|---|---|
| 1. Accueil et réponse | `presti-dep-accueil` classe et décide carte ou pilote, prouvé sur 40 cas (exécution 882) ; `lib-trier-demande`, `lib-lire-photo` | Relève Gmail, Outlook et IMAP ; leads Facebook, Messenger et Instagram ; Qualificateur et Rédacteur Claude ; brouillon Gmail et Outlook ; envois Gmail, Outlook, SMTP, WhatsApp, Telegram |
| 2. Devis | `presti-dep-devis` (banc argent 856 vert) | Rédacteur de lignes, tarifs Sheets et Excel, PDF dans Drive et OneDrive, envoi Gmail et Outlook, Yousign et DocuSign par HTTP |
| 3. Suivi et relances | `presti-dep-suivi`, `lib-controler-conflit` (banc 871 vert) | Relanceur Claude, contrôleur en outil, relance par six canaux, registre |
| 4. Facturation | `presti-dep-facturation` (banc 856 vert) | Relanceur d'impayés, Stripe en lecture, PDF, export Sheets et Excel |
| 5. Après-chantier | `presti-dep-apres`, `lib-avis-lire`, `lib-avis-repondre` | Avis de la fiche Google, demande d'avis, entretien |
| 6. Opérations | `presti-dep-operations`, `lib-agenda-creneaux` | Planificateur (disponibilités de l'Agenda), Gardien du stock, Archiviste Drive |
| 7. Direction | `presti-dep-direction`, `presti-briefing-matin`, `lib-cout-ia`, `lib-alerte-liste` | Page du matin et rapport du lundi par Telegram, WhatsApp, Gmail, Slack, Teams |

## 5. Les trois écarts les plus graves

1. **Les gabarits à vrais outils ne peuvent pas tourner.** 52 des 61 objets de base qu'ils appellent n'existent pas. Leurs écritures visent des
   colonnes absentes (`organisation_id`, `cle`) et une file du pilote qui n'est pas la vraie (`pilote_file` au lieu de `actions_auto`). Aucun
   n'a jamais été exécuté dans n8n. Leurs juges sont verts parce qu'ils jugent la forme du graphe, pas le contrat avec la base.
2. **Le multi-agents n'existe que dans des fichiers.** Il n'y a aucun chef dans n8n, et les 9 gabarits Entreprise n'y sont pas. Même dans les
   exports, le chef ne commande rien : sa note n'est lue par aucun nœud, et ses spécialistes doublent les agents de la chaîne fixe. C'est plus
   d'appels au modèle, pour aucune décision de plus.
3. **Rien ne tourne pour un artisan, et un test du § 1.7 est rouge.**
   - Le Cerveau publié ne lit rien (`noOp`) ; ni l'ombre ni le réel ne sont branchés.
   - Aucun compte volontaire, aucune copie client, aucune base de KPI.
   - `offres-affichage-qa` est rouge au commit en production, et `provisionnement-qa` n'est pas au lanceur.

## Verdict

- Benj peut croire : la logique de décision (Studio prépare, Signature envoie par le pilote, montants calculés par le code, schéma strict,
  marque blanche, porte de simulation) est construite dans n8n et prouvée hors ligne et en simulation. Exemples : exécution 882, et 8 juges
  verts à mutants.
- Il ne doit pas croire que c'est « prêt » ni « fonctionnel » : rien ne lit la vraie base, aucun gabarit à vrais outils n'a tourné, le
  multi-agents n'est pas dans n8n, et aucun artisan n'est branché.
- Écart 1 : 52 des 61 objets de base appelés par les gabarits sont absents, et les écritures visent un schéma qui n'existe pas.
- Écart 2 : le chef et ses spécialistes sont absents de n8n, et décoratifs dans les fichiers.
- Écart 3 : la définition de terminé n'est pas atteinte (Cerveau sans lecture, aucun compte réel, aucun KPI), et `offres-affichage-qa` est rouge.
