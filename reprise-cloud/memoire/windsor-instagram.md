---
name: windsor-instagram
description: "Windsor.ai (MCP ad6c5421…) relié par Benj le 24/09 à Instagram @prestiapp (essai) : ce qu'il lit (démographie agrégée, commentaires nominatifs) et ne lit PAS (liste des abonnés) ; actions publier/commenter"
metadata:
  node_type: memory
  type: reference
  originSessionId: fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d
  modified: 2026-09-24T18:18:13.297Z
---

Benj a relié Windsor.ai le 24/09/2026 (MCP `mcp__ad6c5421-…`, plan « Trial »). Un seul connecteur y est branché : `instagram`, compte `17841414186392664` (prestiapp).

- **Lit :**
  - la démographie des abonnés, AGRÉGÉE (âge, sexe, ville, pays) ;
  - le nombre d'abonnés ;
  - les statistiques par média (portée, vues, enregistrements, partages, abonnements obtenus) ;
  - les **commentaires, avec le nom de l'auteur** (`comment_username`, visible si le compte relié modère la Page).
- **Ne lit pas :** la liste nominative des abonnés. L'API Instagram ne la donne pas.
- **Actions (`list_actions instagram`) :** publier une photo, commenter un post. C'est une voie de publication Instagram sans le quota Publora (15/mois en Starter).
- **Règles d'usage :** toute action est publique, donc accord de Benj. Toujours appeler `get_fields` avant `get_data`.

**Pour la prospection automatique** ([[ecosysteme-prospection-automatique]]) : la voie officielle vers une personne précise est « commente X → message privé en réponse au commentaire » (réponses privées de l'API Messaging). Contacter chaque nouvel abonné nominativement n'est pas possible par API.
