# 021-16 — le récit dans la scène des étapes : rapport

Exécutant : agent de Claude Code (Codex et Antigravity à court de quota), 15/09 vers 20 h 10 → 21 h.

## Reprise

Aucun travail de 021-16 n'existait (preuve `juge/mesures.json` de 17 h 47 : famille absente). Les trois fichiers `eclate.*`
étaient ceux de 021-05, retouchés jusqu'à 20 h 00 ; je suis parti d'eux, sans rien casser de la scène de 021-05.

## Ce qui est fait (trois fichiers de la famille)

- `eclate.mjs` : dans la boîte `div.eclate__rendu`, en plus de 021-05 :
  - `span.eclate__releve` (vide : le trait est un fond CSS, jamais un `<img>`) ;
  - la cote « 40 mm » de 021-05 garde sa classe, sa place passe en variables (`--cx/--cy` d'eclate.json, `--rx/--ry` de
    releve.json sous html.js) ;
  - `span.eclate__cote-entaille` « 17 mm », trait tourné sur l'axe du segment de releve.json ;
  - chaque étiquette sous `span.eclate__ligne` (display: contents) avec `span.eclate__numero` « 1 » à « 5 » juste avant elle ;
    le texte de `.eclate__etiquette` est inchangé, le parent se lit « 1 Limon à la française » ;
  - `span.eclate__fiche` : trois `span.eclate__champ` « Votre projet — Escalier », « Commune — Rennes », « Quand — Dans les trois
    mois », tiret cadratin écrit dans le DOM ; valeurs lues dans les listes du formulaire (site.json), libellés de generer.mjs ;
  - `<p class="eclate__phrase">Tout commence par votre demande.</p>`, ni lien, ni bouton, ni role, ni tabindex ;
  - `garde` : releve.json (deux cotes dont « 40 mm ») et releve.avif présents, fiche et phrase rendues, aucun prix dans la figure.
