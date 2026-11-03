# TikTok — fiche connecteur
Source : TikTok for Developers, « Get Started - Direct Post » Content Posting API (developers.tiktok.com/doc/content-posting-api-get-started, mise à jour 04/08/2026, lue le 03/11/2026) ; nœud n8n : aucun lu, à vérifier (nœud HTTP probable)
Ce que le système en fait : TikTok, ligne de publication de vidéos et de photos sur le compte du client (OUTILLAGE.md, prompt 2 : réseaux) ; TikTok Business et Content Posting sont les deux produits à distinguer (le second seul est lu ici)
Portées demandées (le minimum) : `video.publish` (écriture, après la porte). Lecture des infos du créateur (`creator_info/query`) : même portée, à confirmer sur la page des portées (`scopes-overview`, non lue)
Ce qu'on lit : infos du créateur (pseudo, options de confidentialité, durée maximale) avant toute publication, obligatoire selon la page
Ce qu'on écrit (après la porte) : publication directe (`/v2/post/publish/video/init/` ou `/v2/post/publish/content/init/` pour les photos) ; la source est un fichier envoyé (`FILE_UPLOAD`) ou une URL (`PULL_FROM_URL`, domaine vérifié requis)
Où vit l'autorisation : jeton d'accès utilisateur chiffré côté Presti, jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj
Comment le client la retire : à vérifier (révocation de l'application dans les paramètres TikTok du compte)
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part ; pas de nouvel essai en boucle
Quotas de l'API : chiffres de quota non lus (à vérifier sur la page de limites) ; **tant que le client n'est pas audité, toute publication est restreinte au mode privé** (page citée) : publication publique seulement après audit
Coût : gratuit pour l'API ; audit à vérifier (page `content-posting-api` non lue)
Entrée sans webhook (n8n n'est pas exposé) : suivi du statut par `publish_id` à intervalle, par Presti et la base (`post/publish/status/fetch`, à vérifier)
Test hors ligne qui le prouvera : initialisation simulée sans jeton réel ; contrôle que la publication part en mode privé tant qu'il n'y a pas d'audit (à écrire)
Points à vérifier par Claude Code : statut d'audit du client avant toute publication publique ; `PULL_FROM_URL` exige un domaine ou préfixe d'URL vérifié (quel domaine Presti) ; la portée exacte de `creator_info` ; limites de quota ; retrait par le client ; type de nœud n8n
