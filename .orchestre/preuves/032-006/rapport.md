# 032-006 — quatrième audit offensif des lots L1 et L2 du chantier 4 (correctifs d'après 032-005), 02/11/2026

Auditeur : Claude Code (claude-code), en attaquant. Je n'ai écrit ni le lot, ni ses correctifs, ni les trois audits d'avant.

Je n'ai travaillé qu'en lecture : rien n'a changé hors de `.orchestre/preuves/032-006/`. Je n'ai créé aucun compte de test et joué
aucune suite contre la production. Je n'ai fait ni appel réseau vers Presti en ligne, ni build, ni typecheck, ni commit, ni migration. Je
n'ai lu aucun secret.

Réseau neuronal : j'ai appelé `regles_pour` (« audit offensif de l'assistant de gestion : assistant, pilote, relances, factures,
offres ») avant de commencer. J'ai lu les trois audits d'avant (`032-001`, `032-004`, `032-005`) et leurs scripts, ainsi que le prompt de
Benj (`p3-assistant.md:552-553`, §3.2). J'ai aussi lu le plan : §0, §3 (S1 à S5), §12 et §13.

Les attaques tournent hors ligne, par des scripts placés dans le dossier temporaire de la session, hors du dépôt (code en annexe). Le fetch
est doublé : toute adresse autre que la base factice lève. `sendEmail` est doublé aussi, et toutes les données sont inventées.

J'ai d'abord rejoué les scripts de 032-004 (`rejeu-032-004.mjs`, `rejeu-032-004-b.mjs`), copiés sans changement. Celui de 032-005 a été
rejoué avec un seul renommage, `cartes.nombresEcrits` en `cartes.prixEcrits`, puisque le correctif A3 a renommé la fonction (diff en
annexe B). `attaque-032-006.mjs` porte ensuite les attaques neuves. Toutes les sorties citées viennent de ces exécutions, toutes en code 0.

VERDICT : NE TIENT PAS

Pourquoi : les cinq correctifs tiennent sur leur cible, et chaque attaque des trois audits d'avant échoue désormais. A2 refuse tout prix
de tarif que l'artisan n'a pas écrit. A3 classe correctement 29 textes sur 29, D2 ferme les 29 tournures de 032-005 et D5 repère les 22
mots manqués. I3 relit enfin le fil. Mais deux chemins courants restent **élevés** au sens de la règle du verdict. Ils sont antérieurs au
lot, qui ne les aggrave pas. Ils tombent pourtant pile dans le §3.2 (« parler au nom de l'artisan sur un sujet d'escalade ») :

- **E1 (élevé)** : le cron des relances de conversation ne relit ni l'escalade ni la prise en main. Un client écrit « Litige… mon
  avocat vous écrira ». L'IA se tait et l'artisan répond à la main, comme on le lui demande. Ce clic réarme les relances. Deux jours plus
  tard, en Signature, une relance rédigée par l'IA part seule au nom de l'artisan, même s'il a cliqué « Escalader ». Rejoué de bout en
  bout sur le vrai `GET` du cron : un e-mail est parti.
- **E2 (élevé)** : « fuite » est lu au début d'un mot, si bien que « mon robinet fuit » ou « ça fuit sous l'évier » passent. C'est la
  façon la plus courante de dire une fuite, et le §3.2 nomme « fuite » en toutes lettres. Ni la liste du lot ni les mots par défaut de
  l'artisan ne le repèrent. La réponse part seule (Signature, mode « auto »), et le pilote laisse partir la réponse préparée.

Les deux correctifs sont courts et ne font que restreindre (plus bas). Ce sont les seuls élevés. Le reste se range en moyens et faibles,
pour le lot suivant.

## Bilan par correctif

| # | Correctif | Verdict | Défaut restant (gravité) |
|---|---|---|---|
| A2 | `prixDeLArtisan` sur `R.ajouter_tarif` et `R.modifier_tarif` | **tient** | un prix marqué « TTC » est accepté comme HT, et la conversion juste est refusée (moyen) |
| A3 | `prixEcrits` : prix seulement s'il porte une marque | **tient** | 29 textes sur 29 classés comme attendu |
| D2 | `ACCORD_EN_TETE`, `RETRACTATION`, `REPORT`, `CONDITION`, `FAIT_PARTOUT` | **tient** sur les 29 tournures de 032-005 (0/29) | 26 tournures neuves sur 28 ouvrent encore le mode (moyen) ; 2 vrais ordres sur 9 deviennent des cartes (faible) |
| I3 | `messagesClient` (10 derniers entrants) dans les trois routes | **tient** | au-delà de 10 messages, l'escalade sort de la fenêtre (faible) |
| D5 | lexique élargi, mots entiers, exclusions | **tient** sur les 22 mots de 032-005 (0/22 manqués) | **E2 : « fuit » (élevé)** ; « urgent » et 15 autres tournures manquées (moyen) |
| D1, D1 bis, D3, D4, D6, D7 | rejoués | **tiennent** | — |
| — | voisin du lot : cron des relances de conversation | — | **E1 : relance seule sur un fil en escalade ou pris en main (élevé)** |
| — | voisin du lot : relances d'impayés | — | contestation écrite avant l'échéance non lue (moyen) |
| — | suites | 10 sur 10 vertes | aucune ne joue E1, E2, « TTC », ni les 28 tournures de D2 ci-dessous |

## E1 (élevé) — le cron des relances de conversation parle seul sur un fil en escalade

Le chemin, au fichier :

1. Le client écrit « Litige : vous avez inondé ma cuisine, mon avocat vous écrira ». `decisionReponse` rend `escalade`, l'IA se tait,
   et l'artisan reçoit « ⚠️ Demande sensible… à vous de lui répondre ». Le dossier passe `en_discussion`
   (`app/api/conversation/route.ts:168`).
2. L'artisan répond à la main depuis Messages (`app/api/messages/route.ts:139` → `repondreServeur`). La fonction remet le dossier en
   `repondu` (`lib/envoisServeur.ts:168`) et appelle `planifierRelances(lead.id)` (`lib/envoisServeur.ts:170`) : J+2, J+5 et J+10. S'il
   a cliqué « Je prends la main » ou « Escalader » (`app/api/messages/route.ts:75-79` : `prise_en_main = true`, `urgence = 'urgent'`),
   rien n'annule ces relances. Aucune autre écriture sur la table `relances` ne le fait (grep `from('relances')`).
3. Le cron du matin lit le dossier sans `prise_en_main` (`app/api/cron/relances/route.ts:86`). Il ne demande que `statut = 'repondu'`
   (`:91`) et, pour l'offre, `peut(plan, 'relances.auto')` (`:168`). Il fait rédiger la relance par le modèle à partir de `lead.message`,
   la demande d'origine (`:140-142`), puis l'envoie (`:187`). Il ne lit nulle part `sujetEscalade`, `motEscalade` ni `prise_en_main`
   (grep sur le source : `false`). Le pilote, lui, relit l'escalade (S3), mais cette relance ne passe pas par lui.

Je l'ai rejoué sur le vrai `GET` du cron, copié avec ses dépendances lourdes doublées. Base, registre S4, offres et plateforme sont
les vrais modules, sur la base factice :

```
Signature, « Litige … mon avocat » puis réponse de l’artisan à la main, sans prise en main => {"statut":200,"sent":1,"prepared":0,"skipped":0,"emails_partis":[{"a":"client@essai.test","sujet":"Suite à votre demande — Atelier Essai","debut":"Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Devis pour refaire la s"}]}
Signature, même fil, et l’artisan a cliqué « Escalader » (prise_en_main = true, urgence) => {"statut":200,"sent":1,…même e-mail…}
témoin Studio, même fil : la relance est proposée, pas envoyée => {"statut":200,"sent":0,"prepared":1,"skipped":0,"emails_partis":[]}
le cron lit-il prise_en_main ou sujetEscalade ? (grep dans le source) => false
repondreServeur (réponse à la main) réarme-t-il les relances ? (source) => true
```

- Pourquoi c'est élevé : rien d'inhabituel n'est demandé. Le client écrit son litige, l'artisan fait ce que la notification lui demande
  (répondre), et le client ne reprend pas la conversation sous deux jours, ce qui est le cas courant d'un litige parti chez un avocat.
  La relance part alors **sans clic**, rédigée par le modèle **au nom de l'artisan**, sur un fil d'escalade, même après « Escalader ».
  C'est le geste que le §3.2 range dans « ne s'automatise jamais ». Pire encore : quand le litige est dans la **demande d'origine**
  (`leads.message`), la relance est écrite à partir de ce texte même (`:142`).
- Portée : toute offre qui a `relances.auto` (Signature). Studio ne fait que proposer, et l'artisan clique.
- Antériorité : le défaut est déjà en production, et le lot ne l'aggrave pas. Mais le lot modifie cette même boucle (registre S4,
  `:126`), et son §0.1 compte « le cron des relances » parmi les automatisations que S1 à S5 réparent. Son §13 promet l'escalade
  relue « avant la réponse seule » et « au départ du pilote ». Ce troisième envoi seul reste ouvert.
- Correctif attendu, une restriction de quelques lignes dans la boucle (`:80-130`) : lire `prise_en_main` ; si elle est vraie, la
  relance est annulée (`envoyee: true`). Relire les 10 derniers messages entrants du dossier (`MESSAGES_ESCALADE_RELUS`), et si
  `sujetEscalade(textes, cfg.escalade_mots)` trouve un mot, ne rien envoyer : la relance devient une proposition (`etat:
  'proposition'`, comme Studio) ou est annulée. Une lecture en erreur ne laisse rien partir. Il faut un essai et son mutant, par exemple
  dans `relances-registre-qa` ou `garde-fou-envoi-qa`.
- Un voisin moyen, côté impayés : `reponseClient` ne compte que les messages postérieurs à l'échéance quand aucune relance n'est encore
  partie (`lib/relancesImpayes.ts:241`, `lib/relancesImpayesMagasin.ts:70`). Un client qui conteste sa facture dans la conversation avant
  l'échéance recevra donc la relance J+N, en Signature, si l'artisan a coché l'option. Il faut une option cochée, une contestation écrite
  par la page plutôt que par e-mail, et ce calendrier précis : la gravité est moyenne. Correctif : `sujetEscalade` sur les messages du
  dossier, quelle qu'en soit la date.

## E2 (élevé) — « ça fuit » n'est pas une fuite pour le lexique

