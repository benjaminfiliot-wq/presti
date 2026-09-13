# Les dix publications — textes, sourçage, calendrier

> **Version 2, du 2026-09-10.** Réécrite après le retour de Benj : « présente ce qu'on fait et les
> différentes fonctionnalités ». **Une publication = une fonctionnalité**, nommée dès la première
> ligne, dans le vocabulaire du métier, et chacune répond à « qu'est-ce que j'y gagne ».
>
> Chaque publication porte : deux variantes, le premier commentaire, trois réponses type, et le
> **sourçage ligne à ligne**. La colonne de preuve n'est pas une formalité : c'est elle qui autorise
> la phrase à être publiée. Une ligne sans preuve ne part pas.
>
> **Benj publie.** Aucun connecteur Facebook, LinkedIn ni Instagram n'est installé, et les trois
> réseaux refusent l'automatisation de la publication (voir `plans/journal-final.md`). Ce fichier
> produit les textes ; le clic est humain.

---

## Ce qui reste vrai de la v1, et qu'on ne réécrit pas

Compté en base le 2026-09-10 : **un abonné payant**, sur Essentiel, sur sept comptes non-test.

⛔ **« Zéro artisan abonné » ne se dit plus.** C'était une accroche qui marchait, c'est maintenant
une phrase fausse. Et on **ne cite pas** cet abonné : ni nom, ni témoignage, ni logo, ni « ils nous
font confiance ». Il a payé un logiciel, il n'a pas signé pour faire de la publicité.

## Ce que la réécriture a corrigé dans le fond, et pas seulement dans le ton

En rouvrant le code pour sourcer chaque phrase, un **second chemin d'envoi de devis** est apparu,
que la v1 ignorait : `lib/reglesServeur.ts:59` fait passer un devis en `envoye` quand une règle
d'automatisation « tout auto » est active. Ce chemin est fermé par défaut et n'existe qu'en formule
Signature — mais la v1 affirmait « aucun devis ne part sans votre clic » **sans cette nuance**.
La v2 la dit. C'est exactement à ça que sert le sourçage ligne à ligne.

---

# Publication n° 01 — « Presti, en vingt secondes »

| | |
|---|---|
| **Canal** | LinkedIn + Facebook |
| **Vidéo** | `publications/pub-01/vertical.mp4` — 20,7 s, 1080 × 1920 |
| **Lien tracké** | `prestiapp.fr/a/linkedin` · `prestiapp.fr/a/facebook` |
| **Angle** | Les cinq étapes du logiciel, de la demande du client à la relance du devis : elles sont dans les trois formules et dans l’essai, et elles rendent à l’artisan le devis du soir. |

## Le mécanisme réel qui la fonde

Presti tient la chaîne complète entre le moment où un client écrit et le moment où la facture est éditée. Cinq étapes, dans cet ordre : le client écrit sur une page de conversation à la marque de l’artisan ou par sa boîte mail branchée dessus, une réponse est préparée à son nom, le devis se chiffre poste par poste sur ses prix, la facture reprend les lignes du devis, la relance part quand le client ne répond plus. Ces cinq étapes reposent sur sept capacités : `plateforme.conversation`, `canaux.email`, `devis.ia`, `devis.prix_artisan`, `factures`, `factures.electronique` et `relances`. Toutes sont dans le socle `BASE` (`lib/plans.ts:36-41`). L’essai reprend ce socle tel quel avec trois crédits (`lib/plans.ts:58`), l’Essentiel avec quatre-vingts (`lib/plans.ts:59`). Aucune des cinq étapes ne démarre à 59 € ou à 99 €.

Ce qui garde la main de l’artisan, et qui autorise la publication à dire « vous relisez, vous envoyez ». Le réglage du devis automatique n’admet que trois valeurs, `'jamais' | 'brouillon' | 'seuil'` (`lib/plateformeConfig.ts:21`), et aucune des trois n’envoie ; la création automatique pose `statut: 'brouillon'` (`lib/devisAuto.ts:82`). Le chemin normal vers `'envoye'` est `app/api/devis/[id]/envoyer/route.ts:71`, et il exige l’utilisateur connecté (`uid`, ligne 21) plus la correspondance `artisan_id`.

Il existe un second écrivain de `'envoye'`, et la publication doit le nommer au lieu de l’ignorer : `lib/reglesServeur.ts:59`, quand une règle d’automatisation « tout auto » est active (`lib/reglesServeur.ts:53`). Ce chemin est fermé par défaut, puisque `regleDe` rend `null` tant que l’artisan n’a écrit aucune règle (`lib/reglesServeur.ts:16`), et il est verrouillé sur `plateforme.regles`, capacité qui n’existe que dans Signature (`lib/plans.ts:51`, contrôle serveur en `lib/reglesServeur.ts:33`). Sur l’essai, sur l’Essentiel et sur le Studio, aucun devis ne part sans un clic de l’artisan. C’est cette phrase-là qui est vraie, et c’est elle qui est écrite dans le post.

Le mail qui porte le devis sort en marque blanche : `fromName: artisan?.nom` et `replyTo: artisan?.email` (`app/api/devis/[id]/envoyer/route.ts:65-66`), avec le PDF en pièce jointe (ligne 67). La facture, elle, ne se ressaisit pas : quand on lui passe un `devis_id` (`app/api/factures/route.ts:17`), `creerFacture` relit les lignes du devis dans leur ordre d’origine (`lib/factureDepuisDevis.ts:34-36`). Et la relance due part par le cron de relances, signée du nom de l’artisan et de personne d’autre (`app/api/cron/relances/route.ts:102-105`).

Les prix cités viennent de la même matrice : Essai 3 crédits / 0 €, Essentiel 80 / 29 €, Studio 250 / 59 €, Signature 600 / 99 € (`lib/plans.ts:58-61`). La mention de TVA est celle de la landing (`app/page.tsx:161`), le « sans engagement » aussi (`app/page.tsx:170`).

---

## Variante A — LinkedIn

> Cinq étapes entre le message d’un client et sa facture. Presti les tient toutes.
>
> 1. Le client écrit. Sur votre page de conversation, à votre marque, ou par votre boîte mail branchée dessus. Il est 19 h, vous êtes encore sur le chantier.
>
> 2. La réponse est prête. Presti a lu la demande, la réponse parle en votre nom, vous la validez d’un pouce. À partir de la formule Studio, 59 €, elle peut aussi partir seule pendant que vous chargez le camion.
>
> 3. Le devis se chiffre. Poste par poste : main-d’œuvre, fournitures, quantités, TVA. Sur vos prix à vous.
>
> 4. Vous relisez, vous envoyez. Le devis vous attend en brouillon tant que vous n’avez pas cliqué. Le PDF part à votre nom, votre adresse en réponse.
>
> 5. La facture reprend le devis. Les mêmes postes, dans le même ordre, sans une ligne à retaper. Et quand le client ne répond plus après votre réponse, la relance part sans que vous y pensiez.
>
> Tout au même endroit. Un seul outil à ouvrir le soir, rien d’autre à maintenir.
>
> Ces cinq étapes sont dans les trois formules et dans l’essai : Essentiel 29 €, Studio 59 €, Signature 99 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI. L’essai donne trois crédits et ne demande pas de carte bancaire.
>
> Le devis du soir, le samedi de paperasse : vous les récupérez. Vous en êtes où, vous, de la paperasse du soir ?
>
> L’essai se lance depuis la page d’accueil : prestiapp.fr/a/linkedin

## Variante B — Facebook

> Cinq étapes au même endroit : la demande, la réponse, le devis, la facture, la relance.
>
> Le client écrit sur votre page, à votre marque. Presti lit la demande et prépare la réponse en votre nom.
>
> Le devis se chiffre poste par poste : main-d’œuvre et fournitures, quantités et TVA, sur vos prix. Il vous attend en brouillon. Vous relisez, vous envoyez.
>
> La facture reprend ensuite les postes du devis, sans rien retaper.
>
> Et quand votre réponse au client reste sans suite, la relance part toute seule, à votre nom.
>
> Vous en avez combien, d’outils différents pour faire tout ça ?
>
> Tout est compris dans les trois formules et dans l’essai. Trois crédits, sans carte bancaire : prestiapp.fr/a/facebook

## Le premier commentaire (à poster soi-même, dans la minute)

> Le devis part par mail avec le PDF en pièce jointe, et c’est votre nom qui s’affiche comme expéditeur, votre adresse qui reçoit la réponse. Sur ce mail, le client ne voit pas le mot Presti.
> Le brouillon, lui, ne bouge pas tout seul : le réglage du devis automatique a trois positions, jamais, brouillon ou seuil, et aucune des trois n’envoie. Un envoi sans clic existe dans le logiciel, mais il faut avoir écrit soi-même la règle d’automatisation qui le demande, et cette règle ne s’exécute qu’à partir de la formule Signature.

## Trois réponses type

**« Ça va envoyer des devis à ma place, et je vais me retrouver engagé sur un prix. »**
> Non. Le réglage qui commande le devis automatique a trois positions et aucune n’envoie : le devis reste en brouillon. Le passage à « envoyé » demande que vous soyez connecté et vérifie que le devis est bien le vôtre. Un envoi sans clic existe, mais il faut avoir écrit soi-même la règle d’automatisation qui le demande, et cette règle ne s’exécute qu’à partir de Signature. Sur l’essai, sur l’Essentiel et sur le Studio, aucun devis ne part sans vous. Le prix qui part est celui que vous avez relu.

**« Je ne suis pas à l’aise avec l’informatique. »**
> Presti s’ouvre comme un site, dans le navigateur du téléphone au chantier ou sur l’ordinateur du dépôt. Vous lisez la réponse préparée, vous corrigez un prix si besoin, vous appuyez sur envoyer. Ce que vous ne validez pas reste en brouillon et vous attend.

**« Combien ça coûte, et qu’est-ce qui est vraiment compris ? »**
> Essentiel 29 €, Studio 59 €, Signature 99 € par mois, sans engagement, TVA non applicable au titre de l’article 293 B. Les cinq étapes du message sont dans les trois formules. L’essai a le même socle que l’Essentiel, avec trois crédits au lieu de quatre-vingts, et sans carte bancaire. Ce qui démarre plus haut, c’est le stock par lieu et la recherche chez vos fournisseurs, à 59 €.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « Le client écrit. Sur votre page de conversation, à votre marque » | `lib/plans.ts:37` — `plateforme.conversation` est dans `BASE` ; `lib/plans.ts:119` — « Page de conversation à votre marque » : `true` pour les trois offres |
| « ou par votre boîte mail branchée dessus » | `lib/plans.ts:40` — `canaux.email` est dans `BASE` ; `lib/plans.ts:134` — « Votre boîte email branchée » : `true` pour les trois |
| « La réponse est prête […] vous la validez d’un pouce » | `lib/plans.ts:121` — cellule Essentiel : « Standard · vous validez chaque réponse » |
| « À partir de la formule Studio, 59 €, elle peut aussi partir seule » | `lib/plans.ts:44` — `plateforme.ia.auto` est dans `STUDIO` ; `lib/plans.ts:60` — `studio` : `prixMois: 59` ; `lib/plans.ts:122` — « répond seul ou vous validez » |
| « Le devis se chiffre […] Sur vos prix à vous » | `lib/plans.ts:39` — `devis.ia` et `devis.prix_artisan` dans `BASE` ; `lib/plans.ts:129` — « Devis chiffrés par l’IA, sur vos prix » |
| « Le devis vous attend en brouillon tant que vous n’avez pas cliqué » | `lib/plateformeConfig.ts:21` — `devis_auto: 'jamais' \| 'brouillon' \| 'seuil'`, aucune valeur n’envoie ; `lib/devisAuto.ts:82` — `statut: 'brouillon'` |
| « Vous relisez, vous envoyez » | `app/api/devis/[id]/envoyer/route.ts:71` — passage à `statut: 'envoye'`, filtré sur `artisan_id: uid` (ligne 21). L’autre écrivain de `'envoye'` est `lib/reglesServeur.ts:59` : fermé par défaut (`:16`, aucune règle) et refusé hors `plateforme.regles`, donc hors Signature (`:33`, `lib/plans.ts:51`) |
| « Un envoi sans clic […] qu’à partir de Signature » | `lib/reglesServeur.ts:53` — `d.envoyerSansValidation` ; `lib/reglesServeur.ts:33` — verrou `peut(plan, 'plateforme.regles')` ; `lib/plans.ts:51` — `plateforme.regles` seulement dans `SIGNATURE` |
| « Le PDF part à votre nom, votre adresse en réponse » | `app/api/devis/[id]/envoyer/route.ts:65-67` — `fromName: artisan?.nom`, `replyTo: artisan?.email`, PDF en `attachments` |
| « La facture reprend le devis […] dans le même ordre » | `app/api/factures/route.ts:17` — entrée `devis_id` ; `lib/factureDepuisDevis.ts:34-36` — lignes du devis relues `.order('ordre')` |
| « la relance part sans que vous y pensiez […] à votre nom » | `app/api/messages/route.ts:99` et `:164` — la relance est armée par la réponse de l’artisan (proposition validée, ou message écrit à la main) ; `app/api/cron/relances/route.ts:102-105` — sujet, `fromName` et `replyTo` pris sur l’artisan ; sans nom d’artisan, le sujet ne porte aucune marque |
| « Ces cinq étapes sont dans les trois formules et dans l’essai » | `lib/plans.ts:36-41` — le socle `BASE` ; `lib/plans.ts:58` — l’essai a `capacites: BASE` |
| « Essentiel 29 €, Studio 59 €, Signature 99 € […] trois crédits » | `lib/plans.ts:58-61` — `0/3`, `29/80`, `59/250`, `99/600` |
| « sans engagement. TVA non applicable, art. 293 B » | `app/page.tsx:161` — « TVA non applicable, art. 293 B du CGI » ; `app/page.tsx:170` — « sans engagement » |
| « le stock par lieu et la recherche chez vos fournisseurs, à 59 € » | `lib/plans.ts:46` — `inventaire.stock` et `inventaire.recherche_ia` dans `STUDIO` ; `lib/plans.ts:132-133` — `false` pour Essentiel |

