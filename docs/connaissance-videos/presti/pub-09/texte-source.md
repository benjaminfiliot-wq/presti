# Publication n° 09 — « Une seule boîte à relever »

| | |
|---|---|
| **Canal** | LinkedIn (variante A) + Facebook (variante B) |
| **Vidéo** | `publications/pub-09/vertical.mp4` — 22,1 s, 1080 × 1920 |
| **Lien tracké** | `prestiapp.fr/a/linkedin` · `prestiapp.fr/a/facebook` |
| **Angle** | La boîte email branchée : les demandes qui arrivent par mail, par le formulaire du site et par la page de conversation se rangent dans une seule liste, dans les trois formules et dès l’essai. |

## Ce que la fonctionnalité fait, et où c’est écrit dans le code

L’artisan donne son adresse email et son mot de passe. Presti devine les réglages du serveur,
teste la connexion, puis va chercher les nouveaux messages et les range dans la boîte de réception,
à côté des demandes venues de sa page de conversation. Sept fournisseurs sont reconnus d’office
(`lib/canaux.ts:3-11` : Gmail, Outlook, Orange, Free, SFR, La Poste, OVH), et n’importe quelle
autre adresse se branche en saisissant le serveur à la main
(`app/messages/canaux/page.tsx:132`). Le mot de passe est chiffré en AES-256-GCM avant d’entrer en
base et n’est jamais renvoyé par l’API (`app/api/canaux/route.ts:10-11` et `:64`), et la connexion
est testée AVANT l’enregistrement, pour qu’aucun canal fantôme n’échoue en silence
(`app/api/canaux/route.ts:57-59`).

La relève tourne toute seule. Un passage automatique quotidien est déclaré dans `vercel.json`
(`/api/canaux/relever`), et la boîte de réception se relève aussi à l’ouverture, au plus une fois
toutes les trois minutes (`app/plateforme/Conversations.tsx:106-113`). Un bouton
« ↻ Relever maintenant » reste disponible (`app/messages/canaux/page.tsx:116`).

Le tri est écrit dans `lib/releveCanal.ts`. Les expéditeurs automatiques sont écartés par motif
(`:19`, `:23-30`), les messages que l’artisan s’envoie à lui-même aussi (`:25`), et un même mail
n’entre jamais deux fois grâce au Message-ID gardé dans `messages.externe_id` (`:11`, `:70-72`).
La première relève ne remonte pas au-delà de 7 jours (`:53-58`), une passe importe au maximum 40
messages (`:64`), et un contact qui a déjà écrit depuis moins de 30 jours retombe dans son fil au
lieu d’ouvrir une deuxième demande (`:74-79`). Les demandes venues du formulaire de la page
Presti, elles, arrivent qualifiées : urgence et type de chantier, calculés sans coût IA
(`app/api/leads/route.ts:86-88`, `lib/ai.ts:280`), avec le badge « ⚡ Urgent » dans la liste
(`app/plateforme/Conversations.tsx:272`).

La réponse repart du même endroit : si le contact est une adresse email, Presti envoie le message
au nom de l’artisan et dirige la réponse vers son adresse à lui
(`app/api/messages/route.ts:167-177`). Côté formules, `canaux.email` est dans `BASE`
(`lib/plans.ts:40`), donc dans l’Essentiel, le Studio, le Signature et dans l’essai
(`lib/plans.ts:58-61`).

---

## Variante A — LinkedIn

