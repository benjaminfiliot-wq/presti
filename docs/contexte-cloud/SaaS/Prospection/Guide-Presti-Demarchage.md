# Presti, expliqué — guide de démarchage

> 📌 **Pour Louis-Victor et Gabriel.** Écrit le **2026-09-09**, **corrigé le 2026-09-10**, vérifié directement dans le code en production (`lib/plans.ts`, `lib/flags.ts`, `lib/prix/marche.ts`, `app/api/leads/route.ts`, `app/api/cron/relances/route.ts`) — pas depuis les anciennes notes.
> 🛑 **Si vous avez la version du 09/09, jetez-la.** Elle contenait **cinq promesses que le produit ne tient pas**, du genre que l'artisan découvre au premier mois : « rien ne part sans votre clic », les relances vendues comme automatiques dans toutes les formules, « aucun barème imposé » sur les devis, la personnalisation complète en Essentiel, et la relance des factures impayées. Toutes corrigées ci-dessous, avec le détail au **journal des corrections** en fin de guide. Si vous en avez dit une à quelqu'un, rattrapez-le **avant** qu'il paie : c'est le seul moment où ça se répare.
> ⚠️ Il **remplace** [[Objections-reponses]] (périmé : « Réacto », 39 €/mois, promesse SMS inexistante, remise « −50 % à vie » inexistante). [[Brief-Alexandre-Artisans]] et [[Kit-Alexandre]] restent des archives de méthode, pas des documents de vente.
> 🔗 Version consultable sur téléphone : artefact « Presti, expliqué » (galerie Claude).

---

## 1. Presti, c'est quoi

**Presti est l'assistant qui répond à la place de l'artisan quand un client demande un devis — en moins d'une minute, dans son ton — puis chiffre le devis sur ses prix, édite la facture et relance le client tout seul.**

### Le problème qu'il attaque

Un artisan du bâtiment travaille de 7 h à 18 h, les mains prises. Un client lui écrit à 15 h ; il voit le message à 20 h ; entre-temps le client a contacté quatre artisans et signé avec celui qui a répondu le premier. Le chantier n'est pas perdu sur le prix ni sur la qualité : il est perdu sur le **délai de réponse**. C'est ça, et rien d'autre, que Presti règle. Tout le reste du produit vient se greffer là-dessus.

### Ce qu'il n'est pas

Ce n'est **pas un logiciel de devis de plus**. Il en existe des dizaines, et ils aident tous à *écrire* le devis plus vite. Le problème de l'artisan n'est pas d'écrire le devis : c'est de **répondre à temps**. Si on rate cette distinction, l'artisan classe Presti dans la case « encore un logiciel de facturation » et l'oublie. Ce n'est pas non plus un site web : le site est compris, mais ce n'est pas le produit.

### À qui ça s'adresse

Artisan du bâtiment, seul ou avec un ou deux compagnons : plombier, électricien, chauffagiste, maçon, menuisier, peintre, carreleur, couvreur. Plutôt 35-60 ans. Il n'aime pas les logiciels, il en a déjà lâché un au bout de trois semaines. Pas de secrétariat, pas de commercial : le commercial c'est lui, le soir, fatigué.

### Le seul chiffre autorisé

**7 ×** plus de chances d'obtenir un vrai échange avec un client en répondant dans l'heure plutôt qu'en attendant — *Harvard Business Review, « The Short Life of Online Sales Leads », étude sur 2 241 entreprises*. Il est affiché sur la page d'accueil avec sa source. On peut le dire, **avec la source**.

Les autres chiffres des vieilles notes — « 54 % choisissent en moins de 4 h », « 3 à 5 chantiers perdus par mois », « 8 000 €/an » — sont anglo-saxons et **jamais vérifiés en France**. On ne les sort pas.

---

## 2. Le parcours, de la demande à la facture

Si vous ne comprenez qu'une chose du produit, c'est ce déroulé : tout ce qu'un artisan demandera trouve sa réponse dedans.