## Ce qui n’est PAS dans cette publication, et pourquoi

La publication ne montre que le socle, et elle le dit deux fois. Le stock par atelier et camion, la recherche de référence chez vos fournisseurs, WhatsApp branché sur la même boîte : tout cela commence à 59 € (`lib/plans.ts:42-48`), et les réseaux sociaux à 99 € (`lib/plans.ts:53`). Les faire figurer dans un message qui promet « dans les trois formules » serait une promesse de vente non tenue, exactement ce que la matrice `lib/plans.ts` existe pour empêcher.

Deuxième chose écartée : tout ce qui dépend des règles d’automatisation. La facture d’acompte créée toute seule à l’acceptation du devis, le code sait la produire (`lib/factureDepuisDevis.ts:2`), et le devis qui part sans clic existe aussi (`lib/reglesServeur.ts:59`) — mais les deux passent par `plateforme.regles`, qui n’est que dans Signature (`lib/plans.ts:51`), et le réglage `facture_auto` vaut `'jamais'` par défaut (`lib/plateformeConfig.ts:52`). La publication écrit donc « la facture reprend le devis », jamais « la facture se crée seule », et elle nomme la règle d’envoi dans le commentaire et dans la réponse type plutôt que de laisser croire qu’elle n’existe pas. Une objection à laquelle on répond faux revient au double.

Enfin, aucun avis client, aucun nom d’entreprise, aucun logo : il n’y a pas de clientèle à citer, et l’artisan qui paie a payé un logiciel, pas une place dans une publicité.

---

# Publication n° 02 — « Le premier qui répond emporte le chantier »

| | |
|---|---|
| **Canal** | LinkedIn |
| **Vidéo** | publications/pub-02/vertical.mp4 — 19,1 s |
| **Lien tracké** | prestiapp.fr/a/linkedin |
| **Angle** | La réponse au client est déjà rédigée quand vous rouvrez le téléphone : vous validez d’un pouce, ou vous la laissez partir seule à partir de 59 €. |

## Ce que la fonctionnalité fait, et où c'est écrit dans le code

Un client décrit son chantier sur votre page de conversation. L’assistant lit le message et rédige
la réponse : la prestation demandée, le délai, la question qui manque pour chiffrer. La page de
conversation est la capacité `plateforme.conversation`, posée dans le socle `BASE`
(`lib/plans.ts:37`), donc présente dans les trois formules et dans l’essai. La demande peut aussi
entrer par votre boîte mail branchée sur le compte : `canaux.email`, socle également
(`lib/plans.ts:40`, et ligne « Votre boîte email branchée » à `true` pour les trois offres,
`lib/plans.ts:134`).

Trois modes de réponse existent : `ModeReponse = 'auto' | 'assistee' | 'manuelle'`
(`lib/plateformeConfig.ts:13`). En mode assisté, l’assistant ne se tait pas et n’envoie pas non
plus : `decisionReponse` renvoie `comportement: 'preparer'` (`lib/plateformeConfig.ts:184`), un mot
que le commentaire de la fonction traduit en clair par « il rédige une proposition que l’artisan
validera » (`lib/plateformeConfig.ts:170`). Voilà pourquoi la vidéo dit « prête » et jamais
« envoyée ».

Le mode autonome, lui, se vend à partir de Studio. La capacité `plateforme.ia.auto` est dans la
liste `STUDIO` (`lib/plans.ts:44`), et Studio vaut 59 € par mois (`lib/plans.ts:60`). Le verrou est
tenu par le serveur, pas par l’affichage : `modeEffectif` ramène en mode assisté tout compte qui
coche « auto » sans avoir la capacité, avec le motif `verrou_offre` (`lib/plateformeConfig.ts:160`).
La grille publique dit la même chose : Essentiel « Standard · vous validez chaque réponse », Studio
« Standard + Pro · répond seul ou vous validez » (`lib/plans.ts:121-122`).

Dernier détail, et c’est celui qui rassure les artisans méfiants : si l’artisan prend la main sur un
fil, l’assistant se tait sur ce fil. `if (lead.prise_en_main) return { ok: false, raison: 'humain',
comportement: 'silence' }` (`lib/plateformeConfig.ts:180`).

---

## Variante A — LinkedIn

> 22 h 40. Une demande de devis tombe sur votre page, et la réponse est déjà rédigée.
>
> Voilà ce que fait Presti à cette minute. L’assistant lit le message : la nature du chantier, l’adresse, le délai. Puis il écrit une réponse qui parle de ce chantier-là, avec la prestation demandée et la question qui manque pour chiffrer.
>
> Vous, vous avez posé les outils à 19 h. Demain, cinq heures de chantier.
>
> Vous ouvrez le téléphone, vous relisez trois lignes, vous validez d’un pouce. La réponse part au nom de votre entreprise, le soir même, pendant que le client compare encore.
>
> À partir de la formule Studio, à 59 €, vous pouvez la laisser partir seule. En dessous, chaque message passe par votre pouce, et le serveur le tient : un compte à 29 € qui coche « répond seul » repasse en mode assisté. Le curseur, c’est vous qui le réglez.
>
> Essentiel 29 €, Studio 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.
>
> Ce que ça vous rend. La réponse du soir qui ne s’écrit plus à 23 h. La demande du samedi matin qui ne dort plus jusqu’au lundi. Une seule boîte à relever, la vôtre, dans toutes les formules, essai compris.
>
> Dans le bâtiment, le premier qui répond emporte le chantier. Le reste du temps, vous êtes sur le toit ou au dépôt, et c’est là que vous devez être.
>
> Vos demandes du soir, vous y répondez le soir même, ou vous les gardez pour le samedi ?
>
> Trois crédits pour l’essayer sur vos vraies demandes, sans carte bancaire.
>
> L’essai est gratuit : prestiapp.fr/a/linkedin

## Variante B — LinkedIn, version courte

> Deux façons de répondre à un client, et vous choisissez laquelle.
>
> Un chantier se décrit sur votre page. L’assistant lit la demande et rédige la réponse : la prestation, le délai, la question qui manque pour chiffrer.
>
> Première façon : vous relisez, vous validez d’un pouce, elle part à votre nom. Deuxième façon, à partir de 59 € : elle part seule, et vous la retrouvez dans le fil. C’est la formule Studio : 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.
>
> Dans les deux cas, tout tombe au même endroit : la boîte que vous relevez déjà. Rien à installer, rien de plus à suivre entre deux chantiers.
>
> Combien de demandes vous sont passées sous le nez ce mois-ci ?
>
> Trois crédits pour le voir sur vos demandes, sans carte.
>
> L’essai est gratuit : prestiapp.fr/a/linkedin

## Le premier commentaire (à poster soi-même, dans la minute)

> Le réglage qui autorise la réponse autonome s’appelle `plateforme.ia.auto` et il vit dans la liste STUDIO de `lib/plans.ts`. En Essentiel, à 29 €, il n’y figure pas, et le serveur le revérifie à chaque message au lieu de faire confiance à la case cochée.
>
> Un détail que le post ne dit pas : sur un fil où vous prenez la main, l’assistant se tait complètement. Vous reprenez la conversation vous-même, et il ne repasse pas derrière vous.
>
> L’essai est gratuit, trois crédits, sans carte : prestiapp.fr/a/linkedin

## Trois réponses type

**« Je ne veux pas qu’une machine réponde à ma place. »**
> Alors restez en Essentiel, à 29 € : la réponse autonome n’y existe pas. L’assistant prépare, vous relisez, vous envoyez. Et sur un fil où vous prenez la main, il se tait complètement.

**« Mes clients appellent, ils n’écrivent pas. »**
> Beaucoup appellent pendant que vous êtes en hauteur ou dans un vide sanitaire, puis raccrochent sans laisser de message. La page de conversation et votre boîte mail leur laissent un endroit où écrire, et vous retrouvez le message le soir, quand vous redescendez. Les deux sont dans toutes les formules, essai compris.

**« Elle va inventer un prix devant mon client ? »**
> Non. On parle ici de la réponse au message, du premier échange. Le chiffrage du devis se pose à part, poste par poste, sur vos prix à vous, et il vous attend en brouillon dans votre espace.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c'est vrai dans le code |
|---|---|
| « L’assistant lit le message » | `lib/plans.ts:37` — `plateforme.conversation` est dans le socle `BASE`, donc dans les trois formules et dans l’essai |
| « la réponse est déjà rédigée », « L’assistant prépare, vous relisez, vous envoyez » | `lib/plateformeConfig.ts:184` — en mode assisté, `decisionReponse` renvoie `comportement: 'preparer'` ; le commentaire de la fonction (`lib/plateformeConfig.ts:170`) le traduit : il rédige une proposition que l’artisan validera |
| « À partir de la formule Studio, à 59 €, vous pouvez la laisser partir seule » | `lib/plans.ts:44` — `plateforme.ia.auto` est dans `STUDIO` ; `lib/plans.ts:60` — Studio, 250 crédits, 59 € par mois |
| « un compte à 29 € qui coche “répond seul” repasse en mode assisté » | `lib/plateformeConfig.ts:160` — `modeEffectif` renvoie `{ mode: 'assistee', motif: 'verrou_offre' }` quand la capacité manque ; `lib/plans.ts:59` — Essentiel, 80 crédits, 29 € |
| « Deux façons de répondre », « vous validez d’un pouce » ou « elle part seule » | `lib/plateformeConfig.ts:13` — `ModeReponse = 'auto' \| 'assistee' \| 'manuelle'` ; `lib/plans.ts:121-122` — grille publique : Essentiel « vous validez chaque réponse », Studio « répond seul ou vous validez » |
| « Une seule boîte à relever, la vôtre, dans toutes les formules » | `lib/plans.ts:40` — `canaux.email` est dans `BASE` ; `lib/plans.ts:134` — ligne « Votre boîte email branchée » à `true` pour Essentiel, Studio et Signature |
| « sur un fil où vous prenez la main, il se tait complètement » | `lib/plateformeConfig.ts:180` — `if (lead.prise_en_main) return { ok: false, raison: 'humain', comportement: 'silence' }` |
| « Trois crédits pour l’essayer sur vos vraies demandes, sans carte » | `lib/plans.ts:58` — Essai : 3 crédits, 0 €, capacités `BASE`, accroche « Pour juger sur vos vraies demandes, sans carte. » |
| « il vous attend en brouillon dans votre espace » (réponse type) | `lib/devisAuto.ts:82` — l’insertion pose `statut: 'brouillon'` ; `lib/plateformeConfig.ts:21` — `devis_auto: 'jamais' \| 'brouillon' \| 'seuil'`, aucune valeur n’envoie |
| « par mois, sans engagement. TVA non applicable, art. 293 B du CGI » | `app/page.tsx:170` — « sans engagement » ; `app/page.tsx:161` — « TVA non applicable, art. 293 B du CGI » |

## Ce qui n'est PAS dans cette publication, et pourquoi

La publication ne dit pas en combien de secondes la réponse est rédigée : ce chiffre dépendrait du
modèle et de la longueur de la demande, et aucune mesure n’a été faite. Elle ne promet pas non plus
WhatsApp, qui démarre à Studio, ni les réseaux sociaux, qui démarrent à Signature : c’est le sujet
de la publication n° 09. Elle passe aussi sous silence les garde-fous qui font taire l’assistant
(pause du compte, plafond de messages, mot d’escalade), parce que les nommer tous en dix lignes
brouillerait le message et qu’ils méritent leur propre publication. Enfin, aucun artisan n’est cité
et aucun avis n’est montré : la clientèle est trop jeune pour qu’une preuve sociale soit autre chose
qu’un mensonge. Le seul argument utilisé ici est une propriété du code que n’importe qui peut aller
relire.

---

# Publication n° 03 — « Le chantier se chiffre pendant que vous roulez »

| | |
|---|---|
| **Canal** | LinkedIn + Facebook |
| **Vidéo** | publications/pub-03/vertical.mp4 · 19,3 s |
| **Lien tracké** | prestiapp.fr/a/linkedin (variante A) · prestiapp.fr/a/facebook (variante B) |
| **Angle** | Le devis chiffré par l’IA sur les prix de l’artisan : le chantier se décompose en postes, la TVA se pose ligne par ligne, le devis s’arrête en brouillon. L’artisan récupère sa soirée et garde la main sur l’envoi. |

