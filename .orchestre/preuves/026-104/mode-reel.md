# 026-104 — le mode « racine réelle » de pilotage-ecran-qa n'est pas prouvé

Écrit le 28/09 par Claude Code, en réponse au sixième défaut de la contre-vérification de 026-104.

## Ce que fait ce mode

Sans `--racine` ni `--temoin`, `scripts/pilotage-ecran-qa.mjs` :

- lance `next dev` sur la copie au drapeau levé (`c/commun.mjs` copieDrapeau, `b/commun.mjs` serveurCopie) ;
- crée un compte fondateur d'essai **en production** (`b/commun.mjs` avecComptes) et le purge dans un `finally` ;
- prend `bureau.jpg` (1440×900) et `telephone.jpg` (390×844) dans `.orchestre/preuves/<fiche jugée>/` ;
- lance le typecheck (ST-17, VU-9, SA-14, SB-8, EX-9, EG-12).

## Où on en est

Aucune preuve ne l'a lancé à ce jour. `node scripts/juges-026-pilotage-preuve.mjs --lot=c` ne juge que le banc (`c/banc.mjs`) :

- la référence ;
- le témoin du lot c et ses sabotages ;
- l'onglet Aujourd'hui en `--temoin`.

Les captures que Benj doit regarder avant la levée du drapeau (026-140) sortent de ce mode. **Elles n'existent donc pas encore.**

Je ne l'ai pas lancé cette nuit. Ce mode écrit un compte d'essai en production, ce qui demande l'accord écrit de Benj. Il dormait.

## Quand il le sera

Au plus tard avec 026-111, la première fiche jugée par ce juge, avec l'accord écrit de Benj. Le log ira dans `.orchestre/preuves/026-111/`. D'ici là, ce mode est « non prouvé ».

## Autre limite, acceptée

L'immobilité se mesure par trois témoins : le compteur `data-images`, l'empreinte du canevas et `getAnimations()`. Sur le témoin du lot c, seul `getAnimations()` mord :

- le cadre d'attente de la carte n'a pas de canevas ;
- `data-images` y vaut « 0 », écrit en dur.

C'est acceptable seulement parce que la carte Claw3D est jugée ailleurs : par `station-ecran-qa` (026-172) et `station-claw3d-qa` (026-170). Les trois témoins sont prouvés par ailleurs sur une page d'essai du juge (TM-2, `--temoin`).
