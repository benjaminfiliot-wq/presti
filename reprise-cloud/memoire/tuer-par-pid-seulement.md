---
name: tuer-par-pid-seulement
description: "Jamais taskkill /IM ni pkill -f large : un agent a fermé tous les Chrome et Node du PC le 26/09 à 00:45, et pkill -f tue sa propre session ssh (motif dans la ligne de commande)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-25T23:15:17.895Z
---

**La règle.** On arrête un processus par son **PID**, trouvé par sa ligne de commande exacte, et jamais autrement.

**Ce qui s'est passé**
- **26/09, 00:45 :** l'agent des maquettes de Marans a lancé un `taskkill` par nom d'image. Il a fermé TOUS les Chrome et TOUS les Node du PC de Benj, y compris ses fenêtres et les juges en cours.
- **La même nuit :** `pkill -f "codex exec …"` lancé par ssh a tué la session ssh elle-même, parce que sa propre ligne de commande contient le motif. Pareil pour `pgrep -f nom.sh`, qui se trouve lui-même et répond « déjà en cours » à tort.

**Why :** ces commandes touchent le poste de Benj et tout ce qui y tourne, bien au-delà de la tâche.

**How to apply :**
- **Sur le PC**, trouver le PID par `Get-CimInstance Win32_Process` (sur la ligne de commande), puis `taskkill /PID <n>`.
- **Sur l'usine**, `ps -eo pid,args | grep "^ *[0-9]* bash /chemin/absolu/script.sh"`, puis `kill <pid>`. Pour vérifier qu'un script tourne, chercher son chemin absolu, alors que la commande ssh l'écrit avec `~`.
- **Dans chaque consigne d'agent** qui peut arrêter un processus, écrire : « jamais taskkill /IM, jamais pkill -f ».

Voir [[usine-oracle]].