## Le mécanisme réel qui la fonde

L’artisan décrit son chantier en langage courant, et Presti lui rend les lignes d’un devis. Le cadrage du moteur est dans `lib/ai.ts:916` : « Tu es un métreur-chiffreur expert pour un(e) [métier] en France. » La décomposition attendue est écrite juste après, `lib/ai.ts:919` : séparer la fourniture et la pose, isoler la main-d’œuvre, ajouter la dépose et l’évacuation, la mise en service. Chaque ligne produite porte cinq champs, `lib/ai.ts:920` : `designation`, `quantite`, `unite` (u, ml, m², m³, h, j, forfait), `prix_unitaire_ht`, `tva_taux` ; le format JSON exigé en `:934` y ajoute `source_prix`. Le nombre de postes est borné en `lib/ai.ts:931` : « 3 à 12 lignes selon l’ampleur. » La TVA n’est jamais globale : `lib/ai.ts:928` impose la règle française ligne par ligne, 10 % en rénovation d’un logement de plus de deux ans, 5,5 % en rénovation énergétique, 20 % dans le neuf ou en cas de doute. Le régime de l’artisan tranche ensuite, côté serveur : `lib/lignes.ts:27` écrit `tva_taux: franchise ? 0 : (TVA_OK.includes(tv) ? tv : 20)`. Un artisan en franchise en base voit donc zéro sur toutes ses lignes, et la publication le dit.

Les prix viennent d’abord de l’artisan. `lib/prix/index.ts:25-41` construit le catalogue en mettant ses propres tarifs devant, puis complète avec les ordres de grandeur du marché uniquement pour les postes qu’il n’a pas encore saisis. `lib/ai.ts:904` passe ce bloc au modèle sous l’intitulé « SES PROPRES TARIFS (prix réels, négociés — À PRIVILÉGIER dès qu’un poste correspond) », et `lib/ai.ts:908` marque l’autre bloc « ce ne sont PAS les prix de cet artisan ». Le tarif fournisseur s’importe en CSV : `lib/prix/csv.ts:1-8` décrit un lecteur volontairement tolérant (points-virgules, virgules décimales, colonnes « Libellé » ou « ARTICLE », prix écrits « 12,50 € »).

Chaque ligne dit d’où vient son prix. `lib/ai.ts:923-927` est une règle absolue du prompt : `source_prix` recopie la provenance du catalogue de l’artisan, ou vaut exactement « ordre de grandeur du marché », ou « estimation ». Le libellé affiché est fabriqué en `lib/prix/types.ts:45-52` : « vos tarifs · nom du fournisseur · date ». Et `lib/ai.ts:970` repasse la valeur par `sourceLigneValide` : toute provenance inattendue retombe sur « estimation ».

Puis le devis s’arrête. `lib/devisAuto.ts:82` insère la ligne avec `statut: 'brouillon', validite_jours: 90, remise_pct: 0, acompte_pct: 30`, et le numéro vient du compteur de l’artisan (`next_numero`, format `DEV-2026-0001`). Le réglage d’automatisation `devis_auto` n’a que trois valeurs, `lib/plateformeConfig.ts:21` : `'jamais' | 'brouillon' | 'seuil'`. Aucune des trois n’envoie au client. Côté formules, `devis.ia` et `devis.prix_artisan` sont dans `BASE` (`lib/plans.ts:39`, socle défini en `:36-41`), et `BASE` est la liste de capacités des quatre offres, essai compris (`lib/plans.ts:58-61`). La grille publique le confirme : « Devis chiffrés par l’IA, sur vos prix » est à `true` pour Essentiel, Studio et Signature (`lib/plans.ts:129`).

---

## Variante A — LinkedIn

> Vous décrivez le chantier. Presti le découpe en 3 à 12 postes, chiffrés sur vos prix à vous.
>
> La dépose de l’existant. La fourniture. La pose. La main-d’œuvre à l’heure, le linéaire au mètre, la surface au mètre carré. Chaque poste porte sa quantité, son unité, son prix unitaire HT et son taux de TVA. La TVA se pose ligne par ligne : 10 % en rénovation, 5,5 % sur la rénovation énergétique, 20 % sur le neuf. Et zéro sur tout le devis si vous êtes en franchise en base.
>
> Les prix, ce sont les vôtres. Vous importez le tarif de votre fournisseur une fois, et vos lignes passent devant tout le reste. Chaque poste affiche d’où vient son prix : vos tarifs, le nom du fournisseur, la date. Pour un poste que vous n’avez pas encore rentré, Presti prend un ordre de grandeur du marché et l’écrit sur la ligne. Vous savez toujours ce que vous relisez.
>
> Puis il s’arrête. Le devis vous attend en brouillon, avec votre numéro à la suite, une validité de 90 jours et un acompte de 30 %. Rien ne part au client tant que vous n’avez pas appuyé. Vous corrigez une quantité dans le camion, vous ajoutez une fourniture oubliée au dépôt, vous envoyez le soir, une fois relu.
>
> Le samedi de paperasse, il sert à autre chose.
>
> Et vous, votre dernier devis, vous l’avez chiffré à quelle heure ?
>
> L’essai ouvre trois crédits, sans carte bancaire : prestiapp.fr/a/linkedin

## Variante B — Facebook

> Le devis se chiffre, puis il s’arrête : il vous attend en brouillon, acompte à 30 %, validité 90 jours.
>
> Vous décrivez le chantier avec vos mots. Les postes se posent : dépose, fourniture, pose, main-d’œuvre. Les quantités, les unités, le bon taux de TVA sur chaque ligne. Et le total en bas.
>
> Rien ne part au client avant vous. Vous relisez sur le téléphone entre deux chantiers, vous changez un mètre carré, vous ajoutez une fourniture oubliée au dépôt. Vous envoyez quand c’est juste.
>
> Votre nom, votre prix, votre clic.
>
> Et chez vous, le devis, c’est plutôt le soir ou le dimanche ?
>
> Le chiffrage est compris dans les trois formules, et dans l’essai sans carte : prestiapp.fr/a/facebook

## Le premier commentaire (à poster soi-même, dans la minute)

> La précision que le post n’a pas donnée : chaque ligne affiche sa provenance en clair. « vos tarifs · nom du fournisseur · date » quand le poste sort de votre catalogue, « ordre de grandeur du marché » quand il sort de la moyenne, « estimation » sinon.
> Vous voyez donc tout de suite les lignes à retoucher avant d’envoyer, au lieu de relire tout le devis.

## Trois réponses type

**« Une IA va me sortir des prix au hasard. »**
> Vos tarifs passent devant tout le reste : vous importez le fichier de votre fournisseur une fois, et vos postes sont repris tels quels, avec le nom du fournisseur et la date. Pour un poste que vous n’avez pas encore rentré, Presti prend un ordre de grandeur du marché et l’écrit sur la ligne, en toutes lettres. Vous relisez avant d’envoyer.

**« Et si un devis part au client avec une erreur dedans ? »**
> Il ne peut pas partir seul. Le devis se crée en brouillon, avec une validité de 90 jours et un acompte de 30 % que vous pouvez changer. Le réglage d’automatisation a trois positions, et aucune des trois n’envoie au client. L’envoi passe toujours par vous.

**« C’est compris dans quelle formule ? »**
> Dans les quatre : l’essai à 0 €, l’Essentiel à 29 €, le Studio à 59 €, la Signature à 99 €. Le chiffrage est dans le socle. Ce qui monte avec la formule, c’est le nombre de crédits chaque mois (3, 80, 250, 600) et le niveau du moteur (Standard, puis Pro à partir de 59 €, puis Expert à 99 €). TVA non applicable, art. 293 B.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « Presti le découpe en 3 à 12 postes » | `lib/ai.ts:931` : « 3 à 12 lignes selon l’ampleur. » |
| « La dépose de l’existant. La fourniture. La pose. La main-d’œuvre » | `lib/ai.ts:919` : « Sépare FOURNITURE et POSE… isole la main d’œuvre… ajoute la dépose/évacuation et la mise en service » |
| « Chaque poste porte sa quantité, son unité, son prix unitaire HT et son taux de TVA » | `lib/ai.ts:920` : `designation`, `quantite`, `unite`, `prix_unitaire_ht`, `tva_taux` |
| « 10 % en rénovation, 5,5 % sur la rénovation énergétique, 20 % sur le neuf » | `lib/ai.ts:928` : la règle TVA « LIGNE PAR LIGNE : 10… 5.5… 20 » |
| « Et zéro sur tout le devis si vous êtes en franchise en base » | `lib/lignes.ts:27` : `tva_taux: franchise ? 0 : (TVA_OK.includes(tv) ? tv : 20)`, appliqué en `lib/devisAuto.ts:72` |
| « vos lignes passent devant tout le reste » | `lib/prix/index.ts:25-41` : catalogue = tarifs de l’artisan d’abord, marché seulement pour les postes absents |
| « Vous importez le tarif de votre fournisseur une fois » | `lib/prix/csv.ts:1-8` : import CSV d’un tarif fournisseur, lecteur tolérant |
| « Chaque poste affiche d’où vient son prix : vos tarifs, le nom du fournisseur, la date » | `lib/prix/types.ts:45-52` : `libelleSource` rend « vos tarifs · fournisseur · date » |
| « Presti prend un ordre de grandeur du marché et l’écrit sur la ligne » | `lib/ai.ts:923-927` : `source_prix` vaut « ordre de grandeur du marché » ou « estimation » ; `lib/ai.ts:970` valide la valeur |
| « en brouillon… une validité de 90 jours et un acompte de 30 % » | `lib/devisAuto.ts:82` : `statut: 'brouillon', validite_jours: 90, acompte_pct: 30`, modifiables en `app/devis/[id]/page.tsx:143` |
| « Rien ne part au client tant que vous n’avez pas appuyé » | `lib/plateformeConfig.ts:21` : `devis_auto` ne vaut que `jamais`, `brouillon` ou `seuil`, et aucune de ces valeurs n’envoie |
| « compris dans les trois formules, et dans l’essai » | `lib/plans.ts:39` (`devis.ia`, `devis.prix_artisan` dans `BASE`), `:58-61` (essai, 29 €, 59 €, 99 € portent `BASE`), `:129` (grille à `true` partout) |
| « L’essai ouvre trois crédits, sans carte bancaire » | `lib/plans.ts:58` : `creditsMois: 3, prixMois: 0`, accroche « sans carte » |
| « 3, 80, 250, 600 » et « Standard, Pro, Expert » | `lib/plans.ts:58-61` : `creditsMois` et `tiers` de chaque offre |

## Ce qui n’est PAS dans cette publication, et pourquoi

La publication ne promet pas un devis qui part tout seul, parce que ça n’existe pas : les trois positions du réglage automatique s’arrêtent au brouillon. Elle ne promet pas non plus que le chiffrage tombe juste du premier coup sur un catalogue vide. Un artisan qui n’a rentré aucun tarif reçoit un devis entièrement bâti sur des ordres de grandeur du marché, et chaque ligne le dit. C’est bon pour dégrossir, ça ne remplace pas la visite sur place. On aurait pu ajouter que le chiffrage se paie en crédits, et que la recherche de référence chez le fournisseur ouvre à 59 € : ces deux points appartiennent aux publications sur les formules et sur l’inventaire, et les entasser ici aurait noyé le sujet.

---

# Publication n° 04 — « La facture ne se ressaisit pas »

| | |
|---|---|
| **Canal** | Facebook (variante A) + Instagram (variante B) |
| **Vidéo** | `publications/pub-04/vertical.mp4` — 20,6 s |
| **Lien tracké** | `prestiapp.fr/a/facebook` · `prestiapp.fr/a/instagram` |
| **Angle** | La facture naît du devis accepté : rien à retaper, une pièce numérotée et scellée, PDF et fichier électronique compris dans les trois formules et dans l’essai. |

## Le mécanisme réel qui la fonde

L’artisan ouvre son devis et appuie sur **« Créer la facture »** (`app/devis/[id]/page.tsx:241`). Le bouton envoie l’identifiant du devis à `/api/factures` (`app/devis/[id]/page.tsx:199-203`), qui appelle la seule fonction de création du logiciel : `creerFacture` (`lib/factureDepuisDevis.ts:17`). Celle-ci relit le devis et ses lignes triées par ordre (`:32-36`), puis les réinsère dans `factures_lignes` (`:129`). Aucune saisie n’est redemandée : désignation, unité, quantité, prix unitaire hors taxes, taux de TVA, soit les cinq colonnes d’une ligne (`supabase/migrations/0002_devis.sql:59-68` et `supabase/migrations/0006_factures.sql:36-45`), qu’il s’agisse d’un poste de main-d’œuvre ou d’un poste de fourniture. Le taux passe tel quel s’il fait partie du barème `TVA_OK = [0, 5.5, 10, 20]`, et il est forcé à 0 pour un artisan en franchise en base (`lib/lignes.ts:3` et `:27`). La remise du devis est reprise (`lib/factureDepuisDevis.ts:74` et `:114`), et les totaux sont recalculés par `computeTotals` (`lib/devisTotals.ts`), qui arrondit la TVA par taux avant de sommer, pour que les trois lignes du document s’additionnent au centime.