`MOTS_ESCALADE_TOUJOURS` se lit au **début** d'un mot (`lib/pilote/regles.ts:180`, ``mots.includes(` ${k}`)``). Or la racine retenue
est « fuite » (`:140`), et « fuit » ne commence pas par « fuite ». Les mots par défaut de l'artisan (`lib/plateformeConfig.ts:57`), lus
n'importe où dans le texte (`:134`), ont le même défaut : « fuite » ne se trouve pas dans « fuit ». « Urgence » ne se trouve pas non
plus dans « urgent ».

```
« Mon robinet fuit » => null          « Le ballon fuit depuis ce matin » => null      « Ça fuit sous l’évier » => null
« Le toit fuit quand il pleut » => null      « Les canalisations fuient » => null
decisionReponse « Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ? » (Signature, auto) => {"ok":true}
decisionReponse « Fuite sous l’évier » => {"ok":false,"raison":"escalade","mot":"fuite","comportement":"silence"}
pilote : sujetEscalade(10 derniers messages, mots par défaut) sur « mon ballon fuit » => null
```

- Pourquoi c'est élevé : le §3.2 nomme « « fuite » » entre guillemets, et le plan l'assume (§3 S3 : « un plombier en Signature verra ses
  réponses « fuite » revenir à la main »). « Mon ballon fuit » est la phrase la plus banale d'un client de plombier : ce n'est ni une
  tournure rare ni une coïncidence. En Signature, en mode « auto », la réponse part seule ; en mode « assistée », le pilote envoie la
  réponse préparée au bout de 10 minutes.
- Pourquoi je m'écarte de 032-005, qui rangeait les mots manqués en « faible » : la règle de ce verdict réserve « faible » au faux positif
  et à la carte de trop. Un mot manqué fait parler l'assistant à la place de l'artisan. Il n'est moyen que si la tournure est rare, et
  « ça fuit » ne l'est pas.
- La suite `garde-fou-envoi-qa` passe « urgence, ça fuit » (`scripts/garde-fou-envoi-qa.mjs:95`) : c'est « urgence » qui déclenche, et
  le mot « fuit » est masqué.
- Correctif : ajouter les racines `fuit` (fuit, fuite, fuites), `fuient`, `fuyait` et `urgen` (urgent, urgente, urgence, urgemment) à
  `MOTS_ESCALADE_TOUJOURS`. `FAUSSE_URGENCE` couvre déjà « pas urgent » et « pas d'urgence » (`:168`), et ne servait jusqu'ici à rien
  pour « urgent ». Il faut un essai et son mutant dans `pilote-qa` ou `securite-assistant-0211-qa`. Dans le même geste, faire lire aussi
  `motEscalade` au début des mots ne coûte rien.

## A2 — tient

```
ajouter_tarif — prix lu dans un autre devis, artisan sans prix => "Le prix 450,00 € HT ne vient pas de ce que l'artisan t'a écr…", rien d’écrit
ajouter_tarif — « ordre de grandeur » de l’assistant, artisan « ok » => refusé, rien d’écrit
ajouter_tarif — artisan « 450 € HT » => "tarif ajouté : 450,00 € HT"
ajouter_tarif — artisan « 1 200 € », prix 1200 => ajouté ; prix 200 (morceau du nombre) => refusé
modifier_tarif 520 (dit par l’assistant) => refusé, prix en base 400 ; témoin « Passe le ballon à 520 € » => "tarif modifié : 400,00 € → 520,00 € HT"
rejeu 032-005 A2 (chaîne complète) : envoyer_devis => carte en_attente ; decisionPilote => {"auto":false,"motif":"prix_non_source"}
```

Les autres façons de faire entrer un prix dans une ligne « au tarif » ont été cherchées, et toutes ferment :
- `augmenter_tarifs` et `creer_facture_libre` sont des cartes, dans `OUTILS_JAMAIS_AUTO` (sortie : `["confirmation",true,"confirmation",true]`).
- `retenir_resultat` écrit dans l'inventaire, pas dans `prix_artisan`. Une ligne de devis ne s'appuie que sur `tarif_id` (`outils-actions.ts:530`).
- Les inverses (`restaurer_prix_tarif`, `recreer_tarif`) ne sont pas des outils : leurs entrées sont posées par le serveur à la création de l'annulation.
- Le chiffrage IA ne garde « vos tarifs · … » qu'au centime d'un poste du catalogue (`lib/prix/types.ts:66-83`).

**Moyen — « TTC » pris pour HT.** `prixEcrits` retient « 450 € TTC » comme le nombre 450, et le compare à `prix_ht`. Le modèle qui
convertit bien (409,09 € HT à 10 %) est **refusé** ; celui qui recopie 450 dans le champ HT est **accepté** :
```
ajouter_tarif — artisan « 450 € TTC », prix_ht converti (TVA 10 %) = 409,09 => refusé
ajouter_tarif — artisan « 450 € TTC », prix_ht = 450 (TTC pris pour HT) => "tarif ajouté : 450,00 € HT"
```
Le tarif est alors faux de 10 à 20 %, et un devis fait avec part seul au tarif. Il en va de même pour une ligne de `creer_devis` qui
reçoit « prix donné par l'artisan ». Je le range en moyen, pas en élevé, parce que le nombre est bien celui de l'artisan et qu'il faut que
le modèle ignore un « TTC » explicite face à un champ « Prix unitaire HT » (`outils-actions.ts:152`). Le message de refus lui dit en plus
de redemander le prix en HT (`actions-serveur.ts:159`). Mais la garde pousse vers l'erreur, puisqu'elle refuse la bonne réponse.
Correctif : un nombre marqué TTC (ou « toutes taxes ») ne compte jamais tel quel pour un prix HT. On peut y admettre ses formes HT à
5,5, 10 et 20 %, ou refuser avec « prix TTC donné : quel taux de TVA ? ».

## A3 — tient (29 sur 29)

Les quantités (« 45 m² », « 3 ballons », « 2 heures »), les dates (« le 15/11 », « le 12 juin », « vers 8h30 »), les numéros (« 12 rue »,
« DEV-2026-0120 », un téléphone), « 50 km/h » et « 10 % » ne donnent aucun prix. « 450 € », « 450 euros », « 450 HT », « € 450 »,
« 45 € le m² », « 45/m² », « 12,50 € », « 1 200 € », « 1.200 € » (1,2 et 1 200), « 450e HT », « 35 € de l'heure » et « 2x450 € » en
donnent un. Le rejeu des quatre coïncidences de 032-005 rend `prix repris d’une donnée, à vérifier` et `prixSources: false`.

Une information, sans gravité : un prix que l'artisan a écrit dans une **question** (« c'était 450 € ? ») compte pour la suite de la
conversation. C'est bien son nombre ; le correctif voulu ne l'exclut pas.

## D2 — tient sur sa cible ; moyen sur 26 tournures neuves

Les 29 tournures de 032-005 ferment toutes (0 sur 29 en annexe C), comme les 36 de 032-004. Sur 28 tournures neuves (annexe D),
26 ouvrent encore le mode :
- **Dates et moments que `REPORT` ignore** (`lib/assistant/cadrage.ts:205`) : « le 15 », « le 15 novembre », les mois (« en décembre »,
  « début janvier », « mi-novembre »), « ce week-end », « à la fin **des** travaux » (seuls « fin du » et « fin de » sont lus), « à 18 h »,
  « dans la soirée », « sous huitaine », « une fois signé » (seul « une fois que » est lu), « dès réception » (seul « dès que » est lu),
  « à la Toussaint », « au retour de Paul ».
- **Refus sans les mots attendus** : « Relance Dupont ? Bof. », « … ? Mouais. », « … ? Euh… », « Relance Dupont, nan ».
- **Accusés de réception après « Voulez-vous que je le relance ? »** : « Ok noté », « Bien noté », « Noté, merci » ouvrent le mode,
  parce que « note » est dans `VERBES_ORDRE` (`:189`). « Ok merci » l'ouvre aussi, l'accord étant seul après la politesse.
  `blocCadrage` dit alors au modèle « FAIS-LA avec l'outil correspondant, tout de suite ».
- **Faits au participe sans accord ni accent** : « Relance Dupont envoyé », « Facture Dupont payé », « Facture Dupont réglé », « … ok
  c'est parti ». `FAIT_EN_FIN` (`:213`) n'a ni « envoye », ni « paye », ni « regle » au masculin, et « regle » est un verbe d'ordre (`:195`).

Pourquoi c'est moyen : le pire qui parte est une relance, ou un devis entièrement sourcé, envoyé trop tôt. Aucun de ces deux gestes n'est
au §3.2 : un geste §3.2 reste une carte (`jamaisAutomatique`, rejoué), un devis non sourcé aussi (D1), et une relance déjà faite dans les
3 jours par un autre chemin de Presti est refusée (S4). « Facture Dupont payé » ne peut pas encaisser seul, puisque
`marquer_facture_payee` est dans `OUTILS_JAMAIS_AUTO`.

Correctif suggéré :
- ajouter à `REPORT` « le \d{1,2} », les noms de mois, « mi », « début », « week end », « fin des », « soirée », « matinée », « huitaine »,
  « une fois », « dès », « au retour » et « à \d+ h » ;
- ajouter à `RETRACTATION` « bof », « mouais », « euh » et « nan » ;
- sortir `note` de `VERBES_ORDRE` quand il est seul après un accord (« ok noté ») ;
- ajouter à `FAIT_EN_FIN` « envoye », « paye » et « regle » ;
- jouer les 28 phrases.

Vrais ordres devenus des cartes (faible) : « Relance Dupont, il ne répond plus » et « Réponds à Dupont que je passe jeudi », où « jeudi »
est lu comme un report. Les autres ordres testés ouvrent bien le mode.

## I3 — tient

```
rejeu 032-005 : « Alors, vous me répondez ? » après « mon avocat » => {"ok":false,"raison":"escalade","mot":"litige","comportement":"silence"}
9 messages neutres après « mon avocat » (le litige reste dans les 10) => escalade
10 messages neutres après « mon avocat » (le litige sort des 10) => {"ok":true}
mot propre à l’artisan (« carrelage fissuré ») dans un message d’avant => escalade
```

Les trois routes passent bien les entrants du fil :
- `app/api/conversation/route.ts:186-187` et `stream/route.ts:111` : l'historique est en ordre croissant, borné à 120 messages, et
  `MAX_TOURS = 60` ;
- `lib/canaux/serveur.ts:157-158` : ce chemin ne fait que préparer.

`slice(-10)` prend donc les plus récents. La demande d'origine est bien dans `messages` (`app/api/leads/route.ts:264-443`).

Faible : un client qui écrit dix messages après son litige fait sortir le mot de la fenêtre. Il faut de l'insistance, et la prise en main
manuelle reste le vrai verrou. Correctif durable : poser une marque d'escalade sur le dossier au premier mot (ce qui fermerait aussi E1).

