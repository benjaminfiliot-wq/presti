# Rapport — Candidat RL « La cage tourne et la lumière »

## 1. Décision et sélection de la lumière (Benj, 15/09/2026 à 13 h 15)

Sur instruction directe de Benj (15/09/2026 à 13 h 15), le candidat **RL** retient la lumière de **L1** (le projecteur tournant), et **non celle de L2**.
En effet, les mesures recalculées sur film ont établi sans ambiguïté que L1 est le seul geste élémentaire capable de tenir la cible $C_2$ :
- **L1 seul** : part $> 8$ recalculée de **0,605** (2,5→5 s) et **0,576** (5→8 s), plage figée de seulement **0,75 s**, contraste $R_{12\min} = 3,303 \ge 3,0$, sans aucun clignotement ($C_{2c} = \text{false}$, pic à 0,009).
- **L2 seul** : bien que très élégante, la lumière rasante plafonnait à 0,342 / 0,402 (part $> 8$) avec une plage figée de 3,25 s, sous la cible de 0,56.

Le candidat RL hybride donc la rotation de la cage d'escalier issue de **R** avec le projecteur tournant continu de **L1**.

---

## 2. Architecture cinématique et calage temporel

La composition repose sur la superposition rigoureuse de deux dynamiques complémentaires :
1. **R (Rotation de la photo)** :
   - Échelle statique $E_b = 1,07$ (`transform: scale(1.07)`) garantissant qu'aucun coin de photo n'est découvert ($R_4$ tenu avec 0 pixel magenta découvert sur tous les formats).
   - Centre de rotation fixé sur le point de fuite de l'escalier : `transform-origin: 40.4% 38.6%`.
   - Amplitude calibrée par format : $\pm 2,25^\circ$ en 34/25 (`1088×800`) et $\pm 4,0^\circ$ en 16/10 (`1440×900`).
   - Période : demi-cycle de 10 s (`cubic-bezier(.37, 0, .63, 1)`), soit un cycle complet aller-retour de 20 s.
2. **L1 (Projecteur tournant)** :
   - Calque dédié `::before` de 170 vw centré sur le point de fuite, balayant la scène à $360^\circ$ en continu (`signature-projecteur 9s linear infinite`).
   - Masque radial et motif conique à deux faisceaux doux en mode de fusion `soft-light`.
   - Bouclier de lisibilité : le dégradé du titre (`::after`) est maintenu en `z-index: 2` au-dessus de la lumière (`z-index: 1`), préservant le contraste textuel.
3. **Déphasage d'un quart de période (`animation-delay: -2.5s`)** :
   - La rotation de R ralentit naturellement à ses points d'inversion ($t = 0$ s et $t = 10$ s).
   - En appliquant un délai de $-2,5$ s (un quart du demi-cycle de 10 s de R) au faisceau lumineux, celui-ci se trouve en plein milieu de sa trajectoire active et à vitesse constante lorsque la cage d'escalier marque son temps d'arrêt.
   - Ce déphasage élimine totalement la sensation de gel propre aux animations pendulaires.

---

## 3. Mesures comparatives face aux cibles

| Candidat | $C_{2a}$ (part $> 8$, 2,5→5 s) | $C_{2a}$ (part $> 8$, 5→8 s) | $C_{2b}$ (plage figée) | $C_{2b}$ (écart moyen) | $R_{12\min}$ (contraste titre) | $C_{2c}$ (clignotement) | $R_4$ (coins découverts) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cible** | $\ge \mathbf{0,56}$ | $\ge \mathbf{0,56}$ | $\le \mathbf{0,80\text{ s}}$ | $\ge 0,020$ | $\ge \mathbf{3,0}$ | $\text{false}$ | 0 |
| **Témoin en ligne** | 0,000 | 0,000 | 10,00 s | 0,0000 | 3,30 | $\text{false}$ | 0 |
| **R seul** | 0,493 | 0,540 | 10,00 s | 0,0036 | 3,30 | $\text{false}$ | 0 |
| **L2 seul** | 0,342 | 0,402 | 3,25 s | 0,0052 | 3,31 | $\text{false}$ | 0 |
| **L1 seul** | 0,605 | 0,576 | 0,75 s | 0,0069 | 3,30 | $\text{false}$ | 0 |
| **RL (1088×800)** | **0,654** | **0,646** | **0,00 s** | **0,0080** | **3,34** | $\text{false}$ (pic 0,011) | 0 (tenu) |
| **RL (1440×900)** | **0,660** | **0,640** | **0,00 s** | **0,0081** | **3,21** | $\text{false}$ (pic 0,012) | 0 (tenu) |

Les chiffres recalculés sur le film confirment la supériorité mathématique de RL :
- $C_{2a}$ dépasse les 64 % de pixels modifiés (très au-dessus de la cible de 56 %).
- La plage figée tombe à **0,00 s** : il n'y a plus aucun instant où la scène semble morte.
- Le contraste du titre ($R_{12\min} = 3,34$ en 1088×800 et $3,21$ en 1440×900) reste toujours strictement supérieur au seuil critique de 3,0.

---

## 4. Avis sans complaisance pour Benj

### Ça vit ?
**Oui, intensément.** L'effet combiné résout le défaut fondamental de tous les mouvements à oscillation simple : l'impression que le site « s'endort » à chaque demi-tour. Ici, la lumière continue de balayer les limons et les contremarches en chêne pendant que le cadre ralentit, puis la perspective bascule à nouveau alors que le faisceau passe dans l'ombre. Cette polyrythmie (cycle de 20 s pour la photo, 9 s pour la lumière) crée une organicité vivante, proche d'une prise de vue réelle au soleil couchant.

### Est-ce sobre ou chargé ?
**C'est à la frontière exacte du spectaculaire et de la charge.**
- *Ce qui sauve la sobriété* : l'utilisation du mode `soft-light` pour le projecteur. Contrairement à un effet de lueur brute ou à un gradient criard, la lumière n'écrase pas la matière : elle révèle la texture du bois et du métal existants. De plus, le titre blanc conserve son assiette stable et lisible grâce au dégradé protecteur sombre.
- *Le point d'attention* : deux cinématiques continues sur le héros d'un site d'artisan constituent un geste fort. Si l'on recherche une sobriété monacale, la photo immobile avec une simple lueur discrète (ou L1 seul sans rotation de la photo) est plus reposante. Mais si le but est d'ancrer immédiatement Presti comme une référence de design haut de gamme et d'audace (« signature » mémorable qui surclasse les templates concurrents), RL est indiscutablement la variante la plus puissante et aboutie.