- `eclate.css` : tout ce que 021-16 ajoute est `display:none` ; `.eclate__ligne{display:contents}`.
- `eclate.bureau.css`, §6, tout sous `html.js` :
  - C1 : la fiche centrée (80 cqw : son bord gauche tombe sur celui du titre) ; rendu caché par le volet fermé ;
  - 29,125 → 35,875 : la fiche sort (opacity, translate −1,5 rem), le relevé et `assemble.avif` entrent par le même
    `clip-path: inset(0 100% 0 0)` → `inset(0)` ;
  - 35,875 → 38,875 : les deux cotes entrent (opacity, scale 0,6 → 1 sur l'axe du trait) ; sortie 46,75 → 47,75 ;
  - 46,75 → 48,75 : le trait s'efface pendant que les calques apparaissent ; l'éclatement de 021-05 suit sans changement ;
  - C3 : les numéros en pastilles sur les points des étiquettes, qui suivent leur pièce et entrent, tiennent et sortent avec elles ;
  - 87,44 → 90 : la phrase entre (opacity, translate 0,5 rem → 0), sous l'escalier remonté, pleine jusqu'à 100 %.

## Un écart assumé : le fond du relevé attend `.vu`

La fiche écrit le fond « déclaré seulement sous html.js ». Il l'est, mais sur `html.js #etapes .etapes__tete.vu .eclate__releve` :
un fond CSS se charge dès que sa règle s'applique, même sous un volet fermé et loin sous le pli, et EC-7 (eclate-qa) veut
0 requête d'`eclate/` en haut de page pendant 3 s. `.vu` est posée par kit.js (IntersectionObserver des `.reveal`) quand le bloc
des étapes approche. Mesuré : 0 requête d'`eclate/` en haut de page, releve.avif chargée bien avant C1.

## Défaut trouvé et corrigé en route : le volet faisait tomber le défilement à 30 images/s

La première version remplissait le volet `clip-path` (`both`) sur le rendu et le relevé. Un `clip-path` animé ne passe pas par le
compositeur : rempli, il faisait travailler le fil principal à chaque image, du volet jusqu'au bas de la section. EC-8 (copie de
diagnostic d'eclate-qa) : p95 des intervalles rAF 33,4 ms aux deux essais, contre 16,8 sans eclate.
Mesure A/B (`.orchestre/travail/021-16-outils/continu.mjs`, même méthode qu'EC-8, avec carte, deux essais par variante) :

| Variante | p95 rAF | images > 25 ms |
|---|---|---|
| volet rempli (1re version) | 33,4 · 33,4 ms | 356 · 357 sur ~2 650, de 35 % à 125 % de la plage |
| sans volet | 16,8 · 16,8 ms | 40 · 35 |
| sans le fond du relevé (volet rempli) | 33,3 · 33,3 ms | 193 · 205 |
| sans rien de 021-16 (scène de 021-05) | 16,8 · 16,8 ms | 26 · 25 |
| **retenue : volet en remplissage `none`, caché avant par une opacité composée** | **16,8 · 16,8 ms** | **52 · 40** |

La version retenue : avant 29,125 %, rendu et trait à `opacity: 0` (composée) ; l'opacité passe à 1 dans le premier 0,075 % du
volet, qui ne découvre alors que 0,3 % de la largeur (le bord gauche, vide) ; après 35,875 %, plus aucun clip. Vu à 29,15 %,
32,5 % et 36 % : aucun éclair, un seul changement.

## Juges

### etapes-recit-qa (ER-1 à ER-7, ER-S, ER-C, CSP, PR)

Lancé d'abord en essai (`--sources=` copie des sources, `.orchestre/travail/021-16-essai-1.log`) : **tout vert sauf EC**, qui
n'est pas enchaîné en essai. Mesures : fiche 1/1/1 à C1 avec relevé et rendu à 0 ; relevé, rendu et deux cotes à 1 à C2, fiche
à 0 ; cinq étiquettes numérotées à 1 à C3 ; phrase à 1 à C4 et jusqu'à 100 %, 0 à 86,94 % ; ER-1 écarts 0,054 · 0,081 · 0,083
(1440×900) et 0,057 · 0,088 · 0,089 (1088×800) ; ER-6 : seul le groupe « fiche » bouge de 29,125 à 35,875 % ; contraste p10
fiche 11,9, phrase 16,1 ; barre : 0 trou, 0 doublon dans #etapes ; ER-7 : releve.avif jamais demandée (téléphone, mouvement
réduit, 1440×640, sans JavaScript), éclaté fixe et légende de 5 lignes ; CSP 0.

**Lancement officiel** (`node scripts/etapes-recit-qa.mjs`, 20 h 46 → 21 h 20, sortie dans `verifier.log`, preuves dans `juge/`) :
mêmes mesures, **seul EC échoue** : « eclate-qa.mjs coupé ou impossible à lancer (ETIMEDOUT) ». Le juge enchaîné a écrit ses
captures EC-2 à 20 h 53 puis s'est bloqué à la mesure sans JavaScript jusqu'au délai (voir ci-dessous).

### eclate-qa (EC-1 à EC-16) : il n'échoue que sur les deux points connus de la fiche

Le juge officiel `scripts/eclate-qa.mjs` (17 h 33) ne peut pas aller au bout : sans JavaScript, `scene({ y })` attend deux
`requestAnimationFrame` qui ne viennent jamais (constat de 021-05, `.orchestre/preuves/021-05/contestation/raf-sans-js.log`) ;
etapes-recit-qa le coupe alors à son délai et note EC en échec sans détail. Pour voir le détail, une copie de diagnostic
(`copie-juge-ec.mjs`, recopiée ici ; résultat `eclate-qa-copie-diagnostic.log`) ne change que ce blocage et le repère des ancres
(les deux corrections de 021-05) ; elle ne relâche **pas** les deux points de 021-16. Résultat : FAIL sur ces deux points
seulement, tout le reste vert :

1. **EC-9** refuse `clip-path` dans `@keyframes eclate-volet` et dans les animations jouées (assemble.avif, relevé). Le cahier écrit
   à EC-9 « et clip-path pour 021-16 », et §3.4 D fait entrer le relevé par `clip-path: inset(0 100% 0 0)` → `inset(0)`.
2. **EC-2 à C1** attend `assemble.avif` ≥ 0,98, alors que §3.4 D met la fiche **à la place** du rendu (ER-2 : rendu ≤ 0,02).

Tout le reste d'eclate-qa passe avec le récit : EC-1 (structure, garde), EC-3, EC-4, EC-5, EC-6 (téléphone, mouvement réduit, 640 :
eclate.avif seule demandée), EC-7 (0 requête d'eclate/ en haut de page), EC-8 (p95 16,8 ms, 0 tâche longue), EC-10 (styles.css
+323 octets, bureau.css 2 916 octets en brotli 11, site.js identique, **Lighthouse mobile 100**, LCP 1 667 ms, TBT 4 ms, CLS 0),
EC-11 à EC-15, EC-16 (signature-repos-qa et nav-retenue-qa PASS), CSP 0, et « sans JavaScript à C3 : éclatée, nommée, compteur
« 03 », comme avec JavaScript ».