> Presti branche votre boîte email en deux champs : votre adresse, votre mot de passe.
>
> Les réglages, il les devine. Sept fournisseurs sont reconnus d’office, dont Gmail, Orange, Free, La Poste et OVH. La connexion est testée avant l’enregistrement : une boîte qui ne répond pas ne s’enregistre pas en silence. Et le mot de passe est chiffré avant d’entrer en base.
>
> Ensuite la relève tourne sans vous : chaque matin, et à chaque fois que vous ouvrez votre boîte Presti.
>
> Rien n’arrive en vrac. Les expéditeurs automatiques et les newsletters restent dehors. Les messages que vous vous envoyez à vous-même aussi. Un même mail n’entre jamais deux fois. Et la première relève ne remonte pas plus loin que 7 jours : vous ne récupérez pas trois ans d’archives sur le dos.
>
> Un client qui vous a déjà écrit dans les 30 derniers jours retombe dans son fil. Une conversation par personne, pas une fiche par mail.
>
> Les demandes qui passent par votre page Presti arrivent triées : type de chantier deviné, urgence marquée. La chaudière en panne du vendredi soir ne se noie plus entre deux devis de peinture.
>
> Vous répondez depuis Presti. Le client reçoit un mail à votre nom, et sa réponse revient à votre adresse.
>
> La boîte branchée est dans les trois formules, essai compris. L’essai fait 3 crédits, sans carte : prestiapp.fr/a/linkedin
>
> Combien de boîtes différentes relevez-vous encore le soir ?

## Variante B — Facebook

> Le mail, le formulaire du site, la page de conversation : Presti réunit les trois dans une seule liste.
>
> Une demande arrivée par mail devient une conversation dans votre boîte de réception, avec le nom et l’adresse du client déjà remplis. Vous répondez depuis Presti, et le client reçoit un mail à votre nom.
>
> Plus de tournée de boîtes le soir. Un seul endroit à regarder avant de fermer le camion.
>
> C’est dans les trois formules, et déjà dans l’essai. L’essai fait 3 crédits, sans carte bancaire : prestiapp.fr/a/facebook
>
> Vous en relevez combien, des boîtes, en ce moment ?

## Le premier commentaire (à poster soi-même, dans la minute)

> Deux garde-fous que je n’ai pas mis dans le texte : la première relève ne descend jamais plus bas que 7 jours d’ancienneté, et une passe s’arrête à 40 messages. Le jour où vous branchez la boîte, vous ne recevez pas dix ans d’archives d’un coup.
> Avec Gmail ou Outlook, votre mot de passe habituel ne passe pas : il faut créer un « mot de passe d’application » dans les réglages de sécurité du compte. C’est écrit dans l’écran, avant que vous cliquiez.

## Trois réponses type

**« Et WhatsApp, vous le faites ? »**
> Pas aujourd’hui. WhatsApp figure dans la grille cible, il n’est pas construit, et tant que c’est vrai il reste masqué dans l’application. Ce qui marche aujourd’hui, c’est la boîte email, dans les trois formules.

**« Vous lisez mes mails, alors ? »**
> Presti relève votre boîte comme le ferait votre téléphone, avec vos identifiants, chiffrés. Les expéditeurs automatiques et les messages que vous vous envoyez sont écartés avant même d’être rangés. Et vous déconnectez la boîte quand vous voulez : les messages déjà reçus restent chez vous.

