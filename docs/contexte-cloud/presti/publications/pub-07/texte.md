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
