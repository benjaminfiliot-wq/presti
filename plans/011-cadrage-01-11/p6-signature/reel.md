# 036-038 — Le palier « réel » de Studio et Signature, prêt à servir compte par compte

État au 03/11/2026, vers minuit (Claude Code, hôte d'agents d'Oracle, reprise après Codex et Antigravity).

**Construit, prouvé hors ligne et par un vrai envoi vers `delivered@resend.dev`. Rien n'est publié, aucun vrai compte n'est passé en réel.**

- Juge : `node scripts/reel-qa.mjs`, vert, avec 28 mutants sur 28 vus. Sortie complète : `.orchestre/preuves/036-038/resume.md`.
- Source unique de tout le code n8n du réel : `lib/agents/n8n/envoi-reel.mjs`. Le juge exécute ces codes et compare les exports rapatriés
  octet pour octet.
- Aucune migration : la 0198 n'est pas nécessaire. Les colonnes de 0194 (`origine`, `departement`, `motif`, `sources`, `cle`) et le JSON
  `entrees` suffisent.

## 1. Le chemin réel de chaque offre

Un département n'est au réel que si `tous` **et** le département sont au palier `reel` et en marche (`departements_reglages`, 0193). C'est le
plus prudent des deux qui s'applique. La règle est la même à trois endroits : « Aiguiller » (n8n), « Comptes au réel » (n8n) et la garde de
l'app (`lib/agents/n8n/garde-reel.ts`).

| Étape | Studio réel | Signature réel |
|---|---|---|
| 1. Le fait | L'app range `demande_recue` (ou `relance_due`), puis **se tait** pour ce type (§ 2) | idem |
| 2. Le Cerveau (`presti-cerveau`) | « Aiguiller » sert le réel ; le chef reçoit **toujours** `simulation: true`. Aucun chef n'envoie jamais rien | idem |
| 3. La carte (`assistant_actions`, origine `agent`) | Elle naît `en_attente`, avec `entrees.palier = 'reel'` et `envoi = 'au_clic'`. Motif : « rien ne part sans votre clic « Valider » » | Si le type est permis par l'offre et que le texte est prêt : `envoi = 'pilote'` et `envoyer_apres` = maintenant + 10 min. Motif : « partira seule dans 10 minutes (« Refuser » l'annule) ». Sinon, elle part au clic, comme Studio |
| 4. Le geste de l'artisan | Le **seul** clic « Valider » (`app/api/assistant/agents/route.ts`) fait passer la carte `en_attente → en_cours` : c'est le seul chemin vers l'envoi | Rien à faire. « Refuser » pendant les 10 minutes annule (`en_attente → refusee`). « Valider » fait partir la carte tout de suite |
| 5. L'envoi (`presti-dep-envoi`, chaque minute) | Il prend les cartes `en_cours` du réel, relit l'offre, les contrôles et l'opposition, puis **réclame** la carte (§ 3) et appelle `lib-envoyer-courriel` | Il prend les cartes `en_attente` dont le pilote est **échu**. Il relit l'offre (`plateforme.ia.auto`, `relances.auto`, `factures.relances.auto`), l'opt-in d'impayé et le plafond de 20 envois seuls par jour, puis fait de même |
| 6. Le canal (`lib-envoyer-courriel`) | Identifiant n8n « Resend (Presti) » (Header Auth) ; expéditeur `<nom de l'artisan> <contact@prestiapp.fr>` ; Reply-To = l'adresse de l'artisan ; en-tête `Idempotency-Key` | idem |
| 7. La trace | Sur la carte : « Fait : réponse envoyée par e-mail (après votre validation). » Une ligne `messages` (sortant) dans la conversation | « Fait : … (partie seule après 10 minutes). » Même trace |

Ce qui ne part **jamais** seul, sur aucune offre :
- seuls trois types sont envoyables par n8n : `reponse_prospect`, `relance_prospect` et `relance_impaye` (`ENVOYABLES`) ;
- un devis, un prix estimé, un paiement ou une facture restent une carte que l'artisan fait dans l'app ;
- une carte sans texte (« la réponse reste à rédiger ») ne part pas. Si on la valide, elle passe en échec, avec la raison écrite ;
- un jour férié (calendrier.api.gouv.fr), une relance ou un impayé ne partent pas seuls : ils attendent le clic.

