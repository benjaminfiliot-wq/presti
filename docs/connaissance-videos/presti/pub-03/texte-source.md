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
