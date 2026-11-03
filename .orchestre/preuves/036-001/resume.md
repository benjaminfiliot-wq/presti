## Ressources utilisées

- **Inventaire de la session** (hôte d'agents Oracle, sans écran) : outil Skill ; MCP `cerveau` (lecture seule ici) ; MCP `n8n-oracle` (n8n local d'Oracle) ; sous-agents `general-purpose` (sonnet, haiku) pour recopier et relire. Les connecteurs Supabase, Vercel, Gmail, Slack et les autres n'ont pas été appelés : ils sont interdits par la tâche. Les skills de design et de vidéo ne servent pas ce lot (aucune page, aucune vidéo).
- **Le réseau neuronal, MCP `cerveau`** :
  - `regles_pour` (« agents n8n multi-comptes, Gmail, données client, envoi automatique Studio Signature… ») rend deux règles. La première est la consigne de Benj de la nuit du 02 au 03/11 : le Cerveau et ses sept départements, sans démonstration. La seconde est la règle n8n-first.
  - `chercher` rend la ligne 036-001 du plan, la fiche 65 de @restructureai (« chaque demande reçoit une réponse en moins de cinq minutes ») et p6 § 1.4.
  - Effet : toute la logique vit dans des workflows n8n. Aucun fichier `app/**` ni `lib/**` n'est touché. Le Cerveau ne fait que lire et router. Rien n'est écrit dans le vault.
