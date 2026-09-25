---
name: social-skills-plugins
description: "Les plugins de skills réseaux sociaux de Benj (linkedin-skills, facebook-skills) installés au niveau user le 2026-09-08 — source commune, clés API partagées, mode brouillon par défaut"
metadata: 
  node_type: memory
  type: project
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-08T20:04:29.051Z
---

Benj a fait installer le **2026-09-08**, tous deux au scope **user** (donc actifs dans ofm, presti,
SaaS et tout futur projet) :

| Plugin | Version | Skills | Coût toujours-chargé |
|---|---|---|---|
| `linkedin-skills@linkedin-skills` | 1.0.33 | 11 (`linkedin-*`) | ~1 226 tok |
| `facebook-skills@facebook-skills` | 1.0.18 | 8 (`fb-*`) | ~693 tok |

Même auteur (**Serge Bulaev**, MIT) : `github.com/sergebulaev/{linkedin,facebook}-skills`. Même
architecture (`lib/` avec publora_client / apify_client / pixfaro_client), mêmes dépendances Python
(`requests`, `python-dotenv` — déjà satisfaites sur sa machine).

**Par défaut tout marche en mode brouillon**, sans aucune clé : les skills rédigent, Benj publie à
la main. Les clés sont **optionnelles** et **partagées entre les deux plugins** (un seul `.env`
suffit, `lib/_env.py` remonte depuis le `cwd`) :

- `PUBLORA_API_KEY` — publier/planifier (gratuit : 15 posts/mois)
- `LINKEDIN_PLATFORM_ID` / `FACEBOOK_PLATFORM_ID` — la connexion de canal côté Publora
- `APIFY_TOKEN` — lire un post/fil sans coller le texte (5 $/mois offerts)
- `PIXFARO_TOKEN` — générer les visuels

**Deux choses à retenir** :
- Un plugin installé s'active **dans la session en cours** (constaté sur linkedin-skills — je lui
  avais dit à tort qu'il fallait redémarrer).
- Ces skills sont **écrites pour l'anglais** (formules de hooks, détecteurs d'IA, seuil des 80
  caractères sur Facebook). Benj poste en français → le préciser dans les prompts, et considérer
  l'« humanizer » comme indicatif seulement.

**Défaut amont corrigé à la main dans facebook-skills 1.0.18** : trois SKILL.md
(`fb-audience-insights`, `fb-page-optimizer`, `fb-repurposer`) avaient une `description:` YAML **non
quotée contenant `: `** (deux-points + espace) — le parseur y voit une sous-clé, la description
tombe, et **la skill ne se charge pas du tout**. Symptôme : `plugin details` affiche `< 20 tok`
always-on au lieu de ~130, et la skill n'apparaît pas dans la session. Corrigé en entourant la
valeur de guillemets simples dans
`~/.claude/plugins/cache/facebook-skills/facebook-skills/1.0.18/skills/*/SKILL.md`.
⚠️ **Un `claude plugin update facebook-skills` écrasera ce correctif** — le refaire, ou le remonter
en amont. Règle générale vérifiée sur les 19 skills des deux plugins : *non quotée + `: ` dans la
valeur = skill absente*, toutes les autres combinaisons passent.

Nettoyé à l'installation : une copie manuelle des 11 skills LinkedIn traînait dans
`presti/.claude/skills/` (non suivie par git, identique octet pour octet au plugin) — supprimée.

Voir [[claude-cli-plugins-windows]] pour la façon d'installer, et [[user-benj]].
