# Question pour Benj (non bloquante : tout le reste est livré)

Le Standard et le Rédacteur de sites traitent des données de prospect. Sans Codex (ChatGPT, jusqu'au 9/10 21 h 15), leur seule voie est **Ollama local de
l'usine** (la donnée ne quitte jamais la machine) — mais le code exige, depuis le 27/09, **ton « oui » daté** (`IA_LOCALE_PROSPECTS_OUI=AAAA-MM-JJ`),
et aucune unité ne le pose. La consigne que j'ai reçue (« une donnée de prospect reste sur Ollama local ») n'est pas ce « oui » écrit de toi : je ne l'ai pas posé.

- **Si tu dis oui (avec la date)** : une ligne `Environment=IA_LOCALE_PROSPECTS_OUI=AAAA-MM-JJ` dans `presti-standard.service` (et `presti-facteur*` pour mémoire : le Facteur,
  lui, ne se replie jamais), puis `usine-agents.mjs installer`. Le Standard repart sur le 4B local dans la minute, le Rédacteur sur le 8B.
- **Sinon** : ils attendent Codex ; rien n'est perdu, rien ne part.
