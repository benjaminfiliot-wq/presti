# 032-015 — huitième audit offensif : E4, E5 et le lot 032-009, avant le push (02/11/2026)

Auditeur : Claude Code (claude-code), sur le serveur Oracle (`/home/usine/Documents/presti`). Je n'ai écrit ni E4/E5, ni 032-009, ni
les audits d'avant. Lecture seule : je n'ai rien modifié hors de `.orchestre/preuves/032-015/`. Je n'ai fait ni commit, ni push, ni build,
ni typecheck, ni migration. Je n'ai joué aucune suite contre la production et n'ai créé aucun compte. Je n'ai rien écrit dans le cerveau ni
dans le vault. Les comptes, fils, montants et messages des essais sont tous inventés. Les scripts d'attaque sont dans
`/tmp/audit-032-015/`, hors du dépôt ; leur code et leurs sorties sont en annexe.

**Réseau neuronal.** J'ai appelé `regles_pour` sur « auditer l'assistant, le pilote, les relances d'impayés, les factures et l'escalade
avant un push ». Il rend trois rappels :
- le pilote est réservé à Signature, avec 10 minutes d'annulation (`memoire-presti/pilote-auto-aide-2110.md`) ;
- « poussé n'est pas déployé » ;
- « Studio prépare, Signature envoie » (`regles-presti/autonomie-abonnements.md`).

J'ai lu aussi :
- le §3.2 du prompt de Benj (`p3-assistant.md:552-553`) : « Ces gestes restent des **cartes**, toujours » ;
- le plan : §0 (« ces correctifs ne font que restreindre »), §3 S3 et §13 ;
- le résumé de `032-009` ;
- les rapports de `032-008` et `032-011` (classement, F5) et la tâche `032-009` (`fait/032-009.md:38-39`).

**Base de comparaison.** `74db706a` n'existe pas dans cette copie. `HEAD` (`5cb575d`, « base : HEAD 74db706a du PC + travail en cours »)
porte `lib/` tel qu'en production : E4, E5 et tout le lot 032-009 sont dans l'arbre de travail, d'après `032-009/resume.md`, l.137-138.
`git diff -w --ignore-cr-at-eol HEAD -- lib/` compte **531 lignes**. La « production » des essais est donc `git show HEAD:<fichier>`, chargé
hors du dépôt par la fonction `base()` des annexes.

VERDICT : NE TIENT PAS

## Bilan

| # | Défaut | Gravité | Preuve |
|---|---|---|---|
| R1 | **Régression des impayés.** La « contestation » lit aussi la **demande d'origine du chantier**, et celle de tout autre dossier du même e-mail. « J'ai une fuite sous l'évier », « mon robinet goutte », « c'est urgent » arrêtent les relances d'une facture que personne ne conteste. Signature n'envoie plus, Studio ne prépare plus. L'artisan lit « le client a répondu », ce qui est faux, et une reprise est réarrêtée au passage suivant. | **ÉLEVÉ** (régression) | §1 ; annexe E |
| M1 | `NOMS_NEUTRES` masque de vrais sujets que la production voyait : « La chaudière gaz sent fort », « Le brûleur s'est enflammé », l'attestation décennale suivie de « les fissures sont revenues ». Il masque aussi les mots de l'artisan (« brûleur », « décennale »). | moyen | §3 ; annexe F, L3-L4 |
| M2 | Formes voisines de la fuite encore manquées sur les trois chemins : « de l'eau au plafond », « tache d'eau au plafond », « plafond mouillé », « flaque d'eau », « mur trempé », « ça mouille », « de l'eau dans la cave », « le ballon pisse », « la chasse d'eau perd en continu ». | moyen (synonymes, classement de 032-011) | §2 ; annexe F, L1 |
| M3 | « Fait tout seul » : l'escalade n'est relue que pour les 6 outils pilotables. `demander_avis` et `envoyer_rappel_entretien` partent d'office sur un fil en litige. Une facture sans devis n'est pas rattachée à la conversation du client. | moyen (voisin, déjà là en production) | §4 |
| M4 | Graphies TTC encore lues comme HT : « le prix TTC est de 450 € », « 450 € TVA 10 % comprise », « 450 € TVA 20% incluse », « 450 € avec la TVA », « 450 € tout compris ». | moyen (déjà là en production ; classement de 032-007) | §5 ; annexe F, T1 |
| F1 | Faux positifs neufs du lexique : « humide » (VMC, cave), « odeur » (égout, vernis), « ça sent », « suis pressé » / « c'est pressé », « l'eau sort tiède ». Sur 27 demandes ordinaires, ce lot en ferme 12 et en rouvre 4. Coût : réponse et relance de prospect à la main ou annulées ; pour les impayés, voir R1. | faible (F5) | §3 ; annexe F, L2 |
| F2 | `REPORT` change de vrais ordres en cartes : « le client **qui vient** de m'écrire », « ça fait **un moment** », « M. **Midi** », « vers 10h » dans une description. `DATE_QUI_DECRIT` ouvre « Relance la pose le 3 décembre » et « Relance la livraison le 15 ». | faible | §6 ; annexe F, K1-K2 |

E4 et E5 **tiennent** : les 14 formes de la famille, de 032-008 et 032-011, sont toutes vues, et le chemin de la réponse seule suit le même
lexique (§2). Les mutants des correctifs existent et rougissent (§7). R1, seul, fait le verdict.

## 1. R1 (élevé) — les impayés s'arrêtent sur la demande d'origine du chantier

**Ce que la tâche demandait** (`fait/032-009.md:38-39`) : `sujetEscalade` « sur les **messages entrants** du dossier, quelle qu'en soit la
date ».

**Ce qui a été posé** (`lib/relancesImpayesMagasin.ts:77-82`) :
- les 50 derniers messages entrants ;
- **plus** `leads.message`, la demande d'origine, de **tous** les dossiers rattachés. Ces dossiers sont celui du devis, et chaque lead
  dont le `contact` vaut l'e-mail du client (`:67`) ;
- tout cela passe par le lexique de l'escalade.

Or la demande d'origine d'un plombier **décrit le chantier** : une fuite, un robinet qui goutte, une urgence. Un sujet trouvé rend `true`.
Le passage pose alors un arrêt `reponse_client` (`lib/relancesImpayesTour.ts:98-100`), et l'écran affiche « Relances arrêtées : **le client
a répondu** » (`lib/relancesImpayes.ts:266`).

**Rejoué** sur le vrai passage (`tourRelancesImpayes`) et le vrai magasin, avec la doublure PostgREST de la suite :
- production (`git show HEAD:`) contre arbre, même scénario que C10a : facture échue le 15/10, passage à J+3 ;
- le client n'a écrit qu'un « Merci pour le devis, je valide ».

Sortie (annexe E) :

```
[plombier] « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cette semaine ? »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[plombier] « Mon robinet de cuisine goutte, je voudrais le faire changer. »   → idem
[électricien] « Mon disjoncteur saute dès que j’allume le four, pouvez-vous venir au plus vite ? »   → idem
[électricien] « Installation d’une VMC, la salle de bain est très humide. »   → idem
[menuisier] « Remise en état de mes volets bois et pose d’une porte. Êtes-vous couvert en décennale ? »   → idem
I1 bilan : relances Signature qui partaient en production et ne partent plus → "11/13"
I1 bilan : relances Studio préparées en production et plus préparées → "11/13"
I2 arbre → {"envoyees":0,…,"arrets":["reponse_client"]}   (une AUTRE demande du même e-mail, en 2025 : « Fuite sur le WC »)
I3 après reprise → {"envoyees":0,"arretees":1,…}           (l'artisan reprend, le passage suivant réarrête)
```

