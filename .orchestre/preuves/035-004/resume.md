## Ressources utilisées

- **Inventaire de la session** (hôte d'agents Oracle, sans écran) : outil Skill ; MCP `cerveau` (lecture seule ici) ; MCP `n8n-oracle` (n8n local d'Oracle). Aucun skill n8n dans la liste. Les skills de design, de vidéo et d'animation ne servent pas ce domaine. Les autres connecteurs (Supabase, Vercel, Gmail…) sont interdits par la tâche : pas un appel.
- **Skill `reseau-neuronal`** : chargé avant de produire. Il fixe l'ordre `regles_pour`, puis `chercher`, puis `lire`, et interdit d'écrire dans le vault (copie du 02/11). Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** :
  - `regles_pour` (« offre entreprise, n8n, pilote… ») rend `[]` ;
  - `chercher`, puis `lire`, de l'**ADR-008** (§ Décision) et de l'**ADR-001** (`vault/10 Presti/04 Décisions/`).
  - Effet : toute la logique de la chaîne vit dans n8n, et aucun fichier `app/**` ni `lib/**` n'est touché. Le pas « testé en dry-run » de l'ADR-001 donne la porte « simulation » et l'arrêt qui la suit.
- **Le prompt 5, `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`**, lu en entier.
  - p5:155-156 (le parent ne fait que router ; des enfants à responsabilité unique, rangés en couches) : capture, qualification et décision font trois `lib-*` distincts. Le banc ne fait que les enchaîner.
  - p5:189 (Qualification : ne rien inventer ; aucun critère discriminant) : la grille en liste fermée, et le refus des critères discriminants.
  - p5:226 (« jamais en automatique ») : les gestes ajoutés à la liste du code.
  - p5:315 (un geste interdit reste une carte, même réglé en automatique) : l'épreuve P3.
  - p5:217 (le code calcule les montants) : le montant de `lib-decider`.
  - p5:318 (la porte « simulation ») : la porte et l'arrêt.
- **L'addendum `prompts-benj/benj-0111-addendum.md`** (§ 1, migration une par une, en dry-run ; § 7, sécurité) : rien n'est publié, rien n'est écrit en base, aucun identifiant n'est créé.
- **La première réponse, `p5-entreprise/premiere-reponse.md`** :
  - ligne 035-004 du tableau ;
  - § 4.3 à 4.6 : le parent, la chaîne d'un agent, les réglages ;
  - § 5.3, la fiche « Qualification » ;
  - § 5.5, les contrats `lib-capturer-lead@1`, `lib-qualifier-lead@1` et `lib-decider@1`, suivis à la lettre, avec les écarts dits plus bas ;
  - la question 27 (doublon sur une empreinte calculée en base) et la question 1 (mode A : niveau 2 au plus) ;
  - l'**Amendement B1** : la liste du kit est la liste du code **plus** les gestes de p5:226, et le juge vérifie l'**inclusion**.
- **`p5-entreprise/fiche-methode-n8n.md`** :
  - § 3.2 « Décision » : une copie figée des capacités et des listes du pilote, comparée au code par la suite ;
  - :819 : capturer sans jamais lire de colonne non permise, et ne rien marquer « traité » avant l'effet. D'où une réclamation prévue `a_traiter → en_cours`, par mise à jour conditionnelle ;
  - :821-824 : la note et la décision viennent de règles, sans modèle ;
  - :884-892 : la vraie garde de l'idempotence est la contrainte unique en base ;
  - :904-912 : la porte « simulation » avant tout effet.
- **`p5-entreprise/fiches-depots.md`** (lu par un sous-agent `haiku`, Explore, en lecture seule, puis vérifié aux lignes citées) :
  - :669 : « constater l'absence de contact suppose de le voir ; prévoir un booléen calculé en base ». C'est le choix de `contact_empreinte`, qui sert à la fois au filtre « a un moyen de contact » et au doublon ;
  - :672 : la grille vient de la configuration du client, jamais du code ;
  - :675 : un geste interdit reste une carte ;
  - :433-434 : les sous-workflows ne sont pas couverts par les données épinglées. Le banc appelle donc les enfants pour de vrai, et ces enfants sont du Code pur, sans effet ;
  - :86 : chaque enfant désigne `lib-erreur-commune` comme workflow d'erreur.
