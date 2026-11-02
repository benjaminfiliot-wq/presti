## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« relances, impayés, factures, escalade : auditer le correctif de contestation ») : il ne rend qu'une
  règle, celle du film CRM, sans rapport. Aucune règle propre aux impayés n'existe dans le réseau. J'ai donc jugé sur les règles du dépôt
  (`securite.md`, `autonomie-abonnements.md`) et sur la règle du verdict de la tâche.
- **MCP `cerveau`, `chercher`** (« relance facture impayée contestation carte à valider Signature Studio ») :
  - `vault/10 Presti/01 Produit/Geste - Relancer une facture impayée.md` : l'artisan envoie ou écarte la carte depuis Factures, et
    l'envoi relit la facture. C'est ce qui m'a fait vérifier qu'aucun autre chemin n'envoie une relance `a_valider` (seule
    `app/api/factures/relances-auto/a-valider/route.ts` le fait, sur un clic) ;
  - `memoire-presti/pilote-auto-aide-2110.md` : le Pilote automatique de Signature couvre aussi les « relances impayés ». J'ai donc
    vérifié qu'il ne lit pas `relances_impayes` (aucun accès : `grep` plus bas), et qu'une carte de contestation ne part donc pas seule
    au bout de 10 minutes ;
  - `regles-presti/autonomie-abonnements.md` et `plans/011-cadrage-01-11/c2-lot4/texte.md` : la promesse vendue est « avec Signature,
    elles partent seules ». C'est elle qui fait peser M1, la carte à tort.
- **Skill `ecc:security-review`** : j'en ai tiré trois contrôles.
  - L'isolation des comptes : un dossier du compte B au même e-mail ne compte pas pour la facture de A (essai « isolation », annexe B).
  - Le côté sûr d'une erreur : une lecture en panne ne fait rien partir (C10d et C10d2 de la suite).
  - L'absence de toute donnée contrôlée par le client dans une requête : seuls des identifiants lus en base sont envoyés.
- **Agent `presti-audit-attaque`** (`.claude/agents/presti-audit-attaque.md`) : j'ai suivi sa méthode (charge exacte, effet observé,
  verdict BLOQUÉ ou FAILLE). Son protocole demande aussi une entrée dans `knowledge/audit.journal.md`, mais ce fichier est hors de mon
  périmètre : je ne l'ai pas écrite, la session principale la portera.
- **L'audit `.orchestre/preuves/032-015/rapport.md`** (§1 R1, « Points à valider » 2, annexes A, E, G) et ses scripts, laissés dans
  `/tmp/audit-032-015/`. J'ai repris leur en-tête (les lignes 1 à 156 de la suite, à l'octet) et les 13 demandes, mot pour mot.