Seuls le témoin (« Devis pour une salle de bain ») et « Pose d'un parquet, pas urgent » partent encore.

**Pourquoi « élevé ».** C'est le second cas de la règle du verdict : une relance légitime, qui partait au commit en production, ne part
plus sans raison.
- Le client n'a rien contesté.
- La relance d'impayé ne parle pas de la fuite : elle réclame le règlement d'une facture.
- Le §3.2 demande que le geste sensible reste « une **carte** » ; il ne demande pas de l'annuler. En Studio, la relance était **déjà** une
  carte : la supprimer ne protège rien.
- Le message montré à l'artisan est faux (« le client a répondu »). L'arrêt revient à chaque reprise, ce que le risque 2 de 032-009
  reconnaît.
- Le plan exige des correctifs qui « ne font que restreindre » (§0.1) : celui-ci restreint un chemin que personne n'avait demandé de
  fermer.
- Le coût réel est la fonction de relance d'impayés elle-même, pour le cœur de la clientèle des plombiers (fuite, goutte, urgence,
  dégât) et une bonne part de celle des électriciens (« au plus vite », « disjoncteur saute »). Les menuisiers sont touchés aussi :
  « décennale » ou « remise en état » suffisent, et `assurance` et `remise en état` sont au plancher (`regles.ts:140`, `:152`).

**Pourquoi la suite ne le voit pas.** Le témoin C10a pose la demande neutre « Devis pour une salle de bain »
(`scripts/securite-assistant-0211-qa.mjs:1290`). Aucun essai ne joue un impayé dont la demande d'origine décrit un chantier ordinaire.

**Correctif proposé, joué sur une copie** (annexe G) :
- ne lire la contestation **que dans les messages entrants** (retirer `demandes` des textes, `relancesImpayesMagasin.ts:79-81`) ;
- les trois demandes ordinaires repartent (`envoyees: 1`) ;
- les trois contestations de C10b arrêtent toujours (`envoyees: 0`, `reponse_client`) ;
- C10b à C10e restent verts, puisque leurs contestations sont des messages.

À faire dans le même lot :
1. Borner la lecture aux messages écrits **depuis l'émission de la facture** (une contestation suit la facture), et pas à tout le passé
   des leads du même e-mail.
2. Un sujet trouvé donne une relance **préparée** (`a_valider`, une carte), notifiée à l'artisan avec le motif « sujet sensible ». Ni arrêt
   muet, ni libellé « le client a répondu ». En Studio, la préparation reste.
3. Ajouter un essai témoin, demande d'origine « J'ai une fuite sous l'évier », relance qui part, et son mutant, la demande relue.

## 2. E4 et E5 — rejoués sur les trois chemins

Les trois chemins lisent le même lexique, `sujetEscalade` :
- le pilote au départ (`lib/pilote/executeur.ts:239`) ;
- le cron des relances (`lib/relances.ts:15`) ;
- la réponse seule (`lib/plateformeConfig.ts:180`, dans `iaDoitRepondre`).

Annexe F, L1 : les **14 formes** de 032-008 et 032-011 sont toutes vues dans l'arbre (« L1 famille manquée (arbre) → [] »). 12 d'entre
elles étaient manquées en production. Exemples : « a perdu de l'eau », « perd 2 litres d'eau », « perd de plus en plus d'eau », « perd,
sans dégât, de l'eau », « ça refuit », « ça refuyait ». La réponse seule en Signature « auto » rend `escalade` pour chacune, et aucune
forme vue par le lexique ne part par ce chemin (« L1 incohérence → [] »). Le cron est joué de bout en bout par C9f à C9k, verts dans la
suite.

**M2 (moyen), les voisines encore manquées** (« L1 voisines manquées (arbre) ») : « Il y a de l'eau au plafond de la cuisine », « Tache
d'eau au plafond qui grandit », « Le plafond est mouillé », « Une flaque d'eau sous le chauffe-eau », « Le mur est trempé derrière la
douche », « Ça mouille sous l'évier », « De l'eau dans la cave », « Le ballon pisse », « La chasse d'eau perd en continu », « l'eau
passe ». Avec chacune, la réponse seule **part**.

Je garde le classement de 032-011 : ce sont des synonymes. « De l'eau au plafond » est sans doute fréquent dans un dégât des eaux, mais je
n'ai aucune mesure qui le place au niveau de « perd de l'eau ». Correctif : `eau au plafond`, `plafond mouill`, `flaque`, `tremp`,
`mouill`, `eau dans la cave`, `eau dans le garage`, `pisse` (après un appareil, comme `APPAREIL_PERD`), `perd en continu`.

## 3. Le lexique du lot 032-009 : ce qu'il ouvre, ce qu'il ferme

**M1 (moyen), `NOMS_NEUTRES` masque de vrais sujets** (`lib/pilote/regles.ts:199`, appliqué l.211 et l.218). Annexe F, L3 :

```
« Le brûleur s’est enflammé » → {"arbre":null,"prod":"brûl"}
« La chaudière gaz sent fort » → {"arbre":null,"prod":"gaz"}
« Votre attestation d’assurance décennale, j’en ai besoin : les fissures sont revenues » → {"arbre":null,"prod":"assurance"}
```

- Une odeur ou une flamme de gaz, en production, passait à la main ; dans l'arbre, la réponse seule part.
- Les formes courantes restent vues : « ça sent le gaz », « odeur de gaz », « chaudière gaz : odeur… ».
- Je classe donc moyen, comme un synonyme.
- L4 : les mots de l'artisan sont aussi masqués. Un artisan qui a écrit « brûleur » ou « décennale » ne les voit plus lus. C'est le risque 4
  de 032-009, ici prouvé ; un réglage de l'artisan cesse de marcher.

Correctifs :
- ne jamais ôter les noms neutres du texte lu avec les mots de l'artisan ;
- ajouter `enflamm`, `flamme`, `sent fort`, `sent le` au plancher ;
- n'ôter « chaudière gaz » que si le reste du message ne porte ni `sent`, ni `odeur`, ni `flamm`.

**F1 (faible), faux positifs neufs** (annexe F, L2 ; 27 demandes ordinaires de trois métiers) :
- ce lot en **ferme 12** : « VMC, salle de bain humide », « odeur d'égout », « ça sent l'égout », « je suis pressé », « borne de recharge, je suis pressé », « l'eau sort tiède du
  robinet », « cave humide », « ça sent le chaud près du tableau », « parquet un peu humide », « odeur de vernis », « c'est pressé avant
  l'hiver », « l'eau sort par le bas de la fenêtre » ;
- il en **rouvre 4**, à bon droit : « chaudière gaz à condensation », « chaudière à gaz », « brûleur », « attestation d'assurance
  décennale ».

Coûts réels, par chemin :
- réponse seule et pilote : à la main, l'artisan est alerté ;
- relance de prospect du cron : annulée sans un mot (F5 de 032-011) ;
- impayés : arrêt, ce qui aggrave R1.

Faible sur les trois premiers chemins, comme F5. Correctif : `humide` et `humidit` seulement avec `mur`, `plafond` ou `tache` ; `odeur`
et `ça sent` seulement avec `gaz`, `brûl` ou `fumée` ; `eau sort` seulement sans `tiède`, `chaude` ou `froide`.

## 4. M3 (moyen) — l'escalade relue en « fait tout seul » : ce qu'elle couvre

