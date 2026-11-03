# R5 — Le SMS entre l'artisan et ses propres clients : fournisseurs, règles, adaptateur

Rapport du 02/11/2026, chantier 4 (prompt 3, assistant de gestion). **Lecture seule** : aucune écriture dans le dépôt ni dans le
vault, aucun build, aucune migration, **aucun compte créé, aucun formulaire rempli ni soumis**. Les pages publiques ont été lues
le 02/11/2026, par recherche web, WebFetch et, pour les pages rendues en JavaScript, le panneau navigateur : calculateur Brevo
manipulé (onglet SMS, quantité) sans achat ni envoi, centre d'aide Brevo, documentation Sweego. Le réseau neuronal a été lu
d'abord (`cerveau` : `chercher`, `lire`, `regles_pour`).

---

## 0. En bref

1. **Le moins cher vérifié à l'unité : Sweego, 0,040 € HT le SMS (un segment) vers la France.** Packs de 20 € (environ 500 SMS)
   à 1 000 €, crédits valables 12 mois, sans abonnement. L'éditeur est français et ses centres de données sont en France. Un
   même compte peut avoir plusieurs Sender ID, créés par API, et un webhook « Stop SMS » existe. Suivent **Brevo** et
   **Allmysms à 0,045 €**, puis Spot-Hit à 0,059 € et OVHcloud à 0,06 € HT (pack de 100). Tableau au §3.
2. **Défaut proposé** : Sweego, derrière un adaptateur `envoyerSms` qui ne dépend d'aucun fournisseur (§7). Brevo vient en
   second : il est déjà retenu pour l'e-mail (ADR-004) et son ticket d'entrée est de 5 €. Mais **jamais sur le compte qui
   sert à la prospection froide** (§4).
3. **D'abord l'étape 0, gratuite** : un lien `sms:` (RFC 5724) que l'artisan envoie lui-même depuis son téléphone. **Ensuite
   l'étape 1, par API**, seulement après le « go » écrit de Benj sur le coût unitaire. Le code doit refuser le mode réel tant
   que ce coût n'est pas approuvé (§8).
4. **Trois règles récentes à intégrer** :
   - la Charte Business Messaging de l'af2m, applicable au 1er mars 2026 : messages promotionnels de 8 h à 21 h 30,
     expéditeur de 11 caractères alphanumériques au plus, désinscription par STOP ou par URL ;
   - la validation renforcée des Sender ID en France, au 1er mars 2026 ;
   - l'interdiction de toute sollicitation commerciale par message pour la rénovation énergétique (loi n° 2025-594).
5. **Trois points durs** :
   - chaque nom d'artisan doit être enregistré et validé comme Sender ID chez le fournisseur ;
   - un expéditeur alphanumérique ne peut pas recevoir de réponse ;
   - chez les fournisseurs, la mention STOP fait passer le SMS en « marketing », soumis aux plages horaires.

---

## 1. Ce qui est décidé (et où)

| Décision | Source |
|---|---|
| « SMS : oui » | `plans/011-cadrage-01-11/prompts-benj/p3-assistant.md:492` |
| Un SMS commercial exige le consentement du client ; un SMS lié au chantier (rappel, devis prêt, paiement) relève de la relation en cours ; chaque SMS a un coût à l'unité | `p3-assistant.md:505` |
| Les trois usages : rappel de rendez-vous, devis prêt, rappel de paiement. Fournisseur au moins cher, coût par SMS montré à Benj avant le premier envoi réel. L'expéditeur est l'artisan. Le client a donné son numéro pour ce chantier. Le SMS contient STOP. Rien de commercial sans consentement. Livré derrière un drapeau | `p3-assistant.md:574` |
| Question ouverte « fournisseur de SMS », défaut : le moins cher en France, coût montré avant le premier envoi | `p3-assistant.md:621` |
| **ADR-007** (statut `proposee`, daté du 02/11) : aucun SMS de prospection ; envois par n8n ; « Studio prépare et Signature envoie seul » ; consentement pour le commercial, STOP sur chaque message, journal de chaque envoi, plafond par artisan et par jour « à fixer » | vault `10 Presti/04 Décisions/ADR-007 — SMS - jamais pour prospecter, oui entre l'artisan et ses propres clients.md` |
| Étape 0 gratuite (`sms:`), étape 1 par API avec un coût passé en crédits, aucun envoi réel avant que Benj ait vu le coût unitaire | `plans/011-cadrage-01-11/cadrage-p3.md:149` |
| SMS au niveau 3 (envoi seul) : « non en v1 » | `cadrage-p3.md:219` |
| n8n tire (il appelle une route de Presti avec une clé de service dédiée) ; Presti n'appelle jamais n8n | `cadrage-p3.md:153` |
| Prix d'un SMS « non vérifié » le 01/11 (recherche web à sec) : ce rapport comble ce trou | `cadrage-p3.md:80`, `:422` |
| n8n porte toutes les automatisations ; aucune n'est écrite en dur dans le backend | `.claude/rules/architecture-outils.md:16` |
| Toute dépense attend l'accord de Benj | `.claude/rules/securite.md:19` |
| Aucune donnée de client envoyée à un modèle gratuit en ligne | `.claude/rules/securite.md:12` |
| Supabase est la source de vérité et la file ; idempotence par la clé (artisan, type, objet, jour) ; à blanc, tout se prépare et rien ne sort | `p3-assistant.md:564`, `:597`, `:608` |

**Tension à trancher.** L'ADR-007 dit « Signature envoie seul », le cadrage dit « niveau 3 : non en v1 ». **Défaut** : en v1,
tout SMS part sur un geste de l'artisan (niveau 2, toutes offres). Le niveau 3 s'ouvre sous Signature une fois les premiers
envois réels vérifiés.

---

## 2. L'existant dans le code : aucun SMS, mais des briques à reprendre

**Aucun envoi de SMS** (recherche du 02/11 dans `lib/`, `app/`, `package.json` : aucun fournisseur, aucune route, aucun
drapeau, aucune dépendance). Le mot n'apparaît que :
- comme canal de partage d'un lien : `lib/canaux/reseaux.ts:12`, `:19` ;
- comme libellé de source marquée (utm) : `lib/audience.ts:192-193` ;
- dans un texte à copier : `app/chiffres/page.tsx:128` ;
- dans un garde-fou de promesse : `lib/agents/acquisition/plaintes.ts:43` ;
- dans la notice de prospection : `lib/confidentialite/prospection.ts:9`.

C'est le constat de `cadrage-p3.md:80`.

**Données déjà là**
- Téléphone du client : `public.clients.tel text` (`supabase/migrations/0002_devis.sql:27`), sous RLS `client_all_own`
  (`0002_devis.sql:30-33`). **Aucune colonne ne dit d'où vient le numéro**, alors que Benj exige qu'il ait été « donné pour ce
  chantier ».
- Rendez-vous de l'artisan : `public.crm_rappels`, type `'rendez_vous'` (`supabase/migrations/0162_crm_rappels.sql:22`, `:29`).
- Opposition d'un client, déjà gérée pour l'après-chantier : outil `noter_opposition_client`
  (`lib/assistant/outils-actions.ts:450-452`, `lib/assistant/actions-tout.ts:547-559`). La liste STOP des SMS doit s'y joindre.

