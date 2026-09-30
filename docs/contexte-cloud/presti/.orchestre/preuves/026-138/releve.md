# 026-138 — relevé du 29/09 (17:52 UTC) : épreuve NON tenue, E24-2 seul en échec

Commande : `node scripts/horloge-qa.mjs --reel --fenetre=24` (lue en production, clé de service, rien affiché).
Le blocage du matin (ops_horloge_etat 22023 sur les fenêtres longues) est levé : le juge répond maintenant.

Mesures rendues par le juge (releve.json du 2026-09-29T17:52:53Z) :
- E24-0 PASS — préalables présents, première exécution de presti-agents-tic il y a plus de 24 h.
- E24-1 PASS — 1440 exécutions réussies (>= 1380), plus grand trou 0 min.
- E24-2 FAIL — 158 passages de a0 (>= 276 attendus), plus grand écart 5 min.
- E24-3 PASS — digests agents:2026-09-29:matin et agents:2026-09-29:soir présents.
- E24-4 PASS — passages_cron.tic de 1 min, réussi.
- E24-5 PASS — non faits > 15 min : 0 ; abandonnés 24 h : 0.
- E24-6 PASS — aucun agent muet (21 agents).
- E24-7 PASS — notifications max par jour de Paris : 1.
- E24-8 PASS — 11 mesures, aucune nulle, aucune lecture échouée.

Lecture : les 158 passages espacés d'au plus 5 min couvrent environ 13 h continues (158 x 5 min = 790 min).
A0 n'a donc pas encore tourné 24 h en continu ; ce n'est pas un trou, c'est une fenêtre pas encore remplie.
Estimation (déduite, non mesurée) : 276 passages atteints vers 03 h 45 UTC le 30/09 si A0 continue sans coupure.
Poste de Benj : état non déclaré. Aucun chiffre inventé. Aucune correction faite dans cette fiche (règle de la fiche).

Suite : rejouer la mesure après ~03 h 45 UTC le 30/09 (sans déploiement ni migration d'ici là), puis Benj déclare
l'état du poste et confirme la réception des digests de 7 h 30 et 18 h 30. Contre-vérification par 4 sabotages : à faire au PASS.
