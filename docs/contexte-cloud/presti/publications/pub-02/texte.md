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