- **Le correctif** : `.orchestre/preuves/032-017/resume.md` et `.orchestre/fait/032-017.md`.
- **Le code lu** :
  - `lib/relancesImpayesMagasin.ts`, `lib/relancesImpayesTour.ts`, `lib/relancesImpayes.ts`, comparés à `git show HEAD:` ;
  - `app/api/leads/route.ts:264` (la demande d'origine est AUSSI écrite en message entrant) ;
  - `lib/releveCanal.ts:160-201` et `lib/mailLite.ts:122-129` (les réponses par une boîte reliée) ;
  - `supabase/migrations/0006_factures.sql:18` et `app/api/factures/[id]/route.ts:52-61` (ce que valent `date_emission` et `emise_le`) ;
  - `lib/reglesServeur.ts:100-103` (la facture d'acompte émise à l'acceptation) ;
  - `app/factures/RelancesAuto.tsx` et `lib/notifications.ts:64-82` (ce que l'artisan voit de la carte).

Ces sources ont changé l'audit sur un point : la demande d'origine n'existe pas seulement dans `leads.message`, elle est aussi un message
entrant. C10f ne la place que dans `leads.message`. J'ai donc rejoué l'annexe E sous quatre placements réels de plus (E2 à E5).

# 032-018 — audit offensif du correctif R1 (032-017) des relances d'impayés, avant le push (02/11/2026)

Auditeur : Claude Code (claude-code), sur le serveur Oracle (`/home/usine/Documents/presti`). Je n'ai écrit ni 032-017, ni 032-009, ni
032-015. Lecture seule : rien n'a été modifié hors de `.orchestre/preuves/032-018/`. Je n'ai fait ni commit, ni push, ni build, ni
typecheck, ni migration. Aucune suite n'a été jouée contre la production, aucun compte n'a été créé, rien n'a été écrit dans le cerveau.
Toutes les données des essais sont inventées. Les scripts d'attaque sont dans `/tmp/audit-032-018/`, hors du dépôt ; leur code et leurs
sorties sont en annexe.

**Base de comparaison.** Comme pour 032-015, `HEAD` (`5cb575d`, « base : HEAD 74db706a du PC + travail en cours ») porte `lib/` tel
qu'en production ; 032-009 et 032-017 sont dans l'arbre de travail. Pour la « production », j'ai pris les **trois** fichiers des impayés
(`relancesImpayes.ts`, `relancesImpayesTour.ts`, `relancesImpayesMagasin.ts`) par `git show HEAD:`. Ils sont copiés ensemble hors du
dépôt et s'importent entre eux. C'est donc le vrai passage de production, entier, et pas un magasin de production branché sur le passage
de l'arbre.

VERDICT : TIENT

**Pourquoi « tient ».** La règle du verdict demande l'une de trois choses pour un défaut élevé. Je n'en trouve aucune.
- **Aucune relance ne part sans clic sur une contestation écrite après la facture**, dès que le message est rattaché au client (dossier du
  devis, ou même e-mail) et qu'il contient un mot du lexique. J'ai essayé 11 placements : le jour même avant et après l'heure d'émission,
  à 0 h 30 l'été et l'hiver, un autre dossier, une facture sans date, une facture d'avant 0041. Tous donnent une carte, en Studio comme
  en Signature.
- **Aucune relance légitime n'est perdue** : 0 sur 13 sous cinq placements de la demande (E1 à E5). L'audit 032-015 en comptait 11 sur 13.
- **Aucun faux « le client a répondu »** : l'arrêt `reponse_client` ne vient plus que d'un vrai message écrit depuis la référence.

**Ce qui reste.** Les défauts restants sont moyens ou faibles, listés plus bas pour le lot suivant. Le premier, M1, est le reste de R1. Il
ne perd plus de relance, mais il change encore en carte, à tort, 11 relances Signature sur 13 dans trois cas réels : le dépannage du
jour, l'acompte, le brouillon créé tôt. **Benj doit le savoir avant le push** (point 1 de « Points à valider »).

## Bilan

| # | Défaut | Gravité | Preuve |
|---|---|---|---|
| M1 | **Le reste de R1 : des cartes « le client conteste » à tort.** La lecture prend tout message entrant écrit depuis le **jour** de `date_emission`, passé au lexique de l'**escalade**. Trois cas réels font relire le chantier lui-même : le dépannage facturé le jour de la demande (E3), l'acompte émis à l'acceptation suivi d'un message sur le chantier (E5), le brouillon créé le jour de la demande (E4). Dans ces trois cas, 11 relances Signature sur 13, qui partaient seules en production, deviennent des **cartes**, et l'artisan lit « Attention : le client conteste ou parle d'un sujet sensible ». En Studio, 11 sur 13 portent ce faux motif. Aucune relance n'est perdue, et aucun « le client a répondu » n'est écrit. | **moyen** | §1 ; annexe B, E3 à E5 |
| M2 | Lexique : **7 contestations de facture sur 20** ne sont pas vues et partent seules en Signature. Exemples : « Je ne suis pas d'accord avec le montant », « Le montant ne correspond pas au devis », « Vous m'avez facturé des heures en trop », « je ne règle pas », « Votre facture est erronée », « Je ne paierai que la moitié », « J'attends un avoir avant de régler ». | moyen (pas une régression : la production ne lisait aucune contestation ; classement des synonymes de 032-011) | §2 ; annexe B, L |
| M3 | Une contestation écrite sur un canal dont le contact n'est pas un e-mail (Messenger, WhatsApp), dans un dossier qui n'est pas celui du devis, n'est pas vue : la relance part seule. | moyen (hérité : même rattachement que `reponseClient` en production) | §2 ; annexe B, C8 |
| M4 | Une contestation écrite **avant** l'émission (« Les travaux sont mal faits, je ne paierai pas », la veille de la facture) n'est pas lue : la relance part seule. C'est voulu par le remède de 032-015 (« une contestation suit la facture »), mais c'est un choix de produit. | moyen (choix à trancher par Benj) | §2 ; annexe B, C12 |
| F1 | Le motif de la carte ne vit que dans l'e-mail de notification. La carte de Factures (`RelancesAuto.tsx:129-135`) ne dit pas pourquoi elle attend. La notification poussée reste générique (`lib/notifications.ts:32`), et l'artisan peut couper l'e-mail (`:76`). En Signature, une carte ignorée bloque aussi tous les rangs suivants, sans échéance (`relancesImpayes.ts:234`). | faible | §3 |
| F2 | Seuls les 50 messages entrants les plus récents sont relus (`relancesImpayes.ts:254`, `relancesImpayesMagasin.ts:92`). Une contestation suivie de 50 messages, tous écrits avant la référence, est oubliée. | faible | annexe B, C11 |
| F3 | La casse : un autre dossier dont le contact est écrit avec des majuscules (`Dupont@Essai.test`) n'est pas relié à une facture dont l'e-mail est en minuscules (`relancesImpayesMagasin.ts:35`). C'est rare : la relève IMAP met l'adresse en minuscules (`lib/mailLite.ts:129`). | faible (hérité) | annexe B, C7 |
| F4 | Les trous des suites. Deux mutants survivent : X5 (les 50 messages les **plus anciens** relus) et X6 (les autres dossiers du même e-mail ignorés par la contestation). X2 (`sens = 'in'` retiré) n'est tué que par une expression régulière sur le source, sans essai de comportement. Aucun essai ne joue la demande d'origine en message entrant, ni le dépannage du jour (M1). | faible | §4 ; annexe C |
| F5 | L'écran Signature dit « Les relances partent seules chaque matin » (`RelancesAuto.tsx:112`). Il ne mentionne pas l'exception de la contestation. | faible | — |

## 1. Le correctif rejoué en attaquant, production contre arbre (le vrai `tourRelancesImpayes`)

Le scénario est celui de C10 et de l'annexe E de 032-015 : facture émise le 01/10, échue le 15/10, passage le 18/10 (J+3). Le seul
message du client, sauf mention contraire, est « Merci pour le devis, je valide ». Il y a quatre passages par demande : production et
arbre, Signature et Studio.

| Placement de la demande d'origine | Signature : perdues (prod → arbre) | Signature : devenues cartes | Studio : plus préparées | Studio : faux motif |
|---|---|---|---|---|
| E1 `leads.message` seul (le placement de 032-015 et de C10f) | **0/13** (032-015 : 11/13) | 0/13 | **0/13** (032-015 : 11/13) | 0/13 |
| E2 en plus, message entrant à la création du dossier, le 20/09 (`app/api/leads/route.ts:264`) | 0/13 | 0/13 | 0/13 | 0/13 |
| E3 dépannage du jour : demande le 01/10 à 9 h, facture émise le 01/10 à 15 h | 0/13 | **11/13** | 0/13 | **11/13** |
| E4 brouillon créé le jour de la demande (20/09, `0006:18` `default current_date`), émis le 01/10 | 0/13 | **11/13** | 0/13 | **11/13** |
| E5 acompte émis à l'acceptation (01/10, `reglesServeur.ts:100-103`), puis « Devis accepté. Pour rappel : <demande> » le 03/10 | 0/13 | **11/13** | 0/13 | **11/13** |

Les autres demandes de R1 sont fermées aussi :
- **I2** (un autre dossier du même e-mail, en 2025) est couvert par C10h et par E1 ;
- **I3** (l'artisan reprend, le passage suivant réarrête) est fermé : après une reprise, une vraie contestation rend une carte au rang 3,
  pas un nouvel arrêt (annexe B, S).

**Pourquoi M1 est moyen et pas élevé.** La règle du verdict range en élevé une relance qui « ne part plus » ou un faux « le client a
répondu ».
- Ici, la relance est **préparée**, et l'artisan est prévenu.
- Elle part d'un clic.
- L'écran ne dit pas « le client a répondu ».

Le remède même de 032-015 (point 2) acceptait ce coût, une carte pour un sujet trouvé. L'auteur de 032-017 l'a écrit (« Faux positifs […]
coûtent désormais un clic »).

Le défaut reste réel :
- la promesse de Signature (« elles partent seules ») tombe pour les cas les plus courants d'un plombier : dépannage, acompte ;
- le motif montré est faux, puisque personne ne conteste ;
- une carte ignorée bloque les rangs suivants (F1).

**Les deux causes, au fichier:ligne.**
1. **La borne est en fait le jour de `date_emission`.**
   - `debutContestation` prend le plus tôt de `emise_le` et de minuit (`relancesImpayes.ts:271-277`). Minuit le jour même est toujours
     plus tôt que `emise_le` : la précision de `emise_le` ne sert donc jamais.
   - `date_emission` est le jour de **création** du brouillon (`0006_factures.sql:18`). Elle n'est pas réécrite à l'émission
     (`app/api/factures/[id]/route.ts:52-61` ne pose que `emise_le`).
2. **Le lexique est celui de l'escalade du pilote** (`contestationDuClient` → `sujetEscalade`, `relancesImpayes.ts:262-264`). Il range
   « fuite », « goutte », « urgent », « odeur » et « humide » en sujets sensibles. Ce sont de bons signaux pour ne pas répondre seul à un
   prospect. Ce ne sont pas des contestations de facture.

**Remède proposé (pour le lot suivant ; je ne l'ai pas posé).**
- Borner sur `emise_le` quand il existe, et sur le jour de `date_emission` seulement en repli.
- Donner aux impayés un lexique de **contestation** : contester, litige, avocat, refus de payer, malfaçon, plainte, mise en demeure,
  médiateur, opposition, « pas d'accord », « montant », « erronée », « avoir », « je ne règle pas », plus les mots de l'artisan. Les
  classes perte d'eau, urgence et odeur en sortent. Ce remède ferme M1 et M2 ensemble.
- Ajouter l'essai E3 (dépannage du jour), avec son mutant.

## 2. Les contestations qui passent encore (annexe B, C et L)

Attendu partout : jamais un envoi seul en Signature.

| Cas | Signature | Studio |
|---|---|---|
| C1 entre émission et échéance, dossier du devis | carte | carte |
| C2 le jour même, après l'heure d'émission | carte | carte |
| C3 le jour même, **avant** l'heure d'émission (7 h ; émise à 15 h) | carte | carte |
| C4 le jour même à 0 h 30 Paris, heure d'été (borne `2026-09-30T22:00Z`) | carte | carte |
| C5 heure d'hiver, le 01/12 à 0 h 30 Paris (23:30Z la veille ; borne 22:00Z) | carte | carte |
| C5b témoin d'hiver, la veille à 22 h 30 Paris : hors borne | part | préparée |
| C6 un autre dossier du même e-mail | carte | carte |
| C7 un autre dossier, contact `Dupont@Essai.test` (F3) | **part** | préparée |
| C8 Messenger, contact non e-mail, dossier hors devis (M3) | **part** | préparée |
| C9 facture sans aucune date : lecture sans borne, côté sûr | carte | carte |
| C10 facture d'avant 0041 (`emise_le` nulle) | carte | carte |
| C11 contestation suivie de 50 messages neutres (F2) | **part** | préparée |
| C12 contestation la **veille** de l'émission (M4) | **part** | préparée |

- **Le fuseau tient.** La borne `t − 2 h` donne minuit Paris l'été et 23 h la veille l'hiver : elle déborde d'une heure, toujours du côté
  sûr. Une date illisible (« 01/10/2026 », « n/a ») rend `null`, donc une lecture sans borne, donc une carte au pire.
- **Les mots de l'artisan comptent** : avec « retenue de garantie » parmi ses mots, la relance devient une carte.
- **Un message SORTANT** contenant « litige » n'est pas une contestation : la relance part.
- **L'isolation tient** : la contestation d'un dossier du compte B, au même e-mail, ne touche pas la facture de A.
- **Le lexique** (L, 20 formes) : 13 sont vues et 7 sont manquées (M2).

## 3. Le chemin « à valider », en Studio comme en Signature (annexe B, S)

- **Passage 1 :** une carte « sensible ». **Le lendemain :** rien ne part, la carte bloque la facture (`relancesImpayes.ts:234`).
- **L'artisan l'écarte :** au rang 2 (J+10), une nouvelle carte, pas un envoi.
- **L'artisan l'envoie lui-même :** au rang 2, une nouvelle carte, car la contestation est toujours dans les messages depuis l'émission.
- **Le client conteste après la relance 1 :** arrêt `reponse_client`, et l'écran dit « Relances arrêtées : le client a répondu
  (25/10/2026) ». C'est vrai : il a écrit depuis la référence. **Après une reprise par l'artisan :** au rang 3, une carte, pas un nouvel
  arrêt.
- **Studio et Signature se comportent de même**, au motif près.

**Aucun autre chemin n'envoie une relance `a_valider`.** `grep "from('relances_impayes')"` ne trouve que le magasin, les deux routes de
Factures, le registre (`relancesRegistre.ts:107`, en lecture), la purge et le CRM (en lecture). Le Pilote et l'assistant n'y écrivent pas,
puisque `regler_relances_impayes` ne touche qu'aux réglages. La route d'envoi relit la facture et n'agit qu'au clic, dans le compte
(`a-valider/route.ts:45-114`).

F1 : la carte de Factures ne porte pas le motif, faute de colonne. Seul l'e-mail de notification le porte.

## 4. Les mutants (annexe C)

Méthode :
- **12 copies du dépôt hors de celui-ci**, dans `/tmp/audit-032-018/racine-<mutant>/` : `lib`, `app`, `components`, la configuration, les
  scripts utiles, et des liens vers `node_modules` et `supabase` ;
- **une mutation par copie, dans le VRAI fichier de la copie** ;
- **les deux suites du vérificateur**, l'une après l'autre ;
- **un témoin sans mutation, d'abord vert.** Le premier essai a rougi parce que la suite des impayés lit `supabase/migrations`
  (`relances-impayes-qa.mjs:462`) et que je ne l'avais pas copié. Après l'ajout du lien, les 236 et les 189 contrôles sont verts.

| Mutant | Où | Verdict | Ce qui rougit |
|---|---|---|---|
| **K** la demande d'origine relue (la mutation de C10k) | magasin | **TUÉ** | **C10f, C10g, C10h** ; source « ni la contestation ni la réponse ne relisent leads.message » |
| **E** la contestation ignorée (C10e) | magasin | **TUÉ** | C10b, C10c ; source |
| **L** la carte retirée en Signature (C10l) | passage | **TUÉ** | C10b ; 5 contrôles R1 de la suite des impayés |
| **M** la borne retirée (C10m) | magasin | **TUÉ** | **C10i** ; source |
| X1 `Math.max` au lieu de `Math.min` | `debutContestation` | TUÉ | l'essai `debutContestation` (comportement) |
| X2 `sens = 'in'` retiré | magasin | TUÉ | **seulement** l'expression régulière sur le source (F4) |
| X3 la borne à midi UTC | `debutContestation` | TUÉ | l'essai `debutContestation` |
| X4 le motif non dit à l'artisan | passage | TUÉ | C10b, C10c ; 2 contrôles R1 |
| **X5** les 50 messages **les plus anciens** | magasin | **SURVIT** | — (F2, F4) |
| **X6** la contestation sans les autres dossiers du même e-mail | magasin | **SURVIT** | — (F4 ; mon essai C6 le voit) |
| X7 la contestation jamais lue | passage | TUÉ | C10b, C10c, C10d ; 6 contrôles R1 |

Les quatre mutants de la suite (C10e, C10k, C10l, C10m) rougissent donc aussi quand on les pose dans le vrai fichier : les essais C10f à
C10k qui les gardent prouvent ce qu'ils disent. Une ligne « FAIL exception — motif introuvable » s'ajoute chaque fois dans
`securite-assistant-0211-qa` : c'est attendu, la suite cherche son motif d'origine dans un fichier déjà muté.

## 5. Les suites du vérificateur (jouées une à une, hors ligne, sur le vrai dépôt)

```
✅ relances-impayes-qa : 236/236 contrôles — calendrier, opt-in, arrêts, idempotence, isolation, pause, plafond, sources
PASS C10a … PASS C10m (16 contrôles C10)
189 PASS, 0 FAIL
```

Mon attaque : `réseau → {"interceptes":5378,"refuses":[]}`. Aucune adresse hors de la doublure n'a été tentée.

## Points à valider (session principale, Benj)

1. **Le push peut se faire.** R1 est fermé : plus aucune relance perdue, plus aucun faux « le client a répondu ». **Mais il faut savoir
   ceci (M1) :** en Signature, une relance de dépannage facturé le jour même, ou d'acompte, devient le plus souvent une carte à valider,
   avec « le client conteste ou parle d'un sujet sensible ». L'artisan doit cliquer. Si ce coût n'est pas acceptable, le remède du §1
   (borne `emise_le` et lexique de contestation propre aux impayés) est petit et ferme aussi M2.
2. **À trancher (M4)** : une contestation écrite **avant** la facture (« travaux mal faits, je ne paierai pas ») doit-elle aussi rendre
   une carte ? Aujourd'hui, non.
3. Pour le lot suivant :
   - M2 (lexique) et M3 (canaux non rattachés) ;
   - F1 : afficher le motif sur la carte de Factures, ce qui demande une colonne, donc une migration ;
   - F4 : essais E3 et C6, et mutants X5 et X6 ;
   - F5 : le texte de l'écran Signature.
4. Le journal `.claude/agents/knowledge/audit.journal.md` n'a pas reçu son entrée : il est hors du périmètre de cette tâche.

## Annexes — les scripts d'attaque (hors dépôt, `/tmp/audit-032-018/`) et leurs sorties

- `entete.mjs` : les lignes 1 à 156 de `scripts/securite-assistant-0211-qa.mjs`, à l'octet, sauf `RACINE`, fixée à
  `/home/usine/Documents/presti`. On y trouve l'environnement factice, la doublure PostgREST qui refuse tout autre réseau, et `copie()` et
  `mutant()`.
- L'attaque se lance depuis la racine du dépôt :
  `cat entete.mjs corps-attaque.mjs > attaque.mjs && node --experimental-strip-types --import ./scripts/ts-loader.mjs /tmp/audit-032-018/attaque.mjs`.
  Elle rend le code 0.
- Les mutants se lancent ainsi : `node /tmp/audit-032-018/mutants.mjs`. Ce script ne touche jamais le dépôt : il copie, mute la copie,
  joue les suites, puis efface la copie.
- L'avertissement `MODULE_TYPELESS_PACKAGE_JSON` de Node est ôté des sorties.

### Annexe A — `corps-attaque.mjs`

```js

// ═══ Audit 032-018 : le correctif R1 (032-017) rejoué en attaquant sur le vrai passage tourRelancesImpayes, production (HEAD) contre arbre.
// Tout est inventé : comptes, clients, factures, messages. Aucune donnée réelle, aucun réseau (doublure PostgREST de l'en-tête).
const voir = (nom, v) => console.log(`${nom} → ${typeof v === 'string' ? v : JSON.stringify(v)}`)

/** Les TROIS fichiers des impayés tels qu'au commit en production (HEAD), copiés ensemble hors du dépôt : ils s'importent entre eux. */
async function lotProduction() {
  const { execFileSync } = await import('node:child_process')
  const fichiers = ['lib/relancesImpayes.ts', 'lib/relancesImpayesTour.ts', 'lib/relancesImpayesMagasin.ts']
  const BASE = path.join(TMP, 'production')
  fs.mkdirSync(path.join(BASE, 'lib'), { recursive: true })
  for (const rel of fichiers) {
    let code = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: RACINE, encoding: 'utf8' }).replace(/\r\n/g, '\n')
    const dir = path.dirname(path.join(RACINE, rel))
    code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, a, q, spec) => {
      const cible = path.resolve(dir, spec)
      const r = path.relative(RACINE, cible)
      return `${a}${q}${fichiers.includes(r) ? pathToFileURL(path.join(BASE, r)).href : pathToFileURL(cible).href}${q}`
    })
    fs.writeFileSync(path.join(BASE, rel), code)
  }
  return {
    TOUR: await import(pathToFileURL(path.join(BASE, 'lib/relancesImpayesTour.ts')).href),
    MAG: await import(pathToFileURL(path.join(BASE, 'lib/relancesImpayesMagasin.ts')).href),
  }
}

try {
  const PROD = await lotProduction()
  const ARBRE = { TOUR: await imp('lib/relancesImpayesTour.ts'), MAG: await imp('lib/relancesImpayesMagasin.ts') }
  const RI = await imp('lib/relancesImpayes.ts')
  const LI = id(990), DI = id(991), FI = id(992), LI2 = id(980), LI3 = id(970)

  /**
   * Un passage. `messages` : [{ contenu, sent_at, lead?, sens? }]. `leads` en plus de celui du devis. Facture échue le 15/10, passage le
   * 18/10 (J+3) sauf `maintenant`. `facture` : champs remplacés (date_emission, emise_le…). `journal` : relances déjà en base.
   */
  async function passage(lot, { plan = 'signature', demande = 'Devis pour une salle de bain', messages = [], leads = [], facture = {}, journal = [], arrets = [], maintenant = '2026-10-18T08:00:00Z', mots = null, actifDepuis = '2026-09-01' } = {}) {
    vider()
    Object.assign(T, {
      relances_impayes_reglages: [{ artisan_id: A, actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: actifDepuis }],
      artisans: [{ ...PROFIL_A, plan }],
      factures: [{ id: FI, artisan_id: A, numero: 'FAC-2026-0992', statut: 'emise', avoir_de: null, date_emission: '2026-10-01', emise_le: '2026-10-01T13:00:00Z', date_echeance: '2026-10-15', total_ttc: 1100, client_nom: 'M. Dupont', client_email: 'dupont@essai.test', devis_id: DI, ...facture }],
      devis: [{ id: DI, artisan_id: A, numero: 'DEV-2026-0991', lead_id: LI }],
      leads: [{ id: LI, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: demande, statut: 'gagne' }, ...leads],
      messages: messages.map((m, i) => ({ id: id(5000 + i), lead_id: m.lead ?? LI, sens: m.sens ?? 'in', type: m.type ?? 'manuel', etat: null, contenu: m.contenu, sent_at: m.sent_at })),
      relances_impayes: journal.map((e, i) => ({ id: id(6000 + i), artisan_id: A, facture_id: FI, destinataire: 'dupont@essai.test', ...e })),
      relances_impayes_arrets: arrets.map((a) => ({ artisan_id: A, facture_id: FI, ...a })),
      suspensions: [],
      plateforme_config: mots ? [{ artisan_id: A, escalade_mots: mots }] : [],
    })
    const envois = [], notifs = []
    const magasin = { ...lot.MAG.magasinSupabase, notifierPreparee: async (_a, n) => { notifs.push(n.texte) } }
    const bilan = await lot.TOUR.tourRelancesImpayes({ actif: true, magasin, envoyer: async (m) => { envois.push(m.to); return { ok: true } }, sortiePermise: async () => true, maintenant: new Date(maintenant) })
    return {
      envoyees: bilan.envoyees, preparees: bilan.preparees, arretees: bilan.arretees, envois: envois.length, erreurs: bilan.erreurs,
      arrets: (T.relances_impayes_arrets ?? []).filter((a) => !a.reprise_le).map((a) => a.raison),
      journal: (T.relances_impayes ?? []).map((r) => r.statut), sensible: notifs.some((t) => t.includes(RI.MOTIF_SENSIBLE)),
    }
  }
  const issue = (x) => x.envois ? 'PART' : x.arrets.length ? `ARRÊT ${x.arrets}` : x.preparees ? (x.sensible ? 'CARTE « sensible »' : 'préparée') : `rien (${x.erreurs.join(';') || '—'})`

  // ─────────────────── E. Les 13 demandes de l'annexe E de 032-015, production contre arbre, sous TROIS placements réels de la demande
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
  // E1 : la demande dans leads.message seulement (le placement de 032-015 et de C10f).
  // E2 : la demande AUSSI en message entrant, à la création du dossier (app/api/leads/route.ts:264 l'écrit ainsi), le 20/09.
  // E3 : dépannage du jour — la demande arrive le 01/10 à 9 h (Paris), la facture est émise le même jour à 15 h.
  // E4 : le brouillon de facture créé le jour de la demande (date_emission = current_date à l'insertion, 0006:18), émis le 01/10.
  const PLACEMENTS = {
    E1: (d) => ({ demande: d, messages: [{ contenu: 'Merci pour le devis, je valide', sent_at: '2026-10-05T10:00:00Z' }] }),
    E2: (d) => ({ demande: d, messages: [{ contenu: d, sent_at: '2026-09-20T08:00:00Z' }, { contenu: 'Merci pour le devis, je valide', sent_at: '2026-10-05T10:00:00Z' }] }),
    E3: (d) => ({ demande: d, facture: { date_emission: '2026-10-01', emise_le: '2026-10-01T13:00:00Z' }, messages: [{ contenu: d, sent_at: '2026-10-01T07:00:00Z' }] }),
    E4: (d) => ({ demande: d, facture: { date_emission: '2026-09-20', emise_le: '2026-10-01T13:00:00Z' }, messages: [{ contenu: d, sent_at: '2026-09-20T08:00:00Z' }] }),
    // E5 : facture d'ACOMPTE émise à l'acceptation du devis (01/10) ; le client écrit ensuite, avant les travaux, en reprenant sa demande.
    E5: (d) => ({ demande: d, facture: { date_emission: '2026-10-01', emise_le: '2026-10-01T13:00:00Z' }, messages: [{ contenu: d, sent_at: '2026-09-20T08:00:00Z' }, { contenu: `Devis accepté. Pour rappel : ${d}`, sent_at: '2026-10-03T08:00:00Z' }] }),
  }
  for (const [nom, place] of Object.entries(PLACEMENTS)) {
    console.log(`\n── ${nom}. Les 13 demandes de l'annexe E — production contre arbre`)
    const perdues = [], cartes = [], perduesS = [], cartesS = []
    for (const [metier, d] of DEMANDES) {
      const o = place(d)
      const pS = await passage(PROD, o), aS = await passage(ARBRE, o)
      const pT = await passage(PROD, { ...o, plan: 'studio' }), aT = await passage(ARBRE, { ...o, plan: 'studio' })
      if (pS.envois && !aS.envois) (aS.preparees ? cartes : perdues).push(metier)
      if (pT.preparees && !aT.preparees) perduesS.push(metier)
      if (pT.preparees && aT.preparees && aT.sensible) cartesS.push(metier)
      console.log(`[${metier}] « ${d.slice(0, 60)} »  Signature prod: ${issue(pS)} | arbre: ${issue(aS)}   Studio prod: ${issue(pT)} | arbre: ${issue(aT)}`)
    }
    voir(`${nom} bilan Signature : partaient en production, PERDUES dans l'arbre`, `${perdues.length}/13`)
    voir(`${nom} bilan Signature : partaient en production, devenues CARTES « sensible » dans l'arbre`, `${cartes.length}/13`)
    voir(`${nom} bilan Studio : préparées en production, plus préparées`, `${perduesS.length}/13`)
    voir(`${nom} bilan Studio : préparées, mais avec le motif « le client conteste » (faux)`, `${cartesS.length}/13`)
  }

  // ─────────────────── C. Les contestations ÉCRITES APRÈS LA FACTURE : aucune ne doit partir seule en Signature
  const CONTESTE = 'Je conteste cette facture, les travaux ne sont pas terminés.'
  const CAS = [
    ['C1 entre émission et échéance (05/10), dossier du devis', { messages: [{ contenu: CONTESTE, sent_at: '2026-10-05T10:00:00Z' }] }],
    ['C2 le jour même de l’émission, APRÈS l’émission (01/10, 18 h Paris)', { messages: [{ contenu: CONTESTE, sent_at: '2026-10-01T16:00:00Z' }] }],
    ['C3 le jour même, AVANT l’heure d’émission (01/10, 7 h Paris ; émise à 15 h)', { messages: [{ contenu: CONTESTE, sent_at: '2026-10-01T05:00:00Z' }] }],
    ['C4 le jour même à 0 h 30 Paris, heure d’été (30/09 22:30Z)', { messages: [{ contenu: CONTESTE, sent_at: '2026-09-30T22:30:00Z' }] }],
    ['C5 heure d’hiver : émise le 01/12/2025, contestée le 01/12 à 0 h 30 Paris (30/11 23:30Z), échue le 15/12, passage le 18/12', { actifDepuis: '2025-11-01', facture: { date_emission: '2025-12-01', emise_le: '2025-12-01T13:00:00Z', date_echeance: '2025-12-15' }, maintenant: '2025-12-18T08:00:00Z', messages: [{ contenu: CONTESTE, sent_at: '2025-11-30T23:30:00Z' }] }],
    ['C5b témoin d’hiver : même facture, contestée la veille à 22 h 30 Paris (30/11 21:30Z) — hors borne, part', { actifDepuis: '2025-11-01', facture: { date_emission: '2025-12-01', emise_le: '2025-12-01T13:00:00Z', date_echeance: '2025-12-15' }, maintenant: '2025-12-18T08:00:00Z', messages: [{ contenu: CONTESTE, sent_at: '2025-11-30T21:30:00Z' }] }],
    ['C6 autre dossier du même e-mail (même casse), 05/10', { leads: [{ id: LI2, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: 'Autre chantier', statut: 'nouveau' }], messages: [{ contenu: CONTESTE, sent_at: '2026-10-05T10:00:00Z', lead: LI2, type: 'email' }] }],
    ['C7 canal relié (relève IMAP, lib/releveCanal.ts:170-186) : le dossier né de la réponse a le contact « Dupont@Essai.test »', { leads: [{ id: LI2, artisan_id: A, nom_prospect: 'Dupont', contact: 'Dupont@Essai.test', message: CONTESTE, statut: 'nouveau' }], messages: [{ contenu: CONTESTE, sent_at: '2026-10-05T10:00:00Z', lead: LI2, type: 'email' }] }],
    ['C8 canal relié Messenger (contact = identifiant de page), dossier sans lien avec le devis', { leads: [{ id: LI3, artisan_id: A, nom_prospect: 'Jean Dupont', contact: 'psid:123456', message: 'Bonjour', statut: 'nouveau' }], messages: [{ contenu: CONTESTE, sent_at: '2026-10-05T10:00:00Z', lead: LI3, type: 'messenger' }] }],
    ['C9 facture sans aucune date (date_emission et emise_le nulles)', { facture: { date_emission: null, emise_le: null }, messages: [{ contenu: CONTESTE, sent_at: '2026-10-05T10:00:00Z' }] }],
    ['C10 facture d’avant 0041 (emise_le nulle), date_emission seule', { facture: { emise_le: null }, messages: [{ contenu: CONTESTE, sent_at: '2026-10-01T05:00:00Z' }] }],
    ['C11 contestation puis 50 messages neutres avant l’échéance (MESSAGES_CONTESTATION_RELUS)', { messages: [{ contenu: CONTESTE, sent_at: '2026-10-02T08:00:00Z' }, ...Array.from({ length: 50 }, (_, i) => ({ contenu: `D’accord, merci (${i})`, sent_at: `2026-10-${String(3 + Math.floor(i / 5)).padStart(2, '0')}T${String(8 + (i % 5)).padStart(2, '0')}:00:00Z` }))] }],
    ['C12 contestation écrite la veille de l’émission (30/09 18 h Paris), après les travaux', { messages: [{ contenu: 'Les travaux sont mal faits, je ne paierai pas.', sent_at: '2026-09-30T16:00:00Z' }] }],
  ]
  console.log('\n── C. Contestations écrites depuis la facture (et deux bornes) — Signature et Studio, arbre')
  for (const [nom, o] of CAS) {
    const s = await passage(ARBRE, o), t = await passage(ARBRE, { ...o, plan: 'studio' })
    console.log(`${nom}\n   Signature: ${issue(s)}   Studio: ${issue(t)}`)
  }
  voir('debutContestation(01/10, 13:00Z)', RI.debutContestation({ date_emission: '2026-10-01', emise_le: '2026-10-01T13:00:00Z' }))
  voir('debutContestation(01/12, 13:00Z)', RI.debutContestation({ date_emission: '2026-12-01', emise_le: '2026-12-01T13:00:00Z' }))
  voir('debutContestation(nulles)', RI.debutContestation({ date_emission: null, emise_le: null }))
  voir('debutContestation(« 01/10/2026 », texte illisible)', RI.debutContestation({ date_emission: '01/10/2026', emise_le: 'n/a' }))

  // ─────────────────── L. Le lexique : des contestations écrites sans les mots du plancher (elles partiraient seules en Signature)
  console.log('\n── L. Formes de contestation après la facture (contestationDuClient, lexique du plancher, aucun mot de l’artisan)')
  const FORMES = [
    'Je conteste cette facture.', 'Je ne paierai pas cette facture.', 'Je refuse de payer.', 'Je ne suis pas d’accord avec le montant.',
    'Le montant ne correspond pas au devis.', 'Vous m’avez facturé des heures en trop.', 'Les travaux ne sont pas finis, je ne règle pas.',
    'Travail bâclé, je bloque le paiement.', 'J’ai saisi la protection juridique de mon assurance.', 'Je vais porter plainte.',
    'Mon avocat vous contactera.', 'Mise en demeure de reprendre les travaux.', 'Je fais opposition au paiement.',
    'Il y a une malfaçon sur la pose.', 'Votre facture est erronée.', 'Je ne paierai que la moitié.', 'C’est une arnaque.',
    'J’attends un avoir avant de régler.', 'Je saisis le médiateur de la consommation.', 'Rien ne fonctionne depuis votre passage, je ne paie pas.',
  ]
  const manquees = FORMES.filter((f) => RI.contestationDuClient([f], []) === null)
  for (const f of FORMES) console.log(`   ${RI.contestationDuClient([f], []) ?? '— (rien)'}  ←  « ${f} »`)
  voir('L bilan : formes de contestation non vues', `${manquees.length}/${FORMES.length}`)

  // ─────────────────── S. Le chemin « à valider » : Signature et Studio, sur plusieurs passages
  console.log('\n── S. Le chemin « à valider » en Studio comme en Signature (arbre)')
  const msgC = [{ contenu: CONTESTE, sent_at: '2026-10-05T10:00:00Z' }]
  for (const plan of ['signature', 'studio']) {
    const p1 = await passage(ARBRE, { plan, messages: msgC })
    const jr1 = T.relances_impayes.map((r) => ({ rang: r.rang, jour: r.jour, statut: r.statut }))
    // le lendemain, la carte attend toujours : rien ne doit partir
    const p2 = await passage(ARBRE, { plan, messages: msgC, journal: jr1, maintenant: '2026-10-19T08:00:00Z' })
    // l'artisan l'ÉCARTE ; au rang 2 (J+10, 25/10), la contestation est toujours là
    const p3 = await passage(ARBRE, { plan, messages: msgC, journal: jr1.map((e) => ({ ...e, statut: 'rejetee' })), maintenant: '2026-10-25T08:00:00Z' })
    // l'artisan l'ENVOIE lui-même le 18/10 ; au rang 2, la contestation est toujours là (antérieure à la relance : pas une « réponse »)
    const p4 = await passage(ARBRE, { plan, messages: msgC, journal: jr1.map((e) => ({ ...e, statut: 'envoyee', envoyee_le: '2026-10-18T09:00:00Z' })), maintenant: '2026-10-25T08:00:00Z' })
    console.log(`[${plan}] passage 1 : ${issue(p1)} | lendemain : ${issue(p2)} | écartée puis rang 2 : ${issue(p3)} | envoyée par l'artisan puis rang 2 : ${issue(p4)}`)
  }
  // Contestation écrite APRÈS la relance 1 (partie seule, sans contestation), puis reprise par l'artisan
  {
    const jr = [{ rang: 1, jour: '2026-10-18', statut: 'envoyee', envoyee_le: '2026-10-18T08:00:00Z' }]
    const m = [{ contenu: 'Je ne paierai pas, les travaux sont mal faits : litige.', sent_at: '2026-10-20T10:00:00Z' }]
    const a = await passage(ARBRE, { messages: m, journal: jr, maintenant: '2026-10-25T08:00:00Z' })
    const libelle = RI.etatPourEcran({ facture: T.factures[0], reglages: { actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: null }, journal: jr, arret: { raison: 'reponse_client', le: '2026-10-25T08:00:00Z' }, maintenant: new Date('2026-10-25T08:00:00Z') })
    const b = await passage(ARBRE, { messages: m, journal: jr, arrets: [{ raison: 'reponse_client', le: '2026-10-25T08:00:00Z', reprise_le: '2026-10-26T09:00:00Z' }], maintenant: '2026-11-05T08:00:00Z' })
    console.log(`[signature] contestation après la relance 1 : ${issue(a)} (écran : « ${libelle} ») | reprise par l'artisan, rang 3 : ${issue(b)}`)
  }
  // Les mots d'escalade de l'artisan comptent-ils (« retenue de garantie ») ? Et un message SORTANT de l'artisan n'est pas une contestation.
  {
    const m1 = await passage(ARBRE, { mots: ['retenue de garantie'], messages: [{ contenu: 'J’applique la retenue de garantie de 5 %.', sent_at: '2026-10-05T10:00:00Z' }] })
    const m2 = await passage(ARBRE, { messages: [{ contenu: 'Litige : je reste à votre disposition', sent_at: '2026-10-05T10:00:00Z', sens: 'out' }] })
    console.log(`mots de l'artisan : ${issue(m1)} | message SORTANT « litige » : ${issue(m2)}`)
  }
  // Un compte B ne doit jamais voir la contestation d'un client de A (ni l'inverse) : un lead de B au même e-mail.
  {
    const x = await passage(ARBRE, { leads: [{ id: LI2, artisan_id: B, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: 'x', statut: 'nouveau' }], messages: [{ contenu: CONTESTE, sent_at: '2026-10-05T10:00:00Z', lead: LI2 }] })
    console.log(`isolation : la contestation d'un dossier du compte B (même e-mail) sur la facture de A → ${issue(x)}`)
  }
  voir('réseau', { interceptes: reseau.interceptes, refuses: reseau.refuses })
} catch (e) {
  console.log(`EXCEPTION ${e instanceof Error ? e.stack : e}`); process.exitCode = 1
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch {}
}
```

### Annexe B — sortie de `attaque.mjs` (code 0)

```

── E1. Les 13 demandes de l'annexe E — production contre arbre
[plombier] « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cet »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Mon robinet de cuisine goutte, je voudrais le faire changer. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Le chauffe-eau fuit, il faudrait le remplacer. Devis svp. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Remplacement du ballon d’eau chaude, c’est urgent, nous n’av »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Odeur d’égout dans la salle de bain, pouvez-vous regarder ? »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Dégât des eaux chez nous, l’assurance prend en charge, il fa »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[électricien] « Mon disjoncteur saute dès que j’allume le four, pouvez-vous  »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[électricien] « Mise aux normes du tableau électrique, l’expert de l’assuran »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[électricien] « Installation d’une VMC, la salle de bain est très humide. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[menuisier] « Remise en état de mes volets bois et pose d’une porte. Êtes- »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[menuisier] « Fenêtres à changer, il y a des infiltrations quand il pleut. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[menuisier] « Pose d’un parquet dans le salon, pas urgent. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[témoin] « Devis pour une salle de bain »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
E1 bilan Signature : partaient en production, PERDUES dans l'arbre → 0/13
E1 bilan Signature : partaient en production, devenues CARTES « sensible » dans l'arbre → 0/13
E1 bilan Studio : préparées en production, plus préparées → 0/13
E1 bilan Studio : préparées, mais avec le motif « le client conteste » (faux) → 0/13

── E2. Les 13 demandes de l'annexe E — production contre arbre
[plombier] « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cet »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Mon robinet de cuisine goutte, je voudrais le faire changer. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Le chauffe-eau fuit, il faudrait le remplacer. Devis svp. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Remplacement du ballon d’eau chaude, c’est urgent, nous n’av »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Odeur d’égout dans la salle de bain, pouvez-vous regarder ? »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[plombier] « Dégât des eaux chez nous, l’assurance prend en charge, il fa »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[électricien] « Mon disjoncteur saute dès que j’allume le four, pouvez-vous  »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[électricien] « Mise aux normes du tableau électrique, l’expert de l’assuran »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[électricien] « Installation d’une VMC, la salle de bain est très humide. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[menuisier] « Remise en état de mes volets bois et pose d’une porte. Êtes- »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[menuisier] « Fenêtres à changer, il y a des infiltrations quand il pleut. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[menuisier] « Pose d’un parquet dans le salon, pas urgent. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[témoin] « Devis pour une salle de bain »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
E2 bilan Signature : partaient en production, PERDUES dans l'arbre → 0/13
E2 bilan Signature : partaient en production, devenues CARTES « sensible » dans l'arbre → 0/13
E2 bilan Studio : préparées en production, plus préparées → 0/13
E2 bilan Studio : préparées, mais avec le motif « le client conteste » (faux) → 0/13

── E3. Les 13 demandes de l'annexe E — production contre arbre
[plombier] « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cet »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Mon robinet de cuisine goutte, je voudrais le faire changer. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Le chauffe-eau fuit, il faudrait le remplacer. Devis svp. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Remplacement du ballon d’eau chaude, c’est urgent, nous n’av »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Odeur d’égout dans la salle de bain, pouvez-vous regarder ? »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Dégât des eaux chez nous, l’assurance prend en charge, il fa »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Mon disjoncteur saute dès que j’allume le four, pouvez-vous  »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Mise aux normes du tableau électrique, l’expert de l’assuran »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Installation d’une VMC, la salle de bain est très humide. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Remise en état de mes volets bois et pose d’une porte. Êtes- »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Fenêtres à changer, il y a des infiltrations quand il pleut. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Pose d’un parquet dans le salon, pas urgent. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[témoin] « Devis pour une salle de bain »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
E3 bilan Signature : partaient en production, PERDUES dans l'arbre → 0/13
E3 bilan Signature : partaient en production, devenues CARTES « sensible » dans l'arbre → 11/13
E3 bilan Studio : préparées en production, plus préparées → 0/13
E3 bilan Studio : préparées, mais avec le motif « le client conteste » (faux) → 11/13

── E4. Les 13 demandes de l'annexe E — production contre arbre
[plombier] « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cet »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Mon robinet de cuisine goutte, je voudrais le faire changer. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Le chauffe-eau fuit, il faudrait le remplacer. Devis svp. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Remplacement du ballon d’eau chaude, c’est urgent, nous n’av »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Odeur d’égout dans la salle de bain, pouvez-vous regarder ? »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Dégât des eaux chez nous, l’assurance prend en charge, il fa »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Mon disjoncteur saute dès que j’allume le four, pouvez-vous  »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Mise aux normes du tableau électrique, l’expert de l’assuran »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Installation d’une VMC, la salle de bain est très humide. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Remise en état de mes volets bois et pose d’une porte. Êtes- »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Fenêtres à changer, il y a des infiltrations quand il pleut. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Pose d’un parquet dans le salon, pas urgent. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[témoin] « Devis pour une salle de bain »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
E4 bilan Signature : partaient en production, PERDUES dans l'arbre → 0/13
E4 bilan Signature : partaient en production, devenues CARTES « sensible » dans l'arbre → 11/13
E4 bilan Studio : préparées en production, plus préparées → 0/13
E4 bilan Studio : préparées, mais avec le motif « le client conteste » (faux) → 11/13

── E5. Les 13 demandes de l'annexe E — production contre arbre
[plombier] « Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cet »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Mon robinet de cuisine goutte, je voudrais le faire changer. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Le chauffe-eau fuit, il faudrait le remplacer. Devis svp. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Remplacement du ballon d’eau chaude, c’est urgent, nous n’av »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Odeur d’égout dans la salle de bain, pouvez-vous regarder ? »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[plombier] « Dégât des eaux chez nous, l’assurance prend en charge, il fa »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Mon disjoncteur saute dès que j’allume le four, pouvez-vous  »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Mise aux normes du tableau électrique, l’expert de l’assuran »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[électricien] « Installation d’une VMC, la salle de bain est très humide. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Remise en état de mes volets bois et pose d’une porte. Êtes- »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Fenêtres à changer, il y a des infiltrations quand il pleut. »  Signature prod: PART | arbre: CARTE « sensible »   Studio prod: préparée | arbre: CARTE « sensible »
[menuisier] « Pose d’un parquet dans le salon, pas urgent. »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
[témoin] « Devis pour une salle de bain »  Signature prod: PART | arbre: PART   Studio prod: préparée | arbre: préparée
E5 bilan Signature : partaient en production, PERDUES dans l'arbre → 0/13
E5 bilan Signature : partaient en production, devenues CARTES « sensible » dans l'arbre → 11/13
E5 bilan Studio : préparées en production, plus préparées → 0/13
E5 bilan Studio : préparées, mais avec le motif « le client conteste » (faux) → 11/13

── C. Contestations écrites depuis la facture (et deux bornes) — Signature et Studio, arbre
C1 entre émission et échéance (05/10), dossier du devis
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C2 le jour même de l’émission, APRÈS l’émission (01/10, 18 h Paris)
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C3 le jour même, AVANT l’heure d’émission (01/10, 7 h Paris ; émise à 15 h)
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C4 le jour même à 0 h 30 Paris, heure d’été (30/09 22:30Z)
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C5 heure d’hiver : émise le 01/12/2025, contestée le 01/12 à 0 h 30 Paris (30/11 23:30Z), échue le 15/12, passage le 18/12
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C5b témoin d’hiver : même facture, contestée la veille à 22 h 30 Paris (30/11 21:30Z) — hors borne, part
   Signature: PART   Studio: préparée
C6 autre dossier du même e-mail (même casse), 05/10
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C7 canal relié (relève IMAP, lib/releveCanal.ts:170-186) : le dossier né de la réponse a le contact « Dupont@Essai.test »
   Signature: PART   Studio: préparée
C8 canal relié Messenger (contact = identifiant de page), dossier sans lien avec le devis
   Signature: PART   Studio: préparée
C9 facture sans aucune date (date_emission et emise_le nulles)
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C10 facture d’avant 0041 (emise_le nulle), date_emission seule
   Signature: CARTE « sensible »   Studio: CARTE « sensible »
C11 contestation puis 50 messages neutres avant l’échéance (MESSAGES_CONTESTATION_RELUS)
   Signature: PART   Studio: préparée
C12 contestation écrite la veille de l’émission (30/09 18 h Paris), après les travaux
   Signature: PART   Studio: préparée
debutContestation(01/10, 13:00Z) → 2026-09-30T22:00:00.000Z
debutContestation(01/12, 13:00Z) → 2026-11-30T22:00:00.000Z
debutContestation(nulles) → null
debutContestation(« 01/10/2026 », texte illisible) → null

── L. Formes de contestation après la facture (contestationDuClient, lexique du plancher, aucun mot de l’artisan)
   conteste  ←  « Je conteste cette facture. »
   paierai pas  ←  « Je ne paierai pas cette facture. »
   refuse de payer  ←  « Je refuse de payer. »
   — (rien)  ←  « Je ne suis pas d’accord avec le montant. »
   — (rien)  ←  « Le montant ne correspond pas au devis. »
   — (rien)  ←  « Vous m’avez facturé des heures en trop. »
   — (rien)  ←  « Les travaux ne sont pas finis, je ne règle pas. »
   bloque le paiement  ←  « Travail bâclé, je bloque le paiement. »
   assurance  ←  « J’ai saisi la protection juridique de mon assurance. »
   plainte  ←  « Je vais porter plainte. »
   avocat  ←  « Mon avocat vous contactera. »
   mise en demeure  ←  « Mise en demeure de reprendre les travaux. »
   opposition  ←  « Je fais opposition au paiement. »
   malfaçon  ←  « Il y a une malfaçon sur la pose. »
   — (rien)  ←  « Votre facture est erronée. »
   — (rien)  ←  « Je ne paierai que la moitié. »
   arnaque  ←  « C’est une arnaque. »
   — (rien)  ←  « J’attends un avoir avant de régler. »
   médiateur  ←  « Je saisis le médiateur de la consommation. »
   paie pas  ←  « Rien ne fonctionne depuis votre passage, je ne paie pas. »
L bilan : formes de contestation non vues → 7/20

── S. Le chemin « à valider » en Studio comme en Signature (arbre)
[signature] passage 1 : CARTE « sensible » | lendemain : rien (—) | écartée puis rang 2 : CARTE « sensible » | envoyée par l'artisan puis rang 2 : CARTE « sensible »
[studio] passage 1 : CARTE « sensible » | lendemain : rien (—) | écartée puis rang 2 : CARTE « sensible » | envoyée par l'artisan puis rang 2 : CARTE « sensible »
[signature] contestation après la relance 1 : ARRÊT reponse_client (écran : « Relances arrêtées : le client a répondu (25/10/2026) ») | reprise par l'artisan, rang 3 : CARTE « sensible »
mots de l'artisan : CARTE « sensible » | message SORTANT « litige » : PART
isolation : la contestation d'un dossier du compte B (même e-mail) sur la facture de A → PART
réseau → {"interceptes":6606,"refuses":[]}
```

### Annexe C — `mutants.mjs` et sa sortie (code 0)

```js
// Les mutants, joués sur des COPIES du dépôt hors de celui-ci (/tmp/audit-032-018/racine-<nom>/) : le vrai fichier n'est jamais touché.
// Chaque mutant : un motif qui DOIT exister (sinon le mutant serait l'original), remplacé dans la copie ; puis les deux suites du
// vérificateur de 032-018, l'une après l'autre (jamais en parallèle). Attendu : un mutant TUÉ fait sortir une suite en code ≠ 0.
// Usage (depuis n'importe où) : node /tmp/audit-032-018/mutants.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const DEPOT = '/home/usine/Documents/presti'
const ICI = '/tmp/audit-032-018'
const A_COPIER = ['lib', 'app', 'components', 'package.json', 'tsconfig.json', 'scripts/ts-loader.mjs', 'scripts/relances-impayes-qa.mjs', 'scripts/securite-assistant-0211-qa.mjs', 'scripts/tout-verifier.mjs']
const SUITES = ['scripts/relances-impayes-qa.mjs', 'scripts/securite-assistant-0211-qa.mjs']
const MAG = 'lib/relancesImpayesMagasin.ts', TOUR = 'lib/relancesImpayesTour.ts', RI = 'lib/relancesImpayes.ts'

const MUTANTS = [
  ['temoin', null, null, null],
  // Les quatre mutants de la suite, remis dans le VRAI fichier de la copie : les essais C10b, C10f, C10i doivent rougir.
  ['K-demande-relue', MAG, '    const textes = (entrants ?? []).map((x) => (x as { contenu?: unknown }).contenu)\n',
    "    const demandes = lire(await supabaseAdmin.from('leads').select('message').eq('artisan_id', artisanId).in('id', ids).limit(50), 'demandes')\n    const textes = [...(entrants ?? []).map((x) => (x as { contenu?: unknown }).contenu), ...(demandes ?? []).map((x) => (x as { message?: unknown }).message)]\n"],
  ['E-contestation-ignoree', MAG, '    return contestationDuClient(textes, cfg.escalade_mots)\n', '    return null\n'],
  ['L-carte-retiree-signature', TOUR, '        if (!auto || sensible) {', '        if (!auto) {'],
  ['M-borne-retiree', MAG, "    if (debut) q = q.gte('sent_at', debut)\n", '    void debut\n'],
  // Les miens : ce que la suite ne nomme pas.
  ['X1-borne-au-plus-tard', RI, 'return bornes.length ? new Date(Math.min(...bornes))', 'return bornes.length ? new Date(Math.max(...bornes))'],
  ['X2-sens-in-retire', MAG, "    let q = supabaseAdmin.from('messages').select('contenu').in('lead_id', ids).eq('sens', 'in')\n", "    let q = supabaseAdmin.from('messages').select('contenu').in('lead_id', ids)\n"],
  ['X3-borne-midi-utc', RI, 'bornes.push(t - 2 * 3_600_000)', 'bornes.push(t + 12 * 3_600_000)'],
  ['X4-motif-non-dit', TOUR, 'motif: sensible ? MOTIF_SENSIBLE : null', 'motif: null'],
  ['X5-plus-anciens-d-abord', MAG, "q.order('sent_at', { ascending: false })", "q.order('sent_at', { ascending: true })"],
  ['X6-sans-les-autres-dossiers', MAG, '    const ids = await dossiersDuClient(artisanId, facture)\n    if (!ids.length) return null\n',
    "    const ids = (await dossiersDuClient(artisanId, facture)).slice(0, 1)\n    if (!ids.length) return null\n"],
  ['X7-contestation-lue-apres-la-prise', TOUR, '        const sensible = (await m.contestation(artisan_id, f)) !== null\n', '        const sensible = false\n'],
]

const bilan = []
for (const [nom, rel, avant, apres] of MUTANTS) {
  const dir = path.join(ICI, `racine-${nom}`)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true })
  for (const x of A_COPIER) fs.cpSync(path.join(DEPOT, x), path.join(dir, x), { recursive: true })
  fs.symlinkSync(path.join(DEPOT, 'node_modules'), path.join(dir, 'node_modules'))
  fs.symlinkSync(path.join(DEPOT, 'supabase'), path.join(dir, 'supabase')) // lu seulement (relances-impayes-qa:462)
  if (rel) {
    const f = path.join(dir, rel)
    const code = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
    if (!code.includes(avant)) { bilan.push(`${nom} : MOTIF INTROUVABLE`); continue }
    fs.writeFileSync(f, code.replace(avant, apres))
  }
  const sorties = []
  for (const s of SUITES) {
    const r = spawnSync('node', ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', s], { cwd: dir, encoding: 'utf8', timeout: 280_000 })
    const lignes = `${r.stdout}\n${r.stderr}`.split('\n')
    const rouges = lignes.filter((l) => /^FAIL |^❌|^  - /.test(l)).map((l) => l.slice(0, 150))
    sorties.push({ suite: path.basename(s), code: r.status, rouges: rouges.slice(0, 6), fin: lignes.filter((l) => /PASS, |contrôles|✅|❌/.test(l)).slice(-1)[0] ?? '' })
  }
  const tue = sorties.some((x) => x.code !== 0)
  bilan.push(`${nom} : ${rel ? (tue ? 'TUÉ' : 'SURVIT') : (tue ? 'TÉMOIN ROUGE (copie cassée)' : 'témoin vert')}\n${sorties.map((x) => `   ${x.suite} code ${x.code} ${x.fin}\n${x.rouges.map((r) => `      ${r}`).join('\n')}`).join('\n')}`)
  fs.rmSync(dir, { recursive: true, force: true })
}
console.log(bilan.join('\n'))
```

```
code=0
temoin : témoin vert
   relances-impayes-qa.mjs code 0 ✅ relances-impayes-qa : 236/236 contrôles — calendrier, opt-in, arrêts, idempotence, isolation, pause, plafond, sources

   securite-assistant-0211-qa.mjs code 0 189 PASS, 0 FAIL

K-demande-relue : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 1 échec(s) sur 236
      ❌ relances-impayes-qa : 1 échec(s) sur 236
        - magasin (R1, 032-015) : ni la contestation ni la réponse ne relisent la demande d’origine (leads.message) ; la réponse ne lit pas le lexique
   securite-assistant-0211-qa.mjs code 1 172 PASS, 4 FAIL
      FAIL C10f R1 (annexe E de 032-015) : les 13 demandes d’origine ordinaires (fuite, goutte, urgent, disjoncteur, décennale…) — la relance Signature PART
      FAIL C10g R1 … en Studio : les 13 relances sont PRÉPARÉES, sans motif « sujet sensible », aucun arrêt — [plombier] Bonjour, j’ai une fuite sous l’évie
      FAIL C10h R1 : la demande d’un AUTRE dossier du même e-mail (« Fuite sur le WC ») n’est jamais relue — la relance part — {"bilan":{"comptes":1,"envoye
      FAIL exception — Error: copie de lib/relancesImpayesMagasin.ts : motif introuvable «     const textes = (entrants ?? []).map((x) => (x as { contenu?: 
E-contestation-ignoree : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 1 échec(s) sur 236
      ❌ relances-impayes-qa : 1 échec(s) sur 236
        - magasin : contestation lit les messages entrants du client depuis l’émission, avec les mots de l’artisan (contestationDuClient)
   securite-assistant-0211-qa.mjs code 1 166 PASS, 3 FAIL
      FAIL C10b la brèche de 032-007 : une contestation écrite le 05/10, après l’émission, avant l’échéance (3 formes) — rien ne part, la relance devient un
      FAIL C10c … en Studio aussi : rien ne part ; la relance reste préparée (une carte), avec le motif « à relire » — {"bilan":{"comptes":1,"envoyees":0,"p
      FAIL exception — Error: copie de lib/relancesImpayesMagasin.ts : motif introuvable «     return contestationDuClient(textes, cfg.escalade_mots)
L-carte-retiree-signature : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 5 échec(s) sur 236
      ❌ relances-impayes-qa : 5 échec(s) sur 236
        - R1 : Signature, client qui conteste — rien ne part, la relance est préparée, aucun arrêt (reçu {"comptes":1,"envoyees":1,"preparees":0,"arretees":
        - R1 : la relance contestée est « a_valider » au journal ; la facture n’est pas arrêtée (« le client a répondu » n’est pas écrit)
        - R1 : l’artisan est prévenu avec le motif « le client conteste ou parle d’un sujet sensible : à relire »
        - R1 : la carte bloque la facture tant qu’elle attend (ni renvoyée, ni reproposée)
        - le passage distingue Signature (auto) et Studio (à valider) sur la capacité factures.relances.auto ; une contestation rend la carte même en Signat
   securite-assistant-0211-qa.mjs code 1 174 PASS, 3 FAIL
      FAIL C10b la brèche de 032-007 : une contestation écrite le 05/10, après l’émission, avant l’échéance (3 formes) — rien ne part, la relance devient un
      FAIL C10k MUTANT (la demande d’origine relue : la version de 032-009) : le juge VOIT la régression — 0/13 relances Signature n’y partent plus
      FAIL exception — Error: copie de lib/relancesImpayesTour.ts : motif introuvable «         if (!auto || sensible) { »
M-borne-retiree : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 1 échec(s) sur 236
      ❌ relances-impayes-qa : 1 échec(s) sur 236
        - magasin : contestation lit les messages entrants du client depuis l’émission, avec les mots de l’artisan (contestationDuClient)
   securite-assistant-0211-qa.mjs code 1 176 PASS, 2 FAIL
      FAIL C10i R1 : une contestation écrite AVANT l’émission (mars 2025, autre chantier) ne compte pas — la relance part (la lecture est bornée à l’émissio
      FAIL exception — Error: copie de lib/relancesImpayesMagasin.ts : motif introuvable «     if (debut) q = q.gte('sent_at', debut)
X1-borne-au-plus-tard : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 1 échec(s) sur 236
      ❌ relances-impayes-qa : 1 échec(s) sur 236
        - R1 : debutContestation — le plus tôt de emise_le et du jour d’émission (minuit à Paris, pris large) ; illisible : null (lecture sans borne)
   securite-assistant-0211-qa.mjs code 0 189 PASS, 0 FAIL

X2-sens-in-retire : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 1 échec(s) sur 236
      ❌ relances-impayes-qa : 1 échec(s) sur 236
        - magasin : contestation lit les messages entrants du client depuis l’émission, avec les mots de l’artisan (contestationDuClient)
   securite-assistant-0211-qa.mjs code 0 189 PASS, 0 FAIL

X3-borne-midi-utc : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 1 échec(s) sur 236
      ❌ relances-impayes-qa : 1 échec(s) sur 236
        - R1 : debutContestation — le plus tôt de emise_le et du jour d’émission (minuit à Paris, pris large) ; illisible : null (lecture sans borne)
   securite-assistant-0211-qa.mjs code 0 189 PASS, 0 FAIL

X4-motif-non-dit : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 2 échec(s) sur 236
      ❌ relances-impayes-qa : 2 échec(s) sur 236
        - R1 : l’artisan est prévenu avec le motif « le client conteste ou parle d’un sujet sensible : à relire »
        - R1 : Studio, client qui conteste — la relance reste préparée, avec le motif
   securite-assistant-0211-qa.mjs code 1 187 PASS, 2 FAIL
      FAIL C10b la brèche de 032-007 : une contestation écrite le 05/10, après l’émission, avant l’échéance (3 formes) — rien ne part, la relance devient un
      FAIL C10c … en Studio aussi : rien ne part ; la relance reste préparée (une carte), avec le motif « à relire » — {"bilan":{"comptes":1,"envoyees":0,"p
X5-plus-anciens-d-abord : SURVIT
   relances-impayes-qa.mjs code 0 ✅ relances-impayes-qa : 236/236 contrôles — calendrier, opt-in, arrêts, idempotence, isolation, pause, plafond, sources

   securite-assistant-0211-qa.mjs code 0 189 PASS, 0 FAIL

X6-sans-les-autres-dossiers : SURVIT
   relances-impayes-qa.mjs code 0 ✅ relances-impayes-qa : 236/236 contrôles — calendrier, opt-in, arrêts, idempotence, isolation, pause, plafond, sources

   securite-assistant-0211-qa.mjs code 0 189 PASS, 0 FAIL

X7-contestation-lue-apres-la-prise : TUÉ
   relances-impayes-qa.mjs code 1 ❌ relances-impayes-qa : 6 échec(s) sur 236
      ❌ relances-impayes-qa : 6 échec(s) sur 236
        - R1 : Signature, client qui conteste — rien ne part, la relance est préparée, aucun arrêt (reçu {"comptes":1,"envoyees":1,"preparees":0,"arretees":
        - R1 : la relance contestée est « a_valider » au journal ; la facture n’est pas arrêtée (« le client a répondu » n’est pas écrit)
        - R1 : l’artisan est prévenu avec le motif « le client conteste ou parle d’un sujet sensible : à relire »
        - R1 : la carte bloque la facture tant qu’elle attend (ni renvoyée, ni reproposée)
        - R1 : Studio, client qui conteste — la relance reste préparée, avec le motif
   securite-assistant-0211-qa.mjs code 1 184 PASS, 5 FAIL
      FAIL C10b la brèche de 032-007 : une contestation écrite le 05/10, après l’émission, avant l’échéance (3 formes) — rien ne part, la relance devient un
      FAIL C10c … en Studio aussi : rien ne part ; la relance reste préparée (une carte), avec le motif « à relire » — {"bilan":{"comptes":1,"envoyees":0,"p
      FAIL C10d réglages de la plateforme illisibles : rien ne part (le passage saute le compte, l’erreur est dite) — {"bilan":{"comptes":1,"envoyees":1,"pr
      FAIL C10k MUTANT (la demande d’origine relue : la version de 032-009) : le juge VOIT la régression — 0/13 relances Signature n’y partent plus
      FAIL C10m MUTANT (la borne d’émission retirée) : le juge VOIT la brèche — la contestation de mars 2025 y retient la relance — {"bilan":{"comptes":1,"e

[exited with code 0]
```
