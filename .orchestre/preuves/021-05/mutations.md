# Contre-vérification par mutations de `scripts/eclate-qa.mjs` (tâche 021-23)

Ce document consigne les sept exécutions de `scripts/eclate-qa.mjs` réalisées sur des copies distinctes dans `.orchestre/travail/021-23/` sans toucher au site en place dans `public/sites-demo/`.

Les journaux complets sont disponibles sous `.orchestre/preuves/021-05/mutations/`.
Les exécutions utilisent `--sauter=lighthouse,ec16` : les échecs artificiels dus aux critères sautés sont attendus.

---

## Témoin

- **Copie** : `.orchestre/travail/021-23/temoin` (copie non mutée de `public/sites-demo/`)
- **Commande** : `node scripts/eclate-qa.mjs --demos=.orchestre/travail/021-23/temoin --sauter=lighthouse,ec16`
- **Code de sortie** : `1` (uniquement dû aux deux critères sautés `--sauter=lighthouse,ec16`)
- **Ligne de sortie** : `✗ grande scène des étapes : FAIL — essai : EC-10 Lighthouse non lancé (--sauter) ; EC-16 non lancé (--sauter)`
- **Analyse** : Aucun défaut EC-2, EC-6 ou EC-9 n'est relevé dans le journal complet (`temoin.log`).
- **Verdict** : `TEMOIN: PASS`

---

## M1 — Rendu tronqué sans JavaScript

- **Mutation** : Ajout de `html.no-js .eclate__rendu{clip-path:inset(50%)}` dans `m1/_kit/familles/eclate.css`.
- **Commande** : `node scripts/eclate-qa.mjs --demos=.orchestre/travail/021-23/m1 --sauter=lighthouse,ec16`
- **Code de sortie** : `1`
- **Ligne d'échec cible** : `EC-2 : sans JavaScript 1440×900 C3 : la scène capturée s'écarte en moyenne de 15.2 niveaux de gris de celle avec JavaScript (≤ 12) : les styles disent « éclatée », l'écran montre autre chose ; sans JavaScript 1440×900 C3 : écart-type du gris de la scène 7.8, 33.3 avec JavaScript (≥ 0,6 × : scène vide, unie ou voilée)`
- **Journal** : `.orchestre/preuves/021-05/mutations/m1.log`
- **Verdict** : `M1: PASS`

---

## M2 — Clip-path animé sur étiquette

- **Mutation** : Ajout d'une animation avec `clip-path` ciblant `.eclate__etiquette` dans `m2/_kit/familles/eclate.bureau.css` (`@keyframes eclate-clip-etiquette{from{clip-path:inset(0)}to{clip-path:inset(10%)}}`).
- **Commande** : `node scripts/eclate-qa.mjs --demos=.orchestre/travail/021-23/m2 --sauter=lighthouse,ec16`
- **Code de sortie** : `1`
- **Ligne d'échec cible** : `EC-9 : @keyframes eclate-clip-etiquette (eclate.bureau.css) anime clip-path : jouée sur #etapes .eclate__etiquette (eclate.bureau.css) : img.eclate__assemble et .eclate__releve seulement ; 1440×900 sans carte C1 : l'animation eclate-clip-etiquette sur span.eclate__etiquette anime clip-path : cible hors de img.eclate__assemble et .eclate__releve de la figure`
- **Journal** : `.orchestre/preuves/021-05/mutations/m2.log`
- **Verdict** : `M2: PASS`

---

## M3 — Forme non autorisée circle() dans les keyframes eclate-volet

- **Mutation** : Remplacement de `inset(...)` par `circle(0%)` / `circle(100%)` dans `@keyframes eclate-volet` de `m3/_kit/familles/eclate.bureau.css`.
- **Commande** : `node scripts/eclate-qa.mjs --demos=.orchestre/travail/021-23/m3 --sauter=lighthouse,ec16`
- **Code de sortie** : `1`
- **Ligne d'échec cible** : `EC-9 : @keyframes eclate-volet (eclate.bureau.css) anime clip-path : valeur(s) circle(0%), circle(100%) : inset(…) seulement ; 1440×900 sans carte C1 : l'animation eclate-volet sur img.eclate__assemble anime clip-path : valeur(s) circle(0%), circle(100%) : inset(…) seulement`
- **Journal** : `.orchestre/preuves/021-05/mutations/m3.log`
- **Verdict** : `M3: PASS`

---

## M4 — Fiche forcée à opacity:0 au centre C1

- **Mutation** : Ajout de `opacity:0!important;` sur `html.js #etapes .eclate__fiche` dans `m4/_kit/familles/eclate.bureau.css`.
- **Commande** : `node scripts/eclate-qa.mjs --demos=.orchestre/travail/021-23/m4 --sauter=lighthouse,ec16`
- **Code de sortie** : `1`
- **Ligne d'échec cible** : `EC-2 : 1440×900 sans carte C1 : ligne de la fiche « Votre projet — Escalier » à 0.00 (≥ 0,98 : la demande, ER-2) ; 1440×900 sans carte C1 : ligne de la fiche « Commune — Rennes » à 0.00 (≥ 0,98 : la demande, ER-2) ; 1440×900 sans carte C1 : ligne de la fiche « Quand — Dans les trois mois » à 0.00 (≥ 0,98 : la demande, ER-2)`
- **Journal** : `.orchestre/preuves/021-05/mutations/m4.log`
- **Verdict** : `M4: PASS`

---

## M5 — Retrait de span.eclate__fiche du HTML avec clip-path conservé

- **Mutation** : Remplacement de la classe de la fiche par `eclate__fiche_retiree` dans `m5/_kit/familles/eclate.mjs` (plus de `span.eclate__fiche` dans le DOM généré), tout en conservant `eclate-volet` et `clip-path`.
- **Commande** : `node scripts/eclate-qa.mjs --demos=.orchestre/travail/021-23/m5 --sauter=lighthouse,ec16`
- **Code de sortie** : `1`
- **Ligne d'échec cible** : `EC-9 : @keyframes eclate-volet (eclate.bureau.css) anime clip-path : aucune fiche du récit (span.eclate__fiche) dans la figure générée : clip-path n'est permis que pour le récit de 021-16 ; 1440×900 sans carte C1 : l'animation eclate-volet sur img.eclate__assemble anime clip-path : fiche du récit (span.eclate__fiche) absente de la figure générée`
- **Journal** : `.orchestre/preuves/021-05/mutations/m5.log`
- **Verdict** : `M5: PASS`

---

## M6 — Pastille décalée de 60 px au téléphone

- **Mutation** : Décalage de `+ 60px` sur l'attribut `style="left:..."` de la pastille 1 dans `m6/_kit/familles/eclate.mjs`.
- **Commande** : `node scripts/eclate-qa.mjs --demos=.orchestre/travail/021-23/m6 --sauter=lighthouse,ec16`
- **Code de sortie** : `1`
- **Ligne d'échec cible** : `EC-6 : téléphone 390×844 : pastille 1 centrée à (169.3 ; 51.1) px, ancre de « Limon à la française » à (109.3 ; 51.1) ± 2 ; téléphone 390×844 : sous la pastille 1 (« Limon à la française »), pastilles masquées, le pixel rgb(21, 17, 14) n'est qu'à 1.0 du fond de la scène rgb(20, 17, 14) (plus de 30 : la pastille ne pose sur aucune pièce)`
- **Journal** : `.orchestre/preuves/021-05/mutations/m6.log`
- **Verdict** : `M6: PASS`
