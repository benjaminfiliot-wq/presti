# Publication n° 08 — « Le client se tait. Presti relance trois fois. »

| | |
|---|---|
| **Canal** | Facebook (variante A) · Instagram (variante B) |
| **Vidéo** | publications/pub-08/vertical.mp4 — 19,1 s (somme des plans de `promo-src/hf/publications.mjs`). **À re-rendre, et à re-couper** : le fichier en place est encore l’ancienne publication 08 (site vitrine, 20,3 s mesurées), et les cartons du projet source ouvrent sur « Le devis parti », ce que le code ne tient pas (voir plus bas). |
| **Lien tracké** | prestiapp.fr/a/facebook · prestiapp.fr/a/instagram |
| **Angle** | Les relances automatiques : trois messages partent seuls après votre réponse, quand le client, lui, ne répond plus. |

## Ce que la fonctionnalité fait, et où c’est écrit dans le code

Quand une réponse part au client au nom de l’artisan, Presti pose trois relances dans le calendrier
de la conversation. La cadence du planificateur tient dans une constante, `lib/relances.ts:20` :
`CADENCE_RELANCES = [2, 5, 10]`, soit deux jours, cinq jours, dix jours après cette réponse. Les
trois lignes sont insérées d’un coup par `planifierRelances` (`lib/relances.ts:35-52`), avec leur
rang et leur date d’échéance. (Deux routes plus anciennes, `app/api/leads/route.ts:298` et
`app/api/leads/contact/route.ts:92`, réécrivent encore le même `[2, 5, 10]` à la main : la cadence
est la même, la copie est connue et assumée dans `plans/promesses.md`.)

L’armement ne dépend pas de l’assistant autonome, vendu à partir de Studio. Il dépend du fait qu’une
réponse est partie : `app/api/messages/route.ts:99` (l’artisan valide une proposition) et
`app/api/messages/route.ts:164` (l’artisan écrit lui-même) appellent tous les deux `planifierRelances`.
Ce sont les deux seuls appels du dépôt. C’est le parcours normal d’un compte Essentiel à 29 €, et le
commentaire du code le dit sans détour (`lib/relances.ts:5-13`).

L’envoi passe par la tâche quotidienne `app/api/cron/relances/route.ts`, planifiée chaque matin dans
`vercel.json` (`0 8 * * *`, lu en heure UTC : le message part donc en fin de matinée en France). Le
texte est écrit pour ce chantier-là : `generateRelanceReply` (`lib/ai.ts:647-660`) reçoit le nom de
l’artisan, son métier, son ton, le nom du prospect, sa demande d’origine et le rang. Le rang 1 prend
des nouvelles, le rang 2 propose une étape concrète, le rang 3 annonce qu’il est le dernier. Le
courriel part sous le nom de l’artisan et la réponse du client lui revient directement : `fromName`
et `replyTo` sont les siens (`app/api/cron/relances/route.ts:102-105`).

L’arrêt est aussi automatique que le départ, mais il a des bords qu’il faut connaître. Le cron ne
relance qu’un lead au statut `repondu`, c’est-à-dire un lead où l’artisan a parlé en dernier ; dans
tous les autres cas, la relance due est annulée sur place (`app/api/cron/relances/route.ts:56-60`).
Un client qui répond **sur la page de conversation** passe le lead en `en_discussion` et éteint la
suite (`app/api/conversation/route.ts:152`) ; un devis accepté par le client pose `gagne`
(`app/api/conversation/devis/route.ts:72`) ; et l’artisan peut classer la conversation à la main
depuis son tableau de bord (`app/dashboard/page.tsx:78`), ce qui l’éteint aussi. Côté formules,
`relances` est dans le socle `BASE` (`lib/plans.ts:40`) et la ligne « Relances automatiques » de la
grille est à `true` pour Essentiel, Studio et Signature (`lib/plans.ts:131`).

---

## Variante A — Facebook