## D5 — tient sur sa cible ; E2 (élevé) et 16 manques moyens

Les 22 tournures de 032-005 et les 20 de 032-004 sont toutes repérées (annexes C et E). Sur 20 tournures neuves, 18 passent :
- les 5 « fuit » / « fuient » (E2, élevé, plus haut) ;
- « C'est urgent », « Très urgent svp », « Urgent : plus d'eau chaude » ;
- « L'eau coule du plafond », « Ça goutte du plafond de la cuisine », « Mon disjoncteur saute sans arrêt » ;
- « Vous m'avez escroqué » : la racine « escroc » ne commence pas « escroqu » ;
- « Je vais me plaindre », « Je veux des dommages et intérêts », « Je vais contacter une association de consommateurs », « Travail
  bâclé », « C'est mal fait, je ne suis pas content », « Je vais vous signaler à la répression des fraudes ».

Je range ces 13 cas en **moyen**, pas en élevé. « Urgent » n'est pas au §3.2 (litige, sinistre, fuite, menace, avocat), même si le plan
le met au plancher. Les autres sont des synonymes : le client qui menace ou se plaint emploie souvent aussi un mot repéré, mais pas
toujours.

Ajouts suggérés : `urgen`, `coule du`, `ça coule`, `goutte du`, `escroqu`, `plaindre`, `plains`, `dommages et`, `consommateur`, `bâcl`,
`mal fait`, `fraude`, `disjonct`. Le lexique par métier reste en vague 2 (plan §3 S3).

Faux positifs (faible, côté sûr) : « Le vol de nuit » est repéré comme « vol ». Le correctif « fuit » prendrait aussi « elle fuit les
devis trop chers », ce qui est le côté sûr.

## D1, D1 bis, D3, D4, D6, D7 — tiennent (rejeu)

- **D1** : un devis estimé, à chiffrer, sans provenance, vide ou illisible devient une carte. Le témoin entièrement au tarif part seul.
  `securite-assistant-0211-qa` le joue.
- **D1 bis** : une ligne recopiée d'un devis estimé prend `prix repris d’une donnée, à vérifier`, et `envoyer_devis` devient une carte.
- **D3** : `leads`, `messages`, `plateforme_config`, le compte des messages et `artisans` en erreur 500 lèvent tous, et rien ne part.
- **D4** : le produit est déplié au webhook (`app/api/stripe/webhook/route.ts:232`, `expand: ['items.data.price.product']`), et l'Entreprise
  se reconnaît par la métadonnée du produit ou du prix (`lib/abonnementSync.ts:73-75`). Au portail sur le prix de Signature, le compte
  passe en Signature. Les deux informations de 032-005 tiennent, sans risque d'argent (la ligne lue est `items.data[0]`).
- **D6** : erreur de colonne (42703, PGRST204) ou délai (57014) → `refus: illisible`.
- **D7** : `offres-affichage-qa` et `garde-fou-envoi-qa` sont dans `SUITES` (`scripts/tout-verifier.mjs:57`, `:54`) : la réserve
  faible de 032-005 est levée.

## Les suites, jouées une à la fois (02/11, hors ligne)

| Suite | Sortie | Code |
|---|---|---|
| `securite-assistant-0211-qa` | `123 PASS, 0 FAIL` (109 à 032-005) | 0 |
| `relances-registre-qa` | `44 PASS, 0 FAIL` | 0 |
| `assistant-qa` | `310 PASS, 0 FAIL` | 0 |
| `assistant-tout-qa` | `120 PASS, 0 FAIL` | 0 |
| `pilote-qa` | `88 vert(s), 0 rouge(s)` | 0 |
| `relances-impayes-qa` | `✅ relances-impayes-qa : 218/218 contrôles` | 0 |
| `offres-affichage-qa` | `✅ offres-affichage-qa : 286/286 contrôles` | 0 |
| `essais-gratuits-qa` | `✅ essais-gratuits-qa : 44 réussis, 0 échoués` | 0 |
| `crm-qa` | `216 vert(s), 0 rouge(s)` | 0 |
| `garde-fou-envoi-qa` | `✓ garde-fou des envois : 33 vert(s), 0 rouge(s)` | 0 |

`securite-assistant-0211-qa` joue désormais A2 (`ajouter_tarif` 6 fois, `modifier_tarif` 4), A3 (`prixEcrits` 4) et I3
(`messagesClient` 6). Grep sur les suites : aucune ne joue « fuit » ni « urgent » seuls, le cron sur un fil en escalade ou pris en main,
le TTC, ni les 28 tournures de D2 ci-dessus.

## Points à valider (session principale, Benj)

1. **E1, avant le push** : dans la boucle de `app/api/cron/relances/route.ts`, lire `prise_en_main` et relire les 10 derniers entrants par
   `sujetEscalade`. Un fil pris en main ou en escalade ne reçoit plus de relance seule (annulée, ou proposée comme en Studio). Il faut un
   essai et son mutant. La correction ne fait que restreindre.
2. **E2, avant le push** : ajouter `fuit`, `fuient` et `urgen` à `MOTS_ESCALADE_TOUJOURS`, avec un essai et son mutant (« Mon ballon fuit »
   doit rendre `escalade`).
3. Puis un audit distinct sur ces deux points seulement : le reste a tenu.
4. Pour le lot suivant :
   - le TTC pris pour HT ;
   - les 26 tournures de D2 ;
   - les 13 manques moyens de D5 ;
   - la contestation d'impayé avant l'échéance ;
   - la fenêtre de 10 messages d'I3 (une marque d'escalade sur le dossier la fermerait, et E1 avec).
5. Antériorité, à décider en connaissance de cause : E1 et E2 sont déjà en production, et ce lot n'en est pas la cause. La règle du verdict
   s'applique telle quelle et donne « ne tient pas ». Si Benj préfère pousser L1 et L2 tels quels, parce qu'ils ferment S1 à S5 sans rien
   ouvrir, c'est à lui de le dire par écrit. Les deux correctifs tiennent en quelques lignes chacun.
6. Restent à la session principale : `npm run typecheck`, `npm run build` (`PRESTI_DIST=.next-prod`), le déploiement et les suites en
   direct (`pilotage-e2e`, `relances-e2e`).

## Annexes — les scripts d'attaque (hors dépôt)

Dossier temporaire de la session :
`C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-Documents-presti\912bb94c-0621-4b9d-b347-13c7aff2d679\scratchpad\`.

Les scripts se lancent depuis la racine du dépôt : `node --experimental-strip-types --import ./scripts/ts-loader.mjs <script>`. Ils ne
lisent aucun secret (clés d'essai inventées, `RESEND_API_KEY` ôtée) et ne touchent pas au réseau. Leur dossier de copies temporaires est
effacé en fin de passage.

`rejeu-032-004.mjs` et `rejeu-032-004-b.mjs` sont les annexes A et B de `.orchestre/preuves/032-004/rapport.md`, copiées sans
changement. `rejeu-032-005.mjs` est l'annexe A de `.orchestre/preuves/032-005/rapport.md`, au renommage près (annexe B).

### Annexe A — `attaque-032-006.mjs`

```js
#!/usr/bin/env node
// Quatrième audit 032-006 : attaques hors ligne des correctifs A2, A3, D2, I3, D5 (lots L1 et L2 du chantier 4), et de deux chemins voisins
// (cron des relances de conversation, lexique). Lecture seule : aucun réseau (fetch doublé, toute autre adresse lève), aucune base, aucun
// modèle, aucun e-mail (sendEmail doublé). Données inventées.
// Lancer depuis C:/Users/benja/Documents/presti :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs <ce fichier>
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
register(`data:text/javascript,${encodeURIComponent("export async function resolve(spec, ctx, next) { if (spec.startsWith('next/') && !spec.slice(5).includes('.') && !spec.slice(5).includes('/')) return next(spec + '.js', ctx); return next(spec, ctx) }")}`)
process.removeAllListeners('warning')
process.on('warning', () => {})
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://base.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-essai'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-essai'
process.env.CRON_SECRET = 'secret-essai'
delete process.env.RESEND_API_KEY

const RACINE = process.cwd()
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const L = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const log = (etiquette, valeur) => console.log(`${etiquette} => ${typeof valeur === 'string' ? valeur : JSON.stringify(valeur)}`)

// ── Doublure de PostgREST (reprise des scripts de 032-001 à 032-005) ──
const T = {}
const requetes = []
function cond(champ, brut) {
  let v = brut, non = false
  if (v.startsWith('not.')) { non = true; v = v.slice(4) }
  const [op, ...r] = v.split('.'); const x = decodeURIComponent(r.join('.'))
  let res = true
  if (op === 'eq') res = String(champ) === x
  else if (op === 'is') res = x === 'null' ? champ === null || champ === undefined : String(champ) === x
  else if (op === 'in') res = x.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(champ))
  else if (op === 'lte') res = String(champ) <= x
  else if (op === 'gte') res = String(champ) >= x
  else if (op === 'gt') res = String(champ) > x
  return non ? !res : res
}
const ORDRE = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])
const entete = (h, k) => (h ? (typeof h.get === 'function' ? h.get(k) : h[k] ?? Object.entries(h).find(([x]) => x.toLowerCase() === k.toLowerCase())?.[1]) : undefined)
globalThis.fetch = async (entree, init = {}) => {
  const url = new URL(typeof entree === 'string' ? entree : entree.url ?? String(entree))
  if (url.hostname !== 'base.test') throw new Error(`réseau interdit : ${url.host}`)
  const methode = String(init.method ?? 'GET').toUpperCase()
  const rep = (corps, statut = 200, h = {}) => new Response(corps === undefined ? null : JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json', ...h } })
  if (url.pathname.startsWith('/rest/v1/rpc/')) { requetes.push({ methode, table: 'rpc' }); return rep(true) }
  const table = url.pathname.slice('/rest/v1/'.length)
  const lignes = (T[table] ??= [])
  const params = [...url.searchParams].filter(([k]) => !ORDRE.has(k))
  requetes.push({ methode, table, url: String(url) })
  const corps = init.body ? JSON.parse(init.body) : null
  if (methode === 'GET' || methode === 'HEAD') {
    let r = lignes.filter((l) => params.every(([k, v]) => k === 'or' || cond(l[k], v)))
    if (methode === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `0-0/${r.length}` } })
    const lim = url.searchParams.get('limit'); if (lim) r = r.slice(0, Number(lim))
    if (String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object')) return r.length === 1 ? rep(r[0]) : r.length === 0 && url.searchParams.has('limit') ? rep(null) : rep({ code: 'PGRST116', message: 'no rows' }, 406)
    return rep(r)
  }
  if (methode === 'PATCH') {
    const touchees = lignes.filter((l) => params.every(([k, v]) => cond(l[k], v)))
    for (const l of touchees) Object.assign(l, corps)
    return rep(touchees)
  }
  if (methode === 'POST') { for (const n of Array.isArray(corps) ? corps : [corps]) lignes.push({ id: id(7000 + lignes.length), ...n }); return rep([]) }
  return rep([])
}
const vider = () => { for (const k of Object.keys(T)) delete T[k]; requetes.length = 0 }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-attaque-032-006-'))
async function copie(rel, doublures) {
  let code = fs.readFileSync(path.join(RACINE, rel), 'utf8')
  let n = 0
  for (const [spec, contenu] of Object.entries(doublures)) {
    const f = path.join(TMP, `doublure-${++n}.ts`); fs.writeFileSync(f, contenu)
    code = code.split(`from '${spec}'`).join(`from '${pathToFileURL(f).href}'`)
  }
  const dir = path.dirname(path.join(RACINE, rel))
  code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, a, q, spec) => `${a}${q}${pathToFileURL(path.resolve(dir, spec)).href}${q}`)
  const f = path.join(TMP, `${path.basename(rel, '.ts')}-copie.ts`); fs.writeFileSync(f, code)
  return import(pathToFileURL(f).href)
}