**À Claude Code d'accorder son juge** : EC-9 doit accepter `clip-path` (cahier EC-9), EC-2 à C1 doit attendre la fiche au lieu
d'`assemble.avif` quand le récit est là, et la mesure sans JavaScript ne doit pas attendre de rAF (sinon etapes-recit-qa ne peut
jamais être PASS, quel que soit le travail).

## Regard (captures faites par moi, `regard/`, 1440×900, copie générée hors de public/)

- `c1-la-demande-1440.jpg` : la fiche seule, alignée sur le titre ; se lit comme les champs du formulaire.
- `fondu-01-02-volet-1440.jpg` (32,5 %) : la fiche presque sortie, l'escalier au trait qui entre de gauche à droite.
- `c2-le-releve-cote-1440.jpg` : trait crème sur le rendu, « 17 mm » à gauche sur le limon, « 40 mm » à droite sur la marche.
- `c3-le-devis-numerote-1440.jpg` : pastilles 1 à 5 sur les points, noms au bout des filets, aucun prix.
- `c4-la-pose-1440.jpg` : l'escalier remonté, « Tout commence par votre demande. » seule dessous.

Réserves à l'œil : le trait de la cote « 17 mm » est très court (4 px à 1440 : c'est la vraie longueur du segment de
releve.json) et se lit surtout par son étiquette ; l'écart ER-1 entre C1 et C2 en 1440×900 (0,054) est proche du seuil de 0,05.

## Reprise après le refus du relecteur (15/09, 21 h 22 → 21 h 41)

### 1. « Le juge n'est pas vert : EC coupé (ETIMEDOUT) »

- **Cause.** eclate-qa, dans sa version de 17 h 33, attendait sans fin des rAF sans JavaScript.
- **Accord du juge.** Claude Code a corrigé eclate-qa à 21 h 15 (`.orchestre/travail/021-05-verif-application/appliquer.mjs` :
  `allerSansJs` et ancres assemblées). Je n'ai pas touché au juge.
- **Relance officielle.** `node scripts/etapes-recit-qa.mjs`, de 21 h 33 min 55 s à 21 h 40 min 35 s, sortie dans `verifier.log`.
  Plus aucune coupure : eclate-qa va au bout.
- **Tout ER est vert :**
  - ER-1 : écarts 0,054 · 0,081 · 0,083 et 0,057 · 0,088 · 0,089 ;
  - ER-6 : seule la fiche bouge ;
  - ER-5 : 0 trou et 0 doublon ;
  - ER-7 : releve.avif jamais demandée.
- **EC échoue sur les deux seuls points connus de la fiche** (`preuves/021-05/juge/mesures.json`, champ `echecs`, 21 h 40) :
  1. **EC-9** refuse `clip-path` dans `eclate-volet`. Le cahier écrit pourtant à EC-9 « et clip-path pour 021-16 ».
  2. **EC-2 à C1** attend `assemble.avif` ≥ 0,98, alors que ER-2 attend le rendu ≤ 0,02 sous la fiche.
- **Contradiction.** Les deux juges enchaînés se contredisent à C1 : aucun travail ne peut passer les deux.
- **Le reste d'eclate-qa passe avec le récit :**
  - EC-8 : p95 rAF 16,8 ms, 0 tâche longue ;
  - EC-10 : Lighthouse mobile 100, LCP 1 703 ms, TBT 0, CLS 0 ; bureau.css 2 921 octets en brotli 11, styles.css +323 ;
  - EC-6, EC-7 et EC-16 PASS ; CSP 0 ;
  - sans JavaScript à C3 : éclatée, nommée, compteur « 03 ».
- **Il reste à Claude Code** d'accorder EC-9 et EC-2 à C1. Sans cela, etapes-recit-qa ne peut pas être PASS.

### 2. Le film, regardé : un défaut trouvé et corrigé au passage 01 → 02

- **Le défaut.** Images 66 à 217 du film du juge : à 31,7 %, la fiche encore visible voilait l'escalier qui entrait par le volet.
  Deux changements se voyaient à la fois.
- **La correction** (`eclate.bureau.css`) : la fiche sort dans les 55 premiers pour cent du volet, vite d'abord. Le volet ne découvre
  rien avant x ≈ 0,26 du cadre, où commence l'escalier ; la fiche y est déjà presque éteinte.
- **Opacités calculées mesurées** (`.orchestre/travail/021-16-outils/ecarts.mjs`) :

  | Instant | Avant | Après |
  |---|---|---|
  | 30,9 % | 0,306 | 0,103 |
  | 31,7 % | 0,170 | 0,027 |
  | 32,5 % | 0,089 | 0,002 |