`escaladeDeLaCarte` est juste pour ce qu'elle couvre :
- elle lit toutes les conversations rattachées à la carte (`lib/assistant/actions-serveur.ts:1426-1460`) ;
- une erreur de lecture garde la carte (`:1475`, `.catch(() => MOTIF_ESCALADE_ILLISIBLE)`) ;
- A6a à A6h sont verts, et les mutants A6g et A6h rougissent.

Mais elle ne s'applique que si `typePiloteDeOutil(nom)` (`:1475`). Or `demander_avis` et `envoyer_rappel_entretien` :
- écrivent au client (`lib/assistant/actions-tout.ts:543-545`) ;
- sont de catégorie « confirmation », donc passent par `proposee` (`actions-serveur.ts:1522`) ;
- ne sont ni pilotables (`regles.ts:69`), ni dans `OUTILS_JAMAIS_AUTO` (`regles.ts:79-82`).

« Demande un avis à Dupont », ordre net, part donc d'office même si Dupont a écrit « travail bâclé, je porte plainte ». Ce n'est pas une
régression : la production n'avait aucune relecture en « fait tout seul ». Une facture sans devis (`devis_id` nul) n'est rattachée à
aucune conversation (`:1433-1443`), alors que le magasin des impayés rapproche par e-mail.

Correctif :
- relire l'escalade pour **tout** outil qui écrit au client (une liste « outils client » à côté de `OUTIL_TYPE`), pas seulement pour les
  outils pilotables ;
- pour une facture sans devis, rapprocher par l'e-mail du client.

## 5. M4 (moyen) — TTC

Le lot ferme les graphies qu'il annonce : « TTC 450 € », « Total TTC : 450 € », « (TVA comprise) », « TVAC », « T.T.C. », « taxes
incluses », « Montant TTC = 450 € ». Toutes rendent 409,09 à 10 % (annexe F, T1). Aucun HT voisin n'est perdu (T2 : « 450 € HT, soit 495 €
TTC », « Prix HT 300 €, TTC 330 € », « 450 € TTC, 300 € HT »).

Le taux est juste. Les lignes sans tarif d'un devis sont à 10 % (`cartes.ts:247`), et `prixEcrits` y retient la forme à 10 %. Le 375 de
l'ancien code, forme à 20 %, aurait donné un total faux : son refus n'est pas une régression.

Restent lues comme HT : « le prix TTC est de 450 € » (`TTC_AVANT`, `cartes.ts:184`, n'admet que « : », « = », « de », « à » : pas « est
de »), « 450 € TVA 10 % comprise » et « 450 € TVA 20% incluse » (un taux entre « TVA » et « comprise »), « 450 € avec la TVA », « 450 €
tout compris ». C'est déjà le cas en production, et le classement de 032-007 les met en moyen. Correctif : admettre `(?:est|sera) de` dans
`TTC_AVANT`, et `t\.?v\.?a\.?(?:\s*\d+(?:[.,]\d+)?\s*%)?\s*(?:compris|inclus)`, `avec (?:la )?tva` et `tout compris` dans `TTC_APRES`.

## 6. F2 (faible) — les tournures de D2

Ce lot ferme, en cartes d'un clic, de vrais ordres nets qui partaient d'office en production (annexe F, K1) : « Relance le client qui
vient de m'écrire », « Réponds au client qui vient de m'écrire », « Relance Dupont, ça fait un moment qu'il ne répond pas », « Envoie le
devis à M. Midi », « Relance les devis envoyés depuis un moment », « Réponds à Dupont qui demande un rendez-vous vers 10h ».

L'ordre n'est pas impossible : il coûte un clic. C'est la classe « faible » de 032-007 (« vrais ordres devenus des cartes »).

Inversement, `DATE_QUI_DECRIT` ouvre « Relance la pose le 3 décembre » et « Relance la livraison le 15 » (K2). Ces ordres sont ambigus :
l'artisan veut peut-être relancer **le** 15. Le pire qui parte est une relance, donc faible (risque 5 de 032-009). « Ok ça marche
pas », « Ok ça marche ? » et « ok ça marche merci » restent des cartes (K2) : l'ajout de « ça marche » n'ouvre rien à tort.

Correctif :
- `qui vient` seulement sans `de` après (`qui vient(?! de)`) ;
- `un moment` seulement après `dans` ;
- `midi` seulement après `a`, `ce` ou `cet` ;
- dans `DATE_QUI_DECRIT`, ne pas ôter une date de `pose` ou de `livraison` qui suit directement le verbe d'ordre.

## 7. Les mutants (point 4)

Mutants de la suite, chacun présent dans `scripts/securite-assistant-0211-qa.mjs` (37 lignes `MUTANT` dans la sortie) :
- A6g et A6h, l'escalade en « fait tout seul » ;
- C10e, la contestation ;
- A4m, A4n et A5d, TTC et taux ;
- A2u et A2v, `REPORT` et `DATE_QUI_DECRIT` ;
- C6r et C6s, les synonymes, `APPAREIL_PERD`, `NOMS_NEUTRES`, `refui` ;
- C9j et C9k, le cron ;
- C6j, C6l, C6m et C6n, E4 et E5.

Chaque mutant lève si son motif est introuvable (`copie()`, l.138-142). La suite est verte : il n'y a donc pas de mutant silencieux.

Ce qui manque :
- **aucun essai ne rougit sur R1** : il n'y a pas de témoin d'impayé à demande d'origine ordinaire ;
- **aucun essai ne rougit sur M1** : C6q garde 8 vrais sujets, mais aucun où le nom ôté porte la seule trace du danger.

## 8. Les suites (jouées une à une, hors ligne)

| Suite | Résultat | Code |
|---|---|---|
| `securite-assistant-0211-qa` | `179 PASS, 0 FAIL` | 0 |
| `relances-impayes-qa` | `✅ relances-impayes-qa : 225/225 contrôles` | 0 |

Elles sont vertes parce que R1 et M1 ne sont pas regardés (§7) : leur vert ne vaut pas preuve sur ces points.

## Points à valider (session principale, Benj)

1. **Ne pas pousser en l'état.** R1 casse les relances d'impayés de la plupart des chantiers de plomberie et d'une bonne part de ceux
   d'électricité, sans que personne n'ait rien contesté, et dit à l'artisan que le client a répondu.
2. **Le remède à R1** est de lire la contestation dans les seuls messages entrants, écrits depuis l'émission de la facture, et de rendre
   une carte plutôt qu'un arrêt. Il est petit, testé sur une copie (annexe G), et ne touche que `lib/relancesImpayesMagasin.ts`, plus un
   essai. Une alternative plus petite encore : retirer du push la partie « impayés » de 032-009 (`relancesImpayes.ts:241-251`,
   `relancesImpayesMagasin.ts:72-82`) et garder le reste.
