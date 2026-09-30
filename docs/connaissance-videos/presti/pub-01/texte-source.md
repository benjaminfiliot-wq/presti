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
