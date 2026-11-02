# 032-008 — sixième audit offensif : le correctif E3 seul (chantier 4, lots L1 et L2), 02/11/2026

Auditeur : Claude Code (claude-code), en attaquant. Je n'ai écrit ni le lot, ni ses correctifs, ni les cinq audits d'avant.

Je n'ai travaillé qu'en lecture : rien n'a changé hors de `.orchestre/preuves/032-008/`. Je n'ai créé aucun compte de test et joué aucune
suite contre la production. Je n'ai fait aucun appel réseau vers Presti en ligne, ni build, ni typecheck, ni commit, ni migration. Je n'ai lu
aucun secret.

Réseau neuronal : `regles_pour` (« assistant, pilote, relances, escalade : audit offensif du correctif E3 ») a rendu `[]`. `chercher`
(« escalade sujetEscalade fuite pilote relances ») renvoie au plan (§3 S3 : un plombier en Signature verra ses réponses « fuite » revenir à
la main) et à `cadrage-p3.md` §7 (risque « escalade trop sensible (« fuite ») »). J'ai lu le cinquième audit (`032-007/rapport.md` en entier :
E3, E1, « Faibles », annexes A, B et D) et le correctif lui-même : `git show 74db706a -- lib/pilote/regles.ts lib/plateformeConfig.ts
lib/relances.ts app/api/cron/relances/route.ts`. Ces quatre fichiers sont inchangés dans l'arbre de travail (`git status` vide sur eux).

Les attaques tournent hors ligne, par deux scripts placés dans le dossier temporaire de la session, hors du dépôt (code en annexe). Le fetch
est doublé : toute adresse autre que la base factice lève. `sendEmail` est doublé aussi, et toutes les données sont inventées. Les trois
chemins sont joués avec leur vrai code :
- le **pilote** : la vraie dépendance `escalade` de `dependancesSupabase()` (`lib/pilote/executeur.ts:227-240`) ;
- la **réponse seule en Signature « auto »** : `decisionReponse` (`lib/plateformeConfig.ts:216-229`, qui appelle `iaDoitRepondre`, `:180`) ;
- le **cron des relances** : le vrai `GET` de `app/api/cron/relances/route.ts`, avec `sujetDuFil` réel (`lib/relances.ts:11-16`).

Les dépendances lourdes de la route du cron (modèle, e-mail, purges) sont doublées, comme en 032-007.

VERDICT : NE TIENT PAS

Pourquoi : le correctif E3 tient **sur sa cible**. Les 14 tournures de 032-007 sont repérées sur les trois chemins (0 sur 14 passent), et
toutes les formes de « fuir » que j'ai essayées aussi, y compris les fautes courantes. Mais la seconde moitié du correctif, « perd de l'eau »,
a été posée en trois chaînes figées : `perd de l’eau`, `perdent de l’eau`, `perte d’eau`. Elle refait donc le défaut qu'elle devait fermer,
celui d'E2 devenu E3 : on corrige une forme, et la forme voisine passe.

- **E4 (élevé)** : « Le ballon **a perdu** de l'eau cette nuit », « Le ballon **perdait** de l'eau », « Mon ballon perd **beaucoup** d'eau »,
  « perd **un peu** d'eau », « perd **énormément** d'eau », « Il y a des **pertes** d'eau ». Ces phrases passent toutes sur les trois
  chemins : la réponse part seule en Signature « auto », le pilote laisse partir et le cron envoie la relance (`"sent":1`).

Je range E4 en élevé par la règle du verdict telle qu'elle est écrite. Ces phrases sont ordinaires : le passé composé, l'imparfait et un
adverbe d'une tournure que 032-007 a classée « façon standard de dire qu'un appareil fuit ». La session principale a suivi ce classement
en la corrigeant avant le push. La parole part sans clic, et le sujet est une fuite, que le §3.2 nomme. C'est le raisonnement même qui a
classé « a fui » en élevé (032-007, E3). Le correctif est court, ne fait que restreindre, et je l'ai joué sur une copie (plus bas).

## Bilan

| # | Point éprouvé | Verdict | Preuve |
|---|---|---|---|
| 1 | les 14 tournures de 032-007 (annexe B), sur les trois chemins | **tient** : 0 / 14 passent | section 1 |
| 2a | conjugaisons et temps de « fuir » (fuyons, fuirait, ont fui, avait fui, fuiront, fuyait, fuyant, fuie, fuient) | **tient** : 9 / 9 | section 2 |
| 2b | fautes courantes (fuie, fuit pas, ça fui, sa fuit, sa fui, fuitte, fuis, fuiite) | **tient** : 9 / 9 | section 2 |
| 2c | apostrophes droite, typographique, `ʼ`, accent grave ; majuscules ; sans accent ; « FUÎTE » ; « #fuite » | **tient** : 13 / 13 | section 2 |
| 2d | **« perdre de l'eau » conjugué ou entrecoupé** | **E4 : ne tient pas** (6 formes de la famille sur 10 essayées passent ; 2 de plus en complément) | sections 2 et 7 |
| 2e | fautes sur la paraphrase : « perd de leau » (collé), « perd d'eau » | moyen (M1) | section 2 |
| 2f | « refuit » (préfixe re-) : « Le robinet refuit depuis votre passage », « Ça refuit » | moyen (M2) | section 2 |
| 2g | fautes de frappe dans le mot : « fiute », « fuuite », « fite » | faible (F1) | section 2 |
| 2h | autres langues : « leaking », « fuga de água », « fuga de agua » | faible (F2) | section 2 |
| 2i | sens figuré (« fuir ses responsabilités », « le fuyard ») | côté sûr : escalade | section 2 |
| 3 | les trois chemins disent-ils la même chose ? | **oui** : 0 écart sur 68 phrases | section 3 |
| 4 | `FAUSSE_URGENCE` masque-t-elle une fuite vraie ? | **non** : 13 / 13 repérées | section 4 |
| 5 | faux positifs ouverts par `fui` et `fuy` | 3 sur 40, tous au sens figuré, 0 sur 20 demandes ordinaires ; coût : relance annulée sans un mot (inchangé) | section 5 |
| 6 | mutants de `securite-assistant-0211-qa` sur E3 | l'essai C6j rougit bien sur les mutants, mais la suite ne joue aucun mutant de C6j (F3) | section 6 |
| — | suite `securite-assistant-0211-qa` | `136 PASS, 0 FAIL`, code 0 | section 8 |

## 1. Les quatorze tournures de 032-007 — tiennent sur les trois chemins

Sortie de `attaque-032-008.mjs` (code 0), extrait. Les témoins viennent d'abord : le banc sait rougir, car un fil neutre part seul sur les
trois chemins.

```
« Merci, à bientôt » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
« J’ai une fuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
« Le robinet a fui » dans la DEMANDE d’origine (leads.message), cron => annulée (skipped 1, envoyee=true)
« Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ? » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
« Le robinet s’est mis à fuir » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
« Le ballon fuira bientôt » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
« Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ? » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
« Les tuyaux fuyaient » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (fuy)","cron":"annulée (skipped 1, envoyee=true)"}
passent encore => 0 / 14
```

