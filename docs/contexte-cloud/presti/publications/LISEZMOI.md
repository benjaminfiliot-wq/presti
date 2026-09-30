# Les dix publications, prêtes à publier

> **Ce dossier est fabriqué, pas écrit.** `node scripts/publications-ranger.mjs` le refait
> entièrement à partir de deux sources, qui restent les seules à corriger :
>
> - `plans/publications-10.md` — l'éditorial : variantes, premier commentaire, réponses type, sourçage ;
> - `promo-src/hf/publications.mjs` — les plans des vidéos.
>
> Corriger un mot **ici** ne sert à rien : la prochaine exécution l'écrase. Corrigez dans la source,
> relancez, et tout suit.

## Une publication, un dossier

| N° | Titre | Vidéo | Texte |
|---|---|---|---|
| **01** | « Presti, en vingt secondes » | 10.8 Mo | [`pub-01/texte.md`](pub-01/texte.md) |
| **02** | « Le premier qui répond emporte le chantier » | 10.3 Mo | [`pub-02/texte.md`](pub-02/texte.md) |
| **03** | « Le chantier se chiffre pendant que vous roulez » | 9.9 Mo | [`pub-03/texte.md`](pub-03/texte.md) |
| **04** | « La facture ne se ressaisit pas » | 11.4 Mo | [`pub-04/texte.md`](pub-04/texte.md) |
| **05** | « Votre vitrine, à votre nom, comprise » | 10.1 Mo | [`pub-05/texte.md`](pub-05/texte.md) |
| **06** | « Camion et atelier : un seul compte » | 9.8 Mo | [`pub-06/texte.md`](pub-06/texte.md) |
| **07** | « La référence se trouve sans quitter le chantier » | 10.2 Mo | [`pub-07/texte.md`](pub-07/texte.md) |
| **08** | « Le client se tait. Presti relance trois fois. » | 10.0 Mo | [`pub-08/texte.md`](pub-08/texte.md) |
| **09** | « Une seule boîte à relever » | 10.3 Mo | [`pub-09/texte.md`](pub-09/texte.md) |
| **10** | « 29, 59, 99. Et l’essai sans carte. » | 10.3 Mo | [`pub-10/texte.md`](pub-10/texte.md) |

Dans chaque dossier :

| fichier | quoi |
|---|---|
| `texte.md` | les deux variantes, le premier commentaire, les trois réponses type, le sourçage |
| `vertical.mp4` | la vidéo, 1080 × 1920, à joindre au post |
| `vertical-miniature.jpg` | la miniature |
| `planches-vertical/` | les images extraites de la vidéo — celles qu'on regarde avant de dire que c'est fini |

---

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

---

# Calendrier des dix — trois par semaine, jamais deux le même jour sur le même canal

L'ordre suit la logique de la campagne : on dit d'abord **ce que fait Presti**, puis on déroule les
fonctionnalités une par une, et on finit par les **prix**. Personne n'achète un prix avant de savoir
ce qu'il achète.

| Semaine | Jour | Heure | N° | Canal |
|---|---|---|---|---|
| 1 | mardi | 7 h 15 | 1 | LinkedIn |
| 1 | jeudi | 19 h 30 | 1 (variante B) | Facebook |
| 1 | samedi | 12 h 30 | 7 | Instagram |
| 2 | lundi | 7 h 15 | 3 | LinkedIn |
| 2 | mercredi | 19 h 30 | 4 | Facebook |
| 2 | vendredi | 7 h 15 | 2 | LinkedIn |
| 3 | mardi | 12 h 30 | 6 (variante B) | Instagram |
| 3 | jeudi | 7 h 15 | 5 | LinkedIn |
| 3 | samedi | 19 h 30 | 8 | Facebook |
| 4 | lundi | 7 h 15 | 9 | LinkedIn |
| 4 | mercredi | 19 h 30 | 10 | Facebook |

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

---

## Refaire un élément

Une phrase à changer dans un texte :

```bash
# on corrige dans plans/publications-10.md, puis :
node scripts/publications-ranger.mjs
```

Un plan à changer dans une vidéo (la n° 3 par exemple) :

```bash
# on corrige dans promo-src/hf/publications.mjs, puis :
node scripts/hf-composer.mjs 03 vertical && node scripts/hf-rendre.mjs 03 vertical && node scripts/publications-ranger.mjs
```

Tout refaire, captures comprises :

```bash
node scripts/captures-console.mjs && node scripts/hf-recadrer.mjs && node scripts/hf-composer.mjs tous vertical && for n in 01 02 03 04 05 06 07 08 09 10; do node scripts/hf-rendre.mjs $n vertical; done && node scripts/publications-ranger.mjs
```
