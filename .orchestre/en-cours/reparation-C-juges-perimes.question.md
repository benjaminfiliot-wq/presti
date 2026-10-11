# Question du lot C-juges-perimes (05/10/2026) — le thème Vaisseau ne tient pas dans le cadre de la carte

**Posée par** : l'agent Sonnet du lot C-juges-perimes. **Fiches touchées** : 026-190 (thème Vaisseau), 026-185 (son verifier rejoue `station-ecran-qa --partie=themes`, qui juge TOUS les thèmes livrés).

## Ce qui est établi (mesuré sur l'usine le 05/10, capture au moment de l'échec : `.orchestre/preuves/026-190/diag-vaisseau-zones-atelier.png`)

- `station-themes-qa --theme=station` et `--theme=vaisseau` : PASS (TH-7 à TH-12). `station-claw3d-qa --partie=pixel,grille` : PASS (CL-15, CL-13 ; CL-13 était rouge parce que son juge exigeait `pilotage: false` / `stationCarte: false` dans `lib/flags.ts` alors que Benj les a levés le 05/10 : corrigé, voir decisions-chef-0410.md).
- `station-ecran-qa --partie=themes` : FAIL CE-17 **uniquement pour le thème vaisseau** : `elementFromPoint` au centre des zones `atelier` (1157, 173), `machines` (1157, 301) et `ecommerce` (1157, 429) ne rend pas la zone mais `SMALL.mc-signature`, `P.mc-succes` et `SELECT.mc-jrn-filtre`, c'est-à-dire la colonne de droite.
- Cause : la grille du Vaisseau fait 896 × 416 (sept colonnes de 128). À 1440 × 900 la carte dispose d'environ 790 px entre la colonne de gauche et celle de droite (`[data-station-carte]` : `padding: 16px calc(var(--mc-col-d) + 16px) 16px calc(var(--mc-col-g) + 16px)`, `overflow-x: hidden`). La 7e colonne (atelier, machines, ecommerce) tombe sous la colonne de droite : ces trois salles ne se cliquent pas au bureau. Le thème Station (grille 400 × 384) tient. La mise en page « flottante » n'y change rien (le panneau Attention flotte précisément à droite, 340 px de large).
- Ce n'est ni un défaut du juge ni un état d'environnement : le juge a raison.

## Options (aucune n'est dans le périmètre du lot C ; 026-190 interdit `app/**` et `lib/**`, et Codex est hors jeu jusqu'au 9/10)

1. **Redessiner la mise en page du Vaisseau** pour une grille d'au plus ~760 px (par exemple 7 × 80 px de module + sas = 688 px) : `theme.json` (emplacements, coursives, tapis, portrait) et l'atlas composite / le fond. Respecte le juge et le moteur tels quels. Coût : refaire les images du lot A ; à confier à Codex (après le 9/10) ou à Antigravity.
2. **Faire tenir la carte dans son cadre** (moteur, fiches 026-181/182) : quand la grille est plus large que le cadre, réduire la taille CSS du canevas (échelle non entière, `image-rendering: pixelated`) ou ouvrir la vue d'ensemble par défaut. Règle tous les thèmes futurs, mais touche CL-13 (canevas = grille × k entier), CE-9 (échelle et zoom) et la caméra : plusieurs juges à relire.
3. **Retirer le thème Vaisseau de la liste livrée** (`public/station/themes/vaisseau/` et `CLES_THEME`) jusqu'à correction : le verifier de 026-185 passe tout de suite, rien ne régresse pour Benj (le thème Station est le défaut), mais le travail de 026-190 est mis de côté.

**Recommandation du lot** : option 1 (la plus petite surface, le juge n'est pas touché), l'option 3 en attendant si Benj veut voir 026-185 vert avant le 9/10.

Décision à prendre par le chef (Claude Code, fenêtre principale) ; rien n'a été modifié dans les thèmes ni dans le moteur.
