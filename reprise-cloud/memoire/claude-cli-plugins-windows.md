---
name: claude-cli-plugins-windows
description: "Sur la machine de Benj, le binaire claude n'est pas dans le PATH de l'outil Bash — chemin exact + commandes pour gérer plugins et marketplaces depuis l'app desktop"
metadata: 
  node_type: memory
  type: reference
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-08T20:01:40.786Z
---

Dans l'app Claude Code **desktop**, les commandes à panneau interactif (`/plugin`, `/permissions`,
`/config`, `/hooks`) ne sont pas disponibles. Pour gérer les plugins il faut passer par le **CLI**,
qui n'est **pas dans le PATH** de l'outil Bash (`claude: command not found`).

Chemin exact : `C:\Users\benja\.local\bin\claude.exe`
(depuis Bash : `/c/Users/benja/.local/bin/claude.exe`)

Commandes utiles (le scope par défaut de `install` est déjà `user`) :

```
claude.exe plugin marketplace add <owner/repo|url|chemin>
claude.exe plugin install <plugin>@<marketplace> --scope user
claude.exe plugin list
claude.exe plugin details <plugin>@<marketplace>   # inventaire + coût en tokens — INSTALLÉ seulement
claude.exe plugin update <plugin>
claude.exe plugin validate <chemin>
```

Un plugin installé s'active **dans la session en cours** : ses skills apparaissent aussitôt,
préfixées `<plugin>:<skill>`. (Vérifié le 2026-09-08 sur linkedin-skills.) Seul `plugin update`
annonce un redémarrage.

Où ça s'écrit : `~/.claude/plugins/installed_plugins.json`, le code dans
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`, et l'activation dans
`~/.claude/settings.json` (`enabledPlugins` + `extraKnownMarketplaces`).

**Piège rencontré le 2026-09-08** : des skills copiées à la main dans
`<projet>/.claude/skills/` font doublon avec le plugin et ne se mettent jamais à jour. Installer par
le marketplace, puis supprimer la copie manuelle. Voir [[social-skills-plugins]].

**Second chemin (2026-09-13)** : le shim npm `/c/Users/benja/AppData/Roaming/npm/claude` est aussi présent et fonctionne depuis Bash — c'est lui que `command -v claude` trouve. Les deux chemins mènent au même CLI.
Un serveur MCP HTTP ajouté par `claude mcp add … --transport http <url>` (scope user) est écrit dans `~/.claude.json` ; s'il affiche « Needs authentication » dans `claude mcp list`, l'OAuth se fait par `/mcp` dans une session terminal — jamais par l'agent — et les outils n'apparaissent qu'à la session suivante.
Exemple posé le 2026-09-13 : `motionsites` → https://xgdzyqfalbibzelpdpvr.supabase.co/functions/v1/mcp

**`plugin details` avant installation : impossible (vérifié le 2026-09-14).** Sur un plugin non installé,
l'erreur suggère « pass --plugin-dir <path> », mais l'option n'existe pas (`error: unknown option
'--plugin-dir'`). Pour estimer le coût avant d'installer : ajouter le marketplace (ça clone le catalogue
dans `~/.claude/plugins/marketplaces/<nom>/` sans rien installer ni exécuter), puis mesurer les
`description:` des SKILL.md (≈ caractères / 4 tokens par session).

**Chemins longs** : un dépôt de plugins cloné dans le scratchpad de session (base ~180 caractères) dépasse
la limite Windows de 260 → checkout partiel silencieux, `git ls-files` rend 0. `LongPathsEnabled=0` et
`core.longpaths` non posé sur cette machine. Le clone du marketplace par le CLI, lui, passe (base courte).
