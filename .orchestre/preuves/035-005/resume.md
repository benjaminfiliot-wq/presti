## Ressources utilisées

- **Inventaire de la session** (hôte d'agents Oracle, sans écran) : outil Skill ; MCP `cerveau` (lecture seule ici) ; MCP `n8n-oracle` (n8n local d'Oracle). Aucun skill n8n dans la liste. Les skills de design, de vidéo et d'animation ne servent pas ce domaine. Les connecteurs Supabase, Vercel, Gmail, Slack et les autres sont interdits par la tâche : aucun appel.
- **Skill `reseau-neuronal`** : chargé avant de produire. Il fixe l'ordre `regles_pour`, `chercher`, `lire`, et rien n'est écrit dans le vault (copie du 02/11).
- **MCP `cerveau`** :
  - `regles_pour` (« relances, e-mail, offre entreprise, n8n… ») rend `[]` ;
  - `chercher`, puis `lire`, de l'**ADR-008** (§ Décision : toute relance et toute logique récurrente vit dans n8n, l'app ne sert qu'à l'interface) et de l'**ADR-001** (les cinq pas : workflow créé, dry-run, comparaison à l'ancien comportement…).
  - Effet : la relance, la rédaction, la porte, l'exécution et le rapport sont six workflows n8n. Aucun fichier `app/**` ni `lib/**` n'est touché. Le pas « comparé à l'ancien comportement » devient la **comparaison au code** : le registre, la liste « jamais en automatique », la mention et les pieds sont rejoués contre le vrai code à chaque passage du juge.
- **Le prompt 5, `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`** : en-tête et rôle (l.1-60), agents (l.186-230), sécurité (l.255-268), tests (l.310-320), questions (l.424-428) lus à la main. Le reste a été lu par un sous-agent `haiku` (Explore, lecture seule), puis vérifié aux lignes citées.
  - p5:190 (Relance : J+1, J+3, J+7 fixés par le client ; registre commun ; jamais après stop, litige ou escalade) : `lib-relancer` ;
  - p5:191 (Rédaction : n'envoie jamais ; ni prix, ni délai, ni créneau, ni fournisseur hors base) : le prompt et la porte ;
  - p5:193 (Reporting : ne présente jamais un chiffre déclaré comme mesuré) et p5:42 (aucun chiffre de gain) : `lib-rapport-hebdo` ;
  - p5:194 (Conformité : lecture en erreur = refus) et p5:226 (jamais en automatique, même au contrat) : `lib-porte-conformite` ;
  - p5:216-218 (schéma strict ; le code calcule les montants ; jamais un modèle gratuit en ligne) : parseur, revalidation, modèle Standard du produit ;
  - p5:263 (arrêt immédiat) : les interrupteurs de `lib-executer` ;
  - p5:313-318 (tests hors ligne capables de rougir) : le juge.
- **L'addendum `prompts-benj/benj-0111-addendum.md`** (§ 1 à 3, lus) : migration une par une et à blanc ; n8n moteur de toutes les automatisations ; rien n'est publié, rien n'est écrit en base, aucun identifiant n'est créé.
- **La première réponse, `p5-entreprise/premiere-reponse.md`** :
  - la ligne 035-005 (l.938) ;
  - § 4.3 à 4.6 (l.305-431) : la chaîne d'un agent d'action, avec la relance, la rédaction, la porte, le « simulation ? » puis l'exécution ; « L'arrêt a un effet immédiat » ; les règles de construction ;
  - § 5.3, les fiches Relance, Rédaction, Reporting et Conformité (l.488-604) ;
  - § 5.5, les contrats `lib-relancer@1`, `lib-normaliser-telephone@1`, `lib-rediger-message@1`, `lib-porte-conformite@1`, `lib-executer@1` et `lib-rapport-hebdo@1` (l.619-759), suivis avec les écarts dits au point 3 des risques ;
  - la question 5 (l.887 : le nœud du modèle reste épinglé), la question 1 (mode A : niveau 2 au plus), la question 2 (cartes dans `opportunites`) ;
  - l'**Amendement B1** (l.1012-1027) : la liste du kit est la liste du code **plus** les gestes de p5:226 ; le juge vérifie l'**inclusion** ; les motifs ajoutés à la porte.
- **Le plan du chantier 4, `chantier-4-assistant-plan.md`** :
  - § 0 bis (l.45-52, l.138-156) : chaque envoi déclare son pied (la mention pour un texte du modèle envoyé sans relecture, `PIED_AUTOMATIQUE`, `PIED_APRES`, ou rien) ;
  - C4:144 : un workflow qui envoie ne lit qu'au moment d'envoyer ce que son message exige ;
  - C4:680 : chaque SMS porte STOP.
- **`p5-entreprise/fiche-methode-n8n.md`** (lue par le sous-agent, puis vérifiée aux lignes citées) :
  - l.312-313 : `autoFix` coupé, puis revalidation en Code ;
  - l.849 : une sortie hors schéma est rejetée ;
  - l.885-886 : la vraie garde de l'idempotence est la contrainte unique, d'où le POST `on_conflict=organisation_id,cle` prévu ;
  - l.904-908 : un If « simulation ? » juste avant chaque effet, et un juge hors ligne avec un mutant qui rougit.
- **`p5-entreprise/fiches-depots.md`** :
  - l.433 et l.493-494 : les données épinglées ne couvrent pas les sous-workflows. D'où la sortie de `lib-rediger-message` épinglée **dans l'essai du banc**, et rejouée pour de vrai par le juge ;
  - l.673-675 et l.681 : rôles de `lib-relancer`, `lib-rediger-message`, `lib-porte-conformite` et `lib-rapport-hebdo` ;
  - l.713 : le piège des paliers en égalité stricte, d'où « palier atteint et non envoyé ».
- **Toutes les vidéos de @restructureai, `/home/usine/agents/videos/references-2026-11-02/restructureai/TOUTES-LES-TRANSCRIPTIONS.md`** (66 vidéos, parcourues par le sous-agent aux mots clés, lignes vérifiées). Ce qu'elles ont fixé :
  - le **rapport du lundi en une page**, pas un tableau de bord (l.1177, 7691155026256923925 ; l.1671 « Every Monday morning, one report ») : `lib-rapport-hebdo` rend des lignes courtes ;
  - « **either already handled or sitting on your desk with a fix ready to go** » (l.1151-1152, 7690784360898874645) : les trois têtes du rapport, « Déjà traité », « Sur votre bureau, solution prête » (les cartes prêtes à valider) et « À reprendre » ;
  - la **file d'approbation**, où rien ne part seul au début (l.1040-1041, l.1098, l.457-458 « nothing publishes unless a person signs off ») et où le brouillon est relu (l.1014 « reads every draft ») : en mode A, tout est carte, et la mention d'IA n'apparaît que sans relecture ;
  - la **relance à paliers** (l.628 « A nudge at day 3. Day 7. Day 14. ») : des paliers fixés par le client, J+1, J+3, J+7 par défaut ;
  - « **stops and leaves it for me** » (l.580) : l'escalade arrête la relance et la porte.
- **`p5-entreprise/fiches-videos-restructureai.md`** :
  - l.40-43 (fiche 1) : la file d'approbation est une carte, et « déjà traité ou sur ton bureau » donne la forme des cartes ;
  - l.108-111 (fiche 3) : un rapport hebdomadaire unique, le lundi ;
  - l.179-181 (fiche 5) : des relances datées, sous le registre de 3 jours ;
  - l.311-314 (fiche 9) : prix sourcés ou marqués estimés, jamais un paiement sans l'artisan.
- **`p5-entreprise/fiches-videos.md`** :
  - l.388-393 : la relance s'arrête sur un motif rangé ;
  - l.398-400 : un prix non sourcé ne part jamais seul, et jamais « comme s'il avait accepté » (le prompt l'interdit) ;
  - l.651-656 : la vérification avant toute sortie, et l'escalade reste humaine ;
  - l.706 : le rapport finit par des propositions en cartes, jamais par une action.