> Trois relances partent toutes seules quand un client cesse de répondre : à deux jours, à cinq jours, à dix jours.
>
> Vous avez répondu à la demande. Vous avez donné vos disponibilités, votre façon de travailler, votre prix. Et puis plus rien. Une semaine passe. Vous avez trois autres chantiers en cours, un camion à charger et une réception vendredi. La relance, vous y pensez le dimanche soir, quand la journée est finie.
>
> Presti la fait à votre place. Dès que votre réponse part au client, trois relances se posent. Elles partent le matin, par email, à votre nom, et le client qui répond tombe sur votre adresse à vous.
>
> Chaque message est écrit pour ce chantier-là, à partir de la demande d’origine. Le premier prend des nouvelles. Le deuxième propose une étape concrète : un créneau d’appel, une visite, un devis à finaliser. Le troisième annonce qu’il est le dernier, et laisse la porte ouverte.
>
> Le client vous répond sur votre page Presti, la suite s’annule toute seule. Vous classez la conversation en gagné ou en perdu, elle s’annule aussi. Vous gardez la main sur les deux bouts.
>
> Les relances sont comprises dans les trois formules et dans l’essai gratuit : dès 29 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI. Aucun réglage à activer, aucune date à noter.
>
> Vous en avez combien, des clients qui ne vous ont pas répondu depuis plus de dix jours ?
>
> L’essai se lance sans carte bancaire : prestiapp.fr/a/facebook

## Variante B — Instagram

> Trois relances après votre réponse, puis Presti se tait.
>
> Deux jours, cinq jours, dix jours. Trois messages courts, à votre nom, écrits pour ce chantier précis.
>
> Entre deux chantiers, personne ne rouvre sa boîte pour écrire au client qui n’a pas répondu. C’est ce geste-là que Presti reprend à son compte.
>
> Le client vous répond sur votre page, tout s’arrête. Vous classez la conversation, ça s’arrête aussi. Rien à cocher, aucune date à programmer.
>
> Compris dans les trois formules et dans l’essai gratuit. Vous en avez combien, des clients muets depuis dix jours ?
>
> Le lien pour essayer est dans la bio : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> Une précision qui compte sur un chantier long : le cycle se réarme. Si le client répond, se tait de nouveau, et que vous lui renvoyez un message, trois nouvelles relances se posent.
> La garde du code porte sur les relances en attente, pas sur celles déjà consommées, donc la fonction ne marche pas une seule fois dans la vie de la conversation.

## Trois réponses type

**« J’ai peur que ça harcèle mes clients. »**
> Trois messages au total, à deux jours, cinq jours et dix jours après votre réponse, et le troisième annonce qu’il est le dernier. Le client qui vous répond sur votre page Presti éteint la suite tout seul. S’il vous répond ailleurs, sur votre boîte perso par exemple, classez la conversation en gagné ou en perdu depuis votre tableau de bord et plus rien ne part. Le texte, lui, a l’interdiction d’insister, de culpabiliser ou d’inventer une urgence : c’est écrit dans les règles données au modèle.

**« Ça part avec le nom de Presti dessus ? »**
> L’expéditeur affiché porte votre nom, l’objet est « Suite à votre demande » suivi de votre nom, et la réponse du client arrive sur votre adresse email. L’adresse technique d’envoi reste celle de Presti, comme pour tout logiciel qui écrit à votre place : c’est le seul domaine autorisé à envoyer pour l’instant.