**« Ça marche avec mon adresse en @monentreprise.fr ? »**
> Oui. Sept fournisseurs courants sont reconnus tout seuls, et pour les autres il y a une ligne où saisir le serveur. Si la connexion échoue, Presti vous le dit tout de suite au lieu de l’enregistrer quand même.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « Presti branche votre boîte email en deux champs » | `app/api/canaux/route.ts:44-49` — la requête n’exige que `adresse` et `mot_de_passe` ; `app/messages/canaux/page.tsx:132` : « vous n’avez que votre adresse et votre mot de passe à saisir » |
| « Sept fournisseurs sont reconnus d’office, dont Gmail, Orange, Free, La Poste et OVH » | `lib/canaux.ts:3-11` — tableau `FOURNISSEURS` : Gmail, Outlook, Orange, Free, SFR, La Poste, OVH |
| « La connexion est testée avant l’enregistrement » | `app/api/canaux/route.ts:57-59` — `testerImap` avant l’insertion, `400` si l’essai échoue |
| « le mot de passe est chiffré avant d’entrer en base » | `app/api/canaux/route.ts:64` — `secret: chiffrer(motDePasse)` ; `:40-42` refuse d’enregistrer si le chiffrement est indisponible |
| « la relève tourne sans vous : chaque matin » | `vercel.json` — cron `/api/canaux/relever` une fois par jour, à 7 h ; `app/api/canaux/relever/route.ts:17-40` |
| « à chaque fois que vous ouvrez votre boîte Presti » | `app/plateforme/Conversations.tsx:106-113` — relève à l’ouverture, au plus une fois toutes les trois minutes |
| « Les expéditeurs automatiques et les newsletters restent dehors » | `lib/releveCanal.ts:19-20` — motifs `AUTOMATIQUE` et `INDESIRABLE` ; `:23-30` `estUneVraieDemande` |
| « Les messages que vous vous envoyez à vous-même aussi » | `lib/releveCanal.ts:25` — comparaison à l’adresse du canal |
| « Un même mail n’entre jamais deux fois » | `lib/releveCanal.ts:70-72` — Message-ID cherché dans `messages.externe_id` avant insertion |
| « la première relève ne remonte pas plus loin que 7 jours » | `lib/releveCanal.ts:53-58` — `Date.now() - 7 * 24 * 3600 * 1000` |
| « une passe s’arrête à 40 messages » (commentaire) | `lib/releveCanal.ts:64` — `if (importes >= 40) break` |
| « dans les 30 derniers jours retombe dans son fil » | `lib/releveCanal.ts:74-79` — recherche d’un `lead` du même contact de moins de 30 jours |
| « Une demande arrivée par mail devient une conversation… avec le nom et l’adresse du client » | `lib/releveCanal.ts:83-92` — insertion dans `leads` avec `nom_prospect`, `contact`, `canal: 'email'` |
| « Les demandes qui passent par votre page Presti arrivent triées » | `app/api/leads/route.ts:86-88` — `qualifyLead` ; `lib/ai.ts:280` — urgence et type de chantier, déterministes ; `app/plateforme/Conversations.tsx:272` — badge « ⚡ Urgent » |
| « Le client reçoit un mail à votre nom, et sa réponse revient à votre adresse » | `app/api/messages/route.ts:167-177` — `fromName: artisan.nom`, `replyTo: artisan.email` |
| « dans les trois formules, essai compris » | `lib/plans.ts:40` — `canaux.email` dans `BASE` ; `:58-61` — `gratuit`, `essentiel`, `studio`, `signature` reprennent `BASE` |
| « L’essai fait 3 crédits, sans carte » | `lib/plans.ts:58` — `gratuit: creditsMois: 3, prixMois: 0`, accroche « sans carte » |
| « mot de passe d’application » Gmail / Outlook (commentaire) | `app/messages/canaux/page.tsx:139` — l’avertissement affiché dans l’écran de connexion |
| « vous déconnectez la boîte quand vous voulez : les messages déjà reçus restent » | `app/messages/canaux/page.tsx:78` et `app/api/canaux/route.ts:77` — « l’historique des messages reste » |

## Ce qui n’est PAS dans cette publication, et pourquoi

Les deux plans de la vidéo qui annoncent « WhatsApp à partir de 59 € » et « Les réseaux à 99 € »
ne sont pas repris ici, et ils ne devraient pas rester dans le montage : `canauxWhatsapp` et
`canauxReseaux` sont à `false` dans `lib/flags.ts:68` et `:70`, avec le commentaire « vendu dans la
grille cible, pas construit ». `lib/plans.ts:143` retire ces deux lignes de la grille publique tant
que les drapeaux sont baissés, donc un artisan qui suit le lien ne les verra nulle part. Vendre en
publication ce que l’application masque serait précisément la « promesse de vente non tenue » que
l’audit v4 avait relevée. La publication tient donc sur le seul canal livré, l’email, et la réponse
type le dit à voix haute. Deux autres limites restent tues faute de place, et elles sont dans le
commentaire ou dans les réponses : le mot de passe d’application obligatoire chez Gmail et Outlook,
et le fait que les mails importés n’héritent pas du tri urgence / type de chantier, réservé aux
demandes déposées sur la page Presti.
