# Google Agenda — fiche connecteur
Source : API Google Calendar, « Choose Google Calendar API scopes » (developers.google.com/workspace/calendar/api/auth, page datée 2026-09-03, lue le 03/11/2026) ; « Usage limits » (developers.google.com/workspace/calendar/api/guides/quota, lue le 03/11/2026) · nœud n8n : Google Calendar (type exact à vérifier dans docs.n8n.io/integrations)
Ce que le système en fait : Agenda, ligne « Google Agenda / Outlook Agenda » (OUTILLAGE.md § 0.4) : lire les disponibilités, proposer des créneaux libres lus dans l'agenda, poser le rendez-vous une fois choisi, rappel la veille
Portées demandées (le minimum) : lecture d'abord : `https://www.googleapis.com/auth/calendar.events.readonly` (ou `calendar.freebusy` si seules les disponibilités sont lues) ; écriture plus tard, après la porte : `https://www.googleapis.com/auth/calendar.events` (à confirmer : la page lue ne reprend que la liste, pas le détail de chaque portée)
Ce qu'on lit : événements et disponibilités du calendrier de l'artisan (ou du client)
Ce qu'on écrit (après la porte) : création d'un rendez-vous de visite ou de chantier, seulement après clic de l'artisan (Studio) ou activation du type d'action (Signature)
Où vit l'autorisation : jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj (OUTILLAGE.md § 4)
Comment le client la retire : depuis son compte Google (« Applications tierces ») ou depuis l'écran « Connexions » de Presti — à vérifier que ce second chemin existe
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part
Quotas de l'API (page officielle lue le 03/11/2026) : 10 000 requêtes par minute et par projet ; 600 par minute et par utilisateur et par projet ; 1 000 000 par jour et par projet
Coût : gratuit (API Google Calendar, quota) — à vérifier hors quota
Entrée sans webhook (n8n n'est pas exposé) : déclencheur horaire suivi du nœud Google Calendar en lecture ; ou lecture des disponibilités à la demande par Presti
Test hors ligne qui le prouvera : lecture d'un calendrier d'essai avec une portée readonly, puis vérification qu'aucun créneau n'est proposé hors disponibilités lues (à écrire)
Points à vérifier par Claude Code : le nom exact de chaque portée d'écriture ; si `calendar.freebusy` suffit pour proposer des créneaux ; le statut de vérification OAuth de l'application en production (page de consentement, non lue)
