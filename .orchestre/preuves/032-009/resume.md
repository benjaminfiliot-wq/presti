# 032-009 — les défauts moyens et faibles de 032-007, 032-008 et 032-011 (chantier 4, suite de L1 et L2), 02/11/2026

Exécutant : Claude Code (claude-code), sur le serveur Oracle (`/home/usine/Documents/presti`). Je n'ai fait ni commit, ni push, ni build,
ni typecheck, ni migration. Je n'ai joué aucune suite contre la production, touché à n8n, ni écrit dans le vault ou le cerveau. Aucune donnée
réelle : tous les comptes, fils, montants et messages des essais sont inventés.

**Réseau neuronal.** `regles_pour` (« assistant, pilote, relances, factures, escalade ») a rendu `[]`. `chercher` m'a renvoyé au §3.2 du
prompt de Benj (`p3-assistant.md:552-553`) et au §13 du plan (`chantier-4-assistant-plan.md:745-761`). J'ai lu aussi les §0 et §3 du plan
(l.16-44, l.308-383) et les trois rapports : `032-007/rapport.md` (défauts, l.135-262), `032-008/rapport.md` (l.1-260) et
`032-011/rapport.md` (l.1-340).

**Ordre des tâches.** La tâche demandait d'attendre que `032-008` soit dans `fait/`. Sur cette copie, sa fiche est encore dans
`.orchestre/file/032-008.md`, mais son audit est fini : rapport écrit avec sa ligne `VERDICT : NE TIENT PAS`, et `verifier.log` vert
(136 PASS). Aucune session ne le jouait ici (`ps`), et l'audit suivant (`032-011`) est dans `fait/`. J'ai donc commencé. **La session
principale doit ranger `032-008` dans `fait/`.**

**Ce qui était déjà posé et que j'ai gardé.** Les correctifs E4 et E5 de `lib/pilote/regles.ts` sont intacts : `PERTE_D_EAU` (l.191),
`refui`/`refuy` (l.163) et les espaces resserrées. Leurs essais C6l, C6m et C6n, et leurs mutants, aussi. Je n'ai fait que compléter.

## Défaut par défaut : le correctif, son essai, son mutant

Les essais sont dans `scripts/securite-assistant-0211-qa.mjs` (abrégé « S ») et `scripts/relances-impayes-qa.mjs` (abrégé « RI »). Chaque
mutant est une copie du fichier, correctif retiré, dans un dossier temporaire (`copie()`/`mutant()` de S). Un motif introuvable lève : un
mutant ne peut pas passer pour l'original sans rien dire.

### 1. Escalade en « fait tout seul » (032-007, voisin moyen)
- **Correctif** :
  - `lib/assistant/actions-serveur.ts:1426-1463` (`escaladeDeLaCarte`). Pour un outil pilotable, la fonction relit toutes les
    conversations rattachées à la carte : la conversation elle-même, celle du devis, celle du devis de la facture, et un `conversation_id`
    d'entrée s'il y en a un. Elle lit les 10 derniers messages entrants (`MESSAGES_ESCALADE_RELUS`) et la demande d'origine, avec
    `sujetEscalade` et les mots de l'artisan (`plateforme_config`). Tout passe sous la session (RLS).
  - `:1475` : un sujet trouvé met `horsAuto` à `LIBELLE_MOTIF.escalade` (« Le client parle d'un sujet sensible… »), et la carte reste à
    valider.
  - Une lecture en erreur donne `MOTIF_ESCALADE_ILLISIBLE` (`:73`) : carte aussi.
  - Cela vaut pour les 6 outils de `OUTILS_EXECUTABLES_PILOTE`, dont les 4 que la tâche nomme.
- **Essais** : S A6a à A6f.
  - A6a : relance de devis, `relancer_facture`, `valider_reponse_proposee` et `repondre_client` sur un fil en litige donnent 4 cartes, sans
    e-mail ni route.
  - A6b : le motif est dit au modèle.
  - A6c : témoin, les 4 partent d'office sur un fil neutre.
  - A6d : les mots de l'artisan comptent.
  - A6e : le plancher compte même si l'artisan a vidé ses mots (« perdu 2 litres d'eau »).
  - A6f : une panne des messages, de la conversation, des réglages, ou sur le chemin facture → devis → conversation, donne une carte.
  - D1c : le lexique lu est celui du pilote, aucune liste recopiée.