Ensuite la pièce devient une pièce comptable. Le numéro est tiré en dernier, dans une séquence continue par artisan (`lib/factureDepuisDevis.ts:96-97`), l’échéance est posée à trente jours (`:98`), et la facture est **scellée** une fois ses lignes écrites : `verrouillee: true`, date d’émission, empreinte du contenu (`:134-137`). Le commentaire du fichier dit pourquoi (`:131-133`) : au-delà de ce point, un déclencheur d’immuabilité refuse toute écriture (`supabase/migrations/0041_facturation_electronique.sql:44` et `:67`). C’est ce qui rend la comptabilité opposable, et c’est aussi pourquoi une correction passe par un avoir (`app/api/factures/[id]/avoir/route.ts`, bouton « Émettre un avoir » dans `app/factures/page.tsx:144`).

Avant tout cela, `creerFacture` refuse d’émettre s’il manque une mention obligatoire de l’entreprise : dénomination, forme juridique, SIRET, adresse, assurance (`lib/legalArtisan.ts:88`, contrôle en `lib/factureDepuisDevis.ts:50-53`). Le refus arrive **avant** que le numéro soit consommé, il nomme la mention manquante, et il conserve le brouillon (`lib/legalArtisan.ts:107`). Le nom du client est bloquant lui aussi (`:61-67`), pour éviter une facture scellée qui ne désigne personne.

Le fondement de l’offre, celui que cite la publication : `factures` **et** `factures.electronique` sont dans le socle `BASE` (`lib/plans.ts:39`), et l’essai gratuit reçoit exactement `BASE` (`lib/plans.ts:58`, trois crédits, 0 €). La grille publique le dit de la même source : « Factures + facture électronique » est à `true` pour essentiel, studio et signature (`lib/plans.ts:130`). Côté serveur, la route qui produit le XML ne pose aucun contrôle d’offre (`app/api/factures/[id]/facturx/route.ts`) : le bouton XML apparaît sur toute facture émise (`app/factures/page.tsx:137-138`).

---

## Variante A — Facebook

> Le devis accepté devient une facture en un clic, dans les trois formules et dans l’essai gratuit.
>
> Le chantier est réceptionné. Vous ouvrez le devis, vous appuyez sur « Créer la facture ». Les postes passent tels quels, main-d’œuvre comme fournitures : la désignation, l’unité, la quantité, le prix unitaire. Le taux de TVA que vous aviez posé sur le devis reste le même. La remise aussi. Le total HT, la TVA par taux et le TTC se recalculent sur la pièce.
>
> Vous ne retapez rien. Le samedi de paperasse, vous le récupérez.
>
> Presti la numérote dans l’ordre, pose l’échéance, puis la scelle. Une fois scellée, elle ne bouge plus : votre comptabilité tient debout.
>
> Avant d’émettre, le logiciel contrôle vos mentions obligatoires : dénomination, forme juridique, SIRET, adresse, assurance. S’il en manque une, il refuse et vous dit laquelle. Votre brouillon reste intact. Mieux vaut un refus tout de suite qu’une facture incomplète chez le client.
>
> Vous sortez le PDF pour le client, et le fichier électronique pour le comptable ou un donneur d’ordre public. Les deux sont compris dans Essentiel à 29 €, Studio à 59 €, Signature à 99 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI. Et dans l’essai : trois crédits, sans carte bancaire.
>
> Facturer l’acompte tout seul dès l’acceptation, c’est la formule à 99 €.
>
> Vous facturez comment aujourd’hui, tableur ou carnet à souche ?
>
> Un devis, une facture, un seul endroit.
>
> L’essai est gratuit et sans carte : prestiapp.fr/a/facebook

## Variante B — Instagram

> Une facture, deux fichiers : le PDF pour votre client, le XML pour votre comptable.
>
> Les deux sont compris dans les trois formules, et dans l’essai gratuit. Vous les récupérez sur chaque facture émise, d’un bouton.
>
> Le reste suit : la facture reprend les postes du devis accepté, les quantités, les taux de TVA. La pièce est numérotée dans l’ordre, datée, puis scellée.
>
> Rien à installer, rien à maintenir. Vous facturez depuis le camion, le soir, en descendant du chantier.
>
> Vous éditez vos factures où, au bureau ou dans le camion ?
>
> Le devis accepté devient une facture. Vous ne retapez rien.
>
> L’essai est gratuit, trois crédits, sans carte : prestiapp.fr/a/instagram

## Le premier commentaire (à poster soi-même, dans la minute)

> La précision qui compte sur un chantier : le contrôle des mentions bloque la création de la facture, jamais l’enregistrement du brouillon. Vous chiffrez, vous corrigez, vous gardez votre devis. Vous ne pouvez simplement pas émettre une pièce incomplète.
>
> Ces mentions se remplissent une seule fois, dans Paramètres, rubrique Entreprise et légal. Après ça, chaque facture sort complète.

## Trois réponses type

**« Je facture sur un tableur, ça marche très bien. »**
> Le tableur tient jusqu’au jour où il faut retrouver la facture d’un chantier de l’an dernier, ou sortir le fichier électronique que réclame le comptable. Ici la facture naît du devis : les postes, les quantités et les taux de TVA sont déjà là, et la numérotation se tient toute seule, dans l’ordre.

**« Et si je me trompe sur une facture déjà scellée ? »**
> Une facture scellée ne se modifie plus, et c’est voulu : c’est ce qui la rend opposable à votre comptable et à l’administration. La correction se fait par un avoir, sur la facture concernée, d’un bouton. La pièce d’origine reste en place et l’avoir la reprend.

**« Ça coûte combien, et il faut ma carte ? »**
> L’essai, c’est trois crédits, sans carte bancaire, sur vos vraies demandes. Ensuite Essentiel 29 €, Studio 59 € ou Signature 99 € par mois, sans engagement. TVA non applicable, article 293 B du CGI. Les factures et le fichier électronique sont dans les trois.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « Le devis accepté devient une facture en un clic » | `app/devis/[id]/page.tsx:241` — bouton « Créer la facture » ; `:199-203` — POST `/api/factures` avec `devis_id` |
| « Les postes passent tels quels, main-d’œuvre comme fournitures » | `lib/factureDepuisDevis.ts:34-36` — lecture de `devis_lignes` triée par `ordre` ; `:129` — insertion dans `factures_lignes` |
| « la désignation, l’unité, la quantité, le prix unitaire » | `supabase/migrations/0002_devis.sql:59-68` et `supabase/migrations/0006_factures.sql:36-45` — les deux tables portent les mêmes colonnes, un seul prix par ligne |
| « Le taux de TVA que vous aviez posé sur le devis reste le même » | `lib/lignes.ts:3` et `:27` — `TVA_OK = [0, 5.5, 10, 20]`, taux repris tel quel, forcé à 0 en franchise |
| « La remise aussi » | `lib/factureDepuisDevis.ts:74` et `:114` — `remise_pct` repris du devis |
| « Le total HT, la TVA par taux et le TTC se recalculent sur la pièce » | `lib/devisTotals.ts` — `computeTotals`, arrondi par taux puis somme |
| « Presti la numérote dans l’ordre, pose l’échéance » | `lib/factureDepuisDevis.ts:96-98` — `next_numero`, `FAC-AAAA-0001`, échéance à trente jours |
| « puis la scelle. Une fois scellée, elle ne bouge plus » | `lib/factureDepuisDevis.ts:131-137` — `verrouillee: true`, empreinte ; `supabase/migrations/0041_facturation_electronique.sql:44` — déclencheur d’immuabilité |
| « le logiciel contrôle vos mentions obligatoires : dénomination, forme juridique, SIRET, adresse, assurance » | `lib/legalArtisan.ts:88` — `MENTIONS_EMISSION` ; `lib/factureDepuisDevis.ts:50-53` — refus 422 avant numérotation |
| « Votre brouillon reste intact » | `lib/legalArtisan.ts:82-83` et `:107` — « Votre brouillon est conservé » |
| « le PDF pour votre client » | `app/factures/page.tsx:133` — bouton PDF ; `app/api/factures/[id]/pdf/route.ts` |
| « le XML pour votre comptable », « un donneur d’ordre public » | `app/factures/page.tsx:137-138` — bouton XML sur toute facture émise ; `app/api/factures/[id]/facturx/route.ts` — aucun contrôle d’offre |
| « dans les trois formules et dans l’essai gratuit » | `lib/plans.ts:39` — `factures` et `factures.electronique` dans `BASE` ; `:58` — l’essai reçoit `BASE` ; `:130` — grille `true / true / true` |
| « Essentiel à 29 €, Studio à 59 €, Signature à 99 € » | `lib/plans.ts:59-61` — `prixMois` 29, 59, 99 |
| « trois crédits, sans carte bancaire » | `lib/plans.ts:58` — `creditsMois: 3`, `prixMois: 0`, « sans carte » |
| « Facturer l’acompte tout seul dès l’acceptation, c’est la formule à 99 € » | `app/api/conversation/devis/route.ts:90` — `creerFacture({ acomptePct })` ; `lib/reglesServeur.ts:32-33` — gardé par `plateforme.regles`, présent dans `SIGNATURE` (`lib/plans.ts:51`) |
| « La correction se fait par un avoir » (réponse type) | `app/api/factures/[id]/avoir/route.ts` ; `app/factures/page.tsx:144` — bouton « Émettre un avoir » |
| « par mois, sans engagement. TVA non applicable, art. 293 B du CGI » | `app/page.tsx:170` — « sans engagement » ; `app/page.tsx:161` et `app/abonnement/page.tsx:77` — mention de TVA portée par la landing et la page d’abonnement, pour les prix Presti |

## Ce qui n’est PAS dans cette publication, et pourquoi

Le plan de la vidéo porte un carton **« L’acompte est déduit. »** que le code ne soutient pas : la ligne « Acompte X % à la commande » n’est rendue que sur le **devis** (`lib/DevisPDF.tsx:184`, condition `!isFacture`), et aucune facture ne déduit un acompte déjà encaissé. Ce qui existe vraiment, c’est la facture **d’acompte** créée à l’acceptation par une règle d’automatisation, au pourcentage demandé, remise du devis déjà appliquée (`lib/factureDepuisDevis.ts:76-86`), et elle est réservée à Signature, à 99 €, parce que `plateforme.regles` vit dans `SIGNATURE` (`lib/plans.ts:51`, verrou serveur `lib/reglesServeur.ts:32-33`). La publication dit donc l’acompte à 99 €, et ce carton de la vidéo est à corriger avant montage.

Deuxième chose écartée : le mot « certifiée ». L’en-tête de `lib/facturx.ts:13-16` est explicite, le XML suit la structure CII, profil EN 16931, mais il n’a pas encore été passé au Schematron officiel EN 16931 + CIUS France ni embarqué dans un PDF/A-3 validé. La publication parle donc de « fichier électronique » et de « XML », jamais d’une facture Factur-X certifiée, et ne promet aucune date d’obligation légale. Enfin, aucun client n’est cité : Presti a un seul abonné, toute preuve sociale serait un mensonge, et il a payé un logiciel sans signer pour faire de la publicité.

---

# Publication n° 05 — « Votre vitrine, à votre nom, comprise »

| | |
|---|---|
| **Canal** | LinkedIn (principal) · reprise Facebook |
| **Vidéo** | `publications/pub-05/vertical.mp4` — 19,2 s |
| **Lien tracké** | `prestiapp.fr/a/linkedin` (variante A) · `prestiapp.fr/a/facebook` (variante B) |
| **Angle** | Le site vitrine et le nom de domaine de l’artisan sont dans toutes les formules, essai compris : une présence en ligne à son nom, sans rien à installer ni à maintenir. |

**À corriger avant de publier, sinon la publication ment.** La console n’affiche le champ « Votre
nom de domaine » que si `siteMax >= 3` (`app/profil/page.tsx:593`, avec la mention « Inclus dans
l’offre Signature »), alors que l’API l’autorise dès l’essai (`app/api/domain/route.ts:33`) et que
la grille publique le donne aux trois offres (`lib/plans.ts:128`). Tant que ce test n’est pas
remplacé par `peut(plan, 'site.domaine_perso')`, un artisan en Essentiel ne trouvera pas où saisir
son domaine : la première ligne des deux variantes est fausse pour lui. Le texte ci-dessous est
prêt ; il part le jour où l’écran est aligné, pas avant.

## Le mécanisme réel qui la fonde

Presti fabrique à l’artisan un site vitrine servi par `app/site/[slug]/page.tsx`, rempli avec sa
fiche : son nom, son métier, sa zone d’intervention, ses prestations, ses coordonnées. Le thème se
choisit parmi six (`app/site/[slug]/page.tsx:139`, liste `atelier, nuit, epure, chantier, bleu,
vitrine`) et la couleur d’accent de l’artisan est validée en hexadécimal juste au-dessus, ligne 138.
La photo de tête vient de sa première réalisation, sinon de sa photo de profil
(`app/site/[slug]/page.tsx:144` : `heroShot = realisations[0]?.image || a.photo_url`). Le bouton de
contact n’ouvre pas un formulaire : il renvoie vers la page de conversation, et le commentaire du
code le dit tel quel à la ligne 159 — « Le site RENVOIE vers la plateforme (espace de contact) — il
ne l’embarque jamais ».

