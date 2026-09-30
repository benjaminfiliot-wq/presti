---
name: ecosysteme-role-reel
description: "Benj, 30/09 : ce qu'est VRAIMENT l'écosystème (une entreprise d'agents et d'IA en automatique 24 h/24), et ce que la station Claw3D n'est pas ; à relire avant de décrire ou juger quoi que ce soit de la série 026"
metadata:
  node_type: memory
  type: feedback
---

**Correction de Benj, 30/09 :** j'avais décrit l'écosystème comme « une station qui affiche l'état de Presti ». C'est faux. **L'écosystème est une vraie station d'agents et d'IA, entièrement automatique, qui tourne 24 h/24 pour compléter, réparer et améliorer Presti sans lui** : gérer tous les leads, le scrapping et la prospection, réfléchir, tenir des réunions seule, faire les pubs Meta, contacter les entreprises, et (branche réservée, rien de construit) le dropshipping.

**Ce que je dois garder en tête**
- Les **agents** (Matt le directeur des opérations, Vigie Meta, Recenseur, Plume, Garde, Facteur, Standard, Répondeur, ateliers de sites et de pubs, Crieur, Trésorier, Veilleur…) **sont l'écosystème** : ils tournent sur l'usine Oracle (minuteurs systemd) et sur Vercel (pg_cron), sous juges, avec le bus, les routes et le SQL. Détail : `docs/contexte-cloud/SaaS/Produit/Ecosysteme-Organigramme-2026-09-27.md` (PR #5), `Ecosysteme-Plan-2026-09-24.md`, `Ecosysteme-Rectification-2026-09-24.md`.
- La **station Claw3D** (`/controle/station`) n'est que la **fenêtre de pilotage** sur cette entreprise : voir l'équipage, l'Attention, les ventes, mettre en pause. Elle ne fait rien d'autre qu'afficher l'état réel et laisser Benj arrêter.
- Mes **juges et migrations** (026-170/171, 026-194, 0104, 0113…) sont les **garde-fous** de cette entreprise : ils ne sont pas le produit. Quand je juge une fiche, la question est « cet agent fera-t-il son métier sans danger, tout seul, pendant des jours ? », pas « l'écran est-il joli ».
- Règles qui encadrent l'automatisme : un seul portier d'envoi (le Facteur), la pause générale, 0 € de plafond par agent, aucune donnée de prospect vers un modèle non autorisé (D1), Matt observe et propose mais ne commande pas.
- État (organigramme du 27/09) : presque tout est encore en brouillon ; aucun agent d'opérations ne tourne encore pour de vrai. L'objectif de Benj est justement de les mettre en service 24 h/24.
- **Décision du 30/09 : on garde l'écosystème actuel, on ne migre pas vers StarNet** (StarNet est une application de bureau locale ; la station web Presti et l'usine restent distinctes). On peut lui emprunter des idées (salles rattachées à des capacités, budgets et permissions par agent), pas son code ni sa marque.

**Décisions de Benj du 30/09 sur les points ouverts de la PR #4**
- Les modèles de messages de 026-083 sont **approuvés** (par délégation à Claude Code, Benj confirme).
- Branche e-commerce : **on garde toutes les vidéos** de Benj. Le juge EC-3 accepte les deux formulations du LISEZMOI (« trois vidéos sources » de la fiche 026-176, « six vidéos sources » de la correction du 27/09) ; la fiche 026-176 choisit le texte.
- 026-111 ne devient un vrai PASS qu'avec la route 026-092 (Codex) et un passage du juge sur le PC (`.env.local`).

**How to apply :** avant de résumer l'écosystème à Benj ou à un autre exécutant, relire ce fichier et l'organigramme ; ne jamais réduire l'écosystème à sa station ; ne jamais présenter un écran comme la preuve qu'un agent marche.
