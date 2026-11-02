## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« assistant de gestion : relance d'un devis envoyée à un client, envoi en fait tout seul, carte de lot,
  validation par l'artisan »). Il a rendu `regles-presti/autonomie-abonnements.md` (« Studio prépare, l'artisan valide ; rien ne part sans
  un clic ») et `memoire-presti/pilote-auto-aide-2110.md` (le pilote Signature, 10 minutes d'annulation).
  Effet : chaque doute se résout en **carte** et jamais en envoi, et une lecture en erreur refuse. J'ai aussi gardé le pilote hors de tout lot (D7).
- **Skill `ecc:security-review`** (relecture finale de mon diff). J'ai vérifié trois points :
  - chaque lecture neuve est filtrée par `artisan_id` (multi-locataire) : `cartesRelanceOuvertes`, `relanceConcurrente`,
    `lotEnCoursSur`, `clientsDuCompte`, les conversations par e-mail ;
  - chaque erreur tombe côté fermé ;
  - aucune valeur du modèle n'entre dans une requête sans passer par `validerAction`.

  Il m'a fait corriger un défaut de mon propre correctif : une réservation `en_cours` orpheline (processus coupé) bloquait le devis
  **à vie**. Elle est maintenant bornée à `RELANCE_DELAI_JOURS`, comme une relance partie.
- **Skill `presti-verify`** : son cycle. Ici, le build, le typecheck, le push et le déploiement sont interdits (consigne de la tâche,
  `securite.md`). La preuve est donc la sortie des suites hors ligne, et le build et le déploiement restent à la session principale
  (« Points à valider »).
- **Le rapport et le banc de l'auditeur** (`.orchestre/preuves/032-028/rapport.md`, `attaques-l16.mjs`, `attaques-l16.txt`,
  `sonde-ordre.mjs`). Ils m'ont donné D1 à D8 et leurs corrections proposées. Le banc a aussi **contraint** la forme des corrections, sans être
  modifié. Ses mutants (A7p, A7t, A7u, A6g, A1j/A3e) et son essai de structure D1 cherchent des lignes exactes du source. Ses essais X3b/X3c
  et A7k exigent qu'une seconde carte puisse retenir un devis déjà dans une carte en attente. Le détail est dans « Écarts » plus bas.
- **La preuve 032-021** et le plan du chantier 4 (`plans/011-cadrage-01-11/chantier-4-assistant-plan.md` §0 bis, rang 4, question 1 :
  « une carte de lot si plusieurs clients ; un objet seul garde le fait tout seul »). C'est l'aune de D1 : le « fait tout seul » reste
  pour un objet seul **prouvé**.
- **Le code voisin**, relu avant d'écrire :
  - le magasin des cartes (`lib/assistant/magasin.ts`, `confirmation.ts`) : la réclamation atomique `transiter`, et `cree_le` par défaut `now()` ;
  - le schéma `0157` : `en_cours` est admis en mode `direct`, aucune migration n'est nécessaire ;
  - le rattachement par e-mail de `lib/relancesImpayesMagasin.ts:35`, repris pour D5 ;
  - la route qui fournit toujours le message de l'artisan (`app/api/assistant/route.ts:130-131`).

## Ce qui a été fait, défaut par défaut

