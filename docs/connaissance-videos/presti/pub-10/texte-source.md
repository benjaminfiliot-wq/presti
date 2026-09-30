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