1. **Avant tout — l'artisan pose son lien Presti.** Compte créé en deux minutes, page de conversation à sa marque. Il colle le lien là où ses clients le trouvent : fiche Google, site, annonces, signature de mail. S'il a un nom de domaine, la page vit dessus — le mot « presti » n'apparaît nulle part côté client.
2. **22 h 14 — un client écrit.** Il décrit son problème avec ses mots. Rien à installer, pas de compte à créer, pas de formulaire : c'est une conversation.
3. **Une minute plus tard — la réponse est prête.** L'IA lit, repère ce qui manque pour chiffrer, pose les deux ou trois questions utiles (surface, urgence, accès) et rédige au nom de l'artisan, dans son ton. **En mode assisté — celui par défaut — elle attend son clic ; en automatique, elle envoie.** Dans les deux cas, le client a reçu tout de suite un accusé de réception au nom de l'artisan : il sait qu'il n'écrit pas dans le vide.
4. **7 h 30, dans le camion — l'artisan reprend la main s'il veut.** Il lit, corrige un mot, ou ne fait rien. Selon sa formule : soit il valide chaque message avant l'envoi, soit Presti a déjà répondu seul pendant la nuit.
5. **7 h 52 — le devis part.** Chiffré sur les tarifs qu'il a rentrés une fois pour toutes, à son en-tête. Il relit, il envoie.
6. **Deux jours plus tard — Presti relance.** Puis à cinq jours, puis à dix, et il s'arrête là. Sans que l'artisan y pense. C'est souvent là qu'il perd le plus d'argent aujourd'hui : le devis est parti, et plus personne n'y revient.
7. **Chantier fait — la facture.** Le devis accepté devient facture, au format électronique de la réforme entrée en vigueur le 2026-09-01. Le client la retrouve dans son espace avec tout l'historique.

---

## 3. Les cinq morceaux du produit

Une question précise vise toujours l'une de ces cinq pièces.

| # | Pièce | Formule | En deux lignes |
|---|---|---|---|
| 1 | **Page de conversation** | Toutes | Le cœur. Page à sa marque où ses clients écrivent et où l'IA répond à sa place. En **Essentiel** : thème et couleur. **Avatar, amorces, polices et fond s'ouvrent à partir de Studio.** Sur **son** nom de domaine, ça oui, dans toutes les formules. |
| 2 | **Devis** | Toutes | **Ses prix passent devant dès qu'il les saisit ; pour le reste, l'IA part d'ordres de grandeur du marché, jamais d'un prix inventé.** Ces ordres de grandeur ne couvrent aujourd'hui que huit métiers, et ils sont affichés comme du marché, pas comme son tarif. Il relit toujours avant d'envoyer. |
| 3 | **Factures + relances** | Toutes | Devis accepté → facture au format électronique obligatoire. Relances J+2, J+5, J+10 sur le client qui ne répond plus, **mais elles ne partent que si l'assistant a répondu lui-même** (voir §4 n° 2 : ce n'est pas le mode par défaut). **Aucune relance de facture impayée** — ça n'existe pas. Comptes clients par lien magique, sans mot de passe. |
| 4 | **Site** | À la demande | Le site : à la demande, 300 € une fois, avec un vrai travail de référencement. Ce n'est pas compris dans l'abonnement. |
| 5 | **Inventaire** | Studio + | Stock par lieu (camion, dépôt, chantier), scan, seuils d'alerte. Recherche IA sur les sites de **ses** fournisseurs : 2 crédits (3 en Expert). |

Derrière ces cinq pièces, l'artisan a une **console** : conversations, devis, factures, réglages, crédits. Il pilote depuis son téléphone comme depuis un ordinateur.

---

## 4. Les six mécanismes à comprendre

1. **L'IA écrit dans le ton de l'artisan.** Il règle sa façon de parler, son métier, ses phrases d'accueil ; l'IA s'appuie là-dessus et sur tout ce qui s'est déjà dit dans la conversation. Deux artisans n'ont pas la même page ni la même écriture.
2. **Trois manières de travailler, et il en change quand il veut.** *Manuel* : il écrit tout. *Assisté* : Presti rédige, il valide d'un clic — **c'est le mode par défaut**. *Automatique* : Presti répond seul, jour et nuit ; il s'ouvre **à partir de Studio**. Dans tous les cas il reprend la main en cours de conversation, puis la rend.
   ⚠️ **La phrase à ne plus dire : « rien ne part sans vous ».** Une chose part seule, même en manuel : **l'accusé de réception**, si le client a laissé un email. Un message court, au nom de l'artisan, qui dit « bien reçu, on revient vers vous ». Ce qu'on a le droit de dire, et qui est vrai : **« aucune réponse au fond ne part sans votre clic — seul l'accusé de réception est automatique. »** C'est même un meilleur argument : le client sait tout de suite qu'il a été entendu.
   ⚠️ **Conséquence sur les relances** : elles ne sont programmées que quand l'assistant a répondu **lui-même**. En assisté — donc par défaut, et toujours en Essentiel — l'artisan répond de sa main, et **aucune relance n'est planifiée**. Ne jamais vendre les relances comme un automatisme qui tourne tout seul en Essentiel.