const ARTISAN = { id: A, plan: 'signature', is_founder: false, nom: 'Atelier Essai', email: 'atelier@essai.test', metier: 'Plombier', ton_style: null, leads_pause: false, plateforme_active: true }

try {
  const cadrage = await imp('lib/assistant/cadrage.ts')
  const R = await imp('lib/pilote/regles.ts')
  const srvMod = await imp('lib/assistant/actions-serveur.ts')
  const oa = await imp('lib/assistant/outils-actions.ts')
  const conf = await imp('lib/assistant/confirmation.ts')
  const cartes = await imp('lib/assistant/cartes.ts')
  const PC = await imp('lib/plateformeConfig.ts')

  const ESSAI_TARIF = id(8001)
  function srvDe(textesArtisan, routes) {
    return srvMod.actionsDeSession({
      uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(900), tour: () => 1, magasin: conf.magasinEnMemoire(),
      textesArtisan,
      dependances: {
        envoyerDevis: async () => new Response('{}'), piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z'),
        appeler: async (_g, chemin, o) => {
          routes.push({ chemin, corps: o?.corps ?? null })
          if (chemin === '/api/tarifs' && o?.corps) (T.prix_artisan ??= []).push({ id: ESSAI_TARIF, artisan_id: A, actif: true, designation: o.corps.designation, prix_ht: o.corps.prix_ht, unite: o.corps.unite ?? 'u', tva_taux: o.corps.tva_taux ?? 10, fournisseur: o.corps.fournisseur ?? null, reference: o.corps.reference ?? null, date_prix: '2026-11-02' })
          return { status: 200, json: { ok: true } }
        },
      },
      autonome: () => true,
    })
  }

  // ═══ A. A2 — la bibliothèque de tarifs
  console.log('\n── A2. ajouter_tarif / modifier_tarif : seul un prix ÉCRIT par l’artisan entre')
  for (const [nom, textes, prix] of [
    ['prix lu dans un autre devis, artisan sans prix', ['Mets le ballon du devis de Martin dans mes tarifs'], 450],
    ['« ordre de grandeur » de l’assistant, artisan « ok »', ['Ok, mets mon tarif ballon à jour'], 520],
    ['artisan « 450 € HT »', ['Mets la pose ballon à 450 € HT dans mes tarifs'], 450],
    ['artisan « 450 € TTC », prix_ht converti (TVA 10 %) = 409,09', ['Mets la pose ballon à 450 € TTC dans mes tarifs'], 409.09],
    ['artisan « 450 € TTC », prix_ht = 450 (TTC pris pour HT)', ['Mets la pose ballon à 450 € TTC dans mes tarifs'], 450],
    ['artisan « 1 200 € » (milliers), prix 1200', ['Le forfait salle de bain à 1 200 € dans mes tarifs'], 1200],
    ['artisan « 1 200 € », prix 200 (morceau du nombre)', ['Le forfait salle de bain à 1 200 € dans mes tarifs'], 200],
  ]) {
    vider(); T.artisans = [{ ...ARTISAN }]; T.prix_artisan = []
    const routes = []
    const srv = srvDe(textes, routes)
    const v = oa.validerAction('ajouter_tarif', { designation: 'Pose ballon 200 L', prix_ht: prix, unite: 'u' })
    const r = await srv.executeurs.ajouter_tarif(v.entree)
    log(`  ajouter_tarif — ${nom}`, { resume: String(r.resume ?? r.erreur ?? '').slice(0, 60), ecrit_dans_prix_artisan: (T.prix_artisan ?? []).map((t) => t.prix_ht) })
  }
  {
    vider(); T.artisans = [{ ...ARTISAN }]; T.prix_artisan = [{ id: ESSAI_TARIF, artisan_id: A, actif: true, designation: 'Pose ballon 200 L', prix_ht: 400, unite: 'u', tva_taux: 10, fournisseur: null, reference: null, date_prix: '2026-10-01' }]
    const srv = srvDe(['Ok, mets mon tarif ballon à jour'], [])
    const r = await srv.executeurs.modifier_tarif(oa.validerAction('modifier_tarif', { tarif_id: ESSAI_TARIF, prix_ht: 520 }).entree)
    log('  modifier_tarif 520 (dit par l’assistant, pas par l’artisan)', { resume: String(r.resume ?? '').slice(0, 60), prix_en_base: T.prix_artisan[0].prix_ht })
    const srv2 = srvDe(['Passe le ballon à 520 €'], [])
    const r2 = await srv2.executeurs.modifier_tarif(oa.validerAction('modifier_tarif', { tarif_id: ESSAI_TARIF, prix_ht: 520 }).entree)
    log('  témoin : modifier_tarif 520 écrit par l’artisan (« 520 € »)', { resume: String(r2.resume ?? '').slice(0, 60) })
  }
  log('  catégories des outils qui écrivent un prix ailleurs (augmenter_tarifs, creer_facture_libre)', [oa.categorieDe('augmenter_tarifs'), R.jamaisAutomatique('augmenter_tarifs'), oa.categorieDe('creer_facture_libre'), R.jamaisAutomatique('creer_facture_libre')])

  // ═══ B. A3 — prixEcrits
  console.log('\n── A3. prixEcrits : un prix porte une marque ; une quantité, une date, un numéro n’en sont pas (valeurs en euros)')
  const casA3 = [
    ['45 m² cette fois', []], ['chantier le 15/11', []], ['au 12 rue des Lilas', []], ['devis DEV-2026-0120', []], ['3 ballons', []], ['à 14 h', []], ['2 heures', []], ['50 km/h', []],
    ['remise de 10 %', []], ['06 12 34 56 78', []], ['le 12 juin', []], ['vers 8h30', []],
    ['450 €', [450]], ['450 euros', [450]], ['450 HT', [450]], ['450 € TTC', [450]], ['€ 450', [450]], ['45 € le m²', [45]], ['45/m²', [45]], ['45 le m²', [45]], ['12,50 €', [12.5]], ['1 200 €', [1200]], ['1.200 €', [1.2, 1200]],
    ['450e HT', [450]], ['35 de l’heure', []], ['35 € de l’heure', [35]], ['3 ballons à 450 € pièce', [450]], ['2x450 €', [450]], ['3 450 €', [3450]],
  ]
  for (const [t, attendu] of casA3) {
    const s = [...cartes.prixEcrits([t])].map((c) => c / 100).sort((a, b) => a - b)
    const ok = JSON.stringify(s) === JSON.stringify([...attendu].sort((a, b) => a - b))
    log(`  ${ok ? 'conforme' : '≠ ATTENDU'} « ${t} »`, s)
  }

  // ═══ C. D2 — l'ordre net, tournures neuves
  console.log('\n── D2. Tournures neuves qui ne sont PAS des ordres (⚠ OUVRE = le mode « fait tout seul » s’ouvre)')
  const PROPOSE = 'Dupont n’a pas répondu depuis 12 jours. Voulez-vous que je le relance ?'
  const pasOrdres = [
    // reports par date, mois, moment
    ['Relance Dupont le 15', null], ['Relance Dupont le 15 novembre', null], ['Relance Dupont en décembre', null], ['Envoie le devis à Dupont début janvier', null],
    ['Relance Dupont mi-novembre', null], ['Relance Dupont ce week-end', null], ['Relance Dupont à la fin des travaux', null], ['Relance Dupont à 18 h', null],
    ['Relance Dupont dans la soirée', null], ['Relance Dupont sous huitaine', null], ['Envoie le devis à Dupont une fois signé', null], ['Envoie le devis à Dupont dès réception des photos', null],
    ['Relance Dupont à la Toussaint', null], ['Relance Dupont au retour de Paul', null],
    // refus ou doute sans les mots attendus
    ['Relance Dupont ? Bof.', null], ['Relance Dupont ? Mouais.', null], ['Relance Dupont, nan', null], ['Relance Dupont ? Euh…', null],
    // accusés de réception après une proposition
    ['Ok noté', PROPOSE], ['Bien noté', PROPOSE], ['Noté, merci', PROPOSE], ['Ok merci', PROPOSE], ['Super merci', PROPOSE], ['Top', PROPOSE],
    // faits au participe (genre ou accent du téléphone)
    ['Relance Dupont envoyé', null], ['Facture Dupont payé', null], ['Facture Dupont réglé', null], ['Relance Dupont ok c’est parti', null],
  ]
  let ouvre = 0
  for (const [m, avant] of pasOrdres) {
    const c2 = cadrage.cadrerDemande(m, avant)
    const ft = cadrage.faitToutSeul(c2, { contenuTiersLu: false })
    if (ft) ouvre++
    log(`  ${ft ? '⚠ OUVRE' : 'ferme '} « ${m} »${avant ? ' (après « Voulez-vous que je le relance ? »)' : ''}`, { ordre: c2.ordre, question: c2.question })
  }
  log('  total qui ouvrent', `${ouvre} / ${pasOrdres.length}`)
  console.log('\n── D2. Vrais ordres (✗ carte = un clic de plus)')
  const ordres = ['Relance Dupont', 'Envoie le devis DEV-2026-0011 à Dupont', 'Oui', 'Oui vas-y', 'Ok vas-y', 'Relance Dupont maintenant', 'Relance Dupont, il ne répond plus', 'Réponds à Dupont que je passe jeudi', 'Relance tous les devis en attente']
  for (const m of ordres) {
    const c2 = cadrage.cadrerDemande(m, m.startsWith('O') ? PROPOSE : null)
    log(`  ${cadrage.faitToutSeul(c2, { contenuTiersLu: false }) ? 'ouvre ' : '✗ carte'} « ${m} »`, { ordre: c2.ordre })
  }
  log('  ce que blocCadrage dit au modèle sur « Ok noté » après la proposition', cadrage.blocCadrage(cadrage.cadrerDemande('Ok noté', PROPOSE), { actions: true }).split('\n').filter((x) => /FAIS|EXÉCUT|tout de suite/i.test(x)).join(' | ').slice(0, 400))

  // ═══ D. D5 — lexique d'escalade : tournures neuves
  console.log('\n── D5. Sujets d’escalade (null = la ligne part seule ; mots par défaut de l’artisan inclus)')
  const motsDefaut = PC.CONFIG_DEFAUT.escalade_mots
  const sujets = [
    'Mon robinet fuit', 'Le ballon fuit depuis ce matin', 'Ça fuit sous l’évier', 'Le toit fuit quand il pleut', 'Les canalisations fuient',
    'C’est urgent', 'Très urgent svp', 'Urgent : plus d’eau chaude', 'Venez en urgence',
    'L’eau coule du plafond', 'Ça goutte du plafond de la cuisine', 'Mon disjoncteur saute sans arrêt',
    'Vous m’avez escroqué', 'Je vais me plaindre', 'Je veux des dommages et intérêts', 'Je vais contacter une association de consommateurs',
    'Travail bâclé', 'C’est mal fait, je ne suis pas content', 'Je vais vous signaler à la répression des fraudes', 'J’ai pris un avocat',
  ]
  let manques = 0
  for (const p of sujets) {
    const s = R.sujetEscalade([p], motsDefaut)
    if (s === null) manques++
    log(`  « ${p} »`, s)
  }
  log('  manqués', `${manques} / ${sujets.length}`)
  console.log('\n── D5. Ce qui part, par la réponse seule (Signature, mode « auto ») et par le pilote')
  const cfgAuto = { ...PC.CONFIG_DEFAUT, mode_reponse: 'auto', auto_24_7: true }
  const art = { plan: 'signature', leads_pause: false }
  for (const p of ['Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ?', 'Fuite sous l’évier', 'C’est urgent, plus de chauffage', 'Urgence : plus de chauffage']) {
    log(`  decisionReponse « ${p} »`, PC.decisionReponse(art, { prise_en_main: false }, cfgAuto, { nbReponsesIA: 0, message: p, messagesClient: [p] }))
  }
  log('  pilote : sujetEscalade(10 derniers messages, mots par défaut) sur « mon ballon fuit »', R.sujetEscalade(['Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ?'], motsDefaut))
  console.log('\n── D5. Faux positifs (non null = à la main ; côté sûr)')
  for (const p of ['Ma fille fuit les devis trop chers', 'Le vol de nuit', 'Je suis pompier volontaire', 'Je ne suis pas pressé', 'Pas urgent du tout']) log(`  « ${p} »`, R.sujetEscalade([p], motsDefaut))

  // ═══ E. I3 — la réponse seule relit le fil
  console.log('\n── I3. decisionReponse avec le fil (messagesClient = les 10 derniers entrants, comme les trois routes)')
  const fil = (n) => ['Litige : mon avocat vous écrira', ...Array.from({ length: n }, (_, i) => `Message neutre ${i + 1}`)]
  const dix = (msgs) => msgs.slice(-R.MESSAGES_ESCALADE_RELUS)
  log('  rejeu 032-005 : « Alors, vous me répondez ? » après « mon avocat »', PC.decisionReponse(art, { prise_en_main: false }, cfgAuto, { nbReponsesIA: 1, message: 'Alors, vous me répondez ?', messagesClient: dix(fil(0)) }))
  log('  9 messages neutres après « mon avocat » (le litige reste dans les 10)', PC.decisionReponse(art, { prise_en_main: false }, cfgAuto, { nbReponsesIA: 1, message: 'Message neutre 9', messagesClient: dix(fil(9)) }))
  log('  10 messages neutres après « mon avocat » (le litige sort des 10)', PC.decisionReponse(art, { prise_en_main: false }, cfgAuto, { nbReponsesIA: 1, message: 'Message neutre 10', messagesClient: dix(fil(10)) }))
  log('  mot propre à l’artisan (« carrelage fissuré ») dans un message d’avant', PC.decisionReponse(art, { prise_en_main: false }, { ...cfgAuto, escalade_mots: ['carrelage fissuré'] }, { nbReponsesIA: 1, message: 'Alors ?', messagesClient: ['Le carrelage fissuré après votre passage', 'Alors ?'] }))

  // ═══ F. Le cron des relances de CONVERSATION, sur un fil en escalade
  console.log('\n── F. Cron des relances de conversation (app/api/cron/relances/route.ts), Signature : fil en escalade, l’artisan a répondu à la main')
  globalThis.__ENVOIS = []
  const D = {
    'next/server': "export const NextResponse = { json: (b, i) => new Response(JSON.stringify(b), { status: i?.status ?? 200, headers: { 'content-type': 'application/json' } }) }",
    '@/lib/alerteService': 'export async function signalerPanneIA() {}',
    '@/lib/alertes': 'export async function enregistrerPassage() {}\nexport async function ronde() { return { envoyees: [], ignorees: [] } }',
    '@/lib/suspension': 'export async function suspensionEnCours() { return false }',
    '@/lib/purgeComptes': 'export async function purgerComptes() { return { purges: 0, en_attente: 0 } }',
    '@/lib/purgesRgpd': 'export async function purgerRgpd() { return { erreurs: [] } }',
    '@/lib/packPubPurge': 'export async function purgerPacksExpires() { return { erreurs: [] } }',
    '@/lib/devisExpiration': 'export async function expirerDevisDepasses() { return { erreurs: [] } }',
    '@/lib/ai': 'export async function generateRelanceReply(_a, l, rang) { return `Bonjour ${l.nom_prospect}, je reviens vers vous au sujet de votre demande : ${l.message}. Avez-vous pu y réfléchir ? (relance ${rang})` }\nexport function relanceTemplate() { return "modèle" }',
    '@/lib/email': 'export async function sendEmail(m) { globalThis.__ENVOIS.push(m); return { ok: true } }',
    '@/lib/agents/sortie': 'export async function sortiePermise() { return { permise: true } }',
    '@/lib/direction/courriers': 'export async function relever() { return { ok: true, nouveaux: 0, lus: 0 } }',
    '@/lib/flags': 'export function actif() { return false }',
    '@/lib/siteLivraison': 'export async function tourLivraison() {}',
    '@/lib/comptaAutomatisationsTour': 'export async function tourCompta() { return { erreurs: [] } }',
    '@/lib/relancesImpayesTour': 'export async function tourRelancesImpayes() { return { erreurs: [] } }',
    '@/lib/relancesImpayesMagasin': 'export const magasinSupabase = {}',
    '@/lib/crm/rappelsTour': 'export async function tourRappels() { return { installe: false } }',
    '@/lib/apresChantierTour': 'export async function tourApresChantier() { return { installe: false } }',
    '@/lib/push': 'export async function envoyerPushArtisan() {}',
    '@/lib/notifications': 'export async function notifierArtisan() {}',
  }
  const cron = await copie('app/api/cron/relances/route.ts', D)
  async function passage(nom, { plan = 'signature', prise_en_main = false, fil: messages }) {
    vider(); globalThis.__ENVOIS = []
    T.artisans = [{ ...ARTISAN, plan }]
    T.leads = [{ id: L, artisan_id: A, nom_prospect: 'M. Essai', contact: 'client@essai.test', message: 'Devis pour refaire la salle de bain', statut: 'repondu', prise_en_main, urgence: prise_en_main ? 'urgent' : null, canal: 'web' }]
    T.messages = messages.map(([sens, type, contenu], i) => ({ id: id(500 + i), lead_id: L, sens, type, contenu, etat: null, sent_at: `2026-10-2${i}T10:00:00Z` }))
    T.relances = [{ id: id(600), lead_id: L, rang: 1, planifiee_le: '2026-11-01T07:00:00Z', envoyee: false }]
    const rep = await cron.GET(new Request('http://localhost/api/cron/relances', { headers: { authorization: 'Bearer secret-essai' } }))
    const corps = await rep.json()
    log(`  ${nom}`, { statut: rep.status, sent: corps.sent, prepared: corps.prepared, skipped: corps.skipped, emails_partis: globalThis.__ENVOIS.map((m) => ({ a: m.to, sujet: m.subject, debut: String(m.text).slice(0, 90) })) })
  }
  const FIL_LITIGE = [['in', 'manuel', 'Devis pour refaire la salle de bain'], ['out', 'reponse_auto', 'Bonjour, merci pour votre demande…'], ['in', 'manuel', 'Litige : vous avez inondé ma cuisine, mon avocat vous écrira'], ['out', 'manuel', 'Bonjour, je suis désolé, je vous rappelle demain.']]
  await passage('Signature, « Litige … mon avocat » puis réponse de l’artisan à la main, sans prise en main', { fil: FIL_LITIGE })
  await passage('Signature, même fil, et l’artisan a cliqué « Escalader » (prise_en_main = true, urgence)', { fil: FIL_LITIGE, prise_en_main: true })
  await passage('témoin Studio, même fil : la relance est proposée, pas envoyée', { fil: FIL_LITIGE, plan: 'studio' })
  log('  le cron lit-il prise_en_main ou sujetEscalade ? (grep dans le source)', /prise_en_main|sujetEscalade|motEscalade|escalade/.test(fs.readFileSync(path.join(RACINE, 'app/api/cron/relances/route.ts'), 'utf8')))
  log('  repondreServeur (réponse à la main) réarme-t-il les relances ? (source)', /planifierRelances\(lead\.id\)/.test(fs.readFileSync(path.join(RACINE, 'lib/envoisServeur.ts'), 'utf8').split('export async function repondreServeur')[1] ?? ''))
} catch (e) {
  console.error('ERREUR DU SCRIPT :', e)
  process.exitCode = 1
} finally {
  fs.rmSync(TMP, { recursive: true, force: true })
}
```

### Annexe B — `rejeu-032-005.mjs` : le seul écart avec l’annexe A de 032-005

```diff
68c68
< const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-attaque-032-005-'))
---
> const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-rejeu-032-005-'))
162c162
<     log('  450 figure-t-il dans ce que l’artisan a écrit ? (nombresEcrits)', cartes.nombresEcrits([msgTarif]).has(45000))
---
>     log('  450 figure-t-il dans ce que l’artisan a écrit ? (nombresEcrits)', cartes.prixEcrits([msgTarif]).has(45000))
194c194
<     const rl = cartes.resoudreLignes([{ tarif_id: null, designation: 'Ligne recopiée', quantite: 1, unite: 'u', prix_unitaire_ht: prix }], new Map(), cartes.nombresEcrits([m]))
---
>     const rl = cartes.resoudreLignes([{ tarif_id: null, designation: 'Ligne recopiée', quantite: 1, unite: 'u', prix_unitaire_ht: prix }], new Map(), cartes.prixEcrits([m]))
```

### Annexe C — sortie de `rejeu-032-005.mjs` (code 0)

```

