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
