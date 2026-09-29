# 026-214 — contre-vérification du 29/09 (Claude Code ; fiche produite par Claude Code, Hermes et OpenClaw sans résultat utilisable en 15 min : voir la fin)

Quatre sabotages réversibles de la production (lib/contenu/boucle.ts et lib/contenu/brief.ts), jugés par `node scripts/contenu-qa.mjs --partie=boucle` ; chaque fichier est restauré et son sha256 relu (16 premiers caractères).

- 1 H+1 seul jugé classable : code 1, ❌ BO-1 — H+1 seul insuffisant — classable a rendu true ; sha256 avant=0460349ad8779cf6 après restauration=0460349ad8779cf6 IDENTIQUE ; critère attendu BO-1 ROUGE comme prévu
- 2 recommander rend un objet de publication : code 1, ❌ BO-2 — jev score classe, ne publie jamais — recommander a rendu un objet de publication ; sha256 avant=0460349ad8779cf6 après restauration=0460349ad8779cf6 IDENTIQUE ; critère attendu BO-2 ROUGE comme prévu
- 3 statut hors liste fermée : code 1, ❌ BO-2 — jev score classe, ne publie jamais — statut hors liste fermée ({"id":"c1","scoreJev":{"niveau":5,"distribution":{},"provenance":"jev score -- ; sha256 avant=0460349ad8779cf6 après restauration=0460349ad8779cf6 IDENTIQUE ; critère attendu BO-2 ROUGE comme prévu
- 4 republication directe (brief déjà publié) : code 1, ❌ BO-3 — republier exige un nouveau brief — statut « publie » (attendu proposition) ; sha256 avant=abcf4ae65e360dfa après restauration=abcf4ae65e360dfa IDENTIQUE ; critère attendu BO-3 ROUGE comme prévu

Sabotage 3 : la première tentative visait la branche « vues intermédiaires », que le candidat du juge n'atteint pas (pas de vues → signal inconnu) ; la version rejouée vise la branche « vues inconnues », celle que BO-2 exerce.

Essais complémentaires : `essais-214.mjs` (sortie dans `essais-214.log`) — cas que le juge ne couvre pas, faux Graph / faux jev, aucun réseau réel.

Pourquoi Claude Code et pas Hermes / OpenClaw : le 29/09 à 20:11 les quatre fiches ont été confiées aux deux agents de l'usine (consigne complète : fiche, extraits du juge, code des dépendances). 1er tour : Ollama Cloud (gpt-oss:120b) = HTTP 429 « monthly usage limit » ; freellmapi/mistral-large-3 = HTTP 503 « no usable provider key » ; qwen3 local (8b puis 4b) = « context overflow » même avec une consigne réduite ; rien produit. 2e tour (freellmapi/ministral-14b, qui répond) : à 15 minutes, Hermes n'avait rendu que boucle.ts (214, sans brief.ts) et rien pour 212 ; OpenClaw avait rendu mesure.ts et mesurer.mjs (213, un stub du niveau du témoin du juge : ni échéancier, ni insights, ni attribution) et couts.ts (218, sans Couts.tsx). Rien d'utilisable tel quel ; la fiche est produite par Claude Code, qui a passé le juge et ajouté les essais ci-dessus.