| # | Verdict | Correction (fichier:ligne) | Essais neufs (suite sécurité, partie A8) et leur mutant |
|---|---|---|---|
| **D1** majeur | **corrigé** | `lib/assistant/cartes.ts:230` `motifPasUnSeul`, la preuve positive : aucun « et », virgule, « tout le monde », « les gens »… ; aucun autre numéro, complet ou abrégé ; puis le numéro complet de la pièce, ou un mot du nom de SON client qu'aucun autre client ne porte, et aucun mot propre à un autre client. Elle est appliquée à la **première** relance du message en « fait tout seul » (`lib/assistant/actions-serveur.ts:1758`, `:1768`). Le commentaire faux est corrigé (`cartes.ts:173-178`). | A8a : six ordres que `ordreGroupe` ne voit pas donnent une carte et 0 e-mail. A8b : le témoin « Relance M. Leroy », « Relance le devis DEV-2026-0101 », « relance garnier » part d'office, une fois. A8c : le devis d'un autre client que celui nommé donne une carte. **A8d mutant** (garde retirée) : M. Leroy relancé sans clic. |
| **D2** majeur | **corrigé** (au clic, intégralement ; à la préparation, voir « Écarts ») | **Au clic** (`actions-serveur.ts:560-585`) : la trace du devis est posée `en_cours` **avant** l'envoi (la réservation), puis relue avec les autres traces du devis par `relanceConcurrente` (`:433`). Si une autre relance est en cours ou partie, la réservation passe en `echec` et rien ne part. Après l'envoi, la trace passe en `executee`. De deux clics simultanés, au moins un voit l'autre. S'ils se voient tous deux, aucun n'envoie (côté sûr). La relance seule refuse si une réservation de lot est en cours (`:612`). **À la préparation** : un devis en train de partir est exclu du lot, motif dit (`:478`). Un devis qu'une autre carte attend reste retenu avec une alerte sur la carte (`:528`). La relance seule d'un devis déjà dans une carte ouverte est refusée, sans seconde carte (`:1160`). | A8e : deux cartes de lot cliquées en même temps, aucun client relancé deux fois, alerte présente. A8f : une trace `executee` par e-mail parti, les perdantes en `echec`. **A8g mutant** (relecture retirée) : un client reçoit deux relances. A8h : réservation en cours, le devis est exclu du lot neuf ; **A8i mutant**. A8j : la relance seule sur une carte de lot en attente est refusée ; **A8k mutant**. |
| D3 | **corrigé** | « Ne plus relancer » (`exclusionsRelance`) s'applique à la préparation de la relance seule (`actions-serveur.ts:1157`) et au clic (`:609`). Une lecture en erreur refuse. Le pilote reçoit le même point d'entrée (`lib/pilote/executeur.ts:135`, paramètre `exclusions` de `realisateursPilote`), sans lecteur tant que L13 n'a pas branché 0185. | A8l : « fait tout seul », refus, 0 e-mail ; **A8m mutant** (les deux contrôles retirés). A8n : marqué après la carte, refusé au clic ; **A8o mutant**. |
| D4 | **corrigé** | Compte en pause : la relance seule en « fait tout seul » devient une carte qui le dit (`actions-serveur.ts:1169`). Une lecture en erreur donne aussi une carte. | A8p ; **A8q mutant** (M. Leroy relancé pendant la pause). |
| D5 | **corrigé** (au lieu de « peut rester ») | `escaladeDeLaCarte` relit aussi les conversations du même e-mail client, minuscules comprises (`actions-serveur.ts:1700`). Cela vaut pour le lot comme pour le « fait tout seul » d'une pièce. Une erreur lève (carte). | A8r : 102 est exclu, motif d'escalade ; **A8s mutant**. C'était nécessaire : l'essai X9f du banc l'exige pour un exit 0. |
| D6 | **corrigé** | `nommeDans` compare à égalité avec les numéros extraits du message (`cartes.ts:200`, `numerosDans`). | A8t ; **A8u mutant** (sous-chaîne). |
| D7 | **corrigé** | `piloterCarte` refuse une carte de lot d'entrée (`lib/pilote/serveur.ts:105`). Le réalisateur du pilote la refuse avant toute lecture (`lib/pilote/executeur.ts:71`, `:127`). | A8v : null, 0 requête ; **A8w mutant** (la carte de lot atteint la décision du pilote). A8x : contrôle du source du réalisateur, sans mutant, parce que le module importe du `.tsx` et ne se charge pas hors build (même limite que X6b). |
| D8 | **corrigé** | Un journal illisible donne le motif « journal des relances illisible : exclu », en préparation comme au clic (`actions-serveur.ts:480`). La relance seule ne prépare rien (`:1151`). | A8y : 4 exclus avec ce motif, 0 e-mail ; **A8z mutant**. |

## Écarts avec la consigne, et pourquoi

1. **D2 (1), à la préparation.** La consigne dit d'exclure un devis « déjà retenu par une carte en attente ou en cours ». J'exclus les
   devis **en cours**. Ceux qu'une autre carte **attend** restent retenus, avec une alerte sur la carte (une relance seule y est
   refusée).

   Raison : le banc de 032-028, qui ne se modifie pas, l'interdit.
   - X3b et X3c cliquent une seconde carte de lot préparée sur les mêmes devis que la première, en attente : `r2.carte.id`.
   - A7k exige qu'un lot qui nomme 101 le retienne alors qu'une carte seule de 101 attend.

   Avec l'exclusion stricte, ces essais plantent ou rougissent. La garantie que vise D2 (« deux clics simultanés ne relancent chaque
   client qu'une fois ») est tenue par la réservation au clic : X3c et A8e le prouvent, et A8g montre la brèche sans elle.
