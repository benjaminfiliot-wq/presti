# Audit préalable à l'automatisme — lecture seule

Décision humaine confirmée le 30/09, PR6. Aucun changement ni test n'est revendiqué par cet audit.

- STOP hors fil : lib/agents/acquisition/standardiste.ts, retour hors_fil avant STOP (140–147). Fiche 026-085 : opposition avant rattachement ; attention si expéditeur non exploitable.
- Pause relances : app/api/cron/relances/route.ts ne lit pas pauseGenerale. Fiche dédiée nécessaire car 026-044 interdit les crons ; recontrôler avant chaque sortie.
- Crieur : cron coupe les nouveaux dépôts, mais les publications Publora déjà programmées restent actives. 026-044/122 et adaptateur Publora à aligner.
- Doublon Facteur : lib/agents/acquisition/facteur.ts envoie avant marquage envoyé (439/441, 487/498) ; 0106_acquisition_echanges.sql fait un SELECT sans réservation. 026-089 + migration cloud : réservation atomique préalable, réconciliation des sorties incertaines sans réenvoi automatique.
- Plafond 0 euro : 0098_ops_taches.sql inscrit après dépense ; veilleur seuil 150 euro ; llm coût déclaré 0 ne prouve pas gratuité. 026-013/043/047 + cloud : contrôle avant consommation, refus du coût inconnu, rapprochement réel.
- Accord individuel également en base : 0099_ops_garde_envois.sql exige attend_accord_benj. Migration corrective cloud nécessaire, sans réécriture d'une migration appliquée. Conserver juges, plafonds, opposition, pause et immutabilité.
- Le juge 026-116 doit également être aligné avec le Crieur 026-122.