- **Captures :** `regard/avant-reprise-fondu-31_7-fiche-0_17.jpg`, `reprise-fondu-30_9-fiche-0_10.jpg`, `reprise-fondu-31_7-fiche-0_03.jpg`,
  `reprise-fondu-32_5.jpg`, et les images du nouveau film du juge, de 29 à 36 % (`reprise-film-juge-29-36.jpg`).
- **Reste du film :** un changement à la fois. Le trait s'efface quand les calques apparaissent, l'escalier s'ouvre, les étiquettes
  numérotées entrent, puis il se remonte et la phrase entre seule.

### 3. Réserve « cote 17 mm »

- **Essai.** Flèches placées dehors, pointées vers les talons, comme sur un plan quand une cote est trop courte.
- **Résultat.** Agrandies trois fois, elles font une petite étoile sur l'arête du limon, moins lisible que le « H » actuel.
- **Décision.** Abandonnées, non versées. L'étiquette « 17 mm » et son filet portent la lecture.

### 4. Réserve « ER-1 C1/C2 à 0,054 »

- **Remesure.** Mon outil refait la mesure du juge. Il trouve 0,0542, le même chiffre que le juge en essai et en officiel : la mesure
  est déterministe, ce n'est pas du bruit.
- **Essai.** Fiche agrandie (valeurs à 2,4 em) : 0,0553 seulement. L'écart vient de l'escalier, pas du texte.
- **Décision.** Je ne grossis pas la fiche pour un juge.

### 5. Écart assumé « le fond du relevé attend .vu »

- **Vérifié dans kit.js:159.** `.vu` est posée une seule fois, puis l'observateur est retiré (`unobserve`) ; sans IntersectionObserver,
  elle est posée d'emblée (kit.js:164). Une fois le bloc approché, le relevé ne peut donc pas rester vide.

### Effet de bord

etapes-recit-qa enchaîne eclate-qa, qui écrit ses preuves dans `.orchestre/preuves/021-05/juge/`. Ma relance de 21 h 34 a donc
remplacé celles du lancement de Claude Code de 21 h 21. Mêmes verdicts : seuls EC-9 et EC-2 à C1 échouent.

## Verdict final : PASS (21 h 47 min 30 s → 21 h 54 min 07 s)

- **Accord du juge.** Claude Code a accordé eclate-qa à 21 h 42 min 18 s (110 725 octets). Je n'y ai pas touché.
  - **EC-9** accepte `clip-path` pour le récit, à trois conditions : fiche présente, jouée seulement sur `img.eclate__assemble` et
    `.eclate__releve`, valeurs `inset(…)`.
  - **EC-2 à C1** attend la fiche pleine et le rendu à 0,02 au plus.
  - **Sans JavaScript**, la boîte du rendu est désormais capturée et comparée.
- **Attente.** J'ai laissé finir son essai rapide (21 h 44 min 37 s → 21 h 47 min 10 s : aucun échec, hors la note « Lighthouse et EC-16
  sautés »), puis j'ai relancé `node scripts/etapes-recit-qa.mjs` seul. La sortie est dans `verifier.log`.
- **ER, identique au lancement de 21 h 34 :**
  - ER-1 : 0,054 · 0,081 · 0,083 et 0,057 · 0,088 · 0,089 ;
  - ER-6 : seule la fiche bouge ;
  - ER-5 : 0 trou et 0 doublon ;
  - ER-7 : releve.avif jamais demandée.
- **EC : PASS, `echecs` vide** (`preuves/021-05/juge/mesures.json`, 21 h 48 UTC+2) :
  - EC-9 : clip-path dans `eclate-volet` (`inset(0 100% 0 0)` → `inset(0)`), fiche du récit présente ;
  - sans JavaScript à C3 : éclatée, nommée, compteur « 03 » ; boîte capturée à 1,2 niveau de gris d'écart, écart-type 30,2 contre 33,2 ;
  - EC-7 : 0 requête d'eclate/ en haut de page ;
  - EC-8 : p95 rAF 16,8 ms, 0 tâche longue ;
  - EC-10 : Lighthouse mobile 100, LCP 1 697 ms, TBT 0, CLS 0 ; bureau.css 2 921 octets en brotli 11, styles.css +323 ;
  - EC-16 PASS ; CSP 0.
- **Captures et film du juge** : `juge/`, 21 h 47-48. Les fichiers de la famille n'ont pas changé depuis 21 h 33 min 55 s, donc les images
  du film sont celles déjà regardées (`regard/reprise-film-juge-29-36.jpg`).
