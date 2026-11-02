## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (deux appels). Le premier (« pilote, relance, envoi, escalade… ») n'a rien rendu. Le second (« relance
  automatique d'un devis envoyée seule au client par le pilote automatique Signature ») a rendu trois sources :
  - `memoire-presti/pilote-auto-aide-2110.md` : le pilote est Signature seulement, type par type, avec 10 minutes d'annulation, et tout ce
    qui part chez un client attend le clic, sauf le pilote ;
  - `regles-presti/autonomie-abonnements.md` : « Studio prépare, l'artisan valide » ;
  - l'ADR-001 : le pilote est une automatisation déjà codée, qu'on corrige sur place quand une faille l'exige (`migration-production.md`).

  Effet : le pilote reste un choix de l'artisan pour **une** action préparée. Je ne l'ai pas cassé : le témoin A9g montre qu'une relance
  seule, proposée hors d'un ordre groupé, entre toujours au pilote et part à 10 minutes. Je ne l'ai fermé que pour ce que la règle réserve
  au clic. Aucune automatisation neuve n'a été écrite, donc rien de n8n.
- **MCP `cerveau`, `chercher`** (« pilote automatique escalade litige jamais automatique relance groupée carte de lot ») : la fiche B2 de
  l'inventaire P5 et le §3 du plan du chantier 4. Ils confirment que l'escalade est relue au départ du pilote, et qu'en cas de doute on fait
  une carte. D'où la règle suivie partout : toute lecture en erreur donne une carte, une ligne en échec, ou « hors pilote ».
- **Skill `ecc:security-review`** (chargé, appliqué à mon diff) :
  - chaque lecture neuve est filtrée par `artisan_id` : `clientsDuCompte`, `devisEnAttenteDuClient`, `conversationsDeLaCarte`
    (factures, devis, leads), `ordreDecoupe`, la réservation d'office ;
  - chaque erreur tombe côté fermé ;
  - la marque `_hors_pilote` est posée par le serveur et écrase toute valeur venue du modèle, qui ne peut que la rendre plus stricte ;
  - j'ai remplacé un rétrécissement de type fragile (`verrou?.ok`) par `verrou && verrou.ok`, et retiré une fonction devenue morte
    (`conversationDeLaCarte`).
- **Skill `presti-verify`** (chargé) : j'en ai appliqué le cycle dans la mesure du permis. Le build, le typecheck, le push et le déploiement
  sont interdits ici. La preuve est donc la sortie des six commandes hors ligne. Le typecheck et le build restent à la session principale.
- **Le rapport et le banc de 032-035**, en entier (`rapport.md`, `contre-attaques-l16.mjs`, sha1 `b327956e…`, non modifié), **le rapport
  et le banc de 032-028** (`attaques-l16.mjs`, sha1 `d5f6c238…`, le même que celui que cite 032-035, non modifié), et **la preuve 032-030**.
  Les bancs ont **contraint la forme** de chaque correction, parce que leurs mutants cherchent des lignes exactes du source :
  - A6g et A6h : la ligne d'escalade du « fait tout seul » ;
  - A7q : la carte de lot passée au pilote, qui doit encore y entrer quand on retire `carteDeLot`. La marque ne vaut donc pas pour le motif
    « lot » ;
  - A8d : `if (!p.horsAuto && p.cible && premiereDuTour` ;
  - C2k : la ligne `if (leadId && d.escalade …` de `file.ts`, gardée telle quelle ; les autres conversations sont relues **après** elle ;
  - l'essai D1 : 600 caractères au plus entre `let horsAuto` et le bloc d'office. La marque d'escalade est donc posée après ce bloc.
