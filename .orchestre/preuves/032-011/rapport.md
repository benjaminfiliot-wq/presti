# 032-011 — septième audit offensif : le correctif E4 seul (chantier 4, lots L1 et L2), 02/11/2026

Auditeur : Claude Code (claude-code), en attaquant, sur le serveur Oracle (`/home/usine/Documents/presti`). Je n'ai écrit ni le lot, ni
ses correctifs, ni les six audits d'avant.

J'ai travaillé en lecture seule : rien n'a changé hors de `.orchestre/preuves/032-011/`. Je n'ai créé aucun compte de test et je n'ai joué
aucune suite contre la production. Je n'ai fait ni appel réseau vers Presti, ni build, ni typecheck, ni commit, ni migration, et je n'ai lu
aucun secret. Je n'ai rien écrit dans le vault.

**Réseau neuronal.** `regles_pour` (« assistant, pilote, relances, escalade : audit du correctif perte d'eau dans sujetEscalade ») rend
`[]`. `chercher` (« escalade sujetEscalade perte d'eau fuite pilote relances faux positifs ») renvoie au plan, §3 S3 : le plancher compte
« fuite », un plombier en Signature verra ses réponses « fuite » revenir à la main, et le lexique par métier attend la vague 2. Il renvoie
aussi au rapport L1-L2. J'ai lu :
- le sixième audit (`.orchestre/preuves/032-008/rapport.md` : E4, M1, M2, « Points à valider », annexes A à D) ;
- le prompt de Benj (`plans/011-cadrage-01-11/prompts-benj/p3-assistant.md:552-553`, §3.2 : « parler au nom de l'artisan sur un sujet
  d'escalade (litige, sinistre, « fuite », menace, avocat) » ne s'automatise jamais) ;
- le plan (`chantier-4-assistant-plan.md` §0, l.16-44 ; §3 S3, l.341-351 ; §13, l.745-761) ;
- le classement de 032-007 : paraphrase standard « perd de l'eau » en élevé (`032-007/rapport.md:88-90`), synonymes en moyen (`:146-152`).

**Le correctif éprouvé** (`git diff -w --ignore-cr-at-eol -- lib/pilote/regles.ts` ; l'arbre est en fins de ligne LF, `HEAD` en CRLF,
d'où un diff brut de tout le fichier) :
- `'refui', 'refuy'` ajoutés à `MOTS_ESCALADE_TOUJOURS` (`lib/pilote/regles.ts:162-163`) ;
- `PERTE_D_EAU = / (?:perd|pert)[a-z]*(?: [a-z]+){0,3}? (?:d |de l |de |l |d l )?l?eaux? /` (`:183`), testé dans `sujetEscalade` après les
  deux listes (`:197`) ;
- dans `scripts/securite-assistant-0211-qa.mjs` : les essais C6l et C6m, le mutant de C6l et celui de C6j (diff de 19 lignes).

**Le banc.** Il rejoue sur leur vrai code les trois chemins qui lisent l'escalade, comme l'annexe A de 032-008, dont il reprend le banc
tel quel :
- le **pilote** : la vraie dépendance `escalade` de `dependancesSupabase()` (`lib/pilote/executeur.ts:239`) ;
- la **réponse seule en Signature « auto »** : `decisionReponse`, qui appelle `sujetEscalade` (`lib/plateformeConfig.ts:180`) ;
- le **cron des relances** : le vrai `GET` de `app/api/cron/relances/route.ts`, avec `sujetDuFil` réel (`:139`, `lib/relances.ts:11-15`).

`fetch` est doublé (toute adresse autre que la base factice lève), `sendEmail` aussi, et toutes les données sont inventées. Les scripts
sont dans `/tmp/attaque-032-011/`, hors du dépôt ; leur code est en annexe.

VERDICT : NE TIENT PAS

**Pourquoi.** Le correctif E4 tient **sur sa cible** : les 12 formes de 032-008 (E4, M1, M2) et la phrase type d'E4 sont repérées sur les
trois chemins (0 sur 13 passent). Mais la classe qui devait fermer la famille « perdre … eau » a deux bornes qu'un message ordinaire franchit
sans effort :
- les mots glissés sont `[a-z]+`, donc **un chiffre rompt la classe** (« perd **2 litres** d'eau ») ;
- **au-delà de trois mots glissés, plus rien n'est repéré** (« perd **de plus en plus** d'eau », « perd **un tout petit peu** d'eau »).

Ces phrases font partir la parole sans clic sur les trois chemins. C'est **E5 (élevé)**, le défaut même d'E4 et d'E3 : on ferme une forme,
la forme voisine de la même famille passe.

**E5 (élevé)** : 10 formes de la famille sur 16 essayées passent sur les trois chemins, dont « Le ballon perd 2 litres d'eau par jour »,
« Mon chauffe-eau perd 1 litre d'eau par nuit », « Le ballon perd de plus en plus d'eau », « Le ballon perd un tout petit peu d'eau » et
« Le ballon perd quand même pas mal d'eau ». La réponse part seule en Signature « auto », le pilote laisse partir, et le cron envoie la
relance (`"sent":1`).

Je range E5 en élevé par la règle du verdict telle qu'elle est écrite, et par le précédent tel qu'il a été appliqué :
- 032-007 a rangé « perd de l'eau » en élevé : c'est la façon standard de dire qu'un appareil fuit (`032-007/rapport.md:88-90`) ;
- 032-008 y a joint ses formes ordinaires, conjuguées ou entrecoupées (« perd beaucoup d'eau ») : c'est E4 ;
- la session principale a suivi les deux en corrigeant.

« Perd de plus en plus d'eau » et « perd 2 litres d'eau par jour » sont aussi banales que « perd beaucoup d'eau ». Chiffrer la perte est
même la manière ordinaire d'un client de décrire une fuite de ballon. Je n'abaisse pas E5 pour faire « tenir » le correctif. Si Benj ou la
session principale écrivent que toute la famille « perdre de l'eau » est moyenne (032-008, « Points à valider », point 2), E5 devient moyen,
et rien d'autre dans ce rapport n'est élevé.

Le correctif d'E5 est court et ne fait que restreindre. Je l'ai joué sur une copie (section 6) : il ferme 25 formes sur 25 et prend moins
de faux positifs que la classe actuelle (10 sur 30 au lieu de 13).

## Bilan

| # | Point éprouvé | Verdict | Preuve |
|---|---|---|---|
| 1 | les 12 formes d'E4, M1, M2 de 032-008 et la phrase type d'E4, sur les trois chemins | **tient** : 0 / 13 passent | section 1 |
| 2a | **la famille d'E4 : chiffres et plus de trois mots glissés** | **E5 (élevé)** : 10 / 16 passent | section 2a |
| 2b | fautes courantes : « perd deau » (collé) | moyen (M3) ; « pers », « per », « de l'o » : faible (F4) | section 2b |
| 2c | « eau » avant le verbe, autres verbes de fuite (« s'échappe », « s'écoule », « ruisselle », « sort », « lâche », « se vide »…) | moyen (M4), rangé comme les synonymes de 032-007 | section 2c |
| 3 | faux positifs ouverts par la classe | 13 / 30 sur un corpus de pièges ; coût : relance annulée sans un mot à l'artisan (0 e-mail) ; faible (F5) | section 3 |
| 4 | `FAUSSE_URGENCE` masque-t-elle une perte d'eau ? | **non** sur les 9 tournures ordinaires (« pas urgent mais le ballon a perdu de l'eau » tient) ; **oui** sur 3 incises (« perd, sans dégât, de l'eau ») : moyen (M5) | section 4 |
| 5 | mutants de la suite | C6l rougit sur 5 mutants dont celui de la suite ; C6m rougit sur 2 mutants trop larges, que la suite ne joue pas ; M2 (`refui`) sans mutant dans la suite : faible (F6) | section 5 |
| — | les trois chemins disent-ils la même chose ? | **oui** : 0 écart sur 72 phrases | section 1 |
| — | suite `securite-assistant-0211-qa` (commande `verifier`) | `140 PASS, 0 FAIL`, code 0 | section 7 |

## 1. Les formes d'E4, M1 et M2 tiennent sur les trois chemins

Sortie de `attaque-032-011.mjs` (code 0), extrait. Le témoin « Merci, à bientôt » **doit** passer : il prouve que le banc sait rougir.

```
⚠ PASSE « Merci, à bientôt » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}     ← témoin
tient   « J’ai une fuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
« Le ballon a perdu de l’eau » dans la DEMANDE d’origine seulement (leads.message), cron => annulée (skipped 1, envoyee=true)
tient   « Le ballon a perdu de l’eau cette nuit » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
tient   « Il y a des pertes d’eau » => {"sujet":"perte d’eau",…}      tient « mon chauffe-eau perd de leau » => {"sujet":"perte d’eau",…}
tient   « Le robinet refuit depuis votre passage » => {"sujet":"refui",…}      tient « Ça refuit » => {"sujet":"refui",…}
passent => 0 / 13
```

Sur les 72 phrases jouées sur les trois chemins (sections 1, 2 et 4), **aucun écart** : pour chacune, le pilote, la réponse seule et le cron
rendent le même sort. Le décompte est fait sur la sortie : `awk` compte 0 ou 3 « PART SEULE » par ligne, jamais 1 ou 2.

## 2. Ce que la classe manque encore

### 2a. E5 (élevé) — la famille d'E4 : un chiffre, ou plus de trois mots glissés

```
⚠ PASSE « Le ballon perd 2 litres d’eau par jour » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Mon chauffe-eau perd 1 litre d’eau par nuit » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd environ 5L d’eau par jour » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd 1 peu d’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd de plus en plus d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd un tout petit peu d’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd depuis hier soir beaucoup d’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « La chaudière perd depuis 2 jours de l’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd quand même pas mal d’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « Mon ballon perd chaque jour un peu d’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
tient « Mon ballon perd encore un peu d’eau » ; « Le cumulus perd toujours un peu d’eau » ; « Le ballon perd des litres d’eau » ;
      « Le ballon perd vraiment beaucoup trop d’eau » ; « Le ballon perd depuis hier soir de l’eau » ; « Mon ballon perd plusieurs litres d’eau »
passent => 10 / 16
```

- **Mécanisme.** `enMots` réduit le message à des minuscules sans accents, séparées par une espace, chiffres gardés
  (`lib/pilote/regles.ts:174`). Après `perd…` ou `pert…`, la classe admet `(?: [a-z]+){0,3}?` : au plus trois mots, **de lettres seules**.
  Puis vient un connecteur facultatif et `l?eaux?` (`:183`).
  - Un chiffre (`2`, `1`, `5l`) n'est pas `[a-z]+` : la classe s'arrête net devant « 2 litres ».
  - Avec quatre mots ou plus (« de plus en plus », « un tout petit peu », « quand même pas mal », « chaque jour un peu »), la fenêtre est
    épuisée avant `d eau`. Le connecteur ne rattrape qu'un `d`, `de`, `de l` ou `l` collé à « eau ».
  - Aucune des deux listes ni les mots par défaut de l'artisan (`urgence, fuite, dégât des eaux, inondation, gaz, assurance`) ne lisent
    « eau » seul. Rien d'autre ne rattrape la phrase.
- **Pourquoi c'est élevé.** La règle du verdict pose trois conditions, et « Mon ballon perd de plus en plus d'eau, pouvez-vous passer ? »
  les remplit toutes :
  - le message est ordinaire, écrit sans effort ;
  - la parole part sans clic : la sortie la montre partir sur les trois chemins ;
  - le sujet est d'escalade : c'est une fuite, que le §3.2 nomme.

  La famille est celle qu'E4 a rangée en élevé, et le correctif lui-même se donne pour but de la fermer (« toute forme de « perdre » …
  suivie à trois mots au plus de « eau » », commentaire `:180-182`). La borne de trois mots n'était qu'un choix de 032-008. Je ne la tiens
  pas pour une limite de la langue : « de plus en plus » en a quatre.
- **Antériorité.** Ces formes passaient déjà avant le correctif, qui ne les aggrave pas. Mais il les visait, et il ne les ferme pas.
- **Correctif proposé (V2, section 6).**

  `/ (?:perd[a-z]*|pert|pertes?)(?: (?!chauffe )[a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? /`

  Il porte quatre changements :
  - les chiffres sont admis dans les mots glissés ;
  - la fenêtre passe de trois à cinq mots ;
  - `d?l?eau` couvre « deau » (M3) ;
  - `pert` ne vaut plus que seul (la faute « il pert ») ou en « perte(s) », ce qui écarte « pertinent » et « perturbation », et « chauffe »
    ne compte pas comme mot glissé, ce qui écarte « chauffe-eau ».

  On y joint `.replace(/ {2,}/g, ' ')` après `FAUSSE_URGENCE`, pour M5 (`:194`).

  Sur une copie, V2 ferme **25 formes sur 25** (la famille, C6l, M3 et M5). Il ne prend que **10 faux positifs sur 30** au lieu de 13, et
  aucun des 8 messages de C6m. Il faut un essai C6n et son mutant : les formes chiffrées et longues doivent rendre `escalade`, et la classe
  actuelle remise en place doit en laisser passer au moins une.

### 2b. Fautes courantes

```
⚠ PASSE « Mon ballon perd deau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « Mon ballon pers de l’eau » / « Mon ballon per de l’eau » / « Le ballon perd de l’o » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
tient « perd de l eau », « pert de l’eau », « perds de l’eau », « perd de l’eaux », « a perdue de l’eau », « perd de leaux », « perd dl’eau »
passent => 4 / 11
```

- **M3 (moyen)** : « perd deau ». C'est M1 de 032-008 (« perd de leau ») dans l'autre sens : l'apostrophe tombe et le « d » se colle à
  « eau ». Cette écriture de SMS est aussi courante que « de leau ». Je la range en moyen, comme M1. Correctif : `d?l?eaux?` (dans V2).
- **F4 (faible)** : « pers », « per », « de l'o ». Ces formes sont rares, et « per » (sans « d ») ouvrirait « permis », « personne »… Je
  n'ajoute rien.

### 2c. M4 (moyen) — « eau » avant le verbe, et les autres verbes de fuite

```
⚠ PASSE « De l’eau se perd sous le ballon » ; « Le chauffe-eau perd » ; « Mon chauffe-eau perd, pouvez-vous passer ? »
⚠ PASSE « L’eau s’échappe du ballon » ; « L’eau s’écoule sous l’évier » ; « De l’eau ruisselle le long du mur » ; « Ça ruisselle sous l’évier »
⚠ PASSE « Il y a de l’eau qui sort du ballon » ; « De l’eau sort du groupe de sécurité » ; « J’ai de l’eau sous l’évier »
⚠ PASSE « Le ballon lâche de l’eau » ; « Le ballon crache de l’eau » ; « Le ballon pisse de l’eau » ; « Le ballon se vide tout seul »
⚠ PASSE « Le radiateur perd du liquide » ; « Le plafond est humide »
tient « Ça suinte au plafond » => suinte ; « Le robinet goutte » => goutte
passent => 16 / 18     (toutes sur les trois chemins : la sortie complète est en annexe C)
```

- **Pourquoi moyen et non élevé.** Ce ne sont pas des formes de « perdre de l'eau » : ce sont des **synonymes** de la fuite. 032-006 et
  032-007 ont rangé les synonymes en moyen (« le robinet goutte », « ça suinte », « l'eau coule le long du mur » : `032-007/rapport.md:146-152`).
  Le plan renvoie le lexique par métier à la vague 2 (§3 S3, l.347-349). Je suis ce classement, mais je dis où il est fragile :
  - « Il y a de l'eau qui sort du ballon » et « Mon chauffe-eau perd » (verbe sans complément, très parlé) sont aussi ordinaires que
    « perd beaucoup d'eau » ;
  - si Benj juge que la règle du verdict vaut pour tout synonyme courant de « fuite », ces deux formes-là deviennent élevées.
- **« Eau » avant le verbe** (« de l'eau se perd », « l'eau s'échappe ») : la classe ne lit que « perdre … eau », dans cet ordre.
- **Correctif possible**, pour le lot 032-009 (les synonymes de 032-007 y sont déjà) :
  - ajouter `s echapp`, `s ecoul`, `ruissel`, `eau qui sort`, `eau sort`, `lache de l eau`, `crache de l eau`, `se vide tout seul` ;
  - ajouter un motif « eau … (sort|coule|s'échappe|s'écoule|se perd) » ;
  - pour « chauffe-eau perd » en fin de phrase ou devant une virgule : `/ (?:chauffe eau|ballon|cumulus|radiateur|robinet) perd(?:ait|ent)?(?: [a-z]+)? (?:pouvez|depuis|$)/`.
    Ce motif est à mesurer sur un corpus : il n'est pas joué ici.

## 3. Faux positifs de la classe, et leur coût réel

J'ai écrit pour cet audit un corpus fictif de 30 demandes d'un plombier-chauffagiste. Il est volontairement piégeux : chaque demande contient
« perdre », « perte », « pertinent », « perturbation » ou « eau ». La colonne « classe seule » compare avec une copie de la règle sans la
ligne `PERTE_D_EAU`.

```
« J’ai perdu ma facture d’eau » => perte d’eau   ← pris par PERTE_D_EAU seule
« J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ? » => perte d’eau   ← pris par PERTE_D_EAU seule
« J’ai perdu la notice chauffe-eau » => perte d’eau ← classe        « J’ai perdu la notice du chauffe-eau » => part seule
« Perte de pression chauffe-eau » => perte d’eau ← classe            « Perte de pression sur le chauffe-eau » => part seule
« Pertinent, ce chauffe-eau thermodynamique ? » => perte d’eau ← classe ; « Perturbation de l’eau chaude le matin » => perte d’eau ← classe
« Le ballon perd l’eau chaude au bout de 5 minutes » => perte d’eau ← classe ; « Mon ballon perd sa chaleur, l’eau est tiède » => perte d’eau ← classe
« Je ne voudrais pas perdre l’eau chaude pendant les travaux » => perte d’eau ← classe
« La chaudière perd de la pression », « J’ai perdu votre devis… », « Je voudrais réduire mes pertes de chaleur », « Perte de garantie sur chauffe-eau ? » => part seule
pris par la classe seule => 13 / 30
coût réel sur le cron (Signature) :
  « J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ? » (dans la demande) => annulée (skipped 1, envoyee=true) ; e-mails envoyés par le cron (artisan compris) : 0
  « Perte de pression chauffe-eau » (dans la demande) => annulée (skipped 1, envoyee=true) ; e-mails envoyés par le cron (artisan compris) : 0
```

- **F5 (faible), coût réel.** Une demande ordinaire prise par la classe perd ses trois relances (J+2, J+5, J+10) : le cron les marque
  `envoyee: true` sans un mot à l'artisan, et sa sortie compte 0 e-mail (`app/api/cron/relances/route.ts:139-144`). La réponse seule
  n'est pas envoyée non plus : l'artisan doit répondre à la main. C'est le défaut faible de 032-007 (« Faibles », point 2) et de 032-008
  (section 5), dont la nature est inchangée ; la classe en ajoute de nouvelles portes.
- Trois de ces portes viennent de la forme de la classe, pas du sens :
  - `pert[a-z]*` lit « **pert**inent » et « **pert**urbation » ;
  - « chauffe-eau » donne un `eau` en mot entier (`chauffe eau`), qu'une demande sur deux d'un chauffagiste contient ;
  - la fenêtre de trois mots rend le sort de deux phrases presque identiques opposé (« la notice chauffe-eau » est prise, « la notice
    **du** chauffe-eau » ne l'est pas).
- Le correctif V2 (section 6) traite les deux premières portes. Il ramène les faux positifs à 10 sur 30, malgré une fenêtre plus large. Ceux
  qui restent (« facture d'eau », « perd l'eau chaude », « point d'eau ») sont du côté sûr. Le vrai remède reste celui de 032-007 : une
  relance annulée doit devenir une proposition notifiée à l'artisan. Il est déjà au lot 032-009.

## 4. `FAUSSE_URGENCE` face à « perdre … eau »

```
tient « pas urgent mais le ballon a perdu de l’eau » => perte d’eau      tient « Pas urgent mais le ballon a perdu de l’eau » => perte d’eau
tient « Pas d’urgence, le ballon perd un peu d’eau » ; « Sans dégât, le cumulus perdait de l’eau » ; « Aucune urgence : des pertes d’eau au compteur »
tient « Rien d’urgent, la chaudière perd beaucoup d’eau » ; « Pas urgentissime : le ballon perd de leau » ; « Pas de dégâts mais le ballon a perdu de l’eau »
tient « Le ballon a perdu de l’eau, pas d’urgence »
⚠ PASSE « Le ballon perd, sans dégât, de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd (rien d’urgent) un peu d’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le cumulus a perdu, pas urgent, un peu d’eau » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
passent => 3 / 12
```

- **Le cas que la tâche nomme tient.** « Pas urgent mais le ballon a perdu de l'eau » est repéré sur les trois chemins. Tant que la négation
  est avant ou après la perte, `FAUSSE_URGENCE` n'efface que son morceau et la classe lit la suite.
- **M5 (moyen) — l'incise.** Placée **entre** le verbe et « eau », la fausse urgence masque la perte. `FAUSSE_URGENCE` est remplacée par
  une espace (`lib/pilote/regles.ts:194`). Le morceau effacé commençait déjà par une espace, et une autre le suit : il reste **deux** espaces.
  Or la classe exige une espace unique entre les mots (`(?: [a-z]+)`, puis ` (?:d |…)`) : « perd␣␣un peu d eau » ne la satisfait plus.
  L'incise n'est pas la tournure courante, d'où le moyen. Mais c'est bien `FAUSSE_URGENCE` qui masque une perte d'eau.
  Correctif : `.replace(FAUSSE_URGENCE, ' ').replace(/ {2,}/g, ' ')`, joué dans V2 (section 6) : les 3 phrases sont repérées.

## 5. Les mutants de la suite

Lu dans la suite (`scripts/securite-assistant-0211-qa.mjs`, diff) :
- **C6l** joue les 12 formes de 032-008 sur `sujetEscalade` (sans mots d'artisan) et `decisionReponse` en Signature « auto ».
- **C6m** joue 8 messages ordinaires, qui ne doivent pas escalader.
- **C6l MUTANT** retire la ligne `if (PERTE_D_EAU.test(mots))…`. Il vérifie que « Le ballon a perdu de l'eau cette nuit » passe alors,
  et qu'il est repéré sur l'original.
- **C6j MUTANT** remet la ligne du quatrième audit, et vérifie que « Le robinet a fui toute la nuit » passe.

`copie` lève si le motif est introuvable (« motif introuvable », l.141 de la suite) : un mutant qui ne s'applique plus fait rougir la suite,
il ne se tait pas. J'ai rejoué l'assertion de C6l, et celle de C6m, sur des mutants plus fins (copies hors du dépôt) :

```
original, essai C6l => {"vert":true,"rates":[]}
mutant de la suite (la ligne PERTE_D_EAU retirée), essai C6l => {"vert":false,"rates":[…10 formes…]}
mutant « refui, refuy » retirés (M2), essai C6l => {"vert":false,"rates":["Le robinet refuit depuis votre passage","Ça refuit"]}
mutant « l? » ôté (M1, « de leau »), essai C6l => {"vert":false,"rates":["mon chauffe-eau perd de leau"]}
mutant « aucun mot glissé » ({0,3} ôté), essai C6l => {"vert":false,"rates":["Mon ballon perd beaucoup d’eau",…4 formes]}
mutant « pert » ôté (« des pertes d’eau »), essai C6l => {"vert":false,"rates":["Il y a des pertes d’eau"]}
mutant trop large (tout « perd »/« pert »), essai C6m (faux positifs) => 7 pris sur 8 (C6m doit rougir)
mutant « refu » (trop court), essai C6m => ["Refuge pour chats : devis de clôture"]
```

- **C6l sait rougir**, sur chacun des cinq mutants, y compris les plus fins (un seul caractère `l?`, ou `pert` ôté).
- **C6m sait rougir**, sur un mutant trop large et sur un lexique trop court.
- **F6 (faible, couverture des essais).** La suite ne joue qu'un mutant de C6l : la ligne entière retirée, essayée sur une seule phrase.
  - Aucun mutant ne vise M2 (`'refui', 'refuy'`) : leur retrait n'est vu que par C6l, ce qui suffit aujourd'hui, mais aucune preuve écrite
    ne le dit.
  - Aucun mutant ne prouve que C6m peut rougir.
  - Ni C6l ni C6m ne jouent le pilote ni le cron. C'est F3 de 032-008, déjà au lot 032-009 : je ne le recopie pas.

  Correctif : un mutant `refu` pour C6m, et un mutant « `refui`, `refuy` retirés » pour C6l. Et, avec E5, l'essai C6n et son mutant
  (section 2a).

## 6. Le correctif proposé, joué sur une copie

Sortie de `proposition.mjs` (code 0). Chaque variante est une copie de `lib/pilote/regles.ts` dans un dossier temporaire, effacé à la fin.
Elle est jouée sur les 25 formes de la famille (2a, C6l, M3, M5) et sur les 30 pièges de la section 3.

```
aujourd’hui (arbre) => famille d’E4 qui passe : 14 / 25 [« perd 2 litres d’eau par jour », « perd de plus en plus d’eau », … « perd deau », les 3 incises]
   faux positifs de la classe : 13 / 30 ; C6m pris : 0
V1 (fenêtre 5, chiffres, deau, espaces resserrées) => famille d’E4 qui passe : 0 / 25 []
   faux positifs de la classe : 21 / 30 ; C6m pris : 0
V2 (V1 + pert, perte(s) seuls + chauffe-eau exclu) => famille d’E4 qui passe : 0 / 25 []
   faux positifs de la classe : 10 / 30 [« facture d’eau » ×2, « perte de temps et d’eau », « pertes de charge du ballon d’eau chaude »,
     « perte de pression ballon d’eau chaude », « perd l’eau chaude », « perd sa chaleur, l’eau est tiède », « perdre de temps : eau chaude »,
     « perdu du temps avec le point d’eau », « perdre l’eau chaude pendant les travaux »] ; C6m pris : 0
```

V1 (élargir seulement) ferme la famille mais coûte 8 faux positifs de plus. V2 la ferme aussi et en coûte 3 de moins qu'aujourd'hui. Je
recommande V2 :

```ts
const PERTE_D_EAU = / (?:perd[a-z]*|pert|pertes?)(?: (?!chauffe )[a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? /
// et, ligne 194 :
const mots = enMots(brut).replace(FAUSSE_URGENCE, ' ').replace(/ {2,}/g, ' ')
```

La regex reste bornée : la fenêtre a cinq mots au plus, sans quantificateur imbriqué non borné. Il n'y a pas de retour arrière explosif à
craindre sur les 10 messages relus.

## 7. La suite, jouée seule (02/11, hors ligne, Oracle)

| Suite | Sortie (dernière ligne) | Code |
|---|---|---|
| `securite-assistant-0211-qa` | `140 PASS, 0 FAIL` (dont `PASS C6l les 12 formes de 032-008 …`, `PASS C6m …`, `PASS C6l MUTANT …`, `PASS C6j MUTANT …`) | 0 |

Je n'ai joué qu'une suite, celle de la commande `verifier`, et jamais en même temps qu'un de mes scripts. La suite est verte parce qu'elle
ne regarde pas E5 : aucune de ses phrases ne porte un chiffre ni plus de trois mots entre « perd » et « eau ».

## Défauts restants, par gravité

| # | Gravité | Défaut | Correctif |
|---|---|---|---|
| E5 | **élevé** | la famille d'E4 passe sur les trois chemins avec un chiffre (« perd 2 litres d'eau ») ou plus de trois mots glissés (« perd de plus en plus d'eau ») : 10 / 16 | V2 (section 6), avec un essai C6n et son mutant |
| M3 | moyen | « perd deau » (d collé) | `d?l?eaux?` (dans V2) |
| M4 | moyen | « eau » avant le verbe, et les synonymes « s'échappe », « s'écoule », « ruisselle », « eau qui sort », « lâche/crache de l'eau », « se vide », « chauffe-eau perd » sans complément : 16 / 18 | racines et motif de la section 2c, au lot 032-009, avec les synonymes de 032-007 |
| M5 | moyen | une fausse urgence en incise (« perd, sans dégât, de l'eau ») laisse deux espaces qui rompent la classe | `.replace(/ {2,}/g, ' ')` après `FAUSSE_URGENCE` (dans V2) |
| F4 | faible | « pers », « per », « de l'o » | aucun (« per » ouvrirait trop) |
| F5 | faible | 13 faux positifs sur 30 pièges (« pertinent », « perturbation », « notice chauffe-eau », « facture d'eau ») : relance annulée sans un mot à l'artisan | V2 en ôte 3 ; le remède de fond (relance annulée → proposition notifiée) est au lot 032-009 |
| F6 | faible | la suite ne joue aucun mutant de M2 ni de C6m | un mutant `refu` pour C6m, un mutant « `refui`, `refuy` retirés » pour C6l |

## Points à valider (session principale, Benj)

1. **E5, avant de dire « E4 fermé »** : remplacer `PERTE_D_EAU` par V2 et resserrer les espaces après `FAUSSE_URGENCE` (section 6). Ajouter
   l'essai C6n (au moins « perd 2 litres d'eau par jour », « perd de plus en plus d'eau », « perd un tout petit peu d'eau », « perd deau »,
   « perd, sans dégât, de l'eau ») et son mutant, la classe actuelle remise en place. Ajouter à C6m « Est-ce pertinent… », « Perturbation de
   l'eau chaude » et « la notice chauffe-eau ». La correction ne fait que restreindre.
2. Si Benj range toute la famille « perdre de l'eau » en moyen, ce que 032-007 permettait pour la forme de base et que 032-008 a redit, il
   doit l'écrire. Ce rapport n'a alors plus de défaut élevé.
3. M4 dépend du même jugement. Si tout synonyme courant de « fuite » doit être élevé, « il y a de l'eau qui sort du ballon » et « mon
   chauffe-eau perd » le deviennent, et le lexique par métier ne peut plus attendre la vague 2.
4. Le reste tient : E4, M1 et M2 sur leur cible, les trois chemins alignés, et `FAUSSE_URGENCE` hors incise. Après le correctif d'E5, un
   audit distinct sur E5 seul suffit.

## Annexes — les scripts d'attaque (hors dépôt) et leurs sorties

Dossier : `/tmp/attaque-032-011/`, sur le serveur Oracle. Les scripts se lancent depuis la racine du dépôt :
`node --experimental-strip-types --import ./scripts/ts-loader.mjs <script>`. Ils ne lisent aucun secret : les clés d'essai sont
inventées et `RESEND_API_KEY` est ôtée. Ils ne touchent pas au réseau. Leurs copies vont dans un dossier `mkdtemp`, effacé en fin de
passage. `attaque-032-011.mjs` reprend tel quel le banc de l'annexe A de 032-008 (doublure PostgREST, copies, trois chemins) et y ajoute
les séries de cet audit. `sonde.mjs`, une première sonde sur `sujetEscalade` seul, a servi à choisir les phrases ; ses résultats sont tous
rejoués dans `attaque-032-011.mjs`.

### Annexe A — `attaque-032-011.mjs`

```js
#!/usr/bin/env node
// Septième audit 032-011 : le correctif E4 seul (« perdre … eau », « refuit »), rejoué en attaquant sur les TROIS chemins qui lisent
// l'escalade : le pilote (vraie dépendance `escalade` de lib/pilote/executeur.ts), la réponse seule en Signature « auto »
// (decisionReponse, lib/plateformeConfig.ts) et le cron des relances (vrai GET de app/api/cron/relances/route.ts, sujetDuFil réel).
// Lecture seule : aucun réseau (fetch doublé, toute autre adresse lève), aucune base réelle, aucun modèle, aucun e-mail. Données inventées.
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs <ce fichier>     (depuis C:/Users/benja/Documents/presti)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'
register(`data:text/javascript,${encodeURIComponent("export async function resolve(spec, ctx, next) { if (spec.startsWith('next/') && !spec.slice(5).includes('.') && !spec.slice(5).includes('/')) return next(spec + '.js', ctx); return next(spec, ctx) }")}`)
process.removeAllListeners('warning'); process.on('warning', () => {})
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

// ── Doublure de PostgREST (celle de 032-007, annexe A)
const T = {}
const PANNE = {}
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
  if (url.pathname.startsWith('/rest/v1/rpc/')) return rep(true)
  const table = url.pathname.slice('/rest/v1/'.length)
  if (PANNE[table] && (methode === 'GET' || methode === 'HEAD')) return rep({ code: PANNE[table], message: 'panne simulée' }, 500)
  const lignes = (T[table] ??= [])
  const params = [...url.searchParams].filter(([k]) => !ORDRE.has(k))
  const corps = init.body ? JSON.parse(init.body) : null
  if (methode === 'GET' || methode === 'HEAD') {
    let r = lignes.filter((l) => params.every(([k, v]) => k === 'or' || cond(l[k], v)))
    const ord = url.searchParams.get('order')
    if (ord) { const [champ, sens] = ord.split('.'); r = [...r].sort((a, b) => (String(a[champ]) < String(b[champ]) ? -1 : String(a[champ]) > String(b[champ]) ? 1 : 0) * (sens === 'desc' ? -1 : 1)) }
    if (methode === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `0-0/${r.length}` } })
    const lim = url.searchParams.get('limit'); if (lim) r = r.slice(0, Number(lim))
    if (String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object')) return r.length === 1 ? rep(r[0]) : r.length === 0 ? rep(null) : rep({ code: 'PGRST116', message: 'no rows' }, 406)
    return rep(r)
  }
  if (methode === 'PATCH') { const t = lignes.filter((l) => params.every(([k, v]) => cond(l[k], v))); for (const l of t) Object.assign(l, corps); return rep(t) }
  if (methode === 'POST') { const ajout = []; for (const n of Array.isArray(corps) ? corps : [corps]) { const l = { id: id(7000 + lignes.length), ...n }; lignes.push(l); ajout.push(l) } return rep(String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object') ? ajout[0] : ajout) }
  return rep([])
}
const vider = () => { for (const k of Object.keys(T)) delete T[k]; for (const k of Object.keys(PANNE)) delete PANNE[k] }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-attaque-032-011-'))
let nCopies = 0
async function copie(rel, { doublures = {}, remplacer = [] } = {}) {
  let code = fs.readFileSync(path.join(RACINE, rel), 'utf8')
  for (const [avant, apres] of remplacer) { if (!code.includes(avant)) throw new Error(`motif introuvable dans ${rel} : ${avant.slice(0, 60)}`); code = code.replace(avant, apres) }
  for (const [spec, contenu] of Object.entries(doublures)) {
    if (!code.includes(`from '${spec}'`)) throw new Error(`import introuvable dans ${rel} : ${spec}`)
    const f = path.join(TMP, `doublure-${++nCopies}.ts`); fs.writeFileSync(f, contenu)
    code = code.split(`from '${spec}'`).join(`from '${pathToFileURL(f).href}'`)
  }
  const dir = path.dirname(path.join(RACINE, rel))
  code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, a, q, spec) => `${a}${q}${pathToFileURL(path.resolve(dir, spec)).href}${q}`)
  const f = path.join(TMP, `${path.basename(rel, '.ts')}-copie-${++nCopies}.ts`); fs.writeFileSync(f, code)
  return import(pathToFileURL(f).href)
}

const ARTISAN = { id: A, plan: 'signature', is_founder: false, nom: 'Atelier Essai', email: 'atelier@essai.test', metier: 'Plombier', ton_style: null, leads_pause: false, plateforme_active: true }
const FIL_NEUTRE = [['in', 'manuel', 'Devis pour refaire la salle de bain'], ['out', 'reponse_auto', 'Bonjour, merci pour votre demande…'], ['in', 'manuel', 'Merci, j’attends votre devis'], ['out', 'manuel', 'Je vous l’envoie cette semaine.']]

try {
  const R = await imp('lib/pilote/regles.ts')
  const PC = await imp('lib/plateformeConfig.ts')
  const mots = PC.CONFIG_DEFAUT.escalade_mots
  const cfgAuto = { ...PC.CONFIG_DEFAUT, mode_reponse: 'auto', auto_24_7: true }
  const art = { plan: 'signature', leads_pause: false }

  // Le pilote : la VRAIE dépendance `escalade` (lib/pilote/executeur.ts), sur la base factice.
  const EXE = await copie('lib/pilote/executeur.ts', { doublures: { '@/lib/envoisPdfServeur': "export async function envoyerDevisServeur(): Promise<never> { throw new Error('doublure') }\nexport async function envoyerFactureServeur(): Promise<never> { throw new Error('doublure') }\n" } })
  const deps = EXE.dependancesSupabase()
  const ligne = { id: id(660), artisan_id: A, type: 'reponse_prospect', source: 'proposition', ref_id: id(661), lead_id: L, libelle: 'essai', prete_le: '2026-11-02T09:00:00Z', part_le: '2026-11-02T09:10:00Z' }
  async function pilote(phrase) {
    vider()
    T.leads = [{ id: L, artisan_id: A, nom_prospect: 'M. Essai', contact: 'client@essai.test', message: 'Devis pour refaire la salle de bain', statut: 'repondu', prise_en_main: false, canal: 'web' }]
    T.plateforme_config = [{ artisan_id: A, escalade_mots: mots }]
    T.messages = [...FIL_NEUTRE, ['in', 'manuel', phrase]].map(([sens, type, contenu], i) => ({ id: id(500 + i), lead_id: L, sens, type, contenu, etat: null, sent_at: `2026-10-${String(10 + i).padStart(2, '0')}T10:00:00Z` }))
    return (await deps.escalade(ligne, L, new Date('2026-11-02T09:10:00Z'))) ? 'à la main' : 'PART SEULE'
  }

  // Le cron : le vrai GET, dépendances lourdes doublées (comme 032-007, annexe A).
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
    '@/lib/ai': 'export async function generateRelanceReply(_a, l, rang) { return `Bonjour ${l.nom_prospect}, je reviens vers vous (relance ${rang})` }\nexport function relanceTemplate() { return "modèle" }',
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
  const cron = await copie('app/api/cron/relances/route.ts', { doublures: D })
  async function relance(phrase, { dansLaDemande = false } = {}) {
    vider(); globalThis.__ENVOIS = []
    T.artisans = [{ ...ARTISAN }]
    T.leads = [{ id: L, artisan_id: A, nom_prospect: 'M. Essai', contact: 'client@essai.test', message: dansLaDemande ? phrase : 'Devis pour refaire la salle de bain', statut: 'repondu', prise_en_main: false, urgence: null, canal: 'web' }]
    const fil = dansLaDemande ? FIL_NEUTRE : [...FIL_NEUTRE, ['in', 'manuel', phrase]]
    T.messages = fil.map(([sens, type, contenu], i) => ({ id: id(500 + i), lead_id: L, sens, type, contenu, etat: null, sent_at: `2026-10-${String(10 + i).padStart(2, '0')}T10:00:00Z` }))
    T.relances = [{ id: id(600), lead_id: L, rang: 1, planifiee_le: '2026-11-01T07:00:00Z', envoyee: false }]
    const rep = await cron.GET(new Request('http://localhost/api/cron/relances', { headers: { authorization: 'Bearer secret-essai' } }))
    const c = await rep.json()
    return globalThis.__ENVOIS.length > 0 ? `PART SEULE (sent ${c.sent})` : `annulée (skipped ${c.skipped}, envoyee=${T.relances[0].envoyee})`
  }
  async function troisChemins(phrase) {
    const s = R.sujetEscalade([phrase], mots)
    const d = PC.decisionReponse(art, { prise_en_main: false }, cfgAuto, { nbReponsesIA: 0, message: phrase, messagesClient: [phrase] })
    return { sujet: s, pilote: await pilote(phrase), reponse_seule: d.ok ? 'PART SEULE' : `${d.raison} (${d.mot ?? ''})`, cron: await relance(phrase) }
  }
  const passe = (r) => r.pilote === 'PART SEULE' || r.reponse_seule === 'PART SEULE' || r.cron.startsWith('PART')


  const ligneDe = (titre, r) => console.log(`  ${passe(r) ? '⚠ PASSE' : 'tient  '} « ${titre} » => ${JSON.stringify(r)}`)
  async function serie(titre, phrases) {
    console.log(`\n── ${titre}`)
    const manques = []
    for (const p of phrases) { const r = await troisChemins(p); if (passe(r)) manques.push(p); ligneDe(p, r) }
    console.log(`  passent => ${manques.length} / ${phrases.length}`)
    return manques
  }

  console.log('── 0. Témoins (le banc sait rougir) : un fil neutre part seul sur les trois chemins ; « J’ai une fuite » non')
  for (const p of ['Merci, à bientôt', 'J’ai une fuite']) ligneDe(p, await troisChemins(p))
  console.log(`  « Le ballon a perdu de l’eau » dans la DEMANDE d’origine seulement (leads.message), cron => ${await relance('Le ballon a perdu de l’eau', { dansLaDemande: true })}`)

  // 1. Les formes d'E4, M1, M2 (032-008 sections 2 et 7, annexe B), sur les trois chemins.
  const E4 = ['Le ballon perdait de l’eau', 'Le ballon a perdu de l’eau cette nuit', 'Mon ballon perd beaucoup d’eau', 'Le ballon perd un peu d’eau',
    'Le cumulus perd énormément d’eau', 'Il y a des pertes d’eau', 'Mon chauffe-eau perd d’eau', 'mon chauffe-eau perd de leau',
    'Les radiateurs perdaient de l’eau', 'Le ballon perd pas mal d’eau', 'Le robinet refuit depuis votre passage', 'Ça refuit',
    'Bonjour, mon ballon a perdu de l’eau cette nuit, pouvez-vous passer ?']
  await serie('1. Les formes d’E4, M1 et M2 de 032-008, sur les trois chemins', E4)

  // 2a. La famille « perdre … eau » elle-même : ce que la classe (≤ 3 mots, lettres seules) laisse passer.
  const famille = await serie('2a. La famille d’E4 : « perdre … eau » chiffré ou entrecoupé de 4 mots et plus', [
    'Le ballon perd 2 litres d’eau par jour', 'Mon chauffe-eau perd 1 litre d’eau par nuit', 'Le ballon perd environ 5L d’eau par jour', 'Le ballon perd 1 peu d’eau',
    'Le ballon perd de plus en plus d’eau', 'Le ballon perd un tout petit peu d’eau', 'Le ballon perd depuis hier soir beaucoup d’eau', 'La chaudière perd depuis 2 jours de l’eau',
    'Mon ballon perd encore un peu d’eau', 'Le cumulus perd toujours un peu d’eau', 'Le ballon perd quand même pas mal d’eau', 'Mon ballon perd chaque jour un peu d’eau',
    // témoins de la même famille, censés tenir
    'Le ballon perd des litres d’eau', 'Le ballon perd vraiment beaucoup trop d’eau', 'Le ballon perd depuis hier soir de l’eau', 'Mon ballon perd plusieurs litres d’eau'])

  // 2b. Fautes courantes sur la paraphrase.
  await serie('2b. Fautes courantes sur « perdre de l’eau »', ['Mon ballon perd deau', 'Mon ballon perd de l eau', 'Mon ballon pert de l’eau', 'Mon ballon pers de l’eau',
    'Mon ballon per de l’eau', 'Mon ballon perds de l’eau', 'Mon ballon perd de l’eaux', 'Le ballon a perdue de l’eau', 'Le ballon perd de l’o', 'le ballon perd de leaux', 'Le ballon perd dl’eau'])

  // 2c. « eau » avant le verbe, et autres verbes de fuite.
  await serie('2c. « eau » avant le verbe, et autres verbes de fuite (synonymes)', ['De l’eau se perd sous le ballon', 'Le chauffe-eau perd', 'Mon chauffe-eau perd, pouvez-vous passer ?',
    'L’eau s’échappe du ballon', 'L’eau s’écoule sous l’évier', 'De l’eau ruisselle le long du mur', 'Ça ruisselle sous l’évier', 'Il y a de l’eau qui sort du ballon', 'De l’eau sort du groupe de sécurité',
    'J’ai de l’eau sous l’évier', 'Le ballon lâche de l’eau', 'Le ballon crache de l’eau', 'Le ballon pisse de l’eau', 'Le ballon se vide tout seul', 'Le radiateur perd du liquide',
    'Le plafond est humide', 'Ça suinte au plafond', 'Le robinet goutte'])

  // 3. Faux positifs que la classe ouvre : corpus FICTIF de 40 demandes d'un plombier-chauffagiste (écrit pour cet audit).
  console.log('\n── 3. Faux positifs de PERTE_D_EAU (corpus fictif : sujet rendu, et si c’est la classe seule qui le prend)')
  const R0 = await copie('lib/pilote/regles.ts', { remplacer: [["    if (PERTE_D_EAU.test(mots)) return 'perte d’eau'\n", '']] })
  const ordinaires = [
    'J’ai perdu ma facture d’eau', 'J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ?', 'Perte de temps et d’eau avec l’ancien artisan', 'J’ai perdu la notice du chauffe-eau',
    'J’ai perdu la notice chauffe-eau', 'J’ai perdu le chauffe-eau dans le déménagement (blague) : devis pour un neuf', 'Je perds patience avec mon chauffe-eau', 'Perte de pression chauffe-eau',
    'Perte de pression sur le chauffe-eau', 'Pertes de charge du ballon d’eau chaude', 'Perte de pression ballon d’eau chaude', 'Est-ce pertinent de changer le chauffe-eau ?',
    'Pertinent, ce chauffe-eau thermodynamique ?', 'Le ballon perd l’eau chaude au bout de 5 minutes', 'Mon ballon perd sa chaleur, l’eau est tiède', 'Je ne veux pas perdre de temps : eau chaude à installer',
    'J’ai perdu le devis pour le chauffe-eau', 'J’ai perdu mon code d’accès au compteur d’eau', 'On a perdu du temps avec le point d’eau du jardin', 'Perturbation de l’eau chaude le matin',
    'La chaudière perd de la pression', 'Je perds patience, rappelez-moi', 'J’ai perdu votre devis, pouvez-vous le renvoyer ?', 'Mon ballon perd sa chaleur la nuit',
    'Je voudrais réduire mes pertes de chaleur', 'Devis pour un adoucisseur d’eau', 'Installer un chauffe-eau thermodynamique', 'Je perds mon temps à chercher un artisan pour un ballon d’eau chaude',
    'Perte de garantie sur chauffe-eau ?', 'Je ne voudrais pas perdre l’eau chaude pendant les travaux',
  ]
  const prisParClasse = []
  for (const p of ordinaires) {
    const s = R.sujetEscalade([p], mots), s0 = R0.sujetEscalade([p], mots)
    const classe = s !== null && s0 === null
    if (classe) prisParClasse.push(p)
    console.log(`  « ${p} » => ${s ?? 'part seule'}${classe ? '   ← pris par PERTE_D_EAU seule' : ''}`)
  }
  console.log(`  pris par la classe seule => ${prisParClasse.length} / ${ordinaires.length}`)
  console.log('  coût réel sur le cron (Signature) : la relance d’une demande ordinaire prise par la classe')
  for (const p of ['J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ?', 'Perte de pression chauffe-eau']) console.log(`    « ${p} » (dans la demande) => ${await relance(p, { dansLaDemande: true })} ; e-mails envoyés par le cron (artisan compris) : ${globalThis.__ENVOIS.length}`)

  // 4. FAUSSE_URGENCE ne masque-t-elle aucune perte d'eau ?
  await serie('4. FAUSSE_URGENCE face à « perdre … eau »', ['pas urgent mais le ballon a perdu de l’eau', 'Pas urgent mais le ballon a perdu de l’eau', 'Pas d’urgence, le ballon perd un peu d’eau',
    'Sans dégât, le cumulus perdait de l’eau', 'Aucune urgence : des pertes d’eau au compteur', 'Rien d’urgent, la chaudière perd beaucoup d’eau', 'Pas urgentissime : le ballon perd de leau',
    'Pas de dégâts mais le ballon a perdu de l’eau', 'Le ballon a perdu de l’eau, pas d’urgence', 'Le ballon perd, sans dégât, de l’eau', 'Le ballon perd (rien d’urgent) un peu d’eau', 'Le cumulus a perdu, pas urgent, un peu d’eau'])

  // 5. Mutants : les essais C6l et C6j de la suite, rejoués sur leurs mutants et sur des mutants plus fins.
  console.log('\n── 5. Mutants')
  const C6l = ['Le ballon perdait de l’eau', 'Le ballon a perdu de l’eau cette nuit', 'Mon ballon perd beaucoup d’eau', 'Le ballon perd un peu d’eau',
    'Le cumulus perd énormément d’eau', 'Il y a des pertes d’eau', 'Mon chauffe-eau perd d’eau', 'mon chauffe-eau perd de leau',
    'Les radiateurs perdaient de l’eau', 'Le ballon perd pas mal d’eau', 'Le robinet refuit depuis votre passage', 'Ça refuit']
  const essaiC6l = (M) => { const r = C6l.filter((m) => M.sujetEscalade([m], []) === null); const a = C6l.map((m) => PC.decisionReponse(art, { prise_en_main: false }, { ...PC.CONFIG_DEFAUT, mode_reponse: 'auto', auto_24_7: true }, { nbReponsesIA: 0, message: m })).filter((d) => d.ok === true); return { vert: r.length === 0 && a.length === 0, rates: r } }
  console.log(`  original, essai C6l => ${JSON.stringify(essaiC6l(R))}`)
  console.log(`  mutant de la suite (la ligne PERTE_D_EAU retirée), essai C6l => ${JSON.stringify(essaiC6l(R0))}`)
  const Mrefui = await copie('lib/pilote/regles.ts', { remplacer: [["  'refui', 'refuy',\n", '']] })
  console.log(`  mutant « refui, refuy » retirés (M2), essai C6l => ${JSON.stringify(essaiC6l(Mrefui))}`)
  const Mleau = await copie('lib/pilote/regles.ts', { remplacer: [['(?:d |de l |de |l |d l )?l?eaux? /', '(?:d |de l |de |l |d l )?eaux? /']] })
  console.log(`  mutant « l? » ôté (M1, « de leau »), essai C6l => ${JSON.stringify(essaiC6l(Mleau))}`)
  const Mzero = await copie('lib/pilote/regles.ts', { remplacer: [['(?: [a-z]+){0,3}?', '']] })
  console.log(`  mutant « aucun mot glissé » ({0,3} ôté), essai C6l => ${JSON.stringify(essaiC6l(Mzero))}`)
  const Mperd = await copie('lib/pilote/regles.ts', { remplacer: [['/ (?:perd|pert)[a-z]*', '/ (?:perd)[a-z]*']] })
  console.log(`  mutant « pert » ôté (« des pertes d’eau »), essai C6l => ${JSON.stringify(essaiC6l(Mperd))}`)
  const C6m = ['La chaudière perd de la pression', 'Je perds patience, rappelez-moi', 'J’ai perdu votre devis, pouvez-vous le renvoyer ?', 'La chaudière perd en pression',
    'Je ne veux pas perdre du temps', 'Mon ballon perd sa chaleur la nuit', 'Je voudrais réduire mes pertes de chaleur', 'Refuge pour chats : devis de clôture']
  const Mlarge = await copie('lib/pilote/regles.ts', { remplacer: [["    if (PERTE_D_EAU.test(mots)) return 'perte d’eau'\n", "    if (/ (?:perd|pert)/.test(mots)) return 'perte d’eau'\n"]] })
  console.log(`  mutant trop large (tout « perd »/« pert »), essai C6m (faux positifs) => ${JSON.stringify(C6m.filter((m) => Mlarge.sujetEscalade([m], []) !== null).length)} pris sur ${C6m.length} (C6m doit rougir)`)
  const Mrefu = await copie('lib/pilote/regles.ts', { remplacer: [["  'refui', 'refuy',\n", "  'refu',\n"]] })
  console.log(`  mutant « refu » (trop court), essai C6m => ${JSON.stringify(C6m.filter((m) => Mrefu.sujetEscalade([m], []) !== null))}`)

  // 6. Correctif proposé, joué sur une copie : chiffres admis, fenêtre de 5 mots, « deau » collé, espaces doubles resserrées.
  console.log('\n── 6. Correctif proposé (copie) : / (?:perd|pert)[a-z]*(?: [a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? / et espaces resserrées')
  const RP = await copie('lib/pilote/regles.ts', { remplacer: [
    ['const PERTE_D_EAU = / (?:perd|pert)[a-z]*(?: [a-z]+){0,3}? (?:d |de l |de |l |d l )?l?eaux? /', 'const PERTE_D_EAU = / (?:perd|pert)[a-z]*(?: [a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? /'],
    [".replace(FAUSSE_URGENCE, ' ')\n", ".replace(FAUSSE_URGENCE, ' ').replace(/ {2,}/g, ' ')\n"]] })
  const fam = ['Le ballon perd 2 litres d’eau par jour', 'Mon chauffe-eau perd 1 litre d’eau par nuit', 'Le ballon perd environ 5L d’eau par jour', 'Le ballon perd 1 peu d’eau',
    'Le ballon perd de plus en plus d’eau', 'Le ballon perd un tout petit peu d’eau', 'Le ballon perd depuis hier soir beaucoup d’eau', 'La chaudière perd depuis 2 jours de l’eau',
    'Mon ballon perd encore un peu d’eau', 'Le cumulus perd toujours un peu d’eau', 'Le ballon perd quand même pas mal d’eau', 'Mon ballon perd chaque jour un peu d’eau',
    'Mon ballon perd deau', 'Le ballon perd, sans dégât, de l’eau', 'Le ballon perd (rien d’urgent) un peu d’eau', 'Le cumulus a perdu, pas urgent, un peu d’eau', ...C6l]
  console.log(`  famille + C6l : aujourd’hui ${fam.filter((m) => R.sujetEscalade([m], mots) === null).length} passent ; avec la proposition ${fam.filter((m) => RP.sujetEscalade([m], mots) === null).length} passent : ${JSON.stringify(fam.filter((m) => RP.sujetEscalade([m], mots) === null))}`)
  const fpP = ordinaires.filter((p) => RP.sujetEscalade([p], mots) !== null && R0.sujetEscalade([p], mots) === null)
  console.log(`  faux positifs de la classe sur le corpus : aujourd’hui ${prisParClasse.length} ; avec la proposition ${fpP.length} : ${JSON.stringify(fpP)}`)
  console.log(`  C6m avec la proposition (0 attendu) => ${C6m.filter((m) => RP.sujetEscalade([m], []) !== null).length}`)
} catch (e) {
  console.error('ERREUR DU SCRIPT :', e)
  process.exitCode = 1
} finally {
  fs.rmSync(TMP, { recursive: true, force: true })
}
```

### Annexe B — `proposition.mjs`

```js
#!/usr/bin/env node
// 032-011, complément : deux variantes du correctif, jouées sur une COPIE de lib/pilote/regles.ts (dossier temporaire ; rien n'est écrit dans le dépôt).
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs <ce fichier>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url'
process.removeAllListeners('warning'); process.on('warning', () => {})
globalThis.fetch = async (u) => { throw new Error(`réseau interdit : ${u}`) }
const RACINE = process.cwd(), SRC = fs.readFileSync(path.join(RACINE, 'lib/pilote/regles.ts'), 'utf8')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-032-011-b-'))
let n = 0
async function variante(remplacer) {
  let code = SRC
  for (const [a, b] of remplacer) { if (!code.includes(a)) throw new Error(`motif introuvable : ${a.slice(0, 60)}`); code = code.replace(a, b) }
  code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, x, q, s) => `${x}${q}${pathToFileURL(path.resolve(path.join(RACINE, 'lib/pilote'), s)).href}${q}`)
  const f = path.join(TMP, `regles-${++n}.ts`); fs.writeFileSync(f, code); return import(pathToFileURL(f).href)
}
const LIGNE = 'const PERTE_D_EAU = / (?:perd|pert)[a-z]*(?: [a-z]+){0,3}? (?:d |de l |de |l |d l )?l?eaux? /'
const SERRE = [".replace(FAUSSE_URGENCE, ' ')\n", ".replace(FAUSSE_URGENCE, ' ').replace(/ {2,}/g, ' ')\n"]
const SANS = ["    if (PERTE_D_EAU.test(mots)) return 'perte d’eau'\n", '']
const R = await import(pathToFileURL(path.join(RACINE, 'lib/pilote/regles.ts')).href)
const R0 = await variante([SANS])
const V1 = await variante([[LIGNE, 'const PERTE_D_EAU = / (?:perd|pert)[a-z]*(?: [a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? /'], SERRE])
// V2 : chiffres admis, 5 mots, « deau » ; « pert », « perte », « pertes » seuls (ni « pertinent » ni « perturbe ») ; « chauffe-eau » n'est pas de l'eau perdue.
const V2 = await variante([[LIGNE, 'const PERTE_D_EAU = / (?:perd[a-z]*|pert|pertes?)(?: (?!chauffe )[a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? /'], SERRE])
const mots = ['urgence', 'fuite', 'dégât des eaux', 'inondation', 'gaz', 'assurance']
const FAMILLE = ['Le ballon perd 2 litres d’eau par jour', 'Mon chauffe-eau perd 1 litre d’eau par nuit', 'Le ballon perd environ 5L d’eau par jour', 'Le ballon perd 1 peu d’eau',
  'Le ballon perd de plus en plus d’eau', 'Le ballon perd un tout petit peu d’eau', 'Le ballon perd depuis hier soir beaucoup d’eau', 'La chaudière perd depuis 2 jours de l’eau',
  'Le ballon perd quand même pas mal d’eau', 'Mon ballon perd chaque jour un peu d’eau', 'Mon ballon perd deau', 'Le ballon perd, sans dégât, de l’eau',
  'Le ballon perd (rien d’urgent) un peu d’eau', 'Le cumulus a perdu, pas urgent, un peu d’eau',
  'Le ballon perdait de l’eau', 'Le ballon a perdu de l’eau cette nuit', 'Mon ballon perd beaucoup d’eau', 'Le ballon perd un peu d’eau', 'Le cumulus perd énormément d’eau',
  'Il y a des pertes d’eau', 'Mon chauffe-eau perd d’eau', 'mon chauffe-eau perd de leau', 'Les radiateurs perdaient de l’eau', 'Le ballon perd pas mal d’eau', 'Mon ballon pert de l’eau']
const ORDINAIRES = ['J’ai perdu ma facture d’eau', 'J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ?', 'Perte de temps et d’eau avec l’ancien artisan', 'J’ai perdu la notice du chauffe-eau',
  'J’ai perdu la notice chauffe-eau', 'J’ai perdu le chauffe-eau dans le déménagement (blague) : devis pour un neuf', 'Je perds patience avec mon chauffe-eau', 'Perte de pression chauffe-eau',
  'Perte de pression sur le chauffe-eau', 'Pertes de charge du ballon d’eau chaude', 'Perte de pression ballon d’eau chaude', 'Est-ce pertinent de changer le chauffe-eau ?',
  'Pertinent, ce chauffe-eau thermodynamique ?', 'Le ballon perd l’eau chaude au bout de 5 minutes', 'Mon ballon perd sa chaleur, l’eau est tiède', 'Je ne veux pas perdre de temps : eau chaude à installer',
  'J’ai perdu le devis pour le chauffe-eau', 'J’ai perdu mon code d’accès au compteur d’eau', 'On a perdu du temps avec le point d’eau du jardin', 'Perturbation de l’eau chaude le matin',
  'La chaudière perd de la pression', 'Je perds patience, rappelez-moi', 'J’ai perdu votre devis, pouvez-vous le renvoyer ?', 'Mon ballon perd sa chaleur la nuit',
  'Je voudrais réduire mes pertes de chaleur', 'Devis pour un adoucisseur d’eau', 'Installer un chauffe-eau thermodynamique', 'Je perds mon temps à chercher un artisan pour un ballon d’eau chaude',
  'Perte de garantie sur chauffe-eau ?', 'Je ne voudrais pas perdre l’eau chaude pendant les travaux']
const C6m = ['La chaudière perd de la pression', 'Je perds patience, rappelez-moi', 'J’ai perdu votre devis, pouvez-vous le renvoyer ?', 'La chaudière perd en pression',
  'Je ne veux pas perdre du temps', 'Mon ballon perd sa chaleur la nuit', 'Je voudrais réduire mes pertes de chaleur', 'Refuge pour chats : devis de clôture']
try {
  for (const [nom, M] of [['aujourd’hui (arbre)', R], ['V1 (fenêtre 5, chiffres, deau, espaces resserrées)', V1], ['V2 (V1 + pert, perte(s) seuls + chauffe-eau exclu)', V2]]) {
    const manques = FAMILLE.filter((p) => M.sujetEscalade([p], mots) === null)
    const fp = ORDINAIRES.filter((p) => M.sujetEscalade([p], mots) !== null && R0.sujetEscalade([p], mots) === null)
    console.log(`${nom} => famille d’E4 qui passe : ${manques.length} / ${FAMILLE.length} ${JSON.stringify(manques)}`)
    console.log(`   faux positifs de la classe : ${fp.length} / ${ORDINAIRES.length} ${JSON.stringify(fp)} ; C6m pris : ${C6m.filter((p) => M.sujetEscalade([p], []) !== null).length}`)
  }
} finally { fs.rmSync(TMP, { recursive: true, force: true }) }
```

### Annexe C — sortie de `attaque-032-011.mjs` (code 0 ; l’avertissement MODULE_TYPELESS_PACKAGE_JSON de Node est ôté)

```
── 0. Témoins (le banc sait rougir) : un fil neutre part seul sur les trois chemins ; « J’ai une fuite » non
  ⚠ PASSE « Merci, à bientôt » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « J’ai une fuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le ballon a perdu de l’eau » dans la DEMANDE d’origine seulement (leads.message), cron => annulée (skipped 1, envoyee=true)

── 1. Les formes d’E4, M1 et M2 de 032-008, sur les trois chemins
  tient   « Le ballon perdait de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon a perdu de l’eau cette nuit » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon ballon perd beaucoup d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon perd un peu d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le cumulus perd énormément d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Il y a des pertes d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon chauffe-eau perd d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « mon chauffe-eau perd de leau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Les radiateurs perdaient de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon perd pas mal d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le robinet refuit depuis votre passage » => {"sujet":"refui","pilote":"à la main","reponse_seule":"escalade (refui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Ça refuit » => {"sujet":"refui","pilote":"à la main","reponse_seule":"escalade (refui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Bonjour, mon ballon a perdu de l’eau cette nuit, pouvez-vous passer ? » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  passent => 0 / 13

── 2a. La famille d’E4 : « perdre … eau » chiffré ou entrecoupé de 4 mots et plus
  ⚠ PASSE « Le ballon perd 2 litres d’eau par jour » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Mon chauffe-eau perd 1 litre d’eau par nuit » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon perd environ 5L d’eau par jour » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon perd 1 peu d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon perd de plus en plus d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon perd un tout petit peu d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon perd depuis hier soir beaucoup d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « La chaudière perd depuis 2 jours de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Mon ballon perd encore un peu d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le cumulus perd toujours un peu d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Le ballon perd quand même pas mal d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Mon ballon perd chaque jour un peu d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Le ballon perd des litres d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon perd vraiment beaucoup trop d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon perd depuis hier soir de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon ballon perd plusieurs litres d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  passent => 10 / 16

── 2b. Fautes courantes sur « perdre de l’eau »
  ⚠ PASSE « Mon ballon perd deau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Mon ballon perd de l eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon ballon pert de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Mon ballon pers de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Mon ballon per de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Mon ballon perds de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon ballon perd de l’eaux » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon a perdue de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Le ballon perd de l’o » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « le ballon perd de leaux » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon perd dl’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  passent => 4 / 11

── 2c. « eau » avant le verbe, et autres verbes de fuite (synonymes)
  ⚠ PASSE « De l’eau se perd sous le ballon » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le chauffe-eau perd » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Mon chauffe-eau perd, pouvez-vous passer ? » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « L’eau s’échappe du ballon » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « L’eau s’écoule sous l’évier » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « De l’eau ruisselle le long du mur » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Ça ruisselle sous l’évier » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Il y a de l’eau qui sort du ballon » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « De l’eau sort du groupe de sécurité » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « J’ai de l’eau sous l’évier » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon lâche de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon crache de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon pisse de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon se vide tout seul » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le radiateur perd du liquide » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le plafond est humide » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Ça suinte au plafond » => {"sujet":"suinte","pilote":"à la main","reponse_seule":"escalade (suinte)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le robinet goutte » => {"sujet":"goutte","pilote":"à la main","reponse_seule":"escalade (goutte)","cron":"annulée (skipped 1, envoyee=true)"}
  passent => 16 / 18

── 3. Faux positifs de PERTE_D_EAU (corpus fictif : sujet rendu, et si c’est la classe seule qui le prend)
  « J’ai perdu ma facture d’eau » => perte d’eau   ← pris par PERTE_D_EAU seule
  « J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ? » => perte d’eau   ← pris par PERTE_D_EAU seule
  « Perte de temps et d’eau avec l’ancien artisan » => perte d’eau   ← pris par PERTE_D_EAU seule
  « J’ai perdu la notice du chauffe-eau » => part seule
  « J’ai perdu la notice chauffe-eau » => perte d’eau   ← pris par PERTE_D_EAU seule
  « J’ai perdu le chauffe-eau dans le déménagement (blague) : devis pour un neuf » => perte d’eau   ← pris par PERTE_D_EAU seule
  « Je perds patience avec mon chauffe-eau » => part seule
  « Perte de pression chauffe-eau » => perte d’eau   ← pris par PERTE_D_EAU seule
  « Perte de pression sur le chauffe-eau » => part seule
  « Pertes de charge du ballon d’eau chaude » => part seule
  « Perte de pression ballon d’eau chaude » => perte d’eau   ← pris par PERTE_D_EAU seule
  « Est-ce pertinent de changer le chauffe-eau ? » => part seule
  « Pertinent, ce chauffe-eau thermodynamique ? » => perte d’eau   ← pris par PERTE_D_EAU seule
  « Le ballon perd l’eau chaude au bout de 5 minutes » => perte d’eau   ← pris par PERTE_D_EAU seule
  « Mon ballon perd sa chaleur, l’eau est tiède » => perte d’eau   ← pris par PERTE_D_EAU seule
  « Je ne veux pas perdre de temps : eau chaude à installer » => perte d’eau   ← pris par PERTE_D_EAU seule
  « J’ai perdu le devis pour le chauffe-eau » => part seule
  « J’ai perdu mon code d’accès au compteur d’eau » => part seule
  « On a perdu du temps avec le point d’eau du jardin » => part seule
  « Perturbation de l’eau chaude le matin » => perte d’eau   ← pris par PERTE_D_EAU seule
  « La chaudière perd de la pression » => part seule
  « Je perds patience, rappelez-moi » => part seule
  « J’ai perdu votre devis, pouvez-vous le renvoyer ? » => part seule
  « Mon ballon perd sa chaleur la nuit » => part seule
  « Je voudrais réduire mes pertes de chaleur » => part seule
  « Devis pour un adoucisseur d’eau » => part seule
  « Installer un chauffe-eau thermodynamique » => part seule
  « Je perds mon temps à chercher un artisan pour un ballon d’eau chaude » => part seule
  « Perte de garantie sur chauffe-eau ? » => part seule
  « Je ne voudrais pas perdre l’eau chaude pendant les travaux » => perte d’eau   ← pris par PERTE_D_EAU seule
  pris par la classe seule => 13 / 30
  coût réel sur le cron (Signature) : la relance d’une demande ordinaire prise par la classe
    « J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ? » (dans la demande) => annulée (skipped 1, envoyee=true) ; e-mails envoyés par le cron (artisan compris) : 0
    « Perte de pression chauffe-eau » (dans la demande) => annulée (skipped 1, envoyee=true) ; e-mails envoyés par le cron (artisan compris) : 0

── 4. FAUSSE_URGENCE face à « perdre … eau »
  tient   « pas urgent mais le ballon a perdu de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas urgent mais le ballon a perdu de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas d’urgence, le ballon perd un peu d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (urgence)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Sans dégât, le cumulus perdait de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Aucune urgence : des pertes d’eau au compteur » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (urgence)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Rien d’urgent, la chaudière perd beaucoup d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas urgentissime : le ballon perd de leau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas de dégâts mais le ballon a perdu de l’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon a perdu de l’eau, pas d’urgence » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (urgence)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Le ballon perd, sans dégât, de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon perd (rien d’urgent) un peu d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le cumulus a perdu, pas urgent, un peu d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  passent => 3 / 12

── 5. Mutants
  original, essai C6l => {"vert":true,"rates":[]}
  mutant de la suite (la ligne PERTE_D_EAU retirée), essai C6l => {"vert":false,"rates":["Le ballon perdait de l’eau","Le ballon a perdu de l’eau cette nuit","Mon ballon perd beaucoup d’eau","Le ballon perd un peu d’eau","Le cumulus perd énormément d’eau","Il y a des pertes d’eau","Mon chauffe-eau perd d’eau","mon chauffe-eau perd de leau","Les radiateurs perdaient de l’eau","Le ballon perd pas mal d’eau"]}
  mutant « refui, refuy » retirés (M2), essai C6l => {"vert":false,"rates":["Le robinet refuit depuis votre passage","Ça refuit"]}
  mutant « l? » ôté (M1, « de leau »), essai C6l => {"vert":false,"rates":["mon chauffe-eau perd de leau"]}
  mutant « aucun mot glissé » ({0,3} ôté), essai C6l => {"vert":false,"rates":["Mon ballon perd beaucoup d’eau","Le ballon perd un peu d’eau","Le cumulus perd énormément d’eau","Le ballon perd pas mal d’eau"]}
  mutant « pert » ôté (« des pertes d’eau »), essai C6l => {"vert":false,"rates":["Il y a des pertes d’eau"]}
  mutant trop large (tout « perd »/« pert »), essai C6m (faux positifs) => 7 pris sur 8 (C6m doit rougir)
  mutant « refu » (trop court), essai C6m => ["Refuge pour chats : devis de clôture"]

── 6. Correctif proposé (copie) : / (?:perd|pert)[a-z]*(?: [a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? / et espaces resserrées
  famille + C6l : aujourd’hui 14 passent ; avec la proposition 0 passent : []
  faux positifs de la classe sur le corpus : aujourd’hui 13 ; avec la proposition 21 : ["J’ai perdu ma facture d’eau","J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ?","Perte de temps et d’eau avec l’ancien artisan","J’ai perdu la notice du chauffe-eau","J’ai perdu la notice chauffe-eau","J’ai perdu le chauffe-eau dans le déménagement (blague) : devis pour un neuf","Je perds patience avec mon chauffe-eau","Perte de pression chauffe-eau","Perte de pression sur le chauffe-eau","Pertes de charge du ballon d’eau chaude","Perte de pression ballon d’eau chaude","Est-ce pertinent de changer le chauffe-eau ?","Pertinent, ce chauffe-eau thermodynamique ?","Le ballon perd l’eau chaude au bout de 5 minutes","Mon ballon perd sa chaleur, l’eau est tiède","Je ne veux pas perdre de temps : eau chaude à installer","J’ai perdu le devis pour le chauffe-eau","On a perdu du temps avec le point d’eau du jardin","Perturbation de l’eau chaude le matin","Perte de garantie sur chauffe-eau ?","Je ne voudrais pas perdre l’eau chaude pendant les travaux"]
  C6m avec la proposition (0 attendu) => 0
```

### Annexe D — sortie de `proposition.mjs` (code 0)

```
aujourd’hui (arbre) => famille d’E4 qui passe : 14 / 25 ["Le ballon perd 2 litres d’eau par jour","Mon chauffe-eau perd 1 litre d’eau par nuit","Le ballon perd environ 5L d’eau par jour","Le ballon perd 1 peu d’eau","Le ballon perd de plus en plus d’eau","Le ballon perd un tout petit peu d’eau","Le ballon perd depuis hier soir beaucoup d’eau","La chaudière perd depuis 2 jours de l’eau","Le ballon perd quand même pas mal d’eau","Mon ballon perd chaque jour un peu d’eau","Mon ballon perd deau","Le ballon perd, sans dégât, de l’eau","Le ballon perd (rien d’urgent) un peu d’eau","Le cumulus a perdu, pas urgent, un peu d’eau"]
   faux positifs de la classe : 13 / 30 ["J’ai perdu ma facture d’eau","J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ?","Perte de temps et d’eau avec l’ancien artisan","J’ai perdu la notice chauffe-eau","J’ai perdu le chauffe-eau dans le déménagement (blague) : devis pour un neuf","Perte de pression chauffe-eau","Perte de pression ballon d’eau chaude","Pertinent, ce chauffe-eau thermodynamique ?","Le ballon perd l’eau chaude au bout de 5 minutes","Mon ballon perd sa chaleur, l’eau est tiède","Je ne veux pas perdre de temps : eau chaude à installer","Perturbation de l’eau chaude le matin","Je ne voudrais pas perdre l’eau chaude pendant les travaux"] ; C6m pris : 0
V1 (fenêtre 5, chiffres, deau, espaces resserrées) => famille d’E4 qui passe : 0 / 25 []
   faux positifs de la classe : 21 / 30 ["J’ai perdu ma facture d’eau","J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ?","Perte de temps et d’eau avec l’ancien artisan","J’ai perdu la notice du chauffe-eau","J’ai perdu la notice chauffe-eau","J’ai perdu le chauffe-eau dans le déménagement (blague) : devis pour un neuf","Je perds patience avec mon chauffe-eau","Perte de pression chauffe-eau","Perte de pression sur le chauffe-eau","Pertes de charge du ballon d’eau chaude","Perte de pression ballon d’eau chaude","Est-ce pertinent de changer le chauffe-eau ?","Pertinent, ce chauffe-eau thermodynamique ?","Le ballon perd l’eau chaude au bout de 5 minutes","Mon ballon perd sa chaleur, l’eau est tiède","Je ne veux pas perdre de temps : eau chaude à installer","J’ai perdu le devis pour le chauffe-eau","On a perdu du temps avec le point d’eau du jardin","Perturbation de l’eau chaude le matin","Perte de garantie sur chauffe-eau ?","Je ne voudrais pas perdre l’eau chaude pendant les travaux"] ; C6m pris : 0
V2 (V1 + pert, perte(s) seuls + chauffe-eau exclu) => famille d’E4 qui passe : 0 / 25 []
   faux positifs de la classe : 10 / 30 ["J’ai perdu ma facture d’eau","J’ai perdu la facture d’eau, pouvez-vous me la renvoyer ?","Perte de temps et d’eau avec l’ancien artisan","Pertes de charge du ballon d’eau chaude","Perte de pression ballon d’eau chaude","Le ballon perd l’eau chaude au bout de 5 minutes","Mon ballon perd sa chaleur, l’eau est tiède","Je ne veux pas perdre de temps : eau chaude à installer","On a perdu du temps avec le point d’eau du jardin","Je ne voudrais pas perdre l’eau chaude pendant les travaux"] ; C6m pris : 0
```