Le cœur de la publication est le nom de domaine. `lib/plans.ts:38` place `site.essentiel` **et**
`site.domaine_perso` dans `BASE`, avec le commentaire de décision, recopié tel quel : décision Benj
(04/09), l’adresse sans « presti » est pour tous. Or `BASE` est le jeu de capacités du plan `gratuit`
(3 crédits, 0 €) comme du plan `essentiel` (80 crédits, 29 €) — `lib/plans.ts:58-59`. La grille
publique dit la même chose : ligne 128, « Votre nom de domaine (site et page de conversation) » vaut
`true` pour essentiel, studio et signature. Et le verrou serveur n’est pas un `plan === 'signature'`
en dur : `app/api/domain/route.ts:33` appelle `peut(r.artisan.plan, 'site.domaine_perso')`.

Concrètement : l’artisan saisit `mon-entreprise.fr`, la console lui affiche les enregistrements DNS
à recopier chez son hébergeur (`app/profil/page.tsx:616` : « Chez votre hébergeur (OVH, Ionos,
Gandi…), ajoutez : », alimenté par `lib/vercelDomains.ts:30-38` — un `A` sur `@` pour un domaine nu,
un `CNAME` pour un sous-domaine, plus le `TXT` de vérification). Une fois le domaine servi,
`lib/urls.ts:29-33` bascule les deux adresses : le site devient `https://mon-entreprise.fr/` et la
page de conversation `/demande` (`chemins()`, ligne 45). `lib/urls.ts:62-76` verrouille la suite —
une page servie sur le domaine perso lie vers `/demande`, le commentaire dit : sinon l’adresse
« presti » réapparaît au premier clic. Même la page 404 écrase les métadonnées de marque
(`app/site/[slug]/page.tsx:60-62`).

Ce que la formule d’entrée ne contient pas, et que la publication ne promet donc pas : la galerie de
réalisations, qui demande le niveau 2 (`app/site/[slug]/page.tsx:177` : `showReal =
realisations.length > 0 && tier >= 2`, et `lib/siteLayout.ts:29` qui pose `gallery: 2`). `site.pro`
est dans `STUDIO` (`lib/plans.ts:45`), `site.signature` et `site.slides3d` dans `SIGNATURE`
(`lib/plans.ts:52`), avec `siteMax` à 1, 2 et 3 aux lignes 58 à 61.

---

## Variante A — LinkedIn

> Un site vitrine à votre nom de domaine, compris dans les trois formules et dans l’essai gratuit.
>
> Dedans : votre nom, votre métier, votre zone d’intervention, vos prestations, une photo de
> chantier en tête de page, votre téléphone, vos horaires. Six ambiances au choix, et votre couleur.
>
> Le bouton de contact ne mène pas vers un formulaire qui tombe dans le vide. Il ouvre votre page de
> conversation : le client décrit son chantier, la demande arrive chez vous.
>
> Le nom de domaine, maintenant. Vous saisissez mon-entreprise.fr, la console vous affiche les
> lignes à recopier chez votre hébergeur, OVH, Ionos ou Gandi. Ensuite votre site est servi sur
> votre adresse, et votre page de conversation aussi. Le mot Presti n’apparaît nulle part : vos
> clients voient votre nom et votre travail.
>
> La page de mentions légales est remplie depuis votre fiche : forme juridique, SIRET, assurance
> décennale, médiateur. Un champ que vous n’avez pas rempli est signalé comme manquant, jamais
> comblé par une phrase creuse.
>
> Rien à installer, rien à mettre à jour le dimanche soir. Vous remplissez votre fiche une fois, le
> site suit.
>
> La galerie de réalisations, elle, commence à 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI. C’est écrit dans la grille, et c’est tout.
>
> Vous avez déjà un nom de domaine acheté qui ne sert à rien ?
>
> Il peut porter votre vitrine cette semaine, et l’essai est gratuit et sans carte : prestiapp.fr/a/linkedin

## Variante B — Facebook

> Six ambiances, votre couleur, votre nom de domaine : la vitrine est comprise dès l’essai gratuit.
>
> Le client cherche votre nom sur son téléphone, entre deux chantiers. Il tombe sur votre page :
> votre métier, votre zone, vos prestations, une photo de chantier, votre téléphone.
>
> Le bouton de contact ouvre votre page de conversation. Il décrit son chantier, la demande arrive
> chez vous.
>
> L’adresse est la vôtre : vous branchez mon-entreprise.fr, et le mot Presti disparaît partout.
>
> Rien à installer, rien à mettre à jour. Vous remplissez votre fiche une fois.
>
> Votre nom de domaine dort déjà quelque part ?
>
> Montez la vitrine dessus pendant l’essai gratuit : prestiapp.fr/a/facebook

## Le premier commentaire (à poster soi-même, dans la minute)

> Précision utile : le nom de domaine, vous l’achetez vous-même chez un hébergeur et il reste à
> vous. Presti branche le vôtre, il ne vous le vend pas, et vous partez avec le jour où vous partez.
>
> Et si vous avez déjà un site, gardez-le : vous collez juste le lien de votre page de conversation
> dessus.

## Trois réponses type

**« J’ai déjà un site fait par un cousin, je le garde. »**
> Gardez-le. Vous collez le lien de votre page de conversation sur votre site actuel, et vous
> gardez la partie qui compte : les demandes qui arrivent chez vous. La vitrine Presti est là si un
> jour le cousin n’a plus le temps.

**« Le nom de domaine est fourni avec l’abonnement ? »**
> Le branchement l’est, dans toutes les formules et pendant l’essai. Le nom lui-même, vous l’achetez
> chez un hébergeur comme n’importe qui, et il est à votre nom. Vous partez un jour, vous partez
> avec.

**« Je n’ai pas le temps de remplir des pages et des pages. »**
> Vous remplissez votre fiche : nom, métier, zone, prestations, coordonnées, quelques photos de
> chantier. Le site se compose à partir de là, sans gabarit à choisir et sans page à construire.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « compris dans les trois formules et dans l’essai gratuit » | `lib/plans.ts:38` — `site.essentiel` et `site.domaine_perso` sont dans `BASE` ; `lib/plans.ts:58-59` — `gratuit` et `essentiel` ont `capacites: BASE` |
| « à votre nom de domaine » | `lib/plans.ts:128` — grille « Votre nom de domaine (site et page de conversation) » : `true` pour les trois offres ; `app/api/domain/route.ts:33` — le verrou serveur est `peut(plan, 'site.domaine_perso')` |
| « la console vous affiche les lignes à recopier chez votre hébergeur, OVH, Ionos ou Gandi » | `app/profil/page.tsx:616` — « Chez votre hébergeur (OVH, Ionos, Gandi…), ajoutez : » ; `lib/vercelDomains.ts:30-38` — `A` sur `@`, `CNAME` sinon, plus le `TXT` de vérification |
| « votre site est servi sur votre adresse, et votre page de conversation aussi » | `lib/urls.ts:29-33` — `modeUrl` passe en `perso` dès le domaine vérifié ; `lib/urls.ts:45` — `chemins()` rend `/` et `/demande` |
| « Le mot Presti n’apparaît nulle part » | `lib/urls.ts:62-76` — `modeDepuisHote`, le commentaire dit : sinon l’adresse « presti » réapparaît au premier clic ; `app/site/[slug]/page.tsx:60-62` — même la 404 écrase les métadonnées de marque |
| « Six ambiances au choix et votre couleur » | `app/site/[slug]/page.tsx:138-139` — accent validé en hexadécimal, six thèmes admis |
| « une photo de chantier en tête de page » | `app/site/[slug]/page.tsx:144` — `heroShot = realisations[0]?.image || a.photo_url`, sans condition de niveau |
| « vos horaires » | `app/site/[slug]/page.tsx:263` — les horaires s’affichent dans l’en-tête, section `hero`, niveau 1 (`lib/siteLayout.ts:28`) |
| « Le bouton de contact ne mène pas vers un formulaire qui tombe dans le vide » | `app/site/[slug]/page.tsx:159-160` — « Le site RENVOIE vers la plateforme (espace de contact) » ; `contactHref = ch.plateforme` |
| « forme juridique, SIRET, assurance décennale, médiateur » | `lib/legalArtisan.ts:41-68` — les mentions obligatoires, dont l’assurance : ligne 55, « Obligatoire pour les métiers du bâtiment (garantie décennale, art. L.241-1 c. ass.) » |
| « Un champ que vous n’avez pas rempli est signalé comme manquant » | `app/site/[slug]/infos-legales/page.tsx:22-24` — « Aucune donnée inventée. Un champ non renseigné est signalé comme manquant, pas comblé par une formule creuse… » |
| « La galerie de réalisations commence à 59 € » | `app/site/[slug]/page.tsx:177` — `showReal = realisations.length > 0 && tier >= 2` ; `lib/siteLayout.ts:29` — `gallery: 2` ; `lib/plans.ts:60` — Studio, 59 €, `siteMax: 2` |
| « 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI » | `app/page.tsx:170` — « sans engagement » ; `app/page.tsx:161` — « TVA non applicable, art. 293 B du CGI » |

## Ce qui n’est PAS dans cette publication, et pourquoi

Le site lui-même n’est montré dans aucun plan de la vidéo, et la publication ne porte aucune capture
de site. La raison tient au compte de démonstration `atelier-du-chene` : sa bannière et sa galerie
utilisent des photos Wikimedia en CC BY-SA 4.0, listées dans
`public/demo/portfolio/attributions.json`. Le partage à l’identique s’étendrait au film, ce qui est
inacceptable pour une publicité. Le seul plan produit de la vidéo est donc le lien de contact dans
la console, et la promesse du nom de domaine vit dans le texte, où elle est sourcée, plutôt que dans
une image qui afficherait une adresse `prestiapp.fr` et dirait le contraire.

Deux autres choses ne sont pas dites. La galerie de réalisations n’est pas dans la formule d’entrée :
la publication l’écrit noir sur blanc plutôt que de laisser croire que tout est compris à 29 €. Et
le prix du nom de domaine lui-même n’est pas chiffré : il se paie chez l’hébergeur, à un tarif que
Presti ne fixe pas et qu’aucune ligne de code ne permet d’avancer ici.

Reste le point bloquant rappelé en tête de section : `app/profil/page.tsx:593` n’affiche le champ
« Votre nom de domaine » que si `siteMax >= 3`, avec la mention « Inclus dans l’offre Signature »,
alors que le serveur l’autorise dès l’essai (`app/api/domain/route.ts:33`) et que la grille vendue
le donne aux trois offres. La grille et l’API disent la même chose ; c’est l’écran qui est resté en
arrière. Cette publication ne part pas tant que ce test n’est pas aligné sur
`peut(plan, 'site.domaine_perso')` : sinon elle vend, à un artisan en Essentiel, un champ qu’il ne
verra jamais.

---

# Publication n° 06 — « Camion et atelier : un seul compte »

| | |
|---|---|
| **Canal** | Facebook (variante A) + Instagram (variante B) |
| **Vidéo** | `publications/pub-06/vertical.mp4` · 20,9 s |
| **Lien tracké** | `prestiapp.fr/a/facebook` · `prestiapp.fr/a/instagram` |
| **Angle** | L’inventaire : le stock compté à l’atelier et dans le camion, avec un seuil qui prévient avant la rupture. Ce que l’artisan y gagne : la tournée au dépôt qu’il ne fait pas, et le chantier qui ne cale pas. |

## Ce que la fonctionnalité fait, et où c’est écrit dans le code

L’inventaire tient la liste de ce que l’artisan possède, **compté séparément par lieu**. La table
`stock` a une ligne par couple matériau + lieu, avec une contrainte d’unicité dessus
(`supabase/migrations/0040_inventaire.sql:38-41`). Dans la console, deux lieux sont proposés
aujourd’hui : `const LIEUX = ['atelier', 'camion']` (`app/inventaire/page.tsx:34`), et le tableau
affiche exactement ces deux colonnes (`app/inventaire/page.tsx:209`). C’est pour ça que le texte dit
« deux endroits » là où le carton de la vidéo en annonce trois.

L’écran s’ouvre sur **ce qui manque**, pas sur la liste complète : c’est écrit noir sur blanc dans le
commentaire d’en-tête du fichier (`app/inventaire/page.tsx:16-17`) et c’est ce que fait le code.
L’API calcule les alertes en filtrant les articles dont le seuil est posé et dont le total est
retombé dessous (`app/api/inventaire/route.ts:60`), puis renvoie pour chacun ce qu’il reste et le
seuil (`:65`). La console rend ça en un encadré « À racheter » placé avant tout le reste
(`app/inventaire/page.tsx:168-176`), et la ligne du tableau passe en classe `inv-bas`
(`app/inventaire/page.tsx:213-215`). Le seuil se saisit dans le formulaire d’ajout, champ « Seuil
d’alerte » (`app/inventaire/page.tsx:184`), et il est borné à zéro minimum côté serveur
(`app/api/inventaire/route.ts:111`).

