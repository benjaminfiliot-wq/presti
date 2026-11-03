## Ressources utilisées

Session : hôte d'agents Oracle, sans écran, modèle Sonnet 5.5. Inventaire fait avant de produire : outil Skill, MCP `cerveau` (copie du vault du 02/11, lecture seule), MCP `n8n-oracle` (n8n local d'Oracle), sous-agents. Les skills de design, de vidéo et de pages
(presti-design, frontend-design, hyperframes…) ne servent pas ce domaine et n'ont pas été chargés ; `ecc:security-review` et `presti-audit-attaque` n'ont pas été invoqués comme outils (aucun fichier de `app/**`, `lib/**` ni `supabase/**` n'est touché) : leurs points
ont été appliqués à la main sur ce diff (aucun secret, isolation par compte, aucun texte libre d'agenda ni de client dans une sortie, aucune adresse ni téléphone).

- **Skill `reseau-neuronal`** : chargé en premier ; il impose `regles_pour`, puis `chercher`, puis `lire`, et interdit d'écrire dans le vault. Rien n'a été écrit dans le réseau neuronal.
- **MCP `cerveau`** : `regles_pour` (« workflows n8n inactifs en simulation : agenda, rappel de la veille, stock, import ; aucun envoi, aucun rendez-vous posé seul ») rend `[]` ; `chercher` (« agenda créneaux libres rendez-vous rappel veille stock seuil commande fournisseur import export »)
  a rendu la ligne « agenda, chantiers, stock » du § 1.2 du prompt 6, la compétence `competences/operations.md` (pas à pas, décision 5), la ligne « Opérations » de `premiere-reponse.md` § 3.2, la note `plans/016-assistant.md` § 3 (inventaire : lire libre, préparer en brouillon, **commande envoyée = validation**)
  et `c4-rapports/R1-existant.md` § 1.4 (les outils `enregistrer_commande`, `relancer_commande`). Effet : le périmètre exact du département, et « commande = carte, jamais seule ».
- **Le prompt 6 : `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`** : partie 0 (B10 l.107 « l'import d'un export, circuit contrôlé de “Mes chiffres” : lecture, aperçu validé » ; C3 l.121 « chaque donnée porte lu dans <outil> le <date> ou déclaré » ; § 0.4 les connecteurs ; § 0.6 les règles qui ne bougent pas) et
  prompt 1 (§ 1.2 ligne 6 « Opérations »). Effet : les deux phases de `lib-synchroniser-outil` (aperçu, écriture), la provenance de chaque ligne, les neuf champs de la fiche agenda.
- **La première réponse : `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`** : § 2.2 (B10) et § 2.3 (C3 : « colonne `source` des imports »), § 3.2 (ligne 6, connecteurs et leur ordre, nœud `calendar.availability`), § 3.3 (ligne « Rendez-vous posé sur un créneau libre » : carte dans les deux offres),
  § 4 (ligne 036-008), § 5 (décisions 1 et 5 appliquées : aucune autorisation dans n8n ; le rendez-vous se pose après un clic ; le rappel de la veille reste une carte). Effet : le contrat de chaque spécialiste et le choix de ne rien envoyer.
- **Les vidéos déjà analysées** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` (l.940, « les procédures comme compétences écrites… stockées dans le compte du client, sous RLS » ; l.337 de `plans/analyse-videos.md` pour la ligne « Opérations ») et, par le prompt 6, B10 (mikalianov, 15,2-31,7 s) et C3 (RWKyUJLi-kI, 03:24-03:26).
  Effet : l'import n'est jamais direct (le client ouvre et confirme), et chaque chiffre importé dit d'où il vient.
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md` (« Ce qu'il faut retenir », l.17-49) et `fiches-depots.md` (l.666-681, gabarit `lib-synchroniser-outil`)** : point 2 (un parent appelle la version **publiée** de l'enfant : le chef est donc essayé avec les sorties des enfants **épinglées**, le banc appelle les enfants directement),
  3 (un seul nœud final, nœud Code de contrat), 6 (l'idempotence est une clé unique en base : `imp:<ref>`, `cmd:<article>:<jour>`, `rv:<id>`, `cr:<ref>:<jour>`), 8 (« Supabase account » passe outre la RLS : chaque ligne lue porte `artisan_id`, un test « autre compte » par fonction). Gabarit `lib-synchroniser-outil` : « une page vide arrête la boucle ; un rejeu ne duplique rien » → pagination bornée et écriture par clé.
- **MCP `n8n-oracle`** : `get_workflow_sdk_reference`, `get_workflow_best_practices` (`scheduling` : ni planificateur ni attente ici, le rappel de la veille est un événement ; `human_in_the_loop` : pas de document, l'attente d'un humain reste dans les cartes « À valider » de Presti, pas dans n8n),
  `search_nodes` (relevé : `n8n-nodes-base.googleCalendar` avec `calendar.availability`, `microsoftOutlook` avec `event.getAll` et `event.create`, `executeWorkflow`, `stopAndError`), `create_workflow_from_code` (×3), `update_workflow` (le chef rempli **en place**, son identifiant d'origine `74bDhTw6cEBzPORZ` conservé pour le Cerveau ; réglages des appelants),
  `test_workflow` (banc, enfants, chef avec sorties épinglées), `get_workflow_execution`, `get_workflow_details` (les exports). Aucun `publish_workflow`, aucun identifiant.
- **Les gabarits déjà construits**, relus et réutilisés tels quels : `codeEntree`, `codeSortie` et `CODE_BILAN` de `.orchestre/preuves/035-003/construire.mjs` (nœud « Contrat », empreintes du corps), la structure chef / enfants / banc de 036-007 (`construire.mjs`, `rapatrier.mjs`, juge `direction-n8n-qa.mjs` dont l'exécuteur hors ligne est repris), `lib-rapport-hebdo` non appelé.
- **Le code lu, jamais modifié** : `lib/pilote/regles.ts:53-63` (`OUTIL_TYPE`, que le juge relit à chaque passage), `lib/sms/plage.ts:7-8` (**exécuté** par le juge sur 75 instants), `app/api/inventaire/route.ts:70` (la règle du seuil, relue par le juge), `app/api/demandes/import/route.ts` (aperçu sans `confirmer`, écriture avec : le même
  geste en deux temps), `lib/inventaire/types.ts` (`seuil_alerte`, `JOURS_REVERIFICATION`), `lib/ai.ts:428-430`, `:583-585`, `:990` (garde-fous anti-fabrication : prix, délais, créneaux, fournisseurs), `lib/email.ts:6-11` (marque blanche). **Règles** : `.claude/rules/architecture-outils.md` (n8n-first), `securite.md`, `autonomie-abonnements.md`, `migration-production.md`, `CLAUDE.md`.

## Ce qui est construit — dans le n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant créé ou modifié

| Workflow | Id n8n | Rôle | Appelants permis |
|---|---|---|---|
| `presti-dep-operations` (le chef, rempli **en place**) | `74bDhTw6cEBzPORZ` | créneaux libres lus, pose après clic, rappel de la veille, gardien du stock, import contrôlé ; 23 nœuds | `presti-cerveau` (`596OC5mL2aMBq6SD`), `presti-banc-operations` |
| `lib-agenda-creneaux` | `414xd7DQaRmEgoTs` | l'agenda lu (épinglé) : au plus trois créneaux libres, jamais inventés | le chef, le banc |
| `lib-synchroniser-outil` | `znIxgrxNzUvGeanu` | l'export lu (épinglé) : aperçu, puis écriture après validation, par clé | le chef, le banc |
| `presti-banc-operations` | `v0I7822xbpDICXd8` | banc : dix cas fictifs | aucun (`none`) |

Fichiers : 4 exports `*.workflow.json` (rendus par `get_workflow_details`, rapatriés par `rapatrier.mjs`), `empreintes-code.json` (SHA-256 de tous les nœuds Code), `essais-n8n.json` (5 essais n8n), `construire.mjs` (la fabrique : contrats, nœuds Code, fixtures, programmes SDK),
`plans/011-cadrage-01-11/p6-signature/contrats/operations.json`, `plans/011-cadrage-01-11/p6-signature/connecteurs/agenda.md`, `scripts/operations-n8n-qa.mjs`.
Chaque workflow à contrat : *Execute Workflow Trigger* → « Contrat d'entrée » (gabarit 035-003) → « Entrée conforme ? » → « Porte simulation » → logique → « Contrat de sortie » (seul nœud final) ; hors simulation, « Hors simulation : non branché » arrête tout.
Réglages de tous : `errorWorkflow` = `lib-erreur-commune` (`yekMM9ewk03F9y2q`), `Europe/Paris`, succès non sauvés. Aucun nœud réseau, aucun nœud Supabase, aucun nœud d'agenda ni d'envoi, aucun nœud de modèle : **le code compte, le modèle ne compte rien**
(les créneaux, les montants, les quantités et les totaux sont calculés dans les nœuds Code ; aucune sortie de modèle n'existe ici, donc aucun schéma de sortie de modèle à garder).

## Ce que fait chaque workflow

- **`lib-agenda-creneaux`** (anti-fabrication : « un créneau vient de l'agenda réel, ou il n'existe pas ») : lit une demande qui porte l'agenda **déjà lu** (`agenda.occupe` : des plages `{ artisan_id, debut, fin }`, jamais un titre, un invité ni un lieu ; le contrat les refuse) et la plage que cette lecture **couvre**.
  Il rend **au plus trois** créneaux libres (deux par jour au plus), sur la grille des horaires de l'artisan, au moins `marge_min` après maintenant, sans chevaucher un bloc occupé, dans la plage couverte, chacun avec « lu dans google_agenda le 03/11/2026 ». **Agenda illisible** (`lue: false`, pas de date de lecture, pas de plage couverte), **trop ancien**
  (plus de `age_max_agenda_min`, 60 par défaut), **daté du futur**, ou **d'un autre compte** : aucun créneau — et une **carte** « Aucun créneau à proposer » dit pourquoi (l'autre compte est refusé, sans carte). Sortie : une carte `proposer_creneaux` « à valider », jamais un rendez-vous posé.
- **Le rendez-vous** (décision 5) : le chef, route « Poser le rendez-vous », ne prévoit `poser_rendez_vous` que si (1) l'artisan a **cliqué** (`validation.valide_par === 'artisan'`, le contrat refuse toute autre valeur, y compris `pilote`), (2) le clic suit la proposition et ne suit pas le présent, (3) le créneau cliqué est **l'un de ceux qui ont été proposés**,
  (4) l'agenda **relu** juste avant est lisible, récent, de ce compte, couvre le créneau, et le créneau y est **encore libre**, (5) la clé `rdv:…` n'existe pas déjà. Sinon : `refuse` (`sans_clic_artisan`, `creneau_inconnu`, `plus_libre`, `agenda_illisible`, `clic_incoherent`) et **aucun effet**. Même alors la pose est **prévue**, jamais faite, et le type n'entre pas dans `OUTIL_TYPE`.
  Studio, Signature, essentiel, essai, pilote actif ou non : même comportement (le juge joue les huit combinaisons).
- **Le rappel de la veille** : pour chaque rendez-vous **de demain** (jour de Paris) avec un canal (`sms_lien` ou `email`), un consentement et **sans opposition (STOP)**, une **carte** `rappel_rendez_vous` « à valider » au texte fixe (« …rappel de votre rendez-vous demain à 14 h 30. <nom de l'artisan>. Pour ne plus recevoir ces messages, répondez STOP. »), sans lien, sans montant, sans nom de client, sans la marque de la plateforme.
  Horaire d'envoi : `lib/sms/plage.ts:7-8` (lundi-samedi, 8 h-20 h, Paris, hors fériés) ; hors plage, `envoyer_a` est reporté à la prochaine ouverture. Jamais un envoi.
- **Le gardien du stock** : un article sous son seuil (règle de `app/api/inventaire/route.ts:70` : `seuil_alerte > 0` et quantité ≤ seuil) sans commande ouverte donne une **carte `commande_fournisseur` « à valider »** : fournisseur pris dans **la liste de l'artisan** (sinon « fournisseur à choisir dans votre liste », jamais un fournisseur inventé), quantité = celle qu'il a posée (sinon « quantité à saisir »),
  montant = prix × quantité **calculé par le code** et seulement si le prix est connu (sinon `null`, et « prix inconnu : aucun prix n'est deviné »), prix vu depuis plus de 30 jours marqué « à reverifier ». **Une commande est de l'argent : jamais envoyée seule**, dans aucune offre.
- **`lib-synchroniser-outil`** (B10, C3) : phase **« apercu »** — lit l'export épinglé, rejette les lignes **sans provenance** (`lu` sans outil ni date, ou ni `lu` ni `declare par l'artisan`) et les doublons de l'export, écarte les lignes déjà importées, calcule les totaux **dans le code** et une empreinte ; chaque ligne retenue porte « lu dans <outil> le <date> » ou « déclaré par l'artisan » ;
  il dépose l'aperçu et **n'écrit rien**. Phase **« ecrire »** — l'export est **relu**, et l'écriture n'est prévue que si l'artisan a validé **cet aperçu** (même empreinte), que la cible est dans la liste signée (`mes_chiffres`), et que la validation ne date pas du futur ; une écriture prévue par ligne, par clé `imp:<ref>` (`on_conflict=artisan_id,cle`), avec `source` = la provenance.
  Pagination bornée (`max_pages`), plafond de lignes, export d'un autre compte refusé, libellé avec une adresse refusé (`sans_contact`).
- **Le chef** aiguille (`Aiguiller` : interrupteur général et de département ouverts, sinon route « stop » ; `rendez_vous_a_poser`, `veille_de_rendez_vous` et `stock_sous_le_seuil` donnent un genre sans qu'il soit écrit), prépare les enveloppes des enfants et **habille** leurs sorties. Une lecture absente donne `lecture_absente` ou « aucun créneau » : rien n'est supposé.

### Studio et Signature
Rien de ce lot ne part seul, dans aucune offre : la proposition de créneaux, le rendez-vous (après clic), le rappel, la commande et l'aperçu d'import restent des cartes ou des effets **prévus**. Studio et Signature se comportent donc de la même façon ici (`lib/plans.ts:11-12` ne change rien à ce département), et le pilote ne reçoit aucun nouveau type.

## Les essais réels dans n8n (`test_workflow`, données épinglées, rien d'écrit)

- `presti-banc-operations` #592 : dix cas, tous rendus par n8n (`defauts: 0` au bilan) — rappel de la veille, stock sous le seuil, rendez-vous sans clic en Signature (`refuse`), rendez-vous après le clic (`ok`, pose prévue), interrupteur coupé (`rien_a_faire`), créneaux libres, agenda illisible, semaine pleine, aperçu d'import, écriture sans aperçu validé (`refuse`).
- `lib-agenda-creneaux` #603 et `lib-synchroniser-outil` #604 : les enveloppes **exactes** que le chef leur prépare, jouées seules pour fournir leurs sorties à épingler.
- `presti-dep-operations` #605 (chaîne créneaux) et #606 (chaîne import) : sortie de l'enfant épinglée (le chef, essayé en manuel, ne peut pas appeler un enfant non publié depuis un appel intégré, fiche-méthode point 2) ; le juge vérifie que **chaque sortie épinglée est exactement celle de l'export appelé, rejoué hors ligne** (P3).
- Détail honnête : le réglage `onError: continueRegularOutput` des deux appels d'enfants du chef a été posé **après** #605 et #606 (réglage de nœud, sans effet sur les sorties) ; les exports sont ceux d'après. Un premier rapatriement avait montré que `addNode` ne gardait pas `onError` : le juge l'a signalé (S9), le réglage a été posé par `setNodeSettings`.
- Rejeu hors ligne par le juge : les dix appels du banc et les deux essais du chef sont identiques, nœud par nœud, à ceux de n8n.

## Le juge `scripts/operations-n8n-qa.mjs` et ses mutants

Sortie : `OK`, **56 mutants** qui rougissent chacun pour sa raison, dont les six demandés :
- **un créneau absent de l'agenda proposé** : agenda illisible ignoré (G7), lecture trop ancienne acceptée (G7), bloc occupé ignoré (G1, G3), marge ignorée (G1), créneau hors de la plage couverte (G11), plus de trois ou trois le même jour (G1, G2) ;
- **un rendez-vous posé seul en Signature** : le clic n'est plus exigé (D2 : 8 cas en défaut sur les quatre offres × pilote actif ou non), remplacé par l'offre (D2), un créneau jamais proposé (D3), un créneau plus libre (D4), l'agenda d'un autre compte (D5), `poser_rendez_vous` ajouté à `OUTIL_TYPE` (S10) ;
- **une commande envoyée seule** : un effet `envoyer_commande` (T6), une carte déjà « validée » (T6), un montant deviné (T3), un fournisseur hors de la liste (T4), une quantité inventée (T3), le seuil ignoré (T2), une commande déjà ouverte reprise (T2), un stock non lu devenu « rien à commander » (T9) ;
- **un import écrit sans aperçu** : la validation retirée (I9), l'aperçu qui écrit (I1), une cible hors de la liste signée (I12), un doublon écrit deux fois (I2), une ligne déjà importée réécrite (I2), une pagination non bornée (I14), un total altéré (I5) ;
- **une donnée sans provenance** : la ligne acceptée (I2), une provenance « lu » sans outil ni date (I2) ;
- **l'agenda d'un autre compte** : lu par la recherche (G8), par la pose (D5), un rendez-vous d'un autre compte rappelé (R8), une ligne de stock (T10), un export (I13).
Et aussi : un rappel envoyé (R5), sans consentement ou malgré l'opposition (R1), sans le STOP ou avec la marque de la plateforme (R4), la plage d'envoi ignorée (R7 : 45 écarts sur 75 instants), un nœud de modèle, Google Agenda, HTTP ou d'envoi ajouté (S3), la porte « simulation » contournée (S8), un workflow publié (S1), un identifiant (S2), un appelant `any` (S4), l'identifiant du chef changé (S4), le gabarit « Contrat » affaibli (S5), un octet changé dans un nœud Code (S7), un échec d'enfant qui fait échouer le banc (S9).
Un juge qui fabrique ce qu'il vérifie ne prouve rien : le calcul des créneaux est **refait** dans le juge (grille, horaires, marge, chevauchement) avec une autre écriture du fuseau de Paris, puis confronté à **200 agendas tirés au hasard** ; la plage d'envoi est comparée au **vrai** `lib/sms/plage.ts` exécuté ; le seuil d'inventaire et `OUTIL_TYPE` sont relus dans le code ;
la provenance, les totaux et les montants sont refaits à part ; la liste des types interdits dans `OUTIL_TYPE` est écrite dans le juge, pas lue du code testé.

## Risques et points à valider

1. **Le Cerveau ne connaît qu'une route vers Opérations** (`rendez_vous_a_poser`, `construire.mjs` de 036-001, table `ROUTES`) : `veille_de_rendez_vous`, `stock_sous_le_seuil`, le clic de pose et la demande d'import sont à y ajouter (une ligne chacune) par la session principale ; il n'envoie pas encore les blocs de lecture, donc le chef répond `lecture_absente` ou « aucun créneau » (dit, non inventé : contrôles X3 et X4 du juge).
2. **Les lectures réelles sont épinglées, pas branchées** : l'agenda (Google ou Outlook), l'inventaire, les rendez-vous et l'export du client sont **passés par l'appelant**. Les requêtes prévues restent à écrire par une tâche dont le périmètre contient `supabase/**` (vue étroite, `artisan_id` partout, `select=` limité, jamais de texte libre) — voir `connecteurs/agenda.md`, geste 2.
3. **La colonne `source` des imports (C3) et les tables d'effets n'existent pas** : `ecrire_ligne` vise `POST /rest/v1/compta_lignes?on_conflict=artisan_id,cle`, nom **de travail** d'une table qui n'a pas de migration. Aucune migration n'a été écrite (`supabase/**` est hors périmètre) ; la table réelle de « Mes chiffres » doit être confrontée avant tout branchement.
4. **Le nœud d'agenda réel n'est pas dans les exports** (la garde `n8n-specs-qa.mjs` ne l'autorise pas, hors périmètre) ; l'amendement de la garde, l'application OAuth et la vérification Google sont des gestes de Benj. La fiche dit ce qu'elle n'a **pas** pu confirmer (classement « sensible », évaluation de sécurité, délais, quotas).
5. **L'Archiviste (fiche Drive) n'est pas dans ce lot** : la tâche demande l'agenda, le rappel, le stock et l'import ; le Drive reste à 036-0xx, avec sa fiche connecteur.
6. **Le rappel de la veille n'a pas de déclencheur** : il attend l'événement `veille_de_rendez_vous` du Cerveau (voulu : la veille à 17 h, Paris). Aucun planificateur n'a été posé ici (n8n-first : le Cerveau déclenche).
7. **Le pilote ne reçoit aucun type nouveau** : « rendez-vous posé », « rappel de rendez-vous » et « commande fournisseur » restent hors de `OUTIL_TYPE`. Les faire entrer exige les tests de ce lot (faits) **et l'accord écrit de Benj**.
8. **Les défauts écrits dans le chef** (60 minutes par créneau, marge de 2 heures, lecture d'agenda valable 60 minutes, 200 lignes et 5 pages par import, deux créneaux par jour au plus) sont à confirmer par Benj ; les réglages réels viendront de la configuration du compte.
9. **Le juge n'est pas encore au lanceur** (`scripts/tout-verifier.mjs` hors périmètre) : c'est le lot 036-012 (« aucun juge n8n hors `SUITES` ni `HORS_LANCEUR` »).

## Gestes préparés pour Benj, jamais faits

Coller 0193 (et 0185, 0192 avant) puis lever `systemeAgents` ; écrire (tâche `supabase/**`) la vue du travail dû d'Opérations, la colonne `source` des imports et les tables d'effets ; créer l'application OAuth d'agenda et relever sa vérification ; amender la garde `n8n-specs-qa.mjs` pour le nœud d'agenda désactivé ;
publier `lib-agenda-creneaux`, `lib-synchroniser-outil`, puis `presti-dep-operations` ; ajouter les routes du Cerveau (point 1) ; fournir les lectures réelles (avec `select=` limité et le filtre `artisan_id`) ; confirmer les défauts (point 8) ; décider si « rendez-vous posé » entre un jour dans la liste du pilote.

## Résultat de la commande `verifier`

Voir `verifier.log`.
