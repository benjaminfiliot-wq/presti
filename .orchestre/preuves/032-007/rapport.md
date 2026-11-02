# 032-007 — cinquième audit offensif des lots L1 et L2 du chantier 4 (correctifs d'après 032-006), 02/11/2026

Auditeur : Claude Code (claude-code), en attaquant. Je n'ai écrit ni le lot, ni ses correctifs, ni les quatre audits d'avant.

Je n'ai travaillé qu'en lecture : rien n'a changé hors de `.orchestre/preuves/032-007/`. Je n'ai créé aucun compte de test et joué
aucune suite contre la production. Je n'ai fait ni appel réseau vers Presti en ligne, ni build, ni typecheck, ni commit, ni migration. Je
n'ai lu aucun secret.

Réseau neuronal : `regles_pour` (« audit assistant, pilote, relances, factures, offres ») avant de commencer ; il n'a rendu aucune règle
(`[]`). J'ai lu les audits d'avant (`032-006/rapport.md` en entier, ses annexes et les scripts de `032-004` et `032-005` qu'il rejoue), le
§3.2 du prompt de Benj (`p3-assistant.md:552-553`) et le plan (§0, §3 S3, §12, §13 : `chantier-4-assistant-plan.md:322-332`, `:701`, `:882`).

Les attaques tournent hors ligne, par des scripts placés dans le dossier temporaire de la session, hors du dépôt (code en annexe). Le fetch
est doublé : toute adresse autre que la base factice lève. `sendEmail` est doublé aussi, et toutes les données sont inventées.

J'ai d'abord rejoué, sans aucun changement, les quatre scripts d'attaque d'avant : `rejeu-032-004.mjs`, `rejeu-032-004-b.mjs`,
`rejeu-032-005.mjs` (copiés du dossier de 032-006) et `attaque-032-006.mjs` (extrait de l'annexe A de `032-006/rapport.md`, identique au
fichier de 032-006 : `diff` vide). Puis `attaque-032-007.mjs` et `attaque-032-007-b.mjs` portent les attaques neuves. Toutes les sorties
citées viennent de ces exécutions, toutes en code 0.

VERDICT : NE TIENT PAS

Pourquoi : les cinq correctifs tiennent sur leur cible. E1 ferme sur le vrai `GET` du cron dans les dix scénarios d'escalade joués (le
onzième, la fenêtre de 10 messages, est le faible connu d'I3), et les deux témoins prouvent que le banc sait rougir. E2 repère les 20 tournures de 032-006, TTC refuse 450 dans un champ HT après « 450 € TTC », et D2
ferme les 28 tournures de 032-006. Mais un défaut **élevé** reste, du même genre et de la même gravité que l'E2 de 032-006 qui a fait
« ne tient pas » au quatrième audit :

- **E3 (élevé)** : le correctif E2 ne lit que le présent de « fuir » (`fuit`, `fuient`, `fuyait`, `fuyaient`). Le passé composé (« mon
  chauffe-eau **a fui** cette nuit »), l'infinitif (« le robinet s'est mis à **fuir** ») et le futur (« **fuira** ») passent. Avec eux passe
  la paraphrase standard d'un appareil qui fuit, « mon chauffe-eau **perd de l'eau** ». Les mots par défaut de l'artisan ne les repèrent
  pas non plus. 11 phrases sur 14 passent : la réponse part seule (Signature, mode « auto »), le pilote ne les renvoie pas à la main, et le
  cron des relances ne les annule pas.

Le correctif est court et ne fait que restreindre : les racines `fui` et `fuy` à la place des quatre formes, et `perd de l eau`. C'est le
seul défaut élevé. Le reste se range en moyens et faibles, pour le lot suivant.

## Bilan par correctif

| # | Correctif | Verdict | Défaut restant (gravité) |
|---|---|---|---|
| E1 | cron : `prise_en_main`, `sujetDuFil` (10 derniers entrants et la demande), lecture en erreur = due | **tient** (10 scénarios d'escalade sur le vrai `GET`, 2 témoins) | les mots que le lexique manque passent aussi ici (E3, élevé ; D5, moyen) ; fenêtre de 10 messages (faible) |
| E2 | `fuit`, `fuient`, `fuyait`, `fuyaient`, `urgen`, `urgemment` et 15 synonymes de 032-006 | **tient** sur sa cible (20 sur 20) | **E3 : « a fui », « fuir », « perd de l'eau » (élevé)** ; 22 synonymes manqués (moyen) |
| TTC | `prixEcrits` : un nombre marqué TTC ne vaut que par ses formes HT | **tient** sur sa cible (7 graphies) | « TVA comprise », « taxes comprises », « (TTC) », « TVAC », TTC avant le nombre ; taux incohérent admis (moyen) |
| D2 | dates, mois, moments, « bof », « nan », « ok noté », « ok merci », participes | **tient** sur sa cible (28 sur 28 ferment) | 11 tournures neuves sur 31 ouvrent encore le mode (moyen) ; 3 vrais ordres deviennent des cartes (faible) |
| D5 | rejeu | voir E2 | — |
| D1, D1 bis, A2, A3, D3, D4, D6, D7, I3 | rejeux de 032-004, 032-005 et 032-006 | **tiennent** | sorties identiques à 032-006, sauf une ligne (faible, plus bas) |
| — | voisin : mode « fait tout seul » de l'assistant | — | relance un devis dont la conversation est en litige, sans relire l'escalade (moyen) |
| — | voisin : relances d'impayés | — | contestation écrite avant l'échéance non lue (moyen, inchangé depuis 032-006) |
| — | suites | 10 sur 10 vertes | aucune ne joue « a fui », « fuir », « perd de l'eau » ; le cron n'est vérifié que par lecture du source |

## E3 (élevé) — « a fui », « fuir », « perd de l'eau » : la fuite passe encore

La racine du lexique est lue au **début** d'un mot (`lib/pilote/regles.ts`, `sujetEscalade` : ``mots.includes(` ${k}`)``). Le correctif E2
y a ajouté `fuit`, `fuient`, `fuyait` et `fuyaient`. Or « fui » (participe passé), « fuir » (infinitif) et « fuira » (futur) ne commencent
par aucune de ces formes. Les mots par défaut de l'artisan, lus n'importe où dans le texte, sont
`["urgence","fuite","degat des eaux","inondation","gaz","assurance"]`, et « fuite » ne se trouve ni dans « fui » ni dans « fuir ».

Sortie de `attaque-032-007-b.mjs` (code 0) :

```
« Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ? » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le robinet a fui toute la nuit » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Ça a fui sous l’évier » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le ballon commence à fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le robinet s’est mis à fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le toit continue de fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le joint va fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le ballon fuira bientôt » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ? » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le ballon perd de l’eau par le bas » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Ma chaudière perd de l’eau » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Mon ballon fuit » => {"pilote_sujetEscalade":"fuit","reponse_seule_Signature_auto":"escalade (fuit)"}
« J’ai une fuite » => {"pilote_sujetEscalade":"fuite","reponse_seule_Signature_auto":"escalade (fuite)"}
« Les tuyaux fuyaient » => {"pilote_sujetEscalade":"fuyaient","reponse_seule_Signature_auto":"escalade (fuyaient)"}
manqués => "11 / 14"
```

Sur le vrai `GET` du cron (`attaque-032-007.mjs`, section A), un fil où le client écrit « Mon ballon perd de l’eau depuis hier » ou
« Ça fui sous l’évier » reçoit sa relance seule en Signature (`"sent":1`). « Mon robinet fuie », « Ça fui » et « fuyant » passent aussi
(section D).

- **Pourquoi c'est élevé** : c'est le raisonnement même qui a classé E2 en élevé au quatrième audit, et que la session principale a suivi.
  Le §3.2 nomme « fuite » entre guillemets, et le plan l'assume (§3 S3 : un plombier en Signature verra ses réponses « fuite » revenir à la
  main). « Le chauffe-eau a fui cette nuit » ou « le robinet s'est mis à fuir » sont des formes ordinaires du verbe nommé : passé composé
  et infinitif, sans tournure rare ni coïncidence. En Signature, en mode « auto », la réponse rédigée par le modèle part seule au nom de
  l'artisan. En mode « assistée », le pilote laisse partir la réponse préparée au bout de 10 minutes. Le cron, lui, envoie seul sa
  relance.
- **Sur « perd de l'eau »** : c'est une paraphrase, et 032-006 rangeait les paraphrases en moyen. Je la range ici parce que c'est la façon
  standard de dire qu'un appareil fuit (« le chauffe-eau perd de l'eau »), aussi banale que « fuit ». La session principale peut la
  redescendre en moyen : le verdict ne change pas, « a fui » et « fuir » y suffisent.
- **Antériorité** : le défaut est déjà en production (avant le lot, « fuite » seul était lu), et le lot ne l'aggrave pas. Mais il tombe
  pile dans le §3.2, comme E2.
- **Correctif** : remplacer `'fuit', 'fuient', 'fuyait', 'fuyaient'` par les racines `'fui'` et `'fuy'` dans `MOTS_ESCALADE_TOUJOURS`, lues
  au début d'un mot. Elles couvrent fuit, fuite, fuites, fuient, fui, fuie, fuir, fuira, fuyait, fuyant et les fautes « ça fui » et
  « fuitte ». Ajouter aussi `'perd de l eau'`, `'perdent de l eau'` et `'perte d eau'`. Les faux positifs restent du côté sûr : « fuir les
  ennuis », « il a fui ses responsabilités », « le fuyard ». « Un fusible » n'est pas pris (sortie en annexe). Il faut un essai et son
  mutant dans `securite-assistant-0211-qa` : « Le chauffe-eau a fui cette nuit » et « Le robinet s'est mis à fuir » doivent rendre
  `escalade`.

## E1 — tient (rejoué de bout en bout sur le vrai `GET` du cron)

