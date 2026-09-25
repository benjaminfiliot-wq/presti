---
name: codex-executant
description: "Codex (application OpenAI Codex de Benj) est un exécutant de l'orchestre depuis le 14/09/2026 — binaire, connexion, bac à sable forcé, pas de mode serveur MCP, dossiers donnés"
metadata: 
  node_type: memory
  type: reference
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-14T19:20:14.860Z
---

Benj a installé l'application OpenAI Codex le 14/09/2026, y a importé skills, connecteurs et plugins (claude-design-skillstack, ui-ux-pro-max, linkedin/facebook-skills, MCP motionsites) et créé un projet « presti » (dossiers presti + presti-secrets). Il veut que Claude Code et Codex travaillent ensemble, « même système universel qu'avec Antigravity ».

- **Binaire** : `%LOCALAPPDATA%/OpenAI/Codex/bin/<version>/codex.exe` (le dossier change à chaque mise à jour ; pas de `codex` dans le PATH de Bash). Version vue : codex-cli 0.154.0-alpha. `codex login status` → « Logged in using ChatGPT » : pas de facturation d'API.
- **Pas de mode serveur MCP** dans cette version (sous-commandes `mcp list/add…` pour ses propres serveurs, `app-server` expérimental) : on ne peut pas brancher Codex comme connecteur de Claude Code. Le lien passe par l'orchestre.
- **Lancement** : `node scripts/executant.mjs lancer <agent> --tache=<id> --moteur=codex [--effort=medium]` (Codex est le moteur par défaut ; `sonde --moteur=codex` pour tester). Le script fait `codex exec -C presti --add-dir SaaS -s workspace-write -c sandbox_workspace_write.network_access=true -o <dernier-message>` avec le même prompt que le pilote Antigravity (importé de scripts/antigravity.mjs).
- **Piège de sécurité** : `~/.codex/config.toml` règle `sandbox_mode = "danger-full-access"` et `approval_policy = "never"` pour l'application. L'orchestre force toujours `-s workspace-write` ; ne jamais passer `--dangerously-bypass-approvals-and-sandbox`. presti-secrets n'est pas donné à Codex.
- **Modèle** : gpt-5.6-sol par défaut (consigne de Benj, 14/09/2026 : « 5.6 au lieu de 6 est déjà très bien, à part si c'est des gros travaux ») ; gros chantier : `--model=gpt-6-astra`. Catalogue vu : gpt-6-astra, gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-5.5. Benj ne veut pas payer plus pour l'instant : quand le quota tombe, on attend.
- **Effort** : en exec, gpt-6-astra tourne en « reasoning effort: none » par défaut ; le script force medium pour les tâches.
- **Piège Windows : spawn EPERM.** Dans le bac à sable workspace-write, Node ne peut lancer aucun sous-processus : Codex exécute `orchestre prochaine` et écrit du code juste, mais ne peut lancer ni `verifier`, ni npm, ni Playwright (pilote 018-01, 14/09 : modifications correctes, PASS en 15 s quand Claude Code a lancé le vérificateur). D'où la boucle de `executant.mjs` pour codex : Codex écrit → vérificateur hors bac à sable → sortie renvoyée à Codex si FAIL (--boucle=3). Ne pas « régler » ça en ouvrant danger-full-access.
- **Quota de l'abonnement ChatGPT** : le 14/09/2026 à 22 h 16, après cinq tâches dans la soirée (018-01 à 018-04 et 018-06, plus sondes), Codex répond « You've hit your usage limit … try again at Sep 15th, 2026 2:17 AM » et propose Pro ou des crédits (décision d'argent : Benj). La boucle de executant.mjs reconnaît ce message et s'arrête (code 3) ; libérer la tâche (`orchestre liberer <id>`) et la confier à Antigravity ou à un agent Claude.
- La sonde répond en 19 s (25 k jetons de contexte, dont les skills importés). Premier pilote : tâche 018-01 (crédits photo sous la vidéo de la landing, juge `scripts/credits-landing-qa.mjs`).

Voir [[presti-orchestre-antigravity]], [[orchestre-autonome]].

**Quota hebdomadaire (mesuré le 17/09/2026 vers 2 h 30)** : après 5 tâches CLIPFORGE dans la nuit (131, 161, 162 en 3 tours, 181, puis 112 en cours), Codex répond « try again at Sep 21st, 2026 9:17 PM » — la limite de l'abonnement n'est pas seulement horaire, elle peut bloquer plusieurs jours. Une tâche lancée pendant le blocage échoue en quelques secondes et laisse un travail partiel dans le périmètre : lancer la commande `verifier`, puis `orchestre liberer` ou confier la fin à un agent Claude en lui disant de reprendre le diff, pas de le jeter.