- **Le prompt 6, `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`**, lu aux lignes qui portent ce lot :
  - p6:78 (A11, répondre en moins d'une minute, le soir aussi), d'où un banc daté d'un samedi soir et la Signature servie 24 h sur 24 ;
  - p6:332 (les spécialistes de l'Accueil : trieur urgence / peut attendre / curieux / spam / client existant, lecteur de photo, qualificateur), qui donne les cinq classes du trieur ;
  - p6:357-359 (un parent unique multi-comptes, aucun calcul métier dans le parent), qui donne la règle G2 du juge.
- **La première réponse, `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`**, en entier. Ce qu'elle a fixé :
  - la ligne 036-001 du § 4 et ses critères de sortie (Studio sans envoi, Signature avec un type non activé = carte, rejoué deux fois = une carte, deux comptes isolés, escalade = carte) : ce sont les règles A1 à A4, I1 et M2 ;
  - § 3.3 (Studio / Signature par type, `modeEffectif`, `OUTILS_JAMAIS_AUTO`) et § 2.5 (méthode n8n) ;
  - les cinq décisions par défaut. Seule la décision 1 touche ce lot : rien ne passe par un identifiant n8n, et aucun n'est créé.
- **Les vidéos analysées** :
  - `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` : la fiche 9 (l.292-302 : appel classé « vraie urgence, peut attendre, curieux », photo lue, devis « avec vos prix ») et les fiches A13 citées par le plan. Effet : un tri par règles d'abord, puis une photo **décrite**, jamais chiffrée ;
  - `fiches-videos.md` § 5, parcouru, et `plans/analyse-videos.md` et `docs/connaissance-videos/`, pas relus : le plan (§ 2) les a déjà ramenés aux patterns A1 à E. J'ai appliqué ces patterns, pas les vidéos elles-mêmes.
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`**, « Ce qu'il faut retenir » (l.17-49).
  - Le point 2 (« un parent appelle la version PUBLIÉE de l'enfant ») explique la sonde à trois étages (plus bas).
  - Le point 3 (contrat natif mince, un seul nœud final) donne le nœud « Contrat » et un seul « Contrat de sortie ».
- **`fiches-depots.md`** (l.433, « les données épinglées ne couvrent pas les sous-workflows ») : chaque appel est épinglé dans son essai, puis rejoué par le juge (règle P1).
- **Le MCP `n8n-oracle`** :
  - `get_workflow_best_practices` (`triage`), qui a imposé des classes exclusives dans un ordre fixe, un Switch avec sortie de secours vers le journal et un champ de raison (`motifs`) ;
  - `validate_workflow`, pour un essai de concaténation des chaînes du SDK, accepté ;
  - `create_workflow_from_code` (11 créations) et `update_workflow` (code des nœuds, politiques d'appel) ;
  - `test_workflow` (11 exécutions retenues), `get_workflow_execution`, `get_workflow_details` et `search_workflow_executions`.

  Aucune publication, aucune activation, aucun identifiant, aucun appel au modèle.
- **Les gabarits déjà construits**, repris et non refaits :
  - le « Contrat » (`codeEntree`, `codeSortie`) de 035-003, tel quel ;
  - les `lib-*` existants de 035-004 et 035-005, appelés depuis leurs ids : `lib-qualifier-lead`, `lib-decider`, `lib-porte-conformite`, `lib-executer` et `lib-journaliser` ;
  - le parent `ent-exemple-parent` de 035-007, pour la forme (lectures épinglées, issue lue sur la forme, sortie de secours) ;
  - le moteur hors ligne `executer` de `scripts/demo-entreprise-qa.mjs`, importé par le juge.
- **Le code de l'application, vérité du juge** : `lib/pilote/regles.ts` (`MOTS_ESCALADE_TOUJOURS` l.137, `MOTS_ESCALADE_ENTIERS` l.174, `sujetEscalade`, `OUTILS_JAMAIS_AUTO`, `OUTILS_EXECUTABLES_PILOTE`), `lib/plateformeConfig.ts` (`modeEffectif` l.202), `lib/plans.ts` (`peut`), `lib/mentionAssistant.ts` (via `F5.lireCode`).
- **Sources du dépôt** : `CLAUDE.md`, `.claude/rules/*.md` (lus en tête de session), `.orchestre/decisions.md`.

## Ce qui est construit : n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

Les réglages ont été relus par `get_workflow_details` :
- `active: false` et `activeVersionId: null` ;
- `errorWorkflow: yekMM9ewk03F9y2q` (lib-erreur-commune) et fuseau Europe/Paris ;
- succès non sauvés et progression non sauvée.

| Workflow | Id n8n | Nœuds | Rôle | Appelé par (`callerIds`) |
|---|---|---|---|---|
| `presti-cerveau` | `596OC5mL2aMBq6SD` | 23 | Parent multi-comptes, déclenché chaque minute. Il lit l'interrupteur général, les comptes, puis les événements page par page (lectures épinglées en simulation). Il aiguille vers 7 chefs avec une sortie de secours, puis journalise et bat. | personne (`none`) |
| `presti-dep-accueil` | `Ls0oFcQzzAk0rWcP` | 28 | Département 1 : tri → photo → qualification → décision → porte → exécution → journal | Cerveau, banc |
| `lib-trier-demande` | `SrT4QJJmb6LLM1FK` | 8 | Règles d'abord (C10) : 5 classes, escalade lue comme le pilote (copie figée) | Accueil |
| `lib-lire-photo` | `UWjCdC5kv3CXt6jm` | 12 | AI Agent `claude-haiku-5-5` **épinglé** (sans identifiant), parseur JSON Schema, revalidation qui refuse tout chiffre | Accueil |
| `presti-dep-devis` | `dNikTYPKKsivUbd3` | 6 | Squelette : rend `non_branche` (036-005) | Cerveau |
| `presti-dep-suivi` | `jo8eQMEwiB9wCbKN` | 6 | Squelette (036-004) | Cerveau |
| `presti-dep-facturation` | `bNAF6Xzx5On853kD` | 6 | Squelette (036-005) | Cerveau |
| `presti-dep-apres` | `L3GOS7euxi60jCZN` | 6 | Squelette (036-006) | Cerveau |
| `presti-dep-operations` | `74bDhTw6cEBzPORZ` | 6 | Squelette (036-008) | Cerveau |
| `presti-dep-direction` | `oHGOyqsZGoUooxa6` | 6 | Squelette (036-007) | Cerveau |
| `presti-banc-cerveau` | `x7QfmFAZNIxaoUS6` | 6 | Banc : 40 demandes fictives, deux comptes (Studio, Signature), jamais planifié | personne (`none`) |

**Le code dans n8n est celui de la fabrique, octet pour octet.** `rapatrier.mjs` le vérifie sur les 11 exports. La recopie dans n8n a été faite par des sous-agents :
- une première tentative d'un seul bloc de 48 Ko a été arrêtée par un classificateur de sécurité, et sa copie était déjà fautive. Rien n'a été créé ;
- l'Accueil, le banc et le Cerveau ont donc été posés en deux temps : un cadre léger, puis le code de chaque nœud par `update_workflow`.

## Les contrats (versionnés, `1.0.0`)

- **`plans/011-cadrage-01-11/p6-signature/contrats/cerveau.json`** :
  - la table de routage fermée (8 types d'événement vers 7 départements) ;
  - les trois lectures, chacune filtrée sur `artisan_id` ;
  - les schémas de l'interrupteur, du compte, de la page et de l'événement ;
  - les sauts (`palier_non_branche`, `interrupteur_coupe`) et les rejets (`compte_inconnu`, `autre_compte`, `type_sans_departement`, `doublon`, `evenement_hors_forme`).
- **`…/contrats/accueil.json`** :
  - l'enveloppe `presti-dep-accueil@1` (config et données fermées, énumérations, champs obligatoires) ;
  - les contrats `lib-trier-demande@1` et `lib-lire-photo@1`, avec le schéma de sortie du modèle (`chiffrage` toujours `null`) ;
  - les champs du résultat et la règle Studio / Signature / escalade / spam.
- **Hors contrat**, le gabarit 035-003 rend `rejete`, écrit une ligne de journal et ne produit aucun effet.
- **Le juge (C1)** compare le schéma embarqué dans chaque « Contrat d'entrée » au fichier versionné, ainsi que la table de routage du nœud « Aiguiller ».

## Le comportement, et la comparaison au code

**Le Cerveau** (nœud « Aiguiller ») ne calcule rien : aucune arithmétique, aucune date, aucun montant, aucun modèle. Pour chaque page lue :
- un événement dont l'`artisan_id` n'est pas celui de sa page est rejeté (`autre_compte`) ;
- un doublon est rejeté (même clé, même compte) ;
- un type inconnu va au journal ;
- un compte qui n'est pas en palier « simulation » est sauté (`palier_non_branche`). L'ombre et le réel ne sont pas branchés ici ;
- un interrupteur fermé, général ou de département, fait sauter le compte (fail-closed).

Il envoie une enveloppe par (compte, département).

**L'Accueil** :
- **Le tri.** Les coordonnées sont masquées avant d'envoyer le texte au trieur.
- **La décision.** Le niveau 3 n'est demandé que si le mode « auto » est servi, comme le fait `modeEffectif` : le mode choisi est « auto » ET l'offre porte la capacité `plateforme.ia.auto`, lue en base, jamais un nom d'offre. `lib-decider` vérifie ensuite l'offre (`assistant.pilote`), le pilote, le type activé, le plafond, l'escalade et `OUTILS_JAMAIS_AUTO`.
- **L'escalade, ou un tri en échec.** Elle donne une carte interne « à traiter à la main » ; rien ne part chez le client.
- **Une proposition** passe la porte de conformité. Quand elle part sans relecture, la mention d'IA est posée par le code, copie figée de `lib/mentionAssistant.ts`.
- **Sans proposition**, l'effet `demander_brouillon` est prévu pour 036-003.
- **La question manquante** : une seule par demande (B4).

**La copie figée comparée au code (règle E1).**
- `MOTS_ESCALADE_TOUJOURS`, `MOTS_ESCALADE_ENTIERS` et les quatre motifs (`FAUSSE_URGENCE`, `PERTE_D_EAU`, `APPAREIL_PERD`, `NOMS_NEUTRES`), lus dans `lib/pilote/regles.ts`, sont égaux à ceux du nœud « Trier par règles ».
- Chacun des 177 mots, mis dans une phrase, est lu par le trieur comme par `sujetEscalade`.
- Sur les 40 demandes, chaque escalade de l'Accueil a le même mot que le code (règle E2).
- Les listes du pilote (`OUTILS_JAMAIS_AUTO`, `OUTILS_EXECUTABLES_PILOTE`) sont celles du code, relues à chaque passage du juge. `lib-decider` et `lib-porte-conformite` portent déjà leur propre copie, comparée par `lib-metier-n8n-qa` et `lib-relance-n8n-qa` (verts).

**Le banc, rejoué hors ligne (40 demandes, samedi 7 novembre 2026, 21 h 42).**
- Studio : 16 cartes, **0 ligne du pilote**, 4 escalades (fuite, avocat, gaz, « refuit »), 2 spams, 1 refus de la porte (prix inventé), 1 brouillon demandé.
- Signature : **13 lignes du pilote** (le soir et le week-end compris, A11), 4 cartes (3 escalades, plus le geste `marquer_facture_payee`), 1 spam, 1 refus de la porte (date inventée), 1 brouillon demandé.

## Les essais n8n, sur données épinglées (essais-n8n.json)

Ce qui est épinglé à la place d'un appel est la sortie de l'export appelé, rejoué. Le juge le refait à chaque fois (règle P1).

| Exécution | Ce qui est prouvé (sortie de n8n) |
|---|---|
| 468 | `lib-trier-demande`, 8 demandes : urgence (« eau partout », « gaz », « dégât des eaux »), spam (liens multiples), escalade « avocat » |
| 469 | `lib-lire-photo` : une photo décrite ; une description qui dit « 450 € TTC » est **refusée** (« la photo est chiffrée : interdit ») |
| 470 | Accueil, deux comptes, quatre demandes. Studio : 2 cartes, 0 pilote. Signature : 1 ligne du pilote et 1 carte « à la main » (dégât des eaux) |
| 471 | Accueil hors simulation : arrêt « Hors simulation : effet réel non branché », avant tout appel |
| 472 | Squelette `presti-dep-devis` : `rien_a_faire`, `etat: non_branche` |
| 477 | Cerveau de bout en bout, 3 comptes : doublon, autre compte et type inconnu rejetés ; compte « ombre » sauté ; accueil `ok,ok`, devis `rien_a_faire` ; 12 effets prévus, **0 fait** |
| 478 | Cerveau, interrupteur général coupé : `arret: interrupteur_general_coupe`, rien appelé |
| 487 | Accueil avec le trieur **non épinglé** : appel réel Accueil → `lib-trier-demande` accepté, spam rangé, aucune carte |
| 479, 499, 501 | **Sondes, trois étages** (voir ci-dessous) : n8n refuse l'appel du petit-enfant ; statut « erreur », 0 effet, fail-closed |

L'exécution 473 était une copie fautive d'un sous-agent. Elle a été écartée et refaite en 477 ; `rapatrier.mjs` l'écarte parce qu'elle n'a jamais été relue. Les exécutions 474 à 476 sont des sous-exécutions de 473, sans effet (tout est en simulation et sans écriture).

**Constat sur n8n 2.45.7 (sondes 499 et 501).**
- À trois étages (Cerveau → Accueil → trieur), l'appel du trieur échoue sans créer d'exécution.
- Cela arrive même avec l'Accueil, puis aussi le Cerveau, dans ses `callerIds`. Ma sonde a ajouté le Cerveau, puis l'a retiré ; l'état final est celui de l'export.
- À deux étages (essai 487), l'appel passe.
- Explication probable : `fiche-methode-n8n.md:20-22`. Hors de l'enfant direct d'une exécution manuelle, n8n appelle la version **publiée**, qui n'existe pas encore (voulu).
- **La politique d'appel n'est donc pas la seule chose à poser avant la mise en service** : il faut publier les enfants avant les parents. Le passage de bout en bout réel ne se prouvera qu'à la publication (geste de Benj).

## Le juge `scripts/cerveau-accueil-n8n-qa.mjs`

Il est hors ligne, prend environ 110 s et ne lit que ce que n8n a rendu, plus les contrats et le code de l'application. Il ne lit jamais la fabrique. Sortie du 03/11/2026 :

```
✓ cerveau et accueil (11 exports, 11 essais n8n rejoués) : S, C, G2, G4, G6, M1 à M3, E1, E2, A1 à A4, I1, Q1, K1, N1, P1, H1, H2 tenus
  ✓ « Studio qui envoie » → A1 · ✓ « Signature : un type non activé qui part » → A2 · ✓ « un geste de OUTILS_JAMAIS_AUTO qui part » → A3
  ✓ « une escalade qui part seule » → A4 · ✓ « le même événement rejoué deux fois donne deux cartes » → I1 (33 recréées)
  ✓ « une requête sans filtre artisan_id » → M1 · ✓ « un événement d’un autre compte routé » → M2 · ✓ « un mot d’escalade ignoré » → E1
  ✓ « un montant calculé dans n8n » → G6 · ✓ « le Cerveau qui appelle un modèle » → G2 · ✓ « le Cerveau qui calcule » → G2
  ✓ « un workflow actif » → S1 · ✓ « un chef appelable par tous » → S2 · ✓ « la porte simulation contournée » → G4
  ✓ « une photo chiffrée qui passe » → Q1 · ✓ « un squelette qui agit » → K1 · ✓ « un contrat versionné retouché » → C1
  ✓ « une sortie n8n retouchée » → N1 · ✓ « une sortie épinglée retouchée » → P1
cerveau-accueil-n8n-qa : 19 mutants, 19 rouges
OK
```

Les neuf mutants exigés par la tâche sont dans la liste, avec dix autres. Trois d'entre eux ont dû contourner **deux** gardes à la fois pour rougir : Studio, type non activé et geste jamais automatique. La raison : `lib-decider` refait les contrôles d'offre, de type et de liste fermée derrière le chef. C'est voulu (défense en profondeur), et le juge prouve que chaque garde tient seule.

## Le verdict, et le point bloquant (question posée)

`node scripts/orchestre.mjs verifier 036-001` a été lancé le 03/11/2026 (171 s, sortie complète dans `verifier.log`). Verdict : **FAIL**. Juge par juge :
- `cerveau-accueil-n8n-qa` : OK, 19 mutants rouges sur 19 ;
- `lib-socle-n8n-qa` : OK, 35 mutants rouges sur 35 ;
- `lib-metier-n8n-qa` et `lib-relance-n8n-qa` : OK ;
- `n8n-specs-qa .orchestre/preuves/036-001` : **rouge**. Le résumé de l'orchestre cite une ligne de mutant (« A1 lib-alerter… »), mais la cause réelle est celle qui suit ;
- `offres-affichage-qa` et `pilote-qa` ne sont pas atteints par la chaîne `&&`. Lancés à part, avec la même commande : 286 contrôles sur 286, et 95 verts, 0 rouge.

**`n8n-specs-qa` rougit sur les 9 exports `presti-*`, pour la seule règle R5 :**
- la garde commune classe tout workflow qui ne commence ni par `ent-` ni par `lib-` dans la famille « c4 » (les détecteurs en lecture seule, `scripts/n8n-specs-qa.mjs:5-7`) ;
- cette famille interdit l'appel de sous-workflow, son déclencheur, le Switch et le Stop and Error ;
- or la tâche impose ces noms (`presti-cerveau`, `presti-dep-*`, `presti-banc-cerveau`) et cette architecture (p6:357-359), et le fichier `scripts/n8n-specs-qa.mjs` m'est interdit.

**Mesure faite.** Les mêmes exports, renommés en `gabarit-…` dans `/tmp` pour passer en famille stricte, **tiennent R1 à R20**, contrats R16 et empreintes R19 compris. Seul le classement par nom bloque.

La question à options est dans `.orchestre/en-cours/036-001.question.md`. La tâche reste en `en-cours/`.

## Écarts au plan, et points à valider

1. **`lib-rediger-message` n'est pas appelé.** `lib-rediger-message@1` ne rédige que des relances (faits en liste fermée, 035-005, écart 1 de 035-007). L'Accueil fait donc passer par la porte la **réponse que l'application a déjà proposée** (`valider_reponse_proposee`). Sans proposition, il prévoit `demander_brouillon` pour 036-003. Une rédaction de réponse dans n8n demandera `lib-rediger-message@2`.
2. **Un refus de la porte qui admet un repli en carte** (motifs hors horaires ou plafond, possibles en Signature) est rendu dans `refus_porte` avec son `repli`. Il n'est pas re-présenté en carte dans ce passage.
3. **Pas de `lib-disjoncteur` dans le Cerveau.** Un département en panne est journalisé (`departement_en_echec`) et le Cerveau ne tombe pas (`continueErrorOutput`). Le disjoncteur viendra avec les tables de 036-002.
4. **Les lectures du Cerveau sont des emplacements `noOp` épinglés.** Leur note `requete:` est la lecture réelle, filtrée sur `artisan_id` et identique au contrat. La lecture de l'interrupteur système est filtrée par `artisan_id=is.null` (ligne système), admise par le juge.
5. **`lib-lire-photo` garde `passthroughBinaryImages: false`** (R18). Pour lire une vraie image, le passage au réel devra construire le message autrement : décision à prendre avec la mesure du modèle.
6. **Les `callerIds` à ajouter par la session principale** pour un passage réel : `presti-dep-accueil` (`Ls0oFcQzzAk0rWcP`) dans `lib-qualifier-lead`, `lib-decider`, `lib-porte-conformite`, `lib-executer` et `lib-journaliser` ; `presti-cerveau` (`596OC5mL2aMBq6SD`) dans `lib-journaliser` et `lib-battement`. Il faut **ensuite publier les enfants avant les parents** (sondes 499 et 501).
7. **Le juge n'est pas dans `SUITES`** (`scripts/tout-verifier.mjs`, hors périmètre). Il est hors ligne, prend environ 110 s et ne fait aucun appel IA. À inscrire par la session principale (lot 036-012).

## Fichiers (21, budget 22)

- `scripts/cerveau-accueil-n8n-qa.mjs`
- `plans/011-cadrage-01-11/p6-signature/contrats/cerveau.json` et `accueil.json`
- `.orchestre/preuves/036-001/` :
  - `construire.mjs`, `rapatrier.mjs`, `titres-essais.json`, `resume.md`, `essais-n8n.json`, `empreintes-code.json` ;
  - les 11 `*.workflow.json` ;
  - `verifier.log`, écrit par `orchestre.mjs`.
- `.orchestre/en-cours/036-001.question.md`

**Aucun fichier modifié** dans `app/**`, `lib/**`, `supabase/**`, `scripts/n8n-specs-qa.mjs`, `scripts/lib-*-qa.mjs`, `scripts/pilote-qa.mjs`, ni dans le vault.

**Aucun workflow existant n'a été touché** (`presti-*` d'avant, `hermes-*`, `reseau-neuronal-*`, `lib-*` de 035, `ent-exemple-*`) : ils sont seulement appelés ou relus.

**Rien n'a été** commité, poussé, construit, migré, publié ni activé. Aucun identifiant n'a été créé, et le modèle n'a jamais été appelé.