La route est copiée avec ses dépendances lourdes doublées (modèle, e-mail, purges, alertes). La base, le registre S4, les offres, la
plateforme et `lib/relances.ts` (`sujetDuFil`) sont les vrais modules, sur une base factice qui trie (`order`) et sait tomber en panne
table par table.

```
témoin Signature, fil neutre (le banc sait rougir : une relance part) => {"statut":200,"sent":1,…,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous…"]}
témoin Studio, fil neutre (une relance est proposée) => {"statut":200,"sent":0,"prepared":1,…,"relances_dans_le_fil":[{"etat":"proposition",…}]}
rejeu 032-006 : Signature, « Litige … mon avocat », réponse de l’artisan à la main => {"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
rejeu 032-006 : Signature, fil neutre, l’artisan a cliqué « Escalader » (prise_en_main) => {"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[]}
rejeu 032-006 : Studio, fil en litige (ni envoi ni proposition) => {"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
litige dans la DEMANDE d’origine seulement (leads.message), aucun message => {"sent":0,"skipped":1,"relance_envoyee":true,"emails":[]}
« mon ballon fuit » dans la demande (E1 + E2) => {"sent":0,"skipped":1,"relance_envoyee":true,"emails":[]}
mot propre à l’artisan (« carrelage fissuré ») dans le fil => {"sent":0,"skipped":1,"relance_envoyee":true,"emails":[]}
messages du client ILLISIBLES (500) sur un fil en litige => {"sent":0,"skipped":1,"relance_envoyee":false,"emails":[]}
réglages de la plateforme ILLISIBLES (500) sur un fil en litige => {"sent":0,"skipped":1,"relance_envoyee":false,"emails":[]}
réglages de la plateforme ILLISIBLES (500) sur un fil NEUTRE (coût : la relance attend) => {"sent":0,"skipped":1,"relance_envoyee":false,"emails":[]}
fenêtre : « mon avocat » puis 9 messages neutres du client => {"sent":0,"skipped":1,"relance_envoyee":true,"emails":[]}
fenêtre : « mon avocat » puis 10 messages neutres du client (faible, connu d’I3) => {"sent":1,…,"emails":["Bonjour M. Essai, je reviens vers vous…"]}
```

- La prise en main annule la relance avant même la lecture de l'artisan (`app/api/cron/relances/route.ts:99-103`). Le sujet du fil est
  relu avant la prise atomique, donc avant toute dépense : modèle ou e-mail (`:138-144`, puis `:147`). Une lecture en erreur laisse la
  relance due (`envoyee: false`) et n'envoie rien.
- Ni envoi ni proposition en Studio : la relance annulée ne laisse pas non plus de brouillon au nom de l'artisan.
- `sujetDuFil` lit les 10 derniers **entrants** par ordre décroissant de `sent_at`, plus `leads.message` (`lib/relances.ts:11-16`). Il passe
  les mots de l'artisan par `getPlateformeConfigStrict` (une erreur lève, sauf la table absente, `lib/plateformeConfig.ts:123-127`).
- Autres envois seuls cherchés sur un fil en escalade :
  - **après-chantier** : il ne pose que des rappels pour l'artisan (`route.ts`, commentaire du passage : « AUCUN message au client ») ;
  - **rappels du CRM** : ils ne partent que vers l'artisan (`lib/crm/rappelsTour.ts:53`, `dep.envoyer(r.artisanId, …)`) ;
  - **canaux** : ils ne font que préparer, puis passent par le pilote, qui relit l'escalade (`lib/canaux/serveur.ts:157-190`) ;
  - **pilote** : il relit le fil de la carte, du devis ou du devis de la facture (`lib/pilote/file.ts:114-115`, `executeur.ts:52-62`) ;
  - restent deux voisins **moyens**, l'assistant en « fait tout seul » et les impayés (plus bas).

## E2 — tient sur sa cible

Rejeu de `attaque-032-006.mjs` : les 20 tournures de 032-006 sont repérées (`manqués => 0 / 20`). « Mon ballon d’eau chaude fuit » et
« C’est urgent » rendent `escalade` en Signature « auto », et le pilote rend `fuit`. `FAUSSE_URGENCE` ne masque aucun vrai sujet :

```
« Pas urgent mais ça fuit » => fuit            « Pas d’urgence, mais une fuite » => fuite      « Sans dégât mais il y a eu un dégât des eaux » => dégât des eaux
« Sans urgence : litige avec le voisin » => litige    « pas urgent, avocat » => avocat    « C’est pas urgent, l’assurance passera » => assurance
« Pas urgent du tout » => null                 « Pas trop urgent » => urgen (faux positif, côté sûr)    « Non urgent » => urgen (idem)
```

**Moyen — 22 synonymes encore manqués** (section D, hors E3) : « le robinet goutte », « ça goutte sous l’évier », « ça suinte au
plafond », « une tache d’humidité », « l’eau coule le long du mur », « le wc déborde », « la cuisine est sous l’eau », « de l’eau par
terre », « c’est pressé », « au plus vite », « très pressant », « plus de chauffage avec un bébé », « plus d’eau chaude depuis 3 jours »,
« vous allez entendre parler de moi », « je retiens le paiement », « rendez-moi mon argent », « c’est une honte », « je mets un avis sur
Google », « les plombs ont sauté », « ça a pris feu », « court-jus ». Je les range en moyen, comme 032-006 l'a fait pour les synonymes : ce
ne sont pas les mots du §3.2, et le client qui se plaint ou menace emploie souvent aussi un mot repéré. Ajouts suggérés : `goutte`,
`suinte`, `humidit`, `deborde`, `sous l eau`, `eau par terre`, `presse`, `au plus vite`, `plus de chauffage`, `plus d eau chaude`,
`entendre parler`, `retiens le`, `mon argent`, `honte`, `avis sur`, `plombs`, `pris feu`, `court jus`. Le lexique par métier reste en vague 2
(plan §3 S3).

## TTC — tient sur sa cible ; moyen sur les autres graphies

```
« 450 € TTC » / « 450 TTC » / « 450€TTC » / « 450 € T.T.C. » / « 450 € toutes taxes comprises » / « 450 euros TTC » / « 450e TTC » => [375,409.09,426.54]
« 450 € (TTC) » => [450]    « 450 € taxes comprises » => [450]    « 450 € TVA comprise » => [450]    « 450 € TVA incluse » => [450]
« 450 € TVAC » => [450]     « TTC : 450 € » => [450]               « Prix TTC 450 € » => [450]
ajouter_tarif « 450 € TTC », HT à 10 % (409,09), TVA 10 => "tarif ajouté : 409,09 € HT"
ajouter_tarif « 450 € TTC », 450 posé en HT => "Le prix 450,00 € HT ne vient pas de ce que l'artisan t'a écr…", rien d’écrit
ajouter_tarif « 450 € TTC », HT à 20 % (375), TVA 10 (taux incohérent) => "tarif ajouté : 375,00 € HT", écrit [375, 10]
ajouter_tarif « 450 € TVA comprise » / « prix TTC 450 € » / « 450 € taxes comprises », 450 posé en HT => "tarif ajouté : 450,00 € HT"
```

- La cible de 032-006 ferme : après « 450 € TTC », la conversion juste entre et le TTC recopié en HT est refusé.
- **Moyen, graphies non lues** : « TVA comprise », « TVA incluse », « taxes comprises », « (TTC) » entre parenthèses, « TVAC », et le TTC
  écrit avant le nombre. Le lookahead `TTC` (`lib/assistant/cartes.ts:177`) ne lit que « ttc », « t.t.c » ou « toutes taxes » juste après
  le nombre, et une parenthèse le coupe. Je garde la gravité que 032-006 donnait au TTC : le modèle doit ignorer une mention explicite face
  au champ « Prix unitaire HT ». Correctif : accepter `(`, et `tva compris`, `tva inclus`, `taxes compris`, `tvac` après le nombre ;
  chercher aussi « TTC » dans les 16 caractères avant.
- **Moyen, taux incohérent** : les trois formes HT sont admises quel que soit le `tva_taux` de l'entrée. 375 € HT à TVA 10 % donne
  412,50 € TTC au lieu des 450 écrits. Il faut que le modèle se trompe de taux, d'où le moyen. Correctif : n'admettre que la forme HT du
  `tva_taux` envoyé (`n / (1 + tva)`), et refuser sinon avec « prix TTC donné : quel taux de TVA ? ».
- Information : « 450 € HT soit 495 € TTC » ajoute aussi 412,50 et 469,19 aux prix de l'artisan. C'est une coïncidence possible, sans
  gravité propre.

## D2 — tient sur sa cible ; moyen sur 11 tournures neuves