Chaque message porte trois choses :
- la mention d'IA :
  - « Message rédigé et envoyé automatiquement par l'assistant de X. » quand il part seul ;
  - « … préparé par l'assistant de X, relu et validé par X. » quand il part au clic ;
- l'opposition : « Répondez simplement « STOP » … (désinscription immédiate) », plus l'en-tête `List-Unsubscribe` ;
- aucun « Presti » : ni dans le nom, ni dans l'objet, ni dans le texte. Le Décider et le canal le refusent tous deux.

L'opposition est relue avant chaque envoi, de deux façons :
- un message entrant du client qui dit STOP, « désinscri… » ou « ne plus me contacter… » ;
- l'empreinte de son adresse dans `crm_apres_opposition` : SHA-256 sur 32 caractères, la même que `lib/crm/apresOpposition.ts`, prouvée égale
  à `node:crypto`.

Une lecture commune en erreur (pause générale, oppositions, réponses, comptes) arrête tout le passage : **rien ne part**, et la carte attend le
passage suivant.

## 2. La garde anti-doublon, type par type

Quand n8n prend un type pour un compte, le code de l'app qui faisait ce type pour ce compte se tait. La garde (`gardeReel`) lit
`departements_reglages`, bornée à 1,5 s. **En erreur, lente, ou sur une ligne absente, elle répond « non » : c'est l'app qui garde la main.**

| Type (n8n) | Département | Ce qui se tait dans l'app | Où | Ce qui reste |
|---|---|---|---|---|
| `reponse_prospect` | accueil | La réponse automatique, la proposition (et son pilote) et l'accusé de réception au prospect | `app/api/leads/route.ts`, garde après la pause, le débit et le fait rangé (`evenementRange`) | Le message est tracé, l'artisan est prévenu. Fait non rangé : la voie historique continue |
| `relance_prospect` | suivi | La relance de conversation (envoi en Signature, proposition en Studio) | `app/api/cron/relances/route.ts` : le fait `relance_due` est rangé, puis la relance est **prise** (`envoyee: true`, conditionnelle) | Sans la prise, la relance reviendrait chaque jour et boucherait le lot. Fait non rangé : la voie historique |
| `relance_impaye` | facturation | Le tour des relances d'impayés de l'app, pour ce compte | même cron : `magasinHorsReel`, qui écarte les comptes dont la Facturation est au réel | Les autres comptes : inchangés |
| les autres | devis, après-chantier, opérations, direction | Rien : au réel, ces départements ne font que des cartes, n8n n'envoie rien pour eux | — | L'app garde tout |

Jamais deux envois pour une même carte, côté n8n, grâce à trois verrous :
1. **La réclamation atomique** : `PATCH assistant_actions?id=…&artisan_id=…&origine=eq.agent&statut=eq.<attendu>[&entrees->pilote->>envoyer_apres=lte.<échéance>]`,
   qui pose `executee`, avec `Prefer: return=representation`. Seul le passage qui reçoit la ligne envoie. Ne reçoivent rien :
   - un second passage ;
   - un double clic ;
   - un « Refuser » arrivé avant.
2. **L'en-tête `Idempotency-Key`** = `reel:<12 derniers du compte>:<clé de la carte>`. Un rejeu rend le même envoi (prouvé, § 4).
3. **La carte d'agent** est unique par compte et par clé (0194 : `on_conflict=artisan_id,cle`).

Un plantage entre la réclamation et Resend laisse la carte à « Envoi en cours… ». C'est visible, et il n'y a pas de doublon : au plus une fois.

## 3. Ce qui est dans n8n (rien n'est publié)

