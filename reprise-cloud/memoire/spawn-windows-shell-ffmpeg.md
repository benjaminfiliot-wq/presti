---
name: spawn-windows-shell-ffmpeg
description: Sous Windows, shell:true dans spawnSync casse les commandes ffmpeg contenant | ou & — et TaskStop ne tue pas l'arbre de processus
metadata:
  type: feedback
---

Deux pièges Windows qui ont chacun coûté un lot de rendu entier, dans `presti/scripts/hf-rendre.mjs`.

**1. `shell: true` n'est nécessaire que pour les `.cmd` (npx, npm), et il est nuisible partout ailleurs.**
Node ne fait que *concaténer* les arguments sans les échapper — il le dit lui-même dans
`DEP0190`. cmd.exe lit alors le `|` d'un `-filter_complex` (`adelay=350|350`) comme un **tube** et
tente d'exécuter `350`. Mesuré sur la même commande : `shell=true` → code 255,
« '350' n'est pas reconnu en tant que commande interne » ; `shell=false` → code 0.

Le remède : `const shell = process.platform === 'win32' && cmd === 'npx'`. ffmpeg/ffprobe sont de
vrais `.exe`, ils n'ont jamais besoin de shell.

**Pourquoi c'est sournois** : seules les commandes contenant `|`, `&`, `^`, `<`, `>` cassent. Le
rendu et l'encodage passaient ; seul le mixage audio échouait. Un pipeline peut donc être « vert »
sur 90 % de son chemin et mourir sur une seule étape.

**2. `TaskStop` tue le shell, pas son arbre.** Un lot « arrêté » continue de rendre : le `node`
enfant, son `npx`, ffmpeg et les `chrome-headless-shell`. Il faut `taskkill /PID <n> /T /F` sur la
racine — et si c'est une boucle `bash`, tuer **la boucle**, sinon elle relance à chaque enfant tué.
Puis vérifier qu'il ne reste rien, ne pas le supposer.

**3. Un tube cache la vérité, deux fois plutôt qu'une.** Dans la même journée : (a) un `grep` de
filtrage dans un script de lot a avalé la sortie d'erreur de ffmpeg, transformant une panne lisible
en `code 255` sans contexte ; (b) `cmd | sed > f ; echo $?` renvoie le code de **sed**, pas de la
commande — j'ai donc cru à tort qu'un validateur sortait en 0 alors qu'il sortait en 1. Utiliser
`${PIPESTATUS[0]}`, ou ne pas mettre de tube quand on lit un code de sortie.

**Why:** les deux pannes se présentent comme des erreurs incompréhensibles (`code 255`,
`Device or resource busy`, `exit 127`) très loin de leur cause réelle.

**How to apply:** dans tout script Node qui pilote ffmpeg sous Windows, réserver `shell` aux `.cmd`
nommément ; ne jamais filtrer stderr par `grep` dans un script de lot (ça transforme une panne
lisible en énigme) ; et après tout arrêt de lot, lister les processus survivants avant de relancer.

Voisins : [[hyperframes-en-local]], [[doc-montage-ffmpeg-pipeline]], [[livrable-colle-a-la-main]].

**4. Sous Git Bash, `taskkill /PID 1234` échoue en silence : MSYS convertit `/PID` en chemin Windows.** Tuer un processus depuis Bash → `MSYS_NO_PATHCONV=1 taskkill //PID 1234 //T //F`, ou passer par l'outil PowerShell (`Stop-Process -Id 1234 -Force`). Constaté le 2026-09-13 : un juge vidéo bloqué à la sortie (tous ses verdicts écrits, node ne quittait pas) a tenu une chaîne 90 min parce que le premier kill n'avait rien tué.