3. Le reste (E4, E5, l'escalade en « fait tout seul », TTC, D2, cron) tient : ses défauts sont moyens ou faibles, listés plus haut pour le
   lot suivant.

## Annexes — les scripts d'attaque (hors dépôt, `/tmp/audit-032-015/`) et leurs sorties

L'en-tête commun, `entete.mjs`, reprend **les lignes 1 à 156 de `scripts/securite-assistant-0211-qa.mjs`, à l'octet**, sauf `RACINE`,
fixée à `/home/usine/Documents/presti`. Ces lignes contiennent :
- l'environnement factice ;
- la doublure PostgREST qui refuse tout autre réseau ;
- `copie()` et `mutant()`.

Chaque script se lance ainsi, depuis la racine du dépôt :

```
cat entete.mjs corps-X.mjs > attaque-X.mjs
node --experimental-strip-types --import ./scripts/ts-loader.mjs /tmp/audit-032-015/attaque-X.mjs
```

Les trois ont rendu le code 0. L'avertissement `MODULE_TYPELESS_PACKAGE_JSON` de Node est ôté des sorties.

### Annexe A — `corps-impayes.mjs` (R1 : le vrai passage des impayés, production contre arbre)

```js

/** Le fichier tel qu'il est au commit en production (HEAD de cette copie = 74db706a pour lib/), chargé comme copie() le fait. */
async function base(rel) {
  const { execFileSync } = await import('node:child_process')
  let code = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: RACINE, encoding: 'utf8' }).replace(/\r\n/g, '\n')
  const dir = path.dirname(path.join(RACINE, rel))
  code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, a, q, spec) => `${a}${q}${pathToFileURL(path.resolve(dir, spec)).href}${q}`)
  const f = path.join(TMP, `${path.basename(rel, '.ts')}-base-${++nCopies}.ts`)
  fs.writeFileSync(f, code)
  return import(pathToFileURL(f).href)
}
const voir = (nom, v) => console.log(`${nom} → ${JSON.stringify(v)}`)

try {
  const TOUR = await imp('lib/relancesImpayesTour.ts')
  const MAG = await imp('lib/relancesImpayesMagasin.ts')
  const MAG0 = await base('lib/relancesImpayesMagasin.ts')
  const LI = id(990), DI = id(991), FI = id(992), LI2 = id(980)
  // Même passage que C10 de la suite : facture échue le 15/10, passage le 18/10 (J+3). Le client n'a écrit qu'un merci, AVANT l'échéance.
  async function passage(magasin, demande, { plan = 'signature', autreDemande = null, messages = ['Merci pour le devis, je valide'] } = {}) {
    vider()
    const leads = [{ id: LI, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: demande, statut: 'gagne' }]
    if (autreDemande) leads.push({ id: LI2, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: autreDemande, statut: 'gagne' })
    Object.assign(T, {
      relances_impayes_reglages: [{ artisan_id: A, actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: '2026-09-01' }],
      artisans: [{ ...PROFIL_A, plan }],
      factures: [{ id: FI, artisan_id: A, numero: 'FAC-2026-0992', statut: 'emise', avoir_de: null, date_echeance: '2026-10-15', total_ttc: 1100, client_nom: 'M. Dupont', client_email: 'dupont@essai.test', devis_id: DI }],
      devis: [{ id: DI, artisan_id: A, numero: 'DEV-2026-0991', lead_id: LI }],
      leads,
      messages: messages.map((contenu, i) => ({ id: id(993 + i), lead_id: LI, sens: 'in', type: 'manuel', etat: null, contenu, sent_at: `2026-10-0${5 + i}T10:00:00Z` })),
      relances_impayes: [], relances_impayes_arrets: [], suspensions: [], plateforme_config: [],
    })
    const envois = []
    const bilan = await TOUR.tourRelancesImpayes({ actif: true, magasin, envoyer: async (m) => { envois.push(m.to); return { ok: true } }, sortiePermise: async () => true, maintenant: new Date('2026-10-18T08:00:00Z') })
    return { envoyees: bilan.envoyees, preparees: bilan.preparees, arretees: bilan.arretees, envois: envois.length, arrets: (T.relances_impayes_arrets ?? []).map((a) => a.raison), journal: (T.relances_impayes ?? []).map((r) => r.statut) }
  }
  // Des demandes d'origine ORDINAIRES (le chantier lui-même), écrites par des clients de plombier, d'électricien, de menuisier — aucune
  // ne conteste la facture. Toutes inventées.
  const DEMANDES = [
    ['plombier', 'Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cette semaine ?'],
    ['plombier', 'Mon robinet de cuisine goutte, je voudrais le faire changer.'],
    ['plombier', 'Le chauffe-eau fuit, il faudrait le remplacer. Devis svp.'],
    ['plombier', 'Remplacement du ballon d’eau chaude, c’est urgent, nous n’avons plus d’eau chaude.'],
    ['plombier', 'Odeur d’égout dans la salle de bain, pouvez-vous regarder ?'],
    ['plombier', 'Dégât des eaux chez nous, l’assurance prend en charge, il faut refaire la tuyauterie.'],
    ['électricien', 'Mon disjoncteur saute dès que j’allume le four, pouvez-vous venir au plus vite ?'],
    ['électricien', 'Mise aux normes du tableau électrique, l’expert de l’assurance l’a demandé.'],
    ['électricien', 'Installation d’une VMC, la salle de bain est très humide.'],
    ['menuisier', 'Remise en état de mes volets bois et pose d’une porte. Êtes-vous couvert en décennale ?'],
    ['menuisier', 'Fenêtres à changer, il y a des infiltrations quand il pleut.'],
    ['menuisier', 'Pose d’un parquet dans le salon, pas urgent.'],
    ['témoin', 'Devis pour une salle de bain'],
  ]
  console.log('\n── I1. Impayé échu, client qui n’a rien contesté, demande d’origine ordinaire — production (74db706a) contre arbre')
  let regress = 0, regressStudio = 0
  for (const [metier, d] of DEMANDES) {
    const avant = await passage(MAG0.magasinSupabase, d)
    const apres = await passage(MAG.magasinSupabase, d)
    const avantS = await passage(MAG0.magasinSupabase, d, { plan: 'studio' })
    const apresS = await passage(MAG.magasinSupabase, d, { plan: 'studio' })
    if (avant.envois === 1 && apres.envois === 0) regress++
    if (avantS.preparees === 1 && apresS.preparees === 0) regressStudio++
    console.log(`[${metier}] « ${d} »\n   Signature  prod: envoyées ${avant.envoyees}, arrêts ${JSON.stringify(avant.arrets)}  |  arbre: envoyées ${apres.envoyees}, arrêts ${JSON.stringify(apres.arrets)}\n   Studio     prod: préparées ${avantS.preparees}  |  arbre: préparées ${apresS.preparees}, arrêts ${JSON.stringify(apresS.arrets)}`)
  }
  voir('I1 bilan : relances Signature qui partaient en production et ne partent plus', `${regress}/${DEMANDES.length}`)
  voir('I1 bilan : relances Studio préparées en production et plus préparées', `${regressStudio}/${DEMANDES.length}`)

  console.log('\n── I2. Une AUTRE demande du même client (même e-mail), d’un autre chantier, ancienne, parlait d’une fuite')
  const a2 = await passage(MAG0.magasinSupabase, 'Devis pour une salle de bain', { autreDemande: 'Fuite sur le WC, en 2025' })
  const b2 = await passage(MAG.magasinSupabase, 'Devis pour une salle de bain', { autreDemande: 'Fuite sur le WC, en 2025' })
  voir('I2 production', a2); voir('I2 arbre', b2)

  console.log('\n── I3. L’artisan reprend les relances : le passage suivant les arrête de nouveau (la contestation est relue à toutes dates)')
  {
    const d = 'Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cette semaine ?'
    await passage(MAG.magasinSupabase, d)
    // reprise par l'artisan le 19/10, passage le 22/10
    T.relances_impayes_arrets = T.relances_impayes_arrets.map((x) => ({ ...x, reprise_le: '2026-10-19T09:00:00Z' }))
    const envois = []
    const bilan = await TOUR.tourRelancesImpayes({ actif: true, magasin: MAG.magasinSupabase, envoyer: async (m) => { envois.push(m.to); return { ok: true } }, sortiePermise: async () => true, maintenant: new Date('2026-10-22T08:00:00Z') })
    voir('I3 après reprise', { envoyees: bilan.envoyees, arretees: bilan.arretees, envois: envois.length, arrets: T.relances_impayes_arrets.map((a) => [a.raison, a.reprise_le]) })
  }
  const RI = await imp('lib/relancesImpayes.ts')
  voir('I4 libellé montré à l’artisan pour cet arrêt', RI.libelleEtat ? 'voir ligne 266' : Object.keys(RI).filter((k) => /etat|libell|phrase/i.test(k)))
} catch (e) {
  console.log(`EXCEPTION ${e instanceof Error ? e.stack : e}`); process.exitCode = 1
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch {}
}
```

### Annexe B — `corps-lexique.mjs` (E4, E5, voisines, faux positifs, NOMS_NEUTRES, cadrage, TTC)

```js

async function base(rel) {
  const { execFileSync } = await import('node:child_process')
  let code = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: RACINE, encoding: 'utf8' }).replace(/\r\n/g, '\n')
  const dir = path.dirname(path.join(RACINE, rel))
  code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, a, q, spec) => `${a}${q}${pathToFileURL(path.resolve(dir, spec)).href}${q}`)
  const f = path.join(TMP, `${path.basename(rel, '.ts')}-base-${++nCopies}.ts`)
  fs.writeFileSync(f, code)
  return import(pathToFileURL(f).href)
}
const voir = (nom, v) => console.log(`${nom} → ${typeof v === 'string' ? v : JSON.stringify(v)}`)

try {
  const R = await imp('lib/pilote/regles.ts')
  const R0 = await base('lib/pilote/regles.ts')
  const PC = await imp('lib/plateformeConfig.ts')
  const MOTS = PC.CONFIG_DEFAUT.escalade_mots
  const CFG_AUTO = { ...PC.CONFIG_DEFAUT, mode_reponse: 'auto' }
  const reponseSeule = (m) => PC.iaDoitRepondre(CFG_AUTO, { nbReponsesIA: 0, message: m, messagesClient: [] })

  console.log('\n── L1. E4 et E5 : les formes de 032-008 et 032-011, sur le lexique commun (pilote, réponse seule, cron)')
  const FAMILLE = [
    'Mon ballon perd de l’eau', 'Le chauffe-eau a perdu de l’eau cette nuit', 'Le robinet perdait de l’eau', 'Le WC perd beaucoup d’eau',
    'Des pertes d’eau sous la baignoire', 'Ça perd de leau', 'le tuyau perd deau', 'Il perd 2 litres d’eau par jour', 'Il perd de plus en plus d’eau',
    'Le cumulus perd, sans dégât, de l’eau', 'Ça refuit', 'Le robinet refuit encore', 'Ça refuyait hier', 'Une perte d’eau au compteur',
  ]
  const VOISINES = [
    'Je perds de l’eau sous l’évier', 'On perd de l’eau au niveau du ballon', 'La chasse d’eau perd en continu', 'Mon ballon perd de l eau',
    'Le chauffe eau perd de l’eau goutte à goutte', 'Il y a de l’eau au plafond de la cuisine', 'Le plafond est mouillé sous la salle de bain',
    'Une flaque d’eau sous le chauffe-eau', 'Le mur est trempé derrière la douche', 'Ça mouille sous l’évier', 'De l’eau dans la cave depuis ce matin',
    'Le ballon pisse', 'Le joint ne tient plus, l’eau passe', 'La machine à laver a perdu toute son eau par terre', 'le siphon fuyait',
    'Il y a une fuiite sous l’évier', 'Tache d’eau au plafond qui grandit',
  ]
  for (const m of [...FAMILLE, ...VOISINES]) {
    const s = R.sujetEscalade([m], MOTS), s0 = R0.sujetEscalade([m], MOTS), rs = reponseSeule(m)
    console.log(`  ${FAMILLE.includes(m) ? 'FAMILLE' : 'voisine'} « ${m} » : arbre=${JSON.stringify(s)} prod=${JSON.stringify(s0)} réponse seule=${rs.ok ? 'PART' : rs.raison}`)
  }
  voir('L1 famille manquée (arbre)', FAMILLE.filter((m) => R.sujetEscalade([m], MOTS) === null))
  voir('L1 voisines manquées (arbre)', VOISINES.filter((m) => R.sujetEscalade([m], MOTS) === null))
  voir('L1 incohérence : sujetEscalade trouve, la réponse seule part quand même', [...FAMILLE, ...VOISINES].filter((m) => R.sujetEscalade([m], MOTS) !== null && reponseSeule(m).ok))

  console.log('\n── L2. Demandes ordinaires (aucun sujet §3.2) : ce que ce lot ferme en plus, par métier')
  const ORDINAIRES = {
    plombier: ['Installation d’une VMC, salle de bain humide', 'Odeur d’égout dans la salle de bain', 'Ça sent l’égout dans la cuisine', 'Je suis pressé, je déménage le 30',
      'Changer mon mitigeur de douche', 'Détartrage du ballon d’eau chaude', 'Remplacer le WC suspendu', 'L’eau sort tiède du robinet', 'Le ballon perd de la pression',
      'Mon chauffe-eau perd sa chaleur', 'Devis chaudière gaz à condensation', 'Entretien annuel de la chaudière à gaz', 'Le brûleur de la chaudière fait du bruit'],
    électricien: ['Ajout de prises dans le salon', 'Remplacer le tableau électrique', 'Installation d’une borne de recharge, je suis pressé', 'Pose de spots dans la cuisine',
      'Cave humide : installer un déshumidificateur et une prise', 'Ça sent le chaud près du tableau', 'Envoyez-moi votre attestation d’assurance décennale'],
    menuisier: ['Pose de fenêtres PVC', 'Fabrication d’une bibliothèque sur mesure', 'Porte d’entrée qui frotte', 'Parquet à poncer, pièce un peu humide l’hiver',
      'Odeur de vernis : quel produit utilisez-vous ?', 'Volets à repeindre, c’est pressé avant l’hiver', 'L’eau sort par le bas de la fenêtre quand il pleut'],
  }
  for (const [metier, liste] of Object.entries(ORDINAIRES)) {
    for (const m of liste) {
      const s = R.sujetEscalade([m], MOTS), s0 = R0.sujetEscalade([m], MOTS)
      if (s !== s0) console.log(`  [${metier}] « ${m} » : prod=${JSON.stringify(s0)} → arbre=${JSON.stringify(s)}`)
    }
    const neufs = liste.filter((m) => R.sujetEscalade([m], MOTS) !== null && R0.sujetEscalade([m], MOTS) === null)
    const ouverts = liste.filter((m) => R.sujetEscalade([m], MOTS) === null && R0.sujetEscalade([m], MOTS) !== null)
    voir(`L2 ${metier} : fermés par ce lot / rouverts par ce lot`, `${neufs.length} / ${ouverts.length} sur ${liste.length}`)
  }

  console.log('\n── L3. NOMS_NEUTRES : un vrai sujet masqué par le nom ôté ?')
  const MASQUES = ['Votre attestation d’assurance décennale, j’en ai besoin : les fissures sont revenues', 'Le brûleur s’est enflammé', 'La chaudière gaz sent fort',
    'Plaque de cuisson gaz : odeur de gaz', 'Envoyez l’attestation décennale à mon avocat', 'Chaudière gaz en panne, on a froid, au plus vite']
  for (const m of MASQUES) voir(`  « ${m} »`, { arbre: R.sujetEscalade([m], MOTS), prod: R0.sujetEscalade([m], MOTS), artisanSeul: R.sujetEscalade([m], ['decennale']) })

  console.log('\n── L4. Le mot de l’artisan masqué par NOMS_NEUTRES (risque 4 de 032-009)')
  voir('  artisan « brûleur », client « le brûleur est HS »', { arbre: R.sujetEscalade(['le brûleur est HS'], ['brûleur']), prod: R0.sujetEscalade(['le brûleur est HS'], ['brûleur']) })
  voir('  artisan « décennale », client « attestation décennale ? »', { arbre: R.sujetEscalade(['attestation décennale ?'], ['décennale']), prod: R0.sujetEscalade(['attestation décennale ?'], ['décennale']) })

  // ── Cadrage
  const C = await imp('lib/assistant/cadrage.ts')
  const C0 = await base('lib/assistant/cadrage.ts')
  const ft = (M, m) => M.faitToutSeul(M.cadrerDemande(m), { contenuTiersLu: false })
  console.log('\n── K1. Des ordres nets ordinaires : ouverts en production, fermés par ce lot (coût : une carte d’un clic au lieu du « fait tout seul »)')
  const ORDRES = ['Relance le client qui vient de m’écrire', 'Réponds au client qui vient de m’écrire', 'Relance Dupont, ça fait un moment qu’il ne répond pas',
    'Envoie le devis à M. Midi', 'Relance Dupont pour le chantier de midi', 'Relance Martin, celui qui vient pour la cuisine', 'Envoie la facture à Dupont',
    'Relance les devis envoyés depuis un moment', 'Réponds à Dupont qui demande un rendez-vous vers 10h', 'Relance le devis de la semaine pro', 'Envoie le devis de Dupont, chantier prévu le 15 novembre']
  for (const m of ORDRES) console.log(`  « ${m} » : prod=${ft(C0, m) ? 'fait seul' : 'carte'} arbre=${ft(C, m) ? 'fait seul' : 'carte'}`)
  console.log('\n── K2. Ce que ce lot ouvre : rien ne doit partir d’office')
  const OUVRE = ['Ok ça marche pas', 'Ok ça marche ?', 'Ça marche, relance Dupont plus tard', 'Ok ça marche, mais attends demain', 'Relance la livraison le 15',
    'Relance Dupont, intervention le 20, pas avant', 'Relance Dupont depuis le 15 demain', 'Ok ça marche merci', 'Relance Dupont, visite le 12 si possible', 'Relance la pose le 3 décembre']
  for (const m of OUVRE) console.log(`  « ${m} » : prod=${ft(C0, m) ? 'fait seul' : 'carte'} arbre=${ft(C, m) ? 'fait seul' : 'carte'}`)

  // ── TTC
  const K = await imp('lib/assistant/cartes.ts')
  console.log('\n── T1. Graphies TTC : le nombre écrit ne doit JAMAIS être admis comme HT')
  const TTCS = ['Pose 450 € TTC', 'le prix TTC est de 450 €', 'Pose : 450 € TVA 10 % comprise', '450 € TVA 20% incluse', '450 € tout compris', '450€ttc', '450 euros TTC',
    '450 € T.T.C.', 'TTC 450 €', 'Total TTC : 450 €', '450 € toutes taxes comprises', '450 € (TVA comprise)', '450 € TTC la pose', 'pour 450 € TTC', '450 € avec la TVA', '450 € taxes incluses', '450 € TVAC', 'Montant TTC = 450 €', '450 € net de taxes']
  for (const t of TTCS) { const s = K.prixEcrits([t], 10); console.log(`  « ${t} » : ${s.has(45000) ? '450 ADMIS EN HT' : 'ok'} ${JSON.stringify([...s])}`) }
  console.log('\n── T2. HT voisins : rien de juste ne doit être refusé')
  for (const t of ['Pose 450 € HT', 'Pose 450 € HT, soit 495 € TTC', 'Prix HT 300 €, TTC 330 €', '450 € TTC, 300 € HT', '300 € la pose', '45 € le m²', '450 € HT (TTC 495 €)', 'TTC ou HT ? 450 € HT'])
    console.log(`  « ${t} » : ${JSON.stringify([...K.prixEcrits([t], 10)])}`)
} catch (e) {
  console.log(`EXCEPTION ${e instanceof Error ? e.stack : e}`); process.exitCode = 1
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch {}
}
```

### Annexe C — `corps-correctif.mjs` (le correctif proposé pour R1, sur une copie)

```js

try {
  const TOUR = await imp('lib/relancesImpayesTour.ts')
  // Correctif proposé : la contestation ne se lit QUE dans les messages entrants du client (pas dans la demande d'origine du chantier).
  const MAGC = await copie('lib/relancesImpayesMagasin.ts', { remplacer: [[
    "const textes = [...(entrants ?? []).map((x) => (x as { contenu?: unknown }).contenu), ...(demandes ?? []).map((x) => (x as { message?: unknown }).message)]",
    "void demandes; const textes = [...(entrants ?? []).map((x) => (x as { contenu?: unknown }).contenu)]"]] })
  const LI = id(990), DI = id(991), FI = id(992)
  async function passage(magasin, demande, messages, plan = 'signature') {
    vider()
    Object.assign(T, {
      relances_impayes_reglages: [{ artisan_id: A, actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: '2026-09-01' }],
      artisans: [{ ...PROFIL_A, plan }],
      factures: [{ id: FI, artisan_id: A, numero: 'FAC-2026-0992', statut: 'emise', avoir_de: null, date_echeance: '2026-10-15', total_ttc: 1100, client_nom: 'M. Dupont', client_email: 'dupont@essai.test', devis_id: DI }],
      devis: [{ id: DI, artisan_id: A, numero: 'DEV-2026-0991', lead_id: LI }],
      leads: [{ id: LI, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: demande, statut: 'gagne' }],
      messages: messages.map((contenu, i) => ({ id: id(993 + i), lead_id: LI, sens: 'in', type: 'manuel', etat: null, contenu, sent_at: `2026-10-0${5 + i}T10:00:00Z` })),
      relances_impayes: [], relances_impayes_arrets: [], suspensions: [], plateforme_config: [],
    })
    const envois = []
    const b = await TOUR.tourRelancesImpayes({ actif: true, magasin, envoyer: async (m) => { envois.push(m.to); return { ok: true } }, sortiePermise: async () => true, maintenant: new Date('2026-10-18T08:00:00Z') })
    return { envoyees: b.envoyees, preparees: b.preparees, arrets: (T.relances_impayes_arrets ?? []).map((a) => a.raison) }
  }
  const ORD = ['Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cette semaine ?', 'Mon robinet de cuisine goutte, je voudrais le faire changer.', 'Remplacement du ballon d’eau chaude, c’est urgent.']
  for (const d of ORD) console.log(`correctif, demande « ${d} » : ${JSON.stringify(await passage(MAGC.magasinSupabase, d, ['Merci pour le devis, je valide']))}`)
  const CONTESTE = ['Je conteste cette facture : les travaux ne sont pas terminés', 'Litige : mon avocat vous écrira', 'Je refuse de payer tant que la fuite n’est pas réparée']
  for (const c of CONTESTE) console.log(`correctif, contestation « ${c} » : ${JSON.stringify(await passage(MAGC.magasinSupabase, 'Devis pour une salle de bain', [c]))}`)
} catch (e) { console.log(`EXCEPTION ${e instanceof Error ? e.stack : e}`); process.exitCode = 1 } finally { try { fs.rmSync(TMP, { recursive: true, force: true }) } catch {} }
```

### Annexe D — l'en-tête commun

Les lignes 1 à 156 de `scripts/securite-assistant-0211-qa.mjs` à l'octet, `RACINE` mise à part (commande : `sed -n 1,156p scripts/securite-assistant-0211-qa.mjs | sed "s#^const RACINE = .*#const RACINE = '/home/usine/Documents/presti'#"`).

### Annexe E — sortie de `attaque-impayes.mjs` (code 0)

```

── I1. Impayé échu, client qui n’a rien contesté, demande d’origine ordinaire — production (74db706a) contre arbre
[plombier] « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cette semaine ? »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[plombier] « Mon robinet de cuisine goutte, je voudrais le faire changer. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[plombier] « Le chauffe-eau fuit, il faudrait le remplacer. Devis svp. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[plombier] « Remplacement du ballon d’eau chaude, c’est urgent, nous n’avons plus d’eau chaude. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[plombier] « Odeur d’égout dans la salle de bain, pouvez-vous regarder ? »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[plombier] « Dégât des eaux chez nous, l’assurance prend en charge, il faut refaire la tuyauterie. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[électricien] « Mon disjoncteur saute dès que j’allume le four, pouvez-vous venir au plus vite ? »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[électricien] « Mise aux normes du tableau électrique, l’expert de l’assurance l’a demandé. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[électricien] « Installation d’une VMC, la salle de bain est très humide. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[menuisier] « Remise en état de mes volets bois et pose d’une porte. Êtes-vous couvert en décennale ? »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[menuisier] « Fenêtres à changer, il y a des infiltrations quand il pleut. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 0, arrêts ["reponse_client"]
   Studio     prod: préparées 1  |  arbre: préparées 0, arrêts ["reponse_client"]
[menuisier] « Pose d’un parquet dans le salon, pas urgent. »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 1, arrêts []
   Studio     prod: préparées 1  |  arbre: préparées 1, arrêts []
[témoin] « Devis pour une salle de bain »
   Signature  prod: envoyées 1, arrêts []  |  arbre: envoyées 1, arrêts []
   Studio     prod: préparées 1  |  arbre: préparées 1, arrêts []
I1 bilan : relances Signature qui partaient en production et ne partent plus → "11/13"
I1 bilan : relances Studio préparées en production et plus préparées → "11/13"

── I2. Une AUTRE demande du même client (même e-mail), d’un autre chantier, ancienne, parlait d’une fuite
I2 production → {"envoyees":1,"preparees":0,"arretees":0,"envois":1,"arrets":[],"journal":["envoyee"]}
I2 arbre → {"envoyees":0,"preparees":0,"arretees":1,"envois":0,"arrets":["reponse_client"],"journal":[]}

── I3. L’artisan reprend les relances : le passage suivant les arrête de nouveau (la contestation est relue à toutes dates)
I3 après reprise → {"envoyees":0,"arretees":1,"envois":0,"arrets":[["reponse_client","2026-10-19T09:00:00Z"],["reponse_client",null]]}
I4 libellé montré à l’artisan pour cet arrêt → ["LIBELLE_RAISON","etatPourEcran"]
```

### Annexe F — sortie de `attaque-lexique.mjs` (code 0)

```

── L1. E4 et E5 : les formes de 032-008 et 032-011, sur le lexique commun (pilote, réponse seule, cron)
  FAMILLE « Mon ballon perd de l’eau » : arbre="perd de l’eau" prod="perd de l’eau" réponse seule=escalade
  FAMILLE « Le chauffe-eau a perdu de l’eau cette nuit » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « Le robinet perdait de l’eau » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « Le WC perd beaucoup d’eau » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « Des pertes d’eau sous la baignoire » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « Ça perd de leau » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « le tuyau perd deau » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « Il perd 2 litres d’eau par jour » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « Il perd de plus en plus d’eau » : arbre="perte d’eau" prod=null réponse seule=escalade
  FAMILLE « Le cumulus perd, sans dégât, de l’eau » : arbre="perd de l’eau" prod=null réponse seule=escalade
  FAMILLE « Ça refuit » : arbre="refui" prod=null réponse seule=escalade
  FAMILLE « Le robinet refuit encore » : arbre="refui" prod=null réponse seule=escalade
  FAMILLE « Ça refuyait hier » : arbre="refuy" prod=null réponse seule=escalade
  FAMILLE « Une perte d’eau au compteur » : arbre="perte d’eau" prod="perte d’eau" réponse seule=escalade
  voisine « Je perds de l’eau sous l’évier » : arbre="de l’eau sous" prod=null réponse seule=escalade
  voisine « On perd de l’eau au niveau du ballon » : arbre="perd de l’eau" prod="perd de l’eau" réponse seule=escalade
  voisine « La chasse d’eau perd en continu » : arbre=null prod=null réponse seule=PART
  voisine « Mon ballon perd de l eau » : arbre="perd de l’eau" prod="perd de l’eau" réponse seule=escalade
  voisine « Le chauffe eau perd de l’eau goutte à goutte » : arbre="perd de l’eau" prod="perd de l’eau" réponse seule=escalade
  voisine « Il y a de l’eau au plafond de la cuisine » : arbre=null prod=null réponse seule=PART
  voisine « Le plafond est mouillé sous la salle de bain » : arbre=null prod=null réponse seule=PART
  voisine « Une flaque d’eau sous le chauffe-eau » : arbre=null prod=null réponse seule=PART
  voisine « Le mur est trempé derrière la douche » : arbre=null prod=null réponse seule=PART
  voisine « Ça mouille sous l’évier » : arbre=null prod=null réponse seule=PART
  voisine « De l’eau dans la cave depuis ce matin » : arbre=null prod=null réponse seule=PART
  voisine « Le ballon pisse » : arbre=null prod=null réponse seule=PART
  voisine « Le joint ne tient plus, l’eau passe » : arbre=null prod=null réponse seule=PART
  voisine « La machine à laver a perdu toute son eau par terre » : arbre="perte d’eau" prod=null réponse seule=escalade
  voisine « le siphon fuyait » : arbre="fuy" prod="fuy" réponse seule=escalade
  voisine « Il y a une fuiite sous l’évier » : arbre="fui" prod="fui" réponse seule=escalade
  voisine « Tache d’eau au plafond qui grandit » : arbre=null prod=null réponse seule=PART
L1 famille manquée (arbre) → []
L1 voisines manquées (arbre) → ["La chasse d’eau perd en continu","Il y a de l’eau au plafond de la cuisine","Le plafond est mouillé sous la salle de bain","Une flaque d’eau sous le chauffe-eau","Le mur est trempé derrière la douche","Ça mouille sous l’évier","De l’eau dans la cave depuis ce matin","Le ballon pisse","Le joint ne tient plus, l’eau passe","Tache d’eau au plafond qui grandit"]
L1 incohérence : sujetEscalade trouve, la réponse seule part quand même → []

── L2. Demandes ordinaires (aucun sujet §3.2) : ce que ce lot ferme en plus, par métier
  [plombier] « Installation d’une VMC, salle de bain humide » : prod=null → arbre="humide"
  [plombier] « Odeur d’égout dans la salle de bain » : prod=null → arbre="odeur"
  [plombier] « Ça sent l’égout dans la cuisine » : prod=null → arbre="ça sent"
  [plombier] « Je suis pressé, je déménage le 30 » : prod=null → arbre="suis pressé"
  [plombier] « L’eau sort tiède du robinet » : prod=null → arbre="eau sort"
  [plombier] « Devis chaudière gaz à condensation » : prod="gaz" → arbre=null
  [plombier] « Entretien annuel de la chaudière à gaz » : prod="gaz" → arbre=null
  [plombier] « Le brûleur de la chaudière fait du bruit » : prod="brûl" → arbre=null
L2 plombier : fermés par ce lot / rouverts par ce lot → 5 / 3 sur 13
  [électricien] « Installation d’une borne de recharge, je suis pressé » : prod=null → arbre="suis pressé"
  [électricien] « Cave humide : installer un déshumidificateur et une prise » : prod=null → arbre="humide"
  [électricien] « Ça sent le chaud près du tableau » : prod=null → arbre="ça sent"
  [électricien] « Envoyez-moi votre attestation d’assurance décennale » : prod="assurance" → arbre=null
L2 électricien : fermés par ce lot / rouverts par ce lot → 3 / 1 sur 7
  [menuisier] « Parquet à poncer, pièce un peu humide l’hiver » : prod=null → arbre="humide"
  [menuisier] « Odeur de vernis : quel produit utilisez-vous ? » : prod=null → arbre="odeur"
  [menuisier] « Volets à repeindre, c’est pressé avant l’hiver » : prod=null → arbre="c’est pressé"
  [menuisier] « L’eau sort par le bas de la fenêtre quand il pleut » : prod=null → arbre="eau sort"
L2 menuisier : fermés par ce lot / rouverts par ce lot → 4 / 0 sur 7

── L3. NOMS_NEUTRES : un vrai sujet masqué par le nom ôté ?
  « Votre attestation d’assurance décennale, j’en ai besoin : les fissures sont revenues » → {"arbre":null,"prod":"assurance","artisanSeul":null}
  « Le brûleur s’est enflammé » → {"arbre":null,"prod":"brûl","artisanSeul":null}
  « La chaudière gaz sent fort » → {"arbre":null,"prod":"gaz","artisanSeul":null}
  « Plaque de cuisson gaz : odeur de gaz » → {"arbre":"odeur","prod":"gaz","artisanSeul":"odeur"}
  « Envoyez l’attestation décennale à mon avocat » → {"arbre":"avocat","prod":"avocat","artisanSeul":"avocat"}
  « Chaudière gaz en panne, on a froid, au plus vite » → {"arbre":"au plus vite","prod":"au plus vite","artisanSeul":"au plus vite"}

── L4. Le mot de l’artisan masqué par NOMS_NEUTRES (risque 4 de 032-009)
  artisan « brûleur », client « le brûleur est HS » → {"arbre":null,"prod":"brûl"}
  artisan « décennale », client « attestation décennale ? » → {"arbre":null,"prod":"décennale"}

── K1. Des ordres nets ordinaires : ouverts en production, fermés par ce lot (coût : une carte d’un clic au lieu du « fait tout seul »)
  « Relance le client qui vient de m’écrire » : prod=fait seul arbre=carte
  « Réponds au client qui vient de m’écrire » : prod=fait seul arbre=carte
  « Relance Dupont, ça fait un moment qu’il ne répond pas » : prod=fait seul arbre=carte
  « Envoie le devis à M. Midi » : prod=fait seul arbre=carte
  « Relance Dupont pour le chantier de midi » : prod=fait seul arbre=carte
  « Relance Martin, celui qui vient pour la cuisine » : prod=fait seul arbre=carte
  « Envoie la facture à Dupont » : prod=fait seul arbre=fait seul
  « Relance les devis envoyés depuis un moment » : prod=fait seul arbre=carte
  « Réponds à Dupont qui demande un rendez-vous vers 10h » : prod=fait seul arbre=carte
  « Relance le devis de la semaine pro » : prod=fait seul arbre=carte
  « Envoie le devis de Dupont, chantier prévu le 15 novembre » : prod=carte arbre=fait seul

── K2. Ce que ce lot ouvre : rien ne doit partir d’office
  « Ok ça marche pas » : prod=carte arbre=carte
  « Ok ça marche ? » : prod=carte arbre=carte
  « Ça marche, relance Dupont plus tard » : prod=carte arbre=carte
  « Ok ça marche, mais attends demain » : prod=carte arbre=carte
  « Relance la livraison le 15 » : prod=carte arbre=fait seul
  « Relance Dupont, intervention le 20, pas avant » : prod=carte arbre=carte
  « Relance Dupont depuis le 15 demain » : prod=carte arbre=carte
  « Ok ça marche merci » : prod=carte arbre=carte
  « Relance Dupont, visite le 12 si possible » : prod=carte arbre=carte
  « Relance la pose le 3 décembre » : prod=carte arbre=fait seul

── T1. Graphies TTC : le nombre écrit ne doit JAMAIS être admis comme HT
  « Pose 450 € TTC » : ok [40909]
  « le prix TTC est de 450 € » : 450 ADMIS EN HT [45000]
  « Pose : 450 € TVA 10 % comprise » : 450 ADMIS EN HT [45000]
  « 450 € TVA 20% incluse » : 450 ADMIS EN HT [45000]
  « 450 € tout compris » : 450 ADMIS EN HT [45000]
  « 450€ttc » : ok [40909]
  « 450 euros TTC » : ok [40909]
  « 450 € T.T.C. » : ok [40909]
  « TTC 450 € » : ok [40909]
  « Total TTC : 450 € » : ok [40909]
  « 450 € toutes taxes comprises » : ok [40909]
  « 450 € (TVA comprise) » : ok [40909]
  « 450 € TTC la pose » : ok [40909]
  « pour 450 € TTC » : ok [40909]
  « 450 € avec la TVA » : 450 ADMIS EN HT [45000]
  « 450 € taxes incluses » : ok [40909]
  « 450 € TVAC » : ok [40909]
  « Montant TTC = 450 € » : ok [40909]
  « 450 € net de taxes » : 450 ADMIS EN HT [45000]

── T2. HT voisins : rien de juste ne doit être refusé
  « Pose 450 € HT » : [45000]
  « Pose 450 € HT, soit 495 € TTC » : [45000]
  « Prix HT 300 €, TTC 330 € » : [30000]
  « 450 € TTC, 300 € HT » : [40909,30000]
  « 300 € la pose » : [30000]
  « 45 € le m² » : [4500]
  « 450 € HT (TTC 495 €) » : [45000]
  « TTC ou HT ? 450 € HT » : [45000]
```

### Annexe G — sortie de `attaque-correctif.mjs` (code 0)

```
correctif, demande « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cette semaine ? » : {"envoyees":1,"preparees":0,"arrets":[]}
correctif, demande « Mon robinet de cuisine goutte, je voudrais le faire changer. » : {"envoyees":1,"preparees":0,"arrets":[]}
correctif, demande « Remplacement du ballon d’eau chaude, c’est urgent. » : {"envoyees":1,"preparees":0,"arrets":[]}
correctif, contestation « Je conteste cette facture : les travaux ne sont pas terminés » : {"envoyees":0,"preparees":0,"arrets":["reponse_client"]}
correctif, contestation « Litige : mon avocat vous écrira » : {"envoyees":0,"preparees":0,"arrets":["reponse_client"]}
correctif, contestation « Je refuse de payer tant que la fuite n’est pas réparée » : {"envoyees":0,"preparees":0,"arrets":["reponse_client"]}
```