Pourquoi ça tient : `enMots` passe le texte en minuscules, ôte les accents (NFD) et remplace tout ce qui n'est pas `[a-z0-9]` par une
espace (`lib/pilote/regles.ts:172`). Une racine est cherchée au **début** d'un mot (``mots.includes(` ${k}`)``, `:189`). Toutes les formes
de « fuir » commencent par `fui` ou `fuy`. Les apostrophes, quelles qu'elles soient, deviennent des espaces, comme celle du lexique.

## 2. Les formes que le correctif manque encore

```
⚠ PASSE « Le ballon perdait de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon a perdu de l’eau cette nuit » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Mon ballon perd beaucoup d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le ballon perd un peu d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le cumulus perd énormément d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Il y a des pertes d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
tient   « Les radiateurs perdent de l’eau » => {"sujet":"perdent de l’eau",…}      tient « Ça perd de l’eau » => {"sujet":"perd de l’eau",…}
⚠ PASSE « mon chauffe-eau perd de leau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Mon chauffe-eau perd d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Le robinet refuit depuis votre passage » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
⚠ PASSE « Ça refuit » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
tient   « Le robinet re-fuit » => fui ;  « Encore une refuite » => fuite (mot de l’artisan, lu n’importe où) ;  « Ça fuit à nouveau » => fui
⚠ PASSE « Une fiute sous l’évier » / « Une fuuite sous l’évier » / « Une fite sous l’évier » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
⚠ PASSE « My water heater is leaking » / « Tenho uma fuga de água » / « Hay una fuga de agua » => {"sujet":null,…,"cron":"PART SEULE (sent 1)"}
tient   « Vous fuyez vos responsabilités » => fuy ; « Il ne faut pas fuir ses responsabilités » => fui ; « Le fuyard » => fuy  (côté sûr)
passent => 16 / 54
```

Le complément `attaque-032-008-b.mjs` ajoute deux formes de la même famille, qui passent aussi : « Les radiateurs perdaient de l'eau » et
« Le ballon perd pas mal d'eau » (`sujetEscalade` rend `null`). Je n'ai pas rejoué ces deux-là sur les trois chemins. La section 3 montre que
les trois chemins rendent la même chose sur les 68 phrases jouées.

### E4 (élevé) — « perdre de l'eau » conjugué ou entrecoupé