Le scan existe pour une raison écrite dans le code : « un artisan ne saisira jamais son stock au
clavier » (`app/inventaire/Scanner.tsx:8-10`). Le lecteur utilise le détecteur du navigateur sur sept
formats de codes-barres (`app/inventaire/Scanner.tsx:53-55`) ; quand il n’existe pas, le cas de
Safari sur iPhone, l’écran le dit et propose la saisie du code à la main
(`app/inventaire/Scanner.tsx:100-105`). Un code lu enregistre une entrée d’une unité sur le lieu
courant, avec `source: 'scan'` (`app/inventaire/page.tsx:128`).

Quatre types de mouvement sont acceptés, tout autre est refusé : `entree`, `sortie`, `inventaire`,
`perte` (`app/api/inventaire/route.ts:84`). Chacun passe par la fonction SQL `appliquer_mouvement`,
qui écrit le mouvement et met à jour le stock dans la même transaction
(`supabase/migrations/0045_colonnes_figees.sql:72-85`). Enfin l’offre : `inventaire.stock` est dans
`STUDIO` (`lib/plans.ts:46`), donc à partir de 59 € (`lib/plans.ts:60`), et la grille publique porte
la ligne « Stock par lieu, scan, seuils » à `false` pour Essentiel (`lib/plans.ts:132`). Le verrou
tient vraiment : l’API renvoie un 403 quand l’offre ne le permet pas
(`app/api/inventaire/route.ts:22-23`).

---

## Variante A — Facebook

> Presti compte votre stock à deux endroits : l’atelier et le camion.
>
> Chaque matériau a sa ligne, deux colonnes en face. Ce qui reste à l’atelier. Ce qui roule dans le camion. Un seul écran, sur le téléphone, avant de charger.
>
> À la livraison, vous scannez le code-barres du carton et la quantité monte. Le code se renseigne une fois. Ensuite, un scan suffit. Rien à retaper le soir.
>
> Sur chaque article, vous posez un seuil. Dès que le stock passe dessous, l’article remonte en haut de l’écran, dans un encadré « À racheter » : ce qu’il reste, et le seuil que vous aviez posé. L’écran s’ouvre là-dessus, avant la liste complète : c’est ce qu’on vient vraiment vérifier avant de partir.
>
> Quatre gestes tiennent l’ensemble : entrée, sortie, comptage, perte. Le comptage sert le jour où vous recomptez une étagère.
>
> Sur la fiche : la marque, la référence, le prix d’achat, le fournisseur, une photo. De quoi racheter juste.
>
> Ce que ça vous rend : la tournée au dépôt que vous ne faites pas pour un raccord, et le chantier qui ne s’arrête pas en pleine matinée parce qu’il manque une pièce.
>
> L’inventaire est dans la formule Studio, 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI. À 29 €, vous avez les devis, les factures, les relances et le site vitrine, sans le stock. C’est écrit tel quel dans la grille.
>
> Vous le tenez sur quoi aujourd’hui, votre stock ?
>
> Le stock, le site vitrine Pro et l’export de vos données tiennent dans la même formule.
>
> La grille des trois formules est là : prestiapp.fr/a/facebook

## Variante B — Instagram

> Quatre gestes tiennent votre stock : entrée, sortie, comptage, perte.
>
> Vous scannez le carton à la livraison, la quantité monte. Vous sortez le matériel pour le chantier, elle descend.
>
> Sur chaque article, vous posez un seuil. En dessous, l’article remonte dans l’encadré « À racheter », avec ce qu’il reste. Vous voyez le manque avant de charger le camion, plutôt que devant le client.
>
> L’atelier et le camion se comptent à part, sur le même écran. Vous savez ce que vous portez.
>
> Le stock est dans la formule Studio, à 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.
>
> Vous le tenez sur quoi, votre stock, aujourd’hui ?
>
> L’essai gratuit s’arrête avant le stock : l’inventaire commence à Studio.
>
> Le détail des trois formules est sur prestiapp.fr/a/instagram, en bio.

## Le premier commentaire (à poster soi-même, dans la minute)

> Le scan passe par la caméra du téléphone. Sur Android, le navigateur lit le code-barres tout seul. Sur Safari iPhone, il ne sait pas le faire : l’écran vous propose alors de taper le chiffre à la main, ce qui va encore plus vite que de tout réécrire.
>
> Et pour démarrer sans ressaisir l’atelier entier : le CSV de votre fournisseur s’importe, avec un aperçu de ce qui a été compris avant d’enregistrer.

## Trois réponses type

**« J’ai un carnet dans le camion, ça marche très bien. »**
> Le carnet dit ce que vous avez noté. Le seuil, lui, vous prévient avant que vous partiez. Et rien ne vous oblige à tout rentrer : commencez par les références que vous rachetez toutes les semaines, le reste vient au fil des livraisons.

**« Je n’ai pas le temps de saisir tout mon stock. »**
> Une fiche demande un nom, rien de plus. Le CSV de votre fournisseur s’importe d’un coup, et vous voyez ce qui a été compris avant d’enregistrer. Ensuite un article s’ajoute le jour où vous l’achetez, en scannant le carton.

**« 59 € par mois pour compter du matériel, c’est cher. »**
> À 59 €, la formule Studio porte autre chose que le stock : 250 crédits chaque mois au lieu de 80, le site vitrine Pro avec galerie, l’assistant qui peut répondre seul, la recherche chez vos fournisseurs et l’export de vos données. Le stock seul ne vaut sans doute pas le passage. Le reste, à vous de voir.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « Presti compte votre stock à deux endroits : l’atelier et le camion. » | `app/inventaire/page.tsx:34` · `const LIEUX = ['atelier', 'camion']` ; `:209` · le tableau a une colonne « Atelier » et une colonne « Camion » |
| « Chaque matériau a sa ligne, deux colonnes en face. » | `supabase/migrations/0040_inventaire.sql:38-41` · table `stock`, une ligne par matériau et par lieu, `unique (materiau_id, lieu)` |
| « vous scannez le code-barres du carton et la quantité monte » | `app/inventaire/page.tsx:128` · mouvement `entree`, quantité 1, `source: 'scan'` ; `app/inventaire/Scanner.tsx:53-55` · le lecteur et ses sept formats |
| « Le code se renseigne une fois. Ensuite, un scan suffit. » | `app/inventaire/page.tsx:189` · « Renseignez le code-barres une fois : ensuite, un scan à la livraison suffit à incrémenter le stock. » |
| « Sur chaque article, vous posez un seuil. » | `app/inventaire/page.tsx:184` · champ « Seuil d’alerte » ; `app/api/inventaire/route.ts:111` · `seuil_alerte`, jamais négatif |
| « l’article remonte en haut de l’écran, dans un encadré “À racheter” : ce qu’il reste, et le seuil » | `app/api/inventaire/route.ts:60` et `:65` · le filtre, puis les champs `reste` et `seuil` ; `app/inventaire/page.tsx:168-176` · l’encadré |
| « L’écran s’ouvre là-dessus, avant la liste complète. » | `app/inventaire/page.tsx:16-17` · « L’écran s’ouvre sur CE QUI MANQUE, pas sur la liste complète » |
| « Quatre gestes : entrée, sortie, comptage, perte. » | `app/api/inventaire/route.ts:84` · `['entree', 'sortie', 'inventaire', 'perte']`, tout autre type est rejeté |
| « Le comptage sert le jour où vous recomptez une étagère. » | `app/inventaire/page.tsx:241-244` · bouton « Compter », saisie de la quantité réelle sur le lieu courant |
| « Sur la fiche : la marque, la référence, le prix d’achat, le fournisseur, une photo. » | `app/inventaire/page.tsx:190` et `app/inventaire/FicheMateriau.tsx:25-30` · les champs de la fiche |
| « L’inventaire est dans la formule Studio, 59 € par mois. » | `lib/plans.ts:46` · `inventaire.stock` dans `STUDIO` ; `:60` · `prixMois: 59` ; `app/api/inventaire/route.ts:22-23` · 403 sinon |
| « À 29 €, vous avez les devis, les factures, les relances et le site vitrine, sans le stock. » | `lib/plans.ts:36-41` · `BASE` contient `devis.ia`, `factures`, `relances` et `site.essentiel` ; `:59` · `prixMois: 29` ; `:132` · « Stock par lieu, scan, seuils » à `false` pour Essentiel |
| « 250 crédits chaque mois au lieu de 80 » | `lib/plans.ts:59-60` · `creditsMois: 80` pour Essentiel, `250` pour Studio |
| « le site vitrine Pro avec galerie, l’assistant qui peut répondre seul, la recherche chez vos fournisseurs et l’export » | `lib/plans.ts:44-47` · `site.pro`, `plateforme.ia.auto`, `inventaire.recherche_ia` et `export` dans `STUDIO` ; `:120-124`, `:127`, `:133`, `:138` · les lignes de la grille |
| « Sur Safari iPhone, il ne sait pas le faire. » | `app/inventaire/Scanner.tsx:100-105` · « Votre navigateur ne sait pas lire un code-barres (c’est le cas de Safari sur iPhone). » |
| « le CSV de votre fournisseur s’importe, avec un aperçu » | `app/inventaire/ImportCsv.tsx:6-7` · « on montre d’abord ce qu’on a compris (aperçu), l’artisan valide, puis on enregistre » |
| « 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI » | `app/page.tsx:170` · « sans engagement » ; `app/page.tsx:161` · « TVA non applicable, art. 293 B du CGI » |

## Ce qui n’est PAS dans cette publication, et pourquoi

Le carton de la vidéo annonce trois lieux, « camion, dépôt, atelier ». La console en propose deux :
la base garde le lieu en texte libre, mais aucun bouton ne crée un troisième endroit aujourd’hui
(`app/inventaire/page.tsx:34`). Le texte dit donc « deux endroits ». Si le troisième doit se vendre,
c’est la console qu’il faut ouvrir, et non le post qu’il faut arrondir.

Deux autres choses restent dehors, volontairement. L’essai gratuit s’arrête avant l’inventaire :
`BASE` ne porte pas `inventaire.stock` (`lib/plans.ts:36-41`), donc on n’écrit nulle part « essayez
le stock gratuitement », et le lien de fin renvoie vers la grille des formules plutôt que vers
l’essai. Et le stock ne se décrémente pas tout seul quand un devis part : les seuls mouvements créés
par la console sont manuels ou issus d’un scan (`app/inventaire/page.tsx:94` et `:128`), même si la
fonction SQL saurait rattacher un mouvement à un devis. On vend le geste qui existe, et non celui
que la base rendrait possible.

---

# Publication n° 07 — « La référence se trouve sans quitter le chantier »

| | |
|---|---|
| **Canal** | Instagram (variante B prête pour Facebook) |
| **Vidéo** | publications/pub-07/vertical.mp4 — 19,3 s (somme des plans de `promo-src/hf/publications.mjs`) |
| **Lien tracké** | prestiapp.fr/a/instagram · variante B : prestiapp.fr/a/facebook |
| **Angle** | La recherche chez ses fournisseurs : décrire la pièce depuis le chantier, récupérer le prix, la référence et le lien sans ouvrir trois catalogues. |

## Ce que la fonctionnalité fait, et où c’est écrit dans le code

L’artisan tape ce qu’il cherche en français de tous les jours, coche ses fournisseurs, et lance. L’écran est `app/inventaire/recherche/page.tsx`, dont le champ propose lui-même les exemples du métier à la ligne 171 : « plaque de plâtre BA13, tube PER 16, disjoncteur 20 A ». Le moteur, `lib/recherche-fournisseurs.ts`, ouvre les fiches produit chez les enseignes cochées et rapporte ce qu’il a vu. Le type `ResultatRecherche` (lignes 30 à 48) fixe ce qu’un résultat contient : fournisseur, désignation vue, référence, prix vu, HT ou TTC, unité, conditionnement, disponibilité, lien direct, horodatage, extrait cité, et un sceau serveur qui interdit à un client de fabriquer un faux résultat. Six résultats au maximum, `MAX_RESULTATS = 6` à la ligne 88.

Le prix n’est jamais retouché. La consigne du moteur, ligne 296 : « le nombre lu sur la page, tel quel (jamais converti HT↔TTC, jamais estimé, jamais arrondi) ». Et il ne peut pas être fabriqué : la validation de la ligne 221 rejette tout résultat dont le montant ne figure pas dans l’extrait copié de la page. Un fournisseur dont on n’a rien pu lire passe dans `nonVus`, affiché sous le titre « Ce que je n’ai pas pu voir » (page.tsx:291). Les enseignes qui masquent leurs prix aux visiteurs y arrivent avec leur raison, écrite une fois pour toutes dans `lib/inventaire/liste-depart.ts:16`.

Rien n’entre dans les données de l’artisan tant qu’il n’a pas cliqué. L’en-tête de `app/api/inventaire/recherche/route.ts` le dit ligne 14 : « rien n’est stocké ici ». C’est la route `retenir` qui écrit, et seulement sur le bouton « Ajouter à l’inventaire » ou « Ajouter à ma liste d’achat » (page.tsx:275-276). La fiche matériau garde alors le prix vu, la date, le lien et la source (`prix_vu_ht`, `prix_vu_le`, `prix_vu_url`, `prix_vu_source`, migration `0048_inventaire_v2.sql:54-57`). Le tarif négocié de l’artisan, lui, vit dans une colonne à part, `prix_achat_ht` (`0048_inventaire_v2.sql:49-51`) : un prix relevé sur internet ne l’écrase jamais.

