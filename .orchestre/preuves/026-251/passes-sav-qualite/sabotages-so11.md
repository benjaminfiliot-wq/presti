# SO-11 : 15 sabotages sur copie (05/10/2026), tous attrapés

Commande : node scripts/juges-026-usine-mutations.mjs --seul=SO-11 (témoin PASS sur la copie ; 14 mutations) puis --seul="aucun événement de passe" (la 15e, ancre corrigée).

PASS SO-11 — unité SAV : tout le coffre chargé ; scripts/usine/systemd/presti-sav.service ; FAIL SO-11 — presti-sav.service : EnvironmentFile= (le coffre ne se charge jamais en bloc, aucune commande annexe)
PASS SO-11 — unité SAV : le jeton du chef demandé en plus ; scripts/usine/systemd/presti-sav.service ; FAIL SO-11 — presti-sav.service : ExecStart « /usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_SAV PRESTI_JETON_CHEF -- /usr/bin/node scripts/agents/sav-passe.mjs --une-passe » (attendu : /usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_SAV -- /usr/bin/node scripts/agents/sav-passe.mjs --une-passe : seul PRESTI_JETON_SAV est demandé au coffre)
PASS SO-11 — unité qualité : NoNewPrivileges retiré ; scripts/usine/systemd/presti-qualite.service ; FAIL SO-11 — presti-qualite.service : NoNewPrivileges=yes absent
PASS SO-11 — unité qualité : lancée en root ; scripts/usine/systemd/presti-qualite.service ; FAIL SO-11 — presti-qualite.service : User=root (agents, le seul compte des services)
PASS SO-11 — minuteur SAV : une passe toutes les 30 min, hors de la période déclarée (15) ; scripts/usine/systemd/presti-sav.timer ; FAIL SO-11 — presti-sav.timer : une passe toutes les 30 min, plus que la période déclarée dans ops.agents pour sav (15 min) : le veilleur le dirait muet
PASS SO-11 — SAV : importe fs ; scripts/agents/sav-passe.mjs ; FAIL SO-11 — scripts/agents/sav-passe.mjs : importe fs : un point d'entrée qui ne lit aucun fichier ne peut pas lire le coffre
PASS SO-11 — SAV : nomme le coffre ; scripts/agents/sav-passe.mjs ; FAIL SO-11 — scripts/agents/sav-passe.mjs : lit ou nomme le coffre (le jeton et PRESTI_URL arrivent par l'environnement, posés par avec-coffre.mjs : sa lecture directe est refusée, leçon de l'atelier du 05/10)
PASS SO-11 — SAV : écrit à un client (route messages) ; scripts/agents/sav-passe.mjs ; FAIL SO-11 — scripts/agents/sav-passe.mjs : appelle /api/messages, hors de ses routes (/api/usine/sav/travail, /api/usine/sav/brouillon, /api/agents/evenements)
PASS SO-11 — SAV : deux événements par passe ; scripts/agents/sav-passe.mjs ; FAIL SO-11 — scripts/agents/sav-passe.mjs : l'événement de passe doit être posé en UN seul endroit (/api/agents/evenements)
PASS SO-11 — SAV : le texte du client repart dans le dépôt ; scripts/agents/sav-passe.mjs ; FAIL SO-11 — sav · un message à lire : le dépôt porte message_id, texte (message_id seul : ni texte, ni lecture de modèle)
PASS SO-11 — SAV : la pause rend le code 1 ; scripts/agents/sav-passe.mjs ; FAIL SO-11 — sav · pause générale : code 1 (0 attendu : une pause n'est pas une panne) — sav : en pause, rien à faire
PASS SO-11 — qualité : nomme le coffre ; scripts/agents/controleur-qualite.mjs ; FAIL SO-11 — scripts/agents/controleur-qualite.mjs : lit ou nomme le coffre (le jeton et PRESTI_URL arrivent par l'environnement, posés par avec-coffre.mjs : sa lecture directe est refusée, leçon de l'atelier du 05/10)
PASS SO-11 — qualité : process.exit à la place de process.exitCode ; scripts/agents/controleur-qualite.mjs ; FAIL SO-11 — scripts/agents/controleur-qualite.mjs : process.exit( (Node 24 sous Windows plante après un fetch : process.exitCode)
PASS SO-11 — qualité : une URL http hors boucle locale acceptée ; scripts/agents/controleur-qualite.mjs ; FAIL SO-11 — qualite · URL non sûre : code 1 (3 attendu : PRESTI_URL en http hors de la boucle locale)
PASS SO-11 — qualité : aucun événement de passe ; scripts/agents/controleur-qualite.mjs ; FAIL SO-11 — scripts/agents/controleur-qualite.mjs : l'événement de passe doit être posé en UN seul endroit (/api/agents/evenements)
026-133 : PASS — 1/1 mutations prises