- **Mécanisme** : `perd de l’eau` devient la clé `perd de l eau`, cherchée à partir d'un début de mot. « perdait de l eau » ne contient pas
  ` perd de l eau` (il faut « perd » suivi d'une espace). « a perdu de l eau » non plus. Un mot glissé (« perd **beaucoup** d eau »)
  rompt la chaîne. « pertes d eau » ne contient pas ` perte d eau` (le « s » est collé). Les mots par défaut de l'artisan
  (`urgence, fuite, degat des eaux, inondation, gaz, assurance`) ne contiennent rien de tout cela.
- **Pourquoi c'est élevé** : la règle du verdict demande un message ordinaire, écrit sans effort, qui fait partir sans clic une parole au
  nom de l'artisan sur un sujet d'escalade. « Mon ballon a perdu de l'eau cette nuit, pouvez-vous passer ? » remplit les trois conditions.
  La phrase est banale, le sujet est une fuite (nommée par le §3.2), et la sortie montre l'envoi sans clic sur les trois chemins. Je
  ne décide pas ici qu'une paraphrase est élevée : 032-007 l'a fait pour « perd de l'eau », et la session principale l'a suivi en la
  corrigeant avant le push (commentaire du lexique, `lib/pilote/regles.ts:153-155`). Ses formes ordinaires suivent son rang, comme « a fui »
  a suivi « fuit ».
- **Sur la limite** : 032-007 laissait la session principale redescendre la paraphrase en moyen. Si Benj ou la session principale décident
  par écrit que toute la famille « perdre de l'eau » est moyenne, E4 devient moyen, et rien d'autre dans ce rapport n'est élevé. Ce serait
  un choix de leur part. Selon la règle telle qu'elle est écrite et le précédent tel qu'il a été appliqué, E4 est élevé, et je ne l'abaisse
  pas pour faire « tenir » le correctif.
- **Antériorité** : avant le correctif, ces formes passaient déjà. Le correctif ne les aggrave pas, mais il les visait et ne les ferme pas.
- **Correctif proposé** : fermer la classe plutôt que d'ajouter une chaîne de plus. Dans `sujetEscalade`, après les deux listes, chercher
  dans `mots` (le texte passé par `enMots` et `FAUSSE_URGENCE`) :
  `/ (?:perd|pert)[a-z]*(?: [a-z]+){0,3}? (?:d |de l |de |l |d l )?l?eaux? /`. C'est toute forme de « perdre » ou de « perte », suivie à
  trois mots au plus de « eau ». Le motif ferme aussi M1. Joué sur une copie (section 7), il repère les 10 formes qui passent aujourd'hui.
  Il ne prend aucun des 9 messages ordinaires essayés (« perd de la pression », « j'ai perdu votre devis », « perte de temps », « je
  perds patience »…). Il prend 2 faux positifs, côté sûr : « J'ai perdu ma facture d'eau » et « Le ballon perd l'eau chaude au bout de
  5 minutes ». Il faut un essai et son mutant dans `securite-assistant-0211-qa` : les 8 formes d'E4 doivent rendre `escalade`, et le mutant
  sans le motif doit en laisser passer au moins une.

### Moyens

- **M1 — fautes sur la paraphrase** : « perd de leau » (apostrophe omise et mot collé, écriture de SMS) et « perd d'eau ». Ce sont des
  écarts d'orthographe sur une paraphrase : je les range en moyen. Le motif d'E4 les ferme (`l?eau`, `d `).
- **M2 — « refuit »** : « Le robinet refuit depuis votre passage », « Ça refuit ». Le préfixe colle « re » à la racine, et `fui` n'est plus
  au début du mot. « re-fuit » et « refuite » sont repérés. C'est une forme du verbe nommé, et la phrase type est à la fois une fuite et une
  réclamation sur le travail de l'artisan. Je la range en moyen, pas en élevé, parce qu'elle n'est pas prouvée courante : une recherche web
  sur « ça refuit », « robinet refuit » et « joint refuit » n'a rendu aucune page qui les emploie (les résultats parlent de « robinet qui
  fuit »). Correctif : ajouter `'refui'` et `'refuy'` à `MOTS_ESCALADE_TOUJOURS`. Aucun faux positif sur le corpus (« Refuge pour chats… »
  n'est pas pris, section 7).

### Faibles

- **F1 — fautes de frappe dans le mot** : « fiute », « fuuite », « fite ». Elles sont rares, et une lecture approchée (une lettre d'écart)
  serait pire que le mal : « suite » est à une lettre de « fuite » (« suite à votre devis »). Correctif possible : une courte liste de
  coquilles (`fiut`, `fuuit`). Je ne le recommande pas en priorité.
- **F2 — autres langues** : « leaking », « fuga ». La page de l'artisan et le produit sont en français, et le lexique par métier reste en
  vague 2 (plan §3 S3). Information.

## 3. Les trois chemins disent la même chose

```
écarts entre les trois chemins => 0
```

J'ai joué 68 phrases (les 14 de 032-007 et les 54 neuves). Pour chacune, le pilote, la réponse seule et le cron rendent le même sort :
les trois lisent `sujetEscalade` avec les mots de l'artisan, sans chemin oublié. Le cron lit aussi la demande d'origine (`leads.message`) :
« Le robinet a fui », placé dans la demande seulement, annule la relance (section 1, témoin).

## 4. `FAUSSE_URGENCE` ne masque aucune fuite vraie

```
tient « Pas urgent mais ça a fui » => fui              tient « Sans dégât, le ballon perd de l’eau » => perd de l’eau
tient « Aucune urgence : le joint a fui » => fui       tient « Pas de dégât des eaux, juste une petite fuite » => fuite
tient « Pas d’urgence. Ça fuyait hier » => fuy         tient « Pas urgentissime, ça fui sous l’évier » => fui
tient « Pas trop urgent, perte d’eau au compteur »      tient « Sans urgence perd de l’eau »   tient « pas urgent fuir »   tient « sans degat fui »
(13 / 13 repérées sur les trois chemins)
```

Le motif (`lib/pilote/regles.ts:177`) n'efface que « pas d'urgen… », « sans/aucune/rien d'urgen… », « pas urgent… », « sans/aucun/pas de
dégât(s) » et « une chute de neige… ». Aucune de ces formes ne contient `fui`, `fuy`, `perd` ni `pert`. Le remplacement n'efface que le
morceau trouvé, jamais la suite de la phrase.

## 5. Les faux positifs de `fui` et `fuy`, et leur coût

J'ai écrit un corpus fictif de 40 demandes d'un plombier-chauffagiste (section 5 de l'annexe C). Il compte 20 demandes ordinaires sans fuite,
10 demandes qui parlent d'une fuite sans urgence, et 10 pièges où un mot ressemble à `fui` ou `fuy`.

```
bilan => {"ordinaire":{"total":20,"a_la_main":6,"dont_fui_fuy":1},"fuite":{"total":10,"a_la_main":10,"dont_fui_fuy":6},"piege":{"total":10,"a_la_main":7,"dont_fui_fuy":3}}
demandes que fui/fuy (et seulement eux) font passer à la main => 9 : 6 vraies fuites (« fuit un peu », « a fui », « fuyait »…) et 3 pièges
  (« Mon regard est fuyant ? … », « Je fuis les entreprises qui ne répondent pas », « Le chauffagiste précédent a fui le chantier »)
« Je souhaite fuir le gaz et passer à la pompe à chaleur » (dans la demande) => annulée (skipped 1, envoyee=true) ; notification à l’artisan par le cron : 0 e-mail
```

- **Ce que `fui` et `fuy` ouvrent** : les faux positifs ajoutés ne viennent que du sens figuré (3 sur 40). Aucune des 20 demandes ordinaires
  n'est prise à cause d'eux. La seule qui contient « fuir » (« fuir le gaz ») est prise de toute façon par `gaz`, lu en mot entier et dans
  les mots de l'artisan. « anti-fuite » est pris par « fuite », comme avant le correctif. « fusible », « gouttière » et « s'est enfui » ne
  sont pas pris. Les 6 autres demandes qui passent à la main par `fui` sont de vraies fuites, et c'est voulu par le plan (§3 S3).
- **Le coût réel, inchangé dans sa nature** (032-007, « Faibles », point 2) : le cron **annule** la relance de conversation (`envoyee: true`)
  sans proposition ni mot à l'artisan (0 e-mail, `app/api/cron/relances/route.ts:139-144`). Sur ce corpus, **16 demandes sur 40** perdent
  ainsi leurs relances J+2, J+5 et J+10 : les 10 fuites, et 6 des 20 demandes ordinaires. Les racines `fui` et `fuy` n'en ajoutent que les
  3 pièges.
- **Faible, précisé (032-007, « Faibles », point 2)** : les demandes ordinaires prises viennent d'autres racines que celles d'E3. « Le
  **brûl**eur de ma chaudière » est pris par `brûl`. « chaudière **gaz** » est pris par `gaz`. « assurance décennale » est pris par
  `assurance`. « **Plus d'eau chaude** depuis ce matin » est pris tel quel. « Détecteur de **monoxyde** » est pris par `monoxyde`, et « une
  **goutte** de silicone » par `goutte`. Cela fait 6 demandes ordinaires sur 20, soit 30 % des demandes courantes d'un chauffagiste, qui
  perdent leurs relances sans que l'artisan le sache. Le correctif reste celui de 032-007 : une relance annulée devient une proposition
  notifiée. Ajouts possibles : `brûleur` en exception de `brûl` ; `gaz` hors de « chaudière gaz » ; « assurance décennale » et « attestation
  d'assurance » en exceptions.

## 6. Les mutants de `securite-assistant-0211-qa` sur E3

Lu dans la suite (`scripts/securite-assistant-0211-qa.mjs`) :
- **C6j** (`:920-926`) joue les 14 formes de 032-007 sur `sujetEscalade` et `decisionReponse`. Il exige 0 manque et 0 réponse seule.
  **Il n'a pas de mutant à lui.**
- **C6i** (`:916-918`) a un mutant : il retire la ligne entière (`'fui', 'fuy', 'perd de l’eau', …, 'urgen', 'urgemment'`), mais n'essaie
  dessus que « Mon robinet fuit », la cible d'E2.

J'ai rejoué l'assertion de C6j sur quatre mutants, copiés hors du dépôt (section 6 de l'annexe C) :

```
original => {"vert":true,"rates":0}
mutant « version 032-006 » (fuit, fuient, fuyait, fuyaient ; sans perd de l’eau), sujetEscalade seul => {"vert":false,"rates":13}
mutant « perd de l’eau » seul retiré => {"vert":false,"rates":3}
mutant « fuy » seul retiré => {"vert":false,"rates":1}
mutant C6i de la suite (ligne entière retirée), essai C6j rejoué dessus => {"vert":false,"rates":14}
```

- C6j **sait rougir** : il rougit sur chacun des quatre mutants, y compris le plus fin (`fuy` seul retiré : « Les tuyaux fuyaient » passe).
- **F3 (faible, couverture des essais)** : la suite ne joue aucun de ces mutants pour C6j. Aujourd'hui, la preuve que C6j peut rougir
  n'existe que dans ce rapport, et la règle du dépôt veut qu'une suite le prouve elle-même. De plus, C6j ne joue ni le pilote ni le cron.
  La section 3 montre qu'ils rendent la même chose, mais c'est une preuve d'audit, pas de suite. Correctif : un essai C6j-MUTANT (la
  version 032-006 de la ligne, qui doit laisser passer « a fui »). Et, avec E4, un essai C6l avec son mutant.

## 7. Le correctif proposé, joué sur une copie

Sortie de `attaque-032-008-b.mjs` (code 0). Les deux colonnes : `sujetEscalade` aujourd'hui, puis avec la proposition.

```
« Le ballon perdait de l’eau » => [null,"perdre/perte … eau"]          « Le ballon a perdu de l’eau cette nuit » => [null,"perdre/perte … eau"]
« Mon ballon perd beaucoup d’eau » => [null,"perdre/perte … eau"]      « Le ballon perd un peu d’eau » => [null,"perdre/perte … eau"]
« Le cumulus perd énormément d’eau » => [null,"perdre/perte … eau"]    « Il y a des pertes d’eau » => [null,"perdre/perte … eau"]
« Mon chauffe-eau perd d’eau » => [null,"perdre/perte … eau"]          « mon chauffe-eau perd de leau » => [null,"perdre/perte … eau"]
« Les radiateurs perdaient de l’eau » => [null,"perdre/perte … eau"]   « Le ballon perd pas mal d’eau » => [null,"perdre/perte … eau"]
« Le robinet refuit depuis votre passage » => [null,"refui"]          « Ça refuit » => [null,"refui"]
faux positifs : « La chaudière perd de la pression » => null ; « Je perds patience… » => null ; « J’ai perdu votre devis… » => null ;
  « La chaudière perd en pression » => null ; « Perte de temps… » => null ; « Je ne veux pas perdre du temps » => null ;
  « Mon ballon perd sa chaleur la nuit » => null ; « Je voudrais réduire mes pertes de chaleur » => null ; « Refuge pour chats… » => null ;
  « J’ai perdu ma facture d’eau » => pris (côté sûr) ; « Le ballon perd l’eau chaude au bout de 5 minutes » => pris (côté sûr)
```

## 8. La suite, jouée seule (02/11, hors ligne)

| Suite | Sortie (dernière ligne) | Code |
|---|---|---|
| `securite-assistant-0211-qa` | `136 PASS, 0 FAIL` (dont `PASS C6i MUTANT …`, `PASS C6j les 14 formes de 032-007 …`, `PASS C6k …`) | 0 |

Je n'ai joué qu'une suite, la seule que la tâche nomme ; une session tourne à côté, sur un PC de 8 Go. Aucune suite ne joue E4, M1 ni M2
(recherche de `perdait`, `perdu de`, `beaucoup d`, `pertes d`, `refuit` dans `scripts/*-qa.mjs` : trois résultats, tous sans rapport — `chef-qa.mjs:1055`, `pilotage-push-qa.mjs:10`, `pilote-qa.mjs:189`).

## Points à valider (session principale, Benj)

1. **E4, avant de dire « E3 fermé »** : remplacer les trois chaînes « perd de l'eau » par le motif de la section 7, et ajouter `'refui'` et
   `'refuy'`. Il faut un essai et son mutant. La correction ne fait que restreindre : 2 faux positifs sur 11, tous côté sûr.
2. Si Benj préfère ranger toute la famille « perdre de l'eau » en moyen (ce que 032-007 permettait pour la forme de base), c'est à lui de
   l'écrire. Ce rapport n'a alors plus de défaut élevé.
3. Le reste tient : toutes les formes de « fuir », les trois chemins alignés, `FAUSSE_URGENCE`. Après le correctif d'E4, un audit distinct
   sur E4 seul suffit.
4. Pour le lot suivant (avec ceux de 032-007, que je ne recopie pas) :
   - le mutant propre à C6j (F3) ;
   - les faux positifs ordinaires de la section 5 (`brûleur`, chaudière gaz, assurance décennale) ;
   - la relance annulée qui prévient l'artisan.

## Annexes — les scripts d'attaque (hors dépôt) et leurs sorties

Dossier temporaire de la session :
`C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-Documents-presti\ebe8e2e7-36cf-4536-817d-fbfa8d17f3ed\scratchpad\`.
Les scripts se lancent depuis la racine du dépôt : `node --experimental-strip-types --import ./scripts/ts-loader.mjs <script>`. Ils ne
lisent aucun secret (clés d'essai inventées, `RESEND_API_KEY` ôtée) et ne touchent pas au réseau. Leur dossier de copies est effacé en fin
de passage.

### Annexe A — `attaque-032-008.mjs`

```js
#!/usr/bin/env node
// Sixième audit 032-008 : le correctif E3 seul (« a fui », « fuir », « perd de l'eau »), rejoué en attaquant sur les TROIS chemins qui lisent
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

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-attaque-032-008-'))
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

  console.log('── 0. Témoins (le banc sait rougir) : un fil neutre part seul sur les trois chemins ; « J’ai une fuite » non')
  for (const p of ['Merci, à bientôt', 'J’ai une fuite']) console.log(`  « ${p} » => ${JSON.stringify(await troisChemins(p))}`)
  console.log(`  « J’ai une fuite » dans la DEMANDE d’origine (leads.message), cron => ${await relance('J’ai une fuite', { dansLaDemande: true })}`)
  console.log(`  « Le robinet a fui » dans la DEMANDE d’origine (leads.message), cron => ${await relance('Le robinet a fui', { dansLaDemande: true })}`)

  console.log('\n── 1. Les quatorze tournures de 032-007 (annexe B), sur les trois chemins')
  const E3 = ['Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ?', 'Le robinet a fui toute la nuit', 'Ça a fui sous l’évier',
    'Le ballon commence à fuir', 'Le robinet s’est mis à fuir', 'Le toit continue de fuir', 'Le joint va fuir', 'Le ballon fuira bientôt',
    'Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ?', 'Le ballon perd de l’eau par le bas', 'Ma chaudière perd de l’eau',
    'Mon ballon fuit', 'J’ai une fuite', 'Les tuyaux fuyaient']
  let n1 = 0
  for (const p of E3) { const r = await troisChemins(p); if (passe(r)) n1++; console.log(`  « ${p} » => ${JSON.stringify(r)}`) }
  console.log(`  passent encore => ${n1} / ${E3.length}`)

  console.log('\n── 2. Formes neuves : conjugaisons, fautes, apostrophes, majuscules, sans accent, « l’eau » collée, préfixes, autres langues')
  const neuves = [
    // conjugaisons et temps de « fuir »
    'Nous fuyons depuis hier (sic)', 'Le robinet fuirait encore', 'Les tuyaux ont fui', 'Le ballon avait fui', 'Les joints fuiront', 'Ça fuyait déjà avant', 'Le robinet fuyant', 'Je crains qu’il fuie', 'Les raccords fuient',
    // fautes courantes
    'Mon robinet fuie', 'Le robinet fuit pas', 'Ça fui', 'Sa fuit sous l’évier', 'sa fui de partout', 'Fuitte au plafond', 'Une fuitte', 'Le robinet fuis', 'Une fuiite', 'Une fiute sous l’évier', 'Une fuuite sous l’évier', 'Une fite sous l’évier',
    // apostrophes, majuscules, accents, ponctuation
'Mon chauffe-eau perd de l\'eau', 'Mon chauffe-eau perd de l’eau', 'Mon chauffe-eau perd de lʼeau', 'Mon chauffe-eau perd de l`eau', 'MON CHAUFFE-EAU PERD DE L’EAU', 'Mon chauffe eau perd de l eau', 'mon chauffe-eau perd de leau', 'Mon chauffe-eau perd d’eau', 'FUITE !!!', 'FUÎTE sous l’évier', '#fuite', 'fuite?', 'Il y a une perte d’eau', 'Il y a des pertes d’eau', 'Perte d\'eau au compteur',
    // « perdre de l'eau » conjugué ou entrecoupé
    'Le ballon perdait de l’eau', 'Le ballon a perdu de l’eau cette nuit', 'Les radiateurs perdent de l’eau', 'Mon ballon perd beaucoup d’eau', 'Le ballon perd un peu d’eau', 'Ça perd de l’eau', 'Le cumulus perd énormément d’eau',
    // préfixes
    'Le robinet refuit depuis votre passage', 'Ça refuit', 'Le robinet re-fuit', 'Encore une refuite', 'Ça fuit à nouveau',
    // sens figuré (côté sûr attendu : escalade)
    'Vous fuyez vos responsabilités', 'Il ne faut pas fuir ses responsabilités', 'Le fuyard',
    // autres langues (client non francophone)
    'My water heater is leaking', 'Tenho uma fuga de água', 'Hay una fuga de agua',
  ]
  let n2 = 0
  const manques = []
  for (const p of neuves) { const r = await troisChemins(p); if (passe(r)) { n2++; manques.push(p) } console.log(`  ${passe(r) ? '⚠ PASSE' : 'tient  '} « ${p} » => ${JSON.stringify(r)}`) }
  console.log(`  passent => ${n2} / ${neuves.length} : ${JSON.stringify(manques)}`)

  console.log('\n── 3. Les trois chemins disent-ils la même chose ? (un écart serait un chemin oublié)')
  let ecarts = 0
  for (const p of [...E3, ...neuves]) { const r = await troisChemins(p); const v = [r.pilote === 'PART SEULE', r.reponse_seule === 'PART SEULE', r.cron.startsWith('PART')]; if (new Set(v).size > 1) { ecarts++; console.log(`  écart « ${p} » => ${JSON.stringify(r)}`) } }
  console.log(`  écarts entre les trois chemins => ${ecarts}`)

  console.log('\n── 4. FAUSSE_URGENCE peut-elle masquer une vraie fuite ?')
  for (const p of ['Pas urgent mais ça a fui', 'Pas urgent, mais le robinet s’est mis à fuir', 'Sans dégât, le ballon perd de l’eau', 'Sans dégâts mais ça fuit encore', 'Aucune urgence : le joint a fui', 'Rien d’urgent, le ballon fuira bientôt', 'Pas de dégât des eaux, juste une petite fuite', 'Pas d’urgence. Ça fuyait hier', 'Pas urgentissime, ça fui sous l’évier', 'Pas trop urgent, perte d’eau au compteur', 'Sans urgence perd de l’eau', 'pas urgent fuir', 'sans degat fui']) {
    const r = await troisChemins(p); console.log(`  ${passe(r) ? '⚠ PASSE' : 'tient  '} « ${p} » => ${JSON.stringify(r)}`)
  }

  console.log('\n── 5. Faux positifs : petit corpus FICTIF de 40 demandes d’un plombier-chauffagiste (aucune donnée réelle)')
  const corpus = [
    // A. vingt demandes ordinaires SANS fuite ni sujet sensible
    ['ordinaire', 'Bonjour, je voudrais un devis pour refaire ma salle de bain'], ['ordinaire', 'Pouvez-vous installer un mitigeur thermostatique dans la douche ?'],
    ['ordinaire', 'Remplacement d’un WC suspendu, quel délai ?'], ['ordinaire', 'Je souhaite remplacer mon ballon d’eau chaude de 200 L'],
    ['ordinaire', 'Entretien annuel de ma chaudière à condensation'], ['ordinaire', 'Devis pour une chaudière gaz à remplacer'],
    ['ordinaire', 'Installer un adoucisseur d’eau, c’est possible ?'], ['ordinaire', 'Mon évier se bouche souvent, pouvez-vous déboucher ?'],
    ['ordinaire', 'Je voudrais une douche à l’italienne à la place de la baignoire'], ['ordinaire', 'Le brûleur de ma chaudière fait du bruit au démarrage'],
    ['ordinaire', 'Pouvez-vous poser un radiateur dans la chambre ?'], ['ordinaire', 'Je cherche un plombier pour une rénovation complète'],
    ['ordinaire', 'Avez-vous une assurance décennale ? J’en ai besoin pour mon dossier'], ['ordinaire', 'Plus d’eau chaude depuis ce matin, pouvez-vous passer cette semaine ?'],
    ['ordinaire', 'Pose d’un lave-mains dans les toilettes'], ['ordinaire', 'Raccordement d’un lave-vaisselle neuf'],
    ['ordinaire', 'Je veux un détecteur de monoxyde de carbone avec la nouvelle chaudière'], ['ordinaire', 'Changement du groupe de sécurité du cumulus'],
    ['ordinaire', 'Pompe à chaleur : faites-vous l’installation ?'], ['ordinaire', 'Je souhaite fuir le gaz et passer à la pompe à chaleur'],
    // B. dix demandes qui parlent d'une fuite, sans urgence (voulues à la main par le plan, §3 S3 : le coût assumé)
    ['fuite', 'Recherche de fuite sur mon réseau d’eau, facture d’eau très élevée'], ['fuite', 'Petite fuite sur la chasse d’eau, rien de grave'],
    ['fuite', 'Le robinet de la cuisine fuit un peu, à changer'], ['fuite', 'Le joint du siphon a fui, je l’ai resserré, mais je voudrais un contrôle'],
    ['fuite', 'Mon ballon perd de l’eau par le groupe de sécurité, est-ce normal ?'], ['fuite', 'Fuite au compteur, la régie m’a dit d’appeler un plombier'],
    ['fuite', 'La douche fuit par le joint de silicone'], ['fuite', 'Le WC fuit à la base'],
    ['fuite', 'Devis pour reprendre une évacuation qui fuyait'], ['fuite', 'Le radiateur fuit un peu au purgeur'],
    // C. dix demandes ordinaires où un mot courant RESSEMBLE à fui/fuy ou à un autre sujet (pièges)
    ['piege', 'Je veux un robinet anti-fuite pour la machine à laver'], ['piege', 'Mon regard est fuyant ? non, je plaisante : devis pour un lavabo'],
    ['piege', 'Joint anti-fuites pour la douche, vous en vendez ?'], ['piege', 'Un fusible a grillé sur le chauffe-eau'],
    ['piege', 'Devis pour une gouttière en zinc'], ['piege', 'Le chat s’est enfui pendant les travaux, fermez bien la porte svp'],
    ['piege', 'Je fuis les entreprises qui ne répondent pas : vous êtes dispo ?'], ['piege', 'Une goutte de silicone a coulé sur le carrelage'],
    ['piege', 'Le chauffagiste précédent a fui le chantier, pouvez-vous reprendre ?'], ['piege', 'J’ai besoin d’une expertise pour mon assurance habitation'],
  ]
  const groupes = {}
  for (const [g, p] of corpus) {
    const s = R.sujetEscalade([p], mots)
    const viaFui = / fui| fuy/.test(` ${p.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `)
    ;(groupes[g] ??= { total: 0, a_la_main: 0, dont_fui_fuy: 0 }).total++
    if (s) groupes[g].a_la_main++
    if (s && (s === 'fui' || s === 'fuy')) groupes[g].dont_fui_fuy++
    console.log(`  [${g}] « ${p} » => ${s ?? 'part seule'}${viaFui && s !== 'fui' && s !== 'fuy' ? ' (fui/fuy présent, pris par un autre mot avant)' : ''}`)
  }
  console.log(`  bilan => ${JSON.stringify(groupes)}`)
  // Qu'apportent fui/fuy SEULS sur le corpus (le même lexique sans ces deux racines, et sans les mots de l'artisan qui lisent « fuite » partout) ?
  const R0 = await copie('lib/pilote/regles.ts', { remplacer: [["  'fui', 'fuy', 'perd de l’eau'", "  'perd de l’eau'"]] })
  const neufsParFui = corpus.filter(([, p]) => R.sujetEscalade([p], mots) && !R0.sujetEscalade([p], mots))
  console.log(`  demandes que fui/fuy (et seulement eux) font passer à la main => ${neufsParFui.length} : ${JSON.stringify(neufsParFui)}`)
  console.log('  coût réel sur le cron (Signature) : la relance de conversation d’une demande ordinaire prise par fui/fuy')
  for (const p of ['Je souhaite fuir le gaz et passer à la pompe à chaleur', 'Le chauffagiste précédent a fui le chantier, pouvez-vous reprendre ?']) console.log(`    « ${p} » (dans la demande) => ${await relance(p, { dansLaDemande: true })} ; notification à l’artisan par le cron : ${globalThis.__ENVOIS.length} e-mail`)

  console.log('\n── 6. Mutants : C6j (les formes de 032-007) rougit-il si le correctif E3 est retiré ?')
  const essaiC6j = (M, P) => {
    const E3t = ['Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ?', 'Le robinet a fui toute la nuit', 'Ça a fui sous l’évier', 'Le ballon commence à fuir', 'Le robinet s’est mis à fuir',
      'Le toit continue de fuir', 'Le joint va fuir', 'Le ballon fuira bientôt', 'Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ?', 'Le ballon perd de l’eau par le bas', 'Ma chaudière perd de l’eau',
      'Mon robinet fuie', 'Ça fui', 'Les tuyaux fuyaient']
    const rates = E3t.filter((m) => M.sujetEscalade([m], []) === null)
    const auto3 = E3t.map((m) => P.decisionReponse({ plan: 'signature', leads_pause: false }, { prise_en_main: false }, cfgAuto, { nbReponsesIA: 0, message: m })).filter((d) => d.ok === true)
    return { vert: rates.length === 0 && auto3.length === 0, rates: rates.length }
  }
  console.log(`  original => ${JSON.stringify(essaiC6j(R, PC))}`)
  const M032006 = await copie('lib/pilote/regles.ts', { remplacer: [["  'fui', 'fuy', 'perd de l’eau', 'perdent de l’eau', 'perte d’eau', 'urgen', 'urgemment',", "  'fuit', 'fuient', 'fuyait', 'fuyaient', 'urgen', 'urgemment',"]] })
  console.log(`  mutant « version 032-006 » (fuit, fuient, fuyait, fuyaient ; sans perd de l’eau), sujetEscalade seul => ${JSON.stringify(essaiC6j(M032006, PC))}`)
  const MsansPerd = await copie('lib/pilote/regles.ts', { remplacer: [["'perd de l’eau', 'perdent de l’eau', 'perte d’eau', ", '']] })
  console.log(`  mutant « perd de l’eau » seul retiré => ${JSON.stringify(essaiC6j(MsansPerd, PC))}`)
  const MsansFuy = await copie('lib/pilote/regles.ts', { remplacer: [["  'fui', 'fuy', ", "  'fui', "]] })
  console.log(`  mutant « fuy » seul retiré => ${JSON.stringify(essaiC6j(MsansFuy, PC))}`)
  // Le mutant C6i de la suite : sa ligne retirée en entier ; il n'essaie que « Mon robinet fuit ».
  const MC6i = await copie('lib/pilote/regles.ts', { remplacer: [["  'fui', 'fuy', 'perd de l’eau', 'perdent de l’eau', 'perte d’eau', 'urgen', 'urgemment',\n", '']] })
  console.log(`  mutant C6i de la suite (ligne entière retirée), essai C6j rejoué dessus => ${JSON.stringify(essaiC6j(MC6i, PC))}`)
} catch (e) {
  console.error('ERREUR DU SCRIPT :', e)
  process.exitCode = 1
} finally {
  fs.rmSync(TMP, { recursive: true, force: true })
}
```

### Annexe B — `attaque-032-008-b.mjs`

```js
#!/usr/bin/env node
// 032-008, complément : le correctif proposé, joué sur une copie de la règle (rien n'est écrit dans le dépôt). Pur : aucune base, aucun réseau.
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs <ce fichier>
import path from 'node:path'
import { pathToFileURL } from 'node:url'
process.removeAllListeners('warning'); process.on('warning', () => {})
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://base.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-essai'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-essai'
globalThis.fetch = async (u) => { throw new Error(`réseau interdit : ${u}`) }
const R = await import(pathToFileURL(path.join(process.cwd(), 'lib/pilote/regles.ts')).href)
const PC = await import(pathToFileURL(path.join(process.cwd(), 'lib/plateformeConfig.ts')).href)
const mots = PC.CONFIG_DEFAUT.escalade_mots
const enMots = (s) => ` ${String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `
// Proposition : toute forme de « perdre » ou « perte », suivie à trois mots au plus de « eau » (d', de l', « leau » collé) ; et « refui », « refuy ».
const PERDRE_EAU = / (?:perd|pert)[a-z]*(?: [a-z]+){0,3}? (?:d |de l |de |l |d l )?l?eaux? /
const propose = (m) => R.sujetEscalade([m], mots) ?? (PERDRE_EAU.test(enMots(m)) ? 'perdre/perte … eau' : / refui| refuy/.test(enMots(m)) ? 'refui' : null)
const log = (e, v) => console.log(`${e} => ${JSON.stringify(v)}`)
console.log('── Les formes qui passent aujourd’hui (section 2 de attaque-032-008.mjs) : aujourd’hui / avec la proposition')
for (const p of ['Le ballon perdait de l’eau', 'Le ballon a perdu de l’eau cette nuit', 'Mon ballon perd beaucoup d’eau', 'Le ballon perd un peu d’eau', 'Le cumulus perd énormément d’eau',
  'Il y a des pertes d’eau', 'Mon chauffe-eau perd d’eau', 'mon chauffe-eau perd de leau', 'Les radiateurs perdaient de l’eau', 'Le ballon perd pas mal d’eau', 'Le robinet refuit depuis votre passage', 'Ça refuit'])
  log(`  « ${p} »`, [R.sujetEscalade([p], mots), propose(p)])
console.log('── Faux positifs de la proposition (ordinaires d’un plombier ; null attendu, ou côté sûr signalé)')
for (const p of ['La chaudière perd de la pression', 'Je perds patience avec mon ancien plombier', 'J’ai perdu votre devis, pouvez-vous le renvoyer ?', 'La chaudière perd en pression',
  'Perte de temps avec l’ancien artisan', 'Je ne veux pas perdre du temps', 'Mon ballon perd sa chaleur la nuit', 'J’ai perdu ma facture d’eau', 'Le ballon perd l’eau chaude au bout de 5 minutes',
  'Je voudrais réduire mes pertes de chaleur', 'Refuge pour chats à côté du chantier'])
  log(`  « ${p} »`, propose(p))
```

### Annexe C — sortie de `attaque-032-008.mjs` (code 0 ; l'avertissement MODULE_TYPELESS_PACKAGE_JSON de Node est ôté)

```
── 0. Témoins (le banc sait rougir) : un fil neutre part seul sur les trois chemins ; « J’ai une fuite » non
  « Merci, à bientôt » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  « J’ai une fuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  « J’ai une fuite » dans la DEMANDE d’origine (leads.message), cron => annulée (skipped 1, envoyee=true)
  « Le robinet a fui » dans la DEMANDE d’origine (leads.message), cron => annulée (skipped 1, envoyee=true)

── 1. Les quatorze tournures de 032-007 (annexe B), sur les trois chemins
  « Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ? » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le robinet a fui toute la nuit » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Ça a fui sous l’évier » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le ballon commence à fuir » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le robinet s’est mis à fuir » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le toit continue de fuir » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le joint va fuir » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le ballon fuira bientôt » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ? » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  « Le ballon perd de l’eau par le bas » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  « Ma chaudière perd de l’eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  « Mon ballon fuit » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  « J’ai une fuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  « Les tuyaux fuyaient » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (fuy)","cron":"annulée (skipped 1, envoyee=true)"}
  passent encore => 0 / 14

── 2. Formes neuves : conjugaisons, fautes, apostrophes, majuscules, sans accent, « l’eau » collée, préfixes, autres langues
  tient   « Nous fuyons depuis hier (sic) » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (fuy)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le robinet fuirait encore » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Les tuyaux ont fui » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le ballon avait fui » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Les joints fuiront » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Ça fuyait déjà avant » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (fuy)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le robinet fuyant » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (fuy)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Je crains qu’il fuie » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Les raccords fuient » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon robinet fuie » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le robinet fuit pas » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Ça fui » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Sa fuit sous l’évier » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « sa fui de partout » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Fuitte au plafond » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Une fuitte » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le robinet fuis » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Une fuiite » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Une fiute sous l’évier » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Une fuuite sous l’évier » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Une fite sous l’évier » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Mon chauffe-eau perd de l'eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon chauffe-eau perd de l’eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon chauffe-eau perd de lʼeau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon chauffe-eau perd de l`eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « MON CHAUFFE-EAU PERD DE L’EAU » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Mon chauffe eau perd de l eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « mon chauffe-eau perd de leau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Mon chauffe-eau perd d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « FUITE !!! » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « FUÎTE sous l’évier » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « #fuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « fuite? » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Il y a une perte d’eau » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Il y a des pertes d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Perte d'eau au compteur » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Le ballon perdait de l’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon a perdu de l’eau cette nuit » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Les radiateurs perdent de l’eau » => {"sujet":"perdent de l’eau","pilote":"à la main","reponse_seule":"escalade (perdent de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Mon ballon perd beaucoup d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le ballon perd un peu d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Ça perd de l’eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « Le cumulus perd énormément d’eau » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Le robinet refuit depuis votre passage » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Ça refuit » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  tient   « Le robinet re-fuit » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Encore une refuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Ça fuit à nouveau » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Vous fuyez vos responsabilités » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (fuy)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Il ne faut pas fuir ses responsabilités » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Le fuyard » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (fuy)","cron":"annulée (skipped 1, envoyee=true)"}
  ⚠ PASSE « My water heater is leaking » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Tenho uma fuga de água » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  ⚠ PASSE « Hay una fuga de agua » => {"sujet":null,"pilote":"PART SEULE","reponse_seule":"PART SEULE","cron":"PART SEULE (sent 1)"}
  passent => 16 / 54 : ["Une fiute sous l’évier","Une fuuite sous l’évier","Une fite sous l’évier","mon chauffe-eau perd de leau","Mon chauffe-eau perd d’eau","Il y a des pertes d’eau","Le ballon perdait de l’eau","Le ballon a perdu de l’eau cette nuit","Mon ballon perd beaucoup d’eau","Le ballon perd un peu d’eau","Le cumulus perd énormément d’eau","Le robinet refuit depuis votre passage","Ça refuit","My water heater is leaking","Tenho uma fuga de água","Hay una fuga de agua"]

── 3. Les trois chemins disent-ils la même chose ? (un écart serait un chemin oublié)
  écarts entre les trois chemins => 0

── 4. FAUSSE_URGENCE peut-elle masquer une vraie fuite ?
  tient   « Pas urgent mais ça a fui » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas urgent, mais le robinet s’est mis à fuir » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Sans dégât, le ballon perd de l’eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (perd de l’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Sans dégâts mais ça fuit encore » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Aucune urgence : le joint a fui » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (urgence)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Rien d’urgent, le ballon fuira bientôt » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas de dégât des eaux, juste une petite fuite » => {"sujet":"fuite","pilote":"à la main","reponse_seule":"escalade (fuite)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas d’urgence. Ça fuyait hier » => {"sujet":"fuy","pilote":"à la main","reponse_seule":"escalade (urgence)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas urgentissime, ça fui sous l’évier » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Pas trop urgent, perte d’eau au compteur » => {"sujet":"perte d’eau","pilote":"à la main","reponse_seule":"escalade (perte d’eau)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « Sans urgence perd de l’eau » => {"sujet":"perd de l’eau","pilote":"à la main","reponse_seule":"escalade (urgence)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « pas urgent fuir » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}
  tient   « sans degat fui » => {"sujet":"fui","pilote":"à la main","reponse_seule":"escalade (fui)","cron":"annulée (skipped 1, envoyee=true)"}

── 5. Faux positifs : petit corpus FICTIF de 40 demandes d’un plombier-chauffagiste (aucune donnée réelle)
  [ordinaire] « Bonjour, je voudrais un devis pour refaire ma salle de bain » => part seule
  [ordinaire] « Pouvez-vous installer un mitigeur thermostatique dans la douche ? » => part seule
  [ordinaire] « Remplacement d’un WC suspendu, quel délai ? » => part seule
  [ordinaire] « Je souhaite remplacer mon ballon d’eau chaude de 200 L » => part seule
  [ordinaire] « Entretien annuel de ma chaudière à condensation » => part seule
  [ordinaire] « Devis pour une chaudière gaz à remplacer » => gaz
  [ordinaire] « Installer un adoucisseur d’eau, c’est possible ? » => part seule
  [ordinaire] « Mon évier se bouche souvent, pouvez-vous déboucher ? » => part seule
  [ordinaire] « Je voudrais une douche à l’italienne à la place de la baignoire » => part seule
  [ordinaire] « Le brûleur de ma chaudière fait du bruit au démarrage » => brûl
  [ordinaire] « Pouvez-vous poser un radiateur dans la chambre ? » => part seule
  [ordinaire] « Je cherche un plombier pour une rénovation complète » => part seule
  [ordinaire] « Avez-vous une assurance décennale ? J’en ai besoin pour mon dossier » => assurance
  [ordinaire] « Plus d’eau chaude depuis ce matin, pouvez-vous passer cette semaine ? » => plus d’eau chaude
  [ordinaire] « Pose d’un lave-mains dans les toilettes » => part seule
  [ordinaire] « Raccordement d’un lave-vaisselle neuf » => part seule
  [ordinaire] « Je veux un détecteur de monoxyde de carbone avec la nouvelle chaudière » => monoxyde
  [ordinaire] « Changement du groupe de sécurité du cumulus » => part seule
  [ordinaire] « Pompe à chaleur : faites-vous l’installation ? » => part seule
  [ordinaire] « Je souhaite fuir le gaz et passer à la pompe à chaleur » => fui
  [fuite] « Recherche de fuite sur mon réseau d’eau, facture d’eau très élevée » => fuite (fui/fuy présent, pris par un autre mot avant)
  [fuite] « Petite fuite sur la chasse d’eau, rien de grave » => fuite (fui/fuy présent, pris par un autre mot avant)
  [fuite] « Le robinet de la cuisine fuit un peu, à changer » => fui
  [fuite] « Le joint du siphon a fui, je l’ai resserré, mais je voudrais un contrôle » => fui
  [fuite] « Mon ballon perd de l’eau par le groupe de sécurité, est-ce normal ? » => perd de l’eau
  [fuite] « Fuite au compteur, la régie m’a dit d’appeler un plombier » => fuite (fui/fuy présent, pris par un autre mot avant)
  [fuite] « La douche fuit par le joint de silicone » => fui
  [fuite] « Le WC fuit à la base » => fui
  [fuite] « Devis pour reprendre une évacuation qui fuyait » => fuy
  [fuite] « Le radiateur fuit un peu au purgeur » => fui
  [piege] « Je veux un robinet anti-fuite pour la machine à laver » => fuite (fui/fuy présent, pris par un autre mot avant)
  [piege] « Mon regard est fuyant ? non, je plaisante : devis pour un lavabo » => fuy
  [piege] « Joint anti-fuites pour la douche, vous en vendez ? » => fuite (fui/fuy présent, pris par un autre mot avant)
  [piege] « Un fusible a grillé sur le chauffe-eau » => part seule
  [piege] « Devis pour une gouttière en zinc » => part seule
  [piege] « Le chat s’est enfui pendant les travaux, fermez bien la porte svp » => part seule
  [piege] « Je fuis les entreprises qui ne répondent pas : vous êtes dispo ? » => fui
  [piege] « Une goutte de silicone a coulé sur le carrelage » => goutte
  [piege] « Le chauffagiste précédent a fui le chantier, pouvez-vous reprendre ? » => fui
  [piege] « J’ai besoin d’une expertise pour mon assurance habitation » => assurance
  bilan => {"ordinaire":{"total":20,"a_la_main":6,"dont_fui_fuy":1},"fuite":{"total":10,"a_la_main":10,"dont_fui_fuy":6},"piege":{"total":10,"a_la_main":7,"dont_fui_fuy":3}}
  demandes que fui/fuy (et seulement eux) font passer à la main => 9 : [["fuite","Le robinet de la cuisine fuit un peu, à changer"],["fuite","Le joint du siphon a fui, je l’ai resserré, mais je voudrais un contrôle"],["fuite","La douche fuit par le joint de silicone"],["fuite","Le WC fuit à la base"],["fuite","Devis pour reprendre une évacuation qui fuyait"],["fuite","Le radiateur fuit un peu au purgeur"],["piege","Mon regard est fuyant ? non, je plaisante : devis pour un lavabo"],["piege","Je fuis les entreprises qui ne répondent pas : vous êtes dispo ?"],["piege","Le chauffagiste précédent a fui le chantier, pouvez-vous reprendre ?"]]
  coût réel sur le cron (Signature) : la relance de conversation d’une demande ordinaire prise par fui/fuy
    « Je souhaite fuir le gaz et passer à la pompe à chaleur » (dans la demande) => annulée (skipped 1, envoyee=true) ; notification à l’artisan par le cron : 0 e-mail
    « Le chauffagiste précédent a fui le chantier, pouvez-vous reprendre ? » (dans la demande) => annulée (skipped 1, envoyee=true) ; notification à l’artisan par le cron : 0 e-mail

── 6. Mutants : C6j (les formes de 032-007) rougit-il si le correctif E3 est retiré ?
  original => {"vert":true,"rates":0}
  mutant « version 032-006 » (fuit, fuient, fuyait, fuyaient ; sans perd de l’eau), sujetEscalade seul => {"vert":false,"rates":13}
  mutant « perd de l’eau » seul retiré => {"vert":false,"rates":3}
  mutant « fuy » seul retiré => {"vert":false,"rates":1}
  mutant C6i de la suite (ligne entière retirée), essai C6j rejoué dessus => {"vert":false,"rates":14}
```

### Annexe D — sortie de `attaque-032-008-b.mjs` (code 0)

```
── Les formes qui passent aujourd’hui (section 2 de attaque-032-008.mjs) : aujourd’hui / avec la proposition
  « Le ballon perdait de l’eau » => [null,"perdre/perte … eau"]
  « Le ballon a perdu de l’eau cette nuit » => [null,"perdre/perte … eau"]
  « Mon ballon perd beaucoup d’eau » => [null,"perdre/perte … eau"]
  « Le ballon perd un peu d’eau » => [null,"perdre/perte … eau"]
  « Le cumulus perd énormément d’eau » => [null,"perdre/perte … eau"]
  « Il y a des pertes d’eau » => [null,"perdre/perte … eau"]
  « Mon chauffe-eau perd d’eau » => [null,"perdre/perte … eau"]
  « mon chauffe-eau perd de leau » => [null,"perdre/perte … eau"]
  « Les radiateurs perdaient de l’eau » => [null,"perdre/perte … eau"]
  « Le ballon perd pas mal d’eau » => [null,"perdre/perte … eau"]
  « Le robinet refuit depuis votre passage » => [null,"refui"]
  « Ça refuit » => [null,"refui"]
── Faux positifs de la proposition (ordinaires d’un plombier ; null attendu, ou côté sûr signalé)
  « La chaudière perd de la pression » => null
  « Je perds patience avec mon ancien plombier » => null
  « J’ai perdu votre devis, pouvez-vous le renvoyer ? » => null
  « La chaudière perd en pression » => null
  « Perte de temps avec l’ancien artisan » => null
  « Je ne veux pas perdre du temps » => null
  « Mon ballon perd sa chaleur la nuit » => null
  « J’ai perdu ma facture d’eau » => "perdre/perte … eau"
  « Le ballon perd l’eau chaude au bout de 5 minutes » => "perdre/perte … eau"
  « Je voudrais réduire mes pertes de chaleur » => null
  « Refuge pour chats à côté du chantier » => null
```
