# Publications Presti — septembre 2026

> Les dix publications (LinkedIn, Facebook, Instagram) sont toutes parues le 2026-09-14, via Publora.
> Résultat Publora : 10 publiées, 0 échec. Source : `presti/plans/journal-publications.md` (tableau de
> clôture) et `presti/plans/publications-10.md` (textes, sourçage ligne à ligne, calendrier). Aucun chiffre
> d'audience ici : il n'y en a pas de sourcé.

## Les dix parutions

Heures telles qu'écrites au journal (heure locale). Le sujet est le titre de la publication dans
`presti/plans/publications-10.md`, raccourci.

| N° | Variante | Réseau | Parution | Sujet |
|---|---|---|---|---|
| 01 | A | LinkedIn | 2026-09-14 10 h 10 | Presti en vingt secondes |
| 01 | B | Facebook | 2026-09-14 10 h 11 | Presti en vingt secondes |
| 07 | A | Instagram | 2026-09-14 10 h 11 | La référence sans quitter le chantier |
| 02 | A | LinkedIn | 2026-09-14 10 h 12 | Le premier qui répond emporte |
| 04 | A | Facebook | 2026-09-14 10 h 12 | La facture ne se ressaisit pas |
| 06 | B | Instagram | 2026-09-14 10 h 12 | Camion et atelier, un compte |
| 05 | A | LinkedIn | 2026-09-14 10 h 12 | Votre vitrine, à votre nom |
| 08 | A | Facebook | 2026-09-14 10 h 12 | Le client se tait, Presti relance |
| 09 | A | LinkedIn | 2026-09-14 10 h 17 | Une seule boîte à relever |
| 10 | A | Facebook | 2026-09-14 10 h 17 | 29, 59, 99, essai sans carte |

La n° 03 (« Le chantier se chiffre pendant que vous roulez ») n'est pas dans la série : Benj l'a
postée à la main, elle a été exclue du pipeline (`--sauf=03`).

Les trois premières (01 A, 01 B, 07 A) avaient été programmées le 2026-09-13 au soir pour les 15, 17
et 19/09 ; elles sont parties le 2026-09-14 par « publier maintenant » depuis le tableau de bord
Publora. Les sept autres sont parties par le pipeline le 14/09 à 10 h 12 et 10 h 17 : l'ancre du
calendrier a été reculée au lundi 2026-09-07 (`PRESTI_ANCRE=2026-09-07`, commit a639c7c) pour que
chaque créneau soit passé et parte tout de suite (`--passe-maintenant`). Avec l'ancre du 14/09,
Publora refusait encore tout (403, limite de trois programmées) à 10 h 03.

## Comment ça a été publié

Publora, formule Starter : trois parutions programmées à la fois au plus, sept jours d'horizon. On
ne peut donc pas poser les dix d'un coup. Le calendrier a été resserré le 2026-09-13 au soir dans la
semaine du 14/09, jamais deux le même jour sur le même canal, la n° 01 en premier, la n° 10 (les
prix) en dernier.

Le postage passe par deux scripts du dépôt presti :

- `presti/scripts/pipeline.mjs` : rend les trente vidéos, les passe au juge (un seul échec arrête
  tout), programme sur Publora ce qu'elle accepte, saute ce qui est déjà au journal, et publie tout
  de suite un créneau déjà passé (`--passe-maintenant`).
- `presti/scripts/publier-suite.mjs` : rejoue le juge vidéo puis appelle le pipeline avec
  `--sans-rendu --programmer --sauf=03 --ancre=2026-09-14 --juge-vert=<journal du juge>
  --passe-maintenant`. Il était installé en tâche planifiée Windows « Presti publications » (toutes
  les six heures dès 6 h) ; en pratique le seul passage automatique, celui de 6 h, est resté
  suspendu sur le juge et a été tué ; les parutions sont sorties de passages lancés à la main le
  14/09 entre 10 h 03 et 10 h 17, dont un arrêté en 403 sur pub-09 avant d'être relancé.

Le 2026-09-14 au matin, les trois parutions programmées ont été publiées « maintenant » depuis le
tableau de bord Publora, les sept autres par le pipeline. La tâche planifiée « Presti publications »
est retirée : plus rien à programmer.

Chaque parution est au journal (`presti/plans/journal-publications.md`) avec date, heure, canal,
numéro et variante retenue.

## Pour la prochaine série

- Tenir le journal à chaque parution (date, heure exacte, canal, numéro, variante) : sans ça, on ne
  saura pas ce qui marche.
- Une ligne sans preuve ne part pas : chaque phrase d'une publication porte son sourçage dans le code
  (`presti/plans/publications-10.md`). Les douze brouillons du 2026-09-10 avaient été supprimés parce
  que le contrôle avait trouvé des affirmations fausses dans sept publications sur dix.
- Trois pièges du pipeline levés dans la nuit du 13 au 14/09 (commit aa4de54, 14/09 1 h 07) : une
  ligne déjà au journal arrêtait tout (elle est sautée) ; l'ancre « prochain lundi » sautait d'une
  semaine à minuit (`--ancre`) ; le juge vidéo restait suspendu après la dernière vidéo
  (`--juge-vert=<journal du juge>`, un journal de juge de moins de trente minutes). Le troisième a
  dû être repris le 14/09 à 10 h 03 (a35c997) : la tâche planifiée de 6 h était restée suspendue sur
  le juge.

Voir aussi [[Guide-Presti-Demarchage]].