3. **On paie à la réponse, pas au client.** 1 crédit = 1 génération (une réponse envoyée ou un devis chiffré). Expert = 3 crédits, recherche fournisseur = 2. Rechargés chaque mois, **non reportés**.
4. **Ses prix, son nom, son domaine.** Tarifs siens, marque sienne, nom de domaine perso inclus dans **toutes** les formules. Ses clients ne voient jamais Presti.
5. **Personne chez Presti ne lit ses conversations.** Ce n'est pas une clause, c'est un mécanisme : il faut **son** clic ; la fenêtre dure une heure et se referme seule ; même ouverte on voit la forme et jamais le fond (qu'un devis a sept lignes et un total, jamais le nom de son client) ; chaque consultation est inscrite dans **son** espace ; et il peut poser un verrou définitif « ne plus jamais me demander ».
6. **Rien à installer, sans engagement.** Navigateur + application mobile. Essai gratuit 3 crédits sans carte, sur ses vraies demandes. Il arrête quand il veut ; export de ses données à partir de Studio.

---

## 5. ⛔ Ce que Presti NE fait PAS

*La section la plus importante. Une promesse non tenue coûte plus cher qu'un client non signé : il s'en aperçoit, se fait rembourser, le raconte à trois collègues, et c'est fini dans son département.*

- **Pas de SMS automatique au numéro d'un appel manqué.** N'existe pas. C'est écrit dans l'ancienne fiche d'objections : c'est faux.
- **Presti ne répond pas au téléphone.** Il travaille sur l'écrit : page de conversation et mails.
- **Pas de WhatsApp.** Prévu, pas branché (`canauxWhatsapp: false`). On ne le vend pas, on ne donne pas de date.
- **Pas de publication sur les réseaux sociaux.** Idem (`canauxReseaux: false`).
- **Pas de lecture d'une facture fournisseur en photo.** Pas livré (`inventaireOcr: false`).
- **Aucun accès aux tarifs des grossistes.** Les prix pro sont derrière leurs comptes clients ; aller les chercher serait illégal.
- **Aucune relance de facture impayée.** La relance automatique porte sur le **client qui ne répond plus** (J+2, J+5, J+10). Une facture partie et jamais payée, personne ne la relance à sa place. C'est la promesse la plus facile à faire par erreur, et il s'en apercevra le premier mois.
- **Les relances ne tournent pas toutes seules en Essentiel.** Elles ne sont programmées que quand l'assistant a répondu **de lui-même** — donc en mode automatique, donc à partir de Studio. En Essentiel, l'artisan valide chaque réponse : il n'y a pas de relance derrière. La ligne « relances automatiques » de la grille publique reste vraie de la fonction, pas du mode par défaut ; **la nuance se dit à l'oral, sinon c'est un mensonge par omission.**
- **Pas de personnalisation complète en Essentiel.** Thème et couleur, oui. Avatar, amorces, polices, fond : Studio et au-dessus. Le nom de domaine perso, lui, est bien dans les trois formules.
- **Ce n'est pas un logiciel de comptabilité.** Devis et factures conformes, oui ; remplacer l'expert-comptable, non. Aucun conseil fiscal.
- **Aucune remise « −50 % à vie », aucune liste d'attente.** N'a jamais existé. L'accroche, c'est l'essai gratuit.
- **Aucun client à citer.** On démarre : pas de témoignage, pas de logo, pas de « ils nous font confiance ». Ce qui se dit très bien : « vous seriez parmi les premiers, et vous m'aurez directement au téléphone. »

---

## 6. Les prix

Essai gratuit **3 crédits**, sans carte, sur ses vraies demandes. Puis trois formules, sans engagement. TVA non applicable, art. 293 B du CGI.

| | Essentiel | Studio | Signature |
|---|---|---|---|
| **Par mois** | **29 €** | **59 €** | **99 €** |
| Crédits / mois | 80 | 250 | 600 |
| L'IA répond seule | ❌ il valide | ✅ | ✅ |
| Devis chiffrés, factures, relances | ✅ | ✅ | ✅ |
| ↳ *relances : seulement si l'assistant a répondu seul* | ⚠️ non, il valide | ✅ en auto | ✅ en auto |
| Comptes clients | ✅ | ✅ | ✅ |
| Site web | À la demande (300 €) | À la demande (300 €) | À la demande (300 €) |
| Son nom de domaine | ✅ | ✅ | ✅ |
| Inventaire + recherche fournisseurs | — | ✅ | ✅ |
| Export des données | — | ✅ | ✅ |
| Support prioritaire | — | — | ✅ |

> La phrase qui évite tous les malentendus : **« Vous ne payez pas au client, vous payez à la réponse. »**

---

## 7. Comment l'expliquer

### En vingt secondes

> « Vous, quand un client vous écrit à 19 h alors que vous êtes encore sur le chantier — vous répondez quand, vraiment ? »
>
> *(Il répond. On l'écoute jusqu'au bout : c'est lui qui pose le problème, pas nous.)*
>
> « C'est exactement ce qu'on a réglé. Presti répond à votre place en moins d'une minute, dans votre façon de parler, et il vous sort le devis chiffré sur vos prix à vous. Vous, vous validez depuis le téléphone, entre deux chantiers. »

### En une minute

> « Vous mettez votre lien Presti là où vos clients vous trouvent : votre fiche Google, votre site, vos annonces. Quand quelqu'un écrit, Presti lit la demande, pose les deux ou trois questions qui manquent — la surface, l'étage, le délai — et répond tout de suite, à votre nom.
>
> Quand il a de quoi chiffrer, il fait le devis **sur vos prix**, ceux que vous avez rentrés une fois pour toutes. Vous relisez, vous envoyez. Le client ne répond pas ? Presti relance à votre place. Il accepte ? La facture se génère derrière, au format électronique obligatoire depuis le 1er septembre.
>
> Et vous avez un site à votre nom qui va avec, sur votre propre nom de domaine. »

### La démonstration en trois minutes — c'est elle qui convainc

1. **Ouvrir la page de conversation** (compte de démonstration) sur le téléphone — il voit ce que *son* client verrait.
2. **Lui faire écrire la demande**, avec ses mots : « fuite sous l'évier, appartement au 3e sans ascenseur ».
3. **Se taire et regarder l'heure.** La réponse s'écrit. Ne rien commenter pendant que ça s'affiche.
4. **Montrer le devis chiffré** — « là, ce sont nos prix de démonstration ; le vôtre tournera sur les vôtres ».
5. **Montrer le site dix secondes.** Pas plus.
6. **Fermer** — « On vous branche l'essai ? C'est gratuit, sans carte, et vous jugez sur votre prochaine vraie demande. »

---

## 8. Objections

| Objection | Réponse |
|---|---|
| **« C'est combien ? »** | « Essai gratuit, trois crédits, sans carte. Après, 29, 59 ou 99 € par mois selon le volume, sans engagement. » On donne le prix tout de suite : tourner autour fait croire qu'il est cher. |
| **« 29 €, c'est cher. »** | « Un chantier moyen chez vous, ça pèse combien ? » C'est **son** chiffre qui fait le calcul. On ne dit jamais « vous récupérerez X chantiers » : on n'en sait rien. |
| **« L'IA va raconter n'importe quoi. »** | « Sur la formule d'entrée, **aucune réponse au fond ne part sans votre clic** : elle prépare, vous validez. La seule chose qui part toute seule, c'est un accusé de réception à votre nom — votre client sait qu'il a été entendu, et il attend la vraie réponse de vous. Le jour où vous lui faites confiance, vous passez en automatique — et vous reprenez la main au milieu d'une conversation. » **La meilleure objection qu'on puisse recevoir** : vraie, démontrable, et elle transforme une peur en argument. ⛔ Ne jamais dire « rien ne part sans vous » : c'est faux, et il le verra dans sa boîte d'envoi. |
| **« Mes clients veulent me parler à moi. »** | « Ils vous parlent à vous. Presti écrit dans votre ton — celui que vous avez réglé — et vous reprenez la main quand vous voulez. Ce qu'il remplace, ce ne sont pas vous : ce sont les cinq heures où vous ne pouvez pas répondre parce que vous travaillez. » |
| **« J'ai déjà un site. »** | « Gardez-le. Presti, c'est la réponse, pas la vitrine : vous collez juste votre lien dessus. Et si un jour vous voulez le site aussi, il est compris. » |
| **« Je suis pas informaticien. »** | « Deux minutes pour créer le compte, et je le fais avec vous au téléphone. Rien à installer. » |
| **« Vous lisez mes conversations ? »** | « Non, et ce n'est pas une promesse, c'est un mécanisme » → dérouler le mécanisme n° 5. Objection sérieuse, réponse sérieuse : jamais un « c'est sécurisé » balayé de la main. |
| **« Ça marche pour mon métier ? »** | « Tout le bâtiment : l'IA lit la demande et répond quel que soit le métier. » Puis la nuance qui évite la déception : « Pour le chiffrage, tant que vous n'avez pas rentré vos prix, elle part d'une fourchette de marché — vous la corrigez une fois, et après c'est les vôtres. » **Ne jamais promettre une bibliothèque de prix déjà prête pour son métier :** elle ne couvre aujourd'hui que huit métiers, et ce sont des ordres de grandeur, pas ses tarifs. |
| **« La facture électronique me concerne ? »** | « La réforme est entrée en vigueur le 1er septembre. Presti émet au bon format, compris dans toutes les formules. Pour votre cas précis, voyez avec votre comptable. » Jamais « vous êtes en infraction ». |
| **« Je vais réfléchir. »** | « Bien sûr. On branche l'essai maintenant ? Comme ça vous réfléchissez sur votre prochaine vraie demande, pas dans le vide. » Le seul vrai oui = du **temps**, un **contact** ou de l'**argent**. « Ça a l'air bien » → noter « à relancer », pas « intéressé ». |

---

## 9. Les six règles

1. **Aucun chiffre non sourçable à voix haute.** Un seul autorisé : le 7 × (HBR), avec sa source.
2. **Aucun client inventé.** Pas de témoignage, pas de capture fabriquée, pas d'avis.
3. **Aucune fonction non livrée.** Voir §5. En cas de doute : on ne le dit pas.
4. **On ne se fait passer pour personne.** Ni artisan, ni client de Presti, ni utilisateur de longue date.
5. **On écoute avant de parler.** Une question sur sa dernière demande de devis vaut mieux que trois minutes de présentation.
6. **Quand on ne sait pas, on le dit.** « Je vérifie et je vous réponds ce soir » → demander à Benj → rappeler le soir. Un artisan pardonne un « je ne sais pas », pas un mensonge découvert après avoir payé.

### Les quatre phrases interdites

Elles sonnent bien, elles sont fausses, et elles ont toutes été dites au moins une fois.

| ⛔ Ne dites pas | ✅ Dites |
|---|---|
| « Rien ne part sans vous. » | « Aucune réponse au fond ne part sans votre clic. Seul l'accusé de réception est automatique. » |
| « Les relances tournent toutes seules, dans toutes les formules. » | « Les relances partent quand l'assistant répond lui-même — c'est le mode automatique, à partir de Studio. » |
| « Aucun barème imposé, il n'y a que vos prix. » | « Vos prix passent devant dès que vous les saisissez ; pour le reste, l'IA part d'ordres de grandeur du marché — jamais d'un prix inventé. » |
| « Vous personnalisez tout, dès l'entrée de gamme. » | « Thème et couleur en Essentiel ; avatar, amorces, polices et fond à partir de Studio. Votre nom de domaine, lui, est dans les trois. » |

---

## 10. Lexique

| Terme | Sens | Devant un artisan |
|---|---|---|
| Page de conversation | La page à sa marque où ses clients écrivent | « votre page », « votre lien » |
| Console | Son tableau de bord | « votre espace » |
| Crédit | Une génération (réponse envoyée ou devis chiffré) | tel quel |
| Formules | Essai, Essentiel, Studio, Signature | « formule », jamais « pack » ni « premium » |
| Modes | Manuel / assisté / automatique | tel quel |
| Lien d'apport | `prestiapp.fr/a/<code>` | ⛔ jamais expliqué au prospect |
| Poste de contrôle | L'outil interne de Benj | ⛔ jamais mentionné |

---

## 11. Liens, terrain et remontée

### Chacun son lien

Une inscription n'est attribuée que si le prospect est passé par un lien d'apport : **`prestiapp.fr/a/<code>`**. Le lien pose une empreinte signée puis redirige sur l'accueil — le prospect ne voit aucune différence — et le Poste de contrôle attribue l'inscription au bon canal. **Sans ce lien, l'apport est invisible et ne compte pas.**

- **Louis-Victor** → LinkedIn, contenus et vidéos, prise de contact par le réseau. Code à récupérer auprès de Benj.
- **Gabriel** → Facebook, groupes d'artisans, contact direct et terrain. Code à récupérer auprès de Benj.

### Où sont les artisans

Groupes Facebook (« Artisans du bâtiment », « Auto-entrepreneurs BTP », par métier et par département) — **en aidant d'abord, jamais en postant une publicité** : un lien collé sec finit en exclusion. Puis forums métier (ForumConstruire, Système D), annonces de services Le Bon Coin, LinkedIn pour Louis-Victor. Et le plus efficace, qui n'a rien de numérique : l'artisan qu'on connaît, le chantier au bout de la rue, le plombier du village.

### Ce qu'on remonte après chaque contact

Sept champs, une ligne, à Benj le soir même : **métier · département · canal · sa phrase exacte sur sa douleur · ce qu'il paie déjà · l'objection qui a bloqué · suite (essai / à relancer / non)**.

---

> **Ce guide décrit le produit tel qu'il est en ligne au 2026-09-10.** Avant de promettre quoi que ce soit qui n'y figure pas, demander à Benj. Une fonction livrée depuis rejoint ce guide ; une fonction annoncée mais pas livrée n'y entre pas.

### Journal des corrections

Cinq corrections le **2026-09-10**, chacune vérifiée en ouvrant le fichier cité — pas de mémoire, pas de déduction.

| # | Ce qui était écrit le 09/09 | Ce que le code dit | Où c'est vérifié |
|---|---|---|---|
| 1 | « Sur la formule d'entrée, elle ne peut **rien envoyer sans votre clic** » (§8) | L'accusé de réception « Bien reçu — *nom de l'artisan* » part **seul**, même en mode manuel, dès que le client a laissé un email | `app/api/leads/route.ts:200-210` (`sendEmail` avec `fromName: artisan.nom`), et le même envoi en `app/api/leads/contact/route.ts:76-84` |
| 2 | « Relances automatiques » cochées pour **toutes** les formules (§3, §6) | Elles ne sont planifiées que dans la branche où l'assistant a répondu **lui-même**. Le mode par défaut est `assistee`, et `assistee` sort en `ok: false` avant d'y arriver. En Essentiel l'auto est verrouillé : **jamais de relance planifiée** | `lib/plateformeConfig.ts:45` (défaut `assistee`), `:136` (`ok: false`), `:160` (verrou d'offre) ; `app/api/leads/route.ts:287-307` ; seuls deux points d'insertion existent (`app/api/leads/route.ts:299`, `app/api/leads/contact/route.ts:92`) et les deux exigent `statut === 'repondu'`, posé nulle part ailleurs |
| 3 | « Aucun prix inventé et **aucun barème imposé** » (§3) | Un barème existe bel et bien : des ordres de grandeur du marché servent de repli pour ce que l'artisan n'a pas saisi. Ils sont étiquetés « marché », jamais présentés comme son tarif — et ne couvrent que **8 métiers, 33 libellés** | `lib/prix/marche.ts` (`source: 'marche'`, en-tête du fichier), `supabase/migrations/0002_devis.sql:99-133` |
| 4 | « Couleur, logo, avatar, amorces : c'est sa page » — pour **toutes** les formules (§3) | Essentiel = thème + couleur. Avatar, amorces, polices, fond = **Studio et au-dessus** | `lib/plans.ts:44` (`plateforme.personnalisation_avancee` est dans `STUDIO`, pas dans `BASE`), `lib/plans.ts:126` |
| 5 | « Relances automatiques sur devis **et impayés** » (§3) | Aucune relance de facture impayée n'existe. Les deux seuls crons sont les relances de leads et la relève des canaux ; côté interne, la relance d'un impayé est explicitement une décision à la main | `vercel.json`, `app/api/cron/relances/route.ts`, `app/api/controle/a-faire/route.ts:19` |

> Les corrections **1, 2 et 3** venaient de l'audit de Benj. Les **4 et 5** sont sorties de la vérification des trois autres : quand on ouvre le fichier plutôt que sa mémoire, on trouve toujours un peu plus que ce qu'on cherchait.