── A1. D1 bis rejoué par le chemin réel (creer_devis → envoyer_devis, même tour)
  verifierSources (garde de la boucle), sources = message + lecture du tour => null
  provenance posée sur la ligne envoyée à /api/devis => ["prix repris d’une donnée, à vérifier"]
  lignes_prix_a_verifier rendu au modèle => undefined
  envoyer_devis du devis créé, même tour => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}

── A2. Blanchiment par la bibliothèque de tarifs : ajouter_tarif (direct) d’un prix lu, devis au tarif, envoi
  catégorie de ajouter_tarif / modifier_tarif => ["direct","direct"]
  ajouter_tarif / modifier_tarif dans OUTILS_JAMAIS_AUTO ? => [false,false]
  message de l’artisan (aucun prix écrit) => Mets le remplacement de ballon du devis de Martin dans mes tarifs, fais le devis de M. Essai avec et envoie-le
  ordre net / faitToutSeul => [true,true]
  validerAction(ajouter_tarif, 450 €) ok => true
  verifierSources(ajouter_tarif, 450, [message, lecture du devis de Martin]) — null = accepté => null
  450 figure-t-il dans ce que l’artisan a écrit ? (nombresEcrits) => false
  ajouter_tarif exécuté (direct, sans carte) => {"resume":"Le prix 450,00 € HT ne vient pas de ce que l'artisan t'a écrit (une donnée lue, un autre devis ou ta propre réponse n'en sont pas la source) : rien n'a été enregistré. Demande-lui son prix, en chiffres avec « € » ou « HT ».","tarif_id":null,"carte":null}
  verifierSources(creer_devis au tarif) — rien à sourcer => null
  ligne envoyée à /api/devis => []
  prixSources (garde D1, pilote, « Tout auto ») => false
  envoyer_devis du devis, même tour => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  decisionPilote du même envoi (Signature, pilote actif) => {"auto":false,"motif":"prix_non_source"}
  modifier_tarif : verifierSources(520, [message, réponse de l’assistant du tour d’avant]) — null = accepté => null
  « Ok, mets mon tarif ballon à jour » : ordre net / faitToutSeul => [true,true]

