---
id: 020-13
type: contenu
objectif: Moment signature, candidat RL « la cage tourne et la lumière » — composer R et la meilleure lumière (L1 ou L2), la lumière décalée d'un quart de période, et livrer bloc.css, films, instants, planche, mesures au contrat et rapport, pour le choix de Benj
perimetre: [.orchestre/preuves/020-01/RL/**]
interdit: [public/**, scripts/**, app/**, lib/**, .orchestre/decisions.md, .orchestre/verdicts.jsonl, .orchestre/preuves/020-01/R/**, .orchestre/preuves/020-01/L1/**, .orchestre/preuves/020-01/L2/**, .orchestre/preuves/020-01/descente/**, .orchestre/preuves/020-01/cahier/**]
verifier: node scripts/signature-candidats-qa.mjs --candidats=RL
budget: { fichiers: 14, minutes: 25 }
preuve: sortie de verifier recopiée dans .orchestre/preuves/020-01/RL/verifier.log
executant: antigravity
---

# 020-13 — rotation et lumière ensemble

**Pourquoi.** Le héros de la démo Lestraque (https://prestiapp.fr/sites-demo/lestraque/index.html) doit vivre de lui-même au
repos. Benj choisira sur film parmi quatre candidats : R (la cage tourne), L1 (projecteur tournant), L2 (lumière rasante) et RL.
RL marie les deux gestes : la rotation ralentit aux extrêmes de son aller-retour sinusoïdal, et la lumière, décalée d'un quart
de période, anime justement ces extrêmes. Le cahier des charges est `.orchestre/preuves/020-01/cahier/cahier-des-charges.md` :
lis §0.3, §3.3, §3.5 (candidats R, L et RL) et §3.6.

**Ce qui existe** (lecture seule pour toi) :
- `.orchestre/preuves/020-01/R/bloc.css` et `rapport.md` : la rotation retenue ;
- `.orchestre/preuves/020-01/L1/` et `.orchestre/preuves/020-01/L2/` : les deux lumières, chacune avec `bloc.css`, `mesures.json`
  au contrat et `rapport.md` ;
- les scripts de tournage et de mesure de L1 et L2 : réutilise-les en changeant les chemins de sortie.

**À faire.**
1. Choisis la lumière. C'est celle dont `mesures.json` → `"1088x800"` a la moyenne de `C2a` la plus haute, avec `R12Min` ≥ 3,0
   et sans clignotement. Écris ton choix et ses chiffres en tête de `rapport.md`.
2. `bloc.css` : le bloc de R, plus le calque de la lumière retenue, dont l'animation est décalée d'un quart de période de la
   rotation (`animation-delay` négatif). Garde E_b = 1,07 et les amplitudes de R par format. Chaque règle vise `.ouverture`.
   Les images-clés n'animent que `transform`, `rotate`, `scale`, `translate` ou `opacity`. Si le calque de lumière tourne avec
   la photo, vérifie qu'il reste sous le dégradé du titre.
3. Tourne comme L1 et L2 : Chromium SANS drapeau de carte graphique, animations positionnées image par image, jamais en temps
   réel.
   - Films de 10 s à 30 images/s, page en haut : `film-1440x900.mp4` et `film-1088x800.mp4`. Utilise ffmpeg libx264, crf 20,
     yuv420p, sans son.
   - Instants en 1088×800 à 0,6 s, 2,5 s, 5 s et 8 s : `t06.jpg`, `t25.jpg`, `t50.jpg`, `t80.jpg`.
   - `planche.jpg` : tes quatre instants au-dessus des images-clés `.orchestre/preuves/refs/stellar-launch-t0..t3.png` et
     `art-landing-t0..t3.png`.
4. `mesures.json` pour `"1088x800"` et `"1440x900"`, exactement ces clés :
   `{ "C2a": [part > 8 entre 2,5 et 5 s, part > 8 entre 5 et 8 s], "C2bPlageFigee": secondes, "C2bEcartMoyen": nombre,
   "C2cClignote": booléen, "R12Min": contraste p90 du fond du titre au pire instant du cycle }`. Ajoute les coins (R-4, cas 1, 2
   et 4 du §8.1) : aucun coin découvert.
5. `rapport.md` (au moins 800 caractères). Donne les mesures face à la cible (0,56 ; plage figée ≤ 0,8 s ou écart moyen ≥ 0,020),
   compare-les à R, L1 et L2, et donne ton avis sans complaisance : ça vit ? C'est sobre ou chargé ?

**Règles.** Rien dans `public/` ni `scripts/`, aucune commande git. Les chiffres viennent de tes mesures.

**Fini quand** `verifier` passe. Il recalcule le mouvement sur ton film et le compare à `mesures.json`.
