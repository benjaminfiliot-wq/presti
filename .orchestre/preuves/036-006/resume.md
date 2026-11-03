## Ressources utilisées

Session : hôte d'agents Oracle, sans écran, modèle Sonnet 5.5. Inventaire fait avant de produire : outil Skill, MCP `cerveau` (copie du vault du 02/11, lecture seule), MCP `n8n-oracle` (n8n local d'Oracle),
sous-agents. Les skills de design, de vidéo et de pages ne servent pas ce domaine et n'ont pas été chargés ; `ecc:security-review` et `presti-audit-attaque` n'ont pas été invoqués comme outils
(aucun diff applicatif : `app/**`, `lib/**`, `supabase/**` intouchés) ; leurs points ont été appliqués à la main sur le diff de ce lot (voir « Sécurité »).

- **Skill `reseau-neuronal`** : chargé en premier ; il impose `regles_pour`, puis `chercher`, puis `lire`, et interdit d'écrire dans le vault. Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** : `regles_pour` (« agents, n8n, Gmail, données client, envoi automatique : demande d'avis client, réponse à un avis Google négatif, rappel d'entretien ») rend `[]` ; `chercher`
  (« avis Google réponse avis négatif artisan Business Profile ») a rendu la décision 3 du plan (`presti/plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`), le § 0.4 du prompt 6
  (`presti/plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`), la fiche de la vidéo du 02/11 (`presti/plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`, section 11)
  et deux notes du vault de l'été (`vault/Problemes/Probleme-avis-google.md`, `vault/Recherche/Liste-finale-problemes-2026-08-05.md`). Effet : la règle « un avis négatif ne part jamais sans l'artisan », la
  liste du bloc « Review Response » (lecteur, rédacteur, Approval Desk, Reply Poster, Fake Review Flagger) et le choix de ne construire **que** ce qui n'a pas besoin de Google.
