# Slack — fiche connecteur
Source : Slack Developer Docs, « conversations.history » (docs.slack.dev/reference/methods/conversations.history/, lue le 03/11/2026) ; limite de débit lue dans la même page (voir ci-dessous) · nœud n8n : Slack (type exact à vérifier)
Ce que le système en fait : Slack, ligne « Slack / Microsoft Teams » (OUTILLAGE.md § 0.4, prompt 2 : notifications internes et validations d'équipe)
Portées demandées (le minimum) : lecture : `*:history` pour le canal visé (ex. `channels:history`, nom exact à confirmer dans la page des portées) ; écriture après la porte : `chat:write` (à confirmer). Aucune portée large « admin »
Ce qu'on lit : historique d'un canal de notification interne (`conversations.history`), pas de canal de client
Ce qu'on écrit (après la porte) : messages de notification et demandes de validation, par le nœud Slack ou l'outil HITL de n8n (admis pour une validation d'équipe Entreprise, OUTILLAGE.md O5)
Où vit l'autorisation : jeton d'application ou de bot : secret, jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj
Comment le client la retire : désinstaller l'application depuis Slack (paramètres de l'espace de travail) — à vérifier
Ce qui se passe quand elle expire : `token_expired` ou `token_revoked` renvoyés par l'API : le système se tait, « Connexions » le dit, une alerte part (on ne réessaie pas en boucle)
Quotas de l'API : `conversations.history` : pour les applications distribuées hors Marketplace et créées après le 29/05/2025, limite de 1 requête par minute et `limit` réduit à 15 ; pour les applications Marketplace ou construites en interne, niveau 3 (chiffre exact à lire dans la page « Rate limits ») — source : page citée ci-dessus
Coût : gratuit pour l'API ; plan du workspace du client à sa charge — à vérifier
Entrée sans webhook (n8n n'est pas exposé) : Slack Trigger de n8n (événements) si l'espace le permet ; sinon lecture à intervalle par `conversations.history`, avec le quota ci-dessus en tête
Test hors ligne qui le prouvera : appel en simulation sans jeton réel ; vérification que la limite de 1 requête par minute est respectée par le planificateur (à écrire)
Points à vérifier par Claude Code : le nom exact des portées `*:history` et `chat:write` ; le statut de l'application (Marketplace ou interne) qui change la limite ; l'usage du Slack Trigger plutôt que la lecture à intervalle
