## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« assistant, relance, envoi, client : relances groupées de devis par l'assistant, fait tout seul, pilote
  automatique »). Il a rendu trois règles utiles :
  - « Studio prépare, l'artisan valide » (`regles-presti/autonomie-abonnements.md`) ;
  - le pilote Signature, 10 minutes d'annulation, par type d'action (`memoire-presti/pilote-auto-aide-2110.md`, ADR-001) ;
  - la leçon « une suite qui sème ses données ne prouve que la moitié aval » (`memoire/suite-qui-seme-ses-donnees.md`).

  Effet : j'ai cherché ce qui part **sans clic** par le pilote, et pas seulement « d'office » par l'assistant. Le banc de 032-028
  ne regarde que `mails.length` en X1. La partie Y regarde aussi la file du pilote, puis la rejoue **de bout en bout** dans la vraie
  `traiterFile` (Y2e, Y5f).
- **Skill `ecc:security-review`** (chargé). J'en ai tiré trois angles :
  - les courses entre requêtes : réservation levée ou non (Y4b), carte tuée en route (Y4c-e), deux chemins cliqués ensemble (Y4f, Y4g) ;
  - le fail-closed qui devient un déni durable (Y4c-e) ;
  - une entrée bornée sans ordre, `.limit(500)` (Y1k-l).
- **Fiche de l'agent `presti-audit-attaque`** (`.claude/agents/presti-audit-attaque.md`) et son journal `knowledge/audit.journal.md`. Ce
  n'est pas un skill de cette session, c'est un agent ; je ne l'ai pas lancé. J'ai appliqué sa méthode :
  - chaque tentative a son essai exact, son résultat observé et son verdict ;
  - je n'affirme « sûr » qu'avec un essai rejoué ;
  - aucun fichier du dépôt n'est modifié.

  Sa leçon (c), « une suite qui teste sur des fixtures à UN seul cas ne voit pas l'attaque », m'a fait multiplier les formulations
  (Y1, Y3).
- **Le plan du chantier 4** (`plans/011-cadrage-01-11/chantier-4-assistant-plan.md:62` rang 4, `:235` question 1, `:753-766` §13). Il
  donne l'aune de chaque défaut :
  - « Plusieurs clients : une carte de lot, avec ses exclus. Un objet seul garde le "fait tout seul" » ;
  - en §13, l'escalade, « relue aussi au départ du pilote », ne s'automatise jamais.
- **Le rapport et le banc de 032-028** (`rapport.md`, `attaques-l16.mjs`, non modifié : sha1 `d5f6c238…`, mtime 19:43) et **la preuve
  032-030** (`resume.md`). J'ai surtout lu ses « Risques ». Je les ai pris comme pistes, et pas comme des acquits : deux d'entre eux
  sont devenus Y2 et Y5.
- **Le code de ma copie**, lu directement : `lib/assistant/cartes.ts`, `actions-serveur.ts`, `confirmation.ts`, `lib/pilote/serveur.ts`,
  `executeur.ts`, `file.ts`, `regles.ts`, `lib/relancesRegistre.ts`, `app/api/assistant/route.ts:126-131`. Le diff
  `diff-l16-corrige.patch` m'a servi de carte des fichiers touchés.