── A3. D1 bis : un nombre écrit par l’artisan pour autre chose (quantité, numéro, date) rend un prix recopié « donné par l’artisan »
  « Refais le devis de Martin pour M. Essai, 45 m² cette fois, et envoie-le » (45 €/m² estimé dans le devis de Martin) => {"source_prix":"prix repris d’une donnée, à vérifier","prixSources":false,"faitToutSeul":true}
  « Reprends les lignes du devis DEV-2026-0120 pour M. Essai et envoie-le » (numéro de devis 0120, ligne estimée à 120 €) => {"source_prix":"prix repris d’une donnée, à vérifier","prixSources":false,"faitToutSeul":false}
  « Refais pour M. Essai le devis de Martin, chantier le 15/11, et envoie-le » (date 15/11, ligne estimée à 15 €) => {"source_prix":"prix repris d’une donnée, à vérifier","prixSources":false,"faitToutSeul":true}
  « Duplique le devis de Martin pour M. Essai au 12 rue des Lilas et envoie-le » (adresse, ligne estimée à 12 €) => {"source_prix":"prix repris d’une donnée, à vérifier","prixSources":false,"faitToutSeul":true}

── B1. D2 — messages qui ne sont PAS des ordres (attendu : carte ; ⚠ OUVRE = le mode « fait tout seul » s’ouvre)
  ferme  « C’est bon, je m’en occupe » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Ok, je vais réfléchir » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Ok merci, je gère » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Parfait, je l’appelle moi-même » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « D’accord, mais je préfère l’appeler » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Oui, enfin non » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Ok, on en reparle » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Oui mais attends que je vérifie » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont ? Je préfère attendre. » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont… ah non, il a payé » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont, enfin non, laisse » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont — en fait non. » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont, il a payé hier en fait » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Envoie le devis à Dupont. Attends, je dois encore vérifier les prix. » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont lundi » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont après les vacances » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont à la fin du mois » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Envoie le devis à Dupont après mon rendez-vous » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Envoie le devis à Dupont la semaine d’après » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont, à moins qu’il ait payé » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont en cas de silence » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont au besoin » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont, je te laisse juger » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont envoyée ce matin » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont faite hier » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Facture Dupont réglée hier par chèque » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Note : Dupont a déjà été relancé » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Envoie le devis à Dupont, à valider par Paul d’abord » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont, mais attends mon feu vert » => {"ordre":false,"question":false,"interdit":false,"dejaFait":false}
  total qui ouvrent => 0 / 29

── B2. D2 — vrais ordres (✗ carte = un clic de plus, gravité faible)
  ouvre  « Relance Dupont » => {"ordre":true,"question":false}
  ✗ carte « Relance Dupont, il ne répond plus » => {"ordre":false,"question":false}
  ouvre  « Envoie le devis DEV-2026-0011 à Dupont » => {"ordre":true,"question":false}
  ✗ carte « Réponds à Dupont que je ne peux pas venir jeudi » => {"ordre":false,"question":false}
  ✗ carte « Relance Dupont, ça ne peut plus attendre » => {"ordre":false,"question":false}
  ✗ carte « Envoie le devis à Dupont, il ne l’a pas reçu » => {"ordre":false,"question":false}
  ouvre  « Relance tous ceux qui n’ont pas répondu » => {"ordre":true,"question":false}
  ouvre  « Oui » => {"ordre":true,"question":false}
  ouvre  « Oui vas-y » => {"ordre":true,"question":false}
  ouvre  « Relance Dupont aujourd’hui » => {"ordre":true,"question":false}
  ouvre  « Bonjour, relance Dupont s’il te plaît » => {"ordre":true,"question":false}
  ✗ carte « Je veux que tu relances Dupont » => {"ordre":false,"question":false}
  ✗ carte « Peux-tu relancer Dupont » => {"ordre":false,"question":true}
  ✗ carte « Relance Dupont si possible » => {"ordre":false,"question":false}
  vrais ordres devenus cartes => 7 / 14

── C1. D5 — sujets encore manqués (null = la ligne part seule)
  « Je contacte mon assureur » => assureur
  « Mon assureur va vous écrire » => assureur
  « C’est du vol » => vol
  « Vous êtes des voleurs » => voleur
  « Je vais vous poursuivre » => poursuiv
  « Je vais vous attaquer » => vous attaquer
  « Votre ton est menaçant » => menaç
  « Je ne paierai rien » => paierai rien
  « Vous n’aurez pas un centime » => pas un centime
  « Je bloque le paiement » => bloque le paiement
  « Je retiens le solde » => retiens le solde
  « Je vous mets une étoile sur Google » => une étoile
  « Le chauffe-eau a explosé » => explos
  « Ça fait des étincelles dans le tableau » => étincel
  « Ça fume derrière la prise » => ça fume
  « J’ai pris une décharge en touchant le robinet » => pris une décharge
  « Mon fils s’est coupé sur un clou » => s’est coupé
  « On a appelé le SAMU » => samu
  « Je vais faire un signalement » => signalement
  « Je réclame la remise en état » => réclame
  « Il y a un conflit avec votre équipe » => conflit
  « Je vous dénonce à l’Urssaf » => dénonce
  manqués => 0 / 22

── C2. D5 — faux positifs (non null = à la main ; côté sûr)
  « Avez-vous une assurance décennale ? » => assurance
  « Mon expert-comptable veut la facture » => expert
  « Remboursement de la TVA : quel taux ? » => rembours
  « Sans dégât sur le parquet, merci » => null
  « Attention à la chute de neige sur le toit » => null
  « Je ne veux pas payer trop cher » => null
  « Pas d’urgence, quand vous pouvez » => null
  « Rien d’urgent » => null
  « Je travaille dans la police municipale » => police
  « Le danger, c’est de trop attendre pour le devis » => danger

── D. I3 — réponse automatique (Signature, mode « auto ») : seul le DERNIER message est lu
  message 1 « Litige : mon avocat vous écrira » => {"ok":false,"raison":"escalade","mot":"litige","comportement":"silence"}
  message 2 du même fil « Alors, vous me répondez ? » => {"ok":true}
  témoin pilote : sujetEscalade sur les 2 messages (ce que relit la file) => litige
  mode « assistée », message « mon avocat » (brouillon gardé) => {"ok":false,"raison":"assistee","comportement":"preparer"}
  mode auto, « Je contacte mon assureur » => {"ok":false,"raison":"escalade","mot":"assureur","comportement":"silence"}

── E. D4 — l’Entreprise reconnue par son prix
  prix dédié entreprise à 300 € (metadata.plan de l’abonnement : entreprise) => entreprise
  prix dédié entreprise à 99 € (montant de Signature) (metadata.plan de l’abonnement : entreprise) => entreprise
  passé au portail sur le prix public de Signature (metadata.plan signature) (metadata.plan de l’abonnement : entreprise) => signature
  même descente, prix sans mention, métadonnée de l’abonnement intacte (metadata.plan de l’abonnement : entreprise) => signature
  métadonnée « entreprise » + Studio 59 € (metadata.plan de l’abonnement : entreprise) => studio
  métadonnée « entreprise » + sur devis 300 € sans prix dédié (metadata.plan de l’abonnement : entreprise) => entreprise
  deux lignes : membres 59 € en premier, prix dédié en second (metadata.plan de l’abonnement : entreprise) => studio
  un client Signature sur un prix marqué entreprise (metadata.plan de l’abonnement : signature) => entreprise
```

### Annexe D — sortie de `attaque-032-006.mjs` (code 0)

```

