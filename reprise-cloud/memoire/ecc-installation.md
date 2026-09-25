---
name: ecc-installation
description: "ECC 2.2.2 installé le 24/09 (plugin Claude hooks « minimal » + plugin Codex) ; pièges de l'installeur et pourquoi pas plus de hooks"
metadata:
  node_type: memory
  type: reference
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-24T10:32:29.567Z
---

ECC (affaan-m/ECC, « agent harness OS ») est installé depuis le 24/09/2026 :
- **Claude Code :** plugin `ecc@ecc` 2.2.2, portée utilisateur, `pluginConfigs.ecc@ecc.options.hook_profile = "minimal"` dans `~/.claude/settings.json`.
- **Codex :** marketplace `ecc` et plugin `ecc@ecc` 2.2.2 (`codex plugin add`). Les hooks Codex exigent une approbation explicite ; aucun n'a été approuvé.
- **Antigravity :** non installé. L'adaptateur est expérimental et écrirait `.agents/skills` dans le projet courant.
- **Sauvegardes d'avant :** `~/.claude/backups/avant-ecc-2026-09-24/`.

Pièges constatés :
- **Version :** `npx ecc-universal@2.2.2` n'existe pas sur npm ; la dernière publiée est la 2.2.1. La 2.2.2 vient de la branche principale Git, installée via la marketplace.
- **Essai à blanc :** `ecc --dry-run setup …` INSTALLE vraiment ; `--dry-run` n'est pas respecté par `setup`.
- **Réglage modifié en douce :** l'installeur a ajouté `includeCoAuthoredBy: false` dans `settings.json` ; retiré le jour même pour revenir à l'état d'avant.
- **MCP embarqué :** le plugin lance ses propres serveurs MCP ; `chrome-devtools` a expiré à la connexion.

Hooks « standard » écartés parce qu'ils casseraient le travail :
- le blocage de la première modification de chaque fichier (gateguard) ;
- Prettier/Biome au Stop, qui reformate les scripts de presti ;
- le blocage des commits contenant des `console.log` ;
- le blocage de `npm run dev` hors tmux.

« Minimal » garde la mémoire de session, le suivi des coûts et le blocage de `--no-verify`.

Pour élargir : `ECC_HOOK_PROFILE` ou `ECC_DISABLED_HOOKS`, jamais le profil `standard` en bloc. Voir [[presti-orchestre-antigravity]] et [[codex-executant]].

**24/09, plus tard :** dans Codex, le plugin ECC est **désactivé** (`[plugins."ecc@ecc"] enabled = false` dans `~/.codex/config.toml`). Ses 286 skills dépassaient le budget de Codex, qui retirait alors TOUTES les descriptions de skills, les siennes comprises. Désactivé, Codex revoit chaque skill. ECC reste actif dans Claude Code.
