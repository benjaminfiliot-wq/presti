# Correctif des rideaux de transition

**État : écrit, testé, non appliqué.** Issu des entrées 8 et 9 de [`preuve-skills.md`](preuve-skills.md).

```bash
node scripts/patch-transitions.mjs
```

---

## Ce qui l'a déclenché

Deux skills lancées séparément, sur deux corpus d'idées sans rapport, tombent sur le même objet :
le rideau de transition de 0,32 s.

- `apple-design` §11 y arrive par la **vitesse par image** : « Keep the per-frame positional change
  below the perception threshold to avoid strobing. »
- `emil-design-eng` y arrive par une **règle nommée** : « Never animate from `scale(0)`. »

Aucune des deux ne connaît ce projet. Quand deux mesures indépendantes désignent le même endroit,
c'est que l'endroit est réellement le point faible.

## Les chiffres

Rendu à 30 i/s, transitions à `T = 0,32 s`, traversée du cadre entier.

| Famille | Course | Vitesse moyenne | Par image | Pic (`power2.inOut` = 3×) |
|---|---|---|---|---|
| `balai` | `xPercent −105 → 105` = 2 268 px | 7 088 px/s | 236 px | **709 px** |
| `glisse` | `yPercent 105 → −105` = 4 032 px | 12 600 px/s | 420 px | **1 260 px** |

Et l'iris, `{scale: 0} → {scale: 2,4}` en `power2.out` (une cubique chez GSAP, donc la vitesse est
maximale au départ). Première image après le départ : `p = (1/30)/0,32 = 0,104`, et
`1−(1−p)³ = 0,281`, donc `scale = 0,675`.

> Le disque passe de **0 à 729 px de large en une seule image**, sur un cadre de 1 080.
> **68 % de la largeur de l'écran apparaissent entre deux images.**

Un tournage réel n'a jamais ce problème : l'obturateur intègre le mouvement pendant l'exposition et
pose un flou. Un rendu image par image n'expose rien — chaque image est un instant net.

**Et rien de tout ça n'est visible pour `video-qa.mjs`.** Le juge compare des images entières et ne
voit qu'une chose : que le rideau change beaucoup de pixels. C'est même ce qu'on lui demande. Il
compte les coupes, il ne juge pas leur texture.

## Les deux moitiés n'ont pas le même statut

### 1. Le flou — sûr par construction, appliqué par défaut

```css
.balai:not(.echelle) { filter: blur(14px); }
```

Il n'agit que sur les **arêtes** du rideau. À mi-course, le rideau couvre toujours le cadre entier :
la différence d'image reste au-dessus de `COUPE_EPS = 0,085` et les 5 coupes / 10 s du §4 tiennent.
Aucun rendu n'est nécessaire pour l'affirmer — c'est de la géométrie, pas une mesure.

`:not(.echelle)` parce que `.balai` est la classe de base des trois familles. On vise les deux qui
**translatent**. L'iris, lui, grandit sur place : un flou dessus serait mis à l'échelle par le
`transform` et deviendrait un halo de 34 px.

> **La piste qu'on ne suit pas.** `apple-design` §14 conseille « make large moving objects
> semi-transparent while they travel ». Ici, ça ferait tomber le juge : un rideau translucide ne
> change plus assez de pixels pour que la coupe soit comptée. Le flou des arêtes, si.

### 2. L'iris — à mesurer, derrière `--iris`

```bash
node scripts/patch-transitions.mjs --iris
```

```diff
- {scale: 0,    opacity: 1} → {scale: 2.4, opacity: 0}  ease: "power2.out"
+ {scale: 0.06, opacity: 1} → {scale: 2.4, opacity: 0}  ease: "power2.inOut"
```

**Le vrai argument n'est pas le saut, c'est la cohérence.** `balai` et `glisse` sont **déjà** en
`power2.inOut`. L'iris était le seul des trois en `power2.out`, et aucun commentaire ne disait
pourquoi. Trois familles de transition qui ne s'accordent pas sur leur courbe, c'est une incohérence
avant d'être un défaut de rendu.

Mesuré sur la première image, cadre 1080 :

| Courbe | Première image |
|---|---|
| `power2.out` (actuel) | **729 px** |
| `power1.inOut` | 120 px |
| **`power2.inOut`** (celle de la fratrie) | **76 px** |

*(`power2.in` était mon premier réflexe : il ne fait que déplacer le problème à l'autre bout — le
disque saute alors de 713 px sur la **dernière** image.)*

**Pourquoi ça reste à mesurer.** Le tween fait `opacity: 1 → 0` **pendant** la croissance. Un iris
qui s'ouvre plus lentement en s'effaçant risque de ne plus produire assez de différence d'image
pour que le juge compte la coupe. Je ne peux pas le savoir sans rendre.

**Le protocole, sur une seule publication avant les trente :**

```bash
node scripts/patch-transitions.mjs --iris && node scripts/hf-composer.mjs 01 carre && node scripts/hf-rendre.mjs 01 carre && node scripts/video-qa.mjs publications/pub-01/carre.mp4
```

Si le nombre de coupes / 10 s passe sous 5, l'iris revient à `power2.out` et seul le flou reste.

## Pourquoi ce n'est pas déjà appliqué

Trois lots de rendu ont déjà été tués pour amélioration. J'ai dit à Benj que le suivant irait au
bout et que je ne m'arrêterais plus que pour quelque chose de **cassé**. Une arête de rideau un peu
dure n'est pas quelque chose de cassé.

*(Ce qui l'était, en revanche, et pour quoi je me suis arrêté : `shell: true` sur les appels ffmpeg,
qui faisait lire le `|` de `adelay=350|350` par cmd.exe comme un tube. Voir le journal.)*

Le patch est **idempotent** — le relancer ne fait rien de plus — et il **échoue bruyamment** si le
composeur a changé sous lui, au lieu d'appliquer la moitié d'un correctif.
