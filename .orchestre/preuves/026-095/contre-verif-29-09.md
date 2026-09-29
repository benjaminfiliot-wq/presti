# 026-095 — contre-vérification du 29/09 (Claude Code)

Le juge officiel (facteur-qa --partie=porteur) ne joue pour de bon que PF-1, PF-2, PF-3 (contrôles seuls), PF-6/7/11 par le banc et PF-9 ;
PF-4, PF-5, PF-8, PF-10, PF-12 et PF-13 y sont « passe » sans essai. L'essai réel est `essai-porteur.mjs` (le vrai script dans un vrai
Chromium sur l'usine, deux sites témoins et une doublure de l'API en 127.0.0.1, les trois routes par le banc du juge). Sortie verte :
`essai-porteur.log`. Sept sabotages réversibles de la production, un fichier à la fois, sha256 vérifiés avant et après :

| # | Fichier | Sabotage | Détecté par |
|---|---------|----------|-------------|
| M1 | scripts/agents/porteur-formulaire.mjs | `if (!controle.ok)` → `if (false)` (plus de contrôle en direct) | PF-3, PF-13 (captcha, pot de miel… soumis) |
| M2 | scripts/agents/porteur-formulaire.mjs | robots.txt de l'action ignoré | PF-4 (1 requête vers l'action interdite) |
| M3 | scripts/agents/porteur-formulaire.mjs | verrou `occupe` ignoré | PF-8 (2 POST pour un envoi) |
| M4 | scripts/agents/porteur-formulaire.mjs | `cible.screenshot` → `page.screenshot({ fullPage: true` | PF-5 (1280×1000 au lieu de 1264×408), PF-12 (zones non masquées, source) |
| M5 | app/api/usine/porteur/travail/route.ts | relève du Gmail plus contrôlée | PF-11 |
| M6 | app/api/usine/porteur/rendu/route.ts | `p_definitif` forcé à faux | PF-7 |
| M7 | app/api/usine/porteur/oppositions/route.ts | `IDS_MAX` 500 → 5000 | PF-15 |

M1 à M4 : un seul passage sur l'usine, FAIL sur PF-5, PF-12, PF-3, PF-13, PF-4, PF-8 (PF-14, PF-10, PF-6, PF-7, PF-11, PF-15, PF-9 restent verts :
ils ne dépendent pas de ces lignes). M5 à M7 : par le banc sur le poste, FAIL sur PF-11, PF-7, PF-15.

sha256 avant = après (restaurés, `sha256sum -c` : OK) :
```
871451d0b4a695b34c391ead316cec3890b18acc35404f7591e91e0fe6760704 *scripts/agents/porteur-formulaire.mjs
03bf47341f12651863b57f8bc885975951352294a9ad51e7e5d20726614aa2ab *app/api/usine/porteur/oppositions/route.ts
29abfc723c80793e29669adfd983ee0363730fd64d7f87081cc4b7ba8310e5d9 *app/api/usine/porteur/rendu/route.ts
198724359fc44e60ab61546f45b349d63fe490ae3acd334d568697b76eebd98e *app/api/usine/porteur/travail/route.ts
382ae0695acfae1d77bbe0aa4a203769f31321fffed32e47b1a28f609837517a *lib/agents/acquisition/porteurFormulaire.ts
```

## Le juge officiel corrigé (Claude Code, 29/09 soir) — facteur-qa --partie=porteur rejoue désormais tout

Le juge lançait `process.execPath` (chemin Windows) sur l'usine (code 127) et, en `--ici`, laissait PF-4 vide, PF-5/6/7/8/10/12/13 en « passe » sans essai
et PF-9/PF-11 non évalués. Corrigé (commit de235312, décision consignée dans decisions.md) : `node` littéral, et la partie `--ici` joue
`scripts/fixtures/026-acquisition/envoi/essai-porteur.mjs` (le même essai que ci-dessus, ajouté au cahier : PF-3 à PF-15, un critère sans ligne est rouge).
Vert : `facteur-qa --partie=porteur` PASS, code 0, 110 s sur l'usine.

Sept sabotages posés ENSEMBLE sur la production, puis le juge OFFICIEL lancé (`node --import ./scripts/ts-loader.mjs scripts/facteur-qa.mjs --partie=porteur`),
sauvegardes hors dépôt, restauration par copie, sha256 vérifiés identiques (mêmes empreintes que le tableau ci-dessus) :

| # | Fichier | Sabotage | Critères passés au rouge par le juge officiel |
|---|---------|----------|------------------------------------------------|
| J1 | scripts/agents/porteur-formulaire.mjs | `if (!controle.ok)` → `if (false)` | PF-3 (14 soumissions sur des pages d'abandon), PF-13 |
| J2 | scripts/agents/porteur-formulaire.mjs | robots.txt de l'action ignoré (`if (false && !robotsAutorise(…))`) | PF-4 |
| J3 | scripts/agents/porteur-formulaire.mjs | verrou `occupe` ignoré | PF-8 (2 POST, 2 rendus, passe tardive qui resoumet) |
| J4 | scripts/agents/porteur-formulaire.mjs | `cible.screenshot` → `cible.page().screenshot({ fullPage: true,` | PF-5 (dimensions), PF-12 (zones non masquées) |
| J5 | app/api/usine/porteur/travail/route.ts | relève du Gmail non contrôlée dans le calcul du travail | PF-11 |
| J6 | app/api/usine/porteur/rendu/route.ts | `p_definitif` forcé à faux | PF-7 |
| J7 | app/api/usine/porteur/oppositions/route.ts | `IDS_MAX` 500 → 5000 | PF-15 |

Résultat : `facteur-qa --partie=porteur --ici : FAIL — PF-3, PF-4, PF-5, PF-7, PF-8, PF-11, PF-12, PF-13, PF-15`, code 1. Le juge d'avant, sur les mêmes sabotages,
n'aurait rien vu de PF-5, PF-7, PF-8, PF-11, PF-12, PF-13 (« passe » sans essai) ni de PF-4 (liste vide).