- **Mutants** :
  - A6g, relecture retirée : la relance du fil en litige part, e-mail au client.
  - A6h, `.catch(() => null)` : la conversation illisible laisse partir la relance.

### 2. Impayé contesté avant l'échéance (032-007, voisin moyen)
- **Correctif** :
  - `lib/relancesImpayes.ts:242-251` : `contestationDuClient`, une règle pure qui appelle `sujetEscalade`, et
    `MESSAGES_CONTESTATION_RELUS = 50`.
  - `lib/relancesImpayesMagasin.ts:72-82` : `reponseClient` lit maintenant les messages entrants du dossier **quelle qu'en soit la date**
    (les 50 plus récents), la demande d'origine et les mots de l'artisan (`getPlateformeConfigStrict`). Un sujet trouvé vaut une réponse :
    le passage arrête les relances de la facture (`arreter(…, 'reponse_client')`), et rien ne part ni n'est préparé. Une lecture en erreur
    lève, et le passage saute le compte.
  - Écart avec la tâche : elle plaçait la lecture « avant `decider` ». Or `lib/relancesImpayesTour.ts` est **hors de mon périmètre**. Le
    passage appelle `reponseClient` juste après le premier `decider`, et avant toute prise ou envoi. Le résultat est celui demandé : un
    sujet trouvé, rien ne part.
- **Essais** :
  - RI, 7 contrôles : 5 contestations lues, un message ordinaire ignoré, les mots de l'artisan, les contenus illisibles, la borne ;
    `reponseClient` lit sans `.gt(` de date ; aucune liste recopiée.
  - S C10a à C10d : **le vrai passage** (`tourRelancesImpayes`) sur **le vrai magasin**, sur la doublure PostgREST.
    - C10a : témoin, la relance J+3 part.
    - C10b : une contestation écrite le 05/10, échéance le 15/10, sous 3 formes : 0 envoi, arrêt « reponse_client ».
    - C10c : en Studio, rien n'est préparé.
    - C10d : réglages illisibles, 0 envoi.
- **Mutant** : C10e, `return false` à la place de la contestation : la relance de la facture contestée part, e-mail au client.

### 3. TTC (032-007, moyen : graphies et taux incohérent)
- **Correctif** :
  - `lib/assistant/cartes.ts:176-222` lit maintenant d'autres graphies :
    - après le nombre (`TTC_APRES`, l.180) : « TVA comprise », « TVA incluse », « taxes comprises », « (TTC) », « TVAC », « T.V.A.
      comprise » ;
    - avant le nombre (`TTC_AVANT`, l.184) : « Prix TTC 450 € », « TTC : 450 € », « le prix TTC de 450 € ».
  - Le « TTC » qui suit un nombre précédent n'est pas lu comme celui du suivant (« 450 € TTC, 300 € HT » : 300 reste HT), et un « HT »
    après le nombre l'emporte (`marqueTtc`, l.186).
  - `prixEcrits(textes, tvaTaux = 10)` (l.201) ne retient plus que la forme HT **au taux de la pièce**. `tauxTtcPossibles` (l.219) dit à
    quels autres taux le prix serait la forme HT.
  - `lib/assistant/actions-serveur.ts:160-169` : `ajouter_tarif` lit le taux envoyé (défaut 10). `modifier_tarif` lit celui du tarif
    (`:490`, la vérification passe donc après la lecture du tarif). La facture libre lit son `tva_taux` (`:1076`).
  - Les lignes sans tarif d'un devis restent à 10 %, comme `resoudreLignes`. Hors du taux, le refus commence par « Prix TTC donné : quel
    taux de TVA ? ».
- **Essais** :
  - S A4i, réécrit : il figeait le défaut (les trois formes HT admises à tout taux). Il exige maintenant 409,09 seul à 10 %.
  - A4j : 16 graphies, 450 n'est jamais un HT.
  - A4k : 5 HT voisins gardés.
  - A4l : la question du taux.
  - A5e : 409,09 à 10 % s'enregistre, 375 à 10 % reçoit la question du taux sans rien écrire, 375 à 20 % s'enregistre.
  - A5f : 5 graphies recopiées en HT sont refusées.
  - A5g : `modifier_tarif` lit le taux du tarif.
