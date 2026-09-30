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