- **`p5-entreprise/fiches-videos-restructureai.md`** (11 vidéos de @restructureai, colonne « Ce qui s'applique à Presti ») :
  - :181 (vidéo 5) : « une note d'intérêt se calcule par le code, pas par le modèle ». D'où `lib-qualifier-lead` sans modèle ;
  - :313 (vidéo 9) : le tri en trois classes (urgence, peut attendre, curieux). D'où les trois priorités `haute`, `normale` et `a_revoir`, et le critère `urgence` de la grille d'exemple ;
  - :41 (vidéo 1) : « une exception arrive préparée » ; une décision rend donc une **carte** prête, avec le montant calculé par le code, et pas une simple alerte.
- **`p5-entreprise/fiches-videos.md`** (lu par le même sous-agent) :
  - :43-46 : une règle avant tout modèle ;
  - :59-62 : les interdits communs (rendez-vous pris seul, paiement), d'où `prendre_rendez_vous` et `encaisser` dans les gestes du kit ;
  - :258-259 : aucune décision d'argent par un modèle ;
  - :651-656 : l'escalade reste humaine. D'où `escalade` absente ou vraie : une carte.
- **`docs/connaissance-videos/`** (déjà analysées) : pas relues en entier. Les fiches ci-dessus les résument pour le prompt 5, et aucune n'ajoute de règle à ces trois gabarits.
- **Le code, lu et chargé pour de vrai** : `lib/pilote/regles.ts` (listes du pilote, `SOURCE_OK`, `decisionPilote`) et `lib/plans.ts` (`peut(plan, 'assistant.pilote')`). Le juge les charge à chaque passage par `scripts/ts-loader.mjs`.
- **Les migrations** :
  - `supabase/migrations/0189_role_lecture_n8n.sql:41` : les colonnes de `leads` que n8n peut lire. Elles fixent la lecture prévue, et le juge les relit ;
  - `0190_demandes_demo.sql` : la table n'a pas de colonne d'organisation, d'où le refus de la source `demandes`.
- **Le jeu fictif `.orchestre/preuves/035-006/exemple/`** (« Exemple. Bâti-Démo »). `demandes.json` sert au banc : ses cas limites sont …0130 (sans contact), …0102 et …0103 (doublon), …0106 (litige), …0121 (escalade).
- **MCP `n8n-oracle`** :
  - `get_workflow_sdk_reference` (`rules`) : pas d'`alwaysOutputData` par défaut ; une liste vide arrête proprement la chaîne ;
  - `get_workflow_best_practices`, technique `triage` : une sortie de secours pour ce qui n'est pas classé. C'est la liste fermée de `lib-decider`, où un outil inconnu devient une carte (P12) ;
  - `get_workflow_best_practices`, technique `data_transformation` : valider les données externes d'abord ;
  - `validate_workflow`, puis `create_workflow_from_code` (×4), `update_workflow` (politique d'appel, étiquettes, deux corrections du qualifier), `test_workflow` (8 exécutions), `get_workflow_execution`, `get_workflow_details` et `search_workflows`.
  - Aucun `publish_workflow` ni aucun identifiant n'ont été utilisés.
- **Le socle de 035-003** (`.orchestre/preuves/035-003/construire.mjs`, importé en lecture) : `codeEntree`, `codeSortie`, `reglagesEnfant` et le SHA-256 écrit à la main, réutilisés tels quels. Le juge vérifie les mêmes empreintes du corps commun.

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Étiquettes | Rôle |
|---|---|---|---|
| `lib-capturer-lead` | `yj7KzcEjf04iTAcm` | `lib`, `couche-capture` | Les nouvelles demandes (table `leads`), sans jamais lire le contact |
| `lib-qualifier-lead` | `uvGWZR8fHnXURRV6` | `lib`, `couche-qualification` | Note selon la grille du client, priorité, délai cible ; doublon sur l'empreinte (question 27) |
| `lib-decider` | `hckqX1tQjIommtTH` | `lib`, `couche-decision` | Carte, pilote ou rien ; niveau 1 à 3 ; motif ; clé ; montant ; copie figée des listes du pilote |
| `lib-banc-metier` | `A391vnnTMKmJGhgT` | `lib`, `couche-essai` | Banc : capture → qualification → décision sur Bâti-Démo, plus les gestes jamais automatiques ; seul appelant permis des trois |

**Réglages, sur chacun** (relus par `get_workflow_details`) :
- `active: false` et `activeVersionId: null` ;
- `timezone: Europe/Paris` ; `executionTimeout` de 60 s (120 s pour le banc) ;
- `saveDataSuccessExecution: none`, `saveDataErrorExecution: all` ;
- `errorWorkflow: yekMM9ewk03F9y2q` (`lib-erreur-commune`, 035-003) ;
- les trois enfants : `callerPolicy: workflowsFromAList`, `callerIds: A391vnnTMKmJGhgT` (le banc). Le banc lui-même est en `callerPolicy: none`.

Le squelette est celui du socle :

> Appelé par un parent (passthrough) → Contrat d'entrée → Entrée conforme ? → Porte simulation → logique → Contrat de sortie.

La sortie « faux » de la porte mène à « Hors simulation : non branché » (Stop and Error). **Mode A :** il n'y a aucun nœud de lecture, d'écriture ni d'envoi. Ce que ferait la base est épinglé à l'entrée, et tout l'effet part dans `effets_prevus`.

Les sept `lib-*` de 035-003 et les `presti-*` n'ont pas été touchés : `updatedAt` est inchangé (21:31 UTC au relevé final).

## Chaque `lib-*` : contrat, essai sur données épinglées

Les contrats suivent l'`enveloppe@1` et les blocs de PR § 5.5. Chacun est en `sans_contact: true` : un e-mail ou un téléphone, où qu'il soit, fait rejeter l'entrée. Les écarts au § 5.5 sont tous dans le sens strict ; ils sont listés au point 3 des « Points à valider ».

### `lib-capturer-lead` (`yj7KzcEjf04iTAcm`) — `lib-capturer-lead@1`

**Entrée :**
- `config { source ∈ {demandes, leads}, lot_max 1..200 }` ;
- `donnees { depuis?, lignes[] }`. En mode A, `lignes` est ce que rendrait la lecture prévue. Chaque ligne porte **exactement** `id, artisan_id, statut, canal, origine, urgence, type_chantier, created_at, contact_empreinte, etat_capture`, avec `additionalProperties: false`. Une colonne `contact`, `nom_prospect` ou `message` fait rejeter l'entrée (L4).

**Sortie :**
- `resultat { evenements[{ id, type: demande_recue, recu_le, champs, empreinte_contact }], reclames }` ;
- en plus, en mode A : `ecartes[{ id, motif }]`, `restants`, `urls_ignorees`.

**Effets prévus :**
- `lire_demandes` : `GET /rest/v1/leads?select=<les 10 colonnes>&artisan_id=eq.<org>&etat_capture=eq.a_traiter&contact_empreinte=not.is.null&order=created_at.asc,id.asc&limit=<lot_max>` ;
- `reclamer` : PATCH conditionnel `etat_capture=eq.a_traiter` → `en_cours`.

**Le contact n'est jamais lu.** Le filtre `contact=not.is.null` de PR § 5.5 ne marcherait pas pour le rôle de lecture de n8n : 0189 ne lui accorde pas la colonne `contact`, et Postgres exige le droit de lecture sur une colonne filtrée. La présence d'un contact se lit donc sur `contact_empreinte`, une colonne générée en base à naître (question 27). Elle sert aussi au doublon.

**Autres règles :**
- **Isolation :** une ligne d'une autre organisation est écartée sans que son identifiant soit recopié.
- **URL :** un champ porteur d'une adresse web est ôté. Aucune n'est appelée : il n'existe aucun nœud HTTP.
- **Source `demandes` :** refusée, parce que `demandes_demo` (0190) n'a pas de colonne d'organisation. Elle est lue par `presti-demande-demo` (L19).

**Essai n8n 388** (3 enveloppes) :
- un lot mêlé de 7 lignes, avec `lot_max` à 2. Il rend 2 événements (…0501 et …0502, dont le champ URL est ôté), 1 restant, et 4 écartées : sans contact, doublon, autre organisation (`id: null`), déjà réclamée ;
- la source `demandes` : `refuse` ;
- une ligne porteuse de `contact` : `rejete` (« lignes[0].contact : champ hors contrat »).

**Essai n8n 389** (`simulation: false`) : arrêt sur « Hors simulation : effet réel non branché ». La logique n'est jamais atteinte.

### `lib-qualifier-lead` (`uvGWZR8fHnXURRV6`) — `lib-qualifier-lead@1`

**Entrée :**
- `config { grille[{ critere, poids 0..100 }] ≤ 30, seuils { haute, normale }, delais_cibles_min { haute, normale, a_revoir }, empreintes_connues[] (mode A) }` ;
- `donnees { lead_id, evenement_id?, empreinte_contact (64 hex | null), champs }`. Les `champs` sont une liste fermée, sans texte libre ni `/`, `@` ou `:` : `canal, origine, urgence, type_chantier, taille, activite, budget_tranche, delai_souhaite, surface_m2, photo_jointe, dans_zone, recu_hors_horaires`.

**Grille :** un critère s'écrit `champ`, `champ=valeur`, `champ>=n` ou `champ<=n`. Un champ hors liste, ou discriminant, fait **refuser la grille entière**. La liste suit le Code pénal, art. 225-1 : âge, sexe, origine, nom, lieu de résidence, code postal, santé, religion…

**Sortie :** `resultat { note, categorie, priorite, delai_cible_min, raison, doublon, doublon_de, lead_id }`.
- Un champ absent ne rapporte rien et est dit « inconnu ». Si plus de la moitié du poids manque, la demande est « à revoir ».
- Un doublon donne « à revoir ».
- Le résultat est **revalidé** avant tout effet : hors schéma, le statut est `erreur` et aucun `ecrire_note` n'est prévu.
- La clé suit `org:qualification:<lead>:<événement>`, condensée en `h:qualification:<48 hex>`.

**Doublon :** il se lit sur l'empreinte, jamais sur le contact. Il est trouvé contre `empreintes_connues` (en production, une lecture `contact_empreinte=in.(…)` du lot), ou dans le lot lui-même, et toujours **par organisation**.

**Essai n8n 392** (7 entrées) :
- grille satisfaite : 100, `haute`, 15 min ;
- empreinte en base : doublon de …0600, à revoir ;
- 0 sur 100 : à revoir ;
- même empreinte dans le lot : doublon de …0603 ;
- trois champs inconnus : 30, à revoir, « grille trop incomplète » ;
- `age>=30` : `refuse` ;
- poids nuls : `erreur`, « résultat hors schéma (note) : aucune note ne change ».

### `lib-decider` (`hckqX1tQjIommtTH`) — `lib-decider@1`

**Entrée :**
- `config { autonomie { niveau_max 1..3, niveau_defaut 1|2, niveaux { type: 1|2 } } }` (seul champ obligatoire, comme au § 5.5), plus `plan`, `pilote { drapeau, actif, types }` (lus par l'appelant dans `pilote_reglages`, jamais une seconde copie) et `parties_depuis_24h`. Ces trois derniers sont **facultatifs et fail-closed** : absents, rien ne part seul ;
- `donnees { objet_type, objet_id, constat { outil, etape?, escalade?, lignes[{ prix_unitaire_ht_centimes, quantite, source_prix }]?, montant_centimes_base? } }`.

**Niveaux** (P3:540-548) :
- 1 = propose : `rien`, une ligne au journal ;
- 2 = carte à valider ;
- 3 = pilote, 10 min pour annuler.

**Le niveau 3 exige tout à la fois :**
- `niveau_max` à 3, alors que le mode A en met 2 (question 1) ;
- un geste hors de la liste « jamais » du kit ;
- `escalade === false` ;
- le drapeau ;
- un outil exécutable par le pilote ;
- une offre qui a `assistant.pilote` ;
- `pilote.actif` et le type actif ;
- des prix sourcés pour un envoi de devis ;
- `parties_depuis_24h` connu et sous 20, avec le compte tenu dans le lot.

Sinon, c'est une carte. Un outil inconnu devient aussi une carte.

**Sortie :** `resultat { action, type_action, niveau, motif, cle_idempotence, montant_centimes, objet_id }`.
- `montant_centimes` = Σ arrondi(quantité × prix en centimes), calculé par le code. Il vaut `null` dès qu'un prix manque.
- Effets prévus : `ecrire_carte` ou `mettre_en_file_pilote`.
- Une même clé, rejouée dans le lot, donne `rien_a_faire`.

**Essai n8n 393** (10 entrées) :
- …0701 (Signature, tout permis, 19 envois automatiques déjà faits) : **pilote**, niveau 3, montant 27 025 ;
- …0702 : carte, motif `plafond` (le 20ᵉ envoi est pris) ;
- …0701 rejoué : `rien_a_faire` ;
- `envoyer_devis` aux prix sourcés : carte, motif `geste_p5_226` ;
- `payer` : carte, `jamais_auto` ;
- escalade : carte, montant de base 132 000 ;
- Studio : carte, `offre` ;
- `creer_chantier` : carte, `type_non_pilotable` ;
- réglages du pilote absents : carte, `drapeau` ;
- niveau 1 : `rien`.

**Essai n8n 394** (`simulation: false`) : arrêt avant la logique.

### Le banc `lib-banc-metier` (`A391vnnTMKmJGhgT`) — essai n8n 395

Il appelle pour de vrai les trois enfants, non publiés, en source `database`, sous la politique « en liste ». Les sous-exécutions ont tourné, dont 397 pour le qualifier.

**Branche Bâti-Démo :**
- la capture rend 7 événements ;
- …0130 est écarté (sans contact) et …0102 (déjà traité) aussi ;
- la qualification trouve …0103 doublon de …0102 ;
- la décision, avec le pilote réglé « actif » mais en mode A, donne **7 cartes** : 5 `niveau_max` et 2 `escalade` (…0106 litige, …0121).

**Branche « gestes » :**
- les 21 gestes de la liste du kit, tout permis, niveau 3 permis, sous Entreprise, restent **21 cartes** (10 `jamais_auto`, 11 `geste_p5_226`) ;
- Studio donne 1 carte (`offre`) ;
- Signature donne 1 pilote.

Bilan : `defauts: 0`.

## La copie figée des listes du pilote, comparée au code

Elle est figée dans le nœud « Décider » : `const COPIE_PILOTE = {…}` et `const GESTES_P5_226 = […]`, sous un repère. Elle a été produite en chargeant le vrai code au moment de la construction (`construire.mjs`, `lireCodePilote`).

**À chaque passage, le juge recharge `lib/pilote/regles.ts` et `lib/plans.ts`** (enfant Node, `--experimental-strip-types`, `scripts/ts-loader.mjs`) et exige deux choses.

- **P1, égalité de la copie** sur les huit valeurs du code :
  - `TYPES_PILOTE` (6) ;
  - `OUTIL_TYPE` (9) ;
  - `OUTILS_EXECUTABLES_PILOTE` (6) ;
  - `OUTILS_JAMAIS_AUTO` (10, `regles.ts:79-82`) ;
  - `PLAFOND_AUTO_JOUR` (20) ;
  - `DELAI_ANNULATION_MIN` (10) ;
  - `PLANS_PILOTE` (`business`, `entreprise`, `signature`, calculé par `peut`) ;
  - `SOURCE_OK`, lu dans le texte de `regles.ts` parce qu'il n'est pas exporté.

  Une dérive du code, comme un geste ajouté ou Studio ouvert au pilote, fait rougir P1 : deux mutants côté code le prouvent.
- **P2, inclusion (Amendement B1)** : `OUTILS_JAMAIS_AUTO` du code ⊆ liste du kit (`OUTILS_JAMAIS_AUTO` ∪ `GESTES_P5_226`). Le juge exige en plus, écrits chez lui sans les lire dans l'export, les gestes de p5:226 : `envoyer_devis`, `envoi_devis`, `encaisser`, `declarer_urssaf`, `declarer_impots`, `supprimer_donnees`, `passer_appel`, `prendre_appel`.
  - Le kit y ajoute `modifier_prix_sans_source`, `toucher_moyen_paiement` et `prendre_rendez_vous`, ainsi que les préfixes `supprimer_`, `declarer_`, `encaisser_`, `rembourser_` et `payer_`.
  - `lib/pilote/regles.ts` n'est pas modifié : rien ne change pour Signature (p5:275).

## Le juge `scripts/lib-metier-n8n-qa.mjs`

Il est hors ligne : il rejoue tels quels les nœuds Code des exports (`node:vm`), en suivant leurs connexions. Les nœuds Execute Sub-workflow du banc rejouent l'export enfant désigné, après avoir vérifié sa politique d'appel. Il fait ensuite les épreuves S, C, L, Q, P, B et N, puis les 35 mutants. La commande prend environ 0,7 s, sans IA.

Les juges de la commande `verifier` sont verts :
- `node scripts/lib-socle-n8n-qa.mjs` : **OK, 35 mutants, 35 rouges** ;
- `scripts/n8n-specs-qa.mjs .orchestre/preuves/035-004` : **OK**, les 4 exports tiennent R1 à R20 et ses 88 mutants restent rouges.

Sortie du juge métier, au 02/11/2026, sur les exports et essais rapatriés (lignes « → » abrégées) :

```
✓ chaîne capture → décision (3 gabarits et le banc, 6 essai(s) n8n rejoué(s)) : S1 à S7, C1 à C3, L1 à L7, Q1 à Q9, P1 à P13, B1 à B3, N1 et N2 tenus
  copie figée du pilote = code (lib/pilote/regles.ts, lib/plans.ts) : 10 gestes jamais automatiques, 6 outils pilotables, offres business/entreprise/signature ; liste du code incluse dans celle du kit, avec 8 gestes de p5:226 exigés
  ✓ mutant « liste du pilote amputée (« payer » ôté de la copie) » → P1 copie figée « OUTILS_JAMAIS_AUTO » différente du code
  ✓ mutant « offre Studio ajoutée aux offres du pilote » → P1 copie figée « PLANS_PILOTE » différente du code
  ✓ mutant « plafond du jour recopié faux (25) » → P1 (25 ≠ 20)
  ✓ mutant « gestes de p5:226 sans « envoyer un devis » » → P2 (manquent : envoyer_devis, envoi_devis)
  ✓ mutant « geste « jamais en automatique » décidé en automatique (contrôle ôté) » → P3 (business) : envoyer_devis
  ✓ mutant « contrôle de l’offre ôté (Studio au niveau 3) » → P4 l'offre gratuit atteint le niveau 3
  ✓ mutant « niveau maximal ignoré (mode A au niveau 3) » → P6
  ✓ mutant « plafond du jour ignoré » → P7 : 25 pilote(s) sur 25
  ✓ mutant « escalade non lue prise pour une absence d’escalade » → P8
  ✓ mutant « montant sans la quantité » → P9 (16983 au lieu de 28024)
  ✓ mutant « même objet décidé deux fois (idempotence ôtée) » → P10
  ✓ mutant « réglages du pilote absents pris pour « actif » (fail-open) » → P11
  ✓ mutant « un contact lu (colonne « contact » acceptée et rendue) » → L4 la logique lit ou rend un champ de contact (contact)
  ✓ mutant « le contact demandé dans la lecture prévue » → L4 colonne non permise par 0189 ou un contact (contact)
  ✓ mutant « demande sans contact capturée » → L1
  ✓ mutant « doublon laissé passer à la capture » → L2 (lot : 3, rejeu : 0)
  ✓ mutant « URL d’un prospect laissée dans l’événement » → L3
  ✓ mutant « ligne d’une autre organisation capturée » → L5
  ✓ mutant « lot non borné » → L6 (5, 0)
  ✓ mutant « doublon laissé passer (empreintes en base ignorées) » → Q1
  ✓ mutant « doublon entre deux organisations (clé sans organisation) » → Q3
  ✓ mutant « critère discriminant accepté (« age » permis, garde ôtée) » → Q5
  ✓ mutant « champ absent compté comme rempli (valeur devinée) » → Q6
  ✓ mutant « résultat hors schéma qui change la note (revalidation ôtée) » → Q7
  ✓ mutant « porte « simulation » retirée » → S4
  ✓ mutant « workflow activé » → S1
  ✓ mutant « workflow d’erreur retiré » → S3
  ✓ mutant « appelable par tout workflow » → S3
  ✓ mutant « une lecture HTTP ajoutée à la capture » → S2
  ✓ mutant « contrat d’entrée affaibli (champs en trop acceptés) » → S5
  ✓ mutant « SHA-256 faussé » → S6
  ✓ mutant « banc qui appelle un sous-workflow en source « parameter » » → S3
  ✓ mutant « le code du pilote gagne un geste jamais automatique, la copie figée ne suit pas » → P1
  ✓ mutant « le code du pilote ouvre le pilote à Studio, la copie figée ne suit pas » → P1
  ✓ mutant « essai n8n falsifié (sortie retouchée après coup) » → N1 (exécution 393)
lib-metier-n8n-qa : 35 mutants, 35 rouges
OK
```

Le juge a lui-même rougi pendant la construction, sur deux points.
- **Le mutant « contrôle ôté » est d'abord resté vert.** Sans la liste, `envoyer_devis` restait arrêté par la garde des prix, parce que l'épreuve ne donnait aucun prix sourcé. P3 joue désormais chaque geste **avec des prix sourcés** : la liste y est la seule garde en jeu.
- **B3 a d'abord échoué sur l'ordre des deux bilans.** n8n finit une branche avant l'autre, alors que l'exécuteur hors ligne avance en largeur. Les deux bilans se comparent maintenant sans ordre.

## Provenance, défauts trouvés en route, fichiers

- **Exports et essais** : recopiés par `rapatrier.mjs` depuis le journal du harnais (les réponses brutes du MCP), sans retouche. On n'ôte que `scopes`. Le code de chaque nœud des exports est égal, octet pour octet, à celui de `construire.mjs` (contrôle fait ; S5 et N1 le tiennent ensuite).
- **Un défaut réel, trouvé par l'essai n8n 390.** La forme des critères (`[a-z_]`) refusait `surface_m2`. Corrigée en `[a-z][a-z0-9_]{0,39}`, la grille a été rejouée en 392 et le banc en 395. Les exécutions 383 (banc) et 390 sont écartées du rapatriement, et le script le dit.
- **Un commentaire reformulé.** Le juge commun lisait `lib-qualifier-lead@1.resultat` comme une adresse e-mail (R8). Le changement ne touche qu'un commentaire, à 22:36 UTC, après les essais 392 et 395 : ces deux exécutions ont tourné sur le code d'avant, au commentaire près. N1 et B3 rejouent les mêmes entrées sur l'export final et trouvent des sorties identiques.
- **Fichiers (11, budget 16)** :
  - `scripts/lib-metier-n8n-qa.mjs` ;
  - dans `.orchestre/preuves/035-004/` : `construire.mjs`, `rapatrier.mjs`, `resume.md`, `essais-n8n.json`, `empreintes-code.json`, les 4 `*.workflow.json` et `verifier.log`.

  `avant.txt` et `decisions-avant.md` viennent d'`orchestre.mjs`. Aucun fichier `app/**`, `lib/**`, `scripts/n8n-specs-qa.mjs`, `scripts/lib-socle-n8n-qa.mjs` ni vault n'a été modifié. Rien n'a été commité, poussé, construit, migré ou publié, et aucun identifiant n'a été créé.

## Risques et points à valider

1. **Deux colonnes à naître sur `leads`** : `contact_empreinte` (générée en base) et `etat_capture`. Elles demandent une migration au « go » de Benj, à coller puis à accorder à `n8n_lecture`. Jusque-là, la lecture et la réclamation restent des effets prévus. Il faut aussi les ajouter au `grant` de 0189, sans `contact`.
2. **L'empreinte d'un téléphone se force par essais**, avec environ 10⁹ numéros. Je propose `digest(organisation_id || contact normalisé)` (sel par organisation, ce qui empêche aussi tout rapprochement entre organisations), et qu'elle ne sorte jamais du `select` de n8n vers un journal ou une alerte. C'est déjà le cas : elle ne va que dans l'événement et dans la comparaison. **À trancher par Benj**, avec la migration.
3. **Écarts au § 5.5, tous dans le sens strict** :
   - `delais_cibles_min` est obligatoire dans la config du qualifier, parce qu'un délai cible ne se suppose pas ;
   - `resultat` gagne `doublon_de` et `lead_id` (qualifier) et `objet_id` (décideur) ;
   - `lignes`, `empreinte_contact`, `evenement_id`, `plan`, `pilote` et `parties_depuis_24h` sont ajoutés en facultatif, au titre du mode A ;
   - le champ des prix est en centimes entiers (`prix_unitaire_ht_centimes`) ;
   - la source `demandes` est refusée par la capture.
4. **Les niveaux 1, 2 et 3** reprennent P3:540-548 : propose, prépare, fait seul. Le niveau 3 reste sous `niveau_max`, que le mode A fixe à 2 (question 1). Le passage au niveau 3 exige l'exception A et la migration de la file du pilote (question 1, `0174:32`).
5. **`envoyer_devis` est jamais automatique pour l'Entreprise**, même avec tous ses prix sourcés : c'est la question 29, défaut « oui ». Signature n'est pas touché.
6. **L'escalade est un drapeau d'entrée** : n8n ne lit aucun texte de client. Elle doit être calculée en amont, par `sujetEscalade` au départ, ou par la porte (035-005). Un drapeau absent vaut escalade, côté sûr.
7. **Les juges `lib-metier-n8n-qa.mjs` et `lib-socle-n8n-qa.mjs` ne sont pas dans `SUITES`** (`scripts/tout-verifier.mjs`), ce qui est hors de mon périmètre. Ils sont hors ligne, durent environ 1 s chacun, sans IA ; `lib-metier` charge le code TS par un enfant Node.
8. **Un avertissement cosmétique** de n8n sur le banc (« 10 boîtes au premier niveau ») n'est pas traité : le banc est provisoire, et il s'archive quand les `ent-*` existent (035-007).
9. **Les sous-workflows non publiés ont été appelés en manuel par le banc** et ont tourné sous la politique « en liste ». En production, un enfant non publié échoue (`fiche-methode-n8n.md:22-23`) : il faudra publier les enfants avant le parent, au « go ».