**« Il faut prendre la formule du dessus pour avoir ça ? »**
> Non. Les relances sont dans le socle : Essentiel à 29 €, Studio à 59 €, Signature à 99 €, et l’essai gratuit à trois crédits sans carte. TVA non applicable, art. 293 B.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « à deux jours, à cinq jours, à dix jours » | `lib/relances.ts:20` — `CADENCE_RELANCES = [2, 5, 10]`, comptés depuis l’armement |
| « Trois relances partent toutes seules » | `lib/relances.ts:45-52` — trois lignes insérées, `rang` 1 à 3 |
| « Dès que votre réponse part au client, trois relances se posent » | `app/api/messages/route.ts:99` et `:164` — `planifierRelances` après une validation et après un message écrit à la main ; ce sont les deux seuls appels du dépôt |
| « Elles partent le matin, par email » | `vercel.json` — `/api/cron/relances`, `schedule: "0 8 * * *"` (UTC) ; `app/api/cron/relances/route.ts:86-97` — l’envoi n’a lieu que si le contact est une adresse email |
| « à votre nom, et le client qui répond tombe sur votre adresse à vous » | `app/api/cron/relances/route.ts:102-105` — `subject: Suite à votre demande — {nom}`, `fromName`, `replyTo` |
| « L’adresse technique d’envoi reste celle de Presti » | `lib/email.ts:14` et `:24-27` — `From: {nom de l’artisan} <contact@prestiapp.fr>` |
| « écrit pour ce chantier-là, à partir de la demande d’origine » | `lib/ai.ts:647-653` — nom du prospect et message d’origine passés au modèle |
| « Le premier prend des nouvelles… le troisième annonce qu’il est le dernier » | `lib/ai.ts:656-660` — les trois contextes par rang |
| « interdiction d’insister, de culpabiliser » | `lib/ai.ts:689` — « AUCUNE pression, aucune culpabilisation… aucune fausse urgence » |
| « Le client vous répond sur votre page Presti, la suite s’annule » | `app/api/conversation/route.ts:152` — le message entrant pose `en_discussion` ; `app/api/cron/relances/route.ts:56-60` — hors statut `repondu`, la relance est annulée |
| « Vous classez la conversation en gagné ou en perdu, elle s’annule aussi » | `app/dashboard/page.tsx:78` — l’artisan change le statut ; `app/api/conversation/devis/route.ts:72` — un devis accepté pose `gagne` |
| « comprises dans les trois formules et dans l’essai gratuit : dès 29 € par mois » | `app/api/messages/route.ts:99` et `:164` — la relance est armée par la réponse de l’artisan, sur tout compte, sans capacité réservée ; `lib/plans.ts:58-61` (0 €, 29 €, 59 €, 99 €), `:131` (grille à `true` partout) |
| « le cycle se réarme » | `lib/relances.ts:37-42` — la garde porte sur `envoyee = false` |
| « sans engagement. TVA non applicable, art. 293 B du CGI » | `app/page.tsx:170` — « sans engagement » ; `app/page.tsx:161` — « TVA non applicable, art. 293 B du CGI » |

## Ce qui n’est PAS dans cette publication, et pourquoi

**Le devis ne déclenche rien, et il faut le dire ici plutôt que le laisser croire ailleurs.** La
version précédente de cette publication vendait « trois relances après votre devis ». Le code dit le
contraire, deux fois. D’abord `app/api/devis/[id]/envoyer/route.ts` envoie le PDF au client et pose
`statut: 'envoye'` **sur le devis** sans jamais toucher au lead ni appeler `planifierRelances` :
envoyer un devis n’arme aucune relance. Ensuite, et c’est le pire, chiffrer une conversation dans
Presti met le lead en statut `devis` (`lib/devisAuto.ts:103`, appelé par le bouton « Devis auto », par
l’outil de l’assistant et par les règles) ; or le cron n’envoie qu’aux leads en `repondu` et marque
tout le reste comme consommé (`app/api/cron/relances/route.ts:56-60`). Autrement dit, dans l’état du
code au 10/09, un devis chiffré depuis la conversation **éteint** les relances déjà armées. Tant que
ce n’est pas corrigé, la publication parle de la demande restée sans réponse, jamais du devis — et
les cartons de la vidéo (« Le devis parti », « Puis plus rien ») sont à refaire sur la même base.

**La réponse arrivée par email n’éteint pas la cadence.** Si le client répond sur la page de
conversation, le statut passe à `en_discussion` et tout s’arrête. S’il répond au courriel, la relève
IMAP range bien son message dans le fil mais ne change pas le statut (`lib/releveCanal.ts:70-100`) :
le lead reste `repondu` et la relance suivante part quand même. C’est pour cette raison que le texte
et la réponse type disent « sur votre page Presti » et donnent le geste manuel de secours au lieu de
promettre un arrêt universel. Le correctif produit est court (poser `en_discussion` à l’import d’un
message entrant), il n’est pas encore fait, on ne le vend pas.

**Le relevé par téléphone.** Le cron n’envoie réellement le message que si le contact du prospect
contient un `@` (`app/api/cron/relances/route.ts:86-97`) ; pour un client qui a laissé un numéro, la
relance est bien écrite et déposée dans le fil, mais elle ne part pas toute seule sur son portable.
Promettre « la relance par SMS » serait faux aujourd’hui, et c’est pourquoi le texte écrit « par
email ».

**Le coût en crédits.** La page d’abonnement compte une relance comme une génération IA
(`app/parametres/SectionAbonnement.tsx:98`) alors que la tâche quotidienne n’appelle jamais
`consumeCredit`. Tant que les deux ne racontent pas la même histoire, la publication ne parle pas de
crédits pour les relances : elle dit ce qui est vendu, elle ne chiffre pas ce qui est encore
incertain.