Rejeu de 032-006 : 0 tournure sur 28 n'ouvre le mode. Sur 31 tournures neuves (section F), 11 l'ouvrent encore :
- **Heures et moments que `REPORT` ignore** (`lib/assistant/cadrage.ts`, `REPORT`) : « à 14h30 » (le motif `a \d{1,2} ?h` exige une
  espace après « h », et « 14h30 » n'en a pas), « vers 10h », « à midi », « cet aprèm », « la semaine pro », « la semaine qui vient »,
  « dans un moment », « tantôt ».
- **Participes que `FAIT_EN_FIN` ignore** : « Relance Dupont partie », « … effectuée », « … transmise ». Le mode renverrait la relance.
  Le registre S4 la refuse si elle est partie par Presti dans les 3 jours, mais pas si l'artisan l'a envoyée de sa propre boîte.
- Ferment bien : « d’ici peu », « en fin de journée », « dans 2-3 jours », « Oui, dans un moment », « Oui mais à midi », « Non merci »,
  « Pas pour l’instant », « Ça peut attendre », « Négatif », « Ok je vois », « Ok compris », « Ah ok », « Ok ça marche merci », « Ouais
  bof », « sauf s’il a payé », « si besoin », « enfin je crois ».

Pourquoi c'est moyen : comme en 032-006, le pire qui parte est une relance, ou un devis entièrement sourcé, trop tôt ou en double. Un geste
§3.2 reste une carte (`jamaisAutomatique` : `[true,true,true,true,true]`), un devis non sourcé aussi (D1). Correctif : ajouter à `REPORT`
`a \d{1,2} ?h\d{0,2}`, `vers \d{1,2}`, `midi`, `aprem`, `semaine pro`, `qui vient`, `un moment`, `tantot` ; à `FAIT_EN_FIN` `partie`,
`effectuee`, `transmise`, `expediee`.

**Faible — vrais ordres devenus des cartes** : « Ok ça marche » après une proposition ; « Relance tous ceux qui n’ont pas signé depuis le
15 octobre » ; « Refais le devis de Martin, chantier le 15/11, et envoie-le ». Dans les deux derniers, `le \d{1,2}` lit la date comme un
report. C'est la seule ligne du rejeu de 032-005 qui change (`faitToutSeul` passe de `true` à `false`), du côté sûr. « Relance ceux qui ne
m’ont pas payé » et « Relance les clients qui n’ont pas répondu » restent des ordres : la relative tient.

## Voisin moyen — le mode « fait tout seul » ne relit pas l'escalade

L'artisan écrit « Relance tous les devis en attente ». C'est un ordre net (`faitToutSeul` : `true`). Le devis DEV-2026-0011 est rattaché à
une conversation où le client a écrit « Litige : vous avez inondé ma cuisine, mon avocat vous écrira ». La relance part aussitôt, au nom de
l'artisan, alors que le pilote renverrait la même carte à la main :

```
« Relance tous les devis en attente » (ordre net, mode ouvert) => {"resume":"faite à la demande de l’artisan : relance du devis DEV-2026-0011 envoyée au clie…","emails":[{"a":"dupont@essai.test","debut":"Bonjour M. Dupont,\n\nJe me permets de revenir vers vous au su"}],"le_pilote_dirait":"litige"}
témoin : même devis, mode fermé (carte) => {"resume":"proposée, en attente de confirmation : Relancer M. Dupont pour le devis DEV-2026…","emails":[]}
actions-serveur.ts lit-il l’escalade (sujetEscalade, sujetDuFil, prise_en_main) ? (grep dans le source) => false
```

Le même chemin vaut pour `relancer_facture`, `valider_reponse_proposee` et `repondre_client` (`lib/assistant/actions-serveur.ts:1406-1432` :
seuls `jamaisAutomatique` et `horsAuto` gardent une carte).

- Pourquoi c'est moyen et non élevé : l'action part sur un **ordre écrit par l'artisan lui-même**, que Benj a choisi de faire valoir comme
  clic (mode « fait tout seul », 29/10). Le texte est un gabarit fixe qui ne parle pas du litige (`texteRelanceDevis`). Le cas qui
  inquiète, un fil en litige pris dans un ordre groupé, demande une coïncidence. Mais c'est incohérent avec le pilote, qui relit
  l'escalade de la même carte, et avec le §3.2 (« même au niveau 3 »).
- Correctif : dans `proposee`, pour un outil pilotable (`typePiloteDeOutil`), relire la conversation (`conversationDeLaCarte`) par
  `sujetEscalade`. Un sujet trouvé met `horsAuto` à « Le client parle d’un sujet sensible… », donc une carte. Il faut un essai et son
  mutant.

## Voisin moyen — impayés : une contestation écrite avant l'échéance n'est pas lue (inchangé)

```
référence de la réponse (échéance, aucune relance partie) => 2026-10-15T00:00:00Z
reponseClient (contestation le 05/10, échéance le 15/10) => false
sujetEscalade sur ce message => conteste
les impayés lisent-ils l’escalade ? (grep relancesImpayes*.ts) => false
```

C'est le défaut que 032-006 rangeait en moyen (`lib/relancesImpayes.ts:238-242`, `lib/relancesImpayesMagasin.ts:70`), avec le même
raisonnement. Il faut une option cochée en Signature (`factures.relances.auto`, drapeau `relancesImpayes` levé, `lib/flags.ts:179`). Il
faut aussi que la contestation soit écrite dans la conversation de la page : une réponse à l'e-mail de la facture va chez l'artisan, par
`Reply-To`. Et il faut ce calendrier précis. Correctif : `sujetEscalade` sur les messages entrants du dossier, quelle qu'en soit la date,
avant `decider`.

## D1, D1 bis, A2, A3, D3, D4, D6, D7, I3 — tiennent (rejeux)

Les sorties de `rejeu-032-004.mjs`, `rejeu-032-004-b.mjs` et `rejeu-032-005.mjs` sont **identiques** à celles de 032-006 (`diff` sur les
sorties de la session de 032-006), à une ligne près. C'est la ligne faible de D2 ci-dessus. `attaque-032-006.mjs` rend :
- A2 : le prix lu ailleurs et « l’ordre de grandeur » sont refusés. « 450 € HT », « 1 200 € » et « 520 € » entrent, « 200 » (morceau de
  1 200) est refusé.
- A3 : 28 textes sur 29 sont conformes. Le 29e, « 450 € TTC », donne désormais ses trois formes HT : c'est le correctif TTC voulu.
- I3 : le litige reste lu 9 messages plus tard, et sort de la fenêtre au 10e (faible, connu).
- D4 : le produit est toujours déplié au webhook (`app/api/stripe/webhook/route.ts:232`).
- D7 : `garde-fou-envoi-qa`, `offres-affichage-qa`, `securite-assistant-0211-qa` et `relances-registre-qa` sont dans `SUITES`
  (`scripts/tout-verifier.mjs:54`, `:57`, `:194`, `:195`, tableau `:25-201`).

## Faibles

- Fenêtre de 10 messages, désormais montrée sur le cron aussi : un litige suivi de 10 messages neutres du client reçoit sa relance
  (`"sent":1`). Une marque d'escalade posée sur le dossier au premier mot fermerait I3 et cette fenêtre.
- Faux positifs du côté sûr, mais au coût réel : la relance de conversation est **annulée** (`envoyee: true`), sans proposition ni mot à
  l'artisan, dès que la demande dit « urgent », « fuite » ou « fuit ». Pour un plombier, c'est une grande part de ses demandes : elles
  perdent leurs relances J+2, J+5 et J+10 sans qu'il le sache. Une proposition notifiée (`etat: 'proposition'`, comme Studio) garderait le
  côté sûr sans ce silence.
- Réglages de la plateforme illisibles : la relance attend sans fin (côté sûr).
- `securite-assistant-0211-qa` vérifie le cron par expressions régulières sur le source (C9f), pas par le `GET`. Un essai de bout en bout
  comme la section A (témoin qui envoie, litige qui n'envoie pas) le rendrait robuste à un remaniement.

## Les suites, jouées une à la fois (02/11, hors ligne)

| Suite | Sortie (dernière ligne) | Code |
|---|---|---|
| `securite-assistant-0211-qa` | `134 PASS, 0 FAIL (123 à 032-006)` | 0 |
| `relances-registre-qa` | `44 PASS, 0 FAIL` | 0 |
| `assistant-qa` | `310 PASS, 0 FAIL` | 0 |
| `assistant-tout-qa` | `120 PASS, 0 FAIL` | 0 |
| `pilote-qa` | `88 vert(s), 0 rouge(s)` | 0 |
| `relances-impayes-qa` | `✅ relances-impayes-qa : 218/218 contrôles` | 0 |
| `offres-affichage-qa` | `✅ offres-affichage-qa : 286/286 contrôles` | 0 |
| `essais-gratuits-qa` | `✅ essais-gratuits-qa : 44 réussis, 0 échoués` | 0 |
| `crm-qa` | `216 vert(s), 0 rouge(s)` | 0 |
| `garde-fou-envoi-qa` | `✓ garde-fou des envois : 33 vert(s), 0 rouge(s)` | 0 |

Grep sur les suites : aucune ne joue « a fui », « fuir » ni « perd de l’eau » ; aucune ne joue le `GET` du cron (C9f lit le source) ;
aucune ne joue l’escalade en « fait tout seul », les graphies TTC de la section E, ni les 11 tournures de D2 ci-dessus.

## Points à valider (session principale, Benj)

1. **E3, avant le push** : remplacer `fuit`, `fuient`, `fuyait` et `fuyaient` par les racines `fui` et `fuy`, et ajouter `perd de l eau`,
   `perdent de l eau` et `perte d eau`. Il faut un essai et son mutant. La correction ne fait que restreindre.
2. Puis un audit distinct sur ce point seul : le reste a tenu.
3. Pour le lot suivant :
   - l'escalade relue en « fait tout seul » ;
   - les impayés contestés avant l'échéance ;
   - les graphies TTC non lues et le taux incohérent ;
   - les 11 tournures de D2 ;
   - les 22 synonymes de D5 ;
   - la marque d'escalade sur le dossier (fenêtre de 10 messages) ;
   - une relance annulée qui prévient l'artisan.
4. Antériorité, à décider en connaissance de cause : E3 est déjà en production, et ce lot n'en est pas la cause. La règle du verdict
   s'applique telle quelle et donne « ne tient pas ». Si Benj préfère pousser L1 et L2 tels quels, parce qu'ils ferment S1 à S5 et E1 sans
   rien ouvrir, c'est à lui de le dire par écrit. Le correctif tient en une ligne.
5. Restent à la session principale : `npm run typecheck`, `npm run build` (`PRESTI_DIST=.next-prod`), le déploiement et les suites en
   direct (`pilotage-e2e`, `relances-e2e`).

## Annexes — les scripts d'attaque (hors dépôt)

Dossier temporaire de la session :
`C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-Documents-presti\6a8495cc-cb78-4c0b-baff-81bdac5d21ac\scratchpad\`.

Les scripts se lancent depuis la racine du dépôt : `node --experimental-strip-types --import ./scripts/ts-loader.mjs <script>`. Ils ne
lisent aucun secret (clés d'essai inventées, `RESEND_API_KEY` ôtée) et ne touchent pas au réseau. Leur dossier de copies temporaires est
effacé en fin de passage. `rejeu-032-004.mjs`, `rejeu-032-004-b.mjs`, `rejeu-032-005.mjs` et `attaque-032-006.mjs` sont ceux de 032-006,
sans changement (annexes de `032-004/rapport.md`, `032-005/rapport.md` et `032-006/rapport.md`).

### Annexe A — `attaque-032-007.mjs`

```js
#!/usr/bin/env node
// Cinquième audit 032-007 : attaques hors ligne des correctifs E1 (cron des relances sur un fil en escalade), E2 (lexique), TTC, D2,
// et des envois voisins (fait tout seul, impayés). Lecture seule : aucun réseau (fetch doublé, toute autre adresse lève), aucune base,
// aucun modèle, aucun e-mail (sendEmail doublé). Données inventées.
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

// ── Doublure de PostgREST (reprise de 032-006, plus le tri `order` et des pannes injectées par table) ──
const T = {}
const PANNE = {}
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
  else if (op === 'lt') res = String(champ) < x
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
  if (PANNE[table] && (methode === 'GET' || methode === 'HEAD')) return rep({ code: PANNE[table], message: 'panne simulée' }, 500)
  const lignes = (T[table] ??= [])
  const params = [...url.searchParams].filter(([k]) => !ORDRE.has(k))
  requetes.push({ methode, table, url: String(url) })
  const corps = init.body ? JSON.parse(init.body) : null
  if (methode === 'GET' || methode === 'HEAD') {
    let r = lignes.filter((l) => params.every(([k, v]) => k === 'or' || cond(l[k], v)))
    const ord = url.searchParams.get('order')
    if (ord) { const [champ, sens] = ord.split('.'); r = [...r].sort((a, b) => (String(a[champ]) < String(b[champ]) ? -1 : String(a[champ]) > String(b[champ]) ? 1 : 0) * (sens === 'desc' ? -1 : 1)) }
    if (methode === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `0-0/${r.length}` } })
    const lim = url.searchParams.get('limit'); if (lim) r = r.slice(0, Number(lim))
    if (String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object')) return r.length === 1 ? rep(r[0]) : r.length === 0 && url.searchParams.has('limit') ? rep(null) : r.length === 0 ? rep(null) : rep({ code: 'PGRST116', message: 'no rows' }, 406)
    return rep(r)
  }
  if (methode === 'PATCH') {
    const touchees = lignes.filter((l) => params.every(([k, v]) => cond(l[k], v)))
    for (const l of touchees) Object.assign(l, corps)
    return rep(touchees)
  }
  if (methode === 'POST') { const ajout = []; for (const n of Array.isArray(corps) ? corps : [corps]) { const l = { id: id(7000 + lignes.length), ...n }; lignes.push(l); ajout.push(l) } return rep(String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object') ? ajout[0] : ajout) }
  return rep([])
}
const vider = () => { for (const k of Object.keys(T)) delete T[k]; for (const k of Object.keys(PANNE)) delete PANNE[k]; requetes.length = 0 }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-attaque-032-007-'))
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
  const motsDefaut = PC.CONFIG_DEFAUT.escalade_mots

  // ═══ A. E1 — le vrai GET du cron des relances de conversation
  console.log('\n── A. E1 : cron des relances de conversation (vrai GET, dépendances lourdes doublées ; base, registre, offres, plateforme, relances réels)')
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
    '@/lib/ai': 'export async function generateRelanceReply(_a, l, rang) { return `Bonjour ${l.nom_prospect}, je reviens vers vous au sujet de votre demande : ${l.message}. (relance ${rang})` }\nexport function relanceTemplate() { return "modèle" }',
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
  async function passage(nom, { plan = 'signature', prise_en_main = false, fil: messages = [], demande = 'Devis pour refaire la salle de bain', panne = {}, cfg = null }) {
    vider(); globalThis.__ENVOIS = []
    Object.assign(PANNE, panne)
    T.artisans = [{ ...ARTISAN, plan }]
    if (cfg) T.plateforme_config = [{ artisan_id: A, ...cfg }]
    T.leads = [{ id: L, artisan_id: A, nom_prospect: 'M. Essai', contact: 'client@essai.test', message: demande, statut: 'repondu', prise_en_main, urgence: prise_en_main ? 'urgent' : null, canal: 'web' }]
    T.messages = messages.map(([sens, type, contenu], i) => ({ id: id(500 + i), lead_id: L, sens, type, contenu, etat: null, sent_at: `2026-10-${String(10 + i).padStart(2, '0')}T10:00:00Z` }))
    T.relances = [{ id: id(600), lead_id: L, rang: 1, planifiee_le: '2026-11-01T07:00:00Z', envoyee: false }]
    const rep = await cron.GET(new Request('http://localhost/api/cron/relances', { headers: { authorization: 'Bearer secret-essai' } }))
    const corps = await rep.json()
    const propositions = (T.messages ?? []).filter((m) => m.type === 'relance').map((m) => ({ etat: m.etat ?? 'envoyée', debut: String(m.contenu).slice(0, 50) }))
    log(`  ${nom}`, { statut: rep.status, sent: corps.sent, prepared: corps.prepared, skipped: corps.skipped, relance_envoyee: T.relances[0].envoyee, emails: globalThis.__ENVOIS.map((m) => String(m.text).slice(0, 70)), relances_dans_le_fil: propositions })
  }
  const FIL_LITIGE = [['in', 'manuel', 'Devis pour refaire la salle de bain'], ['out', 'reponse_auto', 'Bonjour, merci pour votre demande…'], ['in', 'manuel', 'Litige : vous avez inondé ma cuisine, mon avocat vous écrira'], ['out', 'manuel', 'Bonjour, je suis désolé, je vous rappelle demain.']]
  const FIL_NEUTRE = [['in', 'manuel', 'Devis pour refaire la salle de bain'], ['out', 'reponse_auto', 'Bonjour, merci pour votre demande…'], ['in', 'manuel', 'Merci, j’attends votre devis'], ['out', 'manuel', 'Je vous l’envoie cette semaine.']]
  await passage('témoin Signature, fil neutre (le banc sait rougir : une relance part)', { fil: FIL_NEUTRE })
  await passage('témoin Studio, fil neutre (une relance est proposée)', { fil: FIL_NEUTRE, plan: 'studio' })
  await passage('rejeu 032-006 : Signature, « Litige … mon avocat », réponse de l’artisan à la main', { fil: FIL_LITIGE })
  await passage('rejeu 032-006 : Signature, fil neutre, l’artisan a cliqué « Escalader » (prise_en_main)', { fil: FIL_NEUTRE, prise_en_main: true })
  await passage('rejeu 032-006 : Studio, fil en litige (ni envoi ni proposition)', { fil: FIL_LITIGE, plan: 'studio' })
  await passage('litige dans la DEMANDE d’origine seulement (leads.message), aucun message', { demande: 'Litige avec votre collègue : je veux un devis de reprise', fil: [] })
  await passage('« mon ballon fuit » dans la demande (E1 + E2)', { demande: 'Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ?', fil: [] })
  await passage('mot propre à l’artisan (« carrelage fissuré ») dans le fil', { fil: [...FIL_NEUTRE, ['in', 'manuel', 'Le carrelage fissuré après votre passage, c’est inadmissible']], cfg: { escalade_mots: ['carrelage fissuré'] } })
  await passage('messages du client ILLISIBLES (500) sur un fil en litige', { fil: FIL_LITIGE, panne: { messages: 'XX000' } })
  await passage('réglages de la plateforme ILLISIBLES (500) sur un fil en litige', { fil: FIL_LITIGE, panne: { plateforme_config: 'XX000' } })
  await passage('réglages de la plateforme ILLISIBLES (500) sur un fil NEUTRE (coût : la relance attend)', { fil: FIL_NEUTRE, panne: { plateforme_config: 'XX000' } })
  const dixNeutres = Array.from({ length: 10 }, (_, i) => ['in', 'manuel', `Message neutre ${i + 1}`])
  await passage('fenêtre : « mon avocat » puis 9 messages neutres du client', { fil: [['in', 'manuel', 'Devis salle de bain'], ['in', 'manuel', 'Litige : mon avocat vous écrira'], ...dixNeutres.slice(0, 9)] })
  await passage('fenêtre : « mon avocat » puis 10 messages neutres du client (faible, connu d’I3)', { fil: [['in', 'manuel', 'Devis salle de bain'], ['in', 'manuel', 'Litige : mon avocat vous écrira'], ...dixNeutres] })
  console.log('  — synonymes d’une fuite ou d’un litige dans le fil (le cron annule-t-il ?)')
  for (const p of ['Mon ballon perd de l’eau depuis hier', 'Il y a de l’eau partout dans la cuisine', 'Ça fui sous l’évier', 'Le robinet goutte sans arrêt', 'Ça suinte au plafond', 'Ma cuisine est sous l’eau depuis votre passage', 'Je ne vous paierai pas un euro de plus', 'Vous allez entendre parler de moi']) {
    await passage(`« ${p} »`, { fil: [...FIL_NEUTRE, ['in', 'manuel', p]] })
  }

  // ═══ B. Un autre envoi seul sur un fil en escalade : le mode « fait tout seul » de l'assistant
  console.log('\n── B. « Fait tout seul » (ordre net de l’artisan) sur un devis dont la conversation parle d’un litige')
  const envoisAssistant = []
  function srvDe(textesArtisan, routes, autonome = true) {
    return srvMod.actionsDeSession({
      uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(900), tour: () => 1, magasin: conf.magasinEnMemoire(),
      textesArtisan,
      dependances: {
        envoyerDevis: async () => new Response('{}'), piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z'),
        historiqueRelances: async () => ({ ok: true, traces: [], ignorees: [] }),
        envoyerMail: async (m) => { envoisAssistant.push(m); return { ok: true } },
        appeler: async (_g, chemin, o) => {
          routes.push({ chemin, corps: o?.corps ?? null })
          if (chemin === '/api/tarifs' && o?.corps) (T.prix_artisan ??= []).push({ id: id(8001), artisan_id: A, actif: true, designation: o.corps.designation, prix_ht: o.corps.prix_ht, unite: o.corps.unite ?? 'u', tva_taux: o.corps.tva_taux ?? 10, date_prix: '2026-11-02' })
          return { status: 200, json: { ok: true } }
        },
      },
      autonome: () => autonome,
    })
  }
  const DEVIS = { id: id(300), artisan_id: A, numero: 'DEV-2026-0011', statut: 'envoye', objet: 'Salle de bain', client_nom: 'M. Dupont', client_email: 'dupont@essai.test', total_ttc: 1200, envoye_le: '2026-10-20', validite_jours: 30, lead_id: L }
  for (const [nom, autonome] of [['« Relance tous les devis en attente » (ordre net, mode ouvert)', true], ['témoin : même devis, mode fermé (carte)', false]]) {
    vider(); envoisAssistant.length = 0
    T.artisans = [{ ...ARTISAN }]
    T.devis = [{ ...DEVIS }]
    T.leads = [{ id: L, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: 'Devis salle de bain', statut: 'devis_envoye', prise_en_main: false }]
    T.messages = [{ id: id(501), lead_id: L, sens: 'in', type: 'manuel', contenu: 'Litige : vous avez inondé ma cuisine, mon avocat vous écrira', etat: null, sent_at: '2026-10-25T10:00:00Z' }]
    const srv = srvDe(['Relance tous les devis en attente'], [], autonome)
    const r = await srv.executeurs.relancer_devis(oa.validerAction('relancer_devis', { numero: 'DEV-2026-0011' }).entree)
    log(`  ${nom}`, { resume: String(r.resume ?? '').slice(0, 80), emails: envoisAssistant.map((m) => ({ a: m.to, debut: String(m.text).slice(0, 60) })), le_pilote_dirait: R.sujetEscalade(T.messages.map((m) => m.contenu), motsDefaut) })
  }
  log('  ordre « Relance tous les devis en attente » : faitToutSeul ?', cadrage.faitToutSeul(cadrage.cadrerDemande('Relance tous les devis en attente', null), { contenuTiersLu: false }))
  log('  actions-serveur.ts lit-il l’escalade (sujetEscalade, sujetDuFil, prise_en_main) ? (grep dans le source)', /sujetEscalade|sujetDuFil|escalade/.test(fs.readFileSync(path.join(RACINE, 'lib/assistant/actions-serveur.ts'), 'utf8')))

  // ═══ C. Impayés : une contestation écrite avant l'échéance (voisin moyen de 032-006)
  console.log('\n── C. Relances d’impayés : contestation du client écrite AVANT l’échéance (vrai magasin, base factice)')
  {
    const mag = await imp('lib/relancesImpayesMagasin.ts')
    const RI = await imp('lib/relancesImpayes.ts')
    vider()
    T.devis = [{ id: id(310), artisan_id: A, lead_id: L }]
    T.leads = [{ id: L, artisan_id: A, contact: 'dupont@essai.test' }]
    T.messages = [{ id: id(511), lead_id: L, sens: 'in', contenu: 'Je conteste cette facture : le travail est bâclé, je ne paierai pas', sent_at: '2026-10-05T10:00:00Z' }]
    const f = { id: id(320), devis_id: id(310), client_email: 'dupont@essai.test', date_echeance: '2026-10-15' }
    const depuis = RI.referenceReponse(f, [], null)
    log('  référence de la réponse (échéance, aucune relance partie)', depuis)
    log('  reponseClient (contestation le 05/10, échéance le 15/10)', await mag.magasinSupabase.reponseClient(A, f, depuis))
    log('  sujetEscalade sur ce message', R.sujetEscalade(T.messages.map((m) => m.contenu), motsDefaut))
    log('  les impayés lisent-ils l’escalade ? (grep relancesImpayes*.ts)', ['lib/relancesImpayes.ts', 'lib/relancesImpayesMagasin.ts', 'lib/relancesImpayesTour.ts'].some((x) => /sujetEscalade|escalade/.test(fs.readFileSync(path.join(RACINE, x), 'utf8'))))
  }

  // ═══ D. E2 — le lexique, tournures neuves
  console.log('\n── D. E2 / D5 : sujets d’escalade, tournures neuves (null = la ligne part seule ; mots par défaut inclus)')
  const sujets = [
    // fuites dites autrement, et fautes de frappe courantes
    'Ça fui sous l’évier', 'Mon robinet fuie', 'Le ballon perd de l’eau', 'Mon chauffe-eau perd de l’eau', 'Il y a de l’eau partout', 'Il y a de l’eau par terre',
    'Le robinet goutte', 'Ça goutte sous l’évier', 'Ça suinte au plafond', 'Une tache d’humidité au plafond', 'L’eau coule le long du mur', 'Le wc déborde', 'Les toilettes débordent',
    'La cuisine est sous l’eau', 'Mon plafond s’est effondré', 'Fuitte sous l’évier', 'fuite', 'FUITE !!!', 'fuyant',
    // urgences
    'URGENT', 'Urgentissime', 'C’est pressé', 'Au plus vite svp', 'C’est très pressant', 'Plus de chauffage avec un bébé', 'Plus d’eau chaude depuis 3 jours', 'Odeur de gaz dans la cuisine', 'Ça sent le gaz',
    // litiges et menaces
    'Je vais vous faire un procès', 'Je porte plainte', 'Vous allez entendre parler de moi', 'Je ne vous paierai pas un euro de plus', 'Je retiens le paiement', 'Rendez-moi mon argent', 'C’est une honte', 'Je vais vous faire de la mauvaise publicité', 'Je mets un avis sur Google',
    // sinistres et sécurité
    'Mon fils s’est brûlé', 'Les plombs ont sauté', 'Ça a pris feu', 'Court-jus dans la salle de bain', 'Le chauffe-eau a explosé',
  ]
  let manques = 0
  for (const p of sujets) { const s = R.sujetEscalade([p], motsDefaut); if (s === null) manques++; log(`  « ${p} »`, s) }
  log('  manqués', `${manques} / ${sujets.length}`)
  console.log('\n── D. FAUSSE_URGENCE : peut-elle masquer un vrai sujet ?')
  for (const p of ['Pas urgent mais ça fuit', 'Pas d’urgence, mais une fuite', 'Sans dégât mais il y a eu un dégât des eaux', 'Pas urgent du tout', 'Pas trop urgent', 'Non urgent', 'Sans urgence : litige avec le voisin', 'pas urgent, avocat', 'C’est pas urgent, l’assurance passera']) log(`  « ${p} »`, R.sujetEscalade([p], motsDefaut))
  console.log('\n── D. Ce qui part par la réponse seule (Signature, « auto ») sur trois manques')
  const cfgAuto = { ...PC.CONFIG_DEFAUT, mode_reponse: 'auto', auto_24_7: true }
  const art = { plan: 'signature', leads_pause: false }
  for (const p of ['Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ?', 'Bonjour, ça fui sous l’évier', 'Il y a de l’eau partout dans la cuisine']) log(`  decisionReponse « ${p} »`, PC.decisionReponse(art, { prise_en_main: false }, cfgAuto, { nbReponsesIA: 0, message: p, messagesClient: [p] }))

  // ═══ E. TTC — prixEcrits et ajouter_tarif
  console.log('\n── E. TTC : prixEcrits (valeurs en euros)')
  for (const t of ['450 € TTC', '450 TTC', '450€TTC', '450 € T.T.C.', '450 € toutes taxes comprises', '450 euros TTC', '450e TTC', '450 € (TTC)', '450 € taxes comprises', '450 € TVA comprise', '450 € TVA incluse', '450 € TVAC', 'TTC : 450 €', 'Prix TTC 450 €', '450 € HT soit 495 € TTC', '450 € HT', '1 200 € TTC', '450 € ttc pose comprise']) log(`  « ${t} »`, [...cartes.prixEcrits([t])].map((c) => c / 100).sort((a, b) => a - b))
  console.log('\n── E. ajouter_tarif après un prix TTC')
  for (const [nom, texte, prix, tva] of [
    ['« 450 € TTC », HT à 10 % (409,09), TVA 10', 'Mets la pose ballon à 450 € TTC dans mes tarifs', 409.09, 10],
    ['« 450 € TTC », HT à 20 % (375), TVA 10 (taux incohérent)', 'Mets la pose ballon à 450 € TTC dans mes tarifs', 375, 10],
    ['« 450 € TTC », 450 posé en HT', 'Mets la pose ballon à 450 € TTC dans mes tarifs', 450, 10],
    ['« 450 € TVA comprise », 450 posé en HT', 'Mets la pose ballon à 450 € TVA comprise dans mes tarifs', 450, 10],
    ['« prix TTC 450 € », 450 posé en HT', 'Mets la pose ballon, prix TTC 450 €, dans mes tarifs', 450, 10],
    ['« 450 € taxes comprises », 450 posé en HT', 'Mets la pose ballon à 450 € taxes comprises dans mes tarifs', 450, 10],
  ]) {
    vider(); T.artisans = [{ ...ARTISAN }]; T.prix_artisan = []
    const srv = srvDe([texte], [])
    const r = await srv.executeurs.ajouter_tarif(oa.validerAction('ajouter_tarif', { designation: 'Pose ballon 200 L', prix_ht: prix, unite: 'u', tva_taux: tva }).entree)
    log(`  ${nom}`, { resume: String(r.resume ?? '').slice(0, 60), ecrit: (T.prix_artisan ?? []).map((t) => [t.prix_ht, t.tva_taux]) })
  }

  // ═══ F. D2 — tournures neuves
  console.log('\n── F. D2 : tournures qui ne sont PAS des ordres (⚠ OUVRE = le mode « fait tout seul » s’ouvre)')
  const PROPOSE = 'Dupont n’a pas répondu depuis 12 jours. Voulez-vous que je le relance ?'
  const pasOrdres = [
    ['Relance Dupont à 14h30', null], ['Relance Dupont vers 10h', null], ['Relance Dupont à midi', null], ['Relance Dupont cet aprèm', null], ['Relance Dupont la semaine pro', null],
    ['Relance Dupont dans un moment', null], ['Relance Dupont d’ici peu', null], ['Relance Dupont tantôt', null], ['Relance Dupont en fin de journée', null], ['Relance Dupont la semaine qui vient', null],
    ['Relance Dupont dans 2-3 jours', null], ['Oui, dans un moment', PROPOSE], ['Oui mais à midi', PROPOSE], ['Oui, en fin de semaine', PROPOSE],
    ['Relance Dupont partie', null], ['Relance Dupont effectuée', null], ['Relance Dupont transmise', null], ['Devis Dupont expédié', null], ['Relance Dupont faite hier soir', null],
    ['Non merci', PROPOSE], ['Pas pour l’instant', PROPOSE], ['Ça peut attendre', PROPOSE], ['Négatif', PROPOSE], ['Ok je vois', PROPOSE], ['Ok compris', PROPOSE], ['Ah ok', PROPOSE], ['Ok ça marche merci', PROPOSE], ['Ouais bof', PROPOSE],
    ['Relance Dupont, sauf s’il a payé', null], ['Relance Dupont si besoin', null], ['Relance Dupont, enfin je crois', null],
  ]
  let ouvre = 0
  for (const [m, avant] of pasOrdres) {
    const c2 = cadrage.cadrerDemande(m, avant)
    const ft = cadrage.faitToutSeul(c2, { contenuTiersLu: false })
    if (ft) ouvre++
    log(`  ${ft ? '⚠ OUVRE' : 'ferme '} « ${m} »${avant ? ' (après « Voulez-vous que je le relance ? »)' : ''}`, { ordre: c2.ordre })
  }
  log('  total qui ouvrent', `${ouvre} / ${pasOrdres.length}`)
  console.log('\n── F. D2 : vrais ordres (✗ carte = un clic de plus)')
  for (const [m, avant] of [['Relance ceux qui ne m’ont pas payé', null], ['Relance les clients qui n’ont pas répondu', null], ['Relance Dupont', null], ['Oui', PROPOSE], ['Ok', PROPOSE], ['Oui vas-y', PROPOSE], ['Ok ça marche', PROPOSE], ['Envoie le devis DEV-2026-0011 à Dupont', null], ['Refais le devis de Martin, chantier le 15/11, et envoie-le', null], ['Relance les devis envoyés il y a plus de 5 jours', null], ['Relance tous ceux qui n’ont pas signé depuis le 15 octobre', null]]) {
    const c2 = cadrage.cadrerDemande(m, avant)
    log(`  ${cadrage.faitToutSeul(c2, { contenuTiersLu: false }) ? 'ouvre ' : '✗ carte'} « ${m} »`, { ordre: c2.ordre })
  }
  console.log('\n── F. D2 : un geste §3.2 reste une carte même sur un ordre net (rejeu)')
  log('  jamaisAutomatique(marquer_facture_payee, creer_facture, creer_facture_libre, supprimer_devis_brouillon, augmenter_tarifs)', ['marquer_facture_payee', 'creer_facture', 'creer_facture_libre', 'supprimer_devis_brouillon', 'augmenter_tarifs'].map((o) => R.jamaisAutomatique(o)))
} catch (e) {
  console.error('ERREUR DU SCRIPT :', e)
  process.exitCode = 1
} finally {
  fs.rmSync(TMP, { recursive: true, force: true })
}
```

### Annexe B — `attaque-032-007-b.mjs`

```js
#!/usr/bin/env node
// 032-007, complément : les formes du verbe « fuir » que le correctif E2 ne lit pas, sur les deux chemins qui partent seuls
// (réponse seule en Signature « auto » ; pilote, même lecture sujetEscalade). Pur : aucune base, aucun réseau.
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs <ce fichier>
import path from 'node:path'
import { pathToFileURL } from 'node:url'
process.removeAllListeners('warning'); process.on('warning', () => {})
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://base.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-essai'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-essai'
globalThis.fetch = async (u) => { throw new Error(`réseau interdit : ${u}`) }
const imp = (rel) => import(pathToFileURL(path.join(process.cwd(), rel)).href)
const R = await imp('lib/pilote/regles.ts')
const PC = await imp('lib/plateformeConfig.ts')
const mots = PC.CONFIG_DEFAUT.escalade_mots
const auto = { ...PC.CONFIG_DEFAUT, mode_reponse: 'auto', auto_24_7: true }
const art = { plan: 'signature', leads_pause: false }
const log = (e, v) => console.log(`${e} => ${JSON.stringify(v)}`)
console.log('mots d’escalade par défaut de l’artisan :', JSON.stringify(mots))
let manques = 0
const phrases = [
  // participe passé et infinitif de « fuir » (le §3.2 nomme la fuite ; « fuit » a été classé élevé en 032-006)
  'Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ?', 'Le robinet a fui toute la nuit', 'Ça a fui sous l’évier',
  'Le ballon commence à fuir', 'Le robinet s’est mis à fuir', 'Le toit continue de fuir', 'Le joint va fuir', 'Le ballon fuira bientôt',
  // la paraphrase standard d'un appareil qui fuit
  'Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ?', 'Le ballon perd de l’eau par le bas', 'Ma chaudière perd de l’eau',
  // témoins (déjà repérés)
  'Mon ballon fuit', 'J’ai une fuite', 'Les tuyaux fuyaient',
]
for (const p of phrases) {
  const s = R.sujetEscalade([p], mots)
  const d = PC.decisionReponse(art, { prise_en_main: false }, auto, { nbReponsesIA: 0, message: p, messagesClient: [p] })
  if (s === null) manques++
  log(`« ${p} »`, { pilote_sujetEscalade: s, reponse_seule_Signature_auto: d.ok ? 'PART SEULE' : `${d.raison} (${d.mot ?? ''})` })
}
log('manqués', `${manques} / ${phrases.length}`)
// Le correctif proposé, joué sur une copie de la règle (« fui » et « fuy » au début d'un mot) : combien de faux positifs ordinaires ?
const enMots = (s) => ` ${String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `
for (const p of [...phrases, 'Fuir les ennuis', 'Il a fui ses responsabilités', 'Le fuyard', 'Un fusible a grillé', 'Une fuie (sic)']) log(`  avec « fui »/« fuy » en racine : « ${p} »`, / fui| fuy/.test(enMots(p)))
```

### Annexe C — sortie de `attaque-032-007.mjs` (code 0)

```
── A. E1 : cron des relances de conversation (vrai GET, dépendances lourdes doublées ; base, registre, offres, plateforme, relances réels)
  témoin Signature, fil neutre (le banc sait rougir : une relance part) => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  témoin Studio, fil neutre (une relance est proposée) => {"statut":200,"sent":0,"prepared":1,"skipped":0,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[{"etat":"proposition","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  rejeu 032-006 : Signature, « Litige … mon avocat », réponse de l’artisan à la main => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  rejeu 032-006 : Signature, fil neutre, l’artisan a cliqué « Escalader » (prise_en_main) => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  rejeu 032-006 : Studio, fil en litige (ni envoi ni proposition) => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  litige dans la DEMANDE d’origine seulement (leads.message), aucun message => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  « mon ballon fuit » dans la demande (E1 + E2) => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  mot propre à l’artisan (« carrelage fissuré ») dans le fil => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  messages du client ILLISIBLES (500) sur un fil en litige => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":false,"emails":[],"relances_dans_le_fil":[]}
  réglages de la plateforme ILLISIBLES (500) sur un fil en litige => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":false,"emails":[],"relances_dans_le_fil":[]}
  réglages de la plateforme ILLISIBLES (500) sur un fil NEUTRE (coût : la relance attend) => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":false,"emails":[],"relances_dans_le_fil":[]}
  fenêtre : « mon avocat » puis 9 messages neutres du client => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  fenêtre : « mon avocat » puis 10 messages neutres du client (faible, connu d’I3) => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  — synonymes d’une fuite ou d’un litige dans le fil (le cron annule-t-il ?)
  « Mon ballon perd de l’eau depuis hier » => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  « Il y a de l’eau partout dans la cuisine » => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  « Ça fui sous l’évier » => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  « Le robinet goutte sans arrêt » => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  « Ça suinte au plafond » => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  « Ma cuisine est sous l’eau depuis votre passage » => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}
  « Je ne vous paierai pas un euro de plus » => {"statut":200,"sent":0,"prepared":0,"skipped":1,"relance_envoyee":true,"emails":[],"relances_dans_le_fil":[]}
  « Vous allez entendre parler de moi » => {"statut":200,"sent":1,"prepared":0,"skipped":0,"relance_envoyee":true,"emails":["Bonjour M. Essai, je reviens vers vous au sujet de votre demande : Dev"],"relances_dans_le_fil":[{"etat":"envoyée","debut":"Bonjour M. Essai, je reviens vers vous au sujet de"}]}

── B. « Fait tout seul » (ordre net de l’artisan) sur un devis dont la conversation parle d’un litige
  « Relance tous les devis en attente » (ordre net, mode ouvert) => {"resume":"faite à la demande de l’artisan : relance du devis DEV-2026-0011 envoyée au clie","emails":[{"a":"dupont@essai.test","debut":"Bonjour M. Dupont,\n\nJe me permets de revenir vers vous au su"}],"le_pilote_dirait":"litige"}
  témoin : même devis, mode fermé (carte) => {"resume":"proposée, en attente de confirmation : Relancer M. Dupont pour le devis DEV-2026","emails":[],"le_pilote_dirait":"litige"}
  ordre « Relance tous les devis en attente » : faitToutSeul ? => true
  actions-serveur.ts lit-il l’escalade (sujetEscalade, sujetDuFil, prise_en_main) ? (grep dans le source) => false

── C. Relances d’impayés : contestation du client écrite AVANT l’échéance (vrai magasin, base factice)
  référence de la réponse (échéance, aucune relance partie) => 2026-10-15T00:00:00Z
  reponseClient (contestation le 05/10, échéance le 15/10) => false
  sujetEscalade sur ce message => conteste
  les impayés lisent-ils l’escalade ? (grep relancesImpayes*.ts) => false

── D. E2 / D5 : sujets d’escalade, tournures neuves (null = la ligne part seule ; mots par défaut inclus)
  « Ça fui sous l’évier » => null
  « Mon robinet fuie » => null
  « Le ballon perd de l’eau » => null
  « Mon chauffe-eau perd de l’eau » => null
  « Il y a de l’eau partout » => eau partout
  « Il y a de l’eau par terre » => null
  « Le robinet goutte » => null
  « Ça goutte sous l’évier » => null
  « Ça suinte au plafond » => null
  « Une tache d’humidité au plafond » => null
  « L’eau coule le long du mur » => null
  « Le wc déborde » => null
  « Les toilettes débordent » => null
  « La cuisine est sous l’eau » => null
  « Mon plafond s’est effondré » => effondr
  « Fuitte sous l’évier » => fuit
  « fuite » => fuite
  « FUITE !!! » => fuite
  « fuyant » => null
  « URGENT » => urgen
  « Urgentissime » => urgen
  « C’est pressé » => null
  « Au plus vite svp » => null
  « C’est très pressant » => null
  « Plus de chauffage avec un bébé » => null
  « Plus d’eau chaude depuis 3 jours » => null
  « Odeur de gaz dans la cuisine » => gaz
  « Ça sent le gaz » => gaz
  « Je vais vous faire un procès » => procès
  « Je porte plainte » => plainte
  « Vous allez entendre parler de moi » => null
  « Je ne vous paierai pas un euro de plus » => paierai pas
  « Je retiens le paiement » => null
  « Rendez-moi mon argent » => null
  « C’est une honte » => null
  « Je vais vous faire de la mauvaise publicité » => mauvaise pub
  « Je mets un avis sur Google » => null
  « Mon fils s’est brûlé » => brûl
  « Les plombs ont sauté » => null
  « Ça a pris feu » => null
  « Court-jus dans la salle de bain » => null
  « Le chauffe-eau a explosé » => explos
  manqués => 27 / 42

── D. FAUSSE_URGENCE : peut-elle masquer un vrai sujet ?
  « Pas urgent mais ça fuit » => fuit
  « Pas d’urgence, mais une fuite » => fuite
  « Sans dégât mais il y a eu un dégât des eaux » => dégât des eaux
  « Pas urgent du tout » => null
  « Pas trop urgent » => urgen
  « Non urgent » => urgen
  « Sans urgence : litige avec le voisin » => litige
  « pas urgent, avocat » => avocat
  « C’est pas urgent, l’assurance passera » => assurance

── D. Ce qui part par la réponse seule (Signature, « auto ») sur trois manques
  decisionReponse « Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ? » => {"ok":true}
  decisionReponse « Bonjour, ça fui sous l’évier » => {"ok":true}
  decisionReponse « Il y a de l’eau partout dans la cuisine » => {"ok":false,"raison":"escalade","mot":"eau partout","comportement":"silence"}

── E. TTC : prixEcrits (valeurs en euros)
  « 450 € TTC » => [375,409.09,426.54]
  « 450 TTC » => [375,409.09,426.54]
  « 450€TTC » => [375,409.09,426.54]
  « 450 € T.T.C. » => [375,409.09,426.54]
  « 450 € toutes taxes comprises » => [375,409.09,426.54]
  « 450 euros TTC » => [375,409.09,426.54]
  « 450e TTC » => [375,409.09,426.54]
  « 450 € (TTC) » => [450]
  « 450 € taxes comprises » => [450]
  « 450 € TVA comprise » => [450]
  « 450 € TVA incluse » => [450]
  « 450 € TVAC » => [450]
  « TTC : 450 € » => [450]
  « Prix TTC 450 € » => [450]
  « 450 € HT soit 495 € TTC » => [412.5,450,469.19]
  « 450 € HT » => [450]
  « 1 200 € TTC » => [1000,1090.91,1137.44]
  « 450 € ttc pose comprise » => [375,409.09,426.54]

── E. ajouter_tarif après un prix TTC
  « 450 € TTC », HT à 10 % (409,09), TVA 10 => {"resume":"tarif ajouté : 409,09 € HT","ecrit":[[409.09,10]]}
  « 450 € TTC », HT à 20 % (375), TVA 10 (taux incohérent) => {"resume":"tarif ajouté : 375,00 € HT","ecrit":[[375,10]]}
  « 450 € TTC », 450 posé en HT => {"resume":"Le prix 450,00 € HT ne vient pas de ce que l'artisan t'a écr","ecrit":[]}
  « 450 € TVA comprise », 450 posé en HT => {"resume":"tarif ajouté : 450,00 € HT","ecrit":[[450,10]]}
  « prix TTC 450 € », 450 posé en HT => {"resume":"tarif ajouté : 450,00 € HT","ecrit":[[450,10]]}
  « 450 € taxes comprises », 450 posé en HT => {"resume":"tarif ajouté : 450,00 € HT","ecrit":[[450,10]]}

── F. D2 : tournures qui ne sont PAS des ordres (⚠ OUVRE = le mode « fait tout seul » s’ouvre)
  ⚠ OUVRE « Relance Dupont à 14h30 » => {"ordre":true}
  ⚠ OUVRE « Relance Dupont vers 10h » => {"ordre":true}
  ⚠ OUVRE « Relance Dupont à midi » => {"ordre":true}
  ⚠ OUVRE « Relance Dupont cet aprèm » => {"ordre":true}
  ⚠ OUVRE « Relance Dupont la semaine pro » => {"ordre":true}
  ⚠ OUVRE « Relance Dupont dans un moment » => {"ordre":true}
  ferme  « Relance Dupont d’ici peu » => {"ordre":false}
  ⚠ OUVRE « Relance Dupont tantôt » => {"ordre":true}
  ferme  « Relance Dupont en fin de journée » => {"ordre":false}
  ⚠ OUVRE « Relance Dupont la semaine qui vient » => {"ordre":true}
  ferme  « Relance Dupont dans 2-3 jours » => {"ordre":false}
  ferme  « Oui, dans un moment » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Oui mais à midi » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Oui, en fin de semaine » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ⚠ OUVRE « Relance Dupont partie » => {"ordre":true}
  ⚠ OUVRE « Relance Dupont effectuée » => {"ordre":true}
  ⚠ OUVRE « Relance Dupont transmise » => {"ordre":true}
  ferme  « Devis Dupont expédié » => {"ordre":false}
  ferme  « Relance Dupont faite hier soir » => {"ordre":false}
  ferme  « Non merci » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Pas pour l’instant » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Ça peut attendre » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Négatif » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Ok je vois » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Ok compris » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Ah ok » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Ok ça marche merci » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Ouais bof » (après « Voulez-vous que je le relance ? ») => {"ordre":false}
  ferme  « Relance Dupont, sauf s’il a payé » => {"ordre":false}
  ferme  « Relance Dupont si besoin » => {"ordre":false}
  ferme  « Relance Dupont, enfin je crois » => {"ordre":false}
  total qui ouvrent => 11 / 31

── F. D2 : vrais ordres (✗ carte = un clic de plus)
  ouvre  « Relance ceux qui ne m’ont pas payé » => {"ordre":true}
  ouvre  « Relance les clients qui n’ont pas répondu » => {"ordre":true}
  ouvre  « Relance Dupont » => {"ordre":true}
  ouvre  « Oui » => {"ordre":true}
  ouvre  « Ok » => {"ordre":true}
  ouvre  « Oui vas-y » => {"ordre":true}
  ✗ carte « Ok ça marche » => {"ordre":false}
  ouvre  « Envoie le devis DEV-2026-0011 à Dupont » => {"ordre":true}
  ✗ carte « Refais le devis de Martin, chantier le 15/11, et envoie-le » => {"ordre":false}
  ouvre  « Relance les devis envoyés il y a plus de 5 jours » => {"ordre":true}
  ✗ carte « Relance tous ceux qui n’ont pas signé depuis le 15 octobre » => {"ordre":false}

── F. D2 : un geste §3.2 reste une carte même sur un ordre net (rejeu)
  jamaisAutomatique(marquer_facture_payee, creer_facture, creer_facture_libre, supprimer_devis_brouillon, augmenter_tarifs) => [true,true,true,true,true]
```

### Annexe D — sortie de `attaque-032-007-b.mjs` (code 0)

```
mots d’escalade par défaut de l’artisan : ["urgence","fuite","degat des eaux","inondation","gaz","assurance"]
« Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ? » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le robinet a fui toute la nuit » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Ça a fui sous l’évier » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le ballon commence à fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le robinet s’est mis à fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le toit continue de fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le joint va fuir » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le ballon fuira bientôt » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ? » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Le ballon perd de l’eau par le bas » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Ma chaudière perd de l’eau » => {"pilote_sujetEscalade":null,"reponse_seule_Signature_auto":"PART SEULE"}
« Mon ballon fuit » => {"pilote_sujetEscalade":"fuit","reponse_seule_Signature_auto":"escalade (fuit)"}
« J’ai une fuite » => {"pilote_sujetEscalade":"fuite","reponse_seule_Signature_auto":"escalade (fuite)"}
« Les tuyaux fuyaient » => {"pilote_sujetEscalade":"fuyaient","reponse_seule_Signature_auto":"escalade (fuyaient)"}
manqués => "11 / 14"
  avec « fui »/« fuy » en racine : « Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ? » => true
  avec « fui »/« fuy » en racine : « Le robinet a fui toute la nuit » => true
  avec « fui »/« fuy » en racine : « Ça a fui sous l’évier » => true
  avec « fui »/« fuy » en racine : « Le ballon commence à fuir » => true
  avec « fui »/« fuy » en racine : « Le robinet s’est mis à fuir » => true
  avec « fui »/« fuy » en racine : « Le toit continue de fuir » => true
  avec « fui »/« fuy » en racine : « Le joint va fuir » => true
  avec « fui »/« fuy » en racine : « Le ballon fuira bientôt » => true
  avec « fui »/« fuy » en racine : « Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ? » => false
  avec « fui »/« fuy » en racine : « Le ballon perd de l’eau par le bas » => false
  avec « fui »/« fuy » en racine : « Ma chaudière perd de l’eau » => false
  avec « fui »/« fuy » en racine : « Mon ballon fuit » => true
  avec « fui »/« fuy » en racine : « J’ai une fuite » => true
  avec « fui »/« fuy » en racine : « Les tuyaux fuyaient » => true
  avec « fui »/« fuy » en racine : « Fuir les ennuis » => true
  avec « fui »/« fuy » en racine : « Il a fui ses responsabilités » => true
  avec « fui »/« fuy » en racine : « Le fuyard » => true
  avec « fui »/« fuy » en racine : « Un fusible a grillé » => false
  avec « fui »/« fuy » en racine : « Une fuie (sic) » => true
```

### Annexe E — sortie du rejeu de `attaque-032-006.mjs` (code 0)

```
── A2. ajouter_tarif / modifier_tarif : seul un prix ÉCRIT par l’artisan entre
  ajouter_tarif — prix lu dans un autre devis, artisan sans prix => {"resume":"Le prix 450,00 € HT ne vient pas de ce que l'artisan t'a écr","ecrit_dans_prix_artisan":[]}
  ajouter_tarif — « ordre de grandeur » de l’assistant, artisan « ok » => {"resume":"Le prix 520,00 € HT ne vient pas de ce que l'artisan t'a écr","ecrit_dans_prix_artisan":[]}
  ajouter_tarif — artisan « 450 € HT » => {"resume":"tarif ajouté : 450,00 € HT","ecrit_dans_prix_artisan":[450]}
  ajouter_tarif — artisan « 450 € TTC », prix_ht converti (TVA 10 %) = 409,09 => {"resume":"tarif ajouté : 409,09 € HT","ecrit_dans_prix_artisan":[409.09]}
  ajouter_tarif — artisan « 450 € TTC », prix_ht = 450 (TTC pris pour HT) => {"resume":"Le prix 450,00 € HT ne vient pas de ce que l'artisan t'a écr","ecrit_dans_prix_artisan":[]}
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
  ≠ ATTENDU « 450 € TTC » => [375,409.09,426.54]
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
  ferme  « Relance Dupont le 15 » => {"ordre":false,"question":false}
  ferme  « Relance Dupont le 15 novembre » => {"ordre":false,"question":false}
  ferme  « Relance Dupont en décembre » => {"ordre":false,"question":false}
  ferme  « Envoie le devis à Dupont début janvier » => {"ordre":false,"question":false}
  ferme  « Relance Dupont mi-novembre » => {"ordre":false,"question":false}
  ferme  « Relance Dupont ce week-end » => {"ordre":false,"question":false}
  ferme  « Relance Dupont à la fin des travaux » => {"ordre":false,"question":false}
  ferme  « Relance Dupont à 18 h » => {"ordre":false,"question":false}
  ferme  « Relance Dupont dans la soirée » => {"ordre":false,"question":false}
  ferme  « Relance Dupont sous huitaine » => {"ordre":false,"question":false}
  ferme  « Envoie le devis à Dupont une fois signé » => {"ordre":false,"question":false}
  ferme  « Envoie le devis à Dupont dès réception des photos » => {"ordre":false,"question":false}
  ferme  « Relance Dupont à la Toussaint » => {"ordre":false,"question":false}
  ferme  « Relance Dupont au retour de Paul » => {"ordre":false,"question":false}
  ferme  « Relance Dupont ? Bof. » => {"ordre":false,"question":false}
  ferme  « Relance Dupont ? Mouais. » => {"ordre":false,"question":false}
  ferme  « Relance Dupont, nan » => {"ordre":false,"question":false}
  ferme  « Relance Dupont ? Euh… » => {"ordre":false,"question":false}
  ferme  « Ok noté » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false}
  ferme  « Bien noté » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false}
  ferme  « Noté, merci » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false}
  ferme  « Ok merci » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false}
  ferme  « Super merci » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false}
  ferme  « Top » (après « Voulez-vous que je le relance ? ») => {"ordre":false,"question":false}
  ferme  « Relance Dupont envoyé » => {"ordre":false,"question":false}
  ferme  « Facture Dupont payé » => {"ordre":false,"question":false}
  ferme  « Facture Dupont réglé » => {"ordre":false,"question":false}
  ferme  « Relance Dupont ok c’est parti » => {"ordre":false,"question":false}
  total qui ouvrent => 0 / 28

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
  ce que blocCadrage dit au modèle sur « Ok noté » après la proposition => - L'artisan parle d'une ACTION, mais son message n'est pas un ordre net (un report, une condition, une hésitation ou une négation) : rien ne s'exécute d'office. Un outil « à confirmer » que tu appelles PROPOSE une carte « Confirmer », qu'il valide d'un clic. Pour un report (« plus tard », « demain »), ne programme rien : dis-le, et propose la carte ou un rappel ; pour une condition, vérifie-la d'a