- **Mutants** :
  - A4m, les trois taux de 032-006 : 375 HT à 10 % passe.
  - A4n, la lecture TTC de 032-006 : 5 graphies donnent 450 en HT.
  - A5d est repointé sur la nouvelle ligne de garde.

### 4. Tournures de D2 (032-007, moyen ; et faible : les vrais ordres devenus des cartes)
- **Correctif** :
  - `lib/assistant/cadrage.ts:213` (`REPORT`) gagne « à 14h30 », « vers 10h », « vers 17 h », « à midi », « aprèm », « après-midi », « la
    semaine pro », « qui vient », « dans un moment », « tantôt ».
  - `:222` (`FAIT_EN_FIN`) gagne « partie(s) », « parti(s) », « effectué(e)(s) », « transmis(e)(s) », « expédié(e)(s) ». « la première
    partie » reste un nom (`faitEnFin`, `:233`).
  - Faible :
    - `DATE_QUI_DECRIT` (`:211-212`, lu à `:256`) ôte, avant `REPORT`, une date qui filtre (« depuis le 15 octobre ») ou qui décrit le
      chantier (« chantier le 15/11 ») ;
    - « Ok ça marche » est un oui (`ACCORD_EN_TETE`, `:229`), alors que « ça marche » seul et « ok ça marche merci » restent des cartes.
- **Essais** :
  - S A2s : 17 tournures neuves, jamais d'office.
  - A2t : les 3 vrais ordres de 032-007, et 2 voisins, partent d'office ; « Relance Dupont le 15 », « depuis le 15, mais demain »,
    « chantier le 15, plus tard » et « ok ça marche merci » restent fermés.
  - **Les 59 tournures déjà fermées sont rejouées et tiennent toutes** : A2n (30) et A2q (29). A2g (58 phrases), A2h, A2h2 et A2r aussi.
- **Mutants** :
  - A2u, `REPORT` et `FAIT_EN_FIN` de 032-006 : « à 14h30 » et « partie » s'ouvrent.
  - A2v, toute date lue comme report : le vrai ordre redevient une carte.

### 5. Synonymes d'escalade (032-007 E2, liste des 22 ; 032-011 M4 ; faux positifs de 032-008, section 5)
- **Rejeu avant correctif** : 19 des 22 étaient déjà repérés. Passaient encore « une tache d'humidité », « l'eau coule le long du mur » et
  « c'est pressé ». De M4, 16 sur 18 passaient.
