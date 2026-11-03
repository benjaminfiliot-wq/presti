# 037-000 — La première réponse du prompt 2 (Presti pour l'entreprise)

## Ressources utilisées

Inventaire de la session au début de la tâche, sur l'hôte d'agents d'Oracle :

- **Skills** : la liste complète a été lue dans la session (environ 400 entrées). Celles qui servent ce domaine sont chargées plus bas.
- **Plugins** : ecc, ui-ux-pro-max, design, engineering, animation et motion, shopify, firecrawl, apify, data, marketing.
- **MCP** :
  - branchés : `cerveau`, Supabase (claude.ai), Vercel, GitHub, Figma, Firecrawl, Gmail, Agenda, Drive, Slack ;
  - **pas de MCP n8n sur cet hôte**. Le serveur `n8n-oracle` est déclaré, mais ses outils n'ont pas été utilisés, parce que la consigne de la tâche dit « Pas de MCP n8n ici » ;
  - en échec de connexion : anti gravity, definite, similarweb.

Ressources chargées, et ce que chacune a changé :

| Ressource | Ce qu'elle a changé dans le plan |
|---|---|
| Skill `reseau-neuronal` + MCP `cerveau`, `regles_pour` (« entreprise sur mesure, données de clients, organisations, membres, CRM, sous-traitance RGPD ») | la règle rendue est `memoire-presti/nuit-0311-consignes-benj.md` : Entreprise = carte « Sur mesure » + « Nous contacter », pas de démonstration, et **« arrête avec cette landing page »** (11 h 45). Le lot de la page (037-014) se limite donc à **ajouter** une carte et une page, maquette d'abord |
| MCP `cerveau`, `chercher` (offre Entreprise, client zéro ; RGPD sous-traitant) puis `lire` | les décisions du 01/11 (organisations « maintenant ») ; le kit de conformité (`kit/conformite/contrat-sous-traitance.md`, écrit sans relire le texte en ligne, donc à relire) ; le registre de l'entreprise Presti (`docs/registre-traitements.md`), qui fait de Presti un **responsable** de traitement pour le client zéro, et non un sous-traitant (§ 3.8 du plan) |
| MCP Supabase, **lecture seule** (`list_migrations`, `to_regclass`, `information_schema.tables`) | **état réel en base** : dernière migration `0189` ; `organisations`, `membres`, `invitations`, `droits_roles`, `utilisateurs`, `evenements_metier`, `connexions`, `competences`, `couts_ia_jour` et `demandes_demo` **absentes** ; `equipe_membres` et `actions_auto` présentes. Aucune promesse du plan ne repose sur une table absente |
| Skill `presti-design` | la page Entreprise et les apps suivent les jetons (sombre et corail pour l'intérieur, clair et thémable `--pc` pour le portail des clients de l'entreprise) ; marque blanche du portail ; aucun bleu ni violet |
| Skill `ecc:security-review` | la revue de sécurité des lots : IDOR entre organisations, élévation de rôle, invitation rejouée, carte validée par un rôle non habilité, secrets jamais versionnés ; mutants correspondants dans les juges 037-003 et 037-016 |
| Trois sous-agents `Explore` (haiku), en lecture seule, relus et contre-vérifiés par moi | relevés au fichier:ligne de l'outillage, du code (organisations, CRM, contact) et des vidéos, du kit et des dépôts. **Contre-vérification** de chaque ligne citée par `sed -n` ; six numéros de ligne corrigés dans le plan (0183, `fiches-videos.md`, `OUTILLAGE.md`) |
| **Le prompt** : `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`, lu en entier (696 lignes) | la structure du plan suit le § 2.13 (p6:636-646) point par point ; le parcours, les apps, l'organigramme, les tests et la DoD viennent de p6:426-655 |
| Le modèle de forme : `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md` | même ordre (résumé, patterns, schéma, plan, décisions), mêmes couleurs Mermaid (gris existe, bleu prompt 1, corail ajout), lots avec juge et mutants |
| **Les vidéos** : `plans/analyse-videos.md` (Tim Chao `O3A2xnBadFo` l.20, `RWKyUJLi-kI` l.189, `k1adsrTHwPg` l.339 ; volkis `7684021380060302625` l.575, **`7685717353828519170` « CRM » l.680** ; angelotturri l.470 ; **mikalianov l.941** ; sambutlerai l.1271 ; metakaihos l.1376) ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` § 5 (l.934-951), l.217 et l.286 ; `fiches-videos-restructureai.md` ; `docs/connaissance-videos/milesreevesai-…analyse.md`, `ray_fu-7692946113241959711.analyse.md` | le CRM sur mesure est le socle « atelier » plus la configuration de l'organisation, avec une question à la fois et un « fait : … » (volkis 7685) ; il démarre sur l'import de l'export du client (mikalianov) ; le centre de commande permet d'approuver par rôle (RWKyUJLi-kI) ; l'accueil se fait en deux temps (C5). Le portail client des cours est écarté comme modèle de forme (vendu à part, `fiches-videos.md:286`) |
| **Les dépôts** clonés `~/agents/depots/` (9 dépôts : Zie619 2077 JSON, enescingoz 369, test-workflows 394, skills, automation-mining, hosting, observability, starter-kit, dynamic-credentials) ; `outillage/releve-depots.md` ; `p5-entreprise/fiches-depots.md` (l.668-681) ; `fiche-methode-n8n.md` (l.17-49) | les patrons d'entreprise existent en nombre (HubSpot 40 fichiers, Pipedrive 26, Slack 164, Outlook 40, Google Sheets 350, `sendAndWait` 24, Pennylane 1, Yousign 0). **Aucun JSON ne se copie** (p6:146-147) ; ils confirment les connecteurs à ficher (lot 037-005). La licence et les identifiants dynamiques donnent la décision 3 |
| L'outillage existant : `OUTILLAGE.md` (O1-O6, l.88-146), les 9 fiches `gabarits/ent-*.md`, `.orchestre/preuves/036-016/resume.md`, `036-018/resume.md`, `scripts/deployer-client-n8n.mjs:1-17`, `mise-en-service.md:3-35`, `connecteurs/INDEX.md` | le plan **reprend** les 9 gabarits `gabarit-ent-*` (671 nœuds), le déployeur et la copie par client. Il n'ajoute que ce qui manque : le Cerveau de l'organisation, les fiches CRM, compta, banque et signature, la configuration du CRM, les politiques `org_*` |
| Commandes système `df -h`, `free -g` | charge d'Oracle mesurée le 03/11 (disque 55 %, 17 Go de mémoire disponibles) pour le mode privé (§ 3.7) ; aucun modèle local n'est installé |

## Ce qui a été fait

- Tâche prise par `node scripts/orchestre.mjs prochaine --agent=claude-code --tache=037-000` et lue en entier.
- Écrit `plans/011-cadrage-01-11/p6-entreprise/premiere-reponse.md` (environ 70 Ko). Ses cinq parties suivent le § 2.13 :
  1. le résumé en dix lignes et l'inventaire au fichier:ligne (offre, organisations, 0193, catalogue `gabarit-ent-*`, OUTILLAGE, déployeur, connecteurs, kit, socle `lib-*`, `presti-demande-demo`, CRM, ce qu'a livré le prompt 1, ce qui manque à la copie d'Oracle) ;
  2. les patterns A1 à A20, B1 à B12, C1 à C15, D1 à D3, E et F, retenus ou écartés, avec leur lot ;
  3. le schéma Mermaid de l'organisation type, avec l'ajout en corail ; puis l'organigramme et les départements, les connecteurs d'entreprise, **le CRM sur mesure écran par écran (CRM-1 à CRM-7)**, **chaque application du § 2.5 écran par écran** avec sa vidéo-modèle et son existant, les membres et les droits (C6), le mode privé (A14), la sécurité et le RGPD, les KPIs et leur base, les tests du § 2.12 avec leurs juges et leurs mutants ;
  4. le plan du **client zéro** (l'organisation de Benj) étape par étape, la page « Presti pour l'entreprise », et les **lots 037-001 à 037-016**, chacun avec son juge et ses mutants ;
  5. **cinq décisions**, chacune avec son défaut : client zéro (son organisation), accueil téléphonique (non), stockage des autorisations (chiffré dans Supabase, nœuds natifs pour le seul client zéro, pas de licence Enterprise de n8n), outils payants (aucun), renommage de `demandesDemo` (non).
- **Rien n'est construit ni appliqué.** Aucun workflow, aucune migration, aucun envoi, aucun compte. Le vault n'a pas été écrit. Ni commit, ni push, ni build.

## Constats à signaler à Benj

1. Les organisations (0183, 0184) sont **écrites mais absentes en base**. Le drapeau `organisations`, cité par `lib/plans.ts:43-44`, n'existe pas dans `lib/flags.ts`.
2. `0193` ferme ses départements sur les sept départements artisans (`0193_systeme_agents.sql:298`), et sa lecture est `auth.uid() = artisan_id` (`:310-311`). L'Entreprise exige d'élargir la liste et d'ajouter les politiques `org_*` (lot 037-002).
3. Les étapes du CRM sont figées (`lib/crm/pipeline.ts:30`) : le CRM sur mesure demande une configuration par organisation.
4. `mobile/` (coque Capacitor) est absent de la copie d'Oracle, et aucune table `comptes_clients` n'existe dans les migrations. Les lots 037-011 et 037-012 les relisent d'abord.
5. `lib/plans.ts:114` et `:163` disent encore « sur démonstration ». La landing en production n'a aucune carte Entreprise.
6. `SOUS_TRAITANTS` (`lib/legalArtisan.ts:308-316`) omet Stripe et Oracle, alors que le registre les cite tous deux.
7. `RAPPORT-0311.md` annonce 20 gabarits « dans n8n ». On en compte 19, en fichiers.

## Vérification

`node scripts/orchestre.mjs verifier 037-000` : résultat ci-dessous (verifier.log).