**Briques à reprendre telles quelles**

| Besoin | Brique existante |
|---|---|
| White-label : le nom de l'artisan, jamais « Presti » | `lib/email.ts:1-12`, `fromHeader` `lib/email.ts:31-35` |
| Ne rien envoyer aux destinataires de test | `.invalid` simulé : `lib/email.ts:66-69` (pour le SMS : une doublure injectée, §7) |
| Pause générale, fermée « dans le doute » | `sortiePermise()` (`lib/agents/sortie.ts:12-20`), appliquée sauf aux envois critiques et transactionnels (`lib/email.ts:73-76`) |
| Plafond qui refuse en cas de panne (dépense) | `consommerLimiteStricte` (`lib/limites.ts:19-24`, `:38-47`) ; parts séparées du plafond (`lib/email.ts:88-101`) |
| Ne jamais journaliser l'adresse entière | `lib/email.ts:96-99` ; empreinte d'un identifiant : `cleEmail` (`lib/limites.ts:49-52`) |
| Un envoi réclamé une seule fois, rendu s'il échoue | `lib/envoisServeur.ts:84-89`, `:100-101`, `:123-126` ; `libererLimite` (`lib/limites.ts:60-70`) |
| Issue d'un envoi par canal ; `fetch` injecté | `IssueEnvoi` (`lib/canaux/serveur.ts:229-232`) ; `FetchLike` (`lib/canaux/serveur.ts:90`, `:245`) |
| Magasin injecté (tests hors ligne) | `MagasinCanaux` (`lib/canaux/rangement.ts:1-4`, `:24-40`) |
| Adresses white-label de l'artisan | `lib/urls.ts:4-12`, `:16-17`. En mode `presti`, l'URL affiche `prestiapp.fr` (`lib/urls.ts:51`) |
| Drapeau = décision de code, pas variable d'environnement | `lib/flags.ts:10-11` ; canaux encore baissés : `lib/flags.ts:69-72` |
| Un coût en crédits a un précédent | `COUT_RECHERCHE` (`lib/plans.ts:118-124`) ; verrou d'offre `peut()` (`lib/plans.ts:130-136`) |
| Registre des traitements | sous-traitants listés par traitement (`docs/registre-traitements.md:146`) ; transferts hors UE au §24 (`:338`) |

---

## 3. Tableau comparatif sourcé (pages consultées le 02/11/2026)

Prix d'**un segment** : 160 caractères GSM-7 ou 70 caractères Unicode (§6.8) vers un mobile de France métropolitaine.

| Fournisseur | Prix FR / SMS | Plus petit achat | Sans abonnement ? | Validité des crédits | Expéditeur alphanumérique | STOP | Essai gratuit |
|---|---|---|---|---|---|---|---|
| **Sweego** (français, centres de données en France) | **0,040 €**, même prix de 20 € à 1 000 € ; « exclusive of tax » sur la page comparatif, HT non écrit sur la page tarifs | pack de 20 € (≈ 500 SMS) | oui : crédits prépayés, « indépendants du plan » e-mail | 12 mois | 3 à 11 lettres ou chiffres, au moins une lettre. Vérifié par Sweego en « une heure à quelques jours », jours ouvrés. **Plusieurs Sender ID par compte**, créés par API (`POST /clients/:uuid_client/sms/senders`). Sans Sender ID : numéros courts 38082 (transactionnel) et 36047 (marketing) | « STOP XXXX » ajouté **automatiquement aux SMS marketing vers la France**, pas aux transactionnels ; webhook « Stop SMS » | aucun crédit offert relevé ; le mode test `bat` est décompté |
| **Brevo** | **0,045 €** : 4,5 crédits par SMS, 0,01 € le crédit (100 SMS = 450 crédits = 4,50 € ; 10 000 SMS = 450,00 €, même ratio) ; HT ou TTC non écrit | crédits par lots de 100 ; une commande de 450 crédits est arrondie à 500 (5,00 €) | à la carte, mais les CGU exigent d'être « titulaire d'une Souscription » | **12 mois** (CGU du 1er octobre 2025) ; le ratio est « à titre informatif » et peut changer, même rétroactivement | **Enregistrement obligatoire par pays, pour le marketing comme pour le transactionnel** ; 3 à 11 caractères ; lettres et chiffres seulement (comptes non Entreprise) ; ID génériques (INFO, SMS, VERIFY…) interdits | « STOP au [STOP_CODE] » obligatoire en marketing pour la France ; **un code STOP fait passer le SMS en marketing** | aucun relevé |
| **Allmysms** | **0,045 € HT**, tarif unique affiché | non précisé | packs ; facturation en fin de mois avec un minimum de 250 € HT/mois | option « Pack SMS sans date limite » | « Personnalisation de l'expéditeur » | « Gestion des stops » (numéro court non précisé) | non chiffré |
| **Spot-Hit** | 0,059 € HT (100 à 10 000) ; 0,054 € (10 000 à 100 000) ; 0,049 € (au-delà) | 100 SMS (≈ 5,90 € HT, calcul) | packs | non précisé | non précisé | non précisé | **100 crédits offerts** à l'inscription |
| **OVHcloud** | 0,06 € HT (100) ; 0,058 € (1 000) ; 0,054 € (10 000) ; 0,049 € (500 000). « 1 crédit = 1 SMS envoyé en France métropolitaine (160 caractères maximum) » | pack de 100 (≈ 6 € HT, calcul) | « sans engagement » | non précisé | validé en « 72 heures » en moyenne sur justificatif (papier à en-tête signé, pièce d'identité ou Kbis) ; pas de réponse possible. Variante : numéro court avec réponse, sans URL | STOP obligatoire pour le commercial (11 caractères décomptés). **Commerciaux envoyés de 8 h à 20 h, du lundi au samedi.** `noStopClause` pour le non-commercial | **20 crédits offerts** aux nouveaux clients |
| **SMSFactor** | 0,066 € HT (1 000) ; 0,062 € (2 500) ; 0,06 € (5 000) ; 0,056 € (10 000) ; … 0,04 € (500 000) | 1 000 SMS (66 € HT) | « facture à la consommation sans engagement » ; prélèvement dès 3 000 SMS/mois | 1 an | non traité sur la page tarifs | non traité | « Essai immédiat », sans quantité (10 SMS selon une fiche HubSpot tierce) |
| **SMSBox** | 0,074 € HT (250) ; 0,070 € (500) ; 0,067 € (1 000) ; … 0,052 € (100 000) | 250 SMS (18,50 € HT) | « without any commitment to purchase or subscribe » | 12 mois | mode Expert : expéditeurs « déclarés et validés » d'avance | exemple « STOP at 36111 » en marketing ; STOP par réponse en mode Standard | essai sans volume précisé |
| **Octopush** | packs 0,075 € (1 000) … 0,045 € (1 000 000) ; abonnements dès 9 €/mois à 0,045-0,048 € | 1 000 (75 €) | packs ou abonnement | « never expire » | non traité | non traité | non chiffré. **Page incohérente** : cartes étiquetées « RCS », totaux faux |
| **Twilio** (États-Unis) | **0,0798 $** par segment (grille « as of October 2026 »), plus 0,001 $ par message en échec ; non converti | prépayé | oui | — | alphanumérique gratuit ; « You must use Alphanumeric Sender IDs to send A2P messages ». Pré-enregistrement « Not Required » sur la page de règles, mais un article d'aide sur l'enregistrement en France existe (illisible, 403) | marketing : STOP et HELP ; un lien web est admis ; **un numéro mobile est interdit comme moyen d'opposition** | non vérifié |
| **Plivo** (États-Unis) | 0,0664 $ à 0,0785 $ selon l'opérateur (Bouygues 0,0724 ; Orange 0,0747 ; Free, Lebara, Syma 0,0785) | — | — | — | non traité | — | « trial credits », sans montant |
| Vonage / Sinch / AWS SNS | 0,07368 € / 0,063 € / 0,0623 € : **relevés par Sweego** (concurrent, page non datée), non vérifiés chez l'éditeur. Vonage : 0,0593 € HT dans la grille Deutsche Telekom du 10/01/2025 (vue en résumé de recherche, PDF non ouvert) | — | — | — | — | — | — |

**Nœuds n8n natifs pour le SMS** (outil MCP n8n `search_nodes`, 02/11, catalogue `n8n-nodes-base`) :
- Twilio, Vonage, Plivo et seven en ont un.
- Le nœud **Brevo n'a pas d'opération SMS** (ressources : contact, attribute, email, sender).
- OVHcloud, Sweego, SMSFactor : pas de nœud, il faut un nœud HTTP Request.

Cela pèse peu ici : dans le schéma retenu, n8n ne fait qu'appeler une route de Presti (§7.4).

---

## 4. Le choix par défaut et pourquoi

**Défaut : Sweego**, parce que c'est le moins cher vérifié à l'unité (0,040 €), et pour cinq autres raisons :
- éditeur français, centres de données en France : l'entrée au registre est simple ;
- plusieurs Sender ID par compte, créés par API : c'est exactement le besoin d'une plateforme white-label à plusieurs artisans ;
- webhooks `sms_sent`, `sms_undelivered` et « Stop SMS » ; leur contenu porte `campaign_id`, `sms_price`, `nb_segments` et
  `test_mode` ;
- un point d'API d'estimation (`POST /sms/estimate`) et un autre de prix par pays (`GET /billing/sms/prices/:country_code`) ;
- pas d'abonnement, crédits valables 12 mois.

**Réserves sur Sweego, à lever avant l'étape 1** :
1. le HT n'est écrit que sur la page comparatif ;
2. le ticket d'entrée est de 20 €, contre 5 € chez Brevo ;
3. on ne sait pas comment Sweego applique la validation des Sender ID du 1er mars 2026 (justificatifs par artisan ?) ;
4. aucune clé d'idempotence n'est documentée : Presti la porte lui-même (§7) ;
5. `shorten-urls` vaut `true` par défaut : à forcer à `false` ;
6. on ne sait pas si la liste STOP vaut par expéditeur ou pour tout le compte.

**Second : Brevo** (0,045 € ; 5 € pour commencer). Deux conditions :
- (a) un **compte distinct** de celui de la prospection froide (ADR-005, ADR-004). Une suspension pour plaintes de
  prospection ne doit jamais couper les rappels des clients des artisans. C'est la même logique que les parts séparées du
  plafond e-mail (`lib/email.ts:61-64`, `:88-94`) ;
- (b) vérifier qu'un même compte peut enregistrer **plusieurs** Sender ID pour la France. L'aide dit « Vous ne pouvez choisir
  qu'un seul ID d'expéditeur par pays » dans une campagne, et ne dit rien de l'API.

**Troisième : OVHcloud** (0,06 € HT au pack de 100), seulement s'il faut un **numéro court qui reçoit les réponses** (pas
d'URL dans ce cas). Ses 20 crédits offerts permettraient un premier essai sans dépense ; créer le compte et envoyer restent
des gestes de Benj.

**Écartés** :
- **Envoi depuis le 06 de l'artisan par une passerelle Android** : les numéros 06/07 sont réservés aux communications
  interpersonnelles, et l'Arcep interdit leur usage par des systèmes automatisés, « sauf cas particuliers » (décision
  n° 2022-1583). Le lien `sms:` envoyé à la main par l'artisan reste interpersonnel : c'est l'étape 0.