- **`docs/connaissance-videos/`** (déjà analysées) : pas relues en entier. Les fiches ci-dessus les résument pour le prompt 5, et aucune n'ajoute de règle à ces six gabarits.
- **Le code, chargé pour de vrai** (enfant Node, `--experimental-strip-types`, `scripts/ts-loader.mjs`, URL `file://` pour Windows) :
  - `lib/relancesRegistre.ts` : `RELANCE_DELAI_JOURS`, le type `CheminRelance` et `relanceRecente()` ;
  - `lib/pilote/regles.ts` : `OUTILS_JAMAIS_AUTO`, `PLAFOND_AUTO_JOUR`, `MOTS_ESCALADE_TOUJOURS` et `MOTS_ESCALADE_ENTIERS` ;
  - `lib/mentionAssistant.ts`, `lib/relancesImpayes.ts:62` (`PIED_AUTOMATIQUE`), `lib/apresChantier.ts:51` (`PIED_APRES`) et `lib/models.ts:7` (palier Standard) ;
  - `lib/ai.ts:371-378` (`GARDE_FOUS`) et `:694-711` (le prompt de relance du produit) ont servi de modèle au prompt de `lib-rediger-message`.
- **Le jeu fictif `.orchestre/preuves/035-006/exemple/`** (« Exemple. Bâti-Démo ») : factures, devis, relances, relances d'impayés, messages et demandes. Ses cas limites servent au banc : stop (…0104), litige (…0106), escalade (…0121), palier manqué (FAC-2026-007), prix absent (DEV-2026-012).
- **Le socle et la chaîne métier** (`.orchestre/preuves/035-003/construire.mjs`, `035-004/construire.mjs`, importés en lecture) : `codeEntree`, `codeSortie`, `reglagesEnfant`, le SHA-256 écrit à la main et `GESTES_P5_226`, réutilisés tels quels. Le juge tient les mêmes empreintes du corps commun.
- **MCP `n8n-oracle`** :
  - `get_workflow_sdk_reference` (`rules`, `patterns`, `guidelines`) : un AI Agent avec `subnodes` (modèle, parseur), et une liste vide qui arrête proprement la chaîne ;
  - `get_workflow_best_practices` : `content_generation` (valider l'entrée et la sortie du texte généré) et `human_in_the_loop` (aucune fiche, d'où les cartes) ;
  - `search_nodes` et `get_node_types` (`lmChatAnthropic` 1.6, `outputParserStructured` 1.3) ;
  - `validate_workflow`, `create_workflow_from_code` (×7), `update_workflow` (politique d'appel, étiquettes) ;
  - `test_workflow` (10 exécutions, 409 à 418), `get_workflow_execution`, `get_workflow_details` (×7) et `search_workflows`.
  - Aucun `publish_workflow`, aucun identifiant créé ni modifié, aucun appel au modèle.

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Étiquettes | Rôle |
|---|---|---|---|
| `lib-relancer` | `jGM56jxeLUVXZIiM` | `lib`, `couche-decision` | Palier atteint et non envoyé, registre de 3 jours (copie figée), stop, litige ou escalade, horaires de Paris |
| `lib-normaliser-telephone` | `8ahfqH01ZSpb0262` | `lib`, `couche-execution` | Un numéro en E.164 français, ou vide ; au moment d'envoyer seulement |
| `lib-rediger-message` | `xfRUnkwOKSwQezVb` | `lib`, `couche-redaction` | Un brouillon à partir des seuls faits ; AI Agent 3.1, modèle sans identifiant et épinglé, parseur, revalidation |
| `lib-porte-conformite` | `8c8vkUeSkfgB5FAM` | `lib`, `couche-conformite` | Le veto, avant toute exécution |
| `lib-executer` | `ADX5mPWqIvq1LGs6` | `lib`, `couche-execution` | Relit les interrupteurs, puis prévoit la carte ou la ligne du pilote, en simulation seulement |
| `lib-rapport-hebdo` | `1BFHQyfhuNpTmlrj` | `lib`, `couche-reporting` | Le rapport du gérant |
| `lib-banc-relance` | `H33CKQ8sMB3VULfA` | `lib`, `couche-essai` | Banc : la chaîne entière sur Bâti-Démo, plus la porte face aux gestes jamais automatiques, plus le rapport du lundi |

**Réglages, sur chacun** (relus par `get_workflow_details`) :
- `active: false` et `activeVersionId: null` ;
- `timezone: Europe/Paris` ; `executionTimeout` de 60 s (120 s pour le banc) ;
- `saveDataSuccessExecution: none` ;
- `errorWorkflow: yekMM9ewk03F9y2q` (`lib-erreur-commune`) ;
- les six enfants : `callerPolicy: workflowsFromAList` avec `callerIds: H33CKQ8sMB3VULfA` (le banc) ; le banc est en `callerPolicy: none`.

**Le squelette est celui du socle :**

> Appelé par un parent → Contrat d'entrée → Entrée conforme ? → Porte simulation → logique → Contrat de sortie

La sortie « faux » de la porte mène à « Hors simulation : non branché » (Stop and Error). `lib-rediger-message` y insère trois nœuds : Préparer la demande au modèle → **Rédiger (modèle épinglé)** → Revalider la sortie du modèle.

**Mode A :** aucun nœud de lecture, d'écriture ni d'envoi. Ce que liraient la base et le modèle est épinglé à l'entrée, et tout effet part dans `effets_prevus`.

Les 18 autres `lib-*` (035-003, 035-004) et les `presti-*` n'ont pas été touchés : leur `updatedAt` est toujours celui du 02/11 au relevé final (`search_workflows`).

## Chaque `lib-*` : contrat, essai sur données épinglées, comparaison au code

Tous suivent l'`enveloppe@1` et le gabarit « Contrat » de 035-003. Tous sont `sans_contact: true`, sauf `lib-normaliser-telephone` : un e-mail ou un téléphone dans `config` ou `donnees` fait rejeter l'entrée.

### `lib-relancer` (`jGM56jxeLUVXZIiM`) — `lib-relancer@1`

**Entrée :**
- `config { paliers_jours[] (J+1, J+3, J+7 au banc), jours_permis 1..7, heures_permises { debut, fin }, sauf? }` ;
- `donnees { objet_type ∈ {devis, facture, conversation}, objet_id, depuis_le, maintenant, historique, paliers_envoyes[], stop, escalade }`.

`historique` est ce que rendrait `historiqueRelances()` : `{ ok, traces[{ chemin, le }], ignorees }`, ou `{ ok: false, erreur }`. `stop` et `escalade` valent vrai, faux ou `null` (non lus).

**Sortie :** `resultat { a_relancer, palier, motif, objet_type, objet_id, jours_depuis, cle_idempotence, derniere_relance }`.

**Règles :**
- Le palier retenu est le plus haut atteint. S'il est déjà parti, ou si un plus haut l'est, le motif est `palier_deja_envoye`. Un passage manqué fait donc partir un seul palier, jamais les paliers dépassés.
- L'ordre des refus : `stop`, puis `litige_ou_escalade`, puis `lecture_en_erreur` (un `null`, ou un registre illisible), puis `aucun_palier_atteint`, `palier_deja_envoye`, `relance_recente_moins_3_jours` et `hors_horaires` (heure de Paris par `Intl`).
- La clé : `org:relance:<type>:<objet>:<palier>`, condensée à 80 caractères au plus.

**Comparaison au code (R1).**
- La copie figée `COPIE_REGISTRE = { RELANCE_DELAI_JOURS: 3, CHEMINS: [assistant, crm, impayes, conversation] }` est égale au code.
- `relanceRecente()` est recopiée ligne à ligne. Le juge la rejoue contre la **vraie** fonction de `lib/relancesRegistre.ts` sur 30 historiques : 10 situations (à 1 jour, à 2,99 jours, à 3 jours pile, à 3,01 jours, date illisible, lecture en erreur…), chacune avec trois options (`sauf`, `delaiJours`). Elles décident pareil.
- Deux mutants côté code (4 jours, date illisible) le font rougir.

**Essai n8n 409** (13 entrées, les 10 cas du banc et 3 cas limites) :
- FAC-2026-007 : palier 3, J+16 ; le palier 2 est déjà parti il y a 6 jours ;
- FAC-2026-008 : palier 3 ; FAC-2026-009 : palier 2 (le palier 1 a été manqué, il ne part pas) ; FAC-2026-010 : avant le palier ;
- DEV-2026-011 : bloqué, relancé par le CRM le 1er novembre ; DEV-2026-012 : palier 3 ;
- …0104 : stop ; …0106 et …0121 : escalade ; …0125 : palier 3 ;
- registre illisible : `lecture_en_erreur` ; un dimanche : `hors_horaires` ; stop non lu : `lecture_en_erreur`.

**Essai 410** (`simulation: false`) : arrêt « Hors simulation ».

### `lib-normaliser-telephone` (`8ahfqH01ZSpb0262`) — `lib-normaliser-telephone@1`

**Entrée :** `donnees { moment: "envoi" (const), telephone: texte|null ≤ 40 }`. Le moment est **exigé** par le contrat : un appel hors de l'envoi est rejeté. **Sortie :** `resultat { e164, valide }`.

**Règles :**
- `06…`, `+33 6…`, `+33 (0)6…` et `0033…` donnent `+33XXXXXXXXX` ;
- « A string », vide, `06`, un numéro trop court, un numéro étranger ou `null` donnent vide ;
- jamais une exception, et le numéro n'entre jamais au journal.

**Dans le banc**, le seul nœud qui lit un numéro est « Au moment d'envoyer ». Il vient **après** la porte et l'exécution, pour la carte SMS (…0125). Le juge (T4) prouve qu'ôter la porte ou l'exécution rend l'appel inatteignable, et qu'aucun nœud en amont ne porte un numéro.

**Essai 411** (9 entrées) : 3 numéros normalisés en `+33639980007`, 5 vidés, 1 rejeté (`moment: qualification`).

### `lib-rediger-message` (`xfRUnkwOKSwQezVb`) — `lib-rediger-message@1` : le « cerveau »

**Entrée :**
- `config { canal ∈ {email, sms}, ton, signature, nom_artisan, mention_ia }` ;
- `donnees { action_cle, faits }`. Les `faits` forment une liste fermée : type de relance, palier, numéro, objet, montants en centimes, échéance, émission, régime de TVA. Ni nom, ni adresse, ni contact.

**Sortie :** `resultat { action_cle, objet, texte, faits_cites, champs_inconnus, canal, mention, modele, epingle, jetons_entree, jetons_sortie, cle_idempotence }`.

**La chaîne :**
1. « Préparer » met les faits en forme **par le code** : « 334,00 € TTC », « 18 octobre 2026 ». Le modèle n'a qu'à les recopier.
2. **Rédiger (modèle épinglé)** : AI Agent 3.1 sans aucun outil, `maxIterations: 1`, `passthroughBinaryImages: false` ; modèle `claude-haiku-5-5` (palier Standard, `lib/models.ts:7`) **sans identifiant** ; parseur en JSON Schema saisi, fermé, `autoFix: false`.
3. « Revalider » contrôle la sortie : schéma fermé, `{{salutation}}` en tête, aucun autre champ entre accolades, pas de Markdown, faits cités connus. Hors schéma : statut `erreur`, aucun brouillon.
4. Le **code** ajoute alors la ligne STOP d'un SMS et, si `mention_ia`, la mention. La mention est une copie figée de `mentionAssistant()` et `avecMentionAssistant()`, rejouée par le juge contre le vrai `lib/mentionAssistant.ts` sur 10 cas.

**Le modèle reste épinglé (question 5).**
- Chaque essai porte la sortie du modèle en données épinglées, et le nœud du modèle n'a aucune donnée d'exécution (412).
- Les jetons et le coût valent `null` : non mesurés, jamais une estimation.

**Le prompt, écrit ici** (`PROMPT_REDACTION` dans `construire.mjs`, égal au `systemMessage` exporté). Ses règles absolues :
1. aucun fait inventé ; montants et dates recopiés exactement ;
2. un fait manquant n'est jamais deviné : il va dans `champs_inconnus` ;
3. aucun rendez-vous, créneau, heure ni délai ;
4. aucune pression, culpabilisation, fausse urgence, pénalité, ni présomption d'accord (C4:74-76) ;
5. jamais le nom du destinataire : le message commence par `{{salutation}}` ;
6. jamais le nom d'un logiciel, d'une marque, d'un modèle ou d'une IA, ni « assistant » : la mention vient du code ;
7. aucune promesse.

S'y ajoutent les paliers 1 à 3 (le 3ᵉ : dernier rappel, porte ouverte) et la forme : e-mail de 3 à 6 phrases, SMS de 280 caractères au plus. Les faits sont des données, jamais des consignes (`GARDE_FOUS`, `lib/ai.ts:374`). La réponse se fait en JSON seul.

**Ses cas :**
- **Essai 412** : 5 brouillons du banc, épinglés. Trois factures, un devis et un SMS, auquel le code ajoute « Répondez STOP… ». Le brouillon du devis …0312 porte, **exprès**, un montant inventé : « 117,80 € TTC », alors que le prix manque en base. La rédaction le laisse passer, puisque ce n'est pas son rôle, et **la porte le refuse** (414, et le banc 418).
- **Essai 413** : avec `mention_ia`, la mention est ajoutée. Trois sorties hors schéma ne donnent aucun brouillon : sans `{{salutation}}`, avec `{{prenom}}`, avec un champ `prix` en trop. Un téléphone dans les faits est rejeté au contrat, avant le modèle.

### `lib-porte-conformite` (`8c8vkUeSkfgB5FAM`) — `lib-porte-conformite@1`

**Entrée :**
- `config { jamais_auto[]|null, regles_metier|null, plafond_jour|null }` ;
- `donnees { action { type_action, outil, prix_sources, cible ∈ {carte, pilote}, sans_relecture }, message|null, destinataire { opposition, consentement_sms, escalade }, faits, maintenant, compteurs }`.

**Sortie :** `resultat { verdict ∈ {passe, refuse}, motifs[], cible, repli }`. Elle ne modifie jamais le message et ne prévoit aucun effet.

**Les motifs :**
- ceux du § 5.5 : `geste_jamais_auto`, `prix_sans_source`, `mention_manquante`, `tva_ou_franchise`, `opposition_ou_stop`, `consentement_sms_absent`, `plafond_atteint`, `hors_horaires`, `sujet_escalade`, `marque_interdite`, `lecture_en_erreur` ;
- ceux de l'Amendement B1 : `delai_creneau_fournisseur_sans_source`, `devis_engageant`, `declaration_fiscale_ou_sociale`, `suppression_de_donnees`, `appel_telephonique` ;
- plus `pied_errone` (une mention sur une carte, ou le pied d'un autre).

**La liste « jamais en automatique » (Amendement B1).**
- Le kit prend la **copie figée** de `OUTILS_JAMAIS_AUTO` (10 gestes, `regles.ts:79-82`) **plus** `GESTES_P5_226` (11 gestes, ceux de 035-004) **plus** ce que la configuration du client ajoute, sans pouvoir rien retirer. S'y ajoutent les préfixes `supprimer_`, `declarer_`, `encaisser_`, `rembourser_` et `payer_`.
- Un geste de cette liste demandé **en automatique** est refusé, avec un repli en carte. En carte, l'artisan valide, et le geste reste proposable.

**Comparaison au code (K1, K2).** Copies égales au code : `OUTILS_JAMAIS_AUTO`, `PLAFOND_AUTO_JOUR` (20), les 166 + 11 mots d'escalade, la mention, `PIED_AUTOMATIQUE` et `PIED_APRES`. Le juge vérifie l'**inclusion** de la liste du code dans le kit, et exige lui-même les 8 gestes de p5:226. Trois mutants côté code ou copie le font rougir.

**Ce qu'elle refuse encore :**
- un montant qui n'est pas un montant des faits, ou cité sans TTC/HT (ou avec TVA sous franchise) ;
- une date absente des faits, une heure, un jour, « demain », « sous 48 h », « d'ici », « créneau », « rendez-vous » ;
- un fournisseur hors de la liste du client ;
- un mot d'escalade (du code, ou de l'artisan), ou le drapeau d'escalade vrai ou non lu ;
- « Presti », une marque d'outil ou de modèle, « intelligence artificielle » ;
- une opposition, un SMS sans STOP ou sans consentement ;
- une lecture absente, ou un champ `{{…}}` resté vide ;
- en automatique seulement : hors horaires, ou au-delà du plafond du jour. Le plafond est le plus bas de la configuration et du code, compté dans le lot.

**Les pieds d'e-mail, comparés au code.**
- Un texte du modèle envoyé sans relecture doit porter la mention ; une carte ne la porte pas (le message validé est celui de l'artisan, `mentionAssistant.ts:9`).
- `PIED_AUTOMATIQUE` et `PIED_APRES` sont les pieds de textes fixes de l'app. Dans un texte du modèle, ils font refuser le message.

**Essai 414** (10 entrées) :
- les 5 brouillons du banc : 4 passent en carte, et …0312 est refusé pour `prix_sans_source` ;
- puis « Presti » → `marque_interdite` ; opposition → `opposition_ou_stop` ; « jeudi à 14 h » → `delai_creneau_fournisseur_sans_source` ; SMS sans STOP → `opposition_ou_stop` ; pilote au plafond → `plafond_atteint`, repli en carte.

### `lib-executer` (`ADX5mPWqIvq1LGs6`) — `lib-executer@1`

**Entrée :**
- `config { niveau_max }` ;
- `donnees { verdict: "passe" (const), cible, cle_idempotence, charge { type_action, objet_type, objet_id, palier?, canal?, brouillon? }, interrupteurs { general, agent }|null, cles_existantes[]|null }`.

Les interrupteurs et les clés sont ce que relirait l'effet juste avant d'agir, épinglés en mode A.

**Sortie :** `resultat { ecrit: false, deja_fait, ref_id: null, prevu, motif }`.

**Règles :**
- Un interrupteur coupé ou illisible ne fait rien. Il **verrouille le passage** : dès qu'une lecture voit l'interrupteur coupé, rien ne part plus pour cette organisation, même si une lecture suivante le dit ouvert. Une autre organisation n'est pas touchée.
- La ligne du pilote est refusée sous le niveau 3 (mode A, question 1).
- Idempotence : une clé déjà en base ou déjà vue dans le lot est « déjà fait ».
- L'effet prévu : `POST /rest/v1/opportunites?on_conflict=organisation_id,cle` (carte, 0185, question 2), ou `pilote_file` au niveau 3 ; avec `Prefer: resolution=ignore-duplicates` et `organisation_id` dans le corps.
- Aucun nœud d'écriture n'existe.

**Essai 415** (8 entrées) : 3 cartes prévues ; une clé déjà en base, « déjà fait » ; pilote en mode A, refusé ; la même clé deux fois dans le lot, « déjà fait » ; interrupteur général coupé, refusé ; la lecture suivante « ouverte » reste refusée (`interrupteur_coupe_pendant_le_passage`).

**Essai 416** (`simulation: false`) : arrêt.

### `lib-rapport-hebdo` (`1BFHQyfhuNpTmlrj`) — `lib-rapport-hebdo@1`

**Entrée :**
- `config { periode, kpis[] (liste fermée), bases_de_depart { kpi: { valeur, source, date, confiance } } }` ;
- `donnees { du, au, actions[{ type_action, etat, le }] }` : ce que le journal rendrait ; aucune donnée.

**Sortie :** `resultat { periode, indicateurs[{ id, libelle, valeur, unite, source, date, confiance, base, base_source, base_date, base_confiance }], fait_seul, en_attente, echecs, lignes[] }`.

**Règles :**
- Les seuls indicateurs sont des **comptes** : `actions_preparees`, `relances_preparees`, `fait_seul`, `en_attente`, `echecs`, `refus_porte`.
- Tout autre indicateur fait refuser le rapport : `gain_euros`, `economie_temps`, `chiffre_affaires`, `roi`.
- Une base sans source ou sans date fait refuser le rapport.
- Une base déclarée est écrite « déclarée par le client, non mesurée ». Aucun écart n'est calculé.
- En simulation, chaque ligne commence par « Exemple. ».

**Essai 417** :
- le rapport de la semaine du 26 octobre au 1ᵉʳ novembre 2026 : « Déjà traité : 3 ; sur votre bureau, solution prête : 4 ; à reprendre : 1 », et 6 indicateurs sourcés. L'action du 2 novembre, hors période, n'est pas comptée ;
- `gain_euros` est refusé ; une base sans source est refusée.

### Le banc `lib-banc-relance` (`H33CKQ8sMB3VULfA`) — essai n8n 418

**Les trois branches :**
- **La chaîne** : relancer, rédiger (sortie épinglée, égale à 412), porte, exécuter, au moment d'envoyer, téléphone ;
- **la porte face aux 21 gestes** du kit, demandés en automatique avec un message propre et mentionné ;
- **le rapport du lundi**.

Les enfants ont tourné pour de vrai, non publiés, en source `database`, sous la politique « en liste » (sous-exécution 422 pour le téléphone).

**Bilans n8n**, tous à `defauts: 0` :
- `{ lib-normaliser-telephone@1: { ok: 2 } }` ;
- `{ lib-porte-conformite@1: { refuse: 22, ok: 1 } }`, avec 11 refus en `geste_jamais_auto`, 4 en suppression, 2 en devis, 2 en déclaration et 2 en appel ; le témoin propre passe en `pilote`, et le témoin sans mention est refusé en `mention_manquante` ;
- `{ lib-rapport-hebdo@1: { ok: 1 } }`.

## Le juge `scripts/lib-relance-n8n-qa.mjs`

Il est hors ligne. Il rejoue tels quels les nœuds Code des exports dans `node:vm`, en suivant leurs connexions, avec `$input` et `$('Nœud')`. L'AI Agent rend la **sortie épinglée** de l'essai, et sans elle, le rejeu s'arrête : aucun modèle n'est appelé. Les Execute Sub-workflow du banc rejouent l'export enfant après avoir vérifié sa politique d'appel. Le juge mène ensuite les épreuves S, C, R, T, D, K, X, H, B et N, puis 54 mutants. La commande prend environ 1 s, sans IA.

Les autres juges de la commande `verifier` sont verts :
- `lib-metier-n8n-qa` : 35 mutants, 35 rouges ;
- `lib-socle-n8n-qa` : 35 mutants, 35 rouges ;
- `n8n-specs-qa .orchestre/preuves/035-005` : les 7 exports tiennent R1 à R20 (R18 compris pour le modèle), et ses 88 mutants restent rouges.

Sortie du juge, au 03/11/2026 (lignes « → » abrégées) :

```
✓ chaîne relance → rapport (6 gabarits et le banc, 10 essai(s) n8n rejoué(s)) : S1 à S8, C1 à C3, R1 à R7, T1 à T5, D1 à D6, K1 à K13, X1 à X5, H1 à H6, B1 à B4, N1 et N2 tenus
  copies figées = code : registre 3 jours (assistant, crm, impayes, conversation ; 30 historiques rejoués contre relanceRecente()), 10 gestes jamais automatiques inclus dans la liste du kit avec 8 gestes de p5:226 exigés, 166+11 mots d'escalade, mention d'IA (10 cas rejoués contre lib/mentionAssistant.ts), PIED_AUTOMATIQUE et PIED_APRES, plafond 20/jour ; modèle claude-haiku-5-5, épinglé
  ✓ « registre recopié faux (2 jours au lieu de 3) » → R1 copie figée « RELANCE_DELAI_JOURS » différente du code (2 ≠ 3)
  ✓ « date illisible comptée comme ancienne (copie du registre dérivée) » → R1 la copie de relanceRecente() ne décide pas comme le code sur 2 historique(s)
  ✓ « le code passe le registre à 4 jours, la copie figée ne suit pas » → R1 (3 ≠ 4)
  ✓ « un palier dépassé renvoyé après un plus haut » → R2
  ✓ « même palier relancé deux fois dans le lot » → R2
  ✓ « relance à moins de 3 jours laissée passer » → R3
  ✓ « STOP ignoré par la relance » → R4
  ✓ « stop non lu pris pour « pas de stop » » → R4
  ✓ « horaires ignorés » → R5
  ✓ « téléphone normalisé trop tôt (avant la relance, dans le banc) » → T4 n'être atteint qu'après la porte et l'exécution
  ✓ « numéro lu dès les cas du banc » → T4 un numéro de téléphone lu avant l'exécution
  ✓ « moment d’envoyer non exigé par le contrat » → T3
  ✓ « numéro trop court accepté » → T1 ("06 39 98 00")
  ✓ « numéro écrit au journal » → T2
  ✓ « mention d’IA ôtée du message sans relecture » → D2
  ✓ « mention d’IA recopiée fausse » → D2 la copie figée ne rend pas ce que rend lib/mentionAssistant.ts
  ✓ « le code change la mention, la copie figée ne suit pas » → D2
  ✓ « sortie du modèle hors schéma acceptée (revalidation ôtée) » → D3 (salutation absente, champ {{prenom}}, champ en trop…)
  ✓ « SMS sans STOP » → D4
  ✓ « prompt sans la règle anti-fabrication » → D1
  ✓ « parseur en autoFix (un second appel au modèle) » → S8
  ✓ « identifiant posé sur le modèle (désépinglé) » → S2
  ✓ « essai de rédaction sans sortie épinglée (modèle appelé) » → S8
  ✓ « geste « jamais en automatique » qui passe la porte » → K3 (marquer_facture_payee…)
  ✓ « gestes de p5:226 sans « envoyer un devis » » → K2
  ✓ « liste du code amputée dans la copie (« payer » ôté) » → K1
  ✓ « le code gagne un geste jamais automatique, la copie figée ne suit pas » → K1
  ✓ « le code gagne un mot d’escalade, la copie figée ne suit pas » → K1
  ✓ « mention manquante acceptée en automatique » → K4
  ✓ « « Presti » accepté dans un message au nom de l’artisan » → K5
  ✓ « STOP (opposition) ignoré par la porte » → K6
  ✓ « SMS sans STOP accepté » → K6
  ✓ « prix absent des faits laissé passer » → K7
  ✓ « créneau inventé laissé passer » → K8
  ✓ « mots d’escalade ignorés dans le message » → K9
  ✓ « lecture en erreur prise pour un accord » → K10
  ✓ « plafond du jour ignoré » → K11 (25 sur 25)
  ✓ « interrupteur coupé ignoré » → X2
  ✓ « coupure oubliée au fil du passage » → X2
  ✓ « idempotence ôtée (même clé exécutée deux fois) » → X3
  ✓ « ligne du pilote permise en mode A » → X4
  ✓ « envoi hors simulation (porte « simulation » retirée) » → S4
  ✓ « une écriture HTTP ajoutée à l’exécution » → S2
  ✓ « indicateur de gain accepté » → H2
  ✓ « « Exemple. » ôté du rapport » → H1
  ✓ « chiffre sans source accepté » → H3
  ✓ « base déclarée présentée comme mesurée » → H4
  ✓ « workflow activé » → S1
  ✓ « workflow d’erreur retiré » → S3
  ✓ « appelable par tout workflow » → S3
  ✓ « contrat d’entrée affaibli (champs en trop acceptés) » → S5
  ✓ « SHA-256 faussé » → S6
  ✓ « banc qui appelle un sous-workflow en source « parameter » » → S3
  ✓ « essai n8n falsifié (sortie retouchée après coup) » → N1 (exécution 414)
lib-relance-n8n-qa : 54 mutants, 54 rouges
OK
```

**Le juge a rougi pendant la construction, sur trois points.**
- **Un cas « hors contrat » mutait la configuration partagée du juge** (`REGLES_R`), ce qui faisait rejeter toutes les relances suivantes. Chaque cas en reçoit désormais une copie.
- **La sortie épinglée était enveloppée deux fois** (`{output:{output}}`) dans `essais-n8n.json`. `rapatrier.mjs` garde maintenant la seule sortie du modèle.
- **Le mutant « palier dépassé renvoyé » est d'abord resté vert.** R2 joue désormais le cas où le palier 3 est déjà parti alors que le palier 2 est atteint.

## Provenance, défauts trouvés en route, fichiers

- **Exports et essais** : recopiés par `rapatrier.mjs` depuis le journal du harnais (les réponses brutes du MCP), sans retouche. On n'ôte que `scopes`. Le script vérifie que le code de chaque nœud Code, et le prompt, sont égaux **octet pour octet** à ceux de `construire.mjs` : « identique ».
- **Un défaut évité avant n8n.** L'outil d'écriture avait transformé les échappements ` `, ` ` et `̀-ͯ` des expressions régulières de la porte en caractères invisibles. Ils ont été remis en échappements ASCII avant la création, et un contrôle confirme qu'il ne reste aucun caractère invisible dans la fabrique.
- **Toute la logique a d'abord été rejouée hors ligne** (harnais jetable dans `/tmp`), puis dans n8n : les 10 exécutions rendent ce que le rejeu prévoyait (N1).
- **Fichiers (14, budget 22)** :
  - `scripts/lib-relance-n8n-qa.mjs` ;
  - dans `.orchestre/preuves/035-005/` : `construire.mjs`, `rapatrier.mjs`, `resume.md`, `essais-n8n.json`, `empreintes-code.json`, les 7 `*.workflow.json` et `verifier.log`.

  `avant.txt` et `decisions-avant.md` viennent d'`orchestre.mjs`. Aucun fichier `app/**`, `lib/**`, `scripts/n8n-specs-qa.mjs`, `scripts/lib-socle-n8n-qa.mjs`, `scripts/lib-metier-n8n-qa.mjs` ni vault n'a été modifié. Rien n'a été commité, poussé, construit, migré ni publié, aucun identifiant n'a été créé, et le modèle n'a jamais été appelé.

## Risques et points à valider

1. **L'accord de mesure (question 5).** Pour lever l'épinglage, il faut l'accord de Benj et un identifiant Anthropic posé par lui dans n8n, de préférence une clé à plafond mensuel. D'ici là, aucun brouillon réel n'existe. Le prompt n'a donc jamais été éprouvé contre le vrai modèle : la porte reste le filet. Le jour de la mesure, les jetons et le coût seront journalisés ; ils sont `null` aujourd'hui.
2. **Tables à naître, au « go » de Benj** : `opportunites` (0185, la carte), la file du pilote (question 1, avec une clé venue de n8n), les interrupteurs par organisation et par agent, et le rapport. Les lectures (registre des quatre chemins, consentement SMS, opposition, compteur du jour) restent des données épinglées.
3. **Écarts au § 5.5**, dans le sens strict sauf le dernier :
   - `lib-relancer` : `donnees.historique` (les quatre chemins, tels que les rend `historiqueRelances()`) remplace `derniere_relance_le`, parce qu'une seule date ne porte ni le chemin (`sauf`) ni l'état « illisible » ; `maintenant` est ajouté ; `stop` et `escalade` acceptent `null` (non lus, ce qui vaut refus) ; le motif `aucun_palier_atteint` est ajouté ;
   - `lib-normaliser-telephone` : `donnees.moment` exigé ;
   - `lib-rediger-message` : `config.nom_artisan` (pour la mention) ; les faits en liste fermée ; les jetons à `null` tant que rien n'est mesuré ;
   - `lib-porte-conformite` : `action.cible` et `action.sans_relecture`, `faits`, `maintenant`, `compteurs` ; `resultat.cible` et `repli` ; le motif `pied_errone` ;
   - `lib-executer` : `config.niveau_max`, `interrupteurs`, `cles_existantes` et `resultat.prevu`.
4. **La porte repose sur des règles textuelles** (montants, dates, créneaux, fournisseurs, marques, mots d'escalade). Elle est prudente : par exemple, « lundi » dans un message est refusé. Un faux refus coûte une carte, jamais un envoi. Un vrai modèle peut trouver des formes non prévues, d'où la mesure de la question 5 avant tout automatisme. Le motif « mentions légales » de la fiche n'est pas couvert : ce sont des relances, pas des devis ni des factures.
5. **Un geste refusé en automatique rend `repli: carte`.** Le parent (035-007) doit le re-présenter en carte. Ce n'est pas encore câblé.
6. **`lib-relancer` et le registre.** Un envoi parti de n8n n'est pas l'un des quatre chemins lus par `lib/relancesRegistre.ts` (première réponse, l.101). Tant que n8n n'écrit pas dans une table lue par ce registre, l'app ne verrait pas une relance partie de n8n. C'est à trancher avec la migration de la carte.
7. **Le juge `lib-relance-n8n-qa.mjs` n'est pas dans `SUITES`** (`scripts/tout-verifier.mjs`, hors de mon périmètre), alors que p5:313 l'exige. Il est hors ligne, dure environ 1 s, sans IA ; à inscrire par la session principale.
8. **Les sous-workflows non publiés ont tourné en manuel sous la politique « en liste ».** En production, un enfant non publié échoue (`fiche-methode-n8n.md:22-23`) : il faudra publier les enfants avant le parent, au « go ». Un avertissement cosmétique de n8n (le nombre de boîtes au premier niveau) n'est pas traité, comme pour 035-004.