- **Le prompt 6, `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`** : lu aux lignes 228-262 (partie 0.4, « Les vrais outils : les connecteurs », format de la fiche en neuf champs, ligne
  « Fiche Google de l'entreprise ») ; le reste de ses 696 lignes n'a pas été relu pour ce lot, le plan de 036-000 en reprend la substance et c'est lui qui fait foi (consigne de la tâche). Effet : la fiche
  `connecteurs/fiche-google.md` suit les neuf champs de p6 § 0.4 ; l'autorisation vit dans Supabase chiffrée (décision 1).
- **La première réponse, `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`** : lue en entier (§ 1 à 5). Effet : la ligne 036-006 du § 4 (critère de sortie : « avis négatif jamais publié ; demande d'avis sans
  consentement refusée ; STOP coupe tout »), le tableau Studio / Signature du § 3.3 (lignes 304-305 : demande d'avis, rappel d'entretien et réponse à un avis = carte, toujours), les décisions 3 (l'API des avis)
  et 4 (SMS préparé, STOP, consentement), A18 et B8 du § 2.
- **`.claude/rules/*.md`, `CLAUDE.md`** : `architecture-outils.md` (n8n-first, aucun identifiant créé par un agent), `securite.md` (pas d'envoi, pas de demande à un tiers, pas de secret), `autonomie-abonnements.md`
  et `lib/plans.ts` (Studio prépare, Signature envoie seul ; `crm` est Signature seulement, `assistant` Studio et Signature : relus au code par le juge, règle K2), `migration-production.md`.
- **Le code lu, jamais modifié** : `lib/apresChantier.ts` (avis à J+2, désactivé par défaut, textes par défaut, équipements, `propositions`), `lib/apresChantierTour.ts` (20 rappels par passage),
  `lib/pilote/regles.ts` (`OUTIL_TYPE`, `OUTILS_EXECUTABLES_PILOTE`, `MOTS_ESCALADE_TOUJOURS`), `lib/sms/lien.ts` et `lib/sms/encodage.ts` (STOP, GSM-7, un segment, ni lien, ni montant, ni menace),
  `lib/plans.ts`, `lib/crm/rappels.ts`. Le juge les **charge** (sous-processus avec le chargeur TypeScript) au lieu de les recopier.
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`** (section 11, l.363-372 : « Review Response », « Approval Desk » avant « Reply Poster », « Fake Review Flagger », demande d'avis par un canal
  consenti « si le client y consent ») : c'est la forme du département. Les autres sources vidéo (`fiches-videos.md`, `plans/analyse-videos.md`, `docs/connaissance-videos/`) ne portent pas sur les avis et n'ont pas été relues pour ce lot.
- **MCP `n8n-oracle`** : `get_workflow_sdk_reference` (règles de construction), `get_workflow_best_practices` (`human_in_the_loop` : « pas de documentation détaillée » ; `triage` : règles d'abord, sortie de secours, jamais
  un abandon silencieux — d'où la sortie « faux » de « Des avis à répondre ? »), `search_nodes` (le nœud `Google Business Profile` existe, ressource `review`, opérations `getAll`, `get`, `reply`, `delete` : décrit dans la fiche,
  jamais posé), `create_workflow_from_code` (×3), `update_workflow` (le chef complété en place, ×7 ; appelants en liste), `test_workflow` (le banc et le chef, données épinglées), `get_workflow_execution`,
  `get_workflow_details` (les exports). Aucun `publish_workflow`, aucun identifiant. `validate_workflow` et `get_node_types` n'ont pas été appelés : les programmes réutilisent les gabarits de 036-003, validés à la création.
- **Les gabarits de 035-003, 035-005, 036-001 et 036-003**, relus et réutilisés tels quels : `codeEntree` / `codeSortie` / `CODE_BILAN` (importés de `.orchestre/preuves/035-003/construire.mjs`), `reglagesEnfant`
  (036-003), la structure du juge `scripts/boite-n8n-qa.mjs` (exécuteur `node:vm`, mutants), la fiche `connecteurs/imap.md` (format de la fiche), le squelette `presti-dep-apres` de 036-001 (identifiant gardé, donc
  le Cerveau l'appelle toujours). Les juges `lib-socle-n8n-qa`, `lib-metier-n8n-qa`, `lib-relance-n8n-qa`, `apres-chantier-n8n-qa` et la garde `n8n-specs-qa` sont rejoués.

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Rôle | Appelants permis |
|---|---|---|---|
| `lib-avis-lire` | `ScpXQIH54wmmuuel` | lecteur d'avis (épinglé : l'avis est collé par l'artisan) : négatif ou positif, faux avis signalé, un avis n'entre qu'une fois | `presti-dep-apres`, `presti-banc-apres` |
| `lib-avis-repondre` | `OW7vXn4aPzSYoSdm` | rédacteur et « bureau d'approbation » : **tout avis devient une carte**, brouillon revalidé, rien n'est publié | idem |
| `presti-dep-apres` | `L3GOS7euxi60jCZN` | le chef (squelette de 036-001 **complété sur place**) : demande d'avis par canal consenti (carte de lot), rappel d'entretien proposé, lecture des avis, cartes de réponse | `presti-cerveau`, `presti-banc-apres` |
| `presti-banc-apres` | `Dl8vjXWu71r7q0Fs` | banc : cinq cas fictifs | aucun (`none`) |

Chaque enfant : *Execute Workflow Trigger* → « Contrat d'entrée » (gabarit 035-003, contrat **sans contact** : une adresse ou un numéro dans un avis fait rejeter l'entrée) → « Entrée conforme ? » → « Porte simulation »
→ logique → « Contrat de sortie » (seul nœud final) ; hors simulation, « Hors simulation : non branché » arrête tout. Le chef : Contrat → Porte → « Demandes d'avis et rappels d'entretien » → « Préparer la lecture des avis » →
`lib-avis-lire` → « Des avis à répondre ? » (faux : directement à l'assemblage) → « Préparer les réponses aux avis » → `lib-avis-repondre` → « Assembler le département » → Contrat de sortie. Réglages de tous :
`errorWorkflow` = `lib-erreur-commune` (`yekMM9ewk03F9y2q`), `Europe/Paris`, succès non sauvés, délai 120 s. **Aucun nœud réseau, aucun nœud Supabase, aucun nœud d'envoi, aucun nœud Google** ; les lectures sont les données de l'appel,
les écritures partent dans `effets_prevus`, jamais faites.

Fichiers : 4 exports `*.workflow.json` (rendus par `get_workflow_details`, rapatriés sans retouche par `rapatrier.mjs`, qui suit les réponses que le harnais range dans un fichier), `empreintes-code.json` (R19), `essais-n8n.json`,
`construire.mjs` (la fabrique : contrats, nœuds Code, fixtures, programmes SDK, opérations du chef), `apres-reputation-n8n-qa.txt` (la sortie du juge), `plans/011-cadrage-01-11/p6-signature/contrats/apres.json`,
`plans/011-cadrage-01-11/p6-signature/connecteurs/fiche-google.md`, `scripts/apres-reputation-n8n-qa.mjs`.

## Ce que fait chaque workflow, en quelques phrases

- **`lib-avis-lire`** : classe chaque avis **négatif** (note de 3 ou moins, **ou** un mot de litige — 18 mots dont chacun est vérifié dans le vrai `MOTS_ESCALADE_TOUJOURS` —, ou un mot de l'artisan) ou **positif** ;
  **signale** (jamais n'accuse, jamais n'écarte) un avis suspect : client inconnu de l'artisan, texte identique à un autre, trois avis de même note en moins de deux heures ; une provenance inconnue (`null`) n'est pas un soupçon ;
  un avis n'entre qu'**une fois** (clé `av:<source>:<réf>`, relue dans `deja_vus`) ; un avis ou une ligne d'un autre compte fait tout refuser ; interrupteur coupé : il se tait. Les négatifs passent en premier.
- **`lib-avis-repondre`** : pour **tout** avis — négatif, positif ou suspect — une carte `reponse_avis` dont `publication` vaut `apres_clic_artisan`, de priorité haute pour un négatif, avec le brouillon du modèle **épinglé**
  (`claude-haiku-5-5`, jamais appelé) **revalidé** : ni « Presti » (quelle que soit la casse), ni lien, ni montant, ni promesse de remboursement ou de geste commercial, ni le nom du client, entre 20 et 900 caractères, et la
  porte de conformité doit avoir **accepté** (illisible vaut refus). Un brouillon refusé laisse la carte sans brouillon : l'artisan écrit lui-même. Un avis suspect : pas de brouillon, `si_suspect: a_signaler_a_google_par_l_artisan`.
  Studio et Signature préparent **exactement la même carte** (vérifié) : aucun effet de publication n'existe dans le workflow.
- **`presti-dep-apres`** — *demande d'avis* : refait **à l'identique** `propositions` de `lib/apresChantier.ts` (J+2, rattrapage de 14 jours, désactivé par défaut, 20 propositions par passage), puis filtre par le **consentement**,
  fail-closed : opposition, STOP, litige en cours, ou une lecture illisible (`null`) = exclu ; e-mail connu du client, ou SMS consenti (lien `sms:` préparé, `lib/sms/lien.ts:10`, étape gratuite) ; texte par défaut du code,
  texte SMS conforme à `lib/sms/encodage.ts` (STOP, GSM-7 pur, un segment) ; **10 par jour et par compte**, le reste « reporté à demain ». Une seule **carte de lot** (`lot-avis:<jour>`) qui dit qui reçoit et qui est exclu et pourquoi ;
  pas de carte s'il n'y a aucun destinataire. Exigée : la capacité `crm` (Signature seulement, comme le passage quotidien). *Rappel d'entretien* (B8) : la **date est proposée** (`date_proposee`, l'anniversaire de
  l'équipement : chaudière 12 mois, pompe à chaleur 24, conduit de fumée 12) dans une carte « À valider », jamais envoyée seule. *Avis* : appelle les deux spécialistes (capacité `assistant`, Studio et Signature).
  *Garde finale* : un effet hors de la liste fermée (`preparer_carte_lot`, `preparer_carte`, `noter_evenement`) fait tout refuser. *Le Cerveau (036-001) n'envoie pas encore la configuration* : le chef se tait (`config_absente`) —
  voir « Points pour Benj ».

## Comparaison à l'ancien code (pas 3 de `migration-production.md`) — extraite de la sortie du juge

| cas | `lib/apresChantier.ts` | `presti-dep-apres` | verdict |
|---|---|---|---|
| toutes les fixtures, avis et entretien | 10 proposition(s) | 10 | identique |
| rappels déjà posés par le passage quotidien | 8 | 8 | identique |
| avis seulement / entretien seulement / tout désactivé | 8 / 2 / 0 | 8 / 2 / 0 | identique |
| activation le jour même (pas de rattrapage) | 10 | 10 | identique |
| chaudière ancienne : prochain anniversaire à venir | 1 | 1 | identique |
| pompe à chaleur : tous les deux ans | 1 | 1 | identique |
| ramonage fini un 29 février : fin de mois | 1 | 1 | identique |
| chantier non terminé / fini demain / équipement de plus de trois ans | 0 / 0 / 0 | 0 / 0 / 0 | identique |

Aucun écart déclaré : les propositions (clé, type, échéance) sont celles du code, cas par cas. **Ce que le chef ajoute au code** (et que le juge vérifie séparément) : le filtre de consentement, la carte de lot,
le plafond de 10 par jour au niveau du lot, les cartes de réponse aux avis. Le passage quotidien (`app/api/cron/relances`) **reste en place** ; les clés `avis:<chantier>` et `entretien:<chantier>:<n>` sont les mêmes que les siennes,
donc les deux coexistent sans doublon (le chef ne propose pas ce que le cron a déjà posé : cas « rappels déjà posés »). Pas 4 (retirer l'appel du cron) et pas 5 (drapeau) : à Benj, non faits.

## Les essais n8n (`test_workflow`, données épinglées) — `essais-n8n.json`

| Workflow | Exécution | Ce qui est épinglé | Ce qui est relu |
|---|---|---|---|
| `presti-banc-apres` | #578 (succès) | le déclencheur, et les sorties de `presti-dep-apres` aux cas 4 et 5 | `lib-avis-lire` (7 avis mêlés : 3 négatifs, 3 suspects), `lib-avis-repondre` (négatif en Signature, positif en Studio), bilan sans défaut |
| `presti-dep-apres` | #582 (succès) | le déclencheur (l'enveloppe du cas complet) | les six nœuds du chef et les appels **réels** aux deux spécialistes |

Ces sorties sont **identiques** au rejeu hors ligne de l'export par le juge (règles N1 et P1). **Une limite que n8n impose, et qui ne vient pas du lot** : un sous-workflow inactif ne peut pas appeler un autre sous-workflow
dans un essai (« Workflow is not active and cannot be executed » à deux niveaux) ; le banc ne peut donc appeler le chef que si le résultat du chef est épinglé — c'est le même contournement que 036-001 (règle P1). Le chef,
lui, est essayé directement : ses deux appels aux spécialistes sont réels. Essais écartés, joués avant une correction puis rejoués : #527 et #533 (banc : le chef y était appelé sans épingle, ce que n8n refuse à deux niveaux), #574 (chef, avant le réglage
« un échec d'enfant ne fait pas échouer le département » ajouté aux deux nœuds d'appel).

## Ce que le juge prouve — `scripts/apres-reputation-n8n-qa.mjs` (sortie complète : `apres-reputation-n8n-qa.txt`)

Hors ligne, sans réseau, sans base, sans modèle. Contrôles : **S** structure (inactif, aucun identifiant, **aucun nœud réseau, d'envoi ni Google Business Profile**, réglages, appelants, gabarit de 035-003 à l'identique,
chaque nœud Code égal à `construire.mjs`) ; **C** le contrat rejoué (hors contrat = rejet, hors simulation = arrêt, adresse ou numéro dans un avis = rejet) ; **L** le lecteur ; **R** le rédacteur ; **K** le vrai code
(`demander_avis` et `envoyer_rappel_entretien` typés `assistant_client` mais **non exécutables** par le pilote ; **aucun type « réponse à un avis »** dans la liste fermée ; `crm` Signature seulement, `assistant` Studio et Signature ;
constantes, équipements et règles SMS égaux à ceux du code) ; **D** le chef (propositions, consentement, plafond, entretien, offre, interrupteurs, autre compte, effets permis, idempotence, bout en bout) ; **P / N** les rejeux.

**36 mutants, 36 rouges, chacun pour sa raison.** Les six demandés : un avis négatif publié (deux mutants : la publication devient automatique ; un effet de publication Google ajouté) → R1 ; une demande d'avis sans consentement → D2 ;
un STOP ignoré → D2 ; un faux avis non signalé (deux mutants) → L5 et L1 ; « Presti » dans la réponse → R3 ; un avis d'un autre compte (trois mutants : lu, répondu, chantier) → L4, R4, D8. Et, entre autres : une opposition ignorée,
un litige ignoré, une **opposition illisible acceptée** (la lecture en erreur ne vaut plus refus), un seuil de note abaissé, le plafond de 10 oublié, le CRM non exigé, un rappel d'entretien qui part seul, le SMS sans STOP,
l'interrupteur ignoré, la garde finale élargie, le workflow publié, un identifiant, **un nœud Google ajouté**, un enfant appelable par tous, les gabarits de contrat affaiblis, un octet changé.

Rejeu : `node scripts/apres-reputation-n8n-qa.mjs` (code 0). Les juges existants restent verts : `lib-socle-n8n-qa` (35/35), `lib-metier-n8n-qa` (35/35), `lib-relance-n8n-qa` (54/54), `apres-chantier-n8n-qa`, `n8n-specs-qa` sur ce dossier
(R1 à R20 tenues pour `lib-avis-lire` et `lib-avis-repondre`, R1 à R7 pour le chef et le banc).

## La demande d'accès à l'API Business Profile — RÉDIGÉE, NON ENVOYÉE (geste réservé à Benj)

> Formulaire visé : « Application for Basic API Access » de Google Business Profile (nom relevé dans la décision 3 du plan ; la page et les champs exacts sont à ouvrir par Benj depuis le compte propriétaire du projet Google Cloud
> de Presti — je n'ai pas pu les lire). Texte en anglais, prêt à coller. **Les crochets sont à remplir par Benj** ; rien d'autre n'a été inventé. Aucun envoi n'a été fait, aucun compte ni projet créé.

**Project / Projet** — Google Cloud project number: `[à remplir]` · Project ID: `[à remplir]` · Business Profile APIs enabled: `[oui, après l'approbation]`.

**Applicant / Demandeur** — Company: Presti `[raison sociale exacte à remplir]` · Website: https://prestiapp.fr · Contact: `[e-mail professionnel de Benj, à remplir]` · Role: owner / developer.
Pages to attach: privacy policy and terms of service of prestiapp.fr `[URL exactes à remplir]`.

**What the product is** — Presti is a French SaaS for tradespeople (plumbers, electricians, builders…). Each customer is a single self-employed craftsman or a very small company who owns **one** Business Profile.
Presti helps them answer their customers' requests, quote, invoice and follow up after a job. Presti is **not** an agency and does not manage third parties' profiles: every connected profile belongs to the
craftsman who signs in and grants access himself.

**Use case 1 — Read the reviews of the craftsman's own location.** After the craftsman connects his Google account (OAuth, scope `business.manage`, consent screen shown to him), Presti reads the list of reviews of the one location he chooses,
four times a day, to show them in his dashboard and to prepare a draft reply. Read-only at first.

**Use case 2 — Publish a reply, only when the craftsman clicks.** A reply is drafted for the craftsman. It is **never** published by Presti on its own: each reply appears as a card "to validate"; the craftsman reads it, edits it,
and publishes it with one click. A **negative review (3 stars or less, or a dispute) is never answered without him**, whatever the plan he pays for. We do not post replies in bulk and do not post to locations that are not his own.

**What we do not do** — We do not create, edit or delete reviews; we do not ask for or sell reviews; we do not gate reviews (we ask every customer who has consented, whatever the likely rating); we do not use review content to train models;
we do not share review data with third parties; we do not report a review to Google on the craftsman's behalf (a review that looks fake is only flagged to him, and he decides). We do not store the reviewer's contact details.

**Volumes (design figures, to be confirmed by Benj before sending)** — Locations at launch: `[1 — le compte pilote de Benj ; à confirmer]`; year-one ceiling: `[à décider par Benj]`. Read calls: one per connected location every 6 hours (4 per day).
Write calls: at most one per review, and only after the craftsman's click. No polling faster than every 6 hours; no background job writes to a profile.

**Data handling** — Tokens are stored encrypted (AES-256-GCM) in a European (EU) database, decrypted in memory only when a call is made, and erased when the craftsman disconnects. Reviews are stored per account with row-level security.
The craftsman can disconnect at any time from his dashboard and can revoke access from his Google account.

*Note de Claude Code pour Benj* : la phrase sur la « portée `business.manage` » et les 6 heures sont des choix de conception, pas des exigences relevées chez Google ; remplacer tout point que la page du formulaire contredit.
Si le formulaire demande un nombre d'établissements, ne mettre que celui que vous pouvez soutenir (« aucun chiffre non sourcé »).

## Les décisions du plan appliquées (défauts)

- **Décision 3** : la demande d'accès est rédigée ci-dessus ; l'entrée des avis est l'avis collé ; rien n'est lu ni publié sur la fiche ; un avis négatif est toujours une carte ; un avis positif aussi, tant que Benj n'a pas ajouté ce
  type à la liste fermée (le juge rougit si quelqu'un l'y met — K1).
- **Décision 4** : la demande d'avis par SMS est un **lien `sms:` préparé** (texte avec STOP, sans lien ni montant, un segment) ; aucun SMS ne part sans consentement du client ; un STOP coupe tout ; l'envoi par fournisseur reste fermé.
- **Décisions 1, 2 et 5** : l'autorisation Google vivra chiffrée dans Supabase (fiche) ; ce lot ne pose aucun rendez-vous (pas concerné).

## Points pour Benj (rien n'est fait, rien n'est bloquant)

1. **Envoyer la demande d'accès** (texte ci-dessus) et compléter les crochets — compte, geste réservé.
2. **La demande d'avis n'est offerte que par `crm` (Signature seulement)** : c'est ce que fait le passage quotidien aujourd'hui (`lib/apresChantierTour.ts`). Le tableau du plan (`premiere-reponse.md:304`) parle de « Studio : carte ». Si Studio doit
   aussi demander des avis, il faut ajouter une capacité à `lib/plans.ts` ; le chef et son juge (K2, D6) suivent le code, ils ne décident pas de l'offre.
3. **Aucune capacité « avis » n'existe** dans `lib/plans.ts` : la lecture et la réponse aux avis sont portées par `assistant` (Studio et Signature) en attendant. Une capacité propre (et un drapeau `lib/flags.ts`) est à créer
   quand l'écran naîtra (lot 036-011).
4. **Le Cerveau (036-001) n'envoie pas encore** la configuration du chef (offre, capacités, interrupteurs, réglages `crm_apres_chantier`, chantiers sans coordonnées, clés déjà posées, avis) : ses constructeurs `CONFIG.apres` et
   `DONNEES.apres` sont à écrire au lot 036-012 (le contrat dit quoi lire : `contrats/apres.json`, `ce_que_le_cerveau_doit_ajouter`). D'ici là, le chef se tait — c'est testé (D7).
5. **Les cartes à écrire** : un effet `preparer_carte_lot` / `preparer_carte` est une intention. La carte réelle (`assistant_actions`, `lib/assistant/cartes.ts`) devra enregistrer la clé du chef (`avis:<chantier>`, `entretien:<chantier>:<n>`,
   `ra:<avis>`) pour que la lecture suivante la voie : sans cela, le chef reproposerait. Le juge le vérifie sur les entrées (D10), pas sur la base.
6. **La garde `n8n-specs-qa`** ne connaît pas le nœud Google : à amender (tâche dont le périmètre la contient) le jour de la connexion — voir `fiche-google.md`.
7. **La seconde migration, la pause générale, les oppositions** : les drapeaux de consentement (`opposition`, `stop`, `litige_en_cours`, `sms_consenti`, `email_connu`) viennent de lectures à écrire (vue étroite à naître, avec la table
   d'oppositions de `0186_sms_clients.sql:101` et `crm_apres_opposition` de `0171`) ; tant qu'elles ne sont pas lisibles, la valeur est `null` et le chef **exclut** (fail-closed).

## Sécurité (points de `security-review` et de `presti-audit-attaque`, appliqués à la main sur ce diff)

Aucun secret (aucun jeton, aucune clé, aucun identifiant dans les exports ; les chaînes sont fictives, « Exemple. ») · aucune donnée réelle (aucune adresse, aucun numéro : le contrat « sans contact » les refuse) · isolation par compte
(`artisan_id` contrôlé sur chaque avis, chantier, ligne lue ; test « autre compte » à chaque étage) · rien n'est envoyé ni publié (aucun nœud d'envoi, aucun nœud Google, effets permis = trois cartes/notes) · white-label (« Presti »
refusé dans chaque réponse, vérifié sur tout le texte des cartes) · pas d'accusation (un faux avis est signalé à l'artisan, jamais écarté ni publié comme tel) · pas de texte client dans les faits de l'événement (`faits_sans_texte`).