- Fournisseurs américains (Twilio, Plivo, Vonage) : leurs prix sont en dollars (0,0664 à 0,0798 $). Ils ne passent sous
  0,040 € que si 1 $ vaut moins de 0,60 € (calcul : 0,040 / 0,0664). Et le transfert hors UE est à inscrire (§24 du registre).
- Prix « low cost » sans expéditeur personnalisé : l'expéditeur doit être l'artisan.

---

## 5. Les règles françaises qui s'appliquent

**5.1 Consentement et opposition (CNIL, page datée du 10 juin 2026).** La prospection d'un particulier par SMS exige son
consentement « libre, spécifique, éclairé et univoque ». Accepter des CGU ne suffit pas. Une exception vaut pour les clients :
des « produits ou services similaires fournis par la même entreprise », et jamais sans vente ou prestation déjà faite. Chaque
sollicitation doit dire qui l'émet et offrir un moyen simple de refuser. La page ne traite pas des messages liés à un contrat :
leur classement en relation en cours vient de la règle de Benj (`p3-assistant.md:505`) et de la charte af2m (5.2).

**5.2 Horaires** (ce n'est pas l'Arcep qui les fixe, c'est l'autorégulation de la filière, l'af2m). Charte Business Messaging,
publiée le 13/02/2026 et applicable au 1er mars 2026 :
- messages promotionnels de 8 h à 21 h 30, recommandés du lundi au samedi ;
- dimanches et jours fériés « tolérés mais non recommandés » ;
- les messages fonctionnels (livraison, authentification, relation client initiée par l'utilisateur) « ne sont pas concernés ».

Les fournisseurs vont plus loin :
- OVHcloud : commercial de 8 h à 20 h, du lundi au samedi ;
- Brevo, documentation de l'API : marketing jamais traité de 22 h à 8 h, le dimanche ni les jours fériés français. Son aide dit
  pourtant « 8 h - 21 h 30, tous les jours ». Les deux pages divergent ;
- Twilio : 8 h - 21 h 30 du lundi au samedi ; hors de cette plage, dimanches et jours fériés, filtrage sévère.

**Règle proposée pour Presti** : la plus stricte. Envoi du lundi au samedi, de 8 h à 20 h (heure de Paris), jamais un jour
férié. C'est obligatoire dès que le SMS porte un code STOP de fournisseur, et c'est aussi la courtoisie appliquée aux autres.

**5.3 STOP.** La charte af2m admet trois dispositifs : le mot-clé STOP, une URL de désinscription ou un bouton RCS. « Aucune
désinscription ne peut être payante, complexe ou conditionnée », et toute opposition se traite « dans les plus brefs délais ».

Chez les fournisseurs :

| Fournisseur | Ce qu'il fait |
|---|---|
| Sweego | ajoute « STOP XXXX » aux SMS marketing vers la France |
| Brevo | substitue `[STOP_CODE]`, ce qui fait passer le message en marketing |
| OVHcloud | réserve 11 caractères à la mention |
| SMSBox | exemple « STOP at 36111 » |
| smsmode | « STOP » suivi d'un numéro court (ex. 36034), 10 caractères, inséré même avec un expéditeur personnalisé |

Twilio : un numéro mobile est strictement interdit comme moyen d'opposition ; un lien web est admis.

**5.4 Numéros (Arcep, décision n° 2022-1583, communiqué du 5 septembre 2022).**
- Les 06 et 07 sont réservés « exclusivement aux services de communications interpersonnelles ».
- Sauf cas particuliers, les systèmes automatisés ne peuvent pas utiliser de numéros mobiles.
- Les numéros 09 37 à 09 39 servent aux échanges avec une « plateforme technique », par exemple des conversations par
  messages entre une enseigne et son client.

Conséquence : aucun SMS automatique ne part du 06 de l'artisan.

**5.5 Expéditeur (Sender ID), au 1er mars 2026**
- **Charte af2m** : 11 caractères au plus, strictement alphanumériques, identification claire de la marque. Champs trompeurs
  ou ressemblant à un numéro interdits ; caractères spéciaux interdits par défaut. Deux listes : SI (strictement interdits) et
  ISA (interdits sauf autorisation, validés au préalable par l'af2m).
- **Link Mobility** (27/02/2026) : validation plus stricte au 1er mars 2026. Les ID génériques (« alert », « appointment »,
  « shop ») sont interdits, sauf marque enregistrée avec justificatifs. Seuls les caractères latins A–Z, a–z, 0–9 sont admis.
  Un ID non conforme peut être « rejected or automatically replaced ».
- **Brevo** : l'enregistrement est obligatoire par pays. Twilio : les réseaux NRJ Mobile et Truphone remplacent l'expéditeur
  par un numéro court.

**5.6 Rénovation énergétique** (loi n° 2025-594 du 30 juin 2025 ; résumé de l'ANIL). La sollicitation commerciale y est
interdite :
- par message sur un service de communications interpersonnelles, par courriel et sur les réseaux sociaux (extension
  « sans délai » de l'interdiction téléphonique) ;
- pour les équipements et travaux d'économie d'énergie ou de production d'énergies renouvelables ;
- avec pour seule exception citée l'exécution d'un contrat en cours (le consentement n'en est pas une, d'après la page) ;
- sous peine d'une amende administrative de 75 000 € (personne physique) ou 375 000 € (personne morale).

L'extension à l'adaptation des logements, au 11 août 2026, est écrite pour le téléphone. Pour les messages, la page n'est pas
claire. **Presti v1 n'envoie aucun SMS commercial.** Toute version future qui en enverrait doit les bloquer pour ces métiers.

**5.7 Signalement.** Le 33700 de l'af2m reçoit les signalements de SMS indésirables. C'est une raison de plus pour s'en tenir
strictement aux trois usages liés au chantier.

**5.8 RGPD.** Presti agit en sous-traitant de l'artisan, comme pour le CRM (`docs/registre-traitements.md:202`). Le fournisseur
de SMS est un sous-traitant ultérieur. Il faut une nouvelle section au registre (numéro, texte, hébergeur, région) et la mise à
jour de l'annexe des CGU. Sweego annonce un DPA et une liste de sous-traitants ; Brevo a son DPA en annexe 3 de ses CGU.

---

## 6. Ce que cela impose à Presti

1. **L'expéditeur est le nom de l'artisan.** On le normalise : sans accents, espaces ni ponctuation, 11 caractères au plus, au
   moins une lettre, pas un mot générique, jamais « Presti ». L'artisan le confirme, puis on l'enregistre chez le fournisseur,
   avec un statut suivi. Tant qu'il n'est pas validé, pas d'envoi par API (l'étape 0 reste possible). **Jamais le numéro court
   par défaut du fournisseur** : Sweego permet d'envoyer avant validation depuis 38082 ou 36047, mais l'expéditeur ne serait
   plus l'artisan.
2. **Pas de réponse possible** à un expéditeur alphanumérique (OVHcloud, Sweego). Le texte dit donc comment joindre l'artisan
   (son téléphone), sans lien vers Presti.
3. **STOP sur chaque SMS : deux voies.**
   - (a) **Défaut** : le code STOP du fournisseur. Le SMS est envoyé en type « marketing » chez lui, donc sous la plage stricte
     du §5.2. Un rendez-vous du lundi se rappelle le samedi.
   - (b) Dès qu'un domaine neutre ou personnel existe (`NEXT_PUBLIC_DOMAINE_NEUTRE`, `lib/urls.ts:10-12`, `:17`) : un lien
     `/stop/<jeton>` sur l'adresse white-label de l'artisan, le SMS restant transactionnel. **Jamais en mode `presti`**, qui
     afficherait `prestiapp.fr` (`lib/urls.ts:16`, `:51`). `stop` rejoindrait alors `SLUGS_RESERVES` (`lib/urls.ts:21-29`).
4. **Une seule liste d'opposition par couple (artisan, numéro)**, jointe à `noter_opposition_client`. Les STOP reçus par webhook
   y entrent. La liste de blocage d'un fournisseur peut valoir pour tout le compte : selon un résumé de l'aide Brevo (source
   secondaire), ceux qui répondent STOP entrent dans sa liste de blocage. Un STOP adressé à l'artisan A bloquerait alors B pour
   ce numéro. C'est un excès de prudence légal, à expliquer à l'artisan.
5. **D'où vient le numéro** : `clients.tel` n'a pas de source. Migration additive proposée : `tel_source`, `tel_source_le`.
   En v1, on n'écrit qu'aux numéros marqués « donné pour ce chantier ».
6. **En v1, mobiles de métropole seulement** (+33 6, +33 7). Le crédit OVHcloud porte sur la métropole ; les DOM viendront
   plus tard.
7. **Compte séparé de la prospection froide** (§4).
8. **Encodage** :
   - GSM-7 : 160 caractères pour un segment, 153 par segment au-delà. Unicode : 70, puis 67 (Twilio).
   - Sont dans le jeu GSM-7 de base : é è à ä ö ù ü É, et Ç en position 0x09. Le « ç » minuscule est ambigu : la même page
     note que les implémentations modernes mettent ç en 0x09. On l'évite dans les gabarits.
   - **N'y sont pas** : ê ë â î ï ô û È À œ Œ ’ « ». Un seul de ces caractères fait passer le message en Unicode, et le
     coût double ou triple.
   - € compte double (table d'extension) (GSM 03.38).
   - Conséquence : la typographie se ramène à l'ASCII (’ → ', « » → ", – → -) sans toucher aux lettres ; les gabarits
     s'écrivent sans ces lettres ; un texte libre montre ses segments et son coût avant l'envoi.
9. **Pas de raccourcisseur de liens** : les opérateurs les filtrent (doc Sweego). Pas de lien du tout en v1, sauf le lien
   STOP de la voie (b).
10. **Deux segments au plus en v1.** Un gabarit tient en un.

**Gabarits proposés** (GSM-7 pur, sans montant ni menace, `cadrage-p3.md:215`) :
- `rappel_rdv` : `{Nom} : rappel de votre rendez-vous {jour} à {heure}. Un souci ? Appelez le {tel_artisan}.`
- `devis_pret` : `{Nom} : votre devis {numero} est disponible. Il vous a été envoyé par e-mail.`
- `rappel_paiement` : `{Nom} : la facture {numero} est arrivée à échéance le {date}. Merci de votre règlement.`

Exemple de compte, calculé : `rappel_rdv` avec un nom de 25 caractères, ≈ 115 caractères, plus 15 réservés à la mention STOP,
soit ≈ 130. Un segment.

---

## 7. L'adaptateur `envoyerSms`, indépendant du fournisseur

### 7.1 Fichiers proposés (rien n'est créé avant l'« approuvé » de la phase)

| Fichier | Rôle |
|---|---|
| `lib/sms/contrat.ts` | les types ci-dessous |
| `lib/sms/encodage.ts` | `compterSegments`, `normaliserTypographie` (pur) |
| `lib/sms/expediteur.ts` | `expediteurDepuisNom` (pur) |
| `lib/sms/numero.ts` | `normaliserNumero` (pur) |
| `lib/sms/plage.ts` | `dansPlage`, avec les jours fériés calculés, Pâques compris (pur) |
| `lib/sms/tarifs.ts` | tarifs sourcés et datés ; `SMS_COUT_APPROUVE` (argent : session principale) |
| `lib/sms/envoyer.ts` | les portes, l'idempotence, le journal ; tout est injecté |
| `lib/sms/serveur.ts` | le magasin Supabase |
| `lib/sms/fournisseurs/sweego.ts`, `brevo.ts`, `factice.ts` | une implémentation par fournisseur, plus la doublure de test |
| `lib/flags.ts` | `smsClients: false` (migration collée PUIS drapeau levé) |

### 7.2 Le contrat

```ts
// lib/sms/contrat.ts — le contrat d'un SMS de l'artisan à SON client, indépendant du fournisseur.
/** v1 : liste FERMÉE. Aucun type commercial (consentement non recueilli ; rénovation énergétique : interdit, loi 2025-594). */
export type TypeSms = 'rappel_rdv' | 'devis_pret' | 'rappel_paiement'
export const TYPES_SMS_V1: readonly TypeSms[] = ['rappel_rdv', 'devis_pret', 'rappel_paiement']

export type ModeSms = 'blanc' | 'reel'        // défaut 'blanc' ; 'reel' exige le drapeau ET le coût approuvé par Benj
export type IdFournisseur = 'sweego' | 'brevo' | 'ovh' | 'factice'
export type Declencheur = 'artisan' | 'pilote' | 'n8n'
export type Encodage = 'GSM-7' | 'UCS-2'
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>   // même forme que lib/canaux/serveur.ts:90

export type DemandeSms = {
  artisanId: string
  type: TypeSms
  /** L'objet métier qui justifie le SMS (relation en cours). Sans lui, rien ne part. */
  objet: { table: 'crm_rappels' | 'devis' | 'factures'; id: string }
  destinataire: string        // tel que saisi ; normalisé en E.164 par normaliserNumero
  corps: string               // SANS mention STOP : l'adaptateur la pose selon le fournisseur
  declencheur: Declencheur
  carteId?: string            // la carte assistant_actions validée (niveau 2)
  cle?: string                // défaut : sms:<artisan>:<type>:<objet.id>:<AAAA-MM-JJ, heure de Paris> (p3-assistant.md:597)
}

export type Tarif = { fournisseur: IdFournisseur; prixSegmentHT: number; source: string; releveLe: string }

export type Estimation = {
  fournisseur: IdFournisseur
  texteFinal: string          // corps normalisé + mention STOP ; JAMAIS « presti » (test)
  encodage: Encodage
  unites: number              // septets GSM-7 (€ compte 2) ou unités UTF-16
  segments: number            // ≤160 / ≤70 → 1 ; sinon ceil(unités / 153) ou ceil(unités / 67)
  prixSegmentHT: number
  coutHT: number              // segments × prixSegmentHT : calculé par le code, jamais par le modèle
  tarifSource: string; tarifReleveLe: string
}

export type MotifRefus =
  | 'drapeau' | 'interrupteur' | 'pause' | 'type_interdit' | 'offre' | 'niveau'
  | 'numero_invalide' | 'opposition' | 'source_numero' | 'expediteur_non_valide'
  | 'texte_invalide' | 'trop_long' | 'plage_horaire'
  | 'cout_non_approuve' | 'cout_depasse' | 'plafond_artisan' | 'plafond_global' | 'disjoncteur'

export type EtatEnvoi = 'reserve' | 'simule' | 'envoye' | 'livre' | 'non_livre' | 'echoue' | 'incertain' | 'refuse'

export type IssueSms =
  | { etat: 'simule'; envoiId: string; estimation: Estimation }                      // à blanc : tout est prêt, rien ne sort, 0 €
  | { etat: 'envoye'; envoiId: string; estimation: Estimation; idFournisseur: string }
  | { etat: 'doublon'; envoiId: string; etatPrecedent: EtatEnvoi }                  // même clé : rien ne repart
  | { etat: 'refuse'; motif: MotifRefus; detail: string; prochainCreneau?: string } // rien ne sort, rien ne se paie
  | { etat: 'echoue'; envoiId: string; definitif: boolean; detail: string }         // refusé AVANT acceptation par le fournisseur
  | { etat: 'incertain'; envoiId: string; detail: string }                           // délai dépassé APRÈS l'appel : jamais renvoyé seul

export type MessagePret = { expediteur: string; destinataireE164: string; texte: string; reference: string /* = envoiId */; encodage: Encodage }

export type ReponseFournisseur =
  | { ok: true; idFournisseur: string }
  | { ok: false; accepte: false; definitif: boolean; erreur: string }   // 4xx, 429, 503 rendus avant acceptation
  | { ok: false; accepte: 'inconnu'; erreur: string }                   // délai, coupure : le SMS est peut-être parti

export type EvenementSms = { reference: string | null; idFournisseur: string | null; genre: 'livre' | 'non_livre' | 'stop'; numeroE164?: string; le: string }

/** Un fournisseur = une implémentation. Le reste de Presti ne connaît que cette interface. */
export interface FournisseurSms {
  id: IdFournisseur
  /** Qui porte la mention STOP, combien de caractères lui réserver, et sous quel type le fournisseur classe alors le message. */
  stop: { porteur: 'fournisseur'; reserve: number; classe: 'marketing' } | { porteur: 'lien_presti'; reserve: number; classe: 'transactionnel' }
  envoyer(m: MessagePret, f: FetchLike, delaiMs: number): Promise<ReponseFournisseur>
  /** Lit un webhook DÉJÀ authentifié par la route (signature vérifiée avant) : livré, non livré, STOP. */
  lireEvenement?(corps: unknown): EvenementSms | null
}

/** Supabase en production (lib/sms/serveur.ts), mémoire dans scripts/sms-qa.mjs (comme MagasinCanaux, lib/canaux/rangement.ts:24-40). */
export interface MagasinSms {
  /** Pose la ligne sous la clé unique. Atomique (index unique + on conflict). Une ligne 'refuse' se reprend : elle ne bloque pas un nouvel essai. */
  reserver(cle: string, ligne: LigneEnvoi): Promise<{ nouveau: true; id: string } | { nouveau: false; id: string; etat: EtatEnvoi }>
  terminer(id: string, champs: Partial<LigneEnvoi> & { etat: EtatEnvoi }): Promise<void>
  enOpposition(artisanId: string, empreinteNumero: string): Promise<boolean>
  sourceNumero(artisanId: string, objet: DemandeSms['objet'], e164: string): Promise<'donne_pour_ce_chantier' | 'inconnue'>
  expediteur(artisanId: string, f: IdFournisseur): Promise<{ libelle: string; statut: 'a_demander' | 'en_attente' | 'valide' | 'refuse' } | null>
  consommer(cle: string, max: number, fenetreS: number): Promise<boolean>   // = consommerLimiteStricte, fail-closed (lib/limites.ts:38-47)
  echecsRecents(f: IdFournisseur): Promise<number>                         // pour le disjoncteur
}

export type LigneEnvoi = {
  artisan_id: string; type: TypeSms; objet_table: string; objet_id: string
  empreinte_numero: string; numero_masque: string        // jamais le numéro en clair dans le journal (lib/email.ts:96-99)
  expediteur: string | null; fournisseur: IdFournisseur; mode: ModeSms; declencheur: Declencheur; carte_id: string | null
  estimation: Estimation | null; motif?: MotifRefus | null; id_fournisseur?: string | null
}

export type DepsSms = {
  mode: ModeSms
  fournisseur: FournisseurSms
  tarif: Tarif                                             // lib/sms/tarifs.ts : chaque chiffre porte sa source et sa date
  magasin: MagasinSms
  f?: FetchLike                                            // en test, une doublure qui LÈVE prouve qu'à blanc rien ne sort
  maintenant?: () => Date
  coutApprouve: { fournisseur: IdFournisseur; prixSegmentHT: number; approuveLe: string } | null  // null tant que Benj n'a pas écrit « go »
  plafonds: { parArtisanJour: number; globalJour: number; segmentsMax: 2 }
  delaiMs?: number                                         // défaut proposé : 10 000
}

export declare function envoyerSms(d: DemandeSms, deps: DepsSms): Promise<IssueSms>
// Pures, sans base ni réseau, testées hors ligne :
export declare function estimerSms(corps: string, f: FournisseurSms, t: Tarif): Estimation
export declare function compterSegments(texte: string): { encodage: Encodage; unites: number; segments: number }
export declare function normaliserTypographie(texte: string): string   // ’ → '  « » → "  – — → -  … → ... (ne touche à aucune lettre)
export declare function expediteurDepuisNom(nom: string): { ok: true; libelle: string } | { ok: false; raison: string }
export declare function normaliserNumero(brut: string): { ok: true; e164: string } | { ok: false; raison: string }   // v1 : +336 / +337
export declare function dansPlage(d: Date): { ok: true } | { ok: false; prochainCreneau: string }   // lun-sam 8 h-20 h Paris, hors fériés
```

### 7.3 L'ordre des portes dans `envoyerSms`

Chaque refus : rien ne sort, rien ne se paie, une ligne `refuse` au journal.

1. **Drapeau** `FLAGS.smsClients`, puis **interrupteur SMS** (arrêt immédiat, réglage en base) → `drapeau` / `interrupteur`.
2. **Type** dans `TYPES_SMS_V1` → sinon `type_interdit`. Un SMS commercial est impossible par construction.
3. **Pause générale** (`sortiePermise()`, `lib/agents/sortie.ts:12-20`) pour les déclencheurs `pilote` et `n8n` → `pause`.
   Un clic de l'artisan passe, comme l'e-mail transactionnel (`lib/email.ts:73-76`), mais jamais l'interrupteur SMS.
4. **Offre et niveau** : `peut(plan, 'sms.envoi')`, une capacité à créer (`lib/plans.ts:130-136`). En v1, le déclencheur `pilote`
   est refusé (`cadrage-p3.md:219`) → `offre` / `niveau`.
5. `normaliserNumero` → `numero_invalide` (fixes, DOM, formats douteux).
6. `enOpposition(artisan, empreinte)` → `opposition`.
7. `sourceNumero = 'donne_pour_ce_chantier'` → sinon `source_numero`.
8. **Expéditeur** `valide` chez CE fournisseur → sinon `expediteur_non_valide`.
9. **Texte** : `normaliserTypographie`. Sont refusés le texte vide, un lien hors du domaine de l'artisan, un raccourcisseur, le mot
   « presti » → `texte_invalide`. Puis `estimerSms` : plus de 2 segments → `trop_long`.
10. **Plage horaire** `dansPlage` → `plage_horaire`, avec `prochainCreneau` (n8n replanifie).
11. **En réel seulement** : `coutApprouve` existe, porte sur le même fournisseur, et le prix courant est au plus le prix
    approuvé → sinon `cout_non_approuve` / `cout_depasse`.
12. **Idempotence** : `reserver(cle)` → `doublon` si la clé est déjà vue (deux onglets, ou le pilote et un clic).
13. **Plafonds** par artisan et par jour, puis global par jour, en fail-closed → `plafond_artisan` / `plafond_global`.
14. **Disjoncteur** : N échecs récents du fournisseur → `disjoncteur`, et une alerte au fondateur (`lib/alertes.ts`).
15. **À blanc** : `terminer(id, 'simule')` avec l'estimation, puis on rend `simule`. Aucun appel réseau.
16. **En réel** : `fournisseur.envoyer` avec un délai.
    - `ok` → `envoye`.
    - `accepte: false` non définitif (429, 503) → au plus 3 essais, avec un délai qui double, puis `echoue`.
    - `accepte: false` définitif → `echoue`.
    - `accepte: 'inconnu'` → **`incertain`, sans aucun renvoi** (au plus un envoi). On réconcilie par le webhook : la
      `reference` vaut l'`envoiId`, qui sert de `campaign-id` chez Sweego.

### 7.4 Stockage, routes, n8n

**Migration additive proposée.** Session principale, après l'accord écrit de Benj ; collée PUIS drapeau levé ; RLS par
`artisan_id`.
- **`sms_envois`** :
  - `cle` unique, `type`, `objet_table`, `objet_id` ;
  - `empreinte_numero`, `numero_masque` ;
  - `expediteur`, `fournisseur`, `mode`, `etat`, `motif` ;
  - `encodage`, `segments`, `prix_segment_ht`, `cout_ht`, `tarif_source` ;
  - `id_fournisseur`, `declencheur`, `carte_id` ;
  - `created_at`, `updated_at`, `envoye_le`, `livre_le`.
  
  Elle sert à la fois de journal (« ce que j'ai fait pour vous ») et de file d'audit.
- **`sms_oppositions`** : (`artisan_id`, `empreinte_numero`) unique, `source` (`stop_fournisseur`, `lien`, `artisan`), `le`.
- **`sms_expediteurs`** : (`artisan_id`, `fournisseur`) unique, `libelle`, `statut`, `demande_le`, `valide_le`, `motif_refus`.
- **`clients`** : ajout de `tel_source` et `tel_source_le`.

**Routes proposées**

| Route | Accès | Rôle |
|---|---|---|
| `POST /api/sms/envoyer` | session de l'artisan | appelée quand l'artisan valide la carte |
| `POST /api/sms/preparer` | clé de service n8n, droits limités | crée les cartes « SMS prêt, à valider » |
| `POST /api/sms/evenements/sweego` | webhook signé | livré, non livré, STOP → `terminer` et `sms_oppositions` |
| `GET` de la fiche de coût, sous `/controle` | fondateur seulement | la fiche du §8 |

**n8n, sur Oracle.** Il tire et ne reçoit rien (`cadrage-p3.md:153`). Un workflow « rappels SMS du lendemain » tourne du
lundi au samedi : le samedi, il prépare aussi le lundi. Il appelle `preparer` pour les rendez-vous `crm_rappels` du lendemain.
Un workflow « factures échues » fait de même. « Devis prêt » n'est pas une automatisation : c'est un bouton à côté de « Envoyer
le devis ». En v1, n8n ne déclenche **aucun envoi**, seulement des cartes. Le niveau 3 sous Signature passera plus tard par la
même route, avec `declencheur: 'n8n'`.

### 7.5 Correspondance avec les API (lue dans les docs le 02/11)

**Sweego** : `POST https://api.sweego.io/send`, en-tête `Api-Key`. Corps :

```json
{ "channel": "sms", "provider": "sweego", "campaign-type": "market", "sender-id": "…",
  "recipients": [{ "num": "…", "region": "FR" }], "message-txt": "…",
  "campaign-id": "<envoiId>", "shorten-urls": false }
```

- `campaign-type` vaut `market` pour la voie STOP (a), `transac` pour la voie (b).
- Le format exact de `num` reste à vérifier.
- `bat: true` envoie en test, mais **décompté** et en passant outre certaines restrictions marketing : à n'utiliser qu'en QA,
  jamais pour contourner les règles.

**Brevo** : `POST https://api.brevo.com/v3/transactionalSMS/send`. Corps :
- `sender` : 11 caractères alphanumériques au plus ;
- `recipient` : 6 à 15 chiffres, « + » facultatif ;
- `content` ;
- `type` : `transactional` ou `marketing` ;
- `tag`, `webUrl`, `unicodeEnabled`.

Une réponse 201 rend un `messageId`. Parmi les erreurs : `not_enough_credits`. **Aucune idempotence n'est documentée.**
`organisationPrefix` ne doit jamais valoir « Presti ».

**OVHcloud** : `noStopClause` (non-commercial). Expéditeur validé sur justificatif. 1 crédit = 1 SMS de 160 caractères.

---

## 8. Le coût montré à Benj avant le premier envoi réel

**La fiche** (dans `/controle`, et dans ce rapport) :
- le fournisseur ;
- le **prix d'un segment HT**, avec sa page source et sa date de relevé. La TVA française de 20 % s'ajoute, d'après la page
  SMSBox ;
- les exemples ci-dessous ;
- **le volume réel mesuré à blanc** : deux à quatre semaines de lignes `simule` donnent le nombre de SMS qu'on aurait envoyés,
  avec leurs segments.

**Exemples (calculs à partir des prix relevés, pas des mesures)**

| Cas | Sweego 0,040 € | Brevo 0,045 € | OVHcloud 0,06 € (pack 100) |
|---|---|---|---|
| 1 SMS, 1 segment | 0,040 € HT (0,048 € TTC) | 0,045 € | 0,06 € HT |
| 1 SMS, 2 segments (161 à 306 caractères GSM-7, ou 71 à 134 en Unicode) | 0,080 € | 0,090 € | 0,12 € |
| 3 SMS d'un segment par chantier (rappel, devis prêt, paiement) | 0,12 € | 0,135 € | 0,18 € |
| **Hypothèse** : 10 artisans × 20 chantiers par mois × 3 SMS = 600 SMS par mois | 24 € HT/mois | 27 €/mois | 36 € HT au pack de 100, 34,80 € au pack de 1 000 (0,058 €) |
| Ticket d'entrée | 20 € (≈ 500 SMS) | 5 € (500 crédits, ≈ 111 SMS) | ≈ 6 € HT (100), après 20 crédits offerts |

**La porte dans le code.** `SMS_COUT_APPROUVE = null` dans `lib/sms/tarifs.ts`. C'est de l'argent, donc écrit par la session
principale après le « go » écrit de Benj : `{ fournisseur, prixSegmentHT, approuveLe }`. Le mode réel refuse si cette constante
est `null`, si le fournisseur diffère, ou si le tarif relevé dépasse le prix approuvé : un changement de prix redemande l'accord.

**Plafonds proposés** (à fixer par Benj, ADR-007) : 10 SMS par artisan et par jour, 100 par jour pour tout Presti. Dépense
maximale par jour, calculée : 100 × 2 segments × 0,040 € = 8 € HT.

**Qui paie** (argent, à trancher) : défaut, Presti absorbe en v1 sous plafond. Un coût en crédits, comme `COUT_RECHERCHE`
(`lib/plans.ts:118-124`), est à décider par la session principale.

---

## 9. Tests à écrire

Dans `scripts/sms-qa.mjs`, hors ligne, inscrits dans `SUITES`. Chaque test prouve qu'il peut rougir (mutation).

1. **`compterSegments`** :
   - 160 « a » font 1 segment, 161 en font 2 (153 par segment) ;
   - un « ê » fait passer en UCS-2 : 70 caractères tiennent en 1 segment, 71 en font 2 (67 par segment) ;
   - « € » compte 2 septets ;
   - après `normaliserTypographie`, un « ’ » reste en GSM-7.
2. **`expediteurDepuisNom`** :
   - « Plomberie Dupont & Fils » → 11 caractères alphanumériques ; « Élec 17 » → « Elec17 » ;
   - refusés : « 1234 » (aucune lettre), « INFO » (générique), « Presti » (white-label).
3. **`normaliserNumero`** : un mobile 06 donne du +336… ; un fixe 01 et un +262 sont refusés en v1. Données inventées, jamais
   envoyées : aucune plage de numéros fictifs officielle n'a été trouvée, donc **aucun test n'appelle un fournisseur réel**.
4. **`dansPlage`** :
   - refusés : dimanche, 20 h 00, 14 juillet, lundi de Pâques (calculé) ;
   - accepté : samedi 19 h 59 ;
   - passage de l'heure d'été à l'heure d'hiver, heure de Paris.
5. **À blanc** : avec une doublure `fetch` qui lève, on obtient `simule` et zéro appel.
6. **Idempotence** : deux appels parallèles sous la même clé donnent un `envoye` et un `doublon` ; le fournisseur n'est appelé
   qu'une fois.
7. **Opposition** : après un webhook STOP, l'envoi suivant est refusé.
8. **Coût** : en réel, sans coût approuvé → `cout_non_approuve` ; avec un prix relevé supérieur au prix approuvé →
   `cout_depasse`.
9. **Type** : un type hors liste, forcé par cast → `type_interdit`.
10. **Délai dépassé** après l'appel → `incertain`, aucun second appel. Un 503 avant acceptation → 3 essais au plus (horloge
    injectée), puis `echoue`.
11. **Plafonds** : le 11e SMS d'un artisan dans la journée est refusé, et tout est refusé si le magasin lève (fail-closed).
12. **Expéditeur** `en_attente` → refusé ; jamais de repli sur le numéro court du fournisseur.
13. **White-label** : `texteFinal` ne contient jamais « presti » ni « prestiapp.fr », casse ignorée.
14. **Isolation RLS** de `sms_envois` entre deux artisans, dès que la migration existe.

---

## 10. Questions ouvertes, chacune avec un défaut

| # | Question | Défaut (avance sans attendre, se défait) |
|---|---|---|
| S1 | Quel fournisseur ? | **Sweego** (0,040 €) ; Brevo en repli, sur un compte distinct de la prospection |
| S2 | Comment porter STOP ? | Code STOP du fournisseur (type marketing chez lui), plage lun-sam 8 h-20 h ; lien `/stop/<jeton>` dès qu'un domaine neutre existe |
| S3 | Le niveau 3 sous Signature ? | Non en v1 ; ouvert après deux semaines de réel sans incident |
| S4 | Les plafonds ? | 10 par artisan et par jour, 100 par jour au total, 2 segments au plus |
| S5 | Qui paie le SMS ? | Presti en v1, sous plafond ; crédits à décider (argent) |
| S6 | Les numéros sans source ? | Aucun SMS par API ; l'étape 0 (`sms:`) reste offerte à l'artisan |
| S7 | Les DOM ? | Non en v1 |
| S8 | Questions au support de Sweego ? (un message : geste de Benj) | Justificatifs exigés par Sender ID depuis le 1er mars 2026 pour une plateforme qui envoie au nom de ses clients ; portée de la liste STOP (par expéditeur ou pour tout le compte) ; STOP possible en transactionnel ; prix marketing égal au prix transactionnel ; format de `num` |

---

## 11. Ce que je n'ai pas pu vérifier

- **Sweego** :
  - HT non écrit sur la page tarifs ;
  - application des règles du 1er mars 2026 ;
  - portée de la liste STOP, format de `num`, idempotence ;
  - prix marketing ou transactionnel.
- **Brevo** :
  - HT ou TTC ;
  - si le plan gratuit vaut « Souscription » au sens des CGU ;
  - plusieurs Sender ID pour la France sur un même compte ;
  - portée de la liste de blocage (source secondaire) ;
  - divergence entre l'aide (8 h - 21 h 30 tous les jours) et l'API (ni la nuit, ni le dimanche, ni les jours fériés).
- **Autres fournisseurs** :
  - Twilio : article d'aide sur l'enregistrement en France illisible (403) ;
  - Octopush : page tarifaire incohérente ;
  - Vonage, Sinch, AWS SNS : chiffres de seconde main.
- **Textes de référence** :
  - texte de l'article L34-5 du CPCE non lu sur Légifrance (mauvais article servi) : je m'appuie sur la page de la CNIL ;
  - PDF de la charte af2m non téléchargeable (lien « # ») : je m'appuie sur l'article de l'af2m du 13/02/2026 et sur
    The Media Leader du 19/02/2026.
- **Hors périmètre lu** :
  - comportement exact des liens `sms:` sur iOS et Android : seule la RFC 5724 est citée ;
  - existence d'un compte Brevo de Presti : non vérifiée ici.

**Panneau navigateur.** L'onglet `tab-3`, qui montrait la page de connexion n8n (`localhost:5679`), a servi à lire des pages
publiques. Il affiche maintenant `learn.sweego.io`. Le retour à la page n8n a été refusé par le classifieur : il faut le rouvrir
à la main si besoin.

---

## 12. Sources (toutes consultées le 02/11/2026)

**Fournisseurs**
- Sweego :
  - https://www.sweego.io/pricing
  - https://www.sweego.io/pricing/european-sms-price-comparison
  - https://www.sweego.io/fr
  - learn.sweego.io (`/docs/sms/what_is_a_senderid`, `/docs/sms/sms_limits`, `/docs/sending/how_to_send_sms_by_api`,
    `/docs/webhooks/sms_events`, `/docs/webhooks/sms_payload`, lus via `search-doc-1793119126979.json`)
- Brevo :
  - https://www.brevo.com/fr/tarifs/a-la-carte/ (calculateur : onglet SMS, France, 100 et 10 000)
  - https://help.brevo.com/hc/fr/articles/28255350696466
  - https://help.brevo.com/hc/fr/articles/11884482521234
  - https://developers.brevo.com/docs/transactional-sms-endpoints.md
  - https://developers.brevo.com/reference/send-async-transactional-sms.md
  - https://www.brevo.com/fr/legal/termsofuse/ (version du 1er octobre 2025)
- Les autres :
  - Allmysms : https://www.allmysms.com/tarifs-sms/
  - Spot-Hit : https://www.spot-hit.fr/tarifs
  - OVHcloud : https://www.ovhcloud.com/fr/sms/prices/, https://www.ovhcloud.com/fr/sms/sms-regulations/,
    https://docs.ovhcloud.com/fr/guides/web-cloud/messaging/sms/send-sms-control-panel.md,
    https://docs.ovhcloud.com/fr/guides/web-cloud/messaging/sms/sms-senders.md
  - SMSFactor : https://www.smsfactor.com/tarifs
  - SMSBox : https://www.smsbox.net/pricing-sending-sms
  - Octopush : https://www.octopush.com/en/pricing-sms-france/
  - Twilio : https://www.twilio.com/en-us/sms/pricing/fr, https://www.twilio.com/en-us/guidelines/fr/sms,
    https://www.twilio.com/docs/glossary/what-sms-character-limit
  - Plivo : https://www.plivo.com/sms/pricing/fr/
  - smsmode : https://www.smsmode.com/en/insertion-mention-stop-sms/
  - Link Mobility : https://www.linkmobility.com/news/france-updates-sms-sender-id-requirements-from-march-2026

**Règles**
- CNIL : https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel (page du
  10 juin 2026)
- af2m :
  - https://af2m.org/charte-business-messaging-2026-laf2m-renforce-les-regles-du-jeu/ (13/02/2026)
  - https://af2m.org/charte-business-messaging/
  - https://www.af2m.org/ (lien du 33700)
- The Media Leader : https://fr.themedialeader.com/?p=210674 (19/02/2026)
- Arcep, décision n° 2022-1583 :
  https://www.arcep.fr/actualites/les-communiques-de-presse/detail/n/plan-de-numerotation-050922.html (05/09/2022)
- ANIL, loi n° 2025-594 : https://www.anil.org/aj-loi-lutte-fraude-aides-publiqus-renovation-energetique/
- RFC 5724 : https://www.rfc-editor.org/rfc/rfc5724
- GSM 03.38 : https://en.wikipedia.org/wiki/GSM_03.38

**Réseau neuronal et dépôt**
- ADR-007 et ADR-004 (vault `10 Presti/04 Décisions/`)
- `plans/011-cadrage-01-11/prompts-benj/p3-assistant.md`
- `plans/011-cadrage-01-11/cadrage-p3.md`
- `plans/011-cadrage-01-11/cadrage-00-synthese.md:76`
- `.claude/rules/*.md`
- les fichiers de code cités au §2
