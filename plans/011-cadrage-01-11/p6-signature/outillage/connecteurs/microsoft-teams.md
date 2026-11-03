# Microsoft Teams — fiche connecteur
Source : Microsoft Graph v1.0, « Send chatMessage in a channel or a chat » (learn.microsoft.com/en-us/graph/api/chatmessage-post, lue par extrait de recherche le 03/11/2026 ; page complète non ouverte) ; Merill Graph Permissions, « ChatMessage.Send » (graphpermissions.merill.net, extrait, communauté) · nœud n8n : Microsoft Teams (type exact à vérifier dans docs.n8n.io/integrations)
Ce que le système en fait : Teams, ligne « Teams 2 (validation humaine) » (OUTILLAGE.md § 0.4 et § 7) : page du matin et rapport de la Direction, validation d'équipe par les outils HITL de n8n (OUTILLAGE.md § 6 ligne 7, § 7)
Portées demandées (le minimum) : délégué (compte professionnel) : `ChannelMessage.Send` pour publier dans un canal ; pour un chat : la page lue donne aussi `ChannelMessage.Send` comme minimum, alors que Merill donne `ChatMessage.Send` (« Send user chat messages ») — contradiction à trancher par Claude Code. Application (sans utilisateur) : `Teamwork.Migrate.All` seulement, réservé à la migration : interdit pour ce système
Ce qu'on lit : rien de nécessaire au système (la sortie seule est utile)
Ce qu'on écrit (après la porte) : un message dans un canal ou un chat Teams de l'équipe Presti, jamais vers un client
Où vit l'autorisation : jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj ; compte Teams de Benj ou d'un compte d'équipe, jamais un compte personnel
Comment le client la retire : depuis le compte Microsoft (« Applications » du compte) — à vérifier — ou via l'écran « Connexions » de Presti — à vérifier
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part
Quotas de l'API : non lus dans l'extrait — à vérifier
Coût : inclus dans la licence Microsoft 365 ou Teams du compte — à vérifier
Entrée sans webhook (n8n n'est pas exposé) : les messages entrants demandent un abonnement Graph (webhook) ; à éviter pour ce connecteur, qui ne sert qu'à sortir — à confirmer
Test hors ligne qui le prouvera : envoi vers un canal d'essai avec un compte de test, jamais le canal d'un client (à écrire)
Points à vérifier par Claude Code : la contradiction entre `ChannelMessage.Send` et `ChatMessage.Send` pour les chats ; le fait que les permissions d'application ne servent qu'à la migration ; le compte Teams utilisé ; la règle Microsoft : Teams ne doit pas servir de journal de bord (le message doit être lu par des personnes)
