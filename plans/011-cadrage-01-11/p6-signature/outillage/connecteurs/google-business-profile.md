# Google Business Profile — fiche connecteur
Source : Google for Developers, « Implement OAuth with Business Profile APIs » (developers.google.com/my-business/content/implement-oauth, lue par extrait de recherche le 03/11/2026 ; page complète non ouverte) ; un fil de support Google sur le quota « Account Management API = 0 » (support.google.com/business/thread/415931676, communauté, non officiel) · nœud n8n : Google Business Profile (type exact à vérifier dans docs.n8n.io/integrations)
Ce que le système en fait : fiche Google Business Profile, ligne « fiche Google Business Profile 1 (outil) » (OUTILLAGE.md § 0.4) : lecture des avis (Après-chantier et réputation, OUTILLAGE.md § 6 ligne 5) ; réponse à l'avis (positif seulement en Signature, négatif toujours à l'artisan)
Portées demandées (le minimum) : `https://www.googleapis.com/auth/business.manage` (portée unique relevée sur la page officielle, lecture et écriture de la fiche ; pas de portée « lecture seule » dans la page lue) — à confirmer avec Claude Code
Ce qu'on lit : comptes et établissements de l'artisan, avis et leurs notes
Ce qu'on écrit (après la porte) : réponse à un avis ; jamais une modification des informations de la fiche (horaires, catégories) sans clic de l'artisan
Où vit l'autorisation : jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj
Comment le client la retire : depuis son compte Google (« Applications tierces ») — à vérifier ; ou depuis « Connexions » de Presti — à vérifier que ce chemin existe
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part
Quotas de l'API : non lus sur une page officielle. Le fil de support évoque un quota de 0 sur l'API de gestion des comptes, bloquant la liste des comptes, après approbation de l'accès : fait communautaire, à vérifier dans la console Google avant tout développement — « à vérifier »
Coût : gratuit selon la documentation — à vérifier
Entrée sans webhook (n8n n'est pas exposé) : déclencheur horaire suivi d'une lecture des avis (pas de webhook pour les avis dans la page lue — à vérifier)
Test hors ligne qui le prouvera : lecture d'une fiche d'essai ; vérification qu'aucune réponse ne part hors porte (à écrire)
Points à vérifier par Claude Code : l'accès à l'API Business Profile est soumis à une demande d'accès approuvée par Google (la page ne le détaille pas dans l'extrait) ; le quota réel ; le nom exact de la portée d'écriture et de lecture seule ; la différence avec l'ancienne portée `plus.business.manage` citée sur un fil externe, à ne pas utiliser sans vérification
