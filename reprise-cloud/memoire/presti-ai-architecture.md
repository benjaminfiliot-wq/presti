---
name: presti-ai-architecture
description: "Architecture de l'IA générative de Presti (lib/ai.ts) — objectif niveau Anthropic, forte et adaptable au client"
metadata: 
  node_type: memory
  type: project
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-08-30T18:59:38.971Z
---

L'IA de Presti vit dans `lib/ai.ts` : `generateLeadReply`, `generateRelanceReply`, `generateDevis`. Objectif de Benj : **le plus proche possible du niveau Anthropic, très forte, adaptable, qui s'adapte à la demande du client, très humaine.**

**Principes (à respecter, pas casser) :**
- **Cadrage déterministe AVANT le LLM** : listes de mots-clés (urgence, réclamation, RDV, prix, comparaison, budget serré, assurance, copro, chantier complexe) + `analyzeLead` → fiable même sur Haiku. Enrichir ces signaux est souvent plus rentable que réécrire le prompt.
- **Paliers** (`lib/models.ts`) : Standard=`claude-haiku-4-5`, Pro=`claude-sonnet-5`, Expert=`claude-opus-5`.
- **Thinking adaptatif** via `genParams()` : `thinking:{type:'adaptive'}` + max_tokens élargi sur 4.6+/5-series (Pro/Expert) ; Haiku reste rapide. Le parsing ne garde que les blocs `text`.
- **Dérive API** : `temperature` DÉPRÉCIÉ sur le 5-series (400) — ne jamais remettre. En doute → skill `claude-api`.
- **Chiffrage** : `guideMetier` + `tvaContexte` + bibliothèque `postes_types`, TVA ligne par ligne (10 réno / 5.5 énergétique / 20 neuf), sortie JSON re-validée (quantité>0, TVA ∈ [0,5.5,10,20]).

**Outillage créé pour continuer à pousser l'IA :** agent `.claude/agents/presti-ai-engineer.md`, skill `.claude/skills/presti-ai-lab/`, harnais `scripts/ai-eval.mjs` (matrice métiers × situations client + contrôles auto). Lancer `node scripts/ai-eval.mjs [standard|pro|expert]` avant/après toute modif (non-régression).

Voir l'état global : [[presti-state]].