| Workflow | Id | État | Ce que 036-038 y a fait |
|---|---|---|---|
| `presti-cerveau` | `596OC5mL2aMBq6SD` | Version **active inchangée** `78c413bb` (036-034). Brouillon `02860d45` | Cinq retouches dans le **brouillon**, par-dessus celui de 036-036 (relu avant d'écrire : dernière version `6fedfef9`, 20:48) : la lecture et « Interrupteur général » acceptent `reel` ; « Aiguiller » a `SERVIS` avec `reel` ; « Préparer les cartes de l'ombre » porte `BLOC_CARTES_REEL` ; « Préparer les marques » rejoue une carte du réel non écrite. Connexions identiques, 35 autres nœuds identiques |
| `presti-dep-envoi` | `DPZnxlsZHUwFEY0H` | **Non publié** | Créé : 25 nœuds. Chaque lecture est filtrée par compte. Écritures conditionnelles |
| `lib-envoyer-courriel` | `Zs4fVsKZThSRCDjd` | **Non publié** | Créé : le contrôle de l'enveloppe, puis Resend. Appelant unique : `presti-dep-envoi`. Aucune exécution réussie conservée (texte et adresse jamais gardés) |

Je n'ai pas publié `presti-cerveau`, parce que son brouillon porte aussi le travail non prouvé de 036-036 (en file). Le publier aurait mis en
production les lectures des six départements de 036-036. Les deux sont à publier ensemble, une fois 036-036 vert (§ 5).

## 4. L'essai vers `delivered@resend.dev` (fait)

J'ai joué `test_workflow` sur **le vrai** `presti-dep-envoi`.
- Les lectures et écritures Supabase sont épinglées avec les données fictives `.orchestre/preuves/036-038/banc-fictif.json`, soit huit cartes
  sur deux comptes fictifs `…d1` (Studio) et `…d2` (Signature).
- Les nœuds Code de production ont tourné pour de vrai, et `lib-envoyer-courriel` comme Resend ont été appelés pour de vrai.
- Les deux exécutions ont été relues par `get_workflow_execution` ; relevé complet : `essais-n8n.json`.

| Exécution | Ce qui est parti (Resend) | Ce qui est écarté, et noté sur la carte | Ce qui est laissé |
|---|---|---|---|
| **2749** (sous-exécutions 2750, 2751) | Studio, carte `c001` cliquée : `01a1a3a9-e1dd-7aff-95ed-02fe30fc383d`. Signature, carte `c002`, pilote échu : `01a1a3a9-e2ae-7cd0-8690-887dd515c092` | `c005` : le client a écrit STOP (`opposition`). `c006` : impayé sans opt-in (`opt_in`). `c007` : texte qui dit « Presti » (`marque`, la carte passe en échec) | `c003` : pilote pas échu. `c004` : Studio sans clic. `c008` : carte de l'ombre validée |
| **2753**, rejeu à l'identique (2754, 2755) | **Les deux mêmes identifiants** : Resend a rendu l'envoi d'origine, aucun second message | — | — |

Les enveloppes relues dans 2749 :
- l'expéditeur est « Exemple Menuiserie Essai Studio <contact@prestiapp.fr> » ;
- le Reply-To est l'adresse fictive de l'artisan (`@example.com`) ;
- le pied porte la mention d'IA et le STOP ;
- aucun « Presti ».

**L'essai en base, sur deux comptes de test, reste à la session principale.** Il faut la base, qui m'est fermée ici. Voici le script et
l'ordre :
1. `node .orchestre/preuves/036-038/essai-compte-test.mjs preparer`. Il crée deux comptes fictifs par l'API admin, avec `tous` et `accueil`
   au réel posés par le fondateur (0193), une demande vers `delivered@resend.dev` et une carte chacun.
2. `node … cliquer` : la même réclamation que le clic « Valider » de la boîte, sur la carte Studio.
3. `execute_workflow` (manuel) sur `presti-dep-envoi`. La carte Studio part ; la carte Signature est laissée, son pilote n'est pas échu.
4. Attendre 10 minutes, puis rejouer : la carte Signature part.
5. Rejouer encore une fois : rien ne part.
6. `node … verifier` : deux cartes « Fait : … » et **un** message sortant chacune.
7. `node … nettoyer`.

Avant le premier `execute_workflow` : `departements_reglages` ne doit avoir **aucun autre compte** au réel. Relire
`select artisan_id from departements_reglages where palier = 'reel'`.

## 5. Le geste de la session principale pour passer un vrai compte en réel, type par type

Sur le « go » écrit de Benj seulement. Un compte, un type à la fois. L'ordre suit `mise-en-service.md`, étapes 11a, 11b et 12.

0. **Une fois pour toutes** :
   - rapatrier les fichiers, puis `npm run typecheck`, `npm run build` et `node scripts/reel-qa.mjs` ;
   - déployer l'app : sa garde doit être en ligne **avant** que n8n prenne quoi que ce soit ;
   - publier `lib-envoyer-courriel`, puis `presti-dep-envoi`, puis `presti-cerveau`, ce dernier seulement une fois 036-036 vert. Sinon :
     restaurer `78c413bb`, rejouer les cinq retouches (`appliquerReel*` de `envoi-reel.mjs`) et publier.
1. **Studio (11a)** : poser `tous`, puis `accueil`, à `reel`, par le compte fondateur (`acteur_id`). Vérifier ensuite :
   - la première demande donne une carte « rien ne part sans votre clic » ;
   - l'app ne répond plus seule (`raison: 'agent_reel'`) ;
   - après le clic, la carte affiche « Fait : … » et le message arrive.
   Puis `suivi`, puis `facturation`, chacun après une semaine sans écart.
2. **Signature (11b)** : même geste, `accueil` d'abord (`reponse_prospect`), une semaine. Puis `suivi` (relances). Puis `facturation`, et
   seulement si l'artisan a coché les relances d'impayés (opt-in).
3. **Premier envoi réel à un client (12)** : toujours précédé de l'accord de l'artisan et d'un envoi « vers moi d'abord ».

**Condition d'activation de l'Accueil, à lire avant 1 et 2.** Au réel, une vraie demande arrive encore au chef Accueil **sans proposition de
réponse** : c'est la limite de 036-034. Sa carte n'a donc pas de texte et ne part pas.
- Signature : passer l'Accueil au réel aujourd'hui retirerait la réponse automatique de l'app sans la remplacer. Le prospect n'aurait plus rien
  de seul, mais la demande reste là, et l'artisan est prévenu.
- **Ne pas passer l'Accueil d'un compte Signature en réel** tant que le Cerveau ne compose pas la proposition (`lib-rediger-message`), et
  qu'une carte avec texte n'a pas été vue sur le compte de test.
- Studio peut y passer, puisque rien n'y partait seul. L'artisan répond depuis Messages.

## 6. Le retour arrière

- **Un type** : remettre ce département en `ombre` ou en `simulation`. L'artisan peut toujours le faire, sans acteur ; c'est voulu, l'arrêt ne
  se bloque jamais. Dès le passage suivant :
  - `presti-dep-envoi` n'envoie plus rien pour lui : « Comptes au réel » ne le voit plus, et le Décider exige que le département soit encore au
    réel. Le juge le prouve ;
  - la garde de l'app lui rend la main.
- **Les cartes restées** :
  - les cartes `en_attente` d'un pilote non échu ne partent plus ;
  - les cartes cliquées et pas encore parties (`en_cours`) restent visibles. Elles repartiront si l'on revient au réel ; sinon, la session
    principale les passe en `annulee` ;
  - une carte `executee` à « Envoi en cours… » est relue à la main avant toute reprise. La clé d'idempotence protège 24 h côté Resend.
- **Tout** :
  - dépublier `presti-dep-envoi` : plus aucun envoi n8n ;
  - restaurer `presti-cerveau` sur `78c413bb` : plus de cartes du réel ;
  - l'app, elle, garde la main d'elle-même dès qu'aucun département n'est au réel.
- **L'essai** : `essai-compte-test.mjs nettoyer`. Les essais n8n de ce soir n'ont rien écrit en base : écritures épinglées.

## 7. Limites, écrites

- La porte `lib-porte-conformite` n'est pas appelée par `presti-dep-envoi`. Le contrôle de ce canal est dans « Contrôler l'enveloppe »
  (marque, mention, STOP, clé, destinataire) et dans le Décider. À brancher avant d'élargir au-delà des trois types.
- Après une réponse partie par n8n, la conversation reçoit sa trace (`messages`). En revanche, la planification J+2, J+5 et J+10 (`relances`) et
  le statut `repondu` ne sont pas posés par n8n. Tant que ce n'est pas fait, passer le Suivi au réel en même temps que l'Accueil.
- Les relances d'impayés envoyées par n8n ne sont pas vues par le registre de 3 jours de l'app (`lib/relancesRegistre.ts` lit `relancer_facture`,
  pas `relance_impaye`). La garde de la Facturation tait le tour de l'app ; l'assistant de gestion peut encore proposer une relance au clic.
- La boîte (`app/crm/BoiteAgents.tsx`, hors de mon périmètre) n'affiche pas encore le compte à rebours du pilote. Le motif de la carte le dit en
  clair.
- Le juge prouve le code et les exports ; l'essai prouve l'envoi. Le passage en base (comptes, clic par la vraie route, cron) reste à la session
  principale (§ 4).
