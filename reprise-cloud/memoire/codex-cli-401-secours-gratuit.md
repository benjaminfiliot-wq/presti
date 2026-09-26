---
name: codex-cli-401-secours-gratuit
description: "26/09 nuit : codex exec (CLI, PC ET usine) rend 401 « Incorrect API key sk-svcac… » alors que l'app Codex de Benj marche ; secours = Codex CLI sur freellmapi (wire_api=responses)"
metadata:
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-25T23:15:25.908Z
---

**Symptôme.** Dans la nuit du 25 au 26/09 (vers 22:47 UTC, après le redimensionnement de l'usine), `codex exec` rend « 401 Unauthorized: Incorrect API key provided: sk-svcac… ».
- Il échoue sur le PC (0.155) ET sur l'usine (0.156), après « Reconnecting… 5/5 ».
- `codex login status` affiche pourtant « Logged in using ChatGPT ».
- Benj dit que l'application Codex fonctionne. Seule la ligne de commande est touchée.

**Why :** la production de nuit (runners de l'usine, `usine.mjs lancer`) dépend de la ligne de commande. Il faut un secours gratuit pour ne pas bloquer.

**How to apply :**
- **Réparer :** c'est à Benj de refaire la connexion de la ligne de commande (`codex login` sur le PC, et sur l'usine par code d'appareil). Ne jamais saisir ses identifiants à sa place.
- **Secours :** Codex CLI sur freellmapi, avec `-c 'model_providers.fl={name="freellmapi",base_url="http://127.0.0.1:3001/v1",env_key="FL_KEY",wire_api="responses"}' -c model_provider=fl -m <modèle>`.
  - `wire_api="chat"` n'est plus accepté depuis Codex 0.15x.
  - Gemini 3.7 Flash répond, mais s'arrête après deux appels d'outils. Tester la boucle en plusieurs étapes avant de choisir un modèle (essai dans ~/veille/essais/boucle).
- **Lanceurs de l'usine** (`presti-ops/veille/lancer-codex-*.sh`) : ils exportent FL_KEY depuis ~/.config/presti/freellmapi.key et prennent le modèle dans la variable MODELE.

Voir [[codex-executant]], [[usine-oracle]].
