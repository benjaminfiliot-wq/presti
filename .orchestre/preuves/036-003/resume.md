## Ressources utilisées

Session : hôte d'agents Oracle, sans écran, modèle Sonnet 5.5. Inventaire fait avant de produire : outil Skill, MCP `cerveau` (copie du vault du 02/11, lecture seule), MCP `n8n-oracle`
(n8n local d'Oracle), sous-agents. Les skills de design, de vidéo et de pages ne servent pas ce domaine et n'ont pas été chargés.

- **Skill `reseau-neuronal`** : chargé en premier ; il impose `regles_pour`, puis `chercher`, puis `lire`, et interdit d'écrire dans le vault. Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** : `regles_pour` (« agents, n8n, boîte mail IMAP/SMTP, données client, envoi automatique ») rend `[]` ; `chercher` a rendu la ligne 036-003 du plan, le registre des
  traitements (`docs/registre-traitements.md`, § 22 : la relève de la messagerie, finalité et données), l'audit de fiabilité (3.12 : l'index des messages n'est pas unique) et
  la note de mémoire sur la messagerie de l'entreprise. Effet : la décision de ne pas faire confiance à l'index existant pour « une seule fois » (clé d'événement par compte,
  et contrainte unique demandée dans le geste de Benj), et la règle de ne jamais mettre de texte de client dans un fait (`faits_sans_texte`, `0185_automatisation.sql:51-59`).
- **Le prompt 6, `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`** : § 0.4 (les connecteurs, le format de la fiche en neuf champs : portées, lecture,
  écriture, autorisation, retrait, expiration, quotas, coût, test), § 0.6 (les règles qui ne bougent pas : n8n-first, white-label, idempotence, mode à blanc), p6:279-285
  (« tout message arrive d'abord dans la plateforme »). Effet : le dépôt dans la conversation avant tout, la fiche `connecteurs/imap.md`, la mention d'IA et le Reply-To de l'artisan.
- **La première réponse, `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`** : § 3.2 (Accueil : `lib-boite-lire`, `lib-boite-brouillon`), § 3.3 (le tableau Studio / Signature,
  vérifié au fichier:ligne), § 4 (ligne 036-003 et ses critères de sortie), § 5 décisions 1 et 2 (autorisation chiffrée dans Supabase déchiffrée par n8n à l'exécution ; IMAP/SMTP d'abord).
  Effet : le contrat des trois enfants, les cinq issues de connexion, le nœud réel renvoyé au geste de Benj (un nœud Code avec `imapflow` ne passe pas la garde R19).
- **`.claude/rules/*.md`, `CLAUDE.md`, `.orchestre/contexte.md`** : `architecture-outils.md` (n8n-first, aucun identifiant créé par un agent), `securite.md` (pas de secret, pas d'envoi),
  `migration-production.md` (les cinq pas : seuls les pas 1 à 3 sont faits), `autonomie-abonnements.md` et `lib/plans.ts` (Studio prépare, Signature envoie seul : les capacités
  `plateforme.ia.auto` et `assistant.pilote` sont relues au code par le juge).
- **Le code lu, jamais modifié** : `lib/releveCanal.ts` (comportement refait, constantes et textes comparés, `estUneVraieDemande` extraite et exécutée par le juge), `lib/canaux.ts`,
  `lib/secretBox.ts`, `lib/hoteSur.ts` (règles SSRF reprises dans la fiche), `lib/mailLite.ts`, `lib/email.ts:6-11`, `lib/mentionAssistant.ts` (texte de la mention comparé au code),
  `lib/pilote/regles.ts` (10 minutes, 20 par jour, 24 h), `app/api/canaux/relever/route.ts:9-25`, `supabase/migrations/0174`, `0185`, `0193`.
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (« Ce qu'il faut retenir », l.17-49) : publier les enfants avant le parent (point 2), un seul nœud final (3), workflow
  d'erreur désigné dans chaque workflow (5), idempotence = clé unique en base (6), « Supabase account » passe outre la RLS donc un filtre par compte et un test « autre compte »
  (8), n8n ne garde pas les données des succès (9). **`fiches-depots.md`** (gabarits) et **`fiches-videos.md`** § 5 (l.930-951 : l'alerte d'un workflow en panne signalée, une règle avant tout
  modèle, l'escalade humaine) ; **`fiches-videos-restructureai.md`** :41 (« une exception arrive préparée : brouillon, montant calculé par le code ») : c'est la forme du brouillon de Studio.
- **MCP `n8n-oracle`** : `get_workflow_sdk_reference` (règles de construction), `get_workflow_best_practices` (`scheduling` : un passage plus court que l'intervalle, d'où un délai de 240 s
  pour 300 s ; `notification` ; `triage` ; `human_in_the_loop` sans documentation), `search_nodes` (le nœud *Email Send* existe, pas de nœud IMAP par compte), `get_node_types` (*Send Email* v2.1 :
  `appendAttribution`, `replyTo`), `validate_workflow` (le nœud désactivé et la porte), `create_workflow_from_code` (×5), `update_workflow` (appelants en liste ; trois corrections de code), `test_workflow`
  (banc et parent, données épinglées), `get_workflow_execution`, `get_workflow_details` (les exports). Aucun `publish_workflow`, aucun identifiant.
- **Les gabarits de 035-003 à 035-005 et 036-001**, relus et réutilisés tels quels : `codeEntree`, `codeSortie`, `CODE_BILAN` (importés de `.orchestre/preuves/035-003/construire.mjs`), le SHA-256
  écrit à la main, l'exécuteur `node:vm` de `scripts/lib-metier-n8n-qa.mjs`, et le registre d'empreintes de la garde. Les juges `lib-socle-n8n-qa`, `lib-metier-n8n-qa`, `lib-relance-n8n-qa` sont rejoués.
- **Sécurité** : `ecc:security-review` et `presti-audit-attaque` n'ont pas été invoqués comme outils (aucun diff applicatif : `app/**`, `lib/**`, `supabase/**` intouchés) ; leurs points ont été appliqués
  à la main sur le diff de ce lot : aucun secret en sortie (L6), isolation par compte (L4), SSRF du futur nœud réel (fiche), pas de « Presti » vers un client (B3, E1).

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Rôle | Appelants permis |
|---|---|---|---|
| `lib-boite-lire` | `cQqfkVseZU2Ax0xQ` | refait `releverCanal` ; dépose chaque message une fois dans la conversation du client | `presti-boite`, `presti-banc-boite` |
| `lib-boite-brouillon` | `zw2k0vo9wpv7lNfr` | Studio : APPEND dans Brouillons, `\Draft`, jamais envoyé | idem |
| `lib-boite-envoyer` | `UkMVpSxETSIY4Mku` | Signature : SMTP (nœud **désactivé**), conditions du pilote relues | idem |
| `presti-boite` | `yQK50I6JXchYBH7Y` | toutes les 5 minutes : classe le travail dû, appelle les trois enfants, bilan | aucun (`none`) |
| `presti-banc-boite` | `tNEvzy2enkNF41z2` | banc : cinq cas fictifs | aucun (`none`) |

Chaque enfant : *Execute Workflow Trigger* → « Contrat d'entrée » (gabarit 035-003, schéma de `contrats/boite.json`) → « Entrée conforme ? » → logique → « Porte simulation » → « Contrat de sortie »
(seul nœud final) ; hors simulation, « Hors simulation : non branché » arrête tout. `lib-boite-envoyer` met la logique **avant** la porte et le SMTP désactivé **après** sa seule sortie « faux ». Réglages de tous :
`errorWorkflow` = `lib-erreur-commune` (`yekMM9ewk03F9y2q`), `Europe/Paris`, succès non sauvés, délai 120 s (parent 240 s). Aucun nœud réseau, aucun nœud Supabase, aucun identifiant.

Fichiers : 5 exports `*.workflow.json` (rendus par `get_workflow_details`, rapatriés sans retouche par `rapatrier.mjs`), `empreintes-code.json` (20 empreintes de nœuds Code, R19), `essais-n8n.json`,
`construire.mjs` (la fabrique : nœuds Code, contrats, fixtures, SDK), `plans/011-cadrage-01-11/p6-signature/contrats/boite.json`, `plans/011-cadrage-01-11/p6-signature/connecteurs/imap.md`,
`scripts/boite-n8n-qa.mjs`.

## Ce que fait chaque workflow, en quatre phrases

- **`lib-boite-lire`** : porte les règles de tri de `releverCanal` (expéditeur automatique, envoyé à soi-même, texte trop court, newsletter courte, plafond de 40, fenêtre de 7 jours, conversation de 30 jours) ;
  un message n'est déposé qu'**une fois par compte** (clé `bm:` + SHA-256 du compte et du `Message-ID`), dans **une seule conversation par client** quel que soit le canal — l'état est partagé entre
  deux boîtes du même passage —, avec `canal_origine`. Sorties : `creer_conversation`, `deposer_message`, `noter_evenement` (`demande_recue`, sans texte libre), `maj_canal`, `maj_connexion`. Jeton ou mot de passe
  refusé : **le département se tait**, `maj_connexion` → `erreur` + motif, **une** alerte `lib-alerter`, statut `ok` ; connexion déjà en erreur : rien lu, rien dit ; serveur injoignable : disjoncteur, pas d'alerte.
- **`lib-boite-brouillon`** : refuse si la porte de conformité n'a pas accepté (une lecture illisible vaut refus), s'il y a opposition, si la connexion n'est pas `active`, si l'interrupteur est coupé ; sinon un `ajouter_brouillon_imap`
  (message RFC 822 complet, en-têtes sans retour à la ligne, corps en base64, `From` au nom de l'artisan, sans « Presti » même sans nom). **Aucun effet d'envoi n'existe dans ce workflow.**
- **`lib-boite-envoyer`** : exige l'offre (`plateforme.ia.auto` **et** `assistant.pilote`), le mode « auto », le pilote actif, le type `reponse_prospect` activé, l'action `a_partir` préparée il y a ≥ 10 minutes
  et arrivée à l'heure (< 24 h), le plafond du jour **partagé dans le passage**, la conformité, l'absence d'opposition, la connexion active ; sinon l'action repasse en carte (`marquer_action` → `manuel`).
  Texte = celui de `avecMentionAssistant`, adresse de l'artisan en réponse. En simulation `effets_faits` reste vide.
- **`presti-boite`** : toutes les 5 minutes (`minutesInterval: 5`), lit (épinglé) l'interrupteur général puis le travail dû, route par genre vers les trois enfants (un échec d'enfant ne fait pas échouer le passage),
  réunit les sorties et rend un bilan sans donnée de client. Interrupteur coupé ou illisible : rien n'est appelé.

## La comparaison à `releverCanal`, cas par cas (pas 3 de `migration-production.md`)

Les règles de tri sont celles du **vrai** `lib/releveCanal.ts` : le juge en extrait `estUneVraieDemande`, `AUTOMATIQUE` et `INDESIRABLE`, les exécute, et refuse tout écart non déclaré (ou déclaré à tort).

| cas | releverCanal | n8n (lib-boite-lire) | verdict |
|---|---|---|---|
| un vrai client | 1 importé(s), 1 conv., 0 à part (branche réseaux) | 1 importé(s), 1 conv., 0 laissé(s) au code | identique |
| deux messages du même client dans le lot | 2 importé(s), 1 conv., 0 à part (branche réseaux) | 2 importé(s), 1 conv., 0 laissé(s) au code | identique |
| expéditeur automatique | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| expéditeur « mailer-daemon » | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| envoyé par l'artisan à lui-même | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| texte trop court | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| newsletter courte | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| newsletter longue (400 caractères et plus) | 1 importé(s), 1 conv., 0 à part (branche réseaux) | 1 importé(s), 1 conv., 0 laissé(s) au code | identique |
| sans Message-ID | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| sans expéditeur lisible | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| déjà importé par cette boîte | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| même message déjà importé par l'autre boîte du compte | 1 importé(s), 1 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | E1 — releverCanal garde le Message-ID par boîte (messages.externe_id + canal_id) et le rangerait deux fois ; n8n le garde par compte : « une seule fois » |
| conversation ouverte il y a 10 jours | 1 importé(s), 0 conv., 0 à part (branche réseaux) | 1 importé(s), 0 conv., 0 laissé(s) au code | identique |
| conversation vieille de 31 jours | 1 importé(s), 1 conv., 0 à part (branche réseaux) | 1 importé(s), 1 conv., 0 laissé(s) au code | identique |
| adresse du lead écrite avec des majuscules | 1 importé(s), 1 conv., 0 à part (branche réseaux) | 1 importé(s), 0 conv., 0 laissé(s) au code | E2 — releverCanal compare le contact à la casse près (.eq('contact', …)) et ouvre une seconde conversation ; n8n compare sans la casse |
| message de neuf jours (fenêtre de 7 jours) | 0 importé(s), 0 conv., 0 à part (branche réseaux) | 0 importé(s), 0 conv., 0 laissé(s) au code | identique |
| première relève après une relève de la veille | 1 importé(s), 1 conv., 0 à part (branche réseaux) | 1 importé(s), 1 conv., 0 laissé(s) au code | identique |
| 45 messages (plafond de 40) | 40 importé(s), 40 conv., 0 à part (branche réseaux) | 40 importé(s), 40 conv., 0 laissé(s) au code | identique |
| notification d'un réseau (Le Bon Coin) | 0 importé(s), 0 conv., 1 à part (branche réseaux) | 0 importé(s), 0 conv., 1 laissé(s) au code | identique |
| boîte : identifiants_refuses | « Identifiants refusés — le mot de passe de la boîte a peut-être changé. » | « Identifiants refusés — le mot de passe de la boîte a peut-être changé. » | identique |
| boîte : injoignable | « Connexion à la boîte impossible pour l’instant. » | « Connexion à la boîte impossible pour l’instant. » | identique |
| identifiants illisibles | « Identifiants illisibles — reconnectez la boîte. » | « Identifiants illisibles — reconnectez la boîte. » | identique |

Écarts déclarés (voulus, vérifiés un à un par le juge) :
- **E1** — `releverCanal` garde le `Message-ID` par boîte (`messages.externe_id` + `canal_id`, `lib/releveCanal.ts:163-165`) et rangerait deux fois un message reçu par deux boîtes du même compte ; n8n le garde par compte (« une seule fois »).
- **E2** — `releverCanal` compare le contact à la casse près (`.eq('contact', …)`, `:171`) ; n8n sans la casse : un client dont l'adresse a été saisie avec des majuscules ne reçoit plus une seconde conversation.

Ce que n8n **ne reprend pas** (reste à `releverCanal` tant que le pas 4 n'est pas fait) : la branche des réseaux (Le Bon Coin, LinkedIn…, `lib/releveCanal.ts:117-158`, qui exige la vérification DKIM) — `lib-boite-lire` ne les touche pas
(`laisse_au_code`), ni le calcul de `type_chantier` et de `ville` d'une conversation neuve (`:189-191`), nommés dans l'effet (`a_calculer_par_le_code`).

## Les essais réels dans n8n (`test_workflow`, données épinglées, rien d'écrit)

- `presti-banc-boite` #519 : relève mêlée (3 importés, 5 ignorés dont 1 réseau laissé au code) ; autorisation expirée (`ok`, état `erreur`, alerte) ; brouillon `ok` ; envoi Signature `ok` ; envoi en Studio `refuse` (motif `offre`) ; `defauts: 0`.
- `presti-boite` #509 : deux boîtes du même compte reçoivent le même message — **3 messages déposés pour 4 reçus, 2 conversations** (Marie une seule fois) ; 1 brouillon ; 1 envoi prévu ; 1 ligne hors forme rejetée au Contrat ;
  `effets_faits: 0`, `defauts: 0`.
- Rejeu hors ligne par le juge : identique, sortie par sortie (N1). Essais écartés, joués avant une correction du code puis rejoués : banc #481, #489, #503, #513 ; parent #495.

## Le juge `scripts/boite-n8n-qa.mjs` et ses mutants

Sortie : `OK`, 25 mutants qui rougissent chacun pour sa raison, dont les sept demandés : un message importé deux fois (L2), deux conversations pour le même client (L3), un brouillon envoyé en Studio (B1), un secret dans un journal (L6), un jeton expiré qui fait planter (L5),
« Presti » dans un e-mail au nom de l'artisan (B3, E1), une boîte d'un autre compte lue (L4) ; et : une capacité d'offre non contrôlée, le plafond, le délai de 10 minutes, la mention d'IA, la porte de conformité, le SMTP activé ou branché sur « vrai », un identifiant, un nœud d'envoi
dans le brouillon, un workflow publié, la cadence à 15 minutes, un appelant `any`, le gabarit « Contrat » affaibli, une lecture HTTP, un octet changé dans un nœud Code.

Un juge qui fabrique ce qu'il vérifie ne prouve rien : ses entrées sont les fixtures de `construire.mjs`, ses attentes viennent du code de Presti (chargé ou extrait) ou de règles écrites dans le juge, jamais de la sortie du workflow ; les rejeux exécutent le code **exporté** de n8n.

## Le point qui bloque le `verifier` (question posée)

`node scripts/n8n-specs-qa.mjs .orchestre/preuves/036-003` : les trois `lib-boite-*` tiennent **R1 à R20** ; `presti-boite` et `presti-banc-boite` ne tiennent que R1 à R7 mais la garde les range en « c4 », dont la liste blanche refuse
*Execute Sub-workflow* (R5) : **8 manquements, tous identiques**. Avec `famille()` étendue d'une ligne aux parents du système d'agents (copie en `/tmp/garde036/`, l'original intact), la garde rend OK sur les cinq exports et ses 88
mutants rougissent. `scripts/n8n-specs-qa.mjs` est dans `interdit` : question à options dans `.orchestre/en-cours/036-003.question.md`. 036-001 (`presti-cerveau`) butera sur le même point.

## Le geste d'exploitation préparé pour Benj (jamais fait)

Dans `connecteurs/imap.md` : (1) image des exécuteurs avec `imapflow`, `nodemailer`, `mailparser` et leur liste d'autorisation ; (2) la clé `BOITE_CLE_N8N` générée par Benj ; (3) les migrations `0185`, `0192`, `0193`, puis les drapeaux, et celles à écrire (vue étroite du travail dû,
index unique du `Message-ID`, fonction atomique de dépôt) ; (4) le nœud réel (texte), non exécuté ; (5) les paliers et l'ordre de publication, enfants d'abord ; (6) pas 4 (retirer le cron de relève de `vercel.json`) et pas 5 (drapeau `boiteParN8n`). Plus un deuxième amendement de la garde (R19-bis) au moment du branchement réel.

## Risques et points à valider

1. **Le « une seule fois » ne sera garanti que par une contrainte unique en base** : `messages_externe_idx` n'est pas unique (audit de fiabilité 3.12). Tant que ce n'est pas posé, deux passages qui se chevauchent peuvent déposer deux fois (le cron de 7 h compris).
2. **`type_chantier` et `ville`** d'une conversation neuve : à calculer par le code (endpoint d'écriture ou fonction SQL) ; à trancher avant le premier dépôt réel.
3. **Le SMTP de l'artisan n'est contacté nulle part aujourd'hui** (`lib/hoteSur.ts:6-7`) : sa validation d'hôte reste à écrire avant `lib-boite-envoyer`.
4. **Catégorie d'alerte** : `lib-alerter` n'a pas de catégorie « connexion en erreur » ; `workflow_en_panne` est la plus proche. À ajouter dans un lot qui touche `lib-alerter`.
5. **Texte lu par le nœud réel** : il doit sortir de la même fonction que `lireMail` (`sansCitation`, 8 000 caractères), sinon les seuils du tri divergent.
6. **Le nœud réel n'a jamais tourné** : seuls les workflows en simulation et le juge sont prouvés.
7. Aucun drapeau n'est touché (`lib/flags.ts` hors périmètre) ; le drapeau `boiteParN8n` du pas 5 reste à créer.

## Résultat de la commande `verifier`

Voir `verifier.log`. Vert : `boite-n8n-qa`, `lib-socle-n8n-qa`, `lib-metier-n8n-qa`, `lib-relance-n8n-qa`. Rouge : `n8n-specs-qa`, pour la seule cause ci-dessus.
