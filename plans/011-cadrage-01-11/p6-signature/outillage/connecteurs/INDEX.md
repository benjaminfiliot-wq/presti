# Index des fiches connecteurs (prompt 6, tâche 036-017)

Lot 1 partiel : 14 fiches sur les 40 du premier brief (prompt 1 : 10 outils ; prompt 2 : 30 outils). Les autres restent à écrire.

| Outil | Nœud n8n | Coût | Quotas | Voie d'entrée |
|---|---|---|---|---|
| Google Agenda | Google Calendar | gratuit (à vérifier) | 10 000/min/projet ; 600/min/utilisateur ; 1 000 000/jour (page lue 03/11/2026) | déclencheur horaire + lecture |
| Outlook Agenda | Microsoft Outlook (agenda) | gratuit (API) ; licence client | non lus | déclencheur horaire + lecture |
| OneDrive | Microsoft OneDrive | gratuit (API) ; stockage client | non lus | déclencheur horaire + liste |
| Telegram | Telegram | gratuit (à vérifier) | non lus | webhook Presti (déjà en base) |
| Slack | Slack | gratuit (API) ; workspace client | conversations.history : 1/min hors Marketplace | Slack Trigger ou lecture horaire |
| Excel | Microsoft Excel 365 | licence Microsoft 365 du client (à vérifier) | non lus ; API refusée sur OneDrive grand public | déclencheur horaire + lecture du classeur |
| Google Business Profile | Google Business Profile | gratuit (à vérifier) | non lus ; quota 0 signalé sur un fil communautaire (à vérifier) | déclencheur horaire + lecture des avis |
| Twilio (SMS) | Twilio | par message (à vérifier) | 1 seg/s long code US ; 10 seg/s US vers l'international ; 20 000 msg/jour sur compte neuf (aide Twilio, extrait) | envoi seul ; statut par Presti et la base |
| Microsoft Teams | Microsoft Teams | inclus licence Microsoft 365 (à vérifier) | non lus | sortie seule ; pas de webhook |
| Facebook Graph (Messenger, Instagram, Lead Ads) | Facebook Graph API | gratuit (à vérifier) | 4 800 × utilisateurs engagés / 24 h (jeton de Page) (page officielle, extrait) | webhook Meta : décision de Benj |
| Instagram | Instagram (nœud à vérifier ; HTTP sinon) | gratuit (API) ; compte pro client | 100 publications / 24 h glissantes ; statut : 1/min, 5 min max (page lue 03/11/2026) | publication par conteneur ; statut et limite par Presti et la base |
| LinkedIn | LinkedIn (nœud à vérifier ; HTTP sinon) | gratuit (API, à vérifier) | non lus ; version 202511 arrêtée le 16/11/2026 (page lue 03/11/2026) | publication seule ; pas de webhook |
| TikTok | TikTok Content Posting (nœud à vérifier ; HTTP sinon) | gratuit (API) ; audit requis pour le public | non lus ; mode privé sans audit (page lue 03/11/2026) | publication seule ; suivi par publish_id |
| YouTube | YouTube Data API (nœud à vérifier) | gratuit (quota) | 10 000 unités / jour ; videos.insert 100 / jour (page lue 03/11/2026) | lecture à intervalle |
