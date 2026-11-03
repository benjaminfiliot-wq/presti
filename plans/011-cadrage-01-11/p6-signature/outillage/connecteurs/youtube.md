# YouTube — fiche connecteur
Source : Google for Developers, « Quota Calculator » YouTube Data API (developers.google.com/youtube/data/determine_quota_cost, mise à jour 15/10/2026, lue le 03/11/2026) ; pages OAuth et portées non lues ; nœud n8n : à vérifier (aucun type exact lu)
Ce que le système en fait : YouTube, publication de vidéos et lecture des commentaires de la chaîne du client (OUTILLAGE.md § réseaux, prompt 2) ; aucune collecte de chaînes de tiers
Portées demandées (le minimum) : à confirmer sur la page des portées OAuth (non lue) ; pour publier : portée d'envoi de vidéos (`youtube.upload`) ; lecture : `youtube.readonly` ; à vérifier
Ce qu'on lit : chaîne du client, vidéos et commentaires (lecture avant écriture)
Ce qu'on écrit (après la porte) : envoi de vidéo (`videos.insert`), mise à jour de métadonnées (`videos.update`, 50 unités)
Où vit l'autorisation : jeton OAuth chiffré côté Presti, jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj
Comment le client la retire : à vérifier (paramètres de sécurité du compte Google, « applications tierces »)
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part (jeton révoqué ou expiré) ; pas de nouvel essai en boucle
Quotas de l'API (page lue) : 10 000 unités par jour pour l'ensemble du projet, sauf les buckets à part ; `search.list` : 100 appels par jour, 1 unité chacun ; `videos.insert` : 100 appels par jour, 1 unité chacun (le tableau indique 100 par jour, pas 1 600 unités) ; `videos.list` : 1 unité ; `videos.update` : 50 unités ; réinitialisation à minuit heure du Pacifique
Coût : gratuit (quota ci-dessus) ; une hausse de quota demande un formulaire Google — à vérifier
Entrée sans webhook (n8n n'est pas exposé) : lecture à intervalle des commentaires et de la chaîne ; le déclencheur YouTube de n8n est par interrogation, à vérifier
Test hors ligne qui le prouvera : décompte simulé des unités (une lecture de chaîne, un envoi) contre le quota quotidien de 10 000 (à écrire)
Points à vérifier par Claude Code : **les portées OAuth exactes et leur vérification par Google** (les portées de publication peuvent exiger une évaluation) ; le coût réel de `videos.insert` (le tableau et le texte de la page diffèrent, à relire) ; le quota de 100 envois par jour est-il suffisant pour un client ; type de nœud n8n ; retrait par le client