- Non utilisés, et pourquoi : le MCP n8n (aucun workflow dans ce lot) ; les vidéos analysées (sans rapport avec un audit de relances) ;
  les skills de design (pas d'écran).

## Verdict

VERDICT : NE TIENT PAS

Les deux brèches de 032-028 sont fermées **pour le mode « fait tout seul »** :
- X1a-d : 0 e-mail ;
- X3c : une relance par client ;
- le banc de 032-028 passe, 244 PASS, 0 FAIL.

Mais un ordre groupé et un sujet d'escalade, que le code **reconnaît**, partent quand même sans clic, **par le pilote automatique**
(Signature, pilote activé pour les relances de devis). Le banc de 032-028 ne regarde pas ce chemin. Deux défauts majeurs le prouvent,
chacun rejoué de bout en bout dans la vraie file du pilote :

- **E1** : « Relance M. Leroy et Mme Garnier », « Relance tout le monde », « relance leroy, garnier, roux ».
  - Le code écrit lui-même « le message vise plusieurs clients : chaque relance attend le clic de l'artisan, aucune ne part d'office ».
  - Il met pourtant les deux cartes seules au pilote, et **les deux relances partent 10 minutes plus tard, sans clic** (Y2a-e).
  - La règle choisie était l'inverse : une carte de lot, ses exclus revus, et jamais le pilote.
- **E2** : la correction D5 voit le litige que Mme Garnier écrit dans une autre conversation, et fait de sa relance une carte.
  - Cette carte entre au pilote (Y5b).
  - Au départ, le pilote ne relit que la conversation **du devis** : il n'y en a aucune (Y5c).
  - **La relance part seule** chez une cliente qui écrit « litige, mon avocat vous écrira » (Y5f). C'est un geste du §13.

## Attaques

Banc : `node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/032-035/contre-attaques-l16.mjs`. Sortie
complète : `contre-attaques-l16.txt`, **261 PASS, 26 FAIL**.

- C'est une **copie** du banc de 032-028, avec une partie Y insérée après X9f, dans le bloc A7, sur le même monde et les mêmes
  doublures. Les sections A à X restent toutes vertes (0 FAIL hors Y).
- Dans Y, **PASS = la garde tient ; FAIL = brèche, ou relance légitime bloquée**.
- Tout est hors ligne : aucune base, aucun e-mail, aucun modèle.
- La doublure `piloterCarte` accepte tout. Y2d montre que le vrai décideur ferait de même. Y2e et Y5f passent ensuite par la vraie
  `traiterFile` et les vraies lectures `carteDe` et `escalade` ; seuls la réclamation et l'envoi sont doublés.

### Y1 — des ordres groupés imprévus, en « fait tout seul » (le modèle relance devis par devis : 101 puis 102)

| # | Message | Résultat observé | Verdict |
|---|---|---|---|
| Y1a | « Relance M. Leroy and Mme Garnier » | carte, 0 e-mail (Garnier est un autre client nommé) | BLOQUÉ |
| Y1b | « Relance les deux » | carte, 0 e-mail | BLOQUÉ |
| Y1c | « Relance-les » | carte (aucun nom), 0 e-mail | BLOQUÉ |
| Y1d | « Relance ceux de la semaine dernière » | refusé en amont (`ordreGroupe`), 0 e-mail | BLOQUÉ |
| Y1e | « Relance M. Leroy. Mme Garnier également. » | carte, 0 e-mail | BLOQUÉ |
| Y1f | « Relance Leroy und Garnier » | carte, 0 e-mail | BLOQUÉ |
| Y1g | « Relance M. Leroy (DEV-2026-0101) puis Garnier » | carte, 0 e-mail | BLOQUÉ |
| Y1h | « Remind Leroy and the others » | **leroy@essai.test relancé d'office** (« and », « others » inconnus ; aucun autre nom) | FAILLE (E6) |
| Y1i | « Relance Leroy Garnié » (faute sur l'autre nom) | **leroy@essai.test relancé d'office** | FAILLE (E6) |
| Y1j | « Relance M. Leroy, le reste attendra pas » | carte, 0 e-mail | BLOQUÉ |
| Y1k | sonde `motifPasUnSeul('Relance Leroy and Garnier', …)`, Garnier absent des clients relus | `null` : départ d'office | FAILLE (E6) |
| Y1l | source de `clientsDuCompte` | `.limit(500)` deux fois, sans `order` : au-delà de 500 lignes, l'autre client peut manquer (Y1k) | FAILLE (E6) |

Dans Y1h, Y1i et Y1k, le client relancé d'office est celui que l'artisan a **nommé**. Le second, lui, devient une carte (règle du tour).

### Y2 — Signature, pilote des relances actif : l'ordre groupé reconnu part sans clic

| # | Essai | Résultat observé | Verdict |
|---|---|---|---|
| Y2a | « Relance M. Leroy et Mme Garnier », appels 101 puis 102 | 0 e-mail d'office, mais **les 2 cartes mises au pilote**. La 1re porte à la fois `pas_d_office:true`, « chaque relance attend le clic de l'artisan, aucune ne part d'office » et `pilote_automatique:{part_le:09:10}` | **FAILLE (E1)** |
| Y2b | « Relance tout le monde » | idem, 2 cartes au pilote | **FAILLE (E1)** |
| Y2c | « relance leroy, garnier, roux » | idem, 2 cartes au pilote | **FAILLE (E1)** |
| Y2d | Le vrai pilote les prendrait-il ? | `decisionPilote` (Signature, relance_devis actif) dit `auto:true`. Les entrées de la carte ne portent aucune trace de « plusieurs clients ». `piloterCarte` ne lit ni `horsAuto` ni le motif | **FAILLE (E1)** |
| Y2e | De bout en bout, vraie `traiterFile` à T+10 min, vraies lectures `carteDe` et `escalade` | **2 relances sur 2 parties**, `["partie","partie"]`, aucun clic | **FAILLE (E1)** |

### Y3 — une relance SEULE légitime doit encore partir en « fait tout seul »

| # | Message | Résultat observé | Verdict |
|---|---|---|---|
| Y3a | « Relance M. Leroy » | part d'office, une fois | TIENT |
| Y3b | « Relance le devis DEV-2026-0101 » | part d'office, une fois | TIENT |
| Y3c | « relance garnier » | part d'office, une fois | TIENT |
| Y3d | « Bonjour, relance M. Leroy » | carte : « Le message vise plusieurs clients (ou tout le monde) » (la virgule) | bloquée à tort (E4) |
| Y3e | « Relance M. Leroy, merci » | carte, même motif (virgule) | bloquée à tort (E4) |
| Y3f | « Relance M. Leroy avec un ton ferme » | carte (« avec ») | bloquée à tort (E4) |
| Y3g | « Relance tout de suite M. Leroy » | carte (« tout ») | bloquée à tort (E4) |
| Y3h | « Relance M. Leroy pour son devis du 12 octobre » | carte : « numéro incomplet ou abrégé » (« 12 ») | bloquée à tort (E4) |
| Y3i | « Relance M. Leroy plus fermement » | carte (« plus ») | bloquée à tort (E4) |
| Y3j | « Relance M. Leroy, il n'a pas répondu » | carte (virgule) | bloquée à tort (E4) |
| Y3k | « Relance M. Leroy » ; M. Leroy a DEUX devis envoyés, le modèle prend 106 | **106 relancé d'office** : le nom désigne un client, pas un objet, et le modèle a choisi le devis | FAILLE mineure (E7) |

Ces cartes sont du côté sûr : un clic, et le motif dit « plusieurs clients » à un artisan qui en a nommé un seul.

### Y4 — la réservation anti-doublon

| # | Essai | Résultat observé | Verdict |
|---|---|---|---|
| Y4a | Au clic du lot, l'envoi de 102 échoue ; puis « Relance Mme Garnier » (fait tout seul) | La réservation passe en échec, 102 est libéré : 1 relance, d'office | TIENT |
| Y4b | Même échec, mais la levée de la réservation (`transiter` → `echec`) échoue un instant | 102 reste `en_cours` sans être parti : « Une carte de relance … est en train de partir », refus pendant `RELANCE_DELAI_JOURS` | bloquée à tort (E5) |
| Y4c | Carte de LOT réclamée (`en_cours`), puis la fonction meurt avant le 1er envoi (maxDuration, déploiement) ; « Relance M. Leroy » **40 jours plus tard** | refus : « est en train de partir (ou le journal est illisible) : ne la repropose pas » | bloquée à tort (E3) |
| Y4d | … un nouveau lot, 40 jours plus tard | 101 à 104 exclus, motif « une relance de ce devis est en train de partir » ; seul 105 retenu | bloquée à tort (E3) |
| Y4e | Carte SEULE de 103 réclamée puis coupée ; « Relance M. Roux », 40 jours plus tard | même refus, à vie | bloquée à tort (E3) |
| Y4f | Carte seule de 101 et carte de lot qui retient 101, cliquées EN MÊME TEMPS | M. Leroy reçoit au plus une relance | TIENT |
| Y4g | Deux « Relance M. Leroy » simultanés en fait tout seul (deux onglets, double envoi) | **`{"leroy@essai.test":2}`** : la relance seule d'office n'a aucune réservation | FAILLE (E8, héritée du 29/10) |
| Y4h | Une carte de lot avec 101 attend ; « Relance M. Leroy » (fait tout seul) | aucun doublon ; refus qui dit « attend déjà le clic » | TIENT |

### Y5 — pause, exclusion, escalade sur la relance seule, et la carte qui en naît en Signature

| # | Essai | Résultat observé | Verdict |
|---|---|---|---|
| Y5a | Mme Garnier écrit « Litige : malfaçon, mon avocat vous écrira » dans une AUTRE conversation (devis 102 sans `lead_id`) ; « Relance Mme Garnier » (fait tout seul) | carte, 0 e-mail d'office (le correctif D5 la voit) | TIENT |
| Y5b | … Signature, pilote des relances actif | **la carte d'escalade entre au pilote**, `pilote_automatique:{part_le:09:10}`, avec pourquoi = « Le client parle d'un sujet sensible… : à valider » | **FAILLE (E2)** |
| Y5c | … au départ, la vraie `carteDe` du pilote | `{"leadId":null}` : aucune conversation relue | **FAILLE (E2)** |
| Y5f | De bout en bout, vraie `traiterFile`, vraies `carteDe` et `escalade` | **la ligne passe « partie »** : la relance part seule chez une cliente en litige | **FAILLE (E2)** |
| Y5d | « Ne plus relancer » au pilote | Le réalisateur a le point d'entrée `exclusions`. L'exécuteur l'appelle sans lui : `realisateursPilote(l.artisan_id, fiche.cree_le)` (`lib/pilote/executeur.ts:263`) | latent (E9) |
| Y5e | Compte en pause, relance seule (fait tout seul) | carte, 0 e-mail. Le pilote relit la pause au départ (`regles.ts:18`) | TIENT |

### Y6 — le pilote face à une carte de lot, par ses deux portes réelles

| # | Essai | Résultat observé | Verdict |
|---|---|---|---|
| Y6a | Le vrai `piloterCarte` (`lib/pilote/serveur.ts`), puis le vrai réalisateur du pilote, sur une carte de lot | `null` sans aucune requête ; le réalisateur répond « ne part jamais par le pilote » ; 0 e-mail | TIENT |

### Les suites demandées, rejouées une à une (`suites-rejouees.txt`)

| Suite | Commande (`node --experimental-strip-types --import ./scripts/ts-loader.mjs …`) | Résultat |
|---|---|---|
| banc 032-028, non modifié | `.orchestre/preuves/032-028/attaques-l16.mjs` | **244 PASS, 0 FAIL**, code 0 |
| `securite-assistant-0211-qa` | `scripts/securite-assistant-0211-qa.mjs` | **238 PASS, 0 FAIL**, code 0 |
| `assistant-qa` | `scripts/assistant-qa.mjs` | **323 PASS, 0 FAIL**, code 0 |
| `relances-impayes-qa` | `scripts/relances-impayes-qa.mjs` | **236/236 contrôles**, code 0 |
| `pilote-qa` | `scripts/pilote-qa.mjs` | **88 verts, 0 rouge**, code 0 |

Ces suites sont vertes parce qu'aucune ne fait passer une carte seule née d'un ordre groupé, ni une carte d'escalade hors du fil du devis,
**jusqu'au départ du pilote**. X1 et A8a ne comptent que les e-mails envoyés pendant le tour.

## Défauts

| # | Gravité | Fichier:ligne | Essai | Défaut | Correction proposée |
|---|---|---|---|---|---|
| **E1** | **majeur** | `lib/assistant/actions-serveur.ts:1810` (`piloterCarte` appelé quel que soit `horsAuto`) ; `lib/pilote/serveur.ts:99-110` (`piloterCarte` ne voit que la carte) | Y2a-e | Un ordre sur plusieurs clients, **reconnu comme tel** (`motifPasUnSeul`, règle du tour `MOTIF_PLUSIEURS`), donne des cartes seules. En Signature, avec le pilote des relances actif, elles partent toutes seules 10 minutes plus tard. La règle de la question 1 (`chantier-4-assistant-plan.md:235`) est ainsi contournée : un lot, ses exclus revus, un clic, jamais le pilote (`actions-serveur.ts:1799`, garde D7). Le modèle reçoit deux consignes contraires (« aucune ne part d'office » et « le pilote l'enverra à 09 h 10 »). Le pilote est un choix explicite de l'artisan, mais il l'a fait pour **une** relance préparée, pas pour un ordre groupé sans revue. | Une carte dont `horsAuto` vaut `MOTIF_PLUSIEURS` ou le motif « plusieurs clients » de `motifPasUnSeul` n'entre jamais au pilote. Inscrire une marque dans ses entrées (comme `MARQUE_CONTENU_TIERS`), et faire refuser cette marque par `piloterCarte`, par `decisionPilote` et par le réalisateur. Mieux : un ordre groupé reconnu au 1er appel répond au modèle « appelle relancer_devis UNE fois avec numeros » (le refus de `ordreGroupe`), pour aboutir à la carte de lot. Rejouer Y2a-e (0 carte au pilote, 0 partie). Mutant : la garde retirée doit faire repartir Y2e. |
| **E2** | **majeur** (§13) | `lib/assistant/actions-serveur.ts:1782` puis `:1810` (la carte d'escalade va au pilote) ; `lib/pilote/executeur.ts:49-63` (`conversationDeLaCarte` : seulement `devis.lead_id`) ; `lib/pilote/file.ts:114-115` (`leadId` nul : aucune relecture) | Y5a-c, Y5f | Le correctif D5 voit le litige écrit dans une autre conversation du même e-mail, et fait une carte « à valider ». Mais il ne la garde pas hors du pilote, et le pilote, au départ, ne relit que la conversation du devis. Un devis créé à la main n'en a pas : la relance part seule chez un client qui écrit « litige, mon avocat ». 032-028 classait D5 en mineur parce que « la carte attend le clic ». En Signature avec pilote, ce n'est pas vrai. Même famille que M3 de 032-018, mais ici le contact est un e-mail et l'assistant **sait**. | (1) Une carte dont `horsAuto` est un motif d'escalade, d'escalade illisible ou de désignation illisible ne va pas au pilote : même marque qu'en E1. (2) Le pilote relit au départ les conversations du même `client_email`, comme `escaladeDeLaCarte` (`actions-serveur.ts:1700`) et `relancesImpayesMagasin`. Une erreur lève. Rejouer Y5b, Y5c et Y5f, avec mutant. |
| E3 | mineur (élevé ; ouvert par 032-030) | `lib/assistant/actions-serveur.ts:416-424` (`cartesRelanceOuvertes` : la borne ne vaut que pour `mode === 'direct'`), lu par `:1160` (relance seule) et `:478` (lot) | Y4c-e | Une carte `relancer_devis` en mode `confirmation`, réclamée (`en_cours`) puis coupée avant sa fin, ne sort jamais de `en_cours`. Cela arrive avec une fonction tuée : `maxDuration = 60` sur un lot de 20, que les lectures ajoutées par la correction allongent, ou un déploiement. Aucun balayeur ne la reprend (`confirmation.ts:105-118`). Ses devis, même jamais tentés, sont alors refusés **à vie** : la relance seule dit « est en train de partir », le lot les exclut. Avant 032-030, la relance seule ne lisait pas les cartes ouvertes. C'est donc une relance légitime désormais bloquée à tort, en silence (le CRM reste une issue). | Appliquer la même borne aux cartes `en_cours` de mode `confirmation`, sur `maj_le` : quelques minutes suffisent, au-delà de `maxDuration`. Ou passer en `echec` une carte `en_cours` plus vieille que N minutes (balayeur n8n, `migration-production.md`). Pour un lot, ne bloquer que les devis dont la réservation existe, pas toute la carte. Rejouer Y4c-e. |
| E4 | mineur (côté sûr, mais contraire au « un objet seul garde le fait tout seul ») | `lib/assistant/cartes.ts:217` (`MARQUES_PLUSIEURS` : `avec`, `plus`, `tout`…), `:219` (`SEPARATEURS` : la virgule), `:238` (tout chiffre restant) | Y3d-j | 7 ordres seuls très courants deviennent des cartes au motif « le message vise plusieurs clients » : « Bonjour, relance M. Leroy », « …, merci », « …avec un ton ferme », « tout de suite », « du 12 octobre », « plus fermement », « …, il n'a pas répondu ». Le « fait tout seul » du 29/10, choisi par Benj pour un objet seul, ne vaut presque plus que pour la phrase nue. Le motif dit à l'artisan est faux. | Ne compter la virgule, « et », « avec » et « plus » comme pluralité que s'ils séparent **deux noms de clients du compte**, ou un nom et un quantifieur. Retirer « tout de suite » et les dates (`\d{1,2} (janvier…décembre)`) des marques. Dire « je n'ai pas pu être sûr du client visé » plutôt que « plusieurs clients ». Garder les mutants A8a et A8d du correctif. |
| E5 | mineur | `lib/assistant/actions-serveur.ts:571` (`lever … .catch(() => null)`) | Y4b | Si la levée de la réservation échoue après un envoi en échec, la trace reste `en_cours` : le devis, jamais relancé, est bloqué `RELANCE_DELAI_JOURS` jours. | Réessayer la levée une fois. Sinon, le dire dans `nonPartis` (« journal à reprendre ») et le signaler au poste de contrôle, plutôt que de taire l'échec. |
| E6 | mineur | `lib/assistant/cartes.ts:217` (ni « and », ni « others ») ; `lib/assistant/actions-serveur.ts:450-456` (`clientsDuCompte`, `.limit(500)` sans `order`) | Y1h, Y1i, Y1k, Y1l | Un ordre groupé à une langue près (« Remind Leroy and the others »), une faute sur le second nom, ou un compte de plus de 500 devis et factures font partir d'office la relance du client nommé. Le second client devient une carte. | Ajouter « and », « others », « everyone », « rest » aux marques. Relire les clients **distincts** (`select distinct` ou une vue) sans plafond, ou refuser la preuve (carte) quand la lecture est tronquée (`count` supérieur à la limite). |
| E7 | mineur | `lib/assistant/cartes.ts:245-246` (la preuve par le nom ne regarde pas combien de devis ouverts ce client a) | Y3k | « Relance M. Leroy » alors que M. Leroy a deux devis envoyés : celui que le modèle choisit part d'office, sans que l'artisan l'ait vu. | Preuve par le nom : exiger que ce client n'ait qu'**un** devis `envoye`. Sinon, une carte (ou un lot) qui montre les deux. |
| E8 | mineur (hérité du 29/10, hors du correctif D2) | `lib/assistant/actions-serveur.ts:597-616` (`R.relancer_devis` seule : aucune réservation avant l'envoi) | Y4g | Deux tours « fait tout seul » simultanés sur le même devis envoient deux relances. La fenêtre est connue de 032-030 (« Risques ») contre un lot, mais elle vaut aussi entre deux tours. | La même réservation que le lot (trace `en_cours`, relecture, puis `executee`) dans le chemin d'office ; et à terme l'index unique partiel proposé par 032-030 (migration, « go » de Benj). |
| E9 | latent (devient majeur quand L13 branche 0185) | `lib/pilote/executeur.ts:263` | Y5d | Le point d'entrée « ne plus relancer » du pilote (D3) existe, mais l'exécuteur ne le transmet pas. Le jour où 0185 sera lue par l'assistant (`dep.exclusionsRelance`), le pilote continuera d'ignorer la liste si personne ne se souvient de cette ligne. | Brancher les deux lecteurs dans le même lot que L13, avec un essai qui passe par `dependancesSupabase().executer`, pas seulement par `realisateursPilote`. |

Ce qui tient, prouvé par un essai rejoué :
- la carte de lot ne part jamais sans clic, ni par le pilote (Y6a, X6) ;
- deux cartes, seule et de lot, cliquées ensemble ne relancent qu'une fois (Y4f, X3c) ;
- un envoi en échec libère le devis (Y4a) ;
- la pause arrête la relance seule (Y5e) ;
- l'escalade du fil du devis est vue (X9a-e) ;
- l'isolation entre comptes tient (X8) ;
- la relance seule nommée par son numéro ou son seul nom part d'office (Y3a-c) ;
- rien de ce que 032-007 à 032-030 avaient fermé ne s'est rouvert : quatre suites vertes, banc 244/0.

## Points à valider (session principale)

1. **Ne pas mettre L16 en production en l'état** : E1 et E2 sont majeurs dès qu'un compte Signature a activé le pilote pour les relances
   de devis. Si Benj juge que le pilote vaut revue pour un ordre groupé, E1 tombe à mineur, mais E2 reste majeur (§13).
2. Les corrections d'E1 et E2 tiennent dans `actions-serveur.ts` (la marque) et `lib/pilote/` (le refus, et la relecture par e-mail) ;
   aucune migration. Essais à rejouer : Y2a-e et Y5b-f (`contre-attaques-l16.mjs`), puis le banc 032-028 et les quatre suites.
3. E3 à corriger dans le même lot : il naît de 032-030.
4. Hors de mon périmètre, à poser par la session principale :
   - l'entrée datée du journal `.claude/agents/knowledge/audit.journal.md` (protocole des agents) ;
   - l'apprentissage pour le vault : « une carte "pas d'office" n'est pas une carte "au clic" en Signature : tout `horsAuto` doit dire
     aussi s'il exclut le pilote ».
5. Cet audit n'a écrit que dans `.orchestre/preuves/032-035/`. Il n'a fait ni typecheck, ni build, ni requête vers la production, ni n8n,
   ni écriture dans le vault.
