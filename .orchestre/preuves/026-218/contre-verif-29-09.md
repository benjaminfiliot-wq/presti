# 026-218 — contre-vérification du 29/09 (Claude Code ; fiche produite par Claude Code, Hermes et OpenClaw sans résultat utilisable en 15 min : voir la fin)

Quatre sabotages réversibles de la production (lib/contenu/couts.ts), jugés par `node scripts/contenu-qa.mjs --partie=couts` ; chaque fichier est restauré et son sha256 relu (16 premiers caractères).

- 1 montant absent devient zéro : code 1, ❌ CO-1 — montant absent reste non connu — montant inventé ({"agent":"contenu","moteur":"freellmapi","montant":0,"jetons_entree":null,"jetons_sortie":n ; sha256 avant=3b9430e1fa851b90 après restauration=3b9430e1fa851b90 IDENTIQUE ; critère attendu CO-1 ROUGE comme prévu
- 2 appel Laya compté en euros et hors compteur : code 1, ❌ CO-2 — appel Laya compté à part — appel Laya mal compté ({"agent":"contenu","moteur":"laya","connuEur":0,"inconnu":1,"appelsLaya":0}) ; sha256 avant=3b9430e1fa851b90 après restauration=3b9430e1fa851b90 IDENTIQUE ; critère attendu CO-2 ROUGE comme prévu
- 3 total inexact (flottants sommés sans arrondi) : code 1, ❌ CO-2 — appel Laya compté à part — appel Laya mal compté ({"agent":"contenu","moteur":"laya","connuEur":0.0001,"inconnu":0,"appelsLaya":1}) ; sha256 avant=3b9430e1fa851b90 après restauration=3b9430e1fa851b90 IDENTIQUE ; critère attendu CO-2 ROUGE comme prévu
- 4 montant inconnu sommé comme connu : code 1, ❌ CO-2 — appel Laya compté à part — coût facturé mal compté ({"agent":"contenu","moteur":"freellmapi","connuEur":1.02,"inconnu":0,"appelsLaya":0}) ; sha256 avant=3b9430e1fa851b90 après restauration=3b9430e1fa851b90 IDENTIQUE ; critère attendu CO-2 ROUGE comme prévu

Aucune remarque : chacun des quatre sabotages rougit le critère attendu.

Essais complémentaires : `essais-218.mjs` (sortie dans `essais-218.log`) — cas que le juge ne couvre pas, faux Graph / faux jev, aucun réseau réel.

Pourquoi Claude Code et pas Hermes / OpenClaw : le 29/09 à 20:11 les quatre fiches ont été confiées aux deux agents de l'usine (consigne complète : fiche, extraits du juge, code des dépendances). 1er tour : Ollama Cloud (gpt-oss:120b) = HTTP 429 « monthly usage limit » ; freellmapi/mistral-large-3 = HTTP 503 « no usable provider key » ; qwen3 local (8b puis 4b) = « context overflow » même avec une consigne réduite ; rien produit. 2e tour (freellmapi/ministral-14b, qui répond) : à 15 minutes, Hermes n'avait rendu que boucle.ts (214, sans brief.ts) et rien pour 212 ; OpenClaw avait rendu mesure.ts et mesurer.mjs (213, un stub du niveau du témoin du juge : ni échéancier, ni insights, ni attribution) et couts.ts (218, sans Couts.tsx). Rien d'utilisable tel quel ; la fiche est produite par Claude Code, qui a passé le juge et ajouté les essais ci-dessus.
