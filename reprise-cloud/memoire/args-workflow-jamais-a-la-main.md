---
name: args-workflow-jamais-a-la-main
description: "Recopier à la main la liste d'items passée en args d'un Workflow a mal apparié 31 fichiers sur 48 — générer les args depuis le fichier, toujours"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 72af3754-17f0-4d57-a7e6-48b7bf69d76a
  modified: 2026-09-21T23:29:17.137Z
---

Le 2026-09-22, en lançant un Workflow sur 48 rushes, j'ai **recopié la liste `args` à la main** dans
l'appel d'outil à partir d'un affichage console, au lieu de la générer depuis le JSON que je venais
d'écrire. Résultat : 31 des 48 entrées associaient le bon identifiant au mauvais nom de fichier, donc un
chemin qui n'existait pas. Un seul agent a dit « fichier introuvable » ; les 47 autres ont trouvé *un*
fichier voisin et ont travaillé dessus sans le signaler. Le repérage était bon, mais rattaché au mauvais
rush — invisible tant qu'on ne montait pas.

**Why:** une liste recopiée à la main ne se relit pas ; et les agents ne s'arrêtent pas sur un chemin
absent, ils se débrouillent, ce qui transforme mon erreur en résultat plausible.

**How to apply:**
- générer les `args` par un script qui lit le fichier source et les imprimer d'un bloc à coller, ou les
  passer par un chemin que le script du workflow lit lui-même ;
- dans le prompt de l'agent, exiger l'arrêt si le chemin fourni n'existe pas (`test -f`), au lieu de
  laisser chercher ;
- **mettre une contrainte vérifiable dans le résultat** : ici, « les segments doivent tenir dans la durée
  du fichier » a suffi à débusquer les 5 derniers mauvais appariements ;
- éviter les libellés d'agent tronqués (`nom.slice(0,26)`) quand les noms se ressemblent : cinq rushes
  s'appelaient `1.mp4`, `2.mp4`… et se sont écrasés dans mon index de reconstitution ;
- ce qu'on ne peut pas prouver, on l'écarte : 7 repérages sur 47 n'ont pas pu être rattachés avec
  certitude à leur fichier, ils ont été jetés plutôt que montés.

Voir [[preuve-vide-est-un-mensonge]], [[juge-capture-lui-meme]].
