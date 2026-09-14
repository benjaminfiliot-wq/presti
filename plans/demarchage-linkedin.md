# Démarchage LinkedIn — le kit, et ce qui l'encadre

Fabriqué le **2026-09-09**. Cinq versions écrites selon cinq angles, chacune démolie par trois juges
adverses (chaque affirmation est-elle vraie et sourcée · un plombier de Rochefort répondrait-il · ça
tient-il dans les contraintes LinkedIn), puis une synthèse qui repart de la mieux classée et greffe
le meilleur des autres. **Les cinq versions ont été notées entre 4,7 et 5,0 sur 10** — c'est-à-dire
qu'aucune n'était publiable telle quelle, et que le travail utile est ce que les juges ont trouvé.

> **La liste nominative des prospects ne vit PAS ici.** Ce dépôt est sur GitHub.
> Elle est dans `presti-secrets/prospection/linkedin-17-2026-09-09.md`, hors git.

---

## Ce que j'ai vérifié moi-même, à l'écran, et qui prime sur le reste du document

Les quatre points ci-dessous ont été **mesurés dans le vrai Chrome le 09/09**, pas déduits. Là où
ils contredisent le §6 (« ce que je ne sais pas ») du kit, ce sont eux qui font foi.

**1. Le compteur de notes est de 3, et il est affiché.** En ouvrant la boîte d'invitation sur un
profil réel (annulée sans envoyer), LinkedIn écrit : *« Il vous reste 3 invitations personnalisées
ce mois-ci. »* Et le champ compte **0/200**. Le §6 hésitait entre 3 et 5 : c'est 3. Donc la note
personnalisée est un **consommable rare**, à réserver aux trois meilleurs profils du mois ; tout le
reste part **sans note**, et le message après acceptation doit se comprendre seul — c'est
exactement pour ça qu'il ne commence pas par « Merci d'avoir accepté ».

**2. Le profil de Benj est en état.** Ouvert le 09/09 : titre **« Fondateur chez Presti »**,
La Rochelle, entreprise Presti, publication du jour en ligne (86 impressions). Le §6 posait un
verrou — « si le titre est encore *Sans-emploi chez Microsoft*, ne rien envoyer » — **il est levé.**

**3. Mais le compte a 1 relation.** C'est le profil d'expéditeur le plus fragile qui soit pour
LinkedIn : compte de deux jours, aucun historique, aucun réseau. La cadence du §5 (5 par jour les
trois premiers jours) n'est pas de la prudence décorative, c'est la condition pour que le compte
survive à la première semaine.

**4. Le lien du kit a changé.** Il pointait vers `prestiapp.fr/a/linkedin` — **le même code que la
publication publique**, ce que le §6 signalait comme un angle mort de mesure. La migration 0087 n'était
pas encore collée : j'y ai ajouté le code **`linkedindm`**, et le kit ci-dessous pointe désormais vers
`prestiapp.fr/a/linkedindm`. Une inscription venue d'un message privé devient distinguable d'une
inscription venue du post.

> ✅ **Collé le 2026-09-09.** `scripts/controle-canaux-e2e.mjs` lit la vraie base et rend **58/58,
> sortie 0** : les quatre canaux — `facebook`, `linkedin`, `instagram`, `linkedindm` — sont en place et
> actifs. Le lien de la relance sera compté à part de celui du post public.

## Une décision tranchée, une qui reste ouverte

**Le numéro de téléphone — il reste.** Benj a répondu « oui pour le num » le 2026-09-09.
`06 30 78 16 47` figure donc dans la relance et dans la réserve « vous êtes qui ». C'est cohérent
avec le reste : un message qui propose d'appeler et qui ne donne pas de numéro ne vaut rien.

**La publication du 09/09 dit plus que le kit.** Le post en ligne affirme « *puis trois relances par
email partent à 2, 5 et 10 jours* ». Vérifié dans le code par trois agents indépendants : ces relances
ne sont programmées que dans la branche où l'assistant a répondu **tout seul** — donc **pas sur un
compte réglé par défaut**. Le post n'est pas faux, il décrit une configuration ; il est simplement
plus large que ce que vivra le prospect. Le §2 contient la réponse si quelqu'un rapproche les deux.
Modifier le post est un choix à faire, pas une correction évidente.

---

# Kit de démarchage LinkedIn — version finale

*Angle retenu : le contrariant, réparé. « Mon assistant rédige, il n'envoie pas. » C'est la seule promesse que l'artisan peut vérifier lui-même, et c'est la seule qui reste vraie sur le compte qu'il va créer.*

Vérifications faites en lecture seule dans `C:\Users\benja\Documents\presti` le 2026-09-09. Rien n'a été modifié, committé ni exécuté.

---

## 1. Le kit

### Avant d'envoyer quoi que ce soit