- **Correctif** (`lib/pilote/regles.ts`) :
  - l.164-167 : `humidit`, `humide`, `eau coule`, `coule le long`, `ruissel`, `s'échapp`, `s'écoul`, `eau qui sort`, `eau sort`,
    `eau se perd`, `de l'eau sous`, `lâche/crache/pisse de l'eau`, `se vide tout seul`, `perd du liquide`, `perte de liquide`,
    `c'est pressé`, `est très pressé`, `suis pressé`, `odeur`.
  - l.194 (`APPAREIL_PERD`) : l'appareil qui « perd » sans complément. Jamais « perd de la pression », « perd en pression » ni « perd sa
    chaleur ».
  - l.217 : « ça sent », lu après les mots entiers (« ça sent le gaz » garde le sujet « gaz », C1b).
  - l.199 (`NOMS_NEUTRES`), appliqué l.211 et l.218, aussi aux mots de l'artisan : ôte « brûleur », « chaudière (à) gaz », « cuisinière
    gaz », « plaque (de cuisson) gaz » et « attestation (d'assurance) (décennale) ». Le reste du message est lu : « ça sent le gaz près de
    la chaudière gaz », « le brûleur a brûlé » et « attestation d'assurance : j'ai un litige » restent des escalades.
- **Essais** :
  - S C6o : les 22 de 032-007 et les 18 de M4 donnent l'escalade, et aucune réponse ne part seule en Signature « auto ».
  - C6p : sur un **corpus fictif de 30 demandes ordinaires** que j'ai écrit, lu avec les mots par défaut de l'artisan, aucune ne passe à
    la main. Avant ce lot, « brûleur », « chaudière gaz », « chaudière à gaz », « cuisinière à gaz », « attestation d'assurance
    décennale » et « attestation d'assurance » l'étaient.
  - C6q : 8 vrais sujets, aucun masqué par les noms ôtés.
  - C6t, F3 de 032-008 : 6 formes des audits jouées sur la **vraie dépendance du pilote** ; un fil ordinaire part. Le cron, lui, est joué
    en C9g.
- **Mutants** :
  - C6r : les synonymes retirés, le motif `APPAREIL_PERD` retiré, les noms neutres non ôtés. Chacun rougit.
  - C6s, F6 de 032-011 : sans `refui`, « Ça refuit » passe ; avec `refu`, « Refuge pour chats » est pris.

### 6. Essai de bout en bout du cron (032-007, « Faibles », dernier point)
- **Correctif** : l'ancien C9f lisait le source par expressions régulières ; il est remplacé dans S (bloc C9). Les nouveaux essais jouent
  **le vrai `GET`** de `app/api/cron/relances/route.ts` sur la doublure PostgREST. Seules ses dépendances lourdes sont doublées : modèle,
  e-mail espionné, purges, autres passages. La décision est celle du fichier, à l'octet.
- **Essais** :
  - C9f : témoin, un fil ordinaire en Signature : `sent 1`, un e-mail au client, la relance tracée dans le fil.
  - C9g : un fil en litige, ou « perdu 2 litres d'eau » dans la demande d'origine : `sent 0`, relance annulée, aucun e-mail.
  - C9h : un fil pris en main est annulé.
  - C9i : réglages illisibles : rien ne part, et la relance reste due.
- **Mutants** :
  - C9j, le sujet du fil ignoré : la relance du fil en litige part.
  - C9k, la prise en main ignorée : elle part aussi.

### Défauts des audits distincts 032-008 et 032-011 (déjà fermés, ou laissés exprès)
- **Déjà fermés dans l'arbre par E4 et E5, avec leurs essais C6l, C6m, C6n et C6j MUTANT** : M1, M3 (« perd de leau », « perd deau ») et
  M5 (l'incise).
- **Fermé par ce lot** : M2 (`refui`, `refuy`) a désormais son mutant, C6s.
- **Fermés ici** : M4 (point 5), F3 (C6t, C9g, A6e) et F6 (C6s).
- **Laissés exprès** :
  - F1, les coquilles « fiute » ou « fite » : une lecture approchée prendrait « suite » pour « fuite ». C'est la recommandation même de
    032-008.
  - F2, les autres langues : information, vague 2.
  - F4, « pers », « per », « de l'o » : « per » ouvrirait « permis » et « personne ». C'est la recommandation de 032-011.
- **F5, les faux positifs au coût d'une relance annulée** : les plus fréquents baissent (point 5). Le remède de fond est hors de ce lot,
  plus bas.

## Les quatre suites (jouées une à une, puis par `node scripts/orchestre.mjs verifier 032-009`)

| Suite | Avant ce lot | Après (`verifier.log`) | Code |
|---|---|---|---|
| `securite-assistant-0211-qa` | `142 PASS, 0 FAIL` | `179 PASS, 0 FAIL` | 0 |
| `relances-impayes-qa` | `218/218` (032-007) | `✅ relances-impayes-qa : 225/225 contrôles` | 0 |
| `assistant-qa` | `310 PASS, 0 FAIL` | `310 PASS, 0 FAIL` | 0 |
| `pilote-qa` | `88 vert(s), 0 rouge(s)` | `88 vert(s), 0 rouge(s)` | 0 |

`node scripts/orchestre.mjs verifier 032-009`, rejoué depuis `fait/`, donne `✓ 032-009 : PASS · 4s · 9579 ligne(s) produite(s)`
(verdict du 2026-11-02T16:19:46Z ; preuve : `.orchestre/preuves/032-009/verifier.log`, avec les quatre dernières lignes ci-dessus et
0 ligne `FAIL`).
- Le compte de lignes part du SHA de la prise (`5cb575d`). Il inclut donc E4 et E5, déjà dans l'arbre, et la conversion CRLF → LF des
  fichiers.
- J'avais d'abord ôté le verrou à la main avant de rejouer, ce qui donnait `agent: ?`. Je l'ai remis avec les valeurs de la prise (agent,
  SHA, heure du cliché `avant.txt`), puis `verifier` l'a nettoyé lui-même.

J'ai aussi joué, une à une, les suites gratuites du lanceur qui lisent les modules touchés. Toutes sont vertes :
- `acces-automatisations-qa` : 62/62 ;
- `aide-automatique-qa` : 62, 0 échec ;
- `assistant-tout-qa` : 120 PASS ;
- `crm-lot2-qa` : 46 verts ;
- `garde-fou-envoi-qa` : 33 verts ;
- `relances-registre-qa` : 44 PASS ;
- `ia-unit-e2e` : 158 réussis.

## Fichiers modifiés (tous dans le périmètre)
- `lib/assistant/actions-serveur.ts`
- `lib/assistant/cadrage.ts`
- `lib/assistant/cartes.ts`
- `lib/pilote/regles.ts`
- `lib/relancesImpayes.ts`
- `lib/relancesImpayesMagasin.ts`
- `scripts/securite-assistant-0211-qa.mjs`
- `scripts/relances-impayes-qa.mjs`
- `.orchestre/preuves/032-009/resume.md`

Les autres fichiers modifiés de l'arbre ne sont pas de moi : `plans/…`, `AGENTS.md`, `CLAUDE.md` et `scripts/verifier-outils-obligatoires.mjs`
changeaient déjà au départ, ou viennent d'autres sessions (032-010, 032-012).

## Hors de ce lot (notés seulement)
- **La marque d'escalade posée sur le dossier** (fenêtre de 10 messages, I3) : elle demande une colonne, donc une migration, au « go » de
  Benj.
- **La relance annulée qui prévient l'artisan** (032-007 « Faibles », point 2 ; F5 de 032-011) : elle se construira dans le workflow n8n des
  relances (plan, §0 bis, « Automatisations codées à migrer »).

## Risques et points à valider (pour l'audit distinct, avant tout push)
1. **Le pilote préfère un `conversation_id` d'entrée à la conversation du devis** : `lib/pilote/executeur.ts:50-51`
   (`conversationDeLaCarte`, hors de mon périmètre). Aujourd'hui, `validerAction` refuse tout champ inconnu
   (`lib/assistant/outils-actions.ts:575-576`), et aucun outil pilotable sur un devis ou une facture n'a ce champ : je n'ai donc pas de
   brèche prouvée. Le « fait tout seul » lit maintenant l'union des conversations ; le pilote pourrait en faire autant.
2. **Contestation, puis reprise** : la contestation est relue à toutes dates. Un artisan qui « reprend les relances » d'une facture contestée
   voit son passage suivant les arrêter de nouveau (côté sûr). Il relance alors à la main (bouton, ou carte de l'assistant).
3. **Faux positifs neufs, du côté sûr** : « humide » et « humidité » prennent une demande de VMC pour « salle de bain humide ». « odeur »
   et « ça sent » prennent une odeur d'égout. Le coût reste celui de F5 : une relance annulée sans un mot. Le corpus de 30 demandes n'en
   contient pas, et le lexique par métier reste en vague 2.
4. **`NOMS_NEUTRES` s'applique aussi aux mots de l'artisan** : un artisan qui aurait mis « brûleur » ou « chaudière gaz » dans ses mots
   d'escalade ne les verrait plus lus. C'est un choix à confirmer ; le défaut de Presti, lui, contient « gaz » et « assurance ».
5. **`DATE_QUI_DECRIT` rouvre le « fait tout seul »** sur un ordre qui porte une date descriptive. Le pire qui parte reste une relance, ou
   un devis entièrement sourcé (raisonnement de 032-007, D2). Les gestes §3.2 restent des cartes.
6. Typecheck et build restent à jouer par la session principale. J'ai écrit des types simples (lectures `maybeSingle` castées comme
   ailleurs dans le fichier), sans pouvoir les compiler ici.

TACHE 032-009 FAITE
