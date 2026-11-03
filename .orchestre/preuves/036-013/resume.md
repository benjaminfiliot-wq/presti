## Ressources utilisées

Session : hôte d'agents Oracle, sans écran, modèle Sonnet 5.5. Inventaire fait avant de produire : outil Skill, MCP `cerveau` (copie du vault du 02/11, lecture seule), MCP `n8n-oracle` (n8n local d'Oracle),
dépôts clonés dans `~/agents/depots/`. Les skills de design, de vidéo et de pages (`presti-design`, `frontend-design`, `hyperframes`…) ne servent pas ce domaine : aucune page, aucune vidéo. `presti-audit-attaque` et
`security-review` n'ont pas été lancés comme outils (aucun diff applicatif : `app/**`, `lib/**`, `supabase/**` intouchés) ; leurs points ont été appliqués à la main (voir « Sécurité »).

- **Skill `reseau-neuronal`** : chargé ; il impose `regles_pour`, `chercher`, `lire`, et interdit d'écrire dans le vault ici. Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** : `regles_pour` (« agents n8n, Gmail, WhatsApp, envoi automatique Studio Signature, marque blanche ») rend la seule consigne de Benj de la nuit du 02 au 03/11
  (`memoire-presti/nuit-0311-consignes-benj.md` : les vrais outils, le Cerveau et ses sept départements, tout message dans la plateforme) ; une seconde formulation, plus longue, rend `[]` ; `chercher` rend `OUTILLAGE.md` § 5, `premiere-reponse.md` § 4 et
  `p6-signature-et-sur-mesure-0311.md` § 1.4 (le pilote reste l'exécuteur des envois de Signature). Effet : le découpage « déposer / répondre / envoyer » et le fait que les envois de Signature passent par la file du pilote.
- **`plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md`, en entier** (l.1-219) : O1 (un gabarit, une copie par client), O2 (entrées lues à intervalle, canaux à webhook lus dans les événements), O3 (aucun identifiant),
  O4 (la porte devant chaque effet), O5 (agent sans la main : outils de lecture), O6 (marque blanche), matrice § 5 ligne 1, règles R21 à R23 (§ 8). Effet : l'ensemble de l'architecture.
- **`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`** : § 0.3 (l.176-232, schéma et règles : n8n tire, ne reçoit pas ; le Cerveau route, le chef distribue), § 0.4 (l.234-267, la table des connecteurs
  Gmail, Outlook, WhatsApp, Telegram, SMS), § 0.5 (l.269-285, « tout message arrive dans la plateforme », test « un doublon reçu par deux canaux ne crée pas deux conversations »), § 1.2 ligne Accueil (l.332).
  Effet : les gabarits `-boite` et `-leads` ne font que déposer ; `-reponse` ne lit que la plateforme ; le doublon est fusionné par `Regrouper par conversation`.
- **Les vidéos** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md`, fiche 9 (l.292-302 : l'appel classé « vraie urgence, peut attendre, curieux », la photo lue avant le départ, le devis « avec vos
  prix » en moins d'une minute) → le Qualificateur (classes et questions manquantes), la photo décrite par le nœud Anthropic et jamais chiffrée ; `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` § 5 (l.930-951 : « une règle
  ou un classifieur avant tout modèle », « un workflow en panne signalé », « des règles d'abord ») → la revalidation en Code après chaque agent, la porte avant le modèle ; `plans/analyse-videos.md` et `docs/connaissance-videos/`
  parcourus (`rg 044`, `rg trieur`) : l'image 044 du 21/10 n'y est pas retrouvée par ces mots (une seule ligne, l.1467, sans rapport) ; je n'ai donc rien cité de cette source.
- **Les dépôts de workflows** (`~/agents/depots/Zie619_n8n-workflows/workflows/`), ouverts : `Aggregate/1324_Aggregate_Gmail_Send_Triggered.json` (déclencheur Gmail → lecture du message → libellés), `Aggregate/0472_Aggregate_Gmail_Create_Triggered.json`
  (même forme, agent noOp + parseur), `Aggregate/1430_Aggregate_Schedule_Send_Scheduled.json` (horaire → Gmail → agent → Gmail), `Aggregate/0480_Aggregate_Telegram_Automate_Triggered.json` (déclencheur Telegram → agent → Telegram),
  `Aggregate/1404_Aggregate_Telegram_Automation_Triggered.json` (Switch → agent avec outils et mémoire → Telegram) et `Code/0273_Code_Webhook_Create_Webhook.json` (Zendesk, Slack). Ce que j'en reprends : **la forme**
  (un déclencheur sur l'outil, un agent avec modèle, outils et parseur, puis les nœuds d'écriture, un nœud d'erreur), jamais le JSON ; le releveur `releve-depots.md` l.285-330 (thèmes `messagerie` et `support_inbox`) m'a servi de table.
  Ce que je n'ai pas repris : leurs libellés Gmail posés par agent (l'écriture se fait après la porte, pas depuis un outil d'agent).
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (« Ce qu'il faut retenir », l.17-49) : point 5 (le workflow d'erreur se pose dans les réglages de chaque workflow → `errorWorkflow` à la création), 6 (l'idempotence,
  c'est la clé unique en base → `Prefer: resolution=ignore-duplicates` et clés `em:`, `fl:`, `dep:accueil:`), 8 (« Supabase account » passe outre la RLS → `organisation_id` sur chaque requête), 9 (n8n ne garde pas les succès →
  `saveDataSuccessExecution: none`), 10 (aucun « send and wait », n8n n'est pas joignable → vérifié par le juge, code `W`). **`fiches-depots.md`** l.105 (la vérité est Supabase, jamais Gmail) et l.489 (les nœuds `…HitlTool` refusés ici).
- **MCP `n8n-oracle`** : `get_workflow_sdk_reference` (« tout » : syntaxe restreinte, `ifElse`, `switchCase`, sous-nœuds d'agent, pas de fonction fléchée dans le code du constructeur) ; `get_workflow_best_practices` (`triage` : règles d'abord,
  Switch avec sortie de repli, parseur structuré ; `chatbot` : désactiver l'attribution « n8n » → `appendAttribution: false` partout) ; `search_nodes` (gmail, outlook, imap, whatsapp, telegram, facebook graph, facebook lead ads,
  send email, anthropic, execute workflow) ; `get_node_types` pour **chaque** nœud d'écriture et déclencheur employé (Gmail 2.2 brouillon et réponse, Outlook 2 brouillon et réponse, Send Email 2.1, WhatsApp 1.1 `send`, Telegram 1.2
  `sendMessage`, Anthropic `image/analyze`, Facebook Graph 1, déclencheurs Gmail 1.4, Outlook 1, IMAP 2.2, Execute Sub-workflow 1.4) ; `create_workflow_from_code` (×5, dont un gabarit archivé, voir plus bas), `test_workflow`
  (9 essais retenus), `get_workflow_execution`, `get_workflow_details` (les exports), `archive_workflow` (le premier `-boite`). Aucune publication, aucun identifiant, aucun appel au modèle.
  Constat utile : `search_nodes` montre que le nœud Facebook Lead Ads n'existe qu'en **déclencheur à webhook** ; la lecture des leads passe donc par le nœud Facebook Graph (GET) ; et que `anthropicTool` existe mais que la garde R23 ne l'admet pas
  en outil d'agent : la photo est lue sur le chemin principal.
- **L'existant, appelé ou lu, jamais modifié** : `presti-dep-accueil` (`Ls0oFcQzzAk0rWcP`), `lib-trier-demande` (`SrT4QJJmb6LLM1FK`), `lib-lire-photo` (`UWjCdC5kv3CXt6jm`), `lib-erreur-commune` (`yekMM9ewk03F9y2q`) ;
  `.orchestre/preuves/036-001/` (résumé, contrat `plans/011-cadrage-01-11/p6-signature/contrats/accueil.json`, essais 470 et 487 : les VRAIES sorties du chef) ; `.orchestre/preuves/036-003/resume.md` (la boîte mail, la méthode du rapatriement) ;
  `lib/releveCanal.ts` (AUTOMATIQUE, INDESIRABLE), `lib/pilote/regles.ts` (délai d'annulation, attente maximale), `lib/plans.ts` (`peut`), `lib/mentionAssistant.ts`, `lib/email.ts:6-11` (marque blanche).
- **`scripts/n8n-specs-qa.mjs` et `scripts/fixtures/n8n-specs-qa/fabriquer-gabarit-exemple.mjs`** (lus, jamais modifiés) : la liste blanche des gabarits, les règles R15 et R18 à R23, la forme du gabarit d'exemple. Effet : mes quatre exports tiennent R1 à R23 du premier coup.
- **`.claude/rules/*.md`, `CLAUDE.md`** : `architecture-outils.md` (n8n-first, aucun identifiant créé par un agent), `securite.md` (pas d'envoi, pas de donnée client à un modèle gratuit en ligne), `autonomie-abonnements.md` (Studio prépare, Signature envoie seul).

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Gabarit | Id n8n | Nœuds | Essais retenus |
|---|---|---|---|
| `gabarit-artisan-accueil-boite` | `jHLRIQWCfc5Gvknm` | 14 | 615 |
| `gabarit-artisan-accueil-leads` | `WYLdqfoVOLHSdSoY` | 14 | 617 |
| `gabarit-artisan-accueil-reponse` | `UVOEbLSzSEKe5sJp` | 40 | 623, 627, 628, 629 |
| `gabarit-artisan-accueil-envoi` | `QZSMHbM6D5taI04i` | 18 | 624, 625, 626 |

Réglages de tous : `errorWorkflow` = `lib-erreur-commune`, `Europe/Paris`, délai borné (120 s, 300 s pour `-reponse`), succès non sauvés, `callerPolicy: none`. La description nœud par nœud (outil, ce qui est lu, ce qui est écrit, la porte,
ce qui est épinglé, ce qu'il faut à la copie d'un client) est dans `plans/011-cadrage-01-11/p6-signature/outillage/gabarits/accueil.md`. Un premier `-boite` (`H231TUAvAE6UA8IU`) a été archivé et refait : n8n refuse de poser un workflow d'erreur non publié
par `update_workflow` ; les réglages se posent à la création.

Fichiers de la preuve : 4 exports `*.workflow.json` (rendus par `get_workflow_details`, rapatriés sans retouche par `rapatrier.mjs`, « scopes » ôté), `empreintes-code.json` (20 empreintes SHA-256 des nœuds Code), `essais-n8n.json` (9 essais n8n :
entrées épinglées et sorties relues), `titres-essais.json`, `juge.log` (sortie du juge et de ses 46 mutants), `garde-commune.log` (sortie de `n8n-specs-qa.mjs`), `rapatrier.mjs`, `avant.txt` et `decisions-avant.md` (écrits par `orchestre.mjs prochaine`).
Hors preuve : `scripts/gabarits-accueil-qa.mjs`, `plans/011-cadrage-01-11/p6-signature/outillage/gabarits/accueil.md`.

## Les essais réels dans n8n (`test_workflow`, données épinglées fictives « Exemple. », rien d'écrit)

| Essai | Ce que n8n a rendu |
|---|---|
| 615 `-boite` | quatre courriels Gmail : un doublon ignoré, une lettre automatique ignorée, **2 dépôts dans UNE conversation**, `effets_faits` vide |
| 617 `-leads` | un lead enregistré, Facebook non appelé, 1 dépôt prévu (`facebook_lead`) |
| 623 `-reponse` **Studio** | 2 cartes + **1 brouillon Gmail** (le WhatsApp : carte seule), 0 file du pilote, 0 envoi |
| 627 `-reponse` **Signature, type activé** | un client par Outlook puis WhatsApp = **1 demande** ; 1 ligne du pilote (envoi par WhatsApp), 1 carte d'escalade, 0 brouillon |
| 628 `-reponse` **Signature sans le type** | **1 carte**, rien d'autre (pin dérivé, voir plus bas) |
| 629 `-reponse` **spam** | le journal seulement |
| 624 `-envoi` Signature | **envois prévus** : Gmail, WhatsApp, SMTP ; opposition → carte ; réponse de 5 minutes → attend |
| 625, 626 `-envoi` | Signature sans le type → carte (`type`) ; **Studio → carte (`offre`)**, jamais d'envoi |

Ce qui est épinglé à la place d'un appel : les lectures Supabase, les déclencheurs, et `Appeler presti-dep-accueil`. Les pins du chef sont les VRAIES sorties de 036-001 (essais 470 et 487) avec le **journal tronqué à 2 lignes**
(les 11 lignes réelles sont dans `036-001/essais-n8n.json`). **L'essai 628 est un pin dérivé** (la ligne du pilote d'un compte Signature remplacée par une carte de motif `type`) : n8n n'a pas rendu cette sortie ; le juge le dit et rejoue
en plus avec les sorties complètes de 036-001.

## Le juge `scripts/gabarits-accueil-qa.mjs` et ses mutants

Sortie (`juge.log`, 7 s, aucun appel au modèle) : `OK`, **46 mutants sur 46 rougissent pour leur raison**. Il vérifie : la structure (inactifs, aucun identifiant, aucun webhook, réglages, la matrice des outils de la ligne Accueil, l'agent avec Claude, un parseur et des
outils de lecture, la porte devant chaque effet, marque blanche et mention, dépôt d'abord, empreintes) ; le rejeu des nœuds Code dans `node:vm`, **identique à la sortie de n8n** pour chaque nœud relu ; les cas du juge (notification d'une plateforme de devis,
interrupteur, réglages vides, chaque condition du pilote retirée l'une après l'autre, « Studio n'envoie jamais » sur sept canaux) ; les constantes comparées au code (`lib/releveCanal.ts`, `lib/pilote/regles.ts`, `lib/plans.ts`, `lib/mentionAssistant.ts`).

Les huit mutants demandés rougissent : un envoi atteint en simulation (P), un identifiant branché (I), un déclencheur WhatsApp en webhook (W), un outil d'agent qui envoie (O), « Presti » dans la réponse (B), le nœud Gmail retiré (T), Studio qui envoie au lieu du brouillon (C),
le message non déposé dans la plateforme (D). Les mutants de code modifient aussi l'empreinte, pour que seul le **rejeu** puisse les prendre. La garde commune `n8n-specs-qa.mjs` rend `OK` sur les quatre exports (R1 à R23 tenues).

## Sécurité (appliquée à la main)

Aucun secret dans un export (R2). Aucun identifiant (code `I` et R21). Aucun webhook (R22, code `W`). Le texte du message est masqué (adresses, numéros) avant d'aller au modèle ; un texte du modèle qui contient un chiffre, un prix ou un nom d'éditeur est refusé avant tout effet.
Filtre `organisation_id` sur chaque requête (R14). Aucune donnée réelle : adresses en `.invalid`, noms précédés de « Exemple. ». L'adresse du client n'est lue qu'au moment d'écrire le brouillon ou d'envoyer (`lecture-pour-envoi`).

## Risques et points à valider

1. **Le chef refuse le réel** : les gabarits ne sont prouvés qu'en simulation.
2. **Vues, fonction et tables à poser** (migration, accord de Benj) : `v_accueil_reglages`, `v_accueil_evenements`, `v_accueil_destinataires`, `v_accueil_envois_dus`, `rpc/deposer_message`, `pilote_file`, `journal_agents` (absents des migrations au 03/11).
3. **`callerIds` de `presti-dep-accueil`** à compléter pour chaque copie, et publication des enfants avant les parents (n8n 2.45.7, sondes 499 et 501 de 036-001).
4. **Les outils `lib-trier-demande` et `lib-lire-photo` d'un agent** ne passent pas leur « Contrat d'entrée » tel quel : un enrobage est à écrire (autre lot).
5. **Canaux du chef** : WhatsApp, Messenger, Instagram et SMS lui sont présentés comme `page_p` (énumération fermée) ; SMS et LinkedIn ne sont pas branchés.
6. **Mention d'IA sur le brouillon de Studio** : exigée par la garde, à confirmer par Benj.
7. **Formes des entrées Gmail, Outlook, IMAP** jamais vues sur un vrai compte.
8. **Le juge n'est pas dans `SUITES`** (`scripts/tout-verifier.mjs`, hors périmètre) : à inscrire par la session principale (lot 036-012).
9. **Aucun fichier modifié** hors périmètre : `app/**`, `lib/**`, `supabase/**`, `scripts/n8n-specs-qa.mjs`, `scripts/fixtures/**`, tout workflow existant et le vault restent intacts. Ni commit, ni push, ni build, ni migration.

## Résultat de la commande `verifier`

Voir `verifier.log` (écrit par `orchestre.mjs`).