Le champ « fondé » de la publication renvoie à `lib/plans.ts:44-48` : `inventaire.recherche_ia` est dans `STUDIO`, donc à partir de 59 € par mois (ligne 60). La grille publique le confirme ligne 133 : `false` pour Essentiel, « Standard + Pro » pour Studio, « + Expert » pour Signature. Les deux publications le disent, elles ne le cachent pas.

---

## Variante A — Instagram

> Presti cherche une référence chez vos fournisseurs et vous rapporte jusqu’à six prix, avec le lien de la fiche produit.
>
> Vous êtes sur le chantier, il vous manque une pièce. Vous ouvrez Presti et vous écrivez ce que vous cherchez : « plaque de plâtre BA13 », « tube PER 16 », « disjoncteur 20 A ». Vous cochez vos fournisseurs. Vous lancez.
>
> L’assistant ouvre les fiches produit chez les enseignes cochées et note ce qu’il voit : désignation, référence, prix affiché, HT ou TTC, conditionnement, disponibilité. Chaque résultat porte une ou deux lignes copiées du site et le lien direct. Le montant est celui qui est écrit sur la page, sans conversion et sans arrondi.
>
> Quand un fournisseur ne montre ses prix qu’aux comptes connectés, Presti l’écrit noir sur blanc dans « Ce que je n’ai pas pu voir ».
>
> Un prix vous convient ? Un bouton l’envoie dans votre inventaire, un autre dans votre liste d’achat, avec la date et le lien. Rien n’entre dans vos données sans votre clic.
>
> Trois catalogues à ouvrir debout dans la poussière, c’est du temps qu’on ne facture jamais.
>
> La recherche chez vos fournisseurs est comprise dans la formule Studio, à 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.
>
> Vous cherchiez quoi, la dernière fois, et ça vous a pris combien de temps ?
>
> Ça marche chez vos fournisseurs qui affichent leurs prix sans compte.
>
> L’essai est gratuit et sans carte : prestiapp.fr/a/instagram

---

## Variante B — Facebook

> Le prix relevé chez votre fournisseur entre dans votre inventaire en un clic, avec la date et le lien direct.
>
> Vous décrivez la pièce depuis le chantier. Presti va lire les fiches produit chez les enseignes que vous cochez : désignation, référence, prix affiché, et une ou deux lignes copiées de la page.
>
> Un bouton pour l’inventaire, un autre pour la liste d’achat. Rien ne s’écrit sans votre clic.
>
> La fiche matériau garde ensuite le tarif, la date, le lien et la provenance. Plus de tournée au dépôt pour vérifier un prix.
>
> Vous passez combien d’heures par semaine à courir après une référence ?
>
> La recherche est comprise dans la formule Studio, à 59 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.
>
> L’essai est gratuit et sans carte : prestiapp.fr/a/facebook

---

## Le premier commentaire (à poster soi-même, dans la minute)

> Une recherche coûte 2 crédits, 3 au niveau Expert. Quand toutes les enseignes cochées ont déjà été relevées récemment, la recherche sort du cache partagé : immédiate, et sans crédit décompté. La formule Studio en compte 250 par mois.
> Sur chaque résultat, un bouton « Rechercher une équivalence » relance la recherche sur une autre marque. Utile le jour où la référence habituelle est en rupture.

---

## Trois réponses type

**« Les prix affichés sur internet, ce sont pas mes tarifs de négoce. »**
> Vrai. L’assistant lit ce qui est public, il ne verra jamais votre remise. Il vous donne un ordre de grandeur daté et sourcé en quelques secondes, et vos tarifs négociés se saisissent à la main dans la fiche matériau, dans une colonne à part que le prix relevé n’écrase jamais. Les deux cohabitent, chaque prix porte sa provenance.

**« Il est capable d’inventer un prix. »**
> Non, et c’est verrouillé côté serveur. Un montant qui ne figure pas dans l’extrait copié de la page est rejeté, et le fournisseur bascule dans « Ce que je n’ai pas pu voir » avec sa raison. L’écran le dit sous la section : un prix que l’assistant n’a pas vu n’est jamais remplacé par une estimation.

**« Moi je suis à 29 €, ça me suffit. »**
> Alors gardez Essentiel : les devis chiffrés sur vos prix, les factures, la facture électronique, les relances et le site à votre nom y sont déjà. La recherche fournisseurs arrive à 59 € avec le stock par lieu, le scan, les seuils et l’export. Vous montez le jour où les allers-retours au dépôt vous coûtent plus que trente euros par mois.

---

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « cherche une référence chez vos fournisseurs » | app/api/inventaire/recherche/route.ts:48-54 · la requête est bornée aux fournisseurs de l’artisan, dans son ordre de préférence |
| « jusqu’à six prix » | lib/recherche-fournisseurs.ts:88 · `export const MAX_RESULTATS = 6` |
| « le lien de la fiche produit », « le lien direct » | lib/recherche-fournisseurs.ts:41-42 · champ `url`, « Lien direct vers la page où le prix a été vu » |
| « désignation, référence, prix affiché, HT ou TTC, conditionnement, disponibilité » | lib/recherche-fournisseurs.ts:30-48 · le type `ResultatRecherche` |
| « une ou deux lignes copiées » du site | lib/recherche-fournisseurs.ts:45-46 · « 1-2 lignes CITÉES de la page, contenant le montant » ; consigne :296 « 1 à 2 lignes COPIÉES » |
| « sans conversion et sans arrondi » | lib/recherche-fournisseurs.ts:296 · « jamais converti HT↔TTC, jamais estimé, jamais arrondi » |
| « un prix que l’assistant n’a pas vu n’est jamais remplacé par une estimation » | app/inventaire/recherche/page.tsx:295 · la phrase exacte, sous la section `nonVus` ; le rejet lui-même est en lib/recherche-fournisseurs.ts:221 |
| « Ce que je n’ai pas pu voir » | app/inventaire/recherche/page.tsx:291 · le titre exact de la section, alimentée par `nonVus` |
| « ne montre ses prix qu’aux comptes connectés » | lib/inventaire/liste-depart.ts:15-16 · `NOTE_ACCES_CONNEXION` |
| « Un bouton l’envoie dans votre inventaire, un autre dans votre liste d’achat » | app/inventaire/recherche/page.tsx:275-276 · les deux boutons, mot pour mot |
| « Rechercher une équivalence » | app/inventaire/recherche/page.tsx:278 · le bouton, qui relance `chercher` sur « autre marque » |
| « Rien n’entre dans vos données sans votre clic » | app/api/inventaire/recherche/route.ts:14 (« rien n’est stocké ici ») et app/api/inventaire/recherche/retenir/route.ts:9 (« c’est ce clic, et lui seul, qui écrit ») |
| « avec la date et le lien », « le tarif, la date, le lien et la provenance » | supabase/migrations/0048_inventaire_v2.sql:54-57 · `prix_vu_ht`, `prix_vu_le`, `prix_vu_url`, `prix_vu_source` |
| « vos tarifs négociés… dans une colonne à part » | supabase/migrations/0048_inventaire_v2.sql:49-51 · `prix_achat_ht`, « ce que l’artisan paie réellement (négocié) », distinct du prix vu |
| « une recherche coûte 2 crédits, 3 au niveau Expert » | lib/plans.ts:75 · `COUT_RECHERCHE = { standard: 2, pro: 2, expert: 3 }` |
| « sans crédit décompté » quand tout vient du cache | app/api/inventaire/recherche/route.ts:96 · le crédit n’est consommé que si `sortie.appels > 0` ; lib/recherche-fournisseurs.ts:65-66 · `depuisCache` |
| « la formule Studio en compte 250 par mois » | lib/plans.ts:60 · `creditsMois: 250` |
| « comprise dans la formule Studio, à 59 € par mois » | lib/plans.ts:46 et :60 · `inventaire.recherche_ia` dans `STUDIO`, `prixMois: 59` ; grille publique :133 |
| « le stock par lieu, le scan, les seuils, WhatsApp et l’export » | lib/plans.ts:46-47 (`inventaire.stock`, `canaux.whatsapp`, `export`) et :132 (libellé « Stock par lieu, scan, seuils ») |
| « Ça marche chez vos fournisseurs qui affichent leurs prix sans compte » | lib/inventaire/liste-depart.ts:28-30 · trois enseignes en `prix_publics: true`, vérifiées par curl le 03/09/2026 (:4). Leurs noms ne sont pas cités dans le post : sept enseignes sont écartées parce qu’elles bloquent les robots (:7-9), et nommer publiquement celles qu’on lit est un risque |
| « L’essai est gratuit et sans carte », « sans engagement. TVA non applicable, art. 293 B du CGI » | lib/plans.ts:58 · `creditsMois: 3, prixMois: 0` ; app/page.tsx:170 pour « sans engagement », app/page.tsx:161 pour la mention de TVA |

**Aucun chiffre non sourcé.**

---

## Ce qui n’est PAS dans cette publication, et pourquoi

La publication ne dit pas combien d’enseignes restent muettes. Sur les huit de la liste de départ, trois seulement affichent leurs prix aux visiteurs ; les cinq autres (Rexel, Gedimat, BigMat, Würth, Chausson Matériaux) les masquent. Et sept grandes enseignes ne sont même pas proposées : Point.P, Leroy Merlin, ManoMano, Bricoman, Cedeo, Legallais et Sonepar, bloquées par une protection anti-robot ou réservées aux comptes connectés (`lib/inventaire/liste-depart.ts:7-9`). Pour un plombier qui n’achète qu’au comptoir Cedeo, la recherche renverra surtout « Ce que je n’ai pas pu voir ». L’expliquer dans un post serait long, et injuste pour le carreleur ou le peintre, dont les fournisseurs affichent bien leurs prix : on l’écrit donc ici, et on laisse l’essai gratuit trancher chantier par chantier. Ne sont pas mentionnés non plus les plafonds de sécurité, 20 recherches par heure, 30 par jour et 200 par mois (`app/api/inventaire/recherche/route.ts:25-31`) : personne ne les atteint en usage normal, et les citer donnerait l’impression d’un compteur qui tourne.

---

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

---

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

---

# Publication n° 10 — « 29, 59, 99. Et l’essai sans carte. »

| | |
|---|---|
| **Canal** | Facebook (variante A) + Instagram (variante B) |
| **Vidéo** | publications/pub-10/vertical.mp4 — 21,6 s |
| **Lien tracké** | prestiapp.fr/a/facebook · prestiapp.fr/a/instagram |
| **Angle** | Les trois formules, ce que chacune ouvre, et le fait qu’on paie à la génération et non au nombre de clients. |

## Ce que la fonctionnalité fait, et où c’est écrit dans le code

Les prix et les volumes ne sont écrits qu’à un seul endroit : `lib/plans.ts:56-64`. On y lit l’essai à `creditsMois: 3` et `prixMois: 0`, l’Essentiel à 80 crédits et 29 €, le Studio à 250 crédits et 59 €, la Signature à 600 crédits et 99 €. La landing, la page d’abonnement, les cadenas de la console et les verrous serveur lisent tous cette même matrice, donc la publication ne peut pas annoncer un prix que le logiciel ne pratique pas.

Ce que chaque formule ouvre est empilé dans le même fichier. `BASE` (`lib/plans.ts:36-41`) contient `devis.ia`, `devis.prix_artisan`, `factures`, `factures.electronique`, `relances`, `site.essentiel`, `site.domaine_perso`, `plateforme.domaine_perso` et `canaux.email` : tout cela est donc dans les trois formules **et dans l’essai gratuit**, puisque `gratuit` reçoit `capacites: BASE` (`:58`). `STUDIO` (`:42-48`) ajoute `plateforme.ia.auto` (l’assistant qui répond seul), `inventaire.stock`, `inventaire.recherche_ia`, `site.pro` et `export`. `SIGNATURE` (`:49-54`) ajoute `plateforme.ia.expert`, `plateforme.regles`, `site.signature` et `support.prioritaire`.

Le décompte est dans `lib/credits.ts:11-24` : `consumeCredit(uid, tier, isFounder, coutForce)` est appelé à chaque génération de l’assistant, et le coût vient de `CREDIT_COST` (`lib/plans.ts:67`) : 1 crédit en Standard, 1 en Pro, 3 en Expert. Le quatrième paramètre sert à une seule chose, et la publication doit la dire puisqu’elle vend la fonction juste au-dessus : la recherche chez les fournisseurs a son propre tarif (`COUT_RECHERCHE`, `lib/plans.ts:75`), appliqué en `app/api/inventaire/recherche/route.ts:77`, et elle n’est décomptée que si le service a réellement été appelé et qu’il a abouti (`:96`). Une réponse servie par le cache ne coûte donc rien, et le tarif est affiché dans l’écran de recherche avant le lancement (`app/inventaire/recherche/page.tsx:185`). Aucun paramètre de cette fonction ne compte les clients, les chantiers ou les salariés, et c’est ce qui autorise la phrase « le nombre de clients n’entre pas dans le calcul ». `rendreCredit` (`lib/credits.ts:33-47`) rend le crédit quand la génération échoue de notre côté.