── A2. ajouter_tarif / modifier_tarif : seul un prix ÉCRIT par l’artisan entre
  ajouter_tarif — prix lu dans un autre devis, artisan sans prix => {"resume":"Le prix 450,00 € HT ne vient pas de ce que l'artisan t'a écr","ecrit_dans_prix_artisan":[]}
  ajouter_tarif — « ordre de grandeur » de l’assistant, artisan « ok » => {"resume":"Le prix 520,00 € HT ne vient pas de ce que l'artisan t'a écr","ecrit_dans_prix_artisan":[]}
  ajouter_tarif — artisan « 450 € HT » => {"resume":"tarif ajouté : 450,00 € HT","ecrit_dans_prix_artisan":[450]}
  ajouter_tarif — artisan « 450 € TTC », prix_ht converti (TVA 10 %) = 409,09 => {"resume":"Le prix 409,09 € HT ne vient pas de ce que l'artisan t'a écr","ecrit_dans_prix_artisan":[]}
  ajouter_tarif — artisan « 450 € TTC », prix_ht = 450 (TTC pris pour HT) => {"resume":"tarif ajouté : 450,00 € HT","ecrit_dans_prix_artisan":[450]}
  ajouter_tarif — artisan « 1 200 € » (milliers), prix 1200 => {"resume":"tarif ajouté : 1 200,00 € HT","ecrit_dans_prix_artisan":[1200]}
  ajouter_tarif — artisan « 1 200 € », prix 200 (morceau du nombre) => {"resume":"Le prix 200,00 € HT ne vient pas de ce que l'artisan t'a écr","ecrit_dans_prix_artisan":[]}
  modifier_tarif 520 (dit par l’assistant, pas par l’artisan) => {"resume":"Le prix 520,00 € HT ne vient pas de ce que l'artisan t'a écr","prix_en_base":400}
  témoin : modifier_tarif 520 écrit par l’artisan (« 520 € ») => {"resume":"tarif modifié : 400,00 € → 520,00 € HT"}
  catégories des outils qui écrivent un prix ailleurs (augmenter_tarifs, creer_facture_libre) => ["confirmation",true,"confirmation",true]

── A3. prixEcrits : un prix porte une marque ; une quantité, une date, un numéro n’en sont pas (valeurs en euros)
  conforme « 45 m² cette fois » => []
  conforme « chantier le 15/11 » => []
  conforme « au 12 rue des Lilas » => []
  conforme « devis DEV-2026-0120 » => []
  conforme « 3 ballons » => []
  conforme « à 14 h » => []
  conforme « 2 heures » => []
  conforme « 50 km/h » => []
  conforme « remise de 10 % » => []
  conforme « 06 12 34 56 78 » => []
  conforme « le 12 juin » => []
  conforme « vers 8h30 » => []
  conforme « 450 € » => [450]
  conforme « 450 euros » => [450]
  conforme « 450 HT » => [450]
  conforme « 450 € TTC » => [450]
  conforme « € 450 » => [450]
  conforme « 45 € le m² » => [45]
  conforme « 45/m² » => [45]
  conforme « 45 le m² » => [45]
  conforme « 12,50 € » => [12.5]
  conforme « 1 200 € » => [1200]
  conforme « 1.200 € » => [1.2,1200]
  conforme « 450e HT » => [450]
  conforme « 35 de l’heure » => []
  conforme « 35 € de l’heure » => [35]
  conforme « 3 ballons à 450 € pièce » => [450]
  conforme « 2x450 € » => [450]
  conforme « 3 450 € » => [3450]

── D2. Tournures neuves qui ne sont PAS des ordres (⚠ OUVRE = le mode « fait tout seul » s’ouvre)
  ⚠ OUVRE « Relance Dupont le 15 » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont le 15 novembre » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont en décembre » => {"ordre":true,"question":false}
  ⚠ OUVRE « Envoie le devis à Dupont début janvier » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont mi-novembre » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont ce week-end » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont à la fin des travaux » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont à 18 h » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont dans la soirée » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont sous huitaine » => {"ordre":true,"question":false}
  ⚠ OUVRE « Envoie le devis à Dupont une fois signé » => {"ordre":true,"question":false}
  ⚠ OUVRE « Envoie le devis à Dupont dès réception des photos » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont à la Toussaint » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont au retour de Paul » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont ? Bof. » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont ? Mouais. » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont, nan » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont ? Euh… » => {"ordre":true,"question":false}
  ⚠ OUVRE « Ok noté » (après « Voulez-vous que je le relance ? ») => {"ordre":true,"question":false}
  ⚠ OUVRE « Bien noté » (après « Voulez-vous que je le relance ? ») => {"ordre":true,"question":false}
  ⚠ OUVRE « Noté, merci » (après « Voulez-vous que je le relance ? ») => {"ordre":true,"question":false}
  ⚠ OUVRE « Ok merci » (après « Voulez-vous que je le relance ? ») => {"ordre":true,"question":false}
  ferme  « Super merci » (après « Voulez-vous que je le relance ? ») => {"ordre":true,"question":false}
  ferme  « Top » (après « Voulez-vous que je le relance ? ») => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont envoyé » => {"ordre":true,"question":false}
  ⚠ OUVRE « Facture Dupont payé » => {"ordre":true,"question":false}
  ⚠ OUVRE « Facture Dupont réglé » => {"ordre":true,"question":false}
  ⚠ OUVRE « Relance Dupont ok c’est parti » => {"ordre":true,"question":false}
  total qui ouvrent => 26 / 28

── D2. Vrais ordres (✗ carte = un clic de plus)
  ouvre  « Relance Dupont » => {"ordre":true}
  ouvre  « Envoie le devis DEV-2026-0011 à Dupont » => {"ordre":true}
  ouvre  « Oui » => {"ordre":true}
  ouvre  « Oui vas-y » => {"ordre":true}
  ouvre  « Ok vas-y » => {"ordre":true}
  ouvre  « Relance Dupont maintenant » => {"ordre":true}
  ✗ carte « Relance Dupont, il ne répond plus » => {"ordre":false}
  ✗ carte « Réponds à Dupont que je passe jeudi » => {"ordre":false}
  ouvre  « Relance tous les devis en attente » => {"ordre":true}
  ce que blocCadrage dit au modèle sur « Ok noté » après la proposition => - L'artisan demande une ACTION : FAIS-LA avec l'outil correspondant, tout de suite, sans te contenter de l'expliquer ni lui renvoyer le travail. Lis d'abord ce qu'il faut (lire_tarifs pour chiffrer, lire_devis / lire_factures pour retrouver un numéro, lire_stock pour un article). Il te manque une information indispensable (le client, une quantité) : pose UNE question courte ; un prix manquant ne b

── D5. Sujets d’escalade (null = la ligne part seule ; mots par défaut de l’artisan inclus)
  « Mon robinet fuit » => null
  « Le ballon fuit depuis ce matin » => null
  « Ça fuit sous l’évier » => null
  « Le toit fuit quand il pleut » => null
  « Les canalisations fuient » => null
  « C’est urgent » => null
  « Très urgent svp » => null
  « Urgent : plus d’eau chaude » => null
  « Venez en urgence » => urgence
  « L’eau coule du plafond » => null
  « Ça goutte du plafond de la cuisine » => null
  « Mon disjoncteur saute sans arrêt » => null
  « Vous m’avez escroqué » => null
  « Je vais me plaindre » => null
  « Je veux des dommages et intérêts » => null
  « Je vais contacter une association de consommateurs » => null
  « Travail bâclé » => null
  « C’est mal fait, je ne suis pas content » => null
  « Je vais vous signaler à la répression des fraudes » => null
  « J’ai pris un avocat » => avocat
  manqués => 18 / 20

── D5. Ce qui part, par la réponse seule (Signature, mode « auto ») et par le pilote
  decisionReponse « Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ? » => {"ok":true}
  decisionReponse « Fuite sous l’évier » => {"ok":false,"raison":"escalade","mot":"fuite","comportement":"silence"}
  decisionReponse « C’est urgent, plus de chauffage » => {"ok":true}
  decisionReponse « Urgence : plus de chauffage » => {"ok":false,"raison":"escalade","mot":"urgence","comportement":"silence"}
  pilote : sujetEscalade(10 derniers messages, mots par défaut) sur « mon ballon fuit » => null

── D5. Faux positifs (non null = à la main ; côté sûr)
  « Ma fille fuit les devis trop chers » => null
  « Le vol de nuit » => vol
  « Je suis pompier volontaire » => null
  « Je ne suis pas pressé » => null
  « Pas urgent du tout » => null

── I3. decisionReponse avec le fil (messagesClient = les 10 derniers entrants, comme les trois routes)
  rejeu 032-005 : « Alors, vous me répondez ? » après « mon avocat » => {"ok":false,"raison":"escalade","mot":"litige","comportement":"silence"}
  9 messages neutres après « mon avocat » (le litige reste dans les 10) => {"ok":false,"raison":"escalade","mot":"litige","comportement":"silence"}
  10 messages neutres après « mon avocat » (le litige sort des 10) => {"ok":true}
  mot propre à l’artisan (« carrelage fissuré ») dans un message d’avant => {"ok":false,"raison":"escalade","mot":"carrelage fissuré","comportement":"silence"}

── F. Cron des relances de conversation (app/api/cron/relances/route.ts), Signature : fil en escalade, l’artisan a répondu à la main
  Signature, « Litige … mon avocat » puis réponse de l’artisan à la main, sans prise en main => {"statut":200,"sent":1,"prepared":0,"skipped":0,"emails_partis":[{"a":"client@essai.test","sujet":"Suite à votre demande — Atelier Essai","debut":"Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Devis pour refaire la s"}]}
  Signature, même fil, et l’artisan a cliqué « Escalader » (prise_en_main = true, urgence) => {"statut":200,"sent":1,"prepared":0,"skipped":0,"emails_partis":[{"a":"client@essai.test","sujet":"Suite à votre demande — Atelier Essai","debut":"Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Devis pour refaire la s"}]}
  témoin Studio, même fil : la relance est proposée, pas envoyée => {"statut":200,"sent":0,"prepared":1,"skipped":0,"emails_partis":[]}
  le cron lit-il prise_en_main ou sujetEscalade ? (grep dans le source) => false
  repondreServeur (réponse à la main) réarme-t-il les relances ? (source) => true
```

### Annexe E — sorties de `rejeu-032-004.mjs` et `rejeu-032-004-b.mjs` (code 0)

```

