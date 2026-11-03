# LinkedIn — fiche connecteur
Source : Microsoft Learn, LinkedIn « Posts API » (learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api, version 2026-10, lue le 03/11/2026) ; nœud n8n : à vérifier (aucun type exact lu ; nœud HTTP si besoin)
Ce que le système en fait : LinkedIn, publication seulement, sur le compte du client (page entreprise ou profil du client qui autorise) ; aucune collecte (interdit, `.claude/rules/architecture-outils.md`)
Portées demandées (le minimum) : publication sur une page entreprise : `w_organization_social` (écriture) ; lecture des publications de la page : `r_organization_social` ; publication sur un profil : `w_member_social`. `r_member_social` est restreinte aux utilisateurs approuvés : à ne pas demander sans l'accord de Benj. Le membre autorisé doit avoir un rôle ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER ou CONTENT_ADMIN sur la page
Ce qu'on lit : publications de la page du client (`r_organization_social`), seulement pour contrôler la publication
Ce qu'on écrit (après la porte) : publication (`POST https://api.linkedin.com/rest/posts`) : texte, image, vidéo, document, article. Images, vidéos et documents passent d'abord par leur API d'envoi (URN image, vidéo, document)
Où vit l'autorisation : jeton OAuth 2.0 chiffré côté Presti, jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj
Comment le client la retire : à vérifier (révocation de l'application dans les paramètres de compte LinkedIn)
Ce qui se passe quand elle expire : erreur 401 `EMPTY_ACCESS_TOKEN` ou 403 `ACCESS_DENIED` : le système se tait, « Connexions » le dit, une alerte part ; pas de nouvel essai en boucle ; 429 : réduire la fréquence, réessayer après un délai
Quotas de l'API : chiffres de limite non lus sur la page (à vérifier sur la page « Rate limits ») ; 429 `TOO_MANY_REQUESTS` renvoyé au dépassement
Coût : gratuit pour l'API (produit à activer dans l'application développeur) ; à vérifier pour les produits payants
Entrée sans webhook (n8n n'est pas exposé) : pas de lecture nécessaire pour publier ; contrôle de publication par `x-restli-id` renvoyé à la création
Test hors ligne qui le prouvera : création simulée d'une publication sans jeton réel, avec vérification de l'en-tête `Linkedin-Version` et de `X-Restli-Protocol-Version: 2.0.0` (à écrire)
Points à vérifier par Claude Code : **la version `202511` est arrêtée le 16/11/2026** (page lue) : Presti doit utiliser une version plus récente, à choisir sur la page « versioning » ; l'API `ugcPosts` est remplacée par `posts` (guide de migration) ; l'approbation des portées restreintes et des produits d'entreprise ; type exact du nœud n8n ; limites de débit
