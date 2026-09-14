# Registre d'usage des skills — prompt v14 §1

> **La règle** : pour chaque skill invoquée, quatre lignes — son nom, l'entrée donnée, **la sortie
> brute**, et ce qui a changé à cause d'elle. Une skill sans ces quatre lignes est réputée non
> utilisée, et le bloc est à refaire.
>
> Le v13 demandait d'utiliser les skills LinkedIn, Facebook et animation. **Aucune ne l'a été.**
> Ce fichier existe pour que ça ne puisse plus passer inaperçu.

---

## 1. `animation-vocabulary` — 2026-09-10

**Entrée donnée :**

> Composer des vidéos verticales 1080×1920 de 20-26 s, typographiques, sur fond nuit #0A0C11 avec
> accent corail #D97757, intégrant des captures produit. Objectif mesuré : au moins 5 changements de
> plan détectables par 10 s (différence d'image > 0,085 en gris), aucune image figée au-delà de
> 0,8 s, et une énergie de mouvement moyenne ≥ 0,020. Besoin du vocabulaire des transitions et des
> mouvements de fond.

**Sortie brute retenue** (extraits littéraux du glossaire de la skill) :

```
Reveal — Content is uncovered gradually, often by animating a clip-path or mask.
Mask — Hiding or revealing parts of an element using a shape or gradient — like clip-path,
       but with soft, fadeable edges.
Direction-aware transition — Content slides one way going forward and the opposite way going
       back, so navigation has a sense of direction.
Continuity transition — A change that keeps the user oriented by visually connecting before
       and after. For example, making the same rectangle bigger and smaller.
Parallax — Background and foreground move at different speeds while scrolling, creating depth.
Orbit — An element circling around another in a continuous path.
Float — A gentle, continuous up-and-down drift that makes a static element feel alive and
       weightless.
Idle animation — Subtle motion that plays while an element is just sitting there, waiting to
       be interacted with.
Shimmer — A placeholder with a moving sheen shown while content loads.
Typewriter — Text appearing one character at a time, as if being typed.
Stagger — Animate several items one after another with a small delay between each, creating
       a cascade.
Asymmetric easing — A curve that accelerates and decelerates at different rates. Feels more
       alive than a symmetric one.
Linear — Constant speed. Avoid for UI; reserve for spinners or marquees.
```

**Ce que ça a changé, et c'est du concret :**

Le juge `scripts/video-qa.mjs` rendait trois échecs sur `publications/pub-01/vertical.mp4` :
plan figé 1,88 s, énergie d'image 0,0148 pour 0,020 exigés, et 1,1 coupe / 10 s pour 5 exigées.
Le glossaire a donné le nom de chaque remède, et chaque nom est devenu une ligne de
`scripts/hf-composer.mjs` :

| Échec mesuré | Procédé nommé | Où c'est écrit |
|---|---|---|
| Rythme des coupes | **Reveal** par masque (le « balai » corail), **direction-aware** (le rideau), raccord d'échelle | `hf-composer.mjs`, bloc « Le changement de plan » — trois familles qui alternent, jamais deux fois la même de suite |
| L'image vit | **Parallax** sur trois couches, **Orbit** du halo, **Float** du grain | `hf-composer.mjs`, bloc « Le fond vivant » — cycles de 4,3 s / 6,7 s / 2,9 s, premiers entre eux |
| Plan figé | **Idle animation** — le fond vivant tourne sous TOUS les plans, y compris ceux dont le texte ne bouge plus | même bloc |
| *(non signalé par le juge, relevé par le glossaire)* | **Linear — « Avoid for UI »** : mes dérives étaient en `ease: 'none'` | remplacées par **asymmetric easing** (`sine.inOut`) |

Et une correction d'amplitude que le glossaire a rendue évidente : mes dérives valaient 2 à 4 % du
cadre. À cette échelle, « ça bouge » est vrai sur le papier et faux à l'écran — et le juge le
mesurait. Portées à 8-14 %.

**Ce que je n'ai PAS pris dans le glossaire, et pourquoi** : `Bounce`, `Rubber-banding`,
`Squash & stretch`. Ce sont des procédés de jeu ou d'interface tactile. Sur une publicité qui vend
la retenue d'un logiciel à des artisans, ils feraient exactement le contraire du propos.

---

### Couverture du tableau §1.1

Les huit skills d'animation et de design que le §1.1 nomme, et où chacune est prouvée :

| Skill du §1.1 | Entrée | Ce qu'elle a changé |
|---|---|---|
| `animation-vocabulary` | **1** | Le vocabulaire des trois familles de transition et du fond vivant |
| `animate` | **11** | La courbe de l'iris — et l'incohérence de courbe entre les trois familles |
| `find-animation-opportunities` | **4** | Trois occasions retenues, et surtout celles rejetées |
| `improve-animations` | **10** | Alternation réelle des familles, dérives normalisées en vitesse |
| `review-animations` | **⛔** | **Non exécutable par moi** — réservée à l'invocation de Benj. Voir le bloc dédié |
| `apple-design` | **8** | La vitesse par image des rideaux ; la typographie, marginale et dite comme telle |
| `emil-design-eng` | **9** | `scale(0)` sur l'iris — une règle nommée que je violais |
| `presti-design` | **7** | Deux couleurs corrigées — et la skill elle-même déclarée périmée |

Les skills LinkedIn et Facebook suivent, aux entrées **2**, **3**, **5** et **6**.

La seule case non remplie est `review-animations`, et elle ne peut pas l'être par moi.

---

## 2. `linkedin-skills` et `facebook-skills` — le contenu réel, listé sur disque

Le v14 §1.2 dit : « Commence par lister leur contenu réel — n'invente pas les noms. » Fait, dans
`C:\Users\benja\.claude\plugins\marketplaces\` :

**LinkedIn (11)** : `linkedin-comment-drafter` · `linkedin-content-planner` ·
`linkedin-employee-advocacy` · `linkedin-engager-analytics` · `linkedin-hook-extractor` ·
`linkedin-humanizer` · `linkedin-post-writer` · `linkedin-profile-optimizer` ·
`linkedin-reply-handler` · `linkedin-repurposer` · `linkedin-thread-monitor`

**Facebook (8)** : `fb-audience-insights` · `fb-content-planner` · `fb-engagement-drafter` ·
`fb-hook-extractor` · `fb-humanizer` · `fb-page-optimizer` · `fb-post-writer` · `fb-repurposer`

⚠️ Le préfixe Facebook est **`fb-`**, pas `facebook-`. Une commande écrite de mémoire échouerait.

---

## 3. `linkedin-humanizer --mode audit` — 2026-09-10

**Entrée donnée :** les 3 238 mots publiables de `plans/publications-10.md` (242 lignes citées,
les dix publications, deux variantes chacune).

**Sortie brute du SKILL.md**, tier STRICT, les règles applicables à du français :

```
reveal bridges measured reach-negative ("The result?" -4.8%, "It's not X, it's Y" -4.9%,
       "Stop X, start Y" -6.7%, "Here's what/how" -4.3%)
all 6 forms of negative parallelism
stacked or perfectly parallel triads and any 3rd triad in a post
cliché closer tells ("What do you think?", "Tag someone who needs this")
em dash density above 1 per 100 words  [tier FORENSIC]
sincerity announcements ("let me be honest") are a named 2026 tell
       [strong: tropes.fyi false vulnerability; Schilke & Reimann 2025]
```

Et sa réserve, que je reprends telle quelle parce qu'elle évite une illusion : *« it does not make
text "pass" GPTZero, Pangram, Turnitin or Originality »*. On ne cherche pas à tromper un détecteur ;
on retire ce que des lecteurs humains et le filtre anti-slop de LinkedIn sanctionnent.

**Sortie brute de l'audit** (`scripts/audit-humanizer.mjs`, transposition française des règles) :

```
BLOQUANT       « Ce n'est pas X, c'est Y » — reveal bridge « It's not X, it's Y »
               4 occurrence(s) · −4,9 % de portée
                » ce n'est pas un gain de temps : c'est
                » ce n'est pas une promesse, c'est
                » Ce n'est pas une réforme du métier, c'est
                » ce n'est pas le sujet du post : le sujet, c'est
AVERTISSEMENT  Sincérité annoncée — 2 occurrences (« Je sais que c'est », « soyons clairs »)
AVERTISSEMENT  Parallélisme négatif — 2 occurrences
OK             Densité de tirets cadratins — 0,99 pour 100 mots (plafond ≈ 1)
✗ 1 règle(s) bloquante(s).
```

**Ce que ça a changé — huit phrases réécrites, et un tic découvert.**

Les quatre « Ce n'est pas X, c'est Y » n'étaient pas une coïncidence : c'est ma tournure par défaut,
répétée sur quatre publications différentes, et c'est la construction la plus coûteuse en portée de
tout le catalogue. Je ne l'aurais jamais vue en relisant — chacune, isolée, sonne bien.

Et le chiffre qui m'a le plus surpris : **0,99 tiret cadratin pour 100 mots, pour un plafond à 1.**
J'écris exactement à la limite du tier FORENSIC, sans l'avoir jamais su.

**Après correction** : les quatre règles structurelles à **0 occurrence**, cadratins à 0,96.
`✓ Aucun bloquant.`

**Ce que je n'ai PAS repris de la skill, et pourquoi** : ses listes de vocabulaire 2026 (*leverage,
foster, robust, streamline, elevate*…) sont anglaises et ne traversent pas — les transposer aurait
été inventer des règles en prétendant les citer. La skill sert à la STRUCTURE, pas au ton : c'est
exactement la réserve que le prompt pose au §1.2.

**Rejouable** : `node scripts/audit-humanizer.mjs` — sortie 1 s'il reste un bloquant.

---

## 4. `find-animation-opportunities` — 2026-09-10

**Entrée donnée :** `promo-src/hf/pub-01-vertical/index.html`, composition rendue et déclarée verte
par le juge — 17 plans, 26,1 s. Consigne : chercher les occasions qui valent pour un **film**, pas
pour une interface (personne ne clique, il n'y a ni survol ni scroll).

**Sortie brute retenue** (le Gate de la skill, littéral) :

```
1. Frequency — Rare / first-time (onboarding, empty states, success, celebration)
   → Eligible — this is where the delight budget lives
2. Purpose — must be one of: Feedback / Spatial consistency / State indication /
   Preventing a jarring change / Explanation / Delight
   "It looks cool" is not on this list.
4. Function — Decoration on functional, information-dense UI hinders.
   Data the user is trying to *read* or *act on* should not move for style.
```

Et sa posture, que je reprends parce qu'elle va à contre-courant de ce que le juge m'a poussé à
faire : *« An opportunity finder that suggests motion everywhere is worse than useless. »*

### Part 1 — les trois occasions retenues

| # | Où | Aujourd'hui | Objet | Mouvement proposé |
|---|---|---|---|---|
| 1 | `pub-01-vertical/index.html:343` — la ligne de code | Entre d'un bloc : `opacity 0→1, x −18→0` en 0,4 s | **Explanation** — le mouvement montre la chose | **Typewriter**, caractère par caractère, `stagger: 0.026`, `ease: none`. C'est le seul plan du film où le procédé est nommé par le glossaire *et* juste par le sens : on regarde du code s'écrire |
| 2 | `:342` + `:345` — la fenêtre de code | **Deux tweens sur la même propriété `y`**, qui se chevauchent de 18,46 à 18,96 s : l'entrée monte `y 40→0`, la dérive descend `y 26→−26` | **Preventing a jarring change** | Retirer `y` de la dérive, ne garder que l'échelle. Deux mouvements contradictoires sur un même élément, ce n'est pas de l'animation, c'est un bug |
| 3 | `p10` — la carte « Brouillon » | Dérive latérale de **172 px en 1,8 s** sur le plan qui a la plus courte durée de lecture | **Function** (gate 4) | Ramener à ±48 px. C'est le seul mot que le spectateur doit LIRE sur ce plan |

### Part 2 — rejeté délibérément (section exigée par la skill)

- **Le total qui se compte** (`p07`, « Et le total »). Le glossaire nomme **Number ticker** et
  **Tabular numbers**, et ce serait la plus belle animation disponible du film. **Rejeté : le total
  est à l'intérieur d'une capture PNG.** L'animer voudrait dire superposer un nombre synthétique
  au-dessus du produit — une interface fabriquée, interdite par le §2. *La règle d'honnêteté
  interdit ici la meilleure animation possible, et c'est le bon arbitrage.*
- **Les entrées de texte mot à mot** (tous les cartons). **Rejeté : déjà en place**, stagger 55 ms.
  En rajouter (lettres) sur des titres de six mots les rendrait illisibles à 1,4 s de plan.
- **Une transition supplémentaire sur les coupes de 0,12 s** (`p04`, `p08`). **Rejeté : la coupe
  sèche EST le procédé.** L'animer reviendrait à supprimer ce qu'elle sert à faire.
- **Un mouvement de plus sur le fond.** **Rejeté par le gate 4** : trois couches suffisent, et le
  juge mesure déjà 0,0348 pour un plancher à 0,020. Ajouter serait du bruit.

### Part 3 — verdict

Le film est **au-dessus** du bon niveau de mouvement, pas en dessous : le juge m'a poussé à en
ajouter jusqu'à passer ses seuils, et le gate 4 de cette skill dit l'inverse à l'endroit précis où
il faut lire. La correction n° 2 est la plus importante des trois — ce n'est pas une occasion, c'est
un défaut que la mesure ne pouvait pas voir.

**Ce que ça a changé :** les trois appliquées dans `scripts/hf-composer.mjs`, les trente
compositions régénérées, et **le lot de rendu arrêté puis relancé** — corriger après aurait coûté un
second passage de cinq heures.

---

## ⛔ `review-animations` — non exécutable par moi

```
Skill review-animations cannot be used with Skill tool due to disable-model-invocation.
Ask the user to run /review-animations themselves — it cannot be invoked via the Skill tool.
Do not replicate this skill's workflow by other means.
```

Le v14 §1.1 l'impose après rendu, et je ne peux pas la lancer : elle est réservée à l'invocation
explicite de Benj. **C'est à lui de taper `/review-animations`.** Je ne contourne pas — la skill
interdit explicitement d'en reproduire le travail autrement, et la contourner viderait de son sens
le registre que ce fichier tient.

Vérifié pour les sept autres : `find-animation-opportunities`, `improve-animations`, `apple-design`,
`emil-design-eng`, `presti-design`, `animate`, `animation-vocabulary` sont toutes invocables.

---

## 5. `fb-humanizer --mode audit` — 2026-09-10

**Entrée :** les onze variantes Facebook et Instagram de `plans/publications-10.md`.

**Sortie brute du SKILL.md** — les quatre règles que le catalogue LinkedIn ne porte pas :

```
Facebook-format scrubs (always apply): the under-80 short version when the point fits,
the "See more" fold, engagement bait, hashtag and emoji limits, bare-link framing.

- A first line that needs the second line to make sense (the "See more" fold).
- Engagement bait ("LIKE and SHARE if you agree", "comment YES", "tag 3 friends").
- 5+ hashtags stuffed at the bottom.
- A bare external link with no framing text.
```

**Sortie brute de l'audit** (`scripts/audit-fb.mjs`) :

```
BLOQUANT  lien nu en clôture : « prestiapp.fr » — sans texte de cadrage
          → sur les ONZE variantes, sans exception
BLOQUANT  la première ligne ne tient pas seule : « 29, 59, 99 €. Ce que ça achète, en clair :… »
✗ 12 bloquants.
```

**Ce que ça a changé.** Onze cadrages écrits, **tous différents** — dix fois la même phrase serait
elle-même un signal. Et la première ligne de pub-07 B se terminait par deux-points : le pli
« See more » la coupait en plein milieu de son idée sur mobile.

Après : `✓ Aucun bloquant.`

**Non repris** : le point idéal « sous 80 caractères ». Mes posts font 370 à 1 130 signes. La skill
elle-même dit *« the under-80 short version **when the point fits** »* — et une publication qui
explique pourquoi un devis ne part pas tout seul ne tient pas en 80 signes. Le catalogue LinkedIn
mesure d'ailleurs l'inverse : au-delà de 1 000 signes et 20 phrases, **1,18× et 1,14×** de portée.

---

## 6. `linkedin-hook-extractor` → `references/hook-formulas.md` — 2026-09-10

La skill sert à décortiquer le post viral de **quelqu'un d'autre** à partir d'une URL. Je n'en avais
pas à étudier, et en chercher un au hasard aurait été hors sujet. En revanche sa référence porte les
**notes de portée 2026**, chiffrées et sourcées, et celles-là s'appliquent à mes propres accroches.

**Sortie brute** (`references/hook-formulas.md`, extraits littéraux) :

```
question-first is -34% median likes across all follower bands [vendor]
an odd-precision number as the first line is the single largest positive first-line signal
       in the 2026 data, +34% median likes [vendor]
"Here's what/how" in the hook window is -4.3% [vendor]
"It's not X, it's Y" (-4.9% when it is the post's frame [vendor])
"Stop X, start Y" ... -6.7% vs the author's own baseline [vendor]
a closing question is +3% [vendor]
end with a P.S. if there is a follow-up (+7.5% [vendor])
past 1,000 chars and 20 sentences, both reach-positive (1.18x and 1.14x [crowd])

The headline finding: 98-100% of the top 100 human creators still use the flagged devices.
The penalty attaches to autopilot density and missing specifics, not to the device itself.
```

**Sortie brute de l'audit** (`scripts/audit-accroches.mjs`) :

```
pub-04 A · « Vous lisez nos conversations ? »        −34 %
pub-04 B · « Vous lisez nos conversations ? »        −34 %
pub-09 A · « Il me reste combien de coudes de 16 ? » −34 %
3 accroche(s) à −34 % · 9 accroche(s) à +34 %
```

**Ce que ça a changé, et la nuance compte.** Le catalogue ne dit pas de supprimer la question : il
dit qu'elle vaut **−34 % en ligne 1 et +3 % en clôture**. C'est le même geste à l'autre bout du
post. Les trois questions ont donc été **déplacées**, et remplacées en ligne 1 par ce qui vaut
+34 % — un nombre :

- pub-04 → « Quatre mécanismes m'empêchent de lire vos conversations. »
- pub-09 → « Trois lieux, un seul stock : le camion, le dépôt, le chantier. »

La question vive de pub-09 (« Il me reste combien de coudes de 16 ? ») n'est pas perdue : elle ouvre
le paragraphe suivant, là où elle ne coûte rien.

Après : **0 accroche à −34 %, 12 à +34 %.**

**Rejeté** : ajouter un P.-S. partout pour capter les +7,5 %. Le catalogue le conditionne à
*« if there is a follow-up »* — un post-scriptum sans suite réelle est du remplissage, et la
publication n° 6 (le défaut du vitrier) s'en trouverait affaiblie précisément là où sa gravité fait
son effet.

**Rejouable** : `node scripts/audit-accroches.mjs` — sortie 1 s'il reste une accroche à −34 %.

---

## 7. `presti-design` — 2026-09-10 — ⚠️ la skill est PÉRIMÉE

**Entrée :** les compositions de `promo-src/hf/`, avec la palette employée et la typographie.

**Sortie brute de la skill** (section Tokens, littérale) :

```
- Fond nuit `--paper:#0A0C11` · surfaces `--surface:#13161F` / `--surface-2:#1A1E29`
- Texte `--ink:#EDEFF4` / `--muted:#8B93A2` · lignes `rgba(255,255,255,.08)`
- Accent bleu `--accent:#6C8CFF` + violet `--accent-2:#8A6BFF` · cyan HUD `#3EE0F0`
- Polices : display Bricolage Grotesque, corps Hanken Grotesk, data JetBrains Mono
```

**Le conflit.** La skill annonce un accent **bleu**. Le prompt v14 §2 dit **corail `#D97757`**, et
c'est ce que j'ai employé partout. L'un des deux a tort, et ce n'est pas une question de goût :
dix publicités dans la mauvaise couleur de marque, c'est une faute qui se voit.

**Ce que le produit porte vraiment** (`app/globals.css`, namespace `.lp-*`, ligne 1101) :

```css
.lp{ --co:#D97757; --co2:#E8946F; --co-deep:#B85C3C; --co-glow:rgba(217,119,87,.5);
     --bg:#09090C; --ink:#ECEAE6; --ink2:#C7C2BA; --muted:#8B867D; --faint:#827D74; }
```

**Verdict : la skill est périmée, le corail est la marque.** Le bleu `#6C8CFF` ne subsiste qu'à
trois endroits — une barre HUD, un bouton `.jv-save`, un dégradé radial — c'est-à-dire des vestiges
du HUD circulaire « façon Jarvis » que **la skill elle-même dit avoir été supprimé le 07/09**. Elle
décrit un produit qui n'existe plus.

**Ce que ça a quand même changé, parce qu'elle avait raison sur deux points plus fins :**

| Mon token | Le produit | Pourquoi ça compte |
|---|---|---|
| crème `#F3EEE6` | **`#ECEAE6`** | écart imperceptible, mais autant être juste |
| gris sourd `#6C7280` | **`#8B867D`** | le mien est **froid**, celui du produit est **chaud**. Sur une palette corail, un gris bleuté jure d'une façon qu'on ne sait pas nommer mais qu'on voit |

Les deux sont corrigés dans `scripts/hf-composer.mjs`, avec la source en commentaire.

**Un arbitrage assumé** : je n'ai **pas** arrêté le lot de rendu en cours pour ça. L'écart entre
`#F3EEE6` et `#ECEAE6` est invisible, et celui du gris n'apparaît que sur les plans `sourd`. Cinq
heures de machine pour ça ne se justifient pas ; le prochain rendu complet sera exact.

**Et une tâche est ouverte** pour corriger la skill : suivie aujourd'hui, elle produit du bleu sur
un produit corail. Elle a failli faire dériver dix publicités.

---

## 8. `apple-design` — 2026-09-10

**Entrée :** les trente compositions de `promo-src/hf/`, et la question qui m'intéressait : dans une
skill entièrement bâtie sur le geste — ressort, vélocité, interruption — qu'est-ce qui survit quand
personne ne touche l'écran ?

**La plus grande partie ne survit pas, et il faut le dire.** Les §1 à §10 traitent de la réponse au
doigt, du suivi 1:1, de l'interruptibilité, du transfert de vélocité, de la projection d'élan, du
caoutchouc aux bords. Un film rendu image par image depuis une timeline en pause n'a **aucun** de
ces objets : pas de pointeur, pas de relâchement, rien à interrompre. Les citer serait de la
décoration. Deux sections seulement mordent sur un film, et elles mordent pour de bon.

### §11 — « Smoothness is about *what's in the frames*, not just the frame rate »

Sortie brute :

> « Keep the per-frame positional change below the perception threshold to avoid strobing. For very
> fast motion, a subtle **motion blur / stretch** encodes speed and reads better than a hard sharp
> streak. »

**Mesuré sur mes propres transitions**, pas estimé. Les trois familles durent `T = 0.32` s et
traversent le cadre entier ; le rendu est à 30 i/s. Le déplacement par image :

| Famille | Course | Vitesse moyenne | **Par image** | Pic (`power2.inOut` = 3× la moyenne) |
|---|---|---|---|---|
| `balai` | `xPercent −105 → 105` = 2268 px | 7 088 px/s | **236 px** | **709 px** |
| `glisse` | `yPercent 105 → −105` = 4032 px | 12 600 px/s | **420 px** | **1 260 px** |

Le rideau `glisse`, à son pic, franchit **1 260 px entre deux images consécutives sur un cadre haut
de 1 920**. Les deux tiers de l'écran, d'un coup, sans rien entre les deux. Un tournage réel n'a
jamais ce problème : l'obturateur intègre le mouvement pendant l'exposition et pose un flou. Un
rendu image par image n'expose rien — chaque image est un instant net. D'où l'arête dure.

C'est exactement ce que la skill décrit, et c'est **invisible pour mon juge** : `video-qa.mjs`
compare des images entières et ne voit qu'une chose, que le rideau change beaucoup de pixels. C'est
même ce que je lui demande. Il compte les coupes, il ne juge pas leur texture.

### §15 — « Tracking is size-specific — never one value for all sizes »

Sortie brute :

> « A fixed `letter-spacing` is wrong somewhere. Tighten headings, leave body near `0`. » ·
> « Leading tracks size inversely. Tight on large headings, looser on body copy. »

**Mesuré sur les 297 titres réellement émis** par `taillePolice()` :

```
  4 × 121px    12 × 128px    12 × 136px    22 × 146px
 18 × 156px    30 × 168px   199 × 176px
```

L'amplitude va de 121 à 176 px — **un facteur 1,45**, et 199 titres sur 297 sont plaqués contre le
plafond de 176. Or `.titre` porte `letter-spacing: -0.035em` et `line-height: 0.96`, valeurs uniques.

**Et ici je contredis la skill sur un point, en connaissance de cause.** Elle raisonne en pixels, où
un `letter-spacing` figé est faux à une extrémité. Le mien est en `em` : il se met déjà à l'échelle
tout seul. Ce que la skill demande en plus, c'est que le **rapport** bouge — plus serré à 176 px,
plus lâche à 121. Sur un facteur 1,45 avec 67 % des titres au plafond, l'écart idéal est de l'ordre
de `-0.045em` contre `-0.025em`, soit **moins d'un pixel** de chasse par lettre au bas de la plage.

**Verdict honnête : elle a raison sur le principe, et l'effet est marginal ici.** Une correction, pas
un défaut. Je l'écris parce qu'un registre de preuves qui ne contient que des skills victorieuses ne
prouve rien.

### Ce que ça change, et ce que ça ne change pas

Le §11 est un vrai constat, chiffré, que rien d'autre dans ce projet n'aurait attrapé. Le correctif
est court : un flou directionnel sur le rideau en mouvement — voir l'entrée 9, où `emil-design-eng`
arrive au même endroit par un autre chemin.

**Je n'ai pas arrêté le lot de rendu pour l'appliquer**, et c'est délibéré. Le même arbitrage qu'au
§7 : trois lots ont déjà été tués pour amélioration, j'ai dit à Benj que celui-ci irait au bout et
que je ne m'arrêterais plus que pour quelque chose de cassé. Une arête de rideau un peu dure n'est
pas quelque chose de cassé. Le correctif est écrit, testé et prêt — `plans/patch-transitions.md` —
et se lance en une commande quand Benj le veut.

---

## 9. `emil-design-eng` — 2026-09-10

**Entrée :** les mêmes trente compositions. La skill impose son format de sortie — « When reviewing
UI code, you **MUST** use a markdown table with Before/After columns » — donc c'est ce format.

**Une règle nommée, littérale, que je viole.** Sortie brute :

> ### Never animate from scale(0)
> « Nothing in the real world disappears and reappears completely. Elements animating from
> `scale(0)` look like they come out of nowhere. Start from `scale(0.9)` or higher, combined with
> opacity. »

Et dans `scripts/hf-composer.mjs`, la famille `echelle` :

```js
tl.fromTo(`#${id}-tr`, {scale: 0, opacity: 1}, {scale: 2.4, opacity: 0, duration: 0.32, ease: "power2.out"})
```

`scale: 0`. Mot pour mot ce que la règle interdit.

**Sauf que ma première réaction était de me défendre, et elle était mauvaise.** Un iris qui s'ouvre
depuis un point est une convention de cinéma vieille d'un siècle ; la règle d'Emil parle d'éléments
d'interface qui *apparaissent*, pas de volets de montage. J'allais classer ça « hors sujet ».

**Puis j'ai calculé, et c'est moi qui avais tort.** `power2.out` chez GSAP est une cubique : la
vitesse est maximale au tout début. À 30 i/s, la première image après le départ tombe à
`p = (1/30)/0,32 = 0,104`, et `1−(1−p)³ = 0,281`, donc `scale = 2,4 × 0,281 = 0,675`.

> Le disque passe de **0 à 729 px de large en une seule image** — sur un cadre de 1 080. **68 % de
> la largeur de l'écran apparaissent entre deux images.**

Ce n'est plus un iris qui s'ouvre : c'est un disque qui *surgit* déjà à moitié déployé. La règle
d'Emil avait raison, pour une raison qu'elle n'énonce même pas — non pas parce que `scale(0)` est
laid, mais parce qu'avec une easing qui décélère, `scale(0)` n'est jamais rendu et la première image
visible est déjà énorme. **La convention du cinéma n'est pas en cause, l'easing l'est.**

### Revue au format exigé

| Before | After | Why |
|---|---|---|
| `{scale: 0}` sur `.echelle` | `{scale: 0.06}` | Rien n'apparaît de rien. Un disque de 65 px sur la première image, c'est une forme visible qui s'ouvre |
| `ease: "power2.out"` sur l'iris | `ease: "power2.inOut"` | `out` décélère : il met 68 % de l'écran dans la première image. Et `inOut` est la courbe des deux autres familles |
| Rideau plein en translation, arête nette | `filter: blur(14px)` sur `#${id}-tr` | À 1 260 px/image au pic, l'arête strobe. Le flou en tient lieu d'obturateur (§11 d'`apple-design`) |
| `transition: all` | *(absent — déjà propre)* | Rien à corriger : le générateur n'émet que des propriétés nommées |
| `ease-in` sur une entrée | *(absent — déjà propre)* | Les entrées de texte sont en `power3.out`, ce que la skill prescrit |

**Les deux dernières lignes comptent autant que les trois premières.** J'ai cherché les deux fautes
les plus courantes du catalogue et je ne les ai pas trouvées : le générateur n'écrit jamais
`transition: all`, et aucune entrée n'est en `ease-in`. Une revue qui ne trouve que des fautes est
une revue qui n'a pas cherché les non-fautes.

### La convergence, et c'est le vrai résultat

Deux skills lancées séparément, sur deux corpus d'idées différents — Apple et le geste d'un côté,
Emil et le détail d'interface de l'autre — **atterrissent sur le même objet** : le rideau de
transition de 0,32 s. `apple-design` §11 y arrive par la vitesse par image ; `emil-design-eng` y
arrive par `scale(0)` et par « use blur to mask imperfect transitions ». Aucune des deux ne connaît
mes transitions. Quand deux mesures indépendantes désignent le même endroit, c'est que l'endroit est
réellement le point faible.

**Le correctif est écrit dans `plans/patch-transitions.md`, et ses deux moitiés n'ont pas le même
statut** — c'est le point que je devais trancher avant de le proposer, parce que Benj peut le lancer.

**Le flou est sûr par construction.** Il n'adoucit que les **arêtes** du rideau, jamais sa couverture
maximale : à mi-course le rideau couvre toujours le cadre entier, donc la différence d'image reste
au-dessus de `COUPE_EPS = 0,085` et les 5 coupes / 10 s du §4 tiennent. C'est aussi pourquoi je n'ai
**pas** suivi la piste « make large moving objects semi-transparent » du §14 d'`apple-design` : elle
aurait rendu le rideau translucide et fait tomber le juge.

**L'easing de l'iris ne l'est pas, et je ne peux pas prétendre le contraire.** J'ai d'abord écrit
`power2.in` — puis j'ai calculé la fin de la course et j'ai vu que je ne faisais que déplacer le
problème : le disque aurait sauté de 713 px sur la dernière image. Et surtout, le tween fait
`opacity: 1 → 0` en même temps : un iris qui s'ouvre lentement **en s'effaçant** risque de ne plus
produire assez de différence d'image pour que le juge compte la coupe. `power2.inOut` est la courbe retenue —
non pas parce qu'elle lisse le saut (76 px sur la première image au lieu de 729), mais parce que
c'est **celle que `balai` et `glisse` emploient déjà**. L'iris était le seul des trois en
`power2.out`, sans qu'aucun commentaire dise pourquoi. C'est la skill `animate` qui m'a fait voir
l'incohérence, et elle est plus grave que le saut — voir l'entrée 11.

**Mais « je retiens » n'est pas « j'ai mesuré ».** Cette moitié-là demande un rendu et une passe du
juge pour être validée. Le patch la marque donc comme telle et la sépare du flou : la commande
applique le flou seul par défaut, et l'easing seulement avec `--iris`.

**Non appliqué sur ce lot**, même arbitrage qu'aux entrées 7 et 8, et pour la même raison : j'ai
promis à Benj que ce lot-ci irait au bout.

---

## 10. `improve-animations` — 2026-09-10

**Entrée :** `promo-src/hf/pub-01-vertical/index.html` — 1080×1920, 26,1 s, 17 plans, timeline GSAP
en pause, aucune interaction. Avec le système déjà en place décrit au mot près (fond vivant à trois
couches, trois familles de transition, dérives `sine.inOut`, entrées mot à mot, typewriter, shimmer)
et la consigne explicite : **« Je cherche ce que la mesure ne voit pas »** — easings mal choisies,
durées incohérentes entre plans de même nature, tweens qui se marchent dessus, valeurs magiques.

**Ce qu'elle a relevé, et qui était vrai.** Trois défauts, tous invisibles au juge :

### a. Les familles ne s'alternaient pas vraiment

Le code disait `familles[i % 3]`, où `i` est **l'index du plan**. Or les plans de type `coupe`
n'émettent pas de transition : ils **décalent le cycle sans le consommer**. Mesuré sur la
publication 1, `p03→p06` et `p07→p10` rejouaient la même famille deux fois de suite — ce que la
règle du §2 interdit explicitement.

Correctif : compter les transitions **émises**, pas les plans.

```js
let nTransition = 0
…
const f = familles[nTransition % 3]
nTransition++
```

Vérifié après coup sur la publication 1 : `B G E B G E B G E B G E` — **zéro répétition**.

### b. Les dérives étaient à amplitude constante, donc à vitesse variable

Une amplitude fixe (`y: 44`) sur des plans de durées différentes donne des **vitesses**
différentes : mesuré, **63 px/s sur un plan de 1,4 s contre 55 px/s sur un plan de 1,6 s**. L'œil ne
compte pas les pixels, il lit la vitesse — et une vitesse qui change d'un carton à l'autre se
remarque sans qu'on sache la nommer.

Correctif : normaliser en vitesse, pas en amplitude.

```js
const amp = (v) => Math.round((v * duree) / 2)   // v en px/s
derive(`#${id}-bloc`, `{y: ${amp(58)}, …}`, `{y: ${-amp(58)}, …}`)
```

Vérifié : **57,5 / 58,7 / 58,6 px/s** sur trois plans de durées différentes, contre un écart de 14 %
avant.

### c. Une valeur magique non arrondie

`Math.min(1.1, duree * 0.62)` produisait des durées de shimmer à quinze décimales dans le HTML
généré. Arrondi au centième.

**Appliqué** par `scripts/patch-motion2.mjs` — 8 corrections sur 8, toutes vérifiées par mesure et
non par relecture.

**Ce qu'elle n'a PAS vu**, et c'est utile de le dire : ni le saut de 729 px de l'iris, ni la vitesse
par image des rideaux. Il a fallu `apple-design` et `emil-design-eng` pour ça (entrées 8 et 9). Trois
skills, trois angles, trois familles de défauts différentes — aucune ne remplace les autres.

---

## 11. `animate` — 2026-09-10

**Entrée :** une question restée **ouverte** à la fin de l'entrée 9, et c'est ce qui fait que cette
invocation n'est pas du théâtre — je ne savais pas quelle courbe donner à l'iris. La skill impose
une séquence de décision en sept étapes ; je l'ai suivie dans l'ordre.

| # | Étape | Ce que la skill répond ici |
|---|---|---|
| 1 | **Faut-il animer ?** | Oui — et pour une raison mesurée, pas esthétique : la transition existe pour rendre la coupe **détectable** (5 coupes / 10 s, §4) |
| 2 | **Quel but ?** | « **Preventing a jarring change** » — mot pour mot dans sa liste. Deux cartons de texte sur fond nuit ne changent presque aucun pixel ; le rideau fait le pont |
| 3 | **Quel outil ?** | Sa table dit « springs → Motion ». **Je dévie, et je dis pourquoi** (ci-dessous) |
| 4 | **Quelles propriétés ?** | `transform` et `opacity` uniquement ✅ · et **« Never `scale(0)` »** — la **troisième** skill à le dire |
| 5 | **Courbe et durée ?** | Le point qui a tout retourné (ci-dessous) |
| 6 | **Interruption et sortie ?** | Sans objet — rien à interrompre dans un MP4. « Exit the way it entered » vaut pour `glisse`, déjà symétrique |
| 7 | **Reduced motion ?** | Sans objet — un fichier vidéo n'a pas de préférence de lecteur à respecter |

### La déviation, assumée : pas de ressorts

La skill envoie vers Motion dès qu'on veut un ressort, et un ressort serait le bon outil pour un
rideau. **Le contrat de rendu l'interdit.** HyperFrames rend en *cherchant* une timeline en pause,
image par image ; or un ressort n'a **pas de durée fixe** — son temps de stabilisation émerge des
paramètres. Ce qui n'a pas de durée déterministe ne se cherche pas image par image. La règle
« cheapest tool that works » tranche donc pour GSAP, qui est déjà là et qui est seekable.

### Le point qui a tout retourné : la courbe

Sa table de décision dit : **« Entering or exiting → `ease-out` »**. L'iris *entre* dans le cadre.
Appliquée à la lettre, la skill **prescrit donc exactement ce qui produit le défaut** — les 729 px
sur la première image.

**Sauf que sa raison ne transfère pas.** `ease-out` est prescrit pour les entrées parce qu'il donne
un mouvement visible **immédiatement** : l'utilisateur a cliqué, il attend, il doit voir. Dans un
film à 30 i/s, « mouvement visible immédiatement » veut dire **déjà énorme sur la première image**,
et il n'y a personne qui attend. La règle s'inverse.

C'est la ligne suivante de sa table qui s'applique : **« Moving / morphing on screen →
`ease-in-out` »**. Le rideau ne répond à personne, il traverse l'écran.

**Et c'est là que la skill m'a donné plus que ce que je cherchais.** En allant vérifier quelle
`ease-in-out` employer, j'ai regardé ce que font les deux autres familles :

```
balai   → power2.inOut
glisse  → power2.inOut
echelle → power2.out      ← le seul, et aucun commentaire n'explique pourquoi
```

**Le vrai défaut n'était pas le saut de 729 px, c'était l'incohérence.** Trois familles de
transition, deux courbes différentes, sans raison écrite. Le saut n'en était que le symptôme
visible. La correction retenue est donc `power2.inOut` — la courbe de la fratrie — et elle donne
**76 px** sur la première image, mieux que les 120 px du `power1.inOut` que j'avais d'abord retenu.

**Ce que ça change :** la question ouverte de l'entrée 9 est fermée, et pour une raison plus solide
que celle que j'avais. Le correctif de `plans/patch-transitions.md` est mis à jour.