── D5. Sujets d’escalade (null = la ligne part seule ; mots par défaut de l’artisan inclus)
  « Mon robinet fuit » => fuit
  « Le ballon fuit depuis ce matin » => fuit
  « Ça fuit sous l’évier » => fuit
  « Le toit fuit quand il pleut » => fuit
  « Les canalisations fuient » => fuient
  « C’est urgent » => urgen
  « Très urgent svp » => urgen
  « Urgent : plus d’eau chaude » => urgen
  « Venez en urgence » => urgence
  « L’eau coule du plafond » => coule du
  « Ça goutte du plafond de la cuisine » => goutte du
  « Mon disjoncteur saute sans arrêt » => disjoncteur saute
  « Vous m’avez escroqué » => escroqu
  « Je vais me plaindre » => plaindre
  « Je veux des dommages et intérêts » => dommages et
  « Je vais contacter une association de consommateurs » => consommateur
  « Travail bâclé » => bâcl
  « C’est mal fait, je ne suis pas content » => mal fait
  « Je vais vous signaler à la répression des fraudes » => fraude
  « J’ai pris un avocat » => avocat
  manqués => 0 / 20

── D5. Ce qui part, par la réponse seule (Signature, mode « auto ») et par le pilote
  decisionReponse « Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ? » => {"ok":false,"raison":"escalade","mot":"fuit","comportement":"silence"}
  decisionReponse « Fuite sous l’évier » => {"ok":false,"raison":"escalade","mot":"fuite","comportement":"silence"}
  decisionReponse « C’est urgent, plus de chauffage » => {"ok":false,"raison":"escalade","mot":"urgen","comportement":"silence"}
  decisionReponse « Urgence : plus de chauffage » => {"ok":false,"raison":"escalade","mot":"urgence","comportement":"silence"}
  pilote : sujetEscalade(10 derniers messages, mots par défaut) sur « mon ballon fuit » => fuit

