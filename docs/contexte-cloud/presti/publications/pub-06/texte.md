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
