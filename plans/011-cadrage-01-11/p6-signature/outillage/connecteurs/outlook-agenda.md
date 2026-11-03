# Outlook Agenda (Microsoft Graph) — fiche connecteur
Source : Microsoft Graph, « List events » (learn.microsoft.com/en-us/graph/api/calendar-list-events?view=graph-rest-1.0, lue le 03/11/2026) ; « Microsoft Graph permissions reference » (learn.microsoft.com/en-us/graph/permissions-reference, mise à jour 14/09/2026, lue le 03/11/2026) · nœud n8n : Microsoft Outlook (agenda) (type exact à vérifier)
Ce que le système en fait : Agenda, ligne « Google Agenda / Outlook Agenda » (OUTILLAGE.md § 0.4) : mêmes usages que Google Agenda
Portées demandées (le minimum) : lecture : `Calendars.Read` (délégué, compte professionnel) ; écriture plus tard : `Calendars.ReadWrite`. `Calendars.ReadBasic` existe mais ne suffit pas à lire les événements (à confirmer)
Ce qu'on lit : événements du calendrier par défaut de l'utilisateur (`GET /me/calendar/events`)
Ce qu'on écrit (après la porte) : création d'un rendez-vous, seulement après validation de l'artisan (Studio) ou activation du type (Signature)
Où vit l'autorisation : jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj
Comment le client la retire : depuis son compte Microsoft (applications et services consentis) — à vérifier
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part
Quotas de l'API : non lus (la page « List events » ne donne pas de chiffre de quota dans la partie lue) — à vérifier
Coût : gratuit pour l'API Graph — à vérifier pour les licences Microsoft 365 du client (à la charge du client)
Entrée sans webhook : déclencheur horaire suivi du nœud de lecture de l'agenda
Test hors ligne qui le prouvera : lecture d'un calendrier d'essai en `Calendars.Read`, vérification qu'aucune écriture n'est appelée (à écrire)
Points à vérifier par Claude Code : le cas des calendriers privés (la page signale un « FullAccess » ou « Delegate » requis pour les éléments privés d'une boîte partagée) ; le consentement admin requis pour le compte professionnel (non lu dans la partie visible)