── D5. Faux positifs (non null = à la main ; côté sûr)
  « Ma fille fuit les devis trop chers » => fuit
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
  Signature, « Litige … mon avocat » puis réponse de l’artisan à la main, sans prise en main => {"statut":200,"sent":0,"prepared":0,"skipped":1,"emails_partis":[]}
  Signature, même fil, et l’artisan a cliqué « Escalader » (prise_en_main = true, urgence) => {"statut":200,"sent":0,"prepared":0,"skipped":1,"emails_partis":[]}
  témoin Studio, même fil : la relance est proposée, pas envoyée => {"statut":200,"sent":0,"prepared":0,"skipped":1,"emails_partis":[]}
  le cron lit-il prise_en_main ou sujetEscalade ? (grep dans le source) => true
  repondreServeur (réponse à la main) réarme-t-il les relances ? (source) => true
```

### Annexe F — la seule ligne qui change dans les rejeux de 032-004 et 032-005 (`diff` contre les sorties de 032-006)

```diff
< « Refais pour M. Essai le devis de Martin, chantier le 15/11, et envoie-le » (date 15/11, ligne estimée à 15 €) => {"source_prix":"prix repris d’une donnée, à vérifier","prixSources":false,"faitToutSeul":true}
> « Refais pour M. Essai le devis de Martin, chantier le 15/11, et envoie-le » (date 15/11, ligne estimée à 15 €) => {"source_prix":"prix repris d’une donnée, à vérifier","prixSources":false,"faitToutSeul":false}
```

Les trois rejeux sortent en code 0 ; le `diff` (avertissements de Node écartés) ne montre aucune autre différence.
