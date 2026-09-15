# Rapport d'évaluation — Candidat L1 (Signature « Au repos »)

## 1. Variante retenue et arbitrage

La variante retenue pour le candidat **L1** est **5-ombre-portee-9s** :
- **Période $** : 9 secondes (rotation continue linéaire, sens trigonométrique inverse  = -1$).
- **Géométrie** : disque de \text{ vw}$ centré sur le puits de l'escalier (left: calc(40.4% - 85vw), 	op: calc(42% - 2.55vw - 85vw)).
- **Masque radial** : dégradé doux adial-gradient(closest-side, transparent 5%, #000 17%, #000 72%, transparent 100%).
- **Dégradé conique** : double faisceau symétrique combinant un rehaut chaud doré (gba(255,214,150, 0.40)) et une ombre portée douce (gba(10,7,4, 0.95)), fondu en mode mix-blend-mode: soft-light.

### Application des 5 critères d'arbitrage ordonnés

1. **Absence de clignotement ($, pic $\le 0{,}085$)** :
   Toutes les variantes respectaient formellement ce seuil, mais V5 affiche une remarquable régularité : pic maximal mesuré à **{,}009$** sur le film 30 ips (marge de sécurité supérieure à 90 %).
2. **Contraste du titre (-12$, p90min $\ge 3{,}0$ au pire instant du cycle)** :
   Ce critère disqualifie immédiatement la variante V3 (3-deux-faisceaux-10s-fort), qui plongeait à un contraste de {,}852 < 3{,}0$ en \times 800$ (12 instants défaillants). V5 préserve une lisibilité typographique irréprochable sur tous les formats : **{,}303$** en \times 800$, **{,}129$** en \times 800$ et **{,}325$** en \times 900$.
3. **Part active $> 8$ la plus proche de la cible {,}56$ ($)** :
   V5 obtient {,}581$ (entre 2,5 et 5 s) et {,}605$ (entre 5 et 8 s) sur la page (recalcul film : {,}605$ et {,}576$). C'est la valeur la plus équilibrée parmi les variantes conformes à R-12, couvrant exactement le puits d'escalier sans déborder en nappe uniforme.
4. **Plage figée la plus courte ($, cible $\le 0{,}8\text{ s}$)** :
   V5 réalise une plage figée de **{,}75\text{ s}$** sur le film ({,}875\text{ s}$ au relevé brut), surpassant les variantes V1 et V2 dont le manque de modulation engendrait des périodes perçues comme immobiles.
5. **Allure sobre et mise en valeur de la matière** :
   L'injection simultanée du contre-jour doré et de l'ombre portée évite l'effet « gyrophare » ou « faisceau laser ». L'éclairage semble provenir de la verrière zénithale et tourne avec la cadence naturelle d'une lumière d'atelier.

---

## 2. Synthèse des mesures instrumentées

| Grandeur mesurée | Format \times 800$ (Page) | Format \times 800$ (Film) | Format \times 900$ | Cible cahier des charges | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **$ (part $> 8$, 2.5-5s / 5-8s)** | {,}581$ / {,}605$ | {,}605$ / {,}576$ | {,}585$ / {,}634$ | Proche de {,}56$ | **CONFORME** |
| **$ (plage figée maximale)** | {,}875\text{ s}$ | {,}75\text{ s}$ | {,}00\text{ s}$ | $\le 0{,}8\text{ s}$ ou écart $\ge 0{,}020$ | **CONFORME** |
| **$ (écart moyen / image)** | {,}0073$ | {,}0069$ | {,}0075$ | Mouvement continu mesurable | **CONFORME** |
| **$ (clignotement / pic max)** | {,}0085$ | {,}0090$ | {,}0085$ | $\le 0{,}085$ | **CONFORME** |
| **-12$ (contraste p90min titre)** | {,}303$ | — | {,}325$ | $\ge 3{,}00$ | **CONFORME** |
| **-4$ (débordement / barres)** | 0 px | — | 0 px | Aucun débordement hors héros | **CONFORME** |

---

## 3. Avis qualitatif sans complaisance

### Ça vit visiblement ?
**Oui.** L'escalier hélicoïdal ne donne plus l'impression d'une photo de banque d'images figée sur un site vitrine banal. Le balayage lumineux met en relief la trajectoire courbe des marches : l'œil suit naturellement la spirale descendante vers le cœur du puits. À aucun moment l'utilisateur n'a le doute de savoir si la page est chargée ou si une vidéo a planté.

### C'est sobre ?
**Oui.** C'était le risque principal avec un conic-gradient : tomber dans le pastiche d'un radar militaire ou d'un projecteur de boîte de nuit. L'emploi exclusif de teintes chaudes tamisées (ambre et bistre sombre) combinées à la fusion soft-light et à un masque radial progressif (entre 17 % et 72 %) confère au geste une discrétion haut de gamme. Le projecteur ne s'impose jamais devant le contenu ; il sert d'arrière-plan tactile à la typographie.

### Le bois gagne-t-il en matière ?
**Oui, très nettement.** Sur les zooms 1:1, les chants des marches en chêne et le limon métallique révèlent leur grain au passage de l'ombre portée puis du rehaut. L'alternance ombre/lumière crée un modelé tridimensionnel qui valorise l'artisanat du menuisier-ébéniste, ce qu'une simple image statique ou un zoom mécanique ne parvenait pas à faire.

### Défauts et axes d'amélioration
1. **Période longue de cycle complet (\text{ s}$)** : la combinaison de la période propre du projecteur (\text{ s}$) et de l'animation de poussée d'échelle (\text{ s}$) crée un PPCM de 360 secondes. Si cela évite toute sensation de boucle répétitive, cela implique que deux visites de 10 secondes n'auront jamais exactement la même lumière sous le titre.
2. **Dimensionnement en $** : sur les très grands écrans ultra-larges ($> 2000\text{ px}$ de large), l'envergure de \text{ vw}$ projette une partie de l'ombre sur les marges extérieures. Une formulation hybride en min ou un plafonnement en pixels permettrait de mieux circonscrire l'effet au seul noyau architectural du bâtiment.
