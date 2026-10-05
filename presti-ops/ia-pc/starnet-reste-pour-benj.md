# StarNet : ce qui reste pour Benj

Tout le reste est fait (voir `docs/agents/starnet.md`). Ces gestes sont les tiens : ils touchent un compte ou un secret.

## 1. Un modèle assez rapide (le seul vrai blocage)

Le cerveau actuel est l'Ollama de l'usine (gratuit, sans clé) mais il est occupé par l'écosystème réel et trop lent pour la consigne de StarNet
(coupure à 30 s). Deux issues, au choix :

- **freellmapi (recommandé)** : ouvrir le tunnel `ssh -N -L 3001:127.0.0.1:3001 -i ~/.ssh/presti-usine usine@88.96.53.3`, puis dans StarNet
  **Settings > Models > Custom** : URL `http://127.0.0.1:3001/v1`, modèle `auto`, et coller toi-même la clé `FL_KEY` (sur l'usine :
  `~/.config/presti/freellmapi.key` du compte qui la possède ; StarNet la range dans le trousseau Windows). Je n'ai pas saisi cette clé : une clé ne se
  tape pas à ta place.
- **Ollama du PC** : il est vide (aucun modèle) et il reste moins de 1 Go de mémoire libre : il faudrait télécharger un modèle de 2 Go et fermer des
  applications. Pas conseillé tant que le PC est aussi chargé.

## 2. À ne PAS faire

- Ne te connecte pas à un compte Anthropic / OpenAI / Google depuis StarNet « pour que ça marche » : les agents Presti ne reçoivent pas de compte.
- N'écris pas de clé dans un fichier du dépôt.

## 3. Facultatif

- Demander à MATT « appelle `equipe_etat` » dès qu'un modèle rapide est branché : c'est la preuve complète (l'agent lit lui-même la base).
- Les apparences (skins) sont des choix de StarNet pris au hasard dans les neutres ; change-les dans le menu **Dossier** de chaque agent si tu veux.
- Au prochain démarrage du PC : `powershell -ExecutionPolicy Bypass -File presti-ops\ia-pc\starnet-lancer.ps1` (tunnel + connecteur).