La recharge mensuelle est côté base : `consume_credit` remet le compteur à `p_credits_mois` quand la date de recharge est passée (`supabase/migrations/0008_secure_rpc.sql:16-18`). Le compteur est **remis à**, pas additionné : les crédits ne se reportent pas, et c’est exactement ce que dit la landing (`app/page.tsx:170`). Enfin, `app/page.tsx:161` affiche « TVA non applicable, art. 293 B du CGI » sur chaque carte d’offre.

---

## Variante A — Facebook

> Trois formules chez Presti : 29 €, 59 € et 99 € par mois.
>
> Avant de payer, l’essai donne trois crédits, sans carte bancaire. Vous branchez votre boîte mail, vous laissez arriver une vraie demande, et vous jugez sur votre chantier.
>
> À 29 €, l’Essentiel : 80 crédits par mois. L’assistant lit la demande et prépare la réponse ; vous validez avant l’envoi. Il chiffre le devis poste par poste, sur vos prix à vous : fournitures, main-d’œuvre, quantités, TVA. La facture reprend le devis sans une ligne à retaper, format électronique compris. Les relances partent seules quand le client ne répond plus à votre message.
>
> À 59 €, le Studio : 250 crédits. L’assistant peut répondre seul, si vous le décidez. Le stock arrive : atelier et camion sur un seul compte, le scan à la réception, un seuil d’alerte par article. Et la recherche d’une référence chez vos fournisseurs, depuis le chantier.
>
> À 99 €, la Signature : 600 crédits. Le chiffrage Expert pour les gros chantiers, les règles d’automatisation, le site cinématique, le support prioritaire.
>
> Votre nom de domaine est compris dans les trois. Vos clients voient votre adresse, pas la mienne.
>
> Un crédit se décompte quand l’assistant travaille : une réponse, un devis, une recherche chez vos fournisseurs. Le nombre de clients n’entre pas dans le calcul.
>
> 29 €, 59 € ou 99 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.
>
> L’essai est gratuit, sans carte : prestiapp.fr/a/facebook
>
> Vous commenceriez par laquelle ?

## Variante B — Instagram

> Trois crédits pour essayer Presti, sans carte bancaire.
>
> Vous branchez votre boîte mail. La demande arrive, l’assistant la lit, prépare la réponse et chiffre le devis : fournitures, main-d’œuvre, quantités, TVA. Vous relisez dans le camion, vous envoyez.
>
> Ensuite : 29 € par mois pour 80 crédits, 59 € pour 250 crédits et le stock du camion et de l’atelier, 99 € pour 600 crédits et le chiffrage Expert.
>
> Votre nom de domaine est compris dans les trois formules. 29 €, 59 € ou 99 € par mois, sans engagement. TVA non applicable, art. 293 B du CGI.
>
> L’essai se lance sans carte : prestiapp.fr/a/instagram
>
> Le devis du soir, ça vous prend combien d’heures par semaine ?

## Le premier commentaire (à poster soi-même, dans la minute)

> Une précision sur les crédits : une génération coûte 1 crédit avec le modèle Standard ou Pro, 3 crédits avec le modèle Expert. Si la génération échoue de notre côté, le crédit vous est rendu automatiquement.
>
> La recherche chez vos fournisseurs a son propre tarif, parce qu’elle va vraiment lire les pages des marchands. Il est affiché dans l’écran de recherche avant que vous lanciez, et rien ne se décompte quand la réponse sort du cache.
>
> Les crédits se rechargent au complet chaque mois et ne se reportent pas d’un mois sur l’autre.
>
> Le tableau formule par formule est en bas de la page d’accueil : prestiapp.fr/a/facebook

## Trois réponses type

**« 29 € par mois, ça fait cher pour faire des devis. »**
> Ce que vous avez dedans : 80 générations par mois, le devis chiffré sur vos prix, la facture qui en découle, les relances automatiques, et le site vitrine à votre nom de domaine. Sans engagement, vous arrêtez le mois où vous voulez. Et l’essai est là pour trancher avant de sortir la carte.

**« Et quand les crédits sont épuisés ? »**
> Ils se rechargent au complet chaque mois. En attendant, vous pouvez monter d’une formule, ou continuer à écrire vos devis et vos factures à la main dans Presti : ce que vous tapez vous-même ne coûte rien. Se décomptent les générations de l’assistant, et la recherche chez vos fournisseurs, à son tarif affiché.

**« Pourquoi vous ne facturez pas la TVA ? »**
> Je suis en franchise en base, article 293 B du CGI. 29 € affichés, 29 € prélevés, il n’y a rien à ajouter dessus. En contrepartie, il n’y a pas de TVA à récupérer sur cette dépense.

## Sourçage ligne à ligne

| Ce que la publication affirme | Où c’est vrai dans le code |
|---|---|
| « Trois formules chez Presti : 29 €, 59 € et 99 € par mois. » | `lib/plans.ts:59-61` — `essentiel` `prixMois: 29`, `studio` `59`, `signature` `99` |
| « l’essai donne trois crédits, sans carte bancaire » | `lib/plans.ts:58` — `gratuit`, `creditsMois: 3`, `prixMois: 0` ; `app/page.tsx:85` — « 3 crédits offerts · sans carte bancaire » |
| « 80 crédits », « 250 crédits », « 600 crédits » | `lib/plans.ts:59-61` — `creditsMois` 80 / 250 / 600 |
| « vous validez avant l’envoi » (à 29 €) | `plateforme.ia.auto` absent de `BASE` (`lib/plans.ts:36-41`), présent dans `STUDIO` (`:44`) ; grille `:121` — « Standard · vous validez chaque réponse » |
| « Il chiffre le devis poste par poste, sur vos prix à vous » | `devis.ia` et `devis.prix_artisan` dans `BASE` (`lib/plans.ts:39`) ; grille `:129` — « Devis chiffrés par l’IA, sur vos prix » |
| « La facture reprend le devis sans une ligne à retaper, format électronique compris » | `factures` et `factures.electronique` dans `BASE` (`lib/plans.ts:39`) ; `app/api/factures/route.ts:7` — la facture se crée à partir d’un `devis_id` ; grille `:130` — vrai pour les trois offres |
| « les relances partent seules » | `app/api/messages/route.ts:99` et `:164` — la relance est armée par la réponse de l’artisan ; grille `lib/plans.ts:131` — « Relances automatiques », vrai pour les trois |
| « L’assistant peut répondre seul, si vous le décidez. » (à 59 €) | `plateforme.ia.auto` dans `STUDIO` (`lib/plans.ts:44`) ; grille `:122` — « répond seul ou vous validez » |
| « atelier et camion sur un seul compte, le scan à la réception, un seuil d’alerte par article » | `inventaire.stock` dans `STUDIO` (`lib/plans.ts:46`) ; grille `:132` — « Stock par lieu, scan, seuils » ; `lib/inventaire/types.ts:99` — `seuil_alerte` |
| « la recherche d’une référence chez vos fournisseurs » | `inventaire.recherche_ia` dans `STUDIO` (`lib/plans.ts:46`) ; grille `:133`, drapeau `inventaireRecherche` levé (`lib/flags.ts:52`) |
| « Le chiffrage Expert » (à 99 €) | `lib/plans.ts:61` — `signature` est la seule offre vendue dont `tiers` contient `expert` |
| « les règles d’automatisation » | `plateforme.regles` dans `SIGNATURE` (`lib/plans.ts:51`), drapeau `plateformeRegles` levé (`lib/flags.ts:56`) |
| « le site cinématique » | `site.signature` dans `SIGNATURE` (`lib/plans.ts:52`) ; grille `:127` — « Signature · cinématique, slides 3D » |
| « le support prioritaire » | `support.prioritaire` dans `SIGNATURE` (`lib/plans.ts:53`) ; grille `:139` |
| « Votre nom de domaine est compris dans les trois. » | `site.domaine_perso` et `plateforme.domaine_perso` dans `BASE` (`lib/plans.ts:37-38`) ; grille `:128` — vrai pour les trois |
| « Un crédit se décompte quand l’assistant travaille : une réponse, un devis, une recherche chez vos fournisseurs. » | `lib/credits.ts:11-24` — `consumeCredit` appelé à chaque génération ; `lib/plans.ts:67` — `CREDIT_COST` 1 / 1 / 3 ; `lib/plans.ts:75` — `COUT_RECHERCHE`, le tarif propre de la recherche |
| « La recherche chez vos fournisseurs a son propre tarif » (commentaire) | `app/api/inventaire/recherche/route.ts:77` — le coût vient de `COUT_RECHERCHE` ; `app/inventaire/recherche/page.tsx:185` — le tarif est affiché avant le lancement |
| « rien ne se décompte quand la réponse sort du cache » (commentaire) | `app/api/inventaire/recherche/route.ts:96` — le décompte n’a lieu que si le moteur a vraiment appelé le service et qu’il n’a pas eu de panne |
| « Le nombre de clients n’entre pas dans le calcul. » | `lib/credits.ts:11` — la signature ne reçoit que `uid`, le niveau de modèle, le statut fondateur et un coût forcé ; aucun compteur de clients, de chantiers ou de salariés |
| « le crédit vous est rendu automatiquement » (commentaire) | `lib/credits.ts:33-47` — `rendreCredit` |
| « Les crédits se rechargent au complet chaque mois et ne se reportent pas » | `supabase/migrations/0008_secure_rpc.sql:16-18` — `cur := p_credits_mois` puis `set credits = p_credits_mois` ; `app/page.tsx:170` |
| « TVA non applicable, art. 293 B du CGI. » | `app/page.tsx:161` — la mention est sur chaque carte d’offre |
| « Sans engagement. » | `app/page.tsx:170` ; `app/parametres/SectionAbonnement.tsx:80` |

## Ce qui n’est PAS dans cette publication, et pourquoi

WhatsApp et les réseaux sociaux figurent dans la matrice cible (`canaux.whatsapp` dans `STUDIO`, `canaux.reseaux` dans `SIGNATURE`), mais leurs drapeaux sont à `false` (`lib/flags.ts:68-70`, commentaire du code : « vendu dans la grille cible, pas construit »). La grille publique les filtre donc (`lib/plans.ts:143`), et la publication ne les annonce pas, alors que la vidéo n° 9 les mentionne : c’est le seul écart de la série, et il se corrige dans la vidéo, il ne se recopie pas ici. On ne dit pas non plus combien Presti compte d’abonnés, on ne cite personne, on n’affiche aucun logo de client. Enfin, deux contraintes réelles sont écrites noir sur blanc dans le premier commentaire plutôt que noyées en bas du post : les crédits ne se reportent pas d’un mois sur l’autre, et la recherche chez les fournisseurs se décompte à son propre tarif, alors que la publication la vend deux paragraphes plus haut.

---

# Calendrier des dix — trois par semaine, jamais deux le même jour sur le même canal

L'ordre suit la logique de la campagne : on dit d'abord **ce que fait Presti**, puis on déroule les
fonctionnalités une par une, et on finit par les **prix**. Personne n'achète un prix avant de savoir
ce qu'il achète.

> **Calendrier resserré le 13/09 au soir** (demande de Benj : « poste-les maintenant ») : la formule Starter de Publora ne
> programme qu'à sept jours, les dix parutions tiennent donc dans la première semaine, jamais deux le même jour sur le
> même canal. L'ordre garde la logique : dire ce que fait Presti (01), puis les fonctionnalités, les prix en dernier (10).
> La 03 est en semaine 2 pour mémoire : déjà postée à la main par Benj, elle est écartée par .

| Semaine | Jour | Heure | N° | Canal |
|---|---|---|---|---|
| 1 | mardi | 7 h 15 | 1 | LinkedIn |
| 1 | mercredi | 7 h 15 | 2 | LinkedIn |
| 1 | mercredi | 19 h 30 | 4 | Facebook |
| 1 | jeudi | 12 h 30 | 6 (variante B) | Instagram |
| 1 | jeudi | 19 h 30 | 1 (variante B) | Facebook |
| 1 | vendredi | 7 h 15 | 5 | LinkedIn |
| 1 | vendredi | 19 h 30 | 8 | Facebook |
| 1 | samedi | 7 h 15 | 9 | LinkedIn |
| 1 | samedi | 12 h 30 | 7 | Instagram |
| 1 | dimanche | 19 h 30 | 10 | Facebook |
| 2 | lundi | 7 h 15 | 3 | LinkedIn |

Les créneaux visent les moments où un artisan regarde son téléphone : avant de partir
(6 h 30 – 7 h 30), la pause de midi, et le soir après 19 h.

**Ce calendrier est une proposition, pas une contrainte.** La seule règle qui compte : la n° 1 part
en premier, la n° 10 en dernier.

**Et au journal, à chaque publication** : date, heure exacte, canal, numéro, variante retenue. Sans
ça, on ne saura pas ce qui marche.

---

# Refaire les dix vidéos d'une seule commande

```bash
node scripts/pipeline.mjs --dry-run
```

L'étape 1 rend les trente fichiers, l'étape 2 les passe tous au juge, et **un seul échec arrête le
pipeline**. On ne publie jamais une vidéo que le juge a recalée.
