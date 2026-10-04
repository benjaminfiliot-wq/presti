# Mutations des juges du pont Telegram et du durcissement de l'usine (026-198)

Aucun --reel, aucun jeton réel, aucun appel à Telegram : faux serveurs sur 127.0.0.1 et faux système de fichiers.

## ÉCHECS (2)
- TÉMOIN pont --partie=routes rouge : code 1 ; critères en échec : PT-2 ; pont-telegram-qa : FAIL — PT-2
- TÉMOIN pont --partie=usine rouge : code 1 ; critères en échec : PT-17 ; pont-telegram-qa : FAIL — PT-17

## Témoins (copie intacte)
- pont --partie=routes : témoin rouge (code 1 ; PT-2) en 1 s
- pont --partie=usine : témoin rouge (code 1 ; PT-17) en 25 s
- durcie  : témoin vert en 1 s

## Mutations
- PASS PT-7 — une quatrième commande « reprise » dans la liste fermée ; lib/agents/telegram.ts ; FAIL PT-7 — COMMANDES = ["pause","etat","consigne","reprise"] : ["pause","etat","consigne"] attendu (aucune reprise, aucune levée) ; commande « reprise » : statut 200, 2 appel(s) à la base : 400 sans appel attendu
- PASS PT-4 — la commande pause appelle ops_interrupteur_poser(…, false, …) : elle lève la pause au lieu de la poser ; app/api/agents/telegram/entree/route.ts ; FAIL PT-4 — pause, motif piégé : statut 503, appels à la base : ops_interrupteur_poser — 200 et un seul appel station_pause_par_agent attendus ; pause, motif de 400 signes : statut 503, appels à la base : ops_interrupteur_poser — 200 et un seul appel station_pause_par_agent attendus ; pause, avec des champs de reprise en plus : statut 503, appels à la base : ops_interrupteur_poser — 200 et un seul appel station_pause_par_agent attendus ; pause déjà active : statut 503, 1 appel(s) : 200 et un seul appel attendus (et 5 autre(s))
- PASS PT-3 — la route de sortie recopie le sujet de l’alerte dans le texte ; app/api/agents/telegram/sortie/route.ts ; FAIL PT-3 — app/api/agents/telegram/sortie/route.ts nomme « sujet » ou « corps » (source, commentaires ôtés)
- PASS PT-11 — le service ouvre un port (http.createServer(…).listen(…)) ; scripts/usine/telegram.mjs ; FAIL PT-11 — le source contient createServer, listen( (hors commentaires) : aucun serveur attendu ; socket TCP en écoute : port 33671 (passage commandes, processus A)
- PASS PT-10 — le jeton du bot écrit dans une ligne de journal ; scripts/usine/telegram.mjs ; FAIL PT-10 — fuite : jeton du bot dans la sortie standard de A (passage commandes) ; jeton du bot dans la sortie standard de A (passage limite) ; jeton du bot dans la sortie standard de A (passage aucun-base) ; jeton du bot dans la sortie standard de A (passage sortie) (+11)
- PASS PT-9 — parse_mode: HTML ajouté à sendMessage ; scripts/usine/telegram.mjs ; FAIL PT-9 — 55 sendMessage portent parse_mode (« HTML », passage commandes) : aucune mise en forme attendue
- PASS PT-15 — le service appaire la première conversation qui écrit /start, sans comparer le code ; scripts/usine/telegram.mjs ; FAIL PT-15 — une conversation étrangère qui écrit la première a reçu 1 réponse(s) (3700066916 « appairé : Claude Code termine ») ; journal : ligne(s) qui portent l'identifiant d'une conversation étrangère ou un appairage : 2026-06-01T12:00:00.000Z telegram : appairage : chat 3700066916 | 2026-06-01T12:00:00.000Z telegram : appairage : chat 3700066916 ; /start <code juste> à 9 min : 0 réponse(s) («  »), une réponse « appairé : … » attendue ; /start <code juste> à 9 min : 1 ligne(s) « appairage : chat … » (3700066916), une seule, pour 945152481, attendue
- PASS PT-15 — la fenêtre d’appairage portée de 10 à 1 000 minutes ; scripts/usine/telegram.mjs ; FAIL PT-15 — le code juste à 11 min a été accepté ou journalisé : 1 réponse(s), lignes « 2026-06-01T12:11:00.000Z telegram : appairage : chat 951960321 » (aucune attendue)
- PASS PT-16 — un update_id rejoué reprend son effet (correction du 27/09 : un seul envoi, jamais un second effet) ; scripts/usine/telegram.mjs ; FAIL PT-16 — update_id déjà acquitté rejoué : 1 appel(s) et 1 envoi(s) de trop (au plus le /etat sentinelle) ; relance sur le même etat.json : 1 appel(s) et 1 envoi(s) de trop pour l'update_id rejoué
- PASS UD-2 — durcir.sh retire aussi la règle presti-agents ; scripts/usine/durcir.sh ; FAIL UD-2 — sous-critère(s) en échec : UD-2c, UD-2h
- PASS UD-2 — ufw enable ajouté à durcir.sh ; scripts/usine/durcir.sh ; FAIL UD-2 — sous-critère(s) en échec : UD-2f
- PASS UD-3 — la préparation de l’usine exige encore sudo -n true du compte usine ; scripts/usine.mjs ; FAIL UD-3 — sous-critère(s) en échec : UD-3a, UD-3c

Bilan : 12/12 mutations prises sur leur critère nommé, en 3.5 min (budget 19 min).
