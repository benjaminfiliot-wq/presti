# 032-013 — le briefing du matin dans n8n (chantier 4, lot L15, voie (a)) : résumé de preuve

Fait le 02/11/2026 par Claude Code (Opus 5.5), sur le serveur Oracle (hôte d'agents), dans `/home/usine/Documents/presti`. Aucune donnée
réelle (identifiants inventés `00000000-0000-4000-8000-…`), aucune lecture réelle de Supabase, aucun envoi, aucun appel à un modèle ; ni
commit, ni push, ni build, ni typecheck, ni migration ; aucun identifiant n8n créé ni modifié ; workflow jamais publié ni activé.

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans le travail |
|---|---|
| MCP `cerveau` : `regles_pour` (« workflow n8n du briefing du matin… ») | a rendu `memoire-presti/source-restructureai-depots-n8n-0211.md` : un modèle de workflow s'étudie, ne s'importe jamais ; aucun JSON tiers repris, tout est écrit à la main |
| MCP `cerveau` : `chercher` × 3 (« briefing du matin trois priorités argent qui dort », « Ce que n8n lit colonnes permises », « n8n-first ADR-008 exception ») puis `lire` de l'ADR-008, de l'ADR-001 (section Décision) et de la note des dépôts | confirmé que le briefing poussé vit dans n8n sans exception à écrire, que l'app garde `composerBriefing` pour l'outil de l'assistant, et le défaut « P3:584 l'argent qui dort d'abord » des trois priorités |
| MCP `n8n-oracle` : `get_workflow_sdk_reference`, `get_workflow_best_practices` (`scheduling`, `data_transformation`), `search_nodes`, `get_node_types` (Schedule Trigger 1.4, Code 2) | le déclencheur 1.4 sans `misfirePolicy` posé (défaut), les nœuds Code en `runOnceForAllItems`, `executeOnce` sur chaque lecture enchaînée après un nœud qui rend plusieurs éléments (« Lire messages » rend un élément par paquet) ; le piège « zéro élément = chaîne arrêtée » réglé par `alwaysOutputData` et un paquet de repli |
| MCP `n8n-oracle` : `validate_workflow`, `create_workflow_from_code`, `update_workflow` (4 lots d'opérations, groupes de nœuds), `get_workflow_details`, `prepare_workflow_pin_data`, `test_workflow`, `get_workflow_execution` | construction du workflow `xPIDCvkp8Gk08A2E`, son export, l'essai à blanc 331 ; jamais `publish_workflow` ni `execute_workflow` |
| `plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md` (10 points, fiches 2, 7, 8 ; §3.4, §3.5, §3.9, §3.11) | l'idempotence par une clé unique en base (Q2 : `unique (artisan_id, jour)`), pas par n8n ; le workflow d'erreur ne part jamais en manuel (Q6) ; le juge hors ligne sur le modèle de `detecteurs-n8n-qa.mjs`, à inscrire dans `SUITES` (Q7) |
| `plans/011-cadrage-01-11/p5-entreprise/fiches-depots.md` (patterns `lib-*`, pièges 12, 14, 15, 17, 18) | pagination bornée (50 pages) et arrêt au plafond ; fuseau `Europe/Paris` sur le workflow ; le mode à blanc ne vaut que si un juge rougit quand il fuit (mutant « silence retiré ») |
| Vidéos déjà analysées : `plans/analyse-videos.md:1442-1443` (metakaihos, « 3 objectifs du jour → »), `fiches-videos.md:604-664` (rapport du matin qui propose sans agir) | trois priorités au plus, calculées par le code, sans modèle ; la sortie propose et ne déclenche jamais le pilote (rang 3) |
| L3 : `.orchestre/preuves/032-003/presti-detecteurs.workflow.json`, `briefs/c4-n8n-detecteurs.md`, `scripts/detecteurs-n8n-qa.mjs:292-447` (lus, ni importés ni modifiés) | le gabarit HTTP de « Lire factures », repris à la lettre ; le bac à sable du rejeu, recopié puis durci |
| Audit `032-016` (`.orchestre/preuves/032-016/rapport.md`, VERDICT : TIENT) et audit `032-010` (É1-É3, M1, M4, M8, M10, M11, F1, F2) | défauts moyens de 032-016 fermés ici dès le départ : globaux en **liste blanche** (n° 1), valeurs des filtres figées dans le gabarit (n° 3, M1), graphe **entier** vérifié (n° 4) ; `alwaysOutputData` exigé (M10), sortie en liste blanche (M11), statuts réels des demandes (M4) |
| Skill `ecc:security-review` | relecture du juge : aucun secret (motifs de `scripts/garde-commit.mjs:16-26` cherchés dans l'export), validation en liste blanche partout (gabarits exacts, colonnes, clés et valeurs de sortie), environnement vide pour l'enfant, données du bac à sable traitées comme du texte ; seul `eval` côté hôte : une constante du juge (`EXPRESSIONS_SOURCE`) |
| Règles du dépôt : `architecture-outils.md` (n8n-first), `securite.md`, `migration-production.md` ; plan du chantier 4 (§0 bis, §5, §7, §14, §16) ; prompt `p3-assistant.md` | Q2 laissée à la session principale (migration) ; e-mail laissé à Q3 ; vocabulaire du §7 et marques du rang 23 bannis des valeurs de sortie |

Non chargés, faute d'objet dans ce lot : les skills de design, de vidéo et de prospection (aucune page, aucun film, aucun envoi).

## Ce qui existe

| Livrable | Où | État |
|---|---|---|
| Workflow `presti-briefing-matin` | n8n d'Oracle, id `xPIDCvkp8Gk08A2E`, projet personnel de Benj (`S2WEcbpHoXOWFMVB`) | **inactif, jamais publié** (`active: false`, `activeVersionId: null`), 19 nœuds (1 déclencheur, 7 lectures GET, 11 nœuds Code), 3 groupes, fuseau `Europe/Paris`, réglages `executionOrder`, `timezone`, `availableInMCP` seuls, pas d'`errorWorkflow` |
| Brief | `plans/011-cadrage-01-11/briefs/c4-n8n-briefing-matin.md` | nœuds, lectures, colonnes citées à la ligne de leur migration et de 0189, correspondance avec `composerBriefing`, écarts, table de la voie (a), mention d'IA |
| Export | `.orchestre/preuves/032-013/presti-briefing-matin.workflow.json` | après la dernière modification (version `d19fec51-…`) ; l'identifiant n'y figure que par son id et son nom |
| Essai | `.orchestre/preuves/032-013/essai.json` | données épinglées, exécution 331, sortie rendue par n8n |
| Juge | `scripts/briefing-n8n-qa.mjs` | vert, 49 mutants sur 49 rouges, 73 s |

**Réserve sur l'export** : le résultat de `get_workflow_details` ne s'écrit pas seul sur le disque ; le fichier a été composé à partir de
cette réponse (identifiants, positions, métadonnées) et du code source envoyé à n8n, relu contre la réponse. La session principale peut le
recouper par `n8n export:workflow --id=xPIDCvkp8Gk08A2E` (ou `get_workflow_details` depuis le PC) puis rejouer `verifier` : toute
différence d'un octet dans un nœud Code ferait rougir les empreintes (« nouvel audit requis »).

## L'essai à blanc (test_workflow, données fictives)

Exécution **331** (`success`, 335 ms, manuelle, toutes les lectures épinglées : aucune requête réelle). Instant du déclencheur
`2026-11-03T07:30:00.000+01:00`. Trois comptes inventés :
- `…0101` Studio : deux impayés échus (dont un de 49 jours, urgent) et une facture à échoir, un devis envoyé il y a 7 jours (J+7 pile) et
  un de 3 jours, une demande arrivée la veille à 23 h de Paris, jamais lue → priorités `impayes` (2), `conversations` (1),
  `devis_sans_reponse` (1) ; une urgence (la facture de 49 jours) ; 3 impayés comptés, 2 030,50 € (203 050 centimes) ;
- `…0102` Signature (CRM) : une conversation urgente où le client a écrit en dernier, un article épuisé → `conversations`, `stock_bas` ;
  deux urgences ; rubriques hors n8n nommées ;
- `…0103` Studio, sans rien d'ouvert (devis accepté, facture payée) → **muet**, aucune ligne.

Bilan rendu par n8n : `comptes_lus 3, comptes_avec_point_du_jour 2, comptes_muets 1, comptes_muets_rubriques_hors_n8n 0,
comptes_hors_offre 0, priorites_par_rubrique { impayes 1, conversations 2, devis_sans_reponse 1, stock_bas 1 }`. Le juge le rejoue hors
ligne à l'identique et le compare à la vraie chaîne de l'app : même sortie.

## La sortie du juge

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/briefing-n8n-qa.mjs` → `OK`, code 0, 73 s (Node v24.21.0) :
- structure, gabarits HTTP exacts (valeurs des filtres comprises), graphe entier, réglages, aucun secret ;
- 11 empreintes SHA-256 ; bac à sable : écriture, lecture, processus, worker `ERR_ACCESS_DENIED`, tous les globaux hors liste blanche
  piégés, 14 tentatives d'évasion refusées (dont `Function`, constructeurs, `this.helpers`, `fetch`, `process`, `require`, minuterie,
  `console`, `Date.now`, `new Date()`, `Intl` sans date, `import()`) ; réseau de l'enfant non barré sur Node 24 (documenté) ;
- copies : capacités = `peut()`, seuils = `DEVIS_SANS_REPONSE_JOURS`, `IMPAYE_URGENT_JOURS`, `LISTE_MAX`, limites cherchées dans le code
  de l'app, jour = `jourParis` (minuit, changements d'heure) ;
- **mêmes priorités que `composerBriefing`** : 29 passages fixes (a) à (l) — la demande de 23 h en hiver, en été, la nuit du 25/10/2026
  et du 29/03/2026 ; le devis de 0 h 30 compté à Paris ; jours vides et bilan à zéro ; 51 conversations, 51 impayés, 9 lignes, fenêtre de
  200 demandes, paquet plafonné à 1 000 messages, 201 devis, 2 001 factures ; objets d'un compte non lu et identifiants partagés ;
  démonstration, suppression, hors offre ; CRM ; rejeu identique ; priorités Q1 ; lecture en panne ou absente ; plafond de 50 000 lignes ;
  lignes inattendues ; tables vides — et **320 jeux tirés** à graine fixe (809 points du jour : 750 rubriques conversations, 742 devis,
  690 impayés, 680 stock) ;
- sortie en liste blanche, essai rejoué, brief relu contre les migrations, preuve complète ;
- **49 mutants, 49 rouges**, chacun pour sa raison nommée (seuil 7 → 6, comparateurs, jour UTC, fenêtres « depuis minuit » et « 24 h »,
  fenêtre de 200 ignorée, silence retiré, lecture en panne prise pour vide, plafond pris pour complet, ordre de `composerBriefing`,
  comptes pris hors des comptes retenus, jointure par identifiant seul, décision par le nom de l'offre, copie des capacités faussée, champ
  texte, mot interdit, horloge du serveur et `Intl` sans date, cinq appels cachés jugés sans empreintes ni filtre de texte, empreintes,
  `nom_prospect`, `contenu`, jointure dans `select=`, filtre de compte retiré ou neutralisé, `est_demo` retiré, POST, corps, `proxy`,
  certificats, `nextURL` tierce, 5 000 pages, pagination des messages, `onError`, `alwaysOutputData` retiré, second identifiant,
  `active: true`, `errorWorkflow`, 8 h, nœud Gmail, graphe recâblé).

## Écarts déclarés (détail au brief)

Stock rangé par identifiant (l'écran : par nom), comparé comme un ensemble ; ex æquo départagés par identifiant ; inventaire de plus de
5 000 articles ; une lecture en panne arrête tout le passage (l'app : rubrique indisponible) ; CRM hors du lot ; sommes de stock en
flottant ; longueur des URL `in.(…)` à grande échelle.

## Questions pour la session principale

- **Q1 — l'ordre des trois priorités.** (1) Défaut appliqué : l'argent qui dort d'abord (`impayes`), puis les clients qui attendent
  (`conversations`), puis le reste dans l'ordre de `composerBriefing` (`devis_sans_reponse`, `stock_bas`) ; (2) les urgences de
  `composerBriefing` d'abord ; (3) l'ordre de ses rubriques tel quel (les conversations d'abord). Quand le CRM entrera : `a_facturer` juste
  après `impayes` (défaut proposé).
- **Q2 — la table de la voie (a).** (1) Défaut proposé : `points_du_jour (artisan_id, jour, cle, priorites jsonb, point_du_jour jsonb,
  cree_le)`, `unique (artisan_id, jour)`, RLS en lecture pour l'artisan, écriture par la clé de service seule, sans nom ni texte ;
  (2) une colonne de plus dans une table existante (refusé par défaut : rien d'existant n'a cette forme). C'est une migration : la session
  principale l'écrit, Benj donne le « go » ; je ne l'ai pas écrite. Le nœud d'écriture (upsert sur la clé) viendra après, avec son juge.
- **Q3 — l'e-mail « si l'artisan le veut ».** (1) Défaut : Resend appelé par n8n, clé posée par Benj dans n8n (question 4 du §0 bis,
  l.236) ; (2) Brevo (prend sur le quota de la prospection). Un type de notification `briefing` à créer en choix **explicite**
  (`lib/notificationsTypes.ts:5` ; aujourd'hui un réglage absent vaut « activé », l.16-17) ; son texte validé par Benj avant l'activation
  (`securite.md`). Rien n'est envoyé d'ici là.
- **Q4 — les rubriques du CRM.** (1) Défaut appliqué : hors n8n, nommées dans `rubriques_hors_n8n`, jamais dites vides ; (2) un lot qui
  les reproduit dans n8n, jugé contre `lib/assistant/crm.ts` ; (3) l'accueil (L5) qui les complète en direct.
- **Q5 — un seul seuil « devis sans réponse ».** (1) Défaut appliqué : 7 jours, comme `composerBriefing` (`lib/assistant/briefing.ts:35`) ;
  (2) J+3, comme le détecteur n° 4 de `presti-detecteurs` (032-010, M8) ; (3) deux seuils assumés (relance à J+3, briefing à J+7).
- **Q6 — avant toute publication.** Le workflow d'erreur commun (L12) à brancher ; la section « Lectures de n8n sur le serveur Oracle » du
  registre des traitements (plan, l.146-148) ; la durée de garde des exécutions (032-010, F1 : succès non sauvés ou purge resserrée,
  données masquées) ; la preuve d'une lecture réelle par « Supabase account » ; puis le « go » de Benj.
- **Q7 — le lanceur et le bac à sable.** (1) Défaut proposé : inscrire `briefing-n8n-qa` dans `SUITES` de `scripts/tout-verifier.mjs`
  (L11, session principale ; je n'ai pas le droit d'y toucher) ; (2) le laisser hors lanceur, dans `HORS_LANCEUR` avec sa raison. Le bac à
  sable : 032-016 a rendu TIENT ; ce juge en reprend la construction, durcie (liste blanche des globaux, horloge, `import()` noté grâce à
  `--experimental-vm-modules`). Proposition : un module commun `scripts/lib/bac-a-sable-n8n.mjs` partagé par les deux juges, après un
  audit distinct de ce durcissement.

## À reporter au vault (tâche de périmètre `SaaS/…`)

- `10 Presti/…` (note de session) : `presti-briefing-matin` existe dans le n8n d'Oracle (`xPIDCvkp8Gk08A2E`), inactif, 7 h 30, voie (a),
  défaut Q1 l'argent qui dort d'abord ; son juge `briefing-n8n-qa` compare n8n à la vraie chaîne de l'app (fonctions pures importées).
- Méthode n8n : un nœud HTTP qui suit un nœud à plusieurs éléments tourne une fois par élément (utile pour lire par paquets, comme l'app) ;
  un nœud qui rend zéro élément arrête la chaîne : un paquet de repli (`00000000-0000-0000-0000-000000000000`) et `alwaysOutputData`.
- Méthode des juges : l'instant d'un passage vient du `timestamp` du déclencheur, jamais de `$now` ; le juge refuse `Date.now`,
  `new Date()` et `Intl` sans date dans le bac à sable. Sans `--experimental-vm-modules`, un `import()` dans un contexte vm est rejeté sans
  que le juge le voie.
- Le résultat du MCP n8n ne s'écrit pas seul sur le disque : un export « tiré par le MCP » est une recopie ; le recouper par
  `n8n export:workflow` dans le conteneur avant un audit.

## Audit distinct requis avant toute publication

Un agent qui n'a écrit ni ce workflow ni son juge doit relire l'export, le juge et ce résumé (modèle : 032-016), puis épingler les
empreintes s'il les tient pour sûres.