2. **D1, champ d'application.** La preuve positive vaut pour la **première** relance du message, quand `ordreGroupe` ne reconnaît pas
   l'ordre et que la session a le message de l'artisan.
   - Les ordres que `ordreGroupe` reconnaît restent refusés en amont.
   - Les relances suivantes suivent la règle du tour.

   Les mutants A7t et A7u du banc exigent que chacune de ces deux gardes reste porteuse seule dans son domaine : la preuve ne doit pas
   les masquer. Sans `textesArtisan`, il n'y a rien à prouver : la route le fournit toujours (`app/api/assistant/route.ts:130-131`) et
   l'essai A6c (témoin sans message) l'exige.
3. **Fins de ligne.** Mes réécritures avaient passé `lib/pilote/serveur.ts` et `executeur.ts` de CRLF à LF. Je les ai remis en CRLF
   (`git diff --stat` : +3 et +11/−1). Les fichiers du lot L16 (`cartes.ts`, `actions-serveur.ts`, la suite) étaient déjà en LF dans
   la copie : le banc de 032-028, copié tel quel de la suite, a 0 CR.

`outils-actions.ts` et `scripts/assistant-qa.mjs` sont restés intacts : rien ne l'exigeait, et `assistant-qa` reste vert.

## Sorties (dans ce dossier, une suite à la fois)

| Commande | Résultat |
|---|---|
| banc 032-028 non modifié : `node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/032-028/attaques-l16.mjs` | **244 PASS, 0 FAIL**, code 0 (`banc-attaques-l16.txt`). Avant : 236 PASS, 8 FAIL. |
| `scripts/securite-assistant-0211-qa.mjs` | **238 PASS, 0 FAIL**, code 0 : les 212 d'avant plus 26 essais A8 (`suite-securite-assistant-0211-qa.txt`) |
| `scripts/assistant-qa.mjs` | **323 PASS, 0 FAIL**, code 0 (`suite-assistant-qa.txt`) |
| `scripts/relances-impayes-qa.mjs` | **236/236 contrôles**, code 0 (`suite-relances-impayes-qa.txt`) |
| `scripts/pilote-qa.mjs` | **88 verts, 0 rouge**, code 0 (`suite-pilote-qa.txt`) |

Le verdict qui fait foi est celui de `node scripts/orchestre.mjs verifier 032-030` (digest), rejoué après la remise des fins de ligne.

## Risques

- **Deux clics qui se voient l'un l'autre n'envoient ni l'un ni l'autre** : c'est voulu, côté sûr. La carte dit « non relancé : une
  autre relance de ce devis part au même moment ». Un nouvel ordre la reprend, puisque la réservation perdante passe en `echec`.
- **Pas de contrainte d'unicité en base.** Elle exigerait une migration, interdite ici. La garantie repose sur « écrire puis relire »
  sous la cohérence de Postgres. Une clé `(artisan_id, outil, objet_id)` partielle sur `en_cours`, posée par une migration, serait le
  durcissement suivant.
- **Reste une fenêtre étroite**, en dehors de deux clics : une relance seule en « fait tout seul », entre son envoi et l'inscription de sa
  trace (un aller-retour en base), contre un clic de lot au même instant. Le lot ne voit alors ni réservation ni trace.
- **Le pilote ne lit pas les réservations de lot.** Une carte seule pilotée sur un devis dont un lot part au même instant : la carte
  pilotée est `en_cours`, donc le lot la voit et s'abstient. L'inverse n'est pas couvert.
- **D1 donne plus de cartes.** « Relance-le », ou un nom porté par deux clients, donne une carte au lieu d'un envoi d'office. C'est
  voulu (inverser la charge), mais visible.
- **Les cartes seules nées d'un ordre groupé mal lu peuvent entrer dans le pilote** (Signature, 10 minutes d'annulation), comme toute carte
  seule. Le comportement d'avant est inchangé ; X6a et A7q restent verts pour le lot.
- **D3 : aucun lecteur réel** tant que la table 0185 n'est pas branchée (L13). Le point d'entrée est en place dans l'assistant et dans le pilote.

## Points à valider (session principale)

1. **Rejouer** `node scripts/orchestre.mjs verifier 032-030` sur le PC après rapatriement. Puis typecheck et build, qui me sont interdits.
2. **Écart D2 (1)** : accepter « en attente → alerte, réservation au clic », ou faire évoluer le banc 032-028 (X3b, X3c, A7k) par une tâche
   d'audit, puis exclure strictement.
3. **Une migration d'unicité** sur la réservation (voir « Risques »), si on veut une garantie en base plutôt qu'applicative.
4. **L'entrée datée** du journal de l'agent (`.claude/agents/knowledge/*.journal.md`) est hors de mon périmètre.
