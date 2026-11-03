# Le dossier du mode ombre — prêt pour un compte volontaire (prompt 6, lot 036-012)

Écrit le 03/11/2026 par Claude Code. **Rien n'est publié, rien n'est appliqué, aucun compte n'est branché.** Ce dossier dit comment on fait tourner le système d'agents sur
les **vraies données d'un artisan volontaire**, sans que rien ne sorte, et comment on compare à ce qu'il a réellement fait (p6:370 : « mode ombre sur un vrai compte
volontaire : tout se prépare, rien ne sort, on compare à ce que l'artisan a réellement fait »). Il se lit avec `mise-en-service.md` (étape 10) et `runbook.md`.

## 1. L'accord écrit — avant tout branchement

Pas d'accord, pas de branchement : ni lecture de sa boîte, ni connexion, ni copie de workflow. L'accord se range **hors du dépôt** (un secret de relation, pas du code) et tient en
une page que l'artisan lit et signe :

| À dire en clair | Pourquoi |
|---|---|
| **Ce qu'on lit** : sa boîte mail (les messages reçus), son agenda (les créneaux libres), ses devis et factures dans Presti | le consentement porte sur des données de clients à lui (RGPD : `docs/registre-traitements.md`, § relève de la messagerie) |
| **Ce qu'on fait avec** : préparer des réponses, devis, relances en **cartes** qu'il peut voir ; **rien n'est envoyé** à ses clients pendant l'ombre | c'est la définition de l'ombre |
| **Ce qu'on garde** : les cartes, le journal « fait : … », le coût IA ; **pas** le texte de ses clients dans les faits (`faits_sans_texte`, `0185`) | minimisation |
| **Combien de temps** : 14 jours au plus pour un premier département, renouvelable par écrit | une ombre sans fin est un système caché |
| **Comment il arrête** : un bouton « Retirer » (efface le jeton), un message à Benj ; effet immédiat | § 6 |
| **Ce qu'il ne doit pas faire** : rien — il travaille comme d'habitude ; c'est ce qu'il fait qu'on compare | sinon la comparaison ne vaut rien |
| **Les données d'un autre** : aucune ; son compte seul (`artisan_id`) | multi-tenant strict |
| **Le coût pour lui** : aucun pendant l'ombre ; aucun prix n'est annoncé avant la fin (p6:618 : « jamais un prix inventé ») | honnêteté |
| **Studio ou Signature** : son offre ; l'ombre ne fait **rien partir seul**, même en Signature | c'est le cran avant `reel` |

Le volontaire est **un Studio et un Signature** (deux accords), puis l'organisation de Benj en client zéro (`OUTILLAGE.md` § 10). Un volontaire n'est pas un prospect : c'est quelqu'un
qui a dit oui, et qui peut dire non demain.

## 2. Ce qui est préparé (par Presti, avant le premier jour)

À faire, dans cet ordre, par Benj ou la session principale — chaque ligne est un geste réservé (voir `mise-en-service.md`) :

1. Migrations `0185`, `0192`, `0193` collées ; drapeaux `systemeAgents` (et `connexions` si l'artisan connecte sa boîte) levés **après**.
2. Les 19 enfants et les parents publiés (enfants d'abord), les bancs restant inactifs.
3. **La copie du client** fabriquée à blanc : `node scripts/deployer-client-n8n.mjs --client=<slug> --offre=studio|signature` — 10 workflows `client-<slug>-*`, tous inactifs ; Studio : tous les nœuds d'envoi désactivés ; emplacements `EMPLACEMENT_<SLUG>_<type>` à brancher **par Benj** sur les identifiants du volontaire. Importée dans n8n, inactive.
4. **Le Cerveau et le chef du département** relus en `simulation` pour ce compte (`departements_reglages.palier = 'simulation'`) : un passage complet, le journal lu.
5. **La ligne de base des KPIs** relevée (`kpis-base.md` § 10) : sans elle, on ne saura jamais si l'ombre a servi.
6. **Le palier `ombre`**, posé par Presti (acteur fondateur) pour **un seul département à la fois** : d'abord `accueil` (la réponse en moins d'une minute est la plus visible, la moins risquée en ombre), puis `suivi`, puis `devis`, `facturation`, `apres`, `operations`, `direction`.

Ce que l'ombre **ne fait jamais**, vérifié hors ligne par les juges avant qu'on la lance :

- aucun envoi à un client (Studio : `deployer-client-n8n-qa.mjs` D3 ; boîte : brouillon créé, jamais envoyé, `boite-n8n-qa.mjs` B1) ;
- aucun brouillon dans sa boîte **en ombre** : règle prudente retenue par ce dossier (le palier `ombre` de `0193` n'est qu'un nom ; aucun juge ne distingue encore l'ombre du réel pour le brouillon) — le brouillon de Studio ne naît qu'au palier `reel`, en ombre la carte n'est visible que dans Presti ; **un lot de 036-011 ou de bascule doit l'écrire et le juger avant la première ombre** ;
- aucun geste de `OUTILS_JAMAIS_AUTO` (`cerveau-accueil-n8n-qa.mjs` A3) ; aucun rendez-vous posé (décision 5) ; aucun SMS (décision 4) ; aucune réponse à un avis sur la fiche Google (décision 3) ;
- aucune lecture d'un autre compte (`cerveau-accueil-n8n-qa.mjs` M1/M2).

## 3. Ce qui est comparé

Pendant l'ombre, pour **chaque événement** que le système traite, on garde deux choses côte à côte : **ce que le système aurait fait** (la carte préparée, son brouillon, son montant calculé par le
code) et **ce que l'artisan a réellement fait** (le message qu'il a envoyé lui-même, le devis qu'il a chiffré, la relance qu'il a posée ou oubliée).

| Département | Ce que le système prépare | Ce que l'artisan fait | La comparaison |
|---|---|---|---|
| Accueil | une réponse à la demande (carte + brouillon *virtuel*), l'urgence et le tri | sa propre réponse (`messages.sens = 'out'`) | délai (`kpis-base.md` § 1), même intention (rendez-vous / devis / refus), escalade juste ou non |
| Suivi | la relance de conversation / de devis due à J+2/5/10, le registre de 3 jours | la relance qu'il a envoyée, ou l'absence de relance | relance due **non faite** par l'artisan = le gain le plus visible ; relance préparée **déjà faite** = pas de doublon |
| Devis | la carte « devis prêt », ligne par ligne, avec la source de chaque prix | le devis qu'il a chiffré | écart de total (le total est écrit par le code des deux côtés) ; lignes **sans source** signalées, jamais comblées |
| Facturation | « facture à préparer quand le chantier est fini », relance d'impayé J+3/10/21 | sa facture, sa relance | factures oubliées, impayés non relancés |
| Après-chantier | la demande d'avis / le rappel d'entretien, avec le consentement | ce qu'il a fait | demandes d'avis que personne n'aurait faites |
| Opérations | créneaux **lus dans l'agenda**, rappel de la veille, gardien du stock | ses rendez-vous, ses commandes | un créneau proposé hors agenda = **0** (T7) |
| Direction | la page du matin | — | utile ou non, d'après lui |

Comment on lit la comparaison, sans lire les messages de ses clients : le journal « fait : … » de chaque chef (sans texte), les cartes (leurs champs structurés), `opportunites_decisions`
(`valider` / `modifier_valider` / `refuser` : **l'artisan note la carte**, `kpis-base.md` § 7), et le coût du jour (`couts_ia_jour`). Les messages de ses clients ne sortent pas de sa boîte ni de sa base.

**Le critère pour passer au cran suivant** (`reel`), département par département :

1. **Au moins 7 jours** de journal et au moins 20 événements traités dans le département (moins, on ne conclut pas : on prolonge) ;
2. **zéro** écart grave : un envoi parti, un créneau inventé, un prix sans source présenté comme sourcé, une donnée d'un autre compte, un « Presti » dans un texte destiné à un client ;
3. **au moins 80 %** des cartes jugées par l'artisan « valider » ou « modifier_valider », et il peut dire pourquoi les autres sont refusées ;
4. coût IA du département **dans le plafond** (`plafond_cout_centimes_jour`) ;
5. l'artisan **dit oui par écrit** au passage au cran suivant (Studio réel : un clic par carte ; Signature : type par type).

Les seuils 7 jours, 20 événements et 80 % sont des **propositions de départ**, non mesurées : Benj les change ; ce qui ne change pas, c'est qu'ils soient écrits **avant** de regarder les résultats.

## 4. Les gestes quotidiens pendant l'ombre (10 minutes par jour, au début)

1. Lire le journal du jour du compte (par département) ; compter les événements traités.
2. Lire les cartes **refusées** et **modifiées** : c'est là qu'on apprend (une carte validée telle quelle n'apprend rien).
3. Relever les alertes (`lib/alertes.ts`) : jeton expiré, disjoncteur, coût.
4. Écrire une ligne dans `wiki/hot.md` du vault et, à la fin, une note dans `Produit/` (le réseau neuronal retient ce qui s'est appris, pas seulement ce qui s'est fait).
5. Si quoi que ce soit surprend l'artisan : **couper d'abord** (`runbook.md` § 1.c), comprendre ensuite.

## 5. Les risques propres à l'ombre

| Risque | Parade |
|---|---|
| L'ombre part « en réel » sans que personne ne l'ait voulu | le palier ne monte à `ombre`/`reel` que par un acteur fondateur (trigger de `0193`) ; `lib-executer` relit le palier **juste avant l'effet** ; aucun nœud d'envoi n'est atteignable en simulation (R15) ; Studio : nœuds d'envoi désactivés dans la copie |
| On lit trop : la boîte entière de l'artisan | fenêtre de 7 jours, plafond de 40 messages par passage, expéditeurs automatiques et newsletters écartés (`releverCanal` refait dans `lib-boite-lire`) |
| La mention « Presti » apparaît dans une carte vue par le client de l'artisan | marque blanche contrôlée : `lib/email.ts:6-11`, juges R4 et E1 ; en ombre, rien ne sort de toute façon |
| Le coût IA dérape | `plafond_cout_centimes_jour` ; alerte ; le département s'arrête sans que l'artisan paie |
| Deux systèmes agissent à la fois (le cron codé **et** n8n) | les clés d'idempotence sont **les mêmes** (`avis:<chantier>`, registre de 3 jours) ; en ombre n8n n'écrit pas dans les tables que le cron écrit |
| L'artisan se sent surveillé | l'accord le dit ; il voit ce qu'on voit (« Ce que vos assistants ont fait ») ; il arrête d'un clic |
| On tire une conclusion d'un échantillon trop petit | les seuils sont écrits avant ; on prolonge plutôt que de conclure |

## 6. Comment l'arrêter

| Qui | Geste | Effet |
|---|---|---|
| **L'artisan** | « Retirer » sur l'écran « Connexions » | le jeton chiffré est effacé ; le département se tait ; plus rien n'est lu |
| **L'artisan** | repasser le département en `simulation` ou `arret` (« Mes départements ») | immédiat ; l'arrêt ne se bloque jamais (trigger de `0193`) |
| **Benj** | `departements_reglages` : ligne `tous` en `arret` pour son compte (`runbook.md` § 1.b) | tout le compte, tous les départements |
| **Benj** | dépublier les workflows `client-<slug>-*` dans n8n (parents d'abord) | la copie ne se déclenche plus |
| **Benj** | baisser `systemeAgents` / `connexions` (`lib/flags.ts`) | l'écran disparaît pour **tous** : dernier recours |

À la fin d'une ombre, que le volontaire continue ou non : **ses connexions sont retirées ou confirmées par écrit**, son journal est lu une dernière fois, sa fiche de KPIs est complétée (`kpis-base.md`
§ 10) et la note est écrite. Ce qui a été appris retourne dans le vault (CLAUDE.md, « Le cerveau d'abord »).

## 7. Ce qui n'existe pas encore, honnêtement

- Les lots **036-010** (maquettes) et **036-011** (l'interface en code, derrière `systemeAgents`) ne sont pas terminés : sans eux l'artisan **ne voit pas** « Ce que vos assistants ont fait » ni « Mes départements ». L'ombre peut se lire par la base et le journal, mais le critère n° 3 (l'artisan note les cartes) demande l'écran. **Recommandation : ne pas lancer l'ombre avant que 036-011 soit livré** — l'ombre sans écran n'est qu'un journal que seul Benj lit.
- `lib-disjoncteur` est en mode A (effet réel non branché) ; la reprise après panne se fait à la main (`runbook.md` § 3).
- Aucun essai à sec des migrations n'a été joué (pas de base sur l'hôte d'agents) ; la session principale le fait (`mise-en-service.md`, étape 3).
- Aucun compte volontaire n'est choisi. Le choisir est le geste de Benj.