- **Le plan du chantier 4** (`plans/011-cadrage-01-11/chantier-4-assistant-plan.md:62` rang 4, `:235` question 1, §13 `:753-766`).
  C'est l'aune d'E1 (« un lot, ses exclus revus, un clic, jamais le pilote ») et d'E2 (l'escalade relue au départ du pilote).
  `lib/pilote/regles.ts` a été lu, pas modifié.
- **Non utilisés, et pourquoi** : le MCP n8n (aucun workflow dans ce lot, et le pilote se corrige sur place) ; les skills de design (pas
  d'écran) ; les vidéos analysées (sans rapport avec des relances).

## E1 : un ordre sur plusieurs clients ne passe jamais par le pilote — corrigé

Une carte peut maintenant porter la marque **hors pilote** : `MARQUE_HORS_PILOTE = '_hors_pilote'` (`lib/assistant/cartes.ts:267`), lue par
`motifHorsPilote` (`:269`). Sa valeur est le motif. L'assistant la pose quand l'une de ces conditions tient :
- la règle du tour : une seconde relance du même message (`actions-serveur.ts:1858`) ;
- la preuve « un seul client » échoue (`:1871`) ;
- hors « fait tout seul », une question par exemple, le message vise à coup sûr plusieurs clients : `visePlusieursClients` (`:1877`,
  `cartes.ts:283`) ;
- une relance du devis est peut-être en cours.

Une carte marquée n'est même pas présentée au pilote (`actions-serveur.ts:1933`). Le pilote la refuse aussi de lui-même, en trois endroits :
- à l'entrée, sans rien lire (`lib/pilote/serveur.ts:109`) ;
- au départ : `carteDe` la rend (`executeur.ts:258`) et `traiterFile` la passe « manuel », motif écrit (`file.ts:97`) ;
- dans chaque réalisateur du pilote (`executeur.ts:206`).

**L'ordre découpé par le modèle** est fermé de deux façons :
- quand la seconde relance du tour arrive, la première, déjà mise au pilote, est retirée de la file : `retirerDuPiloteLesCartesDuTour`,
  `annulerParRef` (`actions-serveur.ts:1799`, `:1860`) ;
- au départ, `ordreDecoupe` (`executeur.ts:85`) rend à la main une carte de relance s'il existe une autre carte de relance dans la même
  conversation et le même tour.

## E2 : une carte d'escalade ne passe jamais par le pilote, qui relit toutes les conversations du client — corrigé

- La carte d'escalade (motif d'escalade, ou messages illisibles) est marquée hors pilote (`actions-serveur.ts:1917`).
- Au départ, `conversationsDeLaCarte` (`executeur.ts:51`) rend la conversation de la carte **puis** celles du même e-mail client
  (`leadsClient`). `traiterFile` les relit toutes (`file.ts:125`). Une lecture impossible lève, et la ligne passe en échec.

## Les mineurs de 032-035

| # | Verdict | Correction (fichier:ligne) |
|---|---|---|
| E3 | corrigé | `cartesRelanceOuvertes` (`actions-serveur.ts:439`). Une carte **de lot** réclamée puis coupée ne bloque plus au-delà de `CARTE_COUPEE_MS` = 15 min (`:75`) : chaque devis tenté a sa propre réservation. Une carte **seule** réclamée puis coupée compte comme partie pendant `RELANCE_DELAI_JOURS` : elle a pu partir sans trace. |
| E4 | corrigé | `motifPasUnSeul` (`cartes.ts:305`). « et », « avec », « plus », « tout » et la virgule ne sont plus des marques à eux seuls (`:222`). Ils ne comptent que s'ils relient un mot inconnu, hors des mots de consigne (`:224`, `:231`). Les dates écrites ne sont plus des numéros abrégés (`:244`). Le motif du doute dit maintenant « Je n'ai pas pu être sûr du client visé ». |
| E5 | corrigé | La levée d'une réservation est réessayée une fois. Si elle échoue encore, le résultat du clic le dit (« journal à reprendre ») (`actions-serveur.ts:623`). La relance seule d'un devis tenu par une réservation en cours donne une carte hors pilote, plus un refus muet (`:1220-1222`). |
| E6 | corrigé | Les marques anglaises et allemandes sont ajoutées (`and the others`, `everyone`…). Une faute d'une lettre sur un autre nom compte : `presqueEgal` (`cartes.ts:247`). `clientsDuCompte` relit **tous** les clients, par pages ordonnées, et lève au-delà de 20 pages (`actions-serveur.ts:472`, `:78`). |
| E7 | corrigé | La preuve par le nom exige que ce client n'ait qu'un devis envoyé : `devisEnAttenteDuClient`, par e-mail et par nom (`actions-serveur.ts:491`), lu par `cartes.ts:327`. |
| E8 | corrigé | La relance seule d'office réserve son devis avant l'envoi : `reserverRelanceSeule` (`actions-serveur.ts:1810`, `:1895`). La réservation est relue par `relanceConcurrente`, puis levée une fois la relance inscrite. Si l'inscription échoue, elle devient la trace. `lotEnCoursSur` ignore les réservations du tour lui-même (`:467`). |
| E9 | corrigé | Un seul lecteur « ne plus relancer » : `exclusionsRelanceParDefaut` (`actions-serveur.ts:137`). L'exécuteur du pilote le passe à `realisateursPilote` (`executeur.ts:303`). Le jour où L13 branchera 0185, ce sera à un seul endroit. |

## Essais neufs et leurs mutants

**`scripts/securite-assistant-0211-qa.mjs`, partie A9** (`:979`) : 35 essais. Les départs y passent par la **vraie** `traiterFile` et les
vraies lectures `carteDe` et `escalade`.

| Essai | Mutant (le juge voit la brèche) |
|---|---|
| A9a-b : E1, 0 carte au pilote, toutes marquées ; une carte marquée revient « manuel » au départ | A9c : garde de l'assistant retirée → 2 cartes au pilote. A9d : marque non relue au départ → la carte part |
| A9e : E1 hors « fait tout seul » (une question qui nomme deux clients) | A9f : contrôle retiré → la carte entre au pilote |
| A9g : **témoin**, une relance seule hors ordre groupé entre au pilote et part | — |
| A9h : ordre découpé, la ligne de 101 est annulée dans la file, 102 n'y entre pas, 101 revient à la main au départ | A9i : pas d'annulation. A9j : `ordreDecoupe` retiré → 101 part |
| A9k : E2, carte d'escalade marquée, hors pilote | A9l : marque d'escalade retirée → la carte entre au pilote |
| A9m : E2 au départ, conversation du devis propre, litige dans une autre conversation du même e-mail → « manuel », escalade. A9p : lecture illisible → échec | A9n : boucle des autres conversations retirée → part. A9o : lecture par e-mail retirée dans `carteDe` → part |
| A9q : le vrai `piloterCarte` refuse la marque, sans aucune requête. A9s : les réalisateurs la refusent | A9r : garde retirée → réglages lus |
| A9t : E3, lot coupé, 40 jours plus tard la relance seule part et le lot reprend. A9u : **témoin**, carte réclamée il y a 3 min, elle tient encore | A9v : borne retirée → rien ne part, 101 exclu |
| A9w : E5, « journal à reprendre » dit, la relance suivante est une carte hors pilote | A9x : refus comme avant → Mme Garnier jamais relancée |
| A9y : E4, sept ordres seuls courants partent d'office, une fois | A9z : « et/avec/plus/tout » remis en marques → la preuve refuse |
| A9e6a : E6, « and the others », « Garnié », Garnier non relu | A9e6b : mot relié inconnu ignoré, faute ignorée → passent. A9e6c : contrôle du source de la pagination (la doublure n'a pas de décalage) |
| A9e7a : E7, deux devis à M. Leroy → carte | A9e7b : nombre de devis ignoré → part d'office |
| A9e8a : E8, deux onglets → une relance au plus, aucune réservation oubliée. A9e8b : **témoin**, une relance d'office, réservation levée | A9e8c : réservation retirée → 2 relances |
| A9e9 : E9, contrôle du source (l'exécuteur réel tire un `.tsx`) | — |

**`scripts/pilote-qa.mjs`, partie B bis** : 7 essais sur l'orchestrateur pur, avec une copie mutante de `file.ts`.
- B30 : une carte hors pilote passe « manuel », motif inscrit. Son mutant, B31 : la carte part.
- B32 : une autre conversation du client est sensible → escalade. Son mutant, B33 : la relance part.
- B34 : une autre conversation illisible → échec.
- B35 : témoin, tout est propre et la relance part.
- B36 : contrôle des sources.

J'ai aussi durci deux contrôles de source existants, C1 et C11 : la garde « hors pilote » et le troisième argument d'E9 y sont maintenant
exigés.

## Sorties (une commande à la fois, dans ce dossier)

| Commande (`node --experimental-strip-types --import ./scripts/ts-loader.mjs …`) | Résultat | Fichier |
|---|---|---|
| `.orchestre/preuves/032-028/attaques-l16.mjs` (non modifié) | **244 PASS, 0 FAIL**, code 0 | `banc-032-028.txt` |
| `.orchestre/preuves/032-035/contre-attaques-l16.mjs` (non modifié) | **287 PASS, 0 FAIL**, code 0 (avant : 261 PASS, 26 FAIL) | `banc-032-035.txt` |
| `scripts/securite-assistant-0211-qa.mjs` | **273 PASS, 0 FAIL**, code 0 (238 + 35 essais A9) | `suite-securite-assistant-0211-qa.txt` |
| `scripts/assistant-qa.mjs` | **323 PASS, 0 FAIL**, code 0 | `suite-assistant-qa.txt` |
| `scripts/relances-impayes-qa.mjs` | **236/236 contrôles**, code 0 | `suite-relances-impayes-qa.txt` |
| `scripts/pilote-qa.mjs` | **95 verts, 0 rouge**, code 0 (88 + 7) | `suite-pilote-qa.txt` |

Fins de ligne conservées : les fichiers du pilote et `pilote-qa.mjs` restent en CRLF, les autres en LF.

## Risques

- **Deux tours « fait tout seul » simultanés peuvent tous deux s'abstenir** : chacun voit la réservation de l'autre. C'est le côté sûr,
  et le refus le dit. La garantie reste applicative (« écrire puis relire ») ; l'index unique partiel de 032-030 la poserait en base
  (migration, « go » de Benj).
- **Plus de cartes, moins de pilote.** Hors « fait tout seul », un message qui nomme deux clients, ou une lecture des clients en erreur,
  tient la carte hors du pilote. Une seconde relance dans le même tour retire la première de la file, et le modèle le dit
  (`retirees_du_pilote`).
- **`MOTS_DE_CONSIGNE` est une liste de mots.** Une tournure qu'elle ne connaît pas, reliée par « et » ou une virgule, donne une carte au
  lieu d'un envoi d'office. C'est le côté sûr ; c'est visible, et on l'élargit au besoin.
- **Une lecture de plus au départ du pilote** : les conversations par e-mail, plus les cartes du tour. Une panne de ces lectures fait
  passer la ligne en échec (fail-closed), la carte reste au clic.
- **E9** : il n'y a toujours aucun lecteur réel tant que 0185 n'est pas posée. Le point de branchement est unique désormais.

## Points à valider (session principale)

1. Rapatrier le périmètre, puis rejouer `node scripts/orchestre.mjs verifier 032-036`. Puis le typecheck et le build, qui me sont interdits.
2. Un **contre-audit distinct** de ce correctif avant toute mise en production (règle des auditeurs distincts).
3. Hors de mon périmètre :
   - l'entrée datée du journal des agents (`.claude/agents/knowledge/*.journal.md`) ;
   - l'apprentissage pour le vault : « une carte "pas d'office" n'est pas une carte "au clic" en Signature : tout motif qui écarte le "fait
     tout seul" doit dire aussi s'il écarte le pilote ».
4. Cette tâche n'a touché ni migration, ni n8n, ni le vault, ni `regles.ts`, ni `lib/plans.ts`, ni `app/**`. Il n'y a eu ni réseau, ni base.