- **On n'écrit qu'aux titres portant un mot de statut** (Gérant, Artisan, Auto-entrepreneur, À mon compte, Fondateur, Chef d'entreprise…). Tous les textes ci-dessous disent « votre page », « vos clients », « votre nom sur le message » : envoyés à un « Plombier chez Fichet », ils proposent à un salarié de travailler à côté de son employeur, et sur le bassin La Rochelle / Rochefort le message remonte chez le patron.
- **Une ligne écrite à la main dans chaque message**, tirée du seul titre (jamais du lieu, jamais d'une déduction). Trois exemples utilisables tels quels, à insérer après la première phrase :
  - couvreur → « Je vous écris parce que couvreur fait partie des métiers qui ont leur propre profil dans l'assistant, et je veux savoir s'il tient la route. »
  - plombier chauffagiste → « Côté rédaction, chauffagiste retombe sur le profil du plombier — je préfère le dire tout de suite. »
  - carreleur → « Chez vous, l'assistant a un profil dédié mais seulement trois postes de prix de référence. C'est peu, et je veux savoir si ça se voit. »
- **Aucun outil d'automatisation, aucune extension.** C'est le seul motif où LinkedIn écrit noir sur blanc qu'il peut suspendre le compte.

### Note de connexion — 175 caractères (gabarit), 177 avec « Christophe », 182 au pire avec « Jean-Christophe »

```
Bonjour {prenom}, je construis un assistant pour les artisans du bâtiment : il rédige la réponse au client, mais c'est vous qui l'envoyez. Je cherche l'avis de gens du métier.
```

Marge réelle sous le plafond de 200 : 18 caractères avec le prénom le plus long testé. La note ne promet pas « je ne vends rien » — le lien arrive à la relance, et une note qui jure le contraire se dément toute seule 48 h plus tard.

### Message après acceptation — 773 caractères

Il est écrit pour tenir **sans la note** : sur un compte gratuit la quasi-totalité des invitations partiront sans elle, donc ce message est le premier contact réel. Pas de « Merci d'avoir accepté ».

```
Bonjour {prenom}, Benjamin Filiot, je construis Presti, un assistant pour les artisans du bâtiment.

Un client écrit sur votre page Presti, l'assistant lui pose les questions qui manquent et prépare la réponse. Et il s'arrête là : sa proposition reste dans votre espace, invisible du client, tant que vous ne l'avez pas relue et envoyée. C'est votre nom sur le message, donc c'est vous qui l'envoyez.

Une seule chose part sans vous : l'accusé de réception « Bien reçu », signé de votre nom, pour que le client ne reste pas devant un écran muet.

Le mode où l'assistant répond tout seul existe. Il est à 59 € par mois, et il faut aller le cocher : à l'installation, il ne l'est pas.

Ce réglage-là, vous en pensez quoi ? Trop prudent, ou c'est comme ça qu'il faut faire ?
```

### S'il répond — les trois seules suites à ne pas improviser

**S'il donne son avis sur le réglage :**
```
Merci, c'est exactement ce que je cherchais. Une dernière si vous avez deux minutes : quand une demande vous arrive par écrit, vous répondez plutôt le soir, ou ça attend le week-end ? Je vous dis ce que ça donne dans le produit si ça vous intéresse — sinon je ne vous embête plus.
```

**S'il demande « c'est combien ? » :** la version courte de l'objection 1, rien de plus.

**S'il dit que ce n'est pas pour lui :**
```
Ça marche, merci de me l'avoir dit — ça m'évite de vous relancer pour rien. Si un jour vous voyez un confrère qui galère avec ses demandes écrites, vous saurez où me trouver.
```

### Relance — une seule, ~5 à 7 jours après l'acceptation — 803 caractères

```
Bonjour {prenom}, je reviens une fois et après je vous laisse tranquille.

Ce que Presti ne fait pas, autant vous le dire : il ne décroche pas le téléphone, il n'envoie pas de SMS, il n'est pas sur WhatsApp. C'est de l'écrit. Et sur une boîte mail branchée, il range ce qui arrive, il n'y répond pas.

Il ne vous apporte pas de clients non plus : c'est vous qui posez le lien de votre page.

Si chez vous tout se règle au téléphone, ça ne vous servira à rien, et je préfère vous le dire. Si une partie arrive par écrit et que vous voulez juger sur pièce, l'essai donne 3 crédits sans carte bancaire : https://prestiapp.fr/a/linkedindm

Et si le texte tombe à côté, dites-le moi ici — ça m'est plus utile qu'un abonnement pris à l'aveugle. Au pire, de vive voix : 06 30 78 16 47, jours ouvrés 9 h - 18 h.
```

### Les cinq objections

**1. « C'est combien ? Encore un abonnement. »**

*Court, à envoyer tel quel :* « Essentiel 29 € par mois, Studio 59 €, Signature 99 €. Sans engagement, et l'essai donne 3 crédits sans carte bancaire. Je vous détaille les crédits si vous voulez — c'est la seule chose un peu compliquée. »

*Si on creuse :* 80 crédits sur Essentiel, 250 sur Studio, 600 sur Signature. Un crédit = une génération : une réponse rédigée, ou un devis chiffré. Le modèle Expert, réservé à Signature, en coûte trois. Les crédits ne se reportent pas d'un mois sur l'autre. TVA non applicable, article 293 B du CGI : le prix affiché est le prix payé. Changement d'offre et résiliation depuis le portail de facturation.

Deux choses que je préfère dire avant que vous les découvriez : le crédit est décompté dès que l'assistant écrit, **même si vous jetez sa proposition** ; et avec 3 crédits d'essai vous avez de quoi juger un texte, pas de quoi juger un mois de travail — deux messages d'un client plus un devis, et l'essai est fini.

Et je n'ai aucun chiffre de rentabilité à vous donner : personne ne l'a mesuré, et je ne vais pas l'inventer.

**2. « Et mes clients, ils arrivent comment sur cette page ? »**

Par vous, et par personne d'autre. Presti ne fait aucune publicité et ne vous apporte aucun client. Votre page a une adresse — `prestiapp.fr/p/votre-nom` au départ, ou votre propre nom de domaine si vous en avez un, celui que vous achetez chez votre registraire — et c'est vous qui la posez : sur votre fiche Google, dans votre signature de mail, sur vos devis, sur le site que vous avez déjà. Il y a bien un site vitrine dans le produit, mais il n'est pas en ligne tant que vous ne l'avez pas publié vous-même. Si ce que vous cherchez, c'est plus de demandes, ce n'est pas le bon outil, et autant le savoir avant de payer.

**3. « L'IA va raconter n'importe quoi à mes clients, et c'est ma réputation. »**

*Court :* « C'est la question qu'il faut poser. À la création du compte, l'assistant n'envoie rien : il rédige, sa proposition est posée dans votre espace, invisible du client, et elle ne part que si vous cliquez. Vous la validez, vous la retouchez, ou vous la jetez. »

*Si on creuse :* le ton, c'est vous qui le décrivez à l'inscription, en trois lignes — l'assistant s'en inspire, il n'apprend pas votre écriture tout seul. Le devis est chiffré en brouillon, et il ne peut pas sortir tant que vos mentions obligatoires ne sont pas remplies : dénomination, forme juridique, SIRET, adresse, assurance. Le serveur refuse l'envoi, dit ce qui manque et où le remplir, et garde le brouillon intact. Vous pouvez aussi prendre la main sur une conversation : l'assistant se tait sur ce fil-là, et vous lui rendez la main quand vous voulez.

Le mode où il répond seul est à partir de Studio (59 €) et il faut le cocher soi-même. Même là il se coupe sur les mots urgence, fuite, dégât des eaux, inondation, gaz, assurance ; il s'arrête au bout de 8 réponses dans une même conversation ; et il se tait en dehors de la plage horaire que vous réglez.

**4. « J'ai pas le temps de me mettre à un logiciel de plus. » / « J'ai déjà mon fonctionnement. »**

L'inscription, c'est deux écrans et une dizaine de champs : email, mot de passe, les conditions ; puis votre nom ou celui de l'entreprise, votre métier, votre téléphone, comment vous m'avez connu, et le ton de vos réponses. Pas de carte bancaire, rien à toucher chez votre registraire, aucune boîte mail à brancher pour démarrer. À la fin du deuxième écran, votre page peut recevoir un premier message. Je ne vous annonce pas de durée : je ne l'ai pas mesurée et je ne vais pas l'inventer.

Ce qui prend vraiment du temps vient après, et dans cet ordre : remplir vos mentions légales — sans elles aucun devis ne sort — puis saisir vos prix, parce que tant qu'ils ne sont pas là le chiffrage tourne sur des ordres de grandeur du marché.

Et si votre fonctionnement marche, si vos réponses partent le jour même, ne changez rien. Ce n'est pas non plus un logiciel de facturation : un logiciel de facturation range ce qui est arrivé jusqu'au bureau, le chantier perdu, lui, n'y est jamais entré.

**5. « C'est pas pour moi. / Mon métier, c'est particulier. »**

Possible, et il y a quatre cas où je vous le dis moi-même.

Un : vos clients appellent, ils n'écrivent pas. Presti ne décroche pas, ne rappelle pas, ne transcrit aucun appel.

Deux : quelqu'un au bureau reçoit et chiffre les demandes à votre place. Alors le problème que je traite n'est pas le vôtre.

Trois, la rédaction : huit métiers ont leur propre profil dans l'assistant — plombier, électricien, menuisier, maçon, peintre, carreleur, couvreur, paysagiste. Un chauffagiste retombe sur le profil du plombier, un plaquiste sur celui du peintre, les autres sur un profil générique d'artisan du bâtiment.

Quatre, le chiffrage : les ordres de grandeur livrés couvrent huit métiers aussi, **mais pas les mêmes** — plombier, chauffagiste, électricien, maçon, menuisier, couvreur, peintre, carreleur, trois à cinq postes chacun. Un paysagiste, un plaquiste ou un serrurier n'y trouvent rien tant qu'ils n'ont pas saisi leurs propres prix.

### Deux réponses courtes en réserve

**« Vous êtes qui, au juste ? »**
Benjamin Filiot, entreprise individuelle immatriculée le 1er septembre 2026, SIREN 109 411 348, basé en Charente-Maritime. Les mentions légales sont sur prestiapp.fr/mentions-legales, adresse comprise. 06 30 78 16 47, jours ouvrés 9 h – 18 h. C'est moi qui code, et c'est moi qui réponds.

**« Mon client va voir que c'est une IA ? »**
Ce que je peux vous dire de sûr : le message part à votre nom, avec votre adresse en réponse, mais il est expédié depuis contact@prestiapp.fr — pas depuis votre boîte. Et comme c'est vous qui relisez et qui envoyez, ce que le client lit, c'est ce que vous avez validé. Si vous me demandez si un client peut deviner qu'un assistant a tenu le stylo : je n'en sais rien, personne ne l'a mesuré.

---

## 2. Pourquoi ce texte et pas un autre

**L'absolu « rien ne part sans vous » a été remplacé, pas adouci.** Les trois juges de trois kits différents l'ont démonté sur la même ligne de code : *« FAUX, et c'est la phrase centrale — l'accusé de réception part tout seul, au nom de l'artisan, sans clic »*. Je l'ai revérifié moi-même : `app/api/leads/route.ts:200-210`, dans la branche où l'assistant ne répond pas, commentaire du code compris (« même en mode manuel »). Le kit dit donc « une seule chose part sans vous », et la nomme.

**Pourquoi « une seule chose » et pas la formule publiée (« l'accusé de réception *et* les trois relances »).** Vérifié en remontant les trois chemins : les relances J+2/J+5/J+10 ne sont insérées que dans la branche où l'assistant a répondu seul (`app/api/leads/route.ts:296-306`), la capture de coordonnées ne les programme que `if (lead.statut === 'repondu')` (`app/api/leads/contact/route.ts:86-95`), et valider une proposition à la main écrit `en_discussion`, pas `repondu` (`app/api/messages/route.ts`). **Sur un compte réglé par défaut, il n'y a aucune relance automatique.** La formule publiée sur Facebook n'est pas fausse — elle décrit la configuration où l'assistant répond — mais elle est plus large que ce que vivra le prospect. Si quelqu'un rapproche les deux : « les trois relances existent, elles ne se déclenchent que si l'assistant a répondu tout seul — donc pas sur le réglage de départ ».

**L'affirmation de marché a sauté.** Le juge artisan sur le kit contrariant : *« Personne ne m'a jamais vendu d'IA, donc me dire qu'il fait l'inverse de ce que tout le monde promet ne me dit rien du tout. »* Elle était en plus invérifiable et interdite au même titre qu'un chiffre inventé. Le kit ne se compare plus à personne : il décrit un réglage et demande ce qu'on en pense.

**Le prix du mode automatique est annoncé dans le premier message.** Juge vérité : *« DEMI-VÉRITÉ PAYANTE — “il n'est pas coché à l'installation” omet qu'il est verrouillé à Studio (59 €). »* Présenter une option payante comme une case à cocher, c'est exactement la surprise que l'angle prétend éviter.

**Le devis n'est plus présenté comme automatique.** Trois juges l'ont vérifié indépendamment, et je l'ai refait : `repondreAvecOutils` (`lib/ai/outils.ts:181`) n'est importé par **aucune** route de `app/` ; les seuls chemins qui créent un devis brouillon sont le bouton « Créer un devis » de la console (`app/plateforme/Conversations.tsx:210` et `:305` → `POST /api/devis/auto`, authentifié) et le moteur de règles, réservé à Signature. Le kit ne parle donc du devis que dans les objections, et au geste : chiffré en brouillon, envoi bloqué sans les mentions.

**La question finale a changé.** L'ancienne (« votre délai réel de première réponse ? Pas l'objectif. Le réel. ») a été jugée deux fois : *« un inconnu qui anticipe mon mensonge, c'est fini »*, et *« elle m'offre ma sortie sur un plateau : je réponds “je rappelle toujours dans l'heure” et c'est terminé »*. La nouvelle porte sur le réglage qu'il vient de lire : il a la réponse, elle ne l'accuse de rien, et elle ne l'élimine pas.

**Le lien a quitté le premier message.** Le juge LinkedIn : *« la note demande un avis, le message livre un lien tracké — c'est précisément l'écart qui produit un signalement spam »*. La note demande un avis, le premier message pose une question et ne vend rien, la relance apporte le lien **après** avoir donné une raison de partir. Corollaire : la note ne jure pas « je ne cherche pas de clients » — cette phrase-là, jugée sur le kit devis, est *« la seule phrase du kit fausse avant même de parler du produit »*.

**« Merci d'avoir accepté » a disparu.** Deux raisons : c'est l'ouverture reconnaissable de tout outil d'automatisation (*« trois mots qui classent le message avant la deuxième ligne »*), et surtout elle suppose une note que la plupart des invitations n'auront pas.

**Une objection a été remplacée.** Le juge vérité sur le kit contrariant : *« TROU STRATÉGIQUE — d'où viennent les demandes ? L'objection la plus évidente du métier n'est pas dans les cinq. »* « Et mes clients, ils arrivent comment sur cette page ? » entre, et la réponse dit non : Presti n'apporte personne.

**« En cinq minutes » a été supprimé partout**, y compris de la réponse-type validée sur les métiers. Deux juges ont relevé la contradiction : on refuse noblement de chiffrer une durée d'installation, et on chiffre trois paragraphes plus loin. Le refus ne vaut que s'il tient dans tout le document.

**La boîte mail a été désambiguïsée.** Les trois lentilles ont relevé la même mécanique : la phrase validée (« c'est de l'écrit — votre page, et votre boîte mail ») est vraie dans un post, mais collée après « l'assistant prépare la réponse », elle promet que l'assistant traite les emails. Vérifié : un email entrant est seulement inséré en base (`lib/releveCanal.ts:94-99`), aucune IA n'est appelée, relève une fois par jour. Le kit écrit donc : « il range ce qui arrive, il n'y répond pas ».

**« Dans votre façon d'écrire » est devenu « le ton que vous décrivez à l'inscription ».** L'onboarding ne contient qu'un champ libre — `app/onboarding/page.tsx:113`, « Le ton de tes réponses (l'IA s'en inspirera) ». Rien n'apprend son écriture.

**Aucun ancrage local n'est affirmé sur le destinataire.** Ma localisation est sourçable et sert dans la réserve « vous êtes qui ». Celle de l'artisan, non : le juge local a eu raison de tirer sur « je ne suis pas loin » — c'est une affirmation sur quelqu'un dont on ne connaît qu'un champ « lieu » à une date inconnue.

**Ce qui a été greffé des autres kits :** « Et il s'arrête là. » (kit contrariant, la seule ligne qu'un artisan prononcerait) ; « je reviens une fois et après je vous laisse tranquille » (kits local et contrariant, engagement vérifiable et gratuit) ; le refus de chiffrer dit à voix haute (« je n'ai aucun chiffre de rentabilité… je ne vais pas l'inventer ») ; la relance qui **retire** une promesse au lieu d'en ajouter une, avec l'auto-disqualification **avant** le lien (kit chantier) ; et l'aveu placé exactement là où la déception va se produire (kit devis) — ici, les 3 crédits d'essai qu'un vrai test épuise.

**Les longueurs.** 177 / 773 / 803 caractères. Les kits jugés faisaient 900 à 1 600 caractères pour le seul premier message, sur un réseau où la cible passe trois fois par an, depuis un téléphone.

---

## 3. Ce que chaque affirmation vaut

| Affirmation du kit | Où elle se vérifie |
|---|---|
| L'assistant rédige et n'envoie pas ; c'est le réglage de départ | `lib/plateformeConfig.ts:44-45` (`CONFIG_DEFAUT.mode_reponse = 'assistee'`) ; `:136` (`raison: 'assistee'`) |
| Sa proposition reste dans votre espace, invisible du client | `app/api/conversation/stream/route.ts` (bloc « Mode ASSISTÉ » : `insert(… etat: 'proposition')`) ; `app/api/conversation/route.ts:46` (le client ne voit que `etat` null) |
| Vous validez, vous retouchez, ou vous jetez ; ça ne part qu'au clic | `app/api/messages/route.ts:82-101` (actions `valider` / `rejeter`, `update({ etat: null, contenu: texte })`, puis `sendEmail`) |
| Une seule chose part sans vous : l'accusé de réception « Bien reçu », signé de votre nom | `app/api/leads/route.ts:200-210` (`fromName: artisan.nom`, `subject: 'Bien reçu — …'`, `replyTo: artisan.email`) — **nuance vérifiée** : uniquement si le client a laissé un email ; s'il laisse un téléphone, rien ne part |
| Aucune relance automatique sur un compte par défaut | Relances insérées seulement dans la branche « l'IA a répondu » (`app/api/leads/route.ts:296-306`), et à la capture de contact seulement `if (lead.statut === 'repondu')` (`app/api/leads/contact/route.ts:86-95`) ; le cron annule dès que le statut change (`app/api/cron/relances/route.ts:56`) |
| Le mode « répond tout seul » est à 59 €/mois et doit être coché | `lib/plans.ts` (`'plateforme.ia.auto'` n'apparaît que dans `STUDIO`) ; `lib/plateformeConfig.ts:159-162` (`modeEffectif`, motif `verrou_offre` : un compte Essai/Essentiel qui coche est servi en assistée) |
| Même en mode auto : mots d'escalade, 8 réponses max, plage horaire | `lib/plateformeConfig.ts:56` (`escalade_mots: urgence, fuite, degat des eaux, inondation, gaz, assurance`), `:57` (`limite_messages: 8`), `iaDoitRepondre` (`dansLaPlage`) |
| Vous pouvez prendre la main sur une conversation, et la rendre | `lib/plateformeConfig.ts:180` ; `app/api/messages/route.ts:73-81` (`prise_en_main` / `rendre_main`) |
| Le devis est chiffré en brouillon | `lib/devisAuto.ts` (`insert({ … statut: 'brouillon', validite_jours: 90 })`) ; `lib/plateformeConfig.ts:50` (`devis_auto: 'brouillon'`) |
| Le devis se crée au clic de l'artisan (jamais présenté comme automatique) | `app/plateforme/Conversations.tsx:210` et `:305` (bouton « Créer un devis » → `POST /api/devis/auto`, jeton obligatoire) ; `lib/ai/outils.ts:181` `repondreAvecOutils` n'est importé par aucune route de `app/` (grep) ; règles réservées à Signature : `lib/reglesServeur.ts:33` + `'plateforme.regles'` dans `SIGNATURE` (`lib/plans.ts`) |
| Un devis ne sort pas sans dénomination, forme, SIRET, adresse, assurance | `lib/legalArtisan.ts:88` (`MENTIONS_EMISSION`) ; `app/api/devis/[id]/envoyer/route.ts:46-52` (HTTP 422, `code: 'mentions_manquantes'`, `lien: /parametres`, brouillon conservé) |
| Vos prix d'abord, ordres de grandeur du marché pour le reste | `lib/prix/index.ts:8-12` ; `lib/devisAuto.ts` (`catalogueDe(uid, art.metier)`) |
| Ordres de grandeur : 8 métiers, 3 à 5 postes chacun, paysagiste et plaquiste absents | `supabase/migrations/0002_devis.sql:99-134` — Plombier 5, Électricien 5, Maçon 4, Peintre 4, Menuisier 4, Carreleur **3**, Chauffagiste 4, Couvreur 4 ; recherche par égalité stricte sur le métier déclaré : `lib/prix/marche.ts` (`.eq('metier', metier)`) ; les 29 métiers proposés : `app/onboarding/page.tsx:10-16` |
| 8 profils de rédaction ; chauffagiste → plombier, plaquiste → peintre | `lib/ai/metiers.ts:12` (`MetierId`) ; `:34` (alias plombier contient `chauffag`) ; `:66` (alias peintre contient `plaqu`) |
| Le ton est décrit par l'artisan à l'inscription | `app/onboarding/page.tsx:113` (« Le ton de tes réponses (l'IA s'en inspirera) ») |
| 29 / 59 / 99 € ; 80 / 250 / 600 crédits ; essai 3 crédits | `lib/plans.ts:58-61` |
| 1 crédit = 1 génération ; Expert = 3 crédits, réservé à Signature | `lib/plans.ts:67` (`CREDIT_COST`) ; `tiers` de `signature` seul contient `expert` (`lib/plans.ts:61`) |
| Les crédits ne se reportent pas | `supabase/migrations/0008_secure_rpc.sql:15-18` (remise à `p_credits_mois` à la date de reset) |
| Le crédit est décompté même si vous rejetez la proposition | `app/api/conversation/stream/route.ts` (`consumeCredit` **avant** `generateConversationReply`) ; `rendreCredit` seulement dans le `catch` (`lib/credits.ts`) ; `action: 'rejeter'` n'écrit que `etat: 'rejete'` (`app/api/messages/route.ts`) |
| Sans engagement, résiliation depuis le portail | `app/api/subscribe/route.ts:27-28`, `:39` (`mode: 'subscription'`) |
| TVA non applicable, art. 293 B du CGI | `app/page.tsx:161` ; `app/api/subscribe/route.ts:36` et `:46-51` (calcul de TVA désactivé) |
| Essai sans carte bancaire | `lib/plans.ts:58` (plan `gratuit`, `prixMois: 0`, 3 crédits) ; `app/signup/page.tsx:66` (aucun appel Stripe à l'inscription) |
| Inscription : deux écrans, ~10 champs, ni carte ni DNS ni boîte mail | `app/signup/page.tsx:90-118` ; `app/onboarding/page.tsx:88-115` |
| À la fin, la page peut recevoir un message | `supabase/migrations/0012_platform_profile.sql:8` (`plateforme_active boolean default true`) ; `app/onboarding/page.tsx:55` (création du slug) |
| Adresse de la page : `prestiapp.fr/p/votre-nom` par défaut | `lib/urls.ts` (`chemins`, cas par défaut : `/p/${slug}`) — voir §6, dépend d'une variable d'environnement |
| Le site vitrine n'est pas en ligne tant qu'on ne le publie pas | `supabase/migrations/0019_site_builder.sql:7` (`site_active boolean default false`) |
| Sur une boîte mail branchée, il range, il ne répond pas | `lib/releveCanal.ts:94-99` (simple `insert` d'un message, aucune IA) ; `vercel.json` (`/api/canaux/relever`, `0 7 * * *`) |
| Pas de téléphone, pas de SMS, pas de WhatsApp | `lib/flags.ts:67-70` (`canauxWhatsapp: false`, `canauxReseaux: false`) ; `app/messages/canaux/page.tsx:163` (le produit le dit à l'artisan) |
| Les emails partent de contact@prestiapp.fr, à votre nom, votre adresse en réponse | `lib/email.ts:14`, `:24-27`, `:66` ; corroboré par l'usage `fromName` / `replyTo` dans `app/api/leads/route.ts:200-210` |
| Presti ne vous apporte pas de clients | Aucune route d'acquisition dans le produit ; la page ne reçoit que ce que l'artisan diffuse (`lib/urls.ts`) — affirmation par absence, assumée comme telle |
| Identité, SIREN, téléphone, horaires | `plans/publications-lancement.md:133-138` (bloc légal validé) ; Charente-Maritime : adresse des mentions légales, même document |
| Lien https://prestiapp.fr/a/linkedindm actif | `plans/publications-lancement.md:325` ; `lib/apports.ts:6-13` (empreinte signée 90 jours, ne compte pas les clics) |
| Note de connexion ≤ 200 caractères sur compte gratuit | Page d'aide LinkedIn a563153 (« Each message can be up to 200 characters ») ; comptes du kit mesurés en UTF-16 |

Aucune ligne du kit n'est restée sans preuve. Trois affirmations présentes dans les kits précédents ont été **supprimées** faute de preuve : le chiffrage automatique du devis, la promesse d'un chantier gagné dans l'année, et toute durée d'installation.

---

## 4. Ce qui a été rejeté, et pourquoi

| Formulation tentante | Pourquoi elle ne sort pas |
|---|---|
| « Rien ne part sans votre clic » | Faux : l'accusé de réception part seul, au nom de l'artisan. Se démonte au premier test que le prospect fait lui-même. |
| « Mon IA n'envoie rien » (dans la note) | Même faute, en pire : c'est la première phrase envoyée, et l'exception n'y tient pas. |
| « Tout le monde vend l'IA qui répond à la place de l'artisan » | Affirmation de marché non sourcée, sur des tiers, adressée à quelqu'un que personne n'a jamais démarché avec une IA. |
| « Il prépare la réponse **et pose le devis chiffré en brouillon** » | Le devis ne se pose pas tout seul sur le compte que le prospect va créer : c'est un bouton dans la console. |
| « Le mode où ça répond seul existe, il n'est pas coché » | Vrai mais généreux : il est verrouillé à 59 €. Une option payante présentée comme une case à cocher, c'est la surprise qu'on prétend éviter. |
| « Je cherche des avis du métier, **pas des clients** » | Démenti par le message suivant (lien, essai, tarifs). Faux avant même de parler du produit. |
| « Vous l'aurez vu en cinq minutes » | Contredit le refus de chiffrer une durée, dans le même document. |
| « Votre délai réel de première réponse ? Pas l'objectif. Le réel. » | En un-à-un, ça anticipe son mensonge — et ça lui tend la réponse qui l'élimine (« je rappelle dans l'heure »). |
| « Si ça ne vous fait pas rentrer un chantier dans l'année, ça ne vaut pas le coup » | Promesse de résultat déguisée en franchise. Rien ne mesure qu'un chantier ait jamais été gagné via Presti. |
| « Je me rends compte que j'ai oublié le principal » | Oubli mis en scène dans un kit dont l'unique capital est de ne rien mettre en scène ; deux artisans du même bassin qui comparent voient le même « oubli ». |
| « Merci d'avoir accepté » | Ouverture standard des outils d'automatisation, et elle suppose une note que 9 invitations sur 10 n'auront pas. |
| « C'est de l'écrit — votre page et votre boîte mail » (seul) | Laisse croire que l'assistant traite les emails entrants. Il les range. |
| « Prépare la réponse dans votre façon d'écrire » | Il s'inspire d'un ton que l'artisan décrit lui-même en trois lignes. Écart d'attente au premier essai. |
| « Une base de prix pour votre métier » | 8 métiers seulement, 3 à 5 postes chacun. Faux pour 21 des 29 métiers proposés à l'inscription. |
| « Tant que vous n'avez rien saisi, tout vient du marché » | Faux pour un plaquiste, un paysagiste, un serrurier : la table est vide pour eux, il n'y a pas de filet. |
| « Je ne suis pas loin » / « vous intervenez sur La Rochelle » | Affirmation sur le destinataire tirée d'un champ « lieu » à date inconnue. |
| « Personne ne l'a mesuré chez moi » | Bonne intention, mauvais effet : s'entend « personne ne s'en sert ». Reformulé en « je n'ai pas de chiffre de rentabilité à vous donner ». |
| « Zéro artisan abonné », « je n'ai encore aucun client » | Faux : il y a un abonné payant. |
| « TVA non applicable » comme argument d'ouverture | Neutre pour un artisan assujetti, et ça signale surtout la micro-entreprise. À garder pour la réponse prix, quand on la demande. |
| « Répond en moins d'une minute, jour et nuit » (repris de la landing) | La landing n'a pas été corrigée. Cette phrase décrit une configuration payante et volontairement activée. |
| « Les relances partent toutes seules » | Vrai seulement quand l'assistant répond seul. Sur un compte par défaut, il n'y en a aucune. |

---

## 5. La cadence

**Ce que LinkedIn publie vraiment**, et c'est peu : aucun plafond chiffré d'invitations (page a550555 : la restriction dure « typiquement une semaine », aucun nombre, Basic comme Premium) ; trois motifs de restriction (page a551012 : beaucoup d'invitations en peu de temps, invitations ignorées / laissées en attente / signalées comme spam, suspicion d'outil d'automatisation) ; une invitation retirée ne peut pas être renvoyée avant ~3 semaines (a568295) ; la limite d'usage commercial se déclenche sur la **recherche** et la consultation de profils, et ne se lève qu'au 1er du mois (a564226) ; la note est plafonnée à 200 caractères et à 3 notes par mois sur compte gratuit (a563153).

**Ce qui suit est mon jugement, pas une règle LinkedIn.** Compte de deux jours, aucun historique, aucune connexion : le profil de comportement doit ressembler à quelqu'un qui cherche des gens un par un.

- **Jours 1 à 3 : 5 invitations par jour**, étalées, jamais en rafale. **À partir du jour 4, 8 à 10 par jour maximum**, et seulement si le taux d'acceptation ne s'effondre pas.
- **Ne jamais enchaîner une longue session de recherche et les invitations le même jour.** C'est la recherche qui déclenche la limite d'usage commercial, indépendamment des invitations, et elle ne se lève qu'au 1er du mois.
- **Les notes sont une ressource rare : 3 par mois** (à vérifier sur le compteur affiché au moment d'ajouter la note — voir §6). Elles vont aux 3 profils les mieux qualifiés de la semaine. **Tout le reste part sans note** : c'est pour ça que le message après acceptation ne commence pas par « Merci d'avoir accepté » et se comprend seul.
- **Une seule relance**, 5 à 7 jours après l'acceptation, jamais avant, et jamais de deuxième — la phrase « je reviens une fois et après je vous laisse tranquille » est un engagement vérifiable : la tenir fait partie du kit.
- **Nettoyer les invitations sans réponse à ~3 semaines**, en sachant qu'on ne pourra pas réinviter la personne pendant 3 semaines après le retrait, et que le retrait est irréversible.
- **Le tri passe avant le volume.** Une invitation envoyée à un salarié est pire qu'une invitation non envoyée.

**Le signal qui doit faire tout arrêter — n'importe lequel des cinq :**

1. Un bandeau LinkedIn, un « vous avez atteint la limite », un message de restriction, une demande de vérification. On arrête tout pendant une semaine complète, sans exception et sans deuxième compte.
2. Quelqu'un répond « c'est du spam », ou signale le message. Un seul suffit : on arrête la journée, on relit le texte et la liste avant de reprendre.
3. **10 invitations parties, moins de 2 acceptées.** Le problème n'est plus le volume, c'est le ciblage ou le texte. Continuer ne fait qu'empiler des invitations en attente — motif officiel de restriction.
4. Un message atterrit chez un salarié, un recruteur ou un profil hors métier. On arrête, on refait le tri sur le mot de statut avant de renvoyer quoi que ce soit.
5. L'envie d'installer une extension pour aller plus vite. C'est le seul motif où LinkedIn écrit qu'il peut suspendre le compte, et la récidive peut être définitive.

---

## 6. Ce que je ne sais pas

- **3 ou 5 notes par mois.** La page d'aide officielle dit 3 ; plusieurs sources sérieuses disent 5. Le compteur affiché par LinkedIn au moment d'ajouter la note est la seule vérité : à regarder au premier envoi, et à ne jamais citer comme un chiffre officiel devant un artisan.
- **Le rythme d'invitations.** LinkedIn ne publie aucun nombre. Mes 5 puis 8-10 par jour sont un choix prudent, pas une limite connue. Si quelqu'un demande « c'est combien la limite ? », la réponse honnête est « ils ne le disent pas ».
- **Le taux d'acceptation attendu : inconnu.** Je n'ai aucune base pour dire si 2 acceptations sur 10 est bon ou mauvais dans ce métier. Le seuil du §5 est un déclencheur de revue, pas une norme.
- **La mesure est aveugle.** `https://prestiapp.fr/a/linkedindm` est **le même code** que celui du post public du 09/09, et le lien ne compte pas les clics : une inscription venue d'un message privé sera indiscernable d'une inscription venue du post. Ce kit ne pourra pas être jugé sur un chiffre. Poser un second code (`/a/linkedin-dm`) demanderait une migration — je suis en lecture seule, je ne l'ai pas faite.
- **L'adresse par défaut de la page.** Le code renvoie `prestiapp.fr/p/<slug>` **sauf** si un domaine neutre est configuré en variable d'environnement (`lib/urls.ts`, `modeUrl`). Je n'ai pas lu la configuration de production. À vérifier sur un vrai compte avant de répéter l'adresse à un artisan.
- **Le scénario complet n'a pas été exécuté.** J'ai lu le code, je n'ai pas créé de compte de test : l'arithmétique de l'essai (deux messages entrants + un devis = 3 crédits) et l'absence de relance après une validation manuelle sont des lectures, pas des observations.
- **La divergence avec ce qui est déjà publié.** Le bloc Facebook dit « les relances partent toutes seules » ; c'est vrai dans la configuration où l'assistant répond, pas sur un compte par défaut. Je n'ai pas corrigé la page (lecture seule). Un artisan qui lit les deux peut le relever — la réponse est au §2.
- **La landing porte encore « répond en moins d'une minute — jour et nuit »** (`app/page.tsx`). Tant que c'est en ligne, un prospect envoyé sur prestiapp.fr lira une promesse plus large que ce que dit ce kit. Arbitrage à Benj, pas à moi.
- **Le profil LinkedIn n'a pas été vu en vue visiteur.** Le plan dit que le titre « Fondateur chez Presti » est fait et que l'expérience Microsoft est supprimée ; je ne l'ai pas ouvert en navigation privée. **Si le titre est encore « Sans-emploi chez Microsoft », ne rien envoyer** : les trois textes sont écrits à la première personne par un fondateur, et ils se contredisent sous ce titre-là.
- **Ce que voit le client final.** Je peux affirmer d'où part l'email et à quel nom ; je ne sais pas si un client devine qu'un assistant a rédigé. Personne ne l'a mesuré, et c'est écrit tel quel dans la réserve B.