# 026-185 — contre-vérification : quatre sabotages réversibles de la production du thème Station

Date : 2026-10-04 (le nom du fichier suit la consigne de la fiche). Juge : `node scripts/station-themes-qa.mjs --theme=station`, rejoué sur l'usine
(`node scripts/usine.mjs executer`, un bac par sabotage, état du PC envoyé tel quel). Chaque sabotage est posé sur la production
(`public/station/themes/station/`), jugé, puis le fichier est remis depuis une copie ; un `trap` restaure en toute circonstance.

Empreintes sha256 de la production, **avant** et **après** les quatre sabotages (identiques, comparées par `diff`) :

```
bf94335130c38b43311f3a141e071e104cb9b06b923f56f9cc38ed622c4dcffd  theme.json
b7f5c3ee052ea9867441f4b434d8766ad5f0b1973b95f25b47ac6680926e7b77  licence.json
78afb7fd2dbbaa7e41c61d5bac882c86b3929917919b5e5f5d8ef9027d27ab7e  fond.webp
082b76530c213ccd7a83dea32e666d5285adc5addc6907a36a1c17754c885c98  atlas.png
```

Témoin (production intacte) : `station-themes-qa --theme=station : PASS`, TH-7 à TH-12 verts (voir `verifier-partiel.log`).

| # | Sabotage de la production | Critère qui l'attrape | Verdict du juge |
|---|---|---|---|
| 1 | `theme.json` : l'emplacement « ecommerce » perd `reservee: true` | TH-7 et TH-8 | FAIL — « 0 emplacement(s) réservé(s), un et un seul attendu » ; « La salle réservée E-commerce ne se déplace pas » |
| 2 | `licence.json` : le pack `05-zwonky-spacers` passe de CC0 à CC-BY-SA-4.0 | TH-10 | FAIL — « licence CC-BY-SA-4.0, CC0 attendu » |
| 3 | `theme.json` : `nom` = « Station http://exemple.invalid/x » (adresse distante dans un texte) | TH-7 et TH-12 | FAIL — « adresse ou schéma distant dans un texte » |
| 4 | `fond.webp` : 230 000 octets ajoutés (la nébuleuse passe à 228 Ko) | TH-9 | FAIL — « le fond fond.webp pèse 228 Kio, 200 Kio au plus » |

Chaque sabotage est attrapé par le critère prévu, et par lui seul (plus TH-8 ou TH-7 quand le défaut touche aussi le graphe ou le schéma) : les autres critères restent verts.

## Extraits réels (sortie du juge sur l'usine)

### 1-reservee-perdue
```
station-themes-qa --theme=station — racine .
❌ TH-7 bureau : 0 emplacement(s) réservé(s), un et un seul attendu ; bureau : l'emplacement « ecommerce » n'est pas réservé et n'a pas de poste ; emplacement réservé : aucun, un seul, « ecommerce », attendu
❌ TH-8 validerDisposition refuse les defauts du thème station : La salle réservée E-commerce ne se déplace pas
station-themes-qa --theme=station : FAIL — TH-7, TH-8
· usine executer : code 1 · paquet 22,2 s · envoi et bac 3,0 s · commande 0,6 s · total 25,8 s
```

### 2-licence-non-cc0
```
station-themes-qa --theme=station — racine .
❌ TH-10 pack 05-zwonky-spacers : licence « CC-BY-SA-4.0 », CC0 attendu ; pack 05-zwonky-spacers : licence « CC-BY-SA-4.0 », le licence.json du pack dit « CC0 »
station-themes-qa --theme=station : FAIL — TH-10
· usine executer : code 1 · paquet 24,5 s · envoi et bac 5,5 s · commande 0,7 s · total 30,7 s
```

### 3-adresse-http
```
station-themes-qa --theme=station — racine .
❌ TH-7 $.nom : « Station http://exemple.invalid/x » ne respecte pas ^(?!.*(?:[a-zA-Z][a-zA-Z0-9+.-]*:|//)).{ ; adresse ou schéma distant dans un texte : « Station http://exemple.invalid/x »
❌ TH-12 theme.json $.nom : adresse « Station http://exemple.invali… »
station-themes-qa --theme=station : FAIL — TH-7, TH-12
· usine executer : code 1 · paquet 19,6 s · envoi et bac 3,9 s · commande 0,6 s · total 24,0 s
```

### 4-fond-trop-lourd
```
station-themes-qa --theme=station — racine .
❌ TH-9 le fond fond.webp pèse 228 Kio, 200 Kio au plus
station-themes-qa --theme=station : FAIL — TH-9
· usine executer : code 1 · paquet 16,8 s · envoi et bac 3,5 s · commande 0,7 s · total 21,0 s
```

## Ce que cette contre-vérification ne couvre pas

CL-13, CL-15 (`station-claw3d-qa --partie=pixel,grille`) et CE-17 (`station-ecran-qa --partie=themes`) ne peuvent pas être sabotés : ils ne
tournent pas (moteur et juge d'écran absents du dépôt, voir `verifier-partiel.log`). Aucune capture du juge (bureau-station.jpg, telephone-station.jpg)
n'existe, donc aucune n'est fournie.