── D1 — envoyer_devis en « fait tout seul » (message : « Envoie le devis DEV-2026-0011 à M. Essai »)
  rejeu 032-001 : ligne estimée à 100 € + ligne à 0 € sans provenance => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  une seule ligne « à chiffrer » => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  provenance vide, prix 80 € => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  devis sans aucune ligne => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  témoin : toutes les lignes au tarif de l’artisan => {"fait_tout_seul":true,"carte":"executee","pas_d_office":false,"routes":["/api/devis/00000000-0000-4000-8000-000000000011/envoyer"]}
  ligne marquée « prix donné par l’artisan » (voir la chaîne de blanchiment) => {"fait_tout_seul":true,"carte":"executee","pas_d_office":false,"routes":["/api/devis/00000000-0000-4000-8000-000000000011/envoyer"]}
  lignes illisibles (devis_lignes en erreur 500) => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}

── D1 bis — blanchiment : un prix ESTIMÉ, lu dans un devis, recopié par le modèle devient « prix donné par l’artisan »
  message de l’artisan => Refais le devis de Martin pour M. Essai et envoie-le-lui
  lire_devis est-il un contenu de tiers ? => false
  faitToutSeul du message => true
  verifierSources(creer_devis, prix 450, sources = [message, lecture du tour]) — null = accepté => null
  provenance écrite par resoudreLignes => ["prix repris d’une donnée, à vérifier"]
  prixSources(lignes du nouveau devis) — la garde D1 => false
  envoyer_devis du nouveau devis, même tour => {"fait_tout_seul":false,"carte":"en_attente","pas_d_office":true,"routes":[]}
  témoin : la même ligne recopiée avec sa provenance d’origine => false
  autre source admise : un nombre écrit par l’ASSISTANT au tour d’avant (« environ 85 € la prise ») => null

── D2 — formulations qui ne sont PAS des ordres (faitToutSeul attendu : false)
  ferme  « Pas question de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Hors de question de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Laisse tomber la relance de Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « On attend pour relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont plus tard » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Évitons de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Oublie la relance de Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance pas Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Faut pas relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ferme  « Surtout ne relance pas Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ferme  « Attends avant de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont la semaine prochaine » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Ne t’embête pas à relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ferme  « Inutile de relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ferme  « Dupont, on le relance pas » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Je préfère ne pas relancer Dupont » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ferme  « Je ne pense pas qu’il faille relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relancer Dupont ? Non » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Non, pas de relance pour Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Plus de relance pour Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Stop les relances à Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Envoie pas le devis à Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « N’envoie le devis DEV-2026-0011 qu’après mon appel » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Envoie le devis à Dupont seulement s’il rappelle » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Faudrait relancer Dupont un de ces jours » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Il faudrait peut-être relancer Dupont » => {"actionDemandee":true,"question":true,"interdit":false,"dejaFait":false}
  ferme  « Relance Dupont si tu veux » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Tu pourrais relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Pourrais-tu me dire qui relancer » => {"actionDemandee":true,"question":true,"interdit":false,"dejaFait":false}
  ferme  « J’hésite à relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Je relance Dupont moi-même » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Je m’occupe de relancer Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Dupont a été relancé hier » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Le devis de Dupont est déjà parti » => {"actionDemandee":false,"question":false,"interdit":false,"dejaFait":false}
  ferme  « Relance de Dupont faite » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ferme  « C’est bon pour la relance de Dupont, déjà fait » => {"actionDemandee":false,"question":false,"interdit":false,"dejaFait":true}

── D2 — vrais ordres (faitToutSeul attendu : true ; false = devient une carte, gravité faible)
  ouvre  « Relance Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, il ne répond plus » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance les clients qui n’ont pas répondu » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Envoie le devis DEV-2026-0011 à Dupont, il ne l’a pas reçu » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, je n’ai pas de nouvelles » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, il n’a jamais répondu » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont sans attendre » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Envoie le devis à Dupont, n’oublie pas la pièce jointe » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, ne t’inquiète pas pour le ton » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Relance Dupont ou Martin, celui qui doit le plus » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont si ce n’est pas déjà fait » => {"actionDemandee":false,"question":false,"interdit":false,"dejaFait":true}
  ✗ carte « Relance Dupont, ça ne peut plus attendre » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ouvre  « Bonjour, relance Dupont s’il te plaît » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, peut-être en ton ferme » => {"actionDemandee":true,"question":true,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont : rien depuis 10 jours » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Envoie le devis à Dupont, et si possible aujourd’hui » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}
  ✗ carte « Relance Dupont, je ne veux pas perdre ce chantier » => {"actionDemandee":false,"question":false,"interdit":true,"dejaFait":false}
  ✗ carte « Je veux que tu relances Dupont » => {"actionDemandee":true,"question":false,"interdit":false,"dejaFait":false}

── D3 — escalade et autres lectures du pilote en erreur
  rejeu 032-001 : base saine, « mon avocat » → escalade => true
  rejeu 032-001 : « leads » en erreur 500 => lève : conversation illisible : rien ne part
  « messages » en erreur 500 => lève : messages du client illisibles : rien ne part
  mot PROPRE à l’artisan (« carrelage fissuré »), base saine => true
  même message, « plateforme_config » en erreur 500 => lève : réglages de la plateforme illisibles : rien ne part
  etatConversation : 3 réponses de l’IA pour une limite de 2 => limite
  même conversation, compte des messages en erreur 500 => lève : réponses de la conversation illisibles : rien ne part
  contexte : « artisans » en erreur 500 → plan lu => {"plan":null,"suspendu":false}

── D4 — alignerSurAbonnement : montants et métadonnée
  metadata.plan = entreprise · Studio => {"plan":"studio","raison":"offre passée à Studio — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = entreprise · ancienne Essentiel => {"plan":"essentiel","raison":"offre passée à Essentiel — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = entreprise · Signature => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = entreprise · sur devis (300 €) => {"plan":"entreprise","raison":"déjà à jour"}
  metadata.plan = entreprise · absent => {"plan":"entreprise","raison":"déjà à jour"}
  metadata.plan = signature · Studio => {"plan":"studio","raison":"offre passée à Studio — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · ancienne Essentiel => {"plan":"essentiel","raison":"offre passée à Essentiel — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · Signature => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · sur devis (300 €) => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = signature · absent => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · Studio => {"plan":"studio","raison":"offre passée à Studio — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · ancienne Essentiel => {"plan":"essentiel","raison":"offre passée à Essentiel — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · Signature => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}
  metadata.plan = — · sur devis (300 €) => {"plan":null,"raison":"montant 30000 : aucune offre ne correspond"}
  metadata.plan = — · absent => {"plan":null,"raison":"montant — : aucune offre ne correspond"}
  contrat Entreprise à 300 € passé au portail sur le prix de Signature (99 €), métadonnée intacte => {"plan":"signature","raison":"offre passée à Signature — aucun crédit ajouté : le forfait de cette période est déjà servi"}

── D5 — sujets d’escalade encore absents (sujetEscalade, mots de l’artisan vides ; null = la ligne part)
  « Je vais saisir le juge » => juge
  « J’ai subi un préjudice, j’attends une indemnisation » => préjudice
  « Je demande un dédommagement » => dédommag
  « Je vous envoie une lettre recommandée » => lettre recommandée
  « C’est un vice caché » => vice caché
  « J’ai fait opposition sur le paiement » => opposition
  « Je ne vous paie pas tant que ce n’est pas réparé » => paie pas
  « Je ne réglerai pas cette facture » => réglerai pas
  « Je vais laisser un avis négatif partout » => avis négatif
  « Je vais vous faire une mauvaise pub sur Google » => mauvaise pub
  « C’est dangereux, les fils sont à nu » => danger
  « Le plafond s’est écroulé » => écroul
  « Il y a de l’eau partout dans la salle de bain » => eau partout
  « Infiltration au plafond depuis votre passage » => infiltr
  « Ça sent le brûlé dans le tableau » => brûl
  « Je dépose une réclamation » => réclamation
  « J’ai contacté UFC-Que Choisir » => ufc
  « Ma fille est tombée de l’échafaudage » => est tombé
  « Court-circuit depuis votre intervention » => court-circuit
  « Je vous mets en demeure » => en demeure

── D5 — faux positifs sur des messages ordinaires (non null = la ligne passe à la main)
  « Pas d’urgence, quand vous pouvez » => null
  « Pour l’assurance, il me faut la facture » => assurance
  « Je ne veux pas payer trop cher » => null
  « Quel est le processus pour le devis ? » => null
  « Mon voisin, M. Gazzola, m’a donné votre nom » => null
  « Expertise comptable : il me faut un devis détaillé » => expert
  « Je travaille dans la police municipale, je rentre à 18 h » => police
  « Remboursement de la TVA : quel taux ? » => rembours
  « Ma gazinière est à changer aussi » => null
  « Pas de souci pour l’accès, le gardien a les clés » => null
  « Le gazon devant la maison est fragile » => null
  « Accidentellement j’ai cassé la poignée » => null
  « Mon mari est pompier, il sera là le matin » => null

── D6/S4 — historiqueRelances : une erreur de COLONNE est prise pour une table absente (ignorée)
  témoin : relance CRM ce matin → verdict => {"refus":true,"raison":"recente","derniere":{"chemin":"crm","le":"2026-11-02T07:00:00Z"}}
  colonne crm_rappels.envoye_le absente (42703) → historique => {"ok":false,"erreur":"crm_rappels : column crm_rappels.envoye_le does not exist"}
  → verdict => {"refus":true,"raison":"illisible","erreur":"crm_rappels : column crm_rappels.envoye_le does not exist"}
  colonne inconnue du cache de schéma (PGRST204) → verdict => {"refus":true,"raison":"illisible","erreur":"crm_rappels : Could not find the 'envoye_le' column of 'crm_rappels' in the schema cache"}
  témoin : délai dépassé (57014) → verdict => {"refus":true,"raison":"illisible","erreur":"crm_rappels : canceling statement due to statement timeout"}

escalade_mots par défaut => ["urgence","fuite","degat des eaux","inondation","gaz","assurance"]
iaDoitRepondre(mode auto, « Litige en cours : mon avocat vous écrira ») => {"ok":false,"raison":"escalade","mot":"litige"}
iaDoitRepondre(mode auto, « Je vais porter plainte contre vous ») => {"ok":false,"raison":"escalade","mot":"plainte"}
iaDoitRepondre(mode auto, « Sinistre chez moi après vos travaux ») => {"ok":false,"raison":"escalade","mot":"sinistre"}
iaDoitRepondre(mode auto, « Fuite sous l’évier ») => {"ok":false,"raison":"escalade","mot":"fuite"}
```
