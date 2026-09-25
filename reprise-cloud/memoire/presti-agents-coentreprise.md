---
name: presti-agents-coentreprise
description: "La coentreprise d'agents Presti : 12 agents (3 par pôle) avec mémoire de domaine + apprentissage, pilotée depuis /controle"
metadata: 
  node_type: memory
  type: project
  originSessionId: f2774700-2996-4ee8-bfc0-5b67f39c3350
  modified: 2026-08-31T12:15:10.504Z
---

Presti est encadré par une **coentreprise d'agents** (demandée par Benj le 2026-08-31 : « au moins 3 par catégorie, toute la connaissance de chaque domaine en mémoire, capables de s'adapter et d'apprendre »). Élargie de 5 → **12 agents** + `presti-ai-engineer` (transverse).

**4 pôles × 3 agents** (`.claude/agents/*.md`) :
- **Audit** : `presti-auditeur` (chef), `presti-audit-attaque` (offensif/pentest), `presti-audit-conformite` (RGPD+légal devis/facture).
- **Animation** : `presti-animateur` (chef, motion), `presti-anim-accessibilite` (a11y/perf/contraste), `presti-anim-marque` (direction artistique white-label).
- **Gestion** : `presti-gestion` (chef, santé), `presti-gestion-donnees` (tunnel/métriques), `presti-gestion-fiabilite` (coûts IA/quotas/robustesse).
- **Mails** : `presti-mails` (chef), `presti-mails-delivrabilite` (Resend/DNS/anti-spam), `presti-mails-cycle` (séquences/relances/copy FR).

**Mémoire de domaine + apprentissage** (`.claude/agents/knowledge/`) : pour chaque pôle, `<domaine>.md` = base de connaissances complète (Presti + métier) et `<domaine>.journal.md` = journal d'apprentissage daté. `PROTOCOLE.md` = organigramme + règle obligatoire : AVANT mission lire socle+journal, APRÈS ajouter une entrée et promouvoir les faits durables dans le socle. C'est ce qui rend les agents adaptatifs/apprenants.

**MANAGED AGENTS RÉELS + MÉMOIRE CERVEAU (2026-08-31)** : les 12 agents sont de **vrais Claude Managed Agents** (sandbox cloud). ⚠️ Ça marche sur la **clé Anthropic actuelle** (`ANTHROPIC_API_KEY`) avec le header beta `managed-agents-2026-04-01` — le 404 d'avant venait juste de l'absence du header. **AWS PAS nécessaire** (Claude Platform on AWS = option de facturation Marketplace, org séparée ; client `AnthropicAWS`/`@anthropic-ai/aws-sdk` — seulement si Benj veut la facturation AWS ; onboarding que lui seul peut faire).
Chaque pôle a un **memory store** persistant (`agent-memory-2026-07-22`) monté dans le sandbox : l'agent lit sa mémoire avant, écrit ses acquis (`journal.md`) après → apprend seul entre sessions (« comme l'auto-mémoire de Claude »). Mémoire **connectée au cerveau Obsidian** (`Documents/SaaS`) : seedée depuis le socle repo + fichiers `brain-*` (Produit/Architecture…), et `sync-down` rapatrie tout dans `Documents/SaaS/Coentreprise/<pôle>/` + les journaux repo. Prouvé de bout en bout.
**Piloter** : `node scripts/coentreprise.mjs {provision|run <clé> "<tâche>"|sync-down|list}` (registre = `scripts/coentreprise.registry.json`, IDs env/stores/agents). Économe : Haiku par défaut, connaissance en mémoire (prompts légers), zéro session auto — chaque `run` = 1 sandbox cloud (petit coût).
`/controle` garde les 3 checks serveur rapides (`gestion`/`gestion-donnees`/`mails-delivrabilite`, NON-Managed, gratuits). Custom subagent_type non spawnable dans les sessions Claude Code → general-purpose + instructions inline. Voir [[presti-state]].
