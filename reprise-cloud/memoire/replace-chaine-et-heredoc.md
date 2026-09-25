---
name: replace-chaine-et-heredoc
description: "Deux pièges d'outillage qui ont corrompu ou bloqué des scripts — `$'` dans String.replace, et les longs heredocs bash"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-13T10:10:19.910Z
---

**1. `String.prototype.replace(chaîne, chaîne)` interprète `$` dans le remplacement.** `$&`, `` $` ``,
`$'`, `$n` sont des motifs spéciaux même quand le motif cherché est une chaîne. Le 2026-09-13,
un remplacement dont le texte contenait la regex `(.+)$'` a **injecté le reste du fichier** à cet
endroit puis l'a réécrit derrière : `scripts/pipeline.mjs` (presti) dupliqué, sans copie git.

Le remède : pour tout remplacement de texte programmatique, `s.split(a).join(b)` — ou un
remplaceur-fonction `s.replace(a, () => b)`. Jamais `replace(a, b)` avec `b` une chaîne qui
peut contenir un `$`.

**2. Un heredoc bash de plus de ~80 lignes avec des backticks et des `\`` échappés finit en
« unexpected EOF while looking for matching `'` »**, sans que le contenu soit en cause — et
comme la commande entière ne parse pas, **rien ne s'exécute, pas même le `cp` de sauvegarde placé
avant**. Deux scripts longs ont échoué ainsi le même jour.

Le remède : écrire le script dans un fichier (outil Write) puis `node fichier`. Et faire la
sauvegarde dans une commande **séparée** de celle qui modifie.

**3. Corollaire : tout script qui réécrit un fichier vérifie ses ancres AVANT d'écrire (tout ou
rien), et le fichier modifié doit exister dans git ou dans une copie faite dans une commande
précédente.** Les deux fois où ça a été respecté, l'erreur a coûté zéro ; la fois où ça ne l'a pas
été, il a fallu reconstruire à partir d'une copie dupliquée par chance.

**Why :** ces trois défauts se présentent comme des erreurs de syntaxe ou de shell très loin de
leur cause, et le deuxième efface la sauvegarde qu'on croyait avoir prise.

**How to apply :** split/join pour remplacer ; Write + node pour les scripts longs ; `cp` dans sa
propre commande ; ancres vérifiées avant toute écriture.

Voisins : [[spawn-windows-shell-ffmpeg]], [[presti-sessions-concurrentes]].

**4. Une regex de remplacement avec `[^;]*?` (ou tout `[^x]`) traverse les retours à la ligne.** Le 2026-09-13, `JSON\.stringify\(([^;]*?)\)\.slice\(0, (\d+)\)` a avalé depuis un `JSON.stringify(corps)` jusqu'au `.slice(0, 160)` de la ligne suivante : le corps d'une requête est parti tronqué à 160 caractères, et le symptôme (« JSON invalide à la position 160 ») pointait le serveur. Remède : `[^;\n]`, ou un remplacement exact par split/join, et relire les lignes touchées avant de lancer.
